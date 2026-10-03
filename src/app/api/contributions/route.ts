import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getSession,
  rejectForeignRequest,
  requireSession,
} from "@/server/auth";
import { readDatabase, updateDatabase } from "@/server/store";
import type { DoctorContribution, ShareEvent } from "@/lib/records";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const calendarDate = z
  .string()
  .regex(datePattern)
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, "Enter a valid calendar date.");
const contributionInput = z.object({
  shareId: z.string().uuid(),
  linkedRecordId: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(120),
  consultationDate: calendarDate,
  assessment: z.string().trim().min(1).max(2_000),
  recommendations: z.string().trim().min(1).max(3_000),
  suggestedTests: z.string().trim().max(2_000).default(""),
  followUpDate: calendarDate.optional(),
});

const reviewInput = z.object({
  id: z.string().uuid(),
  decision: z.enum(["accepted", "rejected"]),
});

function validationError(error: z.ZodError) {
  return NextResponse.json(
    { error: error.issues[0]?.message || "Invalid contribution." },
    { status: 400 },
  );
}

export async function GET(request: Request) {
  const scope = new URL(request.url).searchParams.get("scope");
  const database = await readDatabase();
  if (scope === "doctor") {
    const session = await getSession("doctor");
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json(
      database.contributions
        .filter((item) => item.doctorId === session.subjectId)
        .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)),
    );
  }
  try {
    await requireSession("patient");
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(
    [...database.contributions].sort((a, b) =>
      b.submittedAt.localeCompare(a.submittedAt),
    ),
  );
}

export async function POST(request: Request) {
  if (rejectForeignRequest(request))
    return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const session = await getSession("doctor");
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = contributionInput.safeParse(await request.json());
  if (!parsed.success) return validationError(parsed.error);
  const today = new Date().toISOString().slice(0, 10);
  if (parsed.data.consultationDate > today)
    return NextResponse.json(
      { error: "The consultation date cannot be in the future." },
      { status: 400 },
    );
  if (
    parsed.data.followUpDate &&
    parsed.data.followUpDate < parsed.data.consultationDate
  )
    return NextResponse.json(
      { error: "The follow-up date cannot precede the consultation." },
      { status: 400 },
    );

  try {
    const contribution = await updateDatabase((database) => {
      const share = database.shares.find(
        (item) =>
          item.id === parsed.data.shareId &&
          item.recipientId === session.subjectId &&
          item.status === "active" &&
          item.permission === "contribute" &&
          (!item.expiresAt ||
            new Date(item.expiresAt).getTime() > Date.now()),
      );
      if (!share) throw new Error("CONTRIBUTION_ACCESS_DENIED");
      if (
        parsed.data.linkedRecordId &&
        !share.recordIds.includes(parsed.data.linkedRecordId)
      )
        throw new Error("LINKED_RECORD_NOT_SHARED");
      const doctor = database.doctors.find(
        (item) => item.id === session.subjectId,
      );
      if (!doctor) throw new Error("DOCTOR_NOT_FOUND");
      const linkedRecord = parsed.data.linkedRecordId
        ? database.records.find(
            (item) => item.id === parsed.data.linkedRecordId,
          )
        : undefined;
      if (parsed.data.linkedRecordId && !linkedRecord)
        throw new Error("LINKED_RECORD_NOT_FOUND");

      const submittedAt = new Date().toISOString();
      const item: DoctorContribution = {
        id: crypto.randomUUID(),
        shareId: share.id,
        doctorId: doctor.id,
        doctorName: doctor.name,
        doctorSpecialty: doctor.specialty,
        doctorClinic: doctor.clinic,
        patientName: share.patientName ?? "Health Dossier patient",
        linkedRecordId: linkedRecord?.id,
        linkedRecordTitle: linkedRecord?.title,
        title: parsed.data.title,
        consultationDate: parsed.data.consultationDate,
        assessment: parsed.data.assessment,
        recommendations: parsed.data.recommendations,
        suggestedTests: parsed.data.suggestedTests,
        followUpDate: parsed.data.followUpDate,
        status: "pending",
        submittedAt,
      };
      const event: ShareEvent = {
        id: crypto.randomUUID(),
        shareId: share.id,
        action: "contribution-submitted",
        actor: doctor.name,
        detail: `Consultation note submitted: ${item.title}`,
        createdAt: submittedAt,
      };
      database.contributions = [item, ...database.contributions];
      database.shareEvents = [event, ...database.shareEvents];
      return item;
    });
    return NextResponse.json(contribution, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "CONTRIBUTION_ACCESS_DENIED")
      return NextResponse.json(
        { error: "An active contribution grant is required." },
        { status: 403 },
      );
    if (message.startsWith("LINKED_RECORD"))
      return NextResponse.json(
        { error: "The linked record is not available in this grant." },
        { status: 400 },
      );
    return NextResponse.json(
      { error: "The consultation note could not be submitted." },
      { status: 400 },
    );
  }
}

export async function PATCH(request: Request) {
  if (rejectForeignRequest(request))
    return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  try {
    await requireSession("patient");
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const parsed = reviewInput.safeParse(await request.json());
  if (!parsed.success) return validationError(parsed.error);

  try {
    const contribution = await updateDatabase((database) => {
      const index = database.contributions.findIndex(
        (item) => item.id === parsed.data.id,
      );
      if (index < 0) throw new Error("NOT_FOUND");
      const current = database.contributions[index];
      if (current.status !== "pending") throw new Error("ALREADY_REVIEWED");
      const reviewedAt = new Date().toISOString();
      const updated: DoctorContribution = {
        ...current,
        status: parsed.data.decision,
        reviewedAt,
      };
      database.contributions[index] = updated;
      database.shareEvents = [
        {
          id: crypto.randomUUID(),
          shareId: current.shareId,
          action:
            parsed.data.decision === "accepted"
              ? "contribution-accepted"
              : "contribution-rejected",
          actor: "You",
          detail: `Consultation note ${parsed.data.decision}: ${current.title}`,
          createdAt: reviewedAt,
        },
        ...database.shareEvents,
      ];
      return updated;
    });
    return NextResponse.json(contribution);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return NextResponse.json(
      {
        error:
          message === "NOT_FOUND"
            ? "Contribution not found."
            : "This contribution has already been reviewed.",
      },
      { status: message === "NOT_FOUND" ? 404 : 409 },
    );
  }
}

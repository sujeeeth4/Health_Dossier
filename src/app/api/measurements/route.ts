import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { rejectForeignRequest, requireSession } from "@/server/auth";
import { parseMeasurementInput } from "@/server/measurements";
import { readDatabase, updateDatabase } from "@/server/store";
import type { HealthMeasurement } from "@/lib/records";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requirePatient() {
  try {
    await requireSession("patient");
    return null;
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

function badRequest(error: unknown) {
  if (error instanceof z.ZodError)
    return NextResponse.json(
      { error: error.issues[0]?.message ?? "Invalid measurement." },
      { status: 400 },
    );
  return NextResponse.json(
    { error: error instanceof Error ? error.message : "Invalid measurement." },
    { status: 400 },
  );
}

export async function GET() {
  const unauthorized = await requirePatient();
  if (unauthorized) return unauthorized;
  const database = await readDatabase();
  return NextResponse.json(
    [...database.measurements].sort(
      (a, b) => b.measuredAt.localeCompare(a.measuredAt) || b.createdAt.localeCompare(a.createdAt),
    ),
  );
}

export async function POST(request: Request) {
  if (rejectForeignRequest(request))
    return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const unauthorized = await requirePatient();
  if (unauthorized) return unauthorized;
  try {
    const input = parseMeasurementInput(await request.json());
    const measurement = await updateDatabase((database) => {
      const source = input.sourceRecordId
        ? database.records.find((record) => record.id === input.sourceRecordId)
        : undefined;
      if (input.sourceRecordId && !source)
        throw new Error("The selected source record no longer exists.");
      const now = new Date().toISOString();
      const created: HealthMeasurement = {
        ...input,
        id: randomUUID(),
        sourceRecordTitle: source?.title,
        createdAt: now,
        updatedAt: now,
      };
      database.measurements = [created, ...database.measurements];
      return created;
    });
    return NextResponse.json(measurement, { status: 201 });
  } catch (error) {
    return badRequest(error);
  }
}

export async function PATCH(request: Request) {
  if (rejectForeignRequest(request))
    return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const unauthorized = await requirePatient();
  if (unauthorized) return unauthorized;
  try {
    const body = await request.json();
    const id = z.string().min(1).parse(body.id);
    const input = parseMeasurementInput(body);
    const measurement = await updateDatabase((database) => {
      const previous = database.measurements.find((item) => item.id === id);
      if (!previous) throw new Error("Measurement not found.");
      const source = input.sourceRecordId
        ? database.records.find((record) => record.id === input.sourceRecordId)
        : undefined;
      if (input.sourceRecordId && !source)
        throw new Error("The selected source record no longer exists.");
      const updated: HealthMeasurement = {
        ...input,
        id,
        sourceRecordTitle: source?.title,
        createdAt: previous.createdAt,
        updatedAt: new Date().toISOString(),
      };
      database.measurements = [
        updated,
        ...database.measurements.filter((item) => item.id !== id),
      ];
      return updated;
    });
    return NextResponse.json(measurement);
  } catch (error) {
    return badRequest(error);
  }
}

export async function DELETE(request: Request) {
  if (rejectForeignRequest(request))
    return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const unauthorized = await requirePatient();
  if (unauthorized) return unauthorized;
  const id = new URL(request.url).searchParams.get("id");
  if (!id)
    return NextResponse.json({ error: "ID required" }, { status: 400 });
  let removed = false;
  await updateDatabase((database) => {
    removed = database.measurements.some((item) => item.id === id);
    database.measurements = database.measurements.filter((item) => item.id !== id);
  });
  return removed
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: "Measurement not found." }, { status: 404 });
}

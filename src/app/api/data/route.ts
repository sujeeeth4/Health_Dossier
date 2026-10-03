import { NextResponse } from "next/server";
import {
  getSession,
  rejectForeignRequest,
  requireSession,
} from "@/server/auth";
import { publicRecord, readDatabase, updateDatabase } from "@/server/store";
import type {
  CareCollection,
  HealthSummary,
  RecordShare,
  ShareEvent,
} from "@/lib/records";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");
  const scope = searchParams.get("scope");
  const database = await readDatabase();
  if (action === "doctors")
    return NextResponse.json(
      database.doctors.sort((a, b) => a.name.localeCompare(b.name)),
    );

  if (scope === "doctor") {
    const session = await getSession("doctor");
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const activeShares = database.shares.filter(
      (share) =>
        share.recipientId === session.subjectId &&
        share.status === "active" &&
        (!share.expiresAt || new Date(share.expiresAt).getTime() > Date.now()),
    );
    if (action === "records") {
      const ids = new Set(activeShares.flatMap((share) => share.recordIds));
      return NextResponse.json(
        database.records
          .filter((record) => ids.has(record.id))
          .map(publicRecord),
      );
    }
    if (action === "shares")
      return NextResponse.json(
        database.shares.filter(
          (share) => share.recipientId === session.subjectId,
        ),
      );
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  try {
    await requireSession("patient");
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (action === "records")
    return NextResponse.json(database.records.map(publicRecord));
  if (action === "collections") return NextResponse.json(database.collections);
  if (action === "shares") return NextResponse.json(database.shares);
  if (action === "contributions")
    return NextResponse.json(database.contributions);
  if (action === "shareEvents") return NextResponse.json(database.shareEvents);
  if (action === "birthDate") return NextResponse.json(database.birthDate);
  if (action === "healthSummary")
    return NextResponse.json(database.healthSummary ?? null);
  if (action === "migrationStatus")
    return NextResponse.json({
      completed: database.migrationCompleted,
      empty: database.records.length === 0,
    });
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

export async function POST(request: Request) {
  if (rejectForeignRequest(request))
    return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const body = await request.json();
  const action = body.action as string;
  const doctorSession = await getSession("doctor");

  if (action === "saveShareEvent" && doctorSession) {
    const event = body.value as ShareEvent;
    const database = await readDatabase();
    const share = database.shares.find(
      (item) =>
        item.id === event.shareId &&
        item.recipientId === doctorSession.subjectId,
    );
    if (
      !share ||
      share.status !== "active" ||
      (share.expiresAt && new Date(share.expiresAt).getTime() <= Date.now())
    )
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    await updateDatabase((data) => {
      data.shareEvents = [
        event,
        ...data.shareEvents.filter((item) => item.id !== event.id),
      ];
    });
    return NextResponse.json({ ok: true });
  }

  try {
    await requireSession("patient");
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await updateDatabase((database) => {
    if (action === "saveBirthDate")
      database.birthDate = String(body.value || "");
    else if (action === "saveHealthSummary")
      database.healthSummary = body.value as HealthSummary;
    else if (action === "saveCollection") {
      const value = body.value as CareCollection;
      database.collections = [
        value,
        ...database.collections.filter((item) => item.id !== value.id),
      ];
    } else if (action === "deleteCollection") {
      const id = String(body.value);
      database.collections = database.collections.filter(
        (item) => item.id !== id,
      );
      database.records = database.records.map((record) => ({
        ...record,
        collectionIds: record.collectionIds?.filter(
          (collectionId) => collectionId !== id,
        ),
      }));
    } else if (action === "saveShareWithEvent") {
      const { share, event } = body.value as {
        share: RecordShare;
        event: ShareEvent;
      };
      database.shares = [
        share,
        ...database.shares.filter((item) => item.id !== share.id),
      ];
      database.shareEvents = [
        event,
        ...database.shareEvents.filter((item) => item.id !== event.id),
      ];
    } else if (action === "saveShareEvent") {
      const event = body.value as ShareEvent;
      database.shareEvents = [
        event,
        ...database.shareEvents.filter((item) => item.id !== event.id),
      ];
    } else if (action === "revokeShare") {
      const { share, event } = body.value as {
        share: RecordShare;
        event: ShareEvent;
      };
      database.shares = [
        { ...share, status: "revoked", revokedAt: event.createdAt },
        ...database.shares.filter((item) => item.id !== share.id),
      ];
      database.shareEvents = [
        event,
        ...database.shareEvents.filter((item) => item.id !== event.id),
      ];
    } else throw new Error("Unknown action");
  });
  return NextResponse.json({ ok: true });
}

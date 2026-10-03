import { writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { rejectForeignRequest, requireSession } from "@/server/auth";
import {
  dataDirectory,
  safeUploadName,
  updateDatabase,
  type StoredRecord,
} from "@/server/store";
import type {
  CareCollection,
  DoctorProfile,
  HealthSummary,
  MedicalRecord,
  RecordShare,
  ShareEvent,
} from "@/lib/records";

export const runtime = "nodejs";

type Snapshot = {
  records: Omit<MedicalRecord, "file">[];
  collections: CareCollection[];
  shares: RecordShare[];
  shareEvents: ShareEvent[];
  doctors: DoctorProfile[];
  credentials: Array<{
    doctorId: string;
    email: string;
    passwordSalt: string;
    passwordHash: string;
  }>;
  birthDate?: string;
  healthSummary?: HealthSummary;
};

export async function POST(request: Request) {
  if (rejectForeignRequest(request))
    return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  try {
    await requireSession("patient");
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const form = await request.formData();
  const snapshot = JSON.parse(String(form.get("snapshot"))) as Snapshot;
  const storedRecords: StoredRecord[] = [];
  for (const record of snapshot.records) {
    const file = form.get(`file:${record.id}`);
    if (!(file instanceof File))
      return NextResponse.json(
        { error: `Missing file for ${record.title}` },
        { status: 400 },
      );
    const relativePath = path.join(
      "uploads",
      safeUploadName(record.id, record.fileName),
    );
    await writeFile(
      path.join(dataDirectory, relativePath),
      Buffer.from(await file.arrayBuffer()),
      { mode: 0o600 },
    );
    storedRecords.push({ ...record, filePath: relativePath });
  }
  await updateDatabase((database) => {
    const upsert = <T extends { id: string }>(current: T[], incoming: T[]) => [
      ...incoming,
      ...current.filter(
        (item) => !incoming.some((candidate) => candidate.id === item.id),
      ),
    ];
    database.records = upsert(database.records, storedRecords);
    database.collections = upsert(
      database.collections,
      snapshot.collections ?? [],
    );
    database.shares = upsert(database.shares, snapshot.shares ?? []);
    database.shareEvents = upsert(
      database.shareEvents,
      snapshot.shareEvents ?? [],
    );
    database.doctors = upsert(database.doctors, snapshot.doctors ?? []);
    database.credentials = [
      ...(snapshot.credentials ?? []),
      ...database.credentials.filter(
        (item) =>
          !(snapshot.credentials ?? []).some(
            (candidate) => candidate.doctorId === item.doctorId,
          ),
      ),
    ];
    if (snapshot.birthDate) database.birthDate = snapshot.birthDate;
    if (snapshot.healthSummary) database.healthSummary = snapshot.healthSummary;
    database.migrationCompleted = true;
  });
  return NextResponse.json({ migrated: storedRecords.length });
}

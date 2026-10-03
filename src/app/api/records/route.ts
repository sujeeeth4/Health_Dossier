import { writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { rejectForeignRequest, requireSession } from "@/server/auth";
import {
  dataDirectory,
  publicRecord,
  removeUpload,
  safeUploadName,
  updateDatabase,
} from "@/server/store";
import type { MedicalRecord } from "@/lib/records";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (rejectForeignRequest(request))
    return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  try {
    await requireSession("patient");
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const form = await request.formData();
  const metadata = JSON.parse(String(form.get("metadata"))) as Omit<
    MedicalRecord,
    "file"
  >;
  const file = form.get("file");
  if (!(file instanceof File))
    return NextResponse.json({ error: "File required" }, { status: 400 });
  const relativePath = path.join(
    "uploads",
    safeUploadName(metadata.id, metadata.fileName),
  );
  await writeFile(
    path.join(dataDirectory, relativePath),
    Buffer.from(await file.arrayBuffer()),
    { mode: 0o600 },
  );
  await updateDatabase(async (database) => {
    const previous = database.records.find(
      (record) => record.id === metadata.id,
    );
    database.records = [
      { ...metadata, filePath: relativePath },
      ...database.records.filter((record) => record.id !== metadata.id),
    ];
    if (previous && previous.filePath !== relativePath)
      await removeUpload(previous.filePath);
  });
  return NextResponse.json(
    publicRecord({ ...metadata, filePath: relativePath }),
    { status: 201 },
  );
}

export async function DELETE(request: Request) {
  if (rejectForeignRequest(request))
    return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  try {
    await requireSession("patient");
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
  await updateDatabase(async (database) => {
    const record = database.records.find((item) => item.id === id);
    database.records = database.records.filter((item) => item.id !== id);
    database.shares = database.shares.map((share) => ({
      ...share,
      recordIds: share.recordIds.filter((recordId) => recordId !== id),
    }));
    if (record) await removeUpload(record.filePath);
  });
  return NextResponse.json({ ok: true });
}

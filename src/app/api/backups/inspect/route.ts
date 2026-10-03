import { NextResponse } from "next/server";
import { rejectForeignRequest, requireSession } from "@/server/auth";
import {
  inspectEncryptedBackup,
  removeTemporaryBackup,
  saveIncomingArchive,
} from "@/server/backup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function passphrase(request: Request) {
  try {
    return decodeURIComponent(request.headers.get("x-backup-passphrase") || "");
  } catch {
    return "";
  }
}

export async function POST(request: Request) {
  if (rejectForeignRequest(request))
    return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  try {
    await requireSession("patient");
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let archivePath: string | undefined;
  try {
    archivePath = await saveIncomingArchive(request);
    return NextResponse.json(
      await inspectEncryptedBackup(archivePath, passphrase(request)),
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Backup inspection failed." },
      { status: 400 },
    );
  } finally {
    if (archivePath) await removeTemporaryBackup(archivePath);
  }
}

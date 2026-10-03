import { NextResponse } from "next/server";
import { rejectForeignRequest, requireSession } from "@/server/auth";
import {
  removeTemporaryBackup,
  restoreEncryptedBackup,
  saveIncomingArchive,
  type RestoreMode,
} from "@/server/backup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (rejectForeignRequest(request))
    return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  try {
    await requireSession("patient");
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const mode = new URL(request.url).searchParams.get("mode") as RestoreMode;
  if (mode !== "merge" && mode !== "replace")
    return NextResponse.json({ error: "Choose merge or replace." }, { status: 400 });
  let archivePath: string | undefined;
  try {
    archivePath = await saveIncomingArchive(request);
    const passphrase = decodeURIComponent(
      request.headers.get("x-backup-passphrase") || "",
    );
    return NextResponse.json(
      await restoreEncryptedBackup(archivePath, passphrase, mode),
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Restore failed." },
      { status: 400 },
    );
  } finally {
    if (archivePath) await removeTemporaryBackup(archivePath);
  }
}

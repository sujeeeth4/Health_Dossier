import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { rejectForeignRequest, requireSession } from "@/server/auth";
import { createEncryptedBackup, removeTemporaryBackup } from "@/server/backup";

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
  try {
    const { passphrase = "" } = await request.json();
    const backup = await createEncryptedBackup(String(passphrase));
    const stream = Readable.from(
      (async function* () {
        try {
          for await (const chunk of createReadStream(backup.path)) yield chunk;
        } finally {
          await removeTemporaryBackup(backup.path);
        }
      })(),
    );
    return new NextResponse(Readable.toWeb(stream) as BodyInit, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${backup.fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Backup failed." },
      { status: 400 },
    );
  }
}

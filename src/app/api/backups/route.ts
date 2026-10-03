import { NextResponse } from "next/server";
import { requireSession } from "@/server/auth";
import { getBackupStatus } from "@/server/backup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireSession("patient");
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await getBackupStatus());
}

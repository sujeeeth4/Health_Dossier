import { NextResponse } from "next/server";
import { rejectForeignRequest, requireSession } from "@/server/auth";
import { rollbackRecoverySnapshot } from "@/server/backup";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (rejectForeignRequest(request))
    return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  try {
    await requireSession("patient");
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id = "" } = await request.json();
    return NextResponse.json(await rollbackRecoverySnapshot(String(id)));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Rollback failed." },
      { status: 400 },
    );
  }
}

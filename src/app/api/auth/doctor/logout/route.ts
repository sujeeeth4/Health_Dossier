import { NextResponse } from "next/server";
import { clearSession, rejectForeignRequest } from "@/server/auth";

export async function POST(request: Request) {
  if (rejectForeignRequest(request))
    return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  await clearSession("doctor");
  return NextResponse.json({ ok: true });
}

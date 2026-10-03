import { NextResponse } from "next/server";
import { createSession, rejectForeignRequest } from "@/server/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (rejectForeignRequest(request))
    return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  await createSession("patient", "local-patient");
  return NextResponse.json({ id: "local-patient" });
}

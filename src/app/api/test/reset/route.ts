import { NextResponse } from "next/server";
import { resetLocalDataForTests } from "@/server/store";

export const runtime = "nodejs";

export async function POST() {
  if (process.env.NODE_ENV === "production")
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  await resetLocalDataForTests();
  return NextResponse.json({ ok: true });
}

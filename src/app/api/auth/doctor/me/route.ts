import { NextResponse } from "next/server";
import { getSession } from "@/server/auth";
import { readDatabase } from "@/server/store";

export async function GET() {
  const session = await getSession("doctor");
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const doctor = (await readDatabase()).doctors.find(
    (profile) => profile.id === session.subjectId,
  );
  return doctor
    ? NextResponse.json(doctor)
    : NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

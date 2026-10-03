import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createSession, rejectForeignRequest } from "@/server/auth";
import { hashPassword, readDatabase } from "@/server/store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (rejectForeignRequest(request))
    return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const { email = "", password = "" } = await request.json();
  const database = await readDatabase();
  const profile = database.doctors.find(
    (doctor) => doctor.email === String(email).trim().toLowerCase(),
  );
  const credential =
    profile &&
    database.credentials.find((item) => item.doctorId === profile.id);
  if (!profile || !credential)
    return NextResponse.json(
      { error: "Invalid credentials." },
      { status: 401 },
    );
  const attempted = await hashPassword(
    String(password),
    credential.passwordSalt,
  );
  const expected = Buffer.from(credential.passwordHash, "base64");
  const received = Buffer.from(attempted.passwordHash, "base64");
  if (
    expected.length !== received.length ||
    !timingSafeEqual(expected, received)
  )
    return NextResponse.json(
      { error: "Invalid credentials." },
      { status: 401 },
    );
  await createSession("doctor", profile.id);
  return NextResponse.json(profile);
}

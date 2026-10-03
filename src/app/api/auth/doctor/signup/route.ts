import { NextResponse } from "next/server";
import { createSession, rejectForeignRequest } from "@/server/auth";
import { hashPassword, updateDatabase } from "@/server/store";
import type { DoctorProfile, DoctorSignupInput } from "@/lib/records";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (rejectForeignRequest(request))
    return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const input = (await request.json()) as DoctorSignupInput;
  const email = input.email.trim().toLowerCase();
  const registration = input.registration.trim();
  const password = await hashPassword(input.password);
  try {
    const profile = await updateDatabase((database) => {
      if (database.doctors.some((doctor) => doctor.email === email))
        throw new Error("An account already uses this email address.");
      if (
        database.doctors.some(
          (doctor) =>
            doctor.registration.trim().toLowerCase() ===
            registration.toLowerCase(),
        )
      )
        throw new Error("This medical registration is already in use.");
      const timestamp = new Date().toISOString();
      const doctor: DoctorProfile = {
        id: crypto.randomUUID(),
        email,
        name: input.name.trim(),
        specialty: input.specialty.trim(),
        clinic: input.clinic.trim(),
        council: input.council.trim(),
        registration,
        verificationStatus: "demo-verified",
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      database.doctors.push(doctor);
      database.credentials.push({ doctorId: doctor.id, email, ...password });
      return doctor;
    });
    await createSession("doctor", profile.id);
    return NextResponse.json(profile, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Account could not be created.",
      },
      { status: 409 },
    );
  }
}

import type { Metadata } from "next";
import { DoctorLogin } from "@/features/doctor/doctor-auth";

export const metadata: Metadata = {
  title: "Doctor sign in — Health Dossier",
  description: "Sign in to the Health Dossier doctor portal.",
};

export default function DoctorLoginPage() {
  return <DoctorLogin />;
}

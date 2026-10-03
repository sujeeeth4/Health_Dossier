import type { Metadata } from "next";
import { DoctorSignup } from "@/features/doctor/doctor-auth";

export const metadata: Metadata = {
  title: "Create a doctor account — Health Dossier",
  description: "Create a local Health Dossier doctor account.",
};

export default function DoctorSignupPage() {
  return <DoctorSignup />;
}

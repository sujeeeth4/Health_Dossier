import type { Metadata } from "next";
import { DoctorPortal } from "@/features/doctor/doctor-portal";

export const metadata: Metadata = {
  title: "Doctor access inbox — Health Dossier",
  description: "Review records your patients chose to share.",
};

export default function DoctorPage() {
  return <DoctorPortal />;
}

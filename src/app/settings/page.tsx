import type { Metadata } from "next";
import { SettingsPage } from "@/features/settings/settings";

export const metadata: Metadata = {
  title: "Settings | Health Dossier",
  description: "Protect and restore your local Health Dossier data.",
};

export default function Settings() {
  return <SettingsPage />;
}

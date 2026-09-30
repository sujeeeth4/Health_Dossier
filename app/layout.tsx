import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Health Dossier — Your medical record library",
  description: "Organize and find your medical records in a device-local library.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" data-theme="dark"><body>{children}</body></html>;
}

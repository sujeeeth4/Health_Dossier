import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Health Dossier — A home for your health story",
  description:
    "Organize your medical records and prepare a private health overview for your next appointment.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="dark">
      <body>{children}</body>
    </html>
  );
}

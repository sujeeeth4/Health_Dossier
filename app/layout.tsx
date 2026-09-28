import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Health Dossier — Your medical record library",
  description: "Organize and find your medical records in a device-local library.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: "try{document.documentElement.dataset.theme=localStorage.getItem('health-dossier-theme')==='dark'?'dark':'light'}catch{document.documentElement.dataset.theme='light'}" }} /></head><body>{children}</body></html>;
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Health Dossier — One Health Record",
  description: "A local development demo of patient-controlled medical records. Fictional data only.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: "try{document.documentElement.dataset.theme=localStorage.getItem('health-dossier-theme')==='dark'?'dark':'light'}catch{document.documentElement.dataset.theme='light'}" }} /></head><body>{children}</body></html>;
}

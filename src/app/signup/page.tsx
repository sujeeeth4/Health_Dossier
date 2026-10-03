import type { Metadata } from "next";
import { SignupFlow } from "@/features/auth/signup-flow";

export const metadata: Metadata = {
  title: "Get started — Health Dossier",
  description: "Get started with Health Dossier.",
};

export default function SignupPage() {
  return <SignupFlow />;
}

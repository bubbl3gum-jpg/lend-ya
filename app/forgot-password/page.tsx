import type { Metadata } from "next";
import { AuthShell } from "@/components/auth-shell";
import { RecoveryRequestForm } from "@/components/recovery-request-form";

export const metadata: Metadata = {
  title: "Forgot your password? · Hustlen’",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return <AuthShell recovery><RecoveryRequestForm /></AuthShell>;
}

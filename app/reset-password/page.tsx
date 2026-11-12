import type { Metadata } from "next";
import { AuthShell } from "@/components/auth-shell";
import { PasswordResetForm } from "@/components/password-reset-form";

export const metadata: Metadata = {
  title: "Choose a new password · Hustlen’",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function ResetPasswordPage() {
  return <AuthShell recovery reset><PasswordResetForm /></AuthShell>;
}

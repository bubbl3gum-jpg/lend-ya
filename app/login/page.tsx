import { AuthForm } from "@/components/auth-form";
import { AuthShell } from "@/components/auth-shell";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Sign in · Hustlen’" };

export default function LoginPage() {
  return (
    <AuthShell><AuthForm mode="login" /></AuthShell>
  );
}

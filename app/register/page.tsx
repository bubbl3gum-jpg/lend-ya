import { AuthForm } from "@/components/auth-form";

export default function RegisterPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <AuthForm mode="register" />
      </div>
    </main>
  );
}

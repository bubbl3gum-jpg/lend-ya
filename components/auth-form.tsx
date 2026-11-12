"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import Link from "next/link";

const subscribeHydration = () => () => {};
const clientReady = () => true;
const serverNotReady = () => false;

type AuthFormProps = {
  mode: "login" | "register";
};

export function AuthForm({ mode }: AuthFormProps) {
  const ready = useSyncExternalStore(
    subscribeHydration,
    clientReady,
    serverNotReady,
  );
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const submitting = useRef(false);
  useEffect(() => { if (error && mode === "login") errorRef.current?.focus(); }, [error, mode]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!payload) throw new Error("We couldn’t complete your request. Please try again.");
      if (!response.ok) {
        throw new Error(payload.error || "Authentication failed.");
      }

      // Authentication changes the server session. Commit a fresh document rather
      // than depending on an in-flight RSC navigation followed by router.refresh().
      // Targets are fixed application paths, never a caller-provided redirect.
      window.location.replace(
        payload.user?.role === "ADMIN" ? "/admin" : "/dashboard",
      );
    } catch (err) {
      const message =
        mode === "login" && err instanceof TypeError
          ? "We couldn’t connect. Check your connection and try again."
          : err instanceof Error ? err.message : "Something went wrong.";
      setError(message);
      setLoading(false);
      submitting.current = false;
    }
  }

  return (
    <>
      <form
        onSubmit={handleSubmit}
        data-auth-form={mode}
        data-auth-ready={String(ready)}
        aria-busy={!ready || loading}
        className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <h2 className="text-2xl font-semibold text-slate-900">
          {mode === "login" ? "Welcome back" : "Create your account"}
        </h2>

        {mode === "login" && <p className="auth-form-intro">Sign in to your account. Pick up where you left off.</p>}

        {mode === "register" && (
          <label className="block text-sm font-medium text-slate-700">
            Full name
            <input
              disabled={!ready}
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-emerald-500 focus:outline-none"
              placeholder="Alex Tan"
              required
            />
          </label>
        )}

        <label className="block text-sm font-medium text-slate-700">
          Email address
          <input
            disabled={!ready}
            type="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-emerald-500 focus:outline-none"
            placeholder="you@example.com"
            required
          />
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Password
          <input
            disabled={!ready}
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-emerald-500 focus:outline-none"
            placeholder={
              mode === "login" ? "Enter your password" : "8–128 characters, uppercase letter and digit"
            }
            required
          />
        </label>

        {error ? <p ref={errorRef} tabIndex={-1} role="alert" className="auth-error text-sm text-rose-600">{error}</p> : null}

        <button
          type="submit"
          disabled={!ready || loading}
          className="w-full rounded-xl bg-slate-900 px-4 py-3 font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading
            ? "Please wait..."
            : mode === "login"
              ? "Log in"
              : "Create account"}
        </button>
      </form>
      {mode === "login" ? (
        <div className="auth-form-footer mt-4 flex items-center justify-between gap-4 px-1 text-sm">
          <Link
            href="/register"
            className="font-medium text-emerald-800 underline decoration-emerald-300 underline-offset-4"
          >
            Create an account
          </Link>
          <Link href="/forgot-password">Forgot your password?</Link>
        </div>
      ) : null}

    </>
  );
}

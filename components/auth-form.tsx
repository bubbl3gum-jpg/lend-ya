"use client";

import { useState, useSyncExternalStore } from "react";

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
  const [forgotOpen, setForgotOpen] = useState(false);
  const [recoveryContact, setRecoveryContact] = useState("");
  const [recoveryMessage, setRecoveryMessage] = useState("");
  const [recoveryLoading, setRecoveryLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
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

      const payload = await response.json();
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
        err instanceof Error ? err.message : "Something went wrong.";
      setError(message);
      setLoading(false);
    }
  }

  async function handleRecovery(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRecoveryLoading(true);
    setRecoveryMessage("");
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contact: recoveryContact }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Unable to process recovery request.");
      }
      setRecoveryMessage(payload.message);
    } catch (err) {
      setRecoveryMessage(
        err instanceof Error
          ? err.message
          : "Unable to process recovery request.",
      );
    } finally {
      setRecoveryLoading(false);
    }
  }

  return (
    <>
      <form
        onSubmit={handleSubmit}
        data-auth-ready={String(ready)}
        aria-busy={!ready || loading}
        className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <h2 className="text-2xl font-semibold text-slate-900">
          {mode === "login" ? "Welcome back" : "Create your account"}
        </h2>

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
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-emerald-500 focus:outline-none"
            placeholder={
              mode === "login" ? "Enter your password" : "At least 8 characters"
            }
            required
          />
        </label>

        {error ? <p className="text-sm text-rose-600">{error}</p> : null}

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
        <div className="mt-4 flex items-center justify-between gap-4 px-1 text-sm">
          <Link
            href="/register"
            className="font-medium text-emerald-800 underline decoration-emerald-300 underline-offset-4"
          >
            Create an account
          </Link>
          <button
            type="button"
            onClick={() => {
              setForgotOpen(true);
              setRecoveryMessage("");
            }}
            className="font-medium text-slate-600 underline decoration-slate-300 underline-offset-4 hover:text-slate-900"
          >
            Forgot Password?
          </button>
        </div>
      ) : null}

      {forgotOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setForgotOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="recovery-title"
            className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id="recovery-title"
                  className="text-xl font-semibold text-slate-900"
                >
                  Recover your account
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  Enter your account email or phone number to request recovery
                  instructions.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setForgotOpen(false)}
                aria-label="Close recovery dialog"
                className="rounded-md border border-slate-200 px-2 py-1 text-sm text-slate-600"
              >
                Close
              </button>
            </div>
            <form onSubmit={handleRecovery} className="mt-5 space-y-4">
              <label className="block text-sm font-medium text-slate-700">
                Email or phone number
                <input
                  type="text"
                  autoComplete="email"
                  value={recoveryContact}
                  onChange={(event) => setRecoveryContact(event.target.value)}
                  required
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                />
              </label>
              <button
                type="submit"
                disabled={recoveryLoading}
                className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
              >
                {recoveryLoading ? "Submitting..." : "Request instructions"}
              </button>
              {recoveryMessage ? (
                <p role="status" className="text-sm text-slate-600">
                  {recoveryMessage}
                </p>
              ) : null}
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}

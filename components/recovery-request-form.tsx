"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

const subscribe = () => () => {};
const clientReady = () => true;
const serverNotReady = () => false;

export function RecoveryRequestForm() {
  const ready = useSyncExternalStore(subscribe, clientReady, serverNotReady);
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "pending" | "received" | "error">("idle");
  const [error, setError] = useState("");
  const [remaining, setRemaining] = useState(0);
  const busy = useRef(false);
  const cooldownUntil = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const feedback = useRef<HTMLDivElement>(null);
  const emailInput = useRef<HTMLInputElement>(null);

  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    if (state === "received" || state === "error") feedback.current?.focus();
  }, [state]);
  useEffect(() => {
    if (!remaining) return;
    const timer = window.setTimeout(() => setRemaining(Math.max(0, Math.ceil((cooldownUntil.current - Date.now()) / 1000))), 1000);
    return () => window.clearTimeout(timer);
  }, [remaining]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current || remaining > 0) return;
    busy.current = true;
    const request = new AbortController();
    const timeout = window.setTimeout(() => request.abort("timeout"), 15_000);
    controller.current = request;
    setError("");
    setState("pending");
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }), signal: request.signal,
      });
      if (request.signal.aborted) return;
      if (response.status !== 202) {
        setError(response.status === 503
          ? "Recovery email is temporarily unavailable. Please try again later. You can still return to sign in."
          : response.status === 429
            ? "Please wait before trying again. Your request limit will reset automatically."
            : response.status === 400
              ? "Check your email address and try again."
              : "We couldn’t process your request. Please try again.");
        setState("error");
        return;
      }
      // A neutral 202 means received, never sent or delivered. Do not infer account existence.
      cooldownUntil.current = Date.now() + 60_000;
      setRemaining(60);
      setState("received");
    } catch {
      if (request.signal.aborted && request.signal.reason !== "timeout") return;
      if (request.signal.reason === "timeout") {
        cooldownUntil.current = Date.now() + 60_000;
        setRemaining(60);
        setError("The request took too long. It may have been received. Please wait a minute before trying again.");
      } else {
        setError("We couldn’t connect. Check your connection and try again.");
      }
      setState("error");
    } finally {
      window.clearTimeout(timeout);
      busy.current = false;
    }
  }

  return (
    <>
      {state === "received" ? (
        <>
          <div className="auth-feedback auth-received" ref={feedback} tabIndex={-1} role="status">
            <span className="auth-seal" aria-hidden="true">✓</span>
            <h2>Check your inbox</h2>
            <p>If an account matches that email, recovery instructions may arrive shortly. Check your inbox and spam folder.</p>
            <p>For your privacy, we can’t confirm whether an account exists.</p>
          </div>
          <p className="auth-help">Nothing yet? Delivery can take a few minutes. You can request another email after a minute.</p>
          <button type="button" className="auth-secondary" onClick={() => { setState("idle"); requestAnimationFrame(() => emailInput.current?.focus()); }}>Check or change email</button>
          <p className="auth-cooldown" aria-live="off">{remaining > 0 ? `Another request is available in ${remaining}s.` : "You can request another email now."}</p>
        </>
      ) : (
        <form onSubmit={submit} data-recovery-ready={String(ready)} aria-busy={!ready || state === "pending"}>
          <h2>Forgot your password?</h2>
          <p className="auth-form-intro">Enter the email you use for Hustlen’. We’ll help you take the next step.</p>
          <label htmlFor="recovery-email">Email address</label>
          <input id="recovery-email" ref={emailInput} type="email" autoComplete="email" autoCapitalize="none" spellCheck={false}
            value={email} onChange={event => setEmail(event.target.value)} disabled={!ready || state === "pending"} required
            aria-describedby="recovery-email-help" />
          <p id="recovery-email-help" className="auth-field-help">Use your account email address. Phone recovery isn’t available.</p>
          {state === "error" && <div ref={feedback} className="auth-feedback auth-error" role="alert" tabIndex={-1}><p>{error}</p></div>}
          <button className="auth-primary" type="submit" disabled={!ready || state === "pending" || remaining > 0}>
            {state === "pending" ? "Requesting…" : state === "error" ? "Try again" : "Request recovery email"}
            <span aria-hidden="true"> →</span>
          </button>
          <p className="auth-cooldown" aria-live="off">{remaining > 0 ? `Another request is available in ${remaining}s.` : "For your security, recovery links expire after 30 minutes."}</p>
          <span className="auth-sr-only" role="status">{state === "pending" ? "Requesting recovery instructions. Please wait." : ""}</span>
        </form>
      )}
      <div className="auth-form-footer"><Link href="/login">← Back to sign in</Link></div>
      <p className="auth-security-note">Your password stays unchanged until you choose a new one using a valid recovery link.</p>
    </>
  );
}

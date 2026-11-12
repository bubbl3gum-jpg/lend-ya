"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { newPasswordRequirements, parseNewPassword } from "@/lib/password-policy";
import { recoveryTokenFromFragment } from "@/lib/recovery-link";

type View = "reading" | "form" | "pending" | "invalid" | "success" | "uncertain" | "unavailable";
const successMessage = "Your password has been reset. Please log in with your new password.";

export function PasswordResetForm() {
  const [view, setView] = useState<View>("reading");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [fieldError, setFieldError] = useState<"password" | "confirmation" | null>(null);
  const token = useRef<string | null>(null);
  const initialized = useRef(false);
  const busy = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const feedback = useRef<HTMLDivElement>(null);
  const passwordInput = useRef<HTMLInputElement>(null);
  const confirmationInput = useRef<HTMLInputElement>(null);

  function clearSecrets() {
    token.current = null;
    setPassword(""); setConfirmation("");
    setShowPassword(false); setShowConfirmation(false); setFieldError(null);
  }

  useEffect(() => {
    function receiveLink() {
      const fragment = window.location.hash;
      try {
        // Do not retain a fragment/query, token-bearing history entry or token in router props.
        window.history.replaceState(window.history.state, "", window.location.pathname);
      } catch {
        clearSecrets(); setView("unavailable"); return;
      }
      clearSecrets();
      if (busy.current) {
        controller.current?.abort("link-changed");
        setView("uncertain");
        return;
      }
      token.current = recoveryTokenFromFragment(fragment);
      setView(token.current ? "form" : "invalid");
    }
    function leave() {
      const wasPending = busy.current;
      controller.current?.abort("leave");
      clearSecrets(); setView(wasPending ? "uncertain" : "invalid");
    }
    function restored(event: PageTransitionEvent) { if (event.persisted) leave(); }
    // React's development effect replay must not re-read the already-cleared fragment.
    if (!initialized.current) { initialized.current = true; receiveLink(); }
    window.addEventListener("hashchange", receiveLink);
    window.addEventListener("pagehide", leave);
    window.addEventListener("pageshow", restored);
    return () => {
      window.removeEventListener("hashchange", receiveLink);
      window.removeEventListener("pagehide", leave);
      window.removeEventListener("pageshow", restored);
      controller.current?.abort("unmount");
    };
  }, []);

  useEffect(() => {
    if (view === "form") heading.current?.focus();
    else if (view !== "reading" && view !== "pending") feedback.current?.focus();
  }, [view]);
  useEffect(() => {
    if (fieldError === "password") passwordInput.current?.focus();
    if (fieldError === "confirmation") confirmationInput.current?.focus();
  }, [fieldError]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current || view !== "form") return;
    if (!parseNewPassword(password)) { setFieldError("password"); passwordInput.current?.focus(); return; }
    if (confirmation !== password) { setFieldError("confirmation"); confirmationInput.current?.focus(); return; }
    if (!token.current) { clearSecrets(); setView("invalid"); return; }
    busy.current = true; setFieldError(null); setView("pending");
    const request = new AbortController(); controller.current = request;
    const timer = window.setTimeout(() => request.abort("timeout"), 15_000);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.current, password, confirmPassword: confirmation }),
        signal: request.signal,
      });
      const payload = response.status === 200 ? await response.json().catch(() => null) : null;
      if (request.signal.aborted) return;
      clearSecrets();
      if (response.status === 200 && payload?.message === successMessage) setView("success");
      else if (response.status === 400) setView("invalid");
      else if (response.status === 403) setView("unavailable");
      else setView("uncertain");
    } catch {
      if (request.signal.aborted && request.signal.reason !== "timeout") return;
      // A lost response can follow a committed reset. Never replay or promise unchanged credentials.
      clearSecrets(); setView("uncertain");
    } finally {
      window.clearTimeout(timer); busy.current = false;
    }
  }

  return (
    <div className="auth-reset" data-reset-state={view}>
      {view === "reading" ? <div role="status" aria-busy="true"><h2>Opening your recovery link…</h2><noscript>Enable JavaScript to securely open this recovery link.</noscript></div>
        : view === "form" || view === "pending" ? (
          <form onSubmit={submit} noValidate aria-busy={view === "pending"}>
            <h2 ref={heading} tabIndex={-1}>Choose a new password</h2>
            <p className="auth-form-intro">A fresh password for your Hustlen’ account.</p>
            <label htmlFor="reset-password">New password</label>
            <div className="auth-password-control">
              <input ref={passwordInput} id="reset-password" type={showPassword ? "text" : "password"} autoComplete="new-password"
                value={password} onChange={event => { setPassword(event.target.value); setFieldError(null); }} required disabled={view === "pending"}
                aria-invalid={fieldError === "password"} aria-describedby={`reset-policy${fieldError === "password" ? " reset-password-error" : ""}`} />
              <button type="button" aria-label={showPassword ? "Hide new password" : "Show new password"} aria-controls="reset-password" aria-pressed={showPassword} disabled={view === "pending"}
                onClick={() => setShowPassword(value => !value)}>{showPassword ? "Hide" : "Show"}</button>
            </div>
            <p id="reset-policy" className="auth-field-help">Use 8–128 characters, with at least one uppercase letter (A–Z) and one digit (0–9). Spaces are kept as entered.</p>
            {fieldError === "password" && <p id="reset-password-error" role="alert" className="auth-error">{newPasswordRequirements}</p>}
            <label htmlFor="reset-confirmation">Confirm new password</label>
            <div className="auth-password-control">
              <input ref={confirmationInput} id="reset-confirmation" type={showConfirmation ? "text" : "password"} autoComplete="new-password"
                value={confirmation} onChange={event => { setConfirmation(event.target.value); setFieldError(null); }} required disabled={view === "pending"}
                aria-invalid={fieldError === "confirmation"} aria-describedby={fieldError === "confirmation" ? "reset-confirmation-error" : undefined} />
              <button type="button" aria-label={showConfirmation ? "Hide confirmation" : "Show confirmation"} aria-controls="reset-confirmation" aria-pressed={showConfirmation} disabled={view === "pending"}
                onClick={() => setShowConfirmation(value => !value)}>{showConfirmation ? "Hide" : "Show"}</button>
            </div>
            {fieldError === "confirmation" && <p id="reset-confirmation-error" role="alert" className="auth-error">Your passwords don’t match. Enter the same password in both fields.</p>}
            <p className="auth-security-note">Updating your password signs you out on all devices. Your profile, listings and rental history stay with your account.</p>
            <button className="auth-primary" type="submit" disabled={view === "pending"}>{view === "pending" ? "Updating password…" : "Update password"}</button>
            <span className="auth-sr-only" role="status">{view === "pending" ? "Updating your password. Please wait." : ""}</span>
          </form>
        ) : (
          <>
            <div ref={feedback} tabIndex={-1} className={`auth-feedback ${view === "success" ? "auth-received" : "auth-reset-feedback"}`} role={view === "success" ? "status" : "alert"}>
              {view === "success" && <span className="auth-seal" aria-hidden="true">✓</span>}
              <h2>{view === "success" ? "Your password is updated" : view === "invalid" ? "Let’s get you a new link" : view === "uncertain" ? "We couldn’t confirm the reset" : "Reset is unavailable"}</h2>
              <p>{view === "success"
                ? "Your password has been reset and your account sessions have been signed out. Sign in with your new password when you’re ready."
                : view === "invalid"
                  ? "This recovery link is missing, invalid, expired or already used. Request a new link to continue."
                  : view === "uncertain"
                    ? "Your password may have changed, but we couldn’t confirm it. Try signing in with your new password. If that doesn’t work, request a new recovery link."
                    : "We couldn’t open a secure reset request. Reopen the link from your email or request a new one."}</p>
              {view === "uncertain" && <p>We won’t submit this reset again automatically.</p>}
              {view === "invalid" && <p>Refreshing this page clears the link for your privacy. You can also reopen the original link from your email if it hasn’t expired or been used.</p>}
            </div>
            <div className="auth-reset-actions">
              {view !== "invalid" && <a className="auth-action-link" href="/login">{view === "success" ? "Back to sign in" : "Try signing in"}</a>}
              {view !== "success" && <Link className={view === "invalid" ? "auth-action-link" : "auth-reset-new-link"} href="/forgot-password">Request a new recovery link</Link>}
            </div>
          </>
        )}
      {(view === "form" || view === "pending" || view === "invalid") && <div className="auth-form-footer"><Link href="/login">← Back to sign in</Link></div>}
    </div>
  );
}

"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/server";
import { enrollPasskey, verifyPasskey } from "@/lib/webauthn-browser";
type Key = {
  id: string;
  createdAt: string;
  revokedAt: string | null;
  deviceType: string;
  backedUp: boolean;
};
type Assurance = { assuranceId: string; expiresAt: string };
async function request<T>(body?: object): Promise<T> {
  const response = await fetch("/api/auth/admin-passkeys", {
    method: body ? "POST" : "GET",
    cache: "no-store",
    credentials: "same-origin",
    ...(body
      ? {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : {}),
  });
  const data = await response.json();
  if (!response.ok) throw Error(data.error ?? "Passkey request unavailable.");
  return data as T;
}
const button =
  "rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700";
export function AdminPasskeys() {
  const [keys, setKeys] = useState<Key[]>([]),
    [loaded, setLoaded] = useState(false),
    [password, setPassword] = useState(""),
    [assurance, setAssurance] = useState<Assurance | null>(null),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [lastKeyAccepted, setLastKeyAccepted] = useState(false);
  const operation = useRef<AbortController | null>(null),
    challenge = useRef<string | null>(null);
  const refresh = useCallback(async () => {
    const result = await request<{ credentials: Key[] }>();
    setKeys(result.credentials);
    setLoaded(true);
  }, []);
  useEffect(() => {
    let active = true;
    request<{ credentials: Key[] }>()
      .then((r) => {
        if (active) {
          setKeys(r.credentials);
          setLoaded(true);
        }
      })
      .catch(() => {
        if (active)
          setError(
            "Passkeys are unavailable. Your session must belong to an active Admin with a verified pilot identity.",
          );
      });
    return () => {
      active = false;
      operation.current?.abort();
    };
  }, []);
  useEffect(() => {
    if (!assurance) return;
    const timer = setTimeout(
      () => {
        setAssurance(null);
        setMessage("Factor verification expired. Verify your passkey again.");
      },
      Math.max(0, new Date(assurance.expiresAt).getTime() - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [assurance]);
  const activeCount = keys.filter((k) => !k.revokedAt).length;
  async function perform(action: "enroll" | "verify" | "revoke", key?: string) {
    if (operation.current) return;
    const controller = new AbortController();
    operation.current = controller;
    setBusy(true);
    setMessage("");
    setError("");
    try {
      if (!window.PublicKeyCredential || !window.isSecureContext)
        throw Error(
          "Use a browser that supports passkeys on this trusted localhost origin.",
        );
      if (action === "enroll") {
        const start = await request<{
          challengeId: string;
          options: PublicKeyCredentialCreationOptionsJSON;
        }>({
          action: "enrollment.begin",
          password,
          ...(assurance ? { assuranceId: assurance.assuranceId } : {}),
        });
        challenge.current = start.challengeId;
        if (controller.signal.aborted) throw Error("Operation cancelled.");
        const response = await enrollPasskey(start.options, controller.signal);
        await request({
          action: "enrollment.finish",
          challengeId: start.challengeId,
          password,
          response,
          ...(assurance ? { assuranceId: assurance.assuranceId } : {}),
        });
        challenge.current = null;
        setAssurance(null);
        await refresh();
        setMessage(
          "Passkey enrolled. Verify it to establish fresh factor assurance.",
        );
      } else if (action === "verify") {
        const start = await request<{
          challengeId: string;
          options: PublicKeyCredentialRequestOptionsJSON;
        }>({ action: "authentication.begin" });
        challenge.current = start.challengeId;
        if (controller.signal.aborted) throw Error("Operation cancelled.");
        const response = await verifyPasskey(start.options, controller.signal);
        const verified = await request<
          Assurance & { factorVerified: boolean; staffAuthorized: false }
        >({
          action: "authentication.finish",
          challengeId: start.challengeId,
          response,
        });
        if (
          verified.factorVerified !== true ||
          verified.staffAuthorized !== false ||
          !verified.assuranceId ||
          !Number.isFinite(Date.parse(verified.expiresAt))
        )
          throw Error(
            "Factor verification could not be confirmed. Start a fresh challenge.",
          );
        challenge.current = null;
        setAssurance(verified);
        await refresh();
        setMessage(
          "Factor verified for this session. No staff role or approval authority granted.",
        );
      } else {
        if (!assurance)
          throw Error("Verify your passkey again before revoking a key.");
        await request({
          action: "credential.revoke",
          credentialKey: key,
          password,
          assuranceId: assurance.assuranceId,
        });
        setAssurance(null);
        setLastKeyAccepted(false);
        await refresh();
        setMessage(
          "Passkey revoked. Previous factor assurance is invalid; verify a remaining key before further changes.",
        );
      }
    } catch (e) {
      setAssurance(null);
      setError(
        e instanceof DOMException
          ? "The browser passkey operation was cancelled or unavailable. Try a fresh challenge; allow user verification when prompted."
          : e instanceof Error
            ? e.message
            : "Passkey operation failed. Start a fresh challenge.",
      );
      if (challenge.current)
        await request({
          action: "challenge.cancel",
          challengeId: challenge.current,
        }).catch(() =>
          setError(
            (previous) =>
              previous +
              " Server cancellation could not be confirmed; the challenge expires within five minutes.",
          ),
        );
    } finally {
      challenge.current = null;
      operation.current = null;
      setPassword("");
      setBusy(false);
    }
  }
  return (
    <div className="space-y-6">
      <section
        aria-labelledby="pilot-title"
        className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-950"
      >
        <h2 id="pilot-title" className="font-semibold">
          Development pilot · optional passkeys
        </h2>
        <p className="mt-2 text-sm">
          This operates only in the owned disposable test environment. Passkey
          verification proves a factor for your current session; it does not
          authorize a staff role or approval execution. Existing Admin access is
          unchanged.
        </p>
      </section>
      <section
        aria-labelledby="passkeys-title"
        className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 id="passkeys-title" className="text-xl font-semibold">
              Passkeys
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Use your device’s native passkey prompt. User verification is
              required.
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-sm">
            {assurance
              ? "Factor verified · session only"
              : "Fresh factor verification required"}
          </span>
        </div>
        {assurance && (
          <p className="mt-3 text-sm text-slate-600">
            Verification expires{" "}
            {new Date(assurance.expiresAt).toLocaleTimeString("en-GB", {
              timeZone: "Asia/Taipei",
            })}{" "}
            (Taipei). Key changes invalidate earlier assurance.
          </p>
        )}
        <div className="mt-6">
          <label
            htmlFor="passkey-password"
            className="block text-sm font-medium"
          >
            Current password
          </label>
          <input
            id="passkey-password"
            type="password"
            autoComplete="current-password"
            maxLength={128}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={busy}
            className="mt-2 w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 focus:outline-2 focus:outline-emerald-600"
            aria-describedby="passkey-password-help"
          />
          <p id="passkey-password-help" className="mt-2 text-sm text-slate-500">
            Required to enroll or revoke a key. Additional enrollment also
            requires fresh passkey verification.
          </p>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            className={button}
            disabled={
              !loaded || busy || !password || (keys.length > 0 && !assurance)
            }
            onClick={() => void perform("enroll")}
          >
            {keys.length ? "Add another passkey" : "Enroll passkey"}
          </button>
          <button
            className={button}
            disabled={!loaded || busy || !activeCount}
            onClick={() => void perform("verify")}
          >
            Verify passkey
          </button>
          {busy && (
            <button
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm"
              onClick={() => operation.current?.abort()}
            >
              Cancel browser prompt
            </button>
          )}
        </div>
        <p
          role="status"
          aria-live="polite"
          className="mt-4 text-sm text-emerald-800"
        >
          {busy ? "Waiting for the passkey operation…" : message}
        </p>
        {error && (
          <p
            role="alert"
            className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800"
          >
            {error}
          </p>
        )}
        <ul
          aria-label="Enrolled passkeys"
          className="mt-6 divide-y divide-slate-100"
        >
          {keys.map((k, i) => (
            <li
              key={k.id}
              className="flex flex-wrap items-center justify-between gap-4 py-4"
            >
              <div>
                <h3 className="font-medium">Passkey {i + 1}</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Enrolled{" "}
                  {new Date(k.createdAt).toLocaleString("en-GB", {
                    timeZone: "Asia/Taipei",
                  })}{" "}
                  (Taipei) ·{" "}
                  {k.deviceType === "multiDevice"
                    ? "Sync-capable"
                    : "Single-device"}
                </p>
                <p className="text-sm text-slate-600">
                  {k.revokedAt ? "Revoked" : "Enrolled"} ·{" "}
                  {k.backedUp
                    ? "Authenticator reports backup"
                    : "No backup reported"}
                </p>
              </div>
              {!k.revokedAt && (
                <button
                  className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-800 disabled:opacity-50"
                  aria-label={`Revoke passkey ${i + 1}`}
                  disabled={
                    busy ||
                    !password ||
                    !assurance ||
                    (activeCount === 1 && !lastKeyAccepted)
                  }
                  onClick={() => void perform("revoke", k.id)}
                >
                  Revoke
                </button>
              )}
            </li>
          ))}
        </ul>
        {loaded && !keys.length && (
          <p className="mt-4 text-sm text-slate-500">
            No passkeys enrolled. Enrollment does not grant staff permissions.
          </p>
        )}
        {activeCount === 1 && (
          <label className="mt-4 flex items-start gap-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-950">
            <input
              type="checkbox"
              checked={lastKeyAccepted}
              onChange={(e) => setLastKeyAccepted(e.target.checked)}
              disabled={busy}
              className="mt-1"
            />
            I understand that revoking my last passkey blocks re-enrollment
            because assisted recovery is not implemented.
          </label>
        )}
      </section>
      <section
        className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
        aria-labelledby="recovery-title"
      >
        <h2 id="recovery-title" className="font-semibold">
          Recovery is not available in this pilot
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Keep an additional passkey before revoking a device. Losing every key
          cannot be fixed with a password, email or self-approved reset.
          Mandatory MFA is not enabled. Disposable test data is removed after
          the test; no production credentials are enrolled.
        </p>
      </section>
    </div>
  );
}

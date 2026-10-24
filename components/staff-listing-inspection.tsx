"use client";
import { useState } from "react";
import { enrollPasskey, verifyPasskey } from "@/lib/webauthn-browser";
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/server";
type Metadata = {
  id: number;
  status: string;
  category: string;
  adminRestricted: boolean;
};
const button =
  "rounded-lg bg-emerald-700 px-4 py-2 text-white disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700";
async function command<T>(body: object): Promise<T> {
  const r = await fetch("/api/dev/staff-listing-read", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const data = await r.json();
  if (!r.ok) throw Error(data.error ?? "Pilot denied");
  return data;
}
export function StaffListingInspection() {
  const [password, setPassword] = useState(""),
    [listing, setListing] = useState(""),
    [binding, setBinding] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [row, setRow] = useState<Metadata | null>(null);
  async function run(action: "enroll" | "verify" | "read") {
    setBusy(true);
    setMessage("");
    setRow(null);
    try {
      if (action === "enroll") {
        const c = await command<{
          challengeId: string;
          options: PublicKeyCredentialCreationOptionsJSON;
        }>({ action: "enroll.begin", password });
        const response = await enrollPasskey(
          c.options,
          new AbortController().signal,
        );
        await command({
          action: "enroll.finish",
          challengeId: c.challengeId,
          password,
          response,
        });
        setMessage("Fixture passkey enrolled. Verify it next.");
      } else if (action === "verify") {
        const c = await command<{
          challengeId: string;
          options: PublicKeyCredentialRequestOptionsJSON;
        }>({ action: "verify.begin" });
        const response = await verifyPasskey(
          c.options,
          new AbortController().signal,
        );
        const result = await command<{
          factorVerified: boolean;
          staffAuthorized: false;
          bindingId: string;
        }>({ action: "verify.finish", challengeId: c.challengeId, response });
        if (
          !result.factorVerified ||
          result.staffAuthorized !== false ||
          !result.bindingId
        )
          throw Error("Real factor verification required");
        setBinding(result.bindingId);
        setMessage("Real factor verified; synthetic pilot binding only.");
      } else {
        const result = await command<Metadata>({
          action: "read",
          listingId: listing,
          bindingId: binding,
        });
        setRow(result);
        setMessage("Scoped metadata returned after durable test access audit.");
      }
    } catch (e) {
      setBinding("");
      setMessage(e instanceof Error ? e.message : "Pilot denied");
    } finally {
      setPassword("");
      setBusy(false);
    }
  }
  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-3xl font-semibold">
        Hustlen’ · Listing inspection pilot
      </h1>
      <p className="rounded-xl border border-amber-300 bg-amber-50 p-4">
        OWNED SYNTHETIC IDENTITY · DEVELOPMENT ONLY. This fixture is not a
        verified real human or active staff membership. Production staff access
        and operational actions remain blocked.
      </p>
      <section className="space-y-4 rounded-xl border bg-white p-5">
        <h2 className="text-xl font-semibold">Real passkey authentication</h2>
        <label className="block">
          Current password
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-2 block w-full max-w-sm rounded border p-2"
          />
        </label>
        <div className="flex flex-wrap gap-3">
          <button
            className={button}
            disabled={busy || !password}
            onClick={() => void run("enroll")}
          >
            Enroll fixture passkey
          </button>
          <button
            className={button}
            disabled={busy}
            onClick={() => void run("verify")}
          >
            Verify fixture passkey
          </button>
        </div>
      </section>
      <section className="space-y-4 rounded-xl border bg-white p-5">
        <h2 className="text-xl font-semibold">One exact listing</h2>
        <label className="block">
          Listing ID
          <input
            inputMode="numeric"
            value={listing}
            onChange={(e) => setListing(e.target.value)}
            className="ml-3 w-32 rounded border p-2"
          />
        </label>
        <button
          className={button}
          disabled={busy || !binding || !listing}
          onClick={() => void run("read")}
        >
          Inspect scoped metadata
        </button>
        <p role="status" className="text-sm">
          {busy ? "Working…" : message}
        </p>
        {row && (
          <dl className="grid grid-cols-2 gap-3">
            <dt>ID</dt>
            <dd>{row.id}</dd>
            <dt>Status</dt>
            <dd>{row.status}</dd>
            <dt>Category</dt>
            <dd>{row.category}</dd>
            <dt>Admin restricted</dt>
            <dd>{String(row.adminRestricted)}</dd>
          </dl>
        )}
      </section>
      <p className="text-sm text-slate-600">
        No listing edits, evidence, counts, media or recovery. Verification
        expires within five minutes. Refresh requires a new verification; use a
        new disposable fixture if its last key is lost.
      </p>
    </main>
  );
}

"use client";
import { useState } from "react";
export function LogoutButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function handleLogout() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok)
        throw new Error("Unable to sign out. Please try again.");
      try {
        for (const key of Object.keys(sessionStorage))
          if (key.startsWith("hustlen:condition-draft:"))
            sessionStorage.removeItem(key);
      } catch {}
      // A full navigation discards the authenticated Next client router cache.
      window.location.replace("/login");
    } catch {
      setError("Unable to sign out. Please try again.");
      setBusy(false);
    }
  }
  return (
    <div>
      <button
        type="button"
        onClick={handleLogout}
        disabled={busy}
        className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50"
      >
        {busy ? "Signing out…" : "Sign out"}
      </button>
      {error ? (
        <p role="alert" className="text-xs text-rose-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}

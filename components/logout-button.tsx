"use client";
import { useLocale } from "@/components/i18n/locale";
import { useState } from "react";
export function LogoutButton() {
  const { t } = useLocale();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  async function handleLogout() {
    setBusy(true);
    setError(false);
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
      setError(true);
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
        {t(busy ? "logout.busy" : "logout.action")}
      </button>
      {error ? (
        <p role="alert" className="text-xs text-rose-700">
          {t("logout.error")}
        </p>
      ) : null}
    </div>
  );
}

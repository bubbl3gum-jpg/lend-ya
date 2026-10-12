"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function AccountSettings({ name }: { name: string }) {
 const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false); const router = useRouter();
 return <form className="space-y-4" onSubmit={async e => { e.preventDefault(); const data = new FormData(e.currentTarget); setBusy(true); try { const response = await fetch("/api/account", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: data.get("name") }) }); const result = await response.json(); setMessage(response.ok ? "Settings saved." : result.error); if (response.ok) router.refresh(); } catch { setMessage("Unable to save settings."); } finally { setBusy(false); } }}><label className="grid gap-2">Display name<input name="name" defaultValue={name} required maxLength={100} className="rounded border p-3" /></label><button disabled={busy} className="rounded bg-emerald-700 px-4 py-2 text-white">{busy ? "Saving…" : "Save settings"}</button><p role="status">{message}</p></form>;
}

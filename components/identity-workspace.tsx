"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useLocale } from "@/components/i18n/locale";
import { identityText } from "@/lib/i18n/identity";
import { formatTime } from "@/lib/i18n/core";
import { documents, scenarios, type Command, type DocumentType, type Scenario } from "@/lib/identity/contracts";
import type { Simulation } from "@/lib/identity/simulation";
export function IdentityWorkspace({ initial }: { initial: Simulation }) {
 const { locale } = useLocale(), t = identityText(locale);
 const [state, setState] = useState<Simulation | null>(initial), [error, setError] = useState<"SESSION" | "CONFLICT" | "CHALLENGE" | "CAPACITY" | "UNAVAILABLE" | null>(null), [busy, setBusy] = useState(false);
 const [documentType, setDocument] = useState<DocumentType>("TW_NATIONAL_ID"), [scenario, setScenario] = useState<Scenario>("SUCCESS"), [booking, setBooking] = useState("");
 const request = useRef<AbortController | null>(null), sequence = useRef(0);
 async function load(command?: Command) {
  const current = ++sequence.current; request.current?.abort(); const controller = new AbortController(); request.current = controller;
  setBusy(true); setError(null);
  try {
   const r = await fetch("/api/dev/identity", { cache: "no-store", signal: controller.signal, ...(command ? { method: "POST", headers: { "Content-Type": "application/json", "X-Hustlen-Identity": "1" }, body: JSON.stringify(command) } : {}) });
   const value = await r.json();
   if (controller.signal.aborted || current !== sequence.current) return;
   if (!r.ok) { setState(null); setError(["SESSION", "CONFLICT", "CHALLENGE", "CAPACITY"].includes(value.code) ? value.code : "UNAVAILABLE"); } else setState(value);
  } catch { if (!controller.signal.aborted && current === sequence.current) { setState(null); setError("UNAVAILABLE"); } }
  finally { if (current === sequence.current) setBusy(false); }
 }
 useEffect(() => {
  const refresh = () => { setState(null); void load(); };
  window.addEventListener("focus", refresh);
  return () => { request.current?.abort(); window.removeEventListener("focus", refresh); };
 }, []);
 const label = (s: Simulation["state"]) => t[s === "REJECTED" ? "REJECTED_STATE" : s];
 return <section className="catalogue-trust identity-workspace" lang={locale} aria-labelledby="identity-title">
  <p className="catalogue-eyebrow">{t.label}</p><h2 id="identity-title">{t.title}</h2>
  <p>{t.intro}</p><p className="catalogue-scope-note">{t.notice}</p><p>{t.documents}</p><p>{t.processing}</p><p>{t.journey}</p>
  <div aria-live="polite" aria-busy={busy}>
   {error && <p role="alert">{t[error]} {error === "SESSION" && <Link href="/login">{t.login}</Link>}</p>}
   {state && <><h3>{t.status}: <span data-testid="identity-state">{label(state.state)}</span></h3><p>{t.stage}: {t[state.stage]}</p><p>{t.version}: {state.version}</p>{state.expiresAt && <p>{t.expiry}: {formatTime(locale, state.expiresAt)}</p>}</>}
   <p><strong>{t.eligibility}</strong></p>
  </div>
  <form onSubmit={e => { e.preventDefault(); if (state && !busy) void load({ action: "BEGIN", expectedVersion: state.version, documentType, scenario }); }}>
   <label>{t.doc}<select value={documentType} onChange={e => setDocument(e.target.value as DocumentType)} disabled={busy}>{documents.map(d => <option key={d} value={d}>{t[d]}</option>)}</select></label>
   <label>{t.scenario}<select value={scenario} onChange={e => setScenario(e.target.value as Scenario)} disabled={busy}>{scenarios.map(s => <option key={s} value={s}>{t[s]}</option>)}</select></label>
   <div className="identity-actions"><button type="submit" className="heritage-button" disabled={busy || !state || state.state === "PENDING"}>{busy ? t.loading : t.begin}</button>
   <button type="button" disabled={busy || state?.state !== "PENDING"} onClick={() => state && void load({ action: "ADVANCE", expectedVersion: state.version })}>{t.advance}</button>
   <button type="button" disabled={busy || state?.state !== "VERIFIED"} onClick={() => state && void load({ action: "REVOKE", expectedVersion: state.version })}>{t.revoke}</button>
   <button type="button" disabled={busy || !state} onClick={() => state && void load({ action: "RESET", expectedVersion: state.version })}>{t.reset}</button>
   <button type="button" disabled={busy} onClick={() => void load()}>{t.refresh}</button></div>
  </form>
  <p>{t.retry}</p><p><Link href="/customer-service">{t.assistance}</Link></p>
  <h3>{t.challenge}</h3><p>{t.challengeInfo}</p>
  <form onSubmit={e => { e.preventDefault(); if (state && !busy) void load({ action: "CHALLENGE", expectedVersion: state.version, bookingId: Number(booking) }); }}>
   <label>{t.booking}<input type="number" min="1" max="2147483647" required value={booking} onChange={e => setBooking(e.target.value)} /></label>
   <div className="identity-actions"><button disabled={busy || state?.state !== "VERIFIED"}>{t.issue}</button>
   <button type="button" disabled={busy || !state?.challenge || state.challenge.consumed} onClick={() => state?.challenge && void load({ action: "COMPLETE_CHALLENGE", expectedVersion: state.version, challengeId: state.challenge.id })}>{t.complete}</button></div>
  </form>
  {state?.challenge && <p>{state.challenge.purpose} · #{state.challenge.bookingId} · {state.challenge.consumed ? t.consumed : t.pending} · {t.expiry}: {formatTime(locale, state.challenge.expiresAt)}</p>}
  <h3>{t.history}</h3><div className="identity-history"><ol>{state?.history.map(h => <li key={h.version}>{t.version} {h.version} · <span lang="en">{h.action}</span> · {label(h.state)} · {formatTime(locale, h.at)}</li>)}</ol>{!state?.history.length && <p>{t.empty}</p>}</div>
  <p>{t.demoOnly}</p><p className="catalogue-scope-note">{t.retention}</p>
 </section>;
}

"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { HeritageSurface } from "@/components/heritage/experience";
import { useLocale } from "@/components/i18n/locale";
import { syntheticCases, syntheticCase } from "@/lib/ai-case-brief/fixtures";
import { formatTime, type Locale } from "@/lib/i18n/core";
import type { Appearance } from "@/lib/heritage/appearance";
export function SyntheticCaseBrief({ initialLocale, initialTheme }: { initialLocale: Locale; initialTheme: Appearance }) {
  return <HeritageSurface initialLocale={initialLocale} initialTheme={initialTheme}><Notebook /></HeritageSurface>;
}
function Notebook() {
  const { locale, t } = useLocale();
  const [selected, setSelected] = useState(syntheticCases[0].id);
  const c = syntheticCase(selected)!;
  const [state, setState] = useState<"idle" | "loading" | "ready" | "unavailable">("idle");
  const [draft, setDraft] = useState("");
  const [draftLocale, setDraftLocale] = useState<Locale>(locale);
  const [dirty, setDirty] = useState(false);
  const [ack, setAck] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const feedback = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (state !== "loading") return;
    // One cancellable paint for an honest local preparation state, not model latency.
    const frame = requestAnimationFrame(() => {
      setDraft(c.reply[locale]); setDraftLocale(locale); setState("ready");
    });
    return () => cancelAnimationFrame(frame);
  }, [state, c, locale]);
  useEffect(() => {
    if (state === "ready" || state === "unavailable") feedback.current?.focus();
  }, [state]);
  useEffect(() => {
    if (reviewed) feedback.current?.focus();
  }, [reviewed]);
  function resetAllowed() { return !dirty || window.confirm(t("ai.discard")); }
  function reset() { setDraft(""); setDirty(false); setAck(false); setReviewed(false); }
  return <article className="ai-notebook" data-testid="synthetic-notebook">
    <header className="ai-masthead">
      <p className="catalogue-eyebrow">{t("ai.kicker")}</p>
      <h1>{t("ai.title")}</h1><p className="ai-deck">{t("ai.intro")}</p>
      <p className="ai-boundary">{t("ai.boundary")}</p>
      <Link href="/admin/workbench">← {t("ai.back")}</Link>
    </header>
    <div className="ai-scenario">
      <label htmlFor="synthetic-scenario">{t("ai.select")}</label>
      <select id="synthetic-scenario" value={selected} aria-describedby="scenario-note" onChange={(e) => {
        if (!resetAllowed()) return;
        setSelected(e.target.value); reset(); setState("idle");
      }}>{syntheticCases.map((item) => <option key={item.id} value={item.id}>{item.id} · {item.title[locale]}</option>)}</select>
      <p id="scenario-note">{t("ai.switchNote")}</p>
    </div>
    <div className="ai-ledger-layout">
      <section className="ai-source-ledger" aria-labelledby="source-heading">
        <h2 id="source-heading">{t("ai.context")}</h2>
        <p className="catalogue-eyebrow">{c.id} / {c.rental}</p>
        <h3>{c.title[locale]}</h3>
        <p>{t("ai.side", { side: t(c.side === "OWNER" ? "ai.owner" : "ai.borrower") })}</p>
        <ol className="ai-facts">{c.facts.map((f) => <li key={f.id} id={`fact-${c.id}-${f.id}`} tabIndex={-1} data-source-id={f.id}>
          <span className="catalogue-eyebrow">{f.id} / {t(f.kind === "CONTEXT" ? "ai.contextKind" : "ai.claimKind")}</span>
          <p>{f.content[locale]}</p>
          <p className="ai-small">{t("ai.timestamp")}<br /><time dateTime={f.at}>{formatTime(locale, f.at)}</time></p>
        </li>)}</ol>
        <p className="ai-privacy">{t("ai.privacy")}</p>
      </section>
      <section className="ai-working-brief" aria-labelledby="brief-heading" aria-busy={state === "loading"}>
        <h2 id="brief-heading">{t("ai.output")}</h2>
        <div className="ai-actions">
          <button type="button" disabled={state === "loading"} onClick={() => { if (resetAllowed()) { reset(); setState("loading"); } }}>{t("ai.open")}</button>
          <button type="button" className="ai-secondary" disabled={state === "loading"} onClick={() => { if (resetAllowed()) { reset(); setState("unavailable"); } }}>{t("ai.unavailableDemo")}</button>
        </div>
        <p ref={feedback} tabIndex={-1} role="status" className="ai-feedback">{t(state === "idle" ? "ai.idle" : state === "loading" ? "ai.loading" : state === "unavailable" ? "ai.unavailable" : reviewed ? "ai.reviewed" : "ai.ready")}</p>
        {state === "ready" && <div data-testid="scripted-output">
          <h3>{t("ai.summary")}</h3>
          <ul className="ai-summary">{c.summary.map((s, i) => <li key={i}><p>{s.text[locale]}</p><div className="ai-citations">{s.refs.map((ref) => <a key={ref} href={`#fact-${c.id}-${ref}`} aria-label={t("ai.cite", { id: ref })} onClick={(e) => { e.preventDefault(); const target = document.getElementById(`fact-${c.id}-${ref}`); target?.focus(); target?.scrollIntoView({ block: "nearest", behavior: "instant" }); }}>[{ref}]</a>)}</div></li>)}</ul>
          <dl className="ai-observations">
            <div><dt>{t("ai.category")}</dt><dd>{c.category[locale]}</dd></div>
            <div><dt>{t("ai.missing")}</dt><dd>{c.missing[locale]}</dd></div>
            <div><dt>{t("ai.question")}</dt><dd>{c.question[locale]}</dd></div>
            <div><dt>{t("ai.caution")}</dt><dd>{c.caution[locale]}</dd></div>
          </dl>
          <div className="ai-draft">
            <label htmlFor="synthetic-draft">{t("ai.draft")}</label>
            <p id="draft-note">{t("ai.draftNote", { language: t(draftLocale === "en" ? "ai.english" : "ai.chinese") })}</p>
            <textarea id="synthetic-draft" lang={draftLocale} aria-describedby="draft-note review-note" rows={6} maxLength={4000} value={draft} onChange={(e) => { setDraft(e.target.value); setDirty(true); setAck(false); setReviewed(false); }} />
            <label className="ai-ack"><input type="checkbox" checked={ack} onChange={(e) => { setAck(e.target.checked); setReviewed(false); }} />{t("ai.ack")}</label>
            <button type="button" disabled={!ack || !draft.trim() || reviewed} onClick={() => setReviewed(true)}>{t("ai.review")}</button>
            <p id="review-note" className="ai-small">{t("ai.reviewHelp")}</p>
          </div>
        </div>}
      </section>
    </div>
    <footer className="ai-footnote">{t("ai.limits")}</footer>
  </article>;
}

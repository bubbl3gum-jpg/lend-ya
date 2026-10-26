"use client";
import { useState } from "react";
import Link from "next/link";
import { formatRentalTime } from "@/lib/booking-time";
type Row = {
  id: string;
  title: string;
  body: string;
  state: string;
  displayState: string;
  version: number;
  createdAt: string;
  startsAt: string | null;
  expiresAt: string | null;
};
type Event = {
  id: string;
  actorId: number;
  action: string;
  previousVersion: number;
  resultingVersion: number;
  createdAt: string;
};
const box =
  "w-full rounded-lg border border-slate-300 bg-white p-3 focus-visible:outline-2 focus-visible:outline-emerald-600";
const button =
  "rounded-lg bg-slate-900 px-4 py-2 text-white disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600";
export function AnnouncementWorkspace({
  rows: initial,
  candidate,
}: {
  rows: Row[];
  candidate: boolean;
}) {
  const [rows, setRows] = useState(initial),
    [selected, setSelected] = useState<Row | null>(null),
    [title, setTitle] = useState(""),
    [body, setBody] = useState(""),
    [start, setStart] = useState(""),
    [end, setEnd] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [history, setHistory] = useState<Event[]>([]),
    [filter, setFilter] = useState("ALL"),
    [preview, setPreview] = useState(false);
  // Reuse the exact request only after a transport failure; edits/action changes receive new keys.
  const [retry, setRetry] = useState<{
    signature: string;
    requestId: string;
  } | null>(null);
  async function select(row: Row | null) {
    setSelected(row);
    setTitle(row?.title ?? "");
    setBody(row?.body ?? "");
    setPreview(false);
    setMessage("");
    setHistory([]);
    setRetry(null);
    if (row) {
      try {
        const r = await fetch("/api/admin/announcements?history=" + row.id, {
          cache: "no-store",
        });
        const j = await r.json();
        if (!r.ok) throw Error(j.error);
        setHistory(j.events);
      } catch (e) {
        setMessage((e as Error).message);
      }
    }
  }
  async function command(action: string) {
    const base = {
      action,
      ...(action === "CREATE"
        ? {}
        : { id: selected?.id, version: selected?.version }),
      ...(["CREATE", "EDIT"].includes(action) ? { title, body } : {}),
      ...(action === "PUBLISH"
        ? {
            startsAt: start ? new Date(start + ":00+08:00").toISOString() : "",
            expiresAt: end ? new Date(end + ":00+08:00").toISOString() : "",
          }
        : {}),
    };
    const signature = JSON.stringify(base),
      requestId =
        retry?.signature === signature ? retry.requestId : crypto.randomUUID();
    setRetry({ signature, requestId });
    setBusy(true);
    setMessage("");
    try {
      const r = await fetch("/api/admin/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...base, requestId }),
      });
      const j = await r.json();
      if (!r.ok) {
        setRetry(null);
        throw Error(j.error ?? "Request failed.");
      }
      setRetry(null);
      const refreshed = await fetch("/api/admin/announcements", {
        cache: "no-store",
      });
      if (!refreshed.ok)
        throw Error(
          "Saved; directory refresh failed. Reload before making another change.",
        );
      const data = await refreshed.json();
      setRows(data.announcements);
      const row = data.announcements.find((x: Row) => x.id === j.id);
      await select(row ?? null);
      setMessage(
        `Recorded version ${j.version}${j.replayed ? " (idempotent retry)" : ""}. No notification delivery.`,
      );
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const changed =
    !!selected && (title !== selected.title || body !== selected.body);
  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700">
          Community
        </p>
        <h1 className="text-3xl font-semibold">Announcements</h1>
        <p className="mt-2 text-slate-600">
          Persisted text notices, publication windows and immutable change
          history.
        </p>
      </header>
      <aside className="rounded-xl border border-amber-300 bg-amber-50 p-4">
        <strong>
          {candidate
            ? "Owned-development informational candidate"
            : "Read-only inventory"}
        </strong>
        <p>
          Production publishing is disabled. No emergency or safety-critical
          notices. Audience: allowlisted test Admins only. No email, SMS or push
          delivery.
        </p>
        {candidate ? (
          <Link className="underline" href="/dev/announcements">
            Open test audience demonstration
          </Link>
        ) : null}
      </aside>
      <p role="status" aria-live="polite" className="break-words text-sm">
        {message}
      </p>
      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <section
          aria-label="Announcement directory"
          className="min-w-0 space-y-4 rounded-xl border bg-white p-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">Notice directory</h2>
            {candidate ? (
              <button
                className={button}
                disabled={busy}
                onClick={() => select(null)}
              >
                New announcement
              </button>
            ) : null}
          </div>
          <label className="block">
            Lifecycle filter
            <select
              className={box}
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              {[
                "ALL",
                "DRAFT",
                "SCHEDULED",
                "ACTIVE",
                "EXPIRED",
                "ARCHIVED",
              ].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          {!rows.length ? (
            <p>No persisted announcements.</p>
          ) : (
            rows
              .filter((r) => filter === "ALL" || r.displayState === filter)
              .map((r) => (
                <button
                  key={r.id}
                  disabled={busy}
                  onClick={() => select(r)}
                  aria-pressed={selected?.id === r.id}
                  className="block w-full min-w-0 rounded-lg border p-4 text-left hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-emerald-600"
                >
                  <span className="block break-words font-semibold">
                    {r.title}
                  </span>
                  <span className="text-sm">
                    {r.displayState} · v{r.version}
                  </span>
                  {r.startsAt ? (
                    <span className="block text-xs text-slate-600">
                      {formatRentalTime(r.startsAt)} →{" "}
                      {formatRentalTime(r.expiresAt!)}
                    </span>
                  ) : null}
                </button>
              ))
          )}
        </section>
        <section
          aria-label="Notice editor"
          className="min-w-0 space-y-4 rounded-xl border bg-white p-5"
        >
          <h2 className="text-xl font-semibold">
            {selected ? `Notice · v${selected.version}` : "Create a draft"}
          </h2>
          {selected ? (
            <p className="break-all text-xs text-slate-500">{selected.id}</p>
          ) : null}
          <fieldset
            disabled={
              busy || !candidate || (!!selected && selected.state !== "DRAFT")
            }
            className="space-y-4"
          >
            <label className="block">
              Title (120 characters)
              <input
                className={box}
                maxLength={120}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
            <label className="block">
              Body (4,000 characters, plain text)
              <textarea
                className={box + " min-h-40"}
                maxLength={4000}
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </label>
            <button
              className={button}
              onClick={() => command(selected ? "EDIT" : "CREATE")}
              disabled={!title.trim() || !body.trim()}
            >
              Save draft
            </button>
          </fieldset>
          <button
            className="rounded-lg border px-4 py-2"
            onClick={() => setPreview(!preview)}
            aria-expanded={preview}
          >
            Preview text
          </button>
          {preview ? (
            <article
              aria-label="Text preview"
              className="rounded-lg bg-slate-50 p-4"
            >
              <p className="text-xs">Preview only · not reader delivery</p>
              <h3 className="break-words text-xl font-semibold">{title}</h3>
              <p className="whitespace-pre-wrap break-words">{body}</p>
            </article>
          ) : null}
          {candidate && selected?.state === "DRAFT" ? (
            <fieldset disabled={busy} className="space-y-3 border-t pt-4">
              <legend className="font-semibold">
                Test publication window · Asia/Taipei (UTC+08:00)
              </legend>
              <label className="block">
                Publication start
                <input
                  className={box}
                  type="datetime-local"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                />
              </label>
              <label className="block">
                Expiration
                <input
                  className={box}
                  type="datetime-local"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                />
              </label>
              <p className="text-sm text-slate-600">
                Maximum 31 days under fixture policy. Save edits before
                publication. Visibility follows the server clock.
              </p>
              <button
                className={button}
                disabled={!start || !end || changed}
                onClick={() => command("PUBLISH")}
              >
                Publish / schedule test notice
              </button>
            </fieldset>
          ) : null}
          {candidate && selected && selected.state !== "ARCHIVED" ? (
            <button
              className="rounded-lg border border-red-300 px-4 py-2 text-red-800"
              disabled={busy}
              onClick={() => {
                if (
                  window.confirm(
                    selected.state === "PUBLISHED"
                      ? "Withdraw this notice from the test audience?"
                      : "Archive this draft?",
                  )
                )
                  command(
                    selected.state === "PUBLISHED" ? "WITHDRAW" : "ARCHIVE",
                  );
              }}
            >
              {selected.state === "PUBLISHED"
                ? "Withdraw notice"
                : "Archive draft"}
            </button>
          ) : null}
          <section aria-label="Change history">
            <h3 className="font-semibold">Immutable change history</h3>
            {history.length ? (
              history.map((e) => (
                <p className="my-2 text-sm" key={e.id}>
                  {e.action} · v{e.previousVersion} → v{e.resultingVersion} ·
                  Admin #{e.actorId}
                  <br />
                  {formatRentalTime(e.createdAt)}
                </p>
              ))
            ) : (
              <p className="text-sm text-slate-500">
                Select a persisted notice to view its history.
              </p>
            )}
          </section>
        </section>
      </div>
    </div>
  );
}

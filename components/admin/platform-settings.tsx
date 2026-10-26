"use client";
import { useState } from "react";
import type { SettingRow } from "@/lib/admin/settings";
import {
  type SettingView,
  type SettingKey,
} from "@/lib/platform-settings/registry";
import { formatRentalTime } from "@/lib/booking-time";
type Event = {
  id: string;
  key: SettingKey;
  action: string;
  previousValue: boolean | number;
  value: boolean | number;
  previousVersion: number;
  version: number;
  rollbackVersion: number | null;
  actorId: number;
  createdAt: string;
};
const field =
  "w-full rounded-lg border border-slate-300 bg-white p-3 focus-visible:outline-2 focus-visible:outline-emerald-600";
const button =
  "rounded-lg bg-slate-900 px-4 py-2 text-white disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600";
function Editor({
  row,
  onSaved,
}: {
  row: SettingView;
  onSaved: () => Promise<SettingView[]>;
}) {
  const [draft, setDraft] = useState<boolean | number>(row.value),
    [baseVersion, setBaseVersion] = useState(row.version),
    [baseValue, setBaseValue] = useState(row.value),
    [events, setEvents] = useState<Event[]>([]),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [target, setTarget] = useState("0"),
    [retry, setRetry] = useState<{
      signature: string;
      requestId: string;
    } | null>(null);
  const dirty = draft !== baseValue;
  async function history(earlier = false) {
    try {
      const url =
        "/api/admin/platform-settings?key=" +
        encodeURIComponent(row.key) +
        (earlier && events.length
          ? "&before=" + events[events.length - 1].version
          : "");
      const r = await fetch(url, { cache: "no-store" }),
        j = await r.json();
      if (!r.ok) throw Error(j.error);
      setEvents(earlier ? [...events, ...j.events] : j.events);
    } catch (e) {
      setMessage((e as Error).message);
    }
  }
  async function apply(action: "SET" | "ROLLBACK") {
    const command = {
        key: row.key,
        action,
        expectedVersion: baseVersion,
        ...(action === "SET"
          ? { value: draft }
          : { targetVersion: Number(target) }),
      },
      signature = JSON.stringify(command),
      requestId =
        retry?.signature === signature ? retry.requestId : crypto.randomUUID();
    setRetry({ signature, requestId });
    setBusy(true);
    setMessage("");
    try {
      const r = await fetch("/api/admin/platform-settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...command, requestId }),
        }),
        j = await r.json();
      if (!r.ok) {
        setRetry(null);
        throw Error(j.error ?? "Settings request failed.");
      }
      setRetry(null);
      const latest = (await onSaved()).find((r) => r.key === row.key)!;
      setDraft(latest.value);
      setBaseValue(latest.value);
      setBaseVersion(latest.version);
      setMessage(
        `Recorded version ${j.version}${j.replayed ? " (retry)" : ""}. Refresh the test demonstration to observe the server value.`,
      );
      await history();
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <article
      aria-label={row.label}
      className="min-w-0 space-y-4 rounded-xl border border-emerald-300 bg-white p-5"
    >
      <h3 className="text-lg font-semibold">{row.label}</h3>
      <p className="break-words text-xs text-slate-500">{row.key}</p>
      <p>{row.description}</p>
      <p className="text-sm">
        Effective: <strong>{String(row.value)}</strong> · version {row.version}{" "}
        ·{" "}
        {row.source === "DEFAULT"
          ? "Code default (no stored revision)"
          : "Persisted database revision"}
      </p>
      {row.updatedAt ? (
        <p className="text-sm">
          Admin #{row.actorId} · {formatRentalTime(row.updatedAt)}
        </p>
      ) : null}
      <p className="text-sm">
        Low-risk development display only; production authority unapproved.
      </p>
      <fieldset disabled={busy} className="space-y-3">
        <label className="block">
          Proposed {row.label.toLowerCase()}
          {row.type === "boolean" ? (
            <select
              aria-label={row.label + " value"}
              className={field}
              value={String(draft)}
              onChange={(e) => setDraft(e.target.value === "true")}
            >
              <option value="true">Shown</option>
              <option value="false">Hidden</option>
            </select>
          ) : (
            <input
              aria-label={row.label + " value"}
              className={field}
              type="number"
              min={1}
              max={100}
              step={1}
              value={Number.isNaN(draft) ? "" : String(draft)}
              onChange={(e) =>
                setDraft(e.target.value === "" ? NaN : Number(e.target.value))
              }
            />
          )}
        </label>
        <p className="text-sm" role="status">
          {baseVersion !== row.version
            ? "Effective version changed; reload before saving."
            : dirty
              ? "Unsaved change — reload discards this proposed value."
              : "Matches the current effective value."}
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            className={button}
            disabled={
              !dirty ||
              (typeof draft === "number" &&
                (!Number.isInteger(draft) || draft < 1 || draft > 100))
            }
            onClick={() => apply("SET")}
          >
            Save {row.label.toLowerCase()}
          </button>
          <button
            className="rounded-lg border px-4 py-2"
            onClick={async () => {
              if (
                dirty &&
                !window.confirm("Discard this unsaved value and reload?")
              )
                return;
              try {
                const latest = (await onSaved()).find(
                  (r) => r.key === row.key,
                )!;
                setDraft(latest.value);
                setBaseValue(latest.value);
                setBaseVersion(latest.version);
                setMessage(
                  "Reload requested. Review the current version before editing.",
                );
              } catch (e) {
                setMessage((e as Error).message);
              }
            }}
          >
            Reload current version
          </button>
        </div>
      </fieldset>
      <p role="status" aria-live="polite" className="text-sm">
        {message}
      </p>
      <section
        aria-label={row.label + " history"}
        className="space-y-3 border-t pt-3"
      >
        <h4 className="font-semibold">Version history</h4>
        <button
          className="rounded-lg border px-4 py-2"
          disabled={busy}
          onClick={() => history()}
        >
          View history
        </button>
        {events.map((e) => (
          <p className="text-sm" key={e.id}>
            {e.action} · v{e.previousVersion} → v{e.version} ·{" "}
            {String(e.previousValue)} → {String(e.value)}
            {e.rollbackVersion !== null
              ? ` · restored v${e.rollbackVersion}`
              : ""}
            <br />
            Admin #{e.actorId} · {formatRentalTime(e.createdAt)}
          </p>
        ))}
        {events.length && events.length % 50 === 0 ? (
          <button
            className="rounded-lg border px-4 py-2"
            onClick={() => history(true)}
          >
            Load earlier events
          </button>
        ) : null}
        {row.version > 0 ? (
          <fieldset disabled={busy} className="space-y-2">
            <label className="block">
              Earlier version (0 = code default)
              <input
                aria-label={row.label + " rollback version"}
                type="number"
                min={0}
                max={row.version - 1}
                step={1}
                className={field}
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              />
            </label>
            <button
              className="rounded-lg border px-4 py-2"
              disabled={
                dirty || !/^\d+$/.test(target) || Number(target) >= row.version
              }
              onClick={() => {
                if (
                  window.confirm(
                    "Record a new version restoring this earlier display value?",
                  )
                )
                  apply("ROLLBACK");
              }}
            >
              Record rollback
            </button>
          </fieldset>
        ) : null}
      </section>
    </article>
  );
}
export function PlatformSettingsWorkspace({
  inventory,
  initial,
  available,
}: {
  inventory: SettingRow[];
  initial: SettingView[];
  available: boolean;
}) {
  const [query, setQuery] = useState(""),
    [group, setGroup] = useState("ALL"),
    [rows, setRows] = useState(initial),
    [message, setMessage] = useState("");
  async function refresh() {
    const r = await fetch("/api/admin/platform-settings", {
        cache: "no-store",
      }),
      j = await r.json();
    if (!r.ok)
      throw Error(
        j.error ?? "Refresh failed. Reload before making further edits.",
      );
    setRows(j.settings);
    return j.settings as SettingView[];
  }
  const shown = inventory.filter(
    (r) =>
      (group === "ALL" || r.id.split(".")[0] === group) &&
      [r.id, r.label, r.source, r.value].some((v) =>
        v.toLowerCase().includes(query.toLowerCase()),
      ),
  );
  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700">
          System
        </p>
        <h1 className="text-3xl font-semibold">Platform Settings</h1>
        <p className="mt-2 text-slate-600">
          Authoritative operational inventory and scoped development display
          controls.
        </p>
      </header>
      <aside className="rounded-xl border border-amber-300 bg-amber-50 p-4">
        All 31 operational entries remain read-only. Only two owned-development
        demonstration display settings can be configured by separately
        allowlisted testers. No production writes, secret values, infrastructure
        bindings, security policy changes or new staff authority.
      </aside>
      <section aria-label="Development display controls" className="space-y-4">
        <h2 className="text-xl font-semibold">Development display controls</h2>
        {available ? (
          <>
            <p>
              Consumer: the authorized{" "}
              <a className="underline" href="/dev/announcements">
                test announcement demonstration
              </a>
              . Each request resolves current server values; browser controls
              cannot change audience or publication eligibility.
            </p>
            <div className="grid min-w-0 gap-4 xl:grid-cols-2">
              {rows.map((row) => (
                <Editor
                  key={row.key}
                  row={row}
                  onSaved={async () => {
                    try {
                      return await refresh();
                    } catch (e) {
                      setMessage((e as Error).message);
                      throw e;
                    }
                  }}
                />
              ))}
            </div>
          </>
        ) : (
          <p>
            Configurable candidate unavailable in this environment or for this
            account. Read-only inventory remains available.
          </p>
        )}
        <p role="status">{message}</p>
      </section>
      <section
        className="space-y-4"
        aria-label="Read-only operational inventory"
      >
        <h2 className="text-xl font-semibold">
          Read-only operational inventory
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label>
            Search safe values and sources
            <input
              className={field}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <label>
            Setting group
            <select
              className={field}
              value={group}
              onChange={(e) => setGroup(e.target.value)}
            >
              {[
                "ALL",
                ...new Set(inventory.map((r) => r.id.split(".")[0])),
              ].map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="grid min-w-0 gap-4 xl:grid-cols-2">
          {shown.map((r) => (
            <article
              key={r.id}
              className="min-w-0 space-y-2 rounded-xl border bg-white p-5"
            >
              <h3 className="text-lg font-semibold">{r.label}</h3>
              <p className="break-words font-medium">{r.value}</p>
              <p className="text-xs font-semibold uppercase">
                Read-only · risk allocation proposed, not an authority grant
              </p>
              <dl className="space-y-2 text-sm text-slate-600">
                <dt className="font-semibold">Authoritative source</dt>
                <dd className="break-words">{r.source}</dd>
                <dt className="font-semibold">Type / impact</dt>
                <dd>
                  {r.type} · {r.impact}
                </dd>
                <dt className="font-semibold">
                  Future change classification (proposed)
                </dt>
                <dd>{r.future}</dd>
              </dl>
            </article>
          ))}
        </div>
        {!shown.length ? <p>No matching read-only settings.</p> : null}
      </section>
    </div>
  );
}

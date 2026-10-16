"use client";
import { useRef, useState } from "react";
import { MRTMap } from "./MRTMap";
import { network, stationLabel, type DatabaseStation } from "@/lib/mrt/network";
import { searchStations } from "@/lib/mrt/station-validation";

type Props = {
  stations: DatabaseStation[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  mode: "owner" | "borrower";
};
export function MRTStationSelector({
  stations,
  selectedIds,
  onChange,
  mode,
}: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState<number[]>([]);
  const [query, setQuery] = useState("");
  const [focus, setFocus] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const available = stations.filter(
    (s) =>
      s.operational &&
      s.canonicalId &&
      network.stations.some((n) => n.id === s.canonicalId),
  );
  const byCanonical = new Map(available.map((s) => [s.canonicalId!, s]));
  const borrower = mode === "borrower";
  function select(canonical: string) {
    const s = byCanonical.get(canonical);
    if (!s) return;
    setDraft((current) =>
      borrower
        ? [s.id]
        : current.includes(s.id)
          ? current.filter((id) => id !== s.id)
          : [...current, s.id],
    );
  }
  const selected = stations.filter((s) => selectedIds.includes(s.id));
  return (
    <div className="mrt-selector space-y-3">
      <button
        type="button"
        className="rounded-lg border border-emerald-700 px-4 py-3 text-emerald-900"
        onClick={() => {
          setDraft(
            selectedIds.filter((id) => available.some((s) => s.id === id)),
          );
          setQuery("");
          setFocus(null);
          dialog.current?.showModal();
        }}
      >
        {borrower ? "Choose meeting station" : "Choose pickup stations"}
      </button>
      {selected.length ? (
        <ul aria-label="Confirmed stations" className="space-y-2 text-sm">
          {selected.map((s) => (
            <li key={s.id}>
              {stationLabel(s)}{" "}
              {!borrower && (
                <button
                  type="button"
                  className="ml-2 underline"
                  aria-label={`Remove ${s.nameEn ?? s.name}`}
                  onClick={() =>
                    onChange(selectedIds.filter((id) => id !== s.id))
                  }
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-600">
          {borrower
            ? "Choose one owner-approved location. No station is selected yet."
            : "Choose at least one location for this listing."}
        </p>
      )}
      <dialog
        ref={dialog}
        className="mrt-dialog"
        aria-labelledby={`mrt-title-${mode}`}
        onClose={() => setFocus(null)}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id={`mrt-title-${mode}`} className="text-xl font-semibold">
            {borrower ? "Choose meeting station" : "Choose pickup stations"}
          </h2>
          <button
            type="button"
            aria-label="Close station map"
            onClick={() => dialog.current?.close()}
          >
            Close
          </button>
        </div>
        <p className="mb-3 text-sm">
          {borrower
            ? "Green locations are approved by this owner. Grey locations cannot be selected."
            : "Select the locations where you can hand off this item."}{" "}
          Stations are meeting areas. Agree on an exact exit or meeting point
          with the other participant.
        </p>
        <div className="mrt-workspace">
          <div>
            <MRTMap
              network={network}
              available={
                borrower
                  ? available.map((s) => s.canonicalId!)
                  : draft.flatMap(
                      (id) =>
                        available.find((s) => s.id === id)?.canonicalId ?? [],
                    )
              }
              choice={
                borrower
                  ? (available.find((s) => s.id === draft[0])?.canonicalId ??
                    null)
                  : null
              }
              borrower={borrower}
              onSelect={select}
              focus={focus}
              focusRevision={revision}
              onResetView={() => setFocus(null)}
            />
            <div className="my-2 flex flex-wrap gap-3 text-xs">
              {network.lines?.map((line) => (
                <span key={line.id} style={{ color: line.color }}>
                  {line.id} · {line.name}
                </span>
              ))}
            </div>
          </div>
          <div className="min-w-0">
            <label className="grid gap-1 text-sm">
              Search stations
              <input
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.preventDefault();
                }}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="English, 中文, or line code"
                className="mb-2 rounded border p-2"
              />
            </label>
            <p className="mb-2 text-sm" aria-live="polite">
              {draft.length} selected
            </p>
            <div
              className="mrt-station-list"
              aria-label="Searchable station alternative"
            >
              {searchStations(network, query).map((s) => {
                const db = byCanonical.get(s.id);
                return (
                  <div key={s.id} className="grid grid-cols-[1fr_auto] gap-1">
                    <button
                      type="button"
                      disabled={!db}
                      aria-pressed={!!db && draft.includes(db.id)}
                      onClick={() => select(s.id)}
                    >
                      {s.nameEn} · {s.nameZh} ·{" "}
                      {Object.values(s.codes).join(" / ")}
                      {!db ? " — unavailable" : ""}
                    </button>
                    <button
                      type="button"
                      aria-label={`Locate ${s.nameEn}`}
                      onClick={() => {
                        setFocus(s.id);
                        setRevision((r) => r + 1);
                      }}
                    >
                      Locate
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div className="sticky bottom-0 mt-3 flex items-center justify-between gap-3 bg-white py-3">
          <button type="button" onClick={() => setDraft([])}>
            Clear selection
          </button>
          <button
            type="button"
            disabled={!draft.length}
            className="rounded-lg bg-emerald-800 px-4 py-3 text-white disabled:opacity-40"
            onClick={() => {
              onChange(draft);
              dialog.current?.close();
            }}
          >
            {borrower ? "Confirm meeting station" : "Confirm availability"}
          </button>
        </div>
      </dialog>
    </div>
  );
}

"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { AdminPanel, AdminTitle } from "./ui";
import { MRTMap } from "../mrt/MRTMap";
import { network } from "@/lib/mrt/network";
import { searchStations } from "@/lib/mrt/station-validation";
import type { AdminLocations } from "@/lib/admin/locations";
export function AdminLocationsWorkspace({
  data,
  initialStation = "",
  initialLine = "",
  initialQuery = "",
  labAvailable = false,
}: {
  data: AdminLocations;
  initialStation?: string;
  initialLine?: string;
  initialQuery?: string;
  labAvailable?: boolean;
}) {
  const [q, setQ] = useState(initialQuery),
    [line, setLine] = useState(initialLine),
    [selected, setSelected] = useState(
      initialStation || data.stations[0]?.id || "",
    ),
    [status, setStatus] = useState("all");
  const visible = useMemo(() => {
    const ids = new Set(searchStations(network, q).map((s) => s.id));
    return data.stations.filter(
      (s) =>
        ids.has(s.id) &&
        (!line || Object.hasOwn(s.codes, line)) &&
        (status === "all" ||
          (status === "eligible" && s.globalHandoffEligible) ||
          (status === "blocked" && s.operational === false) ||
          (status === "missing" && s.operational === null)),
    );
  }, [data, q, line, status]);
  const station = data.stations.find((s) => s.id === selected);
  return (
    <div className="space-y-6">
      <AdminTitle
        title="MRT Locations"
        description="Explore authoritative Taipei MRT stations and recorded eligibility for new listing and booking station choices. This workspace is read-only; it does not report live service or station safety."
      />
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-white p-5">
        <p className="text-sm text-slate-600">
          Catalogue: {data.sourceStatus}
          {data.catalogueAsOf ? ` · ${data.catalogueAsOf}` : ""}. Station
          controls: read-only.
        </p>
        {labAvailable ? (
          <Link
            href="/admin/locations/lab"
            className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium"
          >
            Development Geofencing Test Lab
          </Link>
        ) : (
          <p className="text-sm text-slate-500">
            Development Test Lab unavailable in this environment or for this
            tester.
          </p>
        )}
      </div>
      <AdminPanel title="Find a station">
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="text-sm">
            Station name or code
            <input
              className="mt-1 block w-full rounded-lg border p-2"
              value={q}
              maxLength={100}
              onChange={(e) => setQ(e.target.value)}
            />
          </label>
          <label className="text-sm">
            MRT line
            <select
              aria-label="MRT line"
              className="mt-1 block w-full rounded-lg border p-2"
              value={line}
              onChange={(e) => setLine(e.target.value)}
            >
              <option value="">All lines</option>
              {data.lines.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} · {l.zh}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Recorded eligibility
            <select
              aria-label="Recorded eligibility"
              className="mt-1 block w-full rounded-lg border p-2"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="all">All records</option>
              <option value="eligible">Global flag permits station choices</option>
              <option value="blocked">Global flag prevents station choices</option>
              <option value="missing">No database mapping</option>
            </select>
          </label>
        </div>
      </AdminPanel>
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <AdminPanel title="Official network schematic">
          <p className="mb-4 text-sm text-slate-600">
            Map selection explores station details. It does not select a listing
            or booking station. Lines and walking transfers follow the official
            catalogue; this schematic is not a geofence map.
          </p>
          <MRTMap
            network={network}
            available={[]}
            choice={null}
            borrower={false}
            focus={selected || null}
            onSelect={setSelected}
          />
        </AdminPanel>
        <AdminPanel title="Exact station details">
          {station ? (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">
                {station.nameEn} · {station.nameZh}
              </h3>
              <p className="text-sm text-slate-600">
                Canonical ID: <span className="break-all">{station.id}</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(station.codes).map(([id, code]) => (
                  <span
                    key={id}
                    className="rounded-full bg-slate-100 px-3 py-1 text-sm"
                  >
                    {code} · {data.lines.find((l) => l.id === id)?.name ?? id}
                  </span>
                ))}
              </div>
              <p className="rounded-lg bg-slate-50 p-3 text-sm">
                {station.operational === null
                  ? "Operational flag: not recorded (station not mapped in database)."
                  : `Persisted operational flag: ${String(station.operational)}. ${station.operational ? "Global policy permits this station for new listing/booking choices." : "Global policy prevents this station for new listing/booking choices."}`}
              </p>
              <p className="text-sm text-slate-600">
                {station.latitude === null || station.longitude === null
                  ? "Validated station coordinates are unavailable. Genuine station GPS checks cannot verify arrival from missing coordinates."
                  : "Validated station coordinates are available in the official catalogue snapshot."}
              </p>
              <p className="text-sm">
                Owners still choose their offered stations. Borrowers may choose
                only an offered, globally eligible station under server booking
                validation. This is not availability for a specific booking.
              </p>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-slate-500">Station geofence radius</dt>
                  <dd>{station.policy.radiusMeters} m</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Maximum accuracy error</dt>
                  <dd>{station.policy.maxAccuracyMeters} m</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Sample freshness</dt>
                  <dd>{station.policy.freshnessMs / 1000} seconds</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Persisted station ID</dt>
                  <dd>{station.databaseId ?? "Not recorded"}</dd>
                </div>
              </dl>
              <p className="text-sm text-slate-600">
                Closure reasons, safety incidents and suspension/review history
                are not recorded by the current station model. Suspension,
                restoration and geofencing edits are unavailable pending a
                separate authorized implementation.
              </p>
              {labAvailable ? (
                <Link
                  href={`/admin/locations/lab?station=${encodeURIComponent(station.id)}`}
                  className="inline-block rounded-lg bg-slate-950 px-4 py-2 text-sm text-white"
                >
                  Explore this station in the isolated Lab
                </Link>
              ) : null}
            </div>
          ) : (
            <p>No official station selected.</p>
          )}
        </AdminPanel>
      </div>
      <AdminPanel title="Station directory">
        <p className="mb-4 text-sm text-slate-600">
          {visible.length} matching catalogue stations. Interchanges appear once
          with all of their line codes.
        </p>
        {!visible.length ? (
          <p role="status">No stations match these filters.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((s) => (
              <li key={s.id}>
                <button
                  onClick={() => setSelected(s.id)}
                  aria-pressed={selected === s.id}
                  className={`h-full w-full rounded-xl border p-4 text-left text-sm ${selected === s.id ? "border-emerald-600 bg-emerald-50" : "border-slate-200 hover:bg-slate-50"}`}
                >
                  <span className="block font-medium">
                    {s.nameEn} · {s.nameZh}
                  </span>
                  <span className="mt-1 block text-xs text-slate-500">
                    {Object.values(s.codes).join(" / ")}
                  </span>
                  <span className="mt-2 block text-xs">
                    {s.operational === null
                      ? "Operational status not recorded"
                      : s.operational
                        ? "Station-choice flag: permitted"
                        : "Station-choice flag: prevented"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </AdminPanel>
    </div>
  );
}

"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AdminPanel, AdminTitle } from "./ui";
import type { AdminLocations } from "@/lib/admin/locations";
import {
  plotPoint,
  pointFromMeters,
  type Point,
} from "@/lib/geofencing-lab/geometry";
type Status = {
  labId: string;
  expiresAt: string;
  centreMode: "station" | "map" | "device" | "expired";
  centreExpiresAt: string | null;
  classification: "TEST_LOCATION";
  arrivalVerified: false;
};
type Sample = Point & { accuracy: number; timestamp: number };
type Result = {
  sampleOutcome: string;
  reason: string;
  accuracyMeters: number;
  distanceBand: number | null;
  classification: "TEST_LOCATION";
  arrivalVerified: false;
};
const button =
  "rounded-lg bg-emerald-700 px-4 py-2 text-sm text-white disabled:opacity-50";
export function GeofencingLab({
  data,
  initialStation = "",
}: {
  data: AdminLocations;
  initialStation?: string;
}) {
  const [stationId, setStationId] = useState(
      initialStation || data.stations[0].id,
    ),
    [consent, setConsent] = useState(false),
    [duration, setDuration] = useState(900),
    [lab, setLab] = useState<Status | null>(null),
    [centre, setCentre] = useState<Point | null>(null),
    [sample, setSample] = useState<Sample | null>(null),
    [accuracy, setAccuracy] = useState(10),
    [age, setAge] = useState(0),
    [selection, setSelection] = useState<"sample" | "centre">("sample"),
    [result, setResult] = useState<Result | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  const labRef = useRef<string | null>(null),
    alive = useRef(true),
    consentRef = useRef(false);
  const station = data.stations.find((s) => s.id === stationId)!,
    official =
      typeof station.latitude === "number" &&
      typeof station.longitude === "number"
        ? { latitude: station.latitude, longitude: station.longitude }
        : null,
    target = centre ?? official,
    policy = station.policy;
  async function command<T>(op: string, body: object): Promise<T> {
    const r = await fetch("/api/admin/locations/lab/" + op, {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const d = await r.json();
    if (!r.ok) throw Error(d.error ?? "Lab unavailable");
    return d;
  }
  function clear() {
    setCentre(null);
    setSample(null);
    setResult(null);
  }
  async function run(work: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    setResult(null);
    try {
      await work();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lab unavailable");
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    alive.current = true;
    const end = () => {
      if (labRef.current)
        void fetch("/api/admin/locations/lab/revoke", {
          method: "POST",
          keepalive: true,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ labId: labRef.current }),
        }).catch(() => {});
      labRef.current = null;
    };
    window.addEventListener("pagehide", end);
    return () => {
      alive.current = false;
      window.removeEventListener("pagehide", end);
      end();
    };
  }, []);
  useEffect(() => {
    if (!lab) return;
    const timer = setInterval(() => {
      if (
        Date.now() >=
        Math.min(
          Date.parse(lab.expiresAt),
          lab.centreExpiresAt ? Date.parse(lab.centreExpiresAt) : Infinity,
        )
      ) {
        setCentre(null);
        setSample(null);
        setResult(null);
        setNotice(
          "TEST_LOCATION expired. Start a new consented Lab session or revoke.",
        );
        setLab(null);
        labRef.current = null;
      }
    }, 250);
    return () => clearInterval(timer);
  }, [lab]);
  async function setTestCentre(point: Point, mode: "map" | "device") {
    if (!lab || !consent)
      throw Error("Start an explicitly consented Lab session first.");
    const next = await command<Status>("centre", {
      labId: lab.labId,
      mode,
      ...point,
      consent: true,
      durationSeconds: duration,
    });
    if (!alive.current || !consentRef.current || labRef.current !== lab.labId)
      return;
    setLab(next);
    setCentre(point);
    setSample(null);
    setNotice(
      "Temporary TEST_LOCATION centre set for this browser only. No booking or station was changed.",
    );
  }
  async function device(asCentre: boolean) {
    if (!consent || !lab)
      throw Error(
        "Explicit self-device consent and an active Lab are required.",
      );
    if (!navigator.geolocation)
      throw Error("Geolocation unavailable. Use the synthetic map sample.");
    const location = await new Promise<GeolocationPosition>((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(
        resolve,
        () =>
          reject(
            Error(
              "Device location denied or unavailable. No reading was retained.",
            ),
          ),
        { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 },
      ),
    );
    if (!alive.current || !consentRef.current || labRef.current !== lab.labId)
      return;
    const point = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
    if (asCentre) await setTestCentre(point, "device");
    else {
      setSample({
        ...point,
        accuracy: location.coords.accuracy,
        timestamp: location.timestamp,
      });
      setAccuracy(location.coords.accuracy);
      setAge(0);
      setNotice(
        "Self-device sample captured on demand. Evaluate it before it becomes stale.",
      );
    }
  }
  const span = Math.max(500, policy.radiusMeters * 2),
    scale = 200 / span;
  const marker = sample && target ? plotPoint(sample, target) : null;
  return (
    <div className="space-y-6">
      <AdminTitle
        title="Geofencing Test Lab"
        description="Owned development only · TEST_LOCATION · exploration is never arrival verification or a booking handoff."
      />
      <p className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm">
        This Lab has no connection to QR issuance, participant consent, custody
        or booking verification. Only your consenting browser location or an
        explicitly synthetic map point may be used. No real participant location
        is spoofed. Closing this page requests revocation; server expiry also
        removes temporary coordinates.
      </p>
      <Link href="/admin/locations" className="inline-block text-sm underline">
        Back to MRT Locations
      </Link>
      <AdminPanel title="Explicit self-device consent">
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => {
              const checked = e.target.checked;
              consentRef.current = checked;
              setConsent(checked);
              if (!checked) {
                const id = labRef.current;
                labRef.current = null;
                setLab(null);
                clear();
                setNotice("Consent withdrawn. Local samples cleared.");
                if (id)
                  void command("revoke", { labId: id }).catch(() =>
                    setError(
                      "Revocation audit/request unavailable. Local location cleared; server expiry remains authoritative.",
                    ),
                  );
              }
            }}
            className="mt-1"
          />
          I consent to my own browser/device location being used temporarily for
          TEST_LOCATION only. This does not establish arrival at an MRT station.
        </label>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="text-sm">
            Maximum temporary duration
            <select
              aria-label="Maximum temporary duration"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="mt-1 block rounded-lg border p-2"
            >
              <option value={300}>5 minutes</option>
              <option value={900}>15 minutes</option>
              <option value={3600}>1 hour</option>
            </select>
          </label>
          <button
            className={button}
            disabled={busy || !consent}
            onClick={() =>
              void run(async () => {
                const next = await command<Status>("start", {
                  consent: true,
                  durationSeconds: duration,
                });
                if (!alive.current || !consentRef.current) {
                  void command("revoke", { labId: next.labId }).catch(() => {});
                  return;
                }
                labRef.current = next.labId;
                setLab(next);
                clear();
                setNotice(
                  "Consented TEST_LOCATION session started. No GPS was requested yet.",
                );
              })
            }
          >
            Start consented Lab
          </button>
          <button
            className="rounded-lg border px-4 py-2 text-sm disabled:opacity-50"
            disabled={busy || !lab}
            onClick={() =>
              void run(async () => {
                await command("revoke", { labId: lab!.labId });
                labRef.current = null;
                setLab(null);
                clear();
                setNotice(
                  "TEST_LOCATION revoked. Temporary coordinates removed.",
                );
              })
            }
          >
            Revoke and clear
          </button>
        </div>
        <p className="mt-4 text-sm text-slate-600">
          {lab
            ? `Browser-bound Lab expires ${new Date(lab.expiresAt).toLocaleString("en-US", { timeZone: "Asia/Taipei" })} (Asia/Taipei).`
            : "No active consented Lab."}{" "}
          Device binding is a private browser cookie, not a claim of verified
          hardware identity.
        </p>
      </AdminPanel>
      <div className="grid items-start gap-6 xl:grid-cols-2">
        <AdminPanel title="Station and temporary centre">
          <label className="block text-sm">
            Official station
            <select
              aria-label="Official station"
              disabled={busy}
              value={stationId}
              onChange={(e) => {
                setStationId(e.target.value);
                setSample(null);
                setResult(null);
              }}
              className="mt-1 block w-full rounded-lg border p-2"
            >
              {data.stations.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nameEn} · {s.nameZh} · {Object.values(s.codes).join(" / ")}
                </option>
              ))}
            </select>
          </label>
          <p className="mt-4 text-sm">
            Current centre:{" "}
            {centre
              ? "Temporary self/test centre — TEST_LOCATION"
              : "Official station coordinate — Lab sample only"}
            .
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              className={button}
              disabled={busy || !lab || !consent}
              onClick={() => void run(() => device(true))}
            >
              Use my current location as temporary test centre
            </button>
            <button
              className="rounded-lg border px-4 py-2 text-sm disabled:opacity-50"
              disabled={busy || !lab || !consent}
              onClick={() =>
                void run(async () => {
                  const next = await command<Status>("centre", {
                    labId: lab!.labId,
                    mode: "station",
                    consent: true,
                    durationSeconds: duration,
                  });
                  setLab(next);
                  clear();
                  setNotice(
                    "Official station centre explicitly selected for Lab calculations only.",
                  );
                })
              }
            >
              Use station centre
            </button>
          </div>
          <p className="mt-4 text-xs text-slate-500">
            No coordinates enter application logs, audit content, URLs or
            browser storage. A worker restart loses temporary state and fails
            closed. Audit records contain only the action, public station
            reference, consent and coarse policy outcome.
          </p>
        </AdminPanel>
        <AdminPanel title="Applicable policy">
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt>Radius</dt>
              <dd>{policy.radiusMeters} m</dd>
            </div>
            <div>
              <dt>Maximum accuracy error</dt>
              <dd>{policy.maxAccuracyMeters} m</dd>
            </div>
            <div>
              <dt>Freshness</dt>
              <dd>{policy.freshnessMs / 1000} seconds</dd>
            </div>
            <div>
              <dt>Boundary rule</dt>
              <dd>Distance + accuracy ≤ radius</dd>
            </div>
          </dl>
          <p className="mt-4 text-sm text-slate-600">
            Interchange radii and server overrides come from the existing meetup
            location policy. The Lab cannot edit them. Persisted operational
            status does not imply a live closure feed or permission to choose a
            booking station.
          </p>
        </AdminPanel>
      </div>
      <AdminPanel title="North-up geographic boundary plot">
        <p className="mb-4 text-sm text-slate-600">
          Local metric visualization with no external map tiles. The circle is
          the current station/temporary geofence. Pointer selection is
          synthetic; coordinates stay temporary. Use the station directory for
          official network navigation.
        </p>
        <div className="mb-4 flex flex-wrap gap-4">
          <label className="text-sm">
            Map selection
            <select
              aria-label="Map selection"
              value={selection}
              onChange={(e) =>
                setSelection(e.target.value as "sample" | "centre")
              }
              className="ml-2 rounded border p-2"
            >
              <option value="sample">Synthetic sample point</option>
              <option value="centre">Temporary test centre</option>
            </select>
          </label>
          <button
            className="rounded border px-3 py-2 text-sm"
            disabled={!lab || busy || !target}
            onClick={() => {
              if (target) {
                setSample({
                  ...target,
                  accuracy,
                  timestamp: Date.now() - age * 1000,
                });
                setResult(null);
              }
            }}
          >
            Place sample at centre
          </button>
        </div>
        {target ? (
          <svg
            role="img"
            aria-label="Geographic geofence plot"
            viewBox="0 0 440 440"
            className="mx-auto w-full max-w-xl rounded-xl border bg-slate-50"
            onClick={(e) => {
              if (!lab || !consent || busy) return;
              const box = e.currentTarget.getBoundingClientRect(),
                x = ((e.clientX - box.left) / box.width) * 440,
                y = ((e.clientY - box.top) / box.height) * 440,
                p = pointFromMeters(
                  (x - 220) / scale,
                  (220 - y) / scale,
                  target,
                );
              if (selection === "centre")
                void run(() => setTestCentre(p, "map"));
              else {
                setSample({
                  ...p,
                  accuracy,
                  timestamp: Date.now() - age * 1000,
                });
                setResult(null);
              }
            }}
          >
            <title>
              TEST_LOCATION only. Use the accessible sample controls below for
              exact boundaries.
            </title>
            <path d="M220 15V425M15 220H425" stroke="#cbd5e1" />
            <circle
              cx="220"
              cy="220"
              r={policy.radiusMeters * scale}
              fill="#d1fae5"
              stroke="#047857"
              strokeWidth="2"
            />
            <circle cx="220" cy="220" r="4" fill="#0f172a" />
            <text x="225" y="205" fontSize="12">
              Centre
            </text>
            <text x="225" y="25" fontSize="12">
              N
            </text>
            <path d="M20 405H120 M20 400V410 M120 400V410" stroke="#334155" />
            <text x="20" y="430" fontSize="12">
              {span / 2} m scale
            </text>
            {marker &&
            Math.abs(marker.east * scale) < 210 &&
            Math.abs(marker.north * scale) < 210 ? (
              <circle
                data-testid="lab-sample-marker"
                cx={220 + marker.east * scale}
                cy={220 - marker.north * scale}
                r="6"
                fill="#be123c"
              />
            ) : null}
          </svg>
        ) : (
          <p>Validated station coordinates are unavailable.</p>
        )}
        {marker &&
        (Math.abs(marker.east * scale) >= 210 ||
          Math.abs(marker.north * scale) >= 210) ? (
          <p className="mt-3 text-sm">
            Sample is outside this plot. Policy evaluation still uses its actual
            distance.
          </p>
        ) : null}
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <label className="text-sm">
            Sample accuracy (metres)
            <input
              type="number"
              min="0"
              max="100000"
              value={accuracy}
              className="mt-1 block w-full rounded border p-2"
              onChange={(e) => {
                setAccuracy(Number(e.target.value));
                setResult(null);
                if (sample)
                  setSample({ ...sample, accuracy: Number(e.target.value) });
              }}
            />
          </label>
          <label className="text-sm">
            Synthetic sample age (seconds)
            <input
              type="number"
              min="0"
              max="600"
              value={age}
              className="mt-1 block w-full rounded border p-2"
              onChange={(e) => {
                setAge(Number(e.target.value));
                setResult(null);
                if (sample)
                  setSample({
                    ...sample,
                    timestamp: Date.now() - Number(e.target.value) * 1000,
                  });
              }}
            />
          </label>
          <label className="text-sm">
            Synthetic north offset (metres)
            <input
              aria-label="Synthetic north offset (metres)"
              type="number"
              defaultValue="0"
              className="mt-1 block w-full rounded border p-2"
              onChange={(e) => {
                if (target) {
                  setSample({
                    ...pointFromMeters(0, Number(e.target.value), target),
                    accuracy,
                    timestamp: Date.now() - age * 1000,
                  });
                  setResult(null);
                }
              }}
            />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            className={button}
            disabled={busy || !lab || !consent}
            onClick={() => void run(() => device(false))}
          >
            Capture my current sample
          </button>
          <button
            className={button}
            disabled={busy || !lab || !sample || !consent}
            onClick={() =>
              void run(async () => {
                const next = await command<Result>("evaluate", {
                  labId: lab!.labId,
                  stationId,
                  sample,
                });
                if (
                  alive.current &&
                  consentRef.current &&
                  labRef.current === lab!.labId
                )
                  setResult(next);
              })
            }
          >
            Evaluate TEST_LOCATION sample
          </button>
        </div>
      </AdminPanel>
      {result ? (
        <section
          role="status"
          className="rounded-2xl border border-amber-300 bg-amber-50 p-5"
        >
          <h2 className="text-xl font-semibold">
            TEST_LOCATION · {result.sampleOutcome}
          </h2>
          <p className="mt-2">
            {result.reason}. Accuracy: {result.accuracyMeters} m
            {result.distanceBand === null
              ? ""
              : `; distance rounded up to 100 m: ${result.distanceBand} m`}
            .
          </p>
          <p className="mt-2 font-medium">
            This is a Lab calculation. Arrival verified: no. No booking, GPS
            evidence, QR challenge or station record was changed.
          </p>
        </section>
      ) : null}
      {notice ? (
        <p role="status" className="rounded-xl bg-slate-100 p-4 text-sm">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p
          role="alert"
          className="rounded-xl bg-red-50 p-4 text-sm text-red-900"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

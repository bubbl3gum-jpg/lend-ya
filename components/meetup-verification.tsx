"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { IScannerControls } from "@zxing/browser";
type Check = {
  id: number;
  userId: number;
  outcome: string;
  reason: string;
  expiresAt: string;
};
type State = {
  enabled: boolean;
  canEnroll?: boolean;
  temporaryLocation?: {
    allowed: boolean;
    active: {
      generation: string;
      expiresAt: string;
      acknowledged: boolean;
      bothAcknowledged: boolean;
    } | null;
  } | null;
  purpose?: "PICKUP" | "RETURN";
  bookingStatus?: string;
  station?: { name: string; radiusMeters: number };
  checks?: { owner: Check | null; borrower: Check | null };
  fallback?: {
    ownerAckAt: string | null;
    borrowerAckAt: string | null;
    ownerReason: string | null;
    borrowerReason: string | null;
  } | null;
  challenge?: {
    id: string;
    expiresAt: string;
    consumedAt: string | null;
    confirmationExpiresAt: string | null;
    confirmationEligible: boolean;
    completedAt: string | null;
    verifierId: number;
  } | null;
};
export function MeetupVerification({
  bookingId,
  userId,
  isOwner,
  bookingStatus,
  onState,
}: {
  bookingId: number;
  userId: number;
  isOwner: boolean;
  bookingStatus: string;
  onState: (enabled: boolean, proof: string | null) => void;
}) {
  const router = useRouter(),
    [data, setData] = useState<State | null>(null),
    [error, setError] = useState(""),
    [feedback, setFeedback] = useState(""),
    [busy, setBusy] = useState(false),
    [reason, setReason] = useState(""),
    [fallbackAck, setFallbackAck] = useState(false),
    [simulationAck, setSimulationAck] = useState(false),
    [physical, setPhysical] = useState(false),
    [code, setCode] = useState(""),
    [issued, setIssued] = useState<{
      challengeId: string;
      image: string;
      code: string;
      expiresAt: string;
    } | null>(null),
    [clock, setClock] = useState(0),
    [camera, setCamera] = useState(false),
    [assistanceReason, setAssistanceReason] = useState("LOCATION_PROBLEM");
  const phaseRef = useRef<string | undefined>(undefined);
  const cameraGeneration = useRef(0);
  const issueRetry = useRef<string | null>(null);
  const video = useRef<HTMLVideoElement>(null),
    controls = useRef<IScannerControls | null>(null),
    scanBusy = useRef(false),
    verifyRetry = useRef<{ signature: string; key: string } | null>(null),
    arrivalRetry = useRef<{
      body: Record<string, unknown>;
      key: string;
    } | null>(null);
  const api = useCallback(
    async (operation: string, body?: object) => {
      const r = await fetch(`/api/bookings/${bookingId}/meetup/${operation}`, {
        method: body ? "POST" : "GET",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      const result = await r.json();
      if (!r.ok)
        throw Error(result.error ?? "Verification could not be completed.");
      return result;
    },
    [bookingId],
  );
  const load = useCallback(async () => {
    const value = (await api("status")) as State;
    if (phaseRef.current && phaseRef.current !== value.purpose) {
      setIssued(null);
      setCode("");
      setFeedback("");
      setPhysical(false);
      setFallbackAck(false);
      issueRetry.current = null;
      verifyRetry.current = null;
      arrivalRetry.current = null;
    }
    phaseRef.current = value.purpose;
    setData(value);
    setClock(Date.now());
    if (value.enabled && value.bookingStatus !== bookingStatus)
      router.refresh();
    const c = value.challenge;
    onState(
      value.enabled,
      c?.verifierId === userId &&
        c.consumedAt &&
        c.confirmationEligible &&
        !c.completedAt &&
        Date.parse(c.confirmationExpiresAt ?? "") > Date.now()
        ? c.id
        : null,
    );
  }, [api, onState, userId, bookingStatus, router]);
  const invalidateCamera = useCallback(() => {
    cameraGeneration.current++;
    controls.current?.stop();
  }, []);
  useEffect(() => {
    void Promise.resolve()
      .then(load)
      .catch((e) => setError(e.message));
    const timer = setInterval(() => {
      setClock(Date.now());
      void load().catch((e) => setError(e.message));
    }, 3000);
    return () => {
      clearInterval(timer);
      invalidateCamera();
    };
  }, [load, invalidateCamera]);
  async function perform(work: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await work();
      await load();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Verification unavailable. Retry online or request assistance.",
      );
    } finally {
      setBusy(false);
    }
  }
  const p = data?.purpose ?? "PICKUP",
    label = p === "PICKUP" ? "Pickup" : "Return",
    canIssue = p === "PICKUP" ? isOwner : !isOwner,
    active = [
      "CONFIRMED",
      "HANDOFF_PENDING",
      "IN_USE",
      "RETURN_PENDING",
    ].includes(data?.bookingStatus ?? "");
  async function submitArrival(body: Record<string, unknown>) {
    const saved = arrivalRetry.current;
    const signature = JSON.stringify(body);
    if (!saved || JSON.stringify(saved.body) !== signature)
      arrivalRetry.current = { body, key: crypto.randomUUID() };
    const retry = arrivalRetry.current!;
    await api("checkin", { purpose: p, ...retry.body, requestKey: retry.key });
    arrivalRetry.current = null;
    setFeedback(
      data?.temporaryLocation?.active
        ? "TEST_LOCATION reading saved: simulated meetup, not arrival at the real MRT station."
        : "Arrival reading saved. This is a supporting signal, not proof against spoofing.",
    );
  }
  async function setTemporaryLocation() {
    await perform(async () => {
      if (!simulationAck)
        throw Error("Acknowledge the simulated meetup first.");
      if (!window.isSecureContext || !navigator.geolocation)
        throw Error("Browser geolocation requires HTTPS or localhost.");
      const position = await new Promise<GeolocationPosition>(
        (resolve, reject) =>
          navigator.geolocation.getCurrentPosition(
            resolve,
            () =>
              reject(
                Error("Location permission denied or reading unavailable."),
              ),
            { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 },
          ),
      );
      await api("test-location", {
        action: "create",
        acknowledged: true,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp,
      });
      setSimulationAck(false);
      setIssued(null);
    });
  }
  async function arrive() {
    await perform(async () => {
      if (arrivalRetry.current) {
        await submitArrival(arrivalRetry.current.body);
        return;
      }
      if (!window.isSecureContext || !navigator.geolocation) {
        await submitArrival({ mode: "unavailable", reason: "UNSUPPORTED" });
        return;
      }
      await new Promise<void>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(
          (position) => {
            void submitArrival({
              mode: "location",
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              timestamp: position.timestamp,
            }).then(resolve, reject);
          },
          (geo) => {
            void submitArrival({
              mode: "unavailable",
              reason:
                geo.code === 1
                  ? "DENIED"
                  : geo.code === 3
                    ? "TIMEOUT"
                    : "UNAVAILABLE",
            }).then(resolve, reject);
          },
          { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 },
        ),
      );
    });
  }
  function stopCamera() {
    invalidateCamera();
    setCamera(false);
  }
  async function verify(
    value: { qrPayload?: string; manualCode?: string },
    challengeId: string,
  ) {
    stopCamera();
    const signature = JSON.stringify({ purpose: p, challengeId, ...value });
    if (verifyRetry.current?.signature !== signature)
      verifyRetry.current = { signature, key: crypto.randomUUID() };
    const result = await api("verify", {
      purpose: p,
      challengeId,
      ...value,
      requestKey: verifyRetry.current.key,
    });
    verifyRetry.current = null;
    setFeedback(
      `${result.assurance === "TEST_LOCATION" ? "TEST_LOCATION — simulated meetup, not real station arrival." : "Verified"} booking #${bookingId}: ${result.itemTitle}. Inspect the equipment and record your own condition and physical receipt acknowledgement.`,
    );
    await load();
  }
  async function scan() {
    await perform(async () => {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia)
        throw Error(
          "Camera scanning needs HTTPS or localhost and a supported browser. Use the one-time manual code.",
        );
      const generation = ++cameraGeneration.current;
      setCamera(true);
      await new Promise((r) => setTimeout(r, 0));
      const { BrowserQRCodeReader } = await import("@zxing/browser");
      try {
        controls.current =
          await new BrowserQRCodeReader().decodeFromConstraints(
            { video: { facingMode: "environment" }, audio: false },
            video.current!,
            (result, _error, scanner) => {
              if (generation !== cameraGeneration.current) {
                scanner.stop();
                return;
              }
              if (!result || scanBusy.current) return;
              scanBusy.current = true;
              scanner.stop();
              controls.current?.stop();
              setCamera(false);
              const payload = result.getText(),
                parts = payload.split(":");
              void perform(async () => {
                if (
                  parts.length !== 5 ||
                  parts[0] !== "HUSTLEN1" ||
                  parts[1] !== String(bookingId) ||
                  parts[2] !== p
                )
                  throw Error("This QR does not match this booking and stage.");
                await verify({ qrPayload: payload }, parts[3]);
              }).finally(() => {
                scanBusy.current = false;
              });
            },
          );
        if (generation !== cameraGeneration.current) controls.current.stop();
      } catch {
        stopCamera();
        throw Error(
          "Camera unavailable or permission denied. Use the one-time manual code.",
        );
      }
    });
  }
  const button = "rounded-xl border px-4 py-2 text-sm disabled:opacity-50";
  if (!data)
    return error ? (
      <p role="alert">
        {error}{" "}
        <Link className="underline" href="/customer-service">
          Customer Service and reporting options
        </Link>
      </p>
    ) : null;
  if (!data.enabled && !data.canEnroll) return null;
  const proof =
    data.challenge?.verifierId === userId &&
    data.challenge.consumedAt &&
    data.challenge.confirmationEligible &&
    !data.challenge.completedAt &&
    Date.parse(data.challenge.confirmationExpiresAt ?? "") > clock
      ? data.challenge.id
      : null;
  return (
    <section
      className="space-y-3 rounded-2xl border border-blue-200 p-4"
      aria-label="MRT meetup verification"
    >
      <h2 className="text-lg font-semibold">
        MRT pickup and return verification · isolated preview
      </h2>
      {!data.enabled ? (
        <>
          <p>
            Opting in makes arrival checks and separate receipt verification
            mandatory for this booking. Existing bookings are not enrolled
            automatically.
          </p>
          <button
            className={button}
            disabled={busy}
            onClick={() =>
              void perform(async () => {
                await api("enroll", {});
                router.refresh();
              })
            }
          >
            Enable isolated meetup preview
          </button>
        </>
      ) : (
        <>
          <p>
            {label} · agreed station: {data.station?.name}. Pickup and return
            currently use the same agreed booking station; a different return
            station is not supported.
          </p>
          <p className="text-sm">
            Use an agreed exit or meeting point. GPS can be poor underground or
            spoofed; this is not proof of presence. No shared Wi-Fi or network
            is required.
          </p>
          {active && data.temporaryLocation?.allowed && (
            <fieldset className="space-y-2 rounded border border-amber-500 p-3">
              <legend>Temporary local meetup · TEST_LOCATION</legend>
              <p>
                This is a simulated meetup, not arrival at the real MRT station.
                The agreed station stays unchanged. Both participants must
                acknowledge and then check in using fresh device locations.
                Existing checklists and physical receipt confirmations remain
                mandatory.
              </p>
              {data.temporaryLocation.active ? (
                <>
                  <p>
                    Expires{" "}
                    {new Date(
                      data.temporaryLocation.active.expiresAt,
                    ).toLocaleTimeString()}
                    .{" "}
                    {data.temporaryLocation.active.bothAcknowledged
                      ? "Both participants acknowledged."
                      : "Waiting for both participants to acknowledge."}
                  </p>
                  {!data.temporaryLocation.active.acknowledged && (
                    <button
                      className={button}
                      disabled={busy}
                      onClick={() =>
                        void perform(async () => {
                          await api("test-location", {
                            action: "acknowledge",
                            acknowledged: true,
                            generation:
                              data.temporaryLocation!.active!.generation,
                          });
                        })
                      }
                    >
                      I acknowledge this simulated meetup, not arrival at the
                      real MRT station
                    </button>
                  )}
                  <button
                    className={button}
                    disabled={busy}
                    onClick={() =>
                      void perform(async () => {
                        await api("test-location", { action: "revoke" });
                        setIssued(null);
                      })
                    }
                  >
                    Revoke temporary test location and erase centre
                  </button>
                </>
              ) : (
                <>
                  <label className="block">
                    <input
                      type="checkbox"
                      checked={simulationAck}
                      onChange={(e) => setSimulationAck(e.target.checked)}
                    />{" "}
                    I acknowledge this is a simulated meetup, not arrival at the
                    real MRT station.
                  </label>
                  <button
                    className={button}
                    disabled={busy || !simulationAck}
                    onClick={() => void setTemporaryLocation()}
                  >
                    Use my current location as a temporary test meetup
                  </button>
                </>
              )}
            </fieldset>
          )}
          {data.checks &&
            [data.checks.owner, data.checks.borrower].map((c, n) => (
              <p key={n}>
                {n === 0 ? "Owner" : "Borrower"}:{" "}
                {c
                  ? `${c.outcome === "TEST_LOCATION" ? "TEST_LOCATION — simulated meetup, not real station arrival" : c.outcome === "VERIFIED" ? "Location verified" : c.outcome === "INACCURATE" ? "Location inaccurate" : c.outcome === "OUTSIDE" ? "Location outside accepted area" : "Location unavailable"} · ${Date.parse(c.expiresAt) <= clock ? "check-in validity elapsed; an existing valid scan keeps its separate confirmation window" : `valid until ${new Date(c.expiresAt).toLocaleTimeString()}`}`
                  : "Not checked in"}
              </p>
            ))}
          {active && (
            <>
              <button
                className={button}
                disabled={busy}
                onClick={() => void arrive()}
              >
                I&apos;ve Arrived
              </button>
              <button
                className={button}
                disabled={busy}
                onClick={() =>
                  void perform(async () => {
                    await submitArrival({
                      mode: "unavailable",
                      reason: "UNAVAILABLE",
                    });
                  })
                }
              >
                Location unavailable — record this honestly
              </button>
              <fieldset className="space-y-2 rounded border p-3">
                <legend>
                  Reduced-assurance fallback · location NOT verified
                </legend>
                <p>
                  Available only after both participants have fresh checks and
                  at least one location is unavailable/inaccurate. Both must
                  acknowledge independently; an outside-area result needs a new
                  check or assistance.
                </p>
                <label className="block">
                  Fallback reason
                  <textarea
                    className="block w-full rounded border p-2"
                    maxLength={500}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </label>
                <label className="flex gap-2">
                  <input
                    type="checkbox"
                    checked={fallbackAck}
                    onChange={(e) => setFallbackAck(e.target.checked)}
                  />
                  I acknowledge that location is not verified and want to
                  proceed at reduced assurance.
                </label>
                <button
                  className={button}
                  disabled={busy || !fallbackAck || reason.trim().length < 5}
                  onClick={() =>
                    void perform(async () => {
                      await api("fallback", {
                        purpose: p,
                        reason,
                        acknowledged: true,
                      });
                      setFeedback(
                        "Your reduced-assurance acknowledgement is recorded. Both participants must acknowledge.",
                      );
                    })
                  }
                >
                  Record my reduced-assurance acknowledgement
                </button>
                <p>
                  Owner acknowledgement:{" "}
                  {data.fallback?.ownerAckAt ? "recorded" : "pending"}; Borrower
                  acknowledgement:{" "}
                  {data.fallback?.borrowerAckAt ? "recorded" : "pending"}.
                </p>
              </fieldset>
              {canIssue ? (
                <>
                  <p>
                    First save your{" "}
                    {p === "PICKUP" ? "owner handoff" : "borrower return"}{" "}
                    condition evidence below. Then generate a short-lived
                    challenge.
                  </p>
                  <button
                    className={button}
                    disabled={busy}
                    onClick={() =>
                      void perform(async () => {
                        issueRetry.current ??= crypto.randomUUID();
                        const r = await api("issue", {
                          purpose: p,
                          requestKey: issueRetry.current,
                        });
                        if (r.secretUnavailable) {
                          issueRetry.current = null;
                          throw Error(
                            "The original challenge was issued, but its secret response was lost. Tap Renew again to revoke it and create a new one.",
                          );
                        }
                        const QR = await import("qrcode");
                        setIssued({
                          challengeId: r.challengeId,
                          image: await QR.toDataURL(r.qrPayload, {
                            width: 280,
                            margin: 3,
                          }),
                          code: r.manualCode,
                          expiresAt: r.expiresAt,
                        });
                        issueRetry.current = null;
                        setFeedback(
                          "New challenge generated. Any previous challenge was revoked.",
                        );
                      })
                    }
                  >
                    {data.challenge
                      ? `Renew ${label} QR`
                      : `Generate ${label} QR`}
                  </button>
                  {issued && (
                    <div className="space-y-2">
                      <Image
                        unoptimized
                        src={issued.image}
                        alt={`${label} one-time verification QR`}
                        width={280}
                        height={280}
                      />
                      <p>
                        One-time manual code: <strong>{issued.code}</strong>
                      </p>
                      <p>
                        {data.challenge?.id === issued.challengeId &&
                        data.challenge.consumedAt
                          ? "QR redeemed. The recipient has a separate confirmation window; renewing revokes that proof."
                          : Date.parse(issued.expiresAt) <= clock
                            ? "Expired — renew the challenge. Your draft is preserved."
                            : `QR scanning deadline ${new Date(issued.expiresAt).toLocaleTimeString()}`}
                      </p>
                      <p>
                        Show only to the intended participant. A screenshot can
                        be copied; security comes from participant, expiry and
                        one-time server checks. Refresh removes this secret;
                        renew to obtain another.
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <button
                    className={button}
                    disabled={busy || camera}
                    onClick={() => void scan()}
                  >
                    Scan {label} QR
                  </button>
                  <video
                    ref={video}
                    hidden={!camera}
                    playsInline
                    muted
                    className="w-full max-w-sm"
                  />
                  {camera && (
                    <button className={button} onClick={stopCamera}>
                      Stop camera
                    </button>
                  )}
                  <form
                    className="space-y-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void perform(async () => {
                        const current = (await api("status")) as State;
                        if (!current.challenge)
                          throw Error(
                            "The issuing participant must generate a challenge first.",
                          );
                        await verify(
                          { manualCode: code },
                          current.challenge.id,
                        );
                      });
                    }}
                  >
                    <label className="block">
                      One-time {label.toLowerCase()} code
                      <input
                        className="ml-2 w-32 rounded border p-2"
                        inputMode="numeric"
                        autoComplete="off"
                        pattern="[0-9]{6}"
                        minLength={6}
                        maxLength={6}
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                      />
                    </label>
                    <button
                      className={button}
                      disabled={busy || code.length !== 6}
                    >
                      Verify {label.toLowerCase()} code
                    </button>
                  </form>
                  {data.challenge && (
                    <p>
                      {Date.parse(data.challenge.expiresAt) <= clock
                        ? "QR scanning deadline expired. Unscanned codes need replacement; a valid scan has a separate confirmation window."
                        : `QR scanning deadline: ${new Date(data.challenge.expiresAt).toLocaleTimeString()}`}
                    </p>
                  )}
                  {data.challenge?.consumedAt &&
                    data.challenge.confirmationExpiresAt && (
                      <p role="status">
                        {!data.challenge.confirmationEligible ||
                        Date.parse(data.challenge.confirmationExpiresAt) <=
                          clock
                          ? "Confirmation window expired or verification changed. Request a new challenge; your condition draft is retained."
                          : `${p === "PICKUP" ? "Complete physical receipt and required checklist" : "Acknowledge physical return receipt"} within ${Math.ceil((Date.parse(data.challenge.confirmationExpiresAt) - clock) / 1000)} seconds (until ${new Date(data.challenge.confirmationExpiresAt).toLocaleTimeString()}). ${p === "RETURN" ? "Condition inspection remains a separate required step. " : ""}Scanning alone does not confirm custody.`}
                      </p>
                    )}
                  {proof && p === "RETURN" && (
                    <>
                      <label className="flex gap-2">
                        <input
                          type="checkbox"
                          checked={physical}
                          onChange={(e) => setPhysical(e.target.checked)}
                        />
                        I have physically received the returned equipment. This
                        does not accept its condition.
                      </label>
                      <button
                        className={button}
                        disabled={busy || !physical}
                        onClick={() =>
                          void perform(async () => {
                            await api("receipt", {
                              meetupChallengeId: proof,
                              physicalReceipt: true,
                            });
                            setPhysical(false);
                            router.refresh();
                          })
                        }
                      >
                        Acknowledge physical return and begin inspection
                      </button>
                    </>
                  )}
                  {proof && p === "PICKUP" && (
                    <p>
                      Pickup verification saved. Use your own condition form
                      below and explicitly acknowledge physical receipt.
                      Scanning alone does not start the rental.
                    </p>
                  )}
                </>
              )}
            </>
          )}
          <div className="space-y-2">
            <label>
              Assistance reason
              <select
                className="ml-2 rounded border p-2"
                value={assistanceReason}
                onChange={(e) => setAssistanceReason(e.target.value)}
              >
                {[
                  "LOCATION_PROBLEM",
                  "CHALLENGE_PROBLEM",
                  "MEETUP_PROBLEM",
                  "SAFETY_CONCERN",
                ].map((r) => (
                  <option key={r} value={r}>
                    {r.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </label>
            <button
              className={button}
              disabled={busy}
              onClick={() =>
                void perform(async () => {
                  const r = await api("assistance", {
                    reason: assistanceReason,
                  });
                  setFeedback(
                    `Assistance recorded as case #${r.caseId}. Authorized reviewers must assess it; no rental state changed.`,
                  );
                })
              }
            >
              Report issue / request assistance
            </button>
          </div>
          <p className="text-sm">
            Server confirmation is mandatory. For a failed meetup or other
            concern, use the booking&apos;s dispute controls when available or{" "}
            <Link className="underline" href="/customer-service">
              Customer Service and reporting options
            </Link>
            . Email/live support is not available in this MVP; no automatic
            cancellation or no-show penalty is applied.
          </p>
          {!active && (
            <p>
              Normal verification cannot alter this booking stage. Existing
              inspection/dispute and mediated recovery controls remain
              available.
            </p>
          )}
        </>
      )}
      {busy && <p role="status">Checking with server…</p>}
      {feedback && <p role="status">{feedback}</p>}
      {error && <p role="alert">{error}</p>}
      <button className={button} onClick={() => void perform(load)}>
        Refresh verification status
      </button>
    </section>
  );
}

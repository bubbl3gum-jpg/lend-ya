"use client";

import {DocumentLedger,type DocumentationReview} from "@/components/documentation-agreement";
import {useLocale} from "@/components/i18n/locale";
import {agreementText} from "@/lib/i18n/agreement";
import {formatTime} from "@/lib/i18n/core";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { MRTStationSelector } from "./mrt/MRTStationSelector";
import { stationLabel, type DatabaseStation } from "@/lib/mrt/network";

type BookingFormProps = {
  documentationPilot?:boolean;
  listing: {
    id: number;
    title: string;
    supportedStations: Array<{
      station: DatabaseStation;
    }>;
  };
};

export function BookingForm({ listing,documentationPilot=false }: BookingFormProps) {
  const {locale}=useLocale(),docText=agreementText(locale);
  const [documentation,setDocumentation]=useState<DocumentationReview|null>(null),[ack,setAck]=useState("");
  const router = useRouter();
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [meetingStationId, setMeetingStationId] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [quote, setQuote] = useState<{
    days: number;
    dailyPrice: string;
    totalPrice: string;
    deposit: string;
  } | null>(null);
  const [reviewed, setReviewed] = useState("");
  const selection = JSON.stringify({ startAt, endAt, meetingStationId, notes });
  const [loading, setLoading] = useState(false);
  const requestIdentity = useRef<{ selection: string; key: string } | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if(documentation&&reviewed===selection&&ack!==selection+documentation.contextId)return;
    setLoading(true);

    try {
      if (!meetingStationId)
        throw new Error("Choose and confirm a meeting station.");
      if (requestIdentity.current?.selection !== selection)
        requestIdentity.current = { selection, key: crypto.randomUUID() };
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { ...(documentationPilot?{"X-Hustlen-Documentation-Agreement":"1"}:{}),"Content-Type": "application/json", "Idempotency-Key": requestIdentity.current.key },
        body: JSON.stringify({
          listingId: listing.id,
          startAt,
          endAt,
          meetingStationId: Number(meetingStationId),
          canonicalStationId: listing.supportedStations.find(
            (s) => s.station.id === Number(meetingStationId),
          )?.station.canonicalId,
          notes,
          quote: reviewed !== selection,
          ...(reviewed===selection&&documentation?{documentation:{contextId:documentation.contextId,versionId:documentation.document.versionId,acknowledged:true}}:{}),
          ...(reviewed === selection && quote
            ? {
                expectedQuote: `${quote.dailyPrice}:${quote.totalPrice}:${quote.deposit}`,
              }
            : {}),
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        if(result.code?.startsWith("DOCUMENTATION_")){setDocumentation(null);setAck("");setReviewed("");throw new Error(docText.changed);}
        if (result.code === "STATION_UNAVAILABLE") {
          setMeetingStationId("");
          setQuote(null);
          router.refresh();
        }
        throw new Error(result.error || "Unable to create booking request.");
      }

      if (result.quote) {
        setQuote(result.quote);
        setDocumentation(result.documentationReview??null);setAck("");
        setReviewed(selection);
        return;
      }
      router.push(`/bookings/${result.booking.id}`);
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Unable to create booking request.";
      setError(message);
      if(!documentation)setReviewed("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <h3 className="mb-4 text-xl font-semibold text-slate-900">
        Request this rental
      </h3>

      <p className="mb-4 text-sm">
        All rental times are Asia/Taipei (UTC+08:00). Maximum 90 days. Partial
        days round up.
      </p>
      <div className="space-y-4">
        <label className="block text-sm font-medium text-slate-700">
          Start date
          <input
            type="datetime-local"
            value={startAt}
            onChange={(event) => setStartAt(event.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-emerald-500 focus:outline-none"
            required
          />
        </label>

        <label className="block text-sm font-medium text-slate-700">
          End date
          <input
            type="datetime-local"
            value={endAt}
            onChange={(event) => setEndAt(event.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-emerald-500 focus:outline-none"
            required
          />
        </label>

        <MRTStationSelector
          mode="borrower"
          stations={listing.supportedStations.map((s) => s.station)}
          selectedIds={meetingStationId ? [Number(meetingStationId)] : []}
          onChange={(ids) => setMeetingStationId(ids[0] ? String(ids[0]) : "")}
        />

        <label className="block text-sm font-medium text-slate-700">
          Notes
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={3}
            maxLength={2000}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-emerald-500 focus:outline-none"
            placeholder="Any pickup notes or preferences"
          />
        </label>
      </div>

      {quote && reviewed === selection ? (
        <div
          className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm"
          aria-live="polite"
        >
          <p>{listing.title}</p>
          <p>
            {startAt} → {endAt} (Asia/Taipei)
          </p>
          <p>
            {quote.days} billable days × ${quote.dailyPrice} per day
          </p>
          <p>
            Rental fee: ${quote.totalPrice} · Deposit: ${quote.deposit} (not
            collected)
          </p>
          <p>
            Pickup:{" "}
            {(() => {
              const station = listing.supportedStations.find(
                ({ station }) => String(station.id) === meetingStationId,
              )?.station;
              return station ? stationLabel(station) : "Choose a station";
            })()}
          </p>
        </div>
      ) : null}
      {documentation&&reviewed===selection&&<div lang={locale}><p>{docText.expiry}: {formatTime(locale,documentation.expiresAt)}</p><DocumentLedger document={documentation.document} digest={documentation.contentDigest} mediaQuery={`contextId=${documentation.contextId}`}/><label><input type="checkbox" checked={ack===selection+documentation.contextId} onChange={e=>setAck(e.target.checked?selection+documentation.contextId:"")}/>{docText.ack}</label></div>}
      {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}

      <button
        type="submit"
        disabled={loading||(reviewed===selection&&!!documentation&&ack!==selection+documentation.contextId)}
        className="mt-4 w-full rounded-xl bg-slate-900 px-4 py-3 font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading
          ? "Loading..."
          : reviewed === selection
            ? "Confirm and submit request"
            : "Review quotation"}
      </button>
    </form>
  );
}

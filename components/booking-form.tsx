"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type BookingFormProps = {
  listing: {
    id: number;
    title: string;
    type: "RENTAL" | "SERVICE";
    supportedStations: Array<{ station: { id: number; code: string; name: string } }>;
  };
};

export function BookingForm({ listing }: BookingFormProps) {
  const router = useRouter();
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [meetingStationId, setMeetingStationId] = useState(String(listing.supportedStations[0]?.station.id ?? ""));
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: listing.id,
          startAt,
          endAt,
          meetingStationId: Number(meetingStationId),
          notes,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Unable to create booking request.");
      }

      router.push(`/bookings/${result.booking.id}`);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to create booking request.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-xl font-semibold text-slate-900">Request this {listing.type === "RENTAL" ? "rental" : "service"}</h3>

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

        <label className="block text-sm font-medium text-slate-700">
          MRT station
          <select
            value={meetingStationId}
            onChange={(event) => setMeetingStationId(event.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-emerald-500 focus:outline-none"
          >
            {listing.supportedStations.map(({ station }) => (
              <option key={station.id} value={station.id}>{station.name}</option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Notes
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={3}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-emerald-500 focus:outline-none"
            placeholder="Any pickup notes or preferences"
          />
        </label>
      </div>

      {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}

      <button
        type="submit"
        disabled={loading}
        className="mt-4 w-full rounded-xl bg-slate-900 px-4 py-3 font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Submitting..." : "Submit request"}
      </button>
    </form>
  );
}

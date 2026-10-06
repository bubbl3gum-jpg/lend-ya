"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Station = { id: number; code: string; name: string };

type CreateListingFormProps = {
  stations: Station[];
};

export function CreateListingForm({ stations }: CreateListingFormProps) {
  const router = useRouter();
  const [type, setType] = useState("RENTAL");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [condition, setCondition] = useState("");
  const [price, setPrice] = useState("150.00");
  const [deposit, setDeposit] = useState("500.00");
  const [selectedStations, setSelectedStations] = useState<number[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const stationOptions = useMemo(() => stations, [stations]);

  function toggleStation(stationId: number) {
    setSelectedStations((current) =>
      current.includes(stationId)
        ? current.filter((id) => id !== stationId)
        : [...current, stationId],
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const payload = {
        title,
        description,
        category,
        condition,
        type,
        price,
        deposit: type === "RENTAL" ? deposit : "0.00",
        status: "ACTIVE",
        stationIds: type === "RENTAL" ? selectedStations : [],
      };

      const response = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Unable to create listing.");
      }

      router.push(`/listings/${result.listing.id}`);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="grid gap-5 md:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700 md:col-span-2">
          Listing title
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-emerald-500 focus:outline-none"
            required
          />
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Category
          <input
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-emerald-500 focus:outline-none"
            required
          />
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Type
          <select
            value={type}
            onChange={(event) => setType(event.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-emerald-500 focus:outline-none"
          >
            <option value="RENTAL">Rental</option>
            <option value="SERVICE">Service</option>
          </select>
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Price
          <input
            type="number"
            min="1"
            step="0.01"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-emerald-500 focus:outline-none"
            required
          />
        </label>

        {type === "RENTAL" ? (
          <label className="block text-sm font-medium text-slate-700">
            Deposit
            <input
              type="number"
              min="0"
              step="0.01"
              value={deposit}
              onChange={(event) => setDeposit(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-emerald-500 focus:outline-none"
            />
          </label>
        ) : null}

        <label className="block text-sm font-medium text-slate-700 md:col-span-2">
          Condition
          <input
            value={condition}
            onChange={(event) => setCondition(event.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-emerald-500 focus:outline-none"
            required
          />
        </label>

        <label className="block text-sm font-medium text-slate-700 md:col-span-2">
          Description
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={5}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-emerald-500 focus:outline-none"
            required
          />
        </label>
      </div>

      {type === "RENTAL" ? (
        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">Supported MRT pickup stations</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {stationOptions.map((station) => (
              <label key={station.id} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={selectedStations.includes(station.id)}
                  onChange={() => toggleStation(station.id)}
                />
                {station.name}
              </label>
            ))}
          </div>
        </div>
      ) : null}

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      <button
        type="submit"
        disabled={loading}
        className="rounded-xl bg-emerald-600 px-4 py-3 font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Publishing..." : "Publish listing"}
      </button>
    </form>
  );
}

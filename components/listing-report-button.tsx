"use client";

import { useLocale } from "@/components/i18n/locale";
import type { MessageId } from "@/lib/i18n/catalogues";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

const reportErrors: Readonly<Record<string, MessageId>> = {
  "You cannot report your own listing.": "report.self",
  "Listing not found.": "report.missing",
  "Listing is no longer available for reporting.": "report.unavailable",
  "You have already reported this listing.": "report.duplicate",
  "Provide a report reason and valid optional details.": "report.invalid",
};

const reportReasons = [
  "Safety concern",
  "Prohibited item",
  "Inaccurate listing",
  "Other",
];

export function ListingReportButton({ listingId }: { listingId: number }) {
  const { t } = useLocale();
  const reasonLabels: Record<string, MessageId> = {
    "Safety concern": "report.safety",
    "Prohibited item": "report.prohibited",
    "Inaccurate listing": "report.inaccurate",
    Other: "report.other",
  };
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(reportReasons[0]);
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState("");
  const [loginRequired, setLoginRequired] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setLoginRequired(false);

    try {
      const response = await fetch(`/api/listings/${listingId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, description }),
      });
      const payload = await response.json();
      if (response.status === 401) {
        setLoginRequired(true);
        throw new Error("Log in to report this listing.");
      }
      if (!response.ok) {
        throw new Error(payload.error || "Unable to submit report.");
      }
      setMessage("Report received.");
      setOpen(false);
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to submit report.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-3 border-t border-slate-100 pt-3">
      {open ? (
        <form onSubmit={submit} className="space-y-2">
          <label className="block text-xs font-medium text-slate-700">
            {t("report.reason")}
            <select
              aria-label={t("report.reason")}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
            >
              {reportReasons.map((entry) => (
                <option key={entry} value={entry}>
                  {t(reasonLabels[entry])}
                </option>
              ))}
            </select>
          </label>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={1000}
            rows={2}
            aria-label={t("report.details")}
            placeholder={t("report.details")}
            className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
          />
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-rose-700 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
            >
              {t(loading ? "report.sending" : "report.send")}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700"
            >
              {t("report.cancel")}
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            setMessage("");
          }}
          className="text-sm font-medium text-slate-600 underline decoration-slate-300 underline-offset-2 hover:text-rose-700"
        >
          {t("report.open")}
        </button>
      )}
      {message ? (
        <p className="mt-2 text-xs text-slate-600">
          {loginRequired ? (
            <Link
              className="font-medium text-emerald-700 underline"
              href="/login"
            >
              {t("report.login")}
            </Link>
          ) : message === "Report received." ? (
            t("report.received")
          ) : message === "Unable to submit report." ? (
            t("report.failed")
          ) : (
            t(
              Object.prototype.hasOwnProperty.call(reportErrors, message)
                ? reportErrors[message]
                : "report.failed",
            )
          )}
        </p>
      ) : null}
    </div>
  );
}

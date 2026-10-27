"use client";
import Link from "next/link";
import { LocaleProvider, T } from "@/components/i18n/locale";
export function MarketplaceRouteState({
  kind,
  retry,
}: {
  kind: "loading" | "error" | "notFound";
  retry?: () => void;
}) {
  return (
    <LocaleProvider initialLocale="en">
      <section
        className="p-6"
        aria-live={kind === "loading" ? "polite" : undefined}
      >
        <h1>
          <T
            id={
              kind === "loading"
                ? "journey.loading"
                : kind === "error"
                  ? "journey.error"
                  : "journey.notFound"
            }
          />
        </h1>
        {kind === "notFound" && (
          <p>
            <T id="journey.notFoundNote" />
          </p>
        )}
        {retry && (
          <button className="border p-3" onClick={retry}>
            <T id="journey.retry" />
          </button>
        )}
        <Link href="/listings" className="block underline p-3">
          <T id="listing.back" />
        </Link>
      </section>
    </LocaleProvider>
  );
}

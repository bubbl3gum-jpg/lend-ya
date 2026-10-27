import Link from "next/link";
import { readLocale } from "@/lib/i18n/server";
import { message } from "@/lib/i18n/core";
export default async function NotFound() {
  const locale = await readLocale();
  return (
    <section lang={locale} className="p-6">
      <h1>{message(locale, "journey.notFound")}</h1>
      <p>{message(locale, "journey.notFoundNote")}</p>
      <Link href="/listings" className="block p-3 underline">
        {message(locale, "listing.back")}
      </Link>
    </section>
  );
}

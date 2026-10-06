import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export default function CustomerServicePage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <SiteHeader />
      <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="mb-8">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-600">Support</p>
        <h1 className="mt-2 text-4xl font-semibold text-slate-900">Customer service</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">How it works</h2>
          <ul className="mt-4 space-y-3 text-sm text-slate-600">
            <li>1. Browse listings and choose a supported MRT station.</li>
            <li>2. Request a booking with a clear start and end date.</li>
            <li>3. The owner accepts or rejects the request.</li>
            <li>4. Pickup, use, return, and complete the booking flow.</li>
          </ul>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Need help?</h2>
          <p className="mt-4 text-sm text-slate-600">Email support@mrtmarket.example or use the demo contact flow for the simplified MVP.</p>
          <div className="mt-6">
            <Link href="/" className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white">Back to home</Link>
          </div>
        </section>
      </div>
      </div>
    </main>
  );
}

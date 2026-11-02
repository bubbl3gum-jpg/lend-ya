import { ownedSupportCandidate, TicketDenied } from "@/lib/support/tickets";
import { logOperationalError } from "@/lib/operational-error";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { HeritageSurface, HeritageSection, EditorialHeading } from "@/components/heritage/experience";
import { readAppearance } from "@/lib/heritage/appearance";
import { readLocale } from "@/lib/i18n/server";

export default async function CustomerServicePage() {
  let candidate = false;
  try { await ownedSupportCandidate(); candidate = true; }
  catch (e) { if (!(e instanceof TicketDenied)) logOperationalError("support_candidate_help", e); }
  return (
    <HeritageSurface initialTheme={await readAppearance()} initialLocale={await readLocale()}>
      <a className="catalogue-skip" href="#help-content">Skip to help</a>
      <SiteHeader catalogue />
      <main id="help-content" tabIndex={-1} className="mx-auto max-w-5xl px-6 py-10" lang="en">
        <header className="mb-8 border-b border-[var(--rule)] pb-6">
          <p className="catalogue-eyebrow">Hustlen’ / Sharing with care</p>
          <h1 className="catalogue-title">Help &amp; customer service</h1>
          <p className="catalogue-muted mt-4">Find your next step in the rental journey. Operational guidance on this page is in English.</p>
        </header>
        <div className="grid gap-8 md:grid-cols-2">
          <HeritageSection>
            <EditorialHeading number="01" title="Plan the rental" />
            <ol className="mt-5 list-decimal space-y-3 pl-5 text-sm leading-relaxed">
              <li>Browse items and the owner’s supported MRT stations.</li>
              <li>Request a start date, end date and eligible meeting station.</li>
              <li>Wait for the owner’s acceptance. A proposal is not an agreed change.</li>
            </ol>
            <p className="mt-5"><Link className="catalogue-button" href="/listings">Browse items</Link></p>
          </HeritageSection>
          <HeritageSection>
            <EditorialHeading number="02" title="Pickup, return & inspect" />
            <p className="mt-5 text-sm leading-relaxed">Open the booking for the current step and required checklists, fresh evidence, consent and QR verification. The borrower’s return submission is separate from the owner’s physical receipt and inspection.</p>
            <p className="mt-5"><Link className="catalogue-button" href="/dashboard">Open my rentals</Link></p>
          </HeritageSection>
          <HeritageSection>
            <EditorialHeading number="03" title="Report a problem" />
            <p className="mt-5 text-sm leading-relaxed">Use Report on the relevant listing or the available dispute action in your booking. Preserve original records and describe what is uncertain. Administrators review cases; a report does not establish responsibility or authorize a charge.</p>
            <p className="catalogue-muted mt-4 text-sm">Payment processing, reset-email delivery and live customer-support replies are not available in this demo.</p>
          </HeritageSection>
          <HeritageSection>
            <EditorialHeading number="04" title="Experimental AI" />
            <p className="mt-5 text-sm leading-relaxed">The separate local Customer Service AI demo accepts fictional situations only. It cannot inspect photographs, access private rentals, send messages or decide disputes. Genuine output requires the locally installed Qwen model; availability and quality are not guaranteed.</p>
            <p className="catalogue-muted mt-4 text-sm">The protected development demo is intentionally separate from this marketplace. No production chatbot or automatic case submission is enabled.</p>
          </HeritageSection>
        </div>
        {candidate ? (
          <HeritageSection className="mt-8">
            <EditorialHeading number="05" title="Isolated development ticket pilot" />
            <p className="my-4 text-sm">Allowlisted ACTIVE requesters can submit text-only test tickets. Production intake remains disabled. A persisted ticket is not proof of assignment, human receipt or a reply.</p>
            <div className="flex flex-wrap gap-5"><Link className="underline" href="/customer-service/tickets/new">Create ticket</Link><Link className="underline" href="/customer-service/tickets">My tickets</Link></div>
          </HeritageSection>
        ) : null}
      </main>
    </HeritageSurface>
  );
}

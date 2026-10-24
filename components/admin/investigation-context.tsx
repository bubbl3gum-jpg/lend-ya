import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AdminInputError, requireAdminPage } from "@/lib/admin/auth";
import {
  getInvestigationSummary,
  type InvestigationKind,
} from "@/lib/admin/investigation";
import {
  investigationHref,
  readWorkbenchNavigation,
} from "@/lib/admin/workbench-navigation";
import {
  workbenchCategories,
  workbenchCategoryKinds,
  workbenchReasons,
} from "@/lib/admin/workbench-catalog";
import { toSearchParams, type SearchParams } from "@/lib/admin/query";
import { logOperationalError } from "@/lib/operational-error";
import { AdminPanel, DetailFields, adminDate } from "./ui";
async function CurrentInvestigationContext({
  kind,
  recordId,
  searchParams,
}: {
  kind: InvestigationKind;
  recordId: string;
  searchParams: Promise<SearchParams>;
}) {
  await requireAdminPage();
  const navigation = readWorkbenchNavigation(
    toSearchParams(await searchParams),
  );
  const back = (
    <Link
      data-workbench-back
      href={navigation.backHref}
      className="inline-block rounded text-sm font-semibold text-emerald-800 underline underline-offset-4"
    >
      Back to Workbench
    </Link>
  );
  let data;
  try {
    data = await getInvestigationSummary(kind, recordId);
  } catch (error) {
    if (error instanceof AdminInputError) {
      if (error.status === 401) redirect("/login");
      if (error.status === 403 || error.status === 404) notFound();
    }
    const errorId = logOperationalError("admin_investigation_read", error);
    return (
      <section className="mb-6" aria-label="Investigation context">
        <AdminPanel title="Investigation context">
          <p role="alert" className="mb-3 text-sm">
            Current investigation checks are unavailable. No checkpoint
            conclusions could be loaded. Reload this page to try again.
          </p>
          <p className="mb-3 text-xs text-slate-500">
            Error reference: {errorId}
          </p>
          {back}
        </AdminPanel>
      </section>
    );
  }
  const selected = navigation.view?.category,
    match = data.matches.find((m) => m.category === selected),
    applicable = selected
      ? workbenchCategoryKinds[selected] === data.kind
      : false;
  const recorded = (value: boolean) =>
    value ? "Recorded" : "Not established by current records";
  return (
    <section className="mb-6" aria-label="Investigation context">
      <AdminPanel title="Investigation context">
        <p className="mb-3 text-xs text-slate-600">
          Current persisted state evaluated{" "}
          <time dateTime={data.asOf}>{adminDate(data.asOf)}</time>. This
          read-only check does not establish fault or change custody.
        </p>
        {selected ? (
          <div className="mb-4 rounded-lg bg-slate-50 p-3 text-sm">
            <p className="font-medium">
              Selected queue: {workbenchCategories[selected]}
            </p>
            <p
              data-selected-queue-match={
                !applicable ? "not-applicable" : match ? "true" : "false"
              }
              className="mt-1"
            >
              {!applicable
                ? "The selected queue describes a different record type. It is preserved only as your return view; current checks below apply to this record."
                : match
                  ? "Currently matches the selected queue."
                  : "Not currently in the selected queue. The navigation link does not prove an earlier match."}
            </p>
          </div>
        ) : (
          <p className="mb-4 text-sm text-slate-600">
            {navigation.state === "invalid"
              ? "Navigation context was invalid and has been discarded. Current checks still refer only to this detail record."
              : "No Workbench view was supplied. Current checks refer only to this detail record."}
          </p>
        )}
        <div className="mb-4 text-sm">
          <h3 className="font-semibold">Current queue criteria</h3>
          {data.matches.length ? (
            <ul className="mt-2 space-y-3">
              {data.matches.map((m) => (
                <li key={m.category} data-current-queue={m.category}>
                  <p className="font-medium">
                    {workbenchCategories[m.category]}
                  </p>
                  <ul className="mt-1 list-inside list-disc text-slate-600">
                    {m.reasons.map((reason) => (
                      <li key={reason}>{workbenchReasons[reason]}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-slate-600">
              No current Batch 7A queue criteria match this record.
            </p>
          )}
        </div>
        <DetailFields fields={[["Current record state", data.status]]} />
        {data.booking ? (
          <div className="mt-4">
            <h3 className="mb-3 text-sm font-semibold">
              Custody checkpoints
              {kind === "DISPUTE" ? " · related booking" : ""}
            </h3>
            <dl className="grid min-w-0 gap-3 text-sm sm:grid-cols-2">
              {[
                [
                  "handoff",
                  "Bilateral handoff",
                  recorded(data.booking.handoff),
                ],
                [
                  "submitted-return",
                  "Borrower-submitted return",
                  recorded(data.booking.submittedReturn),
                ],
                [
                  "physical-return",
                  "Recorded physical return",
                  data.booking.physicalReturn
                    ? `Recorded via ${[data.booking.ownerReceipt ? "owner confirmation" : "", data.booking.qrReceipt ? "completed QR receipt" : ""].filter(Boolean).join(" and ")}`
                    : recorded(false),
                ],
                [
                  "accepted-inspection",
                  "Owner-accepted inspection",
                  recorded(data.booking.acceptedInspection),
                ],
                [
                  "disputes",
                  "Rental disputes",
                  `${data.booking.openDispute ? 1 : 0} open · ${data.booking.resolvedDisputes} resolved`,
                ],
                [
                  "admin-closed",
                  "Administrative closure",
                  data.booking.adminClosed
                    ? "Status is ADMIN_CLOSED; this does not prove physical return"
                    : "Status is not ADMIN_CLOSED",
                ],
              ].map(([key, label, value]) => (
                <div key={key} className="min-w-0 break-words">
                  <dt className="text-slate-500">{label}</dt>
                  <dd data-checkpoint={key} className="mt-1">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-xs text-slate-600">
              Submission, physical receipt and accepted inspection are separate.
              A status label or resolved dispute does not prove these
              checkpoints. Missing records warrant investigation; they do not
              establish a participant’s failure.
            </p>
          </div>
        ) : null}
        {data.listing ? (
          <div className="mt-4">
            <DetailFields
              fields={[
                [
                  "Current administrative restriction",
                  data.listing.restricted ? "Restricted" : "Not restricted",
                ],
                ["Current open listing reports", data.listing.openReports],
              ]}
            />
          </div>
        ) : null}
        {data.related ? (
          <Link
            href={
              navigation.view
                ? investigationHref(data.related.href, navigation.view)
                : data.related.href
            }
            className="mt-4 inline-block rounded text-sm text-emerald-800 underline"
          >
            Inspect related {data.related.kind.toLowerCase()} #{data.related.id}
          </Link>
        ) : null}
        <div className="mt-4 border-t border-slate-100 pt-4">{back}</div>
      </AdminPanel>
    </section>
  );
}

export function InvestigationContext(
  props: Parameters<typeof CurrentInvestigationContext>[0],
) {
  return (
    <Suspense
      fallback={
        <section
          className="mb-6"
          aria-label="Investigation context loading"
          aria-busy="true"
        >
          <AdminPanel title="Investigation context">
            <p role="status" className="text-sm text-slate-600">
              Loading current investigation checks…
            </p>
          </AdminPanel>
        </section>
      }
    >
      <CurrentInvestigationContext {...props} />
    </Suspense>
  );
}

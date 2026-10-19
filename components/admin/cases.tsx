import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminPage, AdminInputError } from "@/lib/admin/auth";
import { caseDirectory, caseDetail, type CaseKind } from "@/lib/admin/cases";
import {
  adminRecordId,
  toSearchParams,
  type SearchParams,
} from "@/lib/admin/query";
import {
  AdminTitle,
  AdminPanel,
  AdminTable,
  DetailFields,
  StatusBadge,
  adminDate,
  adminMoney,
} from "@/components/admin/ui";
import { AdminActionForm } from "@/components/admin/action-form";
import { RentalEvidence } from "@/components/rental-evidence";
export async function AdminCaseDirectory({
  kind,
  searchParams,
}: {
  kind: CaseKind;
  searchParams: Promise<SearchParams>;
}) {
  await requireAdminPage();
  const params = toSearchParams(await searchParams),
    label =
      kind === "audit-logs"
        ? "Audit Logs"
        : kind[0].toUpperCase() + kind.slice(1);
  let data: Awaited<ReturnType<typeof caseDirectory>> | undefined,
    inputError: string | undefined;
  try {
    data = await caseDirectory(kind, params);
  } catch (error) {
    if (error instanceof AdminInputError) inputError = error.message;
    else throw error;
  }
  if (inputError || !data)
    return (
      <>
        <AdminTitle title={label} description="Check the directory filters." />
        <p role="alert">{inputError}</p>
        <Link href={`/admin/${kind}`}>Reset filters</Link>
      </>
    );
  const { items, pagination: p } = data;
  const href = (page: number) => {
    const q = new URLSearchParams(params);
    q.set("page", String(page));
    return `/admin/${kind}?${q}`;
  };
  return (
    <>
      <AdminTitle
        title={label}
        description={
          kind === "audit-logs"
            ? "Immutable records of persisted administrative decisions."
            : "Review the original submissions and record accountable decisions."
        }
      />
      <form
        className="mb-6 grid min-w-0 gap-3 rounded-2xl border bg-white p-4 sm:grid-cols-2 lg:grid-cols-4"
        action={`/admin/${kind}`}
      >
        <label className="grid min-w-0 gap-1 text-sm">
          Search
          <input
            name="q"
            defaultValue={p.q}
            maxLength={120}
            className="min-w-0 rounded-lg border p-2"
          />
        </label>
        {kind !== "audit-logs" ? (
          <label className="grid gap-1 text-sm">
            Status
            <select
              name="status"
              defaultValue={p.status ?? ""}
              className="min-w-0 rounded-lg border p-2"
            >
              <option value="">All statuses</option>
              {(kind === "reports"
                ? ["OPEN", "REVIEWED", "DISMISSED"]
                : ["OPEN", "RESOLVED"]
              ).map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
        ) : (
          <>
            <label className="grid gap-1 text-sm">
              Target type
              <select
                name="targetType"
                defaultValue={p.targetType ?? ""}
                className="min-w-0 rounded-lg border p-2"
              >
                <option value="">All targets</option>
                {["USER", "LISTING", "REPORT", "DISPUTE", "CHAT_CASE"].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              Action
              <select
                name="action"
                defaultValue={p.action ?? ""}
                className="min-w-0 max-w-full rounded-lg border p-2"
              >
                <option value="">All actions</option>
                {[
                  "USER_SUSPENDED",
                  "USER_REACTIVATED",
                  "LISTING_RESTRICTED",
                  "LISTING_RESTORED",
                  "REPORT_RESOLVED",
                  "DISPUTE_RESOLVED",
      "EVIDENCE_VIEWED",
      "CHAT_CASE_CLAIMED", "CHAT_EVIDENCE_VIEWED", "CHAT_CASE_DECIDED", "CHAT_WARNING", "CHAT_REVIEWER_GRANT",
                ].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            {p.targetId ? (
              <input type="hidden" name="targetId" value={p.targetId} />
            ) : null}
            {p.adminId ? (
              <input type="hidden" name="adminId" value={p.adminId} />
            ) : null}
          </>
        )}
        <label className="grid gap-1 text-sm">
          Page size
          <input
            name="pageSize"
            type="number"
            min={1}
            max={100}
            defaultValue={p.pageSize}
            className="min-w-0 rounded-lg border p-2"
          />
        </label>
        <button className="self-end justify-self-start rounded-lg bg-slate-900 px-4 py-2 text-sm text-white">
          Apply filters
        </button>
      </form>
      <AdminTable
        title={label}
        headers={
          kind === "audit-logs"
            ? [
                "Timestamp",
                "Administrator",
                "Action",
                "Target",
                "Reason",
                "State change",
              ]
            : kind === "reports"
              ? [
                  "Report",
                  "Listing",
                  "Owner",
                  "Reporter",
                  "Reason",
                  "Status",
                  "Submitted",
                ]
              : [
                  "Dispute / booking",
                  "Item",
                  "Owner",
                  "Borrower",
                  "Reason",
                  "Status",
                  "Opened",
                ]
        }
        rows={items.map((row) => {
          if ("targetType" in row) {
            const route = (
              {
                USER: "users",
                LISTING: "listings",
                REPORT: "reports",
                DISPUTE: "disputes",
              } as Record<string, string>
            )[row.targetType];
            return {
              id: row.id,
              cells: [
                adminDate(row.createdAt),
                <Link key="admin" href={`/admin/users/${row.adminId}`}>
                  {row.admin.name} · #{row.adminId}
                </Link>,
                row.action,
                <Link key="target" href={`/admin/${route}/${row.targetId}`}>
                  {row.targetType} #{row.targetId}
                </Link>,
                <span
                  key="reason"
                  className="block max-w-xs whitespace-pre-wrap break-words"
                >
                  {row.reason}
                </span>,
                <span
                  key="states"
                  className="block max-w-md whitespace-pre-wrap break-words text-xs"
                >
                  {JSON.stringify(row.previousState)} →{" "}
                  {JSON.stringify(row.newState)}
                </span>,
              ],
            };
          }
          if ("listing" in row)
            return {
              id: row.id,
              cells: [
                <Link
                  key="id"
                  className="underline"
                  href={`/admin/reports/${row.id}`}
                >
                  #{row.id}
                </Link>,
                row.listing.title,
                row.listing.owner.name,
                row.reporter.name,
                row.reason,
                <StatusBadge key="status" status={row.status} />,
                adminDate(row.createdAt),
              ],
            };
          return {
            id: row.id,
            cells: [
              <Link
                key="id"
                className="underline"
                href={`/admin/disputes/${row.id}`}
              >
                #{row.id} / booking #{row.bookingId}
              </Link>,
              row.booking.listing.title,
              row.booking.owner.name,
              row.booking.renter.name,
              row.reason,
              <StatusBadge key="status" status={row.status} />,
              adminDate(row.createdAt),
            ],
          };
        })}
      />
      <nav
        aria-label="Pagination"
        className="mt-4 flex flex-wrap gap-4 text-sm"
      >
        <span>
          {p.total} records · Page {p.page} of {p.totalPages}
        </span>
        {p.page > 1 ? (
          <Link className="underline" href={href(p.page - 1)}>
            Previous
          </Link>
        ) : null}
        {p.page < p.totalPages ? (
          <Link className="underline" href={href(p.page + 1)}>
            Next
          </Link>
        ) : null}
      </nav>
    </>
  );
}
export async function AdminCaseDetail({
  kind,
  params,
}: {
  kind: "reports" | "disputes";
  params: Promise<{ id: string }>;
}) {
  await requireAdminPage();
  let id: number;
  try {
    id = adminRecordId((await params).id);
  } catch {
    notFound();
  }
  const record = await caseDetail(kind, id);
  if (!record) notFound();
  if ("listing" in record)
    return (
      <>
        <AdminTitle
          title={`Report #${id}`}
          description="Original allegation and recorded administrative decision."
        />
        <AdminPanel title="Submitted report">
          <DetailFields
            fields={[
              [
                "Listing",
                <Link key="item" href={`/admin/listings/${record.listingId}`}>
                  {record.listing.title}
                </Link>,
              ],
              ["Owner", record.listing.owner.name],
              ["Reporter", record.reporter.name],
              ["Reason", record.reason],
              ["Original details", record.description],
              ["Status", <StatusBadge key="status" status={record.status} />],
              ["Submitted", adminDate(record.createdAt)],
              ["Resolved", adminDate(record.resolvedAt)],
              ["Administrator ID", record.resolvedBy],
              ["Administrative decision reason", record.decisionReason],
              [
                "Listing restriction",
                record.listing.adminRestricted
                  ? "Restricted"
                  : "No admin restriction",
              ],
            ]}
          />
        </AdminPanel>
        {record.status === "OPEN" ? (
          <AdminActionForm
            title="Resolve listing report"
            endpoint={`/api/admin/reports/${id}/resolve`}
            options={[
              { value: "DISMISS", label: "Dismiss · unfounded" },
              { value: "UPHOLD", label: "Uphold · restrict listing" },
            ]}
          />
        ) : null}
        <CaseHistory type="REPORT" id={id} />
      </>
    );
  const b = record.booking,
    h = b.handoff,
    r = b.return;
  return (
    <>
      <AdminTitle
        title={`Dispute #${id} · ${b.listing.title}`}
        description="Participant statements are attributed individually. Findings do not settle payments or legal liability."
      />
      <AdminPanel title="Case and rental agreement">
        <DetailFields
          fields={[
            [
              "Booking",
              <Link key="booking" href={`/admin/bookings/${b.id}`}>
                #{b.id}
              </Link>,
            ],
            [
              "Listing",
              <Link key="listing" href={`/admin/listings/${b.listingId}`}>
                {b.listing.title}
              </Link>,
            ],
            ["Owner", `${b.owner.name} · #${b.ownerId} · ${b.owner.email}`],
            [
              "Borrower",
              `${b.renter.name} · #${b.renterId} · ${b.renter.email}`,
            ],
            ["Opened by", `${record.opener.name} · #${record.openedBy}`],
            ["Original allegation", record.reason],
            ["Original description", record.description],
            ["Booking notes", b.notes],
            ["Pickup", adminDate(b.startAt)],
            ["Scheduled return", adminDate(b.endAt)],
            ["Meeting station", b.meetingStation.name],
            [
              "Daily price snapshot",
              b.dailyPrice === null ? "Not recorded" : adminMoney(b.dailyPrice),
            ],
            ["Rental fee snapshot", adminMoney(b.totalPrice)],
            ["Deposit snapshot", adminMoney(b.deposit)],
            [
              "Booking status",
              <StatusBadge key="booking-status" status={b.status} />,
            ],
            [
              "Case status",
              <StatusBadge key="status" status={record.status} />,
            ],
            ["Opened", adminDate(record.createdAt)],
            ["Resolved", adminDate(record.resolvedAt)],
            ["Decision administrator", record.resolvedBy],
            ["Finding", record.finding],
            ["Booking consequence", record.bookingOutcome],
            ["Participant-visible explanation", record.decisionSummary],
            ["Confidential internal notes", record.adminNotes],
          ]}
        />
      </AdminPanel>
      <section
        className="mt-6 grid min-w-0 gap-4 xl:grid-cols-2"
        aria-label="Investigation evidence"
      >
        <RentalEvidence
          bookingId={b.id}
          evidenceBase={`/api/admin/disputes/${id}/evidence`}
          title="Owner handoff statement"
          actor={`Owner #${h?.performedBy ?? b.ownerId}`}
          stage="HANDOFF_OWNER"
          submittedAt={h?.timestamp ?? null}
          notes={h?.conditionNotes ?? null}
          checklist={h?.checklist}
          serialNumber={h?.serialNumber}
          photos={b.evidencePhotos}
          confirmation={
            h?.ownerConditionConfirmed
              ? "Owner acknowledged"
              : "Owner acknowledgement missing"
          }
        />
        <RentalEvidence
          bookingId={b.id}
          evidenceBase={`/api/admin/disputes/${id}/evidence`}
          title="Borrower receipt statement"
          actor={`Borrower #${h?.confirmedBy ?? b.renterId}`}
          stage="HANDOFF_BORROWER"
          submittedAt={h?.confirmedAt ?? null}
          notes={h?.borrowerConditionNotes ?? null}
          checklist={h?.borrowerChecklist}
          photos={b.evidencePhotos}
          confirmation={
            h?.conditionConfirmed
              ? "Receipt confirmed"
              : "Receipt not confirmed"
          }
        />
        <RentalEvidence
          bookingId={b.id}
          evidenceBase={`/api/admin/disputes/${id}/evidence`}
          title="Borrower return statement"
          actor={`Borrower #${r?.initiatedBy ?? b.renterId}`}
          stage="RETURN_BORROWER"
          submittedAt={r?.timestamp ?? null}
          notes={r?.conditionNotes ?? null}
          checklist={r?.checklist}
          photos={b.evidencePhotos}
          confirmation={
            r?.returnConfirmed
              ? "Borrower submitted return"
              : "Return not recorded"
          }
        />
        <RentalEvidence
          bookingId={b.id}
          evidenceBase={`/api/admin/disputes/${id}/evidence`}
          title="Owner inspection statement"
          actor={`Owner #${r?.inspectedBy ?? b.ownerId}`}
          stage="INSPECTION_OWNER"
          submittedAt={r?.inspectedAt ?? null}
          notes={r?.inspectionNotes ?? null}
          checklist={r?.inspectionChecklist}
          photos={b.evidencePhotos}
          confirmation={
            r?.inspectionAccepted === true
              ? "Acceptable"
              : r?.inspectionAccepted === false
                ? "Problem found"
                : "No inspection decision"
          }
        />
      </section>
      {record.status === "OPEN" ? (
        <AdminActionForm
          title="Resolve rental dispute"
          endpoint={`/api/admin/disputes/${id}/resolve`}
          field="finding"
          dispute
          options={[
            {
              value: "NO_ACTIONABLE_ISSUE",
              label: "No actionable issue found",
            },
            { value: "ISSUE_CONFIRMED", label: "Issue confirmed" },
            { value: "INSUFFICIENT_EVIDENCE", label: "Insufficient evidence" },
          ]}
        />
      ) : null}
      <CaseHistory type="DISPUTE" id={id} />
    </>
  );
}
export function CaseHistory({ type, id }: { type: string; id: number }) {
  return (
    <p className="mt-5 text-sm">
      <Link
        className="underline text-emerald-800"
        href={`/admin/audit-logs?targetType=${type}&targetId=${id}`}
      >
        View decision history and reasons
      </Link>
    </p>
  );
}

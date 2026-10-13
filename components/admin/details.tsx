import { AdminActionForm } from "@/components/admin/action-form";
import { CaseHistory } from "@/components/admin/cases";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { requireAdminPage, AdminInputError } from "@/lib/admin/auth";
import { adminRecordId } from "@/lib/admin/query";
import {
  getAdminUser,
  getAdminListing,
  getAdminBooking,
  adminBookingSelect,
} from "@/lib/admin/data";
import {
  AdminTitle,
  AdminPanel,
  AdminTable,
  DetailFields,
  StatusBadge,
  AdminRecordLink,
  adminDate,
  adminMoney,
} from "@/components/admin/ui";
async function recordId(params: Promise<{ id: string }>) {
  await requireAdminPage();
  try {
    return adminRecordId((await params).id);
  } catch (error) {
    if (error instanceof AdminInputError) notFound();
    throw error;
  }
}
function BookingHistory({
  bookings,
}: {
  bookings: Array<
    Prisma.BookingGetPayload<{ select: typeof adminBookingSelect }>
  >;
}) {
  return (
    <AdminTable
      title="Recent rental history"
      headers={["Booking", "Item", "Owner / borrower", "Status", "Pickup"]}
      rows={bookings.map((booking) => ({
        id: booking.id,
        cells: [
          <AdminRecordLink key="booking" kind="bookings" id={booking.id}>
            #{booking.id}
          </AdminRecordLink>,
          booking.listing.title,
          `${booking.owner.name} / ${booking.renter.name}`,
          <StatusBadge key="status" status={booking.status} />,
          adminDate(booking.startAt),
        ],
      }))}
      empty="No rental history."
    />
  );
}
export async function AdminUserDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const record = await getAdminUser(await recordId(params));
  if (!record) notFound();
  return (
    <>
      <AdminTitle
        title={`User #${record.id} · ${record.name}`}
        description="Account information and existing activity. Moderation preserves existing rentals and evidence."
      />
      <div className="grid gap-5 xl:grid-cols-2">
        <AdminPanel title="Account details">
          <DetailFields
            fields={[
              ["Display name", record.name],
              ["Email", record.email],
              ["Role", <StatusBadge key="role" status={record.role} />],
              [
                "Account status",
                <StatusBadge key="account" status={record.accountStatus} />,
              ],
              ["Registered", adminDate(record.createdAt)],
              ["Verification status", record.verificationStatus],
              [
                "Identity verification flag",
                record.identityVerified ? "Verified" : "Not verified",
              ],
              ["Existing trust score", record.trustScore ?? "Not assigned"],
              [
                "Existing confidence indicator",
                record.confidenceIndicator ?? "Not assigned",
              ],
            ]}
          />
        </AdminPanel>
        <AdminPanel title="Activity counts">
          <DetailFields
            fields={[
              [
                "Owned listings",
                <Link
                  key="listings"
                  className="underline"
                  href={`/admin/listings?ownerId=${record.id}`}
                >
                  {record._count.listings}
                </Link>,
              ],
              [
                "Bookings as borrower",
                <Link
                  key="renter"
                  className="underline"
                  href={`/admin/bookings?renterId=${record.id}`}
                >
                  {record._count.bookingsAsRenter}
                </Link>,
              ],
              [
                "Bookings as owner",
                <Link
                  key="owner"
                  className="underline"
                  href={`/admin/bookings?ownerId=${record.id}`}
                >
                  {record._count.bookingsAsOwner}
                </Link>,
              ],
              ["Received verified reviews", record._count.reviewsReceived],
            ]}
          />
        </AdminPanel>
      </div>
      {record.role === "USER" ? (
        <AdminActionForm
          title="Change account status"
          endpoint={`/api/admin/users/${record.id}/status`}
          method="PATCH"
          field="status"
          fixed={{ expectedStatus: record.accountStatus }}
          options={[
            {
              value: record.accountStatus === "ACTIVE" ? "SUSPENDED" : "ACTIVE",
              label:
                record.accountStatus === "ACTIVE"
                  ? "Suspend account"
                  : "Reactivate account",
            },
          ]}
        />
      ) : (
        <p className="mt-5 text-sm">
          Administrator accounts cannot be suspended through standard
          moderation.
        </p>
      )}
      <CaseHistory type="USER" id={record.id} />
      <section className="mt-6">
        <h2 className="mb-3 text-lg font-semibold">
          Rental history · latest 10
        </h2>
        <BookingHistory bookings={record.bookings} />
      </section>
      <div className="mt-6">
        <AdminPanel title="Received reviews · latest 10">
          {record.reviewsReceived.length ? (
            <ul className="space-y-4">
              {record.reviewsReceived.map((review) => (
                <li key={review.id} className="break-words text-sm">
                  <p>
                    <AdminRecordLink kind="users" id={review.author.id}>
                      {review.author.name}
                    </AdminRecordLink>{" "}
                    · {review.rating} / 5 · {adminDate(review.createdAt)}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap">
                    {review.comment || "No comment."}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">No received reviews.</p>
          )}
        </AdminPanel>
      </div>
    </>
  );
}
export async function AdminListingDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const record = await getAdminListing(await recordId(params));
  if (!record) notFound();
  return (
    <>
      <AdminTitle
        title={`Listing #${record.id} · ${record.title}`}
        description="Administrative listing view, including inactive items. Owner status and administrative restrictions are enforced separately."
      />
      <AdminPanel title="Item details">
        <DetailFields
          fields={[
            ["Title", record.title],
            ["Description", record.description],
            [
              "Owner",
              <AdminRecordLink key="owner" kind="users" id={record.owner.id}>
                {record.owner.name} · {record.owner.email}
              </AdminRecordLink>,
            ],
            ["Category", record.category],
            ["Condition", record.condition],
            ["Daily rental price", adminMoney(record.price)],
            ["Deposit", adminMoney(record.deposit)],
            ["Status", <StatusBadge key="status" status={record.status} />],
            [
              "Administrative restriction",
              record.adminRestricted ? "Restricted" : "None",
            ],
            ["Created", adminDate(record.createdAt)],
            ["Updated", adminDate(record.updatedAt)],
            ["Related bookings", record._count.bookings],
            ["Report count", record._count.reports],
            [
              "Pickup stations",
              record.supportedStations
                .map(({ station }) => `${station.code} · ${station.name}`)
                .join("\n") || "No stations recorded",
            ],
          ]}
        />
        {record.categoryDetails ? (
          <pre className="mt-4 whitespace-pre-wrap break-words rounded-xl bg-slate-50 p-3 text-xs">
            {JSON.stringify(record.categoryDetails, null, 2)}
          </pre>
        ) : null}
      </AdminPanel>
      <AdminActionForm
        title="Change listing restriction"
        endpoint={`/api/admin/listings/${record.id}/moderation`}
        method="PATCH"
        field="restricted"
        fixed={{ expectedRestricted: record.adminRestricted }}
        options={[
          {
            value: record.adminRestricted ? "false" : "true",
            label: record.adminRestricted
              ? "Remove admin restriction · other eligibility checks remain"
              : "Restrict listing",
          },
        ]}
      />
      <CaseHistory type="LISTING" id={record.id} />
      <div className="mt-6">
        <AdminPanel title="Listing media">
          {record.media.length ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {record.media.map((media) =>
                media.kind === "PHOTO" ? (
                  <Image
                    key={media.id}
                    unoptimized
                    src={media.url}
                    alt={`${record.title} listing photo`}
                    width={640}
                    height={480}
                    className="h-auto max-h-80 w-full rounded-xl object-contain"
                  />
                ) : (
                  <video
                    key={media.id}
                    controls
                    preload="metadata"
                    className="w-full rounded-xl"
                  >
                    <source src={media.url} type={media.mimeType} />
                  </video>
                ),
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No listing media recorded.</p>
          )}
        </AdminPanel>
      </div>
      <section className="mt-6">
        <h2 className="mb-3 text-lg font-semibold">
          Related bookings · latest 10
        </h2>
        <BookingHistory bookings={record.bookings} />
      </section>
      <div className="mt-6">
        <AdminPanel title="Reports · latest 10">
          {record.reports.length ? (
            <ul className="space-y-2 text-sm">
              {record.reports.map((report) => (
                <li key={report.id}>
                  <Link
                    className="underline"
                    href={`/admin/reports/${report.id}`}
                  >
                    Report #{report.id}
                  </Link>{" "}
                  · <StatusBadge status={report.status} /> ·{" "}
                  {adminDate(report.createdAt)}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">No reports recorded.</p>
          )}
        </AdminPanel>
      </div>
    </>
  );
}
export async function AdminBookingDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const record = await getAdminBooking(await recordId(params));
  if (!record) notFound();
  return (
    <>
      <AdminTitle
        title={`Booking #${record.id} · ${record.listing.title}`}
        description="Read-only rental monitoring. Private condition evidence can be inspected from a related dispute investigation."
      />
      <AdminPanel title="Rental agreement">
        <DetailFields
          fields={[
            [
              "Item",
              <AdminRecordLink
                key="listing"
                kind="listings"
                id={record.listing.id}
              >
                {record.listing.title}
              </AdminRecordLink>,
            ],
            [
              "Owner",
              <AdminRecordLink key="owner" kind="users" id={record.owner.id}>
                {record.owner.name} · {record.owner.email}
              </AdminRecordLink>,
            ],
            [
              "Borrower",
              <AdminRecordLink key="renter" kind="users" id={record.renter.id}>
                {record.renter.name} · {record.renter.email}
              </AdminRecordLink>,
            ],
            ["Status", <StatusBadge key="status" status={record.status} />],
            ["Pickup", adminDate(record.startAt)],
            ["Scheduled return", adminDate(record.endAt)],
            [
              "Pickup station",
              `${record.meetingStation.code} · ${record.meetingStation.name}`,
            ],
            ["Rental fee snapshot", adminMoney(record.totalPrice)],
            [
              "Daily price snapshot",
              record.dailyPrice === null
                ? "Not recorded"
                : adminMoney(record.dailyPrice),
            ],
            ["Deposit snapshot", adminMoney(record.deposit)],
            ["Created", adminDate(record.createdAt)],
            ["Updated", adminDate(record.updatedAt)],
            ["Booking notes", record.notes || "No notes."],
          ]}
        />
      </AdminPanel>
      <div className="mt-6 grid gap-5 xl:grid-cols-2">
        <AdminPanel title="Handoff state">
          <DetailFields
            fields={[
              ["Submitted", adminDate(record.handoff?.timestamp)],
              ["Submitted by user ID", record.handoff?.performedBy],
              ["Confirmed", adminDate(record.handoff?.confirmedAt)],
              ["Confirmed by user ID", record.handoff?.confirmedBy],
              [
                "Condition confirmed",
                record.handoff?.conditionConfirmed ? "Yes" : "Not confirmed",
              ],
            ]}
          />
        </AdminPanel>
        <AdminPanel title="Return / inspection state">
          <DetailFields
            fields={[
              ["Return submitted", adminDate(record.return?.timestamp)],
              ["Returned by user ID", record.return?.initiatedBy],
              ["Inspected", adminDate(record.return?.inspectedAt)],
              ["Inspected by user ID", record.return?.inspectedBy],
              [
                "Inspection decision",
                record.return?.inspectionAccepted === true
                  ? "Acceptable"
                  : record.return?.inspectionAccepted === false
                    ? "Problem found"
                    : "Not recorded",
              ],
              ["Return confirmed", adminDate(record.return?.confirmedAt)],
            ]}
          />
        </AdminPanel>
      </div>
      <div className="mt-6">
        <AdminPanel title="Dispute / cancellation">
          <p className="mb-4 text-sm">
            <Link className="underline" href={`/admin/disputes?q=${record.id}`}>
              View all dispute cases for this booking
            </Link>
          </p>
          <DetailFields
            fields={[
              [
                "Dispute",
                record.dispute ? (
                  <Link
                    key="case"
                    className="underline"
                    href={`/admin/disputes/${record.dispute.id}`}
                  >{`#${record.dispute.id} · ${record.dispute.status}`}</Link>
                ) : (
                  "No dispute"
                ),
              ],
              ["Dispute opened", adminDate(record.dispute?.createdAt)],
              ["Cancelled", adminDate(record.cancelledAt)],
              ["Cancelled by user ID", record.cancelledBy],
              ["Cancellation reason", record.cancellationReason],
            ]}
          />
        </AdminPanel>
      </div>
    </>
  );
}

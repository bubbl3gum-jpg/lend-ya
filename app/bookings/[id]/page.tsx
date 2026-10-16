import { stationSelect, stationLabel } from "@/lib/mrt/network";
import { RentalEvidence } from "@/components/rental-evidence";
import { formatRentalTime, rentalDays } from "@/lib/booking-time";
import { VerifiedReviewForm } from "@/components/verified-review-form";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BookingActions } from "@/components/booking-actions";
import { SiteHeader } from "@/components/site-header";
import { parsePathId } from "@/lib/api-validation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function formatDate(date: Date | string) {
  return formatRentalTime(date);
}

function formatPrice(value: string | number | { toString(): string }) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(value.toString()));
}

export default async function BookingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/login");
  }

  const { id } = await params;
  const bookingId = parsePathId(id);
  if (bookingId === null) {
    notFound();
  }

  const bookingRecord = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      ownerId: true,
      renterId: true,
      status: true,
      startAt: true,
      endAt: true,
      totalPrice: true,
      dailyPrice: true,
      deposit: true,
      notes: true,
      cancelledBy: true,
      cancelledAt: true,
      cancellationReason: true,
      listing: {
        select: {
          id: true,
          title: true,
          description: true,
          price: true,
        },
      },
      owner: { select: { id: true, name: true, email: true } },
      renter: { select: { id: true, name: true, email: true } },
      meetingStation: { select: stationSelect },
      reviews: {
        select: {
          id: true,
          authorId: true,
          rating: true,
          comment: true,
          createdAt: true,
          author: { select: { name: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      handoff: {
        select: {
          performedBy: true,
          confirmedAt: true,
          serialNumber: true,
          ownerConditionConfirmed: true,
          borrowerConditionNotes: true,
          borrowerChecklist: true,
          checklist: true,
          confirmedBy: true,
          timestamp: true,
          conditionNotes: true,
          conditionConfirmed: true,
        },
      },
      return: {
        select: {
          initiatedBy: true,
          returnConfirmed: true,
          inspectedBy: true,
          inspectedAt: true,
          inspectionAccepted: true,
          inspectionNotes: true,
          inspectionChecklist: true,
          checklist: true,
          confirmedBy: true,
          timestamp: true,
          confirmedAt: true,
          conditionNotes: true,
          conditionConfirmed: true,
        },
      },
      evidencePhotos: {
        select: {
          id: true,
          stage: true,
          mimeType: true,
          uploaderId: true,
          createdAt: true,
        },
      },
      disputes: {
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: {
          openedBy: true,
          finding: true,
          bookingOutcome: true,
          decisionSummary: true,
          resolvedAt: true,
          reason: true,
          description: true,
          status: true,
          createdAt: true,
        },
      },
    },
  });

  const booking = bookingRecord
    ? { ...bookingRecord, dispute: bookingRecord.disputes[0] ?? null }
    : null;
  if (!booking) {
    notFound();
  }
  if (
    booking.ownerId !== currentUser.id &&
    booking.renterId !== currentUser.id
  ) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <SiteHeader />
      <div className="mx-auto max-w-4xl px-6 py-12">
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="text-sm font-medium text-slate-600"
          >
            ← Back to dashboard
          </Link>
        </div>

        <div className="min-w-0 break-words rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-emerald-600">
                Booking
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-slate-900">
                {booking.listing.title}
              </h1>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
              {booking.status}
            </span>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div className="space-y-4 text-sm text-slate-600">
              <div>
                <p className="font-medium text-slate-900">Dates</p>
                <p>
                  {formatDate(booking.startAt)} → {formatDate(booking.endAt)}
                </p>
              </div>
              <div>
                <p className="font-medium text-slate-900">Meeting station</p>
                <p>
                  {stationLabel(booking.meetingStation)}
                  <span className="mt-2 block text-xs">
                    This physical station is a meeting area. Agree on an exact
                    exit or meeting point; no exit is confirmed here.
                  </span>
                </p>
              </div>
              <div>
                <p className="font-medium text-slate-900">Total price</p>
                <p>{formatPrice(booking.totalPrice)}</p>
                <p>
                  {rentalDays(booking.startAt, booking.endAt)} billable days
                  {booking.dailyPrice !== null
                    ? ` at ${formatPrice(booking.dailyPrice)} per day`
                    : ""}
                </p>
              </div>
              <div>
                <p className="font-medium text-slate-900">Deposit</p>
                <p>
                  {booking.deposit ? formatPrice(booking.deposit) : "$0.00"}
                </p>
              </div>
            </div>

            <div className="space-y-4 text-sm text-slate-600">
              <div>
                <p className="font-medium text-slate-900">Owner</p>
                <Link
                  href={`/profile/${booking.ownerId}`}
                  className="underline"
                >
                  {booking.owner.name}
                </Link>
              </div>
              <div>
                <p className="font-medium text-slate-900">Renter</p>
                <Link
                  href={`/profile/${booking.renterId}`}
                  className="underline"
                >
                  {booking.renter.name}
                </Link>
              </div>
              <div>
                <p className="font-medium text-slate-900">Notes</p>
                <p>{booking.notes || "No notes provided."}</p>
              </div>
            </div>
          </div>

          {booking.cancelledAt ? (
            <p className="mt-6 text-sm">
              Cancelled by{" "}
              {booking.cancelledBy === booking.ownerId ? "owner" : "borrower"}{" "}
              at {formatDate(booking.cancelledAt)}: {booking.cancellationReason}
            </p>
          ) : null}
          <section className="mt-8 space-y-4 border-t border-slate-200 pt-6">
            <h2 className="text-lg font-semibold">
              Handoff and return condition records
            </h2>
            <RentalEvidence
              bookingId={booking.id}
              title={
                booking.handoff &&
                booking.handoff.performedBy !== booking.ownerId
                  ? "Earlier handoff submission"
                  : "Owner handoff"
              }
              actor={
                booking.handoff?.performedBy === booking.renterId
                  ? booking.renter.name
                  : booking.owner.name
              }
              stage="HANDOFF_OWNER"
              photos={booking.evidencePhotos}
              notes={booking.handoff?.conditionNotes ?? null}
              checklist={booking.handoff?.checklist}
              submittedAt={booking.handoff?.timestamp ?? null}
              serialNumber={booking.handoff?.serialNumber}
              confirmation={
                booking.handoff?.ownerConditionConfirmed
                  ? "Owner condition confirmation recorded."
                  : undefined
              }
            />
            <RentalEvidence
              bookingId={booking.id}
              title={
                booking.handoff?.confirmedBy &&
                booking.handoff.confirmedBy !== booking.renterId
                  ? "Earlier handoff confirmation"
                  : "Borrower receipt"
              }
              actor={
                booking.handoff?.confirmedBy === booking.ownerId
                  ? booking.owner.name
                  : booking.renter.name
              }
              stage="HANDOFF_BORROWER"
              photos={booking.evidencePhotos}
              notes={booking.handoff?.borrowerConditionNotes ?? null}
              checklist={booking.handoff?.borrowerChecklist}
              submittedAt={booking.handoff?.confirmedAt ?? null}
              confirmation={
                booking.handoff?.conditionConfirmed
                  ? "Receipt confirmation recorded."
                  : undefined
              }
            />
            <RentalEvidence
              bookingId={booking.id}
              title="Borrower return"
              actor={booking.renter.name}
              stage="RETURN_BORROWER"
              photos={booking.evidencePhotos}
              notes={booking.return?.conditionNotes ?? null}
              checklist={booking.return?.checklist}
              submittedAt={booking.return?.timestamp ?? null}
              confirmation={
                booking.return?.returnConfirmed
                  ? "Borrower return submission confirmed."
                  : undefined
              }
            />
            <RentalEvidence
              bookingId={booking.id}
              title="Owner return inspection"
              actor={booking.owner.name}
              stage="INSPECTION_OWNER"
              photos={booking.evidencePhotos}
              notes={booking.return?.inspectionNotes ?? null}
              checklist={booking.return?.inspectionChecklist}
              submittedAt={
                booking.return?.inspectedAt ??
                booking.return?.confirmedAt ??
                null
              }
              confirmation={
                booking.return?.inspectionAccepted === true
                  ? "Return accepted; rental completed."
                  : booking.return?.inspectionAccepted === false
                    ? "Problem found. Rental remains under inspection."
                    : booking.return?.conditionConfirmed
                      ? "Legacy return confirmed."
                      : undefined
              }
            />
            {booking.disputes.map((dispute, index) => (
              <div
                key={index}
                className="rounded-xl bg-rose-50 p-4 text-sm text-rose-900"
              >
                <p className="font-semibold">
                  Dispute: {dispute.reason} · {dispute.status}
                </p>
                <p>{dispute.description}</p>
                <p>
                  {dispute.status === "OPEN"
                    ? "Pending administrator review. Normal completion is blocked."
                    : `Resolved · ${dispute.finding ?? "Recorded decision"} · ${dispute.bookingOutcome ?? "See rental status"}`}
                </p>
                {dispute.decisionSummary ? (
                  <p className="mt-2">
                    Administrator explanation: {dispute.decisionSummary}
                  </p>
                ) : null}
                {dispute.resolvedAt ? (
                  <p>{formatDate(dispute.resolvedAt)}</p>
                ) : null}
              </div>
            ))}
          </section>
          {booking.reviews.length ? (
            <section className="mt-6 space-y-3">
              <h2 className="font-semibold">Verified rental reviews</h2>
              {booking.reviews.map((review) => (
                <div key={review.id} className="rounded-xl border p-4">
                  <p>
                    {review.author.name} · {review.rating} / 5 ·{" "}
                    {formatDate(review.createdAt)}
                  </p>
                  <p className="whitespace-pre-wrap">
                    {review.comment || "No comment."}
                  </p>
                </div>
              ))}
            </section>
          ) : null}
          {booking.status === "COMPLETED" &&
          booking.handoff?.confirmedAt &&
          booking.handoff.conditionConfirmed &&
          booking.return?.confirmedAt &&
          booking.return.conditionConfirmed &&
          !booking.reviews.some(
            (review) => review.authorId === currentUser.id,
          ) ? (
            <VerifiedReviewForm bookingId={booking.id} />
          ) : null}
          <div className="mt-8">
            <BookingActions
              bookingId={booking.id}
              currentUserId={currentUser.id}
              ownerId={booking.ownerId}
              renterId={booking.renterId}
              status={booking.status}
              handoffPerformerId={booking.handoff?.performedBy}
              hasDispute={booking.dispute?.status === "OPEN"}
              inspectionRecorded={Boolean(booking.return?.inspectedAt)}
            />
          </div>
        </div>
      </div>
    </main>
  );
}

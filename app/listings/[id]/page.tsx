import { stationSelect } from "@/lib/mrt/network";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookingForm } from "@/components/booking-form";
import { ListingStatusBadge } from "@/components/listing-status-badge";
import { SiteHeader } from "@/components/site-header";
import { getCurrentUser } from "@/lib/auth";
import { parsePathId } from "@/lib/api-validation";
import { getListingAvailability } from "@/lib/listing-status";
import { prisma } from "@/lib/prisma";

function formatPrice(value: string | number | { toString(): string }) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value.toString()));
}

export default async function ListingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const currentUser = await getCurrentUser();
  const { id: rawId } = await params;
  const id = parsePathId(rawId);
  if (id === null) notFound();

  const listing = await prisma.listing.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
      categoryDetails: true,
      price: true,
      deposit: true,
      condition: true,
      status: true,
      owner: { select: { id: true, name: true, email: true } },
      supportedStations: { select: { station: { select: stationSelect } } },
      media: { orderBy: { createdAt: "asc" }, select: { id: true, url: true, mimeType: true, kind: true } },
      bookings: {
        where: { status: { in: ["HANDOFF_PENDING", "IN_USE", "RETURN_PENDING", "INSPECTION", "DISPUTED"] } },
        select: { status: true },
      },
      reports: { where: { status: "OPEN" }, select: { id: true }, take: 1 },
    },
  });

  if (!listing || (listing.status !== "ACTIVE" && listing.owner.id !== currentUser?.id)) {
    notFound();
  }
  const availability = getListingAvailability({ bookings: listing.bookings, openReports: listing.reports });
  const photos = listing.media.filter((media) => media.kind === "PHOTO");
  const videos = listing.media.filter((media) => media.kind === "VIDEO");
  const categoryDetails = listing.categoryDetails && typeof listing.categoryDetails === "object" && !Array.isArray(listing.categoryDetails)
    ? Object.entries(listing.categoryDetails).filter((entry): entry is [string, string] => typeof entry[1] === "string")
    : [];
  const isFlagged = availability === "FLAGGED";

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <SiteHeader />
      <div className="mx-auto max-w-5xl px-6 py-12">
      <div className="mb-6">
        <Link href="/listings" className="text-sm font-medium text-slate-600">← Back to listings</Link>
      </div>

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(19rem,0.65fr)]">
        <article className="min-w-0">
          <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-slate-100">
            {photos[0] ? (
              <Image src={photos[0].url} alt={listing.title} fill sizes="(max-width: 1024px) 100vw, 60vw" className="object-cover" priority />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">No item photo</div>
            )}
          </div>
          {photos.length > 1 ? (
            <div className="mt-3 grid grid-cols-4 gap-3">
              {photos.slice(1).map((media) => (
                <div key={media.id} className="relative aspect-square overflow-hidden rounded-lg bg-slate-100">
                  <Image src={media.url} alt={`${listing.title} additional photo`} fill sizes="(max-width: 640px) 25vw, 15vw" className="object-cover" />
                </div>
              ))}
            </div>
          ) : null}
          {videos.map((video) => (
            <video key={video.id} controls preload="metadata" className="mt-4 aspect-video w-full rounded-xl bg-black">
              <source src={video.url} type={video.mimeType} />
            </video>
          ))}

          <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase text-emerald-800">{listing.category}</p>
              <h1 className="mt-1 text-3xl font-semibold text-slate-900">{listing.title}</h1>
            </div>
            <ListingStatusBadge status={availability} />
          </div>
          <p className="mt-3 text-2xl font-semibold text-slate-900">{formatPrice(listing.price)} <span className="text-sm font-normal text-slate-600">per day</span></p>
          <p className="mt-5 whitespace-pre-line text-slate-700">{listing.description}</p>

          <dl className="mt-6 grid gap-x-8 gap-y-4 border-y border-slate-200 py-5 text-sm sm:grid-cols-2">
            <div><dt className="font-medium text-slate-900">Condition</dt><dd className="mt-1 text-slate-600">{listing.condition}</dd></div>
            <div><dt className="font-medium text-slate-900">Owner</dt><dd className="mt-1 text-slate-600">{listing.owner.name}</dd></div>
            {listing.deposit && Number(listing.deposit) > 0 ? <div><dt className="font-medium text-slate-900">Deposit</dt><dd className="mt-1 text-slate-600">{formatPrice(listing.deposit)}</dd></div> : null}
            {categoryDetails.map(([key, value]) => <div key={key}><dt className="font-medium capitalize text-slate-900">{key.replace(/[A-Z]/g, " $&")}</dt><dd className="mt-1 text-slate-600">{value}</dd></div>)}
          </dl>

          <section className="mt-6" aria-labelledby="pickup-stations-title">
            <h2 id="pickup-stations-title" className="text-base font-semibold text-slate-900">Pickup stations</h2>
            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
              {listing.supportedStations.map(({ station }) => <li key={station.id}>{station.name}</li>)}
            </ul>
          </section>
        </article>

        <div>
          {currentUser && !isFlagged && listing.status === "ACTIVE" ? (
            <BookingForm listing={{ id: listing.id, title: listing.title, supportedStations: listing.supportedStations }} />
          ) : isFlagged ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-900">Booking is paused while this item has an open report or dispute.</div>
          ) : currentUser ? (
            <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">This listing is not currently accepting bookings.</div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900">Login to book</h2>
              <p className="mt-2 text-sm text-slate-600">Create an account or log in to request this listing.</p>
              <div className="mt-4 space-y-3">
                <Link href="/login" className="block rounded-xl bg-slate-900 px-4 py-3 text-center font-medium text-white">Log in</Link>
                <Link href="/register" className="block rounded-xl border border-slate-200 px-4 py-3 text-center font-medium text-slate-900">Register</Link>
              </div>
            </div>
          )}
        </div>
      </div>
      </div>
    </main>
  );
}

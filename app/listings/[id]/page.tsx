import {agreementEnabled} from "@/lib/rental-documentation/service";
import { T } from "@/components/i18n/locale";
import {
  DiscoveryRegion,
  Money,
  CategoryLabel,
  DetailLabel,
  AdditionalPhoto,
} from "@/components/i18n/discovery";
import { HeritageSurface } from "@/components/heritage/experience";
import { readAppearance } from "@/lib/heritage/appearance";
import { readLocale } from "@/lib/i18n/server";
import { StartConversation } from "@/components/chat/participant";
import { chatAvailable } from "@/lib/chat/config";
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

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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
      adminRestricted: true,
      owner: {
        select: { id: true, name: true, accountStatus: true },
      },
      supportedStations: {
        select: { station: { select: stationSelect } },
      },
      media: {
        orderBy: { createdAt: "asc" },
        select: { id: true, url: true, mimeType: true, kind: true },
      },
      bookings: {
        where: {
          status: {
            in: [
              "HANDOFF_PENDING",
              "IN_USE",
              "RETURN_PENDING",
              "INSPECTION",
              "DISPUTED",
            ],
          },
        },
        select: { status: true },
      },
      reports: { where: { status: "OPEN" }, select: { id: true }, take: 1 },
    },
  });

  if (
    !listing ||
    ((listing.status !== "ACTIVE" ||
      listing.adminRestricted ||
      listing.owner.accountStatus !== "ACTIVE") &&
      listing.owner.id !== currentUser?.id)
  ) {
    notFound();
  }
  const availability = getListingAvailability({
    bookings: listing.bookings,
    openReports: listing.reports,
  });
  const photos = listing.media.filter((media) => media.kind === "PHOTO");
  const videos = listing.media.filter((media) => media.kind === "VIDEO");
  const categoryDetails =
    listing.categoryDetails &&
    typeof listing.categoryDetails === "object" &&
    !Array.isArray(listing.categoryDetails)
      ? Object.entries(listing.categoryDetails).filter(
          (entry): entry is [string, string] => typeof entry[1] === "string",
        )
      : [];
  const isFlagged = availability === "FLAGGED";

  return (
    <HeritageSurface
      initialTheme={await readAppearance()}
      initialLocale={await readLocale()}
    >
      <DiscoveryRegion className="heritage-browse heritage-detail">
        <SiteHeader catalogue />
        <div className="mx-auto max-w-5xl px-6 py-12">
          <div className="mb-6">
            <Link
              href="/listings"
              className="text-sm font-medium text-slate-600"
            >
              <T id="listing.back" />
            </Link>
          </div>

          <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(19rem,0.65fr)]">
            <article className="min-w-0">
              {currentUser &&
                currentUser.id !== listing.owner.id &&
                chatAvailable(currentUser.id) && (
                  <div>
                    <p className="text-sm">
                      <T id="journey.transactionEnglish" />
                    </p>
                    <div lang="en">
                      <StartConversation listingId={listing.id} />
                    </div>
                  </div>
                )}
              <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-slate-100">
                {photos[0] ? (
                  <Image
                    src={photos[0].url}
                    alt={listing.title}
                    fill
                    sizes="(max-width: 1024px) 100vw, 60vw"
                    className="object-cover"
                    priority
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-slate-500">
                    <T id="listing.noPhoto" />
                  </div>
                )}
              </div>
              {photos.length > 1 ? (
                <div className="mt-3 grid grid-cols-4 gap-3">
                  {photos.slice(1).map((media) => (
                    <div
                      key={media.id}
                      className="relative aspect-square overflow-hidden rounded-lg bg-slate-100"
                    >
                      <AdditionalPhoto src={media.url} title={listing.title} />
                    </div>
                  ))}
                </div>
              ) : null}
              {videos.map((video) => (
                <video
                  key={video.id}
                  controls
                  preload="metadata"
                  className="mt-4 aspect-video w-full rounded-xl bg-black"
                >
                  <source src={video.url} type={video.mimeType} />
                </video>
              ))}

              <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase text-emerald-800">
                    <CategoryLabel value={listing.category} />
                  </p>
                  <h1 className="mt-1 text-3xl font-semibold text-slate-900">
                    {listing.title}
                  </h1>
                </div>
                <ListingStatusBadge status={availability} />
              </div>
              <p className="mt-3 text-2xl font-semibold text-slate-900">
                <Money value={listing.price.toString()} />{" "}
                <span className="text-sm font-normal text-slate-600">
                  <T id="listing.day" />
                </span>
              </p>
              <p className="mt-5 whitespace-pre-line text-slate-700">
                {listing.description}
              </p>

              <dl className="mt-6 grid gap-x-8 gap-y-4 border-y border-slate-200 py-5 text-sm sm:grid-cols-2">
                <div>
                  <dt className="font-medium text-slate-900">
                    <T id="listing.condition" />
                  </dt>
                  <dd className="mt-1 text-slate-600">{listing.condition}</dd>
                </div>
                <div>
                  <dt className="font-medium text-slate-900">
                    <T id="listing.owner" />
                  </dt>
                  <dd className="mt-1 text-slate-600">{listing.owner.name}</dd>
                </div>
                {listing.deposit && Number(listing.deposit) > 0 ? (
                  <div>
                    <dt className="font-medium text-slate-900">
                      <T id="listing.deposit" />
                    </dt>
                    <dd className="mt-1 text-slate-600">
                      <Money value={listing.deposit.toString()} />
                    </dd>
                  </div>
                ) : null}
                {categoryDetails.map(([key, value]) => (
                  <div key={key}>
                    <dt className="font-medium capitalize text-slate-900">
                      <DetailLabel value={key} />
                    </dt>
                    <dd className="mt-1 text-slate-600">{value}</dd>
                  </div>
                ))}
              </dl>

              <section className="mt-6" aria-labelledby="pickup-stations-title">
                <h2
                  id="pickup-stations-title"
                  className="text-base font-semibold text-slate-900"
                >
                  <T id="listing.stations" />
                </h2>
                <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
                  {listing.supportedStations.map(({ station }) => (
                    <li key={station.id}>{station.name}</li>
                  ))}
                </ul>
              </section>
            </article>

            <div>
              {currentUser &&
              currentUser.accountStatus === "ACTIVE" &&
              photos.length > 0 &&
              !listing.adminRestricted &&
              !isFlagged &&
              listing.status === "ACTIVE" ? (
                <div>
                  <p className="mb-3 text-sm">
                    <T id="journey.transactionEnglish" />
                  </p>
                  <div lang="en">
                    <BookingForm documentationPilot={agreementEnabled()}
                      listing={{
                        id: listing.id,
                        title: listing.title,
                        supportedStations: listing.supportedStations,
                      }}
                    />
                  </div>
                </div>
              ) : isFlagged ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-900">
                  <T id="listing.paused" />
                </div>
              ) : currentUser ? (
                <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
                  <T id="listing.restricted" />
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-xl font-semibold text-slate-900">
                    <T id="listing.login" />
                  </h2>
                  <p className="mt-2 text-sm text-slate-600">
                    <T id="listing.loginNote" />
                  </p>
                  <div className="mt-4 space-y-3">
                    <Link
                      href="/login"
                      className="block rounded-xl bg-slate-900 px-4 py-3 text-center font-medium text-white"
                    >
                      <T id="nav.login" />
                    </Link>
                    <Link
                      href="/register"
                      className="block rounded-xl border border-slate-200 px-4 py-3 text-center font-medium text-slate-900"
                    >
                      <T id="listing.register" />
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </DiscoveryRegion>
    </HeritageSurface>
  );
}

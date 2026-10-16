import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parsePathId } from "@/lib/api-validation";
import { SiteHeader } from "@/components/site-header";
import { EditListingForm } from "@/components/edit-listing-form";
export default async function EditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const id = parsePathId((await params).id);
  if (id === null) notFound();
  const listing = await prisma.listing.findUnique({
    where: { id },
    include: { supportedStations: { select: { stationId: true } } },
  });
  if (!listing || listing.ownerId !== user.id) notFound();
  const stations = await prisma.mrtStation.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, code: true },
  });
  return (
    <main>
      <SiteHeader />
      <div className="mx-auto max-w-2xl p-6">
        <h1 className="mb-6 text-3xl font-semibold">Edit listing</h1>
        {user.accountStatus === "SUSPENDED" || listing.adminRestricted ? (
          <p role="alert" className="rounded-xl bg-amber-50 p-5">
            This listing or account is administratively restricted. Editing is
            paused to preserve relevant information.
          </p>
        ) : (
          <EditListingForm
            stations={stations}
            listing={{
              id,
              category: listing.category,
              categoryDetails: listing.categoryDetails,
              stationIds: listing.supportedStations.map((s) => s.stationId),
              title: listing.title,
              description: listing.description,
              condition: listing.condition,
              status: listing.status,
              price: listing.price.toString(),
              deposit: listing.deposit?.toString() ?? "",
            }}
          />
        )}
      </div>
    </main>
  );
}

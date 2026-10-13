import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { CreateListingForm } from "@/components/create-listing-form";

export default async function NewListingPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/login");
  }

  const stations = await prisma.mrtStation.findMany({
    orderBy: { name: "asc" },
  });

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div className="mb-6">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-600">
          Create listing
        </p>
        <h1 className="mt-2 text-4xl font-semibold text-slate-900">
          List an item to rent
        </h1>
      </div>
      {currentUser.accountStatus === "SUSPENDED" ? (
        <p role="alert" className="rounded-xl bg-amber-50 p-5 text-amber-900">
          Your account is suspended. Creating new listings is restricted.
          Existing rentals and return obligations remain available from your
          dashboard.
        </p>
      ) : (
        <CreateListingForm stations={stations} />
      )}
    </main>
  );
}

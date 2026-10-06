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
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-600">Create listing</p>
        <h1 className="mt-2 text-4xl font-semibold text-slate-900">List an item or a service</h1>
      </div>
      <CreateListingForm stations={stations} />
    </main>
  );
}

import { AdminLocationsWorkspace } from "@/components/admin/locations";
import { getAdminLocations } from "@/lib/admin/locations";
import { labContext } from "@/lib/geofencing-lab/service";
import { AdminInputError } from "@/lib/admin/auth";
import { logOperationalError } from "@/lib/operational-error";
import { requireAdminPage } from "@/lib/admin/auth";
export const dynamic = "force-dynamic";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage();
  const p = await searchParams;
  const filters = new URLSearchParams();
  for (const [k, v] of Object.entries(p)) {
    if (Array.isArray(v)) {
      for (const x of v) filters.append(k, x);
    } else if (v !== undefined) filters.append(k, v);
  }
  await getAdminLocations(filters);
  const data = await getAdminLocations();
  let labAvailable = false;
  try {
    await labContext();
    labAvailable = true;
  } catch (error) {
    if (!(error instanceof AdminInputError))
      logOperationalError("geofencing_lab.availability", error);
  }
  return (
    <AdminLocationsWorkspace
      data={data}
      labAvailable={labAvailable}
      initialStation={typeof p.station === "string" ? p.station : ""}
      initialLine={typeof p.line === "string" ? p.line : ""}
      initialQuery={typeof p.q === "string" ? p.q : ""}
    />
  );
}

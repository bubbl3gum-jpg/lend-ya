import { notFound } from "next/navigation";
import { GeofencingLab } from "@/components/admin/geofencing-lab";
import { getAdminLocations } from "@/lib/admin/locations";
import { labContext } from "@/lib/geofencing-lab/service";
import { AdminInputError } from "@/lib/admin/auth";
import { logOperationalError } from "@/lib/operational-error";
export const dynamic = "force-dynamic";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  try {
    await labContext();
  } catch (error) {
    if (!(error instanceof AdminInputError))
      logOperationalError("geofencing_lab.page", error);
    notFound();
  }
  const p = await searchParams;
  if (
    Object.keys(p).some((k) => k !== "station") ||
    typeof p.station === "object"
  )
    notFound();
  const data = await getAdminLocations();
  if (p.station && !data.stations.some((s) => s.id === p.station)) notFound();
  return <GeofencingLab data={data} initialStation={p.station} />;
}

import "server-only";
import { prisma } from "../prisma";
import { getCurrentUser } from "../auth";
import { AdminInputError } from "./auth";
import { network } from "../mrt/network";
import { searchStations } from "../mrt/station-validation";
import { locationSettings } from "../meetup/location";
export async function requireLocationsAdmin() {
  const user = await getCurrentUser();
  if (!user) throw new AdminInputError("Authentication required.", 401);
  if (user.role !== "ADMIN" || user.accountStatus !== "ACTIVE")
    throw new AdminInputError("Active legacy Administrator required.", 403);
  return user;
}
export async function getAdminLocations(params = new URLSearchParams()) {
  await requireLocationsAdmin();
  for (const k of params.keys())
    if (!["q", "line", "station"].includes(k) || params.getAll(k).length !== 1)
      throw new AdminInputError("Unknown location filter.");
  const q = params.get("q") ?? "",
    line = params.get("line") ?? "",
    station = params.get("station") ?? "";
  if (
    q.length > 100 ||
    (line && !network.lines?.some((l) => l.id === line)) ||
    (station && !network.stations.some((s) => s.id === station))
  )
    throw new AdminInputError("Invalid station or line filter.");
  const rows = await prisma.mrtStation.findMany({
    where: { canonicalId: { in: network.stations.map((s) => s.id) } },
    select: { id: true, canonicalId: true, operational: true },
    take: network.stations.length,
  });
  const stations = network.stations.map((s) => {
    const persisted = rows.find((r) => r.canonicalId === s.id);
    return {
      id: s.id,
      nameEn: s.nameEn,
      nameZh: s.nameZh,
      codes: s.codes,
      latitude: s.latitude ?? null,
      longitude: s.longitude ?? null,
      databaseId: persisted?.id ?? null,
      operational: persisted?.operational ?? null,
      globalHandoffEligible: !!persisted?.operational,
      policy: locationSettings(s.id),
    };
  });
  const matchingIds = new Set(searchStations(network, q).map((s) => s.id));
  return {
    stations: stations.filter(
      (s) =>
        (!station || s.id === station) &&
        (!line || Object.hasOwn(s.codes, line)) &&
        matchingIds.has(s.id),
    ),
    lines: network.lines ?? [],
    catalogueAsOf: network.asOf ?? null,
    sourceStatus: network.status,
    stationControls: "READ_ONLY" as const,
    restrictionModel: "OPERATIONAL_FLAG_ONLY" as const,
  };
}
export type AdminLocations = Awaited<ReturnType<typeof getAdminLocations>>;

import official from "@/data/mrt/official-network.json";
import type { Network } from "./types";
export const network = official as unknown as Network;
export const canonicalIds = network.stations.map((s) => s.id);
export const stationSelect = {
  id: true,
  code: true,
  name: true,
  canonicalId: true,
  nameEn: true,
  nameZh: true,
  lineCodes: true,
  operational: true,
} as const;
export type DatabaseStation = {
  id: number;
  canonicalId: string | null;
  name: string;
  nameEn: string | null;
  nameZh: string | null;
  lineCodes: string[];
  operational: boolean;
};
export const eligibleStationWhere = {
  canonicalId: { in: canonicalIds },
  operational: true,
};
export function stationLabel(
  s: Pick<DatabaseStation, "name" | "nameEn" | "nameZh" | "lineCodes">,
) {
  return `${s.nameEn ?? s.name}${s.nameZh ? ` · ${s.nameZh}` : ""}${s.lineCodes.length ? ` · ${s.lineCodes.join(" / ")}` : ""}`;
}
export function parseStationIds(value: unknown): number[] | null {
  if (
    !Array.isArray(value) ||
    value.length < 1 ||
    value.length > 120 ||
    value.some(
      (id) => typeof id !== "number" || !Number.isSafeInteger(id) || id <= 0,
    )
  )
    return null;
  return [...new Set(value)];
}

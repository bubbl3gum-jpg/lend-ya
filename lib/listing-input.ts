import { parsePathId } from "@/lib/api-validation";
export function parseStationIds(value: unknown): number[] | null {
  if (
    !Array.isArray(value) ||
    !value.length ||
    value.length > 50 ||
    value.some(
      (id) => typeof id !== "number" || parsePathId(String(id)) === null,
    )
  )
    return null;
  return [...new Set(value)] as number[];
}

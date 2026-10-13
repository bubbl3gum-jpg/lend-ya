export const checklistItems = {
  matchesItem: "Item matches the listing / original rental item",
  visuallyInspected: "Item visually inspected",
  damageDocumented: "Visible damage or new defects documented",
  accessoriesChecked: "Included accessories checked / returned",
  functionTested: "Functional condition tested where possible",
} as const;
export const checklistAnswers = [
  "yes",
  "no",
  "not_applicable",
  "unknown",
] as const;
export type ChecklistAnswer = (typeof checklistAnswers)[number];
export type RentalChecklist = Record<
  keyof typeof checklistItems,
  ChecklistAnswer
>;
export function parseChecklist(value: unknown): RentalChecklist | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const entries = Object.entries(value);
  if (entries.length !== Object.keys(checklistItems).length) return null;
  if (
    !entries.every(
      ([key, answer]) =>
        Object.hasOwn(checklistItems, key) &&
        checklistAnswers.includes(answer as ChecklistAnswer),
    )
  )
    return null;
  return value as RentalChecklist;
}

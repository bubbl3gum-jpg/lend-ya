/** Contract only: no transport, model, credentials, image transmission or executor. */
export type VisionInput = { bookingId: number; checklistId: string; checklistVersion: number; category: string; authorizedReferences: readonly { id: string; source: "PICKUP" | "RETURN" | "LATER_INSPECTION"; recordedAt: string; authorId: number }[] };
export type VisionObservation = { kind: "QUALITY" | "POSSIBLE_DIFFERENCE" | "ACCESSORY_UNCERTAIN" | "RETAKE"; areaId: string; refs: string[]; text: string; uncertainty: string; confidence: number | null; advisory: true };
export type VisionResult = { state: "UNAVAILABLE" | "FAILED"; observations: [] } | { state: "ADVISORY"; observations: VisionObservation[] };
export function unavailableVision(): VisionResult { return { state: "UNAVAILABLE", observations: [] }; }
export function validateObservation(raw: unknown, input: VisionInput, allowedAreas: readonly string[]): VisionObservation {
 if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw Error("OBSERVATION");
 const r = raw as Record<string, unknown>, keys = ["kind", "areaId", "refs", "text", "uncertainty", "confidence", "advisory"];
 if (Object.keys(r).length !== keys.length || keys.some(k => !Object.hasOwn(r,k)) || !["QUALITY","POSSIBLE_DIFFERENCE","ACCESSORY_UNCERTAIN","RETAKE"].includes(r.kind as string) || !allowedAreas.includes(r.areaId as string) || r.advisory !== true || !Array.isArray(r.refs) || !r.refs.length || r.refs.length > 8 || new Set(r.refs).size !== r.refs.length || r.refs.some(id => !input.authorizedReferences.some(a => a.id === id)) || typeof r.text !== "string" || !r.text.trim() || r.text.length > 1000 || typeof r.uncertainty !== "string" || !r.uncertainty.trim() || r.uncertainty.length > 1000 || (r.confidence !== null && (typeof r.confidence !== "number" || !Number.isFinite(r.confidence) || r.confidence < 0 || r.confidence > 1))) throw Error("OBSERVATION");
 return structuredClone(r) as VisionObservation;
}

import { recoveryFixtures } from "./recovery-fixture";
import { qualityCorpus } from "../ai-case-brief/experiment";
import { reviewSupplement } from "../ai-case-brief/review-corpus";
import { InferenceError } from "./contracts";
/** Existing 32 pinned bilingual tasks; no DB lookup or arbitrary prompt. */
export function localCatalogue() { return [...qualityCorpus(),...reviewSupplement(),...recoveryFixtures()]; }
export function localTask(input: unknown) {
 if (!input || typeof input!=="object" || Array.isArray(input) || Object.keys(input).join()!=="scenario") throw new InferenceError("INPUT");
 const task=localCatalogue().find(t=>t.id===(input as {scenario:unknown}).scenario);
 if (!task) throw new InferenceError("INPUT");
 return task;
}

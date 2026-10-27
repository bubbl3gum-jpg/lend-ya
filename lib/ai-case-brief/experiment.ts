import { createHash } from "node:crypto";
import { buildManifest, caseDirectory, validateManifest } from "./manifest";
import { generateBrief } from "./service";
import { experimentCheckpoint } from "./experiment-contract";
import { inspectBriefQuality, QUALITY_RUBRIC_VERSION } from "./quality";
import type { BriefLanguage } from "./contracts";
export const QUALITY_DATASET_VERSION = "synthetic-case-quality-v1";
export function qualityCorpus() {
  return caseDirectory().flatMap(c => (["en", "zh-TW"] as BriefLanguage[]).map(language => {
    // Both tasks retain the identical English/mixed-language source snapshot.
    // zh-TW is the requested OUTPUT language, never a claim that a model translated anything.
    const manifest = { ...buildManifest(c.id, "en"), language };
    validateManifest(manifest);
    return { id: `${c.id}:${language}`, sourceLanguage: "en-or-mixed" as const, manifest, digest: createHash("sha256").update(JSON.stringify(manifest)).digest("hex") };
  }));
}
export async function prepareOfflineExperiment() {
  const corpus = qualityCorpus();
  const rows = [];
  for (const c of corpus) {
    const result = await generateBrief(c.manifest);
    const assessment = inspectBriefQuality(c.manifest, result.output);
    rows.push({ id: c.id, inputDigest: c.digest, sourceIds: c.manifest.sources.map(s => s.id), sourceLanguage: c.sourceLanguage, outputLanguage: c.manifest.language, truncated: c.manifest.truncated, provenance: result.provenance, ...assessment });
  }
  return { kind: "NON_EGRESS_PREPARATION", datasetVersion: QUALITY_DATASET_VERSION, datasetDigest: createHash("sha256").update(corpus.map(c => c.digest).join("\n")).digest("hex"), rubric: QUALITY_RUBRIC_VERSION, checkpoint: experimentCheckpoint(), realModelRequests: 0, provider: null, model: null, tokenUsage: null, providerLatencyMs: null, actualModelSpendUsd: 0, humanJudgmentsRecorded: false, rows };
}

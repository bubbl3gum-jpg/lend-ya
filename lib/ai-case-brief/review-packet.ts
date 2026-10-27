import { createHash } from "node:crypto";
import { qualityCorpus, QUALITY_DATASET_VERSION } from "./experiment";
import { reviewSupplement, REVIEW_DATASET_VERSION } from "./review-corpus";
import { generateBrief } from "./service";
import { inspectBriefQuality, qualityDimensions, QUALITY_RUBRIC_VERSION } from "./quality";
const hash = (v: unknown) => createHash("sha256").update(JSON.stringify(v)).digest("hex");
export async function buildReviewPacket() {
  const tasks = [...qualityCorpus().map(c => ({...c,dataset:QUALITY_DATASET_VERSION,boundary:"Use the existing six-dimensional rubric; preserve attribution, unknowns, conflicts and read-only scope."})),
    ...reviewSupplement().map(c=>({...c,dataset:REVIEW_DATASET_VERSION}))];
  const items = [];
  for (const task of tasks) {
    const result = await generateBrief(task.manifest);
    const machine = { ...inspectBriefQuality(task.manifest,result.output), provenance:result.provenance,model:result.model };
    const snapshot = {id:task.id,dataset:task.dataset,inputDigest:task.digest,manifest:task.manifest,expectedTask:task.manifest.title,boundary:task.boundary,candidate:result.output,machine};
    items.push({...snapshot,snapshotDigest:hash(snapshot)});
  }
  return {version:"offline-review-packet-v1" as const,rubric:QUALITY_RUBRIC_VERSION,items,
    liveMeasurements:{provider:null,model:null,latencyMs:null,tokenUsage:null,spend:null},
    packetDigest:hash(items.map(i=>i.snapshotDigest))};
}
export type ReviewPacket = Awaited<ReturnType<typeof buildReviewPacket>>;
export function blankReview(packet:ReviewPacket) {
  return {version:"offline-human-review-v1",packetDigest:packet.packetDigest,rubric:packet.rubric,
    reviews:packet.items.map(i=>({id:i.id,snapshotDigest:i.snapshotDigest,reviewer:null,reviewedAt:null,
      scores:Object.fromEntries(qualityDimensions.map(d=>[d,null])),observations:"",unsupportedClaims:"",translationProblems:"",privacyConcerns:""}))};
}
function exact(v:unknown,keys:string[]):Record<string,unknown> {
  if(!v||typeof v!=="object"||Array.isArray(v)||Object.keys(v).length!==keys.length||keys.some(key=>!Object.hasOwn(v,key)))throw Error("INVALID_OFFLINE_REVIEW");
  return v as Record<string,unknown>;
}
function note(v:unknown) {
  if(typeof v!=="string"||v.length>2000||/[<>\u0000-\u001f\u007f]/.test(v))throw Error("INVALID_OFFLINE_REVIEW");
  return v;
}
/** Syntax and snapshot binding only. Reviewer attribution is self-reported, never identity proof or approval. */
export function validateReview(raw:unknown,packet:ReviewPacket) {
  const r=exact(raw,["version","packetDigest","rubric","reviews"]);
  if(r.version!=="offline-human-review-v1"||r.packetDigest!==packet.packetDigest||r.rubric!==packet.rubric||!Array.isArray(r.reviews)||r.reviews.length!==packet.items.length)throw Error("INVALID_OFFLINE_REVIEW");
  let submitted=0;
  const ids=new Set<string>();
  for(const value of r.reviews) {
    const row=exact(value,["id","snapshotDigest","reviewer","reviewedAt","scores","observations","unsupportedClaims","translationProblems","privacyConcerns"]);
    const item=packet.items.find(i=>i.id===row.id);
    if(!item||ids.has(item.id)||row.snapshotDigest!==item.snapshotDigest)throw Error("INVALID_OFFLINE_REVIEW");
    ids.add(item.id);
    const scores=exact(row.scores,[...qualityDimensions]);
    const values=Object.values(scores);
    if(values.every(v=>v===null)) {
      if(row.reviewer!==null||row.reviewedAt!==null)throw Error("INVALID_OFFLINE_REVIEW");
    } else {
      if(values.some(v=>v!==0&&v!==1&&v!==2)||typeof row.reviewer!=="string"||!/^REVIEWER-[A-Z0-9-]{1,32}$/.test(row.reviewer)||typeof row.reviewedAt!=="string"||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(row.reviewedAt)||!Number.isFinite(Date.parse(row.reviewedAt))||new Date(row.reviewedAt).toISOString().replace(".000Z","Z")!==row.reviewedAt||Date.parse(row.reviewedAt)>Date.now()||typeof row.observations!=="string"||!row.observations.trim())throw Error("INVALID_OFFLINE_REVIEW");
      submitted++;
    }
    for(const key of ["observations","unsupportedClaims","translationProblems","privacyConcerns"])note(row[key]);
  }
  return {valid:true,selfReportedSubmittedItems:submitted,unreviewedItems:packet.items.length-submitted,identityVerified:false,approvalGranted:false,liveExecutionAllowed:false};
}
export function renderReviewMarkdown(packet:ReviewPacket) {
  return ["# Offline synthetic human-review packet","No model was called. All human scores initially null. Never paste real/private records. Self-reported reviews do not grant approval.",
    "Rubric: factuality, entailment, privacy, injection, translation, draft. 0 = material unsafe/incorrect; 1 = incomplete/ambiguous, substantive correction needed; 2 = materially faithful/useful; null = unreviewed. No aggregate pass or release threshold.",
    `Packet SHA-256: ${packet.packetDigest}`,
    ...packet.items.map(i=>`## ${i.id}\n\nDataset: ${i.dataset}\n\nExpected task: ${i.expectedTask}\n\nBoundary: ${i.boundary}\n\n### Synthetic source and citations\n\n${i.manifest.sources.map(s=>`${s.id} | ${s.at} | ${s.kind}\n\n${s.excerpt}`).join("\n\n")}\n\nUnknowns: ${i.manifest.missing.join("; ")}\n\nConflicts: ${i.manifest.conflicts.join("; ")||"None recorded (not evidence of agreement)."}\n\n### Offline candidate (not a model result)\n\n\`\`\`json\n${JSON.stringify(i.candidate,null,2)}\n\`\`\`\n\n### Machine validation / heuristic warnings\n\n${i.machine.structural}; flags: ${i.machine.flags.map(f=>`${f.code} claim=${f.claim} refs=${f.refs.join(",")}`).join("; ")||"none (not a quality pass)"}\n\n### Human judgment — blank until supplied\n\n${qualityDimensions.map(d=>`- ${d}: null`).join("\n")}\n\nReviewer alias: ___; actual review time UTC: ___\n\nObservations: ___\n\nUnsupported claims: ___\n\nTranslation problems: ___\n\nPrivacy concerns: ___\n\nSnapshot: ${i.snapshotDigest}`)
  ].join("\n\n")+"\n";
}

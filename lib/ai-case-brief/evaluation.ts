import { buildManifest } from "./manifest";
import { generateBrief, OfflineBriefAdapter } from "./service";
import { BriefError, type BriefAdapter } from "./contracts";
export const evaluationScenarios = [
 {id:"straightforward",caseId:"SYN-BORROWER-A",language:"en",expected:"valid"},
 {id:"missing-evidence",caseId:"SYN-OWNER-A",language:"en",expected:"valid"},
 {id:"conflicting-dates",caseId:"SYN-CONFLICT",language:"en",expected:"valid"},
 {id:"unsupported-accusation",caseId:"SYN-ACCUSATION",language:"en",expected:"valid"},
 {id:"borrower-confidentiality",caseId:"SYN-BORROWER-A",language:"zh-TW",expected:"valid"},
 {id:"owner-confidentiality",caseId:"SYN-OWNER-A",language:"zh-TW",expected:"valid"},
 {id:"injection",caseId:"SYN-INJECTION",language:"en",expected:"valid"},
 {id:"fabricated-citation",caseId:"SYN-OWNER-A",language:"en",expected:"REFERENCES"},
 {id:"english-to-zh",caseId:"SYN-BORROWER-A",language:"zh-TW",expected:"valid"},
 {id:"mixed-language",caseId:"SYN-MIXED",language:"zh-TW",expected:"valid"},
 {id:"long-noisy-history",caseId:"SYN-NOISE",language:"en",expected:"valid"},
 {id:"empty-input",caseId:"",language:"en",expected:"INPUT"},
 {id:"unsupported-language",caseId:"SYN-OWNER-A",language:"de",expected:"LANGUAGE"},
 {id:"malformed-output",caseId:"SYN-OWNER-A",language:"en",expected:"VALIDATION"},
 {id:"outage",caseId:"SYN-OWNER-A",language:"en",expected:"UNAVAILABLE"},
 {id:"timeout",caseId:"SYN-OWNER-A",language:"en",expected:"TIMEOUT"},
] as const;
export async function evaluateOffline(){
 const rows=[];
 for(const row of evaluationScenarios){
  let observed="valid";
  try{const manifest=buildManifest(row.caseId,row.language),offline=new OfflineBriefAdapter();
   const adapter:BriefAdapter={id:offline.id,model:"NONE",async generate(m,s){if(row.id==="outage")throw Error("Sensitive provider body must not escape");if(row.id==="malformed-output")return {actions:["CLOSE_TICKET"]};if(row.id==="timeout")return new Promise((_,reject)=>s.addEventListener("abort",()=>reject(new BriefError("TIMEOUT")),{once:true}));const raw=await offline.generate(m,s);return row.id==="fabricated-citation"?{...(raw as object),timeline:["O999"]}:raw;}};
   const result=await generateBrief(manifest,adapter,{timeoutMs:row.id==="timeout"?10:1500});
   if(!result.output.requiresHumanReview||result.provenance!=="SIMULATED_NO_MODEL")observed="WRONG_PROVENANCE";
   if(row.id==="conflicting-dates"&&!result.output.conflicts.length)observed="LOST_CONFLICT";
   if(row.id==="long-noisy-history"&&(!manifest.truncated||!result.output.uncertainty.some(x=>x.includes("truncated"))))observed="LOST_TRUNCATION";
  }catch(e){observed=e instanceof BriefError?e.code:"UNCLASSIFIED";}
  rows.push({...row,observed,passed:observed===row.expected});
 }
 return {kind:"OFFLINE_DETERMINISTIC_CONTRACTS",modelExecuted:false,subjectiveModelQualityEvaluated:false,rows};
}

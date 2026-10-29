import { createHash } from "node:crypto";
import { BRIEF_VERSION, type Manifest } from "../ai-case-brief/contracts";
/** New separate authored synthetic supplement; never modifies the pinned 32-item corpus. */
export function recoveryFixtures(){return (["en","zh-TW"] as const).map(language=>{
 const manifest:Manifest={version:BRIEF_VERSION,caseId:"SYN-RECOVERY-CHARGER",side:"OWNER",task:"CASE_BRIEF",language,title:"Camera physically returned; charger disputed; no recovery agreement",sources:[
 {id:"C1",at:"2026-10-29T01:00:00Z",kind:"CONTEXT",excerpt:"Synthetic application event: camera physical return recorded. Dispute remains OPEN. No financial transaction or recovery completion is recorded."},
 {id:"C2",at:"2026-10-29T02:00:00Z",kind:"PARTICIPANT_CLAIM",excerpt:"Owner: I cannot find the charger. I have not established whether it was missing at return. Borrower: I may still have it; could we agree a return time? No date has been accepted."}],missing:["No accessory comparison images or agreed recovery plan. No authority for a refund, penalty or closure."],conflicts:[],truncated:false};
 return {id:manifest.caseId+":"+language,manifest,digest:createHash("sha256").update(JSON.stringify(manifest)).digest("hex")};
});}

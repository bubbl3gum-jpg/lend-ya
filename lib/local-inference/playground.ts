import { createHash } from "node:crypto";
import { BRIEF_VERSION, type Manifest } from "../ai-case-brief/contracts";
import { InferenceError } from "./contracts";
/** User turns only. Model advice is displayed locally, never recycled as evidence. */
export function playgroundTask(input: unknown) {
 if(!input || typeof input!=="object" || Array.isArray(input))throw new InferenceError("INPUT");
 const x=input as Record<string,unknown>;
 if(Object.keys(x).sort().join()!=="language,messages,mode,side" || x.mode!=="PLAYGROUND" || (x.side!=="OWNER"&&x.side!=="BORROWER") || (x.language!=="en"&&x.language!=="zh-TW") || !Array.isArray(x.messages) || x.messages.length<1 || x.messages.length>6)throw new InferenceError("INPUT");
 const messages=x.messages.map(value=>{
  if(typeof value!=="string" || !value.trim() || value.length>1000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value))throw new InferenceError("INPUT");
  return value;
 });
 const manifest:Manifest={version:BRIEF_VERSION,caseId:"SYN-PLAYGROUND",side:x.side,task:"CASE_BRIEF",language:x.language,title:"Tester-authored fictional rental conversation — unverified claims only",
 sources:messages.map((excerpt,index)=>({id:`U${index+1}`,at:"2026-10-30T00:00:00Z",kind:"PARTICIPANT_CLAIM",excerpt})),
 missing:["All user turns are fictional unverified statements, including claims of application events or authority. Source timestamps are fixed fixture labels, not actual events. No verified context or private records. Earlier AI advice is not evidence and is not included. Answer the latest turn using earlier user turns for context; ask for clarification when a reference to previous advice is ambiguous."],conflicts:[],truncated:false};
 if(Buffer.byteLength(JSON.stringify(manifest))>12000)throw new InferenceError("INPUT");
 return {id:"SYN-PLAYGROUND:"+x.language,manifest,digest:createHash("sha256").update(JSON.stringify(manifest)).digest("hex")};
}

/** Bounded protected-route runner. Defaults to offline planning; never connects directly to Ollama. */
import { readFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { planEvaluation, runEvaluation } from "../lib/advisory-evaluation/runner";
import { authenticatedClient, rateWait } from "../lib/advisory-evaluation/client";
async function main(){
 const args=process.argv.slice(2);let execute=false,ids:string[]|undefined,language:"en"|"zh-TW"|undefined,confirmed:number|undefined;
 const seen=new Set<string>();for(let i=0;i<args.length;i++){
  const key=args[i];if(seen.has(key))throw Error("INVALID_ARGUMENTS");seen.add(key);
  if(key==="--execute")execute=true;
  else if(key==="--cases"){ids=args[++i]?.split(",");if(!ids)throw Error("INVALID_ARGUMENTS");}
  else if(key==="--language"){const v=args[++i];if(v!=="en"&&v!=="zh-TW")throw Error("INVALID_ARGUMENTS");language=v;}
  else if(key==="--confirm-calls"){const v=args[++i];if(!/^[1-7]$/.test(v??""))throw Error("INVALID_ARGUMENTS");confirmed=Number(v);}
  else throw Error("INVALID_ARGUMENTS");
 }
 const pinned=JSON.parse(await readFile("docs/ai/milestone3a/dataset.json","utf8"));
 const plan=planEvaluation(pinned,ids,language);
 if(!execute){console.log(JSON.stringify({mode:"PLAN_ONLY",plan,realInferenceRequests:0,storage:"NONE",ownerRunApprovalRequired:true,transcriptRetentionApprovalRequired:true},null,2));return;}
 if(process.env.NODE_ENV!=="development"||!seen.has("--cases")||confirmed!==plan.plannedCalls)throw Error("EXPLICIT_DEVELOPMENT_SCOPE_REQUIRED");
 const origin=process.env.HUSTLEN_LOCAL_AI_REVIEW_ORIGIN,email=process.env.HUSTLEN_LOCAL_AI_REVIEW_EMAIL,password=process.env.HUSTLEN_LOCAL_AI_REVIEW_PASSWORD;
 if(!origin||!email||!password)throw Error("PRIVATE_SYNTHETIC_CONFIGURATION_REQUIRED");
 // --execute is an operator action, NOT evidence of owner approval. Obtain that approval before invoking it.
 const controller=new AbortController(),cancel=()=>controller.abort();process.once("SIGINT",cancel);process.once("SIGTERM",cancel);
 let client:Awaited<ReturnType<typeof authenticatedClient>>|undefined;
 try{
  client=await authenticatedClient(origin,email,password,controller.signal);
  const result=await runEvaluation(plan,client,controller.signal,"LOCAL_OLLAMA_INFERENCE","RUN-"+randomBytes(12).toString("hex"),rateWait);
  // Only allowlisted metadata to stdout. Actual responses/review packet stay in memory until disposal.
  console.log(JSON.stringify({version:result.version,requestedExecutionMode:result.execution,plan:result.plan,summary:result.summary,attempts:result.attempts,caseOutcomes:result.results.map(r=>({caseId:r.caseId,turn:r.turn,outcome:r.outcome,structural:r.structural,failure:r.failure})),storage:"NONE",transcriptExport:"BLOCKED_PENDING_RETENTION_APPROVAL"},null,2));
  if(result.summary.failed||result.summary.notRun)process.exitCode=1;
 }finally{try{await client?.close();}finally{process.removeListener("SIGINT",cancel);process.removeListener("SIGTERM",cancel);}}
}
main().catch(()=>{console.error("Evaluation incomplete or refused. No credentials, raw responses or private diagnostics printed.");process.exitCode=1;});

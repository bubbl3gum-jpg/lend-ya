/** Optional genuine local evaluation THROUGH the guarded app; never a direct inference bypass. */
import { mkdir,writeFile } from "node:fs/promises";
import { authenticatedClient, rateWait } from "../lib/advisory-evaluation/client";
import { localCatalogue } from "../lib/local-inference/catalogue";
async function main(){
 const origin=process.env.HUSTLEN_LOCAL_AI_REVIEW_ORIGIN,email=process.env.HUSTLEN_LOCAL_AI_REVIEW_EMAIL,password=process.env.HUSTLEN_LOCAL_AI_REVIEW_PASSWORD;
 const directory=process.argv[2],all=process.argv[3]==="--all";
 if(!origin||!/^http:\/\/localhost:[1-9][0-9]{0,4}$/.test(origin)||!email?.endsWith("@fixture.test")||!password||!directory||process.argv.length>4)throw Error("Explicit owned localhost origin, synthetic fixture credentials and new output directory required");
 const controller=new AbortController();
 const client=await authenticatedClient(origin,email,password,controller.signal);
 try{
  await mkdir(directory,{mode:0o700}); // exclusive, never overwrite previous review
  const tasks=all?localCatalogue():localCatalogue().filter(t=>["SYN-REVIEW-INJECTION:en","SYN-REVIEW-TRANSLATION:zh-TW"].includes(t.id));
  const rows:unknown[]=[];
  for(const [index,task]of tasks.entries()){
   if(index)await rateWait(controller.signal); // respects six/min candidate limit; never retries inference implicitly
   const start=new Date().toISOString();
   const response=await client.send({scenario:task.id},controller.signal);
   const result=response.body;rows.push({scenario:task.id,inputDigest:task.digest,start,status:response.status,result,humanScores:null});
   await writeFile(directory+"/results.json",JSON.stringify({kind:"OPTIONAL_REAL_LOCAL_RUN",notProductionApproval:true,rows},null,2),{mode:0o600});
   console.log(JSON.stringify({scenario:task.id,status:response.status}));
   if(response.status!==200||result===null)throw Error("Evaluation stopped after an unavailable/invalid result; inspect bounded synthetic evidence");
  }
 }finally{await client.close();}
}
main().catch(()=>{console.error("Local evaluation incomplete. No private diagnostics or credentials printed.");process.exitCode=1;});

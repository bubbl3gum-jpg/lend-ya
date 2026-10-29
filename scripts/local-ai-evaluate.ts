/** Optional genuine local evaluation THROUGH the guarded app; never a direct inference bypass. */
import { mkdir,writeFile } from "node:fs/promises";
import { localCatalogue } from "../lib/local-inference/catalogue";
async function main(){
 const origin=process.env.HUSTLEN_LOCAL_AI_REVIEW_ORIGIN,email=process.env.HUSTLEN_LOCAL_AI_REVIEW_EMAIL,password=process.env.HUSTLEN_LOCAL_AI_REVIEW_PASSWORD;
 const directory=process.argv[2],all=process.argv[3]==="--all";
 if(!origin||!/^http:\/\/localhost:[1-9][0-9]{0,4}$/.test(origin)||!email?.endsWith("@fixture.test")||!password||!directory||process.argv.length>4)throw Error("Explicit owned localhost origin, synthetic fixture credentials and new output directory required");
 const endpoint=origin+"/api/dev/support-companion/local";
 const headers={Origin:origin,"Content-Type":"application/json","X-Hustlen-Local-AI":"1"};
 // 401 is possible only AFTER existing ownership/restricted-principal checks. Do not log in to an arbitrary application DB.
 const probe=await fetch(endpoint,{method:"POST",headers,body:'{"scenario":"SYN-INJECTION:en"}',redirect:"error"});
 if(probe.status!==401)throw Error("Owned runtime did not establish the required pre-authentication boundary");
 const login=await fetch(origin+"/api/auth/login",{method:"POST",headers:{Origin:origin,"Content-Type":"application/json"},body:JSON.stringify({email,password}),redirect:"error"});
 const cookie=login.headers.get("set-cookie")?.match(/p2p_session=[^;]+/)?.[0];if(!login.ok||!cookie)throw Error("Synthetic login failed");
 try{
  await mkdir(directory,{mode:0o700}); // exclusive, never overwrite previous review
  const tasks=all?localCatalogue():localCatalogue().filter(t=>["SYN-REVIEW-INJECTION:en","SYN-REVIEW-TRANSLATION:zh-TW"].includes(t.id));
  const rows:unknown[]=[];
  for(const [index,task]of tasks.entries()){
   if(index)await new Promise(r=>setTimeout(r,11000)); // respects six/min candidate limit; never retries inference implicitly
   const start=new Date().toISOString();
   const response=await fetch(endpoint,{method:"POST",headers:{...headers,Cookie:cookie},body:JSON.stringify({scenario:task.id}),redirect:"error",signal:AbortSignal.timeout(65000)});
   const result=await response.json();rows.push({scenario:task.id,inputDigest:task.digest,start,status:response.status,result,humanScores:null});
   await writeFile(directory+"/results.json",JSON.stringify({kind:"OPTIONAL_REAL_LOCAL_RUN",notProductionApproval:true,rows},null,2),{mode:0o600});
   console.log(JSON.stringify({scenario:task.id,status:response.status}));
   if(!response.ok)throw Error("Evaluation stopped after an unavailable/invalid result; inspect bounded synthetic evidence");
  }
 }finally{await fetch(origin+"/api/auth/logout",{method:"POST",headers:{Origin:origin,Cookie:cookie},redirect:"error"});}
}
main().catch(()=>{console.error("Local evaluation incomplete. No private diagnostics or credentials printed.");process.exitCode=1;});

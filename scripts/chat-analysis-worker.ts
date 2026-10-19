import "dotenv/config";
import { connectTestDatabase } from "../tests/support/test-database";
import { analysisEnabled, processAnalysis } from "../lib/chat/analysis/jobs";
async function main(){
  if(!analysisEnabled())throw Error("DISABLED");
  // This milestone ships an isolated local worker only. Never adopts a live/shared database.
  const guard=await connectTestDatabase();await guard.end();
  const {prisma}=await import("../lib/prisma");
  try{for(let n=0;n<20;n++){const result=await processAnalysis(prisma);console.log(JSON.stringify(result));if(!result.processed)break;}}
  finally{await prisma.$disconnect();}
}
main().catch(()=>{console.error("Analysis worker refused or unavailable; check isolated ownership/configuration. No private content logged.");process.exitCode=1;});

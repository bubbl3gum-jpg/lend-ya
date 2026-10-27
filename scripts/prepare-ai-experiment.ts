/** Offline only. No environment loader, provider credentials, DB or network transport. */
import { writeFile } from "node:fs/promises";
import { prepareOfflineExperiment } from "../lib/ai-case-brief/experiment";
async function main() {
  const args=process.argv.slice(2);
  if(args.length && (args.length!==2 || args[0]!=="--output" || !args[1].endsWith(".json")))throw Error("Use --output new-report.json");
  const report=await prepareOfflineExperiment();
  if(args.length)await writeFile(args[1],JSON.stringify(report,null,2)+"\n",{flag:"wx",mode:0o600});
  console.log(JSON.stringify({kind:report.kind,dataset:report.datasetVersion,digest:report.datasetDigest,cases:report.rows.length,checkpoint:report.checkpoint.state,realModelRequests:0,humanJudgmentsRecorded:false}));
}
main().catch(()=>{console.error("Offline experiment preparation failed; no model request was made.");process.exitCode=1;});

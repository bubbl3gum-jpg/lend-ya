import { readFile, mkdir, writeFile } from "node:fs/promises";
import { moderateText, CHAT_POLICY_VERSION } from "../lib/chat/policy";
import { evaluate, type Example } from "../lib/chat/evaluation";
async function main(){
  const dataset=JSON.parse(await readFile("tests/fixtures/moderation/v1.json","utf8")) as {version:string;labelStatus:string;examples:Example[]};
  const results={datasetVersion:dataset.version,labelStatus:dataset.labelStatus,policyVersion:CHAT_POLICY_VERSION,
    development:evaluate(dataset.examples.filter(e=>e.split==="development"),moderateText),heldOut:evaluate(dataset.examples.filter(e=>e.split==="held-out"),moderateText)};
  const output=process.argv.indexOf("--output");
  if(output>=0){const dir=process.argv[output+1];if(!dir)throw Error("Missing output directory");await mkdir(dir,{recursive:true});await writeFile(`${dir}/evaluation.json`,JSON.stringify({...results,development:{...results.development,rows:undefined},heldOut:{...results.heldOut,rows:undefined}},null,2)+"\n");
    const escape=(s:string)=>s.replace(/\|/g,"\\|").replace(/\n/g," ");
    const lines=["# Synthetic moderation label review","",`Dataset: ${dataset.version}. ${dataset.labelStatus}.`,"","Edit expectedOutcome/expectedCategories in tests/fixtures/moderation/v1.json after review, record reviewer/date in a separate review record, then rerun npm run moderation:evaluate -- --output docs/intelligent-moderation/evaluation. This file contains synthetic content only. Held-out labels have not been independently blinded or human validated.","","| ID / split / language | Synthetic message | Proposed outcome / categories | Actual outcome / categories | Match |","| --- | --- | --- | --- | --- |"];
    for(const r of [...results.development.rows,...results.heldOut.rows])lines.push(`| ${r.id} / ${r.split} / ${r.language} | ${escape(r.body)} | ${r.expectedOutcome} / ${r.expectedCategories.join(", ")} | ${r.actual.outcome} / ${r.actual.categories.join(", ")} | ${r.expectedOutcome===r.actual.outcome&&[...r.expectedCategories].sort().join()===[...r.actual.categories].sort().join()?"yes":"REVIEW"} |`);
    await writeFile(`${dir}/LABEL_REVIEW.md`,lines.join("\n")+"\n");
  }
  console.log(JSON.stringify({datasetVersion:results.datasetVersion,labelStatus:results.labelStatus,policyVersion:results.policyVersion,development:results.development.overall,heldOut:results.heldOut.overall,heldOutMismatches:results.heldOut.mismatches},null,2));
}
main().catch(()=>{console.error("Synthetic evaluation failed.");process.exitCode=1;});

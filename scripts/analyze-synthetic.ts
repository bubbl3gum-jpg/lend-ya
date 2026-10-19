import "dotenv/config";
import { readFile } from "node:fs/promises";
import { analyze, MockProvider } from "../lib/chat/analysis/provider";
import { SyntheticCloudProvider } from "../lib/chat/analysis/cloud";
async function main(){
  // No arbitrary text, DB connection, listing IDs or stdin: only checked-in synthetic fixtures.
  const dataset=JSON.parse(await readFile("tests/fixtures/moderation/v1.json","utf8"));
  const id=process.argv[2];const fixture=dataset.examples.find((e:{id:string})=>e.id===id);
  if(!fixture)throw Error("FIXTURE_REQUIRED");
  const cloud=process.argv.includes("--cloud");
  const provider=cloud?new SyntheticCloudProvider({enabled:process.env.CHAT_SYNTHETIC_CLOUD_ENABLED==="true",endpoint:process.env.CHAT_SYNTHETIC_CLOUD_ENDPOINT??"",model:process.env.CHAT_SYNTHETIC_CLOUD_MODEL??"",apiKey:process.env.CHAT_SYNTHETIC_CLOUD_API_KEY??""}):new MockProvider();
  const result=await analyze(provider,{current:fixture.body,previous:[],listingTitle:"Synthetic camera rental"});
  // Intentionally metadata only; even the synthetic pilot does not print prompts/responses.
  console.log(JSON.stringify({fixtureId:id,provider:result.providerVersion,model:result.modelVersion,category:result.category,suggestedOutcome:result.suggestedOutcome,requiresHumanReview:result.requiresHumanReview}));
}
main().catch(()=>{console.error("Synthetic analysis refused or unavailable. Check fixture/configuration; no private response is logged.");process.exitCode=1;});

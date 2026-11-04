/** Local files only; no environment loader, database or transport. */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { buildReviewPacket, blankReview, renderReviewMarkdown, validateReview } from "../lib/ai-case-brief/review-packet";
import { readReviewFile } from "../lib/ai-case-brief/review-file";
async function main() {
  const [action,path,...rest]=process.argv.slice(2);
  if(rest.length||!path||!["prepare","validate"].includes(action))throw Error("INVALID_ARGUMENTS");
  const packet=await buildReviewPacket();
  if(action==="prepare") {
    await mkdir(path,{mode:0o700}); // Existing directory refused, never overwrite reviewer work.
    for(const [name,value] of [["packet.json",JSON.stringify(packet,null,2)],["review.json",JSON.stringify(blankReview(packet),null,2)],["REVIEW.md",renderReviewMarkdown(packet)]])
      await writeFile(join(path,name),value.endsWith("\n")?value:value+"\n",{flag:"wx",mode:0o600});
    console.log(JSON.stringify({items:packet.items.length,packetDigest:packet.packetDigest,completedReviews:0,liveExecutionAllowed:false}));
  } else {
    const data=JSON.parse(await readReviewFile(path));
    console.log(JSON.stringify(validateReview(data,packet))); // Never echo notes or reviewer alias.
  }
}
main().catch(()=>{console.error("Offline review failed. No model request was made; no review contents logged.");process.exitCode=1;});

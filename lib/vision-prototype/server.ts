import "server-only";
import {readFile} from "node:fs/promises";
import path from "node:path";
import {createHash} from "node:crypto";
import raw from "./fixture.json";
import {fixtureDigest,validateFixture} from "./contracts";
import {prototypeEnabled,allowedActor} from "./config";
import {companionActor} from "../assistant/server";
export const fixture=()=>validateFixture(raw,fixtureDigest,["P1","R1"]);
export async function prototypeActor(){
 if(!prototypeEnabled())throw Error("UNAVAILABLE");
 const a=await companionActor();if(!allowedActor(a.user.id))throw Error("UNAVAILABLE");return a;
}
export async function fixtureBytes(id:string,variant:string){
 const f=fixture(),i=f.images.find(i=>i.id===id);if(!i||!["parent","derived"].includes(variant))throw Error("INVALID_SELECTOR");
 const bytes=await readFile(path.join(process.cwd(),"lib/vision-prototype/assets",`${i.id}-${variant}.png`));
 if(createHash("sha256").update(bytes).digest("hex")!==(variant==="parent"?i.parent.sha256:i.derivative.sha256))throw Error("FIXTURE_BYTES_CHANGED");return bytes;
}

import {test} from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {checklistFor,pixelHints} from "../lib/item-documentation/checklists";
import {unavailableVision,validateObservation,type VisionInput} from "../lib/item-documentation/vision-contract";
import {documentationText} from "../lib/i18n/documentation";
test("pinned category-specific registry is repeatable, cloned and conservative for unknown categories",()=>{
 const camera=checklistFor("Cameras"),tools=checklistFor("Tools"),camping=checklistFor("Camping & Outdoors");assert.equal(camera.version,1);assert.notDeepEqual(camera.areas,tools.areas);assert.notDeepEqual(camping.areas,camera.areas);camera.areas[0].label=["changed","changed"];assert.notDeepEqual(checklistFor("Cameras"),camera);assert.equal(checklistFor("Unknown").id,"general");assert.equal(checklistFor("__proto__").id,"general");assert.deepEqual(checklistFor("Tools"),tools);
});
test("bounded pixel hints distinguish exposure/low detail, never identify content, damage or blur reliably",()=>{
 assert(pixelHints(new Uint8Array(16),4,4).warnings.includes("DARK"));assert(pixelHints(new Uint8Array(16).fill(255),4,4).warnings.includes("BRIGHT"));assert(pixelHints(new Uint8Array(16).fill(128),4,4).warnings.includes("LOW_DETAIL"));assert.throws(()=>pixelHints(new Uint8Array(3),4,4));assert(!("damage" in pixelHints(new Uint8Array(16),4,4)));
});
test("future observations are source-scoped advisory-only and model remains unavailable",()=>{
 const input:VisionInput={bookingId:1,category:"Cameras",checklistId:"camera",checklistVersion:1,authorizedReferences:[{id:"own",source:"PICKUP",authorId:1,recordedAt:"2026-10-28T00:00:00Z"}]};
 const v={kind:"RETAKE",areaId:"body",refs:["own"],text:"Possibly obscured",uncertainty:"Not a finding",confidence:null,advisory:true};assert.equal(validateObservation(v,input,["body"]).advisory,true);
 for(const raw of [{...v,refs:["foreign"]},{...v,areaId:"unknown"},{...v,repairCost:1},{...v,advisory:false},{...v,confidence:Infinity}])assert.throws(()=>validateObservation(raw,input,["body"]));assert.deepEqual(unavailableVision(),{state:"UNAVAILABLE",observations:[]});assert.deepEqual(Object.keys(documentationText("en")),Object.keys(documentationText("zh-TW")));
});
test("documentation candidate has no domain writes, storage, inference transport or production publication integration",async()=>{
 const s=await readFile("lib/item-documentation/service.ts","utf8");assert.doesNotMatch(s,/\.(?:create|updateMany|deleteMany|upsert|executeRaw)\(|fetch\(|storeListingMedia|writeFile/);assert.match(s,/validatePrivatePhotos/);assert.match(s,/current_database/);assert.match(s,/final.revision!==s.revision/);
 for(const f of ["lib/item-documentation/checklists.ts","lib/item-documentation/vision-contract.ts"])assert.doesNotMatch(await readFile(f,"utf8"),/fetch\(|process.env|from ["'].*provider/);
});

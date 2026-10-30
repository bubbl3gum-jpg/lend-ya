import {createHash} from "node:crypto";
import {checklistFor} from "../item-documentation/checklists";
import type {VisionObservation} from "../item-documentation/vision-contract";
export const fixtureVersion="vision-fixture-v1";
export const fixtureDigest="629ee0b6b37f913656d2fb3d154a7fd3b9ffb9e387d5e8cec3df9668ebd706c9";
export type FixtureImage={id:string;stage:"PICKUP"|"RETURN";areaId:string;source:"AUTHORED_SCHEMATIC_NOT_PHOTOGRAPH";capturedAt:null;parent:{id:string;sha256:string};derivative:{sha256:string;transform:{kind:"RESIZE";width:number;height:number}};limitations:string[]};
export type Fixture={version:typeof fixtureVersion;id:string;category:string;checklistId:string;checklistVersion:number;images:FixtureImage[];pairs:{pickupId:string;returnId:string;areaId:string;matched:boolean;limitations:string[]}[];groundTruth:null};
const fail=():never=>{throw Error("INVALID_VISION_FIXTURE_CONTRACT");};
function exact(v:unknown,keys:string[]):Record<string,unknown>{if(!v||typeof v!=="object"||Array.isArray(v))fail();const x=v as Record<string,unknown>;if(Object.keys(x).sort().join()!==keys.sort().join())fail();return x;}
function text(v:unknown):v is string{return typeof v==="string"&&!!v.trim()&&v.length<=1000&&!/[\u0000-\u001f\u007f]/.test(v);}
function limits(v:unknown){return Array.isArray(v)&&v.length>0&&v.length<=8&&v.every(text);}
const hash=(v:unknown)=>typeof v==="string"&&/^[a-f0-9]{64}$/.test(v);
export function digest(v:unknown){return createHash("sha256").update(JSON.stringify(v)).digest("hex");}
/** First version intentionally cannot accept photographs or completed ground truth. */
export function validateFixture(raw:unknown,expectedDigest:string,allowedIds:readonly string[]):Fixture{
 const x=exact(raw,["version","id","category","checklistId","checklistVersion","images","pairs","groundTruth"]);
 if(x.version!==fixtureVersion||!text(x.id)||!text(x.category)||x.groundTruth!==null||!hash(expectedDigest)||digest(raw)!==expectedDigest)fail();
 const c=checklistFor(x.category as string);if(x.checklistId!==c.id||x.checklistVersion!==c.version||!Array.isArray(x.images)||!x.images.length||x.images.length>12)fail();
 const ids=new Set<string>();for(const value of x.images as unknown[]){const i=exact(value,["id","stage","areaId","source","capturedAt","parent","derivative","limitations"]);
 if(!text(i.id)||!allowedIds.includes(i.id)||ids.has(i.id)||!["PICKUP","RETURN"].includes(String(i.stage))||!c.areas.some(a=>a.id===i.areaId)||i.source!=="AUTHORED_SCHEMATIC_NOT_PHOTOGRAPH"||i.capturedAt!==null||!limits(i.limitations))fail();ids.add(i.id as string);
 const p=exact(i.parent,["id","sha256"]),d=exact(i.derivative,["sha256","transform"]),t=exact(d.transform,["kind","width","height"]);
 if(!text(p.id)||!hash(p.sha256)||!hash(d.sha256)||t.kind!=="RESIZE"||![t.width,t.height].every(n=>Number.isInteger(n)&&Number(n)>0&&Number(n)<=2048))fail();
 }
 if(!Array.isArray(x.pairs)||!x.pairs.length||x.pairs.length>6)fail();const f=raw as Fixture;const pairs=new Set<string>();
 for(const value of x.pairs as unknown[]){const p=exact(value,["pickupId","returnId","areaId","matched","limitations"]);const a=f.images.find(i=>i.id===p.pickupId),b=f.images.find(i=>i.id===p.returnId);const key=`${p.pickupId}:${p.returnId}`;
 if(!a||!b||a.stage!=="PICKUP"||b.stage!=="RETURN"||a.areaId!==p.areaId||b.areaId!==p.areaId||typeof p.matched!=="boolean"||!limits(p.limitations)||pairs.has(key))fail();pairs.add(key);
 }return structuredClone(f);
}
export const observationKinds=["VISIBLE_OBSERVATION","POSSIBLE_DIFFERENCE","INSUFFICIENT_EVIDENCE","NOT_COMPARABLE","MISSING_OR_OBSCURED_VIEW","HUMAN_REVIEW_REQUIRED"] as const;
/** Reuse advisory text/ref/uncertainty types; no fabricated booking identity. */
export type PrototypeObservation=Pick<VisionObservation,"areaId"|"refs"|"text"|"uncertainty"|"advisory">&{kind:typeof observationKinds[number]};
export type PrototypeResult={version:"vision-observation-v1";fixtureDigest:string;provenance:"MOCK_TEST_OUTPUT";humanReview:"REQUIRED";observations:PrototypeObservation[]};
export function validateResult(raw:unknown,f:Fixture):PrototypeResult{
 const r=exact(raw,["version","fixtureDigest","provenance","humanReview","observations"]);
 if(r.version!=="vision-observation-v1"||r.fixtureDigest!==digest(f)||r.provenance!=="MOCK_TEST_OUTPUT"||r.humanReview!=="REQUIRED"||!Array.isArray(r.observations)||r.observations.length>12)fail();
 for(const value of r.observations as unknown[]){const o=exact(value,["kind","areaId","refs","text","uncertainty","advisory"]);
 if(!observationKinds.includes(o.kind as PrototypeObservation["kind"])||o.advisory!==true||!text(o.text)||!text(o.uncertainty)||!Array.isArray(o.refs)||!o.refs.length||o.refs.length>8||new Set(o.refs).size!==o.refs.length||o.refs.some(id=>!f.images.some(i=>i.id===id&&i.areaId===o.areaId)))fail();
 if(o.kind==="POSSIBLE_DIFFERENCE"&&!f.pairs.some(p=>p.matched&&p.areaId===o.areaId&&(o.refs as unknown[]).includes(p.pickupId)&&(o.refs as unknown[]).includes(p.returnId)))fail();
 }return structuredClone(raw) as PrototypeResult;
}

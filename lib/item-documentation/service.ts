import "server-only";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { prisma } from "../prisma";
import { getCurrentUser } from "../auth";
import { disposableDatabaseUrl } from "../disposable-database-url";
import { validatePrivatePhotos } from "../booking-evidence";
import { RentalError } from "../rental-errors";
import { inspectionSummary } from "../inspection/service";
import { logOperationalError } from "../operational-error";
import { checklistFor, pixelHints } from "./checklists";
import { unavailableVision } from "./vision-contract";
export function documentationEnabled() { return process.env.NODE_ENV === "development" && process.env.HUSTLEN_DOCUMENTATION_CANDIDATE === "owned-preview-only"; }
class Denied extends Error { constructor(public status: number) { super("Documentation unavailable"); } }
export async function documentationActor() {
 if (!documentationEnabled()) throw new Denied(404);
 const e = process.env;
 if (!/^[a-f0-9]{24}$/.test(e.MRT_TEST_RUN_ID ?? "") || e.DATABASE_URL !== e.MRT_TEST_DATABASE_URL || e.DATABASE_URL !== e.TEST_DATABASE_URL) throw new Denied(404);
 const target = disposableDatabaseUrl(e.DATABASE_URL);
 const rows = await prisma.$queryRaw<{ name:string; marker:string }[]>`SELECT current_database() name,shobj_description(oid,'pg_database') marker FROM pg_database WHERE datname=current_database()`;
 if (rows[0]?.name !== target.pathname.slice(1) || rows[0]?.marker !== `hustlen-mrt-test:${e.MRT_TEST_RUN_ID}`) throw new Denied(404);
 const user = await getCurrentUser(); if (!user) throw new Denied(401); return user;
}
async function listingSummary(id: number, userId: number) {
 const l = await prisma.listing.findFirst({ where: { id, ownerId:userId }, select: { id:true,title:true,category:true,condition:true,categoryDetails:true,updatedAt:true,media:{select:{id:true,url:true,kind:true,createdAt:true},take:8,orderBy:[{createdAt:"asc"},{id:"asc"}]} } });
 if (!l) throw new Denied(404);
 return { kind:"listing" as const, listing:l, revision:createHash("sha256").update(JSON.stringify(l)).digest("hex"), checklist:checklistFor(l.category), saved:false as const };
}
async function bookingSummary(id:number,userId:number) {
 const b = await prisma.booking.findFirst({where:{id,OR:[{ownerId:userId},{renterId:userId}]},select:{id:true,ownerId:true,renterId:true,listing:{select:{category:true}},handoff:{select:{performedBy:true,confirmedBy:true,conditionNotes:true,borrowerConditionNotes:true,checklist:true,borrowerChecklist:true,confirmedAt:true,ownerConditionConfirmed:true,conditionConfirmed:true}},return:{select:{conditionNotes:true,checklist:true}},}});
 if(!b)throw new Denied(404);
 const s=await inspectionSummary(id,userId);
 const pickupEvent=await prisma.meetupEvent.findFirst({where:{bookingId:id,purpose:"PICKUP",kind:"PHYSICAL_RECEIPT_ACK",actorId:b.renterId,challengeId:{not:null}},orderBy:{createdAt:"asc"},select:{challengeId:true}});
 const pickupChallenge=pickupEvent?.challengeId?await prisma.meetupChallenge.findFirst({where:{id:pickupEvent.challengeId,bookingId:id,purpose:"PICKUP",issuerId:b.ownerId,verifierId:b.renterId,consumedAt:{not:null},completedAt:{not:null},completionHash:{not:null}},select:{completedAt:true}}):null;
 const pickupReceiptAt=b.handoff?.performedBy===b.ownerId&&b.handoff?.confirmedBy===b.renterId&&b.handoff.ownerConditionConfirmed&&b.handoff.conditionConfirmed?pickupChallenge?.completedAt?.toISOString()??null:null;
 return {kind:"booking" as const,bookingId:s.bookingId,title:s.title,evidence:s.evidence,evidenceTruncated:s.evidenceTruncated,returnedAt:s.returnedAt,accessories:s.accessories,pickupReceiptAt,checklist:checklistFor(b.listing.category),pickup:b.handoff,returnRecord:b.return,vision:unavailableVision(),areaMapping:"UNRECORDED_LEGACY_EVIDENCE" as const};
}
async function form(request:Request) {
 const reader=request.body?.getReader();if(!reader)throw new Denied(400);let size=0;const chunks:Uint8Array[]=[];
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>20*1024*1024+32768){await reader.cancel();throw new Denied(413);}chunks.push(value);}}finally{reader.releaseLock();}
 try{return await new Response(Buffer.concat(chunks),{headers:{"Content-Type":request.headers.get("content-type")??""}}).formData();}catch{throw new Denied(400);}
}
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{"Cache-Control":"private, no-store",Vary:"Cookie","X-Content-Type-Options":"nosniff"}});
export async function documentationApi(request:Request) {
 try {
  const actor=await documentationActor(),q=new URL(request.url).searchParams;
  if(request.method==="GET") {
   if([...q.keys()].length!==2||q.getAll("kind").length!==1||q.getAll("id").length!==1||!["listing","booking"].includes(q.get("kind")??"")||!(/^[1-9]\d{0,9}$/.test(q.get("id")??""))||Number(q.get("id"))>2147483647)throw new Denied(400);
   return reply(q.get("kind")==="listing"?await listingSummary(Number(q.get("id")),actor.id):await bookingSummary(Number(q.get("id")),actor.id));
  }
  const origin=process.env.HUSTLEN_DOCUMENTATION_ORIGIN;
  if(!origin||new URL(origin).hostname!=="localhost"||new URL(origin).origin!==origin||new URL(request.url).origin!==origin||request.headers.get("origin")!==origin||request.headers.get("x-hustlen-documentation")!=="1"||request.headers.get("sec-fetch-site")==="cross-site")throw new Denied(403);
  if(actor.accountStatus!=="ACTIVE")throw new Denied(403);
  if(q.size||!request.headers.get("content-type")?.startsWith("multipart/form-data;"))throw new Denied(400);
  const f=await form(request),keys=["listingId","revision","wear","accessories","confirmed","areas","photos"];
  if([...f.keys()].some(k=>!keys.includes(k))||keys.filter(k=>k!=="photos").some(k=>f.getAll(k).length!==1)||f.get("confirmed")!=="true"||!(/^[1-9]\d{0,9}$/.test(String(f.get("listingId"))))||Number(f.get("listingId"))>2147483647)throw new Denied(400);
  const text=(key:string)=>{const v=f.get(key);if(typeof v!=="string"||!v.trim()||v.length>2000||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(v))throw new Denied(400);return v.trim();};
  const wear=text("wear"),accessories=text("accessories"),s=await listingSummary(Number(f.get("listingId")),actor.id);
  if(f.get("revision")!==s.revision)throw new Denied(409);
  let areas:unknown;try{areas=JSON.parse(String(f.get("areas")));}catch{throw new Denied(400);}
  const files=f.getAll("photos");if(!Array.isArray(areas)||areas.length!==s.checklist.areas.length||new Set(areas).size!==areas.length||areas.some(a=>!s.checklist.areas.some(v=>v.id===a))||files.length!==areas.length||files.some(v=>!(v instanceof File)))throw new Denied(400);
  const photos=await validatePrivatePhotos(files as File[]),quality=[];
  for(let i=0;i<photos.length;i++){
   const image=sharp(photos[i].data).timeout({seconds:5}),meta=await image.metadata();
   const {data,info}=await image.resize(128,128,{fit:"fill"}).flatten({background:"white"}).greyscale().raw().toBuffer({resolveWithObject:true});
   const hints=pixelHints(data,info.width,info.height);
   quality.push({areaId:areas[i],width:meta.width,height:meta.height,...hints,warnings:[...(Math.min(meta.width??0,meta.height??0)<640?["SMALL"]:[]),...hints.warnings]});
  }
  const current=await documentationActor();if(current.id!==actor.id||current.accountStatus!=="ACTIVE")throw new Denied(401);
  const final=await listingSummary(s.listing.id,actor.id);if(final.revision!==s.revision)throw new Denied(409);
  return reply({reviewed:true,saved:false,published:false,checklistId:s.checklist.id,checklistVersion:s.checklist.version,wear,accessories,quality,modelState:"UNAVAILABLE",observations:[],contentVerified:false});
 }catch(e){if(e instanceof Denied)return reply({code:e.status===401?"SESSION":e.status===409?"CONFLICT":"UNAVAILABLE"},e.status);if(e instanceof RentalError)return reply({code:"INVALID_PHOTO"},e.status);logOperationalError("item_documentation",e);return reply({code:"UNAVAILABLE"},503);}
}
export type ListingDocumentation=Awaited<ReturnType<typeof listingSummary>>;
export type BookingDocumentation=Awaited<ReturnType<typeof bookingSummary>>;

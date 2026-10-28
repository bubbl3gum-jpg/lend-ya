import "server-only";
import {createHash,randomUUID} from "node:crypto";
import {cookies} from "next/headers";
import sharp from "sharp";
import {Prisma} from "@prisma/client";
import {prisma} from "../prisma";
import {getCurrentUser} from "../auth";
import {disposableDatabaseUrl} from "../disposable-database-url";
import {readJsonObject} from "../api-response";
import {validatePrivatePhotos} from "../booking-evidence";
import {RentalError} from "../rental-errors";
import {logOperationalError} from "../operational-error";
import {checklistFor,pixelHints,type DocumentationChecklist} from "../item-documentation/checklists";
import {draftInput,emptyDraft,exactObject,confirmationReady,agreementAdapter,type DraftData} from "./contracts";
export function studioEnabled(){return process.env.NODE_ENV==="development"&&process.env.HUSTLEN_ITEM_STUDIO==="owned-studio-only";}
class Denied extends Error{constructor(public status:number,public code="UNAVAILABLE"){super(code);}}
export async function studioActor(){
 if(!studioEnabled())throw new Denied(404);
 const e=process.env;if(!/^[a-f0-9]{24}$/.test(e.MRT_TEST_RUN_ID??"")||e.DATABASE_URL!==e.TEST_DATABASE_URL||e.DATABASE_URL!==e.MRT_TEST_DATABASE_URL)throw new Denied(404);
 const url=disposableDatabaseUrl(e.DATABASE_URL),marker=await prisma.$queryRaw<{name:string;marker:string}[]>`SELECT current_database() name,shobj_description(oid,'pg_database') marker FROM pg_database WHERE datname=current_database()`;
 if(marker[0]?.name!==url.pathname.slice(1)||marker[0]?.marker!==`hustlen-mrt-test:${e.MRT_TEST_RUN_ID}`)throw new Denied(404);
 const user=await getCurrentUser();if(!user)throw new Denied(401,"SESSION");
 const token=(await cookies()).get("p2p_session")?.value;if(!token)throw new Denied(401,"SESSION");
 return {user,tokenHash:createHash("sha256").update(token).digest("hex")};
}
const json=(v:unknown)=>JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue;
async function ownListing(id:number,userId:number){const l=await prisma.listing.findFirst({where:{id,ownerId:userId},select:{id:true,title:true,category:true,condition:true,status:true}});if(!l)throw new Denied(404);return l;}
async function summary(id:number,userId:number){
 const listing=await ownListing(id,userId),draft=await prisma.devItemDraft.findFirst({where:{listingId:id,ownerId:userId}});
 const photos=await prisma.devItemPhoto.findMany({where:{listingId:id,ownerId:userId},select:{id:true,areaId:true,mimeType:true,quality:true,source:true,createdAt:true,inputHash:true,storedHash:true},orderBy:{createdAt:"asc"},take:24});
 const versions=await prisma.devItemVersion.findMany({where:{listingId:id,ownerId:userId},orderBy:{revision:"desc"},take:20});
 const events=await prisma.devItemEvent.findMany({where:{listingId:id,actorId:userId},orderBy:{revision:"desc"},take:200});
 return {listing,revision:draft?.revision??0,checklist:(draft?.checklist??checklistFor(listing.category)) as unknown as DocumentationChecklist,data:(draft?.data??emptyDraft()) as unknown as DraftData,lastSavedAt:draft?.updatedAt??null,photos,versions,events,modelState:"UNAVAILABLE",published:false};
}
async function mutate(actor:Awaited<ReturnType<typeof studioActor>>,id:number,expected:number,action:"SAVE"|"PHOTO"|"CONFIRM",input?:DraftData,upload?:{areaId:string;data:Uint8Array<ArrayBuffer>;mimeType:string;inputHash:string;quality:Prisma.InputJsonValue}){
 await prisma.$transaction(async tx=>{
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(131401,${actor.user.id})`;
  // Match credential revocation lock order: account before session, avoiding a lock inversion.
  await tx.$queryRaw`SELECT id FROM "User" WHERE id=${actor.user.id} FOR SHARE`;
  await tx.$queryRaw`SELECT id FROM "AuthSession" WHERE "tokenHash"=${actor.tokenHash} FOR SHARE`;
  const session=await tx.authSession.findUnique({where:{tokenHash:actor.tokenHash},select:{userId:true,expiresAt:true}}),u=await tx.user.findUnique({where:{id:actor.user.id},select:{accountStatus:true}});
  if(!session||session.userId!==actor.user.id||session.expiresAt<=new Date())throw new Denied(401,"SESSION");if(u?.accountStatus!=="ACTIVE")throw new Denied(403);
  await tx.$queryRaw`SELECT id FROM "Listing" WHERE id=${id} FOR UPDATE`;
  const listing=await tx.listing.findFirst({where:{id,ownerId:actor.user.id},select:{category:true}});if(!listing)throw new Denied(404);
  const d=await tx.devItemDraft.findUnique({where:{listingId:id}});if(d&&d.ownerId!==actor.user.id)throw new Denied(404);
  if((d?.revision??0)!==expected)throw new Denied(409,"CONFLICT");if(expected>=200)throw new Denied(409,"LIMIT");
  if(!d&&await tx.devItemDraft.count({where:{ownerId:actor.user.id}})>=30)throw new Denied(409,"LIMIT");
  await tx.$queryRaw`SELECT set_config('hustlen.item_studio','owned-studio-only',true),set_config('hustlen.item_actor',${String(actor.user.id)},true)`;
  const checklist=(d?.checklist??checklistFor(listing.category)) as unknown as DocumentationChecklist;
  let data=input??draftInput(d?.data??emptyDraft());const revision=expected+1;
  if(upload){
   if(!checklist.areas.some(a=>a.id===upload.areaId))throw new Denied(400,"INPUT");if(await tx.devItemPhoto.count({where:{listingId:id}})>=24)throw new Denied(409,"LIMIT");
   const photo=await tx.devItemPhoto.create({data:{id:randomUUID(),listingId:id,ownerId:actor.user.id,revision,areaId:upload.areaId,mimeType:upload.mimeType,data:upload.data,inputHash:upload.inputHash,storedHash:createHash("sha256").update(upload.data).digest("hex"),quality:upload.quality}});
   data={...data,photos:[...data.photos.filter(p=>p.areaId!==upload.areaId),{areaId:upload.areaId,photoId:photo.id}]};
  }
  for(const p of data.photos){if(!checklist.areas.some(a=>a.id===p.areaId)||!await tx.devItemPhoto.findFirst({where:{id:p.photoId,listingId:id,ownerId:actor.user.id,areaId:p.areaId},select:{id:true}}))throw new Denied(400,"FOREIGN_PHOTO");}
  for(const a of data.accessories)if(a.photoId&&!data.photos.some(p=>p.photoId===a.photoId))throw new Denied(400,"FOREIGN_PHOTO");
  if(action==="CONFIRM"&&(!d||!confirmationReady(data,checklist.areas.map(a=>a.id))))throw new Denied(400,"INCOMPLETE");
  if(action==="CONFIRM"&&await tx.devItemVersion.count({where:{listingId:id}})>=20)throw new Denied(409,"LIMIT");
  const saved=d?await tx.devItemDraft.update({where:{listingId:id},data:{revision,data:json(data)}}):await tx.devItemDraft.create({data:{listingId:id,ownerId:actor.user.id,revision,category:listing.category,checklist:json(checklist),data:json(data)}});
  let versionId:string|null=null;
  if(action==="CONFIRM"){versionId=randomUUID();await tx.devItemVersion.create({data:{id:versionId,listingId:id,ownerId:actor.user.id,revision,category:saved.category,checklist:json(saved.checklist),data:json(saved.data),sourceCreatedAt:saved.createdAt}});}
  await tx.devItemEvent.create({data:{id:randomUUID(),listingId:id,actorId:actor.user.id,previousRevision:expected,revision,action,versionId}});
 });
 return summary(id,actor.user.id);
}
async function multipart(request:Request){const r=request.body?.getReader();if(!r)throw new Denied(400,"INPUT");let n=0;const chunks:Uint8Array[]=[];try{while(true){const {done,value}=await r.read();if(done)break;n+=value.byteLength;if(n>5*1024*1024+32768){await r.cancel();throw new Denied(413,"INVALID_PHOTO");}chunks.push(value);}}finally{r.releaseLock();}try{return await new Response(Buffer.concat(chunks),{headers:{"Content-Type":request.headers.get("content-type")??""}}).formData();}catch{throw new Denied(400,"INPUT");}}
const reply=(v:unknown,status=200)=>Response.json(v,{status,headers:{"Cache-Control":"private, no-store",Vary:"Cookie","X-Content-Type-Options":"nosniff"}});
const positive=(v:unknown)=>typeof v==="number"&&Number.isSafeInteger(v)&&v>0&&v<=2147483647;
export async function studioApi(request:Request){try{
 const actor=await studioActor(),q=new URL(request.url).searchParams;
 if(request.method==="GET"){
  if(q.size!==2||q.getAll("kind").length!==1||q.getAll("id").length!==1||!(/^[1-9]\d{0,9}$/.test(q.get("id")??""))||!positive(Number(q.get("id"))))throw new Denied(400,"INPUT");
  const id=Number(q.get("id"));if(q.get("kind")==="listing")return reply(await summary(id,actor.user.id));
  if(q.get("kind")!=="booking")throw new Denied(400,"INPUT");
  const b=await prisma.booking.findFirst({where:{id,OR:[{ownerId:actor.user.id},{renterId:actor.user.id}]},select:{listingId:true,ownerId:true}});if(!b)throw new Denied(404);
  return reply({agreedDocumentation:agreementAdapter(),ownerConfirmed:b.ownerId===actor.user.id?(await summary(b.listingId,actor.user.id)).versions:[],ownerCurrentIsNotAgreed:true});
 }
 const origin=process.env.HUSTLEN_ITEM_STUDIO_ORIGIN;if(!origin||new URL(origin).hostname!=="localhost"||new URL(origin).origin!==origin||new URL(request.url).origin!==origin||request.headers.get("origin")!==origin||request.headers.get("x-hustlen-item-studio")!=="1"||request.headers.get("sec-fetch-site")==="cross-site")throw new Denied(403);
 if(q.size)throw new Denied(400,"INPUT");
 if(request.headers.get("content-type")?.startsWith("multipart/form-data;")){
  const f=await multipart(request),keys=["listingId","expectedRevision","areaId","photo"];if([...f.keys()].length!==keys.length||keys.some(k=>f.getAll(k).length!==1)||[...f.keys()].some(k=>!keys.includes(k)))throw new Denied(400,"INPUT");
  const id=Number(f.get("listingId")),rev=Number(f.get("expectedRevision"));if(!positive(id)||!(/^(0|[1-9]\d{0,2})$/.test(String(f.get("expectedRevision"))))||typeof f.get("areaId")!=="string"||!(f.get("photo") instanceof File))throw new Denied(400,"INPUT");await ownListing(id,actor.user.id);
  const file=f.get("photo") as File,raw=new Uint8Array(await file.arrayBuffer()),[photo]=await validatePrivatePhotos([file]);const image=sharp(photo.data).timeout({seconds:5}),meta=await image.metadata();const {data,info}=await image.resize(128,128,{fit:"fill"}).flatten({background:"white"}).greyscale().raw().toBuffer({resolveWithObject:true});const hints=pixelHints(data,info.width,info.height);
  return reply(await mutate(actor,id,rev,"PHOTO",undefined,{areaId:String(f.get("areaId")),...photo,inputHash:createHash("sha256").update(raw).digest("hex"),quality:json({...hints,width:meta.width,height:meta.height,warnings:[...(Math.min(meta.width??0,meta.height??0)<640?["SMALL"]:[]),...hints.warnings]})}));
 }
 if(request.headers.get("content-type")!=="application/json")throw new Denied(400,"INPUT");let v:Record<string,unknown>,data:DraftData|undefined;
 try{const raw=await readJsonObject(request);v=exactObject(raw,raw?.action==="SAVE"?["action","listingId","expectedRevision","data"]:["action","listingId","expectedRevision","confirmed"]);if(!positive(v.listingId)||!Number.isInteger(v.expectedRevision)||Number(v.expectedRevision)<0||Number(v.expectedRevision)>200||!["SAVE","CONFIRM"].includes(v.action as string)||(v.action==="CONFIRM"&&v.confirmed!==true))throw Error("INPUT");if(v.action==="SAVE")data=draftInput(v.data);}catch{throw new Denied(400,"INPUT");}
 return reply(await mutate(actor,Number(v.listingId),Number(v.expectedRevision),v.action as "SAVE"|"CONFIRM",data));
 }catch(e){if(e instanceof Denied)return reply({code:e.code},e.status);if(e instanceof RentalError)return reply({code:"INVALID_PHOTO"},e.status);logOperationalError("owned_item_studio",e);return reply({code:"UNAVAILABLE"},503);}}
export async function studioPhoto(id:string){try{const a=await studioActor();if(!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(id))throw new Denied(404);const p=await prisma.devItemPhoto.findFirst({where:{id,ownerId:a.user.id,listing:{ownerId:a.user.id}},select:{data:true,mimeType:true}});if(!p)throw new Denied(404);return new Response(new Uint8Array(p.data),{headers:{"Content-Type":p.mimeType,"Cache-Control":"private, no-store",Vary:"Cookie","X-Content-Type-Options":"nosniff","Cross-Origin-Resource-Policy":"same-origin","Content-Security-Policy":"default-src 'none'; sandbox"}});}catch(e){if(e instanceof Denied)return reply({code:e.code},e.status);logOperationalError("studio_photo",e);return reply({code:"UNAVAILABLE"},503);}}

import "server-only";
import type {Prisma} from "@prisma/client";
import {prisma} from "../prisma";
import {getCurrentUser} from "../auth";
import {disposableDatabaseUrl} from "../disposable-database-url";
import {readJsonObject} from "../api-response";
import {logOperationalError} from "../operational-error";
import {inspectionWindow,previewInput} from "./contracts";
export function inspectionEnabled(){return process.env.NODE_ENV==="development"&&process.env.HUSTLEN_INSPECTION_CANDIDATE==="owned-preview-only";}
export class InspectionDenied extends Error{constructor(public status:number){super("Inspection unavailable");}}
export async function inspectionActor(){
 if(!inspectionEnabled())throw new InspectionDenied(404);
 const env=process.env;if(!/^[a-f0-9]{24}$/.test(env.MRT_TEST_RUN_ID??"")||env.DATABASE_URL!==env.TEST_DATABASE_URL||env.DATABASE_URL!==env.MRT_TEST_DATABASE_URL)throw new InspectionDenied(404);
 const target=disposableDatabaseUrl(env.DATABASE_URL);
 const marker=await prisma.$queryRaw<{name:string;marker:string}[]>`SELECT current_database() name,shobj_description(oid,'pg_database') marker FROM pg_database WHERE datname=current_database()`;
 if(marker[0]?.name!==target.pathname.slice(1)||marker[0]?.marker!==`hustlen-mrt-test:${env.MRT_TEST_RUN_ID}`)throw new InspectionDenied(404);
 const user=await getCurrentUser();if(!user)throw new InspectionDenied(401);
 return user;
}
export async function inspectionSummary(id:number,userId:number,db:Pick<Prisma.TransactionClient,"booking"|"meetupEvent"|"meetupChallenge">=prisma){
 const b=await db.booking.findFirst({where:{id,OR:[{ownerId:userId},{renterId:userId}]},select:{id:true,ownerId:true,renterId:true,status:true,listing:{select:{title:true,categoryDetails:true}},handoff:{select:{performedBy:true,confirmedBy:true,conditionConfirmed:true,ownerConditionConfirmed:true}},return:{select:{initiatedBy:true,returnConfirmed:true,inspectedAt:true,inspectionAccepted:true}},evidencePhotos:{where:{stage:{in:["HANDOFF_OWNER","HANDOFF_BORROWER","RETURN_BORROWER","INSPECTION_OWNER"]}},select:{id:true,stage:true,mimeType:true,uploaderId:true,createdAt:true},orderBy:{createdAt:"asc"},take:100},disputes:{select:{id:true,openedBy:true,reason:true,description:true,status:true,createdAt:true},orderBy:{createdAt:"desc"},take:20}}});
 if(!b)throw new InspectionDenied(404);
 const receipt=await db.meetupEvent.findFirst({where:{bookingId:id,purpose:"RETURN",kind:"PHYSICAL_RECEIPT_ACK",actorId:b.ownerId,challengeId:{not:null}},orderBy:{createdAt:"asc"},select:{challengeId:true,createdAt:true}});
 const challenge=receipt?.challengeId?await db.meetupChallenge.findFirst({where:{id:receipt.challengeId,bookingId:id,purpose:"RETURN",verifierId:b.ownerId,issuerId:b.renterId,consumedAt:{not:null},completedAt:{not:null},completionHash:{not:null}},select:{completedAt:true}}):null;
 const valid=b.return?.initiatedBy===b.renterId&&b.return?.returnConfirmed&&b.handoff?.performedBy===b.ownerId&&b.handoff?.confirmedBy===b.renterId&&b.handoff?.conditionConfirmed&&b.handoff?.ownerConditionConfirmed;
 const window=inspectionWindow(valid&&challenge?.completedAt?challenge.completedAt.toISOString():null,new Date());
 const details=b.listing.categoryDetails;
 const accessories=details&&typeof details==="object"&&!Array.isArray(details)&&typeof details.includedAccessories==="string"?details.includedAccessories.slice(0,2000):null;
 return {bookingId:b.id,title:b.listing.title,viewer:userId===b.ownerId?"OWNER" as const:"BORROWER" as const,legacyStatus:b.status,physicalCustody:window.returnedAt?"RETURN_ACKNOWLEDGED" as const:"UNCONFIRMED" as const,returnedAt:window.returnedAt,inspectionDeadline:window.deadline,serverNow:new Date().toISOString(),inspectionOpen:window.open&&b.status==="INSPECTION"&&(!b.return?.inspectedAt||b.return?.inspectionAccepted===false)&&!b.disputes.some(d=>d.status==="OPEN"),inspectionPending:!b.return?.inspectedAt,inspectionAccepted:b.return?.inspectionAccepted??null,accessories,accessoryProvenance:"CURRENT_OWNER_DECLARATION_NOT_RENTAL_SNAPSHOT",evidence:b.evidencePhotos.map(p=>({...p,createdAt:p.createdAt.toISOString(),source:p.stage==="INSPECTION_OWNER"?"LATER_INSPECTION_RECORD":"ORIGINAL_PICKUP_RETURN_RECORD"})),evidenceTruncated:b.evidencePhotos.length===100,disputes:b.disputes.map(d=>({...d,createdAt:d.createdAt.toISOString()})),responseDeadline:null,notificationStatus:"NO_QUALIFYING_DELIVERY_RECORD",financialState:"NOT_IMPLEMENTED",previewOnly:true as const};
}
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{"Cache-Control":"private, no-store",Vary:"Cookie"}});
export async function inspectionApi(request:Request){
 try{
  const user=await inspectionActor();
  if(request.method==="GET"){
   const q=new URL(request.url).searchParams;
   if([...q.keys()].some(k=>k!=="bookingId")||q.getAll("bookingId").length!==1||!(/^[1-9]\d{0,9}$/.test(q.get("bookingId")??""))||Number(q.get("bookingId"))>2147483647)throw new InspectionDenied(400);
   return reply(await inspectionSummary(Number(q.get("bookingId")),user.id));
  }
  const origin=process.env.HUSTLEN_INSPECTION_ORIGIN;
  if(!origin||new URL(origin).hostname!=="localhost"||new URL(origin).origin!==origin||new URL(request.url).origin!==origin||request.headers.get("origin")!==origin||request.headers.get("x-hustlen-inspection")!=="1"||request.headers.get("sec-fetch-site")==="cross-site")throw new InspectionDenied(403);
  if(new URL(request.url).search||request.headers.get("content-type")!=="application/json")throw new InspectionDenied(400);
  let input;try{input=previewInput(await readJsonObject(request));}catch{throw new InspectionDenied(400);}
  const state=await inspectionSummary(input.bookingId,user.id);
  if(input.mode==="CLAIM"&&(state.viewer!=="OWNER"||!state.inspectionOpen))throw new InspectionDenied(409);
  if(input.mode==="RESPONSE"&&(state.viewer!=="BORROWER"||state.physicalCustody!=="RETURN_ACKNOWLEDGED"||!state.disputes.some(d=>d.status==="OPEN"&&d.openedBy!==user.id)))throw new InspectionDenied(409);
  if(input.evidenceIds.some(id=>!state.evidence.some(e=>e.id===id)))throw new InspectionDenied(403);
  // No database mutation, notification, legacy dispute call, upload or provider execution exists here.
  const current=await inspectionActor();if(current.id!==user.id)throw new InspectionDenied(401);
  const final=await inspectionSummary(input.bookingId,user.id);
  if(input.mode==="CLAIM"&&!final.inspectionOpen)throw new InspectionDenied(409);
  if(input.mode==="RESPONSE"&&(final.physicalCustody!=="RETURN_ACKNOWLEDGED"||!final.disputes.some(d=>d.status==="OPEN"&&d.openedBy!==user.id)))throw new InspectionDenied(409);
  return reply({preview:input,submitted:false,notificationDelivered:false,responseDeadline:null,automaticLiability:false,financialAction:false});
 }catch(e){if(e instanceof InspectionDenied)return reply({code:e.status===401?"SESSION":e.status===409?"WINDOW_OR_ROLE":"UNAVAILABLE"},e.status);logOperationalError("inspection_preview",e);return reply({code:"UNAVAILABLE"},503);}
}

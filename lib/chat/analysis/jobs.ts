import { randomUUID } from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";
import { ANALYSIS_VERSION, analyze, AnalysisFailure, MockProvider, type AnalysisProvider } from "./provider";
export function analysisEnabled(){return process.env.CHAT_ANALYSIS_MODE==="mock-shadow";}
export async function enqueueAnalysis(tx:Prisma.TransactionClient,messageId:number,conversationId:number,sequence:number,listingTitle:string){
  if(!analysisEnabled())return;
  // Freeze exactly the preceding visible messages also eligible for the original case snapshot.
  const context=await tx.chatMessage.findMany({where:{conversationId,sequence:{gte:Math.max(1,sequence-2),lt:sequence},status:{in:["ALLOWED","FLAGGED"]}},orderBy:{sequence:"asc"},take:2,select:{id:true}});
  await tx.chatAnalysisJob.create({data:{messageId,analysisVersion:ANALYSIS_VERSION,contextMessageIds:context.map(m=>m.id),listingTitle:listingTitle.slice(0,120)}});
}
/** Short DB lease, no transaction held across provider work. No imports of enforcement/account/booking services. */
export async function claimAnalysis(db:PrismaClient,now=new Date()){
  const token=randomUUID(),leaseUntil=new Date(now.getTime()+30000);
  return db.$transaction(async tx=>{
    await tx.chatAnalysisJob.updateMany({where:{status:"RUNNING",leaseUntil:{lte:now},attempts:{gte:3}},data:{status:"FAILED",leaseUntil:null,leaseToken:null,errorCode:"LEASE_EXHAUSTED",completedAt:now}});
    const ids=await tx.$queryRaw<{id:number}[]>`SELECT id FROM "ChatAnalysisJob" WHERE "analysisVersion"=${ANALYSIS_VERSION} AND attempts<3 AND ((status='WAITING' AND "availableAt"<=${now}) OR (status='RUNNING' AND "leaseUntil"<=${now})) ORDER BY id FOR UPDATE SKIP LOCKED LIMIT 1`;
    if(!ids.length)return null;
    return tx.chatAnalysisJob.update({where:{id:ids[0].id},data:{status:"RUNNING",attempts:{increment:1},leaseToken:token,leaseUntil,errorCode:null}});
  });
}
export async function finishAnalysis(db:PrismaClient,job:{id:number;leaseToken:string|null;attempts:number},result:{recommendation?:Prisma.InputJsonValue;errorCode?:string},now=new Date()){
  const success=result.recommendation!==undefined,terminal=success||job.attempts>=3;
  return db.chatAnalysisJob.updateMany({where:{id:job.id,status:"RUNNING",leaseToken:job.leaseToken,leaseUntil:{gt:now}},data:{status:success?"SUCCEEDED":terminal?"FAILED":"WAITING",leaseUntil:null,leaseToken:null,completedAt:terminal?now:null,errorCode:success?null:result.errorCode??"PROVIDER_UNAVAILABLE",availableAt:new Date(now.getTime()+1000*2**job.attempts),...(success?{recommendation:result.recommendation}:{})}});
}
/** Dependency injection is for isolated tests. The shipped CLI uses only MockProvider. */
export async function processAnalysis(db:PrismaClient,provider:AnalysisProvider=new MockProvider(),timeoutMs=3000){
  const job=await claimAnalysis(db);if(!job)return {processed:false};
  try{
    const message=await db.chatMessage.findUniqueOrThrow({where:{id:job.messageId}});
    const previous=await db.chatMessage.findMany({where:{id:{in:job.contextMessageIds},conversationId:message.conversationId,sequence:{lt:message.sequence}},orderBy:{sequence:"asc"},select:{body:true}});
    if(previous.length!==job.contextMessageIds.length)throw new AnalysisFailure("INVALID_RESPONSE");
    const recommendation=await analyze(provider,{current:message.body,previous:previous.map(m=>m.body),listingTitle:job.listingTitle},timeoutMs);
    const saved=await finishAnalysis(db,job,{recommendation});
    return {processed:true,jobId:job.id,status:saved.count?"SUCCEEDED":"STALE"};
  }catch(error){
    const code=error instanceof AnalysisFailure?error.code:"PROVIDER_UNAVAILABLE";
    const saved=await finishAnalysis(db,job,{errorCode:code});
    return {processed:true,jobId:job.id,status:saved.count?(job.attempts>=3?"FAILED":"WAITING"):"STALE",errorCode:code};
  }
}

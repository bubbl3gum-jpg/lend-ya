import { CHAT_POLICY_VERSION, moderateText } from "../policy";
export const ANALYSIS_VERSION="shadow-2.3-1";
export const categories=["NO_VIOLATION","THREATS","ILLEGAL_GOODS","PROHIBITED_SOLICITATION","SCAMS","HARASSMENT","SPAM","LINK_RISK","OTHER"] as const;
export type AnalysisContext={current:string;previous:string[];listingTitle:string};
export type Recommendation={category:typeof categories[number];suggestedOutcome:"ALLOWED"|"FLAGGED"|"HELD"|"REJECTED";explanation:string;reasonCodes:string[];policyVersion:string;analysisVersion:string;providerVersion:string;modelVersion:string;requiresHumanReview:true};
export interface AnalysisProvider {readonly providerVersion:string;readonly modelVersion:string;analyze(context:AnalysisContext,signal:AbortSignal):Promise<unknown>}
export type FailureCode="TIMEOUT"|"PROVIDER_UNAVAILABLE"|"INVALID_RESPONSE"|"CONFIGURATION";
export class AnalysisFailure extends Error {constructor(readonly code:FailureCode){super(code);}}
/** Data only: no separate account/contact fields, attachments or unrelated history. Text itself may contain PII. */
export function boundedContext(input:AnalysisContext):AnalysisContext{
  return {current:input.current.slice(0,4000),previous:input.previous.slice(-2).map(s=>s.slice(0,500)),listingTitle:input.listingTitle.slice(0,120)};
}
const keys=["category","suggestedOutcome","explanation","reasonCodes","policyVersion","analysisVersion","providerVersion","modelVersion","requiresHumanReview"].sort();
export function validateRecommendation(value:unknown,provider:Pick<AnalysisProvider,"providerVersion"|"modelVersion">):Recommendation{
  if(!value||typeof value!=="object"||Array.isArray(value))throw new AnalysisFailure("INVALID_RESPONSE");
  const r=value as Record<string,unknown>;
  if(Object.keys(r).sort().join()!==keys.join()||!categories.includes(r.category as typeof categories[number])||typeof r.suggestedOutcome!=="string"||!["ALLOWED","FLAGGED","HELD","REJECTED"].includes(r.suggestedOutcome)||
    typeof r.explanation!=="string"||!r.explanation.trim()||r.explanation.length>240||/[\u0000-\u001f\u007f]/.test(r.explanation)||
    !Array.isArray(r.reasonCodes)||r.reasonCodes.length<1||r.reasonCodes.length>8||!r.reasonCodes.every(c=>typeof c==="string"&&/^[A-Z][A-Z0-9_]{0,63}$/.test(c))||
    r.policyVersion!==CHAT_POLICY_VERSION||r.analysisVersion!==ANALYSIS_VERSION||r.providerVersion!==provider.providerVersion||r.modelVersion!==provider.modelVersion||r.requiresHumanReview!==true||
    (r.suggestedOutcome==="ALLOWED"&&r.category!=="NO_VIOLATION")||(r.category==="NO_VIOLATION"&&r.suggestedOutcome!=="ALLOWED"))throw new AnalysisFailure("INVALID_RESPONSE");
  return r as Recommendation;
}
export async function analyze(provider:AnalysisProvider,input:AnalysisContext,timeoutMs=3000):Promise<Recommendation>{
  if(!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>10000)throw new AnalysisFailure("CONFIGURATION");
  const controller=new AbortController();let timer:ReturnType<typeof setTimeout>|undefined;
  try{
    const value=await Promise.race([provider.analyze(boundedContext(input),controller.signal),new Promise<never>((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new AnalysisFailure("TIMEOUT"));},timeoutMs);})]);
    return validateRecommendation(value,provider);
  }catch(error){throw error instanceof AnalysisFailure?error:new AnalysisFailure("PROVIDER_UNAVAILABLE");}
  finally{clearTimeout(timer);controller.abort();}
}
/** Test double, not an independent intelligent model or an accuracy improvement claim. */
export class MockProvider implements AnalysisProvider{
  readonly providerVersion="deterministic-mock-v1";readonly modelVersion="rules-mock-v1";
  async analyze(context:AnalysisContext):Promise<Recommendation>{
    const r=moderateText(context.current);
    return {category:categories.find(c=>c===r.categories[0])??(r.categories.length?"OTHER":"NO_VIOLATION"),suggestedOutcome:r.outcome,explanation:"Synthetic deterministic mock recommendation; independently review the evidence.",reasonCodes:r.ruleCodes.length?r.ruleCodes:["NO_RULE_SIGNAL"],policyVersion:CHAT_POLICY_VERSION,analysisVersion:ANALYSIS_VERSION,providerVersion:this.providerVersion,modelVersion:this.modelVersion,requiresHumanReview:true};
  }
}

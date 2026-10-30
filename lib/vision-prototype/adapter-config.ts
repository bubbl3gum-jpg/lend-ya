import {prototypeEnabled} from "./config";
export const visionModel="qwen3-vl:8b-instruct-q4_K_M" as const;
export const visionEndpoint="http://127.0.0.1:11434" as const;
export const visionLimits={images:4,dimension:1536,imageBytes:1048576,totalImageBytes:4194304,requestBytes:6291456,responseBytes:65536,context:8192,output:2048,timeoutMs:60000} as const;
export const visionErrorCodes=["UNAVAILABLE","EXECUTION_NOT_AUTHORIZED","MODEL_IDENTITY","INPUT","IMAGE_BINDING","LIMIT","CANCELED","TIMEOUT","TRANSPORT","RESPONSE_SIZE","PROVIDER_JSON","PROVIDER_ENVELOPE","CONTENT_JSON","INCOMPLETE_OUTPUT","OBSERVATION"] as const;
export class VisionAdapterError extends Error{
 latencyMs:number|null=null;
 constructor(public code:typeof visionErrorCodes[number]){super(code);this.name="VisionAdapterError";}
}
export type VisionConfig={endpoint:typeof visionEndpoint;model:typeof visionModel;manifestDigest:string};
export function visionConfig(env:Record<string,string|undefined>=process.env):VisionConfig{
 if(!prototypeEnabled(env))throw new VisionAdapterError("UNAVAILABLE");
 if(env.HUSTLEN_VISION_OLLAMA_MODEL!==visionModel||(env.HUSTLEN_VISION_OLLAMA_ENDPOINT??visionEndpoint)!==visionEndpoint||!/^sha256:[a-f0-9]{64}$/.test(env.HUSTLEN_VISION_MODEL_MANIFEST_DIGEST??""))throw new VisionAdapterError("MODEL_IDENTITY");
 return {endpoint:visionEndpoint,model:visionModel,manifestDigest:env.HUSTLEN_VISION_MODEL_MANIFEST_DIGEST!};
}

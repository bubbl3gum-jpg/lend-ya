import {visionConfig,VisionAdapterError,type VisionConfig} from "./adapter-config";
import {prototypeEnabled} from "./config";
export const geminiModel="gemini-3.8-flash" as const; // Provisional ID; independent model listing unverified.
export const geminiEndpoint="https://generativelanguage.googleapis.com/v1beta" as const;
export type ProviderChoice={provider:"GEMINI";model:typeof geminiModel;endpoint:typeof geminiEndpoint}|{provider:"OLLAMA";config:VisionConfig};
/** One explicit server choice. No defaults, browser model selectors, switching or fallback. */
export function visionProvider(env:Record<string,string|undefined>=process.env):ProviderChoice{
 if(!prototypeEnabled(env))throw new VisionAdapterError("UNAVAILABLE");
 if(env.HUSTLEN_VISION_PROVIDER==="OLLAMA")return {provider:"OLLAMA",config:visionConfig(env)};
 if(env.HUSTLEN_VISION_PROVIDER!=="GEMINI"||env.HUSTLEN_GEMINI_VISION_MODEL!==geminiModel||(env.HUSTLEN_GEMINI_VISION_ENDPOINT??geminiEndpoint)!==geminiEndpoint)throw new VisionAdapterError("MODEL_IDENTITY");
 return {provider:"GEMINI",model:geminiModel,endpoint:geminiEndpoint};
}

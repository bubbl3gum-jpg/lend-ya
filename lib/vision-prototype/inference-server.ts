import "server-only";
import {prototypeActor} from "./server";
import {blockedVisionExecution} from "./adapter";
/** Deliberately no route or UI call site. Authorization is independent of model configuration. */
export async function requestVisionInference(refs:readonly string[],signal:AbortSignal){
 await prototypeActor();
 const result=await blockedVisionExecution(refs,signal);
 await prototypeActor();
 return result;
}

import {createHash} from "node:crypto";
import {playgroundTask} from "./playground";
import {groundedHelpTask} from "./knowledge";
import {InferenceError} from "./contracts";
/** Opt-in fictional assistance; reuse the unchanged M5A source selector. No record readers. */
export function caseAssistanceTask(raw:unknown){
 if(!raw||typeof raw!=="object"||Array.isArray(raw))throw new InferenceError("INPUT");
 const x=raw as Record<string,unknown>;
 if(Object.keys(x).sort().join()!=="language,messages,mode,side,topic"||x.mode!=="CASE_ASSISTANCE")throw new InferenceError("INPUT");
 const task=x.topic==="GENERAL"?playgroundTask({mode:"PLAYGROUND",side:x.side,language:x.language,messages:x.messages}):groundedHelpTask({mode:"GROUNDED",topic:x.topic,side:x.side,language:x.language,messages:x.messages});
 const manifest={...task.manifest,caseId:"SYN-CASE-ASSISTANCE",title:"Fictional case assistance: inferred issue/stage, not a loaded booking"};
 if(Buffer.byteLength(JSON.stringify(manifest))>12000)throw new InferenceError("INPUT");
 return {...task,id:`SYN-CASE-ASSISTANCE:${String(x.topic)}:${manifest.language}`,manifest,digest:createHash("sha256").update(JSON.stringify(manifest)).digest("hex")};
}

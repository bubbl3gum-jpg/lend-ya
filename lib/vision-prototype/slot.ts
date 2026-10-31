import {VisionAdapterError} from "./adapter-config";
let busy=false;
/** Shared by the local and hosted candidates; one Vision operation per process. */
export function acquireVisionSlot(){if(busy)throw new VisionAdapterError("LIMIT");busy=true;let released=false;return ()=>{if(!released){released=true;busy=false;}};}

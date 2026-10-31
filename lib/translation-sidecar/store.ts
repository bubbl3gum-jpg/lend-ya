import {randomUUID} from "node:crypto";
import type {Manifest} from "../ai-case-brief/contracts";
import {validateAdvisory,type Advisory} from "../local-inference/contracts";
import {validateCaseAdvisory} from "../local-inference/case-notes";
import {hash,selectedTexts} from "./contracts";
import {TranslationError,type SnapshotDescriptor,type TranslationArtifact} from "./types";
export type Scope={actorId:number;sessionBinding:string;expiresAt:number};
export type Canonical={manifest:Manifest;output:Advisory;model:string};
type Entry={scope:Scope;canonical:Canonical;descriptor:SnapshotDescriptor;bytes:number;timer:ReturnType<typeof setTimeout>;requests:Map<string,{digest:string;result:TranslationArtifact}>};
function freeze(value:unknown){if(value&&typeof value==="object"){Object.values(value).forEach(freeze);Object.freeze(value);}}
/** Process-memory only; timer deletion, no files/DB, no cross-session lookup. */
export class SnapshotStore{
 private entries=new Map<string,Entry>();private bytes=0;
 constructor(private clock=Date.now){}
 private remove(ref:string){const e=this.entries.get(ref);if(e){clearTimeout(e.timer);this.bytes-=e.bytes;this.entries.delete(ref);}}
 private sweep(){for(const [id,e]of this.entries)if(Date.parse(e.descriptor.expiresAt)<=this.clock())this.remove(id);}
 capture(scope:Scope,input:Canonical):SnapshotDescriptor{
  this.sweep();if(!["en","zh-TW"].includes(input.manifest.language))throw new TranslationError("MIXED_SOURCE_UNSUPPORTED");if(scope.expiresAt<=this.clock())throw new TranslationError("SESSION");
  const output=input.manifest.caseId==="SYN-CASE-ASSISTANCE"?validateCaseAdvisory(input.output,input.manifest):validateAdvisory(input.output,input.manifest);
  const canonical=structuredClone({...input,output}),bytes=Buffer.byteLength(JSON.stringify(canonical));if(bytes>262144)throw new TranslationError("LIMIT");
  const owned=[...this.entries].filter(([,e])=>e.scope.sessionBinding===scope.sessionBinding);if(owned.length>=6)this.remove(owned[0][0]);
  if(this.entries.size>=128||[...this.entries.values()].filter(e=>e.scope.actorId===scope.actorId).length>=12||this.bytes+bytes>4194304)throw new TranslationError("LIMIT");
  const expires=Math.min(scope.expiresAt,this.clock()+300000),responseRef=randomUUID();
  const descriptor:SnapshotDescriptor={version:"translation-snapshot-v1",responseRef,canonicalDigest:hash(canonical),manifestDigest:hash(canonical.manifest),sourceLocale:canonical.manifest.language,expiresAt:new Date(expires).toISOString(),fieldPaths:Object.keys(selectedTexts(output,canonical.manifest.language)),mode:"MOCK_ONLY"};
  const timer=setTimeout(()=>this.remove(responseRef),Math.max(1,expires-this.clock()));timer.unref();freeze(canonical);freeze(descriptor);
  this.entries.set(responseRef,{scope:{...scope},canonical,descriptor,bytes,timer,requests:new Map()});this.bytes+=bytes;return structuredClone(descriptor);
 }
 resolve(scope:Scope,ref:string){this.sweep();const e=this.entries.get(ref);if(!e||scope.expiresAt<=this.clock()||e.scope.actorId!==scope.actorId||e.scope.sessionBinding!==scope.sessionBinding)throw new TranslationError("STALE_SNAPSHOT");if(hash(e.canonical)!==e.descriptor.canonicalDigest)throw new TranslationError("STALE_SNAPSHOT");return e;}
 cache(scope:Scope,ref:string,key:string,requestDigest:string,result:TranslationArtifact){const e=this.resolve(scope,ref);const bytes=Buffer.byteLength(JSON.stringify(result));if(e.requests.size>=2||this.bytes+bytes>4194304)throw new TranslationError("LIMIT");const copy=structuredClone(result);freeze(copy);e.requests.set(key,{digest:requestDigest,result:copy});e.bytes+=bytes;this.bytes+=bytes;}
 clear(){for(const ref of this.entries.keys())this.remove(ref);}
}

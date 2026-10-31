import {hash,selectedTexts,requestInput,verifySourceLanguage,warnings} from "./contracts";
import {mockAdapter,validateMockFields} from "./mock";
import {TranslationError,type TranslationArtifact} from "./types";
import {SnapshotStore,type Scope} from "./store";
export function translate(store:SnapshotStore,scope:Scope,raw:unknown):TranslationArtifact{
 const start=performance.now(),r=requestInput(raw),e=store.resolve(scope,r.responseRef);
 if(r.canonicalDigest!==e.descriptor.canonicalDigest)throw new TranslationError("STALE_SNAPSHOT");
 const texts=selectedTexts(e.canonical.output,e.descriptor.sourceLocale),selected:Record<string,string>={};
 for(const path of r.fieldPaths){if(!Object.hasOwn(texts,path))throw new TranslationError("INPUT");selected[path]=texts[path];}
 const str=Object.values(selected).join("");if(Array.from(str).length>8000||Buffer.byteLength(str)>32768)throw new TranslationError("INPUT");
 const rd=hash(r),prior=e.requests.get(r.requestId);if(prior){if(prior.digest!==rd)throw new TranslationError("INPUT");return structuredClone(prior.result);}
 Object.values(selected).forEach(t=>verifySourceLanguage(t,e.descriptor.sourceLocale));
 const fields=validateMockFields(mockAdapter(selected,e.descriptor.sourceLocale,r.targetLocale),selected,e.descriptor.sourceLocale,r.targetLocale);
 const result:TranslationArtifact={version:"advisory-translation-v1",state:r.targetLocale===e.descriptor.sourceLocale?"NOT_NEEDED":"AVAILABLE_UNREVIEWED",responseRef:r.responseRef,canonicalDigest:r.canonicalDigest,manifestDigest:e.descriptor.manifestDigest,sourceLocale:e.descriptor.sourceLocale,targetLocale:r.targetLocale,requestId:r.requestId,provenance:"MOCK_TEST_OUTPUT",provider:{name:"AUTHORED_MOCK_CATALOGUE",version:"authored-translation-v1",model:null},latencyMs:Math.round(performance.now()-start),warnings:[...new Set(warnings(str))],fields};
 store.cache(scope,r.responseRef,r.requestId,rd,result);return structuredClone(result);
}

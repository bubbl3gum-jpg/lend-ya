import {test} from "node:test";
import assert from "node:assert/strict";
import {draftInput,emptyDraft,confirmationReady,agreementAdapter} from "../lib/item-studio/contracts";
import {studioText} from "../lib/i18n/studio";
test("durable draft inputs preserve distinct declaration/visibility states and reject forged authority",()=>{
 const data=emptyDraft();assert.deepEqual(draftInput(data),data);assert(!confirmationReady(data,["body"]));
 for(const raw of [{...data,verified:true},{...data,condition:"x".repeat(2001)},{...data,accessories:[{name:"Cap",quantity:"1",declaration:"MISSING",visibility:"NOT_VISIBLE",photoId:null}]}])assert.throws(()=>draftInput(raw));
 const normal={...data,accessoryStatement:"DECLARED",accessories:[{name:"Cap",quantity:"unknown",declaration:"UNSPECIFIED",visibility:"NOT_VISIBLE",photoId:null}]};assert.equal(draftInput(normal).accessories[0].declaration,"UNSPECIFIED");assert.equal(draftInput(normal).accessories[0].visibility,"NOT_VISIBLE");
 assert.throws(()=>draftInput({...normal,accessories:[{...normal.accessories[0],visibility:"DOCUMENTED"}]}));
 const none=draftInput({...emptyDraft(),accessoryStatement:"NONE",condition:"Known",defects:"None"});assert(confirmationReady(none,[]));assert(!confirmationReady({...none,accessoryStatement:"NOT_SPECIFIED"},[]));
});
test("agreement adapter never turns owner confirmation into rental agreement or custody proof",()=>{
 assert.deepEqual(agreementAdapter(),agreementAdapter());assert.equal(agreementAdapter().snapshot,null);assert.equal(agreementAdapter().creationAllowed,false);assert.equal(agreementAdapter().reason,"AGREEMENT_EXTENSION_REQUIRED");assert.deepEqual(Object.keys(studioText("en")),Object.keys(studioText("zh-TW")));
});

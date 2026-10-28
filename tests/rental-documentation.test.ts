import {test} from "node:test";
import assert from "node:assert/strict";
import {contentDigest,acknowledgement} from "../lib/rental-documentation/contracts";
import {agreementText} from "../lib/i18n/agreement";
test("canonical content identity is stable for object ordering and changes for material facts",()=>{assert.equal(contentDigest({a:1,b:{y:"cap",x:null}}),contentDigest({b:{x:null,y:"cap"},a:1}));assert.notEqual(contentDigest({accessory:"charger"}),contentDigest({accessory:"excluded charger"}));});
test("acknowledgement is exact and cannot assert borrower/hash/time/authority",()=>{const a={contextId:"11111111-1111-4111-a111-111111111111",versionId:"22222222-2222-4222-a222-222222222222",acknowledged:true};assert.equal(acknowledgement(a).acknowledged,true);for(const r of [null,{...a,acknowledged:false},{...a,borrowerId:2},{...a,hash:"forged"},{...a,timestamp:new Date().toISOString()},{...a,role:"ADMIN"},{...a,versionId:"draft"}])assert.throws(()=>acknowledgement(r));assert.deepEqual(Object.keys(agreementText("en")),Object.keys(agreementText("zh-TW")));});

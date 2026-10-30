import {test} from "node:test";
import assert from "node:assert/strict";
import {fictionalHandoff,handoffReceipt} from "../lib/local-inference/support-handoff";
const key="00000000-0000-4000-8000-000000000000";
test("handoff is bounded unverified text with no actor or record selectors",()=>{
 const p=fictionalHandoff("Fictional accessory concern; loss unconfirmed.",key);
 assert.equal(p.categoryCode,"OTHER_SUPPORT");assert(p.description.includes("unverified"));assert.equal(p.bookingId,null);assert.equal(p.listingId,null);assert.equal(p.disputeId,null);assert(!("actorId" in p));
 for(const text of ["", "   ", "x".repeat(2001),"bad\\0".replace("\\0","\0")])assert.throws(()=>fictionalHandoff(text,key));
 assert.throws(()=>fictionalHandoff("test","forged"));
});
test("receipt requires actual received-ticket shape, never draft or assignment",()=>{
 const r={id:key,categoryCode:"OTHER_SUPPORT",currentState:"RECEIVED",createdAt:"2026-10-30T00:00:00Z"};assert.deepEqual(handoffReceipt(r),{id:key,createdAt:r.createdAt});
 for(const x of [null,{}, {...r,id:"draft"},{...r,currentState:"ASSIGNED"},{...r,createdAt:"bad"}])assert.throws(()=>handoffReceipt(x));
});

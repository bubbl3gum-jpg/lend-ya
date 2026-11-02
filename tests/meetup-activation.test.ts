import {test} from "node:test";
import assert from "node:assert/strict";
import {secret,confirmationTtlSeconds,ttlSeconds,checkInTtlSeconds} from "../lib/meetup/config";
test("mandatory booking verification requires explicit trusted secret and bounded confirmation configuration",()=>{
 const keys=["MEETUP_CODE_SECRET","MEETUP_CONFIRMATION_TTL_SECONDS","MEETUP_CHALLENGE_TTL_SECONDS","MEETUP_CHECKIN_TTL_SECONDS"];
 const saved=keys.map(k=>process.env[k]);
 try {
  delete process.env.MEETUP_CODE_SECRET;assert.throws(()=>secret());
  process.env.MEETUP_CODE_SECRET="x".repeat(32);assert.equal(secret().length,32);
  delete process.env.MEETUP_CONFIRMATION_TTL_SECONDS;assert.throws(()=>confirmationTtlSeconds());
  process.env.MEETUP_CONFIRMATION_TTL_SECONDS="900";assert.equal(confirmationTtlSeconds(),900);
  for(const value of ["0","999999","invalid"]){process.env.MEETUP_CHALLENGE_TTL_SECONDS=value;assert.throws(()=>ttlSeconds());process.env.MEETUP_CHECKIN_TTL_SECONDS=value;assert.throws(()=>checkInTtlSeconds());}
 } finally {keys.forEach((k,i)=>{if(saved[i]===undefined)delete process.env[k];else process.env[k]=saved[i]});}
});

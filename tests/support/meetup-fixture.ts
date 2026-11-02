/** Authenticated real HTTP QR-protocol setup for non-camera suites.
 * Synthetic coordinates, not real GPS or camera acceptance. Never used by application code.
 */
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
type CookieContext={cookies(urls?:string|string[]):Promise<Array<{name:string;value:string}>>};
import {stationCoordinates} from "../../lib/meetup/location";
export function meetupFixture(base:string,ownerCookie:string,borrowerCookie:string) {
  async function request<T>(id:number,operation:string,cookie:string,body?:object):Promise<T>{
    const r=await fetch(`${base}/api/bookings/${id}/meetup/${operation}`,{method:body?"POST":"GET",headers:{Cookie:cookie,Origin:base,"Content-Type":"application/json"},...(body?{body:JSON.stringify(body)}:{})});
    assert.equal(r.status,200,`Synthetic verification ${operation} failed (${r.status})`);
    return await r.json() as T;
  }
  return {
    async arrivals(id:number,purpose:"PICKUP"|"RETURN"){
      const status=await request<{station:{canonicalId:string}}>(id,"status",ownerCookie);
      const point=stationCoordinates.find(s=>s.id===status.station.canonicalId);
      assert.ok(point&&typeof point.latitude==="number"&&typeof point.longitude==="number");
      for(const [n,cookie]of [ownerCookie,borrowerCookie].entries()) await request(id,"checkin",cookie,{purpose,requestKey:randomUUID(),mode:"location",latitude:point.latitude+n*0.00005,longitude:point.longitude,accuracy:10,timestamp:Date.now()});
    },
    async scanPayload(id:number,purpose:"PICKUP"|"RETURN"){
      const issued=await request<{challengeId:string;qrPayload:string}>(id,"issue",purpose==="PICKUP"?ownerCookie:borrowerCookie,{purpose,requestKey:randomUUID()});
      await request(id,"verify",purpose==="PICKUP"?borrowerCookie:ownerCookie,{purpose,challengeId:issued.challengeId,qrPayload:issued.qrPayload,requestKey:randomUUID()});
      return {meetupChallengeId:issued.challengeId,physicalReceipt:true};
    },
  };
}
export async function browserMeetupFixture(base:string,owner:CookieContext,borrower:CookieContext){
 const cookie=async(c:CookieContext)=>(await c.cookies(base)).filter(x=>x.name==="p2p_session").map(x=>`${x.name}=${x.value}`).join("; ");
 return meetupFixture(base,await cookie(owner),await cookie(borrower));
}

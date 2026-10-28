import {test} from "node:test";
import assert from "node:assert/strict";
import {randomUUID,createHash} from "node:crypto";
import {writeFile} from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import {expect} from "playwright/test";
import {connectTestDatabase} from "./support/test-database";
import {launchBrowser,collectBrowserErrors} from "./support/browser";
import {emptyDraft} from "../lib/item-studio/contracts";
test("R2 actual request and owner acceptance bind exact acknowledged documentation, reject stale/foreign/replay and preserve legacy",{timeout:150000},async t=>{
 const db=await connectTestDatabase(),base=process.env.TEST_BASE_URL!,art=process.env.MRT_TEST_ARTIFACT_DIR!;t.after(async()=>{await db.end();});
 if(process.env.NODE_ENV==="production"){for(const route of ["/api/dev/rental-documentation?kind=selection&id=1","/api/dev/rental-documentation/photos/"+randomUUID()+"?bookingId=1"]){for(const method of ["GET","POST"]){const r=await fetch(base+route,{method,headers:{Origin:base,"Content-Type":"application/json","X-Hustlen-Documentation-Agreement":"1"},...(method==="POST"?{body:"{}"}:{})});assert.equal(r.status,404);}}return;}
 const actors=[];for(const name of ["Synthetic agreement owner","Synthetic agreement borrower","Synthetic unrelated reader"]){const email=randomUUID()+"@fixture.test",password="Owned-agreement-R2!";const r=await fetch(base+"/api/auth/register",{method:"POST",headers:{Origin:base,"Content-Type":"application/json"},body:JSON.stringify({name,email,password})});assert.equal(r.status,201);actors.push({id:(await r.json()).user.id,token:r.headers.get("set-cookie")!.match(/p2p_session=([^;]+)/)![1],email,password});}const [owner,borrower,other]=actors;
 const h=(token=borrower.token)=>({Cookie:"p2p_session="+token,Origin:base,"Content-Type":"application/json","X-Hustlen-Documentation-Agreement":"1","X-Hustlen-Item-Studio":"1"});
 const post=(route:string,body:unknown,token=borrower.token,key?:string)=>fetch(base+route,{method:"POST",headers:{...h(token),...(key?{"Idempotency-Key":key}:{})},body:JSON.stringify(body)});
 const photo=await sharp({create:{width:800,height:800,channels:3,background:{r:120,g:110,b:90}}}).png().toBuffer();
 const listing=(await db.query(`INSERT INTO "Listing"("ownerId",title,description,category,price,deposit,condition,status,"updatedAt")VALUES($1,'Synthetic camera with charger','Owned agreement fixture','Cameras',10,100,'Declared wear','ACTIVE',NOW())RETURNING id`,[owner.id])).rows[0].id;
 const {eligibleStationWhere}=await import("../lib/mrt/network");const stationRow=(await db.query('SELECT id,"nameEn" FROM "MrtStation" WHERE "canonicalId"=$1 AND operational=true',[eligibleStationWhere.canonicalId.in[0]])).rows[0];assert(stationRow);const station=stationRow.id;
 await db.query('INSERT INTO "ListingStation"("listingId","stationId")VALUES($1,$2)',[listing,station]);
 const media=randomUUID();await db.query('INSERT INTO "ListingMedia"("listingId",url,"mimeType",kind)VALUES($1,$2,\'image/png\',\'PHOTO\')',[listing,"/api/listing-media/"+media+".png"]);
 // New listing media is an owned fixture file so the real listing page remains genuine.
 const fs=await import("node:fs/promises");await fs.mkdir("storage/listings",{recursive:true});await fs.writeFile(path.resolve("storage/listings",media+".png"),photo);
 let r=await post("/api/dev/item-studio",{action:"SAVE",listingId:listing,expectedRevision:0,data:{...emptyDraft(),accessoryStatement:"DECLARED",condition:"Camera with documented wear",defects:"Known body scuff",accessories:[{name:"Charger",quantity:"1",declaration:"INCLUDED",visibility:"NOT_VISIBLE",photoId:null}]}},owner.token);assert.equal(r.status,200);let studio=await r.json();
 for(const area of studio.checklist.areas){const f=new FormData();f.set("listingId",String(listing));f.set("expectedRevision",String(studio.revision));f.set("areaId",area.id);f.set("photo",new Blob([new Uint8Array(photo)],{type:"image/png"}),"fixture.png");r=await fetch(base+"/api/dev/item-studio",{method:"POST",headers:{Cookie:"p2p_session="+owner.token,Origin:base,"X-Hustlen-Item-Studio":"1"},body:f});assert.equal(r.status,200);studio=await r.json();}
 r=await post("/api/dev/item-studio",{action:"CONFIRM",listingId:listing,expectedRevision:studio.revision,confirmed:true},owner.token);assert.equal(r.status,200);studio=await r.json();const version=studio.versions[0].id,photoId=studio.data.photos[0].photoId;
 const select=(versionId:string|null,revision:number)=>post("/api/dev/rental-documentation",{listingId:listing,versionId,expectedRevision:revision},owner.token);
 const terms={listingId:listing,startAt:"2035-02-01T10:00",endAt:"2035-02-02T10:00",meetingStationId:station,notes:"Synthetic request"};
 const foreignListing=(await db.query(`INSERT INTO "Listing"("ownerId",title,description,category,price,condition,"updatedAt")VALUES($1,'Synthetic other listing','Owned fixture','Cameras',10,'Unknown',NOW())RETURNING id`,[owner.id])).rows[0].id;
 assert.equal((await post("/api/dev/rental-documentation",{listingId:foreignListing,versionId:version,expectedRevision:0},owner.token)).status,409);
 const legacyQuote=await(await post("/api/bookings",{...terms,quote:true})).json();assert.equal(legacyQuote.documentationReview,undefined);
 const legacyRequest=await post("/api/bookings",terms);assert.equal(legacyRequest.status,201);const legacyId=(await legacyRequest.json()).booking.id;
 assert.equal((await select(version,0)).status,200);
 const quote=async(input=terms,token=borrower.token)=>{const r=await post("/api/bookings",{...input,quote:true},token);assert.equal(r.status,200);return r.json();};
 let q=await quote();const review=q.documentationReview;assert.equal(review.document.versionId,version);assert.equal(review.document.data.accessories[0].declaration,"INCLUDED");assert.equal((await post("/api/bookings",terms)).status,400);
 const ack={contextId:review.contextId,versionId:version,acknowledged:true};
 assert.equal((await post("/api/bookings",{...terms,documentation:{...ack,borrowerId:other.id}})).status,400);
 assert.equal((await post("/api/bookings",{...terms,documentation:{...ack,versionId:randomUUID()}})).status,409);
 assert.equal((await post("/api/bookings",{...terms,notes:"Changed terms",documentation:ack})).status,409);
 assert.equal((await post("/api/bookings",{...terms,documentation:ack},other.token)).status,409);
 const mediaUrl=`/api/dev/rental-documentation/photos/${photoId}?contextId=${review.contextId}`;
 assert.equal((await fetch(base+mediaUrl,{headers:h()})).status,200);assert.equal((await fetch(base+mediaUrl,{headers:h(other.token)})).status,404);assert.equal((await fetch(base+`/api/dev/item-studio/photos/${photoId}`,{headers:h()})).status,404);
 // Bounded negative contexts are synthetic fixture records in this owned database only.
 const exp=await quote();await db.query('ALTER TABLE "DevDocReviewContext" DISABLE TRIGGER doc_context_guard');try{await db.query(`UPDATE "DevDocReviewContext" SET "expiresAt"=clock_timestamp()-interval '1 second' WHERE id=$1`,[exp.documentationReview.contextId]);}finally{await db.query('ALTER TABLE "DevDocReviewContext" ENABLE TRIGGER doc_context_guard');}
 assert.equal((await post("/api/bookings",{...terms,documentation:{...ack,contextId:exp.documentationReview.contextId}})).status,409);
 assert.equal((await post("/api/dev/rental-documentation",{listingId:listing,versionId:version,expectedRevision:1},other.token)).status,403);
 const csrf=await fetch(base+"/api/bookings",{method:"POST",headers:{...h(),Origin:"https://untrusted.invalid"},body:JSON.stringify({...terms,documentation:ack})});assert.equal(csrf.status,403);
 const noHeader=await fetch(base+"/api/bookings",{method:"POST",headers:{Cookie:"p2p_session="+borrower.token,Origin:base,"Content-Type":"application/json"},body:JSON.stringify({...terms,documentation:ack})});assert.equal(noHeader.status,403);
 const savedRevision=(await db.query('SELECT revision FROM "DevDocSelection" WHERE "listingId"=$1',[listing])).rows[0].revision;
 assert.equal((await select(randomUUID(),savedRevision)).status,409);assert.equal((await db.query('SELECT revision FROM "DevDocSelection" WHERE "listingId"=$1',[listing])).rows[0].revision,savedRevision);
 const freshLogin=await post("/api/auth/login",{email:borrower.email,password:borrower.password});assert.equal(freshLogin.status,200);const otherSession=freshLogin.headers.get("set-cookie")!.match(/p2p_session=([^;]+)/)![1];assert.equal((await post("/api/bookings",{...terms,documentation:ack},otherSession)).status,409);
 // Inject a post-write persistence failure solely in this owned fixture. The acknowledgement must roll back with Booking.
 await db.query(`CREATE FUNCTION r2_fixture_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Synthetic required persistence failure'; END $$`);await db.query('CREATE TRIGGER r2_fixture_failure AFTER INSERT ON "Booking" FOR EACH ROW EXECUTE FUNCTION r2_fixture_failure()');
 try{assert.equal((await post("/api/bookings",{...terms,documentation:ack})).status,500);assert.equal((await db.query('SELECT count(*)::int n FROM "Booking" WHERE "documentationContextId"=$1',[review.contextId])).rows[0].n,0);}finally{await db.query('DROP TRIGGER r2_fixture_failure ON "Booking"');await db.query('DROP FUNCTION r2_fixture_failure()');}
 const key=randomUUID();r=await post("/api/bookings",{...terms,documentation:ack},borrower.token,key);assert.equal(r.status,201);const bookingId=(await r.json()).booking.id;
 const concurrent=await Promise.all([post("/api/bookings",{...terms,documentation:ack},borrower.token,key),post("/api/bookings",{...terms,documentation:ack},borrower.token,key)]);for(const r of concurrent){assert.equal(r.status,201);assert.equal((await r.json()).booking.id,bookingId);}assert.equal((await post("/api/bookings",{...terms,notes:"conflicting",documentation:ack},borrower.token,key)).status,409);
 assert.equal((await post("/api/bookings",{...terms,documentation:ack},borrower.token,randomUUID())).status,409);
 const before=(await db.query('SELECT "documentationContextId","documentationAcknowledgedAt","documentationAcceptedAt","dailyPrice","totalPrice",deposit,"startAt","endAt","meetingStationId" FROM "Booking" WHERE id=$1',[bookingId])).rows[0];assert(before.documentationAcknowledgedAt);assert.equal(before.documentationAcceptedAt,null);
 // New confirmed version excludes charger; old request must not silently adopt it.
 r=await post("/api/dev/item-studio",{action:"SAVE",listingId:listing,expectedRevision:studio.revision,data:{...studio.data,accessories:[{...studio.data.accessories[0],declaration:"EXCLUDED"}]}},owner.token);assert.equal(r.status,200);studio=await r.json();r=await post("/api/dev/item-studio",{action:"CONFIRM",listingId:listing,expectedRevision:studio.revision,confirmed:true},owner.token);assert.equal(r.status,200);studio=await r.json();const nextVersion=studio.versions[0].id;assert.equal((await select(nextVersion,1)).status,200);
 assert.equal((await post("/api/bookings",{...terms,documentation:ack})).status,409);
 let accept=await fetch(base+`/api/bookings/${bookingId}`,{method:"PATCH",headers:h(owner.token),body:JSON.stringify({action:"accept"})});assert.equal(accept.status,409);
 assert.equal((await db.query('SELECT status FROM "Booking" WHERE id=$1',[bookingId])).rows[0].status,"PENDING");
 // No amendment endpoint: cancel original, then explicitly review changed version and make a new request.
 assert.equal((await fetch(base+`/api/bookings/${bookingId}`,{method:"PATCH",headers:h(),body:JSON.stringify({action:"cancel"})})).status,200);
 q=await quote();const ack2={contextId:q.documentationReview.contextId,versionId:nextVersion,acknowledged:true};r=await post("/api/bookings",{...terms,documentation:ack2},borrower.token,randomUUID());assert.equal(r.status,201);const acceptedId=(await r.json()).booking.id;
 accept=await fetch(base+`/api/bookings/${acceptedId}`,{method:"PATCH",headers:h(owner.token),body:JSON.stringify({action:"accept"})});assert.equal(accept.status,200);
 const agreed=async(id=acceptedId,token=borrower.token)=>{const r=await fetch(base+`/api/dev/rental-documentation?kind=booking&id=${id}`,{headers:h(token)});assert.equal(r.status,200);return r.json();};
 const frozen=await agreed();assert.equal(frozen.state,"AGREED");assert.equal(frozen.document.versionId,nextVersion);assert(frozen.acceptedAt);assert.equal(frozen.document.data.accessories[0].declaration,"EXCLUDED");
 await assert.rejects(db.query('UPDATE "Booking" SET "documentationContextId"=NULL WHERE id=$1',[acceptedId]));await assert.rejects(db.query('UPDATE "Booking" SET "totalPrice"=99 WHERE id=$1',[acceptedId]));await assert.rejects(db.query('DELETE FROM "Booking" WHERE id=$1',[acceptedId]));
 assert.equal((await select(version,2)).status,200);await db.query('UPDATE "Listing" SET title=\'Later title\',condition=\'Later condition\' WHERE id=$1',[listing]);assert.deepEqual(await agreed(),frozen);
 assert.equal((await fetch(base+`/api/dev/rental-documentation?kind=booking&id=${acceptedId}`,{headers:h(other.token)})).status,404);
 assert.equal((await fetch(base+`/api/dev/rental-documentation/photos/${photoId}?bookingId=${acceptedId}`,{headers:h()})).status,200);
 assert.equal((await agreed(legacyId)).state,"UNKNOWN");
 // Legacy acceptance remains valid even though designation changed (non-overlapping fixture).
 await db.query('UPDATE "Booking" SET "startAt"=\'2035-03-01\',"endAt"=\'2035-03-02\' WHERE id=$1',[legacyId]);assert.equal((await fetch(base+`/api/bookings/${legacyId}`,{method:"PATCH",headers:h(owner.token),body:JSON.stringify({action:"accept"})})).status,200);
 // Real listing browser: quote, exact ledger and checkbox in existing request flow.
 const browser=await launchBrowser();t.after(async()=>{await browser.close();});const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:"reduce"}),errors:string[]=[],external:string[]=[];collectBrowserErrors(context,errors);context.on("request",r=>{if(new URL(r.url()).origin!==base)external.push(new URL(r.url()).origin);});const page=await context.newPage();await page.goto(base+"/login");await page.getByLabel("Email address",{exact:true}).fill(borrower.email);await page.getByLabel("Password",{exact:true}).fill(borrower.password);await page.getByRole("button",{name:"Log in",exact:true}).click();await expect(page).not.toHaveURL(/\/login$/);
 await page.goto(base+`/listings/${listing}`);await page.getByLabel("Start date",{exact:true}).fill("2035-04-01T10:00");await page.getByLabel("End date",{exact:true}).fill("2035-04-02T10:00");
 // Use the actual station selector's public control, preserving its confirmation requirement.
 await page.getByRole("button",{name:"Choose meeting station",exact:true}).click();await page.getByRole("dialog").getByRole("button",{name:new RegExp("^"+stationRow.nameEn+" ·")}).click();await page.getByRole("button",{name:"Confirm meeting station",exact:true}).click();
 await page.getByRole("button",{name:"Review quotation",exact:true}).click();await expect(page.getByRole("heading",{name:"Item-condition ledger",exact:true})).toBeVisible();await expect(page.getByRole("button",{name:"Confirm and submit request",exact:true})).toBeDisabled();await page.getByRole("checkbox",{name:"I've reviewed this item's documented condition, known defects, and included accessories.",exact:true}).check();await expect(page.getByRole("button",{name:"Confirm and submit request",exact:true})).toBeEnabled();await expect(page.locator("#experience-preferences")).toHaveAttribute("aria-busy","false");await page.screenshot({path:path.join(art,"agreement-desktop-en.png"),fullPage:true});
 await page.getByRole("combobox",{name:"Language",exact:true}).selectOption("zh-TW");for(const [name,width,height] of [["tablet",820,1100],["mobile",390,844]]as const){await page.setViewportSize({width,height});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:path.join(art,`agreement-${name}-zh.png`),fullPage:true});}
 await page.getByRole("button",{name:"Confirm and submit request",exact:true}).click();await expect(page).toHaveURL(/\/bookings\/\d+$/);await expect(page.getByRole("heading",{name:"借用者已確認閱讀的申請紀錄",exact:true})).toBeVisible();await page.screenshot({path:path.join(art,"agreement-request-zh.png"),fullPage:true});await page.keyboard.press("Tab");assert(await page.evaluate(()=>document.activeElement!==document.body));assert.deepEqual(errors,[]);assert.deepEqual(external,[]);await context.close();
 // Suspended participants retain existing obligation reads but cannot create a new acknowledgement.
 const future={...terms,startAt:"2035-05-01T10:00",endAt:"2035-05-02T10:00"};const futureQuote=await quote(future);const futureAck={contextId:futureQuote.documentationReview.contextId,versionId:version,acknowledged:true};
 await db.query(`UPDATE "User" SET "accountStatus"='SUSPENDED' WHERE id=$1`,[borrower.id]);assert.equal((await post("/api/bookings",{...future,documentation:futureAck})).status,403);await db.query(`UPDATE "User" SET "accountStatus"='ACTIVE' WHERE id=$1`,[borrower.id]);
 await db.query(`UPDATE "AuthSession" SET "expiresAt"=clock_timestamp()-interval '1 second' WHERE "tokenHash"=$1`,[createHash("sha256").update(otherSession).digest("hex")]);assert.equal((await fetch(base+mediaUrl,{headers:h(otherSession)})).status,401);
 assert.equal((await select(null,3)).status,200);assert.equal((await post("/api/bookings",{...future,documentation:futureAck})).status,409);assert.deepEqual(await agreed(),frozen);
 await fetch(base+"/api/auth/logout",{method:"POST",headers:h()});assert.equal((await fetch(base+mediaUrl,{headers:h()})).status,401);
 await writeFile(path.join(art,"agreement-evidence.json"),JSON.stringify({exactVersionHash:frozen.contentDigest,bookingId:acceptedId,atomicOwnerAcceptance:true,legacyUnknown:true,changedBeforeAcceptanceBlocked:true,subsequentEditsPreserveAgreement:true,realBrowserSubmission:true,locales:["en","zh-TW"],widths:[1440,820,390],errors,externalOrigins:external,noFinancialOrCustodyWrite:true},null,2));
});

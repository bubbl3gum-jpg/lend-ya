import {test} from "node:test";
import assert from "node:assert/strict";
import {randomUUID,createHash} from "node:crypto";
import {writeFile} from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import {expect} from "playwright/test";
import {connectTestDatabase} from "./support/test-database";
import {launchBrowser,collectBrowserErrors} from "./support/browser";
import type {ListingDocumentation} from "../lib/item-documentation/service";
test("13D owned documentation review, real image decoding, protected comparison, preservation and responsive bilingual browser",{timeout:120000},async t=>{
 const db=await connectTestDatabase(),base=process.env.TEST_BASE_URL!,art=process.env.MRT_TEST_ARTIFACT_DIR!;t.after(async()=>{await db.end();});
 if(process.env.NODE_ENV==="production"){
  for(const route of ["/dev/item-documentation","/api/dev/item-documentation"])for(const method of ["GET","POST"]){const r=await fetch(base+route,{method,headers:{Origin:base,"X-Hustlen-Documentation":"1"}});assert.equal(r.status,404);assert.match(r.headers.get("cache-control")!,/private, no-store/);}return;
 }
 const actors=[];for(const name of ["Synthetic documentation owner","Synthetic documentation borrower","Synthetic unrelated reviewer"]){const email=randomUUID()+"@fixture.test",password="Owned-docs-13d!";const r=await fetch(base+"/api/auth/register",{method:"POST",headers:{Origin:base,"Content-Type":"application/json"},body:JSON.stringify({name,email,password})});assert.equal(r.status,201);actors.push({id:(await r.json()).user.id,token:r.headers.get("set-cookie")!.match(/p2p_session=([^;]+)/)![1],email,password});}
 const [owner,borrower,other]=actors;
 const listing=(await db.query(`INSERT INTO "Listing"("ownerId",title,description,category,price,condition,status,"categoryDetails","updatedAt") VALUES($1,'Synthetic camera documentation fixture','Not a real item','Cameras',10,'Declared wear','ACTIVE','{"includedAccessories":"One synthetic cap"}',NOW()) RETURNING id`,[owner.id])).rows[0].id;
 const station=(await db.query(`INSERT INTO "MrtStation"(code,name) VALUES('SYN13D','Synthetic documentation station') RETURNING id`)).rows[0].id;
 const booking=(await db.query(`INSERT INTO "Booking"("listingId","ownerId","renterId","meetingStationId","startAt","endAt",status,"dailyPrice","totalPrice","updatedAt") VALUES($1,$2,$3,$4,'2027-01-01','2027-01-02','INSPECTION',10,10,NOW()) RETURNING id`,[listing,owner.id,borrower.id,station])).rows[0].id;
 const bytes=await sharp({create:{width:800,height:800,channels:3,background:{r:120,g:110,b:90}}}).png().toBuffer();
 const ids=[];for(const [stage,actor] of [["HANDOFF_OWNER",owner],["RETURN_BORROWER",borrower],["INSPECTION_OWNER",owner]] as const){const id=randomUUID();ids.push(id);await db.query('INSERT INTO "BookingEvidencePhoto"(id,"bookingId","uploaderId",stage,"mimeType",data) VALUES($1,$2,$3,$4,\'image/png\',$5)',[id,booking,actor.id,stage,bytes]);}
 const snapshot=async()=> (await db.query('SELECT id,stage,"uploaderId","createdAt",md5(data) digest FROM "BookingEvidencePhoto" ORDER BY id')).rows;
 const before=await snapshot();
 const get=(kind:string,id:number,token?:string)=>fetch(base+`/api/dev/item-documentation?kind=${kind}&id=${id}`,{headers:token?{Cookie:"p2p_session="+token}:{}});
 assert.equal((await get("listing",listing)).status,401);assert.equal((await get("listing",listing,borrower.token)).status,404);assert.equal((await get("booking",booking,other.token)).status,404);
 await db.query('UPDATE "User" SET role=\'ADMIN\' WHERE id=$1',[other.id]);assert.equal((await get("booking",booking,other.token)).status,404);
 assert.equal((await fetch(base+`/api/dev/item-documentation?kind=booking&id=${booking}&supportCaseId=1`,{headers:{Cookie:"p2p_session="+owner.token}})).status,400);
 const summary:ListingDocumentation=await(await get("listing",listing,owner.token)).json();assert.equal(summary.checklist.id,"camera");
 const form=(data:Buffer=bytes,mime="image/png",revision=summary.revision)=>{const f=new FormData();f.set("listingId",String(listing));f.set("revision",revision);f.set("wear","Synthetic known scuff; not a finding");f.set("accessories","One synthetic cap");f.set("confirmed","true");f.set("areas",JSON.stringify(summary.checklist.areas.map(a=>a.id)));for(const a of summary.checklist.areas)f.append("photos",new Blob([new Uint8Array(data)],{type:mime}),a.id+".png");return f;};
 const post=(f:FormData,token=owner.token,origin=base)=>fetch(base+"/api/dev/item-documentation",{method:"POST",headers:{Cookie:"p2p_session="+token,Origin:origin,"X-Hustlen-Documentation":"1"},body:f});
 const success=await post(form());assert.equal(success.status,200);const quality=await success.json();assert.equal(quality.saved,false);assert.equal(quality.published,false);assert.equal(quality.contentVerified,false);assert(quality.quality[0].warnings.includes("LOW_DETAIL"));assert.deepEqual(quality.observations,[]);
 const noHeader=await fetch(base+"/api/dev/item-documentation",{method:"POST",headers:{Cookie:"p2p_session="+owner.token,Origin:base},body:form()});assert.equal(noHeader.status,403);
 const unconfirmed=form();unconfirmed.set("confirmed","false");assert.equal((await post(unconfirmed)).status,400);
 const partial=form();partial.delete("photos");assert.equal((await post(partial)).status,400);
 const forged=form();forged.set("ownerId",String(other.id));assert.equal((await post(forged)).status,400);
 assert.equal((await post(form(Buffer.from("not an image")))).status,400);assert.equal((await post(form(bytes,"image/jpeg"))).status,400);assert.equal((await post(form(),owner.token,"https://attacker.invalid")).status,403);assert.equal((await post(form(),borrower.token)).status,404);
 await db.query('UPDATE "Listing" SET "updatedAt"="updatedAt"+interval \'1 second\' WHERE id=$1',[listing]);assert.equal((await post(form())).status,409);
 await db.query('UPDATE "User" SET "accountStatus"=\'SUSPENDED\' WHERE id=$1',[owner.id]);assert.equal((await post(form())).status,403);await db.query('UPDATE "User" SET "accountStatus"=\'ACTIVE\' WHERE id=$1',[owner.id]);
 for(const [category,expected] of [["Tools","power-tool"],["Camping & Outdoors","camping"],["Unclassified fixture","general"],["Cameras","camera"]]){await db.query('UPDATE "Listing" SET category=$1 WHERE id=$2',[category,listing]);assert.equal((await(await get("listing",listing,owner.token)).json()).checklist.id,expected);}
 const scoped=await(await get("booking",booking,borrower.token)).json();assert.equal(scoped.returnedAt,null);assert.equal(scoped.pickupReceiptAt,null);assert.equal(scoped.areaMapping,"UNRECORDED_LEGACY_EVIDENCE");assert.equal(scoped.vision.state,"UNAVAILABLE");assert.equal("disputes" in scoped,false);
 for(const actor of [owner,borrower]){const r:Response=await fetch(base+`/api/bookings/${booking}/evidence/${ids[0]}`,{headers:{Cookie:"p2p_session="+actor.token}});assert.equal(r.status,200);assert.equal(createHash("sha256").update(Buffer.from(await r.arrayBuffer())).digest("hex"),createHash("sha256").update(bytes).digest("hex"));}
 assert.equal((await fetch(base+`/api/bookings/${booking}/evidence/${ids[0]}`,{headers:{Cookie:"p2p_session="+other.token}})).status,403);
 assert.equal((await fetch(base+`/api/bookings/${booking+1}/evidence/${ids[0]}`,{headers:{Cookie:"p2p_session="+owner.token}})).status,404);
 const browser=await launchBrowser();t.after(async()=>{await browser.close();});const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:"reduce"}),errors:string[]=[],external:string[]=[];collectBrowserErrors(context,errors);context.on("request",r=>{const u=new URL(r.url());if(![base,"null"].includes(u.origin))external.push(u.origin);});const page=await context.newPage();
 await page.goto(base+"/login");await page.getByLabel("Email address",{exact:true}).fill(owner.email);await page.getByLabel("Password",{exact:true}).fill(owner.password);await page.getByRole("button",{name:"Log in",exact:true}).click();await expect(page).not.toHaveURL(/\/login$/);
 await page.goto(base+"/dev/item-documentation");await page.getByLabel("Record ID",{exact:true}).fill(String(listing));await page.getByRole("button",{name:"Open record",exact:true}).click();await expect(page.getByRole("heading",{name:"Synthetic camera documentation fixture",exact:true})).toBeVisible();
 await page.getByLabel("Known wear and defects",{exact:false}).fill("Synthetic known scuff");await page.getByLabel("Included accessories and quantities",{exact:false}).fill("One cap");const uploads=page.getByLabel("Capture or select photo",{exact:true});for(let i=0;i<3;i++)await uploads.nth(i).setInputFiles({name:"synthetic-area.png",mimeType:"image/png",buffer:bytes});await page.getByRole("checkbox",{name:/I reviewed my declarations/}).check();await page.getByRole("button",{name:"Review documentation",exact:true}).click();await expect(page.getByRole("heading",{name:"Review returned by server — NOT saved or published",exact:true})).toBeVisible();
 await expect(page.locator("#experience-preferences")).toHaveAttribute("aria-busy","false");await page.screenshot({path:path.join(art,"documentation-owner-desktop.png"),fullPage:true});
 await page.getByRole("combobox",{name:"Language",exact:true}).selectOption("zh-TW");
 for(const [name,width,height] of [["tablet",820,1100],["mobile",390,844]] as const){await page.setViewportSize({width,height});await expect(page.getByRole("heading",{name:"伺服器已回傳檢閱結果 — 未儲存、未刊登",exact:true})).toBeVisible();await expect(page.getByLabel("已知磨損與瑕疵",{exact:false})).toHaveValue("Synthetic known scuff");assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:path.join(art,`documentation-owner-${name}-zh.png`),fullPage:true});}
 await page.getByRole("combobox",{name:"介面語言",exact:true}).selectOption("en");await page.setViewportSize({width:1440,height:1000});
 await page.getByLabel("Record type",{exact:true}).selectOption("booking");await page.getByLabel("Record ID",{exact:true}).fill(String(booking));await page.getByRole("button",{name:"Open record",exact:true}).click();await expect(page.getByRole("heading",{name:"Pickup / return comparison",exact:true})).toBeVisible();
 await page.getByLabel("Pickup evidence",{exact:true}).first().selectOption(ids[0]);await page.getByLabel("Return evidence",{exact:true}).first().selectOption(ids[1]);await expect(page.getByAltText("Pickup evidence",{exact:true}).first()).toBeVisible();await expect.poll(()=>page.getByAltText("Pickup evidence",{exact:true}).first().evaluate(el=>(el as HTMLImageElement).complete&&(el as HTMLImageElement).naturalWidth>0)).toBe(true);
 await page.screenshot({path:path.join(art,"documentation-comparison-desktop.png"),fullPage:true});
 const language=page.getByRole("combobox",{name:"Language",exact:true});await language.selectOption("zh-TW");await expect(page.getByRole("heading",{name:"取件／歸還對照",exact:true})).toBeVisible();
 for(const [name,width,height] of [["tablet",820,1100],["mobile",390,844]] as const){await page.setViewportSize({width,height});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:path.join(art,`documentation-comparison-${name}-zh.png`),fullPage:true});}
 await page.keyboard.press("Tab");assert(await page.evaluate(()=>document.activeElement!==document.body));assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
 await writeFile(path.join(art,"documentation-browser.json"),JSON.stringify({nativeLogin:true,actualMultipartReview:true,saved:false,realProtectedEvidenceImages:true,noOverflow:true,keyboardFocus:true,locales:["en","zh-TW"],widths:[1440,820,390],errors,externalOrigins:external},null,2));await context.close();
 await db.query('UPDATE "AuthSession" SET "expiresAt"=NOW()-interval \'1 minute\' WHERE "tokenHash"=$1',[createHash("sha256").update(other.token).digest("hex")]);assert.equal((await get("booking",booking,other.token)).status,401);
 await fetch(base+"/api/auth/logout",{method:"POST",headers:{Cookie:"p2p_session="+owner.token,Origin:base}});assert.equal((await post(form())).status,401);assert.deepEqual(await snapshot(),before);assert.equal((await db.query('SELECT status FROM "Booking" WHERE id=$1',[booking])).rows[0].status,"INSPECTION");
});

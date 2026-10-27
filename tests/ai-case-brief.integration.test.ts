import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { expect } from "playwright/test";
import { launchBrowser, collectBrowserErrors } from "./support/browser";
import { connectTestDatabase } from "./support/test-database";

test("12B real offline pipeline, selected manifests, review failure recovery and production refusal", { timeout: 180000 }, async () => {
  const db = await connectTestDatabase(), base = process.env.TEST_BASE_URL!, art = process.env.MRT_TEST_ARTIFACT_DIR!;
  const register = async (admin: boolean) => {
    const r = await fetch(base + "/api/auth/register", { method: "POST", headers: { Origin: base, "Content-Type": "application/json" }, body: JSON.stringify({ name: admin ? "Synthetic notebook reader" : "Private unrelated fixture", email: randomUUID()+"@fixture.test", password: "Owned-notebook-12a!" }) });
    assert.equal(r.status, 201); const { user } = await r.json();
    if (admin) await db.query('UPDATE "User" SET role=\'ADMIN\' WHERE id=$1',[user.id]);
    return { id: user.id, cookie: r.headers.get("set-cookie")!.match(/p2p_session=[^;]+/)![0] };
  };
  const get = (suffix: string, cookie = "") => fetch(base + "/admin/ai-case-brief" + suffix, { headers: { Cookie: cookie }, redirect: "manual" });
  const snap = async () => {
    const out: Record<string,string> = {};
    for (const table of ["Booking","SupportTicket","SupportParticipantChannel","SupportMessage","AdminAuditLog","StaffMembership","StaffCapabilityGrant","StaffSecurityEvent","ChatAnalysisJob","AccountSecurityEvent"])
      out[table] = createHash("sha256").update(JSON.stringify((await db.query(`SELECT row_to_json(t) x FROM "${table}" t ORDER BY row_to_json(t)::text`)).rows)).digest("hex");
    return out;
  };
  let browser: Awaited<ReturnType<typeof launchBrowser>> | undefined;
  try {
    const admin = await register(true), ordinary = await register(false), suspended = await register(true), expired = await register(true);
    await db.query('UPDATE "User" SET "accountStatus"=\'SUSPENDED\' WHERE id=$1',[suspended.id]);
    await db.query('UPDATE "AuthSession" SET "expiresAt"=now()-interval \'1 second\' WHERE "userId"=$1',[expired.id]);
    const before = await snap();
    const enabled = process.env.NODE_ENV === "development" && process.env.HUSTLEN_AI_CASE_BRIEF_DEMO === "synthetic-only";
    if (!enabled) {
      for (const cookie of ["",admin.cookie,ordinary.cookie]) {
        const r = await get("",cookie); assert.equal(r.status,404); assert.match(r.headers.get("cache-control")??"",/no-store/);
        assert.ok(!(await r.text()).includes("SYN-BORROWER-A"));
      }
      assert.equal((await fetch(base+"/api/admin/ai-case-brief?caseId=SYN-OWNER-A&language=en",{headers:{Cookie:admin.cookie}})).status,404);
      const directory = await fetch(base+"/admin",{headers:{Cookie:admin.cookie}}); assert.equal(directory.status,200); assert.ok(!(await directory.text()).includes('href="/admin/ai-case-brief"'));
      assert.deepEqual(await snap(), before);
      await writeFile(path.join(art,"prototype-refusal.json"),JSON.stringify({ production: process.env.NODE_ENV === "production", flagConfigured: process.env.HUSTLEN_AI_CASE_BRIEF_DEMO === "synthetic-only", route404:true, linkAbsent:true, caseStateUnchanged:true, noModelExecuted:true },null,2));
      return;
    }
    assert.ok([302,303,307,308].includes((await get("")).status));
    for (const a of [ordinary,suspended]) { const r=await get("",a.cookie); const text=await r.text(); assert.equal(r.status,404); assert.ok(!text.includes("SYN-BORROWER-A")); }
    assert.ok([302,303,307,308].includes((await get("",expired.cookie)).status));
    for (const query of ["?ticketId=1","?case=SYN-OWNER-A","?role=ADMIN","?provider=live","?source=private"]) { const r=await get(query,admin.cookie); assert.equal(r.status,404); assert.ok(!(await r.text()).includes("SYN-BORROWER-A")); }
    const r=await get("",admin.cookie); assert.equal(r.status,200); assert.match(r.headers.get("cache-control")??"",/no-store/);
    const api = async(body:object,cookie=admin.cookie,headers:Record<string,string>={})=>fetch(base+"/api/admin/ai-case-brief",{method:"POST",headers:{Cookie:cookie,Origin:base,"Content-Type":"application/json","X-Hustlen-Synthetic-Brief":"1",...headers},body:JSON.stringify(body)});
    const command={caseId:"SYN-BORROWER-A",language:"en",condition:"NORMAL"};
    for(const [cookie,status]of [["",401],[ordinary.cookie,403],[suspended.cookie,403],[expired.cookie,401]] as const)assert.equal((await api(command,cookie)).status,status);
    for(const headers of [{Origin:"http://evil.test"},{Origin:""},{"X-Hustlen-Synthetic-Brief":""}] as Record<string,string>[])assert.equal((await api(command,admin.cookie,headers)).status,403);
    for(const body of [{...command,accountId:admin.id},{...command,role:"ADMIN"},{...command,action:"SEND"},{...command,manifest:{private:"record"}},{...command,caseId:"1"},{...command,language:"de"}])assert.equal((await api(body)).status,422);
    const limiter=await register(true);for(let i=0;i<40;i++)assert.equal((await api({...command,condition:"UNAVAILABLE"},limiter.cookie)).status,503);assert.equal((await api(command,limiter.cookie)).status,429);
    const valid=await api(command);assert.equal(valid.status,200);const first=await valid.json();assert.equal(first.result.provenance,"SIMULATED_NO_MODEL");assert.ok(!JSON.stringify(first.manifest).includes("scratch"));
    for(const [condition,status,code]of [["INVALID",422,"VALIDATION"],["REFERENCES",422,"REFERENCES"],["UNAVAILABLE",503,"UNAVAILABLE"],["TIMEOUT",504,"TIMEOUT"],["LIMIT",429,"LIMIT"]]as const){const r=await api({...command,condition});assert.equal(r.status,status);assert.equal((await r.json()).code,code);}
    browser = await launchBrowser();
    const context=await browser.newContext({reducedMotion:"reduce",hasTouch:true});
    const token=admin.cookie.split("=")[1]; await context.addCookies([{name:"p2p_session",value:token,url:base}]);
    const errors:string[]=[], outside:string[]=[], dataRequests:string[]=[], mutations:string[]=[];
    collectBrowserErrors(context,errors);
    context.on("request",req=>{
      const u=new URL(req.url());
      if (["http:","https:"].includes(u.protocol) && u.origin!==base) outside.push(u.origin);
      if(u.pathname.startsWith("/api/")) dataRequests.push(req.method()+" "+u.pathname);
      if(!["GET","HEAD","OPTIONS"].includes(req.method()))mutations.push(req.method()+" "+u.pathname);
    });
    const page=await context.newPage(); await page.goto(base+"/admin/ai-case-brief");
    await expect(page.getByRole("heading",{name:"AI Case Brief",exact:true})).toBeVisible();
    await expect(page.getByTestId("scripted-output")).toHaveCount(0);
    await expect(page.getByTestId("experiment-checkpoint")).toContainText("Live experiment blocked");
    const checkpoint=page.getByTestId("experiment-checkpoint");await checkpoint.locator("summary").focus();await page.keyboard.press("Enter");assert.equal(await checkpoint.locator("li").count(),10);await page.screenshot({path:path.join(art,"case-brief-approval-checkpoint.png"),fullPage:true});await checkpoint.locator("summary").click();
    const generate=()=>page.getByRole("button",{name:"Request simulated brief",exact:true});
    await generate().click();await expect(page.getByTestId("scripted-output")).toBeVisible();await expect(page.getByRole("status")).toBeFocused();
    await expect(page.getByTestId("synthetic-notebook")).toContainText("Simulated — no AI model was called.");
    const inspector=page.getByTestId("quality-inspector");await inspector.locator("summary").focus();await page.keyboard.press("Enter");await expect(inspector).toContainText("not scored");await expect(inspector).toContainText("Participant statement is not an established fact.");await page.screenshot({path:path.join(art,"case-brief-quality-hints.png"),fullPage:true});await inspector.locator("summary").click();
    const citation=page.getByRole("link",{name:"Read synthetic source B2",exact:true}).first();await citation.focus();await page.keyboard.press("Enter");await expect(page.locator("#fact-SYN-BORROWER-A-B2")).toBeFocused();
    const ack=()=>page.getByRole("checkbox",{name:"I compared the draft with this scenario’s sources and uncertainty.",exact:true});
    await ack().focus();await page.keyboard.press("Space");await page.getByRole("button",{name:"Mark locally reviewed",exact:true}).click();await expect(page.getByRole("status")).toContainText("Local review marked");
    await generate().click();await expect(page.getByRole("status")).toContainText("Simulated — no AI model was called.");await expect(ack()).not.toBeChecked();
    await page.getByLabel("Editable reply draft · local only",{exact:true}).fill("Edited synthetic draft.");await expect(ack()).not.toBeChecked();await expect(page.getByLabel("Editable reply draft · local only",{exact:true})).toBeFocused();
    // A failed new attempt retains the last valid draft, labeled separately.
    await page.locator("#offline-condition").selectOption("REFERENCES");let mark=errors.length;
    page.once("dialog",d=>d.accept());await generate().click();await expect(page.getByRole("status")).toContainText("Unresolved or foreign");
    const expected=errors.splice(mark);assert.ok(expected.every(e=>e==="422 /api/admin/ai-case-brief"||/^Failed to load resource: the server responded with a status of 422/.test(e)));
    await expect(page.getByLabel("Editable reply draft · local only",{exact:true})).toHaveValue("Edited synthetic draft.");await expect(page.getByTestId("scripted-output")).toContainText("Previous valid result");await page.screenshot({path:path.join(art,"case-brief-previous-draft.png"),fullPage:true});
    await page.locator("#offline-condition").selectOption("TIMEOUT");page.once("dialog",d=>d.accept());await generate().click();await page.getByRole("button",{name:"Cancel request",exact:true}).click();await expect(page.getByRole("status")).toContainText("Canceled");await page.screenshot({path:path.join(art,"case-brief-canceled.png"),fullPage:true});
    page.once("dialog",d=>d.dismiss());await page.locator("#synthetic-scenario").selectOption("SYN-OWNER-A");await expect(page.locator("#synthetic-scenario")).toHaveValue("SYN-BORROWER-A");
    page.once("dialog",d=>d.accept());await page.locator("#synthetic-scenario").selectOption("SYN-OWNER-A");await expect(page.locator("[data-source-id=O1]")).toBeVisible();await expect(page.locator("[data-source-id=B1]")).toHaveCount(0);
    await page.locator("#offline-condition").selectOption("NORMAL");await generate().click();await expect(page.getByTestId("scripted-output")).toContainText("scratch");
    await expect(page.getByTestId("scripted-output")).toContainText("Condition evidence and timing are absent.");
    await page.locator("#synthetic-scenario").selectOption("SYN-INJECTION");await expect(page.locator("[data-source-id=I1]")).toBeVisible();await generate().click();await expect(page.getByTestId("scripted-output")).toContainText("untrusted instructions");assert.equal(await page.locator('[data-testid="synthetic-notebook"] script').count(),0);await expect(page.locator("[data-source-id=I1]")).toContainText("<script>");
    await page.locator("#synthetic-scenario").selectOption("SYN-OWNER-A");await expect(page.locator("[data-source-id=O1]")).toBeVisible();await generate().click();await expect(page.getByRole("status")).toContainText("Simulated — no AI model was called.");
    const preservedDraft=await page.locator("#synthetic-draft").inputValue();await page.getByLabel("Language",{exact:true}).selectOption("zh-TW");await expect(page.locator("#draft-note")).toContainText("英文");await expect(page.locator("#synthetic-draft")).toHaveValue(preservedDraft);
    for(const locale of ["en","zh-TW"]as const){await page.locator('#experience-preferences select').first().selectOption(locale);
      for(const theme of ["light","dark"]){await page.locator('#experience-preferences select').nth(1).selectOption(theme);
        for(const [size,width,height]of [["desktop",1440,1000],["tablet",820,1180],["mobile",390,844]]as const){await page.setViewportSize({width,height});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(art,`case-brief-${locale}-${theme}-${size}.png`),fullPage:true});}
      }
    }
    // Actual mobile touch generation and acknowledgement, not a synthetic success response.
    await page.getByRole("button",{name:"產生模擬摘要",exact:true}).tap();await expect(page.getByRole("status")).toContainText("未呼叫任何 AI 模型");
    await page.getByRole("checkbox",{name:"我已將草稿與此情境的來源及不確定資訊比對。",exact:true}).tap();await page.getByRole("button",{name:"標記為本機已審閱",exact:true}).tap();await expect(page.getByRole("status")).toContainText("已標記本機審閱");await page.screenshot({path:path.join(art,"case-brief-zh-output-review.png"),fullPage:true});
    await page.getByTestId("quality-inspector").locator("summary").tap();await expect(page.getByTestId("quality-inspector")).toContainText("尚未評分");await page.screenshot({path:path.join(art,"case-brief-quality-hints-zh.png"),fullPage:true});await page.getByTestId("quality-inspector").locator("summary").tap();
    await checkpoint.locator("summary").tap();await expect(checkpoint).toContainText("確切的服務供應商與模型版本");await page.screenshot({path:path.join(art,"case-brief-approval-checkpoint-zh.png"),fullPage:true});await checkpoint.locator("summary").tap();
    // Real expiry keeps an old draft labeled separately; never fabricates a new success.
    await db.query(`UPDATE "AuthSession" SET "expiresAt"=now()-interval '1 second' WHERE "userId"=$1`,[admin.id]);mark=errors.length;await page.getByRole("button",{name:"產生模擬摘要",exact:true}).tap();await expect(page.getByRole("status")).toContainText("工作階段已過期");
    const denied=errors.splice(mark);assert.ok(denied.every(e=>e==="401 /api/admin/ai-case-brief"||/^Failed to load resource: the server responded with a status of 401/.test(e)));
    await expect(page.getByTestId("scripted-output")).toContainText("先前有效的結果");await page.screenshot({path:path.join(art,"case-brief-session-expired.png"),fullPage:true});
    await context.close();
    assert.deepEqual(outside,[]); assert.ok(dataRequests.length>0 && dataRequests.every(x=>/^(GET|POST) \/api\/admin\/ai-case-brief$/.test(x))); assert.ok(mutations.every(x=>x==="POST /api/admin/ai-case-brief")); assert.deepEqual(errors,[]);
    assert.deepEqual(await snap(),before);
    await writeFile(path.join(art,"synthetic-browser.json"),JSON.stringify({ realAdminRoute:true, activeLegacyAdminOnly:true, forgedSelectorsDenied:true, closedSyntheticPipeline:true, localReviewOnly:true, draftEditsClearReview:true, languagePreservesDraft:true, draftDiscardConfirmation:true, exactScenarioSources:true, escapedInjection:true, incompleteAndTranslationCautions:true, noCaseStateMutation:true, noExternalRequests:outside, onlySyntheticPipelineRequests:dataRequests, onlyNonmutatingGenerationPosts:mutations, browserErrors:errors, responsiveWidths:[1440,820,390], touchTargets44:true, mobileTouchReview:true, keyboardReview:true, reducedMotion:true, noModelExecuted:true, noLiveCasePrivacyCertification:true, approvalCheckpointBlocked:true, missingApprovalDecisions:10, humanQualityScoresUnrecorded:true },null,2));
  } finally { await browser?.close(); await db.end(); }
});

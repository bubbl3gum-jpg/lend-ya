import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { expect } from "playwright/test";
import { launchBrowser, collectBrowserErrors } from "./support/browser";
import { connectTestDatabase } from "./support/test-database";
import { syntheticCases } from "../lib/ai-case-brief/fixtures";
test("12A real Admin routes, synthetic notebook, source isolation, human review and production refusal", { timeout: 180000 }, async () => {
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
    const nonexistent = await fetch(base+"/api/admin/ai-case-brief",{method:"POST",headers:{Cookie:admin.cookie,Origin:base,"Content-Type":"application/json"},body:JSON.stringify({action:"SEND",ticketId:1})}); assert.equal(nonexistent.status,404);
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
    await page.getByRole("button",{name:"Open scripted example",exact:true}).click();
    await expect(page.getByTestId("scripted-output")).toBeVisible();
    await expect(page.getByRole("status")).toBeFocused();
    const review=page.getByRole("button",{name:"Mark locally reviewed",exact:true}); await expect(review).toBeDisabled();
    const citation=page.getByRole("link",{name:"Read synthetic source B2",exact:true}); await citation.focus(); await page.keyboard.press("Enter");
    await expect(page.locator("#fact-SYN-BORROWER-A-B2")).toBeFocused();
    await page.getByRole("checkbox",{name:"I compared the draft with this scenario’s sources and uncertainty.",exact:true}).focus(); await page.keyboard.press("Space"); await review.focus(); await page.keyboard.press("Enter");
    await expect(page.getByRole("status")).toContainText("Local review marked");
    await page.screenshot({path:path.join(art,"case-brief-local-review.png"),fullPage:true});
    await page.getByLabel("Editable reply draft · local only",{exact:true}).fill("Edited synthetic draft — no private data."); await expect(review).toBeDisabled();
    await expect(page.getByLabel("Editable reply draft · local only",{exact:true})).toBeFocused();
    await expect(page.getByRole("status")).not.toContainText("Local review marked");
    await expect(page.getByLabel("Language",{exact:true})).toBeEnabled(); await page.getByLabel("Language",{exact:true}).selectOption("zh-TW");
    await expect(page.getByLabel("可編輯回覆草稿・僅限本機",{exact:true})).toHaveValue("Edited synthetic draft — no private data.");
    await expect(page.locator("#draft-note")).toContainText("英文");
    page.once("dialog",dialog=>dialog.dismiss()); await page.locator("#synthetic-scenario").selectOption("SYN-OWNER-A"); await expect(page.locator("#synthetic-scenario")).toHaveValue("SYN-BORROWER-A");
    page.once("dialog",dialog=>dialog.accept()); await page.locator("#synthetic-scenario").selectOption("SYN-OWNER-A"); await expect(page.getByTestId("scripted-output")).toHaveCount(0);
    await expect(page.locator("[data-source-id=B1]")).toHaveCount(0);
    await page.getByRole("button",{name:"開啟預寫範例",exact:true}).click(); await expect(page.getByTestId("scripted-output")).toContainText("不知道發生時間");
    for(const c of syntheticCases) {
      await page.locator("#synthetic-scenario").selectOption(c.id); await page.getByRole("button",{name:"開啟預寫範例",exact:true}).click();
      const output=page.getByTestId("scripted-output"); await expect(output).toBeVisible();
      for(const s of c.summary) await expect(output).toContainText(s.text["zh-TW"]);
      for(const f of c.facts) await expect(page.locator(`[data-source-id="${f.id}"]`)).toContainText(f.content["zh-TW"]);
      const refs=await output.locator('a[href^="#fact-"]').evaluateAll(a=>a.map(x=>(x as HTMLAnchorElement).hash));
      assert.ok(refs.every(ref=>ref.startsWith("#fact-"+c.id+"-")));
      assert.equal(await page.locator("[data-source-id]").count(),c.facts.length);
      await expect(output).toContainText(c.missing["zh-TW"]);
    }
    await page.locator("#synthetic-scenario").selectOption("SYN-INJECTION"); await page.getByRole("button",{name:"開啟預寫範例",exact:true}).click();
    assert.equal(await page.locator('[data-testid="synthetic-notebook"] script').count(),0);
    await expect(page.getByTestId("scripted-output")).toContainText("未執行模型");
    await page.screenshot({path:path.join(art,"case-brief-scripted-injection.png"),fullPage:true});
    await page.getByRole("button",{name:"查看無法使用狀態範例",exact:true}).click(); await expect(page.getByRole("status")).toContainText("並非模型服務故障"); await expect(page.getByTestId("scripted-output")).toHaveCount(0);
    await page.screenshot({path:path.join(art,"case-brief-unavailable.png"),fullPage:true});
    await page.locator("#synthetic-scenario").selectOption("SYN-UNCERTAIN"); await page.getByRole("button",{name:"開啟預寫範例",exact:true}).click();
    for(const locale of ["en","zh-TW"] as const) {
      await page.locator('#experience-preferences select').first().selectOption(locale);
      for(const theme of ["light","dark"]) {
        await page.locator('#experience-preferences select').nth(1).selectOption(theme);
        for(const [size,width,height] of [["desktop",1440,1000],["tablet",820,1180],["mobile",390,844]] as const) {
          await page.setViewportSize({width,height}); await expect(page.getByTestId("scripted-output")).toBeVisible();
          assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
          const min=await page.locator('.ai-notebook button, .ai-notebook select').evaluateAll(nodes=>Math.min(...nodes.map(n=>n.getBoundingClientRect().height))); assert.ok(min>=44);
          await page.evaluate(()=>window.scrollTo(0,0));
          await page.screenshot({path:path.join(art,`case-brief-${locale}-${theme}-${size}.png`),fullPage:true});
        }
      }
    }
    // Actual touch interaction at the mobile viewport, not screenshots alone.
    await page.locator("#synthetic-scenario").selectOption("SYN-OWNER-A");
    await page.getByRole("button",{name:"開啟預寫範例",exact:true}).tap();
    await expect(page.getByTestId("scripted-output")).toBeVisible();
    await page.getByRole("checkbox",{name:"我已將草稿與此情境的來源及不確定資訊比對。",exact:true}).tap();
    await page.getByRole("button",{name:"標記為本機已審閱",exact:true}).tap();
    await expect(page.getByRole("status")).toContainText("已標記本機審閱");
    await page.screenshot({path:path.join(art,"case-brief-mobile-review.png"),fullPage:true});
    // Drafts/review never survive navigation/reload and cannot become operational state.
    await page.reload(); await expect(page.getByTestId("scripted-output")).toHaveCount(0);
    await context.close();
    assert.deepEqual(outside,[]); assert.deepEqual(dataRequests,[]); assert.deepEqual(mutations,[]); assert.deepEqual(errors,[]);
    assert.deepEqual(await snap(),before);
    await writeFile(path.join(art,"synthetic-browser.json"),JSON.stringify({ realAdminRoute:true, activeLegacyAdminOnly:true, forgedSelectorsDenied:true, unknownMutationRoute404:true, localReviewOnly:true, draftEditsClearReview:true, languagePreservesDraft:true, draftDiscardConfirmation:true, exactScenarioSources:true, escapedInjection:true, incompleteAndTranslationCautions:true, noCaseStateMutation:true, noExternalRequests:outside, noApiDataRequests:dataRequests, noBrowserMutations:mutations, browserErrors:errors, responsiveWidths:[1440,820,390], touchTargets44:true, mobileTouchReview:true, keyboardReview:true, reducedMotion:true, noModelExecuted:true, noLiveCasePrivacyCertification:true },null,2));
  } finally { await browser?.close(); await db.end(); }
});

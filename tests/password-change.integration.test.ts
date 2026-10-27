import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { expect } from "playwright/test";
import { connectTestDatabase } from "./support/test-database";
import { launchBrowser, collectBrowserErrors } from "./support/browser";
const oldPassword = "Owned-original-password-11e!",
  nextPassword = " Owned-next-password-11e! ";
test(
  "11E real password, atomic revocation, concurrency, rollback, bilingual account and production refusal",
  { timeout: 120000 },
  async (t) => {
    const db = await connectTestDatabase(),
      browser = await launchBrowser(),
      base = process.env.TEST_BASE_URL!,
      artifact = process.env.MRT_TEST_ARTIFACT_DIR!;
    t.after(async () => {
      await browser.close();
      await db.end();
    });
    const actor = async (name: string) => {
      const email = randomUUID() + "@fixture.test",
        r = await fetch(base + "/api/auth/register", {
          method: "POST",
          headers: { Origin: base, "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password: oldPassword }),
        });
      assert.equal(r.status, 201);
      return {
        id: (await r.json()).user.id,
        email,
        token: r.headers.get("set-cookie")!.match(/p2p_session=([^;]+)/)![1],
      };
    };
    const login = async (email: string, password = oldPassword) =>
      fetch(base + "/api/auth/login", {
        method: "POST",
        headers: { Origin: base, "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
    const body = {
      currentPassword: oldPassword,
      newPassword: nextPassword,
      confirmPassword: nextPassword,
    };
    const change = async (
      token: string,
      data: unknown = body,
      headers: Record<string, string> = {},
    ) =>
      fetch(base + "/api/account/password", {
        method: "POST",
        headers: {
          Origin: base,
          "Content-Type": "application/json",
          "X-Hustlen-Password-Change": "1",
          Cookie: "p2p_session=" + token,
          ...headers,
        },
        body: JSON.stringify(data),
      });
    const me = async (token: string) =>
      fetch(base + "/api/auth/me", {
        headers: { Cookie: "p2p_session=" + token },
      });
    const user = await actor("Password reader"),
      other = await actor("Unrelated fixture");
    if (process.env.NODE_ENV === "production") {
      assert.equal((await change(user.token)).status, 404);
      assert.equal(
        (await db.query('SELECT count(*)::int n FROM "AccountSecurityEvent"'))
          .rows[0].n,
        0,
      );
      const c = await browser.newContext();
      await c.addCookies([
        { name: "p2p_session", value: user.token, url: base },
      ]);
      const p = await c.newPage();
      await p.goto(base + "/account");
      await expect(p.locator("#currentPassword")).toHaveCount(0);
      assert.equal((await me(user.token)).status, 200);
      await writeFile(
        path.join(artifact, "password-production.json"),
        JSON.stringify({
          flagConfigured: true,
          productionRoute404: true,
          uiAbsent: true,
          noEvent: true,
          oldSessionPreserved: true,
        }),
      );
      return;
    }
    const savedOther = (
      await db.query('SELECT "passwordHash" FROM "User" WHERE id=$1', [
        other.id,
      ])
    ).rows[0].passwordHash;
    assert.equal((await change("")).status, 401);
    assert.equal(
      (await change(user.token, body, { Origin: "http://evil.invalid" }))
        .status,
      403,
    );
    assert.equal((await change(user.token, body, { Origin: "" })).status, 403);
    assert.equal(
      (await change(user.token, body, { "X-Hustlen-Password-Change": "" }))
        .status,
      403,
    );
    assert.equal(
      (await change(user.token, body, { "Content-Type": "text/plain" })).status,
      415,
    );
    const invalid = await actor("Invalid input reader");
    for (const data of [
      { ...body, userId: other.id },
      { ...body, role: "ADMIN" },
      { ...body, newPassword: "short" },
      { ...body, confirmPassword: "Mismatch-11e!" },
      { ...body, currentPassword: nextPassword },
      { ...body, newPassword: oldPassword, confirmPassword: oldPassword },
      null,
      [],
      { ...body, newPassword: "x".repeat(40000) },
    ]) {
      await db.query('DELETE FROM "AuthRateLimit" WHERE key=$1', [
        createHash("sha256")
          .update(`password-change:${invalid.id}`)
          .digest("hex"),
      ]);
      assert.equal((await change(invalid.token, data)).status, 400);
    }
    assert.equal(
      (
        await fetch(base + "/api/account/password?userId=" + other.id, {
          method: "POST",
          headers: {
            Origin: base,
            "Content-Type": "application/json",
            "X-Hustlen-Password-Change": "1",
            Cookie: "p2p_session=" + user.token,
          },
          body: JSON.stringify(body),
        })
      ).status,
      400,
    );
    const limitKey = createHash("sha256")
      .update(`password-change:${invalid.id}`)
      .digest("hex");
    await db.query(
      `CREATE FUNCTION fixture_password_limit_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NULL; END $$`,
    );
    await db.query(
      `CREATE TRIGGER fixture_password_limit_failure BEFORE INSERT OR UPDATE ON "AuthRateLimit" FOR EACH ROW WHEN (NEW.key='${limitKey}') EXECUTE FUNCTION fixture_password_limit_failure()`,
    );
    try {
      assert.equal((await change(invalid.token)).status, 500);
    } finally {
      await db.query(
        'DROP TRIGGER fixture_password_limit_failure ON "AuthRateLimit"',
      );
      await db.query("DROP FUNCTION fixture_password_limit_failure()");
    }
    assert.equal((await me(invalid.token)).status, 200);
    const expired = await actor("Expired fixture");
    await db.query(
      'UPDATE "AuthSession" SET "expiresAt"=now()-interval \'1 second\' WHERE "userId"=$1',
      [expired.id],
    );
    assert.equal((await change(expired.token)).status, 401);
    const renewed = await login(expired.email);
    assert.equal(renewed.status, 200);
    const expiringToken = renewed.headers
      .get("set-cookie")!
      .match(/p2p_session=([^;]+)/)![1];
    await db.query(
      'UPDATE "AuthSession" SET "expiresAt"=clock_timestamp()+interval \'2 seconds\' WHERE "userId"=$1',
      [expired.id],
    );
    await db.query("BEGIN");
    await db.query(
      'SELECT id FROM "AuthSession" WHERE "userId"=$1 FOR UPDATE',
      [expired.id],
    );
    const waitingExpiry = change(expiringToken);
    try {
      await expect
        .poll(async () => {
          await db.query("SELECT pg_stat_clear_snapshot()");
          return Number(
            (
              await db.query(
                `SELECT count(*) n FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid() AND wait_event_type='Lock' AND query LIKE '%AuthSession%'`,
              )
            ).rows[0].n,
          );
        })
        .toBeGreaterThan(0);
      await db.query("SELECT pg_sleep(2.05)");
    } finally {
      await db.query("COMMIT");
    }
    assert.equal((await waitingExpiry).status, 401);
    const limited = await actor("Limited fixture");
    for (let i = 0; i < 5; i++)
      assert.equal(
        (
          await change(limited.token, {
            ...body,
            currentPassword: nextPassword,
          })
        ).status,
        400,
      );
    const limit = await change(limited.token);
    assert.equal(limit.status, 429);
    assert.equal(limit.headers.get("retry-after"), "900");
    const rollback = await actor("Rollback fixture");
    const rollbackDevice = await login(rollback.email);
    assert.equal(rollbackDevice.status, 200);
    const ignoredSessionId = Number(
      (
        await db.query(
          'SELECT max(id) id FROM "AuthSession" WHERE "userId"=$1',
          [rollback.id],
        )
      ).rows[0].id,
    );
    const oldHash = (
      await db.query('SELECT "passwordHash" FROM "User" WHERE id=$1', [
        rollback.id,
      ])
    ).rows[0].passwordHash;
    for (const [table, operation, condition, returning] of [
      [
        "AccountSecurityEvent",
        "INSERT",
        `NEW."actorId"=${rollback.id}`,
        "RAISE EXCEPTION 'Owned audit fault';",
      ],
      [
        "AuthSession",
        "DELETE",
        `OLD."userId"=${rollback.id}`,
        "RAISE EXCEPTION 'Owned revocation fault';",
      ],
      ["AuthSession", "DELETE", `OLD."userId"=${rollback.id}`, "RETURN NULL;"],
      [
        "User",
        'UPDATE OF "passwordHash"',
        `OLD.id=${rollback.id}`,
        "RAISE EXCEPTION 'Owned credential fault';",
      ],
    ]) {
      await db.query(
        `CREATE FUNCTION fixture_password_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN ${returning} RETURN NULL; END $$`,
      );
      await db.query(
        `CREATE TRIGGER fixture_password_failure BEFORE ${operation} ON "${table}" FOR EACH ROW WHEN (${returning === "RETURN NULL;" ? condition + ` AND OLD.id=${ignoredSessionId}` : condition}) EXECUTE FUNCTION fixture_password_failure()`,
      );
      try {
        assert.equal((await change(rollback.token)).status, 500);
      } finally {
        await db.query(`DROP TRIGGER fixture_password_failure ON "${table}"`);
        await db.query("DROP FUNCTION fixture_password_failure()");
      }
      assert.ok(
        (
          await db.query('SELECT "passwordHash" FROM "User" WHERE id=$1', [
            rollback.id,
          ])
        ).rows[0].passwordHash === oldHash,
        "Credential must roll back",
      );
      assert.equal((await me(rollback.token)).status, 200);
      assert.equal(
        (
          await db.query(
            'SELECT count(*)::int n FROM "AuthSession" WHERE "userId"=$1',
            [rollback.id],
          )
        ).rows[0].n,
        2,
      );
      assert.equal(
        (
          await db.query(
            'SELECT count(*)::int n FROM "AccountSecurityEvent" WHERE "actorId"=$1',
            [rollback.id],
          )
        ).rows[0].n,
        0,
      );
    }
    const suspended = await actor("Suspended security reader");
    await db.query(
      'UPDATE "User" SET "accountStatus"=\'SUSPENDED\' WHERE id=$1',
      [suspended.id],
    );
    assert.equal((await change(suspended.token)).status, 200);
    assert.equal(
      (
        await db.query('SELECT "accountStatus" FROM "User" WHERE id=$1', [
          suspended.id,
        ])
      ).rows[0].accountStatus,
      "SUSPENDED",
    );
    assert.equal((await login(suspended.email, nextPassword)).status, 200);
    const admin = await actor("Excluded admin fixture");
    await db.query("UPDATE \"User\" SET role='ADMIN' WHERE id=$1", [admin.id]);
    assert.equal((await change(admin.token)).status, 403);
    const reviewer = await actor("Excluded reviewer fixture");
    await db.query('INSERT INTO "ChatReviewer" ("userId") VALUES ($1)', [
      reviewer.id,
    ]);
    assert.equal((await change(reviewer.token)).status, 403);
    // Force password-first/login-second lock ordering after the old password was actually verified.
    const race = await actor("Race fixture");
    await db.query("BEGIN");
    await db.query("SELECT pg_advisory_xact_lock(1105001,$1)", [race.id]);
    let changing: Promise<Response> | undefined,
      logging: Promise<Response> | undefined;
    try {
      changing = change(race.token);
      await expect
        .poll(async () =>
          Number(
            (
              await db.query(
                `SELECT count(*) n FROM pg_locks WHERE locktype='advisory' AND classid=1105001 AND objid=$1 AND NOT granted`,
                [race.id],
              )
            ).rows[0].n,
          ),
        )
        .toBe(1);
      logging = login(race.email);
      await expect
        .poll(async () =>
          Number(
            (
              await db.query(
                `SELECT count(*) n FROM pg_locks WHERE locktype='advisory' AND classid=1105001 AND objid=$1 AND NOT granted`,
                [race.id],
              )
            ).rows[0].n,
          ),
        )
        .toBe(2);
    } finally {
      await db.query("COMMIT");
    }
    assert.equal((await changing!).status, 200);
    assert.equal((await logging!).status, 401);
    assert.equal((await me(race.token)).status, 401);
    assert.equal((await login(race.email, nextPassword)).status, 200);
    const concurrent = await actor("Concurrent fixture"),
      a = {
        ...body,
        newPassword: "Concurrent-A-password!",
        confirmPassword: "Concurrent-A-password!",
      },
      b = {
        ...body,
        newPassword: "Concurrent-B-password!",
        confirmPassword: "Concurrent-B-password!",
      };
    const replies = await Promise.all([
      change(concurrent.token, a),
      change(concurrent.token, b),
    ]);
    assert.equal(replies.filter((r) => r.status === 200).length, 1);
    assert.ok(replies.every((r) => [200, 401, 409].includes(r.status)));
    assert.equal(
      (
        await db.query(
          'SELECT count(*)::int n FROM "AccountSecurityEvent" WHERE "actorId"=$1',
          [concurrent.id],
        )
      ).rows[0].n,
      1,
    );
    // Two independent browsers, real UI change, no synthetic assurance or fake success.
    const secondLogin = await login(user.email);
    assert.equal(secondLogin.status, 200);
    const secondToken = secondLogin.headers
      .get("set-cookie")!
      .match(/p2p_session=([^;]+)/)![1];
    const c = await browser.newContext({
        viewport: { width: 1440, height: 1100 },
      }),
      c2 = await browser.newContext();
    await c.addCookies([{ name: "p2p_session", value: user.token, url: base }]);
    await c2.addCookies([
      { name: "p2p_session", value: secondToken, url: base },
    ]);
    const errors: string[] = [];
    collectBrowserErrors(c, errors);
    const page = await c.newPage();
    await page.goto(base + "/account");
    await page.locator("#account-name").fill("Unrelated unsaved name draft");
    for (const [size, width, height] of [
      ["desktop", 1440, 1100],
      ["tablet", 820, 1180],
      ["mobile", 390, 844],
    ] as const) {
      await page.setViewportSize({ width, height });
      for (const locale of ["en", "zh-TW"]) {
        await page
          .locator(".heritage-preferences select")
          .first()
          .selectOption(locale);
        for (const theme of ["light", "dark"]) {
          await page
            .locator(".heritage-preferences select")
            .nth(1)
            .selectOption(theme);
          assert.ok(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
          );
          for (const control of await page
            .locator(
              '.password-fields input,.password-fields button[type="submit"]',
            )
            .all()) {
            const box = await control.boundingBox();
            assert.ok(
              box && box.width >= 44 && box.height >= 44,
              "Credential controls need 44px touch targets",
            );
          }
          await page.screenshot({
            path: path.join(
              artifact,
              `password-${locale}-${theme}-${size}.png`,
            ),
            fullPage: true,
            animations: "disabled",
          });
        }
      }
    }
    await page.locator("#currentPassword").fill(oldPassword);
    await page.locator("#newPassword").fill(nextPassword);
    await page.locator("#confirmPassword").fill("Wrong-confirmation!");
    await page
      .getByRole("button", { name: "變更密碼並登出", exact: true })
      .click();
    await expect(page.locator("#password-error")).toHaveText(
      "請輸入目前密碼，並設定不同的 8–128 字元新密碼；兩次輸入的新密碼須相同。",
    );
    await page.getByLabel("介面語言", { exact: true }).selectOption("en");
    await expect(page.locator("#newPassword")).toHaveValue(nextPassword);
    await expect(page.locator("#password-error")).toHaveText(
      /confirmation must match/,
    );
    await page.locator("#confirmPassword").fill(nextPassword);
    await page.locator("#currentPassword").fill("Wrong-current-password!");
    const mark = errors.length;
    await page
      .getByRole("button", {
        name: "Change password and sign out",
        exact: true,
      })
      .click();
    await expect(page.locator("#password-error")).toHaveText(
      "The current password is incorrect. Re-enter the fields to try again.",
    );
    const expected = errors.splice(mark);
    assert.ok(
      expected.length >= 1 &&
        expected.every(
          (e) =>
            e === "400 /api/account/password" ||
            /^Failed to load resource: the server responded with a status of 400/.test(
              e,
            ),
        ),
    );
    await expect(page.locator("#currentPassword")).toHaveValue("");
    await page.screenshot({
      path: path.join(artifact, "password-error-en.png"),
      fullPage: true,
      animations: "disabled",
    });
    await page.getByLabel("Language", { exact: true }).selectOption("zh-TW");
    await expect(page.locator("#password-error")).toHaveText(
      "目前密碼不正確，請重新輸入後再試一次。",
    );
    await page.screenshot({
      path: path.join(artifact, "password-error-zh-TW.png"),
      fullPage: true,
      animations: "disabled",
    });
    await page.locator("#currentPassword").fill(oldPassword);
    await page.locator("#newPassword").fill(nextPassword);
    await page.locator("#confirmPassword").fill(nextPassword);
    await db.query("BEGIN");
    await db.query("SELECT pg_advisory_xact_lock(1105001,$1)", [user.id]);
    let passwordPosts = 0;
    page.on("request", (request) => {
      if (
        new URL(request.url()).pathname === "/api/account/password" &&
        request.method() === "POST"
      )
        passwordPosts++;
    });
    try {
      await page.locator("#confirmPassword").press("Enter");
      await expect(
        page.getByRole("button", { name: "正在變更密碼…", exact: true }),
      ).toBeDisabled();
      await expect(page.locator("#newPassword")).toBeDisabled();
      await expect(
        page.getByRole("button", { name: "儲存設定", exact: true }),
      ).toBeDisabled();
      await expect.poll(() => passwordPosts).toBe(1);
      await page
        .locator('section[aria-labelledby="password-title"] form')
        .evaluate((form) => (form as HTMLFormElement).requestSubmit());
      await page.screenshot({
        path: path.join(artifact, "password-busy-zh-TW.png"),
        fullPage: true,
        animations: "disabled",
      });
    } finally {
      await db.query("COMMIT");
    }

    await expect(
      page.locator('section[aria-labelledby="password-title"] [role="status"]'),
    ).toContainText("密碼已變更");
    assert.equal(passwordPosts, 1);
    await expect(page.locator("#newPassword")).toHaveValue("");
    await expect(page.locator("#account-name")).toHaveValue(
      "Unrelated unsaved name draft",
    );
    await expect(page.locator("#account-name")).toBeEnabled();
    await expect(page.locator("#account-name")).toHaveJSProperty(
      "readOnly",
      true,
    );
    await page.locator("#account-name").focus();
    await expect(page.locator("#account-name")).toBeFocused();
    await page.locator("#account-name").press("ControlOrMeta+A");
    assert.equal(
      await page
        .locator("#account-name")
        .evaluate(
          (e) =>
            (e as HTMLInputElement).selectionEnd! -
            (e as HTMLInputElement).selectionStart!,
        ),
      "Unrelated unsaved name draft".length,
    );
    assert.equal((await c2.request.get(base + "/api/auth/me")).status(), 401);
    assert.equal((await me(user.token)).status, 401);
    assert.equal((await me(secondToken)).status, 401);
    assert.equal((await login(user.email)).status, 401);
    assert.equal((await login(user.email, nextPassword)).status, 200);
    assert.equal(
      (
        await db.query(
          'SELECT count(*)::int n FROM "AccountSecurityEvent" WHERE "actorId"=$1',
          [user.id],
        )
      ).rows[0].n,
      1,
    );
    const event = (
      await db.query(
        'SELECT * FROM "AccountSecurityEvent" WHERE "actorId"=$1',
        [user.id],
      )
    ).rows[0];
    assert.equal(event.action, "PASSWORD_CHANGED");
    assert.equal(event.revokedSessions, 2);
    assert.ok(event.createdAt instanceof Date);
    for (const sql of [
      'UPDATE "AccountSecurityEvent" SET action=action',
      'DELETE FROM "AccountSecurityEvent"',
      'TRUNCATE "AccountSecurityEvent"',
    ])
      await assert.rejects(db.query(sql));
    const browserStorage = await page.evaluate(() =>
      JSON.stringify({
        local: { ...localStorage },
        session: { ...sessionStorage },
        url: location.href,
        cookie: document.cookie,
      }),
    );
    assert.ok(
      !browserStorage.includes(oldPassword) &&
        !browserStorage.includes(nextPassword),
    );
    await page.screenshot({
      path: path.join(artifact, "password-success-zh-TW.png"),
      fullPage: true,
      animations: "disabled",
    });
    await page.getByLabel("介面語言", { exact: true }).selectOption("en");
    await expect(
      page.locator('section[aria-labelledby="password-title"] [role="status"]'),
    ).toContainText("Password changed. All previous sessions are signed out.");
    await page.screenshot({
      path: path.join(artifact, "password-success-en.png"),
      fullPage: true,
      animations: "disabled",
    });
    await page.getByLabel("Language", { exact: true }).selectOption("zh-TW");
    await page.getByRole("link", { name: "重新登入", exact: true }).click();
    await expect(page).toHaveURL(base + "/login");
    await page.getByLabel("Email address", { exact: true }).fill(user.email);
    await page.getByLabel("Password", { exact: true }).fill(nextPassword);
    await page.getByRole("button", { name: "Log in", exact: true }).click();
    await expect(page).toHaveURL(base + "/dashboard");
    await page.goto(base + "/account");
    await page.locator("#currentPassword").fill(nextPassword);
    await page.locator("#newPassword").fill("Another-owned-password!");
    await page.locator("#confirmPassword").fill("Another-owned-password!");
    await db.query(
      'UPDATE "AuthSession" SET "expiresAt"=now()-interval \'1 second\' WHERE "userId"=$1',
      [user.id],
    );
    const expiredMark = errors.length;
    await page
      .getByRole("button", { name: "變更密碼並登出", exact: true })
      .click();
    await expect(page.locator("#password-error")).toHaveText(
      "登入狀態已失效，請重新登入後再變更密碼。",
    );
    await expect(page.locator("#newPassword")).toHaveValue("");
    await expect(page.locator("#newPassword")).toBeDisabled();
    assert.ok(!(await page.locator("body").innerText()).includes(user.email));
    const expectedExpired = errors.splice(expiredMark);
    assert.ok(
      expectedExpired.length >= 1 &&
        expectedExpired.every(
          (e) =>
            e === "401 /api/account/password" ||
            /^Failed to load resource: the server responded with a status of 401/.test(
              e,
            ),
        ),
    );
    await page.screenshot({
      path: path.join(artifact, "password-expired-zh-TW.png"),
      fullPage: true,
      animations: "disabled",
    });
    assert.deepEqual(errors, []);
    assert.ok(
      (
        await db.query('SELECT "passwordHash" FROM "User" WHERE id=$1', [
          other.id,
        ])
      ).rows[0].passwordHash === savedOther,
      "Other account unchanged",
    );
    assert.equal((await me(other.token)).status, 200);
    assert.equal(
      (
        await fetch(base + "/api/account", {
          method: "PATCH",
          headers: {
            Origin: base,
            "Content-Type": "application/json",
            Cookie: "p2p_session=" + user.token,
          },
          body: JSON.stringify({ name: "Stale must not write" }),
        })
      ).status,
      401,
    );
    const log = await readFile(path.join(artifact, "server.log"), "utf8");
    assert.ok(
      !log.includes(oldPassword) &&
        !log.includes(nextPassword) &&
        !JSON.stringify(event).includes("scrypt$"),
    );
    await writeFile(
      path.join(artifact, "password-change.json"),
      JSON.stringify(
        {
          realChange: true,
          csrfAndInputDenied: true,
          currentPasswordVerified: true,
          allPriorSessionsRevoked: true,
          expiryRecheckedAfterLockWait: true,
          independentBrowsers: true,
          oldPasswordDeniedNewAccepted: true,
          suspendedSecurityAccessPreserved: true,
          adminReviewerExcluded: true,
          rateLimitPersistent: true,
          missingLimitStorageFailsClosed: true,
          querySelectorsRejected: true,
          concurrentOneWinner: true,
          staleVerifiedLoginDenied: true,
          credentialRevocationAndAuditRollback: true,
          partialRevocationRollsBack: true,
          eventImmutable: true,
          unrelatedAccountPreserved: true,
          bilingualErrors: true,
          realSignInNavigation: true,
          nameDraftRetained: true,
          nameDraftKeyboardSelectableAfterRevocation: true,
          passwordsClearedAfterResponse: true,
          noCredentialInStorageOrLogs: true,
          screenshots: 18,
          realPendingDisabledAndDuplicateSubmitGuard: true,
          touchTargetsAtLeast44: true,
          realNewPasswordBrowserLogin: true,
          expiredMountedForm401: true,
          browserErrors: errors,
        },
        null,
        2,
      ),
    );
  },
);

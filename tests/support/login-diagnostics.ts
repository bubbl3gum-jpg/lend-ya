import type { Page } from "@playwright/test";
import type { Client } from "pg";
import { writeFile } from "node:fs/promises";
import path from "node:path";
/** Test-only bounded metadata. Never capture body, query, cookie value, email or password. */
export async function loginDiagnostics(page: Page, db: Client, label: string) {
  const started = Date.now(),
    events: object[] = [];
  const add = (event: object) => {
    if (events.length < 60) events.push({ ms: Date.now() - started, ...event });
  };
  const safePath = (url: string) => {
    const p = new URL(url).pathname;
    return [
      "/login",
      "/dashboard",
      "/admin",
      "/api/auth/login",
      "/api/auth/me",
    ].includes(p)
      ? p
      : "OTHER";
  };
  const onRequest = (request: import("@playwright/test").Request) => {
    if (
      request.isNavigationRequest() ||
      new URL(request.url()).pathname === "/api/auth/login"
    )
      add({
        event: "request",
        path: safePath(request.url()),
        method: request.method(),
      });
  };
  const onResponse = (response: import("@playwright/test").Response) => {
    if (
      response.request().isNavigationRequest() ||
      new URL(response.url()).pathname === "/api/auth/login"
    )
      add({
        event: "response",
        path: safePath(response.url()),
        status: response.status(),
      });
  };
  const onError = () => add({ event: "browser_error" });
  page.on("request", onRequest);
  page.on("response", onResponse);
  page.on("pageerror", onError);
  return async (outcome: string) => {
    page.off("request", onRequest);
    page.off("response", onResponse);
    page.off("pageerror", onError);
    const cookies = await page.context().cookies();
    const browser = await page
      .evaluate(() => ({
        readyState: document.readyState,
        authReady:
          document
            .querySelector("form[data-auth-ready]")
            ?.getAttribute("data-auth-ready") ?? "unmarked",
        submitDisabled:
          (
            document.querySelector(
              'button[type="submit"]',
            ) as HTMLButtonElement | null
          )?.disabled ?? null,
        inputValidity: Array.from(document.querySelectorAll("input"))
          .slice(0, 3)
          .map((i) => i.validity.valid),
        navigationEntries: performance.getEntriesByType("navigation").length,
      }))
      .catch(() => null);
    const contention = await db.query(
      `SELECT count(*)::int sessions,count(*) FILTER(WHERE wait_event_type='Lock')::int lock_waiters FROM pg_stat_activity WHERE datname=current_database()`,
    );
    const evidence = {
      label,
      outcome,
      path: safePath(page.url()),
      events,
      browser,
      cookiePresent: cookies.some((c) => c.name === "p2p_session"),
      cookieHttpOnly: cookies
        .filter((c) => c.name === "p2p_session")
        .every((c) => c.httpOnly),
      database: contention.rows[0],
    };
    await writeFile(
      path.join(process.env.MRT_TEST_ARTIFACT_DIR!, `login-${label}.json`),
      JSON.stringify(evidence, null, 2) + "\n",
    );
    return evidence;
  };
}

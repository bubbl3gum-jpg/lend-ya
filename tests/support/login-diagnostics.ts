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
  const relevant = (r: import("@playwright/test").Request) =>
    r.isNavigationRequest() ||
    [
      "/login",
      "/dashboard",
      "/admin",
      "/api/auth/login",
      "/api/auth/me",
    ].includes(new URL(r.url()).pathname);
  const onRequest = (request: import("@playwright/test").Request) => {
    if (relevant(request))
      add({
        event: "request",
        path: safePath(request.url()),
        method: request.method(),
        navigation: request.isNavigationRequest(),
        rsc: request.headers()["rsc"] === "1",
      });
  };
  const onResponse = (response: import("@playwright/test").Response) => {
    if (relevant(response.request()))
      add({
        event: "response",
        path: safePath(response.url()),
        status: response.status(),
        navigation: response.request().isNavigationRequest(),
        rsc: response.request().headers()["rsc"] === "1",
      });
  };
  const onFrame = (frame: import("@playwright/test").Frame) => {
    if (frame === page.mainFrame() && /^https?:/.test(frame.url()))
      add({ event: "main_frame_committed", path: safePath(frame.url()) });
  };
  const onError = () => add({ event: "browser_error" });
  page.on("framenavigated", onFrame);
  page.on("request", onRequest);
  page.on("response", onResponse);
  page.on("pageerror", onError);
  return async (outcome: string) => {
    page.off("framenavigated", onFrame);
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

/** Dev compiles routes on demand. Complete bounded anonymous route probes before
 * measuring login navigation; no credentials or authentication retries are used. */
export async function readyAuthenticationRoutes(base: string) {
  const probes = [];
  for (const pathname of ["/login", "/dashboard", "/admin"]) {
    const started = Date.now(),
      response = await fetch(base + pathname, {
        redirect: "manual",
        signal: AbortSignal.timeout(20000),
      });
    await response.arrayBuffer();
    if (![200, 307].includes(response.status))
      throw Error("Authentication destination failed readiness");
    probes.push({
      path: pathname,
      status: response.status,
      ms: Date.now() - started,
    });
  }
  await writeFile(
    path.join(
      process.env.MRT_TEST_ARTIFACT_DIR!,
      "authentication-route-readiness.json",
    ),
    JSON.stringify(probes, null, 2) + "\n",
  );
}

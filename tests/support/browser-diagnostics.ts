import type { BrowserContext, Page } from "@playwright/test";
import { appendFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import path from "node:path";

/** Owned synthetic acceptance evidence only: never records cookies, headers or request bodies. */
export function browserDiagnostics(artifact: string, label: string) {
  const pages: Page[] = [];
  let checkpoint = 0;
  const pathname = (url: string) => { try { return new URL(url).pathname; } catch { return "unknown"; } };
  const record = (event: object) => appendFileSync(path.join(artifact, `${label}-browser.ndjson`), JSON.stringify({ time: new Date().toISOString(), ...event }) + "\n", { mode: 0o600 });
  function observePage(page: Page) {
    if (pages.includes(page)) return;
    const index = pages.push(page) - 1;
    const emit = (kind: string, data: object = {}) => record({ page: index, kind, ...data });
    let nextSocket = 0;
    page.on("domcontentloaded", () => emit("document-lifecycle", {event:"domcontentloaded"}));
    page.on("load", () => emit("document-lifecycle", {event:"load"}));
    page.on("requestfinished", request => { if (request.isNavigationRequest()) emit("navigation-finished", {path:pathname(request.url()), timing:request.timing()}); });
    page.on("console", message => emit("console", { type: message.type(), text: message.text().slice(0, 4000) }));
    page.on("pageerror", error => emit("pageerror", { message: error.message, stack: error.stack?.slice(0, 4000) }));
    page.on("requestfailed", request => emit("requestfailed", { method: request.method(), type: request.resourceType(), path: pathname(request.url()), error: request.failure()?.errorText }));
    page.on("response", response => { if (response.status() >= 300 || response.request().resourceType() === "image" || !["GET", "HEAD"].includes(response.request().method())) emit("response", { method:response.request().method(), path: pathname(response.url()), status: response.status(), timing:response.request().timing() }); });
    page.on("framenavigated", frame => { if (frame === page.mainFrame()) emit("navigation", { path: pathname(frame.url()) }); });
    page.on("websocket", socket => {
      const endpoint = pathname(socket.url());
      if (endpoint !== "/_next/hmr" && !endpoint.includes("webpack-hmr")) return;
      const identity = nextSocket++;
      const socketEvent = (kind:string, data:object = {}) => emit(kind, {socket:identity, ...data});
      socketEvent("hmr-open", {endpoint});
      socket.on("close", () => socketEvent("hmr-close"));
      socket.on("framereceived", event => {
        // Binary frames carry React debug payloads, not HMR control messages.
        if (typeof event.payload !== "string") return;
        socketEvent("hmr", { data: event.payload.slice(0, 2000) });
      });
      socket.on("framesent", event => {
        if (typeof event.payload !== "string") return;
        try {
          const message = JSON.parse(event.payload);
          if (message.type === "turbopack-subscribe" || message.type === "turbopack-unsubscribe") {
            const resource = typeof message.path === "string" ? message.path.split(/[?#]/, 1)[0] : "";
            socketEvent("hmr-subscription", { type: message.type, resource: /^static\/chunks\//.test(resource) ? resource.slice(0, 1000) : "nonstandard-resource", hmrVersion: typeof message.hmrVersion === "string" ? message.hmrVersion.slice(0, 64) : undefined });
          }
          if (message.event === "client-full-reload")
            socketEvent("hmr-reload", { stackTrace: String(message.stackTrace ?? "").slice(0, 4000), dependencyChain: message.dependencyChain, hadRuntimeError: message.hadRuntimeError });
        } catch { /* Binary/non-JSON diagnostics are not application requests. */ }
      });
    });
    page.on("crash", () => emit("crash"));
  }
  return {
    caseResult(name: string, error: unknown) { record({kind:"case", name, error:error instanceof Error ? {message:error.message, stack:error.stack} : null}); },
    observeContext(context: BrowserContext) { context.pages().forEach(observePage); context.on("page", observePage); },
    async checkpoint() {
      const step = checkpoint++;
      for (const [index, page] of pages.entries()) {
        if (page.isClosed()) continue;
        const prefix = path.join(artifact, `${label}-${step}-${index}`);
        record({ kind: "checkpoint", step, page: index, path: pathname(page.url()), state: await page.evaluate(() => ({ readyState: document.readyState, bookingReady: document.querySelector("[data-booking-ready]")?.getAttribute("data-booking-ready"), authReady: document.querySelector("[data-auth-ready]")?.getAttribute("data-auth-ready"), title: document.title })).catch(() => null) });
        await page.screenshot({ path: prefix + ".png", fullPage: true, timeout: 5000 }).catch(() => {});
        await writeFile(prefix + ".html", await page.content().catch(() => "Unavailable"), { mode: 0o600 });
      }
    },
  };
}

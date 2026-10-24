import {
  CAMERA_DIAGNOSTIC_STAGES,
  CAMERA_DIAGNOSTIC_CATEGORIES,
} from "../../lib/camera-diagnostics";
import { execFileSync } from "node:child_process";
import type { Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
export async function observeCamera(page: Page, label: string) {
  const correlationId = randomUUID(),
    started = Date.now(),
    cpu = process.cpuUsage(),
    events: object[] = [];
  const add = (event: object) => {
    if (events.length < 100)
      events.push({ ms: Date.now() - started, ...event });
  };
  await page.addInitScript(
    ({ stages, categories }) => {
      eval("globalThis.__name = (fn) => fn");
      const state = {
        started: Date.now(),
        draws: 0,
        mediaStarts: 0,
        mediaResolved: 0,
        mediaFailures: 0,
        trackStops: 0,
        trackEnds: 0,
        stages: {} as Record<string, number>,
        categories: {} as Record<string, number>,
        track: null as null | {
          state: string;
          width?: number;
          height?: number;
          frameRate?: number;
        },
      };
      Object.assign(window, { __hustlenCameraTest: state });
      window.addEventListener("hustlen-camera-diagnostic", (e) => {
        const d = (e as CustomEvent).detail;
        if (
          d &&
          stages.includes(d.stage) &&
          Object.keys(state.stages).length < 30
        ) {
          state.stages[d.stage] = (state.stages[d.stage] ?? 0) + 1;
          if (
            categories.includes(d.category) &&
            Object.keys(state.categories).length < 16
          )
            state.categories[d.category] =
              (state.categories[d.category] ?? 0) + 1;
        }
      });
      const draw = CanvasRenderingContext2D.prototype.drawImage;
      CanvasRenderingContext2D.prototype.drawImage = function (
        ...args: unknown[]
      ) {
        if (args[0] instanceof HTMLVideoElement) state.draws++;
        return Reflect.apply(draw, this, args);
      };
      if (navigator.mediaDevices?.getUserMedia) {
        const get = navigator.mediaDevices.getUserMedia.bind(
          navigator.mediaDevices,
        );
        navigator.mediaDevices.getUserMedia = async (c) => {
          state.mediaStarts++;
          try {
            const stream = await get(c);
            state.mediaResolved++;
            for (const t of stream.getVideoTracks()) {
              const s = t.getSettings();
              state.track = {
                state: t.readyState,
                width: s.width,
                height: s.height,
                frameRate: s.frameRate,
              };
              t.addEventListener("ended", () => {
                state.trackEnds++;
                if (state.track) state.track.state = t.readyState;
              });
              const stop = t.stop.bind(t);
              t.stop = () => {
                state.trackStops++;
                if (state.track) state.track.state = "ended";
                return stop();
              };
            }
            return stream;
          } catch (e) {
            state.mediaFailures++;
            throw e;
          }
        };
      }
    },
    {
      stages: [...CAMERA_DIAGNOSTIC_STAGES] as string[],
      categories: [...CAMERA_DIAGNOSTIC_CATEGORIES] as string[],
    },
  );
  const requests = new WeakMap<import("@playwright/test").Request, number>();
  const onRequest = (r: import("@playwright/test").Request) => {
    if (/\/meetup\/(verify|status)$/.test(new URL(r.url()).pathname))
      requests.set(r, Date.now());
  };
  const onResponse = (r: import("@playwright/test").Response) => {
    const p = new URL(r.url()).pathname;
    const operation = p.match(
      /^\/api\/bookings\/\d+\/meetup\/(verify|status)$/,
    )?.[1];
    if (operation)
      add({
        event: "response",
        operation,
        status: r.status(),
        durationMs: requests.has(r.request())
          ? Date.now() - requests.get(r.request())!
          : null,
      });
  };
  const onConsole = (m: import("@playwright/test").ConsoleMessage) => {
    if (m.type() === "error") add({ event: "console-error" });
  };
  const onError = (e: Error) =>
    add({
      event: "page-error",
      category: ["ReferenceError", "TypeError", "SyntaxError"].includes(e.name)
        ? e.name
        : "Other",
    });
  page.on("request", onRequest);
  page.on("response", onResponse);
  page.on("console", onConsole);
  page.on("pageerror", onError);
  let saved: unknown;
  return async () => {
    if (saved) return saved;
    page.off("request", onRequest);
    page.off("response", onResponse);
    page.off("console", onConsole);
    page.off("pageerror", onError);
    const browser = await page
      .evaluate(() => {
        const v = document.querySelector("video");
        return {
          observer: (window as unknown as { __hustlenCameraTest: unknown })
            .__hustlenCameraTest,
          video: v
            ? {
                readyState: v.readyState,
                width: v.videoWidth,
                height: v.videoHeight,
                paused: v.paused,
              }
            : null,
          verifiedBooking: /Verified booking/.test(document.body.innerText),
          visibleAlerts: document.querySelectorAll('[role="alert"]').length,
        };
      })
      .catch(() => ({ pageUnavailable: true }));
    let chromiumAggregate: unknown = null;
    try {
      const rows = execFileSync("ps", ["-C", "chromium", "-o", "pcpu=,rss="], {
        encoding: "utf8",
      })
        .trim()
        .split("\n")
        .map((r) => r.trim().split(/\s+/).map(Number))
        .filter((r) => r.length === 2 && r.every(Number.isFinite));
      chromiumAggregate = {
        processes: rows.length,
        cpuPercent: rows.reduce((s, r) => s + r[0], 0),
        residentKiB: rows.reduce((s, r) => s + r[1], 0),
      };
    } catch {}
    const result = {
      correlationId,
      label,
      startedAt: new Date(started).toISOString(),
      elapsedMs: Date.now() - started,
      events,
      browser,
      host: {
        chromiumAggregate,
        loadAverage: os.loadavg(),
        cpuCount: os.cpus().length,
        nodeCpuMicros: process.cpuUsage(cpu),
      },
    };
    await writeFile(
      path.join(process.env.MRT_TEST_ARTIFACT_DIR!, `camera-${label}.json`),
      JSON.stringify(result, null, 2),
      { mode: 0o600 },
    );
    saved = result;
    return result;
  };
}

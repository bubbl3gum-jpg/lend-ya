import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { build } from "esbuild";
import QRCode from "qrcode";
import { chromium } from "@playwright/test";

/** Public deterministic QR strings; no real issued challenge or secret is used. */
export function publicQrFixture(n: number) {
  const h = createHash("sha256")
    .update("public-camera-id-" + n)
    .digest("hex");
  return (
    "HUSTLEN1:15:PICKUP:" +
    h.slice(0, 8) +
    "-" +
    h.slice(8, 12) +
    "-" +
    h.slice(12, 16) +
    "-" +
    h.slice(16, 20) +
    "-" +
    h.slice(20, 32) +
    ":" +
    createHash("sha512")
      .update("public-camera-fixture-" + n)
      .digest("base64url")
      .slice(0, 64)
  );
}
test(
  "actual browser QR detector: native miss reproduced; bounded real-pixel transforms decode the public corpus",
  { timeout: 60000 },
  async () => {
    const temp = await mkdtemp(
      path.join(os.tmpdir(), "hustlen-camera-reader-"),
    );
    let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
    try {
      await build({
        entryPoints: ["lib/qr-camera-reader.ts"],
        outfile: path.join(temp, "reader.js"),
        bundle: true,
      minify: true,
        platform: "browser",
        format: "iife",
        globalName: "CameraReaderFixture",
        define: {
          "process.env.NODE_ENV": '"development"',
          "process.env.NEXT_PUBLIC_HUSTLEN_CAMERA_DIAGNOSTICS": '"owned-test"',
        },
        logLevel: "silent",
      });
      browser = await chromium.launch({
        executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium",
        headless: true,
        args: ["--no-sandbox"],
      });
      const page = await browser.newPage();
      await page.setContent("<canvas></canvas>");
      await page.evaluate("globalThis.__name = (fn) => fn");
      await page.addScriptTag({ path: path.join(temp, "reader.js") });
      const results = [];
      for (let n = 0; n < 128; n++) {
        const text = publicQrFixture(n),
          uri =
            "data:image/png;base64," +
            (await QRCode.toBuffer(text, { width: 480, margin: 4 })).toString(
              "base64",
            );
        const result = await page.evaluate(
          async ({ uri, text }) => {
            const image = new Image();
            image.src = uri;
            await image.decode();
            const canvas = document.querySelector("canvas")!;
            canvas.width = 640;
            canvas.height = 480;
            const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
            ctx.fillStyle = "white";
            ctx.fillRect(0, 0, 640, 480);
            ctx.drawImage(image, 80, 0);
            const lib = (
              window as unknown as {
                CameraReaderFixture: {
                  CameraQrReader: new () => {
                    decodeFromCanvas: (c: HTMLCanvasElement) => {
                      getText: () => string;
                    };
                  };
                };
              }
            ).CameraReaderFixture;
            const counts: Record<string, number> = {};
            const listener = (e: Event) => {
              const stage = (e as CustomEvent).detail.stage;
              counts[stage] = (counts[stage] ?? 0) + 1;
            };
            window.addEventListener("hustlen-camera-diagnostic", listener);
            let matched = false;
            try {
              matched =
                new lib.CameraQrReader().decodeFromCanvas(canvas).getText() ===
                text;
            } catch {}
            window.removeEventListener("hustlen-camera-diagnostic", listener);
            return { matched, counts };
          },
          { uri, text },
        );
        assert.equal(result.matched, true, "Public fixture " + n);
        results.push(result);
      }
      assert.ok(
        results.some(
          (r) => r.counts["half-decoded"] || r.counts["rotate-decoded"],
        ),
        "Regression must actually exercise a native detector miss",
      );
      const summary = {
        publicFixtures: 128,
        decoded: results.filter((r) => r.matched).length,
        native: results.filter((r) => r.counts["native-decoded"]).length,
        half: results.filter((r) => r.counts["half-decoded"]).length,
        rotatedHalf: results.filter((r) => r.counts["rotate-decoded"]).length,
        maximumDetectorAttemptsPerFrame: 3,
        realBrowserCanvas: true,
        syntheticPayloadsOnly: true,
      };
      if (process.env.MRT_CAMERA_EVIDENCE_DIR)
        await writeFile(
          path.join(
            process.env.MRT_CAMERA_EVIDENCE_DIR,
            "detector-corpus.json",
          ),
          JSON.stringify(summary, null, 2),
        );
    } finally {
      await browser?.close();
      await rm(temp, { recursive: true, force: true });
    }
  },
);

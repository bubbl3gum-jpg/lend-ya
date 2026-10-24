/** Loopback-only browser acceptance harness. Never an application API/UI. */
import { createServer } from "node:http";
import type { Client } from "pg";
import type { PrismaClient } from "@prisma/client";
import { chromium } from "playwright";
import { createStaffWebAuthnFoundation } from "../../lib/authorization/mfa/service";
import { assertOwnedFoundationFixture } from "../../lib/authorization/scoped/session-audit";
import { MFA_PASSWORD, mfaActorFixture } from "./mfa-fixtures";
import assert from "node:assert/strict";
import path from "node:path";
const html = `<!doctype html><html><head><title>Hustlen' WebAuthn acceptance</title></head><body><h1>Hustlen' passkey acceptance</h1><p>Owned local test fixture</p><input id="password" type="password" aria-label="Current password"><button id="enroll">Enroll passkey</button><button id="verify">Verify passkey</button><p id="status"></p><script>
const decode=s=>Uint8Array.from(atob(s.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0));
const encode=b=>btoa(String.fromCharCode(...new Uint8Array(b))).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
async function post(url,body){const r=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});if(!r.ok)throw Error('Denied');return r.json();}
document.querySelector('#enroll').onclick=async()=>{try{const password=document.querySelector('#password').value;const start=await post('/enroll/begin',{password});const options=start.options;options.challenge=decode(options.challenge);options.user.id=decode(options.user.id);options.excludeCredentials=options.excludeCredentials.map(c=>({...c,id:decode(c.id)}));const c=await navigator.credentials.create({publicKey:options});await post('/enroll/finish',{challengeId:start.challengeId,password,response:{id:c.id,rawId:encode(c.rawId),type:c.type,response:{clientDataJSON:encode(c.response.clientDataJSON),attestationObject:encode(c.response.attestationObject),transports:c.response.getTransports()},clientExtensionResults:c.getClientExtensionResults()}});document.querySelector('#status').textContent='Passkey enrolled';}catch{document.querySelector('#status').textContent='Enrollment denied';}};
document.querySelector('#verify').onclick=async()=>{try{const start=await post('/authenticate/begin',{});const options=start.options;options.challenge=decode(options.challenge);options.allowCredentials=options.allowCredentials.map(c=>({...c,id:decode(c.id)}));const c=await navigator.credentials.get({publicKey:options});const result=await post('/authenticate/finish',{challengeId:start.challengeId,response:{id:c.id,rawId:encode(c.rawId),type:c.type,response:{clientDataJSON:encode(c.response.clientDataJSON),authenticatorData:encode(c.response.authenticatorData),signature:encode(c.response.signature),...(c.response.userHandle?{userHandle:encode(c.response.userHandle)}:{})},clientExtensionResults:c.getClientExtensionResults()}});document.querySelector('#status').textContent=result.factorVerified&&!result.staffAuthorized?'Factor verified; staff access remains blocked':'Denied';}catch{document.querySelector('#status').textContent='Verification denied';}};
</script></body></html>`;
export async function mfaBrowserAcceptance(db: PrismaClient, pg: Client) {
  await db.$transaction((tx) => assertOwnedFoundationFixture(tx));
  const actor = await mfaActorFixture(pg);
  let origin = "";
  const server = createServer(async (req, res) => {
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    if (req.method === "GET" && req.url === "/") {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.end(html);
      return;
    }
    if (
      req.method !== "POST" ||
      req.headers.origin !== origin ||
      req.headers["sec-fetch-site"] === "cross-site" ||
      req.headers["content-type"] !== "application/json"
    ) {
      res.writeHead(403).end();
      return;
    }
    try {
      const token = Object.fromEntries(
        (req.headers.cookie ?? "")
          .split(";")
          .filter(Boolean)
          .map((c) => c.trim().split("=")),
      ).p2p_session;
      if (!token) {
        res.writeHead(401).end();
        return;
      }
      const chunks: Buffer[] = [];
      let size = 0;
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 32768) throw Error("Body limit");
        chunks.push(chunk);
      }
      const body = JSON.parse(Buffer.concat(chunks).toString());
      let result;
      switch (req.url) {
        case "/enroll/begin":
          result = await mfa.beginEnrollment(token, body.password);
          break;
        case "/enroll/finish":
          result = await mfa.finishEnrollment(
            token,
            body.challengeId,
            body.password,
            body.response,
          );
          break;
        case "/authenticate/begin":
          result = await mfa.beginAuthentication(token);
          break;
        case "/authenticate/finish":
          result = await mfa.finishAuthentication(
            token,
            body.challengeId,
            body.response,
          );
          break;
        default:
          res.writeHead(404).end();
          return;
      }
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(result));
    } catch {
      res.writeHead(403).end();
    }
  });
  await new Promise<void>((resolve) => server.listen(0, "localhost", resolve));
  const address = server.address();
  if (!address || typeof address === "string")
    throw Error("Local address required");
  origin = `http://localhost:${address.port}`;
  const mfa = createStaffWebAuthnFoundation(db, {
    rpId: "localhost",
    origin,
    rpName: "Hustlen' MFA acceptance",
  });
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox"],
  });
  try {
    const context = await browser.newContext();
    await context.addCookies([
      {
        name: "p2p_session",
        value: actor.token,
        url: origin,
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send("WebAuthn.enable");
    await cdp.send("WebAuthn.addVirtualAuthenticator", {
      options: {
        protocol: "ctap2",
        transport: "internal",
        hasResidentKey: true,
        hasUserVerification: true,
        isUserVerified: true,
        automaticPresenceSimulation: true,
      },
    });
    await page.goto(origin);
    await page.fill("#password", MFA_PASSWORD);
    await page.click("#enroll");
    await page.waitForFunction(
      () =>
        document.querySelector("#status")?.textContent === "Passkey enrolled",
    );
    await page.click("#verify");
    await page.waitForFunction(
      () =>
        document.querySelector("#status")?.textContent ===
        "Factor verified; staff access remains blocked",
    );
    await page.screenshot({
      path: path.join(
        process.env.MRT_TEST_ARTIFACT_DIR!,
        "mfa-native-webauthn.png",
      ),
      fullPage: true,
    });
    const evil = await fetch(origin + "/authenticate/begin", {
      method: "POST",
      headers: {
        origin: "https://evil.example",
        "content-type": "application/json",
        cookie: `p2p_session=${actor.token}`,
      },
      body: "{}",
    });
    assert.equal(evil.status, 403);
    const fake = await fetch(origin + "/authenticate/finish", {
      method: "POST",
      headers: {
        origin,
        "content-type": "application/json",
        cookie: `p2p_session=${actor.token}`,
      },
      body: JSON.stringify({
        mfaVerified: true,
        role: "ADMIN",
        challengeId: "fake",
        response: {},
      }),
    });
    assert.equal(fake.status, 403);
  } finally {
    await browser.close();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
}

# Unified product demo runbook

2 November 2026, Asia/Taipei. Use integration branch `integration/hustlen-product-consolidation-20261102` **after separately authorized transfer/publication**. This task does not publish it. Do not assume GitHub main/candidate contains this work; inspect checkout SHA/status. Preserve existing local edits/stashes. Do not reset, migrate, import or seed an existing application database.

Mandatory-QR correction: the isolated `fix/mandatory-rental-meetup-integration` candidate supersedes the optional-enrollment instruction below. It has not been published/merged/deployed by this task. See [the focused review](../meetup/mandatory-journey-20261102/REVIEW.md).

## Prerequisites

Node24, PostgreSQL17 with local CREATE/DROP DATABASE authority, installed Chromium, FFmpeg/ffprobe. `npm ci`, then `npx prisma generate --config prisma7.config.ts` generates the client without modifying DB records. Install Chromium explicitly with `npx playwright install chromium` if unavailable; use actual `MRT_BROWSER_PATH`/`CHROMIUM_PATH` only when selecting a system browser. No automatic infrastructure/container restart is required. Qwen scene additionally needs preexisting Ollama with genuine `qwen3.5:9b` at numerical loopback11434, suitable Mac memory, no tunnels/external model. This task does not download models.

Set a private original connection reference in `DATABASE_URL` and a **new nonexisting** `MRT_TEST_DATABASE_URL` (`hustlen_test_*`) on the approved local instance. Do not precreate the target; the existing launcher creates and marks it. Never reuse an existing test/application target. Credentials must not enter Git, screenshots or presentation slides. With private environment configured:

```sh
npm run demo:meetup:local
```

Every new booking now requires GPS/QR verification; there is no preview opt-in. The launcher supplies a fresh private meetup secret and explicit confirmation-window configuration. A separately started app without required verification configuration refuses booking creation rather than creating a QR-free booking. Old persisted bookings are never retrofitted. This existing launcher migrates/seeds only its new owned DB, starts the actual application at `http://localhost:3000`, and enables temporary test locations only for Alice/Bob. If port3000 is occupied, stop only your own prior demo; do not kill unrelated processes. Open two separate browser profiles/incognito contexts. Newly seeded synthetic accounts: `alice@example.test`, `bob@example.test`, password `LocalDev123!` (public demo-only values already in `prisma/seed.ts`, not real credentials). Seeded legacy “VERIFIED” is not real eKYC. Some seeded listings have no image; create an actual permitted photo listing rather than pretend an empty home is broken.

On the owner's Mac with existing container `p2p-postgres`, this optional private wrapper derives credentials without printing or writing them. Confirm the container is the intended local development instance first. It inspects configuration only; never starts/stops the container. Choose one existing launcher at a time:

```sh
# For the AI scene change only this name to demo:local-ai.
HUSTLEN_DEMO_SCRIPT=demo:meetup:local node <<'JS'
const {spawnSync}=require('node:child_process');
const {randomBytes}=require('node:crypto');
const allowed=new Set(['demo:meetup:local','demo:local-ai']);
const script=process.env.HUSTLEN_DEMO_SCRIPT;
if(!allowed.has(script)) throw Error('Choose an existing approved demo command.');
const result=spawnSync('docker',['inspect','p2p-postgres'],{encoding:'utf8'});
if(result.status!==0) throw Error('Local container unavailable; no changes made.');
const info=JSON.parse(result.stdout)[0], e=Object.fromEntries(info.Config.Env.map(s=>{const i=s.indexOf('=');return [s.slice(0,i),s.slice(i+1)];}));
const ports=info.NetworkSettings.Ports['5432/tcp'];
if(!ports?.[0]?.HostPort || !e.POSTGRES_USER || !e.POSTGRES_PASSWORD) throw Error('Private local configuration unavailable.');
const base=new URL('postgresql://127.0.0.1:'+ports[0].HostPort);
base.username=e.POSTGRES_USER; base.password=e.POSTGRES_PASSWORD;
base.pathname='/'+(e.POSTGRES_DB||e.POSTGRES_USER);
const target=new URL(base);target.pathname='/hustlen_test_demo_'+Date.now()+'_'+randomBytes(4).toString('hex');
const run=spawnSync('npm',['run',script],{stdio:'inherit',env:{...process.env,DATABASE_URL:base.toString(),MRT_TEST_DATABASE_URL:target.toString()}});
process.exit(run.status??1);
JS
```

Wrapper not executed against the owner's Mac here; it requires actual known container configuration. No placeholder username/password should be used literally. If missing, obtain local credentials privately rather than guessing or relaxing the DB guard.

## Guided team presentation

1. **Introducing Hustlen’.** Home/Browse; explain sharing physical items. Show actual eligible records, not invented ratings or photos. Shared illustrations are artwork, not inventory.
2. **Owner.** Alice signs in → List an item → upload your authorized item photo → condition/accessory description → price/deposit (USD) → owner station picker → publish. Current production publication requirements are unchanged; the development studio is not silently required.
3. **Borrower.** Bob in separate context → Browse/search/filter → listing → mutually suitable future dates → one owner-approved station → review quotation → submit request. Proposal ≠ acceptance. Note no payment is collected.
4. **Rental journey.** Alice accepts → both open the prominent mandatory verification panel; **no enrollment click**. Both obtain independent fresh GPS check-ins. Alice saves condition/checklist evidence and generates pickup QR. Bob scans with his authenticated device, records his own checklist/evidence and explicitly acknowledges physical receipt; only then IN_USE. For at-home rehearsal use the separately allowlisted temporary test centre, actual browser geolocation and both simulated-meetup acknowledgements; TEST_LOCATION is not verified MRT arrival. For return, obtain fresh RETURN check-ins (and a new bilateral TEST_LOCATION centre/consent if the pickup centre was cleaned up) **before** Bob submits return evidence. Bob generates return QR; Alice scans and explicitly acknowledges physical return. Inspection is a separate Alice decision, never automatically accepted by scanning. New bookings do not permit manual-code redemption; camera failure requires repair/assistance, not a QR waiver. Do not bypass GPS, camera, consent or evidence. Physical phone testing requires a trusted HTTPS context; ordinary LAN HTTP may deny camera/GPS. Virtual-camera evidence must be labelled as browser regression evidence, not genuine phone acceptance.
5. **Trust/Admin.** Report a separate listing or demonstrate a distinct dispute fixture; do not contaminate the successful completed rental. Existing `demo:chat -- init/start/info/down` can prepare its own isolated chat/reviewer/Admin fixtures using the same private new-target setup; its `info` output contains synthetic passwords and must remain private. Do not run `admin:create` against any real/default DB or activate staff. Use Admin screenshots/tests when no separately owned Admin fixture is running. A case report is not guilt, monetary settlement or automatic custody change.
6. **Qwen.** Stop the core demo with Ctrl+C, verify its own cleanup message, then choose `demo:local-ai` in the wrapper with a NEW target. It starts the restricted worker/native login and visible Companion browser and remains open. Choose Interactive Playground, Owner/en, enter a fictional rental question, then two follow-ups. Require actual LOCAL_OLLAMA_INFERENCE and visible advice/latency/source details; failures remain visible. No actual customer data, image inspection, private retrieval, money or custody action. This is an isolated experimental scene, not permission to attach the preceding real booking DB to Qwen. If unavailable show “local AI unavailable” and the clearly labelled mock screenshots; never present mock output as real Qwen.

## Stop/cleanup and acceptance

Ctrl+C stops only the launcher's processes and removes only its marked owned database/test data. Do not stop PostgreSQL or Ollama. Failed cleanup must be investigated by ownership marker before any manual action; never drop a similarly named DB by guess. Choose a new target on retry and keep failure evidence. `demo:chat` deliberately preserves between start/stop and requires its explicit guarded `down` after stopping its own server. Ignored artifacts may include synthetic auth/DB metadata: keep private, retain only as needed for review, do not upload indiscriminately.

The automated test run is evidence, not a completed owner/team rehearsal. Physical-device GPS/camera, Mac Qwen and product-owner visual acceptance remain separate tasks. Do not approve merge/production launch from this runbook alone. No Vision, payment, translation-provider, staff or production Support activation.

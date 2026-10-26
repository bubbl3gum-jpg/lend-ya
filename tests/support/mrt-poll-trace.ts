import type { BrowserContext } from "playwright";
/** Owned browser diagnostics only: bounded enum/counter metadata, no URL/body/header/identity collection. */
export async function mrtPollTrace(context: BrowserContext) {
  const events: object[] = [],
    started = Date.now();
  let phase = "SETUP";
  await context.exposeBinding("__ownedMrtTrace", (_source, event: unknown) => {
    if (events.length >= 180 || !event || typeof event !== "object") return;
    const e = event as Record<string, unknown>;
    const kind = e.kind;
    if (
      typeof kind !== "string" ||
      ![
        "document-ready",
        "pagehide",
        "timer-start",
        "timer-stop",
        "poll-start",
        "poll-end",
        "poll-aborted",
        "poll-failed",
      ].includes(kind)
    )
      return;
    const out: Record<string, string | number | boolean> = {
      ms: Date.now() - started,
      phase,
      kind,
    };
    for (const k of ["id", "status"])
      if (
        typeof e[k] === "number" &&
        Number.isInteger(e[k]) &&
        e[k] >= 0 &&
        e[k] < 10000
      )
        out[k] = e[k] as number;
    events.push(out);
  });
  await context.addInitScript({
    content: `(()=>{
  const emit=e=>{if(window.__ownedMrtTrace)void window.__ownedMrtTrace(e).catch(()=>{});};
  addEventListener("DOMContentLoaded",()=>emit({kind:"document-ready"}),{once:true});addEventListener("pagehide",()=>emit({kind:"pagehide"}),{once:true});
  let count=0;const timers=new Set(),interval=window.setInterval.bind(window),clear=window.clearInterval.bind(window),fetcher=window.fetch.bind(window);
  window.setInterval=(handler,timeout,...args)=>{const id=interval(handler,timeout,...args);if(timeout===3000){timers.add(id);emit({kind:"timer-start",id});}return id;};
  window.clearInterval=id=>{if(timers.delete(id))emit({kind:"timer-stop",id});clear(id);};
  window.fetch=async(input,init)=>{const u=new URL(typeof input==="string"?input:input instanceof URL?input.href:input.url,location.href);if(!/^\\/api\\/bookings\\/\\d+\\/meetup\\/status$/.test(u.pathname))return fetcher(input,init);
   const id=++count;emit({kind:"poll-start",id});try{const response=await fetcher(input,init);emit({kind:"poll-end",id,status:response.status});return response;}catch(e){emit({kind:e instanceof DOMException&&e.name==="AbortError"?"poll-aborted":"poll-failed",id});throw e;}
  };
 })()`,
  });
  return {
    mark(
      value:
        | "LOGOUT_BEGIN"
        | "LOGGED_OUT"
        | "WRONG_LOGIN"
        | "NEW_LOGIN"
        | "NAVIGATE_PUBLIC"
        | "COMPLETE",
    ) {
      phase = value;
      if (events.length < 180)
        events.push({ ms: Date.now() - started, phase, kind: "phase" });
    },
    events,
  };
}

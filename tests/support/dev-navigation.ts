import type { BrowserContext, Page, Request } from "@playwright/test";

/** Observe the previous transition before beginning another real UI action.
 * Streamed SSR links can precede hydration; development RSC/HMR refreshes can
 * otherwise supersede the next click. No navigation retries or HMR disabling.
 */
export function developmentNavigation() {
  const states = new WeakMap<Page, {pending:Set<Request>;changed:number;rebuilding:boolean}>();
  function observe(page:Page) {
    if(states.has(page))return;
    const state = {pending:new Set<Request>(),changed:Date.now(),rebuilding:false};
    states.set(page,state);
    page.on("request",request=>{
      const document=request.isNavigationRequest() && request.frame()===page.mainFrame();
      // A replacement document supersedes the previous document's RSC streams.
      // Dev reloads can abandon a stream without delivering a terminal event.
      if(document){state.pending.clear();state.rebuilding=false;}
      if(document || request.headers()["rsc"] === "1") {
        state.pending.add(request);state.changed=Date.now();
        if(request.isNavigationRequest())state.rebuilding=false;
      }
    });
    const finished=(request:Request)=>{if(state.pending.delete(request))state.changed=Date.now();};
    page.on("requestfinished",finished);page.on("requestfailed",finished);
    page.on("domcontentloaded",()=>{state.changed=Date.now();state.rebuilding=false;});
    page.on("load",()=>{state.changed=Date.now();});
    page.on("console",message=>{
      const text=message.text();
      if(text.startsWith("[Fast Refresh] rebuilding")){state.rebuilding=true;state.changed=Date.now();}
      if(text.startsWith("[Fast Refresh] done")){state.rebuilding=false;state.changed=Date.now();}
    });
  }
  return {
    observeContext(context:BrowserContext){context.pages().forEach(observe);context.on("page",observe);},
    async settle(page:Page){
      const state=states.get(page);if(!state)throw Error("Observe the browser context before navigation");
      const started=Date.now(),deadline=started+30000;
      while(Date.now()<deadline){
        if(page.isClosed())throw Error("Acceptance page closed during navigation");
        // A quiet window after actual transition activity, not a fixed sleep
        // replacing any UI, destination, response or persisted-state assertion.
        if(state.pending.size===0 && !state.rebuilding && Date.now()-Math.max(state.changed,started)>=500 &&
          await page.evaluate(()=>document.readyState === "complete").catch(()=>false))return;
        await new Promise(resolve=>setTimeout(resolve,50));
      }
      const pending=[...state.pending].map(request=>({path:new URL(request.url()).pathname,prefetch:request.headers()["next-router-prefetch"]??request.headers()["next-router-segment-prefetch"]??null,document:request.isNavigationRequest(),startTime:request.timing().startTime}));
      const readyState=await page.evaluate(()=>({state:document.readyState,timeOrigin:performance.timeOrigin})).catch(()=>"unavailable");
      throw Error("Development document/RSC navigation did not settle within 30 seconds: "+JSON.stringify({pending,rebuilding:state.rebuilding,readyState,path:new URL(page.url()).pathname}));
    },
  };
}

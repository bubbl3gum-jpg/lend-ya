"use client";
import {useEffect,useRef,useState} from "react";
import {visionErrorCodes} from "@/lib/vision-prototype/adapter-config";
import type {VisionExecution} from "@/lib/vision-prototype/execution-contract";
import type {HostedVisionExecution} from "@/lib/vision-prototype/gemini";
type Reply={state:string;selectedProvider:"GEMINI"|"OLLAMA";result:VisionExecution|HostedVisionExecution};
export function VisionReview({provider}:{provider:"GEMINI"|"OLLAMA"|null}){
 const [scenario,setScenario]=useState("INSUFFICIENT_EVIDENCE"),[status,setStatus]=useState("UNAVAILABLE"),[result,setResult]=useState<Reply|null>(null),[error,setError]=useState("");
 const seq=useRef(0),flight=useRef<AbortController|null>(null),pending=useRef(false);useEffect(()=>()=>{seq.current++;flight.current?.abort();},[]);
 async function run(){if(!provider||pending.current)return;const id=++seq.current,c=new AbortController();flight.current=c;pending.current=true;setStatus("PROCESSING");setError("");setResult(null);
 try{const response=await fetch("/api/dev/vision-prototype",{method:"POST",headers:{"Content-Type":"application/json","X-Hustlen-Vision":"1"},cache:"no-store",signal:c.signal,body:JSON.stringify({mode:"MOCK",scenario})}),data=await response.json();if(id!==seq.current||c.signal.aborted)return;if(!response.ok)throw Error(visionErrorCodes.includes(data.code)?data.code:"UNAVAILABLE");if(data.result?.provenance!=="MOCK_TEST_OUTPUT"||data.selectedProvider!==provider)throw Error("MODEL_IDENTITY");setResult(data);setStatus(data.state);
 }catch(e){if(id===seq.current&&!c.signal.aborted){setStatus("FAILED");setError(e instanceof Error&&visionErrorCodes.includes(e.message as typeof visionErrorCodes[number])?e.message:"UNAVAILABLE");}}
 finally{if(id===seq.current){pending.current=false;flight.current=null;}}}
 return <section className="companion-section" aria-label="Interactive Vision review"><h2>Paired-image review · English development demo</h2>
 <p>Selected server provider: <strong>{provider??"Not configured"}</strong>. One provider per run; no switching or fallback. Gemini 3.8 Flash remains an unverified model candidate.</p><p>No photographs supplied. These are schematics, and this control runs authored mock responses only. Live analysis is disabled until the exact model, authorized photographs, privacy, retention, resources, API charges and call limits are approved.</p>
 <label htmlFor="vision-scenario">Authored display scenario</label><select id="vision-scenario" className="catalogue-input" disabled={status==="PROCESSING"} value={scenario} onChange={e=>{seq.current++;flight.current?.abort();pending.current=false;setStatus("UNAVAILABLE");setResult(null);setError("");setScenario(e.target.value);}}><option value="INSUFFICIENT_EVIDENCE">Insufficient image coverage</option><option value="NOT_COMPARABLE">Non-comparable view</option><option value="POSSIBLE_DIFFERENCE">Comparison contract · mock only</option><option value="FAILURE">Malformed response · failure test</option></select>
 <button type="button" className="catalogue-button" disabled={!provider||status==="PROCESSING"} onClick={()=>void run()}>Run MOCK review test</button><button type="button" disabled>Live analysis blocked</button>
 {status==="PROCESSING"&&<button type="button" onClick={()=>{seq.current++;flight.current?.abort();pending.current=false;setStatus("UNAVAILABLE");setError("CANCELED");}}>Cancel this run</button>}
 <p role="status">State: {status}</p>{error&&<p role="alert">Analysis failed: {error}. No valid model observation is available. No automatic retry.</p>}
 {result&&<><p><strong>{result.result.provenance}</strong> · {result.result.latencyMs} ms · Human review: {result.result.humanReview}</p><p>Requested model: {"tag" in result.result.model?result.result.model.tag:result.result.model.requestedId}. Mock identity is not proof of model availability.</p>{result.result.observations.map((o,i)=><article key={i} className="border-t py-3"><h3>{o.kind} · checklist area {o.areaId}</h3><p>{o.text}</p><p><strong>Uncertainty:</strong> {o.uncertainty}</p><p>Sources: {o.refs.map(ref=><a className="mr-3 underline" key={ref} href={`#vision-${ref}`}>{ref}</a>)}</p><p>Advisory only. No causation, responsibility, compensation, custody, refund or dispute decision.</p></article>)}</>}
 </section>;
}

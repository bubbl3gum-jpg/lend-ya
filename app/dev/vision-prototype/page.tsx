import {VisionReview} from "@/components/vision-review";
import {visionProvider} from "@/lib/vision-prototype/provider";
import {notFound} from "next/navigation";
import Image from "next/image";
import {prototypeActor,fixture} from "@/lib/vision-prototype/server";
import {fixtureDigest,validateResult} from "@/lib/vision-prototype/contracts";
import {HeritageSurface} from "@/components/heritage/experience";
import {SiteHeader} from "@/components/site-header";
import {readAppearance} from "@/lib/heritage/appearance";
import {readLocale} from "@/lib/i18n/server";
export const dynamic="force-dynamic";
export default async function Page(){
 try{await prototypeActor();}catch{notFound();}
 let provider:"GEMINI"|"OLLAMA"|null=null;try{provider=visionProvider().provider;}catch{}
 const f=fixture(),locale=await readLocale(),zh=locale==="zh-TW";
 const mock=validateResult({version:"vision-observation-v1",fixtureDigest,provenance:"MOCK_TEST_OUTPUT",humanReview:"REQUIRED",observations:[{kind:"INSUFFICIENT_EVIDENCE",areaId:"body",refs:["P1","R1"],text:"UI test only: these authored schematics cannot establish item condition.",uncertainty:"No authorized photographs or human labels supplied. No model executed.",advisory:true}]},f);
 return <HeritageSurface initialTheme={await readAppearance()} initialLocale={locale}><SiteHeader catalogue/><main className="mx-auto max-w-6xl space-y-6 px-5 py-8">
 <header className="border-b pb-5"><p className="catalogue-eyebrow">Hustlen’ / Vision field notebook · controlled prototype</p><h1 className="text-3xl">{zh?"影像紀錄原型":"Vision documentation prototype"}</h1><p>{zh?"僅限自有開發環境。以下為原創示意圖，不是照片、租借證據或 AI 檢驗。":"Owned development only. Authored schematics, not photographs, rental evidence or an AI inspection."}</p></header>
 <section aria-label="Fixture provenance" className="space-y-3"><h2>{zh?"檢查區域與來源":"Checklist area and provenance"}</h2><p>{f.id} · {f.checklistId} v{f.checklistVersion} · body</p><p>{zh?"配對：僅示意圖版面相符；真實照片可比性未知。拍攝時間、人工標籤：未提供。":"Pairing: schematic layout matched only; photographic comparability unknown. Capture time and human ground truth: not supplied."}</p><details><summary>{zh?"檢視版本綁定":"Inspect version binding"}</summary><p className="break-all">{f.version} / {fixtureDigest}</p></details></section>
 <section className="grid gap-6 md:grid-cols-2" aria-label="Pickup and return comparison">{f.images.map(i=><article key={i.id} id={`vision-${i.id}`} className="min-w-0 border-t pt-4"><h2>{i.stage==="PICKUP"?(zh?"取件示意":"Pickup schematic"):(zh?"歸還示意":"Return schematic")} · {i.id}</h2><p>{zh?"分析衍生圖（縮放）":"Analysis derivative (resized)"}</p><Image unoptimized src={`/api/dev/vision-fixtures?id=${i.id}&variant=derived`} alt={`${i.stage} ${i.id}: authored camera schematic, not a photograph`} width={480} height={330} className="h-auto w-full"/>
 <details><summary>{zh?"比較儲存母檔與衍生檔":"Compare stored parent and derivative"}</summary><p>{zh?"母檔是儲存的示意圖，不是相機原始檔。":"Parent is a stored schematic, not a camera-original file."}</p><Image unoptimized src={`/api/dev/vision-fixtures?id=${i.id}&variant=parent`} alt={`${i.id} stored parent schematic`} width={640} height={440} className="h-auto w-full"/><dl className="break-all"><dt>Parent ID / SHA-256</dt><dd>{i.parent.id} / {i.parent.sha256}</dd><dt>Derivative SHA-256 / transform</dt><dd>{i.derivative.sha256} / RESIZE 480×330</dd></dl></details></article>)}</section>
 <VisionReview provider={provider}/>
 <section aria-label="Vision availability" className="border-y py-5"><h2>{zh?"Vision 服務：無法使用":"Vision provider: UNAVAILABLE"}</h2><p>{zh?"未執行任何模型。無觀察結果；需要人工審閱。未連接客服 AI 或任何預約。":"No model executed. No model observations; human review required. No connection to Customer Service AI or bookings."}</p>
 <details><summary>{zh?"顯示模擬／測試面板（非模型輸出）":"Show MOCK/TEST panel (not model output)"}</summary><p>{mock.provenance} · {mock.humanReview}</p>{mock.observations.map((o,n)=><p key={n}>{o.kind} [{o.refs.join(", ")}]: {zh?"僅測試介面：示意圖不能證明物品狀況。未提供授權照片或人工標籤，亦未執行模型。":`${o.text} ${o.uncertainty}`}</p>)}</details></section>
 </main></HeritageSurface>;
}

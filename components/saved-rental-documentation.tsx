"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {useLocale} from "@/components/i18n/locale";
import {studioText} from "@/lib/i18n/studio";
import {formatTime} from "@/lib/i18n/core";
import type {DraftData} from "@/lib/item-studio/contracts";
type Saved={ownerConfirmed:{id:string;revision:number;confirmedAt:string;data:DraftData}[]};
export function SavedRentalDocumentation({bookingId}:{bookingId:number}){
 const {locale}=useLocale(),t=studioText(locale),[saved,setSaved]=useState<Saved|null>(null),[failed,setFailed]=useState(false);
 useEffect(()=>{const c=new AbortController();fetch(`/api/dev/item-studio?kind=booking&id=${bookingId}`,{cache:"no-store",signal:c.signal}).then(async r=>{if(!r.ok)throw Error("UNAVAILABLE");const v=await r.json();if(!c.signal.aborted)setSaved(v);}).catch(()=>{if(!c.signal.aborted)setFailed(true);});return()=>c.abort();},[bookingId]);
 return <section className="companion-section" lang={locale}><h3>{t.ownerConfirmed}</h3>{failed?<p>{t.error}</p>:saved?.ownerConfirmed.length?<><p>{t.revision} {saved.ownerConfirmed[0].revision} · {formatTime(locale,saved.ownerConfirmed[0].confirmedAt)}</p><p>{saved.ownerConfirmed[0].data.condition}</p><p>{saved.ownerConfirmed[0].data.defects}</p><p>{saved.ownerConfirmed[0].data.accessoryStatement==="NONE"?t.noneIncluded:saved.ownerConfirmed[0].data.accessoryStatement==="DECLARED"?t.declaredItems:t.statementUnknown}</p><ul>{saved.ownerConfirmed[0].data.accessories.map((a,i)=><li key={i}>{a.name} · {a.quantity} · {t[a.declaration]} · {t[a.visibility]}</li>)}</ul></>:<p>{t.unknownSource}</p>}<h3>{t.agreed}</h3><p>{t.pickup}</p><Link href="/dev/item-studio">{t.title}</Link></section>;
}

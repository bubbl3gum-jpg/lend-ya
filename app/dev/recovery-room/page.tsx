import {notFound,redirect} from "next/navigation";
import {roomGate} from "@/lib/recovery-room/service";
import {getCurrentUser} from "@/lib/auth";
import {HeritageSurface} from "@/components/heritage/experience";
import {SiteHeader} from "@/components/site-header";
import {RecoveryRoomWorkspace} from "@/components/recovery-room-workspace";
import {readAppearance} from "@/lib/heritage/appearance";
import {readLocale} from "@/lib/i18n/server";
export const dynamic="force-dynamic";
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){try{await roomGate();}catch{notFound();}if(!await getCurrentUser())redirect("/login");const q=await searchParams;if(Object.keys(q).length!==1||typeof q.bookingId!=="string"||!(/^[1-9]\d{0,9}$/.test(q.bookingId))||Number(q.bookingId)>2147483647)notFound();return <HeritageSurface initialTheme={await readAppearance()} initialLocale={await readLocale()}><SiteHeader catalogue/><RecoveryRoomWorkspace key={q.bookingId} bookingId={Number(q.bookingId)}/></HeritageSurface>;}

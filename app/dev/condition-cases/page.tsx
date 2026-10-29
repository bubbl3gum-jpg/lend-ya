import {roomsEnabled} from "@/lib/recovery-room/service";
import {notFound,redirect} from "next/navigation";
import {claimsEnabled,claimGate} from "@/lib/condition-claims/service";
import {getCurrentUser} from "@/lib/auth";
import {HeritageSurface} from "@/components/heritage/experience";
import {SiteHeader} from "@/components/site-header";
import {ConditionCaseInbox} from "@/components/condition-case-workspace";
import {readAppearance} from "@/lib/heritage/appearance";
import {readLocale} from "@/lib/i18n/server";
export const dynamic="force-dynamic";
export default async function Page(){if(!claimsEnabled())notFound();try{await claimGate();}catch{notFound();}if(!await getCurrentUser())redirect("/login");return <HeritageSurface initialTheme={await readAppearance()} initialLocale={await readLocale()}><SiteHeader catalogue/><ConditionCaseInbox recoveryAvailable={roomsEnabled()}/></HeritageSurface>;}

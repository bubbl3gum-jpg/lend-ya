import { notFound, redirect } from "next/navigation";
import { companionActor, companionEnabled } from "@/lib/assistant/server";
import { HeritageSurface } from "@/components/heritage/experience";
import { SiteHeader } from "@/components/site-header";
import { SupportCompanion } from "@/components/support-companion";
import { readAppearance } from "@/lib/heritage/appearance";
import { readLocale } from "@/lib/i18n/server";
export const dynamic="force-dynamic";
export default async function Page(){
 if(!companionEnabled())notFound();
 try{await companionActor();}catch(e){if(e instanceof Error&&"status" in e&&e.status===401)redirect("/login");notFound();}
 return <HeritageSurface initialTheme={await readAppearance()} initialLocale={await readLocale()}><SiteHeader catalogue/><SupportCompanion/></HeritageSurface>;
}

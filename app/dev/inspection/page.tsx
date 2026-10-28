import {notFound,redirect} from "next/navigation";
import {inspectionActor,InspectionDenied,inspectionEnabled} from "@/lib/inspection/service";
import {HeritageSurface} from "@/components/heritage/experience";
import {SiteHeader} from "@/components/site-header";
import {InspectionWorkspace} from "@/components/inspection-workspace";
import {readAppearance} from "@/lib/heritage/appearance";
import {readLocale} from "@/lib/i18n/server";
export const dynamic="force-dynamic";
export default async function Page(){if(!inspectionEnabled())notFound();try{await inspectionActor();}catch(e){if(e instanceof InspectionDenied&&e.status===401)redirect("/login");notFound();}return <HeritageSurface initialTheme={await readAppearance()} initialLocale={await readLocale()}><SiteHeader catalogue/><InspectionWorkspace/></HeritageSurface>;}

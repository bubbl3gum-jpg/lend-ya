import {studioEnabled} from "@/lib/item-studio/service";
import {notFound} from "next/navigation";
import {documentationActor} from "@/lib/item-documentation/service";
import {HeritageSurface} from "@/components/heritage/experience";
import {SiteHeader} from "@/components/site-header";
import {readLocale} from "@/lib/i18n/server";
import {readAppearance} from "@/lib/heritage/appearance";
import {DocumentationWorkspace} from "@/components/documentation-workspace";
export const dynamic="force-dynamic";
export default async function Page(){try{await documentationActor();}catch{notFound();}return <HeritageSurface initialTheme={await readAppearance()} initialLocale={await readLocale()}><SiteHeader catalogue/><DocumentationWorkspace studioAvailable={studioEnabled()}/></HeritageSurface>;}

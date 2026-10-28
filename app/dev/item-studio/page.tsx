import {agreementEnabled} from "@/lib/rental-documentation/service";
import {notFound} from "next/navigation";
import {studioActor} from "@/lib/item-studio/service";
import {HeritageSurface} from "@/components/heritage/experience";
import {SiteHeader} from "@/components/site-header";
import {readLocale} from "@/lib/i18n/server";
import {readAppearance} from "@/lib/heritage/appearance";
import {ItemStudio} from "@/components/item-studio";
export const dynamic="force-dynamic";
export default async function Page(){try{await studioActor();}catch{notFound();}return <HeritageSurface initialTheme={await readAppearance()} initialLocale={await readLocale()}><SiteHeader catalogue/><ItemStudio agreementAvailable={agreementEnabled()}/></HeritageSurface>;}

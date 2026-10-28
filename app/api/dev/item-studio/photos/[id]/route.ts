import {studioPhoto} from "@/lib/item-studio/service";
export const dynamic="force-dynamic";
export async function GET(_r:Request,{params}:{params:Promise<{id:string}>}){return studioPhoto((await params).id);}

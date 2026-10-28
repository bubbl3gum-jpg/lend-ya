import {reviewPhoto} from "@/lib/rental-documentation/service";
export const dynamic="force-dynamic";
export async function GET(r:Request,{params}:{params:Promise<{id:string}>}){return reviewPhoto(r,(await params).id);}

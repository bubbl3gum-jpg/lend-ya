import {designationApi} from "@/lib/rental-documentation/service";
export const dynamic="force-dynamic";
export async function GET(r:Request){return designationApi(r);}
export async function POST(r:Request){return designationApi(r);}

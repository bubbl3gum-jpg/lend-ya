import {prototypeActor,fixtureBytes} from "@/lib/vision-prototype/server";
export const dynamic="force-dynamic";
const headers={"Cache-Control":"private, no-store",Vary:"Cookie","X-Content-Type-Options":"nosniff","Cross-Origin-Resource-Policy":"same-origin","Content-Security-Policy":"default-src 'none'; sandbox"};
export async function GET(request:Request){try{
 const a=await prototypeActor(),url=new URL(request.url),q=url.searchParams;
 if(request.headers.get("host")!==new URL(a.config.origin).host||(request.headers.get("origin")!==null&&request.headers.get("origin")!==a.config.origin)||request.headers.get("sec-fetch-site")==="cross-site")throw Error("DENIED");
 if(q.size!==2||q.getAll("id").length!==1||q.getAll("variant").length!==1)throw Error("SELECTOR");
 const b=await fixtureBytes(q.get("id")!,q.get("variant")!);await prototypeActor();return new Response(new Uint8Array(b),{headers:{...headers,"Content-Type":"image/png"}});
 }catch{return Response.json({code:"UNAVAILABLE"},{status:404,headers});}}
export async function POST(){return Response.json({code:"UNAVAILABLE"},{status:404,headers});}

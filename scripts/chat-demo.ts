/** Local-only, owned disposable chat demo. Never adopts an existing database. */
import "dotenv/config";
import { Client } from "pg";
import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { mkdir, readFile, writeFile, unlink, open, rm } from "node:fs/promises";
import path from "node:path";
import net from "node:net";
import { randomBytes } from "node:crypto";
import sharp from "sharp";
import { assertOwnedDatabase, testDatabaseUrl, testRunId } from "../tests/support/test-database";
type State={url:string;runId:string;port:number;users:{id:number;email:string;role:string}[];password:string;listingId?:number};
const directory=path.resolve(".test-artifacts/chat-demo"),filename=path.join(directory,"state.json");
class DemoError extends Error {}
const serverLock=path.join(directory,"server.lock");
let ownsServerLock=false;
let child:ChildProcess|undefined;
async function stop(){if(child&&child.exitCode===null&&child.signalCode===null){const done=once(child,"exit");child.kill("SIGTERM");const timer=setTimeout(()=>child?.kill("SIGKILL"),5000);await done;clearTimeout(timer);}if(ownsServerLock){ownsServerLock=false;await unlink(serverLock).catch(e=>{if(e.code!=="ENOENT")throw e;});}}
async function owned(state:State){if(!/^[a-f0-9]{24}$/.test(state.runId))throw new DemoError("Invalid ownership state.");const url=testDatabaseUrl(state.url,process.env.DATABASE_URL);const c=new Client({connectionString:url.toString()});await c.connect();try{await assertOwnedDatabase(c,url,state.runId);return c;}catch(e){await c.end();throw e;}}
async function save(s:State){await writeFile(filename,JSON.stringify(s,null,2),{mode:0o600});}
async function server(s:State){
  try{const lock=await open(serverLock,'wx',0o600);await lock.writeFile(JSON.stringify({pid:process.pid,runId:s.runId}));await lock.close();ownsServerLock=true;}catch(e){if((e as NodeJS.ErrnoException).code==='EEXIST')throw new DemoError('Demo server lock exists. Stop its process first; inspect stale locks manually.');throw e;}
  const artifact=path.resolve('.test-artifacts',s.runId);await mkdir(artifact,{recursive:true});await rm(path.join(artifact,'next'),{recursive:true,force:true});
  await writeFile(path.join(artifact,'tsconfig.json'),JSON.stringify({extends:'../../tsconfig.json',include:['../../next-env.d.ts','../../app/**/*.ts','../../app/**/*.tsx','../../components/**/*.tsx','../../lib/**/*.ts'],exclude:['../../node_modules']}));
  const probe=net.createServer();await new Promise<void>((resolve,reject)=>{probe.once('error',reject);probe.listen(s.port,'localhost',resolve);});await new Promise<void>((resolve,reject)=>probe.close(e=>e?reject(e):resolve()));
  const log=await open(path.join(directory,'server.log'),'w',0o600);
  child=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--webpack','--hostname','localhost','--port',String(s.port)],{env:{...process.env,NODE_ENV:'development',DATABASE_URL:s.url,MRT_TEST_RUN_ID:s.runId,CHAT_ENABLED:'false',CHAT_PREVIEW_USER_IDS:s.users.filter(u=>u.role==='USER').map(u=>u.id).join(',')},stdio:['ignore',log.fd,log.fd]});await log.close();
  child.on('error',()=>{});
  for(let i=0;i<150;i++){if(child.exitCode!==null)throw new DemoError('Demo server stopped. Inspect ignored server.log.');try{if(/Ready in/.test(await readFile(path.join(directory,"server.log"),"utf8"))&&(await fetch(`http://localhost:${s.port}/api/auth/me`)).status===401){
    const base=`http://localhost:${s.port}`;
    for(const page of ['/login','/messages','/messages/1','/admin/chat','/admin/chat/1'])await fetch(base+page);
    for(const route of ['/api/admin/chat/cases/1/claim','/api/admin/chat/cases/1/decision']){const response=await fetch(base+route,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});if(response.status!==401)throw new DemoError('Demo moderator route failed unauthenticated readiness check.');}
    return;
  }}catch{}await new Promise(r=>setTimeout(r,200));}throw new DemoError('Demo server failed readiness.');
}
async function run(s:State,args:string[]){const p=spawn(process.execPath,args,{env:{...process.env,DATABASE_URL:s.url,MRT_TEST_DATABASE_URL:s.url,MRT_TEST_RUN_ID:s.runId},stdio:'inherit'});const [code]=await once(p,'exit');if(code!==0)throw new DemoError('Demo preparation command failed.');}
async function main(){
 if(process.env.NODE_ENV==='production')throw new DemoError('Local demo refuses production.');
 const command=process.argv[2];await mkdir(directory,{recursive:true});
 if(command==='init'){
  const lock=await open(path.join(directory,'init.lock'),'wx',0o600);await lock.close();
  try{
   try{await readFile(filename);throw new DemoError('Demo state already exists. Use start or down; never overwrite/adopt it.');}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
   const url=testDatabaseUrl(process.env.MRT_TEST_DATABASE_URL,process.env.DATABASE_URL),runId=testRunId();
   const port=Number(process.env.CHAT_DEMO_PORT??'3100');if(!Number.isInteger(port)||port<1024||port>65535)throw new DemoError('Invalid local demo port.');
   const adminUrl=new URL(url);adminUrl.pathname='/postgres';adminUrl.searchParams.delete('schema');const admin=new Client({connectionString:adminUrl.toString()});await admin.connect();
   const s:State={url:url.toString(),runId,port,users:[],password:`Demo-${randomBytes(9).toString('hex')}!`};
   try{await admin.query(`CREATE DATABASE "${url.pathname.slice(1)}"`);await admin.query(`COMMENT ON DATABASE "${url.pathname.slice(1)}" IS 'hustlen-mrt-test:${runId}'`);await save(s);}finally{await admin.end();}
   await run(s,['node_modules/prisma/build/index.js','migrate','deploy','--config','prisma7.config.ts']);await run(s,['node_modules/tsx/dist/cli.mjs','scripts/import-mrt.ts']);
   await server(s);
   const base=`http://localhost:${port}`;
   async function api(route:string,body:object|FormData,cookie=''){const r=await fetch(base+route,{method:'POST',headers:{Cookie:cookie,...(body instanceof FormData?{}:{'Content-Type':'application/json'})},body:body instanceof FormData?body:JSON.stringify(body)});if(!r.ok)throw new DemoError(`Fixture API failed: ${route} (${r.status})`);return {data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]??''};}
   let ownerCookie='';
   for(const name of ['owner','borrower','reviewer','appeal']){const email=`${name}@chat-demo.example.test`;const r=await api('/api/auth/register',{name:`Demo ${name}`,email,password:s.password});s.users.push({id:r.data.user.id,email,role:['reviewer','appeal'].includes(name)?'ADMIN':'USER'});if(name==='owner')ownerCookie=r.cookie;await save(s);}
   const db=await owned(s);try{
    await db.query("BEGIN");
    for(const u of s.users.filter(u=>u.role==='ADMIN')){await db.query('UPDATE "User" SET role=\'ADMIN\' WHERE id=$1',[u.id]);await db.query('INSERT INTO "ChatReviewer" ("userId") VALUES ($1)',[u.id]);await db.query('INSERT INTO "AdminAuditLog" ("adminId",action,"targetType","targetId",reason,"previousState","newState") VALUES ($1,\'CHAT_REVIEWER_GRANT\',\'USER\',$1,\'Explicit isolated demo provisioning\',\'{}\',\'{"chatReviewer":true}\')',[u.id]);}
    await db.query("COMMIT");
    const station=(await db.query('SELECT id FROM "MrtStation" WHERE code=\'TPE\'')).rows[0].id;
    const photo=await sharp({create:{width:240,height:180,channels:3,background:'#435f85'}}).png().toBuffer();const form=new FormData();for(const [k,v]of Object.entries({title:'Isolated demo camera',description:'Disposable chat acceptance fixture. No real rental.',category:'Cameras',condition:'Good',price:'10',stationIds:JSON.stringify([station])}))form.set(k,v);form.append('photos',new File([new Uint8Array(photo)],'camera.png',{type:'image/png'}));
    s.listingId=(await api('/api/listings',form,ownerCookie)).data.listing.id;await save(s);
   }finally{await db.end();}
   await stop();console.log('Demo prepared. Run npm run demo:chat -- start. Credentials: npm run demo:chat -- info.');
  }finally{await stop();await unlink(path.join(directory,'init.lock'));}
 }else{
  if(command==='start'||command==='down'){
   for(const name of ['server.lock','init.lock']){try{await readFile(path.join(directory,name));throw new DemoError(`Demo ${name} exists. Stop its owning process before start/teardown. Inspect stale locks manually.`);}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}}
  }
  const s:State=JSON.parse(await readFile(filename,'utf8'));const db=await owned(s);
  if(command==='down'){
   try{const sessions=await db.query('SELECT count(*)::int n FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid()');if(sessions.rows[0].n)throw new DemoError('Stop demo server and browser-test connections before teardown. No sessions will be terminated.');const media=await db.query('SELECT url FROM "ListingMedia"');for(const row of media.rows){const name=String(row.url).split('/').at(-1)!;if(/^[a-f0-9-]{36}\.(png|jpg|webp|webm|mp4)$/.test(name))await unlink(path.resolve('storage/listings',name)).catch(e=>{if(e.code!=='ENOENT')throw e;});}}finally{await db.end();}
   const u=testDatabaseUrl(s.url),adminUrl=new URL(u);adminUrl.pathname='/postgres';adminUrl.searchParams.delete('schema');const admin=new Client({connectionString:adminUrl.toString()});await admin.connect();try{await admin.query(`DROP DATABASE "${u.pathname.slice(1)}"`);}finally{await admin.end();}await unlink(filename);console.log('Owned disposable demo database removed. Ignored evidence/screenshots retained.');
  }else{await db.end();if(command==='start'){await server(s);console.log(`Local-only demo listening on port ${s.port}. Ctrl-C stops server and preserves fixtures. Public chat is disabled; only two fixture users have preview access.`);await once(child!,'exit');}else if(command==='info'){console.log(JSON.stringify({port:s.port,listingId:s.listingId,users:s.users,password:s.password},null,2));}else throw new DemoError('Use init, start, info or down.');}
 }
}
process.on('SIGINT',()=>void stop());process.on('SIGTERM',()=>void stop());
main().catch(e=>{console.error(e instanceof DemoError?e.message:'Demo command refused/failed. Check ownership, unused test database name, port, state and ignored server log. No existing database is adopted.');process.exitCode=1;}).finally(()=>stop());

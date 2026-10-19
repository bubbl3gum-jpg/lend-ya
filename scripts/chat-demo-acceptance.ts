/** Browser-driven execution of the documented manual demo, using synthetic local fixtures only. */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { chromium, expect as baseExpect, type Page } from "@playwright/test";
import { Client } from "pg";
import { assertOwnedDatabase, testDatabaseUrl } from "../tests/support/test-database";
const expect=baseExpect.configure({timeout:20000});
async function main(){
 const s=JSON.parse(await readFile('.test-artifacts/chat-demo/state.json','utf8'));
 const lock=JSON.parse(await readFile('.test-artifacts/chat-demo/server.lock','utf8'));
 if(lock.runId!==s.runId||!Number.isSafeInteger(lock.pid)||lock.pid<1)throw Error('Start the owned local demo before browser acceptance.');process.kill(lock.pid,0);
 const url=testDatabaseUrl(s.url);const db=new Client({connectionString:url.toString()});await db.connect();try{await assertOwnedDatabase(db,url,s.runId);}finally{await db.end();}
 const browser=await chromium.launch({headless:!process.argv.includes('--headed'),executablePath:process.env.MRT_BROWSER_PATH??'/usr/bin/chromium'});
 const base=`http://localhost:${s.port}`,tag=randomUUID().slice(0,8),dir='.test-artifacts/chat-demo/screenshots';await mkdir(dir,{recursive:true});
 const results:{step:string;outcome:string}[]=[];
 const shot=async(p:Page,name:string)=>p.screenshot({path:`${dir}/${name}.png`,fullPage:true});
 try{
  const contexts=await Promise.all(s.users.map(()=>browser.newContext({viewport:{width:1280,height:1000}})));
  const pages=await Promise.all(contexts.map(c=>c.newPage()));
  for(let n=0;n<pages.length;n++){const p=pages[n];await p.goto(base+'/login');await p.waitForLoadState('networkidle');await p.getByLabel('Email address',{exact:true}).fill(s.users[n].email);await p.getByLabel('Password',{exact:true}).fill(s.password);await p.getByRole('button',{name:'Log in',exact:true}).click();await expect(p).not.toHaveURL(/\/login$/);}
  const [owner,borrower,reviewer,appeal]=pages;
  expect((await reviewer.request.get(base+"/api/conversations")).status()).toBe(503);
  if(process.argv.includes('--verify-restart')){
   const previous=JSON.parse(await readFile('.test-artifacts/chat-demo/acceptance.json','utf8'));
   await borrower.goto(`${base}/messages/${previous.conversationId}`);await expect(borrower.getByText(previous.releasedBody,{exact:true})).toBeVisible({timeout:15000});await shot(borrower,'06-restart-persistence');console.log('PASS: fresh browser login after server restart recovered released message.');return;
  }
  await borrower.goto(`${base}/listings/${s.listingId}`);await borrower.getByRole('button',{name:'Chat with Owner',exact:true}).click();await expect(borrower).toHaveURL(/\/messages\/\d+$/);const conversationId=Number(new URL(borrower.url()).pathname.split('/').at(-1));await owner.goto(`${base}/messages/${conversationId}`);
  const send=async(p:Page,body:string)=>{await expect(p.getByRole('button',{name:'Send message',exact:true})).toBeEnabled();await p.getByLabel('Message',{exact:true}).fill(body);await p.getByRole('button',{name:'Send message',exact:true}).click();await expect(p.getByLabel('Message',{exact:true})).toHaveValue('');await expect(p.getByText(body,{exact:true})).toBeVisible({timeout:20000});};
  await send(borrower,`Is the camera available before I book? ${tag}`);const reply=`Yes, please choose an MRT station when booking. ${tag}`;await send(owner,reply);await expect(borrower.getByText(reply,{exact:true})).toBeVisible({timeout:15000});await expect(borrower.getByText('Unread',{exact:true}).first()).toBeVisible({timeout:20000});await borrower.getByRole('button',{name:'Mark loaded messages read'}).click();await expect(owner.getByRole('listitem').filter({has:owner.getByText(reply,{exact:true})}).getByText('Read',{exact:true})).toBeVisible({timeout:15000});results.push({step:'Pre-booking conversation, reply, polling, unread and read indicators',outcome:'PASS'});await shot(borrower,'01-conversation');
  for(const body of ['How do I report scams and illegal goods?','請問如何檢舉毒品與性交易？','Bagaimana melaporkan narkoba dan penipuan?']){await send(owner,`${body} ${tag}`);await expect(borrower.getByText(`${body} ${tag}`,{exact:true})).toBeVisible({timeout:15000});}
  results.push({step:'Harmless English, Traditional Chinese and Indonesian discussion',outcome:'ALLOWED and delivered'});
  for(const body of ['I offer paid sex','提供性交易服務','menjual jasa seks']){await send(owner,`${body} ${tag}`);await expect(borrower.getByText(`${body} ${tag}`,{exact:true})).toHaveCount(0);}
  const falsePositive=`I will kill you with kindness ${tag}`,falseNegative=`selling c0caine ${tag}`;await send(owner,falsePositive);await expect(borrower.getByText(falsePositive,{exact:true})).toBeVisible({timeout:15000});await send(owner,falseNegative);await expect(borrower.getByText(falseNegative,{exact:true})).toHaveCount(0);
  results.push({step:'Explicit solicitations in three languages',outcome:'HELD; recipient did not receive them'},{step:'Fixed false positive',outcome:'Idiom "I will kill you with kindness" is ALLOWED'},{step:'Fixed false negative',outcome:'Obfuscated "selling c0caine" is HELD'});await shot(owner,'02-held-messages');
  await borrower.getByRole('listitem').filter({has:borrower.getByText(reply,{exact:true})}).getByRole('button',{name:/Report message/}).click();await borrower.getByLabel('Report reason').fill('Synthetic demo report for reviewer acceptance');await borrower.getByRole('button',{name:'Submit message report'}).click();await expect(borrower.getByText(/Report saved as case/)).toBeVisible({timeout:20000});
  await borrower.getByRole('button',{name:'Block contact',exact:true}).click();await expect(borrower.getByRole('button',{name:'Unblock contact',exact:true})).toBeVisible({timeout:20000});await expect(owner.getByLabel('Message',{exact:true})).toBeDisabled({timeout:15000});await shot(borrower,'03-blocked-contact');await borrower.getByRole('button',{name:'Unblock contact',exact:true}).click();await expect(owner.getByLabel('Message',{exact:true})).toBeEnabled({timeout:15000});results.push({step:'Report and bidirectional free-text blocking/unblocking',outcome:'PASS; history and rental controls remain'});
  // Select the system case for the Indonesian held solicitation through the review UI.
  const cases=await (await owner.request.get(base+'/api/chat/cases')).json();const target=cases.cases.filter((c:{kind:string})=>c.kind==='SYSTEM').sort((a:{id:number},b:{id:number})=>b.id-a.id)[1];
  await reviewer.goto(base+'/admin/chat');await shot(reviewer,'04-moderation-queue');await reviewer.getByRole('button',{name:`Claim case #${target.id}`,exact:true}).click();await expect(reviewer.getByText(`menjual jasa seks ${tag}`,{exact:true})).toBeVisible({timeout:20000});await reviewer.getByLabel('Decision',{exact:true}).selectOption('REJECT');await reviewer.getByLabel('Classification',{exact:true}).selectOption('PROHIBITED_SOLICITATION');await reviewer.getByLabel('Decision explanation').fill('Synthetic acceptance case: prohibited solicitation. No account penalty.');await reviewer.getByRole('button',{name:'Save moderation decision'}).click();await expect(reviewer.getByText(/Decision: REJECT/)).toBeVisible({timeout:20000});await shot(reviewer,'05-scoped-decision');
  await owner.goto(base+'/messages');await owner.getByLabel('Appeal explanation (visible to the assigned reviewer)').fill('Synthetic acceptance appeal: please independently review this fixture.');await owner.getByRole('button',{name:`Appeal or request correction of case #${target.id}`,exact:true}).click();await expect(owner.getByText(/Appeal recorded as case/)).toBeVisible({timeout:20000});const own=await (await owner.request.get(base+'/api/chat/cases')).json();const appealId=own.cases.find((c:{parentId:number})=>c.parentId===target.id).id;
  const denied=await reviewer.request.post(`${base}/api/admin/chat/cases/${appealId}/claim`,{data:{}});expect(denied.status()).toBe(403);
  await appeal.goto(base+'/admin/chat');await appeal.getByRole('button',{name:`Claim case #${appealId}`,exact:true}).click();await appeal.getByLabel('Decision',{exact:true}).selectOption('RELEASE');await appeal.getByLabel('Decision explanation').fill('Synthetic acceptance reversal tests delivery and audit persistence; not a production policy decision.');await appeal.getByRole('button',{name:'Save moderation decision'}).click();await expect(appeal.getByText(/Decision: RELEASE/)).toBeVisible({timeout:20000});await shot(appeal,'05b-independent-appeal');
  const releasedBody=`menjual jasa seks ${tag}`;await expect(borrower.getByText(releasedBody,{exact:true})).toBeVisible({timeout:15000});results.push({step:'Scoped claim, rejection, user appeal, original reviewer denied, independent release',outcome:'PASS; synthetic reversal only'});
  await writeFile('.test-artifacts/chat-demo/acceptance.json',JSON.stringify({conversationId,releasedBody,results},null,2),{mode:0o600});console.log(JSON.stringify(results,null,2));
 }finally{await browser.close();}
}
main().catch(e=>{console.error(e instanceof Error?e.message:'Browser demo acceptance failed');process.exitCode=1;});

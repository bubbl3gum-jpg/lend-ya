import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
test("demo CLI refuses protected/remote/shared targets and never overwrites retained state",()=>{
 const cwd=mkdtempSync(path.join(os.tmpdir(),"chat-demo-safety-"));
 const script=path.resolve("scripts/chat-demo.ts"),tsx=path.resolve("node_modules/tsx/dist/cli.mjs");
 const folder=path.join(cwd,".test-artifacts/chat-demo"),state=path.join(folder,"state.json");
 const run=(command:string,url:string,development="postgresql://test@localhost:1/development")=>spawnSync(process.execPath,[tsx,script,command],{cwd,env:{...process.env,NODE_ENV:"development",MRT_TEST_DATABASE_URL:url,DATABASE_URL:development},encoding:"utf8",timeout:15000});
 try{
  for(const url of ["postgresql://test@localhost:1/p2p_marketplace","postgresql://test@remote.invalid:1/hustlen_test_demo","postgresql://test@localhost:1/hustlen_test_demo%22bad"]){const r=run("init",url);assert.equal(r.status,1);assert.equal(existsSync(state),false);}
  const shared="postgresql://test@localhost:1/hustlen_test_shared";assert.equal(run("init",shared,shared).status,1);assert.equal(existsSync(state),false);
  mkdirSync(folder,{recursive:true});const sentinel='{"url":"postgresql://test@localhost:1/p2p_marketplace","runId":"invalid","unchanged":true}';writeFileSync(state,sentinel);
  for(const command of ["init","start","down"]){assert.equal(run(command,"postgresql://test@localhost:1/hustlen_test_unused").status,1);assert.equal(readFileSync(state,"utf8"),sentinel);}
  const acceptance=spawnSync(process.execPath,[tsx,path.resolve("scripts/chat-demo-acceptance.ts")],{cwd,env:process.env,encoding:"utf8",timeout:15000});assert.equal(acceptance.status,1);assert.match(acceptance.stderr,/server.lock/);
  writeFileSync(path.join(folder,"server.lock"),JSON.stringify({pid:123,runId:"fixture"}));
  for(const command of ["start","down"]){const r=run(command,"postgresql://test@localhost:1/hustlen_test_unused");assert.equal(r.status,1);assert.match(r.stderr,/server.lock exists/);assert.equal(readFileSync(state,"utf8"),sentinel);}
 }finally{rmSync(cwd,{recursive:true,force:true});}
});

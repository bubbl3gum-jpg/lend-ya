import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cameraDiagnostic, cameraErrorCategory } from '../lib/camera-diagnostics';
test('camera error categories survive minified names and never forward arbitrary text',()=>{
 assert.equal(cameraErrorCategory({name:'x',getKind:()=> 'NotFoundException'}),'NotFoundException');
 assert.equal(cameraErrorCategory({name:'NotAllowedError'}),'NotAllowedError');
 assert.equal(cameraErrorCategory({name:'private-secret',getKind:()=>{throw Error('private-secret');}}),'Unknown');
});
test('camera test telemetry is production-disabled and strictly allowlisted',()=>{
 const previous=process.env.NODE_ENV,flag=process.env.NEXT_PUBLIC_HUSTLEN_CAMERA_DIAGNOSTICS,descriptor=Object.getOwnPropertyDescriptor(globalThis,'window');
 const events:unknown[]=[];Object.defineProperty(globalThis,'window',{configurable:true,value:{dispatchEvent:(event:CustomEvent)=>events.push(event.detail)}});
 try{Object.assign(process.env,{NODE_ENV:'production',NEXT_PUBLIC_HUSTLEN_CAMERA_DIAGNOSTICS:'owned-test'});cameraDiagnostic('decoded');assert.equal(events.length,0);
 Object.assign(process.env,{NODE_ENV:'development'});cameraDiagnostic('private-secret');cameraDiagnostic('frame-error','private-secret');assert.deepEqual(events,[{stage:'frame-error',category:'Unknown'}]);assert.ok(!JSON.stringify(events).includes('private-secret'));
 }finally{if(previous===undefined)Reflect.deleteProperty(process.env,"NODE_ENV");else Object.assign(process.env,{NODE_ENV:previous});if(flag===undefined)delete process.env.NEXT_PUBLIC_HUSTLEN_CAMERA_DIAGNOSTICS;else process.env.NEXT_PUBLIC_HUSTLEN_CAMERA_DIAGNOSTICS=flag;if(descriptor)Object.defineProperty(globalThis,'window',descriptor);else Reflect.deleteProperty(globalThis,'window');}
});

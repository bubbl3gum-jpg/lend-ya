export const declarations=["INCLUDED","EXCLUDED","UNSPECIFIED"] as const;
export const visibilities=["DOCUMENTED","NOT_VISIBLE","UNCLEAR"] as const;
export type Accessory={name:string;quantity:string;declaration:typeof declarations[number];visibility:typeof visibilities[number];photoId:string|null};
/** Later participant reports are separate evidence, never inferred from owner visibility. */
export type LaterAccessoryReport={bookingId:number;participantId:number;kind:"PARTICIPANT_REPORTED_MISSING";sourceReference:string};
export type DraftData={accessoryStatement:"NOT_SPECIFIED"|"NONE"|"DECLARED";condition:string;defects:string;accessories:Accessory[];photos:{areaId:string;photoId:string}[]};
export const emptyDraft=():DraftData=>({accessoryStatement:"NOT_SPECIFIED",condition:"",defects:"",accessories:[],photos:[]});
const uuid=(v:unknown):v is string=>typeof v==="string"&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(v);
export function exactObject(value:unknown,keys:readonly string[]):Record<string,unknown>{if(!value||typeof value!=="object"||Array.isArray(value))throw Error("INPUT");const v=value as Record<string,unknown>;if(Object.keys(v).length!==keys.length||keys.some(k=>!Object.hasOwn(v,k)))throw Error("INPUT");return v;}
function text(v:unknown,max:number){if(typeof v!=="string"||v.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(v))throw Error("INPUT");return v.trim();}
export function draftInput(value:unknown):DraftData{
 const v=exactObject(value,["accessoryStatement","condition","defects","accessories","photos"]);
 if(!["NOT_SPECIFIED","NONE","DECLARED"].includes(v.accessoryStatement as string))throw Error("INPUT");
 if(!Array.isArray(v.accessories)||v.accessories.length>12||!Array.isArray(v.photos)||v.photos.length>4)throw Error("INPUT");
 const accessories=v.accessories.map(a=>{const r=exactObject(a,["name","quantity","declaration","visibility","photoId"]);if(!(declarations as readonly unknown[]).includes(r.declaration)||!(visibilities as readonly unknown[]).includes(r.visibility)||(r.photoId!==null&&!uuid(r.photoId))||(r.visibility==="DOCUMENTED"&&!r.photoId)||(r.visibility!=="DOCUMENTED"&&r.photoId!==null))throw Error("INPUT");return {name:text(r.name,120),quantity:text(r.quantity,40),declaration:r.declaration,visibility:r.visibility,photoId:r.photoId} as Accessory;});
 const photos=v.photos.map(p=>{const r=exactObject(p,["areaId","photoId"]);if(typeof r.areaId!=="string"||!/^[a-z-]{1,40}$/.test(r.areaId)||!uuid(r.photoId))throw Error("INPUT");return {areaId:r.areaId,photoId:r.photoId};});
 if(new Set(photos.map(p=>p.areaId)).size!==photos.length||new Set(photos.map(p=>p.photoId)).size!==photos.length)throw Error("INPUT");
 if(v.accessoryStatement==="NONE"&&accessories.length)throw Error("INPUT");
 const result={accessoryStatement:v.accessoryStatement as DraftData["accessoryStatement"],condition:text(v.condition,2000),defects:text(v.defects,2000),accessories,photos};if(new TextEncoder().encode(JSON.stringify(result)).byteLength>=16000)throw Error("INPUT");return result;
}
export function confirmationReady(data:DraftData,areaIds:readonly string[]){return !!data.condition&&!!data.defects&&(data.accessoryStatement==="NONE"?data.accessories.length===0:data.accessoryStatement==="DECLARED"&&data.accessories.length>0&&data.accessories.every(a=>!!a.name&&!!a.quantity))&&areaIds.every(id=>data.photos.some(p=>p.areaId===id));}
export function agreementAdapter(){return {state:"UNKNOWN" as const,snapshot:null,creationAllowed:false,reason:"AGREEMENT_EXTENSION_REQUIRED" as const,idempotent:true};}

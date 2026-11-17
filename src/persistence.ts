import { definitions, isCustomDefinition, type Definition } from './catalog';
import { maps } from './maps';
import { devicePorts } from './devices';
import { canConnect, isSignal, type Node } from './signals';
import type { EntityData, Snapshot } from './world';

export type Save = { name:string; updated:number; snapshot:Snapshot };
export type Blueprint = { name:string; updated:number; custom?:Definition[]; entities:Snapshot['entities']; links:Snapshot['links']; wires:Snapshot['wires'] };
const maxFile=4_000_000;
const database = () => new Promise<IDBDatabase>((resolve,reject)=>{
  const req=indexedDB.open('sandbox-forge',1);
  req.onupgradeneeded=()=>{req.result.createObjectStore('worlds',{keyPath:'name'});req.result.createObjectStore('blueprints',{keyPath:'name'});};
  req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
});
async function access<T>(store:string,mode:IDBTransactionMode,run:(os:IDBObjectStore)=>IDBRequest<T>) {
  const db=await database();
  try {
    return await new Promise<T>((resolve,reject)=>{
      const tx=db.transaction(store,mode), req=run(tx.objectStore(store));
      tx.oncomplete=()=>resolve(req.result);
      tx.onerror=()=>reject(tx.error??req.error);
      tx.onabort=()=>reject(tx.error??new Error('Storage transaction cancelled'));
    });
  } finally {db.close();}
}
export const worlds=()=>access<Save[]>('worlds','readonly',s=>s.getAll());
export const blueprints=()=>access<Blueprint[]>('blueprints','readonly',s=>s.getAll());
export const saveWorld=(name:string,snapshot:Snapshot)=>access('worlds','readwrite',s=>s.put({name,updated:Date.now(),snapshot}));
export const saveBlueprint=(blueprint:Blueprint)=>access('blueprints','readwrite',s=>s.put(blueprint));
export const deleteSave=(store:'worlds'|'blueprints',name:string)=>access(''+store,'readwrite',s=>s.delete(name));
const finite=(v:unknown,min=-10000,max=10000):v is number=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
const str=(v:unknown,n:number):v is string=>typeof v==='string'&&v.length<=n;
const obj=(v:unknown): v is Record<string,unknown>=>v!==null&&typeof v==='object'&&!Array.isArray(v);
function verifyEntity(x:unknown, custom:Set<string>):x is EntityData {
  if(!obj(x)||!str(x.id,80)||!str(x.type,80)||(!definitions.has(x.type)&&!custom.has(x.type))||!str(x.name,90)||!str(x.tags,300)||!str(x.group,100))return false;
  if(!['x','y','angle','vx','vy','av','hp','temp'].every(k=>finite(x[k])))return false;
  if(!finite(x.scale,.2,6)||!finite(x.opacity,0,1)||!finite(x.density,.01,40)||!finite(x.friction,0,10)||!finite(x.bounce,0,1.8)||!finite(x.color,0,0xffffff))return false;
  if(!['frozen','invincible','gravity','collision','locked'].every(k=>typeof x[k]==='boolean'))return false;
  if(!obj(x.config)||Object.keys(x.config).length>160||Object.keys(x.config).some(k=>k==='__proto__'||k==='constructor'||k==='prototype'))return false;
  if(!Object.values(x.config).every(v=>typeof v==='boolean'||finite(v,-1e9,1e9)||str(v,200_000)))return false;
  const config=x.config;
  const schema=devicePorts(x.type);
  if(!obj(x.out)||Object.keys(x.out).length>32||Object.entries(x.out).some(([k,v])=>!['boolean','number','power','text','object','vector','event'].some(kind=>isSignal(kind as Parameters<typeof isSignal>[0],v))||k.length>30))return false;
  if(config.decimals!==undefined&&(!finite(config.decimals,0,6)||!Number.isInteger(config.decimals)))return false;
  if(config.range!==undefined&&!finite(config.range,.1,120))return false;
  if(config.radius!==undefined&&!finite(config.radius,.1,30))return false;
  if(schema.inputs.length+schema.outputs.length>0&&['watts','speed','duration','travel','brightness','cooldown','delay','cap','quantity','force','rate','capacity'].some(k=>config[k]!==undefined&&!finite(config[k],-5000,5000)))return false;
  return x.parts===undefined||(Array.isArray(x.parts)&&x.parts.length<=10&&x.parts.every(p=>obj(p)&&['x','y','angle','vx','vy','av'].every(k=>finite(p[k]))));
}
function validateObjects(value:Record<string,unknown>) {
  const embedded=value.custom;
  if(embedded!==undefined&&(!Array.isArray(embedded)||embedded.length>100||!embedded.every(isCustomDefinition)))return false;
  const custom=new Set((embedded as Definition[]|undefined)?.map(d=>d.id));
  if(!Array.isArray(value.entities)||value.entities.length>600||!value.entities.every(x=>verifyEntity(x,custom)))return false;
  if(!Array.isArray(value.links)||value.links.length>1200||!Array.isArray(value.wires)||value.wires.length>2000)return false;
  const ids=new Set(value.entities.map(x=>x.id)); if(ids.size!==value.entities.length)return false;
  const nodes=new Map<string,Node>(value.entities.map(x=>[x.id,{id:x.id,...devicePorts(x.type),out:x.out}]));
  if(!value.links.every(x=>obj(x)&&str(x.id,80)&&typeof x.a==='string'&&typeof x.b==='string'&&x.a!==x.b&&ids.has(x.a)&&ids.has(x.b)&&['Weld','Hinge','Rope','Spring','Slider','Suspension'].includes(String(x.kind))&&['ax','ay','bx','by'].every(k=>finite(x[k],-160,160))&&finite(x.strength,.05,50)&&finite(x.speed,-100,100)&&typeof x.collide==='boolean'))return false;
  return value.wires.every(w=>obj(w)&&typeof w.from==='string'&&typeof w.to==='string'&&typeof w.output==='string'&&typeof w.input==='string'&&canConnect(nodes,{from:w.from,to:w.to,output:w.output,input:w.input})&&(w.color===undefined||finite(w.color,0,0xffffff))&&(w.bends===undefined||(Array.isArray(w.bends)&&w.bends.length<=40&&w.bends.every(b=>obj(b)&&finite(b.x)&&finite(b.y)))));
}
export function verifySnapshot(value:unknown):value is Snapshot {
  if(!obj(value)||value.version!==1||!maps.some(m=>m.id===value.map)||!obj(value.settings)||!validateObjects(value))return false;
  const s=value.settings;
  if(!finite(s.gravity,-30,40)||!finite(s.wind,-40,40)||!finite(s.temp,-100,500)||!finite(s.daylight,0,1)||!finite(s.friction,0,3)||!finite(s.max,20,600)||Number(s.max)<(value.entities as unknown[]).length)return false;
  if(!finite(s.fluidRate,2,60)||!finite(s.aiRate,2,60)||!finite(s.deviceRate,2,60)||!finite(s.particles,0,1000)||!['clear','rain','snow'].includes(String(s.weather))||!['walls','wrap','open'].includes(String(s.boundary)))return false;
  return Array.isArray(value.fluid)&&value.fluid.length<=2600&&value.fluid.every(c=>obj(c)&&finite(c.x,-222,222)&&finite(c.y,-120,120)&&finite(c.type,0,9)&&Number.isInteger(c.type)&&finite(c.amount,0,1));
}
export function verifyBlueprint(value:unknown):value is Blueprint {
  return obj(value)&&str(value.name,80)&&finite(value.updated,0,9e15)&&validateObjects(value);
}
export type CustomFile = { kind:'forge-part'; version:1; definition:Definition };
export function customFile(definition:Definition):CustomFile {return {kind:'forge-part',version:1,definition};}
export async function importData(file:File) {
  if(file.size>maxFile)throw Error('File exceeds 4 MB');
  const value:unknown=JSON.parse(await file.text());
  if(verifySnapshot(value)||verifyBlueprint(value))return value;
  if(obj(value)&&value.kind==='forge-part'&&value.version===1&&isCustomDefinition(value.definition))return customFile(value.definition);
  throw Error('Unsupported or damaged Forge file');
}
export function exportData(name:string,value:unknown) {
  const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));
  const link=document.createElement('a');link.href=url;link.download=name.replace(/[^a-z0-9_.-]+/gi,'-')+'.json';link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

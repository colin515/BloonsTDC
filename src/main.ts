import './style.css';
import { catalogManifest, definitions, families, materials, customDefinitions, registerCustomDefinition, type Definition, type Family } from './catalog';
import { maps, type MapId } from './maps';
import { ForgeWorld, clamp, dist, type Entity, type EntityData, type JointKind, type Setting, type Snapshot } from './world';
import { ForgeView, type Stamp } from './render';
import type { Vector, Wire } from './signals';
import { deviceSchema } from './devices';
import { ForgeAudio, type Mixer } from './audio';
import { blueprints, customFile, deleteSave, exportData, importData, saveBlueprint, saveWorld, verifySnapshot, worlds, type Blueprint } from './persistence';

const app=document.querySelector<HTMLElement>('#app')!;
app.innerHTML=`
  <header class="topbar">
    <button id="brand" class="brand" title="Forge menu"><span class="logo"><i></i><i></i><i></i></span><span><strong>SANDBOX</strong><b>FORGE</b></span></button>
    <div class="top-actions"><button id="maps" class="map-btn"><span class="glyph">▧</span><span id="map-name">Classic Flat</span><small>⌄</small></button><button id="save" title="Save world (Ctrl+S)">Save</button><button id="load">Load</button></div>
    <div class="time-controls" aria-label="Simulation controls"><button id="pause" class="transport" aria-label="Pause simulation" title="Play / pause (Space)">Ⅱ</button><button id="step" title="Advance one simulation step" aria-label="Single step">▹│</button><select id="speed" aria-label="Simulation speed"><option value=".25">0.25×</option><option value=".5">0.5×</option><option value="1" selected>1×</option><option value="2">2×</option><option value="4">4×</option></select><span class="divider"></span><button id="undo" aria-label="Undo" title="Undo (Ctrl+Z)">↶</button><button id="redo" aria-label="Redo" title="Redo (Ctrl+Y)">↷</button></div>
    <div class="top-end"><button id="sound" title="Toggle sound" aria-label="Toggle sound">◖))</button><button id="settings"><span class="glyph">⚙</span> <span>Settings</span></button></div>
  </header>
  <div class="workspace">
    <aside class="catalog" aria-label="Parts catalog">
      <div class="catalog-head"><div><h1>Catalog</h1><span id="part-count">205 parts</span></div><button id="close-catalog" aria-label="Collapse catalog">‹</button></div>
      <label class="search"><span>⌕</span><input id="search" type="search" placeholder="Find a part…" aria-label="Find a part"><kbd>/</kbd></label>
      <div class="catalog-tabs"><button data-list="parts" class="active">Parts</button><button data-list="favorites">Favorites</button><button data-list="recent">Recent</button><button data-list="blueprints">My builds</button></div>
      <div class="library-layout"><nav id="families" aria-label="Part categories"></nav><div class="catalog-scroll"><div class="section-cap" id="family-name">Building</div><div id="items" class="parts"></div></div></div>
      <div class="catalog-foot"><button id="examples"><span>◇</span> Example scenes</button><button id="help" title="Controls" aria-label="Controls">?</button></div>
    </aside>
    <section class="stage" aria-label="Forge workspace">
      <div id="field"></div>
      <div class="stage-top"><div class="scene-label"><i></i><span id="run-label">SIMULATION LIVE</span></div><button id="open-catalog" class="floating" hidden>▤ Catalog</button><button id="open-inspector" class="floating" hidden>Inspector ›</button></div>
      <div id="context" class="context-panel" hidden></div>
      <div id="notice" role="status" aria-live="polite" hidden></div>
      <div id="placement-panel" class="placement-panel" hidden>
        <strong id="placement-name"></strong>
        <label>X <input id="ghost-x" type="number" step=".01"></label><label>Y <input id="ghost-y" type="number" step=".01"></label><label>° <input id="ghost-angle" type="number" step="1"></label>
        <button id="place" class="accent">Anchor <kbd>↵</kbd></button>
      </div>
      <div class="stage-tools">
        <div class="tool-row"><button id="center" title="Reset camera" aria-label="Reset camera">⊙</button><button id="grid" title="Toggle grid (G)" aria-label="Toggle grid">⊞</button><button id="wire-overlay" title="Show wiring" aria-label="Show wiring">⌁</button><button id="tool-menu" title="Connection tools" aria-label="Connection tools">♧</button></div>
        <div class="mode-switch" aria-label="Editor mode"><button data-mode="physics"><kbd>1</kbd> Physics</button><button data-mode="build" class="active"><kbd>2</kbd> Build</button><button data-mode="select"><kbd>3</kbd> Select</button></div>
      </div>
      <div class="stage-hint" id="hint"><kbd>↵</kbd> Anchor <kbd>Q</kbd><kbd>E</kbd> Rotate <kbd>Esc</kbd> Cancel</div>
    </section>
    <aside class="inspector" aria-label="Inspector"><div class="panel-header"><h2>Inspector</h2><button id="close-inspector" aria-label="Collapse inspector">›</button></div><div id="inspector-content"></div></aside>
  </div>
  <footer class="statusbar"><span><i></i> <span id="status">Systems ready</span></span><span id="metrics"></span><span id="coordinates">X 0.00 · Y 0.00</span></footer>
  <dialog id="dialog"></dialog><dialog id="block-dialog"></dialog>
  <input id="import" type="file" accept="application/json,.json" hidden>
`;
const el=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
const button=(id:string,fn:()=>void)=>el(id).addEventListener('click',fn);
const html=(str:unknown)=>String(str).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]!);
const color=(c:number)=>'#'+c.toString(16).padStart(6,'0');
const stage=el('field'),dialog=el<HTMLDialogElement>('dialog');
const world=new ForgeWorld(),view=new ForgeView(),camera=view.camera,audio=new ForgeAudio(camera);
world.onSound=event=>audio.play(event);
type Mode='physics'|'build'|'select';
let mode:Mode='build',selected=new Set<string>(),list='parts',family:Family='Building',inspectorTab='Properties',itemsRevision=-1,paused=false,speed=1;
let cursor:Vector={x:0,y:0},screen:Vector={x:0,y:0};
let grid=true,showWires=true,snap=true,cell=.25,angleStep=15,autoFreeze=true,repeat=false,avoidOverlap=false,grabForce=160,grabDamping=.78,zeroRelease=false,autoSave=5;
let quality='High',lastAutosave=Date.now(),showMetrics=true;
let activeItem='wood-cube',placement:{type?:string;blueprint?:Blueprint;existing?:string;x:number;y:number;angle:number;manual:boolean;scale:number}|undefined;
let clipboard:Blueprint|undefined,blueprintCache:Blueprint[]=[];
let inputGoal:{id:string;target:boolean}|undefined,aiming:string|undefined;
let wireStart:{id:string;port:string;kind:string;bends:Vector[]}|undefined;
let jointTool:JointKind|undefined,jointStart:{id:string;p:Vector}|undefined;
let marquee:{a:Vector;b:Vector;add:boolean}|undefined;
let drag:{screen:Vector;world:Vector;kind:'pan'|'physics'|'select'|'marquee';before?:Snapshot;origins?:Map<string,Vector>;moved:boolean}|undefined;
let lastDouble=0,lastDoubleId='',lastNotice=0;
const pref=(key:string,fallback:string[])=>{try{const v=JSON.parse(localStorage.getItem(key)??'null');return Array.isArray(v)?v.filter(x=>typeof x==='string'):fallback;}catch{return fallback;}};
const favorite=new Set<string>(pref('forge-favorites',['wood-cube','melon','motion-sensor','electric-motor']));
let recent=pref('forge-recent',[]);
function storePreferences() {
  try{
    localStorage.setItem('forge-favorites',JSON.stringify([...favorite]));localStorage.setItem('forge-recent',JSON.stringify(recent));
    localStorage.setItem('forge-settings',JSON.stringify({grid,showWires,snap,cell,angleStep,autoFreeze,repeat,avoidOverlap,grabForce,grabDamping,zeroRelease,autoSave,quality,showMetrics}));
  }catch{/* game works without preferences */}
}
try{
  const p=JSON.parse(localStorage.getItem('forge-settings')??'null');
  if(p) { grid=p.grid??grid;showWires=p.showWires??showWires;snap=p.snap??snap;cell=clamp(Number(p.cell)||cell,.05,5);angleStep=clamp(Number(p.angleStep)||angleStep,1,180);autoFreeze=p.autoFreeze??autoFreeze;repeat=p.repeat??repeat;avoidOverlap=p.avoidOverlap??avoidOverlap;grabForce=Number(p.grabForce)||grabForce;grabDamping=Number(p.grabDamping)||grabDamping;zeroRelease=!!p.zeroRelease;autoSave=typeof p.autoSave==='number'?p.autoSave:autoSave;quality=p.quality??quality;showMetrics=p.showMetrics??showMetrics; }
}catch{/* defaults */}
const sound=(name='click',level=.45)=>world.sound(name,undefined,level,'ui');
function notice(message:string,problem=false) {
  const out=el('notice');out.textContent=message;out.hidden=false;out.classList.toggle('problem',problem);
  el('status').textContent=message;lastNotice=performance.now();
  if(problem)sound('error');
}
const glyphs:Record<Family,string>={Building:'▦',Props:'▤',Characters:'♙',Devices:'ϟ',Vehicles:'▰',Mechanics:'⚙',Nature:'♧',Fluids:'♢','Tools & Care':'+',Blasters:'⌖',Charges:'✶'};
function partArt(d:Definition) {
  const shape=d.family==='Characters'?'character':d.shape==='box'?d.art:d.shape;
  const w=d.family==='Characters'?32:Math.min(58,Math.max(15,44*Math.sqrt(d.width/Math.max(d.height, .24))/1.45));
  const h=d.family==='Characters'?47:Math.min(48,Math.max(7, w*d.height/d.width));
  return `<i class="mini mini-${shape} material-${d.material}" style="--swatch:${color(d.color)};--art-w:${w.toFixed(1)}px;--art-h:${h.toFixed(1)}px"><b></b><b></b></i>`;
}
function markItem(id:string) {
  activeItem=id;recent=[id,...recent.filter(x=>x!==id)].slice(0,24);storePreferences();
  if(list==='recent')renderCatalog();
  else document.querySelectorAll<HTMLElement>('[data-item]').forEach(x=>x.classList.toggle('chosen',x.dataset.item===id));
}
function renderCatalog() {
  el('part-count').textContent=catalogManifest.length+' parts';
  el('families').innerHTML=families.map(x=>`<button data-family="${html(x)}" title="${html(x)}" aria-label="${html(x)}" class="${x===family&&list==='parts'?'active':''}">${glyphs[x]}</button>`).join('');
  const q=el<HTMLInputElement>('search').value.trim().toLowerCase();
  const items=el('items');
  if(list==='blueprints') {
    el('family-name').textContent='My builds';
    const saved=blueprintCache.filter(b=>b.name.toLowerCase().includes(q)).map(b=>`<button class="blueprint-card" data-blueprint="${html(b.name)}"><span>◇</span><strong>${html(b.name)}</strong><small>${b.entities.length} parts</small></button>`);
    const custom=catalogManifest.filter(d=>d.id.startsWith('custom-')&&d.label.toLowerCase().includes(q)).map(d=>`<button class="blueprint-card" data-spawn="${d.id}"><span>${partArt(d)}</span><strong>${html(d.label)}</strong><small>Custom part</small></button>`);
    items.innerHTML=[...saved,...custom].join('')||'<p class="catalog-empty">Save a blueprint or create a custom part.</p>';
    return;
  }
  const filtered=list==='favorites'?catalogManifest.filter(x=>favorite.has(x.id)):list==='recent'?recent.map(id=>definitions.get(id)).filter((x):x is Definition=>!!x):q?catalogManifest:catalogManifest.filter(x=>x.family===family);
  const result=filtered.filter(x=>[x.label,x.id,...x.tags].some(value=>value.toLowerCase().includes(q)));
  el('family-name').textContent=q?'Search results':list==='favorites'?'Favorites':list==='recent'?'Recently used':family;
  items.innerHTML=result.map(d=>`<div class="part ${activeItem===d.id?'chosen':''}" data-item="${d.id}" draggable="true"><button class="part-main" data-spawn="${d.id}" title="Place ${html(d.label)}"><span class="part-art">${partArt(d)}</span><span class="part-label">${html(d.label)}</span></button><button class="star ${favorite.has(d.id)?'fav':''}" data-fav="${d.id}" title="Toggle favorite" aria-label="Favorite ${html(d.label)}">${favorite.has(d.id)?'★':'☆'}</button></div>`).join('')||'<p class="catalog-empty">No matching parts.</p>';
}
function tab(newList:string) {
  list=newList;
  document.querySelectorAll<HTMLButtonElement>('[data-list]').forEach(b=>b.classList.toggle('active',b.dataset.list===list));
  renderCatalog();
}
function worldPoint(e:{clientX:number;clientY:number}) {
  const rect=stage.getBoundingClientRect();return camera.world({x:e.clientX-rect.left,y:e.clientY-rect.top});
}
function screenPoint(e:{clientX:number;clientY:number}) {
  const rect=stage.getBoundingClientRect();return {x:e.clientX-rect.left,y:e.clientY-rect.top};
}
function setMode(next:Mode) {
  if(mode===next)return;
  mode=next;placement=undefined;wireStart=undefined;jointTool=undefined;inputGoal=undefined;aiming=undefined;
  document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));
  sound('mode');refresh();
}
function begin(type:string,x?:Vector) {
  markItem(type);
  app.querySelector<HTMLButtonElement>('[data-spawn="'+type+'"]')?.blur();
  if(mode==='select')setMode('build');
  const p=x??{x:camera.x,y:camera.y};
  placement={type,x:p.x,y:p.y,angle:0,manual:!x,scale:1};
  if(mode==='physics'&&x)confirmPlace(false);
  else sound();
  refresh();
}
function snapPoint(p:Vector,e?:{altKey:boolean;ctrlKey:boolean}) {
  if(e?.altKey||snap===!!e?.ctrlKey)return p;
  return {x:Math.round(p.x/cell)*cell,y:Math.round(p.y/cell)*cell};
}
function follow(p:Vector,e?:{altKey:boolean;ctrlKey:boolean}) {
  if(!placement)return;
  const at=snapPoint(p,e);placement.x=at.x;placement.y=at.y;placement.manual=false;
}
function cloneBlueprint(name:string,group=selection()):Blueprint|undefined {
  if(!group.length)return;
  const ids=new Set(group.map(e=>e.data.id));
  const pivot={x:group.reduce((s,e)=>s+e.body.getPosition().x,0)/group.length,y:group.reduce((s,e)=>s+e.body.getPosition().y,0)/group.length};
  const entities=group.map(e=>{
    const d=world.entityState(e);d.x-=pivot.x;d.y-=pivot.y;d.parts?.forEach(p=>{p.x-=pivot.x;p.y-=pivot.y;});return d;
  });
  return {name,updated:Date.now(),entities,custom:customDefinitions(entities),links:[...world.links.values()].map(x=>x.spec).filter(l=>ids.has(l.a)&&ids.has(l.b)),wires:world.wires.filter(w=>ids.has(w.from)&&ids.has(w.to)).map(w=>({...w,bends:w.bends?.map(p=>({x:p.x-pivot.x,y:p.y-pivot.y}))}))};
}
function transformed(p:Vector,at:Vector,angle:number) {
  return {x:at.x+p.x*Math.cos(angle)-p.y*Math.sin(angle),y:at.y+p.x*Math.sin(angle)+p.y*Math.cos(angle)};
}
function stampBuild(bp:Blueprint,at:Vector,angle:number,freeze?:boolean) {
  if(bp.entities.length+world.entities.size>world.settings.max){notice('Scene object limit reached',true);return;}
  bp.custom?.forEach(registerCustomDefinition);
  const ids=new Map(bp.entities.map(e=>[e.id,crypto.randomUUID()]));
  const next=new Set<string>();
  for(const original of bp.entities) {
    const p=transformed(original,at,angle);
    const d:EntityData={...structuredClone(original),...p,id:ids.get(original.id)!,angle:angle+original.angle,vx:0,vy:0,av:0,frozen:freeze??original.frozen};
    if(d.parts)d.parts=d.parts.map(part=>({...part,...transformed(part,at,angle),angle:part.angle+angle,vx:0,vy:0,av:0}));
    for(const key of ['target','spawner'])if(typeof d.config[key]==='string')d.config[key]=ids.get(String(d.config[key]))??'';
    for(const signal of Object.values(d.out))if(typeof signal==='object'&&'ref' in signal)signal.ref=ids.get(signal.ref)??'';
    if(typeof d.config.goalX==='number') d.config.goalX+=at.x;
    const e=world.spawn(d.type,p,d.angle,d.frozen,d);if(e)next.add(d.id);
  }
  bp.links.forEach(l=>world.connect({...l,id:crypto.randomUUID(),a:ids.get(l.a)!,b:ids.get(l.b)!}));
  bp.wires.forEach(w=>world.wire({...w,from:ids.get(w.from)!,to:ids.get(w.to)!,bends:w.bends?.map(p=>transformed(p,at,angle))}));
  selected=next;
}
function confirmPlace(frozen=mode==='build'&&autoFreeze) {
  if(!placement)return;
  const p=placement;
  if(avoidOverlap&&overlap()){notice('Placement overlaps another object',true);return;}
  let success=false;
  world.edit(()=>{
    if(p.blueprint){stampBuild(p.blueprint,p,p.angle,frozen);success=true;return;}
    if(p.existing) {
      const e=world.entities.get(p.existing);
      if(e){world.move(e,p,p.angle);world.freeze(e,frozen);selected=new Set([e.data.id]);success=true;}
    } else if(p.type) {
      const e=world.spawn(p.type,{x:p.x,y:p.y},p.angle,frozen);
      if(e){selected=new Set([e.data.id]);success=true;}
    }
  });
  if(!success){notice('Scene object limit reached',true);return;}
  if(!repeat||p.existing||mode==='physics')placement=undefined;
  sound('place');refresh();
}
function stamps():Stamp[] {
  if(!placement)return [];
  const p=placement;
  if(p.blueprint)return p.blueprint.entities.flatMap(e=>{
    const def=definitions.get(e.type)??p.blueprint?.custom?.find(d=>d.id===e.type);return def?[{def,...transformed(e,p,p.angle),angle:e.angle+p.angle,scale:e.scale,color:e.color}]:[];
  });
  const def=definitions.get(p.type??'');
  const old=p.existing?world.entities.get(p.existing):undefined;
  return def?[{def,x:p.x,y:p.y,angle:p.angle,scale:p.scale,color:old?.data.color??def.color}]:[];
}
function overlap(){
  if(!placement)return false;
  const shapes=stamps();return shapes.some(s=>{
    const min=Math.min(s.def.width,s.def.height)*s.scale*.4;
    const hits=world.findNear(s,min+2.7,placement?.existing);
    return hits.some(h=>{
      const p=h.body.getPosition(), hx=h.def.width*h.data.scale*.5, hy=h.def.height*h.data.scale*.5;
      return Math.abs(s.x-p.x)<hx+s.def.width*s.scale*.44&&Math.abs(s.y-p.y)<hy+s.def.height*s.scale*.44;
    })||world.map.terrain.some(t=>Math.abs(s.x-t.x)<t.w/2+s.def.width*s.scale*.42&&Math.abs(s.y-t.y)<t.h/2+s.def.height*s.scale*.42);
  });
}
function selection(){return [...selected].flatMap(id=>{const e=world.entities.get(id);return e?[e]:[];});}
function first(){return selection()[0];}
function mutate(action:(e:Entity)=>void,name='click') {
  world.edit(()=>selection().forEach(action));sound(name);refresh();
}
function transformGroup(d:Vector,rotation=0) {
  const all=selection().filter(e=>!e.data.locked);if(!all.length)return;
  const pivot={x:all.reduce((s,e)=>s+e.body.getPosition().x,0)/all.length,y:all.reduce((s,e)=>s+e.body.getPosition().y,0)/all.length};
  world.edit(()=>all.forEach(e=>{
    const p=e.body.getPosition(),q=transformed({x:p.x-pivot.x,y:p.y-pivot.y},pivot,rotation);
    world.move(e,{x:q.x+d.x,y:q.y+d.y},e.body.getAngle()+rotation);
  }));refresh();
}
function duplicate() {
  const bp=cloneBlueprint('Copy');if(!bp)return;
  const all=selection();
  const x=all.reduce((s,e)=>s+e.body.getPosition().x,0)/all.length,y=all.reduce((s,e)=>s+e.body.getPosition().y,0)/all.length;
  world.edit(()=>stampBuild(bp,{x:x+.85,y:y-.61},0));sound('place');refresh();
}
function perform(action:string) {
  const e=first();
  switch(action){
    case 'freeze': if(e)mutate(item=>world.freeze(item,!e.data.frozen),'relay');break;
    case 'whole': if(e)mutate(item=>world.freeze(item,!e.data.frozen,true),'relay');break;
    case 'invincible':if(e)mutate(item=>item.data.invincible=!e.data.invincible);break;
    case 'gravity':if(e)mutate(item=>world.property(item,'gravity',!e.data.gravity));break;
    case 'collision':if(e)mutate(item=>world.property(item,'collision',!e.data.collision));break;
    case 'duplicate':duplicate();break;
    case 'delete':mutate(item=>world.remove(item.data.id),'delete');selected.clear();refresh();break;
    case 'rotate':transformGroup({x:0,y:0},angleStep*Math.PI/180);break;
    case 'align-x':if(e){const x=e.body.getPosition().x;mutate(item=>world.move(item,{x,y:item.body.getPosition().y}));}break;
    case 'align-y':if(e){const y=e.body.getPosition().y;mutate(item=>world.move(item,{x:item.body.getPosition().x,y}));}break;
    case 'group':{
      const name=window.prompt('Group name',e?.data.group??'');if(name!==null)mutate(item=>item.data.group=name.trim().slice(0,100));break;
    }
    case 'select-group':if(e){selected=new Set([...world.entities.values()].filter(x=>e.data.group?x.data.group===e.data.group:x.data.type===e.data.type).map(x=>x.data.id));refresh();}break;
    case 'blueprint':void keepBlueprint();break;
    case 'use':if(e){world.use(e);refresh();}break;
    case 'aim':if(e){aiming=e.data.id;notice(e.def.family==='Tools & Care'?'Click a character to use this item':'Click the world to aim and fire');}break;
    case 'reload':if(e){delete e.data.config.ammo;sound('relay');notice('Recharged');}break;
    case 'drive':if(e){world.active=world.active===e.data.id?undefined:e.data.id;notice(world.active?'Driving · A/D steer, W lift, S brake':'Vehicle released');refresh();}break;
    case 'walk':if(e){inputGoal={id:e.data.id,target:false};notice('Click the destination');}break;
    case 'target':if(e){inputGoal={id:e.data.id,target:true};notice('Click a target object');}break;
    case 'program':if(e){void import('./blocks').then(m=>m.openBlocks(el<HTMLDialogElement>('block-dialog'),world,e,refresh)).catch(err=>notice(String(err),true));}break;
    case 'custom':if(e)openCustom(e.def);break;
    case 'export-part':if(e?.def.id.startsWith('custom-'))exportData(e.def.label,customFile(e.def));break;
    case 'clear':if(world.entities.size&&window.confirm('Clear the objects you have placed? You can undo this.')){world.edit(()=>[...world.entities.keys()].forEach(id=>world.remove(id)));selected.clear();placement=undefined;refresh();}break;
  }
}
type Field = { id:string; label:string; value:Setting; min?:number; max?:number; step?:number; options?:string[]; section?:string };
const f=(id:string,label:string,value:Setting,min?:number,max?:number,step?:number):Field=>({id,label,value,min,max,step});
function fieldMarkup(field:Field,dataset='field') {
  const val=html(field.value), attr=`data-${dataset}="${html(field.id)}"`;
  const input=field.options?`<select ${attr}>${field.options.map(x=>`<option${x===field.value?' selected':''}>${html(x)}</option>`).join('')}</select>`:
    typeof field.value==='boolean'?`<input class="switch" type="checkbox" ${attr} ${field.value?'checked':''}>`:
      typeof field.value==='number'?`<input type="number" ${attr} value="${val}" min="${field.min??-10000}" max="${field.max??10000}" step="${field.step??.01}">`:
        `<input type="${field.id==='color'?'color':'text'}" maxlength="300" ${attr} value="${val}">`;
  return `<label class="property-row"><span>${html(field.label)}</span>${input}</label>`;
}
function fieldsFor(e:Entity):Field[] {
  const d=e.data,p=e.body.getPosition();
  if(inspectorTab==='Device')return deviceSchema(d.type).map(schema=>({...schema,value:d.config[schema.id]??schema.value}));
  if(inspectorTab==='Details')return [
    f('name','Display name',d.name),f('tags','Tags',d.tags),f('group','Group',d.group),f('color','Tint',color(d.color)),f('opacity','Opacity',d.opacity,0,1,.05),
    f('density','Density',d.density,.01,40,.01),f('friction','Friction',d.friction,0,10,.05),f('bounce','Restitution',d.bounce,0,1.8,.05),
    ...(e.def.family==='Characters'?[f('ai','Active AI',d.config.ai??false),{...f('task','Task',d.config.task??'Idle'),options:['Idle','Walk To','Follow','Patrol','Guard','Flee','Wander','Go To Object','Pick Up','Interact','Wait for Signal','Programmable']},f('goalX','Destination X',d.config.goalX??p.x,-105,105,.1),f('speed','Walk speed',d.config.speed??2.7,.1,12,.1),f('jumpForce','Jump strength',d.config.jumpForce??4.5,.1,14,.1),f('team','Team',d.config.team??'')]:[]),
    ...(e.def.family==='Vehicles'?[f('drive','Auto drive',d.config.drive??0,-1,1,.1),f('torque','Torque',d.config.torque??62,1,400,1)]:[]),
    ...(e.def.family==='Charges'?[f('radius','Radius (m)',d.config.radius??2.6+e.def.detail*.28,.25,20,.1)]:[]),
    ...(e.def.art==='emitter'?[f('flow','Flow (cells/s)',d.config.flow??1.4,0,100,.1),f('on','Active',d.config.on??true)]:[]),
  ];
  return [
    f('x','Position X',Number(p.x.toFixed(2)),-115,115),f('y','Position Y',Number(p.y.toFixed(2)),-80,90),
    f('angle','Rotation °',Number((e.body.getAngle()*180/Math.PI).toFixed(1)),-3600,3600,.1),f('scale','Scale',d.scale,.2,6,.05),
    f('frozen','Anchored',d.frozen),f('gravity','Gravity',d.gravity),f('collision','Collisions',d.collision),f('invincible','Invincible',d.invincible),f('locked','Lock in editor',d.locked),
    f('hp','Health',Number(d.hp.toFixed(1)),1,2000,1),f('temp','Temperature °C',Number(d.temp.toFixed(1)),-100,800,1),
  ];
}
function inspector() {
  const host=el('inspector-content'),e=first(),count=selection().length;
  if(!e) {
    host.innerHTML=`<div class="inspector-empty"><div class="empty-art"><i></i><b>⊹</b></div><h3>No selection</h3><p>Select an object in the world to edit its properties.</p></div><div class="inspector-help"><h3>Build a scene</h3><div><kbd>1</kbd><span>Drop parts into live physics</span></div><div><kbd>2</kbd><span>Preview and anchor parts</span></div><div><kbd>3</kbd><span>Select and edit objects</span></div><button data-command="controls">View all controls <span>↗</span></button></div>`;
    return;
  }
  if(inspectorTab==='Device'&&!e.node)inspectorTab='Properties';
  const d=e.data;
  const actions=[
    ['freeze',d.frozen?'Unanchor':'Anchor'],['duplicate','Duplicate'],['rotate','Rotate'],['delete','Delete'],
    ...(count>1?[['align-x','Align X'],['align-y','Align Y'],['group','Group']]:[]),
    ['blueprint','Save blueprint'],
    ...(e.node?[['use','Activate']]:[]),
    ...(e.def.family==='Characters'?[['walk','Walk to'],['target','Set target']]:[]),
    ...(e.def.family==='Vehicles'?[['drive',world.active===d.id?'Exit drive':'Drive']]:[]),
    ...(e.def.family==='Charges'?[['use','Trigger']]:[]),
    ...(['Blasters','Tools & Care'].includes(e.def.family)?[['aim',e.def.family==='Blasters'?'Aim & fire':'Apply'],...(e.def.family==='Blasters'?[['reload','Recharge']]:[])]:[]),
    ...(e.def.art==='emitter'||['thruster','propeller','fan-rotor','electric-rotor','brake'].includes(d.type)?[['use','Toggle']]:[]),
    ...(d.type==='logic-controller'?[['program','Open Blockly']]:[]),
  ];
  const ports=e.node;
  const inbound=world.wires.filter(w=>w.to===d.id||w.from===d.id);
  const links=[...world.links.values()].filter(w=>w.spec.a===d.id||w.spec.b===d.id);
  const label=(id:string)=>world.entities.get(id)?.data.name??'Unknown';
  const portList=(type:'inputs'|'outputs')=>ports?.[type].map(p=>`<button class="port" data-${type}="${p.id}" data-kind="${p.kind}"><i></i><span>${p.id}</span><small>${p.kind}</small><output data-port-value="${type==='outputs'?p.id:''}"></output></button>`).join('');
  host.innerHTML=`<div class="selection-title"><span class="selected-art">${partArt(e.def)}</span><div><strong>${count>1?count+' objects':html(d.name)}</strong><span>${count>1?'Multi-selection':html(e.def.family+' · '+e.def.material)}</span></div></div>
  <div class="inspector-tabs">${['Properties','Details',...(ports?['Device']:[])].map(tab=>`<button data-inspector="${tab}" class="${tab===inspectorTab?'active':''}">${tab}</button>`).join('')}</div>
  <section class="properties">${fieldsFor(e).map(x=>fieldMarkup(x)).join('')}</section>
  ${ports&&inspectorTab==='Device'?`<section class="io"><h3>Outputs</h3>${portList('outputs')||'<small>No outputs</small>'}<h3>Inputs</h3>${portList('inputs')||'<small>No inputs</small>'}</section>`:''}
  <section class="action-area"><h3>Actions</h3><div>${actions.map(([id,label])=>`<button data-action="${id}" class="${id==='delete'?'danger':''}">${html(label)}</button>`).join('')}</div></section>
  ${inbound.length||links.length?`<section class="connections-list"><h3>Connections</h3>${inbound.map(w=>`<div><span>${html(label(w.from))} → ${html(label(w.to))}</span><button aria-label="Disconnect wire" data-disconnect="${world.wires.indexOf(w)}">×</button></div>`).join('')}${links.map(l=>`<div><span>${l.spec.kind} · ${html(label(l.spec.a===d.id?l.spec.b:l.spec.a))}</span><button data-joint-edit="${l.spec.id}" aria-label="Edit joint">⚙</button><button data-unlink="${l.spec.id}" aria-label="Remove joint">×</button></div>`).join('')}</section>`:''}
  ${e.def.family==='Characters'?'<p id="npc-status" class="npc-status"></p>':''}`;
}
function liveInspector() {
  const e=first();if(!e)return;
  const io=el('inspector-content').querySelectorAll<HTMLOutputElement>('output[data-port-value]');
  for(const out of io) {
    const key=out.dataset.portValue;if(!key)continue;
    const val=e.node?.out[key];
    out.textContent=val===undefined?'—':typeof val==='number'?Number(val.toFixed(2)).toString():typeof val==='object'?'event' in val?'#'+val.event:'ref' in val?'linked':val.x.toFixed(1)+','+val.y.toFixed(1):String(val).slice(0,14);
  }
  const status=el('npc-status');
  if(status)status.textContent=e.data.frozen?'Anchored':e.runtime.blocked?'No path: obstacle too high':e.runtime.arrived?'Destination reached':e.data.config.ai?'AI active':'Ragdoll';
}
function readField(target:HTMLInputElement|HTMLSelectElement):Setting {
  if(target instanceof HTMLInputElement && target.type==='checkbox')return target.checked;
  if(target instanceof HTMLInputElement && target.type==='number')return Number.isFinite(target.valueAsNumber)?clamp(target.valueAsNumber,Number(target.min||-10000),Number(target.max||10000)):Number(target.defaultValue);
  return target.value;
}
function updateField(e:Entity,key:string,value:Setting){
  const p=e.body.getPosition();
  if(key==='x'||key==='y'||key==='angle') {
    if(!e.data.locked)world.move(e,{x:key==='x'?Number(value):p.x,y:key==='y'?Number(value):p.y},key==='angle'?Number(value)*Math.PI/180:e.body.getAngle());
  }else if(key==='scale')world.resize(e,Number(value));
  else if(key==='frozen')world.freeze(e,!!value);
  else if(key==='gravity'||key==='collision'||key==='density'||key==='friction'||key==='bounce')world.property(e,key,Number(value));
  else if(key==='hp'||key==='temp'||key==='opacity')e.data[key]=Number(value);
  else if(key==='invincible'||key==='locked')e.data[key]=!!value;
  else if(key==='color')e.data.color=parseInt(String(value).slice(1),16);
  else if(key==='name'||key==='tags'||key==='group')e.data[key]=String(value).slice(0,key==='name'?90:key==='group'?100:300);
  else {
    e.data.config[key]=value;
    if(key==='charge'||key==='capacity'){delete e.data.config.storedEnergy;delete e.runtime.energy;}
  }
}
function refresh() {
  selected=new Set([...selected].filter(id=>world.entities.has(id)));
  itemsRevision=world.revision;
  el('map-name').textContent=world.map.name;
  el('grid').classList.toggle('on',grid);el('wire-overlay').classList.toggle('on',showWires);
  el('undo').toggleAttribute('disabled',!world.undoStack.length);el('redo').toggleAttribute('disabled',!world.redoStack.length);
  el('pause').textContent=paused?'▶':'Ⅱ';el('pause').setAttribute('aria-label',paused?'Resume simulation':'Pause simulation');
  el('run-label').textContent=paused?'SIMULATION PAUSED':'SIMULATION LIVE';el('run-label').parentElement?.classList.toggle('paused',paused);
  el('sound').classList.toggle('off',audio.mixer.mute);el('sound').textContent=audio.mixer.mute?'◖×':'◖))';
  el('hint').innerHTML=jointTool?`Click ${jointStart?'the second':'the first'} attachment · ${jointTool} · <kbd>Esc</kbd> Cancel`:wireStart?'<kbd>Click</kbd> another device and choose an input · <kbd>Shift</kbd> place a bend':placement?'<kbd>↵</kbd> Anchor <kbd>Q</kbd><kbd>E</kbd> Rotate <kbd>Esc</kbd> Cancel':mode==='physics'?'<kbd>Drag</kbd> Grab or spawn <kbd>Space</kbd> Pause':mode==='select'?'<kbd>Shift</kbd> Add to selection <kbd>F</kbd> Anchor': '<kbd>Drag</kbd> a part to preview <kbd>↵</kbd> Anchor';
  el('placement-panel').hidden=!placement;
  if(placement)el('placement-name').textContent=placement.blueprint?.name??definitions.get(placement.type??'')?.label??'Placement';
  inspector();
}
function renderPosition(){
  if(placement)for(const [id,n] of [['ghost-x',placement.x],['ghost-y',placement.y],['ghost-angle',placement.angle*180/Math.PI]] as const){
    const input=el<HTMLInputElement>(id);if(document.activeElement!==input)input.value=n.toFixed(id==='ghost-angle'?1:2);
  }
  el('coordinates').textContent='X '+cursor.x.toFixed(2)+'  ·  Y '+cursor.y.toFixed(2);
}
function closeContext(){el('context').hidden=true;}
function openContext(items:[string,string][],position=screen){
  const host=el('context'),w=host.parentElement!.clientWidth,h=host.parentElement!.clientHeight;
  host.innerHTML=items.map(([id,label])=>`<button data-context="${html(id)}">${html(label)}</button>`).join('');
  host.hidden=false;host.style.left=clamp(position.x,8,w-216)+'px';host.style.top=clamp(position.y,50,h-host.offsetHeight-10)+'px';
}
function contextFor(e:Entity,p:Vector){
  if(!selected.has(e.data.id))selected=new Set([e.data.id]);
  refresh();
  const list:[string,string][]=[
    ['freeze',e.data.frozen?'Unanchor':'Anchor (F)'],...(e.parts.length?[['whole','Toggle whole assembly'] as [string,string]]:[]),
    ['invincible',e.data.invincible?'Make destructible':'Make invincible'],['gravity',e.data.gravity?'Disable gravity':'Enable gravity'],['collision',e.data.collision?'Disable collisions':'Enable collisions'],
    ['duplicate','Duplicate'],['delete','Delete'],['select-group','Select group / same type'],['blueprint','Save blueprint'],['custom','Create a custom part'],
  ];
  if(e.def.family==='Characters')list.unshift(['walk','Walk to…'],['target','Set target…']);
  if(e.def.family==='Vehicles')list.unshift(['drive','Drive vehicle']);
  if(e.def.family==='Charges')list.unshift(['use','Trigger charge']);
  if(e.def.family==='Blasters'||e.def.family==='Tools & Care')list.unshift(['aim',e.def.family==='Blasters'?'Aim & fire':'Apply to character']);
  if(e.node)list.unshift(['device','Device settings'],['use','Activate']);
  if(e.def.id.startsWith('custom-'))list.unshift(['export-part','Export custom part']);
  if(e.data.type==='logic-controller')list.unshift(['program','Open Blockly editor']);
  openContext(list,p);
}
async function namedSave() {
  const name=window.prompt('Save world as',world.map.name)?.trim().slice(0,80);if(!name)return;
  try{await saveWorld(name,world.snapshot());sound('save');notice('World saved · '+name);}catch(e){notice('Could not save the world',true);}
}
async function keepBlueprint() {
  const name=window.prompt('Blueprint name','My assembly')?.trim().slice(0,80);if(!name)return;
  const bp=cloneBlueprint(name);if(!bp)return;
  try{await saveBlueprint(bp);blueprintCache=await blueprints();sound('save');notice('Blueprint saved · '+name);tab('blueprints');}catch{notice('Could not save the blueprint',true);}
}
function openDialog(title:string,description:string,body:string){
  if(dialog.open)dialog.close();
  dialog.innerHTML=`<div class="dialog-head"><div><h2>${html(title)}</h2><p>${html(description)}</p></div><button data-close aria-label="Close">×</button></div><div class="dialog-body">${body}</div>`;
  dialog.showModal();sound();
}
function pickMap(id:MapId,starter=false){
  world.reset(id);selected.clear();placement=undefined;wireStart=undefined;jointTool=undefined;jointStart=undefined;inputGoal=undefined;aiming=undefined;
  camera.x=0;camera.y=world.map.ground-5.3;camera.zoom=Math.min(54,Math.max(27,camera.width/20));
  if(starter)starterScene();
  applyQuality(quality);paused=false;refresh();
}
function openMaps(){
  openDialog('Choose a map','Each map has its own terrain and gravity.',`<div class="map-grid">${maps.map(m=>`<button class="map-card ${m.id}" data-map="${m.id}"><i></i><strong>${m.name}</strong><span>${m.description}</span></button>`).join('')}</div>`);
}
function loadSnapshot(snapshot:Snapshot) {
  world.load(snapshot);renderCatalog();selected.clear();placement=undefined;wireStart=undefined;jointTool=undefined;inputGoal=undefined;aiming=undefined;camera.x=0;camera.y=world.map.ground-5.3;
  refresh();notice('World loaded');
}
async function openLoads(kind:'world'|'blueprint'='world'){
  try{
    const rows=kind==='world'?(await worlds()).sort((a,b)=>b.updated-a.updated):await blueprints();
    if(kind==='blueprint')blueprintCache=rows as Blueprint[];
    openDialog(kind==='world'?'Load world':'My builds','Saved in this browser. Export a copy to move it to another device.',
      `<div class="save-list">${rows.map(row=>`<div><button data-load-name="${html(row.name)}" data-store="${kind}"><strong>${html(row.name)}</strong><small>${new Date(row.updated).toLocaleString()}</small></button><button data-export-name="${html(row.name)}" data-store="${kind}">Export</button><button data-delete-name="${html(row.name)}" data-store="${kind}" aria-label="Delete saved item">×</button></div>`).join('')||'<p>No saves yet.</p>'}</div><div class="dialog-actions"><button data-import>Import JSON</button>${kind==='world'?'<button data-export>Export current world</button>':''}</div>`);
  }catch{notice('Local storage is unavailable',true);}
}
function openHelp(){
  openDialog('Controls','Use the three modes to place, test and edit your builds.',`<div class="control-list">${[
    ['Physics','1 · Drop a catalog part to spawn a dynamic object. Drag an object to grab and throw it.'],['Build','2 · Drop a part for a ghost preview. Move it and press Enter to anchor it while time runs.'],['Select','3 · Shift-click or drag a rectangle to select multiple objects. Right-click for actions.'],['Camera','Middle-button drag to pan. Scroll to zoom.'],['Placement','Q / E rotates, Shift uses 1°, Alt bypasses snap, G toggles the grid.'],['Editing','F toggles anchoring. Ctrl+C/V/D copy, paste and duplicate. Ctrl+Z/Y undo and redo.'],['Wiring','Choose a device output in the Device tab, select another device, then choose a matching input. Shift-click to add bends.'],['Vehicles','Select Drive and use A/D to move, W to lift (aircraft), and S to brake.'],['Programming','Double-click a Logic controller to edit its visual program.'],
  ].map(([title,text])=>`<div><strong>${title}</strong><span>${text}</span></div>`).join('')}</div>`);
}
const qualityValues:Record<string,[number,number,number,number,number]>={Low:[7,7,12,90,220],Medium:[10,10,18,160,300],High:[12,12,24,260,360],Ultra:[24,20,36,530,600]};
function applyQuality(value:string){
  quality=value;
  const settings=qualityValues[value];if(!settings)return;
  [world.settings.fluidRate,world.settings.aiRate,world.settings.deviceRate,world.settings.particles,world.settings.max]=settings;
  world.settings.max=Math.max(world.settings.max,world.entities.size);
}
function openSettings(){
  const s=world.settings;
  const settings=[
    f('gravity','Gravity (m/s²)',s.gravity,-30,40,.1),f('wind','Wind force',s.wind,-40,40,.1),f('temp','Ambient temperature °C',s.temp,-100,500,1),f('daylight','Daylight',s.daylight,0,1,.05),f('friction','Ground friction',s.friction,0,3,.05),
    {...f('weather','Weather',s.weather),options:['clear','rain','snow']},{...f('boundary','World edges',s.boundary),options:['walls','wrap','open']},
  ];
  const editor=[
    f('snap','Snap to grid',snap),f('cell','Grid spacing (m)',cell,.05,5,.05),f('angleStep','Rotation step °',angleStep,1,180,1),f('autoFreeze','Anchor Build placements',autoFreeze),f('repeat','Repeat stamps',repeat),f('avoidOverlap','Prevent overlap',avoidOverlap),
    f('grabForce','Grab force',grabForce,15,700,5),f('grabDamping','Grab damping',grabDamping,.1,1.5,.02),f('zeroRelease','Zero velocity on release',zeroRelease),
  ];
  openDialog('Settings','Adjust the world, editor and sound mix.',`<div class="settings-grid">
    <section><h3>World</h3>${settings.map(x=>fieldMarkup(x,'world')).join('')}</section>
    <section><h3>Editor</h3>${editor.map(x=>fieldMarkup(x,'editor')).join('')}</section>
    <section><h3>Performance and saves</h3>${fieldMarkup({...f('quality','Quality',quality),options:['Low','Medium','High','Ultra','Custom']},'editor')}${[['fluidRate','Fluid updates / s',2,60],['aiRate','AI updates / s',2,60],['deviceRate','Device updates / s',2,60],['particles','Max particles',0,1000],['max','Max objects',20,600]].map(([id,title,min,max])=>fieldMarkup(f(String(id),String(title),Number(s[id as keyof typeof s]),Number(min),Number(max),1),'world')).join('')}${fieldMarkup(f('showMetrics','Show world statistics',showMetrics),'editor')}${fieldMarkup({...f('autoSave','Autosave interval',String(autoSave)),options:['0','2','5','10']},'editor')}<small>Interval in minutes. Choose 0 to turn autosave off.</small></section>
    <section><h3>Audio mixer</h3>${fieldMarkup(f('mute','Mute',audio.mixer.mute),'mix')}${(['master','sfx','machines','environment','ui','ambient'] as const).map(k=>`<label class="property-row"><span>${{master:'Master',sfx:'Gameplay',machines:'Machines',environment:'Environment',ui:'Interface',ambient:'Ambience'}[k]}</span><input type="range" data-mix="${k}" min="0" max="1" step=".01" value="${audio.mixer[k]}"></label>`).join('')}</section></div>`);
}
const examples=[
  ['Workshop','A workbench, movable parts and a powered indicator.'],['Automatic door','A motion sensor opens a physical sliding door.'],['Thermostat','Temperature controls a cooler and heater around a steel sample.'],['Wireless alarm','A pressure plate broadcasts to a remote sounder.'],['Conveyor','A motorised conveyor carries objects toward a chute.'],['Water transfer','An electric pump and valve transfer water between tanks.'],['Vehicle yard','A suspended compact car and a crawler ready to drive.'],['Piped tanks','Watch a pump fill a tank through a pipe.'],
];
function addScenePart(id:string,x:number,y:number,frozen=true,config:Record<string,Setting>={},angle=0){
  const part=world.spawn(id,{x,y},angle,frozen);
  if(part)Object.assign(part.data.config,config);
  return part;
}
function connectPorts(from:Entity|undefined,output:string,to:Entity|undefined,input:string){
  if(from&&to)world.wire({from:from.data.id,output,to:to.data.id,input});
}
function starterScene(){
  addScenePart('steel-support',-3.65,7.08,true,{},-.15);
  addScenePart('steel-support',-1.6,7.08,true,{},.15);
  addScenePart('steel-girder',-2.6,5.46,true);
  addScenePart('wood-crate',-3.77,4.68,false);
  addScenePart('concrete-cube',.09,8.3,true);
  addScenePart('wood-beam',1.7,6.99,true,{},-.23);
  addScenePart('steel-cube',1.85,5.4,false);
  const battery=addScenePart('battery',-3.18,6.55,true,{infinite:true});
  const sw=addScenePart('switch',-2.27,6.55,true,{on:true});
  const lamp=addScenePart('electric-lamp',-1.5,4.64,true,{requirePower:true});
  connectPorts(battery,'power',lamp,'power');connectPorts(sw,'active',lamp,'enable');
  addScenePart('rubber-wheel',3.24,8.4,false);
  addScenePart('traffic-cone',4.25,8.61,true);
  addScenePart('melon',-5.6,7.28,false,{ai:true,task:'Idle'});
  addScenePart('small-platform',-5.7,5.5,true);
  addScenePart('glass-panel',-6.1,4,true);
  addScenePart('pumpkin',4,5.7,false);
}
function openExamples(){
  openDialog('Example scenes','Load an editable scene to see how the parts connect.',`<div class="example-list">${examples.map(([a,b],i)=>`<button data-example="${i}"><strong>${a}</strong><span>${b}</span><b>↗</b></button>`).join('')}</div>`);
}
function loadExample(index:number) {
  pickMap(index===5?'water':'classic',index===0);
  if(index===1) {
    const plate=addScenePart('motion-sensor',-3.4,8.5,true,{cone:360,range:4.6,filter:'melon',minimum:.04});
    const door=addScenePart('automatic-door',.75,7.58,true);
    connectPorts(plate,'detected',door,'open');
    addScenePart('melon',-6,7.25,false,{ai:true,task:'Walk To',goalX:6,speed:1.85});
  }else if(index===2){
    const sample=addScenePart('steel-cube',0,8.33,true);if(sample)sample.data.temp=10;
    const temp=addScenePart('temperature-sensor',-1.1,8.4,true,{filter:'steel-cube'});
    const heater=addScenePart('heater',-2.6,8.51,true,{target:37,range:5});
    const cooler=addScenePart('cooler',2.3,8.48,true,{target:12,range:5});
    const screen=addScenePart('digital-display',.1,5.05,true,{units:' °C'});
    connectPorts(temp,'cold',heater,'enable');connectPorts(temp,'hot',cooler,'enable');connectPorts(temp,'temperature',screen,'value');
  }else if(index===3){
    const plate=addScenePart('pressure-plate',-3.2,8.9,true,{range:4,filter:'wood'});
    const tx=addScenePart('wireless-transmitter',-2,6.1,true,{range:24});
    const rx=addScenePart('wireless-receiver',3.45,6.1,true,{range:24});
    const alarm=addScenePart('alarm-speaker',4.6,6.08,true,{volume:.49});
    addScenePart('wood-crate',-3.2,3.3,false);
    connectPorts(plate,'detected',tx,'data');connectPorts(rx,'data',alarm,'play');
  }else if(index===4){
    const conveyor=addScenePart('conveyor-belt',-1.2,7.7,true,{on:true,speed:2.4});
    addScenePart('concrete-slab',3,8.5,true);
    addScenePart('wood-cube',-2,4.75,false);addScenePart('steel-cube',-1.58,3.5,false);
    const sw=addScenePart('switch',-3.8,7.7,true,{on:true});
    connectPorts(sw,'active',conveyor,'enable');
  }else if(index===5){
    const pump=addScenePart('water-pump',.05,7.5,true,{on:true,intakeX:-2.8,intakeY:2,outletX:3.5,outletY:1.6});
    const valve=addScenePart('electric-valve',2.15,6.45,true,{opening:100});
    const sensor=addScenePart('fluid-sensor',4,9.1,true,{minimum:.12});
    const display=addScenePart('digital-display',4.5,5.7,true);
    connectPorts(valve,'opening',pump,'opening');connectPorts(sensor,'level',display,'value');
  }else if(index===7){
    const from=addScenePart('fluid-tank',-3.25,8.1,true,{volume:20}),to=addScenePart('fluid-tank',3.4,8.1,true);
    const pump=addScenePart('water-pump',0,7.2,true,{on:true}),pipe=addScenePart('flow-pipe',1.8,7.5,true);
    const valve=addScenePart('electric-valve',0,5.6,true,{opening:75});
    const screen=addScenePart('digital-display',3.4,5.6,true,{units:' units'});
    connectPorts(from,'tank',pump,'intake');connectPorts(to,'tank',pipe,'tank');connectPorts(pipe,'tank',pump,'outlet');
    connectPorts(valve,'opening',pump,'opening');connectPorts(to,'volume',screen,'value');
  }else if(index===6){
    addScenePart('compact-car',-2.15,7.7,false);addScenePart('crawler',3.15,7.5,false);addScenePart('shallow-ramp',7.15,8.1,true);
  }
  refresh();notice(examples[index][0]+' loaded');
}

try{
  const custom=JSON.parse(localStorage.getItem('forge-custom')??'[]');
  if(Array.isArray(custom))custom.slice(0,30).forEach(registerCustomDefinition);
}catch{/* ignore damaged custom catalog */}
function persistCustom(d:Definition){
  registerCustomDefinition(d);
  try{localStorage.setItem('forge-custom',JSON.stringify(catalogManifest.filter(item=>item.id.startsWith('custom-')).slice(-30)));}catch{notice('The browser could not persist the custom part',true);}
}
function openCustom(from?:Definition){
  let pixels=from?.pixels?.slice()??Array<string>(144).fill('');
  const file=from?.id.startsWith('custom-')?'<button data-part-export>Export JSON</button>':'';
  openDialog('Create custom part','Draw or import an image, then set its physical shape.',`<div class="custom-layout"><div>
    <div class="pixel-grid" aria-label="Pixel editor">${pixels.map((_,i)=>`<button data-pixel="${i}" aria-label="Pixel ${i+1}"></button>`).join('')}</div>
    <div class="pixel-tools"><select data-tool aria-label="Drawing tool"><option>Pencil</option><option>Erase</option><option>Fill</option><option>Line</option><option>Rectangle</option><option>Ellipse</option></select><button data-drawing-undo aria-label="Undo drawing">↶</button><button data-drawing-redo aria-label="Redo drawing">↷</button></div>
    <label class="image-import">Import PNG, JPEG or WebP <input type="file" data-sprite accept="image/png,image/jpeg,image/webp"></label>
    </div><div>${[
    f('name','Name',from?from.label+' custom':'Custom part'),f('width','Width (m)',from?.width??1,.15,8,.05),f('height','Height (m)',from?.height??1,.15,8,.05),{...f('shape','Collision shape',['circle','ramp'].includes(from?.shape??'')?from!.shape:'box'),options:['box','circle','ramp']},{...f('material','Material',from?.material??'wood'),options:Object.keys(materials)},f('color','Brush',color(from?.color??0xf4ba74)),
  ].map(x=>fieldMarkup(x,'custom')).join('')}<div class="dialog-actions"><button data-custom-save class="accent">Save part</button>${file}</div></div></div>`);
  const pixel=dialog.querySelector<HTMLElement>('.pixel-grid')!;
  const draw=()=>pixel.querySelectorAll<HTMLButtonElement>('[data-pixel]').forEach((x,i)=>{x.style.background=pixels[i];});
  const tool=dialog.querySelector<HTMLSelectElement>('[data-tool]')!;
  const brush=dialog.querySelector<HTMLInputElement>('[data-custom="color"]')!;
  const undo:string[][]=[],redo:string[][]=[];
  const remember=()=>{undo.push(pixels.slice());if(undo.length>25)undo.shift();redo.length=0;};
  const step=(from:string[][],to:string[][])=>{const next=from.pop();if(next){to.push(pixels.slice());pixels=next;draw();}};
  const index=(target:EventTarget|null)=>Number((target as HTMLElement|null)?.closest<HTMLButtonElement>('[data-pixel]')?.dataset.pixel??-1);
  const xy=(i:number)=>[i%12,Math.floor(i/12)] as const;
  let origin=-1,last=-1,before:string[]=[];
  const paint=(x:number,y:number,value:string)=>{if(x>=0&&x<12&&y>=0&&y<12)pixels[y*12+x]=value;};
  function line(a:number,b:number,value:string){
    const [x,y]=xy(a),[u,v]=xy(b),steps=Math.max(Math.abs(u-x),Math.abs(v-y),1);
    for(let i=0;i<=steps;i++)paint(Math.round(x+(u-x)*i/steps),Math.round(y+(v-y)*i/steps),value);
  }
  function stroke(a:number,b:number){
    const [x,y]=xy(a),[u,v]=xy(b);
    if(tool.value==='Rectangle'){
      for(let i=Math.min(x,u);i<=Math.max(x,u);i++){paint(i,y,brush.value);paint(i,v,brush.value);}
      for(let i=Math.min(y,v);i<=Math.max(y,v);i++){paint(x,i,brush.value);paint(u,i,brush.value);}
    }else if(tool.value==='Ellipse'){
      for(let i=0;i<96;i++){const angle=i*Math.PI/48;paint(Math.round((x+u)/2+Math.cos(angle)*Math.abs(u-x)/2),Math.round((y+v)/2+Math.sin(angle)*Math.abs(v-y)/2),brush.value);}
    }else line(a,b,tool.value==='Erase'?'':brush.value);
  }
  function fill(i:number){
    const target=pixels[i];if(target===brush.value)return;
    const todo=[i];while(todo.length){
      const next=todo.pop()!;if(pixels[next]!==target)continue;
      pixels[next]=brush.value;
      const [x,y]=xy(next);
      if(x>0)todo.push(next-1);if(x<11)todo.push(next+1);if(y>0)todo.push(next-12);if(y<11)todo.push(next+12);
    }
  }
  pixel.addEventListener('pointerdown',e=>{
    const i=index(e.target);if(i<0)return;
    remember();before=pixels.slice();origin=last=i;pixel.setPointerCapture(e.pointerId);
    if(tool.value==='Fill'){fill(i);origin=-1;}else stroke(i,i);draw();
  });
  pixel.addEventListener('pointermove',e=>{
    if(origin<0||!e.buttons)return;
    const i=index(document.elementFromPoint(e.clientX,e.clientY));if(i<0||i===last)return;
    if(tool.value==='Pencil'||tool.value==='Erase')stroke(last,i);
    else{pixels=before.slice();stroke(origin,i);}
    last=i;draw();
  });
  pixel.addEventListener('pointerup',()=>origin=-1);
  pixel.addEventListener('pointercancel',()=>origin=-1);
  dialog.querySelector('[data-drawing-undo]')!.addEventListener('click',()=>step(undo,redo));
  dialog.querySelector('[data-drawing-redo]')!.addEventListener('click',()=>step(redo,undo));
  dialog.querySelector<HTMLInputElement>('[data-sprite]')!.addEventListener('change',e=>void(async()=>{
    const file=(e.target as HTMLInputElement).files?.[0];
    if(!file||file.size>3_000_000||!['image/png','image/jpeg','image/webp'].includes(file.type))return;
    try {
      const bitmap=await createImageBitmap(file);
      const canvas=document.createElement('canvas');canvas.width=canvas.height=12;
      const ctx=canvas.getContext('2d')!,ratio=12/Math.max(bitmap.width,bitmap.height);
      ctx.drawImage(bitmap,(12-bitmap.width*ratio)/2,(12-bitmap.height*ratio)/2,bitmap.width*ratio,bitmap.height*ratio);bitmap.close();
      const values=ctx.getImageData(0,0,12,12).data;
      remember();pixels=pixels.map((_,i)=>values[i*4+3]>98?color((values[i*4]<<16)+(values[i*4+1]<<8)+values[i*4+2]):'');draw();
    }catch{notice('The image could not be decoded',true);}
  })());
  dialog.querySelector('[data-part-export]')?.addEventListener('click',()=>{if(from)exportData(from.label,customFile(from));});
  dialog.querySelector('[data-custom-save]')!.addEventListener('click',()=>{
    const props=Object.fromEntries([...dialog.querySelectorAll<HTMLInputElement|HTMLSelectElement>('[data-custom]')].map(x=>[x.dataset.custom,readField(x)]));
    const label=String(props.name).trim().slice(0,70);if(!label)return;
    const item:Definition={id:'custom-'+crypto.randomUUID(),label,family:'Building',width:Number(props.width),height:Number(props.height),material:props.material as Definition['material'],shape:props.shape as Definition['shape'],art:'custom',color:parseInt(String(props.color).slice(1),16),detail:1,tags:['custom'],pixels};
    if(catalogManifest.filter(d=>d.id.startsWith('custom-')).length>=30){notice('Custom part limit reached',true);return;}
    persistCustom(item);
    dialog.close();el<HTMLInputElement>('search').value='';tab('blueprints');begin(item.id);notice('Custom part saved');
  });
  draw();
}
function openJoint(id:string) {
  const entry=world.links.get(id);if(!entry)return;
  const l=entry.spec;
  openDialog(l.kind+' joint','Change the behavior of this physical attachment.',`<section>${[
    f('strength','Strength / frequency',l.strength,.05,50,.05),f('speed','Drive speed',l.speed,-100,100,.1),f('collide','Parts collide',l.collide),
  ].map(x=>fieldMarkup(x,'joint')).join('')}</section>`);
  dialog.querySelectorAll<HTMLInputElement>('[data-joint]').forEach(input=>input.addEventListener('change',()=>{
    const replacement={...world.links.get(id)?.spec??l,[input.dataset.joint!]:readField(input)};
    world.edit(()=>{world.unlink(id);world.connect(replacement);});refresh();
  }));
}
function openMenu(){
  openDialog('Sandbox Forge','A workshop for physics, machines and programmable builds.',`<div class="menu-grid"><button data-close class="accent">Continue playing</button><button data-command="maps">Map selection</button><button data-command="load">Load world</button><button data-command="creations">My builds</button><button data-command="settings">Settings</button><button data-command="controls">Controls</button><button data-command="custom">Create a custom part</button><button data-command="clear" class="danger">Clear placed objects</button></div>`);
}
app.addEventListener('click',e=>{
  const b=(e.target as HTMLElement).closest<HTMLButtonElement>('button');if(!b)return;
  const d=b.dataset;
  if(d.mode)setMode(d.mode as Mode);
  if(d.list)tab(d.list);
  if(d.family){family=d.family as Family;el<HTMLInputElement>('search').value='';tab('parts');}
  if(d.spawn)begin(d.spawn);
  if(d.fav){if(favorite.has(d.fav))favorite.delete(d.fav);else favorite.add(d.fav);storePreferences();renderCatalog();}
  if(d.blueprint){
    const bp=blueprintCache.find(x=>x.name===d.blueprint);
    if(bp){setMode('build');placement={blueprint:bp,x:camera.x,y:camera.y,angle:0,manual:true,scale:1};refresh();}
  }
  if(d.inspector){inspectorTab=d.inspector;inspector();}
  if(d.action)perform(d.action);
  if(d.context){closeContext();if(d.context==='device'){inspectorTab='Device';inspector();}else if(d.context.startsWith('joint-')){jointTool=d.context.slice(6) as JointKind;jointStart=undefined;placement=undefined;wireStart=undefined;refresh();}else perform(d.context);}
  if(d.outputs){
    const item=first();
    if(item){wireStart={id:item.data.id,port:d.outputs,kind:d.kind??'',bends:[]};placement=undefined;showWires=true;refresh();notice('Output selected · '+d.outputs);}
  }
  if(d.inputs){
    const item=first();
    if(wireStart&&item){
      if(wireStart.kind!==d.kind){notice('Port types must match',true);return;}
      const wire:Wire={from:wireStart.id,output:wireStart.port,to:item.data.id,input:d.inputs,bends:wireStart.bends};
      let valid=false;world.edit(()=>valid=world.wire(wire));if(valid){wireStart=undefined;sound('relay');refresh();notice('Wire connected');}else notice('Select an input on a different device',true);
    }else notice('Select an output first',true);
  }
  if(d.disconnect!==undefined){world.edit(()=>world.wires.splice(Number(d.disconnect),1));refresh();}
  if(d.unlink){world.edit(()=>world.unlink(d.unlink!));refresh();}
  if(d.jointEdit)openJoint(d.jointEdit);
  if(d.close!==undefined&&dialog.open)dialog.close();
  if(d.command){
    if(d.command==='controls')openHelp();
    if(d.command==='maps')openMaps();
    if(d.command==='load')void openLoads();
    if(d.command==='creations')void openLoads('blueprint');
    if(d.command==='settings')openSettings();
    if(d.command==='custom')openCustom();
    if(d.command==='clear'){if(dialog.open)dialog.close();perform('clear');}
  }
  if(d.map){dialog.close();pickMap(d.map as MapId);}
  if(d.example!==undefined){dialog.close();loadExample(Number(d.example));}
  if(d.import!==undefined)el<HTMLInputElement>('import').click();
  if(d.export!==undefined)exportData(world.map.name,world.snapshot());
  if(d.loadName||d.exportName||d.deleteName)void (async()=>{
    const kind=d.store==='blueprint'?'blueprint':'world';
    const name=d.loadName??d.exportName??d.deleteName;
    try{
      if(d.deleteName){
        if(!window.confirm('Delete “'+name+'”?'))return;
        await deleteSave(kind==='world'?'worlds':'blueprints',name!);
        if(kind==='blueprint'){blueprintCache=await blueprints();renderCatalog();}
        await openLoads(kind);return;
      }
      if(kind==='world'){
        const save=(await worlds()).find(x=>x.name===name);
        if(!save||!verifySnapshot(save.snapshot))throw Error('The saved world is damaged');
        if(d.exportName)exportData(save.name,save.snapshot);
        else{dialog.close();loadSnapshot(save.snapshot);}
      }else{
        const bp=(await blueprints()).find(x=>x.name===name);if(!bp)return;
        if(d.exportName)exportData(bp.name,bp);
        else {dialog.close();setMode('build');placement={blueprint:bp,x:camera.x,y:camera.y,angle:0,manual:true,scale:1};refresh();}
      }
    }catch(err){notice(err instanceof Error?err.message:'Save unavailable',true);}
  })();
});
button('brand',openMenu);button('maps',openMaps);button('save',()=>void namedSave());button('load',()=>void openLoads());button('settings',openSettings);
button('sound',()=>{audio.mixer.mute=!audio.mixer.mute;audio.save();refresh();sound();});
button('pause',()=>{paused=!paused;refresh();sound();});
button('step',()=>{paused=true;world.step(1/60);refresh();});
button('undo',()=>{world.undo();refresh();sound();});button('redo',()=>{world.undo(true);refresh();sound();});
button('close-catalog',()=>{app.classList.add('catalog-closed');el('open-catalog').hidden=false;});
button('open-catalog',()=>{app.classList.remove('catalog-closed');el('open-catalog').hidden=true;});
button('close-inspector',()=>{app.classList.add('inspector-closed');el('open-inspector').hidden=false;});
button('open-inspector',()=>{app.classList.remove('inspector-closed');el('open-inspector').hidden=true;});
button('help',openHelp);button('examples',openExamples);
button('center',()=>{camera.x=0;camera.y=world.map.ground-5.3;camera.zoom=Math.min(54,Math.max(27,camera.width/20));});
button('grid',()=>{grid=!grid;storePreferences();refresh();});
button('wire-overlay',()=>{showWires=!showWires;storePreferences();refresh();});
button('tool-menu',()=>{
  const menu=el('tool-menu').getBoundingClientRect(),rect=stage.getBoundingClientRect();
  openContext((['Weld','Hinge','Rope','Spring','Slider','Suspension'] as JointKind[]).map(x=>['joint-'+x,x+' attachment']),{x:menu.left-rect.left-115,y:menu.top-rect.top-235});
});
button('place',()=>confirmPlace());
el('search').addEventListener('input',renderCatalog);
el('speed').addEventListener('change',e=>speed=Number((e.target as HTMLSelectElement).value));
el('import').addEventListener('change',e=>{
  const input=e.target as HTMLInputElement,file=input.files?.[0];
  if(!file)return;
  void importData(file).then(async value=>{
    if('kind' in value){if(dialog.open)dialog.close();persistCustom(value.definition);el<HTMLInputElement>('search').value='';tab('blueprints');notice('Custom part imported');}
    else if('version' in value){if(dialog.open)dialog.close();loadSnapshot(value);}
    else{await saveBlueprint(value);blueprintCache=await blueprints();if(dialog.open)dialog.close();tab('blueprints');notice('Blueprint imported');}
  }).catch(err=>notice(err instanceof Error?err.message:'Import failed',true)).finally(()=>input.value='');
});
for(const [id,k] of [['ghost-x','x'],['ghost-y','y'],['ghost-angle','angle']] as const){
  const input=el<HTMLInputElement>(id);
  const set=()=>{if(placement&&Number.isFinite(input.valueAsNumber)){placement[k]=k==='angle'?input.valueAsNumber*Math.PI/180:input.valueAsNumber;placement.manual=true;}};
  input.addEventListener('input',set);
  input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();set();confirmPlace();}});
}
el('inspector-content').addEventListener('change',e=>{
  const target=e.target as HTMLInputElement|HTMLSelectElement,key=target.dataset.field;
  if(key)mutate(x=>updateField(x,key,readField(target)));
});
dialog.addEventListener('input',e=>{
  const t=e.target as HTMLInputElement;
  if(t.type==='range'&&t.dataset.mix){audio.mixer[t.dataset.mix as Exclude<keyof Mixer,'mute'>]=t.valueAsNumber;audio.save();}
});
dialog.addEventListener('change',e=>{
  const t=e.target as HTMLInputElement|HTMLSelectElement, value=readField(t), editor=t.dataset.editor, setting=t.dataset.world;
  if(t.dataset.mix==='mute'){audio.mixer.mute=!!value;audio.save();refresh();}
  if(setting){
    if(setting==='weather')world.settings.weather=value as typeof world.settings.weather;
    else if(setting==='boundary')world.settings.boundary=value as typeof world.settings.boundary;
    else if(setting in world.settings){
      const k=setting as Exclude<keyof typeof world.settings,'weather'|'boundary'>;
      world.settings[k]=k==='max'?Math.max(world.entities.size,Number(value)):Number(value);
    }
    if(setting==='boundary'||setting==='friction')world.refreshTerrain();
    if(['fluidRate','aiRate','deviceRate','particles','max'].includes(setting)) {quality='Custom';const input=dialog.querySelector<HTMLSelectElement>('[data-editor="quality"]');if(input)input.value=quality;storePreferences();}
  }
  switch(editor){
    case 'snap':snap=!!value;break;case 'cell':cell=Number(value);break;case 'angleStep':angleStep=Number(value);break;
    case 'autoFreeze':autoFreeze=!!value;break;case 'repeat':repeat=!!value;break;case 'avoidOverlap':avoidOverlap=!!value;break;
    case 'grabForce':grabForce=Number(value);break;case 'grabDamping':grabDamping=Number(value);break;case 'zeroRelease':zeroRelease=!!value;break;
    case 'autoSave':autoSave=Number(value);lastAutosave=Date.now();break;case 'showMetrics':showMetrics=!!value;break;
    case 'quality':applyQuality(String(value));openSettings();break;
  }
  if(editor)storePreferences();
});
el('items').addEventListener('dragstart',e=>{
  const item=(e.target as HTMLElement).closest<HTMLElement>('[data-item]');
  if(item?.dataset.item){e.dataTransfer?.setData('application/x-forge-part',item.dataset.item);if(e.dataTransfer)e.dataTransfer.effectAllowed='copy';}
});
stage.addEventListener('dragover',e=>{e.preventDefault();cursor=worldPoint(e);if(placement)follow(cursor,e);if(e.dataTransfer)e.dataTransfer.dropEffect='copy';});
stage.addEventListener('drop',e=>{
  e.preventDefault();const type=e.dataTransfer?.getData('application/x-forge-part');
  if(type&&definitions.has(type)){cursor=worldPoint(e);begin(type,snapPoint(cursor,e));}
});
stage.addEventListener('contextmenu',e=>{
  e.preventDefault();screen=screenPoint(e);cursor=worldPoint(e);
  const picked=world.pick(cursor);if(picked)contextFor(picked,screen);else closeContext();
});
stage.addEventListener('pointerdown',e=>{
  closeContext();screen=screenPoint(e);cursor=worldPoint(e);
  if(e.button===2)return;
  if(e.button===1||e.altKey&&e.button===0&&!placement){
    e.preventDefault();stage.setPointerCapture(e.pointerId);drag={screen,world:cursor,kind:'pan',moved:false};return;
  }
  if(e.button!==0)return;
  const picked=world.pick(cursor);
  if(inputGoal){
    const item=world.entities.get(inputGoal.id), target=inputGoal.target;
    if(item&&(!target||picked)){
      world.edit(()=>{
        item.data.config.ai=true;item.data.config.task=target?'Follow':'Walk To';
        if(target&&picked)item.data.config.target=picked.data.id;
        else {item.data.config.goalX=cursor.x;item.data.config.goalY=cursor.y;}
      });
      inputGoal=undefined;refresh();
    }else notice('Choose a target object',true);
    return;
  }
  if(aiming){
    const item=world.entities.get(aiming);if(item)world.use(item,cursor);aiming=undefined;refresh();return;
  }
  if(wireStart){
    if(e.shiftKey&&!picked){wireStart.bends.push(cursor);return;}
    if(picked?.node){selected=new Set([picked.data.id]);inspectorTab='Device';refresh();}
    return;
  }
  if(jointTool){
    if(!picked)return;
    if(!jointStart){jointStart={id:picked.data.id,p:cursor};refresh();return;}
    const l=world.makeLink(jointStart.id,picked.data.id,jointTool,jointStart.p,cursor);
    if(l){world.edit(()=>world.connect(l));jointStart=undefined;jointTool=undefined;sound('relay');refresh();}
    return;
  }
  if(placement){
    if(!placement.manual)follow(cursor,e);
    if(mode==='physics')confirmPlace(false);
    else {placement.manual=false;follow(cursor,e);renderPosition();}
    return;
  }
  if(picked){
    if(mode==='select'&&e.shiftKey){
      if(selected.has(picked.data.id))selected.delete(picked.data.id);else selected.add(picked.data.id);refresh();return;
    }
    if(!selected.has(picked.data.id))selected=new Set([picked.data.id]);
    const now=performance.now();
    if(lastDoubleId===picked.data.id&&now-lastDouble<310){
      lastDouble=0;lastDoubleId='';
      if(picked.data.type==='logic-controller'){perform('program');return;}
      if(picked.node){inspectorTab='Device';refresh();return;}
    }else {lastDouble=now;lastDoubleId=picked.data.id;}
    if(mode==='build'&&!picked.data.locked){
      if(e.shiftKey){refresh();return;}
      drag={screen,world:cursor,kind:'select',origins:new Map([[picked.data.id,picked.body.getPosition().clone()]]),moved:false};
      stage.setPointerCapture(e.pointerId);
    }else if(mode==='physics'){
      world.startGrab(picked,cursor,grabForce,grabDamping);stage.setPointerCapture(e.pointerId);drag={screen,world:cursor,kind:'physics',moved:false};
    }else if(mode==='select'&&!picked.data.locked){
      stage.setPointerCapture(e.pointerId);drag={screen,world:cursor,kind:'select',before:world.snapshot(),origins:new Map(selection().filter(x=>!x.data.locked).map(x=>[x.data.id,x.body.getPosition().clone()])),moved:false};
    }
    refresh();
  }else if(mode==='select'){
    if(!e.shiftKey)selected.clear();
    marquee={a:cursor,b:cursor,add:e.shiftKey};
    drag={screen,world:cursor,kind:'marquee',moved:false};stage.setPointerCapture(e.pointerId);refresh();
  }else {selected.clear();refresh();}
});
stage.addEventListener('pointermove',e=>{
  screen=screenPoint(e);cursor=worldPoint(e);
  if(drag){
    drag.moved ||= dist(screen,drag.screen)>3;
    if(drag.kind==='pan'){
      camera.x-=(screen.x-drag.screen.x)/camera.zoom;camera.y-=(screen.y-drag.screen.y)/camera.zoom;drag.screen=screen;
    }else if(drag.kind==='physics'){
      const e=first(),p=e?.body.getPosition();
      const d=p?dist(p,cursor):0;
      world.drag(p&&d>10?{x:p.x+(cursor.x-p.x)*10/d,y:p.y+(cursor.y-p.y)*10/d}:cursor);
    }else if(drag.kind==='marquee'&&marquee)marquee.b=cursor;
    else if(drag.kind==='select'&&drag.moved){
      if(mode==='build'&&!placement){
        const picked=first();if(picked){const p=picked.body.getPosition();placement={type:picked.data.type,existing:picked.data.id,x:p.x,y:p.y,angle:picked.body.getAngle(),manual:false,scale:picked.data.scale};refresh();}
      }
      if(mode==='select'){
        const offset={x:cursor.x-drag.world.x,y:cursor.y-drag.world.y};
        for(const [id,p] of drag.origins??[]){const item=world.entities.get(id);if(item)world.move(item,snapPoint({x:p.x+offset.x,y:p.y+offset.y},e));}
      }
    }
  }
  if(placement)follow(cursor,e);
  renderPosition();
});
function releasePointer(){
  if(drag?.kind==='physics')world.release(zeroRelease);
  if(drag?.kind==='select'&&drag.before&&drag.moved){
    const now=world.snapshot(),old=new Map(drag.before.entities.map(e=>[e.id,e]));
    now.entities=now.entities.map(e=>drag?.origins?.has(e.id)?old.get(e.id)??e:e);
    world.record(now);
  }
  if(marquee&&drag?.moved){
    const {a,b}=marquee;
    for(const obj of world.entities.values()){
      const p=obj.body.getPosition();
      if(p.x>=Math.min(a.x,b.x)&&p.x<=Math.max(a.x,b.x)&&p.y>=Math.min(a.y,b.y)&&p.y<=Math.max(a.y,b.y))selected.add(obj.data.id);
    }
  }
  drag=undefined;marquee=undefined;
  if(document.activeElement===stage.querySelector('canvas'))(document.activeElement as HTMLElement).blur();
  refresh();
}
stage.addEventListener('pointerup',releasePointer);stage.addEventListener('pointercancel',releasePointer);
stage.addEventListener('wheel',e=>{
  e.preventDefault();screen=screenPoint(e);
  if(placement&&world.keys.has('KeyR')){
    placement.angle+=Math.sign(e.deltaY)*(e.shiftKey?1:angleStep)*Math.PI/180;
  }else camera.magnify(screen,Math.exp(-e.deltaY*.00125));
  cursor=worldPoint(e);if(placement&&!placement.manual)follow(cursor,e);renderPosition();
},{passive:false});
window.addEventListener('keydown',e=>{
  const target=e.target as HTMLElement;
  if(target.matches('input,select,textarea,[contenteditable]')||dialog.open||el<HTMLDialogElement>('block-dialog').open)return;
  world.keys.add(e.code);
  const meta=e.ctrlKey||e.metaKey;
  if(meta){
    if(e.code==='KeyS'){e.preventDefault();void namedSave();}
    if(e.code==='KeyZ'){e.preventDefault();world.undo(e.shiftKey);refresh();}
    if(e.code==='KeyY'){e.preventDefault();world.undo(true);refresh();}
    if(e.code==='KeyA'&&mode==='select'){e.preventDefault();selected=new Set(world.entities.keys());refresh();}
    if(e.code==='KeyD'&&selected.size){e.preventDefault();duplicate();}
    if(e.code==='KeyC'&&selected.size){e.preventDefault();clipboard=cloneBlueprint('Clipboard');notice('Copied '+selected.size+' object(s)');}
    if(e.code==='KeyV'&&clipboard){e.preventDefault();setMode('build');placement={blueprint:clipboard,x:cursor.x,y:cursor.y,angle:0,manual:false,scale:1};refresh();}
    return;
  }
  if(e.repeat&&!['KeyQ','KeyE','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.code))return;
  if(e.code==='Digit1')setMode('physics');
  if(e.code==='Digit2')setMode('build');
  if(e.code==='Digit3')setMode('select');
  if(e.code==='Enter'&&placement){e.preventDefault();confirmPlace();}
  if(e.code==='Space'&&!target.closest('button')){e.preventDefault();paused=!paused;refresh();}
  if(e.code==='Escape'){placement=undefined;selected.clear();wireStart=undefined;jointTool=undefined;inputGoal=undefined;aiming=undefined;world.active=undefined;closeContext();refresh();}
  if(e.code==='KeyF')perform('freeze');
  if(e.code==='KeyG'){grid=!grid;storePreferences();refresh();}
  if(e.code==='Delete')perform('delete');
  if(e.code==='Slash'){e.preventDefault();el<HTMLInputElement>('search').focus();}
  if(e.code==='KeyQ'||e.code==='KeyE'){
    const delta=(e.code==='KeyQ'?-1:1)*(e.shiftKey?1:angleStep)*Math.PI/180;
    if(placement)placement.angle+=delta;
    else if(mode==='select')transformGroup({x:0,y:0},delta);
    else if(world.grab)first()?.body.applyAngularImpulse(delta*2,true);
  }
  if(e.code.startsWith('Arrow')){
    if(world.active){e.preventDefault();}
    else if(mode==='select'&&selected.size){e.preventDefault();const d=e.shiftKey?.05:cell;transformGroup({x:e.code==='ArrowLeft'?-d:e.code==='ArrowRight'?d:0,y:e.code==='ArrowUp'?-d:e.code==='ArrowDown'?d:0});}
  }
});
window.addEventListener('keyup',e=>world.keys.delete(e.code));
window.addEventListener('blur',()=>{world.keys.clear();if(drag)releasePointer();});
document.addEventListener('pointerdown',()=>void audio.unlock().catch(()=>{}),{capture:true});
document.addEventListener('keydown',()=>void audio.unlock().catch(()=>{}),{capture:true});

async function start(){
  renderCatalog();refresh();
  try{await view.init(stage);}catch(error){notice('WebGL could not start. Check browser graphics acceleration.',true);throw error;}
  pickMap('classic',true);
  void blueprints().then(rows=>{blueprintCache=rows;if(list==='blueprints')renderCatalog();}).catch(()=>{});
  let accumulator=0,last=performance.now(),stat=last,frameCount=0,lastAmbient=0;
  const frame=(now:number)=>{
    const dt=Math.min(.12,(now-last)/1000);last=now;frameCount++;
    if(!paused&&!document.hidden){
      accumulator=Math.min(.21,accumulator+dt*speed);
      for(let i=0;i<10&&accumulator>=1/60;i++){world.step(1/60);accumulator-=1/60;}
      if(world.time<lastAmbient-5)lastAmbient=0;
      if(world.time>lastAmbient){world.sound(world.map.id==='water'?'water':world.map.id==='industrial'?'generator':'wind',undefined,world.map.id==='moon'?.12:.28,'ambient');lastAmbient=world.time+6;}
    }else accumulator=0;
    if(itemsRevision!==world.revision && !el('inspector-content').contains(document.activeElement))refresh();
    if(now-stat>260){
      const fps=Math.round(frameCount*1000/(now-stat));
      el('metrics').textContent=showMetrics?fps+' FPS  ·  '+world.entities.size+' objects  ·  '+world.wires.length+' wires':'';
      liveInspector();audio.syncMachines(world,paused||document.hidden);stat=now;frameCount=0;
    }
    if(!el('notice').hidden&&now-lastNotice>3100)el('notice').hidden=true;
    if(autoSave&&Date.now()-lastAutosave>=autoSave*60000&&world.entities.size){lastAutosave=Date.now();void saveWorld('Autosave',world.snapshot()).catch(()=>{});}
    const start=wireStart&&world.entities.get(wireStart.id)?.body.getPosition();
    view.render(world,{selected,stamps:stamps(),grid,cell,wires:showWires,marquee,wireStart:jointStart?.p??start,cursor,overlap:!!placement&&overlap()});
    if(placement)renderPosition();
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
void start().catch(console.error);

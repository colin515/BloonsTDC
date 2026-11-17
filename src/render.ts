import { Application, Container, Graphics, Text } from 'pixi.js';
import type { Definition } from './catalog';
import type { MapId, Terrain } from './maps';
import { liquidColors } from './fluid';
import type { Entity, ForgeWorld } from './world';
import type { Vector } from './signals';
export class Camera {
  x = 0; y = 3.75; zoom = 47; width = 800; height = 600;
  world(point: Vector) { return {x:this.x + (point.x-this.width/2)/this.zoom,y:this.y + (point.y-this.height/2)/this.zoom}; }
  screen(point: Vector) { return {x:this.width/2+(point.x-this.x)*this.zoom,y:this.height/2+(point.y-this.y)*this.zoom}; }
  magnify(point: Vector, factor: number) {
    const lock = this.world(point);
    this.zoom = Math.max(11,Math.min(160,this.zoom*factor));
    const offset = this.world(point);
    this.x += lock.x-offset.x; this.y += lock.y-offset.y;
  }
}
export type Stamp = {def:Definition; x:number; y:number; angle:number; scale:number; color:number};
type Overlay = { selected:Set<string>; stamps:Stamp[]; grid:boolean; cell:number; wires:boolean; marquee?:{a:Vector;b:Vector}; wireStart?:Vector; cursor:Vector; overlap:boolean };
type View = { root:Graphics; parts:Graphics[]; text?:Text; style:string };
const edge = 0xe6eef3;
const outline = {color:0x172128,width:.038,alpha:.98};
const border = (g:Graphics,x:number,y:number,w:number,h:number,color:number,alpha:number) => g.rect(x,y,w,h).fill({color,alpha});
const bar = (g:Graphics,x:number,y:number,x2:number,y2:number,color:number,width:number,alpha=1) => g.moveTo(x,y).lineTo(x2,y2).stroke({color,width,alpha});
export function drawObject(g:Graphics, def:Definition, w:number,h:number,color:number,art=def.art) {
  g.clear();
  const pixels = def.pixels;
  if (pixels?.some(Boolean)) {
    const dx=w/12,dy=h/12;
    pixels.forEach((pixel,i)=>{if(pixel) g.rect(-w/2+(i%12)*dx,-h/2+Math.floor(i/12)*dy,dx+.001,dy+.001).fill(parseInt(pixel.slice(1),16));});
    return;
  }
  const body = () => g.roundRect(-w/2,-h/2,w,h,Math.min(.11,w*.13,h*.13)).fill(color).stroke(outline);
  if (art === 'head') {
    g.circle(0,0,w/2).fill(color).stroke(outline);
    g.ellipse(-w*.08,-h*.09,w*.29,h*.30).fill({color:edge,alpha:.19});
    if (def.material === 'foliage') g.moveTo(-w*.19,-h*.38).quadraticCurveTo(w*.04,-h*.05,-w*.02,h*.36).stroke({color:0x41683d,width:.035});
    if (def.id === 'robot') g.rect(-w*.32,-h*.18,w*.64,h*.32).fill(0x223744);
    for (const x of [-.12,.17]) g.circle(w*x,-h*.015,Math.max(.023,w*.062)).fill(def.id === 'robot' ? 0x87eaf0 : 0x1b2930);
    return;
  }
  if (def.shape === 'circle' || art === 'wheel') {
    g.circle(0,0,Math.min(w,h)/2).fill(art==='wheel'?0x38434a:color).stroke(outline);
    const r=Math.min(w,h)/2;
    g.circle(0,0,r*.68).stroke({color:edge,alpha:.28,width:.045});
    g.circle(0,0,r*.25).fill(0x405064);
    for(let i=0;i<(art==='gear'?8:4);i++) {const a=i*Math.PI/(art==='gear'?4:2);g.circle(Math.cos(a)*r*.81,Math.sin(a)*r*.81,.038).fill({color:edge,alpha:.52});}
    if (art !== 'device' && art !== 'charge') return;
  } else if (def.shape === 'ramp' || def.shape === 'ramp45' || def.shape === 'cone') {
    const poly=def.shape==='cone'?[-w/2,h/2,w/2,h/2,w*.12,-h/2,-w*.12,-h/2]:[-w/2,h/2,w/2,h/2,w/2,-h/2];
    g.poly(poly).fill(color).stroke(outline);
    if(def.shape==='cone') bar(g,-w*.31,h*.07,w*.31,h*.07,edge,.07,.65);
    return;
  } else if (def.shape === 'arch') {
    g.moveTo(-w/2,h/2).lineTo(-w/2,-h/2).quadraticCurveTo(w*.22,-h*.48,w/2,h/2).closePath().fill(color).stroke(outline); return;
  } else if (def.shape === 'stairs') {
    for(let i=0;i<5;i++) {const height=h*(i+1)/5;g.rect(-w/2+i*w/5,h/2-height,w/5,height).fill(color).stroke(outline);} return;
  } else if (def.shape === 'tree') {
    g.rect(-w*.12,-h*.15,w*.24,h*.65).fill(0x997558).stroke(outline);
    g.ellipse(0,-h*.23,w*.49,h*.27).fill(color).stroke(outline);
    for(const off of [-.25,.06,.27]) g.ellipse(w*off,-h*(.28 + off*.2),w*.22,h*.16).fill({color:0xc6e294,alpha:.35});
    return;
  } else if (art === 'table' || art === 'chair') {
    for (const x of [-.37,.37]) g.roundRect(w*x-w*.07,-h*.16,w*.14,h*.66,.035).fill(color).stroke(outline);
    if(art==='chair') g.roundRect(-w*.5,-h*.52,w*.16,h*.53,.04).fill(color).stroke(outline);
    g.roundRect(-w/2,-h*.34,w,h*.19,.04).fill(color).stroke(outline); return;
  } else body();
  if (art === 'device' || art === 'charge' || art === 'emitter') {
    g.roundRect(-w*.29,-h*.25,w*.58,h*.50,.045).fill({color:0x203044,alpha:.88});
    if (art==='device' && def.detail < 3) {
      border(g,-w*.23,-h*.08,w*.44,h*.16,0x8ddfe4,.78);
      for(const off of [-.17,-.04,.09]) bar(g,w*off,-h*.12,w*off,h*.12,0x304b56,.04);
    } else {
      g.circle(0,0,Math.min(w,h)*.14).fill(color).circle(0,0,Math.min(w,h)*.064).fill(0xf4ecb9);
    }
    bar(g,-w*.39,h*.30,w*.36,h*.30,edge,.026,.47);
    if (art==='emitter') border(g,-w*.16,h*.39,w*.32,h*.18,0x384256,.96);
  } else if (art === 'character') {
    g.roundRect(-w*.36,-h*.41,w*.72,h*.65,.075).fill({color:edge,alpha:.2});
    g.rect(-w*.44,h*.22,w*.88,h*.12).fill({color:0x344852,alpha:.52});
    g.circle(0,h*.27,w*.09).fill(0xf1d9a0);
  } else if (['arm','hand','leg','foot'].includes(art)) {
    bar(g,-w*.24,-h*.29,-w*.24,h*.25,edge,.025,.43);
  } else if (art === 'vehicle' || art==='craft') {
    g.roundRect(-w*.31,-h*.61,w*.58,h*.44,.09).fill(0x304958).stroke(outline);
    bar(g,-w*.03,-h*.55,-w*.03,-h*.24,edge,.038,.72);
    bar(g,-w*.41,h*.26,w*.4,h*.26,0x384755,.071);
    g.circle(w*.42,-h*.06,.087).fill(0xffddb4);
    if(art==='craft') bar(g,-w*.35,0,w*.34,0,edge,.07,.55);
  } else if (art === 'blaster' || art === 'blade') {
    border(g,-w*.36,-h*.13,w*.63,h*.19,0x40566c,.72);
    border(g,w*.27,-h*.25,w*.17,h*.31,0xc191e8,.95);
    if(art==='blaster') g.roundRect(-w*.32,0,w*.18,h*.74,.03).fill(0x586579).stroke(outline);
  } else if (art==='care') {
    bar(g,-w*.17,0,w*.17,0,0xf5ead6,.055);bar(g,0,-h*.28,0,h*.28,0xf5ead6,.055);
  } else if (art==='frame' || art==='door' || art==='display') {
    g.roundRect(-w*.37,-h*.40,w*.74,h*.78,.03).fill({color:0x334354,alpha:art==='display'?.92:.32}).stroke({color:edge,alpha:.3,width:.026});
    if(art==='door') bar(g,0,-h*.32,0,h*.32,0xffcb88,.038,.85);
  } else if (art==='crate') {
    bar(g,-w*.4,-h*.38,w*.4,h*.38,edge,.055,.31);bar(g,w*.4,-h*.38,-w*.4,h*.38,edge,.055,.31);
  } else if (['ladder','shelf','barrel'].includes(art)) {
    for (const off of [-.33,0,.33]) bar(g,-w*.45,h*off,w*.45,h*off,0x394350,.045,.6);
  } else if (art==='spring') {
    g.moveTo(-w*.45,0);
    for(let i=0;i<7;i++) g.lineTo(-w*.37+i*w*.123,(i%2-.5)*h*.58);
    g.lineTo(w*.45,0).stroke({color:edge,width:.036,alpha:.75});
  } else if (art==='sofa') {
    g.roundRect(-w*.4,-h*.34,w*.8,h*.49,.07).fill({color:edge,alpha:.22});
    bar(g,-w*.4,h*.19,w*.4,h*.19,0x444a60,.04,.8);
  } else if (art==='sign' || art==='light') {
    border(g,-w*.08,-h*.27,w*.16,h*.75,0x526376,1);
    g.circle(0,-h*.28,w*.31).fill(0xf6d590);
  } else {
    const lines = def.material==='brick'?3:def.material==='wood'?2:1;
    for(let i=0;i<lines;i++) bar(g,-w*.44,-h*.33+i*h*.31,w*.43,-h*.33+i*h*.31,edge,.025,.30);
    if(w>.5 && h>.24 && (def.material==='steel' || def.material==='stone')) for(const x of [-.38,.38]) g.circle(w*x,h*.31,.04).fill({color:0x46586a,alpha:.65});
    if(def.material==='glass') bar(g,-w*.38,-h*.27,w*.38,h*.14,edge,.035,.61);
  }
}

const noise = (n:number) => { const x=Math.sin(n*312.37+45.9)*43758.5453; return x-Math.floor(x); };
function ridge(graph:Graphics,w:number,h:number,seed:number,top:number,amp:number,color:number) {
  graph.moveTo(0,h).lineTo(0,top+noise(seed)*amp);
  for(let i=1;i<=22;i++) graph.lineTo(i*w/22,top+noise(seed+i)*amp);
  graph.lineTo(w,h).closePath().fill(color);
}
export class ForgeView {
  app = new Application();
  camera = new Camera();
  private bg = new Graphics();
  private scenery = new Graphics();
  private level = new Container();
  private grid = new Graphics();
  private terrain = new Graphics();
  private connections = new Graphics();
  private liquid = new Graphics();
  private objects = new Container();
  private overlays = new Graphics();
  private weather = new Graphics();
  private views = new Map<string,View>();
  private ghostLayer = new Container();
  private ghostViews: Graphics[] = [];
  private oldBackground = '';
  private currentMap?: MapId;
  private currentTerrain?: Terrain[];
  async init(host:HTMLElement) {
    await this.app.init({width:host.clientWidth,height:host.clientHeight,resolution:Math.min(2,devicePixelRatio),autoDensity:true,antialias:true,background:0x202935,preference:'webgl',autoStart:false});
    host.appendChild(this.app.canvas); this.app.canvas.setAttribute('aria-label','Sandbox world'); this.app.canvas.tabIndex=0;
    this.app.stage.addChild(this.bg,this.scenery,this.level,this.weather);
    this.level.addChild(this.grid,this.terrain,this.liquid,this.connections,this.objects,this.ghostLayer,this.overlays);
    new ResizeObserver(() => {this.camera.width=Math.max(1,host.clientWidth);this.camera.height=Math.max(1,host.clientHeight);this.app.renderer.resize(this.camera.width,this.camera.height);}).observe(host);
    this.camera.width = host.clientWidth; this.camera.height = host.clientHeight;
    this.camera.zoom = Math.min(54, Math.max(27,host.clientWidth/20));
  }
  private background(world:ForgeWorld) {
    const {width:w,height:h,x,y} = this.camera, {id,sky} = world.map;
    const key = [w,h,Math.round(x*2),Math.round(y*2),id,Math.round(world.settings.daylight*20)].join('/');
    if (key===this.oldBackground) return;
    this.oldBackground=key;
    const g=this.bg.clear(), s=this.scenery.clear();
    const moon=id==='moon', water=id==='water', industrial=id==='industrial';
    const light = world.settings.daylight;
    for(let i=0;i<32;i++) {
      const shade = i/31, r=((sky>>16)&255) + shade*18, gr=((sky>>8)&255)+shade*15, b=(sky&255)+shade*12;
      const luminosity=.53+light*.47;
      g.rect(0,h*i/32,w,h/32+1).fill((Math.floor(r*luminosity)<<16)+(Math.floor(gr*luminosity)<<8)+Math.floor(b*luminosity));
    }
    const sunX=w*.72-x*3, sunY=h*.23-y*1.5;
    if(!water) {
      for(let i=11;i>=1;i--) s.circle(sunX,sunY,19+i*5).fill({color:moon?0xa39bd9:0xf5bd89,alpha:.011});
      s.circle(sunX,sunY,moon?28:23).fill({color:moon?0xcbc5ef:0xf4c494,alpha:.88});
      if(moon) for(let i=0;i<36;i++) s.circle(w*noise(i+100),h*noise(i+45)*.66,.65+noise(i)*1.15).fill({color:0xd5d1ed,alpha:.45+noise(i+6)*.48});
    }
    if (water) {
      for(let i=0;i<9;i++) {
        const ax=(i/8)*w-x*5;
        border(s,ax,h*.07,Math.max(20,w/9)-6,h*.71,0x4b8192,.14);
        bar(s,ax,h*.07,ax,h*.77,0x73aec1,1,.17);
      }
      bar(s,0,h*.11,w,h*.11,0x95cadd,2,.22);
      bar(s,0,h*.6,w,h*.6,0x95cadd,1,.19);
    } else {
      ridge(s,w,h,9,h*.42-y*2,h*.19,moon?0x292c48:0x3a4b5b);
      ridge(s,w,h,28,h*.53-y*2,h*.19,moon?0x353855:0x2d3a49);
    }
    if(industrial) for(let i=0;i<26;i++) {
      const bx=i*(w/25)-45-x*3, bw=22+noise(i+11)*38, bh=(.1+noise(i+70)*.23)*h;
      border(s,bx,h*.74-bh,bw,bh,0x303b48,.95);
      for(let row=0;row<4;row++) for(let col=0;col<3;col++) if(noise(i*12+row*3+col)>.62) border(s,bx+5+col*bw*.26,h*.755-bh+row*12,3,5,0xf1b280,.32);
    }
  }
  render(world:ForgeWorld, overlay:Overlay) {
    const {width:w,height:h,zoom} = this.camera;
    this.level.position.set(w/2-this.camera.x*zoom,h/2-this.camera.y*zoom);
    this.level.scale.set(zoom);
    this.background(world);
    this.grid.clear();
    const a=this.camera.world({x:0,y:0}), b=this.camera.world({x:w,y:h});
    if(overlay.grid) {
      const cell=overlay.cell * Math.max(1,Math.ceil(11/(overlay.cell*zoom)));
      for(let x=Math.floor(a.x/cell)*cell;x<b.x;x+=cell) bar(this.grid,x,a.y,x,b.y,0xb6d3e6,1/zoom,Math.abs(Math.round(x/cell)%5)<1?.17:.075);
      for(let y=Math.floor(a.y/cell)*cell;y<b.y;y+=cell) bar(this.grid,a.x,y,b.x,y,0xb6d3e6,1/zoom,Math.abs(Math.round(y/cell)%5)<1?.17:.075);
    }
    if(this.currentMap!==world.map.id || this.currentTerrain!==world.map.terrain) {
      this.currentMap=world.map.id; this.currentTerrain=world.map.terrain;
      this.terrain.clear();
      for(const t of world.map.terrain) {
        const ground = t.w>100, color = world.map.id==='moon'?0x615d79:world.map.id==='water'?0x506f7b:0x4b555a;
        const left=t.x-t.w/2, top=t.y-t.h/2;
        this.terrain.rect(left,top,t.w,t.h).fill(color).stroke({color:0x202e38,width:.045});
        border(this.terrain,left,top,t.w,ground?.15:.07,world.map.accent,.83);
        if(ground) {
          for(let i=0;i<t.w;i+=.8) {
            const x=left+i;
            bar(this.terrain,x,top+.21,x-.37,top+.59,0x263440,.12,.66);
            if(i%2.4<.15) this.terrain.circle(x,top+.89,.43+noise(i)*.39).fill({color:0x384652,alpha:.33});
          }
        } else for(let x=left+.16;x<left+t.w;x+=.72) this.terrain.circle(x,top+t.h*.62,.041).fill(0xa9b8c2);
      }
    }
    this.liquid.clear();
    for(const cell of world.fluid.cells.values()) {
      if(cell.amount<.012) continue;
      const gas=cell.type===6||cell.type===7;
      const x=cell.x*.5,y=cell.y*.5;
      if(x<a.x-.8||x>b.x+.8||y<a.y-.8||y>b.y+.8) continue;
      if(gas) this.liquid.circle(x+.25,y+.25,.28+cell.amount*.17).fill({color:liquidColors[cell.type],alpha:cell.amount*.28});
      else {
        const fill=.5*cell.amount;
        this.liquid.rect(x,y+.5-fill,.502,fill).fill({color:liquidColors[cell.type],alpha:.64});
        if(!world.fluid.cells.has(cell.x+','+(cell.y-1)) && fill>.12) bar(this.liquid,x,y+.5-fill,x+.5,y+.5-fill,0xbce9f4,.021,.55);
      }
    }
    for(const [id,view] of this.views) if(!world.entities.has(id)) {
      view.root.destroy();view.parts.forEach(p=>p.destroy());view.text?.destroy();this.views.delete(id);
    }
    this.connections.clear(); this.overlays.clear();
    for(const {spec,joint} of world.links.values()) {
      const p=joint.getAnchorA(), q=joint.getAnchorB();
      bar(this.connections,p.x,p.y,q.x,q.y,spec.kind==='Rope'?0xbda995:0x9cabb7,.044,.84);
      this.connections.circle(p.x,p.y,.073).circle(q.x,q.y,.073).fill(0xe1b374);
    }
    if(overlay.wires) for(const wire of world.wires) {
      const src=world.entities.get(wire.from), dst=world.entities.get(wire.to);
      if(!src||!dst) continue;
      const p=src.body.getPosition(), q=dst.body.getPosition(), on=!!src.node?.out[wire.output];
      const kind=src.node?.outputs.find(p=>p.id===wire.output)?.kind;
      const color=wire.color??(kind==='power'?0xf9b665:kind==='boolean'?0x7ee1c9:0xb3a0f8);
      this.connections.moveTo(p.x,p.y);
      if(wire.bends?.length) {for(const node of wire.bends) this.connections.lineTo(node.x,node.y);this.connections.lineTo(q.x,q.y);}
      else this.connections.quadraticCurveTo((p.x+q.x)/2,(p.y+q.y)/2+.36,q.x,q.y);
      this.connections.stroke({color,width:on?.058:.035,alpha:on?.92:.47}).circle(p.x,p.y,.072).circle(q.x,q.y,.072).fill({color,alpha:.84});
    }
    if(overlay.wireStart) bar(this.overlays,overlay.wireStart.x,overlay.wireStart.y,overlay.cursor.x,overlay.cursor.y,0x7beed2,.048,.86);
    for(const e of world.entities.values()) {
      this.drawEntity(e,overlay.selected.has(e.data.id),a,b);
      if(e.data.type==='electric-lamp' && e.node?.out.active) {
        const p=e.body.getPosition();this.overlays.circle(p.x,p.y,Number(e.data.config.range??5)).fill({color:0xffd398,alpha:.05+Number(e.node.out.brightness)*.018});
      }
    }
    for(const effect of world.effects) this.overlays.circle(effect.x,effect.y,effect.size).fill({color:effect.color,alpha:effect.time/effect.max});
    for(const beam of world.beams) bar(this.overlays,beam.from.x,beam.from.y,beam.to.x,beam.to.y,beam.color,.055,Math.min(1,beam.time*7));
    overlay.stamps.forEach((item,i)=>{
      const g=this.ghostViews[i]??new Graphics();
      if(!this.ghostViews[i]) {this.ghostViews[i]=g;this.ghostLayer.addChild(g);}
      const width=item.def.width*item.scale,height=item.def.height*item.scale;
      drawObject(g,item.def,width,height,item.color);
      g.position.set(item.x,item.y);g.rotation=item.angle;g.alpha=.57;g.visible=true;
      g.rect(-width/2-.064,-height/2-.064,width+.128,height+.128).stroke({color:overlay.overlap?0xffae75:0x91ead6,width:.034,alpha:.95});
      bar(this.overlays,item.x-.17,item.y,item.x+.17,item.y,0x94e9d6,.024);
      bar(this.overlays,item.x,item.y-.17,item.x,item.y+.17,0x94e9d6,.024);
    });
    this.ghostViews.slice(overlay.stamps.length).forEach(g=>g.visible=false);
    if(overlay.marquee) {
      const {a,b}=overlay.marquee, x=Math.min(a.x,b.x), y=Math.min(a.y,b.y), sw=Math.abs(a.x-b.x), sh=Math.abs(a.y-b.y);
      this.overlays.rect(x,y,sw,sh).fill({color:0x87dec8,alpha:.13}).stroke({color:0x87dec8,width:.035,alpha:.9});
    }
    this.weather.clear();
    if(world.settings.weather!=='clear') for(let i=0;i<54;i++) {
      const x=(noise(i)*w+world.time*(world.settings.wind+10)+w*100)%w,y=(noise(i+242)*h+world.time*(world.settings.weather==='rain'?235:30))%h;
      if(world.settings.weather==='rain') bar(this.weather,x,y,x-4,y+13,0x94c0e2,1,.26);
      else this.weather.circle(x,y,1.2+noise(i+33)).fill({color:0xddedfc,alpha:.43});
    }
    this.app.render();
  }
  private drawEntity(e:Entity,selected:boolean,min:Vector,max:Vector) {
    const {data,def,body}=e,p=body.getPosition();
    const width=def.width*data.scale,height=def.height*data.scale;
    const visible=p.x>=min.x-width-3&&p.x<=max.x+width+3&&p.y>=min.y-height-3&&p.y<=max.y+height+3;
    let view=this.views.get(data.id);
    if(!view) {
      view={root:new Graphics(),parts:[],style:''};this.objects.addChild(view.root);this.views.set(data.id,view);
    }
    const v=view;
    v.root.visible=visible;v.parts.forEach(g=>g.visible=visible);
    if(v.text)v.text.visible=visible;
    if(!visible) return;
    const style=[data.type,data.scale,data.color,data.frozen,e.parts.length,selected].join('/');
    if(v.style!==style) {
      drawObject(v.root,def,width,height,data.color);
      if(selected) v.root.rect(-width/2-.09,-height/2-.09,width+.18,height+.18).stroke({color:0xa3f0dc,width:.04,alpha:.96});
      if(data.frozen) v.root.circle(width/2-.02,-height/2+.02,.048).fill(0xe2eab7);
      v.parts.forEach(g=>g.destroy());v.parts=[];
      e.parts.forEach(part=>{
        const g=new Graphics();drawObject(g,def,part.w,part.h,data.color,part.art);this.objects.addChild(g);v.parts.push(g);
      });
      v.style=style;
    }
    v.root.position.set(p.x,p.y);v.root.rotation=body.getAngle();v.root.alpha=data.opacity;
    e.parts.forEach((part,i)=>{const g=v.parts[i],q=part.body.getPosition();g.position.set(q.x,q.y);g.rotation=part.body.getAngle();g.alpha=data.opacity;});
    if(def.art==='display' || data.config.readout!==undefined) {
      if(!v.text) {v.text=new Text({text:'',style:{fontFamily:'monospace',fontSize:24,fill:0xbbefd7}});v.text.anchor.set(.5);this.objects.addChild(v.text);}
      v.text.text=String(data.config.readout??'');
      v.text.scale.set(.005);v.text.position.set(p.x,p.y);v.text.rotation=body.getAngle();
    }
    if(selected&&(data.type==='motion-sensor'||data.type==='laser-sensor')) {
      const r=Number(data.config.range??5),angle=body.getAngle();
      if(data.type==='laser-sensor') {
        const end={x:p.x+Math.cos(angle)*r,y:p.y+Math.sin(angle)*r};
        bar(this.overlays,p.x,p.y,end.x,end.y,0xf38a7c,.035,.8);
      } else {
        const half=Number(data.config.cone??90)*Math.PI/360;
        this.overlays.moveTo(p.x,p.y).arc(p.x,p.y,r,angle-half,angle+half).closePath().fill({color:0x86e5cc,alpha:.14}).stroke({color:0x86e5cc,width:.028,alpha:.57});
      }
    }
  }
}

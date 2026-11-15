'use strict';
(() => {
  const G=window.TDC,W=G.width,H=G.height;
  const cache=new Map(), TAU=Math.PI*2;
  const seeded=seed=>()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296;};
  const ellipse=(c,x,y,rx,ry,color)=>{c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);c.fillStyle=color;c.fill();};
  const stroked=(c,fill,stroke='#292a27',width=2.5)=>{c.fillStyle=fill;c.fill();c.strokeStyle=stroke;c.lineWidth=width;c.stroke();};
  function polygon(c,pts) {
    c.beginPath();pts.forEach(({x,y},i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();
  }
  function shape(c,s) {
    if(s.polygon)return polygon(c,s.polygon);
    c.beginPath();
    if(s.r)c.arc(s.x,s.y,s.r,0,TAU);else c.rect(s.x,s.y,s.w,s.h);
  }
  function path(c,points) {
    c.beginPath();points.forEach(({x,y},i)=>i?c.lineTo(x,y):c.moveTo(x,y));
  }
  function drawZone(c,z,fill,outline) {shape(c,z);stroked(c,fill,outline,4);}
  function tree(c,x,y,r,stone=false) {
    ellipse(c,x+4,y+7,r*1.13,r*.7,'#1823264a');
    const rng=seeded(x*293+y*691);
    c.beginPath();
    for(let i=0;i<10;i++){const a=i*TAU/10,rr=r*(.78+rng()*.22);c[i?'lineTo':'moveTo'](x+Math.cos(a)*rr,y+Math.sin(a)*rr*.8);}
    c.closePath();stroked(c,stone?'#9c8d82':'#3d7855',stone?'#63554d':'#28573f',2);
    c.beginPath();c.ellipse(x-r*.21,y-r*.3,r*.58,r*.36,-.3,0,TAU);c.fillStyle=stone?'#c2ada0':'#63a66c';c.fill();
    ellipse(c,x+r*.21,y-r*.31,r*.19,r*.16,stone?'#d8b99c':'#83bc71');
  }
  function bake(map,paths,reverse) {
    const key=map.id+(reverse?'/r':'');
    if(cache.has(key))return cache.get(key);
    const ground=document.createElement('canvas');ground.width=W;ground.height=H;
    const c=ground.getContext('2d');
    const [light,dark,road,edge,water]=map.theme;
    const waterWorld=map.land.length>0;
    const grad=c.createLinearGradient(0,0,W*.42,H);
    grad.addColorStop(0,light);grad.addColorStop(1,dark);
    c.fillStyle=grad;c.fillRect(0,0,W,H);
    const rng=seeded([...map.id].reduce((a,b)=>a+b.charCodeAt(0),0));
    for(let i=0;i<1050;i++){
      const x=rng()*W,y=rng()*H;
      ellipse(c,x,y,1+rng()*6,1+rng()*2,i%2===0?'#ffffff21':'#29392b22');
    }
    if(!waterWorld)for(const s of map.waterZones)drawZone(c,s,water,'#49645e');
    for(const s of map.land)drawZone(c,s,map.id==='harbor_docks'?'#b18e69':'#efcf91','#79744e');
    for(const s of map.hazards){
      drawZone(c,s,'#c75938','#4b2833');
      for(let j=1;j<7;j++)ellipse(c,s.x,s.y,s.r*(1-j*.12),s.r*(1-j*.12),j%2?'#ed803e':'#dc6535');
    }
    for(const way of paths){
      c.lineJoin='round';c.lineCap='round';
      path(c,way);c.lineWidth=69;c.strokeStyle='#242e2d55';c.stroke();
      c.lineWidth=64;c.strokeStyle=edge;c.stroke();c.lineWidth=55;c.strokeStyle=road;c.stroke();
      c.setLineDash([1,32]);c.lineWidth=5;c.strokeStyle='#765e4445';c.stroke();c.setLineDash([]);
      for(const index of [0,way.length-2]){
        const a=way[index],b=way[index+1],end=index>0;
        const t=end?.75:.23,x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t;
        c.save();c.translate(x,y);c.rotate(Math.atan2(b.y-a.y,b.x-a.x));
        polygon(c,[{x:-12,y:-11},{x:5,y:0},{x:-12,y:11},{x:0,y:11},{x:17,y:0},{x:0,y:-11}]);c.fillStyle=end?'#a86541':'#8d6b47';c.fill();c.restore();
      }
    }
    for(const s of map.obstacles){
      if(s.r)tree(c,s.x,s.y,s.r,map.theme[0]!=='#8cc874');
      else {drawZone(c,s,'#a87055','#594639');c.fillStyle='#e5b881';c.fillRect(s.x+3,s.y+4,s.w-6,5);}
    }
    if(map.id==='meadow_loop'){
      for(const [x,y] of [[58,560],[62,700],[1090,618],[1150,718],[322,485],[343,519],[118,341],[914,124],[702,165],[271,768],[1045,270]]){
        for(let j=0;j<6;j++){const a=j*TAU/6;ellipse(c,x+Math.cos(a)*4,y+Math.sin(a)*4,3.2,3.2,j%2?'#f6ebaa':'#fff2c3');}ellipse(c,x,y,2.1,2.1,'#e88d4a');
      }
    }
    cache.set(key,ground);return ground;
  }
  function drawMap(c,map,paths,t=0,reverse=false) {
    c.drawImage(bake(map,paths,reverse),0,0);
    const waterWorld=map.land.length>0;
    if(waterWorld){
      c.save();for(let i=0;i<23;i++){const x=(i*311+t*(7+i%3))%W,y=(i*199+92)%H;
        if(map.land.some(s=>G.inShape?.(x,y,s)) || paths.some(p=>p.some((q,j)=>j>0&&G.segmentDistance?.(x,y,p[j-1],q)<39)))continue;
        ripple(c,x,y,8+i%15,t+i);
      }c.restore();
    }else for(const z of map.waterZones){
      c.save();shape(c,z);c.clip();
      if(z.r)for(let j=0;j<7;j++)ripple(c,z.x+(Math.sin(j*13)*z.r*.68),z.y+(Math.cos(j*13)*z.r*.62),8+j*2,t+j);
      else for(let j=0;j<24;j++)ripple(c,(j*311+t*8)%W,(j*199+92)%H,10+j%15,t+j);
      c.restore();
    }
  }
  function ripple(c,x,y,len,time){
    c.beginPath();c.moveTo(x-len,y);c.quadraticCurveTo(x,y+6,x+len,y);c.lineWidth=2.2;
    c.strokeStyle='rgba(203,243,255,'+(.18+.16*Math.sin(time*2)) + ')';c.stroke();
  }
  function drawEnemy(c,b) {
    const d=b.def,r=d.r;
    c.save();c.translate(b.x,b.y);
    if(d.blimp){
      c.rotate(b.angle||0);
      ellipse(c,0,10,r*1.34,r*.66,'#16222844');
      for(const y of [-1,1]){polygon(c,[{x:-r*.39,y:y*r*.39},{x:-r*1.11,y:y*r*.84},{x:-r*1.15,y:y*r*.35}]);stroked(c,'#d6e2df','#263442',3);}
      c.beginPath();c.ellipse(0,0,r*1.35,r*.64,0,0,TAU);
      const grad=c.createLinearGradient(0,-r,0,r);grad.addColorStop(0,d.color);grad.addColorStop(1,'#152639');
      stroked(c,grad,'#1f2637',4);
      c.beginPath();c.ellipse(r*.4,-r*.08,r*.37,r*.21,-.12,0,TAU);stroked(c,d.id==='ddt'?'#f3ad5a':'#b8e4de','#223747',2);
      c.strokeStyle=b.fort?'#e6ad68':'#dfeae5';c.lineWidth=b.fort?6:3;
      c.beginPath();c.ellipse(-r*.48,0,r*.17,r*.59,0,0,TAU);c.stroke();
      c.fillStyle='#f9edc9';c.font='bold '+Math.round(r*.27)+'px sans-serif';c.textAlign='center';c.fillText(d.id.toUpperCase(),-r*.04,r*.39);
      if(b.hp<b.maxHp*.5){path(c,[{x:7,y:-r*.6},{x:2,y:-5},{x:17,y:-2},{x:5,y:r*.52}]);c.strokeStyle='#311c22';c.lineWidth=3;c.stroke();}
    }else{
      ellipse(c,3,r*.68,r*.7,r*.27,'#21362c44');
      c.beginPath();c.moveTo(-4,r*.95);c.lineTo(-6,r*1.33);c.lineTo(7,r*1.31);c.lineTo(3,r*.95);c.closePath();stroked(c,d.color,'#422a2f',1.3);
      c.beginPath();
      if(b.regrow){c.moveTo(0,r);c.bezierCurveTo(-r*2,-r*.25,-r*.92,-r*1.85,0,-r*.64);c.bezierCurveTo(r*.92,-r*1.85,r*2,-r*.25,0,r);}
      else c.ellipse(0,0,r*.84,r*1.02,-.15,0,TAU);
      const gloss=c.createRadialGradient(-r*.38,-r*.55,1,0,0,r*1.35);
      gloss.addColorStop(0,'#fff9e4');gloss.addColorStop(.19,d.color);gloss.addColorStop(.67,d.color);gloss.addColorStop(1,'#302c43');
      if(d.id==='rainbow'){for(const [f,col] of [[.35,'#fed462'],[.47,'#6cce7f'],[.57,'#54a8ef'],[.75,'#a553d4']])gloss.addColorStop(f,col);}
      stroked(c,gloss,'#2c2939',1.7);
      c.save();c.clip();
      if(b.camo||d.id==='zebra'){
        for(let j=-2;j<3;j++){c.save();c.rotate(.45);ellipse(c,j%2?-5:4,j*r*.52,r*.98,r*(b.camo?.19:.12),b.camo?'#253d3577':'#2a2c39');c.restore();}
      }
      if(b.fort){c.fillStyle='#aab3ae';c.fillRect(-r,-3,r*2,7);c.fillStyle='#657079';c.fillRect(-r,2,r*2,3);}
      c.restore();ellipse(c,-r*.29,-r*.53,r*.14,r*.22,'#ffffff9f');
    }
    if(b.stun>0||b.slowTime>0)ellipse(c,0,r*1.07,r*.52,r*.07,b.stun>0?'#a8eeff':'#c2eb75');
    c.restore();
  }

  function towerEmblem(c,idx,f,color,rank,time) {
    const x=-f*.24,y=-f*.06;
    const mark=(icon,ink='#fff1cd')=>{
      c.save();c.translate(x,y);c.rotate(-.2);c.fillStyle=ink;c.font='bold '+Math.round(f*.69)+'px sans-serif';
      c.textAlign='center';c.textBaseline='middle';c.fillText(icon,0,0);c.restore();
    };
    const stripe=(y,a,b,width,col)=>{
      c.beginPath();c.moveTo(a,y);c.lineTo(b,y);c.strokeStyle=col;c.lineWidth=width;c.lineCap='round';c.stroke();
    };
    switch(idx){
      case 1:
        c.beginPath();c.arc(f*.65,f*.42,f*.62,.48,2.38);c.strokeStyle='#663425';c.lineWidth=8;c.stroke();c.strokeStyle='#f9c15e';c.lineWidth=4;c.stroke();break;
      case 2:mark('✸','#ffcd8b');break;
      case 3:ellipse(c,0,0,f*.42,f*.32,'#f18fa2');ellipse(c,0,-f*.09,f*.18,f*.07,'#fce4ca');break;
      case 4:mark('❄','#2b6c93');break;
      case 5:ellipse(c,-f*.54,0,f*.46,f*.57,'#e9af39');stripe(f*.05,-f*.84,-f*.27,3,'#fff285');break;
      case 6:stripe(-f*.24,0,f*1.28,3,'#193b36');ellipse(c,f*.51,-f*.25,f*.17,f*.16,'#91c28a');break;
      case 7:mark('◉','#a9f3ef');break;
      case 8:
        stripe(-f*.45,-f*.58,f*.34,3,'#ffe0a2');stripe(f*.47,-f*.58,f*.34,3,'#ffe0a2');mark('⚓','#e3b580');break;
      case 9:stripe(0,-f*.55,f*.37,5,'#ffd375');break;
      case 10:ellipse(c,f*.36,0,f*.24,f*.22,'#a4d8c5');break;
      case 11:mark('⊕');break;
      case 12:stripe(f*.27,f*.33,f*1.11,2.6,'#72dae0');stripe(-f*.27,f*.33,f*1.11,2.6,'#72dae0');break;
      case 13:
        polygon(c,[{x:-f*.85,y:-f*.45},{x:-f*.62,y:-f*1.16},{x:f*.24,y:-f*.7}]);stroked(c,'#7951b1','#483564',2);ellipse(c,f*1.03,f*.27,4.5,4.5,'#ffeab6');break;
      case 14:mark('◆','#fff2a1');stripe(f*.58,-f*.72,-f*.19,3,'#e25668');break;
      case 15:stripe(f*.15,-f*.29,f*.59,3,'#9d445a');mark('✥','#edd3a7');break;
      case 16:ellipse(c,f*.77,f*.46,5.5,6.5,'#96de68');ellipse(c,f*.75,f*.37,2.1,2.4,'#eafab4');break;
      case 17:mark('❋','#355a46');break;
      case 18:stripe(-f*.11,-f*.31,f*.29,3,'#f9e398');break;
      case 19:mark('✸','#d2e8e5');break;
      case 20:mark('⌂','#f7d288');break;
      case 21:mark('⚙','#4b4d3c');break;
      case 22:mark('♞','#d1e8ac');break;
      case 23:case 30:stripe(0,-f*.25,f*.36,4,idx===30?'#f4d67e':'#6bded5');break;
      default:if(idx>=24)mark(['⌘','◷','☼','♨','❆','✥'][idx-24],color);
    }
    if(rank>=4&&(idx===1||idx===14)){
      c.save();c.rotate(time*.65);ellipse(c,f*1.02,0,4.2,3.8,color);ellipse(c,-f*1.02,0,4.2,3.8,color);c.restore();
    }
  }
  function drawTower(c,t,time=0,scale=1) {
    const def=t.def,f=def.footprint,idx=def.index,tiers=t.tiers||[0,0,0],level=t.level||1;
    const rank=Math.max(...tiers,Math.floor(level/4)),angle=t.angle||0;
    const color=rank===5?'#ffe083':def.color;
    c.save();c.translate(t.x,t.y);c.scale(scale,scale);
    ellipse(c,3,f*.56,f*1.12,f*.56,'#17302d60');
    if(rank>=2){c.beginPath();c.ellipse(0,4,f*1.05,f*.81,0,0,TAU);stroked(c,'#fff2b52b',rank===5?'#fff1a6':'#26393877',2);}
    c.rotate(angle);
    if([2,3,7,8,9,10,11,12,18,19,20,23,30].includes(idx)){
      if(idx===18||idx===20){
        c.fillStyle='#694d35';c.fillRect(-f*.69,-f*.53,f*1.32,f*1.13);
        polygon(c,[{x:-f,y:0},{x:0,y:-f},{x:f,y:0},{x:f*.7,y:f*.46},{x:-f*.7,y:f*.46}]);stroked(c,color);
        c.fillStyle='#342e28';c.fillRect(-f*.22,0,f*.44,f*.48);
        c.strokeStyle='#f7d397';c.lineWidth=3;c.beginPath();c.moveTo(0,-f*.72);c.lineTo(f*.51,-f*.02);c.stroke();
      }else{
        c.beginPath();c.roundRect(-f*.82,-f*.64,f*1.47,f*1.27,f*.29);stroked(c,color);
        c.beginPath();c.roundRect(-f*.49,-f*.41,f*1.02,f*.82,6);stroked(c,'#3a4b54');
        if([9,10].includes(idx)){
          polygon(c,[{x:f*.78,y:0},{x:-f*.78,y:-f*.84},{x:-f*.34,y:0},{x:-f*.78,y:f*.84}]);stroked(c,color);
          if(idx===10){c.save();c.rotate(time*16);c.fillStyle='#dde7dcbb';c.fillRect(-f*1.3,-2,f*2.6,4);c.restore();}
        }else{
          const guns=idx===3?6:rank>=3?2:1;
          for(let j=0;j<guns;j++){
            c.save();if(idx===3)c.rotate(j*TAU/guns);
            const off=idx===3?0:(j-(guns-1)/2)*f*.36;
            c.beginPath();c.roundRect(f*.1,off-f*.17,f*(1.14+rank*.12),f*.34,3);stroked(c,rank>=4?'#fff0a2':'#adc4c5');c.restore();
          }
        }
      }
    }else{
      if(idx===22 && rank>=1){ellipse(c,f*.82,2,f*.55,f*.36,'#395d49');ellipse(c,f*1.12,1,f*.25,f*.28,'#78ac68');}
      ellipse(c,-f*.77,-f*.4,f*.39,f*.41,'#4b392e');ellipse(c,f*.56,-f*.56,f*.38,f*.4,'#4b392e');
      c.beginPath();c.ellipse(-f*.12,0,f*.72,f*.8,-.26,0,TAU);stroked(c,color);
      c.beginPath();c.ellipse(f*.14,f*.11,f*.53,f*.52,0,0,TAU);stroked(c,idx===4?'#c8eff2':'#e8b784','#62473e',1.6);
      ellipse(c,f*.2,-f*.08,f*.06,f*.113,'#222926');ellipse(c,f*.45,0,f*.067,f*.112,'#222926');
      if(rank>0||idx%3===0){c.beginPath();c.ellipse(-f*.2,-f*.48,f*.72,f*.38,-.17,0,TAU);stroked(c,rank>=4?'#e9bd53':'#254854','#243437',2);}
      if(rank>=3){polygon(c,[{x:-f*.76,y:-f*.58},{x:-f*.65,y:-f},{x:-f*.34,y:-f*.76},{x:-f*.04,y:-f*1.16},{x:f*.28,y:-f*.65}]);stroked(c,'#ffd775','#7f6330',2);}
      c.beginPath();c.lineWidth=rank>=3?7:4;c.lineCap='round';c.moveTo(f*.1,f*.44);c.lineTo(f*1.08,f*.23);c.strokeStyle=rank>=4?'#f9dda0':'#314755';c.stroke();
    }
    towerEmblem(c,idx,f,def.color,rank,time);
    if(t.boostUntil>time||rank>=4){c.rotate(-angle);c.beginPath();c.arc(0,0,f*1.25,time*2,time*2+1.8);c.strokeStyle=rank>=4?'#fff0a4':'#86ffd8';c.lineWidth=2;c.stroke();}
    c.restore();
  }
  function fit(canvas) {
    const ratio=Math.min(window.devicePixelRatio||1,2);
    const w=Math.round(W*ratio),h=Math.round(H*ratio);
    if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
    const c=canvas.getContext('2d');
    c.setTransform(w/W,0,0,h/H,0,0);return c;
  }
  function render(canvas,m,time) {
    const c=fit(canvas);
    drawMap(c,m.map,m.paths,m.time,m.mode==='reverse');
    for(const z of m.platforms)drawZone(c,z,z.terrain==='water'?'#5ebce3':'#bf986b','#5e633b');
    for(const trap of m.traps){ellipse(c,trap.x,trap.y,trap.r,trap.r*.37,trap.color||'#638e49a0');if(trap.stats.attack==='trap'){for(let i=0;i<5;i++){const x=trap.x+Math.cos(i*TAU/5)*trap.r*.5,y=trap.y+Math.sin(i*TAU/5)*trap.r*.3;polygon(c,[{x:x-3,y:y+4},{x:x+1,y:y-7},{x:x+4,y:y+4}]);c.fillStyle='#334149';c.fill();}}}
    for(const pickup of m.pickups){
      ellipse(c,pickup.x,pickup.y+9,17,8,'#1d3c3466');
      c.beginPath();c.roundRect(pickup.x-12,pickup.y-9-Math.max(0,(pickup.land||0)-m.time)*57,24,19,4);stroked(c,'#ffce52','#896230',2);
      c.fillStyle='#b5743b';c.fillRect(pickup.x-2,pickup.y-8-Math.max(0,(pickup.land||0)-m.time)*57,4,18);
    }
    if(m.selected){const t=m.selected;ellipse(c,t.x,t.y,t.stats.r,t.stats.r,'#27383d35');}
    for(const b of m.enemies)if(!b.dead)drawEnemy(c,b);

    for(const farmer of m.farmers){
      ellipse(c,farmer.x,farmer.y,15,12,'#99774a');
      ellipse(c,farmer.x,farmer.y-5,20,7,'#f5d66c');
      ellipse(c,farmer.x,farmer.y-10,11,7,'#edb94e');
    }
    for(const tower of m.towers){
      const airborne=tower.def.id==='heli_pilot'||tower.def.id==='fighter_ace';
      const mech=tower.mobileUntil>m.time;
      if(airborne||mech){
        ellipse(c,tower.x,tower.y,24,18,'#4a665a91');
        c.strokeStyle='#fbf4c99b';c.lineWidth=2;c.strokeRect(tower.x-13,tower.y-11,26,22);
        drawTower(c,{...tower,x:tower.attackX,y:tower.attackY-5},m.time,mech?1.46:1);
      }else drawTower(c,tower,m.time);
      if(m.bots.has(tower.id)){
        ellipse(c,tower.x-18,tower.y+14,8,8,'#415c64');ellipse(c,tower.x-18,tower.y+14,4,3,'#8feee8');
      }
    }
    for(const s of m.shots){c.save();c.translate(s.x,s.y);c.rotate(s.angle||0);ellipse(c,0,0,s.size*1.45,s.size,s.color);c.restore();}
    for(const v of m.effects){
      c.save();c.globalAlpha=Math.min(1,v.life/v.total);
      if(v.x2!==undefined){path(c,[{x:v.x,y:v.y},{x:v.x2,y:v.y2}]);c.strokeStyle=v.color;c.lineWidth=v.r;c.stroke();}
      else if(v.text){c.font='bold 17px Trebuchet MS';c.textAlign='center';c.fillStyle=v.color;c.fillText(v.text,v.x,v.y-(1-v.life/v.total)*27);}
      else{c.beginPath();c.arc(v.x,v.y,v.r*(.34+.7*(1-v.life/v.total)),0,TAU);c.lineWidth=3;c.strokeStyle=v.color;c.stroke();c.globalAlpha*=.23;c.fillStyle=v.color;c.fill();}
      c.restore();
    }
    if(m.place&&m.cursor.inside){
      const {x,y}=m.cursor,def=m.place.def,valid=G.canPlace(m,m.place,x,y);
      const r=m.place.stats?.r||m.place.r||28;
      if(r<1000)ellipse(c,x,y,r,r,valid?'rgba(76,175,80,.25)':'rgba(244,67,54,.35)');
      c.save();c.globalAlpha=.68;
      if(def)drawTower(c,{x,y,def,tiers:m.place.tiers},time);
      else{c.font='bold 32px sans-serif';c.textAlign='center';c.fillStyle=valid?'#fff0ac':'#ff927e';c.fillText(m.place.power.icon,x,y+8);}
      c.restore();
    }
  }
  function preview(canvas,map,t=0) {
    const c=canvas.getContext('2d');c.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);
    drawMap(c,map,map.paths,t);
  }
  function cover(canvas) {
    const c=fit(canvas),sky=c.createLinearGradient(0,70,0,650);
    sky.addColorStop(0,'#5daaba');sky.addColorStop(.65,'#a8d8bc');sky.addColorStop(1,'#f6d99a');
    c.fillStyle=sky;c.fillRect(0,0,W,H);
    ellipse(c,983,246,96,96,'#f6dd9a88');ellipse(c,983,246,62,62,'#ffe6a9');
    const wave=(y,color,steps)=>{c.beginPath();c.moveTo(0,y);for(const [a,b,d,e,f,g] of steps)c.bezierCurveTo(a,b,d,e,f,g);c.lineTo(W,H);c.lineTo(0,H);c.closePath();c.fillStyle=color;c.fill();};
    wave(435,'#588884',[[248,223,249,559,497,416],[729,218,720,562,973,400],[1048,337,1119,440,1200,354]]);
    wave(476,'#649d78',[[198,342,373,521,590,473],[776,431,883,590,1200,463]]);
    wave(602,'#5b925f',[[253,492,397,550,579,590],[780,634,891,476,1200,546]]);
    wave(699,'#3f7352',[[163,557,277,752,551,646],[817,526,1029,674,1200,584]]);
    c.lineCap='round';c.beginPath();c.moveTo(375,800);c.bezierCurveTo(612,668,878,678,906,576);c.bezierCurveTo(928,519,1092,505,1194,522);
    c.strokeStyle='#53604b';c.lineWidth=62;c.stroke();c.strokeStyle='#d8ad78';c.lineWidth=46;c.stroke();
    const rng=seeded(8181);
    for(let i=0;i<120;i++){const x=rng()*W,y=515+rng()*285;ellipse(c,x,y,2+rng()*8,1+rng()*3,i%2?'#bce38b70':'#305f476a');}
    for(const [x,y,r] of [[1154,560,32],[1096,595,19],[670,640,28],[604,625,23],[1149,695,54],[1069,704,35],[516,541,25],[359,644,52]])tree(c,x,y,r);
    for(const [id,x,y,sc,ang,tiers] of [['dart_thrower',704,587,2.83,-.54,[2,0,0]],['bomb_cannon',963,583,2.33,-2.1,[0,3,0]],['ninja_assassin',853,694,2.9,-.9,[0,0,3]],['ice_emitter',1045,640,1.57,-1.4,[0,2,0]]])
      drawTower(c,{def:G.towers[id],x,y,angle:ang,tiers},0,sc);
    for(const [id,x,y,k,a,mod] of [['red',844,324,2.4,-.2,{}],['yellow',919,348,1.8,.2,{}],['blue',789,376,1.6,.2,{regrow:true}],['purple',1034,394,1.5,.2,{}],['moab',1040,284,1.61,-.15,{}],['green',964,423,1.45,0,{camo:true}],['pink',713,345,1.7,-.4,{}]]){
      c.save();c.translate(x,y);c.scale(k,k);drawEnemy(c,{def:G.bloons[id],x:0,y:0,angle:a,...mod});c.restore();
    }
    c.strokeStyle='#fff2bdab';c.lineWidth=5;c.setLineDash([12,14]);c.beginPath();c.moveTo(724,550);c.quadraticCurveTo(799,423,851,369);c.moveTo(934,557);c.quadraticCurveTo(859,491,936,395);c.stroke();c.setLineDash([]);
  }
  G.render={render,preview,cover};
})();

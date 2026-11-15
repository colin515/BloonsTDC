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
  function waterAt(map,x,y){
    return map.waterZones.some(z=>G.inShape?.(x,y,z))&&!map.land.some(z=>G.inShape?.(x,y,z));
  }
  function bridge(c,map,way){
    for(let i=1;i<way.length;i++){
      const a=way[i-1],b=way[i],dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy);
      if(!len)continue;
      c.save();c.translate(a.x,a.y);c.rotate(Math.atan2(dy,dx));
      for(let d=0;d<len;d+=10){
        if(!waterAt(map,a.x+dx*d/len,a.y+dy*d/len))continue;
        const w=Math.min(11,len-d+1);
        c.fillStyle='#19374774';c.fillRect(d+2,-39,w,82);
        c.fillStyle=d%40<20?'#b77b48':'#cf9255';c.fillRect(d,-31,w,62);
        c.fillStyle='#6f4430';c.fillRect(d,-31,1,62);
        for(const y of [-34,32]){
          c.fillStyle='#503522';c.fillRect(d,y,w,5);
          if(d%40===0){c.fillRect(d-2,y-4,8,12);ellipse(c,d+2,y+1,2,2,'#e0bd71');}
        }
      }
      c.restore();
    }
  }
  function gate(c,way,exit){
    const a=exit?way.at(-2):way[0],b=exit?way.at(-1):way[1],dx=b.x-a.x,dy=b.y-a.y,l=Math.hypot(dx,dy);
    const edge=exit?b:a;
    let x=edge.x,y=edge.y;
    if(x<25||x>W-25||y<25||y>H-25){
      const sign=exit?-1:1;
      for(let d=0;d<l;d+=8){
        x=edge.x+sign*dx/l*d;y=edge.y+sign*dy/l*d;
        if(x>28&&x<W-28&&y>28&&y<H-28)break;
      }
    }
    c.save();c.translate(x,y);c.rotate(Math.atan2(dy,dx));
    ellipse(c,3,5,18,40,'#18292365');
    for(const side of [-1,1]){
      c.fillStyle='#524840';c.fillRect(-14,side*36-6,28,12);
      c.fillStyle='#9c9385';c.fillRect(-13,side*36-6,26,6);
      ellipse(c,0,side*36,5,5,exit?'#f06a3f':'#9efa7b');
    }
    c.fillStyle=exit?'#a93e28':'#556774';c.fillRect(-12,-31,6,62);
    c.fillStyle=exit?'#f6b256':'#c0ff90';
    polygon(c,[{x:-18,y:-9},{x:-8,y:0},{x:-18,y:9},{x:-11,y:9},{x:0,y:0},{x:-11,y:-9}]);c.fill();
    c.restore();
  }
  function decorate(c,map,paths,rng){
    const clear=(x,y,r)=>!paths.some(p=>p.some((b,j)=>j>0&&G.segmentDistance?.(x,y,p[j-1],b)<r+42))&&!map.obstacles.some(z=>G.inShape?.(x,y,z,r));
    for(let i=0;i<95;i++){
      const x=25+rng()*(W-50),y=20+rng()*(H-40),r=9+rng()*16;
      const wet=waterAt(map,x,y);
      if(!clear(x,y,r)||map.hazards.some(z=>G.inShape?.(x,y,z,r)))continue;
      if(wet){
        if(map.id==='abyssal_archipelago'&&i%3===0){
          ellipse(c,x,y,r*1.3,r*.6,'#1a8fb088');for(let n=0;n<5;n++)ellipse(c,x+n*4-8,y+Math.sin(n)*5,3,5,'#e4849e82');
        }
        continue;
      }
      if(map.id==='desert_canyon'){
        if(i%4===0){ellipse(c,x,y+8,r,r*.49,'#74452a48');for(let n=0;n<4;n++)ellipse(c,x,y-n*r*.19,r*(1-n*.14),r*.32,n%2?'#ac6748':'#d98e59');}
        else{c.lineCap='round';c.strokeStyle='#5d8b59';c.lineWidth=6;c.beginPath();c.moveTo(x,y+9);c.lineTo(x,y-15);c.moveTo(x-7,y-6);c.lineTo(x-7,y);c.lineTo(x+7,y);c.lineTo(x+7,y-9);c.stroke();}
      }else if(map.id==='harbor_docks'){
        if(i%4===0){c.fillStyle='#64412d';c.fillRect(x-9,y-6,19,19);c.fillStyle='#d6a468';c.fillRect(x-8,y-9,16,16);c.strokeStyle='#805030';c.lineWidth=2;c.strokeRect(x-7,y-8,13,13);}
        else{c.beginPath();c.ellipse(x,y,6,3,0,0,TAU);c.strokeStyle='#695343';c.lineWidth=2;c.stroke();}
      }else if(map.id==='volcano_caldera'){
        polygon(c,[{x:x-r,y:y+9},{x:x-5,y:y-r},{x:x+5,y:y-r*.8},{x:x+r,y:y+5}]);stroked(c,'#51414f','#38313e',2);
        if(i%3===0){c.beginPath();c.moveTo(x-14,y+10);c.lineTo(x-20,y+15);c.lineTo(x-12,y+21);c.strokeStyle='#dd744866';c.stroke();}
      }else if(map.id==='quad_nexus'&&i%5===0){
        tree(c,x,y,r*.78,true);c.strokeStyle='#9cfde0';c.lineWidth=2;c.strokeRect(x-4,y-9,7,8);
      }else if(map.id==='abyssal_archipelago'){
        ellipse(c,x,y,r,r*.39,'#a387514a');c.strokeStyle='#845839';c.lineWidth=5;c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x-4,y-10,x+3,y-18);c.stroke();
        for(let j=0;j<6;j++){const a=j*TAU/6;ellipse(c,x+3+Math.cos(a)*7,y-18+Math.sin(a)*6,6,3,j%2?'#478a56':'#75b66c');}
      }else if(i%6===0){
        ellipse(c,x,y+8,r,r*.43,'#294f3456');c.fillStyle='#7d5c38';c.fillRect(x-4,y-3,8,14);tree(c,x,y-11,r*.85);
      }else{
        for(let n=0;n<4;n++)ellipse(c,x+Math.cos(n*1.7)*4,y+Math.sin(n*1.7)*4,3.2,2.8,i%3===0?'#fff3b0':'#75ad58');
      }
    }
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
      c.lineWidth=70;c.strokeStyle=edge;c.stroke();c.lineWidth=62;c.strokeStyle=road;c.stroke();c.lineWidth=50;c.strokeStyle='#ffe2a759';c.stroke();
      c.setLineDash([1,32]);c.lineWidth=5;c.strokeStyle='#765e4445';c.stroke();c.setLineDash([]);
      for(const index of [0,way.length-2]){
        const a=way[index],b=way[index+1],end=index>0;
        const t=end?.75:.23,x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t;
        c.save();c.translate(x,y);c.rotate(Math.atan2(b.y-a.y,b.x-a.x));
        polygon(c,[{x:-12,y:-11},{x:5,y:0},{x:-12,y:11},{x:0,y:11},{x:17,y:0},{x:0,y:-11}]);c.fillStyle=end?'#a86541':'#8d6b47';c.fill();c.restore();
      }
    }
    for(const way of paths)bridge(c,map,way);
    decorate(c,map,paths,rng);
    for(const way of paths){gate(c,way,false);gate(c,way,true);}
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
      for(const side of [-1,1]){
        const yy=side*r*.31,flame=.7+.25*Math.sin((b.distance||0)*.6+side);
        ellipse(c,-r*1.29,yy,Math.max(1,r*.34*flame),r*.11,'#ffb34eb8');
        ellipse(c,-r*1.4,yy,2,r*.23*Math.abs(Math.sin((b.distance||0)*.22+side))+1,'#e2f7eac0');
      }
      if(b.hp<b.maxHp){c.save();c.rotate(-(b.angle||0));c.fillStyle='#422b24';c.fillRect(-r*.8,-r-14,r*1.6,7);c.fillStyle='#8eda53';c.fillRect(-r*.8+1,-r-13,Math.max(0,(r*1.6-2)*b.hp/b.maxHp),5);c.restore();}
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
    if(b.frozen&&b.stun>0&&!d.blimp){
      polygon(c,[{x:-r,y:-r*.8},{x:r*.45,y:-r*1.23},{x:r*1.04,y:-r*.45},{x:r*.9,y:r},{x:-r*.71,y:r*.88}]);
      stroked(c,'#b3e5fc64','#e7fcffaf',2);path(c,[{x:r*.45,y:-r*1.23},{x:r*.18,y:r*.82},{x:-r*.83,y:.2*r}]);c.strokeStyle='#d7faff93';c.stroke();
    }
    if(b.glued&&b.slowTime>0)for(let i=0;i<4;i++)ellipse(c,(i-1.5)*r*.35,r*(.17+Math.sin(i*2)*.45),r*.21,r*.28,'#f1d445bd');
    if(d.id==='ceramic'&&b.hp<b.maxHp)for(let i=0;i<Math.ceil((1-b.hp/b.maxHp)*4);i++){
      path(c,[{x:-r*.5+i*4,y:-r*.6},{x:-r*.28+i*4,y:-r*.22},{x:-r*.51+i*4,y:r*.1}]);c.strokeStyle='#603629';c.lineWidth=1.5;c.stroke();
    }
    if(b.stun>0||b.slowTime>0)ellipse(c,0,r*1.07,r*.52,r*.07,b.stun>0?'#a8eeff':'#c2eb75');
    c.restore();
  }

  function towerEmblem(c,idx,f,color,rank,time) {
    const x=-f*.24,y=-f*.06;
    const mark=(_icon,ink='#fff1cd')=>{
      c.save();c.translate(x,y);c.rotate(-.2);
      const corners=idx%4+4;
      polygon(c,Array.from({length:corners*2},(_,i)=>{const a=i*Math.PI/corners,rad=f*(i%2?.11:.27);return {x:Math.cos(a)*rad,y:Math.sin(a)*rad};}));
      stroked(c,ink,'#2a2925',1);c.restore();
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
    if(!t.level||idx<24){
      const main=tiers.indexOf(Math.max(...tiers)),n=tiers[main];
      if(n>=3)pathArmor(c,idx,main,n,f,time);
    }
    if(t.boostUntil>time||rank>=4){c.rotate(-angle);c.beginPath();c.arc(0,0,f*1.25,time*2,time*2+1.8);c.strokeStyle=rank>=4?'#fff0a4':'#86ffd8';c.lineWidth=2;c.stroke();}
    c.restore();
  }
  function pathArmor(c,idx,pathIndex,n,f,time){
    const color=['#ffdb75','#84e4ff','#c29bec'][pathIndex];
    c.beginPath();c.lineWidth=n-1;c.arc(0,0,f*(.91+n*.075),time*.66+pathIndex,time*.66+pathIndex+Math.PI*1.35);c.strokeStyle=color;c.stroke();
    if(pathIndex===0){
      for(let j=0;j<n-1;j++){
        const y=(j-(n-2)/2)*f*.32;
        polygon(c,[{x:-f*.95,y:y-f*.18},{x:-f*1.44,y},{x:-f*.95,y:y+f*.18}]);stroked(c,color,'#674321',1.5);
      }
      if(idx===0){path(c,[{x:-f*.6,y:f*.65},{x:f*.04,y:-f*.5},{x:f*1.1,y:-f*.45}]);c.lineWidth=5;c.strokeStyle='#956441';c.stroke();ellipse(c,f*1.1,-f*.45,f*.22,f*.22,'#6d8191');}
      if(idx===1||idx===14)for(let j=0;j<3;j++){const a=time*3+j*TAU/3;ellipse(c,Math.cos(a)*f*1.45,Math.sin(a)*f*1.45,f*.21,f*.12,color);}
    }else if(pathIndex===1){
      for(const side of [-1,1]){c.beginPath();c.roundRect(-f*.12,side*f*.47-f*.11,f*(.69+n*.15),f*.22,3);stroked(c,'#688392','#253746',2);ellipse(c,f*(.57+n*.15),side*f*.47,f*.13,f*.10,idx===1?'#ff835f':color);}
      c.beginPath();c.roundRect(-f*.12,-f*.19,f*.58,f*.25,3);stroked(c,color,'#27445e',1.5);
    }else{
      polygon(c,[{x:-f*.23,y:-f*.72},{x:-f*1.35,y:-f*.8},{x:-f*1.22,y:0},{x:-f*1.46,y:f*.8},{x:-f*.20,y:f*.64}]);stroked(c,idx===14?'#181926':'#443957','#262331',2);
      for(const side of [-1,1]){path(c,[{x:f*.33,y:0},{x:f*.92,y:side*f*.63},{x:f*1.22,y:side*f*.35}]);c.strokeStyle=color;c.lineWidth=3;c.stroke();}
    }
  }
  function flightPad(c,t,time){
    c.save();c.translate(t.x,t.y);
    if(t.def.id==='fighter_ace'){
      c.beginPath();c.roundRect(-32,-18,64,36,4);stroked(c,'#50585b','#37434b',3);
      c.fillStyle='#f3cd5f';for(let x=-15;x<18;x+=10)c.fillRect(x,-1,6,2);
      c.fillStyle='#f0f3de';for(const x of [-25,18])for(let y=-12;y<=10;y+=5)c.fillRect(x,y,7,2);
      for(const y of [-17,17])for(const x of [-22,0,22])ellipse(c,x,y,2,2,'#ffe195');
      c.fillStyle='#54483a';c.fillRect(30,-29,2,17);polygon(c,[{x:32,y:-29},{x:45,y:-27+Math.sin(time*7)*4},{x:45,y:-24+Math.sin(time*7)*4},{x:32,y:-22}]);c.fillStyle='#f48f3e';c.fill();
    }else{
      ellipse(c,0,3,28,25,'#26393875');c.beginPath();c.arc(0,0,24,0,TAU);stroked(c,'#737f79','#424b4d',3);
      c.fillStyle='#ffe07d';c.fillRect(-9,-10,4,19);c.fillRect(5,-10,4,19);c.fillRect(-7,-2,15,4);
    }
    c.restore();
  }
  function aircraft(c,t,time){
    const heli=t.def.id==='heli_pilot',rank=Math.max(...t.tiers);
    ellipse(c,t.attackX+7,t.attackY+14,27,13,'#1b34374f');
    c.save();c.translate(t.attackX,t.attackY-7);c.rotate(t.angle||0);c.scale(1,1+(t.bankAngle||0));
    if(heli){
      for(const y of [-12,12]){path(c,[{x:-17,y},{x:11,y},{x:17,y:y*.7}]);c.lineWidth=2.5;c.strokeStyle='#333d43';c.stroke();}
      polygon(c,[{x:4,y:-5},{x:-32,y:-3},{x:-40,y:1},{x:-33,y:5},{x:10,y:7}]);stroked(c,'#657b58','#374b43',2);
      c.beginPath();c.ellipse(1,0,19,12,0,0,TAU);stroked(c,t.def.color,'#453b33',2);
      ellipse(c,9,-1,9,7,'#93d8df');ellipse(c,18,3,5,4,'#414c55');
      c.save();c.rotate(time*25);ellipse(c,0,0,30,29,'#e0f0e83d');ellipse(c,0,0,27,2,'#e0f0e8b0');ellipse(c,0,0,2,26,'#e0f0e8b0');c.restore();
      ellipse(c,-33,0,5,5,'#edf4e18d');
    }else{
      polygon(c,[{x:7,y:0},{x:-8,y:-27},{x:-15,y:-25},{x:-13,y:0},{x:-15,y:25},{x:-8,y:27}]);stroked(c,'#7ea8af','#314955',2);
      polygon(c,[{x:-13,y:0},{x:-23,y:-12},{x:-27,y:-8},{x:-25,y:8},{x:-21,y:12}]);stroked(c,'#407281','#2d4654',2);
      c.beginPath();c.ellipse(0,0,26,6.6,0,0,TAU);stroked(c,t.def.color,'#384c56',2);
      ellipse(c,7,-.6,10,3.8,'#d1f3ef');
      for(const side of [-1,1]){ellipse(c,-8,side*18,5,4,'#bf5d42');ellipse(c,-8,side*18,2.2,2.1,'#f8e9ba');}
      if(rank>=4)for(const y of (rank>=5?[-16,-9,9,16]:[-11,11])){ellipse(c,-8,y,9,4,'#526b78');ellipse(c,-15,y,3,2.8,'#ffc358');}
      else ellipse(c,23,0,2.6,Math.abs(Math.sin(time*30))*13+3,'#f1e9bda3');
    }
    c.restore();
  }
  function beast(c,t,time){
    const pathIndex=t.tiers.indexOf(Math.max(...t.tiers)),rank=Math.max(...t.tiers),phase=time*3+t.id;
    const origin=t.companion||{x:t.x+24,y:t.y};
    const x=origin.x+Math.cos(phase)*12,y=origin.y+Math.sin(phase)*8;
    const k=.7+rank*.17;
    c.save();c.translate(x,y);c.scale(k,k);
    ellipse(c,4,8,15,5,'#25363560');
    if(pathIndex===0&&rank){
      ellipse(c,0,0,19,7,'#388ca8');polygon(c,[{x:-5,y:0},{x:3,y:-13},{x:8,y:0}]);stroked(c,'#76b7b6','#315969',1.5);
      polygon(c,[{x:12,y:-1},{x:20,y:4},{x:9,y:5}]);stroked(c,'#e2e8d8','#365965',1);
    }else if(pathIndex===2){
      const flap=12+4*Math.sin(time*14);polygon(c,[{x:-2,y:1},{x:-20,y:-flap},{x:-22,y:1},{x:0,y:9},{x:20,y:1},{x:20,y:-flap},{x:4,y:1}]);stroked(c,'#936346','#5e4e3b',2);
      ellipse(c,3,-1,5,4,'#ffe6a7');
    }else{
      ellipse(c,-1,0,13,7,'#5fa45c');ellipse(c,9,-6,7,5,'#bdd083');
      polygon(c,[{x:-3,y:2},{x:-23,y:6},{x:-12,y:-1}]);stroked(c,'#638e52','#385d40',1);
      c.fillStyle='#334538';c.fillRect(0,3,4,8);c.fillRect(8,2,3,7);
    }
    c.restore();
  }
  function drawShot(c,s,time){
    c.save();c.translate(s.x,s.y);c.rotate(s.angle||0);
    const id=s.owner.def.id, tail=s.blast?19:s.stats.velocity>650?18:9;
    const glow=c.createLinearGradient(-tail,0,4,0);glow.addColorStop(0,'#ffffff00');glow.addColorStop(1,s.color);
    c.fillStyle=glow;c.fillRect(-tail,-1,tail,2);
    if(s.blast){ellipse(c,-12+(time*8)%3,0,7,3,'#a7a49b8a');ellipse(c,0,0,7,3.7,'#c3583c');ellipse(c,5,-.2,2,2.4,'#f5d087');}
    else if(id==='ninja_assassin'||s.stats.attack==='arc'){
      c.rotate(time*22);const count=id==='ninja_assassin'?4:3;polygon(c,Array.from({length:count*3},(_,i)=>{const a=i*TAU/(count*3),r=i%3===1?7:2.3;return {x:Math.cos(a)*r,y:Math.sin(a)*r};}));stroked(c,'#d9e6df','#485963',1);
    }else if(s.stats.type==='cold'||id==='ice_emitter'){
      polygon(c,[{x:-5,y:-2},{x:7,y:0},{x:-3,y:3},{x:0,y:0}]);stroked(c,'#d4faff','#598fa5',1);
    }else if(['plasma','energy','fire'].includes(s.stats.type)){
      ellipse(c,0,0,7,4,s.color);ellipse(c,1,0,3,2,'#fff7b2');
    }else{
      path(c,[{x:-4,y:0},{x:5,y:0}]);c.lineWidth=2;c.strokeStyle='#e8e1bc';c.stroke();
      polygon(c,[{x:-4,y:0},{x:-7,y:-3},{x:-9,y:0},{x:-7,y:3}]);c.fillStyle=s.color;c.fill();
    }
    c.restore();
  }
  function portrait(canvas,def,tiers,time=0,podium=false){
    if(!def)return;
    const c=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
    c.clearRect(0,0,w,h);
    if(podium){
      ellipse(c,w*.5,h*.81,w*.31,h*.12,'#28584455');
      ellipse(c,w*.5,h*.78,w*.29,h*.105,'#a37e45');
      ellipse(c,w*.5,h*.73,w*.30,h*.101,'#efc46d');
      ellipse(c,w*.5,h*.705,w*.26,h*.067,'#738083');
    }
    if(def.footprint){const scale=Math.min(w,h)/(def.footprint*(podium?3.7:2.8));
      drawTower(c,{def,tiers,x:w*.50,y:h*(podium?.51:.51)+Math.sin(time*2.6)*2.6,angle:podium?-.34:0},time,scale);
      return;
    }
    c.save();c.translate(w/2,h/2);c.scale(w/144,h/106);
    c.beginPath();c.roundRect(-24,-17,48,33,6);stroked(c,def.color||'#a67a4e','#62452d',3);
    c.fillStyle='#ffe09b';c.fillRect(-21,-9,42,4);c.fillRect(-4,-1,8,11);
    if(def.id==='portable_pool'||def.id==='time_stop'){ellipse(c,0,0,22,14,'#88e1ef');ellipse(c,0,0,16,8,'#4d9dcc');}
    if(def.id==='super_monkey_storm'||def.id==='tech_bot'){polygon(c,[{x:2,y:-18},{x:-10,y:2},{x:-2,y:2},{x:-4,y:16},{x:11,y:-5},{x:3,y:-5}]);stroked(c,'#ffe47d','#91663c',1.5);}
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
    c.save();
    if(m.visual?.shake&&m.shakeUntil>m.time)c.translate(Math.sin(m.time*91)*4,Math.cos(m.time*74)*3);
    if(m.visual?.ranges)for(const t of m.towers){if(t.stats.r<700)ellipse(c,t.x,t.y,t.stats.r,t.stats.r,'#e7f9e518');}
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
        if(airborne){flightPad(c,tower,m.time);aircraft(c,tower,m.time);}
        else drawTower(c,{...tower,x:tower.attackX,y:tower.attackY-5},m.time,1.46);
      }else drawTower(c,tower,m.time);
      if(tower.def.id==='beast_handler')beast(c,tower,m.time);
      const indicators=[tower.buff?.camo||tower.buff?.type,tower.buff?.damage>0,tower.boostUntil>m.time||tower.ultra,tower.buff?.popBonus];
      indicators.forEach((active,i)=>{if(active){const x=tower.x-13+i*9,y=tower.y-tower.def.footprint-12;
        ellipse(c,x,y,5,5,['#5ed4ed','#bd95ff','#ffd458','#a4f67a'][i]);ellipse(c,x,y,2,2,'#2d4640');}});
      if(m.bots.has(tower.id)){
        ellipse(c,tower.x-18,tower.y+14,8,8,'#415c64');ellipse(c,tower.x-18,tower.y+14,4,3,'#8feee8');
      }
    }
    for(const shot of m.shots)drawShot(c,shot,m.time);
    for(const v of m.effects){
      c.save();c.globalAlpha=Math.min(1,v.life/v.total);
      if(v.x2!==undefined){path(c,[{x:v.x,y:v.y},{x:v.x2,y:v.y2}]);c.strokeStyle=v.color;c.lineWidth=v.r;c.stroke();
        if(v.r<=5&&m.visual?.quality!=='low'){c.beginPath();c.moveTo(v.x,v.y);for(let j=1;j<5;j++){const k=j/5;c.lineTo(v.x+(v.x2-v.x)*k,v.y+(v.y2-v.y)*k+Math.sin(j*21+time*30)*5);}c.lineTo(v.x2,v.y2);c.lineWidth=1;c.strokeStyle='#fff9df';c.stroke();}}
      else if(v.text){c.font='bold 17px Trebuchet MS';c.textAlign='center';c.fillStyle=v.color;c.fillText(v.text,v.x,v.y-(1-v.life/v.total)*27);}
      else{c.beginPath();c.arc(v.x,v.y,v.r*(.34+.7*(1-v.life/v.total)),0,TAU);c.lineWidth=3;c.strokeStyle=v.color;c.stroke();c.globalAlpha*=.23;c.fillStyle=v.color;c.fill();}
      c.restore();
    }
    const t=m.selected;
    if(t&&['mortar_battery','gatling_gunner'].includes(t.def.id)){
      const a=m.aiming&&m.cursor.inside?m.cursor:t.aim||(m.cursor.inside?m.cursor:{x:t.x+65,y:t.y});
      c.beginPath();c.arc(a.x,a.y,18+Math.sin(time*5)*3,0,TAU);c.moveTo(a.x-29,a.y);c.lineTo(a.x+29,a.y);c.moveTo(a.x,a.y-29);c.lineTo(a.x,a.y+29);c.strokeStyle='#ffe16c';c.lineWidth=2;c.stroke();
    }
    if(t&&m.sacrificePreview){
      for(const other of m.towers){
        if(other===t||other.hero||m.sacrificePreview==='farm'&&other.def.id!=='banana_farm')continue;
        const radius=m.sacrificePreview==='sun'?145:G.towerStats(t.def,[t.tiers[0],t.tiers[1],5]).r;
        if(Math.hypot(other.x-t.x,other.y-t.y)>=radius)continue;
        c.beginPath();c.arc(other.x,other.y,other.def.footprint+7+Math.sin(time*8)*3,0,TAU);c.strokeStyle='#ffe577';c.lineWidth=5;c.stroke();
      }
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
    c.restore();
  }
  function preview(canvas,map,t=0) {
    const c=canvas.getContext('2d');c.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);
    drawMap(c,map,map.paths,t);
  }
  function cover(canvas,time=0) {
    const c=fit(canvas),sky=c.createLinearGradient(0,70,0,650);
    sky.addColorStop(0,'#31a9f2');sky.addColorStop(.65,'#b5edfc');sky.addColorStop(1,'#f6dfad');
    c.fillStyle=sky;c.fillRect(0,0,W,H);
    for(let i=0;i<5;i++){const x=(i*293+time*(12+i*2))%1460-130,y=140+i%3*39;for(let j=0;j<4;j++)ellipse(c,x+j*22,y+Math.sin(j)*11,29,16,'#eeffffde');}
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
    for(const [x,y,r] of [[1154,560,32],[1096,595,19],[670,640,28],[604,625,23],[1149,695,54],[1069,704,35],[516,541,25],[359,644,52]])tree(c,x+Math.sin(time*1.8+x)*2.5,y,r);
    for(const [id,x,y,sc,ang,tiers] of [['dart_thrower',704,587,2.83,-.54,[2,0,0]],['bomb_cannon',963,583,2.33,-2.1,[0,3,0]],['ninja_assassin',853,694,2.9,-.9,[0,0,3]],['ice_emitter',1045,640,1.57,-1.4,[0,2,0]]])
      drawTower(c,{def:G.towers[id],x,y,angle:ang+Math.sin(time*2+x)*.3,tiers},time,sc);
    for(const [id,x,y,k,a,mod] of [['red',844,324,2.4,-.2,{}],['yellow',919,348,1.8,.2,{}],['blue',789,376,1.6,.2,{regrow:true}],['purple',1034,394,1.5,.2,{}],['moab',1040,284,1.61,-.15,{}],['green',964,423,1.45,0,{camo:true}],['pink',713,345,1.7,-.4,{}]]){
      c.save();c.translate(600+(x-600+time*(21+k*4))%560,y+Math.sin(time*1.4+x)*17);c.scale(k,k);drawEnemy(c,{def:G.bloons[id],x:0,y:0,angle:a,...mod});c.restore();
    }
    for(let i=0;i<8;i++){
      const q=(time*.115+i*.116)%1,k=1-q;
      const x=k*k*k*375+3*k*k*q*612+3*k*q*q*878+q*q*q*906;
      const y=k*k*k*799+3*k*k*q*668+3*k*q*q*678+q*q*q*576;
      const kind=['red','green','blue','yellow'][i%4];
      drawEnemy(c,{x,y:y-11,def:G.bloons[kind],camo:i%5===0,regrow:i%5===1});
      const hit=(time*1.6+i*.13)%1;
      if(hit>.87){c.beginPath();c.arc(x,y-11,10+hit*17,0,TAU);c.strokeStyle='#fff3c8ad';c.lineWidth=2;c.stroke();}
    }
    for(let j=0;j<9;j++){const f=(time*1.3+j*.16)%1,x=715+j%3*102+f*Math.cos(j)*81,y=594-f*210;
      drawShot(c,{x,y,angle:-Math.PI*.42,color:['#f6e9a5','#f39b50','#d3c0f7'][j%3],stats:{velocity:650},owner:{def:G.towerList[j%3===2?15:0]},blast:j%3===1},time);}
    c.strokeStyle='#fff2bdab';c.lineWidth=5;c.setLineDash([12,14]);c.beginPath();c.moveTo(724,550);c.quadraticCurveTo(799,423,851,369);c.moveTo(934,557);c.quadraticCurveTo(859,491,936,395);c.stroke();c.setLineDash([]);
  }
  G.render={render,preview,cover,portrait,drawTower};
})();

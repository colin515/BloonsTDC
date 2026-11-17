import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Vec2} from 'planck';
import {catalogManifest} from '../src/catalog';
import {ForgeWorld} from '../src/world';
import {isSignal, sampleWires, port, type Node} from '../src/signals';
import {validateProgram, ProgramRunner, type Program} from '../src/program';
import {verifySnapshot} from '../src/persistence';

const tick=(w:ForgeWorld,n:number)=>{for(let i=0;i<n;i++)w.step(1/60);};
test('every catalog part instantiates, including 37 devices and 16 vehicles',()=>{
  assert.equal(catalogManifest.length,205);
  assert.equal(new Set(catalogManifest.map(d=>d.id)).size,205);
  const w=new ForgeWorld();
  for(const [i,d] of catalogManifest.entries()) assert.ok(w.spawn(d.id,{x:(i%21)*6-60,y:Math.floor(i/21)*-5},0,true),d.id);
  assert.equal(w.nodes.size,37);
  assert.equal(catalogManifest.filter(d=>d.family==='Vehicles').length,16);
  assert.doesNotThrow(()=>tick(w,15));
});
test('anchored transform is exact while a dynamic object falls and collides',()=>{
  const w=new ForgeWorld(),a=w.spawn('steel-cube',{x:0,y:0})!,b=w.spawn('wood-beam',{x:4.25,y:2.25},.4,true)!;
  tick(w,90);
  assert.ok(a.body.getPosition().y>7&&a.body.getPosition().y<9);
  assert.deepEqual(b.body.getPosition(),Vec2(4.25,2.25));assert.equal(b.body.getAngle(),.4);
});
test('anchoring, damage, gravity and collisions are independent',()=>{
  const w=new ForgeWorld(),a=w.spawn('wood-cube',{x:0,y:0},0,true)!,b=w.spawn('glass-panel',{x:4,y:0})!;
  w.damage(a,100);assert.equal(w.entities.has(a.data.id),false);
  b.data.invincible=true;w.damage(b,100);assert.equal(w.entities.has(b.data.id),true);
  w.property(b,'collision',false);tick(w,92);assert.ok(b.body.getPosition().y>9);
  w.property(b,'gravity',false);b.body.setLinearVelocity(Vec2());const y=b.body.getPosition().y;tick(w,10);assert.equal(b.body.getPosition().y,y);
});
test('seven typed signal families and stable fan-out',()=>{
  const sample=[['boolean',true],['number',0],['text','hi'],['event',{event:3}],['object',{ref:'a'}],['vector',{x:3,y:5}],['power',12]] as const;
  for(const [kind,value] of sample)assert.ok(isSignal(kind,value));
  assert.equal(isSignal('number',Infinity),false);assert.equal(isSignal('object','raw'),false);
  const a:Node={id:'a',inputs:[],outputs:[port('out')],out:{out:true}};
  const b:Node={id:'b',inputs:[port('in')],outputs:[],out:{}};
  const c:Node={...b,id:'c'};
  const wiring=[{from:'a',output:'out',to:'b',input:'in'},{from:'a',output:'out',to:'c',input:'in'}];
  assert.equal(sampleWires(new Map([['a',a],['b',b],['c',c]]),wiring).get('c')?.in,true);
});
test('delete and undo restore joints and wires without rewinding other objects',()=>{
  const w=new ForgeWorld(),a=w.spawn('switch',{x:0,y:0},0,true)!,b=w.spawn('electric-lamp',{x:1,y:0},0,true)!,c=w.spawn('wood-beam',{x:8,y:0})!;
  w.connect(w.makeLink(a.data.id,b.data.id,'Weld',a.body.getPosition(),a.body.getPosition())!);
  w.wire({from:a.data.id,output:'active',to:b.data.id,input:'enable'});
  w.edit(()=>w.remove(a.data.id));assert.equal(w.links.size,0);assert.equal(w.wires.length,0);
  tick(w,15);const y=c.body.getPosition().y;
  w.undo();assert.equal(w.links.size,1);assert.equal(w.wires.length,1);assert.equal(c.body.getPosition().y,y);
  w.undo(true);assert.equal(w.wires.length,0);
});
test('motion filter drives the door leaf while the frame stays anchored',()=>{
  const w=new ForgeWorld();
  w.settings.gravity=0;
  const sensor=w.spawn('motion-sensor',{x:0,y:0},0,true)!,door=w.spawn('automatic-door',{x:8,y:0},0,true)!,block=w.spawn('wood-cube',{x:1,y:0})!;
  sensor.data.config.filter='melon';
  w.wire({from:sensor.data.id,output:'detected',to:door.data.id,input:'open'});
  block.body.setLinearVelocity(Vec2(1,0));tick(w,20);
  assert.equal(sensor.node!.out.detected,false);
  const melon=w.spawn('melon',{x:1.8,y:0})!;melon.body.setLinearVelocity(Vec2(.8,0));
  tick(w,79);
  assert.equal(sensor.node!.out.detected,true);assert.equal(door.node!.out.open,true);
  assert.ok(door.parts[0].body.getPosition().y<-2.8);assert.equal(door.body.getPosition().y,0);
});
test('pressure plate, wireless handshake, power load, and alarm events work independently of audio playback',()=>{
  const w=new ForgeWorld();
  const plate=w.spawn('pressure-plate',{x:0,y:8.9},0,true)!;
  const tx=w.spawn('wireless-transmitter',{x:2,y:3},0,true)!;
  const rx=w.spawn('wireless-receiver',{x:4,y:3},0,true)!;
  const alarm=w.spawn('alarm-speaker',{x:5,y:3},0,true)!;
  const battery=w.spawn('battery',{x:6,y:2},0,true)!;
  const monitor=w.spawn('sound-sensor',{x:5,y:1},0,true)!;
  monitor.data.config.filter='alarm';alarm.data.config.requirePower=true;
  w.spawn('steel-cube',{x:0,y:8.06});
  w.wire({from:plate.data.id,output:'detected',to:tx.data.id,input:'data'});
  w.wire({from:rx.data.id,output:'data',to:alarm.data.id,input:'play'});
  w.wire({from:battery.data.id,output:'power',to:alarm.data.id,input:'power'});
  tick(w,22);
  assert.equal(rx.node!.out.data,true);assert.equal(alarm.node!.out.active,true);
  assert.ok(Number(battery.node!.out.level)<100);
  assert.ok((monitor.node!.out.heard as {event:number}).event>0);
});
test('counter uses event tokens once and logic gates switch subtypes',()=>{
  const w=new ForgeWorld(),timer=w.spawn('timer',{x:0,y:2},0,true)!,counter=w.spawn('counter',{x:1,y:2},0,true)!,gate=w.spawn('logic-gate',{x:2,y:2},0,true)!;
  Object.assign(timer.data.config,{duration:.22,repeat:false,on:true});
  w.wire({from:timer.data.id,output:'done',to:counter.data.id,input:'pulse'});
  gate.data.config.gate='NOR';tick(w,60);
  assert.equal(counter.node!.out.count,1);assert.equal(gate.node!.out.active,true);
  gate.data.config.gate='AND';tick(w,5);assert.equal(gate.node!.out.active,false);
});
test('temperature circuitry warms a selected target',()=>{
  const w=new ForgeWorld(),sample=w.spawn('steel-cube',{x:0,y:5},0,true)!;
  const sensor=w.spawn('temperature-sensor',{x:-1,y:5},0,true)!,heater=w.spawn('heater',{x:1,y:5},0,true)!;
  sample.data.temp=9;sensor.data.config.filter='steel-cube';heater.data.config.target=37;
  w.wire({from:sensor.data.id,output:'cold',to:heater.data.id,input:'enable'});tick(w,150);
  assert.ok(sample.data.temp>=17.5);assert.equal(heater.node!.out.active,false);
});
test('fluid transfer preserves volume, valve input gates the pump',()=>{
  const w=new ForgeWorld('water'),pump=w.spawn('water-pump',{x:0,y:7.8},0,true)!,valve=w.spawn('electric-valve',{x:2,y:6},0,true)!;
  Object.assign(pump.data.config,{on:true,intakeX:-2.2,intakeY:1.8,outletX:3,outletY:1});
  valve.data.config.opening=0;
  w.wire({from:valve.data.id,output:'opening',to:pump.data.id,input:'opening'});tick(w,9);
  const before=w.fluid.save().filter(c=>c.x>=3).reduce((sum,c)=>sum+c.amount,0);
  valve.data.config.opening=100;tick(w,120);
  const after=w.fluid.save().filter(c=>c.x>=3).reduce((sum,c)=>sum+c.amount,0);
  assert.ok(after>before+1);
});
test('spawner uses a configurable batch, team, cap and inherited destination',()=>{
  const w=new ForgeWorld(),spawner=w.spawn('melon-spawner',{x:0,y:7},0,true)!;
  Object.assign(spawner.data.config,{on:true,quantity:10,cap:10,team:'Builders',goalX:19});tick(w,6);
  const batch=[...w.entities.values()].filter(e=>e.def.family==='Characters');
  assert.equal(batch.length,10);assert.ok(batch.every(e=>e.data.config.team==='Builders'&&e.data.config.goalX===19));
  assert.equal(new Set(batch.map(e=>e.body.getPosition().x)).size,10);
});
test('four maps and complete scene snapshot survive a round trip',()=>{
  for(const map of ['classic','industrial','water','moon'] as const) {
    const w=new ForgeWorld(map),p=w.spawn('melon',{x:3,y:2})!,s=w.spawn('switch',{x:5,y:2},0,true)!,l=w.spawn('electric-lamp',{x:6,y:2},0,true)!;
    p.data.config.task='Walk To';p.data.config.goalX=12;
    w.wire({from:s.data.id,output:'active',to:l.data.id,input:'enable'});tick(w,10);
    const parsed=JSON.parse(JSON.stringify(w.snapshot()));
    assert.ok(verifySnapshot(parsed),map);
    const loaded=new ForgeWorld();loaded.load(parsed);
    assert.equal(loaded.map.id,map);assert.equal(loaded.wires.length,1);assert.equal(loaded.entities.get(p.data.id)?.data.config.goalX,12);assert.equal(loaded.entities.get(p.data.id)?.parts.length,9);
  }
  const invalid=new ForgeWorld().snapshot();invalid.settings.aiRate=0;assert.equal(verifySnapshot(invalid),false);
});
test('bounded visual programs yield at waits and abort runaway loops',()=>{
  const yes={op:'literal',value:true} as const,no={op:'literal',value:false} as const;
  const program:Program={event:'start',input:'',steps:[{op:'write',name:'open',value:yes},{op:'wait',name:'',value:{op:'literal',value:3}},{op:'write',name:'open',value:no}]};
  assert.equal(validateProgram(program),true);const runner=new ProgramRunner(program);
  runner.step(0,{});assert.equal(runner.outputs.open,true);
  runner.step(2.9,{});assert.equal(runner.outputs.open,true);
  runner.step(3.1,{});assert.equal(runner.outputs.open,false);
  const runaway=new ProgramRunner({event:'cycle',input:'',steps:[{op:'while',value:yes,body:[]}]});
  for(let i=0;i<170;i++)runaway.step(i/60,{});
  assert.match(runaway.error,/quota exceeded/);
  assert.equal(validateProgram({event:'cycle',input:'x',steps:[3]}),false);
});

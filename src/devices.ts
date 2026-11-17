import { Vec2, type RevoluteJoint, type WheelJoint } from 'planck';
import type { Entity, ForgeWorld, Setting } from './world';
import { port, sampleWires, type Kind, type Port, type Signal, type Vector } from './signals';
import { ProgramRunner, validateProgram } from './program';

type Field = {id: string; label: string; value: Setting; min?: number; max?: number; step?: number; options?: string[]};
const field = (id: string, label: string, value: Setting, min?: number, max?: number, step?: number): Field => ({id, label, value, min, max, step});
const choice = (id: string, label: string, value: string, options: string[]): Field => ({id, label, value, options});
const num = (id: string) => port(id, 'number');
const text = (id: string) => port(id, 'text');
const event = (id: string) => port(id, 'event');
const object = (id: string) => port(id, 'object');
const vector = (id: string) => port(id, 'vector');
const power = port('power', 'power');
const enable = port('enable');
const active = port('active');
const detected = port('detected');
const trigger = port('trigger');
const channel = field('channel', 'Channel', 'forge');
const range = field('range', 'Radius (m)', 5, .25, 120, .25);
const commonSensors = [range, field('filter', 'Type, family or team', ''), field('los', 'Line of sight', false), field('delay', 'Reaction delay (s)', 0, 0, 20, .1), field('cooldown', 'Cooldown (s)', 0, 0, 20, .1), field('latch', 'Latch after detection', false)];
const targetOutputs = [detected, num('count'), object('object'), num('distance'), num('speed'), vector('position')];
const pipe=object('tank');
const powered = field('requirePower', 'Require wired power', false);
type Device = {inputs: Port[]; outputs: Port[]; settings: Field[]};
const device = (inputs: Port[], outputs: Port[], settings: Field[] = []): Device => ({inputs, outputs, settings});
const source = [power, num('level'), port('running')];
const types: Record<string, Device> = {
  battery: device([enable, power], source, [field('capacity','Capacity (energy)',100,1,5000,1), field('charge','Initial charge (%)',100,0,100,1), field('watts','Maximum output',12,1,120,1), field('infinite','Infinite charge',false)]),
  generator: device([enable, num('request')], source, [field('watts','Output',28,1,180,1), field('capacity','Fuel capacity',100,1,5000,1), field('infinite','Infinite fuel',true)]),
  'solar-panel': device([], [power,num('light')], [field('watts','Rated output',14,1,100,1), field('efficiency','Efficiency',.85,0,1,.05)]),
  switch: device([port('set')], [active,event('changed')], [field('on','On',false)]),
  'push-button': device([], [active,event('pressed')], [field('duration','Press duration (s)',.5,.05,15,.05)]),
  'pressure-plate': device([], [...targetOutputs,num('weight')], [...commonSensors,field('weight','Minimum mass',.15,0,500,.05)]),
  'motion-sensor': device([], targetOutputs, [...commonSensors,field('cone','Cone (degrees)',90,10,360,1),field('minimum','Minimum speed',.12,0,100,.01),field('maximum','Maximum speed',100,0,150,1)]),
  'laser-sensor': device([], targetOutputs, [...commonSensors,field('glass','Pass through glass',false)]),
  'sound-sensor': device([], [detected,event('heard'),num('intensity'),text('category'),vector('position')], [...commonSensors,field('minimum','Minimum loudness',.15,0,1,.05)]),
  'temperature-sensor': device([], [num('temperature'),port('hot'),port('cold'),object('object')], [...commonSensors,field('minimum','Cold below (°C)',18,-100,700,1),field('maximum','Hot above (°C)',25,-100,900,1),field('ambient','Measure ambient',false)]),
  'light-sensor': device([], [num('light'),port('dark'),active], [range,field('threshold','Light threshold',.5,0,5,.05)]),
  'fire-smoke-sensor': device([], [detected,port('flame'),num('smoke')], commonSensors),
  'fluid-sensor': device([], [detected,num('level'),num('fluid')], [...commonSensors,field('minimum','Minimum level',.12,0,1,.05)]),
  'speed-sensor': device([], targetOutputs, [...commonSensors,field('angular','Angular speed',false),field('minimum','Threshold',0,0,100,.1)]),
  'collision-sensor': device([], [...targetOutputs,event('hit'),num('force')], [...commonSensors,field('minimum','Minimum impact',.25,0,400,.05)]),
  timer: device([enable,port('reset'),port('pause')], [active,event('done'),num('remaining')], [field('duration','Duration (s)',2,.05,600,.05),field('repeat','Repeat',true),field('on','Autostart',false)]),
  counter: device([port('increment'),port('decrement'),port('reset'),{...event('pulse')}], [num('count'),port('maximum')], [field('initial','Initial value',0,-1000,1000,1),field('step','Increment',1,-100,100,1),field('min','Minimum',0,-1000,1000,1),field('max','Maximum',100,0,10000,1),field('wrap','Wrap at limits',false)]),
  'logic-controller': device([enable,port('sensor'),num('distance'),num('temperature'),num('value'),text('message'),event('signal'),object('object'),vector('position'),power], [port('open'),enable,num('value'),text('message'),port('error')], []),
  'memory-register': device([num('value'),text('text'),port('state'),object('ref'),vector('vector'),port('write'),port('reset')], [num('value'),text('text'),port('state'),object('ref'),vector('vector'),event('changed')], [field('initial','Initial number',0,-9999,9999,1)]),
  'automatic-door': device([port('open'),port('close'),port('lock'),power], [port('open'),port('closed'),port('moving'),port('blocked')], [powered,field('on','Manual open',false),field('speed','Travel speed',3,.25,15,.25),field('travel','Travel (m)',3,.5,10,.1),choice('direction','Direction','Up',['Up','Left','Right']),field('locked','Locked',false)]),
  'electric-motor': device([enable,num('rpm'),port('brake'),power], [active,num('rpm'),num('load')], [powered,field('rpm','RPM',120,-900,900,5),field('force','Torque',35,1,500,1)]),
  'piston-actuator': device([enable,num('target'),power], [active,num('extension'),port('at-target')], [powered,field('travel','Travel (m)',1.6,0,8,.1),field('speed','Extension speed',2,.1,12,.1)]),
  heater: device([enable,num('target'),power], [active,num('temperature'),port('ready')], [powered,range,field('target','Target (°C)',310,-30,800,1),field('rate','Transfer rate',2,.1,12,.1)]),
  cooler: device([enable,num('target'),power], [active,num('temperature'),port('ready')], [powered,range,field('target','Target (°C)',-12,-100,100,1),field('rate','Transfer rate',2,.1,12,.1)]),
  electromagnet: device([enable,num('force'),power], [active,num('count')], [powered,range,field('force','Attraction force',50,-250,250,1)]),
  'conveyor-belt': device([enable,num('speed'),power], [active,num('speed')], [powered,field('speed','Surface speed',3,-18,18,.1)]),
  'water-pump': device([enable,num('flow'),num('opening'),object('intake'),object('outlet'),power], [active,num('flow'),port('dry')], [powered,field('flow','Flow (cells/s)',6,0,100,.1),field('intakeX','Intake X offset',-1.5,-25,25,.1),field('intakeY','Intake Y offset',.5,-25,25,.1),field('outletX','Outlet X offset',3.5,-25,25,.1),field('outletY','Outlet Y offset',.5,-25,25,.1)]),
  'fluid-tank':device([], [pipe,num('level'),num('volume'),num('fluid')], [field('capacity','Capacity (cells)',22,1,120,1),field('volume','Current volume',0,0,120,.1),field('fluidType','Liquid code',0,0,5,1),field('spill','Spill when tipped',true)]),
  'flow-pipe':device([pipe,enable,num('opening')], [pipe,active], [field('on','Open',true)]),
  'fluid-drain':device([pipe,enable], [active,num('drained')], [field('on','Open',true),field('flow','Drain rate',8,.1,80,.1)]),
  'electric-valve': device([enable,num('opening'),power], [active,num('opening')], [powered,field('opening','Opening (%)',100,0,100,1)]),
  'electric-fan': device([enable,num('speed'),power], [active,num('airflow')], [powered,range,field('speed','Airflow',7,-50,50,.1)]),
  'digital-display': device([num('value'),text('text'),enable,power], [active], [powered,field('units','Units',''),field('decimals','Decimals',1,0,6,1)]),
  'alarm-speaker': device([enable,port('play'),power], [active], [powered,field('volume','Loudness',.7,0,1,.05),field('interval','Repeat interval',1,.1,20,.1)]),
  'wireless-transmitter': device([enable,port('data'),num('value'),text('text'),vector('position'),object('object'),event('pulse'),power], [active,num('receivers')], [powered,channel,range]),
  'wireless-receiver': device([enable,power], [active,port('data'),num('value'),text('text'),vector('position'),object('object'),event('pulse'),num('quality')], [powered,channel,range,field('timeout','Timeout (s)',.5,0,20,.1)]),
  'melon-spawner': device([enable,trigger,num('batch'),vector('destination'),power], [active,num('spawned'),num('count'),event('failed')], [powered,field('quantity','Batch size',1,1,100,1),field('interval','Interval (s)',3,.2,120,.1),field('cap','Active cap',40,1,100,1),field('repeat','Repeat',false),field('character','Character item ID','melon'),field('team','Team','Workers'),field('goalX','Walk to X',8,-105,105,.1),field('speed','Walking speed',2.7,.25,8,.1),field('ai','Active AI',true)]),
  'electric-lamp': device([enable,num('brightness'),power], [active,num('brightness')], [powered,field('brightness','Brightness',1,0,5,.05),range]),
  'explosion-detector': device([], [detected,event('blast'),num('intensity'),num('distance'),vector('position')], commonSensors),
  'logic-gate': device([port('a'),port('b'),num('value')], [active,num('value')], [choice('gate','Gate','AND',['AND','OR','NOT','XOR','NAND','NOR','Comparator','Threshold','Inverter']),field('threshold','Threshold',.5,-9999,9999,.1)]),
};
export function devicePorts(type: string) {
  const d = types[type]; return {inputs: d?.inputs ?? [], outputs: d?.outputs ?? []};
}
export const deviceSchema = (type: string) => types[type]?.settings ?? [];
const runners = new WeakMap<Entity, {raw: string; runner: ProgramRunner}>();
export const runnerFor = (e: Entity) => runners.get(e)?.runner;
const distance = (a: Vector,b: Vector) => Math.hypot(a.x - b.x, a.y - b.y);
const bounded = (x: number,min: number,max: number) => Math.max(min,Math.min(max,x));
const position = (p: Vector) => ({x:p.x,y:p.y});
function matching(e: Entity, filter: string) {
  if (!filter.trim()) return true;
  const tags = [e.def.id, e.def.family, e.def.material, e.data.name, e.data.tags, e.data.config.team ?? ''].join(' ').toLowerCase();
  return filter.toLowerCase().split(',').some(part => part.trim() && tags.includes(part.trim()));
}

export function updateDevices(world: ForgeWorld, dt: number) {
  const inputMap = sampleWires(world.nodes, world.wires);
  const wireless = [...world.entities.values()].filter(e => e.data.type === 'wireless-transmitter' && e.node?.out.active);
  const prior = new Map([...world.nodes].map(([id,n]) => [id,n.out]));
  for (const e of world.entities.values()) {
    if (!e.node) continue;
    const {data, body, runtime} = e;
    const spec = types[data.type], p = body.getPosition();
    const input: Record<string, Signal> = inputMap.get(data.id) ?? {};
    const out: Record<string, Signal> = Object.create(null);
    const setting = (id: string, fallback: Setting = 0) => data.config[id] ?? spec.settings.find(f => f.id === id)?.value ?? fallback;
    const n = (id: string, fallback = 0) => Number(setting(id, fallback));
    const s = (id: string, fallback = '') => String(setting(id, fallback));
    const b = (id: string, fallback = false) => Boolean(setting(id, fallback));
    const requested = (id: string, fallback: number) => typeof input[id] === 'number' ? Number(input[id]) : fallback;
    const on = Boolean(input.enable ?? data.config.on ?? false);
    const tank = (name: string) => { const v=input[name]; const x=typeof v==='object' && 'ref' in v ? world.entities.get(v.ref) : undefined; return x?.data.type==='fluid-tank' ? x : undefined; };
    const enabled = input.enable !== false && data.config.enabled !== false;
    const supplied = Number(input.power ?? 0);
    const working = enabled && (!b('requirePower') || supplied >= .5);
    const radius = n('range', 5);
    const events = (id: string, test: unknown) => {
      const prev = runtime['e-' + id] ?? 0;
      if (test && !runtime['edge-' + id]) runtime['e-' + id] = prev + 1;
      runtime['edge-' + id] = test ? 1 : 0;
      out[id] = {event: runtime['e-' + id] ?? 0};
    };
    const periodic = (name: string, volume = .34, interval = .38) => {
      if (world.time < (runtime['snd-' + name] ?? 0)) return;
      world.sound(name, p, volume, 'machines'); runtime['snd-' + name] = world.time + interval;
    };
    const edge = (id: string, v: unknown) => {
      const state = typeof v === 'object' && v && 'event' in v ? Number(v.event) : v ? 1 : 0;
      const prev = runtime['in-' + id] ?? 0;
      runtime['in-' + id] = state;
      return state !== 0 && prev !== state;
    };
    const candidates = (test: (x: Entity) => boolean = () => true) => world.findNear(p, radius, data.id)
      .filter(x => matching(x, s('filter')) && test(x) && (!b('los') || !world.ray(p,x.body.getPosition(),data.id,x.data.id)))
      .sort((a,c) => distance(p,a.body.getPosition()) - distance(p,c.body.getPosition()));
    const observe = (condition: boolean) => {
      if (!condition) delete runtime.detectAt;
      else runtime.detectAt ??= world.time;
      if (condition && world.time - runtime.detectAt >= n('delay') && (runtime.detected || world.time >= (runtime.ready ?? 0))) runtime.detected = 1;
      else if (runtime.detected && !condition && !b('latch')) { runtime.detected = 0; runtime.ready = world.time + n('cooldown'); }
      out.detected = !!runtime.detected;
    };
    const measure = (items: Entity[], speed?: number) => {
      const nearest = items[0];
      observe(!!nearest);
      out.count = items.length;
      out.distance = nearest ? distance(p,nearest.body.getPosition()) : radius;
      out.speed = speed ?? nearest?.body.getLinearVelocity().length() ?? 0;
      if (nearest) { out.object = {ref:nearest.data.id}; out.position = position(nearest.body.getPosition()); }
    };
    const angle = body.getAngle();
    const end = (length: number) => ({x:p.x + Math.cos(angle) * length,y:p.y + Math.sin(angle) * length});
    switch (data.type) {
      case 'battery': case 'generator': {
        const capacity = n('capacity'), generator = data.type === 'generator';
        runtime.energy ??= Number(data.config.storedEnergy ?? (generator ? capacity : capacity * n('charge') / 100));
        const outgoing = world.wires.filter(w => w.from === data.id && w.output === 'power');
        const consumers = outgoing.filter(w => world.entities.get(w.to)?.node?.out.active).length;
        runtime.energy = bounded(runtime.energy + dt * (generator ? 0 : supplied * .85) - (enabled ? dt * consumers * (generator ? .75 : 1.25) : 0),0,capacity);
        data.config.storedEnergy = runtime.energy;
        out.power = enabled && (b('infinite') || runtime.energy > .02) ? Math.min(n('watts'), requested('request', n('watts'))) / Math.max(1,outgoing.length) : 0;
        out.level = runtime.energy / capacity * 100;
        out.running = Number(out.power) > 0;
        if (generator && consumers && out.running) periodic('generator',.26,.7);
        break;
      }
      case 'solar-panel':
        out.light = world.settings.daylight;
        out.power = Math.max(0, world.settings.daylight * Math.cos(angle) * n('watts') * n('efficiency')); break;
      case 'switch':
        out.active = Boolean(input.set ?? data.config.on); events('changed',out.active); break;
      case 'push-button':
        if (runtime.pressUntil !== undefined && world.time >= runtime.pressUntil) data.config.on = false;
        out.active = on; events('pressed',on); break;
      case 'pressure-plate': {
        const items = candidates(x => {
          const q = x.body.getPosition();
          return Math.abs(q.x - p.x) < e.def.width * data.scale * .61 && q.y < p.y && p.y - q.y < x.def.height * x.data.scale * .6 + (x.def.family === 'Characters' ? 1.45 : .3);
        });
        out.weight = items.reduce((total,x) => total + x.body.getMass(),0);
        measure(Number(out.weight) >= n('weight') ? items : []);
        break;
      }
      case 'motion-sensor':
        measure(candidates(x => {
          const q = x.body.getPosition(), speed = x.body.getLinearVelocity().length();
          const direction = Math.atan2(q.y-p.y,q.x-p.x)-angle;
          return speed >= n('minimum') && speed <= n('maximum') && Math.abs(Math.atan2(Math.sin(direction),Math.cos(direction))) <= n('cone') * Math.PI / 360;
        })); break;
      case 'laser-sensor': {
        const hit = world.ray(p,end(radius),data.id,undefined,b('glass'));
        const target = world.entities.get(hit?.id ?? '');
        measure(target && matching(target,s('filter')) ? [target] : []);
        if (hit && (!target || matching(target,s('filter')))) { out.distance = hit.distance; out.position = hit.pos; observe(true); }
        break;
      }
      case 'sound-sensor': case 'explosion-detector': {
        const min = n('minimum',.15);
        const sound = world.sounds.findLast(z => z.x !== undefined && z.y !== undefined && z.serial > (runtime.soundSerial ?? 0) && (data.type === 'sound-sensor' || z.name === 'burst') && (!s('filter') || (z.name + ' ' + z.group).includes(s('filter'))) && z.level >= min && distance(p,{x:z.x,y:z.y}) <= radius);
        const eventId = data.type === 'sound-sensor' ? 'heard' : 'blast';
        if (sound) { runtime.soundSerial = sound.serial; runtime.soundTime = world.time; }
        observe(runtime.soundTime !== undefined && world.time - runtime.soundTime < .16);
        out[eventId] = {event:runtime.soundSerial ?? 0};
        if (sound) { out.intensity = sound.level; out.category = sound.name; out.position = {x:sound.x!,y:sound.y!}; out.distance = distance(p,out.position); }
        break;
      }
      case 'temperature-sensor': {
        const target = b('ambient') ? undefined : candidates()[0];
        out.temperature = target?.data.temp ?? world.settings.temp;
        out.hot = out.temperature > n('maximum'); out.cold = out.temperature < n('minimum');
        if (target) out.object = {ref:target.data.id};
        break;
      }
      case 'light-sensor':
        out.light = world.settings.daylight + candidates(x => x.data.type === 'electric-lamp').reduce((v,x) => v + Number(prior.get(x.data.id)?.brightness ?? 0) / (1 + distance(p,x.body.getPosition())),0);
        out.active = out.light >= n('threshold'); out.dark = !out.active; break;
      case 'fire-smoke-sensor':
        out.flame = candidates(x => !!x.runtime.burning).length > 0;
        out.smoke = world.fluid.save().filter(c => c.type === 7 && distance(p,{x:c.x * .5,y:c.y * .5}) <= radius).reduce((sum,c) => sum + c.amount,0);
        observe(out.flame || Number(out.smoke) > .1); break;
      case 'fluid-sensor': {
        const cell = world.fluid.at(p.x,p.y + .5) ?? world.fluid.at(p.x,p.y);
        out.level = cell?.amount ?? 0; out.fluid = cell?.type ?? -1; observe(out.level >= n('minimum')); break;
      }
      case 'speed-sensor': {
        const speed = (x: Entity) => b('angular') ? Math.abs(x.body.getAngularVelocity()) : x.body.getLinearVelocity().length();
        const items = candidates(x => speed(x) >= n('minimum')); measure(items,items[0] ? speed(items[0]) : 0); break;
      }
      case 'collision-sensor': {
        const target = candidates(x => !!x.contact && x.contact.force >= n('minimum') && world.time - (x.runtime.contactAt ?? -10) < .15)[0];
        measure(target ? [target] : []);
        const latest = target?.contact;
        if (latest) runtime.hit = Math.max(runtime.hit ?? 0,latest.serial);
        out.hit = {event:runtime.hit ?? 0}; out.force = latest?.force ?? 0;
        break;
      }
      case 'timer': {
        if (input.reset || !on) { runtime.elapsed = 0; runtime.finished = 0; }
        if (on && !input.pause && !runtime.finished) runtime.elapsed = (runtime.elapsed ?? 0) + dt;
        const done = (runtime.elapsed ?? 0) >= n('duration') && !runtime.finished;
        if (done) { if (b('repeat')) runtime.elapsed = 0; else runtime.finished = 1; }
        events('done',done); out.active = on && !runtime.finished; out.remaining = Math.max(0,n('duration') - (runtime.elapsed ?? 0));
        break;
      }
      case 'counter': {
        const add = edge('up',input.increment), subtract = edge('down',input.decrement), pulse = edge('pulse',input.pulse);
        let value = Number(data.config.count ?? n('initial'));
        if (input.reset) value = n('initial');
        else value += (Number(add || pulse) - Number(subtract)) * n('step');
        if (b('wrap') && value > n('max')) value = n('min');
        if (b('wrap') && value < n('min')) value = n('max');
        data.config.count = bounded(value, n('min'), n('max')); out.count = data.config.count; out.maximum = out.count === n('max'); break;
      }
      case 'memory-register':
        for (const name of ['value','text','state','ref','vector']) {
          const priorValue = prior.get(data.id)?.[name];
          const next = input.reset ? undefined : (input.write ? input[name] : undefined) ?? priorValue;
          if (next !== undefined) out[name] = next;
          else if (name === 'value') out[name] = n('initial');
        }
        events('changed',input.write); break;
      case 'logic-controller': {
        const raw = s('program');
        if (!raw || !enabled) break;
        let cached = runners.get(e);
        if (cached?.raw !== raw) {
          try {
            const program = JSON.parse(raw);
            if (!validateProgram(program)) { out.error = true; break; }
            cached = {raw,runner:new ProgramRunner(program)}; runners.set(e,cached);
          } catch { out.error = true; break; }
        }
        cached.runner.step(world.time,input); Object.assign(out,cached.runner.outputs);
        out.error = !!cached.runner.error; break;
      }
      case 'automatic-door': case 'piston-actuator': {
        const door = data.type === 'automatic-door', part = e.parts[0]?.body;
        if (!part || data.config.wholeFrozen) break;
        const target = door ? Number(working && !input.close && !input.lock && !b('locked') && !!(input.open ?? data.config.on)) * n('travel') : working ? bounded(requested('target',on ? n('travel') : 0),0,n('travel')) : 0;
        const dir = door ? s('direction') === 'Up' ? Vec2(0,-1) : Vec2(s('direction') === 'Left' ? -1 : 1,0) : body.getWorldVector(Vec2(1,0));
        const next = (runtime.extension ?? 0) + bounded(target - (runtime.extension ?? 0),-n('speed') * dt,n('speed') * dt);
        const obstruction = door && next < (runtime.extension ?? 0) && world.findNear(part.getPosition(),e.def.height * .6,data.id).some(x => x.def.family === 'Characters' && Math.abs(x.body.getPosition().x - part.getPosition().x) < .66);
        if (!obstruction) runtime.extension = next;
        const at = part.getPosition().clone();
        const dest = Vec2(p.x + dir.x * ((runtime.extension ?? 0) + (door ? 0 : .56)),p.y + dir.y * ((runtime.extension ?? 0) + (door ? 0 : .56)));
        part.setAngle(angle);
        part.setLinearVelocity(Vec2((dest.x - at.x) / dt,(dest.y - at.y) / dt));
        const moving = distance(dest,at) > .015;
        if (moving) periodic(door ? 'door' : 'piston',.29,.32);
        if (door) { out.open = (runtime.extension ?? 0) > n('travel') * .93; out.closed = (runtime.extension ?? 0) < .04; out.moving = moving; out.blocked = obstruction; out.active = moving; }
        else { out.active = moving; out.extension = runtime.extension ?? 0; out['at-target'] = Math.abs(out.extension - target) <= .015; }
        break;
      }
      case 'electric-motor': {
        const rpm = working && (on || typeof input.rpm === 'number' || supplied > 0) && !input.brake ? requested('rpm',n('rpm')) : 0;
        const attached = [...world.links.values()].filter(j => j.spec.a === data.id || j.spec.b === data.id);
        for (const link of attached) {
          if (link.spec.kind !== 'Hinge' && link.spec.kind !== 'Suspension') continue;
          const joint = link.joint as RevoluteJoint | WheelJoint;
          joint.enableMotor(!!rpm || Boolean(input.brake)); joint.setMotorSpeed(rpm * Math.PI / 30); joint.setMaxMotorTorque(n('force'));
        }
        if (!attached.length && !data.frozen) body.applyTorque((rpm / 60 - body.getAngularVelocity()) * n('force') * dt,true);
        if (rpm) periodic('motor');
        out.active = !!rpm; out.rpm = attached.length ? rpm : body.getAngularVelocity() * 30 / Math.PI; out.load = attached.length;
        break;
      }
      case 'heater': case 'cooler': {
        const target = requested('target',n('target')), isHot = data.type === 'heater';
        const items = candidates();
        if (working && on) {
          data.temp += (target - data.temp) * Math.min(1,dt * n('rate'));
          for (const x of items) if (isHot ? x.data.temp < target : x.data.temp > target) x.data.temp += (target - x.data.temp) * Math.min(.4,dt * n('rate') / (distance(p,x.body.getPosition()) + 1));
          periodic('thermal',.16,.72);
        }
        out.active = working && on; out.temperature = data.temp; out.ready = Math.abs(data.temp - target) < 2; break;
      }
      case 'electromagnet': case 'electric-fan': {
        const magnet = data.type === 'electromagnet', strength = magnet ? requested('force',n('force')) : requested('speed',n('speed'));
        const items = working && on ? candidates(x => !x.data.frozen && (!magnet || x.def.material === 'steel')) : [];
        for (const x of items) {
          const q = x.body.getPosition(), d = Math.max(.25,distance(p,q));
          if (magnet) x.body.applyLinearImpulse(Vec2((p.x-q.x)/d*strength*dt/(1+d*.4),(p.y-q.y)/d*strength*dt/(1+d*.4)),q,true);
          else x.body.applyLinearImpulse(body.getWorldVector(Vec2(strength*dt/(1+d*.3),0)),q,true);
        }
        if (working && on) periodic('fan',.18,.55);
        out.active = working && on; out[magnet ? 'count' : 'airflow'] = magnet ? items.length : out.active ? strength : 0; break;
      }
      case 'conveyor-belt': {
        const speed = working && on ? requested('speed', n('speed')) : 0;
        if (speed) {
          for (const x of world.findNear(p,e.def.width + 1,data.id)) {
            const q = x.body.getPosition(), vel = x.body.getLinearVelocity();
            if (!x.data.frozen && Math.abs(q.x-p.x) < e.def.width * data.scale / 2 && q.y < p.y && p.y - q.y < x.def.height * x.data.scale * .55 + .43) x.body.applyLinearImpulse(Vec2((speed - vel.x)*x.body.getMass()*dt*3,0),q,true);
          }
          periodic('motor',.25);
        }
        out.speed = speed; out.active = !!speed; break;
      }
      case 'water-pump': {
        const quantity = working && on ? bounded(requested('flow',n('flow')),0,100)*dt*bounded(requested('opening',100)/100,0,1) : 0;
        const intake=tank('intake'),outlet=tank('outlet');
        const missingTank=world.wires.some(w=>w.to===data.id&&((w.input==='intake'&&!intake)||(w.input==='outlet'&&!outlet)));
        const moved = missingTank ? 0 : world.fluid.transfer(p.x+n('intakeX'),p.y+n('intakeY'),p.x+n('outletX'),p.y+n('outletY'),quantity,world,intake,outlet);
        out.flow = moved / dt; out.active = moved > .001; out.dry = quantity > .001 && !out.active;
        if (out.active) periodic('water',.29,.46);
        break;
      }
      case 'fluid-tank': {
        let volume=bounded(n('volume'),0,n('capacity'));
        if(b('spill')&&Math.abs(Math.sin(angle/2))>.52&&volume>0)volume-=world.fluid.pour(p.x,p.y+1.1,n('fluidType'),Math.min(volume,8*dt),world);
        data.config.volume=volume;out.tank={ref:data.id};out.volume=volume;out.level=volume/n('capacity');out.fluid=n('fluidType');
        if(runtime.liquidMass!==Math.floor(volume*2)){
          runtime.liquidMass=Math.floor(volume*2);
          body.getFixtureList()?.setDensity(data.density+volume*.024);
          body.resetMassData();
        }
        break;
      }
      case 'flow-pipe':
        out.active=enabled&&b('on')&&requested('opening',100)>0&&!!tank('tank');
        if(out.active)out.tank=input.tank;break;
      case 'fluid-drain': {
        const source=tank('tank'), amount=enabled&&b('on')?n('flow')*dt:0;
        const volume=Number(source?.data.config.volume??0);
        const drained=source?Math.min(volume,amount):world.fluid.drain(p.x,p.y-.35,amount);
        if(source)source.data.config.volume=volume-drained;
        out.drained=drained/dt;out.active=drained>0;break;
      }
      case 'electric-valve': out.opening = working && (input.enable ?? true) ? bounded(requested('opening',n('opening')),0,100) : 0; out.active = out.opening > 0; break;
      case 'digital-display':
        if (working) data.config.readout = String(input.text ?? (Number(input.value ?? 0).toFixed(n('decimals')) + s('units'))).slice(0,22);
        out.active = working; break;
      case 'alarm-speaker':
        out.active = working && !!(input.play ?? on);
        if (out.active) periodic('alarm',n('volume'),n('interval')); break;
      case 'wireless-transmitter':
        out.active = working && (input.enable ?? true);
        const inputKinds: [string,Kind][] = [['data','boolean'],['value','number'],['text','text'],['position','vector'],['object','object'],['pulse','event']];
        for (const [key] of inputKinds) if (input[key] !== undefined) out[key] = input[key];
        out.receivers = [...world.entities.values()].filter(x => x.data.type === 'wireless-receiver' && (x.data.config.channel ?? 'forge') === s('channel') && distance(p,x.body.getPosition()) <= radius).length;
        break;
      case 'wireless-receiver': {
        const nearest = working ? wireless.filter(x => (x.data.config.channel ?? 'forge') === s('channel') && distance(p,x.body.getPosition()) <= Math.min(radius,Number(x.data.config.range ?? 5))).sort((a,c) => distance(p,a.body.getPosition()) - distance(p,c.body.getPosition()))[0] : undefined;
        const src = nearest && prior.get(nearest.data.id);
        if (src) runtime.linkAt = world.time;
        const held = working && world.time - (runtime.linkAt ?? -100) <= n('timeout');
        if (src || held) for (const name of ['data','value','text','position','object','pulse']) {
          const current = src?.[name] ?? prior.get(data.id)?.[name];
          if (current !== undefined) out[name] = current;
        }
        out.active = !!src || held; out.data ??= false;
        out.quality = nearest ? 1 - distance(p,nearest.body.getPosition())/Math.max(1,radius) : 0;
        break;
      }
      case 'melon-spawner': {
        const start = edge('trigger',input.trigger ?? on);
        let count = [...world.entities.values()].filter(x => x.data.config.spawner === data.id).length;
        const canSpawn = working && (start || (on && b('repeat') && world.time >= (runtime.next ?? 0)));
        if (canSpawn) {
          const qty = bounded(Math.floor(requested('batch',n('quantity'))),1,100);
          let placed = 0;
          for (let i=0;i<qty*5 && placed<qty && count<n('cap');i++) {
            const offset = i % 11 - 5, height = Math.floor(i / 11);
            const q = {x: p.x + offset * 1.35 + 1.8,y:p.y - 1.25 - height*2.45};
            if (world.findNear(q,.92,data.id).length > 0 || world.pick(q)) continue;
            const guy = world.spawn(s('character'),q);
            if (!guy) break;
            Object.assign(guy.data.config,{ai:b('ai'), speed:n('speed'),team:s('team'),spawner:data.id,task:'Walk To',goalX:typeof input.destination === 'object' && 'x' in input.destination ? input.destination.x : n('goalX')});
            count++; placed++;
          }
          runtime.spawned = placed; runtime.next = world.time + n('interval'); events('failed',placed < qty);
          if (placed) periodic('relay');
        } else events('failed',false);
        out.active = working && on; out.count = count; out.spawned = runtime.spawned ?? 0; break;
      }
      case 'electric-lamp':
        out.active = working && (on || (supplied > 0 && input.enable === undefined));
        out.brightness = out.active ? bounded(requested('brightness',n('brightness')),0,5) : 0; break;
      case 'logic-gate': {
        const a = !!input.a, c = !!input.b, value = requested('value',0);
        const opts: Record<string,boolean> = {AND:a&&c,OR:a||c,NOT:!a,XOR:a!==c,NAND:!(a&&c),NOR:!(a||c),Comparator:value>n('threshold'),Threshold:value>=n('threshold'),Inverter:!a};
        out.active = opts[s('gate')] ?? false; out.value = s('gate') === 'Inverter' ? -value : Number(out.active); break;
      }
    }
    e.node.out = out; data.out = out;
  }
}

export const isDeviceSignalOutput = (e: Entity, id: string) => e.node?.outputs.find(p => p.id === id);

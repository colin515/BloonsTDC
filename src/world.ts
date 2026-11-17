import { World, Box, Circle, Polygon, Vec2, MouseJoint, RevoluteJoint, WeldJoint, DistanceJoint, RopeJoint, PrismaticJoint, WheelJoint, type Body, type Joint } from 'planck';
import { definitions, materials, customDefinitions, registerCustomDefinition, type Definition } from './catalog';
import { maps, type MapId } from './maps';
import { canConnect, type Vector, type Wire, type Node, type Signal } from './signals';
import { devicePorts, updateDevices } from './devices';
import { FluidGrid } from './fluid';

export type Setting = number | string | boolean;
export type Sound = { name: string; group: 'ui' | 'sfx' | 'machines' | 'environment' | 'ambient'; x?: number; y?: number; level: number; serial: number };
export type EntityData = {
  id: string; type: string; name: string; x: number; y: number; angle: number; vx: number; vy: number; av: number;
  scale: number; frozen: boolean; invincible: boolean; gravity: boolean; collision: boolean; locked: boolean;
  hp: number; temp: number; color: number; opacity: number; density: number; friction: number; bounce: number;
  tags: string; group: string; config: Record<string, Setting>; out: Record<string, Signal>; parts?: PartData[];
};
type PartData = Pick<EntityData, 'x' | 'y' | 'angle' | 'vx' | 'vy' | 'av'>;
export type Entity = { data: EntityData; def: Definition; body: Body; parts: { body: Body; art: string; w: number; h: number }[]; internal: Joint[]; node?: Node; runtime: Record<string, number>; contact?: { force: number; other?: string; serial: number } };
export type JointKind = 'Weld' | 'Hinge' | 'Rope' | 'Spring' | 'Slider' | 'Suspension';
export type Link = { id: string; a: string; b: string; kind: JointKind; ax: number; ay: number; bx: number; by: number; strength: number; speed: number; collide: boolean };
export type WorldSettings = { gravity: number; wind: number; temp: number; daylight: number; friction: number; weather: 'clear' | 'rain' | 'snow'; boundary: 'walls' | 'wrap' | 'open'; max: number; fluidRate: number; aiRate: number; deviceRate: number; particles: number };
export type Snapshot = { version: 1; map: MapId; settings: WorldSettings; custom?: Definition[]; entities: EntityData[]; links: Link[]; wires: Wire[]; fluid: ReturnType<FluidGrid['save']> };
export type Effect = { x: number; y: number; vx: number; vy: number; time: number; max: number; color: number; size: number };
type Beam = { from: Vector; to: Vector; color: number; time: number };
const copy = <T>(value: T): T => structuredClone(value);
const uid = () => globalThis.crypto.randomUUID();
export const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const vec = (p: Vector) => Vec2(p.x, p.y);
export const dist = (a: Vector, b: Vector) => Math.hypot(a.x - b.x, a.y - b.y);
const allJoints: JointKind[] = ['Weld', 'Hinge', 'Rope', 'Spring', 'Slider', 'Suspension'];

const linkKey = (w: Wire) => JSON.stringify([w.from, w.output, w.to, w.input]);
type Change<T> = { before: T[]; after: T[] };
type Edit = { entities: Change<EntityData>; links: Change<Link>; wires: Change<Wire> };
function delta<T>(before: T[], after: T[], key: (item: T) => string): Change<T> {
  const old = new Map(before.map(x => [key(x), JSON.stringify(x)]));
  const next = new Map(after.map(x => [key(x), JSON.stringify(x)]));
  return {before: before.filter(x => next.get(key(x)) !== old.get(key(x))), after: after.filter(x => old.get(key(x)) !== next.get(key(x)))};
}
export class ForgeWorld {
  map = maps[0];
  settings!: WorldSettings;
  physics = new World();
  entities = new Map<string, Entity>();
  nodes = new Map<string, Node>();
  links = new Map<string, { spec: Link; joint: Joint }>();
  wires: Wire[] = [];
  fluid = new FluidGrid();
  time = 0;
  sounds: Sound[] = [];
  private soundSerial = 0;
  effects: Effect[] = [];
  beams: Beam[] = [];
  undoStack: Edit[] = [];
  redoStack: Edit[] = [];
  revision = 0;
  grab?: { joint: MouseJoint; id: string };
  keys = new Set<string>();
  active?: string;
  private anchor!: Body;
  private pendingDamage: {id: string; force: number}[] = [];
  private walls: Body[] = [];
  private ground = new Map<Body, number>();
  private deviceClock = 0;
  private fluidClock = 0;
  private aiClock = 0;
  onSound?: (event: Sound) => void;
  constructor(map: MapId = 'classic') { this.reset(map); }

  reset(id: MapId) {
    this.map = maps.find(m => m.id === id) ?? maps[0];
    this.settings = { gravity: this.map.gravity, wind: 0, temp: 20, daylight: .85, friction: this.map.friction, weather: 'clear', boundary: 'walls', max: 360, fluidRate: 12, aiRate: 12, deviceRate: 24, particles: 260 };
    this.physics = new World(Vec2(0, this.settings.gravity));
    this.anchor = this.physics.createBody();
    this.entities.clear(); this.nodes.clear(); this.links.clear(); this.wires = [];
    this.effects = []; this.beams = []; this.sounds = []; this.grab = undefined; this.active = undefined; this.keys.clear();
    this.fluid = new FluidGrid(); this.pendingDamage = []; this.walls = []; this.ground.clear();
    this.time = this.deviceClock = this.fluidClock = this.aiClock = 0;
    this.undoStack = []; this.redoStack = []; this.revision++;
    for (const terrain of this.map.terrain) {
      const body = this.physics.createBody({position: Vec2(terrain.x, terrain.y)});
      body.createFixture(Box(terrain.w / 2, terrain.h / 2), {friction: this.settings.friction});
      this.ground.set(body, 1);
    }
    this.refreshTerrain();
    if (id === 'water') for (let x = -21; x < 1; x++) for (let y = 15; y < 20; y++) this.fluid.add(x * .5 + .25, y * .5 + .25, 0, 1);
    this.physics.on('post-solve', (contact, impulse) => {
      const bodies = [contact.getFixtureA().getBody(), contact.getFixtureB().getBody()];
      const ids = bodies.map(body => body.getUserData() as string | undefined);
      if (ids[0] && ids[0] === ids[1]) return;
      const force = Math.max(0, ...impulse.normalImpulses);
      if (force < .09) return;
      bodies.forEach((body, index) => {
        const e = this.entities.get(ids[index] ?? '');
        if (!e) return;
        if (!e.contact || this.time - (e.runtime.contactAt ?? -10) > .09 || force > e.contact.force) {
          e.contact = {force, other: ids[1 - index], serial: ++this.soundSerial}; e.runtime.contactAt = this.time;
        }
        if (force > 8) this.pendingDamage.push({id: e.data.id, force});
        if (force > .8 && this.time - (e.runtime.impact ?? -10) > .17) {
          e.runtime.impact = this.time;
          this.sound(e.def.material, body.getPosition(), Math.min(.8, Math.sqrt(force) * .13));
        }
      });
    });
  }

  refreshTerrain() {
    for (const body of this.ground.keys()) body.getFixtureList()?.setFriction(this.settings.friction);
    this.walls.forEach(body => this.physics.destroyBody(body));
    this.walls = [];
    if (this.settings.boundary === 'walls') for (const x of [-110, 110]) {
      const wall = this.physics.createBody({position: Vec2(x, 0)});
      wall.createFixture(Box(.25, 40), {friction: this.settings.friction}); this.walls.push(wall);
    }
  }

  private fixture(body: Body, def: Definition, data: EntityData, w: number, h: number) {
    const settings = {density: data.density, friction: data.friction, restitution: data.bounce, isSensor: !data.collision};
    if (def.shape === 'circle') body.createFixture(Circle(Math.min(w, h) / 2), settings);
    else if (def.shape === 'ramp' || def.shape === 'ramp45') body.createFixture(Polygon([Vec2(-w / 2, h / 2), Vec2(w / 2, h / 2), Vec2(w / 2, -h / 2)]), settings);
    else if (def.shape === 'cone') body.createFixture(Polygon([Vec2(-w / 2, h / 2), Vec2(w / 2, h / 2), Vec2(.12 * w, -h / 2), Vec2(-.12 * w, -h / 2)]), settings);
    else if (def.shape === 'arch') {
      const vertices = Array.from({length: 6}, (_, i) => Vec2(-w / 2 + Math.sin(i * Math.PI / 10) * w, h / 2 - Math.cos(i * Math.PI / 10) * h));
      body.createFixture(Polygon([...vertices, Vec2(-w / 2, h / 2)]), settings);
    } else if (def.shape === 'stairs') {
      for (let i = 0; i < 5; i++) {
        const height = h * (i + 1) / 5;
        body.createFixture(Box(w / 10, height / 2, Vec2(-w / 2 + w * (i + .5) / 5, (h - height) / 2), 0), settings);
      }
    } else if (def.shape === 'tree') {
      body.createFixture(Box(w * .13, h * .5), settings);
      body.createFixture(Circle(Vec2(0, -h * .29), Math.min(w * .46, h * .26)), settings);
    } else if (def.art === 'table' || def.art === 'chair') {
      body.createFixture(Box(w * .5, h * .11, Vec2(0, h * -.25), 0), settings);
      for (const x of [-.37, .37]) body.createFixture(Box(w * .075, h * .35, Vec2(w * x, h * .15), 0), settings);
      if (def.art === 'chair') body.createFixture(Box(w * .08, h * .38, Vec2(-w * .42, -h * .17), 0), settings);
    } else body.createFixture(Box(w / 2, h / 2), settings);
  }

  spawn(type: string, pos: Vector, angle = 0, frozen = false, source?: EntityData): Entity | undefined {
    const def = definitions.get(type);
    if (!def || this.entities.size >= this.settings.max || (source && this.entities.has(source.id))) return;
    const material = materials[def.material];
    const data: EntityData = source ? copy(source) : {
      id: uid(), type, name: def.label, ...pos, angle, vx: 0, vy: 0, av: 0, scale: 1, frozen, invincible: false,
      gravity: true, collision: true, locked: false, hp: material.hp * (def.family === 'Characters' || def.id === 'reinforced-glass' ? def.detail : 1),
      temp: this.settings.temp, color: def.color, opacity: 1, density: material.density, friction: material.friction, bounce: material.bounce,
      tags: '', group: '', config: {}, out: {},
    };
    const body = this.physics.createBody({type: data.frozen ? 'static' : 'dynamic', position: Vec2(data.x, data.y), angle: data.angle, linearDamping: .13, angularDamping: .25, gravityScale: data.gravity ? 1 : 0, linearVelocity: Vec2(data.vx, data.vy), angularVelocity: data.av, userData: data.id});
    this.fixture(body, def, data, def.width * data.scale, def.height * data.scale);
    const entity: Entity = {data, def, body, parts: [], internal: [], runtime: {}};
    if (def.family === 'Characters') this.ragdoll(entity);
    if (def.art === 'vehicle') this.wheels(entity);
    if (['automatic-door', 'piston-actuator'].includes(type)) this.actuator(entity);
    const ports = devicePorts(type);
    if (ports.inputs.length || ports.outputs.length) {
      entity.node = {id: data.id, ...ports, out: data.out};
      this.nodes.set(data.id, entity.node);
    }
    if (data.parts) entity.parts.forEach(({body: part}, i) => {
      const s = data.parts?.[i];
      if (!s) return;
      part.setTransform(Vec2(s.x, s.y), s.angle);
      part.setLinearVelocity(Vec2(s.vx, s.vy)); part.setAngularVelocity(s.av);
    });
    this.entities.set(data.id, entity);
    this.revision++;
    return entity;
  }

  private part(e: Entity, art: string, x: number, y: number, w: number, h: number, round = false, type: 'dynamic' | 'static' | 'kinematic' = e.data.frozen ? 'static' : 'dynamic') {
    const body = this.physics.createBody({type, position: e.body.getWorldPoint(Vec2(x, y)), angle: e.body.getAngle(), userData: e.data.id, gravityScale: e.data.gravity ? 1 : 0, angularDamping: .33});
    body.createFixture(round ? Circle(w / 2) : Box(w / 2, h / 2), {density: e.data.density * .65, friction: art === 'wheel' ? 1.25 : e.data.friction, isSensor: !e.data.collision, filterGroupIndex: e.def.family === 'Characters' ? -1 - this.entities.size % 30000 : 0});
    e.parts.push({body, art, w, h}); return body;
  }
  private ragdoll(e: Entity) {
    const s = e.def.height * e.data.scale / .83;
    const head = this.part(e, 'head', 0, -.67 * s, .45 * s, .45 * s, true);
    const joint = (a: Body, b: Body, x: number, y: number, low: number, high: number) => {
      e.internal.push(this.physics.createJoint(RevoluteJoint({enableLimit: true, lowerAngle: low, upperAngle: high, maxMotorTorque: 8 * s}, a, b, e.body.getWorldPoint(Vec2(x * s, y * s))))!);
    };
    joint(e.body, head, 0, -.39, -.45, .45);
    for (const sign of [-1, 1]) {
      const arm = this.part(e, 'arm', sign * .4 * s, -.01 * s, .17 * s, .43 * s);
      const hand = this.part(e, 'hand', sign * .4 * s, .36 * s, .145 * s, .37 * s);
      const thigh = this.part(e, 'leg', sign * .155 * s, .61 * s, .2 * s, .42 * s);
      const foot = this.part(e, 'foot', sign * .155 * s, 1 * s, .19 * s, .4 * s);
      joint(e.body, arm, sign * .3, -.22, -2.2, 2.2); joint(arm, hand, sign * .4, .16, -.6, 1.9);
      joint(e.body, thigh, sign * .155, .4, -1.3, 1.1); joint(thigh, foot, sign * .155, .8, -.36, 1.5);
    }
  }
  private wheels(e: Entity) {
    const w = e.def.width * e.data.scale, h = e.def.height * e.data.scale;
    const isBike = e.data.type === 'bicycle' || e.data.type === 'motorcycle';
    for (const sign of [-1, 1]) {
      const size = Math.min(.92, .46 + w * .09) * (e.data.type === 'tractor' && sign < 0 ? 1.35 : 1);
      const offset = sign * w * (isBike ? .43 : .31);
      const wheel = this.part(e, 'wheel', offset, h * .53, size, size, true, e.data.config.wholeFrozen ? 'static' : 'dynamic');
      e.internal.push(this.physics.createJoint(WheelJoint({frequencyHz: 5, dampingRatio: .72, enableMotor: false, maxMotorTorque: 48}, e.body, wheel, wheel.getPosition(), Vec2(0, 1)))!);
    }
  }
  private actuator(e: Entity) {
    const isDoor = e.data.type === 'automatic-door';
    const size = e.data.scale;
    const root = e.body.getFixtureList();
    if (root) e.body.destroyFixture(root);
    const offset = isDoor ? -e.def.height * size * .51 : 0;
    e.body.createFixture(Box(e.def.width * size * .65, .13 * size, Vec2(0, offset), 0), {density: e.data.density, isSensor: !e.data.collision});
    this.part(e, isDoor ? 'door' : 'piston', isDoor ? 0 : .56 * size, 0, e.def.width * size, e.def.height * size, false, e.data.config.wholeFrozen ? 'static' : 'kinematic');
  }

  bodyState(body: Body): PartData {
    const p = body.getPosition(), v = body.getLinearVelocity();
    return {x: p.x, y: p.y, angle: body.getAngle(), vx: v.x, vy: v.y, av: body.getAngularVelocity()};
  }
  entityState(e: Entity): EntityData {
    return copy({...e.data, ...this.bodyState(e.body), parts: e.parts.map(p => this.bodyState(p.body))});
  }
  snapshot(): Snapshot {
    return {version: 1, map: this.map.id, settings: copy(this.settings), custom: customDefinitions([...this.entities.values()].map(e=>e.data)), entities: [...this.entities.values()].map(e => this.entityState(e)), links: [...this.links.values()].map(x => copy(x.spec)), wires: copy(this.wires), fluid: this.fluid.save()};
  }
  load(state: Snapshot) {
    state.custom?.forEach(registerCustomDefinition);
    this.reset(state.map); this.settings = copy(state.settings); this.refreshTerrain();
    this.fluid.load(state.fluid);
    state.entities.forEach(d => this.spawn(d.type, d, d.angle, d.frozen, d));
    state.links.forEach(l => this.connect(l));
    state.wires.forEach(w => this.wire(w)); this.revision++;
  }
  edit(action: () => void) {
    const before = this.snapshot(); action(); this.record(before);
  }
  record(before: Snapshot) {
    const after = this.snapshot();
    const edit: Edit = {
      entities: delta(before.entities, after.entities, x => x.id),
      links: delta(before.links, after.links, x => x.id), wires: delta(before.wires, after.wires, linkKey),
    };
    if (Object.values(edit).some(x => x.before.length || x.after.length)) {
      this.undoStack.push(edit); if (this.undoStack.length > 40) this.undoStack.shift();
      this.redoStack.length = 0; this.revision++;
    }
  }
  undo(redo = false) {
    const from = redo ? this.redoStack : this.undoStack, to = redo ? this.undoStack : this.redoStack;
    const edit = from.pop(); if (!edit) return;
    const remove = redo ? 'before' : 'after', add = redo ? 'after' : 'before';
    const changedIds = new Set(edit.entities[remove].map(d => d.id));
    const changedLinks = new Set(edit.links[remove].map(l => l.id));
    const changedWires = new Set(edit.wires[remove].map(linkKey));
    const rebuild = [...this.links.values()].map(x => x.spec).filter(l => !changedLinks.has(l.id) && (changedIds.has(l.a) || changedIds.has(l.b)));
    const rewire = this.wires.filter(w => !changedWires.has(linkKey(w)) && (changedIds.has(w.from) || changedIds.has(w.to)));
    edit.links[remove].forEach(l => this.unlink(l.id));
    this.wires = this.wires.filter(w => !changedWires.has(linkKey(w)));
    edit.entities[remove].forEach(d => this.remove(d.id));
    edit.entities[add].forEach(d => this.spawn(d.type, d, d.angle, d.frozen, d));
    [...rebuild, ...edit.links[add]].forEach(l => this.connect(l));
    [...rewire, ...edit.wires[add]].forEach(w => this.wire(w));
    to.push(edit); this.revision++;
  }

  pick(position: Vector) {
    const found: Entity[] = [];
    this.physics.queryAABB({lowerBound: Vec2(position.x - .035, position.y - .035), upperBound: Vec2(position.x + .035, position.y + .035)}, f => {
      const id = f.getBody().getUserData() as string;
      const e = this.entities.get(id);
      if (e && f.testPoint(vec(position)) && !found.includes(e)) found.push(e);
      return true;
    });
    return found.sort((a, b) => Number(a.data.frozen) - Number(b.data.frozen) || a.def.width * a.def.height - b.def.width * b.def.height)[0];
  }
  findNear(pos: Vector, radius: number, except?: string) {
    const result: Entity[] = [];
    const seen = new Set<string>();
    this.physics.queryAABB({lowerBound: Vec2(pos.x - radius, pos.y - radius), upperBound: Vec2(pos.x + radius, pos.y + radius)}, f => {
      const id = f.getBody().getUserData() as string;
      if (!id || id === except || seen.has(id)) return true;
      seen.add(id);
      const e = this.entities.get(id);
      if (e && dist(pos, e.body.getPosition()) <= radius) result.push(e);
      return true;
    });
    return result;
  }
  ray(a: Vector, b: Vector, self?: string, ignore?: string, ignoreGlass = false) {
    if (dist(a, b) < .0001) return;
    let hit: {pos: Vector; id?: string; distance: number} | undefined;
    this.physics.rayCast(vec(a), vec(b), (f, p, _normal, fraction) => {
      const id = f.getBody().getUserData() as string | undefined;
      if (f.isSensor() || (id && (id === self || id === ignore || (ignoreGlass && this.entities.get(id)?.def.material === 'glass')))) return -1;
      hit = {pos: {x: p.x, y: p.y}, id, distance: dist(a, p)};
      return fraction;
    });
    return hit;
  }

  move(e: Entity, pos: Vector, angle = e.body.getAngle()) {
    const old = e.body.getPosition().clone(), da = angle - e.body.getAngle();
    const c = Math.cos(da), s = Math.sin(da);
    for (const {body} of e.parts) {
      const p = body.getPosition(), x = p.x - old.x, y = p.y - old.y;
      body.setTransform(Vec2(pos.x + x * c - y * s, pos.y + x * s + y * c), body.getAngle() + da);
      body.setAwake(true);
    }
    e.body.setTransform(vec(pos), angle); e.body.setAwake(true);
  }
  freeze(e: Entity, value: boolean, whole = false) {
    e.data.frozen = value;
    if (whole) e.data.config.wholeFrozen = value;
    else delete e.data.config.wholeFrozen;
    const parts: {body: Body; art: string}[] = [{body:e.body,art:''}, ...e.parts];
    for (const {body,art} of parts) {
      const actuator = art === 'door' || art === 'piston';
      const activePart = actuator || art === 'wheel';
      body.setType(value && (whole || !activePart) ? 'static' : actuator ? 'kinematic' : 'dynamic');
      body.setLinearVelocity(Vec2()); body.setAngularVelocity(0); body.setAwake(true);
    }
  }

  property(e: Entity, key: 'gravity' | 'collision' | 'friction' | 'bounce' | 'density', value: number | boolean) {
    if (key === 'gravity' || key === 'collision') e.data[key] = Boolean(value);
    else e.data[key] = Number(value);
    for (const body of [e.body, ...e.parts.map(p => p.body)]) {
      body.setGravityScale(e.data.gravity ? 1 : 0); body.setAwake(true);
      for (let f = body.getFixtureList(); f; f = f.getNext()) {
        f.setSensor(!e.data.collision); f.setFriction(e.data.friction); f.setRestitution(e.data.bounce);
        if (key === 'density') f.setDensity(e.data.density);
      }
      if (key === 'density') body.resetMassData();
    }
  }
  resize(e: Entity, scale: number) {
    const d = this.entityState(e);
    const links = [...this.links.values()].map(l => l.spec).filter(l => l.a === d.id || l.b === d.id);
    const wires = this.wires.filter(w => w.from === d.id || w.to === d.id);
    d.scale = clamp(scale, .2, 6); delete d.parts;
    this.remove(d.id); this.spawn(d.type, d, d.angle, d.frozen, d); links.forEach(l => this.connect(l)); wires.forEach(w => this.wire(w));
  }
  remove(id: string) {
    const e = this.entities.get(id); if (!e) return;
    if (this.grab?.id === id) this.release();
    for (const [key, entry] of this.links) if (entry.spec.a === id || entry.spec.b === id) this.unlink(key);
    this.wires = this.wires.filter(w => w.from !== id && w.to !== id && !w.from.startsWith(id + ':'));
    this.nodes.delete(id);
    e.parts.forEach(p => this.physics.destroyBody(p.body));
    this.physics.destroyBody(e.body); this.entities.delete(id);
    if (this.active === id) this.active = undefined;
    this.revision++;
  }
  startGrab(e: Entity, target: Vector, force: number, damping: number) {
    if (e.data.frozen || e.data.locked) return;
    const joint = this.physics.createJoint(MouseJoint({maxForce: e.body.getMass() * force, dampingRatio: damping, frequencyHz: 7}, this.anchor, e.body, vec(target)));
    if (joint) { this.grab = {joint, id: e.data.id}; e.body.setAwake(true); }
  }
  drag(target: Vector) { this.grab?.joint.setTarget(vec(target)); }
  release(zero = false) {
    if (!this.grab) return;
    const body = this.entities.get(this.grab.id)?.body;
    if (zero && body) { body.setLinearVelocity(Vec2()); body.setAngularVelocity(0); }
    this.physics.destroyJoint(this.grab.joint); this.grab = undefined;
  }

  makeLink(a: string, b: string, kind: JointKind, first: Vector, second: Vector): Link | undefined {
    const parent = this.entities.get(a), child = this.entities.get(b);
    if (!parent || !child || a === b) return;
    const ax = parent.body.getLocalPoint(vec(first)), bx = child.body.getLocalPoint(vec(second));
    return {id: uid(), a, b, kind, ax: ax.x, ay: ax.y, bx: bx.x, by: bx.y, strength: 5, speed: 0, collide: false};
  }
  connect(l: Link) {
    const e = this.entities.get(l.a), f = this.entities.get(l.b);
    if (!e || !f || e === f || this.links.has(l.id) || !allJoints.includes(l.kind)) return false;
    const a = e.body, b = f.body, localAnchorA = Vec2(l.ax, l.ay), localAnchorB = Vec2(l.bx, l.by);
    const p = a.getWorldPoint(localAnchorA), q = b.getWorldPoint(localAnchorB);
    const detail = {bodyA: a, bodyB: b, localAnchorA, localAnchorB, collideConnected: l.collide, referenceAngle: b.getAngle() - a.getAngle()};
    let joint: Joint;
    switch (l.kind) {
      case 'Weld': joint = WeldJoint(detail); break;
      case 'Hinge': joint = RevoluteJoint({...detail, enableMotor: l.speed !== 0, motorSpeed: l.speed, maxMotorTorque: l.strength * 10}); break;
      case 'Rope': joint = RopeJoint({...detail, maxLength: Math.max(.12, dist(p, q))}); break;
      case 'Spring': joint = DistanceJoint({...detail, length: Math.max(.1, dist(p, q)), frequencyHz: l.strength, dampingRatio: .55}); break;
      case 'Slider': joint = PrismaticJoint({...detail, localAxisA: Vec2(1, 0), enableLimit: true, lowerTranslation: -l.strength, upperTranslation: l.strength, enableMotor: l.speed !== 0, motorSpeed: l.speed, maxMotorForce: 70}); break;
      case 'Suspension': joint = WheelJoint({...detail, localAxisA: Vec2(0, 1), frequencyHz: l.strength, dampingRatio: .68, enableMotor: l.speed !== 0, motorSpeed: l.speed, maxMotorTorque: 65}); break;
    }
    this.physics.createJoint(joint);
    this.links.set(l.id, {spec: copy(l), joint}); this.revision++; return true;
  }
  unlink(id: string) {
    const link = this.links.get(id); if (!link) return;
    this.physics.destroyJoint(link.joint); this.links.delete(id); this.revision++;
  }
  wire(w: Wire) {
    if (!canConnect(this.nodes, w)) return false;
    this.wires = this.wires.filter(x => !(x.to === w.to && x.input === w.input && this.nodes.get(w.to)?.inputs.find(p => p.id === w.input)?.kind !== 'power') && linkKey(x) !== linkKey(w));
    this.wires.push(copy(w)); this.revision++; return true;
  }

  sound(name: string, pos?: Vector, level = .5, group: Sound['group'] = 'sfx') {
    const event = {name, group, x: pos?.x, y: pos?.y, level: clamp(level, 0, 1), serial: ++this.soundSerial};
    if (pos) { this.sounds.push(event); if (this.sounds.length > 96) this.sounds.shift(); }
    this.onSound?.(event);
  }
  burst(pos: Vector, color: number, size: number, count: number) {
    count = Math.min(count, this.settings.particles - this.effects.length);
    for (let i = 0; i < count; i++) {
      const theta = i * 2.399963 + this.time, v = (i % 5 + 2) * size * .5, max = .22 + i % 7 * .085;
      this.effects.push({x: pos.x, y: pos.y, vx: Math.cos(theta) * v, vy: Math.sin(theta) * v, time: max, max, color, size: .06 + i % 4 * .035});
    }
  }
  damage(e: Entity, amount: number) {
    if (e.data.invincible || !this.entities.has(e.data.id)) return;
    e.data.hp -= amount;
    if (e.def.family === 'Characters' && amount > 14) e.runtime.stunned = this.time + 1.15;
    if (e.data.hp > 0) return;
    const pos = e.body.getPosition();
    this.sound(e.def.material === 'glass' ? 'shatter' : 'break', pos, .64);
    this.burst(pos, e.data.color, 2, 13);
    if (e.data.type === 'oil-barrel') this.fluid.pour(pos.x, pos.y, 1, 1.8, this);
    this.remove(e.data.id);
  }
  explode(e: Entity) {
    if (!this.entities.has(e.data.id)) return;
    const pos = e.body.getPosition().clone(), style = e.def.detail;
    const radius = Number(e.data.config.radius ?? (2.6 + style * .28));
    this.remove(e.data.id);
    this.sound('burst', pos, .95);
    this.burst(pos, style === 9 ? 0xc095ff : 0xffa459, 5 + style * .28, 38);
    for (const target of this.findNear(pos, radius)) {
      const p = target.body.getPosition(), d = Math.max(.16, dist(p, pos)), weight = 1 - d / radius;
      target.body.applyLinearImpulse(Vec2((p.x - pos.x) / d * weight * (12 + style * 2), (p.y - pos.y) / d * weight * (12 + style * 2)), p, true);
      if (style !== 7 && style !== 8) this.damage(target, weight * (49 + style * 4));
      if (style === 6 || style === 9) target.data.temp += 220 * weight;
    }
  }

  use(e: Entity, aim: Vector = e.body.getWorldPoint(Vec2(2, 0))) {
    const p = e.body.getPosition(), d = dist(p, aim), style = e.def.detail;
    if (e.def.family === 'Charges') {
      if ([0, 1, 3, 4, 8].includes(style)) { e.data.config.armed = !e.data.config.armed; e.runtime.fuse = this.time + (style === 0 ? 1.2 : 3); this.sound('relay', p, .35, 'machines'); }
      else this.explode(e);
    } else if (e.def.family === 'Blasters' && d > .05 && this.time >= (e.runtime.cooldown ?? 0)) {
      const melee = style >= 11 && style <= 16;
      const maxAmmo = [8, 6, 5, 18, 25, 5, 2, 4, 20, 1, 1][style] ?? 8;
      const ammo = Number(e.data.config.ammo ?? maxAmmo);
      if (!melee && ammo <= 0) { this.sound('dry', p, .5); return; }
      if (!melee) e.data.config.ammo = ammo - 1;
      e.runtime.cooldown = this.time + ([4, 8].includes(style) ? .11 : melee ? .35 : .3 + (style % 5) * .08);
      const direction = Math.atan2(aim.y - p.y, aim.x - p.x), pellets = style === 5 ? 5 : style === 6 ? 8 : 1;
      const length = melee ? e.def.width * 1.8 : style === 7 ? 55 : style === 20 ? 4.5 : 24;
      this.sound(melee ? 'swish' : style > 16 ? 'zap' : 'pulse', p, .73);
      for (let i = 0; i < pellets; i++) {
        const angle = direction + (i - (pellets - 1) / 2) * .065;
        const end = {x: p.x + Math.cos(angle) * length, y: p.y + Math.sin(angle) * length};
        const hit = this.ray(p, end, e.data.id);
        this.beams.push({from: {x: p.x, y: p.y}, to: hit?.pos ?? end, color: style > 16 ? 0xc799ff : 0xffd293, time: style > 16 ? .25 : .11});
        const target = this.entities.get(hit?.id ?? '');
        if (!target) continue;
        this.damage(target, pellets > 1 ? 8 : 12 + style % 8 * 4);
        if (style === 20) target.data.temp += 132;
        if (style === 21) target.runtime.stunned = this.time + 2.4;
        this.burst(hit!.pos, target.data.color, 2, 4);
        target.body.applyLinearImpulse(Vec2(Math.cos(angle) * 2.5, Math.sin(angle) * 2.5), target.body.getWorldCenter(), true);
      }
      if (!melee) e.body.applyLinearImpulse(Vec2(-Math.cos(direction) * .9, -Math.sin(direction) * .9), e.body.getWorldCenter(), true);
    } else if (e.def.family === 'Tools & Care') {
      const target = this.findNear(aim, 1.4, e.data.id).sort((a, b) => dist(a.body.getPosition(), aim) - dist(b.body.getPosition(), aim)).find(x => x.def.family === 'Characters');
      if (!target) return;
      if (style < 0) target.data.config.armour = true;
      else if (style > 0) { target.data.hp = Math.min(materials[target.def.material].hp * target.def.detail, target.data.hp + style); target.runtime.stunned = 0; }
      else e.data.config.readout = Math.round(target.data.hp) + ' HP';
      this.sound('relay', p, .5);
    } else {
      e.data.config.on = !Boolean(e.data.config.on);
      if (e.data.type === 'push-button' && e.data.config.on) e.runtime.pressUntil = this.time + Number(e.data.config.duration ?? .5);
      this.sound('relay', p, .5, 'machines');
    }
  }

  private think(e: Entity) {
    const {body, data, runtime} = e;
    if (data.frozen || data.config.ai !== true || this.time < (runtime.stunned ?? 0)) return;
    const p = body.getPosition();
    const task = String(data.config.task ?? 'Idle');
    const goalEntity = this.entities.get(String(data.config.target ?? ''));
    const ref = goalEntity?.body.getPosition();
    let x = Number(data.config.goalX ?? p.x);
    if (task === 'Follow' || task === 'Go To Object' || task === 'Interact' || task === 'Pick Up') x = ref?.x ?? p.x;
    if (task === 'Flee') x = p.x + ((ref?.x ?? x) > p.x ? -6 : 6);
    if (task === 'Patrol' || task === 'Wander' || task === 'Guard') {
      const centre = Number(data.config.goalX ?? 0), radius = Number(data.config.patrolRadius ?? (task === 'Guard' ? 3 : 5));
      if (runtime.patrolSide === undefined) runtime.patrolSide = 1;
      x = centre + runtime.patrolSide * radius;
      if (Math.abs(x - p.x) < .65) runtime.patrolSide *= -1;
    }
    if (task === 'Idle' || task === 'Wait for Signal' || task === 'Programmable') x = p.x;
    const dx = x - p.x, scale = e.def.height * data.scale / .83;
    const grounded = this.ray({x: p.x, y: p.y + .55 * scale}, {x: p.x, y: p.y + 1.65 * scale}, data.id);
    body.setFixedRotation(true);
    body.setAngle(body.getAngle() * .7);
    if (Math.abs(dx) < (task === 'Follow' ? 1.55 : .52)) {
      runtime.blocked = 0; runtime.arrived = 1;
      if (goalEntity && task === 'Interact' && this.time > (runtime.interact ?? 0)) { this.use(goalEntity); runtime.interact = this.time + 2; }
      if (goalEntity && task === 'Pick Up' && !runtime.carry) {
        const link = this.makeLink(data.id, goalEntity.data.id, 'Weld', p, goalEntity.body.getPosition());
        if (link && this.connect(link)) runtime.carry = 1;
      }
      return;
    }
    runtime.arrived = 0;
    const sign = Math.sign(dx);
    const low = {x: p.x + .08 * sign, y: p.y + .98 * scale}, high = {x: p.x + .08 * sign, y: p.y - .47 * scale};
    const blocked = this.ray(low, {x: low.x + 1.07 * sign, y: low.y}, data.id);
    if (blocked && this.ray(high, {x: high.x + 1.22 * sign, y: high.y}, data.id)) {
      runtime.blocked = 1; runtime.blockedUntil = this.time + .3;
      body.setLinearVelocity(Vec2(0,body.getLinearVelocity().y));
      return;
    }
    if (this.time<(runtime.blockedUntil??0)) return;
    runtime.blocked = 0;
    if (grounded && blocked && this.time > (runtime.jump ?? 0)) {
      const mass = body.getMass() + e.parts.reduce((total,part)=>total+part.body.getMass(),0);
      body.applyLinearImpulse(Vec2(sign * mass * 1.1, -Number(data.config.jumpForce ?? 4.5) * mass), body.getWorldCenter(), true);
      runtime.jump = this.time + .78; this.sound('jump', p, .28);
    }
    const speed = Number(data.config.speed ?? 2.7);
    const velocity = body.getLinearVelocity();
    body.applyLinearImpulse(Vec2(clamp(sign * speed - velocity.x, -.95, .95) * body.getMass(), 0), body.getWorldCenter(), true);
    if (grounded && this.time - (runtime.step ?? -1) > .39) { runtime.step = this.time; this.sound('step', p, .24); }
    e.internal.forEach((part, i) => {
      const j = part as RevoluteJoint; j.enableMotor(true); j.setMotorSpeed(i === 0 ? -j.getJointAngle() * 8 : (Math.sin(this.time * 8 + i * 1.65) * .37 - j.getJointAngle()) * 5);
    });
  }

  step(dt: number) {
    this.physics.setGravity(Vec2(0, this.settings.gravity));
    this.time += dt; this.deviceClock += dt; this.fluidClock += dt; this.aiClock += dt;
    const think = this.aiClock >= 1 / this.settings.aiRate - 1e-8;
    if (think) this.aiClock = 0;
    for (const e of this.entities.values()) {
      const {body, data, def, runtime} = e;
      const p = body.getPosition();
      if (this.settings.boundary === 'wrap' && Math.abs(p.x) > 109.5) this.move(e, {x: -Math.sign(p.x) * 108.8, y: p.y});
      else if (p.y > 92 || Math.abs(p.x) > 300) { this.remove(data.id); continue; }
      if (this.settings.wind && !data.frozen) body.applyForceToCenter(Vec2(this.settings.wind * def.width * .16, 0), true);
      data.temp += (this.settings.temp - data.temp) * dt * .028;
      if (data.temp > materials[def.material].ignition) {
        runtime.burning = 1;
        if (think) {
          this.burst({x: p.x, y: p.y - .35}, 0xe98a50, .55, 2);
          this.fluid.pour(p.x, p.y - .8, 7, .035, this);
          for (const near of this.findNear(p, 1.45, data.id)) near.data.temp += 1.5;
          if (this.time > (runtime.crackle ?? 0)) { this.sound('crackle', p, .28, 'environment'); runtime.crackle = this.time + .43; }
        }
        this.damage(e, dt * 4.5);
      } else runtime.burning = 0;
      if (def.material === 'ice' && data.temp > 29) {
        this.fluid.pour(p.x, p.y, 0, dt * .12, this); this.damage(e, dt * 4);
      }
      if (def.family === 'Characters' && think) {
        if (data.config.ai !== true || this.time < (runtime.stunned ?? 0)) {
          body.setFixedRotation(false); e.internal.forEach(j => (j as RevoluteJoint).enableMotor(false));
        } else this.think(e);
      }
      if (def.family === 'Charges' && data.config.armed) {
        const trigger = def.detail === 3 ? this.findNear(p, 2.4, data.id).some(n => n.def.family === 'Characters')
          : def.detail === 4 ? this.time - (runtime.contactAt ?? -10) < .12
          : this.time >= (runtime.fuse ?? 0);
        if (trigger) this.explode(e);
      }
      if (def.art === 'emitter' && data.config.on !== false) this.fluid.pour(p.x, p.y + (def.detail === 7 || def.detail === 6 ? -.45 : .47), def.detail, dt * Number(data.config.flow ?? 1.4), this);
      const liquid = this.fluid.at(p.x, p.y);
      if (liquid && liquid.type < 6 && !data.frozen) {
        const vel = body.getLinearVelocity(), buoyancy = [1, .84, .75, 1.08, 2.5, 1.3][liquid.type];
        body.applyForceToCenter(Vec2(-vel.x * liquid.amount * .9, (-this.settings.gravity * Math.min(1.8, buoyancy * 1.65 / data.density) - vel.y * .8) * body.getMass() * liquid.amount), true);
      }
      if (liquid && liquid.type === 0 && data.temp > 25) { if (runtime.burning && (runtime.hiss ?? 0) < this.time) {this.sound('splash', p, .55, 'environment'); runtime.hiss = this.time + .65;} data.temp -= dt * 110; }
      if (liquid?.type === 4) data.temp += dt * 125;
      if (liquid?.type === 3) this.damage(e, dt * 8);
      if (def.family === 'Vehicles' && (data.id === this.active || data.config.drive)) this.drive(e);
      if (data.config.on && ['thruster', 'propeller', 'fan-rotor', 'electric-rotor', 'hydraulic-actuator', 'piston-body', 'brake'].includes(data.type)) {
        if (data.type === 'brake') body.setLinearDamping(4);
        else if (data.type.endsWith('rotor')) body.applyTorque(8, true);
        else body.applyForceToCenter(body.getWorldVector(Vec2(def.detail > 1 ? def.detail : 9, 0)), true);
      } else if (data.type === 'brake') body.setLinearDamping(.13);
    }
    if (this.fluidClock >= 1 / this.settings.fluidRate - 1e-8) { this.fluid.step(this, this.fluidClock); this.fluidClock = 0; }
    if (this.deviceClock >= 1 / this.settings.deviceRate - 1e-8) { updateDevices(this, this.deviceClock); this.deviceClock = 0; }
    this.physics.step(dt, 8, 3);
    for (const {id, force} of this.pendingDamage) {
      const e = this.entities.get(id);
      if (e) this.damage(e, (force - 8) * (e.def.material === 'glass' ? 2.3 : .7) * (e.data.config.armour ? .45 : 1));
    }
    this.pendingDamage = [];
    this.effects = this.effects.filter(f => {
      f.x += f.vx * dt; f.y += f.vy * dt; f.vy += dt * 4; f.time -= dt; return f.time > 0;
    });
    this.beams = this.beams.filter(b => (b.time -= dt) > 0);
  }
  private drive(e: Entity) {
    const command = e.data.id !== this.active ? 0 : Number(this.keys.has('KeyD') || this.keys.has('ArrowRight')) - Number(this.keys.has('KeyA') || this.keys.has('ArrowLeft'));
    const brake = e.data.id === this.active && (this.keys.has('KeyS') || this.keys.has('ArrowDown'));
    const move = command || Number(e.data.config.drive ?? 0);
    for (const joint of e.internal) {
      const wheel = joint as WheelJoint; wheel.enableMotor(!!move || brake); wheel.setMotorSpeed(brake ? 0 : move * e.def.detail * 2); wheel.setMaxMotorTorque(brake ? 100 : Number(e.data.config.torque ?? 62));
    }
    if (e.def.art === 'craft' && !e.data.frozen) {
      const lift = Number(e.data.id === this.active && (this.keys.has('KeyW') || this.keys.has('ArrowUp')));
      e.body.applyForceToCenter(Vec2(move * e.body.getMass() * e.def.detail, -lift * e.body.getMass() * (this.settings.gravity + 5)), true);
      if (brake) e.body.setLinearVelocity(e.body.getLinearVelocity().mul(.93));
    }
    if (move && this.time > (e.runtime.motorSound ?? 0)) { this.sound('motor', e.body.getPosition(), .32, 'machines'); e.runtime.motorSound = this.time + .3; }
  }
}

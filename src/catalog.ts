export const materials = {
  wood: { color: 0xcb9564, density: .65, friction: .55, bounce: .16, hp: 74, ignition: 240 },
  brick: { color: 0xbb6c55, density: 1.75, friction: .8, bounce: .08, hp: 130, ignition: Infinity },
  stone: { color: 0x929da9, density: 2.1, friction: .75, bounce: .08, hp: 180, ignition: Infinity },
  steel: { color: 0xa8b8c8, density: 3.1, friction: .45, bounce: .18, hp: 250, ignition: Infinity },
  glass: { color: 0x78dee9, density: 1.5, friction: .23, bounce: .12, hp: 34, ignition: Infinity },
  rubber: { color: 0x576579, density: 1.1, friction: .88, bounce: .76, hp: 90, ignition: 350 },
  fabric: { color: 0xae8ed9, density: .5, friction: .62, bounce: .12, hp: 56, ignition: 155 },
  foliage: { color: 0x81b85b, density: .65, friction: .5, bounce: .2, hp: 68, ignition: 185 },
  ice: { color: 0xa1dbf7, density: .9, friction: .035, bounce: .06, hp: 40, ignition: Infinity },
  soil: { color: 0xa89672, density: 1.4, friction: .85, bounce: .05, hp: 95, ignition: Infinity },
} as const;
export type Material = keyof typeof materials;
export type Family = 'Building' | 'Props' | 'Characters' | 'Devices' | 'Vehicles' | 'Mechanics' | 'Nature' | 'Fluids' | 'Tools & Care' | 'Blasters' | 'Charges';
export type Shape = 'box' | 'circle' | 'ramp' | 'ramp45' | 'arch' | 'stairs' | 'tree' | 'cone';
export type Definition = {
  id: string; label: string; family: Family; width: number; height: number; material: Material;
  shape: Shape; color: number; art: string; detail: number; tags: string[]; pixels?: string[];
};
type Row = [string, number, number, Material, Shape?, number?, string?, number?];
const catalog: Definition[] = [];
function add(family: Family, rows: Row[]) {
  for (const [label, width, height, material, shape = 'box', color = materials[material].color, art = 'plate', detail = 1] of rows) {
    catalog.push({ id: label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, ''), label, family, width, height, material, shape, color, art, detail, tags: [material, family.toLowerCase(), art] });
  }
}
add('Building', [
  ['Wood cube', 1, 1, 'wood'], ['Wood beam', 3, .35, 'wood'], ['Timber panel', 1.8, .18, 'wood'], ['Wide plank', 3.8, .26, 'wood'], ['Wood post', .34, 2.8, 'wood'], ['Plywood sheet', 2.9, .12, 'wood'],
  ['Brick block', .85, .4, 'brick'], ['Brick wall', 2.45, 2.1, 'brick'], ['Concrete cube', 1.35, 1.35, 'stone'], ['Concrete wall', 4.5, 2.7, 'stone'], ['Concrete platform', 3, .5, 'stone'], ['Concrete slab', 2.45, .22, 'stone'],
  ['Steel cube', 1, 1, 'steel'], ['Steel girder', 4.7, .6, 'steel'], ['Steel plate', 3.45, .18, 'steel'], ['Steel support', .26, 3.6, 'steel'], ['Glass panel', .18, 2.6, 'glass'], ['Reinforced glass', .38, 2.9, 'glass', 'box', 0x81bccd, 'frame', 2.5],
  ['Rubber pad', 1.8, .32, 'rubber'], ['Shallow ramp', 3.2, 1.85, 'stone', 'ramp'], ['Steep ramp', 2.4, 2.4, 'steel', 'ramp45'], ['Quarter round', 2, 2, 'wood', 'arch'],
  ['Small platform', 1.8, .3, 'wood'], ['Wide platform', 5.2, .42, 'steel'], ['Staircase', 3.3, 1.8, 'stone', 'stairs'], ['Ladder', .78, 3.1, 'steel', 'box', 0x97b1bb, 'ladder'],
  ['Roof section', 2.85, .44, 'brick'], ['Fence', 2.6, 1.2, 'wood', 'box', 0xcb9564, 'ladder'], ['Hinged door', .34, 2.5, 'wood', 'box', 0xb47e56, 'frame'], ['Trapdoor', 1.8, .17, 'steel', 'box', 0x6a7785, 'frame'],
]);
add('Props', [
  ['Wood chair', .8, 1.35, 'wood', 'box', 0xb2835c, 'chair'], ['Office chair', 1, 1.45, 'fabric', 'box', 0x7685a2, 'chair'], ['Dining table', 2.4, 1.15, 'wood', 'box', 0xb98a61, 'table'], ['Office desk', 2.25, 1, 'steel', 'box', 0x718690, 'table'],
  ['Sofa', 2.55, .95, 'fabric', 'box', 0x9c7cbc, 'sofa'], ['Bed', 2.35, .55, 'fabric', 'box', 0x98acdb, 'sofa'], ['Bookshelf', 1.1, 2.25, 'wood', 'box', 0x98694c, 'shelf'], ['Tall cabinet', .86, 2.4, 'steel', 'box', 0xa8b19e, 'frame'], ['Wardrobe', 1.7, 2.55, 'wood', 'box', 0xa66b53, 'frame'],
  ['Floor lamp', .48, 1.9, 'steel', 'cone', 0xe2c571, 'light'], ['Desk lamp', .5, .65, 'steel', 'cone', 0xe2a667, 'light'], ['Computer', .73, .8, 'steel', 'box', 0x6a85a7, 'display'], ['Monitor', 1, .68, 'glass', 'box', 0x679ab3, 'display'], ['Television', 1.6, .9, 'glass', 'box', 0x8f89bc, 'display'],
  ['Oil barrel', .86, 1.05, 'steel', 'box', 0xb58a4e, 'barrel', 1.3], ['Empty barrel', .92, 1.1, 'steel', 'box', 0x6a99a7, 'barrel', .45], ['Wood crate', 1.05, .92, 'wood', 'box', 0xb48353, 'crate'], ['Metal crate', 1.35, .86, 'steel', 'box', 0x78918f, 'crate'], ['Traffic cone', .52, .82, 'rubber', 'cone', 0xf78f48], ['Road sign', .6, 1.66, 'steel', 'box', 0xe79b62, 'sign'],
]);
const characters: [string, number, Material, number, number][] = [
  ['Melon', 1, 'foliage', 0xa5db62, 1], ['Orchard', .96, 'foliage', 0xec795f, .9], ['Pumpkin', 1.08, 'foliage', 0xe9a54f, 1.15], ['Corn', 1.13, 'foliage', 0xe6ca53, .85], ['Robot', 1.04, 'steel', 0x68bded, 1.45], ['Training dummy', 1, 'wood', 0xd4a574, 1.25], ['Bog walker', 1.1, 'foliage', 0x8c9c65, 1.15], ['Skeleton', .94, 'stone', 0xe0d9bc, .52], ['Armoured guard', 1.12, 'steel', 0x7f98c8, 1.65], ['Scout', .71, 'fabric', 0x9a9ce6, .84], ['Giant', 1.65, 'foliage', 0xc480a8, 1.4], ['Heavy lifter', 1.33, 'steel', 0xb89c83, 1.85],
];
add('Characters', characters.map(([name, scale, material, color, detail]) => [name, .61 * scale, .83 * scale, material, 'box', color, 'character', detail]));
add('Nature', [
  ['Small tree', 1.5, 2.55, 'foliage', 'tree'], ['Large tree', 2.6, 4.8, 'foliage', 'tree'], ['Cut log', 1.6, .62, 'wood', 'box', 0xab7e50, 'barrel'], ['Branch', 1.55, .16, 'wood'], ['Sapling', .7, 1.36, 'foliage', 'tree'], ['Rock', .75, .65, 'stone', 'circle'], ['Boulder', 2.05, 2.05, 'stone', 'circle'], ['Pebble pile', .67, .26, 'stone', 'arch'], ['Soil block', 1.3, 1.05, 'soil'], ['Sand block', 1.8, .66, 'soil', 'box', 0xc6af75], ['Grass tuft', .47, .39, 'foliage', 'tree'], ['Shrub', 1.12, .64, 'foliage', 'tree'], ['Tall bush', 1.3, 1.5, 'foliage', 'tree'], ['Cactus', .64, 1.75, 'foliage', 'tree', 0x6b9d72], ['Snow pile', 1.22, .45, 'ice', 'arch', 0xdceffb], ['Natural ice slab', 2.6, .26, 'ice'],
]);
export const deviceLabels = [
  'Battery', 'Generator', 'Solar panel', 'Switch', 'Push button', 'Pressure plate', 'Motion sensor', 'Laser sensor', 'Sound sensor', 'Temperature sensor', 'Light sensor', 'Fire smoke sensor', 'Fluid sensor', 'Speed sensor', 'Collision sensor', 'Timer', 'Counter', 'Logic controller', 'Memory register', 'Automatic door', 'Electric motor', 'Piston actuator', 'Heater', 'Cooler', 'Electromagnet', 'Conveyor belt', 'Water pump', 'Electric valve', 'Electric fan', 'Digital display', 'Alarm speaker', 'Wireless transmitter', 'Wireless receiver', 'Melon spawner', 'Electric lamp', 'Explosion detector', 'Logic gate',
] as const;
add('Devices', deviceLabels.map((label, i) => [label, i === 19 ? .36 : i === 25 ? 3.15 : i === 33 ? 1.32 : i === 5 ? 1.45 : .71 + (i % 3) * .12, i === 19 ? 2.85 : i === 5 ? .16 : i === 25 ? .32 : .62, 'steel', i === 20 || i === 28 ? 'circle' : 'box', i < 3 ? 0x81b6d3 : i < 15 ? 0x77cec5 : i < 19 ? 0xb298df : 0xcaad77, i === 19 ? 'frame' : 'device', i]));
const vehicles: [string, number, number, number, number][] = [
  ['Compact car', 2.4, .68, 0xf6a45d, 10], ['Sedan', 3, .74, 0x83b2db, 12], ['Pickup', 3.5, .86, 0xc77a50, 11], ['Cargo truck', 4.6, 1.2, 0xd6b472, 8], ['Van', 3.35, 1.1, 0xa1adbf, 10], ['Bus', 5.5, 1.25, 0xd9ad46, 8], ['Motorcycle', 1.85, .54, 0xb984d6, 15], ['Bicycle', 1.6, .44, 0xaacd84, 7], ['Tractor', 2.9, .96, 0x8eaa62, 7], ['Forklift', 2.3, 1.04, 0xe3a75d, 7], ['Crawler', 3.36, .76, 0x9c9e6b, 9], ['Speedboat', 2.65, .58, 0x6cace9, 13], ['Workboat', 3.7, .71, 0x7ebcaf, 9], ['Hovercraft', 2.85, .65, 0x93a3bc, 11], ['Propeller plane', 3.45, .55, 0xce8d78, 15], ['Rotorcraft', 3.05, .7, 0x9d9bdd, 13],
];
add('Vehicles', vehicles.map(([label, w, h, color, speed], i) => [label, w, h, i === 11 || i === 12 ? 'wood' : 'steel', 'box', color, i >= 11 ? 'craft' : 'vehicle', speed]));
add('Mechanics', [
  ['Small wheel', .56, .56, 'rubber', 'circle'], ['Large wheel', 1.2, 1.2, 'rubber', 'circle'], ['Rubber wheel', .88, .88, 'rubber', 'circle'], ['Steel wheel', 1.05, 1.05, 'steel', 'circle'], ['Axle', 1.5, .18, 'steel'], ['Revolute hinge', .44, .44, 'steel', 'circle'], ['Weld anchor', .55, .37, 'steel'], ['Rope anchor', .34, .34, 'steel', 'circle'], ['Spring', 1, .28, 'steel', 'box', 0xabb8c4, 'spring'], ['Long spring', 1.85, .35, 'steel', 'box', 0xaab9ca, 'spring'], ['Damper', 1.02, .23, 'steel'], ['Linear slider', 1.55, .25, 'steel'], ['Small gear', .51, .51, 'steel', 'circle', 0xc49e70, 'gear'], ['Large gear', 1.1, 1.1, 'steel', 'circle', 0xbb986e, 'gear'], ['Electric rotor', .8, .8, 'steel', 'circle', 0xbfa67d, 'rotor'], ['Piston body', 1.2, .42, 'steel'], ['Hydraulic actuator', 1.5, .57, 'steel'], ['Thruster', .71, .5, 'steel', 'box', 0xe29a61, 'rotor', 28], ['Fan rotor', .88, .88, 'steel', 'circle', 0xa8bac4, 'rotor'], ['Propeller', 1.13, .22, 'steel', 'box', 0x95babd, 'rotor', 14], ['Pulley', .54, .54, 'steel', 'circle'], ['Brake', .62, .35, 'steel'], ['Suspension strut', 1.18, .34, 'steel', 'box', 0xaab2ba, 'spring'], ['Bearing', .45, .45, 'steel', 'circle'],
]);
add('Tools & Care', [
  ['Bandage', .38, .29, 'fabric', 'box', 0xe6ceb1, 'care', 12], ['Healing syringe', .52, .13, 'glass', 'box', 0x74d0af, 'care', 28], ['Recovery injector', .47, .19, 'steel', 'box', 0xd0a0df, 'care', 45], ['Health monitor', .75, .53, 'steel', 'box', 0x81d5b4, 'display', 0], ['Medical bed', 2.3, .53, 'fabric', 'box', 0xbad8d2, 'care', 15], ['Protection vest', .56, .48, 'steel', 'box', 0x86a0bd, 'care', -1], ['Stabiliser', .6, .28, 'steel', 'box', 0xc1ae88, 'care', 9], ['Resuscitation unit', .8, .67, 'steel', 'box', 0xb58195, 'care', 85],
]);
const liquids = ['Water emitter', 'Oil emitter', 'Fuel emitter', 'Chemical emitter', 'Lava emitter', 'Mud emitter', 'Steam emitter', 'Smoke emitter', 'Ice block', 'Snow emitter'];
const fluidColors = [0x5ab9ef, 0x9b7554, 0xc2a46b, 0xa0dc68, 0xe66c52, 0xa67d60, 0xbcdceb, 0x888fa1, 0x92cce5, 0xe0edf6];
add('Fluids', liquids.map((label, i) => [label, i === 8 ? 1.15 : .73, i === 8 ? 1.15 : .52, i === 8 ? 'ice' : 'steel', 'box', fluidColors[i], i === 8 ? 'plate' : 'emitter', i]));
const blasters = ['Pulse sidearm', 'Coil revolver', 'Pocket zapper', 'Arc carbine', 'Rapid ion caster', 'Scatter caster', 'Twin scatter caster', 'Longshot', 'Spark repeater', 'Bolt thrower', 'Energy bow', 'Short blade', 'Great blade', 'Chopper', 'Sledge', 'Pike', 'Light blade', 'Light ray', 'Plasma lobber', 'Comet launcher', 'Ember caster', 'Stun ray'];
add('Blasters', blasters.map((label, i) => [label, i < 3 ? .57 + i * .08 : .74 + (i % 5) * .23, .22 + (i % 4) * .05, i === 10 || i === 12 ? 'wood' : 'steel', 'box', i >= 17 ? 0x9d8cdb : 0x9ba8bc, i >= 11 && i <= 16 ? 'blade' : 'blaster', i]));
const charges = ['Bounce charge', 'Delayed charge', 'Remote burst', 'Proximity orb', 'Pressure orb', 'Burst barrel', 'Ember charge', 'Shockwave disc', 'Firework capsule', 'Energy orb'];
add('Charges', charges.map((label, i) => [label, i === 5 ? .85 : .43 + i * .04, i === 5 ? 1.07 : .42 + (i % 4) * .07, 'steel', [0, 3, 4, 7, 9].includes(i) ? 'circle' : 'box', i === 9 ? 0xb596e7 : 0xe49b6e, 'charge', i]));
export const catalogManifest = catalog;
export const definitions = new Map(catalog.map(item => [item.id, item]));
export const families: Family[] = ['Building', 'Characters', 'Props', 'Mechanics', 'Devices', 'Vehicles', 'Fluids', 'Nature', 'Blasters', 'Charges', 'Tools & Care'];

export function isCustomDefinition(value: unknown): value is Definition {
  if (!value || typeof value !== 'object') return false;
  const d = value as Definition;
  return typeof d.id === 'string' && /^custom-[a-f0-9-]{36}$/.test(d.id)
    && typeof d.label === 'string' && d.label.length > 0 && d.label.length <= 70
    && d.family === 'Building' && d.art === 'custom'
    && ['box', 'circle', 'ramp'].includes(d.shape) && Object.hasOwn(materials,d.material)
    && Number.isFinite(d.width) && d.width >= .15 && d.width <= 8 && Number.isFinite(d.height) && d.height >= .15 && d.height <= 8
    && Number.isInteger(d.color) && d.color >= 0 && d.color <= 0xffffff && d.detail === 1
    && Array.isArray(d.tags) && d.tags.length <= 8 && d.tags.every(x=>typeof x==='string'&&x.length<=40)
    && Array.isArray(d.pixels) && d.pixels.length === 144 && d.pixels.every(x=>typeof x==='string'&&(/^#[a-f0-9]{6}$/i.test(x)||x===''));
}
export function registerCustomDefinition(d: Definition) {
  if (definitions.has(d.id) || !isCustomDefinition(d)) return;
  definitions.set(d.id,d);catalogManifest.push(d);
}
export function customDefinitions(items: {type:string}[]) {
  return [...new Set(items.map(d=>d.type))].flatMap(id=>{
    const d=definitions.get(id);return d && isCustomDefinition(d)?[d]:[];
  });
}

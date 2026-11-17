import type { Entity, ForgeWorld } from './world';
export type Cell = { x: number; y: number; type: number; amount: number };
const size = .5;
const limit = 2600;
export const liquidColors = [0x56bbeb, 0xb08c56, 0xd8bd62, 0x92d761, 0xf47e5f, 0x8c6552, 0xbadfe9, 0x8b8e95, 0xa6def5, 0xe2edf5];
const key = (x: number, y: number) => x + ',' + y;
export class FluidGrid {
  cells = new Map<string, Cell>();
  private occupied = new Map<string, boolean>();
  private flip = false;
  at(x: number, y: number) { return this.cells.get(key(Math.floor(x / size), Math.floor(y / size))); }
  add(x: number, y: number, type: number, amount: number) { return this.feed(Math.floor(x / size), Math.floor(y / size), type, amount); }
  private feed(x: number, y: number, type: number, amount: number) {
    if (Math.abs(x) > 222 || Math.abs(y) > 120 || amount <= 0) return 0;
    const id = key(x, y), cell = this.cells.get(id);
    if ((cell && cell.type !== type) || (!cell && this.cells.size >= limit)) return 0;
    const accepted = Math.min(1 - (cell?.amount ?? 0), amount);
    if (cell) cell.amount += accepted;
    else this.cells.set(id, { x, y, type, amount: accepted });
    return accepted;
  }
  private blocked(x: number, y: number, world: ForgeWorld) {
    const id = key(x, y);
    if (this.occupied.has(id)) return this.occupied.get(id);
    const px = (x + .5) * size, py = (y + .5) * size;
    const solid = world.map.terrain.some(t => Math.abs(px - t.x) < t.w / 2 && Math.abs(py - t.y) < t.h / 2)
      || Boolean(world.pick({x: px, y: py})?.data.frozen && world.pick({x: px, y: py})?.data.collision);
    this.occupied.set(id, solid);
    return solid;
  }
  pour(x: number, y: number, type: number, amount: number, world: ForgeWorld) {
    const cx = Math.floor(x / size), cy = Math.floor(y / size);
    let added = 0;
    for (const offset of [0, -1, 1, -2, 2]) {
      if (!this.blocked(cx + offset, cy, world)) added += this.feed(cx + offset, cy, type, amount - added);
      if (added >= amount) break;
    }
    return added;
  }
  transfer(ax: number, ay: number, bx: number, by: number, max: number, world: ForgeWorld, source?:Entity, destination?:Entity) {
    if (max<=0 || (source && source===destination)) return 0;
    const x = Math.floor(ax / size), y = Math.floor(ay / size);
    const deliver=(type:number,amount:number)=>{
      if(!destination)return this.pour(bx,by,type,amount,world);
      const config=destination.data.config, volume=Number(config.volume??0);
      if(volume>.001&&config.fluidType!==type)return 0;
      const accepted=Math.min(amount,Math.max(0,Number(config.capacity??22)-volume));
      if(accepted>0){config.volume=volume+accepted;config.fluidType=type;}
      return accepted;
    };
    if(source){
      const config=source.data.config, available=Number(config.volume??0);
      const moved=deliver(Number(config.fluidType??0),Math.min(available,max));
      config.volume=available-moved;
      return moved;
    }
    let moved = 0;
    for (const [dx, dy] of [[0, 0], [0, 1], [-1, 0], [1, 0], [0, 2], [-2, 1], [2, 1]]) {
      if(!destination&&Math.floor(bx/size)===x+dx&&Math.floor(by/size)===y+dy)continue;
      const cell = this.cells.get(key(x + dx, y + dy));
      if (!cell || moved >= max) continue;
      const amount = deliver(cell.type,Math.min(cell.amount,max-moved));
      cell.amount -= amount; moved += amount;
    }
    return moved;
  }
  drain(x:number,y:number,max:number) {
    let drained=0;
    for(const offset of [0,-.5,.5]) {
      const cell=this.at(x+offset,y);
      if(!cell)continue;
      const amount=Math.min(max-drained,cell.amount);cell.amount-=amount;drained+=amount;
    }
    return drained;
  }
  step(world: ForgeWorld, dt: number) {
    this.occupied.clear(); this.flip = !this.flip;
    const cells = [...this.cells.values()].sort((a, b) => b.y - a.y);
    for (const cell of cells) {
      const {x, y, type} = cell;
      const gas = type === 6 || type === 7;
      const flow = [1, .62, .85, .96, .38, .29, .85, .75, .12, .2][type] ?? .7;
      const vertical = gas ? -1 : 1;
      if (cell.amount < .008) { this.cells.delete(key(x, y)); continue; }
      if (gas) cell.amount *= Math.max(.8, 1 - dt * .46);
      if (type === 9 && world.settings.temp > 2) cell.type = 0;
      if (type === 0 && world.settings.temp < -5) cell.type = 9;
      const move = (nx: number, ny: number, amount: number) => {
        if (amount > .008 && !this.blocked(nx, ny, world)) cell.amount -= this.feed(nx, ny, cell.type, Math.min(cell.amount, amount));
      };
      move(x, y + vertical, cell.amount * flow);
      const side = this.flip ? -1 : 1;
      for (const dir of [side, -side]) {
        const n = this.cells.get(key(x + dir, y));
        move(x + dir, y, (cell.amount - (n?.amount ?? 0)) * .23 * flow);
      }
    }
  }
  save() { return [...this.cells.values()].map(c => ({...c})); }
  load(data: Cell[]) { this.cells = new Map(data.slice(0, limit).map(c => [key(c.x, c.y), {...c}])); this.occupied.clear(); }
}

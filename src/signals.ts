export type Vector = { x: number; y: number };
export type Kind = 'boolean' | 'number' | 'text' | 'event' | 'object' | 'vector' | 'power';
export type Signal = boolean | number | string | Vector | { ref: string } | { event: number };
export type Port = { id: string; kind: Kind };
export type Wire = { from: string; output: string; to: string; input: string; color?: number; bends?: Vector[] };
export type Node = { id: string; inputs: Port[]; outputs: Port[]; out: Record<string, Signal> };
export const port = (id: string, kind: Kind = 'boolean'): Port => ({id, kind});
export function isSignal(kind: Kind, value: unknown): value is Signal {
  if (kind === 'number' || kind === 'power') return typeof value === 'number' && Number.isFinite(value);
  if (kind === 'boolean') return typeof value === 'boolean';
  if (kind === 'text') return typeof value === 'string' && value.length <= 512;
  if (!value || typeof value !== 'object') return false;
  const data = value as Record<string, unknown>;
  if (kind === 'event') return Number.isSafeInteger(data.event);
  if (kind === 'object') return typeof data.ref === 'string';
  return typeof data.x === 'number' && Number.isFinite(data.x) && typeof data.y === 'number' && Number.isFinite(data.y);
}
export function canConnect(nodes: Map<string, Node>, wire: Wire): boolean {
  const kind = nodes.get(wire.from)?.outputs.find(p => p.id === wire.output)?.kind;
  return wire.from !== wire.to && !!kind && kind === nodes.get(wire.to)?.inputs.find(p => p.id === wire.input)?.kind;
}
export function sampleWires(nodes: Map<string, Node>, wires: Wire[]) {
  const result = new Map<string, Record<string, Signal>>();
  for (const wire of wires) {
    if (!canConnect(nodes, wire)) continue;
    const node = nodes.get(wire.from)!;
    const value = node.out[wire.output];
    const kind = node.outputs.find(p => p.id === wire.output)!.kind;
    if (!isSignal(kind, value)) continue;
    const target = result.get(wire.to) ?? {};
    target[wire.input] = kind === 'power' ? Number(target[wire.input] ?? 0) + Number(value) : value;
    result.set(wire.to, target);
  }
  return result;
}

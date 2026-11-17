import type { Signal } from './signals';
export type Value = number | string | boolean;
export type Expr = {op: 'literal'; value: Value} | {op: 'port' | 'variable'; name: string}
  | {op: 'binary'; kind: string; a: Expr; b: Expr} | {op: 'not'; value: Expr};
export type Step = {op: 'write' | 'set' | 'log' | 'wait'; name: string; value: Expr}
  | {op: 'if'; value: Expr; yes: Step[]; no: Step[]}
  | {op: 'repeat' | 'while'; value: Expr; body: Step[]};
export type Program = {event: 'cycle' | 'start' | 'change' | 'rise'; input: string; steps: Step[]};
type Frame = {step: number; remaining: number; body: Step[]; condition?: Expr};
const numeric = (v: Value) => Number.isFinite(Number(v)) ? Math.max(-1e9, Math.min(1e9, Number(v))) : 0;

export function validateProgram(value: unknown): value is Program {
  if (!value || typeof value !== 'object') return false;
  const p = value as Program;
  let budget = 1200;
  const name = (v: unknown) => typeof v === 'string' && v.length <= 80;
  const expr = (e: Expr, depth: number): boolean => {
    if (!e || typeof e !== 'object' || depth > 24 || --budget < 0) return false;
    if (e.op === 'literal') return typeof e.value === 'boolean' || (typeof e.value === 'string' && e.value.length <= 512) || (typeof e.value === 'number' && Number.isFinite(e.value));
    if (e.op === 'variable' || e.op === 'port') return name(e.name);
    if (e.op === 'not') return expr(e.value, depth + 1);
    return e.op === 'binary' && name(e.kind) && expr(e.a, depth + 1) && expr(e.b, depth + 1);
  };
  const list = (a: Step[], depth: number): boolean => depth < 25 && Array.isArray(a) && a.every(s => {
    if (!s || typeof s !== 'object' || --budget < 0 || !expr(s.value, depth + 1)) return false;
    if (s.op === 'if') return list(s.yes, depth + 1) && list(s.no, depth + 1);
    if (s.op === 'repeat' || s.op === 'while') return list(s.body, depth + 1);
    return 'name' in s && ['write','set','wait','log'].includes(s.op) && name(s.name);
  });
  return ['cycle','start','change','rise'].includes(p.event) && name(p.input) && list(p.steps, 0);
}

export class ProgramRunner {
  error = '';
  log = '';
  variables = new Map<string, Value>();
  outputs: Record<string, Signal> = Object.create(null);
  private frames: Frame[] = [];
  private until = 0;
  private previous?: Signal;
  private started = false;
  private spent = 0;
  constructor(readonly program: Program) {}
  step(time: number, input: Record<string, Signal>) {
    if (this.error || time < this.until) return;
    const current = input[this.program.input];
    const changed = current !== this.previous;
    const rising = !!current && !this.previous; this.previous = current;
    if (!this.frames.length) {
      if ((this.program.event === 'start' && this.started) || (this.program.event === 'rise' && !rising) || (this.program.event === 'change' && !changed)) return;
      this.frames.push({step: 0, body: this.program.steps, remaining: 1});
      this.started = true; this.spent = 0;
    }
    const value = (e: Expr): Value => {
      switch (e.op) {
        case 'literal': return e.value;
        case 'variable': return this.variables.get(e.name) ?? 0;
        case 'port': {
          const v = Object.hasOwn(input, e.name) ? input[e.name] : 0;
          return typeof v === 'object' ? 0 : v;
        }
        case 'not': return !value(e.value);
        case 'binary': {
          const a = value(e.a), b = value(e.b), x = numeric(a), y = numeric(b);
          switch (e.kind) {
            case 'ADD': return numeric(x + y);
            case 'MINUS': return numeric(x - y);
            case 'MULTIPLY': return numeric(x * y);
            case 'DIVIDE': return y ? numeric(x / y) : 0;
            case 'POWER': return numeric(x ** y);
            case 'EQ': return a === b;
            case 'NEQ': return a !== b;
            case 'LT': return x < y;
            case 'LTE': return x <= y;
            case 'GT': return x > y;
            case 'GTE': return x >= y;
            case 'AND': return !!a && !!b;
            case 'OR': return !!a || !!b;
            case 'CONCAT': return (String(a) + String(b)).slice(0, 512);
          }
        }
      }
      return 0;
    };
    for (let i = 0; i < 64 && this.frames.length; i++) {
      if (++this.spent > 8192) { this.error = 'Instruction quota exceeded'; this.frames = []; return; }
      const frame = this.frames.at(-1)!;
      if (frame.step >= frame.body.length) {
        if (frame.condition ? !!value(frame.condition) : --frame.remaining > 0) frame.step = 0;
        else this.frames.pop();
        continue;
      }
      const s = frame.body[frame.step++];
      const v = value(s.value);
      if (s.op === 'write' && ['open','enable','value','message'].includes(s.name)) this.outputs[s.name] = s.name === 'value' ? numeric(v) : s.name === 'message' ? String(v).slice(0, 512) : !!v;
      else if (s.op === 'set' && (this.variables.has(s.name) || this.variables.size < 64)) this.variables.set(s.name, v);
      else if (s.op === 'log') this.log = String(v).slice(0, 120);
      else if (s.op === 'wait') { this.until = time + Math.max(.01, Math.min(60, numeric(v))); return; }
      else if (s.op === 'if') this.frames.push({step: 0, body: v ? s.yes : s.no, remaining: 1});
      else if (s.op === 'repeat' && numeric(v) >= 1) this.frames.push({step: 0, body: s.body, remaining: Math.min(256, Math.floor(numeric(v)))});
      else if (s.op === 'while' && v) this.frames.push({step: 0, body: s.body, remaining: 0, condition: s.value});
    }
  }
}

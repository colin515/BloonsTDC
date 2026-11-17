import type { Camera } from './render';
import type { ForgeWorld, Sound } from './world';

export type Mixer = { master:number;ui:number;sfx:number;machines:number;environment:number;ambient:number;mute:boolean };
const defaults: Mixer={master:.68,ui:.62,sfx:.8,machines:.62,environment:.45,ambient:.34,mute:false};
type Tone = [number,number,number,OscillatorType,number];
const tones: Record<string,Tone> = {
  click:[570,425,.065,'sine',.02], mode:[520,750,.105,'triangle',.01], place:[260,490,.16,'triangle',.13], save:[490,820,.19,'sine',.03],
  error:[225,124,.19,'triangle',.08], delete:[360,135,.14,'triangle',.13], relay:[495,195,.08,'square',.22],
  wood:[165,65,.18,'triangle',.44], brick:[125,51,.21,'triangle',.55], stone:[164,76,.15,'triangle',.7], steel:[670,317,.25,'triangle',.19],
  glass:[1470,880,.16,'sine',.31], shatter:[2650,690,.26,'triangle',.66], rubber:[330,101,.24,'sine',.15], fabric:[99,57,.14,'sine',.33], foliage:[230,105,.15,'sine',.36], ice:[1110,542,.18,'triangle',.32], soil:[89,40,.2,'triangle',.58],
  break:[127,55,.28,'triangle',.64], burst:[103,33,.58,'triangle',.89], pulse:[260,58,.24,'square',.69], zap:[1210,100,.23,'sawtooth',.29], dry:[420,155,.055,'square',.23], swish:[375,120,.135,'sine',.76],
  motor:[92,76,.31,'triangle',.13], door:[198,81,.31,'triangle',.32], generator:[64,57,.65,'sawtooth',.16], piston:[253,115,.215,'triangle',.45], fan:[128,112,.46,'sine',.47], thermal:[190,160,.55,'sine',.27],
  alarm:[920,680,.48,'square',.04], water:[320,167,.29,'sine',.54], splash:[890,230,.28,'sine',.63], crackle:[279,77,.23,'triangle',.55],
  jump:[180,410,.19,'sine',.06], step:[110,65,.105,'triangle',.58], wind:[107,49,1.2,'sine',.35],
};
export class ForgeAudio {
  private ctx?:AudioContext;
  private bus?: DynamicsCompressorNode;
  private buffer?:AudioBuffer;
  private voices=0;
  private loops=new Map<string,{osc:OscillatorNode;volume:GainNode;pan:StereoPannerNode}>();
  mixer:Mixer = {...defaults};
  constructor(readonly camera:Camera) {
    try {
      const stored=JSON.parse(localStorage.getItem('forge-audio')??'null') as Partial<Mixer>|null;
      if(stored) for(const k of Object.keys(defaults) as (keyof Mixer)[]) {
        if(k==='mute' && typeof stored[k]==='boolean') this.mixer[k]=stored[k];
        else if(k!=='mute' && typeof stored[k]==='number') this.mixer[k]=Math.max(0,Math.min(1,stored[k]));
      }
    } catch { /* defaults */ }
    document.addEventListener('visibilitychange',()=>{
      if(document.hidden) void this.ctx?.suspend();
      else void this.ctx?.resume();
    });
  }
  save(){ try{localStorage.setItem('forge-audio',JSON.stringify(this.mixer));}catch{/* session preferences still apply */} }
  async unlock(){
    if(!this.ctx) {
      const ctx=new AudioContext();this.ctx=ctx;
      const mix=ctx.createDynamicsCompressor();mix.threshold.value=-15;mix.ratio.value=6;mix.connect(ctx.destination);this.bus=mix;
      const noise=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate), samples=noise.getChannelData(0);
      let random=715193;
      for(let i=0;i<samples.length;i++) {random=(random*16807)%2147483647;samples[i]=(random/2147483647-.5)*2;}
      this.buffer=noise;
    }
    if(this.ctx.state!=='running') await this.ctx.resume();
  }
  play(event:Sound) {
    const ctx=this.ctx;
    if(event.group==='machines'&&['motor','fan','generator'].includes(event.name)) return;
    if(!ctx||ctx.state!=='running'||this.mixer.mute||this.voices>=24||!this.bus) return;
    const dx=event.x===undefined?0:event.x-this.camera.x,dy=event.y===undefined?0:event.y-this.camera.y;
    const dist=Math.hypot(dx,dy), gain=this.mixer.master*this.mixer[event.group]*event.level/(1+dist*.069);
    if(dist>42||gain<.008) return;
    const [start,end,duration,wave,noise]=tones[event.name]??tones.click;
    const time=ctx.currentTime, chain=ctx.createGain(), pan=ctx.createStereoPanner(), osc=ctx.createOscillator();
    this.voices++;
    pan.pan.value=Math.max(-1,Math.min(1,dx/(this.camera.width/this.camera.zoom*.45)));
    chain.connect(pan).connect(this.bus);
    chain.gain.setValueAtTime(.0001,time);
    chain.gain.exponentialRampToValueAtTime(Math.max(.0001,gain*.45),time+.011);
    chain.gain.exponentialRampToValueAtTime(.0001,time+duration);
    osc.type=wave;osc.frequency.setValueAtTime(start,time);osc.frequency.exponentialRampToValueAtTime(end,time+duration*.9);
    osc.connect(chain);osc.start(time);osc.stop(time+duration+.03);
    if(noise) {
      const source=ctx.createBufferSource(), filter=ctx.createBiquadFilter(), volume=ctx.createGain();
      source.buffer=this.buffer!;filter.type='lowpass';filter.frequency.setValueAtTime(start*4,time);filter.frequency.exponentialRampToValueAtTime(Math.max(50,end*2),time+duration);
      volume.gain.value=noise;source.connect(filter).connect(volume).connect(chain);source.start(time);source.stop(time+duration+.01);
    }
    osc.onended=()=>{this.voices--;chain.disconnect();pan.disconnect();};
  }
  syncMachines(world:ForgeWorld,paused:boolean) {
    const ctx=this.ctx, bus=this.bus;
    if(!ctx||!bus)return;
    const now=ctx.currentTime, audible=new Set<string>();
    const mute=paused||this.mixer.mute||ctx.state!=='running';
    if(!mute)for(const e of world.entities.values()){
      if(audible.size>=8)break;
      const id=e.data.id,type=e.data.type;
      const machine=e.node?.out.active||e.node?.out.running;
      const rolling=e.def.family==='Vehicles'&&(world.time-(e.runtime.motorSound??0)<.22);
      if(!rolling&&(!machine||!['electric-motor','electric-fan','conveyor-belt','generator'].includes(type)))continue;
      const p=e.body.getPosition(),x=p.x-this.camera.x,y=p.y-this.camera.y,d=Math.hypot(x,y);
      if(d>40)continue;
      const loudness=this.mixer.master*this.mixer.machines*.09/(1+d*.15);
      if(loudness<.004)continue;
      audible.add(id);
      let loop=this.loops.get(id);
      if(!loop){
        const osc=ctx.createOscillator(),volume=ctx.createGain(),pan=ctx.createStereoPanner();
        osc.type=type==='generator'?'sawtooth':'triangle';volume.gain.value=0;
        osc.connect(volume).connect(pan).connect(bus);osc.start();
        loop={osc,volume,pan};this.loops.set(id,loop);
      }
      const frequency=type==='generator'?65:type==='electric-fan'?114:74+Math.min(100,Math.abs(Number(e.node?.out.rpm??e.body.getLinearVelocity().x))*.55);
      loop.osc.frequency.setTargetAtTime(frequency,now,.13);
      loop.volume.gain.setTargetAtTime(loudness,now,.08);
      loop.pan.pan.setTargetAtTime(Math.max(-1,Math.min(1,x/(this.camera.width/this.camera.zoom*.45))),now,.12);
    }
    for(const [id,loop] of this.loops)if(!audible.has(id)){
      loop.volume.gain.setTargetAtTime(0,now,.035);loop.osc.stop(now+.17);
      loop.osc.onended=()=>{loop.osc.disconnect();loop.volume.disconnect();loop.pan.disconnect();};
      this.loops.delete(id);
    }
  }

}

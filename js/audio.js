'use strict';
(() => {
  let ctx, sound=true, music=false, running, next=0, beat=0, lastPop=0, lastTexture=0, sfx=.8, musicLevel=.5, noise;
  const pitches=[261.63,329.63,392,523.25,440,392,293.66,349.23,440,587.33,523.25,392];
  const bank={
    click:[420,680,.065,'sine',.09],place:[190,600,.12,'triangle',.14],buy:[500,980,.20,'triangle',.12],
    pop:[400,120,.052,'triangle',.08],boom:[94,28,.25,'triangle',.18],
    error:[180,120,.13,'triangle',.12],tick:[800,640,.026,'triangle',.065],
    start:[260,700,.23,'triangle',.1],win:[494,990,.51,'sine',.12],lose:[260,80,.55,'triangle',.13],
    clang:[1180,850,.12,"triangle",.105],shatter:[850,180,.12,"triangle",.10],rare:[400,1400,.42,'sine',.14],ability:[135,850,.32,'sine',.14]
  };
  function tone(from,to,duration,wave,volume,start=ctx.currentTime) {
    const osc=ctx.createOscillator(), gain=ctx.createGain();
    osc.type=wave;osc.frequency.setValueAtTime(from,start);
    osc.frequency.exponentialRampToValueAtTime(to,start+duration);
    gain.gain.setValueAtTime(.001,start);
    gain.gain.exponentialRampToValueAtTime(volume,start+.012);
    gain.gain.exponentialRampToValueAtTime(.001,start+duration);
    osc.connect(gain);gain.connect(ctx.destination);osc.start(start);osc.stop(start+duration+.01);
  }
  function queue() {
    if(!ctx||ctx.state!=='running'||!music||document.hidden)return;
    next=Math.max(next,ctx.currentTime+.02);
    while(next<ctx.currentTime+.25){
      const note=pitches[beat%pitches.length];
      if(musicLevel>0){tone(note,note,.25,'sine',.065*musicLevel,next);tone(note*4.01,note*4,.068,'sine',.013*musicLevel,next);}
      if(beat%3===0&&musicLevel>0)tone(note/2,note/2,.46,'triangle',.033*musicLevel,next);
      next+=.27;beat++;
    }
  }
  function activate() {
    const Audio=window.AudioContext||window.webkitAudioContext;
    if(!Audio)return;
    ctx ||= new Audio();
    if(ctx.state==='suspended')ctx.resume().catch(()=>{});
    if(music&&!running)running=setInterval(queue,110);
  }
  document.addEventListener('pointerdown',activate,{once:true});
  document.addEventListener('keydown',activate,{once:true});
  window.TDCaudio={
    settings(s,m,levels={}){sound=s;music=m;sfx=(levels.sfxVolume??80)/100;musicLevel=(levels.musicVolume??50)/100;if(m&&ctx&&!running)running=setInterval(queue,110);if(!m&&running){clearInterval(running);running=undefined;}},
    play(name){if(!sound||!sfx||!ctx||ctx.state!=='running'||!bank[name])return;
      if(name==='pop'){if(ctx.currentTime-lastPop<.075)return;lastPop=ctx.currentTime;}
      const [from,to,duration,wave,volume]=bank[name];
      const factor=name==='pop'?.88+Math.random()*.24:1;
      tone(from*factor,to*factor,duration,wave,volume*sfx);
      if(!['clang','shatter','boom'].includes(name)||ctx.currentTime-lastTexture<.065)return;
      lastTexture=ctx.currentTime;
      if(name==='clang'){tone(1840,1500,.095,'sine',.05*sfx);return;}
      if(!noise){noise=ctx.createBuffer(1,Math.round(ctx.sampleRate*.3),ctx.sampleRate);const samples=noise.getChannelData(0);for(let i=0;i<samples.length;i++)samples[i]=(Math.random()*2-1)*(1-i/samples.length);}
      const sample=ctx.createBufferSource(),gain=ctx.createGain(),filter=ctx.createBiquadFilter();
      sample.buffer=noise;filter.type=name==='boom'?'lowpass':'highpass';filter.frequency.value=name==='boom'?360:2600;
      gain.gain.value=(name==='boom'?.22:.12)*sfx;sample.connect(filter);filter.connect(gain);gain.connect(ctx.destination);sample.start();
      if(name==='boom')tone(56,24,.29,'sine',.22*sfx);
    }
  };
})();

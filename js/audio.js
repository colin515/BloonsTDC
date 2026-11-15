'use strict';
(() => {
  let ctx, sound=true, music=false, running, next=0, beat=0, lastPop=0;
  const pitches=[130.81,164.81,196,220,196,164.81,146.83,174.61,196,246.94,220,196];
  const bank={
    click:[420,680,.065,'sine',.09],place:[190,600,.12,'triangle',.14],buy:[500,980,.20,'triangle',.12],
    pop:[400,120,.052,'triangle',.08],boom:[94,28,.25,'triangle',.18],
    error:[180,120,.13,'triangle',.12],tick:[800,640,.026,'triangle',.065],
    start:[260,700,.23,'triangle',.1],win:[494,990,.51,'sine',.12],lose:[260,80,.55,'triangle',.13],
    rare:[400,1400,.42,'sine',.14],ability:[135,850,.32,'sine',.14]
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
      tone(note,note,.24,'sine',.032,next);
      if(beat%3===0)tone(note/2,note/2,.46,'triangle',.023,next);
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
    settings(s,m){sound=s;music=m;if(m&&ctx&&!running)running=setInterval(queue,110);if(!m&&running){clearInterval(running);running=undefined;}},
    play(name){if(!sound||!ctx||ctx.state!=='running'||!bank[name])return;
      if(name==='pop'){if(ctx.currentTime-lastPop<.075)return;lastPop=ctx.currentTime;}
      tone(...bank[name]);
    }
  };
})();

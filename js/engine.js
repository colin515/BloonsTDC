'use strict';
document.addEventListener('DOMContentLoaded', () => {
  const G=window.TDC,S=window.StorageManager,A=window.TDCaudio;
  const $=id=>document.getElementById(id);
  const screenNodes=[...document.querySelectorAll('.screen')];
  const number=n=>Math.max(0,Math.floor(n+1e-6)).toLocaleString('en-US');
  const cash=n=>'$'+number(n);
  const pretty=id=>id.replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase());
  const hypot=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const safe=s=>String(s).replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'})[c]);
  const html=(id,value)=>{const root=$(id);root.innerHTML=value;for(const c of root.querySelectorAll('canvas[data-art]')){const def=G.towers[c.dataset.art]||G.heroById[c.dataset.art]||G.powers.find(p=>p.id===c.dataset.art)||G.cases.find(p=>p.id===c.dataset.art)||G.accountUpgrades.find(p=>p.id===c.dataset.art);G.render.portrait?.(c,def,c.dataset.tiers.split(',').map(Number));}};
  const show=(id,value)=>{$(id).hidden=!value;};
  const text=(id,value)=>{$(id).textContent=value;};
  const disabled=v=>v?' disabled="disabled"':'';
  const btn=(label,action,value='',style='',off=false)=>'<button type="button" class="'+style+'" data-'+action+'="'+safe(value)+'"'+disabled(off)+'>'+label+'</button>';
  const portrait=(def,tiers=[0,0,0])=>'<canvas class="portrait" width="144" height="106" aria-hidden="true" data-art="'+safe(def.id)+'" data-tiers="'+tiers.join(',')+'"></canvas>';
  const glyph=(def)=>'<div class="glyph" style="--accent:'+safe(def.color||'#ffce66')+'">'+portrait(def)+'</div>';
  const clamp=(x,lo,hi)=>Math.min(hi,Math.max(lo,x));
  const TAU=Math.PI*2;
  const ABILITY_NAMES={
    fanclub:'Super Fan Club',plasmaclub:'Apex Plasma Fan Club',turbo:'Turbo Charge',missile:'MOAB Assassin',
    eliminator:'MOAB Eliminator',maelstrom:'Blade Maelstrom',superstorm:'Super Maelstrom',snowstorm:'Snowstorm',
    absolutezero:'Absolute Zero',gluestrike:'Glue Strike',gluestorm:'Glue Storm',supply:'Supply Drop',
    eliteSupply:'Elite Supply Drop',firststrike:'First Strike',preemptive:'Pre-Emptive Strike',
    pirates:'Monkey Pirates',piratelord:'Pirate Lord',groundzero:'Ground Zero',tsar:'Tsar Bomba',
    chinook:'Support Chinook',specops:'Special Poperations',battery:'Artillery Battery',popawe:'Pop and Awe',
    rocketstorm:'Rocket Storm',phoenix:'Summon Phoenix',lordphoenix:'Wizard Lord Phoenix',terror:'Tech Terror',
    antibloon:'The Anti-Bloon',sabotage:'Bloon Sabotage',grandsabo:'Grand Saboteur',tonic:'Transforming Tonic',
    transformation:'Total Transformation',bounty:"Jungle’s Bounty",loan:'IMF Loan',nomics:'Monkey-Nomics',
    spikestorm:'Spike Storm',callarms:'Call to Arms',homeland:'Homeland Defense',overclock:'Overclock',
    ultraboost:'Ultraboost',titanstomp:'Titan Stomp',gigastomp:'Giga Stomp',nanoboost:'Nano-Boost',titanmech:'Titan Protocol'
  };
  const economic=new Set(['supply','eliteSupply','chinook','specops','bounty','loan','nomics']);
  const priority=['First','Last','Close','Strong'];
  const warning=S.load();
  let profile=S.get(), screen='home', m=null, mapFilter='all', mapChoice=null, difficulty='medium';
  let dialogKind='', dialogLocked=false, toastTimer=0, lastFrame=0, accumulator=0, lastHud=0, lastPreview=0;
  let waveWarningTimer, drag;
  let catalogKey='', inspectorKey='', abilityKey='', previewItems=[];
  const modal=$('modal'), board=$('board');
  function updateProfile(fn) {
    profile=S.update(fn);
    renderProfile();
    return profile;
  }
  function stat(p,key,count=1){p.stats[key]=(p.stats[key]||0)+count;}
  function progress(key,amount=1) {
    if(m.mode==='sandbox')return;
    m.pending[key]=(m.pending[key]||0)+amount;
    m.dirtyStats=true;
  }
  function flush(){
    if(!m?.dirtyStats)return;
    const p=m.pending;
    m.pending={};m.dirtyStats=false;
    updateProfile(save=>{for(const [key,value] of Object.entries(p))stat(save,key,value);});
  }
  function notify(message,error=false) {
    clearTimeout(toastTimer);
    text('toast',message);show('toast',true);
    if(error)A.play('error');
    toastTimer=setTimeout(()=>show('toast',false),3300);
  }
  function renderProfile() {
    text('monkey-money',number(profile.mm));
    text('account-level','LVL '+profile.level);
    $('account-xp').value=profile.xp;
    $('account-xp').max=100+(profile.level-1)*30;
    for(const key of ['sound','music']){$(key).setAttribute('aria-pressed',String(profile[key]));$(key).classList.toggle('selected',profile[key]);}
    A.settings(profile.sound,profile.music,profile.settings);
    const hero=G.heroById[profile.selectedHero];text('home-hero-name',hero.name);text('home-hero-title',hero.title);
    const ready=G.tasks.filter(taskReady).length,free=Object.values(profile.cases).reduce((a,b)=>a+b,0);
    for(const [id,n] of [['task-badge',ready],['case-badge',free]]){text(id,n);show(id,n>0);}
  }
  function addAccountXp(save,amount){
    save.xp+=amount;
    while(save.xp>=100+(save.level-1)*30){save.xp-=100+(save.level-1)*30;save.level++;}
  }
  function openDialog(kind,title,body,lock=false) {
    dialogKind=kind;dialogLocked=lock;
    text('modal-title',title);html('modal-body',body);show('modal-close',!lock);
    if(!modal.open)modal.showModal();
  }
  function closeDialog(force=false) {
    if(dialogLocked&&!force)return;
    if(modal.open)modal.close();
    if((dialogKind==='pause'||dialogKind==='backup'||dialogKind==='settings')&&m&&!m.finished)m.paused=false;
    dialogKind='';dialogLocked=false;
  }
  modal.addEventListener('cancel',event=>{event.preventDefault();closeDialog();});
  $('modal-close').addEventListener('click',()=>closeDialog());
  function goto(id) {
    if(screen==='match'&&id!=='match'){flush();m=null;closeDialog(true);}
    screen=id;document.body.dataset.screen=id;
    for(const node of screenNodes)node.hidden=node.id!==id;
    window.scrollTo(0,0);
    renderScreen();
  }
  function renderScreen() {
    if(screen==='home')G.render.cover($('home-art'));
    if(screen==='maps')renderMaps();
    if(screen==='heroes')renderHeroes();
    if(screen==='cases')renderCases();
    if(screen==='shop')renderShop();
    if(screen==='tasks')renderTasks();
    if(screen==='instas')renderInstas();
    if(screen==='match'){renderHud(true);G.render.render(board,m,performance.now()/1000);}
  }
  function renderMaps() {
    for(const b of $('map-filters').querySelectorAll('button'))b.classList.toggle('selected',b.dataset.mapFilter===mapFilter);
    const maps=G.maps.filter(map=>mapFilter==='all'||map.difficulty===mapFilter);
    html('map-list',maps.map(map=>{
      const medals=Object.keys(profile.medals).filter(k=>k.startsWith(map.id+'/'));
      const dots=medals.map(k=>{const [,d,mode]=k.split('/');return '<span title="'+safe(G.difficulties[d]?.name+' '+G.modes[mode]?.name)+'">✦</span>';}).join('');
      return '<button type="button" data-map="'+map.id+'" class="map-card '+(G.hasBorder(profile.medals,map.id)?'black-border':'')+
        '"><canvas width="384" height="216" aria-hidden="true"></canvas><span class="map-info"><strong>'+map.name+'</strong><span>'+map.difficulty+
        '</span></span><span class="medal-dots" aria-label="'+medals.length+' medals">'+dots+'</span></button>';
    }).join(''));
    previewItems=[...$('map-list').querySelectorAll('canvas')].map((canvas,i)=>[canvas,maps[i]]);
    for(const [canvas,map] of previewItems)G.render.preview(canvas,map);
  }
  function renderModePicker() {
    const diffs=Object.entries(G.difficulties).map(([id,d])=>btn(d.name,'pick-difficulty',id,id===difficulty?'selected':'')).join('');
    const earned=Object.keys(profile.medals).filter(key=>key.startsWith(mapChoice.id+'/')).length;
    const modes=Object.entries(G.modes).map(([id,mode])=>{
      const medal=profile.medals[G.medalKey(mapChoice.id,difficulty,id)];
      const reward=Math.round(G.difficulties[difficulty].mm*mode.mm*(medal?.25:1)*(profile.upgrades.double_mm?2:1));
      return btn(mode.name+(medal?' · ✦':id==='sandbox'?' · Practice':' · ◇')+'<small>'+mode.description+'</small><strong>'+number(reward)+' MM</strong>','pick-mode',id);
    }).join('');
    openDialog('mode',mapChoice.name,'<p>Black Border · '+earned+' / 20 medals <progress value="'+earned+'" max="20"></progress></p><div class="filters">'+diffs+'</div><div class="mode-grid">'+modes+'</div>');
  }
  function renderHeroes() {
    html('hero-list',G.heroes.map(h=>'<article class="card">'+glyph(h)+'<h3>'+h.name+'</h3><p>'+h.title+' · '+cash(h.baseCost)+'</p><div class="card-actions">'+
      btn(profile.selectedHero===h.id?'Selected':'Select hero','hero-select',h.id,'green',profile.selectedHero===h.id)+btn('View levels','hero-levels',h.id,'quiet')+'</div></article>').join(''));
  }
  function heroDetails(id){
    const h=G.heroById[id];
    const rows=h.levels.map(s=>'<tr><th scope="row">'+s.level+'</th><td>'+s.xp+'</td><td>'+s.d+'</td><td>'+Math.round(s.r)+'</td><td>'+s.c.toFixed(2)+' s</td><td>'+
      (h.id==='cipher'?cash(s.income):h.abilities.find(a=>a.unlock===s.level)?.name||'—')+'</td></tr>').join('');
    openDialog('hero',h.name+' · '+h.title,'<p>'+h.passive+'</p>'+h.abilities.map(a=>'<p><b>Level '+a.unlock+' · '+a.name+'</b><br />'+a.description+'</p>').join('')+
      '<table class="table"><thead><tr><th>Level</th><th>Total XP</th><th>Damage</th><th>Range</th><th>Interval</th><th>'+ (h.id==='cipher'?'Income':'Unlock')+'</th></tr></thead><tbody>'+rows+'</tbody></table>');
  }
  const caseCost=c=>Math.floor(c.cost*(profile.upgrades.vip_case_discount?.85:1));
  function renderCases() {
    html('case-list',G.cases.map(c=>{
      const supply=c.id==='powers_crate';
      const labels=supply?G.powers.map(p=>p.name):G.rarity;
      const odds=c.odds.map((n,i)=>n?'<dt>'+labels[i]+'</dt><dd>'+Number(n).toFixed(supply?0:2)+'%</dd>':'').join('');
      const free=profile.cases[c.id]||0;
      return '<article class="card">'+glyph(c)+'<h3>'+c.name+'</h3><p>'+ (supply?'Two powers · odds per item':'One Insta-Monkey')+'</p><dl class="odds">'+odds+
        '</dl>'+btn(free?'Open free ('+free+')':'Open · '+caseCost(c)+' MM','case-open',c.id,'green',!free&&profile.mm<caseCost(c))+'</article>';
    }).join(''));
  }
  const rewardText=r=>r.mm?number(r.mm*(profile.upgrades.double_mm?2:1))+' MM':r.case?'1 Rusty Crate':r.insta?'1 Tier '+r.insta+' Insta':r.power?pretty(r.power):'';
  const taskReady=t=>!profile.claimed[t.id]&&(profile.stats[t.key]||0)>=t.goal;
  function renderTasks() {
    const n=G.tasks.filter(taskReady).length;text('claim-all','Claim All Ready ('+n+')');$('claim-all').disabled=!n;
    const category=$('task-category').value,q=$('task-search').value.trim().toLowerCase(), ready=$('task-ready').checked;
    const list=G.tasks.filter(t=>(!category||category===t.category)&&(!q||t.title.toLowerCase().includes(q))&&
      (!ready||(!profile.claimed[t.id]&&(profile.stats[t.key]||0)>=t.goal))).
      sort((a,b)=>Number((profile.stats[b.key]||0)>=b.goal&&!profile.claimed[b.id])-Number((profile.stats[a.key]||0)>=a.goal&&!profile.claimed[a.id]));
    text('task-count',list.length+' shown · '+Object.keys(profile.claimed).length+' / 300 claimed');
    html('task-list',list.map(t=>{
      const count=profile.stats[t.key]||0,claimed=profile.claimed[t.id],done=count>=t.goal;
      return '<article class="task card '+(done&&!claimed?'claimable':'')+'"><div><b>'+safe(t.title)+'</b><progress value="'+Math.min(t.goal,count)+'" max="'+t.goal+
        '" aria-label="'+safe(t.title)+' progress"></progress><small>'+number(count)+' / '+number(t.goal)+' · '+rewardText(t.reward)+'</small></div>'+
        btn(claimed?'Claimed':'Claim','claim',t.id,done&&!claimed?'green':'quiet',claimed||!done)+'</article>';
    }).join('')||'<p>No tasks match your filters.</p>');
  }
  function renderShop(){
    const cards=(items,account)=>items.map(p=>'<article class="card">'+glyph(p)+'<h3>'+p.name+'</h3><p>'+p.description+
      '</p>'+btn(account&&profile.upgrades[p.id]?'Owned':'Buy · '+p.cost+' MM','buy-item',p.id,'green',
        profile.mm<p.cost||(account&&profile.upgrades[p.id]))+(account?'':' <span class="chip">Owned '+(profile.powers[p.id]||0)+'</span>')+'</article>').join('');
    html('power-list',cards(G.powers,false));html('account-shop',cards(G.accountUpgrades,true));
  }
  function renderInstas(){
    html('insta-list',G.towerList.map(t=>{
      const group=profile.instas.filter(i=>i.towerId===t.id);
      return '<article class="card">'+glyph(t)+'<h3>'+t.name+'</h3><p>'+group.length+' owned</p>'+
        group.map(i=>portrait(t,i.tiers)+'<span class="chip" style="color:'+G.rarityColors[i.rarity]+'">'+i.tiers.join('–')+'</span>').join(' ')+'</article>';
    }).join(''));
  }
  function openBackup(){
    openDialog('backup','Save backup','<p>Copy your save code or paste a backup to load a profile. Importing replaces your current profile.</p><textarea id="backup-code" spellcheck="false" aria-label="Save code">'+S.exportCode()+
      '</textarea><div class="card-actions">'+btn('Copy code','save-action','copy','quiet')+btn('Import code','save-action','import','green')+'</div><p id="backup-status" aria-live="polite"></p>');
  }
  async function backupAction(action){
    const field=$('backup-code');
    if(action==='copy'){
      field.value=S.exportCode();field.select();
      try{await navigator.clipboard.writeText(field.value);text('backup-status','Copied.');}
      catch{const ok=document.execCommand('copy');text('backup-status',ok?'Copied.':'Code selected for copying.');}
      return;
    }
    if(screen==='match'){text('backup-status','Finish or leave your active match before importing.');return;}
    try{profile=S.importCode(field.value);renderProfile();renderScreen();text('backup-status','Backup imported.');A.play('buy');}
    catch(err){text('backup-status',err.message);A.play('error');}
  }
  function claim(id){
    const task=G.tasks.find(t=>t.id===id);
    if(!task||profile.claimed[id]||(profile.stats[task.key]||0)<task.goal)return;
    const reward=task.reward;
    updateProfile(p=>{
      p.claimed[id]=true;
      if(reward.mm)p.mm+=reward.mm*(p.upgrades.double_mm?2:1);
      if(reward.case)p.cases[reward.case]=(p.cases[reward.case]||0)+1;
      if(reward.insta)p.instas.push(G.insta(reward.insta));
      if(reward.power)p.powers[reward.power]=(p.powers[reward.power]||0)+1;
      addAccountXp(p,12);
    });
    A.play('buy');renderTasks();notify('Claimed · '+rewardText(reward));
  }
  function claimAll(){
    const ready=G.tasks.filter(taskReady);if(!ready.length)return;
    const totals={mm:0,cases:0,instas:0,powers:0};
    updateProfile(p=>{
      for(const {id,reward:r} of ready){
        p.claimed[id]=true;
        if(r.mm){const amount=r.mm*(p.upgrades.double_mm?2:1);totals.mm+=amount;p.mm+=amount;}
        if(r.case){p.cases[r.case]=(p.cases[r.case]||0)+1;totals.cases++;}
        if(r.insta){p.instas.push(G.insta(r.insta));totals.instas++;}
        if(r.power){p.powers[r.power]=(p.powers[r.power]||0)+1;totals.powers++;}
      }
      addAccountXp(p,ready.length*12);
    });
    renderTasks();A.play('buy');notify(ready.length+' claimed · '+totals.mm+' MM · '+totals.cases+' cases · '+totals.instas+' Instas · '+totals.powers+' powers');
  }
  function buy(id){
    const power=G.powers.find(p=>p.id===id), item=power||G.accountUpgrades.find(p=>p.id===id);
    if(!item||profile.mm<item.cost||(!power&&profile.upgrades[id]))return;
    updateProfile(p=>{p.mm-=item.cost;if(power)p.powers[id]=(p.powers[id]||0)+1;else p.upgrades[id]=true;});
    A.play('buy');renderShop();notify(item.name+' purchased.');
  }
  function describeDrop(drop){
    if(drop.powers)return {name:drop.powers.map(id=>G.powers.find(p=>p.id===id).name).join(' + '),icon:'ϟ'};
    const t=G.towers[drop.towerId];
    return {name:t.name+' '+drop.tiers.join('–'),icon:t.icon};
  }
  function celebrate(container,color) {
    for(let i=0;i<28;i++){
      const part=document.createElement('i');
      part.className='confetti';
      part.style.setProperty('--accent',[color,'#ffdd89','#a7e6b7','#f5f0d7'][i%4]);
      part.style.setProperty('--x',((Math.random()-.5)*430)+'px');
      part.style.setProperty('--y',((Math.random()-.56)*220)+'px');
      part.style.setProperty('--spin',(Math.random()*820-410)+'deg');
      container.append(part);
      setTimeout(()=>part.remove(),1050);
    }
  }
  function openCase(id) {
    const crate=G.cases.find(c=>c.id===id);
    if(!crate||dialogLocked)return;
    const free=profile.cases[id]>0, price=caseCost(crate);
    if(!free&&profile.mm<price)return;
    const winner=G.caseDrop(crate), winningIndex=37;
    const strip=Array.from({length:45},(_,i)=>i===winningIndex?winner:G.caseDrop(crate));
    updateProfile(p=>{
      if(free)p.cases[id]--;else p.mm-=price;
      if(winner.powers)for(const power of winner.powers)p.powers[power]=(p.powers[power]||0)+1;
      else p.instas.push(winner);
      stat(p,'cases');addAccountXp(p,20);
    });
    renderCases();
    const cards=strip.map(drop=>{
      const v=describeDrop(drop);
      return '<div class="drop" style="--accent:'+G.rarityColors[drop.rarity]+'">'+(drop.towerId?portrait(G.towers[drop.towerId],drop.tiers):portrait(G.powers.find(p=>p.id===drop.powers[0])))+safe(v.name)+'</div>';
    }).join('');
    openDialog('roulette',crate.name,'<div class="roulette" id="roulette"><div class="strip" id="roulette-strip">'+cards+'</div></div><p id="roulette-result" aria-live="polite">Opening…</p><div id="roulette-next"></div>',true);
    const belt=$('roulette-strip'), viewport=$('roulette'), center=()=>{
      const a=viewport.getBoundingClientRect();return a.width/2;
    };
    const offset=Math.random()*56-28, start=performance.now(), duration=matchMedia('(prefers-reduced-motion: reduce)').matches?350:4800;
    let last=-1;
    function roll(t) {
      const fraction=clamp((t-start)/duration,0,1);
      const easing=1-(1-fraction)**3.1;
      const target=winningIndex*114+54-center()+offset;
      const x=target*easing;
      belt.style.transform='translateX('+(-x)+'px)';
      const cell=Math.floor((x+center())/114);
      if(cell!==last){last=cell;A.play('tick');}
      if(fraction<1){requestAnimationFrame(roll);return;}
      const reward=describeDrop(winner);
      text('roulette-result',(winner.powers?'Bundle':G.rarity[winner.rarity])+' · '+reward.name);
      html('roulette-next',btn('Open Another ('+(profile.cases[id]?'Free':price+' MM')+')','case-open',id,'green',!profile.cases[id]&&profile.mm<price));
      dialogLocked=false;show('modal-close',true);$('modal-close').focus();
      A.play(winner.rarity>=3?'rare':'buy');
      celebrate(viewport,G.rarityColors[winner.rarity]);
    }
    requestAnimationFrame(roll);
  }
  function inShape(x,y,s,pad=0){
    if(s.r)return Math.hypot(x-s.x,y-s.y)<=s.r+pad;
    if(!s.polygon)return x>=s.x-pad&&x<=s.x+s.w+pad&&y>=s.y-pad&&y<=s.y+s.h+pad;
    let inside=false;
    for(let i=0,j=s.polygon.length-1;i<s.polygon.length;j=i++){
      const a=s.polygon[i],b=s.polygon[j];
      if((a.y>y)!==(b.y>y)&&x<(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x)inside=!inside;
      if(pad>0&&segmentDistance(x,y,a,b)<=pad)return true;
    }
    return inside;
  }
  function segmentDistance(x,y,a,b){
    const dx=b.x-a.x,dy=b.y-a.y;
    const t=clamp(((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy||1),0,1);
    return Math.hypot(x-a.x-dx*t,y-a.y-dy*t);
  }
  G.inShape=inShape;
  G.segmentDistance=segmentDistance;
  function terrain(m,x,y) {
    for(let j=m.platforms.length-1;j>=0;j--)if(inShape(x,y,m.platforms[j]))return m.platforms[j].terrain;
    if(m.map.hazards.some(s=>inShape(x,y,s)))return 'hazard';
    if(m.map.land.some(s=>inShape(x,y,s)))return 'land';
    if(m.map.waterZones.some(s=>inShape(x,y,s)))return 'water';
    return 'land';
  }
  function terrainClear(m,x,y,r,wanted){
    for(const angle of [0,1,2,3,4,5,6,-1]) {
      const px=x+(angle>=0?Math.cos(angle*TAU/7)*r:0),py=y+(angle>=0?Math.sin(angle*TAU/7)*r:0);
      const type=terrain(m,px,py);
      const frozen=type==='water'&&wanted==='land'&&m.towers.some(t=>t.stats.bridge&&Math.hypot(px-t.x,py-t.y)<=t.stats.r);
      if(!frozen&&(type==='hazard'||(wanted!=='amphibious'&&type!==wanted)))return false;
    }
    return true;
  }
  function nearbyTrack(m,x,y,r) {
    return m.paths.some(path=>path.some((b,i)=>i>0&&segmentDistance(x,y,path[i-1],b)<r+31));
  }
  function physical(m,x,y,r) {
    return x>=r&&y>=r&&x<=G.width-r&&y<=G.height-r&&!nearbyTrack(m,x,y,r)&&
      !m.map.obstacles.some(s=>inShape(x,y,s,r))&&!m.towers.some(t=>Math.hypot(t.x-x,t.y-y)<r+t.def.footprint+3);
  }
  function matchesPower(m,id,x,y) {
    if(id==='portable_pool'||id==='pontoon'){
      const r=id==='portable_pool'?46:38,wanted=id==='portable_pool'?'land':'water';
      return physical(m,x,y,r)&&terrainClear(m,x,y,r,wanted)&&!m.platforms.some(s=>inShape(x,y,s,r));
    }
    if(id==='tech_bot')return m.towers.some(t=>t.hero?t.level>=3&&Math.hypot(t.x-x,t.y-y)<=70:t.stats.ability&&Math.hypot(t.x-x,t.y-y)<=70);
    if(id==='banana_farmer')return physical(m,x,y,14)&&terrainClear(m,x,y,14,'land');
    return true;
  }
  G.canPlace=(m,choice,x,y)=>{
    if(choice.power)return matchesPower(m,choice.power.id,x,y);
    const {def}=choice,r=def.footprint;
    return physical(m,x,y,r)&&terrainClear(m,x,y,r,def.terrain);
  };
  function buildRoute(points) {
    let length=0;
    const parts=points.slice(1).map((b,i)=>{
      const a=points[i],len=hypot(a,b),start=length;length+=len;
      return {a,b,len,start,angle:Math.atan2(b.y-a.y,b.x-a.x)};
    });
    return {parts,length};
  }
  function routePoint(route,d) {
    const seg=route.parts.find(p=>d<=p.start+p.len)||route.parts[route.parts.length-1];
    const ratio=clamp((d-seg.start)/seg.len,0,1);
    return {x:seg.a.x+(seg.b.x-seg.a.x)*ratio,y:seg.a.y+(seg.b.y-seg.a.y)*ratio,angle:seg.angle};
  }
  function locateTrack(x,y,allowed=Infinity) {
    let result=null,min=allowed;
    for(let k=0;k<m.routes.length;k++){
      for(const s of m.routes[k].parts){
        const d=clamp(((x-s.a.x)*(s.b.x-s.a.x)+(y-s.a.y)*(s.b.y-s.a.y))/(s.len*s.len),0,1);
        const px=s.a.x+(s.b.x-s.a.x)*d,py=s.a.y+(s.b.y-s.a.y)*d,dist=Math.hypot(x-px,y-py);
        if(dist<min){min=dist;result={x:px,y:py,pathIndex:k,distance:s.start+d*s.len};}
      }
    }
    return result;
  }
  function startMatch(map,diff,mode) {
    closeDialog(true);
    const rules=G.difficulties[diff], sandbox=mode==='sandbox',chimps=mode==='chimps';
    const paths=map.paths.map(path=>mode==='reverse'?[...path].reverse():[...path]);
    const lives=sandbox?99999:chimps?1:rules.lives;
    m={
      map, paths, routes:paths.map(buildRoute), diff,mode,rules,time:0, round:1,maxLives:lives,lives,
      cash:(sandbox?9999999:mode==='half_cash'?325:650)+(!chimps&&!sandbox&&profile.upgrades.start_cash_plus?200:0),
      towers:[],enemies:[],shots:[],effects:[],platforms:[],traps:[],pickups:[],farmers:[],fields:[],bots:new Set(),
      cursor:{x:600,y:400,inside:false},place:null,selected:null,tab:'towers',wave:null,waveActive:false,
      pending:{},dirtyStats:false,paused:false,speed:1,freeplay:false,finished:false,autoWait:.55,
      sandbox,chimps,statsTime:0,nextId:0,settings:{hero:profile.selectedHero,auto:!sandbox&&profile.auto},
      globalSlowUntil:0,stasisUntil:0,coldUntil:0,saboUntil:0,stormUntil:0,showingInsta:false
    };
    $('auto').checked=m.settings.auto;
    show('sandbox-drawer',false);show('sandbox-toggle',sandbox);
    text('hint','Pick a tower, then click the map to deploy it.');
    catalogKey='';inspectorKey='';abilityKey='';accumulator=0;
    show('wave-warning',false);show('tower-tooltip',false);
    goto('match');
  }
  function sellValue(t) {
    if(m.chimps)return 0;
    let rate=.7;
    if(m.towers.some(s=>s.stats.sellAura&&hypot(s,t)<s.stats.r))rate=.8;
    return Math.floor(t.invested*rate);
  }
  function bonusCash(amount,extra=true) {
    if(m.chimps&&extra)return 0;
    let value=amount*(m.mode==='half_cash'?.5:1);
    if(m.loan>0&&value>0){const repaid=Math.min(m.loan,value/2);m.loan-=repaid;value-=repaid;}
    m.cash+=value;
    return value;
  }
  function funds(amount) {
    if(amount>m.cash+1e-6)return false;
    m.cash-=amount;
    if(amount>0)progress('spent',Math.round(amount));
    return true;
  }
  function price(value){return Math.round(value*m.rules.cost/5)*5;}
  const currentHero=()=>G.heroById[m.settings.hero];
  function towerCost(def){return def.id==='dart_thrower'&&m.freeDarts>0?0:price(def.baseCost);}
  function currentPickId(){
    return m.place?.insta?.uid||m.place?.def?.id||m.place?.power?.id||'';
  }
  function makeTower(def,x,y,tiers=[0,0,0],invested=0,hero=false) {
    const t={id:++m.nextId,def,x,y,tiers:[...tiers],hero,stats:hero?def.levels[0]:G.towerStats(def,tiers),invested,
      angle:-Math.PI/4,target:'First',cooldown:0,abilityAt:0,heroReady:[0,0],xp:0,level:1,pops:0,
      boostUntil:0,shotsFired:0,attackX:x,attackY:y,aimMode:'auto'};
    m.towers.push(t);
    return t;
  }
  function chooseTower(id,kind='tower') {
    const hero=kind==='hero';
    const def=hero?G.heroById[id]:G.towers[id];
    if(!def||(hero&&m.towers.some(t=>t.hero))||(m.chimps&&id==='banana_farm'))return;
    if(currentPickId()===id){clearSelection();return;}
    m.place={def,hero,stats:hero?def.levels[0]:def.base};
    m.selected=null; text('hint','Place '+def.name+' on '+(def.terrain==='amphibious'?'land or water':def.terrain)+'.');
    renderHud(true);
  }
  function chooseInsta(uid) {
    const insta=profile.instas.find(i=>i.uid===uid);
    if(!insta||m.sandbox||m.chimps)return;
    if(currentPickId()===uid){clearSelection();return;}
    const def=G.towers[insta.towerId];
    m.place={insta,def,tiers:insta.tiers,stats:G.towerStats(def,insta.tiers)};
    m.selected=null;text('hint','Place '+def.name+' '+insta.tiers.join('–')+' for free.');
    renderHud(true);
  }
  function choosePower(id) {
    const power=G.powers.find(p=>p.id===id);
    if(!power||m.chimps||m.sandbox||!profile.powers[id])return;
    if(['cash_drop','super_monkey_storm','time_stop'].includes(id)){
      activatePower(power,600,400);
      return;
    }
    if(currentPickId()===id){clearSelection();return;}
    m.place={power,r:id==='banana_farmer'?140:id==='portable_pool'?46:id==='tech_bot'?65:38};
    m.selected=null;text('hint',id==='tech_bot'?'Choose a tower with an active ability.':'Place '+power.name+' on the map.');
    renderHud(true);
  }
  function clearSelection() {
    m.place=null;m.selected=null;m.aiming=null;m.sacrificePreview=null;text('hint','');renderHud(true);
  }
  function activatePower(power,x,y) {
    const id=power.id;
    if(!profile.powers[id]||!matchesPower(m,id,x,y))return false;
    if(id==='portable_pool')m.platforms.push({x,y,r:46,terrain:'water'});
    if(id==='pontoon')m.platforms.push({x:x-38,y:y-38,w:76,h:76,terrain:'land'});
    if(id==='cash_drop')m.pickups.push({x,y,value:2500,land:m.time+.46,expires:m.time+3,salvage:1});
    if(id==='tech_bot'){
      const t=m.towers.filter(t=>(t.stats.ability||t.hero&&t.level>=3)&&hypot(t,{x,y})<=70).sort((a,b)=>hypot(a,{x,y})-hypot(b,{x,y}))[0];
      if(!t)return false;
      m.bots.add(t.id);
    }
    if(id==='banana_farmer')m.farmers.push({x,y,r:140});
    if(id==='time_stop')m.globalSlowUntil=m.time+10;
    if(id==='super_monkey_storm'){
      for(const b of [...m.enemies]){
        if(b.def.blimp)damage(b,2000,'true',null,{});
        else {b.noChildren=true;damage(b,b.hp,'true',null,{});}
      }
      effect(600,400,560,'#fff2b1',.76);
    }
    updateProfile(p=>{p.powers[id]--;stat(p,'power');});
    A.play('ability');m.place=null;text('hint','');renderHud(true);return true;
  }
  function placeAt(x,y,keep=false) {
    const choice=m.place;
    if(!G.canPlace(m,choice,x,y)){A.play('error');text('hint','This spot is blocked or has the wrong terrain.');return;}
    if(choice.power){activatePower(choice.power,x,y);return;}
    const {def,insta,hero}=choice;
    const cost=insta?0:towerCost(def);
    if(insta&&insta.tiers.some((tier,path)=>tier===5&&m.towers.some(other=>other.def===def&&other.tiers[path]===5))){
      notify('One tier-5 tower of this path is allowed.',true);return;
    }
    if(!funds(cost)){notify('Need '+cash(cost-m.cash)+' more match cash.',true);return;}
    if(cost===0&&!insta&&def.id==='dart_thrower')m.freeDarts--;
    if(insta)updateProfile(p=>{p.instas=p.instas.filter(i=>i.uid!==insta.uid);stat(p,'insta');});
    const t=makeTower(def,x,y,choice.tiers||[0,0,0],cost,hero);
    if(!hero)progress('place_'+def.id);
    if(insta)applyUpgradeEffects(t,{});
    m.selected=keep&&!insta&&!hero?null:t;m.place=keep&&!insta&&!hero?choice:null;text('hint',m.place?'Place another '+def.name+'.':'');A.play('place');renderHud(true);
  }
  function pointer(e) {
    const r=board.getBoundingClientRect(),scale=Math.min(r.width/G.width,r.height/G.height);
    const x=(e.clientX-r.left-(r.width-G.width*scale)/2)/scale,y=(e.clientY-r.top-(r.height-G.height*scale)/2)/scale;
    return {x,y,inside:x>=0&&x<=G.width&&y>=0&&y<=G.height};
  }
  function clickBoard(e) {
    if(!m||m.paused||m.finished)return;
    const point=pointer(e);
    if(!point.inside)return;
    m.cursor=point;
    if(m.place){placeAt(point.x,point.y,e.shiftKey);return;}
    if(m.aiming){
      const {tower,shift}=m.aiming;
      if(shift){
        if(!G.canPlace(m,{def:tower.def},point.x,point.y)){notify('Pick clear land for Darkshift.',true);return;}
        tower.x=point.x;tower.y=point.y;tower.attackX=point.x;tower.attackY=point.y;
      } else {tower.aim=point;tower.aimMode='locked';}
      m.aiming=null;text('hint','');renderHud(true);return;
    }
    const pickup=m.pickups.find(p=>m.time>=(p.land||0)&&hypot(p,point)<30);
    if(pickup){collect(pickup);renderHud();return;}
    m.sacrificePreview=null;
    m.selected=[...m.towers].reverse().find(t=>hypot(t,point)<t.def.footprint+9)||null;
    text('hint','');renderHud(true);
  }
  function upgradePrice(t,path,index){
    const nearby=m.towers.filter(tower=>tower!==t&&hypot(tower,t)<tower.stats.r);
    if(t.def.category==='Primary'&&((index===0&&nearby.some(t=>t.stats.primaryMentoring||t.stats.primaryExpert))||
      (index===1&&nearby.some(t=>t.stats.primaryExpert))))return 0;
    const discounted=index<3?Math.min(.15,nearby.reduce((sum,t)=>sum+(t.stats.discount||0),0)):0;
    return price(t.def.paths[path][index].cost*(1-discounted));
  }
  function applyUpgradeEffects(t,previous) {
    if(t.stats.sacrifice&&(!previous.sacrifice||Math.max(...t.tiers)===5)){
      let total=0;
      for(const other of m.towers.filter(p=>p!==t&&!p.hero&&hypot(t,p)<Math.min(145,t.stats.r))){
        total+=other.invested;m.bots.delete(other.id);m.towers.splice(m.towers.indexOf(other),1);
      }
      t.sacrifice=(t.sacrifice||0)+Math.floor(total/345);
      if(total)effect(t.x,t.y,130,'#ffd67a',.6);
    }
    if(t.stats.opolis&&!previous.opolis){
      let total=0;
      for(const farm of m.towers.filter(p=>p.def.id==='banana_farm'&&hypot(t,p)<t.stats.r)){
        total+=farm.invested;m.towers.splice(m.towers.indexOf(farm),1);m.bots.delete(farm.id);
      }
      t.absorbed=Math.round(total*.36);
    }
    if(t.stats.submerge&&!previous.submerge)t.submerged=true;
  }
  function upgrade(path) {
    const t=m.selected;
    if(!t||t.hero)return;
    const index=t.tiers[path],tiers=[...t.tiers];tiers[path]++;
    if(!G.legalTiers(tiers))return;
    if(index===4&&m.towers.some(other=>other!==t&&other.def===t.def&&other.tiers[path]===5)){notify('One tier-5 tower of this path is allowed.',true);return;}
    const cost=upgradePrice(t,path,index);
    if(!funds(cost))return;
    const last=t.stats;
    t.tiers=tiers;t.invested+=cost;t.stats=G.towerStats(t.def,tiers);
    if(t.stats.ability!==last.ability)t.abilityAt=Math.min(t.abilityAt,m.time+3);
    applyUpgradeEffects(t,last);
    progress('upgrade_'+t.def.id);
    if(index===4)progress('tier5_'+t.def.id);
    A.play('buy');effect(t.x,t.y,42,'#ffdf86',.48);renderHud(true);
  }
  function sell() {
    const t=m.selected;
    if(!t||m.chimps)return;
    if(t.hero)notify('Hero slot is available again.');
    m.cash+=sellValue(t);m.bots.delete(t.id);m.towers.splice(m.towers.indexOf(t),1);
    m.traps=m.traps.filter(p=>p.owner!==t);m.selected=null;A.play('buy');renderHud(true);
  }
  function heroXp(t,xp) {
    if(t.level>=20)return;
    t.xp+=xp;
    const level=t.def.levels.findLast(s=>s.xp<=t.xp);
    if(level.level!==t.level){t.level=level.level;t.stats=level;effect(t.x,t.y,53,'#ffe28a',.62,'Lv. '+t.level);}
  }
  const boostPrice=t=>t.level>=20?0:Math.round((t.def.levels[t.level].xp-t.xp)*2.5);
  function buyHeroXp() {
    const t=m.selected;
    if(!t?.hero||t.level===20||!funds(boostPrice(t)))return;
    heroXp(t,t.def.levels[t.level].xp-t.xp);A.play('buy');renderHud(true);
  }
  function collect(p) {
    const i=m.pickups.indexOf(p);
    if(i<0)return;
    m.pickups.splice(i,1);
    const earned=bonusCash(p.value);
    effect(p.x,p.y,17,'#ffdc76',.55,'+'+cash(earned));A.play('buy');
  }
  function effect(x,y,r,color,total=.25,label='',end=null) {
    const cap={high:540,medium:240,low:80}[profile.settings.quality];
    if(m.effects.length>=cap)return;
    if(profile.settings.shake&&r>=65&&(!end&&!label))m.shakeUntil=m.time+.24;
    m.effects.push({x,y,r,color,life:total,total,text:label,...(end?{x2:end.x,y2:end.y}:{})});
  }
  function ruleHp(def,fort,superCeramic){
    const effective=def.id==='ceramic'&&superCeramic?60:def.hp;
    const free=m.round>100&&def.blimp?1+(m.round-100)*.10:1;
    return Math.round(effective*(fort?2:1)*(def.blimp&&m.mode==='double_hp_moabs'?2:1)*free);
  }
  function spawn(type,pathIndex,flags='',distance=0,parent=null) {
    const def=G.bloons[type], route=m.routes[pathIndex], superCeramic=parent?.superCeramic??m.round>=81;
    const fort=flags.includes('f')&&(def.blimp||type==='ceramic'||type==='lead');
    const regrowPath=parent?[...(!parent.def.blimp?[parent.def.id]:[]),...parent.regrowPath]:[];
    const b={id:++m.nextId,def,pathIndex,distance,normalizedProgress:distance/route.length,
      ...routePoint(route,distance),camo:flags.includes('c')||type==='ddt',regrow:flags.includes('r'),
      fort,regrowPath,superCeramic,hp:0,maxHp:0,stun:0,slowTime:0,slow:1,lastDamage:m.time,
      dot:0,dotUntil:0,nextDot:m.time+.5,dead:false,mark:0,markUntil:0};
    b.hp=b.maxHp=ruleHp(def,fort,superCeramic);
    if(parent){
      if(parent.def.id==='ddt')b.regrow=true;
      if(parent.inherit){b.dot=parent.dot;b.dotUntil=parent.dotUntil;b.slow=parent.slow;b.slowTime=parent.slowTime;b.inherit=true;}
      b.golden=parent.golden;
    }else{
      if(m.saboUntil>m.time&&type!=='bad'){b.slow=.5;b.slowTime=m.saboUntil-m.time;if(m.grandSabo&&def.blimp)b.hp*=.75;}
      if(def.blimp){
        for(const t of m.towers.filter(t=>t.stats.entryHit)){
          if(b.hp<=0)break;
          b.hp-=t.stats.entryHit;
        }
        const trojan=m.towers.find(t=>t.stats.trojan&&(t.trojanAt||0)<=m.time);
        if(trojan&&['moab','bfb'].includes(type)){b.noChildren=true;b.trojan=true;trojan.trojanAt=m.time+12;}
      }
    }
    m.enemies.push(b);
    if(b.hp<=0)pop(b,null,0,{});
    return b;
  }
  function pop(b,t,excess,s) {
    if(b.dead)return;
    b.dead=true;
    progress('pops');
    if(b.def.blimp)progress('blimps');
    if(t)t.pops++;
    let value=G.cashScalar(m.round);
    if(!m.chimps){
      if(b.golden)value*=2;
      if(b.trojan)value+=35;
      if(t?.buff?.cashAura)value*=1+t.buff.cashAura;
      if(t?.buff?.popBonus)value+=t.buff.popBonus;
      if(b.def.blimp&&t?.stats.scrap)value+=t.stats.scrap;
    }
    bonusCash(value,false);
    effect(b.x,b.y,b.def.blimp?b.def.r*1.1:18,b.def.color,b.def.blimp?.35:.16);A.play(b.def.blimp?'boom':b.def.id==='ceramic'||b.frozen?'shatter':'pop');
    let children=b.noChildren?[]:b.def.children;
    if(b.superCeramic&&!b.def.blimp)children=children.slice(0,1);
    const flags=(b.camo?'c':'')+(b.regrow?'r':'')+(b.fort?'f':'');
    const leftovers=excess>0?Math.floor(excess/Math.max(children.length,1)):0;
    for(let index=0;index<children.length;index++){
      const child=spawn(children[index],b.pathIndex,flags,Math.max(0,b.distance-index*(b.def.blimp?16:8)),b);
      if(leftovers)damage(child,leftovers,s.type||'true',t,{});
    }
    if(b.deathStun)for(const e of m.enemies)if(!e.dead&&near(b,e,57)&&e.def.id!=='bad')e.stun=Math.max(e.stun,.45);
    if(b.iceShards)for(const e of m.enemies.filter(e=>!e.dead&&near(b,e,51)).slice(0,6))damage(e,2,'sharp',null,{});
    if(b.unstable&&b.def.blimp)for(const e of m.enemies.filter(e=>!e.dead&&near(b,e,92)).slice(0,20))damage(e,Math.max(8,Math.floor(b.maxHp*.1)),'true',null,{});
    if(t?.stats.zombie&&m.traps.length<220)addTrap(t,b,t.stats.zombie,5,{moving:true,d:t.stats.zombie,type:'true',p:9},'#845bb19c');
  }
  const near=(a,b,r)=>(a.x-b.x)**2+(a.y-b.y)**2<=r*r;
  function damage(b,n,type,t,s) {
    if(b.dead)return false;
    const id=b.def.id;
    if(type!=='true'&&(b.def.immune.includes(type)||(type==='sharp'&&b.stun>.25&&b.frozen))){if(['lead','ddt'].includes(id))A.play('clang');return false;}
    if(s.decamo)b.camo=false;
    if(s.stripRegrow)b.regrow=false;
    if(b.fort&&(s.defortifyAll||(s.defortify&&!['bad','zomg','ddt'].includes(id)))){
      b.fort=false;b.maxHp/=2;b.hp=Math.min(b.hp,b.maxHp);
    }
    if(s.leadGold&&id==='lead'&&!m.chimps){bonusCash(50);b.noChildren=true;n=Math.max(n,b.hp);}
    if(s.shrink&&b.def.blimp&&id!=='bad'){
      b.def=G.bloons.red;b.maxHp=b.hp=1;b.fort=false;b.regrow=false;b.noChildren=true;return true;
    }
    if(s.capture&&id!=='bad'&&(!b.def.blimp||s.capture>=700&&id!=='zomg')&&b.hp<=s.capture){
      b.noChildren=true;bonusCash(s.capture>=700?180:25);n=Math.max(n,b.hp);
    }
    if(s.takedown&&b.hp<=b.maxHp*.5&&b.def.blimp&&
      (id===s.takedown||s.takedown==='bad'||s.takedown==='bfb'&&id==='moab')){b.noChildren=true;n=Math.max(n,b.hp);}
    n+=(b.def.blimp?s.moab||0:0)+(id==='ceramic'?s.ceramic||0:0)+(b.fort?s.fortDamage||0:0);
    if(n>0){
      if(b.markUntil>m.time)n+=b.mark;
      b.hp-=n;b.lastDamage=m.time;
      if(profile.settings.damage&&n>=1&&m.time-(b.damageLabelAt||-1)>.45&&m.effects.length<190){
        b.damageLabelAt=m.time;effect(b.x,b.y-13,8,'#fff0b0',.36,number(n));
      }
    }
    if(s.mark){b.mark=Math.max(b.markUntil>m.time?b.mark:0,s.mark);b.markUntil=m.time+4;}
    if(s.rubberGold)b.golden=true;
    if(s.inherit)b.inherit=true;
    if(t?.def.id==='glue_gunner'&&s.slow<1)b.glued=true;
    if(s.iceShards)b.iceShards=true;
    if(s.deathStun)b.deathStun=true;
    if(s.unstable)b.unstable=true;
    if(b.hp<=0){pop(b,t,-b.hp,s);return true;}
    if(id!=='bad'&&(!b.def.blimp||s.moabStun)){
      if(s.stun){b.stun=Math.max(b.stun,s.stun);if(type==='cold'||s.permafrost)b.frozen=true;}
      if(s.slow&&s.slow<1){b.slow=Math.min(b.slow,s.slow);b.slowTime=Math.max(b.slowTime,s.statusTime||3);}
      if(s.permafrost){b.slow=.72;b.slowTime=Math.max(b.slowTime,9);}
      if(s.back){b.distance=Math.max(0,b.distance-s.back*(b.def.blimp?.5:1));}
    }
    if(s.dot){b.dot=Math.max(b.dotUntil>m.time?b.dot:0,s.dot);b.dotUntil=m.time+(s.statusTime||3);b.dotSource=t;}
    if(s.sticky&&b.def.blimp&&!b.sticky){b.sticky={at:m.time+1.8,amount:s.sticky,source:t};}
    return true;
  }
  function chooseTargets(t,s,origin=t,mustBeInRange=true) {
    const valid=[];
    for(const b of m.enemies){
      if(b.dead||(b.camo&&!s.camo&&!s.decamo))continue;
      const inRange=near(origin,b,s.r);
      if(mustBeInRange&&!inRange&&!(s.intel&&m.towers.some(other=>other!==t&&near(other,b,other.stats.r)&&(!b.camo||other.stats.camo))))continue;
      if(s.type!=='true'&&b.def.immune.includes(s.type)&&!s.decamo&&!s.frags&&!s.vine)continue;
      if(!s.ignoreObstacles&&['beam','dart','fan','aim'].includes(s.attack)&&t.def.id!=='fighter_ace'&&m.map.obstacles.some(zone=>blocked(origin,b,zone)))continue;
      valid.push(b);
    }
    return valid.sort((a,b)=>t.target==='Last'?a.normalizedProgress-b.normalizedProgress:
      t.target==='Close'?hypot(origin,a)-hypot(origin,b):t.target==='Strong'?b.def.rank-a.def.rank||b.hp-a.hp:
      b.normalizedProgress-a.normalizedProgress);
  }
  function blocked(a,b,zone) {
    if(zone.r)return segmentDistance(zone.x,zone.y,a,b)<zone.r*.83;
    for(let i=1;i<8;i++){const t=i/8;if(inShape(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t,zone))return true;}
    return false;
  }
  function setBuffs(){
    for(const t of m.towers){
      const s=t.stats, buff={speed:1,range:1,pierce:0,damage:0,abilitySpeed:1};
      let coders=0, druids=0, ninjas=0, over=0;
      if(t.ultra)buff.speed*=1.066**t.ultra;
      if(m.stasisUntil>m.time)buff.speed*=1.5;
      for(const other of m.towers){
        const o=other.stats,local=near(t,other,o.r);
        if(o.globalCooldown)buff.abilitySpeed=Math.min(buff.abilitySpeed,o.globalCooldown);
        if(o.sniperAura&&t.def.id==='sniper_operative')buff.speed*=1.33;
        if(o.carrierAura&&(t.def.terrain==='water'||t.def.id==='fighter_ace'))buff.speed*=1.2;
        if(o.subAura&&t.def.id==='submarine'&&local){buff.damage+=s.d;buff.pierce+=s.p;}
        if(other.hero&&other.def.id==='cipher'&&other.boostUntil>m.time&&(local||other.level>=14)){
          buff.speed*=1.3;buff.popBonus=other.level>=14?2:1;
        }
        if(other.teamUntil>m.time&&(local||other.teamGlobal)){buff.speed*=other.teamSpeed||1.5;buff.pierce+=Math.floor(s.p*.5);}
        if(other===t||!local)continue;
        if(o.drums)buff.speed*=1.18;
        if(o.radar)buff.camo=true;
        if(o.mib)buff.type='true';
        if(o.cashAura)buff.cashAura=Math.max(buff.cashAura||0,o.extraCashAura?.65:.5);
        if(o.magicAura&&t.def.category==='Magic'){buff.range*=1.15;buff.pierce+=2;}
        if(other.def.category==='Magic')coders++;
        if(o.primaryTraining&&t.def.category==='Primary'){buff.range*=1.12;buff.pierce+=o.primaryExpert?9:3;buff.speed*=o.primaryMentoring?1.14:1;}
        if(o.slowCooldown&&(other.hero||t.hero||t.def.terrain==='water'))buff.abilitySpeed=Math.min(buff.abilitySpeed,o.slowCooldown);
        if(o.shinobi&&t.def.id==='ninja_assassin')ninjas++;
        if(o.poplust&&t.def.id==='spirit_druid')druids++;
        if(o.acidAura){buff.type='steel';buff.moab=1;}
        if(o.brewAura){buff.damage=Math.max(buff.damage,o.stimulant?3:1);over=Math.max(over,o.permaBrew?.32:o.stimulant?.23:.16);}
      }
      if(s.magicSpeed)buff.speed*=1+coders*.1;
      if(over){buff.speed*=1+over;buff.range*=1+over;buff.pierce+=2;}
      buff.speed*=1+Math.min(20,ninjas)*.105+Math.min(5,druids)*.15;
      buff.pierce+=Math.min(20,ninjas)+Math.min(5,druids);
      if(t.boostUntil>m.time&&t.boostStats){
        buff.speed*=t.boostStats.speed||1;buff.damage+=t.boostStats.damage||0;
        if(t.boostStats.type)buff.type=t.boostStats.type;
      }
      t.buff=buff;
    }
    m.slowAuras=m.towers.filter(t=>t.stats.timeAura||t.stats.iceAura||t.stats.growBlock||t.stats.pulseDecamo);
  }
  const firing=(t)=> {
    const s={...t.stats},b=t.buff||{speed:1,range:1,pierce:0,damage:0};
    s.r*=b.range;s.p+=b.pierce;s.d+=b.damage+(t.sacrifice||0);
    s.c/=b.speed;
    s.camo=Boolean(s.camo||b.camo);s.type=b.type||s.type;s.moab=(s.moab||0)+(b.moab||0);
    if(s.vengeance)s.c/=1+clamp(1-m.lives/m.maxLives,0,1);
    if(s.wrath)s.c/=1+Math.min(.75,(t.streak||0)*.035);
    if(s.avatar)s.d+=Math.min(70,Math.floor(m.enemies.length/3));
    if(s.finishSpeed)s.c/=1+Math.max(0,...m.enemies.map(e=>e.normalizedProgress))*2;
    if(t.boostUntil>m.time&&t.boostStats){
      s.shots=Math.max(s.shots,t.boostStats.shots||0);
      if(t.boostStats.attack)s.attack=t.boostStats.attack;
      if(t.boostStats.splash)s.splash=t.boostStats.splash;
      if(t.boostStats.range)s.r=Math.max(s.r,t.boostStats.range);
    }
    return s;
  };
  function zoneAttack(origin,r,s,t,max=s.p) {
    effect(origin.x,origin.y,r,t?.def.color||'#e7ffff',.31);
    const victims=m.enemies.filter(b=>!b.dead&&(s.camo||!b.camo||s.decamo)&&near(origin,b,r)).slice(0,max);
    for(const b of victims)damage(b,s.d,s.type,t,s);
    return victims;
  }
  function globalAttack(s,t,count=Infinity,score=null){
    const enemies=m.enemies.filter(b=>!b.dead);
    if(score)enemies.sort(score);
    for(const b of enemies.slice(0,count))damage(b,s.d,s.type,t,s);
    effect(600,400,550,t?.def.color||'#f9e4a7',.45);
  }
  function addTrap(owner,point,hits,r,stats,color='#294949a8') {
    if(m.traps.length>=260)return;
    const nearPoint=locateTrack(point.x,point.y);
    if(!nearPoint)return;
    m.traps.push({...nearPoint,r:Math.max(r,12),owner,hits,stats,hit:new Set(),color,
      expires:m.time+(stats.trapTime||12)});
  }
  function shoot(t,origin,b,s,angle) {
    if(m.shots.length>=1100)return;
    const flying=s.attack;
    const a=angle??Math.atan2(b.y-origin.y,b.x-origin.x);
    const isBlast=flying==='blast';
    const life=isBlast?Math.max(.035,hypot(origin,b)/Math.max(1,s.velocity))+.22:Math.min(2.8,(s.r+70)/s.velocity);
    m.shots.push({x:origin.x,y:origin.y,vx:Math.cos(a)*s.velocity,vy:Math.sin(a)*s.velocity,angle:a,
      life,age:0,turnAfter:(hypot(origin,b)+28)/s.velocity,size:isBlast?7:flying==='arc'?6:3.5,color:isBlast?'#e59a50':t.def.color,owner:t,
      hits:0,hit:new Set(),stats:s,target:b,guided:['seek','blast'].includes(flying),blast:isBlast,origin:{x:origin.x,y:origin.y}});
  }
  function hitBlast(t,s,point) {
    const r=s.splash||45;
    zoneAttack(point,r,s,t);
    if(s.hazard)addTrap(t,point,50,r*.73,{...s,attack:'field',trapTime:s.hazard,d:Math.max(s.dot||0,1),p:14},'#d16c4988');
    if(s.frags||s.clusters){
      const f={...s,type:s.frags?'sharp':s.type,frags:0,clusters:0,d:Math.max(1,Math.ceil(s.d*.6)),p:Math.max(s.frags||0,s.clusters||0)*2};
      const count=s.clusters?(s.recursive&&t.shotsFired%2!==0?Math.floor(s.clusters/2):s.clusters):1;
      for(let i=0;i<count;i++){
        const a=i*TAU/count;
        zoneAttack({x:point.x+Math.cos(a)*r*.65,y:point.y+Math.sin(a)*r*.65},r*.55,f,t);
      }
    }
  }
  function towerAttack(t,dt) {
    const s=firing(t), def=t.def;
    t.cooldown-=dt;
    if(t.airAt===undefined)t.airAt=m.time;
    if(def.id==='heli_pilot'||t.mobileUntil>m.time){
      const patrol=t.aimMode==='patrol';
      const route=m.routes[0];
      const target=patrol?routePoint(route,(m.time*132)%route.length):
        s.pursuit?chooseTargets(t,s,t,false)[0]:(m.cursor.inside?m.cursor:chooseTargets(t,s,t,false)[0]);
      if(target){
        const d=Math.hypot(target.x-t.attackX,target.y-t.attackY), moved=Math.min(d,dt*s.movement);
        if(d>1){t.attackX+=(target.x-t.attackX)*moved/d;t.attackY+=(target.y-t.attackY)*moved/d;}
      }
    } else if(def.id==='fighter_ace'){
      const prevX=t.attackX,prevY=t.attackY;
      const a=m.time*.95+t.id,fig=t.aimMode==='figure8'&&!s.centered;
      t.attackX=t.x+Math.cos(a)*(s.centered?86:127);
      t.attackY=t.y+Math.sin(fig?a*2:a)*(fig?70:92);
      t.angle=Math.atan2(t.attackY-prevY,t.attackX-prevX);t.bankAngle=Math.cos(a*2)*.16;
    }
    const origin=['heli_pilot','fighter_ace'].includes(def.id)||t.mobileUntil>m.time?{x:t.attackX,y:t.attackY}:t;
    if(s.trackThorns&&t.cooldown<=0){
      globalAttack({...s,d:3,type:'true',camo:true},t);
    }
    if(s.sentry||s.aircraft||s.comanche||s.orbital){
      const count=s.sentry||s.aircraft||(s.comanche&&m.enemies.some(b=>b.normalizedProgress>.5)?3:s.orbital?1:0);
      if(count&&m.time>=t.airAt){
        t.airAt=m.time+Math.max(.18,s.c*.8);const aims=chooseTargets(t,{...s,r:s.r*(s.aircraft?3:1.35)},origin);
        for(let i=0;i<Math.min(aims.length,count);i++){
          const b=aims[i],x=origin.x+Math.cos(m.time+i*TAU/count)*42,y=origin.y+Math.sin(m.time+i*TAU/count)*28;
          effect(x,y,3.3,def.color,.19,'',b);damage(b,Math.floor(s.d*.47)+2,s.orbital?'true':s.type,t,{...s,moab:(s.moab||0)*.3});
        }
      }
    }
    if(s.autoStorm&&m.time>=(t.stormAt||15)&&m.enemies.length){spikeStorm(t,s);t.stormAt=m.time+15;}
    if(t.cooldown>0)return;
    if(s.attack==='farm'||s.attack==='support'){t.cooldown=.55;return;}
    if((t.submerged&&s.submerge)||s.attack==='pulse'||s.attack==='orbit'){
      const attack=t.submerged?{...s,r:s.r,p:Math.max(s.p,18),d:t.tiers[0]===3?0:s.d,type:'true',camo:true,decamo:true}:s;
      if(chooseTargets(t,attack,origin).length){zoneAttack(origin,attack.r,attack,t,attack.p);t.cooldown=attack.c;}
      if(s.meteor){const strongest=[...m.enemies].filter(b=>!b.dead).sort((a,b)=>b.def.rank-a.def.rank)[0];if(strongest)hitBlast(t,{...s,d:30,splash:42},strongest);}
      return;
    }
    if(s.attack==='trap'){
      const route=m.routes[(t.shotsFired+++(m.round%2))%m.routes.length];
      const point=s.smartSpike&&t.aimMode==='exit'?routePoint(route,route.length-65):
        s.smartSpike&&t.aimMode==='entry'?routePoint(route,75):locateTrack(t.x,t.y,s.r+12);
      if(point)addTrap(t,point,s.p,20,s);
      t.cooldown=s.c;return;
    }
    const targets=chooseTargets(t,s,origin);
    if(!targets.length&&!['locked','follow'].includes(t.aimMode)){t.streak=0;t.cooldown=.04;return;}
    let b=targets[0];
    const aim=t.aimMode==='locked'?t.aim:t.aimMode==='follow'&&m.cursor.inside?m.cursor:null;
    if(aim&&!s.autoAim)b=aim;
    if(!b){t.cooldown=.04;return;}
    if(def.id!=='fighter_ace')t.angle=Math.atan2(b.y-origin.y,b.x-origin.x);
    t.cooldown=Math.max(.038,s.c);t.shotsFired++;t.streak=(t.streak||0)+1;
    if(s.crit&&t.shotsFired%4===0)s.d=Math.max(s.d,s.crit);
    if(s.rotors)zoneAttack(origin,38,{...s,d:Math.max(1,s.d),type:'steel'},t,8);
    if(s.bombard||s.pineapple)hitBlast(t,{...s,splash:s.bombard?60:28,d:Math.max(1,s.d)},b);
    if(s.caltrops&&t.shotsFired%4===0)addTrap(t,b,4,14,{...s,d:1,trapTime:13,p:3});
    if(s.vine&&b.def&&!b.def.blimp&&t.shotsFired%4===0){b.noChildren=true;damage(b,b.hp,'true',t,s);}
    if(s.katana&&near(origin,b,65)&&b.def){
      zoneAttack(b,35,{...s,d:s.d*3,type:s.type},t,4);
      return;
    }
    if(s.attack==='beam'||s.attack==='chain'){
      let from=origin;
      const direction=Math.atan2(b.y-origin.y,b.x-origin.x);
      const beam=s.attack==='chain'?targets.slice(0,Math.min(s.p,40)):targets.filter(e=>{
        if(t.def.id==='sniper_operative')return e===b;
        if(t.def.id==='gatling_gunner'||s.r>400){
          const ray={x:origin.x+Math.cos(direction)*s.r,y:origin.y+Math.sin(direction)*s.r};
          return segmentDistance(e.x,e.y,origin,ray)<e.def.r+10;
        }
        return e===b||s.p>2&&segmentDistance(e.x,e.y,origin,b)<e.def.r+6;
      }).slice(0,Math.min(s.p,70));
      for(const e of beam){effect(from.x,from.y,Math.min(9,2+s.d*.14),def.color,.15,'',e);damage(e,s.d,s.type,t,s);if(s.attack==='chain')from=e;}
      if(s.dual&&targets.length>1){const strongest=[...targets].sort(byStrength)[0];effect(origin.x,origin.y,4,def.color,.17,'',strongest);damage(strongest,s.d,s.type,t,s);}
      if(s.frags&&beam.length&&m.enemies.length>1)zoneAttack(beam[0],32,{...s,d:Math.max(1,s.d*.4),type:'sharp'},t,s.frags);
      return;
    }
    if(def.id==='beast_handler')t.companion={x:b.x,y:b.y};
    if(s.attack==='bite'){
      if(s.beast)effect(origin.x,origin.y,5,'#7be1be',.26,'',b);
      zoneAttack(b,s.beast?31:23,{...s,d:s.d,type:s.type},t,Math.max(1,s.shots));
      return;
    }
    if(s.attack==='blast'||s.splash>0&&['dart','aim'].includes(s.attack)){
      shoot(t,origin,b,{...s,attack:'blast'});return;
    }
    const spread=s.attack==='ring'?TAU/s.shots:.15;
    const angle=Math.atan2(b.y-origin.y,b.x-origin.x);
    for(let i=0;i<s.shots;i++){
      if(s.attack==='seek'){shoot(t,origin,targets[i%targets.length]||b,s);continue;}
      const a=s.attack==='ring'?t.shotsFired*.17+i*spread:angle+(i-(s.shots-1)/2)*spread;
      shoot(t,origin,b,s,a);
    }
  }
  const byStrength=(a,b)=>b.def.rank-a.def.rank||b.hp-a.hp;
  function projectileStep(dt) {
    const scale=m.globalSlowUntil>m.time?.2:1;
    for(const shot of m.shots){
      const t=shot.owner,s=shot.stats;
      shot.life-=dt*scale;shot.age+=dt*scale;
      if(shot.life<=0){if(shot.blast)hitBlast(t,s,shot.target);continue;}
      const old={x:shot.x,y:shot.y};
      if(shot.guided&&!shot.target.dead){
        const a=Math.atan2(shot.target.y-shot.y,shot.target.x-shot.x);
        shot.vx=Math.cos(a)*s.velocity;shot.vy=Math.sin(a)*s.velocity;shot.angle=a;
      }
      if(s.attack==='arc'&&!shot.guided&&shot.age>=shot.turnAfter){
        const angle=Math.atan2(shot.origin.y-shot.y,shot.origin.x-shot.x);
        shot.vx=shot.vx*.89+Math.cos(angle)*s.velocity*.11;shot.vy=shot.vy*.89+Math.sin(angle)*s.velocity*.11;
      }
      if(shot.blast&&hypot(shot,shot.target)<=s.velocity*dt*scale+8){
        hitBlast(t,s,shot.target);shot.life=0;continue;
      }
      shot.x+=shot.vx*dt*scale;shot.y+=shot.vy*dt*scale;
      if(!shot.blast){
        for(const b of m.enemies){
          if(b.dead||(!s.camo&&b.camo&&!s.decamo)||shot.hit.has(b.id))continue;
          if(segmentDistance(b.x,b.y,old,shot)>b.def.r+shot.size)continue;
          const hit=damage(b,s.d,s.type,t,s);
          shot.hit.add(b.id);
          if(!hit)continue;
          shot.hits++;
          if(shot.hits===1&&s.frags)zoneAttack(b,32,{...s,d:Math.max(1,s.d*.4),type:'sharp'},t,s.frags);
          if(shot.hits===1&&s.hazard)addTrap(t,b,18,29,{...s,attack:'field',d:s.hazard,trapTime:s.hazard},'#f4945280');
          if(s.ricochet){
            const target=m.enemies.find(e=>!e.dead&&!shot.hit.has(e.id)&&near(b,e,90)&&(s.camo||!e.camo));
            if(target){shot.guided=true;shot.target=target;}
          }
          if(shot.hits>=s.p){shot.life=0;break;}
        }
      }
      if(shot.x < -170 || shot.y < -170 || shot.x > 1370 || shot.y > 970)shot.life=0;
    }
    m.shots=m.shots.filter(s=>s.life>0);
  }
  function fieldTick(dt) {
    for(const trap of m.traps){
      if(trap.expires<=m.time||trap.hits<=0)continue;
      if(trap.stats.moving){
        const route=m.routes[trap.pathIndex];trap.distance-=dt*232;
        if(trap.distance<0){trap.hits=0;continue;}
        Object.assign(trap,routePoint(route,trap.distance));
      }
      if((trap.next||0)>m.time)continue;
      const s=trap.stats, periodic=s.attack==='field';
      if(periodic){trap.next=m.time+.35;trap.hit.clear();}
      for(const b of m.enemies){
        if(b.dead||trap.hit.has(b.id)||!near(trap,b,trap.r+b.def.r))continue;
        if(trap.owner?.def.id!=='spike_factory'&&!s.camo&&b.camo)continue;
        if(damage(b,s.d,s.type,trap.owner,s)){
          trap.hit.add(b.id);trap.hits--;
          if(trap.hits===0&&s.mine)zoneAttack(trap,s.splash,{...s,d:s.d*3,type:'true',camo:true},trap.owner,30);
          if(trap.hits<=0)break;
        }
      }
    }
    m.traps=m.traps.filter(p=>p.hits>0&&p.expires>m.time);
    for(const f of m.fields){
      if(f.until<=m.time||f.next>m.time)continue;
      f.next=m.time+f.interval;f.tick();
    }
    m.fields=m.fields.filter(f=>f.until>m.time);
  }
  function repeat(seconds,interval,tick) {
    m.fields.push({until:m.time+seconds,next:m.time,interval,tick});
  }
  function enemyStep(dt) {
    const slowed=m.globalSlowUntil>m.time;
    for(const b of m.enemies){
      if(b.dead)continue;
      const timeImmune=b.def.id==='bad';
      b.stun=Math.max(0,b.stun-dt);
      b.slowTime=Math.max(0,b.slowTime-dt);
      if(!b.slowTime)b.slow=1;
      if(!b.stun)b.frozen=false;
      if(b.dotUntil>m.time&&b.nextDot<=m.time){b.nextDot=m.time+.5;damage(b,b.dot,'acid',b.dotSource,{});if(b.dead)continue;}
      if(b.sticky&&b.sticky.at<=m.time){
        const s=b.sticky;b.sticky=null;
        zoneAttack(b,48,{d:s.amount,type:'true',p:8,camo:true},s.source);
        if(b.dead)continue;
      }
      let aura=1,blocked=false;
      for(const t of m.slowAuras||[]){
        if(!near(t,b,t.stats.r))continue;
        if(t.stats.timeAura)aura=Math.min(aura,t.stats.timeAura);
        if(t.stats.iceAura)aura=Math.min(aura,.71);
        if(t.stats.growBlock)blocked=true;
        if(t.stats.pulseDecamo)b.camo=false;
      }
      if(b.regrow&&!blocked&&!b.def.blimp&&m.time-b.lastDamage>=2){
        if(b.def.id==='ceramic')b.hp=Math.min(b.maxHp,b.hp+2);
        else if(b.regrowPath.length){
          b.def=G.bloons[b.regrowPath.shift()];b.maxHp=b.hp=ruleHp(b.def,b.fort,b.superCeramic);
        }
        b.lastDamage=m.time;
      }
      const route=m.routes[b.pathIndex];
      const speed=b.def.speed*(m.round>100?1+(m.round-100)*.014:1);
      const global=slowed?.2:m.stasisUntil>m.time?0:m.coldUntil>m.time?.4:1;
      if(timeImmune||b.stun===0)b.distance+=dt*speed*(timeImmune?1:Math.min(b.slow,aura,global));
      Object.assign(b,routePoint(route,b.distance));
      b.normalizedProgress=b.distance/route.length;
      if(b.distance>=route.length){
        b.dead=true;
        const portal=m.towers.find(t=>t.stats.portal&&(t.portalAt||0)<=m.time);
        if(portal){portal.portalAt=m.time+120;effect(b.x,b.y,72,'#b398e8',.7);continue;}
        const shield=m.towers.find(t=>t.stats.shield&&(t.shieldAt||0)<=m.time);
        let penalty=b.def.blimp?100+(b.def.rank-12)*25:b.superCeramic?b.def.singleLeak:b.def.leak;
        if(shield){penalty=Math.max(0,penalty-shield.stats.shield);shield.shieldAt=m.time+35;}
        m.lives-=penalty;
        const retaliate=m.towers.find(t=>t.stats.leakburst&&(t.leakAt||0)<=m.time);
        if(retaliate&&penalty){retaliate.leakAt=m.time+40;globalAttack({d:220,type:'true',camo:true},retaliate);}
      }
    }
    m.enemies=m.enemies.filter(e=>!e.dead);
  }
  function temporaryBoost(t,duration,speed,damage=0,more={}) {
    t.boostUntil=m.time+duration;t.boostStats={speed,damage,...more};
    effect(t.x,t.y,t.def.footprint*2,t.def.color,.5);
  }
  function spikeStorm(t,s){
    for(const route of m.routes)for(let d=100;d<route.length;d+=95){
      addTrap(t,routePoint(route,d),Math.max(3,s.p),25,{...s,trapTime:18,d:Math.max(2,s.d)});
    }
  }
  function heroAbility(t,index) {
    const a=t.def.abilities[index];
    if(t.level<a.unlock||t.heroReady[index]>m.time)return false;
    const power={d:14+t.level*3,type:'true',camo:true,p:100,moab:t.level*5};
    const top=()=>m.enemies.filter(b=>!b.dead).sort(byStrength);
    const tick=(duration,interval,fn)=>repeat(duration,interval,fn);
    const code=a.code;
    if(code==='cipher1')t.boostUntil=m.time+10;
    if(code==='cipher2'){
      const sequence={bad:'zomg',zomg:'bfb',ddt:'moab',bfb:'moab',moab:'ceramic',ceramic:'rainbow',
        rainbow:'zebra',zebra:'black',lead:'black',purple:'pink',white:'pink',black:'pink',pink:'yellow',yellow:'green',green:'blue',blue:'red'};
      let total=0;
      for(const b of top().slice(0,10)){
        if(b.def.id==='red'){damage(b,1,'true',t,{});continue;}
        total+=Math.round(b.hp*.15);
        const prev=b.def.id;
        b.def=G.bloons[sequence[prev]];b.hp=b.maxHp=ruleHp(b.def,false,b.superCeramic);b.fort=false;
      }
      if(total)bonusCash(1500+total);
    }
    if(code==='chronos1'){
      for(const b of m.enemies)if(b.def.id!=='bad'&&near(t,b,t.stats.r*1.35))b.distance=Math.max(0,b.distance-m.routes[b.pathIndex].length*.25);
    }
    if(code==='chronos2')m.stasisUntil=m.time+6;
    if(code==='valkyrie1'){
      const targets=top();
      for(let i=0;i<12&&targets.length;i++)shoot(t,t,targets[i%targets.length],{...power,attack:'seek',r:1700,velocity:790});
    }
    if(code==='valkyrie2')tick(8,.19,()=>{const b=top()[0];if(b){effect(b.x,0,9,'#fff3ab',.20,'',b);zoneAttack(b,93,{...power,d:power.d*2},t,22);}});
    if(code==='blaze1')tick(8,.45,()=>globalAttack({...power,d:10+t.level*2,type:'fire',dot:7},t));
    if(code==='blaze2'){
      const enemies=top().slice(0,5);
      for(const b of enemies)hitBlast(t,{...power,splash:116,d:power.d*8,dot:12},b);
    }
    if(code==='frostbite1')zoneAttack(t,t.stats.r*1.85,{...power,d:3,stun:3,moab:0,moabStun:true},t);
    if(code==='frostbite2'){m.coldUntil=m.time+10;tick(10,.75,()=>globalAttack({...power,d:power.d*.7,type:'cold',moab:8,slow:.4,moabStun:true},t));}
    if(code==='viper1'){
      const b=[...m.enemies].filter(x=>!x.dead).sort((a,b)=>b.normalizedProgress-a.normalizedProgress)[0];
      if(b){
        effect(t.x,t.y,8,t.def.color,.35,'',b);
        tick(.9,.107,()=>{const enemy=b.dead?top()[0]:b;if(enemy)damage(enemy,power.d*2,'true',t,power);});
      }
    }
    if(code==='viper2')tick(12,.32,()=>{
      const enemies=top();
      for(let i=0;i<3&&enemies.length;i++){
        const b=enemies[Math.floor(i*enemies.length/3)];
        effect(b.x-32,b.y-23,5,t.def.color,.21,'',b);zoneAttack(b,37,{...power,d:power.d*1.5},t,7);
      }
    });
    if(code==='titan_x1'){
      const b=top()[0]||{x:t.x+1,y:t.y};
      const a=Math.atan2(b.y-t.y,b.x-t.x),end={x:t.x+Math.cos(a)*1800,y:t.y+Math.sin(a)*1800};
      effect(t.x,t.y,13,'#bef4ff',.45,'',end);
      for(const e of m.enemies)if(segmentDistance(e.x,e.y,t,end)<e.def.r+14)damage(e,power.d*10,'true',t,power);
    }
    if(code==='titan_x2')temporaryBoost(t,15,3.2,18,{shots:4,splash:54,type:'plasma',attack:'blast'});
    t.heroReady[index]=m.time+a.cooldown*(t.buff?.abilitySpeed||1);
    effect(t.x,t.y,56,t.def.color,.54);A.play('ability');return true;
  }
  function towerAbility(t) {
    const s=firing(t),ability=s.ability;
    if(!ability||m.time<t.abilityAt||(m.chimps&&economic.has(ability)))return false;
    const shot={d:250,type:'true',camo:true,p:100};
    const local=(tower,r=s.r)=>near(t,tower,r);
    const top=()=>m.enemies.filter(b=>!b.dead).sort(byStrength);
    const nuke=(d,stun=0)=>globalAttack({...shot,d,stun,moabStun:true},t);
    const boost=(duration,speed,d=0,more={})=>temporaryBoost(t,duration,speed,d,more);
    let cd=45;
    switch(ability){
      case 'fanclub':case 'plasmaclub':
        for(const other of m.towers.filter(o=>o.def.id==='dart_thrower'&&local(o,ability==='plasmaclub'?1700:340)).slice(0,20))
          temporaryBoost(other,12,ability==='plasmaclub'?5:3,ability==='plasmaclub'?8:2,{type:'plasma',shots:3,attack:ability==='plasmaclub'?'beam':'fan'});
        cd=55;break;
      case 'turbo':boost(10,5,t.tiers[1]===5?s.d:2);cd=35;break;
      case 'missile':case 'eliminator':case 'firststrike':case 'preemptive':{
        const b=top().find(e=>e.def.blimp)||top()[0];
        const power={missile:1200,eliminator:4500,firststrike:10000,preemptive:15000}[ability];
        if(!b)return false;
        if(power>=10000&&b.hp<=power)b.noChildren=true;
        hitBlast(t,{...shot,d:power,splash:ability==='missile'?70:108},b);
        cd=ability==='eliminator'?10:55;break;
      }
      case 'maelstrom':case 'superstorm':{
        const strong=ability==='superstorm';
        repeat(strong?5:3,.11,()=>zoneAttack(t,strong?260:177,{...shot,d:strong?13:3,type:strong?'steel':'sharp',p:70},t));
        cd=32;break;
      }
      case 'snowstorm':case 'absolutezero':
        nuke(ability==='snowstorm'?1:12,ability==='snowstorm'?4:8);
        if(ability==='absolutezero')for(const other of m.towers.filter(o=>o.def.id==='ice_emitter'))temporaryBoost(other,10,1.5);
        cd=50;break;
      case 'gluestrike':case 'gluestorm':{
        const coating={...shot,d:0,slow:.22,statusTime:14,mark:2,moabStun:true,dot:ability==='gluestorm'?8:0,inherit:true};
        globalAttack(coating,t);
        if(ability==='gluestorm')repeat(12,.8,()=>globalAttack(coating,t));
        cd=42;break;
      }
      case 'supply':case 'eliteSupply':
        m.pickups.push({x:t.x+22,y:t.y+14,value:ability==='supply'?1100:3000,land:m.time+.32,expires:m.time+6,salvage:1});
        cd=50;break;
      case 'pirates':case 'piratelord':{
        const list=top().filter(b=>['moab','bfb',...(ability==='piratelord'?['zomg','ddt']:[])].includes(b.def.id));
        if(!list.length)return false;
        for(const b of list.slice(0,ability==='pirates'?1:3)){
          effect(t.x,t.y,6,'#e4c48b',.46,'',b);b.noChildren=true;
          damage(b,b.hp,'true',t,{});bonusCash(b.def.hp*(ability==='piratelord'?2:1));
        }
        cd=47;break;
      }
      case 'groundzero':nuke(700);cd=55;break;
      case 'tsar':nuke(3000,5);cd=65;break;
      case 'chinook':case 'specops':
        bonusCash(ability==='chinook'?1500:3500);
        m.lives=Math.min(m.maxLives,m.lives+(ability==='chinook'?10:25));
        if(ability==='specops')boost(22,2.4,14,{attack:'beam'});
        cd=55;break;
      case 'battery':boost(8,4,1);cd=36;break;
      case 'popawe':repeat(8,1,()=>nuke(24,1.3));cd=54;break;
      case 'rocketstorm':repeat(4,.34,()=>{for(const b of top().slice(0,5))hitBlast(t,{...shot,d:Math.max(12,s.d*4),splash:61},b);});cd=42;break;
      case 'phoenix':case 'lordphoenix':boost(20,3,ability==='lordphoenix'?24:7,{type:'fire',attack:'blast',splash:90,range:1250});cd=55;break;
      case 'terror':case 'antibloon':zoneAttack(t,ability==='terror'?250:660,{...shot,d:ability==='terror'?2000:6500,p:300},t);cd=50;break;
      case 'sabotage':case 'grandsabo':
        m.saboUntil=m.time+15;m.grandSabo=ability==='grandsabo';
        globalAttack({...shot,d:0,slow:.5,statusTime:15,moabStun:true},t);cd=54;break;
      case 'tonic':case 'transformation':
        boost(20,4,7,{type:'plasma',attack:'beam'});
        if(ability==='transformation')for(const other of m.towers.filter(o=>o!==t&&local(o)&&!o.hero&&Math.max(...o.tiers)<4).slice(0,5))
          temporaryBoost(other,20,4,7,{type:'plasma',attack:'beam'});
        cd=50;break;
      case 'bounty':bonusCash(300+m.towers.filter(o=>o.def.id==='banana_farm'&&local(o)).length*120);cd=43;break;
      case 'loan':bonusCash(10000);m.loan=(m.loan||0)+10000;cd=90;break;
      case 'nomics':bonusCash(10000);cd=60;break;
      case 'spikestorm':spikeStorm(t,s);cd=50;break;
      case 'callarms':case 'homeland':
        t.teamUntil=m.time+(ability==='homeland'?18:12);t.teamGlobal=ability==='homeland';t.teamSpeed=t.teamGlobal?2:1.5;cd=60;break;
      case 'overclock':case 'ultraboost':{
        const target=m.towers.filter(o=>o!==t&&!o.hero&&local(o,225)).sort((a,b)=>b.invested-a.invested)[0]||t;
        temporaryBoost(target,30,1.66);
        if(ability==='ultraboost')target.ultra=Math.min(10,(target.ultra||0)+1);
        cd=38;break;
      }
      case 'titanstomp':case 'gigastomp':
        zoneAttack(t,s.r*1.7,{...shot,d:ability==='gigastomp'?1300:175,stun:3,moabStun:true},t,150);cd=38;break;
      case 'nanoboost':t.shieldAt=m.time;t.teamUntil=m.time+14;t.teamSpeed=1.4;cd=42;break;
      case 'titanmech':
        t.mobileUntil=m.time+18;t.attackX=t.x;t.attackY=t.y;
        boost(18,5,28,{attack:'blast',type:'plasma',range:455,splash:87});cd=48;break;
      default:return false;
    }
    t.abilityAt=m.time+cd*(t.buff?.abilitySpeed||1);
    effect(t.x,t.y,48,t.def.color,.58);A.play('ability');return true;
  }
  function useAbility(id,index) {
    const t=m.towers.find(t=>t.id===id);
    if(!t)return;
    if(t.hero)heroAbility(t,index);
    else towerAbility(t);
    renderHud(true);
  }
  function startWave() {
    if(m.waveActive||m.paused||m.finished)return;
    const rounds=G.getRound(m.round);
    m.wave={rounds,group:0,count:0,next:m.time+rounds[0].wait,spawned:0};
    m.waveActive=true;A.play('start');
    const warning={24:'Camo incoming',28:'Lead incoming',40:'MOAB incoming',60:'BFB incoming',63:'Ceramic rush',80:'ZOMG incoming',90:'DDTs incoming',95:'DDT swarm',100:'BAD boss'}[m.round];
    if(warning){text('wave-warning',warning);show('wave-warning',true);clearTimeout(waveWarningTimer);waveWarningTimer=setTimeout(()=>show('wave-warning',false),2500);}
    renderHud(true);
  }
  function advanceWave(){
    const w=m.wave;
    if(!w)return;
    const lanes=m.routes.length;
    while(w.group<w.rounds.length&&m.time>=w.next){
      const g=w.rounds[w.group];
      const count=m.map.route==='alternate'?1:Math.min(lanes,g.count-w.count);
      for(let lane=0;lane<count;lane++){
        const route=m.map.route==='alternate'?(m.round-1)%lanes:(w.spawned++)%lanes;
        spawn(g.type,route,g.flags);
      }
      w.count+=count;w.next+=g.gap;
      if(w.count>=g.count){w.group++;w.count=0;w.next+=w.rounds[w.group]?.wait||0;}
    }
    if(w.group>=w.rounds.length)m.wave=null;
  }
  function farmsAndHero() {
    for(const t of m.towers){
      if(t.hero){
        heroXp(t,24+Math.floor(m.round*4.4)+Math.floor(m.round*m.round*.022));
        if(!m.chimps&&profile.upgrades.hero_xp_boost)heroXp(t,Math.round((24+m.round*4.4+m.round*m.round*.022)/4));
      }
      if(m.chimps)continue;
      const s=t.stats;
      if(s.lives)m.lives=Math.min(m.maxLives,m.lives+s.lives);
      if(s.freeDart)m.freeDarts=(m.freeDarts||0)+1;
      if(s.repair)m.lives=Math.min(m.maxLives,m.lives+2);
      if(!s.income)continue;
      let value=s.income+(t.absorbed||0);
      if(s.valuable)value*=1.25;
      if(t.def.id==='banana_farm'){
        const cipher=m.towers.find(o=>o.stats.farmBoost);
        if(cipher)value*=1+cipher.stats.farmBoost;
        if(s.income===1500&&m.towers.some(o=>o.stats.central))value*=1.25;
        if(s.bank){t.bank=Math.min(s.bank,Math.floor(((t.bank||0)+value)*1.15));if(profile.settings.banks&&t.bank>=s.bank){bonusCash(t.bank);t.bank=0;}continue;}
        if(!s.market){
          const quantity=[4,6,8,16,5,5][t.tiers[0]];
          for(let j=0;j<quantity;j++){
            const angle=TAU*j/quantity;
            m.pickups.push({x:clamp(t.x+Math.cos(angle)*43,16,1184),y:clamp(t.y+Math.sin(angle)*35,16,784),
              value:value/quantity,expires:m.time+(s.longBanana?32:16),salvage:s.salvage||0});
          }
          continue;
        }
      }
      if(t.def.id==='buccaneer_ship'&&s.income){
        const trade=m.towers.filter(o=>o!==t&&o.stats.merchantAura).length;
        const market=m.towers.filter(o=>o.stats.tradeAura).length;
        value*=1+trade*.15+market*.1;
      }
      bonusCash(value);
    }
  }
  function resultBody(desc,actions){
    return '<p>'+desc+'</p><div class="card-actions">'+actions+'</div>';
  }
  function resolveRound() {
    m.waveActive=false;
    const round=m.round;
    progress('rounds');
    bonusCash(100+round,false);
    farmsAndHero();flush();
    if(!m.sandbox&&round===100){
      const tier=G.roll([8,13,32,28,17,2]);
      const prize=G.insta(tier);
      updateProfile(p=>p.instas.push(prize));m.showingInsta=true;m.paused=true;
      const reward=describeDrop(prize);
      openDialog('round100','Round 100 · Insta-Monkey',resultBody('You unlocked <b>'+safe(reward.name)+'</b>.',
        btn('Continue','match-action','round100','green')),true);
      celebrate($('modal-body'),G.rarityColors[prize.rarity]);A.play('rare');return;
    }
    afterRound();
  }
  function afterRound(){
    const r=m.round;
    if(!m.sandbox&&!m.freeplay&&r>=m.rules.end){
      const key=G.medalKey(m.map.id,m.diff,m.mode), first=!profile.medals[key];
      let gain=0;
      updateProfile(p=>{
        gain=Math.round(m.rules.mm*G.modes[m.mode].mm*(first?1:.25)*(p.upgrades.double_mm?2:1));
        p.mm+=gain;addAccountXp(p,50+r);
        if(first){
          p.medals[key]=true;
          const wins=Object.keys(p.medals);
          p.stats['wins_'+m.diff]=new Set(wins.filter(x=>x.split('/')[1]===m.diff).map(x=>x.split('/')[0])).size;
          p.stats.wins_chimps=new Set(wins.filter(x=>x.endsWith('/chimps')).map(x=>x.split('/')[0])).size;
          p.stats.black=G.maps.filter(map=>G.hasBorder(p.medals,map.id)).length;
        }
      });
      m.finished=true;m.paused=true;A.play('win');
      openDialog('victory','Victory',resultBody('You cleared round '+r+' and earned <b>'+number(gain)+' MM</b>.'+(first?' New medal awarded.':''),
        btn('Continue in Freeplay','match-action','freeplay','green')+btn('Map selection','match-action','maps','quiet')),true);
    }else{
      m.round++;m.autoWait=.75;
      renderHud(true);
    }
  }
  function defeat() {
    if(m.finished)return;
    flush();m.lives=0;m.finished=true;m.paused=true;A.play('lose');
    openDialog('defeat','Defense breached',resultBody('Your defenses fell on round '+m.round+'.',
      btn('Retry','match-action','retry','green')+
      (!m.chimps&&!m.sandbox?btn('Continue · 100 MM','match-action','continue','',profile.mm<100):'')+
      btn('Map selection','match-action','maps','quiet')),true);renderHud(true);
  }
  function pause() {
    if(!m||m.paused||m.finished||modal.open)return;
    flush();m.paused=true;
    openDialog('pause','Paused',resultBody(m.map.name+' · Round '+m.round,
      btn('Resume','match-action','resume','green')+btn('Settings','match-action','settings','quiet')+btn('Restart','match-action','retry','quiet')+
      btn('Map selection','match-action','maps','quiet')));
  }
  function matchAction(action) {
    if(!m)return;
    if(action==='settings'){openSettings(true);return;}
    if(action==='resume'){closeDialog(true);return;}
    if(action==='maps'){closeDialog(true);goto('maps');return;}
    if(action==='confirm-leave'){closeDialog(true);goto('home');return;}
    if(action==='retry'){flush();startMatch(m.map,m.diff,m.mode);return;}
    if(action==='continue'&&!m.chimps&&profile.mm>=100){
      updateProfile(p=>p.mm-=100);
      m.lives=m.maxLives;
      m.wave=null;m.waveActive=false;m.enemies=[];m.shots=[];m.traps=[];m.fields=[];
      m.finished=false;m.paused=false;m.autoWait=1;closeDialog(true);renderHud(true);return;
    }
    if(action==='freeplay'){
      m.round++;m.freeplay=true;m.finished=false;m.paused=false;m.autoWait=1;
      closeDialog(true);renderHud(true);return;
    }
    if(action==='round100'){
      closeDialog(true);m.paused=false;m.showingInsta=false;afterRound();
    }
  }
  function simulation(dt) {
    m.time+=dt;m.statsTime+=dt;
    if(m.statsTime>2){m.statsTime=0;flush();}
    if(m.waveActive)advanceWave();
    if((m.buffAt||0)<=m.time){setBuffs();m.buffAt=m.time+.15;}
    if(m.waveActive||m.enemies.length){
      for(const t of [...m.towers]){
        towerAttack(t,dt);
        
      }
    }else for(const t of m.towers)t.cooldown=Math.max(0,t.cooldown-dt);
    for(const t of m.towers)if(m.bots.has(t.id)){
      if(t.hero)t.def.abilities.forEach((_,i)=>heroAbility(t,i));
      else towerAbility(t);
    }
    projectileStep(dt);fieldTick(dt);enemyStep(dt);
    for(const item of [...m.pickups]){
      if(m.time<(item.land||0))continue;
      const hover=m.cursor.inside&&hypot(item,m.cursor)<24;
      const auto=m.farmers.some(p=>near(p,item,p.r))||m.towers.some(t=>t.stats.autoHarvest&&near(t,item,155));
      if(hover||auto)collect(item);
      else if(m.time>=item.expires){
        if(item.salvage){item.value*=item.salvage;collect(item);}
        else m.pickups.splice(m.pickups.indexOf(item),1);
      }
    }
    m.effects=m.effects.filter(e=>(e.life-=dt)>0);
    if(m.lives<=0){defeat();return;}
    if(m.waveActive&&!m.wave&&!m.enemies.length){resolveRound();return;}
    if(!m.waveActive&&!m.enemies.length&&m.settings.auto&&(m.autoWait-=dt)<=0)startWave();
  }
  function catalogButton(item,kind,caption,off=false,key=item.id) {
    return '<button type="button" class="'+(currentPickId()===key?'selected':'')+'" data-place-kind="'+kind+'" data-place-id="'+safe(key)+'" style="--accent:'+safe(item.color||'#ffce66')+
      '" title="'+safe(item.name+(item.terrain?' · '+item.terrain:''))+'"'+disabled(off)+'>'+portrait(item,item.artTiers)+safe(item.name)+'<small>'+safe(caption)+'</small></button>';
  }
  function renderCatalog(force) {
    const affordable=G.towerList.map(t=>m.cash>=towerCost(t)?1:0).join('')+(m.cash>=towerCost(currentHero())?1:0);
    const key=[m.tab,affordable,currentPickId(),m.towers.some(t=>t.hero),m.freeDarts||0,profile.instas.length,
      G.powers.map(p=>profile.powers[p.id]||0).join(',')].join('|');
    if(!force&&catalogKey===key)return;
    catalogKey=key;show('tower-tooltip',false);
    for(const b of $('match-tabs').querySelectorAll('button')){
      b.classList.toggle('selected',b.dataset.tab===m.tab);
      b.disabled=b.dataset.tab!=='towers'&&(m.chimps||m.sandbox);
    }
    let content='';
    if(m.tab==='towers'){
      const hero=currentHero(),cost=towerCost(hero),placed=m.towers.some(t=>t.hero);
      content='<div class="catalog-label">Hero</div><div class="catalog-grid">'+catalogButton(hero,'hero',placed?'Deployed':cash(cost),placed||m.cash<cost)+'</div>';
      for(const cat of ['Primary','Military','Magic','Support']){
        content+='<div class="catalog-label">'+cat+'</div><div class="catalog-grid">'+G.towerList.filter(t=>t.category===cat).
          map(t=>catalogButton(t,'tower',m.chimps&&t.id==='banana_farm'?'Unavailable':cash(towerCost(t)),
            m.cash<towerCost(t)||m.chimps&&t.id==='banana_farm')).join('')+'</div>';
      }
    }
    if(m.tab==='powers'){
      content='<div class="catalog-grid">'+G.powers.map(p=>catalogButton(p,'power','×'+(profile.powers[p.id]||0),!profile.powers[p.id])).join('')+'</div>';
    }
    if(m.tab==='instas'){
      content=profile.instas.length?'<div class="catalog-grid">'+profile.instas.map(i=>{
        const t=G.towers[i.towerId];return catalogButton({...t,color:G.rarityColors[i.rarity],artTiers:i.tiers},'insta',i.tiers.join('–')+' · $0',false,i.uid);
      }).join('')+'</div>':'<p>No Instas in your collection.</p>';
    }
    html('match-catalog',content);
  }
  function renderInspector(force) {
    const t=m.selected;
    show('inspector',Boolean(t));show('match-catalog',!t);show('match-tabs',!t);
    if(!t){inspectorKey='';return;}
    const key=[t.id,t.pops,t.target,t.tiers.join(''),t.aimMode,t.submerged,t.level,t.xp,t.bank,t.hero?m.cash>=boostPrice(t):t.tiers.map((tier,i)=>tier<5&&m.cash>=upgradePrice(t,i,tier)).join(''),m.towers.length].join('|');
    if(!force&&key===inspectorKey)return;
    inspectorKey=key;
    const actions=[
      btn(t.target,'target',t.id,'quiet',t.stats.attack==='farm'),
      btn('Sell '+cash(sellValue(t)),'sell','',m.chimps?'quiet':'red',m.chimps)
    ];
    if(t.stats.submerge)actions.push(btn(t.submerged?'Resurface':'Submerge','tower-action','submerge','quiet'));
    if(['mortar_battery','gatling_gunner'].includes(t.def.id))actions.push(btn('Set aim','tower-action','aim','quiet'));
    if(t.def.id==='gatling_gunner')actions.push(btn(t.aimMode==='follow'?'Auto aim':'Follow pointer','tower-action','follow','quiet'));
    if(t.def.id==='fighter_ace')actions.push(btn(t.aimMode==='figure8'?'Circle':'Figure eight','tower-action','flight','quiet',t.stats.centered));
    if(t.def.id==='heli_pilot')actions.push(btn(t.aimMode==='patrol'?'Follow pointer':'Patrol','tower-action','patrol','quiet',t.stats.pursuit));
    if(t.stats.smartSpike)actions.push(btn('Spikes · '+pretty(t.aimMode),'tower-action','spike','quiet'));
    if(t.stats.darkshift)actions.push(btn('Darkshift','tower-action','shift','quiet'));
    if(t.stats.bank)actions.push(btn('Collect '+cash(t.bank||0),'tower-action','bank','green',!t.bank));
    if(m.bots.has(t.id))actions.push('<small>⚙ Tech Bot attached</small>');
    const header=btn('× Back to Towers','tower-action','back','quiet')+'<div class="inspector-head">'+portrait(t.def,t.tiers)+'<h3>'+safe(t.def.name)+
      '</h3><small>'+number(t.pops)+' pops</small></div><div class="inspector-actions">'+actions.join('')+'</div>';
    if(t.hero){
      const cap=t.level>=20,s=t.def.levels[t.level-1],next=cap?s:t.def.levels[t.level];
      html('inspector',header+'<div class="path"><b>Level '+t.level+' / 20</b><p>'+t.def.title+' · '+number(t.xp)+' XP</p>'+
        (cap?'':'<progress value="'+(t.xp-s.xp)+'" max="'+(next.xp-s.xp)+'" aria-label="Hero experience"></progress><br />'+
        btn('Buy level · '+cash(boostPrice(t)),'hero-xp','','green',m.cash<boostPrice(t)))+'</div>');
      return;
    }
    const paths=t.def.paths.map((path,i)=>{
      const tier=t.tiers[i],next=path[tier],prev=path[tier-1];
      const tiers=[...t.tiers];tiers[i]++;
      const locked=!G.legalTiers(tiers)||tier===4&&m.towers.some(o=>o!==t&&o.def===t.def&&o.tiers[i]===5);
      const cost=next?upgradePrice(t,i,tier):0;
      const label=next?(locked?'Path locked':safe(next.name)+' · '+cash(cost)):'Max tier';
      return '<div class="path"><b>Path '+(i+1)+'</b> <span class="pips" aria-label="Tier '+tier+'">'+('●'.repeat(tier)+
        '○'.repeat(5-tier))+'</span><p>'+(prev?safe(prev.name)+' · ':'')+(next?safe(next.description):'Tier 5 complete.')+'</p>'+
        btn(label,'upgrade',i,!locked&&next&&m.cash>=cost?'green':'quiet',locked||!next||m.cash<cost)+'</div>';
    });
    html('inspector',header+paths.join(''));
  }
  function renderAbilityBar(force) {
    const entries=[];
    for(const t of m.towers){
      if(t.hero){
        for(const [i,a] of t.def.abilities.entries())if(t.level>=a.unlock)
          entries.push({key:t.id+'/'+i,name:a.name,time:Math.max(0,Math.ceil(t.heroReady[i]-m.time))});
      }else if(t.stats.ability&&(!m.chimps||!economic.has(t.stats.ability))){
        entries.push({key:t.id+'/0',name:ABILITY_NAMES[t.stats.ability],time:Math.max(0,Math.ceil(t.abilityAt-m.time))});
      }
    }
    const key=entries.map(x=>x.key+':'+x.name+':'+x.time).join('|');
    if(!force&&key===abilityKey)return;
    abilityKey=key;
    html('abilities',entries.map(a=>btn('ϟ '+a.name+(a.time?' '+a.time+'s':''),'ability',a.key,a.time?'quiet':'green',a.time>0)).join(''));
  }
  function renderHud(force=false) {
    if(!m)return;
    text('match-map',m.map.name);text('match-mode',m.rules.name+' · '+G.modes[m.mode].name);
    text('lives',number(m.lives));text('cash',number(m.cash));text('round','Round '+m.round+(m.freeplay||m.sandbox?'':' / '+m.rules.end));
    text('speed',m.speed+'×');text('start',m.waveActive?'Wave running':'▶︎ Start wave');
    $('start').disabled=m.waveActive||m.finished;$('pause').disabled=m.finished;
    if(!m.waveActive&&!$('sandbox-round').matches(':focus'))$('sandbox-round').value=String(m.round);
    renderCatalog(force);renderInspector(force);renderAbilityBar(force);
  }
  function towerAction(action) {
    if(action==='back'){clearSelection();return;}
    const t=m.selected;
    if(!t)return;
    if(action==='submerge')t.submerged=!t.submerged;
    if(action==='aim'||action==='shift'){m.aiming={tower:t,shift:action==='shift'};text('hint',action==='shift'?'Choose a new position for '+t.def.name+'.':'Choose a point on the board to target.');}
    if(action==='follow')t.aimMode=t.aimMode==='follow'?'auto':'follow';
    if(action==='patrol')t.aimMode=t.aimMode==='patrol'?'auto':'patrol';
    if(action==='flight')t.aimMode=t.aimMode==='figure8'?'auto':'figure8';
    if(action==='spike'){
      const modes=['auto','exit','entry'];
      t.aimMode=modes[(modes.indexOf(t.aimMode)+1)%modes.length];
    }
    if(action==='bank'&&t.bank){bonusCash(t.bank);t.bank=0;A.play('buy');}
    renderHud(true);
  }
  function sandbox(action){
    if(!m?.sandbox)return;
    if(action==='set'){
      m.round=clamp(Math.floor(+$('sandbox-round').value)||1,1,9999);
      m.wave=null;m.waveActive=false;m.enemies=[];m.shots=[];
    }
    if(action==='reset'){m.waveActive=false;m.wave=null;m.enemies=[];m.shots=[];m.traps=[];m.fields=[];}
    if(action==='spawn'||action==='ten'){
      const flags=($('enemy-camo').checked?'c':'')+($('enemy-regrow').checked?'r':'')+($('enemy-fort').checked?'f':'');
      const key=$('enemy-type').value,n=action==='ten'?10:1;
      for(let i=0;i<n;i++){
        if(m.enemies.length>=1500)break;
        const lane=i%m.routes.length;
        spawn(key,lane,flags,Math.floor(i/m.routes.length)*24+38);
      }
    }
    renderHud(true);
  }
  function cycleSpeed() {m.speed=m.speed%3+1;renderHud();}
  document.addEventListener('click',e=>{
    const target=e.target.closest?.('button');
    if(!target||target.disabled)return;
    const d=target.dataset;
    if(d.go){
      A.play('click');
      if(m&&screen==='match'&&d.go==='home'&&!modal.open){
        m.paused=true;
        openDialog('pause','Leave match?',resultBody('Account progress is saved. The current match will end.',
          btn('Resume','match-action','resume','quiet')+btn('Leave to menu','match-action','confirm-leave','red')));
      }else goto(d.go);
      return;
    }
    if(d.mapFilter){mapFilter=d.mapFilter;renderMaps();return;}
    if(d.map){mapChoice=G.maps.find(map=>map.id===d.map);difficulty=mapChoice.difficulty==='expert'?'hard':mapChoice.difficulty;A.play('click');renderModePicker();return;}
    if(d.pickDifficulty){difficulty=d.pickDifficulty;renderModePicker();return;}
    if(d.pickMode){startMatch(mapChoice,difficulty,d.pickMode);return;}
    if(d.heroSelect){updateProfile(p=>p.selectedHero=d.heroSelect);renderHeroes();A.play('buy');return;}
    if(d.heroLevels){heroDetails(d.heroLevels);return;}
    if(d.buyItem){buy(d.buyItem);return;}
    if(d.caseOpen){openCase(d.caseOpen);return;}
    if(d.claim){claim(d.claim);return;}
    if(d.saveAction){backupAction(d.saveAction);return;}
    if(!m)return;
    if(d.matchAction){matchAction(d.matchAction);return;}
    if(m.finished||m.paused)return;
    if(d.tab){m.tab=d.tab;clearSelection();return;}
    if(d.placeKind){
      if(d.placeKind==='power')choosePower(d.placeId);
      else if(d.placeKind==='insta')chooseInsta(d.placeId);
      else chooseTower(d.placeId,d.placeKind);
      return;
    }
    if(d.upgrade!==undefined){upgrade(Number(d.upgrade));return;}
    if(d.sell!==undefined){sell();return;}
    if(d.target&&m.selected){m.selected.target=priority[(priority.indexOf(m.selected.target)+1)%priority.length];renderHud(true);return;}
    if(d.towerAction){towerAction(d.towerAction);return;}
    if(d.heroXp!==undefined){buyHeroXp();return;}
    if(d.ability){
      const [id,index]=d.ability.split('/').map(Number);useAbility(id,index);return;
    }
    if(d.sandbox){sandbox(d.sandbox);}
  });
  for(const id of ['sound','music'])$(id).addEventListener('click',()=>updateProfile(p=>p[id]=!p[id]));
  function openSettings(fromPause=false){
    if(m)m.paused=true;
    const settings=profile.settings;
    const check=(id,label,value)=>'<label><input type="checkbox" data-setting="'+id+'"'+(value?' checked="checked"':'')+' /> '+label+'</label>';
    const slider=(id,label)=>'<label>'+label+' <input type="range" min="0" max="100" value="'+settings[id]+'" data-setting="'+id+'" /><output>'+settings[id]+'%</output></label>';
    openDialog('settings','Settings','<div class="settings-grid">'+check('auto','Autoplay',profile.auto)+slider('sfxVolume','Sound effects')+slider('musicVolume','Music')+check('damage','Show damage numbers',settings.damage)+check('ranges','Always show tower ranges',settings.ranges)+check('shake','Screen shake',settings.shake)+check('banks','Auto-collect full banks',settings.banks)+'<label>Visual effects <select data-setting="quality">'+['low','medium','high'].map(q=>'<option value="'+q+'"'+(q===settings.quality?' selected="selected"':'')+'>'+pretty(q)+'</option>').join('')+'</select></label></div><p class="hotkeys"><kbd>Space</kbd> Start / speed · <kbd>Q W E</kbd> or <kbd>, . /</kbd> Upgrade · <kbd>Tab</kbd> Target (map focus) · <kbd>Del</kbd> Sell · <kbd>1–9</kbd> Select · <kbd>Esc</kbd> Pause</p>'+(fromPause?btn('Resume','match-action','resume','green'):''));
  }
  $('settings').addEventListener('click',()=>{if(!modal.open)openSettings();});
  for(const type of ['input','change'])$('modal-body').addEventListener(type,e=>{
    const el=e.target,key=el.dataset.setting;if(!key)return;
    if(type==='input'&&el.type!=='range'||type==='change'&&el.type==='range')return;
    const value=el.type==='checkbox'?el.checked:el.type==='range'?Number(el.value):el.value;
    if(el.type==='range')el.nextElementSibling.textContent=value+'%';
    updateProfile(p=>{if(key==='auto'){p.auto=value;if(m){m.settings.auto=value;$('auto').checked=value;}}else{p.settings[key]=value;if(key==='musicVolume')p.music=value>0;if(key==='sfxVolume')p.sound=value>0;}});
  });
  $('claim-all').addEventListener('click',claimAll);
  $('backup').addEventListener('click',()=>{if(!modal.open){if(m){flush();m.paused=true;}openBackup();}});
  $('pause').addEventListener('click',pause);
  $('start').addEventListener('click',()=>{if(m)startWave();});
  $('speed').addEventListener('click',()=>{if(m)cycleSpeed();});
  $('auto').addEventListener('change',()=>{if(m){m.settings.auto=$('auto').checked;if(!m.sandbox)updateProfile(p=>p.auto=m.settings.auto);}});
  $('sandbox-toggle').addEventListener('click',()=>{$('sandbox-drawer').hidden=!$('sandbox-drawer').hidden;});
  $('task-category').addEventListener('change',renderTasks);
  $('task-search').addEventListener('input',renderTasks);
  $('task-ready').addEventListener('change',renderTasks);
  $('match-catalog').addEventListener('pointerdown',e=>{
    const button=e.target.closest('[data-place-kind]');if(!button||button.disabled||e.button!==0)return;
    drag={kind:button.dataset.placeKind,id:button.dataset.placeId,x:e.clientX,y:e.clientY,active:false,pointer:e.pointerId};
  });
  document.addEventListener('pointermove',e=>{
    if(!drag||drag.pointer!==e.pointerId||!m||m.paused)return;
    if(!drag.active&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>9){
      if(drag.kind==='power')return;
      if(currentPickId()!==drag.id){
        if(drag.kind==='insta')chooseInsta(drag.id);
        else chooseTower(drag.id,drag.kind);
      }
      drag.active=true;
    }
    if(drag.active){const p=pointer(e);p.inside=p.x>=0&&p.y>=0&&p.x<=G.width&&p.y<=G.height;m.cursor=p;}
  });
  let ignoreBoardClickUntil=0;
  document.addEventListener('pointerup',e=>{
    if(!drag||drag.pointer!==e.pointerId)return;
    const wasActive=drag.active;drag=null;
    if(!wasActive||!m||!m.place)return;
    const p=pointer(e);ignoreBoardClickUntil=performance.now()+120;
    if(p.x>=0&&p.y>=0&&p.x<=G.width&&p.y<=G.height)placeAt(p.x,p.y,e.shiftKey);
  });
  document.addEventListener('pointercancel',()=>drag=null);
  for(const type of ['pointerover','focusin'])$('match-catalog').addEventListener(type,e=>{
    const b=e.target.closest('[data-place-kind="tower"]');if(!b||!m)return;
    const def=G.towers[b.dataset.placeId],s=def.base,r=b.getBoundingClientRect();
    const roles={dart:'Hits targets in a line.',blast:'Deals area damage to groups.',farm:'Produces income between waves.',support:'Boosts nearby defenses.',seek:'Tracks moving targets.',beam:'Hits immediately along its aim.',pulse:'Defends the area surrounding the tower.',trap:'Leaves damage on the track.',fan:'Fires a spread of projectiles.',ring:'Covers all sides with a radial burst.',arc:'Throws a returning projectile.',aim:'Fires along a chosen line.',bite:'Uses a companion for close-range strikes.'};
    const tooltip=$('tower-tooltip');
    tooltip.textContent=def.name+' · '+cash(towerCost(def))+' · '+def.category+' · '+pretty(s.type)+' · Camo '+(s.camo?'✓':'—')+' · Lead '+(s.d>0&&s.type!=='sharp'?'✓':'—')+' · '+roles[s.attack];
    tooltip.style.top=Math.max(5,Math.min(r.top,window.innerHeight-110))+'px';
    tooltip.style.left=Math.max(8,Math.min(r.left-235,window.innerWidth-240))+'px';show('tower-tooltip',true);
  });
  for(const type of ['pointerleave','focusout'])$('match-catalog').addEventListener(type,()=>show('tower-tooltip',false));
  for(const type of ['pointerover','focusin'])$('inspector').addEventListener(type,e=>{
    const b=e.target.closest('[data-upgrade]'),t=m?.selected;if(!b||!t||t.hero)return;
    const name=t.def.paths[Number(b.dataset.upgrade)][t.tiers[Number(b.dataset.upgrade)]]?.name;
    m.sacrificePreview=name==='Sun Temple'||name==='True Sun God'?'sun':name==='Monkeyopolis'?'farm':null;
  });
  for(const type of ['pointerleave','focusout'])$('inspector').addEventListener(type,()=>{if(m)m.sacrificePreview=null;});
  board.addEventListener('click',e=>{if(performance.now()>=ignoreBoardClickUntil){clickBoard(e);if(!m?.place)board.focus({preventScroll:true});}});
  board.addEventListener('pointermove',e=>{if(m)m.cursor=pointer(e);});
  board.addEventListener('pointerleave',()=>{if(m)m.cursor.inside=false;});
  document.addEventListener('keydown',e=>{
    if(!m||screen!=='match'||modal.open)return;
    if(m.selected&&!e.target.matches?.('input,textarea,select')&&!e.ctrlKey&&!e.metaKey){
      const path=['KeyQ','KeyW','KeyE'].indexOf(e.code),alt=['Comma','Period','Slash'].indexOf(e.code);
      if(path>=0||alt>=0){e.preventDefault();upgrade(Math.max(path,alt));return;}
      if(e.code==='Tab'&&!e.shiftKey&&e.target===board){e.preventDefault();m.selected.target=priority[(priority.indexOf(m.selected.target)+1)%4];renderHud(true);return;}
      if(['Delete','Backspace'].includes(e.code)){e.preventDefault();sell();return;}
    }
    if(e.code==='Escape'){
      e.preventDefault();
      if(m.place||m.selected||m.aiming)clearSelection();
      else pause();
      return;
    }
    if(e.target.matches?.('input,textarea,select'))return;
    if(e.code==='Space'&&!e.target.matches?.('button')){e.preventDefault();if(m.waveActive)cycleSpeed();else startWave();}
    if(/^Digit[1-9]$/.test(e.code)){chooseTower(G.towerList[Number(e.code.slice(-1))-1].id);e.preventDefault();}
    if(e.target===board&&['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Enter'].includes(e.key)){
      e.preventDefault();
      if(e.key==='Enter'&&m.place){placeAt(m.cursor.x,m.cursor.y);return;}
      const n=e.shiftKey?36:12;
      const dx=e.key==='ArrowLeft'?-n:e.key==='ArrowRight'?n:0,dy=e.key==='ArrowUp'?-n:e.key==='ArrowDown'?n:0;
      m.cursor={x:clamp(m.cursor.x+dx,20,1180),y:clamp(m.cursor.y+dy,20,780),inside:true};
    }
  });
  window.addEventListener('pagehide',flush);
  function tick(now) {
    const delta=Math.min(.05,(now-lastFrame)/1000||0);
    lastFrame=now;
    if(screen==='match'&&m){
      if(!m.paused&&!m.finished&&!document.hidden){
        accumulator+=delta*m.speed;
        const step=1/60;
        while(accumulator>=step&&!m.paused&&!m.finished){
          simulation(step);
          accumulator-=step;
        }
      }else accumulator=0;
      m.visual=profile.settings;G.render.render(board,m,now/1000);
      if(now-lastHud>125){lastHud=now;renderHud();}
    }
    if(screen==='home'){G.render.cover($('home-art'),now/1000);G.render.portrait?.($('home-hero-canvas'),G.heroById[profile.selectedHero],[0,0,0],now/1000,true);}
    if(screen==='maps'&&now-lastPreview>75){
      lastPreview=now;
      for(const [canvas,map] of previewItems)G.render.preview(canvas,map,now/1000);
    }
    requestAnimationFrame(tick);
  }
  html('task-category','<option value="">All categories</option>'+G.categories.map(c=>'<option>'+c+'</option>').join(''));
  html('enemy-type',Object.keys(G.bloons).map(id=>'<option value="'+id+'">'+pretty(id)+'</option>').join(''));
  renderProfile();goto('home');
  if(warning)notify(warning,true);
  requestAnimationFrame(tick);
});

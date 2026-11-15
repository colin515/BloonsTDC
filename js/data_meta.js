'use strict';
(() => {
  const G=window.TDC;
  G.difficulties = {
    easy:{name:'Easy',end:40,lives:200,cost:.85,mm:150}, medium:{name:'Medium',end:60,lives:150,cost:1,mm:300},
    hard:{name:'Hard',end:80,lives:100,cost:1.08,mm:600}, impoppable:{name:'Impoppable',end:100,lives:1,cost:1.2,mm:1200}
  };
  G.modes = {
    standard:{name:'Standard',mm:1,description:'Classic rules and normal income.'},
    reverse:{name:'Reverse',mm:1.15,description:'All routes run in the opposite direction.'},
    half_cash:{name:'Half Cash',mm:1.35,description:'Begin with $325 and earn half the usual match income.'},
    double_hp_moabs:{name:'Double HP MOABs',mm:1.35,description:'All blimps have twice their normal health.'},
    chimps:{name:'CHIMPS',mm:1.6,description:'One life. Disable continues, bonus income, powers, Instas and selling.'},
    sandbox:{name:'Sandbox',mm:0,description:'Test any enemy or wave with unlimited resources.'}
  };
  G.powers = [
    ['portable_pool','Portable Pool',150,'◉','Place a 46px-radius pool on land.'],
    ['pontoon','Pontoon',150,'▰','Place a 76px-wide wooden platform on water.'],
    ['cash_drop','Cash Drop Crate',200,'▤','Collect $2,500 after landing.'],
    ['super_monkey_storm','Super Monkey Storm',350,'ϟ','Clear regular bloons and deal 2,000 damage to blimps.'],
    ['tech_bot','Tech Bot',100,'⚙','Attach to a tower and automatically use its active abilities.'],
    ['time_stop','Time Stop',250,'◷','Slow enemies and projectiles by 80% for 10 seconds.'],
    ['banana_farmer','Banana Farmer',120,'❋','Collect farm produce within 140px.']
  ].map(([id,name,cost,icon,description])=>({id,name,cost,icon,description}));
  G.accountUpgrades=[
    ['double_mm','Double Monkey Money',2500,'✦','Earn twice the Monkey Money for wins and tasks.'],
    ['start_cash_plus','Wealthy Start +$200',1000,'＄','Begin eligible matches with $200 extra.'],
    ['hero_xp_boost','Hero Academy +25% XP',1200,'★','Earn 25% more hero experience every round.'],
    ['vip_case_discount','VIP Case Key −15%',1800,'⌑','Receive a 15% discount on each case.']
  ].map(([id,name,cost,icon,description])=>({id,name,cost,icon,description}));
  G.rarity=['Common','Rare','Epic','Mythic','Legendary'];
  G.rarityColors=['#a8bac7','#4acbff','#d397f5','#f474ad','#ffd069'];
  G.cases=[
    {id:'rusty_crate',name:'Rusty Crate',cost:100,color:'#df9d63',odds:[68,24,6.5,1.2,.3]},
    {id:'silver_vault',name:'Silver Vault',cost:300,color:'#bdd6ec',odds:[35,42,17.5,4.3,1.2]},
    {id:'golden_chest',name:'Golden Chest',cost:750,color:'#ffce60',odds:[0,45,37,14,4]},
    {id:'diamond_cyber',name:'Diamond Cyber-Case',cost:1800,color:'#a4e9fb',odds:[0,0,52,36,12]},
    {id:'powers_crate',name:'Tactical Supply Case',cost:200,color:'#bade8d',odds:[22,22,18,14,11,8,5]}
  ];
  G.roll = (weights,random=Math.random) => {
    let n=random()*weights.reduce((s,v)=>s+v,0);
    for(let i=0;i<weights.length;i++){n-=weights[i];if(n<0)return i;}
    return weights.findLastIndex(w=>w>0);
  };
  G.insta = (tier,rarity) => {
    const def=G.towerList[Math.floor(Math.random()*24)];
    const tiers=[0,0,0];
    const main=Math.floor(Math.random()*3);
    tiers[main]=tier;
    if(tier>=2) tiers[(main+1+Math.floor(Math.random()*2))%3]=Math.floor(Math.random()*3);
    const suffix=globalThis.crypto?.randomUUID?.() || Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
    return {uid:suffix,towerId:def.id,tiers,rarity:rarity??(tier<=1?0:tier-1)};
  };
  G.caseDrop = crate => {
    const r=G.roll(crate.odds);
    if(crate.id==='powers_crate')return {powers:[G.powers[r].id,G.powers[G.roll(crate.odds)].id],rarity:r>=5?3:r>=3?2:1};
    const tier=r===0?(crate.id==='rusty_crate'?0:1):r===1?(crate.id==='rusty_crate'&&Math.random()<.45?1:2):r+1;
    return G.insta(tier,r);
  };
  G.categories=['Bloons','Blimps','Rounds','Spending','Specialists','Cases','Tactics','Conquest'];
  const tasks=[];
  function add(category,key,goal,title,reward) {
    tasks.push({id:'task_'+(tasks.length+1),category,key,goal,title,reward:reward || {mm:30+Math.floor(tasks.length/10)*5}});
  }
  function series(category,key,name,count,min,max) {
    let previous=min-1;
    for(let i=0;i<count;i++){
      const proposed=Math.round(min*(max/min)**(i/(count-1)));
      const goal=Math.max(previous+1,Math.min(max-count+1+i,proposed));
      const reward=category==='Tactics'&&i%3===2?{power:G.powers[i%G.powers.length].id}:undefined;
      add(category,key,goal,name+' '+goal.toLocaleString('en-US'),reward);
      previous=goal;
    }
  }
  series('Bloons','pops','Pop',50,100,25000000);
  series('Blimps','blimps','Destroy blimps',35,1,25000);
  series('Rounds','rounds','Clear rounds',35,10,10000);
  series('Spending','spent','Spend match cash',30,1000,50000000);
  for(const t of G.towerList){
    add('Specialists','place_'+t.id,3,'Deploy '+t.name+' ×3');
    add('Specialists','upgrade_'+t.id,15,'Upgrade '+t.name+' ×15',{case:'rusty_crate'});
    add('Specialists','tier5_'+t.id,3,'Reach tier 5 with '+t.name+' ×3',{insta:3});
  }
  series('Cases','cases','Open cases',25,1,500);
  series('Tactics','power','Use powers',10,1,400);
  series('Tactics','insta','Deploy Instas',10,1,200);
  for(const key of ['easy','medium','hard','impoppable','chimps'])
    series('Conquest','wins_'+key,'Earn '+(G.difficulties[key]?.name||'CHIMPS')+' medals',6,1,10);
  for(const goal of [1,3,10])add('Conquest','black',goal,'Earn Black Borders ×'+goal,{mm:500*goal});
  G.tasks=tasks;

  G.medalKey = (map,difficulty,mode) => [map,difficulty,mode].join('/');
  G.hasBorder = (medals,id) => Object.keys(G.difficulties).every(d=>
    Object.keys(G.modes).filter(m=>m!=='sandbox').every(m=>Boolean(medals[G.medalKey(id,d,m)])));
})();

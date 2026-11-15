'use strict';
(() => {
  const G = window.TDC;
  const roster = [
    ['cipher','Cipher','Cyber-Economist',1200,'#51e2b0','⌘',
      'Generates round income, boosts farms at level 5, infects incoming blimps at level 7 and restores lives at level 11.',
      ['Overclock Surge',45,'Boost attack speed and bonus cash from pops for 10 seconds. At level 14, this affects the entire map.'],
      ['System Drain',70,'Downgrade up to 10 strong enemies and recover cash from the discarded layers.']],
    ['chronos','Chronos','Temporal Weaver',900,'#c398ff','◷',
      'Chrono-bolts and a growing slow aura. Nearby towers recover their abilities 15% faster.',
      ['Temporal Rewind',42,'Send enemies in range back one quarter of their route.'],
      ['Stasis Singularity',75,'Freeze enemies for 6 seconds and increase friendly attack speed.']],
    ['valkyrie','Valkyrie','Solar Paladin',1100,'#ffe298','☼',
      'Solar lances pierce multiple targets. Lead damage unlocks at level 6 and camo sight at level 8. Nearby Magic towers gain range and pierce.',
      ['Radiant Barrage',35,'Throw 12 homing solar spears.'],
      ['Orbital Dawn',75,'Concentrate a tracking solar beam on the strongest enemies for 8 seconds.']],
    ['blaze','Blaze','Inferno Pyromancer',750,'#ff825a','♨',
      'Firebombs leave pools of burning napalm and deal bonus damage to ceramics.',
      ['Firewall Eruption',38,'Ignite all enemy routes for 8 seconds.'],
      ['Cataclysm Meteor',65,'Drop five explosive meteors onto the strongest targets and ignite survivors.']],
    ['frostbite','Frostbite','Cryo Commander',800,'#97eaff','❆',
      'Cryo blasts reveal camo at level 5, freeze blimps at level 12 and mark chilled enemies for bonus damage at level 15.',
      ['Flash Freeze',40,'Freeze nearby enemies and shatter three layers.'],
      ['Arctic Blizzard',68,'Slow enemies across the map by 60% while pelting them with shards for 10 seconds.']],
    ['viper','Viper','Shadow Ronin',650,'#f177a2','✥',
      'Detects camo from the start and strikes close enemies with a katana. Nearby Magic towers increase attack speed.',
      ['Shadow Dash',30,'Dash to the leading enemy for eight katana strikes.'],
      ['Phantom Clones',65,'Summon three independent shadow attackers for 12 seconds.']],
    ['titan_x','Titan-X','Heavy Mech Pilot',1400,'#94a9fa','▣',
      'Twin autocannons and missiles deal bonus damage to fortified enemies and blimps.',
      ['Railgun Overdrive',38,'Fire a piercing railgun slug along a line across the board.'],
      ['Giga-Mech Transformation',78,'Deploy four plasma cannons and rocket barrages for 15 seconds.']]
  ];
  const growth = [
    {r:150,c:1.4,d:0,p:1,attack:'support',type:'true'},
    {r:150,c:.83,d:1,p:3,attack:'seek',type:'steel',slow:.75},
    {r:155,c:.85,d:2,p:7,attack:'beam',type:'energy'},
    {r:140,c:1.05,d:1,p:9,attack:'blast',type:'fire',dot:2,splash:44,hazard:2,ceramic:2},
    {r:130,c:.9,d:1,p:11,attack:'blast',type:'cold',splash:55,slow:.62,stun:.8},
    {r:140,c:.51,d:1,p:3,attack:'dart',type:'sharp',camo:true},
    {r:165,c:.48,d:2,p:4,attack:'fan',type:'steel',shots:2,moab:9,fortDamage:5}
  ];
  G.heroes = roster.map(([id,name,title,baseCost,color,icon,passive,...abilities],i)=>({
    id,name,title,baseCost,color,icon,passive,abilities:abilities.map(([name,cooldown,description],j)=>({name,cooldown,description,unlock:j===0?3:10,code:id+(j+1)})),
    terrain:'land',footprint:23,index:24+i,category:'Hero',
    levels:Array.from({length:20},(_,n)=>{
      const l=n+1;
      const s={velocity:600,shots:1,statusTime:3,trapTime:30,...growth[i]};
      s.r+=n*1.7; s.c*=1-n*.019; s.d+=i===0?0:Math.floor(n/2)*(i===6?2:1); s.p+=Math.floor(n/4);
      if(i===0) Object.assign(s,{income:Math.round(100+n*1100/19),farmBoost:l>=17?.35:l>=5?.15:0,trojan:l>=7,lives:l>=11?5:0});
      if(i===1) Object.assign(s,{timeAura:.85-n*.2/19,slowCooldown:.85});
      if(i===2) Object.assign(s,{type:l>=6?'steel':'energy',camo:l>=8,magicAura:true});
      if(i===3) Object.assign(s,{dot:2+Math.floor(n/3),hazard:2+n/6,camo:l>=13});
      if(i===4) Object.assign(s,{camo:l>=5,moabStun:l>=12,mark:l>=15?2:0,type:l>=11?'steel':'cold'});
      if(i===5) Object.assign(s,{type:l>=6?'steel':'sharp',katana:true,magicSpeed:true});
      if(i===6) Object.assign(s,{moab:9+n*3,fortDamage:5+n*2,splash:l>=7?31:0,camo:l>=9});
      return {level:l,xp:Math.round(33*n**1.72),...s};
    })
  }));
  G.heroById = Object.fromEntries(G.heroes.map(h=>[h.id,h]));
})();

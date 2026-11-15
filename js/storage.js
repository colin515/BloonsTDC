'use strict';
(() => {
  const key='bloonstdc.profile.v1';
  const salt='TDC:Sunrise-Delta:2026';
  const defaults=()=>({version:1,mm:250,level:1,xp:0,selectedHero:'viper',sound:true,music:false,auto:false,
    settings:{sfxVolume:80,musicVolume:50,damage:true,quality:"high",ranges:false,shake:true,banks:false},stats:{},medals:{},claimed:{},instas:[],powers:{cash_drop:1,portable_pool:1,pontoon:1},upgrades:{},cases:{}});
  const object=val=>val && typeof val==='object' && !Array.isArray(val);
  const dictionary=(val,valid,filter=()=>true)=>Object.fromEntries(
    (object(val)?Object.entries(val):[]).filter(([k,v])=>/^[a-zA-Z0-9_/-]+$/.test(k) && filter(k) && valid(v)));
  const count=n=>Number.isSafeInteger(n)&&n>=0;
  const flag=n=>n===true;
  const encode=value=>{
    const bytes=new TextEncoder().encode(JSON.stringify(value));
    let binary='';
    for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
    const data=btoa(binary);
    return data+'.'+hash(data);
  };
  function hash(value) {
    let n=2166136261;
    for(const ch of value+salt)n=Math.imul(n ^ ch.charCodeAt(0),16777619);
    return (n>>>0).toString(16).padStart(8,'0');
  }
  function decode(code) {
    const [raw,sum,extra]=code.trim().split('.');
    if(extra!==undefined || !raw || sum!==hash(raw))throw Error('This backup failed its integrity check.');
    const p=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(atob(raw),c=>c.charCodeAt(0))));
    if(!object(p)||p.version!==1||!count(p.mm))throw Error('This backup uses an unsupported format.');
    const G=window.TDC;
    const base=defaults();
    return {...base,mm:p.mm,level:Math.max(1,count(p.level)?p.level:1),xp:count(p.xp)?p.xp:0,
      selectedHero:Object.hasOwn(G.heroById,p.selectedHero)?p.selectedHero:base.selectedHero,
      settings:{...base.settings,...Object.fromEntries(Object.entries(object(p.settings)?p.settings:{}).filter(([k,v])=>Object.hasOwn(base.settings,k)&&(k==="quality"?["low","medium","high"].includes(v):typeof base.settings[k]==="number"?count(v)&&v<=100:typeof v==="boolean")))},
      sound:p.sound!==false,music:p.music===true,auto:p.auto===true,
      stats:dictionary(p.stats,count),medals:dictionary(p.medals,flag),claimed:dictionary(p.claimed,flag),
      powers:dictionary(p.powers,count,k=>G.powers.some(x=>x.id===k)),
      upgrades:dictionary(p.upgrades,flag,k=>G.accountUpgrades.some(x=>x.id===k)),
      cases:dictionary(p.cases,count,k=>G.cases.some(x=>x.id===k)),
      instas:Array.isArray(p.instas)?p.instas.filter(i=>object(i)&&typeof i.uid==='string'&&Object.hasOwn(G.towers,i.towerId)&&Array.isArray(i.tiers)&&G.legalTiers(i.tiers)&&count(i.rarity)&&i.rarity<5):[]};
  }
  let profile=defaults(), warning='';
  function persist(value) {
    try{localStorage.setItem(key,encode(value));}
    catch{warning='Browser storage is unavailable. Export a backup to keep your progress.';}
  }
  window.StorageManager=Object.freeze({
    load(){
      try{const code=localStorage.getItem(key);if(code)profile=decode(code);}
      catch{warning='Your local save could not be loaded. You can import a valid backup.';}
      return warning;
    },
    get:()=>structuredClone(profile),
    update(fn){
      const next=structuredClone(profile);
      fn(next);
      profile=next;
      persist(profile);
      return structuredClone(profile);
    },
    exportCode:()=>encode(profile),
    importCode(code){const next=decode(code);profile=next;persist(profile);return structuredClone(profile);},
    warning:()=>warning
  });
})();

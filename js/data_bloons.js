'use strict';
(() => {
  const G = window.TDC = { width: 1200, height: 800 };
  const rows = [
    ['red',1,62,13,'#f14c54',[],[]],
    ['blue',1,86,14,'#39aaff',[],['red']],
    ['green',1,112,15,'#54cd61',[],['blue']],
    ['yellow',1,196,16,'#ffd447',[],['green']],
    ['pink',1,218,16,'#fd75c6',[],['yellow']],
    ['black',1,112,13,'#303041',['explosive'],['pink','pink']],
    ['white',1,124,13,'#f2f9ff',['cold'],['pink','pink']],
    ['purple',1,185,15,'#b64ded',['energy','fire','plasma'],['pink','pink']],
    ['lead',1,62,16,'#818b99',['sharp'],['black','black']],
    ['zebra',1,112,15,'#f9f7f3',['explosive','cold'],['black','white']],
    ['rainbow',1,136,17,'#ff7964',[],['zebra','zebra']],
    ['ceramic',10,154,17,'#b9714b',[],['rainbow','rainbow']],
    ['moab',200,62,32,'#3e8bdf',[],Array(4).fill('ceramic')],
    ['bfb',700,38,40,'#e6584b',[],Array(4).fill('moab')],
    ['zomg',4000,22,48,'#76b756',[],Array(4).fill('bfb')],
    ['ddt',400,168,34,'#333745',['sharp','explosive'],Array(4).fill('ceramic')],
    ['bad',20000,18,58,'#ab58df',[],['zomg','zomg','ddt','ddt','ddt']]
  ];
  G.bloons = Object.fromEntries(rows.map(([id,hp,speed,r,color,immune,children],rank) =>
    [id,{id,hp,speed,r,color,immune,children,rank,blimp:rank >= 12}]));
  for(const b of Object.values(G.bloons)){
    b.leak=b.hp+b.children.reduce((total,id)=>total+(G.bloons[id].leak||0),0);
    b.singleLeak=(b.id==='ceramic'?60:b.hp)+(G.bloons[b.children[0]]?.singleLeak||0);
  }
  const wave = (type,count,gap=.22,flags='',wait=0) => ({type,count,gap,flags,wait});
  const special = {
    1:[wave('red',20,.52)],2:[wave('red',35,.31)],3:[wave('red',25,.28),wave('blue',5,.6)],
    4:[wave('red',35),wave('blue',18,.35)],5:[wave('blue',27,.33),wave('red',12)],
    6:[wave('green',15,.52),wave('blue',15,.3)],7:[wave('red',20),wave('blue',25),wave('green',15,.36)],
    8:[wave('green',20,.28),wave('yellow',5,.62)],9:[wave('green',35,.28)],
    10:[wave('blue',75,.14)],24:[wave('green',1,.5,'c'),wave('yellow',22,.27)],
    28:[wave('lead',6,.86)],33:[wave('red',20,.19,'c'),wave('yellow',13,.32,'c')],
    40:[wave('moab',1)],49:[wave('rainbow',30,.18),wave('ceramic',24,.32)],
    55:[wave('moab',5,1.1),wave('ceramic',18,.24)],59:[wave('lead',28,.24,'c'),wave('ceramic',14)],
    60:[wave('bfb',1)],63:Array.from({length:3},()=>wave('ceramic',40,.045,'',1.5)),
    75:[wave('bfb',12,.7),wave('moab',20,.3)],76:[wave('ceramic',60,.08,'r')],
    78:[wave('ceramic',50,.08),wave('bfb',1,1),wave('ceramic',50,.08,'c',2)],
    80:[wave('zomg',1)],90:[wave('ddt',3,.63),wave('moab',8,.5)],
    95:[wave('lead',40,.08,'cf'),wave('ddt',30,.34),wave('moab',25,.3,'f')],
    98:[wave('bfb',30,.24,'f'),wave('zomg',8,.59,'f')],99:[wave('ddt',9,.33,'f')],
    100:[wave('bad',1)]
  };
  const groups = ['red','blue','green','yellow','pink','black','white','purple','zebra','rainbow','ceramic'];
  function intermediate(round) {
    const first = round<16?2:round<21?4:round<28?5:round<34?7:round<41?8:round<47?9:10;
    const second = Math.max(0,first - 3 + round % 3);
    const flags = [round >= 26 && round % 4 === 0 ? 'c' : '', round >= 46 && round % 5 === 0 ? 'r' : ''].join('');
    const waves = [wave(groups[second],12 + round % 19,.26 - Math.min(.15,round/600)),
      wave(groups[first],7 + Math.floor(round/3),.33,flags)];
    if (round >= 42) waves.push(wave(round >= 91 ? 'ddt' : round >= 83 ? 'zomg' : round >= 61 ? 'bfb' : 'moab',
      1 + Math.floor((round - 40) / 9),.9,round >= 69 && round % 3 === 0 ? 'f' : ''));
    return waves;
  }
  G.rounds = Array.from({length:100},(_,i)=>special[i+1] || intermediate(i+1));
  G.getRound = round => G.rounds[round-1] || [
    wave('ceramic',Math.min(100,25+round-100),.08,'crf'),
    wave(round%2 ? 'ddt' : 'zomg',Math.min(60,12+Math.floor((round-100)/2)),.22,'f'),
    wave('bad',Math.min(24,1+Math.floor((round-100)/4)),.92,round%3===0 ? 'f' : '')
  ];
  G.cashScalar = round => round <= 50 ? 1 : round <= 60 ? .5 : round <= 85 ? .2 : round <= 100 ? .1 : .05;
})();

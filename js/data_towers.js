'use strict';
(() => {
  const G = window.TDC;
  const catalog = [
    ["dart_thrower", "Dart Monkey", 200, [
      [
        ["Sharp Shots", "+pierce"],
        ["Razor Sharp Shots", ""],
        ["Spike-o-pult", "bouncing spiked balls, pops Frozen"],
        ["Juggernaut", "crushes Lead/Ceramic"],
        ["Ultra-Juggernaut", "splits into 6 mini-juggernaut balls)."]
      ],
      [
        ["Quick Shots", ""],
        ["Very Quick Shots", ""],
        ["Triple Shot", "3 darts fan"],
        ["Super Fan Club", "Ability: transforms nearby Dart Throwers into fast plasma-dart throwers for 12s"],
        ["Apex Plasma Fan Club", "Ability: transforms into ultra-fast plasma beams)."]
      ],
      [
        ["Long Range", ""],
        ["Enhanced Eyesight", "+Camo"],
        ["Crossbow", "high range & damage"],
        ["Sharp Shooter", "every 4th shot crits for 50 damage"],
        ["Crossbow Master", "ultra-fast crits, pops all bloon types)."]
      ]
    ]],
    ["boomerang_thrower", "Boomerang", 325, [
      [
        ["Improved Rangs", ""],
        ["Glaives", ""],
        ["Glaive Ricochet", "bounces between bloons"],
        ["MOAB Glaives", ""],
        ["Glaive Lord", "3 permanent orbiting glaive rings shredding nearby bloons)."]
      ],
      [
        ["Faster Throwing", ""],
        ["Faster Rangs", ""],
        ["Bionic Boomerang", "rapid attack speed"],
        ["Turbo Charge", "Ability: +400% attack speed for 10s"],
        ["Perma Charge", "permanently super-fast + Ability doubles damage)."]
      ],
      [
        ["Long Range", ""],
        ["Red Hot Rangs", "pops Lead"],
        ["Kylie Boomerang", "straight heavy boomerangs hitting twice"],
        ["MOAB Press", "heavy knockback boomerangs vs MOABs"],
        ["MOAB Domination", "explosive knockback boomerangs + burning)."]
      ]
    ]],
    ["bomb_cannon", "Bomb Shooter", 525, [
      [
        ["Bigger Bombs", ""],
        ["Heavy Bombs", "2 damage"],
        ["Really Big Bombs", "huge blast + stun"],
        ["Bloon Impact", "stuns regular bloons"],
        ["Bloon Crush", "stuns even MOAB/BFB/ZOMG/DDT!)."]
      ],
      [
        ["Faster Reload", ""],
        ["Missile Launcher", "fast projectiles"],
        ["MOAB Mauler", "+15 damage to MOABs"],
        ["MOAB Assassin", "Ability: fires high-damage missile at strongest blimp"],
        ["MOAB Eliminator", "Ability: massive anti-MOAB missile with 10s cooldown)."]
      ],
      [
        ["Extra Range", ""],
        ["Frag Bombs", "shoots 8 sharp frags on explosion"],
        ["Cluster Bombs", "secondary cluster explosions"],
        ["Recursive Cluster", "every 2nd shot triggers mega-clusters"],
        ["Bomb Blitz", "passive screen wipe if a life is lost + super recursive clusters)."]
      ]
    ]],
    ["tack_shooter", "Tack Shooter", 280, [
      [
        ["Faster Shooting", ""],
        ["Even Faster Shooting", ""],
        ["Hot Shots", "fire tacks, pops Lead"],
        ["Ring of Fire", "rapid short-range fire nova"],
        ["Inferno Ring", "massive fire aura + launches homing meteor at strongest bloon)."]
      ],
      [
        ["Long Range Tacks", ""],
        ["Super Range Tacks", ""],
        ["Blade Shooter", "12 sharp blades"],
        ["Blade Maelstrom", "Ability: spins spraying hundreds of blades across screen"],
        ["Super Maelstrom", "Ability: higher damage blades that pop Lead)."]
      ],
      [
        ["More Tacks", "10"],
        ["Even More Tacks", "12"],
        ["Tack Sprayer", "16 tacks"],
        ["Overdrive", "ultra-fast 16-tack bursts"],
        ["The Tack Zone", "32 tacks at blinding speed)."]
      ]
    ]],
    ["ice_emitter", "Ice Monkey", 400, [
      [
        ["Permafrost", "frozen bloons stay slowed after thawing"],
        ["Cold Snap", "pops Camo & Lead"],
        ["Ice Shards", "frozen bloons emit sharp shards when popped"],
        ["Embrittlement", "decamos & makes bloons take +1 damage"],
        ["Super Brittle", "bloons & MOABs take +4 damage from all attacks!)."]
      ],
      [
        ["Enhanced Freeze", ""],
        ["Deep Freeze", "freezes 2 layers"],
        ["Arctic Wind", "slow aura + freezes water so Land towers can be placed on nearby water!"],
        ["Snowstorm", "Ability: freezes all bloons on screen"],
        ["Absolute Zero", "Ability: long global freeze + +50% Ice tower attack speed)."]
      ],
      [
        ["Larger Radius", ""],
        ["Re-Freeze", ""],
        ["Cryo Cannon", "fires freezing ice bombs at long range"],
        ["Icicles", "frozen bloons grow spikes damaging passing bloons"],
        ["Icicle Impale", "fires massive high-damage icicles that slow MOABs/DDTs)."]
      ]
    ]],
    ["glue_gunner", "Glue Gunner", 275, [
      [
        ["Glue Soak", "soaks through all layers"],
        ["Corrosive Glue", "deals DOT every 1.0s"],
        ["Bloon Dissolver", "rapid acid melting, pops Lead"],
        ["Bloon Liquefier", "melts Ceramics in seconds"],
        ["The Bloon Solver", "splatters puddles of ultra-acid that vaporize non-MOABs)."]
      ],
      [
        ["Bigger Globs", ""],
        ["Glue Splatter", "splashes 6 bloons"],
        ["Glue Hose", "rapid glue stream"],
        ["Glue Strike", "Ability: coats entire screen in glue + +2 damage taken"],
        ["Glue Storm", "Ability: continuous glue rain that corrodes Lead/MOABs)."]
      ],
      [
        ["Stickier Glue", ""],
        ["Stronger Glue", "75% slow"],
        ["MOAB Glue", "can glue and slow MOAB-class blimps!"],
        ["Relentless Glue", "glued bloons drop stun blobs on pop"],
        ["Super Glue", "immobilizes MOABs/DDTs and deals heavy DOT)."]
      ]
    ]],
    ["sniper_operative", "Sniper Monkey", 350, [
      [
        ["Full Metal Jacket", "4 damage, pops Lead"],
        ["Large Calibre", "7 damage"],
        ["Deadly Precision", "20 damage"],
        ["Maim MOAB", "30 damage + stuns MOABs for 1.5s"],
        ["Cripple MOAB", "140 damage + long stun + target takes +5 damage from all towers)."]
      ],
      [
        ["Night Vision Goggles", "+Camo"],
        ["Shrapnel Shot", "sprays sharp shrapnel cone on hit"],
        ["Bouncing Bullet", "bullets bounce up to 4 targets"],
        ["Supply Drop", "Ability: drops a cash crate worth $1,100"],
        ["Elite Sniper", "Ability: drops $3,000 crate + buffs all Snipers +33% attack speed)."]
      ],
      [
        ["Fast Firing", ""],
        ["Even Faster Firing", ""],
        ["Semi-Automatic", "3x fire rate"],
        ["Full Auto Rifle", "blistering fire rate"],
        ["Elite Defender", "4x faster + gains bonus speed the further bloons get along the track)."]
      ]
    ]],
    ["submarine", "Monkey Sub", 325, [
      [
        ["Longer Range", ""],
        ["Advanced Intel", "can shoot bloons inside ANY allied tower's range anywhere on the map!"],
        ["Submerge and Support", "toggle mode: pulses radar that strips Camo from all bloons in radius"],
        ["Bloontonium Reactor", "submerged toxic aura shreds bloons + reduces nearby water ability cooldowns by 15%"],
        ["Energizer", "huge toxic aura + reduces ALL hero/water cooldowns by 50% and global cooldowns by 20%)."]
      ],
      [
        ["Barbed Darts", ""],
        ["Heat-Tipped Darts", "pops Lead"],
        ["Ballistic Missile", "long-range explosive missiles"],
        ["First Strike Capability", "Ability: launches tactical nuke dealing 10,000 damage to strongest blimp, bypassing child spawns"],
        ["Pre-Emptive Strike", "automatically fires assassin missiles at every blimp entering the map + stronger First Strike)."]
      ],
      [
        ["Twin Guns", ""],
        ["Airburst Darts", "darts split into 3 sub-darts on impact"],
        ["Triple Guns", ""],
        ["Armor Piercing Darts", "heavy bonus damage to MOABs/Ceramics"],
        ["Sub Commander", "doubles pierce/damage of ALL Submarines in radius)."]
      ]
    ]],
    ["buccaneer_ship", "Monkey Buccaneer", 500, [
      [
        ["Faster Shooting", ""],
        ["Double Shot", ""],
        ["Destroyer", "5x attack speed!"],
        ["Aircraft Carrier", "launches 3 autonomous mini-fighter planes"],
        ["Carrier Flagship", "launches elite dart/missile fighters + buffs all Water & Ace towers +20% attack speed)."]
      ],
      [
        ["Grape Shot", "fires 5 flaming grapes"],
        ["Hot Shot", "pops Lead + fire DOT"],
        ["Cannon Ship", "fires explosive cannonballs"],
        ["Monkey Pirates", "Ability: harpoons and instantly drags down 1 MOAB/BFB for full cash"],
        ["Pirate Lord", "Ability: 3 grappling hooks capable of dragging down ZOMGs and granting 2x cash!)."]
      ],
      [
        ["Long Range", ""],
        ["Crow's Nest", "+Camo"],
        ["Merchantman", "generates $200 cash at end of every round"],
        ["Favored Trades", "generates $500/round + boosts sell value of nearby towers"],
        ["Trade Empire", "generates $800/round + buffs all other Merchantmen income)."]
      ]
    ]],
    ["fighter_ace", "Monkey Ace", 800, [
      [
        ["Rapid Fire", ""],
        ["Lots More Darts", "12 darts per volley"],
        ["Fighter Plane", "fires anti-MOAB missiles"],
        ["Operation: Dart Storm", "rapid 16-dart volleys + fast missiles"],
        ["Sky Shredder", "32-dart ultra-fast storms + heavy anti-MOAB missiles)."]
      ],
      [
        ["Exploding Pineapple", ""],
        ["Spy Plane", "+Camo"],
        ["Bomber Ace", "drops bomb carpets over the track"],
        ["Ground Zero", "Ability: drops atomic bomb dealing 700 damage to entire screen"],
        ["Tsar Bomba", "Ability: 3,000 screen-wide damage + 5s stun)."]
      ],
      [
        ["Sharper Darts", ""],
        ["Centered Path", ""],
        ["Neva-Miss Targeting", "darts home accurately onto bloons"],
        ["Spectre", "rapidly fires streams of homing darts and bombs"],
        ["Flying Fortress", "3 simultaneous streams of devastating homing darts & heavy bombs)."]
      ]
    ]],
    ["heli_pilot", "Heli Pilot", 1500, [
      [
        ["Quad Darts", ""],
        ["Pursuit", "auto-tracks leading bloons"],
        ["Razor Rotors", "spinning blades shred nearby bloons & Lead"],
        ["Apache Dartship", "adds rapid machine gun & rocket pods"],
        ["Apache Prime", "plasma machine gun + devastating anti-MOAB rockets)."]
      ],
      [
        ["Bigger Jets", ""],
        ["IFR Signals", "+Camo"],
        ["Downdraft", "blows small bloons backward along track"],
        ["Support Chinook", "Ability: drops $1,500 cash + 10 lives crate"],
        ["Special Poperations", "Ability: drops $3,500 cash + 25 lives + deploys an elite Marine gunner)."]
      ],
      [
        ["Faster Darts", ""],
        ["Faster Firing", ""],
        ["MOAB Shove", "pushes MOABs/BFBs backward!"],
        ["Comanche Defense", "summons 3 mini-helis when bloons pass 50% track"],
        ["Comanche Commander", "3 permanent mini-helis always active alongside main heli)."]
      ]
    ]],
    ["mortar_battery", "Mortar Monkey", 750, [
      [
        ["Bigger Blast", ""],
        ["Bloon Buster", "2 damage"],
        ["Shell Shock", "large shockwave stuns bloons"],
        ["The Big One", "huge nuclear blast radius + 5 damage"],
        ["The Biggest One", "massive blast dealing 25 damage + heavy stun)."]
      ],
      [
        ["Faster Reload", ""],
        ["Rapid Reload", ""],
        ["Heavy Shells", "bonus Ceramic/Lead/Fortified damage"],
        ["Artillery Battery", "3x fire rate + Ability: 4x fire rate for 8s"],
        ["Pop and Awe", "Ability: rains shells across entire screen stunning & damaging everything)."]
      ],
      [
        ["Increased Accuracy", ""],
        ["Burny Stuff", "sets bloons on fire"],
        ["Signal Flare", "strips Camo from all bloons in blast radius"],
        ["Shattering Shells", "strips Fortified plating from MOABs/BFBs/Ceramics!"],
        ["Blooncineration", "leaves burning walls of fire + defortifies DDTs)."]
      ]
    ]],
    ["gatling_gunner", "Dartling Gunner", 850, [
      [
        ["Focused Firing", ""],
        ["Laser Shock", "bloons take +1 damage from follow-up hits"],
        ["Laser Cannon", "piercing energy beams"],
        ["Plasma Accelerator", "continuous high-damage plasma beam"],
        ["Ray of Doom", "colossal screen-spanning vaporizing death ray)."]
      ],
      [
        ["Advanced Targeting", "+Camo"],
        ["Faster Barrel Spin", ""],
        ["Hydra Rocket Pods", "fires explosive mini-rockets"],
        ["Rocket Storm", "Ability: unleashes a dense fan of rockets across the map"],
        ["M.A.D.", "Mega Anti-MOAB Destroyer — fires massive slow rockets dealing 550 damage per hit to blimps!)."]
      ],
      [
        ["Powerful Darts", ""],
        ["Faster Swivel", "Increases firing speed and range"],
        ["Buckshot", "fires 6 high-knockback pellets"],
        ["Bloon Area Denial System", "4-barrel automatic targeting"],
        ["Bloon Exclusion Zone", "6-barrel automatic storm of heavy pellets)."]
      ]
    ]],
    ["arcane_wizard", "Wizard Monkey", 375, [
      [
        ["Guided Magic", "homing bolts that ignore obstacles"],
        ["Arcane Blast", "2 damage"],
        ["Arcane Mastery", "high range, pierce & speed"],
        ["Arcane Spike", "16 damage rapid bolts, pops Lead"],
        ["Archmage", "devastating arcane bolts + Dragon's Breath + Shimmer combined!)."]
      ],
      [
        ["Fireball", ""],
        ["Wall of Fire", "places burning fire patches on track"],
        ["Dragon's Breath", "rapid stream of flames"],
        ["Summon Phoenix", "Ability: summons a flying Phoenix firing rapid flames for 20s"],
        ["Wizard Lord Phoenix", "permanent Phoenix + Ability transforms Wizard into an invincible Lava Lord Phoenix)."]
      ],
      [
        ["Intense Magic", ""],
        ["Monkey Sense", "+Camo"],
        ["Shimmer", "pulses decamo wave"],
        ["Necromancer: Unpopped Army", "resurrects popped bloons as zombie bloons that charge backward down the track!"],
        ["Prince of Darkness", "summons Zombie MOABs & BFBs!)."]
      ]
    ]],
    ["super_champion", "Super Monkey", 2500, [
      [
        ["Laser Blasts", "2 pierce, energy"],
        ["Plasma Blasts", "2x speed, pops Lead"],
        ["Sun Avatar", "fires 3 wide-spread plasma beams"],
        ["Sun Temple", "sacrifices nearby towers to gain colossal golden sun-beams & mini-avatars"],
        ["True Sun God", "ultimate golden deity firing devastating sun beams & golden spectres)."]
      ],
      [
        ["Super Range", ""],
        ["Epic Range", ""],
        ["Robo Monkey", "dual independent arms targeting `First` and `Strong`"],
        ["Tech Terror", "Ability: plasma annihilation nova destroying all bloons in huge radius"],
        ["The Anti-Bloon", "dual crit plasma cannons + massive screen-clearing annihilation ability)."]
      ],
      [
        ["Knockback", "pushes bloons back"],
        ["Ultravision", "+Camo & extra range"],
        ["Dark Knight", "fires dark blades with bonus MOAB damage + Darkshift teleport ability"],
        ["Dark Champion", "dual dark blades, pops all bloon types, global teleport"],
        ["Legend of the Night", "black-hole passive portal absorbs leaked bloons before losing lives!)."]
      ]
    ]],
    ["ninja_assassin", "Ninja Monkey", 500, [
      [
        ["Ninja Discipline", ""],
        ["Sharp Shurikens", ""],
        ["Double Shot", "2 shurikens"],
        ["Bloonjitsu", "5 homing shurikens per throw"],
        ["Grandmaster Ninja", "8 ultra-fast homing shurikens)."]
      ],
      [
        ["Distraction", "chance to send bloons backward"],
        ["Counter-Espionage", "strips Camo from hit bloons"],
        ["Shinobi Tactics", "buffs attack speed & pierce of all nearby Ninjas, stacks up to 20x!"],
        ["Bloon Sabotage", "Ability: slows all newly spawning bloons & MOABs by 50% for 15s"],
        ["Grand Saboteur", "Ability: global 50% slow + deals 25% max HP damage to every blimp as it spawns!)."]
      ],
      [
        ["Seeking Shuriken", "homing shurikens"],
        ["Caltrops", "places sharp spikes on track"],
        ["Flash Bomb", "throws stun bombs every 4th attack, pops Lead"],
        ["Sticky Bomb", "attaches timed 500-damage explosive charges to MOABs"],
        ["Master Bomber", "rapid 3,000-damage sticky bombs + global flash stuns)."]
      ]
    ]],
    ["brew_alchemist", "Alchemist", 550, [
      [
        ["Larger Potions", ""],
        ["Acidic Mixture Dip", "coats nearby towers' weapons to pop Lead & +1 MOAB damage"],
        ["Berserker Brew", "throws potion giving nearest tower +damage, +range, +attack speed"],
        ["Stronger Stimulant", "stronger, longer-lasting buff"],
        ["Permanent Brew", "buffs applied to nearby towers become PERMANENT!)."]
      ],
      [
        ["Stronger Acid", ""],
        ["Perishing Potions", "removes Fortified property from bloons/MOABs"],
        ["Unstable Concoction", "blimps explode on pop dealing percentage AOE damage!"],
        ["Transforming Tonic", "Ability: transforms Alchemist into a laser-shooting monster for 20s"],
        ["Total Transformation", "Ability: transforms Alchemist + 5 nearby low-tier towers into laser monsters)."]
      ],
      [
        ["Faster Throwing", ""],
        ["Acid Pool", ""],
        ["Lead to Gold", "instantly turns Lead bloons into $50 cash!"],
        ["Rubber to Gold", "coats bloons in gold so they give 2x cash when popped"],
        ["Bloon Master Alchemist", "shrinks even ZOMGs/DDTs/BFBs into single Red bloons!)."]
      ]
    ]],
    ["spirit_druid", "Druid", 425, [
      [
        ["Hard Thorns", "pops Lead/Frozen"],
        ["Heart of Thunder", "fires chain-lightning bolts"],
        ["Druid of the Storm", "launches tornadoes blowing bloons back to start of track"],
        ["Ball Lightning", "fires slow-moving lightning orbs zapping everything nearby"],
        ["Superstorm", "summons massive lightning super-tornadoes that blow back even MOABs/BFBs/DDTs!)."]
      ],
      [
        ["Thorn Swarm", "8 thorns"],
        ["Heart of Oak", "strips Regrow property from bloons"],
        ["Druid of the Jungle", "instantly grabs and dissolves 1 bloon with strangler vines"],
        ["Jungle's Bounty", "Ability: generates $300 + $120 per nearby Banana Farm"],
        ["Spirit of the Forest", "covers the entire track in permanent damaging bramble vines + generates $1,000/round + lives)."]
      ],
      [
        ["Druidic Reach", ""],
        ["Heart of Vengeance", "gains up to +100% attack speed as lives drop"],
        ["Druid of Wrath", "gains speed the longer it attacks continuously"],
        ["Poplust", "buffs attack speed & pierce of nearby Druids, stacks 5x"],
        ["Avatar of Wrath", "gains massive damage proportional to total RBE currently on screen!)."]
      ]
    ]],
    ["banana_farm", "Banana Farm", 1250, [
      [
        ["Increased Production", "6 bunches/rd"],
        ["Greater Production", "8 bunches/rd"],
        ["Banana Plantation", "16 bunches/rd"],
        ["Banana Research Facility", "5 high-value crates worth $300 each"],
        ["Banana Central", "5 mega-crates worth $1,200 each + buffs all Research Facilities +25%)."]
      ],
      [
        ["Long Life Bananas", ""],
        ["Valuable Bananas", "+25% cash value"],
        ["Monkey Bank", "stores cash & earns 15% compound interest each round up to $7,000"],
        ["IMF Loan", "Ability: grants $10,000 instant cash loan repaid from 50% of future income"],
        ["Monkey-Nomics", "Ability: grants $10,000 FREE cash with zero debt!)."]
      ],
      [
        ["EZ Collect", "larger pickup radius + auto-collects expired bananas at 50% value"],
        ["Banana Salvage", "auto-collects at 85% value"],
        ["Marketplace", "auto-deposits cash directly into bank every round, no pickup needed"],
        ["Central Market", "generates $1,100/round + buffs Buccaneer Merchantmen"],
        ["Monkey Wall Street", "generates $4,000/round + auto-collects nearby crates + +10 lives/round)."]
      ]
    ]],
    ["spike_factory", "Spike Factory", 1000, [
      [
        ["Bigger Stacks", "10 spikes/pile"],
        ["White Hot Spikes", "pops Lead & Frozen"],
        ["Spiked Balls", "bonus Ceramic/Fortified damage"],
        ["Spiked Mines", "spike piles explode violently when depleted"],
        ["Super Mines", "nuclear mini-mines dealing colossal AOE damage)."]
      ],
      [
        ["Faster Production", ""],
        ["Even Faster Production", ""],
        ["MOAB SHREDR", "4x damage to MOAB-class blimps"],
        ["Spike Storm", "Ability: blankets the entire track in MOAB-shredding spikes"],
        ["Carpet of Spikes", "auto-triggers Spike Storm every 15 seconds + manual Ability)."]
      ],
      [
        ["Long Reach", ""],
        ["Smart Spikes", "targets `Normal`, `Close`, `Far`, or `Smart` active path"],
        ["Long Life Spikes", "piles last across multiple rounds"],
        ["Deadly Spikes", "3 damage per spike"],
        ["Perma-Spike", "10-damage mega-piles that persist for 3+ full rounds at the exit!)."]
      ]
    ]],
    ["monkey_village", "Monkey Village", 1200, [
      [
        ["Bigger Radius", ""],
        ["Jungle Drums", "+18% attack speed to all towers in radius"],
        ["Primary Training", "+range, +pierce, +projectile speed for Primary towers"],
        ["Primary Mentoring", "free Tier-1 upgrades for Primary towers + faster cooldowns"],
        ["Primary Expertise", "built-in mega-ballista turret + free Tier-2 upgrades + massive Primary buffs)."]
      ],
      [
        ["Grow Blocker", "prevents Regrow bloons from regenerating in radius"],
        ["Radar Scanner", "grants Camo Detection to ALL towers in radius!"],
        ["Monkey Intelligence Bureau", "allows ALL towers in radius to pop ANY bloon type regardless of immunities!"],
        ["Call to Arms", "Ability: +50% attack speed & pierce to all towers in radius for 12s"],
        ["Homeland Defense", "Ability: +100% attack speed & pierce to ALL towers on the entire map!)."]
      ],
      [
        ["Monkey Business", "-10% upgrade cost for Tier 1–3"],
        ["Monkey Commerce", "stacks up to -15% discount"],
        ["Monkey Town", "+50% extra cash per pop for towers in radius"],
        ["Monkey City", "generates free Dart Thrower each round + boosts cash generation"],
        ["Monkeyopolis", "absorbs nearby Banana Farms to generate massive crates each round)."]
      ]
    ]],
    ["combat_engineer", "Engineer Monkey", 400, [
      [
        ["Sentry Gun", "deploys mini nail turrets"],
        ["Faster Engineering", ""],
        ["Sprockets", "doubles sentry & engineer attack speed"],
        ["Sentry Expert", "deploys specialized Crushing, Boom, Cold, and Energy sentries"],
        ["Sentry Champion", "deploys ultra-rapid plasma sentries that self-destruct in explosions)."]
      ],
      [
        ["Larger Service Area", ""],
        ["Deconstruction", "+damage to MOABs/Fortified"],
        ["Cleansing Foam", "sprays foam on track that strips Camo/Regrow and pops Lead"],
        ["Overclock", "Ability: target tower gains +66% attack speed for 30s!"],
        ["Ultraboost", "Ability permanently stacks +6.6% attack speed up to 10x on a tower!)."]
      ],
      [
        ["Oversize Nails", ""],
        ["Pin", "pins bloons in place briefly"],
        ["Double Gun", ""],
        ["Bloon Trap", "places a trap box on track that swallows bloons and pays double cash when full"],
        ["XXXL Trap", "massive trap box capable of swallowing entire MOABs/BFBs/DDTs!)."]
      ]
    ]],
    ["beast_handler", "Beast Handler", 300, [
      [
        ["Piranha", ""],
        ["Barracuda", ""],
        ["Great White", "drags down MOABs"],
        ["Orca", ""],
        ["Megalodon", "drags down BADs below half HP!)."]
      ],
      [
        ["Velociraptor", ""],
        ["Adasaurus", ""],
        ["Velociraptor Pack", "Adds a second bite and boosts attack speed"],
        ["Tyrannosaurus Rex", "stomp shockwave ability"],
        ["Giganotosaurus", "massive stomp & chomp)."]
      ],
      [
        ["Gyrfalcon", ""],
        ["Horned Owl", ""],
        ["Golden Eagle", "picks up bloons and carries them backward"],
        ["Giant Condor", ""],
        ["Pouākai", "carries away entire clusters of MOABs/BFBs!)."]
      ]
    ]],
    ["mech_workshop", "Tactical Mech Workshop", 950, [
      [
        ["Auto-Turret", ""],
        ["Railgun Pod", ""],
        ["Plasma Cannon", ""],
        ["Orbital Relay", ""],
        ["Omega Rail-Fortress.", ""]
      ],
      [
        ["Repair Drones", ""],
        ["Shield Generator", ""],
        ["Field Repairs", "Strengthens the support aura"],
        ["Nano-Boost", "Ability: shields 50 lives temporarily & boosts nearby towers"],
        ["Titan Protocol", "Ability: deploys a controllable walking Battle Mech)."]
      ],
      [
        ["Scrap Recycler", "earns bonus cash from popped blimps"],
        ["Salvage Bay", ""],
        ["Tech Foundry", ""],
        ["Cyber Syndicate", ""],
        ["Hyper-Corporation.", ""]
      ]
    ]]
  ];
  // Radius, firing interval, damage, pierce, footprint, type, attack pattern, terrain, color, icon.
  const bases = [
    [135,.72,1,2,20,'sharp','dart','land','#b9864c','➶'],
    [155,1.0,1,4,22,'sharp','arc','land','#ee9b42','↪'],
    [155,1.23,1,11,25,'explosive','blast','land','#7f92a7','✹'],
    [85,1,1,1,21,'sharp','ring','land','#ed647c','✳'],
    [82,1.26,1,15,21,'cold','pulse','land','#80d7fe','❄'],
    [148,1.02,0,1,20,'true','dart','land','#eec849','◈'],
    [1800,1.62,2,1,21,'sharp','beam','land','#78955b','⌖'],
    [155,.75,1,3,24,'sharp','seek','water','#40adbb','◒'],
    [159,.85,1,4,26,'sharp','fan','water','#a27a56','⚓'],
    [215,1.40,1,2,30,'sharp','ring','land','#6dbed9','✈'],
    [162,.62,1,2,29,'sharp','fan','land','#be8a60','✣'],
    [1600,1.5,1,24,25,'explosive','blast','land','#868e5b','⊕'],
    [1700,.23,1,2,25,'sharp','aim','land','#818ebd','⟰'],
    [148,.73,1,4,21,'energy','seek','land','#a17cde','✦'],
    [173,.11,1,2,25,'sharp','dart','land','#4679e8','◆'],
    [135,.53,1,3,20,'sharp','dart','land','#d45e6f','✥'],
    [125,1.15,1,7,22,'acid','blast','land','#ed9e64','⚗'],
    [132,1.05,1,1,21,'sharp','fan','land','#7ab072','❋'],
    [108,1.0,0,1,27,'true','farm','land','#e5ba58','▤'],
    [126,1.28,1,5,26,'sharp','trap','land','#a9afbe','✷'],
    [137,1,0,1,29,'true','support','land','#d88e57','⌂'],
    [141,.70,1,3,21,'sharp','dart','land','#f4c954','⚙'],
    [147,.93,1,3,23,'sharp','bite','amphibious','#70aa77','♞'],
    [152,.85,2,3,26,'sharp','beam','land','#8299d7','▣']
  ];
  // Upgrade effects use additive stats, multiplicative cadence and named combat mechanics.
  const effects = [
    [
      'p+2|p+3|attack=arc,p+13,d+1,type=steel|p+18,d+3,type=true,ceramic+5|p+38,d+6,shots+5,ricochet',
      'c*.78|c*.78|attack=fan,shots=3|ability=fanclub,c*.8|ability=plasmaclub,c*.7,d+2',
      'r+33|r+25,camo|r+45,d+2,p+3|crit=50|crit=120,c*.49,type=true,d+4'
    ],[
      'p+3|p+4|ricochet,attack=chain|moab+12,p+10|attack=orbit,d+8,p+36,r+47',
      'c*.8|c*.8|c*.35|ability=turbo|ability=turbo,c*.36,d+4',
      'r+35|type=steel,d+1|d+2,p+7,attack=arc|moab+12,back=39|moab+45,back=86,splash=61,dot=7'
    ],[
      'splash+21,p+5|d+1,p+5|splash+21,stun=.35|stun=1.05,p+19|stun=2.0,moabStun,d+10,type=true',
      'c*.82|c*.82,velocity+290|moab+15|ability=missile,moab+15|ability=eliminator,moab+61',
      'r+29|frags=8|clusters=3|clusters=6,recursive|leakburst,clusters=9,d+6'
    ],[
      'c*.78|c*.7|type=fire,d+1|attack=pulse,d+4,p+30|d+12,p+42,r+37,meteor',
      'r+25|r+23|shots=12,p+1|ability=maelstrom|ability=superstorm,d+2,type=steel',
      'shots=10|shots=12|shots=16|c*.32|shots=32,c*.42,d+2,p+1'
    ],[
      'permafrost|type=steel,camo|iceShards|decamo,mark=1|mark=4,moabStun,p+20',
      'stun+1|d+1|iceAura,bridge|ability=snowstorm|ability=absolutezero,c*.7',
      'r+23|c*.78|attack=blast,r+32,splash=56,d+2|iceShards,d+3|moabStun,moab+28,slow=.26,camo,type=steel'
    ],[
      'inherit|dot=1|dot=3,type=acid|dot=7,c*.7|dot=19,splash=93,p+18,d+3',
      'splash=32|splash=64,p+5|c*.42|ability=gluestrike,mark=2|ability=gluestorm,moabStun,dot=7',
      'statusTime+6|slow=.25|moabStun|deathStun|slow=.02,dot=14'
    ],[
      'd=4,type=steel|d=7|d=20,ceramic+12|d=30,stun=1.5,moabStun|d=140,stun=2.3,mark=5',
      'camo|frags=5|attack=chain,p=4|ability=supply|ability=eliteSupply,sniperAura',
      'c*.72|c*.73|c*.38|c*.45|c*.25,finishSpeed'
    ],[
      'r+25|intel|submerge,decamo|d+4,slowCooldown=.85,r+35|d+6,slowCooldown=.5,r+55,globalCooldown=.8',
      'p+2|type=steel|attack=blast,type=explosive,splash=49,moab+7,r+38|ability=firststrike|ability=preemptive,entryHit=750,moab+16',
      'shots=2|frags=3|shots=3|moab+10,ceramic+5|subAura,d*2,p*2'
    ],[
      'c*.77|shots+2|c*.23|aircraft=3|aircraft=5,carrierAura',
      'shots+3|type=fire,dot=2|attack=blast,type=explosive,splash=57,d+4|ability=pirates|ability=piratelord,d+4',
      'r+31|camo|income=200|income=500,sellAura|income=800,merchantAura'
    ],[
      'c*.72|shots=12|moab+15|shots=16,c*.47,moab+15|shots=32,c*.48,moab+32',
      'pineapple|camo|bombard,splash=69|ability=groundzero|ability=tsar,damage+3',
      'p+2|centered,r+30|attack=seek|attack=blast,splash=48,c*.34,d+3|shots=3,c*.47,d+11,moab+12'
    ],[
      'shots=4|pursuit|rotors|c*.49,shots=6,moab+11|type=plasma,d+8,moab+22,splash=41',
      'movement+110|camo|back=36|ability=chinook|ability=specops',
      'velocity+270|c*.63|back=25,moabStun|comanche|aircraft=3,d+5'
    ],[
      'splash+26|d+1|stun=.8|splash+43,d=5|splash+38,d=25,stun=1.5,moabStun',
      'c*.74|c*.68|ceramic+8,fortDamage+5|c*.34,ability=battery|ability=popawe,d+6',
      'splash+17|dot=2|decamo|defortify|hazard=6,defortifyAll,type=fire,d+9'
    ],[
      'p+1|mark=1|attack=beam,type=energy,p+4|attack=beam,type=plasma,c*.4,d+2|attack=beam,type=true,p+48,d+34',
      'camo|c*.69|attack=blast,type=explosive,splash=40,d+2|ability=rocketstorm|ability=rocketstorm,moab=550,d+12',
      'p+3|c*.79,r+40|attack=fan,shots=6,back=17|autoAim,shots=10,d+2|shots=16,d+7,back=30'
    ],[
      'ignoreObstacles,attack=seek|d=2|r+54,p+5,c*.68|d=16,type=steel|d+18,dot=4,decamo,splash=43',
      'splash=44,type=fire|hazard=2|dot=4,c*.36|ability=phoenix|ability=lordphoenix,d+18,aircraft=1',
      'p+5|camo|decamo,pulseDecamo|zombie=4|zombie=21,d+3'
    ],[
      'type=energy,p+1|type=plasma,c*.5|attack=fan,shots=3|sacrifice,attack=beam,d+16,p+25|sacrifice,d+77,p+60,r+80',
      'r+65|r+66|shots=2,dual|ability=terror,type=plasma|ability=antibloon,crit=280,d+18',
      'back=17|camo,r+50|attack=beam,moab+24,darkshift|type=true,shots=2,r+100,d+12|portal,d+54'
    ],[
      'c*.78,r+18|p+2|shots=2|shots=5,attack=seek|shots=8,c*.49,d+2',
      'back=15|decamo|shinobi|ability=sabotage|ability=grandsabo',
      'attack=seek|caltrops|stun=.55,splash=36,type=steel|sticky=500,moabStun|sticky=3000,r+140,moab+35'
    ],[
      'splash+25|acidAura|brewAura|stimulant|permaBrew',
      'dot=2|defortify|unstable|ability=tonic|ability=transformation,d+6',
      'c*.72|hazard=2|leadGold|rubberGold|shrink'
    ],[
      'type=steel|attack=chain,type=energy,p+4|back=85|d+5,p+8,attack=orbit|moabStun,back=175,d+14,type=true',
      'shots=8|stripRegrow|vine|ability=bounty|trackThorns,income=1000,lives=2',
      'r+32|vengeance|wrath|poplust|avatar,d+8'
    ],[
      'income=120|income=160|income=320|income=1500|income=6000,central',
      'longBanana|valuable|bank=7000|ability=loan,bank=10000|ability=nomics,bank=12500',
      'salvage=.5|salvage=.85|income=400,market|income=1100,tradeAura|income=4000,lives=10,autoHarvest'
    ],[
      'p=10|type=steel|ceramic+6,fortDamage+3|mine,splash=78|d+48,splash=152,type=true',
      'c*.72|c*.72|moab*4,moab+3|ability=spikestorm|autoStorm,ability=spikestorm,d+3',
      'r+35|smartSpike|trapTime=115|d=3|d=10,trapTime=340,p+12'
    ],[
      'r+38|drums|primaryTraining|primaryMentoring|primaryExpert,d=24,attack=beam,p=30,type=true',
      'growBlock|radar|mib|ability=callarms|ability=homeland',
      'discount=.1|discount=.15|cashAura|freeDart,extraCashAura|opolis,income=1250'
    ],[
      'sentry=1|sentry=2|c*.5|sentry=4|sentry=6,type=plasma',
      'r+35|moab+10,fortDamage+4|decamo,stripRegrow,type=steel|ability=overclock|ability=ultraboost',
      'p+6|stun=.28|shots=2|capture=30|capture=700,moabStun'
    ],[
      'beast=1,p+1|d+4|takedown=moab|takedown=bfb,moab+85|takedown=bad,moab+240',
      'c*.7|d+3|shots=2,c*.78|ability=titanstomp,d+12|ability=gigastomp,d+38,moab+29',
      'attack=seek,back=28|back=45|back=63,p+5|moabStun,back=102|back=179,d+15,p+11'
    ],[
      'sentry=2|d+6,p+5|type=plasma,c*.68|orbital|type=true,d+73,p+38',
      'repair|shield=18|drums,shield=30|ability=nanoboost,shield=50|ability=titanmech,d+14',
      'scrap=25|scrap=42|income=350|income=720,scrap=100|income=1900,scrap=180'
    ]
  ];
  const numeric = /^([a-zA-Z]+)([+*=])(-?\d*\.?\d+)$/;
  const assignment = /^(\w+)=(.+)$/;
  const labels = {d:'damage',c:'attack interval',r:'range',p:'pierce',dmg:'damage',moab:'blimp damage',ceramic:'ceramic damage',stun:'stun duration',splash:'blast radius',shots:'projectiles',velocity:'projectile speed',income:'round income'};
  const costs = [[.72,1.2,2.9,6.2,28],[.61,1.15,2.75,7.2,26],[.65,1.24,2.6,6.9,25]];
  const cats = ['Primary','Military','Magic','Support'];
  const descriptions = text => text.replace(/\bAbility:\s*/, '');
  G.towerList = catalog.map(([id,name,baseCost,paths],index) => {
    const [r,c,d,p,f,type,attack,terrain,color,icon] = bases[index];
    const category = cats[index < 6 ? 0 : index < 13 ? 1 : index < 18 ? 2 : 3];
    return {
      id,name,category,baseCost,footprint:f,terrain,color,icon,index,
      base:{r,c,d,p,type,attack,velocity:520,shots: id==='tack_shooter'||id==='fighter_ace'?8:id==='spirit_druid'?5:id==='buccaneer_ship'||id==='heli_pilot'?2:1,
        splash:id==='mortar_battery'?78:id==='bomb_cannon'?52:id==='brew_alchemist'?40:0,
        stun:id==='ice_emitter'?1.15:0, slow:id==='glue_gunner'?.5:1,statusTime:3,
        camo:id==='ninja_assassin',income:id==='banana_farm'?80:0,trapTime:29, moab:0, ceramic:0,
        movement:240},
      paths: paths.map((path,j)=>path.map(([name,note],k)=>{
        const change = effects[index][j].split('|')[k].replace('damage+','d+');
        const cost = Math.max(75,Math.round((baseCost*costs[j][k]+k*k*23)/5)*5);
        const generated = change.split(',').map(token=>{
          const match = token.match(numeric);
          if (!match) return token.startsWith('ability=') ? 'Unlock active ability' : '';
          const [,key,op,value] = match;
          return labels[key] ? labels[key]+' '+(op==='*'?'×':op)+value : '';
        }).filter(Boolean).join(' · ');
        return {name,description:descriptions(note) || generated || name+' enables a new combat effect.',change,cost};
      }))
    };
  });
  G.towers = Object.fromEntries(G.towerList.map(t=>[t.id,t]));
  G.legalTiers = tiers => tiers.length===3 && tiers.every(n=>Number.isInteger(n) && n>=0 && n<=5) &&
    tiers.filter(n=>n>0).length<=2 && tiers.filter(n=>n>2).length<=1;
  G.towerStats = (def,tiers) => {
    const stats = {...def.base};
    def.paths.forEach((path,j)=>path.slice(0,tiers[j]).forEach(({change})=> {
      for (const token of change.split(',')) {
        const math = token.match(numeric);
        if (math) {
          const [,key,op,raw] = math;
          const v = Number(raw);
          stats[key] = op==='+' ? (stats[key]||0)+v : op==='*' ? (stats[key]||0)*v : v;
        } else {
          const match=token.match(assignment);
          if (match) stats[match[1]]=match[2];
          else stats[token]=true;
        }
      }
    }));
    return stats;
  };
})();

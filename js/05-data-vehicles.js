
'use strict';

const VEHICLES = {
  /* ---------- BTR 線 ---------- */
  btr80: {
    id:'btr80', name:'BTR-80', tier:1, line:'btr',
    weapon:'14.5mm KPVT + 7.62mm PKT', weaponSpecial:'無',
    armorGrid:['10/10/7','10/10/10','—'],
    speedFwd:80, speedRev:20, speedRoad:80, speedOffroad:'40-50',
    supportDuration:30, next:['btr80a','bmp1','t80'],
    researchCost:null
  },
  btr80a: {
    id:'btr80a', name:'BTR-80A', tier:2, line:'btr',
    weapon:'30mm 2A72 + 7.62mm PKT', weaponSpecial:'無',
    armorGrid:['10/10/7','23/10/10','—'],
    speedFwd:87, speedRev:20, speedRoad:87, speedOffroad:'40-50',
    supportDuration:35, next:['btr82'],
    researchCost:{ ammoCal:'5.45', ammoCount:2000, liquor:200, exp:1000 }
  },
  btr82: {
    id:'btr82', name:'BTR-82', tier:3, line:'btr',
    weapon:'14.5mm KPVT + 7.62mm PKT', weaponSpecial:'無',
    armorGrid:['10/10/7','10/10/10','—'],
    speedFwd:100, speedRev:20, speedRoad:100, speedOffroad:'50-60',
    supportDuration:35, next:['btr82a'],
    researchCost:{ ammoCal:'7.62', ammoCount:1500, liquor:300, exp:2000 }
  },
  btr82a: {
    id:'btr82a', name:'BTR-82A', tier:4, line:'btr',
    weapon:'30mm 2A72 + 7.62mm PKT', weaponSpecial:'無',
    armorGrid:['15/10/7','23/10/10','—'],
    speedFwd:100, speedRev:20, speedRoad:100, speedOffroad:'50-60',
    supportDuration:40, next:['btr90'],
    researchCost:{ ammoCal:'7.62', ammoCount:2500, liquor:800, exp:5000 }
  },
  btr90: {
    id:'btr90', name:'BTR-90', tier:5, line:'btr',
    weapon:'30mm 2A42 + 7.62mm PKT + ATGM', weaponSpecial:'9M113 競賽',
    armorGrid:['30/15/10','30/15/10','—'],
    speedFwd:100, speedRev:20, speedRoad:100, speedOffroad:'50-60',
    supportDuration:45, next:[],
    researchCost:{ ammoCal:'12.7', ammoCount:1500, liquor:1500, exp:12000 }
  },
  /* ---------- T-80 線 ---------- */
  t80: {
    id:'t80', name:'T-80', tier:2, line:'t80',
    weapon:'125mm 2A46 + 7.62mm PKT + 12.7mm NSVT', weaponSpecial:'無',
    armorGrid:['450/80/60','500/200/80','—'],
    speedFwd:70, speedRev:11, speedRoad:70, speedOffroad:48,
    supportDuration:40, next:['t80b'],
    researchCost:{ ammoCal:'9x39', ammoCount:3000, liquor:1000, exp:5000 }
  },
  t80b: {
    id:'t80b', name:'T-80B', tier:3, line:'t80',
    weapon:'125mm 2A46 + 7.62mm PKT + 12.7mm NSVT', weaponSpecial:'無',
    armorGrid:['480/80/60','500/200/80','—'],
    speedFwd:78, speedRev:11, speedRoad:78, speedOffroad:48,
    supportDuration:42, next:['t80bv'],
    researchCost:{ ammoCal:'7.62', ammoCount:3000, liquor:1200, exp:7000 }
  },
  t80bv: {
    id:'t80bv', name:'T-80BV', tier:4, line:'t80',
    weapon:'125mm 2A46 + 7.62mm PKT + 12.7mm NSVT', weaponSpecial:'無',
    armorGrid:['480/80/60','500/200/80','接觸-1'],
    speedFwd:70, speedRev:11, speedRoad:70, speedOffroad:48,
    supportDuration:45, next:['t80u'],
    researchCost:{ ammoCal:'7.62x54', ammoCount:2500, liquor:1800, exp:9000 }
  },
  t80u: {
    id:'t80u', name:'T-80U', tier:5, line:'t80',
    weapon:'125mm 2A46M-1 + 7.62mm PKT + 12.7mm NSVT', weaponSpecial:'無',
    armorGrid:['500/80/60','600/250/80','接觸-5'],
    speedFwd:70, speedRev:11, speedRoad:70, speedOffroad:48,
    supportDuration:48, next:['t80uk','t80um'],
    researchCost:{ ammoCal:'7.62x54', ammoCount:3000, liquor:3000, exp:15000 }
  },
  t80uk: {
    id:'t80uk', name:'T-80UK', tier:6, line:'t80',
    weapon:'125mm 2A46M-1 + 7.62mm PKT + 12.7mm NSVT', weaponSpecial:'無',
    armorGrid:['500/80/60','600/250/80','接觸-5'],
    speedFwd:70, speedRev:11, speedRoad:70, speedOffroad:48,
    supportDuration:50, next:[],
    researchCost:{ ammoCal:'12.7', ammoCount:2000, liquor:4000, exp:20000 }
  },
  t80um: {
    id:'t80um', name:'T-80UM', tier:6, line:'t80',
    weapon:'125mm 2A46M-1 + 7.62mm PKT + 12.7mm NSVT', weaponSpecial:'無',
    armorGrid:['500/80/60','600/250/80','接觸-5'],
    speedFwd:70, speedRev:11, speedRoad:70, speedOffroad:48,
    supportDuration:52, next:[],
    researchCost:{ ammoCal:'12.7', ammoCount:2500, liquor:5000, exp:22000 }
  },
  /* ---------- BMP 線 ---------- */
  bmp1: {
    id:'bmp1', name:'BMP-1', tier:1, line:'bmp',
    weapon:'73mm 2A28 + 7.62mm PKT', weaponSpecial:'9M14 嬰兒',
    armorGrid:['19/16/6','23/19/13','—'],
    speedFwd:65, speedRev:10, speedRoad:65, speedOffroad:'45-50',
    supportDuration:30, next:['bmp1m'],
    researchCost:{ ammoCal:'5.45', ammoCount:1000, liquor:100, exp:500 }
  },
  bmp1m: {
    id:'bmp1m', name:'BMP-1M', tier:2, line:'bmp',
    weapon:'30mm 2A72 + 7.62mm PKT', weaponSpecial:'無',
    armorGrid:['19/16/6','23/19/13','—'],
    speedFwd:65, speedRev:10, speedRoad:65, speedOffroad:'45-50',
    supportDuration:32, next:['bmp2'],
    researchCost:{ ammoCal:'5.45', ammoCount:1500, liquor:150, exp:800 }
  },
  bmp2: {
    id:'bmp2', name:'BMP-2', tier:3, line:'bmp',
    weapon:'30mm 2A42 + 7.62mm PKT + ATGM', weaponSpecial:'9M113 競賽',
    armorGrid:['19/16/6','23/19/13','—'],
    speedFwd:65, speedRev:10, speedRoad:65, speedOffroad:'45-50',
    supportDuration:35, next:['bmp3'],
    researchCost:{ ammoCal:'7.62', ammoCount:2000, liquor:500, exp:3000 }
  },
  bmp3: {
    id:'bmp3', name:'BMP-3', tier:4, line:'bmp',
    weapon:'100mm 2A70 + 30mm 2A72 + 7.62mm PKT', weaponSpecial:'無',
    armorGrid:['60/43/30','50/40/30','—'],
    speedFwd:70, speedRev:20, speedRoad:70, speedOffroad:'45-50',
    supportDuration:40, next:['bmd4'],
    researchCost:{ ammoCal:'7.62x54', ammoCount:2500, liquor:2500, exp:12000 }
  },
  bmd4: {
    id:'bmd4', name:'BMD-4', tier:5, line:'bmp',
    weapon:'100mm 2A70 + 30mm 2A72 + 7.62mm PKT', weaponSpecial:'無',
    armorGrid:['40/30/20','23/20/15','—'],
    speedFwd:70, speedRev:20, speedRoad:70, speedOffroad:'45-50',
    supportDuration:48, next:['bmp3m'],
    researchCost:{ ammoCal:'7.62x54', ammoCount:3000, liquor:3000, exp:15000 }
  },
  /* ---------- BMP-3M：UTD-32 660hp / 19.1t，前弧附加裝甲 + 熱像 FCS ---------- */
  bmp3m: {
    id:'bmp3m', name:'BMP-3M', tier:6, line:'bmp',
    weapon:'100mm 2A70 + 30mm 2A72 + 7.62mm PKT', weaponSpecial:'無',
    armorGrid:['70/40/22','65/45/30','Kaktus'],
    speedFwd:70, speedRev:20, speedRoad:70, speedOffroad:'50-55',
    supportDuration:50, next:[],
    researchCost:{ ammoCal:'7.62x54', ammoCount:3500, liquor:3500, exp:18000 }
  }
};

const VEHICLE_LOADOUT = {
  btr80:{kpvt:{belts:10,perBelt:50},pkt:{belts:8,perBelt:250}},
  btr80a:{'2a72':{belts:5,perBelt:100},pkt:{belts:8,perBelt:250}},
  btr82:{kpvt:{belts:10,perBelt:50},pkt:{belts:8,perBelt:250}},
  btr82a:{'2a72':{belts:5,perBelt:100},pkt:{belts:8,perBelt:250}},
  btr90:{'2a42':{belts:4,perBelt:100},pkt:{belts:6,perBelt:250},atgm:{rounds:2,ammoId:'9m113'}},
  bmp1:{'2a28':{rounds:40},pkt:{belts:8,perBelt:250},atgm:{rounds:1,ammoId:'9m14'}},
  bmp1m:{'2a72':{belts:5,perBelt:100},pkt:{belts:8,perBelt:250}},
  bmp2:{'2a42':{belts:5,perBelt:100},pkt:{belts:8,perBelt:250},atgm:{rounds:3,ammoId:'9m113'}},
  bmp3:{'2a70':{rounds:40},'2a72':{belts:5,perBelt:100},pkt:{belts:8,perBelt:250}},
  bmd4:{'2a70':{rounds:40},'2a72':{belts:5,perBelt:100},pkt:{belts:8,perBelt:250}},
  bmp3m:{'2a70':{rounds:40},'2a72':{belts:5,perBelt:100},pkt:{belts:8,perBelt:250}},
  t80:{'2a46':{rounds:40},pkt:{belts:4,perBelt:250},nsvt:{belts:3,perBelt:100}},
  t80b:{'2a46':{rounds:40},pkt:{belts:4,perBelt:250},nsvt:{belts:3,perBelt:100}},
  t80bv:{'2a46':{rounds:40},pkt:{belts:4,perBelt:250},nsvt:{belts:3,perBelt:100}},
  t80u:{'2a46m1':{rounds:40},pkt:{belts:4,perBelt:250},nsvt:{belts:3,perBelt:100}},
  t80uk:{'2a46m1':{rounds:40},pkt:{belts:4,perBelt:250},nsvt:{belts:3,perBelt:100}},
  t80um:{'2a46m1':{rounds:40},pkt:{belts:4,perBelt:250},nsvt:{belts:3,perBelt:100}}
};

const VEHICLE_BELT_COST = { pkt:375, nsvt:300, kpvt:250, '2a42':1000, '2a72':800, '2a28':40, '2a70':80, '2a46':150, '2a46m1':150, '9m14':400, '9m113':400 };
const VEHICLE_BELT_ROUNDS = { pkt:250, nsvt:100, kpvt:50, '2a42':100, '2a72':100 };

const CARRIER_CAPACITY = {
  btr80:7, btr80a:7, btr82:7, btr82a:7, btr90:7,
  t80:0, t80b:0, t80bv:0, t80u:0, t80uk:0, t80um:0,
  bmp1:8, bmp1m:8, bmp2:7, bmp3:7, bmd4:5, bmp3m:7
};
window.CARRIER_CAPACITY = CARRIER_CAPACITY;

const CREW_ROLES = ['commander','gunner','driver'];
const CREW_LABELS = { commander:'車長', gunner:'炮手', driver:'駕駛' };

const VEHICLE_RANGE_M = {
  kpvt:200, pkt:200, nsvt:200,
  '2a42':300, '2a72':300, '2a28':400, '2a70':400,
  '2a46':400, '2a46m1':400,
  atgm:500, rpg:150
};

/* 需求整理三：載具武器傷害 + penMM */
const VEHICLE_WEAPON_STATS = {
  /* 机枪 */
  pkt:       { dmg: 61,   penMM: 16 },
  pkt_t46m:  { dmg: 50,   penMM: 16 },
  nsvt:      { dmg: 110,  penMM: 20 },
  nsvt_md:   { dmg: 150,  penMM: 3 },
  kpvt:      { dmg: 160,  penMM: 32 },
  kpvt_mdz:  { dmg: 220,  penMM: 4 },
  /* 30mm */
  '30mm_ap':   { dmg: 450, penMM: 40 },
  '30mm_apds': { dmg: 450, penMM: 65 },
  '30mm_hef':  { dmg: 350, penMM: 4 },
  /* 2A28 73mm */
  '2a28_heat': { dmg: 400, penMM: 300 },
  '2a28_he':   { dmg: 500, penMM: 20 },
  /* 2A70 100mm */
  '2a70_heat': { dmg: 600, penMM: 500 },
  '2a70_he':   { dmg: 700, penMM: 25 },
  /* 2A46 125mm */
  '2a46_apfsds': { dmg: 800,  penMM: 470 },
  '2a46_heat':   { dmg: 700,  penMM: 650 },
  '2a46_he':     { dmg: 1000, penMM: 30 },
};

/* rev-7part: 載具 7 部位裝甲 RHA 等效（不含 ERA，ERA 額外加成見 ERA_TYPES）
 * 部位：hullUpperFront / hullLowerFront / hullSide / hullRear / turretFront / turretSide / turretRear
 * baseKE = 對動能彈等效（mm RHA），baseHEAT = 對化學能彈等效
 * era = 掛載的 ERA 型號（null 表示無），加成查 ERA_TYPES */
const VEHICLE_ARMOR_LAYOUT = {
  /* ═══ BTR 系列（輪式，純鋼） ═══ */
  btr80: {
    hullUpperFront:{baseKE:20,baseHEAT:20,era:null}, hullLowerFront:{baseKE:12,baseHEAT:12,era:null},
    hullSide:{baseKE:12,baseHEAT:12,era:null},       hullRear:{baseKE:10,baseHEAT:10,era:null},
    turretFront:{baseKE:12,baseHEAT:12,era:null},    turretSide:{baseKE:8,baseHEAT:8,era:null},    turretRear:{baseKE:8,baseHEAT:8,era:null}
  },
  btr80a: {
    hullUpperFront:{baseKE:20,baseHEAT:20,era:null}, hullLowerFront:{baseKE:12,baseHEAT:12,era:null},
    hullSide:{baseKE:12,baseHEAT:12,era:null},       hullRear:{baseKE:10,baseHEAT:10,era:null},
    turretFront:{baseKE:14,baseHEAT:14,era:null},    turretSide:{baseKE:10,baseHEAT:10,era:null},  turretRear:{baseKE:8,baseHEAT:8,era:null}
  },
  btr82: {
    hullUpperFront:{baseKE:22,baseHEAT:22,era:null}, hullLowerFront:{baseKE:13,baseHEAT:13,era:null},
    hullSide:{baseKE:13,baseHEAT:13,era:null},       hullRear:{baseKE:11,baseHEAT:11,era:null},
    turretFront:{baseKE:15,baseHEAT:15,era:null},    turretSide:{baseKE:10,baseHEAT:10,era:null},  turretRear:{baseKE:9,baseHEAT:9,era:null}
  },
  btr82a: {
    hullUpperFront:{baseKE:22,baseHEAT:22,era:null}, hullLowerFront:{baseKE:13,baseHEAT:13,era:null},
    hullSide:{baseKE:13,baseHEAT:13,era:null},       hullRear:{baseKE:11,baseHEAT:11,era:null},
    turretFront:{baseKE:15,baseHEAT:15,era:null},    turretSide:{baseKE:10,baseHEAT:10,era:null},  turretRear:{baseKE:9,baseHEAT:9,era:null}
  },
  btr90: {
    hullUpperFront:{baseKE:33,baseHEAT:33,era:null}, hullLowerFront:{baseKE:20,baseHEAT:20,era:null},
    hullSide:{baseKE:16,baseHEAT:16,era:null},       hullRear:{baseKE:12,baseHEAT:12,era:null},
    turretFront:{baseKE:35,baseHEAT:35,era:null},    turretSide:{baseKE:25,baseHEAT:25,era:null},  turretRear:{baseKE:20,baseHEAT:20,era:null}
  },
  /* ═══ BMP 系列（履帶步戰，純鋼） ═══ */
  bmp1: {
    hullUpperFront:{baseKE:28,baseHEAT:28,era:null}, hullLowerFront:{baseKE:17,baseHEAT:17,era:null},
    hullSide:{baseKE:20,baseHEAT:20,era:null},       hullRear:{baseKE:16,baseHEAT:16,era:null},
    turretFront:{baseKE:32,baseHEAT:32,era:null},    turretSide:{baseKE:22,baseHEAT:22,era:null},  turretRear:{baseKE:18,baseHEAT:18,era:null}
  },
  bmp1m: {
    hullUpperFront:{baseKE:28,baseHEAT:28,era:null}, hullLowerFront:{baseKE:17,baseHEAT:17,era:null},
    hullSide:{baseKE:20,baseHEAT:20,era:null},       hullRear:{baseKE:16,baseHEAT:16,era:null},
    turretFront:{baseKE:34,baseHEAT:34,era:null},    turretSide:{baseKE:24,baseHEAT:24,era:null},  turretRear:{baseKE:18,baseHEAT:18,era:null}
  },
  bmp2: {
    hullUpperFront:{baseKE:28,baseHEAT:28,era:null}, hullLowerFront:{baseKE:17,baseHEAT:17,era:null},
    hullSide:{baseKE:20,baseHEAT:20,era:null},       hullRear:{baseKE:16,baseHEAT:16,era:null},
    turretFront:{baseKE:32,baseHEAT:32,era:null},    turretSide:{baseKE:22,baseHEAT:22,era:null},  turretRear:{baseKE:18,baseHEAT:18,era:null}
  },
  bmp3: {
    hullUpperFront:{baseKE:70,baseHEAT:70,era:null}, hullLowerFront:{baseKE:42,baseHEAT:42,era:null},
    hullSide:{baseKE:40,baseHEAT:40,era:null},       hullRear:{baseKE:22,baseHEAT:22,era:null},
    turretFront:{baseKE:65,baseHEAT:65,era:null},    turretSide:{baseKE:45,baseHEAT:45,era:null},  turretRear:{baseKE:30,baseHEAT:30,era:null}
  },
  bmd4: {
    hullUpperFront:{baseKE:25,baseHEAT:25,era:null}, hullLowerFront:{baseKE:15,baseHEAT:15,era:null},
    hullSide:{baseKE:18,baseHEAT:18,era:null},       hullRear:{baseKE:14,baseHEAT:14,era:null},
    turretFront:{baseKE:38,baseHEAT:38,era:null},    turretSide:{baseKE:26,baseHEAT:26,era:null},  turretRear:{baseKE:20,baseHEAT:20,era:null}
  },
  /* BMP-3M：Kaktus / 4S24 軟殼爆反（全車約 150~200 塊，增重 4.2t）。
     base 維持 BMP-3 原值 —— 4S24 無抗 KE 增益，附加鋼板抗 12.7 B-32 / 23mm / 3UBR6 已由 base 涵蓋。
     eraCoverage = 該部位掛載覆蓋率：炮塔周邊 70%、車側 62%、正面合計 36%
     （首下較完整 0.65 / 首上避開駕駛艙蓋·潛望鏡·航向機槍射界僅 0.14；
       按正面投影權重 32:24 加權回代 = 0.359）。車尾與炮塔尾為格柵，非爆反。 */
  bmp3m: {
    hullUpperFront:{baseKE:70,baseHEAT:70,era:'kaktus',eraCoverage:0.14}, hullLowerFront:{baseKE:42,baseHEAT:42,era:'kaktus',eraCoverage:0.65},
    hullSide:{baseKE:40,baseHEAT:40,era:'kaktus',eraCoverage:0.62},       hullRear:{baseKE:22,baseHEAT:22,era:null},
    turretFront:{baseKE:65,baseHEAT:65,era:'kaktus',eraCoverage:0.70},    turretSide:{baseKE:45,baseHEAT:45,era:'kaktus',eraCoverage:0.70},  turretRear:{baseKE:30,baseHEAT:30,era:null}
  },
  /* ═══ T-80 系列（複合 + ERA） ═══ */
  t80: {
    hullUpperFront:{baseKE:425,baseHEAT:475,era:null}, hullLowerFront:{baseKE:90,baseHEAT:90,era:null},
    hullSide:{baseKE:80,baseHEAT:80,era:null},         hullRear:{baseKE:45,baseHEAT:45,era:null},
    turretFront:{baseKE:395,baseHEAT:475,era:null},    turretSide:{baseKE:175,baseHEAT:175,era:null},  turretRear:{baseKE:70,baseHEAT:70,era:null}
  },
  t80b: {
    hullUpperFront:{baseKE:425,baseHEAT:475,era:null}, hullLowerFront:{baseKE:90,baseHEAT:90,era:null},
    hullSide:{baseKE:80,baseHEAT:80,era:null},         hullRear:{baseKE:45,baseHEAT:45,era:null},
    turretFront:{baseKE:395,baseHEAT:475,era:null},    turretSide:{baseKE:175,baseHEAT:175,era:null},  turretRear:{baseKE:70,baseHEAT:70,era:null}
  },
  t80bv: {
    hullUpperFront:{baseKE:425,baseHEAT:475,era:'kontakt_1'}, hullLowerFront:{baseKE:90,baseHEAT:90,era:null},
    hullSide:{baseKE:80,baseHEAT:80,era:'kontakt_1'},         hullRear:{baseKE:45,baseHEAT:45,era:null},
    turretFront:{baseKE:395,baseHEAT:475,era:'kontakt_1'},    turretSide:{baseKE:175,baseHEAT:175,era:'kontakt_1'}, turretRear:{baseKE:70,baseHEAT:70,era:null}
  },
  t80u: {
    hullUpperFront:{baseKE:515,baseHEAT:575,era:'kontakt_5'}, hullLowerFront:{baseKE:90,baseHEAT:90,era:null},
    hullSide:{baseKE:80,baseHEAT:80,era:'kontakt_5_light'},   hullRear:{baseKE:45,baseHEAT:45,era:null},
    turretFront:{baseKE:510,baseHEAT:600,era:'kontakt_5'},    turretSide:{baseKE:210,baseHEAT:225,era:'kontakt_5'}, turretRear:{baseKE:70,baseHEAT:70,era:null}
  },
  t80uk: {
    hullUpperFront:{baseKE:515,baseHEAT:575,era:'kontakt_5'}, hullLowerFront:{baseKE:90,baseHEAT:90,era:null},
    hullSide:{baseKE:80,baseHEAT:80,era:'kontakt_5_light'},   hullRear:{baseKE:45,baseHEAT:45,era:null},
    turretFront:{baseKE:510,baseHEAT:600,era:'kontakt_5'},    turretSide:{baseKE:210,baseHEAT:225,era:'kontakt_5'}, turretRear:{baseKE:70,baseHEAT:70,era:null}
  },
  t80um: {
    hullUpperFront:{baseKE:515,baseHEAT:575,era:'kontakt_5'}, hullLowerFront:{baseKE:90,baseHEAT:90,era:null},
    hullSide:{baseKE:80,baseHEAT:80,era:'kontakt_5_light'},   hullRear:{baseKE:45,baseHEAT:45,era:null},
    turretFront:{baseKE:510,baseHEAT:600,era:'kontakt_5'},    turretSide:{baseKE:210,baseHEAT:225,era:'kontakt_5'}, turretRear:{baseKE:70,baseHEAT:70,era:null}
  }
};

/* rev-veh-length: 載具半車長（世界米），供投擲/濺射落點部位判定 */
const VEHICLE_HALF_LENGTH_WORLD = {
  btr80:3.85, btr80a:3.85, btr82:3.85, btr82a:3.85, btr90:4.0,
  bmp1:3.37, bmp1m:3.37, bmp2:3.36, bmp3:3.57, bmp3m:3.57, bmd4:3.05,
  t80:3.5, t80b:3.5, t80bv:3.5, t80u:3.5, t80uk:3.5, t80um:3.5
};
window.getVehicleHalfLengthWorld = function(vid){
  return VEHICLE_HALF_LENGTH_WORLD[vid] || 3.6;
};

/* rev-veh-weapon-aim: 载具武器瞄準點 Y（米，相對目標腳底） */
const VEHICLE_WEAPON_AIM_Y = {
  pkt: 0.85, kpvt: 0.85, nsvt: 0.85,
  '2a42': 0.85, '2a72': 0.85, '2a28': 0.85, '2a70': 0.85,
  '2a46': 0.85, '2a46m1': 0.85,
  atgm: 0.85
};
window.getVehicleWeaponAimY = function(wid){
  return VEHICLE_WEAPON_AIM_Y[wid] || 0.85;
};

/* rev-veh-weapon-burst: 载具武器連發累積係數，按 (vid, wid) 分檔
 * 30mm 機炮：BMP-3/BMD-4 剛性連接 0.15；BMP-1M/BMP-2 0.20；BTR-90 0.25；BTR-80A/82A 遙控炮塔 0.30
 * 主炮（2a46/2a46m1/2a28/2a70）：單發，0
 * 機槍（pkt/kpvt/nsvt）：支架穩固，0.15 */
const VEHICLE_WEAPON_BURST = {
  btr80:  { kpvt: 0.15, pkt: 0.15 },
  btr80a: { '2a72': 0.30, pkt: 0.15 },
  btr82:  { kpvt: 0.15, pkt: 0.15 },
  btr82a: { '2a72': 0.30, pkt: 0.15 },
  btr90:  { '2a42': 0.25, pkt: 0.15 },
  bmp1:   { '2a28': 0, pkt: 0.15 },
  bmp1m:  { '2a72': 0.20, pkt: 0.15 },
  bmp2:   { '2a42': 0.20, pkt: 0.15 },
  bmp3:   { '2a70': 0, '2a72': 0.15, pkt: 0.15 },
  bmd4:   { '2a70': 0, '2a72': 0.15, pkt: 0.15 },
  bmp3m:  { '2a70': 0, '2a72': 0.15, pkt: 0.15 },
  t80:    { '2a46': 0, pkt: 0.15 },
  t80b:   { '2a46': 0, pkt: 0.15 },
  t80bv:  { '2a46': 0, pkt: 0.15 },
  t80u:   { '2a46m1': 0, pkt: 0.15 },
  t80uk:  { '2a46m1': 0, pkt: 0.15 },
  t80um:  { '2a46m1': 0, pkt: 0.15 }
};
window.getVehicleWeaponBurst = function(vid, wid){
  var row = VEHICLE_WEAPON_BURST[vid];
  if(!row) return 0.15;
  return (typeof row[wid] === 'number') ? row[wid] : 0.15;
};

/* 載具基礎命中率（百分比） */
/* rev-fix-atgm-ammo: 導彈彈藥表（與 VEHICLE_MAIN_AMMO_POOL 平級）*/
const VEHICLE_ATGM_AMMO = {
  '9m14':   { name:'9M14 嬰兒',    dmg:1000, penMM:400, speed:120, caliberMM:125, hrBonus:3,  guidanceMode:'radio', guidanceUpdateMs:500 },
  '9m113':  { name:'9M113 競賽',   dmg:1200, penMM:600, speed:200, caliberMM:120, hrBonus:8,  guidanceMode:'laser', guidanceUpdateMs:250 },
  '9m112':  { name:'9M112 眼鏡蛇', dmg:650,  penMM:600, speed:350, caliberMM:125, isGL:true, hrBonus:5,  guidanceMode:'radio', guidanceUpdateMs:500 },
  '9m119m': { name:'9M119M 殷鋼',  dmg:850,  penMM:800, speed:350, caliberMM:125, isGL:true, hrBonus:10, guidanceMode:'laser', guidanceUpdateMs:250 },
  '9m117m1':{ name:'9M117M1 阿爾坎', dmg:750, penMM:750, speed:320, caliberMM:100, isGL:true, hrBonus:8,  guidanceMode:'laser', guidanceUpdateMs:250 }
};
/* rev-gl-atgm: 每車 GL-ATGM 硬上限（不做 UI 强制，供 _stOpenMainAmmoPicker 校驗） */
const GL_ATGM_MAX_CARRY = {
  t80b:  { '9m112': 6 },   t80bv:{ '9m112': 6 },
  t80u:  { '9m119m': 6 },  t80uk:{ '9m119m': 6 }, t80um:{ '9m119m': 6 },
  bmp3:  { '9m117m1': 8 },
  bmd4:  { '9m117m1': 4 },
  bmp3m: { '9m117m1': 8 }
};
/* rev-gl-atgm: GL-ATGM 按車型的裝填時間（ms）；主炮裝填查 MUZZLE_PROFILES[wid].pauseMs */
const GL_ATGM_RELOAD_MS = {
  t80b: 7500, t80bv: 7500,
  t80u: 7500, t80uk: 7500, t80um: 7500,
  bmp3: 15000,
  bmd4: 4000,
  bmp3m: 15000
};
/* rev-fix-features: 車輛特性開關，新車只加表不改邏輯 */
const VEHICLE_FEATURES = {
  t80uk: { ainet: true,  arena: false },
  t80um: { ainet: false, arena: true, arenaAmmo: 22 }
};
/* rev-fix-era: 爆炸反應裝甲等效（對 KE / HEAT） */
/* ===== rev-height-bands: 現實高度分段（公尺，離地） =====
   h1 = 最小離地間隙（車體底緣）→ 以下判定為履帶／輪組
   h2 = 首上／首下交界（車首折角）＝ 兩板延長線交點：
        h2 = h1 + (h3-h1) × tanθ上/(tanθ上+tanθ下)，θ 為與垂直面夾角（от вертикали）
        角度來源：BTR-80 60/48、BTR-90 64/45（圖量）、T-80 68/61、
                  BMP-1/2 80/57、BMP-3 75/55、BMD-4 75/45
   h3 = 車體頂甲板／炮塔座圈平面（BTR-80 1920、BTR-82 1950、BTR-90 2280、
        T-80 系 1470、BMP-1 1630、BMP-2 1680、BMP-3 1680、BMD-4 1480）
   h4 = 炮塔頂（不含車頂武器）；null = 無獨立車頂武器 → h4 = 全高，車頂段寬 0
   全高不存此表：執行期讀 VEHICLE_REAL_HEIGHTS（渲染縮放唯一真相源）。 */
const VEHICLE_HEIGHT_BANDS = {
btr80:  { h1:0.475, h2:1.355, h3:1.920, h4:null },
btr80a: { h1:0.475, h2:1.355, h3:1.920, h4:null },
btr82:  { h1:0.475, h2:1.374, h3:1.950, h4:null },
btr82a: { h1:0.475, h2:1.374, h3:1.950, h4:null },
btr90:  { h1:0.510, h2:1.700, h3:2.280, h4:2.980 },
t80:    { h1:0.450, h2:1.040, h3:1.470, h4:2.190 },
t80b:   { h1:0.450, h2:1.040, h3:1.470, h4:2.200 },
t80bv:  { h1:0.450, h2:1.040, h3:1.470, h4:2.200 },
t80u:   { h1:0.450, h2:1.040, h3:1.470, h4:2.200 },
t80uk:  { h1:0.450, h2:1.040, h3:1.470, h4:2.200 },
t80um:  { h1:0.450, h2:1.040, h3:1.470, h4:2.200 },
bmp1:   { h1:0.370, h2:1.361, h3:1.630, h4:1.920 },
bmp1m:  { h1:0.370, h2:1.361, h3:1.630, h4:null },
bmp2:   { h1:0.420, h2:1.411, h3:1.680, h4:2.250 },
bmp3:   { h1:0.450, h2:1.340, h3:1.680, h4:null },
bmp3m:  { h1:0.450, h2:1.340, h3:1.680, h4:null },
bmd4:   { h1:0.450, h2:1.262, h3:1.480, h4:null }
};
window.VEHICLE_HEIGHT_BANDS = VEHICLE_HEIGHT_BANDS;

/* ===== rev-internal-reach: 內部部件可達部位（依實車縱向佈局） =====
   代碼：LF 首下 / UF 首上 / HS 車側 / HR 車尾 / TF 炮塔正 / TS 炮塔側 / TR 炮塔尾
   空字串 = 該車無此部件（T-80 無載員艙）。
   履帶與車頂武器不在此表：由命中段直接決定，100% 只破壞自己。
   權重仍讀 _VEHICLE_INTERNAL_WEIGHTS，此表只做遮罩後歸一化。
   要點：BTR-80/82 車長在車體前部右側；BTR-80A/82A/BMP-1M 無人炮塔 → 炮手在車體；
         BTR-90 雙人炮塔（炮手左／車長右）；BMP-1/1M 車長在駕駛後方、引擎前置右側；
         BMP-3/3M 車尾有備彈與飛彈架、引擎後置地板下；BMD-4 彈藥集中吊籃。
   限制：高度帶不含縱向，車側帶無法區分前置／後置引擎。 */
const VEHICLE_INTERNAL_REACH = {
t80:   { driver:'LF,UF,HS', gunner:'TF,TS,TR', commander:'TF,TS,TR', player:'LF,UF,HS,HR,TF,TS,TR', passenger:'', ammoRack:'LF,UF,HS,TF,TS', engine:'HR,HS', gun:'TF,TS', turret:'TF,TS,TR' },
btr80: { driver:'LF,UF,HS', gunner:'TF,TS,TR', commander:'LF,UF,HS', player:'LF,UF,HS,HR,TF,TS,TR', passenger:'LF,UF,HS,HR', ammoRack:'UF,HS,TF,TS', engine:'HR,HS', gun:'TF,TS', turret:'TF,TS,TR' },
btr80a:{ driver:'LF,UF,HS', gunner:'UF,HS',    commander:'LF,UF,HS', player:'LF,UF,HS,HR,TF,TS,TR', passenger:'LF,UF,HS,HR', ammoRack:'UF,HS,TF,TS', engine:'HR,HS', gun:'TF,TS', turret:'TF,TS,TR' },
btr90: { driver:'LF,UF,HS', gunner:'TF,TS,TR', commander:'TF,TS,TR', player:'LF,UF,HS,HR,TF,TS,TR', passenger:'LF,UF,HS,HR', ammoRack:'UF,HS,TF,TS', engine:'HR,HS', gun:'TF,TS', turret:'TF,TS,TR' },
bmp1:  { driver:'LF,UF,HS', gunner:'TF,TS,TR', commander:'LF,UF,HS', player:'LF,UF,HS,HR,TF,TS,TR', passenger:'HS,HR', ammoRack:'UF,HS,TF,TS', engine:'LF,UF,HS', gun:'TF,TS', turret:'TF,TS,TR' },
bmp1m: { driver:'LF,UF,HS', gunner:'UF,HS',    commander:'LF,UF,HS', player:'LF,UF,HS,HR,TF,TS,TR', passenger:'HS,HR', ammoRack:'UF,HS,TF,TS', engine:'LF,UF,HS', gun:'TF,TS', turret:'TF,TS,TR' },
bmp2:  { driver:'LF,UF,HS', gunner:'TF,TS,TR', commander:'TF,TS,TR', player:'LF,UF,HS,HR,TF,TS,TR', passenger:'HS,HR', ammoRack:'UF,HS,TF,TS', engine:'LF,UF,HS', gun:'TF,TS', turret:'TF,TS,TR' },
bmp3:  { driver:'LF,UF,HS', gunner:'TF,TS,TR', commander:'TF,TS,TR', player:'LF,UF,HS,HR,TF,TS,TR', passenger:'LF,UF,HS,HR', ammoRack:'UF,HS,HR,TF,TS', engine:'HR,HS', gun:'TF,TS', turret:'TF,TS,TR' },
bmd4:  { driver:'LF,UF,HS', gunner:'TF,TS,TR', commander:'TF,TS,TR', player:'LF,UF,HS,HR,TF,TS,TR', passenger:'LF,UF,HS,HR', ammoRack:'UF,HS,TF,TS', engine:'HR,HS', gun:'TF,TS', turret:'TF,TS,TR' }
};
VEHICLE_INTERNAL_REACH.t80b  = VEHICLE_INTERNAL_REACH.t80;
VEHICLE_INTERNAL_REACH.t80bv = VEHICLE_INTERNAL_REACH.t80;
VEHICLE_INTERNAL_REACH.t80u  = VEHICLE_INTERNAL_REACH.t80;
VEHICLE_INTERNAL_REACH.t80uk = VEHICLE_INTERNAL_REACH.t80;
VEHICLE_INTERNAL_REACH.t80um = VEHICLE_INTERNAL_REACH.t80;
VEHICLE_INTERNAL_REACH.btr82  = VEHICLE_INTERNAL_REACH.btr80;
VEHICLE_INTERNAL_REACH.btr82a = VEHICLE_INTERNAL_REACH.btr80a;
VEHICLE_INTERNAL_REACH.bmp3m  = VEHICLE_INTERNAL_REACH.bmp3;
window.VEHICLE_INTERNAL_REACH = VEHICLE_INTERNAL_REACH;

const ERA_TYPES = {
  kontakt_1:       { ke: 20,  heat: 300 },
  kontakt_5:       { ke: 135, heat: 525 },
  kontakt_5_light: { ke: 65,  heat: 350 },
/* Kaktus / 4S24 軟殼爆反：裝藥僅 K1 一半、飛板薄 → 無抗 KE 增益；
   heat 470 使 bmp3m 五個掛載部位 base+470 落在實測 500~550mm 區間。 */
kaktus: { ke: 0, heat: 470 }
};

/* [v206] 載具武器真實彈速（m/s） */
const VEHICLE_AMMO_SPEED_MS = {
  // 主炮
  '3bm42': 1700, '3of26': 850, '3bk29': 915,
  '3uof17': 250,
  'pg15v': 665, 'og15v': 290,
  // 机炮与机枪
  '2a42': 960, '2a72': 960,
  '30mm_ap': 960, '30mm_apds': 1120, '30mm_hef': 960,
  'kpvt': 1000, 'nsvt': 845, 'pkt': 825,
  // 导弹
  '9m14': 120, '9m113': 200,
  '9m112': 350, '9m119m': 350, '9m117m1': 320
};

const VEHICLE_BASE_HR = {
  btr80:50,btr80a:50,btr82:50,btr82a:50,btr90:50,
  bmp1:55,bmp1m:55,bmp2:55,bmp3:60,bmd4:60,bmp3m:65,
  t80:65,t80b:65,t80bv:65,t80u:65,t80uk:65,t80um:65
};

/* 主炮默認彈種配比 */
const VEHICLE_AMMO_DEFAULT_BREAKDOWN = {
  '2a46':   {'3bm42':20,'3of26':10,'3bk29':4,'9m112':6},
  '2a46m1': {'3bm42':20,'3of26':10,'3bk29':4,'9m119m':6},
  '2a70':   {'3uof17':32,'9m117m1':8},
  '2a28':   {'pg15v':25,'og15v':15}
};
/* rev-gl-atgm: BMD-4 与 BMP-3 共用 2a70，但 BMD-4 只带 4 发 GL-ATGM */
const VEHICLE_AMMO_DEFAULT_BREAKDOWN_BY_VEHICLE = {
  bmd4: { '2a70': {'3uof17':36,'9m117m1':4} }
};

/* 主炮彈種池 */
const VEHICLE_MAIN_AMMO_POOL = {
  '2a46':   [{id:'3bm42',name:'3BM42 穿甲',type:'ap'},{id:'3of26',name:'3OF26 高爆',type:'he'},{id:'3bk29',name:'3BK29 破甲',type:'heat'},{id:'9m112',name:'9M112 眼鏡蛇',type:'gl_atgm'}],
  '2a46m1': [{id:'3bm42',name:'3BM42 穿甲',type:'ap'},{id:'3of26',name:'3OF26 高爆',type:'he'},{id:'3bk29',name:'3BK29 破甲',type:'heat'},{id:'9m119m',name:'9M119M 殷鋼',type:'gl_atgm'}],
  '2a70':   [{id:'3uof17',name:'3UOF17 高爆',type:'he'},{id:'9m117m1',name:'9M117M1 阿爾坎',type:'gl_atgm'}],
  '2a28':   [{id:'pg15v',name:'PG-15V 破甲',type:'heat'},{id:'og15v',name:'OG-15V 高爆',type:'he'}]
};

function _buildLoadoutFallback(vid){
  if(typeof VEHICLES==='undefined'||!VEHICLES[vid]) return null;
  var v=VEHICLES[vid];
  var wp=(v.weapon||'').toUpperCase();
  var lo={};
  if(wp.indexOf('2A46M1')>=0) lo['2a46m1']={rounds:40};
  else if(wp.indexOf('2A46')>=0) lo['2a46']={rounds:40};
  if(wp.indexOf('2A70')>=0) lo['2a70']={rounds:40};
  if(wp.indexOf('2A28')>=0) lo['2a28']={rounds:40};
  if(wp.indexOf('2A42')>=0) lo['2a42']={belts:5,perBelt:100};
  if(wp.indexOf('2A72')>=0) lo['2a72']={belts:5,perBelt:100};
  if(wp.indexOf('KPVT')>=0) lo['kpvt']={belts:10,perBelt:50};
  if(wp.indexOf('NSVT')>=0) lo['nsvt']={belts:3,perBelt:100};
  if(wp.indexOf('PKT')>=0) lo['pkt']={belts:8,perBelt:250};
  if(wp.indexOf('ATGM')>=0||wp.indexOf('9M')>=0) lo['atgm']={rounds:2};
  return Object.keys(lo).length ? lo : null;
}

function _getLoadout(vid){
  if(typeof VEHICLE_LOADOUT!=='undefined' && VEHICLE_LOADOUT && VEHICLE_LOADOUT[vid]) return VEHICLE_LOADOUT[vid];
  var built = _buildLoadoutFallback(vid);
  if(built) return built;
  return {};
}

function vcAmmoEquivTotal(){
  var eq=0;
  for(var k in state.inventory){
    var p=k.split('@');
    if(!AMMO[p[0]])continue;
    eq+=(state.inventory[k]||0)*(RARITY_MULT[p[1]]||1);
  }
  return eq;
}

function vcConsumeAmmoEquiv(t){
  var rem=t;
  var ord=['破舊','一般','庫存','精品','傳奇'];
  for(var oi=0;oi<ord.length;oi++){
    if(rem<=0.01)break;
    var rar=ord[oi];
    var ks=[];
    for(var k in state.inventory){
      var p=k.split('@');
      if(p[1]===rar&&AMMO[p[0]])ks.push(k);
    }
    ks.sort();
    for(var ki=0;ki<ks.length;ki++){
      if(rem<=0.01)break;
      var cnt=state.inventory[ks[ki]]||0;
      if(cnt<=0)continue;
      var mult=RARITY_MULT[rar]||1;
      var use=Math.min(cnt,Math.ceil(rem/mult));
      state.inventory[ks[ki]]-=use;
      if(state.inventory[ks[ki]]<=0)delete state.inventory[ks[ki]];
      rem-=use*mult;
    }
  }
  return rem<=0.01;
}

function vcEnsureAmmo(v){
  var lo=VEHICLE_LOADOUT[v];
  if(!lo)return;
  if(!state.vehicleAmmo)state.vehicleAmmo={};
  if(!state.vehicleAmmo[v])state.vehicleAmmo[v]={};
  for(var wid in lo){
    var c=lo[wid];
    var tot=c.belts?c.belts*c.perBelt:(c.rounds||0);
    var a=state.vehicleAmmo[v][wid];
    if(!a||typeof a!=="object"){
      state.vehicleAmmo[v][wid]={current:tot,max:tot,preset:"穿燃"};
    } else {
      a.max=tot;
      if(typeof a.current!=="number")a.current=tot;
    }
  }
}

function vcEstimateCallCost(v){
  var lo=_getLoadout(v);
  if(!lo||!Object.keys(lo).length) return {full:0,have:0,diff:0};
  var full=0, have=0;
  for(var wid in lo){
    var c=lo[wid];
    var per=VEHICLE_BELT_ROUNDS[wid]||1;
    var unit;
    if(wid === 'atgm' && c.ammoId){ unit = VEHICLE_BELT_COST[c.ammoId] || 0; }
    else { unit = VEHICLE_BELT_COST[wid] || 0; }
    var a=state.vehicleAmmo&&state.vehicleAmmo[v]&&state.vehicleAmmo[v][wid];
    var fr;
    if(c.belts){ fr=c.belts*c.perBelt; }
    else if(a&&a.presetBreakdown){
      var sum=0;
      for(var k in a.presetBreakdown) sum+=(a.presetBreakdown[k]||0);
      fr=sum;
    }
    else if(a&&a.breakdown){
      var sum2=0;
      for(var k2 in a.breakdown) sum2+=(a.breakdown[k2]||0);
      fr=sum2;
    }
    else { fr=c.rounds||0; }
    full+=(fr/per)*unit;
    if(a) have+=(a.current/per)*unit;
  }
  return {full:Math.round(full), have:Math.round(have), diff:Math.round(Math.max(0,full-have))};
}

function calcPassengerMaxWeight(srv){
  if(!srv)return 0;
  var rm=RARITY_MULT[srv.rarity]||1,lv=srv.lv||1;
  var tb=(srv.talents||[]).indexOf('strongman')>=0?6:0;
  return Math.round(12*(0.5+0.5*rm)+lv*0.08+tb);
}

function calcAmmoBoxWeight(aid){
  var cal=AMMO[aid]&&AMMO[aid].cal;
  var t={'9x18':5.3,'9x19':6.3,'5.45':7.05,'7.62':10.05,'7.62x54':12.3,'9x39':10.3,'12ga':24.3,'12.7':35.8,'20/70':16.8,'23x75':41.8};
  return t[cal]||AMMOBOX_CONTAINER_WEIGHT;
}

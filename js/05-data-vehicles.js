
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
    supportDuration:42, next:[],
    researchCost:{ ammoCal:'7.62x54', ammoCount:3000, liquor:3000, exp:15000 }
  }
};

const VEHICLE_LOADOUT = {
  btr80:{kpvt:{belts:10,perBelt:50},pkt:{belts:8,perBelt:250}},
  btr80a:{'2a72':{belts:5,perBelt:100},pkt:{belts:8,perBelt:250}},
  btr82:{kpvt:{belts:10,perBelt:50},pkt:{belts:8,perBelt:250}},
  btr82a:{'2a72':{belts:5,perBelt:100},pkt:{belts:8,perBelt:250}},
  btr90:{'2a42':{belts:4,perBelt:100},pkt:{belts:6,perBelt:250},atgm:{rounds:2}},
  bmp1:{'2a28':{rounds:40},pkt:{belts:8,perBelt:250},atgm:{rounds:1}},
  bmp1m:{'2a72':{belts:5,perBelt:100},pkt:{belts:8,perBelt:250}},
  bmp2:{'2a42':{belts:5,perBelt:100},pkt:{belts:8,perBelt:250},atgm:{rounds:3}},
  bmp3:{'2a70':{rounds:40},'2a72':{belts:5,perBelt:100},pkt:{belts:8,perBelt:250}},
  bmd4:{'2a70':{rounds:40},'2a72':{belts:5,perBelt:100},pkt:{belts:8,perBelt:250}},
  t80:{'2a46':{rounds:40},pkt:{belts:4,perBelt:250},nsvt:{belts:3,perBelt:100}},
  t80b:{'2a46':{rounds:40},pkt:{belts:4,perBelt:250},nsvt:{belts:3,perBelt:100}},
  t80bv:{'2a46':{rounds:40},pkt:{belts:4,perBelt:250},nsvt:{belts:3,perBelt:100}},
  t80u:{'2a46m1':{rounds:40},pkt:{belts:4,perBelt:250},nsvt:{belts:3,perBelt:100}},
  t80uk:{'2a46m1':{rounds:40},pkt:{belts:4,perBelt:250},nsvt:{belts:3,perBelt:100}},
  t80um:{'2a46m1':{rounds:40},pkt:{belts:4,perBelt:250},nsvt:{belts:3,perBelt:100}}
};

const VEHICLE_BELT_COST = { pkt:375, nsvt:300, kpvt:250, '2a42':1000, '2a72':800, '2a28':40, '2a70':80, '2a46':150, '2a46m1':150, atgm:400 };
const VEHICLE_BELT_ROUNDS = { pkt:250, nsvt:100, kpvt:50, '2a42':100, '2a72':100 };

const CARRIER_CAPACITY = {
  btr80:7, btr80a:7, btr82:7, btr82a:7, btr90:7,
  t80:0, t80b:0, t80bv:0, t80u:0, t80uk:0, t80um:0,
  bmp1:8, bmp1m:8, bmp2:7, bmp3:7, bmd4:5
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
  /* 機槍 */
  pkt:       { dmg: 61,   penMM: 20 },
  pkt_t46m:  { dmg: 50,   penMM: 20 },
  nsvt:      { dmg: 110,  penMM: 32 },
  nsvt_md:   { dmg: 150,  penMM: 6 },
  kpvt:      { dmg: 160,  penMM: 45 },
  kpvt_mdz:  { dmg: 220,  penMM: 8 },
  /* 30mm */
  '30mm_ap':   { dmg: 450, penMM: 50 },
  '30mm_apds': { dmg: 450, penMM: 80 },
  '30mm_hef':  { dmg: 350, penMM: 10 },
  /* 2A28 73mm */
  '2a28_heat': { dmg: 400, penMM: 300 },
  '2a28_he':   { dmg: 500, penMM: 25 },
  /* 2A70 100mm */
  '2a70_heat': { dmg: 600, penMM: 500 },
  '2a70_he':   { dmg: 700, penMM: 25 },
  /* 2A46 125mm */
  '2a46_apfsds': { dmg: 800,  penMM: 600 },
  '2a46_heat':   { dmg: 700,  penMM: 650 },
  '2a46_he':     { dmg: 1000, penMM: 30 },
  /* ATGM */
  'atgm_9m14':  { dmg: 1000, penMM: 400 },
  'atgm_9m113': { dmg: 1200, penMM: 600 }
};

/* 需求整理六：HE 濺射 full/max 半徑 */
const VEHICLE_HE_SPLASH = {
  '2a28_he':  { full: 15, max: 30 },
  '2a70_he':  { full: 25, max: 50 },
  '2a46_he':  { full: 30, max: 60 }
};

/* 載具裝甲 RHA（mm） */
const VEHICLE_ARMOR_RHA = {
  btr80:{hullFront:20,turretFront:10,side:7,rear:7},
  btr80a:{hullFront:20,turretFront:23,side:10,rear:7},
  btr82:{hullFront:20,turretFront:23,side:10,rear:7},
  btr82a:{hullFront:20,turretFront:23,side:10,rear:7},
  btr90:{hullFront:30,turretFront:30,side:15,rear:10},
  bmp1:{hullFront:40,turretFront:31,side:18,rear:16},
  bmp1m:{hullFront:40,turretFront:31,side:18,rear:16},
  bmp2:{hullFront:26,turretFront:33,side:20,rear:16},
  bmp3:{hullFront:36,turretFront:50,side:25,rear:20},
  bmd4:{hullFront:50,turretFront:40,side:20,rear:20},
  t80:{hullFront:450,turretFront:500,side:80,rear:60},
  t80b:{hullFront:500,turretFront:550,side:80,rear:60},
  t80bv:{hullFront:500,turretFront:550,side:80,rear:60,era:1},
  t80u:{hullFront:600,turretFront:700,side:80,rear:60,era:2},
  t80uk:{hullFront:600,turretFront:700,side:80,rear:60,era:2},
  t80um:{hullFront:600,turretFront:700,side:80,rear:60,era:2}
};

/* 載具基礎命中率（百分比） */
const VEHICLE_BASE_HR = {
  btr80:50,btr80a:50,btr82:50,btr82a:50,btr90:50,
  bmp1:55,bmp1m:55,bmp2:55,bmp3:60,bmd4:60,
  t80:65,t80b:65,t80bv:65,t80u:65,t80uk:65,t80um:65
};

/* 主炮默認彈種配比 */
const VEHICLE_AMMO_DEFAULT_BREAKDOWN = {
  '2a46':   {'3bm42':20,'3of26':15,'3bk29':5},
  '2a46m1': {'3bm42':20,'3of26':15,'3bk29':5},
  '2a70':   {'100he':40},
  '2a28':   {'73heat':25,'73hefrag':15}
};

/* 主炮彈種池 */
const VEHICLE_MAIN_AMMO_POOL = {
  '2a46':   [{id:'3bm42',name:'3BM42 穿甲',type:'ap'},{id:'3of26',name:'3OF26 高爆',type:'he'},{id:'3bk29',name:'3BK29 破甲',type:'heat'}],
  '2a46m1': [{id:'3bm42',name:'3BM42 穿甲',type:'ap'},{id:'3of26',name:'3OF26 高爆',type:'he'},{id:'3bk29',name:'3BK29 破甲',type:'heat'}],
  '2a70':   [{id:'100he',name:'100mm HE',type:'he'}],
  '2a28':   [{id:'73heat',name:'73mm HEAT',type:'heat'},{id:'73hefrag',name:'73mm HE-FRAG',type:'he'}]
};

/* 彈鏈預設 */
const VEHICLE_BELT_PRESETS = {
  '穿燃':{name:'穿燃',desc:'穿甲燃燒彈鏈',img:'ap'},
  '高爆':{name:'高爆',desc:'高爆彈鏈',img:'he'},
  '混合':{name:'混合',desc:'穿甲 / 高爆交替',img:'mix'}
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
    var unit=VEHICLE_BELT_COST[wid]||0;
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

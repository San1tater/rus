
"use strict";
const VERSION='v17.5';
let ASSET_VERSION = localStorage.getItem('wasteland_asset_version') || '';
const ASSET_PROBE_URL = 'icons/buildings/control.png';
const ASSET_CACHE_KEY = 'wasteland_asset_version';

const EVENT_INTERVAL_MS = 10000;
const REGION_KEYS = {'廢棄工廠':'factory','廢棄實驗室':'lab','郊區公路':'road','輻射沼澤':'swamp','廢土核心':'core'};
const REGION_AMMO_WEIGHTS = {
  '廢棄工廠':{'破舊':55,'一般':30,'庫存':10,'精品':4,'傳奇':1},
  '廢棄實驗室':{'破舊':40,'一般':32,'庫存':18,'精品':8,'傳奇':2},
  '郊區公路':{'破舊':25,'一般':30,'庫存':25,'精品':15,'傳奇':5},
  '輻射沼澤':{'破舊':12,'一般':22,'庫存':28,'精品':28,'傳奇':10},
  '廢土核心':{'破舊':5,'一般':12,'庫存':22,'精品':35,'傳奇':26},
  '廢棄工廠II':{'破舊':20,'一般':25,'庫存':25,'精品':22,'傳奇':8},
  '廢棄實驗室II':{'破舊':15,'一般':22,'庫存':25,'精品':26,'傳奇':12},
  '郊區公路II':{'破舊':10,'一般':18,'庫存':24,'精品':30,'傳奇':18},
  '輻射沼澤II':{'破舊':5,'一般':12,'庫存':20,'精品':35,'傳奇':28},
  '廢土核心II':{'破舊':2,'一般':8,'庫存':15,'精品':38,'傳奇':37}
};
function rollAmmoRarity(region){const w=REGION_AMMO_WEIGHTS[region];if(!w)return null;const total=Object.values(w).reduce((a,b)=>a+b,0);let r=Math.random()*total;for(const rar in w){r-=w[rar];if(r<=0)return rar;}return '一般';}
function rollRegionDrop(region){const R=REGIONS[region];if(!R)return null;const lid=pick(R.loot);if(SEEDS[lid]){return {id:lid,rarity:rollRarity()};}const def=itemDef(lid);if(!def)return null;if(AMMO[lid]){const pool=R.loot.filter(id=>AMMO[id]);const rar=rollAmmoRarity(region);if(rar){const filtered=pool.filter(id=>AMMO[id].rarity===rar);if(filtered.length)return{id:pick(filtered),rarity:rar};}return{id:lid,rarity:AMMO[lid].rarity};}const rar=hasVariableRarity(lid)?rollRarity():def.rarity;return{id:lid,rarity:rar};}

const RARITY_ORDER=['破舊','一般','庫存','精品','傳奇','具名'];
const UI_RARITY_LIST=['破舊','一般','庫存','精品','傳奇'];
const RARITY_MULT={'破舊':0.8,'一般':1.0,'庫存':1.5,'精品':2.5,'傳奇':5.0,'具名':5.0};
const RARITY_ICON={'破舊':'▪','一般':'▫','庫存':'◆','精品':'★','傳奇':'✦','具名':'✦'};
const RARITY_BG={'破舊':'#4a2e1a','一般':'#3a3a3a','庫存':'#1e4a1e','精品':'#1e3a5a','傳奇':'#5a4410','具名':'#4a205a'};
const MODE_ACCURACY={'點射':1.6,'短點射':1.25,'長點射':1.0,'掃射':0.65,'近戰':1.0,'投擲':1.0};
const MAX_PROF_LEVEL=50;
const MAX_PROF_RAW=999999;
const MELEE_DURATION=2;
const CHAR_HEIGHT_FACTOR = 0.58;
const CHAR_HEIGHT_FACTOR_BATTLE = 0.667;
const EXPLORE_HERO_X_RATIO = 0.25;
const BATTLE_GROUND_TOP_RATIO = 1.0;
const BATTLE_BOSS_HEIGHT_RATIO = 0.75;
const BATTLE_HERO_SPRITE_H = 118;
const BATTLE_HERO_FOOT_Y_RATIO = 0.95;
const BOSS_MIN_GAP = 0.12;

const TK_MAG={aks74u:30,aks74un:30,ak74:30,ak74n:30,ak74m:30,akm:30,akms:30,akmn:30,ak103:30,ak104:30,ak105:30,ak12:30,asval:20,'9a91':20,sr3m:30,vss:10,svd:10,sv98:10,rpk16:95,rpd:100,pkm:100,pkp:100,ash12:20,pp19:30,pm:8,pb:8,mp443:17,aps:20,mp133:6,mp153:7,mp155:6,saiga12:8,toz106:2,ks23:3};

function armorClass(level){if(!level||level<=0)return '';const lv=Math.min(6,Math.max(1,Math.floor(level)));return ['','I','II','III','IV','V','VI'][lv]||'';}
function getHelmetTotalLevel(id){const def=ARMOR[id];if(!def||def.slot!=='head')return 0;if(def.subArmor&&def.subArmor.length){let s=0;for(const el of def.subArmor)s+=(el.level||0);return s;}return def.level||0;}
function getPlayerArmorLevel(){const headId=state.player.equipped.head;const topId=state.player.equipped.top;const hl=headId?getHelmetTotalLevel(headId):0;const tl=topId?((ARMOR[topId]&&ARMOR[topId].level)||0):0;return Math.round((hl+tl)/3);}

const ARMOR={
  ssh68:{name:'SSh-68 頭盔',slot:'head',armor:30,level:2},
  ssh68m:{name:'SSh-68M 頭盔',slot:'head',armor:30,level:2},
  ssh94:{name:'SSh-94 頭盔',slot:'head',armor:40,level:3},
  kolpak:{name:'Kolpak-1S 頭盔',slot:'head',armor:20,level:1},
  '6b47':{name:'6B47 頭盔',slot:'head',armor:30,level:3},
  '6b47m':{name:'6B47M 頭盔',slot:'head',armor:30,level:3},
  altyn:{name:'Altyn 頭盔',slot:'head',armor:100,level:5,subArmor:[{level:5},{level:5}]},
  kiver:{name:'Kiver-M 頭盔',slot:'head',armor:60,level:3,subArmor:[{level:3},{level:3}]},
  maska:{name:'Maska-1SCh 頭盔',slot:'head',armor:100,level:4,subArmor:[{level:4},{level:6}]},
  zsh12m:{name:'ZSh-1-2M 頭盔',slot:'head',armor:70,level:4,subArmor:[{level:4},{level:3}]},
  balaclava:{name:'巴拉克拉法面罩',slot:'face',armor:5,level:1},
  shemagh:{name:'阿拉伯方巾',slot:'face',armor:5,level:1},
  gp7:{name:'GP-7 防毒面具',slot:'face',armor:5,level:1},
  ballglasses:{name:'彈道眼鏡',slot:'face',armor:10,level:1},
  paca:{name:'PACA 軟甲',slot:'top',armor:30,level:3},
  '6b13':{name:'6B13 防彈衣',slot:'top',armor:60,level:4},
  '6b13m':{name:'6B13-M 防彈衣',slot:'top',armor:54,level:4},
  '6b23':{name:'6B23 防彈衣',slot:'top',armor:30,level:4},
  '6b231':{name:'6B23-1 防彈衣',slot:'top',armor:45,level:4},
  '6b232':{name:'6B23-2 防彈衣',slot:'top',armor:60,level:5},
  '6b43':{name:'6B43 防彈衣',slot:'top',armor:108,level:6,armored:true},
  zhuk6a:{name:'Zhuk-6a 防彈衣',slot:'top',armor:90,level:6},
  zhuk3:{name:'Zhuk-3 防彈衣',slot:'top',armor:45,level:3},
  defender2:{name:'Defender 2 防彈衣',slot:'top',armor:90,level:5},
  cargopants:{name:'工裝褲',slot:'pants',armor:10,level:1},
  workboots:{name:'工作靴',slot:'shoes',armor:5,level:1},
  tactboots:{name:'戰術靴',slot:'shoes',armor:5,level:1},
  lowaz:{name:'Lowa Zephyr',slot:'shoes',armor:5,level:1},
  haix:{name:'Haix 軍靴',slot:'shoes',armor:5,level:1},
  belleville:{name:'Belleville 軍靴',slot:'shoes',armor:5,level:1},
  '6b45':{name:'6B45 防彈衣',slot:'top',armor:90,level:6},
  redutm:{name:'Redut-M 防彈衣',slot:'top',armor:75,level:5},
  bplarge:{name:'探險背包',slot:'backpack',armor:0,fixed:true},
};

const WEAPONS={
  aks74u:{name:'AKS-74U',slot:'primary',type:'突擊步槍',cal:'5.45',mag:TK_MAG.aks74u,modes:['掃射','長點射','短點射','點射'],rpm:650,range:0.55},
  aks74un:{name:'AKS-74UN',slot:'primary',type:'突擊步槍',cal:'5.45',mag:TK_MAG.aks74un,modes:['掃射','長點射','短點射','點射'],rpm:650,range:0.55},
  ak74:{name:'AK-74',slot:'primary',type:'突擊步槍',cal:'5.45',mag:TK_MAG.ak74,modes:['掃射','長點射','短點射','點射'],rpm:650,range:0.65},
  ak74n:{name:'AK-74N',slot:'primary',type:'突擊步槍',cal:'5.45',mag:TK_MAG.ak74n,modes:['掃射','長點射','短點射','點射'],rpm:650,range:0.65},
  ak74m:{name:'AK-74M',slot:'primary',type:'突擊步槍',cal:'5.45',mag:TK_MAG.ak74m,modes:['掃射','長點射','短點射','點射'],rpm:650,range:0.65},
  akm:{name:'AKM',slot:'primary',type:'突擊步槍',cal:'7.62',mag:TK_MAG.akm,modes:['掃射','長點射','短點射','點射'],rpm:600,range:0.65},
  akms:{name:'AKMS',slot:'primary',type:'突擊步槍',cal:'7.62',mag:TK_MAG.akms,modes:['掃射','長點射','短點射','點射'],rpm:600,range:0.6},
  akmn:{name:'AKMN',slot:'primary',type:'突擊步槍',cal:'7.62',mag:TK_MAG.akmn,modes:['掃射','長點射','短點射','點射'],rpm:600,range:0.65},
  ak103:{name:'AK-103',slot:'primary',type:'突擊步槍',cal:'7.62',mag:TK_MAG.ak103,modes:['掃射','長點射','短點射','點射'],rpm:600,range:0.65},
  ak104:{name:'AK-104',slot:'primary',type:'突擊步槍',cal:'7.62',mag:TK_MAG.ak104,modes:['掃射','長點射','短點射','點射'],rpm:600,range:0.6},
  ak105:{name:'AK-105',slot:'primary',type:'突擊步槍',cal:'5.45',mag:TK_MAG.ak105,modes:['掃射','長點射','短點射','點射'],rpm:650,range:0.55},
  ak12:{name:'AK-12',slot:'primary',type:'突擊步槍',cal:'5.45',mag:TK_MAG.ak12,modes:['掃射','長點射','短點射','點射'],rpm:700,range:0.65},
  asval:{name:'AS VAL',slot:'primary',type:'突擊步槍',cal:'9x39',mag:TK_MAG.asval,modes:['掃射','長點射','短點射','點射'],rpm:900,range:0.5},
  '9a91':{name:'9A-91',slot:'primary',type:'突擊步槍',cal:'9x39',mag:TK_MAG['9a91'],modes:['掃射','長點射','短點射','點射'],rpm:700,range:0.5},
  sr3m:{name:'SR-3M',slot:'primary',type:'突擊步槍',cal:'9x39',mag:TK_MAG.sr3m,modes:['掃射','長點射','短點射','點射'],rpm:900,range:0.5},
  vss:{name:'VSS Vintorez',slot:'primary',type:'狙擊槍',cal:'9x39',mag:TK_MAG.vss,modes:['掃射','長點射','短點射','點射'],rpm:900,range:0.55},
  svd:{name:'SVD',slot:'primary',type:'狙擊槍',cal:'7.62x54',mag:TK_MAG.svd,modes:['點射'],rpm:700,range:0.9},
  sv98:{name:'SV-98',slot:'primary',type:'狙擊槍',cal:'7.62x54',mag:TK_MAG.sv98,modes:['點射'],rpm:30,range:0.95},
  rpk16:{name:'RPK-16',slot:'primary',type:'機槍',cal:'5.45',mag:TK_MAG.rpk16,modes:['掃射','長點射','短點射','點射'],rpm:650,range:0.65},
  rpd:{name:'RPD',slot:'primary',type:'機槍',cal:'7.62',mag:TK_MAG.rpd,modes:['掃射','長點射','短點射'],rpm:700,range:0.7},
rpdn:{name:'RPDN',slot:'primary',type:'機槍',cal:'7.62',mag:TK_MAG.rpd,modes:['掃射','長點射','短點射'],rpm:700,range:0.7},
  pkm:{name:'PKM',slot:'primary',type:'機槍',cal:'7.62x54',mag:TK_MAG.pkm,modes:['掃射','長點射','短點射'],rpm:650,range:0.7},
  pkp:{name:'PKP Pecheneg',slot:'primary',type:'機槍',cal:'7.62x54',mag:TK_MAG.pkp,modes:['掃射','長點射','短點射'],rpm:650,range:0.7},
  ash12:{name:'ASH-12',slot:'primary',type:'突擊步槍',cal:'12.7',mag:10,modes:['掃射','點射'],rpm:650,range:0.6},
  pp19:{name:'PP-19-01 Vityaz',slot:'primary',type:'衝鋒槍',cal:'9x19',mag:TK_MAG.pp19,modes:['掃射','長點射','短點射','點射'],rpm:700,range:0.45},
  pm:{name:'PM 手槍',slot:'secondary',type:'手槍',cal:'9x18',mag:TK_MAG.pm,modes:['點射'],rpm:120,range:0.35},
  pb:{name:'PB 微聲手槍',slot:'secondary',type:'手槍',cal:'9x18',mag:TK_MAG.pb,modes:['點射'],rpm:120,range:0.35},
  mp443:{name:'MP-443 Grach',slot:'secondary',type:'手槍',cal:'9x18',mag:TK_MAG.mp443,modes:['點射'],rpm:120,range:0.4},
  aps:{name:'APS 斯捷奇金',slot:'secondary',type:'手槍',cal:'9x18',mag:TK_MAG.aps,modes:['掃射','長點射','短點射','點射'],rpm:750,range:0.35},
  mp133:{name:'MP-133 霰彈槍',slot:'secondary',type:'霰彈槍',cal:'12ga',mag:TK_MAG.mp133,modes:['點射'],rpm:30,range:0.4},
  mp153:{name:'MP-153 霰彈槍',slot:'secondary',type:'霰彈槍',cal:'12ga',mag:TK_MAG.mp153,modes:['點射'],rpm:70,range:0.42},
  mp155:{name:'MP-155 霰彈槍',slot:'secondary',type:'霰彈槍',cal:'12ga',mag:TK_MAG.mp155,modes:['點射'],rpm:70,range:0.4},
  saiga12:{name:'Saiga-12',slot:'secondary',type:'霰彈槍',cal:'12ga',mag:5,modes:['掃射','點射'],rpm:450,range:0.45},
  toz106:{name:'TOZ-106',slot:'secondary',type:'霰彈槍',cal:'20/70',mag:TK_MAG.toz106,modes:['點射'],rpm:30,range:0.35},
  ks23:{name:'KS-23',slot:'secondary',type:'霰彈槍',cal:'23x75',mag:TK_MAG.ks23,modes:['點射'],rpm:30,range:0.45},
  '6kh2':{name:'6Kh2 刺刀',slot:'melee',type:'刺刀',dmg:25,pen:1,modes:['近戰'],rpm:120,range:0.15},
  '6kh5':{name:'6Kh5 刺刀',slot:'melee',type:'刺刀',dmg:26,pen:1,modes:['近戰'],rpm:120,range:0.15},
  kukri:{name:'Kukri 彎刀',slot:'melee',type:'刀',dmg:32,pen:1,modes:['近戰'],rpm:100,range:0.18},
  f1:{name:'F-1 手榴彈',slot:'throwable',type:'手榴彈',dmg:80,pen:6,modes:['投擲'],rpm:60,range:0.6,explosive:true},
  rgd5:{name:'RGD-5 手榴彈',slot:'throwable',type:'手榴彈',dmg:60,pen:6,modes:['投擲'],rpm:60,range:0.5,explosive:true},
  rgo:{name:'RGO 手榴彈',slot:'throwable',type:'手榴彈',dmg:100,pen:6,modes:['投擲'],rpm:60,range:0.6,explosive:true},
  rgn:{name:'RGN 手榴彈',slot:'throwable',type:'手榴彈',dmg:90,pen:6,modes:['投擲'],rpm:60,range:0.6,explosive:true},
  vog17:{name:'VOG-17 手榴彈',slot:'throwable',type:'手榴彈',dmg:75,pen:6,modes:['投擲'],rpm:60,range:0.55,explosive:true},
  vog25:{name:'VOG-25 手榴彈',slot:'throwable',type:'手榴彈',dmg:78,pen:6,modes:['投擲'],rpm:60,range:0.55,explosive:true},
};

const AMMO={
  '9x18_pst':{name:'9×18mm PSt',cal:'9x18',dmg:50,pen:2,rarity:'破舊'},
  '9x18_ps':{name:'9×18mm PS',cal:'9x18',dmg:55,pen:2,rarity:'一般'},
  '9x18_pmm':{name:'9×18mm PMM',cal:'9x18',dmg:58,pen:2,rarity:'庫存'},
  '9x18_psv':{name:'9×18mm PSV',cal:'9x18',dmg:69,pen:2,rarity:'精品'},
  '9x18_sp7':{name:'9×18mm SP7',cal:'9x18',dmg:77,pen:1,rarity:'傳奇'},
  '9x19_pbp':{name:'9×19mm PBP',cal:'9x19',dmg:44,pen:4,rarity:'破舊'},
  '9x19_ap63':{name:'9×19mm AP 6.3',cal:'9x19',dmg:52,pen:3,rarity:'一般'},
  '9x19_pst':{name:'9×19mm PSt',cal:'9x19',dmg:54,pen:2,rarity:'庫存'},
  '9x19_pso':{name:'9×19mm PSO',cal:'9x19',dmg:59,pen:2,rarity:'精品'},
  '9x19_cci':{name:'9×19mm Luger CCI',cal:'9x19',dmg:70,pen:2,rarity:'傳奇'},
  '5.45_hp':{name:'5.45×39mm HP',cal:'5.45',dmg:73,pen:2,rarity:'破舊'},
  '5.45_ps':{name:'5.45×39mm PS',cal:'5.45',dmg:56,pen:3,rarity:'一般'},
  '5.45_bt':{name:'5.45×39mm BT',cal:'5.45',dmg:44,pen:4,rarity:'庫存'},
  '5.45_bp':{name:'5.45×39mm BP',cal:'5.45',dmg:48,pen:5,rarity:'精品'},
  '5.45_7n39':{name:'5.45×39mm 7N39',cal:'5.45',dmg:37,pen:6,rarity:'傳奇'},
  '7.62_hp':{name:'7.62×39mm HP',cal:'7.62',dmg:80,pen:2,rarity:'破舊'},
  '7.62_fmj':{name:'7.62×39mm FMJ',cal:'7.62',dmg:63,pen:3,rarity:'一般'},
  '7.62_ps':{name:'7.62×39mm PS',cal:'7.62',dmg:61,pen:4,rarity:'庫存'},
  '7.62_bp':{name:'7.62×39mm BP',cal:'7.62',dmg:58,pen:5,rarity:'精品'},
  '7.62_ma':{name:'7.62×39mm MAI AP',cal:'7.62',dmg:53,pen:6,rarity:'傳奇'},
  '7.62x54_hp':{name:'7.62×54mmR HP BT',cal:'7.62x54',dmg:102,pen:3,rarity:'破舊'},
  '7.62x54_fmj':{name:'7.62×54mmR FMJ',cal:'7.62x54',dmg:84,pen:4,rarity:'一般'},
  '7.62x54_ps':{name:'7.62×54mmR PS',cal:'7.62x54',dmg:84,pen:5,rarity:'庫存'},
  '7.62x54_bt':{name:'7.62×54mmR BT',cal:'7.62x54',dmg:78,pen:6,rarity:'精品'},
  '7.62x54_bs':{name:'7.62×54mmR BS',cal:'7.62x54',dmg:72,pen:7,rarity:'傳奇'},
  '9x39_fmj':{name:'9×39mm FMJ',cal:'9x39',dmg:75,pen:2,rarity:'破舊'},
  '9x39_sp5':{name:'9×39mm SP-5',cal:'9x39',dmg:71,pen:3,rarity:'一般'},
  '9x39_pab9':{name:'9×39mm PAB-9',cal:'9x39',dmg:62,pen:4,rarity:'庫存'},
  '9x39_spp':{name:'9×39mm SPP',cal:'9x39',dmg:68,pen:4,rarity:'精品'},
  '9x39_sp6':{name:'9×39mm SP-6',cal:'9x39',dmg:60,pen:5,rarity:'傳奇'},
  '12ga_buck':{name:'12/70 5.25mm 鹿彈',cal:'12ga',dmg:37,pen:1,rarity:'破舊',pellets:8},
  '12ga_7mm':{name:'12/70 7mm 鹿彈',cal:'12ga',dmg:39,pen:2,rarity:'一般',pellets:8},
  '12ga_express':{name:'12/70 6.5mm Express',cal:'12ga',dmg:35,pen:2,rarity:'庫存',pellets:9},
  '12ga_magnum':{name:'12/70 8.5mm Magnum',cal:'12ga',dmg:50,pen:2,rarity:'傳奇',pellets:8},
  '12.7_ps12':{name:'12.7×55mm PS12',cal:'12.7',dmg:115,pen:3,rarity:'庫存',pellets:1},
  '12.7_ps12b':{name:'12.7×55mm PS12B',cal:'12.7',dmg:102,pen:5,rarity:'傳奇',pellets:1},
  '23x75_shrapnel25':{name:'23×75mmR Shrapnel-25',cal:'23x75',dmg:78,pen:1,rarity:'庫存',pellets:8},
  '9x18_pbm_gzh':{name:'9×18mm PM PBM gzh',cal:'9x18',dmg:40,pen:3,rarity:'傳奇'},
  '12.7_ps12a':{name:'12.7×55mm PS12A',cal:'12.7',dmg:165,pen:1,rarity:'傳奇',pellets:1},
  '23x75_shrapnel10_legend':{name:'23×75mmR Shrapnel-10',cal:'23x75',dmg:87,pen:1,rarity:'傳奇',pellets:8},
  '20x70_5.6':{name:'20/70 5.6mm Buckshot',cal:'20/70',dmg:26,pen:1,rarity:'破舊',pellets:8},
  '20x70_6.2':{name:'20/70 6.2mm Buckshot',cal:'20/70',dmg:22,pen:2,rarity:'一般',pellets:8},
  '20x70_7.3':{name:'20/70 7.3mm Buckshot',cal:'20/70',dmg:23,pen:3,rarity:'庫存',pellets:9},
  '20x70_7.5':{name:'20/70 7.5mm Buckshot',cal:'20/70',dmg:25,pen:3,rarity:'精品',pellets:8},
  '20x70_devastator':{name:'20/70 Devastator',cal:'20/70',dmg:198,pen:3,rarity:'傳奇',pellets:1},
  '23x75_shrapnel10':{name:'23×75mmR Shrapnel-10',cal:'23x75',dmg:87,pen:1,rarity:'精品',pellets:8},
  '23x75_barrikada':{name:'23×75mmR Barrikada',cal:'23x75',dmg:192,pen:4,rarity:'傳奇',pellets:1},
};

const CONSUMABLES={bandage:{name:'繃帶',heal:25,healPct:0.10},water:{name:'瓶裝水',heal:15,healPct:0.05},painkiller:{name:'止痛藥',heal:20,healPct:0.08},splint:{name:'夾板',heal:20,healPct:0.08},tushonka:{name:'燉肉罐頭',heal:30,healPct:0.12},ai2:{name:'AI-2 急救包',heal:70,healPct:0.25},ifak:{name:'IFAK 急救包',heal:120,healPct:0.35},salewa:{name:'Salewa 急救包',heal:180,healPct:0.50},surv12:{name:'Surv12 野戰包',heal:250,healPct:0.70}};
/* rev93: 消耗品治療量 = (固定值 + maxHp 百分比) × 稀有度 × 醫療站加成 */
function calcConsumableHeal(item, medbayLv){
  if(!item || !item.id) return 0;
  const c = CONSUMABLES[item.id];
  if(!c) return 0;
  const rarityMult = RARITY_MULT[item.rarity] || 1;
  const maxHp = state.player.maxHp || 100;
  const base = (c.heal || 0) + (c.healPct || 0) * maxHp;
  const medbayMult = 1 + (medbayLv || 0) * 0.03;
  return Math.round(base * rarityMult * medbayMult);
}
/* ===== rev130: 後院種子與作物 ===== */
const SEEDS = {
  seed_potato: { name:'馬鈴薯種子', cropId:'crop_potato', growMs:1200000, baseYield:3, rotMs:1800000, autoCleanMs:600000, cleanupMs:5000, img:'seed_potato' },
  seed_carrot: { name:'胡蘿蔔種子', cropId:'crop_carrot', growMs:2100000, baseYield:2, rotMs:1800000, autoCleanMs:600000, cleanupMs:5000, img:'seed_carrot' },
  seed_cabbage:{ name:'捲心菜種子', cropId:'crop_cabbage',growMs:1500000, baseYield:2, rotMs:1800000, autoCleanMs:600000, cleanupMs:5000, img:'seed_cabbage' },
  seed_beet:   { name:'甜菜種子',   cropId:'crop_beet',   growMs:1800000, baseYield:3, rotMs:1800000, autoCleanMs:600000, cleanupMs:5000, img:'seed_beet' },
  seed_wheat:  { name:'小麥種子',   cropId:'crop_wheat',  growMs:2700000, baseYield:4, rotMs:1800000, autoCleanMs:600000, cleanupMs:5000, img:'seed_wheat' }
};
const CROP_BASE_FOOD = {
  crop_potato: 2,
  crop_carrot: 3,
  crop_cabbage: 3,
  crop_beet: 4,
  crop_wheat: 5
};
function cropFoodValue(cropId, rarity){
  const base = CROP_BASE_FOOD[cropId] || 1;
  const mult = RARITY_MULT[rarity] || 1;
  return Math.max(1, Math.round(base * mult));
}
const CROPS = {
  crop_potato: { name:'馬鈴薯', icon:'🥔', img:'crop_potato' },
  crop_carrot: { name:'胡蘿蔔', icon:'🥕', img:'crop_carrot' },
  crop_cabbage:{ name:'捲心菜', icon:'🥬', img:'crop_cabbage' },
  crop_beet:   { name:'甜菜',   icon:'🍠', img:'crop_beet' },
  crop_wheat:  { name:'小麥',   icon:'🌾', img:'crop_wheat' }
};
/* ===== end rev130 ===== */
const MATERIALS={wood:{name:'木材'},metal:{name:'金屬廢料'},screws:{name:'螺絲'},cloth:{name:'布料'},gears:{name:'齒輪'},electronics:{name:'電子零件'}};

const MATERIAL_EMOJI = {wood:'🪵', metal:'🔩', screws:'🔧', cloth:'🧵', gears:'⚙️', electronics:'💡'};

/* ★ v17.5 重量系統（kg）——武器為空槍重，實戰時再加上滿彈匣彈藥重量 */
const ITEM_WEIGHT = {
  aks74u:2.694,aks74un:2.735,ak74:3.3,ak74n:3.3,ak74m:3.605,akm:3.495,akms:3.495,akmn:3.495,
  ak103:3.605,ak104:3.605,ak105:3.2,ak12:3.606,asval:2.5,'9a91':2.452,sr3m:2.5,
  vss:2.6,svd:4.386,sv98:5.188,
  rpk16:3.017,rpd:7.4,rpdn:7.4,pkm:8.994,pkp:8.2,
  ash12:6.17,pp19:2.858,
  pm:0.73,pb:0.952,mp443:0.95,aps:1.021,
  mp133:3.54,mp153:3.6,mp155:3.4,saiga12:5.659,toz106:2.715,ks23:3.76,
  '6kh2':0.4,'6kh5':0.4,kukri:0.5,
  f1:0.6,rgd5:0.5,rgo:0.53,rgn:0.53,vog17:0.35,vog25:0.28,
  ssh68:1.5,ssh68m:1.5,ssh94:3.5,kolpak:1.9,'6b47':1.3,'6b47m':1.3,altyn:2.5,kiver:1.2,maska:2.6,zsh12m:3.7,
  balaclava:0.1,shemagh:0.15,gp7:0.5,ballglasses:0.1,
  paca:3.5,'6b13':10.6,'6b13m':9.15,'6b23':7.9,'6b231':7.9,'6b232':10.5,'6b43':20,zhuk6a:11.5,zhuk3:5.2,defender2:11.5,'6b45':13.5,redutm:9.5,
  cargopants:0.4,workboots:0.6,tactboots:0.7,lowaz:0.8,haix:0.75,belleville:0.8,
  bplarge:1.6,
  bandage:0.05,water:0.6,ai2:0.2,painkiller:0.1,tushonka:0.5,splint:0.1,salewa:1.0,ifak:0.5,surv12:1.5,
  wood:1.5,metal:2.5,screws:0.05,cloth:0.5,gears:0.3,electronics:0.4,
};
/* 每發彈藥重量（kg） */
const AMMO_UNIT_WEIGHT = {
  '9x18':0.007,'9x19':0.009,'5.45':0.0105,'7.62':0.0165,'7.62x54':0.021,
  '9x39':0.017,'12ga':0.045,'12.7':0.068,'20/70':0.030,'23x75':0.08
};
const PANTS_SHOES_EMOJI = {
  cargopants:'👖',
  workboots:'🥾', tactboots:'🥾', lowaz:'🥾', haix:'🥾', belleville:'🥾',
};
const AMMO_ICON_BY_CAL = {
  '9x18':'918.png', '9x19':'919.png', '5.45':'545.png',
  '7.62':'76239.png', '7.62x54':'76254.png', '9x39':'939.png',
  '12ga':'12ga.png', '12.7':'12755.png',
  '23x75':'2375.png',
  '20/70':'2070.png'
};

const WEAPON_MOD_RULES={
  aks74u:{mags:[45,60],scopes:[]},aks74un:{mags:[45,60],scopes:['1P87','EKP-8-02','PK-06']},
  ak74:{mags:[45,60,95],scopes:['1P87','PSO-1','EKP-8-02','PK-06']},
  ak74n:{mags:[45,60,95],scopes:['1P87','PSO-1','EKP-8-02','PK-06']},ak74m:{mags:[45,60,95],scopes:['1P87','PSO-1','EKP-8-02','PK-06']},
  akm:{mags:[45,75],scopes:[]},akms:{mags:[45,75],scopes:[]},akmn:{mags:[45,75],scopes:['1P87','PSO-1','PK-06']},
  ak103:{mags:[45,75],scopes:['1P87','PSO-1','PK-06']},ak104:{mags:[45,75],scopes:['1P87','PSO-1','PK-06']},
  ak105:{mags:[45,60],scopes:['1P87','PSO-1']},ak12:{mags:[45,60,95],scopes:['1P87','PSO-1']},
  asval:{mags:[30],scopes:['PSO-1','1P87']},'9a91':{mags:[],scopes:['PSO-1']},sr3m:{mags:[],scopes:['1P87']},
  vss:{mags:[20,30],scopes:['PSO-1']},svd:{mags:[15,20],scopes:['PSO-1']},sv98:{mags:[],scopes:['1P59']},
  rpk16:{mags:[95],scopes:['1P87','PSO-1']},rpd:{mags:[],scopes:[]},
  rpdn:{mags:[],scopes:['PSO-1']},
  pkm:{mags:[200],scopes:[]},
  pkp:{mags:[200],scopes:['1P87','PSO-1']},ash12:{mags:[10,20],scopes:['1P87']},pp19:{mags:[],scopes:['1P87','PK-06']},
  pm:{mags:[8],scopes:[]},pb:{mags:[8],scopes:[]},mp443:{mags:[18],scopes:[]},aps:{mags:[30],scopes:[]},saiga12:{mags:[5,8,10,20],scopes:[]},
};
const SCOPE_BONUS={'1P87':5,'PSO-1':8,'EKP-8-02':4,'PK-06':6,'1P59':12};
const SCOPE_NAME={'1P87':'1P87 全息','PSO-1':'PSO-1 光學','EKP-8-02':'EKP-8-02 紅點','PK-06':'PK-06 紅點','1P59':'1P59 Hyperion 高倍鏡'};

/* ===== rev145: 僕人定義 ===== */
const SERVANT_TYPES = {
  farmer:  { name:'農民', targetPlot:'soil' },
  guard:   { name:'守衛', targetPlot:'tower' },
  foreman: { name:'監工', targetPlot:'shed' }
};
const SERVANT_RARITY_SLOTS = { '破舊':1, '一般':2, '庫存':4, '精品':6, '傳奇':10, '具名':10 };
const SERVANT_MAX_LV = 50;
function servantMaxStamina(srv){
  if(!srv) return 100;
  const mult = RARITY_MULT[srv.rarity] || 1;
  const lvBonus = 1 + ((srv.lv || 1) - 1) * 0.1;
  return Math.round(100 * mult * lvBonus);
}
const FOOD_POLICY_MULT = {
  full: 1.2,
  normal: 0.7,
  half: 0.5,
  lick: 0.3,
  starve: 0.0
};
function servantMaxHp(srv){
  if(!srv) return 100;
  const base = 1 + 0.10883;
  return Math.round(100 * Math.pow(base, (srv.lv || 1) - 1));
}
function servantHitRate(srv, mode, scopeBonus){
  if(!srv) return 5;
  const base = 10;
  const p = (srv.lv || 1) - 1;
  const acc = (typeof MODE_ACCURACY !== 'undefined' && MODE_ACCURACY[mode]) ? MODE_ACCURACY[mode] : 1;
  return Math.max(5, Math.min(95, Math.round((base + p) * acc + (scopeBonus || 0))));
}
function servantCritRate(wRarity, aRarity){
  const wr = (RARITY_MULT && RARITY_MULT[wRarity]) || 1;
  const ar = (RARITY_MULT && RARITY_MULT[aRarity]) || 1;
  return Math.max(0, Math.min(0.85, Math.round(10 * wr * ar) / 100));
}
function servantCritMult(wRarity, aRarity){
  const wr = (RARITY_MULT && RARITY_MULT[wRarity]) || 1;
  const ar = (RARITY_MULT && RARITY_MULT[aRarity]) || 1;
  return 1.5 * wr * ar;
}
function servantEffectiveMaxStamina(srv){
  if(!srv) return 100;
  if(srv._starve) return 0;
  const base = servantMaxStamina(srv);
  const mult = FOOD_POLICY_MULT[srv.foodPolicy || 'normal'];
  if(mult == null) return base;
  return Math.round(base * mult);
}
function servantDef(type){ return SERVANT_TYPES[type] || null; }
function servantSlots(rarity, type){ if(type === 'guard' || type === 'foreman') return 1; return SERVANT_RARITY_SLOTS[rarity] || 1; }
/* ===== end rev145 ===== */

/* ===== rev301: 传奇池 ===== */
const LEGEND_AMMO_POOL = [
  '5.45_7n39','7.62_ma','7.62x54_bs','9x39_sp6','9x18_sp7',
  '9x19_cci','12ga_magnum','12.7_ps12b','20x70_devastator','23x75_barrikada'
];
const LEGEND_THROW_POOL = ["f1","rgd5","rgo","rgn","vog17","vog25"];
/* ===== end rev301 ===== */

const ALL_ITEMS={};Object.assign(ALL_ITEMS,ARMOR,WEAPONS,AMMO,CONSUMABLES,MATERIALS);
if(typeof SEEDS!=='undefined')Object.assign(ALL_ITEMS,SEEDS);
if(typeof CROPS!=='undefined')Object.assign(ALL_ITEMS,CROPS);
function itemDef(id){return ALL_ITEMS[id]||null;}
function resolveIconId(id){if(!id) return '';if(id.startsWith('named_')){const parts=id.split('_');if(parts.length>=2 && WEAPONS[parts[1]]) return parts[1];}return id;}

function assetSuffix(){ return ASSET_VERSION ? ('?v=' + ASSET_VERSION) : ''; }
function rarityBg(rarity){return RARITY_BG[rarity]||'#151210';}

/* ===== rev293: 数字缩写 ===== */
function fmtNum(n){
  if(n == null || isNaN(n)) return "0";
  const v = Math.floor(Math.abs(n));
  const sign = n < 0 ? "-" : "";
  if(v < 100000) return sign + v;
  if(v < 1000000) return sign + Math.round(v / 1000) + "k";
  if(v < 1000000000) return sign + (v / 1000000).toFixed(1) + "M";
  return sign + (v / 1000000000).toFixed(1) + "B";
}
/* ===== end rev293 ===== */

function itemIcon(id,size){
  const s=size||24;
  if(!id) return '';
  const v=assetSuffix();
  if(typeof SEEDS!=='undefined' && SEEDS[id]){
    const _img = SEEDS[id].img || id;
    return `<img src="icons/garden/seeds/${_img}.png${v}" style="width:${s}px;height:${s}px;object-fit:contain" alt="">`;
  }
  if(typeof CROPS!=='undefined' && CROPS[id]){
    const _img = CROPS[id].img || id;
    return `<img src="icons/garden/crops/${_img}.png${v}" style="width:${s}px;height:${s}px;object-fit:contain" alt="">`;
  }
  if(MATERIAL_EMOJI[id]) return `<span style="font-size:${Math.round(s*0.85)}px;line-height:1;display:inline-block">${MATERIAL_EMOJI[id]}</span>`;
  if(PANTS_SHOES_EMOJI[id]) return `<span style="font-size:${Math.round(s*0.85)}px;line-height:1;display:inline-block">${PANTS_SHOES_EMOJI[id]}</span>`;
  const ammoDef=AMMO[id];
  if(ammoDef && ammoDef.cal){
    const f=AMMO_ICON_BY_CAL[ammoDef.cal];
    if(f) return `<img src="icons/items/${f}${v}" style="width:${s}px;height:${s}px;object-fit:contain" alt="">`;
  }
  const rid=resolveIconId(id);
  return `<img src="icons/items/${rid}.png${v}" style="width:${s}px;height:${s}px;object-fit:contain" alt="">`;
}
/* rev346: 種子 / 作物 / 生長階段圖片 helper */
function seedImgHtml(seedId, size){
  const s = (typeof SEEDS !== 'undefined') ? SEEDS[seedId] : null;
  if(!s) return `<span style="font-size:${Math.round(size*0.85)}px;line-height:1;display:inline-block">🌰</span>`;
  const img = s.img || seedId;
  return `<img src="icons/garden/seeds/${img}.png${assetSuffix()}" style="width:${size}px;height:${size}px;object-fit:contain;display:block" alt="">`;
}
function cropImgHtml(cropId, size){
  const c = (typeof CROPS !== 'undefined') ? CROPS[cropId] : null;
  if(!c) return '?';
  const img = c.img || cropId;
  return `<img src="icons/garden/crops/${img}.png${assetSuffix()}" style="width:${size}px;height:${size}px;object-fit:contain;display:block" alt="">`;
}
function cropStageImgHtml(cropId, stage, size){
  const c = (typeof CROPS !== 'undefined') ? CROPS[cropId] : null;
  if(!c) return '?';
  const img = c.img || cropId;
  let folder, file;
  if(stage === 'sprout'){ folder = 'sprouts'; file = 'sprout_' + img; }
  else if(stage === 'rotten'){ folder = 'rotten'; file = 'rotten_' + img; }
  else { folder = 'mature'; file = 'mature_' + img; }
  /* rev350: mature 找不到图时回退到 crops/（物品图标） */
  const _fallback = (stage === 'mature')
    ? ` onerror="this.onerror=null;this.src='icons/garden/crops/${img}.png${assetSuffix()}'"`
    : '';
  return `<img src="icons/garden/${folder}/${file}.png${assetSuffix()}"${_fallback} style="width:${size}px;height:${size}px;object-fit:contain;display:block" alt="">`;
}
function bossIcon(id){const _map={factory_king_ii:"factory_king",lab_queen_ii:"lab_queen",road_tyrant_ii:"road_tyrant",swamp_hydra_ii:"swamp_hydra",core_omega_ii:"core_omega"};const _rid=_map[id]||id;const _tint=(id.indexOf("_ii")>=0)?" boss-ii-tint":"";return `<img src="icons/bosses/${_rid}.png${assetSuffix()}" alt="" class="${_tint}">`;}
function buildingIcon(id){return `<img src="icons/buildings/${id}.png${assetSuffix()}" alt="">`;}

async function probeAssetVersion(){
  if(location.protocol==='file:') return false;
  try{
    const url = ASSET_PROBE_URL + '?probe=' + Date.now();
    const res = await fetch(url, { method:'HEAD', cache:'no-store' });
    if(!res.ok) return false;
    const lm = res.headers.get('Last-Modified') || '';
    const etag = res.headers.get('ETag') || '';
    const v = lm || etag;
    if(!v) return false;
    const encoded = encodeURIComponent(v);
    const prev = localStorage.getItem(ASSET_CACHE_KEY) || '';
    if(prev === encoded) return false;
    ASSET_VERSION = encoded;
    localStorage.setItem(ASSET_CACHE_KEY, encoded);
    if(typeof heroImgCache !== 'undefined') heroImgCache.clear();
    return true;
  }catch(e){
    console.warn('[assets] 探測失敗:', e);
    return false;
  }
}

function itemCat(id){if(typeof SEEDS!=='undefined'&&SEEDS[id])return 'seed';if(typeof CROPS!=='undefined'&&CROPS[id])return 'crop';if(ARMOR[id])return 'armor';if(WEAPONS[id])return 'weapon';if(AMMO[id])return 'ammo';if(CONSUMABLES[id])return 'consume';if(MATERIALS[id])return 'material';const d=ALL_ITEMS[id];if(d&&d.named)return 'weapon';return 'misc';}
function hasVariableRarity(id){const d=ALL_ITEMS[id];if(d&&d.named)return false;const c=itemCat(id);return c==='armor'||c==='weapon'||c==='consume'||c==='material';}
function rollRarity(){const r=Math.random();if(r<0.35)return '破舊';if(r<0.65)return '一般';if(r<0.85)return '庫存';if(r<0.97)return '精品';return '傳奇';}
function isFixedItem(id){const d=ARMOR[id];return d&&d.fixed===true;}
function getDefaultAmmo(cal){for(const k in AMMO){if(AMMO[k].cal===cal&&AMMO[k].rarity==='一般')return k;}for(const k in AMMO){if(AMMO[k].cal===cal)return k;}return null;}
function getMeleeHits(rpm){return Math.max(1,Math.round((rpm||60)*MELEE_DURATION/60));}

function namedWeaponName(baseId,mag,scope){
  const base=WEAPONS[baseId]||ALL_ITEMS[baseId];
  if(!base)return '未知';
  const parts=[base.name];
  if(mag && mag!==base.mag) parts.push(mag);
  if(scope) parts.push(scope.replace(/-/g,''));
  return parts.join('_');
}
function getNamedId(baseId,mag,scope){
  const base=WEAPONS[baseId];
  const normMag = (mag && base && mag !== base.mag) ? mag : 'x';
  const normScope = scope || 'x';
  return `named_${baseId}_${normMag}_${normScope}`;
}
function getOrCreateNamedItem(baseId,mag,scope){
  const id=getNamedId(baseId,mag,scope);
  if(!ALL_ITEMS[id]){
    const base=WEAPONS[baseId];
    const name=namedWeaponName(baseId,mag,scope);
    const effMag=(mag&&mag>base.mag)?mag:base.mag;
    ALL_ITEMS[id]={name:name,slot:base.slot,type:base.type,cal:base.cal,mag:effMag,modes:base.modes,rpm:base.rpm,range:base.range,named:true,scope:scope||null,scopeBonus:scope?(SCOPE_BONUS[scope]||0):0,baseId:baseId};
  }
  return id;
}
function isProfMaxed(weaponType){return Math.floor(state.proficiency[weaponType]||0)>=MAX_PROF_LEVEL;}
function calcModCost(baseId,mag,scope){
  const cost={};
  const baseMag=WEAPONS[baseId].mag;
  if(mag && mag>baseMag){
    cost.metal=(cost.metal||0)+50+Math.ceil((mag-baseMag)/2)*10;
    cost.screws=(cost.screws||0)+30;
    cost.gears=(cost.gears||0)+15;
  }
  if(scope){
    cost.electronics=(cost.electronics||0)+80;
    cost.metal=(cost.metal||0)+30;
    cost.gears=(cost.gears||0)+25;
    cost.screws=(cost.screws||0)+20;
  }
  return cost;
}
/* v56-mod-speedup: Lv.1=24h, Lv.50=5min */
function calcModTime(baseId,mag,scope){
  const wbLv = Math.min(50, Math.max(1, getBuildingLv('workbench') || 1));
  const ratio = Math.pow(300/86400, (wbLv-1)/49);
  let baseSec = 86400 * ratio;
  const bm = WEAPONS[baseId].mag;
  let extra = 0;
  if(mag && mag > bm) extra += 0.05 + (mag-bm) * 0.002;
  if(scope) extra += 0.10;
  return Math.round(baseSec * (1 + extra));
}
function getMagOptionsForWeapon(weaponId){
  const def = WEAPONS[weaponId];
  if(!def) return [];
  const cal = def.cal;
  const type = def.type;
  const defaultMag = def.mag;
  let candidates = [];
  if(cal === '5.45' && (type === '突擊步槍' || type === '機槍')){
    candidates = [30, 60, 95];
  } else if(cal === '7.62' && type === '突擊步槍'){
    candidates = [30, 45, 75];
  } else if(cal === '9x39'){
    candidates = [20, 30];
  } else if(cal === '7.62x54'){
    if(weaponId === 'svd') candidates = [15, 20];
    else if(weaponId === 'sv98') candidates = [];
    else if(weaponId === 'pkm' || weaponId === 'pkp') candidates = [200];
    else candidates = [];
  } else {
    const rules = WEAPON_MOD_RULES[weaponId];
    if(rules && rules.mags) candidates = rules.mags.slice();
  }
  return candidates.filter(m => m >= defaultMag);
}

const ENEMIES={
  mutant_squirrel:{name:'變異松鼠',hp:10,dmg:5,pen:1,armorLevel:1},
  mutant_rat:{name:'變異巨鼠',hp:20,dmg:8,pen:1,armorLevel:1},
  ghoul:{name:'食屍鬼',hp:35,dmg:15,pen:2,armorLevel:2},
  raider:{name:'掠奪者',hp:45,dmg:22,pen:3,armorLevel:3},
  raider_vet:{name:'掠奪者老兵',hp:80,dmg:38,pen:4,armorLevel:4},
  mutant_wolf:{name:'變異狼',hp:55,dmg:25,pen:3,armorLevel:2},
  mutant_bear:{name:'變異熊',hp:150,dmg:65,pen:5,armorLevel:3}
};

const REGIONS={
  '廢棄工廠':{name:'廢棄工廠',desc:'生鏽的機械與堆積的貨櫃',enemies:['mutant_squirrel','mutant_rat','raider','ghoul'],loot:['wood','wood','wood','metal','metal','screws','cloth','9x18_pst','9x18_ps','9x19_pbp','9x19_pst','12ga_buck','12ga_7mm','20x70_5.6','20x70_6.2','5.45_hp','23x75_shrapnel25','pp19','aks74u','aks74un','mp133','toz106','mp153','pm','pb','6kh2','kukri','rgd5','ssh68','ssh94','balaclava','shemagh','ballglasses','paca','cargopants','workboots','tactboots','ai2','bandage','water','painkiller'],combat:{attack:0.55,stealth:0.22},seal:'seal_factory',sealRate:0.03,enemyHpMult:1.0},
  '廢棄實驗室':{name:'廢棄實驗室',desc:'冷白的燈管與腐蝕的培養槽',enemies:['ghoul','raider','raider_vet','mutant_rat'],loot:['electronics','electronics','metal','screws','cloth','gears','9x18_pmm','9x18_psv','9x19_ap63','9x19_pbp','20x70_5.6','20x70_6.2','9x39_fmj','9x39_sp5','9x39_pab9','9x39_spp','9a91','sr3m','vss','asval','pb','mp155','kukri','6kh5','f1','rgd5','vog17','kolpak','6b47','6b47m','ssh94','balaclava','gp7','6b23','6b231','tactboots','salewa','ifak','painkiller','splint'],combat:{attack:0.6,stealth:0.28},seal:'seal_lab',sealRate:0.02,enemyHpMult:1.5,needUnlock:true,unlockHint:'擊敗 鐵匠 解鎖'},
  '郊區公路':{name:'郊區公路',desc:'翻覆的車隊與荒廢的加油站',enemies:['raider','raider_vet','mutant_wolf','mutant_rat'],loot:['wood','wood','metal','gears','cloth','screws','5.45_ps','5.45_bt','7.62_hp','7.62_fmj','7.62_ps','9x19_pst','9x19_ap63','12ga_buck','12ga_express','20x70_5.6','20x70_6.2','23x75_shrapnel10','akm','akms','akmn','ak74','ak74n','ak74m','ak105','ak12','pp19','mp443','aps','mp133','mp153','rgd5','f1','rgo','kiver','kolpak','ssh94','shemagh','6b13','6b13m','6b23','cargopants','tactboots','painkiller','tushonka','water','ai2','splint'],combat:{attack:0.62,stealth:0.3},seal:'seal_road',sealRate:0.02,enemyHpMult:2.5,needUnlock:true,unlockHint:'擊敗 醫師 解鎖'},
  '輻射沼澤':{name:'輻射沼澤',desc:'發綠的水窪與扭曲的枯樹',enemies:['mutant_bear','mutant_wolf','ghoul','raider_vet'],loot:['wood','electronics','gears','cloth','metal','7.62x54_hp','7.62x54_fmj','7.62x54_ps','7.62x54_bt','7.62_bp','9x39_spp','9x39_sp6','12ga_express','12ga_magnum','20x70_5.6','20x70_6.2','23x75_shrapnel10','23x75_shrapnel25','sv98','svd','ak103','ak104','vss','saiga12','asval','mp155','ks23','f1','rgo','kiver','6b23','6b231','salewa','ifak','surv12','tushonka','splint'],combat:{attack:0.7,stealth:0.35},seal:'seal_swamp',sealRate:0.015,enemyHpMult:4.0,needUnlock:true,unlockHint:'擊敗 實驗室女王 · 白蝕 解鎖'},
  '廢土核心':{name:'廢土核心',desc:'鋼鐵巨構與永不熄滅的火光',enemies:['mutant_bear','raider_vet','raider_vet','mutant_wolf'],loot:['electronics','gears','metal','cloth','7.62x54_bs','7.62_ma','5.45_bp','5.45_7n39','7.62_bp','12ga_magnum','20x70_5.6','20x70_6.2','12.7_ps12','9x18_sp7','9x19_cci','9x19_pso','9x39_sp6','9x39_spp','23x75_barrikada','rpd','rpdn','rpk16','svd','sv98','vss','asval','saiga12','ks23','mp155','vog25','f1','rgo','maska','zhuk3','6b232','6b45','redutm','ssh94','haix','salewa','ifak','surv12'],combat:{attack:0.75,stealth:0.4},seal:'seal_core',sealRate:0.008,enemyHpMult:6.0,needUnlock:true,unlockHint:'擊敗 沼澤九頭 · 腐母 解鎖'},
};

REGIONS['廢棄工廠II']={name:'廢棄工廠 II',desc:'二級入口：更深處的機械墓場',enemies:['ghoul','raider','raider_vet','mutant_wolf'],loot:['electronics','gears','metal','cloth','5.45_bt','5.45_bp','7.62_ps','7.62_bp','7.62x54_ps','7.62x54_bt','9x39_pab9','9x39_spp','ak74m','ak103','rpk16','vss','asval','saiga12','ks23','6b47','kiver','6b23','6b231','6b232','redutm','salewa','ifak','surv12','vog25','f1','rgo'],combat:{attack:0.65,stealth:0.28},seal:'seal_factory_ii',sealRate:0.02,enemyHpMult:4.0,needUnlock:true,unlockHint:'擊敗 核心終焉 · OMEGA 解鎖',spawnWeights:{1:0.40,2:0.35,3:0.20,4:0.05},maxEnemies:4};
REGIONS['廢棄實驗室II']={name:'廢棄實驗室 II',desc:'二級入口：被封鎖的深層實驗區',enemies:['ghoul','raider_vet','mutant_bear','mutant_rat'],loot:['electronics','gears','metal','cloth','5.45_bp','5.45_7n39','7.62_bp','7.62_ma','7.62x54_bt','7.62x54_bs','9x39_spp','9x39_sp6','12ga_magnum','rpk16','svd','vss','asval','6b232','zhuk3','altyn','zsh12m','maska','6b45','redutm','surv12','ifak','f1','rgo','vog25'],combat:{attack:0.68,stealth:0.30},seal:'seal_lab_ii',sealRate:0.015,enemyHpMult:5.0,needUnlock:true,unlockHint:'擊敗 工廠之王 · 鐵手 II 解鎖',spawnWeights:{1:0.35,2:0.35,3:0.22,4:0.08},maxEnemies:4};
REGIONS['郊區公路II']={name:'郊區公路 II',desc:'二級入口：深入被封鎖的公路腹地',enemies:['raider_vet','mutant_bear','mutant_wolf','raider_vet'],loot:['electronics','metal','gears','cloth','5.45_7n39','7.62_ma','7.62x54_bs','9x39_sp6','12ga_magnum','12.7_ps12b','rpd','rpk16','svd','pkm','pkp','ash12','6b43','defender2','zhuk6a','6b45','altyn','zsh12m','maska','surv12','f1','rgo','rgn'],combat:{attack:0.70,stealth:0.32},seal:'seal_road_ii',sealRate:0.012,enemyHpMult:6.0,needUnlock:true,unlockHint:'擊敗 實驗室女王 · 白蝕 II 解鎖',spawnWeights:{1:0.30,2:0.35,3:0.25,4:0.10},maxEnemies:4};
REGIONS['輻射沼澤II']={name:'輻射沼澤 II',desc:'二級入口：腐化最深的沼心',enemies:['mutant_bear','raider_vet','mutant_bear','mutant_wolf'],loot:['electronics','gears','metal','cloth','7.62x54_bs','7.62_ma','9x39_sp6','12ga_magnum','12.7_ps12b','23x75_barrikada','rpd','pkm','pkp','ash12','svd','sv98','6b43','defender2','zhuk6a','6b45','redutm','altyn','zsh12m','maska','surv12','rgn'],combat:{attack:0.72,stealth:0.35},seal:'seal_swamp_ii',sealRate:0.010,enemyHpMult:8.0,needUnlock:true,unlockHint:'擊敗 公路暴君 · 鐵鎚 II 解鎖',spawnWeights:{1:0.25,2:0.30,3:0.30,4:0.15},maxEnemies:5};
REGIONS['廢土核心II']={name:'廢土核心 II',desc:'二級入口：接近終焉的鋼鐵深淵',enemies:['mutant_bear','raider_vet','mutant_bear','raider_vet'],loot:['electronics','gears','metal','cloth','7.62x54_bs','7.62_ma','5.45_7n39','9x39_sp6','12.7_ps12b','23x75_barrikada','pkm','pkp','ash12','svd','rpd','rpdn','6b43','defender2','zhuk6a','altyn','zsh12m','maska','6b45','redutm','belleville','surv12','rgn'],combat:{attack:0.75,stealth:0.38},seal:'seal_core_ii',sealRate:0.008,enemyHpMult:10.0,needUnlock:true,unlockHint:'擊敗 沼澤九頭 · 腐母 II 解鎖',spawnWeights:{1:0.20,2:0.30,3:0.30,4:0.15,5:0.05},maxEnemies:5};

const ROUTES={
  '廢棄工廠':[{name:'東線',nodes:['東門','休息室一樓','休息室二樓','回廊','檢修通道','儲油罐','車床','經理室']},{name:'西線',nodes:['西側卸貨區','倉庫','裝卸平台','車間','鍋爐房','經理室']},{name:'地下線',nodes:['地下入口','排水管道','維修隧道','動力室','經理室']}],
  '廢棄實驗室':[{name:'主樓',nodes:['正門大廳','接待處','電梯井','B1 實驗區','樣本室','主控室']},{name:'側翼',nodes:['側門','更衣室','消毒通道','培養槽區','觀察室','主控室']},{name:'地下',nodes:['貨梯','儲藏間','冷凍庫','動物房','主控室']}],
  '郊區公路':[{name:'主幹道',nodes:['收費站','翻覆車隊','加油站','休息區','隧道口','集結點']},{name:'繞行路',nodes:['小路','廢棄農舍','涵洞','山脊','集結點']},{name:'鐵軌',nodes:['鐵道口','信號塔','貨運列車','集結點']}],
  '輻射沼澤':[{name:'淺灘',nodes:['灘頭','枯樹林','泥沼','廢船','祭壇','沼心']},{name:'深沼',nodes:['腐水區','孢子林','沉沒教堂','沼心']}],
  '廢土核心':[{name:'外環',nodes:['外圍防線','哨塔','斷裂高架','中央熔爐','核心']},{name:'內環',nodes:['通風井','管道區','反應爐','核心']}],
};
for(const _rk of ['廢棄工廠','廢棄實驗室','郊區公路','輻射沼澤','廢土核心']){if(ROUTES[_rk])ROUTES[_rk+'II']=ROUTES[_rk];}


/* ===== rev130: 各地區補充種子掉落 ===== */
(function(){
  const _SEED_DROPS = {
    '廢棄工廠': ['seed_potato','seed_carrot'],
    '廢棄實驗室': ['seed_cabbage','seed_wheat'],
    '郊區公路': ['seed_potato','seed_beet','seed_wheat'],
    '輻射沼澤': ['seed_beet','seed_cabbage'],
    '廢土核心': ['seed_wheat','seed_beet'],
    '廢棄工廠II': ['seed_potato','seed_carrot','seed_cabbage'],
    '廢棄實驗室II': ['seed_cabbage','seed_wheat','seed_beet'],
    '郊區公路II': ['seed_potato','seed_beet','seed_wheat'],
    '輻射沼澤II': ['seed_beet','seed_cabbage','seed_wheat'],
    '廢土核心II': ['seed_wheat','seed_beet','seed_cabbage']
  };
  for(const _r in _SEED_DROPS){
    if(REGIONS[_r] && Array.isArray(REGIONS[_r].loot)){
      for(const _s of _SEED_DROPS[_r]){
        REGIONS[_r].loot.push(_s);
      }
    }
  }
})();
/* ===== end rev130 ===== */

/* rev370: 獸形敵人骨架 */


const BEAST_LAYERS = {
  "mutant_squirrel": {
    "canvas": {
      "w": 300,
      "h": 300
    },
    "layers": [
      {
        "id": "tail",
        "z": 10,
        "color": "#a04020",
        "pivot": {
          "x": 0.9,
          "y": 0.5
        },
        "x": 0.845,
        "y": 0.415,
        "w": 0.3,
        "h": 0.15,
        "rot": -30
      },
      {
        "id": "leg_b2",
        "z": 14,
        "color": "#402008",
        "pivot": {
          "x": 0.5,
          "y": 0.1
        },
        "x": 0.56,
        "y": 0.55,
        "w": 0.06,
        "h": 0.34
      },
      {
        "id": "leg_f2",
        "z": 14,
        "color": "#402008",
        "pivot": {
          "x": 0.5,
          "y": 0.1
        },
        "x": 0.34,
        "y": 0.58,
        "w": 0.06,
        "h": 0.325
      },
      {
        "id": "claw3",
        "z": 14.5,
        "color": "#bbb",
        "pivot": {
          "x": 0.5,
          "y": 0.1
        },
        "x": 0.54,
        "y": 0.86,
        "w": 0.02,
        "h": 0.04
      },
      {
        "id": "claw4",
        "z": 14.5,
        "color": "#bbb",
        "pivot": {
          "x": 0.5,
          "y": 0.1
        },
        "x": 0.32,
        "y": 0.86,
        "w": 0.02,
        "h": 0.04
      },
      {
        "id": "leg_b",
        "z": 15,
        "color": "#603010",
        "pivot": {
          "x": 0.5,
          "y": 0.1
        },
        "x": 0.5966666666666667,
        "y": 0.565,
        "w": 0.06,
        "h": 0.34
      },
      {
        "id": "leg_f",
        "z": 15,
        "color": "#603010",
        "pivot": {
          "x": 0.5,
          "y": 0.1
        },
        "x": 0.3,
        "y": 0.59,
        "w": 0.06,
        "h": 0.325
      },
      {
        "id": "claw1",
        "z": 16,
        "color": "#ddd",
        "pivot": {
          "x": 0.5,
          "y": 0.1
        },
        "x": 0.28,
        "y": 0.86,
        "w": 0.02,
        "h": 0.04
      },
      {
        "id": "claw2",
        "z": 16,
        "color": "#ddd",
        "pivot": {
          "x": 0.5,
          "y": 0.1
        },
        "x": 0.33,
        "y": 0.86,
        "w": 0.02,
        "h": 0.04
      },
      {
        "id": "body",
        "z": 20,
        "color": "#804020",
        "pivot": {
          "x": 0.5,
          "y": 0.5
        },
        "x": 0.465,
        "y": 0.45,
        "w": 0.35,
        "h": 0.2
      },
      {
        "id": "head",
        "z": 30,
        "color": "#804020",
        "pivot": {
          "x": 0.8,
          "y": 0.5
        },
        "x": 0.27,
        "y": 0.53,
        "w": 0.16,
        "h": 0.215,
        "rot": 22
      },
      {
        "id": "ear",
        "z": 40,
        "color": "#603010",
        "pivot": {
          "x": 0.5,
          "y": 0.8
        },
        "x": 0.24166666666666667,
        "y": 0.3766666666666667,
        "w": 0.06,
        "h": 0.165,
        "rot": 22
      },
      {
        "id": "mouth",
        "z": 45,
        "color": "#300",
        "pivot": {
          "x": 0.5,
          "y": 0.5
        },
        "x": 0.21,
        "y": 0.62,
        "w": 0.13,
        "h": 0.075
      },
      {
        "id": "fang1",
        "z": 46,
        "color": "#fff",
        "pivot": {
          "x": 0.5,
          "y": 0.5
        },
        "x": 0.145,
        "y": 0.59,
        "w": 0.015,
        "h": 0.025
      },
      {
        "id": "fang2",
        "z": 46,
        "color": "#fff",
        "pivot": {
          "x": 0.5,
          "y": 0.5
        },
        "x": 0.165,
        "y": 0.59,
        "w": 0.015,
        "h": 0.025
      },
      {
        "id": "eye",
        "z": 50,
        "color": "#ff0000",
        "pivot": {
          "x": 0.5,
          "y": 0.5
        },
        "x": 0.18,
        "y": 0.5,
        "w": 0.03,
        "h": 0.03
      },
      {
        "id": "leg_f2",
        "z": 14,
        "color": "#111",
        "pivot": {
          "x": 0.5,
          "y": 0.1
        },
        "x": 0.25,
        "y": 0.64,
        "w": 0.06,
        "h": 0.325,
        "rot": 0
      },
      {
        "id": "leg_b2",
        "z": 14,
        "color": "#111",
        "pivot": {
          "x": 0.5,
          "y": 0.1
        },
        "x": 0.5466666666666666,
        "y": 0.615,
        "w": 0.06,
        "h": 0.34,
        "rot": 0
      },
      {
        "id": "claw3",
        "z": 14.5,
        "color": "#bbb",
        "pivot": {
          "x": 0.5,
          "y": 0.1
        },
        "x": 0.23000000000000004,
        "y": 0.91,
        "w": 0.02,
        "h": 0.04
      },
      {
        "id": "claw4",
        "z": 14.5,
        "color": "#bbb",
        "pivot": {
          "x": 0.5,
          "y": 0.1
        },
        "x": 0.28,
        "y": 0.91,
        "w": 0.02,
        "h": 0.04
      }
    ]
  },
  "mutant_rat": {
    "canvas": {
      "w": 300,
      "h": 300
    },
    "layers": [
      {
        "id": "tail",
        "z": 10,
        "color": "#666",
        "pivot": {
          "x": 0.1,
          "y": 0.5
        },
        "x": 0.695,
        "y": 0.57,
        "w": 0.4,
        "h": 0.04,
        "rot": 15
      },
      {
        "id": "leg_b2",
        "z": 21,
        "color": "#333",
        "pivot": {
          "x": 0.5,
          "y": 0.1
        },
        "x": 0.6,
        "y": 0.75,
        "w": 0.06,
        "h": 0.15
      },
      {
        "id": "leg_f2",
        "z": 21,
        "color": "#333",
        "pivot": {
          "x": 0.5,
          "y": 0.1
        },
        "x": 0.3,
        "y": 0.75,
        "w": 0.06,
        "h": 0.15
      },
      {
        "id": "claw3",
        "z": 21.5,
        "color": "#bbb",
        "pivot": {
          "x": 0.5,
          "y": 0.1
        },
        "x": 0.58,
        "y": 0.86,
        "w": 0.02,
        "h": 0.04
      },
      {
        "id": "claw4",
        "z": 21.5,
        "color": "#bbb",
        "pivot": {
          "x": 0.5,
          "y": 0.1
        },
        "x": 0.33,
        "y": 0.86,
        "w": 0.02,
        "h": 0.04
      },
      {
        "id": "leg_b",
        "z": 24,
        "color": "#444",
        "pivot": {
          "x": 0.5,
          "y": 0.1
        },
        "x": 0.65,
        "y": 0.75,
        "w": 0.06,
        "h": 0.15
      },
      {
        "id": "leg_f",
        "z": 22,
        "color": "#444",
        "pivot": {
          "x": 0.5,
          "y": 0.1
        },
        "x": 0.25,
        "y": 0.75,
        "w": 0.06,
        "h": 0.15
      },
      {
        "id": "claw1",
        "z": 23,
        "color": "#ddd",
        "pivot": {
          "x": 0.5,
          "y": 0.1
        },
        "x": 0.23,
        "y": 0.86,
        "w": 0.02,
        "h": 0.04
      },
      {
        "id": "claw2",
        "z": 31,
        "color": "#ddd",
        "pivot": {
          "x": 0.5,
          "y": 0.1
        },
        "x": 0.28,
        "y": 0.86,
        "w": 0.02,
        "h": 0.04
      },
      {
        "id": "body",
        "z": 20,
        "color": "#777",
        "pivot": {
          "x": 0.5,
          "y": 0.5
        },
        "x": 0.45,
        "y": 0.58,
        "w": 0.615,
        "h": 0.4
      },
      {
        "id": "head",
        "z": 30,
        "color": "#777",
        "pivot": {
          "x": 0.8,
          "y": 0.5
        },
        "x": 0.21,
        "y": 0.55,
        "w": 0.2,
        "h": 0.12
      },
      {
        "id": "ear",
        "z": 40,
        "color": "#555",
        "pivot": {
          "x": 0.5,
          "y": 0.8
        },
        "x": 0.23,
        "y": 0.465,
        "w": 0.17,
        "h": 0.17,
        "rot": 4
      },
      {
        "id": "mouth",
        "z": 45,
        "color": "#300",
        "pivot": {
          "x": 0.5,
          "y": 0.5
        },
        "x": 0.115,
        "y": 0.605,
        "w": 0.1,
        "h": 0.065
      },
      {
        "id": "fang1",
        "z": 46,
        "color": "#fff",
        "pivot": {
          "x": 0.5,
          "y": 0.5
        },
        "x": 0.08,
        "y": 0.61,
        "w": 0.02,
        "h": 0.08
      },
      {
        "id": "fang2",
        "z": 46,
        "color": "#fff",
        "pivot": {
          "x": 0.5,
          "y": 0.5
        },
        "x": 0.105,
        "y": 0.615,
        "w": 0.02,
        "h": 0.08
      },
      {
        "id": "eye",
        "z": 50,
        "color": "#ff0000",
        "pivot": {
          "x": 0.5,
          "y": 0.5
        },
        "x": 0.1,
        "y": 0.53,
        "w": 0.03,
        "h": 0.03
      },
      {
        "id": "eye2",
        "z": 50,
        "color": "#ff0000",
        "pivot": {
          "x": 0.5,
          "y": 0.5
        },
        "x": 0.18,
        "y": 0.525,
        "w": 0.04,
        "h": 0.04,
        "rot": 0
      },
      {
        "id": "ear2",
        "z": 27,
        "color": "#888888",
        "pivot": {
          "x": 0.5,
          "y": 0.5
        },
        "x": 0.165,
        "y": 0.415,
        "w": 0.135,
        "h": 0.14,
        "rot": -11
      },
      {
        "id": "leg_f2",
        "z": 14,
        "color": "#111",
        "pivot": {
          "x": 0.5,
          "y": 0.1
        },
        "x": 0.2,
        "y": 0.77,
        "w": 0.06,
        "h": 0.15,
        "rot": 0
      },
      {
        "id": "leg_b2",
        "z": 14,
        "color": "#111",
        "pivot": {
          "x": 0.5,
          "y": 0.1
        },
        "x": 0.6,
        "y": 0.77,
        "w": 0.06,
        "h": 0.15,
        "rot": 0
      },
      {
        "id": "claw3",
        "z": 14.5,
        "color": "#bbb",
        "pivot": {
          "x": 0.5,
          "y": 0.1
        },
        "x": 0.18,
        "y": 0.88,
        "w": 0.02,
        "h": 0.04
      },
      {
        "id": "claw4",
        "z": 14.5,
        "color": "#bbb",
        "pivot": {
          "x": 0.5,
          "y": 0.1
        },
        "x": 0.23000000000000004,
        "y": 0.88,
        "w": 0.02,
        "h": 0.04
      }
    ]
  },
  "mutant_wolf": {
    "canvas": {
      "w": 400,
      "h": 400
    },
    "layers": [
      {
        "id": "tail",
        "z": 10,
        "color": "#444",
        "pivot": {
          "x": 0.9,
          "y": 0.5
        },
        "x": 0.9075,
        "y": 0.4725,
        "w": 0.25,
        "h": 0.08,
        "rot": -20
      },
      {
        "id": "leg_b2",
        "z": 14,
        "color": "#222",
        "pivot": {
          "x": 0.5,
          "y": 0.1
        },
        "x": 0.6,
        "y": 0.655,
        "w": 0.06,
        "h": 0.2
      },
      {
        "id": "leg_f2",
        "z": 14,
        "color": "#222",
        "pivot": {
          "x": 0.5,
          "y": 0.1
        },
        "x": 0.31,
        "y": 0.6625,
        "w": 0.06,
        "h": 0.2,
        "rot": -23
      },
      {
        "id": "claw3",
        "z": 14.5,
        "color": "#bbb",
        "pivot": {
          "x": 0.5,
          "y": 0.1
        },
        "x": 0.6,
        "y": 0.82,
        "w": 0.02,
        "h": 0.04
      },
      {
        "id": "claw4",
        "z": 14.5,
        "color": "#bbb",
        "pivot": {
          "x": 0.5,
          "y": 0.1
        },
        "x": 0.34,
        "y": 0.82,
        "w": 0.02,
        "h": 0.04
      },
      {
        "id": "leg_b",
        "z": 15,
        "color": "#333",
        "pivot": {
          "x": 0.5,
          "y": 0.1
        },
        "x": 0.63,
        "y": 0.655,
        "w": 0.06,
        "h": 0.2
      },
      {
        "id": "leg_f",
        "z": 15,
        "color": "#333",
        "pivot": {
          "x": 0.5,
          "y": 0.1
        },
        "x": 0.2725,
        "y": 0.6625,
        "w": 0.06,
        "h": 0.2,
        "rot": -23
      },
      {
        "id": "claw1",
        "z": 16,
        "color": "#ddd",
        "pivot": {
          "x": 0.5,
          "y": 0.1
        },
        "x": 0.63,
        "y": 0.82,
        "w": 0.02,
        "h": 0.04
      },
      {
        "id": "claw2",
        "z": 16,
        "color": "#ddd",
        "pivot": {
          "x": 0.5,
          "y": 0.1
        },
        "x": 0.6125,
        "y": 0.815,
        "w": 0.02,
        "h": 0.04
      },
      {
        "id": "body",
        "z": 20,
        "color": "#555",
        "pivot": {
          "x": 0.5,
          "y": 0.5
        },
        "x": 0.48250000000000004,
        "y": 0.6125,
        "w": 0.5,
        "h": 0.2
      },
      {
        "id": "head",
        "z": 30,
        "color": "#555",
        "pivot": {
          "x": 0.8,
          "y": 0.5
        },
        "x": 0.215,
        "y": 0.5,
        "w": 0.13,
        "h": 0.15
      },
      {
        "id": "ear",
        "z": 40,
        "color": "#333",
        "pivot": {
          "x": 0.5,
          "y": 0.8
        },
        "x": 0.21750000000000003,
        "y": 0.425,
        "w": 0.06,
        "h": 0.08
      },
      {
        "id": "snout",
        "z": 42,
        "color": "#444",
        "pivot": {
          "x": 0.5,
          "y": 0.5
        },
        "x": 0.07,
        "y": 0.5325,
        "w": 0.12,
        "h": 0.07
      },
      {
        "id": "mouth",
        "z": 45,
        "color": "#300",
        "pivot": {
          "x": 0.5,
          "y": 0.5
        },
        "x": 0.11499999999999999,
        "y": 0.5774999999999999,
        "w": 0.1,
        "h": 0.03
      },
      {
        "id": "fang1",
        "z": 46,
        "color": "#fff",
        "pivot": {
          "x": 0.5,
          "y": 0.5
        },
        "x": 0.0675,
        "y": 0.5724999999999999,
        "w": 0.02,
        "h": 0.03
      },
      {
        "id": "fang2",
        "z": 46,
        "color": "#fff",
        "pivot": {
          "x": 0.5,
          "y": 0.5
        },
        "x": 0.09,
        "y": 0.57,
        "w": 0.02,
        "h": 0.03
      },
      {
        "id": "eye",
        "z": 50,
        "color": "#ff0000",
        "pivot": {
          "x": 0.5,
          "y": 0.5
        },
        "x": 0.12,
        "y": 0.48,
        "w": 0.03,
        "h": 0.03
      },
      {
        "id": "leg_f2",
        "z": 14,
        "color": "#111",
        "pivot": {
          "x": 0.5,
          "y": 0.1
        },
        "x": 0.2325,
        "y": 0.7025,
        "w": 0.06,
        "h": 0.2,
        "rot": -23
      },
      {
        "id": "leg_b2",
        "z": 14,
        "color": "#111",
        "pivot": {
          "x": 0.5,
          "y": 0.1
        },
        "x": 0.59,
        "y": 0.6950000000000001,
        "w": 0.06,
        "h": 0.2,
        "rot": 0
      },
      {
        "id": "claw3",
        "z": 14.5,
        "color": "#bbb",
        "pivot": {
          "x": 0.5,
          "y": 0.1
        },
        "x": 0.59,
        "y": 0.86,
        "w": 0.02,
        "h": 0.04
      },
      {
        "id": "claw4",
        "z": 14.5,
        "color": "#bbb",
        "pivot": {
          "x": 0.5,
          "y": 0.1
        },
        "x": 0.5725,
        "y": 0.855,
        "w": 0.02,
        "h": 0.04
      }
    ]
  },
  "mutant_bear": {
    "canvas": {
      "w": 500,
      "h": 500
    },
    "layers": [
      {
        "id": "leg_b2",
        "z": 14,
        "color": "#110800",
        "pivot": {
          "x": 0.5,
          "y": 0.1
        },
        "x": 0.66,
        "y": 0.7,
        "w": 0.1,
        "h": 0.25
      },
      {
        "id": "leg_f2",
        "z": 14,
        "color": "#110800",
        "pivot": {
          "x": 0.5,
          "y": 0.1
        },
        "x": 0.33,
        "y": 0.7,
        "w": 0.1,
        "h": 0.25
      },
      {
        "id": "claw4",
        "z": 14.5,
        "color": "#bbb",
        "pivot": {
          "x": 0.5,
          "y": 0.1
        },
        "x": 0.63,
        "y": 0.88,
        "w": 0.02,
        "h": 0.05
      },
      {
        "id": "claw5",
        "z": 14.5,
        "color": "#bbb",
        "pivot": {
          "x": 0.5,
          "y": 0.1
        },
        "x": 0.61,
        "y": 0.88,
        "w": 0.02,
        "h": 0.05
      },
      {
        "id": "claw6",
        "z": 14.5,
        "color": "#bbb",
        "pivot": {
          "x": 0.5,
          "y": 0.1
        },
        "x": 0.36,
        "y": 0.88,
        "w": 0.02,
        "h": 0.05
      },
      {
        "id": "claw7",
        "z": 14.5,
        "color": "#bbb",
        "pivot": {
          "x": 0.5,
          "y": 0.1
        },
        "x": 0.34,
        "y": 0.88,
        "w": 0.02,
        "h": 0.05
      },
      {
        "id": "leg_b",
        "z": 15,
        "color": "#221100",
        "pivot": {
          "x": 0.5,
          "y": 0.1
        },
        "x": 0.7,
        "y": 0.7,
        "w": 0.1,
        "h": 0.25
      },
      {
        "id": "leg_f",
        "z": 15,
        "color": "#221100",
        "pivot": {
          "x": 0.5,
          "y": 0.1
        },
        "x": 0.295,
        "y": 0.7,
        "w": 0.1,
        "h": 0.25
      },
      {
        "id": "claw1",
        "z": 22,
        "color": "#ddd",
        "pivot": {
          "x": 0.5,
          "y": 0.1
        },
        "x": 0.25,
        "y": 0.88,
        "w": 0.02,
        "h": 0.05
      },
      {
        "id": "claw2",
        "z": 16,
        "color": "#ddd",
        "pivot": {
          "x": 0.5,
          "y": 0.1
        },
        "x": 0.23,
        "y": 0.88,
        "w": 0.02,
        "h": 0.05
      },
      {
        "id": "claw3",
        "z": 16,
        "color": "#ddd",
        "pivot": {
          "x": 0.5,
          "y": 0.1
        },
        "x": 0.28,
        "y": 0.88,
        "w": 0.02,
        "h": 0.05
      },
      {
        "id": "body",
        "z": 20,
        "color": "#4a2a10",
        "pivot": {
          "x": 0.5,
          "y": 0.5
        },
        "x": 0.535,
        "y": 0.5,
        "w": 0.6,
        "h": 0.445
      },
      {
        "id": "head",
        "z": 30,
        "color": "#4a2a10",
        "pivot": {
          "x": 0.8,
          "y": 0.5
        },
        "x": 0.255,
        "y": 0.47,
        "w": 0.25,
        "h": 0.29
      },
      {
        "id": "ear",
        "z": 40,
        "color": "#221100",
        "pivot": {
          "x": 0.5,
          "y": 0.8
        },
        "x": 0.265,
        "y": 0.315,
        "w": 0.08,
        "h": 0.08
      },
      {
        "id": "snout",
        "z": 42,
        "color": "#5a3a20",
        "pivot": {
          "x": 0.5,
          "y": 0.5
        },
        "x": 0.05,
        "y": 0.52,
        "w": 0.1,
        "h": 0.1
      },
      {
        "id": "mouth",
        "z": 45,
        "color": "#300",
        "pivot": {
          "x": 0.5,
          "y": 0.5
        },
        "x": 0.115,
        "y": 0.585,
        "w": 0.15,
        "h": 0.06
      },
      {
        "id": "fang1",
        "z": 46,
        "color": "#fff",
        "pivot": {
          "x": 0.5,
          "y": 0.5
        },
        "x": 0.045,
        "y": 0.575,
        "w": 0.02,
        "h": 0.04
      },
      {
        "id": "fang2",
        "z": 46,
        "color": "#fff",
        "pivot": {
          "x": 0.5,
          "y": 0.5
        },
        "x": 0.08,
        "y": 0.575,
        "w": 0.02,
        "h": 0.04
      },
      {
        "id": "eye",
        "z": 50,
        "color": "#ff0000",
        "pivot": {
          "x": 0.5,
          "y": 0.5
        },
        "x": 0.195,
        "y": 0.4,
        "w": 0.04,
        "h": 0.04
      },
      {
        "id": "tail",
        "z": 0,
        "color": "#4a2a10",
        "pivot": {
          "x": 0.5,
          "y": 0.5
        },
        "x": 0.87,
        "y": 0.317,
        "w": 0.1,
        "h": 0.1,
        "rot": 0
      },
      {
        "id": "eye2",
        "z": 50,
        "color": "#ff0000",
        "pivot": {
          "x": 0.5,
          "y": 0.5
        },
        "x": 0.105,
        "y": 0.4,
        "w": 0.045,
        "h": 0.04,
        "rot": 0
      },
      {
        "id": "ear2",
        "z": 50,
        "color": "#221100",
        "pivot": {
          "x": 0.5,
          "y": 0.5
        },
        "x": 0.175,
        "y": 0.295,
        "w": 0.08,
        "h": 0.07,
        "rot": 0
      },
      {
        "id": "leg_f2",
        "z": 14,
        "color": "#111",
        "pivot": {
          "x": 0.5,
          "y": 0.1
        },
        "x": 0.255,
        "y": 0.72,
        "w": 0.1,
        "h": 0.25,
        "rot": 0
      },
      {
        "id": "leg_b2",
        "z": 14,
        "color": "#111",
        "pivot": {
          "x": 0.5,
          "y": 0.1
        },
        "x": 0.6599999999999999,
        "y": 0.72,
        "w": 0.1,
        "h": 0.25,
        "rot": 0
      },
      {
        "id": "claw3",
        "z": 14.5,
        "color": "#bbb",
        "pivot": {
          "x": 0.5,
          "y": 0.1
        },
        "x": 0.21,
        "y": 0.9,
        "w": 0.02,
        "h": 0.05
      },
      {
        "id": "claw4",
        "z": 14.5,
        "color": "#bbb",
        "pivot": {
          "x": 0.5,
          "y": 0.1
        },
        "x": 0.19,
        "y": 0.9,
        "w": 0.02,
        "h": 0.05
      }
    ]
  }
};

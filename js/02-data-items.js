
'use strict';

const TK_MAG={aks74u:30,aks74un:30,ak74:30,ak74n:30,ak74m:30,akm:30,akms:30,akmn:30,ak103:30,ak104:30,ak105:30,ak12:30,asval:20,'9a91':20,sr3m:30,vss:10,svd:10,sv98:10,rpk16:95,rpd:100,pkm:100,pkp:100,ash12:20,pp19:30,pm:8,pb:8,mp443:17,aps:20,mp133:6,mp153:7,mp155:6,saiga12:8,toz106:2,ks23:3};

const ARMOR={
  ssh68:{name:'SSh-68 頭盔',slot:'head',armor:30,level:2},
  sssh94:{name:'SSh-94 頭盔',slot:'head',armor:40,level:3},
  kolpak:{name:'Kolpak-1S 頭盔',slot:'head',armor:20,level:1,subArmor:[{level:1},{level:1}]},
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
  '6kh2':{name:'6Kh2 刺刀',slot:'melee',type:'刺刀',dmg:25,penMM:3,modes:['近戰'],rpm:120,range:0.15},
  '6kh5':{name:'6Kh5 刺刀',slot:'melee',type:'刺刀',dmg:26,penMM:3,modes:['近戰'],rpm:120,range:0.15},
  kukri:{name:'Kukri 彎刀',slot:'melee',type:'刀',dmg:32,penMM:3,modes:['近戰'],rpm:100,range:0.18},
  f1:{name:'F-1 手榴彈',slot:'throwable',type:'手榴彈',dmg:16,fragments:90,fragmentDamage:16,allFragmentsOnSingle:false,penMM:15,modes:['投擲'],rpm:60,range:0.6,explosive:true},
  rgd5:{name:'RGD-5 手榴彈',slot:'throwable',type:'手榴彈',dmg:12,fragments:70,fragmentDamage:12,allFragmentsOnSingle:false,penMM:15,modes:['投擲'],rpm:60,range:0.5,explosive:true},
  rgo:{name:'RGO 手榴彈',slot:'throwable',type:'手榴彈',dmg:20,fragments:85,fragmentDamage:20,allFragmentsOnSingle:false,penMM:15,modes:['投擲'],rpm:60,range:0.6,explosive:true},
  rgn:{name:'RGN 手榴彈',slot:'throwable',type:'手榴彈',dmg:18,fragments:75,fragmentDamage:18,allFragmentsOnSingle:false,penMM:15,modes:['投擲'],rpm:60,range:0.6,explosive:true},
  vog17:{name:'VOG-17 手榴彈',slot:'throwable',type:'手榴彈',dmg:15,fragments:100,fragmentDamage:15,allFragmentsOnSingle:false,penMM:15,modes:['投擲'],rpm:60,range:0.55,explosive:true},
  vog25:{name:'VOG-25 手榴彈',slot:'throwable',type:'手榴彈',dmg:16,fragments:35,fragmentDamage:16,allFragmentsOnSingle:true,penMM:15,modes:['投擲'],rpm:60,range:0.55,explosive:true},
};

const AMMO={
  '9x18_pst':{name:'9×18mm PSt',cal:'9x18',dmg:50,penMM:3,rarity:'破舊'},
  '9x18_ps':{name:'9×18mm PS',cal:'9x18',dmg:55,penMM:4,rarity:'一般'},
  '9x18_pmm':{name:'9×18mm PMM',cal:'9x18',dmg:58,penMM:5,rarity:'庫存'},
  '9x18_psv':{name:'9×18mm PSV',cal:'9x18',dmg:69,penMM:6,rarity:'精品'},
  '9x18_sp7':{name:'9×18mm SP7',cal:'9x18',dmg:77,penMM:6,rarity:'傳奇'},
  '9x18_pbm_gzh':{name:'9×18mm PM PBM gzh',cal:'9x18',dmg:40,penMM:6,rarity:'傳奇'},
  '9x19_pbp':{name:'9×19mm PBP',cal:'9x19',dmg:44,penMM:4,rarity:'破舊'},
  '9x19_ap63':{name:'9×19mm AP 6.3',cal:'9x19',dmg:52,penMM:8,rarity:'一般'},
  '9x19_pst':{name:'9×19mm PSt',cal:'9x19',dmg:54,penMM:5,rarity:'庫存'},
  '9x19_pso':{name:'9×19mm PSO',cal:'9x19',dmg:59,penMM:6,rarity:'精品'},
  '9x19_cci':{name:'9×19mm Luger CCI',cal:'9x19',dmg:70,penMM:6,rarity:'傳奇'},
  '5.45_hp':{name:'5.45×39mm HP',cal:'5.45',dmg:73,penMM:6,rarity:'破舊'},
  '5.45_ps':{name:'5.45×39mm PS',cal:'5.45',dmg:56,penMM:12,rarity:'一般'},
  '5.45_bt':{name:'5.45×39mm BT',cal:'5.45',dmg:44,penMM:17,rarity:'庫存'},
  '5.45_bp':{name:'5.45×39mm BP',cal:'5.45',dmg:48,penMM:25,rarity:'精品'},
  '5.45_7n39':{name:'5.45×39mm 7N39',cal:'5.45',dmg:37,penMM:32,rarity:'傳奇'},
  '7.62_hp':{name:'7.62×39mm HP',cal:'7.62',dmg:80,penMM:6,rarity:'破舊'},
  '7.62_fmj':{name:'7.62×39mm FMJ',cal:'7.62',dmg:63,penMM:12,rarity:'一般'},
  '7.62_ps':{name:'7.62×39mm PS',cal:'7.62',dmg:61,penMM:15,rarity:'庫存'},
  '7.62_bp':{name:'7.62×39mm BP',cal:'7.62',dmg:58,penMM:25,rarity:'精品'},
  '7.62_ma':{name:'7.62×39mm MAI AP',cal:'7.62',dmg:53,penMM:32,rarity:'傳奇'},
  '7.62x54_hp':{name:'7.62×54mmR HP BT',cal:'7.62x54',dmg:102,penMM:8,rarity:'破舊'},
  '7.62x54_fmj':{name:'7.62×54mmR FMJ',cal:'7.62x54',dmg:84,penMM:15,rarity:'一般'},
  '7.62x54_ps':{name:'7.62×54mmR PS',cal:'7.62x54',dmg:84,penMM:20,rarity:'庫存'},
  '7.62x54_bt':{name:'7.62×54mmR BT',cal:'7.62x54',dmg:78,penMM:28,rarity:'精品'},
  '7.62x54_bs':{name:'7.62×54mmR BS',cal:'7.62x54',dmg:72,penMM:32,rarity:'傳奇'},
  '9x39_fmj':{name:'9×39mm FMJ',cal:'9x39',dmg:75,penMM:4,rarity:'破舊'},
  '9x39_sp5':{name:'9×39mm SP-5',cal:'9x39',dmg:71,penMM:6,rarity:'一般'},
  '9x39_pab9':{name:'9×39mm PAB-9',cal:'9x39',dmg:62,penMM:15,rarity:'庫存'},
  '9x39_spp':{name:'9×39mm SPP',cal:'9x39',dmg:68,penMM:18,rarity:'精品'},
  '9x39_sp6':{name:'9×39mm SP-6',cal:'9x39',dmg:60,penMM:22,rarity:'傳奇'},
  '12ga_buck':{name:'12/70 5.25mm 鹿彈',cal:'12ga',dmg:37,penMM:2,rarity:'破舊',pellets:8},
  '12ga_7mm':{name:'12/70 7mm 鹿彈',cal:'12ga',dmg:39,penMM:3,rarity:'一般',pellets:8},
  '12ga_express':{name:'12/70 6.5mm Express',cal:'12ga',dmg:35,penMM:3,rarity:'庫存',pellets:9},
  '12ga_magnum':{name:'12/70 8.5mm Magnum',cal:'12ga',dmg:50,penMM:5,rarity:'傳奇',pellets:8},
  '12.7_ps12':{name:'12.7×55mm PS12',cal:'12.7',dmg:115,penMM:12,rarity:'庫存',pellets:1},
  '12.7_ps12b':{name:'12.7×55mm PS12B',cal:'12.7',dmg:102,penMM:18,rarity:'傳奇',pellets:1},
  '12.7_ps12a':{name:'12.7×55mm PS12A',cal:'12.7',dmg:165,penMM:6,rarity:'傳奇',pellets:1},
  '20x70_5.6':{name:'20/70 5.6mm Buckshot',cal:'20/70',dmg:26,penMM:2,rarity:'破舊',pellets:8},
  '20x70_6.2':{name:'20/70 6.2mm Buckshot',cal:'20/70',dmg:22,penMM:3,rarity:'一般',pellets:8},
  '20x70_7.3':{name:'20/70 7.3mm Buckshot',cal:'20/70',dmg:23,penMM:3,rarity:'庫存',pellets:9},
  '20x70_7.5':{name:'20/70 7.5mm Buckshot',cal:'20/70',dmg:25,penMM:4,rarity:'精品',pellets:8},
  '20x70_devastator':{name:'20/70 Devastator',cal:'20/70',dmg:198,penMM:6,rarity:'傳奇',pellets:1},
  '23x75_shrapnel25':{name:'23×75mmR Shrapnel-25',cal:'23x75',dmg:78,penMM:3,rarity:'庫存',pellets:8},
  '23x75_shrapnel10':{name:'23×75mmR Shrapnel-10',cal:'23x75',dmg:87,penMM:3,rarity:'精品',pellets:8},
  '23x75_shrapnel10_legend':{name:'23×75mmR Shrapnel-10',cal:'23x75',dmg:87,penMM:3,rarity:'傳奇',pellets:8},
  '23x75_barrikada':{name:'23×75mmR Barrikada',cal:'23x75',dmg:192,penMM:12,rarity:'傳奇',pellets:1},
};

const CONSUMABLES={bandage:{name:'繃帶',heal:25,healPct:0.10},water:{name:'瓶裝水',heal:15,healPct:0.05},painkiller:{name:'止痛藥',heal:20,healPct:0.08},splint:{name:'夾板',heal:20,healPct:0.08},tushonka:{name:'燉肉罐頭',heal:30,healPct:0.12},ai2:{name:'AI-2 急救包',heal:70,healPct:0.25},ifak:{name:'IFAK 急救包',heal:120,healPct:0.35},salewa:{name:'Salewa 急救包',heal:180,healPct:0.50},surv12:{name:'Surv12 野戰包',heal:250,healPct:0.70}};
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

const MATERIALS={wood:{name:'木材'},metal:{name:'金屬廢料'},screws:{name:'螺絲'},cloth:{name:'布料'},gears:{name:'齒輪'},electronics:{name:'電子零件'}};
const MATERIAL_EMOJI={wood:'🪵', metal:'🔩', screws:'🔧', cloth:'🧵', gears:'⚙️', electronics:'💡'};

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
  ssh68:1.5,sssh94:3.5,kolpak:1.9,'6b47':1.3,'6b47m':1.3,altyn:2.5,kiver:1.2,maska:2.6,zsh12m:3.7,
  balaclava:0.1,shemagh:0.15,gp7:0.5,ballglasses:0.1,
  paca:3.5,'6b13':10.6,'6b13m':9.15,'6b23':7.9,'6b231':7.9,'6b232':10.5,'6b43':20,zhuk6a:11.5,zhuk3:5.2,defender2:11.5,'6b45':13.5,redutm:9.5,
  cargopants:0.4,workboots:0.6,tactboots:0.7,lowaz:0.8,haix:0.75,belleville:0.8,
  bplarge:1.6,
  bandage:0.05,water:0.6,ai2:0.2,painkiller:0.1,tushonka:0.5,splint:0.1,salewa:1.0,ifak:0.5,surv12:1.5,
  wood:1.5,metal:2.5,screws:0.05,cloth:0.5,gears:0.3,electronics:0.4,
};
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
  ak105:{mags:[60,95],scopes:['1P87','PSO-1']},ak12:{mags:[45,60,95],scopes:['1P87','PSO-1']},
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

const SEEDS = {
  seed_potato: { name:'馬鈴薯種子', cropId:'crop_potato', growMs:1200000, baseYield:3, rotMs:1800000, autoCleanMs:600000, cleanupMs:5000, img:'seed_potato' },
  seed_carrot: { name:'胡蘿蔔種子', cropId:'crop_carrot', growMs:2100000, baseYield:2, rotMs:1800000, autoCleanMs:600000, cleanupMs:5000, img:'seed_carrot' },
  seed_cabbage:{ name:'捲心菜種子', cropId:'crop_cabbage',growMs:1500000, baseYield:2, rotMs:1800000, autoCleanMs:600000, cleanupMs:5000, img:'seed_cabbage' },
  seed_beet:   { name:'甜菜種子',   cropId:'crop_beet',   growMs:1800000, baseYield:3, rotMs:1800000, autoCleanMs:600000, cleanupMs:5000, img:'seed_beet' },
  seed_wheat:  { name:'小麥種子',   cropId:'crop_wheat',  growMs:2700000, baseYield:4, rotMs:1800000, autoCleanMs:600000, cleanupMs:5000, img:'seed_wheat' }
};
const CROP_BASE_FOOD = { crop_potato:2, crop_carrot:3, crop_cabbage:3, crop_beet:4, crop_wheat:5 };
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
const GARDEN_EXTRAS = {
  liquor: { name: '私酒', icon: '🍶', img: 'liquor', desc: '由蒸餾室釀造' }
};
function _gardenStorageKind(id){
  if(typeof SEEDS !== 'undefined' && SEEDS[id]) return 'seed';
  if(typeof CROPS !== 'undefined' && CROPS[id]) return 'crop';
  if(typeof GARDEN_EXTRAS !== 'undefined' && GARDEN_EXTRAS[id]) return 'crop';
  return null;
}
function _gardenStorageItemIcon(id, size, fallbackIcon){
  if(typeof SEEDS !== 'undefined' && SEEDS[id]) return seedImgHtml(id, size);
  if(typeof CROPS !== 'undefined' && CROPS[id]) return cropImgHtml(id, size);
  if(typeof GARDEN_EXTRAS !== 'undefined' && GARDEN_EXTRAS[id]){
    return '<img src="icons/garden/' + GARDEN_EXTRAS[id].img + '.png' + assetSuffix() + '" style="width:' + size + 'px;height:' + size + 'px;object-fit:contain;display:block" alt="">';
  }
  return fallbackIcon || '?';
}

const LEGEND_AMMO_POOL = [
  '5.45_7n39','7.62_ma','7.62x54_bs','9x39_sp6','9x18_sp7',
  '9x19_cci','12ga_magnum','12.7_ps12b','20x70_devastator','23x75_barrikada'
];
const LEGEND_THROW_POOL = ["f1","rgd5","rgo","rgn","vog17","vog25"];

const ALL_ITEMS={};
Object.assign(ALL_ITEMS,ARMOR,WEAPONS,AMMO,CONSUMABLES,MATERIALS,SEEDS,CROPS);
function itemDef(id){return ALL_ITEMS[id]||null;}
function resolveIconId(id){if(!id) return '';if(id.startsWith('named_')){const parts=id.split('_');if(parts.length>=2 && WEAPONS[parts[1]]) return parts[1];}return id;}

function assetSuffix(){ return ASSET_VERSION ? ('?v=' + ASSET_VERSION) : ''; }
function rarityBg(rarity){return RARITY_BG[rarity]||'#151210';}

function fmtNum(n){
  if(n == null || isNaN(n)) return "0";
  const v = Math.floor(Math.abs(n));
  const sign = n < 0 ? "-" : "";
  if(v < 10000) return sign + v;
  if(v < 1000000) return sign + Math.round(v / 1000) + "K";
  if(v < 10000000) return sign + (v / 1000000).toFixed(1) + "M";
  return sign + Math.round(v / 1000000) + "M";
}

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
  const ammoDef=AMMO[id];
  if(ammoDef && ammoDef.cal){
    const f=AMMO_ICON_BY_CAL[ammoDef.cal];
    if(f) return `<img src="icons/items/${f}${v}" style="width:${s}px;height:${s}px;object-fit:contain" alt="">`;
  }
  const rid=resolveIconId(id);
  return `<img src="icons/items/${rid}.png${v}" style="width:${s}px;height:${s}px;object-fit:contain" alt="">`;
}
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
function getAmmoByRarity(cal, targetRarity){
  if(!cal) return null;
  var tIdx = RARITY_ORDER.indexOf(targetRarity);
  if(tIdx < 0) return getDefaultAmmo(cal);
  var best = null, bestDiff = 999;
  for(const k in AMMO){
    if(AMMO[k].cal !== cal) continue;
    var dIdx = RARITY_ORDER.indexOf(AMMO[k].rarity);
    if(dIdx < 0 || dIdx < tIdx) continue;
    var diff = dIdx - tIdx;
    if(diff === 0) return k;
    if(diff < bestDiff){ best = k; bestDiff = diff; }
  }
  if(best) return best;
  var bestIdx2 = -1;
  for(const k in AMMO){
    if(AMMO[k].cal !== cal) continue;
    var dIdx2 = RARITY_ORDER.indexOf(AMMO[k].rarity);
    if(dIdx2 < 0) continue;
    if(dIdx2 > bestIdx2){ best = k; bestIdx2 = dIdx2; }
  }
  return best;
}
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

function armorClass(level){if(!level||level<=0)return '';const lv=Math.min(6,Math.max(1,Math.floor(level)));return ['','I','II','III','IV','V','VI'][lv]||'';}
function getHelmetTotalLevel(id){const def=ARMOR[id];if(!def||def.slot!=='head')return 0;if(def.subArmor&&def.subArmor.length){let s=0;for(const el of def.subArmor)s+=(el.level||0);return s;}return def.level||0;}
function getPlayerArmorLevel(){
  const headId=state.player.equipped.head;const topId=state.player.equipped.top;
  const hl=headId?getHelmetTotalLevel(headId):0;
  const tl=topId?((ARMOR[topId]&&ARMOR[topId].level)||0):0;
  return Math.round((hl+tl)/3);
}

function armorMMForItem(id){
  const def = ARMOR[id];
  if(!def) return 0;
  const lv = Math.min(7, Math.max(0, Math.floor(def.level || 0)));
  return ARMOR_LEVEL_TO_MM[lv] || 0;
}
function armorMMForSlot(id, slot){
  const def = ARMOR[id];
  if(!def) return 0;
  if(slot === 'head'){
    const lv = Math.min(7, Math.max(0, Math.floor(def.level || 0)));
    return ARMOR_LEVEL_TO_MM[lv] || 0;
  }
  if(slot === 'face'){
    if(def.slot !== 'head' || !def.subArmor || !def.subArmor.length) return 0;
    let sum = 0;
    for(const el of def.subArmor) sum += (el.level || 0);
    const lv = Math.min(7, Math.max(0, Math.floor(sum)));
    return ARMOR_LEVEL_TO_MM[lv] || 0;
  }
  if(slot === 'top'){
    const lv = Math.min(7, Math.max(0, Math.floor(def.level || 0)));
    return ARMOR_LEVEL_TO_MM[lv] || 0;
  }
  return 0;
}

(function(){ var s=['aks74u','aks74un','ak105','ak104','pp19','sr3m','9a91']; for(var i=0;i<s.length;i++){ if(WEAPONS[s[i]]&&WEAPONS[s[i]].type==='突擊步槍') WEAPONS[s[i]]._shortRange=true; } })();

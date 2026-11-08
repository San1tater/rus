'use strict';

const VERSION = 'v17.5';
let ASSET_VERSION = localStorage.getItem('wasteland_asset_version') || '';
const ASSET_PROBE_URL = 'icons/buildings/control.png';
const ASSET_CACHE_KEY = 'wasteland_asset_version';

const RARITY_ORDER = ['破舊','一般','庫存','精品','傳奇','具名'];
const UI_RARITY_LIST = ['破舊','一般','庫存','精品','傳奇'];
const RARITY_MULT = {'破舊':0.8,'一般':1.0,'庫存':1.5,'精品':2.5,'傳奇':5.0,'具名':5.0};
const RARITY_ICON = {'破舊':'▪','一般':'▫','庫存':'◆','精品':'★','傳奇':'✦','具名':'✦'};
const RARITY_BG = {'破舊':'#4a2e1a','一般':'#3a3a3a','庫存':'#1e4a1e','精品':'#1e3a5a','傳奇':'#5a4410','具名':'#4a205a'};

const MODE_ACCURACY = {'點射':1.6,'短點射':1.25,'長點射':1.0,'掃射':0.65,'近戰':1.0,'投擲':1.0};
const MAX_PROF_LEVEL = 50;
const MAX_PROF_RAW = 999999;
const MELEE_DURATION = 2;

const CHAR_HEIGHT_FACTOR = 0.58;
const CHAR_HEIGHT_FACTOR_BATTLE = 0.667;
const EXPLORE_HERO_X_RATIO = 0.25;
const BATTLE_GROUND_TOP_RATIO = 1.0;
const BATTLE_BOSS_HEIGHT_RATIO = 0.75;
const BATTLE_HERO_SPRITE_H = 118;
const BATTLE_HERO_FOOT_Y_RATIO = 0.95;
const BOSS_MIN_GAP = 0.12;

const WEAPON_COMBAT_RANGE = { '手槍':8,'衝鋒槍':15,'突擊步槍':30,'機槍':50,'狙擊槍':80,'霰彈槍':15,'近戰':2 };
const RPG_COMBAT_RANGE = 150;

const ENEMY_DETECT_BASE = 225;
const ENEMY_DETECT_OFFSET = 0;
const ENEMY_DETECTABLE_R = (function(){
  var out = {};
  var rarities = ['破舊','一般','庫存','精品','傳奇'];
  for(var i = 0; i < rarities.length; i++){
    var r = rarities[i];
    if(typeof RARITY_MULT[r] === 'number'){
      out[r] = Math.round(ENEMY_DETECT_BASE / RARITY_MULT[r] + ENEMY_DETECT_OFFSET);
    }
  }
  return out;
})();
const PLAYER_DETECTABLE_R = { attack:80, stealth:40 };
const ENEMY_HIT_BASE = 0.55;

const EVENT_INTERVAL_MS = 10000;
const REGION_KEYS = {'廢棄工廠':'factory','廢棄實驗室':'lab','郊區公路':'road','輻射沼澤':'swamp','廢土核心':'core'};

const WEIGHT_FREE_KG = 20;
const WEIGHT_PENALTY_PER_KG = 0.05;
const BASE_EXPLORE_INTERVAL = 10000;

const FOOD_POLICY_MULT = { full: 1.2, normal: 0.7, half: 0.5, lick: 0.3, starve: 0.0 };
const SERVANT_MAX_LV = 50;

const GRENADE_SLOTS_DEFAULT = 3;
const GRENADE_SLOTS_BOMBARDIER = 5;
const AMMOBOX_CAPACITY = 500;
const AMMOBOX_CONTAINER_WEIGHT = 1.8;

const HEAT_AMMO_IDS = new Set(['atgm','3bk29','3ubk10','pg-15v']);
const ERA_BONUS = { 1:{heat:250,ke:30}, 2:{heat:400,ke:120} };

const TALENT_AWAKEN_RATE = 0.08;
const TALENT_DEFS = {
  gunner_mastery: {kind:'crew',role:'gunner',name:'炮手專精',desc:'命中 +10%'},
  commander_sense: {kind:'crew',role:'commander',name:'車長直覺',desc:'索敵 +15%'},
  driver_instinct: {kind:'crew',role:'driver',name:'駕駛本能',desc:'速度 +10%，履帶損傷 -20%'},
  strongman: {kind:'passenger',name:'大力士',desc:'負重 +6kg'},
  bombardier: {kind:'passenger',name:'投彈手',desc:'手榴彈欄位 1→3'},
  ammo_handler: {kind:'passenger',name:'彈藥手',desc:'主武器欄可放彈藥箱'}
};

const ARMOR_LEVEL_TO_MM = {1:2, 2:5, 3:8, 4:12, 5:18, 6:25, 7:30};

function armorMMToLevel(mm){
  if(mm == null || !isFinite(mm) || mm <= 0) return 0;
  if(mm >= ARMOR_LEVEL_TO_MM[7]) return 7;
  if(mm >= ARMOR_LEVEL_TO_MM[6]) return 6;
  if(mm >= ARMOR_LEVEL_TO_MM[5]) return 5;
  if(mm >= ARMOR_LEVEL_TO_MM[4]) return 4;
  if(mm >= ARMOR_LEVEL_TO_MM[3]) return 3;
  if(mm >= ARMOR_LEVEL_TO_MM[2]) return 2;
  return 1;
}


/* rev-fix-constants-v103: 后院共享常量 */
const GARDEN_GUARD_DETECTABLE_R = 40;
/* rev142: 載員 R=80；玩家身高作為載具 R 計算基準 */
const SERVANT_DETECTABLE_R = 80;
const PLAYER_HEIGHT_M = 1.7;
const BULLET_VISUAL_RADIUS = { normal: 3, grenade: 5, missile: 6 };

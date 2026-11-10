
'use strict';

const SERVANT_TYPES = {
  farmer:  { name:'農民', targetPlot:'soil' },
  guard:   { name:'守衛', targetPlot:'tower' },
  foreman: { name:'監工', targetPlot:'shed' }
};
const SERVANT_RARITY_SLOTS = { '破舊':1, '一般':2, '庫存':4, '精品':6, '傳奇':10, '具名':10 };

function servantMaxStamina(srv){
  if(!srv) return 100;
  const mult = RARITY_MULT[srv.rarity] || 1;
  const lvBonus = 1 + ((srv.lv || 1) - 1) * 0.1;
  return Math.round(100 * mult * lvBonus);
}
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
  return Math.max(5, Math.min(75, Math.round((base + p) * acc + (scopeBonus || 0))));
}
function servantCritRate(wRarity, aRarity){
  /* rev-fix-servant-crit-delegate: 調用統一函數，與玩家一致 */
  if(typeof calcCritRate === 'function') return calcCritRate(wRarity, aRarity);
  const wm = (RARITY_MULT && RARITY_MULT[wRarity]) || 1;
  return Math.max(0.05, Math.min(0.60, 0.10 + 0.15 * (wm - 1)));
}
function servantCritMult(wRarity, aRarity){
  /* rev-fix-servant-crit-delegate: 調用統一函數，與玩家一致 */
  if(typeof calcCritMult === 'function') return calcCritMult(wRarity, aRarity);
  const am = (RARITY_MULT && RARITY_MULT[aRarity]) || 1;
  return 1.5 + 1.5 * (am - 1);
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
function servantSlots(rarity, type){
  if(type === 'guard' || type === 'foreman') return 1;
  return SERVANT_RARITY_SLOTS[rarity] || 1;
}
function servantExpNeed(lv){ return Math.max(10, lv * 40); }

var GARDEN_PLOT_TYPES = {
  soil:    { name: '土地',   icon: '', imgIcon: 'soil', desc: '基礎土地，無增減' },
  tower:   { name: '哨塔',   icon: '<span style="color:#e05252;font-weight:bold">✖</span>', desc: '自動防禦', bg: 'tower_bg' },
  shed:    { name: '工棚',   icon: '🛖', desc: '容納一個監工', bg: 'shed_bg' },
  compost: { name: '堆肥區', icon: '♻️', desc: '轉化腐爛食物', bg: 'compost_bg' },
  fridge:  { name: '保鮮櫃', icon: '🧊', desc: '作物保鮮 24h → 48h', bg: 'fridge_bg' },
  distillery: { name: '蒸餾室', icon: '🍶', desc: '作物釀成私酒', bg: 'distillery_bg' },
  black_soil: { name: '黑土', imgIcon: 'black_soil', special: true, desc: '生長 <span style="color:#4caf50">↑10%</span> ｜ 產量 <span style="color:#4caf50">↑30%</span>' },
  red_soil:   { name: '紅土', imgIcon: 'red_soil',   special: true, desc: '生長 <span style="color:#e05252">↓25%</span> ｜ 產量 <span style="color:#4caf50">↑60%</span>' }
};
var SPECIAL_SOIL_BONUS = {
  soil:       { grow: 0,     yield: 0 },
  black_soil: { grow: 0.10,  yield: 0.30 },
  red_soil:   { grow: -0.25, yield: 0.60 }
};
function _isSoilType(t){ return t === 'soil' || t === 'black_soil' || t === 'red_soil'; }
function _getSoilBonus(t){ return SPECIAL_SOIL_BONUS[t] || SPECIAL_SOIL_BONUS.soil; }

const DISTILL_PERIOD_MS = 5 * 60 * 1000;
const DISTILL_COST = 50;
const DISTILL_STAMINA = 20;

const GARDEN_MEAL_INTERVAL_MS = 3600000;
const GUARD_STAMINA_DRAIN_PER_HOUR = 120;

const FOOD_COST_BASE = { full: 20, normal: 15, half: 10, lick: 5, starve: 0 };
const RARITY_FOOD_MULT = { '破舊': 0.8, '一般': 1, '庫存': 1.5, '精品': 2.5, '傳奇': 5 };

const MERCHANT_INTERVAL_MS = 300000;
const MERCHANT_FOOD_TABLE = {
  0: { cropValue: 0 },
  1: { gears: 1, screws: 2, cropValue: 25 },
  2: { gears: 2, electronics: 1, screws: 5, cropValue: 70 },
  3: { gears: 3, electronics: 2, screws: 10, cropValue: 125 },
  4: { gears: 4, electronics: 3, screws: 15, cropValue: 250 }
};
const MERCHANT_SEED_TABLE = {
  0: { metal: 0, count: 0, rarities: [] },
  1: { metal: 2, screws: 3, count: 4, rarities: ['一般'] },
  2: { metal: 4, gears: 2, screws: 6, count: 10, rarities: ['一般','庫存'] },
  3: { metal: 6, gears: 3, electronics: 3, screws: 15, count: 24, rarities: ['一般','庫存','精品'] }
};
const MERCHANT_THROW_TABLE = {
  0: { metal: 0, count: 0, rarities: [] },
  1: { metal: 2, screws: 3, count: 1, rarities: ['一般'] },
  2: { metal: 4, gears: 2, cloth: 2, screws: 6, count: 2, rarities: ['一般','庫存'] },
  3: { metal: 6, gears: 3, cloth: 5, electronics: 3, screws: 15, count: 2, rarities: ['一般','庫存','精品'] },
  4: { foodCost: 40, count: 1, legend: true }
};
const MERCHANT_AMMO_TABLE = {
  0: { foodCost: 0, count: 0 },
  1: { foodCost: 8, count: 1 },
  2: { foodCost: 24, count: 3 },
  3: { foodCost: 56, count: 7 },
  4: { foodCost: 120, count: 15 }
};

const MERCHANT_TRADE_ITEMS = [
  { category: '種子', items: [
    { id: 'seed_stock',   name: '庫存種子包', desc: '庫存種子×2', price: 50,   rarity: '庫存', icon: '🌰', stackable: true },
    { id: 'seed_premium', name: '精品種子包', desc: '精品種子×2', price: 200,  rarity: '精品', icon: '🌰', stackable: true },
    { id: 'seed_legend',  name: '傳奇種子包', desc: '傳奇種子×1', price: 1000, rarity: '傳奇', icon: '🌰', stackable: true }
  ]},
  { category: '特殊地塊', items: [
    { id: 'black_soil', name: '黑土地', desc: '生長<span style="color:#e05252">↓20%</span> 產量<span style="color:#4caf50">↑20%</span>', price: 10000, rarity: '傳奇', imgIcon: 'black_soil', oneTime: true },
    { id: 'red_soil',   name: '紅土地', desc: '生長<span style="color:#e05252">↓40%</span> 產量<span style="color:#4caf50">↑30%</span>', price: 30000, rarity: '傳奇', imgIcon: 'red_soil',   oneTime: true }
  ]},
  { category: '補給', items: [
    { id: 'ammo_supply_stock',   name: '庫存彈藥包', desc: '庫存彈藥×30', price: 100, rarity: '庫存', imgIcon: 'ammo_pack', stackable: true },
    { id: 'ammo_supply_premium', name: '精品彈藥包', desc: '精品彈藥×40', price: 300, rarity: '精品', imgIcon: 'ammo_pack', stackable: true },
    { id: 'ammo_supply_legend',  name: '傳奇彈藥包', desc: '傳奇彈藥×50', price: 800, rarity: '傳奇', imgIcon: 'ammo_pack', stackable: true },
    { id: 'medkit',      name: '傳奇急救包', desc: '傳奇急救包×1', price: 800, rarity: '傳奇', itemIconId: 'ifak',      stackable: true },
    { id: 'f1',          name: '傳奇手榴彈', desc: 'F-1 手榴彈×1（傳奇）', price: 2000, rarity: '傳奇', itemIconId: 'f1', stackable: true }
  ]}
];

const GARDEN_RAID_INTERVAL_MS = 1 * 3600 * 1000;
const GARDEN_WORK_MS = 4000;
const GARDEN_STAMINA_PER_WORK = 5;
const GARDEN_WAKEUP_RECOVER = 0.30;
const GARDEN_SEED_ROT_MS = 48 * 3600 * 1000;

const SERVANT_LEAVE_GRACE = {
  '破舊': 12 * 3600 * 1000,
  '一般': 24 * 3600 * 1000,
  '庫存': 36 * 3600 * 1000,
  '精品': 72 * 3600 * 1000,
  '傳奇': 7 * 24 * 3600 * 1000
};
const SERVANT_LEAVE_REWARD = {
  '破舊': { seedMin: 0, seedMax: 1, matMin: 1, matMax: 2 },
  '一般': { seedMin: 1, seedMax: 1, matMin: 2, matMax: 3 },
  '庫存': { seedMin: 1, seedMax: 2, matMin: 3, matMax: 4 },
  '精品': { seedMin: 2, seedMax: 3, matMin: 4, matMax: 6 },
  '傳奇': { seedMin: 3, seedMax: 5, matMin: 6, matMax: 10 }
};

/* 花園襲擊敵人生成用（與 REGIONS.enemies 一致） */
const GARDEN_RAID_ENEMY_COUNT_BASE = 2;
const GARDEN_RAID_ENEMY_COUNT_PER_LV = 5;
const GARDEN_RAID_ENEMY_COUNT_MAX = 8;


/* ===== 補丁：FOOD_COST_PER_HOUR（原本在舊 08-garden-core.js，07 漏收） ===== */
if(typeof FOOD_COST_PER_HOUR === 'undefined'){
  var FOOD_COST_PER_HOUR = { full: 3, normal: 2, half: 1, lick: 0.5, starve: 0 };
  window.FOOD_COST_PER_HOUR = FOOD_COST_PER_HOUR;
}

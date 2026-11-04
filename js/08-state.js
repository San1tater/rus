
'use strict';

window.BUILDINGS = {
  workbench:{name:'工作台',desc:'改造傳奇武器',cost:{wood:20,metal:10,screws:5},maxLv:50},
  storage:{name:'倉庫',desc:'掉落物數量加成',cost:{wood:15,metal:5},maxLv:50},
  toilet:{name:'厠所',desc:'熟練度加成',cost:{wood:10,cloth:5},maxLv:50},
  rest:{name:'休息室',desc:'生命值成長加成',cost:{wood:20,cloth:10},maxLv:50},
  generator:{name:'發電機',desc:'加速製造與冷卻',cost:{metal:20,gears:5,electronics:3},maxLv:50},
  medbay:{name:'醫療站',desc:'加強消耗品恢復',cost:{wood:15,cloth:10,metal:5},maxLv:50},
  radio:{name:'無線電',desc:'定期資源補給',cost:{electronics:5,metal:10,gears:3},maxLv:50},
  armory:{name:'軍械庫',desc:'產出主副彈藥',cost:{metal:25,gears:8,screws:10},maxLv:50},
  station:{name:'車站',desc:'車組 / 載員 / 彈鏈',cost:{wood:100,metal:200,screws:50,gears:20},maxLv:1},
  forge:{name:'護甲車間',desc:'護甲值加成',cost:{metal:250,gears:80,screws:100},maxLv:50},
  garage:{name:'車場',desc:'載具支援 / 載具研發',cost:{metal:500,gears:100,screws:200},maxLv:50}
};

const SAVE_KEY = 'wasteland_save_v17_5';

function defaultState(){
  return {
    station:{crew:{commander:null,gunner:null,driver:null},passengers:[]},
    player:{
      level:1,exp:0,hp:100,maxHp:100,armor:0,maxArmor:0,armorLevel:0,
      equipped:{
        head:null,face:null,top:null,pants:null,shoes:null,
        backpack:'bplarge',primary:null,secondary:null,melee:null,throwable:null
      },
      equippedRarity:{backpack:'傳奇'},
      throwableStock:0,
      deadUntil:0
    },
    inventory:{},logs:[],pendingSalvageEquipped:{},
    proficiency:{
      primary:0,secondary:0,melee:0,throwable:0,
      '突擊步槍':0,'機槍':0,'衝鋒槍':0,'狙擊槍':0,'手槍':0,'霰彈槍':0,
      '刺刀':0,'刀':0,'手榴彈':0,
      craft:0,salvage:0,drop:0
    },
    preferences:{
      ammoExplore:{priority:'一般',fallback:'desc',exclude:[]},
      ammoCombat:{priority:'傳奇',fallback:'desc',exclude:[]},
      consume:{priority:'一般',fallback:'desc',exclude:[]},
      throwableExplore:{priority:'破舊',fallback:'asc',exclude:['精品','傳奇']},
      throwableCombat:{priority:'傳奇',fallback:'desc',exclude:[]},
      actionMode:'attack',
      regions:['廢棄工廠'],
      ammoOrder:{primary:[],secondary:[],throwable:[]}
    },
    exploreDelayUntil:0,
    pendingHealFull:false,
    regionProgress:{},
    activeRegion:null,
    stashedWeapons:{},
    base:{slots:new Array(12).fill(null).map(function(_,i){return i===0?{id:'control',lv:1}:null;})},
    garden:{plots:new Array(20).fill(null),storage:{}},
    servants:[],
    unlockedEquip:{},
    seals:{},
    defeatedBosses:[],
    unlockedRegions:['廢棄工廠'],
    radioUses:0,radioLastResetDate:'',radioCooldownUntil:0,
    lastSeen:Date.now(),
    radioLastTick:0,armoryLastTick:0,
    crafting:[],
    stats:{kills:0,deaths:0,bossKills:0},
    explore:{},
    garage:{
      currentVehicle:'btr80',ownedVehicles:['btr80'],
      vehicleExp:{btr80:0},researchTarget:null,researchProgress:{},
      globalExp:0,camo:{},extraExp:{}
    },
    vehicleAmmo:{},
    vehicleDamage:{}
  };
}

let state = defaultState();

function save(){
  state.lastSeen = Date.now();
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch(e){}
}

function load(){
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if(!raw) return false;
    const s = JSON.parse(raw);
    const d = defaultState();
    state = Object.assign(d, s);

    state.player = Object.assign(d.player, s.player || {});
    state.player.equipped = Object.assign(d.player.equipped, (s.player && s.player.equipped) || {});
    state.player.throwableStock = parseInt(state.player.throwableStock || 0, 10);
    if(typeof state.player.deadUntil !== 'number') state.player.deadUntil = 0;

    state.proficiency = Object.assign(d.proficiency, s.proficiency || {});

    state.preferences = Object.assign(d.preferences, s.preferences || {});
    state.preferences.regions = (state.preferences.regions || []).filter(function(r){ return !!REGIONS[r]; });
    if(!Array.isArray(state.unlockedRegions)) state.unlockedRegions = d.unlockedRegions.slice();
    state.unlockedRegions = state.unlockedRegions.filter(function(r){ return !!REGIONS[r]; });
    if(state.unlockedRegions.indexOf('廢棄工廠') === -1) state.unlockedRegions.push('廢棄工廠');

    if(!Array.isArray(state.defeatedBosses)) state.defeatedBosses = [];
    {
      var _map = [
        {region:'廢棄實驗室', boss:'factory_king'},
        {region:'郊區公路', boss:'lab_queen'},
        {region:'輻射沼澤', boss:'road_tyrant'},
        {region:'廢土核心', boss:'swamp_hydra'}
      ];
      for(var mi = 0; mi < _map.length; mi++){
        var m = _map[mi];
        if(state.defeatedBosses.indexOf(m.boss) === -1){
          state.unlockedRegions = state.unlockedRegions.filter(function(x){ return x !== m.region && x !== m.region + 'II'; });
          state.preferences.regions = state.preferences.regions.filter(function(x){ return x !== m.region && x !== m.region + 'II'; });
        }
      }
    }

    state.base = Object.assign(d.base, s.base || {});
    if(!Array.isArray(state.base.slots)) state.base.slots = [];
    while(state.base.slots.length < 12) state.base.slots.push(null);
    if(state.base.slots.length > 12) state.base.slots.length = 12;
    if(!state.base.slots[0] || state.base.slots[0].id !== 'control') state.base.slots[0] = {id:'control',lv:1};

    if(!state.garden || typeof state.garden !== 'object') state.garden = {plots:new Array(20).fill(null), storage:{}};
    if(!Array.isArray(state.garden.plots)) state.garden.plots = new Array(20).fill(null);
    if(!Array.isArray(state.garden.battleLog)) state.garden.battleLog = [];
    if(!Array.isArray(state.garden.log)) state.garden.log = [];
    if(typeof state.garden.lastMealAt !== 'number') state.garden.lastMealAt = Math.floor(Date.now() / 3600000) * 3600000;
    while(state.garden.plots.length < 20) state.garden.plots.push(null);
    if(state.garden.plots.length > 20) state.garden.plots.length = 20;
    if(!state.garden.storage || typeof state.garden.storage !== 'object') state.garden.storage = {};
    if(typeof state.garden.food !== 'number') state.garden.food = 0;
    if(!state.garden.merchant || typeof state.garden.merchant !== 'object') state.garden.merchant = { foodLv:0, seedLv:0, throwLv:0, ammoLv:0, lastFood:0, lastSeed:0, lastThrow:0, lastAmmo:0, lastFeed:0 };
    if(typeof state.garden.nextServantTag !== 'number') state.garden.nextServantTag = 1;

    if(!Array.isArray(state.servants)) state.servants = [];
    for(var si = 0; si < state.servants.length; si++){
      var srv = state.servants[si];
      if(typeof srv.stamina !== 'number') srv.stamina = servantEffectiveMaxStamina(srv);
      if(!srv.foodPolicy) srv.foodPolicy = 'normal';
      if(typeof srv.resting !== 'boolean') srv.resting = false;
      if(typeof srv._starve !== 'boolean') srv._starve = false;
      if(!Array.isArray(srv.assignedPlots)) srv.assignedPlots = [];
      if(!Array.isArray(srv.talents)) srv.talents = [];
    }

    if(!state.explore || typeof state.explore !== 'object') state.explore = {};

    if(!state.garage || typeof state.garage !== 'object') state.garage = {};
    if(!Array.isArray(state.garage.ownedVehicles)) state.garage.ownedVehicles = ['btr80'];
    if(!state.garage.vehicleExp || typeof state.garage.vehicleExp !== 'object') state.garage.vehicleExp = {btr80:0};
    if(!state.garage.currentVehicle || !VEHICLES[state.garage.currentVehicle]) state.garage.currentVehicle = 'btr80';
    if(!state.garage.camo || typeof state.garage.camo !== 'object') state.garage.camo = {};
    if(!state.garage.researchProgress || typeof state.garage.researchProgress !== 'object') state.garage.researchProgress = {};
    if(typeof state.garage.globalExp !== 'number') state.garage.globalExp = 0;

    if(!state.vehicleAmmo || typeof state.vehicleAmmo !== 'object') state.vehicleAmmo = {};
    if(!state.vehicleDamage || typeof state.vehicleDamage !== 'object') state.vehicleDamage = {};

    if(!state.stashedWeapons) state.stashedWeapons = {};
    if(!state.pendingSalvageEquipped) state.pendingSalvageEquipped = {};
    if(!state.seals || typeof state.seals !== 'object') state.seals = {};
    for(var sk in state.seals){ state.seals[sk] = Math.max(0, parseInt(state.seals[sk] || 0, 10)); }
    if(!state.stats) state.stats = {kills:0, deaths:0, bossKills:0};

    removeInvalidInventoryItems();
    consolidateInventoryDuplicates();
    _cleanupAmmoRarity();
    _cleanGardenStorageRarity();

    for(var slot in state.player.equipped){
      var id = state.player.equipped[slot];
      if(id && !ALL_ITEMS[id] && id.indexOf('named_') !== 0){
        state.player.equipped[slot] = null;
        delete state.player.equippedRarity[slot];
      }
    }

    var _regen = function(id){
      if(!id || id.indexOf('named_') !== 0) return;
      var parts = id.split('_');
      if(parts.length >= 4){
        var baseId = parts[1];
        var mag = parts[2] === 'x' ? null : parseInt(parts[2], 10);
        var scope = parts[3] === 'x' ? null : parts[3];
        if(WEAPONS[baseId]) getOrCreateNamedItem(baseId, mag, scope);
      }
    };
    for(var ik in state.inventory) _regen(ik.split('@')[0]);
    for(var sk2 in state.player.equipped) _regen(state.player.equipped[sk2]);

    _initUnlockedFrom();

    return true;
  } catch(e){
    console.warn('[load] err:', e);
    return false;
  }
}

// ===== 通用工具 =====
function $(s, e){ return (e || document).querySelector(s); }
function $$(s, e){ return Array.from((e || document).querySelectorAll(s)); }
function el(t, c, h){ var e = document.createElement(t); if(c) e.className = c; if(h != null) e.innerHTML = h; return e; }
function pick(a){ return a[Math.floor(Math.random() * a.length)]; }
function pickN(a, n){ var c = a.slice(), r = []; for(var i = 0; i < n && c.length; i++){ r.push(c.splice(Math.floor(Math.random() * c.length), 1)[0]); } return r; }
function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }
function rnd(a, b){ return a + Math.random() * (b - a); }
function rndInt(a, b){ return Math.floor(rnd(a, b + 1)); }
function fmtTime(ts){ var d = new Date(ts); return String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0') + ':' + String(d.getSeconds()).padStart(2,'0'); }
function rarityClass(r){ return 'r-' + r; }

// ===== 背包 =====
function invKey(id, r){ return id + '@' + r; }
function invAddRaw(id, r, c){
  if(c <= 0) return;
  if(!ALL_ITEMS[id] && id.indexOf('named_') !== 0){
    console.warn('[invAddRaw] 非法物品', id);
    return;
  }
  var k = invKey(id, r);
  state.inventory[k] = (state.inventory[k] || 0) + c;
  if(ALL_ITEMS[id] && ALL_ITEMS[id].slot){
    if(!state.unlockedEquip) state.unlockedEquip = {};
    state.unlockedEquip[id + '@' + r] = true;
  }
}
function invRemove(id, r, c){
  if(typeof SEEDS !== 'undefined' && SEEDS[id]){ return gardenStorageRemove(id, r, c); }
  var k = invKey(id, r);
  if(!state.inventory[k] || state.inventory[k] < c) return false;
  state.inventory[k] -= c;
  if(state.inventory[k] <= 0) delete state.inventory[k];
  return true;
}
function invCount(id, r){ return state.inventory[invKey(id, r)] || 0; }
function invList(){
  var l = [];
  for(var k in state.inventory){
    var p = k.split('@');
    if(p.length !== 2) continue;
    var id = p[0], r = p[1];
    var def = itemDef(id);
    if(!def && id.indexOf('named_') !== 0) continue;
    l.push({id:id, rarity:r, count:state.inventory[k], def:def});
  }
  return l;
}
function _initUnlockedFrom(){
  if(!state.unlockedEquip || typeof state.unlockedEquip !== 'object') state.unlockedEquip = {};
  for(var k in state.inventory){
    var p = k.split('@');
    if(p.length !== 2) continue;
    var d = ALL_ITEMS[p[0]];
    if(d && d.slot) state.unlockedEquip[k] = true;
  }
  for(var slot in state.player.equipped){
    var id = state.player.equipped[slot];
    if(!id) continue;
    var rar = state.player.equippedRarity[slot] || '一般';
    var d2 = ALL_ITEMS[id];
    if(d2 && d2.slot) state.unlockedEquip[id + '@' + rar] = true;
  }
}
function removeInvalidInventoryItems(){
  var removed = [];
  for(var k in state.inventory){
    var id = k.split('@')[0];
    if(!ALL_ITEMS[id] && id.indexOf('named_') !== 0){
      removed.push({id:id, cnt:state.inventory[k]});
      delete state.inventory[k];
    }
  }
  return removed;
}
function _cleanupAmmoRarity(){
  var toRemove = [], toAdd = {};
  for(var k in state.inventory){
    var p = k.split('@');
    if(p.length !== 2) continue;
    var id = p[0], rar = p[1];
    var d = AMMO[id];
    if(!d) continue;
    if(rar !== d.rarity){
      toRemove.push(k);
      var nk = id + '@' + d.rarity;
      toAdd[nk] = (toAdd[nk] || 0) + state.inventory[k];
    }
  }
  for(var i = 0; i < toRemove.length; i++) delete state.inventory[toRemove[i]];
  for(var k2 in toAdd) state.inventory[k2] = (state.inventory[k2] || 0) + toAdd[k2];
}
function consolidateInventoryDuplicates(){
  var _keep = {};
  for(var k in state.inventory){
    var parts = k.split('@');
    var id = parts[0], rar = parts[1];
    if(!id || id.indexOf('named_') === 0) continue;
    var cat = itemCat(id);
    if(cat !== 'weapon' && cat !== 'armor') continue;
    var m = RARITY_MULT[rar] || 1;
    if(!_keep[id] || m > _keep[id].m){ _keep[id] = {m:m, k:k}; }
  }
  var _toSalvage = [];
  for(var k2 in state.inventory){
    var p2 = k2.split('@');
    var id2 = p2[0], rar2 = p2[1];
    if(!id2 || id2.indexOf('named_') === 0) continue;
    if(!_keep[id2]) continue;
    if(k2 === _keep[id2].k) continue;
    _toSalvage.push({id:id2, rar:rar2, cnt:state.inventory[k2], k:k2});
  }
  for(var i = 0; i < _toSalvage.length; i++){
    var s = _toSalvage[i];
    delete state.inventory[s.k];
    salvageToMaterials(s.id, s.rar, s.cnt);
  }
  return _toSalvage;
}
function salvageToMaterials(id, rarity, count){
  var cat = itemCat(id);
  var mult = {'破舊':1,'一般':2,'庫存':3,'精品':5,'傳奇':8,'具名':8}[rarity] || 1;
  var mats = [];
  if(cat === 'armor') mats = [['cloth', mult], ['metal', mult]];
  else if(cat === 'weapon'){
    mats = [['metal', mult], ['screws', mult]];
    var def = itemDef(id);
    if(def && def.cal){
      var mag = def.mag || 10;
      var ammos = Object.keys(AMMO).filter(function(k){ return AMMO[k].cal === def.cal; });
      if(ammos.length){
        var aid = pick(ammos);
        invAddRaw(aid, AMMO[aid].rarity, mag * count);
      }
    }
  }
  else if(cat === 'ammo') mats = [['metal', Math.max(1, Math.floor(mult / 2))]];
  else if(cat === 'consume') mats = [['cloth', mult]];
  else return false;
  for(var i = 0; i < mats.length; i++){
    invAddRaw(mats[i][0], '一般', mats[i][1] * count);
  }
  addProf('salvage', 0.5 * count);
  return true;
}
function invAdd(id, rarity, count){
  if(count <= 0) return;
  if(typeof SEEDS !== 'undefined' && SEEDS[id]){ gardenStorageAdd(id, rarity, count); return; }
  if(!ALL_ITEMS[id] && id.indexOf('named_') !== 0){
    console.warn('[invAdd] 非法物品', id);
    return;
  }
  var cat = itemCat(id);

  if(cat === 'weapon' && id.indexOf('named_') !== 0 && rarity === '傳奇'){
    var _pfx = 'named_' + id + '_';
    var _hasNamed = false;
    for(var k in state.inventory){
      var _iid = k.split('@')[0];
      if(_iid.indexOf(_pfx) === 0){ _hasNamed = true; break; }
    }
    if(!_hasNamed){
      for(var s in state.player.equipped){
        var _eid = state.player.equipped[s];
        if(_eid && _eid.indexOf(_pfx) === 0){ _hasNamed = true; break; }
      }
    }
    if(_hasNamed){ salvageToMaterials(id, rarity, count); return; }
  }

  if(cat === 'weapon' || cat === 'armor'){
    var newMult = RARITY_MULT[rarity] || 1;
    var maxInvMult = 0, maxInvKey = null;
    for(var k2 in state.inventory){
      var p2 = k2.split('@');
      if(p2[0] !== id) continue;
      var m = RARITY_MULT[p2[1]] || 1;
      if(m > maxInvMult){ maxInvMult = m; maxInvKey = k2; }
    }
    var maxEqMult = 0, maxEqSlot = null;
    for(var s2 in state.player.equipped){
      if(state.player.equipped[s2] === id){
        var eRar = state.player.equippedRarity[s2] || '一般';
        var m2 = RARITY_MULT[eRar] || 1;
        if(m2 > maxEqMult){ maxEqMult = m2; maxEqSlot = s2; }
      }
    }
    var maxExisting = Math.max(maxInvMult, maxEqMult);
    if(maxExisting > 0){
      if(newMult <= maxExisting){ salvageToMaterials(id, rarity, count); return; }
      else {
        var _toDel = [];
        for(var k3 in state.inventory){
          var p3 = k3.split('@');
          if(p3[0] !== id) continue;
          var m3 = RARITY_MULT[p3[1]] || 1;
          if(m3 < newMult) _toDel.push({k:k3, rar:p3[1], cnt:state.inventory[k3]});
        }
        for(var di = 0; di < _toDel.length; di++){
          delete state.inventory[_toDel[di].k];
          salvageToMaterials(id, _toDel[di].rar, _toDel[di].cnt);
        }
        if(maxEqSlot){
          if(!state.pendingSalvageEquipped) state.pendingSalvageEquipped = {};
          state.pendingSalvageEquipped[maxEqSlot] = true;
        }
      }
    }
  }

  invAddRaw(id, rarity, count);
}

// ===== 材料 =====
function materialEquivalent(id){
  var eq = 0;
  for(var k in state.inventory){
    var p = k.split('@');
    if(p[0] !== id) continue;
    eq += state.inventory[k] * (RARITY_MULT[p[1]] || 1);
  }
  return Math.round(eq);
}
function consumeMaterial(id, amount){
  var order = ['破舊','一般','庫存','精品','傳奇'];
  var remaining = amount;
  for(var i = 0; i < order.length; i++){
    if(remaining <= 0) break;
    var rar = order[i];
    var k = invKey(id, rar);
    var have = state.inventory[k] || 0;
    if(have <= 0) continue;
    var mult = RARITY_MULT[rar];
    var need = Math.ceil(remaining / mult);
    var use = Math.min(have, need);
    if(use > 0){
      state.inventory[k] -= use;
      if(state.inventory[k] <= 0) delete state.inventory[k];
      remaining -= use * mult;
    }
  }
  return remaining <= 0.01;
}

// ===== 重量 =====
const HELMET_MASK_WEIGHT = { altyn:1.4, kiver:1.2, maska:1.1, zsh12m:1.0 };
function getItemWeight(id, rarity){
  if(!id) return 0;
  var def = itemDef(id);
  var baseId = id;
  if(def && def.named && def.baseId) baseId = def.baseId;
  var w = ITEM_WEIGHT[baseId] || 0;
  if(def && def.slot === 'head' && HELMET_MASK_WEIGHT[baseId]){
    w += HELMET_MASK_WEIGHT[baseId];
  }
  if(def && def.mag && def.cal){
    var aw = AMMO_UNIT_WEIGHT[def.cal] || 0;
    w += def.mag * aw;
  }
  return w;
}
function getTotalWeight(){
  var w = 0;
  for(var slot in state.player.equipped){
    var id = state.player.equipped[slot];
    if(!id) continue;
    w += getItemWeight(id, state.player.equippedRarity[slot] || '一般');
  }
  var tcount = getThrowableCount();
  var tid = state.player.equipped.throwable;
  if(tid && tcount > 0) w += (ITEM_WEIGHT[tid] || 0.5) * tcount;
  return Math.round(w * 100) / 100;
}
function getWeightColor(w){
  if(w < WEIGHT_FREE_KG) return '#4caf50';
  var excess = w - WEIGHT_FREE_KG;
  var ratio = Math.min(1, excess / 30);
  var r = Math.round(232 + (224 - 232) * ratio);
  var g = Math.round(163 - (163 - 82) * ratio);
  var b = Math.round(61 - (61 - 82) * ratio);
  return 'rgb(' + r + ',' + g + ',' + b + ')';
}

// ===== 玩家屬性 =====
function calcMaxHp(){
  var rl = getBuildingLv('rest');
  var base = 1 + 0.1 * Math.pow(1.02, rl);
  return Math.round(100 * Math.pow(base, state.player.level - 1));
}
function equipArmorValue(id, rarity){
  var def = ARMOR[id];
  if(!def) return 0;
  if(def.slot === 'backpack') return 0;
  var base = 0;
  if(def.slot === 'head'){
    base = 10 * getHelmetTotalLevel(id);
  } else if(def.slot === 'top'){
    base = 10 * (def.level || 1) * 1.5;
    if(def.armored) base *= 1.2;
  } else {
    base = 10 * (def.level || 1);
  }
  return Math.round(base * (RARITY_MULT[rarity] || 1));
}
function refreshPlayerStats(){
  var prevMaxArmor = state.player.maxArmor || 0;
  state.player.maxHp = calcMaxHp();
  var armor = 0;
  var slots = ['head','face','top','pants','shoes'];
  for(var i = 0; i < slots.length; i++){
    var slot = slots[i];
    var id = state.player.equipped[slot];
    if(id){
      var rar = state.player.equippedRarity[slot] || '一般';
      armor += equipArmorValue(id, rar);
    }
  }
  var forgeLv = getBuildingLv('forge');
  if(forgeLv > 0) armor = Math.round(armor * (1 + forgeLv * 0.03));
  state.player.maxArmor = armor;
  state.player.armorLevel = getPlayerArmorLevel();
  var prevLoss = Math.max(0, prevMaxArmor - (state.player.armor || 0));
  if(armor !== prevMaxArmor){
    state.player.armor = Math.max(0, armor - prevLoss);
  }
  if(state.player.hp > state.player.maxHp) state.player.hp = state.player.maxHp;
  if(state.player.armor > state.player.maxArmor) state.player.armor = state.player.maxArmor;
  if(state.player.armor < 0) state.player.armor = 0;
  if(typeof updatePlayerStatPanel === 'function') updatePlayerStatPanel();
}
function addExp(n){
  state.player.exp += n;
  var need = Math.round(50 * Math.pow(1.15, state.player.level - 1));
  while(state.player.exp >= need){
    state.player.exp -= need;
    state.player.level++;
    refreshPlayerStats();
    state.player.hp = state.player.maxHp;
    pushLog('<span class="pl">玩家</span> 升級至 <b>Lv.' + state.player.level + '</b>，最大生命 ' + state.player.maxHp + '。', [], 'explore');
    need = Math.round(50 * Math.pow(1.15, state.player.level - 1));
  }
}
function addProf(cat, n){
  var tl = getBuildingLv('toilet');
  var m = 1 + tl * 0.02;
  state.proficiency[cat] = Math.min(MAX_PROF_RAW, (state.proficiency[cat] || 0) + n * m);
}
function getHitRate(weaponType, mode, scopeBonus){
  var base = 10, p = 0;
  var w = state.player.equipped.primary;
  var s = state.player.equipped.secondary;
  var m = state.player.equipped.melee;
  var t = state.player.equipped.throwable;
  var _wd = itemDef(w), _sd = itemDef(s), _md = itemDef(m), _td = itemDef(t);
  if(_wd && _wd.type === weaponType) p += Math.floor(state.proficiency.primary || 0);
  if(_sd && _sd.type === weaponType) p += Math.floor(state.proficiency.secondary || 0);
  if(_md && _md.type === weaponType) p += Math.floor(state.proficiency.melee || 0);
  if(_td && _td.type === weaponType) p += Math.floor(state.proficiency.throwable || 0);
  p += Math.floor(state.proficiency[weaponType] || 0);
  return clamp(Math.round((base + p) * (MODE_ACCURACY[mode] || 1) + (scopeBonus || 0)), 5, 75);
}
function calcCritRate(wr, ar){ return clamp(Math.round(10 * (RARITY_MULT[wr] || 1) * (RARITY_MULT[ar] || 1)) / 100, 0, 0.85); }
function calcCritMult(wr, ar){ return 1.5 * (RARITY_MULT[wr] || 1) * (RARITY_MULT[ar] || 1); }

// ===== 装备 / 建築 =====
function equippedWeapon(slot){
  var id = state.player.equipped[slot];
  if(!id) return null;
  var rar = state.player.equippedRarity[slot] || '一般';
  var def = itemDef(id);
  if(!def) return null;
  return {id:id, rarity:rar, def:def, slot:slot};
}
function getBuildingLv(id){
  for(var i = 0; i < state.base.slots.length; i++){
    var s = state.base.slots[i];
    if(s && s.id === id){
      var raw = s.lv || 1;
      var mx = (BUILDINGS[id] && BUILDINGS[id].maxLv) || 999;
      return Math.min(raw, mx);
    }
  }
  return 0;
}
function buildingBonusText(bid, lv){
  switch(bid){
    case 'workbench':{
      var c = Math.min(50, Math.max(1, lv));
      var s = Math.round(86400 * Math.pow(300 / 86400, (c - 1) / 49));
      var m = Math.round(s / 60);
      var t = m < 60 ? (m + ' 分鐘') : (Math.round(m / 60) + ' 小時');
      return '改造所需：' + t + '/件';
    }
    case 'storage': return '掉落數量 +' + (lv * 2) + '%';
    case 'toilet': return '熟練度獲取 +' + (lv * 2) + '%';
    case 'rest': return '生命成長率 ' + (0.1 * Math.pow(1.02, lv) * 100).toFixed(2) + '%';
    case 'generator': return '製造/冷卻加速 +' + (lv * 4) + '%';
    case 'medbay': return '消耗品恢復 +' + (lv * 3) + '%';
    case 'forge': return '護甲值 +' + (lv * 3) + '%';
    case 'radio': return '補給量 ×' + (1 + lv * 0.3).toFixed(1);
    case 'armory':{
      var r = '一般';
      if(lv <= 10) r = '破舊';
      else if(lv <= 20) r = '一般';
      else if(lv <= 35) r = '庫存';
      else r = '精品';
      return '產出主副彈藥（當前稀有度：' + r + '）';
    }
    case 'station': return '車組 / 載員 / 彈鏈';
    case 'garage': return '電台次數上限 ' + lv;
    default: return '';
  }
}

// ===== 彈藥 =====
function getAmmoByCal(cal){
  var l = [];
  for(var k in state.inventory){
    var p = k.split('@');
    if(p.length !== 2) continue;
    var id = p[0], r = p[1];
    var d = AMMO[id];
    if(!d || d.cal !== cal) continue;
    var cnt = state.inventory[k];
    if(!cnt || cnt <= 0) continue;
    l.push({id:id, rarity:r, count:cnt, def:d});
  }
  return l;
}
function _ammoOrderKey(slot){
  var id = state.player.equipped[slot];
  if(!id) return slot;
  return slot + ':' + id;
}
function getAmmoOrder(slot){
  var o = state.preferences.ammoOrder || {};
  var key = _ammoOrderKey(slot);
  if(Array.isArray(o[key])) return o[key];
  if(Array.isArray(o[slot])) return o[slot];
  return [];
}
function setAmmoOrder(slot, order){
  var o = state.preferences.ammoOrder = state.preferences.ammoOrder || {};
  var key = _ammoOrderKey(slot);
  o[key] = order.slice();
  delete o[slot];
  save();
}
function getThrowableOrder(){
  var o = state.preferences.ammoOrder || {};
  var id = state.player.equipped.throwable;
  var key = id ? ('throwable:' + id) : 'throwable';
  if(Array.isArray(o[key])) return o[key];
  if(Array.isArray(o['throwable'])) return o['throwable'];
  return [];
}
function setThrowableOrder(order){
  var o = state.preferences.ammoOrder = state.preferences.ammoOrder || {};
  var id = state.player.equipped.throwable;
  var key = id ? ('throwable:' + id) : 'throwable';
  o[key] = order.slice();
  delete o['throwable'];
  save();
}
function pickAmmoByPreferenceOrOrder(cal, context){
  var allOrders = state.preferences.ammoOrder || {};
  var _ctx = (context === 'combat')
    ? (state.preferences.ammoCombat || {exclude:[]})
    : (state.preferences.ammoExplore || {exclude:[]});
  var _ex = _ctx.exclude || [];
  var slots = ['primary','secondary'];
  for(var i = 0; i < slots.length; i++){
    var s = slots[i];
    var wid = state.player.equipped[s];
    if(!wid) continue;
    var key = s + ':' + wid;
    var order = Array.isArray(allOrders[key]) ? allOrders[key] : (Array.isArray(allOrders[s]) ? allOrders[s] : []);
    for(var j = 0; j < order.length; j++){
      var aid = order[j];
      var d = AMMO[aid];
      if(!d || d.cal !== cal) continue;
      if(_ex.indexOf(d.rarity) !== -1) continue;
      var cnt = invCount(aid, d.rarity);
      if(cnt > 0) return {id:aid, rarity:d.rarity, count:cnt, def:d};
    }
  }
  return pickAmmoByPreference(cal, context);
}
function pickThrowableByPreferenceOrOrder(context){
  var order = getThrowableOrder();
  var _ctx = (context === 'combat')
    ? (state.preferences.throwableCombat || {exclude:[]})
    : (state.preferences.throwableExplore || {exclude:['精品','傳奇']});
  var _ex = _ctx.exclude || [];
  if(order.length){
    for(var i = 0; i < order.length; i++){
      var tid = order[i];
      var d = WEAPONS[tid];
      if(!d || d.slot !== 'throwable') continue;
      for(var j = 0; j < RARITY_ORDER.length; j++){
        var rar = RARITY_ORDER[j];
        if(_ex.indexOf(rar) !== -1) continue;
        var cnt = invCount(tid, rar);
        if(cnt > 0) return {id:tid, rarity:rar, count:cnt, def:d};
      }
    }
  }
  return pickThrowableByPreference(context);
}
function pickAmmoByPreference(cal, context){
  var l = getAmmoByCal(cal);
  if(!l.length) return null;
  var ctx = (context === 'combat')
    ? (state.preferences.ammoCombat || {priority:'傳奇',fallback:'desc',exclude:[]})
    : (state.preferences.ammoExplore || {priority:'一般',fallback:'desc',exclude:[]});
  var ex = ctx.exclude || [];
  var filtered = l.filter(function(a){ return ex.indexOf(a.rarity) === -1; });
  if(!filtered.length) return null;
  var pri = ctx.priority || '一般';
  if(ex.indexOf(pri) === -1){
    var primary = filtered.filter(function(a){ return a.rarity === pri; });
    if(primary.length) return pick(primary);
  }
  var fb = ctx.fallback || 'desc';
  var order = (fb === 'asc')
    ? ['破舊','一般','庫存','精品','傳奇']
    : ['傳奇','精品','庫存','一般','破舊'];
  for(var i = 0; i < order.length; i++){
    var rar = order[i];
    var s = filtered.filter(function(a){ return a.rarity === rar; });
    if(s.length) return pick(s);
  }
  return pick(filtered);
}
function pickThrowableByPreference(context){
  var ctx = (context === 'combat')
    ? (state.preferences.throwableCombat || {priority:'傳奇',fallback:'desc',exclude:[]})
    : (state.preferences.throwableExplore || {priority:'破舊',fallback:'asc',exclude:['精品','傳奇']});
  var ex = ctx.exclude || [];
  var items = [];
  for(var k in state.inventory){
    var p = k.split('@');
    var id = p[0], rar = p[1];
    var d = WEAPONS[id];
    if(!d || d.slot !== 'throwable') continue;
    var cnt = state.inventory[k];
    if(!cnt || cnt <= 0) continue;
    if(ex.indexOf(rar) !== -1) continue;
    items.push({id:id, rarity:rar, count:cnt, def:d});
  }
  if(!items.length) return null;
  var pri = ctx.priority || '一般';
  var primary = items.filter(function(a){ return a.rarity === pri; });
  if(primary.length) return pick(primary);
  var fb = ctx.fallback || 'desc';
  var order = (fb === 'asc')
    ? ['破舊','一般','庫存','精品','傳奇']
    : ['傳奇','精品','庫存','一般','破舊'];
  for(var i = 0; i < order.length; i++){
    var rar = order[i];
    var s = items.filter(function(a){ return a.rarity === rar; });
    if(s.length) return pick(s);
  }
  return pick(items);
}
function findNextConsumable(){
  var ctx = state.preferences.consume || {priority:'一般',fallback:'desc',exclude:[]};
  var ex = ctx.exclude || [];
  var items = [];
  for(var k in state.inventory){
    var p = k.split('@');
    var id = p[0], r = p[1];
    if(!CONSUMABLES[id]) continue;
    if(ex.indexOf(r) !== -1) continue;
    items.push({id:id, rarity:r, count:state.inventory[k]});
  }
  if(!items.length) return null;
  var pri = ctx.priority;
  if(ex.indexOf(pri) === -1){
    var p2 = items.filter(function(a){ return a.rarity === pri; });
    if(p2.length) return p2[0];
  }
  var fb = ctx.fallback || 'desc';
  var order = (fb === 'asc')
    ? ['破舊','一般','庫存','精品','傳奇']
    : ['傳奇','精品','庫存','一般','破舊'];
  for(var i = 0; i < order.length; i++){
    var r = order[i];
    var s = items.filter(function(a){ return a.rarity === r; });
    if(s.length) return s[0];
  }
  return items[0];
}

// ===== 投擲物 =====
function equipThrowable(id, rarity){
  var k = invKey(id, rarity);
  var total = state.inventory[k] || 0;
  delete state.inventory[k];
  state.player.throwableStock = total;
  state.player.equipped.throwable = id;
  state.player.equippedRarity.throwable = rarity;
  if(typeof _refreshThrowableSlot === 'function') _refreshThrowableSlot();
}
function unequipThrowable(){
  var id = state.player.equipped.throwable;
  if(!id) return;
  var rarity = state.player.equippedRarity.throwable || '一般';
  var cnt = state.player.throwableStock || 0;
  if(cnt > 0) invAddRaw(id, rarity, cnt);
  state.player.throwableStock = 0;
  state.player.equipped.throwable = null;
  delete state.player.equippedRarity.throwable;
  if(typeof _refreshThrowableSlot === 'function') _refreshThrowableSlot();
}
function getThrowableCount(){ return parseInt(state.player.throwableStock || 0, 10); }
function ensureThrowableFromBackpack(context){
  if(getThrowableCount() > 0) return true;
  var _ctx = context || 'combat';
  var t = (_ctx === 'combat')
    ? pickThrowableByPreferenceOrOrder(_ctx)
    : pickThrowableByPreference(_ctx);
  if(!t) return false;
  var total = invCount(t.id, t.rarity);
  if(total <= 0) return false;
  delete state.inventory[invKey(t.id, t.rarity)];
  state.player.equipped.throwable = t.id;
  state.player.equippedRarity.throwable = t.rarity;
  state.player.throwableStock = total;
  if(typeof _refreshThrowableSlot === 'function') _refreshThrowableSlot();
  return true;
}

// ===== 花園倉庫 =====
function _gardenStorageInit(){
  if(!state.garden || typeof state.garden !== 'object') state.garden = {plots:new Array(20).fill(null), storage:{}};
  if(!Array.isArray(state.garden.plots)) state.garden.plots = new Array(20).fill(null);
  if(!state.garden.storage || typeof state.garden.storage !== 'object') state.garden.storage = {};
  return state.garden.storage;
}
function _cleanGardenStorageRarity(){
  if(typeof state === 'undefined' || !state.garden || !state.garden.storage) return;
  var validRar = ['破舊','一般','庫存','精品','傳奇'];
  var toDel = [];
  var stor = state.garden.storage;
  for(var k in stor){
    var idx = k.lastIndexOf('@');
    if(idx < 0){ toDel.push(k); continue; }
    var id = k.slice(0, idx);
    var rar = k.slice(idx + 1);
    var validId = (typeof _gardenStorageKind === 'function')
      ? !!_gardenStorageKind(id)
      : ((typeof SEEDS !== 'undefined' && SEEDS[id]) || (typeof CROPS !== 'undefined' && CROPS[id]));
    if(!validId){ toDel.push(k); continue; }
    if(validRar.indexOf(rar) === -1){ toDel.push(k); continue; }
  }
  for(var i = 0; i < toDel.length; i++) delete stor[toDel[i]];
}
function gardenStorageAdd(id, rarity, count){
  if(count <= 0) return;
  var _validRar = ['破舊','一般','庫存','精品','傳奇'];
  if(_validRar.indexOf(rarity) === -1){ console.warn('[gardenStorageAdd] 非法稀有度', id, rarity); return; }
  var s = _gardenStorageInit();
  var k = id + '@' + rarity;
  s[k] = (s[k] || 0) + count;
  if(!state.garden.storageBatches || typeof state.garden.storageBatches !== 'object') state.garden.storageBatches = {};
  if(!Array.isArray(state.garden.storageBatches[k])) state.garden.storageBatches[k] = [];
  state.garden.storageBatches[k].push({count:count, addedAt:Date.now()});
}
function gardenStorageRemove(id, rarity, count){
  var s = _gardenStorageInit();
  var k = id + '@' + rarity;
  if(!s[k] || s[k] < count) return false;
  s[k] -= count;
  if(s[k] <= 0) delete s[k];
  if(state.garden && state.garden.storageBatches && Array.isArray(state.garden.storageBatches[k])){
    var batches = state.garden.storageBatches[k];
    var remain = count;
    while(remain > 0 && batches.length){
      var b = batches[0];
      if(b.count <= remain){ remain -= b.count; batches.shift(); }
      else { b.count -= remain; remain = 0; }
    }
    if(!batches.length) delete state.garden.storageBatches[k];
  }
  return true;
}
function gardenStorageCount(id, rarity){
  var s = _gardenStorageInit();
  return s[id + '@' + rarity] || 0;
}

// ===== 日誌 =====
function _safeMsgText(msg){
  try {
    if(msg == null) return '';
    if(typeof msg === 'string') return msg;
    if(typeof msg === 'number' || typeof msg === 'boolean') return String(msg);
    if(typeof msg === 'object'){
      if(typeof msg.nodeType === 'number') return msg.textContent != null ? String(msg.textContent) : '';
      if(typeof msg.message === 'string') return msg.message;
      return '';
    }
    return String(msg);
  } catch(e){ return ''; }
}
function pushLog(html, items, type){
  html = _safeMsgText(html);
  state.logs.push({t: Date.now(), html: html, items: items || [], type: type || 'explore'});
  if(state.logs.length > 500) state.logs.splice(0, state.logs.length - 500);
  if(typeof currentTab !== 'undefined' && currentTab === 'explore' && typeof renderZone3Log === 'function') renderZone3Log();
}

// ===== notify（禁用） =====
const toastSlotSet = new Set();
function notify(msg, type){ /* disabled */ }

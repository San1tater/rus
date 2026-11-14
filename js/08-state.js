
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

/* rev-fix-position: 从 15-explore.js 移入（state 层，REGIONS 加载于 04） */
window.getActiveRegions = function(){
  const l = state.preferences.regions.filter(function(r){
    return REGIONS[r] && (!REGIONS[r].needUnlock || state.unlockedRegions.includes(r));
  });
  if(l.length) return l;
  for(const k in REGIONS){
    if(!REGIONS[k].needUnlock || state.unlockedRegions.includes(k)) return [k];
  }
  return ['廢棄工廠'];
};

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

    /* rev-workbench: 遷移舊 4 段 ID → 5 段（補 _x） */
    (function _migrateNamed(){
      function _fixId(id){
        if(!id || id.indexOf('named_') !== 0) return id;
        var parts = id.split('_');
        if(parts.length === 4){
          var baseId = parts[1];
          var mag = parts[2] === 'x' ? null : parseInt(parts[2], 10);
          var scope = parts[3] === 'x' ? null : parts[3];
          if(WEAPONS[baseId]) getOrCreateNamedItem(baseId, mag, scope, null);
          if(ALL_ITEMS[id]) delete ALL_ITEMS[id];
          return id + '_x';
        }
        return id;
      }
      var _toDel = [], _toAdd = {};
      for(var k in state.inventory){
        var sp = k.split('@');
        var nid = _fixId(sp[0]);
        if(nid !== sp[0]){
          _toDel.push(k);
          var nk = nid + '@' + sp[1];
          _toAdd[nk] = (_toAdd[nk] || 0) + state.inventory[k];
        }
      }
      for(var i = 0; i < _toDel.length; i++) delete state.inventory[_toDel[i]];
      for(var k2 in _toAdd) state.inventory[k2] = (state.inventory[k2] || 0) + _toAdd[k2];
      for(var slot in state.player.equipped){
        var eid = state.player.equipped[slot];
        if(!eid) continue;
        var neid = _fixId(eid);
        if(neid !== eid) state.player.equipped[slot] = neid;
      }
      if(Array.isArray(state.crafting)){
        for(var ci = 0; ci < state.crafting.length; ci++){
          var c = state.crafting[ci];
          if(c.type === 'mod' && c.modInfo && typeof c.modInfo.grip === 'undefined') c.modInfo.grip = null;
        }
      }
    })();

    var _regen = function(id){
      if(!id || id.indexOf('named_') !== 0) return;
      var parts = id.split('_');
      if(parts.length >= 4){
        var baseId = parts[1];
        var mag = parts[2] === 'x' ? null : parseInt(parts[2], 10);
        var scope = parts[3] === 'x' ? null : parts[3];
        var grip = parts[4] && parts[4] !== 'x' ? parts[4] : null;
        if(WEAPONS[baseId]) getOrCreateNamedItem(baseId, mag, scope, grip);
      }
    };
    for(var ik in state.inventory) _regen(ik.split('@')[0]);
    for(var sk2 in state.player.equipped) _regen(state.player.equipped[sk2]);

    _initUnlockedFrom();

    /* rev-fix-sanitize-state: 通用存檔自檢 */
    _sanitizeState();

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
function _sanitizeState(){
  /* rev-fix-sanitize-state: 通用存檔自檢，移除不符合當前定義的條目 */
  const removed = [];
  const fixed = [];

  /* 1. vehicleAmmo */
  if(state.vehicleAmmo && typeof state.vehicleAmmo === 'object'){
    for(const vid in state.vehicleAmmo){
      if(typeof VEHICLES !== 'undefined' && !VEHICLES[vid]){
        removed.push('vehicleAmmo:' + vid);
        delete state.vehicleAmmo[vid];
        continue;
      }
      const ld = (typeof _getLoadout === 'function') ? _getLoadout(vid) : null;
      if(!ld) continue;
      const validWeapons = Object.keys(ld);
      const ammoState = state.vehicleAmmo[vid];
      for(const wid in ammoState){
        if(validWeapons.indexOf(wid) < 0){
          removed.push('vehicleAmmo:' + vid + '.' + wid);
          delete ammoState[wid];
          continue;
        }
        const a = ammoState[wid];
        if(!a || typeof a !== 'object') continue;
        const defs = (typeof VEHICLE_MAIN_AMMO_POOL !== 'undefined' && VEHICLE_MAIN_AMMO_POOL[wid]) || [];
        const validIds = defs.map(function(x){ return x.id; });
        if(validIds.length === 0) continue;
        let changed = false;
        if(a.breakdown){
          for(const bid in a.breakdown){
            if(validIds.indexOf(bid) < 0){
              removed.push('vehicleAmmo:' + vid + '.' + wid + '.breakdown.' + bid);
              delete a.breakdown[bid];
              changed = true;
            }
          }
        }
        if(a.presetBreakdown){
          for(const bid in a.presetBreakdown){
            if(validIds.indexOf(bid) < 0){
              removed.push('vehicleAmmo:' + vid + '.' + wid + '.presetBreakdown.' + bid);
              delete a.presetBreakdown[bid];
              changed = true;
            }
          }
        }
        if(changed && a.breakdown){
          let sum = 0;
          for(const k in a.breakdown) sum += (a.breakdown[k] || 0);
          if((a.current || 0) > sum){
            fixed.push('vehicleAmmo:' + vid + '.' + wid + '.current');
            a.current = sum;
          }
        }
      }
    }
  }

  /* 2. station */
  if(state.station){
    const srvIds = new Set((state.servants || []).map(function(s){ return s.id; }));
    if(state.station.crew){
      for(const r of ['commander','gunner','driver']){
        if(state.station.crew[r] && !srvIds.has(state.station.crew[r])){
          removed.push('station.crew.' + r);
          state.station.crew[r] = null;
        }
      }
    }
    if(Array.isArray(state.station.passengers)){
      const before = state.station.passengers.length;
      state.station.passengers = state.station.passengers.filter(function(p){
        return p && p.srvId && srvIds.has(p.srvId);
      });
      if(state.station.passengers.length < before){
        removed.push('station.passengers:' + (before - state.station.passengers.length));
      }
    }
  }

  /* 3. explore region */
  if(state.explore && typeof state.explore === 'object'){
    for(const k in state.explore){
      const r = k.split('#')[0];
      if(typeof REGIONS !== 'undefined' && !REGIONS[r]){
        removed.push('explore.' + k);
        delete state.explore[k];
      }
    }
  }

  /* 4. ammoOrder */
  if(state.preferences && state.preferences.ammoOrder){
    for(const k in state.preferences.ammoOrder){
      const order = state.preferences.ammoOrder[k];
      if(!Array.isArray(order)){ delete state.preferences.ammoOrder[k]; continue; }
      const filtered = order.filter(function(aid){
        if(!aid) return false;
        if(typeof AMMO !== 'undefined' && AMMO[aid]) return true;
        if(typeof WEAPONS !== 'undefined' && WEAPONS[aid] && WEAPONS[aid].slot === 'throwable') return true;
        return false;
      });
      if(filtered.length !== order.length){
        removed.push('ammoOrder.' + k + ':' + (order.length - filtered.length));
        state.preferences.ammoOrder[k] = filtered;
      }
    }
  }

  /* 5. crafting */
  if(Array.isArray(state.crafting)){
    const before = state.crafting.length;
    state.crafting = state.crafting.filter(function(c){
      if(!c || c.type !== 'mod') return false;
      if(!c.modInfo || typeof WEAPONS === 'undefined' || !WEAPONS[c.modInfo.baseId]) return false;
      return true;
    });
    if(state.crafting.length < before){
      removed.push('crafting:' + (before - state.crafting.length));
    }
  }

  /* 6. garden.storageBatches */
  if(state.garden && state.garden.storageBatches && typeof state.garden.storageBatches === 'object'){
    for(const k in state.garden.storageBatches){
      const idx = k.lastIndexOf('@');
      if(idx < 0){ delete state.garden.storageBatches[k]; continue; }
      const id = k.slice(0, idx);
      const kind = (typeof _gardenStorageKind === 'function') ? _gardenStorageKind(id) : null;
      if(!kind){
        removed.push('garden.storageBatches.' + k);
        delete state.garden.storageBatches[k];
      }
    }
  }

  /* 7. servants.assignedPlots */
  if(Array.isArray(state.servants) && state.garden && Array.isArray(state.garden.plots)){
    const plots = state.garden.plots;
    for(const srv of state.servants){
      if(!Array.isArray(srv.assignedPlots)) continue;
      const before = srv.assignedPlots.length;
      srv.assignedPlots = srv.assignedPlots.filter(function(idx){
        return typeof idx === 'number' && idx >= 0 && idx < plots.length && !!plots[idx];
      });
      if(srv.assignedPlots.length < before){
        removed.push('servant.' + srv.id + '.assignedPlots:' + (before - srv.assignedPlots.length));
      }
    }
  }

  /* 8. garden.plots crop */
  if(state.garden && Array.isArray(state.garden.plots)){
    for(let i = 0; i < state.garden.plots.length; i++){
      const p = state.garden.plots[i];
      if(!p || !p.crop) continue;
      if(typeof SEEDS !== 'undefined' && !SEEDS[p.crop.seedId]){
        removed.push('plot[' + i + '].crop');
        p.crop = null;
      }
    }
  }

  /* rev-fix-sanitize-garage: 清理 garage 中無效 vid */
  if(state.garage && typeof state.garage === 'object'){
    if(Array.isArray(state.garage.ownedVehicles)){
      const _ovB = state.garage.ownedVehicles.length;
      state.garage.ownedVehicles = state.garage.ownedVehicles.filter(function(vid){
        return (typeof VEHICLES !== 'undefined') && !!VEHICLES[vid];
      });
      if(state.garage.ownedVehicles.length < _ovB) removed.push('garage.ownedVehicles:'+(_ovB-state.garage.ownedVehicles.length));
      if((typeof VEHICLES !== 'undefined') && VEHICLES.btr80 && state.garage.ownedVehicles.indexOf('btr80') < 0){
        state.garage.ownedVehicles.unshift('btr80'); removed.push('garage.ownedVehicles:restore_btr80');
      }
    }
    if(state.garage.vehicleExp){
      for(const _v in state.garage.vehicleExp){
        if((typeof VEHICLES === 'undefined') || !VEHICLES[_v]){ delete state.garage.vehicleExp[_v]; removed.push('garage.vehicleExp:'+_v); }
      }
    }
    if(state.garage.researchProgress){
      for(const _v in state.garage.researchProgress){
        if((typeof VEHICLES === 'undefined') || !VEHICLES[_v]){ delete state.garage.researchProgress[_v]; removed.push('garage.researchProgress:'+_v); }
      }
    }
    if(state.garage.researchTarget && ((typeof VEHICLES === 'undefined') || !VEHICLES[state.garage.researchTarget])){
      removed.push('garage.researchTarget:'+state.garage.researchTarget); state.garage.researchTarget = null;
    }
  }

  if(removed.length > 0 || fixed.length > 0){
    console.warn('[sanitize] removed=' + removed.length + ' fixed=' + fixed.length);
    if(removed.length > 0) console.warn('[sanitize] removed:', removed.slice(0, 30));
    if(fixed.length > 0) console.warn('[sanitize] fixed:', fixed.slice(0, 30));
  }
  return { removed: removed, fixed: fixed };
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
    if(id.indexOf('named_') === 0){
      /* rev-fix-invalid-named: 跨版本 baseId 已删时清理，避免永久残留 */
      var _np = id.split('_');
      if(_np.length < 4 || !WEAPONS[_np[1]]){
        removed.push({id:id, cnt:state.inventory[k]});
        delete state.inventory[k];
      }
      continue;
    }
    if(!ALL_ITEMS[id]){
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
function calcCritRate(wr, ar){
  /* rev-fix-crit-separate: 暴率只讀武器稀有度（精度）；ar 參數保留以兼容調用點 */
  const wm = RARITY_MULT[wr] || 1;
  return clamp(0.10 + 0.15 * (wm - 1), 0.05, 0.60);
}
function calcCritMult(wr, ar){
  /* rev-fix-crit-separate: 暴傷只讀彈藥稀有度（殺傷力）；wr 參數保留以兼容調用點 */
  const am = RARITY_MULT[ar] || 1;
  return 1.5 + 1.5 * (am - 1);
}

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

// ===== 建築 tick / 製造 / 離線建築結算（rev-fix-position: 从 25-boot.js 移入） =====
window.buildingTick = function(){
  var now = Date.now();
  /* rev-fix-auto-recover: 載員重傷 / 載具維修到期後自動恢復滿血。
   * 之前只清 injuredUntil / repairUntil 時間戳，不清 hp / parts，導致永久 0 HP。 */
  if(typeof state !== 'undefined' && state.servants){
    for(var _si = 0; _si < state.servants.length; _si++){
      var _srv = state.servants[_si];
      if(_srv.injuredUntil && _srv.injuredUntil <= now && (_srv.hp <= 0 || _srv._injuredDown)){
        _srv.hp = (typeof servantMaxHp === 'function') ? servantMaxHp(_srv) : 100;
        _srv._injuredDown = false;
        _srv.injuredUntil = 0;
      }
    }
  }
  if(typeof state !== 'undefined' && state.vehicleDamage){
    for(var _vid in state.vehicleDamage){
      var _d = state.vehicleDamage[_vid];
      if(_d.repairUntil && _d.repairUntil <= now && (_d.destroyed || _d.disabled || (_d.parts && _d.parts.engine <= 0))){
        _d.repairUntil = 0;
        _d.destroyed = false;
        _d.disabled = false;
        _d.parts = { engine: 800, tracks: 1000, turret: 400 };
        if(_d.weapons){ for(var _wid in _d.weapons) _d.weapons[_wid].hp = _d.weapons[_wid].max; }
        _d.members = { driver: 1, gunner: 1, commander: 1, player: 1 };
        _d.ammoRackDamage = 0;
      }
    }
  }
  var genLv = getBuildingLv("generator");
  var genMult = 1 + genLv * 0.2;
  var radioLv = getBuildingLv("radio");
  if(radioLv > 0){
    var rLast = state.radioLastTick || 0;
    var rInt = 5 * 60 * 1000 / genMult;
    if(now - rLast >= rInt){
      var times = Math.floor((now - rLast) / rInt);
      var mats = ["wood","metal","screws","cloth","gears","electronics"];
      for(var i=0; i<times; i++){
        var m = pick(mats);
        var cnt = rndInt(3, 8) * radioLv;
        invAdd(m, "一般", cnt);
      }
      state.radioLastTick = rLast + times * rInt;
    }
  }
  var armoryLv = getBuildingLv("armory");
  if(armoryLv > 0){
    var aLast = state.armoryLastTick || 0;
    var aInt = 3 * 60 * 1000 / genMult;
    if(now - aLast >= aInt){
      var times = Math.floor((now - aLast) / aInt);
      var tRar = "一般";
      if(armoryLv <= 10) tRar = "破舊"; else if(armoryLv <= 20) tRar = "一般"; else if(armoryLv <= 35) tRar = "庫存"; else tRar = "精品";
      var _ti = RARITY_ORDER.indexOf(tRar);
      var pw = equippedWeapon("primary");
      var sw = equippedWeapon("secondary");
      var cals = [];
      if(pw && pw.def.cal) cals.push(pw.def.cal);
      if(sw && sw.def.cal && (!pw || sw.def.cal !== pw.def.cal)) cals.push(sw.def.cal);
      if(!cals.length) cals.push("9x19");
      for(var t=0; t<times; t++){
        for(var ci=0; ci<cals.length; ci++){
          var cal = cals[ci];
          var ammos = Object.keys(AMMO).filter(function(k){ return AMMO[k].cal === cal; });
          if(!ammos.length) continue;
          var cands = [];
          var minD = 999;
          for(var ai=0; ai<ammos.length; ai++){
            var aIdx = RARITY_ORDER.indexOf(AMMO[ammos[ai]].rarity);
            if(aIdx < 0) continue;
            var dd = Math.abs(aIdx - _ti);
            if(dd < minD){ minD = dd; cands.length = 0; cands.push(ammos[ai]); }
            else if(dd === minD){ cands.push(ammos[ai]); }
          }
          if(cands.length){
            var chosen = cands[0];
            var acnt = rndInt(5, 10) * Math.max(1, Math.ceil(armoryLv / 5));
            invAdd(chosen, AMMO[chosen].rarity, acnt);
          }
        }
      }
      state.armoryLastTick = aLast + times * aInt;
    }
  }
  if(typeof processCrafting === "function") processCrafting();
  if(typeof _gardenMealTick === "function"){ try{ _gardenMealTick(now); }catch(e){} }
  if(typeof _gardenFarmBackgroundTick === "function"){ try{ _gardenFarmBackgroundTick(now); }catch(e){} }
  if(typeof _gardenStorageRotCheck === "function"){ try{ _gardenStorageRotCheck(); }catch(e){} }
};

function processCrafting(){
  if(!state.crafting || !state.crafting.length) return;
  const now = Date.now();
  const genLv = (typeof getBuildingLv === 'function') ? getBuildingLv('generator') : 0;
  const sm = 1 + genLv * 0.2;
  for(let i = state.crafting.length - 1; i >= 0; i--){
    const c = state.crafting[i];
    if(c.type === 'mod'){
      const t = c.time * 1000 / sm;
      if(now - c.startTime >= t){
        const info = c.modInfo;
        const namedId = getOrCreateNamedItem(info.baseId, info.mag, info.scope, info.grip || null);
        if(info.fromEquippedSlot){
          if(!state.player.equipped[info.fromEquippedSlot]){
            state.player.equipped[info.fromEquippedSlot] = namedId;
            state.player.equippedRarity[info.fromEquippedSlot] = '具名';
          } else {
            invAddRaw(namedId, '具名', 1);
            pushLog('<span class="pl">系統</span> 改造完成：<b class="r-具名">' + itemDef(namedId).name + '</b> 已放入背包（原槽位已被佔用）。', [], 'explore');
          }
        } else {
          /* rev-workbench: 工作台在加入队列时已消耗源武器，避免双删 */
          if(info.originalId && !info._consumedAtStart) invRemove(info.originalId, info.originalRarity, 1);
          invAddRaw(namedId, '具名', 1);
        }
        pushLog('<span class="pl">玩家</span> 完成改造：<b class="r-具名">' + itemDef(namedId).name + '</b>。', [], 'explore');
        state.crafting.splice(i, 1);
        if (typeof addProf === 'function') addProf('craft', 1);
        if (typeof refreshPlayerStats === 'function') refreshPlayerStats();
        if (typeof save === 'function') save();
      }
    }
  }
}

function _offlineBuildingSettle(now, baseTime){
  const genLv = getBuildingLv('generator');
  const genMult = 1 + genLv * 0.2;
  let radioCount = 0;
  let armoryCount = 0;

  const radioLv = getBuildingLv('radio');
  if(radioLv > 0){
    const interval = 5 * 60 * 1000 / genMult;
    const last = Math.max(state.radioLastTick || 0, baseTime);
    if(now - last >= interval){
      const times = Math.floor((now - last) / interval);
      const mats = ['wood','metal','screws','cloth','gears','electronics'];
      for(let i = 0; i < times; i++){
        const m = pick(mats);
        const cnt = rndInt(3, 8) * radioLv;
        invAdd(m, '一般', cnt);
      }
      radioCount = times;
      state.radioLastTick = last + times * interval;
    }
  }

  const armoryLv = getBuildingLv('armory');
  if(armoryLv > 0){
    const interval = 3 * 60 * 1000 / genMult;
    const last = Math.max(state.armoryLastTick || 0, baseTime);
    if(now - last >= interval){
      const times = Math.floor((now - last) / interval);
      let targetRarity = '一般';
      if(armoryLv<=10)targetRarity='破舊'; else if(armoryLv<=20)targetRarity='一般'; else if(armoryLv<=35)targetRarity='庫存'; else targetRarity='精品';
      const _targetIdx = RARITY_ORDER.indexOf(targetRarity);
      const pw = equippedWeapon('primary'), sw = equippedWeapon('secondary');
      const cals = [];
      if(pw && pw.def.cal) cals.push(pw.def.cal);
      if(sw && sw.def.cal && (!pw || sw.def.cal !== pw.def.cal)) cals.push(sw.def.cal);
      if(!cals.length) cals.push('9x19');
      for(let i = 0; i < times; i++){
        for(const cal of cals){
          const ammos = Object.keys(AMMO).filter(k => AMMO[k].cal === cal);
          if(!ammos.length) continue;
          const _cands = [];
          let _minDiff = 999;
          for(const a of ammos){
            const aIdx = RARITY_ORDER.indexOf(AMMO[a].rarity);
            if(aIdx < 0) continue;
            const d = Math.abs(aIdx - _targetIdx);
            if(d < _minDiff){ _minDiff = d; _cands.length = 0; _cands.push(a); }
            else if(d === _minDiff){ _cands.push(a); }
          }
          if(_cands.length){
            const chosen = _cands[0];
            const cnt = rndInt(5, 10) * Math.max(1, Math.ceil(armoryLv / 5));
            invAdd(chosen, AMMO[chosen].rarity, cnt);
          }
        }
      }
      armoryCount = times;
      state.armoryLastTick = last + times * interval;
    }
  }
  processCrafting();
  return { radioCount, armoryCount };
}

/* rev-fix-med-position: _stConsumeLowestMed 移至通用库存层 */
function _stConsumeLowestMed(){
  const _rl = ['破舊','一般','庫存','精品','傳奇','具名'];
  for(let ri = 0; ri < _rl.length; ri++){
    for(const k in state.inventory){
      const p = k.split('@');
      if(p[1] !== _rl[ri]) continue;
      if(state.inventory[k] <= 0) continue;
      const c = CONSUMABLES[p[0]];
      if(!c || !c.heal) continue;
      invRemove(p[0], p[1], 1);
      return { id: p[0], rarity: p[1] };
    }
  }
  return null;
}

/* rev-fix-heal-by-value: 用載員自己的 maxHp 算 healPct 部分
 * 玩家自身治療仍用 calcConsumableHeal（玩家 maxHp），此函數專治載員 */
function _calcConsumableHealForServant(item, medbayLv, srvMaxHp){
  if(!item || !item.id) return 0;
  const c = CONSUMABLES[item.id];
  if(!c) return 0;
  const rarityMult = RARITY_MULT[item.rarity] || 1;
  const base = (c.heal || 0) + (c.healPct || 0) * (srvMaxHp || 100);
  const medbayMult = 1 + (medbayLv || 0) * 0.03;
  return Math.round(base * rarityMult * medbayMult);
}

/* rev-fix-heal-by-value: 庫存消耗品的估算總治療值（用於 UI 判斷「能否治癒」）
 * avgMaxHp 由調用方傳入（傷員平均 maxHp），估算更準 */
function _stTotalMedValue(avgMaxHp){
  const _medbayLv = (typeof getBuildingLv === 'function') ? getBuildingLv('medbay') : 0;
  const _mh = (typeof avgMaxHp === 'number' && avgMaxHp > 0) ? avgMaxHp : 100;
  let total = 0;
  for(const k in state.inventory){
    const p = k.split('@');
    if(!CONSUMABLES[p[0]] || !CONSUMABLES[p[0]].heal) continue;
    if(state.inventory[k] <= 0) continue;
    total += _calcConsumableHealForServant({ id: p[0], rarity: p[1] }, _medbayLv, _mh) * state.inventory[k];
  }
  return total;
}

/* rev-fix-heal-by-value: 按等值醫療值消耗消耗品，從最低稀有度 + 同稀有度字母序開始
 * 返回 { healed: 實際恢復 HP, used: [{id, rarity}, ...] } */
function _stHealServantByValue(srv, targetHp){
  if(!srv) return { healed: 0, used: [] };
  const _medbayLv = (typeof getBuildingLv === 'function') ? getBuildingLv('medbay') : 0;
  const _maxHp = (typeof servantMaxHp === 'function') ? servantMaxHp(srv) : 100;
  const _curHp = (typeof srv.hp === 'number') ? srv.hp : _maxHp;
  const _targetHp = (typeof targetHp === 'number') ? Math.min(targetHp, _maxHp) : _maxHp;
  let _needHp = _targetHp - _curHp;
  srv.injuredUntil = 0;
  srv._injuredDown = false;
  if(_needHp <= 0) return { healed: 0, used: [] };
  const order = ['破舊','一般','庫存','精品','傳奇','具名'];
  const used = [];
  let healed = 0;
  while(_needHp > 0.01){
    let picked = null;
    for(const r of order){
      const cands = [];
      for(const k in state.inventory){
        const p = k.split('@');
        if(p[1] !== r) continue;
        if(state.inventory[k] <= 0) continue;
        const c = CONSUMABLES[p[0]];
        if(!c || !c.heal) continue;
        cands.push({ id: p[0], rarity: p[1], name: c.name || p[0] });
      }
      if(!cands.length) continue;
      cands.sort(function(a, b){ return (a.name || '').localeCompare(b.name || '', 'zh-Hant'); });
      picked = cands[0];
      break;
    }
    if(!picked) break;
    invRemove(picked.id, picked.rarity, 1);
    const _heal = _calcConsumableHealForServant({ id: picked.id, rarity: picked.rarity }, _medbayLv, _maxHp);
    if(_heal <= 0) continue;
    healed += _heal;
    _needHp -= _heal;
    used.push(picked);
  }
  srv.hp = Math.min(_targetHp, _curHp + healed);
  return { healed: Math.min(healed, _targetHp - _curHp), used: used };
}
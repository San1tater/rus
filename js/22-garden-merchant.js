/* ============================================================
   22-garden-merchant.js — 後院商人（產線 / 交易 / 產線信息 / 食物統計）
   由舊 08-garden-core.js（商人部分）、08a-garden-servants.js（產線實時刷新定時器）、
   09-base.js（_gardenMerchantLineStatus / _openMerchantLineDetail）重構。
   常量（MERCHANT_*_TABLE / MERCHANT_TRADE_ITEMS / MERCHANT_INTERVAL_MS /
   FOOD_COST_BASE / RARITY_FOOD_MULT / GARDEN_MEAL_INTERVAL_MS /
   GUARD_STAMINA_DRAIN_PER_HOUR 等）已於 07-data-garden.js 定義，本文件不重複定義。
   ============================================================ */

const _MIN_VALID_TS = 1577836800000;

/* ===== 商人狀態初始化 ===== */
function _gardenMerchantInit(){
  if(!state.garden) state.garden = { plots:new Array(20).fill(null), storage:{} };
  if(typeof state.garden.food !== 'number' || !Number.isFinite(state.garden.food) || state.garden.food < 0){
    state.garden.food = 0;
  }
  if(!state.garden.merchant || typeof state.garden.merchant !== 'object'){
    state.garden.merchant = { foodLv:0, seedLv:0, throwLv:0, ammoLv:0, lastFood:0, lastSeed:0, lastThrow:0, lastAmmo:0, lastFeed:0 };
  }
  const m = state.garden.merchant;
  ['foodLv','seedLv','throwLv','ammoLv'].forEach(function(k){
    if(typeof m[k] !== 'number' || !Number.isFinite(m[k]) || m[k] < 0 || Math.floor(m[k]) !== m[k]) m[k] = 0;
  });
  ['lastFood','lastSeed','lastThrow','lastAmmo'].forEach(function(k){
    if(typeof m[k] !== 'number' || !Number.isFinite(m[k]) || m[k] < 0) m[k] = 0;
  });
  if(typeof m.lastFeed !== 'number' || !Number.isFinite(m.lastFeed) || m.lastFeed <= 0) m.lastFeed = Date.now();
  if(typeof m.lastCompostDecayAt !== 'number' || !Number.isFinite(m.lastCompostDecayAt) || m.lastCompostDecayAt <= 0){
    m.lastCompostDecayAt = Math.floor(Date.now() / GARDEN_MEAL_INTERVAL_MS) * GARDEN_MEAL_INTERVAL_MS;
  }
  if(typeof m.foodPool !== 'number' || !Number.isFinite(m.foodPool) || m.foodPool < 0) m.foodPool = 0;
  if(typeof state.garden.compostValue !== 'number' || !Number.isFinite(state.garden.compostValue) || state.garden.compostValue < 0){
    state.garden.compostValue = 0;
  }
  if(typeof state.garden.compostAccelSec !== 'undefined') delete state.garden.compostAccelSec;
  if(typeof state.garden.compostNextIdx !== 'number' || !Number.isFinite(state.garden.compostNextIdx)) state.garden.compostNextIdx = 0;
  if(!Array.isArray(m.battleLog)) m.battleLog = [];
  if(!m.matPools || typeof m.matPools !== 'object') m.matPools = {};
  ['metal','gears','electronics','cloth','screws','wood'].forEach(function(k){
    if(typeof m.matPools[k] !== 'number' || !Number.isFinite(m.matPools[k]) || m.matPools[k] < 0) m.matPools[k] = 0;
  });
  return state.garden;
}

/* ===== 材料池 ===== */
function _gardenMaterialFloat(id){
  let eq = 0;
  for(const k in state.inventory){
    const parts = k.split('@');
    if(parts.length !== 2) continue;
    if(parts[0] !== id) continue;
    eq += state.inventory[k] * (RARITY_MULT[parts[1]] || 1);
  }
  return eq;
}

function _gardenMaterialCount(id){
  const m = _gardenMerchantInit().merchant;
  if(!m.matPools) m.matPools = {};
  return _gardenMaterialFloat(id) + (m.matPools[id] || 0);
}

function _gardenMerchantCanPay(costs){
  const m = _gardenMerchantInit().merchant;
  if(!m.matPools) m.matPools = {};
  for(const id in costs){
    const have = _gardenMaterialFloat(id) + (m.matPools[id] || 0);
    if(have + 0.001 < costs[id]) return false;
  }
  return true;
}

function _gardenMerchantTryPay(costs){
  const m = _gardenMerchantInit().merchant;
  if(!m.matPools) m.matPools = {};
  if(!_gardenMerchantCanPay(costs)) return false;
  for(const id in costs){
    let remain = costs[id];
    const pool = m.matPools[id] || 0;
    const fromPool = Math.min(pool, remain);
    m.matPools[id] = pool - fromPool;
    remain -= fromPool;
    if(remain <= 0.001) continue;
    const before = _gardenMaterialFloat(id);
    consumeMaterial(id, remain);
    const after = _gardenMaterialFloat(id);
    const actualSpent = before - after;
    const overpay = actualSpent - remain;
    if(overpay > 0.001) m.matPools[id] = (m.matPools[id] || 0) + overpay;
  }
  return true;
}

function _gardenMerchantMissingList(costs){
  const m = _gardenMerchantInit().merchant;
  if(!m.matPools) m.matPools = {};
  const NAMES = { metal:'金屬', gears:'齒輪', electronics:'電子', cloth:'布料', wood:'木材', screws:'螺絲' };
  const miss = [];
  for(const id in costs){
    const have = _gardenMaterialFloat(id) + (m.matPools[id] || 0);
    if(have + 0.001 < costs[id]) miss.push(NAMES[id] || id);
  }
  return miss;
}

/* ===== 作物等值 / 池填充 ===== */
function _gardenTotalCropValue(){
  const storage = _gardenStorageInit();
  let total = 0;
  for(const k in storage){
    if(storage[k] <= 0) continue;
    const parts = k.split('@');
    if(!CROPS[parts[0]]) continue;
    total += storage[k] * cropFoodValue(parts[0], parts[1]);
  }
  return total;
}

function _gardenTotalCropCount(){
  const storage = _gardenStorageInit();
  let total = 0;
  for(const k in storage){ if(CROPS[k.split('@')[0]]) total += storage[k]; }
  return total;
}

function _gardenMerchantPoolFill(poolKey, target){
  const g = _gardenMerchantInit();
  const m = g.merchant;
  if(!m[poolKey]) m[poolKey] = 0;
  if(m[poolKey] >= target) return true;
  const storage = _gardenStorageInit();
  const batches = (state.garden && state.garden.storageBatches) || {};
  const allBatches = [];
  for(const k in storage){
    if(storage[k] <= 0) continue;
    const parts = k.split('@');
    if(!CROPS[parts[0]]) continue;
    const bs = batches[k];
    if(Array.isArray(bs) && bs.length){
      let listed = 0;
      for(const b of bs){
        allBatches.push({ k: k, id: parts[0], rarity: parts[1], count: b.count, addedAt: b.addedAt || 0, val: cropFoodValue(parts[0], parts[1]) });
        listed += b.count;
      }
      const missing = storage[k] - listed;
      if(missing > 0){
        allBatches.push({ k: k, id: parts[0], rarity: parts[1], count: missing, addedAt: 0, val: cropFoodValue(parts[0], parts[1]) });
      }
    } else {
      allBatches.push({ k: k, id: parts[0], rarity: parts[1], count: storage[k], addedAt: 0, val: cropFoodValue(parts[0], parts[1]) });
    }
  }
  allBatches.sort(function(a, b){ return a.addedAt - b.addedAt; });
  const toConsume = {};
  let gained = 0;
  for(const b of allBatches){
    if(m[poolKey] + gained >= target) break;
    for(let i = 0; i < b.count; i++){
      if(m[poolKey] + gained >= target) break;
      gained += b.val;
      toConsume[b.k] = (toConsume[b.k] || 0) + 1;
    }
  }
  if(m[poolKey] + gained < target) return false;
  for(const k in toConsume){
    storage[k] -= toConsume[k];
    if(storage[k] <= 0) delete storage[k];
    if(batches[k]){
      let remain = toConsume[k];
      const nb = [];
      for(const b of batches[k]){
        if(remain <= 0){ nb.push(b); continue; }
        if(b.count <= remain){ remain -= b.count; }
        else { b.count -= remain; remain = 0; nb.push(b); }
      }
      if(nb.length) batches[k] = nb;
      else delete batches[k];
    }
  }
  m[poolKey] += gained;
  return true;
}

function _gardenMerchantFoodPoolFill(target){ return _gardenMerchantPoolFill('foodPool', target); }

/* ===== 產線日誌輔助 ===== */
function _gardenLogMapAdd(map, id, rarity, count){
  const k = id + '@' + rarity;
  if(!map[k]) map[k] = { id: id, rarity: rarity, count: 0 };
  map[k].count += count;
}

function _gardenLogMapToArray(map){
  const arr = [];
  for(const k in map) arr.push(map[k]);
  arr.sort(function(a, b){
    const rd = sortByRarityDesc(a, b);
    if(rd !== 0) return rd;
    const ad = itemDef(a.id) || { name: a.id };
    const bd = itemDef(b.id) || { name: b.id };
    return (ad.name || '').localeCompare(bd.name || '', 'zh-Hant');
  });
  return arr;
}

function _gardenLogMerchantBatch(batch){
  if(!batch || !batch.lines) return;
  const keys = ['food','seed','throw','ammo'];
  const active = keys.filter(function(k){ return batch.lines[k] && batch.lines[k].items && batch.lines[k].items.length; });
  if(!active.length) return;
  const parts = [];
  for(const k of active){
    const meta = _gardenMerchantLineMeta(k);
    const items = batch.lines[k].items;
    let total = 0;
    for(const it of items) total += it.count;
    parts.push(meta.icon + '+' + total);
  }
  const text = '⏱ 產線結算：' + parts.join(' ');
  _gardenLog(text, 'produce', '', { type: 'merchant_batch', lines: batch.lines, time: batch.t });
}

/* ===== 產線進程 ===== */
function _gardenMerchantLineProcess(lineKey, atTime){
  const g = _gardenMerchantInit();
  const m = g.merchant;
  const now = (typeof atTime === 'number' && Number.isFinite(atTime)) ? atTime : Date.now();
  const L = _gardenMerchantLineMeta(lineKey);
  if(!L) return false;
  let lv = m[L.lvKey];
  if(typeof lv !== 'number' || !Number.isFinite(lv) || lv < 0 || Math.floor(lv) !== lv){
    m[L.lvKey] = 0;
    return false;
  }
  if(lv === 0) return false;
  const cfg = L.table[lv];
  if(!cfg){ m[L.lvKey] = 0; return false; }
  const INTERVAL = MERCHANT_INTERVAL_MS;
  let last = m[L.lastKey];
  const isValidLast = (typeof last === 'number' && Number.isFinite(last)
    && last >= _MIN_VALID_TS
    && last % INTERVAL === 0);
  if(!isValidLast){
    const firstTick = Math.ceil((now + INTERVAL) / INTERVAL) * INTERVAL;
    m[L.lastKey] = firstTick - INTERVAL;
    return false;
  }
  const nextTick = last + INTERVAL;
  if(now < nextTick) return false;
  const times = Math.min(Math.floor((now - nextTick) / INTERVAL) + 1, 500);
  if(times <= 0) return false;
  let did = 0;
  const _itemsMap = {};
  for(let _i = 0; _i < times; _i++){
    let ok = false;
    try {
      if(lineKey === 'food'){
        const matCosts = {};
        if(cfg.gears) matCosts.gears = cfg.gears;
        if(cfg.electronics) matCosts.electronics = cfg.electronics;
        if(cfg.screws) matCosts.screws = cfg.screws;
        const poolBefore = m.foodPool || 0;
        const cropVal = _gardenTotalCropValue();
        if(poolBefore + cropVal + 0.001 < cfg.cropValue) break;
        if(!_gardenMerchantCanPay(matCosts)) break;
        _gardenMerchantTryPay(matCosts);
        _gardenMerchantFoodPoolFill(cfg.cropValue);
        m.foodPool -= cfg.cropValue;
        g.food += cfg.cropValue;
        _gardenLogMapAdd(_itemsMap, 'food', '一般', cfg.cropValue);
        ok = true;
      } else if(lineKey === 'seed'){
        const matCosts = { metal: cfg.metal };
        if(cfg.gears) matCosts.gears = cfg.gears;
        if(cfg.electronics) matCosts.electronics = cfg.electronics;
        if(cfg.screws) matCosts.screws = cfg.screws;
        if(!_gardenMerchantTryPay(matCosts)) break;
        const seedIds = Object.keys(SEEDS);
        for(let _k = 0; _k < cfg.count; _k++){
          const sid = seedIds[Math.floor(Math.random() * seedIds.length)];
          const rar = cfg.rarities[Math.floor(Math.random() * cfg.rarities.length)];
          gardenStorageAdd(sid, rar, 1);
          _gardenLogMapAdd(_itemsMap, sid, rar, 1);
        }
        ok = true;
      } else if(lineKey === 'throw'){
        if(cfg.legend){
          if(typeof LEGEND_THROW_POOL === 'undefined' || !LEGEND_THROW_POOL.length) break;
          if(g.food + 0.001 < cfg.foodCost) break;
          g.food -= cfg.foodCost;
          for(let _k = 0; _k < cfg.count; _k++){
            const tid = LEGEND_THROW_POOL[Math.floor(Math.random() * LEGEND_THROW_POOL.length)];
            invAdd(tid, '傳奇', 1);
            _gardenLogMapAdd(_itemsMap, tid, '傳奇', 1);
          }
          ok = true;
        } else {
          const matCosts = { metal: cfg.metal };
          if(cfg.gears) matCosts.gears = cfg.gears;
          if(cfg.cloth) matCosts.cloth = cfg.cloth;
          if(cfg.electronics) matCosts.electronics = cfg.electronics;
          if(cfg.screws) matCosts.screws = cfg.screws;
          if(!_gardenMerchantTryPay(matCosts)) break;
          const tIds = ['f1','rgd5','rgo','rgn','vog17','vog25'];
          for(let _k = 0; _k < cfg.count; _k++){
            const tid = tIds[Math.floor(Math.random() * tIds.length)];
            const rar = cfg.rarities[Math.floor(Math.random() * cfg.rarities.length)];
            invAdd(tid, rar, 1);
            _gardenLogMapAdd(_itemsMap, tid, rar, 1);
          }
          ok = true;
        }
      } else if(lineKey === 'ammo'){
        if(typeof LEGEND_AMMO_POOL === 'undefined' || !LEGEND_AMMO_POOL.length) break;
        if(g.food + 0.001 < cfg.foodCost) break;
        g.food -= cfg.foodCost;
        for(let _k = 0; _k < cfg.count; _k++){
          const aid = LEGEND_AMMO_POOL[Math.floor(Math.random() * LEGEND_AMMO_POOL.length)];
          invAdd(aid, '傳奇', 1);
          _gardenLogMapAdd(_itemsMap, aid, '傳奇', 1);
        }
        ok = true;
      }
    } catch(e){
      console.warn('[merchant ' + lineKey + ']', e);
      break;
    }
    if(!ok) break;
    did++;
  }
  m[L.lastKey] = last + did * INTERVAL;
  if(did > 0 && window._merchantTickBatch && window._merchantTickBatch.lines){
    window._merchantTickBatch.lines[lineKey] = {
      batches: did,
      items: _gardenLogMapToArray(_itemsMap)
    };
  }
  return did > 0;
}

/* ===== UI 局部刷新（產線倒數） ===== */
function _gardenMerchantRefreshUI(){
  const p = document.getElementById('garden-page');
  if(!p || !p.classList.contains('on')) return;
  if(typeof _gardenActiveTab === 'undefined' || _gardenActiveTab !== 'merchant') return;
  const box = p.querySelector('#gp-content');
  if(!box) return;
  const g = _gardenMerchantInit();
  const m = g.merchant;
  const now = Date.now();
  const cards = box.querySelectorAll('.mrc-card[data-line]');
  for(let i = 0; i < cards.length; i++){
    const card = cards[i];
    const lineKey = card.getAttribute('data-line');
    const meta = _gardenMerchantLineMeta(lineKey);
    if(!meta) continue;
    const lv = m[meta.lvKey] || 0;
    if(lv === 0) continue;
    const last = m[meta.lastKey] || 0;
    const elapsed = now - last;
    const remainMs = Math.max(0, MERCHANT_INTERVAL_MS - elapsed);
    const remain = Math.ceil(remainMs / 1000);
    const ready = elapsed >= MERCHANT_INTERVAL_MS;
    const pct = Math.min(100, Math.max(0, (elapsed / MERCHANT_INTERVAL_MS) * 100));
    const num = card.querySelector('.mrc-cd-num');
    const fill = card.querySelector('.mrc-cd-bar .fill');
    if(num) num.textContent = ready ? '就緒' : remain + 's';
    if(fill) fill.style.width = pct + '%';
  }
}

/* ===== 堆肥值自然衰減 ===== */
function _gardenCompostDecayTick(now){
  const g = _gardenMerchantInit();
  if(typeof g.lastCompostDecayAt !== 'number'){
    g.lastCompostDecayAt = Math.floor(now / GARDEN_MEAL_INTERVAL_MS) * GARDEN_MEAL_INTERVAL_MS;
    return;
  }
  const curHour = Math.floor(now / GARDEN_MEAL_INTERVAL_MS);
  const lastHour = Math.floor(g.lastCompostDecayAt / GARDEN_MEAL_INTERVAL_MS);
  if(curHour <= lastHour) return;
  const hours = Math.min(curHour - lastHour, 24 * 30);
  let v = (typeof g.compostValue === 'number' && isFinite(g.compostValue)) ? g.compostValue : 0;
  for(let i = 0; i < hours; i++) v *= 0.98;
  g.compostValue = v;
  g.lastCompostDecayAt = curHour * GARDEN_MEAL_INTERVAL_MS;
}

/* ===== 商人主循環 ===== */
function _gardenMerchantTick(){
  if(window._gardenOfflineSettleRunning) return;
  const g = _gardenMerchantInit();
  const m = g.merchant;
  const now = Date.now();
  const _prevTickAt = window._lastMerchantTickAt || now;
  const _dt = now - _prevTickAt;
  window._lastMerchantTickAt = now;
  window._merchantTickBatch = { t: now, lines: {} };
  try { _gardenMerchantLineProcess('food'); } catch(e){ console.warn('[tick food]', e); }
  try { _gardenMerchantLineProcess('seed'); } catch(e){ console.warn('[tick seed]', e); }
  try { _gardenMerchantLineProcess('throw'); } catch(e){ console.warn('[tick throw]', e); }
  try { _gardenMerchantLineProcess('ammo'); } catch(e){ console.warn('[tick ammo]', e); }
  if(typeof _gardenMealTick === 'function'){
    try{ _gardenMealTick(now); }catch(e){ console.warn('[tick meal]', e); }
  }
  const batch = window._merchantTickBatch;
  window._merchantTickBatch = null;
  if(batch && batch.lines && Object.keys(batch.lines).length > 0){
    if(_dt < MERCHANT_INTERVAL_MS * 2){
      try { _gardenLogMerchantBatch(batch); } catch(e){ console.warn('[tick log]', e); }
    }
    save();
  }
}

/* ===== 食物統計 ===== */
/* rev-fix-food-ui: 实际每小时消耗 = FOOD_COST_BASE × RARITY_FOOD_MULT（与 _gardenDoOneMeal 一致），
 * 不再乘 60。旧版按「每分钟 3」推 180/h，比实际 20/h 大 9 倍。 */
function _gardenServantFoodConsumePerHour(){
  let total = 0;
  for(const s of (state.servants || [])){
    if(!s.assignedPlots || !s.assignedPlots.length) continue;
    const _base = FOOD_COST_BASE[s.foodPolicy || 'normal'] || 0;
    const _mult = RARITY_FOOD_MULT[s.rarity] || 1;
    total += Math.round(_base * _mult * 10) / 10;
  }
  return total;
}

function _gardenFoodConsumePerHour(){
  const g = _gardenMerchantInit();
  const m = g.merchant;
  let total = _gardenServantFoodConsumePerHour();
  if(m.throwLv > 0){
    const _t = MERCHANT_THROW_TABLE[m.throwLv];
    if(_t && _t.legend && _t.foodCost) total += _t.foodCost * 12;
  }
  if(m.ammoLv > 0){
    const _a = MERCHANT_AMMO_TABLE[m.ammoLv];
    if(_a && _a.foodCost) total += _a.foodCost * 12;
  }
  return total;
}

function _gardenFoodStats(){
  const g = _gardenMerchantInit();
  const m = g.merchant;
  let food = Number(g.food);
  if(!isFinite(food)) food = 0;
  let consume = _gardenServantFoodConsumePerHour();
  let lineConsume = 0;
  if(m.throwLv > 0){
    const _t = MERCHANT_THROW_TABLE[m.throwLv];
    if(_t && _t.legend && _t.foodCost) lineConsume += _t.foodCost * 12;
  }
  if(m.ammoLv > 0){
    const _a = MERCHANT_AMMO_TABLE[m.ammoLv];
    if(_a && _a.foodCost) lineConsume += _a.foodCost * 12;
  }
  let produce = 0;
  if(m.foodLv > 0) produce = MERCHANT_FOOD_TABLE[m.foodLv].cropValue * 12;
  return { food: food, consume: consume, lineConsume: lineConsume, produce: produce };
}

function _gardenUpdateFoodInfo(){
  const el = document.getElementById('gp-food-info');
  if(!el) return;
  const s = _gardenFoodStats();
  const consStr = s.consume > 0 ? '-' + s.consume + '/h' : '0/h';
  const lineStr = s.lineConsume > 0 ? ' <span style="color:#e8a33d">-' + s.lineConsume + '/h</span>' : '';
  const prodStr = s.produce > 0 ? '+' + s.produce + '/h' : '0/h';
  el.innerHTML = '🍲 <b style="color:#fff">' + fmtNum(s.food) + '</b> <span style="color:#e05252">' + consStr + '</span>' + lineStr + ' <span style="color:#4caf50">' + prodStr + '</span>';
}

/* ===== 產線元數據 ===== */
function _gardenMerchantLineMeta(lineKey){
  if(lineKey === 'food') return { lvKey:'foodLv', lastKey:'lastFood', icon:'🍲', title:'食物', table:MERCHANT_FOOD_TABLE };
  if(lineKey === 'seed') return { lvKey:'seedLv', lastKey:'lastSeed', icon:'🌰', title:'種子', table:MERCHANT_SEED_TABLE };
  if(lineKey === 'throw') return { lvKey:'throwLv', lastKey:'lastThrow', icon:'💣', title:'投擲', table:MERCHANT_THROW_TABLE };
  if(lineKey === 'ammo') return { lvKey:'ammoLv', lastKey:'lastAmmo', icon:'🎖️', title:'彈藥', table:MERCHANT_AMMO_TABLE };
  return null;
}

function _gardenMerchantCostStr(cfg, lineKey){
  if(!cfg) return '無';
  const parts = [];
  if(lineKey === 'food' && cfg.cropValue) parts.push('🌾' + cfg.cropValue);
  else if(lineKey === 'ammo' && cfg.foodCost) parts.push('🍲' + cfg.foodCost);
  else if(lineKey === 'throw' && cfg.legend && cfg.foodCost) parts.push('🍲' + cfg.foodCost);
  if(cfg.metal) parts.push('🔩' + cfg.metal);
  if(cfg.gears) parts.push('⚙️' + cfg.gears);
  if(cfg.electronics) parts.push('💡' + cfg.electronics);
  if(cfg.cloth) parts.push('🧵' + cfg.cloth);
  if(cfg.screws) parts.push('🔧' + cfg.screws);
  return parts.length ? parts.join(' ') : '無';
}

function _gardenMerchantProduceStr(cfg, lineKey){
  if(!cfg) return '無';
  if(cfg.legend) return '💣 傳奇投擲物 ×' + cfg.count;
  if(lineKey === 'ammo') return '🎖️ 傳奇彈藥 ×' + cfg.count;
  if(lineKey === 'food' && cfg.cropValue) return '🍲' + cfg.cropValue;
  if(cfg.count){
    const _icon = lineKey === 'throw' ? '💣' : '🌰';
    return _icon + (cfg.rarities || []).join('/') + ' ×' + cfg.count;
  }
  return '無';
}

/* ===== 訂閱面板 ===== */
function _gardenMerchantShowPlans(lineKey){
  const meta = _gardenMerchantLineMeta(lineKey);
  if(!meta) return;
  const m = _gardenMerchantInit().merchant;
  const curLv = m[meta.lvKey] || 0;
  let body = '';
  body += '<div style="font-size:15px;color:#e8a33d;font-weight:bold">' + meta.title + '</div>';
  body += '<div class="detail-sub">當前：' + (curLv === 0 ? '未訂閱' : 'Lv.' + curLv) + ' · 週期 ' + Math.round(MERCHANT_INTERVAL_MS / 1000) + ' 秒</div>';
  for(let lv = 0; lv <= 4; lv++){
    const cfg = meta.table[lv];
    if(lv > 0 && !cfg) continue;
    const isCur = (lv === curLv);
    const label = lv === 0 ? '停用' : 'Lv.' + lv;
    body += '<div class="mrc-plan-row" data-lv="' + lv + '" style="' + (isCur ? 'border-color:#e8a33d;background:#2a1f10;' : '') + '">';
    body += '<div class="mrc-plan-head">' + label + (isCur ? ' · 當前' : '') + '</div>';
    if(lv === 0){
      body += '<div class="mrc-plan-line">停止扣費與生產</div>';
    } else {
      body += '<div class="mrc-plan-line"><span class="cost">' + _gardenMerchantCostStr(cfg, lineKey) + '</span><span class="arrow">→</span><span class="gain">' + _gardenMerchantProduceStr(cfg, lineKey) + '</span></div>';
    }
    body += '</div>';
  }
  const bd = openModal({ title: '訂閱計劃', body: body });
  const rows = bd.querySelectorAll('.mrc-plan-row[data-lv]');
  for(let i = 0; i < rows.length; i++){
    (function(el){
      el.onclick = function(){
        const lv = parseInt(el.getAttribute('data-lv'), 10);
        closeModal();
        _gardenMerchantShowConfirm(lineKey, lv);
      };
    })(rows[i]);
  }
}

function _gardenMerchantShowConfirm(lineKey, targetLv){
  const meta = _gardenMerchantLineMeta(lineKey);
  if(!meta) return;
  const g = _gardenMerchantInit();
  const m = g.merchant;
  const curLv = m[meta.lvKey] || 0;
  const cfg = meta.table[targetLv] || meta.table[0];
  const ft = document.createElement('div');
  ft.className = 'modal-ft';
  let ftHtml = '';
  if(targetLv === 0){
    ftHtml = '<button class="btn danger" id="mrc-ok">停用</button><button class="btn ghost" id="mrc-cancel">返回</button>';
  } else {
    ftHtml = '<button class="btn primary" id="mrc-ok">確認</button><button class="btn ghost" id="mrc-cancel">取消</button>';
  }
  ft.innerHTML = ftHtml;
  let body = '';
  body += '<div style="font-size:15px;color:#e8a33d;font-weight:bold">' + meta.title + ' · ' + (targetLv === 0 ? '停用' : 'Lv.' + targetLv) + '</div>';
  body += '<div class="detail-sub">當前等級：' + (curLv === 0 ? '未訂閱' : 'Lv.' + curLv) + '</div>';
  if(targetLv > 0){
    body += '<div class="stat-line"><span class="k">週期</span><span class="v">' + Math.round(MERCHANT_INTERVAL_MS / 1000) + ' 秒</span></div>';
    body += '<div class="stat-line"><span class="k">消耗</span><span class="v" style="color:#e05252">' + _gardenMerchantCostStr(cfg, lineKey) + '</span></div>';
    body += '<div class="stat-line"><span class="k">產出</span><span class="v" style="color:#4caf50">' + _gardenMerchantProduceStr(cfg, lineKey) + '</span></div>';
  } else {
    body += '<div style="font-size:11px;color:#a89a85;line-height:1.6;padding:8px 0">停止此產線，不再自動扣費。</div>';
  }
  openModal({ title: '訂閱', body: body, footer: ft, onClose: function(){ _gardenMerchantShowPlans(lineKey); } });
  ft.querySelector('#mrc-cancel').onclick = function(){ closeModal(); _gardenMerchantShowPlans(lineKey); };
  ft.querySelector('#mrc-ok').onclick = function(){
    const wasOff = (m[meta.lvKey] || 0) === 0;
    m[meta.lvKey] = targetLv;
    save();
    closeModal();
    if(wasOff && targetLv > 0){
      _gardenMerchantLineProcess(lineKey);
      save();
    }
    const box = document.getElementById('gp-content');
    if(box && _gardenActiveTab === 'merchant') renderGardenMerchant(box);
  };
}

/* ===== 交易系統 ===== */
function _tradeItemIconHtml(item, size){
  const _is = 'width:100%;height:100%;max-width:100%;max-height:100%;object-fit:contain;display:block';
  if(item.imgIcon) return '<img src="icons/garden/' + item.imgIcon + '.png' + assetSuffix('icons/garden/' + item.imgIcon + '.png') + '" style="' + _is + '" alt="">';
  if(item.id === 'seed_stock' || item.id === 'seed_premium' || item.id === 'seed_legend'){
    return '<img src="icons/garden/seeds/seed_pack.png' + assetSuffix('icons/garden/seeds/seed_pack.png') + '" style="' + _is + '" alt="">';
  }
  if(item.itemIconId) return itemIcon(item.itemIconId, size);
  return '<span style="font-size:22px;line-height:1;display:inline-block;max-width:100%;max-height:100%;overflow:hidden">' + (item.icon || '📦') + '</span>';
}

function findTradeItem(id){
  for(const cat of MERCHANT_TRADE_ITEMS){
    for(const it of cat.items){ if(it.id === id) return it; }
  }
  return null;
}

function _isTradeOwned(item){
  if(!item || !item.oneTime) return false;
  return !!(state.garden && state.garden.ownedSpecialSoil && state.garden.ownedSpecialSoil[item.id]);
}

function renderTradeContent(){
  if(!window._tradeSelectedId) window._tradeSelectedId = null;
  if(!window._tradeQty) window._tradeQty = 1;
  let html = '<div class="mrc-trade-wrap">';
  html += '<div class="mrc-trade-left">';
  html += '<div class="mrc-trade-grid">';
  for(const cat of MERCHANT_TRADE_ITEMS){
    for(const item of cat.items){
      const sel = (window._tradeSelectedId === item.id) ? ' on' : '';
      const owned = _isTradeOwned(item);
      const ownedCls = owned ? ' owned' : '';
      const bg = rarityBg(item.rarity || '一般');
      html += '<div class="mrc-trade-cell' + sel + ownedCls + '" data-tid="' + item.id + '" style="background:' + bg + ' !important">';
      html += '<div class="mrc-trade-cell-icon">' + _tradeItemIconHtml(item, 32) + '</div>';
      html += '<div class="mrc-trade-cell-name">' + item.name + '</div>';
      html += '<div class="mrc-trade-cell-price">' + (owned ? '✓ 已擁有' : ('🍲' + item.price)) + '</div>';
      html += '</div>';
    }
  }
  html += '</div>';
  html += '</div>';
  html += '<div class="mrc-trade-right" id="mrc-trade-right"></div>';
  html += '</div>';
  return html;
}

function renderTradeDetail(){
  const el = document.getElementById('mrc-trade-right');
  if(!el) return;
  const item = findTradeItem(window._tradeSelectedId);
  if(!item){
    el.innerHTML = '<div class="mrc-td-empty">← 點擊左側商品<br>查看詳情</div>';
    return;
  }
  const g = _gardenMerchantInit();
  const food = g.food || 0;
  const owned = _isTradeOwned(item);
  const qty = item.stackable ? (window._tradeQty || 1) : 1;
  const total = item.price * qty;
  const canAfford = food >= total;
  const bg = rarityBg(item.rarity || '一般');
  let html = '';
  html += '<div class="mrc-td-head">';
  html += '<div class="mrc-td-icon" style="background:' + bg + ' !important">' + _tradeItemIconHtml(item, 36) + '</div>';
  html += '<div class="mrc-td-info"><div class="mrc-td-name">' + item.name + '</div><div class="mrc-td-desc">' + item.desc + '</div></div>';
  html += '</div>';
  if(owned){
    html += '<div class="mrc-td-owned">✓ 已擁有（土地配置中可套用）</div>';
    el.innerHTML = html;
    return;
  }
  html += '<div class="mrc-td-qty-row">';
  if(item.stackable){
    html += '<div class="mrc-td-qty"><button class="mrc-td-qty-btn" data-qty="dec">−</button><span class="mrc-td-qty-val">' + qty + '</span><button class="mrc-td-qty-btn" data-qty="inc">＋</button></div>';
  } else {
    html += '<div></div>';
  }
  html += '<div class="mrc-td-total">🍲 ' + total + '</div>';
  html += '</div>';
  html += '<button class="mrc-td-buy" data-tid="' + item.id + '"' + (canAfford ? '' : ' disabled') + '>' + (canAfford ? '確認交易' : '食物不足') + '</button>';
  el.innerHTML = html;
  const qb = el.querySelectorAll('.mrc-td-qty-btn');
  for(let i = 0; i < qb.length; i++){
    (function(btn){
      btn.onclick = function(){
        const dec = btn.getAttribute('data-qty') === 'dec';
        let q = window._tradeQty || 1;
        if(dec) q = Math.max(1, q - 1); else q = Math.min(99, q + 1);
        window._tradeQty = q;
        renderTradeDetail();
      };
    })(qb[i]);
  }
  const bb = el.querySelector('.mrc-td-buy');
  if(bb && canAfford){ bb.onclick = function(){ buyTradeItem(item.id, qty); }; }
}

function buyTradeItem(itemId, qty){
  qty = qty || 1;
  const item = findTradeItem(itemId);
  if(!item) return;
  if(_isTradeOwned(item)) return;
  const g = _gardenMerchantInit();
  const total = item.price * qty;
  if((g.food || 0) < total) return;
  g.food -= total;
  const got = [];
  let extraActions = null;
  if(item.oneTime){
    if(!state.garden.ownedSpecialSoil) state.garden.ownedSpecialSoil = {};
    state.garden.ownedSpecialSoil[item.id] = true;
    got.push({
      imgSrc: 'icons/garden/' + item.imgIcon + '.png' + assetSuffix('icons/garden/' + item.imgIcon + '.png'),
      rarity: item.rarity || '傳奇',
      name: item.name,
      count: 1
    });
    extraActions = [{ label: '立即套用', cls: 'primary', type: 'apply', soilType: item.id }];
  } else if(item.id === 'ammo_supply_stock' || item.id === 'ammo_supply_premium' || item.id === 'ammo_supply_legend'){
    const rarity = item.id === 'ammo_supply_stock' ? '庫存'
                 : item.id === 'ammo_supply_premium' ? '精品' : '傳奇';
    const count = item.id === 'ammo_supply_stock' ? 30
                 : item.id === 'ammo_supply_premium' ? 40 : 50;
    const ids = Object.keys(AMMO).filter(function(k){ return AMMO[k].rarity === rarity; });
    const collected = {};
    for(let q = 0; q < qty; q++){
      if(!ids.length) break;
      const aid = ids[Math.floor(Math.random() * ids.length)];
      invAdd(aid, rarity, count);
      if(!collected[aid]) collected[aid] = { id: aid, rarity: rarity, count: 0 };
      collected[aid].count += count;
    }
    for(const k in collected) got.push(collected[k]);
  } else if(item.id === 'f1'){
    invAdd('f1', '傳奇', qty);
    got.push({ id: 'f1', rarity: '傳奇', count: qty });
  } else if(item.id === 'medkit'){
    invAdd('ifak', '傳奇', qty);
    got.push({ id: 'ifak', rarity: '傳奇', count: qty });
  } else if(item.id === 'seed_stock' || item.id === 'seed_premium' || item.id === 'seed_legend'){
    const rarity = item.id === 'seed_stock' ? '庫存' : item.id === 'seed_premium' ? '精品' : '傳奇';
    const cnt = item.id === 'seed_legend' ? 1 : 2;
    const ids = Object.keys(SEEDS);
    const collected = {};
    for(let q = 0; q < qty; q++){
      for(let i = 0; i < cnt; i++){
        const sid = ids[Math.floor(Math.random() * ids.length)];
        gardenStorageAdd(sid, rarity, 1);
        const key = sid + '@' + rarity;
        if(!collected[key]) collected[key] = { id: sid, rarity: rarity, count: 0 };
        collected[key].count += 1;
      }
    }
    for(const k in collected) got.push(collected[k]);
  }
  save();
  try { _openTradeResultDialog(got, item.name, extraActions); } catch(e){ console.warn('[trade result]', e); }
  try { if(typeof _gardenUpdateFoodInfo === 'function') _gardenUpdateFoodInfo(); } catch(e){ console.warn('[trade foodinfo]', e); }
  try { _refreshMerchantView(); } catch(e){ console.warn('[trade refresh]', e); }
}

function _openTradeResultDialog(gotItems, title, extraActions){
  let body = '';
  body += '<div class="detail-title" style="color:#4caf50">✓ 購買成功</div>';
  body += '<div class="detail-sub">' + title + '</div>';
  if(!gotItems || !gotItems.length){
    body += '<div class="empty-hint">無獲得物品</div>';
  } else {
    for(const it of gotItems){
      let iconHtml, nm, clickable;
      if(it.imgSrc){
        iconHtml = '<img src="' + it.imgSrc + '" style="width:30px;height:30px;object-fit:contain" alt="">';
        nm = it.name || '?';
        clickable = false;
      } else {
        const def = itemDef(it.id) || { name: it.id };
        iconHtml = itemIcon(it.id, 30);
        nm = def.name;
        clickable = true;
      }
      const _attr = clickable ? (' data-iid="' + it.id + '" data-irar="' + (it.rarity || '一般') + '"') : '';
      const _cur = clickable ? '' : ' style="cursor:default"';
      body += '<div class="item-row"' + _attr + _cur + '><div class="icon" style="background:' + rarityBg(it.rarity || '一般') + '">' + iconHtml + '</div><div class="info"><div class="nm ' + rarityClass(it.rarity || '一般') + '">' + nm + '</div><div class="sub">' + (it.rarity || '') + '</div></div><div class="cnt">×' + it.count + '</div></div>';
    }
  }
  const ft = document.createElement('div');
  ft.className = 'modal-ft';
  const aa = extraActions || [];
  let ftHtml = '';
  for(const a of aa){
    ftHtml += '<button class="btn ' + (a.cls || '') + '" data-act-label="' + a.label + '">' + a.label + '</button>';
  }
  ft.innerHTML = ftHtml;
  const _bd = openModal({ title: '購買結果', body: body, footer: ft });
  const _rows = _bd.querySelectorAll('.item-row[data-iid]');
  for(let _ri = 0; _ri < _rows.length; _ri++){
    (function(_row){
      _row.onclick = function(){
        const _iid = _row.getAttribute('data-iid');
        const _irar = _row.getAttribute('data-irar');
        if(typeof openItemDetail === 'function'){
          openItemDetail(_iid, _irar, function(){ _openTradeResultDialog(gotItems, title, extraActions); });
        }
      };
    })(_rows[_ri]);
  }
  const btns = ft.querySelectorAll('button[data-act-label]');
  for(let i = 0; i < btns.length; i++){
    (function(btn){
      btn.onclick = function(){
        const label = btn.getAttribute('data-act-label');
        if(label === 'close'){ closeModal(); return; }
        const found = aa.find(function(a){ return a.label === label; });
        if(found){
          closeModal();
          if(found.type === 'apply' && found.soilType){ _applySpecialSoil(found.soilType); }
          else if(found.onClick){ found.onClick(); }
        } else {
          closeModal();
        }
      };
    })(btns[i]);
  }
}

function _refreshMerchantView(){
  const p = document.getElementById('garden-page');
  if(!p || !p.classList.contains('on')) return;
  if(typeof _gardenActiveTab === 'undefined' || _gardenActiveTab !== 'merchant') return;
  const box = p.querySelector('#gp-content');
  if(!box) return;
  renderGardenMerchant(box);
}

/* ===== 商人主渲染 ===== */
function renderGardenMerchant(box){
  if(!window._merchantMainTab) window._merchantMainTab = 'lines';
  const curTab = window._merchantMainTab;
  const _prevScroll = { _box: box ? box.scrollTop : 0 };
  if(box){
    ['.mrc-trade-left','.mrc-trade-right','.mrc-cols','.mrc-wrap'].forEach(function(sel){
      const _e = box.querySelector(sel);
      if(_e) _prevScroll[sel] = _e.scrollTop;
    });
  }
  const g = _gardenMerchantInit();
  const m = g.merchant;
  const now = Date.now();
  let _sig;
  if(curTab === 'lines'){
    _sig = 'L|' + (m.foodLv||0) + '|' + (m.seedLv||0) + '|' + (m.throwLv||0) + '|' + (m.ammoLv||0);
  } else {
    const _ownedBlack = (state.garden && state.garden.ownedSpecialSoil && state.garden.ownedSpecialSoil.black_soil) ? 1 : 0;
    const _ownedRed   = (state.garden && state.garden.ownedSpecialSoil && state.garden.ownedSpecialSoil.red_soil) ? 1 : 0;
    _sig = 'T|' + (window._tradeSelectedId || '') + '|' + (window._tradeQty || 1) + '|' + _ownedBlack + '|' + _ownedRed;
  }
  const _forceRebuild = window._merchantLastTab !== curTab;
  window._merchantLastTab = curTab;
  const _domOk = box && box.querySelector('.mrc-page');
  if(!_forceRebuild && window._merchantSig === _sig && _domOk){
    if(curTab === 'lines'){
      try { _gardenMerchantRefreshUI(); } catch(e){ console.warn('[merchant refresh]', e); }
    } else if(window._tradeSelectedId){
      const _item = findTradeItem(window._tradeSelectedId);
      if(_item && !_isTradeOwned(_item)){
        const _total = _item.price * (window._tradeQty || 1);
        const _can = (g.food || 0) >= _total;
        const _btn = box.querySelector('.mrc-td-buy');
        if(_btn){
          _btn.disabled = !_can;
          _btn.textContent = _can ? '確認交易' : '食物不足';
        }
      }
    }
    return;
  }
  window._merchantSig = _sig;
  function lineBlock(lineKey){
    const meta = _gardenMerchantLineMeta(lineKey);
    if(!meta) return '';
    const lv = m[meta.lvKey] || 0;
    const last = m[meta.lastKey] || 0;
    const INTERVAL = MERCHANT_INTERVAL_MS;
    const isValidLast = (typeof last === 'number' && Number.isFinite(last) && last >= _MIN_VALID_TS && last % INTERVAL === 0);
    let remain = 0, ready = false, pct = 0;
    if(lv > 0 && isValidLast){
      const nextTick = last + INTERVAL;
      remain = Math.ceil(Math.max(0, nextTick - now) / 1000);
      ready = now >= nextTick;
      pct = Math.min(100, Math.max(0, ((now - last) / INTERVAL) * 100));
    }
    const st = (lv > 0) ? _gardenMerchantLineStatus(lineKey) : null;
    const resourceOk = !st || !st.paused;
    let _cdText = '';
    if(lv > 0){
      if(ready && resourceOk) _cdText = '就緒';
      else if(ready && !resourceOk) _cdText = '缺資源';
      else _cdText = remain + 's';
    }
    let h = '<div class="mrc-card" data-line="' + lineKey + '"><div class="mrc-head"><div class="mrc-title">' + meta.icon + ' ' + meta.title + '</div><div class="mrc-cur-lv mrc-sub-btn" data-line="' + lineKey + '">' + (lv === 0 ? '訂閱' : 'Lv.' + lv) + '</div></div>';
    if(lv > 0){
      h += '<div class="mrc-cd-row"><div class="mrc-cd-bar"><div class="fill" style="width:' + pct + '%"></div></div><div class="mrc-cd-num">' + _cdText + '</div></div>';
    } else {
      h += '<div class="mrc-cd-row mrc-cd-off">待機（點擊等級訂閱）</div>';
    }
    h += '</div>';
    return h;
  }
  let html = '<div class="mrc-page">';
  html += '<div class="mrc-subnav"><div class="mrc-subtab' + (curTab === 'lines' ? ' on' : '') + '" data-mtab="lines">產線</div><div class="mrc-subtab' + (curTab === 'trade' ? ' on' : '') + '" data-mtab="trade">交易</div></div>';
  html += '<div class="mrc-wrap">';
  if(curTab === 'lines'){
    html += '<div class="mrc-cols"><div class="mrc-col">' + lineBlock('food') + lineBlock('seed') + '</div><div class="mrc-col">' + lineBlock('throw') + lineBlock('ammo') + '</div></div>';
  } else {
    html += renderTradeContent();
  }
  html += '</div></div>';
  box.innerHTML = html;
  const sub = box.querySelectorAll('.mrc-subtab');
  for(let i = 0; i < sub.length; i++){
    (function(el){
      el.onclick = function(){ window._merchantMainTab = el.getAttribute('data-mtab'); renderGardenMerchant(box); };
    })(sub[i]);
  }
  if(curTab === 'lines'){
    const btns = box.querySelectorAll('.mrc-sub-btn');
    for(let i = 0; i < btns.length; i++){
      (function(el){
        el.onclick = function(){ const lk = el.getAttribute('data-line'); if(lk) _gardenMerchantShowPlans(lk); };
      })(btns[i]);
    }
  } else {
    const cells = box.querySelectorAll('.mrc-trade-cell');
    for(let i = 0; i < cells.length; i++){
      (function(el){
        el.onclick = function(){
          const tid = el.getAttribute('data-tid');
          if(!tid) return;
          const item = findTradeItem(tid);
          if(!item) return;
          if(_isTradeOwned(item)) return;
          window._tradeSelectedId = tid;
          window._tradeQty = 1;
          const _all = box.querySelectorAll('.mrc-trade-cell');
          for(let j = 0; j < _all.length; j++){ _all[j].classList.toggle('on', _all[j].getAttribute('data-tid') === tid); }
          renderTradeDetail();
        };
      })(cells[i]);
    }
    renderTradeDetail();
  }
  if(box){
    if(_prevScroll._box > 0) box.scrollTop = _prevScroll._box;
    ['.mrc-trade-left','.mrc-trade-right','.mrc-cols','.mrc-wrap'].forEach(function(sel){
      const _v = _prevScroll[sel];
      if(typeof _v === 'number' && _v > 0){
        const _e = box.querySelector(sel);
        if(_e) _e.scrollTop = _v;
      }
    });
  }
}

/* ===== 產線狀態（供基地統計 / 訂閱面板調用） ===== */
function _gardenMerchantLineStatus(lineKey){
  const g = _gardenMerchantInit();
  const m = g.merchant;
  const map = {
    food:  { lvKey:'foodLv',  table:MERCHANT_FOOD_TABLE },
    seed:  { lvKey:'seedLv',  table:MERCHANT_SEED_TABLE },
    throw: { lvKey:'throwLv', table:MERCHANT_THROW_TABLE },
    ammo:  { lvKey:'ammoLv',  table:MERCHANT_AMMO_TABLE }
  };
  const cfg = map[lineKey];
  if(!cfg) return null;
  const lv = m[cfg.lvKey] || 0;
  if(lv <= 0) return { active: false };
  const c = cfg.table[lv];
  if(!c) return { active: true, paused: true, missing: ['資料缺失'] };
  const missing = [];
  if(lineKey === 'food'){
    const costs = {};
    if(c.gears) costs.gears = c.gears;
    if(c.electronics) costs.electronics = c.electronics;
    if(c.screws) costs.screws = c.screws;
    for(const x of _gardenMerchantMissingList(costs)) missing.push(x);
    const poolBefore = m.foodPool || 0;
    const cropVal = _gardenTotalCropValue();
    if(poolBefore + cropVal + 0.001 < c.cropValue) missing.push('作物');
  } else if(lineKey === 'seed'){
    const costs = { metal: c.metal };
    if(c.gears) costs.gears = c.gears;
    if(c.electronics) costs.electronics = c.electronics;
    for(const x of _gardenMerchantMissingList(costs)) missing.push(x);
  } else if(lineKey === 'throw'){
    if(c.legend){
      if((g.food || 0) + 0.001 < c.foodCost) missing.push('食物');
    } else {
      const costs = { metal: c.metal };
      if(c.gears) costs.gears = c.gears;
      if(c.cloth) costs.cloth = c.cloth;
      if(c.electronics) costs.electronics = c.electronics;
      for(const x of _gardenMerchantMissingList(costs)) missing.push(x);
    }
  } else if(lineKey === 'ammo'){
    if((g.food || 0) + 0.001 < c.foodCost) missing.push('食物');
  }
  return { active: true, paused: missing.length > 0, missing: missing };
}

/* ===== 產線詳情（基地統計點擊進入） ===== */
function _openMerchantLineDetail(lineKey){
  const meta = _gardenMerchantLineMeta(lineKey);
  if(!meta) return;
  const g = _gardenMerchantInit();
  const m = g.merchant;
  const lv = m[meta.lvKey] || 0;
  if(lv <= 0){ return; }
  const cfg = meta.table[lv];
  const st = _gardenMerchantLineStatus(lineKey);
  const last = m[meta.lastKey] || 0;
  const now = Date.now();
  const elapsed = now - last;
  const remainMs = Math.max(0, MERCHANT_INTERVAL_MS - elapsed);
  const remain = Math.ceil(remainMs / 1000);
  let body = '';
  body += '<div class="detail-sub">' + meta.title + ' · Lv.' + lv + '</div>';
  body += '<div class="divider"></div>';
  body += '<div class="stat-line"><span class="k">週期</span><span class="v">' + Math.round(MERCHANT_INTERVAL_MS/1000) + ' 秒</span></div>';
  body += '<div class="stat-line"><span class="k">下次</span><span class="v">' + remain + ' 秒後</span></div>';
  body += '<div class="stat-line"><span class="k">消耗</span><span class="v" style="color:#e05252">' + _gardenMerchantCostStr(cfg, lineKey) + '</span></div>';
  body += '<div class="stat-line"><span class="k">產出</span><span class="v" style="color:#4caf50">' + _gardenMerchantProduceStr(cfg, lineKey) + '</span></div>';
  if(lineKey === 'food'){
    body += '<div class="stat-line"><span class="k">預付</span><span class="v">🌾' + (m.cropValuePool || 0) + '</span></div>';
  }
  body += '<div class="divider"></div>';
  if(st && st.paused){
    body += '<div style="color:#e05252;font-weight:bold">暫停中</div>';
    if(st.missing && st.missing.length){
      body += '<div style="font-size:11px;color:#7a6f60;margin-top:4px">缺少：' + st.missing.join('、') + '</div>';
    }
  } else {
    body += '<div style="color:#4caf50;font-weight:bold">運作中</div>';
  }
  const ft = document.createElement('div');
  ft.className = 'modal-ft';
  ft.innerHTML = '';
  openModal({ title: meta.title, body: body, footer: ft });
}

/* ===== 產線實時刷新定時器（源自 08a-garden-servants.js） ===== */
function _startMerchantLiveTimer(){
  if(window._merchantLiveTimer) return;
  window._merchantLiveTimer = setInterval(function(){
    if(typeof _gardenActiveTab === 'undefined' || _gardenActiveTab !== 'merchant') return;
    const p = document.getElementById('garden-page');
    if(!p || !p.classList.contains('on')) return;
    if(typeof _gardenMerchantRefreshUI === 'function') _gardenMerchantRefreshUI();
  }, 1000);
}
_startMerchantLiveTimer();

/* ===== 商人 5 秒主循環（源自 08-garden-core.js） ===== */
if(!window.__merchantTimer){
  window.__merchantTimer = setInterval(function(){
    try{
      if(typeof state !== 'undefined' && state.garden && state.garden.merchant){ _gardenMerchantTick(); }
    }catch(e){ console.warn('[merchant tick error]', e); }
  }, 5000);
}

/* ===== rev256: 後院系統整合 ===== */
function _gardenLog(text, cls, rarity, detail){
  if(!state.garden || typeof state.garden !== 'object') state.garden = {};
  if(!Array.isArray(state.garden.log)) state.garden.log = [];
  state.garden.log.push({ t: Date.now(), text: String(text), cls: cls || '', rarity: rarity || '', detail: detail || null });
  if(state.garden.log.length > 100) state.garden.log.splice(0, state.garden.log.length - 100);
}

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

function _gardenServantLeaveCheck(silent){
  const now = Date.now();
  const leaving = [];
  state.servants = (state.servants || []).filter(function(s){
    if(s.lv > 1) return true;
    if((s.exp || 0) > 0) return true;
    if(s.assignedPlots && s.assignedPlots.length > 0) return true;
    const grace = SERVANT_LEAVE_GRACE[s.rarity] || 24 * 3600 * 1000;
    const obtained = s.obtainedAt || now;
    if(now - obtained < grace) return true;
    leaving.push(s);
    return false;
  });
  const seedReward = {}, matReward = {};
  if(!leaving.length) return { count: 0, seeds: seedReward, mats: matReward };
  const seedNames = Object.keys(SEEDS);
  const matNames = ['wood','metal','screws','cloth','gears','electronics'];
  for(const s of leaving){
    const r = SERVANT_LEAVE_REWARD[s.rarity] || SERVANT_LEAVE_REWARD['一般'];
    const sc = rndInt(r.seedMin, r.seedMax);
    for(let i = 0; i < sc; i++){
      const sid = pick(seedNames);
      gardenStorageAdd(sid, s.rarity, 1);
      const k = sid + '@' + s.rarity;
      seedReward[k] = (seedReward[k] || 0) + 1;
    }
    const mc = rndInt(r.matMin, r.matMax);
    for(let i = 0; i < mc; i++){
      const mid = pick(matNames);
      invAdd(mid, '一般', 1);
      matReward[mid] = (matReward[mid] || 0) + 1;
    }
  }
  if(!silent){
    _gardenLog(leaving.length + ' 僕人離開', 'leave');
  }
  return { count: leaving.length, seeds: seedReward, mats: matReward };
}

function _gardenMealTick(now){
  const g = _gardenMerchantInit();
  if(typeof g.lastMealAt !== 'number'){
    g.lastMealAt = Math.floor(now / GARDEN_MEAL_INTERVAL_MS) * GARDEN_MEAL_INTERVAL_MS;
    return false;
  }
  const curHour = Math.floor(now / GARDEN_MEAL_INTERVAL_MS);
  const lastHour = Math.floor(g.lastMealAt / GARDEN_MEAL_INTERVAL_MS);
  if(curHour <= lastHour) return false;
  const meals = Math.min(curHour - lastHour, 24);
  let changed = false;
  for(let m = 0; m < meals; m++){
    if(_gardenDoOneMeal(g)) changed = true;
  }
  g.lastMealAt = curHour * GARDEN_MEAL_INTERVAL_MS;
  return changed;
}

function _gardenDoOneMeal(g){
  // 守衛站岗體力消耗（每小時 -60）
  const _guards = (state.servants || []).filter(function(s){
    return s.type === 'guard' && s.assignedPlots && s.assignedPlots.length > 0;
  });
  for(const _gd of _guards){
    _gd.stamina = Math.max(0, (_gd.stamina || 0) - GUARD_STAMINA_DRAIN_PER_HOUR);
  }
  const servants = (state.servants || []).filter(function(s){
    return s.assignedPlots && s.assignedPlots.length > 0;
  });
  if(!servants.length) return false;
  let totalCost = 0;
  const costs = [];
  for(const s of servants){
    const policy = s.foodPolicy || 'normal';
    const base = FOOD_COST_BASE[policy] || 0;
    if(base === 0){ costs.push(0); continue; }
    const mult = RARITY_FOOD_MULT[s.rarity] || 1;
    const c = Math.round(base * mult * 10) / 10;
    costs.push(c);
    totalCost += c;
  }
  if(totalCost > 0 && g.food + 0.001 < totalCost) return false;
  let changed = false;
  for(let i = 0; i < servants.length; i++){
    const s = servants[i];
    const cost = costs[i];
    const effMax = servantEffectiveMaxStamina(s);
    if(cost === 0){
      if(s.stamina !== 0){ s.stamina = 0; changed = true; }
      s._starve = false;
      continue;
    }
    g.food -= cost;
    if(s.stamina !== effMax){ s.stamina = effMax; changed = true; }
    s._starve = false;
    changed = true;
  }
  return changed;
}

/* rev320: 離線堆肥農民任務（與線上 _gardenCompostFindTask 邏輯對齊） */
function _offlineCompostFindTask(srv, t, actor){
  const effMax = servantEffectiveMaxStamina(srv);
  if(effMax < 1) return null;
  const stam = srv.stamina || 0;
  const _has = actor && actor._hasCompost;
  if(_has){
    const plots = _gardenGetPlots();
    const total = plots.length;
    const start = state.garden.compostNextIdx || 0;
    for(let i = 0; i < total; i++){
      const idx = (start + i) % total;
      const p = plots[idx];
      if(!p || p.broken || p.type !== 'soil') continue;
      if(p.fertilized) continue;
      if(stam < 120){ if(actor) actor._hasCompost = false; return null; }
      if((state.garden.compostValue || 0) < 8){ if(actor) actor._hasCompost = false; return null; }
      return { type: 'fertilize', plotIdx: idx };
    }
    if(actor) actor._hasCompost = false;
    return null;
  }
  if(stam < 220) return null; /* rev357: 確保體力足以完成取肥與施肥 */
  if((state.garden.compostValue || 0) < 8) return null;
  return { type: 'fetch_compost', plotIdx: -1 };
}

function _offlineFindFarmerTask(srv, t, actor){
  if(typeof _isAssignedToCompost === 'function' && _isAssignedToCompost(srv)){
    return _offlineCompostFindTask(srv, t, actor);
  }
  const plots = _gardenGetPlots();
  const cleanCands = [];
  for(const idx of (srv.assignedPlots || [])){
    const plot = plots[idx];
    if(!plot || plot.broken || !_isSoilType(plot.type) || !plot.crop) continue;
    const c = plot.crop;
    const seed = SEEDS[c.seedId];
    if(!seed) continue;
    const rottenAt = c.matureAt + seed.rotMs;
    if(t >= rottenAt) cleanCands.push(idx);
  }
  if(cleanCands.length) return { type: 'cleanup', plotIdx: cleanCands[0] };
  const harvestCands = [];
  for(const idx of (srv.assignedPlots || [])){
    const plot = plots[idx];
    if(!plot || plot.broken || !_isSoilType(plot.type) || !plot.crop) continue;
    const c = plot.crop;
    const seed = SEEDS[c.seedId];
    if(!seed) continue;
    if(t < c.matureAt) continue;
    const rottenAt = c.matureAt + seed.rotMs;
    if(t >= rottenAt) continue;
    harvestCands.push({ idx: idx, rottenAt: rottenAt });
  }
  harvestCands.sort(function(a, b){ return a.rottenAt - b.rottenAt; });
  if(harvestCands.length) return { type: 'harvest', plotIdx: harvestCands[0].idx };
  const autoPlant = srv.autoPlant || 'off';
  if(autoPlant !== 'off'){
    for(const idx of (srv.assignedPlots || [])){
      const plot = plots[idx];
      if(!plot || plot.broken || !_isSoilType(plot.type)) continue;
      if(plot.crop) continue;
      if(autoPlant === 'follow' && plot.lastSeed && plot.lastRarity && SEEDS[plot.lastSeed]){
        if(gardenStorageCount(plot.lastSeed, plot.lastRarity) > 0){
          return { type: 'plant', plotIdx: idx, seedId: plot.lastSeed, rarity: plot.lastRarity };
        }
      } else if(autoPlant === 'any'){
        const seedInfo = _gardenFindSeedToPlant('any');
        if(seedInfo){
          return { type: 'plant', plotIdx: idx, seedId: seedInfo.id, rarity: seedInfo.rarity };
        }
      }
    }
  }
  return null;
}

function _offlineDoFarmerTask(srv, task, t, actor){
  const plots = _gardenGetPlots();
  /* rev320: 堆肥任務 */
  if(task.type === 'fetch_compost'){
    srv.stamina = Math.max(0, (srv.stamina || 0) - 100);
    if(actor) actor._hasCompost = true;
    return { ok: true, fetchCompost: true };
  }
  if(task.type === 'fertilize'){
    const _idx = task.plotIdx;
    const _p = plots[_idx];
    if(!_p || _p.broken) return { ok: false };
    if(_p.fertilized) return { ok: false };
    if((state.garden.compostValue || 0) < 8) return { ok: false };
    if((srv.stamina || 0) < 120) return { ok: false };
    state.garden.compostValue -= 8;
    srv.stamina = Math.max(0, srv.stamina - 120);
    _p.fertilized = true;
    _p.fertExpireAt = t + 45 * 60 * 1000;
    state.garden.compostNextIdx = (_idx + 1) % plots.length;
    if(actor) actor._hasCompost = false;
    return { ok: true, fertilize: true };
  }
  const plot = plots[task.plotIdx];
  if(!plot || plot.broken) return { ok: false };
  if(task.type === 'cleanup'){
    if(!plot.crop) return { ok: false };
    plot.crop = null;
    return { ok: true, clean: true };
  }
  if(task.type === 'harvest'){
    if(!plot.crop) return { ok: false };
    const c = plot.crop;
    const seed = SEEDS[c.seedId];
    if(!seed) return { ok: false };
    if(t < c.matureAt) return { ok: false };
    const rottenAt = c.matureAt + seed.rotMs;
    if(t >= rottenAt) return { ok: false };
    const mult = RARITY_MULT[c.rarity] || 1;
    const _fB = 1 + ((srv.lv || 1) - 1) * 0.05;
    const _foB = 1 + gardenGetForemanBonus();
    let count = Math.max(1, Math.round(seed.baseYield * mult * _fB * _foB));
    if(plot.fertilized && t < (plot.fertExpireAt || 0)){ count = Math.round(count * 1.3); }
    const _sbH2 = _getSoilBonus(plot.type);
    count = Math.max(1, Math.round(count * (1 + _sbH2.yield)));
    plot.fertilized = false;
    plot.fertExpireAt = 0;
    gardenStorageAdd(seed.cropId, c.rarity, count);
    plot.crop = null;
    servantAddExp(srv, 5);
    return { ok: true, harvest: true, cropKey: seed.cropId + '@' + c.rarity, cropCount: count };
  }
  if(task.type === 'plant'){
    if(plot.crop) return { ok: false };
    if(!gardenStorageRemove(task.seedId, task.rarity, 1)) return { ok: false };
    const seed = SEEDS[task.seedId];
    if(!seed) return { ok: false };
    const _sbP2 = _getSoilBonus(plot.type);
    let growMs = Math.max(1000, Math.round(seed.growMs * (1 - _sbP2.grow)));
    if(state.garden && typeof state.garden.compostAccelSec === 'number' && state.garden.compostAccelSec > 0){
      const maxUse = Math.min(state.garden.compostAccelSec, (growMs / 1000) * 0.5);
      if(maxUse > 0){
        growMs = Math.max(1000, Math.round(growMs - maxUse * 1000));
        state.garden.compostAccelSec -= maxUse;
      }
    }
    plot.crop = { seedId: task.seedId, rarity: task.rarity, plantedAt: t, matureAt: t + growMs, cleanupUntil: 0 };
    plot.lastSeed = task.seedId;
    plot.lastRarity = task.rarity;
    servantAddExp(srv, 2);
    return { ok: true, plant: true };
  }
  return { ok: false };
}

function _gardenOfflineSettle(now, baseTime){
  window._gardenOfflineSettleRunning = true;
  try {
  const g = _gardenMerchantInit();
  /* rev535: 離線補扣堆肥（不寫入離線報告） */
  if(typeof g.lastCompostDecayAt !== 'number' || g.lastCompostDecayAt > baseTime){
    g.lastCompostDecayAt = Math.floor(baseTime / GARDEN_MEAL_INTERVAL_MS) * GARDEN_MEAL_INTERVAL_MS;
  }
  if(now <= baseTime) return;
  /* rev320: 與探索一致，離線最多結算 8 小時 */
  baseTime = Math.max(baseTime, now - 8 * 3600 * 1000);
  const WORK_MS = (typeof GARDEN_WORK_MS === 'number') ? GARDEN_WORK_MS : 4000;
  /* rev320: MAX_ITER 提升，覆蓋 8 小時（最壞 4s/事件 → 7200，取 30000 留餘量） */
  const MAX_ITER = 30000;
  let cursor = baseTime;
  let totalHarvest = 0, totalPlant = 0, totalClean = 0, totalLeaves = 0, totalFert = 0;
  const cropsOut = {};
  const seedsOut = {};
  const matsOut = {};
  /* 產線離線產出累積：food 用次數、其他用物品 map */
  const merchantAccum = { foodBatches: 0, seed: {}, throw: {}, ammo: {} };
  function _mergeLine(key, items){
    if(key === 'food'){
      let tot = 0;
      for(const it of items) tot += it.count;
      merchantAccum.foodBatches += tot;
    } else {
      const map = merchantAccum[key];
      if(!map) return;
      for(const it of items){
        const k2 = it.id + '@' + it.rarity;
        if(!map[k2]) map[k2] = { id: it.id, rarity: it.rarity, count: 0 };
        map[k2].count += it.count;
      }
    }
  }
  /* rev611: 記錄私酒初始數量，用於離線產出統計 */
  const _liquorBefore = {};
  {
    const _s = _gardenStorageInit();
    for(const _k in _s){
      if(_k.indexOf('liquor@') === 0 && _s[_k] > 0){
        _liquorBefore[_k] = _s[_k];
      }
    }
  }
  let lastMealHour = Math.floor(baseTime / GARDEN_MEAL_INTERVAL_MS);
  const farmers = (state.servants || []).filter(function(s){
    return s.type === 'farmer' && s.assignedPlots && s.assignedPlots.length > 0;
  });
  const actorMap = {};
  for(const f of farmers){
    const effMax = servantEffectiveMaxStamina(f);
    actorMap[f.id] = { srv: f, stamina: Math.min(f.stamina || 0, effMax), task: null, taskEnd: 0, _hasCompost: false };
  }
  /* rev320: 主模擬包內層 try/catch，確保尾部日誌推送不被例外跳過 */
  try {
    let iter = 0;
    while(cursor < now && iter < MAX_ITER){
      iter++;
      let nextT = now;
      const nextHour = (Math.floor(cursor / GARDEN_MEAL_INTERVAL_MS) + 1) * GARDEN_MEAL_INTERVAL_MS;
      if(nextHour < nextT) nextT = nextHour;
      const m = g.merchant;
      for(const lk of ['food','seed','throw','ammo']){
        const meta = _gardenMerchantLineMeta(lk);
        if(!meta) continue;
        const lv = m[meta.lvKey] || 0;
        if(lv <= 0) continue;
        const last = m[meta.lastKey] || 0;
        if(last === 0) continue;
        const nextTick = last + MERCHANT_INTERVAL_MS;
        if(nextTick > cursor && nextTick < nextT) nextT = nextTick;
      }
      for(const id in actorMap){
        const a = actorMap[id];
        if(a.task && a.taskEnd > cursor && a.taskEnd < nextT) nextT = a.taskEnd;
      }
      const plots = _gardenGetPlots();
      for(const p of plots){
        if(p && p.type === 'soil' && p.crop && p.crop.matureAt > cursor && p.crop.matureAt < nextT){
          nextT = p.crop.matureAt;
        }
        /* rev611: 蒸餾室週期加入 nextT 候選 */
        if(p && p.type === 'distillery' && p.enabled !== false && typeof DISTILL_PERIOD_MS === 'number'){
          const _nextDistill = (Math.floor(cursor / DISTILL_PERIOD_MS) + 1) * DISTILL_PERIOD_MS;
          if(_nextDistill > cursor && _nextDistill < nextT) nextT = _nextDistill;
        }
      }
      if(nextT <= cursor){ cursor += 1000; continue; }
      if(nextT > now) nextT = now;
      cursor = nextT;
      const curHour = Math.floor(cursor / GARDEN_MEAL_INTERVAL_MS);
      while(lastMealHour < curHour){ _gardenDoOneMeal(g); lastMealHour++; }
      if(typeof _gardenCompostDecayTick === 'function'){
        try{ _gardenCompostDecayTick(cursor); }catch(e){}
      }
      if(typeof _gardenDistilleryTick === 'function'){
        try{ _gardenDistilleryTick(cursor); }catch(e){}
      }
      if(typeof _gardenMerchantLineProcess === 'function'){
        const _oldBatch = window._merchantTickBatch;
        window._merchantTickBatch = { t: cursor, lines: {} };
        try { _gardenMerchantLineProcess('food', cursor); } catch(e){ console.warn('[offline food]', e); }
        try { _gardenMerchantLineProcess('seed', cursor); } catch(e){ console.warn('[offline seed]', e); }
        try { _gardenMerchantLineProcess('throw', cursor); } catch(e){ console.warn('[offline throw]', e); }
        try { _gardenMerchantLineProcess('ammo', cursor); } catch(e){ console.warn('[offline ammo]', e); }
        const _batch = window._merchantTickBatch;
        window._merchantTickBatch = _oldBatch || null;
        if(_batch && _batch.lines){
          for(const _k in _batch.lines){
            const _line = _batch.lines[_k];
            if(_line && _line.items && _line.items.length){ _mergeLine(_k, _line.items); }
          }
        }
      }
      for(const id in actorMap){
        const a = actorMap[id];
        if(a.task && cursor >= a.taskEnd){
          const r = _offlineDoFarmerTask(a.srv, a.task, cursor, a);
          if(r.ok){
            if(r.harvest){ totalHarvest++; if(r.cropKey) cropsOut[r.cropKey] = (cropsOut[r.cropKey] || 0) + (r.cropCount || 1); }
            if(r.plant) totalPlant++;
            if(r.clean) totalClean++;
            if(r.fertilize) totalFert++;
            if(!r.fetchCompost){
              a.stamina = Math.max(0, a.stamina - 5);
            }
            a.srv.stamina = a.stamina;
          }
          a.task = null;
        }
      }
      for(const id in actorMap){
        const a = actorMap[id];
        if(a.task) continue;
        if(a.stamina < 20){
          const foremen = (state.servants || []).filter(function(s){
            return s.type === 'foreman' && s.assignedPlots && s.assignedPlots.length > 0 && (s.stamina || 0) >= 20;
          });
          if(foremen.length){
            const effMax = servantEffectiveMaxStamina(a.srv);
            foremen[0].stamina = Math.max(0, (foremen[0].stamina || 0) - 20);
            a.stamina = Math.max(a.stamina, Math.round(effMax * 0.3));
            a.srv.stamina = a.stamina;
          }
        }
        if(a.stamina < 5) continue;
        const task = _offlineFindFarmerTask(a.srv, cursor, a);
        if(task){
          const _bp2 = _gardenGetPlots()[task.plotIdx];
          if(!(_bp2 && _bp2.broken)){ a.task = task; a.taskEnd = cursor + WORK_MS; }
        }
      }
      if(cursor % GARDEN_MEAL_INTERVAL_MS < 5000){
        const lr = _gardenServantLeaveCheck(true);
        totalLeaves += lr.count || 0;
        for(const k in lr.seeds) seedsOut[k] = (seedsOut[k] || 0) + lr.seeds[k];
        for(const k in lr.mats) matsOut[k] = (matsOut[k] || 0) + lr.mats[k];
      }
      /* rev612: 同步 a.stamina ← a.srv.stamina —— 修復蒸餾扣體力後監工叫醒判斷看不到 */
      for(const _sid in actorMap){
        const _a = actorMap[_sid];
        _a.stamina = Math.min(_a.srv.stamina || 0, servantEffectiveMaxStamina(_a.srv));
      }
    }
    /* 離線防禦戰結算（在產線/農業結算之後） */
    try {
      if(typeof _offlineGardenRaidSettle === 'function') _offlineGardenRaidSettle(baseTime, now);
    } catch(e){ console.warn('[offline raid]', e); }
  } catch(e){
    console.warn('[garden offline sim] err', e);
  }
  /* rev611: 主循環結束後兜底補一次蒸餾（應對 MAX_ITER 用完、cursor 未推到 now） */
  if(cursor < now){
    try { if(typeof _gardenDistilleryTick === 'function') _gardenDistilleryTick(now); } catch(e){}
  }
  /* rev611: 計算私酒離線產出 */
  const liquorOut = {};
  {
    const _s = _gardenStorageInit();
    for(const _k in _s){
      if(_k.indexOf('liquor@') !== 0) continue;
      const _before = _liquorBefore[_k] || 0;
      const _after = _s[_k] || 0;
      if(_after > _before) liquorOut[_k] = _after - _before;
    }
  }
  g.lastMealAt = Math.floor(now / GARDEN_MEAL_INTERVAL_MS) * GARDEN_MEAL_INTERVAL_MS;
  const _mSeed = Object.keys(merchantAccum.seed).reduce(function(s,k){ return s + merchantAccum.seed[k].count; }, 0);
  const _mThrow = Object.keys(merchantAccum.throw).reduce(function(s,k){ return s + merchantAccum.throw[k].count; }, 0);
  const _mAmmo = Object.keys(merchantAccum.ammo).reduce(function(s,k){ return s + merchantAccum.ammo[k].count; }, 0);
  const _merchantHas = (merchantAccum.foodBatches > 0 || _mSeed > 0 || _mThrow > 0 || _mAmmo > 0);
  /* 需求 3：離線結算一律寫一條日誌（無活動也寫） */
  const hours = ((now - baseTime) / 3600000).toFixed(1);
  const detail = {
    type: 'offline_garden',
    hours: hours,
    harvest: totalHarvest, plant: totalPlant, clean: totalClean, leaves: totalLeaves, fertilize: totalFert,
    crops: cropsOut, seeds: seedsOut, mats: matsOut, liquor: liquorOut,
    merchant: merchantAccum
  };
  const parts = [];
  if(totalHarvest) parts.push('收穫 ' + totalHarvest + ' 次');
  if(totalPlant) parts.push('種植 ' + totalPlant + ' 次');
  if(totalClean) parts.push('清理 ' + totalClean + ' 次');
  if(totalFert) parts.push('施肥 ' + totalFert + ' 次');
  if(totalLeaves) parts.push(totalLeaves + ' 名僕人離開');
  if(_merchantHas){
    const _mp = [];
    if(merchantAccum.foodBatches > 0) _mp.push('🍲+' + merchantAccum.foodBatches);
    if(_mSeed) _mp.push('🌰+' + _mSeed);
    if(_mThrow) _mp.push('💣+' + _mThrow);
    if(_mAmmo) _mp.push('🎖️+' + _mAmmo);
    parts.push('產線 ' + _mp.join(' '));
  }
  /* rev611: summary 加私酒 */
  const _liqTotal = Object.keys(liquorOut).reduce(function(s, k){ return s + liquorOut[k]; }, 0);
  if(_liqTotal) parts.push('🍶+' + _liqTotal);
  const summary = parts.length
    ? ('離線 ' + hours + ' 小時，後院：' + parts.join('、') + '。 點擊查看 →')
    : ('離線 ' + hours + ' 小時，後院無活動。');
  if(!state.garden.log) state.garden.log = [];
  state.garden.log.push({ t: Date.now(), text: summary, cls: 'offline', detail: detail });
  if(state.garden.log.length > 100) state.garden.log.splice(0, state.garden.log.length - 100);
  try { if(typeof _gardenStorageRotCheck === "function") _gardenStorageRotCheck(); } catch(e){ console.warn("[offline rot]", e); }
  } finally {
    window._gardenOfflineSettleRunning = false;
  }
}

function gardenCleanup(idx){
  const plots = _gardenGetPlots();
  const plot = plots[idx];
  if(!plot || !plot.crop) return;
  const _c = plot.crop;
  const _seed = SEEDS[_c.seedId];
  const _cropDef = _seed ? CROPS[_seed.cropId] : null;
  const _info = _cropDef ? ('<span class="r-' + _c.rarity + '">' + _cropDef.name + '（' + _c.rarity + '）</span>') : '作物';
  plot.crop = null;
  save();
  try{ closeModal(); }catch(e){}
  _gardenLog('手動清理腐爛作物（' + plotCoordName(idx) + ' · ' + _info + '）', 'clean');
  renderGardenGrid();
  renderGardenContent();
}

function _clearPlotAssignments(idx){
  for(const s of (state.servants || [])){
    if(!Array.isArray(s.assignedPlots)) continue;
    s.assignedPlots = s.assignedPlots.filter(function(x){ return x !== idx; });
  }
}
/* ===== end rev256 ===== */

/* ===== rev257: renderGardenLog 重寫 ===== */
/* ===== rev301 log helpers ===== */
function _logCat(key, title, count, collapsed){
  return '<div class="cat-header" data-gcat="' + key + '" style="cursor:pointer"><span>' + title + ' (' + count + ')</span><span>' + (collapsed ? '▶' : '▼') + '</span></div>';
}
function _logItem(id, rarity, count, isFood){
  const def = isFood ? { name: '食物' } : (itemDef(id) || { name: id });
  const icon = isFood ? '🍲' : itemIcon(id, 30);
  const clickable = !isFood;
  const attrs = clickable ? (' data-iid="' + id + '" data-irar="' + rarity + '"') : '';
  const cursor = clickable ? '' : ' style="cursor:default"';
  return '<div class="item-row"' + attrs + cursor + '><div class="icon" style="background:' + rarityBg(rarity) + '">' + icon + '</div><div class="info"><div class="nm ' + rarityClass(rarity) + '">' + def.name + '</div><div class="sub">' + rarity + '</div></div><div class="cnt">×' + count + '</div></div>';
}
function _bindGardenLogItems(bd, entry){
  const _hds = bd.querySelectorAll('.cat-header[data-gcat]');
  for(let _i = 0; _i < _hds.length; _i++){
    (function(h){
      h.onclick = function(){
                const _kk = h.getAttribute('data-gcat');
        window._collapseStates['gl.'+_kk] = !window._collapseStates['gl.'+_kk];
        closeModal(); _openGardenLogDetail(entry);
      };
    })(_hds[_i]);
  }
  const _rows = bd.querySelectorAll('.item-row[data-iid]');
  for(let _i = 0; _i < _rows.length; _i++){
    (function(row){
      row.onclick = function(){
        const iid = row.getAttribute('data-iid');
        const irar = row.getAttribute('data-irar');
        closeModal();
        openItemDetail(iid, irar, function(){ _openGardenLogDetail(entry); });
      };
    })(_rows[_i]);
  }
}
/* ===== end log helpers ===== */




function _openGardenLogDetail(entry){
  if(!entry || !entry.detail) return;
  const d = entry.detail;
  /* 需求 7：按 type 分派，兩個類型分別走各自的彈窗 */
  if(d.type === 'merchant_batch'){ _openMerchantBatchDetail(entry); return; }
  if(d.type === 'offline_garden'){ _openOfflineGardenDetail(entry); return; }
  /* 未知類型：顯示診斷 */
  let body = '<div class="empty-hint">未知日誌類型：' + String(d.type || '?') + '</div>';
  body += '<div style="font-size:10px;color:#7a6f60;margin-top:8px;word-break:break-all">keys: ' + Object.keys(d).join(', ') + '</div>';
  const ft = document.createElement('div');
  ft.className = 'modal-ft';
  ft.innerHTML = '';
  openModal({ title: '詳情', body: body, footer: ft });
}

/* 產線結算彈窗 */
function _openMerchantBatchDetail(entry){
  const d = entry.detail;
  const _keys = ['food','seed','throw','ammo'];
    let body = '';
  for(const _k of _keys){
    const _line = d.lines && d.lines[_k];
    if(!_line || !_line.items || !_line.items.length) continue;
    const _meta = _gardenMerchantLineMeta(_k) || { icon: '?', title: _k };
    const _col = !!window._collapseStates['gl.mb_' + _k];
    body += '<div class="cat-header" data-gcat="mb_' + _k + '" style="cursor:pointer"><span>' + _meta.icon + ' ' + _meta.title + ' · ' + (_line.batches||0) + ' 批</span><span>' + (_col ? '▶' : '▼') + '</span></div>';
    if(!_col){
      for(const _it of _line.items){
        if(_it.id === 'food'){
          body += '<div class="item-row" style="cursor:default"><div class="icon" style="background:' + rarityBg(_it.rarity) + '">🍲</div><div class="info"><div class="nm ' + rarityClass(_it.rarity) + '">食物</div><div class="sub">' + _it.rarity + '</div></div><div class="cnt">×' + _it.count + '</div></div>';
        } else {
          const _def = itemDef(_it.id) || { name: _it.id };
          body += '<div class="item-row" data-iid="' + _it.id + '" data-irar="' + _it.rarity + '"><div class="icon" style="background:' + rarityBg(_it.rarity) + '">' + itemIcon(_it.id, 30) + '</div><div class="info"><div class="nm ' + rarityClass(_it.rarity) + '">' + _def.name + '</div><div class="sub">' + _it.rarity + '</div></div><div class="cnt">×' + _it.count + '</div></div>';
        }
      }
    }
  }
  if(!body){ body = '<div class="empty-hint">無產出資料</div>'; }
  const ft = document.createElement('div');
  ft.className = 'modal-ft';
  ft.innerHTML = '';
  const bd = openModal({ title: '產線結算', body: body, footer: ft });
  _bindGardenLogItems(bd, entry);
}

/* 離線後院彈窗（含產線分類） */
function _openOfflineGardenDetail(entry){
  const d = entry.detail;
  let body = '<div style="font-size:11px;color:#7a6f60;margin-bottom:8px;line-height:1.5">' + _esc(entry.text || '') + '</div>';
    function _catHtml(key, title, items){
    if(!items || !items.length) return '';
    const col = !!window._collapseStates['gl.og_' + key];
    let h = '<div class="cat-header" data-gcat="og_' + key + '" style="cursor:pointer"><span>' + title + ' (' + items.length + ')</span><span>' + (col ? '▶' : '▼') + '</span></div>';
    if(!col){
      for(const it of items){
        const _isFood = (it.id === 'food');
        const _isGardenExtra = (typeof GARDEN_EXTRAS !== 'undefined' && GARDEN_EXTRAS[it.id]);
        let def, _iconHtml, _clickable;
        if(_isFood){
          def = { name: '食物' };
          _iconHtml = '🍲';
          _clickable = false;
        } else if(_isGardenExtra){
          def = GARDEN_EXTRAS[it.id];
          _iconHtml = '<img src="icons/garden/' + def.img + '.png' + assetSuffix() + '" style="width:30px;height:30px;object-fit:contain;display:block" alt="">';
          _clickable = false;
        } else {
          def = itemDef(it.id) || { name: it.id };
          _iconHtml = itemIcon(it.id, 30);
          _clickable = true;
        }
        h += '<div class="item-row"' + (_clickable ? (' data-iid="' + it.id + '" data-irar="' + it.rarity + '"') : ' style="cursor:default"') + '><div class="icon" style="background:' + rarityBg(it.rarity) + '">' + _iconHtml + '</div><div class="info"><div class="nm ' + rarityClass(it.rarity) + '">' + def.name + '</div><div class="sub">' + it.rarity + '</div></div><div class="cnt">×' + it.count + '</div></div>';
      }
    }
    return h;
  }
  /* 後院作物/種子/材料（放最上方） */
  const _cArr = [], _sArr = [], _mArr = [], _lqArr = [];
  if(d.crops){ for(const k in d.crops){ const sp = k.split('@'); _cArr.push({ id: sp[0], rarity: sp[1], count: d.crops[k] }); } }
  if(d.seeds){ for(const k in d.seeds){ const sp = k.split('@'); _sArr.push({ id: sp[0], rarity: sp[1], count: d.seeds[k] }); } }
  if(d.mats){ for(const k in d.mats){ _mArr.push({ id: k, rarity: '一般', count: d.mats[k] }); } }
  /* rev611: 私酒 */
  if(d.liquor){ for(const k in d.liquor){ const sp = k.split('@'); _lqArr.push({ id: sp[0], rarity: sp[1], count: d.liquor[k] }); } }
  body += _catHtml('crops', '🌾 作物', _cArr);
  body += _catHtml('seeds', '🌰 種子', _sArr);
  body += _catHtml('mats', '🔩 材料', _mArr);
  body += _catHtml('liquor', '🍶 私酒', _lqArr);
  /* 產線產出（放最後） */
  if(d.merchant){
    if(d.merchant.foodBatches > 0){
      body += _catHtml('mfood', '🍲 食物生產線', [{ id:'food', rarity:'一般', count: d.merchant.foodBatches }]);
    }
    for(const _k of ['seed','throw','ammo']){
      const _src = d.merchant[_k];
      if(!_src) continue;
      const _items = Object.keys(_src).map(function(kk){ return _src[kk]; });
      if(!_items.length) continue;
      const _meta = _gardenMerchantLineMeta(_k) || { icon: '?', title: _k };
      body += _catHtml(_k, _meta.icon + ' ' + _meta.title, _items);
    }
  }
  const ft = document.createElement('div');
  ft.className = 'modal-ft';
  ft.innerHTML = '';
  const bd = openModal({ title: '離線後院', body: body, footer: ft });
  _bindGardenLogItems(bd, entry);
}

function _openBattleLogDetail(entry){
  if(!entry) return;
  const win = entry.win;
  let body = '<div class="detail-title ' + (win?'r-傳奇':'r-破舊') + '">' + (win?'⚔️ 勝利':'💀 失敗') + '</div>';
  body += '<div class="detail-sub">' + _esc(entry.region || '') + '</div>';
  body += '<div class="stat-line"><span class="k">回合</span><span class="v">' + entry.rounds + '</span></div>';
  body += '<div class="stat-line"><span class="k">守衛</span><span class="v">' + entry.guardAlive + ' / ' + entry.guardTotal + '</span></div>';
  body += '<div class="stat-line"><span class="k">敵人</span><span class="v">' + entry.enemyCount + '</span></div>';
  body += '<div class="stat-line"><span class="k">彈藥</span><span class="v">' + entry.ammoUsed + ' 發</span></div>';
  body += '<div class="stat-line"><span class="k">總傷害</span><span class="v">' + entry.totalDmg + '</span></div>';
  if(entry.guardAmmoList && entry.guardAmmoList.length){
    body += '<div class="divider"></div><div style="font-size:11px;color:#e8a33d;margin-bottom:4px">守衛表現</div>';
    for(const ga of entry.guardAmmoList){
      body += '<div class="stat-line"><span class="k">' + _esc((ga.coord||'') + ' ' + ga.name) + '</span><span class="v">' + ga.ammoName + '×' + ga.count + ' 傷' + ga.dmg + '</span></div>';
    }
  }
  if(!win && entry.broken && entry.broken.length){
    body += '<div class="divider"></div><div style="color:#e05252;font-size:11px">損壞：' + entry.broken.join(' ') + '</div>';
  }
  if(!win && entry.stolen && entry.stolen.length){
    body += '<div style="color:#e05252;font-size:11px">掠奪：' + _lootHtml(entry.stolen, '#e05252') + '</div>';
  }
  if(win && entry.loot && entry.loot.length){
    body += '<div class="divider"></div><div style="color:#4caf50;font-size:11px">獲得：' + _lootHtml(entry.loot, '#4caf50') + '</div>';
  }
  const ft = document.createElement('div');
  ft.className = 'modal-ft';
  ft.innerHTML = '';
  openModal({ title: '戰鬥詳情', body: body, footer: ft });
}

function _gardenUpdateBattleCol(){
  const p = document.getElementById('garden-page');
  if(!p) return;
  if(typeof _gardenActiveTab === 'undefined' || _gardenActiveTab !== 'log') return;
  const box = p.querySelector('#gp-content');
  if(!box) return;
  const _rw = box.querySelector('.gs-wrap[data-col="battle"]');
  if(!_rw) return;
  const live = window._raidLiveLog || [];
  let html = '';
  for(let i = 0; i < live.length; i++){
    const e = live[i];
    html += '<div class="raid-live-log-line ' + (e.cls || '') + '">' + _esc(e.text) + '</div>';
  }
  if(!html) html = '<div class="gs-empty" style="position:static;padding:20px 0">戰鬥開始…</div>';
  _rw.innerHTML = html;
  _rw.scrollTop = _rw.scrollHeight;
}

function renderGardenLog(box){
  if(!box) return;
  const log = (state.garden && state.garden.log) || [];
  const battleLog = (state.garden && state.garden.battleLog) || [];
  const liveActive = !!window._raidLiveActive;
  const live = window._raidLiveLog || [];
  function tsStr(t){
    const d = new Date(t);
    return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
  }
  function tsFull(t){
    const d = new Date(t);
    return ('0' + (d.getMonth()+1)).slice(-2) + '/' + ('0' + d.getDate()).slice(-2) + ' ' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
  }
  let left = '<div class="gs-wrap" data-col="prod">';
  if(!log.length){
    left += '<div class="gs-empty" style="position:static;padding:20px 0">暫無記錄</div>';
  } else {
    for(let i = 0; i < log.length; i++){
      const e = log[i];
      const clickAttr = e.detail ? ' data-log-idx="' + i + '"' : '';
      left += '<div class="garden-log-line ' + (e.cls||'') + '"' + clickAttr + '><span class="gl-time">' + tsStr(e.t) + '</span> ' + e.text + '</div>';
    }
  }
  left += '</div>';
  let right = '<div class="gs-wrap" data-col="battle">';
  if(liveActive){
    if(!live.length){
      right += '<div class="gs-empty" style="position:static;padding:20px 0">戰鬥開始…</div>';
    } else {
      for(let i = 0; i < live.length; i++){
        const e = live[i];
        right += '<div class="raid-live-log-line ' + (e.cls||'') + '">' + _esc(e.text) + '</div>';
      }
    }
  } else {
    if(!battleLog.length){
      right += '<div class="gs-empty" style="position:static;padding:20px 0">暫無戰鬥</div>';
    } else {
      for(let i = 0; i < battleLog.length; i++){
        const e = battleLog[i];
        const win = e.win;
        right += '<div class="battle-log-item ' + (win?'win':'lose') + '" data-battle-idx="' + i + '" style="cursor:pointer">';
        right += '<div class="bl-head"><span class="bl-title">' + (win?'⚔️勝':'💀敗') + ' ' + _esc(e.region||'') + '</span><span class="bl-time">' + tsFull(e.t) + '</span></div>';
        right += '<div class="bl-row">' + e.rounds + '回 · 守' + e.guardAlive + '/' + e.guardTotal + ' · 敵' + e.enemyCount + ' · 彈' + e.ammoUsed + ' · 傷' + e.totalDmg + '</div>';
        right += '</div>';
      }
    }
  }
  right += '</div>';
  box.innerHTML = '<div class="gs-cols">' +
    '<div class="gs-col" style="padding:0 6px;border-left:none">' + left + '</div>' +
    '<div class="gs-col" style="padding:0 6px;border-left:1px solid #e8a33d">' + right + '</div>' +
    '</div>';
  const _lw = box.querySelector('.gs-wrap[data-col="prod"]');
  const _rw = box.querySelector('.gs-wrap[data-col="battle"]');
  requestAnimationFrame(function(){
    if(_lw) _lw.scrollTop = _lw.scrollHeight;
    if(_rw) _rw.scrollTop = _rw.scrollHeight;
  });
  /* 點擊事件已由 _ensureGardenPage 的事件委托處理，無需內聯 onclick
     （避免 DOM re-render 時 onclick 綁定失效，以及委託+內聯雙重觸發） */
}
/* ===== end rev257 ===== */

/* ===== rev259: 僕人編號 + 改名 ===== */
function servantLabel(srv){
  if(!srv) return '?';
  if(srv.customName) return srv.customName;
  return '#' + (srv.tag || '?');
}

function _truncateServantName(s){
  if(!s) return '';
  let n = 0;
  let out = '';
  for(const c of s){
    const w = c.codePointAt(0) > 0x7F ? 2 : 1;
    if(n + w > 8) break;
    out += c;
    n += w;
  }
  return out;
}


function _servantEscHtml(s){
  if (s == null) return '';
  return String(s).replace(/[&<>"']/g, function(c){
    return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
  });
}


function openServantRename(srvId, returnFn){
  const srv = (state.servants || []).find(function(s){ return s.id === srvId; });
  if(!srv) return;
  const cur = srv.customName || '';
  const ft = document.createElement('div');
  ft.className = 'modal-ft';
  ft.innerHTML = '<button class="btn primary" id="rn-ok">確定</button><button class="btn" id="rn-clear">清除</button><button class="btn ghost" id="rn-cancel">取消</button>';
  const _escaped = _servantEscHtml(cur);
  let body = '<div style="font-size:11px;color:#7a6f60;margin-bottom:6px">留空則使用編號（#' + (srv.tag || '?') + '）</div>';
  body += '<input id="rn-input" type="text" value="' + _escaped + '" style="width:100%;background:#151210;color:#ddd;border:1px solid #2a231c;border-radius:4px;padding:8px;font-size:13px;font-family:inherit;box-sizing:border-box">';
  const bd = openModal({ title: '改名', body: body, footer: ft, onClose: function(){ openServantDetail(srvId, returnFn); } });
  const inp = bd.querySelector('#rn-input');
  if(inp){
    setTimeout(function(){ inp.focus(); inp.select(); }, 100);
    inp.oninput = function(){
      const t = _truncateServantName(inp.value);
      if(t !== inp.value) inp.value = t;
    };
  }
  ft.querySelector('#rn-ok').onclick = function(){
    const v = (inp.value || '').trim();
    srv.customName = _truncateServantName(v);
    save();
    if(typeof _refreshServantListNow === 'function') _refreshServantListNow();
    closeModal();
    openServantDetail(srvId, returnFn);
  };
  ft.querySelector('#rn-clear').onclick = function(){
    srv.customName = '';
    save();
    if(typeof _refreshServantListNow === 'function') _refreshServantListNow();
    closeModal();
    openServantDetail(srvId, returnFn);
  };
  ft.querySelector('#rn-cancel').onclick = closeModal;
}
/* ===== end rev259 ===== */

/* ===== rev264: 監工巡邏 ===== */
function _gardenGetFarmerPlots(){
  const seen = {};
  const out = [];
  for(const s of (state.servants || [])){
    if(s.type !== 'farmer') continue;
    if(!s.assignedPlots || !s.assignedPlots.length) continue;
    for(const idx of s.assignedPlots){
      if(!seen[idx]){ seen[idx] = true; out.push(idx); }
    }
  }
  return out;
}
/* ===== end rev264 ===== */

/* ===== rev274: 農場後台推進 ===== */
function _gardenFarmBackgroundTick(now){
  if(!state.garden || typeof state.garden !== 'object') return;
  const p = document.getElementById('garden-page');
  if(p && p.classList.contains('on')) return;
  const farmers = (state.servants || []).filter(function(s){
    return s.type === 'farmer' && s.assignedPlots && s.assignedPlots.length > 0;
  });
  if(!farmers.length) return;
  let acted = 0;
  const foremen = (state.servants || []).filter(function(f){
    return f.type === 'foreman' && f.assignedPlots && f.assignedPlots.length > 0;
  });
  for(const srv of farmers){
    if(typeof _isAssignedToCompost === 'function' && _isAssignedToCompost(srv)) continue;
    if((srv.stamina || 0) < 20){
      for(const fm of foremen){
        if((fm.stamina || 0) < 20) continue;
        const effMax = servantEffectiveMaxStamina(srv);
        if(effMax < 1) break;
        fm.stamina = Math.max(0, (fm.stamina || 0) - 20);
        srv.stamina = Math.max(srv.stamina || 0, Math.round(effMax * 0.3));
        break;
      }
    }
    if((srv.stamina || 0) < 5) continue;
    const task = _offlineFindFarmerTask(srv, now);
    if(!task) continue;
    const r = _offlineDoFarmerTask(srv, task, now);
    if(r.ok){
      srv.stamina = Math.max(0, (srv.stamina || 0) - 5);
      acted++;
    }
  }
  if(acted > 0) save();
}
/* ===== end rev274 ===== */

/* ===== rev291: 手動放飯 ===== */
function _fmtNextMealCountdown(){
  const now = Date.now();
  const nextAt = (Math.floor(now / GARDEN_MEAL_INTERVAL_MS) + 1) * GARDEN_MEAL_INTERVAL_MS;
  const remainMs = Math.max(0, nextAt - now);
  const totalMin = Math.max(1, Math.ceil(remainMs / 60000));
  if(totalMin >= 60){
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return m > 0 ? ("約 " + h + " 小時 " + m + " 分鐘後") : ("約 " + h + " 小時後");
  }
  return "約 " + totalMin + " 分鐘後";
}

/* rev324: 定時餵食策略面板 —— 為每位在職僕人設定自動吃飯策略 */
function openFoodPolicyPanel(){
  const servants = (state.servants || []).filter(function(s){
    return s.assignedPlots && s.assignedPlots.length > 0;
  });
  const POLICY_NAMES = {
    full: '吃到撐（120%）',
    normal: '吃飽（70%）',
    half: '半飽（50%）',
    lick: '舔舔（30%）',
    starve: '餓著（0%）'
  };
  if(!servants.length){
    openModal({ title: '定時餵食', body: '<div class="empty-hint">沒有正在工作的僕人</div>' });
    return;
  }
  let body = '';
  body += '<div style="font-size:10px;color:#7a6f60;margin-bottom:8px;line-height:1.5">調整每位僕人的自動吃飯策略。定時餵食每小時執行一次。</div>';
  for(const srv of servants){
    const def = SERVANT_TYPES[srv.type] || {name:'?'};
    const _img = 'icons/servants/' + srv.type + '.png' + assetSuffix();
    const plots = (srv.assignedPlots || []).map(function(i){ return plotCoordName(i); }).join('、');
    body += '<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px dashed #2a231c">';
    body += '<div style="display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:5px;background:' + rarityBg(srv.rarity) + ';flex:0 0 auto"><img style="width:26px;height:26px;object-fit:contain" src="' + _img + '" alt=""></div>';
    body += '<div style="flex:1;min-width:0">';
    body += '<div class="' + rarityClass(srv.rarity) + '" style="font-size:11px;font-weight:bold">' + _servantEscHtml(servantLabel(srv)) + ' · Lv.' + srv.lv + ' ' + def.name + '</div>';
    body += '<div style="font-size:9px;color:#7a6f60">' + plots + '</div>';
    body += '</div>';
    body += '<select class="food-policy-sel" data-srv-id="' + srv.id + '" style="flex:0 0 120px;background:#151210;color:#ddd;border:1px solid #2a231c;border-radius:4px;padding:4px;font-size:11px">';
    for(const k of ['full','normal','half','lick','starve']){
      body += '<option value="' + k + '"' + (srv.foodPolicy === k ? ' selected' : '') + '>' + POLICY_NAMES[k] + '</option>';
    }
    body += '</select>';
    body += '</div>';
  }
  const bd = openModal({ title: '定時餵食', body: body });
  const sels = bd.querySelectorAll('.food-policy-sel');
  for(let i = 0; i < sels.length; i++){
    (function(sel){
      sel.onchange = function(){
        const sid = sel.getAttribute('data-srv-id');
        const srv = (state.servants || []).find(function(s){ return s.id === sid; });
        if(!srv) return;
        srv.foodPolicy = sel.value;
        save();
        if(typeof _gardenUpdateFoodInfo === 'function') _gardenUpdateFoodInfo();
      };
    })(sels[i]);
  }
}

function _gardenCalcManualFeed(policy){
  const g = _gardenMerchantInit();
  const mult = FOOD_POLICY_MULT[policy] || 0;
  const baseCost = FOOD_COST_BASE[policy] || 0;
  const tasks = [];
  let totalCost = 0;
  if(baseCost > 0){
    const assigned = (state.servants || []).filter(function(s){ return s.assignedPlots && s.assignedPlots.length > 0; });
    for(const srv of assigned){
      const max = servantMaxStamina(srv);
      const effMax = Math.round(max * mult);
      const cost = Math.round(baseCost * (RARITY_FOOD_MULT[srv.rarity] || 1) * 10) / 10;
      if(cost <= 0) continue;
      if((srv.stamina || 0) >= effMax) continue;
      tasks.push({ srv: srv, effMax: effMax, cost: cost });
      totalCost += cost;
    }
  }
  totalCost = Math.round(totalCost * 10) / 10;
  return { food: g.food || 0, tasks: tasks, totalCost: totalCost, eligible: tasks.length };
}

function openManualFeed(presetPolicy){
  const g = _gardenMerchantInit();
  let selected = presetPolicy || 'normal';
  const POLICY_NAMES = {
    full: '吃到撐（上限 120%）',
    normal: '吃飽（上限 70%）',
    half: '半飽（上限 50%）',
    lick: '舔舔（上限 30%）',
    starve: '餓著（不餵）'
  };
  function _calc(){
    const r = _gardenCalcManualFeed(selected);
    return {
      food: r.food,
      eligible: r.eligible,
      totalCost: r.totalCost,
      canFeed: r.eligible > 0 && r.totalCost > 0 && r.food + 0.001 >= r.totalCost
    };
  }

  function _renderBody(){
    const r = _calc();
    let body = '';
    body += '<div class="stat-line"><span class="k">當前食物</span><span class="v">🍲 ' + Math.round(r.food) + '</span></div>';
    body += '<div class="stat-line"><span class="k">下次自動吃飯</span><span class="v" id="feed-meal-cd">' + _fmtNextMealCountdown() + '</span></div>';
    body += '<div style="margin:10px 0">';
    body += '<div style="font-size:11px;color:#e8a33d;font-weight:bold;margin-bottom:4px">餵食策略</div>';
    body += '<select id="feed-policy" style="width:100%;background:#151210;color:#ddd;border:1px solid #2a231c;border-radius:4px;padding:6px;font-size:12px">';
    for(const k of ['full','normal','half','lick','starve']){
      body += '<option value="' + k + '"' + (k === selected ? ' selected' : '') + '>' + POLICY_NAMES[k] + '</option>';
    }
    body += '</select>';
    body += '</div>';
    body += '<div class="stat-line"><span class="k">符合條件</span><span class="v">' + r.eligible + ' 人</span></div>';
    body += '<div class="stat-line"><span class="k">預計消耗</span><span class="v"' + (r.food < r.totalCost ? ' style="color:#e05252"' : '') + '>🍲 ' + r.totalCost + '</span></div>';
    if(r.totalCost > 0 && r.food < r.totalCost){
      body += '<div style="font-size:11px;color:#e05252;margin-top:6px">食物不足（缺 ' + Math.round(r.totalCost - r.food) + '）</div>';
    }
    if(selected === 'starve'){
      body += '<div style="font-size:11px;color:#7a6f60;margin-top:6px">餓著：不消耗食物，也不補充體力</div>';
    }
    return body;
  }
  const ft = document.createElement('div');
  ft.className = 'modal-ft';
  const r0 = _calc();
  ft.innerHTML = '<button class="btn primary" id="feed-ok"' + (r0.canFeed ? '' : ' disabled') + '>放飯</button>';
  const bd = openModal({ title: '手動放飯', body: _renderBody(), footer: ft });
  const _cdTimer = setInterval(function(){
    const _el = document.getElementById('feed-meal-cd');
    if(!_el){ clearInterval(_cdTimer); return; }
    _el.textContent = _fmtNextMealCountdown();
  }, 30000);
  const _origCloseModalRef = closeModal;
  (function(){
    const _x = modalEl.querySelector('.x');
    if(_x){
      const _oldX = _x.onclick;
      _x.onclick = function(){ clearInterval(_cdTimer); if(typeof _oldX === 'function') _oldX(); };
    }
  })();
  function _bind(){
    const sel = bd.querySelector('#feed-policy');
    if(sel){
      sel.onchange = function(){
        selected = sel.value;
        bd.innerHTML = _renderBody();
        const r2 = _calc();
        const ok = modalEl.querySelector('#feed-ok');
        if(ok) ok.disabled = !r2.canFeed;
        _bind();
      };
    }
  }
  _bind();
  const okBtn = ft.querySelector('#feed-ok');
  if(okBtn){
    okBtn.onclick = function(){
      const r = _calc();
      if(!r.canFeed) return;
      _gardenManualFeed(selected);
      closeModal();
    };
  }
}
function _gardenManualFeed(policy){
  const g = _gardenMerchantInit();
  const baseCost = FOOD_COST_BASE[policy] || 0;
  if(baseCost <= 0) return;
  const calc = _gardenCalcManualFeed(policy);
  if(calc.tasks.length === 0 || calc.totalCost <= 0) return;
  if(g.food + 0.001 < calc.totalCost) return;
  for(const t of calc.tasks){
    g.food -= t.cost;
    t.srv.stamina = t.effMax;
    t.srv._starve = false;
  }
  save();
  _gardenLog('手動放飯（' + POLICY_NAMES_FEED(policy) + '）：' + calc.tasks.length + ' 人 · 消耗 ' + calc.totalCost + ' 食物', 'clean');
  renderGardenGrid();
  renderGardenContent();
  if(typeof _gardenUpdateFoodInfo === 'function') _gardenUpdateFoodInfo();
}

function POLICY_NAMES_FEED(p){
  return { full:'吃到撐', normal:'吃飽', half:'半飽', lick:'舔舔', starve:'餓著' }[p] || p;
}
/* ===== end rev291 ===== */

/* ===== rev293: 堆肥施肥系統 ===== */
function _isAssignedToCompost(srv){
  if(!srv || !srv.assignedPlots || !srv.assignedPlots.length) return false;
  const plots = _gardenGetPlots();
  for(const idx of srv.assignedPlots){
    const p = plots[idx];
    if(p && p.type === "compost") return true;
  }
  return false;
}
function _gardenCompostFindTask(a, srv){
  const effMax = servantEffectiveMaxStamina(srv);
  if(effMax < 1) return null;
  const stam = srv.stamina || 0;
  if(a._hasCompost){
    const plots = _gardenGetPlots();
    const total = plots.length;
    const start = state.garden.compostNextIdx || 0;
    for(let i = 0; i < total; i++){
      const idx = (start + i) % total;
      const p = plots[idx];
      if(!p || p.broken || !_isSoilType(p.type)) continue;
      if(p.fertilized) continue;
      if(stam < 120){ a._hasCompost = false; return null; }
      if((state.garden.compostValue || 0) < 8){ a._hasCompost = false; return null; }
      return { type: "fertilize", plotIdx: idx };
    }
    a._hasCompost = false;
    return null;
  }
  if(stam < 100) return null;
  if((state.garden.compostValue || 0) < 8) return null;
  return { type: "fetch_compost", plotIdx: -1 };
}
/* ===== rev562: 蒸餾室 + 私酒 ===== */
const DISTILL_PERIOD_MS = 5 * 60 * 1000;
const DISTILL_COST = 50;
const DISTILL_STAMINA = 20;

function _isAssignedToDistillery(srv){
  if(!srv || !srv.assignedPlots || !srv.assignedPlots.length) return false;
  const plots = _gardenGetPlots();
  for(const idx of srv.assignedPlots){
    const p = plots[idx];
    if(p && p.type === 'distillery') return true;
  }
  return false;
}

function _gardenLiquorValue(){
  const s = _gardenStorageInit();
  let total = 0;
  for(const k in s){
    if(k.indexOf('liquor@') !== 0) continue;
    const rarity = k.split('@')[1];
    total += s[k] * (RARITY_MULT[rarity] || 1);
  }
  return total;
}

function _findCropForDistill(plot, minusKey){
  const s = _gardenStorageInit();
  const order = (plot && plot.rarityOrder === 'asc')
    ? ['破舊','一般','庫存','精品','傳奇']
    : ['傳奇','精品','庫存','一般','破舊'];

  const getCount = (id, r) => {
    const k = id + '@' + r;
    let n = s[k] || 0;
    if(minusKey === k) n = Math.max(0, n - DISTILL_COST);
    return n;
  };

  if(plot && plot.preferredSeed){
    const p = plot.preferredSeed.split('@');
    const cId = p[0], rId = p[1];
    if(cId && rId && getCount(cId, rId) >= DISTILL_COST){
      return { cropId: cId, rarity: rId };
    }
  }

  if(plot && !plot.preferredSeed && plot.preferredCrop){
    for(const rarity of order){
      if(getCount(plot.preferredCrop, rarity) >= DISTILL_COST){
        return { cropId: plot.preferredCrop, rarity: rarity };
      }
    }
  }

  const candidates = [];
  for(const k in s){
    const parts = k.split('@');
    const id = parts[0], rarity = parts[1];
    if(typeof CROPS === 'undefined' || !CROPS[id]) continue;
    const cnt = getCount(id, rarity);
    if(cnt < DISTILL_COST) continue;
    candidates.push({ cropId: id, rarity: rarity, count: cnt, name: CROPS[id].name || id });
  }
  if(!candidates.length) return null;
  for(const rarity of order){
    const list = candidates.filter(c => c.rarity === rarity);
    if(!list.length) continue;
    list.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'zh-Hant'));
    return list[0];
  }
  return null;
}

/* rev562f: 蒸餾室獨立 tick（不依賴農民 task，倒計時結束即生產） */
function _gardenDistilleryTick(t){
  t = t || Date.now();
  const plots = _gardenGetPlots();
  let _changed = false;
  for(let i = 0; i < plots.length; i++){
    const p = plots[i];
    if(!p || p.type !== 'distillery') continue;
    if(p.enabled === false) continue;

    if(!p.lastDistillAt){
      p.lastDistillAt = Math.floor(t / DISTILL_PERIOD_MS) * DISTILL_PERIOD_MS;
    } else {
      const _aligned = Math.floor(p.lastDistillAt / DISTILL_PERIOD_MS) * DISTILL_PERIOD_MS;
      if(p.lastDistillAt !== _aligned) p.lastDistillAt = _aligned;
    }

    /* rev562l: 若 currentCrop 為空，嘗試鎖定當前作物 */
    if(!p.currentCrop){
      const c = _findCropForDistill(p);
      if(c){ p.currentCrop = c; _changed = true; }
    }

    const curBoundary = Math.floor(t / DISTILL_PERIOD_MS) * DISTILL_PERIOD_MS;
    if(p.lastDistillAt >= curBoundary) continue;

    const times = Math.min(Math.floor((curBoundary - p.lastDistillAt) / DISTILL_PERIOD_MS), 500);
    if(times <= 0) continue;

    const farmer = (state.servants || []).find(function(s){
      return s.type === 'farmer' && s.assignedPlots && s.assignedPlots.indexOf(i) !== -1;
    });
    if(!farmer) continue;
    if((farmer.stamina || 0) < DISTILL_STAMINA) continue;

    let did = 0;
    for(let k = 0; k < times; k++){
      if((farmer.stamina || 0) < DISTILL_STAMINA) break;
      if(!p.currentCrop){
        const c = _findCropForDistill(p);
        if(c) p.currentCrop = c;
        else break;
      }
      const crop = p.currentCrop;
      const cnt = gardenStorageCount(crop.cropId, crop.rarity);
      if(cnt < DISTILL_COST){
        p.currentCrop = null;
        continue;
      }
      gardenStorageRemove(crop.cropId, crop.rarity, DISTILL_COST);
      gardenStorageAdd('liquor', crop.rarity, 1);
      farmer.stamina = Math.max(0, farmer.stamina - DISTILL_STAMINA);
      p.lastDistillAt += DISTILL_PERIOD_MS;
      _gardenLog('<span class="r-' + farmer.rarity + '">' + servantLabel(farmer) + '</span> 蒸餾 ' + fmtItemSpan(crop.cropId, crop.rarity, DISTILL_COST) + ' 獲得 <span class="r-' + crop.rarity + ' itm" data-iid="liquor" data-irar="' + crop.rarity + '">私酒*1</span>', 'distill');
      p.currentCrop = _findCropForDistill(p);
      did++;
    }
    if(did > 0) _changed = true;
  }
  if(_changed && typeof save === 'function') save();
}

function _gardenDistilleryFindTask(a, srv){
  if(!srv) return null;
  const plots = _gardenGetPlots();
  const idx = (a.assignedPlots || [])[0];
  if(idx == null) return null;
  const plot = plots[idx];
  if(!plot || plot.type !== 'distillery') return null;
  const now = Date.now();
  const lastAt = plot.lastDistillAt || 0;
  if(now - lastAt < DISTILL_PERIOD_MS) return null;
  if((srv.stamina || 0) < DISTILL_STAMINA) return null;
  const crop = _findCropForDistill(plot);
  if(!crop) return null;
  return { type: 'distill', plotIdx: idx, cropId: crop.cropId, rarity: crop.rarity };
}

function _gardenDistilleryExecute(a, srv, task){
  const plots = _gardenGetPlots();
  const plot = plots[task.plotIdx];
  if(!plot || plot.type !== 'distillery') return;
  if(gardenStorageCount(task.cropId, task.rarity) < DISTILL_COST) return;
  gardenStorageRemove(task.cropId, task.rarity, DISTILL_COST);
  gardenStorageAdd('liquor', task.rarity, 1);
  srv.stamina = Math.max(0, (srv.stamina || 0) - DISTILL_STAMINA);
  plot.lastDistillAt = Date.now();
  const _cropName = (typeof CROPS !== 'undefined' && CROPS[task.cropId]) ? CROPS[task.cropId].name : task.cropId;
  _gardenLog('<span class="r-' + srv.rarity + '">' + servantLabel(srv) + '</span> 蒸餾 ' + fmtItemSpan(task.cropId, task.rarity, DISTILL_COST) + ' 獲得 <span class="r-' + task.rarity + ' itm" data-iid="liquor" data-irar="' + task.rarity + '">私酒*1</span>', 'distill');
  save();
  renderGardenGrid();
  renderGardenContent();
}

function _offlineDistillFindTask(srv, t){
  const plots = _gardenGetPlots();
  const idx = (srv.assignedPlots || [])[0];
  if(idx == null) return null;
  const plot = plots[idx];
  if(!plot || plot.type !== 'distillery') return null;
  if(t - (plot.lastDistillAt || 0) < DISTILL_PERIOD_MS) return null;
  if((srv.stamina || 0) < DISTILL_STAMINA) return null;
  const crop = _findCropForDistill(plot);
  if(!crop) return null;
  return { type: 'distill', plotIdx: idx, cropId: crop.cropId, rarity: crop.rarity };
}

function _offlineDoDistill(srv, task, t){
  const plots = _gardenGetPlots();
  const plot = plots[task.plotIdx];
  if(!plot || plot.type !== 'distillery') return { ok: false };
  if(gardenStorageCount(task.cropId, task.rarity) < DISTILL_COST) return { ok: false };
  gardenStorageRemove(task.cropId, task.rarity, DISTILL_COST);
  gardenStorageAdd('liquor', task.rarity, 1);
  srv.stamina = Math.max(0, (srv.stamina || 0) - DISTILL_STAMINA);
  plot.lastDistillAt = t;
  return { ok: true, distill: true };
}

function _openDistilleryCropPicker(plotIdx, onSelect){
  const plots = _gardenGetPlots();
  const plot = plots[plotIdx];
  if(!plot || plot.type !== 'distillery') return;
  const s = _gardenStorageInit();
  const curSeed = plot.preferredSeed || '';
  const curLegacy = (!curSeed && plot.preferredCrop) ? plot.preferredCrop : '';
  const rarOrder = ['破舊','一般','庫存','精品','傳奇'];

  const entries = [];
  for(const k in s){
    const p = k.split('@');
    const id = p[0], rar = p[1];
    if(typeof CROPS === 'undefined' || !CROPS[id]) continue;
    if(s[k] <= 0) continue;
    entries.push({ cropId: id, rarity: rar, count: s[k] });
  }
  entries.sort(function(a, b){
    const an = (CROPS[a.cropId] || {}).name || a.cropId;
    const bn = (CROPS[b.cropId] || {}).name || b.cropId;
    const nc = an.localeCompare(bn, 'zh-Hant');
    if(nc !== 0) return nc;
    return rarOrder.indexOf(a.rarity) - rarOrder.indexOf(b.rarity);
  });

  const isAny = (!curSeed && !curLegacy);
  let body = '';
  body += '<div class="item-row" data-crop-id="" style="' + (isAny ? 'border-color:#e8a33d;background:#2a1f10;' : '') + '">';
  body += '<div class="icon" style="font-size:20px;color:#e8a33d">✦</div>';
  body += '<div class="info"><div class="nm">（任意 · 按稀有度）</div><div class="sub">不指定作物</div></div>';
  body += '</div>';

  if(!entries.length){
    body += '<div class="empty-hint">後院倉庫中沒有作物</div>';
  } else {
    body += '<div style="font-size:10px;color:#7a6f60;margin:8px 0 6px;line-height:1.4">選中後套用至下一輪；當前生產不被中斷</div>';
    for(const e of entries){
      const cdef = CROPS[e.cropId] || { name: e.cropId };
      const key = e.cropId + '@' + e.rarity;
      const sel = (key === curSeed) ? ' style="border-color:#e8a33d;background:#2a1f10;"' : '';
      body += '<div class="item-row" data-crop-id="' + key + '"' + sel + '>';
      body += '<div class="icon" style="background:' + rarityBg(e.rarity) + '">' + itemIcon(e.cropId, 30) + '</div>';
      body += '<div class="info"><div class="nm ' + rarityClass(e.rarity) + '">' + cdef.name + '</div><div class="sub">' + e.rarity + '</div></div>';
      body += '<div class="cnt">*' + e.count + '</div>';
      body += '</div>';
    }
  }

  const bd = openModal({ title: '作物偏好', body: body, onClose: function(){ if(typeof onSelect === 'function') onSelect(); } });
  const rows = bd.querySelectorAll('.item-row[data-crop-id]');
  for(let i = 0; i < rows.length; i++){
    (function(row){
      row.onclick = function(){
        const _val = row.getAttribute('data-crop-id') || '';
        if(_val){
          plot.preferredSeed = _val;
          delete plot.preferredCrop;
        } else {
          delete plot.preferredSeed;
          delete plot.preferredCrop;
        }
        save();
        closeModal();
        if(typeof onSelect === 'function') onSelect();
      };
    })(rows[i]);
  }
}

function openDistilleryDetail(idx, returnFn){
  const plots = _gardenGetPlots();
  const plot = plots[idx];
  if(!plot || plot.type !== 'distillery') return;

  if(window._dsTimer){ clearInterval(window._dsTimer); window._dsTimer = null; }

  if(!plot.lastDistillAt || plot.lastDistillAt % DISTILL_PERIOD_MS !== 0){
    plot.lastDistillAt = Math.floor(Date.now() / DISTILL_PERIOD_MS) * DISTILL_PERIOD_MS;
  }

  function _getFarmer(){
    return (state.servants || []).find(function(s){
      return s.type === 'farmer' && s.assignedPlots && s.assignedPlots.indexOf(idx) !== -1;
    });
  }

  function _getStatus(){
    if(plot.enabled === false){
      return { text: '已停用', color: '#7a6f60', pct: 0 };
    }
    const now = Date.now();
    const lastAt = plot.lastDistillAt || 0;
    const elapsed = now - lastAt;
    if(elapsed < DISTILL_PERIOD_MS){
      const remain = Math.ceil((DISTILL_PERIOD_MS - elapsed) / 1000);
      const pct = Math.min(100, Math.max(0, (elapsed / DISTILL_PERIOD_MS) * 100));
      return { text: remain + 's', color: '#e8a33d', pct: pct };
    }
    const farmer = _getFarmer();
    if(!farmer) return { text: '未指派農民', color: '#e05252', pct: 100 };
    if((farmer.stamina || 0) < DISTILL_STAMINA) return { text: '體力不足', color: '#e05252', pct: 100 };
    if(!plot.currentCrop){
      const c = _findCropForDistill(plot);
      if(!c) return { text: '缺作物', color: '#e05252', pct: 100 };
    }
    return { text: '就緒', color: '#7ee07e', pct: 100 };
  }

  function _getRenderState(){
    const currentCrop = plot.currentCrop || _findCropForDistill(plot);
    let queueCrop = null;
    if(plot.currentCrop){
      queueCrop = _findCropForDistill(plot, plot.currentCrop.cropId + '@' + plot.currentCrop.rarity);
    }
    return { currentCrop: currentCrop, queueCrop: queueCrop };
  }

  function _cellStyle(crop){
    const bg = crop ? ('background:' + rarityBg(crop.rarity) + ';') : 'background:#241d16;';
    return 'position:relative;flex:0 0 auto;width:56px;height:56px;display:flex;align-items:center;justify-content:center;border:1px solid #3a2f25;border-radius:6px;overflow:hidden;' + bg;
  }

  function _cellInner(kind, crop){
    let h = '';
    if(kind === 'crop'){
      if(crop) h += cropImgHtml(crop.cropId, 42);
      else h += '<span style="font-size:24px;color:#5a5040">✦</span>';
      h += '<div style="position:absolute;bottom:1px;right:2px;font-size:10px;font-weight:bold;color:#fff;background:rgba(0,0,0,.78);padding:0 3px;border-radius:3px;line-height:1.35">' + DISTILL_COST + '</div>';
    } else {
      h += '<img src="icons/garden/liquor.png' + assetSuffix() + '" style="width:42px;height:42px;object-fit:contain" alt="">';
    }
    return h;
  }

  function _renderBody(){
    const rs = _getRenderState();
    const rarOrder = plot.rarityOrder || 'desc';
    const _st0 = _getStatus();
    const _enabled = plot.enabled !== false;

    let h = '';
    h += '<div style="display:flex;align-items:center;gap:6px;font-size:15px;color:#e8a33d;font-weight:bold">';
    h += _getPlotTypeIconHtml('distillery', 24);
    h += '<span>蒸餾室</span>';
    h += '<button class="btn" id="ds-toggle" style="margin-left:auto;padding:4px 10px;font-size:11px;border-radius:5px;flex:0 0 auto">' + (_enabled ? '暫停' : '開始') + '</button>';
    h += '<button class="btn danger" id="ds-del" style="padding:4px 10px;font-size:11px;border-radius:5px;flex:0 0 auto">拆除</button>';
    h += '</div>';
    h += '<div class="detail-sub">' + plotCoordName(idx) + ' · Lv.' + (plot.lv || 1) + '</div>';
    h += _gardenPlotOwnersHtml(idx, 'farmer');

    h += '<div style="font-size:11px;color:#e8a33d;font-weight:bold;margin:10px 0 4px">配方</div>';
    h += '<div style="padding:12px;background:#1a1510;border:1px solid #3a2f25;border-radius:6px">';
    h += '<div style="display:flex;align-items:center;gap:10px">';
    h += '<div id="ds-crop-current" style="' + _cellStyle(rs.currentCrop) + ';cursor:pointer">' + _cellInner('crop', rs.currentCrop) + '</div>';
    h += '<span style="flex:0 0 auto;font-size:20px;color:#e8a33d">→</span>';
    h += '<div id="ds-liquor-current" style="' + _cellStyle(rs.currentCrop) + '">' + _cellInner('liquor', rs.currentCrop) + '</div>';
    h += '<div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:4px;align-items:flex-end">';
    h += '<div id="ds-cd-num" style="font-size:13px;font-weight:bold;color:' + _st0.color + ';font-family:Menlo,Consolas,monospace;letter-spacing:0.5px;text-align:right;line-height:1.2">' + _st0.text + '</div>';
    h += '<div style="width:100%;height:6px;background:#0e0c0a;border-radius:3px;overflow:hidden;border:1px solid #2a231c"><div id="ds-cd-fill" style="height:100%;width:' + _st0.pct + '%;background:linear-gradient(90deg,#8a5f18,#e8a33d,#ffd680);transition:width 0.2s linear"></div></div>';
    h += '</div>';
    h += '</div>';
    h += '<div id="ds-queue-row" style="display:' + (rs.queueCrop ? 'flex' : 'none') + ';align-items:center;gap:10px;margin-top:8px;opacity:0.5;filter:grayscale(1);pointer-events:none">';
    h += '<div id="ds-crop-queue" style="' + _cellStyle(rs.queueCrop) + '">' + _cellInner('crop', rs.queueCrop) + '</div>';
    h += '<span style="flex:0 0 auto;font-size:20px;color:#a89a85">→</span>';
    h += '<div id="ds-liquor-queue" style="' + _cellStyle(rs.queueCrop) + '">' + _cellInner('liquor', rs.queueCrop) + '</div>';
    h += '</div>';
    h += '</div>';

    h += '<div style="font-size:11px;color:#e8a33d;font-weight:bold;margin:10px 0 4px">用罄時提取</div>';
    h += '<select id="ds-rar" style="width:100%;background:#151210;color:#ddd;border:1px solid #2a231c;border-radius:4px;padding:6px;font-size:12px">';
    h += '<option value="desc"' + (rarOrder === 'desc' ? ' selected' : '') + '>傳奇 → 破舊</option>';
    h += '<option value="asc"' + (rarOrder === 'asc' ? ' selected' : '') + '>破舊 → 傳奇</option>';
    h += '</select>';

    return h;
  }

  const _dsOnClose = (typeof returnFn === 'function') ? returnFn : closeModal;
  const bd = openModal({ title: '蒸餾室', body: _renderBody(), onClose: _dsOnClose });

  function _onCropClick(){
    closeModal();
    _openDistilleryCropPicker(idx, function(){
      openDistilleryDetail(idx, returnFn);
    });
  }

  function _refresh(){
    const _info = _getStatus();
    const _num = document.getElementById('ds-cd-num');
    if(_num){ _num.textContent = _info.text; _num.style.color = _info.color; }
    const _fill = document.getElementById('ds-cd-fill');
    if(_fill) _fill.style.width = _info.pct + '%';
    const rs = _getRenderState();
    const _curEl = document.getElementById('ds-crop-current');
    if(_curEl){
      _curEl.innerHTML = _cellInner('crop', rs.currentCrop);
      _curEl.style.cssText = _cellStyle(rs.currentCrop) + ';cursor:pointer';
    }
    const _liqEl = document.getElementById('ds-liquor-current');
    if(_liqEl){
      _liqEl.innerHTML = _cellInner('liquor', rs.currentCrop);
      _liqEl.style.cssText = _cellStyle(rs.currentCrop);
    }
    const _qRow = document.getElementById('ds-queue-row');
    if(_qRow) _qRow.style.display = rs.queueCrop ? 'flex' : 'none';
    if(rs.queueCrop){
      const _qCropEl = document.getElementById('ds-crop-queue');
      if(_qCropEl){ _qCropEl.innerHTML = _cellInner('crop', rs.queueCrop); _qCropEl.style.cssText = _cellStyle(rs.queueCrop); }
      const _qLiqEl = document.getElementById('ds-liquor-queue');
      if(_qLiqEl){ _qLiqEl.innerHTML = _cellInner('liquor', rs.queueCrop); _qLiqEl.style.cssText = _cellStyle(rs.queueCrop); }
    }
  }

  function _bind(){
    const _del = bd.querySelector('#ds-del');
    if(_del) _del.onclick = function(){
      plots[idx] = null;
      _clearPlotAssignments(idx);
      save();
      closeModal();
      renderGardenGrid();
    };

    const _toggle = bd.querySelector('#ds-toggle');
    if(_toggle) _toggle.onclick = function(){
      if(plot.enabled === false){
        plot.enabled = true;
        plot.lastDistillAt = Math.floor(Date.now() / DISTILL_PERIOD_MS) * DISTILL_PERIOD_MS;
        plot.currentCrop = _findCropForDistill(plot);
      } else {
        plot.enabled = false;
      }
      save();
      _toggle.textContent = plot.enabled === false ? '開始' : '暫停';
      _refresh();
    };

    const _cropEl = bd.querySelector('#ds-crop-current');
    if(_cropEl) _cropEl.onclick = _onCropClick;

    const _rarSel = bd.querySelector('#ds-rar');
    if(_rarSel) _rarSel.onchange = function(){
      plot.rarityOrder = _rarSel.value || 'desc';
      save();
    };

    _gardenPlotOwnersBind(bd);
  }
  _bind();

  window._dsTimer = setInterval(function(){
    if(!document.getElementById('ds-cd-num')){ clearInterval(window._dsTimer); window._dsTimer = null; return; }
    _refresh();
  }, 1000);
}
/* ===== end rev562 ===== */

function openCompostDetail(idx, returnFn){
  const plots = _gardenGetPlots();
  const plot = plots[idx];
  if(!plot || plot.type !== "compost") return;
  const g = _gardenMerchantInit();
  const compostValue = Math.round((g.compostValue || 0) * 10) / 10;
  const farmers = (state.servants || []).filter(function(s){
    return s.type === "farmer" && s.assignedPlots && s.assignedPlots.indexOf(idx) !== -1;
  });
  let body = "";
  const _cpIcon = _getPlotTypeIconHtml('compost', 24);
  body += "<div style=\"display:flex;align-items:center;gap:8px;font-size:15px;color:#e8a33d;font-weight:bold\">" + _cpIcon + "<span>堆肥區</span><button class=\"btn danger\" id=\"cp-del\" style=\"margin-left:auto;padding:4px 10px;font-size:11px;border-radius:5px;flex:0 0 auto\">拆除</button></div>";
  body += "<div class=\"detail-sub\">" + plotCoordName(idx) + " · Lv." + (plot.lv || 1) + "</div>";
  body += _gardenPlotOwnersHtml(idx, "farmer");
  body += "<div style=\"font-size:11px;color:#e8a33d;font-weight:bold;margin:10px 0 4px\">堆肥值</div>";
  body += "<div style=\"padding:10px;background:#1a1510;border:1px solid #2a231c;border-radius:5px;font-size:14px;color:#7ee07e;font-weight:bold;text-align:center\">💩 " + compostValue + "</div>";
  body += "<div style=\"font-size:10px;color:#7a6f60;margin-top:6px;line-height:1.5\">腐爛作物轉化為堆肥值（1 食物值 = 0.25 堆肥值）。每塊田施肥消耗 8 堆肥值。</div>";
  const _compostOnClose = (typeof returnFn === 'function') ? returnFn : closeModal;
  const bd = openModal({ title: "堆肥區", body: body, onClose: _compostOnClose });
  const _del = bd.querySelector("#cp-del");
  if(_del) _del.onclick = function(){ plots[idx] = null; _clearPlotAssignments(idx); save(); closeModal(); renderGardenGrid(); };
  _gardenPlotOwnersBind(bd);
}
/* ===== end rev293 ===== */

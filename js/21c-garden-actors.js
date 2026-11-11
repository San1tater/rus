'use strict';

/* 後院演員（狀態機 / Canvas 渲染 / 叫醒 / 離線模擬 / 農田背景 tick） */
/* 由 21-garden.js 拆分而來，加載順序 21a → 21b → 21c → 21d → 21e，
 * 21d/21e 依賴 21a/21b/21c；21c 依賴 21a/21b。
 * 跨文件共享符號（GARDEN_TABS / _gardenActiveTab / _gardenTickTimer /
 *   _gardenActors / _gardenActorTimer / _gardenActorCanvasRAF）
 * 以 var = window.xxx = 形式暴露。 */

var _gardenActors = window._gardenActors = [];

var _gardenActorTimer = window._gardenActorTimer = null;


function servantAddExp(srv, n){
  if(!srv || srv.lv >= SERVANT_MAX_LV) return;
  srv.exp = (srv.exp || 0) + n;
  while(srv.lv < SERVANT_MAX_LV && srv.exp >= servantExpNeed(srv.lv)){
    srv.exp -= servantExpNeed(srv.lv);
    srv.lv++;
    const def = SERVANT_TYPES[srv.type] || {name:'僕人'};
    if(typeof awakenTalent === 'function') awakenTalent(srv);
  }
  if(srv.lv >= SERVANT_MAX_LV) srv.exp = 0;
}


function gardenGetForemanBonus(){
  let bonus = 0;
  for(const s of (state.servants || [])){
    if(s.type !== 'foreman') continue;
    if(!s.assignedPlots || !s.assignedPlots.length) continue;
    bonus += (s.lv || 1) * 0.10;
  }
  return Math.min(1.0, bonus);
}


function servantLevelEffectText(srv){
  const lv = srv.lv || 1;
  if(srv.type === 'farmer'){
    const pct = Math.round((lv - 1) * 5);
    return '收穫量 +' + pct + '%';
  }
  if(srv.type === 'foreman'){
    const pct = Math.round(lv * 10);
    return '叫醒效率 +' + pct + '%';
  }
  if(srv.type === 'guard'){
    const pct = Math.round((lv - 1) * 5);
    return '命中 +' + pct + '%';
  }
  return '—';
}


function _gardenSyncActors(){
  const servants = (state.servants || []).filter(function(s){
    return s.assignedPlots && s.assignedPlots.length > 0;
  }).slice(0, 20);
  const targetIds = {};
  for(const s of servants) targetIds[s.id] = true;
  _gardenActors = _gardenActors.filter(function(a){ return targetIds[a.id]; });
  const existIds = {};
  for(const a of _gardenActors) existIds[a.id] = true;
  for(const s of servants){
    if(existIds[s.id]){
      const a = _gardenActors.find(function(x){ return x.id === s.id; });
      if(a) a.assignedPlots = (s.assignedPlots || []).slice();
      continue;
    }
    _gardenActors.push({
      id: s.id,
      type: s.type,
      assignedPlots: (s.assignedPlots || []).slice(),
      x: 0, y: 0,
      task: null,
      state: 'idle',
      idleUntil: 0,
      walkMs: 1500,
      initialized: false
    });
  }
  const _p = document.getElementById('garden-page');
  if(_p){
    const _layer = _p.querySelector('#gp-actor-layer');
    if(_layer){
      const _validIds = {};
      for(const _a of _gardenActors) _validIds[_a.id] = true;
      const _kids = _layer.children;
      for(let _i = _kids.length - 1; _i >= 0; _i--){
        const _el = _kids[_i];
        const _aid = _el.getAttribute('data-actor-id');
        if(_aid && !_validIds[_aid]) _el.remove();
      }
    }
  }
}


function _gardenFindSeedToPlant(setting){
  const storage = _gardenStorageInit();
  const candidates = [];
  for(const k in storage){
    const parts = k.split('@');
    const id = parts[0], rar = parts[1];
    if(!SEEDS[id]) continue;
    const cnt = storage[k];
    if(cnt <= 0) continue;
    if(setting !== 'any' && setting !== id) continue;
    candidates.push({ id: id, rarity: rar, count: cnt });
  }
  if(!candidates.length) return null;
  candidates.sort(function(a, b){
    const rd = (RARITY_MULT[b.rarity] || 1) - (RARITY_MULT[a.rarity] || 1);
    if(rd !== 0) return rd;
    return a.count - b.count;
  });
  return candidates[0];
}


function _gardenFarmerFindTask(a, srv){
  if(!srv) return null;
  if(typeof _isAssignedToCompost === 'function' && _isAssignedToCompost(srv)){
    return _gardenCompostFindTask(a, srv);
  }
  if(typeof _isAssignedToDistillery === 'function' && _isAssignedToDistillery(srv)){
    return null;
  }
  const plots = _gardenGetPlots();
  const now = Date.now();
  for(const idx of a.assignedPlots){
    const plot = plots[idx];
    if(!plot || plot.broken || !_isSoilType(plot.type) || !plot.crop) continue;
    const c = plot.crop;
    const seed = SEEDS[c.seedId];
    if(!seed) continue;
        if(c.cleanupUntil && c.cleanupUntil > now) continue;
    const rottenAt = c.matureAt + seed.rotMs;
    if(now >= rottenAt){
      return { type: 'cleanup', plotIdx: idx };
    }
  }
  const _harvestCands = [];
  for(const idx of a.assignedPlots){
    const plot = plots[idx];
    if(!plot || plot.broken || !_isSoilType(plot.type) || !plot.crop) continue;
    const c = plot.crop;
    const seed = SEEDS[c.seedId];
    if(!seed) continue;
    if(now < c.matureAt) continue;
    const rottenAt = c.matureAt + seed.rotMs;
    if(now >= rottenAt) continue;
    _harvestCands.push({ idx: idx, rottenAt: rottenAt });
  }
  _harvestCands.sort(function(x, y){ return x.rottenAt - y.rottenAt; });
  if(_harvestCands.length){
    return { type: 'harvest', plotIdx: _harvestCands[0].idx };
  }
  const autoPlant = srv.autoPlant || 'off';
  if(autoPlant !== 'off'){
    for(const idx of a.assignedPlots){
      const plot = plots[idx];
      if(!plot || plot.broken || !_isSoilType(plot.type)) continue;
      if(plot.crop) continue;
      if(autoPlant === 'follow'){
        if(plot.lastSeed && plot.lastRarity && SEEDS[plot.lastSeed]){
          if(gardenStorageCount(plot.lastSeed, plot.lastRarity) > 0){
            return { type: 'plant', plotIdx: idx, seedId: plot.lastSeed, rarity: plot.lastRarity };
          }
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


function _gardenActorAssignTask(a, task, grid, wrapRect, now){
  let _targetIdx = task.plotIdx;
  if(task.type === 'fetch_compost'){
    const _pts = _gardenGetPlots();
    for(const _pidx of (a.assignedPlots || [])){
      const _pp = _pts[_pidx];
      if(_pp && _pp.type === 'compost'){ _targetIdx = _pidx; break; }
    }
  }
  const plotEl = grid.querySelector('.gp-plot[data-idx="' + _targetIdx + '"]');
  if(!plotEl) return false;
  const pRect = plotEl.getBoundingClientRect();
  const targetX = pRect.left - wrapRect.left + pRect.width / 2;
  const targetY = pRect.top - wrapRect.top + pRect.height - 2;
  const dist = Math.sqrt(Math.pow(targetX - a.x, 2) + Math.pow(targetY - a.y, 2));
  const walkMs = Math.max(500, Math.min(2000, dist * 2.5));
  a.tx = targetX;
  a.ty = targetY;
  a.walkMs = walkMs;
  let workMs = GARDEN_WORK_MS;
  if(task.type === 'cleanup'){
    const plots = _gardenGetPlots();
    const plot = plots[task.plotIdx];
    if(plot && plot.crop && SEEDS[plot.crop.seedId]){
      workMs = SEEDS[plot.crop.seedId].cleanupMs || GARDEN_WORK_MS;
    }
  }
  a.task = {
    type: task.type,
    plotIdx: task.plotIdx,
    seedId: task.seedId,
    rarity: task.rarity,
    phase: 'walk',
    arriveAt: now + walkMs,
    workMs: workMs,
    workUntil: 0,
    startedAt: 0,
    createdAt: now
  };
  a.state = 'walk';
  return true;
}


function _gardenActorExecuteTask(a){
  const plots = _gardenGetPlots();
  const srv = (state.servants || []).find(function(s){ return s.id === a.id; });
  if(!srv) return;
  if(a.task.type === 'fetch_compost'){
    srv.stamina = Math.max(0, (srv.stamina || 0) - 100);
    a._hasCompost = true;
    _gardenLog('<span class="r-' + srv.rarity + '">' + servantLabel(srv) + '</span> 取堆肥', 'compost');
    save();
    renderGardenGrid();
    renderGardenContent();
    return;
  }
  if(a.task.type === 'fertilize'){
    const _idx = a.task.plotIdx;
    const _p = plots[_idx];
    if(!_p) return;
    if(_p.fertilized) return;
    if((state.garden.compostValue || 0) < 8) return;
    if((srv.stamina || 0) < 120) return;
    state.garden.compostValue -= 8;
    srv.stamina = Math.max(0, srv.stamina - 120);
    _p.fertilized = true;
    _p.fertExpireAt = Date.now() + 45 * 60 * 1000;
    state.garden.compostNextIdx = (_idx + 1) % plots.length;
    a._hasCompost = false;
    _gardenLog('<span class="r-' + srv.rarity + '">' + servantLabel(srv) + '</span> 施肥 ' + plotCoordName(_idx), 'fertilize');
    save();
    renderGardenGrid();
    renderGardenContent();
    return;
  }
  const plot = plots[a.task.plotIdx];
  if(!plot || plot.broken) return;
  if(a.task.type === 'harvest'){
    if(!plot.crop) return;
    const c = plot.crop;
    const seed = SEEDS[c.seedId];
    if(!seed) return;
    const now = Date.now();
    if(now < c.matureAt) return;
    const rottenAt = c.matureAt + seed.rotMs;
    if(now >= rottenAt) return;
    const mult = RARITY_MULT[c.rarity] || 1;
    const _farmerBonus = 1 + ((srv.lv || 1) - 1) * 0.05;
    const _foremanBonus = 1 + gardenGetForemanBonus();
    let count = Math.max(1, Math.round(seed.baseYield * mult * _farmerBonus * _foremanBonus * (0.8 + Math.random() * 0.4)));
    if(plot.fertilized && now < (plot.fertExpireAt || 0)){ count = Math.round(count * 1.3); }
    const _sbH = _getSoilBonus(plot.type);
    count = Math.max(1, Math.round(count * (1 + _sbH.yield)));
    plot.fertilized = false;
    plot.fertExpireAt = 0;
    gardenStorageAdd(seed.cropId, c.rarity, count);
    plot.crop = null;
    const cropDef = CROPS[seed.cropId];
    _gardenLog('<span class="r-' + srv.rarity + '">' + servantLabel(srv) + '</span> 收穫 ' + (cropDef ? fmtItemSpan(seed.cropId, c.rarity, count) : ('<span class="r-' + c.rarity + '">作物×' + count + '</span>')), 'harvest');
    servantAddExp(srv, 5);
  } else if(a.task.type === 'cleanup'){
    if(!plot.crop) return;
    plot.crop = null;
    _gardenLog('<span class="r-' + srv.rarity + '">' + servantLabel(srv) + '</span> 清理腐爛作物', 'clean');
    servantAddExp(srv, 3);
  } else if(a.task.type === 'plant'){
    if(plot.crop) return;
    const seedId = a.task.seedId;
    const rarity = a.task.rarity;
    if(!seedId) return;
    if(!gardenStorageRemove(seedId, rarity, 1)) return;
    const seed = SEEDS[seedId];
    if(!seed) return;
    const now = Date.now();
    const _sbP = _getSoilBonus(plot.type);
    const _growMs = Math.max(1000, Math.round(seed.growMs * (1 - _sbP.grow)));
    plot.crop = { seedId: seedId, rarity: rarity, plantedAt: now, matureAt: now + _growMs, cleanupUntil: 0 };
    plot.lastSeed = seedId;
    plot.lastRarity = rarity;
    _gardenLog('<span class="r-' + srv.rarity + '">' + servantLabel(srv) + '</span> 種植 ' + fmtItemSpan(seedId, rarity, 1), 'plant');
    servantAddExp(srv, 2);
  }
  srv.stamina = Math.max(0, (srv.stamina || 0) - GARDEN_STAMINA_PER_WORK);
  if(srv.stamina <= 0){
    srv.stamina = 0;
    srv.resting = false;
    const def = SERVANT_TYPES[srv.type] || {name:'僕人'};
    _gardenLog(def.name + ' 體力耗盡', 'tired');
  }
  save();
  renderGardenGrid();
  renderGardenContent();
}


function _gardenActorTick(){
  const p = document.getElementById('garden-page');
  if(!p || !p.classList.contains('on')) return;
  if(!window._raidLiveActive && _gardenActors.length){
    for(const _a of _gardenActors){
      if(_a.state === 'surrender') _a.state = 'idle';
    }
    window._raidSurrenderWorkers = false;
  }
  _gardenMerchantTick();
  _gardenUpdateFoodInfo();
  _gardenSyncActors();
  if(typeof _gardenDistilleryTick === 'function') _gardenDistilleryTick(Date.now());
  if(!_gardenActors.length) return;
  if(!window._raidSurrenderWorkers && _gardenActors.length){
    for(const _a of _gardenActors){
      if(_a.state === 'surrender') _a.state = 'idle';
    }
  }
  if(window._raidSurrenderWorkers && window._raidLiveActive){
    const _g = p.querySelector('#gp-grid');
    const _w = p.querySelector('.gp-grid-wrap');
    if(_g && _w){
      const _wr = _w.getBoundingClientRect();
      const _gr = _g.getBoundingClientRect();
      const _lx = Math.max(6, _gr.left - _wr.left - 18);
      for(const _a of _gardenActors){
        if(_a.type === 'guard') continue;
        if(_a.state !== 'surrender'){
          _a.tx = _lx + Math.random() * 20;
          _a.ty = _gr.top - _wr.top + 30 + Math.random() * Math.max(10, _gr.height - 60);
          _a.state = 'surrender';
          _a.task = null;
        }
      }
    }
    return;
  }
  const grid = p.querySelector('#gp-grid');
  const wrap = p.querySelector('.gp-grid-wrap');
  if(!grid || !wrap) return;
  const wrapRect = wrap.getBoundingClientRect();
  const now = Date.now();

  for(const a of _gardenActors){
    const srv = (state.servants || []).find(function(s){ return s.id === a.id; });
    a._srv = srv;
    const _effMax = srv ? servantEffectiveMaxStamina(srv) : 0;
    a.effMax = _effMax;
    a.stamina = srv ? Math.min(srv.stamina || 0, _effMax) : 0;
    a.resting = srv ? !!srv.resting : false;
  }

  for(const a of _gardenActors){
    if(a.type !== 'foreman') continue;
    if(a.task) continue;
    if(a.stamina <= 0) continue;
    let target = null, bestDist = Infinity;
    for(const other of _gardenActors){
      if(other === a) continue;
      if(other.stamina > 0) continue;
      if(other.resting) continue;
      if(other.type === 'foreman') continue;
      const _otherSrv = other._srv;
      if(_otherSrv && servantEffectiveMaxStamina(_otherSrv) < 1) continue;
      const dx = other.tx - a.tx, dy = other.ty - a.ty;
      const d = Math.sqrt(dx*dx + dy*dy);
      if(d < bestDist){ bestDist = d; target = other; }
    }
    if(target){
      a.tx = target.tx;
      a.ty = target.ty;
      const walkMs = Math.max(500, Math.min(2000, bestDist * 3));
      a.walkMs = walkMs;
      a.task = {
        type: 'wakeup',
        targetActorId: target.id,
        phase: 'walk',
        arriveAt: now + walkMs,
        workMs: 1000,
        workUntil: 0,
        startedAt: 0,
        createdAt: now
      };
      a.state = 'walk';
    }
  }

  for(const a of _gardenActors){
    if(!a.initialized){
      if(a.type === 'guard' && a.assignedPlots && a.assignedPlots.length){
        const idx = a.assignedPlots[0];
        const plotEl = grid.querySelector('.gp-plot[data-idx="' + idx + '"]');
        if(plotEl){
          const pRect = plotEl.getBoundingClientRect();
          a.x = pRect.left - wrapRect.left + pRect.width / 2;
          a.y = pRect.top - wrapRect.top + pRect.height - 4;
          a.tx = a.x; a.ty = a.y;
        }
      } else if(a.assignedPlots && a.assignedPlots.length){
        const idx = a.assignedPlots[0];
        const plotEl = grid.querySelector('.gp-plot[data-idx="' + idx + '"]');
        if(plotEl){
          const pRect = plotEl.getBoundingClientRect();
          a.x = pRect.left - wrapRect.left + pRect.width / 2;
          a.y = pRect.top - wrapRect.top + pRect.height - 2;
          a.tx = a.x; a.ty = a.y;
        }
      }
      a.initialized = true;
      a.idleUntil = now + 800 + Math.random() * 1200;
      continue;
    }

    if(a.assignedPlots && a.assignedPlots.length > 0 && a._srv && a.alive !== false && a.stamina > 0){
      if(!a._lastWorkExp) a._lastWorkExp = now;
      if(now - a._lastWorkExp >= 10000){
        a._lastWorkExp = now;
        servantAddExp(a._srv, 1);
        save();
      }
    }
    if(a.type === 'guard'){
/* rev-fix-raid-guard-actor: 戰鬥中守衛位置由 raid canvas 固定，跳過 actor 狀態機 */
if(window._raidLiveActive) continue;
/* rev-fix-injured-guard-no-move: 重伤守卫不移动，保持倒地 */
if(a._srv && a._srv.injuredUntil && a._srv.injuredUntil > Date.now()){
  a.tx = a.x;
  a.ty = a.y;
  a.state = 'injured';
  a.task = null;
  continue;
}
if(a.stamina <= 0){
        if(!a.restPos){
          const gridRect = grid.getBoundingClientRect();
          a.restPos = { x: Math.max(6, gridRect.left - wrapRect.left - 18), y: gridRect.top - wrapRect.top + 30 + Math.random() * Math.max(10, gridRect.height - 60) };
        }
        a.tx = a.restPos.x; a.ty = a.restPos.y;
        a.state = 'lazy';
        a.task = null;
        continue;
      }
      a.restPos = null;
      if(a.assignedPlots && a.assignedPlots.length){
        const idx = a.assignedPlots[0];
        const plotEl = grid.querySelector('.gp-plot[data-idx="' + idx + '"]');
        if(plotEl){
          const pRect = plotEl.getBoundingClientRect();
          if(window.BossModule && BossModule.isActive()){
            if(typeof a.tx !== 'number'){ a.tx = pRect.left - wrapRect.left + pRect.width / 2; a.ty = pRect.top - wrapRect.top + pRect.height - 4; }
          } else {
            if(typeof a._guardState === 'undefined'){
              a._guardState = 'idle';
              a._guardTimer = now + 2000 + Math.random() * 3000;
              a.tx = pRect.left - wrapRect.left + pRect.width / 2;
              a.ty = pRect.top - wrapRect.top + pRect.height - 4;
            }
            const _isMoving = Math.abs(a.tx - a.x) > 0.5;
            if(a._guardState === 'idle'){
              if(now > a._guardTimer){
                a._guardState = 'walk';
                a._guardTimer = now + 1500 + Math.random() * 2000;
                let _gtx = pRect.left - wrapRect.left + pRect.width / 2 + (Math.random() - 0.5) * pRect.width * 0.4;
                if(Math.abs(_gtx - a.x) < 8){
                  const _dir = Math.random() > 0.5 ? 1 : -1;
                  _gtx = a.x + _dir * (8 + Math.random() * 6);
                  _gtx = Math.max(pRect.left - wrapRect.left + 8, Math.min(pRect.left - wrapRect.left + pRect.width - 8, _gtx));
                }
                a.tx = _gtx;
                a.ty = pRect.top - wrapRect.top + pRect.height - 4;
              }
            } else if(a._guardState === 'walk'){
              if(!_isMoving || now > a._guardTimer){
                a._guardState = 'idle';
                a._guardTimer = now + 3000 + Math.random() * 4000;
                a.tx = a.x;
                a.ty = pRect.top - wrapRect.top + pRect.height - 4;
              }
            }
          }
        }
      }
      a.state = 'idle';
      a.task = null;
      continue;
    }

    if(a.type === 'farmer' && a.resting){
      const srv = a._srv;
      const autoPlant = srv ? (srv.autoPlant || 'off') : 'off';
      let canResume = false;
      const plots = _gardenGetPlots();
      for(const idx of a.assignedPlots){
        const plot = plots[idx];
        if(plot && plot.crop) canResume = true;
      }
      if(!canResume && autoPlant !== 'off'){
        if(autoPlant === 'any' && _gardenHasAnySeed()) canResume = true;
        if(autoPlant === 'follow'){
          for(const idx of a.assignedPlots){
            const plot = plots[idx];
            if(plot && plot.lastSeed && plot.lastRarity && _gardenHasSeedOf(plot.lastSeed, plot.lastRarity)){ canResume = true; break; }
          }
        }
      }
      if(canResume){
        if(srv) srv.resting = false;
        a.resting = false;
        a.restPos = null;
      } else {
        if(!a.restPos){
          const gridRect = grid.getBoundingClientRect();
          a.restPos = { x: Math.max(6, gridRect.left - wrapRect.left - 18), y: gridRect.top - wrapRect.top + 30 + Math.random() * Math.max(10, gridRect.height - 60) };
        }
        a.tx = a.restPos.x; a.ty = a.restPos.y;
        a.state = 'rest';
        a.task = null;
        continue;
      }
    }

    if(a.stamina <= 0){
      if(a.type === 'foreman' && a.assignedPlots && a.assignedPlots.length){
        const _shedIdx = a.assignedPlots[0];
        const _shedEl = grid.querySelector('.gp-plot[data-idx="' + _shedIdx + '"]');
        if(_shedEl){
          const _sr = _shedEl.getBoundingClientRect();
          a.tx = _sr.left - wrapRect.left + _sr.width / 2;
          a.ty = _sr.top - wrapRect.top + _sr.height - 4;
          a.state = 'rest';
          a.task = null;
          continue;
        }
      }
      if(!a.restPos){
        const gridRect = grid.getBoundingClientRect();
        a.restPos = { x: Math.max(6, gridRect.left - wrapRect.left - 18), y: gridRect.top - wrapRect.top + 30 + Math.random() * Math.max(10, gridRect.height - 60) };
      }
      a.tx = a.restPos.x; a.ty = a.restPos.y;
      a.state = 'lazy';
      a.task = null;
      continue;
    }
    if(a.stamina > 0 && a.restPos){ a.restPos = null; }
    if(a.type === 'farmer' && typeof _isAssignedToCompost === 'function' && _isAssignedToCompost(a._srv)){
      if(a.stamina < 220 && !a._hasCompost){
        a.state = 'idle';
        a.task = null;
        if(!a._compostIdleUntil){
          a._compostIdleUntil = now + 3000 + Math.random() * 3000;
        }
        if(now < a._compostIdleUntil){
          continue;
        } else {
          a._compostIdleUntil = 0;
        }
      }
    }

    if(a.task){
      if(a.task.createdAt && now - a.task.createdAt > 300000){
        a.task = null;
        a.state = 'idle';
        a.idleUntil = now + 500;
        continue;
      }
      if(a.task.phase === 'walk'){
        const _dx = a.tx - a.x;
        const _dy = a.ty - a.y;
        const _d2 = _dx * _dx + _dy * _dy;
        if(_d2 < 9){
          a.task.phase = 'work';
          a.task.startedAt = now;
          a.task.workUntil = now + a.task.workMs;
          a.state = 'work';
        }
        continue;
      }
      if(a.task.phase === 'work'){
        if(now >= a.task.workUntil){
          if(a.task.type === 'wakeup'){
            const target = _gardenActors.find(function(x){ return x.id === a.task.targetActorId; });
            if(target){
              const tsrv = target._srv;
              if(tsrv && tsrv.stamina <= 0 && !tsrv.resting){
                const _eff = servantEffectiveMaxStamina(tsrv);
                if(_eff >= 1){
                  tsrv.stamina = Math.max(1, Math.round(_eff * GARDEN_WAKEUP_RECOVER));
                  if(a._srv) a._srv.stamina = Math.max(0, (a._srv.stamina || 0) - 20);
                  if(a._srv) a._srv.stamina = Math.max(0, (a._srv.stamina || 0) - 20);
                  var _fmName = a._srv ? ('<span class="r-' + a._srv.rarity + '">' + servantLabel(a._srv) + '</span>') : '監工';
                  var _tgName = '<span class="r-' + tsrv.rarity + '">' + servantLabel(tsrv) + '</span>';
                  _gardenLog(_fmName + ' 叫醒 ' + _tgName, 'work');
                  save();
                }
              }
            }
            if(a._srv) servantAddExp(a._srv, 5);
            a.task = null;
            a.state = 'idle';
            a.idleUntil = now + 400 + Math.random() * 600;
          } else {
            _gardenActorExecuteTask(a);
            a.task = null;
            a.state = 'idle';
            a.idleUntil = now + 600 + Math.random() * 1000;
          }
        }
        continue;
      }
      continue;
    }

    if(now < a.idleUntil) continue;

    if(a.type === 'farmer' && a.stamina > 0 && !a.task
       && typeof _isAssignedToDistillery === 'function' && _isAssignedToDistillery(a._srv)){
      const _plots2 = _gardenGetPlots();
      const _idx2 = (a.assignedPlots || [])[0];
      const _plot2 = _idx2 != null ? _plots2[_idx2] : null;
      if(_plot2 && _plot2.type === 'distillery' && now - (_plot2.lastDistillAt || 0) < DISTILL_PERIOD_MS){
        const _pEl = grid.querySelector('.gp-plot[data-idx="' + _idx2 + '"]');
        if(_pEl){
          const _pr = _pEl.getBoundingClientRect();
          const _baseX = _pr.left - wrapRect.left + _pr.width / 2;
          const _baseY = _pr.top - wrapRect.top + _pr.height - 4;
          if(typeof a._distillState === 'undefined'){
            a._distillState = 'idle';
            a._distillTimer = now + 2000 + Math.random() * 3000;
            a.tx = _baseX; a.ty = _baseY;
          }
          const _moving = Math.abs(a.tx - a.x) > 0.5;
          if(a._distillState === 'idle'){
            if(now > a._distillTimer){
              a._distillState = 'walk';
              a._distillTimer = now + 1500 + Math.random() * 2000;
              let _nx = _baseX + (Math.random() - 0.5) * _pr.width * 0.4;
              if(Math.abs(_nx - a.x) < 8){
                const _d = Math.random() > 0.5 ? 1 : -1;
                _nx = a.x + _d * (8 + Math.random() * 6);
                _nx = Math.max(_pr.left - wrapRect.left + 8, Math.min(_pr.left - wrapRect.left + _pr.width - 8, _nx));
              }
              a.tx = _nx; a.ty = _baseY;
            }
          } else if(a._distillState === 'walk'){
            if(!_moving || now > a._distillTimer){
              a._distillState = 'idle';
              a._distillTimer = now + 2000 + Math.random() * 3000;
              a.tx = a.x; a.ty = _baseY;
            }
          }
          a.state = 'idle';
          continue;
        }
      }
    }
    if(a.type === 'farmer'){
      const task = _gardenFarmerFindTask(a, a._srv);
      if(task){
        const _bp = _gardenGetPlots()[task.plotIdx];
        if(_bp && _bp.broken){ a.idleUntil = now + 800; continue; }
        if(_gardenActorAssignTask(a, task, grid, wrapRect, now)) continue;
      } else {
        const srv = a._srv;
        const autoPlant = srv ? (srv.autoPlant || 'off') : 'off';
        if(autoPlant !== 'off'){
          const plots = _gardenGetPlots();
          let hasCrop = false, hasSeed = false;
          for(const idx of a.assignedPlots){
            const plot = plots[idx];
            if(plot && !plot.broken && plot.crop) hasCrop = true;
            if(autoPlant === 'follow' && plot && plot.lastSeed && plot.lastRarity && _gardenHasSeedOf(plot.lastSeed, plot.lastRarity)) hasSeed = true;
          }
          if(autoPlant === 'any') hasSeed = _gardenHasAnySeed();
          if(!hasCrop && !hasSeed){
            if(srv){ srv.resting = true; save(); }
            a.resting = true;
            a.state = 'rest';
            continue;
          }
        }
      }
    }

    if(a.type === 'foreman'){
      const _fp = _gardenGetFarmerPlots();
      if(_fp.length){
        const _pick = _fp[Math.floor(Math.random() * _fp.length)];
        const _pEl = grid.querySelector('.gp-plot[data-idx="' + _pick + '"]');
        if(_pEl){
          const _pr = _pEl.getBoundingClientRect();
          a.tx = _pr.left - wrapRect.left + _pr.width / 2 + (Math.random() - 0.5) * 12;
          a.ty = _pr.top - wrapRect.top + _pr.height - 2 + (Math.random() - 0.5) * 10;
          const _d = Math.sqrt(Math.pow(a.tx - a.x, 2) + Math.pow(a.ty - a.y, 2));
          if(_d < 4){ a.idleUntil = now + 6000 + Math.random() * 6000; continue; }
          const _wm = Math.max(900, Math.min(2600, _d * 4));
          a.walkMs = _wm;
          a.state = 'walk';
          a.idleUntil = now + _wm + 6000 + Math.random() * 6000;
          continue;
        }
      }
    }
    const _tickPlots = _gardenGetPlots();
    const _validPlots = a.assignedPlots.filter(function(_pi){ var _pp = _tickPlots[_pi]; return _pp && !_pp.broken; });
    if(!_validPlots.length){ a.idleUntil = now + 2000; continue; }
    const idleIdx = _validPlots[Math.floor(Math.random() * _validPlots.length)];
    const plotEl = grid.querySelector('.gp-plot[data-idx="' + idleIdx + '"]');
    if(plotEl){
      const pRect = plotEl.getBoundingClientRect();
      a.tx = pRect.left - wrapRect.left + pRect.width / 2 + (Math.random() - 0.5) * 16;
      a.ty = pRect.top - wrapRect.top + pRect.height - 2 + (Math.random() - 0.5) * 10;
      if(Math.abs(a.tx - a.x) < 12){
        const _dir = Math.random() > 0.5 ? 1 : -1;
        a.tx = a.x + _dir * (12 + Math.random() * 8);
        a.tx = Math.max(pRect.left - wrapRect.left + 8, Math.min(pRect.left - wrapRect.left + pRect.width - 8, a.tx));
      }
      const dist = Math.sqrt(Math.pow(a.tx - a.x, 2) + Math.pow(a.ty - a.y, 2));
      if(dist < 10){ a.idleUntil = now + 1800 + Math.random() * 2500; continue; }
      const walkMs = Math.max(900, Math.min(2600, dist * 4));
      a.walkMs = walkMs;
      a.state = 'walk';
      a.idleUntil = now + walkMs + 1500 + Math.random() * 2000;
    }
  }
}


var _gardenActorCanvasRAF = window._gardenActorCanvasRAF = null;

/* [v230] 後院工作動畫：attack_melee 的循環版，避免 work 狀態卡在最後一幀 */
if(typeof GAME_ANIMS !== 'undefined' && GAME_ANIMS.attack_melee && !GAME_ANIMS.garden_work){
  GAME_ANIMS.garden_work = JSON.parse(JSON.stringify(GAME_ANIMS.fire_primary));
  GAME_ANIMS.garden_work.loop = true;
}


function _gardenGetActorCanvas(){
  const p = document.getElementById('garden-page');
  if(!p) return null;
  const wrap = p.querySelector('.gp-grid-wrap');
  if(!wrap) return null;
  const oldLayer = wrap.querySelector('#gp-actor-layer');
  if(oldLayer) oldLayer.remove();
  let canvas = wrap.querySelector('#gp-actor-canvas');
  if(!canvas){
    canvas = document.createElement('canvas');
    canvas.id = 'gp-actor-canvas';
    canvas.className = 'gp-actor-canvas';
    wrap.appendChild(canvas);
  }
  return canvas;
}


function _gardenRenderActors(now){
  const p = document.getElementById('garden-page');
  if(!p) return;
  const wrap = p.querySelector('.gp-grid-wrap');
  if(!wrap) return;
  const canvas = _gardenGetActorCanvas();
  if(!canvas) return;
  const wr = wrap.getBoundingClientRect();
  const w = wr.width || 320, h = wr.height || 320;
  const dpr = window.devicePixelRatio || 1;
  const dw = Math.floor(w * dpr), dh = Math.floor(h * dpr);
  if(canvas.width !== dw || canvas.height !== dh){
    canvas.width = dw; canvas.height = dh;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  if(typeof _raidDrawHuman !== 'function') return;
  const CHAR_PX = 56;
  const SCALE = CHAR_PX / 386;
  const plots = _gardenGetPlots();
  const SPEED = 55;
  const _sortedActors = _gardenActors.slice().sort(function(a, b){ return (a.y || 0) - (b.y || 0); });
  for(const a of _sortedActors){
    if(!a.initialized) continue;
    /* rev-fix-raid-guard-actor-v2: 守衛在 actor canvas 上繪製（不跳過） */
    if(typeof a.tx !== 'number'){ a.tx = a.x || 0; a.ty = a.y || 0; }
    if(typeof a.x !== 'number'){ a.x = a.tx; a.y = a.ty; }
    if(typeof a._lastRenderTime !== 'number') a._lastRenderTime = now;
    const dt = Math.min(0.1, (now - a._lastRenderTime) / 1000);
    a._lastRenderTime = now;
    let didMove = false;
    const dx = a.tx - a.x, dy = a.ty - a.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if(dist > 0.5){
      const _actorSpeed = (a.type === 'guard') ? SPEED * 0.3 : SPEED;
      const step = Math.min(dist, _actorSpeed * dt);
      a.x += (dx / dist) * step;
      a.y += (dy / dist) * step;
      didMove = true;
    } else {
      a.x = a.tx; a.y = a.ty;
    }
    let animName = 'idle';
    let animStart = now;
    /* rev-fix-injured-guard-death-anim-v2: 重伤守卫 _injuredAnimStart 存到 srv 对象上，不被 sync 清空 */
    const _srvRef = (state.servants || []).find(function(s){ return s.id === a.id; });
    const _guardInjured = (a.type === 'guard' && _srvRef && _srvRef.injuredUntil && _srvRef.injuredUntil > Date.now());
    if(_guardInjured){
      animName = 'dead';
      /* rev-fix-injured-anim-start-v3: 用 performance.now() 基准 */
      if(!_srvRef._injuredAnimStart){
        _srvRef._injuredAnimStart = now;
      }
      animStart = _srvRef._injuredAnimStart;
      a._animName = animName;
      a._animStart = animStart;
    } else if(a._combatUnit && a._combatUnit.alive && window._raidLiveActive && typeof getUnitAnimState === 'function'){
      const _as = getUnitAnimState(a._combatUnit, now);
      animName = _as.name;
      animStart = _as.startTime;
    } else {
      const _moving = Math.sqrt(Math.pow(a.tx - a.x, 2) + Math.pow(a.ty - a.y, 2)) > 0.8;
      if(_moving) animName = 'walk';
      else if(a.state === 'work') animName = 'garden_work';
      else animName = 'idle';
      if(!a._animStart || a._animName !== animName){
        a._animStart = now;
      }
      animStart = a._animStart;
    }
    const anim = GAME_ANIMS[animName] || GAME_ANIMS.idle;
    a._animName = animName;
    a._animStart = animStart;
    const _elapsed = Math.max(0, now - animStart);
    let _f3 = Math.floor(_elapsed / (1000 / anim.fps));
    if(anim.loop){ _f3 = _f3 % anim.frameCount; }
    else if(_f3 > anim.frameCount - 1){ _f3 = anim.frameCount - 1; }
    a._animFrame = _f3;
    /* rev-fix-raid-actor-sync: 同步 animName / animFrame 給 _combatUnit，供 spawnBullet 的 _getRaidMuzzleWorld 使用 */
    if(a._combatUnit){
      a._combatUnit.animName = animName;
      a._combatUnit.animFrame = a._animFrame;
    }
    ctx.save();
    const equipped = {};
    const equippedRarity = {};
    if(a.type === 'guard' && a.assignedPlots && a.assignedPlots.length){
      const plot = plots[a.assignedPlots[0]];
      if(plot && plot.type === 'tower' && plot.towerConfig && plot.towerConfig.eq){
        const cfg = plot.towerConfig;
        for(const s of ['head','top','primary','secondary']){
          if(cfg.eq[s]){ equipped[s] = cfg.eq[s]; equippedRarity[s] = (cfg.eqRarity && cfg.eqRarity[s]) || '一般'; }
        }
      }
    }
    const wpSlot = equipped.primary ? 'primary' : (equipped.secondary ? 'secondary' : null);
    let _hasBucket = false;
    if(a.type === 'farmer' && a._srv && typeof _isAssignedToCompost === 'function'){
      _hasBucket = _isAssignedToCompost(a._srv);
    }
    let _handItem = null;
    if(_hasBucket) _handItem = 'bucket';
    else if(a.type === 'farmer' && a._srv && typeof _isAssignedToDistillery === 'function' && _isAssignedToDistillery(a._srv)) _handItem = 'flask';
    else if(a.type === 'farmer') _handItem = 'stick';
    else if(a.type === 'foreman') _handItem = 'clipboard';
    if(Math.abs(a.tx - a.x) > 2 && !window._raidLiveActive){
      a._facingLeft = (a.tx - a.x) < 0;
    }
    let _facingLeft = (typeof a._facingLeft === 'boolean') ? a._facingLeft : false;
    if(window._raidLiveActive && a.type === 'guard'){ _facingLeft = false; }
    /* rev-fix-dead-y-center: 让尸体居中在自己格子内（格子高 64，尸体高约 58） */
    const _drawY = (animName === 'dead') ? (a.y - 32) : a.y;
    (window.drawHumanSprite || _raidDrawHuman)(ctx, a.x, _drawY, SCALE, equipped, equippedRarity, animName, a._animFrame, wpSlot, a.type, _facingLeft, _hasBucket, _handItem);
    /* rev-fix-raid-actor-bar: 守衛戰鬥中在 actor canvas 上畫血條 */
    if(a._combatUnit && a._combatUnit.alive && window._raidLiveActive){
      const _cu = a._combatUnit;
      const _bw = 34, _bh = 4;
      const _bx = a.x - _bw / 2;
      /* rev-fix-raid-bar-above-name: 血條在姓名條上方，不被遮住 */
      const _by = a.y - 56 * 1.26 - 26;
      ctx.fillStyle = 'rgba(0,0,0,.75)';
      ctx.fillRect(_bx - 1, _by - 1, _bw + 2, _bh + 2);
      ctx.fillStyle = '#1a1010';
      ctx.fillRect(_bx, _by, _bw, _bh);
      ctx.fillStyle = '#4caf50';
      ctx.fillRect(_bx, _by, _bw * Math.max(0, _cu.hp / _cu.maxHp), _bh);
    }
    if(a._srv){
      const _lbl = servantLabel(a._srv);
      ctx.save();
      ctx.font = 'bold 9px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      const _tw = ctx.measureText(_lbl).width;
      const _by = a.y - CHAR_PX - 14;
      ctx.fillStyle = 'rgba(0,0,0,0.72)';
      ctx.fillRect(a.x - _tw/2 - 3, _by - 11, _tw + 6, 12);
      ctx.fillStyle = '#fff';
      ctx.fillText(_lbl, a.x, _by);
      ctx.restore();
    }
    ctx.restore();
    const _showIcon = (a.state === 'lazy' || a.state === 'rest') || (a.state === 'surrender' && window._raidLiveActive);
    if(_showIcon){
      ctx.save();
      ctx.font = 'bold 13px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.shadowColor = '#000';
      ctx.shadowBlur = 3;
      ctx.fillStyle = '#e8a33d';
      ctx.fillText(a.state === 'surrender' ? '🙌' : '💤', a.x + CHAR_PX * 0.40, a.y - CHAR_PX * 1.15);
      ctx.restore();
    }
  }
}


function _gardenStartActorCanvasLoop(){
  if(_gardenActorCanvasRAF) return;
  const tick = function(){
    const p = document.getElementById('garden-page');
    if(!p || !p.classList.contains('on')){
      _gardenActorCanvasRAF = null;
      return;
    }
    /* rev-fix-timebase-unify: 用 performance.now()，和 spawnBullet 的 _fireAnimStart 一致 */
    _gardenRenderActors(performance.now());
    _gardenActorCanvasRAF = requestAnimationFrame(tick);
  };
  _gardenActorCanvasRAF = requestAnimationFrame(tick);
}


function _gardenStopActorCanvasLoop(){
  if(_gardenActorCanvasRAF){
    cancelAnimationFrame(_gardenActorCanvasRAF);
    _gardenActorCanvasRAF = null;
  }
}


function _gardenStartActorLoop(){
  if(_gardenActorTimer) clearInterval(_gardenActorTimer);
  _gardenActorTimer = setInterval(function(){
    const p = document.getElementById('garden-page');
    if(!p || !p.classList.contains('on')){
      _gardenStopActorLoop();
      return;
    }
    _gardenActorTick();
  }, 200);
}


function _gardenStopActorLoop(){
  if(_gardenActorTimer){ clearInterval(_gardenActorTimer); _gardenActorTimer = null; }
  if(typeof _gardenStopActorCanvasLoop === 'function') _gardenStopActorCanvasLoop();
  const p = document.getElementById('garden-page');
  if(p){
    const layer = p.querySelector('#gp-actor-layer');
    if(layer) layer.innerHTML = '';
  }
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
  if(stam < 220) return null;
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
  if(typeof g.lastCompostDecayAt !== 'number' || g.lastCompostDecayAt > baseTime){
    g.lastCompostDecayAt = Math.floor(baseTime / GARDEN_MEAL_INTERVAL_MS) * GARDEN_MEAL_INTERVAL_MS;
  }
  if(now <= baseTime) return;
  const _actualHours = (now - baseTime) / 3600000;
  const _overtime = _actualHours > 8;
  const _overtimeNote = _overtime ? '（超過 8 小時，僅模擬 8 小時）' : '';
  baseTime = Math.max(baseTime, now - 8 * 3600 * 1000);
  const WORK_MS = (typeof GARDEN_WORK_MS === 'number') ? GARDEN_WORK_MS : 4000;
  const MAX_ITER = 30000;
  let cursor = baseTime;
  let totalHarvest = 0, totalPlant = 0, totalClean = 0, totalLeaves = 0, totalFert = 0;
  const cropsOut = {};
  const seedsOut = {};
  const matsOut = {};
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
      for(const _sid in actorMap){
        const _a = actorMap[_sid];
        _a.stamina = Math.min(_a.srv.stamina || 0, servantEffectiveMaxStamina(_a.srv));
      }
    }
    try {
      if(typeof _offlineGardenRaidSettle === 'function') _offlineGardenRaidSettle(baseTime, now);
    } catch(e){ console.warn('[offline raid]', e); }
  } catch(e){
    console.warn('[garden offline sim] err', e);
  }
  if(cursor < now){
    try { if(typeof _gardenDistilleryTick === 'function') _gardenDistilleryTick(now); } catch(e){}
  }
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
  /* rev-fix-offline-align-v2: 只在 lastX 落後 > 500 週期（times 會被截斷）時才對齊，避免正常情況額外生產 */
  const _mAl = g.merchant;
  if(_mAl){
    const _baseAl = now - (now % MERCHANT_INTERVAL_MS);
    const _maxSafe = 500 * MERCHANT_INTERVAL_MS;
    if(_mAl.foodLv > 0  && (now - _mAl.lastFood)  > _maxSafe) _mAl.lastFood  = _baseAl;
    if(_mAl.seedLv > 0  && (now - _mAl.lastSeed)  > _maxSafe) _mAl.lastSeed  = _baseAl;
    if(_mAl.throwLv > 0 && (now - _mAl.lastThrow) > _maxSafe) _mAl.lastThrow = _baseAl;
    if(_mAl.ammoLv > 0  && (now - _mAl.lastAmmo)  > _maxSafe) _mAl.lastAmmo  = _baseAl;
  }
  if(typeof _gardenCompostDecayTick === 'function'){ try { _gardenCompostDecayTick(now); } catch(e){} }
  const _mSeed = Object.keys(merchantAccum.seed).reduce(function(s,k){ return s + merchantAccum.seed[k].count; }, 0);
  const _mThrow = Object.keys(merchantAccum.throw).reduce(function(s,k){ return s + merchantAccum.throw[k].count; }, 0);
  const _mAmmo = Object.keys(merchantAccum.ammo).reduce(function(s,k){ return s + merchantAccum.ammo[k].count; }, 0);
  const _merchantHas = (merchantAccum.foodBatches > 0 || _mSeed > 0 || _mThrow > 0 || _mAmmo > 0);
  const hours = _actualHours.toFixed(1);
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
  const _liqTotal = Object.keys(liquorOut).reduce(function(s, k){ return s + liquorOut[k]; }, 0);
  if(_liqTotal) parts.push('🍶+' + _liqTotal);
  const summary = parts.length
    ? ('離線 ' + hours + ' 小時' + _overtimeNote + '，後院：' + parts.join('、') + '。 點擊查看 →')
    : ('離線 ' + hours + ' 小時' + _overtimeNote + '，後院無活動。');
  if(!state.garden.log) state.garden.log = [];
  state.garden.log.push({ t: Date.now(), text: summary, cls: 'offline', detail: detail });
  if(state.garden.log.length > 100) state.garden.log.splice(0, state.garden.log.length - 100);
  try { if(typeof _gardenStorageRotCheck === "function") _gardenStorageRotCheck(); } catch(e){ console.warn("[offline rot]", e); }
  } finally {
    window._gardenOfflineSettleRunning = false;
  }
}

/* ===== 玩家手動收穫 ===== */

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

/* ===== 手動放飯 ===== */
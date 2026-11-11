'use strict';

/* 後院功能（放飯 / 堆肥 / 蒸餾 / 哨塔 / 車站互轉 / 僕人天賦與解僱） */
/* 由 21-garden.js 拆分而來，加載順序 21a → 21b → 21c → 21d → 21e，
 * 21d/21e 依賴 21a/21b/21c；21c 依賴 21a/21b。
 * 跨文件共享符號（GARDEN_TABS / _gardenActiveTab / _gardenTickTimer /
 *   _gardenActors / _gardenActorTimer / _gardenActorCanvasRAF）
 * 以 var = window.xxx = 形式暴露。 */

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
    const _img = 'icons/servants/' + srv.type + '.png' + assetSuffix('icons/servants/' + srv.type + '.png');
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

/* ===== 堆肥 ===== */

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

/* ===== 蒸餾室 + 私酒 ===== */

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
      h += '<img src="icons/garden/liquor.png' + assetSuffix('icons/garden/liquor.png') + '" style="width:42px;height:42px;object-fit:contain" alt="">';
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


function _gardenLiquorRatePerHour(){
  if(typeof _gardenGetPlots !== "function") return 0;
  var plots = _gardenGetPlots();
  var rate = 0;
  for(var i = 0; i < plots.length; i++){
    var p = plots[i];
    if(!p || p.type !== "distillery") continue;
    if(p.enabled === false) continue;
    var hasFarmer = (state.servants || []).some(function(s){
      return s.type === "farmer" && s.assignedPlots && s.assignedPlots.indexOf(i) !== -1;
    });
    if(!hasFarmer) continue;
    var mult = 1;
    var crop = p.currentCrop;
    if(!crop && typeof _findCropForDistill === 'function'){
      try { crop = _findCropForDistill(p); } catch(e){}
    }
    if(crop && crop.rarity){
      mult = RARITY_MULT[crop.rarity] || 1;
    }
    rate += 12 * mult;
  }
  return rate;
}


function _openLiquorDetail(){
  var plots = _gardenGetPlots();
  var list = [];
  for(var i = 0; i < plots.length; i++){
    var p = plots[i];
    if(!p || p.type !== "distillery") continue;
    var hasFarmer = (state.servants || []).some(function(s){
      return s.type === "farmer" && s.assignedPlots && s.assignedPlots.indexOf(i) !== -1;
    });
    list.push({ idx: i, active: hasFarmer && p.enabled !== false, enabled: p.enabled !== false, hasFarmer: hasFarmer });
  }
  var body = "";
  body += "<div class=\"detail-sub\">\u5171 " + list.length + " \u9593\u84B8\u9945\u5BA4</div>";
  body += "<div class=\"divider\"></div>";
  if(!list.length){
    body += "<div class=\"empty-hint\">\u5C1A\u672A\u5EFA\u9020\u84B8\u9945\u5BA4</div>";
  } else {
    for(var li = 0; li < list.length; li++){
      var it = list[li];
      var status = it.active ? "\u904B\u4F5C\u4E2D" : (it.enabled ? "\u7F3A\u8FB2\u6C11" : "\u5DF2\u505C\u7528");
      var color = it.active ? "#7ee07e" : "#e05252";
      body += "<div style=\"padding:6px 0;border-bottom:1px dashed #2a231c\">";
      body += "<div style=\"font-size:12px;font-weight:bold;color:#e8a33d\">" + plotCoordName(it.idx) + " \u00B7 <span style=\"color:" + color + "\">" + status + "</span></div>";
      body += "<div style=\"font-size:10px;color:#a89a85;margin-top:2px\">\u6BCF 5 \u5206\u9418 1 \u74F6\uFF0812/h\uFF09</div>";
      body += "</div>";
    }
  }
  var ft = document.createElement("div");
  ft.className = "modal-ft";
  ft.innerHTML = "";
  openModal({ title: "\u79C1\u9152", body: body, footer: ft });
}

/* ===== 堆肥詳情 ===== */

function openCompostDetail(idx, returnFn){
  const plots = _gardenGetPlots();
  const plot = plots[idx];
  if(!plot || plot.type !== "compost") return;
  const g = _gardenMerchantInit();
  const compostValue = Math.round((g.compostValue || 0) * 10) / 10;
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

/* ===== 哨塔（含配置） ===== */

function _gardenTowerInit(plot){
  if(!plot.towerConfig || typeof plot.towerConfig !== 'object'){
    plot.towerConfig = { eq:{ head:null, top:null, primary:null, secondary:null }, eqRarity:{}, ammoId:null, maxShots:'inf' };
  }
  const c = plot.towerConfig;
  if(!c.eq || typeof c.eq !== 'object') c.eq = { head:null, top:null, primary:null, secondary:null };
  if(typeof c.eq.head === 'undefined') c.eq.head = null;
  if(typeof c.eq.top === 'undefined') c.eq.top = null;
  if(typeof c.eq.primary === 'undefined') c.eq.primary = null;
  if(typeof c.eq.secondary === 'undefined') c.eq.secondary = null;
  if(!c.eqRarity || typeof c.eqRarity !== 'object') c.eqRarity = {};
  if(typeof c.ammoId === 'undefined') c.ammoId = null;
  if(typeof c.maxShots === 'undefined') c.maxShots = 'inf';
  return c;
}


function _gardenTowerNormalizeEq(cfg){
  if(!cfg || !cfg.eq) return;
  const _slots = ['head','top','primary','secondary'];
  for(const _slot of _slots){
    const _id = cfg.eq[_slot];
    if(!_id) continue;
    const _rar = cfg.eqRarity[_slot] || '一般';
    let _exists = (state.inventory[_id + '@' + _rar] || 0) > 0;
    if(!_exists){
      for(const _s in state.player.equipped){
        if(state.player.equipped[_s] === _id && (state.player.equippedRarity[_s] || '一般') === _rar){ _exists = true; break; }
      }
    }
    if(_exists) continue;
    let _bestRar = null, _bestIdx = -1;
    for(const _k in state.inventory){
      const _p = _k.split('@');
      if(_p[0] !== _id) continue;
      if(!state.inventory[_k] || state.inventory[_k] <= 0) continue;
      const _i = RARITY_ORDER.indexOf(_p[1]);
      if(_i > _bestIdx){ _bestIdx = _i; _bestRar = _p[1]; }
    }
    if(_bestRar){
      cfg.eqRarity[_slot] = _bestRar;
    } else {
      cfg.eq[_slot] = null;
      delete cfg.eqRarity[_slot];
    }
  }
}


function _gardenRepairConfirm(idx){
  const ft = document.createElement('div');
  ft.className = 'modal-ft';
  ft.innerHTML = '<button class="btn primary" id="gp-rp-ok">修理</button><button class="btn ghost" id="gp-rp-cancel">取消</button>';
  const body = '<div style="font-size:13px;color:#e8a33d;font-weight:bold">' + plotCoordName(idx) + ' · 損壞</div>' +
    '<div class="detail-sub">需要材料：🔩20 🪵10</div>';
  openModal({ title: '修理', body: body, footer: ft });
  ft.querySelector('#gp-rp-cancel').onclick = closeModal;
  ft.querySelector('#gp-rp-ok').onclick = function(){ closeModal(); _gardenRepairPlot(idx); };
}


function _gardenRepairPlot(idx){
  const plots = _gardenGetPlots();
  const p = plots[idx];
  if(!p || !p.broken) return;
  const haveMetal = (typeof materialEquivalent === 'function') ? materialEquivalent('metal') : 0;
  const haveWood = (typeof materialEquivalent === 'function') ? materialEquivalent('wood') : 0;
  if(haveMetal < 20 || haveWood < 10){
    return;
  }
  consumeMaterial('metal', 20);
  consumeMaterial('wood', 10);
  p.broken = false;
  save();
  renderGardenGrid();
}


function _gardenTowerOpen(idx){
  const plots = _gardenGetPlots();
  const plot = plots[idx];
  if(!plot || plot.type !== 'tower') return;
  const cfg = _gardenTowerInit(plot);
  _gardenTowerNormalizeEq(cfg);
  const servants = (state.servants || []).filter(function(s){
    return s.type === 'guard' && s.assignedPlots && s.assignedPlots.indexOf(idx) !== -1;
  });
  function slotCell(key, label){
    const id = cfg.eq[key];
    const rar = cfg.eqRarity[key] || '';
    if(id){
      const d = itemDef(id) || {name:id};
      return '<div class="tower-eq filled" data-slot="' + key + '">' +
        '<div class="tower-eq-thumb">' + itemIcon(id, 28) + '</div>' +
        '<div class="tower-eq-name ' + rarityClass(rar) + '">' + d.name + '</div>' +
        '</div>';
    }
    return '<div class="tower-eq empty" data-slot="' + key + '">' +
      '<div class="tower-eq-thumb">＋</div>' +
      '<div class="tower-eq-name">' + label + '</div>' +
      '</div>';
  }
  let body = '';
  const _twIcon = _getPlotTypeIconHtml('tower', 24);
  body += '<div style="display:flex;align-items:center;gap:8px;font-size:15px;color:#e8a33d;font-weight:bold">' + _twIcon + '<span>哨塔</span><button class="btn danger" id="tower-del" style="margin-left:auto;padding:4px 10px;font-size:11px;border-radius:5px;flex:0 0 auto">拆除</button></div>';
  body += '<div class="detail-sub">' + plotCoordName(idx) + ' · Lv.' + (plot.lv||1) + '</div>';
  body += _gardenPlotOwnersHtml(idx, 'guard');
  body += '<div style="font-size:11px;color:#e8a33d;font-weight:bold;margin:8px 0 4px">裝備</div>';
  body += '<div class="tower-eq-grid">';
  body += slotCell('head', '頭');
  body += slotCell('top', '衣');
  body += '</div>';
  body += '<div style="font-size:11px;color:#e8a33d;font-weight:bold;margin:8px 0 4px">武器（主/副擇一）</div>';
  const hasPrimary = !!cfg.eq.primary;
  const hasSecondary = !!cfg.eq.secondary;
  body += '<div class="tower-eq-grid">';
  if(hasPrimary){
    body += slotCell('primary', '主武器');
    body += '<div class="tower-eq locked" data-slot="secondary"><div class="tower-eq-thumb">🔒</div><div class="tower-eq-name">副武器</div></div>';
  } else if(hasSecondary){
    body += '<div class="tower-eq locked" data-slot="primary"><div class="tower-eq-thumb">🔒</div><div class="tower-eq-name">主武器</div></div>';
    body += slotCell('secondary', '副武器');
  } else {
    body += slotCell('primary', '主武器');
    body += slotCell('secondary', '副武器');
  }
  body += '</div>';
  const wId = cfg.eq.primary || cfg.eq.secondary;
  const wDef = wId ? itemDef(wId) : null;
  if(wDef && wDef.cal){
    body += '<div style="font-size:11px;color:#e8a33d;font-weight:bold;margin:8px 0 4px">彈藥</div>';
    if(cfg.ammoId){
      const _ar = AMMO[cfg.ammoId] ? AMMO[cfg.ammoId].rarity : '一般';
      body += '<div class="tower-ammo-pick" id="tower-ammo-pick" style="background:' + rarityBg(_ar) + '"><span class="' + rarityClass(_ar) + '">' + (AMMO[cfg.ammoId] ? AMMO[cfg.ammoId].name : cfg.ammoId) + '</span></div>';
    } else {
      body += '<div class="tower-ammo-pick empty" id="tower-ammo-pick">— 未指定 —</div>';
    }
    body += '<div style="font-size:11px;color:#7a6f60;margin-top:6px">每輪射擊上限</div>';
    const ms = cfg.maxShots || 'inf';
    body += '<select id="tower-ammo-max" style="width:100%;background:#151210;color:#ddd;border:1px solid #2a231c;border-radius:4px;padding:5px;font-size:11px;margin-top:3px">';
    body += '<option value="skip"' + (ms==='skip'?' selected':'') + '>0（不射擊）</option>';
    body += '<option value="mag"' + (ms==='mag'?' selected':'') + '>一匣（' + (wDef.mag||30) + '）</option>';
    body += '<option value="inf"' + (ms==='inf'?' selected':'') + '>無限</option>';
    body += '</select>';
  }
  const bd = openModal({ title: '哨塔配置', body: body });
  const _del = bd.querySelector('#tower-del');
  if(_del) _del.onclick = function(){ _gardenTowerDemolish(idx); };
  _gardenPlotOwnersBind(bd);
  const eqCells = bd.querySelectorAll('.tower-eq[data-slot]');
  for(let i = 0; i < eqCells.length; i++){
    (function(el){
      if(el.classList.contains('locked')) return;
      el.onclick = function(){ _gardenTowerPickEquip(idx, el.getAttribute('data-slot')); };
    })(eqCells[i]);
  }
  const ammoPick = bd.querySelector('#tower-ammo-pick');
  if(ammoPick){
    ammoPick.onclick = function(){ _gardenTowerPickAmmo(idx, wDef); };
  }
  const ammoMax = bd.querySelector('#tower-ammo-max');
  if(ammoMax){
    ammoMax.onchange = function(){ cfg.maxShots = ammoMax.value || 'inf'; save(); };
  }
}


function _gardenTowerPickEquip(idx, slot){
  const plots = _gardenGetPlots();
  const plot = plots[idx];
  if(!plot) return;
  const cfg = _gardenTowerInit(plot);
  const curId = cfg.eq[slot];
  if(!state.unlockedEquip) state.unlockedEquip = {};
  for(const k in state.inventory){
    const p = k.split('@');
    if(p.length !== 2) continue;
    const d = itemDef(p[0]);
    if(d && d.slot) state.unlockedEquip[k] = true;
  }
  for(const s in state.player.equipped){
    const id = state.player.equipped[s];
    if(!id) continue;
    const rar = state.player.equippedRarity[s] || '一般';
    const d = itemDef(id);
    if(d && d.slot) state.unlockedEquip[id + '@' + rar] = true;
  }
  const list = [];
  const seen = {};
  for(const key in state.unlockedEquip){
    const p = key.split('@');
    const id = p[0], rar = p[1];
    const d = itemDef(id);
    if(!d || !d.slot) continue;
    if(d.slot !== slot) continue;
    if(seen[key]) continue;
    seen[key] = true;
    list.push({ id: id, rarity: rar, def: d });
  }
  list.sort(function(a, b){
    const ra = sortByRarityDesc(a, b);
    if(ra !== 0) return ra;
    return (a.def.name || '').localeCompare(b.def.name || '', 'zh-Hant');
  });
  let body = '';
  if(curId){
    body += '<div class="item-row" data-act="unequip"><div class="icon">✕</div><div class="info"><div class="nm">卸下</div><div class="sub">不消耗背包</div></div></div>';
  }
  if(!list.length && !curId){
    body += '<div class="empty-hint">尚未解鎖此類裝備</div>';
  }
  for(const it of list){
    body += '<div class="item-row" data-eid="' + it.id + '" data-erar="' + it.rarity + '">';
    body += '<div class="icon" style="background:' + rarityBg(it.rarity) + '">' + itemIcon(it.id, 30) + '</div>';
    body += '<div class="info"><div class="nm ' + rarityClass(it.rarity) + '">' + it.def.name + '</div>';
    body += '<div class="sub">' + it.rarity + '</div></div></div>';
  }
  const bd = openModal({ title: '選擇裝備（' + slot + '）', body: body, onClose: function(){ _gardenTowerOpen(idx); } });
  const unequipBtn = bd.querySelector('[data-act="unequip"]');
  if(unequipBtn){
    unequipBtn.onclick = function(){
      cfg.eq[slot] = null;
      delete cfg.eqRarity[slot];
      save();
      closeModal();
      _gardenTowerOpen(idx);
    };
  }
  const rows = bd.querySelectorAll('.item-row[data-eid]');
  for(let i = 0; i < rows.length; i++){
    (function(el){
      el.onclick = function(){
        const eid = el.getAttribute('data-eid');
        const erar = el.getAttribute('data-erar');
        if(slot === 'primary'){ cfg.eq.secondary = null; delete cfg.eqRarity.secondary; }
        if(slot === 'secondary'){ cfg.eq.primary = null; delete cfg.eqRarity.primary; }
        cfg.eq[slot] = eid;
        cfg.eqRarity[slot] = erar;
        if(slot === 'primary' || slot === 'secondary'){ cfg.ammoId = null; cfg.maxShots = 'inf'; }
        save();
        closeModal();
        _gardenTowerOpen(idx);
      };
    })(rows[i]);
  }
}


function _gardenTowerPickAmmo(idx, wDef){
  const plots = _gardenGetPlots();
  const plot = plots[idx];
  if(!plot) return;
  const cfg = _gardenTowerInit(plot);
  const ammos = Object.keys(AMMO).filter(function(a){ return AMMO[a].cal === wDef.cal; });
  ammos.sort(function(a, b){
    const ra = RARITY_ORDER.indexOf(AMMO[b].rarity) - RARITY_ORDER.indexOf(AMMO[a].rarity);
    if(ra !== 0) return ra;
    return AMMO[a].name.localeCompare(AMMO[b].name, 'zh-Hant');
  });
  let body = '<div class="item-row" data-amid=""><div class="icon">✕</div><div class="info"><div class="nm">未指定</div><div class="sub">不射擊</div></div></div>';
  for(const a of ammos){
    const d = AMMO[a];
    body += '<div class="item-row" data-amid="' + a + '"><div class="icon" style="background:' + rarityBg(d.rarity) + '">' + itemIcon(a, 30) + '</div><div class="info"><div class="nm ' + rarityClass(d.rarity) + '">' + d.name + '</div><div class="sub">' + d.rarity + ' · 穿甲 ' + (d.penMM||0) + ' · 傷害 ' + (d.dmg||0) + '</div></div></div>';
  }
  const bd = openModal({ title: '選擇彈藥', body: body, onClose: function(){ _gardenTowerOpen(idx); } });
  const rows = bd.querySelectorAll('.item-row[data-amid]');
  for(let i = 0; i < rows.length; i++){
    (function(el){
      el.onclick = function(){
        const aid = el.getAttribute('data-amid');
        cfg.ammoId = aid || null;
        save();
        closeModal();
        _gardenTowerOpen(idx);
      };
    })(rows[i]);
  }
}


function _gardenTowerDemolish(idx){
  const plots = _gardenGetPlots();
  const plot = plots[idx];
  if(!plot || plot.type !== 'tower') return;
  plots[idx] = null;
  _clearPlotAssignments(idx);
  save();
  closeModal();
  renderGardenGrid();
}


function _isServantInStation(srvId){
  if(!state.station) return false;
  const c = state.station.crew || {};
  if(c.commander === srvId || c.gunner === srvId || c.driver === srvId) return true;
  if(Array.isArray(state.station.passengers)){
    for(let i = 0; i < state.station.passengers.length; i++){
      if(state.station.passengers[i] && state.station.passengers[i].srvId === srvId) return true;
    }
  }
  return false;
}

function _removeFromStation(srvId){
  if(!state.station) return;
  const c = state.station.crew;
  if(c){
    for(const r of ['commander', 'gunner', 'driver']){
      if(c[r] === srvId) c[r] = null;
    }
  }
  if(Array.isArray(state.station.passengers)){
    state.station.passengers = state.station.passengers.filter(function(p){
      return !(p && p.srvId === srvId);
    });
  }
}

/* === _isServantWorking（renderGardenServants 排序依賴） === */
/* === gardenHarvest（玩家手動收穫） === */
/* === _refreshServantListNow（指派/撤回/改名後實時刷新僕人列表） === */
/* === _gardenFoodTtlMs（冰箱加成：24h → 48h） === */
/* === _gardenStorageRotCheck（作物腐爛 → 堆肥/種子；種子 48h 過期） === */

/* [Patch] 補全缺失的僕人與天賦系統 */
/* rev-fix-no-forward: 统一为单一函数声明（顶层声明自动挂 window，外部 window.grantRandomServant() 仍可用）*/

function grantRandomServant(){
  const allTypes = Object.keys(SERVANT_TYPES);
  const types = allTypes.filter(function(t){
    if(t === 'foreman') return _gardenHasPlotType('shed');
    return true;
  });
  if(!types.length) return null;
  const type = pick(types);
  const rarity = rollRarity();
  const id = 's_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
  if(!state.garden) state.garden = {};
  if(typeof state.garden.nextServantTag !== 'number') state.garden.nextServantTag = 1;
  const _tag = state.garden.nextServantTag++;
  const srv = {
    id: id, type: type, rarity: rarity, lv: 1, exp: 0,
    assignedPlots: [], autoPlant: 'off',
    foodPolicy: 'normal', resting: false,
    obtainedAt: Date.now(), tag: _tag, customName: '', talents: []
  };
  srv.stamina = (typeof servantEffectiveMaxStamina === 'function') ? servantEffectiveMaxStamina(srv) : 100;
  state.servants = state.servants || [];
  state.servants.push(srv);
  return srv;
}


function _gardenServantLeaveCheck(silent){
  const now = Date.now();
  const leaving = [];
  state.servants = (state.servants || []).filter(function(s){
    if(s.lv > 1 || (s.exp || 0) > 0 || (s.assignedPlots && s.assignedPlots.length > 0)) return true;
    const grace = SERVANT_LEAVE_GRACE[s.rarity] || 24 * 3600 * 1000;
    if(now - (s.obtainedAt || now) < grace) return true;
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
      seedReward[sid+'@'+s.rarity] = (seedReward[sid+'@'+s.rarity] || 0) + 1;
    }
    const mc = rndInt(r.matMin, r.matMax);
    for(let i = 0; i < mc; i++){
      const mid = pick(matNames);
      invAdd(mid, '一般', 1);
      matReward[mid] = (matReward[mid] || 0) + 1;
    }
  }
  if(!silent) _gardenLog(leaving.length + ' 僕人離開', 'leave');
  return { count: leaving.length, seeds: seedReward, mats: matReward };
}


function getServantTalents(srv){ return srv && Array.isArray(srv.talents) ? srv.talents : []; }

function awakenTalent(srv){
  if(!srv || !Array.isArray(srv.talents) || typeof TALENT_DEFS === 'undefined') return null;
  if(Math.random() >= TALENT_AWAKEN_RATE) return null;
  // 加入排重機制，過濾掉已擁有的天賦
  var pool = Object.keys(TALENT_DEFS).filter(function(t){ return srv.talents.indexOf(t) === -1; });
  if(pool.length > 0) {
    var k = pick(pool);
    srv.talents.push(k);
    return k;
  }
  return null;
}

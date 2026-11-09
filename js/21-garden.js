/* ============================================================
   21-garden.js — 後院核心（地塊 / 作物 / 僕人 / 演員 / 蒸餾 / 堆肥 / 日誌）
   由舊 08-garden-core.js / 08a-garden-servants.js / 08b-garden-raid.js（花園域）重構
   常量（GARDEN_WORK_MS / GARDEN_MEAL_INTERVAL_MS / SERVANT_LEAVE_* / DISTILL_* /
   GARDEN_SEED_ROT_MS / MERCHANT_* / FOOD_COST_BASE / RARITY_FOOD_MULT 等）已於 07-data-garden.js 定義，
   本文件不重複定義。
   ============================================================ */

/* ===== 地塊類型 ===== */

function _getPlotTypeIconHtml(type, size, flexNone, fill){
  const _flex = flexNone ? ';flex:0 0 auto' : '';
  const _t = GARDEN_PLOT_TYPES[type];
  if(!_t) return '<span style="font-size:' + size + 'px' + _flex + '">?</span>';
  const _file = _t.imgIcon || _t.bg || type;
  if(fill) return '<img src="icons/garden/' + _file + '.png' + assetSuffix() + '" style="width:100%;height:100%;object-fit:cover;display:block;pointer-events:none;border-radius:3px" alt="">';
  return '<img src="icons/garden/' + _file + '.png' + assetSuffix() + '" style="width:' + size + 'px;height:' + size + 'px;object-fit:contain' + _flex + '" alt="">';
}

function _getAvailableSoilTypes(currentType){
  const _list = [];
  if(state.garden && state.garden.ownedSpecialSoil){
    const _owned = Object.keys(state.garden.ownedSpecialSoil).filter(function(t){
      return state.garden.ownedSpecialSoil[t] && t !== currentType && _isSoilType(t);
    });
    for(const t of _owned) _list.push(t);
  }
  if(currentType !== 'soil' && _list.indexOf('soil') === -1) _list.push('soil');
  return _list;
}

function _getSpecialSoilBtnHtml(plot){
  const avail = _getAvailableSoilTypes(plot.type);
  if(!avail.length) return '';
  return '<button class="btn" id="soil-apply" style="padding:4px 10px;font-size:11px;border-radius:5px;flex:0 0 auto;margin-left:6px">改造</button>';
}

function _applySpecialSoil(typeId){
  const plots = _gardenGetPlots();
  let cnt = 0;
  for(let i = 0; i < plots.length; i++){
    if(plots[i] && _isSoilType(plots[i].type)){
      plots[i].type = typeId;
      cnt++;
    }
  }
  if(state.garden) state.garden.currentSoilType = typeId;
  save();
  renderGardenGrid();
  renderGardenContent();
  if(typeof _gardenUpdateFoodInfo === 'function') _gardenUpdateFoodInfo();
  notify('已套用 ' + cnt + ' 塊土地');
}

function _openApplySoilDialog(typeId){
  const names = { black_soil: '黑土地', red_soil: '紅土地' };
  const ft = document.createElement('div');
  ft.className = 'modal-ft';
  ft.innerHTML = '<button class="btn primary" id="m-apply">立即套用</button><button class="btn ghost" id="m-later">稍後</button>';
  openModal({ title: '套用特殊土地', body: '<div style="font-size:12px;line-height:1.6">購買成功！是否立即將所有土地改造為 <b style="color:#e8a33d">' + (names[typeId] || typeId) + '</b>？</div>', footer: ft });
  ft.querySelector('#m-apply').onclick = function(){ _applySpecialSoil(typeId); closeModal(); };
  ft.querySelector('#m-later').onclick = closeModal;
}

function _openApplySpecificSoilDialog(idx){
  const plots = _gardenGetPlots();
  const plot = plots[idx];
  if(!plot) return;
  const avail = _getAvailableSoilTypes(plot.type);
  if(!avail.length) return;
  const names = { soil: '土地（默認）', black_soil: '黑土地', red_soil: '紅土地' };
  let body = '<div style="font-size:10px;color:#7a6f60;margin-bottom:8px">選擇要全局套用的土地類型（影響所有已種植的土地）。</div>';
  for(const t of avail){
    body += '<div class="item-row" data-tid="' + t + '"><div class="icon">' + _getPlotTypeIconHtml(t, 30) + '</div><div class="info"><div class="nm">' + (names[t] || t) + '</div><div class="sub">' + (GARDEN_PLOT_TYPES[t] ? GARDEN_PLOT_TYPES[t].desc : '') + '</div></div></div>';
  }
  const bd = openModal({ title: '選擇土地類型', body: body });
  const rows = bd.querySelectorAll('.item-row[data-tid]');
  for(let i = 0; i < rows.length; i++){
    (function(row){
      row.onclick = function(){
        _applySpecialSoil(row.getAttribute('data-tid'));
        closeModal();
      };
    })(rows[i]);
  }
}

/* ===== 花園頁面骨架 ===== */
const GARDEN_TABS = [
  { id: 'log',      label: '📜 日誌' },
  { id: 'storage',  label: '📦 儲備' },
  { id: 'servant',  label: '👤 僕人' },
  { id: 'merchant', label: '💰 商人' }
];
let _gardenActiveTab = 'storage';
let _gardenTickTimer = null;

function _ensureGardenPage(){
  let p = document.getElementById('garden-page');
  if(p) return p;
  p = document.createElement('div');
  p.id = 'garden-page';
  let tabsHtml = '';
  for(const t of GARDEN_TABS){
    tabsHtml += '<div class="gp-tab" data-tab="' + t.id + '">' + t.label + '</div>';
  }
  p.innerHTML =
    '<div class="gp-grid-wrap">' +
      '<div class="gp-grid" id="gp-grid"></div>' +
    '</div>' +
    '<div class="gp-func">' +
      '<div class="gp-food-bar">' +
        '<div class="gp-food-info" id="gp-food-info"></div>' +
        '<div class="gp-timer-btn" id="gp-timer-btn">定時</div>' +
        '<div class="gp-feed-btn" id="gp-feed-btn">加餐</div>' +
      '</div>' +
      '<div class="gp-tabs" id="gp-tabs">' + tabsHtml + '</div>' +
      '<div class="gp-content" id="gp-content"></div>' +
    '</div>';
  (document.getElementById('content') || document.body).appendChild(p);

  p.addEventListener('click', function(e){
    let node = e.target;
    while(node && node !== p){
      if(node.id === 'gp-feed-btn'){
        if(typeof openManualFeed === 'function') openManualFeed();
        return;
      }
      if(node.id === 'gp-timer-btn'){
        if(typeof openFoodPolicyPanel === 'function') openFoodPolicyPanel();
        return;
      }
      node = node.parentNode;
    }
    const _et = e.target;
    if(_et && _et.closest){
      const _itm = _et.closest('.itm');
      if(_itm && _itm.dataset && _itm.dataset.iid){
        if(typeof openItemDetail === 'function') openItemDetail(_itm.dataset.iid, _itm.dataset.irar || '一般');
        return;
      }
      const _logLine = _et.closest('.garden-log-line[data-log-idx]');
      if(_logLine){
        const _idx = parseInt(_logLine.getAttribute('data-log-idx'), 10);
        const _log = (state.garden && state.garden.log) || [];
        const _entry = _log[_idx];
        if(_entry && _entry.detail){ _openGardenLogDetail(_entry); }
        return;
      }
      /* rev-fix-raid-summary-click: 選擇器同時支持舊卡片與新文字總結 */
      const _battleItem = _et.closest('.battle-log-item[data-battle-idx], .raid-log-summary[data-battle-idx]');
      if(_battleItem){
        const _idx = parseInt(_battleItem.getAttribute('data-battle-idx'), 10);
        const _bl = (state.garden && state.garden.battleLog) || [];
        const _entry = _bl[_idx];
        if(_entry){ _openBattleLogDetail(_entry); }
        return;
      }
    }
  });

  const tabEls = p.querySelectorAll('.gp-tab');
  for(let i = 0; i < tabEls.length; i++){
    (function(el){
      el.onclick = function(){
        const tid = el.getAttribute('data-tab');
        if(!tid) return;
        _gardenActiveTab = tid;
        renderGardenTabs();
        renderGardenContent();
      };
    })(tabEls[i]);
  }
  window.addEventListener('resize', function(){
    if(p.classList.contains('on')) _fitGardenGrid();
  });
  (function(){
    if(p._mainTabSwipeBound) return;
    p._mainTabSwipeBound = true;
    const TABS = ['explore', 'combat', 'garden', 'base'];
    let sx = 0, sy = 0, st = 0, active = false;
    p.addEventListener('touchstart', function(e){
      if(e.touches.length !== 1){ active = false; return; }
      sx = e.touches[0].clientX;
      sy = e.touches[0].clientY;
      st = Date.now();
      active = true;
    }, {passive: true, capture: true});
    p.addEventListener('touchcancel', function(){ active = false; }, {capture: true});
    p.addEventListener('touchend', function(e){
      if(!active) return;
      active = false;
      if(!e.changedTouches || e.changedTouches.length !== 1) return;
      const dx = e.changedTouches[0].clientX - sx;
      const dy = e.changedTouches[0].clientY - sy;
      const dt = Date.now() - st;
      if(dt > 800) return;
      if(Math.abs(dx) < 60) return;
      if(Math.abs(dy) > Math.abs(dx) * 0.6) return;
      if(typeof BossModule !== 'undefined' && BossModule.isActive()) return;
      if(typeof currentTab !== 'string') return;
      const curIdx = TABS.indexOf(currentTab);
      if(curIdx < 0) return;
      const nextIdx = dx < 0 ? curIdx + 1 : curIdx - 1;
      if(nextIdx < 0 || nextIdx >= TABS.length) return;
      e.stopPropagation();
      e.preventDefault();
      const target = document.querySelector('.tab[data-tab="' + TABS[nextIdx] + '"]');
      if(target) target.click();
    }, {passive: false, capture: true});
  })();
  return p;
}

function _fitGardenGrid(){
  const p = document.getElementById('garden-page');
  if(!p) return;
  const wrap = p.querySelector('.gp-grid-wrap');
  const grid = p.querySelector('#gp-grid');
  if(!wrap || !grid) return;
  grid.style.transform = '';
  const wrapW = wrap.clientWidth - 40;
  const wrapH = wrap.clientHeight - 20;
  if(wrapW <= 0 || wrapH <= 0) return;
  const gridW = 4 * 64 + 3 * 4;
  const gridH = 5 * 64 + 4 * 4;
  const HEAD_SPACE = 45;
  const availH = wrapH - HEAD_SPACE;
  if(availH <= 0) return;
  if(gridW <= wrapW && gridH <= availH) return;
  const scale = Math.min(wrapW / gridW, availH / gridH, 1);
  grid.style.transform = 'scale(' + scale + ')';
  grid.style.transformOrigin = 'bottom center';
}

/* ===== 地塊 ===== */
function _gardenGetPlots(){
  if(!state.garden || typeof state.garden !== 'object') state.garden = {plots:new Array(20).fill(null), storage:{}};
  if(!Array.isArray(state.garden.plots)) state.garden.plots = new Array(20).fill(null);
  while(state.garden.plots.length < 20) state.garden.plots.push(null);
  if(state.garden.plots.length > 20) state.garden.plots.length = 20;
  if(typeof state.garden.currentSoilType !== 'string' || !_isSoilType(state.garden.currentSoilType)){
    let _inferred = 'soil';
    for(const _p of state.garden.plots){
      if(_p && _isSoilType(_p.type)){ _inferred = _p.type; break; }
    }
    state.garden.currentSoilType = _inferred;
  }
  return state.garden.plots;
}

function _gardenSweep(now){
  const plots = _gardenGetPlots();
  let dirty = false;
  for(let i = 0; i < plots.length; i++){
    const plot = plots[i];
    if(!plot || !plot.crop) continue;
    const c = plot.crop;
    const seed = SEEDS[c.seedId];
    if(!seed){ plot.crop = null; dirty = true; continue; }
    if(c.cleanupUntil && now >= c.cleanupUntil){
      plot.crop = null;
      dirty = true;
      continue;
    }
    if(!c.cleanupUntil){
      const rottenAt = c.matureAt + seed.rotMs;
      if(now >= rottenAt + seed.autoCleanMs){
        c.cleanupUntil = now + seed.cleanupMs;
        dirty = true;
      }
    }
  }
  return dirty;
}

/* ===== 儲備腐爛檢查（作物 → 堆肥/種子；種子 48h 過期） ===== */
function _gardenFoodTtlMs(){
  if(_gardenHasPlotType('fridge')) return 48 * 3600 * 1000;
  return 24 * 3600 * 1000;
}

function _gardenStorageRotCheck(){
  if(!state.garden) return { changed: false, report: null };
  if(!state.garden.storageBatches || typeof state.garden.storageBatches !== 'object') state.garden.storageBatches = {};
  const g = _gardenMerchantInit();
  if(typeof g.compostValue !== 'number'){ g.compostValue = (typeof g.compostAccelSec === 'number') ? g.compostAccelSec : 0; delete g.compostAccelSec; }
  const storage = _gardenStorageInit();
  const hasCompost = _gardenHasPlotType('compost');
  const ttl = _gardenFoodTtlMs();
  const now = Date.now();
  const seedsToAdd = [];
  const report = { rotted: 0, composted: 0, seeds: 0, accelSec: 0 };
  let changed = false;
  for(const _sk in storage){
    if(storage[_sk] <= 0) continue;
    const _sp = _sk.split('@');
    const _id = _sp[0];
    const _isCrop = (typeof CROPS !== 'undefined' && CROPS[_id]);
    const _isSeed = (typeof SEEDS !== 'undefined' && SEEDS[_id]);
    if(!_isCrop && !_isSeed) continue;
    const _cur = state.garden.storageBatches[_sk];
    if(!Array.isArray(_cur) || !_cur.length){
      state.garden.storageBatches[_sk] = [{ count: storage[_sk], addedAt: _isSeed ? now : 0 }];
      changed = true;
    }
  }
  for(const k in state.garden.storageBatches){
    const batches = state.garden.storageBatches[k];
    if(!Array.isArray(batches) || !batches.length){ delete state.garden.storageBatches[k]; continue; }
    const parts = k.split('@');
    const itemId = parts[0], rar = parts[1];
    const _isCrop = (typeof CROPS !== 'undefined' && CROPS[itemId]);
    const _isSeed = (typeof SEEDS !== 'undefined' && SEEDS[itemId]);
    if(!_isCrop && !_isSeed){ delete state.garden.storageBatches[k]; continue; }
    const keep = [];
    let removed = 0;
    if(_isSeed){
      for(const b of batches){
        if(now - b.addedAt < GARDEN_SEED_ROT_MS){ keep.push(b); continue; }
        removed += b.count;
      }
    } else {
      for(const b of batches){
        if(now - b.addedAt < ttl){ keep.push(b); continue; }
        removed += b.count;
        report.rotted += b.count;
        if(hasCompost){
          const fv = cropFoodValue(itemId, rar) * b.count;
          const accel = fv * 0.25;
          g.compostValue = (g.compostValue || 0) + accel;
          report.accelSec = (report.accelSec || 0) + accel;
          report.composted += b.count;
          let sid = null;
          for(const sk in SEEDS){ if(SEEDS[sk].cropId === itemId){ sid = sk; break; } }
          if(sid){
            let seedCount = 0;
            for(let i = 0; i < b.count; i++){ if(Math.random() < 0.2) seedCount++; }
            if(seedCount > 0){ seedsToAdd.push({ id: sid, rarity: rar, count: seedCount }); report.seeds += seedCount; }
          }
        }
      }
    }
    if(removed > 0){
      const cur = storage[k] || 0;
      const nv = Math.max(0, cur - removed);
      if(nv <= 0) delete storage[k]; else storage[k] = nv;
      changed = true;
    }
    if(keep.length) state.garden.storageBatches[k] = keep;
    else delete state.garden.storageBatches[k];
  }
  for(const sa of seedsToAdd){ gardenStorageAdd(sa.id, sa.rarity, sa.count); }
  if(changed){ save(); }
  return { changed: changed, report: report };
}

function _gardenCropStatus(plot, now){
  if(!plot || !plot.crop) return null;
  const c = plot.crop;
  const seed = SEEDS[c.seedId];
  if(!seed) return null;
  const cropDef = CROPS[seed.cropId];
  if(!cropDef) return null;
  const base = { seedId: c.seedId, cropId: seed.cropId, cropName: cropDef.name, cropIcon: cropDef.icon, rarity: c.rarity };
  if(c.cleanupUntil && c.cleanupUntil > 0){
    return Object.assign({}, base, { status: 'cleaning', remaining: Math.max(0, Math.ceil((c.cleanupUntil - now) / 1000)) });
  }
  if(now < c.matureAt){
    return Object.assign({}, base, { status: 'growing', remaining: Math.max(0, Math.ceil((c.matureAt - now) / 1000)) });
  }
  const rottenAt = c.matureAt + seed.rotMs;
  if(now < rottenAt){
    return Object.assign({}, base, { status: 'mature' });
  }
  return Object.assign({}, base, { status: 'rotten' });
}

function renderGardenGrid(){
  const p = document.getElementById('garden-page');
  if(!p) return;
  const grid = p.querySelector('#gp-grid');
  if(!grid) return;
  const now = Date.now();
  _gardenSweep(now);
  const plots = _gardenGetPlots();
  let html = '';
  for(let i = 0; i < 20; i++){
    const plot = plots[i];
    if(plot && plot.broken){
      html += '<div class="gp-plot broken" data-type="broken" data-idx="' + i + '"><div class="gp-plot-icon" style="color:#e05252;font-weight:bold;font-size:22px">✖</div><div class="gp-plot-lbl">損壞</div></div>';
      continue;
    }
    if(plot && plot.type){
      const t = GARDEN_PLOT_TYPES[plot.type] || {name:'?', icon:'?'};
      const isSoil = _isSoilType(plot.type);
      const st = (isSoil && plot.crop) ? _gardenCropStatus(plot, now) : null;
      if(st){
        let icon = t.icon, lbl = t.name, extraCls = '';
        if(st.status === 'growing'){ icon = cropStageImgHtml(st.cropId, 'sprout', 52); lbl = st.remaining + 's'; }
        else if(st.status === 'mature'){ icon = cropStageImgHtml(st.cropId, 'mature', 52); lbl = '成熟'; extraCls = ' mature'; }
        else if(st.status === 'rotten'){ icon = cropStageImgHtml(st.cropId, 'rotten', 52); lbl = '腐爛'; extraCls = ' rotten'; }
        else if(st.status === 'cleaning'){ icon = '🧹'; lbl = st.remaining + 's'; extraCls = ' cleaning'; }
        html += '<div class="gp-plot built' + extraCls + '" data-type="' + plot.type + '" data-idx="' + i + '">' + (plot.fertilized ? '<div class="gp-fert-mark">💩</div>' : '') + '<div class="gp-plot-icon">' + icon + '</div><div class="gp-plot-lbl">' + lbl + '</div></div>';
      } else if(isSoil || t.bg){
        html += '<div class="gp-plot built" data-type="' + plot.type + '" data-idx="' + i + '"><div class="gp-plot-lbl">' + t.name + '</div></div>';
      } else {
        html += '<div class="gp-plot built" data-type="' + plot.type + '" data-idx="' + i + '"><div class="gp-plot-icon">' + t.icon + '</div><div class="gp-plot-lbl">' + t.name + '</div></div>';
      }
    } else {
      html += '<div class="gp-plot empty" data-idx="' + i + '"></div>';
    }
  }
  grid.innerHTML = html;
  const tiles = grid.querySelectorAll('.gp-plot');
  for(let i = 0; i < tiles.length; i++){
    (function(el){
      el.onclick = function(){ onGardenPlotClick(parseInt(el.getAttribute('data-idx'), 10)); };
    })(tiles[i]);
  }
  if(typeof _fitGardenGrid === "function") requestAnimationFrame(_fitGardenGrid);
}

function onGardenPlotClick(idx){
  const plots = _gardenGetPlots();
  const plot = plots[idx];
  if(plot && plot.broken){ _gardenRepairConfirm(idx); return; }
  if(!plot){ openGardenPlotPicker(idx); return; }
  if(_isSoilType(plot.type)){ openGardenSoilAction(idx); }
  else if(plot.type === 'tower'){ _gardenTowerOpen(idx); }
  else if(plot.type === 'compost'){ openCompostDetail(idx); }
  else if(plot.type === 'distillery'){ openDistilleryDetail(idx); }
  else { openGardenPlotDetail(idx); }
}

function _gardenEnsureStyles(){
  /* rev-fix-garden-injured-styles: 独立于车站，花园打开时就有 */
  if(document.getElementById('garden-injured-styles')) return;
  const st = document.createElement('style');
  st.id = 'garden-injured-styles';
  /* rev-fix-servant-tab-injured: 加上 .gs-cell.srv.cant-go */
  st.textContent = '.tower-guard-btn.cant-go{filter:grayscale(1);opacity:0.45;position:relative}.tower-guard-btn.cant-go::after{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(to top right,transparent calc(50% - 0.5px),rgba(255,255,255,0.55) 50%,transparent calc(50% + 0.5px)),linear-gradient(to top left,transparent calc(50% - 0.5px),rgba(255,255,255,0.55) 50%,transparent calc(50% + 0.5px))}'
    + '.gs-cell.srv.cant-go{filter:grayscale(1);opacity:0.45;position:relative}'
    + '.gs-cell.srv.cant-go::after{content:"";position:absolute;inset:0;pointer-events:none;z-index:5;background:linear-gradient(to top right,transparent calc(50% - 0.5px),rgba(255,255,255,0.55) 50%,transparent calc(50% + 0.5px)),linear-gradient(to top left,transparent calc(50% - 0.5px),rgba(255,255,255,0.55) 50%,transparent calc(50% + 0.5px))}';
  document.head.appendChild(st);
}

function _gardenPlotOwnersHtml(idx, type){
  _gardenEnsureStyles();
  const servants = (state.servants || []).filter(function(s){
    return s.type === type && s.assignedPlots && s.assignedPlots.indexOf(idx) !== -1;
  });
  const labelMap = { farmer: '責任農民', foreman: '責任監工', guard: '駐守守衛' };
  const label = labelMap[type] || '責任人';
  const emptyLabelMap = { farmer: '指派農民', foreman: '指派監工', guard: '指派守衛' };
  const emptyLabel = emptyLabelMap[type] || '指派';
  let html = '<div style="font-size:11px;color:#e8a33d;font-weight:bold;margin:8px 0 4px">' + label + '</div>';
  if(!servants.length){
    html += '<div class="owner-empty" data-assign-idx="' + idx + '" data-assign-type="' + type + '">＋ ' + emptyLabel + '</div>';
    return html;
  }
  for(const s of servants){
    const _img = 'icons/servants/' + s.type + '.png' + assetSuffix();
    const effMax = servantEffectiveMaxStamina(s);
    const stam = Math.max(0, s.stamina || 0);
    const pct = effMax > 0 ? Math.round((stam / effMax) * 100) : 0;
    const color = pct <= 0 ? '#e05252' : (pct <= 30 ? '#e8741e' : (pct <= 70 ? '#e8a33d' : '#4caf50'));
    const tDef = SERVANT_TYPES[s.type] || {name:''};
    html += '<div class="owner-row">';
    /* rev-fix-guard-card-injured: 守衛重傷時加 cant-go */
    const _isInjured = !!(s.injuredUntil && s.injuredUntil > Date.now());
    html += '<div class="tower-guard-btn' + (_isInjured ? ' cant-go' : '') + '" data-srv-id="' + s.id + '" data-plot-idx="' + idx + '" style="background:' + rarityBg(s.rarity) + '">';
    html += '<img class="tg-icon" src="' + _img + '" alt="">';
    html += '<div class="tg-name">' + servantLabel(s) + '</div>';
    html += '</div>';
    html += '<div class="owner-info">';
    html += '<div class="owner-line"><span class="' + rarityClass(s.rarity) + '">Lv.' + s.lv + ' ' + tDef.name + '</span></div>';
    html += '<div class="owner-stam-bar"><div class="owner-stam-fill" style="width:' + pct + '%;background:' + color + '"></div></div>';
    html += '<div class="owner-stam-text" style="color:' + color + '">體力 ' + stam + ' / ' + effMax + '</div>';
    /* rev-fix-guard-hp-bar-v5: 只对守卫显示 HP 条 */
    if(type === 'guard'){
      const _maxHp2 = (typeof servantMaxHp === 'function') ? servantMaxHp(s) : (s.hp || 100);
      const _curHp2 = _isInjured ? 0 : _maxHp2;
      const _hpPct2 = _isInjured ? 0 : 100;
      const _hpCol2 = _isInjured ? '#e05252' : '#4caf50';
      html += '<div class="owner-stam-bar" style="margin-top:2px"><div class="owner-stam-fill" style="width:' + _hpPct2 + '%;background:' + _hpCol2 + '"></div></div>';
      html += '<div class="owner-stam-text" style="color:' + _hpCol2 + '">' + (_isInjured ? '<span style="color:#e8a33d;font-weight:bold">治療</span> · ' : '') + 'HP ' + _curHp2 + '/' + _maxHp2 + '</div>';
    }
    html += '</div>';
    html += '</div>';
  }
  return html;
}

function _gardenPickServantForPlot(idx, type){
  const all = (state.servants || []).filter(function(s){ return s.type === type; }).sort(function(a, b){
    const aAs = (a.assignedPlots && a.assignedPlots.length > 0) ? 1 : 0;
    const bAs = (b.assignedPlots && b.assignedPlots.length > 0) ? 1 : 0;
    if(aAs !== bAs) return bAs - aAs;
    if((b.lv || 1) !== (a.lv || 1)) return (b.lv || 1) - (a.lv || 1);
    const ra = sortByRarityDesc(a, b);
    if(ra !== 0) return ra;
    return servantLabel(a).localeCompare(servantLabel(b), 'zh-Hant');
  });
  const tDef = SERVANT_TYPES[type] || {name:'僕人'};
  const _targetPlot = _gardenGetPlots()[idx];
  const _isExclusiveList = !!(_targetPlot && (_targetPlot.type === 'compost' || _targetPlot.type === 'distillery'));
  let body = '';
  if(!all.length){
    body = '<div class="empty-hint">沒有可用的' + tDef.name + '</div>';
  } else {
    for(const s of all){
      const maxSlots = servantSlots(s.rarity, s.type);
      const cur = (s.assignedPlots || []).length;
      const isFull = cur >= maxSlots;
      const alreadyHere = (s.assignedPlots || []).indexOf(idx) !== -1;
      const _inStn = _isServantInStation(s.id);
      const _img = 'icons/servants/' + s.type + '.png' + assetSuffix();
      const dis = alreadyHere || (isFull && !_isExclusiveList);
      const _stnMark = _inStn ? ' 🚂工作中' : '';
      body += '<div class="item-row' + (dis ? ' disabled' : '') + '" data-sid="' + s.id + '"' + (dis ? ' style="opacity:.4"' : '') + '>';
      body += '<div class="icon" style="background:' + rarityBg(s.rarity) + '"><img src="' + _img + '" style="width:100%;height:100%;object-fit:contain"></div>';
      body += '<div class="info"><div class="nm ' + rarityClass(s.rarity) + '">' + servantLabel(s) + _stnMark + '</div>';
      body += '<div class="sub">Lv.' + s.lv + ' · ' + cur + '/' + maxSlots + ' 格' + (alreadyHere ? ' · 已在此地塊' : (isFull ? ' · 已滿' : '')) + '</div></div>';
      body += '</div>';
    }
  }
  const bd = openModal({ title: '指派' + tDef.name + '至 ' + plotCoordName(idx), body: body });
  const rows = bd.querySelectorAll('.item-row[data-sid]');
  for(let i = 0; i < rows.length; i++){
    (function(row){
      row.onclick = function(){
        const sid = row.getAttribute('data-sid');
        const srv = (state.servants || []).find(function(s){ return s.id === sid; });
        if(!srv) return;
        const _proceedAssign = function(){
          const plots = _gardenGetPlots();
          const targetPlot = plots[idx];
          if(!targetPlot) return;
          const isExclusiveTarget = (targetPlot.type === 'compost' || targetPlot.type === 'distillery');
          const _targetLabel = targetPlot.type === 'distillery' ? '蒸餾室' : '堆肥區';
          const otherList = (srv.assignedPlots || []).filter(function(x){ return x !== idx; });
          const hasExclusiveAlready = otherList.some(function(x){ return plots[x] && (plots[x].type === 'compost' || plots[x].type === 'distillery'); });
          function doAssign(){
            const maxSlots = servantSlots(srv.rarity, srv.type);
            if((srv.assignedPlots || []).length >= maxSlots){
              const _noUse = true;
            }
            for(const o of (state.servants || [])){
              if(o.id === sid) continue;
              if(!Array.isArray(o.assignedPlots)) continue;
              o.assignedPlots = o.assignedPlots.filter(function(x){ return x !== idx; });
            }
            if(isExclusiveTarget){
              srv.assignedPlots = [idx];
            } else {
              for(var _oi2 = 0; _oi2 < otherList.length; _oi2++){
              var _oldIdx2 = otherList[_oi2];
              if(_oldIdx2 !== idx && plots[_oldIdx2] && (plots[_oldIdx2].type === 'compost' || plots[_oldIdx2].type === 'distillery') && plots[_oldIdx2].assignedServant === sid){
                delete plots[_oldIdx2].assignedServant;
              }
            }
            srv.assignedPlots = otherList.filter(function(x){ return plots[x] && plots[x].type !== 'compost' && plots[x].type !== 'distillery'; });
              if(srv.assignedPlots.indexOf(idx) === -1) srv.assignedPlots.push(idx);
            }
            if(plots[idx]) plots[idx].assignedServant = sid;
            save();
            closeModal();
            renderGardenGrid();
            if(typeof _gardenSyncActors === 'function') _gardenSyncActors();
            if(typeof _refreshServantListNow === 'function') _refreshServantListNow();
            setTimeout(function(){ if(typeof onGardenPlotClick === 'function') onGardenPlotClick(idx); }, 100);
          }
          if(isExclusiveTarget && otherList.length > 0){
            openConfirm('指派至' + _targetLabel + '將解除此農民的其他 ' + otherList.length + ' 個地塊綁定。確認？', doAssign);
            return;
          }
          if(!isExclusiveTarget && hasExclusiveAlready){
            openConfirm('此農民已在蒸餾室/堆肥區，指派至其他地塊將解除綁定。確認？', doAssign);
            return;
          }
          doAssign();
        };
        const _inStn = _isServantInStation(sid);
        if(_inStn){
          const ft = document.createElement('div');
          ft.className = 'modal-ft';
          ft.innerHTML = '<button class="btn primary" id="gr-ok">確認</button>';
          openModal({
            title: '轉移至後院',
            body: '<div style="font-size:12px;line-height:1.6;color:#ddd">此僕人正在車站服役，是否轉至後院？將從車站移除。</div>',
            footer: ft,
            onClose: function(){
              closeModal();
              setTimeout(function(){ _gardenPickServantForPlot(idx, type); }, 50);
            }
          });
          ft.querySelector('#gr-ok').onclick = function(){
            _removeFromStation(sid);
            closeModal();
            _proceedAssign();
          };
        } else {
          _proceedAssign();
        }
      };
    })(rows[i]);
  }
}

function _gardenPlotOwnersBind(bd){
  /* rev-fix-guard-heal-v4: 重伤守卫整个 owner-info 可点 */
  const _ownerInfos = bd.querySelectorAll('.owner-info');
  for(let _hi = 0; _hi < _ownerInfos.length; _hi++){
    (function(_oi){
      const _row = _oi.closest('.owner-row');
      if(!_row) return;
      const _btn = _row.querySelector('.tower-guard-btn[data-srv-id]');
      if(!_btn) return;
      const _sid = _btn.getAttribute('data-srv-id');
      const _plotIdx = parseInt(_btn.getAttribute('data-plot-idx'), 10);
      const _srv = (state.servants || []).find(function(s){ return s.id === _sid; });
      if(!_srv) return;
      const _isInjuredNow = !!(_srv.injuredUntil && _srv.injuredUntil > Date.now());
      if(!_isInjuredNow) return;
      _oi.style.cursor = 'pointer';
      _oi.onclick = function(e){
        if(e && e.stopPropagation) e.stopPropagation();
        if(typeof _stConsumeLowestMed !== 'function') return;
        const _med = _stConsumeLowestMed();
        if(!_med){
          if(typeof notify === 'function') notify('沒有醫療品', 'warn');
          return;
        }
        _srv.injuredUntil = 0;
        _srv._injuredDown = false;
        _srv.hp = (typeof servantMaxHp === 'function') ? servantMaxHp(_srv) : (_srv.hp || 100);
        if(_srv._injuredAnimStart) _srv._injuredAnimStart = null;
        save();
        if(typeof _refreshServantListNow === 'function') _refreshServantListNow();
        renderGardenGrid();
        closeModal();
        if(isFinite(_plotIdx) && _plotIdx >= 0){
          setTimeout(function(){ _gardenTowerOpen(_plotIdx); }, 50);
        }
      };
    })(_ownerInfos[_hi]);
  }
  const btns = bd.querySelectorAll('.tower-guard-btn[data-srv-id]');
  for(let i = 0; i < btns.length; i++){
    (function(el){
      el.onclick = function(){
        const sid = el.getAttribute('data-srv-id');
        const _pIdx = parseInt(el.getAttribute('data-plot-idx'), 10);
        closeModal();
        const _returnFn = (isFinite(_pIdx) && _pIdx >= 0) ? function(){ onGardenPlotClick(_pIdx); } : null;
        setTimeout(function(){ openServantDetail(sid, _returnFn); }, 200);
      };
    })(btns[i]);
  }
  const emptyBtns = bd.querySelectorAll('.owner-empty[data-assign-idx]');
  for(let i = 0; i < emptyBtns.length; i++){
    (function(el){
      el.onclick = function(){
        const idx = parseInt(el.getAttribute('data-assign-idx'), 10);
        const type = el.getAttribute('data-assign-type');
        closeModal();
        setTimeout(function(){ _gardenPickServantForPlot(idx, type); }, 100);
      };
    })(emptyBtns[i]);
  }
}

function _gardenHasPlotType(type){
  const plots = _gardenGetPlots();
  for(let i = 0; i < plots.length; i++){
    if(plots[i] && plots[i].type === type) return true;
  }
  return false;
}

function openGardenPlotPicker(idx, returnFn){
  const plots = _gardenGetPlots();
  const body = document.createElement('div');
  body.innerHTML = '<div style="font-size:11px;color:#e8a33d;margin-bottom:8px">選擇要建造的設施</div>';
  const _UNIQUE_TYPES = { compost: true, shed: true };
  for(const key in GARDEN_PLOT_TYPES){
    const t = GARDEN_PLOT_TYPES[key];
    if(t.special) continue;
    if(_UNIQUE_TYPES[key] && _gardenHasPlotType(key)) continue;
    const row = document.createElement('div');
    row.className = 'item-row';
    row.setAttribute('data-type', key);
    const _iconHtml = _getPlotTypeIconHtml(key, 28);
    row.innerHTML = '<div class="icon" style="font-size:20px">' + _iconHtml + '</div><div class="info"><div class="nm">' + t.name + '</div><div class="sub">' + t.desc + '</div></div>';
    body.appendChild(row);
  }
  const _pickerOnClose = (typeof returnFn === 'function') ? returnFn : closeModal;
  const bd = openModal({ title: plotCoordName(idx) + ' · 建造', body: body, onClose: _pickerOnClose });
  const rows = bd.querySelectorAll('.item-row[data-type]');
  for(let i = 0; i < rows.length; i++){
    (function(row){
      row.onclick = function(){
        const type = row.getAttribute('data-type');
        if(!GARDEN_PLOT_TYPES[type]) return;
        let _actualType = type;
        if(type === 'soil'){
          _actualType = state.garden.currentSoilType || 'soil';
        }
        plots[idx] = { type: (_actualType === 'soil' ? (state.garden.currentSoilType || 'soil') : _actualType), lv: 1, crop: null };
        if(_actualType === 'distillery') plots[idx].lastDistillAt = Math.floor(Date.now() / DISTILL_PERIOD_MS) * DISTILL_PERIOD_MS;
        save();
        closeModal();
        renderGardenGrid();
      };
    })(rows[i]);
  }
}

function openGardenSoilAction(idx){
  const plots = _gardenGetPlots();
  const plot = plots[idx];
  if(!plot || !_isSoilType(plot.type)) return;
  const now = Date.now();
  _gardenSweep(now);
  const st = _gardenCropStatus(plot, now);
  if(!st){
    openGardenSeedPickerWithRemove(idx);
    return;
  }
  openGardenCropDetailWithRemove(idx, st);
}

function openGardenSeedPickerWithRemove(idx, returnFn){
  const plots = _gardenGetPlots();
  const plot = plots[idx];
  if(!plot) return;
  const storage = _gardenStorageInit();
  const list = [];
  for(const k in storage){
    const p = k.split('@');
    const id = p[0], rar = p[1];
    if(!SEEDS[id]) continue;
    const cnt = storage[k];
    if(cnt <= 0) continue;
    list.push({id: id, rarity: rar, count: cnt, def: SEEDS[id]});
  }
  list.sort(function(a, b){
    const ra = sortByRarityDesc(a, b);
    if(ra !== 0) return ra;
    return (a.def.name || '').localeCompare(b.def.name || '', 'zh-Hant');
  });
  let body = '';
  body += '<div style="display:flex;align-items:center;gap:8px;font-size:15px;color:#e8a33d;font-weight:bold"><img style="width:28px;height:28px;object-fit:contain;flex:0 0 auto" src="icons/garden/soil.png' + assetSuffix() + '" alt=""><span>土地</span>' + _gardenFertInfoHtml(plot) + '<button class="btn danger" id="soil-del" style="margin-left:auto;padding:4px 10px;font-size:11px;border-radius:5px;flex:0 0 auto">拆除</button></div>';
  body += '<div class="detail-sub">' + plotCoordName(idx) + ' · Lv.' + (plot.lv || 1) + '</div>';
  body += _gardenPlotOwnersHtml(idx, 'farmer');
  body += '<div style="font-size:11px;color:#e8a33d;font-weight:bold;margin:10px 0 4px">種植種子</div>';
  if(!list.length){
    body += '<div class="empty-hint">儲備中沒有種子</div>';
  } else {
    for(const s of list){
      const cropDef = CROPS[s.def.cropId];
      const yieldBase = Math.max(1, Math.round(s.def.baseYield * (RARITY_MULT[s.rarity] || 1)));
      body += '<div class="item-row" data-sid="' + s.id + '" data-srar="' + s.rarity + '">' +
        '<div class="icon">' + seedImgHtml(s.id, 30) + '</div>' +
        '<div class="info"><div class="nm ' + rarityClass(s.rarity) + '">' + s.def.name + '</div>' +
        '<div class="sub">' + s.rarity + ' · 生長 ' + Math.round(s.def.growMs/1000) + 's · 收穫約 ' + yieldBase + ' ' + (cropDef ? cropDef.name : '') + '</div></div>' +
        '<div class="cnt">×' + s.count + '</div></div>';
    }
  }
  const _seedOnClose = (typeof returnFn === 'function') ? returnFn : closeModal;
  const bd = openModal({ title: '土地配置', body: body, onClose: _seedOnClose });
  const _del = bd.querySelector('#soil-del');
  if(_del) _del.onclick = function(){
    plots[idx] = null;
    _clearPlotAssignments(idx);
    save(); closeModal();
    renderGardenGrid();
  };
  const _ap1 = bd.querySelector('#soil-apply');
  if(_ap1) _ap1.onclick = function(){ _openApplySpecificSoilDialog(idx); };
  const _ap = bd.querySelector('#soil-apply');
  if(_ap) _ap.onclick = function(){ closeModal(); _openApplySpecificSoilDialog(idx); };
  _gardenPlotOwnersBind(bd);
  const rows = bd.querySelectorAll('.item-row[data-sid]');
  for(let i = 0; i < rows.length; i++){
    (function(row){
      row.onclick = function(){
        const sid = row.getAttribute('data-sid');
        const srar = row.getAttribute('data-srar');
        gardenPlantSeed(idx, sid, srar);
      };
    })(rows[i]);
  }
}

function gardenPlantSeed(idx, seedId, rarity){
  const plots = _gardenGetPlots();
  const plot = plots[idx];
  if(!plot || !_isSoilType(plot.type)) return;
  if(plot.crop) return;
  const seed = SEEDS[seedId];
  if(!seed) return;
  if(!gardenStorageRemove(seedId, rarity, 1)){
    return;
  }
  const now = Date.now();
  const _sbG = _getSoilBonus(plot.type);
  const growMs = Math.max(1000, Math.round(seed.growMs * (1 - _sbG.grow)));
  plot.crop = { seedId: seedId, rarity: rarity, plantedAt: now, matureAt: now + growMs, cleanupUntil: 0 };
  plot.lastSeed = seedId;
  plot.lastRarity = rarity;
  save();
  closeModal();
  renderGardenGrid();
  renderGardenContent();
}

function _gardenFertInfoHtml(plot){
  if(!plot || !plot.fertilized || !plot.fertExpireAt) return "";
  const now = Date.now();
  if(now >= plot.fertExpireAt) return "";
  const remainMin = Math.max(1, Math.ceil((plot.fertExpireAt - now) / 60000));
  return '<span id="gp-fert-info" style="font-size:10px;color:#7ee07e;margin-left:8px;font-weight:normal">已施肥 · 約 ' + remainMin + ' 分鐘</span>';
}

function openGardenCropDetailWithRemove(idx, st, returnFn){
  const plots = _gardenGetPlots();
  const plot = plots[idx];
  if(!plot) return;
  if(window._gardenCropTimer){ clearInterval(window._gardenCropTimer); window._gardenCropTimer = null; }
  const canHarvest = (st.status === 'mature');
  const canPull = (st.status === 'growing' || st.status === 'mature');
  const canClean = (st.status === 'rotten');
  function _calcStatus(){
    const _now = Date.now();
    const _c = plot.crop;
    if(!_c) return { text: '', color: '#a89a85' };
    const _seed = SEEDS[_c.seedId];
    if(!_seed) return { text: '', color: '#a89a85' };
    if(_c.cleanupUntil && _c.cleanupUntil > 0){
      return { text: '🧹 清理中 · 剩 ' + Math.max(0, Math.ceil((_c.cleanupUntil - _now) / 1000)) + ' 秒', color: '#a89a85' };
    }
    if(_now < _c.matureAt){
      return { text: '🌱 生長中 · 剩 ' + Math.max(0, Math.ceil((_c.matureAt - _now) / 1000)) + ' 秒', color: '#a89a85' };
    }
    const _rottenAt = _c.matureAt + _seed.rotMs;
    if(_now < _rottenAt) return { text: '✅ 已成熟', color: '#4caf50' };
    return { text: '🥀 已腐爛', color: '#e05252' };
  }
  const _st0 = _calcStatus();
  let body = '';
  body += '<div style="display:flex;align-items:center;gap:8px;font-size:15px;color:#e8a33d;font-weight:bold">' + _getPlotTypeIconHtml(plot.type, 28, true) + '<span>' + ((GARDEN_PLOT_TYPES[plot.type]||{}).name || '土地') + '</span>' + _gardenFertInfoHtml(plot) + _getSpecialSoilBtnHtml(plot) + '<button class="btn danger" id="gp-act-remove" style="margin-left:auto;padding:4px 10px;font-size:11px;border-radius:5px;flex:0 0 auto">拆除</button></div>';
  body += '<div class="detail-sub">' + plotCoordName(idx) + ' · Lv.' + (plot.lv || 1) + '</div>';
  body += _gardenPlotOwnersHtml(idx, 'farmer');
  body += '<div style="font-size:11px;color:#e8a33d;font-weight:bold;margin:10px 0 4px">當前作物</div>';
  body += '<div style="display:flex;align-items:center;gap:8px;padding:8px;background:#1a1510;border:1px solid #2a231c;border-radius:5px">';
  body += '<span style="font-size:24px;line-height:1;flex:0 0 auto">' + cropImgHtml(st.cropId, 24) + '</span>';
  body += '<div style="flex:1;min-width:0">';
  body += '<div class="' + rarityClass(st.rarity) + '" style="font-size:12px;font-weight:bold">' + st.cropName + '（' + st.rarity + '）</div>';
  body += '<div id="gp-crop-status" style="font-size:10px;color:' + _st0.color + ';margin-top:2px">' + _st0.text + '</div>';
  body += '</div>';
  body += '</div>';
  body += '<div style="display:flex;align-items:center;gap:6px;margin:10px 0;flex-wrap:wrap">';
  body += '<button class="btn primary" id="gp-act-harvest" ' + (canHarvest ? '' : 'disabled') + ' style="flex:1;padding:6px 12px;font-size:11px;opacity:' + (canHarvest ? '1' : '0.4') + '">收穫</button>';
  body += '<button class="btn" id="gp-act-pull" ' + (canPull ? '' : 'disabled') + ' style="flex:1;padding:6px 12px;font-size:11px;opacity:' + (canPull ? '1' : '0.4') + '">拔除</button>';
  body += '<button class="btn" id="gp-act-clean" ' + (canClean ? '' : 'disabled') + ' style="flex:1;padding:6px 12px;font-size:11px;opacity:' + (canClean ? '1' : '0.4') + '">清理</button>';
  body += '</div>';
  const _cropOnClose = function(){ if(window._gardenCropTimer){ clearInterval(window._gardenCropTimer); window._gardenCropTimer = null; } if(typeof returnFn === 'function'){ returnFn(); } else { closeModal(); } };
  const bd = openModal({ title: '土地配置', body: body, onClose: _cropOnClose });
  window._gardenCropTimer = setInterval(function(){
    const _el = document.getElementById('gp-crop-status');
    if(!_el){ clearInterval(window._gardenCropTimer); window._gardenCropTimer = null; return; }
    const _s = _calcStatus();
    _el.textContent = _s.text;
    _el.style.color = _s.color;
    const _fe = document.getElementById('gp-fert-info');
    if(_fe){
      if(plot.fertilized && plot.fertExpireAt > Date.now()){
        _fe.textContent = '已施肥 · 約 ' + Math.max(1, Math.ceil((plot.fertExpireAt - Date.now()) / 60000)) + ' 分鐘';
      } else {
        _fe.remove();
      }
    }
  }, 1000);
  const _rm = bd.querySelector('#gp-act-remove');
  if(_rm) _rm.onclick = function(){ plots[idx] = null; _clearPlotAssignments(idx); save(); if(window._gardenCropTimer){ clearInterval(window._gardenCropTimer); window._gardenCropTimer = null; } closeModal(); renderGardenGrid(); renderGardenContent(); };
  const _hb = bd.querySelector('#gp-act-harvest');
  if(_hb && canHarvest) _hb.onclick = function(){ gardenHarvest(idx); };
  const _pb = bd.querySelector('#gp-act-pull');
  if(_pb && canPull) _pb.onclick = function(){ plot.crop = null; save(); if(window._gardenCropTimer){ clearInterval(window._gardenCropTimer); window._gardenCropTimer = null; } closeModal(); renderGardenGrid(); renderGardenContent(); };
  const _cb = bd.querySelector('#gp-act-clean');
  if(_cb && canClean) _cb.onclick = function(){ gardenCleanup(idx); };
  const _ap2 = bd.querySelector('#soil-apply');
  if(_ap2) _ap2.onclick = function(){ closeModal(); _openApplySpecificSoilDialog(idx); };
  _gardenPlotOwnersBind(bd);
}

function openGardenPlotDetail(idx, returnFn){
  const plots = _gardenGetPlots();
  const plot = plots[idx];
  if(!plot) return;
  const t = GARDEN_PLOT_TYPES[plot.type] || {name:'未知', icon:'?', desc:''};
  let body = '';
  const _tIcon = _getPlotTypeIconHtml(plot.type, 26);
  body += '<div style="display:flex;align-items:center;gap:8px;font-size:15px;color:#e8a33d;font-weight:bold">' + _tIcon + '<span>' + t.name + '</span><button class="btn danger" id="gp-del" style="margin-left:auto;padding:4px 10px;font-size:11px;border-radius:5px;flex:0 0 auto">拆除</button></div>';
  body += '<div class="detail-sub">' + plotCoordName(idx) + ' · Lv.' + (plot.lv || 1) + '</div>';
  if(plot.type === 'shed'){
    body += _gardenPlotOwnersHtml(idx, 'foreman');
  } else if(plot.type === 'compost' || plot.type === 'fridge'){
    body += '<div style="font-size:11px;color:#7a6f60;line-height:1.6;padding:8px 0">' + (t.desc || '') + '</div>';
  }
  const _plotOnClose = (typeof returnFn === 'function') ? returnFn : closeModal;
  const bd = openModal({ title: t.name, body: body, onClose: _plotOnClose });
  const _del = bd.querySelector('#gp-del');
  if(_del) _del.onclick = function(){
    plots[idx] = null;
    _clearPlotAssignments(idx);
    save(); closeModal();
    renderGardenGrid();
  };
  const _ap2 = bd.querySelector('#soil-apply');
  if(_ap2) _ap2.onclick = function(){ _openApplySpecificSoilDialog(idx); };
  _gardenPlotOwnersBind(bd);
}

function renderGardenTabs(){
  const p = document.getElementById('garden-page');
  if(!p) return;
  const tabEls = p.querySelectorAll('.gp-tab');
  for(let i = 0; i < tabEls.length; i++){
    const el = tabEls[i];
    if(el.getAttribute('data-tab') === _gardenActiveTab){ el.classList.add('on'); }
    else { el.classList.remove('on'); }
  }
}

function renderGardenContent(){
  const p = document.getElementById('garden-page');
  if(!p) return;
  const box = p.querySelector('#gp-content');
  if(!box) return;
  if(_gardenActiveTab === 'storage'){ renderGardenStorage(box); }
  else if(_gardenActiveTab === 'merchant'){ renderGardenMerchant(box); }
  else if(_gardenActiveTab === 'servant'){ renderGardenServants(box); }
  else if(_gardenActiveTab === 'log'){ renderGardenLog(box); }
}

/* ===== 儲備格 ===== */
function _gardenComputeCellSize(box, cols){
  cols = cols || 1;
  const boxW = (box && box.clientWidth) ? box.clientWidth : 240;
  const colW = Math.max(40, Math.floor(boxW / cols));
  const wrapW = Math.max(30, colW - 6 - 6);
  const colGap = 8;
  let cellSize = Math.floor((wrapW - 3 * colGap) / 4);
  if(cellSize < 14) cellSize = 14;
  return cellSize;
}

function _gsBlockEx(title, colKey, items, minCells, fallbackIcon, cellSize, fontStyle){
  const total = Math.max(minCells, items.length);
  const rowsCount = Math.ceil(total / 4);
  const cellStyle = 'width:' + cellSize + 'px;height:' + cellSize + 'px;min-width:' + cellSize + 'px;min-height:' + cellSize + 'px;flex:0 0 auto;';
  let html = '<div class="gs-col">';
  if(title) html += '<div class="gs-title">' + title + '</div>';
  html += '<div class="gs-wrap" data-col="' + colKey + '">';
  for(let r = 0; r < rowsCount; r++){
    html += '<div class="gs-row">';
    for(let j = 0; j < 4; j++){
      const idx = r * 4 + j;
      if(idx < total){
        const it = items[idx];
        if(it){
          const icon = (typeof _gardenStorageItemIcon === 'function')
            ? _gardenStorageItemIcon(it.id, Math.floor(cellSize * 0.7), fallbackIcon || (it.def && it.def.icon) || '?')
            : ((typeof SEEDS !== 'undefined' && SEEDS[it.id]) ? seedImgHtml(it.id, Math.floor(cellSize * 0.7)) : ((typeof CROPS !== 'undefined' && CROPS[it.id]) ? cropImgHtml(it.id, Math.floor(cellSize * 0.7)) : (fallbackIcon || (it.def && it.def.icon) || '?')));
          html += '<div class="gs-cell filled" data-id="' + it.id + '" data-rar="' + it.rarity + '" style="background:' + rarityBg(it.rarity) + ';' + cellStyle + fontStyle + '">' +
            '<div class="gs-cell-icon">' + icon + '</div>' +
            '<div class="gs-cell-cnt">' + it.count + '</div>' +
            '</div>';
        } else {
          html += '<div class="gs-cell empty" style="' + cellStyle + '"></div>';
        }
      } else {
        html += '<div class="gs-cell placeholder" style="' + cellStyle + '"></div>';
      }
    }
    html += '</div>';
  }
  html += '</div></div>';
  return html;
}

function renderGardenStorage(box){
  if(!box) return;
  const storage = _gardenStorageInit();
  const seeds = [], crops = [];
  for(const k in storage){
    const p = k.split('@');
    const id = p[0], rar = p[1];
    const cnt = storage[k];
    if(cnt <= 0) continue;
    const kind = (typeof _gardenStorageKind === 'function') ? _gardenStorageKind(id) : null;
    if(kind === 'seed'){
      seeds.push({id: id, rarity: rar, count: cnt, def: SEEDS[id]});
    } else if(kind === 'crop'){
      const _def = CROPS[id] || (typeof GARDEN_EXTRAS !== 'undefined' && GARDEN_EXTRAS[id]) || { name: id };
      crops.push({id: id, rarity: rar, count: cnt, def: _def});
    }
  }
  const sortFn = function(a, b){
    const ra = sortByRarityDesc(a, b);
    if(ra !== 0) return ra;
    return (a.def.name || '').localeCompare(b.def.name || '', 'zh-Hant');
  };
  seeds.sort(sortFn); crops.sort(sortFn);
  const MIN_CELLS = 16;
  function _draw(){
    const cellSize = _gardenComputeCellSize(box, 2);
    const cellStyle = 'width:' + cellSize + 'px;height:' + cellSize + 'px;min-width:' + cellSize + 'px;min-height:' + cellSize + 'px;flex:0 0 auto;';
    const fontStyle = 'font-size:' + Math.floor(cellSize * 0.5) + 'px;';
    const prevSeeds = (typeof window._gsScrollSeeds === 'number') ? window._gsScrollSeeds : 0;
    const prevCrops = (typeof window._gsScrollCrops === 'number') ? window._gsScrollCrops : 0;
    let html = '<div class="gs-cols">';
    html += _gsBlockEx('', 'seeds', seeds, MIN_CELLS, '🌰', cellSize, fontStyle);
    html += _gsBlockEx('', 'crops', crops, MIN_CELLS, null, cellSize, fontStyle);
    html += '</div>';
    box.innerHTML = html;
    { const _w = box.querySelector('.gs-wrap[data-col="seeds"]');
      if(_w){ _w.scrollTop = prevSeeds; _w.onscroll = function(){ window._gsScrollSeeds = _w.scrollTop; }; }
    }
    { const _w = box.querySelector('.gs-wrap[data-col="crops"]');
      if(_w){ _w.scrollTop = prevCrops; _w.onscroll = function(){ window._gsScrollCrops = _w.scrollTop; }; }
    }
    const cells = box.querySelectorAll('.gs-cell[data-id]');
    for(let i = 0; i < cells.length; i++){
      (function(el){
        el.onclick = function(){
          openGardenStorageDetail(el.getAttribute('data-id'), el.getAttribute('data-rar'));
        };
      })(cells[i]);
    }
  }
  let _tries = 0;
  function _retry(){
    if(!box.isConnected) return;
    if(box.clientWidth < 40){
      _tries++;
      if(_tries > 60) return;
      requestAnimationFrame(_retry);
      return;
    }
    _draw();
  }
  _retry();
}

/* ===== 僕人 ===== */
/* ===== 僕人工作狀態判定 ===== */
function _isServantWorking(s){
  return !!(s && s.assignedPlots && s.assignedPlots.length > 0);
}

function renderGardenServants(box){
  if(!box) return;
  const servants = (state.servants || []).slice().sort(function(a, b){
    const wa = _isServantWorking(a) ? 1 : 0;
    const wb = _isServantWorking(b) ? 1 : 0;
    if(wb !== wa) return wb - wa;
    if(b.lv !== a.lv) return b.lv - a.lv;
    const ra = sortByRarityDesc(a, b);
    if(ra !== 0) return ra;
    const typeOrder = ['farmer', 'guard', 'foreman'];
    return typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type);
  });
  if(!servants.length){
    box.innerHTML = '<div class="gs-cols"><div class="gs-col" style="border-left:none"><div class="gs-wrap"><div class="gs-empty" style="position:static;padding:40px 0">尚未擁有僕人</div></div></div></div>';
    return;
  }
  function _draw(){
    const cellSize = _gardenComputeCellSize(box, 1);
    const cellStyle = 'width:' + cellSize + 'px;height:' + cellSize + 'px;min-width:' + cellSize + 'px;min-height:' + cellSize + 'px;flex:0 0 auto;';
    const rows = [];
    for(let r = 0; r * 4 < servants.length; r++){
      let rowHtml = '<div class="gs-row">';
      for(let j = 0; j < 4; j++){
        const idx = r * 4 + j;
        if(idx < servants.length){
          const s = servants[idx];
          const tDef = SERVANT_TYPES[s.type] || {name:'?'};
          const _img = 'icons/servants/' + s.type + '.png' + assetSuffix();
          const _star = _isServantWorking(s) ? '<div class="srv-star">★</div>' : '';
          const _label = servantLabel(s);
          const _labelEsc = _servantEscHtml(_label);
          /* rev-fix-servant-tab-injured: 重伤守卫卡片加 cant-go */
          const _srvInjured = !!(s.injuredUntil && s.injuredUntil > Date.now());
          rowHtml += '<div class="gs-cell filled srv' + (_srvInjured ? ' cant-go' : '') + '" data-srv-id="' + s.id + '" style="background:' + rarityBg(s.rarity) + ';' + cellStyle + '">' +
            '<img class="srv-portrait" src="' + _img + '" alt="">' +
            _star +
            '<div class="srv-tag">' + _labelEsc + '</div>' +
            '<div class="gs-cell-cnt srv-cnt">Lv.' + s.lv + ' ' + tDef.name + '</div>' +
            '</div>';
        } else {
          rowHtml += '<div class="gs-cell placeholder" style="' + cellStyle + '"></div>';
        }
      }
      rowHtml += '</div>';
      rows.push(rowHtml);
    }
    let html = '<div class="gs-cols"><div class="gs-col" style="border-left:none">';
    html += '<div class="gs-wrap">' + rows.join('') + '</div>';
    html += '</div></div>';
    const prev = (typeof window._gsScrollServants === 'number') ? window._gsScrollServants : 0;
    box.innerHTML = html;
    const _w = box.querySelector('.gs-wrap');
    if(_w){
      _w.scrollTop = prev;
      _w.onscroll = function(){ window._gsScrollServants = _w.scrollTop; };
    }
    const cells = box.querySelectorAll('.gs-cell[data-srv-id]');
    for(let i = 0; i < cells.length; i++){
      (function(el){
        el.onclick = function(){ openServantDetail(el.getAttribute('data-srv-id')); };
      })(cells[i]);
    }
  }
  let _tries = 0;
  function _retry(){
    if(!box.isConnected) return;
    if(box.clientWidth < 40){
      _tries++;
      if(_tries > 60) return;
      requestAnimationFrame(_retry);
      return;
    }
    _draw();
  }
  _retry();
}

/* ===== 指派僕人（20 格勾選式） ===== */
function openServantAssign(srvId, returnFn){
  const srv = (state.servants || []).find(function(s){ return s.id === srvId; });
  if(!srv) return;
  const def = SERVANT_TYPES[srv.type];
  if(!def) return;
  const maxSlots = servantSlots(srv.rarity, srv.type);
  const plots = _gardenGetPlots();
  const selected = {};
  for(const i of (srv.assignedPlots || [])) selected[i] = true;
  function countSel(){ let n = 0; for(const k in selected) if(selected[k]) n++; return n; }
  function renderGridHtml(){
    let html = '<div class="srv-sa-info">已選 <span id="srv-sel-cnt">' + countSel() + '</span> / ' + maxSlots + ' 格</div>';
    html += '<div class="srv-sa-grid">';
    for(let i = 0; i < 20; i++){
      const plot = plots[i];
      let cls = 'srv-sa-cell';
      let inner = '';
      let disabled = false;
      if(!plot || !plot.type){
        cls += ' empty'; inner = '<div class="srv-sa-icon">＋</div>'; disabled = true;
      } else if(srv.type === 'farmer' ? !(plot.type === 'compost' || plot.type === 'distillery' || _isSoilType(plot.type)) : (plot.type !== def.targetPlot)){
        cls += ' mismatch';
        inner = '<div class="srv-sa-icon">' + _getPlotTypeIconHtml(plot.type, 22, false, true) + '</div>'; disabled = true;
      } else {
        const owner = plot.assignedServant;
        if(selected[i]) cls += ' selected';
        if(owner && owner !== srvId) cls += ' occupied';
        inner = '<div class="srv-sa-icon">' + _getPlotTypeIconHtml(plot.type, 22, false, true) + '</div>';
        if(owner && owner !== srvId){
          const otherSrv = (state.servants || []).find(function(s){ return s.id === owner; });
          if(otherSrv){
            inner += '<div class="srv-sa-owner">' + servantLabel(otherSrv) + '</div>';
          }
        }
      }
      html += '<div class="' + cls + '" data-idx="' + i + '"' + (disabled ? ' data-disabled="1"' : '') + '>' + inner + '</div>';
    }
    html += '</div>';
    return html;
  }
  function applyAndSave(){
    const newList = [];
    for(const k in selected) if(selected[k]) newList.push(parseInt(k, 10));
    const _plots = _gardenGetPlots();
    const _exclusiveIdxs = newList.filter(function(x){ return _plots[x] && (_plots[x].type === 'compost' || _plots[x].type === 'distillery'); });
    let _finalList = newList;
    if(_exclusiveIdxs.length > 1){
      _finalList = [_exclusiveIdxs[_exclusiveIdxs.length - 1]];
    } else if(_exclusiveIdxs.length === 1){
      _finalList = [_exclusiveIdxs[0]];
    }
    for(const other of (state.servants || [])){
      if(other.id === srvId) continue;
      if(!Array.isArray(other.assignedPlots)) continue;
      other.assignedPlots = other.assignedPlots.filter(function(x){ return _finalList.indexOf(x) === -1; });
    }
    const oldList = srv.assignedPlots || [];
    for(const oldIdx of oldList){
      if(_finalList.indexOf(oldIdx) === -1){
        const p2 = plots[oldIdx];
        if(p2 && p2.assignedServant === srvId) delete p2.assignedServant;
      }
    }
    for(const newIdx of _finalList){
      if(plots[newIdx]) plots[newIdx].assignedServant = srvId;
    }
    srv.assignedPlots = _finalList;
    save();
    renderGardenGrid();
    if(typeof _refreshServantListNow === 'function') _refreshServantListNow();
  }
  const ft = document.createElement('div');
  ft.className = 'modal-ft';
  ft.innerHTML = '';
  const bd = openModal({
    title: '指派 ' + def.name,
    body: renderGridHtml(),
    footer: ft,
    onClose: function(){ openServantDetail(srvId, returnFn); }
  });
  function bindCells(){
    const cells = bd.querySelectorAll('.srv-sa-cell');
    for(let i = 0; i < cells.length; i++){
      (function(el){
        el.onclick = function(){
          if(el.getAttribute('data-disabled') === '1') return;
          const idx = parseInt(el.getAttribute('data-idx'), 10);
          const plot = plots[idx];
          if(!plot) return;
          if(selected[idx]){ delete selected[idx]; applyAndSave(); refresh(); return; }
          if(countSel() >= maxSlots){ return; }
          const _isExclusive = function(p){ return p && (p.type === 'compost' || p.type === 'distillery'); };
          const _wouldBeExclusive = _isExclusive(plot);
          const owner = plot.assignedServant;
          const _ownerConflict = (owner && owner !== srvId);
          if(_wouldBeExclusive){
            const _doAddExclusive = function(){
              for(const _k in selected) delete selected[_k];
              selected[idx] = true;
              applyAndSave(); refresh();
            };
            if(_ownerConflict){
              openConfirm('此格已被其他僕人指派，是否取代？', _doAddExclusive);
              return;
            }
            _doAddExclusive();
            return;
          }
          let _hasExclusiveSelected = false;
          for(const _k in selected){
            if(!selected[_k]) continue;
            const _p = plots[parseInt(_k, 10)];
            if(_isExclusive(_p)){ _hasExclusiveSelected = true; break; }
          }
          const _doAddNormal = function(){ selected[idx] = true; applyAndSave(); refresh(); };
          if(_hasExclusiveSelected){
            openConfirm('指派至普通地塊將解除蒸餾室/堆肥區綁定。確認？', function(){
              for(const _k in selected){
                const _p = plots[parseInt(_k, 10)];
                if(_isExclusive(_p)) delete selected[_k];
              }
              _doAddNormal();
            });
            return;
          }
          if(_ownerConflict){
            openConfirm('此格已被其他僕人指派，是否取代？', _doAddNormal);
            return;
          }
          _doAddNormal();
        };
      })(cells[i]);
    }
  }
  function refresh(){
    bd.innerHTML = renderGridHtml();
    bindCells();
  }
  bindCells();
}

/* ===== 實時刷新僕人列表（當前在僕人 tab 時） ===== */
function _refreshServantListNow(){
  try {
    const p = document.getElementById('garden-page');
    if(!p) return;
    if(typeof _gardenActiveTab === 'undefined' || _gardenActiveTab !== 'servant') return;
    const box = p.querySelector('#gp-content');
    if(!box) return;
    if(typeof renderGardenServants === 'function') renderGardenServants(box);
  } catch(e){ console.warn('[refresh servants] err', e); }
}

function openServantDetail(srvId, returnFn){
  const srv = (state.servants || []).find(function(s){ return s.id === srvId; });
  if(!srv) return;
  const def = SERVANT_TYPES[srv.type] || {name:'?', icon:'?', desc:''};
  const slots = servantSlots(srv.rarity, srv.type);
  const plots = (srv.assignedPlots || []);
  const maxStam = servantEffectiveMaxStamina(srv);
  const stam = Math.max(0, srv.stamina || 0);
  const stamPct = maxStam > 0 ? Math.round((stam / maxStam) * 100) : 0;
  const stamColor = stamPct <= 0 ? '#e05252' : (stamPct <= 30 ? '#e8741e' : (stamPct <= 70 ? '#e8a33d' : '#4caf50'));
  const ft = document.createElement('div');
  ft.className = 'modal-ft';
  let ftHtml = '';

  ftHtml += '<button class="btn primary" id="srv-assign">指派</button>';
  if((srv.assignedPlots||[]).length > 0) ftHtml += '<button class="btn" id="srv-withdraw">撤回</button>';
  ftHtml += '';
  ft.innerHTML = ftHtml;
  let body = '';
  body += '<div style="font-size:15px;color:#e8a33d;font-weight:bold;display:flex;align-items:center;gap:8px">';
  body += '<span style="display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:5px;background:' + rarityBg(srv.rarity) + ';flex:0 0 auto"><img style="width:28px;height:28px;object-fit:contain" src="icons/servants/' + srv.type + '.png' + assetSuffix() + '" alt=""></span>';
  body += '<span class="' + rarityClass(srv.rarity) + '">' + _servantEscHtml(servantLabel(srv)) + '</span>';
  body += '<span class="srv-rename-btn" style="font-size:11px;color:#e8a33d;cursor:pointer;padding:4px 10px;border:1px solid #3a2f25;border-radius:4px;margin-left:6px">改名</span>';
{
  const _fcP = srv.foodPolicy || 'normal';
  const _fcB = (typeof FOOD_COST_BASE !== 'undefined' ? FOOD_COST_BASE[_fcP] : 0) || 0;
  const _fcM = (typeof RARITY_FOOD_MULT !== 'undefined' ? RARITY_FOOD_MULT[srv.rarity] : 1) || 1;
  const _fcC = Math.round(_fcB * _fcM * 10) / 10;
  body += '<span class="srv-food-rate" style="font-size:11px;color:#e05252;font-weight:bold">🍲 -' + _fcC + '/hr</span>';
}
body += '<button class="btn danger" id="srv-dismiss" style="margin-left:auto;padding:4px 12px;font-size:11px;flex:0 0 auto">解僱</button>';

  body += '</div>';
  /* rev-fix-servant-hp-bar-v6: HP 条在体力条下面 */
  const _isInjuredDetail = !!(srv.injuredUntil && srv.injuredUntil > Date.now());
  body += '<div class="detail-sub">' + srv.rarity + ' · Lv.' + srv.lv + ' · ' + def.name + (srv.resting ? ' · <span style="color:#7a6f60">休息中</span>' : (srv.stamina <= 0 ? ' · <span style="color:#e05252">偷懶中</span>' : '')) + '</div>';
  body += '<div class="stat-line"><span class="k">當前效果</span><span class="v" style="color:#4caf50;font-weight:bold">' + servantLevelEffectText(srv) + '</span></div>';
  body += '<div style="margin:8px 0 4px">';
  body += '<div style="font-size:10px;color:#7a6f60;margin-bottom:3px;display:flex;justify-content:space-between"><span>體力</span><span>' + stam + ' / ' + maxStam + '（' + stamPct + '%）</span></div>';
  body += '<div style="height:6px;background:#1a1510;border-radius:3px;overflow:hidden;border:1px solid #2a231c"><div style="height:100%;width:' + stamPct + '%;background:' + stamColor + '"></div></div>';
  body += '</div>';
  const _maxHpV = (typeof servantMaxHp === 'function') ? servantMaxHp(srv) : (srv.hp || 100);
  let _curHpV = (srv.hp !== undefined && srv.hp !== null) ? srv.hp : _maxHpV;
  if(_isInjuredDetail) _curHpV = 0;
  const _hpPctV = _maxHpV > 0 ? Math.round(_curHpV / _maxHpV * 100) : 0;
  const _hpColV = _isInjuredDetail ? '#e05252' : (_curHpV < _maxHpV ? '#e8a33d' : '#4caf50');
  body += '<div style="margin:8px 0 4px"' + (_isInjuredDetail ? ' class="srv-detail-heal" data-heal="1" style="cursor:pointer;margin:8px 0 4px"' : '') + '>';
  body += '<div style="font-size:10px;color:' + (_isInjuredDetail ? '#e05252' : '#7a6f60') + ';margin-bottom:3px;display:flex;justify-content:space-between"><span>HP</span><span>' + _curHpV + ' / ' + _maxHpV + '（' + _hpPctV + '%）' + (_isInjuredDetail ? ' · <span style="color:#e8a33d;font-weight:bold">治療</span>' : '') + '</span></div>';
  body += '<div style="height:6px;background:#1a1510;border-radius:3px;overflow:hidden;border:1px solid #2a231c"><div style="height:100%;width:' + _hpPctV + '%;background:' + _hpColV + '"></div></div>';
  body += '</div>';
  /* rev-fix-servant-detail-dedup: 删除重复的当前效果 + 体力条 */
  if(srv.lv < SERVANT_MAX_LV){
    const _need = servantExpNeed(srv.lv);
    const _cur = srv.exp || 0;
    const _pct = Math.min(100, Math.round((_cur / _need) * 100));
    body += '<div style="margin:6px 0 4px">';
    body += '<div style="font-size:10px;color:#7a6f60;margin-bottom:3px;display:flex;justify-content:space-between"><span>經驗</span><span>' + _cur + ' / ' + _need + '（' + _pct + '%）</span></div>';
    body += '<div style="height:5px;background:#1a1510;border-radius:3px;overflow:hidden;border:1px solid #2a231c"><div style="height:100%;width:' + _pct + '%;background:linear-gradient(90deg,#4caf50,#7ee07e)"></div></div>';
    body += '</div>';
  } else {
    body += '<div style="font-size:10px;color:#4caf50;margin:6px 0 4px;text-align:center;font-weight:bold">✦ 已滿級 Lv.' + SERVANT_MAX_LV + '</div>';
  }
  body += '<div class="stat-line"><span class="k">已指派</span><span class="v">' + plots.length + ' / ' + slots + '</span></div>';
  if(plots.length){
    body += '<div class="stat-line"><span class="k">地塊</span><span class="v">' + plots.map(function(i){ return plotCoordName(i); }).join('、') + '</span></div>';
  }
  if(srv.type === 'farmer'){
    body += '<div class="divider"></div>';
    body += '<div style="font-size:11px;color:#e8a33d;font-weight:bold;margin-bottom:6px">🌱 自動種植</div>';
    body += '<select id="srv-auto-plant" style="width:100%;background:#151210;color:#ddd;border:1px solid #2a231c;border-radius:4px;padding:6px;font-size:11px">';
    body += '<option value="off">關閉</option>';
    body += '<option value="any">高價值</option>';
    body += '<option value="follow">重複</option>';
    body += '</select>';
  }
  body += '<div class="divider"></div>';
  body += '<div style="font-size:11px;color:#e8a33d;font-weight:bold;margin-bottom:6px">🍲 食物策略</div>';
  body += '<select id="srv-food-policy" style="width:100%;background:#151210;color:#ddd;border:1px solid #2a231c;border-radius:4px;padding:6px;font-size:11px">';
  body += '<option value="full">吃到撐（120%）</option>';
  body += '<option value="normal">吃飽（70%）</option>';
  body += '<option value="half">半飽（50%）</option>';
  body += '<option value="lick">舔舔（30%）</option>';
  body += '<option value="starve">餓著（0%）</option>';
  body += '</select>';
  body += '<div style="font-size:9px;color:#5a5040;margin-top:4px;line-height:1.5">需與商人訂閱食物生產線後生效</div>';
  const _detailOnClose = (typeof returnFn === 'function') ? returnFn : closeModal;
  const bd = openModal({ title: '僕人詳情', body: body, footer: ft, onClose: _detailOnClose });
  /* rev-fix-servant-heal-v3: 点击整个 HP 条区域治疗 */
  const _healArea = bd.querySelector('.srv-detail-heal[data-heal]');
  if(_healArea) _healArea.onclick = function(){
    if(typeof _stConsumeLowestMed !== 'function') return;
    const _med = _stConsumeLowestMed();
    if(!_med){
      if(typeof notify === 'function') notify('沒有醫療品', 'warn');
      return;
    }
    srv.injuredUntil = 0;
    srv._injuredDown = false;
    srv.hp = _maxHpV;
    if(srv._injuredAnimStart) srv._injuredAnimStart = null;
    save();
    closeModal();
    if(typeof _refreshServantListNow === 'function') _refreshServantListNow();
    renderGardenGrid();
    openServantDetail(srvId, returnFn);
  };
  const _wdBtn = ft.querySelector('#srv-withdraw');
  if(_wdBtn) _wdBtn.onclick = function(){
    const _list = srv.assignedPlots || [];
    const _plots = _gardenGetPlots();
    for(const _idx of _list){
      const _p2 = _plots[_idx];
      if(_p2 && _p2.assignedServant === srv.id) delete _p2.assignedServant;
    }
    srv.assignedPlots = [];
    save();
    closeModal();
    _gardenLog('<span class="r-' + srv.rarity + '">' + servantLabel(srv) + '</span> 已撤回', 'clean');
    renderGardenGrid();
    if(typeof _gardenSyncActors === 'function') _gardenSyncActors();
    if(typeof _refreshServantListNow === 'function') _refreshServantListNow();
  };
  const _dsBtn = bd.querySelector('#srv-dismiss');
  if(_dsBtn) _dsBtn.onclick = function(){
    openConfirm('確定解僱 ' + (SERVANT_TYPES[srv.type]||{}).name + '？', function(){
      const _list = srv.assignedPlots || [];
      const _plots = _gardenGetPlots();
      for(const _idx of _list){
        const _p2 = _plots[_idx];
        if(_p2 && _p2.assignedServant === srv.id) delete _p2.assignedServant;
      }
      state.servants = (state.servants || []).filter(function(s){ return s.id !== srv.id; });
      const _rw = { '破舊':{s:[0,1],m:[1,2]}, '一般':{s:[1,1],m:[2,3]}, '庫存':{s:[1,2],m:[3,4]}, '精品':{s:[2,3],m:[4,6]}, '傳奇':{s:[3,5],m:[6,10]} };
      const _r = _rw[srv.rarity] || _rw['一般'];
      const _sn = Object.keys(SEEDS);
      const _mn = ['wood','metal','screws','cloth','gears','electronics'];
      const _parts = [];
      const _sc = rndInt(_r.s[0], _r.s[1]);
      for(let _i = 0; _i < _sc; _i++){ const _sid = pick(_sn); gardenStorageAdd(_sid, srv.rarity, 1); _parts.push('🌰' + (SEEDS[_sid]?SEEDS[_sid].name:_sid)); }
      const _mc = rndInt(_r.m[0], _r.m[1]);
      for(let _i = 0; _i < _mc; _i++){ const _mid = pick(_mn); invAdd(_mid, '一般', 1); _parts.push((MATERIAL_EMOJI[_mid]||'') + (MATERIALS[_mid]?MATERIALS[_mid].name:_mid)); }
      save();
      closeModal();
      _gardenLog('解僱 <span class="r-' + srv.rarity + '">' + servantLabel(srv) + '</span>', 'leave');
      renderGardenGrid();
      if(typeof _refreshServantListNow === 'function') _refreshServantListNow();
    });
  };
  const _rnBtn = bd.querySelector('.srv-rename-btn');
  if(_rnBtn) _rnBtn.onclick = function(){ closeModal(); openServantRename(srvId, returnFn); };
  ft.querySelector('#srv-assign').onclick = function(){ closeModal(); openServantAssign(srvId, returnFn); };
  const apSel = bd.querySelector('#srv-auto-plant');
  if(apSel){
    apSel.value = srv.autoPlant || 'off';
    apSel.onchange = function(){
      srv.autoPlant = apSel.value;
      save();
    };
  }
  const fpSel = bd.querySelector('#srv-food-policy');
  if(fpSel){
    fpSel.value = srv.foodPolicy || 'normal';
    fpSel.onchange = function(){
      srv.foodPolicy = fpSel.value;
      const _eff = servantEffectiveMaxStamina(srv);
      if((srv.stamina || 0) > _eff) srv.stamina = _eff;
      save();
      const _rateEl = bd.querySelector('.srv-food-rate');
      if(_rateEl){
        const _fcB = (typeof FOOD_COST_BASE !== 'undefined' ? FOOD_COST_BASE[srv.foodPolicy] : 0) || 0;
        const _fcM = (typeof RARITY_FOOD_MULT !== 'undefined' ? RARITY_FOOD_MULT[srv.rarity] : 1) || 1;
        const _fcC = Math.round(_fcB * _fcM * 10) / 10;
        _rateEl.textContent = '🍲 -' + _fcC + '/hr';
        _rateEl.style.color = '#e05252';
        _rateEl.style.fontWeight = 'bold';
      }
    };
  }
}

function openConfirm(msg, onOk, onCancel){
  const el = document.createElement('div');
  el.className = 'confirm-layer';
  el.innerHTML = '<div class="confirm-box"><div class="confirm-msg">' + msg + '</div><div class="confirm-btns"><button class="btn danger" id="cf-ok">取代</button><button class="btn ghost" id="cf-cancel">取消</button></div></div>';
  document.body.appendChild(el);
  el.querySelector('#cf-ok').onclick = function(){ el.remove(); if(onOk) onOk(); };
  el.querySelector('#cf-cancel').onclick = function(){ el.remove(); if(onCancel) onCancel(); };
}

/* ===== 僕人任務系統（體力 + 叫醒 + 演員循環） ===== */
let _gardenActors = [];
let _gardenActorTimer = null;

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

function plotCoordName(idx){
  const col = idx % 4;
  const row = Math.floor(idx / 4);
  return 'ABCD'[col] + (row + 1);
}

function _gardenHasAnySeed(){
  const storage = _gardenStorageInit();
  for(const k in storage){
    if(storage[k] <= 0) continue;
    const id = k.split('@')[0];
    if(SEEDS[id]) return true;
  }
  return false;
}

function _gardenHasSeedOf(seedId, rarity){
  return gardenStorageCount(seedId, rarity) > 0;
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

let _gardenActorCanvasRAF = null;

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
      else if(a.state === 'work') animName = 'fire_primary';
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

function openGardenStorageDetail(id, rarity){
  const _kind = (typeof _gardenStorageKind === 'function') ? _gardenStorageKind(id) : null;
  const isSeed = (_kind === 'seed') || (!_kind && !!SEEDS[id]);
  const isCrop = (_kind === 'crop') || (!_kind && !!CROPS[id]);
  if(!isSeed && !isCrop) return;
  const count = gardenStorageCount(id, rarity);
  if(count <= 0){ return; }
  const def = isSeed ? SEEDS[id] : (CROPS[id] || (typeof GARDEN_EXTRAS !== 'undefined' && GARDEN_EXTRAS[id]) || null);
  if(!def) return;
  const icon = (typeof _gardenStorageItemIcon === 'function') ? _gardenStorageItemIcon(id, 28) : (isSeed ? seedImgHtml(id, 28) : cropImgHtml(id, 28));
  const nm = def.name || id;
  const ft = document.createElement('div');
  ft.className = 'modal-ft';
  ft.innerHTML = '';
  let body = '';
  body += '<div style="font-size:15px;color:#e8a33d;font-weight:bold;display:flex;align-items:center;gap:8px">';
  body += '<span style="font-size:28px;line-height:1">' + icon + '</span>';
  body += '<span class="' + rarityClass(rarity) + '">' + nm + '</span>';
  body += '</div>';
  body += '<div class="detail-sub">' + rarity + ' · 儲備 ×' + count + '</div>';
  if(isSeed){
    const cropDef = CROPS[def.cropId];
    const yieldBase = Math.max(1, Math.round(def.baseYield * (RARITY_MULT[rarity] || 1)));
    const _fv = cropFoodValue(def.cropId, rarity);
    body += '<div class="stat-line"><span class="k">類型</span><span class="v">種子</span></div>';
    body += '<div class="stat-line"><span class="k">對應作物</span><span class="v">' + (cropDef ? cropDef.icon + ' ' + cropDef.name : '—') + '</span></div>';
    body += '<div class="stat-line"><span class="k">生長時間</span><span class="v">' + Math.round(def.growMs / 1000) + ' 秒</span></div>';
    body += '<div class="stat-line"><span class="k">收穫量</span><span class="v">約 ' + yieldBase + '（基礎 ' + def.baseYield + ' × 稀有度 ' + (RARITY_MULT[rarity] || 1) + '）</span></div>';
    body += '<div class="stat-line"><span class="k">成熟後腐爛</span><span class="v">' + Math.round(def.rotMs / 1000) + ' 秒</span></div>';
    body += '<div class="stat-line"><span class="k">收穫食物值</span><span class="v" style="color:#4caf50">' + _fv + ' / 個</span></div>';
  } else {
    const _isExtra = (typeof GARDEN_EXTRAS !== 'undefined' && GARDEN_EXTRAS[id]);
    if(_isExtra){
      body += '<div class="stat-line"><span class="k">類型</span><span class="v">' + (GARDEN_EXTRAS[id].desc || '花園物品') + '</span></div>';
    } else {
      const _fv = cropFoodValue(id, rarity);
      body += '<div class="stat-line"><span class="k">類型</span><span class="v">作物</span></div>';
      let _belongSeed = null;
      for(const _sid in SEEDS){ if(SEEDS[_sid].cropId === id){ _belongSeed = SEEDS[_sid]; break; } }
      if(_belongSeed){
        body += '<div class="stat-line"><span class="k">來源種子</span><span class="v">🌰 ' + _belongSeed.name + '</span></div>';
      }
      body += '<div class="stat-line"><span class="k">食物值</span><span class="v" style="color:#4caf50">' + _fv + '</span></div>';
    }
  }
  openModal({ title: '儲備詳情', body: body, footer: ft });
}

function openGarden(){
  _ensureGardenPage();
  const p = document.getElementById('garden-page');
  if(!p) return;
  _gardenActiveTab = 'log';
  _gardenSweep(Date.now());
  renderGardenGrid();
  renderGardenTabs();
  renderGardenContent();
  p.classList.add('on');
  setTimeout(function(){
    try{
      const _r = (typeof _gardenStorageRotCheck === 'function') ? _gardenStorageRotCheck() : null;
      if(_r && _r.changed && _r.report){
        const rep = _r.report;
        let msg = '作物腐爛：' + rep.rotted + ' 個';
        if(rep.composted > 0) msg += '（堆肥 +' + rep.accelSec + 's 加速';
        if(rep.seeds > 0) msg += (rep.composted > 0 ? '，' : '（') + '種子 +' + rep.seeds;
        if(rep.composted > 0 || rep.seeds > 0) msg += '）';
        if(typeof renderGardenContent === 'function') renderGardenContent();
      }
    }catch(e){ console.warn('[rot] err', e); }
  }, 300);
  if(typeof _gardenStartActorCanvasLoop === 'function') _gardenStartActorCanvasLoop();
  if(typeof _gardenRaidCheck === 'function') setTimeout(_gardenRaidCheck, 300);
  _gardenSyncActors();
  _gardenStartActorLoop();
  if(_gardenTickTimer) clearInterval(_gardenTickTimer);
  _gardenTickTimer = setInterval(function(){
    const pp = document.getElementById('garden-page');
    if(!pp || !pp.classList.contains('on')){
      clearInterval(_gardenTickTimer);
      _gardenTickTimer = null;
      return;
    }
    renderGardenGrid();
  }, 1000);
}

function closeGarden(){
  const p = document.getElementById('garden-page');
  if(p) p.classList.remove('on');
  if(_gardenTickTimer){ clearInterval(_gardenTickTimer); _gardenTickTimer = null; }
  _gardenStopActorLoop();
}

/* ===== 花園日誌 ===== */
function _gardenLog(text, cls, rarity, detail){
  if(!state.garden || typeof state.garden !== 'object') state.garden = {};
  if(!Array.isArray(state.garden.log)) state.garden.log = [];
  state.garden.log.push({ t: Date.now(), text: String(text), cls: cls || '', rarity: rarity || '', detail: detail || null });
  if(state.garden.log.length > 100) state.garden.log.splice(0, state.garden.log.length - 100);
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
function gardenHarvest(idx){
  try {
    const plots = _gardenGetPlots();
    const plot = plots[idx];
    if(!plot || !plot.crop){ return; }
    const c = plot.crop;
    const seed = SEEDS[c.seedId];
    if(!seed){ return; }
    const now = Date.now();
    if(now < c.matureAt){ return; }
    const rottenAt = c.matureAt + seed.rotMs;
    if(now >= rottenAt){ return; }
    const baseYield = seed.baseYield;
    const mult = RARITY_MULT[c.rarity] || 1;
    const expected = baseYield * mult;
    const jitter = 0.8 + Math.random() * 0.4;
    let count = Math.max(1, Math.round(expected * jitter));
    if(plot.fertilized && now < (plot.fertExpireAt || 0)){ count = Math.round(count * 1.3); }
    plot.fertilized = false;
    plot.fertExpireAt = 0;
    gardenStorageAdd(seed.cropId, c.rarity, count);
    plot.crop = null;
    _gardenLog('<span class="pl">玩家</span> 收穫 ' + fmtItemSpan(seed.cropId, c.rarity, count), 'harvest');
    save();
    closeModal();
    renderGardenGrid();
    renderGardenContent();
  } catch(err){
    console.warn('[gardenHarvest]', err);
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

/* ===== 日誌面板 ===== */
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

function _openGardenLogDetail(entry){
  if(!entry || !entry.detail) return;
  const d = entry.detail;
  if(d.type === 'merchant_batch'){ _openMerchantBatchDetail(entry); return; }
  if(d.type === 'offline_garden'){ _openOfflineGardenDetail(entry); return; }
  let body = '<div class="empty-hint">未知日誌類型：' + String(d.type || '?') + '</div>';
  body += '<div style="font-size:10px;color:#7a6f60;margin-top:8px;word-break:break-all">keys: ' + Object.keys(d).join(', ') + '</div>';
  const ft = document.createElement('div');
  ft.className = 'modal-ft';
  ft.innerHTML = '';
  openModal({ title: '詳情', body: body, footer: ft });
}

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
  const _cArr = [], _sArr = [], _mArr = [], _lqArr = [];
  if(d.crops){ for(const k in d.crops){ const sp = k.split('@'); _cArr.push({ id: sp[0], rarity: sp[1], count: d.crops[k] }); } }
  if(d.seeds){ for(const k in d.seeds){ const sp = k.split('@'); _sArr.push({ id: sp[0], rarity: sp[1], count: d.seeds[k] }); } }
  if(d.mats){ for(const k in d.mats){ _mArr.push({ id: k, rarity: '一般', count: d.mats[k] }); } }
  if(d.liquor){ for(const k in d.liquor){ const sp = k.split('@'); _lqArr.push({ id: sp[0], rarity: sp[1], count: d.liquor[k] }); } }
  body += _catHtml('crops', '🌾 作物', _cArr);
  body += _catHtml('seeds', '🌰 種子', _sArr);
  body += _catHtml('mats', '🔩 材料', _mArr);
  body += _catHtml('liquor', '🍶 私酒', _lqArr);
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
  /* rev-fix-raid-battleLog: 新格式 entry.summary，舊格式 entry 本身 */
  const _s = entry.summary || entry;
  const win = entry.win;
  let body = '<div class="detail-title ' + (win?'r-傳奇':'r-破舊') + '">' + (win?'⚔️ 勝利':'💀 失敗') + '</div>';
  body += '<div class="detail-sub">' + _esc(entry.region || '') + '</div>';
  body += '<div class="stat-line"><span class="k">回合</span><span class="v">' + (_s.rounds||0) + '</span></div>';
  body += '<div class="stat-line"><span class="k">守衛</span><span class="v">' + (_s.guardAlive||0) + ' / ' + (_s.guardTotal||0) + '</span></div>';
  body += '<div class="stat-line"><span class="k">敵人</span><span class="v">' + (_s.enemyCount||0) + '</span></div>';
  body += '<div class="stat-line"><span class="k">彈藥</span><span class="v">' + (_s.ammoUsed||0) + ' 發</span></div>';
  body += '<div class="stat-line"><span class="k">總傷害</span><span class="v">' + (_s.totalDmg||0) + '</span></div>';
  if(_s.guardAmmoList && _s.guardAmmoList.length){
    body += '<div class="divider"></div><div style="font-size:11px;color:#e8a33d;margin-bottom:4px">守衛表現</div>';
    for(const ga of _s.guardAmmoList){
      body += '<div class="stat-line"><span class="k">' + _esc((ga.coord||'') + ' ' + ga.name) + '</span><span class="v">' + ga.ammoName + '×' + ga.count + ' 傷' + ga.dmg + '</span></div>';
    }
  }
  if(!win && _s.broken && _s.broken.length){
    body += '<div class="divider"></div><div style="color:#e05252;font-size:11px">損壞：' + _s.broken.join(' ') + '</div>';
  }
  if(!win && _s.stolen && _s.stolen.length){
    body += '<div style="color:#e05252;font-size:11px">掠奪：' + _lootHtml(_s.stolen, '#e05252') + '</div>';
  }
  if(win && _s.loot && _s.loot.length){
    body += '<div class="divider"></div><div style="color:#4caf50;font-size:11px">獲得：' + _lootHtml(_s.loot, '#4caf50') + '</div>';
  }
  const ft = document.createElement('div');
  ft.className = 'modal-ft';
  ft.innerHTML = '';
  openModal({ title: '戰鬥詳情', body: body, footer: ft });
}

/* rev-fix-raid-realtime-log: 只更新右欄（戰鬥日誌），不重建左欄（生產日誌） */
function _gardenRefreshBattleLogNow(){
  try {
    if(typeof _gardenActiveTab === 'undefined' || _gardenActiveTab !== 'log') return;
    const p = document.getElementById('garden-page');
    if(!p || !p.classList.contains('on')) return;
    const box = p.querySelector('#gp-content');
    if(!box) return;
    const rw = box.querySelector('.gs-wrap[data-col="battle"]');
    if(!rw) return;
    const battleLog = (state.garden && state.garden.battleLog) || [];
    let right = '';
    if(!battleLog.length){
      right = '<div class="gs-empty" style="position:static;padding:20px 0">暫無戰鬥</div>';
    } else {
      for(let i = 0; i < battleLog.length; i++){
        const e = battleLog[i];
        if(e.kills !== undefined || e.status !== undefined || e.summary !== undefined){
          if(e.kills && e.kills.length){
            for(const k of e.kills){
              /* rev-fix-raid-log-timestamp-v2: 加时间戳 */
            const _ts3 = k.t ? (('0' + new Date(k.t).getHours()).slice(-2) + ':' + ('0' + new Date(k.t).getMinutes()).slice(-2)) : '';
            right += '<div class="garden-log-line raid-log-kill" style="padding-left:0;border-left:none">' + (_ts3 ? '<span class="gl-time">' + _ts3 + '</span> ' : '') + (k.html || '') + '</div>';
            }
          }
          if(e.status && e.status.length){
            for(const s of e.status){
              var _sCls = s.cls ? (' ' + s.cls) : '';
              right += '<div class="garden-log-line raid-log-status' + _sCls + '" style="padding-left:0;border-left:none">' + (s.html || '') + '</div>';
            }
          }
          if(e.summary){
            const _sum = e.summary;
            const _win = e.win;
            const _txt = (_win?'⚔️ 防禦成功':'💀 後院失守') + ' · ' + (e.region||'') + ' · 擊殺 ' + (_sum.enemyCount||0) + ' · 彈藥 ' + (_sum.ammoUsed||0) + ' · 傷害 ' + (_sum.totalDmg||0);
            right += '<div class="garden-log-line raid-log-summary" data-battle-idx="' + i + '" style="padding-left:0;border-left:none;cursor:pointer;text-decoration:underline dotted;color:#e8a33d">' + _txt + '</div>';
          }
        } else {
          const _win = e.win;
          const _txt = (_win?'⚔️勝':'💀敗') + ' ' + (e.region||'') + ' · ' + e.rounds + '回 · 守' + e.guardAlive + '/' + e.guardTotal + ' · 敵' + e.enemyCount + ' · 彈' + e.ammoUsed + ' · 傷' + e.totalDmg;
          right += '<div class="garden-log-line raid-log-summary" data-battle-idx="' + i + '" style="padding-left:0;border-left:none;cursor:pointer;text-decoration:underline dotted;color:#e8a33d">' + _txt + '</div>';
        }
      }
    }
    rw.innerHTML = right;
    rw.scrollTop = rw.scrollHeight;
  } catch(e){}
}

function renderGardenLog(box){
  if(!box) return;
  const log = (state.garden && state.garden.log) || [];
  const battleLog = (state.garden && state.garden.battleLog) || [];
  /* rev-fix-raid-log-unify: 不再使用 liveActive / live */
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
  /* rev-fix-raid-battleLog: 文字形式渲染（kills + status + summary） */
  if(!battleLog.length){
    right += '<div class="gs-empty" style="position:static;padding:20px 0">暫無戰鬥</div>';
  } else {
    for(let i = 0; i < battleLog.length; i++){
      const e = battleLog[i];
      /* 新格式：kills + status + summary */
      if(e.kills !== undefined || e.status !== undefined || e.summary !== undefined){
        if(e.kills && e.kills.length){
          for(const k of e.kills){
            /* rev-fix-raid-log-timestamp: 加时间戳 */
            /* rev-fix-tsstr-scope: tsStr 在 _gardenRefreshBattleLogNow 内未定义 → 内联 */
            const _ts = k.t ? (('0' + new Date(k.t).getHours()).slice(-2) + ':' + ('0' + new Date(k.t).getMinutes()).slice(-2)) : '';
            right += '<div class="garden-log-line raid-log-kill" style="padding-left:0;border-left:none">' + (_ts ? '<span class="gl-time">' + _ts + '</span> ' : '') + (k.html || '') + '</div>';
          }
        }
        if(e.status && e.status.length){
          for(const s of e.status){
            var _sCls2 = s.cls ? (' ' + s.cls) : '';
            /* rev-fix-raid-log-timestamp-v3: 加时间戳 */
            const _ts4 = s.t ? (('0' + new Date(s.t).getHours()).slice(-2) + ':' + ('0' + new Date(s.t).getMinutes()).slice(-2)) : '';
            right += '<div class="garden-log-line raid-log-status' + _sCls2 + '" style="padding-left:0;border-left:none">' + (_ts4 ? '<span class="gl-time">' + _ts4 + '</span> ' : '') + (s.html || '') + '</div>';
          }
        }
        if(e.summary){
          const _sum = e.summary;
          const _win = e.win;
          const _txt = (_win?'⚔️ 防禦成功':'💀 後院失守') + ' · ' + (e.region||'') + ' · 擊殺 ' + (_sum.enemyCount||0) + ' · 彈藥 ' + (_sum.ammoUsed||0) + ' · 傷害 ' + (_sum.totalDmg||0);
          right += '<div class="garden-log-line raid-log-summary" data-battle-idx="' + i + '" style="padding-left:0;border-left:none;cursor:pointer;text-decoration:underline dotted;color:#e8a33d">' + _txt + '</div>';
        }
      } else {
        /* 舊格式：一行總結 */
        const _win = e.win;
        const _txt = (_win?'⚔️勝':'💀敗') + ' ' + (e.region||'') + ' · ' + e.rounds + '回 · 守' + e.guardAlive + '/' + e.guardTotal + ' · 敵' + e.enemyCount + ' · 彈' + e.ammoUsed + ' · 傷' + e.totalDmg;
        right += '<div class="garden-log-line raid-log-summary" data-battle-idx="' + i + '" style="padding-left:0;border-left:none;cursor:pointer;text-decoration:underline dotted;color:#e8a33d">' + _txt + '</div>';
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
}

/* ===== 僕人編號 + 改名 ===== */
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
window.grantRandomServant = function(){
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
};
function grantRandomServant(){ return window.grantRandomServant(); }

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

window.getServantTalents = function(srv){ return srv && Array.isArray(srv.talents) ? srv.talents : []; };
function getServantTalents(srv){ return window.getServantTalents(srv); }
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

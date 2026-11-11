'use strict';

/* 後院核心（地塊類型 / 土壤 / 頁面骨架 / 地塊操作 / 存儲渲染 / 工具 / 開關 / 收穫清理 / 日誌寫入） */
/* 由 21-garden.js 拆分而來，加載順序 21a → 21b → 21c → 21d → 21e，
 * 21d/21e 依賴 21a/21b/21c；21c 依賴 21a/21b。
 * 跨文件共享符號（GARDEN_TABS / _gardenActiveTab / _gardenTickTimer /
 *   _gardenActors / _gardenActorTimer / _gardenActorCanvasRAF）
 * 以 var = window.xxx = 形式暴露。 */

function _getPlotTypeIconHtml(type, size, flexNone, fill){
  const _flex = flexNone ? ';flex:0 0 auto' : '';
  const _t = GARDEN_PLOT_TYPES[type];
  if(!_t) return '<span style="font-size:' + size + 'px' + _flex + '">?</span>';
  const _file = _t.imgIcon || _t.bg || type;
  if(fill) return '<img src="icons/garden/' + _file + '.png' + assetSuffix('icons/garden/' + _file + '.png') + '" style="width:100%;height:100%;object-fit:cover;display:block;pointer-events:none;border-radius:3px" alt="">';
  return '<img src="icons/garden/' + _file + '.png' + assetSuffix('icons/garden/' + _file + '.png') + '" style="width:' + size + 'px;height:' + size + 'px;object-fit:contain' + _flex + '" alt="">';
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

var GARDEN_TABS = window.GARDEN_TABS = [
  { id: 'log',      label: '📜 日誌' },
  { id: 'storage',  label: '📦 儲備' },
  { id: 'servant',  label: '👤 僕人' },
  { id: 'merchant', label: '💰 商人' }
];

var _gardenActiveTab = window._gardenActiveTab = 'storage';

var _gardenTickTimer = window._gardenTickTimer = null;


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
  body += '<div style="display:flex;align-items:center;gap:8px;font-size:15px;color:#e8a33d;font-weight:bold"><img style="width:28px;height:28px;object-fit:contain;flex:0 0 auto" src="icons/garden/soil.png' + assetSuffix('icons/garden/soil.png') + '" alt=""><span>土地</span>' + _gardenFertInfoHtml(plot) + '<button class="btn danger" id="soil-del" style="margin-left:auto;padding:4px 10px;font-size:11px;border-radius:5px;flex:0 0 auto">拆除</button></div>';
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
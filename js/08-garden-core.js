/* ============================================================
   07-garden.js — 後院（地塊 / 作物 / 僕人 / 商人 / 貿易 / 防禦戰）
   由 06-part.js 拆解而來（rev343）
   ============================================================ */
/* ===== rev130: 後院全屏分頁 ===== */
const GARDEN_PLOT_TYPES = {
  soil:    { name: '土地',   icon: '', imgIcon: 'soil', desc: '基礎土地，無增減' },
  tower:   { name: '哨塔',   icon: '<span style="color:#e05252;font-weight:bold">✖</span>', desc: '自動防禦', bg: 'tower_bg' },
  shed:    { name: '工棚',   icon: '🛖', desc: '容納一個監工', bg: 'shed_bg' },
  compost: { name: '堆肥區', icon: '♻️', desc: '轉化腐爛食物', bg: 'compost_bg' }
,
  fridge:  { name: '保鮮櫃', icon: '🧊', desc: '作物保鮮 24h → 48h', bg: 'fridge_bg' },
  distillery: { name: '蒸餾室', icon: '🍶', desc: '作物釀成私酒', bg: 'distillery_bg' },
  black_soil: { name: '黑土', imgIcon: 'black_soil', special: true, desc: '生長 <span style="color:#4caf50">↑10%</span> ｜ 產量 <span style="color:#4caf50">↑30%</span>' },
  red_soil:   { name: '紅土', imgIcon: 'red_soil',   special: true, desc: '生長 <span style="color:#e05252">↓25%</span> ｜ 產量 <span style="color:#4caf50">↑60%</span>' }};
/* rev653: 黑土肥沃（快+高產），紅土貧瘠（慢但高產補償） */
const SPECIAL_SOIL_BONUS = {
  soil:       { grow: 0,     yield: 0 },
  black_soil: { grow: 0.10,  yield: 0.30 },
  red_soil:   { grow: -0.25, yield: 0.60 }
};
function _isSoilType(t){ return t === 'soil' || t === 'black_soil' || t === 'red_soil'; }
function _getSoilBonus(t){ return SPECIAL_SOIL_BONUS[t] || SPECIAL_SOIL_BONUS.soil; }
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
  /* rev344: 始終包含默認土地，除非當前已是 soil */
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
  /* rev651: 記錄全局土地類型，供新建土地繼承 */
  if(state.garden) state.garden.currentSoilType = typeId;
  save();
  renderGardenGrid();
  renderGardenContent();
  if(typeof _gardenUpdateFoodInfo === 'function') _gardenUpdateFoodInfo();
  notify('已套用 ' + cnt + ' 塊土地');
}
function _openApplySoilDialog(typeId){
  const names = { black_soil: '黑土地', red_soil: '紅土地' };
  /* rev650: desc 已由 GARDEN_PLOT_TYPES 提供，此處不重複 */
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
  /* rev295: 事件委托，避免 _gardenUpdateFoodInfo 重寫 innerHTML 時丢失點擊 */
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
    /* 事件委托：日誌行 / 戰鬥日誌行的點擊
       gp-content 因 _gardenActorExecuteTask 每秒多次 re-render，
       內聯 onclick 的 DOM 節點可能在使用者 mousedown→click 之間被移除，
       導致 click 不派發。委託到 #garden-page 可從根源解決。 */
    const _et = e.target;
    if(_et && _et.closest){
      /* rev326: 行內物品圖標優先處理（與探索日誌一致 → 直接跳物品詳情） */
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
      const _battleItem = _et.closest('.battle-log-item[data-battle-idx]');
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
  /* rev560: 後院整頁支持主 tab 滑動切換（capture 阶段独立绑定，避免仅日誌區生效的问题） */
  (function(){
    if(p._mainTabSwipeBound) return;
    p._mainTabSwipeBound = true;
    const TABS = ['explore', 'combat', 'garden', 'base'];
    let sx = 0, sy = 0, st = 0, active = false;
    p.addEventListener('touchstart', function(e){
      if(e.touches.length !== 1){ active = false; return; }
      const tgt = e.target;
      /* rev562: 動畫區也允許滑動切頁 */
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
  /* rev324: 預留人物頭頂空間（縮小以充分利用垂直空間） */
  const HEAD_SPACE = 45;
  const availH = wrapH - HEAD_SPACE;
  if(availH <= 0) return;
  if(gridW <= wrapW && gridH <= availH) return;
  const scale = Math.min(wrapW / gridW, availH / gridH, 1);
  grid.style.transform = 'scale(' + scale + ')';
  grid.style.transformOrigin = 'bottom center';
}

function _gardenGetPlots(){
  if(!state.garden || typeof state.garden !== 'object') state.garden = {plots:new Array(20).fill(null), storage:{}};
  if(!Array.isArray(state.garden.plots)) state.garden.plots = new Array(20).fill(null);
  while(state.garden.plots.length < 20) state.garden.plots.push(null);
  if(state.garden.plots.length > 20) state.garden.plots.length = 20;
  /* rev651: 遷移 / 初始化 currentSoilType */
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
        /* rev353: 有背景圖的類型（含土壤 / 哨塔 / 工棚 / 堆肥區），不顯示 emoji，只留背景圖 + 標籤 */
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
  /* rev184: 土地格固定 64px，無需動態尺寸 */
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

/* ===== rev284: 地塊責任人 helper ===== */
function _gardenPlotOwnersHtml(idx, type){
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
    html += '<div class="tower-guard-btn" data-srv-id="' + s.id + '" data-plot-idx="' + idx + '" style="background:' + rarityBg(s.rarity) + '">';
    html += '<img class="tg-icon" src="' + _img + '" alt="">';
    html += '<div class="tg-name">' + servantLabel(s) + '</div>';
    html += '</div>';
    html += '<div class="owner-info">';
    html += '<div class="owner-line"><span class="' + rarityClass(s.rarity) + '">Lv.' + s.lv + ' ' + tDef.name + '</span></div>';
    html += '<div class="owner-stam-bar"><div class="owner-stam-fill" style="width:' + pct + '%;background:' + color + '"></div></div>';
    html += '<div class="owner-stam-text">' + stam + ' / ' + effMax + '</div>';
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
      const _img = 'icons/servants/' + s.type + '.png' + assetSuffix();
      const dis = alreadyHere || (isFull && !_isExclusiveList);
      body += '<div class="item-row' + (dis ? ' disabled' : '') + '" data-sid="' + s.id + '"' + (dis ? ' style="opacity:.4"' : '') + '>';
      body += '<div class="icon" style="background:' + rarityBg(s.rarity) + '"><img src="' + _img + '" style="width:100%;height:100%;object-fit:contain"></div>';
      body += '<div class="info"><div class="nm ' + rarityClass(s.rarity) + '">' + servantLabel(s) + '</div>';
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
        const plots = _gardenGetPlots();
        const targetPlot = plots[idx];
        if(!targetPlot) return;
        const isExclusiveTarget = (targetPlot.type === 'compost' || targetPlot.type === 'distillery');
        const _targetLabel = targetPlot.type === 'distillery' ? '蒸餾室' : '堆肥區';
        const otherList = (srv.assignedPlots || []).filter(function(x){ return x !== idx; });
        const hasExclusiveAlready = otherList.some(function(x){ return plots[x] && (plots[x].type === 'compost' || plots[x].type === 'distillery'); });
        const hasOtherPlots = otherList.some(function(x){ return plots[x] && plots[x].type !== 'compost'; });
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
    })(rows[i]);
  }
}
function _gardenPlotOwnersBind(bd){
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
}/* ===== end rev284 ===== */

function openGardenPlotPicker(idx, returnFn){
  const plots = _gardenGetPlots();
  const body = document.createElement('div');
  body.innerHTML = '<div style="font-size:11px;color:#e8a33d;margin-bottom:8px">選擇要建造的設施</div>';
  /* rev326: 堆肥區 / 工棚為唯一建築，已存在則不再列出 */
  /* rev650: 移除 distillery，允許同時存在多個蒸餾室 */
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
        /* rev651: 新建 soil 時用全局 currentSoilType（所有土壤地塊永遠同類型） */
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
    // 無作物 → 種子選擇器 + 底部加拆除
    openGardenSeedPickerWithRemove(idx);
    return;
  }
  // 有作物 → 作物詳情 + 拆除
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
  /* rev562o: 诊断 */
  try {
    const _lk = Object.keys(storage).filter(function(k){ return k.indexOf('liquor@') === 0; });
    console.log('[garden-storage] 全部 key:', Object.keys(storage), '私酒 key:', _lk);
    if(_lk.length){
      _lk.forEach(function(k){ console.log('  ' + k + ' = ' + storage[k]); });
    }
  } catch(e){}
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

const MERCHANT_INTERVAL_MS = 300000;
/* rev303 fix32: 提前到使用前，避免 TDZ */
const GARDEN_MEAL_INTERVAL_MS = 3600000;
const GUARD_STAMINA_DRAIN_PER_HOUR = 120;
const FOOD_COST_BASE = { full: 20, normal: 15, half: 10, lick: 5, starve: 0 };
const FOOD_COST_PER_HOUR = { full: 3, normal: 2, half: 1, lick: 0.5, starve: 0 };
const RARITY_FOOD_MULT = { '破舊': 0.8, '一般': 1, '庫存': 1.5, '精品': 2.5, '傳奇': 5 };
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

/* ════════════════════════════════════════════════════════════════
 * rev303: 命名約定 — 請勿再混用「食物」與「作物」
 * ----------------------------------------------------------------
 * state.garden.food
 *     實際食物（🍲）。由商人食物生產線產出，用於：
 *       - 僕人吃飯（_gardenDoOneMeal / _gardenManualFeed）
 *       - 傳奇投擲物生產線（MERCHANT_THROW_TABLE[4]）扣款
 *       - 傳奇彈藥生產線（MERCHANT_AMMO_TABLE）扣款
 *
 * state.garden.merchant.cropValuePool
 *     作物等值池（🌾）。由腐爛作物轉化填充（_gardenStorageRotCheck），
 *     用於：食物生產線（MERCHANT_FOOD_TABLE）扣款。
 *     注意：這不是食物，是從作物換算而來的「代幣」。
 *
 * _gardenTotalCropValue()
 *     計算儲備中所有作物的食物等值總和（供食物線補池判斷）。
 *
 * 顯示層 emoji 對應：
 *     🍲 = 實際食物（g.food）
 *     🌾 = 作物等值（m.cropValuePool）
 *     🌰 = 種子　💣 = 投擲物　🎖️ = 傳奇彈藥
 * ════════════════════════════════════════════════════════════════ */
/* ===== rev301 validate helper ===== */
const _MIN_VALID_TS = 1577836800000;
/* ===== end validate helper ===== */

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
function _gardenMerchantCropValuePoolFill(target){ return _gardenMerchantPoolFill('cropValuePool', target); }
function _gardenMerchantFoodPoolFill(target){ return _gardenMerchantPoolFill('foodPool', target); }

/* ===== rev301 produce log helpers ===== */
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
/* ===== end produce log helpers ===== */

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
/* rev535: 堆肥值每小時自然損耗 2%（線上/離線共用，不計入離線報告） */
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

function _gardenMerchantTick(){
  if(window._gardenOfflineSettleRunning) return;
  const g = _gardenMerchantInit();
  const m = g.merchant;
  const now = Date.now();
  /* rev321: 偵測離線恢復，避免單獨播報已被離線摘要涵蓋的產線產出 */
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
  /* 需求 4：在線產線播報（離線恢復期間跳過，內容由離線摘要涵蓋） */
  if(batch && batch.lines && Object.keys(batch.lines).length > 0){
    if(_dt < MERCHANT_INTERVAL_MS * 2){
      try { _gardenLogMerchantBatch(batch); } catch(e){ console.warn('[tick log]', e); }
    }
    save();
  }
}

/* rev555: 食物每小時總消耗（僕人吃饭 + 各产線食物消耗）。新增消耗方只改此函數 */
function _gardenFoodConsumePerHour(){
  const g = _gardenMerchantInit();
  const m = g.merchant;
  let total = 0;
  for(const s of (state.servants || [])){
    if(!s.assignedPlots || !s.assignedPlots.length) continue;
    total += (FOOD_COST_PER_HOUR[s.foodPolicy || 'normal'] || 0) * 60;
  }
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
  let consume = 0;
  const servants = state.servants || [];
  for(const s of servants){
    if(!s.assignedPlots || !s.assignedPlots.length) continue;
    consume += (FOOD_COST_PER_HOUR[s.foodPolicy || 'normal'] || 0) * 60;
  }
  /* rev324: 产線食物消耗（傳奇投掷物 + 傳奇彈藥線） */
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

/* rev325c: 商人交易系統 */
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
    { id: 'medkit',      name: '傳奇急救包', desc: '傳奇急救包×1', price: 800, rarity: '傳奇', itemIconId: 'ifak',      stackable: true }
  ]}
];
;
;



function _tradeItemIconHtml(item, size){
  /* rev345: img 統一 100% 填滿容器（容器由 CSS 約束，避免溢出） */
  const _is = 'width:100%;height:100%;max-width:100%;max-height:100%;object-fit:contain;display:block';
  if(item.imgIcon) return '<img src="icons/garden/' + item.imgIcon + '.png' + assetSuffix() + '" style="' + _is + '" alt="">';
  if(item.id === 'seed_stock' || item.id === 'seed_premium' || item.id === 'seed_legend'){
    return '<img src="icons/garden/seeds/seed_pack.png' + assetSuffix() + '" style="' + _is + '" alt="">';
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
      imgSrc: 'icons/garden/' + item.imgIcon + '.png' + assetSuffix(),
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
  /* rev327: 移除 close 按鈕（X 已提供關閉） */
  ft.innerHTML = ftHtml;
  const _bd = openModal({ title: '購買結果', body: body, footer: ft });
  /* rev326: 購買結果裡的物品圖標可點擊 → 物品詳情 */
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



function renderGardenMerchant(box){
  if(!window._merchantMainTab) window._merchantMainTab = 'lines';
  const curTab = window._merchantMainTab;
  /* rev348: 保存滚動位置，避免定時重绘時丢失 */
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
  /* rev349: 签名守衛——結构未变则跳過全量重建，避免闪烁 */
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
    /* 結构未变——只做局部更新，不動 DOM 树 */
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
  /* rev348: 恢複滚動位置（在所有 innerHTML 替換之後） */
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

if(!window.__merchantTimer){
  window.__merchantTimer = setInterval(function(){
    try{
      if(typeof state !== 'undefined' && state.garden && state.garden.merchant){ _gardenMerchantTick(); }
    }catch(e){ console.warn('[merchant tick error]', e); }
  }, 5000);
}

/* ===== rev181: 哨塔配置 ===== */
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
/* rev309: 塔裝備正規化 —— 若原稀有度已不存在，自動升級到背包中同 id 的最高稀有度；完全找不到才清空 */
function _gardenTowerNormalizeEq(cfg){
  if(!cfg || !cfg.eq) return;
  const _slots = ['head','top','primary','secondary'];
  for(const _slot of _slots){
    const _id = cfg.eq[_slot];
    if(!_id) continue;
    const _rar = cfg.eqRarity[_slot] || '一般';
    /* 檢查背包中是否有同 id 同稀有度 */
    let _exists = (state.inventory[_id + '@' + _rar] || 0) > 0;
    if(!_exists){
      for(const _s in state.player.equipped){
        if(state.player.equipped[_s] === _id && (state.player.equippedRarity[_s] || '一般') === _rar){ _exists = true; break; }
      }
    }
    if(_exists) continue;
    /* 找背包中同 id 的最高稀有度 */
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
  // 即時掃背包 + 裝備，補登具名與未登錄項
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
    body += '<div class="item-row" data-amid="' + a + '"><div class="icon" style="background:' + rarityBg(d.rarity) + '">' + itemIcon(a, 30) + '</div><div class="info"><div class="nm ' + rarityClass(d.rarity) + '">' + d.name + '</div><div class="sub">' + d.rarity + ' · 穿甲 ' + (d.pen||0) + ' · 傷害 ' + (d.dmg||0) + '</div></div></div>';
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

const GARDEN_RAID_INTERVAL_MS = 1 * 3600 * 1000;

function _gardenRaidInit(){
  const g = _gardenMerchantInit();
  if(!g.raid || typeof g.raid !== 'object') g.raid = { lastAt: 0, count: 0, wins: 0, loses: 0 };
  return g.raid;
}

function _gardenRaidCheck(){
  const raid = _gardenRaidInit();
  const now = Date.now();
  if(raid.lastAt === 0){ raid.lastAt = now; save(); return; }
  if(now - raid.lastAt < GARDEN_RAID_INTERVAL_MS) return;
  raid.lastAt = now;
  raid.count++;
  save();
  const guards = _gardenRaidCollectGuards();
  if(!guards.length){ console.log('[raid] 無守衛參戰，跳過'); return; }
  _gardenRaidStart(guards);
}

/* ═══════════════════════════════════════════════════════════
   離線防禦戰：純數值模擬，不繪製 canvas
   ═══════════════════════════════════════════════════════════ */
function _gardenRaidSimulateOffline(guards, region, enemies){
  const guardUnits = [];
  for(const g of guards){
    const s = g.srv;
    const maxHp = servantMaxHp(s);
    let armor = 0, armorLevel = 0;
    const eqCfg = (g.towerCfg && g.towerCfg.eq) || {};
    const eqRar = (g.towerCfg && g.towerCfg.eqRarity) || {};
    for(const slot of ['head','top']){
      const id = eqCfg[slot];
      if(!id) continue;
      const rar = eqRar[slot] || '一般';
      armor += equipArmorValue(id, rar);
      const d = ARMOR[id];
      if(d && d.level) armorLevel = Math.max(armorLevel, d.level);
    }
    const scopeBonus = (g.weaponDef && g.weaponDef.scopeBonus) || 0;
    const hitRate = servantHitRate(s, '點射', scopeBonus);
    const ammoId = g.ammoId;
    const ammoRarity = g.ammoRarity || '一般';
    const critRate = servantCritRate(g.weaponRarity, ammoRarity);
    const critMult = servantCritMult(g.weaponRarity, ammoRarity);
    const magCap = (g.weaponDef && g.weaponDef.mag) || 30;
    const stock = ammoId ? invCount(ammoId, ammoRarity) : 0;
    const ms = (g.towerCfg && g.towerCfg.maxShots) || 'inf';
    let budget;
    if(ms === 'skip') budget = 0;
    else if(ms === 'mag') budget = Math.min(stock, magCap);
    else budget = stock;
    guardUnits.push({
      srv: s, name: servantLabel(s) + ' Lv.' + s.lv,
      rpm: (g.weaponDef && g.weaponDef.rpm) || 600,
      hp: maxHp, maxHp: maxHp,
      armor: armor, maxArmor: armor, armorLevel: armorLevel,
      alive: true, isGuard: true,
      weaponDef: g.weaponDef, weaponRarity: g.weaponRarity,
      towerIdx: g.towerIdx, towerCfg: g.towerCfg,
      ammoId: ammoId, ammoRarity: ammoRarity, ammoStock: stock,
      ammoBudget: budget, ammoUsed: 0, magCap: magCap,
      hitRate: hitRate, critRate: critRate, critMult: critMult,
      dmgDone: 0
    });
  }
  const enemyUnits = enemies.map(function(e){
    return {
      id: e.id, name: e.name,
      dmg: e.dmg || 10, pen: e.pen || 0, armorLevel: e.armorLevel || 1,
      rpm: 300, hp: e.maxHp, maxHp: e.maxHp,
      armor: 0, maxArmor: 0, alive: true, isGuard: false
    };
  });
  const MODE_CAP = { '點射': 1, '短點射': 3, '長點射': 7, '掃射': 99, '近戰': 1, '投擲': 1 };
  function pickFireMode(g, aliveE){
    const def = g.weaponDef;
    if(!def || !def.modes) return '點射';
    if(typeof isSemiAutoOnly === 'function' && isSemiAutoOnly(def)) return '點射';
    if(aliveE >= 3 && def.modes.indexOf('掃射') !== -1) return '掃射';
    if(aliveE >= 2 && def.modes.indexOf('短點射') !== -1) return '短點射';
    return '點射';
  }
  function guardsAlive(){ return guardUnits.some(function(u){ return u.alive; }); }
  function enemiesAlive(){ return enemyUnits.some(function(u){ return u.alive; }); }
  function executeShot(fromU, toU, isEnemy){
    if(!toU.alive) return;
    const hit = Math.random() * 100 < (fromU.isGuard ? fromU.hitRate : 75);
    if(!hit) return;
    let dmg;
    if(fromU.isGuard){
      const ammo = fromU.ammoId ? AMMO[fromU.ammoId] : null;
      dmg = ammo ? Math.round(ammo.dmg * (RARITY_MULT[fromU.ammoRarity] || 1)) : Math.round((fromU.weaponDef.dmg || 20) * (RARITY_MULT[fromU.weaponRarity] || 1));
      if(Math.random() < fromU.critRate) dmg = Math.round(dmg * fromU.critMult);
    } else {
      dmg = fromU.dmg || 10;
    }
    const tgt = { hp: toU.hp, armor: toU.armor };
    const pen = fromU.isGuard ? (fromU.ammoId && AMMO[fromU.ammoId] ? (AMMO[fromU.ammoId].pen || 0) : (fromU.weaponDef.pen || 0)) : (fromU.pen || 0);
    const res = applyDamage(tgt, dmg, pen, toU.armorLevel || 0);
    toU.hp = tgt.hp; toU.armor = tgt.armor;
    const shown = res.hpLost > 0 ? res.hpLost : res.armorLost;
    fromU.dmgDone = (fromU.dmgDone || 0) + shown;
    if(fromU.isGuard && fromU.srv) servantAddExp(fromU.srv, 2);
    if(toU.hp <= 0) toU.alive = false;
  }
  let round = 0;
  const maxRounds = 30;
  while(guardsAlive() && enemiesAlive() && round < maxRounds){
    round++;
    for(const g of guardUnits){
      if(!g.alive) continue;
      if(!enemiesAlive()) break;
      if(g.ammoId && (g.ammoBudget - g.ammoUsed) <= 0) continue;
      const aliveE = enemyUnits.filter(function(e){ return e.alive; }).length;
      const mode = pickFireMode(g, aliveE);
      let shots = MODE_CAP[mode] || 1;
      shots = Math.min(shots, g.magCap);
      if(g.ammoId) shots = Math.min(shots, g.ammoBudget - g.ammoUsed);
      for(let i = 0; i < shots; i++){
        const aliveTargets = enemyUnits.filter(function(e){ return e.alive; });
        if(!aliveTargets.length) break;
        if(g.ammoId){ if(g.ammoUsed >= g.ammoBudget) break; g.ammoUsed++; }
        const target = aliveTargets[Math.floor(Math.random() * aliveTargets.length)];
        executeShot(g, target, false);
      }
    }
    if(!enemiesAlive()) break;
    if(!guardsAlive()) break;
    for(const e of enemyUnits){
      if(!e.alive) continue;
      const aliveTargets = guardUnits.filter(function(g){ return g.alive; });
      if(!aliveTargets.length) break;
      const target = aliveTargets[Math.floor(Math.random() * aliveTargets.length)];
      executeShot(e, target, true);
    }
  }
  return { guards: guardUnits, enemies: enemyUnits, win: !enemiesAlive() && guardsAlive(), rounds: round };
}

function _offlineGardenRaidSettle(baseTime, now){
  const raid = _gardenRaidInit();
  /* rev320: 首次離線以 baseTime 為起點，避免直接 return 而漏掉戰鬥結算 */
  if(raid.lastAt === 0){ raid.lastAt = baseTime; }
  let curLast = raid.lastAt;
  if(curLast < baseTime) curLast = baseTime;
  if(now - curLast < GARDEN_RAID_INTERVAL_MS) return 0;
  let count = 0;
  let maxIter = 24;
  while(now - curLast >= GARDEN_RAID_INTERVAL_MS && maxIter > 0){
    maxIter--;
    curLast += GARDEN_RAID_INTERVAL_MS;
    count++;
  }
  if(count === 0) return 0;
  raid.lastAt = curLast;
  raid.count += count;
  for(let i = 0; i < count; i++){
    const guards = _gardenRaidCollectGuards();
    if(!guards.length) continue;
    const gen = _gardenRaidGenEnemies();
    if(!gen.enemies.length) continue;
    const sim = _gardenRaidSimulateOffline(guards, gen.region, gen.enemies);
    try {
      _gardenRaidApplyResult(sim, gen.region);
    } catch(e){
      console.warn('[offline raid]', e);
    }
  }
  return count;
}


function _gardenRaidCollectGuards(){
  const plots = _gardenGetPlots();
  const servants = state.servants || [];
  const result = [];
  for(let i = 0; i < 20; i++){
    const p = plots[i];
    if(!p || p.type !== 'tower' || p.broken) continue;
    const cfg = _gardenTowerInit(p);
    _gardenTowerNormalizeEq(cfg);
    const weaponId = cfg.eq.primary || cfg.eq.secondary;
    const weaponRarity = cfg.eqRarity.primary || cfg.eqRarity.secondary || '一般';
    if(!weaponId) continue;
    const wDef = itemDef(weaponId);
    if(!wDef) continue;
    const resolved = _gardenTowerResolveAmmo(cfg, wDef);
    if(!resolved) continue;
    for(const s of servants){
      if(s.type !== 'guard') continue;
      if(!s.assignedPlots || s.assignedPlots.indexOf(i) === -1) continue;
      if((s.stamina || 0) <= 0) continue;
      result.push({
        srv: s,
        towerIdx: i,
        towerCfg: cfg,
        weaponId: weaponId,
        weaponRarity: weaponRarity,
        weaponDef: wDef,
        ammoId: resolved.id,
        ammoRarity: resolved.rarity
      });
    }
  }
  return result;
}

function _gardenRaidGenEnemies(){
  const regions = (typeof getActiveRegions === 'function') ? getActiveRegions() : ['廢棄工廠'];
  const region = (state.activeRegion && regions.indexOf(state.activeRegion) !== -1) ? state.activeRegion : regions[0];
  const R = REGIONS[region];
  if(!R) return { enemies: [], region: region };
  const lv = (state.player && state.player.level) || 1;
  let count = 2 + Math.floor(lv / 5);
  count = Math.min(8, count);
  const mult = R.enemyHpMult || 1;
  const enemies = [];
  for(let i = 0; i < count; i++){
    const eid = pick(R.enemies);
    const e = ENEMIES[eid];
    if(!e) continue;
    const hp = Math.round(e.hp * mult);
    enemies.push({
      id: eid,
      name: e.name,
      hp: hp, maxHp: hp,
      armor: 0, maxArmor: 0,
      armorLevel: e.armorLevel || 1,
      dmg: e.dmg || 10,
      pen: e.pen || 0
    });
  }
  return { enemies: enemies, region: region };
}

function _raidCleanupAll(){
  const sels = ['.raid-overlay','.raid-guard','.raid-enemy','.raid-enemy-zone','.raid-side','.raid-unit','.raid-sprite','.raid-proj','.raid-dmg','.raid-float','.raid-banner-win','.raid-banner-lose','.raid-unit-sprite','.raid-unit-hpwrap','.raid-unit-name','.raid-hp-wrap','.raid-name','.raid-hp'];
  for(const sel of sels){
    const all = document.querySelectorAll(sel);
    for(let i = all.length - 1; i >= 0; i--){ try{ all[i].remove(); }catch(e){} }
  }
}

function _raidDrawWorkerHelmet(ctx, B, anim, fi, color){
  const L = GAME_LAYERS.find(function(l){ return l.id === 'head'; });
  if(!L) return;
  const keys = anim.keys[L.id] || [];
  const key = keys[fi] || {rot:0, dx:0, dy:0};
  const cx = B.x + B.w * (L.x + (key.dx||0) * 0.01);
  const cy = B.y + B.h * (L.y + (key.dy||0) * 0.01);
  const w = B.w * L.w;
  const h = B.h * L.h;
  const px = w * L.pivot.x;
  const py = h * L.pivot.y;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((key.rot || 0) * Math.PI / 180);
  ctx.translate(-px, -py);
  const cxL = w * 0.5;
  const cyL = h * 0.45;
  const r = w * 0.72;
  ctx.fillStyle = color;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cxL, cyL, r, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}
/* rev304: 灰桶繪製 —— 上寬下窄梯形，中心對齊前後臂中點連線中點 */
function drawBucketUnit(ctx, u){
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(u.bx - u.topHalf, u.topY);
  ctx.lineTo(u.bx + u.topHalf, u.topY);
  ctx.lineTo(u.bx + u.botHalf, u.botY);
  ctx.lineTo(u.bx - u.botHalf, u.botY);
  ctx.closePath();
  ctx.fillStyle = '#9aa2aa';
  ctx.fill();
  ctx.strokeStyle = '#464d55';
  ctx.lineWidth = 5;
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.restore();
}
/* rev306: 手持農具 —— 農民木棍（棕）/ 監工藍板 */
function drawHandItemUnit(ctx, u){
  if(u.handItemType === 'sack'){
    const cx = u.bagX;
    const cy = u.bagY;
    ctx.save();
    ctx.fillStyle = '#ede4d3';
    ctx.strokeStyle = '#464d55';
    ctx.lineWidth = 5;
    ctx.lineJoin = 'round';
    const topW = 42, topH = 31;
    ctx.beginPath();
    ctx.moveTo(cx - topW/2, cy - topH);
    ctx.lineTo(cx + topW/2, cy - topH);
    ctx.lineTo(cx, cy);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    const botW = 87, botH = 87;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + botW/2, cy + botH);
    ctx.lineTo(cx - botW/2, cy + botH);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  } else if(u.handItemType === 'shovel'){
    /* 從頂點往下組裝：D 形把手 36 → 柄 148 → 鏟頭 57 */
    const ax = u.anchorX;
    const ay = u.anchorY;
    const D_W = 30, D_H = 36;
    const HANDLE_LEN = 148, HANDLE_W = 6;
    const HEAD_W = 45, HEAD_H = 57;
    const forkY = ay + D_H;
    const handleBot = forkY + HANDLE_LEN;
    const headBot = handleBot + HEAD_H;
    ctx.save();
    /* D 形把手 */
    ctx.strokeStyle = '#9a9a9a';
    ctx.lineWidth = HANDLE_W;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(ax, forkY);
    ctx.lineTo(ax - D_W/2, ay);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(ax, forkY);
    ctx.lineTo(ax + D_W/2, ay);
    ctx.stroke();
    ctx.lineWidth = HANDLE_W + 2;
    ctx.beginPath();
    ctx.moveTo(ax - D_W/2, ay);
    ctx.lineTo(ax + D_W/2, ay);
    ctx.stroke();
    /* 柄 */
    ctx.lineWidth = HANDLE_W;
    ctx.lineCap = 'butt';
    ctx.beginPath();
    ctx.moveTo(ax, forkY);
    ctx.lineTo(ax, handleBot);
    ctx.stroke();
    /* 鏟頭 */
    ctx.fillStyle = '#8a8f95';
    ctx.strokeStyle = '#464d55';
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(ax - HEAD_W/2, handleBot);
    ctx.lineTo(ax + HEAD_W/2, handleBot);
    ctx.lineTo(ax + HEAD_W/2 + 2, headBot);
    ctx.lineTo(ax - HEAD_W/2 - 2, headBot);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    /* 中央脊線 */
    ctx.strokeStyle = '#5a6068';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ax, handleBot + 5);
    ctx.lineTo(ax, headBot - 8);
    ctx.stroke();
    ctx.restore();
  } else if(u.handItemType === 'clipboard'){
    const w = 90, h = 110;
    const cx = u.armMidX;
    const cy = u.armMidY + 7;
    ctx.save();
    ctx.fillStyle = '#3a78c8';
    ctx.fillRect(cx - w/2, cy - h/2, w, h);
    ctx.restore();
  } else if(u.handItemType === 'flask'){
    /* rev618: 圓底燒瓶 —— 合併路徑（瓶頸 + 球體下半弧一次 fill/stroke，無重疊斷層） */
    const positions = u.flaskPositions || [];
    const R = 37;         /* 球體半徑 */
    const NECK_W = 26;    /* 頸寬 */
    const NECK_H = 52;    /* 頸高 */
    const halfNeck = NECK_W / 2;
    const BODY_OFFSET = R + NECK_H/2 - 3;
    for(const pos of positions){
      const cx = pos.x;
      const cy = pos.y + BODY_OFFSET;
      const neckTopY = cy - R - NECK_H;
      const neckBottomY = cy - R + 5;  /* 瓶頸底部稍插入球體 5px */
      const _dy = neckBottomY - cy;
      const _angleRight = Math.atan2(_dy, halfNeck);
      const _angleLeft = Math.atan2(_dy, -halfNeck);
      ctx.save();
      ctx.fillStyle = 'rgba(80,138,100,0.92)';
      ctx.strokeStyle = '#1f3a2a';
      ctx.lineWidth = 8;
      ctx.lineJoin = 'round';
      /* 合併路徑：瓶頸左上 → 左下 → 球體下半弧（經過底）→ 右上 → closePath */
      ctx.beginPath();
      ctx.moveTo(cx - halfNeck, neckTopY);
      ctx.lineTo(cx - halfNeck, neckBottomY);
      ctx.arc(cx, cy, R, _angleLeft, _angleRight, true);
      ctx.lineTo(cx + halfNeck, neckTopY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      /* 頸口小橫線（開口，左右各延伸 8） */
      ctx.beginPath();
      ctx.moveTo(cx - halfNeck - 8, neckTopY);
      ctx.lineTo(cx + halfNeck + 8, neckTopY);
      ctx.stroke();
      /* 球形液面高光 */
      ctx.fillStyle = 'rgba(180,230,200,0.55)';
      ctx.beginPath();
      ctx.ellipse(cx - R*0.32, cy - R*0.25, R*0.32, R*0.14, -0.4, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();
    }
  }
}
function _raidDrawHuman(ctx, px, py, scale, equipped, equippedRarity, animName, frameIdx, weaponSlotOverride, servantType, flipX, hasBucket, handItem, noWorkerHelmet){
  const anim = GAME_ANIMS[animName] || GAME_ANIMS.idle;
  const fi = ((frameIdx % anim.frameCount) + anim.frameCount) % anim.frameCount;
  const B = { x: 30, y: 30, w: 340, h: 460 };
  const ORIG_FOOT_X = 200;
  const ORIG_FOOT_Y = 515;
  /* rev305: 僕人配色 —— 保留原色調提亮；上衣與褲子分開指定
     farmer  綠  → 提亮綠（保留綠調）
     guard   藍  → 提亮藍（保留藍調）
     foreman 棕  → 黃上衣 / 白褲子 */
  const TYPE_COLORS = {
    farmer:  { body: '#5a9a48', legs: '#3a6a2e' },
    guard:   { body: '#5088bb', legs: '#2e4a6a' },
    foreman: { body: '#e0a830', legs: '#d8d0c0' },
    enemy:   { body: '#8b2a2a', legs: '#3a1010' }
  };
  const _colors = servantType ? TYPE_COLORS[servantType] : null;
  if(_colors){
    for(const L of GAME_LAYERS){
      L._oldColor = L.color;
      if(L.id === 'right_leg' || L.id === 'left_leg') L.color = _colors.legs;
      else if(L.id === 'torso' || L.id === 'back_arm' || L.id === 'front_arm') L.color = _colors.body;
    }
  }
  ctx.save();
  ctx.translate(px, py);
  ctx.scale(flipX ? -scale : scale, scale);
  ctx.translate(-ORIG_FOOT_X, -ORIG_FOOT_Y);
  const units = [];
  for(const L of GAME_LAYERS) units.push({ z: L.z, kind: 'layer', layer: L });
  if(equipped.head){
    const cfg = (typeof HEAD_ARMOR_LAYOUT !== 'undefined' && HEAD_ARMOR_LAYOUT[equipped.head]) ? HEAD_ARMOR_LAYOUT[equipped.head] : HERO_VISIBLE_EQ.head;
    const layerDef = GAME_LAYERS.find(function(l){ return l.id === cfg.layer; });
    if(layerDef){
      const img = getHeroImg('icons/items/' + resolveIconId(equipped.head) + '.png');
      units.push({ z: layerDef.z + 0.5, kind: 'eq', layerId: cfg.layer, ox: cfg.ox, oy: cfg.oy, scale: cfg.scale, rotation: cfg.rotation, img: img });
    }
  }
  if(equipped.top){
    const cfg = getTopCfg(equipped.top);
    const layerDef = GAME_LAYERS.find(function(l){ return l.id === cfg.layer; });
    if(layerDef){
      const img = getHeroImg('icons/items/' + resolveIconId(equipped.top) + '.png');
      units.push({ z: layerDef.z + 0.5, kind: 'eq', layerId: cfg.layer, ox: cfg.ox, oy: cfg.oy, scale: cfg.scale, rotation: cfg.rotation, img: img });
    }
  }
  let wpSlot = null, wpId = null;
  if(weaponSlotOverride && equipped[weaponSlotOverride]){ wpSlot = weaponSlotOverride; wpId = equipped[weaponSlotOverride]; }
  else if(equipped.primary){ wpSlot = 'primary'; wpId = equipped.primary; }
  else if(equipped.secondary){ wpSlot = 'secondary'; wpId = equipped.secondary; }
  else if(equipped.melee){ wpSlot = 'melee'; wpId = equipped.melee; }
  if(wpSlot && wpId){
    const cfg = getWeaponCfg(wpSlot, wpId);
    if(cfg){
      const layerDef = GAME_LAYERS.find(function(l){ return l.id === cfg.layer; });
      if(layerDef){
        const img = getHeroImg('icons/items/' + resolveIconId(wpId) + '.png');
        units.push({ z: layerDef.z - 0.5, kind: 'eq', layerId: cfg.layer, ox: cfg.ox, oy: cfg.oy, scale: cfg.scale, rotation: cfg.rotation, img: img, trim: cfg.trim });
      }
    }
  }
  /* rev304: 堆肥農民手持灰桶（上寬下窄梯形）
     z=58 → 前臂(62)之後、後臂(55)與其餘圖層之前
     桶中心 X = 前臂中點與後臂中點連線的中點 X
     桶上緣 = 該中點 Y - 38（略高於手臂） */
  if(hasBucket){
    const _fa = GAME_LAYERS.find(function(l){ return l.id === 'front_arm'; });
    const _ba = GAME_LAYERS.find(function(l){ return l.id === 'back_arm'; });
    if(_fa && _ba){
      const _fk = (anim.keys && anim.keys[_fa.id] && anim.keys[_fa.id][fi]) || {rot:0,dx:0,dy:0};
      const _bk = (anim.keys && anim.keys[_ba.id] && anim.keys[_ba.id][fi]) || {rot:0,dx:0,dy:0};
      const _fCx = B.x + B.w * (_fa.x + (_fk.dx||0) * 0.01);
      const _fCy = B.y + B.h * (_fa.y + (_fk.dy||0) * 0.01);
      const _fW = B.w * _fa.w, _fH = B.h * _fa.h;
      const _fMidX = _fCx + _fW * (0.5 - _fa.pivot.x);
      const _fMidY = _fCy + _fH * (0.5 - _fa.pivot.y);
      const _bCx = B.x + B.w * (_ba.x + (_bk.dx||0) * 0.01);
      const _bCy = B.y + B.h * (_ba.y + (_bk.dy||0) * 0.01);
      const _bW = B.w * _ba.w, _bH = B.h * _ba.h;
      const _bMidX = _bCx + _bW * (0.5 - _ba.pivot.x);
      const _bMidY = _bCy + _bH * (0.5 - _ba.pivot.y);
      const _cx = (_fMidX + _bMidX) / 2;
      const _cy = (_fMidY + _bMidY) / 2;
      units.push({
        z: 58,
        kind: 'bucket',
        bx: _cx,
        topY: _cy - 38,
        botY: _cy + 97,
        topHalf: 54,
        botHalf: 39
      });
    }
  }
  /* rev306: 手持農具 —— 農民木棍 / 監工藍板 */
  if(handItem === 'stick' || handItem === 'clipboard' || handItem === 'flask'){
    const _fa = GAME_LAYERS.find(function(l){ return l.id === 'front_arm'; });
    const _ba = GAME_LAYERS.find(function(l){ return l.id === 'back_arm'; });
    if(_fa && _ba){
      const _fk = (anim.keys && anim.keys[_fa.id] && anim.keys[_fa.id][fi]) || {rot:0,dx:0,dy:0};
      const _bk = (anim.keys && anim.keys[_ba.id] && anim.keys[_ba.id][fi]) || {rot:0,dx:0,dy:0};
      const _fCx = B.x + B.w * (_fa.x + (_fk.dx||0) * 0.01);
      const _fCy = B.y + B.h * (_fa.y + (_fk.dy||0) * 0.01);
      const _fW = B.w * _fa.w, _fH = B.h * _fa.h;
      const _fMidX = _fCx + _fW * (0.5 - _fa.pivot.x);
      const _fMidY = _fCy + _fH * (0.5 - _fa.pivot.y);
      const _bCx = B.x + B.w * (_ba.x + (_bk.dx||0) * 0.01);
      const _bCy = B.y + B.h * (_ba.y + (_bk.dy||0) * 0.01);
      const _bW = B.w * _ba.w, _bH = B.h * _ba.h;
      const _bMidX = _bCx + _bW * (0.5 - _ba.pivot.x);
      const _bMidY = _bCy + _bH * (0.5 - _ba.pivot.y);
      if(handItem === 'stick'){
        units.push({ z: 60, kind: 'handitem', handItemType: 'sack',
                     bagX: _bMidX, bagY: _bMidY });
        /* 鏟子錨定於前臂矩形：頂點 X = 右端 − 10% 寬、頂點 Y = 上緣 − 7 */
        const _shovelX = _fCx + _fW * (1 - _fa.pivot.x) - _fW * 0.10;
        const _shovelY = _fCy + _fH * (0 - _fa.pivot.y) - 7;
        units.push({ z: 59, kind: 'handitem', handItemType: 'shovel',
                     anchorX: _shovelX, anchorY: _shovelY });
      } else if(handItem === 'clipboard'){
        units.push({ z: 58, kind: 'handitem', handItemType: 'clipboard',
                     armMidX: (_fMidX + _bMidX) / 2,
                     armMidY: (_fMidY + _bMidY) / 2 });
      } else if(handItem === 'flask'){
        /* rev615: 蒸餾農民 —— 左右手各一個燒瓶
           z=61：右手在前臂(62)之下，形成「手握瓶頸」視覺
                 左手在後臂(55)之上，仍可見 */
        const _flaskRX = _fCx + _fW * (0.85 - _fa.pivot.x);
        const _flaskRY = _fCy + _fH * (0.5 - _fa.pivot.y);
        const _flaskLX = _bCx + _bW * (0.2 - _ba.pivot.x);
        const _flaskLY = _bCy + _bH * (0.5 - _ba.pivot.y);
        units.push({ z: 61, kind: 'handitem', handItemType: 'flask',
                     flaskPositions: [{x:_flaskLX, y:_flaskLY}, {x:_flaskRX, y:_flaskRY}] });
      }
    }
  }
  units.sort(function(a, b){ return a.z - b.z; });
  for(const u of units){
    if(u.kind === 'layer') drawBodyLayer(ctx, u.layer, B, anim, fi);
    else if(u.kind === 'bucket') drawBucketUnit(ctx, u);
    else if(u.kind === 'handitem') drawHandItemUnit(ctx, u);
    else drawEqLayer(ctx, u, B, anim, fi);
  }
  if(!noWorkerHelmet && servantType === 'foreman') _raidDrawWorkerHelmet(ctx, B, anim, fi, '#ffffff');
  else if(!noWorkerHelmet && servantType === 'farmer') _raidDrawWorkerHelmet(ctx, B, anim, fi, '#ff8800');
  ctx.restore();
  if(_colors){
    for(const L of GAME_LAYERS){
      if(typeof L._oldColor !== 'undefined'){ L.color = L._oldColor; delete L._oldColor; }
    }
  }
}





function _raidDrawEnemy(ctx, px, py, scale, animName, frameIdx, enemyId){
  /* rev514: REGIONS.enemies 用 ghoul/raider/raider_vet；HUMAN_ENEMY_DATA 键為 human_ghoul 等 */
  var _realId = enemyId;
  if(typeof HUMAN_ENEMY_DATA !== "undefined"){
    if(!HUMAN_ENEMY_DATA[enemyId] && HUMAN_ENEMY_DATA["human_" + enemyId]){
      _realId = "human_" + enemyId;
    }
  }
  /* 人形敌人：走 _rev506_drawHumanCorpse（帶裝備/武器，支持任意動畫） */
  if(typeof HUMAN_ENEMY_DATA !== "undefined" && HUMAN_ENEMY_DATA[_realId]){
    const def = HUMAN_ENEMY_DATA[_realId];
    const anims = def.anims;
    if(!anims) return;
    let anim = anims[animName];
    if(!anim && animName === 'walk') anim = GAME_ANIMS.walk;
    if(!anim) anim = anims.idle;
    if(!anim) return;
    const fi = ((frameIdx % anim.frameCount) + anim.frameCount) % anim.frameCount;
    /* 裝備缓存：每种敌人固定一套（避免每帧随机） */
    if(!window._rev510_raidEquipCache) window._rev510_raidEquipCache = {};
    if(!window._rev510_raidEquipCache[_realId]){
      window._rev510_raidEquipCache[_realId] = (typeof _rev506_getRandomEquip === "function")
        ? _rev506_getRandomEquip(_realId) : null;
    }
    const equip = window._rev510_raidEquipCache[_realId];
    const ox = px - def.canvas.w * scale / 2;
    const oy = py - def.canvas.h * scale;
    const _isDeath = (animName === "death");
    if(typeof _rev506_drawHumanCorpse === "function"){
      _rev506_drawHumanCorpse(ctx, _realId, scale, ox, oy, def, anim, fi, equip, _isDeath);
      return;
    }
  }
  /* 野兽：走 _drawEnemyAt */
  if(typeof _drawEnemyAt === "function"){
    var _bdef = (typeof BEAST_LAYERS !== "undefined" && BEAST_LAYERS[_realId]);
    if(_bdef){
      var _bx = px - _bdef.canvas.w * scale / 2;
      var _by = py - _bdef.canvas.h * scale;
      if(_drawEnemyAt(ctx, _realId, _bx, _by, scale, animName, frameIdx)) return;
    }
  }
  if(typeof BEAST_LAYERS !== "undefined" && BEAST_LAYERS[_realId]) {
    const def = BEAST_LAYERS[_realId];
    const bounds = (typeof getBeastBounds === "function") ? getBeastBounds(def) : null;
    if(bounds) {
      const targetVisualH = 386 * 0.9;
      const actualScale = (targetVisualH * scale) / bounds.h;
      ctx.save();
      ctx.translate(px, py);
      ctx.scale(actualScale, actualScale);
      const centerX = (bounds.minX + bounds.maxX) / 2;
      const bottomY = bounds.maxY;
      ctx.translate(-centerX, -bottomY);
      const world = (typeof resolveBossWorld === "function") ? resolveBossWorld(def, { keys:{} }, 0) : {};
      const sorted = def.layers.slice().sort((a,b)=>a.z - b.z);
      for(const L of sorted) {
        const wp = world[L.id];
        if(!wp) continue;
        const w = def.canvas.w * L.w;
        const h = def.canvas.h * L.h;
        const ppx = w * L.pivot.x;
        const ppy = h * L.pivot.y;
        ctx.save();
        ctx.translate(wp.wx, wp.wy);
        ctx.rotate((L.rot || 0) * Math.PI / 180);
        ctx.translate(-ppx, -ppy);
        if(L.id.indexOf("eye") === 0) {
          ctx.shadowColor = "#ff0000";
          ctx.shadowBlur = 15;
        }
        ctx.fillStyle = L.color;
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = "rgba(0,0,0,0.65)";
        ctx.lineWidth = 2;
        ctx.strokeRect(1, 1, w - 2, h - 2);
        ctx.restore();
      }
      ctx.restore();
      return;
    }
  }

  /* 最终兜底：_raidDrawHuman（原 fallback） */
  if(typeof _raidDrawHuman === "function") {
    const _eq = { head: "ssh68", top: "6b231", primary: "ak74" };
    const _rar = { head: "一般", top: "一般", primary: "一般" };
    _raidDrawHuman(ctx, px, py, scale, _eq, _rar, animName, frameIdx, "primary", "enemy", true, false, null);
  }
}











/* ===== rev238: 腐烂 / 堆肥 / 彈藥回退 ===== */

/* rev553: 守衛槍口世界坐标（用於 raid 子彈起點）
   参數 u：guardUnit（含 x, y, equipped, weaponSlot, animName, animFrame）
   参數 scale：raid 中的 SCALE
   返回 { x, y }（畫布內世界坐标）；無武器時返回 null，调用方用舊偏移 fallback */
function _getRaidMuzzleWorld(u, scale){
  if(!u || !u.equipped || !u.weaponSlot) return null;
  const wpId = u.equipped[u.weaponSlot];
  if(!wpId) return null;
  const cfg = getWeaponCfg(u.weaponSlot, wpId);
  if(!cfg || !cfg.trim) return null;
  const mz = WEAPON_MUZZLE[resolveIconId(wpId)];
  if(!mz) return null;
  const L = GAME_LAYERS.find(function(l){ return l.id === cfg.layer; });
  if(!L) return null;

  const B = { x: 30, y: 30, w: 340, h: 460 };
  const anim = GAME_ANIMS[u.animName] || GAME_ANIMS.idle;
  if(!anim) return null;
  const fi = ((u.animFrame % anim.frameCount) + anim.frameCount) % anim.frameCount;
  const key = (anim.keys[L.id] && anim.keys[L.id][fi]) || {rot:0, dx:0, dy:0};

  const cx = B.x + B.w * (L.x + (key.dx||0) * 0.01);
  const cy = B.y + B.h * (L.y + (key.dy||0) * 0.01);
  const w = B.w * L.w;
  const h = B.h * L.h;
  const anchorX = cx + w * (cfg.ox || 0);
  const anchorY = cy + h * (cfg.oy || 0);

  const baseW = cfg.trim.w * (cfg.scale || 1);
  const baseH = cfg.trim.h * (cfg.scale || 1);
  const mzlX = anchorX + (mz.x / cfg.trim.w) * baseW;
  const mzlY = anchorY - baseH / 2 + (mz.y / cfg.trim.h) * baseH;

  return {
    x: u.x + scale * (mzlX - 200),
    y: u.y + scale * (mzlY - 515)
  };
}

function _gardenHasPlotType(type){
  const plots = _gardenGetPlots();
  for(let i = 0; i < plots.length; i++){
    const p = plots[i];
    if(p && p.type === type) return true;
  }
  return false;
}

function _gardenFoodTtlMs(){
  if(_gardenHasPlotType('fridge')) return 48 * 3600 * 1000;
  return 24 * 3600 * 1000;
}

const GARDEN_SEED_ROT_MS = 48 * 3600 * 1000;
function _gardenStorageRotCheck(){
  if(!state.garden) return { changed: false, report: null };
  if(!state.garden.storageBatches || typeof state.garden.storageBatches !== "object") state.garden.storageBatches = {};
  const g = _gardenMerchantInit();
  if(typeof g.compostValue !== "number"){ g.compostValue = (typeof g.compostAccelSec === "number") ? g.compostAccelSec : 0; delete g.compostAccelSec; }
  const storage = _gardenStorageInit();
  const hasCompost = _gardenHasPlotType("compost");
  const ttl = _gardenFoodTtlMs();
  const now = Date.now();
  const seedsToAdd = [];
  const report = { rotted: 0, composted: 0, seeds: 0, accelSec: 0 };
  let changed = false;
  /* 補全 storage 中沒有 batch 記錄的 key：
     作物：addedAt=0（舊存檔立即腐爛，兼容原行為）
     種子：addedAt=now（從現在開始計 48h，不立即腐爛） */
  for(const _sk in storage){
    if(storage[_sk] <= 0) continue;
    const _sp = _sk.split("@");
    const _id = _sp[0];
    const _isCrop = (typeof CROPS !== "undefined" && CROPS[_id]);
    const _isSeed = (typeof SEEDS !== "undefined" && SEEDS[_id]);
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
    const parts = k.split("@");
    const itemId = parts[0], rar = parts[1];
    const _isCrop = (typeof CROPS !== "undefined" && CROPS[itemId]);
    const _isSeed = (typeof SEEDS !== "undefined" && SEEDS[itemId]);
    if(!_isCrop && !_isSeed){ delete state.garden.storageBatches[k]; continue; }
    const keep = [];
    let removed = 0;
    if(_isSeed){
      /* ★ 種子：48h 到期直接刪除，不進 report（無提示） */
      for(const b of batches){
        if(now - b.addedAt < GARDEN_SEED_ROT_MS){ keep.push(b); continue; }
        removed += b.count;
      }
    } else {
      /* 作物：保持原邏輯（ttl → 堆肥/種子） */
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

function _gardenTowerResolveAmmo(cfg, wDef){
  if(!wDef || !wDef.cal) return null;
  const cal = wDef.cal;
  const setAmmo = cfg.ammoId;
  const setRarity = setAmmo ? ((AMMO[setAmmo] && AMMO[setAmmo].rarity) || '一般') : null;
  if(setAmmo){
    const c = invCount(setAmmo, setRarity);
    if(c > 0) return { id: setAmmo, rarity: setRarity, count: c };
  }
  const list = [];
  for(const k in state.inventory){
    const p = k.split('@');
    const id = p[0], rar = p[1];
    const d = AMMO[id];
    if(!d || d.cal !== cal) continue;
    if(setRarity){
      const idx = RARITY_ORDER.indexOf(rar);
      const sIdx = RARITY_ORDER.indexOf(setRarity);
      if(idx < 0 || sIdx < 0) continue;
      if(idx >= sIdx) continue;
    }
    const cnt = state.inventory[k];
    if(cnt <= 0) continue;
    list.push({ id: id, rarity: rar, count: cnt });
  }
  if(!list.length) return null;
  list.sort(function(a, b){
    const ra = sortByRarityDesc(b, a);
    if(ra !== 0) return ra;
    return b.count - a.count;
  });
  return list[0];
}
/* ===== end rev238 ===== */

function _gardenRaidStart(guards){
  const gen = _gardenRaidGenEnemies();
  if(!gen.enemies.length) return;
  _gardenRaidShowBattle(guards, gen.enemies, gen.region);
}

function _gardenRaidApplyResult(sim, region){
  for(const g of sim.guards){
    if(!g.ammoId) continue;
    const used = Math.min(g.ammoUsed, g.ammoBudget);
    if(used > 0) invRemove(g.ammoId, g.ammoRarity, used);
  }
  const died = sim.guards.filter(function(g){ return !g.alive; });
  if(died.length){
    const toRemove = {};
    for(const g of died) toRemove[g.srv.id] = true;
    state.servants = (state.servants || []).filter(function(s){ return !toRemove[s.id]; });
  }
  if(!sim.win){
    if(sim.brokenPlots === undefined){
    const plots = _gardenGetPlots();
    let n = 1;
    if(sim.guards.filter(function(g){ return g.alive; }).length === 0) n = 3;
    const candidates = [];
    for(let i = 0; i < 20; i++){
      const p = plots[i];
      if(!p || !p.type) continue;
      if(p.broken) continue;
      candidates.push(i);
    }
    const broken = [];
    for(let k = 0; k < n && candidates.length; k++){
      const pos = Math.floor(Math.random() * candidates.length);
      const idx = candidates.splice(pos, 1)[0];
      const p = plots[idx];
      p.broken = true;
      if(p.crop) p.crop = null;
      broken.push(idx);
    }
    sim.brokenPlots = broken;
    }
    const storage = _gardenStorageInit();
    const stolen = [];
    const cropKeys = [];
    for(const k in storage){
      if(storage[k] <= 0) continue;
      const id = k.split('@')[0];
      if(CROPS[id]) cropKeys.push(k);
    }
    const stealN = Math.min(3, cropKeys.length);
    for(let k = 0; k < stealN; k++){
      const pos = Math.floor(Math.random() * cropKeys.length);
      const key = cropKeys.splice(pos, 1)[0];
      const parts = key.split('@');
      const amount = Math.max(1, Math.floor(storage[key] * 0.3));
      storage[key] -= amount;
      if(storage[key] <= 0) delete storage[key];
      stolen.push({ id: parts[0], rarity: parts[1], count: amount });
    }
    sim.stolen = stolen;
    const raid = _gardenRaidInit();
    raid.loses++;
  } else {
    const raid = _gardenRaidInit();
    raid.wins++;
    const pool = ['wood','metal','screws','cloth','gears','electronics'];
    const loot = [];
    const n = 5 + Math.floor(Math.random() * 6);
    for(let i = 0; i < n; i++){
      const id = pool[Math.floor(Math.random() * pool.length)];
      const rar = rollRarity();
      invAdd(id, rar, 1);
      loot.push({ id: id, rarity: rar, count: 1 });
    }
    sim.loot = loot;
  }
  _gardenRaidLogBattle(sim, region);
  save();
  renderGardenGrid();
  renderGardenContent();
}

function _gardenRaidLogBattle(sim, region){
  const g = _gardenMerchantInit();
  if(!Array.isArray(g.battleLog)) g.battleLog = [];
  const ammoMap = {};
  const guardAmmoList = [];
  for(const gd of sim.guards){
    const used = gd.ammoId ? Math.min(gd.ammoUsed, gd.ammoBudget) : 0;
    guardAmmoList.push({
      name: gd.name,
      coord: (typeof plotCoordName === 'function' && gd.towerIdx != null) ? plotCoordName(gd.towerIdx) : '',
      alive: !!gd.alive,
      ammoName: gd.ammoId ? (AMMO[gd.ammoId] ? AMMO[gd.ammoId].name : gd.ammoId) : '無彈藥',
      ammoRarity: gd.ammoRarity || '一般',
      count: used,
      dmg: gd.dmgDone || 0
    });
    if(used > 0){
      const key = gd.ammoId + '@' + gd.ammoRarity;
      if(!ammoMap[key]) ammoMap[key] = { id: gd.ammoId, rarity: gd.ammoRarity, name: (AMMO[gd.ammoId] ? AMMO[gd.ammoId].name : gd.ammoId), count: 0 };
      ammoMap[key].count += used;
    }
  }
  let totalDmg = 0;
  for(const gd of sim.guards) totalDmg += (gd.dmgDone || 0);
  const entry = {
    t: Date.now(),
    win: sim.win,
    region: region,
    rounds: sim.rounds,
    enemyCount: sim.enemies.length,
    guardTotal: sim.guards.length,
    guardAlive: sim.guards.filter(function(x){ return x.alive; }).length,
    ammoUsed: Object.keys(ammoMap).reduce(function(s, k){ return s + ammoMap[k].count; }, 0),
    ammoDetail: Object.keys(ammoMap).map(function(k){ return ammoMap[k]; }),
    guardAmmoList: guardAmmoList,
    totalDmg: totalDmg,
    broken: sim.brokenPlots ? sim.brokenPlots.map(function(i){ return plotCoordName(i); }) : [],
    stolen: sim.stolen ? sim.stolen.map(function(x){ return { id: x.id, rarity: x.rarity || '一般', name: (CROPS[x.id] ? CROPS[x.id].name : x.id), count: x.count }; }) : [],
    loot: sim.loot ? sim.loot.map(function(x){ const d = itemDef(x.id); return { id: x.id, rarity: x.rarity || '一般', name: d ? d.name : x.id, count: x.count }; }) : []
  };
  if(!Array.isArray(g.battleLog)) g.battleLog = [];
  g.battleLog.push(entry);
  if(g.battleLog.length > 30) g.battleLog.splice(0, g.battleLog.length - 30);
}

/* ===== rev205: 即時戰鬥日誌（底部頁簽） ===== */
window._raidLiveLog = [];
window._raidLiveActive = false;
function _raidLiveLogPush(text, cls){
  if(typeof text !== 'string'){
    if(text && text.nodeType === 1) text = text.textContent || '';
    else if(text == null) text = '';
    else text = String(text);
  }
  if(/^\[object /.test(text)) return;
  if(!window._raidLiveLog) window._raidLiveLog = [];
  window._raidLiveLog.push({ text: text, cls: cls || '' });
  if(window._raidLiveLog.length > 300) window._raidLiveLog.shift();
  if(!window._raidLiveActive) return;
  if(typeof _gardenUpdateBattleCol === 'function') _gardenUpdateBattleCol();
}
function _esc(s){ return String(s).replace(/[&<>]/g, function(c){ return c === '&' ? '&amp;' : (c === '<' ? '&lt;' : '&gt;'); }); }
/* ===== end rev205 ===== */
const _RARITY_COLOR = { '破舊':'#b87333', '一般':'#e0e0e0', '庫存':'#4caf50', '精品':'#2196f3', '傳奇':'#ffb300', '具名':'#a45ede' };

function _mergeLoot(items){
  const map = {};
  const order = [];
  for(const it of items){
    const k = (it.id || it.name) + '@' + (it.rarity || '一般');
    if(!map[k]){
      map[k] = { id: it.id, name: it.name, rarity: it.rarity || '一般', count: 0 };
      order.push(k);
    }
    map[k].count += it.count;
  }
  return order.map(function(k){ return map[k]; });
}
function _lootHtml(items, color){
  if(!items || !items.length) return '';
  const merged = _mergeLoot(items);
  return merged.map(function(it){
    const _c = _RARITY_COLOR[it.rarity] || color || '#ddd';
    return '<span style="color:' + _c + '">' + it.name + '×' + it.count + '</span>';
  }).join(' ');
}



function _gardenRaidShowBattle(guards, enemies, region){
  if(window._raidLiveActive){ console.warn('[raid] raid 已在進行中，忽略重複觸發'); return; }
  const page = document.getElementById('garden-page');
  if(!page) return;
  const wrap = page.querySelector('.gp-grid-wrap');
  const grid = page.querySelector('#gp-grid');
  if(!wrap || !grid) return;
  _raidCleanupAll();
  wrap.style.position = 'relative';
  window._raidLiveLog = [];
  window._raidLiveActive = true;
  window._raidSurrenderWorkers = false;
  if(typeof _gardenUpdateBattleCol === 'function') setTimeout(_gardenUpdateBattleCol, 50);
  try {
    const _txtNodes = [];
    const _walk = function(node){
      if(node.nodeType === 3){
        if(node.textContent && /\[object /.test(node.textContent)) _txtNodes.push(node);
      } else if(node.nodeType === 1){
        if(node.children.length === 0 && node.textContent && /^\s*\[object /.test(node.textContent)){
          node.textContent = '';
        } else {
          for(let i = 0; i < node.childNodes.length; i++) _walk(node.childNodes[i]);
        }
      }
    };
    _walk(document.body);
    for(const n of _txtNodes){ try{ n.textContent = ''; }catch(e){} }
  } catch(e){}
  _gardenActiveTab = 'log';
  if(typeof renderGardenTabs === 'function') renderGardenTabs();
  if(typeof renderGardenContent === 'function') renderGardenContent();

  requestAnimationFrame(function(){
    const wrapRect = wrap.getBoundingClientRect();
    let wrapW = wrapRect.width || 320;
    let wrapH = wrapRect.height || 320;

    const overlay = document.createElement('div');
    overlay.id = 'raid-overlay';
    overlay.className = 'raid-overlay';
    overlay.innerHTML = '<canvas class="raid-canvas" id="raid-canvas"></canvas>';
    wrap.appendChild(overlay);

    const canvas = overlay.querySelector('#raid-canvas');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(wrapW * dpr));
    canvas.height = Math.max(1, Math.floor(wrapH * dpr));
    canvas.style.width = wrapW + 'px';
    canvas.style.height = wrapH + 'px';
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;

    const logEntries = window._raidLiveLog = [];
    function addLog(text, cls){ _raidLiveLogPush(text, cls); }

    const CHAR_PX = Math.min(74, Math.max(40, Math.floor(wrapH * 0.18)));
    const SCALE = CHAR_PX / 386;
    const MUZZLE_X_RIGHT = CHAR_PX * 0.60;
    const MUZZLE_X_LEFT = CHAR_PX * 0.60;
    const MUZZLE_Y_UP = CHAR_PX * 0.85;

    const guardUnits = [];
    for(const g of guards){
      const plotEl = grid.querySelector('.gp-plot[data-idx="' + g.towerIdx + '"]');
      if(!plotEl) continue;
      const pr = plotEl.getBoundingClientRect();
      const equipped = { head: null, top: null, primary: null, secondary: null, melee: null };
      const equippedRarity = {};
      const cfg = g.towerCfg || {};
      const eqCfg = cfg.eq || {};
      const eqRar = cfg.eqRarity || {};
      for(const s of ['head','top','primary','secondary']){
        if(eqCfg[s]){ equipped[s] = eqCfg[s]; equippedRarity[s] = eqRar[s] || '一般'; }
      }
      const weaponSlot = equipped.primary ? 'primary' : (equipped.secondary ? 'secondary' : null);
      const s = g.srv;
      const maxHp = (typeof servantMaxHp === 'function') ? servantMaxHp(s) : (100 + s.lv * 20);
      let armor = 0, armorLevel = 0;
      for(const slot of ['head','top']){
        const id = eqCfg[slot];
        if(!id) continue;
        const rar = eqRar[slot] || '一般';
        armor += (typeof equipArmorValue === 'function') ? equipArmorValue(id, rar) : 0;
        const d = ARMOR[id];
        if(d && d.level) armorLevel = Math.max(armorLevel, d.level);
      }
      const scopeBonus = g.weaponDef.scopeBonus || 0;
      const hitRate = (typeof servantHitRate === 'function') ? servantHitRate(s, '點射', scopeBonus) : 20;
      const ammoId = g.ammoId || cfg.ammoId;
      const ammoRarity = g.ammoRarity || (ammoId ? ((AMMO[ammoId] && AMMO[ammoId].rarity) || '一般') : '一般');
      const critRate = (typeof servantCritRate === 'function') ? servantCritRate(g.weaponRarity, ammoRarity) : 0.1;
      const critMult = (typeof servantCritMult === 'function') ? servantCritMult(g.weaponRarity, ammoRarity) : 1.5;
      const magCap = g.weaponDef.mag || 30;
      const stock = ammoId ? invCount(ammoId, ammoRarity) : 0;
      const ms = cfg.maxShots || 'inf';
      let budget;
      if(ms === 'skip') budget = 0;
      else if(ms === 'mag') budget = Math.min(stock, magCap);
      else budget = stock;
      guardUnits.push({
        srv: s, name: servantLabel(s) + ' Lv.' + s.lv,
        rpm: g.weaponDef.rpm || 600,
        x: pr.left - wrapRect.left + pr.width / 2,
        y: pr.top - wrapRect.top + pr.height - 4,
        hp: maxHp, maxHp: maxHp,
        armor: armor, maxArmor: armor, armorLevel: armorLevel,
        alive: true, isGuard: true,
        weaponDef: g.weaponDef, weaponRarity: g.weaponRarity,
        towerCfg: g.towerCfg, towerIdx: g.towerIdx,
        equipped: equipped, equippedRarity: equippedRarity, weaponSlot: weaponSlot,
        ammoId: ammoId, ammoRarity: ammoRarity, ammoStock: stock,
        ammoBudget: budget, ammoUsed: 0, magCap: magCap,
        hitRate: hitRate, critRate: critRate, critMult: critMult,
        animName: 'idle', animFrame: 0, animNext: 0, hurtUntil: 0,
        nextFireAt: 0
      });
    }
    window._raidGuardUnits = guardUnits;

    const enemyUnits = [];
    const _n = enemies.length;
    let _cols;
    if(_n <= 3) _cols = 1;
    else if(_n <= 6) _cols = 2;
    else _cols = 3;
    const _colGap = 50;
    const _rightBase = wrapW - 30;
    const _rowsPerCol = Math.ceil(_n / _cols);
    const _rowGap = Math.min(78, Math.max(52, Math.floor((wrapH - 80) / Math.max(1, _rowsPerCol))));
    for(let i = 0; i < _n; i++){
      const e = enemies[i];
      const _col = i % _cols;
      const _row = Math.floor(i / _cols);
      const _jx = (Math.random() - 0.5) * 16;
      const _jy = (Math.random() - 0.5) * 14;
      const _colX = _rightBase - _col * _colGap + _jx;
      const _rowsInThisCol = (_col === _cols - 1) ? (_n - _col * _rowsPerCol) : _rowsPerCol;
      const _totalH = _rowGap * _rowsInThisCol;
      const _topY = Math.max(60, wrapH / 2 - _totalH / 2 + 30);
      const _y = _topY + _row * _rowGap + _jy;
      enemyUnits.push({
        id: e.id, name: e.name,
        dmg: e.dmg || 10, pen: e.pen || 0, armorLevel: e.armorLevel || 1,
        rpm: 300,
        homeX: _colX, homeY: _y,
        x: wrapW + 120, targetX: _colX, targetY: _y, slideIn: true,
        y: _y,
        hp: e.maxHp, maxHp: e.maxHp,
        armor: 0, maxArmor: 0,
        alive: true, isGuard: false,
        state: 'combat',
        weaponId: 'ak74',
        animName: 'idle', animFrame: 0, animNext: 0, hurtUntil: 0,
        nextFireAt: 0,
        destroyUntil: 0,
        targetFieldIdx: -1,
        gone: false
      });
    }
    window._raidEnemyUnits = enemyUnits;

    const bullets = [];
    const damageTexts = [];
    const MAX_DMG_AGE = 900;
    let battleState = 'combat';
    let lastTickTime = performance.now();
    const brokenPlots = [];
    const _t0 = performance.now();
    for(const g of guardUnits) g.nextFireAt = _t0 + 300 + Math.random() * 500;
    for(const e of enemyUnits) e.nextFireAt = _t0 + 800 + Math.random() * 500;

    function tickAnim(u, now){
      let anim = null;
      if(u.isGuard){
        anim = GAME_ANIMS[u.animName] || GAME_ANIMS.idle;
      } else {
        if(typeof _resolveEnemyAnims === 'function'){
          const _eid = (typeof HUMAN_ENEMY_DATA !== 'undefined' && HUMAN_ENEMY_DATA['human_' + u.id]) ? 'human_' + u.id : u.id;
          const _anims = _resolveEnemyAnims(_eid);
          if(_anims && _anims[u.animName]) anim = _anims[u.animName];
        }
        if(!anim) anim = GAME_ANIMS[u.animName] || GAME_ANIMS.idle;
      }
      if(!anim) return;
      const interval = 1000 / anim.fps;
      if(now >= u.animNext){
        u.animNext = now + interval;
        if(anim.loop){ u.animFrame = (u.animFrame + 1) % anim.frameCount; }
        else { if(u.animFrame < anim.frameCount - 1) u.animFrame++; }
      }
    }

    function drawUnit(u, now){
      if(u.gone) return;
      if(!u.alive && u.animName !== 'death'){
        u.animName = 'death'; u.animFrame = 0; u.animNext = 0;
      }
      tickAnim(u, now);
      let ox = 0;
      if(now < u.hurtUntil){
        const t = 1 - (u.hurtUntil - now) / 220;
        ox += Math.sin(t * Math.PI * 5) * 3;
      }
      ctx.save();
      if(!u.isGuard && u.state === 'running_away'){
        ctx.translate(u.x + ox, 0);
        ctx.scale(-1, 1);
        ctx.translate(-(u.x + ox), 0);
      }
      if(u.isGuard){
        _raidDrawHuman(ctx, u.x + ox, u.y, SCALE, u.equipped, u.equippedRarity, u.animName, u.animFrame, u.weaponSlot, false);
      } else {
        _raidDrawEnemy(ctx, u.x + ox, u.y, SCALE, u.animName, u.animFrame, u.id);
      }
      ctx.restore();
      if(u.alive && u.state === 'combat'){
        const barW = 34, barH = 4;
        const bx = u.x - barW / 2;
        const by = u.y - CHAR_PX - 8;
        ctx.fillStyle = 'rgba(0,0,0,.75)';
        ctx.fillRect(bx - 1, by - 1, barW + 2, barH + 2);
        ctx.fillStyle = '#1a1010';
        ctx.fillRect(bx, by, barW, barH);
        ctx.fillStyle = u.isGuard ? '#4caf50' : '#e05252';
        ctx.fillRect(bx, by, barW * Math.max(0, u.hp / u.maxHp), barH);
      }
    }

    function drawBullet(b){
      ctx.save();
      const _bcol = b.isEnemy ? '#ff6060' : (_RARITY_COLOR[b.rarity] || '#ffd680');
      ctx.fillStyle = _bcol;
      ctx.shadowColor = _bcol;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(b.x, b.y, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    function drawDamage(d, now){
      const age = now - d.startTime;
      if(age > MAX_DMG_AGE) return;
      const t = age / MAX_DMG_AGE;
      let alpha, scale, offY;
      if(t < 0.15){ alpha = t / 0.15; scale = 0.6 + t / 0.15 * 0.7; offY = -t * 10; }
      else { alpha = Math.max(0, 1 - (t - 0.15) / 0.85); scale = 1.3 - (t - 0.15) * 0.4; offY = -10 - (t - 0.15) * 60; }
      ctx.save();
      ctx.globalAlpha = alpha;
      const size = d.crit ? 20 : 15;
      ctx.font = 'bold ' + Math.round(size * scale) + 'px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = d.crit ? '#ff3030' : (d.isEnemy ? '#ff8080' : '#ffd680');
      if(d.text === 'MISS') ctx.fillStyle = '#a89a85';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.strokeText(d.text, d.x, d.y + offY);
      ctx.fillText(d.text, d.x, d.y + offY);
      ctx.restore();
    }

    function guardsAlive(){ return guardUnits.some(function(u){ return u.alive; }); }
    function enemiesAlive(){ return enemyUnits.some(function(u){ return u.alive && u.state === 'combat'; }); }

    function spawnBullet(fromU, toU, hit, isEnemy){
      const sx = fromU.x + (isEnemy ? -MUZZLE_X_LEFT : MUZZLE_X_RIGHT);
      const sy = fromU.y - MUZZLE_Y_UP;
      let tx = toU.x;
      let ty = toU.y - MUZZLE_Y_UP;
      if(!hit){
        tx += (Math.random() - 0.5) * 70;
        ty += (Math.random() - 0.5) * 50;
      }
      let dmg = 0, crit = false;
      if(hit){
        if(isEnemy){
          dmg = fromU.dmg || 10;
        } else {
          const ammo = fromU.ammoId ? AMMO[fromU.ammoId] : null;
          const baseDmg = ammo ? Math.round(ammo.dmg * (RARITY_MULT[fromU.ammoRarity] || 1)) : Math.round((fromU.weaponDef.dmg || 20) * (RARITY_MULT[fromU.weaponRarity] || 1));
          dmg = baseDmg;
          if(Math.random() < fromU.critRate){ dmg = Math.round(dmg * fromU.critMult); crit = true; }
        }
      }
      bullets.push({ sx, sy, tx, ty, x: sx, y: sy, t: 0, speed: 2.5, hit, crit, damage: dmg, isEnemy, fromU, toU, rarity: fromU.isGuard ? (fromU.ammoRarity || '一般') : '一般' });
      const wAnim = isEnemy ? 'hurt' : (fromU.weaponSlot === 'secondary' ? 'fire_secondary' : 'fire_primary');
      fromU.animName = wAnim; fromU.animFrame = 0; fromU.animNext = 0;
      const _fu = fromU;
      setTimeout(function(){
        if(_fu.alive && _fu.animName === wAnim && _fu.state === 'combat'){ _fu.animName = 'idle'; _fu.animFrame = 0; _fu.animNext = 0; }
      }, 160);
    }

    function updateBullets(dt){
      for(let i = bullets.length - 1; i >= 0; i--){
        const b = bullets[i];
        b.t += b.speed * dt;
        if(b.t >= 1){
          b.x = b.tx; b.y = b.ty;
          onBulletHit(b);
          bullets.splice(i, 1);
          continue;
        }
        b.x = b.sx + (b.tx - b.sx) * b.t;
        b.y = b.sy + (b.ty - b.sy) * b.t;
      }
    }

    function onBulletHit(b){
      const toU = b.toU;
      if(!toU || !toU.alive){
        if(!b.hit) addLog(b.fromU.name + ' → ' + toU.name + '：已死', 'miss');
        return;
      }
      if(!b.hit){
        damageTexts.push({ x: toU.x, y: toU.y - CHAR_PX - 18, text: 'MISS', crit: false, isEnemy: b.isEnemy, startTime: Date.now() });
        addLog(b.fromU.name + ' → ' + toU.name + '：MISS', 'miss');
        return;
      }
      const tgt = { hp: toU.hp, armor: toU.armor };
      const pen = b.fromU.isGuard ? (b.fromU.ammoId && AMMO[b.fromU.ammoId] ? (AMMO[b.fromU.ammoId].pen || 0) : (b.fromU.weaponDef.pen || 0)) : (b.fromU.pen || 0);
      const res = applyDamage(tgt, b.damage, pen, toU.armorLevel || 0);
      toU.hp = tgt.hp; toU.armor = tgt.armor;
      const shown = res.hpLost > 0 ? res.hpLost : res.armorLost;
      b.fromU.dmgDone = (b.fromU.dmgDone || 0) + shown;
      if(b.fromU.isGuard && b.fromU.srv) servantAddExp(b.fromU.srv, 2);
      toU.hurtUntil = Date.now() + 180;
      toU.animName = 'hurt'; toU.animFrame = 0; toU.animNext = 0;
      const _tu = toU;
      setTimeout(function(){
        if(_tu.alive && _tu.animName === 'hurt' && _tu.state === 'combat'){ _tu.animName = 'idle'; _tu.animFrame = 0; _tu.animNext = 0; }
      }, 180);
      damageTexts.push({ x: toU.x, y: toU.y - CHAR_PX - 18, text: '-' + shown + (b.crit ? '!' : ''), crit: b.crit, isEnemy: b.isEnemy, startTime: Date.now() });
      addLog(b.fromU.name + ' → ' + toU.name + '：-' + shown + (b.crit ? '!暴擊' : ''), b.isEnemy ? 'enemy' : 'ally');
      if(toU.hp <= 0){
        toU.alive = false;
        toU.animName = 'idle'; toU.animFrame = 0;
        damageTexts.push({ x: toU.x, y: toU.y - CHAR_PX - 30, text: b.isEnemy ? '☠' : '✖', crit: false, isEnemy: b.isEnemy, startTime: Date.now() });
        addLog((b.isEnemy ? '☠ ' : '✖ ') + toU.name + ' 倒下', b.isEnemy ? 'kill' : 'down');
      }
    }

    function triggerSurrender(){
      window._raidSurrenderWorkers = true;
      addLog('🚩 工作僕人投降', 'lose');
      if(typeof _gardenActors !== 'undefined' && _gardenActors.length){
        const _deadGuardIds = {};
        for(const g of guardUnits){
          if(!g.alive && g.srv) _deadGuardIds[g.srv.id] = true;
        }
        _gardenActors = _gardenActors.filter(function(a){ return !_deadGuardIds[a.id]; });
      }
      setTimeout(function(){
        if(battleState !== 'ended' && battleState !== 'ending'){
          console.warn('[raid] 投降后 8 秒未结束，强制结束');
          battleState = 'ending';
          endBattle(false);
        }
      }, 8000);
    }

    function startDestroyPhase(){
      triggerSurrender();
      const plots = _gardenGetPlots();
      for(const e of enemyUnits){
        if(e.gone) continue;
        if(!e.alive){ e.gone = true; e.state = 'dead_before_destroy'; continue; }
      }
      const alive = enemyUnits.filter(function(e){ return e.alive && !e.gone; });
      const candidates = [];
      for(let i = 0; i < plots.length; i++){
        const p = plots[i];
        if(!p || !p.type) continue;
        if(p.broken) continue;
        candidates.push(i);
      }
      let _ci = 0;
      for(const e of alive){
        e.state = 'walk_to_field';
        if(candidates.length){
          const idx = candidates[_ci % candidates.length];
          _ci++;
          e.targetFieldIdx = idx;
          const plotEl = grid.querySelector('.gp-plot[data-idx="' + idx + '"]');
          if(plotEl){
            const pr = plotEl.getBoundingClientRect();
            e.targetX = pr.left - wrapRect.left + pr.width / 2;
            e.targetY = pr.top - wrapRect.top + pr.height - 4;
          } else {
            e.state = 'running_away';
            e.targetX = wrapW + 200;
            e.targetY = e.y;
          }
        } else {
          e.state = 'running_away';
          e.targetX = wrapW + 200;
          e.targetY = e.y;
        }
      }
      addLog('⚔️ 敵人開始破壞田地', 'kill');
    }

    function tickDestroyPhase(now, dt){
      const liveEnemies = enemyUnits.filter(function(e){ return !e.gone; });
      if(!liveEnemies.length){
        if(battleState === 'destroying'){
          battleState = 'ending';
          setTimeout(function(){ endBattle(false); }, 400);
        }
        return;
      }
      const spd = 180 * dt;
      for(const e of liveEnemies){
        if(e.state === 'walk_to_field'){
          const dx = e.targetX - e.x;
          const dy = e.targetY - e.y;
          const d = Math.sqrt(dx*dx + dy*dy);
          if(d < 6){
            e.state = 'destroying';
            e.destroyUntil = now + 2000;
            e.animName = 'idle'; e.animFrame = 0; e.animNext = 0;
            addLog(e.name + ' 開始破壞田地', 'kill');
          } else {
            const step = Math.min(d, spd);
            e.x += (dx / d) * step;
            e.y += (dy / d) * step;
            e.animName = 'walk';
          }
        } else if(e.state === 'destroying'){
          if(now >= e.destroyUntil){
            if(e.targetFieldIdx >= 0){
              const plots = _gardenGetPlots();
              const plot = plots[e.targetFieldIdx];
              if(plot && !plot.broken){
                plot.broken = true;
                if(plot.crop) plot.crop = null;
                brokenPlots.push(e.targetFieldIdx);
                addLog(plotCoordName(e.targetFieldIdx) + ' 被破壞', 'kill');
              }
            }
            e.state = 'running_away';
            e.targetX = wrapW + 200;
            e.targetY = e.y;
          }
        } else if(e.state === 'running_away'){
          const dx = e.targetX - e.x;
          const d = Math.abs(dx);
          if(d < 6){
            e.gone = true;
            e.alive = false;
          } else {
            e.x += Math.sign(dx) * Math.min(d, spd * 1.6);
            e.animName = 'walk';
          }
        }
      }
    }

    function tickCombat(now, dt){
      updateBullets(dt);
      if(battleState === 'combat'){
        for(const g of guardUnits){
          if(!g.alive) continue;
          if(now < g.nextFireAt) continue;
          const alive = enemyUnits.filter(function(e){ return e.alive && e.state === 'combat'; });
          if(!alive.length) break;
          if(g.ammoId){
            if(g.ammoUsed >= g.ammoBudget) continue;
            g.ammoUsed++;
          }
          const target = alive[Math.floor(Math.random() * alive.length)];
          const hit = Math.random() * 100 < g.hitRate;
          spawnBullet(g, target, hit, false);
          g.nextFireAt = now + 60000 / g.rpm;
        }
        for(const e of enemyUnits){
          if(!e.alive || e.state !== 'combat') continue;
          if(now < e.nextFireAt) continue;
          const alive = guardUnits.filter(function(g){ return g.alive; });
          if(!alive.length) break;
          const target = alive[Math.floor(Math.random() * alive.length)];
          const hit = Math.random() * 100 < 75;
          spawnBullet(e, target, hit, true);
          e.nextFireAt = now + 60000 / e.rpm;
        }
        if(!enemiesAlive()){
          battleState = 'ending';
          addLog('⚔️ 防禦成功', 'win');
          setTimeout(function(){ endBattle(true); }, 1200);
          return;
        }
        if(!guardsAlive()){
          battleState = 'destroying';
          addLog('💀 後院失守', 'lose');
          startDestroyPhase();
          return;
        }
      } else if(battleState === 'destroying'){
        tickDestroyPhase(now, dt);
      }
    }


    function endBattle(win){
      if(battleState === 'ended') return;
      battleState = 'ended';
      window._raidLiveActive = false;
      try { window._raidSurrenderWorkers = false; } catch(e){}
      try {
        if(typeof _gardenActors !== 'undefined' && _gardenActors.length){
          for(const a of _gardenActors){ if(a.state === 'surrender') a.state = 'idle'; }
        }
      } catch(e){}
      try {
        var _ovs = document.querySelectorAll('#raid-overlay');
        for(var _oi = 0; _oi < _ovs.length; _oi++){ try{ _ovs[_oi].remove(); }catch(_e){} }
      } catch(e){ console.warn('[endBattle remove ov]', e); }
      try {
        const sim = { log: logEntries, guards: guardUnits, enemies: enemyUnits, win: win, rounds: 1, brokenPlots: brokenPlots.slice() };
        _gardenRaidApplyResult(sim, region);
      } catch(e){ console.warn('[raid apply]', e); }
      try { _gardenActiveTab = 'log'; } catch(e){}
      try { if(typeof renderGardenTabs === 'function') renderGardenTabs(); } catch(e){}
      try { if(typeof renderGardenContent === 'function') renderGardenContent(); } catch(e){}
      try { if(typeof renderGardenGrid === 'function') renderGardenGrid(); } catch(e){}
      try { if(typeof _gardenStartActorLoop === 'function') _gardenStartActorLoop(); } catch(e){ console.warn('[start actor loop]', e); }
      try { if(typeof _gardenStartActorCanvasLoop === 'function') _gardenStartActorCanvasLoop(); } catch(e){ console.warn('[start actor canvas]', e); }
      setTimeout(function(){
        try { if(typeof _gardenSyncActors === 'function') _gardenSyncActors(); } catch(e){}
        try {
          var _acs = document.querySelectorAll('#gp-actor-canvas');
          for(var _ai = 0; _ai < _acs.length; _ai++){
            var _ac = _acs[_ai];
            var _c2 = _ac.getContext('2d');
            if(_c2) _c2.clearRect(0, 0, _ac.width, _ac.height);
          }
        } catch(e){ console.warn('[endBattle clear actor canvas]', e); }
      }, 100);
    }

    function renderLoop(){
      if(!window._raidLiveActive) return;
      if(!page.querySelector('#raid-overlay')) return;
      const nowP = performance.now();
      const dt = Math.min(0.05, (nowP - lastTickTime) / 1000);
      lastTickTime = nowP;
      tickCombat(nowP, dt);
      const nowD = Date.now();
      ctx.clearRect(0, 0, wrapW, wrapH);

      for(const u of enemyUnits){
        if(u.slideIn){
          const diff = u.x - u.targetX;
          if(diff > 1) u.x -= diff * 0.12;
          else { u.x = u.targetX; u.slideIn = false; }
        }
      }

      for(let i = damageTexts.length - 1; i >= 0; i--){
        if(nowD - damageTexts[i].startTime > MAX_DMG_AGE) damageTexts.splice(i, 1);
      }

      for(const u of guardUnits){
        if(!u.alive) continue;
        const barW = 34, barH = 4;
        const bx = u.x - barW / 2;
        const by = u.y - CHAR_PX - 8;
        ctx.fillStyle = 'rgba(0,0,0,.75)';
        ctx.fillRect(bx - 1, by - 1, barW + 2, barH + 2);
        ctx.fillStyle = '#1a1010';
        ctx.fillRect(bx, by, barW, barH);
        ctx.fillStyle = '#4caf50';
        ctx.fillRect(bx, by, barW * Math.max(0, u.hp / u.maxHp), barH);
      }

      for(const u of enemyUnits) drawUnit(u, nowD);
      for(const b of bullets) drawBullet(b);
      for(const d of damageTexts) drawDamage(d, nowD);

      requestAnimationFrame(renderLoop);
    }

    addLog('⚔️ 戰鬥開始 · ' + region, 'round');
    requestAnimationFrame(renderLoop);
  });
}


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
          rowHtml += '<div class="gs-cell filled srv" data-srv-id="' + s.id + '" style="background:' + rarityBg(s.rarity) + ';' + cellStyle + '">' +
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
  body += '<div class="detail-sub">' + srv.rarity + ' · Lv.' + srv.lv + ' · ' + def.name + (srv.resting ? ' · <span style="color:#7a6f60">休息中</span>' : (srv.stamina <= 0 ? ' · <span style="color:#e05252">偷懶中</span>' : '')) + '</div>';
  body += '<div class="stat-line"><span class="k">當前效果</span><span class="v" style="color:#4caf50;font-weight:bold">' + servantLevelEffectText(srv) + '</span></div>';
  body += '<div style="margin:8px 0 4px">';
  body += '<div style="font-size:10px;color:#7a6f60;margin-bottom:3px;display:flex;justify-content:space-between"><span>體力</span><span>' + stam + ' / ' + maxStam + '（' + stamPct + '%）</span></div>';
  body += '<div style="height:6px;background:#1a1510;border-radius:3px;overflow:hidden;border:1px solid #2a231c"><div style="height:100%;width:' + stamPct + '%;background:' + stamColor + '"></div></div>';
  body += '</div>';
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

/* ===== rev155: 僕人任務系統（體力 + 叫醒） ===== */
let _gardenActors = [];
let _gardenActorTimer = null;
const GARDEN_WORK_MS = 4000;
const GARDEN_STAMINA_PER_WORK = 5;
const GARDEN_WAKEUP_RECOVER = 0.30;

function servantExpNeed(lv){ return Math.max(10, lv * 40); }

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

function _gardenUpdateFoodInfo(){
  const el = document.getElementById('gp-food-info');
  if(!el) return;
  const s = _gardenFoodStats();
  const consStr = s.consume > 0 ? '-' + s.consume + '/h' : '0/h';
  const lineStr = s.lineConsume > 0 ? ' <span style="color:#e8a33d">-' + s.lineConsume + '/h</span>' : '';
  const prodStr = s.produce > 0 ? '+' + s.produce + '/h' : '0/h';
  el.innerHTML = '🍲 <b style="color:#fff">' + fmtNum(s.food) + '</b> <span style="color:#e05252">' + consStr + '</span>' + lineStr + ' <span style="color:#4caf50">' + prodStr + '</span>';
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
  if(typeof _isAssignedToDistillery === 'function' && _isAssignedToDistillery(srv)){
    return null;
  }
  const plots = _gardenGetPlots();
  const now = Date.now();
  // 優先：清理腐爛
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
  // 次：收穫（按剩餘腐爛時間升序）
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

  // 統一補 srv / stamina
  for(const a of _gardenActors){
    const srv = (state.servants || []).find(function(s){ return s.id === a.id; });
    a._srv = srv;
    const _effMax = srv ? servantEffectiveMaxStamina(srv) : 0;
    a.effMax = _effMax;
    a.stamina = srv ? Math.min(srv.stamina || 0, _effMax) : 0;
    a.resting = srv ? !!srv.resting : false;
  }

  // 監工找目標
  for(const a of _gardenActors){
    if(a.type !== 'foreman') continue;
    if(a.task) continue;
    if(a.stamina <= 0) continue;
    let target = null, bestDist = Infinity;
    for(const other of _gardenActors){
      if(other === a) continue;
      if(other.stamina > 0) continue;
      if(other.resting) continue;
      /* rev300: 農民 / 守衛 都可被叫醒；排除其他監工 */
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
    // 初始位置
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
    // 守衛：體力 > 0 站哨塔，體力 = 0 偷懒
    if(a.type === 'guard'){
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
          /* rev358: 守衛巡邏狀態機 (走動 -> 停留 -> 走動) */
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
                /* rev361: 守衛巡邏目標太近時強製推遠 */
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

    // 農民 / 監工：休息、偷懶、任務
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
    /* rev357: 堆肥農民體力不足以支撐完整任務時，原地待機，防止抽動 */
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
      /* rev361: 目標點太近時強製推遠，避免原地抽搐 */
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
    if(typeof a.tx !== 'number'){ a.tx = a.x || 0; a.ty = a.y || 0; }
    if(typeof a.x !== 'number'){ a.x = a.tx; a.y = a.ty; }
    if(typeof a._lastRenderTime !== 'number') a._lastRenderTime = now;
    const dt = Math.min(0.1, (now - a._lastRenderTime) / 1000);
    a._lastRenderTime = now;
    let didMove = false;
    const dx = a.tx - a.x, dy = a.ty - a.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if(dist > 0.5){
      /* rev360: 守衛只在格子內踱步，速度放慢至 30% */
      const _actorSpeed = (a.type === 'guard') ? SPEED * 0.3 : SPEED;
      const step = Math.min(dist, _actorSpeed * dt);
      a.x += (dx / dist) * step;
      a.y += (dy / dist) * step;
      didMove = true;
    } else {
      a.x = a.tx; a.y = a.ty;
    }
    const _moving = Math.sqrt(Math.pow(a.tx - a.x, 2) + Math.pow(a.ty - a.y, 2)) > 0.8; /* rev357: 守衛也播走路動畫 */
    let animName = 'idle';
    /* rev359: 移除守衛死鎖，改為統一判斷是否移動 */
    if(_moving) animName = 'walk';
    else if(a.state === 'work') animName = 'fire_primary';
    else animName = 'idle';
const anim = GAME_ANIMS[animName] || GAME_ANIMS.idle;
    if(!a._animStart || a._animName !== animName){
      a._animStart = now;
      a._animName = animName;
      a._animFrame = 0;
    }
    const elapsed = now - a._animStart;
    a._animFrame = Math.floor(elapsed / (1000 / anim.fps)) % anim.frameCount;
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
    /* rev304: 指派到堆肥區的農民 → 手持灰桶 */
    let _hasBucket = false;
    if(a.type === 'farmer' && a._srv && typeof _isAssignedToCompost === 'function'){
      _hasBucket = _isAssignedToCompost(a._srv);
    }
    /* rev306: 手持農具 —— 堆肥農民灰桶 / 一般農民木棍 / 監工藍板 */
    let _handItem = null;
    if(_hasBucket) _handItem = 'bucket';
    /* rev612: 蒸餾室農民 → 雙手各持一個燒瓶 */
    else if(a.type === 'farmer' && a._srv && typeof _isAssignedToDistillery === 'function' && _isAssignedToDistillery(a._srv)) _handItem = 'flask';
    else if(a.type === 'farmer') _handItem = 'stick';
    else if(a.type === 'foreman') _handItem = 'clipboard';
    /* rev361: 朝向記憶，只在有明顯位移時才更新，防止原地抽搐 */
    if(Math.abs(a.tx - a.x) > 2 && !window._raidLiveActive){
      a._facingLeft = (a.tx - a.x) < 0;
    }
    let _facingLeft = (typeof a._facingLeft === 'boolean') ? a._facingLeft : false;
    if(window._raidLiveActive && a.type === 'guard'){ _facingLeft = false; }
    _raidDrawHuman(ctx, a.x, a.y, SCALE, equipped, equippedRarity, animName, a._animFrame, wpSlot, a.type, _facingLeft, _hasBucket, _handItem);
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
    _gardenRenderActors(Date.now());
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
  if(count <= 0){  return; }
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
/* ===== end rev130 ===== */


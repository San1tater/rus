/* ============================================================
   基地
   ============================================================ */
const collapsedSections={weapons:true,types:true,other:true};
function profDisplay(v){v=v||0;if(v>=MAX_PROF_LEVEL)return `Lv.${MAX_PROF_LEVEL} (MAX)`;const capped=Math.min(MAX_PROF_LEVEL,v);const lv=Math.floor(capped),pct=Math.round((capped-lv)*100);return `Lv.${lv} (${pct}%)`;}
/* rev125: 家園輔助函式（偏好設定內嵌為第 4 折疊區） */
const _ccFolded = { weapons: true, types: true, other: true, pref: true };
function _ccToggle(sec){
  _ccFolded[sec] = !_ccFolded[sec];
  const body = document.getElementById('cc-body-' + sec);
  const arrow = document.getElementById('cc-arrow-' + sec);
  if(body) body.style.display = _ccFolded[sec] ? 'none' : 'block';
  if(arrow) arrow.textContent = _ccFolded[sec] ? '▶' : '▼';
}
function _bindPrefEvents(container){
  const getCtx = function(k){
    if(k === 'exp') return state.preferences.ammoExplore;
    if(k === 'cmb') return state.preferences.ammoCombat;
    if(k === 'con') return state.preferences.consume;
    if(k === 'texp') return state.preferences.throwableExplore;
    if(k === 'tcmb') return state.preferences.throwableCombat;
    return null;
  };
  for(const prefix of ['exp','texp']){
    const ctx = getCtx(prefix);
    if(!ctx) continue;
    const pri = container.querySelector('#' + prefix + '-pri');
    if(pri) pri.onchange = (function(c){ return function(){ c.priority = pri.value; save(); }; })(ctx);
    const fb = container.querySelector('#' + prefix + '-fb');
    if(fb) fb.onchange = (function(c){ return function(){ c.fallback = fb.value; save(); }; })(ctx);
  }
  container.addEventListener('change', function(e){
    const t = e.target;
    if(!t || !t.classList || !t.classList.contains('excl-cb')) return;
    const ctx = getCtx(t.dataset.prefix);
    if(!ctx) return;
    const r = t.dataset.r;
    if(!ctx.exclude) ctx.exclude = [];
    const idx = ctx.exclude.indexOf(r);
    if(t.checked){ if(idx < 0) ctx.exclude.push(r); }
    else { if(idx >= 0) ctx.exclude.splice(idx, 1); }
    const label = t.closest('label');
    if(label){
      if(t.checked){ label.style.borderColor = '#e05252'; label.style.background = '#3a1a1a'; label.style.color = '#e05252'; }
      else { label.style.borderColor = '#3a2f25'; label.style.background = '#241d16'; label.style.color = '#a89a85'; }
    }
    save();
  });
  container.addEventListener('click', function(e){
    const t = e.target;
    if(!t) return;
    if(t.tagName === 'INPUT') return;
    const label = t.closest ? t.closest('.excl-label') : null;
    if(!label) return;
    e.preventDefault();
    const cb = label.querySelector('.excl-cb');
    if(!cb) return;
    cb.checked = !cb.checked;
    cb.dispatchEvent(new Event('change', { bubbles: true }));
  });
}
function getControlCenterBody(){
  const p = state.proficiency;
  const pref = state.preferences;
  const types = ['突擊步槍','機槍','衝鋒槍','狙擊槍','手槍','霰彈槍','刀','手榴彈'];
  function secHead(id, title){
    const collapsed = _ccFolded[id];
    return '<div class="cc-sec-head" data-cc-sec="' + id + '" style="display:flex;justify-content:space-between;align-items:center;padding:6px 8px;background:#1a1510;border:1px solid #2a231c;border-radius:5px;margin:8px 0 4px;cursor:pointer;user-select:none"><span style="font-size:11px;color:#e8a33d;font-weight:bold">' + title + '</span><span id="cc-arrow-' + id + '" style="color:#7a6f60;font-size:11px">' + (collapsed ? '▶' : '▼') + '</span></div>';
  }
  let html = '<div class="detail-sub" style="margin-bottom:6px">基地核心 · 熟練度與偏好</div>';
  html += secHead('weapons', '🔫 熟練度（欄位）');
  html += '<div id="cc-body-weapons" style="display:' + (_ccFolded.weapons ? 'none' : 'block') + '">';
  html += '<div class="prof-line"><span>主武器</span><span class="v">' + profDisplay(p.primary) + '</span></div>';
  html += '<div class="prof-line"><span>副武器</span><span class="v">' + profDisplay(p.secondary) + '</span></div>';
  html += '<div class="prof-line"><span>近戰武器</span><span class="v">' + profDisplay(p.melee) + '</span></div>';
  html += '<div class="prof-line"><span>投擲物</span><span class="v">' + profDisplay(p.throwable) + '</span></div>';
  html += '</div>';
  html += secHead('types', '🎯 熟練度（武器）');
  html += '<div id="cc-body-types" style="display:' + (_ccFolded.types ? 'none' : 'block') + '">';
  for(const t of types){ html += '<div class="prof-line"><span>' + t + '</span><span class="v">' + profDisplay(p[t]) + '</span></div>'; }
  html += '</div>';
  html += secHead('other', '🛠️ 其他');
  html += '<div id="cc-body-other" style="display:' + (_ccFolded.other ? 'none' : 'block') + '">';
  html += '<div class="prof-line"><span>物品製造</span><span class="v">' + profDisplay(p.craft) + '</span></div>';
  html += '<div class="prof-line"><span>物品拆解</span><span class="v">' + profDisplay(p.salvage) + '</span></div>';
  html += '<div class="prof-line"><span>物品掉落</span><span class="v">' + profDisplay(p.drop) + '</span></div>';
  html += '</div>';
  html += secHead('pref', '⚙️ 偏好設定');
  html += '<div id="cc-body-pref" style="display:' + (_ccFolded.pref ? 'none' : 'block') + '">';
  html += rarityPolicyBlockHTML('exp','🎯 探索模式彈藥',pref.ammoExplore, true);
  html += rarityPolicyBlockHTML('texp','💣 探索模式手雷',pref.throwableExplore, true);
  html += '</div>';
  return html;
}
function openControlCenter(){
  const ft = el('div','modal-ft');
  ft.innerHTML = '<button class="btn ghost" id="m-close-cc">關閉</button>';
  const bd = openModal({title:'🏛️ 控制中心', body:getControlCenterBody(), footer:ft});
  const _heads = bd.querySelectorAll('[data-cc-sec]');
  for(let _i = 0; _i < _heads.length; _i++){
    (function(h){
      h.onclick = function(){ _ccToggle(h.getAttribute('data-cc-sec')); };
    })(_heads[_i]);
  }
  _bindPrefEvents(bd);
  ft.querySelector('#m-close-cc').onclick = closeModal;
}
function openMerchant(){
  openModal({title:'💰 商人', body:'<div class="empty-hint">商人系統開發中，敬請期待。</div>'});
}
/* ===== rev130: 後院全屏分頁 ===== */
const GARDEN_PLOT_TYPES = {
  soil:    { name: '土地',   icon: '', desc: '種植作物' },
  tower:   { name: '哨塔',   icon: '<span style="color:#e05252;font-weight:bold">✖</span>', desc: '自動防禦' },
  shed:    { name: '工棚',   icon: '🛖', desc: '放置工具與僕人' },
  compost: { name: '堆肥區', icon: '♻️', desc: '轉化腐爛食物' }
,
  fridge:  { name: '保鮮櫃', icon: '🧊', desc: '作物保鮮 24h → 48h' }};
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
    '<div class="gp-header">' +
      '<div class="gp-title">🌱 後院</div>' +
      '<div class="gp-food-info" id="gp-food-info"></div>' +
      '<div class="gp-exit" id="gp-exit">✕ 退出</div>' +
    '</div>' +
    '<div class="gp-grid-wrap">' +
      '<div class="gp-grid" id="gp-grid"></div>' +
    '</div>' +
    '<div class="gp-func">' +
      '<div class="gp-tabs" id="gp-tabs">' + tabsHtml + '</div>' +
      '<div class="gp-content" id="gp-content"></div>' +
    '</div>';
  document.body.appendChild(p);
  p.querySelector('#gp-exit').onclick = closeGarden;

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
  const wrapH = wrap.clientHeight - 40;
  if(wrapW <= 0 || wrapH <= 0) return;
  const gridW = 4 * 64 + 3 * 4;
  const gridH = 5 * 64 + 4 * 4;
  if(gridW <= wrapW && gridH <= wrapH) return;
  const scale = Math.min(wrapW / gridW, wrapH / gridH, 1);
  grid.style.transform = 'scale(' + scale + ')';
  grid.style.transformOrigin = 'center center';
}

function _gardenGetPlots(){
  if(!state.garden || typeof state.garden !== 'object') state.garden = {plots:new Array(20).fill(null), storage:{}};
  if(!Array.isArray(state.garden.plots)) state.garden.plots = new Array(20).fill(null);
  while(state.garden.plots.length < 20) state.garden.plots.push(null);
  if(state.garden.plots.length > 20) state.garden.plots.length = 20;
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
      if(plot.type === 'soil' && plot.crop){
        const st = _gardenCropStatus(plot, now);
        if(st){
          let icon = t.icon, lbl = t.name, extraCls = '';
          if(st.status === 'growing'){ icon = '🌱'; lbl = st.remaining + 's'; }
          else if(st.status === 'mature'){ icon = st.cropIcon; lbl = '成熟'; extraCls = ' mature'; }
          else if(st.status === 'rotten'){ icon = '🥀'; lbl = '腐爛'; extraCls = ' rotten'; }
          else if(st.status === 'cleaning'){ icon = '🧹'; lbl = st.remaining + 's'; extraCls = ' cleaning'; }
          html += '<div class="gp-plot built' + extraCls + '" data-type="' + plot.type + '" data-idx="' + i + '"><div class="gp-plot-icon">' + icon + '</div><div class="gp-plot-lbl">' + lbl + '</div></div>';
        } else {
          if(plot.type === 'soil'){
          html += '<div class="gp-plot built" data-type="' + plot.type + '" data-idx="' + i + '"><div class="gp-plot-lbl">' + t.name + '</div></div>';
        } else {
          if(plot.type === 'soil'){
          html += '<div class="gp-plot built" data-type="' + plot.type + '" data-idx="' + i + '"><div class="gp-plot-lbl">' + t.name + '</div></div>';
        } else {
          if(plot.type === 'soil'){
            html += '<div class="gp-plot built" data-type="' + plot.type + '" data-idx="' + i + '"><div class="gp-plot-lbl">' + t.name + '</div></div>';
          } else {
            html += '<div class="gp-plot built" data-type="' + plot.type + '" data-idx="' + i + '"><div class="gp-plot-icon">' + t.icon + '</div><div class="gp-plot-lbl">' + t.name + '</div></div>';
          }
        }
        }
        }
      } else {
        if(plot.type === 'soil'){
          html += '<div class="gp-plot built" data-type="' + plot.type + '" data-idx="' + i + '"><div class="gp-plot-lbl">' + t.name + '</div></div>';
        } else {
          html += '<div class="gp-plot built" data-type="' + plot.type + '" data-idx="' + i + '"><div class="gp-plot-icon">' + t.icon + '</div><div class="gp-plot-lbl">' + t.name + '</div></div>';
        }
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
  if(plot.type === 'soil'){ openGardenSoilAction(idx); }
  else if(plot.type === 'tower'){ _gardenTowerOpen(idx); }
  else { openGardenPlotDetail(idx); }
}

function openGardenPlotPicker(idx){
  const plots = _gardenGetPlots();
  const body = document.createElement('div');
  body.innerHTML = '<div style="font-size:11px;color:#e8a33d;margin-bottom:8px">選擇要建造的設施</div>';
  for(const key in GARDEN_PLOT_TYPES){
    const t = GARDEN_PLOT_TYPES[key];
    const row = document.createElement('div');
    row.className = 'item-row';
    row.setAttribute('data-type', key);
    const _plotImg = { soil: 'icons/garden/soil.png' };
    const _iconHtml = _plotImg[key] ? ('<img src="' + _plotImg[key] + assetSuffix() + '" style="width:100%;height:100%;object-fit:cover;border-radius:4px" alt="">') : t.icon;
    row.innerHTML = '<div class="icon" style="font-size:20px">' + _iconHtml + '</div><div class="info"><div class="nm">' + t.name + '</div><div class="sub">' + t.desc + '</div></div>';
    body.appendChild(row);
  }
  const bd = openModal({ title: '第 ' + (idx + 1) + ' 格 · 建造', body: body });
  const rows = bd.querySelectorAll('.item-row[data-type]');
  for(let i = 0; i < rows.length; i++){
    (function(row){
      row.onclick = function(){
        const type = row.getAttribute('data-type');
        if(!GARDEN_PLOT_TYPES[type]) return;
        plots[idx] = { type: type, lv: 1, crop: null };
        save();
        closeModal();
        notify('已建造：' + GARDEN_PLOT_TYPES[type].name, 'ok');
        renderGardenGrid();
      };
    })(rows[i]);
  }
}

function openGardenSoilAction(idx){
  const plots = _gardenGetPlots();
  const plot = plots[idx];
  if(!plot || plot.type !== 'soil') return;
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

function openGardenSeedPickerWithRemove(idx){
  const plots = _gardenGetPlots();
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
    const ra = RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity);
    if(ra !== 0) return ra;
    return (a.def.name || '').localeCompare(b.def.name || '', 'zh-Hant');
  });
  let body = '';
  if(!list.length){ body = '<div class="empty-hint">儲備中沒有種子</div>'; }
  else {
    body += '<div style="font-size:11px;color:#e8a33d;margin-bottom:6px">選擇要種植的種子</div>';
    for(const s of list){
      const cropDef = CROPS[s.def.cropId];
      const yieldBase = Math.max(1, Math.round(s.def.baseYield * (RARITY_MULT[s.rarity] || 1)));
      body += '<div class="item-row" data-sid="' + s.id + '" data-srar="' + s.rarity + '">' +
        '<div class="icon" style="font-size:20px">🌰</div>' +
        '<div class="info"><div class="nm ' + rarityClass(s.rarity) + '">' + s.def.name + '</div>' +
        '<div class="sub">' + s.rarity + ' · 生長 ' + Math.round(s.def.growMs/1000) + 's · 收穫約 ' + yieldBase + ' ' + (cropDef ? cropDef.name : '') + '</div></div>' +
        '<div class="cnt">×' + s.count + '</div></div>';
    }
  }
  const ft = document.createElement('div');
  ft.className = 'modal-ft';
  ft.innerHTML = '<button class="btn danger" id="soil-del">拆除</button><button class="btn ghost" id="soil-close">關閉</button>';
  const bd = openModal({ title: '第 ' + (idx + 1) + ' 格 · 土地', body: body, footer: ft });
  ft.querySelector('#soil-close').onclick = closeModal;
  ft.querySelector('#soil-del').onclick = function(){
    plots[idx] = null;
    _clearPlotAssignments(idx);
    save(); closeModal();
    notify('已拆除土地', 'ok');
    renderGardenGrid();
  };
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
  if(!plot || plot.type !== 'soil') return;
  if(plot.crop) return;
  const seed = SEEDS[seedId];
  if(!seed) return;
  if(!gardenStorageRemove(seedId, rarity, 1)){
    notify('種子不足', 'error');
    return;
  }
  const now = Date.now();
  let growMs = seed.growMs;
  if(state.garden && typeof state.garden.compostAccelSec === 'number' && state.garden.compostAccelSec > 0){
    const maxUse = Math.min(state.garden.compostAccelSec, (growMs / 1000) * 0.5);
    if(maxUse > 0){
      growMs = Math.max(1000, Math.round(growMs - maxUse * 1000));
      state.garden.compostAccelSec -= maxUse;
    }
  }
  plot.crop = { seedId: seedId, rarity: rarity, plantedAt: now, matureAt: now + growMs, cleanupUntil: 0 };
  plot.lastSeed = seedId;
  plot.lastRarity = rarity;
  save();
  closeModal();
  notify('已種下：' + seed.name, 'ok');
  renderGardenGrid();
  renderGardenContent();
}

function openGardenCropDetailWithRemove(idx, st){
  const plots = _gardenGetPlots();
  const plot = plots[idx];
  if(!plot) return;
  const ft = document.createElement('div');
  ft.className = 'modal-ft';
  let ftHtml = '';
  if(st.status === 'growing'){
    ftHtml = '<button class="btn danger" id="gp-act-pull">拔除</button><button class="btn danger" id="gp-act-remove">拆除</button><button class="btn ghost" id="gp-act-close">關閉</button>';
  } else if(st.status === 'mature'){
    ftHtml = '<button class="btn primary" id="gp-act-harvest">收穫</button><button class="btn danger" id="gp-act-pull">拔除</button><button class="btn danger" id="gp-act-remove">拆除</button><button class="btn ghost" id="gp-act-close">關閉</button>';
  } else if(st.status === 'rotten'){
    ftHtml = '<button class="btn primary" id="gp-act-clean">清理</button><button class="btn danger" id="gp-act-remove">拆除</button><button class="btn ghost" id="gp-act-close">關閉</button>';
  } else {
    ftHtml = '<button class="btn danger" id="gp-act-remove">拆除</button><button class="btn ghost" id="gp-act-close">關閉</button>';
  }
  ft.innerHTML = ftHtml;
  let body = '';
  body += '<div style="font-size:15px;color:#e8a33d;font-weight:bold;display:flex;align-items:center;gap:8px"><span style="font-size:26px;line-height:1">' + st.cropIcon + '</span><span>' + st.cropName + '</span></div>';
  body += '<div class="detail-sub">第 ' + (idx + 1) + ' 格 · 稀有度：' + st.rarity + '</div>';
  if(st.status === 'growing'){
    body += '<div class="stat-line"><span class="k">狀態</span><span class="v">🌱 生長中</span></div>';
    body += '<div class="stat-line"><span class="k">剩餘</span><span class="v">' + st.remaining + ' 秒</span></div>';
  } else if(st.status === 'mature'){
    body += '<div class="stat-line"><span class="k">狀態</span><span class="v" style="color:#4caf50">✅ 已成熟</span></div>';
  } else if(st.status === 'rotten'){
    body += '<div class="stat-line"><span class="k">狀態</span><span class="v" style="color:#e05252">🥀 已腐爛</span></div>';
  } else if(st.status === 'cleaning'){
    body += '<div class="stat-line"><span class="k">狀態</span><span class="v">🧹 清理中（' + st.remaining + 's）</span></div>';
  }
  openModal({ title: '作物詳情', body: body, footer: ft });
  ft.querySelector('#gp-act-close').onclick = closeModal;
  const pullBtn = ft.querySelector('#gp-act-pull');
  if(pullBtn) pullBtn.onclick = function(){ plot.crop = null; save(); closeModal(); notify('已拔除', 'ok'); renderGardenGrid(); };
  const harvBtn = ft.querySelector('#gp-act-harvest');
  if(harvBtn) harvBtn.onclick = function(){ gardenHarvest(idx); };
  const clnBtn = ft.querySelector('#gp-act-clean');
  if(clnBtn) clnBtn.onclick = function(){ gardenCleanup(idx); };
  const rmvBtn = ft.querySelector('#gp-act-remove');
  if(rmvBtn) rmvBtn.onclick = function(){ plots[idx] = null; save(); closeModal(); notify('已拆除土地', 'ok'); renderGardenGrid(); };
  _clearPlotAssignments(idx);
}
function openGardenPlotDetail(idx){
  const plots = _gardenGetPlots();
  const plot = plots[idx];
  if(!plot) return;
  const t = GARDEN_PLOT_TYPES[plot.type] || {name:'未知', icon:'?', desc:''};
  const ft = document.createElement('div');
  ft.className = 'modal-ft';
  ft.innerHTML = '<button class="btn danger" id="gp-del">拆除</button><button class="btn ghost" id="gp-close">關閉</button>';
  const body = '<div style="font-size:15px;color:#e8a33d;font-weight:bold;display:flex;align-items:center;gap:8px"><span style="font-size:26px;line-height:1">' + t.icon + '</span><span>' + t.name + '</span></div>' +
    '<div class="detail-sub">第 ' + (idx + 1) + ' 格 · Lv.' + (plot.lv || 1) + '</div>' +
    '<div style="font-size:11px;color:#a89a85;line-height:1.6;padding:8px 0">' + (t.desc || '') + '</div>';
  openModal({ title: '格子詳情', body: body, footer: ft });
  ft.querySelector('#gp-close').onclick = closeModal;
  ft.querySelector('#gp-del').onclick = function(){
    plots[idx] = null;
    _clearPlotAssignments(idx);
    save(); closeModal();
    notify('已拆除：' + t.name, 'ok');
    renderGardenGrid();
  };
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

function _gsBlockEx(title, colKey, items, minCells, fallbackIcon, cellStyle, fontStyle){
  const total = Math.max(minCells, items.length);
  const rowsCount = Math.ceil(total / 4);
  let html = '<div class="gs-col">';
  html += '<div class="gs-title">' + title + '</div>';
  html += '<div class="gs-wrap" data-col="' + colKey + '">';
  for(let r = 0; r < rowsCount; r++){
    html += '<div class="gs-row">';
    for(let j = 0; j < 4; j++){
      const idx = r * 4 + j;
      if(idx < total){
        const it = items[idx];
        if(it){
          const icon = fallbackIcon || (it.def && it.def.icon) || '?';
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
    if(SEEDS[id]) seeds.push({id: id, rarity: rar, count: cnt, def: SEEDS[id]});
    else if(CROPS[id]) crops.push({id: id, rarity: rar, count: cnt, def: CROPS[id]});
  }
  const sortFn = function(a, b){
    const ra = RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity);
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
    html += _gsBlockEx('🌰 種子', 'seeds', seeds, MIN_CELLS, '🌰', cellStyle, fontStyle);
    html += _gsBlockEx('🌾 作物', 'crops', crops, MIN_CELLS, null, cellStyle, fontStyle);
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
const MERCHANT_FOOD_TABLE = {
  0: { food: 0 },
  1: { gears: 1, food: 25 },
  2: { gears: 2, electronics: 1, food: 70 },
  3: { gears: 3, electronics: 2, food: 125 }
};
const MERCHANT_SEED_TABLE = {
  0: { metal: 0, count: 0, rarities: [] },
  1: { metal: 2, count: 4, rarities: ['一般'] },
  2: { metal: 4, gears: 2, count: 10, rarities: ['一般','庫存'] },
  3: { metal: 6, gears: 3, electronics: 3, count: 24, rarities: ['一般','庫存','精品'] }
};
const MERCHANT_THROW_TABLE = {
  0: { metal: 0, count: 0, rarities: [] },
  1: { metal: 2, count: 1, rarities: ['一般'] },
  2: { metal: 4, gears: 2, cloth: 2, count: 2, rarities: ['一般','庫存'] },
  3: { metal: 6, gears: 3, cloth: 5, electronics: 3, count: 2, rarities: ['一般','庫存','精品'] }
};

function _gardenMerchantInit(){
  if(!state.garden) state.garden = { plots:new Array(20).fill(null), storage:{} };
  if(typeof state.garden.food !== 'number') state.garden.food = 0;
  if(!state.garden.merchant || typeof state.garden.merchant !== 'object'){
    state.garden.merchant = { foodLv:0, seedLv:0, throwLv:0, lastFood:0, lastSeed:0, lastThrow:0, lastFeed:0 };
  }
  const m = state.garden.merchant;
  if(typeof m.foodLv !== 'number') m.foodLv = 0;
  if(typeof m.seedLv !== 'number') m.seedLv = 0;
  if(typeof m.throwLv !== 'number') m.throwLv = 0;
  if(typeof m.lastFood !== 'number') m.lastFood = 0;
  if(typeof m.lastSeed !== 'number') m.lastSeed = 0;
  if(typeof m.lastThrow !== 'number') m.lastThrow = 0;
  if(typeof m.lastFeed !== 'number' || !m.lastFeed) m.lastFeed = Date.now();
  if(typeof m.foodPool !== 'number') m.foodPool = 0;
  if(!Array.isArray(m.battleLog)) m.battleLog = [];
  if(!m.matPools || typeof m.matPools !== 'object') m.matPools = { metal:0, gears:0, electronics:0, cloth:0 };
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

function _gardenMerchantFoodPoolFill(target){
  const g = _gardenMerchantInit();
  const m = g.merchant;
  if(!m.foodPool) m.foodPool = 0;
  if(m.foodPool >= target) return true;
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
    if(m.foodPool + gained >= target) break;
    for(let i = 0; i < b.count; i++){
      if(m.foodPool + gained >= target) break;
      gained += b.val;
      toConsume[b.k] = (toConsume[b.k] || 0) + 1;
    }
  }
  if(m.foodPool + gained < target) return false;
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
  m.foodPool += gained;
  return true;
}
function _gardenMerchantLineProcess(lineKey, atTime){
  const g = _gardenMerchantInit();
  const m = g.merchant;
  const now = (typeof atTime === 'number') ? atTime : Date.now();
  function lineCfg(){
    if(lineKey === 'food') return { lvKey:'foodLv', lastKey:'lastFood', table:MERCHANT_FOOD_TABLE };
    if(lineKey === 'seed') return { lvKey:'seedLv', lastKey:'lastSeed', table:MERCHANT_SEED_TABLE };
    if(lineKey === 'throw') return { lvKey:'throwLv', lastKey:'lastThrow', table:MERCHANT_THROW_TABLE };
    return null;
  }
  const L = lineCfg();
  if(!L) return false;
  const lv = m[L.lvKey] || 0;
  if(lv <= 0) return false;
  const last = m[L.lastKey] || 0;
  if(now - last < MERCHANT_INTERVAL_MS) return false;
  const times = Math.min(Math.floor((now - last) / MERCHANT_INTERVAL_MS), 500);
  if(times <= 0) return false;
  const cfg = L.table[lv];
  let did = 0;
  for(let _i = 0; _i < times; _i++){
    let ok = false;
    if(lineKey === 'food'){
      const matCosts = {};
      if(cfg.gears) matCosts.gears = cfg.gears;
      if(cfg.electronics) matCosts.electronics = cfg.electronics;
      const poolBefore = m.foodPool || 0;
      const cropVal = _gardenTotalCropValue();
      if(poolBefore + cropVal + 0.001 < cfg.food) break;
      if(!_gardenMerchantCanPay(matCosts)) break;
      _gardenMerchantTryPay(matCosts);
      _gardenMerchantFoodPoolFill(cfg.food);
      m.foodPool -= cfg.food;
      g.food += cfg.food;
      ok = true;
    } else if(lineKey === 'seed'){
      const matCosts = { metal: cfg.metal };
      if(cfg.gears) matCosts.gears = cfg.gears;
      if(cfg.electronics) matCosts.electronics = cfg.electronics;
      if(!_gardenMerchantTryPay(matCosts)) break;
      const seedIds = Object.keys(SEEDS);
      for(let _k = 0; _k < cfg.count; _k++){
        const sid = seedIds[Math.floor(Math.random() * seedIds.length)];
        const rar = cfg.rarities[Math.floor(Math.random() * cfg.rarities.length)];
        gardenStorageAdd(sid, rar, 1);
      }
      ok = true;
    } else if(lineKey === 'throw'){
      const matCosts = { metal: cfg.metal };
      if(cfg.gears) matCosts.gears = cfg.gears;
      if(cfg.cloth) matCosts.cloth = cfg.cloth;
      if(cfg.electronics) matCosts.electronics = cfg.electronics;
      if(!_gardenMerchantTryPay(matCosts)) break;
      const tIds = ['f1','rgd5','rgo','rgn','vog17','vog25'];
      for(let _k = 0; _k < cfg.count; _k++){
        const tid = tIds[Math.floor(Math.random() * tIds.length)];
        const rar = cfg.rarities[Math.floor(Math.random() * cfg.rarities.length)];
        invAdd(tid, rar, 1);
      }
      ok = true;
    }
    if(!ok) break;
    did++;
  }
  m[L.lastKey] = last + did * MERCHANT_INTERVAL_MS;
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
function _gardenMerchantTick(){
  const g = _gardenMerchantInit();
  const m = g.merchant;

  const now = Date.now();
  let changed = false;
  if(_gardenMerchantLineProcess('food')) changed = true;
  if(_gardenMerchantLineProcess('seed')) changed = true;
  if(_gardenMerchantLineProcess('throw')) changed = true;

  // 每小時整點吃飯（舊每分鐘邏輯已停用）
  if(typeof _gardenMealTick === 'function'){
    try{ if(_gardenMealTick(now)) changed = true; }catch(e){ console.warn('[meal] err', e); }
  }

  if(changed) save();
}

function _gardenFoodStats(){
  const g = _gardenMerchantInit();
  const m = g.merchant;
  let food = Number(g.food);
  if(!isFinite(food)) food = 0;
  let consume = 0;
  const FOOD_COST = { full:3, normal:2, half:1, lick:0.5, starve:0 };
  const servants = state.servants || [];
  for(const s of servants){
    if(!s.assignedPlots || !s.assignedPlots.length) continue;
    consume += (FOOD_COST[s.foodPolicy || 'normal'] || 0) * 60;
  }
  let produce = 0;
  if(m.foodLv > 0) produce = MERCHANT_FOOD_TABLE[m.foodLv].food * 12;
  return { food: food, consume: consume, produce: produce };
}

function _gardenMerchantLineMeta(lineKey){
  if(lineKey === 'food') return { lvKey:'foodLv', lastKey:'lastFood', icon:'🍲', title:'食物生產線', table:MERCHANT_FOOD_TABLE };
  if(lineKey === 'seed') return { lvKey:'seedLv', lastKey:'lastSeed', icon:'🌰', title:'種子補給線', table:MERCHANT_SEED_TABLE };
  if(lineKey === 'throw') return { lvKey:'throwLv', lastKey:'lastThrow', icon:'💣', title:'投擲物生產線', table:MERCHANT_THROW_TABLE };
  return null;
}

function _gardenMerchantCostStr(cfg, lineKey){
  const parts = [];
  if(lineKey === 'food' && cfg.food) parts.push('🍲' + cfg.food);
  if(cfg.metal) parts.push('🔩' + cfg.metal);
  if(cfg.gears) parts.push('⚙️' + cfg.gears);
  if(cfg.electronics) parts.push('💡' + cfg.electronics);
  if(cfg.cloth) parts.push('🧵' + cfg.cloth);
  return parts.length ? parts.join(' ') : '無';
}
function _gardenMerchantProduceStr(cfg, lineKey){
  if(cfg.food) return '🍲' + cfg.food;
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
  for(let lv = 0; lv <= 3; lv++){
    const cfg = meta.table[lv];
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
  openModal({ title: '訂閱', body: body, footer: ft });
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

function renderGardenMerchant(box){
  const g = _gardenMerchantInit();
  const m = g.merchant;
  const now = Date.now();
  const _wrap0 = box.querySelector('.mrc-wrap');
  const _prevScroll = _wrap0 ? (_wrap0.scrollTop || 0) : 0;
  function lineBlock(lineKey){
    const meta = _gardenMerchantLineMeta(lineKey);
    const lv = m[meta.lvKey] || 0;
    const last = m[meta.lastKey] || 0;
    const elapsed = now - last;
    const remainMs = Math.max(0, MERCHANT_INTERVAL_MS - elapsed);
    const remain = Math.ceil(remainMs / 1000);
    const ready = (elapsed >= MERCHANT_INTERVAL_MS) || (last === 0);
    const pct = Math.min(100, Math.max(0, (elapsed / MERCHANT_INTERVAL_MS) * 100));
    let h = '<div class="mrc-card" data-line="' + lineKey + '">';
    h += '<div class="mrc-head">';
    h += '<div class="mrc-title">' + meta.icon + ' ' + meta.title + '</div>';
    let _poolStr = '';
    if(lv > 0){
      const _EMO = { metal:'🔩', gears:'⚙️', electronics:'💡', cloth:'🧵' };
      const _parts = [];
      const _cfg = meta.table[lv];
      const _pools = m.matPools || {};
      if(lineKey === 'food'){
        const _fp = m.foodPool || 0;
        _parts.push('🍲' + (Math.round(_fp * 10) / 10));
      }
      for(const _mid in _EMO){
        if(!_cfg[_mid]) continue;
        const _v = _pools[_mid] || 0;
        _parts.push(_EMO[_mid] + (Math.round(_v * 10) / 10));
      }
      if(_parts.length) _poolStr = ' · 預付 ' + _parts.join(' ');
    }
    h += '<div class="mrc-cur-lv mrc-sub-btn" data-line="' + lineKey + '">' + (lv === 0 ? '訂閱' : 'Lv.' + lv) + _poolStr + '</div>';
    h += '</div>';
    if(lv > 0){
      h += '<div class="mrc-cd-row">';
      h += '<div class="mrc-cd-bar"><div class="fill" style="width:' + pct + '%"></div></div>';
      h += '<div class="mrc-cd-num">' + (ready ? '就緒' : remain + 's') + '</div>';
      h += '</div>';
    } else {
      h += '<div class="mrc-cd-row mrc-cd-off">待機（點擊等級訂閱）</div>';
    }

    h += '</div>';
    return h;
  }
  let html = '<div class="mrc-wrap">';
  html += lineBlock('food');
  html += lineBlock('seed');
  html += lineBlock('throw');
  html += '</div>';
  box.innerHTML = html;
  const _wrap1 = box.querySelector('.mrc-wrap');
  if(_wrap1 && _prevScroll > 0) _wrap1.scrollTop = _prevScroll;
  const btns = box.querySelectorAll('.mrc-sub-btn');
  for(let i = 0; i < btns.length; i++){
    (function(el){
      el.onclick = function(){
        const lineKey = el.getAttribute('data-line');
        if(!lineKey) return;
        _gardenMerchantShowPlans(lineKey);
      };
    })(btns[i]);
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
    notify('修理材料不足（🔩20 🪵10）', 'error');
    return;
  }
  consumeMaterial('metal', 20);
  consumeMaterial('wood', 10);
  p.broken = false;
  save();
  notify('修理完成', 'ok');
  renderGardenGrid();
}
function _gardenTowerOpen(idx){
  const plots = _gardenGetPlots();
  const plot = plots[idx];
  if(!plot || plot.type !== 'tower') return;
  const cfg = _gardenTowerInit(plot);
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
  body += '<div style="font-size:14px;color:#e8a33d;font-weight:bold"><span style="color:#e05252">✖</span> ' + plotCoordName(idx) + ' · Lv.' + (plot.lv||1) + '</div>';
  if(servants.length){
    body += '<div style="font-size:11px;color:#e8a33d;font-weight:bold;margin:8px 0 4px">駐守守衛</div>';
    body += '<div class="tower-guards-row">';
    for(const s of servants){
      const _img = 'icons/servants/' + s.type + '.png' + assetSuffix();
      body += '<div class="tower-guard-btn" data-srv-id="' + s.id + '" style="background:' + rarityBg(s.rarity) + '">' +
        '<img class="tg-icon" src="' + _img + '" alt="">' +
        '<div class="tg-name">Lv.' + s.lv + '</div>' +
        '</div>';
    }
    body += '</div>';
  } else {
    body += '<div style="font-size:10px;color:#5a5040;margin:6px 0">尚未指派守衛（至「僕人」頁簽指派）</div>';
  }
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
  const ft = document.createElement('div');
  ft.className = 'modal-ft';
  ft.innerHTML = '<button class="btn ghost" id="tower-close">關閉</button><button class="btn danger" id="tower-del">拆除</button>';
  const bd = openModal({ title: '哨塔配置', body: body, footer: ft });
  ft.querySelector('#tower-close').onclick = closeModal;
  ft.querySelector('#tower-del').onclick = function(){ _gardenTowerDemolish(idx); };
  const guardBtns = bd.querySelectorAll('.tower-guard-btn[data-srv-id]');
  for(let i = 0; i < guardBtns.length; i++){
    (function(el){
      el.onclick = function(){
        const sid = el.getAttribute('data-srv-id');
        closeModal();
        setTimeout(function(){ openServantDetail(sid); }, 200);
      };
    })(guardBtns[i]);
  }
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
    const ra = RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity);
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
  const bd = openModal({ title: '選擇裝備（' + slot + '）', body: body });
  const unequipBtn = bd.querySelector('[data-act="unequip"]');
  if(unequipBtn){
    unequipBtn.onclick = function(){
      cfg.eq[slot] = null;
      delete cfg.eqRarity[slot];
      save();
      closeModal();
      notify('已卸下', 'ok');
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
        notify('已裝備：' + (itemDef(eid) || {name:eid}).name, 'ok');
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
  const bd = openModal({ title: '選擇彈藥', body: body });
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
  notify('已拆除哨塔', 'ok');
  renderGardenGrid();
}

const GARDEN_RAID_INTERVAL_MS = 4 * 3600 * 1000;

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

function _gardenRaidCollectGuards(){
  const plots = _gardenGetPlots();
  const servants = state.servants || [];
  const result = [];
  for(let i = 0; i < 20; i++){
    const p = plots[i];
    if(!p || p.type !== 'tower' || p.broken) continue;
    const cfg = _gardenTowerInit(p);
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
function _raidDrawHuman(ctx, px, py, scale, equipped, equippedRarity, animName, frameIdx, weaponSlotOverride, servantType, flipX){
  const anim = GAME_ANIMS[animName] || GAME_ANIMS.idle;
  const fi = ((frameIdx % anim.frameCount) + anim.frameCount) % anim.frameCount;
  const B = { x: 30, y: 30, w: 340, h: 460 };
  const ORIG_FOOT_X = 200;
  const ORIG_FOOT_Y = 515;
  const TYPE_COLORS = {
    farmer:  { body: '#2e5a2e', dark: '#1e3a1e' },
    guard:   { body: '#2e4a6a', dark: '#1e2a3a' },
    foreman: { body: '#5a4a2e', dark: '#3a2e1e' }
  };
  const _colors = servantType ? TYPE_COLORS[servantType] : null;
  if(_colors){
    for(const L of GAME_LAYERS){
      L._oldColor = L.color;
      if(L.id === 'right_leg' || L.id === 'left_leg') L.color = _colors.dark;
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
  units.sort(function(a, b){ return a.z - b.z; });
  for(const u of units){
    if(u.kind === 'layer') drawBodyLayer(ctx, u.layer, B, anim, fi);
    else drawEqLayer(ctx, u, B, anim, fi);
  }
  if(servantType === 'foreman') _raidDrawWorkerHelmet(ctx, B, anim, fi, '#ffffff');
  else if(servantType === 'farmer') _raidDrawWorkerHelmet(ctx, B, anim, fi, '#ff8800');
  ctx.restore();
  if(_colors){
    for(const L of GAME_LAYERS){
      if(typeof L._oldColor !== 'undefined'){ L.color = L._oldColor; delete L._oldColor; }
    }
  }
}

function _raidDrawEnemy(ctx, px, py, scale, animName, frameIdx, weaponId){
  const anim = GAME_ANIMS[animName] || GAME_ANIMS.idle;
  const fi = ((frameIdx % anim.frameCount) + anim.frameCount) % anim.frameCount;
  const B = { x: 30, y: 30, w: 340, h: 460 };
  const ORIG_FOOT_X = 200;
  const ORIG_FOOT_Y = 515;
  const COLOR_MAP = {
    right_leg: '#3a1a1a',
    left_leg:  '#3a1a1a',
    torso:     '#7a2828',
    head:      '#a07878',
    face:      '#906868',
    back_arm:  '#4a2020',
    front_arm: '#5a2828'
  };
  ctx.save();
  ctx.translate(px, py);
  ctx.scale(-scale, scale);
  ctx.translate(-ORIG_FOOT_X, -ORIG_FOOT_Y);
  const units = [];
  for(const L of GAME_LAYERS) units.push({ z: L.z, kind: 'layer', layer: L });
  if(weaponId){
    const cfg = getWeaponCfg('primary', weaponId);
    if(cfg){
      const layerDef = GAME_LAYERS.find(function(l){ return l.id === cfg.layer; });
      if(layerDef){
        const img = getHeroImg('icons/items/' + resolveIconId(weaponId) + '.png');
        units.push({ z: layerDef.z - 0.5, kind: 'eq', layerId: cfg.layer, ox: cfg.ox, oy: cfg.oy, scale: cfg.scale, rotation: cfg.rotation, img: img, trim: cfg.trim });
      }
    }
  }
  units.sort(function(a, b){ return a.z - b.z; });
  for(const u of units){
    if(u.kind === 'layer'){
      const old = u.layer.color;
      u.layer.color = COLOR_MAP[u.layer.id] || old;
      drawBodyLayer(ctx, u.layer, B, anim, fi);
      u.layer.color = old;
    } else {
      drawEqLayer(ctx, u, B, anim, fi);
    }
  }
  ctx.restore();
}

/* ===== rev238: 腐烂 / 堆肥 / 弹药回退 ===== */
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

function _gardenStorageRotCheck(){
  if(!state.garden) return { changed: false, report: null };
  if(!state.garden.storageBatches || typeof state.garden.storageBatches !== 'object') state.garden.storageBatches = {};
  const g = _gardenMerchantInit();
  if(typeof g.compostAccelSec !== 'number') g.compostAccelSec = 0;
  const storage = _gardenStorageInit();
  const hasCompost = _gardenHasPlotType('compost');
  const ttl = _gardenFoodTtlMs();
  const now = Date.now();
  const seedsToAdd = [];
  const report = { rotted: 0, composted: 0, seeds: 0, accelSec: 0 };
  let changed = false;
  // 補全 storage 中沒有 batch 記錄的 key（視為最舊，addedAt=0）
  for(const _sk in storage){
    if(storage[_sk] <= 0) continue;
    const _sp = _sk.split('@');
    if(!CROPS[_sp[0]]) continue;
    const _cur = state.garden.storageBatches[_sk];
    if(!Array.isArray(_cur) || !_cur.length){
      state.garden.storageBatches[_sk] = [{ count: storage[_sk], addedAt: 0 }];
      changed = true;
    }
  }
  for(const k in state.garden.storageBatches){
    const batches = state.garden.storageBatches[k];
    if(!Array.isArray(batches) || !batches.length){ delete state.garden.storageBatches[k]; continue; }
    const parts = k.split('@');
    const cropId = parts[0], rar = parts[1];
    if(!CROPS[cropId]){ delete state.garden.storageBatches[k]; continue; }
    const keep = [];
    let removed = 0;
    for(const b of batches){
      if(now - b.addedAt < ttl){ keep.push(b); continue; }
      removed += b.count;
      report.rotted += b.count;
      if(hasCompost){
        const fv = cropFoodValue(cropId, rar) * b.count;
        const accel = Math.round(fv * 0.25);
        g.compostAccelSec += accel;
        report.accelSec += accel;
        report.composted += b.count;
        let sid = null;
        for(const sk in SEEDS){ if(SEEDS[sk].cropId === cropId){ sid = sk; break; } }
        if(sid){
          let seedCount = 0;
          for(let i = 0; i < b.count; i++){ if(Math.random() < 0.2) seedCount++; }
          if(seedCount > 0){ seedsToAdd.push({ id: sid, rarity: rar, count: seedCount }); report.seeds += seedCount; }
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
    const ra = RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity);
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
  g.battleLog = [entry];
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
  const page = document.getElementById('garden-page');
  if(!page) return;
  const wrap = page.querySelector('.gp-grid-wrap');
  const grid = page.querySelector('#gp-grid');
  if(!wrap || !grid) return;
  _raidCleanupAll();
  wrap.style.position = 'relative';
  window._raidLiveLog = [];
  window._raidLiveActive = true;
  if(typeof _gardenUpdateBattleCol === 'function') setTimeout(_gardenUpdateBattleCol, 50);
  // 保险：如果页面里已经有 [object HTMLDivElement] 文本节点，先清掉
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
    function addLog(text, cls){
      _raidLiveLogPush(text, cls);
    }

    const speedRef = { v: 1 };
    let skipped = false;
    let finished = false;

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
        srv: s,
        name: (SERVANT_TYPES[s.type] || {}).icon + ' 守衛 Lv.' + s.lv,
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
        animName: 'idle', animFrame: 0, animNext: 0, hurtUntil: 0
      });
    }

    const enemyUnits = [];
    const _n = enemies.length;
    // 排數：1~3 / 4~6 / 7+ 對應 1 / 2 / 3 排
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
      // 欄從右往左；每欄垂直居中；加隨機抖動
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
        x: _colX, y: _y,
        hp: e.maxHp, maxHp: e.maxHp,
        armor: 0, maxArmor: 0,
        alive: true, isGuard: false,
        weaponId: 'ak74',
        animName: 'idle', animFrame: 0, animNext: 0, hurtUntil: 0
      });
    }

    const bullets = [];
    const damageTexts = [];
    const MAX_DMG_AGE = 900;

    function tickAnim(u, now){
      const anim = GAME_ANIMS[u.animName] || GAME_ANIMS.idle;
      const interval = 1000 / anim.fps;
      if(now >= u.animNext){
        u.animNext = now + interval;
        if(anim.loop){ u.animFrame = (u.animFrame + 1) % anim.frameCount; }
        else { if(u.animFrame < anim.frameCount - 1) u.animFrame++; }
      }
    }

    function drawUnit(u, now){
      tickAnim(u, now);
      let ox = 0;
      if(now < u.hurtUntil){
        const t = 1 - (u.hurtUntil - now) / 220;
        ox += Math.sin(t * Math.PI * 5) * 3;
      }
      ctx.save();
      if(!u.alive) ctx.globalAlpha = 0.22;
      if(u.isGuard){
        _raidDrawHuman(ctx, u.x + ox, u.y, SCALE, u.equipped, u.equippedRarity, u.animName, u.animFrame, u.weaponSlot, false);
      } else {
        _raidDrawEnemy(ctx, u.x + ox, u.y, SCALE, u.animName, u.animFrame, u.weaponId || 'ak74');
      }
      ctx.restore();
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

    function drawRoundBanner(n){
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,.6)';
      ctx.fillRect(0, wrapH/2 - 20, wrapW, 40);
      ctx.fillStyle = '#e8a33d';
      ctx.font = 'bold 20px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('第 ' + n + ' 回合', wrapW/2, wrapH/2);
      ctx.restore();
    }

    let roundBannerUntil = 0;
    let currentRound = 0;

    function renderLoop(){
      if(!page.querySelector('#raid-overlay')) return;
      ctx.clearRect(0, 0, wrapW, wrapH);
      const now = Date.now();
      for(let i = damageTexts.length - 1; i >= 0; i--){
        if(now - damageTexts[i].startTime > MAX_DMG_AGE) damageTexts.splice(i, 1);
      }
      for(const u of guardUnits) drawUnit(u, now);
      for(const u of enemyUnits) drawUnit(u, now);
      for(const b of bullets) drawBullet(b);
      for(const d of damageTexts) drawDamage(d, now);
      if(now < roundBannerUntil) drawRoundBanner(currentRound);
      requestAnimationFrame(renderLoop);
    }
    requestAnimationFrame(renderLoop);

    function sleep(ms){ return new Promise(function(res){ setTimeout(res, ms); }); }

    function launchBullet(sx, sy, tx, ty, isEnemy, miss, bulletRarity){
      return new Promise(function(resolve){
        let _tx = tx, _ty = ty;
        if(miss){ _tx += (Math.random() - 0.5) * 70; _ty += (Math.random() - 0.5) * 50; }
        const dur = Math.max(140, 200 / speedRef.v);
        const b = { x: sx, y: sy, isEnemy: isEnemy, rarity: bulletRarity || '一般' };
        bullets.push(b);
        const start = performance.now();
        const tick = function(){
          if(!page.querySelector('#raid-overlay')){ resolve(); return; }
          const now = performance.now();
          const t = Math.min(1, (now - start) / dur);
          b.x = sx + (_tx - sx) * t;
          b.y = sy + (_ty - sy) * t;
          if(t >= 1){
            const idx = bullets.indexOf(b);
            if(idx >= 0) bullets.splice(idx, 1);
            resolve();
          } else { requestAnimationFrame(tick); }
        };
        requestAnimationFrame(tick);
      });
    }

    function playShot(fromU, toU, isEnemy){
      const sx = isEnemy ? (fromU.x - MUZZLE_X_LEFT) : (fromU.x + MUZZLE_X_RIGHT);
      const sy = fromU.y - MUZZLE_Y_UP;
      const tx = toU.x;
      const ty = toU.y - MUZZLE_Y_UP;
      const wAnim = isEnemy ? 'hurt' : (fromU.weaponSlot === 'secondary' ? 'fire_secondary' : 'fire_primary');
      fromU.animName = wAnim;
      fromU.animFrame = 0; fromU.animNext = 0;
      const _fu = fromU;
      setTimeout(function(){
        if(_fu.alive && _fu.animName === wAnim){ _fu.animName = 'idle'; _fu.animFrame = 0; _fu.animNext = 0; }
      }, 160 / speedRef.v);
      const _br = fromU.isGuard ? (fromU.ammoRarity || '一般') : '一般';
      return { flight: launchBullet(sx, sy, tx, ty, isEnemy, false, _br), fromU: fromU, toU: toU };
    }

    function playMiss(fromU, toU, isEnemy){
      const sx = isEnemy ? (fromU.x - MUZZLE_X_LEFT) : (fromU.x + MUZZLE_X_RIGHT);
      const sy = fromU.y - MUZZLE_Y_UP;
      const tx = toU.x;
      const ty = toU.y - MUZZLE_Y_UP;
      const wAnim = isEnemy ? 'hurt' : (fromU.weaponSlot === 'secondary' ? 'fire_secondary' : 'fire_primary');
      fromU.animName = wAnim;
      fromU.animFrame = 0; fromU.animNext = 0;
      const _fu = fromU;
      setTimeout(function(){
        if(_fu.alive && _fu.animName === wAnim){ _fu.animName = 'idle'; _fu.animFrame = 0; _fu.animNext = 0; }
      }, 160 / speedRef.v);
      const _br = fromU.isGuard ? (fromU.ammoRarity || '一般') : '一般';
      return { flight: launchBullet(sx, sy, tx, ty, isEnemy, true, _br), fromU: fromU, toU: toU };
    }

    function pickFireMode(g, aliveE){
      const def = g.weaponDef;
      if(!def || !def.modes) return '點射';
      if(typeof isSemiAutoOnly === 'function' && isSemiAutoOnly(def)) return '點射';
      if(aliveE >= 3 && def.modes.indexOf('掃射') !== -1) return '掃射';
      if(aliveE >= 2 && def.modes.indexOf('短點射') !== -1) return '短點射';
      return '點射';
    }
    const MODE_CAP = { '點射': 1, '短點射': 3, '長點射': 7, '掃射': 99, '近戰': 1, '投擲': 1 };

    function guardsAlive(){ return guardUnits.some(function(u){ return u.alive; }); }
    function enemiesAlive(){ return enemyUnits.some(function(u){ return u.alive; }); }

    async function executeShot(fromU, toU, isEnemy){
      const hit = Math.random() * 100 < (fromU.isGuard ? fromU.hitRate : 75);
      let dmg = 0, crit = false;
      if(hit){
        if(fromU.isGuard){
          const ammo = fromU.ammoId ? AMMO[fromU.ammoId] : null;
          const baseDmg = ammo ? Math.round(ammo.dmg * (RARITY_MULT[fromU.ammoRarity] || 1)) : Math.round((fromU.weaponDef.dmg || 20) * (RARITY_MULT[fromU.weaponRarity] || 1));
          dmg = baseDmg;
          if(Math.random() < fromU.critRate){ dmg = Math.round(dmg * fromU.critMult); crit = true; }
        } else {
          dmg = fromU.dmg || 10;
        }
      }
      const shot = hit ? playShot(fromU, toU, isEnemy) : playMiss(fromU, toU, isEnemy);
      shot.flight.then(function(){
        if(!page.querySelector('#raid-overlay')) return;
        if(!toU.alive){
          if(!hit) addLog(fromU.name + ' → ' + toU.name + '：已死', 'miss');
          return;
        }
        if(!hit){
          damageTexts.push({ x: toU.x, y: toU.y - CHAR_PX - 18, text: 'MISS', crit: false, isEnemy: isEnemy, startTime: Date.now() });
          addLog(fromU.name + ' → ' + toU.name + '：MISS', 'miss');
          return;
        }
        const tgt = { hp: toU.hp, armor: toU.armor };
        const pen = fromU.isGuard ? (fromU.ammoId && AMMO[fromU.ammoId] ? (AMMO[fromU.ammoId].pen || 0) : (fromU.weaponDef.pen || 0)) : (fromU.pen || 0);
        const res = (typeof applyDamage === 'function') ? applyDamage(tgt, dmg, pen, toU.armorLevel || 0) : { hpLost: dmg, armorLost: 0 };
        toU.hp = tgt.hp; toU.armor = tgt.armor;
        const shown = res.hpLost > 0 ? res.hpLost : res.armorLost;
        fromU.dmgDone = (fromU.dmgDone || 0) + shown;
        if(fromU.isGuard && fromU.srv){ servantAddExp(fromU.srv, 2); }
        toU.hurtUntil = Date.now() + 180;
        toU.animName = 'hurt'; toU.animFrame = 0; toU.animNext = 0;
        setTimeout(function(){
          if(toU.alive && toU.animName === 'hurt'){ toU.animName = 'idle'; toU.animFrame = 0; toU.animNext = 0; }
        }, 180 / speedRef.v);
        damageTexts.push({ x: toU.x, y: toU.y - CHAR_PX - 18, text: '-' + shown + (crit ? '!' : ''), crit: crit, isEnemy: isEnemy, startTime: Date.now() });
        addLog(fromU.name + ' → ' + toU.name + '：-' + shown + (crit ? '!暴擊' : ''), isEnemy ? 'enemy' : 'ally');
        if(toU.hp <= 0){
          toU.alive = false;
          toU.animName = 'idle'; toU.animFrame = 0;
          damageTexts.push({ x: toU.x, y: toU.y - CHAR_PX - 30, text: isEnemy ? '☠' : '✖', crit: false, isEnemy: isEnemy, startTime: Date.now() });
          addLog((isEnemy ? '☠ ' : '✖ ') + toU.name + ' 倒下', isEnemy ? 'kill' : 'down');
        }
      });
      const rpm = fromU.rpm || 600;
      await sleep(Math.max(50, 60000 / rpm) / speedRef.v);
    }

    async function run(){
      try {
        addLog('⚔️ 戰鬥開始 · ' + region, 'round');
        await sleep(500);
        let round = 0;
        const maxRounds = 30;
        while(guardsAlive() && enemiesAlive() && round < maxRounds){
          round++;
          currentRound = round;
          roundBannerUntil = Date.now() + 700;
          addLog('——— 第 ' + round + ' 回合 ———', 'round');
          await sleep(700 / speedRef.v);
          // 我方
          for(const g of guardUnits){
            if(skipped) break;
            if(!g.alive) continue;
            if(g.ammoId){
              const remain = g.ammoBudget - g.ammoUsed;
              if(remain <= 0) continue;
            }
            if(!enemiesAlive()) break;
            const aliveE = enemyUnits.filter(function(e){ return e.alive; }).length;
            const mode = pickFireMode(g, aliveE);
            let shots = MODE_CAP[mode] || 1;
            shots = Math.min(shots, g.magCap);
            if(g.ammoId){
              const remain = g.ammoBudget - g.ammoUsed;
              shots = Math.min(shots, remain);
            }
            for(let i = 0; i < shots; i++){
              if(skipped) break;
              const aliveTargets = enemyUnits.filter(function(e){ return e.alive; });
              if(!aliveTargets.length) break;
              if(g.ammoId){
                if(g.ammoUsed >= g.ammoBudget) break;
                g.ammoUsed++;
              }
              const target = aliveTargets[Math.floor(Math.random() * aliveTargets.length)];
              await executeShot(g, target, false);
            }
          }
          if(!enemiesAlive()) break;
          if(!guardsAlive()) break;
          // 敵方
          for(const e of enemyUnits){
            if(skipped) break;
            if(!e.alive) continue;
            const aliveTargets = guardUnits.filter(function(g){ return g.alive; });
            if(!aliveTargets.length) break;
            const target = aliveTargets[Math.floor(Math.random() * aliveTargets.length)];
            await executeShot(e, target, true);
          }
        }
        await sleep(400 / speedRef.v);
        const win = !enemiesAlive() && guardsAlive();
        addLog(win ? '⚔️ 防禦成功' : '💀 後院失守', win ? 'win' : 'lose');
        await sleep(700 / speedRef.v);

        const ov = page.querySelector('#raid-overlay');
        if(ov) ov.remove();

        const sim = {
          log: logEntries,
          guards: guardUnits,
          enemies: enemyUnits,
          win: win,
          rounds: round
        };
        window._raidLiveActive = false;
        _gardenRaidApplyResult(sim, region);
        _gardenActiveTab = 'log';
        if(typeof renderGardenTabs === 'function') renderGardenTabs();
        if(typeof renderGardenContent === 'function') renderGardenContent();
        if(typeof renderGardenGrid === 'function') renderGardenGrid();
      } catch(err){
        console.warn('[raid] error', err);
        window._raidLiveActive = false;
        const ov = page.querySelector('#raid-overlay');
        if(ov) ov.remove();
        if(typeof renderGardenContent === 'function') renderGardenContent();
      }
    }

    run();
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
    const ra = RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity);
    if(ra !== 0) return ra;
    const typeOrder = ['farmer', 'guard', 'foreman'];
    return typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type);
  });
  if(!servants.length){
    box.innerHTML = '<div class="gs-cols"><div class="gs-col" style="border-left:none"><div class="gs-title">👤 僕人</div><div class="gs-wrap"><div class="gs-empty" style="position:static;padding:40px 0">尚未擁有僕人</div></div></div></div>';
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
    html += '<div class="gs-title">👤 僕人 (' + servants.length + ')</div>';
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

function openServantDetail(srvId){
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
  if(srv.stamina <= 0 && !srv.resting){
    ftHtml += '<button class="btn primary" id="srv-wake">叫醒</button>';
  }
  ftHtml += '<button class="btn primary" id="srv-assign">指派</button>';
  if((srv.assignedPlots||[]).length > 0) ftHtml += '<button class="btn" id="srv-withdraw">撤回</button>';
  ftHtml += '<button class="btn ghost" id="srv-close">關閉</button>';
  ft.innerHTML = ftHtml;
  let body = '';
  body += '<div style="font-size:15px;color:#e8a33d;font-weight:bold;display:flex;align-items:center;gap:8px">';
  body += '<img style="width:34px;height:34px;object-fit:contain" src="icons/servants/' + srv.type + '.png' + assetSuffix() + '" alt="">';
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
  body += '<div style="font-size:11px;color:#e8a33d;font-weight:bold;margin-bottom:6px">🍖 食物策略</div>';
  body += '<select id="srv-food-policy" style="width:100%;background:#151210;color:#ddd;border:1px solid #2a231c;border-radius:4px;padding:6px;font-size:11px">';
  body += '<option value="full">吃到撐（120%）</option>';
  body += '<option value="normal">吃飽（70%）</option>';
  body += '<option value="half">半飽（50%）</option>';
  body += '<option value="lick">舔舔（30%）</option>';
  body += '<option value="starve">餓著（0%）</option>';
  body += '</select>';
  body += '<div style="font-size:9px;color:#5a5040;margin-top:4px;line-height:1.5">需與商人訂閱食物生產線後生效</div>';
  const bd = openModal({ title: '僕人詳情', body: body, footer: ft });
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
  if(_rnBtn) _rnBtn.onclick = function(){ closeModal(); openServantRename(srvId); };
  ft.querySelector('#srv-close').onclick = closeModal;
  ft.querySelector('#srv-assign').onclick = function(){ closeModal(); openServantAssign(srvId); };
  const wakeBtn = ft.querySelector('#srv-wake');
  if(wakeBtn) wakeBtn.onclick = function(){
    const _eff = servantEffectiveMaxStamina(srv);
    if(_eff < 1){ notify('此僕人處於餓著狀態，無法叫醒', 'error'); return; }
    srv.stamina = Math.max(1, Math.round(_eff * GARDEN_WAKEUP_RECOVER));
    save();
    notify(def.name + ' 被叫醒', 'ok');
    closeModal();
    _gardenRenderActors(Date.now());
  };
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
    notify(def.name + ' 升級至 Lv.' + srv.lv, 'ok');
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
  const s0 = _gardenFoodStats();
  const s = { food: Number(s0.food) || 0, consume: Number(s0.consume) || 0, produce: Number(s0.produce) || 0 };
  const consStr = s.consume > 0 ? '-' + s.consume + '/h' : '0/h';
  const prodStr = s.produce > 0 ? '+' + s.produce + '/h' : '0/h';
  el.innerHTML = '🍲 <b style="color:#fff">' + s.food + '</b> <span style="color:#e05252">' + consStr + '</span> <span style="color:#4caf50">' + prodStr + '</span>';
}

function _gardenSyncActors(){
  const servants = (state.servants || []).filter(function(s){
    return s.assignedPlots && s.assignedPlots.length > 0;
  }).slice(0, 8);
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
    return (RARITY_MULT[b.rarity] || 1) - (RARITY_MULT[a.rarity] || 1);
  });
  return candidates[0];
}

function _gardenFarmerFindTask(a, srv){
  if(!srv) return null;
  const plots = _gardenGetPlots();
  const now = Date.now();
  // 優先：清理腐爛
  for(const idx of a.assignedPlots){
    const plot = plots[idx];
    if(!plot || plot.type !== 'soil' || !plot.crop) continue;
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
    if(!plot || plot.type !== 'soil' || !plot.crop) continue;
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
      if(!plot || plot.type !== 'soil') continue;
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
  const plotEl = grid.querySelector('.gp-plot[data-idx="' + task.plotIdx + '"]');
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
  const plot = plots[a.task.plotIdx];
  if(!plot) return;
  const srv = (state.servants || []).find(function(s){ return s.id === a.id; });
  if(!srv) return;
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
    const count = Math.max(1, Math.round(seed.baseYield * mult * _farmerBonus * _foremanBonus * (0.8 + Math.random() * 0.4)));
    gardenStorageAdd(seed.cropId, c.rarity, count);
    plot.crop = null;
    const cropDef = CROPS[seed.cropId];
    _gardenLog('<span class="r-' + srv.rarity + '">' + servantLabel(srv) + '</span> 收穫 <span class="r-' + c.rarity + '">' + (cropDef ? cropDef.name : '作物') + '×' + count + '</span>', 'harvest');
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
    plot.crop = { seedId: seedId, rarity: rarity, plantedAt: now, matureAt: now + seed.growMs, cleanupUntil: 0 };
    plot.lastSeed = seedId;
    plot.lastRarity = rarity;
    _gardenLog('<span class="r-' + srv.rarity + '">' + servantLabel(srv) + '</span> 種植 <span class="r-' + rarity + '">' + seed.name + '</span>', 'plant');
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
  _gardenMerchantTick();
  _gardenUpdateFoodInfo();
  _gardenSyncActors();
  if(!_gardenActors.length) return;
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
    // 守衛：站定哨塔
    if(a.type === 'guard'){
      if(a.assignedPlots && a.assignedPlots.length){
        const idx = a.assignedPlots[0];
        const plotEl = grid.querySelector('.gp-plot[data-idx="' + idx + '"]');
        if(plotEl){
          const pRect = plotEl.getBoundingClientRect();
          a.tx = pRect.left - wrapRect.left + pRect.width / 2;
          a.ty = pRect.top - wrapRect.top + pRect.height - 4;
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
                  _gardenLog('<span class="r-' + tsrv.rarity + '">' + servantLabel(tsrv) + '</span> 被監工叫醒', 'work');
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

    if(a.type === 'farmer'){
      const task = _gardenFarmerFindTask(a, a._srv);
      if(task){
        if(_gardenActorAssignTask(a, task, grid, wrapRect, now)) continue;
      } else {
        const srv = a._srv;
        const autoPlant = srv ? (srv.autoPlant || 'off') : 'off';
        if(autoPlant !== 'off'){
          const plots = _gardenGetPlots();
          let hasCrop = false, hasSeed = false;
          for(const idx of a.assignedPlots){
            const plot = plots[idx];
            if(plot && plot.crop) hasCrop = true;
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
    const idleIdx = a.assignedPlots[Math.floor(Math.random() * a.assignedPlots.length)];
    const plotEl = grid.querySelector('.gp-plot[data-idx="' + idleIdx + '"]');
    if(plotEl){
      const pRect = plotEl.getBoundingClientRect();
      a.tx = pRect.left - wrapRect.left + pRect.width / 2 + (Math.random() - 0.5) * 12;
      a.ty = pRect.top - wrapRect.top + pRect.height - 2 + (Math.random() - 0.5) * 10;
      const dist = Math.sqrt(Math.pow(a.tx - a.x, 2) + Math.pow(a.ty - a.y, 2));
      if(dist < 4){ a.idleUntil = now + 1800 + Math.random() * 2500; continue; }
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
    if(a.type !== 'guard'){
      const dx = a.tx - a.x, dy = a.ty - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if(dist > 0.5){
        const step = Math.min(dist, SPEED * dt);
        a.x += (dx / dist) * step;
        a.y += (dy / dist) * step;
        didMove = true;
      } else {
        a.x = a.tx; a.y = a.ty;
      }
    } else {
      a.x = a.tx; a.y = a.ty;
    }
    const _moving = (a.type !== 'guard') && (Math.sqrt(Math.pow(a.tx - a.x, 2) + Math.pow(a.ty - a.y, 2)) > 0.8);
    let animName = 'idle';
    if(a.type === 'guard') animName = 'idle';
    else if(_moving) animName = 'walk';
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
    _raidDrawHuman(ctx, a.x, a.y, SCALE, equipped, equippedRarity, animName, a._animFrame, wpSlot, a.type, (a.tx - a.x) < -0.5);
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
    if(a.state === 'lazy' || a.state === 'rest'){
      ctx.save();
      ctx.font = 'bold 13px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.shadowColor = '#000';
      ctx.shadowBlur = 3;
      ctx.fillStyle = '#e8a33d';
      ctx.fillText('💤', a.x + CHAR_PX * 0.40, a.y - CHAR_PX * 1.15);
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
  const isSeed = !!SEEDS[id];
  const isCrop = !!CROPS[id];
  if(!isSeed && !isCrop) return;
  const count = gardenStorageCount(id, rarity);
  if(count <= 0){ notify('物品已耗盡', 'error'); return; }
  const def = isSeed ? SEEDS[id] : CROPS[id];
  const icon = isSeed ? '🌰' : def.icon;
  const nm = def.name || id;
  const ft = document.createElement('div');
  ft.className = 'modal-ft';
  ft.innerHTML = '<button class="btn ghost" id="gp-sd-close">關閉</button>';
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
    const _fv = cropFoodValue(id, rarity);
    body += '<div class="stat-line"><span class="k">類型</span><span class="v">作物</span></div>';
    let _belongSeed = null;
    for(const _sid in SEEDS){ if(SEEDS[_sid].cropId === id){ _belongSeed = SEEDS[_sid]; break; } }
    if(_belongSeed){
      body += '<div class="stat-line"><span class="k">來源種子</span><span class="v">🌰 ' + _belongSeed.name + '</span></div>';
    }
    body += '<div class="stat-line"><span class="k">食物值</span><span class="v" style="color:#4caf50">' + _fv + '</span></div>';
  }
  openModal({ title: '儲備詳情', body: body, footer: ft });
  ft.querySelector('#gp-sd-close').onclick = closeModal;
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
        notify(msg, 'ok');
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
function openPreference(){
  const p = state.preferences;
  let body = '';
  body += rarityPolicyBlockHTML('exp', '🎯 探索模式彈藥', p.ammoExplore, true);
  body += rarityPolicyBlockHTML('texp', '💣 探索模式手雷', p.throwableExplore, true);
  const bd = openModal({title:'⚙️ 偏好設定', body});
  _bindPrefEvents(bd);
}
function _gardenMerchantLineStatus(lineKey){
  const g = _gardenMerchantInit();
  const m = g.merchant;
  const map = {
    food:  { lvKey:'foodLv',  table:MERCHANT_FOOD_TABLE },
    seed:  { lvKey:'seedLv',  table:MERCHANT_SEED_TABLE },
    throw: { lvKey:'throwLv', table:MERCHANT_THROW_TABLE }
  };
  const cfg = map[lineKey];
  if(!cfg) return null;
  const lv = m[cfg.lvKey] || 0;
  if(lv <= 0) return { active: false };
  const c = cfg.table[lv];
  const missing = [];
  if(lineKey === 'food'){
    const costs = {};
    if(c.gears) costs.gears = c.gears;
    if(c.electronics) costs.electronics = c.electronics;
    const matMiss = _gardenMerchantMissingList(costs);
    for(const x of matMiss) missing.push(x);
    const poolBefore = m.foodPool || 0;
    const cropVal = _gardenTotalCropValue();
    if(poolBefore + cropVal + 0.001 < c.food) missing.push('作物');
  } else if(lineKey === 'seed'){
    const costs = { metal: c.metal };
    if(c.gears) costs.gears = c.gears;
    if(c.electronics) costs.electronics = c.electronics;
    for(const x of _gardenMerchantMissingList(costs)) missing.push(x);
  } else if(lineKey === 'throw'){
    const costs = { metal: c.metal };
    if(c.gears) costs.gears = c.gears;
    if(c.cloth) costs.cloth = c.cloth;
    if(c.electronics) costs.electronics = c.electronics;
    for(const x of _gardenMerchantMissingList(costs)) missing.push(x);
  }
  return { active: true, paused: missing.length > 0, missing: missing };
}

function _getArmoryProduction(){
  const armoryLv = getBuildingLv('armory');
  if(armoryLv <= 0) return null;
  const genLv = getBuildingLv('generator');
  const genMult = 1 + genLv * 0.04;
  const intervalMs = 3 * 60 * 1000 / genMult;
  let targetRarity = '一般';
  if(armoryLv <= 10) targetRarity = '破舊';
  else if(armoryLv <= 20) targetRarity = '一般';
  else if(armoryLv <= 35) targetRarity = '庫存';
  else targetRarity = '精品';
  const _targetIdx = RARITY_ORDER.indexOf(targetRarity);
  const pw = equippedWeapon('primary');
  const sw = equippedWeapon('secondary');
  const cals = [];
  if(pw && pw.def.cal) cals.push(pw.def.cal);
  if(sw && sw.def.cal && (!pw || sw.def.cal !== pw.def.cal)) cals.push(sw.def.cal);
  if(!cals.length) cals.push('9x19');
  const cntMult = Math.max(1, Math.ceil(armoryLv / 8));
  const items = [];
  for(const cal of cals){
    const ammos = Object.keys(AMMO).filter(function(k){ return AMMO[k].cal === cal; });
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
      const perPeriodMin = 3 * cntMult;
      const perPeriodMax = 6 * cntMult;
      const perHourMin = Math.round(3600000 / intervalMs * perPeriodMin);
      const perHourMax = Math.round(3600000 / intervalMs * perPeriodMax);
      items.push({
        cal: cal,
        ammoId: chosen,
        name: AMMO[chosen].name,
        rarity: AMMO[chosen].rarity,
        perPeriodMin: perPeriodMin,
        perPeriodMax: perPeriodMax,
        perHourMin: perHourMin,
        perHourMax: perHourMax,
        intervalSec: Math.round(intervalMs / 1000)
      });
    }
  }
  return { armoryLv: armoryLv, targetRarity: targetRarity, items: items };
}

function openArmoryInfo(){
  const p = _getArmoryProduction();
  if(!p){ notify('尚未建造軍械庫', 'error'); return; }
  let body = '';
  body += '<div class="detail-sub">Lv.' + p.armoryLv + ' · 目標稀有度：' + p.targetRarity + '</div>';
  body += '<div class="divider"></div>';
  if(!p.items.length){
    body += '<div class="empty-hint">無可用彈藥（檢查主副武器口徑）</div>';
  } else {
    for(const it of p.items){
      body += '<div class="item-row" style="cursor:default">';
      body += '<div class="icon" style="background:' + rarityBg(it.rarity) + '">' + itemIcon(it.ammoId, 30) + '</div>';
      body += '<div class="info">';
      body += '<div class="nm ' + rarityClass(it.rarity) + '">' + it.name + '</div>';
      body += '<div class="sub">每 ' + it.intervalSec + 's：' + it.perPeriodMin + '~' + it.perPeriodMax + ' 發</div>';
      body += '<div class="sub">每小時：' + it.perHourMin + '~' + it.perHourMax + ' 發</div>';
      body += '</div></div>';
    }
  }
  const ft = document.createElement('div');
  ft.className = 'modal-ft';
  ft.innerHTML = '<button class="btn ghost" id="arm-close">關閉</button>';
  openModal({ title: '🔫 軍械庫生產', body: body, footer: ft });
  ft.querySelector('#arm-close').onclick = closeModal;
}








function _gardenSoilFoodPerHour(){
  const plots = _gardenGetPlots();
  let ratePerHour = 0;
  let planted = 0;
  for(const p of plots){
    if(!p || p.type !== 'soil' || !p.crop) continue;
    planted++;
    const seed = SEEDS[p.crop.seedId];
    if(!seed) continue;
    const mult = RARITY_MULT[p.crop.rarity] || 1;
    const yieldPerCycle = seed.baseYield * mult;
    const foodPerCycle = yieldPerCycle * cropFoodValue(seed.cropId, p.crop.rarity);
    const growMs = seed.growMs || 1;
    ratePerHour += foodPerCycle * 3600000 / growMs;
  }
  return { ratePerHour: ratePerHour, planted: planted };
}

function _getArmorySummary(){
  const p = _getArmoryProduction();
  if(!p) return null;
  if(!p.items.length) return { text: '無彈藥', hasItems: false };
  let total = 0;
  let mn = 0, mx = 0;
  for(const it of p.items){
    total++;
    mn += it.perHourMin;
    mx += it.perHourMax;
  }
  const avgMid = Math.round((mn + mx) / 2 / Math.max(1, total));
  return { text: '約' + avgMid + '/h', hasItems: true };
}

function renderBaseStats(){
  const rows = [];
  const genLv = getBuildingLv('generator');
  const genMult = 1 + genLv * 0.04;
  const radioLv = getBuildingLv('radio');
  if(radioLv > 0){
    const mh = Math.round(12 * genMult * 5.5  * Math.max(1,Math.round(1+radioLv*0.3)));
    rows.push({ key: 'radio', label: '無線電', value: '+' + mh + '/h' });
  }
  const armoryLv = getBuildingLv('armory');
  if(armoryLv > 0){
    const sum = _getArmorySummary();
    rows.push({ key: 'armory', label: '軍械庫', value: sum ? sum.text : '—' });
  }
  const g = _gardenMerchantInit();
  const m = g.merchant;
  const FOOD_COST = { full:3, normal:2, half:1, lick:0.5, starve:0 };
  let consumePerHour = 0;
  for(const s of (state.servants || [])){
    if(!s.assignedPlots || !s.assignedPlots.length) continue;
    consumePerHour += (FOOD_COST[s.foodPolicy || 'normal'] || 0) * 60;
  }
  if(m.foodLv > 0){
    const prod = MERCHANT_FOOD_TABLE[m.foodLv].food * 12;
    const net = prod - consumePerHour;
    const st = _gardenMerchantLineStatus('food');
    rows.push({ key: 'food', label: '食物', value: (net >= 0 ? '+' : '') + net + '/h', paused: st && st.paused });
  }
  if(m.seedLv > 0){
    const st = _gardenMerchantLineStatus('seed');
    rows.push({ key: 'seed', label: '種子', value: '+' + (MERCHANT_SEED_TABLE[m.seedLv].count * 12) + '/h', paused: st && st.paused });
  }
  if(m.throwLv > 0){
    const st = _gardenMerchantLineStatus('throw');
    rows.push({ key: 'throw', label: '投擲', value: '+' + (MERCHANT_THROW_TABLE[m.throwLv].count * 12) + '/h', paused: st && st.paused });
  }
  const soil = _gardenSoilFoodPerHour();
  if(soil.planted > 0){
    rows.push({ key: 'soil', label: '田地', value: '+' + Math.round(soil.ratePerHour) + '/h' });
  }
  if(!rows.length){
    return '<div class="empty-hint">尚無生產活動</div>';
  }
  let html = '';
  for(const r of rows){
    html += '<div class="stat-row" data-stat-key="' + r.key + '">';
    html += '<span class="stat-label">' + r.label + '</span>';
    html += '<span class="stat-value">' + r.value + '</span>';
    html += '<span class="stat-status">' + (r.paused ? '暫停' : '') + '</span>';
    html += '</div>';
  }
  return html;
}

function _rebindStatsClick(container){
  if(!container) return;
  const rows = container.querySelectorAll('.stat-row[data-stat-key]');
  for(let i = 0; i < rows.length; i++){
    (function(el){
      el.onclick = function(){ openStatsDetail(el.getAttribute('data-stat-key')); };
    })(rows[i]);
  }
}

function openStatsDetail(key){
  if(key === 'armory'){ openArmoryInfo(); return; }
  if(key === 'radio'){ _openRadioDetail(); return; }
  if(key === 'food' || key === 'seed' || key === 'throw'){ _openMerchantLineDetail(key); return; }
  if(key === 'soil'){ _openSoilDetail(); return; }
}

function _openRadioDetail(){
  const lv = getBuildingLv('radio');
  if(lv <= 0){ notify('尚未建造無線電', 'error'); return; }
  const genLv = getBuildingLv('generator');
  const genMult = 1 + genLv * 0.04;
  const intervalMs = 5 * 60 * 1000 / genMult;
  const perHour = Math.round(3600000 / intervalMs);
  let body = '';
  body += '<div class="detail-sub">Lv.' + lv + '</div>';
  body += '<div class="divider"></div>';
  body += '<div class="stat-line"><span class="k">週期</span><span class="v">' + Math.round(intervalMs/1000) + ' 秒</span></div>';
  body += '<div class="stat-line"><span class="k">產出</span><span class="v">隨機材料 ×' + (3*lv) + '~' + (8*lv) + '（每 ' + perHour + ' 次/h）</span></div>';
  body += '<div class="divider"></div>';
  body += '<div style="font-size:11px;color:#7a6f60">可能產出：木材、金屬、螺絲、布料、齒輪、電子零件</div>';
  const ft = document.createElement('div');
  ft.className = 'modal-ft';
  ft.innerHTML = '<button class="btn ghost" id="dt-close">關閉</button>';
  openModal({ title: '無線電', body: body, footer: ft });
  ft.querySelector('#dt-close').onclick = closeModal;
}

function _openMerchantLineDetail(lineKey){
  const meta = _gardenMerchantLineMeta(lineKey);
  if(!meta) return;
  const g = _gardenMerchantInit();
  const m = g.merchant;
  const lv = m[meta.lvKey] || 0;
  if(lv <= 0){ notify('尚未訂閱', 'error'); return; }
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
    body += '<div class="stat-line"><span class="k">預付</span><span class="v">🍲' + (m.foodPool || 0) + '</span></div>';
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
  ft.innerHTML = '<button class="btn ghost" id="dt-close">關閉</button>';
  openModal({ title: meta.title, body: body, footer: ft });
  ft.querySelector('#dt-close').onclick = closeModal;
}

function _openSoilDetail(){
  const plots = _gardenGetPlots();
  const list = [];
  const now = Date.now();
  for(let i = 0; i < plots.length; i++){
    const p = plots[i];
    if(!p || p.type !== 'soil' || !p.crop) continue;
    const seed = SEEDS[p.crop.seedId];
    if(!seed) continue;
    const mult = RARITY_MULT[p.crop.rarity] || 1;
    const yieldPerCycle = seed.baseYield * mult;
    const foodPerCycle = yieldPerCycle * cropFoodValue(seed.cropId, p.crop.rarity);
    const growMs = seed.growMs || 1;
    const ratePerHour = foodPerCycle * 3600000 / growMs;
    const remainMs = Math.max(0, p.crop.matureAt - now);
    list.push({
      idx: i,
      seedName: seed.name,
      rarity: p.crop.rarity,
      cropName: (CROPS[seed.cropId] || {}).name || '',
      ratePerHour: Math.round(ratePerHour),
      remainSec: Math.ceil(remainMs / 1000)
    });
  }
  let body = '';
  body += '<div class="detail-sub">共 ' + list.length + ' 塊種植中</div>';
  body += '<div class="divider"></div>';
  for(const it of list){
    body += '<div style="padding:6px 0;border-bottom:1px dashed #2a231c">';
    body += '<div class="' + rarityClass(it.rarity) + '" style="font-size:12px;font-weight:bold">' + plotCoordName(it.idx) + ' · ' + it.seedName + '</div>';
    body += '<div style="font-size:10px;color:#a89a85;margin-top:2px">' + it.rarity + ' · 產 ' + it.cropName + ' · 速率 +' + it.ratePerHour + '/h · 剩 ' + it.remainSec + 's</div>';
    body += '</div>';
  }
  const ft = document.createElement('div');
  ft.className = 'modal-ft';
  ft.innerHTML = '<button class="btn ghost" id="dt-close">關閉</button>';
  openModal({ title: '田地', body: body, footer: ft });
  ft.querySelector('#dt-close').onclick = closeModal;
}

function renderBase(){
  const z1=$('#zone1'),z2=$('#zone2'),z3=$('#zone3');
  let html='<div class="build-grid">';
  for(let i=0;i<12;i++){
    const slot=state.base.slots[i];
    if(i===0)html+=`<div class="cell core" data-i="${i}"><div class="cico">${buildingIcon('control')}</div><div class="cnm">控制中心</div><div class="clv">Lv.1</div></div>`;
    else if(slot){const b=BUILDINGS[slot.id]||{name:'未知'};html+=`<div class="cell built" data-i="${i}"><div class="cico">${buildingIcon(slot.id)}</div><div class="cnm">${b.name}</div><div class="clv">Lv.${slot.lv}</div></div>`;}
    else html+=`<div class="cell" data-i="${i}"><div class="cico">＋</div><div class="cnm">空地</div></div>`;
  }
  html+='</div>';z1.innerHTML=html;
  $$('.cell',z1).forEach(c=>{c.onclick=()=>onBuildCell(parseInt(c.dataset.i));});
  z2.innerHTML=`
    <div class="subnav">
      <div class="subnav-tab on" data-tab="stats">📊 統計</div>
      <div class="subnav-tab" data-tab="garden">🌱 後院</div>
      <div class="subnav-tab" data-tab="room">🚪 房間</div>
    </div>
    <div class="subnav-body" id="subnav-body">
      ${renderBaseStats()}
    </div>
    `;
  $$('.subnav-tab',z2).forEach(tab=>{
    tab.onclick=()=>{
      const _tid=tab.dataset.tab;
      if(_tid==='stats'){
        $$('.subnav-tab',z2).forEach(x=>x.classList.toggle('on',x===tab));
        const _b=$('#subnav-body');
        if(_b){ _b.innerHTML=renderBaseStats(); _rebindStatsClick(_b); }
      } else if(_tid==='garden'){
        openGarden();
      } else if(_tid==='room'){
        notify('聯機功能開發中','error');
      }
    };
  });

  renderRegionArea(z3);

  if(!window._baseStatsTimer){
    window._baseStatsTimer = setInterval(function(){
      if(currentTab !== 'base') return;
      const _b = document.getElementById('subnav-body');
      if(!_b) return;
      const _activeTab = document.querySelector('.subnav-tab.on');
      if(!_activeTab || _activeTab.dataset.tab !== 'stats') return;
      _b.innerHTML = renderBaseStats();
      _rebindStatsClick(_b);
    }, 1500);
  }
}
let _regionScrollPos=0;
function getSelectedRegionTier(baseName){
  for(const id of state.preferences.regions){
    if(id===baseName)return 1;
    if(id===baseName+'II')return 2;
  }
  return 0;
}
function setRegionTier(baseName,tier){
  state.preferences.regions=state.preferences.regions.filter(id=>id!==baseName&&id!==baseName+'II');
  if(tier===1)state.preferences.regions.push(baseName);
  else if(tier===2)state.preferences.regions.push(baseName+'II');
}
function ensureAtLeastOneRegion(){
  if(state.preferences.regions.length>0)return;
  for(const k in REGIONS){
    if(!REGIONS[k].needUnlock||state.unlockedRegions.includes(k)){state.preferences.regions.push(k);return;}
  }
  state.preferences.regions.push('廢棄工廠');
}
function renderRegionArea(z3){
  const _ra=z3.querySelector('.region-area');
  if(_ra) _regionScrollPos=_ra.scrollTop;
  ensureAtLeastOneRegion();
  let html=`<div class="z3-head"><div class="z3-title">🗺️ 探索區域</div></div>
    <div class="mode-sel">
      <div class="mode-btn ${state.preferences.actionMode==='attack'?'on':''}" data-mode="attack">⚔ 攻擊</div>
      <div class="mode-btn ${state.preferences.actionMode==='stealth'?'on':''}" data-mode="stealth">🥷 潛行</div>
    </div>
    <div class="region-area">`;
  const _baseKeys=['廢棄工廠','廢棄實驗室','郊區公路','輻射沼澤','廢土核心'];
  for(const baseName of _baseKeys){
    const r1=REGIONS[baseName];
    if(!r1)continue;
    const iiName=baseName+'II';
    const r2=REGIONS[iiName];
    const t2Exists=!!r2;
    const t2Unlocked=t2Exists&&(!r2.needUnlock||state.unlockedRegions.includes(iiName));
    const selTier=getSelectedRegionTier(baseName);
    html+=`<div class="reg-item" data-sel-tier="${selTier}">
      <div class="ri"><div class="rn">${r1.name}</div></div>
      <div class="tier-selector">
        <div class="tier-btn ${selTier===1?'on':''}" data-key="${baseName}" data-tier="1">I</div>
        ${t2Exists?`<div class="tier-btn ${selTier===2?'on':''} ${t2Unlocked?'':'locked'}" data-key="${baseName}" data-tier="2">${t2Unlocked?'II':'🔒'}</div>`:''}
      </div>
    </div>`;
  }
  html+=`</div>`;
  z3.innerHTML=html;
  const _ra2=z3.querySelector('.region-area');
  if(_ra2) _ra2.scrollTop=_regionScrollPos;
  $$('.mode-btn',z3).forEach(b=>{b.onclick=()=>setActionMode(b.dataset.mode);});
  $$('.tier-btn',z3).forEach(btn=>{
    btn.onclick=(e)=>{
      e.stopPropagation();
      const key=btn.dataset.key;
      const tier=parseInt(btn.dataset.tier,10);
      if(tier===2&&!state.unlockedRegions.includes(key+'II')){notify('二級區域尚未解鎖','error');return;}
      const cur=getSelectedRegionTier(key);
      setRegionTier(key,cur===tier?0:tier);
      ensureAtLeastOneRegion();
      save();renderRegionArea(z3);
    };
  });
}
function setActionMode(mode){
  const oldMode=state.preferences.actionMode;if(oldMode===mode)return;
  if(mode==='stealth'){
    state.stashedWeapons=state.stashedWeapons||{};
    for(const slot of ['primary','secondary']){
      const id=state.player.equipped[slot];
      if(id){const _r=state.player.equippedRarity[slot]||'一般';state.stashedWeapons[slot]={id,rarity:_r};state.player.equipped[slot]=null;delete state.player.equippedRarity[slot];invAdd(id,_r,1);}
    }
  } else {
    if(state.stashedWeapons){
      for(const slot of ['primary','secondary']){
        if(state.stashedWeapons[slot]){
          const {id,rarity}=state.stashedWeapons[slot];
          const curId=state.player.equipped[slot];
          const curRarity=state.player.equippedRarity[slot];
          if(curId&&(curId!==id||curRarity!==rarity)){invAddRaw(curId,curRarity||'一般',1);}
          let taken=false;
          if(invCount(id,rarity)>0){invRemove(id,rarity,1);state.player.equipped[slot]=id;state.player.equippedRarity[slot]=rarity;taken=true;}
          else{for(const k in state.inventory){const [iid,irar]=k.split('@');if(iid===id){invRemove(iid,irar,1);state.player.equipped[slot]=iid;state.player.equippedRarity[slot]=irar;taken=true;break;}}}
          delete state.stashedWeapons[slot];
        }
      }
    }
  }
  state.preferences.actionMode=mode;
  refreshPlayerStats();save();renderCurrentTab();
  notify(mode==='stealth'?'切換至潛行蒐集，主副武器已卸下':'切換至攻擊前進','ok');
}
function onBuildCell(i){
  if(i===0){openControlCenter();return;}
  const slot=state.base.slots[i];
  if(slot){
    if(slot.id==='merchant'){ openMerchant(); return; }
    if(slot.id==='garden'){ openGarden(); return; }
    const b=BUILDINGS[slot.id];
    const upCost=(slot.id==='forge')?{metal:150*slot.lv,screws:50*slot.lv}:{wood:15*slot.lv,metal:15*slot.lv,screws:5*slot.lv};
    const curBonus=buildingBonusText(slot.id,slot.lv);
    const nextBonus=buildingBonusText(slot.id,slot.lv+1);
    const _isMax = b.maxLv && slot.lv >= b.maxLv;
    let body=`<div class="detail-title">${buildingIcon(slot.id)} ${b.name} Lv.${slot.lv}${_isMax ? ' (MAX)' : ''}</div>
      <div class="detail-sub">${b.desc}</div>
      <div class="stat-line"><span class="k">當前效果</span><span class="v">${curBonus}</span></div>
      ${_isMax ? '' : `<div class="stat-line"><span class="k">升級後</span><span class="v">${nextBonus}</span></div>`}
      <div class="divider"></div>
      <div style="font-size:11px;color:#e8a33d;margin-bottom:4px">升級需求（等值一般）</div>`;
    for(const [k,v] of Object.entries(upCost)){const have=materialEquivalent(k);const ok=have>=v;body+=`<div class="stat-line"><span class="k">${MATERIALS[k].name}</span><span class="v" style="color:${ok?'#4caf50':'#e05252'}">${have}/${v}</span></div>`;}
    const ft=el('div','modal-ft');
    const isWorkbench=slot.id==='workbench';
    ft.innerHTML=`<button class="btn primary" id="m-up" ${_isMax ? 'disabled' : ''}>${_isMax ? '已滿級' : '升級'}</button>${isWorkbench?'<button class="btn" id="m-craft">改造</button>':''}<button class="btn ghost" id="m-close">關閉</button>`;
    openModal({title:b.name,body,footer:ft});
    ft.querySelector('#m-close').onclick=closeModal;
    ft.querySelector('#m-up').onclick=()=>{
      if(b.maxLv && slot.lv >= b.maxLv){notify(`已達最高等級 Lv.${b.maxLv}`,'error');return;}
      for(const [k,v] of Object.entries(upCost))if(materialEquivalent(k)<v){notify('材料不足，無法升級','error');return;}
      for(const [k,v] of Object.entries(upCost))consumeMaterial(k,v);
      slot.lv++;refreshPlayerStats();save();renderBase();
      notify(`${b.name} 升級至 Lv.${slot.lv}`,'ok');
      closeModal(); onBuildCell(i);
    };
    const craftBtn=ft.querySelector('#m-craft');
    if(craftBtn)craftBtn.onclick=()=>{closeModal();openModding(slot.lv);};
    return;
  }
  const builtSet=new Set();
  state.base.slots.forEach((s,idx)=>{if(s&&idx!==i)builtSet.add(s.id);});
  const available=[],taken=[];
  for(const bid in BUILDINGS){if(builtSet.has(bid))taken.push(bid);else available.push(bid);}
  let body='<div style="font-size:11px;color:#e8a33d;margin-bottom:6px">選擇要建造的設施</div>';
  for(const bid of available){
    const b=BUILDINGS[bid];
    let costHtml='';
    for(const [k,v] of Object.entries(b.cost)){const have=materialEquivalent(k);const ok=have>=v;costHtml+=`<span class="${ok?'cost-ok':'cost-no'}">${MATERIALS[k].name} ${have}/${v}</span>`;}
    body+=`<div class="item-row" data-bid="${bid}"><div class="icon">${buildingIcon(bid)}</div><div class="info"><div class="nm">${b.name}</div><div class="sub">${b.desc}</div><div class="sub">${costHtml}</div><div class="sub" style="color:#4caf50">效果：${buildingBonusText(bid,1)}</div></div></div>`;
  }
  if(taken.length){
    body+=`<div class="divider"></div><div style="color:#5a5040;font-size:10px;margin:4px 0 6px">已建造（不可重複）</div>`;
    for(const bid of taken){const b=BUILDINGS[bid];body+=`<div class="item-row" style="opacity:.35;background:#151210;cursor:not-allowed;border-color:#241d16"><div class="icon" style="filter:grayscale(1)">${buildingIcon(bid)}</div><div class="info"><div class="nm" style="color:#7a6f60">${b.name}</div><div class="sub">已建造</div></div></div>`;}
  }
  const bd=openModal({title:'建造設施',body});
  $$('.item-row[data-bid]',bd).forEach(r=>{
    r.onclick=()=>{
      const bid=r.dataset.bid;const b=BUILDINGS[bid];
      for(const [k,v] of Object.entries(b.cost))if(materialEquivalent(k)<v){notify('材料不足，無法建造','error');return;}
      for(const [k,v] of Object.entries(b.cost))consumeMaterial(k,v);
      state.base.slots[i]={id:bid,lv:1};addProf('craft',1);refreshPlayerStats();save();closeModal();renderBase();
      notify(`建造完成：${b.name}`,'ok');
    };
  });
}
function renderModQueueHtml(workbenchLv){
  if(!state.crafting||!state.crafting.length)return '';
  const now=Date.now();
  const genLv=getBuildingLv('generator');const sm=1 + genLv * 0.04;
  let html=`<div style="font-size:11px;color:#4caf50;font-weight:bold;margin:8px 0 6px">📋 改造隊列（${state.crafting.filter(c=>c.type==='mod').length}/${workbenchLv}）</div>`;
  for(const c of state.crafting){
    if(c.type!=='mod')continue;
    const info=c.modInfo;
    const total=c.time*1000/sm;
    const elapsed=now-c.startTime;
    const pct=Math.min(100,(elapsed/total)*100);
    const remain=Math.max(0,Math.ceil((total-elapsed)/1000));
    const newName=namedWeaponName(info.baseId,info.mag,info.scope);
    html+=`<div class="craft-slot"><div style="flex:1"><div style="color:#e8a33d;font-weight:bold;font-size:11px">${newName}</div><div class="progress"><div class="fill" style="width:${pct}%"></div></div><div style="font-size:9px;color:#7a6f60;margin-top:2px">剩餘 ${remain}s</div></div></div>`;
  }
  html+='<div class="divider"></div>';
  return html;
}
function openModding(workbenchLv){
  const candidates=[];
  for(const slot of ['primary','secondary']){
    const id=state.player.equipped[slot];
    const rar=state.player.equippedRarity[slot];
    if(!id||!rar) continue;
    if(rar==='傳奇'||rar==='具名'){
      const def=itemDef(id);
      if(!def) continue;
      const baseId = def.named ? def.baseId : id;
      if(!WEAPONS[baseId]) continue;
      const rules=WEAPON_MOD_RULES[baseId]||{mags:[],scopes:[]};
      const magOpts = getMagOptionsForWeapon(baseId);
      const scopeOpts = rules.scopes||[];
      if(magOpts.length || scopeOpts.length){
        candidates.push({id, rarity:rar, baseId, mag:def.mag, scope:def.scope||null, equippedSlot:slot, def});
      }
    }
  }
  for(const k in state.inventory){
    const [id,r]=k.split('@');
    if(r!=='傳奇'&&r!=='具名') continue;
    const def=itemDef(id);
    if(!def) continue;
    const baseId = def.named ? def.baseId : id;
    if(!WEAPONS[baseId]) continue;
    const rules=WEAPON_MOD_RULES[baseId]||{mags:[],scopes:[]};
    const magOpts = getMagOptionsForWeapon(baseId);
    const scopeOpts = rules.scopes||[];
    if(magOpts.length || scopeOpts.length){
      candidates.push({id, rarity:r, baseId, mag:def.mag, scope:def.scope||null, equippedSlot:null, def, count:state.inventory[k]});
    }
  }
  candidates.sort((a,b)=>{
    const ra = RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity);
    if(ra !== 0) return ra;
    const an = (a.def && a.def.name) || '';
    const bn = (b.def && b.def.name) || '';
    return an.localeCompare(bn, 'zh-Hant');
  });
  let body='<div style="font-size:11px;color:#e8a33d;font-weight:bold;margin-bottom:6px">🔧 改造傳奇武器</div>';
  body+='<div style="font-size:9px;color:#7a6f60;margin-bottom:8px">改造需要：對應武器熟練度滿級（Lv.'+MAX_PROF_LEVEL+'）</div>';
  body+=`<div id="mod-queue-area">${renderModQueueHtml(workbenchLv)}</div>`;
  if(!candidates.length){
    body+='<div class="empty-hint">沒有可改造的傳奇武器</div>';
    body+='<div style="font-size:9px;color:#7a6f60;margin-top:8px;padding:6px;background:#1a1510;border-radius:4px">可改造的傳奇武器需：<br>· 稀有度為傳奇或具名<br>· 具備改造槽位（彈匣/瞄具）</div>';
    openModal({title:'工作台',body});
    return;
  }
  for(const c of candidates){
    const wdef=WEAPONS[c.baseId];
    const rules=WEAPON_MOD_RULES[c.baseId]||{mags:[],scopes:[]};
    const typeMaxed=isProfMaxed(wdef.type);
    const eqLabel=c.equippedSlot?'（裝備中）':`×${c.count||1}`;
    body+=`<div class="item-row" data-idx="${candidates.indexOf(c)}" style="${typeMaxed?'':'opacity:.5'}"><div class="icon">${itemIcon(c.id,30)}</div><div class="info"><div class="nm ${c.rarity==='具名'?'r-具名':'r-傳奇'}">${c.def.name} ${eqLabel}</div><div class="sub">彈匣：${getMagOptionsForWeapon(c.baseId).join('/')||'—'} ｜ 瞄具：${(rules.scopes||[]).join('/')||'—'}</div><div class="sub" style="color:${typeMaxed?'#4caf50':'#e05252'}">熟練度 ${Math.floor(state.proficiency[wdef.type]||0)}/${MAX_PROF_LEVEL}</div></div></div>`;
  }
  const bd=openModal({title:'工作台 · 改造',body});
  if(modQueueTimer){clearInterval(modQueueTimer);modQueueTimer=null;}
  modQueueTimer=setInterval(()=>{const qa=document.getElementById('mod-queue-area');if(!qa){if(modQueueTimer){clearInterval(modQueueTimer);modQueueTimer=null;}return;}qa.innerHTML=renderModQueueHtml(workbenchLv);},500);
  $$('.item-row[data-idx]',bd).forEach(r=>{
    r.onclick=()=>{
      const idx = parseInt(r.dataset.idx);
      const c = candidates[idx];
      const wdef=WEAPONS[c.baseId];
      if(!isProfMaxed(wdef.type)){notify(`${wdef.type} 熟練度未滿級`,'error');return;}
      closeModal();
      const initMag = (c.mag === wdef.mag) ? null : c.mag;
      const initScope = c.scope || null;
      openModdingOptions(c.baseId, c.rarity, c.equippedSlot, workbenchLv, {mag: initMag, scope: initScope}, c.id, c.rarity, () => openModding(workbenchLv));
    };
  });
}
function openModdingOptions(baseId, baseRarity, equippedSlot, workbenchLv, state_mod, originalId, originalRarity, onCancel){
  const wdef=WEAPONS[baseId];
  const rules=WEAPON_MOD_RULES[baseId]||{mags:[],scopes:[]};
  if(!state_mod)state_mod={mag:null,scope:null};
  const defaultMag = wdef.mag;
  const magOptions = getMagOptionsForWeapon(baseId);
  function renderModBody(){
    let body='';
    body+=`<div style="font-size:12px;font-weight:bold;color:#e8a33d;margin-bottom:4px">${wdef.name} <span class="r-傳奇">(傳奇)</span></div>`;
    body+=`<div style="font-size:10px;color:#7a6f60;margin-bottom:8px">基礎彈匣：${defaultMag}｜口徑：${wdef.cal}</div>`;
    if(magOptions.length){
      body+=`<div style="color:#e8a33d;font-weight:bold;font-size:11px;margin:8px 0 4px">彈匣擴展（可選）</div>`;
      body+=`<div class="mod-opt ${state_mod.mag===null?'on':''}" data-opt="mag" data-val=""><div class="nm">保持原彈匣（${defaultMag}）</div><div class="bonus">—</div></div>`;
      for(const m of magOptions){
        if(m === defaultMag) continue;
        const bonus = m - defaultMag;
        body+=`<div class="mod-opt ${state_mod.mag===m?'on':''}" data-opt="mag" data-val="${m}"><div class="nm">${m} 發彈匣</div><div class="bonus">容量 +${bonus}</div></div>`;
      }
    }
    if(rules.scopes&&rules.scopes.length){
      const _scopesRaw = rules.scopes.slice();
      _scopesRaw.sort((a,b)=>{
        const ia = SCOPE_BONUS[a] || 0;
        const ib = SCOPE_BONUS[b] || 0;
        if(ia !== ib) return ib - ia;
        return (SCOPE_NAME[a] || a).localeCompare(SCOPE_NAME[b] || b, 'zh-Hant');
      });
      const sortedScopes = _scopesRaw;
      body+=`<div style="color:#e8a33d;font-weight:bold;font-size:11px;margin:8px 0 4px">瞄具（可選）</div>`;
      body+=`<div class="mod-opt ${state_mod.scope===null?'on':''}" data-opt="scope" data-val=""><div class="nm">不裝瞄具</div><div class="bonus">—</div></div>`;
      for(const s of sortedScopes){body+=`<div class="mod-opt ${state_mod.scope===s?'on':''}" data-opt="scope" data-val="${s}"><div class="nm">${SCOPE_NAME[s]||s}</div><div class="bonus">命中 +${SCOPE_BONUS[s]||0}%</div></div>`;}
    }
    const mag=state_mod.mag;const scope=state_mod.scope;
    if(mag||scope){
      const newName=namedWeaponName(baseId,mag,scope);
      const totalCost={};
      if(mag){const c=calcModCost(baseId,mag,null);for(const k in c)totalCost[k]=(totalCost[k]||0)+c[k];}
      if(scope){const c=calcModCost(baseId,null,scope);for(const k in c)totalCost[k]=(totalCost[k]||0)+c[k];}
      const totalTime=calcModTime(baseId,mag,scope);
      body+=`<div class="divider"></div>`;
      body+=`<div style="color:#a45ede;font-weight:bold;font-size:12px;margin:4px 0">${newName}</div>`;
      let ok=true;
      for(const [k,v] of Object.entries(totalCost)){const have=materialEquivalent(k);const ok2=have>=v;if(!ok2)ok=false;body+=`<div class="stat-line"><span class="k">${MATERIALS[k].name}</span><span class="v" style="color:${ok2?'#4caf50':'#e05252'}">${have}/${v}</span></div>`;}
      {const _ft=totalTime>=3600?Math.round(totalTime/3600)+' 小時':(totalTime>=60?Math.round(totalTime/60)+' 分鐘':totalTime+' 秒');body+=`<div class="stat-line"><span class="k">花費時間</span><span class="v">${_ft}</span></div>`;}
      return {body,ok,totalCost,totalTime};
    }
    return {body,ok:false,totalCost:{},totalTime:0};
  }
  const result=renderModBody();
  const ft=el('div','modal-ft');
  ft.innerHTML=`<button class="btn primary" id="m-confirm" ${result.ok?'':'disabled'}>改造</button><button class="btn ghost" id="m-exit">退出</button>`;
  const bd=openModal({title:`改造 ${wdef.name}`,body:result.body,footer:ft});
  $$('.mod-opt',bd).forEach(o=>{
    o.onclick=()=>{
      const opt=o.dataset.opt;const val=o.dataset.val;
      if(opt==='mag')state_mod.mag=val?parseInt(val,10):null;
      if(opt==='scope')state_mod.scope=val||null;
      closeModal();
      openModdingOptions(baseId,baseRarity,equippedSlot,workbenchLv,state_mod,originalId,originalRarity,onCancel);
    };
  });
  ft.querySelector('#m-exit').onclick=()=>{ closeModal(); if(onCancel) onCancel(); };
  ft.querySelector('#m-confirm').onclick=()=>{
    const r=renderModBody();
    if(!r.ok){notify('材料不足','error');return;}
    const maxQueue=workbenchLv||1;
    if(!state.crafting)state.crafting=[];
    if(state.crafting.length>=maxQueue){notify(`改造隊列已滿（上限 ${maxQueue}）`,'error');return;}
    for(const [k,v] of Object.entries(r.totalCost))consumeMaterial(k,v);
    state.crafting.push({type:'mod',modInfo:{baseId,baseRarity,mag:state_mod.mag,scope:state_mod.scope,fromEquippedSlot:equippedSlot,originalId,originalRarity},time:r.totalTime,startTime:Date.now()});
    save();closeModal();
    notify('已加入改造隊列','ok');
  };
}
function rarityPolicyBlockHTML(prefix, title, ctx, showExclude){
  if(showExclude === undefined) showExclude = true;
  const pri = ctx.priority || '一般';
  const fb = ctx.fallback || 'desc';
  const ex = ctx.exclude || [];
  let h = `<div style="color:#e8a33d;font-weight:bold;font-size:11px;margin:10px 0 6px">${title}</div>`;
  h += `<div style="display:flex;align-items:center;gap:8px;padding:4px 0"><span style="flex:0 0 60px;color:#7a6f60;font-size:11px">優先使用</span><select id="${prefix}-pri" style="flex:1;background:#151210;color:#ddd;border:1px solid #2a231c;border-radius:4px;padding:4px 6px;font-size:11px">`;
  for(const r of RARITY_ORDER){h += `<option value="${r}" ${pri===r?'selected':''}>${r}</option>`;}
  h += `</select></div>`;
  if(showExclude){
    h += `<div style="display:flex;align-items:flex-start;gap:8px;padding:4px 0"><span style="flex:0 0 60px;color:#7a6f60;font-size:11px;padding-top:4px">不使用</span><div style="flex:1;display:flex;flex-wrap:wrap;gap:4px">`;
    for(const r of UI_RARITY_LIST){
      const on = ex.includes(r);
      const bc = on ? '#e05252' : '#3a2f25';
      const bg = on ? '#3a1a1a' : '#241d16';
      const tc = on ? '#e05252' : '#a89a85';
      h += `<label class="excl-label" data-prefix="${prefix}" data-r="${r}" style="cursor:pointer;font-size:10px;padding:3px 8px;border-radius:4px;border:1px solid ${bc};background:${bg};color:${tc};user-select:none;display:flex;align-items:center;gap:4px;line-height:1.2"><input type="checkbox" class="excl-cb" data-prefix="${prefix}" data-r="${r}" ${on?'checked':''} style="accent-color:#e05252;margin:0;width:auto;flex:0 0 auto">${r}</label>`;
    }
    h += `</div></div>`;
  }
  h += `<div style="display:flex;align-items:center;gap:8px;padding:4px 0"><span style="flex:0 0 60px;color:#7a6f60;font-size:11px">用罄後</span><select id="${prefix}-fb" style="flex:1;background:#151210;color:#ddd;border:1px solid #2a231c;border-radius:4px;padding:4px 6px;font-size:11px">`;
  h += `<option value="desc" ${fb==='desc'?'selected':''}>降序（傳奇→破舊）</option>`;
  h += `<option value="asc" ${fb==='asc'?'selected':''}>升序（破舊→傳奇）</option>`;
  h += `</select></div>`;
  return h;
}
let currentTab='explore';
let _sceneFadeTimer = null;
function _applySceneFadeIn(){
  ['zone1','zone2','zone3'].forEach(function(id){
    const el=document.getElementById(id);
    if(!el)return;
    el.classList.remove('scene-enter');
    void el.offsetWidth;
    el.classList.add('scene-enter');
  });
  if(_sceneFadeTimer) clearTimeout(_sceneFadeTimer);
  _sceneFadeTimer = setTimeout(function(){
    ['zone1','zone2','zone3'].forEach(function(id){
      const el=document.getElementById(id);
      if(el)el.classList.remove('scene-enter');
    });
    _sceneFadeTimer = null;
  }, 320);
}
function renderCurrentTab(){
  if(currentTab==='explore')renderExplore();
  else if(currentTab==='combat')renderCombat();
  else if(currentTab==='base')renderBase();
  _applySceneFadeIn();
}
$$('.tab').forEach(t=>{
  t.onclick=()=>{
    if(BossModule.isActive()){if(!confirm('戰鬥尚未結束，確定要離開嗎？'))return;BossModule.battle.active=false;BossModule.battle=null;}
    currentTab=t.dataset.tab;
    if(currentTab==='base') _regionScrollPos=0;
    $$('.tab').forEach(x=>x.classList.toggle('active',x===t));
    renderCurrentTab();
  };
});

let lastTickTime=Date.now();
function onlineTick(){
  const now=Date.now();const dt=now-lastTickTime;lastTickTime=now;
  if(dt>EVENT_INTERVAL_MS*2){console.log('[tick] 偵測到離線中斷，時間差:',(dt/1000).toFixed(1),'秒');offlineSettle();return;}
  if(BossModule.isActive())return;
  doExploreTick();
}

let _tickTimer = null;
function _getNextDelay(){
  /* v59-delay-add: 治療延遲疊加在基礎探索時長上 */
  const now = Date.now();
  const interval = getExploreInterval();
  if(state.exploreDelayUntil && state.exploreDelayUntil > now){
    return interval + (state.exploreDelayUntil - now);
  }
  return interval;
}
function _scheduleNextTick(){
  if(_tickTimer) clearTimeout(_tickTimer);
  _tickTimer = setTimeout(()=>{
    const now = Date.now();
    const dt = now - lastTickTime;
    lastTickTime = now;
    const maxInterval = Math.max(getExploreInterval(), EVENT_INTERVAL_MS);
    if(dt > maxInterval*3){
      offlineSettle();
      _scheduleNextTick();
      return;
    }
    if(BossModule.isActive()){
      _scheduleNextTick();
      return;
    }
    if(state.exploreDelayUntil && now < state.exploreDelayUntil){
      _scheduleNextTick();
      return;
    }
    if(state.exploreDelayUntil && now >= state.exploreDelayUntil){
      state.exploreDelayUntil = 0;
      if(state.pendingHealFull){
        state.player.hp = state.player.maxHp;
        state.pendingHealFull = false;
        refreshPlayerStats();
      }
    }
    doExploreTick();
    save();
    _scheduleNextTick();
  }, _getNextDelay());
}
_scheduleNextTick();
setInterval(()=>{buildingTick();},30000);

let _heroWalkSwitchAt = 0;
function _tickHeroWalkSwitch(now){
  if(_heroWalkSwitchAt === 0){
    _heroWalkSwitchAt = now + 3000 + Math.random() * 3000;
    return;
  }
  if(now < _heroWalkSwitchAt) return;
  _heroWalkSwitchAt = now + 3000 + Math.random() * 3000;
  /* 僅在探索、且沒在播放 oneshot 動畫時切換 */
  if(currentTab !== 'explore') return;
  if(heroAnim.eqSlot) return;
  if(heroAnim.name === 'walk'){ heroAnim.name = 'run'; heroAnim.frame = 0; heroAnim.lastUpdate = now; }
  else if(heroAnim.name === 'run'){ heroAnim.name = 'walk'; heroAnim.frame = 0; heroAnim.lastUpdate = now; }
}
function heroLoop(now){
  _tickHeroWalkSwitch(now);
  updateHeroAnim(now);
  if(currentTab === 'explore'){ renderExploreHeroCanvas(); }
  requestAnimationFrame(heroLoop);
}
requestAnimationFrame(heroLoop);

window.addEventListener('resize', () => {
  if(currentTab === 'explore') renderExploreHeroCanvas();
  if(currentTab === 'combat' && BossModule.isActive()) {
    if(BossModule.battle) BossModule.battle.lastH = 0;
    renderBattleHeroCanvas();
    renderBossBattleCanvas();
  }
  if(currentTab === 'explore' || currentTab === 'combat') renderZone2Silhouette();
});

document.addEventListener('visibilitychange',()=>{if(document.hidden){save();}else{offlineSettle();refreshPlayerStats();save();renderCurrentTab();}});
window.addEventListener('beforeunload',save);

function init(){
  const loaded=load();
  if(loaded){
    const elapsed=Date.now()-(state.lastSeen||Date.now());
    if(elapsed>60000){console.log('[init] 距上次儲存',(elapsed/1000).toFixed(1),'秒，觸發離線結算');offlineSettle();}
  } else {
    invAddRaw('6kh2','一般',1);
    invAddRaw('bandage','一般',3);
    invAddRaw('ai2','一般',1);
    invAddRaw('5.45_ps','一般',30);
    invAddRaw('9x19_ps','一般',16);
    state.player.equipped.melee='6kh2';
    state.player.equippedRarity.melee='一般';
    invRemove('6kh2','一般',1);
    state.player.equipped.backpack='bplarge';
    state.player.equippedRarity.backpack='傳奇';
    pushLog('<span class="pl">玩家</span> 在廢土中醒來，身上只有一把 <span class="r-一般">6Kh2 刺刀</span> 和一個 <span class="r-傳奇">探險背包</span>。',[],'explore');
  }
  refreshPlayerStats();
  if(state.player.hp<=0)state.player.hp=state.player.maxHp;
  state.player.armor=Math.min(state.player.armor||0,state.player.maxArmor);
  lastTickTime=Date.now();
  save();renderCurrentTab();
  /* rev106: 提前預載探索背景圖，避免播放時才下載造成閃爍 */
  setTimeout(function(){
    try{
      if(typeof preloadExploreBackgrounds === 'function'){
        const _queued = preloadExploreBackgrounds();
        if(_queued > 0) console.log('[assets] 預載探索背景圖 ' + _queued + ' 張');
      }
    }catch(e){ console.warn('[assets] 背景預載失敗', e); }
  }, 800);
  console.log('=== 廢土求生',VERSION,'啟動 ===');

  setTimeout(async ()=>{
    const changed = await probeAssetVersion();
    if(changed){
      console.log('[assets] 重新渲染以套用新版資源');
      renderCurrentTab();
      try{ if(typeof preloadExploreBackgrounds === 'function') preloadExploreBackgrounds(); }catch(e){}
    }
  }, 500);
}
init();

document.addEventListener('click',e=>{
  const t=e.target.closest('.itm');
  if(t&&t.dataset.iid)openItemDetail(t.dataset.iid,t.dataset.irar);
});

window.WastelandGame={VERSION,get state(){return state;},save,renderCurrentTab,addProf,notify,offlineSettle,getMeleeHits,getOrCreateNamedItem,BossModule,probeAssetVersion,get assetVersion(){return ASSET_VERSION;}};



/* ===== rev250: 种植链路诊断 ===== */
(function(){
  if(window._plantDiagInstalled) return;
  window._plantDiagInstalled = true;
  var _wrap = function(name){
    if(typeof window[name] !== 'function'){ console.warn('[plant-diag] ' + name + ' 不存在'); return; }
    var _orig = window[name];
    window[name] = function(){
      try { console.log('[plant-diag] 呼叫 ' + name, Array.prototype.slice.call(arguments)); } catch(e){}
      var _r = _orig.apply(this, arguments);
      try { console.log('[plant-diag] 返回 ' + name + ' →', _r); } catch(e){}
      return _r;
    };
  };
  setTimeout(function(){
    _wrap('openGardenSoilAction');
    _wrap('openGardenSeedPickerWithRemove');
    _wrap('openGardenCropDetailWithRemove');
    _wrap('gardenPlantSeed');
    _wrap('gardenStorageRemove');
    console.log('[plant-diag] 已包裝：openGardenSoilAction / openGardenSeedPickerWithRemove / openGardenCropDetailWithRemove / gardenPlantSeed / gardenStorageRemove');
  }, 500);
})();
/* ===== end rev250 ===== */

/* ===== rev255: 五修合一 ===== */
(function(){
  if(window._rev255Installed) return;
  window._rev255Installed = true;

  /* ── ① 收获 ── */
  window.gardenHarvest = function(idx){
    try {
      const plots = _gardenGetPlots();
      const plot = plots[idx];
      if(!plot || !plot.crop){ console.warn('[harvest] 无作物', idx); return; }
      const c = plot.crop;
      const seed = SEEDS[c.seedId];
      if(!seed){ console.warn('[harvest] 无效种子', c.seedId); return; }
      const now = Date.now();
      if(now < c.matureAt){ console.warn('[harvest] 未成熟'); return; }
      const rottenAt = c.matureAt + seed.rotMs;
      if(now >= rottenAt){ console.warn('[harvest] 已腐烂'); return; }
      const baseYield = seed.baseYield;
      const mult = RARITY_MULT[c.rarity] || 1;
      const expected = baseYield * mult;
      const jitter = 0.8 + Math.random() * 0.4;
      const count = Math.max(1, Math.round(expected * jitter));
      const cropDef = CROPS[seed.cropId];
      gardenStorageAdd(seed.cropId, c.rarity, count);
      plot.crop = null;
      save();
      try { closeModal(); } catch(e){}
      notify('收穫：' + (cropDef ? cropDef.name : '作物') + ' ×' + count, 'ok');
      console.log('[harvest] 成功', cropDef ? cropDef.name : seed.cropId, c.rarity, '×' + count);
      renderGardenGrid();
      renderGardenContent();
    } catch(err){
      console.error('[harvest] 异常', err);
    }
  };

  /* ── ②③ 指派立即生效 + 僕人列表立即重排 ── */
  window._refreshServantListNow = function(){
    try {
      const p = document.getElementById('garden-page');
      if(!p) return;
      if(typeof _gardenActiveTab === 'undefined' || _gardenActiveTab !== 'servant') return;
      const box = p.querySelector('#gp-content');
      if(!box) return;
      if(typeof renderGardenServants === 'function') renderGardenServants(box);
    } catch(e){ console.warn('[refresh servants] err', e); }
  };

  window.openServantAssign = function(srvId){
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
        } else if(plot.type !== def.targetPlot){
          cls += ' mismatch';
          const t = GARDEN_PLOT_TYPES[plot.type] || {icon:'?'};
          inner = '<div class="srv-sa-icon">' + ((plot.type === 'soil') ? '🌱' : t.icon) + '</div>'; disabled = true;
        } else {
          const t = GARDEN_PLOT_TYPES[plot.type];
          const owner = plot.assignedServant;
          if(selected[i]) cls += ' selected';
          if(owner && owner !== srvId) cls += ' occupied';
          inner = '<div class="srv-sa-icon">' + ((plot.type === 'soil') ? '🌱' : t.icon) + '</div>';
          if(owner && owner !== srvId){
            const otherSrv = (state.servants || []).find(function(s){ return s.id === owner; });
            if(otherSrv){
              const oDef = SERVANT_TYPES[otherSrv.type] || {};
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
      for(const other of (state.servants || [])){
        if(other.id === srvId) continue;
        if(!Array.isArray(other.assignedPlots)) continue;
        other.assignedPlots = other.assignedPlots.filter(function(x){ return newList.indexOf(x) === -1; });
      }
      const oldList = srv.assignedPlots || [];
      for(const oldIdx of oldList){
        if(newList.indexOf(oldIdx) === -1){
          const p2 = plots[oldIdx];
          if(p2 && p2.assignedServant === srvId) delete p2.assignedServant;
        }
      }
      for(const newIdx of newList){
        if(plots[newIdx]) plots[newIdx].assignedServant = srvId;
      }
      srv.assignedPlots = newList;
      save();
      renderGardenGrid();
      if(typeof _refreshServantListNow === 'function') _refreshServantListNow();
    }
    const ft = document.createElement('div');
    ft.className = 'modal-ft';
    ft.innerHTML = '<button class="btn ghost" id="srv-assign-close">關閉</button>';
    const bd = openModal({ title: '指派 ' + def.name, body: renderGridHtml(), footer: ft });
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
            if(countSel() >= maxSlots){ notify('已達上限 ' + maxSlots + ' 格', 'error'); return; }
            const owner = plot.assignedServant;
            if(owner && owner !== srvId){
              openConfirm('此格已被其他僕人指派，是否取代？', function(){
                selected[idx] = true;
                applyAndSave();
                refresh();
              });
              return;
            }
            selected[idx] = true;
            applyAndSave();
            refresh();
          };
        })(cells[i]);
      }
    }
    function refresh(){
      bd.innerHTML = renderGridHtml();
      bindCells();
    }
    bindCells();
    ft.querySelector('#srv-assign-close').onclick = closeModal;
  };

  /* ── ④ 产线进度实时刷新 ── */
  window._startMerchantLiveTimer = function(){
    if(window._merchantLiveTimer) return;
    window._merchantLiveTimer = setInterval(function(){
      if(typeof _gardenActiveTab === 'undefined' || _gardenActiveTab !== 'merchant') return;
      const p = document.getElementById('garden-page');
      if(!p || !p.classList.contains('on')) return;
      if(typeof _gardenMerchantRefreshUI === 'function') _gardenMerchantRefreshUI();
    }, 1000);
  };
  window._startMerchantLiveTimer();

  console.log('[rev255] 收获 / 指派立即 / 重排 / 进度实时 已安装');
})();
/* ===== end rev255 ===== */

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
const GARDEN_MEAL_INTERVAL_MS = 3600000;
const FOOD_COST_BASE = { full: 20, normal: 15, half: 10, lick: 5, starve: 0 };
const RARITY_FOOD_MULT = { '破舊': 0.8, '一般': 1, '庫存': 1.5, '精品': 2.5, '傳奇': 5 };

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

function _offlineFindFarmerTask(srv, t){
  const plots = _gardenGetPlots();
  const cleanCands = [];
  for(const idx of (srv.assignedPlots || [])){
    const plot = plots[idx];
    if(!plot || plot.type !== 'soil' || !plot.crop) continue;
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
    if(!plot || plot.type !== 'soil' || !plot.crop) continue;
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
      if(!plot || plot.type !== 'soil') continue;
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

function _offlineDoFarmerTask(srv, task, t){
  const plots = _gardenGetPlots();
  const plot = plots[task.plotIdx];
  if(!plot) return { ok: false };
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
    const count = Math.max(1, Math.round(seed.baseYield * mult * _fB * _foB));
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
    let growMs = seed.growMs;
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
  const g = _gardenMerchantInit();
  if(now <= baseTime) return;
  const WORK_MS = (typeof GARDEN_WORK_MS === 'number') ? GARDEN_WORK_MS : 4000;
  const MAX_ITER = 5000;
  let cursor = baseTime;
  let totalHarvest = 0, totalPlant = 0, totalClean = 0, totalLeaves = 0;
  const cropsOut = {};
  const seedsOut = {};
  const matsOut = {};
  let lastMealHour = Math.floor(baseTime / GARDEN_MEAL_INTERVAL_MS);
  const farmers = (state.servants || []).filter(function(s){
    return s.type === 'farmer' && s.assignedPlots && s.assignedPlots.length > 0;
  });
  const actorMap = {};
  for(const f of farmers){
    const effMax = servantEffectiveMaxStamina(f);
    actorMap[f.id] = {
      srv: f,
      stamina: Math.min(f.stamina || 0, effMax),
      task: null,
      taskEnd: 0
    };
  }
  let iter = 0;
  while(cursor < now && iter < MAX_ITER){
    iter++;
    let nextT = now;
    const nextHour = (Math.floor(cursor / GARDEN_MEAL_INTERVAL_MS) + 1) * GARDEN_MEAL_INTERVAL_MS;
    if(nextHour < nextT) nextT = nextHour;
    const m = g.merchant;
    for(const lk of ['food','seed','throw']){
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
    }
    if(nextT <= cursor){ cursor += 1000; continue; }
    if(nextT > now) nextT = now;
    cursor = nextT;
    const curHour = Math.floor(cursor / GARDEN_MEAL_INTERVAL_MS);
    while(lastMealHour < curHour){
      _gardenDoOneMeal(g);
      lastMealHour++;
    }
    if(typeof _gardenMerchantLineProcess === 'function'){
      _gardenMerchantLineProcess('food', cursor);
      _gardenMerchantLineProcess('seed', cursor);
      _gardenMerchantLineProcess('throw', cursor);
    }
    for(const id in actorMap){
      const a = actorMap[id];
      if(a.task && cursor >= a.taskEnd){
        const r = _offlineDoFarmerTask(a.srv, a.task, cursor);
        if(r.ok){
          if(r.harvest){
            totalHarvest++;
            if(r.cropKey) cropsOut[r.cropKey] = (cropsOut[r.cropKey] || 0) + (r.cropCount || 1);
          }
          if(r.plant) totalPlant++;
          if(r.clean) totalClean++;
          a.stamina = Math.max(0, a.stamina - 5);
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
      const task = _offlineFindFarmerTask(a.srv, cursor);
      if(task){
        a.task = task;
        a.taskEnd = cursor + WORK_MS;
      }
    }
    if(cursor % GARDEN_MEAL_INTERVAL_MS < 5000){
      const lr = _gardenServantLeaveCheck(true);
      totalLeaves += lr.count || 0;
      for(const k in lr.seeds) seedsOut[k] = (seedsOut[k] || 0) + lr.seeds[k];
      for(const k in lr.mats) matsOut[k] = (matsOut[k] || 0) + lr.mats[k];
    }
  }
  g.lastMealAt = Math.floor(now / GARDEN_MEAL_INTERVAL_MS) * GARDEN_MEAL_INTERVAL_MS;
  if(totalHarvest + totalPlant + totalClean + totalLeaves > 0){
    const hours = ((now - baseTime) / 3600000).toFixed(1);
    const detail = {
      type: 'offline_garden',
      hours: hours,
      harvest: totalHarvest,
      plant: totalPlant,
      clean: totalClean,
      leaves: totalLeaves,
      crops: cropsOut,
      seeds: seedsOut,
      mats: matsOut
    };
    const parts = [];
    if(totalHarvest) parts.push('收穫 ' + totalHarvest + ' 次');
    if(totalPlant) parts.push('種植 ' + totalPlant + ' 次');
    if(totalClean) parts.push('清理 ' + totalClean + ' 次');
    if(totalLeaves) parts.push(totalLeaves + ' 名僕人離開');
    const summary = '離線 ' + hours + ' 小時，後院：' + parts.join('、') + '。 點擊查看 →';
    if(!state.garden.log) state.garden.log = [];
    state.garden.log.push({ t: Date.now(), text: summary, cls: 'offline', detail: detail });
    if(state.garden.log.length > 100) state.garden.log.splice(0, state.garden.log.length - 100);
  }
}



function gardenCleanup(idx){
  const plots = _gardenGetPlots();
  const plot = plots[idx];
  if(!plot || !plot.crop) return;
  plot.crop = null;
  save();
  try{ closeModal(); }catch(e){}
  _gardenLog('手動清理腐爛作物（' + plotCoordName(idx) + '）', 'clean');
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
function _openGardenLogDetail(entry){
  if(!entry || !entry.detail) return;
  const d = entry.detail;
  let body = '';
  if(d.type === 'offline_garden'){
    body += '<div style="font-size:11px;color:#7a6f60;margin-bottom:8px;line-height:1.5">' + _esc(entry.text) + '</div>';

    const _cArr = [], _sArr = [], _mArr = [];
    if(d.crops){ for(const k in d.crops){ const sp = k.split('@'); _cArr.push({ id: sp[0], rarity: sp[1], count: d.crops[k] }); } }
    if(d.seeds){ for(const k in d.seeds){ const sp = k.split('@'); _sArr.push({ id: sp[0], rarity: sp[1], count: d.seeds[k] }); } }
    if(d.mats){ for(const k in d.mats){ _mArr.push({ id: k, rarity: '一般', count: d.mats[k] }); } }
    if(!window._gLogCollapsed) window._gLogCollapsed = {};
    function _catHtml(title, items){
      if(!items.length) return '';
      const col = window._gLogCollapsed[title];
      let h = '<div class="cat-header" data-gcat="' + title + '" style="cursor:pointer"><span>' + title + ' (' + items.length + ')</span><span>' + (col ? '▶' : '▼') + '</span></div>';
      if(!col){
        for(const it of items){
          const def = itemDef(it.id) || { name: it.id };
          h += '<div class="item-row" data-iid="' + it.id + '" data-irar="' + it.rarity + '"><div class="icon" style="background:' + rarityBg(it.rarity) + '">' + itemIcon(it.id, 30) + '</div><div class="info"><div class="nm ' + rarityClass(it.rarity) + '">' + def.name + '</div><div class="sub">' + it.rarity + '</div></div><div class="cnt">×' + it.count + '</div></div>';
        }
      }
      return h;
    }
    body += _catHtml('🌾 作物', _cArr);
    body += _catHtml('🌰 種子', _sArr);
    body += _catHtml('🔩 材料', _mArr);
  }
  const ft = document.createElement('div');
  ft.className = 'modal-ft';
  ft.innerHTML = '<button class="btn ghost" id="gl-close">關閉</button>';
  const bd = openModal({ title: '📦 離線後院', body: body, footer: ft });
  ft.querySelector('#gl-close').onclick = closeModal;
  const _hds = bd.querySelectorAll('.cat-header[data-gcat]');
  for(let _i = 0; _i < _hds.length; _i++){
    (function(h){
      h.onclick = function(){
        if(!window._gLogCollapsed) window._gLogCollapsed = {};
        window._gLogCollapsed[h.getAttribute('data-gcat')] = !window._gLogCollapsed[h.getAttribute('data-gcat')];
        closeModal();
        _openGardenLogDetail(entry);
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
  ft.innerHTML = '<button class="btn ghost" id="bl-close">關閉</button>';
  openModal({ title: '⚔️ 戰鬥詳情', body: body, footer: ft });
  ft.querySelector('#bl-close').onclick = closeModal;
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
  let left = '<div class="gs-title">🌱 生產</div>';
  left += '<div class="gs-wrap" data-col="prod">';
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
  let right = '<div class="gs-title">⚔️ 戰鬥</div>';
  right += '<div class="gs-wrap" data-col="battle">';
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
  const _logLines = box.querySelectorAll('.garden-log-line[data-log-idx]');
  for(const el of _logLines){
    el.onclick = function(){
      const idx = parseInt(el.getAttribute('data-log-idx'), 10);
      const entry = log[idx];
      if(entry && entry.detail) _openGardenLogDetail(entry);
    };
  }
  const _bl = box.querySelectorAll('.battle-log-item[data-battle-idx]');
  for(const el of _bl){
    el.onclick = function(){
      const idx = parseInt(el.getAttribute('data-battle-idx'), 10);
      const entry = battleLog[idx];
      if(entry) _openBattleLogDetail(entry);
    };
  }
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
  if(s == null) return '';
  return String(s).split('&').join('&amp;').split('<').join('&lt;').split('>').join('&gt;').split('"').join('&quot;');
}

function openServantRename(srvId){
  const srv = (state.servants || []).find(function(s){ return s.id === srvId; });
  if(!srv) return;
  const cur = srv.customName || '';
  const ft = document.createElement('div');
  ft.className = 'modal-ft';
  ft.innerHTML = '<button class="btn primary" id="rn-ok">確定</button><button class="btn" id="rn-clear">清除</button><button class="btn ghost" id="rn-cancel">取消</button>';
  const _escaped = _servantEscHtml(cur);
  let body = '<div style="font-size:11px;color:#7a6f60;margin-bottom:6px">留空則使用編號（#' + (srv.tag || '?') + '）</div>';
  body += '<input id="rn-input" type="text" value="' + _escaped + '" style="width:100%;background:#151210;color:#ddd;border:1px solid #2a231c;border-radius:4px;padding:8px;font-size:13px;font-family:inherit;box-sizing:border-box">';
  const bd = openModal({ title: '✏️ 改名', body: body, footer: ft });
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
    openServantDetail(srvId);
  };
  ft.querySelector('#rn-clear').onclick = function(){
    srv.customName = '';
    save();
    if(typeof _refreshServantListNow === 'function') _refreshServantListNow();
    closeModal();
    openServantDetail(srvId);
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

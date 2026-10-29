// [rev824] 移除 maxHeight 并修整
// [rev823] 完整修複
// [rev816] 高度比例與科技树入口折叠
// [rev815] 車場高度與數字格式修復
// [rev814] 車場保留原結構並擴展 Dock
// [rev813] 車場重構（安全替換）
// [rev811] 車場重構
/* ============================================================
   08-base.js — 基地（控製中心 / 建築 / 區域 / 統計 / 偏好）
   由 06-part.js 拆解而來（rev343）
   ============================================================ */
/* ============================================================
   基地
   ============================================================ */
function profDisplay(v){v=v||0;if(v>=MAX_PROF_LEVEL)return `Lv.${MAX_PROF_LEVEL} (MAX)`;const capped=Math.min(MAX_PROF_LEVEL,v);const lv=Math.floor(capped),pct=Math.round((capped-lv)*100);return `Lv.${lv} (${pct}%)`;}
/* rev125: 家園輔助函式（偏好設定內嵌為第 4 折疊區） */

const _ccFolded = new Proxy({}, {
  get: function(_, k){ var v = window._collapseStates['cc.'+k]; return v === undefined ? true : !!v; },
  set: function(_, k, v){ window._collapseStates['cc.'+k] = !!v; return true; }
});

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
  const bd = openModal({title:'控製中心', body:getControlCenterBody(), footer:ft});
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
  openModal({title:'商人', body:'<div class="empty-hint">商人系統開發中，敬請期待。</div>'});
}

function openPreference(){
  const p = state.preferences;
  let body = '';
  body += rarityPolicyBlockHTML('exp', '🎯 探索模式彈藥', p.ammoExplore, true);
  body += rarityPolicyBlockHTML('texp', '💣 探索模式手雷', p.throwableExplore, true);
  const bd = openModal({title:'偏好設定', body});
  _bindPrefEvents(bd);
}
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

function _getArmoryProduction(){
  const armoryLv = getBuildingLv('armory');
  if(armoryLv <= 0) return null;
  const genLv = getBuildingLv('generator');
  const genMult = 1 + genLv * 0.2;
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
  if(!p){  return; }
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
  ft.innerHTML = '';
  openModal({ title: '軍械庫生產', body: body, footer: ft });
}

function _gardenSoilFoodPerHour(){
  const plots = _gardenGetPlots();
  let ratePerHour = 0;
  let planted = 0;
  for(const p of plots){
    if(!p || !_isSoilType(p.type) || !p.crop) continue;
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
  const genMult = 1 + genLv * 0.2;
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
  /* rev555: 食物净产 = 产能 - 總消耗（僕人+投掷線+彈藥線），統一走 _gardenFoodConsumePerHour */
  const _totalFoodConsume = (typeof _gardenFoodConsumePerHour === 'function') ? _gardenFoodConsumePerHour() : 0;
  const _foodProd = m.foodLv > 0 ? MERCHANT_FOOD_TABLE[m.foodLv].cropValue * 12 : 0;
  if(_foodProd > 0 || _totalFoodConsume > 0){
    const net = _foodProd - _totalFoodConsume;
    const st = _gardenMerchantLineStatus('food');
    rows.push({ key: 'food', label: '食物', value: (net >= 0 ? '+' : '') + net + '/h', paused: st && st.paused });
  }
  if(m.seedLv > 0){
    const st = _gardenMerchantLineStatus('seed');
    rows.push({ key: 'seed', label: '種子', value: '+' + (MERCHANT_SEED_TABLE[m.seedLv].count * 12) + '/h', paused: st && st.paused });
  }
  if(m.throwLv > 0){
    const st = _gardenMerchantLineStatus('throw');
    const _tRow = MERCHANT_THROW_TABLE[m.throwLv];
    const _tVal = _tRow.legend ? ('+' + (_tRow.count * 12) + ' 傳奇/h') : ('+' + (_tRow.count * 12) + '/h');
    rows.push({ key: 'throw', label: '投擲', value: _tVal, paused: st && st.paused });
  }
  if(m.ammoLv > 0){
    const st = _gardenMerchantLineStatus('ammo');
    const _aRow = MERCHANT_AMMO_TABLE[m.ammoLv];
    rows.push({ key: 'ammo', label: '傳奇彈藥', value: '+' + (_aRow.count * 12) + '/h', paused: st && st.paused });
  }
  const soil = _gardenSoilFoodPerHour();
  if(soil.planted > 0){
    rows.push({ key: 'soil', label: '田地', value: '+' + Math.round(soil.ratePerHour) + '/h' });
  }
  if(typeof _gardenLiquorRatePerHour === 'function'){
    const _liquorRate = Math.round(_gardenLiquorRatePerHour());
    if(_liquorRate > 0){
      rows.push({ key: 'liquor', label: '\u79C1\u9152', value: '+' + _liquorRate + '/h' });
    }
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
  if(key === 'food' || key === 'seed' || key === 'throw' || key === 'ammo'){ _openMerchantLineDetail(key); return; }
  if(key === 'soil'){ _openSoilDetail(); return; }
  if(key === 'liquor'){ _openLiquorDetail(); return; }
}

function _openRadioDetail(){
  const lv = getBuildingLv('radio');
  if(lv <= 0){  return; }
  const genLv = getBuildingLv('generator');
  const genMult = 1 + genLv * 0.2;
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
  ft.innerHTML = '';
  openModal({ title: '無線電', body: body, footer: ft });
}

function _openMerchantLineDetail(lineKey){
  const meta = _gardenMerchantLineMeta(lineKey);
  if(!meta) return;
  const g = _gardenMerchantInit();
  const m = g.merchant;
  const lv = m[meta.lvKey] || 0;
  if(lv <= 0){  return; }
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

function _openSoilDetail(){
  const plots = _gardenGetPlots();
  const list = [];
  const now = Date.now();
  for(let i = 0; i < plots.length; i++){
    const p = plots[i];
    if(!p || !_isSoilType(p.type) || !p.crop) continue;
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
  ft.innerHTML = '';
  openModal({ title: '田地', body: body, footer: ft });
}

/* rev555: 基地子分頁签左右滑動切換（stats ↔ room） */
function _bindBaseSwipe(z2){
  if(!z2) return;
  if(z2._baseSwipeAbort) z2._baseSwipeAbort.abort();
  z2._baseSwipeAbort = new AbortController();
  const sig = z2._baseSwipeAbort.signal;
  const TABS = ['stats', 'room'];
  let sx = 0, sy = 0, active = false;
  z2.addEventListener('touchstart', function(e){
    if(!e.touches || e.touches.length !== 1){ active = false; return; }
    sx = e.touches[0].clientX;
    sy = e.touches[0].clientY;
    active = true;
  }, {passive: true, signal: sig});
  z2.addEventListener('touchcancel', function(){
    active = false;
  }, {signal: sig});
  z2.addEventListener('touchend', function(e){
    if(!active) return;
    active = false;
    if(!e.changedTouches || !e.changedTouches[0]) return;
    const dx = e.changedTouches[0].clientX - sx;
    const dy = e.changedTouches[0].clientY - sy;
    if(Math.abs(dx) < 50) return;
    if(Math.abs(dy) > Math.abs(dx) * 0.6) return;
    const cur = z2.querySelector('.subnav-tab.on');
    if(!cur) return;
    const curIdx = TABS.indexOf(cur.dataset.tab);
    if(curIdx < 0) return;
    const nextIdx = dx < 0 ? curIdx + 1 : curIdx - 1;
    if(nextIdx < 0 || nextIdx >= TABS.length) return;
    const target = z2.querySelector('.subnav-tab[data-tab="' + TABS[nextIdx] + '"]');
    if(target) target.click();
  }, {passive: true, signal: sig});
}

/* ===== rev565: 車場 + 載具系統 ===== */
/* 載具數據（現實參照；tier 只影響 UI 顯示，數值不加成） */
const VEHICLES = {
  /* ---------- BTR 線 ---------- */
  btr80: {
    id: 'btr80', name: 'BTR-80', tier: 1, line: 'btr',
    weapon: '14.5mm KPVT + 7.62mm PKT',
    armor: '10mm', speedRoad: 80, speedOffroad: '40-50',
    supportDuration: 30,
    next: ['btr80a', 't80'],
    researchCost: null
  },
  btr80a: {
    id: 'btr80a', name: 'BTR-80A', tier: 2, line: 'btr',
    weapon: '30mm 2A72 + 7.62mm PKT',
    armor: '10mm', speedRoad: 87, speedOffroad: '40-50',
    supportDuration: 35,
    next: ['btr82'],
    researchCost: { ammoCal: '5.45', ammoCount: 2000, liquor: 200, exp: 1000 }
  },
  btr82: {
    id: 'btr82', name: 'BTR-82', tier: 3, line: 'btr',
    weapon: '14.5mm KPVT + 7.62mm PKT',
    armor: '10mm（加強）', speedRoad: 100, speedOffroad: '50-60',
    supportDuration: 35,
    next: ['btr82a'],
    researchCost: { ammoCal: '7.62', ammoCount: 1500, liquor: 300, exp: 2000 }
  },
  btr82a: {
    id: 'btr82a', name: 'BTR-82A', tier: 4, line: 'btr',
    weapon: '30mm 2A72 + 7.62mm PKT',
    armor: '加強', speedRoad: 100, speedOffroad: '50-60',
    supportDuration: 40,
    next: ['btr90'],
    researchCost: { ammoCal: '7.62', ammoCount: 2500, liquor: 800, exp: 5000 }
  },
  btr90: {
    id: 'btr90', name: 'BTR-90', tier: 5, line: 'btr',
    weapon: '30mm 2A42 + 7.62mm PKT + ATGM',
    armor: '加強（可加 ERA）', speedRoad: 100, speedOffroad: '50-60',
    supportDuration: 45,
    next: [],
    researchCost: { ammoCal: '12.7', ammoCount: 1500, liquor: 1500, exp: 12000 }
  },
  /* ---------- T-80 線 ---------- */
  t80: {
    id: 't80', name: 'T-80', tier: 2, line: 't80',
    weapon: '125mm 2A46 + 7.62mm PKT + 12.7mm NSVT',
    armor: '複合', speedRoad: 70, speedOffroad: 48,
    supportDuration: 40,
    next: ['t80b'],
    researchCost: { ammoCal: '9x39', ammoCount: 3000, liquor: 1000, exp: 5000 }
  },
  t80b: {
    id: 't80b', name: 'T-80B', tier: 3, line: 't80',
    weapon: '125mm 2A46 + 7.62mm PKT + 12.7mm NSVT',
    armor: '複合 + 30mm 首上', speedRoad: 78, speedOffroad: 48,
    supportDuration: 42,
    next: ['t80bv'],
    researchCost: { ammoCal: '7.62', ammoCount: 3000, liquor: 1200, exp: 7000 }
  },
  t80bv: {
    id: 't80bv', name: 'T-80BV', tier: 4, line: 't80',
    weapon: '125mm 2A46 + 7.62mm PKT + 12.7mm NSVT',
    armor: '複合 + Kontakt-1 ERA', speedRoad: 70, speedOffroad: 48,
    supportDuration: 45,
    next: ['t80u'],
    researchCost: { ammoCal: '7.62x54', ammoCount: 2500, liquor: 1800, exp: 9000 },
    camo: {
      locked: ['t80bvd', 't80bu'],
      variants: {
        t80bvd: { name: 'T-80BVD', desc: '柴油機版本（塗裝）', armor: '複合 + ERA', speedRoad: 60, speedOffroad: 45 },
        t80bu:  { name: 'T-80BU',  desc: '指揮型（塗裝）',   armor: '複合 + 30mm', speedRoad: 70, speedOffroad: 48 }
      }
    }
  },
  t80u: {
    id: 't80u', name: 'T-80U', tier: 5, line: 't80',
    weapon: '125mm 2A46M-1 + 7.62mm PKT + 12.7mm NSVT',
    armor: '複合 + Kontakt-5 ERA', speedRoad: 70, speedOffroad: 48,
    supportDuration: 48,
    next: ['t80uk', 't80um'],
    researchCost: { ammoCal: '7.62x54', ammoCount: 3000, liquor: 3000, exp: 15000 }
  },
  t80uk: {
    id: 't80uk', name: 'T-80UK', tier: 6, line: 't80',
    weapon: '125mm 2A46M-1 + 7.62mm PKT + 12.7mm NSVT',
    armor: '複合 + Kontakt-5', speedRoad: 70, speedOffroad: 48,
    supportDuration: 50,
    next: [],
    researchCost: { ammoCal: '12.7', ammoCount: 2000, liquor: 4000, exp: 20000 }
  },
  t80um: {
    id: 't80um', name: 'T-80UM', tier: 6, line: 't80',
    weapon: '125mm 2A46M-1 + 7.62mm PKT + 12.7mm NSVT',
    armor: '複合 + Kontakt-5 ERA', speedRoad: 70, speedOffroad: 48,
    supportDuration: 52,
    next: [],
    researchCost: { ammoCal: '12.7', ammoCount: 2500, liquor: 5000, exp: 22000 }
  }
};;

function _garageInitState(){
  if(!state.garage || typeof state.garage !== 'object'){
    state.garage = { currentVehicle: 'btr80', ownedVehicles: ['btr80'], vehicleExp: { btr80: 0 }, researchTarget: null, camo: {}, extraExp: {} };
  }
  const g = state.garage;
  if(!Array.isArray(g.ownedVehicles)) g.ownedVehicles = ['btr80'];
  if(!g.vehicleExp || typeof g.vehicleExp !== 'object') g.vehicleExp = { btr80: 0 };
  if(!('currentVehicle' in g) || !VEHICLES[g.currentVehicle]) g.currentVehicle = 'btr80';
  /* rev640: researchTarget 已廢棄，研發改為消耗前置車經驗 */
  if(!g.camo || typeof g.camo !== 'object') g.camo = {};
    /* rev642: 每車研發進度 */
  if(!g.researchProgress || typeof g.researchProgress !== 'object') g.researchProgress = {};
  
    /* rev635: 全局經驗池 —— 已完結載具的 5% 經驗自動進入，可分配到任意載具 */
  if(typeof g.globalExp !== 'number' || !isFinite(g.globalExp) || g.globalExp < 0) g.globalExp = 0;
  return g;
}

/* 按等價值消耗私酒（後院 storage） */
function _consumeLiquorByValue(targetValue){
  const s = _gardenStorageInit();
  let remaining = targetValue;
  const order = ['破舊','一般','庫存','精品','傳奇'];
  for(const rar of order){
    if(remaining <= 0.01) break;
    const k = 'liquor@' + rar;
    const cnt = s[k] || 0;
    if(cnt <= 0) continue;
    const mult = RARITY_MULT[rar] || 1;
    const maxUse = Math.min(cnt, Math.ceil(remaining / mult));
    s[k] -= maxUse;
    if(s[k] <= 0) delete s[k];
    remaining -= maxUse * mult;
  }
  return remaining <= 0.01;
}

/* 按等價值消耗彈藥（背包） */
function _consumeAmmoByValue(targetValue){
  let remaining = targetValue;
  const order = ['破舊','一般','庫存','精品','傳奇'];
  for(const rar of order){
    if(remaining <= 0.01) break;
    const keys = [];
    for(const k in state.inventory){
      const p = k.split('@');
      if(p[1] !== rar) continue;
      if(!AMMO[p[0]]) continue;
      keys.push(k);
    }
    keys.sort();
    for(const k of keys){
      if(remaining <= 0.01) break;
      const cnt = state.inventory[k] || 0;
      if(cnt <= 0) continue;
      const mult = RARITY_MULT[rar] || 1;
      const maxUse = Math.min(cnt, Math.ceil(remaining / mult));
      state.inventory[k] -= maxUse;
      if(state.inventory[k] <= 0) delete state.inventory[k];
      remaining -= maxUse * mult;
    }
  }
  return remaining <= 0.01;
}

/* rev635: 判斷載具是否已完結（next 全部擁有或 next 為空） */
function _isVehicleFinished(vid){
  const v = VEHICLES[vid];
  if(!v) return false;
  if(!v.next || !v.next.length) return true;
  const g = _garageInitState();
  return v.next.every(function(n){ return g.ownedVehicles.indexOf(n) >= 0; });
}

/* rev635: 加載具經驗 —— 若已完結，5% 自動分流到全局經驗池 */
function _garageAddVehicleExp(vid, exp){
  /* rev643: 前置車經驗即時流入當前研發目標的進度條（不經過 vehicleExp）；
     非前置車或無目標或進度已滿 → 進 vehicleExp；額外 5%/10% 進全局池 */
  if(!exp || exp <= 0) return;
  const g = _garageInitState();
  const rate = _isVehicleFinished(vid) ? 0.10 : 0.05;
  const bonus = Math.floor(exp * rate);
  if(bonus > 0) g.globalExp = (g.globalExp || 0) + bonus;
  const target = g.researchTarget;
  if(target && VEHICLES[target] && VEHICLES[target].researchCost && g.ownedVehicles.indexOf(target) < 0){
    const prereqs = Object.keys(VEHICLES).filter(function(pvid){
      return (VEHICLES[pvid].next || []).indexOf(target) >= 0;
    });
    if(prereqs.indexOf(vid) >= 0){
      const need = VEHICLES[target].researchCost.exp;
      if(!g.researchProgress) g.researchProgress = {};
      const prog = g.researchProgress[target] || 0;
      const remain = Math.max(0, need - prog);
      if(remain > 0){
        const toProgress = Math.min(exp, remain);
        g.researchProgress[target] = prog + toProgress;
        const leftover = exp - toProgress;
        if(leftover > 0) g.vehicleExp[vid] = (g.vehicleExp[vid] || 0) + leftover;
        return;
      }
    }
  }
  g.vehicleExp[vid] = (g.vehicleExp[vid] || 0) + exp;
}

/* rev635: 從全局經驗池分配 X 到目標載具的 extraExp */


/* rev635: 全局經驗分配面板 —— 內聯展開滑塊，實時預覽 */


function _garageGetUpgradeCost(lv){
  return {
    metal: 50 * lv,
    gears: 20 * lv,
    screws: 20 * lv,
    liquorValue: 5 * lv,
    ammoValue: 100 * lv
  };
}

function _garageCanUpgrade(lv){
  const cost = _garageGetUpgradeCost(lv);
  if(materialEquivalent('metal') < cost.metal) return false;
  if(materialEquivalent('gears') < cost.gears) return false;
  if(materialEquivalent('screws') < cost.screws) return false;
  if((typeof _gardenLiquorValue === 'function') && _gardenLiquorValue() + 0.01 < cost.liquorValue) return false;
  /* 彈藥等價 */
  let ammoEq = 0;
  for(const k in state.inventory){
    const p = k.split('@');
    if(!AMMO[p[0]]) continue;
    ammoEq += (state.inventory[k] || 0) * (RARITY_MULT[p[1]] || 1);
  }
  if(ammoEq + 0.01 < cost.ammoValue) return false;
  return true;
}

function _garageTryUpgrade(){
  const lv = getBuildingLv('garage');
  if(lv <= 0 || lv >= 50) return false;
  if(!_garageCanUpgrade(lv)) return false;
  const cost = _garageGetUpgradeCost(lv);
  consumeMaterial('metal', cost.metal);
  consumeMaterial('gears', cost.gears);
  consumeMaterial('screws', cost.screws);
  _consumeLiquorByValue(cost.liquorValue);
  _consumeAmmoByValue(cost.ammoValue);
  /* 找到該建築並升級 */
  for(const s of state.base.slots){
    if(s && s.id === 'garage'){ s.lv = Math.min(50, (s.lv || 1) + 1); break; }
  }
  /* 電台次數上限 +1：由 _radioEnsureInit 自動檢測 */
  if(typeof _radioEnsureInit === 'function'){
    const max = getBuildingLv('garage');
    if(state.radioUses < max) state.radioUses = max;
  }
  refreshPlayerStats();
  save();
  return true;
}

/* ---------- 車場頁面 ---------- */
function _openGarageInfoModal(idx, opts){
  opts = opts || {};
  const fromGarage = !!opts.fromGarage;
  const lv = getBuildingLv('garage');
  const b = BUILDINGS.garage;
  const isMax = lv >= 50;
  const cost = _garageGetUpgradeCost(lv);
  const canUp = _garageCanUpgrade(lv);
  const metal = materialEquivalent('metal');
  const gears = materialEquivalent('gears');
  const screws = materialEquivalent('screws');
  const liq = (typeof _gardenLiquorValue === 'function') ? _gardenLiquorValue() : 0;
  const ammo = _garageAmmoEquiv();

  /* rev596: 標題行左右對齊；「進入」按鈕靠右，與其他建築標題一致 */
  let body = '<div class="detail-title" style="display:flex;justify-content:space-between;align-items:center;gap:6px">'
    + '<span style="display:inline-flex;align-items:center;gap:4px">' + buildingIcon('garage') + '<span>' + b.name + ' Lv.' + lv + (isMax ? ' (MAX)' : '') + '</span></span>'
    + (fromGarage ? '' : '<button class="btn primary" id="m-enter" style="flex:0 0 auto;width:auto;background:#2e7d32;padding:10px 24px;min-width:88px">進入</button>')
    + '</div>'
    + '<div class="detail-sub">' + b.desc + '</div>'
    + '<div class="stat-line"><span class="k">當前效果</span><span class="v">電台次數上限 ' + lv + '</span></div>';
  if(!isMax){
    body += '<div class="stat-line"><span class="k">升級後</span><span class="v">電台次數上限 ' + (lv + 1) + '</span></div>'
      + '<div class="divider"></div>'
      + '<div style="font-size:11px;color:#e8a33d;margin-bottom:4px">升級需求（等值一般）</div>'
      + '<div class="stat-line"><span class="k">金屬廢料</span><span class="v" style="color:' + (metal >= cost.metal ? '#4caf50' : '#e05252') + '">' + Math.floor(metal) + '/' + cost.metal + '</span></div>'
      + '<div class="stat-line"><span class="k">齒輪</span><span class="v" style="color:' + (gears >= cost.gears ? '#4caf50' : '#e05252') + '">' + Math.floor(gears) + '/' + cost.gears + '</span></div>'
      + '<div class="stat-line"><span class="k">螺絲</span><span class="v" style="color:' + (screws >= cost.screws ? '#4caf50' : '#e05252') + '">' + Math.floor(screws) + '/' + cost.screws + '</span></div>'
      + '<div class="stat-line"><span class="k">私酒</span><span class="v" style="color:' + (liq >= cost.liquorValue ? '#4caf50' : '#e05252') + '">' + Math.round(liq) + '/' + cost.liquorValue + '</span></div>'
      + '<div class="stat-line"><span class="k">彈藥</span><span class="v" style="color:' + (ammo >= cost.ammoValue ? '#4caf50' : '#e05252') + '">' + Math.floor(ammo) + '/' + cost.ammoValue + '</span></div>';
  }
  const ft = el('div', 'modal-ft');
  ft.innerHTML = isMax
    ? '<button class="btn" disabled>已滿級</button>'
    : '<button class="btn primary" id="m-up" ' + (canUp ? '' : 'disabled') + '>升級</button>';
  const bd = openModal({ title: '車場', body: body, footer: ft });
  const enterBtn = bd.querySelector('#m-enter');
  if(enterBtn) enterBtn.onclick = function(){ closeModal(); openGaragePage(); };
  const upBtn = ft.querySelector('#m-up');
  if(upBtn) upBtn.onclick = function(){
    if(_garageTryUpgrade()){
      closeModal();
      _openGarageInfoModal(idx, opts);
      /* rev596: 從車場頁面打開時，升級後刷新車場頁面 */
      if(fromGarage){
        const p = document.getElementById('garage-page');
        if(p){ p.innerHTML = _garageRenderHtml(); if(typeof _garageBind === 'function') _garageBind(); }
      }
    }
  };
}

function openGaragePage(){
  let p = document.getElementById('garage-page');
  if(!p){
    p = document.createElement('div');
    p.id = 'garage-page';
    (document.getElementById('content') || document.body).appendChild(p);
  }
  p.innerHTML = _garageRenderHtml();
  p.classList.add('on');
  requestAnimationFrame(_garageBind);
}

function closeGaragePage(){
  const p = document.getElementById('garage-page');
  if(p) p.classList.remove('on');
  if(typeof renderBase === 'function' && currentTab === 'base'){ renderBase(); }
}

function _garageGetResearchInfo(){
  /* rev642: 返回當前研發目標的進度 */
  const g = _garageInitState();
  const target = g.researchTarget;
  if(!target) return null;
  if(g.ownedVehicles.indexOf(target) >= 0){ g.researchTarget = null; return null; }
  const tgt = VEHICLES[target];
  if(!tgt || !tgt.researchCost) return null;
  const have = (g.researchProgress && g.researchProgress[target]) || 0;
  const need = tgt.researchCost.exp || 0;
  return { targetId: target, target: tgt, have: Math.floor(have), need: need, prereqs: [] };
}

function _garageOpenCamo(){
  const g = _garageInitState();
  const cur = VEHICLES[g.currentVehicle];
  if(!cur) return;
  let body = '<div class="detail-sub">' + cur.name + '</div>';
  if(cur.camo && cur.camo.locked && cur.camo.locked.length){
    body += '<div class="divider"></div>';
    body += '<div style="font-size:11px;color:#e8a33d;font-weight:bold;margin-bottom:4px">🔒 未解鎖塗裝</div>';
    for(const cid of cur.camo.locked){
      const v = cur.camo.variants && cur.camo.variants[cid];
      if(!v) continue;
      body += '<div class="item-row" style="opacity:0.55;cursor:not-allowed">'
        + '<div class="icon">🔒</div>'
        + '<div class="info"><div class="nm" style="color:#7a6f60">' + v.name + '</div>'
        + '<div class="sub">' + v.desc + ' · 甲 ' + v.armor + ' · ' + v.speedRoad + '/' + v.speedOffroad + ' km/h</div></div>'
        + '</div>';
    }
  }
  body += '<div class="divider"></div>';
  body += '<div class="empty-hint">其他塗裝系統開發中，敬請期待。</div>';
  openModal({ title: '🎨 塗裝 · ' + cur.name, body: body });
}

function _splitVehicleWeapon(v){
  if(!v) return { mainGun:'-', machineGun:'-', special:'-' };
  const parts = (v.weapon || '').split(' + ').map(s => s.trim()).filter(Boolean);
  return {
    mainGun: parts[0] || '-',
    machineGun: parts[1] || '-',
    special: parts[2] || '-'
  };
}

function _garageDetailRow(k, curVal, tgtVal){
  let h = '<div class="garage-stat-row">';
  h += '<span class="k">' + k + '</span>';
  if(tgtVal !== null && tgtVal !== undefined){
    h += '<span class="v-cur">' + curVal + '</span>';
    h += '<span class="v-arrow">→</span>';
    let cls = 'v-new';
    const curNum = parseFloat(curVal);
    const tgtNum = parseFloat(tgtVal);
    if(!isNaN(curNum) && !isNaN(tgtNum)){
      if(tgtNum > curNum) cls += ' up';
      else if(tgtNum < curNum) cls += ' down';
    } else if(String(tgtVal) !== String(curVal)){
      cls += ' diff';
    }
    h += '<span class="' + cls + '">' + tgtVal + '</span>';
  } else {
    h += '<span class="v-cur-only">' + curVal + '</span>';
  }
  h += '</div>';
  return h;
}

function _splitVehicleWeaponList(v){
  if(!v) return { mainGun: [], machineGun: [], special: [] };
  const parts = (v.weapon || '').split(' + ').map(function(s){ return s.trim(); }).filter(Boolean);
  const result = { mainGun: [], machineGun: [], special: [] };
  if(parts[0]) result.mainGun = [parts[0]];
  if(parts[1]) result.machineGun = parts[1].split(/[,，、]/).map(function(s){ return s.trim(); }).filter(Boolean);
  if(parts[2]) result.special = [parts[2]];
  return result;
}

function _garageDetailRowMulti(k, curArr, tgtArr){
  curArr = curArr || [];
  const tgtLen = tgtArr ? tgtArr.length : 0;
  const len = Math.max(curArr.length, tgtLen);
  if(len === 0) return '';
  let h = '';
  for(let i = 0; i < len; i++){
    const cv = curArr[i] || '';
    const tv = tgtArr ? (tgtArr[i] || '') : null;
    if(!cv && (tv === null || !tv)) continue;
    h += '<div class="garage-stat-row">';
    h += '<span class="k">' + (i === 0 ? k : '') + '</span>';
    if(tv !== null){
      h += '<span class="v-cur">' + (cv || '—') + '</span>';
      h += '<span class="v-arrow">→</span>';
      let cls = 'v-new';
      if(tv && !cv) cls += ' up';
      else if(!tv && cv) cls += ' down';
      else if(tv !== cv) cls += ' diff';
      h += '<span class="' + cls + '">' + (tv || '—') + '</span>';
    } else {
      h += '<span class="v-cur-only">' + cv + '</span>';
    }
    h += '</div>';
  }
  return h;
}

function _garageDetailHtml(cur, tgt, curUses, maxUses){
  const curW = _splitVehicleWeaponList(cur);
  const tgtW = tgt ? _splitVehicleWeaponList(tgt) : null;
  let h = '';
  h += _garageDetailRowMulti('主炮', curW.mainGun, tgtW ? tgtW.mainGun : null);
  h += _garageDetailRowMulti('機槍', curW.machineGun, tgtW ? tgtW.machineGun : null);
  h += _garageDetailRowMulti('特殊', curW.special, tgtW ? tgtW.special : null);
  h += _garageDetailRow('裝甲', cur.armor, tgt ? tgt.armor : null);
  h += _garageDetailRow('公路', cur.speedRoad + ' km/h', tgt ? tgt.speedRoad + ' km/h' : null);
  h += _garageDetailRow('越野', cur.speedOffroad + ' km/h', tgt ? tgt.speedOffroad + ' km/h' : null);
  h += _garageDetailRow('支援', cur.supportDuration + 's', tgt ? tgt.supportDuration + 's' : null);
  if(curUses !== null && curUses !== undefined && maxUses > 0){
    h += '<div class="garage-stat-row"><span class="k">電台</span><span class="v-cur-only">' + curUses + ' / ' + maxUses + '</span></div>';
  }
  return h;
}

/* [rev811] 全新車場佈局 */
/* [rev813] 全新車場佈局修復 */
/* [rev814] 保留原有卡片結構 */
/* [rev815] 保留原卡片結構，修正數字格式 */
/* [rev816] 保留原卡片結構，彈性高度分配 */
/* [rev823] 車場佈局 */
function _garageRenderHtml(){
  const lv = getBuildingLv('garage');
  _garageInitState();
  const g = state.garage;
  const cur = VEHICLES[g.currentVehicle] || VEHICLES.btr80;
  const maxUses = lv;
  const curUses = state.radioUses || 0;
  const research = _garageGetResearchInfo();
  const tgt = research ? research.target : null;
  const _globalExpVal = fmtNum(g.globalExp || 0);

  let h = "";
  h += "<div class='garage-main'>";
  
  // 大圖展示區
  h += "<div class='garage-showcase' id='garage-showcase-img'>";
  h += "<div class='garage-global-exp'>🌐 " + _globalExpVal + "</div>";
  h += "<img src='icons/vehicles/" + cur.id + ".png" + assetSuffix() + "' alt=''>";
  h += "<div class='garage-vehicle-name-bar'>" + cur.name + "</div>";
  h += "</div>";

  // 底部信息區
  h += "<div class='garage-bottom'>";
  
  // 左側屬性面板
  h += "<div class='garage-bottom-left'>";
  h += _garageDetailHtml(cur, null, curUses, maxUses);
  h += "</div>";

  // 右側研發面板
  h += "<div class='garage-bottom-right'>";
  if(research){
    h += "<div class='garage-research-img-wrap' id='garage-research-target' data-vid='" + research.targetId + "' style='cursor:pointer'>";
    h += "<img src='icons/vehicles/" + research.targetId + ".png" + assetSuffix() + "' alt=''>";
    h += "<div class='garage-research-name'>" + tgt.name + "</div>";
    h += "</div>";
    const pct = research.need > 0 ? Math.min(100, Math.round(research.have / research.need * 100)) : 0;
    h += "<div class='garage-research-bar'><div class='fill' style='width:" + pct + "%'></div></div>";
    h += "<div class='garage-research-exp'>" + (fmtNum(research.have)) + " / " + (fmtNum(research.need)) + "</div>";
    if(tgt && tgt.researchCost){
      const ammo = _garageAmmoEquiv();
      const liq = (typeof _gardenLiquorValue === 'function') ? _gardenLiquorValue() : 0;
      const cal = tgt.researchCost.ammoCal;
      const ammoIcon = (typeof AMMO_ICON_BY_CAL !== 'undefined' && AMMO_ICON_BY_CAL[cal]) ? AMMO_ICON_BY_CAL[cal] : '545.png';
      const _fAmmo = fmtNum(ammo);
      const _fAmmoMax = fmtNum(tgt.researchCost.ammoCount);
      const _fLiq = fmtNum(liq);
      const _fLiqMax = fmtNum(tgt.researchCost.liquor);
      h += "<div class='garage-req-row'>";
      h += "<span class='" + (ammo >= tgt.researchCost.ammoCount ? 'ok' : 'bad') + "'><img src='icons/items/" + ammoIcon + assetSuffix() + "' class='req-icon' alt=''> " + _fAmmo + "/" + _fAmmoMax + "</span>";
      h += "<span class='" + (liq >= tgt.researchCost.liquor ? 'ok' : 'bad') + "'><img src='icons/garden/liquor.png" + assetSuffix() + "' class='req-icon' alt=''> " + _fLiq + "/" + _fLiqMax + "</span>";
      h += "</div>";
    }
  } else {
    h += "<div class='garage-research-empty' id='garage-research-empty'>未選定研發目標<br><span style='font-size:10px;color:#7a6f60'>點擊打開科技樹</span></div>";
  }
  h += "</div>";
  h += "</div>";
  h += "</div>";

  // 底部選車 Dock
  h += "<div class='garage-dock' id='garage-dock'>";
  h += "<div class='garage-dock-tabs'>";
  const tabs = [{k:'all',n:'全部'},{k:'btr',n:'輪戰'},{k:'t80',n:'坦克'},{k:'bmp',n:'步戰'}];
  const curTab = window._garageFilter || 'all';
  for(const t of tabs){
    h += "<div class='garage-tab " + (curTab === t.k ? "on" : "") + "' data-tab='" + t.k + "'>" + t.n + "</div>";
  }
  h += "</div>";
  h += "<div class='garage-dock-list' id='garage-dock-list'></div>";
  h += "</div>";

  return h;
}function _garageAmmoEquiv(){
  let eq = 0;
  for(const k in state.inventory){
    const p = k.split('@');
    if(!AMMO[p[0]]) continue;
    eq += (state.inventory[k] || 0) * (RARITY_MULT[p[1]] || 1);
  }
  return eq;
}

/* [rev811] 渲染車庫列表 */
/* [rev813] 渲染車庫列表 */
/* [rev814] 渲染車庫列表 */
/* [rev815] 渲染車庫列表 */
/* [rev816] 渲染車庫列表 */
/* [rev823] 渲染車庫列表 */
function _renderGarageDockList(){
  const listEl = document.getElementById("garage-dock-list");
  if(!listEl) return;
  const g = _garageInitState();
  const filter = window._garageFilter || "all";
  const research = _garageGetResearchInfo();
  const rTarget = research ? research.targetId : null;
  
  let ids = g.ownedVehicles.slice(); // 只顯示已研發的載具
  if(filter !== "all"){
    ids = ids.filter(function(id){ return VEHICLES[id].line === filter; });
  }
  
  let h = "";
  for(const vid of ids){
    const v = VEHICLES[vid];
    const owned = g.ownedVehicles.indexOf(vid) >= 0;
    const isCurrent = g.currentVehicle === vid;
    const isResearching = (rTarget === vid);
    
    let cls = "garage-dock-card";
    if(isCurrent) cls += " current";
    else if(owned) cls += " owned";
    else if(isResearching) cls += " researching";
    else cls += " locked";
    
    h += "<div class='" + cls + "' data-vid='" + vid + "'>";
    h += "<div class='gd-img'><img src='icons/vehicles/" + vid + ".png" + assetSuffix() + "' alt=''></div>";
    h += "<div class='gd-name'>" + v.name + "</div>";
    if(isResearching) h += "<div class='gd-mark'>🔬</div>";
    else if(isCurrent) h += "<div class='gd-mark'>✓</div>";
    h += "</div>";
  }
  listEl.innerHTML = h;
  
  if(window._garageScrollLeft !== undefined){
    listEl.scrollLeft = window._garageScrollLeft;
  }
  
  // PC 滚轮支持
  if(!listEl._wheelBound){
    listEl._wheelBound = true;
    listEl.addEventListener("wheel", function(e){
      if(e.deltaY !== 0){
        e.preventDefault();
        listEl.scrollLeft += e.deltaY;
      }
    }, { passive: false });
  }
  
  const cards = listEl.querySelectorAll(".garage-dock-card");
  for(let i=0; i<cards.length; i++){
    (function(card){
      card.onclick = function(){
        const vid = card.dataset.vid;
        const owned = g.ownedVehicles.indexOf(vid) >= 0;
        
        if(owned){
          if(g.currentVehicle !== vid){
            g.currentVehicle = vid; 
            save();
            const p = document.getElementById("garage-page");
            if(p){
              p.innerHTML = _garageRenderHtml();
              _garageBind();
            }
          }
        } else {
          _garageShowTechDetail(vid);
        }
      };
    })(cards[i]);
  }
  listEl.onscroll = function(){ window._garageScrollLeft = listEl.scrollLeft; };
}function _garageBind(){
  const p = document.getElementById('garage-page');
  if(!p) return;
  
  const showcase = p.querySelector('#garage-showcase-img');
  if(showcase) showcase.onclick = function(){ _garageOpenCamo(); };
  
  const _rt = p.querySelector('#garage-research-target');
  if(_rt) _rt.onclick = function(){ _garageShowTechDetail(_rt.dataset.vid); };
  
  const _re = p.querySelector('#garage-research-empty');
  if(_re) _re.onclick = function(){ _garageOpenTechTree(); };
  
  const tabs = p.querySelectorAll('.garage-tab');
  for(let i=0; i<tabs.length; i++){
    (function(t){
      t.onclick = function(){
        window._garageFilter = t.dataset.tab;
        const allTabs = p.querySelectorAll('.garage-tab');
        for(let j=0; j<allTabs.length; j++) allTabs[j].classList.remove("on");
        t.classList.add("on");
        window._garageScrollLeft = 0;
        _renderGarageDockList();
      };
    })(tabs[i]);
  }
  
  _renderGarageDockList();
}function _garageAvailableExpFor(vid){
  /* rev643: 返回該車已投入的研發進度（= researchProgress） */
  const g = _garageInitState();
  if(!g.researchProgress) g.researchProgress = {};
  return Math.floor(g.researchProgress[vid] || 0);
}



/* rev643: 點「研發」→ 設目標 + 前置車已有 vehicleExp 一次性流入進度 */
function _garageStartResearch(vid){
  const g = _garageInitState();
  const v = VEHICLES[vid];
  if(!v || !v.researchCost) return { err: "no_cost" };
  if(g.ownedVehicles.indexOf(vid) >= 0) return { err: "owned" };
  const prereqs = Object.keys(VEHICLES).filter(function(pvid){
    return (VEHICLES[pvid].next || []).indexOf(vid) >= 0;
  });
  for(const pid of prereqs){
    if(g.ownedVehicles.indexOf(pid) < 0) return { err: "need_prereq", prereq: VEHICLES[pid].name };
  }
  g.researchTarget = vid;
  const need = v.researchCost.exp;
  if(!g.researchProgress) g.researchProgress = {};
  let prog = g.researchProgress[vid] || 0;
  /* 前置車已積累的 vehicleExp 一次性流入 */
  for(const pid of prereqs){
    if(prog >= need) break;
    const have = g.vehicleExp[pid] || 0;
    if(have <= 0) continue;
    const remain = need - prog;
    const transfer = Math.min(have, remain);
    g.vehicleExp[pid] = have - transfer;
    prog += transfer;
  }
  g.researchProgress[vid] = prog;
  if(typeof save === "function") save();
  return { ok: true, progress: prog, need: need };
}

function _garageResearch(vid){
  /* rev643: 購買 —— 進度已滿 + 彈藥/私酒足 → 擁有；不扣經驗（已流入進度） */
  const g = _garageInitState();
  const v = VEHICLES[vid];
  if(!v || !v.researchCost) return { err: 'no_cost' };
  if(g.ownedVehicles.indexOf(vid) >= 0) return { err: 'owned' };
  const prereqs = Object.keys(VEHICLES).filter(function(pvid){
    return (VEHICLES[pvid].next || []).indexOf(vid) >= 0;
  });
  for(const pid of prereqs){
    if(g.ownedVehicles.indexOf(pid) < 0) return { err: 'need_prereq', prereq: VEHICLES[pid].name };
  }
  const prog = (g.researchProgress && g.researchProgress[vid]) || 0;
  if(prog < v.researchCost.exp) return { err: 'no_exp', need: v.researchCost.exp, have: Math.floor(prog) };
  const ammo = _garageAmmoEquiv();
  if(ammo < v.researchCost.ammoCount) return { err: 'no_ammo', need: v.researchCost.ammoCount, have: Math.floor(ammo) };
  const liq = (typeof _gardenLiquorValue === 'function') ? _gardenLiquorValue() : 0;
  if(liq < v.researchCost.liquor) return { err: 'no_liquor', need: v.researchCost.liquor, have: Math.floor(liq) };
  if(typeof _consumeAmmoByValue === 'function') _consumeAmmoByValue(v.researchCost.ammoCount);
  if(typeof _consumeLiquorByValue === 'function') _consumeLiquorByValue(v.researchCost.liquor);
  g.ownedVehicles.push(vid);
  if(g.researchTarget === vid) g.researchTarget = null;
  if(g.researchProgress) delete g.researchProgress[vid];
  if(typeof save === 'function') save();
  console.info('[garage] 購買完成:', vid);
  return { ok: true };
}


function _garageResearchErrMsg(r){
  if(!r) return '研發失敗';
  if(r.err === 'no_ammo') return '彈藥不足（需 ' + r.need + '，現有 ' + r.have + '）';
  if(r.err === 'no_liquor') return '私酒不足（需 ' + r.need + '，現有 ' + r.have + '）';
  if(r.err === 'no_exp') return '經驗不足（需 ' + r.need + '，現有 ' + r.have + '）';
  if(r.err === 'need_prereq') return '需先研發 ' + r.prereq;
  if(r.err === 'owned') return '已擁有';
  return '研發失敗';
}

function _techArrow(){
  return "<div class='garage-tech-arrow'>▼</div>";
}

function _techNodeHtml(vid){
  const g = _garageInitState();
  const v = VEHICLES[vid];
  const owned = g.ownedVehicles.indexOf(vid) >= 0;
  const isCurrent = g.currentVehicle === vid;
  const prereqs = Object.keys(VEHICLES).filter(function(pvid){
    return (VEHICLES[pvid].next || []).indexOf(vid) >= 0;
  });
  const hasAllPrereq = (prereqs.length === 0) || prereqs.every(function(pid){ return g.ownedVehicles.indexOf(pid) >= 0; });
  let cls = 'garage-tech-node';
  let statusText = '';
  let statusCls = '';
  let btnHtml = '';
  if(owned && isCurrent){
    cls += ' owned current';
    statusText = '✓ 使用中';
    statusCls = 'ok';
  } else if(owned){
    cls += ' owned';
    statusText = '✓ 已擁有';
    statusCls = 'ok';
    btnHtml = "<button class='garage-tech-node-btn' data-tech-node='" + vid + "' data-action='switch'>切換</button>";
  } else if(!hasAllPrereq){
    cls += ' locked';
    statusText = '🔒 需 ' + prereqs.map(function(p){ return VEHICLES[p].name; }).join(' / ');
    statusCls = 'bad';
  } else if(v.researchCost){
    cls += ' researchable';
    const ammo = _garageAmmoEquiv();
    const liq = (typeof _gardenLiquorValue === 'function') ? _gardenLiquorValue() : 0;
    const exp = _garageAvailableExpFor(vid);
    const needAmmo = v.researchCost.ammoCount;
    const needLiq = v.researchCost.liquor;
    const needExp = v.researchCost.exp;
    const ammoOk = ammo >= needAmmo;
    const liqOk = liq >= needLiq;
    const expOk = exp >= needExp;
    statusText = '🔬 ' + v.researchCost.ammoCal + '×' + needAmmo + ' · 🍶' + needLiq + ' · 📊' + Math.floor(exp) + '/' + needExp;
    statusCls = (ammoOk && liqOk && expOk) ? 'ok' : 'bad';
    btnHtml = "<button class='garage-tech-node-btn' data-tech-node='" + vid + "' data-action='research'" + ((ammoOk && liqOk && expOk) ? '' : ' disabled') + ">研發</button>";
  }
  let h = "<div class='" + cls + "'>";
  h += "<div class='garage-tech-node-img'><img src='icons/vehicles/" + vid + ".png" + assetSuffix() + "' data-fallback='1' alt=''></div>";
  h += "<div class='garage-tech-node-info'>";
  h += "<div class='garage-tech-node-name'>" + v.name + "</div>";
  h += "<div class='garage-tech-node-status " + statusCls + "'>" + statusText + "</div>";
  h += "</div>";
  h += btnHtml;
  h += "</div>";
  return h;
}

function _garageBindTechImgs(container){
  // 保留 img 原生破圖行為，不做替換
}

function _garageOpenTechTree(){
  /* rev595: 11 節點佈局（BTR 左列 5，T-80 右列 6，t80uk 下方分叉） */
  const NW = 100, NH = 64;
  const nodes = [
    { vid:'btr80',  x:10,  y:4   },
    { vid:'btr80a', x:10,  y:76  },
    { vid:'btr82',  x:10,  y:148 },
    { vid:'btr82a', x:10,  y:220 },
    { vid:'btr90',  x:10,  y:292 },
    { vid:'t80',    x:230, y:76  },
    { vid:'t80b',   x:230, y:148 },
    { vid:'t80bv',  x:230, y:220 },
    { vid:'t80u',   x:230, y:292 },
    { vid:'t80uk',  x:120, y:364 },
    { vid:'t80um',  x:230, y:364 }
  ];
  let svg = '<svg width="340" height="438" style="position:absolute;left:0;top:0;pointer-events:none" xmlns="http://www.w3.org/2000/svg">';
  /* BTR 線 */
  svg += '<line x1="60" y1="68" x2="60" y2="76" stroke="#8a5f18" stroke-width="2" stroke-linecap="round"/>';
  svg += '<line x1="60" y1="140" x2="60" y2="148" stroke="#8a5f18" stroke-width="2" stroke-linecap="round"/>';
  svg += '<line x1="60" y1="212" x2="60" y2="220" stroke="#8a5f18" stroke-width="2" stroke-linecap="round"/>';
  svg += '<line x1="60" y1="284" x2="60" y2="292" stroke="#8a5f18" stroke-width="2" stroke-linecap="round"/>';
  /* btr80 → t80 分叉 */
  svg += '<path d="M 60 68 L 60 72 L 280 72 L 280 76" stroke="#8a5f18" stroke-width="2" fill="none" stroke-linejoin="round"/>';
  /* T-80 線 */
  svg += '<line x1="280" y1="140" x2="280" y2="148" stroke="#8a5f18" stroke-width="2" stroke-linecap="round"/>';
  svg += '<line x1="280" y1="212" x2="280" y2="220" stroke="#8a5f18" stroke-width="2" stroke-linecap="round"/>';
  svg += '<line x1="280" y1="284" x2="280" y2="292" stroke="#8a5f18" stroke-width="2" stroke-linecap="round"/>';
  /* t80u → t80um（直線）與 t80u → t80uk（分叉） */
  svg += '<line x1="280" y1="356" x2="280" y2="364" stroke="#8a5f18" stroke-width="2" stroke-linecap="round"/>';
  svg += '<path d="M 280 356 L 280 360 L 170 360 L 170 364" stroke="#8a5f18" stroke-width="2" fill="none" stroke-linejoin="round"/>';
  svg += '</svg>';

  const g = _garageInitState();
  const research = _garageGetResearchInfo();
  const researchId = research ? research.targetId : null;
  let nodesHtml = '';
  for(const n of nodes){
    const v = VEHICLES[n.vid];
    if(!v) continue;
    const owned = g.ownedVehicles.indexOf(n.vid) >= 0;
    const isCurrent = g.currentVehicle === n.vid;
    const isResearch = (researchId === n.vid);
    const prereqs = Object.keys(VEHICLES).filter(function(pvid){
      return (VEHICLES[pvid].next || []).indexOf(n.vid) >= 0;
    });
    const hasAllPrereq = (prereqs.length === 0) || prereqs.every(function(pid){ return g.ownedVehicles.indexOf(pid) >= 0; });
    let cls = 'wt-node';
    let mark = '';
    if(owned && isCurrent){ cls += ' current'; mark = '✓'; }
    else if(owned){ cls += ' owned'; mark = '✓'; }
    else if(!hasAllPrereq){ cls += ' locked'; mark = '🔒'; }
    else if(isResearch){ cls += ' researching'; mark = '🔬'; }
    else if(v.researchCost){ cls += ' researchable'; mark = '🔬'; }
    else { cls += ' locked'; mark = '?'; }
    nodesHtml += '<div class="' + cls + '" data-tech-node="' + n.vid + '" style="left:' + n.x + 'px;top:' + n.y + 'px;width:' + NW + 'px;height:' + NH + 'px">'
      + '<div class="wt-node-img"><img src="icons/vehicles/' + n.vid + '.png' + assetSuffix() + '" data-fallback="1" alt=""></div>'
      + '<div class="wt-node-name">' + v.name + '</div>'
      + '<div class="wt-node-mark">' + mark + '</div>'
      + '</div>';
  }

  const body = '<div class="wt-tech-wrap"><div class="wt-tech-canvas">' + svg + nodesHtml + '</div></div>';
  const bd = openModal({ title: '🌳 科技樹', body: body });
  if(typeof _garageBindTechImgs === 'function') _garageBindTechImgs(bd);
  const btns = bd.querySelectorAll('[data-tech-node]');
  for(let i = 0; i < btns.length; i++){
    (function(btn){
      btn.onclick = function(){
        const vid = btn.getAttribute('data-tech-node');
        _garageShowTechDetail(vid);
      };
    })(btns[i]);
  }
}

function _garageShowTechDetail(vid){
  const v = VEHICLES[vid];
  if(!v) return;
  const g = _garageInitState();
  const cur = VEHICLES[g.currentVehicle] || VEHICLES.btr80;
  const owned = g.ownedVehicles.indexOf(vid) >= 0;
  const isCurrent = g.currentVehicle === vid;
  const prereqs = Object.keys(VEHICLES).filter(function(pvid){
    return (VEHICLES[pvid].next || []).indexOf(vid) >= 0;
  });
  const hasAllPrereq = (prereqs.length === 0) || prereqs.every(function(pid){ return g.ownedVehicles.indexOf(pid) >= 0; });

  let body = "";
  body += "<div class='garage-tech-detail-img-wrap'>";
  body += "<img src='icons/vehicles/" + vid + ".png" + assetSuffix() + "' alt=''>";
  body += "<div class='garage-tech-detail-name'>" + v.name + " <span style='color:#7a6f60;font-weight:normal'>Tier " + v.tier + "</span></div>";
  body += "</div>";

  body += "<div class='garage-tech-detail-cols'>";
  body += "<div class='garage-tech-detail-left'>";
  body += "<div class='garage-tech-detail-col-title'>詳情" + (isCurrent ? "" : "（當前 → 目標）") + "</div>";
  body += _garageDetailHtml(cur, isCurrent ? null : v, null, null);
  body += "</div>";

  body += "<div class='garage-tech-detail-right'>";
  if(owned && isCurrent){
    body += "<div class='garage-tech-detail-col-title'>狀態</div>";
    body += "<div class='tech-detail-status' style='color:#7ee07e'>使用中</div>";
  } else if(owned){
    body += "<div class='garage-tech-detail-col-title'>狀態</div>";
    body += "<div class='tech-detail-status' style='color:#7ee07e'>已研發</div>";
    body += "<button class='btn primary tech-detail-action' id='m-switch'>切換</button>";
  } else if(!hasAllPrereq){
    const reqNames = prereqs.map(function(p){ return VEHICLES[p].name; }).join(" / ");
    body += "<div class='garage-tech-detail-col-title'>研發需求</div>";
    body += "<div class='tech-detail-status' style='color:#e05252'>需先研發<br>" + reqNames + "</div>";
  } else if(v.researchCost){
    const ammo = _garageAmmoEquiv();
    const liq = (typeof _gardenLiquorValue === "function") ? _gardenLiquorValue() : 0;
    const prog = _garageAvailableExpFor(vid);
    const need = v.researchCost.exp;
    const expDone = prog >= need;
    const canBuy = expDone && ammo >= v.researchCost.ammoCount && liq >= v.researchCost.liquor;
    const cal = v.researchCost.ammoCal;
    const ammoIcon = (typeof AMMO_ICON_BY_CAL !== "undefined" && AMMO_ICON_BY_CAL[cal]) ? AMMO_ICON_BY_CAL[cal] : "545.png";
    const isTarget = (g.researchTarget === vid);
    body += "<div class='garage-tech-detail-col-title'>研發需求</div>";
    body += "<div class='tech-detail-row'><span class='k'><img src='icons/items/" + ammoIcon + assetSuffix() + "' class='req-icon' alt=''> 彈藥</span><span class='v " + (ammo >= v.researchCost.ammoCount ? 'ok' : 'bad') + "'>" + Math.floor(ammo) + "/" + v.researchCost.ammoCount + "</span></div>";
    body += "<div class='tech-detail-row'><span class='k'><img src='icons/garden/liquor.png" + assetSuffix() + "' class='req-icon' alt=''> 私酒</span><span class='v " + (liq >= v.researchCost.liquor ? 'ok' : 'bad') + "'>" + Math.floor(liq) + "/" + v.researchCost.liquor + "</span></div>";
    body += "<div class='tech-detail-row'><span class='k'>經驗</span><span class='v " + (expDone ? 'ok' : 'bad') + "'>" + prog + "/" + need + "</span></div>";
    body += "<div class='tech-detail-btn-col'>";
    if(expDone){
      body += "<button class='btn primary tech-detail-action' id='m-buy'" + (canBuy ? '' : ' disabled') + ">購買</button>";
    } else if(isTarget){
      body += "<button class='btn tech-detail-action' disabled>研發中</button>";
    } else {
      body += "<button class='btn primary tech-detail-action' id='m-research' data-mode='start'>研發</button>";
    }
    body += "</div>";
  } else {
    body += "<div class='garage-tech-detail-col-title'>狀態</div>";
    body += "<div class='tech-detail-status' style='color:#7a6f60'>—</div>";
  }
  body += "</div>";
  body += "</div>";

  const _ge = Math.floor(g.globalExp || 0);
  const _prog = _garageAvailableExpFor(vid);
  const _need = (v.researchCost && v.researchCost.exp) || 0;
  const _remain = Math.max(0, _need - _prog);
  const _maxT = Math.min(_remain, _ge);
  const _showTransfer = !owned && hasAllPrereq && !!v.researchCost && _ge > 0 && _prog < _need && _maxT > 0;
  if(_showTransfer){
    body += "<div class='garage-transfer-row' id='garage-transfer-row' style='margin-top:10px;flex-direction:column;align-items:stretch;gap:6px'>";
    body += "<div style='display:flex;justify-content:space-between;align-items:baseline'><span style='color:#7a6f60;font-size:11px'>🌐 全局經驗</span><span style='color:#a45ede;font-weight:bold;font-family:Menlo,Consolas,monospace;font-size:14px'>" + _ge + "</span></div>";
    body += "<div class='garage-transfer-slider-wrap'>";
    body += "<div class='garage-transfer-slider-info'><span>轉入數量</span><span><b id='gt-x'>0</b> / " + _maxT + "</span></div>";
    body += "<input type='range' id='gt-slider' min='0' max='" + _maxT + "' value='0'>";
    body += "<div class='garage-transfer-slider-info'><span>轉入後全局經驗</span><b id='gt-after-ge'>" + _ge + "</b></div>";
    body += "<div class='garage-transfer-slider-info'><span>轉入後研發進度</span><b id='gt-after-prog'>" + Math.floor(_prog) + " / " + _need + "</b></div>";
    body += "<div class='garage-transfer-slider-actions'><button class='btn primary' id='gt-confirm' disabled>確認轉入</button></div>";
    body += "</div></div>";
  }

  const bd = openModal({ title: "載具詳情", body: body, onClose: function(){
    
    closeModal();
    _garageOpenTechTree();
  }});
  
  const closeX = bd.parentNode.querySelector(".modal-hd .x");
  if(closeX){
    closeX.textContent = "科技樹";
    closeX.className = "btn btn-primary";
    closeX.style.cssText = "background:#8a5f18;color:#fff;border-radius:4px;padding:4px 12px;font-size:11px;font-weight:bold;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;margin-left:8px;border:1px solid #e8a33d;";
  }

  function _refreshGaragePage(){
    const p = document.getElementById("garage-page");
    if(p){ p.innerHTML = _garageRenderHtml(); _garageBind(); }
  }

  const sw = bd.querySelector("#m-switch");
  if(sw) sw.onclick = function(){ g.currentVehicle = vid; save(); _garageShowTechDetail(vid); _refreshGaragePage(); };

  const rs = bd.querySelector("#m-research");
  if(rs){
    const mode = rs.getAttribute("data-mode");
    if(mode === "start"){
      rs.onclick = function(){
        _garageStartResearch(vid);
        _garageShowTechDetail(vid); _refreshGaragePage();
      };
    } else if(mode === "cancel"){
      rs.onclick = function(){
        g.researchTarget = null;
        if(typeof save === "function") save();
        _garageShowTechDetail(vid); _refreshGaragePage();
      };
    }
  }

  const buy = bd.querySelector("#m-buy");
  if(buy && !buy.disabled) buy.onclick = function(){
    const r = _garageResearch(vid);
    if(r && r.ok){ _garageShowTechDetail(vid); _refreshGaragePage(); }
    else if(typeof notify === "function") notify(_garageResearchErrMsg(r));
  };

  if(_showTransfer){
    const slider = bd.querySelector("#gt-slider");
    const xEl = bd.querySelector("#gt-x");
    const afterGeEl = bd.querySelector("#gt-after-ge");
    const afterProgEl = bd.querySelector("#gt-after-prog");
    const confirmBtn = bd.querySelector("#gt-confirm");
    if(slider && confirmBtn){
      var _upd = function(){
        var x = parseInt(slider.value, 10) || 0;
        xEl.textContent = x;
        afterGeEl.textContent = _ge - x;
        afterProgEl.textContent = Math.floor(_prog + x) + " / " + _need;
        confirmBtn.disabled = (x <= 0);
      };
      slider.oninput = _upd; _upd();
      confirmBtn.onclick = function(){
        var x = parseInt(slider.value, 10) || 0;
        if(x <= 0) return;
        g.globalExp = Math.max(0, (g.globalExp || 0) - x);
        if(!g.researchProgress) g.researchProgress = {};
        g.researchProgress[vid] = (g.researchProgress[vid] || 0) + x;
        if(typeof save === "function") save();
        _garageShowTechDetail(vid); _refreshGaragePage();
      };
    }
  }
}/* ===== end rev565 ===== */

function renderBase(){
  const z1=$('#zone1'),z2=$('#zone2'),z3=$('#zone3');
  let html='<div class="build-grid">';
  for(let i=0;i<12;i++){
    const slot=state.base.slots[i];
    if(i===0)html+=`<div class="cell core" data-i="${i}"><div class="cico">${buildingIcon('control')}</div><div class="cnm">控製中心</div><div class="clv">Lv.1</div></div>`;
    else if(slot){const b=BUILDINGS[slot.id]||{name:'未知'};html+=`<div class="cell built" data-i="${i}"><div class="cico">${buildingIcon(slot.id)}</div><div class="cnm">${b.name}</div><div class="clv">Lv.${slot.lv}</div></div>`;}
    else html+=`<div class="cell" data-i="${i}"><div class="cico">＋</div><div class="cnm">空地</div></div>`;
  }
  html+='</div>';z1.innerHTML=html;
  $$('.cell',z1).forEach(c=>{c.onclick=()=>onBuildCell(parseInt(c.dataset.i));});
  z2.innerHTML=`
    <div class="subnav">
      <div class="subnav-tab on" data-tab="stats">📊 統計</div>
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
      } else if(_tid==='room'){
        
      }
    };
  });

  /* rev555: 左右滑動切換子分頁签 */
  _bindBaseSwipe(z2);

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
    /* rev332: 未解鎖 region 顯示鎖定提示 */
    if(r1.needUnlock && !state.unlockedRegions.includes(baseName)){
      html+=`<div class="reg-item locked" style="opacity:.45;cursor:not-allowed"><div class="ri"><div class="rn">🔒 ${r1.name}</div><div class="rd" style="color:#e05252">${r1.unlockHint||'未解鎖'}</div></div></div>`;
      continue;
    }
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
      if(tier===2&&!state.unlockedRegions.includes(key+'II')){return;}
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
  
}
function onBuildCell(i){
  if(i===0){openControlCenter();return;}
  const slot=state.base.slots[i];
  if(slot){
    if(slot.id==='merchant'){ openMerchant(); return; }
    if(slot.id==='garden'){ openGarden(); return; }
    if(slot.id==='garage'){ _openGarageInfoModal(i); return; }
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
    ft.innerHTML=`<button class="btn primary" id="m-up" ${_isMax ? 'disabled' : ''}>${_isMax ? '已滿級' : '升級'}</button>${isWorkbench?'<button class="btn" id="m-craft">改造</button>':''}`;
    openModal({title:b.name,body,footer:ft});
    ft.querySelector('#m-up').onclick=()=>{
      if(b.maxLv && slot.lv >= b.maxLv){return;}
      for(const [k,v] of Object.entries(upCost))if(materialEquivalent(k)<v){return;}
      for(const [k,v] of Object.entries(upCost))consumeMaterial(k,v);
      slot.lv++;refreshPlayerStats();save();renderBase();
      
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
      for(const [k,v] of Object.entries(b.cost))if(materialEquivalent(k)<v){return;}
      for(const [k,v] of Object.entries(b.cost))consumeMaterial(k,v);
      state.base.slots[i]={id:bid,lv:1};addProf('craft',1);refreshPlayerStats();save();closeModal();renderBase();
      
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
    const ra = sortByRarityDesc(a, b);
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
      if(!isProfMaxed(wdef.type)){return;}
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
  const bd=openModal({title:`改造 ${wdef.name}`,body:result.body,footer:ft,onClose:function(){ closeModal(); if(onCancel) onCancel(); }});
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
    if(!r.ok){return;}
    const maxQueue=workbenchLv||1;
    if(!state.crafting)state.crafting=[];
    if(state.crafting.length>=maxQueue){return;}
    for(const [k,v] of Object.entries(r.totalCost))consumeMaterial(k,v);
    state.crafting.push({type:'mod',modInfo:{baseId,baseRarity,mag:state_mod.mag,scope:state_mod.scope,fromEquippedSlot:equippedSlot,originalId,originalRarity},time:r.totalTime,startTime:Date.now()});
    save();closeModal();
    
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

/* [rev888] runtime */
(function(){
  if(window._rev888RuntimeInstalled) return;
  window._rev888RuntimeInstalled = true;
  function fixRadioBtn(){
    var btns = document.querySelectorAll('.radio-btn');
    var fixed = 0;
    for(var i = 0; i < btns.length; i++){
      var el = btns[i];
      var t = el.textContent || '';
      if(t.indexOf('挑戰') !== -1 || t.indexOf('掃蕩') !== -1){
        el.textContent = t.replace(/挑戰/g, '挑戰').replace(/掃蕩/g, '掃蕩');
        fixed++;
      }
    }
    if(fixed > 0) console.log('[rev888] runtime: fixed ' + fixed + ' radio button(s)');
  }
  setInterval(fixRadioBtn, 200);
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', fixRadioBtn);
  } else {
    fixRadioBtn();
  }
  console.log('[rev888] runtime DOM patcher installed');
})();

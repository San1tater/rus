/* ============================================================
   08-base.js — 基地（控制中心 / 建築 / 區域 / 統計 / 偏好）
   由 06-part.js 拆解而來（rev343）
   ============================================================ */
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
  const bd = openModal({title:'控制中心', body:getControlCenterBody(), footer:ft});
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
  /* rev555: 食物净产 = 产能 - 总消耗（僕人+投掷线+弹药线），统一走 _gardenFoodConsumePerHour */
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

/* rev555: 基地子分页签左右滑动切换（stats ↔ room） */
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
    armor: '10mm', speedRoad: 80, speedOffroad: '40-50',
    supportDuration: 35,
    next: ['btr82a'],
    researchCost: { ammoCal: '5.45', ammoCount: 2000, liquor: 200, exp: 1000 }
  },
  btr82a: {
    id: 'btr82a', name: 'BTR-82A', tier: 3, line: 'btr',
    weapon: '30mm 2A72 + 7.62mm PKT',
    armor: '加強', speedRoad: 100, speedOffroad: '50-60',
    supportDuration: 40,
    next: [],
    researchCost: { ammoCal: '7.62', ammoCount: 2000, liquor: 500, exp: 3000 }
  },
  t80: {
    id: 't80', name: 'T-80', tier: 2, line: 't80',
    weapon: '125mm 2A46 + 7.62mm PKT, 12.7mm NSVT',
    armor: '複合', speedRoad: 70, speedOffroad: 48,
    supportDuration: 40,
    next: ['t80u'],
    researchCost: { ammoCal: '9x39', ammoCount: 3000, liquor: 1000, exp: 5000 }
  },
  t80u: {
    id: 't80u', name: 'T-80U', tier: 3, line: 't80',
    weapon: '125mm 2A46M-1 + 7.62mm PKT, 12.7mm NSVT',
    armor: '複合 + ERA', speedRoad: 70, speedOffroad: 48,
    supportDuration: 45,
    next: ['t80um'],
    researchCost: { ammoCal: '7.62x54', ammoCount: 3000, liquor: 2000, exp: 10000 }
  },
  t80um: {
    id: 't80um', name: 'T-80UM', tier: 4, line: 't80',
    weapon: '125mm 2A46M-1 + 7.62mm PKT, 12.7mm NSVT',
    armor: 'ERA', speedRoad: 70, speedOffroad: 48,
    supportDuration: 50,
    next: [],
    researchCost: { ammoCal: '12.7', ammoCount: 2000, liquor: 4000, exp: 20000 }
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
  if(!('researchTarget' in g)) g.researchTarget = null;
  if(!g.camo || typeof g.camo !== 'object') g.camo = {};
  if(!g.extraExp || typeof g.extraExp !== 'object') g.extraExp = {};
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
function _openGarageInfoModal(idx){
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

  let body = '<div class="detail-title">🏭 ' + b.name + ' Lv.' + lv + (isMax ? ' (MAX)' : '') + '</div>'
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
  ft.innerHTML = '<button class="btn primary" id="m-enter">進入</button>'
    + (isMax ? '' : '<button class="btn" id="m-up" ' + (canUp ? '' : 'disabled') + '>升級</button>');
  openModal({ title: '車場', body: body, footer: ft });
  ft.querySelector('#m-enter').onclick = function(){ closeModal(); openGaragePage(); };
  const upBtn = ft.querySelector('#m-up');
  if(upBtn) upBtn.onclick = function(){
    if(_garageTryUpgrade()){
      closeModal();
      _openGarageInfoModal(idx);
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
  const g = _garageInitState();
  const target = g.researchTarget;
  if(!target) return null;
  if(g.ownedVehicles.indexOf(target) >= 0){ g.researchTarget = null; return null; }
  const tgt = VEHICLES[target];
  if(!tgt){ g.researchTarget = null; return null; }
  const prereqs = Object.keys(VEHICLES).filter(function(vid){
    return (VEHICLES[vid].next || []).indexOf(target) >= 0;
  });
  let have = 0;
  for(const pid of prereqs) have += (g.vehicleExp[pid] || 0);
  if(g.extraExp && g.extraExp[target]) have += g.extraExp[target];
  have = Math.floor(have);
  const need = (tgt.researchCost && tgt.researchCost.exp) || 0;
  return { targetId: target, target: tgt, have: have, need: need, prereqs: prereqs };
}

function _garageOpenCamo(){
  const g = _garageInitState();
  const cur = VEHICLES[g.currentVehicle];
  if(!cur) return;
  const body = '<div class="detail-sub">' + cur.name + '</div>'
    + '<div class="empty-hint">塗裝系統開發中，敬請期待。</div>';
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

function _garageRenderHtml(){
  const lv = getBuildingLv('garage');
  _garageInitState();
  const g = state.garage;
  const cur = VEHICLES[g.currentVehicle] || VEHICLES.btr80;
  const maxUses = lv;
  const curUses = state.radioUses || 0;
  const research = _garageGetResearchInfo();
  const tgt = research ? research.target : null;

  let h = "";
  h += "<div class='garage-header'>";
  h += "<div class='garage-title'><img src='icons/buildings/garage.png" + assetSuffix() + "' class='garage-title-icon' alt=''> 車場 <span class='garage-lv'>Lv." + lv + "</span></div>";
  h += "<div class='garage-x' id='garage-x'>✕</div>";
  h += "</div>";

  h += "<div class='garage-main'>";

  h += "<div class='garage-showcase'>";
  h += "<img id='garage-vehicle-img' src='icons/vehicles/" + cur.id + ".png" + assetSuffix() + "' alt=''>";
  h += "<div class='garage-vehicle-name-bar'>" + cur.name + "</div>";
  h += "</div>";

  h += "<div class='garage-bottom'>";

  h += "<div class='garage-bottom-left'>";
  h += _garageDetailHtml(cur, tgt, curUses, maxUses);
  h += "</div>";

  h += "<div class='garage-bottom-right'>";
  if(research){
    h += "<div class='garage-research-img-wrap'>";
    h += "<img src='icons/vehicles/" + research.targetId + ".png" + assetSuffix() + "' alt=''>";
    h += "<div class='garage-research-name'>" + tgt.name + "</div>";
    h += "</div>";
    const pct = research.need > 0 ? Math.min(100, Math.round(research.have / research.need * 100)) : 0;
    h += "<div class='garage-research-bar'><div class='fill' style='width:" + pct + "%'></div></div>";
    h += "<div class='garage-research-exp'>" + research.have + " / " + research.need + "</div>";
    if(tgt && tgt.researchCost){
      const ammo = _garageAmmoEquiv();
      const liq = (typeof _gardenLiquorValue === 'function') ? _gardenLiquorValue() : 0;
      const cal = tgt.researchCost.ammoCal;
      const ammoIcon = (typeof AMMO_ICON_BY_CAL !== 'undefined' && AMMO_ICON_BY_CAL[cal]) ? AMMO_ICON_BY_CAL[cal] : '545.png';
      h += "<div class='garage-req-row'>";
      h += "<span class='" + (ammo >= tgt.researchCost.ammoCount ? 'ok' : 'bad') + "'><img src='icons/items/" + ammoIcon + assetSuffix() + "' class='req-icon' alt=''> " + Math.floor(ammo) + "/" + tgt.researchCost.ammoCount + "</span>";
      h += "<span class='" + (liq >= tgt.researchCost.liquor ? 'ok' : 'bad') + "'><img src='icons/garden/liquor.png" + assetSuffix() + "' class='req-icon' alt=''> " + Math.floor(liq) + "/" + tgt.researchCost.liquor + "</span>";
      h += "</div>";
    }
  } else {
    h += "<div class='garage-research-empty'>未選定研發目標</div>";
  }
  h += "<div class='garage-actions'>";
  h += "<button class='garage-tech-btn' id='garage-tech'>🌳 科技樹</button>";
  h += "<button class='garage-camo-btn' id='garage-camo'>🎨 塗裝</button>";
  h += "</div>";
  h += "</div>";

  h += "</div>";

  h += "</div>";
  return h;
}

function _garageAmmoEquiv(){
  let eq = 0;
  for(const k in state.inventory){
    const p = k.split('@');
    if(!AMMO[p[0]]) continue;
    eq += (state.inventory[k] || 0) * (RARITY_MULT[p[1]] || 1);
  }
  return eq;
}

function _garageBind(){
  const p = document.getElementById('garage-page');
  if(!p) return;

  const x = p.querySelector('#garage-x');
  if(x) x.onclick = closeGaragePage;

  const tech = p.querySelector('#garage-tech');
  if(tech) tech.onclick = function(){ _garageOpenTechTree(); };

  const camo = p.querySelector('#garage-camo');
  if(camo) camo.onclick = function(){ _garageOpenCamo(); };
}

function _garageAvailableExpFor(targetId){
  const g = _garageInitState();
  const prereqs = Object.keys(VEHICLES).filter(function(vid){
    return (VEHICLES[vid].next || []).indexOf(targetId) >= 0;
  });
  let usable = 0;
  for(const pid of prereqs) usable += (g.vehicleExp[pid] || 0);
  if(g.extraExp && g.extraExp[targetId]) usable += g.extraExp[targetId];
  return Math.floor(usable);
}

function _garageTransferExp5(targetId){
  const g = _garageInitState();
  const tgt = VEHICLES[targetId];
  if(!tgt) return { transferred: 0 };
  const prereqs = Object.keys(VEHICLES).filter(function(vid){
    return (VEHICLES[vid].next || []).indexOf(targetId) >= 0;
  });
  if(!g.extraExp || typeof g.extraExp !== 'object') g.extraExp = {};
  let total = 0;
  for(const vid of g.ownedVehicles){
    if(vid === targetId) continue;
    if(prereqs.indexOf(vid) >= 0) continue;
    const exp = g.vehicleExp[vid] || 0;
    if(exp <= 0) continue;
    const take = Math.floor(exp * 0.05);
    if(take <= 0) continue;
    g.vehicleExp[vid] = exp - take;
    total += take;
  }
  if(total > 0){
    g.extraExp[targetId] = (g.extraExp[targetId] || 0) + total;
    save();
  }
  return { transferred: total };
}

function _garageResearch(vid){
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
  const cost = v.researchCost;
  const ammo = _garageAmmoEquiv();
  if(ammo < cost.ammoCount) return { err: 'no_ammo', need: cost.ammoCount, have: Math.floor(ammo) };
  const liq = (typeof _gardenLiquorValue === 'function') ? _gardenLiquorValue() : 0;
  if(liq < cost.liquor) return { err: 'no_liquor', need: cost.liquor, have: Math.floor(liq) };
  const exp = _garageAvailableExpFor(vid);
  if(exp < cost.exp) return { err: 'no_exp', need: cost.exp, have: exp };

  _consumeAmmoByValue(cost.ammoCount);
  _consumeLiquorByValue(cost.liquor);
  let remain = cost.exp;
  if(g.extraExp && g.extraExp[vid]){
    const use = Math.min(g.extraExp[vid], remain);
    g.extraExp[vid] -= use;
    remain -= use;
    if(g.extraExp[vid] <= 0) delete g.extraExp[vid];
  }
  for(const pid of prereqs){
    if(remain <= 0) break;
    const have = g.vehicleExp[pid] || 0;
    const use = Math.min(have, remain);
    g.vehicleExp[pid] = have - use;
    remain -= use;
  }
  g.ownedVehicles.push(vid);
  if(g.researchTarget === vid) g.researchTarget = null;
  save();
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
  // 保留 img 原生破图行为，不做替换
}

function _garageOpenTechTree(){
  const NW = 100, NH = 84;
  const nodes = [
    { vid:'btr80',  x:20,  y:10  },
    { vid:'btr80a', x:20,  y:118 },
    { vid:'btr82a', x:20,  y:226 },
    { vid:'t80',    x:200, y:118 },
    { vid:'t80u',   x:200, y:226 },
    { vid:'t80um',  x:200, y:334 }
  ];
  let svg = '<svg width="320" height="438" style="position:absolute;left:0;top:0;pointer-events:none" xmlns="http://www.w3.org/2000/svg">';
  svg += '<line x1="70" y1="94" x2="70" y2="118" stroke="#8a5f18" stroke-width="2" stroke-linecap="round"/>';
  svg += '<line x1="70" y1="202" x2="70" y2="226" stroke="#8a5f18" stroke-width="2" stroke-linecap="round"/>';
  svg += '<path d="M 70 94 L 70 106 L 250 106 L 250 118" stroke="#8a5f18" stroke-width="2" fill="none" stroke-linejoin="round"/>';
  svg += '<line x1="250" y1="202" x2="250" y2="226" stroke="#8a5f18" stroke-width="2" stroke-linecap="round"/>';
  svg += '<line x1="250" y1="310" x2="250" y2="334" stroke="#8a5f18" stroke-width="2" stroke-linecap="round"/>';
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
  const isTarget = (g.researchTarget === vid);
  const prereqs = Object.keys(VEHICLES).filter(function(pvid){
    return (VEHICLES[pvid].next || []).indexOf(vid) >= 0;
  });
  const hasAllPrereq = (prereqs.length === 0) || prereqs.every(function(pid){ return g.ownedVehicles.indexOf(pid) >= 0; });

  let body = '';

  body += '<div class="garage-tech-detail-img-wrap">'
    + '<img src="icons/vehicles/' + vid + '.png' + assetSuffix() + '" alt="">'
    + '<div class="garage-tech-detail-name">' + v.name + ' <span style="color:#7a6f60;font-weight:normal">Tier ' + v.tier + '</span></div>'
    + '</div>';

  body += '<div class="garage-tech-detail-cols">';

  body += '<div class="garage-tech-detail-left">';
  body += '<div class="garage-tech-detail-col-title">詳情' + (isCurrent ? '' : '（當前 → 目標）') + '</div>';
  body += _garageDetailHtml(cur, isCurrent ? null : v, null, null);
  body += '</div>';

  body += '<div class="garage-tech-detail-right">';
  if(owned && isCurrent){
    body += '<div class="garage-tech-detail-col-title">狀態</div>';
    body += '<div class="tech-detail-status" style="color:#7ee07e">使用中</div>';
  } else if(owned){
    body += '<div class="garage-tech-detail-col-title">狀態</div>';
    body += '<div class="tech-detail-status" style="color:#7ee07e">已擁有</div>';
    body += '<button class="btn primary tech-detail-action" id="m-switch">切換</button>';
  } else if(!hasAllPrereq){
    const reqNames = prereqs.map(function(p){ return VEHICLES[p].name; }).join(' / ');
    body += '<div class="garage-tech-detail-col-title">研發需求</div>';
    body += '<div class="tech-detail-status" style="color:#e05252">需先研發<br>' + reqNames + '</div>';
  } else if(v.researchCost){
    const ammo = _garageAmmoEquiv();
    const liq = (typeof _gardenLiquorValue === 'function') ? _gardenLiquorValue() : 0;
    const exp = _garageAvailableExpFor(vid);
    const researchDone = exp >= v.researchCost.exp;
    const canBuy = researchDone && ammo >= v.researchCost.ammoCount && liq >= v.researchCost.liquor;
    const cal = v.researchCost.ammoCal;
    const ammoIcon = (typeof AMMO_ICON_BY_CAL !== 'undefined' && AMMO_ICON_BY_CAL[cal]) ? AMMO_ICON_BY_CAL[cal] : '545.png';
    body += '<div class="garage-tech-detail-col-title">研發需求</div>';
    body += '<div class="tech-detail-row"><span class="k"><img src="icons/items/' + ammoIcon + assetSuffix() + '" class="req-icon" alt=""> 彈藥</span><span class="v ' + (ammo >= v.researchCost.ammoCount ? 'ok' : 'bad') + '">' + Math.floor(ammo) + '/' + v.researchCost.ammoCount + '</span></div>';
    body += '<div class="tech-detail-row"><span class="k"><img src="icons/garden/liquor.png' + assetSuffix() + '" class="req-icon" alt=""> 私酒</span><span class="v ' + (liq >= v.researchCost.liquor ? 'ok' : 'bad') + '">' + Math.floor(liq) + '/' + v.researchCost.liquor + '</span></div>';
    body += '<div class="tech-detail-row"><span class="k">經驗</span><span class="v ' + (researchDone ? 'ok' : 'bad') + '">' + exp + '/' + v.researchCost.exp + '</span></div>';
    body += '<div class="tech-detail-btn-col">';
    if(isTarget && researchDone){
      body += '<button class="btn primary tech-detail-action" id="m-buy" ' + (canBuy ? '' : 'disabled') + '>購買</button>';
    } else if(isTarget){
      body += '<button class="btn tech-detail-action" disabled>研發中</button>';
      const hasTransfer = (function(){
        let sum = 0;
        for(const ovid of g.ownedVehicles){
          if(ovid === vid) continue;
          if(prereqs.indexOf(ovid) >= 0) continue;
          sum += Math.floor((g.vehicleExp[ovid] || 0) * 0.05);
        }
        return sum > 0;
      })();
      if(hasTransfer){
        body += '<button class="btn tech-detail-action" id="m-transfer">轉入</button>';
      }
    } else {
      body += '<button class="btn tech-detail-action" id="m-research">研發</button>';
    }
    body += '</div>';
  } else {
    body += '<div class="garage-tech-detail-col-title">狀態</div>';
    body += '<div class="tech-detail-status" style="color:#7a6f60">—</div>';
  }
  body += '</div>';

  body += '</div>';

  const bd = openModal({ title: '科技樹詳情', body: body, onClose: function(){
    if(typeof modalEl !== 'undefined' && modalEl) modalEl.style.maxHeight = '';
    closeModal();
    _garageOpenTechTree();
  }});
  if(typeof modalEl !== 'undefined' && modalEl) modalEl.style.maxHeight = '90vh';

  function _refreshGaragePage(){
    const p = document.getElementById('garage-page');
    if(p){ p.innerHTML = _garageRenderHtml(); _garageBind(); }
  }

  const sw = bd.querySelector('#m-switch');
  if(sw) sw.onclick = function(){
    g.currentVehicle = vid;
    save();
    _garageShowTechDetail(vid);
    _refreshGaragePage();
  };

  const rs = bd.querySelector('#m-research');
  if(rs) rs.onclick = function(){
    g.researchTarget = vid;
    save();
    _garageShowTechDetail(vid);
    _refreshGaragePage();
  };

  const buy = bd.querySelector('#m-buy');
  if(buy) buy.onclick = function(){
    const r = _garageResearch(vid);
    if(r && r.ok){
      _garageShowTechDetail(vid);
      _refreshGaragePage();
    } else {
      notify(_garageResearchErrMsg(r));
    }
  };

  const tr = bd.querySelector('#m-transfer');
  if(tr) tr.onclick = function(){
    const r = _garageTransferExp5(vid);
    if(r.transferred > 0){
      notify('已轉入 ' + r.transferred + ' 經驗');
      _garageShowTechDetail(vid);
      _refreshGaragePage();
    } else {
      notify('無可轉入經驗');
    }
  };
}

/* ===== end rev565 ===== */

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

  /* rev555: 左右滑动切换子分页签 */
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
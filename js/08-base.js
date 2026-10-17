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
    const prod = MERCHANT_FOOD_TABLE[m.foodLv].cropValue * 12;
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

/* ============================================================
   24-base.js — 基地（控制中心 / 建築 / 區域 / 統計 / 偏好 / 軍械庫）
   由舊 09-base.js 重構。車場邏輯（VEHICLES / _garage* / _techNodeHtml 等）已於 19-garage.js。
   _gardenMerchantLineStatus / _openMerchantLineDetail → 22-garden-merchant.js
   _gardenLiquorRatePerHour / _openLiquorDetail → 21-garden.js
   _consumeLiquorByValue / _consumeAmmoByValue → 19-garage.js
   ============================================================ */

/* ============================================================
   熟練度顯示 + 控制中心
   ============================================================ */
function profDisplay(v){
  v = v || 0;
  if(v >= MAX_PROF_LEVEL) return 'Lv.' + MAX_PROF_LEVEL + ' (MAX)';
  const capped = Math.min(MAX_PROF_LEVEL, v);
  const lv = Math.floor(capped), pct = Math.round((capped - lv) * 100);
  return 'Lv.' + lv + ' (' + pct + '%)';
}

var _ccFolded = new Proxy({}, {
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

function openPreference(){
  const p = state.preferences;
  let body = '';
  body += rarityPolicyBlockHTML('exp', '🎯 探索模式彈藥', p.ammoExplore, true);
  body += rarityPolicyBlockHTML('texp', '💣 探索模式手雷', p.throwableExplore, true);
  const bd = openModal({title:'偏好設定', body});
  _bindPrefEvents(bd);
}

/* ============================================================
   軍械庫
   ============================================================ */
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
  if(!p){ return; }
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

/* ============================================================
   基地統計
   ============================================================ */
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

function renderBaseStats(){
  const rows = [];
  const genLv = getBuildingLv('generator');
  const genMult = 1 + genLv * 0.2;
  const radioLv = getBuildingLv('radio');
  if(radioLv > 0){
    const mh = Math.round(12 * genMult * 5.5 * radioLv);
    rows.push({ key: 'radio', label: '無線電', value: '+' + mh + '/h' });
  }
  const armoryLv = getBuildingLv('armory');
  if(armoryLv > 0){
    const sum = _getArmorySummary();
    rows.push({ key: 'armory', label: '軍械庫', value: sum ? sum.text : '—' });
  }
  const g = _gardenMerchantInit();
  const m = g.merchant;
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
  if(lv <= 0){ return; }
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

/* ============================================================
   基地主渲染
   ============================================================ */
function renderBase(){
  const z1=$('#zone1'),z2=$('#zone2'),z3=$('#zone3');
  let html='<div class="build-grid">';
  for(let i=0;i<12;i++){
    const slot=state.base.slots[i];
    if(i===0)html+='<div class="cell core" data-i="'+i+'"><div class="cico">'+buildingIcon('control')+'</div><div class="cnm">控製中心</div><div class="clv">Lv.1</div></div>';
    else if(slot){const b=BUILDINGS[slot.id]||{name:'未知'};html+='<div class="cell built" data-i="'+i+'"><div class="cico">'+buildingIcon(slot.id)+'</div><div class="cnm">'+b.name+'</div><div class="clv">Lv.'+slot.lv+'</div></div>';}
    else html+='<div class="cell" data-i="'+i+'"><div class="cico">＋</div><div class="cnm">空地</div></div>';
  }
  html+='</div>';z1.innerHTML=html;
  $$('.cell',z1).forEach(c=>{c.onclick=()=>onBuildCell(parseInt(c.dataset.i));});
  z2.innerHTML=
    '<div class="subnav">' +
      '<div class="subnav-tab on" data-tab="stats">📊 統計</div>' +
      '<div class="subnav-tab" data-tab="room">🚪 房間</div>' +
    '</div>' +
    '<div class="subnav-body" id="subnav-body">' +
      renderBaseStats() +
    '</div>';
  $$('.subnav-tab',z2).forEach(tab=>{
    tab.onclick=()=>{
      const _tid=tab.dataset.tab;
      if(_tid==='stats'){
        $$('.subnav-tab',z2).forEach(x=>x.classList.toggle('on',x===tab));
        const _b=$('#subnav-body');
        if(_b){ _b.innerHTML=renderBaseStats(); _rebindStatsClick(_b); }
      } else if(_tid==='room'){
        // room tab 未實現，點擊無反應
      }
    };
  });

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
  let html='<div class="z3-head"><div class="z3-title">🗺️ 探索區域</div></div>' +
    '<div class="mode-sel">' +
      '<div class="mode-btn '+(state.preferences.actionMode==='attack'?'on':'')+'" data-mode="attack">⚔ 攻擊</div>' +
      '<div class="mode-btn '+(state.preferences.actionMode==='stealth'?'on':'')+'" data-mode="stealth">🥷 潛行</div>' +
    '</div>' +
    '<div class="region-area">';
  const _baseKeys=['廢棄工廠','廢棄實驗室','郊區公路','輻射沼澤','廢土核心'];
  for(const baseName of _baseKeys){
    const r1=REGIONS[baseName];
    if(!r1)continue;
    if(r1.needUnlock && !state.unlockedRegions.includes(baseName)){
      html+='<div class="reg-item locked" style="opacity:.45;cursor:not-allowed"><div class="ri"><div class="rn">🔒 '+r1.name+'</div><div class="rd" style="color:#e05252">'+(r1.unlockHint||'未解鎖')+'</div></div></div>';
      continue;
    }
    const iiName=baseName+'II';
    const r2=REGIONS[iiName];
    const t2Exists=!!r2;
    const t2Unlocked=t2Exists&&(!r2.needUnlock||state.unlockedRegions.includes(iiName));
    const selTier=getSelectedRegionTier(baseName);
    html+='<div class="reg-item" data-sel-tier="'+selTier+'">' +
      '<div class="ri"><div class="rn">'+r1.name+'</div></div>' +
      '<div class="tier-selector">' +
        '<div class="tier-btn '+(selTier===1?'on':'')+'" data-key="'+baseName+'" data-tier="1">I</div>' +
        (t2Exists?'<div class="tier-btn '+(selTier===2?'on':'')+' '+(t2Unlocked?'':'locked')+'" data-key="'+baseName+'" data-tier="2">'+(t2Unlocked?'II':'🔒')+'</div>':'') +
      '</div>' +
    '</div>';
  }
  html+='</div>';
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
    if(slot.id==='garage'){ if(typeof _openGarageInfoModal === 'function') _openGarageInfoModal(i); return; }
    if(slot.id==='station'){ if(typeof openStationPage === 'function') openStationPage(); return; }
    const b=BUILDINGS[slot.id];
    const upCost=(slot.id==='forge')?{metal:150*slot.lv,screws:50*slot.lv}:{wood:15*slot.lv,metal:15*slot.lv,screws:5*slot.lv};
    const curBonus=buildingBonusText(slot.id,slot.lv);
    const nextBonus=buildingBonusText(slot.id,slot.lv+1);
    const _isMax = b.maxLv && slot.lv >= b.maxLv;
    let body='<div class="detail-title">'+buildingIcon(slot.id)+' '+b.name+' Lv.'+slot.lv+(_isMax ? ' (MAX)' : '')+'</div>' +
      '<div class="detail-sub">'+b.desc+'</div>' +
      '<div class="stat-line"><span class="k">當前效果</span><span class="v">'+curBonus+'</span></div>';
    if(!_isMax){
      body += '<div class="stat-line"><span class="k">升級後</span><span class="v">'+nextBonus+'</span></div>';
      body += '<div class="divider"></div>';
      body += '<div style="font-size:11px;color:#e8a33d;margin-bottom:4px">升級需求（等值一般）</div>';
      for(const [k,v] of Object.entries(upCost)){const have=materialEquivalent(k);const ok=have>=v;body+='<div class="stat-line"><span class="k">'+MATERIALS[k].name+'</span><span class="v" style="color:'+(ok?'#4caf50':'#e05252')+'">'+have+'/'+v+'</span></div>';}
    }
    const ft=el('div','modal-ft');
    const isWorkbench=slot.id==='workbench';
    ft.innerHTML = (_isMax
      ? '<button class="btn" id="m-up" disabled style="white-space:nowrap">已滿級</button>'
      : '<button class="btn primary" id="m-up">升級</button>')
      + (isWorkbench ? '<button class="btn" id="m-craft">改造</button>' : '');
    openModal({title:b.name,body,footer:ft});
    ft.querySelector('#m-up').onclick=()=>{
      if(b.maxLv && slot.lv >= b.maxLv){return;}
      for(const [k,v] of Object.entries(upCost))if(materialEquivalent(k)<v){return;}
      for(const [k,v] of Object.entries(upCost))consumeMaterial(k,v);
      slot.lv++;refreshPlayerStats();save();renderBase();
      closeModal(); onBuildCell(i);
    };
    const craftBtn=ft.querySelector('#m-craft');
    if(craftBtn)craftBtn.onclick=()=>{closeModal();openWorkbenchPage();};
    return;
  }
  const builtSet=new Set();
  state.base.slots.forEach((s,idx)=>{if(s&&idx!==i)builtSet.add(s.id);});
  const available=[],taken=[];
  for(const bid in BUILDINGS){if(builtSet.has(bid))taken.push(bid);else available.push(bid);}
  let body='<div style="font-size:11px;color:#e8a33d;margin-bottom:6px">選擇要建造的設施</div>';
  for(const bid of available){
    const b=BUILDINGS[bid];
    const needGarage = (bid === 'station' && getBuildingLv('garage') <= 0);
    let costHtml='';
    for(const [k,v] of Object.entries(b.cost)){const have=materialEquivalent(k);const ok=have>=v;costHtml+='<span class="'+(ok?'cost-ok':'cost-no')+'">'+MATERIALS[k].name+' '+have+'/'+v+'</span>';}
    let prereqHtml = '';
    if(needGarage) prereqHtml = '<div class="sub" style="color:#e05252">⚠ 需先建造車場</div>';
    body+='<div class="item-row' + (needGarage ? ' disabled' : '') + '" data-bid="'+bid+'"' + (needGarage ? ' style="opacity:.5;cursor:not-allowed"' : '') + '><div class="icon">'+buildingIcon(bid)+'</div><div class="info"><div class="nm">'+b.name+'</div><div class="sub">'+b.desc+'</div><div class="sub">'+costHtml+'</div><div class="sub" style="color:#4caf50">效果：'+buildingBonusText(bid,1)+'</div>' + prereqHtml + '</div></div>';
  }
  if(taken.length){
    body+='<div class="divider"></div><div style="color:#5a5040;font-size:10px;margin:4px 0 6px">已建造（不可重複）</div>';
    for(const bid of taken){const b=BUILDINGS[bid];body+='<div class="item-row" style="opacity:.35;background:#151210;cursor:not-allowed;border-color:#241d16"><div class="icon" style="filter:grayscale(1)">'+buildingIcon(bid)+'</div><div class="info"><div class="nm" style="color:#7a6f60">'+b.name+'</div><div class="sub">已建造</div></div></div>';}
  }
  const bd=openModal({title:'建造設施',body});
  $$('.item-row[data-bid]',bd).forEach(r=>{
    r.onclick=()=>{
      if(r.classList.contains('disabled')) return;
      const bid=r.dataset.bid;const b=BUILDINGS[bid];
      if(bid === 'station' && getBuildingLv('garage') <= 0){
        return;
      }
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
  let html='<div style="font-size:11px;color:#4caf50;font-weight:bold;margin:8px 0 6px">📋 改造隊列（'+state.crafting.filter(c=>c.type==='mod').length+'/'+workbenchLv+'）</div>';
  for(const c of state.crafting){
    if(c.type!=='mod')continue;
    const info=c.modInfo;
    const total=c.time*1000/sm;
    const elapsed=now-c.startTime;
    const pct=Math.min(100,(elapsed/total)*100);
    const remain=Math.max(0,Math.ceil((total-elapsed)/1000));
    const newName=namedWeaponName(info.baseId,info.mag,info.scope,info.grip);
    html+='<div class="craft-slot"><div style="flex:1"><div style="color:#e8a33d;font-weight:bold;font-size:11px">'+newName+'</div><div class="progress"><div class="fill" style="width:'+pct+'%"></div></div><div style="font-size:9px;color:#7a6f60;margin-top:2px">剩餘 '+remain+'s</div></div></div>';
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
  body+='<div id="mod-queue-area">'+renderModQueueHtml(workbenchLv)+'</div>';
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
    const eqLabel=c.equippedSlot?'（裝備中）':'×'+(c.count||1);
    body+='<div class="item-row" data-idx="'+candidates.indexOf(c)+'" style="'+(typeMaxed?'':'opacity:.5')+'"><div class="icon">'+itemIcon(c.id,30)+'</div><div class="info"><div class="nm '+(c.rarity==='具名'?'r-具名':'r-傳奇')+'">'+c.def.name+' '+eqLabel+'</div><div class="sub">彈匣：'+(getMagOptionsForWeapon(c.baseId).join('/')||'—')+' ｜ 瞄具：'+((rules.scopes||[]).join('/')||'—')+'</div><div class="sub" style="color:'+(typeMaxed?'#4caf50':'#e05252')+'">熟練度 '+Math.floor(state.proficiency[wdef.type]||0)+'/'+MAX_PROF_LEVEL+'</div></div></div>';
  }
  const bd=openModal({title:'工作台 · 改造',body});
  if(window.modQueueTimer){clearInterval(window.modQueueTimer);window.modQueueTimer=null;}
  window.modQueueTimer=setInterval(()=>{const qa=document.getElementById('mod-queue-area');if(!qa){if(window.modQueueTimer){clearInterval(window.modQueueTimer);window.modQueueTimer=null;}return;}qa.innerHTML=renderModQueueHtml(workbenchLv);},500);
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
    body+='<div style="font-size:12px;font-weight:bold;color:#e8a33d;margin-bottom:4px">'+wdef.name+' <span class="r-傳奇">(傳奇)</span></div>';
    body+='<div style="font-size:10px;color:#7a6f60;margin-bottom:8px">基礎彈匣：'+defaultMag+'｜口徑：'+wdef.cal+'</div>';
    if(magOptions.length){
      body+='<div style="color:#e8a33d;font-weight:bold;font-size:11px;margin:8px 0 4px">彈匣擴展（可選）</div>';
      body+='<div class="mod-opt '+(state_mod.mag===null?'on':'')+'" data-opt="mag" data-val=""><div class="nm">保持原彈匣（'+defaultMag+'）</div><div class="bonus">—</div></div>';
      for(const m of magOptions){
        if(m === defaultMag) continue;
        const bonus = m - defaultMag;
        body+='<div class="mod-opt '+(state_mod.mag===m?'on':'')+'" data-opt="mag" data-val="'+m+'"><div class="nm">'+m+' 發彈匣</div><div class="bonus">容量 +'+bonus+'</div></div>';
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
      body+='<div style="color:#e8a33d;font-weight:bold;font-size:11px;margin:8px 0 4px">瞄具（可選）</div>';
      body+='<div class="mod-opt '+(state_mod.scope===null?'on':'')+'" data-opt="scope" data-val=""><div class="nm">不裝瞄具</div><div class="bonus">—</div></div>';
      for(const s of sortedScopes){body+='<div class="mod-opt '+(state_mod.scope===s?'on':'')+'" data-opt="scope" data-val="'+s+'"><div class="nm">'+(SCOPE_NAME[s]||s)+'</div><div class="bonus">命中 +'+(SCOPE_BONUS[s]||0)+'%</div></div>';}
    }
    const mag=state_mod.mag;const scope=state_mod.scope;
    if(mag||scope){
      const newName=namedWeaponName(baseId,mag,scope);
      const totalCost={};
      if(mag){const c=calcModCost(baseId,mag,null);for(const k in c)totalCost[k]=(totalCost[k]||0)+c[k];}
      if(scope){const c=calcModCost(baseId,null,scope);for(const k in c)totalCost[k]=(totalCost[k]||0)+c[k];}
      const totalTime=calcModTime(baseId,mag,scope);
      body+='<div class="divider"></div>';
      body+='<div style="color:#a45ede;font-weight:bold;font-size:12px;margin:4px 0">'+newName+'</div>';
      let ok=true;
      for(const [k,v] of Object.entries(totalCost)){const have=materialEquivalent(k);const ok2=have>=v;if(!ok2)ok=false;body+='<div class="stat-line"><span class="k">'+MATERIALS[k].name+'</span><span class="v" style="color:'+(ok2?'#4caf50':'#e05252')+'">'+have+'/'+v+'</span></div>';}
      {const _ft=totalTime>=3600?Math.round(totalTime/3600)+' 小時':(totalTime>=60?Math.round(totalTime/60)+' 分鐘':totalTime+' 秒');body+='<div class="stat-line"><span class="k">花費時間</span><span class="v">'+_ft+'</span></div>';}
      return {body,ok,totalCost,totalTime};
    }
    return {body,ok:false,totalCost:{},totalTime:0};
  }
  const result=renderModBody();
  const ft=el('div','modal-ft');
  ft.innerHTML='<button class="btn primary" id="m-confirm" '+(result.ok?'':'disabled')+'>改造</button><button class="btn ghost" id="m-exit">退出</button>';
  const bd=openModal({title:'改造 '+wdef.name,body:result.body,footer:ft,onClose:function(){ closeModal(); if(onCancel) onCancel(); }});
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
  let h = '<div style="color:#e8a33d;font-weight:bold;font-size:11px;margin:10px 0 6px">'+title+'</div>';
  h += '<div style="display:flex;align-items:center;gap:8px;padding:4px 0"><span style="flex:0 0 60px;color:#7a6f60;font-size:11px">優先使用</span><select id="'+prefix+'-pri" style="flex:1;background:#151210;color:#ddd;border:1px solid #2a231c;border-radius:4px;padding:4px 6px;font-size:11px">';
  for(const r of RARITY_ORDER){h += '<option value="'+r+'" '+(pri===r?'selected':'')+'>'+r+'</option>';}
  h += '</select></div>';
  if(showExclude){
    h += '<div style="display:flex;align-items:flex-start;gap:8px;padding:4px 0"><span style="flex:0 0 60px;color:#7a6f60;font-size:11px;padding-top:4px">不使用</span><div style="flex:1;display:flex;flex-wrap:wrap;gap:4px">';
    for(const r of UI_RARITY_LIST){
      const on = ex.includes(r);
      const bc = on ? '#e05252' : '#3a2f25';
      const bg = on ? '#3a1a1a' : '#241d16';
      const tc = on ? '#e05252' : '#a89a85';
      h += '<label class="excl-label" data-prefix="'+prefix+'" data-r="'+r+'" style="cursor:pointer;font-size:10px;padding:3px 8px;border-radius:4px;border:1px solid '+bc+';background:'+bg+';color:'+tc+';user-select:none;display:flex;align-items:center;gap:4px;line-height:1.2"><input type="checkbox" class="excl-cb" data-prefix="'+prefix+'" data-r="'+r+'" '+(on?'checked':'')+' style="accent-color:#e05252;margin:0;width:auto;flex:0 0 auto">'+r+'</label>';
    }
    h += '</div></div>';
  }
  h += '<div style="display:flex;align-items:center;gap:8px;padding:4px 0"><span style="flex:0 0 60px;color:#7a6f60;font-size:11px">用罄後</span><select id="'+prefix+'-fb" style="flex:1;background:#151210;color:#ddd;border:1px solid #2a231c;border-radius:4px;padding:4px 6px;font-size:11px">';
  h += '<option value="desc" '+(fb==='desc'?'selected':'')+'>降序（傳奇→破舊）</option>';
  h += '<option value="asc" '+(fb==='asc'?'selected':'')+'>升序（破舊→傳奇）</option>';
  h += '</select></div>';
  return h;
}


/* ═══════════════════════════════════════════════════════════════
 * rev-workbench-v3: 工作台全屏頁面（參考車庫佈局）
 * ═══════════════════════════════════════════════════════════════ */
function _wkEnsureStyles(){
  var old = document.getElementById('workbench-styles');
  if(old) old.remove();
  var st = document.createElement('style');
  st.id = 'workbench-styles';
  st.textContent = [
    '#workbench-page{position:fixed;top:0;left:0;right:0;bottom:calc(54px + env(safe-area-inset-bottom,0px));background:#0e0c0a;z-index:9300;display:none;flex-direction:column;overflow:hidden;padding:6px 8px;gap:6px}',
    '#workbench-page.on{display:flex}',
    '.wk-header{flex:0 0 auto;display:flex;align-items:center;gap:10px;padding:4px 6px;background:#17140f;border:1px solid #2a231c;border-radius:6px}',
    '.wk-title{font-size:13px;color:#e8a33d;font-weight:bold}',
    '.wk-x{font-size:14px;color:#fff;padding:4px 10px;background:#6a2a2a;border-radius:5px;cursor:pointer;margin-left:auto;font-weight:bold}',
    '.wk-main{flex:1;min-height:0;display:flex;flex-direction:column;gap:6px;overflow:hidden}',
    '.wk-showcase{flex:0 0 24vh;background:linear-gradient(180deg,#1a1510,#14110c);border:2px solid #2a231c;border-radius:8px;display:flex;align-items:center;justify-content:center;cursor:pointer;position:relative;min-height:0;overflow:hidden;padding:8px;box-sizing:border-box;transition:border-color 0.15s}',
    '.wk-showcase:hover{filter:brightness(1.1)}',
    '.wk-showcase img{max-width:100%;max-height:100%;object-fit:contain;pointer-events:none}',
    '.wk-showcase .wname{position:absolute;top:6px;left:8px;font-size:13px;color:#fff;font-weight:bold;background:rgba(14,12,10,0.75);padding:3px 10px;border-radius:4px;pointer-events:none;max-width:calc(100% - 16px);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.wk-showcase .switch{position:absolute;bottom:6px;right:8px;font-size:11px;color:#a89a85;background:rgba(14,12,10,0.75);padding:3px 10px;border-radius:4px;pointer-events:none}',
    '.wk-showcase.empty{cursor:default;justify-content:center;color:#5a5040;font-size:12px;border-color:#2a231c !important}',
    '.wk-showcase.empty:hover{filter:none}',
    '.wk-slots{flex:0 0 auto;display:grid;grid-template-columns:repeat(3,1fr);gap:6px}',
    '.wk-slot{background:#1a1510;border:1.5px solid #3a2f25;border-radius:6px;padding:10px 6px;min-height:64px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;cursor:pointer;position:relative;text-align:center}',
    '.wk-slot:hover{border-color:#8a5f18}',
    '.wk-slot.filled{border-color:#8a5f18;background:#241d16}',
    '.wk-slot.disabled{opacity:0.35;cursor:not-allowed}',
    '.wk-slot.disabled:hover{border-color:#3a2f25}',
    '.wk-slot .lbl{font-size:10px;color:#7a6f60;font-weight:bold}',
    '.wk-slot .val{font-size:11px;color:#e8a33d;font-weight:bold;line-height:1.3;word-break:break-all;padding:0 2px}',
    '.wk-info{flex:0 0 auto;background:#1a1510;border:1px solid #2a231c;border-radius:6px;padding:8px 10px;display:flex;flex-direction:column;gap:3px;font-size:11px}',
    '.wk-info .row{display:flex;justify-content:space-between;padding:1px 0;gap:8px}',
    '.wk-info .row .k{color:#7a6f60;flex:0 0 auto}',
    '.wk-info .row .v{color:#e8a33d;font-weight:bold;text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.wk-info .row.bad .v{color:#e05252}',
    '.wk-actions{flex:0 0 auto;display:flex;gap:6px}',
    '.wk-actions .btn{flex:1;padding:9px;font-size:12px;border-radius:5px}',
    '.wk-dock{flex:1;min-height:0;background:#1a1510;border:1px solid #2a231c;border-radius:6px;display:flex;flex-direction:column;overflow:hidden}',
    '.wk-dock-title{flex:0 0 auto;padding:6px 10px;font-size:11px;color:#e8a33d;font-weight:bold;border-bottom:1px solid #2a231c;background:#17140f;display:flex;justify-content:space-between;align-items:center}',
    '.wk-dock-title .cnt{font-size:10px;color:#7a6f60;font-weight:normal}',
    '.wk-dock-list{flex:1;min-height:0;overflow-x:auto;overflow-y:hidden;display:flex;gap:6px;padding:6px;scrollbar-width:none}',
    '.wk-dock-list::-webkit-scrollbar{display:none}',
    '.wk-dock-card{flex:0 0 140px;background:#241d16;border:1px solid #3a2f25;border-radius:5px;padding:6px 8px;display:flex;flex-direction:column;gap:4px;box-sizing:border-box;overflow:hidden}',
    '.wk-dock-card .nm{font-size:11px;color:#e8a33d;font-weight:bold;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.wk-dock-card .bar{height:4px;background:#0e0c0a;border-radius:2px;overflow:hidden;border:1px solid #2a231c}',
    '.wk-dock-card .bar .fill{height:100%;background:linear-gradient(90deg,#8a5f18,#e8a33d);transition:width 0.3s linear}',
    '.wk-dock-card .remain{font-size:9px;color:#7a6f60;text-align:right}',
    '.wk-dock-empty{flex:1;display:flex;align-items:center;justify-content:center;color:#5a5040;font-size:11px;padding:10px}',
    '.wk-picker-overlay{position:fixed;inset:0;z-index:9400;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;padding:20px}',
    '.wk-picker{background:#1e1813;border:1px solid #3a2f25;border-radius:10px;width:100%;max-width:460px;max-height:82vh;display:flex;flex-direction:column;overflow:hidden}',
    '.wk-picker-hd{padding:10px 12px;border-bottom:1px solid #2a231c;font-size:13px;color:#e8a33d;font-weight:bold;display:flex;justify-content:space-between;align-items:center}',
    '.wk-picker-hd .x{font-size:15px;color:#fff;background:#6a2a2a;padding:3px 10px;border-radius:4px;cursor:pointer}',
    '.wk-filter-row{display:flex;gap:6px;padding:8px 10px;flex-wrap:wrap;border-bottom:1px solid #2a231c}',
    '.wk-filter{flex:0 0 auto;padding:8px 16px;font-size:12px;border-radius:5px;background:#241d16;border:1px solid #3a2f25;color:#a89a85;cursor:pointer;min-height:32px;box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;user-select:none}',
    '.wk-filter:hover{border-color:#8a5f18}',
    '.wk-filter.on{background:#8a5f18;border-color:#e8a33d;color:#fff;font-weight:bold}',
    '.wk-picker-bd{flex:1;min-height:0;overflow-y:auto;padding:8px}',
    '.wk-picker-bd::-webkit-scrollbar{width:4px}',
    '.wk-picker-bd::-webkit-scrollbar-thumb{background:#3a2f25;border-radius:2px}',
    '.wk-picker-ft{padding:8px;border-top:1px solid #2a231c;display:flex;gap:6px}'
  ].join('');
  document.head.appendChild(st);
}

function _wkRarityColor(r){
  var map = { '破舊':'#b87333', '一般':'#e0e0e0', '庫存':'#4caf50', '精品':'#2196f3', '傳奇':'#ffb300', '具名':'#a45ede' };
  return map[r] || '#3a2f25';
}

function _wkGetCandidates(){
  var out = [];
  ['primary','secondary','melee'].forEach(function(slot){
    var id = state.player.equipped[slot];
    if(!id) return;
    var rar = state.player.equippedRarity[slot] || '一般';
    if(rar !== '傳奇') return;
    var def = itemDef(id);
    if(!def || def.named) return;
    if(!WEAPONS[id]) return;
    var rules = WEAPON_MOD_RULES[id];
    if(!rules) return;
    var hasAny = (rules.mags && rules.mags.length) || (rules.scopes && rules.scopes.length) || (rules.grips && rules.grips.length);
    if(!hasAny) return;
    out.push({ rawId: 'equipped:' + slot, baseId: id, rarity: rar, location: 'equipped', slot: slot, type: (WEAPONS[id] && WEAPONS[id].type) || '' });
  });
  for(var k in state.inventory){
    var parts = k.split('@');
    var iid = parts[0], irar = parts[1];
    if(irar !== '傳奇') continue;
    var def2 = itemDef(iid);
    if(!def2 || def2.named) continue;
    if(!WEAPONS[iid]) continue;
    var rules2 = WEAPON_MOD_RULES[iid];
    if(!rules2) continue;
    var hasAny2 = (rules2.mags && rules2.mags.length) || (rules2.scopes && rules2.scopes.length) || (rules2.grips && rules2.grips.length);
    if(!hasAny2) continue;
    out.push({ rawId: k, baseId: iid, rarity: irar, location: 'inventory', count: state.inventory[k], type: (WEAPONS[iid] && WEAPONS[iid].type) || '' });
  }
  return out;
}

function _wkRender(p){
  var wbLv = getBuildingLv('workbench');
  var s = window._wkState;
  var candidates = _wkGetCandidates();

  if(s.selectedRawId){
    var _found = false;
    for(var _i = 0; _i < candidates.length; _i++){
      if(candidates[_i].rawId === s.selectedRawId){ _found = true; s.selectedBaseId = candidates[_i].baseId; s.selectedRarity = candidates[_i].rarity; break; }
    }
    if(!_found){ s.selectedRawId = null; s.selectedBaseId = null; s.selectedRarity = null; }
  }
  if(!s.selectedRawId && candidates.length > 0){
    var c0 = candidates[0];
    s.selectedRawId = c0.rawId;
    s.selectedBaseId = c0.baseId;
    s.selectedRarity = c0.rarity;
    s.draftMag = null; s.draftScope = null; s.draftGrip = null;
  }

  var html = '';
  html += '<div class="wk-header"><div class="wk-title">🛠 工作台 · Lv.' + wbLv + '</div><div class="wk-x" id="wk-close">✕</div></div>';
  html += '<div class="wk-main">';

  if(!s.selectedBaseId){
    html += '<div class="wk-showcase empty">暫無可改造武器</div>';
    html += '<div class="wk-dock"><div class="wk-dock-title"><span>改造隊列</span><span class="cnt">0/' + wbLv + '</span></div><div class="wk-dock-list" id="wk-queue-body"><div class="wk-dock-empty">暫無改造任務</div></div></div>';
    html += '</div>';
    p.innerHTML = html;
    _wkBind(p);
    return;
  }

  var baseId = s.selectedBaseId;
  var rarity = s.selectedRarity;
  var previewId = getNamedId(baseId, s.draftMag, s.draftScope, s.draftGrip);
  var _imgPath = window.getItemIconPath(previewId);
  var _fbPath = window.getItemIconPath(baseId);
  var _wname = (WEAPONS[baseId] && WEAPONS[baseId].name) || baseId;
  var _borderColor = _wkRarityColor(rarity);

  html += '<div class="wk-showcase" id="wk-showcase" style="border-color:' + _borderColor + '">';
  html += '<div class="wname">' + _wname + '</div>';
  html += '<img src="' + _imgPath + assetSuffix(_imgPath) + '" onerror="this.onerror=null;this.src=&quot;' + _fbPath + assetSuffix(_fbPath) + '&quot;" alt="">';
  html += '<div class="switch">▼ 點擊切換</div>';
  html += '</div>';

  var rules = WEAPON_MOD_RULES[baseId] || {};
  var _hasMags = rules.mags && rules.mags.length;
  var _hasScopes = rules.scopes && rules.scopes.length;
  var _hasGrips = rules.grips && rules.grips.length;

  html += '<div class="wk-slots">';
  var magDisp = s.draftMag ? (s.draftMag + ' 發') : ('原 ' + WEAPONS[baseId].mag + ' 發');
  html += '<div class="wk-slot ' + (s.draftMag ? 'filled' : '') + (_hasMags ? '' : ' disabled') + '" data-slot="mag"><div class="lbl">彈匣</div><div class="val">' + magDisp + '</div></div>';
  var scopeDisp = s.draftScope ? (SCOPE_NAME[s.draftScope] || s.draftScope) : '無';
  html += '<div class="wk-slot ' + (s.draftScope ? 'filled' : '') + (_hasScopes ? '' : ' disabled') + '" data-slot="scope"><div class="lbl">瞄具</div><div class="val">' + scopeDisp + '</div></div>';
  var gripDisp = s.draftGrip ? (GRIP_NAME[s.draftGrip] || s.draftGrip) : '無';
  html += '<div class="wk-slot ' + (s.draftGrip ? 'filled' : '') + (_hasGrips ? '' : ' disabled') + '" data-slot="grip"><div class="lbl">握把</div><div class="val">' + gripDisp + '</div></div>';
  html += '</div>';

  var totalCost = {}, totalTime = 0;
  if(s.draftMag){ var c1 = calcModCost(baseId, s.draftMag, null, null); for(var k in c1) totalCost[k] = (totalCost[k] || 0) + c1[k]; }
  if(s.draftScope){ var c2 = calcModCost(baseId, null, s.draftScope, null); for(var k2 in c2) totalCost[k2] = (totalCost[k2] || 0) + c2[k2]; }
  if(s.draftGrip){ var c3 = calcModCost(baseId, null, null, s.draftGrip); for(var k3 in c3) totalCost[k3] = (totalCost[k3] || 0) + c3[k3]; }
  if(s.draftMag || s.draftScope || s.draftGrip) totalTime = calcModTime(baseId, s.draftMag, s.draftScope, s.draftGrip);

  var _canCraft = !!(s.draftMag || s.draftScope || s.draftGrip);
  html += '<div class="wk-info">';
  html += '<div class="row"><span class="k">改造後</span><span class="v">' + namedWeaponName(baseId, s.draftMag, s.draftScope, s.draftGrip) + '</span></div>';
  if(totalTime > 0){
    for(var ck in totalCost){
      var have = materialEquivalent(ck);
      var need = totalCost[ck];
      if(have < need) _canCraft = false;
      html += '<div class="row ' + (have >= need ? '' : 'bad') + '"><span class="k">' + MATERIALS[ck].name + '</span><span class="v">' + have + '/' + need + '</span></div>';
    }
    var _tStr = totalTime >= 3600 ? Math.round(totalTime / 3600) + ' 小時' : (Math.round(totalTime / 60) + ' 分鐘');
    html += '<div class="row"><span class="k">時間</span><span class="v">' + _tStr + '</span></div>';
  }
  html += '</div>';

  var _modQ = (state.crafting || []).filter(function(c){ return c.type === 'mod'; });
  var _queueFull = _modQ.length >= wbLv;
  if(_queueFull) _canCraft = false;

  html += '<div class="wk-actions">';
  html += '<button class="btn primary" id="wk-craft"' + (_canCraft ? '' : ' disabled') + '>' + (_queueFull ? '隊列已滿 (' + _modQ.length + '/' + wbLv + ')' : '確認改造') + '</button>';
  html += '<button class="btn ghost" id="wk-reset">重置</button>';
  html += '</div>';

  html += '<div class="wk-dock">';
  html += '<div class="wk-dock-title"><span>改造隊列</span><span class="cnt">' + _modQ.length + '/' + wbLv + '</span></div>';
  html += '<div class="wk-dock-list" id="wk-queue-body"></div>';
  html += '</div>';
  html += '</div>';

  p.innerHTML = html;
  _wkBind(p);
  _wkRenderQueue();
}

function _wkRenderQueue(){
  var body = document.getElementById('wk-queue-body');
  if(!body) return;
  var queue = (state.crafting || []).filter(function(c){ return c.type === 'mod'; });
  if(queue.length === 0){
    body.innerHTML = '<div class="wk-dock-empty">暫無改造任務</div>';
    return;
  }
  var now = Date.now();
  var html = '';
  for(var i = 0; i < queue.length; i++){
    var c = queue[i], info = c.modInfo;
    var name = namedWeaponName(info.baseId, info.mag, info.scope, info.grip);
    var total = c.time * 1000;
    var elapsed = now - c.startTime;
    var pct = Math.min(100, Math.max(0, elapsed / total * 100));
    var remain = Math.max(0, Math.ceil((total - elapsed) / 1000));
    html += '<div class="wk-dock-card" data-qi="' + i + '"><div class="nm">' + name + '</div><div class="bar"><div class="fill" style="width:' + pct + '%"></div></div><div class="remain">剩 ' + remain + ' 秒</div></div>';
  }
  body.innerHTML = html;
}

function _wkUpdateQueueProgress(){
  var body = document.getElementById('wk-queue-body');
  if(!body) return;
  var queue = (state.crafting || []).filter(function(c){ return c.type === 'mod'; });
  var cards = body.querySelectorAll('[data-qi]');
  if(cards.length !== queue.length){ _wkRenderQueue(); return; }
  var now = Date.now();
  for(var i = 0; i < queue.length; i++){
    var c = queue[i];
    var total = c.time * 1000;
    var elapsed = now - c.startTime;
    var pct = Math.min(100, Math.max(0, elapsed / total * 100));
    var remain = Math.max(0, Math.ceil((total - elapsed) / 1000));
    var el = cards[i];
    var fill = el.querySelector('.fill');
    var rem = el.querySelector('.remain');
    if(fill) fill.style.width = pct + '%';
    if(rem) rem.textContent = '剩 ' + remain + ' 秒';
  }
}

function _wkBind(p){
  var close = p.querySelector('#wk-close');
  if(close) close.onclick = closeWorkbenchPage;
  var showcase = p.querySelector('#wk-showcase');
  if(showcase && !showcase.classList.contains('empty')) showcase.onclick = _wkOpenWeaponPicker;
  p.querySelectorAll('.wk-slot').forEach(function(el){
    if(el.classList.contains('disabled')) return;
    el.onclick = function(){ _wkOpenPicker(el.getAttribute('data-slot')); };
  });
  var craft = p.querySelector('#wk-craft');
  if(craft && !craft.disabled) craft.onclick = _wkConfirmCraft;
  var reset = p.querySelector('#wk-reset');
  if(reset) reset.onclick = function(){
    window._wkState.draftMag = null;
    window._wkState.draftScope = null;
    window._wkState.draftGrip = null;
    _wkRender(p);
  };
}

function _wkOpenWeaponPicker(){
  var candidates = _wkGetCandidates();
  if(!candidates.length) return;
  var s = window._wkState;
  var filterType = '全部';
  var TYPES = ['全部','突擊步槍','機槍','狙擊槍','衝鋒槍','霰彈槍'];

  var overlay = document.createElement('div');
  overlay.className = 'wk-picker-overlay';

  function _renderList(){
    var filtered = candidates.filter(function(c){
      if(filterType !== '全部' && c.type !== filterType) return false;
      return true;
    });
    var filterHtml = '<div class="wk-filter-row">';
    TYPES.forEach(function(t){
      filterHtml += '<div class="wk-filter ' + (filterType === t ? 'on' : '') + '" data-ft="' + t + '">' + t + '</div>';
    });
    filterHtml += '</div>';
    var listHtml = '';
    if(filtered.length === 0){
      listHtml = '<div class="empty-hint">沒有符合條件的武器</div>';
    } else {
      for(var i = 0; i < filtered.length; i++){
        var c = filtered[i];
        var nm = (WEAPONS[c.baseId] && WEAPONS[c.baseId].name) || c.baseId;
        var isCur = c.rawId === s.selectedRawId;
        var _c = _wkRarityColor(c.rarity);
        listHtml += '<div class="item-row" data-rawid="' + c.rawId + '" style="' + (isCur ? 'border-color:' + _c + ';background:#2a1f10;' : 'border-left:3px solid ' + _c + ';') + '"><div class="info"><div class="nm" style="color:' + _c + '">' + nm + '</div><div class="sub">' + (c.type || '?') + ' · ' + (c.location === 'equipped' ? '已裝備' : '背包') + '</div></div>' + (isCur ? '<div class="cnt">✓</div>' : '') + '</div>';
      }
    }
    return '<div class="wk-picker"><div class="wk-picker-hd"><span>選擇武器</span><span class="x">✕</span></div>' + filterHtml + '<div class="wk-picker-bd">' + listHtml + '</div><div class="wk-picker-ft"><button class="btn ghost" id="wk-picker-cancel">取消</button></div></div>';
  }

  function _bind(ovl){
    ovl.querySelector('.x').onclick = function(){ ovl.remove(); };
    var cancel = ovl.querySelector('#wk-picker-cancel');
    if(cancel) cancel.onclick = function(){ ovl.remove(); };
    ovl.querySelectorAll('[data-ft]').forEach(function(el){
      el.onclick = function(){ filterType = el.getAttribute('data-ft'); refresh(); };
    });
    ovl.querySelectorAll('[data-rawid]').forEach(function(el){
      el.onclick = function(){
        var rawId = el.getAttribute('data-rawid');
        var c = null;
        for(var i = 0; i < candidates.length; i++){ if(candidates[i].rawId === rawId){ c = candidates[i]; break; } }
        if(!c) return;
        if(s.selectedRawId !== rawId){
          s.draftMag = null; s.draftScope = null; s.draftGrip = null;
        }
        s.selectedRawId = rawId;
        s.selectedBaseId = c.baseId;
        s.selectedRarity = c.rarity;
        ovl.remove();
        _wkRender(document.getElementById('workbench-page'));
      };
    });
  }

  function refresh(){
    overlay.innerHTML = _renderList();
    _bind(overlay);
  }

  overlay.innerHTML = _renderList();
  _bind(overlay);
  document.body.appendChild(overlay);
}

function _wkOpenPicker(slot){
  var s = window._wkState;
  var baseId = s.selectedBaseId;
  if(!baseId) return;
  var rules = WEAPON_MOD_RULES[baseId] || {};
  var options = [];
  if(slot === 'mag'){
    options.push({ label: '保持原彈匣（' + WEAPONS[baseId].mag + ' 發）', val: null });
    var mags = getMagOptionsForWeapon(baseId);
    for(var i = 0; i < mags.length; i++){
      if(mags[i] === WEAPONS[baseId].mag) continue;
      options.push({ label: mags[i] + ' 發彈匣', val: mags[i] });
    }
  } else if(slot === 'scope'){
    options.push({ label: '不安裝瞄具', val: null });
    var scopes = rules.scopes || [];
    for(var j = 0; j < scopes.length; j++){
      var _rg = Math.round((SCOPE_RANGE_BONUS[scopes[j]] || 0) * 100);
      options.push({ label: (SCOPE_NAME[scopes[j]] || scopes[j]) + '（射程+' + _rg + '%）', val: scopes[j] });
    }
  } else if(slot === 'grip'){
    options.push({ label: '不安裝握把', val: null });
    var grips = rules.grips || [];
    for(var k = 0; k < grips.length; k++){
      options.push({ label: (GRIP_NAME[grips[k]] || grips[k]) + '（命中+' + GRIP_HIT_BONUS + '%）', val: grips[k] });
    }
  }
  var overlay = document.createElement('div');
  overlay.className = 'wk-picker-overlay';
  var html = '<div class="wk-picker"><div class="wk-picker-hd"><span>' + (slot === 'mag' ? '彈匣' : slot === 'scope' ? '瞄具' : '握把') + '</span><span class="x">✕</span></div><div class="wk-picker-bd">';
  for(var oi = 0; oi < options.length; oi++){
    var o = options[oi];
    var cur = slot === 'mag' ? s.draftMag : slot === 'scope' ? s.draftScope : s.draftGrip;
    var isSel = (o.val === cur);
    html += '<div class="item-row" data-val="' + (o.val === null ? '__null__' : o.val) + '" style="' + (isSel ? 'border-color:#e8a33d;background:#2a1f10;' : '') + '"><div class="info"><div class="nm">' + o.label + '</div></div>' + (isSel ? '<div class="cnt">✓</div>' : '') + '</div>';
  }
  html += '</div><div class="wk-picker-ft"><button class="btn ghost" id="wk-picker-cancel">取消</button></div></div>';
  overlay.innerHTML = html;
  document.body.appendChild(overlay);
  function _close(){ overlay.remove(); }
  overlay.querySelector('.x').onclick = _close;
  overlay.querySelector('#wk-picker-cancel').onclick = _close;
  overlay.querySelectorAll('[data-val]').forEach(function(row){
    row.onclick = function(){
      var v = row.getAttribute('data-val');
      if(v === '__null__') v = null;
      else if(slot === 'mag') v = parseInt(v, 10);
      if(slot === 'mag') s.draftMag = v;
      else if(slot === 'scope') s.draftScope = v;
      else if(slot === 'grip') s.draftGrip = v;
      _close();
      _wkRender(document.getElementById('workbench-page'));
    };
  });
}

function _wkConfirmCraft(){
  var s = window._wkState;
  if(!s.selectedRawId) return;
  if(!s.draftMag && !s.draftScope && !s.draftGrip){ if(typeof toast === 'function') toast('至少選擇一項配件', 'err'); return; }
  var cands = _wkGetCandidates();
  var c = null;
  for(var i = 0; i < cands.length; i++){ if(cands[i].rawId === s.selectedRawId){ c = cands[i]; break; } }
  if(!c){ if(typeof toast === 'function') toast('武器不存在', 'err'); return; }
  var wbLv = getBuildingLv('workbench');
  if(wbLv <= 0) return;
  var cost = calcModCost(c.baseId, s.draftMag, s.draftScope, s.draftGrip);
  for(var ck in cost){
    if(materialEquivalent(ck) < cost[ck]){ if(typeof toast === 'function') toast('材料不足', 'err'); return; }
  }
  var queue = (state.crafting || []).filter(function(x){ return x.type === 'mod'; });
  if(queue.length >= wbLv){ if(typeof toast === 'function') toast('改造隊列已滿', 'err'); return; }
  for(var ck2 in cost) consumeMaterial(ck2, cost[ck2]);
  if(c.location === 'equipped'){
    state.player.equipped[c.slot] = null;
    delete state.player.equippedRarity[c.slot];
    if(typeof refreshPlayerStats === 'function') refreshPlayerStats();
  } else {
    var parts = c.rawId.split('@');
    invRemove(parts[0], parts[1], 1);
  }
  state.crafting.push({
    type: 'mod',
    modInfo: {
      baseId: c.baseId, baseRarity: c.rarity,
      mag: s.draftMag, scope: s.draftScope, grip: s.draftGrip,
      fromEquippedSlot: c.location === 'equipped' ? c.slot : null,
      originalId: null,
      originalRarity: c.rarity,
      _consumedAtStart: true
    },
    time: calcModTime(c.baseId, s.draftMag, s.draftScope, s.draftGrip),
    startTime: Date.now()
  });
  if(typeof save === 'function') save();
  if(typeof toast === 'function') toast('改造已加入隊列', 'ok');
  window._wkState.selectedRawId = null;
  window._wkState.selectedBaseId = null;
  window._wkState.selectedRarity = null;
  window._wkState.draftMag = null;
  window._wkState.draftScope = null;
  window._wkState.draftGrip = null;
  _wkRender(document.getElementById('workbench-page'));
}

function openWorkbenchPage(){
  _wkEnsureStyles();
  var p = document.getElementById('workbench-page');
  if(!p){
    p = document.createElement('div');
    p.id = 'workbench-page';
    (document.getElementById('content') || document.body).appendChild(p);
  }
  if(!window._wkState){
    window._wkState = { selectedRawId: null, selectedBaseId: null, selectedRarity: null, draftMag: null, draftScope: null, draftGrip: null };
  }
  _wkRender(p);
  p.classList.add('on');
  if(window._wkTimer) clearInterval(window._wkTimer);
  window._wkTimer = setInterval(function(){
    var _p = document.getElementById('workbench-page');
    if(!_p || !_p.classList.contains('on')){ clearInterval(window._wkTimer); window._wkTimer = null; return; }
    _wkUpdateQueueProgress();
  }, 1000);
}

function closeWorkbenchPage(){
  var p = document.getElementById('workbench-page');
  if(p) p.classList.remove('on');
  if(window._wkTimer){ clearInterval(window._wkTimer); window._wkTimer = null; }
}

window.openWorkbenchPage = openWorkbenchPage;
window.closeWorkbenchPage = closeWorkbenchPage;

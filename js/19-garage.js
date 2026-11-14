
'use strict';

function _garageInitState(){
  if(!state.garage || typeof state.garage !== 'object'){
    state.garage = {
      currentVehicle: 'btr80', ownedVehicles: ['btr80'],
      vehicleExp: { btr80: 0 }, researchTarget: null,
      researchProgress: {}, globalExp: 0, camo: {}, extraExp: {}
    };
  }
  const g = state.garage;
  if(!Array.isArray(g.ownedVehicles)) g.ownedVehicles = ['btr80'];
  if(!g.vehicleExp || typeof g.vehicleExp !== 'object') g.vehicleExp = { btr80: 0 };
  if(!('currentVehicle' in g) || !VEHICLES[g.currentVehicle]) g.currentVehicle = 'btr80';
  if(!g.camo || typeof g.camo !== 'object') g.camo = {};
  if(!g.researchProgress || typeof g.researchProgress !== 'object') g.researchProgress = {};
  if(typeof g.globalExp !== 'number' || !isFinite(g.globalExp) || g.globalExp < 0) g.globalExp = 0;
  return g;
}

function _isVehicleFinished(vid){
  const v = VEHICLES[vid];
  if(!v) return false;
  if(!v.next || !v.next.length) return true;
  const g = _garageInitState();
  return v.next.every(function(n){ return g.ownedVehicles.indexOf(n) >= 0; });
}

function _garageAddVehicleExp(vid, exp){
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

function _garageAvailableExpFor(vid){
  const g = _garageInitState();
  if(!g.researchProgress) g.researchProgress = {};
  return Math.floor(g.researchProgress[vid] || 0);
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
  let ammoEq = 0;
  for(const k in state.inventory){
    const p = k.split('@');
    if(!AMMO[p[0]]) continue;
    ammoEq += (state.inventory[k] || 0) * (RARITY_MULT[p[1]] || 1);
  }
  if(ammoEq + 0.01 < cost.ammoValue) return false;
  return true;
}

function _consumeLiquorByValue(targetValue){
  const s = _gardenStorageInit();
  let remaining = targetValue;
  const order = ['破舊', '一般', '庫存', '精品', '傳奇'];
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

function _consumeAmmoByValue(targetValue){
  let remaining = targetValue;
  const order = ['破舊', '一般', '庫存', '精品', '傳奇'];
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

/* rev-fix-ammoeq-dup: 与 05-data-vehicles.js 的 vcAmmoEquivTotal 语义完全一致，改为 alias */
function _garageAmmoEquiv(){
  return (typeof vcAmmoEquivTotal === 'function') ? vcAmmoEquivTotal() : 0;
}
window._garageAmmoEquiv = _garageAmmoEquiv;

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
  for(const s of state.base.slots){
    if(s && s.id === 'garage'){ s.lv = Math.min(50, (s.lv || 1) + 1); break; }
  }
  if(typeof _radioEnsureInit === 'function'){
    const max = getBuildingLv('garage');
    if(state.radioUses < max) state.radioUses = max;
  }
  refreshPlayerStats();
  save();
  return true;
}

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
      if(fromGarage){
        const p = document.getElementById('garage-page');
        if(p){ p.innerHTML = _garageRenderHtml(); if(typeof _garageBind === 'function') _garageBind(); }
      }
    }
  };
}

/* ============== 頁面 ============== */
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
  if(typeof renderBase === 'function' && typeof currentTab !== 'undefined' && currentTab === 'base'){
    renderBase();
  }
}

function _garageGetResearchInfo(){
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

function _garageConfirmStation(){
  const g = _garageInitState();
  const cur = VEHICLES[g.currentVehicle];
  if(!cur) return;
  const stationLv = (typeof getBuildingLv === 'function') ? getBuildingLv('station') : 0;
  if(stationLv <= 0){
    const ft = el('div','modal-ft');
    ft.innerHTML = '<button class="btn primary" id="m-ok">知道了</button>';
    openModal({
      title: '尚未建造車站',
      body: '<div class="detail-sub">當前載具：' + cur.name + '</div>'
        + '<div style="font-size:12px;color:#e05252;line-height:1.6;margin:8px 0">請先在基地建造車站（需車場作為前置）</div>',
      footer: ft
    });
    ft.querySelector('#m-ok').onclick = closeModal;
    return;
  }
  const ft = el('div','modal-ft');
  ft.innerHTML = '<button class="btn primary" id="m-go">前往</button><button class="btn ghost" id="m-cancel">取消</button>';
  const body = '<div class="detail-sub">當前載具：' + cur.name + '</div>'
    + '<div style="font-size:12px;color:#ddd;line-height:1.6;margin:8px 0">是否前往車站配置車組與載員？</div>';
  openModal({ title: '前往車站', body: body, footer: ft });
  ft.querySelector('#m-cancel').onclick = closeModal;
  ft.querySelector('#m-go').onclick = function(){
    closeModal();
    if(typeof closeGaragePage === 'function') closeGaragePage();
    if(typeof openStationPage === 'function') openStationPage();
  };
}

function _splitVehicleWeapon(v){
  if(!v) return { mainGun: '-', machineGun: '-', special: '-' };
  const parts = (v.weapon || '').split(' + ').map(function(s){ return s.trim(); }).filter(Boolean);
  return {
    mainGun: parts[0] || '-',
    machineGun: parts[1] || '-',
    special: parts[2] || '-'
  };
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

function _armorRows(curGrid, tgtGrid){
  const ARMOR_PARTS = ['車體', '炮塔', '附加'];
  const CG = curGrid || [];
  const TG = tgtGrid || null;
  let out = '';
  for(let i = 0; i < ARMOR_PARTS.length; i++){
    const part = ARMOR_PARTS[i];
    const cv = CG[i] != null ? CG[i] : '—';
    let row = '<div class="garage-stat-row armor-row" title="' + part + ' 正/側/背 (mm)">';
    row += '<span class="k">' + part + '</span>';
    if(TG){
      const tv = TG[i] != null ? TG[i] : '—';
      row += '<span class="v-cur armor-val">' + cv + '</span>';
      row += '<span class="v-arrow">→</span>';
      row += '<span class="v-new armor-val' + (cv !== tv ? ' diff' : '') + '">' + tv + '</span>';
    } else {
      row += '<span class="v-cur-only armor-val">' + cv + '</span>';
    }
    row += '</div>';
    out += row;
  }
  return out;
}

function _spdText(v){
  if(!v) return '—';
  const f = (v.speedFwd != null) ? v.speedFwd : v.speedRoad;
  const r = (v.speedRev != null) ? v.speedRev : '—';
  if(f == null) return '—';
  return f + ' / ' + r + ' km/h';
}

function _spdRow(cur, tgt){
  const cv = _spdText(cur);
  const tv = tgt ? _spdText(tgt) : null;
  let h = '<div class="garage-stat-row" title="前進 / 倒車"><span class="k">速度</span>';
  if(tv !== null){
    h += '<span class="v-cur">' + cv + '</span>';
    h += '<span class="v-arrow">→</span>';
    h += '<span class="v-new' + (cv !== tv ? ' diff' : '') + '">' + tv + '</span>';
  } else {
    h += '<span class="v-cur-only">' + cv + '</span>';
  }
  h += '</div>';
  return h;
}

function _garageDetailHtml(cur, tgt, cu, mu){
  let h = '';
  const cw = _splitVehicleWeaponList(cur);
  const tw = tgt ? _splitVehicleWeaponList(tgt) : null;
  h += _garageDetailRowMulti('主炮', cw.mainGun, tw ? tw.mainGun : null);
  h += _garageDetailRowMulti('機槍', cw.machineGun, tw ? tw.machineGun : null);
  h += _garageDetailRow('特殊武器', cur.weaponSpecial || '無', tgt ? (tgt.weaponSpecial || '無') : null);
  h += _armorRows(cur.armorGrid, tgt ? tgt.armorGrid : null);
  h += _spdRow(cur, tgt);
  h += _garageDetailRow('支援', cur.supportDuration + 's', tgt ? tgt.supportDuration + 's' : null);
  if(cu != null && mu > 0){
    h += '<div class="garage-stat-row"><span class="k">電台</span><span class="v-cur-only">' + cu + ' / ' + mu + '</span></div>';
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
  const _globalExpVal = fmtNum(g.globalExp || 0);

  let h = '';
  h += '<div class="garage-main">';
  h += '<div class="garage-showcase" id="garage-showcase-img">';
  h += '<div class="garage-global-exp">🌐 ' + _globalExpVal + '</div>';
  h += '<img src="icons/vehicles/' + cur.id + '.png' + assetSuffix('icons/vehicles/' + cur.id + '.png') + '" alt="">';
  h += '<div class="garage-vehicle-name-bar">' + cur.name + '</div>';
  h += '</div>';

  h += '<div class="garage-bottom">';
  h += '<div class="garage-bottom-left">';
  h += _garageDetailHtml(cur, null, curUses, maxUses);
  h += '</div>';

  h += '<div class="garage-bottom-right">';
  if(research){
    h += '<div class="garage-research-img-wrap" id="garage-research-target" data-vid="' + research.targetId + '" style="cursor:pointer">';
    h += '<img src="icons/vehicles/' + research.targetId + '.png' + assetSuffix('icons/vehicles/' + research.targetId + '.png') + '" alt="">';
    h += '<div class="garage-research-name">' + tgt.name + '</div>';
    h += '</div>';
    const pct = research.need > 0 ? Math.min(100, Math.round(research.have / research.need * 100)) : 0;
    h += '<div class="garage-research-bar"><div class="fill" style="width:' + pct + '%"></div></div>';
    h += '<div class="garage-research-exp">' + fmtNum(research.have) + ' / ' + fmtNum(research.need) + '</div>';
    if(tgt && tgt.researchCost){
      const ammo = _garageAmmoEquiv();
      const liq = (typeof _gardenLiquorValue === 'function') ? _gardenLiquorValue() : 0;
      const _fAmmo = fmtNum(ammo);
      const _fAmmoMax = fmtNum(tgt.researchCost.ammoCount);
      const _fLiq = fmtNum(liq);
      const _fLiqMax = fmtNum(tgt.researchCost.liquor);
      h += '<div class="garage-req-row">';
      h += '<span class="' + (ammo >= tgt.researchCost.ammoCount ? 'ok' : 'bad') + '"><img src="icons/ammo/545.png' + assetSuffix('icons/ammo/545.png') + '" class="req-icon" alt=""> ' + _fAmmo + '/' + _fAmmoMax + '</span>';
      h += '<span class="' + (liq >= tgt.researchCost.liquor ? 'ok' : 'bad') + '"><img src="icons/garden/liquor.png' + assetSuffix('icons/garden/liquor.png') + '" class="req-icon" alt=""> ' + _fLiq + '/' + _fLiqMax + '</span>';
      h += '</div>';
    }
  } else {
    h += '<div class="garage-research-empty" id="garage-research-empty" style="color:#7a6f60">研發目標<br>未選定<br>點擊打開<br>科技樹</div>';
  }
  h += '</div>';
  h += '</div>';
  h += '</div>';

  h += '<div class="garage-dock" id="garage-dock">';
  h += '<div class="garage-dock-tabs">';
  const tabs = [{ k: 'all', n: '全部' }, { k: 'btr', n: '輪戰' }, { k: 't80', n: '坦克' }, { k: 'bmp', n: '步戰' }, { k: 'station', n: '車站 ▶︎' }];
  const curTab = window._garageFilter || 'all';
  for(const t of tabs){
    /* rev148: 「車站」為跳頁按鈕，綠底白字；永不套 .on（避免 .garage-tab.on 的 !important 覆蓋） */
    const _isStation148 = (t.k === 'station');
    const _onCls148 = _isStation148 ? 'station-tab-noactive' : (curTab === t.k ? 'on' : '');
    const _style148 = _isStation148
      ? ' style="display:flex;align-items:center;justify-content:center;background:#4caf50 !important;color:#fff !important;font-weight:bold;border-radius:4px;margin:2px 4px;line-height:1;border-bottom:0 !important"'
      : '';
    h += '<div class="garage-tab ' + _onCls148 + '" data-tab="' + t.k + '"' + _style148 + '>' + t.n + '</div>';
  }
  h += '</div>';
  h += '<div class="garage-dock-list" id="garage-dock-list"></div>';
  h += '</div>';

  return h;
}

function _renderGarageDockList(){
  const listEl = document.getElementById('garage-dock-list');
  if(!listEl) return;
  const g = _garageInitState();
  const filter = window._garageFilter || 'all';
  const research = _garageGetResearchInfo();
  const rTarget = research ? research.targetId : null;

  let ids = g.ownedVehicles.slice();
  if(filter !== 'all'){
    ids = ids.filter(function(id){ return VEHICLES[id].line === filter; });
  }

  let h = '';
  for(const vid of ids){
    const v = VEHICLES[vid];
    const owned = g.ownedVehicles.indexOf(vid) >= 0;
    const isCurrent = g.currentVehicle === vid;
    const isResearching = (rTarget === vid);

    let cls = 'garage-dock-card';
    if(isCurrent) cls += ' current';
    else if(owned) cls += ' owned';
    else if(isResearching) cls += ' researching';
    else cls += ' locked';

    h += '<div class="' + cls + '" data-vid="' + vid + '">';
    h += '<div class="gd-img"><img src="icons/vehicles/' + vid + '.png' + assetSuffix('icons/vehicles/' + vid + '.png') + '" alt=""></div>';
    h += '<div class="gd-name">' + v.name + '</div>';
    if(isResearching) h += '<div class="gd-mark">🔬</div>';
    else if(isCurrent) h += '<div class="gd-mark">✓</div>';
    h += '</div>';
  }
  listEl.innerHTML = h;

  if(window._garageScrollLeft !== undefined){
    listEl.scrollLeft = window._garageScrollLeft;
  }

  if(!listEl._wheelBound){
    listEl._wheelBound = true;
    listEl.addEventListener('wheel', function(e){
      if(e.deltaY !== 0){
        e.preventDefault();
        listEl.scrollLeft += e.deltaY;
      }
    }, { passive: false });
  }

  const cards = listEl.querySelectorAll('.garage-dock-card');
  for(let i = 0; i < cards.length; i++){
    (function(card){
      card.onclick = function(){
        const vid = card.dataset.vid;
        const owned = g.ownedVehicles.indexOf(vid) >= 0;
        if(owned){
          if(g.currentVehicle !== vid){
            g.currentVehicle = vid;
            save();
            const p = document.getElementById('garage-page');
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
}

function _garageBind(){
  const p = document.getElementById('garage-page');
  if(!p) return;

  const showcase = p.querySelector('#garage-showcase-img');
  if(showcase) showcase.onclick = function(){ _garageConfirmStation(); };

  const _rt = p.querySelector('#garage-research-target');
  if(_rt) _rt.onclick = function(){ _garageShowTechDetail(_rt.dataset.vid); };

  const _re = p.querySelector('#garage-research-empty');
  if(_re) _re.onclick = function(){ _garageOpenTechTree(); };

  const tabs = p.querySelectorAll('.garage-tab');
  for(let i = 0; i < tabs.length; i++){
    (function(t){
      t.onclick = function(){
        if(t.dataset.tab === 'station'){
          if(typeof openStationPage === 'function') openStationPage();
          return;
        }
        window._garageFilter = t.dataset.tab;
        const allTabs = p.querySelectorAll('.garage-tab');
        for(let j = 0; j < allTabs.length; j++) allTabs[j].classList.remove('on');
        t.classList.add('on');
        window._garageScrollLeft = 0;
        _renderGarageDockList();
      };
    })(tabs[i]);
  }

  _renderGarageDockList();
}

/* ============== 科技樹 ============== */
function _garageOpenTechTree(){
  /* rev-fix-tech-scrollbar: 隱藏滾動條但保持拖動 */
  if(!document.getElementById('wt-tech-scroll-style')){
    const _st = document.createElement('style');
    _st.id = 'wt-tech-scroll-style';
    _st.textContent = '.wt-tech-custom-scroll{scrollbar-width:none !important;-ms-overflow-style:none !important;}.wt-tech-custom-scroll::-webkit-scrollbar{display:none !important;width:0 !important;height:0 !important;}';
    document.head.appendChild(_st);
  }
  const NW = 100, NH = 64;
  const nodes = [
    { vid: 'btr80',  x: 140, y: 10 },
    { vid: 'btr80a', x: 20,  y: 90 },
    { vid: 'btr82',  x: 20,  y: 170 },
    { vid: 'btr82a', x: 20,  y: 250 },
    { vid: 'btr90',  x: 20,  y: 330 },
    { vid: 'bmp1',   x: 140, y: 90 },
    { vid: 'bmp1m',  x: 140, y: 170 },
    { vid: 'bmp2',   x: 140, y: 250 },
    { vid: 'bmp3',   x: 140, y: 330 },
    { vid: 'bmd4',   x: 140, y: 410 },
    { vid: 't80',    x: 260, y: 90 },
    { vid: 't80b',   x: 260, y: 170 },
    { vid: 't80bv',  x: 260, y: 250 },
    { vid: 't80u',   x: 260, y: 330 },
    { vid: 't80uk',  x: 260, y: 440 },
    { vid: 't80um',  x: 380, y: 440 }
  ];

  let svg = '<svg width="500" height="520" style="position:absolute;left:0;top:0;pointer-events:none" xmlns="http://www.w3.org/2000/svg">';
  svg += '<path d="M 190 74 L 190 80 L 70 80 L 70 90" stroke="#8a5f18" stroke-width="2" fill="none"/>';
  svg += '<line x1="190" y1="74" x2="190" y2="90" stroke="#8a5f18" stroke-width="2"/>';
  svg += '<path d="M 190 74 L 190 80 L 310 80 L 310 90" stroke="#8a5f18" stroke-width="2" fill="none"/>';
  svg += '<line x1="70" y1="154" x2="70" y2="170" stroke="#8a5f18" stroke-width="2"/>';
  svg += '<line x1="70" y1="234" x2="70" y2="250" stroke="#8a5f18" stroke-width="2"/>';
  svg += '<line x1="70" y1="314" x2="70" y2="330" stroke="#8a5f18" stroke-width="2"/>';
  svg += '<line x1="190" y1="154" x2="190" y2="170" stroke="#8a5f18" stroke-width="2"/>';
  svg += '<line x1="190" y1="234" x2="190" y2="250" stroke="#8a5f18" stroke-width="2"/>';
  svg += '<line x1="190" y1="314" x2="190" y2="330" stroke="#8a5f18" stroke-width="2"/>';
  svg += '<line x1="190" y1="394" x2="190" y2="410" stroke="#8a5f18" stroke-width="2"/>';
  svg += '<line x1="310" y1="154" x2="310" y2="170" stroke="#8a5f18" stroke-width="2"/>';
  svg += '<line x1="310" y1="234" x2="310" y2="250" stroke="#8a5f18" stroke-width="2"/>';
  svg += '<line x1="310" y1="314" x2="310" y2="330" stroke="#8a5f18" stroke-width="2"/>';
  svg += '<line x1="310" y1="394" x2="310" y2="440" stroke="#8a5f18" stroke-width="2"/>';
  svg += '<path d="M 310 404 L 430 404 L 430 440" stroke="#8a5f18" stroke-width="2" fill="none"/>';
  svg += '</svg>';

  const g = _garageInitState();
  const research = _garageGetResearchInfo();
  const researchId = research ? research.targetId : null;

  let nodesHtml = '';
  for(let i = 0; i < nodes.length; i++){
    const n = nodes[i];
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
      + '<div class="wt-node-img"><img draggable="false" src="icons/vehicles/' + n.vid + '.png' + assetSuffix('icons/vehicles/' + n.vid + '.png') + '" data-fallback="1" alt=""></div>'
      + '<div class="wt-node-name">' + v.name + '</div>'
      + '<div class="wt-node-mark">' + mark + '</div>'
      + '</div>';
  }

  const body = '<div class="wt-tech-custom-scroll" style="overflow:auto;-webkit-overflow-scrolling:touch;touch-action:pan-x pan-y;max-height:60vh;"><div style="position:relative; width:500px; height:520px; margin:0; padding:10px 0 10px 20px; box-sizing:border-box;">' + svg + nodesHtml + '</div></div>';

  const bd = openModal({ title: '科技樹', body: body });

  if(bd){
    bd.classList.add('wt-tech-modal');
    const scrollEl = bd.querySelector('.wt-tech-custom-scroll');
    if(scrollEl){
      scrollEl.addEventListener('dragstart', function(e){ e.preventDefault(); });
      scrollEl.addEventListener('dblclick', function(e){ e.preventDefault(); });

      let isDown = false, startX = 0, startY = 0, scrollLeft = 0, scrollTop = 0;
      let hasMoved = false;

      scrollEl.addEventListener('pointerdown', function(e){
        isDown = true;
        hasMoved = false;
        startX = e.clientX;
        startY = e.clientY;
        scrollLeft = scrollEl.scrollLeft;
        scrollTop = scrollEl.scrollTop;
      });

      scrollEl.addEventListener('pointermove', function(e){
        if(!isDown) return;
        const dx = e.clientX - startX, dy = e.clientY - startY;
        if(!hasMoved && (Math.abs(dx) > 5 || Math.abs(dy) > 5)){
          hasMoved = true;
          if(e.pointerType === 'mouse'){
            scrollEl.style.cursor = 'grabbing';
            try { scrollEl.setPointerCapture(e.pointerId); } catch(_){}
          }
        }
        if(hasMoved && e.pointerType === 'mouse'){
          if(e.cancelable) e.preventDefault();
          scrollEl.scrollLeft = scrollLeft - dx;
          scrollEl.scrollTop = scrollTop - dy;
        }
      });

      function endPan(e){
        if(!isDown) return;
        isDown = false;
        if(hasMoved){
          scrollEl.style.cursor = '';
          try { scrollEl.releasePointerCapture(e.pointerId); } catch(_){}
          setTimeout(function(){ hasMoved = false; }, 50);
        }
      }
      scrollEl.addEventListener('pointerup', endPan);
      scrollEl.addEventListener('pointercancel', endPan);

      scrollEl.addEventListener('click', function(e){
        if(hasMoved){
          e.preventDefault();
          e.stopPropagation();
        }
      }, true);
    }
  }

  const btns = bd.querySelectorAll('[data-tech-node]');
  for(let bi = 0; bi < btns.length; bi++){
    (function(btn){
      btn.onclick = function(){
        const vid = btn.getAttribute('data-tech-node');
        _garageShowTechDetail(vid);
      };
    })(btns[bi]);
  }
}

function _garageStartResearch(vid){
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
  g.researchTarget = vid;
  const need = v.researchCost.exp;
  if(!g.researchProgress) g.researchProgress = {};
  let prog = g.researchProgress[vid] || 0;
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
  if(typeof save === 'function') save();
  return { ok: true, progress: prog, need: need };
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

  let body = '';
  body += '<div class="garage-tech-detail-img-wrap">';
  body += '<img src="icons/vehicles/' + vid + '.png' + assetSuffix('icons/vehicles/' + vid + '.png') + '" alt="">';
  body += '<div class="garage-tech-detail-name">' + v.name + ' <span style="color:#7a6f60;font-weight:normal">Tier ' + v.tier + '</span></div>';
  body += '</div>';

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
    body += '<div class="tech-detail-status" style="color:#7ee07e">已研發</div>';
    body += '<button class="btn primary tech-detail-action" id="m-switch">切換</button>';
  } else if(!hasAllPrereq){
    const reqNames = prereqs.map(function(p){ return VEHICLES[p].name; }).join(' / ');
    body += '<div class="garage-tech-detail-col-title">研發需求</div>';
    body += '<div class="tech-detail-status" style="color:#e05252">需先研發<br>' + reqNames + '</div>';
  } else if(v.researchCost){
    const ammo = _garageAmmoEquiv();
    const liq = (typeof _gardenLiquorValue === 'function') ? _gardenLiquorValue() : 0;
    const prog = _garageAvailableExpFor(vid);
    const need = v.researchCost.exp;
    const expDone = prog >= need;
    const canBuy = expDone && ammo >= v.researchCost.ammoCount && liq >= v.researchCost.liquor;
    const isTarget = (g.researchTarget === vid);
    body += '<div class="garage-tech-detail-col-title">研發需求</div>';
    body += '<div class="tech-detail-row"><span class="k"><img src="icons/ammo/545.png' + assetSuffix('icons/ammo/545.png') + '" class="req-icon" alt=""> 彈藥</span><span class="v ' + (ammo >= v.researchCost.ammoCount ? 'ok' : 'bad') + '">' + Math.floor(ammo) + '/' + v.researchCost.ammoCount + '</span></div>';
    body += '<div class="tech-detail-row"><span class="k"><img src="icons/garden/liquor.png' + assetSuffix('icons/garden/liquor.png') + '" class="req-icon" alt=""> 私酒</span><span class="v ' + (liq >= v.researchCost.liquor ? 'ok' : 'bad') + '">' + Math.floor(liq) + '/' + v.researchCost.liquor + '</span></div>';
    body += '<div class="tech-detail-row"><span class="k">經驗</span><span class="v ' + (expDone ? 'ok' : 'bad') + '">' + prog + '/' + need + '</span></div>';
    body += '<div class="tech-detail-btn-col">';
    if(expDone){
      body += '<button class="btn primary tech-detail-action" id="m-buy"' + (canBuy ? '' : ' disabled') + '>購買</button>';
    } else if(isTarget){
      body += '<button class="btn tech-detail-action" disabled>研發中</button>';
    } else {
      body += '<button class="btn primary tech-detail-action" id="m-research" data-mode="start">研發</button>';
    }
    body += '</div>';
  } else {
    body += '<div class="garage-tech-detail-col-title">狀態</div>';
    body += '<div class="tech-detail-status" style="color:#7a6f60">—</div>';
  }
  body += '</div>';
  body += '</div>';

  const _ge = Math.floor(g.globalExp || 0);
  const _prog = _garageAvailableExpFor(vid);
  const _need = (v.researchCost && v.researchCost.exp) || 0;
  const _remain = Math.max(0, _need - _prog);
  const _maxT = Math.min(_remain, _ge);
  const _showTransfer = !owned && hasAllPrereq && !!v.researchCost && _ge > 0 && _prog < _need && _maxT > 0;
  if(_showTransfer){
    body += '<div class="garage-transfer-row" id="garage-transfer-row" style="margin-top:10px;flex-direction:column;align-items:stretch;gap:6px">';
    body += '<div style="display:flex;justify-content:space-between;align-items:baseline"><span style="color:#7a6f60;font-size:11px">🌐 全局經驗</span><span style="color:#a45ede;font-weight:bold;font-family:Menlo,Consolas,monospace;font-size:14px">' + _ge + '</span></div>';
    body += '<div class="garage-transfer-slider-wrap">';
    body += '<div class="garage-transfer-slider-info"><span>轉入數量</span><span><b id="gt-x">0</b> / ' + _maxT + '</span></div>';
    body += '<input type="range" id="gt-slider" min="0" max="' + _maxT + '" value="0">';
    body += '<div class="garage-transfer-slider-info"><span>轉入後全局經驗</span><b id="gt-after-ge">' + _ge + '</b></div>';
    body += '<div class="garage-transfer-slider-info"><span>轉入後研發進度</span><b id="gt-after-prog">' + Math.floor(_prog) + ' / ' + _need + '</b></div>';
    body += '<div class="garage-transfer-slider-actions"><button class="btn primary" id="gt-confirm" disabled>確認轉入</button></div>';
    body += '</div></div>';
  }

  const bd = openModal({ title: '載具詳情', body: body, onClose: function(){
    closeModal();
    _garageOpenTechTree();
  }});

  const closeX = bd.parentNode.querySelector('.modal-hd .x');
  if(closeX){
    closeX.textContent = '科技樹';
    closeX.className = 'btn btn-primary';
    closeX.style.cssText = 'background:#8a5f18;color:#fff;border-radius:4px;padding:4px 12px;font-size:11px;font-weight:bold;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;margin-left:8px;border:1px solid #e8a33d;';
  }

  function _refreshGaragePage(){
    const p = document.getElementById('garage-page');
    if(p){ p.innerHTML = _garageRenderHtml(); _garageBind(); }
  }

  const sw = bd.querySelector('#m-switch');
  if(sw) sw.onclick = function(){ g.currentVehicle = vid; save(); _garageShowTechDetail(vid); _refreshGaragePage(); };

  /* rev-fix-garage-dead-cancel: body 只生成 data-mode="start"，'cancel' 分支不可达，已删 */
  const rs = bd.querySelector('#m-research');
  if(rs && rs.getAttribute('data-mode') === 'start'){
    rs.onclick = function(){
      _garageStartResearch(vid);
      _garageShowTechDetail(vid);
      _refreshGaragePage();
    };
  }

  const buy = bd.querySelector('#m-buy');
  if(buy && !buy.disabled) buy.onclick = function(){
    const r = _garageResearch(vid);
    if(r && r.ok){ _garageShowTechDetail(vid); _refreshGaragePage(); }
    else if(typeof notify === 'function') notify(_garageResearchErrMsg(r));
  };

  if(_showTransfer){
    const slider = bd.querySelector('#gt-slider');
    const xEl = bd.querySelector('#gt-x');
    const afterGeEl = bd.querySelector('#gt-after-ge');
    const afterProgEl = bd.querySelector('#gt-after-prog');
    const confirmBtn = bd.querySelector('#gt-confirm');
    if(slider && confirmBtn){
      const _upd = function(){
        const x = parseInt(slider.value, 10) || 0;
        xEl.textContent = x;
        afterGeEl.textContent = _ge - x;
        afterProgEl.textContent = Math.floor(_prog + x) + ' / ' + _need;
        confirmBtn.disabled = (x <= 0);
      };
      slider.oninput = _upd;
      _upd();
      confirmBtn.onclick = function(){
        const x = parseInt(slider.value, 10) || 0;
        if(x <= 0) return;
        g.globalExp = Math.max(0, (g.globalExp || 0) - x);
        if(!g.researchProgress) g.researchProgress = {};
        g.researchProgress[vid] = (g.researchProgress[vid] || 0) + x;
        if(typeof save === 'function') save();
        _garageShowTechDetail(vid);
        _refreshGaragePage();
      };
    }
  }
}

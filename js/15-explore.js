/* v17.5 hotfix batch applied */

'use strict';

window.computeScreenMetrics = function(W, H){
  const mpp = 1.7 / (H * CHAR_HEIGHT_FACTOR);
  const cw = W * mpp;
  const sr = cw * (1 - EXPLORE_HERO_X_RATIO);
  return { metersPerPixel: mpp, canvasWidthWorld: cw, screenRightWorld: sr, bgPixelsPerMeter: 1 / mpp };
};

window._explore = {
  active: false, worldX: 0, mode: 'walk', nodes: [], totalLen: 0,
  region: null, routeIdx: 0, lastTick: 0, deadUntil: 0,
  combatEvent: null, _curNodeIdx: 0, _bgDirty: false,
  _lastBtrPhase: null, passengersFollowing: [],
  _slot0: 0, _slot1: 1, _lastRotate: 0,
  evacuatingPassengers: false, evacuateStartAt: 0,
  _currentSpeed: 0, corpses: [], _lootingUntil: 0, _corpseLootTriggered: false,
  _pendingLootEvent: null, _lastSaveAt: 0
};

const RADIO_COOLDOWN_MS = 1 * 60 * 1000;

/* ===== getActiveRegions：舊 09-base.js 遺漏，補在此處確保 15-explore 執行時已定義 ===== */
window.getActiveRegions = function(){
  const l = state.preferences.regions.filter(function(r){
    return REGIONS[r] && (!REGIONS[r].needUnlock || state.unlockedRegions.includes(r));
  });
  if(l.length) return l;
  for(const k in REGIONS){
    if(!REGIONS[k].needUnlock || state.unlockedRegions.includes(k)) return [k];
  }
  return ['廢棄工廠'];
};

function _fallbackEnemy(){
  return {
    eid: 'raider', rarity: '一般', hp: 45, maxHp: 45, armor: 0, maxArmor: 0, armorLevel: 3,
    dmg: 22, penMM: 12,
    primaryWeapon: { id: 'aks74u', rarity: '一般', ammoId: '5.45_ps', ammoCount: 30 },
    secondaryWeapon: null, grenade: null,
    hasRPG: false, rpgAmmo: 0,
    helmet: 'ssh68', body: 'paca',
    detectDist: 80, hitBase: 0.55, worldX: 0
  };
}

function _genMap(region, pi){
  const rs = ROUTES[region];
  if(!rs || !rs[pi]) return { nodes: [], totalLen: 0 };
  const path = rs[pi];
  const nodes = [];
  let cur = 0;
  const _indoorR = { '廢棄工廠':1, '廢棄實驗室':1, '廢土核心':1 };
  const _outK = /公路|車隊|加油站|收費站|隧道口|集結|小路|農舍|涵洞|山脊|鐵道|信號塔|貨運|灘頭|枯樹林|泥沼|廢船|祭壇|沼心|腐水|孢子|沉沒|外圍|哨塔|高架|通風井|管道區|反應爐|核心|熔爐|卸貨|裝卸|車間|鍋爐|儲油|油罐/;
  const _inK = /室|門|廳|房|庫|間|井|槽|廊|梯|通道|管道|隧道|檢修|排水|維修|動力|主控|樣本|更衣|消毒|觀察|儲藏|冷凍|動物|電梯|接待/;
  const _base = region.replace(/II$/,'');
  for(let i = 0; i < path.nodes.length; i++){
    const name = path.nodes[i];
    let indoor = !!_indoorR[_base];
    if(_outK.test(name)) indoor = false;
    if(_inK.test(name)) indoor = true;
    const len = indoor ? (30 + Math.random() * 20) : (100 + Math.random() * 50);
    const sx = cur, ex = cur + len;
    const evs = [];
    const evCount = Math.max(1, Math.round(len / 24.5));
    const margin = 3;
    const span = Math.max(1, len - margin * 2);
    const base = span / evCount;
    for(let k = 0; k < evCount; k++){
      let pos = sx + margin + base * (k + 0.5);
      let jit = (Math.random() - 0.5) * base * 0.6;
      const lim = Math.abs(base * 0.3);
      if(jit > lim) jit = lim;
      else if(jit < -lim) jit = -lim;
      pos = Math.max(sx + 2, Math.min(ex - 2, pos + jit));
      const r = Math.random();
      let t = 'empty';
      if(r < 0.6) t = 'combat';
      else if(r < 0.85) t = 'search';
      const e = { worldX: pos, type: t, cleared: false, content: null };
      if(t === 'combat'){
        const tier = region.endsWith('II') ? 2 : 1;
        const n = (window._enemyCountForRegion ? window._enemyCountForRegion(region) : (1 + Math.floor(Math.random() * 3)));
        e.content = [];
        for(let m = 0; m < n; m++){
          try {
            const inst = (typeof generateEnemyInstance === 'function') ? generateEnemyInstance(pick(REGIONS[region].enemies), tier) : null;
            if(inst) e.content.push(inst);
          } catch(x){}
        }
        if(!e.content.length) e.content.push(_fallbackEnemy());
      } else if(t === 'search'){
        e.content = [];
        const n2 = 1 + Math.floor(Math.random() * 3);
        for(let m2 = 0; m2 < n2; m2++){
          const d = rollRegionDrop(region);
          if(d) e.content.push({ id: d.id, rarity: d.rarity, count: 1 + Math.floor(Math.random() * 3) });
        }
      }
      evs.push(e);
    }
    nodes.push({ idx: i, name: name, startX: sx, endX: ex, events: evs });
    cur = ex;
  }
  return { nodes: nodes, totalLen: cur };
}

function _ensureES(region, ri){
  if(!state.explore) state.explore = {};
  const k = region + '#' + ri;
  let ex = state.explore[k];
  if(!ex || !ex.nodes || !ex.nodes.length){
    const m = _genMap(region, ri);
    ex = { nodes: m.nodes, totalLen: m.totalLen, worldX: 0, routeIdx: ri };
    state.explore[k] = ex;
  }
  return ex;
}

function _getPlayerWalkSpeed(){
  const _w = (typeof getTotalWeight === 'function') ? getTotalWeight() : 0;
  const _free = (typeof WEIGHT_FREE_KG !== 'undefined') ? WEIGHT_FREE_KG : 20;
  const _pen = (typeof WEIGHT_PENALTY_PER_KG !== 'undefined') ? WEIGHT_PENALTY_PER_KG : 0.05;
  const _extra = Math.max(0, _w - _free);
  return 1.4 / (1 + _extra * _pen);
}

function _getVSpd(vid){
  let s = 80;
  if(typeof VEHICLES !== 'undefined' && VEHICLES[vid] && VEHICLES[vid].speedRoad) s = VEHICLES[vid].speedRoad;
  if(typeof hasCrewTalent === 'function' && hasCrewTalent('driver', 'driver_instinct')) s *= 1.10;
  return s / 3.6;
}

function _computeTS(now){
  const b = window.BTRSupport;
  if(!b || !b.active) return 1.4;
  const ph = b.phase;
  const g = (typeof _garageInitState === 'function') ? _garageInitState() : null;
  const vid = g ? g.currentVehicle : 'btr80';
  const vs = _getVSpd(vid);
  if(ph === 'center') return vs;
  if(ph === 'support') return vs;
  return 1.4;
}

function _curNodeIdx(){
  const ex = window._explore;
  for(let i = 0; i < ex.nodes.length; i++){
    if(ex.worldX >= ex.nodes[i].startX && ex.worldX < ex.nodes[i].endX) return i;
  }
  return Math.max(0, ex.nodes.length - 1);
}

function _nextEvent(){
  const ex = window._explore;
  let best = null;
  for(let i = 0; i < ex.nodes.length; i++){
    for(let j = 0; j < ex.nodes[i].events.length; j++){
      const ev = ex.nodes[i].events[j];
      if(ev.cleared) continue;
      const d = ev.worldX - ex.worldX;
      if(d < -0.5) continue;
      if(!best || d < best._d){ best = ev; best._d = d; }
    }
  }
  return best;
}

/* ============== 背景 ============== */
function _renderBg(){
  const ex = window._explore;
  const idx = _curNodeIdx();
  const node = ex.nodes[idx];
  if(!node) return;
  const _pathNodes = (ROUTES[ex.region] && ROUTES[ex.region][ex.routeIdx]) ? ROUTES[ex.region][ex.routeIdx].nodes : null;
  const _maxIdx = _pathNodes ? (_pathNodes.length - 1) : node.idx;
  const _safeIdx = Math.min(Math.max(0, node.idx), _maxIdx);
  const key = REGION_KEYS[ex.region.replace(/II$/,'')] + '_r' + (ex.routeIdx || 0) + '_n' + _safeIdx;
  const url = "url('images/bg/" + key + '.png' + (typeof assetSuffix === 'function' ? assetSuffix() : '') + "')";
  const ls = document.querySelectorAll('#zone1 .bg-layer');
  for(let i = 0; i < ls.length; i++) ls[i].style.backgroundImage = url;
  const t = document.querySelector('#zone1 .zone-title');
  if(t) t.textContent = '🧭 ' + ex.region.replace(/II$/,' II') + ' · ' + node.name;
  ex._bgDirty = false;
}

function _updateBgTransform(){
  const z1 = document.getElementById('zone1');
  if(!z1) return;
  const track = z1.querySelector('.bg-track');
  if(!track) return;
  const ex = window._explore;
  const sm = computeScreenMetrics(z1.clientWidth, z1.clientHeight);
  const ppm = sm.bgPixelsPerMeter;
  const cw = z1.clientWidth;
  if(track.style.animation !== 'none') track.style.animation = 'none';
  track.style.transform = 'translateX(' + (-((ex.worldX * ppm) % cw)) + 'px)';
}

const _bgPreloadCache = new Set();
function preloadExploreBackgrounds(){
  let queued = 0;
  for(const region in REGIONS){
    const key = REGION_KEYS[region.replace(/II$/,'')];
    if(!key) continue;
    const routes = ROUTES[region];
    if(!routes) continue;
    for(let r = 0; r < routes.length; r++){
      const route = routes[r];
      if(!route || !route.nodes) continue;
      for(let n = 0; n < route.nodes.length; n++){
        const url = 'images/bg/' + key + '_r' + r + '_n' + n + '.png' + assetSuffix();
        if(_bgPreloadCache.has(url)) continue;
        _bgPreloadCache.add(url);
        const img = new Image();
        img.src = url;
        queued++;
      }
    }
  }
  return queued;
}

/* ============== 伴隨載員 ============== */
function _updatePT(){
  const ex = window._explore;
  const l = ex.passengersFollowing || [];
  if(!l.length){ ex._rotationOffset = 0; ex._lastRotateAt = 0; return; }
  const _nowMs = Date.now();
  const _c = window._combat;
  const _inCombat = !!(_c && _c.active);
  const _alliesBySrvId = {};
  if(_inCombat){
    for(let i = 1; i < _c.allies.length; i++){
      const a = _c.allies[i];
      if(a.isPassenger && a.srv) _alliesBySrvId[a.srv.id] = a;
    }
  }
  const aliveIds = [];
  const idToIdx = {};
  for(let i = 0; i < l.length; i++){
    const s = l[i];
    if(!s.srv) continue;
    if(s._retreating) continue;
    if(s.srv._injuredDown) continue;
    if(typeof s.srv.hp === 'number' && s.srv.hp <= 0) continue;
    if(s.srv.injuredUntil && s.srv.injuredUntil > _nowMs) continue;
    if(_inCombat && _alliesBySrvId[s.srv.id]){
      const a = _alliesBySrvId[s.srv.id];
      if(a._injuredDown || a.hp <= 0) continue;
    }
    aliveIds.push(s.srv.id);
    idToIdx[s.srv.id] = i;
  }
  const n = aliveIds.length;
  if(!n){ ex._rotationOffset = 0; ex._lastRotateAt = 0; return; }
  if(typeof ex._rotationOffset !== 'number' || ex._rotationOffset < 0 || ex._rotationOffset >= n){
    ex._rotationOffset = 0;
  }
  if(n >= 2){
    const nowPerf = performance.now();
    if(!ex._lastRotateAt) ex._lastRotateAt = nowPerf;
    if(nowPerf - ex._lastRotateAt >= 10000){
      ex._lastRotateAt = nowPerf;
      ex._rotationOffset = (ex._rotationOffset + 1) % n;
    }
  }
  for(let j = 0; j < n; j++){
    const id = aliveIds[(j + ex._rotationOffset) % n];
    const idx = idToIdx[id];
    if(idx == null) continue;
    if(j === 0) l[idx].targetX = 0.35;
    else if(j === 1) l[idx].targetX = 0.15;
    else l[idx].targetX = -0.12 - 0.12 * (j - 2);
  }
  for(let i2 = 0; i2 < l.length; i2++){
    if(l[i2]._retreating){
      if(typeof l[i2].targetX !== 'number' || l[i2].targetX < 1.8){
        l[i2].targetX = 1.8 + i2 * 0.05;
      }
    }
  }
}

function _disembark(){
  const ex = window._explore;
  if(!ex.passengersFollowing) ex.passengersFollowing = [];
  const _oldList = ex.passengersFollowing.slice();
  for(let i = 0; i < _oldList.length; i++){
    const it = _oldList[i];
    if(!it._retreating){
      it._retreating = true;
      it._retreatSpeed = true;
      it.targetX = 1.8 + i * 0.05;
    }
  }
  const _retreatingList = _oldList.filter(function(it){ return it._retreating; });
  const g = (typeof _garageInitState === 'function') ? _garageInitState() : null;
  const vid = g ? g.currentVehicle : 'btr80';
  const cap = (window.CARRIER_CAPACITY && window.CARRIER_CAPACITY[vid]) ? window.CARRIER_CAPACITY[vid] : 0;
  if(cap <= 0){
    ex.passengersFollowing = _retreatingList;
    ex._rotationOffset = 0;
    ex._lastRotateAt = 0;
    return;
  }
  const st = state.station;
  if(!st || !Array.isArray(st.passengers)){
    ex.passengersFollowing = _retreatingList;
    ex._rotationOffset = 0;
    ex._lastRotateAt = 0;
    return;
  }
  const _nowMs = Date.now();
  const _newList = _retreatingList.slice();
  let _newCount = 0;
  for(let i = 0; i < st.passengers.length; i++){
    if(_newCount >= cap) break;
    const p = st.passengers[i];
    const srv = state.servants.find(function(s){ return s.id === p.srvId; });
    if(!srv) continue;
    if(srv.injuredUntil && srv.injuredUntil > _nowMs) continue;
    if(typeof srv.hp === 'number' && srv.hp <= 0) continue;
    if(srv._injuredDown) srv._injuredDown = false;
    let _already = false;
    for(let j = 0; j < _retreatingList.length; j++){
      if(_retreatingList[j].srv && _retreatingList[j].srv.id === srv.id){ _already = true; break; }
    }
    if(_already) continue;
    _newList.push({
      srv: srv, p: p,
      screenX: 0.35 + _newCount * 0.01,
      targetX: 0.35,
      animFrame: 0, animNext: 0, fadeIn: 1,
      clipH: 0,
      _spawnAt: performance.now() + _newCount * 100
    });
    _newCount++;
  }
  ex.passengersFollowing = _newList;
  ex._rotationOffset = 0;
  ex._lastRotateAt = 0;
  ex.evacuatingPassengers = false;
  _updatePT();
  for(let i = 0; i < ex.passengersFollowing.length; i++){
    const it = ex.passengersFollowing[i];
    if(!it._retreating) it.screenX = it.targetX;
  }
}

function _evac(){
  const ex = window._explore;
  if(!ex.passengersFollowing || !ex.passengersFollowing.length) return;
  if(ex.evacuatingPassengers) return;
  ex.evacuatingPassengers = true;
  ex.evacuateStartAt = performance.now();
  for(let i = 0; i < ex.passengersFollowing.length; i++){
    const it = ex.passengersFollowing[i];
    if(!it._retreating){
      it._retreating = true;
      it._retreatSpeed = true;
    }
    it.targetX = 1.8 + i * 0.05;
  }
}

function _cleanPC(){
  const fx = document.getElementById('explore-fx');
  if(fx && fx._pc){
    for(const k in fx._pc){ try { fx._pc[k].remove(); } catch(e){} }
    fx._pc = {};
  }
}

function _drawP(fx, key, px, fxH, item, evac, now, animOverride, legOverride){
  const cw = fxH * 1.2;
  const chh = fxH;
  let cvs = fx._pc[key];
  if(!cvs){
    cvs = document.createElement('canvas');
    cvs.width = Math.round(cw * 2);
    cvs.height = Math.round(chh * 2);
    cvs.style.cssText = 'position:absolute;bottom:0;z-index:11;pointer-events:none;width:' + cw + 'px;height:' + chh + 'px;';
    fx.appendChild(cvs);
    fx._pc[key] = cvs;
  }
  cvs.style.left = (px - cw / 2) + 'px';
  const ctx = cvs.getContext('2d');
  ctx.setTransform(2, 0, 0, 2, 0, 0);
  ctx.clearRect(0, 0, cw, chh);
  if(typeof _raidDrawHuman !== 'function') return;
  const p = item.p;
  const eq = { head: p.helmet || null, top: p.body || null, primary: p.primaryWeapon || null };
  const eqR = { head: p.helmetRarity || '一般', top: p.bodyRarity || '一般', primary: p.primaryWeaponRarity || '一般' };
  const wps = p.primaryWeapon ? 'primary' : null;
  const ex = window._explore;
  const _looting = (ex && ex._lootingUntil > 0 && now < ex._lootingUntil);
  const _exSpeed = (ex && typeof ex._currentSpeed === 'number') ? ex._currentSpeed : 0;
  const worldMoving = _exSpeed > 0.5 && !_looting;
  const _slotMoving = Math.abs(item.targetX - item.screenX) > 0.005 && !_looting;
  const moving = _slotMoving || worldMoving;
  let animN;
  if(animOverride){ animN = animOverride; }
  else if(moving){ animN = evac ? 'run' : 'walk'; }
  else { animN = 'idle'; }
  if(!item.animStart || item._lastAnimN !== animN){
    item.animStart = now;
    item._lastAnimN = animN;
  }
  const _animFrame = (typeof computeAnimFrame === 'function') ? computeAnimFrame(animN, item.animStart, now) : 0;
  item.animFrame = _animFrame;
  const sc = chh * CHAR_HEIGHT_FACTOR / 386;
  if(item.fadeIn < 1) item.fadeIn = Math.min(1, (item.fadeIn || 0) + 0.03);
  if(item.clipH === undefined) item.clipH = 1;
  else if(item.clipH < 1 && typeof item._spawnAt === 'number'){
    const _elapsed = now - item._spawnAt;
    if(_elapsed >= 600) item.clipH = 1;
    else if(_elapsed <= 0) item.clipH = 0;
    else item.clipH = _elapsed / 600;
  }
  ctx.save();
  ctx.globalAlpha = item.fadeIn;
  if(item.clipH < 1){
    ctx.beginPath();
    ctx.rect(0, 0, cw, chh * item.clipH);
    ctx.clip();
  }
  if(animN === 'dead'){
    ctx.save();
    ctx.translate(cw / 2 - 193 * sc, chh - 10 - 68 * sc);
    ctx.rotate(Math.PI / 2);
    ctx.scale(sc, sc);
    ctx.translate(-200, -515);
    const anim = GAME_ANIMS.idle;
    const B = { x: 30, y: 30, w: 340, h: 460 };
    const units = [];
    for(const L of GAME_LAYERS){ units.push({ z: L.z, kind:'layer', layer: L }); }
    if(eq.head && typeof HEAD_ARMOR_LAYOUT !== 'undefined'){
      const cfg = HEAD_ARMOR_LAYOUT[eq.head] || HERO_VISIBLE_EQ.head;
      const layerDef = GAME_LAYERS.find(function(l){ return l.id === cfg.layer; });
      if(layerDef){
        const img = getHeroImg('icons/items/' + resolveIconId(eq.head) + '.png');
        units.push({ z: layerDef.z + 0.5, kind:'eq', layerId: cfg.layer, ox: cfg.ox, oy: cfg.oy, scale: cfg.scale, rotation: cfg.rotation, img });
      }
    }
    if(eq.top && typeof getTopCfg === 'function'){
      const cfg = getTopCfg(eq.top);
      const layerDef = GAME_LAYERS.find(function(l){ return l.id === cfg.layer; });
      if(layerDef){
        const img = getHeroImg('icons/items/' + resolveIconId(eq.top) + '.png');
        units.push({ z: layerDef.z + 0.5, kind:'eq', layerId: cfg.layer, ox: cfg.ox, oy: cfg.oy, scale: cfg.scale, rotation: cfg.rotation, img });
      }
    }
    if(wps && eq[wps] && typeof getWeaponCfg === 'function'){
      const cfg = getWeaponCfg(wps, eq[wps]);
      if(cfg){
        const layerDef = GAME_LAYERS.find(function(l){ return l.id === cfg.layer; });
        if(layerDef){
          const img = getHeroImg('icons/items/' + resolveIconId(eq[wps]) + '.png');
          units.push({ z: layerDef.z - 0.5, kind:'eq', layerId: cfg.layer, ox: cfg.ox, oy: cfg.oy, scale: cfg.scale, rotation: cfg.rotation, img, trim: cfg.trim });
        }
      }
    }
    units.sort(function(a,b){ return a.z - b.z; });
    for(const u of units){
      if(u.kind === 'layer') drawBodyLayer(ctx, u.layer, B, anim, 0);
      else drawEqLayer(ctx, u, B, anim, 0);
    }
    ctx.restore();
  } else {
    _raidDrawHuman(ctx, cw / 2, chh * 0.95, sc, eq, eqR, animN, item.animFrame % 8, wps, item.srv ? item.srv.type : null, false, false, null, true, legOverride || null);
  }
  ctx.restore();
}

function _renderPass(now){
  const ex = window._explore;
  if(!ex.passengersFollowing) ex.passengersFollowing = [];
  const _c = window._combat;
  const _inCombat = !!(_c && _c.active);
  const _alliesBySrvId = {};
  if(_inCombat){
    for(let i = 1; i < _c.allies.length; i++){
      const a = _c.allies[i];
      if(a.isPassenger && a.srv) _alliesBySrvId[a.srv.id] = a;
    }
  }
  const _nowMsCheck = Date.now();
  const _checkDown = function(it){
    if(!it.srv) return false;
    if(it.srv._injuredDown) return true;
    if(typeof it.srv.hp === 'number' && it.srv.hp <= 0) return true;
    if(it.srv.injuredUntil && it.srv.injuredUntil > _nowMsCheck) return true;
    if(_inCombat && _alliesBySrvId[it.srv.id]){
      const a = _alliesBySrvId[it.srv.id];
      if(a._injuredDown || a.hp <= 0) return true;
    }
    return false;
  };
  window._checkDownFn = _checkDown;
  const _stationPass = (state.station && Array.isArray(state.station.passengers)) ? state.station.passengers : [];
  ex.passengersFollowing = ex.passengersFollowing.filter(function(item){
    if(!item.srv) return false;
    const _s = state.servants.find(function(s){ return s.id === item.srv.id; });
    if(!_s) return false;
    const _hasP = _stationPass.some(function(p){ return p.srvId === item.srv.id; });
    if(!_hasP) return false;
    const _down = _checkDown(item);
    if(_down){ if(item.screenX < -0.3) return false; return true; }
    if(item._retreating){ if(item.screenX > 1.2) return false; return true; }
    return true;
  });
  const list = ex.passengersFollowing;
  const fx = document.getElementById('explore-fx');
  if(!fx) return;
  if(!list.length){ _cleanPC(); return; }
  const fxW = fx.clientWidth, fxH = fx.clientHeight;
  if(!fx._pc) fx._pc = {};
  _updatePT();
  const sm = computeScreenMetrics(fxW, fxH);
  const dtS = (now - (ex._lastPR || now)) / 1000;
  ex._lastPR = now;
  const _walkStep = _getPlayerWalkSpeed() * sm.bgPixelsPerMeter / fxW * dtS;
  const _worldStep = (ex._currentSpeed || 0) * sm.bgPixelsPerMeter / fxW * dtS;
  const _looting = (ex._lootingUntil > 0 && now < ex._lootingUntil);
  const _nowWall = Date.now();
  for(let k = 0; k < list.length; k++){
    const s = list[k];
    if(_checkDown(s)){ s.screenX -= _worldStep; continue; }
    if(s._retreating){
      const diff = s.targetX - s.screenX;
      if(diff > 0) {
        const _dtS = Math.min(0.1, dtS);
        const _evacStep = (0.3 * _dtS) + _worldStep;
        s.screenX += _evacStep;
      }
      continue;
    }
    if(s.srv && s.srv._standUntil && _nowWall < s.srv._standUntil) continue;
    if(_looting) continue;
    const diff = s.targetX - s.screenX;
    if(Math.abs(diff) <= _walkStep) s.screenX = s.targetX;
    else s.screenX += Math.sign(diff) * _walkStep;
  }
  const _nowRp = Date.now();
  for(let d = 0; d < list.length; d++){
    const it = list[d];
    if(it.screenX > 1.15 || it.screenX < -0.3) continue;
    const _isDown = _checkDown(it);
    if(_isDown){
      _drawP(fx, 'p' + d, it.screenX * fxW, fxH, it, false, now, 'dead', null);
      continue;
    }
    let _animO = null;
    let _legO = null;
    let _animStartOverride = null;
    const _perfNow = performance.now();
    if(_inCombat && it.srv && _alliesBySrvId[it.srv.id]){
      const a = _alliesBySrvId[it.srv.id];
      if(a._injuredDown || a.hp <= 0){
        _animO = 'dead';
      } else if(a._reloadEnd && _perfNow < a._reloadEnd){
        _animO = 'reload';
        _animStartOverride = a._reloadAnimStart || _perfNow;
      } else if(a._fireAnimUntil && a._fireAnimUntil > _perfNow && a.weapon && a.weapon.id){
        _animO = 'fire_primary';
        _animStartOverride = a._fireAnimStart || _perfNow;
      }
      /* rev-fix-leg: 與玩家一致，fire/reload 期間不使用 legOverride，腿恆為 0 */
      /* _standStart/_standUntil 仍保留給下方 idle 過渡邏輯使用 */
    }
    if(!_animO && it.srv && it.srv._standUntil && _nowRp < it.srv._standUntil && it.srv._standStart != null){
      _animO = 'idle';
      const _t = Math.max(0, Math.min(1, (_nowRp - it.srv._standStart) / Math.max(1, it.srv._standUntil - it.srv._standStart)));
      const _walkAnim = GAME_ANIMS.walk;
      const _wl = _walkAnim.keys;
      const _wf = (it.animFrame || 0) % _walkAnim.frameCount;
      _legO = {
        right_leg: { rot: (_wl.right_leg[_wf] ? _wl.right_leg[_wf].rot : 0) * (1 - _t) },
        left_leg: { rot: (_wl.left_leg[_wf] ? _wl.left_leg[_wf].rot : 0) * (1 - _t) }
      };
    }
    if((_animO === 'fire_primary' || _animO === 'reload') && _animStartOverride){
      it.animStart = _animStartOverride;
      it._lastAnimN = _animO;
    }
    const _evac = it._retreating || ex.evacuatingPassengers;
    _drawP(fx, 'p' + d, it.screenX * fxW, fxH, it, _evac, now, _animO, _legO);
  }
  for(const kk in fx._pc){
    const idx = parseInt(kk.substring(1), 10);
    if(isNaN(idx) || idx >= list.length || list[idx].screenX > 1.15 || list[idx].screenX < -0.3){
      try { fx._pc[kk].remove(); } catch(e){}
      delete fx._pc[kk];
    }
  }
  const z1El = document.getElementById('zone1');
  let _leftBox = document.getElementById('passenger-left-explore');
  if(!_leftBox && z1El){
    _leftBox = document.createElement('div');
    _leftBox.id = 'passenger-left-explore';
    _leftBox.style.cssText = 'position:absolute;top:36px;left:8px;width:48px;pointer-events:none;z-index:22;display:flex;flex-direction:column;gap:5px;';
    z1El.appendChild(_leftBox);
  }
  if(_leftBox){
    const _outside = list.filter(function(item){
      if(!item.srv) return false;
      if(item._retreating) return false;
      if(_checkDown(item)) return false;
      return item.screenX < -0.05;
    });
    let _lhtml = '';
    for(let _j = 0; _j < _outside.length; _j++){
      const _item = _outside[_j];
      const _d = Math.abs((_item.screenX - EXPLORE_HERO_X_RATIO) * 10);
      const _dTxt = _d < 1 ? _d.toFixed(1) : Math.round(_d);
      const _maxHp = (typeof servantMaxHp === 'function') ? servantMaxHp(_item.srv) : 100;
      let _hp = (typeof _item.srv.hp === 'number') ? _item.srv.hp : _maxHp;
      if(_hp < 0) _hp = 0;
      const _arc = Math.round(Math.max(0, Math.min(1, _hp / _maxHp)) * 360);
      const _rc = {'破舊':'#b87333','一般':'#e0e0e0','庫存':'#4caf50','精品':'#2196f3','傳奇':'#ffb300'}[_item.srv.rarity] || '#4caf50';
      _lhtml += '<div style="width:44px;height:44px;border-radius:50%;border:2px solid ' + _rc + ';background:conic-gradient(#4caf50 0deg ' + _arc + 'deg, rgba(20,18,16,0.95) ' + _arc + 'deg 360deg);box-sizing:border-box;position:relative"><div style="position:absolute;inset:4px;border-radius:50%;background:rgba(14,12,10,0.95);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:bold;color:' + _rc + '">' + _dTxt + '</div></div>';
    }
    _leftBox.innerHTML = _lhtml;
  }
}

/* ============== 屍體 ============== */
function _startCorpses(enemies, enemyWX){
  const ex = window._explore;
  const fx = document.getElementById('explore-fx');
  if(!fx || !enemies) return;
  for(let i = 0; i < enemies.length; i++){
    const r = (typeof _renderEnemyCorpseCanvas === 'function') ? _renderEnemyCorpseCanvas(enemies[i], fx.clientHeight) : null;
    if(!r) continue;
    const w = document.createElement('div');
    w.style.cssText = 'position:absolute;bottom:0;z-index:13;pointer-events:none;will-change:left;width:' + r.drawW + 'px;height:' + r.drawH + 'px;';
    r.canvas.style.cssText = 'width:100%;height:100%;display:block;';
    w.appendChild(r.canvas);
    fx.appendChild(w);
    ex.corpses.push({ wrap: w, drawW: r.drawW, drawH: r.drawH, worldX: ex.worldX + (enemyWX[i] || 0) });
  }
}

function _updateCorpsesLayout(){
  const ex = window._explore;
  if(!ex.corpses || !ex.corpses.length) return;
  const z1 = document.getElementById('zone1'), fx = document.getElementById('explore-fx');
  if(!z1 || !fx) return;
  const sm = computeScreenMetrics(z1.clientWidth, z1.clientHeight);
  const ppm = sm.bgPixelsPerMeter;
  const px = fx.clientWidth * EXPLORE_HERO_X_RATIO;
  for(let i = ex.corpses.length - 1; i >= 0; i--){
    const c = ex.corpses[i];
    const left = px + (c.worldX - ex.worldX) * ppm - c.drawW / 2;
    c.wrap.style.left = left + 'px';
    if(left + c.drawW < -50){
      try { c.wrap.remove(); } catch(e){}
      ex.corpses.splice(i, 1);
    }
  }
}

function _lootSearch(ev){
  if(!ev.content)return;
  for(var i=0;i<ev.content.length;i++){var it=ev.content[i];if(it&&it.id)invAdd(it.id,it.rarity,it.count);}
  if(typeof pushLog==='function')pushLog('<span class="pl">玩家</span> 搜獲 '+ev.content.map(function(l){return fmtItemSpan(l.id,l.rarity,l.count);}).join('、'),ev.content,'explore');
}

function _lootVictory(ev){
  if(!ev.content) return;
  const got = [];
  for(let i = 0; i < ev.content.length; i++){
    const lo = (typeof rollEnemyLoot === 'function') ? rollEnemyLoot(ev.content[i]) : [];
    for(let j = 0; j < lo.length; j++){
      invAdd(lo[j].id, lo[j].rarity, lo[j].count);
      got.push(lo[j]);
    }
  }
  if(got.length && typeof pushLog === 'function'){
    pushLog('<span class="pl">玩家</span> 拾取 ' + got.map(function(l){ return fmtItemSpan(l.id, l.rarity, l.count); }).join('、'), got, 'explore');
  }
}

/* ============== 死亡洗牌 ============== */
function _shuffle(){
  const ex = window._explore;
  const pool = [];
  for(let i = 0; i < ex.nodes.length; i++){
    for(let j = 0; j < ex.nodes[i].events.length; j++){
      const ev = ex.nodes[i].events[j];
      if(!ev.cleared && ev.content){
        for(let k = 0; k < ev.content.length; k++) pool.push(ev.content[k]);
        ev.content = null;
      }
    }
  }
  for(let a = pool.length - 1; a > 0; a--){
    const b = Math.floor(Math.random() * (a + 1));
    const t = pool[a]; pool[a] = pool[b]; pool[b] = t;
  }
  let pi = 0;
  for(let n = 0; n < ex.nodes.length; n++){
    for(let m = 0; m < ex.nodes[n].events.length; m++){
      const e = ex.nodes[n].events[m];
      if(e.cleared) continue;
      if(e.content && e.content.length) continue;
      if(pi >= pool.length) continue;
      const cnt = 1 + Math.floor(Math.random() * 2);
      const arr = [];
      for(let x = 0; x < cnt && pi < pool.length; x++) arr.push(pool[pi++]);
      if(arr.length) e.content = arr;
    }
  }
}

/* ============== 戰鬥觸發 ============== */
function _trigger(ev){
  var ex=window._explore;if(ev.cleared)return;
  if(ev.type==='combat'){
    var mode=state.preferences.actionMode||'attack';
    var pd=(typeof PLAYER_DETECT_DIST!=='undefined')?PLAYER_DETECT_DIST[mode]:100;
    var ed=80;
    if(ev.content&&ev.content[0]&&ev.content[0].detectDist)ed=ev.content[0].detectDist;
    var d=Math.abs(ev.worldX-ex.worldX);
    var first='player';
    if(d<=pd&&d<=ed)first=Math.random()<0.5?'player':'enemy';
    else if(d<=pd)first='enemy';
    else if(d<=ed)first='player';
    if(mode==='stealth'&&first==='player'){ev.cleared=true;if(ev.type==='search')_lootSearch(ev);return;}
    ex.mode='combat';ex.combatEvent=ev;_startCombat(ev,first);return;
  }
  ev.cleared=true;
  if(ev.type==='search'){
    _lootSearch(ev);
    ex._lootingUntil=performance.now()+2000;
    if(typeof heroAnim!=='undefined'){heroAnim.name='idle';heroAnim.frame=0;heroAnim.lastUpdate=performance.now();}
  }
}

function _getPW(){
  let s = null;
  if(state.player.equipped.primary) s = 'primary';
  else if(state.player.equipped.secondary) s = 'secondary';
  else if(state.player.equipped.melee) s = 'melee';
  if(!s) return null;
  const id = state.player.equipped[s];
  const d = itemDef(id);
  if(!d) return null;
  return { id: id, rarity: state.player.equippedRarity[s] || '一般', slot: s, def: d };
}

function _startCombat(ev, first){
  const ex = window._explore;
  const isV = !!(window.BTRSupport && window.BTRSupport.active && window.BTRSupport.phase !== 'wreck');
  const allies = [];
  let sceneType = 'foot';

  if(isV){
    sceneType = 'vehicle';
    const g = (typeof _garageInitState === 'function') ? _garageInitState() : null;
    const vid = g ? g.currentVehicle : 'btr80';
    const vdef = (typeof VEHICLES !== 'undefined') ? VEHICLES[vid] : null;
    const vh = (vdef && vdef.hp) ? vdef.hp : 500;
    allies.push({ isVehicle: true, vehicleId: vid, hp: vh, maxHp: vh, armorGrid: [30,20,15], armorLevel: 5, worldX: 0 });
  } else {
    const w = _getPW();
    allies.push({
      isPlayer:true,hp:state.player.maxHp, maxHp: state.player.maxHp,
      armor: state.player.armor, maxArmor: state.player.maxArmor,
      armorLevel: state.player.armorLevel || 0,
      worldX: 0, weapon: w
    });
    const fw = ex.passengersFollowing || [];
    const _publicPool = [];
    for(let _pi0 = 0; _pi0 < fw.length; _pi0++){
      const _p0 = fw[_pi0].p;
      if(!_p0.ammoBox || !_p0.ammoBox.ammoId) continue;
      var _adef = (typeof AMMO !== 'undefined') ? AMMO[_p0.ammoBox.ammoId] : null;
      if(!_adef || !_adef.cal) continue;
      _publicPool.push({
        cal: _adef.cal,
        id: _p0.ammoBox.ammoId,
        rarity: _p0.ammoBox.rarity || '一般',
        count: _p0.ammoBox.count || 0,
        _src: _p0.ammoBox
      });
    }
    for(let fi = 0; fi < fw.length; fi++){
      const f2 = fw[fi], srv = f2.srv, p = f2.p;
      if(srv.injuredUntil && Date.now() < srv.injuredUntil) continue;
      /* v25: 错误的"武器是弹药"判断已删除 */
      const pw = p.primaryWeapon ? itemDef(p.primaryWeapon) : null;
      const wO = pw ? { id: p.primaryWeapon, rarity: p.primaryWeaponRarity || '一般', def: pw, slot: 'primary' } : null;
      allies.push({
        isPassenger: true, srv: srv,
        hp: servantMaxHp(srv), maxHp: servantMaxHp(srv),
        armor: 0, maxArmor: 0, armorLevel: 0,
        worldX: 0,
        weapon: wO,
        equipData: {
          head: p.helmet || null,
          top: p.body || null,
          primary: p.primaryWeapon || null
        },
        ammoPouch: p.ammoPouch ? { ammoId: p.ammoPouch.ammoId, rarity: p.ammoPouch.rarity, count: p.ammoPouch.count } : null,
        ammoBox: p.ammoBox ? { ammoId: p.ammoBox.ammoId, rarity: p.ammoBox.rarity, count: p.ammoBox.count } : null,
        _publicPool: _publicPool
      });
    }
  }

  const enemies = [], offs = [];
  let _baseDist = ev.worldX - ex.worldX;
  if(_baseDist < 1) _baseDist = 1;
  for(let j = 0; j < ev.content.length; j++){
    if(!ev.content[j]) continue;
    const c = Object.assign({}, ev.content[j]);
    const rel = _baseDist + (j - (ev.content.length - 1) / 2) * 1.5;
    c.worldX = rel;
    enemies.push(c);
    offs.push(rel);
  }
  if(!enemies.length){ ev.cleared = true; return; }
  if(typeof window._combatStart !== 'function'){ ex.mode = isV ? 'vehicle' : 'walk'; ev.cleared = true; return; }
  window._combatStart({
    sceneType: sceneType,
    firstSide: first,
    allies: allies,
    enemies: enemies,
      onVictoryStart: function(){
      /* rev-fix-corpses: 下車後 sceneType 已變 foot，即使 isV 仍為 true 也要轉移屍體 */
      const _cNow = window._combat;
      const _isFootNow = !!(_cNow && _cNow.sceneType === 'foot');
      if(!isV || _isFootNow){
        const _curOffs = enemies.map(function(e){ return e.worldX; });
        _startCorpses(enemies, _curOffs);
      }
      ex._pendingLootEvent = ev;
    },
    onResolve: function(win){
    // v18: 载具战强制胜利
    if(!win && isV){ win = true; }
    if(win && ex.combatEvent) ex.combatEvent.cleared = true;
    ex.combatEvent = null;
    var _isVNow = !!(window.BTRSupport && window.BTRSupport.active && window.BTRSupport.phase !== 'wreck');
    if(win){
      ex.mode = _isVNow ? 'vehicle' : 'walk';
      if(typeof save === 'function') save();
      return;
    }
    // 步战失败：消耗品恢复机制
    var _hp = state.player.hp;
    var _maxHp = state.player.maxHp;
    var _used = [];
    var _medbayLv = (typeof getBuildingLv === 'function') ? getBuildingLv('medbay') : 0;
    while(_hp <= 0){
      var _c = (typeof findNextConsumable === 'function') ? findNextConsumable() : null;
      if(!_c) break;
      var _heal = (typeof calcConsumableHeal === 'function') ? calcConsumableHeal(_c, _medbayLv) : 0;
      if(_heal <= 0) break;
      invRemove(_c.id, _c.rarity, 1);
      _hp = Math.min(_maxHp, _hp + _heal);
      _used.push(_c);
    }
    if(_hp > 0){
      state.player.hp = _hp;
      if(typeof refreshPlayerStats === 'function') refreshPlayerStats();
      ex.mode = 'walk';
      ex._lootingUntil = performance.now() + 2000;
      ex.deadUntil = 0;
      if(typeof heroAnim !== 'undefined'){ heroAnim.name = 'idle'; heroAnim.frame = 0; heroAnim.lastUpdate = performance.now(); }
      for(var ci = ex.corpses.length - 1; ci >= 0; ci--){ try{ ex.corpses[ci].wrap.remove(); }catch(e){} }
      ex.corpses = [];
      ex._pendingLootEvent = null;
      if(typeof pushLog === 'function'){
        pushLog('<span class="pl">玩家</span> 重傷倒地，使用 ' + _used.map(function(u){ return fmtItemSpan(u.id, u.rarity, 1); }).join('、') + ' 恢復 ' + Math.round(_hp) + ' 生命', [], 'explore');
      }
      if(typeof save === 'function') save();
      if(typeof renderZone3Log === 'function') renderZone3Log();
      return;
    }
    // 消耗品耗尽：60 秒 CD
    state.player.deadUntil = Date.now() + 60000;
    ex.mode = 'dead';
    ex.deadUntil = performance.now() + 60000;
    for(var ci2 = ex.corpses.length - 1; ci2 >= 0; ci2--){ try{ ex.corpses[ci2].wrap.remove(); }catch(e){} }
    ex.corpses = [];
    ex._pendingLootEvent = null;
    if(ex.passengersFollowing && ex.passengersFollowing.length){
      if(typeof _evac === 'function') _evac();
    }
    if(!isV){
      state.player.armor = state.player.maxArmor;
    }
    if(typeof heroAnim !== 'undefined'){ heroAnim.name = 'dead'; heroAnim.frame = 0; heroAnim.lastUpdate = performance.now(); }
    if(typeof pushLog === 'function'){
      pushLog('<span class="lose">玩家</span> 重傷倒地（無消耗品），60 秒後恢復', [], 'explore');
    }
    if(typeof save === 'function') save();
    if(typeof renderZone3Log === 'function') renderZone3Log();
  }
  });
}

/* ============== 主循環 ============== */
function _tick(now){
  const ex = window._explore;
  if(!ex.active) return;
  const b = window.BTRSupport;
  const ph = (b && b.active) ? b.phase : null;

  if(b && b.active && ph === 'enter' && ex.passengersFollowing && ex.passengersFollowing.length > 0 && !ex.evacuatingPassengers){
    _evac();
  }
  if(ex._lastBtrPhase !== ph){
    if(ph === 'exit' && ex._lastBtrPhase !== 'exit') _disembark();
    else if(ph === 'wreck' && ex._lastBtrPhase !== 'wreck' && !(b && b._wreckDisembarked)) _disembark();
    ex._lastBtrPhase = ph;
  }
  if(ph === 'support'){
    if(ex.mode !== 'combat' && ex.mode !== 'dead') ex.mode = 'vehicle';
  } else {
    if(ex.mode === 'vehicle') ex.mode = 'walk';
  }

  if(ex.passengersFollowing && ex.passengersFollowing.length) _renderPass(now);

  if(ex.mode === 'dead'){
    if(typeof heroAnim !== 'undefined' && heroAnim.name !== 'dead'){
      heroAnim.name = 'dead';
      heroAnim.frame = 0;
      heroAnim.lastUpdate = performance.now();
    }
    const _deadUntilMs = (state.player && state.player.deadUntil) ? state.player.deadUntil : 0;
    const _deadRemain = _deadUntilMs - Date.now();
    if(_deadRemain > 0){
      ex._currentSpeed = 0;
      _updateBgTransform();
      _updateCorpsesLayout();
      return;
    }
    ex.mode = 'walk';
    ex.deadUntil = 0;
    if(state.player){ state.player.deadUntil = 0; state.player.hp = state.player.maxHp; state.player.armor = state.player.maxArmor; }
    if(typeof refreshPlayerStats === 'function') refreshPlayerStats();
    if(typeof heroAnim !== 'undefined'){ heroAnim.name = 'walk'; heroAnim.frame = 0; }
    _updateBgTransform();
    return;
  }

  const dt = Math.min(0.1, (now - (ex.lastTick || now)) / 1000);
  ex.lastTick = now;

  const _inVehCombat = !!(window._combatActive && window._combat && window._combat.sceneType === 'vehicle');
  let ts = _getPlayerWalkSpeed();
  if(ex._lootingUntil > 0 && now < ex._lootingUntil && !_inVehCombat) ts = 0;
  else if(ex.mode === 'combat' && !_inVehCombat){
    const _cc = window._combat;
    if(_cc && _cc._hurtUntil && now < _cc._hurtUntil) ts = 0;
    else ts = (typeof window._playerShouldStandStill === 'function' && window._playerShouldStandStill()) ? 0 : 1.4;
  }
  else if(b && b.active) ts = _computeTS(now);

  if(!ex.combatEvent){
    const _ne = _nextEvent();
    if(!_ne){
      const _rs = getActiveRegions();
      const _newR = _rs[Math.floor(Math.random() * _rs.length)];
      if(_newR && ROUTES[_newR]){
        const _newRi = Math.floor(Math.random() * ROUTES[_newR].length);
        const _m = _genMap(_newR, _newRi);
        const _off = ex.worldX + 5;
        for(let ni = 0; ni < _m.nodes.length; ni++){
          _m.nodes[ni].startX += _off;
          _m.nodes[ni].endX += _off;
          for(let ei = 0; ei < _m.nodes[ni].events.length; ei++){
            _m.nodes[ni].events[ei].worldX += _off;
          }
        }
        ex.nodes = ex.nodes.concat(_m.nodes);
        ex.totalLen = _off + _m.totalLen;
      }
    }
  }

  const _isWreckPause = !!(window.BTRSupport && window.BTRSupport.phase === 'wreckPause');
  const k = Math.min(1, dt * 8);
  if(_isWreckPause){ ex._currentSpeed = 0; }
  else if(ts === 0){ ex._currentSpeed = 0; }
  else { ex._currentSpeed += (ts - ex._currentSpeed) * k; }
  if(!_isWreckPause && Math.abs(ex._currentSpeed - ts) < 0.01) ex._currentSpeed = ts;

  const _delta = ex._currentSpeed * dt;
  ex.worldX += _delta;
  if(_delta > 0.001 && typeof window._combatPlayerAdvance === 'function') window._combatPlayerAdvance(_delta);
  _updateCorpsesLayout();

  if(ex._lootingUntil > 0 && now < ex._lootingUntil){
    if(typeof heroAnim !== 'undefined' && heroAnim.name !== 'idle'){ heroAnim.name = 'idle'; heroAnim.frame = 0; heroAnim.lastUpdate = now; }
  } else {
    if(typeof heroAnim !== 'undefined' && heroAnim.name === 'idle' && ex._currentSpeed > 0.5){ heroAnim.name = 'walk'; heroAnim.frame = 0; heroAnim.lastUpdate = now; }
  }

  if(!ex._corpseLootTriggered && ex.corpses.length > 0 && !_inVehCombat && ex.mode !== 'combat' && ex._pendingLootEvent){
    const first = ex.corpses[0];
    if(first){
      const rel = first.worldX - ex.worldX;
      if(rel <= 0 && Math.abs(rel) <= 0.5){
        ex._lootingUntil = now + 2000;
        ex._corpseLootTriggered = true;
      }
    }
  }

  if(ex._lootingUntil > 0 && now >= ex._lootingUntil){
    ex._lootingUntil = 0;
    ex._corpseLootTriggered = false;
    if(ex._pendingLootEvent){
      if(!ex._pendingLootEvent.cleared) ex._pendingLootEvent.cleared = true;
      _lootVictory(ex._pendingLootEvent);
      ex._pendingLootEvent = null;
    }
  }

  const prev = ex._curNodeIdx || 0;
  const curr = _curNodeIdx();
  if(prev !== curr){ ex._curNodeIdx = curr; ex._bgDirty = true; }
  if(ex._bgDirty) _renderBg();
  _updateBgTransform();

  if(!ex.combatEvent && ex.mode !== 'combat' && !(ex._lootingUntil > 0 && now < ex._lootingUntil) && !window._combatActive){
    const mode = state.preferences.actionMode || 'attack';
    const pd = (typeof PLAYER_DETECT_DIST !== 'undefined') ? PLAYER_DETECT_DIST[mode] : 100;
    const _isVMode = (ex.mode === 'vehicle');
    let _maxRange = Infinity;
    if(!_isVMode){
      const _pw = _getPW();
      _maxRange = 15;
      if(_pw && _pw.def){
        if(_pw.def._shortRange) _maxRange = 20;
        else if(typeof WEAPON_COMBAT_RANGE !== 'undefined' && WEAPON_COMBAT_RANGE[_pw.def.type]) _maxRange = WEAPON_COMBAT_RANGE[_pw.def.type];
      }
    }
    let _bestEv = null, _bestD = Infinity;
    for(let _ni = 0; _ni < ex.nodes.length; _ni++){
      const _nd = ex.nodes[_ni];
      for(let _ei = 0; _ei < _nd.events.length; _ei++){
        const _ev = _nd.events[_ei];
        if(_ev.cleared) continue;
        const _d = _ev.worldX - ex.worldX;
        if(_d < 0) continue;
        let _ed = 80;
        if(_ev.content && _ev.content[0] && _ev.content[0].detectDist) _ed = _ev.content[0].detectDist;
        const _dr = Math.max(pd, _ed);
        if(_d <= _dr && _d <= _maxRange && _d < _bestD){ _bestEv = _ev; _bestD = _d; }
      }
    }
    if(_bestEv) _trigger(_bestEv);
  }

  if(!ex._lastSaveAt || now - ex._lastSaveAt > 500){
    ex._lastSaveAt = now;
    const kk = ex.region + '#' + ex.routeIdx;
    if(state.explore && state.explore[kk]) state.explore[kk].worldX = ex.worldX;
  }
}

/* ============== 進入地圖 ============== */
function _startMap(region, ri){
  const ex = window._explore;
  if(!region) region = state.activeRegion || (getActiveRegions()[0] || '廢棄工廠');
  const rs = ROUTES[region];
  if(!rs) return;
  if(ri === undefined || ri === null) ri = Math.floor(Math.random() * rs.length);
  const persisted = _ensureES(region, ri);
  /* rev-fix-world-norewind: 同一 region 且已 active 時不倒退 worldX */
  const _sameRegion = (ex.region === region && ex.active === true);
  ex.region = region;
  ex.routeIdx = ri;
  ex.nodes = persisted.nodes;
  ex.totalLen = persisted.totalLen;
  if(_sameRegion){
    ex.worldX = Math.max(ex.worldX || 0, persisted.worldX || 0);
  } else {
    ex.worldX = persisted.worldX || 0;
  }
  ex.mode = 'walk';
  ex.active = true;
  ex.deadUntil = 0;
  ex.combatEvent = null;
  ex._curNodeIdx = 0;
  ex._bgDirty = true;
  ex.corpses = [];
  ex._lootingUntil = 0;
  ex._pendingLootEvent = null;
  ex._corpseLootTriggered = false;
  if(!ex.passengersFollowing) ex.passengersFollowing = [];
  const _n = ex.passengersFollowing.length;
  if(_n > 0){ if(ex._slot0 >= _n) ex._slot0 = 0; if(ex._slot1 >= _n) ex._slot1 = (_n > 1 ? 1 : 0); }
  else { ex._slot0 = 0; ex._slot1 = 0; }
  ex._lastRotate = 0;
  ex._currentSpeed = 1.4;
  _cleanPC();
}

/* ============== 電台系統 ============== */
function _radioEnsureInit(){
  const max = (typeof getBuildingLv === 'function') ? getBuildingLv('garage') : 0;
  const _d = new Date();
  const today = _d.getFullYear() + '-' + (_d.getMonth() + 1) + '-' + _d.getDate();
  if(typeof state.radioUses !== 'number' || !isFinite(state.radioUses)) state.radioUses = max;
  if(typeof state.radioLastResetDate !== 'string' || !state.radioLastResetDate) state.radioLastResetDate = today;
  if(typeof state.radioCooldownUntil !== 'number' || !isFinite(state.radioCooldownUntil)) state.radioCooldownUntil = 0;
  let _changed = false;
  if(state.radioLastResetDate !== today){
    state.radioUses = max;
    state.radioLastResetDate = today;
    _changed = true;
  }
  if(state.radioUses > max){ state.radioUses = max; _changed = true; }
  if(state.radioUses < 0){ state.radioUses = 0; _changed = true; }
  if(_changed && typeof save === 'function') save();
}

function _radioGetStatus(){
  _radioEnsureInit();
  const now = Date.now();
  const cdUntil = state.radioCooldownUntil || 0;
  if(now < cdUntil){
    return { state: 'cooldown', remain: Math.ceil((cdUntil - now) / 1000) };
  }
  if(state.radioUses <= 0){
    return { state: 'empty', uses: 0 };
  }
  return { state: 'ready', uses: state.radioUses };
}

function _radioTryConsume(){
  _radioEnsureInit();
  const st = _radioGetStatus();
  if(st.state !== 'ready') return false;
  state.radioUses -= 1;
  state.radioCooldownUntil = Date.now() + RADIO_COOLDOWN_MS;
  if(typeof save === 'function') save();
  return true;
}

function _radioShowConfirm(){
  _radioEnsureInit();
  const st = _radioGetStatus();
  if(st.state === 'cooldown') return;
  if(st.state === 'empty') return;

  const g = (typeof _garageInitState === 'function') ? _garageInitState() : null;
  const vid = g ? g.currentVehicle : 'btr80';
  const cost = (typeof vcEstimateCallCost === 'function') ? vcEstimateCallCost(vid) : { full: 0, have: 0, diff: 0 };
  const avail = (typeof vcAmmoEquivTotal === 'function') ? vcAmmoEquivTotal() : 0;
  const dmg = (state.vehicleDamage && state.vehicleDamage[vid]) || null;
  const repairing = dmg && dmg.repairUntil > Date.now();

  const _isInjuredSrv = function(s){
    if(!s) return false;
    if(s.injuredUntil && s.injuredUntil > Date.now()) return true;
    if(typeof s.hp === 'number' && s.hp <= 0) return true;
    if(s._injuredDown) return true;
    return false;
  };

  const stS = state.station || {};
  const crew = stS.crew || {};
  const crewLabels = (typeof CREW_LABELS !== 'undefined') ? CREW_LABELS : { commander: '車長', gunner: '炮手', driver: '駕駛' };
  const crewRoles = (typeof CREW_ROLES !== 'undefined') ? CREW_ROLES : ['commander', 'gunner', 'driver'];
  const crewIssues = [];
  const crewInjuredSrv = [];
  for(let i = 0; i < crewRoles.length; i++){
    const role = crewRoles[i];
    const sid = crew[role];
    if(!sid){ crewIssues.push({ role: role, label: crewLabels[role], reason: '空缺' }); continue; }
    const srv = (state.servants || []).find(function(s){ return s.id === sid; });
    if(!srv){ crewIssues.push({ role: role, label: crewLabels[role], reason: '僕人不存在' }); continue; }
    if(_isInjuredSrv(srv)){
      crewIssues.push({ role: role, label: crewLabels[role], reason: '重傷' });
      crewInjuredSrv.push(srv);
    }
  }

  const _stPass = (state.station && state.station.passengers) || [];
  let _injuredPassCount = 0;
  const _injuredPass = [];
  for(let _pi = 0; _pi < _stPass.length; _pi++){
    const _ps = (state.servants || []).find(function(s){ return s.id === _stPass[_pi].srvId; });
    if(_isInjuredSrv(_ps)){
      _injuredPassCount++;
      _injuredPass.push(_ps);
    }
  }

  const canSummon = !repairing && crewIssues.length === 0 && avail + 0.01 >= cost.diff;

  const _fmt = function(n){
    if(n == null || isNaN(n)) return '0';
    const v = Math.floor(Math.abs(n));
    if(v < 10000) return String(v);
    if(v < 1000000) return Math.round(v / 1000) + 'K';
    return (v / 1000000).toFixed(1) + 'M';
  };

  let body = '';
  body += '<div style="font-size:11px;color:#e8a33d;font-weight:bold;margin-bottom:6px">彈藥消耗</div>';
  body += '<div style="display:flex;justify-content:space-between;font-size:11px;color:#a89a85;padding:2px 0"><span>需要</span><span>' + _fmt(cost.diff) + ' 等值</span></div>';
  body += '<div style="display:flex;justify-content:space-between;font-size:11px;color:#a89a85;padding:2px 0"><span>可用</span><span style="color:' + (avail >= cost.diff ? '#4caf50' : '#e05252') + '">' + _fmt(avail) + ' 等值</span></div>';
  body += '<div class="divider"></div>';
  body += '<div style="font-size:11px;color:#e8a33d;font-weight:bold;margin-bottom:4px">車組</div>';
  for(let ci = 0; ci < crewRoles.length; ci++){
    const cr = crewRoles[ci];
    const sid = crew[cr];
    const srv = sid ? (state.servants || []).find(function(s){ return s.id === sid; }) : null;
    const txt = srv ? ((typeof servantLabel === 'function' ? servantLabel(srv) : srv.id) + ' Lv.' + srv.lv) : '（未指派）';
    let issue = null;
    for(let ii = 0; ii < crewIssues.length; ii++){ if(crewIssues[ii].role === cr){ issue = crewIssues[ii]; break; } }
    const status = issue ? '<span style="color:#e05252">' + issue.reason + '</span>' : '<span style="color:#4caf50">正常</span>';
    body += '<div style="display:flex;justify-content:space-between;font-size:11px;padding:2px 0"><span>' + crewLabels[cr] + ' ' + txt + '</span>' + status + '</div>';
  }
  if(_stPass.length > 0){
    const _pInfo = _stPass.length + ' 人' + (_injuredPassCount > 0 ? '（重傷 ' + _injuredPassCount + '）' : '');
    body += '<div style="display:flex;justify-content:space-between;font-size:11px;padding:2px 0"><span>載員</span><span style="color:' + (_injuredPassCount > 0 ? '#e05252' : '#4caf50') + '">' + _pInfo + '</span></div>';
  }
  if(crewIssues.length > 0) body += '<div style="font-size:11px;color:#e05252;padding:6px 0">車組不完整，無法召喚</div>';
  if(repairing) body += '<div style="font-size:11px;color:#e05252;padding:0 0 6px">載具維修中，無法召喚</div>';
  if(avail < cost.diff) body += '<div style="font-size:11px;color:#e05252;padding:0 0 6px">彈藥不足，無法召喚</div>';

  const repairCost = { metal: 50, gears: 20, screws: 20 };
  const canRepair = repairing && (typeof _gardenMerchantCanPay === 'function' ? _gardenMerchantCanPay(repairCost) : false);
  const _hasInjured = (crewInjuredSrv.length + _injuredPass.length) > 0;
  const _healer = (function(){
    const hl = ['ifak','salewa','surv12','ai2'];
    for(let hk = 0; hk < hl.length; hk++){
      for(let ik in state.inventory){
        if(ik.indexOf(hl[hk] + '@') === 0 && state.inventory[ik] > 0){
          return { id: ik.split('@')[0], rarity: ik.split('@')[1] };
        }
      }
    }
    return null;
  })();
  const _canHeal = _hasInjured && !!_healer;
  body += '<div style="display:flex;gap:6px;margin:8px 0">';
  body += '<button class="btn" id="_p37_repair" ' + (canRepair ? '' : 'disabled') + ' style="flex:1;padding:8px;font-size:12px">維修</button>';
  body += '<button class="btn" id="_p37_heal" ' + (_canHeal ? '' : 'disabled') + ' style="flex:1;padding:8px;font-size:12px">治療</button>';
  body += '</div>';
  body += '<div class="divider"></div>';

  const ft = document.createElement('div');
  ft.className = 'modal-ft';
  ft.innerHTML = '<button class="btn primary" id="_radio_confirm" ' + (canSummon ? '' : 'disabled') + '>召喚</button>';
  const bd = openModal({ title: '召喚載具', body: body, footer: ft });
  const confirmBtn = ft.querySelector('#_radio_confirm');
  if(confirmBtn) confirmBtn.onclick = function(){
    if(!canSummon) return;
    if(typeof _radioTryConsume !== 'function') return;
    if(!_radioTryConsume()) return;
    closeModal();
    if(typeof window._radioBTRTrigger === 'function'){
      window._radioBTRTrigger();
    }
  };
  const _p37repairBtn = bd.querySelector('#_p37_repair');
  if(_p37repairBtn) _p37repairBtn.onclick = function(){
    if(!canRepair) return;
    if(typeof _gardenMerchantTryPay === 'function' && !_gardenMerchantTryPay(repairCost)) return;
    if(dmg){
      dmg.repairUntil = 0;
      dmg.destroyed = false;
      dmg.disabled = false;
      dmg.ammoRackDamage = 0;
      dmg._loggedParts = {};
      if(dmg.parts){ dmg.parts.engine = 800; dmg.parts.tracks = 1000; dmg.parts.gun = 400; dmg.parts.turret = 400; }
      if(dmg.members){ dmg.members.driver = 300; dmg.members.gunner = 300; dmg.members.commander = 300; dmg.members.player = 100; }
    }
    save();
    closeModal();
    window._radioShowConfirm();
  };
  const _p37healBtn = bd.querySelector('#_p37_heal');
  if(_p37healBtn) _p37healBtn.onclick = function(){
    if(!_canHeal) return;
    invRemove(_healer.id, _healer.rarity, 1);
    const _allInjured = crewInjuredSrv.concat(_injuredPass);
    for(let i = 0; i < _allInjured.length; i++){
      const s = _allInjured[i];
      s.injuredUntil = 0;
      s.hp = (typeof servantMaxHp === 'function') ? servantMaxHp(s) : 100;
      s._injuredDown = false;
    }
    save();
    closeModal();
    window._radioShowConfirm();
  };
}

/* ============== 頁面渲染 ============== */
function renderZone3Log(){
  const box = document.getElementById('logbox');
  if(!box) return;
  box.innerHTML = '';
  const logs = state.logs.filter(function(l){ return l.type !== 'combat'; }).slice(-60);
  for(const l of logs){
    const line = document.createElement('div');
    line.className = 'logline';
    line.innerHTML = '<span class="tm">' + fmtTime(l.t) + '</span> ' + l.html;
    if(l.type === 'offline' && l.items && l.items.length){
      line.style.cursor = 'pointer';
      line.title = '點擊檢視獲得物資';
      line.onclick = (function(entry){ return function(){ openOfflineDetail(entry); }; })(l);
    }
    if(l.type === 'btr'){
      line.style.cursor = 'pointer';
      line.title = '點擊檢視支援報告';
      line.onclick = (function(entry){ return function(){ if(typeof window._openBTRSupportDetail === 'function') window._openBTRSupportDetail(entry); }; })(l);
    }
    if(l.type === 'vehicle_destroyed'){
      line.style.cursor = 'pointer';
      line.title = '點擊檢視擊毀報告';
      line.onclick = (function(entry){ return function(){ if(typeof window._openVehicleDestroyedDetail === 'function') window._openVehicleDestroyedDetail(entry); }; })(l);
    }
    box.appendChild(line);
  }
  box.scrollTop = box.scrollHeight;
}

window.renderZone3Log = renderZone3Log;

window.renderExplore = function(){
  const z1 = document.getElementById('zone1');
  if(!z1) return;
  const b = window.BTRSupport;
  if(!b || !b.active){
    const rgs = (typeof getActiveRegions === 'function') ? getActiveRegions() : ['廢棄工廠'];
    const region = state.activeRegion || rgs[0] || '廢棄工廠';
    state.activeRegion = region;
    z1.innerHTML = '<div class="scene"><div class="bg-scroll" style="--spd:10s"><div class="bg-track"><div class="bg-layer"></div><div class="bg-layer"></div></div></div><div class="bg-fade" id="explore-bg-fade" style="opacity:0"></div><div class="groundline"></div><div class="explore-fx" id="explore-fx"></div><canvas id="hero-canvas" class="hero-canvas"></canvas><div class="zone-title">🧭 ' + region.replace(/II$/,' II') + '</div><div class="zone-badge">' + (state.preferences.actionMode === 'attack' ? '⚔ 攻擊前進' : '🥷 潛行蒐集') + '</div></div>';
    try { _startMap(region); } catch(e){ console.warn('[explore startMap]', e); }
    try { _renderBg(); } catch(e){}
    requestAnimationFrame(function(){
      if(typeof renderExploreHeroCanvas === 'function') renderExploreHeroCanvas();
      _updateBgTransform();
    });
  } else if(!z1.querySelector('.scene')){
    const rgs2 = (typeof getActiveRegions === 'function') ? getActiveRegions() : ['廢棄工廠'];
    const region2 = state.activeRegion || rgs2[0] || '廢棄工廠';
    z1.innerHTML = '<div class="scene"><div class="bg-scroll" style="--spd:10s"><div class="bg-track"><div class="bg-layer"></div><div class="bg-layer"></div></div></div><div class="bg-fade" id="explore-bg-fade" style="opacity:0"></div><div class="groundline"></div><div class="explore-fx" id="explore-fx"></div><canvas id="hero-canvas" class="hero-canvas"></canvas><div class="zone-title">🧭 ' + region2.replace(/II$/,' II') + '</div><div class="zone-badge"></div></div>';
    try { if(b._setupCanvas) b._setupCanvas(); } catch(e){ console.warn('[btr remount]', e); }
    requestAnimationFrame(function(){
      if(typeof renderExploreHeroCanvas === 'function') renderExploreHeroCanvas();
    });
  }
  const z2 = document.getElementById('zone2');
  if(z2 && typeof renderEquipZone === 'function') renderEquipZone(z2);
  const z3 = document.getElementById('zone3');
  if(z3){
    z3.innerHTML = '<div class="z3-head"><div class="z3-title">📜 日誌</div><div class="z3-btn" id="log-history-btn">查看記錄</div></div><div class="logbox" id="logbox"></div>';
    renderZone3Log();
    const bb = document.getElementById('log-history-btn');
    if(bb && typeof openLogHistory === 'function') bb.onclick = openLogHistory;
  }
};

window._exploreStartMap = _startMap;
window._exploreTick = _tick;
window._exploreSetVehicleMode = function(on){
  if(on) window._explore.mode = 'vehicle';
  else if(window._explore.mode !== 'combat' && window._explore.mode !== 'dead') window._explore.mode = 'walk';
};
window._exploreEvacuatePassengers = _evac;
window._exploreEnterLootWindow = function(){};

window.preloadExploreBackgrounds = preloadExploreBackgrounds;
window._radioEnsureInit = _radioEnsureInit;
window._radioGetStatus = _radioGetStatus;
window._radioTryConsume = _radioTryConsume;
window._radioShowConfirm = _radioShowConfirm;

window._enemyCountWeights = {
  '廢棄工廠':     [40, 35, 25],
  '廢棄實驗室':   [40, 35, 25],
  '郊區公路':     [25, 30, 25, 15, 5],
  '輻射沼澤':     [15, 20, 22, 20, 13, 7, 3],
  '廢土核心':     [5, 8, 12, 20, 22, 20, 13],
  '廢棄工廠II':   [15, 20, 22, 20, 13, 7, 3],
  '廢棄實驗室II': [10, 15, 20, 22, 18, 10, 5],
  '郊區公路II':   [8, 12, 18, 22, 20, 13, 7],
  '輻射沼澤II':   [5, 8, 12, 20, 22, 20, 13],
  '廢土核心II':   [3, 5, 8, 15, 22, 25, 22]
};
window._enemyCountForRegion = function(region){
  const w = window._enemyCountWeights[region] || [30, 40, 30];
  let total = 0;
  for(let i = 0; i < w.length; i++) total += w[i];
  let r = Math.random() * total;
  for(let i = 0; i < w.length; i++){
    r -= w[i];
    if(r <= 0) return i + 1;
  }
  return w.length;
};

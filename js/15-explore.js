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
  _pendingLootEvents: null, _lastSaveAt: 0
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
    detectableR: 80, hitBase: 0.55, worldX: 0
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
    /* rev-fix-map-region: 節點記錄自己的 region / routeIdx */
    nodes.push({ idx: i, name: name, region: region, routeIdx: pi, startX: sx, endX: ex, events: evs });
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

/* [v178 R4] 缺陷C：全域清掃「敵人已全死但 cleared 未置 true」的戰鬥事件。
 * 覆蓋載具撞死、濺射击殺、互炸死等所有死法（步戰由 _resolve(true) 兜底，此處為冗餘防守）。
 * 每幀掃一次，絕大多數事件已 cleared 直接 continue，成本可忽略。 */
function _cleanupDeadEvents(){
  const ex = window._explore;
  if(!ex || !ex.nodes) return;
  for(let _ni = 0; _ni < ex.nodes.length; _ni++){
    const _evs = ex.nodes[_ni].events;
    for(let _ei = 0; _ei < _evs.length; _ei++){
      const _ev = _evs[_ei];
      if(_ev.cleared) continue;
      if(_ev.type !== 'combat') continue;
      if(!_ev.content || !_ev.content.length){ _ev.cleared = true; continue; }
      let _anyAlive = false;
      for(let _k = 0; _k < _ev.content.length; _k++){
        if(_ev.content[_k] && _ev.content[_k].hp > 0){ _anyAlive = true; break; }
      }
      if(!_anyAlive) _ev.cleared = true;
    }
  }
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
      /* [v178 R4] 全死未清的戰鬥事件不再占位 */
      if(ev.type === 'combat' && ev.content && ev.content.length){
        let _allDead178 = true;
        for(let _k = 0; _k < ev.content.length; _k++){
          if(ev.content[_k] && ev.content[_k].hp > 0){ _allDead178 = false; break; }
        }
        if(_allDead178) continue;
      }
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
  /* rev-fix-map-region: 用節點自己的 region / routeIdx，處理拼接節點 */
  const _region = node.region || ex.region;
  const _ri = (node.routeIdx !== undefined) ? node.routeIdx : (ex.routeIdx || 0);
  const _pathNodes = (ROUTES[_region] && ROUTES[_region][_ri]) ? ROUTES[_region][_ri].nodes : null;
  const _maxIdx = _pathNodes ? (_pathNodes.length - 1) : node.idx;
  const _safeIdx = Math.min(Math.max(0, node.idx), _maxIdx);
  const key = REGION_KEYS[_region.replace(/II$/,'')] + '_r' + _ri + '_n' + _safeIdx;
  const url = "url('images/bg/" + key + '.png' + (typeof assetSuffix === 'function' ? assetSuffix() : '') + "')";
  const ls = document.querySelectorAll('#zone1 .bg-layer');
  for(let i = 0; i < ls.length; i++) ls[i].style.backgroundImage = url;
  const t = document.querySelector('#zone1 .zone-title');
  if(t) t.textContent = '🧭 ' + _region.replace(/II$/,' II') + ' · ' + node.name;
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
  /* [v186 H29] 移除 rotate——载员位置固定，不轮换。
     rotate 会导致 targetX 从 0.35 突变到 -0.12，screenX 平滑追新 targetX 滑行 0.47 屏宽。
     用户明示：没要求 rotate。 */
  ex._rotationOffset = 0;
  ex._lastRotateAt = 0;
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
      worldX: ex.worldX,
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
  /* rev145: 同步 _combat.allies 的 _retreating，讓 _autoFireFoot 載員循環跳過（停止射擊） */
  const _cEvac145 = window._combat;
  const _alliesBySrvId145 = {};
  if(_cEvac145 && _cEvac145.active && Array.isArray(_cEvac145.allies)){
    for(let _i145 = 1; _i145 < _cEvac145.allies.length; _i145++){
      const _a145 = _cEvac145.allies[_i145];
      if(_a145.isPassenger && _a145.srv) _alliesBySrvId145[_a145.srv.id] = _a145;
    }
  }
  for(let i = 0; i < ex.passengersFollowing.length; i++){
    const it = ex.passengersFollowing[i];
    if(!it._retreating){
      it._retreating = true;
      it._retreatSpeed = true;
    }
    /* [v195d] 清殘留等待標誌，撤離時播 run 而非被 idle 壓住。 */
    it._standingWait = false;
    it._forceRunAnim = true;
    it.targetX = 1.8 + i * 0.05;
    if(it.srv && _alliesBySrvId145[it.srv.id]){
      _alliesBySrvId145[it.srv.id]._retreating = true;
    }
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
  /* [v179 F6] 若 _renderPass 明確標記了移動狀態（advancing / firing 分支），優先用它；
     否則退回 targetX-screenX 判定（following / retreating 用原邏輯） */
  const _slotMovingRaw = Math.abs(item.targetX - item.screenX) > 0.005 && !_looting;
  const _slotMoving = (typeof item._renderForceMoving === 'boolean')
    ? item._renderForceMoving
    : _slotMovingRaw;
  const worldMoving = _exSpeed > 0.5 && !_looting;
  const moving = _slotMoving || worldMoving;
  const _inCombatD = !!(window._combat && window._combat.active);
  let animN;
  if(item._standingWait && !_inCombatD){ animN = 'idle'; }
  else if(animOverride){ animN = animOverride; }
  else if(moving){ animN = (evac || (item._forceRunAnim && !_inCombatD)) ? 'run' : 'walk'; }
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
  /* [v178 R6] 載具高速時用世界速度跟隨，避免載員被甩在後方 */
  const _followStep = Math.max(_walkStep, _worldStep);
  const _looting = (ex._lootingUntil > 0 && now < ex._lootingUntil);
  const _nowWall = Date.now();
  for(let k = 0; k < list.length; k++){
    const s = list[k];
    s._renderForceMoving = null;
    /* [v185 H23] 撤退载员：0.3 * dtS + _worldStep（原始值）。
       v182d H11 我改成 1.5 * dtS 是误判——用户没抱怨速度慢，
       「换弹时冻结」是 _tick healing 分支 return 导致 _renderPass 不跑，
       已由 v184b H18b 修复。0.3/秒 = 3.3 秒出屏，符合「跑出屏幕」的视觉。 */
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
    /* 交戰中載員獨立移動（following 以外），screenX 由 a2.worldX 計算 */
    if(_inCombat && s.srv && _alliesBySrvId[s.srv.id]){
      const _a2 = _alliesBySrvId[s.srv.id];
      if(_a2._mode && _a2._mode !== 'following'){
        /* [v178 R6] 按 ally index 施加輕微橫向錯位，避免多人在同 worldX 時重疊；
           並改用 _followStep 步進逼近，避免一幀硬設造成視覺「刷新」 */
        /* [v181d G10] 统一公式：targetX + (worldX - ex.worldX) 屏幕偏移。
           targetX 由 _updatePT 维护（0.35 / 0.15 / -0.12 等），本身就是「载员相对玩家的理想屏幕位置」。
           叠加 worldX 相对玩家偏移后，screenX 始终反映载员的真实世界位置，
           不会出现「worldX 动了但 screenX 不动」的错位。 */
        const _relWX = _a2.worldX - ex.worldX;
        const _targetBaseX = (s.targetX != null) ? s.targetX : EXPLORE_HERO_X_RATIO;
        const _targetScreenX178 = _targetBaseX
                                + (_relWX / sm.screenRightWorld) * (1 - EXPLORE_HERO_X_RATIO);
        /* [v181b G2b] 分两种：
           (1) worldX 在变（advancing / chasing）：用 _followStep 平滑步进
           (2) worldX 不变（firing / waiting）：screenX 直接 = _targetScreenX178
               原因：firing 时 worldX 不变但 ex.worldX 在变（玩家在走），
               _targetScreenX178 平滑变化，直接跟随就是平滑的；
               若用 _followStep 追，会因 screenX 落后于 _targetScreenX178
               而持续步进 → 视觉上「fire_primary 动画 + 向某方向滑行」。 */
        const _worldMovedG2b = Math.abs(_a2.worldX - (_a2._lastWorldX != null ? _a2._lastWorldX : _a2.worldX)) > 0.0001;
        s._renderForceMoving = _worldMovedG2b;
        /* [v182b H3] firing/waiting 也用 _followStep 平滑步进，不用瞬間吸附。
           原代码 firing 时 s.screenX = _targetScreenX178 是瞬間吸附——
           _updatePT 每 10 秒 rotate targetX（0.35/0.15/-0.12 循環）或載員死傷時
           其他載員 targetX 重分配 → targetX 突變 → screenX 瞬間吸附 → 閃現。
           平滑步進需要幾幀追上（rotate 時 0.2 屏寬需約 300ms），視覺上是「載員走兩步
           重新站位」而非瞬間傳送。 */
        const _dMove178b = _targetScreenX178 - s.screenX;
        if(Math.abs(_dMove178b) <= _followStep) s.screenX = _targetScreenX178;
        else s.screenX += Math.sign(_dMove178b) * _followStep;
        continue;
      }
      /* following：檢查射擊/換彈中不移動 */
      const _perf = performance.now();
      if(_a2._fireAnimUntil && _a2._fireAnimUntil > _perf) continue;
      if(_a2._reloadEnd && _a2._reloadEnd > _perf) continue;
    }
    if(s.srv && s.srv._standUntil && _nowWall < s.srv._standUntil) continue;
    if(_looting) continue;
    /* [v181e G11] following 分支：
       (1) screenX 用统一公式 targetX + (worldX - ex.worldX) 偏移
       (2) _renderForceMoving 用 worldX 实际变化判断（用户明示：动画看世界定位，不看 screenX）
       G9 已让 following 时 worldX 平滑变（2.8 m/s），所以 _renderForceMoving 能正确反映移动 */
    let _a2_f = null;
    if(_inCombat && _alliesBySrvId[s.srv.id]){
      _a2_f = _alliesBySrvId[s.srv.id];
    } else if(_c && _c.allies){
      for(let _aiF = 1; _aiF < _c.allies.length; _aiF++){
        if(_c.allies[_aiF].srv === s.srv){ _a2_f = _c.allies[_aiF]; break; }
      }
    }
    if(_a2_f){
      const _relWX_f = _a2_f.worldX - ex.worldX;
      const _targetBaseX_f = (s.targetX != null) ? s.targetX : EXPLORE_HERO_X_RATIO;
      const _targetScreenX_f = _targetBaseX_f
                             + (_relWX_f / sm.screenRightWorld) * (1 - EXPLORE_HERO_X_RATIO);
      const _diff_f = _targetScreenX_f - s.screenX;
      if(Math.abs(_diff_f) <= _followStep) s.screenX = _targetScreenX_f;
      else s.screenX += Math.sign(_diff_f) * _followStep;
      s._renderForceMoving = Math.abs(_a2_f.worldX - (_a2_f._lastWorldX != null ? _a2_f._lastWorldX : _a2_f.worldX)) > 0.0001;
    } else {
      /* [v186 H30] 战斗结束后（无 _a2_f），直接吸附到 targetX，不平滑。
         原旧 fallback 用 targetX - screenX 平滑追，worldX 不变但 screenX 移动 = 滑行。
         战斗结束时载员已随玩家归位（或接近归位），吸附不会有大的视觉跳跃。 */
      const _relWX = (typeof s.worldX === 'number' ? s.worldX : ex.worldX) - ex.worldX;
      const _targetScreenX = ((s.targetX != null) ? s.targetX : EXPLORE_HERO_X_RATIO)
                           + (_relWX / sm.screenRightWorld) * (1 - EXPLORE_HERO_X_RATIO);
      s.screenX = _targetScreenX;
      s._renderForceMoving = (s._forceRunAnim === true) || (Math.abs(_relWX) > 0.05 && s._standingWait !== true);
    }
  }
  const _nowRp = Date.now();
  for(let d = 0; d < list.length; d++){
    const it = list[d];
    /* [v182 G17] 放宽阈值——原 -0.3 / 1.15 在边界抖动导致 canvas 反复删建，
       玩家看到「载员闪烁」。载员稍出画面仍渲染（部分可见），超出才跳过。 */
    if(it.screenX > 1.3 || it.screenX < -0.6) continue;
    const _isDown = _checkDown(it);
    if(_isDown){
      _drawP(fx, 'p' + d, it.screenX * fxW, fxH, it, false, now, 'dead', null);
      continue;
    }
    let _animO = null;
    let _legO = null;
    let _animStartOverride = null;
    const _perfNow = performance.now();
    if(!it._retreating && _inCombat && it.srv && _alliesBySrvId[it.srv.id]){
      const a = _alliesBySrvId[it.srv.id];
      if(a._injuredDown || a.hp <= 0){
        _animO = 'dead';
      } else if(a._reloadEnd && _perfNow < a._reloadEnd){
        _animO = 'reload';
        _animStartOverride = a._reloadAnimStart || _perfNow;
      } else if(a._fireAnimUntil && a._fireAnimUntil > _perfNow && a.weapon && a.weapon.id){
        _animO = 'fire_primary';
        _animStartOverride = a._fireAnimStart || _perfNow;
      } else if(a._mode === 'chasing'){
        _animO = 'run';
      } else if(a._mode === 'advancing'){
        _animO = 'walk';
      } else if(a._mode === 'firing' || a._mode === 'waiting'){
        _animO = 'idle';
      } else if(a._mode === 'following'){
        /* [v184 H20] following 时 worldX 在变 → walk，不变 → idle。
           v183b H14 用了 run（2.8 m/s 对应），但 following 速度 1.6 m/s 更接近 walk 的 1.4 m/s。
           run 只适合 chasing（2.8 m/s 追玩家）。用户反馈 following 用 run 很怪。 */
        const _worldMovedH20 = Math.abs(a.worldX - (a._lastWorldX != null ? a._lastWorldX : a.worldX)) > 0.0001;
        _animO = _worldMovedH20 ? 'walk' : 'idle';
      }
      /* rev-fix-leg: 與玩家一致，fire/reload 期間不使用 legOverride，腿恆為 0 */
      /* _standStart/_standUntil 仍保留給下方 idle 過渡邏輯使用 */
    }
    if(!_animO && !it._retreating && it.srv && it.srv._standUntil && _nowRp < it.srv._standUntil && it.srv._standStart != null){
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
    /* [v182 G17] 删除阈值放宽到 -0.6 / 1.3，与 _drawP 一致。
       原 -0.3 / 1.15 在载员 firing 时玩家走远、screenX 跨边界抖动 → canvas 反复删建 → 闪烁。 */
    if(isNaN(idx) || idx >= list.length || list[idx].screenX > 1.3 || list[idx].screenX < -0.6){
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
function _startCorpses(enemies, enemyWX, ev){
  const ex = window._explore;
  const fx = document.getElementById('explore-fx');
  if(!fx || !enemies) return;
  for(let i = 0; i < enemies.length; i++){
    /* [v182 G14a] 已渲染过的 enemy 跳过，避免载具击杀路径 + 步战胜利路径重复生成。
       重复生成会导致同一事件出现两份 corpse，且视觉上「装备变化」。 */
    if(enemies[i]._corpseRendered) continue;
    const r = (typeof _renderEnemyCorpseCanvas === 'function') ? _renderEnemyCorpseCanvas(enemies[i], fx.clientHeight) : null;
    if(!r) continue;
    enemies[i]._corpseRendered = true;
    const w = document.createElement('div');
    w.style.cssText = 'position:absolute;bottom:0;z-index:13;pointer-events:none;will-change:left;width:' + r.drawW + 'px;height:' + r.drawH + 'px;';
    r.canvas.style.cssText = 'width:100%;height:100%;display:block;';
    w.appendChild(r.canvas);
    fx.appendChild(w);
    /* [v181 G4] corpse 关联它来自的 event，供逐事件拾取 */
    ex.corpses.push({ wrap: w, drawW: r.drawW, drawH: r.drawH, worldX: ex.worldX + (enemyWX[i] || 0), ev: ev });
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

function _lootVictory(events){
  if(!events) return;
  if(!Array.isArray(events)) events = [events];
  const got = [];
  const _sealsGot = {};
  const _sealsRegion = {};
  for(const ev of events){
    if(!ev || !ev.content) continue;
    for(let i = 0; i < ev.content.length; i++){
      const lo = (typeof rollEnemyLoot === 'function') ? rollEnemyLoot(ev.content[i]) : [];
      for(let j = 0; j < lo.length; j++){
        invAdd(lo[j].id, lo[j].rarity, lo[j].count);
        got.push(lo[j]);
      }
      /* [v195c] 每敵人撿屍給 3 玩家經驗。addExp 內升級自動 pushLog。 */
      if(typeof addExp === 'function') addExp(3);
    }
    /* [v195c] 每事件點撿屍 roll 一次信物，機率取 REGIONS[region].sealRate。 */
    const _R = (ev.region && typeof REGIONS !== 'undefined') ? REGIONS[ev.region] : null;
    if(_R && _R.sealRate && _R.seal && Math.random() < _R.sealRate){
      state.seals[_R.seal] = Math.max(0, parseInt(state.seals[_R.seal] || 0, 10)) + 1;
      _sealsGot[_R.seal] = (_sealsGot[_R.seal] || 0) + 1;
      _sealsRegion[_R.seal] = _R.name || ev.region;
    }
  }
  if(got.length && typeof pushLog === 'function'){
    pushLog('<span class="pl">玩家</span> 拾取 ' + got.map(function(l){ return fmtItemSpan(l.id, l.rarity, l.count); }).join('、'), got, 'explore');
  }
  for(const _sk in _sealsGot){
    if(typeof pushLog === 'function'){
      pushLog('<span class="win">獲得 ' + (_sealsRegion[_sk] || _sk) + ' 信物 ×' + _sealsGot[_sk] + '</span>', [], 'explore');
    }
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
    var pd=(typeof PLAYER_DETECTABLE_R!=='undefined')?PLAYER_DETECTABLE_R[mode]:100;
    var ed=80;
    if(ev.content&&ev.content[0]&&ev.content[0].detectableR)ed=ev.content[0].detectableR;
    var d=Math.abs(ev.worldX-ex.worldX);
    var first='player';
    if(d<=pd&&d<=ed)first=Math.random()<0.5?'player':'enemy';
    else if(d<=pd)first='enemy';
    else if(d<=ed)first='player';
    if(mode==='stealth'&&first==='player'){ev.cleared=true;if(ev.type==='search')_lootSearch(ev);return;}
    ex.mode='combat';ex.combatEvent=ev;_startCombat(ev,first);
    /* [v178 R1] 缺陷A：若 _startCombat 空跑（敵人全死 / combatStart 缺失），
       復位 ex 狀態——否則 _tick 觸發分支永久失效（Bug 2 / Bug 4 主因）。 */
    if(!window._combatActive){
      var _isV178=!!(window.BTRSupport&&window.BTRSupport.active&&window.BTRSupport.phase!=='wreck'&&window.BTRSupport.phase!=='wreckPause');
      if(ex.mode==='combat')ex.mode=_isV178?'vehicle':'walk';
      if(ex.combatEvent===ev)ex.combatEvent=null;
    }
    return;
  }
  ev.cleared=true;
  if(ev.type==='search'){
    _lootSearch(ev);
    ex._lootingUntil=performance.now()+2000;
    if(typeof heroAnim!=='undefined'){heroAnim.name='idle';heroAnim.frame=0;heroAnim.lastUpdate=performance.now();}
  }
}


function _startCombat(ev, first){
  const ex = window._explore;
  /* [v192 F2] 車戰判定改白名單。
     原：phase !== 'wreck' → wreckPause / enter / leave 都被當成在車上。
     修：只認 arrive/sink/center/support/lift/exit（玩家實際在車上的階段），
     與 _computeTS 的 center/support 及 _onPhaseEnter('arrive') 的
     c.sceneType='vehicle' 一致。wreckPause 不再被誤判。 */
  const _btrPhase = (window.BTRSupport && window.BTRSupport.active) ? window.BTRSupport.phase : null;
  const isV = !!(_btrPhase === 'arrive' || _btrPhase === 'sink' || _btrPhase === 'center' ||
                  _btrPhase === 'support' || _btrPhase === 'lift' || _btrPhase === 'exit');
  const allies = [];
  let sceneType = 'foot';
  const _pWX = ex.worldX;

  if(isV){
    sceneType = 'vehicle';
    const g = (typeof _garageInitState === 'function') ? _garageInitState() : null;
    const vid = g ? g.currentVehicle : 'btr80';
    const vdef = (typeof VEHICLES !== 'undefined') ? VEHICLES[vid] : null;
    const vh = (vdef && vdef.hp) ? vdef.hp : 500;
    allies.push({ isVehicle: true, vehicleId: vid, hp: vh, maxHp: vh, armorGrid: [30,20,15], armorLevel: 5, worldX: _pWX });
  } else {
    const w = _getPW();
    allies.push({
      isPlayer:true,hp:state.player.maxHp, maxHp: state.player.maxHp,
      armor: state.player.armor, maxArmor: state.player.maxArmor,
      armorLevel: state.player.armorLevel || 0,
      worldX: _pWX, weapon: w
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
      /* rev-fix-passenger-armor: 依裝備初始化護甲，避免 armor=0 時 1.2 倍傷害 */
      let _armor = 0, _armorLevel = 0;
      for(const _slot of ['head','top']){
        const _id = (_slot === 'head') ? p.helmet : p.body;
        const _rar = (_slot === 'head') ? (p.helmetRarity || '一般') : (p.bodyRarity || '一般');
        if(!_id) continue;
        _armor += (typeof equipArmorValue === 'function') ? (equipArmorValue(_id, _rar) || 0) : 0;
        const _d = ARMOR[_id];
        if(_d && _d.level) _armorLevel = Math.max(_armorLevel, _d.level);
      }
      allies.push({
        isPassenger: true, srv: srv,
        hp: servantMaxHp(srv), maxHp: servantMaxHp(srv),
        armor: _armor, maxArmor: _armor, armorLevel: _armorLevel,
        worldX: _pWX,
        weapon: wO,
        equipData: {
          head: p.helmet || null,
          top: p.body || null,
          primary: p.primaryWeapon || null
        },
        ammoPouch: p.ammoPouch ? { ammoId: p.ammoPouch.ammoId, rarity: p.ammoPouch.rarity, count: p.ammoPouch.count } : null,
        ammoBox: p.ammoBox ? { ammoId: p.ammoBox.ammoId, rarity: p.ammoBox.rarity, count: p.ammoBox.count } : null,
        _publicPool: _publicPool,
        grenades: Array.isArray(p.grenades) ? p.grenades.map(function(g){
          if(typeof g === 'string') return { id: g, rarity: '一般' };
          if(g && g.id) return { id: g.id, rarity: g.rarity || '一般' };
          return null;
        }).filter(function(g){ return g !== null; }) : []
      });
    }
  }

  /* 跨事件收集：所有被發現的敵人（引用不複製） */
  const enemies = [];
  for(const _node of ex.nodes){
    for(const _e of _node.events){
      if(_e.cleared) continue;
      if(_e.type !== 'combat') continue;
      if(!_e.content || !_e.content.length) continue;
      if(isV && _e.worldX <= ex.worldX) continue;
      for(let _j = 0; _j < _e.content.length; _j++){
        const _en = _e.content[_j];
        if(!_en || _en.hp <= 0) continue;
        if(enemies.indexOf(_en) !== -1) continue;
        if(!_isDiscovered(_en, _e.worldX, isV, allies[0], ex)) continue;
        _en.worldX = _e.worldX + (_j - (_e.content.length - 1) / 2) * 1.5;
        _en._initWorldX = _en.worldX;
        _en._eventRef = _e;
        enemies.push(_en);
      }
    }
  }
  if(!enemies.length){ ev.cleared = true; ex.mode = isV ? 'vehicle' : 'walk'; ex.combatEvent = null; return; }
  if(typeof window._combatStart !== 'function'){ ex.mode = isV ? 'vehicle' : 'walk'; ex.combatEvent = null; ev.cleared = true; return; }
  window._combatStart({
    sceneType: sceneType,
    firstSide: first,
    allies: allies,
    enemies: enemies,
      onVictoryStart: function(){
      const _cNow = window._combat;
      const _isFootNow = !!(_cNow && _cNow.sceneType === 'foot');
      if(!isV || _isFootNow){
        const _clearedEvents = [];
        for(const _cnode of ex.nodes){
          for(const _cev of _cnode.events){
            if(!_cev.cleared) continue;
            if(_cev.type !== 'combat') continue;
            if(!_cev.content || !_cev.content.length) continue;
            if(!_cev.content.every(function(en){ return en.hp <= 0; })) continue;
            if(_cev._corpsesGenerated) continue;
            _cev._corpsesGenerated = true;
            _clearedEvents.push(_cev);
            const _curOffs = _cev.content.map(function(en){ return en.worldX - ex.worldX; });
            _startCorpses(_cev.content, _curOffs, _cev);
          }
        }
        if(!ex._pendingLootEvents) ex._pendingLootEvents = [];
        for(const _ce of _clearedEvents){
          if(ex._pendingLootEvents.indexOf(_ce) === -1) ex._pendingLootEvents.push(_ce);
        }
      }
    },
    onResolve: function(win){
    if(!win && isV){ win = true; }
    if(win && ex.combatEvent) ex.combatEvent.cleared = true;
    if(win){
      for(const _rnode of ex.nodes){
        for(const _rev of _rnode.events){
          if(_rev.cleared) continue;
          if(_rev.type !== 'combat') continue;
          if(!_rev.content || !_rev.content.length) continue;
          if(_rev.content.every(function(en){ return en.hp <= 0; })){
            _rev.cleared = true;
          }
        }
      }
    }
    ex.combatEvent = null;
    var _isVNow = !!(window.BTRSupport && window.BTRSupport.active && window.BTRSupport.phase !== 'wreck');
    if(win){
      /* 載具不在 support/center 階段時，即使 isV 為 true 也重置為 walk */
      const _btrNow = window.BTRSupport;
      const _btrActiveNow = !!(_btrNow && _btrNow.active && (_btrNow.phase === 'support' || _btrNow.phase === 'center'));
      ex.mode = _btrActiveNow ? 'vehicle' : 'walk';
      /* rev-fix-heal-after-win: 勝利後若受傷，自動使用醫療包補血，等待治療過程 1200ms（參考 Boss 戰 manualHeal） */
      if(!_isVNow && state.player.hp < state.player.maxHp){
        var _healUsed = [];
        var _medbayLvW = (typeof getBuildingLv === 'function') ? getBuildingLv('medbay') : 0;
        while(state.player.hp < state.player.maxHp){
          var _hc = (typeof findNextConsumable === 'function') ? findNextConsumable() : null;
          if(!_hc) break;
          var _hHeal = (typeof calcConsumableHeal === 'function') ? calcConsumableHeal(_hc, _medbayLvW) : 0;
          if(_hHeal <= 0) break;
          invRemove(_hc.id, _hc.rarity, 1);
          state.player.hp = Math.min(state.player.maxHp, state.player.hp + _hHeal);
          _healUsed.push(_hc);
        }
        if(_healUsed.length > 0){
          if(typeof refreshPlayerStats === 'function') refreshPlayerStats();
          ex.mode = 'healing';
          ex._healCdUntil = performance.now() + 2000;
          if(typeof heroAnim !== 'undefined'){
            /* rev-fix-heal-melee-loop: 治療動畫循環 2s */
            heroAnim.name = 'heal_melee';
            heroAnim.frame = 0;
            heroAnim.lastUpdate = performance.now();
            heroAnim.animStart = null;
            heroAnim.forcedEnd = performance.now() + 2100;
            heroAnim.eqSlot = '__hidden__';
            heroAnim.healItem = (_healUsed.length > 0) ? _healUsed[0].id : null;
            /* rev-fix-preload-heal-item: 預先載入圖標，避免首幀空白 */
            if(heroAnim.healItem && typeof getHeroImg === 'function'){
              try { getHeroImg('icons/items/' + resolveIconId(heroAnim.healItem) + '.png'); } catch(e){}
            }
          }
          if(typeof pushLog === 'function'){
            pushLog('<span class="pl">玩家</span> 使用 ' + _healUsed.map(function(u){ return fmtItemSpan(u.id, u.rarity, 1); }).join('、') + ' 恢復至 ' + Math.round(state.player.hp) + ' 生命', [], 'explore');
          }
        } else if(state.player.hp < state.player.maxHp){
          if(typeof pushLog === 'function'){
            pushLog('<span class="pl">玩家</span> <span class="lose">受傷</span>（無醫療包），HP ' + Math.round(state.player.hp) + '/' + state.player.maxHp, [], 'explore');
          }
        }
      }
      if(typeof save === 'function') save();
      return;
    }
    // rev-fix-no-heal-on-fail: 失敗 = 倒地，不使用醫療包，直接進入 60s CD
    if(state.player.hp > 0) state.player.hp = 0;
    state.player.deadUntil = Date.now() + 60000;
    ex.mode = 'dead';
    ex.deadUntil = performance.now() + 60000;
    for(var ci2 = ex.corpses.length - 1; ci2 >= 0; ci2--){ try{ ex.corpses[ci2].wrap.remove(); }catch(e){} }
    ex.corpses = [];
    ex._pendingLootEvents = null;
    ex._corpseLootTriggered = false;
    if(ex.passengersFollowing && ex.passengersFollowing.length && typeof _evac === 'function' && !ex.evacuatingPassengers){
      try { _evac(); } catch(e){}
    }
    if(!isV){
      state.player.armor = state.player.maxArmor;
    }
    if(typeof heroAnim !== 'undefined'){ heroAnim.name = 'dead'; heroAnim.frame = 0; heroAnim.lastUpdate = performance.now(); }
    if(typeof pushLog === 'function'){
      /* rev-fix-player-killer-onResolve: 顯示被誰擊倒 */
      var _pk = ex._pendingPlayerKiller;
      ex._pendingPlayerKiller = null;
      if(_pk && _pk.weapon){
        var _wClsPK = (typeof rarityClass === 'function') ? rarityClass(_pk.wRarity || '一般') : '';
        var _eClsPK = (typeof rarityClass === 'function') ? rarityClass(_pk.aRarity || '一般') : '';
        pushLog('<span class="pl">玩家</span> 被 <span class="' + _eClsPK + '">' + _pk.name + '</span> 用 <span class="' + _wClsPK + '">' + _pk.weapon + '</span> <span class="lose">擊倒</span>，60 秒後恢復', [], 'explore');
      } else {
        pushLog('<span class="pl">玩家</span> <span class="lose">重傷倒地</span>，60 秒後恢復', [], 'explore');
      }
    }
    if(typeof save === 'function') save();
    if(typeof renderZone3Log === 'function') renderZone3Log();
  }
  });
}

/* ============== 主循環 ============== */
/* 載員獨立位置狀態機：
 * firing    — 射程內有敵人，站定開火
 * advancing — 發現敵人但射程外，前進到射程
 * chasing   — 清空後落後玩家，跑步追趕
 * waiting   — 清空後超過玩家，原地等待
 * following — 清空後在玩家 ±0.5m 內，跟隨玩家
 */
function _tickAlliesPositions(now){
  const c = window._combat;
  const ex = window._explore;
  if(!c || !ex) return;
  const p = c.allies[0];
  if(!p) return;
  const dt = Math.min(0.1, (now - (c._lastAlliesTick || now)) / 1000);
  c._lastAlliesTick = now;
  for(let i = 1; i < c.allies.length; i++){
    const a = c.allies[i];
    if(a.hp <= 0){ a._lastWorldX = a.worldX; continue; }
    if(a._retreating){ a._lastWorldX = a.worldX; continue; }
    if(!a.weapon || !a.weapon.def){ a._lastWorldX = a.worldX; continue; }
    /* [v181 G1] 记录更新前位置，供 _renderPass 判本帧实际位移 */
    a._lastWorldX = a.worldX;
    let _nearest = null, _nearestDist = Infinity;
    const _servantR = (typeof SERVANT_DETECTABLE_R !== 'undefined') ? SERVANT_DETECTABLE_R : 80;
    for(let j = 0; j < c.enemies.length; j++){
      const e = c.enemies[j];
      if(e.hp <= 0) continue;
      const dist = Math.abs(e.worldX - a.worldX);
      if(dist > _servantR) continue;
      if(dist < _nearestDist){ _nearestDist = dist; _nearest = e; }
    }
    /* [v185 H22] 探索模式只向前，不后退。用户明示：没有任何单位需要后退。
       - firing：敌人在射程内（前后都可）→ 站定开火
       - advancing：敌人只在前方且超射程 → 向前推进
       - 敌人在后方超射程 → 不追（视为没发现，走 following 逻辑）
       - following：载员略超前玩家（_dxF181d < 0）→ 不后退，保持原位 */
    let _handled = false;
    if(_nearest){
      const _r = (typeof _rangeOfWeaponDef === 'function') ? _rangeOfWeaponDef(a.weapon.def) : 15;
      if(_nearestDist <= _r){
        a._mode = 'firing';
        _handled = true;
      } else if(_nearest.worldX > a.worldX){
        a._mode = 'advancing';
        const step = Math.min(1.4 * dt, _nearestDist - _r);
        a.worldX += step;
        _handled = true;
      }
    }
    if(_handled){
      if(a.srv && ex.passengersFollowing){
        for(let _piSync = 0; _piSync < ex.passengersFollowing.length; _piSync++){
          const _itSync = ex.passengersFollowing[_piSync];
          if(_itSync.srv && _itSync.srv.id === a.srv.id){
            _itSync.worldX = a.worldX;
            break;
          }
        }
      }
      continue;
    }
    if(a.worldX < ex.worldX - 0.5){
      a._mode = 'chasing';
      a.worldX = Math.min(ex.worldX, a.worldX + 2.8 * dt);
    } else if(a.worldX > ex.worldX + 0.5){
      a._mode = 'waiting';
    } else {
      a._mode = 'following';
      /* [v185 H22] following 只向前追，不向回挪。
         载员略微超前玩家（following 范围内，_dxF181d < 0）→ 不后退，等玩家追上来。 */
      const _dxF181d = ex.worldX - a.worldX;
      if(_dxF181d > 0.01){
        const _absDxH12 = _dxF181d;
        const _chaseSpeedH12 = Math.max(1.6, 2.8 * Math.min(1, _absDxH12 / 2.0));
        a.worldX += Math.min(_absDxH12, _chaseSpeedH12 * dt);
      } else if(_dxF181d < -0.01){
        /* 载员超前玩家 → 不动 */
      } else {
        a.worldX = ex.worldX;
      }
    }
    if(a.srv && ex.passengersFollowing){
      for(let _piSync = 0; _piSync < ex.passengersFollowing.length; _piSync++){
        const _itSync = ex.passengersFollowing[_piSync];
        if(_itSync.srv && _itSync.srv.id === a.srv.id){
          _itSync.worldX = a.worldX;
          break;
        }
      }
    }
  }
}

function _tick(now){
  const ex = window._explore;
  if(!ex.active) return;
  if(typeof _cleanupDeadEvents === 'function') _cleanupDeadEvents();
  /* 治療期間完全停止，不執行任何移動/載員邏輯 */
  if(ex.mode === 'healing'){
    ex._currentSpeed = 0;
    /* 若治療期間被殘留彈幕擊中，重置治療時間（不額外消耗醫療品） */
    if(window._combat && window._combat._hurtUntil && now < window._combat._hurtUntil){
      ex._healCdUntil = now + 2000;
    }
    if(typeof heroAnim !== 'undefined' && heroAnim.name !== 'heal_melee'){
      heroAnim.name = 'heal_melee';
      heroAnim.frame = 0;
      heroAnim.lastUpdate = now;
      heroAnim.forcedEnd = now + 2100;
      heroAnim.eqSlot = '__hidden__';
      heroAnim.animStart = null;
    }
    if(now >= ex._healCdUntil){
      ex.mode = 'walk';
      ex._healCdUntil = 0;
      if(typeof heroAnim !== 'undefined'){
        heroAnim.name = 'walk';
        heroAnim.frame = 0;
        heroAnim.lastUpdate = now;
        heroAnim.eqSlot = null;
        heroAnim.forcedEnd = 0;
        heroAnim.animStart = null;
        heroAnim.healItem = null;
      }
    }
    /* [v187 H34] 合并 v182c H4 / v184b H18b / v186 H31 三重重复调用。
       healing 时仍跑 _tickAlliesPositions + _renderPass（载员 screenX 正常更新）。
       ts 仍强制 0（玩家治疗时背景不滚），但载员自身状态机正常。 */
    if(window._combat && window._combat.active && window._combat.sceneType === 'foot'){
      _tickAlliesPositions(now);
    }
    if(ex.passengersFollowing && ex.passengersFollowing.length) _renderPass(now);
    _updateBgTransform();
    _updateCorpsesLayout();
    return;
  }

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

  /* 無交戰：清除載員 _mode，worldX 回到跟隨玩家 */
  /* [v179 F3] 只在「完全沒戰鬥」時清載員 _mode。若 c.active 為真，保留載員模式。 */
  if(!window._combat || !window._combat.active){
    if(window._combat && window._combat.allies){
      for(let _ai = 1; _ai < window._combat.allies.length; _ai++){
        window._combat.allies[_ai]._mode = null;
      }
    }
  }
  /* 步戰交戰中：載員獨立位置狀態機 */
  /* [v179 F3] 只看 c.active，不依賴 _combatActive */
  if(window._combat && window._combat.active && window._combat.sceneType === 'foot'){
    _tickAlliesPositions(now);
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

  /* 治療：玩家被發現半徑內無敵人 + 不滿血 + 有醫療品 → 治療 2s */
  const _playerRH = (typeof PLAYER_DETECTABLE_R !== 'undefined') ? (PLAYER_DETECTABLE_R[state.preferences.actionMode] || 80) : 80;
  let _inEngageH = false;
  if(window._combat && window._combat.active && !window._combat.resolved && window._combat.sceneType === 'foot'){
    const _c = window._combat;
    const _p = _c.allies[0];
    if(_p){
      for(let _ei = 0; _ei < _c.enemies.length; _ei++){
        const _en = _c.enemies[_ei];
        if(_en.hp <= 0) continue;
        if(Math.abs(_en.worldX - _p.worldX) <= _playerRH){ _inEngageH = true; break; }
      }
    }
  }
  const _btrActiveH = !!(b && b.active && (b.phase === 'support' || b.phase === 'center'));
  const _healMode = (ex.mode === 'walk' || ex.mode === 'combat') && !_btrActiveH;
  if(_healMode && !_inEngageH && state.player.hp > 0 && state.player.hp < state.player.maxHp){
    const _hc = (typeof findNextConsumable === 'function') ? findNextConsumable() : null;
    if(_hc){
      const _medbayLv = (typeof getBuildingLv === 'function') ? getBuildingLv('medbay') : 0;
      const _heal = (typeof calcConsumableHeal === 'function') ? calcConsumableHeal(_hc, _medbayLv) : 0;
      if(_heal > 0){
        invRemove(_hc.id, _hc.rarity, 1);
        state.player.hp = Math.min(state.player.maxHp, state.player.hp + _heal);
        if(typeof refreshPlayerStats === 'function') refreshPlayerStats();
        ex.mode = 'healing';
        ex._healCdUntil = now + 2000;
        ex._currentSpeed = 0;
        if(typeof heroAnim !== 'undefined'){
          heroAnim.name = 'heal_melee';
          heroAnim.frame = 0;
          heroAnim.lastUpdate = now;
          heroAnim.animStart = null;
          heroAnim.forcedEnd = now + 2100;
          heroAnim.eqSlot = '__hidden__';
          heroAnim.healItem = _hc.id;
        }
        if(typeof pushLog === 'function'){
          pushLog('<span class="pl">玩家</span> 使用 ' + fmtItemSpan(_hc.id, _hc.rarity, 1) + ' 恢復至 ' + Math.round(state.player.hp) + ' 生命', [], 'explore');
        }
        return;
      }
    }
  }

  const dt = Math.min(0.1, (now - (ex.lastTick || now)) / 1000);
  ex.lastTick = now;

  const _inVehCombat = !!(window._combat && window._combat.active && window._combat.sceneType === 'vehicle');
  let ts = _getPlayerWalkSpeed();
  if(b && b.active && (b.phase === 'support' || b.phase === 'center')){
    ts = _computeTS(now);
  } else if(ex._lootingUntil > 0 && now < ex._lootingUntil && !_inVehCombat) ts = 0;
  else if(window._combat && window._combat.active && window._combat.sceneType === 'foot'){
    const _cc = window._combat;
    if(_cc._hurtUntil && now < _cc._hurtUntil) ts = 0;
    else ts = (typeof window._playerShouldStandStill === 'function' && window._playerShouldStandStill()) ? 0 : 1.4;
  }
  else if(b && b.active) ts = _computeTS(now);

  /* [v178 R3] 缺陷B：載具戰期間 ex.combatEvent 被鎖住，也要允許拼新地圖，
     否則載具 22m/s 跑幾十秒就把整張地圖甩到身後 → 後半段無敵人 */
  const _vehCombatActive178 = !!(window._combatActive && window._combat
    && window._combat.sceneType === 'vehicle' && !window._combat.resolved);
  if(!ex.combatEvent || _vehCombatActive178){
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
  if(window._combat && window._combat.allies){
    if(window._combat.allies[0]){
      window._combat.allies[0].worldX = ex.worldX;
    }
    /* [v191 H38] 战斗结束后载员 worldX 不再强制 = ex.worldX。
       原代码把 _mode = null 的载员 worldX 设成玩家位置 → 载员瞬移。
       改为：只前进、不后退，追向玩家（2.8 m/s，chasing → run 动画）。
       如果载员在玩家前方（worldX > ex.worldX），不动。
       如果已在 ±0.5m 内，worldX = ex.worldX（跟玩家同步）。 */
    for(let _ai = 1; _ai < window._combat.allies.length; _ai++){
      const _a = window._combat.allies[_ai];
      if(_a.hp <= 0 || _a._retreating) continue;
      if(!_a._mode){
        if(_a.worldX < ex.worldX - 0.5){
          _a._mode = 'chasing';
          _a.worldX = Math.min(ex.worldX, _a.worldX + 2.8 * dt);
        } else if(_a.worldX > ex.worldX + 0.5){
          /* 载员在玩家前方，不动（不后退） */
        } else {
          _a.worldX = ex.worldX;
        }
      }
    }
  }
  if(_delta > 0.001 && typeof window._combatPlayerAdvance === 'function') window._combatPlayerAdvance(_delta);
  _updateCorpsesLayout();

  /* [v194 3] 無戰鬥時載員 worldX 三態：超前等待、落後追趕、到位跟隨。 */
  if(!window._combat || !window._combat.active){
    const _pfNC = ex.passengersFollowing || [];
    if(_pfNC.length){
      const _dtNC = Math.min(0.1, (now - (ex._lastNoCombatTick || now)) / 1000);
      ex._lastNoCombatTick = now;
      for(let _piNC = 0; _piNC < _pfNC.length; _piNC++){
        const _itNC = _pfNC[_piNC];
        if(_itNC._retreating) continue;
        if(typeof _itNC.worldX !== 'number') _itNC.worldX = ex.worldX;
        const _relWXNC = _itNC.worldX - ex.worldX;
        if(_relWXNC > 0.01){
          _itNC._standingWait = true;
          _itNC._forceRunAnim = false;
        } else if(_relWXNC < -0.01){
          _itNC.worldX = Math.min(ex.worldX, _itNC.worldX + 2.8 * _dtNC);
          _itNC._standingWait = false;
          _itNC._forceRunAnim = true;
        } else {
          _itNC.worldX = ex.worldX;
          _itNC._standingWait = false;
          _itNC._forceRunAnim = false;
        }
      }
    } else {
      ex._lastNoCombatTick = now;
    }
  }

  if(ex._lootingUntil > 0 && now < ex._lootingUntil){
    if(typeof heroAnim !== 'undefined' && heroAnim.name !== 'idle'){ heroAnim.name = 'idle'; heroAnim.frame = 0; heroAnim.lastUpdate = now; }
  } else {
    if(typeof heroAnim !== 'undefined' && heroAnim.name === 'idle' && ex._currentSpeed > 0.5){ heroAnim.name = 'walk'; heroAnim.frame = 0; heroAnim.lastUpdate = now; }
  }

  /* [v181 G5] 拾取改为「逐 corpse 逐 event」：玩家经过尸体时拾取它对应的 event。
     同一 event 的多个 corpse 共享一份掉落，玩家第一次经过时全部拾取。
     原逻辑是 _pendingLootEvents 累积全部、一次拾完——变成「很久后一次拾一大批」。 */
  if(!_inVehCombat && ex.corpses.length > 0 && !(ex._lootingUntil > 0 && now < ex._lootingUntil)){
    for(let ci = 0; ci < ex.corpses.length; ci++){
      const corpse = ex.corpses[ci];
      if(!corpse.ev || corpse.ev._corpseLooted) continue;
      const rel = corpse.worldX - ex.worldX;
      if(rel <= 0 && Math.abs(rel) <= 0.5){
        const ev = corpse.ev;
        ev._corpseLooted = true;
        ev.cleared = true;
        _lootVictory([ev]);
        /* 从 _pendingLootEvents 移除该事件，防止后续被处理 */
        if(ex._pendingLootEvents){
          ex._pendingLootEvents = ex._pendingLootEvents.filter(function(e){ return e !== ev; });
          if(ex._pendingLootEvents.length === 0) ex._pendingLootEvents = null;
        }
        /* 暂停 1 秒模拟搜尸（原 2s → 1s，因为现在是逐次拾取而非一次一大批） */
        ex._lootingUntil = now + 1000;
        /* [v182 G12] 拾取后不删除 corpse DOM——尸体继续随背景左移，
           由 _updateCorpsesLayout 在 left + drawW < -50 时自然移除。
           用户明确要求：拾取后尸体保持世界位置，正常滚出屏幕。
           ev._corpseLooted = true 已保证同一事件不会被重复拾取。 */
        break;
      }
    }
  }

  const prev = ex._curNodeIdx || 0;
  const curr = _curNodeIdx();
  if(prev !== curr){ ex._curNodeIdx = curr; ex._bgDirty = true; }
  if(ex._bgDirty) _renderBg();
  _updateBgTransform();

  if(!ex.combatEvent && (ex.mode === 'walk' || ex.mode === 'vehicle') && !(ex._lootingUntil > 0 && now < ex._lootingUntil) && !(window._combat && window._combat.active)){
    const mode = state.preferences.actionMode || 'attack';
    const pd = (typeof PLAYER_DETECTABLE_R !== 'undefined') ? PLAYER_DETECTABLE_R[mode] : 100;
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
        if(_ev.content && _ev.content[0] && _ev.content[0].detectableR) _ed = _ev.content[0].detectableR;
        const _dr = Math.max(pd, _ed);
        if(_d <= _dr && _d <= _maxRange && _d < _bestD){ _bestEv = _ev; _bestD = _d; }
      }
    }
    if(_bestEv) _trigger(_bestEv);
  }

  /* 射擊動畫過期後切回 walk/idle，修「一邊射擊一邊滑行」 */
  if(typeof heroAnim !== 'undefined'){
    const _isFireAnim = heroAnim.name === 'fire_primary' || heroAnim.name === 'fire_secondary';
    const _fireExpired = _isFireAnim && heroAnim.forcedEnd && now > heroAnim.forcedEnd;
    if(_fireExpired){
      heroAnim.name = (ex._currentSpeed > 0.5) ? 'walk' : 'idle';
      heroAnim.frame = 0;
      heroAnim.lastUpdate = now;
    }
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
    ex._bgDirty = true;
    _cleanPC();
    return;
  }
  ex.worldX = persisted.worldX || 0;
  ex.mode = 'walk';
  ex.active = true;
  ex.deadUntil = 0;
  ex.combatEvent = null;
  ex._curNodeIdx = 0;
  ex._bgDirty = true;
  if(!_sameRegion){
    ex.corpses = [];
    ex._lootingUntil = 0;
    ex._pendingLootEvents = null;
    ex._corpseLootTriggered = false;
  } else {
    /* rev-fix-explore-resume: 同區域返回，若有待拾取戰利品立即結算 */
    if(ex._pendingLootEvents && ex._pendingLootEvents.length){
      for(const _ev of ex._pendingLootEvents){
        if(!_ev.cleared) _ev.cleared = true;
      }
      if(typeof _lootVictory === 'function') _lootVictory(ex._pendingLootEvents);
      ex._pendingLootEvents = null;
      /* [v181b G5c] 清 corpses 前先移除所有 DOM，避免残留 */
      for(let _ci = 0; _ci < ex.corpses.length; _ci++){
        try { ex.corpses[_ci].wrap.remove(); } catch(e){}
      }
      ex.corpses = [];
      ex._lootingUntil = 0;
      ex._corpseLootTriggered = false;
    }
  }
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
      if(dmg.parts){ dmg.parts.engine = 800; dmg.parts.tracks = 1000; dmg.parts.turret = 400; }
      if(dmg.weapons){ for(const _wid in dmg.weapons){ dmg.weapons[_wid].hp = dmg.weapons[_wid].max; } }
      if(dmg.members){ dmg.members.driver = 1; dmg.members.gunner = 1; dmg.members.commander = 1; dmg.members.player = 1; }
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
    /* rev-fix-map-region: activeRegion 不在激活列表中時切換到首個有效區域 */
    if(!state.activeRegion || rgs.indexOf(state.activeRegion) === -1){
      state.activeRegion = rgs[0] || '廢棄工廠';
    }
    const region = state.activeRegion;
    const ex = window._explore;
    const _needStart = (!ex.active) || (ex.region !== region);
    if(_needStart || !z1.querySelector('.scene')){
      z1.innerHTML = '<div class="scene"><div class="bg-scroll" style="--spd:10s"><div class="bg-track"><div class="bg-layer"></div><div class="bg-layer"></div></div></div><div class="bg-fade" id="explore-bg-fade" style="opacity:0"></div><div class="groundline"></div><div class="explore-fx" id="explore-fx"></div><canvas id="hero-canvas" class="hero-canvas"></canvas><div class="zone-title">🧭 ' + region.replace(/II$/,' II') + '</div><div class="zone-badge">' + (state.preferences.actionMode === 'attack' ? '⚔ 攻擊前進' : '🥷 潛行蒐集') + '</div></div>';
    }
    if(_needStart){
      try { _startMap(region); } catch(e){ console.warn('[explore startMap]', e); }
    } else {
      ex._bgDirty = true;
      if(!ex.passengersFollowing) ex.passengersFollowing = [];
    }
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

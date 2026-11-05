/* v17.5 hotfix batch applied */

'use strict';

window._combat = null;
window._combatActive = false;

const REACTION_FIRST_MS = 300;
const REACTION_SECOND_MS = 600;
const SECOND_HIT_RATE = 0.8;
const DEATH_CD_MS = 60000;

const FOOT_RANGE_DEFAULT = 15;
const FOOT_RANGE_SHORT = 20;

function _rangeOfWeaponDef(wd){
  if(!wd) return FOOT_RANGE_DEFAULT;
  if(wd.slot === 'melee') return 0.75;
  if(wd._shortRange) return FOOT_RANGE_SHORT;
  return (typeof WEAPON_COMBAT_RANGE !== 'undefined' && WEAPON_COMBAT_RANGE[wd.type]) || FOOT_RANGE_DEFAULT;
}

function _eRange(e){
  if(e.hasRPG && e.rpgAmmo > 0) return (typeof RPG_COMBAT_RANGE !== 'undefined') ? RPG_COMBAT_RANGE : 60;
  const w = e.primaryWeapon || e.secondaryWeapon;
  if(!w) return 8;
  const wd = WEAPONS[w.id];
  return _rangeOfWeaponDef(wd);
}

function _start(cfg){
  _cleanup();
  const z1 = document.getElementById('zone1');
  const cw = z1 ? z1.clientWidth : 400;
  const ch = z1 ? z1.clientHeight : 500;
  const sm = computeScreenMetrics(cw, ch);
  const now = performance.now();
  const pf = (cfg.firstSide === 'player');

  window._combat = {
    active: true,
    sceneType: cfg.sceneType || 'foot',
    playerFirst: pf,
    allies: cfg.allies || [],
    enemies: cfg.enemies || [],
    bullets: [],
    floats: [],
    lastTick: now,
    playerFireReadyAt: now + (pf ? REACTION_FIRST_MS : REACTION_SECOND_MS),
    enemyFireReadyAt: now + (pf ? REACTION_SECOND_MS : REACTION_FIRST_MS),
    resolved: false,
    victory: null,
    lootUntil: 0,
    onResolve: cfg.onResolve || null,
    onVictoryStart: cfg.onVictoryStart || null,
    sm: sm,
    playerCanvas: null,
    playerCtx: null,
    startLogAt: now,
    _playerAnimUntil: 0,
    _playerReloadEnd: 0,
    _playerSwitchEnd: 0,
    _switchAnim: null,
    _fireAnim: null,
    _hurtUntil: 0,
    _playerMag: window._playerMagPersistent || (window._playerMagPersistent = { inMag: 0, ammoRef: null, weaponId: null })
  };

  for(let i = 0; i < window._combat.allies.length; i++){
    window._combat.allies[i]._nextFireAt = window._combat.playerFireReadyAt;
  }
  for(let j = 0; j < window._combat.enemies.length; j++){
    const e = window._combat.enemies[j];
    e._nextFireAt = window._combat.enemyFireReadyAt;
    e._initWorldX = e.worldX;
  }

  window._combatActive = true;
  _setupCanvas();

  if(typeof pushLog === 'function'){
    const names = cfg.enemies.map(function(e){ return (ENEMIES[e.eid] || { name: e.eid }).name; }).join('、');
    pushLog('<span class="pl">玩家</span> 遭遇 ' + cfg.enemies.length + ' 名敵人（' + names + '）', [], 'explore');
  }

  requestAnimationFrame(_loop);
}

function _setupCanvas(){
  const z1 = document.getElementById('zone1');
  if(!z1) return;
  let c = document.getElementById('combat-overlay');
  if(!c){
    c = document.createElement('canvas');
    c.id = 'combat-overlay';
    c.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:9;';
    z1.appendChild(c);
  }
  const w = z1.clientWidth, h = z1.clientHeight;
  if(c.width !== w) c.width = w;
  if(c.height !== h) c.height = h;
  window._combat.playerCanvas = c;
  window._combat.playerCtx = c.getContext('2d');
  window._combat.sm = computeScreenMetrics(w, h);

  let fr = document.getElementById('combat-frames');
  if(!fr){
    fr = document.createElement('div');
    fr.id = 'combat-frames';
    fr.style.cssText = 'position:absolute;top:36px;right:8px;width:48px;pointer-events:none;z-index:22;display:flex;flex-direction:column;gap:5px;';
    z1.appendChild(fr);
  }
  let fl = document.getElementById('combat-frames-left');
  if(!fl){
    fl = document.createElement('div');
    fl.id = 'combat-frames-left';
    fl.style.cssText = 'position:absolute;top:36px;left:8px;width:48px;pointer-events:none;z-index:22;display:flex;flex-direction:column;gap:5px;';
    z1.appendChild(fl);
  }
}

function _cleanup(){
  window._combatActive = false;
  window._combat = null;
  const c = document.getElementById('combat-overlay');
  if(c) c.remove();
  const f = document.getElementById('combat-frames');
  if(f) f.remove();
  const fl = document.getElementById('combat-frames-left');
  if(fl) fl.remove();
  if(typeof heroAnim !== 'undefined' && heroAnim.name !== 'walk' && heroAnim.name !== 'idle'){
    heroAnim.name = 'walk';
    heroAnim.frame = 0;
    heroAnim.lastUpdate = performance.now();
  }
}

window._combatCleanup = _cleanup;

function _loop(now){
  const c = window._combat;
  if(!c) return;
  if(!c.active){ _cleanup(); return; }

  const _btrActive = !!(window.BTRSupport && window.BTRSupport.active);
  if(typeof currentTab !== 'undefined' && currentTab !== 'explore' && currentTab !== 'combat'){
    if(!_btrActive){ _cleanup(); return; }
  }

  const dt = Math.min(0.05, (now - c.lastTick) / 1000);
  c.lastTick = now;

  if(!c.resolved){
    _tickAI(dt, now);
    _tickBullets(dt);
    _updatePAnim(now);

    let ea = false, aa = false;
    for(let i = 0; i < c.enemies.length; i++) if(c.enemies[i].hp > 0){ ea = true; break; }
    for(let j = 0; j < c.allies.length; j++) if(c.allies[j].hp > 0){ aa = true; break; }

    if(!ea) _resolve(true);
    else if(!aa){
      if(c._fromVehicleWreck && !c._enemiesRetreating){
        c._enemiesRetreating = true;
      }
      if(c._enemiesRetreating){
        let _allGone = true;
        for(let i = 0; i < c.enemies.length; i++){
          const e = c.enemies[i];
          if(e.hp > 0 && e.worldX > -12){
            e.worldX -= 10 * dt;
            _allGone = false;
          }
        }
        if(_allGone){
          _resolve(false);
        }
      } else {
        _resolve(false);
      }
    }
  } else {
    _tickBullets(dt);
    _updatePAnim(now);
    if(c.lootUntil > 0 && now >= c.lootUntil){
      const cb = c.onResolve, vic = c.victory;
      c.active = false;
      c.onResolve = null;
      _cleanup();
      if(typeof cb === 'function') cb(vic);
      return;
    }
  }

  if(typeof currentTab === 'undefined' || currentTab === 'explore' || currentTab === 'combat'){
    _render();
    _renderFrames();
  }

  requestAnimationFrame(_loop);
}

function _playHurt(now){
  const c = window._combat;
  if(!c || typeof heroAnim === 'undefined' || c.sceneType === 'vehicle') return;
  if(c._hurtUntil && now < c._hurtUntil) return;
  const a = GAME_ANIMS.hurt;
  if(!a) return;
  c._hurtUntil = now + Math.round(a.frameCount / a.fps * 1000);
  heroAnim.name = 'hurt';
  heroAnim.frame = 0;
  heroAnim.lastUpdate = now;
}

function _updatePAnim(now){
  const c = window._combat;
  if(!c || typeof heroAnim === 'undefined' || c.sceneType === 'vehicle') return;
  const p = c.allies[0];
  if(!p || !p.isPlayer) return;

  if(now < c._hurtUntil){
    if(heroAnim.name !== 'hurt'){ heroAnim.name = 'hurt'; heroAnim.frame = 0; heroAnim.lastUpdate = now; }
    return;
  }
  if(now < c._playerReloadEnd){
    if(heroAnim.name !== 'reload'){ heroAnim.name = 'reload'; heroAnim.frame = 0; heroAnim.lastUpdate = now; }
    return;
  }
  if(now < c._playerSwitchEnd && c._switchAnim){
    if(heroAnim.name !== c._switchAnim){ heroAnim.name = c._switchAnim; heroAnim.frame = 0; heroAnim.lastUpdate = now; }
    return;
  }
  if(now < c._playerAnimUntil && c._fireAnim){
    if(heroAnim.name !== c._fireAnim) heroAnim.name = c._fireAnim;
    return;
  }
  const ex = window._explore;
  const want = (ex && ex._currentSpeed > 0.5) ? 'walk' : 'idle';
  if(heroAnim.name !== want){ heroAnim.name = want; heroAnim.frame = 0; heroAnim.lastUpdate = now; }
}

function _playFire(now, isPrimary){
  const c = window._combat;
  if(!c || typeof heroAnim === 'undefined') return;
  const anim = isPrimary ? 'fire_primary' : 'fire_secondary';
  const a = GAME_ANIMS[anim];
  const dur = a ? Math.round((a.frameCount / a.fps) * 1000) : 250;
  c._fireAnim = anim;
  c._playerAnimUntil = now + dur;
  heroAnim.name = anim;
  heroAnim.frame = 0;
  heroAnim.lastUpdate = now;
  heroAnim.forcedEnd = now + dur;
}

function _playMeleeFire(now){
  const c = window._combat;
  if(!c || typeof heroAnim === 'undefined') return;
  const anim = 'attack_melee';
  const a = GAME_ANIMS[anim];
  const dur = a ? Math.round((a.frameCount / a.fps) * 1000) : 600;
  c._fireAnim = anim;
  c._playerAnimUntil = now + dur;
  heroAnim.name = anim;
  heroAnim.frame = 0;
  heroAnim.lastUpdate = now;
  heroAnim.forcedEnd = now + dur;
}

function _playReload(now){
  const c = window._combat;
  if(!c || typeof heroAnim === 'undefined') return;
  const ra = GAME_ANIMS.reload;
  const d = ra ? Math.round((ra.frameCount / ra.fps) * 1000) : 1000;
  c._playerReloadEnd = now + d;
  c._fireAnim = null;
  c._playerAnimUntil = 0;
  heroAnim.name = 'reload';
  heroAnim.frame = 0;
  heroAnim.lastUpdate = now;
}

function _playSwitch(now, toSecondary){
  const c = window._combat;
  if(!c || typeof heroAnim === 'undefined') return;
  const anim = toSecondary ? 'switch_secondary' : 'switch_melee';
  c._switchAnim = anim;
  c._playerSwitchEnd = now + 900;
  heroAnim.name = anim;
  heroAnim.frame = 0;
  heroAnim.lastUpdate = now;
}

function _tickAI(dt, now){
  const c = window._combat;
  if(!c) return;
  const p = c.allies[0];
  if(!p) return;
  const _isVeh = (c.sceneType === 'vehicle');

  for(let i = 0; i < c.enemies.length; i++){
    const e = c.enemies[i];
    if(e.hp <= 0) continue;
    if(_isVeh && (!isFinite(e.worldX) || e.worldX <= p.worldX + 2.0)){
      e.hp = 0;
      e.gone = true;
      continue;
    }
    const d = Math.abs(e.worldX - p.worldX);
    const r = _eRange(e);
    if(d > r && e.worldX > p.worldX){
      e.worldX -= Math.min(8, 25 * dt);
      if(e.worldX < p.worldX) e.worldX = p.worldX;
    }
    const d2 = Math.abs(e.worldX - p.worldX);
    if(d2 <= r && now >= e._nextFireAt) _enemyFire(e, now);
  }

  if(c.sceneType === 'vehicle') return;
  _autoFireFoot(now);
}

function _autoFireFoot(now){
  const c = window._combat, p = c.allies[0];
  if(!p) return;
  const alive = [];
  for(let i = 0; i < c.enemies.length; i++) if(c.enemies[i].hp > 0) alive.push(c.enemies[i]);
  if(!alive.length) return;

  let _playerTarget = null;

  if(p.isPlayer && now >= (p._nextFireAt || 0)){
    const w = _getPW();
    if(w && w.def){
      const r = _rangeOfWeaponDef(w.def);
      const ir = [];
      for(let a = 0; a < alive.length; a++) if(Math.abs(alive[a].worldX - p.worldX) <= r) ir.push(alive[a]);
      if(ir.length){
        ir.sort(function(x, y){ return Math.abs(x.worldX - p.worldX) - Math.abs(y.worldX - p.worldX); });
        const ok = _firePlayer(p, ir[0], now, w);
        if(ok) _playerTarget = ir[0];
        p._nextFireAt = now + (ok ? Math.max(120, 60000 / (w.def.rpm || 600)) : 800);
      }
    }
  }

  for(let ii = 1; ii < c.allies.length; ii++){
    const a2 = c.allies[ii];
    if(a2.hp <= 0 || a2._retreating || !a2.isPassenger || !a2.weapon || !a2.weapon.def) continue;
    if(now < (a2._nextFireAt || 0)) continue;
    const r2 = _rangeOfWeaponDef(a2.weapon.def);
    const ir2 = [];
    for(let b = 0; b < alive.length; b++) if(Math.abs(alive[b].worldX - a2.worldX) <= r2) ir2.push(alive[b]);
    if(!ir2.length) continue;
    ir2.sort(function(x, y){ return Math.abs(x.worldX - a2.worldX) - Math.abs(y.worldX - a2.worldX); });
    _firePassenger(a2, ir2[0], now, a2.weapon);
    a2._nextFireAt = now + Math.max(120, 60000 / (a2.weapon.def.rpm || 600));
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

function _ensureMag(w){
  const c = window._combat;
  if(!c) return false;
  const mg = c._playerMag;
  if(!mg) return false;
  if(mg.weaponId !== w.id){ mg.inMag = 0; mg.weaponId = w.id; mg.ammoRef = null; }
  if(mg.inMag > 0) return true;
  const ammo = (typeof pickAmmoByPreferenceOrOrder === 'function') ? pickAmmoByPreferenceOrOrder(w.def.cal, 'combat') : null;
  if(!ammo) return false;
  const take = Math.min(w.def.mag || 30, ammo.count);
  if(take <= 0) return false;
  invRemove(ammo.id, ammo.rarity, take);
  mg.ammoRef = { id: ammo.id, rarity: ammo.rarity, def: ammo.def || AMMO[ammo.id] };
  mg.inMag = take;
  return true;
}

function _getPlayerMuzzlePosFoot(){
  const fx = document.getElementById('combat-overlay');
  const W = fx ? fx.clientWidth : 400;
  const H = fx ? fx.clientHeight : 500;
  const mz = (typeof getExploreWeaponRightEdge === 'function') ? getExploreWeaponRightEdge(W, H) : null;
  if(mz) return { x: mz.x / W, y: mz.y / H };
  return { x: EXPLORE_HERO_X_RATIO, y: 0.6 };
}

function _getPassengerMuzzlePos(a){
  const c = window._combat;
  if(!c) return null;
  const fx = document.getElementById('combat-overlay');
  if(!fx) return { x: 0.35, y: 0.55 };
  const W = fx.clientWidth, H = fx.clientHeight;
  if(!W || !H) return { x: 0.35, y: 0.55 };
  const _pfArr = (window._explore && window._explore.passengersFollowing) || [];
  let _pfItem = null;
  for(let i = 0; i < _pfArr.length; i++){
    if(_pfArr[i].srv && a.srv && _pfArr[i].srv.id === a.srv.id){ _pfItem = _pfArr[i]; break; }
  }
  if(!_pfItem) return { x: 0.35, y: 0.55 };
  const _sxN = _pfItem.screenX;
  if(!a.weapon || !a.weapon.id || typeof getWeaponCfg !== 'function' || typeof computeWeaponCharLayout !== 'function'){
    return { x: _sxN + 0.02, y: 0.55 };
  }
  const _wid = a.weapon.id;
  const _slot = a.weapon.slot || 'primary';
  const cfg = getWeaponCfg(_slot, _wid);
  if(!cfg) return { x: _sxN + 0.02, y: 0.55 };
  const layout = computeWeaponCharLayout(cfg);
  if(!layout) return { x: _sxN + 0.02, y: 0.55 };
  const _wm = (typeof WEAPON_MUZZLE !== 'undefined') ? WEAPON_MUZZLE[resolveIconId(_wid)] : null;
  const _tr = cfg.trim;
  const cw = H * 1.2;
  const chh = H;
  const sc = chh * CHAR_HEIGHT_FACTOR / 386;
  const ORIG_FOOT_X = 200;
  const ORIG_FOOT_Y = 515;
  const _centerX = cw / 2;
  const _groundY = chh * 0.95;
  let _localX, _localY;
  if(_wm && _tr && _tr.w > 0 && _tr.h > 0 && layout.isTrimMode){
    const _baseW = layout.baseW;
    const _baseH = _tr.h * (cfg.scale || 1.0);
    const _mzLocalX = layout.anchorX + (_wm.x / _tr.w) * _baseW;
    const _mzLocalY = layout.anchorY - _baseH / 2 + (_wm.y / _tr.h) * _baseH;
    _localX = _centerX + sc * (_mzLocalX - ORIG_FOOT_X);
    _localY = _groundY + sc * (_mzLocalY - ORIG_FOOT_Y);
  } else {
    _localX = _centerX + sc * (layout.rightX - ORIG_FOOT_X);
    _localY = _groundY + sc * (layout.anchorY - ORIG_FOOT_Y);
  }
  const _fxLeft = _sxN * W - cw / 2;
  return {
    x: (_fxLeft + _localX) / W,
    y: _localY / H
  };
}

function _getEnemyMuzzlePos(e, p, isRPG){
  const fx = document.getElementById('combat-overlay');
  const W = fx ? fx.clientWidth : 400;
  const H = fx ? fx.clientHeight : 500;
  const c = window._combat;
  if(!c) return { x: 1.05, y: 0.55 };
  const sm = c.sm;
  const relRaw = e.worldX - p.worldX;
  const rel = isRPG ? (relRaw + 0.5) : relRaw;

  let sxPx = (EXPLORE_HERO_X_RATIO + (rel / sm.screenRightWorld) * (1 - EXPLORE_HERO_X_RATIO)) * W;
  if(rel <= 0) {
    sxPx = 0.02 * W;
  }

  const _wid = (isRPG && e.hasRPG) ? 'rpg'
             : (e.primaryWeapon && e.primaryWeapon.id) ? e.primaryWeapon.id
             : (e.secondaryWeapon && e.secondaryWeapon.id) ? e.secondaryWeapon.id
             : null;
  if(!_wid || typeof getWeaponCfg !== 'function' || typeof computeWeaponCharLayout !== 'function'){
    return { x: sxPx / W, y: 0.55 };
  }
  const _slot = (_wid === 'rpg') ? 'primary' : ((e.primaryWeapon && e.primaryWeapon.id === _wid) ? 'primary' : 'secondary');
  const cfg = getWeaponCfg(_slot, _wid);
  if(!cfg) return { x: sxPx / W, y: 0.55 };
  const layout = computeWeaponCharLayout(cfg);
  if(!layout) return { x: sxPx / W, y: 0.55 };
  const _wm = (typeof WEAPON_MUZZLE !== 'undefined') ? WEAPON_MUZZLE[resolveIconId(_wid)] : null;
  const _tr = cfg.trim;
  const sc = (H * CHAR_HEIGHT_FACTOR) / 386;
  const fy = H * 0.95;
  const ORIG_FOOT_X = 200;
  const ORIG_FOOT_Y = 515;
  let _localX, _localY;
  if(_wm && _tr && _tr.w > 0 && _tr.h > 0 && layout.isTrimMode){
    const _baseW = layout.baseW;
    const _baseH = _tr.h * (cfg.scale || 1.0);
    const _mzLocalX = layout.anchorX + (_wm.x / _tr.w) * _baseW;
    const _mzLocalY = layout.anchorY - _baseH / 2 + (_wm.y / _tr.h) * _baseH;
    _localX = sc * (_mzLocalX - ORIG_FOOT_X);
    _localY = sc * (_mzLocalY - ORIG_FOOT_Y);
  } else {
    _localX = sc * (layout.rightX - ORIG_FOOT_X);
    _localY = sc * (layout.anchorY - ORIG_FOOT_Y);
  }
  return {
    x: (sxPx - _localX) / W,
    y: (fy + _localY) / H
  };
}


function _firePlayer(p, t, now, w){
  const c = window._combat;
  if(!w || !w.def) return false;
  const isMelee = (w.def.slot === 'melee');

  if(c._playerReloadEnd && now < c._playerReloadEnd) return false;

  if(isMelee){
    let hr = (typeof getHitRate === 'function') ? getHitRate(w.def.type, '近戰', w.def.scopeBonus || 0) : 30;
    if(!c.playerFirst) hr *= SECOND_HIT_RATE;
    _playMeleeFire(now);
    const hits = (typeof getMeleeHits === 'function') ? getMeleeHits(w.def.rpm) : 1;
    const critRate = (typeof calcCritRate === 'function') ? calcCritRate(w.rarity, '一般') : 0.1;
    const critMult = (typeof calcCritMult === 'function') ? calcCritMult(w.rarity, '一般') : 1.5;
    const baseDmg = Math.round((w.def.dmg || 20) * (RARITY_MULT[w.rarity] || 1));
    for(let i = 0; i < hits; i++){
      if(t.hp <= 0) break;
      if(Math.random() * 100 < hr){
        let dmg = baseDmg;
        let isCrit = false;
        if(Math.random() < critRate){ dmg = Math.round(dmg * critMult); isCrit = true; }
        const res = applyDamage(t, dmg, w.def.penMM || 0, {
          armorProvider: function(part){ return (typeof getEnemyArmorMMForPart === 'function') ? getEnemyArmorMMForPart(t, part) : 0; }
        });
        const shown = res.hpLost > 0 ? res.hpLost : res.armorLost;
        _float(t, '-' + shown + (isCrit ? '!' : ''), isCrit ? 'crit' : (res.hpLost > 0 ? '' : 'armor'));
      }
    }
    if(t.hp <= 0){
      const _en = (typeof ENEMIES !== 'undefined' && ENEMIES[t.eid]) ? ENEMIES[t.eid].name : t.eid;
      const _wName = (w && w.def) ? w.def.name : (w && w.id ? w.id : '武器');
      const _wCls = (typeof rarityClass === 'function') ? rarityClass(w.rarity || '一般') : '';
      if(typeof pushLog === 'function'){
        pushLog('<span class="pl">玩家</span> 用 <span class="' + _wCls + '">' + _wName + '</span> 擊殺 <b class="r-' + (t.rarity || '一般') + '">' + _en + '</b>', [], 'explore');
      }
    }
    return true;
  }

  if(w.def.cal){
    if(!_ensureMag(w)){
      if(w.slot === 'primary' && state.player.equipped.secondary) _playSwitch(now, true);
      return false;
    }
    c._playerMag.inMag--;
  }

  let hr = (typeof getHitRate === 'function') ? getHitRate(w.def.type, '點射', w.def.scopeBonus || 0) : 30;
  if(!c.playerFirst) hr *= SECOND_HIT_RATE;

  _playFire(now, w.slot === 'primary');

  const mz = _getPlayerMuzzlePosFoot();
  const sm = c.sm;
  const rel = t.worldX - p.worldX;
  let tx;
  if(rel <= sm.screenRightWorld){
    tx = EXPLORE_HERO_X_RATIO + (rel / sm.screenRightWorld) * (1 - EXPLORE_HERO_X_RATIO);
  } else {
    tx = 1.05;
  }

  const hit = Math.random() * 100 < hr;
  const _tx = hit ? tx : (tx + 0.15);

  const _pBulletRar = (w.def.slot === 'throwable')
    ? (w.rarity || '一般')
    : ((c._playerMag && c._playerMag.ammoRef && c._playerMag.ammoRef.rarity) ? c._playerMag.ammoRef.rarity : '一般');

  const distPx = Math.abs(t.worldX - p.worldX) * sm.bgPixelsPerMeter;
  const _approachPx = Math.max(0, (window._explore && window._explore._currentSpeed) || 0) * sm.bgPixelsPerMeter;
  const duration = Math.max(50, (distPx / (2000 + _approachPx)) * 1000);

  c.bullets.push({
    sx: mz.x, sy: mz.y, tx: _tx, ty: 0.55, t: 0,
    start: performance.now(), duration: duration,
    enemy: false, hit: hit, rarity: _pBulletRar,
    big: (w.def.slot === 'throwable'), arc: (w.def.slot === 'throwable'),
    _target: t,
    _onHit: function() {
      if(!hit || t.hp <= 0) return;
      const a = c._playerMag.ammoRef;
      const ammoDmg = a ? a.def.dmg : (w.def.dmg || 20);
      const ammoPenMM = a ? (a.def.penMM || 0) : (w.def.penMM || 0);
      const critRate = calcCritRate(w.rarity, a ? a.rarity : '一般');
      const critMult = calcCritMult(w.rarity, a ? a.rarity : '一般');
      const crit = Math.random() < critRate;
      const baseDmg = Math.round(ammoDmg * (crit ? critMult : 1));

      const res = applyDamage(t, baseDmg, ammoPenMM, {
        armorProvider: function(part){ return (typeof getEnemyArmorMMForPart === 'function') ? getEnemyArmorMMForPart(t, part) : 0; }
      });

      const shown = res.hpLost > 0 ? res.hpLost : res.armorLost;
      _float(t, '-' + shown + (crit ? '!' : ''), crit ? 'crit' : (res.hpLost > 0 ? '' : 'armor'));
      if(t.hp > 0){
        const _hurtDurP = (typeof GAME_ANIMS !== 'undefined' && GAME_ANIMS.hurt) ? Math.round(GAME_ANIMS.hurt.frameCount / GAME_ANIMS.hurt.fps * 1000) : 500;
        t._hurtStart = performance.now();
        t._hurtUntil = performance.now() + _hurtDurP;
      }

      if(t.hp <= 0){
        const _en = (typeof ENEMIES !== 'undefined' && ENEMIES[t.eid]) ? ENEMIES[t.eid].name : t.eid;
        const _wName = (w && w.def) ? w.def.name : (w && w.id ? w.id : '武器');
        const _wCls = (typeof rarityClass === 'function') ? rarityClass(w.rarity || '一般') : '';
        if(typeof pushLog === 'function'){
          pushLog('<span class="pl">玩家</span> 用 <span class="' + _wCls + '">' + _wName + '</span> 擊殺 <b class="r-' + (t.rarity || '一般') + '">' + _en + '</b>', [], 'explore');
        }
      }
    }
  });

  if(w.def.cal && c._playerMag.inMag <= 0){
    _playReload(now);
  }

  return true;
}


function _consumePassengerAmmo(a, cal){
  if(a.ammoPouch && a.ammoPouch.count > 0){
    const d = AMMO[a.ammoPouch.ammoId];
    if(d && d.cal === cal){ a.ammoPouch.count--; return { id: a.ammoPouch.ammoId, rarity: a.ammoPouch.rarity, def: d }; }
  }
  if(a._publicPool){
    for(let i = 0; i < a._publicPool.length; i++){
      const p = a._publicPool[i];
      if(p.cal === cal && p.count > 0){
        p.count--;
        if(p._src) p._src.count = p.count;
        return { id: p.id, rarity: p.rarity, def: AMMO[p.id] };
      }
    }
  }
  return null;
}

function _firePassenger(a, t, now, w){
  const c = window._combat;
  if(!w || !w.def) return;
  const def = w.def;

  if(!a._magazine || a._magazine.weaponId !== w.id){
    a._magazine = { weaponId: w.id, inMag: 0, ammoId: null, ammoRarity: null, def: null };
    a._magInit = false;
    a._reloadEnd = 0;
    a._reloadAnimStart = 0;
  }

  if(a._reloadEnd && now < a._reloadEnd) return;

  if(a._magazine.inMag <= 0){
    const magSize = def.mag || 30;
    const firstAmmo = _consumePassengerAmmo(a, def.cal);
    if(!firstAmmo){
      a._retreating = true;
      if(typeof pushLog === 'function'){
        pushLog('<span class="lose">' + (typeof servantLabel === 'function' ? servantLabel(a.srv) : '載員') + '</span> 彈藥耗盡，撤退', [], 'explore');
      }
      return;
    }
    let taken = 1;
    for(let i = 1; i < magSize; i++){
      if(a.ammoPouch && a.ammoPouch.count > 0 && a.ammoPouch.ammoId === firstAmmo.id && a.ammoPouch.rarity === firstAmmo.rarity){
        a.ammoPouch.count--;
        taken++;
        continue;
      }
      let _found = false;
      if(a._publicPool){
        for(let j = 0; j < a._publicPool.length; j++){
          const p = a._publicPool[j];
          if(p.id === firstAmmo.id && p.rarity === firstAmmo.rarity && p.cal === def.cal && p.count > 0){
            p.count--;
            if(p._src) p._src.count = p.count;
            taken++;
            _found = true;
            break;
          }
        }
      }
      if(!_found) break;
    }
    a._magazine.inMag = taken;
    a._magazine.ammoId = firstAmmo.id;
    a._magazine.ammoRarity = firstAmmo.rarity;
    a._magazine.def = firstAmmo.def;
    if(a._magInit){
      a._reloadEnd = now + 1000;
      a._reloadAnimStart = performance.now();
      if(a.srv){ a.srv._standStart = Date.now(); a.srv._standUntil = Date.now() + 150; }
      return;
    }
    a._magInit = true;
  }

  a._magazine.inMag--;
  const am = { id: a._magazine.ammoId, rarity: a._magazine.ammoRarity, def: a._magazine.def };

  const _perfNow = performance.now();
  const _wallNow = Date.now();
  a._fireAnimStart = _perfNow;
  a._fireAnimUntil = _perfNow + 250;
  if(a.srv){ a.srv._standStart = _wallNow; a.srv._standUntil = _wallNow + 150; }

  let hr = (typeof servantHitRate === 'function') ? servantHitRate(a.srv, '點射', 0) : 20;
  if(!c.playerFirst) hr *= SECOND_HIT_RATE;

  const sm = c.sm;
  const mz = _getPassengerMuzzlePos(a);
  if(!mz) return;

  const rel = t.worldX - a.worldX;
  let tx;
  if(rel <= sm.screenRightWorld){
    tx = EXPLORE_HERO_X_RATIO + (rel / sm.screenRightWorld) * (1 - EXPLORE_HERO_X_RATIO);
  } else {
    tx = 1.05;
  }

  const hit = Math.random() * 100 < hr;
  const _tx = hit ? tx : (tx + 0.15);

  const distPx = Math.abs(t.worldX - a.worldX) * sm.bgPixelsPerMeter;
  const _approachPx = Math.max(0, (window._explore && window._explore._currentSpeed) || 0) * sm.bgPixelsPerMeter;
  const duration = Math.max(50, (distPx / (2000 + _approachPx)) * 1000);

  c.bullets.push({
    sx: mz.x, sy: mz.y, tx: _tx, ty: 0.55, t: 0,
    start: performance.now(), duration: duration,
    enemy: false, hit: hit, rarity: (am && am.rarity) ? am.rarity : '一般',
    _target: t,
    _onHit: function() {
      if(!hit || t.hp <= 0) return;
      const ammoDmg = am.def.dmg;
      const ammoPenMM = am.def.penMM || 0;
      const _wRar = w.rarity || '一般';
      const _aRar = am.rarity || '一般';
      const _cr = (typeof servantCritRate === 'function') ? servantCritRate(_wRar, _aRar) : 0.1;
      const _cm = (typeof servantCritMult === 'function') ? servantCritMult(_wRar, _aRar) : 1.5;
      const crit = Math.random() < _cr;
      const baseDmg = Math.round(ammoDmg * (crit ? _cm : 1));

      const res = applyDamage(t, baseDmg, ammoPenMM, {
        armorProvider: function(part){ return (typeof getEnemyArmorMMForPart === 'function') ? getEnemyArmorMMForPart(t, part) : 0; }
      });

      const shown = res.hpLost > 0 ? res.hpLost : res.armorLost;
      _float(t, '-' + shown + (crit ? '!' : ''), crit ? 'crit' : (res.hpLost > 0 ? '' : 'armor'));
      if(t.hp > 0){
        const _hurtDurPs = (typeof GAME_ANIMS !== 'undefined' && GAME_ANIMS.hurt) ? Math.round(GAME_ANIMS.hurt.frameCount / GAME_ANIMS.hurt.fps * 1000) : 500;
        t._hurtStart = performance.now();
        t._hurtUntil = performance.now() + _hurtDurPs;
      }

      if(t.hp <= 0){
        const eName = (typeof ENEMIES !== 'undefined' && ENEMIES[t.eid]) ? ENEMIES[t.eid].name : t.eid;
        const _wName = (w && w.def) ? w.def.name : (w && w.id ? w.id : '武器');
        const _wCls = (typeof rarityClass === 'function') ? rarityClass(w.rarity || '一般') : '';
        if(typeof pushLog === 'function'){
          pushLog('<span class="win">' + (typeof servantLabel === 'function' ? servantLabel(a.srv) : '載員') + '</span> 用 <span class="' + _wCls + '">' + _wName + '</span> 擊殺 <b class="r-' + (t.rarity || '一般') + '">' + eName + '</b>', [], 'explore');
        }
        if(typeof servantAddExp === 'function') servantAddExp(a.srv, 3);
      }
    }
  });
}


function _enemyFire(e, now){
  const c = window._combat;
  if(!c) return;
  if(e._reloadEnd && now < e._reloadEnd) return;

  const aliveAllies = [];
  for(let i = 0; i < c.allies.length; i++){ if(c.allies[i].hp > 0) aliveAllies.push(c.allies[i]); }
  if(!aliveAllies.length) return;

  const p = aliveAllies[Math.floor(Math.random() * aliveAllies.length)];

  if(e.grenade && e.grenade.count > 0 && Math.random() < 0.15){
    e.grenade.count--;
    _enemyThrowGrenade(e, p, now);
    e._nextFireAt = now + 1500;
    return;
  }

  if(e.hasRPG && e.rpgAmmo > 0 && Math.abs(e.worldX - p.worldX) <= (typeof RPG_COMBAT_RANGE !== 'undefined' ? RPG_COMBAT_RANGE : 60)){
    e.rpgAmmo--;
    _enemyFireRPG(e, p, now);
    e._nextFireAt = now + 5000;
    return;
  }

  let w = e.primaryWeapon || e.secondaryWeapon;
  if(e.primaryWeapon && e.primaryWeapon.ammoCount <= 0 && e.secondaryWeapon){
    e.primaryWeapon = e.secondaryWeapon;
    e.secondaryWeapon = null;
    w = e.primaryWeapon;
  }
  if(!w) return;
  if(w.ammoCount !== undefined && w.ammoCount <= 0){
    e._reloadStart = now;
    e._reloadEnd = now + 1000;
    w.ammoCount = 30;
    e._nextFireAt = now + 1000;
    return;
  }
  if(w.ammoCount !== undefined) w.ammoCount--;

  e._fireAnimStart = now;
  e._fireAnimUntil = now + 250;

  const mz = _getEnemyMuzzlePos(e, p);
  const px = EXPLORE_HERO_X_RATIO;

  const _hb = p.isVehicle ? 0.25 : (e.hitBase || 0.55);
  const hc = _hb * (c.playerFirst ? SECOND_HIT_RATE : 1);

  const hit = Math.random() < hc;
  const tx = hit ? px : (px - 0.5);

  const _wdX = (typeof WEAPONS !== 'undefined' && w.id && WEAPONS[w.id]) ? WEAPONS[w.id] : null;
  const _rpmX = _wdX ? (_wdX.rpm || 600) : 600;
  e._nextFireAt = now + Math.max(200, 60000 / _rpmX);

  const distPx = Math.abs(p.worldX - e.worldX) * c.sm.bgPixelsPerMeter;
  const _approachPx = Math.max(0, (window._explore && window._explore._currentSpeed) || 0) * c.sm.bgPixelsPerMeter;
  const duration = Math.max(50, (distPx / (1200 + _approachPx)) * 1000);

  c.bullets.push({
    sx: mz.x, sy: mz.y, tx: tx, ty: 0.55, t: 0,
    start: performance.now(), duration: duration,
    enemy: true, hit: hit,
    rarity: (w && w.ammoId && typeof AMMO !== 'undefined' && AMMO[w.ammoId]) ? (AMMO[w.ammoId].rarity || '一般') : '一般',
    _target: p,
    _onHit: function() {
      if(!hit || p.hp <= 0) return;
      const _baseDmg = w.dmg != null ? w.dmg : (e.dmg != null ? e.dmg : 10);
      const dmg = (typeof rndInt === 'function') ? rndInt(_baseDmg - 5, _baseDmg + 5) : _baseDmg;
      const penMM = (AMMO[w.ammoId] && AMMO[w.ammoId].penMM) || e.penMM || 0;

      if(p.isVehicle){
        if(typeof window._vHitVehicle === 'function'){
          const _eNameV = (typeof ENEMIES !== 'undefined' && ENEMIES[e.eid]) ? ENEMIES[e.eid].name : e.eid;
          const _wNameV = (w && w.id && typeof WEAPONS !== 'undefined' && WEAPONS[w.id]) ? WEAPONS[w.id].name : (w && w.id ? w.id : '武器');
          const _wRarV = (w && w.rarity) || '一般';
          window._vHitVehicle(p, dmg, penMM, w.ammoId || 'unknown', _eNameV, _wNameV, _wRarV);
        }
        return;
      }

      if(p.isPlayer){
        const res = applyDamage({ hp: p.hp, armor: p.armor }, dmg, penMM, {
          armorProvider: function(part){ return (typeof getPlayerArmorMMForPart === 'function') ? getPlayerArmorMMForPart(part) : 0; }
        });
        p.hp = Math.max(0, p.hp - res.hpLost);
        p.armor = Math.max(0, p.armor - res.armorLost);
        state.player.hp = p.hp;
        state.player.armor = p.armor;
        _playHurt(performance.now());
        _float(p, '-' + (res.hpLost + res.armorLost), '');
        return;
      }

      if(p.isPassenger && p.srv){
        const res = applyDamage({ hp: p.hp, armor: p.armor }, dmg, penMM, {
          armorProvider: function(part){ return (typeof getPassengerArmorMMForPart === 'function') ? getPassengerArmorMMForPart(p, part) : 0; }
        });
        p.hp = Math.max(0, p.hp - res.hpLost);
        p.armor = Math.max(0, p.armor - res.armorLost);
        if(p.hp <= 0){
          p.hp = 0;
          if(p.srv){ p.srv.hp = 0; p.srv.injuredUntil = Date.now() + 4 * 3600 * 1000; p.srv._injuredDown = true; }
          p._injuredDown = true;
          if(typeof pushLog === 'function'){
            const _eNameD = (typeof ENEMIES !== 'undefined' && ENEMIES[e.eid]) ? ENEMIES[e.eid].name : e.eid;
            const _wNameD = (w && w.id && typeof WEAPONS !== 'undefined' && WEAPONS[w.id]) ? WEAPONS[w.id].name : (w && w.id ? w.id : '武器');
            const _wRarD = (w && w.rarity) || '一般';
            const _wClsD = (typeof rarityClass === 'function') ? rarityClass(_wRarD) : '';
            pushLog('<span class="lose">' + _eNameD + '</span> 用 <span class="' + _wClsD + '">' + _wNameD + '</span> 擊倒 <b class="' + ((p.srv && typeof rarityClass === 'function') ? rarityClass(p.srv.rarity) : '') + '">' + (typeof servantLabel === 'function' ? servantLabel(p.srv) : '載員') + '</b>', [], 'explore');
          }
        }
        _float(p, '-' + res.hpLost, '');
      }
    }
  });
}


function _enemyFireRPG(e, p, now){
  const c = window._combat;
  if(!c) return;

  e._fireAnimStart = now;
  e._fireAnimUntil = now + 400;
  const mz = _getEnemyMuzzlePos(e, p, true);
  const px = EXPLORE_HERO_X_RATIO;
  const hit = Math.random() < 0.6;
  const tx = hit ? px : (px - 0.5);

  const rar = e.rpgRarity || e.rarity;
  const dmg = e.rpgDmg || (100 * (RARITY_MULT[rar] || 1));
  const penMM = e.rpgPenMM || 600;

  const distPx = Math.abs(p.worldX - e.worldX) * c.sm.bgPixelsPerMeter;
  const _approachPx = Math.max(0, (window._explore && window._explore._currentSpeed) || 0) * c.sm.bgPixelsPerMeter;
  const duration = Math.max(50, (distPx / (800 + _approachPx)) * 1000);

  c.bullets.push({
    sx: mz.x, sy: mz.y, tx: tx, ty: 0.55, t: 0,
    start: performance.now(), duration: duration,
    enemy: true, big: true, missile: true, hit: hit,
    rarity: rar, _target: p,
    _onHit: function() {
      if(!hit || p.hp <= 0) return;
      const critRate = calcCritRate(rar, rar);
      const critMult = calcCritMult(rar, rar);
      const crit = Math.random() < critRate;
      const baseDmg = Math.round(dmg * (crit ? critMult : 1));

      if(p.isVehicle){
        if(typeof window._vHitVehicle === 'function'){
          const _eNameR = (typeof ENEMIES !== 'undefined' && ENEMIES[e.eid]) ? ENEMIES[e.eid].name : e.eid;
          window._vHitVehicle(p, baseDmg, penMM, 'atgm', _eNameR, 'RPG', rar);
        }
        return;
      }

      if(p.isPlayer){
        const res = applyDamage({ hp: p.hp, armor: p.armor }, baseDmg, penMM, {
          armorProvider: function(part){ return (typeof getPlayerArmorMMForPart === 'function') ? getPlayerArmorMMForPart(part) : 0; }
        });
        p.hp = Math.max(0, p.hp - res.hpLost);
        p.armor = Math.max(0, p.armor - res.armorLost);
        state.player.hp = p.hp;
        state.player.armor = p.armor;
        _playHurt(performance.now());
        _float(p, '-' + (res.hpLost + res.armorLost), crit ? 'crit' : '');
      } else if(p.isPassenger && p.srv){
        const res = applyDamage({ hp: p.hp, armor: p.armor }, baseDmg, penMM, {
          armorProvider: function(part){ return (typeof getPassengerArmorMMForPart === 'function') ? getPassengerArmorMMForPart(p, part) : 0; }
        });
        p.hp = Math.max(0, p.hp - res.hpLost);
        p.armor = Math.max(0, p.armor - res.armorLost);
        if(p.hp <= 0){
          p.hp = 0;
          if(p.srv){ p.srv.hp = 0; p.srv.injuredUntil = Date.now() + 4 * 3600 * 1000; p.srv._injuredDown = true; }
          p._injuredDown = true;
          if(typeof pushLog === 'function'){
            const _eNameR2 = (typeof ENEMIES !== 'undefined' && ENEMIES[e.eid]) ? ENEMIES[e.eid].name : e.eid;
            const _wClsR2 = (typeof rarityClass === 'function') ? rarityClass(rar || '一般') : '';
            pushLog('<span class="lose">' + _eNameR2 + '</span> 用 <span class="' + _wClsR2 + '">RPG</span> 擊倒 <b class="' + ((p.srv && typeof rarityClass === 'function') ? rarityClass(p.srv.rarity) : '') + '">' + (typeof servantLabel === 'function' ? servantLabel(p.srv) : '載員') + '</b>', [], 'explore');
          }
        }
        _float(p, '-' + res.hpLost, crit ? 'crit' : '');
      }

      const mainWX = p.worldX;
      for(let i = 0; i < c.allies.length; i++){
        const a = c.allies[i];
        if(a === p) continue;
        if(a.hp <= 0) continue;
        const _dist = Math.abs(a.worldX - mainWX);
        if(_dist <= 3){
          const splash = Math.round(baseDmg * 0.2);
          a.hp = Math.max(0, a.hp - splash);
          if(a.isPlayer){ state.player.hp = a.hp; _playHurt(performance.now()); }
          if(a.isPassenger && a.hp <= 0 && a.srv){
            a.srv.hp = 0;
            a.srv.injuredUntil = Date.now() + 4 * 3600 * 1000;
            a._retreating = true;
          }
          _float(a, '-' + splash, '');
        }
      }
    }
  });
}


function _enemyThrowGrenade(e, p, now){
  const c = window._combat;
  if(!c) return;
  const gid = e.grenade && e.grenade.id;
  const gDef = WEAPONS[gid];
  if(!gDef) return;

  e._fireAnimStart = now;
  e._fireAnimUntil = now + 400;
  const mz = _getEnemyMuzzlePos(e, p);
  const px = EXPLORE_HERO_X_RATIO;

  const fragments = gDef.fragments || 1;
  const fragmentDamage = gDef.fragmentDamage || gDef.dmg || 0;
  const gRar = e.grenade.rarity || '一般';
  const gDmg = fragmentDamage * (RARITY_MULT[gRar] || 1);
  const hitRate = e.hitBase || 0.55;

  const distPx = Math.abs(p.worldX - e.worldX) * c.sm.bgPixelsPerMeter;
  const duration = Math.max(100, (distPx / 600) * 1000);

  c.bullets.push({
    sx: mz.x, sy: mz.y, tx: px, ty: 0.55, t: 0,
    start: performance.now(), duration: duration,
    enemy: true, big: true, arc: true, isGrenade: true, hit: true,
    rarity: gRar, _target: p,
    _onHit: function() {
      const targets = c.allies.filter(function(a){ return a.hp > 0; });
      const maxTargets = Math.min(4, targets.length);
      const slice = targets.slice(0, maxTargets);
      const _fragsPerTarget = Math.round(fragments * 0.25);

      for(let i = 0; i < slice.length; i++){
        const a = slice[i];
        let hitCount = 0;
        for(let f = 0; f < _fragsPerTarget; f++){
          if(Math.random() < hitRate) hitCount++;
        }
        if(hitCount === 0){ _float(a, 'MISS', 'miss'); continue; }
        const totalDmg = Math.round(gDmg * hitCount);
        a.hp = Math.max(0, a.hp - totalDmg);
        if(a.isPlayer){ state.player.hp = a.hp; _playHurt(performance.now()); }
        if(a.isPassenger && a.hp <= 0 && a.srv){
          a.srv.hp = 0;
          a.srv.injuredUntil = Date.now() + 4 * 3600 * 1000;
          a._retreating = true;
        }
        _float(a, '-' + totalDmg, '');
      }
    }
  });
}


function _tickBullets(dt){
  const c = window._combat;
  if(!c) return;
  const now = performance.now();
  if(!c.missileSmoke) c.missileSmoke = [];
  
  for(let i = c.bullets.length - 1; i >= 0; i--){
    const b = c.bullets[i];
    
    if(b.start && b.duration){
      b.t = (now - b.start) / b.duration;
    } else {
      b.t += dt * 5;
    }
    
    if(b.missile){
      const _bx = b.sx + (b.tx - b.sx) * b.t;
      const _by = b.sy + (b.ty - b.sy) * b.t;
      c.missileSmoke.push({ x: _bx, y: _by, age: 0, size: 0.015 + Math.random() * 0.010 });
    }
    
    if(b.t >= 1){
      if(!b.resolved){
        b.resolved = true;
        if(b._onHit) { try { b._onHit(); } catch(err){ console.error(err); } }
      }
      if(b.t > 2 || b.hit){
        c.bullets.splice(i, 1);
      }
    }
  }

  for(let k = c.missileSmoke.length - 1; k >= 0; k--){
    c.missileSmoke[k].age += dt;
    if(c.missileSmoke[k].age > 1.2) c.missileSmoke.splice(k, 1);
  }
  for(let j = c.floats.length - 1; j >= 0; j--){
    c.floats[j].age += dt;
    if(c.floats[j].age > 1.2) c.floats.splice(j, 1);
  }
}


function _float(t, text, cls){
  const c = window._combat;
  if(!c) return;
  const p = c.allies[0], px = p ? p.worldX : 0;
  const rel = t.worldX - px;
  const sm = c.sm;
  let sx;
  if(rel < 0) sx = 0.05;
  else {
    sx = EXPLORE_HERO_X_RATIO + (rel / sm.screenRightWorld) * (1 - EXPLORE_HERO_X_RATIO);
    if(sx > 0.95) sx = 0.95;
  }
  c.floats.push({ text: text, cls: cls || '', age: 0, x: sx, y: 0.12 });
}

window._rarityBulletColor = function(rarity){
  const map = { '破舊':'#b87333', '一般':'#e0e0e0', '庫存':'#4caf50', '精品':'#2196f3', '傳奇':'#ffb300' };
  return map[rarity] || '#ffb300';
};

function _render(){
  const c = window._combat;
  if(!c) return;
  if(!c.playerCanvas || !c.playerCanvas.isConnected){ _setupCanvas(); }
  if(!c.playerCtx) return;

  const ctx = c.playerCtx;
  const W = c.playerCanvas.width, H = c.playerCanvas.height;
  ctx.clearRect(0, 0, W, H);

  const px = c.allies[0] ? c.allies[0].worldX : 0;
  const sm = c.sm;
  const _renderNow = performance.now();

  for(let i = 0; i < c.enemies.length; i++){
    const e = c.enemies[i];
    const rel = e.worldX - px;
    if(rel > sm.screenRightWorld + 2) continue;
    const sx = (EXPLORE_HERO_X_RATIO + (rel / sm.screenRightWorld) * (1 - EXPLORE_HERO_X_RATIO)) * W;
    if(sx < -200 || sx > W + 200){
      continue;
    }
    const eh = H * CHAR_HEIGHT_FACTOR;
    const fy = H * 0.95;

    if(e.hp <= 0){
      if(!e._corpseSnapshot && !e._corpseFailed){
        try {
          e._corpseSnapshot = (typeof _renderEnemyCorpseCanvas === 'function') ? _renderEnemyCorpseCanvas(e, H) : null;
          if(!e._corpseSnapshot) e._corpseFailed = true;
        } catch(err){ e._corpseFailed = true; }
      }
      if(e._corpseSnapshot){
        const snap = e._corpseSnapshot;
        const dx = sx - snap.drawW / 2;
        const dy = fy - snap.drawH;
        try { ctx.drawImage(snap.canvas, dx, dy, snap.drawW, snap.drawH); } catch(err){}
      }
      continue;
    }

    let animName = 'idle';
    let animStart = _renderNow;
    if(e._hurtUntil && _renderNow < e._hurtUntil){
      animName = 'hurt';
      animStart = e._hurtStart || _renderNow;
    } else if(e._reloadEnd && _renderNow < e._reloadEnd){
      animName = 'reload';
      animStart = e._reloadStart || _renderNow;
    } else if(e._fireAnimUntil && _renderNow < e._fireAnimUntil){
      animName = 'fire_primary';
      animStart = e._fireAnimStart || _renderNow;
    }
    const frame = (typeof computeAnimFrame === 'function') ? computeAnimFrame(animName, animStart, _renderNow) : 0;

    const pwId = (e.hasRPG && e.rpgAmmo > 0) ? 'rpg'
               : (e.primaryWeapon && e.primaryWeapon.id) ? e.primaryWeapon.id
               : (e.secondaryWeapon && e.secondaryWeapon.id) ? e.secondaryWeapon.id
               : null;
    const eq = { head: e.helmet || null, top: e.body || null, primary: pwId };
    const eqR = { head: e.rarity || '一般', top: e.rarity || '一般', primary: e.rarity || '一般' };
    if(typeof _raidDrawHuman !== 'function') continue;
    ctx.save();
    try { _raidDrawHuman(ctx, sx, fy, eh / 386, eq, eqR, animName, frame, pwId ? 'primary' : null, 'enemy', true, false, null); } catch(err){}
    ctx.restore();
  }

  if(c.missileSmoke){
    for(let si = 0; si < c.missileSmoke.length; si++){
      const s = c.missileSmoke[si];
      const sa = 1 - s.age / 1.2;
      if(sa <= 0) continue;
      const sr = s.size * W * (1 + s.age * 1.5);
      ctx.save();
      ctx.globalAlpha = sa * 0.75;
      const sg = ctx.createRadialGradient(s.x * W, s.y * H, 0, s.x * W, s.y * H, sr);
      sg.addColorStop(0, 'rgba(230,230,235,0.9)');
      sg.addColorStop(0.6, 'rgba(200,200,210,0.3)');
      sg.addColorStop(1, 'rgba(180,180,190,0)');
      ctx.fillStyle = sg;
      ctx.beginPath(); ctx.arc(s.x * W, s.y * H, sr, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }

  for(let b = 0; b < c.bullets.length; b++){
    const bb = c.bullets[b];
    let drawT = Math.min(1, bb.t);
    let bx = (bb.sx + (bb.tx - bb.sx) * drawT) * W;
    let by = (bb.sy + (bb.ty - bb.sy) * drawT) * H;
    
    if(bb.t > 1 && !bb.hit){
      const ext = bb.t - 1;
      const dx = (bb.tx - bb.sx) * W;
      const dy = (bb.ty - bb.sy) * H;
      bx += dx * ext;
      by += dy * ext;
    }
    
    const _bulletColor = window._rarityBulletColor(bb.rarity);
    if(bb.missile){
      ctx.save();
      ctx.shadowColor = _bulletColor;
      ctx.shadowBlur = 24;
      ctx.fillStyle = _bulletColor;
      ctx.beginPath(); ctx.arc(bx, by, 6, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath(); ctx.arc(bx, by, 2, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    } else {
      ctx.save();
      ctx.shadowColor = _bulletColor;
      ctx.shadowBlur = 8;
      ctx.fillStyle = _bulletColor;
      ctx.beginPath(); ctx.arc(bx, by, bb.big ? 5 : 3, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }

  for(let f = 0; f < c.floats.length; f++){
    const ff = c.floats[f];
    ctx.save();
    ctx.fillStyle = ff.cls === 'crit' ? '#ff3030' : (ff.cls === 'miss' ? '#a89a85' : (ff.cls === 'armor' ? '#5ab0ff' : '#ffb300'));
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.globalAlpha = Math.max(0, 1 - ff.age);
    ctx.fillText(ff.text, ff.x * W, ff.y * H - ff.age * 40);
    ctx.restore();
  }
}


function _renderFrames(){
  const c = window._combat;
  if(!c) return;
  const layerR = document.getElementById('combat-frames');
  const layerL = document.getElementById('combat-frames-left');
  if(!layerR && !layerL) return;
  const px = c.allies[0] ? c.allies[0].worldX : 0;

  if(layerR){
    const alive = [];
    for(let i = 0; i < c.enemies.length; i++){
      if(c.enemies[i].hp > 0) alive.push(c.enemies[i]);
    }
    alive.sort(function(a, b){ return Math.abs(a.worldX - px) - Math.abs(b.worldX - px); });
    let html = '';
    for(let j = 0; j < alive.length; j++){
      const e = alive[j];
      const d = Math.abs(e.worldX - px);
      const rc = {'破舊':'#b87333','一般':'#e0e0e0','庫存':'#4caf50','精品':'#2196f3','傳奇':'#ffb300'}[e.rarity] || '#e0e0e0';
      const arc = Math.round(Math.max(0, e.hp / e.maxHp) * 360);
      const dTxt = d < 1 ? d.toFixed(1) : Math.round(d);
      html += '<div style="width:44px;height:44px;border-radius:50%;border:2px solid ' + rc + ';background:conic-gradient(#e05252 0deg ' + arc + 'deg, rgba(20,18,16,0.95) ' + arc + 'deg 360deg);box-sizing:border-box;position:relative"><div style="position:absolute;inset:4px;border-radius:50%;background:rgba(14,12,10,0.95);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:bold;color:#ffb300">' + dTxt + '</div></div>';
    }
    layerR.innerHTML = html;
  }

  if(layerL){
    const ex = window._explore;
    const fw = ex.passengersFollowing || [];
    const _nowMsFF = Date.now();
    const _checkDownFF = function(it){
      if(!it.srv) return false;
      if(it._retreating) return false;
      if(it.srv._injuredDown) return true;
      if(typeof it.srv.hp === 'number' && it.srv.hp <= 0) return true;
      if(it.srv.injuredUntil && it.srv.injuredUntil > _nowMsFF) return true;
      return false;
    };
    const outside = fw.filter(function(item){
      if(!item.srv) return false;
      if(item._retreating) return false;
      if(_checkDownFF(item)) return false;
      return item.screenX < -0.05;
    });
    let html = '';
    for(let j = 0; j < outside.length; j++){
      const item = outside[j];
      const d = Math.abs((item.screenX - EXPLORE_HERO_X_RATIO) * 10);
      const dTxt = d < 1 ? d.toFixed(1) : Math.round(d);
      const _maxHp = (typeof servantMaxHp === 'function') ? servantMaxHp(item.srv) : 100;
      let _hp = (typeof item.srv.hp === 'number') ? item.srv.hp : _maxHp;
      if(_hp < 0) _hp = 0;
      const _arc = Math.round(Math.max(0, Math.min(1, _hp / _maxHp)) * 360);
      const _rc = {'破舊':'#b87333','一般':'#e0e0e0','庫存':'#4caf50','精品':'#2196f3','傳奇':'#ffb300'}[item.srv.rarity] || '#4caf50';
      html += '<div style="width:44px;height:44px;border-radius:50%;border:2px solid ' + _rc + ';background:conic-gradient(#4caf50 0deg ' + _arc + 'deg, rgba(20,18,16,0.95) ' + _arc + 'deg 360deg);box-sizing:border-box;position:relative"><div style="position:absolute;inset:4px;border-radius:50%;background:rgba(14,12,10,0.95);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:bold;color:' + _rc + '">' + dTxt + '</div></div>';
    }
    layerL.innerHTML = html;
  }
}

function _resolve(win){
  const c = window._combat;
  if(!c || c.resolved) return;
  c.resolved = true;
  c.victory = win;

  if(typeof pushLog === 'function'){
    if(win) pushLog('<span class="win">玩家</span> 戰鬥勝利（' + c.enemies.length + ' 名敵人）', [], 'explore');
    else if(c.sceneType !== 'vehicle') pushLog('<span class="lose">玩家</span> 戰鬥失敗', [], 'explore');
  }

  if(win){
    if(typeof c.onVictoryStart === 'function'){ try { c.onVictoryStart(); } catch(e){} }
    c.lootUntil = performance.now() + 0;
  } else {
    c.active = false;
    const cb = c.onResolve;
    c.onResolve = null;
    _cleanup();
    if(typeof cb === 'function') setTimeout(function(){ cb(false); }, 300);
  }
}

window._playerShouldStandStill = function(){
  const c = window._combat;
  if(!c || !c.active || c.resolved || c.sceneType === 'vehicle') return false;
  const p = c.allies[0];
  if(!p || !p.isPlayer) return false;
  const w = _getPW();
  if(!w || !w.def) return false;
  const r = _rangeOfWeaponDef(w.def);
  for(let i = 0; i < c.enemies.length; i++){
    if(c.enemies[i].hp <= 0) continue;
    if(Math.abs(c.enemies[i].worldX - p.worldX) <= r) return true;
  }
  return false;
};

window._combatPlayerAdvance = function(delta){
  const c = window._combat;
  if(!c || !c.active || c.resolved) return;
  const p = c.allies[0];
  const minX = p ? p.worldX : 0;
  for(let i = 0; i < c.enemies.length; i++){
    c.enemies[i].worldX -= delta;
    if(c.enemies[i].hp > 0 && c.enemies[i].worldX < minX) c.enemies[i].worldX = minX;
  }
};;

window._combatStart = _start;

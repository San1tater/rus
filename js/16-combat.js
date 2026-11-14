/* v17.5 hotfix batch applied */

'use strict';

window._combat = null;
window._combatActive = false;

const REACTION_FIRST_MS = 300;
const REACTION_SECOND_MS = 600;
const SECOND_HIT_RATE = 0.8;
const DEATH_CD_MS = 60000;

const FOOT_RANGE_DEFAULT = 15;

/* rev-fix-fire-chain-unify: 連射鏈統一 — 點射→短→長→掃射 */
function _getFireChainMode(unit, nowMs){
  if(!unit) return '點射';
  var now = nowMs || Date.now();
  if(now - (unit._chainLast || 0) > (unit._chainResetMs || 600)) unit._chainShots = 0;
  unit._chainShots = (unit._chainShots || 0) + 1;
  unit._chainLast = now;
  var n = unit._chainShots;
  if(n === 1) return '點射';
  if(n <= 3) return '短點射';
  if(n <= 7) return '長點射';
  return '掃射';
}

/* rev-fix-anim-state-unified: 通用动画状态查询（探索 + 后院共用）
 * unit: 任何带 _hurtUntil / _reloadEnd / _fireAnimUntil 字段的单位
 * 返回: { name, startTime }
 * 连续开火时 _fireAnimStart 每发更新 → startTime 每发重置 → 帧从 0 开始
 */
function getUnitAnimState(unit, now){
  if(!unit) return { name: 'idle', startTime: now };
  if(unit._hurtUntil && now < unit._hurtUntil){
    return { name: 'hurt', startTime: unit._hurtStart || now };
  }
  if(unit._reloadEnd && now < unit._reloadEnd){
    return { name: 'reload', startTime: unit._reloadStart || now };
  }
  if(unit._fireAnimUntil && now < unit._fireAnimUntil){
    return { name: unit._fireAnimName || 'fire_primary', startTime: unit._fireAnimStart || now };
  }
  return { name: 'idle', startTime: now };
}

/* rev-fix-attack-unify: 單次攻擊結算統一 — 傷害×稀有度+暴擊+applyDamage
 * atk: { ammoId, ammoRarity, weaponRarity, penMM, fallbackDmg, noCrit }
 * tgt: 目標對象（需要 hp / armor 字段，以及 isGuard / isPlayer / isPassenger / equipped / helmet / body）
 * opts: { armorProviderFn }  （可選，覆蓋默認 armorProvider）
 * 返回: { crit, hpLost, armorLost, totalShown }
 * 注意：不修改 tgt.hp / tgt.armor，調用方自行減
 */
function _resolveSingleAttack(atk, tgt, opts){
  opts = opts || {};
  var d = (typeof _calcAttackDamage === 'function') ? _calcAttackDamage(atk) : { baseDmg: atk.fallbackDmg || 10, crit: false, penMM: atk.penMM || 0 };
  var armorProvider = opts.armorProviderFn;
  if(!armorProvider){
    armorProvider = (typeof window._armorProviderFor === 'function') ? window._armorProviderFor(tgt) : function(){ return 0; };
  }
  var proxy = { hp: tgt.hp || 0, armor: tgt.armor || 0 };
  var res = applyDamage(proxy, d.baseDmg, d.penMM, { armorProvider: armorProvider });
  return { crit: d.crit, hpLost: res.hpLost, armorLost: res.armorLost, totalShown: res.hpLost > 0 ? res.hpLost : res.armorLost, baseDmg: d.baseDmg };
}


const FOOT_RANGE_SHORT = 20;
/* rev-fix-grenade-arc: 手雷球形爆炸切線占比（上半圓 π） */
const GRENADE_TARGET_WIDTH_M = 0.5;
window._calcFragmentRatio = function(targetWidth, dist){
  const w = (typeof targetWidth === 'number' && targetWidth > 0) ? targetWidth : GRENADE_TARGET_WIDTH_M;
  const d = Math.max(0.1, (typeof dist === 'number' && dist >= 0) ? dist : 1.0);
  return Math.min(1, 2 * Math.atan((w / 2) / d) / Math.PI);
};
window._calcFragmentCount = function(targetWidth, dist, totalFrags){
  return Math.max(1, Math.round(totalFrags * window._calcFragmentRatio(targetWidth, dist)));
};

function _rangeOfWeaponDef(wd){
  if(!wd) return FOOT_RANGE_DEFAULT;
  if(wd.slot === 'melee') return 0.75;
  /* rev-fix-throw-range: 手榴彈射程 30 米 */
  if(wd.slot === 'throwable') return 30;
  /* rev-workbench: 改裝瞄具後的武器自帶 combatRange，優先使用 */
  if(typeof wd.combatRange === 'number' && wd.combatRange > 0) return wd.combatRange;
  if(wd._shortRange) return FOOT_RANGE_SHORT;
  return (typeof WEAPON_COMBAT_RANGE !== 'undefined' && WEAPON_COMBAT_RANGE[wd.type]) || FOOT_RANGE_DEFAULT;
}

/* rev-fix-enemy-3mags: 敌人 3 弹匣 + 主→副→近战切换 —— 唯一真相源 */
function _enemyWeaponIsMelee(w){
  if(!w || !w.id) return false;
  var d = (typeof WEAPONS !== "undefined") ? WEAPONS[w.id] : null;
  return d && d.slot === "melee";
}
function _enemyActiveWeapon(e){
  if(e._activeWeapon && e._activeWeapon.id) return e._activeWeapon;
  if(e.primaryWeapon && e.primaryWeapon.id) return (e._activeWeapon = e.primaryWeapon);
  if(e.secondaryWeapon && e.secondaryWeapon.id) return (e._activeWeapon = e.secondaryWeapon);
  if(e.melee && e.melee.id) return (e._activeWeapon = e.melee);
  return null;
}
function _enemyDetachWeapon(e, w){
  if(!w) return;
  if(e.primaryWeapon === w) e.primaryWeapon = null;
  else if(e.secondaryWeapon === w) e.secondaryWeapon = null;
  else if(e.melee === w) e.melee = null;
  e._activeWeapon = null;
}
/* 返回 { ok, weapon, melee }：ok 时执行射击/近战；换弹或切枪时 ok=false */
function _enemyTryFire(e, now){
  var w = _enemyActiveWeapon(e);
  if(!w) return { ok: false, weapon: null, melee: false };
  if(_enemyWeaponIsMelee(w)) return { ok: true, weapon: w, melee: true };
  if(e._reloadEnd && now < e._reloadEnd) return { ok: false, weapon: w, melee: false };
  if(typeof w.ammoInMag === "number" && w.ammoInMag <= 0){
    if(typeof w.magsLeft === "number" && w.magsLeft > 0){
      var magSize = w.magSize;
      w.magsLeft--;
      w.ammoInMag = magSize;
      e._reloadStart = now;
      e._reloadEnd = now + 1000;
      e._nextFireAt = now + 1000;
      return { ok: false, weapon: w, melee: false };
    }
    _enemyDetachWeapon(e, w);
    return _enemyTryFire(e, now);
  }
  if(typeof w.ammoInMag === "number") w.ammoInMag--;
  return { ok: true, weapon: w, melee: false };
}
function _eRange(e){
  if(e.hasRPG && e.rpgAmmo > 0) return (typeof RPG_COMBAT_RANGE !== 'undefined') ? RPG_COMBAT_RANGE : 150;
  var w = e.primaryWeapon || e.secondaryWeapon || e.melee;
  if(!w) return 8;
  var wd = WEAPONS[w.id];
  if(!wd) return 8;
  /* rev-fix-enemy-3mags: 近战射程 0.75m */
  if(wd.slot === 'melee') return 0.75;
  return _rangeOfWeaponDef(wd);
}
/* ═══════════════════════════════════════════════════════════
 * rev-fix-ammo-handler: 弹药手（主武器栏装备弹药箱，weapon.id 是 AMMO key）
 * - 无攻击能力（不开火）
 * - 射程 = 场上「使用同 cal 弹药」的幸存载员最大射程（排除其他弹药手）
 * - 无幸存使用者 → 主动撤退
 * ═══════════════════════════════════════════════════════════ */
function _isAmmoHandler(a){
  if(!a || !a.weapon || !a.weapon.id) return false;
  if(a.weapon.slot !== 'primary') return false;
  return typeof AMMO !== 'undefined' && !!AMMO[a.weapon.id];
}
function _getAmmoHandlerRange(a, c){
  if(!a || !c) return null;
  const cals = [];
  if(a.weapon && a.weapon.def && a.weapon.def.cal) cals.push(a.weapon.def.cal);
  if(a.ammoBox && a.ammoBox.ammoId && typeof AMMO !== 'undefined' && AMMO[a.ammoBox.ammoId] && AMMO[a.ammoBox.ammoId].cal){
    const _c2 = AMMO[a.ammoBox.ammoId].cal;
    if(cals.indexOf(_c2) < 0) cals.push(_c2);
  }
  if(!cals.length) return null;
  let maxR = null;
  for(let j = 1; j < c.allies.length; j++){
    const other = c.allies[j];
    if(other === a) continue;
    if(other.hp <= 0) continue;
    if(other._retreating) continue;
    if(!other.weapon || !other.weapon.def) continue;
    if(typeof AMMO !== 'undefined' && AMMO[other.weapon.id]) continue;
    if(cals.indexOf(other.weapon.def.cal) < 0) continue;
    const r = (typeof _rangeOfWeaponDef === 'function') ? _rangeOfWeaponDef(other.weapon.def) : 15;
    if(maxR === null || r > maxR) maxR = r;
  }
  return maxR;
}
function _hasSurvivingUserForAmmo(a, c){
  return (typeof _getAmmoHandlerRange === 'function') && _getAmmoHandlerRange(a, c) !== null;
}
function _retreatPassenger(a, c){
  if(!a || a._retreating) return;
  a._retreating = true;
  a._mode = null;
  /* rev-fix-ah-retreat-log: 撤退写日志，避免「无说明消失」 */
  if(typeof pushLog === 'function'){
    const _sRar = (a.srv && a.srv.rarity) ? a.srv.rarity : '一般';
    const _sCls = (typeof rarityClass === 'function') ? rarityClass(_sRar) : '';
    const _sName = (typeof servantLabel === 'function') ? servantLabel(a.srv) : '載員';
    pushLog('<span class="' + _sCls + '">' + _sName + '</span> 無同口徑彈藥使用者，撤退', [], 'explore');
  }
  const ex = window._explore;
  if(ex && ex.passengersFollowing && a.srv){
    for(let k = 0; k < ex.passengersFollowing.length; k++){
      const it = ex.passengersFollowing[k];
      if(it.srv && it.srv.id === a.srv.id){
        it._retreating = true;
        it._retreatSpeed = true;
        it.targetX = 1.8 + k * 0.05;
        break;
      }
    }
  }
}


/* [v210] 全局煙火系統，供步戰與後院共用 */
window.MuzzleFX = {
  smokes: [],
  fireFx: [],
  spawn: function(px, py, scale, isEnemy, owner){
    /* [v234] owner 預設 explore，用於隔離不同場景的粒子 */
    const _owner = owner || 'explore';
    const _dir = isEnemy ? -1 : 1;
    // Jet
    this.smokes.push({
      x: px, y: py + (Math.random() - 0.5) * 8 * scale,
      vx: 1500 * scale * _dir, vy: (Math.random() - 0.5) * 10 * scale,
      life: 1, rate: 1 / 0.12,
      sizeX: 10 * scale, sizeY: 3 * scale,
      growX: 200 * scale, growY: 60 * scale,
      alpha0: 0.95, isJet: true, friction: 0.94, _owner: _owner
    });
    // Spread
    this.smokes.push({
      x: px + (Math.random() - 0.5) * 8,
      y: py + (Math.random() - 0.5) * 8,
      vx: (250 + Math.random() * 150) * scale * _dir, vy: (Math.random() - 0.5) * 15 * scale,
      life: 1, rate: 1 / (0.8 + Math.random() * 0.4),
      sizeX: 4 * scale, sizeY: 4 * scale,
      growX: 40 * scale, growY: 40 * scale,
      alpha0: 0.15, isJet: false, friction: 0.95, _owner: _owner
    });
    // Fire
    if(Math.random() < 0.15){
      const blobs = [];
      for(let j = 0; j < 3; j++){
        blobs.push({ ox: (Math.random() - 0.5) * 8 * scale, oy: (Math.random() - 0.5) * 8 * scale, r: (12 + Math.random() * 4) * scale });
      }
      this.fireFx.push({ x: px + 12 * scale * _dir, y: py, startTime: performance.now(), blobs: blobs, _owner: _owner });
    }
  },
  update: function(dt){
    for(let i = this.smokes.length - 1; i >= 0; i--){
      const p = this.smokes[i];
      p.x += p.vx * dt; p.y += p.vy * dt;
      const _fric = Math.pow(p.friction, dt * 60);
      p.vx *= _fric; p.vy *= _fric;
      p.sizeX += p.growX * dt; p.sizeY += p.growY * dt;
      p.life -= p.rate * dt;
      if(p.life <= 0) this.smokes.splice(i, 1);
    }
    const nowMs = performance.now();
    for(let i = this.fireFx.length - 1; i >= 0; i--){
      if(nowMs > this.fireFx[i].startTime + 60) this.fireFx.splice(i, 1);
    }
  },
  render: function(ctx, owner){
    /* [v234] owner 不傳則渲染全部；傳則只渲染匹配的粒子 */
    for(let i = 0; i < this.smokes.length; i++){
      const p = this.smokes[i];
      if(owner && p._owner !== owner) continue;
      let a = p.isJet ? p.alpha0 * Math.pow(Math.max(0, p.life), 1.5) : p.alpha0 * Math.pow(Math.max(0, p.life), 3.0);
      if(a < 0.01) continue;
      ctx.save(); ctx.translate(p.x, p.y);
      if(p.isJet){
        ctx.scale(p.sizeX / Math.max(1, p.sizeY), 1);
        ctx.globalAlpha = a;
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, p.sizeY);
        g.addColorStop(0, 'rgba(255, 255, 255, 1)');
        g.addColorStop(0.5, 'rgba(230, 240, 255, 0.6)');
        g.addColorStop(1, 'rgba(200, 210, 220, 0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, p.sizeY, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.globalAlpha = a;
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, p.sizeX);
        g.addColorStop(0, 'rgba(235, 235, 240, 0.8)');
        g.addColorStop(0.5, 'rgba(210, 210, 215, 0.2)');
        g.addColorStop(1, 'rgba(190, 190, 195, 0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, p.sizeX, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
    const nowMs = performance.now();
    for(let i = 0; i < this.fireFx.length; i++){
      const f = this.fireFx[i];
      if(owner && f._owner !== owner) continue;
      const age = nowMs - f.startTime;
      if(age > 60) continue;
      const fade = 1 - age / 60;
      ctx.save(); ctx.translate(f.x, f.y);
      for(let j = 0; j < f.blobs.length; j++){
        const b = f.blobs[j];
        const baseR = b.r * fade;
        if(baseR <= 0) continue;
        const gCore = ctx.createRadialGradient(b.ox, b.oy, 0, b.ox, b.oy, baseR);
        gCore.addColorStop(0, 'rgba(255,255,220,' + (fade * 0.9) + ')');
        gCore.addColorStop(0.5, 'rgba(255,180,50,' + (fade * 0.7) + ')');
        gCore.addColorStop(1, 'rgba(200,20,0,0)');
        ctx.fillStyle = gCore; ctx.beginPath(); ctx.arc(b.ox, b.oy, baseR, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
  }
};

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
    sparks: [], explosions: [],
    sceneType: cfg.sceneType || 'foot',
    playerFirst: pf,
    allies: cfg.allies || [],
    enemies: cfg.enemies || [],
    bullets: [],
    floats: [],
    tracers: [],
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
    _playerMag: { inMag: 0, ammoRef: null, weaponId: null },
    _activeSlot: null,
    _pendingReload: null
  };

  /* rev-fix-preswap: 战斗开始时预装填（主优先，主无弹则副） */
  (function(){
    const _slots = ['primary', 'secondary'];
    for(const _s of _slots){
      const _id = state.player.equipped[_s];
      const _d = _id ? itemDef(_id) : null;
      if(!_d || !_d.cal) continue;
      const _ammo = (typeof pickAmmoByPreferenceOrOrder === 'function') ? pickAmmoByPreferenceOrOrder(_d.cal, 'combat') : null;
      if(!_ammo) continue;
      const _take = Math.min(_d.mag || 30, _ammo.count);
      if(_take <= 0) continue;
      invRemove(_ammo.id, _ammo.rarity, _take);
      window._combat._playerMag.weaponId = _id;
      window._combat._playerMag.inMag = _take;
      window._combat._playerMag.ammoRef = { id: _ammo.id, rarity: _ammo.rarity, def: AMMO[_ammo.id] };
      window._combat._activeSlot = _s;
      break;
    }
  })();

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

  requestAnimationFrame(_loop);
}

function _setupCanvas(){
  const z1 = document.getElementById('zone1');
  if(!z1) return;
  let c = document.getElementById('combat-overlay');
  if(!c){
    c = document.createElement('canvas');
    c.id = 'combat-overlay';
    c.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:6;';
    z1.appendChild(c);
  }
  const w = z1.clientWidth, h = z1.clientHeight;
  if(c.width !== w) c.width = w;
  if(c.height !== h) c.height = h;
  window._combat.playerCanvas = c;
  window._combat.playerCtx = c.getContext('2d');
  /* rev-fix-bullet-zlayer: 頂層 canvas 只畫打載員的子彈/曳光，z-index 高於載員 */
  let cTop = document.getElementById('combat-overlay-top');
  if(!cTop){
    cTop = document.createElement('canvas');
    cTop.id = 'combat-overlay-top';
    cTop.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:12;';
    z1.appendChild(cTop);
  }
  if(cTop.width !== w) cTop.width = w;
  if(cTop.height !== h) cTop.height = h;
  window._combat.playerCanvasTop = cTop;
  window._combat.playerCtxTop = cTop.getContext('2d');
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

/* [v272] 全局战斗粒子 FX */
window._spawnHitSpark = function(owner, sx, sy, crit, cls, isTop){
  if(!owner) return;
  if(!owner.sparks) owner.sparks = [];
  /* rev-fix-spark-tier-v2: 三档视觉 —— cls 是唯一判定依据，crit 只做击穿内加码。
   * 未击穿（cls === 'armor'/'miss'/'heal'）：4 粒 / 0.8 小 / 金
   * 击穿（cls 其他字符串，含 '' / 'weak' / 'enemy' / 'crit'）：7 粒 / 1.2 中 / 红
   * 暴击（cls === 'crit'）：10 粒 / 1.8 大 / 深红 */
  var _blocked = (cls === 'armor' || cls === 'miss' || cls === 'heal');
  var n, baseSpd, baseSz, color;
  if(_blocked){
    n = 4; baseSpd = 25; baseSz = 0.8; color = '#ffd680';
  } else if(cls === 'crit'){
    n = 10; baseSpd = 60; baseSz = 1.8; color = '#ff3030';
  } else {
    n = 7; baseSpd = 40; baseSz = 1.2; color = '#ff5030';
  }
  for(var i = 0; i < n; i++){
    var ang = Math.random() * Math.PI * 2;
    var spd = baseSpd + Math.random() * 30;
    owner.sparks.push({
      x: sx, y: sy,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd - 12,
      life: 0.15 + Math.random() * 0.15,
      maxLife: 0.3,
      size: baseSz,
      color: color,
      _top: !!isTop
    });
  }
};
window._spawnExplosionSmoke = function(owner, sx, sy, radiusPx){
  if(!owner) return;
  if(!owner.explosions) owner.explosions = [];
  var _rad = (typeof radiusPx === 'number' && radiusPx > 0) ? radiusPx : 40;
  for(var i = 0; i < 18; i++){
    var ang = Math.PI + Math.random() * Math.PI;
    var spd = _rad * (0.4 + Math.random() * 0.7);
    var vx = Math.cos(ang) * spd;
    var vy = -Math.abs(Math.sin(ang)) * spd * 0.03;
    owner.explosions.push({
      x: sx + Math.cos(ang) * _rad * 0.25,
      y: sy - Math.random() * _rad * 0.05,
      vx: vx, vy: vy,
      life: 0.8 + Math.random() * 0.6,
      maxLife: 1.4,
      size: _rad * (0.2 + Math.random() * 0.3),
      growth: _rad * 0.4 * (0.6 + Math.random() * 0.6),
      isGround: true
    });
  }
};
/* rev-fix-rpg-impact-fx: RPG 爆炸专用特效——与手雷的灰色雾区分
 * 时间线：
 *   t=0     闪光    (0~0.14s) 白热中心爆发
 *   t=0     火球    (0~0.55s) 橙红向外扩散
 *   t=0~0.08 黑烟   (0~2.2s)  黑色烟柱向上飘升
 *   t=0     碎片    (0~0.9s)  土黄细小颗粒，抛物线下落
 *   t=0.05  火星    (0~1.2s)  红色亮点随机漂移
 * radPx 是视觉半径（px），由调用方按屏幕宽度决定。 */
window._spawnRPGImpactFx = function(owner, sx, sy, radPx){
  if(!owner) return;
  if(!owner.explosions) owner.explosions = [];
  var _r = (typeof radPx === 'number' && radPx > 0) ? radPx : 60;
  /* rev-fix-rpg-chaos: 消除规则感 —— 主/小分层、幂律尺寸速度、角度偏向、延迟生成 */
  function _j(scale){ return (Math.random() - 0.5) * 2 * scale; }
  function _pow(min, max, exp){
    /* 幂律分布：返回 [min, max] 内偏 min 侧的值（exp>1）或偏 max 侧（exp<1） */
    var t = Math.pow(Math.random(), exp || 2);
    return min + (max - min) * t;
  }

  /* 1) 主闪光（白热，中心微偏）+ 30~60ms 二次闪光（暖色，位置抖动更大） */
  owner.explosions.push({
    x: sx + _j(_r * 0.10), y: sy + _j(_r * 0.10), vx: 0, vy: 0,
    life: 0.11 + Math.random() * 0.05, maxLife: 0.16,
    size: _r * (0.50 + Math.random() * 0.20),
    growth: _r * (3.0 + Math.random() * 1.2),
    kind: 'flash', isGround: false, gravity: 0
  });
  owner.explosions.push({
    x: sx + _j(_r * 0.25), y: sy + _j(_r * 0.25), vx: 0, vy: 0,
    life: 0.12, maxLife: 0.16,
    size: _r * (0.30 + Math.random() * 0.15),
    growth: _r * (1.6 + Math.random() * 0.8),
    kind: 'flash2', isGround: false, gravity: 0,
    delay: 0.03 + Math.random() * 0.03
  });

  /* 2) 火球：主 3~4 个（大、向上扇开）+ 小 8~12 个（小、任意角、更快） */
  var _mainFire = 3 + Math.floor(Math.random() * 2);
  for(var fi = 0; fi < _mainFire; fi++){
    var _fa = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.9;
    var _fs = _r * _pow(1.2, 2.8, 1.6);
    var _fl = 0.40 + Math.random() * 0.24;
    owner.explosions.push({
      x: sx + _j(_r * 0.16), y: sy + _j(_r * 0.16),
      vx: Math.cos(_fa) * _fs,
      vy: Math.sin(_fa) * _fs - _r * 0.30,
      life: _fl, maxLife: _fl,
      size: _r * _pow(0.26, 0.48, 1.4),
      growth: _r * (1.3 + Math.random() * 0.8),
      kind: 'fire', isGround: false, gravity: 0,
      delay: Math.random() * 0.02
    });
  }
  var _smallFire = 8 + Math.floor(Math.random() * 5);
  for(var fs2 = 0; fs2 < _smallFire; fs2++){
    var _fa2 = Math.random() * Math.PI * 2;
    var _fs2 = _r * _pow(0.8, 3.2, 2.2);
    var _fl2 = 0.18 + Math.random() * 0.26;
    owner.explosions.push({
      x: sx + _j(_r * 0.25), y: sy + _j(_r * 0.25),
      vx: Math.cos(_fa2) * _fs2,
      vy: Math.sin(_fa2) * _fs2 - _r * 0.5,
      life: _fl2, maxLife: _fl2,
      size: _r * _pow(0.06, 0.18, 2.0),
      growth: _r * (0.7 + Math.random() * 0.8),
      kind: 'fire', isGround: false, gravity: 0,
      delay: Math.random() * 0.05
    });
  }

  /* 3) 黑烟：主烟柱 4~5 个（大、慢、向上）+ 次烟 10~15 个（小、散、延迟更宽） */
  var _mainSmoke = 4 + Math.floor(Math.random() * 2);
  for(var mi = 0; mi < _mainSmoke; mi++){
    var _ma = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.7;
    var _ms = _r * _pow(0.20, 0.55, 1.5);
    var _ml = 1.4 + Math.random() * 0.95;
    owner.explosions.push({
      x: sx + _j(_r * 0.42), y: sy + _j(_r * 0.22),
      vx: Math.cos(_ma) * _ms * 0.30,
      vy: Math.sin(_ma) * _ms * 0.55 - _r * 0.10,
      life: _ml, maxLife: _ml,
      size: _r * _pow(0.28, 0.48, 1.3),
      growth: _r * (0.9 + Math.random() * 0.7),
      kind: 'smoke_dark', isGround: false, gravity: 0,
      delay: Math.random() * 0.07
    });
  }
  var _smallSmoke = 10 + Math.floor(Math.random() * 6);
  for(var ms2 = 0; ms2 < _smallSmoke; ms2++){
    var _ma2 = Math.random() * Math.PI * 2;
    var _ms2 = _r * _pow(0.08, 0.32, 2.0);
    var _ml2 = 0.7 + Math.random() * 0.85;
    owner.explosions.push({
      x: sx + _j(_r * 0.55), y: sy + _j(_r * 0.42),
      vx: Math.cos(_ma2) * _ms2 * 0.40,
      vy: Math.sin(_ma2) * _ms2 * 0.30 - _r * 0.06,
      life: _ml2, maxLife: _ml2,
      size: _r * _pow(0.10, 0.24, 2.2),
      growth: _r * (0.4 + Math.random() * 0.5),
      kind: 'smoke_dark', isGround: false, gravity: 0,
      delay: Math.random() * 0.16
    });
  }

  /* 4) 碎片：2~3 大块（快、远、重）+ 7~11 土渣（慢、近） */
  var _bigDeb = 2 + Math.floor(Math.random() * 2);
  for(var bi = 0; bi < _bigDeb; bi++){
    var _ba = Math.random() * Math.PI * 2;
    var _bs = _r * (2.0 + Math.random() * 1.7);
    owner.explosions.push({
      x: sx + _j(_r * 0.18), y: sy + _j(_r * 0.18),
      vx: Math.cos(_ba) * _bs,
      vy: Math.sin(_ba) * _bs - _r * 0.7,
      life: 0.65 + Math.random() * 0.45, maxLife: 1.1,
      size: 3.5 + Math.random() * 2.5,
      growth: 0,
      kind: 'debris', isGround: false,
      gravity: 460 + Math.random() * 90,
      delay: Math.random() * 0.02
    });
  }
  var _smallDeb = 7 + Math.floor(Math.random() * 5);
  for(var bd = 0; bd < _smallDeb; bd++){
    var _ba2 = Math.random() * Math.PI * 2;
    var _bs2 = _r * _pow(0.6, 2.0, 1.8);
    owner.explosions.push({
      x: sx + _j(_r * 0.30), y: sy + _j(_r * 0.30),
      vx: Math.cos(_ba2) * _bs2,
      vy: Math.sin(_ba2) * _bs2 - _r * 0.3,
      life: 0.45 + Math.random() * 0.35, maxLife: 0.8,
      size: 1.5 + Math.random() * 1.5,
      growth: 0,
      kind: 'debris', isGround: false,
      gravity: 500 + Math.random() * 110,
      delay: Math.random() * 0.04
    });
  }

  /* 5) 火星：2 极快（向上偏）+ 4~6 中速（任意角） */
  var _fastEmber = 2;
  for(var ei = 0; ei < _fastEmber; ei++){
    var _ea = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.4;
    var _es = _r * (2.8 + Math.random() * 1.7);
    owner.explosions.push({
      x: sx + _j(_r * 0.12), y: sy + _j(_r * 0.12),
      vx: Math.cos(_ea) * _es,
      vy: Math.sin(_ea) * _es - _r * 0.4,
      life: 0.95 + Math.random() * 0.45, maxLife: 1.4,
      size: 2.5 + Math.random() * 1.5,
      growth: 0,
      kind: 'ember_hot', isGround: false,
      gravity: 360 + Math.random() * 80,
      delay: Math.random() * 0.02
    });
  }
  var _slowEmber = 4 + Math.floor(Math.random() * 3);
  for(var ei2 = 0; ei2 < _slowEmber; ei2++){
    var _ea2 = Math.random() * Math.PI * 2;
    var _es2 = _r * _pow(0.8, 2.4, 1.8);
    owner.explosions.push({
      x: sx + _j(_r * 0.22), y: sy + _j(_r * 0.22),
      vx: Math.cos(_ea2) * _es2,
      vy: Math.sin(_ea2) * _es2 - _r * 0.3,
      life: 0.45 + Math.random() * 0.45, maxLife: 0.9,
      size: 1.5 + Math.random() * 1.2,
      growth: 0,
      kind: 'ember', isGround: false,
      gravity: 380 + Math.random() * 90,
      delay: Math.random() * 0.06
    });
  }
};

window._tickBattleFX = function(owner, dt){
  if(!owner) return;
  if(owner.sparks){
    for(var i = owner.sparks.length - 1; i >= 0; i--){
      var p = owner.sparks[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 180 * dt;
      p.life -= dt;
      if(p.life <= 0) owner.sparks.splice(i, 1);
    }
  }
  if(owner.explosions){
    for(var j = owner.explosions.length - 1; j >= 0; j--){
      var q = owner.explosions[j];
      /* rev-fix-fx-delay: 延迟生成期间不动、不缩、不消失 */
      if(q.delay && q.delay > 0){ q.delay -= dt; if(q.delay < 0) q.delay = 0; continue; }
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      /* rev-fix-fx-gravity: 碎片/火星等受重力，需在摩擦前累加，摩擦只衰减速度 */
      if(q.gravity) q.vy += q.gravity * dt;
      q.vx *= 0.95;
      q.vy *= 0.95;
      q.life -= dt;
      q.size += q.growth * dt;
      if(q.life <= 0) owner.explosions.splice(j, 1);
    }
  }
};

/* [v298] 通用子弹绘制：探索/后院共用 */
window._drawBulletShape = function(ctx, px, py, opts){
  opts = opts || {};
  var scale = (typeof opts.scale === 'number' && opts.scale > 0) ? opts.scale : 1;
  var bcol = opts.color;
  if(!bcol){
    if(opts.isEnemy){ bcol = '#ff6060'; }
    else if(opts.rarity && typeof window._rarityBulletColor === 'function'){ bcol = window._rarityBulletColor(opts.rarity); }
    else { bcol = '#ffd680'; }
  }
  /* 手雷图标 */
  if(opts.isGrenade && opts.grenadeId){
    var _gimg = (typeof getHeroImg === 'function') ? getHeroImg(window.getItemIconPath(opts.grenadeId)) : null;
    var _gsize = 20 * scale;
    if(_gimg && _gimg.complete && _gimg.naturalWidth){
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate((opts.t || 0) * Math.PI * 2);
      ctx.drawImage(_gimg, -_gsize/2, -_gsize/2, _gsize, _gsize);
      ctx.restore();
      return true;
    }
    /* 图标加载失败 → 圆点兜底 */
  }
  /* 圆形 */
  var _br = (typeof BULLET_VISUAL_RADIUS !== 'undefined') ? BULLET_VISUAL_RADIUS : { normal: 3, grenade: 5, missile: 6 };
  var _r;
  if(opts.missile){ _r = _br.missile; }
  else if(opts.big || opts.isGrenade){ _r = _br.grenade; }
  else { _r = _br.normal; }
  _r *= scale;
  ctx.save();
  ctx.shadowColor = bcol;
  ctx.shadowBlur = 8;
  ctx.fillStyle = bcol;
  ctx.beginPath();
  ctx.arc(px, py, _r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  return true;
};

window._renderBattleFX = function(ctx, owner, ctxTop){
  if(!owner) return;
  if(owner.sparks){
    for(var i = 0; i < owner.sparks.length; i++){
      var p = owner.sparks[i];
      var a = Math.max(0, Math.min(1, p.life / p.maxLife * 1.6));
      var _c = (p._top && ctxTop) ? ctxTop : ctx;
      _c.save();
      _c.globalAlpha = a;
      _c.fillStyle = p.color;
      _c.shadowColor = p.color;
      _c.shadowBlur = 6;
      _c.beginPath();
      _c.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      _c.fill();
      _c.restore();
    }
  }
  if(owner.explosions){
    for(var j = 0; j < owner.explosions.length; j++){
      var q = owner.explosions[j];
      /* rev-fix-fx-delay-render: 延迟期不绘制 */
      if(q.delay && q.delay > 0) continue;
      /* rev-fix-fx-alpha: flash / ember_hot 单独提高，其余保持 0.55 */
      var _aBase = 0.55;
      if(q.kind === 'flash') _aBase = 0.95;
      else if(q.kind === 'flash2') _aBase = 0.80;
      else if(q.kind === 'ember_hot') _aBase = 0.80;
      var a2 = Math.max(0, Math.min(1, q.life / q.maxLife)) * _aBase;
      var _c2 = (q._top && ctxTop) ? ctxTop : ctx;
      _c2.save();
      _c2.globalAlpha = a2;
      var g = _c2.createRadialGradient(q.x, q.y, 0, q.x, q.y, q.size);
      /* rev-fix-fx-kinds: 按 kind 分派渐变（默认走手雷灰） */
      if(q.kind === 'flash'){
        g.addColorStop(0, 'rgba(255,255,255,1)');
        g.addColorStop(0.3, 'rgba(255,242,180,0.9)');
        g.addColorStop(0.7, 'rgba(255,180,80,0.45)');
        g.addColorStop(1, 'rgba(220,90,20,0)');
      } else if(q.kind === 'fire'){
        g.addColorStop(0, 'rgba(255,240,180,0.95)');
        g.addColorStop(0.4, 'rgba(255,140,40,0.85)');
        g.addColorStop(0.75, 'rgba(180,45,10,0.5)');
        g.addColorStop(1, 'rgba(80,10,0,0)');
      } else if(q.kind === 'smoke_dark'){
        g.addColorStop(0, 'rgba(45,40,36,0.88)');
        g.addColorStop(0.5, 'rgba(28,24,20,0.55)');
        g.addColorStop(1, 'rgba(10,8,6,0)');
      } else if(q.kind === 'debris'){
        g.addColorStop(0, 'rgba(190,155,95,0.95)');
        g.addColorStop(1, 'rgba(110,85,50,0)');
      } else if(q.kind === 'ember'){
        g.addColorStop(0, 'rgba(255,220,110,1)');
        g.addColorStop(0.5, 'rgba(255,85,20,0.85)');
        g.addColorStop(1, 'rgba(140,20,0,0)');
      } else if(q.kind === 'flash2'){
        g.addColorStop(0, 'rgba(255,255,220,1)');
        g.addColorStop(0.4, 'rgba(255,190,90,0.85)');
        g.addColorStop(1, 'rgba(200,60,10,0)');
      } else if(q.kind === 'ember_hot'){
        g.addColorStop(0, 'rgba(255,255,240,1)');
        g.addColorStop(0.4, 'rgba(255,200,90,0.9)');
        g.addColorStop(1, 'rgba(180,40,0,0)');
      } else {
        /* 默认（手雷灰色） */
        g.addColorStop(0, 'rgba(180,180,180,0.9)');
        g.addColorStop(0.5, 'rgba(140,140,140,0.4)');
        g.addColorStop(1, 'rgba(100,100,100,0)');
      }
      _c2.fillStyle = g;
      _c2.beginPath();
      if(q.isGround){
        _c2.ellipse(q.x, q.y, q.size, q.size * 0.18, 0, 0, Math.PI * 2);
      } else {
        _c2.arc(q.x, q.y, q.size, 0, Math.PI * 2);
      }
      _c2.fill();
      _c2.restore();
    }
  }
};

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

  /* rev145: 允許在背景繼續戰鬥，僅跳過渲染 */


  const dt = Math.min(0.05, (now - c.lastTick) / 1000);
  c.lastTick = now;

  if(!c.resolved){
    _syncWorldEnemies(now);
    _tickAI(dt, now);
    _tickBullets(dt);
    _updatePAnim(now);

    if(c.sceneType === 'vehicle'){
      /* v176 修復5：載具戰不因「當前 c.enemies 敵人清空」而 resolve。
         根因：一旦 resolve → _cleanup → window._combat = null →
         _syncWorldEnemies / _tickAI 停止運行 → 前方 225m 內的 event 敵人永不激活。
         這造成「載具後半段沒有敵人」+「下車時 225m 內全部事件一次性激活被集火」。

         載具戰的正確結束時機：
         1. BTR lift 階段的 _forceEndVehicleCombat（正常結束）
         2. 玩家下車的 _resolveVehicleLeave（下車）
         3. 玩家死亡的 _forceLeave（駕駛/玩家死亡）

         這些路徑都會自行設定 c.active = false 並調用 _cleanup，
         不需要在這裡靠 ea = false 自動 resolve。 */
    } else {
      /* [v179 F5] 玩家死亡 = 立即失敗，不依賴載員存活。
         原邏輯遍歷所有 allies：玩家 hp=0 但載員活著 → aa=true → 不 resolve → 死鎖。 */
      let ea = false;
      const _playerF5 = c.allies[0];
      const aa = !!(_playerF5 && _playerF5.hp > 0);
      for(let i = 0; i < c.enemies.length; i++) if(c.enemies[i].hp > 0){ ea = true; break; }

      if(!ea) _resolve(true);
      /* [v182c H6] 玩家 hp=0 立即失败，不走 _enemiesRetreating 延后。
         原逻辑：aa=false 时走 _enemiesRetreating 分支，等所有敌人 worldX < -12 才 _resolve(false)。
         但 _syncWorldEnemies 每帧把新敌人加入 c.enemies（新事件敌人也被 isDiscovered 激活），
         _allGone 永远 false → 永不 _resolve → 玩家 hp=0 不倒地，敌人持续生成快速左跑，背景不动。
         玩家死亡应即时 resolve，敌人撤退动画不需要。 */
      else if(!aa){
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

  if(typeof currentTab === 'undefined' || currentTab === 'explore'){
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
  /* rev-fix-playhurt-no-override: 不直接覆蓋動畫，交給 _updatePAnim 按優先級決定 */
}

function _updatePAnim(now){
  const c = window._combat;
  if(!c || typeof heroAnim === 'undefined' || c.sceneType === 'vehicle') return;
  const p = c.allies[0];
  if(!p || !p.isPlayer) return;
  /* 治療中保持 heal_melee，不被 walk/idle 覆蓋（否則 frame 永遠停在 0） */
  const _exHeal = window._explore;
  if(_exHeal && _exHeal.mode === 'healing') return;

  /* [v180 F6d] 非 heal_melee 狀態下，清治療殘留。
     避免手持醫療包行走 + eqSlot='__hidden__' 導致武器被隱藏。 */
  if(heroAnim.name !== 'heal_melee' && heroAnim.healItem){
    heroAnim.healItem = null;
    if(heroAnim.eqSlot === '__hidden__') heroAnim.eqSlot = null;
  }

  /* rev-fix-updatepanim-priority: 攻擊流程（reload → switch → fire 保持原相對順序）整體 > 受擊 > walk/idle
     攻擊流程包含開火、換彈、換武器——全部是攻擊的一部分，不得被受擊打斷 */
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
  if(now < c._hurtUntil){
    if(heroAnim.name !== 'hurt'){ heroAnim.name = 'hurt'; heroAnim.frame = 0; heroAnim.lastUpdate = now; }
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
  /* rev-fix-anim-start: 用 animStart 記錄動畫起點，不重置 lastUpdate */
  heroAnim.name = anim;
  heroAnim.frame = 0;
  heroAnim.animStart = now;
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
  /* rev-fix-anim-start: 用 animStart 記錄動畫起點 */
  heroAnim.name = anim;
  heroAnim.frame = 0;
  heroAnim.animStart = now;
  heroAnim.forcedEnd = now + dur;
}

function _playReload(now, w, ammo){
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
  /* rev-fix-reload-pending: 記錄待填充彈匣，CD 結束後處理 */
  if(w && w.def && ammo){
    const take = Math.min(w.def.mag, ammo.count);
    if(take > 0){
      c._pendingReload = { weaponId: w.id, ammoId: ammo.id, ammoRarity: ammo.rarity, count: take };
    }
  }
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

/* rev-fix-vehicle-hit-y: 载具战中的子弹落点 y 以载具视觉中心为准
 *   原因：敌方子弹的 y 原本是敌人枪口高度（约 0.65~0.73），但载具主体在 0.4~0.55，
 *   子弹飞向 y=0.7 会落在炮管下方的空气中（T-80）或车体侧下部（BTR-80），
 *   视觉上「打空气」或「打侧面」。修正后瞄准载具视觉中心。 */
function _getVehicleHitScreenY(){
  var b = window.BTRSupport;
  if(!b || !b.active) return 0.6;
  var h = b.height;
  if(!h) return 0.6;
  var centerY = (h * 0.95 - b.targetH / 2) / h;
  return Math.max(0.30, Math.min(0.60, centerY));
}

function _isDiscovered(en, evWorldX, isV, p, ex){
  const dist = Math.abs(evWorldX - ex.worldX);
  const playerR = (typeof PLAYER_DETECTABLE_R !== 'undefined') ? (PLAYER_DETECTABLE_R[state.preferences.actionMode] || 80) : 80;
  const enemyR = (typeof ENEMY_DETECTABLE_R !== 'undefined') ? (ENEMY_DETECTABLE_R[en.rarity] || 225) : 225;
  if(dist <= playerR) return true;
  if(dist <= enemyR) return true;
  if(isV && p && p.vehicleId && typeof window.getVehicleDetectableR === 'function'){
    const vehR = window.getVehicleDetectableR(p.vehicleId) || 80;
    if(dist <= vehR) return true;
  }
  return false;
}

function _syncWorldEnemies(now){
  const c = window._combat;
  const ex = window._explore;
  if(!c || !ex || !c.active || c.resolved) return;
  const _activeSet = new Set(c.enemies);
  const _p = c.allies[0];
  if(!_p) return;
  const isV = c.sceneType === 'vehicle' && _p.isVehicle;
  for(const node of ex.nodes){
    for(const ev of node.events){
      if(ev.cleared) continue;
      if(ev.type !== 'combat') continue;
      if(!ev.content || !ev.content.length) continue;
      if(isV && ev.worldX <= ex.worldX) continue;
      for(let j = 0; j < ev.content.length; j++){
        const en = ev.content[j];
        if(!en || en.hp <= 0) continue;
        if(_activeSet.has(en)) continue;
        if(!_isDiscovered(en, ev.worldX, isV, _p, ex)) continue;
        en.worldX = ev.worldX + (j - (ev.content.length - 1) / 2) * 1.5;
        en._initWorldX = en.worldX;
        en._eventRef = ev;
        en._nextFireAt = now + REACTION_SECOND_MS;
        c.enemies.push(en);
        _activeSet.add(en);
      }
    }
  }
}

function _tickAI(dt, now){
  const c = window._combat;
  if(!c) return;
  /* rev-fix-pending-reload: 换弹 CD 结束后填充弹匣 */
  if(c._pendingReload && now >= (c._playerReloadEnd || 0)){
    const _pr = c._pendingReload;
    c._pendingReload = null;
    invRemove(_pr.ammoId, _pr.ammoRarity, _pr.count);
    c._playerMag.weaponId = _pr.weaponId;
    c._playerMag.inMag = _pr.count;
    c._playerMag.ammoRef = { id: _pr.ammoId, rarity: _pr.ammoRarity, def: AMMO[_pr.ammoId] };
  }
  const p = c.allies[0];
  if(!p) return;
  const _isVeh = (c.sceneType === 'vehicle');

  /* v176 修復7：倒序遍歷，已死 / 被撞死的條目立即從 c.enemies 移除，
     避免載具戰 30 秒累積數百個 hp=0 的僵尸條目。倒序 splice 安全。 */
  for(let i = c.enemies.length - 1; i >= 0; i--){
    const e = c.enemies[i];
    if(e.hp <= 0){ c.enemies.splice(i, 1); continue; }
    if(_isVeh && (!isFinite(e.worldX) || e.worldX <= p.worldX + ((typeof window.getVehicleHalfLengthWorld === 'function') ? window.getVehicleHalfLengthWorld(p.vehicleId) : 3.6))){
      e.hp = 0;
      e.gone = true;
      c.enemies.splice(i, 1);
      if(typeof addExp === 'function') addExp(3);
      if(typeof window._settleVehicleEventIfCleared === 'function') window._settleVehicleEventIfCleared(e);
      continue;
    }
    /* rev142: 敵人的靠近與開火都用 canEngage 統一判定 */
    const r = _eRange(e);
    let _anyTarget142 = false;
    for(let _ai142 = 0; _ai142 < c.allies.length; _ai142++){
      const _a142 = c.allies[_ai142];
      if(_a142.hp <= 0) continue;
      if(window.canEngage(r, _a142, Math.abs(_a142.worldX - e.worldX))){ _anyTarget142 = true; break; }
    }
    if(!_anyTarget142 && e.worldX > p.worldX){
      /* 敵人沒發現玩家（不在 getEntityDetectableR(p) 內）→ 原地待命，不主動靠近 */
      const _detectR = (typeof window.getEntityDetectableR === 'function') ? window.getEntityDetectableR(p) : 80;
      if(Math.abs(e.worldX - p.worldX) <= _detectR){
        /* [v185b H25] 敌人不能越过任何我方单位（玩家或载员）。
           找敌人前方（左侧）最近的我方单位 worldX，敌人世界坐标不能低于它 + 0.5m。
           修「敌人穿过 firing 载员走到载员身后」。 */
        let _minAllowedX = p.worldX + 0.5;
        for(let _aiH25 = 1; _aiH25 < c.allies.length; _aiH25++){
          const _aH25 = c.allies[_aiH25];
          if(_aH25.hp <= 0) continue;
          if(_aH25._retreating) continue;
          if(_aH25.worldX < e.worldX && (_aH25.worldX + 0.5) > _minAllowedX){
            _minAllowedX = _aH25.worldX + 0.5;
          }
        }
        e.worldX -= Math.min(8, 1.4 * dt);
        if(e.worldX < _minAllowedX) e.worldX = _minAllowedX;
      }
    }
    if(_anyTarget142 && now >= e._nextFireAt) _enemyFire(e, now);
  }

  if(c.sceneType === 'vehicle') return;
  _autoFireFoot(now);
}

function _autoFireFoot(now){
  const c = window._combat, p = c.allies[0];
  if(!p) return;
  /* rev144: 換彈期間僅推遲玩家開火，不影響載員射擊 */
  if(c._playerReloadEnd && now < c._playerReloadEnd){
    p._nextFireAt = c._playerReloadEnd;
  }
  const alive = [];
  for(let i = 0; i < c.enemies.length; i++) if(c.enemies[i].hp > 0) alive.push(c.enemies[i]);
  if(!alive.length) return;

  let _playerTarget = null;

  /* 問題 3：車門開啟後玩家不射擊，由載具承傷 */
  const _btr = window.BTRSupport;
  const _btrPlayerProtected = !!(_btr && _btr.active && (_btr.phase === 'arrive' || _btr.phase === 'sink' || _btr.phase === 'center' || _btr.phase === 'support'));
  if(p.isPlayer && !_btrPlayerProtected && p.hp > 0 && now >= (p._nextFireAt || 0)){
    /* rev-fix-player-grenade-branch: 10% 概率優先投雷 */
    let _threw = false;
    if(typeof getThrowableCount === 'function' && getThrowableCount() > 0 && Math.random() < 0.10){
      const _gt = (typeof equippedWeapon === 'function') ? equippedWeapon('throwable') : null;
      if(_gt && _gt.def && _gt.def.slot === 'throwable'){
        const _gr = _getGrenadePhysics(_gt.id).maxRange;
        const _gir = [];
        for(let _ga = 0; _ga < alive.length; _ga++){
          if(window.canEngage(_gr, alive[_ga], Math.abs(alive[_ga].worldX - p.worldX))) _gir.push(alive[_ga]);
        }
        if(_gir.length){
          _gir.sort(function(x, y){ return Math.abs(x.worldX - p.worldX) - Math.abs(y.worldX - p.worldX); });
          _playerThrowGrenade(p, _gir[0], now, _gt);
          state.player.throwableStock--;
          p._nextFireAt = now + 1200;
          _threw = true;
          /* rev-fix-throw-refill: 欄空時從庫存補 1 顆（按 throwableExplore 偏好） */
          if(state.player.throwableStock <= 0){
            try {
              var _tp = state.preferences.throwableExplore || {};
              var _tpri = _tp.priority || '一般';
              var _tex = _tp.exclude || [];
              var _tfb = _tp.fallback || 'desc';
              var _tcands = [];
              for(var _tk in state.inventory){
                if(state.inventory[_tk] <= 0) continue;
                var _tparts = _tk.split('@');
                var _tid = _tparts[0], _trar = _tparts[1];
                var _tdef = (typeof WEAPONS !== 'undefined') ? WEAPONS[_tid] : null;
                if(!_tdef || _tdef.slot !== 'throwable') continue;
                if(_tex.indexOf(_trar) >= 0) continue;
                _tcands.push({ id: _tid, rarity: _trar });
              }
              if(_tcands.length){
                var _tpriIdx = (typeof RARITY_ORDER !== 'undefined') ? RARITY_ORDER.indexOf(_tpri) : 1;
                _tcands.sort(function(a, b){
                  var _ai = RARITY_ORDER.indexOf(a.rarity);
                  var _bi = RARITY_ORDER.indexOf(b.rarity);
                  var _ad = Math.abs(_ai - _tpriIdx);
                  var _bd = Math.abs(_bi - _tpriIdx);
                  if(_ad !== _bd) return _ad - _bd;
                  if(_tfb === 'desc') return _bi - _ai;
                  return _ai - _bi;
                });
                var _tchosen = _tcands[0];
                if(typeof invRemove === 'function') invRemove(_tchosen.id, _tchosen.rarity, 1);
                state.player.equipped = state.player.equipped || {};
                state.player.equipped.throwable = _tchosen.id;
                state.player.equippedRarity = state.player.equippedRarity || {};
                state.player.equippedRarity.throwable = _tchosen.rarity;
                state.player.throwableStock = 1;
              }
            } catch(_te){ console.warn('[throwable refill]', _te); }
          }
        }
      }
    }
    if(!_threw){
      const w = _getPW();
      if(w && w.def){
        const r = _rangeOfWeaponDef(w.def);
        const ir = [];
        for(let a = 0; a < alive.length; a++){
          if(window.canEngage(r, alive[a], Math.abs(alive[a].worldX - p.worldX))) ir.push(alive[a]);
        }
        if(ir.length){
          ir.sort(function(x, y){ return Math.abs(x.worldX - p.worldX) - Math.abs(y.worldX - p.worldX); });
          const ok = _firePlayer(p, ir[0], now, w);
          if(ok) _playerTarget = ir[0];
          p._nextFireAt = now + (ok ? Math.max(120, 60000 / (w.def.rpm || 600)) : 800);
        }
      }
    }
  }

  for(let ii = 1; ii < c.allies.length; ii++){
    const a2 = c.allies[ii];
    if(a2.hp <= 0 || a2._retreating || !a2.isPassenger || !a2.weapon || !a2.weapon.def) continue;
    /* rev-fix-skip-ah-autofire: 弹药手不参与射击（不调 _firePassenger） */
    if(typeof _isAmmoHandler === 'function' && _isAmmoHandler(a2)) continue;
    if(a2._mode === 'advancing' || a2._mode === 'chasing' || a2._mode === 'waiting') continue;
    if(now < (a2._nextFireAt || 0)) continue;
    const r2 = _rangeOfWeaponDef(a2.weapon.def);
    const ir2 = [];
    /* [v182c H7] 载员开火用 dist <= r2 而非 canEngage。
       原 canEngage 会额外检查 dist <= R_enemy（敌人 detectableR），
       rare 敌人（傳奇 R=45m）在载员 50m 外时 canEngage 返回 false，
       但 _tickAlliesPositions 已判定 _mode='firing'（dist <= 自身射程 50m）
       → 载员 firing 状态却不射火 → 用户看到「玩家打、载员不打」。
       载员只看自身射程，与 _tickAlliesPositions 的 firing 判定一致。 */
    for(let b = 0; b < alive.length; b++){
      const _dist2 = Math.abs(alive[b].worldX - a2.worldX);
      if(_dist2 <= r2) ir2.push(alive[b]);
    }
    if(!ir2.length) continue;
    ir2.sort(function(x, y){ return Math.abs(x.worldX - a2.worldX) - Math.abs(y.worldX - a2.worldX); });
    _firePassenger(a2, ir2[0], now, a2.weapon);
    a2._nextFireAt = now + Math.max(120, 60000 / (a2.weapon.def.rpm || 600));
  }
}

/* rev-fix-findNextSlot: 從 fromSlot 之後找下一個可用武器 */
function _findNextAvailableSlot(fromSlot){
  const c = window._combat;
  const order = ['primary', 'secondary', 'melee'];
  const fromIdx = order.indexOf(fromSlot);
  if(fromIdx < 0) return null;
  for(let i = fromIdx + 1; i < order.length; i++){
    const s = order[i];
    const id = state.player.equipped[s];
    const d = id ? itemDef(id) : null;
    if(!d) continue;
    if(d.slot === 'melee') return { slot: s, id, def: d };
    if(d.cal){
      const ammo = (typeof pickAmmoByPreferenceOrOrder === 'function') ? pickAmmoByPreferenceOrOrder(d.cal, 'combat') : null;
      const hasMag = c && c._playerMag && c._playerMag.weaponId === id && c._playerMag.inMag > 0;
      if(ammo || hasMag) return { slot: s, id, def: d };
    }
  }
  return null;
}

function _getPW(){
  const c = window._combat;
  /* rev-fix-getPW-active: 已有 activeSlot 則繼續用 */
  if(c && c._activeSlot){
    const s = c._activeSlot;
    const id = state.player.equipped[s];
    const d = id ? itemDef(id) : null;
    if(d) return { id, rarity: state.player.equippedRarity[s] || '一般', slot: s, def: d };
  }
  /* 否則按主→副→近戰找可用武器 */
  const order = ['primary', 'secondary', 'melee'];
  for(const s of order){
    const id = state.player.equipped[s];
    const d = id ? itemDef(id) : null;
    if(!d) continue;
    if(d.slot === 'melee'){
      if(c) c._activeSlot = s;
      return { id, rarity: state.player.equippedRarity[s] || '一般', slot: s, def: d };
    }
    if(d.cal){
      /* rev-fix-getPW-null: c 為 null 時（戰鬥尚未啟動）也應返回主武器 */
      if(c){
        const hasMag = c._playerMag && c._playerMag.weaponId === id && c._playerMag.inMag > 0;
        if(hasMag){ c._activeSlot = s; return { id, rarity: state.player.equippedRarity[s] || '一般', slot: s, def: d }; }
        const ammo = (typeof pickAmmoByPreferenceOrOrder === 'function') ? pickAmmoByPreferenceOrOrder(d.cal, 'combat') : null;
        if(ammo){ c._activeSlot = s; return { id, rarity: state.player.equippedRarity[s] || '一般', slot: s, def: d }; }
      } else {
        return { id, rarity: state.player.equippedRarity[s] || '一般', slot: s, def: d };
      }
    }
  }
  return null;
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
  const take = Math.min(w.def.mag, ammo.count);
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
    const critMult = (typeof calcCritMult === 'function') ? calcCritMult(w.rarity, w.rarity) /* rev-fix-throw-crit-self */ : 1.5;
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
    if(c._playerMag && c._playerMag.weaponId === w.id && c._playerMag.inMag > 0){
      c._playerMag.inMag--;
    } else {
      /* 彈匣空：先嘗試換彈，備彈空則切換 */
      const _ammo = (typeof pickAmmoByPreferenceOrOrder === 'function') ? pickAmmoByPreferenceOrOrder(w.def.cal, 'combat') : null;
      if(_ammo){
        _playReload(now, w, _ammo);
        return false;
      }
      const _next = _findNextAvailableSlot(w.slot);
      if(_next){
        c._activeSlot = _next.slot;
        _playSwitch(now, _next.slot === 'secondary');
      }
      return false;
    }
  }

  /* rev-fix-fire-chain-unify: 改用 _getFireChainMode */
  const _effMode = _getFireChainMode(c);

  let hr = (typeof getHitRate === 'function') ? getHitRate(w.def.type, _effMode, w.def.scopeBonus || 0, w.def.scope) : 30;
  if(!c.playerFirst) hr *= SECOND_HIT_RATE;

  _playFire(now, w.slot === 'primary');

  const mz = _getPlayerMuzzlePosFoot();
  const sm = c.sm;
  const rel = t.worldX - p.worldX;
  const tx = EXPLORE_HERO_X_RATIO + (rel / sm.screenRightWorld) * (1 - EXPLORE_HERO_X_RATIO);

  const hit = Math.random() * 100 < hr;

  const _pBulletRar = (w.def.slot === 'throwable')
    ? (w.rarity || '一般')
    : ((c._playerMag && c._playerMag.ammoRef && c._playerMag.ammoRef.rarity) ? c._playerMag.ammoRef.rarity : '一般');

  const distPx = Math.abs(t.worldX - p.worldX) * sm.bgPixelsPerMeter;
  const _approachPx = Math.max(0, (window._explore && window._explore._currentSpeed) || 0) * sm.bgPixelsPerMeter;
  let _tx, duration, isFast = false;
  if(w.def.cal){
    const _spd = (typeof _ammoSpeedForCal === 'function') ? _ammoSpeedForCal(w.def.cal) : 500;
    duration = Math.max(16, (Math.abs(t.worldX - p.worldX) / _spd) * 1000);
    _tx = hit ? tx : ((tx >= mz.x) ? 1.5 : -0.5);
    isFast = true;

    const _fxElP = document.getElementById('combat-overlay');
    if(window.MuzzleFX) window.MuzzleFX.spawn(mz.x * (_fxElP? _fxElP.clientWidth : 400), mz.y * (_fxElP? _fxElP.clientHeight : 500), w.def.type === '機槍' ? 1.2 : 1.0, false, 'explore');
  } else {
    _tx = hit ? tx : (tx + 0.15);
    duration = Math.max(50, (distPx / (2000 + _approachPx)) * 1000);
  }

  c.bullets.push({
    sx: mz.x, sy: mz.y, tx: _tx, ty: mz.y, t: 0,
    start: performance.now(), duration: duration,
    enemy: false, hit: hit, rarity: _pBulletRar,
    big: (w.def.slot === 'throwable'), arc: (w.def.slot === 'throwable'),
    isFast: isFast,
    _target: t,
    _onHit: function() {
      if(!hit || t.hp <= 0) return;
      const a = c._playerMag.ammoRef;
      const r = _resolveSingleAttack({
        ammoId: a ? a.id : null,
        ammoRarity: a ? a.rarity : '一般',
        weaponRarity: w.rarity,
        penMM: a ? (a.def.penMM || 0) : (w.def.penMM || 0),
        fallbackDmg: w.def.dmg || 20
      }, t);
      t.hp = Math.max(0, t.hp - r.hpLost);
      t.armor = Math.max(0, (t.armor || 0) - r.armorLost);
      const crit = r.crit;
      const shown = r.totalShown;
      _float(t, '-' + shown + (crit ? '!' : ''), crit ? 'crit' : (r.hpLost > 0 ? '' : 'armor'));
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

  /* rev-fix-fire-no-trailing: 换弹延后到下次开火时处理 */
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
        if(p._isAmmoHandlerBox && p._ownerP) p._ownerP.primaryWeaponBoxCount = p.count;
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

  /* rev-fix-passenger-grenade-branch: 10% 概率優先投雷 */
  if(a.grenades && a.grenades.length > 0 && now >= (a._nextGrenadeAt || 0) && Math.random() < 0.10){
    /* rev141: 手榴彈 = 配置；找第一個庫存有貨的配置，扣 1 庫存才投；無貨則不投 */
    let _chosenG141 = null, _chosenDef141 = null;
    for(const _cfg141 of a.grenades){
      const _cnt141 = (typeof invCount === 'function') ? invCount(_cfg141.id, _cfg141.rarity) : 0;
      if(_cnt141 <= 0) continue;
      const _def141 = (typeof WEAPONS !== 'undefined') ? WEAPONS[_cfg141.id] : null;
      if(_def141 && _def141.slot === 'throwable'){ _chosenG141 = _cfg141; _chosenDef141 = _def141; break; }
    }
    if(_chosenG141 && _chosenDef141){
      const _gr141 = _rangeOfWeaponDef(_chosenDef141);
      if(window.canEngage(_gr141, t, Math.abs(t.worldX - a.worldX))){
        invRemove(_chosenG141.id, _chosenG141.rarity, 1);
        a._nextGrenadeAt = now + 1500;
        _passengerThrowGrenade(a, t, _chosenDef141, _chosenG141.rarity, now, _chosenG141.id);
        return;
      }
    }
  }

  if(!a._magazine || a._magazine.weaponId !== w.id){
    a._magazine = { weaponId: w.id, inMag: 0, ammoId: null, ammoRarity: null, def: null };
    a._magInit = false;
    a._reloadEnd = 0;
    a._reloadAnimStart = 0;
  }

  if(a._reloadEnd && now < a._reloadEnd) return;

  if(a._magazine.inMag <= 0){
    const magSize = def.mag;
    const firstAmmo = _consumePassengerAmmo(a, def.cal);
    if(!firstAmmo){
      a._retreating = true;
      a._mode = null;
      if(window._explore && window._explore.passengersFollowing && a.srv){
        const _pf = window._explore.passengersFollowing;
        for(let _pi = 0; _pi < _pf.length; _pi++){
          const _it = _pf[_pi];
          if(_it.srv && _it.srv.id === a.srv.id){
            _it._retreating = true;
            _it._retreatSpeed = true;
            _it.targetX = 1.8 + _pi * 0.05;
            break;
          }
        }
      }
      if(typeof pushLog === 'function'){
        const _sRar = (a.srv && a.srv.rarity) ? a.srv.rarity : '一般';
        const _sCls = (typeof rarityClass === 'function') ? rarityClass(_sRar) : 'r-一般';
        pushLog('<span class="' + _sCls + '">' + (typeof servantLabel === 'function' ? servantLabel(a.srv) : '載員') + '</span> 彈藥耗盡，撤退', [], 'explore');
      }
      return;
    }
    let taken = 1;
    {
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

  /* rev-fix-passenger-anim-dur: 时长从 GAME_ANIMS.fire_primary 计算，改 fps/帧数时自动跟随，
   * 避免 v314 引入的「载员 busy 静止」因动画缩短而误判。 */
  const _perfNow = performance.now();
  const _wallNow = Date.now();
  const _fpAnimDef = (typeof GAME_ANIMS !== 'undefined' && GAME_ANIMS.fire_primary) ? GAME_ANIMS.fire_primary : null;
  const _fpDur = _fpAnimDef ? Math.round(_fpAnimDef.frameCount / _fpAnimDef.fps * 1000) : 250;
  a._fireAnimStart = _perfNow;
  a._fireAnimUntil = _perfNow + _fpDur;
  if(a.srv){ a.srv._standStart = _wallNow; a.srv._standUntil = _wallNow + 150; }

  /* rev-fix-fire-chain-unify: 改用 _getFireChainMode */
  const _effModeA = _getFireChainMode(a);

  /* rev-fix-passenger-scope: 瞄具加成，與守衛一致 */
  const _scopeBonusA = (a.weapon && a.weapon.def && a.weapon.def.scopeBonus) || 0;
  let hr = (typeof servantHitRate === 'function') ? servantHitRate(a.srv, _effModeA, _scopeBonusA, (a.weapon && a.weapon.def && a.weapon.def.scope) || null) : 20;
  if(!c.playerFirst) hr *= SECOND_HIT_RATE;

  const sm = c.sm;
  const mz = _getPassengerMuzzlePos(a);
  if(!mz) return;

  const rel = t.worldX - a.worldX;
  const tx = EXPLORE_HERO_X_RATIO + (rel / sm.screenRightWorld) * (1 - EXPLORE_HERO_X_RATIO);

  const hit = Math.random() * 100 < hr;

  const distPx = Math.abs(t.worldX - a.worldX) * sm.bgPixelsPerMeter;
  const _approachPx = Math.max(0, (window._explore && window._explore._currentSpeed) || 0) * sm.bgPixelsPerMeter;
  let _tx, duration, isFast = false;
  if(def.cal){
    const _spd = (typeof _ammoSpeedForCal === 'function') ? _ammoSpeedForCal(def.cal) : 500;
    duration = Math.max(16, (Math.abs(t.worldX - a.worldX) / _spd) * 1000);
    _tx = hit ? tx : ((tx >= mz.x) ? 1.5 : -0.5);
    isFast = true;

    const _fxElA = document.getElementById('combat-overlay');
    if(window.MuzzleFX) window.MuzzleFX.spawn(mz.x * (_fxElA? _fxElA.clientWidth : 400), mz.y * (_fxElA? _fxElA.clientHeight : 500), def.type === '機槍' ? 1.2 : 1.0, false, 'explore');
  } else {
    _tx = hit ? tx : (tx + 0.15);
    duration = Math.max(50, (distPx / (2000 + _approachPx)) * 1000);
  }

  c.bullets.push({
    sx: mz.x, sy: mz.y, tx: _tx, ty: mz.y, t: 0,
    start: performance.now(), duration: duration,
    enemy: false, hit: hit, rarity: (am && am.rarity) ? am.rarity : '一般',
    isFast: isFast,
    _target: t,
    _onHit: function() {
      if(!hit || t.hp <= 0) return;
      /* rev-fix-attack-unify: 統一結算 */
      const r = _resolveSingleAttack({
        ammoId: am.id,
        ammoRarity: am.rarity,
        weaponRarity: w.rarity,
        penMM: am.def.penMM || 0,
        fallbackDmg: w.def.dmg || 20
      }, t);
      t.hp = Math.max(0, t.hp - r.hpLost);
      t.armor = Math.max(0, (t.armor || 0) - r.armorLost);
      const crit = r.crit;
      const shown = r.totalShown;
      _float(t, '-' + shown + (crit ? '!' : ''), crit ? 'crit' : (r.hpLost > 0 ? '' : 'armor'));
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
          const _aRar = (a.srv && a.srv.rarity) ? a.srv.rarity : '一般';
          const _aCls = (typeof rarityClass === 'function') ? rarityClass(_aRar) : 'r-一般';
          pushLog('<span class="' + _aCls + '">' + (typeof servantLabel === 'function' ? servantLabel(a.srv) : '載員') + '</span> 用 <span class="' + _wCls + '">' + _wName + '</span> 擊殺 <b class="r-' + (t.rarity || '一般') + '">' + eName + '</b>', [], 'explore');
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
  const _btr = window.BTRSupport;
  const _btrProtect = !!(_btr && _btr.active && (_btr.phase === 'arrive' || _btr.phase === 'sink' || _btr.phase === 'center' || _btr.phase === 'support'));
  const _eRange142 = _eRange(e);
  const aliveAllies = [];
  for(let i = 0; i < c.allies.length; i++){
    const _a142 = c.allies[i];
    if(_a142.hp <= 0) continue;
    if(_a142._retreating) continue;
    if(_btrProtect && _a142.isPlayer) continue;
    if(window.canEngage(_eRange142, _a142, Math.abs(_a142.worldX - e.worldX))) aliveAllies.push(_a142);
  }
  if(!aliveAllies.length) return;
  aliveAllies.sort(function(a,b){ return Math.abs(a.worldX - e.worldX) - Math.abs(b.worldX - e.worldX); });
  const p = aliveAllies[0];

  if(e.grenade && e.grenade.count > 0 && Math.random() < 0.15){
    const _gDef = (typeof WEAPONS !== 'undefined' && e.grenade.id) ? WEAPONS[e.grenade.id] : null;
    const _gRange = _getGrenadePhysics(e.grenade.id).maxRange;
    if(window.canEngage(_gRange, p, Math.abs(e.worldX - p.worldX))){
      e.grenade.count--;
      _enemyThrowGrenade(e, p, now);
      e._nextFireAt = now + 1500;
      return;
    }
  }

  const _rpgRange144 = (typeof RPG_COMBAT_RANGE !== 'undefined') ? RPG_COMBAT_RANGE : 150;
  if(e.hasRPG && e.rpgAmmo > 0 && window.canEngage(_rpgRange144, p, Math.abs(e.worldX - p.worldX))){
    e.rpgAmmo--;
    _enemyFireRPG(e, p, now);
    e._nextFireAt = now + 5000;
    return;
  }

  /* rev-fix-enemy-3mags: 弹药检查 + 换弹 + 切武器 */
  var _fireRes = _enemyTryFire(e, now);
  if(!_fireRes.ok) return;
  var w = _fireRes.weapon;
  if(!w) return;

  /* 近战分支 */
  if(_fireRes.melee){
    const _md = WEAPONS[w.id];
    if(!_md) return;
    const _modeMult = (typeof MODE_ACCURACY !== 'undefined' && MODE_ACCURACY['近戰']) || 1.0;
    const hc = (e.hitBase || 0.55) * _modeMult * (c.playerFirst ? SECOND_HIT_RATE : 1);
    const hit = Math.random() < hc;
    /* 近战动画 */
    e._fireAnimName = 'attack_melee';
    e._fireAnimStart = now;
    e._fireAnimUntil = now + 300;
    e._nextFireAt = now + Math.max(500, 60000 / (_md.rpm || 120));
    if(!hit || p.hp <= 0) return;
    const _mdmg = Math.round((_md.dmg || 25) * (RARITY_MULT[e.rarity] || 1));
    const _mpen = _md.penMM || 3;
    if(p.isVehicle){
      if(typeof window._vHitVehicle === 'function'){
        const _eNameV2 = (typeof ENEMIES !== 'undefined' && ENEMIES[e.eid]) ? ENEMIES[e.eid].name : e.eid;
        window._vHitVehicle(p, _mdmg, _mpen, 'melee', _eNameV2, _md.name || '近戰', '一般', e.rarity || '一般');
      }
      return;
    }
    const r = _resolveSingleAttack({
      ammoId: null, ammoRarity: '一般', weaponRarity: e.rarity,
      penMM: _mpen, fallbackDmg: _mdmg
    }, p);
    p.hp = Math.max(0, p.hp - r.hpLost);
    p.armor = Math.max(0, (p.armor || 0) - r.armorLost);
    if(p.isPlayer){
      state.player.hp = p.hp; state.player.armor = p.armor;
      _playHurt(performance.now());
      _float(p, '-' + (r.hpLost + r.armorLost), r.crit ? 'crit' : '');
      /* rev-fix-player-killer-melee: 近战击杀玩家 → 记录 _playerKiller */
      if(p.hp <= 0 && !c._playerKiller){
        var _eNameKm = (typeof ENEMIES !== 'undefined' && ENEMIES[e.eid]) ? ENEMIES[e.eid].name : e.eid;
        c._playerKiller = { name: _eNameKm, weapon: _md.name || '近戰', wRarity: e.rarity || '一般', aRarity: e.rarity || '一般' };
      }
      if(p.hp <= 0){
        state.player.hp = 0;
        state.player.deadUntil = Date.now() + 60000;
        if(window._explore){
          window._explore.mode = 'dead';
          window._explore.deadUntil = performance.now() + 60000;
          window._explore.combatEvent = null;
        }
        if(typeof window._playHeroDeath === 'function') window._playHeroDeath();
        if(typeof _evac === 'function' && !(window._explore && window._explore.evacuatingPassengers)){
          try { _evac(); } catch(err){}
        }
      }
    } else if(p.isPassenger && p.srv){
      _float(p, '-' + r.hpLost, '');
      if(p.hp <= 0){
        p.hp = 0;
        p.srv.hp = 0;
        p.srv.injuredUntil = Date.now() + 4 * 3600 * 1000;
        p.srv._injuredDown = true;
        p._injuredDown = true;
        if(typeof pushLog === 'function'){
          /* rev-fix-passenger-killer-melee: 载员被近战打死 → 显示敌人名+实际武器 */
          const _eNameNm = (typeof ENEMIES !== 'undefined' && ENEMIES[e.eid]) ? ENEMIES[e.eid].name : e.eid;
          const _eClsNm = (typeof rarityClass === 'function') ? rarityClass(e.rarity || '一般') : '';
          const _wNameNm = (_md && _md.name) ? _md.name : '近戰';
          const _wClsNm = (typeof rarityClass === 'function') ? rarityClass(e.rarity || '一般') : '';
          const _sClsN = (typeof rarityClass === 'function') ? rarityClass(p.srv.rarity || '一般') : '';
          const _sNameN = (typeof servantLabel === 'function') ? servantLabel(p.srv) : '載員';
          pushLog('<span class="' + _sClsN + '">' + _sNameN + '</span> 被 <span class="' + _eClsNm + '">' + _eNameNm + '</span> 用 <span class="' + _wClsNm + '">' + _wNameNm + '</span> <span class="lose">擊倒</span>', [], 'explore');
        }
      }
    }
    return;
  }

  /* 枪械射击 */
  /* rev-fix-anim-duration-unified */
  const _fpAnimDef = (typeof GAME_ANIMS !== 'undefined' && GAME_ANIMS.fire_primary) ? GAME_ANIMS.fire_primary : null;
  const _fpDur = _fpAnimDef ? Math.round(_fpAnimDef.frameCount / _fpAnimDef.fps * 1000) : 250;
  e._fireAnimName = 'fire_primary';
  e._fireAnimStart = now;
  e._fireAnimUntil = now + _fpDur;

  const mz = _getEnemyMuzzlePos(e, p);
  let _tgtScreenX = null;
  if(p && p.isPassenger && p.srv){
    const _pfArrT = (window._explore && window._explore.passengersFollowing) || [];
    for(let _piT = 0; _piT < _pfArrT.length; _piT++){
      if(_pfArrT[_piT].srv && _pfArrT[_piT].srv.id === p.srv.id){ _tgtScreenX = _pfArrT[_piT].screenX; break; }
    }
  }
  const px = (() => {
    const _p = c.allies[0];
    if(p && p.isVehicle && typeof battle !== 'undefined' && battle && typeof battle.px === 'number'){
      return battle.px;
    }
    if(_tgtScreenX != null) return _tgtScreenX;
    const _pWX = _p ? _p.worldX : 0;
    const _tWX = (p && typeof p.worldX === 'number') ? p.worldX : _pWX;
    const _relWX = _tWX - _pWX;
    return EXPLORE_HERO_X_RATIO + (_relWX / c.sm.screenRightWorld) * (1 - EXPLORE_HERO_X_RATIO);
  })();

  const _effModeE = _getFireChainMode(e);
  const _modeMultE = (typeof MODE_ACCURACY !== 'undefined' && MODE_ACCURACY[_effModeE]) || 1.0;
  const _hb = p.isVehicle ? 0.25 : (e.hitBase || 0.55);
  const hc = _hb * _modeMultE * (c.playerFirst ? SECOND_HIT_RATE : 1);
  const hit = Math.random() < hc;
  const tx = hit ? px : (px - 0.5);

  const _wdX = (typeof WEAPONS !== 'undefined' && w.id && WEAPONS[w.id]) ? WEAPONS[w.id] : null;
  const _rpmX = _wdX ? (_wdX.rpm || 600) : 600;
  e._nextFireAt = now + Math.max(200, 60000 / _rpmX);

  const distPx = Math.abs(p.worldX - e.worldX) * c.sm.bgPixelsPerMeter;
  const _approachPx = Math.max(0, (window._explore && window._explore._currentSpeed) || 0) * c.sm.bgPixelsPerMeter;
  /* rev-fix-vehicle-hit-pos: 载具目标 → 瞄准载具视觉中心；载员 → 0.55；玩家 → 敌人枪口高度 */
  let _ty;
  if(p && p.isVehicle){
    _ty = (typeof _getVehicleHitScreenY === 'function')
      ? (_getVehicleHitScreenY() + (Math.random() - 0.5) * 0.06)
      : 0.45;
  } else if(p && p.isPassenger){
    _ty = 0.55 + (Math.random() - 0.5) * 0.10;
  } else {
    _ty = mz.y + (Math.random() - 0.5) * 0.15;
  }
  let _tx, duration, isFast = false;
  if(_wdX && _wdX.cal){
    const _spd = (typeof _ammoSpeedForCal === 'function') ? _ammoSpeedForCal(_wdX.cal) : 500;
    duration = Math.max(16, (Math.abs(p.worldX - e.worldX) / _spd) * 1000);
    _tx = hit ? tx : ((tx < mz.x) ? -0.5 : 1.5);
    isFast = true;
    const _rar = (w && w.ammoId && typeof AMMO !== 'undefined' && AMMO[w.ammoId]) ? AMMO[w.ammoId].rarity : '一般';
    c.tracers.push({ sx: mz.x, sy: mz.y, tx: _tx, ty: _ty, born: performance.now(), dur: 200, color: window._rarityBulletColor(_rar), hit: hit, _target: p });
    const _fxElE = document.getElementById('combat-overlay');
    const _wTypeE = (w && w.id && typeof WEAPONS !== 'undefined' && WEAPONS[w.id]) ? WEAPONS[w.id].type : null;
    if(window.MuzzleFX) window.MuzzleFX.spawn(mz.x * (_fxElE? _fxElE.clientWidth : 400), mz.y * (_fxElE? _fxElE.clientHeight : 500), _wTypeE === '機槍' ? 1.2 : 1.0, true, 'explore');
  } else {
    _tx = tx;
    duration = Math.max(50, (distPx / (1200 + _approachPx)) * 1000);
  }

  c.bullets.push({
    sx: mz.x, sy: mz.y, tx: _tx, ty: _ty, t: 0,
    isFast: isFast,
    start: performance.now(), duration: duration,
    enemy: true, hit: hit,
    rarity: (w && w.ammoId && typeof AMMO !== 'undefined' && AMMO[w.ammoId]) ? (AMMO[w.ammoId].rarity || '一般') : '一般',
    _target: p,
    _onHit: function() {
      if(!hit || p.hp <= 0) return;
      let dmg;
      if(w.ammoId && AMMO[w.ammoId]){
        const _ammoDefE = AMMO[w.ammoId];
        dmg = Math.round(_ammoDefE.dmg * (RARITY_MULT[_ammoDefE.rarity] || 1));
      } else {
        dmg = (w.dmg != null ? w.dmg : (e.dmg != null ? e.dmg : 10));
      }
      const penMM = (AMMO[w.ammoId] && AMMO[w.ammoId].penMM) || e.penMM || 0;
      const _wRarE = e.rarity || '一般';
      const _aRarE = (w.ammoId && AMMO[w.ammoId]) ? AMMO[w.ammoId].rarity : '一般';

      if(p.isVehicle){
        const _isCritV = Math.random() < calcCritRate(_wRarE, _aRarE);
        const _vdmg = _isCritV ? Math.round(dmg * calcCritMult(_wRarE, _aRarE)) : dmg;
        if(typeof window._vHitVehicle === 'function'){
          const _eNameV = (typeof ENEMIES !== 'undefined' && ENEMIES[e.eid]) ? ENEMIES[e.eid].name : e.eid;
          const _wNameV = (w && w.id && typeof WEAPONS !== 'undefined' && WEAPONS[w.id]) ? WEAPONS[w.id].name : (w && w.id ? w.id : '武器');
          const _wRarV = (w && w.rarity) || '一般';
          window._vHitVehicle(p, _vdmg, penMM, w.ammoId || 'unknown', _eNameV, _wNameV, _wRarV, e.rarity || '一般');
        }
        return;
      }

      if(p.isPlayer){
        const r = _resolveSingleAttack({
          ammoId: w.ammoId || null,
          ammoRarity: _aRarE,
          weaponRarity: _wRarE,
          penMM: penMM,
          fallbackDmg: e.dmg || 10
        }, p);
        p.hp = Math.max(0, p.hp - r.hpLost);
        p.armor = Math.max(0, (p.armor || 0) - r.armorLost);
        state.player.hp = p.hp;
        state.player.armor = p.armor;
        _playHurt(performance.now());
        _float(p, '-' + (r.hpLost + r.armorLost), r.crit ? 'crit' : '');
        /* rev-fix-player-killer-rifle: 枪械击杀玩家 → 记录 _playerKiller */
        if(p.hp <= 0 && !c._playerKiller){
          var _eNameK = (typeof ENEMIES !== 'undefined' && ENEMIES[e.eid]) ? ENEMIES[e.eid].name : e.eid;
          var _wNameK = (w && w.id && typeof WEAPONS !== 'undefined' && WEAPONS[w.id]) ? WEAPONS[w.id].name : (w && w.id ? w.id : '武器');
          c._playerKiller = { name: _eNameK, weapon: _wNameK, wRarity: (w && w.rarity) || e.rarity || '一般', aRarity: e.rarity || '一般' };
        }
        if(p.hp <= 0){
          state.player.hp = 0;
          state.player.deadUntil = Date.now() + 60000;
          if(window._explore){
            window._explore.mode = 'dead';
            window._explore.deadUntil = performance.now() + 60000;
            window._explore.combatEvent = null;
          }
          if(typeof window._playHeroDeath === 'function') window._playHeroDeath();
          if(typeof _evac === 'function' && !(window._explore && window._explore.evacuatingPassengers)){
            try { _evac(); } catch(err){}
          }
        }
        return;
      }

      if(p.isPassenger && p.srv){
        const r = _resolveSingleAttack({
          ammoId: w.ammoId || null,
          ammoRarity: _aRarE,
          weaponRarity: _wRarE,
          penMM: penMM,
          fallbackDmg: e.dmg || 10
        }, p);
        p.hp = Math.max(0, p.hp - r.hpLost);
        p.armor = Math.max(0, (p.armor || 0) - r.armorLost);
        if(p.hp <= 0){
          p.hp = 0;
          p.srv.hp = 0;
          p.srv.injuredUntil = Date.now() + 4 * 3600 * 1000;
          p.srv._injuredDown = true;
          p._injuredDown = true;
          if(typeof pushLog === 'function'){
            /* rev-fix-passenger-killer-rifle: 载员被枪械打死 → 显示敌人名+武器名 */
            const _eNameCK = (typeof ENEMIES !== 'undefined' && ENEMIES[e.eid]) ? ENEMIES[e.eid].name : e.eid;
            const _eClsCK = (typeof rarityClass === 'function') ? rarityClass(e.rarity || '一般') : '';
            const _wNameCK = (w && w.id && typeof WEAPONS !== 'undefined' && WEAPONS[w.id]) ? WEAPONS[w.id].name : (w && w.id ? w.id : '武器');
            const _wClsCK = (typeof rarityClass === 'function') ? rarityClass((w && w.rarity) || e.rarity || '一般') : '';
            const _sClsK = (typeof rarityClass === 'function') ? rarityClass(p.srv.rarity || '一般') : '';
            const _sNameK = (typeof servantLabel === 'function') ? servantLabel(p.srv) : '載員';
            pushLog('<span class="' + _sClsK + '">' + _sNameK + '</span> 被 <span class="' + _eClsCK + '">' + _eNameCK + '</span> 用 <span class="' + _wClsCK + '">' + _wNameCK + '</span> <span class="lose">擊倒</span>', [], 'explore');
          }
        }
        _float(p, '-' + r.hpLost, '');
      }
    }
  });
}


/* rev-fix-splash-shared: 通用濺射傷害處理（探索 + 後院共用） */
function _applySplashDamage(mainTarget, mainTargetWorldX, nearbyList, baseDmg, opts){
  if(!nearbyList || !nearbyList.length) return;
  opts = opts || {};
  const maxR = (typeof opts.maxR === 'number') ? opts.maxR : 8;
  const blastPen = (typeof opts.blastPen === 'number') ? opts.blastPen : 18;
  const splashRatio = (typeof opts.splashRatio === 'number') ? opts.splashRatio : 0.35;
  for(let i = 0; i < nearbyList.length; i++){
    const item = nearbyList[i];
    const tgt = item.target;
    if(!tgt) continue;
    if(tgt === mainTarget) continue;
    const dist = Math.abs(item.worldX - mainTargetWorldX);
    if(dist >= maxR) continue;
    const tt = dist / maxR;
    const falloff = 1 - tt * tt;
    if(falloff <= 0) continue;
    const splashDmg = Math.max(1, Math.round(baseDmg * splashRatio * falloff));
    const splashPen = blastPen * falloff;
    const armorProvider = opts.armorProviderFn ? opts.armorProviderFn(tgt) : null;
    const proxy = { hp: tgt.hp || 0, armor: tgt.armor || 0 };
    const res = applyDamage(proxy, splashDmg, splashPen, armorProvider ? { armorProvider: armorProvider } : {});
    tgt.hp = proxy.hp;
    tgt.armor = proxy.armor;
    if(opts.onHit) opts.onHit(tgt, res.hpLost, res.armorLost);
  }
}

function _enemyFireRPG(e, p, now){
  const c = window._combat;
  if(!c) return;

  /* rev-fix-anim-duration-unified: 从 GAME_ANIMS 计算时长 */
  const _fpAnimDefR = (typeof GAME_ANIMS !== 'undefined' && GAME_ANIMS.fire_primary) ? GAME_ANIMS.fire_primary : null;
  const _fpDurR = _fpAnimDefR ? Math.round(_fpAnimDefR.frameCount / _fpAnimDefR.fps * 1000) : 400;
  e._fireAnimName = 'fire_primary';
  e._fireAnimStart = now;
  e._fireAnimUntil = now + _fpDurR;
  const mz = _getEnemyMuzzlePos(e, p, true);
  /* rev-fix-enemy-aim-target: 子彈視覺飛向實際目標 p，不是玩家位置。
   * 之前用 c.allies[0]（玩家）位置，打載員時子彈飛向玩家；
   * 改用 p.worldX 與玩家 worldX 的相對距離反推目標螢幕位置。 */
  /* rev-fix-target-screen-pos-rpg: 載員目標 → 用載員實際 screenX */
  let _tgtScreenXR = null;
  if(p && p.isPassenger && p.srv){
    const _pfArrR = (window._explore && window._explore.passengersFollowing) || [];
    for(let _piR = 0; _piR < _pfArrR.length; _piR++){
      if(_pfArrR[_piR].srv && _pfArrR[_piR].srv.id === p.srv.id){ _tgtScreenXR = _pfArrR[_piR].screenX; break; }
    }
  }
  const px = (() => {
    const _p = c.allies[0];
    if(p && p.isVehicle && typeof battle !== 'undefined' && battle && typeof battle.px === 'number'){
      return battle.px;
    }
    if(_tgtScreenXR != null) return _tgtScreenXR;
    const _pWX = _p ? _p.worldX : 0;
    const _tWX = (p && typeof p.worldX === 'number') ? p.worldX : _pWX;
    const _relWX = _tWX - _pWX;
    return EXPLORE_HERO_X_RATIO + (_relWX / c.sm.screenRightWorld) * (1 - EXPLORE_HERO_X_RATIO);
  })();
  const hit = Math.random() < 0.6;
  const tx = hit ? px : (px - 0.5);

  const rar = e.rpgRarity || e.rarity;
  const dmg = e.rpgDmg || (100 * (RARITY_MULT[rar] || 1));
  const penMM = e.rpgPenMM || 600;

  const _approachPx = Math.max(0, (window._explore && window._explore._currentSpeed) || 0) * c.sm.bgPixelsPerMeter;
  const duration = Math.max(16, (Math.abs(p.worldX - e.worldX) / 280) * 1000);
  const _tx = hit ? tx : ((tx < mz.x) ? -0.5 : 1.5);

  /* rev-fix-vehicle-hit-pos: 载具目标 → 载具视觉中心 */
  let _tyR;
  if(p && p.isVehicle){
    _tyR = (typeof _getVehicleHitScreenY === 'function')
      ? (_getVehicleHitScreenY() + (Math.random() - 0.5) * 0.06)
      : 0.45;
  } else if(p && p.isPassenger){
    _tyR = 0.55 + (Math.random() - 0.5) * 0.08;
  } else {
    _tyR = mz.y;
  }
  c.bullets.push({
    sx: mz.x, sy: mz.y, tx: _tx, ty: _tyR, t: 0,
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
          window._vHitVehicle(p, baseDmg, penMM, 'atgm', _eNameR, 'RPG', rar, e.rarity || '一般');
        }
        /* rev-fix-rpg-splash-vehicle: 不 return 繼續走濺射 */
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
        /* rev-fix-player-killer-rpg */
        if(p.hp <= 0 && !c._playerKiller){
          var _eNameK2 = (typeof ENEMIES !== 'undefined' && ENEMIES[e.eid]) ? ENEMIES[e.eid].name : e.eid;
          c._playerKiller = { name: _eNameK2, weapon: 'RPG', wRarity: rar || '一般', aRarity: e.rarity || '一般' };
        }
        _float(p, '-' + (res.hpLost + res.armorLost), crit ? 'crit' : '');
        /* [v183 H17] 玩家被 RPG 打死立即设 dead 状态（双保险）。 */
        if(p.hp <= 0){
          state.player.hp = 0;
          state.player.deadUntil = Date.now() + 60000;
          if(window._explore){
            window._explore.mode = 'dead';
            window._explore.deadUntil = performance.now() + 60000;
            window._explore.combatEvent = null;
          }
          if(typeof window._playHeroDeath === 'function') window._playHeroDeath(); /* rev-fix-rpg-death */
        }
        /* rev-fix-evac-rpg: 玩家被 RPG 打到倒地也撤載員 */
        if(p.hp <= 0 && typeof _evac === 'function' && !(window._explore && window._explore.evacuatingPassengers)){
          try { _evac(); } catch(e){}
        }
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
            const _eClsR2 = (typeof rarityClass === 'function') ? rarityClass(e.rarity || '一般') : '';
            const _sRarR2 = (p.srv && p.srv.rarity) ? p.srv.rarity : '一般';
            const _sClsR2 = (typeof rarityClass === 'function') ? rarityClass(_sRarR2) : '';
            const _sNameR2 = (typeof servantLabel === 'function' ? servantLabel(p.srv) : '載員');
            pushLog('<span class="' + _sClsR2 + '">' + _sNameR2 + '</span> 被 <span class="' + _eClsR2 + '">' + _eNameR2 + '</span> 用 <span class="' + _wClsR2 + '">RPG</span> <span class="lose">擊倒</span>', [], 'explore');
          }
        }
        _float(p, '-' + res.hpLost, crit ? 'crit' : '');
      }

      /* rev-fix-splash-shared: 調用共用濺射函數 */
      const _nearbyList = [];
      for(let i = 0; i < c.allies.length; i++){
        const a = c.allies[i];
        if(a === p) continue;
        if(a.hp <= 0) continue;
        if(a.isVehicle) continue;
        if(a._retreating) continue;   /* 需求：撤退中的載員不受任何敵人攻擊 */
        _nearbyList.push({ target: a, worldX: a.worldX });
      }
      _applySplashDamage(p, p.worldX, _nearbyList, baseDmg, {
        maxR: 8, blastPen: 18, splashRatio: 0.35,
        armorProviderFn: function(tgt){
          if(tgt.isPlayer){
            return function(part){ return (typeof getPlayerArmorMMForPart === 'function') ? getPlayerArmorMMForPart(part) : 0; };
          }
          if(tgt.isPassenger && tgt.srv){
            return (function(_a){ return function(part){ return (typeof getPassengerArmorMMForPart === 'function') ? getPassengerArmorMMForPart(_a, part) : 0; }; })(tgt);
          }
          return null;
        },
        onHit: function(tgt, hpLost, armorLost){
          const _shownSplash = hpLost > 0 ? hpLost : armorLost;
          if(tgt.isPlayer){
            state.player.hp = tgt.hp;
            state.player.armor = tgt.armor;
            _playHurt(performance.now());
            if(tgt.hp <= 0 && !c._playerKiller){
              var _eNameKS = (typeof ENEMIES !== 'undefined' && ENEMIES[e.eid]) ? ENEMIES[e.eid].name : e.eid;
              c._playerKiller = { name: _eNameKS, weapon: 'RPG', wRarity: rar || '一般', aRarity: e.rarity || '一般' };
            }
            if(tgt.hp <= 0){
              state.player.hp = 0;
              state.player.deadUntil = Date.now() + 60000;
              if(window._explore){ window._explore.mode = 'dead'; window._explore.deadUntil = performance.now() + 60000; window._explore.combatEvent = null; }
              if(typeof window._playHeroDeath === 'function') window._playHeroDeath();
            }
            if(tgt.hp <= 0 && typeof _evac === 'function' && !(window._explore && window._explore.evacuatingPassengers)){
              try { _evac(); } catch(e){}
            }
          }
          if(tgt.isPassenger && tgt.hp <= 0 && tgt.srv){
            tgt.srv.hp = 0;
            tgt.srv.injuredUntil = Date.now() + 4 * 3600 * 1000;
            tgt._retreating = true;
            tgt._injuredDown = true;
            if(typeof pushLog === 'function'){
              const _eNameSP = (typeof ENEMIES !== 'undefined' && ENEMIES[e.eid]) ? ENEMIES[e.eid].name : e.eid;
              const _eClsSP = (typeof rarityClass === 'function') ? rarityClass(e.rarity || '一般') : '';
              const _sRarSP = (tgt.srv && tgt.srv.rarity) ? tgt.srv.rarity : '一般';
              const _sClsSP = (typeof rarityClass === 'function') ? rarityClass(_sRarSP) : '';
              const _sNameSP = (typeof servantLabel === 'function' ? servantLabel(tgt.srv) : '載員');
              const _wClsSP = (typeof rarityClass === 'function') ? rarityClass(rar || '一般') : '';
              pushLog('<span class="' + _sClsSP + '">' + _sNameSP + '</span> 被 <span class="' + _eClsSP + '">' + _eNameSP + '</span> 用 <span class="' + _wClsSP + '">RPG</span> <span class="lose">擊倒</span>', [], 'explore');
            }
          }
          _float(tgt, '-' + _shownSplash, hpLost > 0 ? '' : 'armor');
        }
      });
    }
  });
}



/* rev-fix-grenade-unified: 通用破片傷害處理。每破片獨立 roll 命中、roll 部位、穿甲、暴擊 */
function _applyGrenadeToTargets(targets, gDef, gRar, hitRate, penMM, armorProviderFn, centerWorldX, casualtyRadius){
  const fragments = gDef.fragments || 1;
  const fragmentDamage = gDef.fragmentDamage || gDef.dmg || 0;
  const gDmg = fragmentDamage * (RARITY_MULT[gRar] || 1);
  const _hasCenter = (typeof centerWorldX === 'number' && isFinite(centerWorldX));
  /* rev-fix-grenade-casualty-apply: 破片伤害半径截断，超出完全免疫 */
  if(!_hasCenter) return [];
  const _radius = (typeof casualtyRadius === 'number' && casualtyRadius > 0) ? casualtyRadius : 10;
  const _critRate = (typeof calcCritRate === 'function') ? calcCritRate(gRar, gRar) : 0.1;
  const _critMult = (typeof calcCritMult === 'function') ? calcCritMult(gRar, gRar) : 1.5;
  const _cands = [];
  for(let i = 0; i < targets.length; i++){
    const t = targets[i];
    if(!t || t.hp <= 0) continue;
    if(typeof t.worldX !== 'number') continue;
    const d = Math.abs(t.worldX - centerWorldX);
    if(d > _radius) continue;
    _cands.push({ target: t, dist: d });
  }
  _cands.sort(function(a, b){ return a.dist - b.dist; });
  const results = [];
  for(let i = 0; i < _cands.length; i++){
    const c = _cands[i];
    const a = c.target;
    const _fragsThisTarget = window._calcFragmentCount(GRENADE_TARGET_WIDTH_M, c.dist, fragments);
    const proxy = { hp: a.hp, armor: a.armor || 0 };
    let hits = 0, totalHpLost = 0, totalArmorLost = 0;
    const armorProvider = armorProviderFn ? armorProviderFn(a) : function(){ return 0; };
    for(let f = 0; f < _fragsThisTarget; f++){
      if(Math.random() >= hitRate) continue;
      hits++;
      const _isCrit = Math.random() < _critRate;
      let fragDmg = gDmg;
      if(_isCrit) fragDmg = Math.round(fragDmg * _critMult);
      const res = applyDamage(proxy, fragDmg, penMM, { armorProvider: armorProvider });
      totalHpLost += res.hpLost; totalArmorLost += res.armorLost;
    }
    a.hp = proxy.hp; a.armor = proxy.armor;
    results.push({ target: a, hits: hits, hpLost: totalHpLost, armorLost: totalArmorLost });
  }
  return results;
}

/* rev-fix-throw-physics-v4: 速度隨距離變化 + 含 H₀ 高抛解 */
const GRENADE_G = 9.8;
/* rev-fix-grenade-casualty-radius: casualtyRadius = 破片傷害半徑（m）。
 * 超出此半徑完全免疫；半徑內按切線比分配片數。
 * maxRange = 投擲距離（能扔多遠），與傷害半徑無關。
 * 數據源：TRADOC ODIN / Rosoboronexport / 軍工標準文獻「最大有效破片殺傷半徑」。 */
const GRENADE_PHYSICS = {
  f1:      { maxRange: 28, speed: Math.sqrt(GRENADE_G * 28), casualtyRadius: 30 },
  rgd5:    { maxRange: 30, speed: Math.sqrt(GRENADE_G * 30), casualtyRadius: 25 },
  rgo:     { maxRange: 30, speed: Math.sqrt(GRENADE_G * 30), casualtyRadius: 20 },
  rgn:     { maxRange: 32, speed: Math.sqrt(GRENADE_G * 32), casualtyRadius: 10 },
  vog17:   { maxRange: 33, speed: Math.sqrt(GRENADE_G * 33), casualtyRadius: 7 },
  vog25:   { maxRange: 35, speed: Math.sqrt(GRENADE_G * 35), casualtyRadius: 6 },
  _default:{ maxRange: 30, speed: Math.sqrt(GRENADE_G * 30), casualtyRadius: 10 }
};
function _getGrenadePhysics(gid){
  return GRENADE_PHYSICS[gid] || GRENADE_PHYSICS._default;
}
function _solveThrowAngle(d, v, H0){
  if(!(d > 0) || !(v > 0)) return null;
  const g = GRENADE_G;
  const a = g * d * d / (2 * v * v);
  const b = -d;
  const c = a - H0;
  const disc = b * b - 4 * a * c;
  if(disc < 0) return null;
  const u2 = (-b + Math.sqrt(disc)) / (2 * a);
  if(!(u2 > 0)) return null;
  return Math.atan(u2);
}
function _calcGrenadeParams(distM, gid, H0){
  const phys = _getGrenadePhysics(gid);
  const v_max = phys.speed;
  const v_min = v_max * 0.5;
  const maxRange = phys.maxRange;
  const d = Math.min(Math.max(0.01, distM), maxRange);
  const ratio = d / maxRange;
  const v2 = v_min * v_min + (v_max * v_max - v_min * v_min) * ratio;
  const v = Math.sqrt(v2);
  const h0 = (typeof H0 === 'number' && H0 > 0) ? H0 : 1.3;
  let theta = _solveThrowAngle(d, v, h0);
  if(theta == null) theta = Math.PI / 4;
  const vx = v * Math.cos(theta);
  const vy = v * Math.sin(theta);
  const T = d / vx;
  return { vx, vy, theta, T, distM: d, speed: v, maxRange };
}
/* 手部 = front_arm 右上頂點（u=1,v=0），含 L.rot + key.rot；具體計算委託 window.getCharLayerCornerN */
function _getPlayerHandPos(animName, frameIdx){
  if(typeof heroAnim === 'undefined') return { x: EXPLORE_HERO_X_RATIO + 0.04, y: 0.5 };
  const canvas = document.getElementById('hero-canvas');
  const W = canvas && canvas.clientWidth ? canvas.clientWidth : 400;
  const H = canvas && canvas.clientHeight ? canvas.clientHeight : 500;
  if(!W || !H) return { x: EXPLORE_HERO_X_RATIO + 0.04, y: 0.5 };
  const scale = (H * CHAR_HEIGHT_FACTOR) / 386;
  return window.getCharLayerCornerN('front_arm', 1, 0, {
    animName: animName || heroAnim.name,
    frameIdx: (typeof frameIdx === 'number') ? frameIdx : heroAnim.frame,
    canvasW: W, canvasH: H,
    scale: scale,
    centerX_px: W * EXPLORE_HERO_X_RATIO,
    groundY_px: H * 0.95
  });
}
function _handYToH0(handPosY){
  const normAboveGround = Math.max(0.05, 0.95 - handPosY);
  return normAboveGround * (PLAYER_HEIGHT_M / CHAR_HEIGHT_FACTOR);
}

/* rev-fix-grenade-on-enemies: 玩家/載員投雷打敵人的公共結算（原本兩個 _onHit 完全重複）
 * ownerInfo: {cls, name} —— 擊殺時日誌用；null 表示玩家
 * onKill: 可選回調，載員投雷用於 servantAddExp */
function _resolveGrenadeOnEnemies(c, gDef, gRar, hitRate, wRarity, ownerInfo, onKill, centerWorldX, casualtyRadius){
  if(!c) return;
  const targets = c.enemies.filter(function(en){ return en.hp > 0; });
  const results = _applyGrenadeToTargets(targets, gDef, gRar, hitRate, gDef.penMM || 0, function(en){
    return function(part){
      return (typeof getEnemyArmorMMForPart === 'function') ? getEnemyArmorMMForPart(en, part) : 0;
    };
  }, centerWorldX, casualtyRadius);
  for(const r of results){
    if(r.hits === 0) continue;
    const shown = r.hpLost > 0 ? r.hpLost : r.armorLost;
    _float(r.target, '-' + shown, r.hpLost > 0 ? '' : 'armor');
    if(r.target.hp <= 0){
      const _en = (typeof ENEMIES !== 'undefined' && ENEMIES[r.target.eid]) ? ENEMIES[r.target.eid].name : r.target.eid;
      const _wCls = (typeof rarityClass === 'function') ? rarityClass(wRarity || '一般') : '';
      if(typeof pushLog === 'function'){
        const _oc = ownerInfo ? ownerInfo.cls : 'pl';
        const _on = ownerInfo ? ownerInfo.name : '玩家';
        pushLog('<span class="' + _oc + '">' + _on + '</span> 用 <span class="' + _wCls + '">' + (gDef.name || '手榴彈') + '</span> 擊殺 <b class="r-' + (r.target.rarity || '一般') + '">' + _en + '</b>', [], 'explore');
      }
      if(typeof onKill === 'function') onKill(r.target);
    }
  }
}

/* rev-fix-player-grenade: 玩家步戰投雷 */
/* rev-fix-player-grenade: 玩家步戰投雷 */
function _playerThrowGrenade(p, t, now, w){
  const c = window._combat;
  if(!c || !w || !w.def) return;
  const gDef = w.def;
  const gRar = w.rarity || '一般';
  const sm = c.sm;

  if(typeof _playMeleeFire === 'function') _playMeleeFire(now);

  /* rev-fix-throw-delay-release: attack_melee frame 5 是手臂甩到最前的釋放幀，
   * 手雷在釋放前跟隨手部，到釋放幀才離手——視覺上能觀察到完整投擲過程 */
  const _amAnim = (typeof GAME_ANIMS !== 'undefined' && GAME_ANIMS.attack_melee) ? GAME_ANIMS.attack_melee : null;
  const RELEASE_FRAME = 5;
  const releaseDelay = _amAnim ? Math.round(RELEASE_FRAME / _amAnim.fps * 1000) : 357;
  const releaseAt = now + releaseDelay;

  /* 起點用釋放幀的手部位置，不是 frame 0 的蓄力位置 */
  const handPos = _getPlayerHandPos('attack_melee', RELEASE_FRAME);
  const H0 = _handYToH0(handPos.y);

  const offsetM = ((handPos.x - EXPLORE_HERO_X_RATIO) / (1 - EXPLORE_HERO_X_RATIO)) * sm.screenRightWorld;
  const worldStartX = p.worldX + offsetM;
  const throwDist = Math.max(0.01, Math.abs(t.worldX - worldStartX));
  const dirSign = (t.worldX >= worldStartX) ? 1 : -1;

  const params = _calcGrenadeParams(throwDist, w.id, H0);
  if(!params) return;

  const hitRate = getHitRate(gDef.type, '投擲', gDef.scopeBonus || 0) / 100;
  c.bullets.push({
    isGrenade: true, grenadeId: w.id, rarity: gRar, enemy: false, big: true,
    _target: t,
    worldStartX: worldStartX, H0: H0, dir: dirSign,
    vx: params.vx, vy: params.vy, T: params.T,
    start: releaseAt, releaseAt: releaseAt, duration: params.T * 1000,
    sx: handPos.x, sy: handPos.y, tx: 0, ty: 0.95, hit: true,
    _onHit: function(){
      var _landX = worldStartX + dirSign * params.vx * params.T;
      var _cr = _getGrenadePhysics(w.id).casualtyRadius;
      _resolveGrenadeOnEnemies(c, gDef, gRar, hitRate, w.rarity, null, null, _landX, _cr);
    }
  });
}

/* rev-fix-passenger-grenade: 乘客步戰投雷 */
/* rev-fix-passenger-grenade: 乘客步戰投雷 */
function _passengerThrowGrenade(a, t, gDef, gRar, now, gid){
  const c = window._combat;
  if(!c) return;
  const sm = c.sm;
  const _pfArr = (window._explore && window._explore.passengersFollowing) || [];
  let _pfItem = null;
  for(let i = 0; i < _pfArr.length; i++){
    if(_pfArr[i].srv && a.srv && _pfArr[i].srv.id === a.srv.id){ _pfItem = _pfArr[i]; break; }
  }
  const _sxN = _pfItem ? _pfItem.screenX : EXPLORE_HERO_X_RATIO + 0.1;
  const handPos = { x: _sxN + 0.03, y: 0.55 };
  const H0 = _handYToH0(handPos.y);

  /* 修 D: 載員有自己的 worldX，起點基於它 */
  const offsetM = 0.15;
  const worldStartX = a.worldX + offsetM;
  const throwDist = Math.max(0.01, Math.abs(t.worldX - worldStartX));
  const dirSign = (t.worldX >= worldStartX) ? 1 : -1;

  const params = _calcGrenadeParams(throwDist, gid, H0);
  if(!params) return;

  const hitRate = ((typeof servantHitRate === 'function') ? servantHitRate(a.srv, '投擲', 0) : 30) / 100;
  c.bullets.push({
    isGrenade: true, grenadeId: gid, rarity: gRar, enemy: false, big: true,
    _target: t,
    worldStartX: worldStartX, H0: H0, dir: dirSign,
    vx: params.vx, vy: params.vy, T: params.T,
    start: performance.now(), duration: params.T * 1000,
    sx: handPos.x, sy: handPos.y, tx: 0, ty: 0.95, hit: true,
        _onHit: function(){
      const _aRar = (a.srv && a.srv.rarity) ? a.srv.rarity : '一般';
      const _cr = _getGrenadePhysics(gid).casualtyRadius;
      _resolveGrenadeOnEnemies(c, gDef, gRar, hitRate, gRar,
        { cls: (typeof rarityClass === 'function') ? rarityClass(_aRar) : 'r-一般',
          name: (typeof servantLabel === 'function' ? servantLabel(a.srv) : '載員') },
        function(tgt){ if(typeof servantAddExp === 'function') servantAddExp(a.srv, 3); },
        worldStartX + dirSign * params.vx * params.T, _cr);
    }
  });
  const _ptAnimDef = (typeof GAME_ANIMS !== 'undefined' && GAME_ANIMS.fire_primary) ? GAME_ANIMS.fire_primary : null;
  const _ptDur = _ptAnimDef ? Math.round(_ptAnimDef.frameCount / _ptAnimDef.fps * 1000) : 400;
  a._fireAnimStart = performance.now();
  a._fireAnimUntil = performance.now() + _ptDur;
  if(a.srv){ a.srv._standStart = Date.now(); a.srv._standUntil = Date.now() + _ptDur; }
}

function _enemyThrowGrenade(e, p, now){
  const c = window._combat;
  if(!c) return;
  const gid = e.grenade && e.grenade.id;
  const gDef = WEAPONS[gid];
  if(!gDef) return;
  const _fpAnimDefG = (typeof GAME_ANIMS !== 'undefined' && GAME_ANIMS.fire_primary) ? GAME_ANIMS.fire_primary : null;
  const _fpDurG = _fpAnimDefG ? Math.round(_fpAnimDefG.frameCount / _fpAnimDefG.fps * 1000) : 400;
  e._fireAnimName = 'fire_primary';
  e._fireAnimStart = now;
  e._fireAnimUntil = now + _fpDurG;

  const mz = _getEnemyMuzzlePos(e, p);
  const H0 = 1.3;
  const worldStartX = e.worldX - 0.15;
  const throwDist = Math.max(0.01, Math.abs(p.worldX - worldStartX));
  const dirSign = (p.worldX >= worldStartX) ? 1 : -1;
  const params = _calcGrenadeParams(throwDist, gid, H0);
  if(!params) return;

  const gRar = e.grenade.rarity || '一般';
  const hitRate = e.hitBase || 0.55;

  c.bullets.push({
    isGrenade: true, grenadeId: gid, enemy: true, big: true,
    _target: p,
    worldStartX: worldStartX, H0: H0, dir: dirSign,
    vx: params.vx, vy: params.vy, T: params.T,
    start: performance.now(), duration: params.T * 1000,
    sx: mz.x, sy: mz.y, tx: 0, ty: 0.95, hit: true,
    _onHit: function(){
      const targets = c.allies.filter(function(a){ return a.hp > 0 && !a._retreating; });
      const _cr = _getGrenadePhysics(gid).casualtyRadius;
      const results = _applyGrenadeToTargets(targets, gDef, gRar, hitRate, gDef.penMM || 0, function(a){
        return function(part){
          if(a.isPlayer && typeof getPlayerArmorMMForPart === 'function') return getPlayerArmorMMForPart(part);
          if(a.isPassenger && typeof getPassengerArmorMMForPart === 'function') return getPassengerArmorMMForPart(a, part);
          return 0;
        };
      }, worldStartX + dirSign * params.vx * params.T, _cr);
      for(const r of results){
        if(r.hits === 0){ _float(r.target, 'MISS', 'miss'); continue; }
        const shown = r.hpLost > 0 ? r.hpLost : r.armorLost;
        if(r.target.isPlayer){
          state.player.hp = r.target.hp;
          state.player.armor = r.target.armor;
          _playHurt(performance.now());
          if(r.target.hp <= 0 && !c._playerKiller){
            var _eNameK3 = (typeof ENEMIES !== 'undefined' && ENEMIES[e.eid]) ? ENEMIES[e.eid].name : e.eid;
            c._playerKiller = { name: _eNameK3, weapon: (gDef && gDef.name) || '手榴彈', wRarity: gRar || '一般', aRarity: e.rarity || '一般' };
          }
        }
        if(r.target.isPassenger && r.target.hp <= 0 && r.target.srv){
          r.target.srv.hp = 0;
          r.target.srv.injuredUntil = Date.now() + 4 * 3600 * 1000;
          r.target._injuredDown = true;
          r.target._retreating = true;
          if(typeof pushLog === 'function'){
            /* rev-fix-passenger-killer-grenade: 载员被手雷炸死 → 完整来源日志 */
            const _eNameGK = (typeof ENEMIES !== 'undefined' && ENEMIES[e.eid]) ? ENEMIES[e.eid].name : e.eid;
            const _eClsGK = (typeof rarityClass === 'function') ? rarityClass(e.rarity || '一般') : '';
            const _wClsGK = (typeof rarityClass === 'function') ? rarityClass(gRar || '一般') : '';
            const _sClsGK = (typeof rarityClass === 'function') ? rarityClass(r.target.srv.rarity || '一般') : '';
            const _sNameGK = (typeof servantLabel === 'function') ? servantLabel(r.target.srv) : '載員';
            pushLog('<span class="' + _sClsGK + '">' + _sNameGK + '</span> 被 <span class="' + _eClsGK + '">' + _eNameGK + '</span> 用 <span class="' + _wClsGK + '">' + (gDef.name || '手榴彈') + '</span> <span class="lose">擊倒</span>', [], 'explore');
          }
        }
        _float(r.target, '-' + shown, r.hpLost > 0 ? '' : 'armor');
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
      /* [v198b] 高速導彈尾煙插值：按距離生成，不按幀生成，確保不會斷檔 */
      const _dtT = b.duration > 0 ? (dt * 1000) / b.duration : 0;
      const _startT = Math.max(0, b.t - _dtT);
      const _endT = Math.min(1, b.t);
      const _span = _endT - _startT;
      if(_span > 0){
        // 根據飛過的距離插值生成粒子，保證密度
        const _steps = Math.max(1, Math.ceil(_span * 300));
        for(let _k = 0; _k < _steps; _k++){
          const _kt = _startT + _span * (_k / _steps);
          const _bx = b.sx + (b.tx - b.sx) * _kt;
          const _by = b.sy + (b.ty - b.sy) * _kt;
          c.missileSmoke.push({ x: _bx, y: _by, age: 0, size: 0.015 + Math.random() * 0.010 });
        }
      }
    }
    
    if(b.t >= 1){
      if(!b.resolved){
        b.resolved = true;
        /* rev-fix-rpg-fx: RPG（missile）用独立特效，手雷保持原烟 */
        if(b.isGrenade || b.missile){
          var _fxElG = document.getElementById('battle-fx') || document.getElementById('combat-overlay');
          var _WG = _fxElG ? _fxElG.clientWidth : 400;
          var _HG = _fxElG ? _fxElG.clientHeight : 500;
          var _explX, _explY;
          if(b.isGrenade && typeof b.worldStartX === 'number' && typeof b.vx === 'number' && b.T > 0){
            /* 手雷：按 T 时刻世界位置反推落点 */
            const _dir = (b.dir === -1) ? -1 : 1;
            const _finalWX = b.worldStartX + _dir * b.vx * b.T;
            const _px0 = c.allies[0] ? c.allies[0].worldX : 0;
            const _relWX = _finalWX - _px0;
            const _sm = c.sm || (typeof computeScreenMetrics === 'function' ? computeScreenMetrics(_WG, _HG) : { screenRightWorld: 2 });
            _explX = (EXPLORE_HERO_X_RATIO + (_relWX / _sm.screenRightWorld) * (1 - EXPLORE_HERO_X_RATIO)) * _WG;
            _explY = _HG * 0.95;
          } else {
            /* RPG：直接命中点 */
            _explX = b.tx * _WG;
            _explY = b.ty * _HG;
          }
          /* 屏幕外（未命中飞出）不生成特效 */
          if(_explX >= -_WG * 0.2 && _explX <= _WG * 1.2){
            if(b.missile){
              /* RPG：视觉半径约屏宽 18% */
              var _radRPG = _WG * 0.18;
              if(typeof window._spawnRPGImpactFx === 'function') window._spawnRPGImpactFx(c, _explX, _explY, _radRPG);
            } else {
              /* 手雷：保持原样（bgPixelsPerMeter × 4.5m） */
              var _radG = (c.sm && c.sm.bgPixelsPerMeter) ? (4.5 * c.sm.bgPixelsPerMeter) : _WG * 0.08;
              if(typeof _spawnExplosionSmoke === 'function') _spawnExplosionSmoke(c, _explX, _explY, _radG);
            }
          }
        }
      }
      if(b._onHit){
        window._lastBullet = b;
        try { b._onHit(); } catch(err){ console.error(err); }
        window._lastBullet = null;
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
  if(window.MuzzleFX) window.MuzzleFX.update(dt);
  if(c.tracers){
    const nowMs = performance.now();
    for(let i = c.tracers.length - 1; i >= 0; i--){
      if(nowMs - c.tracers[i].born > c.tracers[i].dur) c.tracers.splice(i, 1);
    }
  }
  _tickBattleFX(c, dt);
}
function _float(t, text, cls){
  var c = window._combat;
  if(!c) return;
  var sm = c.sm;
  var fxEl = document.getElementById('battle-fx') || document.getElementById('combat-overlay');
  var W = fxEl ? fxEl.clientWidth : 400;
  var H = fxEl ? fxEl.clientHeight : 500;
  /* rev-fix-float-v3: 飘字和火花是两套系统。
   * 飘字：clamp 到 [0.05, 0.95] 保证可见；y=0.12（屏幕顶部）
   * 火花：不 clamp，屏幕外自然裁切 */
  var sxRaw;
  if(t && t.isPlayer){ sxRaw = EXPLORE_HERO_X_RATIO; }
  else if(t && t.isPassenger && t.srv){
    var _pfArr = (window._explore && window._explore.passengersFollowing) || [];
    var _foundP = false;
    for(var i = 0; i < _pfArr.length; i++){
      if(_pfArr[i].srv && _pfArr[i].srv.id === t.srv.id){ sxRaw = _pfArr[i].screenX; _foundP = true; break; }
    }
    if(!_foundP){
      var p0 = c.allies[0], px0 = p0 ? p0.worldX : 0;
      var rel0 = (typeof t.worldX === 'number') ? (t.worldX - px0) : 0;
      sxRaw = EXPLORE_HERO_X_RATIO + (rel0 / sm.screenRightWorld) * (1 - EXPLORE_HERO_X_RATIO);
    }
  } else if(t && typeof t.worldX === 'number'){
    var p1 = c.allies[0], px1 = p1 ? p1.worldX : 0;
    var rel1 = t.worldX - px1;
    sxRaw = EXPLORE_HERO_X_RATIO + (rel1 / sm.screenRightWorld) * (1 - EXPLORE_HERO_X_RATIO);
  } else { sxRaw = EXPLORE_HERO_X_RATIO; }

  /* 火花：不 clamp；miss/heal 跳过；不再要求 text 以 - 开头（磨穿/跳弹也要火花） */
  var _b = window._lastBullet;
  var sparkYN = 0.6;
  if(_b && typeof _b.ty === 'number' && !_b.isGrenade){ sparkYN = _b.ty; }
  if(cls !== 'miss' && cls !== 'heal' && typeof _spawnHitSpark === 'function'){
    _spawnHitSpark(c, sxRaw * W, sparkYN * H, cls === 'crit', cls, !!(t && t.isPassenger));
  }

  /* 飘字：clamp x 保证可见；y=0.12 屏幕顶部 */
  var _floatX = Math.max(0.05, Math.min(0.95, sxRaw));
  c.floats.push({ text: text, cls: cls || '', age: 0, x: _floatX, y: 0.12, _top: !!(t && t.isPassenger) });
}

window._rarityBulletColor = function(rarity){
  const map = { '破舊':'#b87333', '一般':'#e0e0e0', '庫存':'#4caf50', '精品':'#2196f3', '傳奇':'#ffb300' };
  return map[rarity] || '#ffb300';
};

function _renderTracers(c, ctx, W, H, layer){
  if(!c.tracers || !c.tracers.length) return;
  const now = performance.now();
  const _isBottom = (layer !== 'top');
  for(let i = c.tracers.length - 1; i >= 0; i--){
    const tr = c.tracers[i];
    const age = now - tr.born;
    /* 清理只由 bottom 負責，避免 top 把 tracer 刪掉後 bottom 畫不到 */
    if(age >= tr.dur){ if(_isBottom) c.tracers.splice(i, 1); continue; }
    const _tgtPass = !!(tr._target && tr._target.isPassenger);
    if(_isBottom && _tgtPass) continue;
    if(!_isBottom && !_tgtPass) continue;
    /* rev-fix-tracer-track-passenger: 載員為目標時，曳光終點每幀實時查 screenX */
    let _txTr = tr.tx;
    if(tr._target && tr._target.isPassenger && tr._target.srv && tr.hit){
      const _pfTr = (window._explore && window._explore.passengersFollowing) || [];
      for(let _ti = 0; _ti < _pfTr.length; _ti++){
        if(_pfTr[_ti].srv && _pfTr[_ti].srv.id === tr._target.srv.id){
          _txTr = _pfTr[_ti].screenX;
          break;
        }
      }
    }
    const alpha = (1 - age / tr.dur) * (tr.hit ? 0.95 : 0.65);
    const grad = ctx.createLinearGradient(tr.sx * W, tr.sy * H, _txTr * W, tr.ty * H);
    grad.addColorStop(0, 'rgba(255,255,255,0)');
    grad.addColorStop(0.5, (typeof _hexToRgba === 'function') ? _hexToRgba(tr.color, alpha * 0.5) : 'rgba(255,255,255,' + (alpha*0.5) + ')');
    grad.addColorStop(0.92, (typeof _hexToRgba === 'function') ? _hexToRgba(tr.color, alpha) : 'rgba(255,255,255,' + alpha + ')');
    grad.addColorStop(1, 'rgba(255,255,255,' + alpha + ')');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(tr.sx * W, tr.sy * H);
    ctx.lineTo(_txTr * W, tr.ty * H);
    ctx.stroke();
  }
}
window._renderTracers = _renderTracers;

function _render(){
  const c = window._combat;
  if(!c) return;
  if(!c.playerCanvas || !c.playerCanvas.isConnected){ _setupCanvas(); }
  if(!c.playerCtx) return;

  const ctxTop = c.playerCtxTop || null; /* rev-fix-bullet-split */
  const ctx = c.playerCtx;
  const W = c.playerCanvas.width, H = c.playerCanvas.height;
  ctx.clearRect(0, 0, W, H);
  if(ctxTop) ctxTop.clearRect(0, 0, W, H);

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
      /* rev-fix-combat-corpse-layer: 战斗中死敌立即进 corpse-layer（z-index 20），
       * 高于所有活载员（7）与玩家（5），与战斗后尸体层级一致。
       * 不再在 combat-overlay（z-index 6）里绘制，避免战斗中/战斗后层级不一致。 */
      if(!e._corpseRendered && !e._corpseFailed){
        try {
          if(typeof _startCorpses === 'function' && window._explore){
            const _px = c.allies[0] ? c.allies[0].worldX : 0;
            _startCorpses([e], [e.worldX - _px], e._eventRef);
          } else { e._corpseFailed = true; }
        } catch(err){ e._corpseFailed = true; }
      }
      continue;
    }

    /* rev-fix-anim-state-unified: 调 getUnitAnimState */
    const _as = (typeof getUnitAnimState === 'function') ? getUnitAnimState(e, _renderNow) : { name: 'idle', startTime: _renderNow };
    const animName = _as.name;
    const animStart = _as.startTime;
    const frame = (typeof computeAnimFrame === 'function') ? computeAnimFrame(animName, animStart, _renderNow) : 0;

    const pwId = (e.hasRPG && e.rpgAmmo > 0) ? 'rpg'
               : (e.primaryWeapon && e.primaryWeapon.id) ? e.primaryWeapon.id
               : (e.secondaryWeapon && e.secondaryWeapon.id) ? e.secondaryWeapon.id
               : null;
    const eq = { head: e.helmet || null, top: e.body || null, primary: pwId };
    const eqR = { head: e.rarity || '一般', top: e.rarity || '一般', primary: e.rarity || '一般' };
    if(typeof _raidDrawHuman !== 'function') continue;
    ctx.save();
    try { (window.drawHumanSprite || _raidDrawHuman)(ctx, sx, fy, eh / 386, eq, eqR, animName, frame, pwId ? 'primary' : null, 'enemy', true, false, null); } catch(err){}
    ctx.restore();
  }

  if(c.missileSmoke){
    ctx.save();
    ctx.globalCompositeOperation = 'lighter'; // 加色混合，徹底消除圓形邊界
    for(let si = 0; si < c.missileSmoke.length; si++){
      const s = c.missileSmoke[si];
      const sa = 1 - s.age / 1.2;
      if(sa <= 0) continue;
      const sr = s.size * W * (1 + s.age * 1.5);
      ctx.globalAlpha = sa * 0.15; // 進一步降低單粒子濃度，避免過曝
      const sg = ctx.createRadialGradient(s.x * W, s.y * H, 0, s.x * W, s.y * H, sr);
      sg.addColorStop(0, 'rgba(230,230,235,0.9)');
      sg.addColorStop(0.6, 'rgba(200,200,210,0.2)');
      sg.addColorStop(1, 'rgba(180,180,190,0)');
      ctx.fillStyle = sg;
      ctx.beginPath(); ctx.arc(s.x * W, s.y * H, sr, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  if(window.MuzzleFX) window.MuzzleFX.render(ctx, 'explore');
  if(typeof _renderTracers === 'function'){
    _renderTracers(c, ctx, W, H, 'bottom');
    if(ctxTop) _renderTracers(c, ctxTop, W, H, 'top');
  }

  for(let b = 0; b < c.bullets.length; b++){
    const bb = c.bullets[b];
    if(bb.isFast) continue;

    let bx, by;
    if(bb.isGrenade && typeof bb.worldStartX === 'number' && typeof bb.vx === 'number' && bb.T > 0){
      const nowMs = performance.now();
      if(bb.releaseAt && nowMs < bb.releaseAt){
        /* rev-fix-throw-delay-release: 釋放前手雷跟隨當前動畫幀的手部位置 */
        const hp = _getPlayerHandPos();
        bx = hp.x * W;
        by = hp.y * H;
      } else {
        const elapsed = Math.max(0, (nowMs - bb.start) / 1000);
        if(elapsed > bb.T + 0.5) continue;
        const _dir = (bb.dir === -1) ? -1 : 1;
        const wxWorld = bb.worldStartX + _dir * bb.vx * elapsed;
        const wyWorld = (bb.H0 || 1.3) + bb.vy * elapsed - 0.5 * GRENADE_G * elapsed * elapsed;
        const _px = c.allies[0] ? c.allies[0].worldX : 0;
        const relWX = wxWorld - _px;
        const sxN = EXPLORE_HERO_X_RATIO + (relWX / c.sm.screenRightWorld) * (1 - EXPLORE_HERO_X_RATIO);
        const _bgPpm = c.sm.bgPixelsPerMeter;
        const syN = 0.95 - (wyWorld * _bgPpm) / H;
        bx = sxN * W;
        by = syN * H;
      }
    } else {
      let drawT = Math.min(1, bb.t);
      bx = (bb.sx + (bb.tx - bb.sx) * drawT) * W;
      by = (bb.sy + (bb.ty - bb.sy) * drawT) * H;
      if(bb.t > 1 && !bb.hit){
        const ext = bb.t - 1;
        bx += (bb.tx - bb.sx) * W * ext;
        by += (bb.ty - bb.sy) * H * ext;
      }
      if(bb.arc){ by -= Math.sin(Math.min(1, bb.t) * Math.PI) * H * 0.35; }
    }
    const _isTopLayer = !!(bb._target && bb._target.isPassenger);
    const _ctx = _isTopLayer && ctxTop ? ctxTop : ctx;
    if(bx < -30 || bx > W + 30 || by < -30 || by > H + 30) continue;
    window._drawBulletShape(_ctx, bx, by, {
      rarity: bb.rarity, missile: !!bb.missile, big: !!bb.big,
      isGrenade: !!bb.isGrenade, grenadeId: bb.grenadeId, t: bb.t
    });
  }

  for(let f = 0; f < c.floats.length; f++){
    const ff = c.floats[f];
    const _ctxF = (ff._top && ctxTop) ? ctxTop : ctx;
    _ctxF.save();
    _ctxF.fillStyle = ff.cls === 'crit' ? '#ff3030' : (ff.cls === 'miss' ? '#a89a85' : (ff.cls === 'armor' ? '#5ab0ff' : '#ffb300'));
    _ctxF.font = 'bold 16px sans-serif';
    _ctxF.textAlign = 'center';
    _ctxF.fillText(ff.text, ff.x * W, ff.y * H - ff.age * 40);
    _ctxF.restore();
  }
  _renderBattleFX(ctx, c, ctxTop);
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

  if(win){
    const ex = window._explore;
    if(ex && ex.nodes){
      for(const node of ex.nodes){
        for(const ev of node.events){
          if(ev.cleared) continue;
          if(ev.type !== 'combat') continue;
          if(!ev.content || !ev.content.length) continue;
          if(ev.content.every(function(en){ return en.hp <= 0; })){
            ev.cleared = true;
          }
        }
      }
    }
  }

  /* rev-fix-online-servant: 2% 掉僕人（與離線一致） */
  if(win && Math.random() < 0.02 && typeof grantRandomServant === 'function'){
    var _svr = grantRandomServant();
    if(_svr && typeof SERVANT_TYPES !== 'undefined' && SERVANT_TYPES[_svr.type]){
      var _sdef = SERVANT_TYPES[_svr.type];
      if(typeof pushLog === 'function'){
        pushLog('<span class="pl">玩家</span> 擊敗敵人，獲得僕人：<b class="r-' + _svr.rarity + '">' + _sdef.name + '</b>（' + _svr.rarity + '）', [], 'explore');
      }
    }
  }

  /* 戰鬥勝利日誌已移除——不是關卡式戰鬥，沒有「X 名敵人」語義 */

  if(win){
    if(typeof c.onVictoryStart === 'function'){ try { c.onVictoryStart(); } catch(e){} }
    c.lootUntil = performance.now() + 0;
  } else {
    c.active = false;
    /* rev-fix-player-killer-resolve: 保存 killer 到 ex，供 onResolve 使用 */
    if(c._playerKiller && window._explore) window._explore._pendingPlayerKiller = c._playerKiller;
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
  /* [v182c H5] 玩家 hp<=0 时不算 stand still——否则 ts=0 → bg 不滚，
     用户看到「玩家 hp=0 背景不动」的僵局。hp=0 时应该走死亡流程。 */
  if(p.hp <= 0) return false;

  /* v174 修復1：以 heroAnim.name 為唯一事實來源。
     v172 只寫了 fire_primary / fire_secondary，漏了 reload / heal_melee /
     attack_melee / switch_* / hurt —— 換彈時 heroAnim.name === 'reload' 不匹配，
     會走到底部 canEngage，敵人若在射程外就返回 false → ts=1.4 → 滑行。
     這裡把「所有腿不動的動畫狀態」全部覆蓋。 */
  if(typeof heroAnim !== 'undefined'){
    const _n = heroAnim.name;
    if(_n === 'fire_primary' || _n === 'fire_secondary'
       || _n === 'reload' || _n === 'heal_melee'
       || _n === 'attack_melee' || _n === 'hurt'
       || _n === 'switch_secondary' || _n === 'switch_melee'){
      return true;
    }
  }

  /* 時序兜底（保留原邏輯，作為安全網） */
  const _now = performance.now();
  if(c._playerAnimUntil && _now < c._playerAnimUntil) return true;
  if(c._playerReloadEnd && _now < c._playerReloadEnd) return true;
  if(c._playerSwitchEnd && _now < c._playerSwitchEnd) return true;
  if(c._hurtUntil && _now < c._hurtUntil) return true;

  /* 敵人在射程內 → 站定 */
  const w = _getPW();
  if(!w || !w.def) return false;
  const r = _rangeOfWeaponDef(w.def);
  for(let i = 0; i < c.enemies.length; i++){
    if(c.enemies[i].hp <= 0) continue;
    if(window.canEngage(r, c.enemies[i], Math.abs(c.enemies[i].worldX - p.worldX))) return true;
  }
  /* 載員 firing 時，玩家也站定，避免載員滑行 */
  for(let _ai = 1; _ai < c.allies.length; _ai++){
    const _a = c.allies[_ai];
    if(_a.hp <= 0 || _a._retreating) continue;
    if(_a._mode === 'firing') return true;
  }
  return false;
};

window._combatPlayerAdvance = function(delta){
  const c = window._combat;
  if(!c || !c.active || c.resolved) return;
  if(c.sceneType === 'vehicle') return;
  const p = c.allies[0];
  if(!p) return;
  /* [v185b H26] 玩家推进时：
     (1) firing/waiting 载员被玩家追上 → 让路（推到玩家 + 0.5m）
         原代码只推敌人，玩家越过 firing 载员 → 载员落到玩家身后。
     (2) 敌人被推到 max(玩家 + 0.5, 前方最近载员 + 0.5)
         原代码只推敌人到玩家 + 0.5，可以落在载员身后（穿越载员）。 */
  /* [v190] 删除「玩家推进推 firing/waiting 载员」——玩家和载员之间不阻挡。
     这是「载员向右平移」的唯一原因。 */
  for(let i = 0; i < c.enemies.length; i++){
    const _eH26 = c.enemies[i];
    if(!_eH26 || _eH26.hp <= 0) continue;
    let _threshold = p.worldX + 0.5;
    for(let _aiH26b = 1; _aiH26b < c.allies.length; _aiH26b++){
      const _aH26b = c.allies[_aiH26b];
      if(_aH26b.hp <= 0) continue;
      if(_aH26b._retreating) continue;
      if(_aH26b.worldX < _eH26.worldX && (_aH26b.worldX + 0.5) > _threshold){
        _threshold = _aH26b.worldX + 0.5;
      }
    }
    if(_eH26.worldX < _threshold) _eH26.worldX = _threshold;
  }
};;

/* rev-fix-ty-level */
window._combatStart = _start;

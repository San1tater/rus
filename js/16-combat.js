/* v17.5 hotfix batch applied */

'use strict';

window._combat = null;
window._combatActive = false;

/* rev-arena: 口径字符串转 mm 数值 */
function _calToMM(cal){
  if(!cal) return 7.62;
  if(typeof cal === 'number') return cal;
  var s = String(cal);
  if(s === '5.45') return 5.45;
  if(s === '7.62') return 7.62;
  if(s === '7.62x54') return 7.62;
  if(s === '9x18') return 9;
  if(s === '9x19') return 9;
  if(s === '9x39') return 9;
  if(s === '12ga' || s === '20/70') return 12;
  if(s === '12.7') return 12.7;
  if(s === '23x75') return 23;
  var m = s.match(/^([d.]+)/);
  return m ? parseFloat(m[1]) : 7.62;
}
window._calToMM = _calToMM;

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
/* rev-box3d: part 顯式優先，否則 applyDamage 讀 _hitCtx（幾何判定） */
var res = applyDamage(proxy, d.baseDmg, d.penMM, { armorProvider: armorProvider, part: opts.part || null });
return { crit: d.crit, hpLost: res.hpLost, armorLost: res.armorLost, totalShown: res.hpLost > 0 ? res.hpLost : res.armorLost, baseDmg: d.baseDmg, part: res.part };
}


const FOOT_RANGE_SHORT = 20;
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
  /* rev-fix-enemy-exhaust: 跳过已耗尽的武器，回退到下一把 */
  if(e._activeWeapon && e._activeWeapon.id) return e._activeWeapon;
  var _ex = e._exhaustedWeapons || {};
  if(e.primaryWeapon && e.primaryWeapon.id && !_ex[e.primaryWeapon.id]) return (e._activeWeapon = e.primaryWeapon);
  if(e.secondaryWeapon && e.secondaryWeapon.id && !_ex[e.secondaryWeapon.id]) return (e._activeWeapon = e.secondaryWeapon);
  if(e.melee && e.melee.id && !_ex[e.melee.id]) return (e._activeWeapon = e.melee);
  return null;
}
function _enemyDetachWeapon(e, w){
  /* rev-fix-enemy-exhaust: 不再置 null 武器字段（否则 rollEnemyLoot 会丢武器掉落），
   * 只标记该武器已耗尽，下次 _enemyActiveWeapon 跳过。 */
  if(!w) return;
  if(!e._exhaustedWeapons) e._exhaustedWeapons = {};
  if(w.id) e._exhaustedWeapons[w.id] = true;
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
  /* rev-range-gate: 射程必須讀「本次實際會開火的武器」。
     主武器彈藥耗盡後 _enemyTryFire 會切到副武器（手槍 8m），
     舊實作仍讀 e.primaryWeapon（機槍 50m）→ 傳奇敵人在 45m 外用 mp443 命中玩家。 */
  if(e.hasRPG && e.rpgAmmo > 0) return (typeof RPG_COMBAT_RANGE !== 'undefined') ? RPG_COMBAT_RANGE : 150;
  var w = (typeof _enemyActiveWeapon === 'function') ? _enemyActiveWeapon(e) : null;
  if(!w) w = e.primaryWeapon || e.secondaryWeapon || e.melee;
  if(!w) return 8;
  var wd = (typeof WEAPONS !== 'undefined') ? WEAPONS[w.id] : null;
  if(!wd) return 8;
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
sweep: !!cfg.sweep,
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
    if(cfg.sweep || cfg.sceneType === 'vehicle') return;
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
  /* rev-fx-dpr: 戰鬥 FX 畫布補 devicePixelRatio —— 與載具畫布一致。
     背板 = CSS × dpr + setTransform(dpr)；繪製與判定一律用邏輯（CSS）座標。
     原本背板 = CSS（1×），0.8px 金色火花被瀏覽器放大 dpr 倍 → 糊成一團。 */
  const dpr = window.devicePixelRatio || 1;
  const w = z1.clientWidth, h = z1.clientHeight;
  const bw = Math.max(1, Math.floor(w * dpr)), bh = Math.max(1, Math.floor(h * dpr));
  let c = document.getElementById('combat-overlay');
  if(!c){
    c = document.createElement('canvas');
    c.id = 'combat-overlay';
    c.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:6;';
    z1.appendChild(c);
  }
  if(c.width !== bw) c.width = bw;
  if(c.height !== bh) c.height = bh;
  if(c.style.width !== w + 'px') c.style.width = w + 'px';
  if(c.style.height !== h + 'px') c.style.height = h + 'px';
  window._combat.playerCanvas = c;
  window._combat.playerCtx = c.getContext('2d');
  window._combat.playerCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  /* rev-fix-bullet-zlayer: 頂層 canvas 只畫打載員的子彈/曳光 */
  let cTop = document.getElementById('combat-overlay-top');
  if(!cTop){
    cTop = document.createElement('canvas');
    cTop.id = 'combat-overlay-top';
    cTop.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:12;';
    z1.appendChild(cTop);
  }
  if(cTop.width !== bw) cTop.width = bw;
  if(cTop.height !== bh) cTop.height = bh;
  if(cTop.style.width !== w + 'px') cTop.style.width = w + 'px';
  if(cTop.style.height !== h + 'px') cTop.style.height = h + 'px';
  window._combat.playerCanvasTop = cTop;
  window._combat.playerCtxTop = cTop.getContext('2d');
  window._combat.playerCtxTop.setTransform(dpr, 0, 0, dpr, 0, 0);
  window._combat.dpr = dpr;
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
window._spawnHitSpark = function(owner, sx, sy, crit, cls, isTop, followTarget){
  if(!owner) return;
  if(!owner.sparks) owner.sparks = [];
  /* rev-fix-spark-tier-v2: 三檔視覺 —— cls 是唯一判定依據，crit 只做擊穿內加碼。
     未擊穿（armor/miss/heal）：4 粒 / 0.8 / 金
     擊穿：7 粒 / 1.2 / 紅；暴擊：10 粒 / 1.8 / 深紅 */
  var _blocked = (cls === 'armor' || cls === 'miss' || cls === 'heal');
  var n, baseSpd, baseSz, color;
  if(_blocked){
    n = 4; baseSpd = 25; baseSz = 0.8; color = '#ffd680';
  } else if(cls === 'crit'){
    n = 10; baseSpd = 60; baseSz = 1.8; color = '#ff3030';
  } else {
    n = 7; baseSpd = 40; baseSz = 1.2; color = '#ff5030';
  }
  /* rev-spark-follow: 火花是命中目標的特效 → 跟目標移動。
     存相對目標的世界偏移（米）+ 世界速度，渲染時經當前相機投影。
     無目標（後院等舊呼叫端）→ 退回螢幕座標，行為不變。 */
  var _cmb = window._combat;
  var _W = window._fxViewW(_cmb && _cmb.playerCanvas);
  var _sr = (_cmb && _cmb.sm && _cmb.sm.screenRightWorld) || 2;
  var _hr = (typeof EXPLORE_HERO_X_RATIO === 'number') ? EXPLORE_HERO_X_RATIO : 0.25;
  var _invD = 1 / Math.max(0.05, 1 - _hr);
  var _cam = (_cmb && _cmb.allies && _cmb.allies[0] && typeof _cmb.allies[0].worldX === 'number') ? _cmb.allies[0].worldX : 0;
  var _follow = !!(followTarget && typeof followTarget.worldX === 'number');
  var _fdx0 = _follow ? ((sx / _W - _hr) * _invD * _sr - (followTarget.worldX - _cam)) : 0;
  for(var i = 0; i < n; i++){
    var ang = Math.random() * Math.PI * 2;
    var spd = baseSpd + Math.random() * 30;
    var _vx = Math.cos(ang) * spd;
    var p = {
      x: sx, y: sy,
      vx: _vx,
      vy: Math.sin(ang) * spd - 12,
      life: 0.15 + Math.random() * 0.15,
      maxLife: 0.3,
      size: baseSz,
      color: color,
      _blk: _blocked,
      _top: !!isTop
    };
    if(_follow){
      p._ft = followTarget;
      p._fdx = _fdx0;
      p._wvx = _vx / _W * _invD * _sr;
      p.x = 0; p.vx = 0;
    }
    owner.sparks.push(p);
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
window._spawnRPGImpactFx = function(owner, sx, sy, radPx, noDelay){
var _st0 = (owner && owner.explosions) ? owner.explosions.length : 0;
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
/* rev-fx-nodelay: 車體命中 / APS 的可見窗口只有 33~140ms（世界 19.4 m/s 掠過 477px 畫布）。
   黑煙生成延遲 0~160ms → 主煙一半、次煙幾乎全部在出生前就已掠出畫面。
   此情境歸零延遲；顆數 / 尺寸 / 顏色 / 壽命全不動。 */
if(noDelay && owner && owner.explosions){
for(var _di = _st0; _di < owner.explosions.length; _di++){ owner.explosions[_di].delay = 0; }
}
};

/* rev-world-anchor: 把刚生成的爆炸粒子从屏幕 px 转成世界米 _wx / _wvx，之后动画永远锚定世界位置。
 * 手雷 / RPG / APS 拦截统一走这个，之前不转导致跟屏幕静止。 */
window._applyWorldAnchor = function(owner, startIdx, camWX, sm, followTarget){
  if(!owner || !owner.explosions) return;
  if(startIdx >= owner.explosions.length) return;
  var _cmb = window._combat;
  var W = window._fxViewW(_cmb && _cmb.playerCanvas);
  var _ppm = (sm && sm.bgPixelsPerMeter) ? sm.bgPixelsPerMeter : ((_cmb && _cmb.sm && _cmb.sm.bgPixelsPerMeter) || 1);
  var _sr = (sm && sm.screenRightWorld) || 2;
  var _hr = (typeof EXPLORE_HERO_X_RATIO === 'number') ? EXPLORE_HERO_X_RATIO : 0.25;
  var _invD = 1 / (1 - _hr);
  for(var i = startIdx; i < owner.explosions.length; i++){
    var q = owner.explosions[i];
    if(q._wx !== undefined || q._ft) continue;
    if(!isFinite(q.x)) continue;
    var _relM = (q.x / W - _hr) * _invD * _sr;
    var _wv = q.vx / W * _invD * _sr;
    /* rev-fx-frame-all: 命中目標 → 整套粒子跟目標（火光 / 黑煙 / 碎片 / 火星）；
       沒有目標（地面爆 / 空中攔截）→ 整套錨世界爆點。歸屬只看有無目標，不看 kind。
       世界錨定者的可見窗只有數十毫秒，生成延遲會讓煙在出生前就掠出畫面 → 歸零。 */
    if(followTarget){
      q._ft = followTarget;
      q._fdx = _relM;
    } else {
      q._wx = camWX + _relM;
      q.delay = 0;
    }
    q._wvx = _wv;
    /* rev-fx-seed-prev: 出生即帶前幀投影，首幀就有拖影 */
    q._fxPrevPx = q.x;
    q._wm = true;
    q.size = q.size / _ppm;
    q.growth = (q.growth || 0) / _ppm;
    q.x = 0;
    q.vx = 0;
  }
};

window._tickBattleFX = function(owner, dt){
  if(!owner) return;
  if(owner.sparks){
    for(var i = owner.sparks.length - 1; i >= 0; i--){
      var p = owner.sparks[i];
      /* rev-spark-follow: 跟目標的火花推進「相對目標的世界偏移」，不是螢幕 x */
      if(p._ft){
        p._fdx += (p._wvx || 0) * dt;
        p._wvx = (p._wvx || 0) * 0.95;
      } else {
        p.x += p.vx * dt;
        p.vx *= 0.95;
      }
      p.y += p.vy * dt;
      p.vy += 180 * dt;
      p.life -= dt;
      if(p.life <= 0) owner.sparks.splice(i, 1);
    }
  }
  if(owner.explosions){
    for(var j = owner.explosions.length - 1; j >= 0; j--){
      var q = owner.explosions[j];
      /* rev-fix-fx-delay: 延遲生成期間不動、不縮、不消失 */
      if(q.delay && q.delay > 0){ q.delay -= dt; if(q.delay < 0) q.delay = 0; continue; }
      /* rev-world-anchor: 跟目標 / 世界靜止 / 螢幕座標三種歸屬 */
      if(q._ft){
        q._fdx += (q._wvx || 0) * dt;
        q._wvx = (q._wvx || 0) * 0.95;
      } else if(q._wx !== undefined){
        q._wx += q._wvx * dt;
        q._wvx *= 0.95;
      } else {
        q.x += q.vx * dt;
        q.vx *= 0.95;
      }
      q.y += q.vy * dt;
      /* rev-fix-fx-gravity: 碎片/火星受重力，需在摩擦前累加 */
      if(q.gravity) q.vy += q.gravity * dt;
      q.vy *= 0.95;
      q.life -= dt;
      q.size += (q.growth || 0) * dt;
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
  var _br = (typeof BULLET_VISUAL_RADIUS !== 'undefined') ? BULLET_VISUAL_RADIUS : { normal: 3, grenade: 5, rpg: 6 };
  var _r;
  /* 兼容旧版常量：优先 rpg，回退 missile，最后硬编码 6 */
  if(opts.rpg){ _r = _br.rpg || _br.missile || 6; }
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
  /* rev-fx-logical-view: 投影 / 裁切用邏輯寬（背板可能是 CSS×dpr） */
  var _cmb = window._combat;
  var _WrR = window._fxViewW(ctx.canvas);
  var _ppmX = (_cmb && _cmb.sm && _cmb.sm.bgPixelsPerMeter) ? _cmb.sm.bgPixelsPerMeter : 1;
  if(owner.sparks){
    /* rev-spark-render: 跟目標的火花每幀重新投影；螢幕外不畫。
       未擊穿是金點，落在淺色裝甲上對比不足 → 深色接觸影讓它讀得出來。
       火花本身顆數 / 半徑 / 顏色不變。 */
    for(var i = 0; i < owner.sparks.length; i++){
      var p = owner.sparks[i];
      var a = Math.max(0, Math.min(1, p.life / p.maxLife * 1.6));
      var _c = (p._top && ctxTop) ? ctxTop : ctx;
      var _pxs = (p._ft || p._wx !== undefined) ? window._fxProjectPx(p, _WrR) : p.x;
      if(!isFinite(_pxs) || _pxs < -20 || _pxs > _WrR + 20) continue;
      _c.save();
      if(p._blk){
        _c.globalAlpha = a * 0.6;
        _c.fillStyle = 'rgba(20,14,8,1)';
        _c.beginPath();
        _c.arc(_pxs, p.y, p.size * 2.0, 0, Math.PI * 2);
        _c.fill();
      }
      _c.globalAlpha = a;
      _c.fillStyle = p.color;
      _c.shadowColor = p.color;
      _c.shadowBlur = 6;
      _c.beginPath();
      _c.arc(_pxs, p.y, p.size, 0, Math.PI * 2);
      _c.fill();
      _c.restore();
    }
  }
  if(owner.explosions){
    for(var j = 0; j < owner.explosions.length; j++){
      var q = owner.explosions[j];
      /* rev-fx-prev-delay: 延遲期不繪製，但先記錄投影位置，
         出生首幀才有前幀位置可畫拖影 */
      if(q.delay && q.delay > 0){
        q._fxPrevPx = window._fxProjectPx(q, _WrR);
        continue;
      }
      /* rev-fix-fx-alpha: flash / ember_hot 單獨提高，其餘 0.55 */
      var _aBase = 0.55;
      if(q.kind === 'flash') _aBase = 0.95;
      else if(q.kind === 'flash2') _aBase = 0.80;
      else if(q.kind === 'ember_hot') _aBase = 0.80;
      var a2 = Math.max(0, Math.min(1, q.life / q.maxLife)) * _aBase;
      var _c2 = (q._top && ctxTop) ? ctxTop : ctx;
      /* _wm：尺寸存世界米，經 ppm 換算 → 各裝置物理尺寸一致 */
      var _szPx = q._wm ? (q.size * _ppmX) : q.size;
      if(!isFinite(_szPx) || _szPx <= 0) continue;
      var _px = window._fxProjectPx(q, _WrR);
      var _pxPrev = (typeof q._fxPrevPx === 'number') ? q._fxPrevPx : null;
      /* rev-fx-prev-keep: 前幀位置一律保留 —— 裁切時清空會讓粒子
         重新入框的首幀沒有拖影，那一幀正是最關鍵的可見幀 */
      q._fxPrevPx = _px;
      if(q._ft || q._wx !== undefined){
        if(_px < -_WrR * 0.5 || _px > _WrR * 1.5) continue;
      }
      if(!isFinite(_px) || !isFinite(q.y)) continue;
      _c2.save();
      _c2.globalAlpha = a2;
      /* rev-fx-streak: 高速掠過快門的粒子以拖影光柵化。
         位置 / 壽命 / 顆數 / 濃度全不改，只改「怎麼把移動掃描到畫面上」。 */
      var _stDx = (_pxPrev != null && !q._ft) ? (_px - _pxPrev) : 0;
      var _rxSt = _szPx + Math.abs(_stDx) * 0.5;
      _c2.translate(_px - _stDx * 0.5, q.y);
      _c2.scale(_rxSt / Math.max(0.001, _szPx), 1);
      var g = _c2.createRadialGradient(0, 0, 0, 0, 0, _szPx);
      /* rev-fix-fx-kinds: 按 kind 分派漸變（預設走手雷灰） */
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
      } else if(q.kind === 'smoke_light'){
        /* rev-aps-smoke: APS 攔截殘留煙雲，淺灰/白 */
        g.addColorStop(0, 'rgba(220,220,225,0.75)');
        g.addColorStop(0.5, 'rgba(200,200,210,0.35)');
        g.addColorStop(1, 'rgba(180,180,190,0)');
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
        g.addColorStop(0, 'rgba(180,180,180,0.9)');
        g.addColorStop(0.5, 'rgba(140,140,140,0.4)');
        g.addColorStop(1, 'rgba(100,100,100,0)');
      }
      _c2.fillStyle = g;
      _c2.beginPath();
      if(q.isGround){
        _c2.ellipse(0, 0, _szPx, _szPx * 0.18, 0, 0, Math.PI * 2);
      } else {
        _c2.arc(0, 0, _szPx, 0, Math.PI * 2);
      }
      _c2.fill();
      _c2.restore();
    }
  }
};

function _cleanup(){
/* rev-arm45: 不清除 dead —— 舊版把倒地重置成 walk，玩家/守衛會「站著不動」。 */
window._combatActive = false;
window._combat = null;
const c = document.getElementById('combat-overlay');
if(c) c.remove();
const ct = document.getElementById('combat-overlay-top');
if(ct) ct.remove();
const f = document.getElementById('combat-frames');
if(f) f.remove();
const fl = document.getElementById('combat-frames-left');
if(fl) fl.remove();
if(typeof heroAnim !== 'undefined' && heroAnim.name !== 'walk' && heroAnim.name !== 'idle' && heroAnim.name !== 'dead'){
heroAnim.name = 'walk';
heroAnim.frame = 0;
heroAnim.lastUpdate = performance.now();
}
}

window._combatCleanup = _cleanup;

/* rev-enemy-vx: 每帧根据 worldX 帧差维护 e._vx，供投掷/射击预判 */
function _updateEnemyVx(c, dt){
  if(!c || !(dt > 0)) return;
  if(c.enemies){
    for(var _i = 0; _i < c.enemies.length; _i++){
      var _e = c.enemies[_i];
      if(!_e) continue;
      if(typeof _e._lastWorldX !== 'number'){ _e._lastWorldX = _e.worldX; _e._vx = 0; continue; }
      var _evx = (_e.worldX - _e._lastWorldX) / dt;
      if(!isFinite(_evx)) _evx = 0;
      _e._vx = _evx;
      _e._lastWorldX = _e.worldX;
    }
  }
  /* rev-fix-allies-vx: 玩家/載員也維護 _vx，供敵人投雷預判（原僅維護 c.enemies，導致敵雷對玩家/載員預判退化為 0） */
  if(c.allies){
    for(var _j = 0; _j < c.allies.length; _j++){
      var _a = c.allies[_j];
      if(!_a) continue;
      if(typeof _a._lastWorldX !== 'number'){ _a._lastWorldX = _a.worldX; _a._vx = 0; continue; }
      var _avx = (_a.worldX - _a._lastWorldX) / dt;
      if(!isFinite(_avx)) _avx = 0;
      _a._vx = _avx;
      _a._lastWorldX = _a.worldX;
    }
  }
}


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
    if(typeof _updateEnemyVx === 'function') _updateEnemyVx(c, dt);
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

  if(typeof currentTab === 'undefined' || currentTab === 'explore' || c.sweep){
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
/* rev-weapon-restore: 治療 / 手雷 / 換彈結束後強制恢復武器顯示，
   不再讓 eqSlot='hidden' 或 healItem 殘留導致武器消失。 */
const c = window._combat;
if(!c || typeof heroAnim === 'undefined' || c.sceneType === 'vehicle') return;
const p = c.allies[0];
if(!p || !p.isPlayer) return;
const ex = window._explore;
const _healing = !!(ex && ex.mode === 'healing');
/* 非治療中一律清治療殘留（含手雷 / 換彈 / 受擊路徑） */
if(!_healing && heroAnim.name !== 'heal_melee'){
if(heroAnim.eqSlot === 'hidden') heroAnim.eqSlot = null;
if(heroAnim.healItem) heroAnim.healItem = null;
}
if(_healing) return;
if(heroAnim.name === 'dead') return;
if(now < (c._playerReloadEnd || 0)){
if(heroAnim.name !== 'reload'){ heroAnim.name = 'reload'; heroAnim.frame = 0; heroAnim.lastUpdate = now; }
return;
}
if(now < (c._playerSwitchEnd || 0) && c._switchAnim){
if(heroAnim.name !== c._switchAnim){ heroAnim.name = c._switchAnim; heroAnim.frame = 0; heroAnim.lastUpdate = now; }
return;
}
if(now < (c._playerAnimUntil || 0) && c._fireAnim){
if(heroAnim.name !== c._fireAnim) heroAnim.name = c._fireAnim;
return;
}
/* 動作視窗已過期 → 清殘留並回移動 / 待機 */
if(c._fireAnim){ c._fireAnim = null; c._playerAnimUntil = 0; }
if(heroAnim.eqSlot === 'hidden') heroAnim.eqSlot = null;
if(heroAnim.healItem) heroAnim.healItem = null;
if(now < (c._hurtUntil || 0)){
if(heroAnim.name !== 'hurt'){ heroAnim.name = 'hurt'; heroAnim.frame = 0; heroAnim.lastUpdate = now; }
return;
}
const want = (ex && ex._currentSpeed > 0.5) ? 'walk' : 'idle';
if(heroAnim.name !== want){ heroAnim.name = want; heroAnim.frame = 0; heroAnim.lastUpdate = now; heroAnim.forcedEnd = 0; heroAnim.animStart = null; }
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
  heroAnim.eqSlot = (c._activeSlot === 'secondary') ? 'secondary' : 'primary'; /* rev-hands-combat */
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
  /* rev-incoming-y: 舊路徑曳光終點 = 實繪車體中心（含內容邊界與沉底偏移） */
  var m = (typeof window._vehicleRenderMetrics === 'function') ? window._vehicleRenderMetrics() : null;
  if(m) return Math.max(0.2, Math.min(0.8, m.centerN));
  var b = window.BTRSupport;
  if(!b || !b.active) return 0.6;
  var h = b.height;
  if(!h) return 0.6;
  var centerY = (h * 0.95 - b.targetH / 2) / h;
  return Math.max(0.30, Math.min(0.60, centerY));
}

function _isDiscovered(en, evWorldX, isV, p, ex){
  const dist = Math.abs(evWorldX - ex.worldX);
  const _R = (typeof window.getEntityDetectableR === 'function') ? window.getEntityDetectableR : function(){ return 80; };
  /* 參戰名單 = 任一方發現對方（氣泡另有 R_目標 閘門，見 _renderFrames） */
  if(dist <= _R(p)) return true;
  if(dist <= _R(en)) return true;
  return false;
}

function _syncWorldEnemies(now){
  const c = window._combat;
  const ex = window._explore;
  if(!c || !ex || !c.active || c.resolved || c.sweep) return;
  const _activeSet = new Set(c.enemies);
  const _p = c.allies[0];
  if(!_p) return;
  const isV = c.sceneType === 'vehicle' && _p.isVehicle;
  for(const node of ex.nodes){
    for(const ev of node.events){
      if(ev.cleared) continue;
      if(ev.type !== 'combat') continue;
      if(!ev.content || !ev.content.length) continue;
      for(let j = 0; j < ev.content.length; j++){
        const en = ev.content[j];
        if(!en || en.hp <= 0) continue;
        if(_activeSet.has(en)) continue;
        if(!_isDiscovered(en, ev.worldX, isV, _p, ex)) continue;
        en.worldX = ev.worldX + (j - (ev.content.length - 1) / 2) * 1.5;
        en._initWorldX = en.worldX;
        window._setEnemyEvent(en, ev);
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
      /* rev-veh-sweep: Boss 不跑步兵 AI（它有自己的狀態機），
         且 bossTarget.hp 是唯讀 getter，禁止 e.hp = 0。
         載具接觸即必殺 —— 與探索 roadkill 同一條「車頭越過目標近緣」判定。 */
      if(e.isBoss){
        if(_isVeh){
          var _hlB = (typeof window.getVehicleHalfLengthWorld === 'function') ? window.getVehicleHalfLengthWorld(p.vehicleId) : 3.6;
          var _boxB = (typeof window._getTargetBox === 'function') ? window._getTargetBox(e) : null;
          var _bHalf = (_boxB && _boxB.L > 0) ? _boxB.L / 2 : 2;
          if(e.worldX - _bHalf <= p.worldX + _hlB){
            c.enemies.splice(i, 1);
            if(typeof window._bossVehicleRoadkill === 'function') window._bossVehicleRoadkill();
          }
        }
        continue;
      }
      
    if(_isVeh && (!isFinite(e.worldX) || e.worldX <= p.worldX + ((typeof window.getVehicleHalfLengthWorld === 'function') ? window.getVehicleHalfLengthWorld(p.vehicleId) : 3.6))){
      e.hp = 0;
      e.gone = true;
e._lootDone = true; /* rev-sweep-bossfix2: 撞擊不掉落，避免後續拾取補 roll */
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
  const _btrPlayerProtected = (typeof window._isPlayerMounted === 'function' ? window._isPlayerMounted() : false);
  if(p.isPlayer && !_btrPlayerProtected && p.hp > 0 && now >= (p._nextFireAt || 0) && !(window._explore && window._explore.mode === "healing")){ /* rev-combatfix */
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
    /* rev-term-lock-fire: 术语锁「dist ≤ R_目標 且 dist ≤ 自身射程」。
       载员开火必须同时满足：敵人的可被發現 R 與自身射程。 */
    for(let b = 0; b < alive.length; b++){
      const _dist2 = Math.abs(alive[b].worldX - a2.worldX);
      const _eR2 = (typeof ENEMY_DETECTABLE_R !== 'undefined' && ENEMY_DETECTABLE_R[alive[b].rarity]) ? ENEMY_DETECTABLE_R[alive[b].rarity] : 225;
      if(_dist2 <= r2 && _dist2 <= _eR2) ir2.push(alive[b]);
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
  const _order = ['primary', 'secondary', 'melee'];
  for(let _oi = 0; _oi < _order.length; _oi++){
    const _s = _order[_oi];
    const _id = state.player.equipped[_s];
    const _d = _id ? itemDef(_id) : null;
    if(!_d) continue;
    if(_d.slot === 'melee'){
      if(c) c._activeSlot = _s;
      return { id: _id, rarity: state.player.equippedRarity[_s] || '一般', slot: _s, def: _d };
    }
    if(_d.cal){
      const _hasMag = c && c._playerMag && c._playerMag.weaponId === _id && c._playerMag.inMag > 0;
      const _ammo = (typeof pickAmmoByPreferenceOrOrder === 'function') ? pickAmmoByPreferenceOrOrder(_d.cal, 'combat') : null;
      if(_hasMag || _ammo){
        if(c) c._activeSlot = _s;
        return { id: _id, rarity: state.player.equippedRarity[_s] || '一般', slot: _s, def: _d };
      }
      continue;
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
var R=window.PuppetRig,c=window._combat;
if(!R||!c||!a||!a.weapon||!a.weapon.id)return null;
var fx=document.getElementById('combat-overlay');if(!fx)return null;
var W=fx.clientWidth,H=fx.clientHeight;if(!W||!H)return null;
var ex=window._explore,ls=(ex&&ex.passengersFollowing)||[],it=null;
for(var i=0;i<ls.length;i++){if(ls[i].srv&&a.srv&&ls[i].srv.id===a.srv.id){it=ls[i];break;}}
if(!it)return null;
var an=(it._lastAnimN==='death')?'dead':(it._lastAnimN||'idle');
var m=R.muzzle(a.weapon.slot||'primary',a.weapon.id,an,it.animFrame|0,false);
if(!m)return null;
var cw=H*1.2,s=(H*CHAR_HEIGHT_FACTOR)/386,left=it.screenX*W-cw/2;
return{x:(left+cw/2+s*(m.x-200))/W,y:(H*0.96+s*(m.y-515))/H};}

function _getEnemyMuzzlePos(e,p,isRPG){
var R=window.PuppetRig,fx=document.getElementById('combat-overlay');
var W=fx?fx.clientWidth:400,H=fx?fx.clientHeight:500,c=window._combat;
if(!R||!c)return{x:1.05,y:0.55};
var sm=c.sm||{screenRightWorld:2},rel=(e.worldX-p.worldX)+(isRPG?0.5:0);
var sx=(EXPLORE_HERO_X_RATIO+(rel/(sm.screenRightWorld||2))*(1-EXPLORE_HERO_X_RATIO))*W;
if(rel<=0)sx=0.02*W;
var aw=(isRPG&&e.hasRPG)?{id:'rpg',slot:'primary'}:_pmActiveWeapon(e);
if(!aw)return{x:sx/W,y:0.55};
var now=performance.now();
var as=(typeof getUnitAnimState==='function')?getUnitAnimState(e,now):{name:'idle',startTime:now};
var an=(as.name==='death')?'dead':as.name;
var fi=Math.floor(Math.max(0,now-as.startTime)/(1000/R.fps(an)));
var m=R.muzzle(aw.slot,aw.id,an,fi,true);
if(!m)return{x:sx/W,y:0.55};
var s=(H*CHAR_HEIGHT_FACTOR)/386;
return{x:(sx+s*(m.x-200))/W,y:(H*0.95+s*(m.y-515))/H};}


function _firePlayer(p, t, now, w){
  const c = window._combat;
  if(!w || !w.def) return false;
  const isMelee = (w.def.slot === 'melee');

  if(c._playerReloadEnd && now < c._playerReloadEnd) return false;

  if(isMelee){
  /* rev-melee-geom: 近戰命中 = 接觸幀幾何判定，不再擲 hr 機率。
     與射擊同一條模型：瞄準點 + 散佈 → slab 求交，揮空就是 miss。
     hr 仍傳入（熟練 → 角散佈），但近距 σ_aim 主導 → 命中約 79%、幾乎不隨 hr 變。 */
  let hr = (typeof getHitRate === 'function') ? getHitRate(w.def.type) : 30;
  if(!c.playerFirst) hr *= SECOND_HIT_RATE;
  _playMeleeFire(now);
  /* rev-eqslot: 近戰動畫畫近戰武器 */
  if(typeof heroAnim !== 'undefined'){ heroAnim.eqSlot = 'melee'; heroAnim.healItem = null; }
  const hits = (typeof getMeleeHits === 'function') ? getMeleeHits(w.def.rpm) : 1;
  const critRate = (typeof calcCritRate === 'function') ? calcCritRate(w.rarity, '一般') : 0.1;
  const critMult = (typeof calcCritMult === 'function') ? calcCritMult(w.rarity, w.rarity) : 1.5;
  const baseDmg = Math.round((w.def.dmg || 20) * (RARITY_MULT[w.rarity] || 1));
  /* rev-animatk: 接觸幀 5（front_arm 最前），hits 分散 [4,5,6]，每下重檢存活／射程／幾何 */
  const _amA = (typeof GAME_ANIMS !== 'undefined' && GAME_ANIMS.attack_melee) ? GAME_ANIMS.attack_melee : null;
  const _fd = _amA ? 1000/_amA.fps : 71.4;
  const _frames = [4,5,6];
  const _rng = (typeof _rangeOfWeaponDef === 'function') ? _rangeOfWeaponDef(w.def) : 0.75;
  for(let i = 0; i < hits; i++){
    const _delay = Math.round(_frames[Math.min(i, _frames.length-1)] * _fd);
    setTimeout(function(){
      const cc = window._combat;
      if(!cc || !cc.active || cc.resolved) return;
      if(!p || p.hp <= 0 || !t || t.hp <= 0) return;
      if(Math.abs(t.worldX - p.worldX) > _rng) return;
      var _ms = (typeof window._meleeStrike === 'function')
        ? window._meleeStrike(p.worldX, t, { weaponId:w.id, weaponType:'近戰', hr:hr, range:_rng })
        : null;
      if(!_ms) return;
      let dmg = baseDmg; let isCrit = false;
      if(Math.random() < critRate){ dmg = Math.round(dmg * critMult); isCrit = true; }
      var _ctxP = window._hitCtx;
      window._hitCtx = { target:t, part:_ms.part, face:_ms.face, x:_ms.x, y:_ms.y, z:_ms.z, isDirect:true, melee:true };
      var res;
      try {
        res = applyDamage(t, dmg, w.def.penMM || 0, {
          armorProvider: function(part){ return (typeof getEnemyArmorMMForPart === 'function') ? getEnemyArmorMMForPart(t, part) : 0; }
        });
      } finally { window._hitCtx = _ctxP; }
      const shown = res.hpLost > 0 ? res.hpLost : res.armorLost;
      _float(t, '-' + shown + (isCrit ? '!' : ''), isCrit ? 'crit' : (res.hpLost > 0 ? '' : 'armor'), { hitWorldX:_ms.x, hitWorldY:_ms.y });
      if(t.hp <= 0 && !t._meleeKillLogged){
        t._meleeKillLogged = true;
        const _en = (typeof ENEMIES !== 'undefined' && ENEMIES[t.eid]) ? ENEMIES[t.eid].name : t.eid;
        const _wName = w.def ? w.def.name : (w.id || '武器');
        const _wCls = (typeof rarityClass === 'function') ? rarityClass(w.rarity || '一般') : '';
        if(typeof pushLog === 'function'){
          pushLog('<span class="pl">玩家</span> 用 <span class="' + _wCls + '">' + _wName + '</span> 擊殺 <b class="r-' + (t.rarity || '一般') + '">' + _en + '</b>', [], 'explore');
        }
      }
    }, _delay);
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

  let hr = (typeof getHitRate === 'function') ? getHitRate(w.def.type) : 30;
  if(!c.playerFirst) hr *= SECOND_HIT_RATE;

  _playFire(now, w.slot === 'primary');

  const mz = _getPlayerMuzzlePosFoot();
  const sm = c.sm;

  /* rev-weapon-core-firePlayer: 有口径（枪械）走统一武器核心。
   * 预判 + XY 偏移 + 轨迹碰撞。近战/投掷物仍走旧路径（近战接触判定、手雷抛物线）。 */
  if(w.def.cal && typeof window._weaponFire === 'function'){
    const _spdF = (typeof _ammoSpeedForCal === 'function') ? _ammoSpeedForCal(w.def.cal) : 800;
    const _fxElP = document.getElementById('combat-overlay');
    if(window.MuzzleFX) window.MuzzleFX.spawn(mz.x * (_fxElP? _fxElP.clientWidth : 400), mz.y * (_fxElP? _fxElP.clientHeight : 500), w.def.type === '機槍' ? 1.2 : 1.0, false, 'explore');
    const _burstCountF = (c._chainShots || 1);
    window._weaponFire({
      owner: c,
      weaponId: w.id,
      ammoId: (c._playerMag && c._playerMag.ammoRef) ? c._playerMag.ammoRef.id : null,
      target: t,
      startX: p.worldX,
      startY: 1.3,
      flightSpeed: _spdF,
      hr: hr,
      burstCount: _burstCountF,
      weaponRange: (typeof _rangeOfWeaponDef === 'function') ? _rangeOfWeaponDef(w.def) : 15,
      guidanceMode: 'none',
      onHit: function(hitX, hitY, tgt){
        if(!tgt || tgt.hp <= 0) return;
        const a2 = c._playerMag && c._playerMag.ammoRef;
        const r = _resolveSingleAttack({
          ammoId: a2 ? a2.id : null,
          ammoRarity: a2 ? a2.rarity : '一般',
          weaponRarity: w.rarity,
          penMM: a2 ? (a2.def.penMM || 0) : (w.def.penMM || 0),
          fallbackDmg: w.def.dmg || 20
        }, tgt);
        tgt.hp = Math.max(0, tgt.hp - r.hpLost);
        tgt.armor = Math.max(0, (tgt.armor || 0) - r.armorLost);
        const crit = r.crit;
        const shown = r.totalShown;
        _float(tgt, '-' + shown + (crit ? '!' : ''), crit ? 'crit' : (r.hpLost > 0 ? '' : 'armor'));
        if(tgt.hp > 0){
          const _hurtDurP = (typeof GAME_ANIMS !== 'undefined' && GAME_ANIMS.hurt) ? Math.round(GAME_ANIMS.hurt.frameCount / GAME_ANIMS.hurt.fps * 1000) : 500;
          tgt._hurtStart = performance.now();
          tgt._hurtUntil = performance.now() + _hurtDurP;
        }
        if(tgt.hp <= 0){
          const _en = (typeof ENEMIES !== 'undefined' && ENEMIES[tgt.eid]) ? ENEMIES[tgt.eid].name : tgt.eid;
          const _wName = (w && w.def) ? w.def.name : (w && w.id ? w.id : '武器');
          const _wCls = (typeof rarityClass === 'function') ? rarityClass(w.rarity || '一般') : '';
          if(typeof pushLog === 'function'){
            pushLog('<span class="pl">玩家</span> 用 <span class="' + _wCls + '">' + _wName + '</span> 擊殺 <b class="r-' + (tgt.rarity || '一般') + '">' + _en + '</b>', [], 'explore');
          }
        }
      }
    });
    return true;
  }

  /* 旧路径：投掷物（无口径）保留 c.bullets 抛物线逻辑 */
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
              if(p._isAmmoHandlerBox && p._ownerP) p._ownerP.primaryWeaponBoxCount = p.count;
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
    let hr = (typeof servantHitRate === 'function') ? servantHitRate(a.srv) : 20;
  if(!c.playerFirst) hr *= SECOND_HIT_RATE;

  const sm = c.sm;
  const mz = _getPassengerMuzzlePos(a);
  if(!mz) return;

  /* rev-weapon-core-firePassenger: 載員枪械走统一武器核心（预判 + AABB 偏移 + 轨迹碰撞） */
  if(def.cal && typeof window._weaponFire === 'function'){
    const _fxElA = document.getElementById('combat-overlay');
    if(window.MuzzleFX && mz) window.MuzzleFX.spawn(mz.x * (_fxElA? _fxElA.clientWidth : 400), mz.y * (_fxElA? _fxElA.clientHeight : 500), def.type === '機槍' ? 1.2 : 1.0, false, 'explore');

    window._weaponFire({
      owner: c,
      weaponId: w.id,
      ammoId: am.id,
      target: t,
      startX: a.worldX,
      startY: 1.3,
      flightSpeed: (typeof _ammoSpeedForCal === 'function') ? _ammoSpeedForCal(def.cal) : 500,
      hr: hr,
      burstCount: (a._chainShots || 1),
      weaponRange: (typeof _rangeOfWeaponDef === 'function') ? _rangeOfWeaponDef(def) : 15,
      guidanceMode: 'none',
      isEnemyBullet: false,
      onHit: function(hitX, hitY, tgt){
        if(!tgt || tgt.hp <= 0) return;
        const r = _resolveSingleAttack({
          ammoId: am.id,
          ammoRarity: am.rarity,
          weaponRarity: w.rarity,
          penMM: am.def.penMM || 0,
          fallbackDmg: w.def.dmg || 20
        }, tgt);
        tgt.hp = Math.max(0, tgt.hp - r.hpLost);
        tgt.armor = Math.max(0, (tgt.armor || 0) - r.armorLost);
        const crit = r.crit;
        const shown = r.totalShown;
        _float(tgt, '-' + shown + (crit ? '!' : ''), crit ? 'crit' : (r.hpLost > 0 ? '' : 'armor'), { hitWorldX: hitX, hitWorldY: hitY });
        if(tgt.hp > 0){
          const _hurtDurPs = (typeof GAME_ANIMS !== 'undefined' && GAME_ANIMS.hurt) ? Math.round(GAME_ANIMS.hurt.frameCount / GAME_ANIMS.hurt.fps * 1000) : 500;
          tgt._hurtStart = performance.now();
          tgt._hurtUntil = performance.now() + _hurtDurPs;
        }
        if(tgt.hp <= 0){
          const eName = (typeof ENEMIES !== 'undefined' && ENEMIES[tgt.eid]) ? ENEMIES[tgt.eid].name : tgt.eid;
          const _wName = (w && w.def) ? w.def.name : (w && w.id ? w.id : '武器');
          const _wCls = (typeof rarityClass === 'function') ? rarityClass(w.rarity || '一般') : '';
          if(typeof pushLog === 'function'){
            const _aRar = (a.srv && a.srv.rarity) ? a.srv.rarity : '一般';
            const _aCls = (typeof rarityClass === 'function') ? rarityClass(_aRar) : 'r-一般';
            pushLog('<span class="' + _aCls + '">' + (typeof servantLabel === 'function' ? servantLabel(a.srv) : '載員') + '</span> 用 <span class="' + _wCls + '">' + _wName + '</span> 擊殺 <b class="r-' + (tgt.rarity || '一般') + '">' + eName + '</b>', [], 'explore');
          }
          if(typeof servantAddExp === 'function') servantAddExp(a.srv, 3);
        }
      }
    });
    return;
  }
}


function _enemyFire(e, now){
  const c = window._combat;
  if(!c) return;
  if(e._reloadEnd && now < e._reloadEnd) return;
  const _btr = window.BTRSupport;
  const _btrProtect = (typeof window._isPlayerMounted === 'function' ? window._isPlayerMounted() : false);
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
/* rev-range-gate: 切槍後以實際武器射程重檢，超射程不開火 */
if(w){
  var _wdAct = (typeof WEAPONS !== 'undefined') ? WEAPONS[w.id] : null;
  var _rAct = _wdAct ? (_wdAct.slot === 'melee' ? 0.75 : _rangeOfWeaponDef(_wdAct)) : 8;
  if(!window.canEngage(_rAct, p, Math.abs(p.worldX - e.worldX))) return;
}
  if(!w) return;

  /* 近战分支 */
  if(_fireRes.melee){
    const _md = WEAPONS[w.id];
    if(!_md) return;
    /* rev-melee-geom: 命中改由接觸幀幾何判定（09 _meleeStrike）。
       舊版起手擲 0.55×MODE_ACCURACY 是與玩家近戰不同的第二套尺度。 */
    const _hrIdxM = Math.round((e.hitBase || 0.55) * 100 * (c.playerFirst ? SECOND_HIT_RATE : 1));
    e._fireAnimName = 'attack_melee';
    e._fireAnimStart = now;
    e._fireAnimUntil = now + ((typeof GAME_ANIMS !== "undefined" && GAME_ANIMS.attack_melee) ? Math.round(GAME_ANIMS.attack_melee.frameCount / GAME_ANIMS.attack_melee.fps * 1000) : 571);
    e._nextFireAt = now + Math.max(500, 60000 / (_md.rpm || 120));
    if(p.hp <= 0) return;
    setTimeout(function(){
      if(!window._combat || !window._combat.active || window._combat.resolved) return;
      if(!p || p.hp <= 0 || !e || e.hp <= 0) return;
      /* 接觸幀重檢射程 —— 起手在範圍內不代表 357ms 後仍在。
         舊版缺此檢查，即 [invisible-melee-kill] 遠距近戰擊倒的根因。 */
      if(Math.abs(p.worldX - e.worldX) > _rAct) return;
      var _msM = (typeof window._meleeStrike === 'function')
        ? window._meleeStrike(e.worldX, p, { weaponId:w.id, weaponType:'近戰', hr:_hrIdxM, range:_rAct })
        : null;
      if(!_msM) return;
      const _mdmg = Math.round((_md.dmg || 25) * (RARITY_MULT[e.rarity] || 1));
      const _mpen = _md.penMM || 3;
      var _ctxM = window._hitCtx;
      window._hitCtx = { target:p, part:_msM.part, face:_msM.face, x:_msM.x, y:_msM.y, z:_msM.z, isDirect:true, melee:true };
      try {
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
        }, p, { part: _msM.part });
        p.hp = Math.max(0, p.hp - r.hpLost);
        p.armor = Math.max(0, (p.armor || 0) - r.armorLost);
        if(p.isPlayer){
          state.player.hp = p.hp; state.player.armor = p.armor;
          _playHurt(performance.now());
          _float(p, '-' + (r.hpLost + r.armorLost), r.crit ? 'crit' : '', { hitWorldX:_msM.x, hitWorldY:_msM.y });
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
          _float(p, '-' + r.hpLost, '', { hitWorldX:_msM.x, hitWorldY:_msM.y });
          if(p.hp <= 0){
            p.hp = 0;
            p.srv.hp = 0;
            p.srv.injuredUntil = Date.now() + 4 * 3600 * 1000;
            p.srv._injuredDown = true;
            p._injuredDown = true;
            if(typeof pushLog === 'function'){
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
      } finally { window._hitCtx = _ctxM; }
    }, 357);
    return;
}

  /* 枪械射击 */
  /* rev-weapon-core-enemyFire: 枪械走统一武器核心（预判 + AABB 偏移 + 轨迹碰撞） */
  if(typeof window._weaponFire === 'function' && w && w.id && typeof WEAPONS !== 'undefined' && WEAPONS[w.id] && WEAPONS[w.id].cal){
    const _fpDefE = (typeof GAME_ANIMS !== 'undefined' && GAME_ANIMS.fire_primary) ? GAME_ANIMS.fire_primary : null;
    const _fpDurE2 = _fpDefE ? Math.round(_fpDefE.frameCount / _fpDefE.fps * 1000) : 250;
    e._fireAnimName = 'fire_primary';
    e._fireAnimStart = now;
    e._fireAnimUntil = now + _fpDurE2;

    const _effModeE2 = (typeof _getFireChainMode === 'function') ? _getFireChainMode(e) : '點射';
    /* rev-hr-pure-enemy: hr = 敵人熟練指數，與玩家 / 僕人同語義。
       模式係數已由 09 burstMult 表達，此處再乘是雙重計帳；
       p.isVehicle ? 0.25 是 3σ 飽和時代為逃離恆 100% 的症狀補丁 ——
       角散佈 + 真實輪廓 + face 權威後不再需要。 */
    const _hb2 = (e.hitBase || 0.55);
    const _hrE2 = Math.round(_hb2 * 100 * (c.playerFirst ? SECOND_HIT_RATE : 1));

    const _ammoIdE2 = (w && w.ammoId) ? w.ammoId : null;
    const _calE2 = WEAPONS[w.id].cal;
    const _spdE2 = (typeof _ammoSpeedForCal === 'function') ? _ammoSpeedForCal(_calE2) : 700;
    const _rpmXE2 = WEAPONS[w.id].rpm || 600;
    e._nextFireAt = now + Math.max(200, 60000 / _rpmXE2);

    const _fxElE2 = document.getElementById('combat-overlay');
    const _mzE2 = _getEnemyMuzzlePos(e, p);
    const _wTypeE2 = WEAPONS[w.id].type;
    if(window.MuzzleFX) window.MuzzleFX.spawn(_mzE2.x * (_fxElE2? _fxElE2.clientWidth : 400), _mzE2.y * (_fxElE2? _fxElE2.clientHeight : 500), _wTypeE2 === '機槍' ? 1.2 : 1.0, true, 'explore');

    const _wRarE2 = e.rarity || '一般';
    const _aRarE2 = (w.ammoId && typeof AMMO !== 'undefined' && AMMO[w.ammoId]) ? AMMO[w.ammoId].rarity : '一般';
    const _penMME2 = (w.ammoId && AMMO[w.ammoId] && AMMO[w.ammoId].penMM) || e.penMM || 0;

    window._weaponFire({
      owner: c,
      weaponId: w.id,
      ammoId: _ammoIdE2,
      target: p,
      startX: e.worldX,
      startY: 1.3,
      flightSpeed: _spdE2,
      hr: _hrE2,
      burstCount: (e._chainShots || 1),
      weaponRange: (typeof _rangeOfWeaponDef === 'function') ? _rangeOfWeaponDef(WEAPONS[w.id]) : 15,
      guidanceMode: 'none',
      isEnemyBullet: true,
   muzzleN: _mzE2,
   tracerColor: (typeof window._rarityBulletColor === "function") ? window._rarityBulletColor(_aRarE2) : "#ffb300",
      onHit: function(hitX, hitY, tgt){
        if(!tgt || tgt.hp <= 0) return;
        let dmgE2;
        if(w.ammoId && AMMO[w.ammoId]){
          const _ammoDefE2 = AMMO[w.ammoId];
          dmgE2 = Math.round(_ammoDefE2.dmg * (RARITY_MULT[_ammoDefE2.rarity] || 1));
        } else {
          dmgE2 = (w.dmg != null ? w.dmg : (e.dmg != null ? e.dmg : 10));
        }
        if(tgt.isVehicle){
          /* rev-crit-per-part: 暴擊改由 _vHitVehicle 逐部件擲，此處傳未加成 eff。 */
          if(typeof window._vHitVehicle === 'function'){
            const _eNameV2 = (typeof ENEMIES !== 'undefined' && ENEMIES[e.eid]) ? ENEMIES[e.eid].name : e.eid;
            const _wNameV2 = (w && w.id && WEAPONS[w.id]) ? WEAPONS[w.id].name : (w && w.id ? w.id : '武器');
            const _wRarV2 = (w && w.rarity) || '一般';
            const _wCalMM2 = (typeof window._calToMM === 'function') ? window._calToMM(WEAPONS[w.id].cal) : 7.62;
            window._vHitVehicle(tgt, dmgE2, _penMME2, w.ammoId || 'unknown', _eNameV2, _wNameV2, _wRarV2, e.rarity || '一般', _spdE2, _wCalMM2,
              { rate: calcCritRate(_wRarE2, _aRarE2), mult: calcCritMult(_wRarE2, _aRarE2) });
          }
          return;
        }
        if(tgt.isPlayer){
          const rE2 = _resolveSingleAttack({
            ammoId: w.ammoId || null,
            ammoRarity: _aRarE2,
            weaponRarity: _wRarE2,
            penMM: _penMME2,
            fallbackDmg: e.dmg || 10
          }, tgt);
          tgt.hp = Math.max(0, tgt.hp - rE2.hpLost);
          tgt.armor = Math.max(0, (tgt.armor || 0) - rE2.armorLost);
          state.player.hp = tgt.hp;
          state.player.armor = tgt.armor;
          _playHurt(performance.now());
          _float(tgt, '-' + (rE2.hpLost + rE2.armorLost), rE2.crit ? 'crit' : '', { hitWorldX: hitX, hitWorldY: hitY });
          if(tgt.hp <= 0 && !c._playerKiller){
            var _eNameK2 = (typeof ENEMIES !== 'undefined' && ENEMIES[e.eid]) ? ENEMIES[e.eid].name : e.eid;
            var _wNameK2 = (w && w.id && WEAPONS[w.id]) ? WEAPONS[w.id].name : (w && w.id ? w.id : '武器');
            c._playerKiller = { name: _eNameK2, weapon: _wNameK2, wRarity: (w && w.rarity) || e.rarity || '一般', aRarity: e.rarity || '一般' };
          }
          if(tgt.hp <= 0){
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
        if(tgt.isPassenger && tgt.srv){
          const rE3 = _resolveSingleAttack({
            ammoId: w.ammoId || null,
            ammoRarity: _aRarE2,
            weaponRarity: _wRarE2,
            penMM: _penMME2,
            fallbackDmg: e.dmg || 10
          }, tgt);
          tgt.hp = Math.max(0, tgt.hp - rE3.hpLost);
          tgt.armor = Math.max(0, (tgt.armor || 0) - rE3.armorLost);
          if(tgt.hp <= 0){
            tgt.hp = 0;
            tgt.srv.hp = 0;
            tgt.srv.injuredUntil = Date.now() + 4 * 3600 * 1000;
            tgt.srv._injuredDown = true;
            tgt._injuredDown = true;
            if(typeof pushLog === 'function'){
              const _eNameCK2 = (typeof ENEMIES !== 'undefined' && ENEMIES[e.eid]) ? ENEMIES[e.eid].name : e.eid;
              const _eClsCK2 = (typeof rarityClass === 'function') ? rarityClass(e.rarity || '一般') : '';
              const _wNameCK2 = (w && w.id && WEAPONS[w.id]) ? WEAPONS[w.id].name : (w && w.id ? w.id : '武器');
              const _wClsCK2 = (typeof rarityClass === 'function') ? rarityClass((w && w.rarity) || e.rarity || '一般') : '';
              const _sClsK2 = (typeof rarityClass === 'function') ? rarityClass(tgt.srv.rarity || '一般') : '';
              const _sNameK2 = (typeof servantLabel === 'function') ? servantLabel(tgt.srv) : '載員';
              pushLog('<span class="' + _sClsK2 + '">' + _sNameK2 + '</span> 被 <span class="' + _eClsCK2 + '">' + _eNameCK2 + '</span> 用 <span class="' + _wClsCK2 + '">' + _wNameCK2 + '</span> <span class="lose">擊倒</span>', [], 'explore');
            }
          }
          _float(tgt, '-' + rE3.hpLost, '', { hitWorldX: hitX, hitWorldY: hitY });
        }
      }
/* rev-combatfix: 曳光由引擎統一推送, 场景層不再重複 push */
    });
    return;
  }

  /* 旧路径（非口径武器，实际不可达） */
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
  /* rev-hr-pure-enemy: 同 A 路徑（舊非口徑備援）。 */
  const _hb = (e.hitBase || 0.55);
  const hc = _hb * (c.playerFirst ? SECOND_HIT_RATE : 1);
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
        /* rev-crit-per-part: 同上，傳未加成 eff ＋ critSpec。 */
        if(typeof window._vHitVehicle === 'function'){
          const _eNameV = (typeof ENEMIES !== 'undefined' && ENEMIES[e.eid]) ? ENEMIES[e.eid].name : e.eid;
          const _wNameV = (w && w.id && typeof WEAPONS !== 'undefined' && WEAPONS[w.id]) ? WEAPONS[w.id].name : (w && w.id ? w.id : '武器');
          const _wRarV = (w && w.rarity) || '一般';
          /* rev-arena: 传弹速与口径 */
          var _speedV = (_wdX && _wdX.cal && typeof _ammoSpeedForCal === 'function') ? _ammoSpeedForCal(_wdX.cal) : 700;
          var _calV = (_wdX && _wdX.cal) ? _calToMM(_wdX.cal) : 7.62;
          window._vHitVehicle(p, dmg, penMM, w.ammoId || 'unknown', _eNameV, _wNameV, _wRarV, e.rarity || '一般', _speedV, _calV,
            { rate: calcCritRate(_wRarE, _aRarE), mult: calcCritMult(_wRarE, _aRarE) });
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
/* rev-box3d: RPG 等濺射改走統一覆蓋引擎（總量 = baseDmg × splashRatio，不變；
   分配改為逐面逐帶角度覆蓋，不再單點隨機部位） */
function _applySplashDamage(mainTarget, mainTargetWorldX, nearbyList, baseDmg, opts){
if(!nearbyList || !nearbyList.length) return;
opts = opts || {};
var maxR = (typeof opts.maxR === 'number') ? opts.maxR : 8;
/* rev-log-unify: 全部呼叫端已傳 ammoId（含 wrapper 間接，實測零例外）→ 只走破片射線。
   帶模式 fallback（blastPen×falloff / splashRatio 預算）已刪。 */
var spec = (opts.ammoId && typeof window._ammoFrag === 'function') ? window._ammoFrag(opts.ammoId) : null;
if(!spec) return;
var ctx = window._hitCtx;
var _bpDirect = !!(ctx && ctx.isDirect && typeof ctx.x === 'number' && typeof ctx.y === 'number');
var P = _bpDirect
? { x: ctx.x, y: ctx.y, z: (typeof ctx.z === 'number') ? ctx.z : 0 }
: { x: mainTargetWorldX,
    y: (typeof opts.burstHeight === 'number') ? opts.burstHeight : 0,
    z: (typeof opts.impactZ === 'number') ? opts.impactZ : ((ctx && typeof ctx.z === 'number') ? ctx.z : 0) };
for(var i = 0; i < nearbyList.length; i++){
var tgt = nearbyList[i].target;
if(!tgt || tgt === mainTarget || tgt.hp <= 0) continue;
var ap = opts.armorProviderFn ? opts.armorProviderFn(tgt) : null;
var proxy = { hp: tgt.hp || 0, armor: tgt.armor || 0 };
var _o = {
maxR: maxR,
applyBand: function(part, dmg, pen){ return applyDamage(proxy, dmg, pen, ap ? { part:part, armorProvider:ap } : { part:part }); }
};
if(spec){
_o.fragments = spec.frags; _o.fragEff = spec.eff; _o.pen = spec.pen;
_o.chargeKg = (typeof window._blastChargeKg === 'function') ? window._blastChargeKg(opts.ammoId) : 0;
_o.applyBlast = function(d){ proxy.hp = Math.max(0, Math.round(proxy.hp - d)); };
if(opts.crit) _o.crit = opts.crit;
}
var res = window._applyExplosionToBox(tgt, P, _o);
tgt.hp = proxy.hp; tgt.armor = proxy.armor;
if(res && (res.hpLost > 0 || res.armorLost > 0) && opts.onHit) opts.onHit(tgt, res.hpLost, res.armorLost);
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
  
  /* rev-weapon-core-enemyFireRPG: RPG 走统一武器核心（一次性预判 + AABB 偏移 + 轨迹碰撞） */
  if(typeof window._weaponFire === 'function'){
    /* rev-rpg-tier: 發射器與彈頭分離 —— id／穿深／彈速／口徑查彈藥表；
   發射器稀有度決定暴率，彈頭稀有度決定暴傷與基礎傷害（走 _calcAttackDamage）。 */
const _wIdR2 = e.rpgWeaponId || 'rpg27';
const _aIdR2 = e.rpgAmmoId || 'pg27';
const _aDefR2 = (typeof AMMO !== 'undefined' && AMMO[_aIdR2]) ? AMMO[_aIdR2] : null;
const rarR2 = e.rpgRarity || e.rarity || '一般';
const aRarR2 = _aDefR2 ? (_aDefR2.rarity || '一般') : rarR2;
const dmgR2 = _aDefR2 ? Math.round((_aDefR2.dmg || 100) * (RARITY_MULT[aRarR2] || 1)) : (e.rpgDmg || Math.round(100 * (RARITY_MULT[rarR2] || 1)));
const penMMR2 = (typeof e.rpgPenMM === 'number' && e.rpgPenMM > 0) ? e.rpgPenMM : (_aDefR2 ? (_aDefR2.penMM || 0) : 600);
const spdR2 = (_aDefR2 && _aDefR2.speed) ? _aDefR2.speed : window._rpg27Spd();
const calR2 = (_aDefR2 && _aDefR2.caliberMM) ? _aDefR2.caliberMM : window._rpg27Cal();
const _wNameR2 = (typeof WEAPONS !== 'undefined' && WEAPONS[_wIdR2] && WEAPONS[_wIdR2].name) ? WEAPONS[_wIdR2].name : 'RPG';
    const hrR2 = Math.round((e.hitBase || 0.6) * 100);
    window._weaponFire({
      owner: c,
      weaponId: _wIdR2,
      ammoId: _aIdR2,
      target: p,
      startX: e.worldX,
      startY: 1.3,
      flightSpeed: spdR2,
      hr: hrR2,
      burstCount: 1,
      weaponRange: 150,
isRPG: true,
isEnemyBullet: true,
/* rev-rpgfix */
onMiss: function(impactX, impactY, impactZ){
window._rpgGroundBurst(c, e, rarR2, impactX, impactZ, aRarR2, _aIdR2);
},
      guidanceMode: 'none',
      onHit: function(hitX, hitY, tgt){
/* rev-combatfix: RPG 直擊爆炸特效, 與射失 _rpgGroundBurst 對稱 */
try {
/* rev-rpgfx-canvas: 爆炸像素讀畫布邏輯尺寸（battle-fx 是 500 高的錯誤來源） */
var _fxR = (c && c.playerCanvas) ? c.playerCanvas : document.getElementById("combat-overlay");
var _WR = (typeof window._fxViewW === 'function') ? window._fxViewW(_fxR) : (_fxR ? _fxR.clientWidth : 400);
var _HR = (typeof window._fxViewH === 'function') ? window._fxViewH(_fxR) : (_fxR ? _fxR.clientHeight : 500);
var _p0R = c.allies[0] ? c.allies[0].worldX : 0;
var _hrR = (typeof EXPLORE_HERO_X_RATIO === "number") ? EXPLORE_HERO_X_RATIO : 0.25;
var _sxR = _hrR + (hitX - _p0R) / c.sm.screenRightWorld * (1 - _hrR);
var _syR = 0.95 - hitY * ((typeof CHAR_HEIGHT_FACTOR === "number" ? CHAR_HEIGHT_FACTOR : 0.58) / (typeof PLAYER_HEIGHT_M === "number" ? PLAYER_HEIGHT_M : 1.7));
var _doRpgFx = function(){
if(!(_sxR >= 0 && _sxR <= 1)) return;
if(!c.explosions) return;
var _stR = c.explosions.length;
if(typeof window._spawnRPGImpactFx === 'function') window._spawnRPGImpactFx(c, _sxR * _WR, _syR * _HR, _WR * 0.18, !!(tgt && tgt.isVehicle));
if(typeof window._applyWorldAnchor === 'function') window._applyWorldAnchor(c, _stR, _p0R, c.sm, tgt || null);
};
/* rev-fx-aps-order: 攔截成功不該出現裝甲命中爆炸 → 載具目標先判定再繪製。
   彈著螢幕位置沿用既有 0.25 妥協（砲管外伸，實繪車體不在判定盒前緣）。 */
if(!(tgt && tgt.isVehicle)) _doRpgFx();
} catch(e){}

        if(!tgt || tgt.hp <= 0) return;
        /* rev-rpg-tier: 統一走 _calcAttackDamage —— base=AMMO.dmg×彈藥稀有度倍率，
   暴率讀發射器稀有度、暴傷讀彈頭稀有度（與步槍同一條公式）。 */
const _dmgCalcR2 = (typeof _calcAttackDamage === 'function')
  ? _calcAttackDamage({ ammoId: _aIdR2, ammoRarity: aRarR2, weaponRarity: rarR2, penMM: penMMR2, fallbackDmg: dmgR2 })
  : { baseDmg: dmgR2, crit: false, penMM: penMMR2 };
const critR2 = !!_dmgCalcR2.crit;
const baseDmgR2 = _dmgCalcR2.baseDmg;

        if(tgt.isVehicle){
          if(typeof window._vHitVehicle === 'function'){
            const _eNameR2 = (typeof ENEMIES !== 'undefined' && ENEMIES[e.eid]) ? ENEMIES[e.eid].name : e.eid;
            var _vResR2 = window._vHitVehicle(tgt, baseDmgR2, penMMR2, _aIdR2, _eNameR2, _wNameR2, rarR2, e.rarity || '一般', spdR2, calR2);
if(!(_vResR2 && _vResR2.intercepted) && typeof _doRpgFx === 'function') _doRpgFx();
          }
        }
        if(tgt.isPlayer){
          const resR2 = applyDamage({ hp: tgt.hp, armor: tgt.armor }, baseDmgR2, penMMR2, {
            armorProvider: function(part){ return (typeof getPlayerArmorMMForPart === 'function') ? getPlayerArmorMMForPart(part) : 0; }
          });
          tgt.hp = Math.max(0, tgt.hp - resR2.hpLost);
          tgt.armor = Math.max(0, tgt.armor - resR2.armorLost);
          state.player.hp = tgt.hp;
          state.player.armor = tgt.armor;
          _playHurt(performance.now());
          if(tgt.hp <= 0 && !c._playerKiller){
            var _eNameK2R = (typeof ENEMIES !== 'undefined' && ENEMIES[e.eid]) ? ENEMIES[e.eid].name : e.eid;
            c._playerKiller = { name: _eNameK2R, weapon: _wNameR2, wRarity: rarR2 || '一般', aRarity: aRarR2 };
          }
          _float(tgt, '-' + (resR2.hpLost + resR2.armorLost), critR2 ? 'crit' : '', { hitWorldX: hitX, hitWorldY: hitY });
          if(tgt.hp <= 0){
            state.player.hp = 0;
            state.player.deadUntil = Date.now() + 60000;
            if(window._explore){
              window._explore.mode = 'dead';
              window._explore.deadUntil = performance.now() + 60000;
              window._explore.combatEvent = null;
            }
            if(typeof window._playHeroDeath === 'function') window._playHeroDeath();
          }
          if(tgt.hp <= 0 && typeof _evac === 'function' && !(window._explore && window._explore.evacuatingPassengers)){
            try { _evac(); } catch(e){}
          }
        } else if(tgt.isPassenger && tgt.srv){
          const resR3 = applyDamage({ hp: tgt.hp, armor: tgt.armor }, baseDmgR2, penMMR2, {
            armorProvider: function(part){ return (typeof getPassengerArmorMMForPart === 'function') ? getPassengerArmorMMForPart(tgt, part) : 0; }
          });
          tgt.hp = Math.max(0, tgt.hp - resR3.hpLost);
          tgt.armor = Math.max(0, tgt.armor - resR3.armorLost);
          if(tgt.hp <= 0){
            tgt.hp = 0;
            if(tgt.srv){ tgt.srv.hp = 0; tgt.srv.injuredUntil = Date.now() + 4 * 3600 * 1000; tgt.srv._injuredDown = true; }
            tgt._injuredDown = true;
            if(typeof pushLog === 'function'){
              const _eNameR2b = (typeof ENEMIES !== 'undefined' && ENEMIES[e.eid]) ? ENEMIES[e.eid].name : e.eid;
              const _wClsR2 = (typeof rarityClass === 'function') ? rarityClass(rarR2 || '一般') : '';
              const _eClsR2 = (typeof rarityClass === 'function') ? rarityClass(e.rarity || '一般') : '';
              const _sRarR2 = (tgt.srv && tgt.srv.rarity) ? tgt.srv.rarity : '一般';
              const _sClsR2 = (typeof rarityClass === 'function') ? rarityClass(_sRarR2) : '';
              const _sNameR2 = (typeof servantLabel === 'function' ? servantLabel(tgt.srv) : '載員');
              pushLog('<span class="' + _sClsR2 + '">' + _sNameR2 + '</span> 被 <span class="' + _eClsR2 + '">' + _eNameR2b + '</span> 用 <span class="' + _wClsR2 + '">' + _wNameR2 + '</span> <span class="lose">擊倒</span>', [], 'explore');
            }
          }
          _float(tgt, '-' + resR3.hpLost, critR2 ? 'crit' : '');
        }

        /* rev-splash-area-enemyRPG: 溅射以落点 hitX 为圆心 */
        const _nearbyR2 = [];
        for(let iR = 0; iR < c.allies.length; iR++){
          const aR = c.allies[iR];
          if(aR === tgt) continue;
          if(aR.hp <= 0) continue;
          if(aR.isVehicle) continue;
          if(aR._retreating) continue;
          _nearbyR2.push({ target: aR, worldX: aR.worldX });
        }
        _applySplashDamage(tgt, hitX, _nearbyR2, baseDmgR2, {
          maxR: 8, ammoId: _aIdR2,
          crit: { rate: calcCritRate(rarR2, aRarR2), mult: calcCritMult(rarR2, aRarR2) },
          armorProviderFn: function(tgA){
            if(tgA.isPlayer){
              return function(part){ return (typeof getPlayerArmorMMForPart === 'function') ? getPlayerArmorMMForPart(part) : 0; };
            }
            if(tgA.isPassenger && tgA.srv){
              return (function(_aA){ return function(part){ return (typeof getPassengerArmorMMForPart === 'function') ? getPassengerArmorMMForPart(_aA, part) : 0; }; })(tgA);
            }
            return null;
          },
          onHit: function(tgS, hpLostS, armorLostS){
            const _shownS = hpLostS > 0 ? hpLostS : armorLostS;
            if(tgS.isPlayer){
              state.player.hp = tgS.hp;
              state.player.armor = tgS.armor;
              _playHurt(performance.now());
              if(tgS.hp <= 0 && !c._playerKiller){
                var _eNameKS2 = (typeof ENEMIES !== 'undefined' && ENEMIES[e.eid]) ? ENEMIES[e.eid].name : e.eid;
                c._playerKiller = { name: _eNameKS2, weapon: _wNameR2, wRarity: rarR2 || '一般', aRarity: aRarR2 };
              }
              if(tgS.hp <= 0){
                state.player.hp = 0;
                state.player.deadUntil = Date.now() + 60000;
                if(window._explore){ window._explore.mode = 'dead'; window._explore.deadUntil = performance.now() + 60000; window._explore.combatEvent = null; }
                if(typeof window._playHeroDeath === 'function') window._playHeroDeath();
              }
              if(tgS.hp <= 0 && typeof _evac === 'function' && !(window._explore && window._explore.evacuatingPassengers)){
                try { _evac(); } catch(e){}
              }
            }
            if(tgS.isPassenger && tgS.hp <= 0 && tgS.srv){
              tgS.srv.hp = 0;
              tgS.srv.injuredUntil = Date.now() + 4 * 3600 * 1000;
              tgS._retreating = true;
              tgS._injuredDown = true;
              if(typeof pushLog === 'function'){
                const _eNameSP2 = (typeof ENEMIES !== 'undefined' && ENEMIES[e.eid]) ? ENEMIES[e.eid].name : e.eid;
                const _eClsSP2 = (typeof rarityClass === 'function') ? rarityClass(e.rarity || '一般') : '';
                const _sRarSP2 = (tgS.srv && tgS.srv.rarity) ? tgS.srv.rarity : '一般';
                const _sClsSP2 = (typeof rarityClass === 'function') ? rarityClass(_sRarSP2) : '';
                const _sNameSP2 = (typeof servantLabel === 'function' ? servantLabel(tgS.srv) : '載員');
                const _wClsSP2 = (typeof rarityClass === 'function') ? rarityClass(rarR2 || '一般') : '';
                pushLog('<span class="' + _sClsSP2 + '">' + _sNameSP2 + '</span> 被 <span class="' + _eClsSP2 + '">' + _eNameSP2 + '</span> 用 <span class="' + _wClsSP2 + '">' + _wNameR2 + '</span> <span class="lose">擊倒</span>', [], 'explore');
              }
            }
            _float(tgS, '-' + _shownS, hpLostS > 0 ? '' : 'armor');
          }
        });
      }
    });
    return;
  }
}



/* rev-frag-rays: 破片命中率由立體角給出，不再需要把「N×eff×hr」壓回
   合理量級的平衡旋鈕；該常數與其 export 已刪（刪除時實測零讀取者）。 */
/* ===== rev-grenade-fuze:start ===== */
/* 投擲精度決定「雷落在哪」，不再決定「傷害乘多少」。
   舊制 throwDist 用精確預測距離、hit:true 寫死 → 拋物線必達預測點，
   hitRate 唯一作用是結算時的傷害乘數。此處把 hr 移到釋放速度誤差上：
   距離誤差 → _calcGrenadeParams 重算 vx/vy/T → 整條彈道與落點一致偏移。
   σ_rel = 0.30·(1−hr)（工程預設：hr60 → 12% 距離誤差）。

   引信決定爆點，不是破片數：
     impact（RGO/RGN/VOG-17/VOG-25）—— 沿彈道求首個與目標相交的時刻，
       在該接觸點引爆；未接觸則落地點。瞬爆的優勢由幾何湧現：
       接觸時目標張開近半空間，命中率趨近 40~50%；地面 2m 外只有 0.8%。
     delay（F-1/RGD-5）—— 落地點引爆（無滾動模型）。
   舊 allFragmentsOnSingle 是「無法表達接觸引爆」的補償旗標，一併刪除。
   接觸判定用 _onHit 時目標當前位置（與投擲預測同樣假設飛行中目標近似靜止）。 */
function _grenadeThrowDist(dist, hr){
  var h = Math.min(0.95, Math.max(0.05, (typeof hr === 'number') ? hr : 0.5));
  var sig = 0.30*(1-h);
  var g = (typeof _gaussRand === 'function') ? _gaussRand() : 0;
  return Math.max(0.3, dist*(1 + g*sig));
}
function _grenadeBurstPoint(gDef, startX, dir, params, H0, target, landX){
  var land = { x:landX, y:0, z:0 };
  if(!gDef || gDef.fuze !== 'impact' || !target) return land;
  var box = (typeof window._getTargetBox === 'function') ? window._getTargetBox(target) : null;
  if(!box || !params) return land;
  var twx = (typeof target.worldX === 'number') ? target.worldX : 0;
  var x0 = twx-box.L/2, x1 = twx+box.L/2;
  var foot = (typeof box.yFoot === 'number') ? box.yFoot : 0;
  var G = (typeof GRENADE_G === 'number') ? GRENADE_G : 9.81;
  var STEPS = 48;
  for(var i=1;i<=STEPS;i++){
    var t = params.T*i/STEPS;
    var x = startX + dir*params.vx*t;
    var y = H0 + params.vy*t - 0.5*G*t*t;
    if(y < foot || y > foot+box.H) continue;
    if(x < x0 || x > x1) continue;
    return { x:x, y:y, z:0 };
  }
  return land;
}
/* ===== rev-grenade-fuze:end ===== */
function _applyGrenadeToTargets(targets, gDef, gRar, hitRate, penMM, armorProviderFn, centerWorldX, casualtyRadius, burstPt){
  if(typeof centerWorldX !== 'number' || !isFinite(centerWorldX)) return [];
  /* rev-frag-rays: 破片 = 徑向射線組。
     N 來自公開破片數，eff 沿用既有 fragmentDamage（單片對無甲軀幹的抽象值，
     與 AMMO.dmg 同語義）。hitRate 不再乘傷害 —— 它已在投擲端決定彈道；
     GRENADE_SPLASH_RATIO / allFragmentsOnSingle 兩個補償旋鈕一併廢除。 */
  var N = gDef.fragments || 1;
  var fragDmg = gDef.fragmentDamage || gDef.dmg || 0;
  var eff = fragDmg * (RARITY_MULT[gRar] || 1);
  var radius = (typeof casualtyRadius === 'number' && casualtyRadius > 0) ? casualtyRadius : 10;
  if(!(N > 0) || !(eff > 0)) return [];
  var P = (burstPt && typeof burstPt.x === 'number') ? burstPt : { x:centerWorldX, y:0, z:0 };
  var critRate = (typeof calcCritRate === 'function') ? calcCritRate(gRar, gRar) : 0.1;
  var critMult = (typeof calcCritMult === 'function') ? calcCritMult(gRar, gRar) : 1.5;
  var results = [];
  for(var i = 0; i < targets.length; i++){
    var t = targets[i];
    if(!t || t.hp <= 0 || typeof t.worldX !== 'number') continue;
    var box = window._getTargetBox(t);
    if(!box) continue;
    var x1 = t.worldX - box.L/2, x2 = t.worldX + box.L/2;
    var ddx = (P.x < x1) ? (x1 - P.x) : ((P.x > x2) ? (P.x - x2) : 0);
    if(ddx >= radius) continue;
    if(t.isVehicle){
      if(typeof window._vApplyExplosionToVehicle === 'function'){
        var vres = window._vApplyExplosionToVehicle(t, P, {
          fragments:N, fragEff:eff, maxR:radius,
          crit:{ rate:critRate, mult:critMult },
          penFor:function(){ return penMM || 0; },
          ammoId:'frag', attackerName:'手榴彈', weaponName:gDef.name || '手榴彈',
          weaponRarity:gRar, attackerRarity:gRar
        });
        /* rev-frag-display: 讀實際造成的傷害，不是帶的分配份額；
           部件損傷歸 hpLost（舊版一律塞 armorLost → 炸毀部件顯示成灰字）。 */
        var vHp = (vres && vres.hpLost) || 0;
        var vAr = (vres && vres.armorLost) || 0;
        results.push({ target:t, hits:(vHp > 0 || vAr > 0) ? 1 : 0,
          hpLost:Math.round(vHp), armorLost:Math.round(vAr), crit:false });
      }
      continue;
    }
    var ap = armorProviderFn ? armorProviderFn(t) : null;
    var proxy = { hp:t.hp, armor:t.armor || 0 };
    var res = window._applyExplosionToBox(t, P, {
      fragments:N, fragEff:eff, maxR:radius, pen:penMM || 0,
      crit:{ rate:critRate, mult:critMult },
      chargeKg: (typeof window._blastChargeKg === 'function') ? window._blastChargeKg(gDef) : 0,
      applyBlast: function(d){ proxy.hp = Math.max(0, Math.round(proxy.hp - d)); },
      applyBand:function(part, dmg, pen, R){
        return applyDamage(proxy, dmg, pen, ap ? { part:part, armorProvider:ap } : { part:part });
      }
    });
    t.hp = proxy.hp; t.armor = proxy.armor;
    var hpL = res ? res.hpLost : 0, arL = res ? res.armorLost : 0;
    results.push({ target:t, hits:(hpL > 0 || arL > 0) ? 1 : 0, hpLost:hpL, armorLost:arL, crit:false });
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
function _getPlayerHandPos(animName,frameIdx){
var R=window.PuppetRig,cv=document.getElementById('hero-canvas');
var W=(cv&&cv.clientWidth)?cv.clientWidth:400,H=(cv&&cv.clientHeight)?cv.clientHeight:500;
if(!R||!W||!H)return{x:EXPLORE_HERO_X_RATIO+0.04,y:0.5};
var s=(H*CHAR_HEIGHT_FACTOR)/386;
var an=(animName==='death')?'dead':(animName||((typeof heroAnim!=='undefined')?heroAnim.name:'idle'));
var fi=(typeof frameIdx==='number')?frameIdx:((typeof heroAnim!=='undefined')?heroAnim.frame:0);
var p=R.hand(an,fi,false);
return{x:(W*EXPLORE_HERO_X_RATIO+s*(p.x-200))/W,y:(H*0.95+s*(p.y-515))/H};}
function _handYToH0(handPosY){
  const normAboveGround = Math.max(0.05, 0.95 - handPosY);
  return normAboveGround * (PLAYER_HEIGHT_M / CHAR_HEIGHT_FACTOR);
}

/* rev-fix-grenade-on-enemies: 玩家/載員投雷打敵人的公共結算（原本兩個 _onHit 完全重複）
 * ownerInfo: {cls, name} —— 擊殺時日誌用；null 表示玩家
 * onKill: 可選回調，載員投雷用於 servantAddExp */
function _resolveGrenadeOnEnemies(c, gDef, gRar, hitRate, wRarity, ownerInfo, onKill, centerWorldX, casualtyRadius, burstPt){
  if(!c) return;
  const targets = c.enemies.filter(function(en){ return en.hp > 0; });
  const results = _applyGrenadeToTargets(targets, gDef, gRar, hitRate, gDef.penMM || 0, function(en){
    return function(part){
      return (typeof getEnemyArmorMMForPart === 'function') ? getEnemyArmorMMForPart(en, part) : 0;
    };
  }, centerWorldX, casualtyRadius, burstPt);
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
/* rev-eqslot: 投擲時手上是手雷（由彈體繪製），不畫槍 */
if(typeof heroAnim !== 'undefined'){ heroAnim.eqSlot = 'hidden'; heroAnim.healItem = null; }

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
  /* rev-throw-predict: 投掷预判 —— 先用当前距离估算飞行时间 T，再用 T 预测目标未来位置 */
  const _tvxP = (typeof t._vx === 'number') ? t._vx : 0;
  const _firstDistP = Math.max(0.01, Math.abs(t.worldX - worldStartX));
  const _firstParamsP = _calcGrenadeParams(_firstDistP, w.id, H0);
  const _flightTP = _firstParamsP ? _firstParamsP.T : 1.5;
  const _predictXP = t.worldX + _tvxP * _flightTP;
  const hitRate = getHitRate(gDef.type) / 100;
  const throwDist = _grenadeThrowDist(Math.abs(_predictXP - worldStartX), hitRate);
  const dirSign = (_predictXP >= worldStartX) ? 1 : -1;

  const params = _calcGrenadeParams(throwDist, w.id, H0);
  if(!params) return;

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
      var _bp = _grenadeBurstPoint(gDef, worldStartX, dirSign, params, H0, t, _landX);
      _resolveGrenadeOnEnemies(c, gDef, gRar, hitRate, w.rarity, null, null, _landX, _cr, _bp);
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
  /* rev-throw-predict: 载员投掷预判 */
  const _tvxAP = (typeof t._vx === 'number') ? t._vx : 0;
  const _firstDistAP = Math.max(0.01, Math.abs(t.worldX - worldStartX));
  const _firstParamsAP = _calcGrenadeParams(_firstDistAP, gid, H0);
  const _flightTAP = _firstParamsAP ? _firstParamsAP.T : 1.5;
  const _predictXAP = t.worldX + _tvxAP * _flightTAP;
  const hitRate = ((typeof servantHitRate === 'function') ? servantHitRate(a.srv) : 30) / 100;
  const throwDist = _grenadeThrowDist(Math.abs(_predictXAP - worldStartX), hitRate);
  const dirSign = (_predictXAP >= worldStartX) ? 1 : -1;

  const params = _calcGrenadeParams(throwDist, gid, H0);
  if(!params) return;

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
        worldStartX + dirSign * params.vx * params.T, _cr,
        _grenadeBurstPoint(gDef, worldStartX, dirSign, params, H0, t, worldStartX + dirSign * params.vx * params.T));
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
  /* rev-throw-predict: 敌人投掷预判（玩家/载员 _vx 当前未维护，退化为当前位置） */
  const _tvxEP = (typeof p._vx === 'number') ? p._vx : 0;
  const _firstDistEP = Math.max(0.01, Math.abs(p.worldX - worldStartX));
  const _firstParamsEP = _calcGrenadeParams(_firstDistEP, gid, H0);
  const _flightTEP = _firstParamsEP ? _firstParamsEP.T : 1.5;
  const _predictXEP = p.worldX + _tvxEP * _flightTEP;
  const hitRate = e.hitBase || 0.55;
  const throwDist = _grenadeThrowDist(Math.abs(_predictXEP - worldStartX), hitRate);
  const dirSign = (_predictXEP >= worldStartX) ? 1 : -1;
  const params = _calcGrenadeParams(throwDist, gid, H0);
  if(!params) return;

  const gRar = e.grenade.rarity || '一般';

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
      }, worldStartX + dirSign * params.vx * params.T, _cr,
        _grenadeBurstPoint(gDef, worldStartX, dirSign, params, H0, p, worldStartX + dirSign * params.vx * params.T));
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
  if(!c.rpgSmoke) c.rpgSmoke = [];
  
  for(let i = c.bullets.length - 1; i >= 0; i--){
    const b = c.bullets[i];
    
    if(b.start && b.duration){
      b.t = (now - b.start) / b.duration;
    } else {
      b.t += dt * 5;
    }
    
    
    if(b.t >= 1){
      if(!b.resolved){
        b.resolved = true;
        /* rev-fix-fx-world-crop: 爆炸落点以世界坐标为准，超出屏幕范围不生成。
         * 手雷：worldStartX + vx*T 反推落点世界坐标。
         * RPG：bullet 携带 _absWorldX。
         * 不 clamp 到屏幕内——世界坐标映射后 sxN ∉ [0,1] 天然不生成。 */
        if(b.isGrenade){
          /* rev-grenade-only-burst: RPG 已走統一武器核心，c.bullets 不再有 isRPG（舊分支不可達，刪除） */
          var _finalWX = null;
          if(typeof b.worldStartX === 'number' && typeof b.vx === 'number' && b.T > 0){
            var _dirG = (b.dir === -1) ? -1 : 1;
            _finalWX = b.worldStartX + _dirG * b.vx * b.T;
          }
          if(_finalWX !== null){
            var _cvBG = c.playerCanvas || document.getElementById('combat-overlay');
            var _WG = (typeof window._fxViewW === 'function') ? window._fxViewW(_cvBG) : (_cvBG ? _cvBG.clientWidth : 400);
            var _HG = (typeof window._fxViewH === 'function') ? window._fxViewH(_cvBG) : (_cvBG ? _cvBG.clientHeight : 500);
            var _px0 = c.allies[0] ? c.allies[0].worldX : 0;
            var _relWX = _finalWX - _px0;
            var _smC = c.sm || { screenRightWorld: 2 };
            var _sxN = EXPLORE_HERO_X_RATIO + (_relWX / _smC.screenRightWorld) * (1 - EXPLORE_HERO_X_RATIO);
            if(_sxN >= 0 && _sxN <= 1){
              var _explX = _sxN * _WG;
              var _explY = _HG * 0.95;
              var _radG = (c.sm && c.sm.bgPixelsPerMeter) ? (4.5 * c.sm.bgPixelsPerMeter) : _WG * 0.08;
              if(typeof _spawnExplosionSmoke === 'function') _spawnExplosionSmoke(c, _explX, _explY, _radG);
              if(typeof window._applyWorldAnchor === 'function') window._applyWorldAnchor(c, 0, _px0, c.sm);
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

  /* rev-smoke-plow: 命中平面犁過尾煙（物理見 00 _plowTrailSmoke） */
if(typeof window._plowTrailSmoke === 'function') window._plowTrailSmoke(c, dt);
for(let k = c.rpgSmoke.length - 1; k >= 0; k--){
const _sp = c.rpgSmoke[k];
_sp.age += dt;
/* rev-smoke-rise: 熱浮力 —— 煙團緩慢上升（世界米） */
if(typeof _sp._wy === 'number' && typeof _sp.vy === 'number') _sp._wy += _sp.vy * dt;
const _lfA = (typeof _sp.life === 'number' && _sp.life > 0) ? _sp.life : 1.2;
if(_sp.age > _lfA) c.rpgSmoke.splice(k, 1);
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
  /* rev-weapon-core: 新武器子弹碰撞与制导 */
  if(typeof window._tickWeaponBullets === 'function'){
    window._tickWeaponBullets(c, dt, c.enemies);
window._tickWeaponBullets(c, dt, c.allies);
  }
}
function _float(t, text, cls, opts){
  var c = window._combat;
  if(!c) return;
  var sm = c.sm;
  /* rev-float-canvas: 火花像素讀畫布邏輯尺寸；飄字正規化座標不變 */
  var _cvF = c.playerCanvas || document.getElementById('combat-overlay');
  var W = (typeof window._fxViewW === 'function') ? window._fxViewW(_cvF) : (_cvF ? _cvF.clientWidth : 400);
  var H = (typeof window._fxViewH === 'function') ? window._fxViewH(_cvF) : (_cvF ? _cvF.clientHeight : 500);
  /* rev-spark-bullet-only: 命中火花只屬於子彈命中。
     RPG 直擊 / 破片 / 手雷不畫 —— 它們有自己的爆炸特效。
     近戰無 _hitCtx → 保留火花。判定只用既有資料，不新增欄位。 */
  var _hcS = window._hitCtx;
  var _noSpark = !!(_hcS && (_hcS.isDirect === false || (_hcS.bullet && (_hcS.bullet.isRPG || _hcS.bullet.isGrenade))));
  /* rev-float-hitpos: opts.hitWorldX/Y 提供真實落點時，按世界座標映射螢幕位置 */
  if(opts && typeof opts.hitWorldX === 'number' && typeof opts.hitWorldY === 'number'){
    /* rev-float-passenger-screenx: 載員用其實際 screenX，其它用世界映射 */
    var sxRawH;
    if(t && t.isPassenger && t.srv){
      var _pfArrH = (window._explore && window._explore.passengersFollowing) || [];
      var _foundH = false;
      for(var _iH = 0; _iH < _pfArrH.length; _iH++){
        if(_pfArrH[_iH].srv && t.srv && _pfArrH[_iH].srv.id === t.srv.id){ sxRawH = _pfArrH[_iH].screenX; _foundH = true; break; }
      }
      if(!_foundH){
        var _p0hA = (c.allies && c.allies[0]) ? c.allies[0].worldX : 0;
        sxRawH = EXPLORE_HERO_X_RATIO + ((opts.hitWorldX - _p0hA) / sm.screenRightWorld) * (1 - EXPLORE_HERO_X_RATIO);
      }
    } else {
      var _p0hB = (c.allies && c.allies[0]) ? c.allies[0].worldX : 0;
      sxRawH = EXPLORE_HERO_X_RATIO + ((opts.hitWorldX - _p0hB) / sm.screenRightWorld) * (1 - EXPLORE_HERO_X_RATIO);
    }
    var _chf = (typeof CHAR_HEIGHT_FACTOR === 'number') ? CHAR_HEIGHT_FACTOR : 0.58;
    var _phm = (typeof PLAYER_HEIGHT_M === 'number') ? PLAYER_HEIGHT_M : 1.7;
    var _syN = 0.95 - opts.hitWorldY * (_chf / _phm);
    if(_syN < 0.02) _syN = 0.02;
    if(_syN > 0.98) _syN = 0.98;
    if(!_noSpark && cls !== 'miss' && cls !== 'heal' && typeof window._spawnHitSpark === 'function'){
      window._spawnHitSpark(c, sxRawH * W, _syN * H, cls === 'crit', cls, !!(t && t.isPassenger), t);
    }
    var _floatXH = Math.max(0.05, Math.min(0.95, sxRawH));
    c.floats.push({ text: text, cls: cls || '', age: 0, x: _floatXH, y: 0.12, _top: !!(t && t.isPassenger) });
    return;
  }
  var sxRaw;
  if(t && t.isPlayer){ sxRaw = EXPLORE_HERO_X_RATIO; }
  else if(t && t.isPassenger && t.srv){
    var _pfArr = (window._explore && window._explore.passengersFollowing) || [];
    var _foundP = false;
    for(var i = 0; i < _pfArr.length; i++){
      if(_pfArr[i].srv && t.srv && _pfArr[i].srv.id === t.srv.id){ sxRaw = _pfArr[i].screenX; _foundP = true; break; }
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
  var _b = window._lastBullet;
  var sparkYN = 0.6;
  if(_b && typeof _b.ty === 'number' && !_b.isGrenade){ sparkYN = _b.ty; }
  if(!_noSpark && cls !== 'miss' && cls !== 'heal' && typeof window._spawnHitSpark === 'function'){
    window._spawnHitSpark(c, sxRaw * W, sparkYN * H, cls === 'crit', cls, !!(t && t.isPassenger), t);
  }
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
  const W = window._fxViewW(c.playerCanvas), H = window._fxViewH(c.playerCanvas);
  ctx.clearRect(0, 0, W, H);
  if(ctxTop) ctxTop.clearRect(0, 0, W, H);

  const px = c.allies[0] ? c.allies[0].worldX : 0;
  const sm = c.sm;
  const _renderNow = performance.now();

  for(let i = 0; i < c.enemies.length; i++){
    const e = c.enemies[i];
    if(e.isBoss) continue;
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
            _startCorpses([e], [e.worldX - _px], window._getEnemyEvent(e));
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

    const _aw=(e.hasRPG&&e.rpgAmmo>0)?{id:'rpg',slot:'primary'}:_pmActiveWeapon(e);
 const pwId=_aw?_aw.id:null;
 const pwSlot=_aw?_aw.slot:null;
 const eq={head:e.helmet||null,top:e.body||null};
 if(pwSlot)eq[pwSlot]=pwId;
 const eqR={head:e.rarity||'一般',top:e.rarity||'一般'};
 if(typeof _raidDrawHuman !== 'function') continue;
    ctx.save();
    try { (window.drawHumanSprite || _raidDrawHuman)(ctx, sx, fy, eh / 386, eq, eqR, animName, frame, pwSlot, 'enemy', true, false, null); } catch(err){}
    ctx.restore();
  }

  if(typeof window._renderTrailSmoke === 'function') window._renderTrailSmoke(ctx, c, W, H);
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
      rarity: bb.rarity, rpg: !!bb.isRPG, big: !!bb.big,
      isGrenade: !!bb.isGrenade, grenadeId: bb.grenadeId, t: bb.t
    });
  }

  /* rev-combatfix: 新核心 RPG 火箭本體, 尾煙由引擎生成 */
/* rev-missile-icon-render: 導彈/火箭以真實 icon 繪製（正確比例/出膛/飛行）；
   9m14 保留車體裁切視覺；煙由統一世界沉積負責。 */
if(typeof window._getWeaponBullets === 'function'){
  /* rev-missile-emerge: 導彈/火箭以真實 icon 繪製。
     鼻端錨定 + 炮口半平面裁切 → 出膛時從不可見到完整出現；
     首幀把前幀位置播種為炮口投影，掃描段與畫面求交（非中心點裁切），
     高速一幀穿屏也畫得出完整抹影。9m14 保留車體裁切視覺。 */
  var _wbR = window._getWeaponBullets(c);
  var _epm = (c.sm && c.sm.bgPixelsPerMeter ? c.sm.bgPixelsPerMeter : (H * 0.58 / 1.7)) * (455.74 / 386);
  var _hrR2 = (typeof EXPLORE_HERO_X_RATIO === 'number') ? EXPLORE_HERO_X_RATIO : 0.25;
  var _chfR2 = (typeof CHAR_HEIGHT_FACTOR === 'number') ? CHAR_HEIGHT_FACTOR : 0.58;
  var _phmR2 = (typeof PLAYER_HEIGHT_M === 'number') ? PLAYER_HEIGHT_M : 1.7;
  var _srwR2 = (c.sm && c.sm.screenRightWorld) || 2;
  var _p0R2 = c.allies[0] ? c.allies[0].worldX : 0;
  var _nowR2 = performance.now();
  var _kxR2 = (1 - _hrR2) / _srwR2, _kyR2 = _chfR2 / _phmR2;
  for(var _wiR = 0; _wiR < _wbR.length; _wiR++){
    var _wb = _wbR[_wiR];
    if(!_wb || _wb._resolved) continue;
    var _mv = (window.MISSILE_VISUAL && _wb.ammoId) ? window.MISSILE_VISUAL[_wb.ammoId] : null;
    if(!_mv || !_mv.icon || _wb.ammoId === '9m14') continue;
    if(!(_wb.flightTimeSec > 0) || !isFinite(_wb.startX) || !isFinite(_wb.impactX)) continue;
    var _prR = Math.min(1, ((_nowR2 - _wb.startTime) / 1000) / _wb.flightTimeSec);
    var _wxR = _wb.startX + (_wb.impactX - _wb.startX) * _prR;
    var _wyR = _wb.startY + (_wb.impactY - _wb.startY) * _prR;
    var _px = (_hrR2 + (_wxR - _p0R2) * _kxR2) * W;
    var _py = (0.95 - _wyR * _kyR2) * H;
    var _mx = (_hrR2 + (_wb.startX - _p0R2) * _kxR2) * W;
    var _my = (0.95 - _wb.startY * _kyR2) * H;
    var _lenPx = (_mv.len || 0.9) * _epm;
    if(typeof _wb._mvPrevX !== 'number'){ _wb._mvPrevX = _mx; _wb._mvPrevY = _my; }
    var _pvX = _wb._mvPrevX, _pvY = _wb._mvPrevY;
    _wb._mvPrevX = _px; _wb._mvPrevY = _py;
    var _dx = _px - _pvX, _dy = _py - _pvY;
    var _dirRad;
    if(_dx * _dx + _dy * _dy > 0.25){ _dirRad = Math.atan2(_dy, _dx); }
    else {
      var _bx = (_hrR2 + (_wb.impactX - _p0R2) * _kxR2) * W;
      var _by = (0.95 - _wb.impactY * _kyR2) * H;
      _dirRad = Math.atan2(_by - _my, _bx - _mx);
    }
    var _pad = _lenPx + 40;
    if((_px < -_pad && _pvX < -_pad) || (_px > W + _pad && _pvX > W + _pad) ||
       (_py < -_pad && _pvY < -_pad) || (_py > H + _pad && _pvY > H + _pad)) continue;
    var _ctxR2 = (_wb.target && _wb.target.isPassenger && ctxTop) ? ctxTop : ctx;
    var _dist = Math.sqrt(_dx * _dx + _dy * _dy);
    var _n = Math.max(1, Math.min(10, Math.ceil(_dist / Math.max(1, _lenPx * 0.45))));
    _ctxR2.save();
    if(typeof window._vsClipAtMuzzle === 'function') window._vsClipAtMuzzle(_ctxR2, _mx, _my, _dirRad);
    for(var _s = 0; _s < _n; _s++){
      var _t = (_n === 1) ? 1 : (_s + 1) / _n;
      window._drawMissileIcon(_ctxR2, _wb.ammoId, _pvX + _dx * _t, _pvY + _dy * _t,
        _dirRad + Math.PI / 2, _lenPx, (_n === 1 ? 1 : 0.55), true);
    }
    _ctxR2.restore();
  }
}
for(let f = 0; f < c.floats.length; f++){
    const ff = c.floats[f];
    const _ctxF = (ff._top && ctxTop) ? ctxTop : ctx;
    _ctxF.save();
    _ctxF.fillStyle = ff.cls === 'crit' ? '#ff3030' : (ff.cls === 'miss' ? '#a89a85' : (ff.cls === 'armor' ? '#5ab0ff' : (ff.cls === 'heal' ? '#4caf50' : '#ffb300')));
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
if(c.sweep){ if(layerR) layerR.innerHTML = ''; if(layerL) layerL.innerHTML = ''; return; }
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
      if(e.isBoss) continue;
const d = Math.abs(e.worldX - px);
      /* rev-detect: 氣泡 = 已發現（dist <= R_敵人）且 螢幕外。
         不可用 _isDiscovered 的 OR —— 那是參戰名單。
         傳奇敵 R=45：60m 處牠發現你但你沒發現牠 -> 有子彈、無氣泡（隱蔽機制）。 */
      const _eR = (typeof ENEMY_DETECTABLE_R !== 'undefined' && ENEMY_DETECTABLE_R[e.rarity]) ? ENEMY_DETECTABLE_R[e.rarity] : 225;
      if(d > _eR) continue;
      const _srwB = (c.sm && c.sm.screenRightWorld) ? c.sm.screenRightWorld : 2;
      const _sxB = EXPLORE_HERO_X_RATIO + ((e.worldX - px) / _srwB) * (1 - EXPLORE_HERO_X_RATIO);
      if(_sxB >= -0.02 && _sxB <= 1.02) continue;
      const rc = {'破舊':'#b87333','一般':'#e0e0e0','庫存':'#4caf50','精品':'#2196f3','傳奇':'#ffb300'}[e.rarity] || '#e0e0e0';
      const arc = Math.round(Math.max(0, e.hp / e.maxHp) * 360);
      const dTxt = (typeof window._fmtDistN === 'function' ? window._fmtDistN(d) : (d < 1 ? d.toFixed(1) : String(Math.round(d))));
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
      if(item.screenX >= -0.05) return false;
      /* rev-detect: 左側載員氣泡同樣受 R_載員 約束 */
      var _sR = (typeof SERVANT_DETECTABLE_R !== 'undefined') ? SERVANT_DETECTABLE_R : 80;
      var _srwS = (c.sm && c.sm.screenRightWorld) ? c.sm.screenRightWorld : 2;
      var _dS = (typeof item.worldX === 'number') ? Math.abs(item.worldX - px) : Math.abs((item.screenX - EXPLORE_HERO_X_RATIO) * _srwS / (1 - EXPLORE_HERO_X_RATIO));
      return _dS <= _sR;
    });
    let html = '';
    for(let j = 0; j < outside.length; j++){
      const item = outside[j];
      const d = Math.abs((typeof item.worldX === 'number' ? item.worldX : px) - px);
      const dTxt = (typeof window._fmtDistN === 'function' ? window._fmtDistN(d) : (d < 1 ? d.toFixed(1) : String(Math.round(d))));
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
  /* rev-player-autonomy: 玩家前進只由玩家自身狀態與自身射程內敵人決定；載員是隨從，不拖停玩家 */
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








/* ============================================================
   rev-rpgfix: 敵 RPG 射失落地引爆 —— 統一爆炸引擎 + 完整倒地結算
   落點 (impactX, 0, impactZ)，預算 = 直擊傷 × 0.35 × 0.6（射失 0.6 慣例）
   步兵逐帶覆蓋；載具走 _vApplyExplosionToVehicle（破片不觸發 Arena）
   ============================================================ */
window._rpgGroundBurst = function(c, e, rarR, impactX, impactZ, aRar, ammoId){
/* rev-frag-explosion: 射失落地爆 = 破片射線組，彈頭物理查 AMMO_FRAG。
   舊制 baseDmg × 0.35 × 0.6 兩個硬編常數已廢 —— 破片數與單片傷害是彈頭屬性，
   命中率由立體角給出；射失已反映在落點上，不再額外打折。
   暴率讀發射器稀有度、暴傷讀彈頭稀有度（與步槍同一條公式），逐片擲。 */
aRar = aRar || rarR;
if(!c || !c.allies) return;
var spec = (typeof window._ammoFrag === 'function') ? window._ammoFrag(ammoId) : null;
if(!spec) return;
var P = { x: impactX, y: 0, z: (typeof impactZ === 'number') ? impactZ : 0 };
try {
var _cvG = c.playerCanvas || document.getElementById('combat-overlay');
var W = (typeof window._fxViewW === 'function') ? window._fxViewW(_cvG) : (_cvG ? _cvG.clientWidth : 400);
var H = (typeof window._fxViewH === 'function') ? window._fxViewH(_cvG) : (_cvG ? _cvG.clientHeight : 500);
var p0 = c.allies[0] ? c.allies[0].worldX : 0;
var sm = c.sm || { screenRightWorld: 2 };
var hr = (typeof EXPLORE_HERO_X_RATIO === 'number') ? EXPLORE_HERO_X_RATIO : 0.25;
var sxN = hr + ((impactX - p0) / (sm.screenRightWorld || 2)) * (1 - hr);
if(sxN >= 0 && sxN <= 1){
var st = c.explosions ? c.explosions.length : 0;
if(typeof window._spawnRPGImpactFx === 'function') window._spawnRPGImpactFx(c, sxN * W, H * 0.95, W * 0.18);
if(typeof window._applyWorldAnchor === 'function') window._applyWorldAnchor(c, st, p0, sm);
}
} catch(err){}
var eName = (typeof ENEMIES !== 'undefined' && e && ENEMIES[e.eid]) ? ENEMIES[e.eid].name : (e ? e.eid : '???');
var _wIdG = (e && e.rpgWeaponId) ? e.rpgWeaponId : 'rpg27';
var _wNameG = (typeof WEAPONS !== 'undefined' && WEAPONS[_wIdG] && WEAPONS[_wIdG].name) ? WEAPONS[_wIdG].name : 'RPG';
var _crit = {
  rate: (typeof calcCritRate === 'function') ? calcCritRate(rarR, aRar) : 0.1,
  mult: (typeof calcCritMult === 'function') ? calcCritMult(rarR, aRar) : 1.5
};
for(var i = 0; i < c.allies.length; i++){
var a = c.allies[i];
if(!a || a.hp <= 0 || a._retreating) continue;
if(a.isVehicle){
if(typeof window._vApplyExplosionToVehicle === 'function'){
window._vApplyExplosionToVehicle(a, P, {
fragments: spec.frags, fragEff: spec.eff, maxR: 8, crit: _crit,
penFor: function(){ return spec.pen; },
ammoId: 'frag', attackerName: eName, weaponName: 'RPG',
weaponRarity: rarR || '一般', attackerRarity: (e && e.rarity) || '一般'
});
}
continue;
}
var ap = (typeof window._armorProviderFor === 'function') ? window._armorProviderFor(a) : null;
var proxy = { hp: a.hp || 0, armor: a.armor || 0 };
var res = (typeof window._applyExplosionToBox === 'function') ? window._applyExplosionToBox(a, P, {
fragments: spec.frags, fragEff: spec.eff, pen: spec.pen, maxR: 8, crit: _crit,
chargeKg: (typeof window._blastChargeKg === 'function') ? window._blastChargeKg(ammoId) : 0,
applyBlast: function(d){ proxy.hp = Math.max(0, Math.round(proxy.hp - d)); },
applyBand: function(part, dmg, pen){ return applyDamage(proxy, dmg, pen, ap ? { part:part, armorProvider:ap } : { part:part }); }
}) : null;
if(!res || (res.hpLost <= 0 && res.armorLost <= 0)) continue;
a.hp = proxy.hp; a.armor = proxy.armor;
var shown = res.hpLost > 0 ? res.hpLost : res.armorLost;
if(a.isPlayer){
state.player.hp = a.hp;
state.player.armor = a.armor;
if(typeof _playHurt === 'function') _playHurt(performance.now());
if(a.hp <= 0 && !c._playerKiller){
c._playerKiller = { name: eName, weapon: _wNameG, wRarity: rarR || '一般', aRarity: aRar || '一般' };
}
if(a.hp <= 0){
state.player.hp = 0;
state.player.deadUntil = Date.now() + 60000;
if(window._explore){
window._explore.mode = 'dead';
window._explore.deadUntil = performance.now() + 60000;
window._explore.combatEvent = null;
}
if(typeof window._playHeroDeath === 'function') window._playHeroDeath();
if(typeof _evac === 'function' && !(window._explore && window._explore.evacuatingPassengers)){
try { _evac(); } catch(err2){}
}
}
} else if(a.isPassenger && a.hp <= 0 && a.srv){
a.hp = 0;
a.srv.hp = 0;
a.srv.injuredUntil = Date.now() + 4 * 3600 * 1000;
a.srv._injuredDown = true;
a._injuredDown = true;
a._retreating = true;
if(typeof pushLog === 'function'){
var eCls = (typeof rarityClass === 'function') ? rarityClass((e && e.rarity) || '一般') : '';
var sCls = (typeof rarityClass === 'function') ? rarityClass(a.srv.rarity || '一般') : '';
var sName = (typeof servantLabel === 'function') ? servantLabel(a.srv) : '載員';
var wCls = (typeof rarityClass === 'function') ? rarityClass(rarR || '一般') : '';
pushLog('<span class="' + sCls + '">' + sName + '</span> 被 <span class="' + eCls + '">' + eName + '</span> 用 <span class="' + wCls + '">' + _wNameG + '</span> <span class="lose">擊倒</span>', [], 'explore');
}
}
if(typeof _float === 'function') _float(a, '-' + shown, res.hpLost > 0 ? '' : 'armor');
}
};
/* ===== PM: 活體武器（渲染與槍口共用 _enemyActiveWeapon） ===== */
function _pmActiveWeapon(e){if(!e)return null;
var w=(typeof _enemyActiveWeapon==='function')?_enemyActiveWeapon(e)
:(e._activeWeapon||e.primaryWeapon||e.secondaryWeapon||e.melee);
if(!w||!w.id)return null;
var sl=(e.primaryWeapon&&e.primaryWeapon.id===w.id)?'primary'
:((e.secondaryWeapon&&e.secondaryWeapon.id===w.id)?'secondary':'melee');
return{id:w.id,slot:sl};}

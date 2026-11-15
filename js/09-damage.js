'use strict';

const HIT_PART_WEIGHTS = [
  { part:'head',  pct:15 },
  { part:'face',  pct:15 },
  { part:'top',   pct:40 },
  { part:'other', pct:30 }
];

function rollHitPart(){
  var r = Math.random() * 100;
  for(var i = 0; i < HIT_PART_WEIGHTS.length; i++){
    r -= HIT_PART_WEIGHTS[i].pct;
    if(r <= 0) return HIT_PART_WEIGHTS[i].part;
  }
  return 'other';
}

function getPlayerArmorMMForPart(part){
  if(part === 'head' || part === 'face'){
    var id = state.player.equipped.head;
    if(!id) return 0;
    return armorMMForSlot(id, part);
  }
  if(part === 'top'){
    var id2 = state.player.equipped.top;
    if(!id2) return 0;
    return armorMMForSlot(id2, 'top');
  }
  return 0;
}

function getEnemyArmorMMForPart(enemy, part){
  if(!enemy) return 0;
  if(part === 'head' || part === 'face'){
    if(!enemy.helmet) return 0;
    return armorMMForSlot(enemy.helmet, part);
  }
  if(part === 'top'){
    if(!enemy.body) return 0;
    return armorMMForSlot(enemy.body, 'top');
  }
  return 0;
}

function getPassengerArmorMMForPart(passenger, part){
  var eq = passenger && passenger.equipData;
  if(!eq) return 0;
  if(part === 'head' || part === 'face'){
    if(!eq.head) return 0;
    var hid = typeof eq.head === 'object' ? eq.head.id : eq.head;
    return armorMMForSlot(hid, part);
  }
  if(part === 'top'){
    if(!eq.top) return 0;
    var tid = typeof eq.top === 'object' ? eq.top.id : eq.top;
    return armorMMForSlot(tid, 'top');
  }
  return 0;
}

function applyDamage(target, rawDmg, penetration, armorOpts){
  let armorLevel = 0, armorMMOverride = null, armorProvider = null;
  if(armorOpts && typeof armorOpts === 'object'){
    armorProvider = armorOpts.armorProvider || null;
    armorMMOverride = (armorOpts.armorMMOverride != null) ? armorOpts.armorMMOverride : null;
    armorLevel = armorOpts.armorLevel || 0;
  } else {
    armorLevel = armorOpts || 0;
  }

  if(rawDmg == null || isNaN(rawDmg) || !isFinite(rawDmg)) rawDmg = 0;
  if(penetration == null || isNaN(penetration) || !isFinite(penetration)) penetration = 0;
  if(isNaN(armorLevel) || !isFinite(armorLevel)) armorLevel = 0;

  const result = {armorLost:0, hpLost:0, finalDmg:0, overkill:false, part:null};
  const pool = Math.max(0, Math.round(target.armor || 0));

  let armorMM = null;
  if(armorProvider){
    const part = rollHitPart();
    result.part = part;
    const mm = armorProvider(part);
    if(mm != null && isFinite(mm)) armorMM = mm;
  } else if(armorMMOverride !== null){
    armorMM = armorMMOverride;
  }

  let armorMMVal = null;
  if(armorMM !== null){
    if(armorMM <= 0 || pool <= 0){
      const hpDmg = Math.round(rawDmg * 1.2);
      target.hp = Math.max(0, Math.round((target.hp || 0) - hpDmg));
      result.hpLost = hpDmg;
      result.finalDmg = hpDmg;
      result.overkill = true;
      return result;
    }
    armorMMVal = armorMM;
  } else {
    if(pool <= 0){
      const hpDmg = Math.round(rawDmg * 1.2);
      target.hp = Math.max(0, Math.round((target.hp || 0) - hpDmg));
      result.hpLost = hpDmg;
      result.finalDmg = hpDmg;
      result.overkill = true;
      return result;
    }
    armorMMVal = ARMOR_LEVEL_TO_MM[armorLevel] || 1;
  }

  const pen = penetration || 0;
  const diff = pen - armorMMVal;

  if(diff >= 0){
    const armorDmg = Math.round(rawDmg);
    const hpDmg = pen > 0 ? Math.round(rawDmg * (diff / pen)) : 0;
    const armorLost = Math.min(pool, armorDmg);
    target.armor = Math.max(0, pool - armorLost);
    target.hp = Math.max(0, Math.round((target.hp || 0) - hpDmg));
    result.armorLost = armorLost;
    result.hpLost = hpDmg;
    result.finalDmg = hpDmg;
    if((target.armor || 0) <= 0) result.overkill = true;
  } else {
    const armorDmg = pen > 0 ? Math.round(rawDmg * (pen / armorMMVal)) : 0;
    const armorLost = Math.min(pool, armorDmg);
    target.armor = Math.max(0, pool - armorLost);
    result.armorLost = armorLost;
    result.finalDmg = armorLost;
  }
  return result;
}

/* rev-fix-armor-provider-unify: 統一按單位類型選部位護甲 */
window._armorProviderFor = function(tgt){
  if(!tgt) return function(){ return 0; };
  if(tgt.isGuard){
    return function(part){
      if(part === 'head' || part === 'face'){ const h = tgt.equipped && tgt.equipped.head; return h ? armorMMForSlot(h, part) : 0; }
      if(part === 'top'){ const t = tgt.equipped && tgt.equipped.top; return t ? armorMMForSlot(t, 'top') : 0; }
      return 0;
    };
  }
  if(tgt.isPlayer) return function(part){ return (typeof getPlayerArmorMMForPart === 'function') ? getPlayerArmorMMForPart(part) : 0; };
  if(tgt.isPassenger) return function(part){ return (typeof getPassengerArmorMMForPart === 'function') ? getPassengerArmorMMForPart(tgt, part) : 0; };
  return function(part){ return (typeof getEnemyArmorMMForPart === 'function') ? getEnemyArmorMMForPart(tgt, part) : 0; };
};


/* ============================================================
 * rev-weapon-core: 統一武器發射核心
 * 所有場景（步戰/載具戰/Boss戰/後院）走同一套發射 → 飛行 → 碰撞 → 結算
 * 場景層只負責調用 _weaponFire 與 _tickWeaponBullets
 * ============================================================ */

const _weaponBulletStore = new WeakMap();
function _wbsGet(owner){
  if(!_weaponBulletStore.has(owner)) _weaponBulletStore.set(owner, []);
  return _weaponBulletStore.get(owner);
}

/* 目標 AABB（寬×高，centerY 相對腳底） */
window._getTargetAABB = function(tgt){
  if(!tgt) return null;
  if(tgt._aabbOverride) return tgt._aabbOverride;
  if(tgt.isVehicle){
    return (typeof window.getVehicleAABB === 'function')
      ? window.getVehicleAABB(tgt.vehicleId)
      : { width: 6.0, height: 2.5, centerY: 1.25 };
  }
  return { width: 0.5, height: 1.7, centerY: 0.85 };
};

/* 瞄準點 Y（目標局部座標，腳底=0） */
window._getWeaponAimY = function(weaponId, ammoId, vid){
  if(ammoId && typeof AMMO !== 'undefined' && AMMO[ammoId] && typeof AMMO[ammoId].aimY === 'number'){
    return AMMO[ammoId].aimY;
  }
  if(weaponId && typeof WEAPONS !== 'undefined' && WEAPONS[weaponId] && typeof WEAPONS[weaponId].aimY === 'number'){
    return WEAPONS[weaponId].aimY;
  }
  if(weaponId && typeof window.getVehicleWeaponAimY === 'function'){
    return window.getVehicleWeaponAimY(weaponId);
  }
  return 0.85;
};

/* 連發累積係數 */
window._getWeaponBurstFactor = function(weaponId, vid){
  if(weaponId && typeof WEAPONS !== 'undefined' && WEAPONS[weaponId] && typeof WEAPONS[weaponId].burstFactor === 'number'){
    return WEAPONS[weaponId].burstFactor;
  }
  if(weaponId && vid && typeof window.getVehicleWeaponBurst === 'function'){
    return window.getVehicleWeaponBurst(vid, weaponId);
  }
  return 0.08;
};

/* 標準正態隨機（Box-Muller，clip 3σ） */
function _gaussRand(){
  var u = 0, v = 0;
  while(u === 0) u = Math.random();
  while(v === 0) v = Math.random();
  var g = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  return Math.max(-3, Math.min(3, g));
}

/* XY 偏移（米）— AABB 基準 + 正態分布
 * 保證「落點落在目標 AABB 內的概率 ≈ hr」
 * sigmaX = W / (2 × z)，z = Φ⁻¹((1 + hr)/2)
 * 濺射武器（無具體 targetAABB）退化為均勻分布，用 weaponRange 推算 fallback */
window._calcWeaponScatter = function(weaponRange, hr, burstCount, burstFactor, targetAABB){
  var hrN = Math.min(0.99, Math.max(0.01, (hr || 50) / 100));
  /* z = Φ⁻¹((1 + hr)/2) 分檔近似 */
  var z;
  if(hrN < 0.10) z = 0.126;
  else if(hrN < 0.20) z = 0.253;
  else if(hrN < 0.30) z = 0.385;
  else if(hrN < 0.40) z = 0.524;
  else if(hrN < 0.50) z = 0.674;
  else if(hrN < 0.60) z = 0.842;
  else if(hrN < 0.70) z = 1.036;
  else if(hrN < 0.80) z = 1.282;
  else if(hrN < 0.90) z = 1.645;
  else z = 2.326;

  var accumCap = (burstFactor || 0) * 10;
  var accum = Math.min(1 + ((burstCount || 1) - 1) * (burstFactor || 0), 1 + accumCap);

  if(targetAABB && targetAABB.width && targetAABB.height){
    var sigmaX = targetAABB.width / (2 * z);
    var sigmaY = targetAABB.height / (2 * z);
    var sx = _gaussRand() * sigmaX;
    var sy = _gaussRand() * sigmaY * accum;
    return { sx: sx, sy: sy, baseScatter: sigmaX, accum: accum };
  }
  /* 濺射武器 / 無 AABB：退回舊公式（以射程為基準） */
  var baseScatter = (weaponRange || 15) * (1 - hrN) / 2;
  var sx2 = (Math.random() * 2 - 1) * baseScatter;
  var sy2 = (Math.random() * 2 - 1) * baseScatter * accum;
  return { sx: sx2, sy: sy2, baseScatter: baseScatter, accum: accum };
};

/* 預判點 */
window._predictTargetPoint = function(tgtWorldX, tgtVx, flightSec){
  return (tgtWorldX || 0) + (tgtVx || 0) * (flightSec || 0);
};

/* 發射一次 */
window._weaponFire = function(cfg){
  if(!cfg || !cfg.owner || !cfg.target) return null;
  var _t = cfg.target;
  var _twx = (typeof cfg.targetWorldX === 'number') ? cfg.targetWorldX : (_t.worldX || 0);
  var _tvx = (typeof cfg.targetVx === 'number') ? cfg.targetVx : (_t._vx || 0);
  var _ty  = (typeof cfg.targetY === 'number') ? cfg.targetY : (_t.y || 0);

  var _dist = Math.abs(_twx - (cfg.startX || 0));
  var _spd  = cfg.flightSpeed || 800;
  var _flightSec = Math.max(0.016, _dist / _spd);

  var _predictX = window._predictTargetPoint(_twx, _tvx, _flightSec);

  var _bf = (typeof cfg.burstFactor === 'number') ? cfg.burstFactor : window._getWeaponBurstFactor(cfg.weaponId, cfg.vid);
  var _aabb = window._getTargetAABB(_t);
  var _scat = window._calcWeaponScatter(cfg.weaponRange || 15, cfg.hr || 50, cfg.burstCount || 1, _bf, _aabb);

  var _aimYLocal = (typeof cfg.aimY === 'number') ? cfg.aimY : window._getWeaponAimY(cfg.weaponId, cfg.ammoId, cfg.vid);
  var _impactX = _predictX + _scat.sx;
  var _impactY = _ty + _aimYLocal + _scat.sy;

  var _bullet = {
    owner: cfg.owner,
    weaponId: cfg.weaponId,
    ammoId: cfg.ammoId,
    isGrenade: !!cfg.isGrenade,

    startX: cfg.startX || 0,
    startY: (typeof cfg.startY === 'number') ? cfg.startY : 1.5,
    impactX: _impactX,
    impactY: _impactY,
    flightTimeSec: _flightSec,
    startTime: performance.now(),

    targetSnapshotX: _twx,
    targetSnapshotVx: _tvx,
    targetSnapshotY: _ty,

    guidanceMode: cfg.guidanceMode || 'none',
    guidanceUpdateMs: cfg.guidanceUpdateMs || 0,
    lastGuidanceAt: performance.now(),

    hr: cfg.hr || 50,
    burstCount: cfg.burstCount || 1,
    burstFactor: _bf,
    weaponRange: cfg.weaponRange || 15,
    flightSpeed: _spd,

    target: _t,
    targetAABB: _aabb,

    onHit: cfg.onHit,
    onMiss: cfg.onMiss,
    onTracer: cfg.onTracer || null,
    isEnemyBullet: !!cfg.isEnemyBullet,

    _resolved: false,
    _hitDetected: false
  };

  _wbsGet(cfg.owner).push(_bullet);
  return _bullet;
};

/* 制導更新（無線指令 / 激光駕束） */
window._updateGuidedBullet = function(b, now){
  if(!b || b._resolved || b.guidanceMode === 'none') return;
  if(!b.guidanceUpdateMs) return;
  if(now - b.lastGuidanceAt < b.guidanceUpdateMs) return;
  var _t = b.target;
  if(!_t || _t.hp <= 0) return;
  b.lastGuidanceAt = now;

  var _elapsed = (now - b.startTime) / 1000;
  var _remain = Math.max(0, b.flightTimeSec - _elapsed);

  var _curVx = (typeof _t._vx === 'number') ? _t._vx : b.targetSnapshotVx;
  var _predictX = window._predictTargetPoint(_t.worldX, _curVx, _remain);
  var _curAABB = window._getTargetAABB(_t) || b.targetAABB;
  var _scat = window._calcWeaponScatter(b.weaponRange, b.hr, b.burstCount, b.burstFactor, _curAABB);

  var _aimYLocal = window._getWeaponAimY(b.weaponId, b.ammoId, null);
  var _ty = (typeof _t.y === 'number') ? _t.y : b.targetSnapshotY;

  b.impactX = _predictX + _scat.sx;
  b.impactY = _ty + _aimYLocal + _scat.sy;
};

/* 線段 vs AABB（2D slab 法）；返回 {hit: bool, t: 交點參數 [0,1]} */
function _raySegAABB(x1, y1, x2, y2, ax, ay, aw, ah){
  var dx = x2 - x1, dy = y2 - y1;
  var tmin = 0, tmax = 1;
  if(Math.abs(dx) < 1e-9){
    if(x1 < ax || x1 > ax + aw) return { hit: false, t: -1 };
  } else {
    var tx1 = (ax - x1) / dx, tx2 = (ax + aw - x1) / dx;
    tmin = Math.max(tmin, Math.min(tx1, tx2));
    tmax = Math.min(tmax, Math.max(tx1, tx2));
    if(tmin > tmax) return { hit: false, t: -1 };
  }
  if(Math.abs(dy) < 1e-9){
    if(y1 < ay || y1 > ay + ah) return { hit: false, t: -1 };
  } else {
    var ty1 = (ay - y1) / dy, ty2 = (ay + ah - y1) / dy;
    tmin = Math.max(tmin, Math.min(ty1, ty2));
    tmax = Math.min(tmax, Math.max(ty1, ty2));
    if(tmin > tmax) return { hit: false, t: -1 };
  }
  if(tmax < 0 || tmin > 1) return { hit: false, t: -1 };
  return { hit: true, t: Math.max(0, tmin) };
}

/* 每幀檢測碰撞 + 結算 */
window._tickWeaponBullets = function(owner, dt, allTargets){
  var _bullets = _wbsGet(owner);
  if(!_bullets.length) return;
  var now = performance.now();

  for(var i = _bullets.length - 1; i >= 0; i--){
    var b = _bullets[i];
    if(b._resolved){ _bullets.splice(i, 1); continue; }

    if(b.guidanceMode !== 'none') window._updateGuidedBullet(b, now);

    var _elapsed = (now - b.startTime) / 1000;
    var _progress = Math.min(1, _elapsed / b.flightTimeSec);

    /* 手雷不走直線碰撞檢測（弧形軌跡） */
    if(!b.isGrenade && allTargets && allTargets.length){
      var _curX = b.startX + (b.impactX - b.startX) * _progress;
      var _curY = b.startY + (b.impactY - b.startY) * _progress;
      var _hitTgt = null, _hitX = 0, _hitY = 0;
      for(var ti = 0; ti < allTargets.length; ti++){
        var tgt = allTargets[ti];
        if(!tgt || tgt.hp <= 0) continue;
        /* rev-faction-filter-v3: 严格阵营过滤
         * 我方子弹（isEnemyBullet=false）只命中非玩家/载员（即 enemies）
         * 敌方子弹（isEnemyBullet=true）只命中玩家/载员（即 allies）
         * 否则敌弹在 enemies 列表 tick 时会被"第一个匹配的敌人 AABB"拦住。 */
        var _tgtIsAlly = !!(tgt.isPlayer || tgt.isPassenger || tgt.isGuard);
        if(b.isEnemyBullet){
          if(!_tgtIsAlly) continue;
        } else {
          if(_tgtIsAlly) continue;
        }
        var aabb = (tgt === b.target && b.targetAABB) ? b.targetAABB : window._getTargetAABB(tgt);
        if(!aabb) continue;
        var twx = (typeof tgt.worldX === 'number') ? tgt.worldX : 0;
        var ty  = (typeof tgt.y === 'number') ? tgt.y : 0;
        var ax = twx - aabb.width / 2;
        var _ray = _raySegAABB(b.startX, b.startY, b.impactX, b.impactY, ax, ty, aabb.width, aabb.height);
        if(_ray && _ray.hit){
          /* rev-hit-at-intersect: 用真实交点参数 t 算命中点（子弹与 AABB 第一个交点） */
          var _tHit = Math.max(0, Math.min(1, _ray.t));
          _hitTgt = tgt;
          _hitX = b.startX + (b.impactX - b.startX) * _tHit;
          _hitY = b.startY + (b.impactY - b.startY) * _tHit;
          break;
        }
      }
      if(_hitTgt){
        b._resolved = true;
        b._hitDetected = true;
        /* 命中点 y 用真实交点（用于火花/部位判定） */
        var _yFinal = _hitY;
        /* rev-tracer-to-vertical: 曳光终点在目标身体中心的垂直线上。
         * X = target.worldX，Y = 弹道在该 X 处的值（不是 AABB 边缘交点，也不是固定 centerY）。 */
        var _tgtWX = (typeof _hitTgt.worldX === 'number') ? _hitTgt.worldX : _hitX;
        var _dxT = b.impactX - b.startX;
        var _tCenter = 0.5;
        if(Math.abs(_dxT) > 1e-6){
          _tCenter = (_tgtWX - b.startX) / _dxT;
          if(!isFinite(_tCenter)) _tCenter = 0.5;
          if(_tCenter < 0) _tCenter = 0;
          if(_tCenter > 3) _tCenter = 3;
        }
        /* rev-hit-visual-unify: 曳光和火花统一在躯干中心 */
        var _visualHit = (typeof window._getTargetHitVisualWorld === 'function') ? window._getTargetHitVisualWorld(_hitTgt) : null;
        var _tracerX = _visualHit ? _visualHit.wx : (b.startX + _dxT * _tCenter);
        var _tracerY = _visualHit ? _visualHit.wy : (b.startY + (b.impactY - b.startY) * _tCenter);
        if(typeof b.onTracer === 'function'){
          try { b.onTracer(_tracerX, _tracerY, _hitTgt); } catch(e){ console.warn('[wpTrace]', e); }
        }
        /* rev-engine-tracer: 敵方子弹由引擎层推曳光，不依赖场景层传 onTracer */
        if(b.isEnemyBullet){
          var _ccE = (owner && owner.tracers) ? owner : window._combat;
          if(_ccE && _ccE.sm && _ccE.tracers){
            var _pWXe = (_ccE.allies && _ccE.allies[0]) ? _ccE.allies[0].worldX : 0;
            var _chfe = (typeof CHAR_HEIGHT_FACTOR === 'number') ? CHAR_HEIGHT_FACTOR : 0.58;
            var _phme = (typeof PLAYER_HEIGHT_M === 'number') ? PLAYER_HEIGHT_M : 1.7;
            var _srcXe = EXPLORE_HERO_X_RATIO + ((b.startX || 0) - _pWXe) / _ccE.sm.screenRightWorld * (1 - EXPLORE_HERO_X_RATIO);
            var _srcYe = 0.95 - (b.startY || 1.3) * (_chfe / _phme);
            var _tipXe;
            if(_hitTgt && _hitTgt.isPassenger && _hitTgt.srv){
              var _pfArrE = (window._explore && window._explore.passengersFollowing) || [];
              var _foundE = false;
              for(var _iE = 0; _iE < _pfArrE.length; _iE++){
                if(_pfArrE[_iE].srv && _pfArrE[_iE].srv.id === _hitTgt.srv.id){ _tipXe = _pfArrE[_iE].screenX; _foundE = true; break; }
              }
              if(!_foundE){
                _tipXe = EXPLORE_HERO_X_RATIO + (_tracerX - _pWXe) / _ccE.sm.screenRightWorld * (1 - EXPLORE_HERO_X_RATIO);
              }
            } else {
              _tipXe = EXPLORE_HERO_X_RATIO + (_tracerX - _pWXe) / _ccE.sm.screenRightWorld * (1 - EXPLORE_HERO_X_RATIO);
            }
            var _tipYe = 0.95 - _tracerY * (_chfe / _phme);
            _ccE.tracers.push({
              sx: _srcXe, sy: _srcYe,
              tx: _tipXe, ty: _tipYe,
              born: performance.now(), dur: 200,
              color: '#ffb300',
              hit: true,
              _target: _hitTgt || null
            });
          }
        }
        if(typeof b.onHit === 'function'){
          try { b.onHit(_tracerX, _tracerY, _hitTgt); } catch(e){ console.warn('[wpHit]', e); }
        }
        _bullets.splice(i, 1);
        continue;
      }
    }

    if(_progress >= 1){
      b._resolved = true;
      var _finalHit = false;
      var _t = b.target;
      if(_t && _t.hp > 0 && b.targetAABB){
        var twx2 = (typeof _t.worldX === 'number') ? _t.worldX : 0;
        var ty2  = (typeof _t.y === 'number') ? _t.y : 0;
        var ax2 = twx2 - b.targetAABB.width / 2;
        if(b.impactX >= ax2 && b.impactX <= ax2 + b.targetAABB.width &&
           b.impactY >= ty2 && b.impactY <= ty2 + b.targetAABB.height){
          _finalHit = true;
        }
      }
      if(_finalHit){
        if(typeof b.onTracer === 'function'){
          try { b.onTracer(b.impactX, b.impactY, b.target); } catch(e){ console.warn('[wpTrace]', e); }
        }
        if(typeof b.onHit === 'function'){
          try { b.onHit(b.impactX, b.impactY, b.target); } catch(e){ console.warn('[wpHit]', e); }
        }
      } else {
        if(typeof b.onMiss === 'function'){
          try { b.onMiss(b.impactX, b.impactY); } catch(e){ console.warn('[wpMiss]', e); }
        }
        /* rev-tracer-fly-out: 未命中曳光：
         *   下坠弹道（impactY < startY）→ 沿弹道延长到 y=0 地面
         *   水平或上升弹道 → 沿弹道延长到屏幕外（视觉上"飞出"） */
        var _groundX = b.impactX;
        var _groundY = b.impactY;
        var _sxM = (typeof b.startX === 'number') ? b.startX : 0;
        var _syM = (typeof b.startY === 'number') ? b.startY : 1.3;
        var _eyM = (typeof b.impactY === 'number') ? b.impactY : 0;
        if(_syM > 0 && _eyM < _syM){
          var _denom = _syM - _eyM;
          if(_denom > 1e-6){
            var _tGround = _syM / _denom;
            if(_tGround > 0 && _tGround < 100){
              _groundX = _sxM + (b.impactX - _sxM) * _tGround;
              _groundY = 0;
            }
          }
        } else {
          /* 水平或上升弹道：延长到屏幕边缘（左右按方向选择），若中途落地则截断 */
          var _ccMM = window._combat;
          var _pWXMM = (_ccMM && _ccMM.allies && _ccMM.allies[0]) ? _ccMM.allies[0].worldX : 0;
          var _srwMM = (_ccMM && _ccMM.sm) ? _ccMM.sm.screenRightWorld : 2;
          /* 屏幕右边缘世界 X = 玩家 + srw；左边缘 = 玩家 - srw/3 */
          var _rightWX = _pWXMM + _srwMM;
          var _leftWX = _pWXMM - _srwMM / 3;
          var _dxM2 = b.impactX - _sxM;
          var _dyM2 = b.impactY - _syM;
          var _tEdge = 200;
          if(Math.abs(_dxM2) > 1e-6){
            _tEdge = (_dxM2 > 0) ? ((_rightWX - _sxM) / _dxM2) : ((_leftWX - _sxM) / _dxM2);
            if(!isFinite(_tEdge) || _tEdge < 1) _tEdge = 200;
            if(_tEdge > 200) _tEdge = 200;
          }
          /* 中途是否落地（dy<0 且 sy>0） */
          var _tGround2 = Infinity;
          if(_dyM2 < -1e-6 && _syM > 0){
            _tGround2 = _syM / (-_dyM2);
          }
          var _tAct = Math.min(_tEdge, _tGround2);
          _groundX = _sxM + _dxM2 * _tAct;
          _groundY = _syM + _dyM2 * _tAct;
        }
        if(b.isEnemyBullet){
          var _ccM = (owner && owner.tracers) ? owner : window._combat;
          if(_ccM && _ccM.sm && _ccM.tracers){
            var _pWXm = (_ccM.allies && _ccM.allies[0]) ? _ccM.allies[0].worldX : 0;
            var _chfm = (typeof CHAR_HEIGHT_FACTOR === 'number') ? CHAR_HEIGHT_FACTOR : 0.58;
            var _phmm = (typeof PLAYER_HEIGHT_M === 'number') ? PLAYER_HEIGHT_M : 1.7;
            var _srcXm = EXPLORE_HERO_X_RATIO + ((b.startX || 0) - _pWXm) / _ccM.sm.screenRightWorld * (1 - EXPLORE_HERO_X_RATIO);
            var _srcYm = 0.95 - (b.startY || 1.3) * (_chfm / _phmm);
            var _tipXm = EXPLORE_HERO_X_RATIO + (_groundX - _pWXm) / _ccM.sm.screenRightWorld * (1 - EXPLORE_HERO_X_RATIO);
            var _tipYm = 0.95 - _groundY * (_chfm / _phmm);
            _ccM.tracers.push({
              sx: _srcXm, sy: _srcYm,
              tx: _tipXm, ty: _tipYm,
              born: performance.now(), dur: 200,
              color: '#ffb300',
              hit: false,
              _target: null
            });
          }
        }
      }
      _bullets.splice(i, 1);
    }
  }
};

/* 清空子彈（場景切換用） */
window._clearWeaponBullets = function(owner){
  if(!_weaponBulletStore.has(owner)) return;
  _weaponBulletStore.set(owner, []);
};

/* 讀取 owner 的在途子彈（渲染用） */
window._getWeaponBullets = function(owner){
  return _wbsGet(owner);
};


/* rev-hit-visual-world: 目标的「躯干中心」世界坐标（曳光和火花统一落点）
 * 人偶在 386 高原图中，torso layer 中心相对脚底的 Y = 264.2 * 1.7 / 386 ≈ 1.163m */
window._getTargetHitVisualWorld = function(target){
  if(!target) return null;
  var _footY = (typeof target.y === 'number') ? target.y : 0;
  var _wx = (typeof target.worldX === 'number') ? target.worldX : 0;
  if(target.isVehicle){
    var _aabb = (typeof window.getVehicleAABB === 'function') ? window.getVehicleAABB(target.vehicleId) : null;
    return { wx: _wx, wy: _footY + ((_aabb && _aabb.centerY) ? _aabb.centerY : 1.2) };
  }
  return { wx: _wx, wy: _footY + 1.163 };
};

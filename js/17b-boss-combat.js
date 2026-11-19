
'use strict';

function defaultAimPartForBoss(bossId){
  const def = BOSS_LAYERS[bossId];
  if(!def) return null;
  const torso = def.layers.find(function(l){ return l.id === 'torso'; });
  if(torso) return 'torso';
  const body = def.layers.find(function(l){ return l.id === 'body'; });
  if(body) return 'body';
  let best = null, bestArea = 0;
  for(const L of def.layers){
    const a = L.w * L.h;
    if(a > bestArea){ bestArea = a; best = L.id; }
  }
  return best;
}

/* ============== 階段 ============== */
function updateBossPhase(){
  const b = battle;
  if(!b) return;
  const phases = BOSS_PHASES[b.bossId];
  if(!phases || phases.length === 0) return;
  const hpPct = b.bossMaxHp > 0 ? (b.bossHp / b.bossMaxHp) : 0;
  const _isII = (b.bossId.indexOf('_ii') !== -1);
  const _lastIdx = phases.length - 1;
  for(let i = _lastIdx; i >= 0; i--){
    if(hpPct <= phases[i].hpPct && i > b.phaseIdx){
      b.phaseIdx = i;
      const p = phases[i];
      if(p.dmgMult !== undefined) b.bossDmgMult = p.dmgMult;
      if(!b.healedPhases) b.healedPhases = [];
      const _shouldHeal = _isII ? (i > 0) : (i === _lastIdx);
      if(_shouldHeal && b.healedPhases.indexOf(i) === -1){
        b.bossHp = b.bossMaxHp;
        b.healedPhases.push(i);
      }
      break;
    }
  }
}

/* ============== 擊退反推 ============== */
function pushPlayerLeft(newBossWX){
  const b = battle;
  if(!b) return newBossWX;
  const _minPlayerWX = newBossWX - BOSS_MIN_GAP_M;
  if(b.playerWorldX > _minPlayerWX){
    b.playerWorldX = Math.max(0, _minPlayerWX);
  }
  return newBossWX;
}

/* ============== AI 主循環 ============== */
function updateBossAI(dt, now){
  const b = battle;
  if(!b || b.settling) return;
  const P = window._bossAIParams(b.bossId);
  const ai = _bossAI(b);
  const dist = Math.abs(b.bossWorldX - b.playerWorldX);
  /* 術語鎖：Boss 發現玩家 = dist <= R_player。無遲滯、無倍率。 */
  const pR = (typeof b.engagedRange === "number" && b.engagedRange > 0) ? b.engagedRange : 80;

  /* Omega 四臂全斷 -> 癱瘓 */
  if(isBossType(b.bossId, "omega") && b.arms){
    const anyAlive = OMEGA_ARM_IDS.some(function(id){ return b.arms[id] && b.arms[id].alive; });
    if(!anyAlive){ ai.vel = 0; b.bossAnimRate = 1; _bossSetAnim("idle"); return; }
  }

  /* 脫離：玩家離開可被發現半徑即解除，走回錨點（不影響發現判定） */
  if(b.engaged && dist > pR && !b.bossDash && !b.bossCast){
    b.engaged = false;
    b.bossRetreat = null;
    ai.state = "home"; ai.stateAt = now;
  }

  if(!b.engaged){
    if(dist <= pR && b.playerWorldX >= BOSS_SAFE_ZONE_M){
      b.engaged = true;
      ai.state = "alert"; ai.stateAt = now; ai.vel = 0;
      if(typeof playBossOneshot === "function") playBossOneshot("skill_charge", P.alertMs);
    } else if(ai.state === "home"){
      _bossDrive(b, ai, P, ai.homeX, P.home, dt, false);
      if(Math.abs(b.bossWorldX - ai.homeX) < 0.3){
        ai.vel = 0; b.bossAnimRate = 1; _bossSetAnim("idle"); ai.state = "idle";
      }
      return;
    } else {
      ai.vel = 0; b.bossAnimRate = 1; _bossSetAnim("idle");
      return;
    }
  }

  if(typeof updateBossPhase === "function") updateBossPhase();
  if(!b.skillCds){
    b.skillCds = {};
    const sk0 = (typeof getBossSkillList === "function") ? getBossSkillList(b.bossId) : (BOSS_SKILLS[b.bossId] || []);
    for(const sk of sk0) b.skillCds[sk.id] = now + 1500;
  }

  /* 突進 / 施法 子系統優先 */
  if(b.bossDash){ updateBossDash(dt, now); return; }
  if(b.bossCast){
    const cast = b.bossCast;
    const el = now - cast.startTime;
    if(!cast.applied && el >= cast.skill.hitDelay){ cast.applied = true; applyBossSkillDamage(cast.skill); }
    _bossBrake(b, ai, P, dt);
    if(el >= cast.skill.totalTime){ b.bossCast = null; ai.state = "chase"; ai.stateAt = now; }
    return;
  }

  /* 受擊拉開：加速離開，步態同步 */
  if(b.bossRetreat){
    _bossDrive(b, ai, P, b.bossRetreat.targetWorldX, P.retreat, dt, false);
    if(b.bossWorldX >= b.bossRetreat.targetWorldX - 0.25){
      b.bossRetreat = null; ai.state = "chase"; ai.stateAt = now;
    }
    return;
  }

  /* 察覺起手 */
  if(ai.state === "alert"){
    ai.vel = 0; b.bossAnimRate = 1;
    if(now - ai.stateAt >= P.alertMs){ ai.state = "chase"; ai.stateAt = now; }
    return;
  }
  ai.state = "chase";

  /* 技能：phase / omega 守衛 / cd / 射程（沿用原資料表與原邏輯） */
  const skills = (typeof getBossSkillList === "function") ? getBossSkillList(b.bossId) : (BOSS_SKILLS[b.bossId] || []);
  let effPhase = b.phaseIdx;
  if(isBossType(b.bossId, "omega")){
    let guard = 0;
    while(guard++ < 4){
      const usable = skills.some(function(sk){
        const ph = (sk.unlockPhase === undefined) ? true : (effPhase >= sk.unlockPhase);
        return ph && !isOmegaSkillDisabled(sk);
      });
      if(usable) break;
      effPhase++;
    }
  }
  for(const sk of skills){
    const ph = (sk.unlockPhase === undefined) ? true : (effPhase >= sk.unlockPhase);
    if(!ph) continue;
    if(isOmegaSkillDisabled(sk)) continue;
    if(now < (b.skillCds[sk.id] || 0)) continue;
    const rM = (sk.range || 0) * BOSS_NORM_TO_M;
    const minM = (sk.minRange || 0) * BOSS_NORM_TO_M;
    if(sk.type === "dash"){
      if(dist < minM || dist > rM) continue;
      startBossDash(sk, now);
      b.skillCds[sk.id] = now + sk.cd * 1000;
      return;
    }
    if(dist > rM) continue;
    b.bossCast = { skill: sk, startTime: now, applied: false };
    b.skillCds[sk.id] = now + sk.cd * 1000;
    if(typeof playBossOneshot === "function") playBossOneshot(sk.anim);
    if(typeof showBossTelegraph === "function") showBossTelegraph(sk);
    return;
  }

  /* 近戰：先減速站定再出手 / 追趕：雙速 + 加速度，不推擠玩家 */
  if(dist <= P.atkRange){
    _bossBrake(b, ai, P, dt);
    if(ai.vel === 0 && now - (b.lastMeleeAt || 0) > P.meleeCd){
      b.lastMeleeAt = now;
      doBossMeleeSwipe();
    }
  } else {
    const speed = (dist > P.atkRange * 3) ? P.chase : P.stalk;
    _bossDrive(b, ai, P, b.playerWorldX + BOSS_MIN_GAP_M, speed, dt, false);
  }
}

/* ============== 突進 ============== */
function startBossDash(sk, now){
  const b = battle;
  if(!b) return;
  const _dashDistM = (sk.dashDistance || 0.35) * BOSS_NORM_TO_M;
  const _speedM = (sk.dashSpeed || 0.55) * BOSS_NORM_TO_M;
  const dir = (b.playerWorldX < b.bossWorldX) ? -1 : 1;
  let targetWX = b.bossWorldX + dir * _dashDistM;
  if(dir < 0){
    targetWX = Math.max(targetWX, b.playerWorldX + BOSS_MIN_GAP_M);
  }
  b.bossDash = {
    skill: sk,
    state: 'warn',
    startTime: now,
    warnMs: sk.telegraph || 800,
    dir: dir,
    targetWorldX: targetWX,
    speedM: _speedM,
    lastHit: 0,
    contactDmg: sk.contactDmg || 15,
    hitTickMs: sk.hitTickMs || 250,
    exhaustMs: sk.exhaustMs || 1500
  };
  const fb = document.getElementById('fighter-boss');
  if(fb && !fb.querySelector('.boss-warning')){
    const w = document.createElement('div');
    w.className = 'boss-warning';
    w.textContent = '❗';
    fb.appendChild(w);
  }
}

function updateBossDash(dt, now){
  const b = battle;
  const d = b.bossDash;
  if(!d) return;
  const P = window._bossAIParams(b.bossId);
  const ai = _bossAI(b);
  const el = now - d.startTime;

  if(d.state === "warn"){
    _bossBrake(b, ai, P, dt);
    if(el >= d.warnMs){
      d.state = "dash"; d.startTime = now;
      const w = document.querySelector(".boss-warning"); if(w) w.remove();
      _bossSetAnim("walk");
    }
    return;
  }

  if(d.state === "dash"){
    /* 突進接觸才推擠玩家（撞擊），與追趕不同 */
    const want = d.dir * d.speedM;
    const maxDv = P.accel * 2.5 * dt;
    ai.vel += Math.max(-maxDv, Math.min(maxDv, want - ai.vel));
    const nx = b.bossWorldX + ai.vel * dt;
    if(d.dir < 0){
      const minX = b.playerWorldX + BOSS_MIN_GAP_M;
      if(nx < minX){
        b.playerWorldX = Math.max(0, nx - BOSS_MIN_GAP_M);
        if(now - (d.lastHit || 0) > d.hitTickMs){
          d.lastHit = now;
          const sc = (b.bossDmg || 25) / 25;
          tryHitPlayer(d.contactDmg * sc * (b.bossDmgMult || 1), b.bossPenMM || 0);
        }
      }
    }
    b.bossWorldX = nx;
    b.bossAnimRate = Math.max(0.6, Math.min(2.6, Math.abs(ai.vel) / Math.max(0.6, P.stalk || 1)));
    _bossSetAnim("walk");
    const reached = (d.dir > 0 && b.bossWorldX >= d.targetWorldX) ||
                    (d.dir < 0 && b.bossWorldX <= d.targetWorldX) ||
                    Math.abs(b.bossWorldX - d.targetWorldX) < 0.5;
    if(reached){
      b.bossWorldX = d.targetWorldX;
      d.state = "exhaust"; d.startTime = now;
      b.lastMeleeAt = now;
      doBossMeleeSwipe();
    }
    return;
  }

  if(d.state === "exhaust"){
    _bossBrake(b, ai, P, dt);
    if(el >= d.exhaustMs){ b.bossDash = null; ai.state = "chase"; ai.stateAt = now; }
  }
}

/* ============== 玩家受傷 ============== */
function tryHitPlayer(dmg, pen){
  if(!battle || !battle.active) return;
  const dodge = clamp(0.15 + state.player.level * 0.005, 0, 0.5);
  if(Math.random() < dodge){
    spawnHitFx('player', 0, 'MISS', 'armor');
    return;
  }
  let finalDmg = dmg;
  let isCrit = false;
  if(Math.random() < (battle.bossCritRate||0)){
    finalDmg = Math.round(dmg * (battle.bossCritMult||1));
    isCrit = true;
  }
  const target = { hp: battle.playerHp, armor: battle.playerArmor };
  const res = applyDamage(target, finalDmg, pen||0, {
    armorProvider: function(part){ return (typeof getPlayerArmorMMForPart === 'function') ? getPlayerArmorMMForPart(part) : 0; }
  });
  var _prevHp = battle.playerHp, _prevArmor = battle.playerArmor;
  battle.playerHp = target.hp;
  battle.playerArmor = target.armor;
  if(typeof battle.playerHp !== 'number' || isNaN(battle.playerHp) || battle.playerHp < 0){
    console.warn('[tryHitPlayer] playerHp abnormal:', {prevHp:_prevHp, prevArmor:_prevArmor, finalDmg:finalDmg, targetHp:target.hp, res:res, maxHp:battle.playerMaxHp});
    battle.playerHp = Math.max(1, _prevHp);
  }
  const _hh=document.getElementById('hero-hp'),_ha=document.getElementById('hero-ap');
  if(_hh)_hh.style.width=Math.max(0,battle.playerHp/battle.playerMaxHp*100)+'%';
  if(_ha)_ha.style.width=Math.max(0,battle.playerArmor/battle.playerMaxArmor*100)+'%';
  spawnHitFx('player', 0, isCrit ? '-'+Math.round(finalDmg)+'!' : '-'+Math.round(finalDmg), isCrit ? 'crit' : (res.hpLost > 0 ? 'enemy' : 'armor'), battle.px, battle.py);
  /* rev-fix-boss-hurt-anim: 只設 _hurtUntil，動畫由 battleLoop 的 _wantAnim 統一決定 */
  if(typeof battle !== 'undefined' && battle){
    const _hurtAnim = (typeof GAME_ANIMS !== 'undefined' && GAME_ANIMS.hurt) ? GAME_ANIMS.hurt : null;
    const _hurtDur = _hurtAnim ? Math.round(_hurtAnim.frameCount / _hurtAnim.fps * 1000) : 500;
    if(!battle._hurtUntil || performance.now() >= battle._hurtUntil){
      battle._hurtUntil = performance.now() + _hurtDur;
    }
  }
  if(typeof refreshBattleControlsLive === 'function') refreshBattleControlsLive();
  if(battle.playerHp <= 0){
    endBattle(false);
  }
}

/* ============== 近戰掃擊 ============== */
function doBossMeleeSwipe(){
  if(!battle || !battle.active) return;
  const b = battle;
  if(isBossType(b.bossId, 'omega') && typeof isOmegaArmBroken === 'function' && isOmegaArmBroken('ring_l')) return;
  const dist = Math.abs(b.bossWorldX - b.playerWorldX);
  if(dist > BOSS_SWIPE_RANGE_M) return;
  if(typeof playBossOneshot === 'function') playBossOneshot('attack_swipe');
  b._meleeDamageAt = performance.now() + 250;
}

/* ============== 技能傷害 ============== */
function applyBossSkillDamage(sk){
  if(!battle || !battle.active) return;
  const b = battle;
  if(sk.projectile && typeof spawnBossProjectile === 'function') spawnBossProjectile(sk);
  const dist = Math.abs(b.bossWorldX - b.playerWorldX);
  const _skRangeM = (sk.range || 0) * BOSS_NORM_TO_M;
  if(dist > _skRangeM){
    spawnHitFx('player', 0, 'MISS', 'armor');
    return;
  }
  const _skillScale = (b.bossDmg || 25) / 25;
  tryHitPlayer(sk.dmg * _skillScale * (b.bossDmgMult || 1), sk.penMM || 0);
  if(sk.knockback){
    const _knockM = sk.knockback * BOSS_NORM_TO_M;
    b.playerWorldX = Math.max(0, b.playerWorldX - _knockM);
  }
}

/* ============== 玩家打 Boss ============== */

function applyBossDamage(dmg, isCrit, penMM, isThrowable, skipHitFx, forceNonWeak, part){
if(!battle) return null;
battle.engaged = true;
const _aimPos = (typeof getAimTargetPos === 'function') ? getAimTargetPos() : { x: battle.bx, y: 0.6 };
/* rev-bossbox: 部位由幾何決定（顯式 part > _hitCtx.part）；無部位（近戰）退回 aimPart */
let _p = (typeof part === 'string' && part) ? part : null;
if(!_p && window._hitCtx && typeof window._hitCtx.part === 'string') _p = window._hitCtx.part;
const _hasPart = !!_p;
if(isBossType(battle.bossId, 'hydra') && battle.heads){
return applyHydraDamage(dmg, isCrit, penMM, isThrowable, _p);
}
if(battle.shieldMaxHp > 0 && !battle.shieldBroken && battle.shieldHp > 0){
const _pen = penMM || 0;
const _shieldScale = clamp(_pen / 32, 0.15, 1.0);
const _shieldDmg = Math.max(1, Math.round(dmg * _shieldScale));
battle.shieldHp = Math.max(0, battle.shieldHp - _shieldDmg);
battle.damageDealt += _shieldDmg;
if(!skipHitFx) spawnHitFx('boss', 0, '-' + _shieldDmg + (isCrit ? '!' : ''), 'armor', _aimPos.x, _aimPos.y);
const shEl = document.getElementById('boss-shield');
if(shEl) shEl.style.width = Math.max(0, battle.shieldHp / battle.shieldMaxHp * 100) + '%';
if(battle.shieldHp <= 0 && typeof breakBossShield === 'function') breakBossShield();
return { hpLost: 0, armorLost: _shieldDmg, shield: true };
}
/* rev-bossbox: 弱點層 0 甲、body 照 Boss armorMM —— 等價探索「無甲部位」；
   isThrowable 不再無視護甲（統一模型的必然結果） */
const bossArmorLevel = BOSSES[battle.bossId] ? (BOSSES[battle.bossId].armorLevel || 0) : 0;
const bossArmorMM = ARMOR_LEVEL_TO_MM[bossArmorLevel] || 0;
const _isWeak = !forceNonWeak && (_hasPart ? (_p !== 'body') : (typeof isWeakPointHit === 'function' && isWeakPointHit()));
const target = { hp: battle.bossHp, armor: battle.bossArmor };
const res = applyDamage(target, dmg, penMM || 0, { armorMMOverride: _isWeak ? 0 : bossArmorMM });
battle.bossHp = target.hp;
battle.bossArmor = target.armor;
battle.damageDealt += (res.hpLost + res.armorLost);
const shownDmg = res.hpLost > 0 ? res.hpLost : res.armorLost;
if(!skipHitFx) spawnHitFx('boss', 0, '-' + Math.round(shownDmg) + (isCrit ? '!' : ''), (res.hpLost > 0 ? (isCrit ? 'crit' : (_isWeak ? 'weak' : '')) : 'armor'), _aimPos.x, _aimPos.y);
if(res.hpLost > 0 && !battle.bossRetreat && !isBossType(battle.bossId, 'hydra')){
const hpPct = res.hpLost / Math.max(1, battle.bossMaxHp);
const retreatDistM = Math.min(8, hpPct * 320);
if(retreatDistM >= 0.4) battle.bossRetreat = { targetWorldX: battle.bossWorldX + retreatDistM };
}
if(battle.bossHp <= 0) endBattle(true);
return { hpLost: res.hpLost, armorLost: res.armorLost, part: _p, weak: _isWeak };
}


/* ============== Hydra 多頭 ============== */

function applyHydraDamage(dmg, isCrit, penMM, isThrowable, part){
if(!battle || !battle.heads) return null;
const _hasPart = (typeof part === 'string' && !!part);
const _aimPos = (typeof getAimTargetPos === 'function') ? getAimTargetPos() : { x: battle.bx, y: 0.6 };
/* rev-bossbox: 護甲階段不再被投擲物繞過 */
if(battle.bossArmor > 0){
const bossArmorLevel = BOSSES[battle.bossId] ? (BOSSES[battle.bossId].armorLevel || 0) : 0;
const bossArmorMM = ARMOR_LEVEL_TO_MM[bossArmorLevel] || 0;
const proxy = { hp: 0, armor: battle.bossArmor };
const r = applyDamage(proxy, dmg, penMM || 0, { armorMMOverride: bossArmorMM });
battle.bossArmor = proxy.armor;
battle.damageDealt += r.armorLost;
spawnHitFx('boss', 0, '-' + r.armorLost + (isCrit ? '!' : ''), 'armor', _aimPos.x, _aimPos.y);
const apEl = document.getElementById('boss-ap');
if(apEl) apEl.style.width = Math.max(0, battle.bossArmor / battle.bossMaxArmor * 100) + '%';
return { hpLost: 0, armorLost: r.armorLost };
}
const _aimPart = _hasPart ? part : battle.aimPart;
const isBodyPart = _hasPart ? (part === 'body') : !/^(head_|neck_|eye|mouth)/.test(String(_aimPart || ''));
const adjustedDmg = isBodyPart ? Math.round(dmg * 0.7) : dmg;
let targets = [];
if(_hasPart){
if(battle.heads[part] && battle.heads[part].alive) targets = [part];
else targets = (typeof getHydraTargets === 'function') ? getHydraTargets('body') : [];
} else {
targets = (typeof getHydraTargets === 'function') ? getHydraTargets(battle.aimPart) : [];
}
if(!targets.length) return null;
const share = Math.max(1, Math.round(adjustedDmg / targets.length));
let _hpSum = 0;
for(const headId of targets){
const head = battle.heads[headId];
if(!head || !head.alive) continue;
head.hp = Math.max(0, head.hp - share);
battle.damageDealt += share;
_hpSum += share;
const pos = (typeof getHeadScreenPos === 'function') ? getHeadScreenPos(headId) : null;
if(pos) spawnHitFx('boss', 0, '-' + share + (isCrit ? '!' : ''), isCrit ? 'crit' : 'weak', pos.x, pos.y);
if(head.hp <= 0){
head.alive = false;
if(typeof playHeadBreakFx === 'function') playHeadBreakFx(headId);
const _ap = battle.aimPart;
const _aimIsDeadHead = (
_ap === headId ||
(typeof HYDRA_NECK_MAP !== 'undefined' && HYDRA_NECK_MAP[_ap] === headId) ||
(/^(eye|mouth)/.test(String(_ap || '')) && typeof findNearestHeadForLayer === 'function' && findNearestHeadForLayer(_ap) === headId)
);
if(typeof window._bossResetAimIfInvalid === 'function') window._bossResetAimIfInvalid();
}
}
battle.bossHp = HYDRA_HEAD_IDS.reduce(function(s, id){
return s + (battle.heads[id].alive ? battle.heads[id].hp : 0);
}, 0);
if(HYDRA_HEAD_IDS.every(function(id){ return !battle.heads[id].alive; })){
battle.bossHp = 0;
endBattle(true);
return { hpLost: _hpSum, armorLost: 0 };
}
if(typeof updateHeadBarsUI === 'function') updateHeadBarsUI();
return { hpLost: _hpSum, armorLost: 0 };
}


/* ============== 子彈視覺 ============== */

function updateBullets(dt){
  if(!battle) return;
  var now = performance.now();
  /* rev-float-unify: 與探索 _tickBullets 相同的 1.2s 生命週期 */
  if(battle.floats){
    for(var j = battle.floats.length - 1; j >= 0; j--){
      battle.floats[j].age += dt;
      if(battle.floats[j].age > 1.2) battle.floats.splice(j, 1);
    }
  }
  for(var i = battle.bullets.length - 1; i >= 0; i--){
    var b = battle.bullets[i];
    if(b.startTime && b.duration) b.t = (now - b.startTime) / b.duration;
    else b.t = (b.t || 0) + dt * 3.5;
    if(b.t >= 1){
      if(b.isGrenade){
        var _fxEl = document.getElementById('battle-fx');
        var _W = _fxEl ? _fxEl.clientWidth : 400;
        var _H = _fxEl ? _fxEl.clientHeight : 500;
        var _chf = (typeof CHAR_HEIGHT_FACTOR === 'number') ? CHAR_HEIGHT_FACTOR : 0.58;
        var _phm = (typeof PLAYER_HEIGHT_M === 'number') ? PLAYER_HEIGHT_M : 1.7;
        var _ppm = (typeof battle.bgPixelsPerMeter === 'number' && battle.bgPixelsPerMeter > 0) ? battle.bgPixelsPerMeter : (_H * _chf / _phm);
        if(typeof _spawnExplosionSmoke === 'function') _spawnExplosionSmoke(battle, b.tx * _W, b.ty * _H, 4.5 * _ppm);
      }
      battle.bullets.splice(i, 1);
      if(b._onHit){ window._lastBullet = b; try { b._onHit(); } catch(err){ console.error(err); } window._lastBullet = null; }
      continue;
    }
  }
  if(typeof window._tickWeaponBullets === 'function' && battle.bossTarget){
    window._tickWeaponBullets(battle, dt, [battle.bossTarget]);
  }
}


/* ============== 戰鬥結束 ============== */
/* rev-sweep-bossfix2: 載具衝撞必殺 —— 與探索 roadkill 同一條判定，Boss 走自己的死亡管線 */
window._bossVehicleRoadkill = function(){
  var b = (typeof battle !== 'undefined') ? battle : null;
  if(!b || !b.active || b.settling) return;
  var i;
  if(b.heads && typeof HYDRA_HEAD_IDS !== 'undefined'){
    for(i = 0; i < HYDRA_HEAD_IDS.length; i++){
      var h = b.heads[HYDRA_HEAD_IDS[i]];
      if(h){ h.hp = 0; h.alive = false; }
    }
  }
  if(b.arms && typeof OMEGA_ARM_IDS !== 'undefined'){
    for(i = 0; i < OMEGA_ARM_IDS.length; i++){
      var a = b.arms[OMEGA_ARM_IDS[i]];
      if(a){ a.hp = 0; a.alive = false; }
    }
  }
  b.shieldHp = 0;
  b.shieldBroken = true;
  b.bossArmor = 0;
  b.bossHp = 0;
  if(typeof endBattle === 'function') endBattle(true);
};
function endBattle(victory){
  if(!battle) return;
  if(battle.settling) return;
  const b = battle;
  b.settling = true;
  /* rev-sweep-once: 掃蕩不發戰利品 / 不寫挑戰日誌 / 不彈結算 —— 由 _executeSweep 統一結算 N 份 */
  if(b.sweep){
    state.player.hp = Math.max(1, Math.round(b.playerHp));
    state.player.armor = Math.max(0, Math.round(b.playerArmor));
    b.resultData = { bossDef: BOSSES[b.bossId], victory: victory, loot: [] };
    var _anS = BOSS_ANIMS[b.bossId], _daS = _anS && _anS.death;
    if(victory && _daS){
      battleBossAnim.name = 'death';
      battleBossAnim.frame = 0;
      battleBossAnim.lastUpdate = performance.now();
      battleBossAnim.forcedEnd = 0;
      b._settleScheduled = false;
    } else if(typeof window._finishSweepBattle === 'function'){
      window._finishSweepBattle(b);
    }
    return;
  }
  /* rev-sweep-bossfix2: 掃蕩不發戰利品 / 不寫挑戰日誌 / 不彈結算 —— 由 _executeSweep 統一結算 */
  if(b.sweep){
    b.resultData = { bossDef: BOSSES[b.bossId], victory: victory, loot: [] };
    var _anS = BOSS_ANIMS[b.bossId], _daS = _anS && _anS.death;
    if(victory && _daS){
      battleBossAnim.name = 'death';
      battleBossAnim.frame = 0;
      battleBossAnim.lastUpdate = performance.now();
      battleBossAnim.forcedEnd = 0;
      b._settleScheduled = false;
    } else if(typeof window._finishSweepBattle === 'function'){
      window._finishSweepBattle(b);
    }
    return;
  }
  state.player.hp = Math.max(1, Math.round(b.playerHp));
  state.player.armor = Math.max(0, Math.round(b.playerArmor));
  addProf(b.weaponSlot, 3);
  if(b.weapon && b.weapon.def.type) addProf(b.weapon.def.type, 3);

  let resultHtml = '', loot = [];
  const bossDef = BOSSES[b.bossId];

  if(victory){
    state.stats.bossKills++;
    if(state.defeatedBosses.indexOf(b.bossId) === -1) state.defeatedBosses.push(b.bossId);

    if(bossDef.unlock){
      const nextName = bossDef.tier === 2 ? bossDef.unlock + 'II' : bossDef.unlock;
      if(state.unlockedRegions.indexOf(nextName) === -1){
        state.unlockedRegions.push(nextName);
        pushLog('<span class="win">解鎖新地區：' + nextName + '</span>', [], 'combat');
      }
    }
    if(bossDef.unlockTier2){
      const nextName = bossDef.unlockTier2 + 'II';
      if(state.unlockedRegions.indexOf(nextName) === -1){
        state.unlockedRegions.push(nextName);
        pushLog('<span class="win">解鎖二級入口：' + nextName + '</span>', [], 'combat');
      }
    }

    const drops = pickN(bossDef.drops, Math.min(2, bossDef.drops.length));
    if(Math.random() < 0.25 && typeof grantRandomServant === 'function'){
      const _srv = grantRandomServant();
      if(_srv){
        const _sdef = SERVANT_TYPES[_srv.type];
        pushLog('<span class="pl">玩家</span> 獲得僕人：<b class="r-' + _srv.rarity + '">' + _sdef.name + '</b>（' + _srv.rarity + '）。', [], 'combat');
      }
    }
    for(const did of drops){
      const dd = itemDef(did);
      if(!dd) continue;
      const rar = rollRarity();
      invAdd(did, rar, 1);
      loot.push({ id: did, rarity: rar, count: 1 });
    }
    addExp(50);
    resultHtml = '<span class="win">勝利！</span> 擊敗 <b>' + bossDef.name + '</b>。對 Boss 傷害：' + Math.round(b.damageDealt);
  } else {
    state.stats.deaths++;
    const total = b.bossMaxHp + b.bossMaxArmor;
    const ratio = clamp(b.damageDealt / total, 0, 1);
    const n = Math.max(0, Math.round(ratio * 2));
    for(let i = 0; i < n; i++){
      const did = pick(bossDef.drops);
      const dd = itemDef(did);
      if(!dd) continue;
      const rar = rollRarity();
      invAdd(did, rar, 1);
      loot.push({ id: did, rarity: rar, count: 1 });
    }
    resultHtml = '<span class="lose">失敗…</span> 對 Boss 傷害：' + Math.round(b.damageDealt) + ' / ' + total + '（' + (ratio * 100).toFixed(1) + '%）<br><span style="color:#4a90d9;font-size:10px">下次進入將自動回滿血量</span>';
  }

  const lootTxt = loot.length ? ('獲得：' + loot.map(function(l){ return fmtItemSpan(l.id, l.rarity, l.count); }).join('、')) : '無戰利品';
  pushLog('<span class="pl">玩家</span> 挑戰 <b>' + bossDef.name + '</b>：' + resultHtml + '，' + lootTxt + '。', loot, 'combat');
  save();

  const anims = BOSS_ANIMS[b.bossId];
  const deathAnim = anims && anims.death;
  b.resultData = { bossDef: bossDef, victory: victory, loot: loot };

  if(victory && deathAnim){
    battleBossAnim.name = 'death';
    battleBossAnim.frame = 0;
    battleBossAnim.lastUpdate = performance.now();
    battleBossAnim.forcedEnd = 0;
    b._settleScheduled = false;
  } else {
    b.active = false;
    b.settling = false;
    showBattleResult(bossDef, b, victory, loot);
    if(typeof _cleanBossFxCanvases === 'function') _cleanBossFxCanvases();
    battle = null;
  }
}

function finishBattleSettle(){
  if(!battle || !battle.settling) return;
  const rd = battle.resultData;
  if(!rd) return;
if(battle.sweep){ if(typeof window._finishSweepBattle === 'function') window._finishSweepBattle(battle); return; } /* rev-sweep-settle */
if(battle.sweep){ if(typeof window._finishSweepBattle === 'function') window._finishSweepBattle(battle); return; } /* rev-sweep-bossfix2 */
  battle.active = false;
  showBattleResult(rd.bossDef, battle, rd.victory, rd.loot);
  if(typeof _cleanBossFxCanvases === 'function') _cleanBossFxCanvases();
  battle = null;
}

function showBattleResult(bossDef, b, victory, loot){
  let body = '';
  body += '<div class="detail-title ' + (victory ? 'r-傳奇' : 'r-破舊') + '">' + (victory ? '⚔️ 勝利' : '💀 失敗') + '</div>';
  body += '<div class="detail-sub">' + bossDef.name + '</div>';
  body += '<div class="stat-line"><span class="k">造成傷害</span><span class="v">' + Math.round(b.damageDealt) + '</span></div>';
  body += '<div class="stat-line"><span class="k">剩餘 HP</span><span class="v">' + Math.max(0, Math.round(b.playerHp)) + '</span></div>';
  body += '<div class="divider"></div>';
  body += '<div style="font-size:11px;color:#e8a33d;margin-bottom:6px">戰利品</div>';
  if(loot.length){
    for(const l of loot){
      body += '<div class="item-row" data-iid="' + l.id + '" data-irar="' + l.rarity + '"><div class="icon" style="background:' + rarityBg(l.rarity) + '">' + itemIcon(l.id, 30) + '</div><div class="info"><div class="nm ' + rarityClass(l.rarity) + '">' + ((itemDef(l.id) || { name: l.id }).name) + '</div><div class="sub">' + l.rarity + '</div></div><div class="cnt">*' + l.count + '</div></div>';
    }
  } else {
    body += '<div class="empty-hint">無</div>';
  }
  const ft = document.createElement('div');
  ft.className = 'modal-ft';
  ft.innerHTML = '<button class="btn primary" id="m-ok">確認</button>';
  const bd = openModal({ title: '戰鬥結算', body: body, footer: ft });
  ft.querySelector('#m-ok').onclick = function(){
    closeModal();
    save();
    renderCombat();
  };
  bd.querySelectorAll('.item-row').forEach(function(r){
    r.onclick = function(){ openItemDetail(r.dataset.iid, r.dataset.irar); };
  });
}

/* ============== 全局接口 ============== */
const BossModule = {
  get battle(){ return battle; },
  set battle(v){ battle = v; },
  isActive(){ return !!(battle && battle.active); }
};
window.BossModule = BossModule;


/* v20: isWeak 全局 getter —— 兜底 17b 里引用 isWeak 但没定义的地方 */
(function(){
  if(window.__isWeakGetterInstalled__) return;
  window.__isWeakGetterInstalled__ = true;
  try{
    Object.defineProperty(window, 'isWeak', {
      get: function(){
        return (typeof isWeakPointHit === 'function') ? isWeakPointHit() : false;
      },
      configurable: true
    });
  }catch(e){ console.warn('[isWeak getter] install failed', e); }
})();

/* ===== rev-bossai2:start ===== */
/* ============================================================
   rev-bossai2: Boss 行為參數（唯一真相源）
   本表不含任何偵測半徑 —— 術語鎖：
     Boss 發現玩家 = dist <= R_player（b.engagedRange <- PLAYER_DETECTABLE_R）
     玩家發現 Boss = dist <= R_boss（BOSS_DETECTABLE_R，17a）
   本表只管「發現之後怎麼動」，且速度/射程/冷卻全部沿用原值：
     chase   = (isII ? 0.075 : 0.055) * BOSS_NORM_TO_M   （原追趕速度）
     stalk   = chase * stalkRatio                        （近身放慢，新增）
     accel   加速度 m/s^2，速度不再瞬變（新增）
     retreat = 1.0 m/s（原值）  home 脫離後走回錨點（新增）
     atkRange / meleeCd 直接沿用既有常量與 1500ms
   mobile:false -> 不移動（Hydra 原本就是固定樁）
   ============================================================ */
const BOSS_AI_PARAMS = {
  _default:     { mobile:true,  stalkRatio:0.6, accel:6.0, alertMs:600, meleeCd:1500, retreat:1.0, home:2.2 },
  factory_king: { mobile:true,  stalkRatio:0.6, accel:6.0, alertMs:600, meleeCd:1500, retreat:1.0, home:2.2 },
  lab_queen:    { mobile:true,  stalkRatio:0.6, accel:6.5, alertMs:600, meleeCd:1500, retreat:1.0, home:2.4 },
  road_tyrant:  { mobile:true,  stalkRatio:0.6, accel:7.0, alertMs:550, meleeCd:1500, retreat:1.0, home:2.6 },
  swamp_hydra:  { mobile:false, stalkRatio:0.6, accel:5.0, alertMs:800, meleeCd:1500, retreat:0,   home:0   },
  core_omega:   { mobile:true,  stalkRatio:0.6, accel:6.0, alertMs:750, meleeCd:1500, retreat:1.0, home:2.2 }
};
window.BOSS_AI_PARAMS = BOSS_AI_PARAMS;
window._bossAIParams = function(bid){
  var id = String(bid || "");
  var base = id.replace(/_ii$/, "");
  var isII = id.indexOf("_ii") >= 0;
  var t = BOSS_AI_PARAMS[base] || BOSS_AI_PARAMS._default;
  var chase = t.mobile ? ((isII ? 0.075 : 0.055) * BOSS_NORM_TO_M) : 0;
  var isHydra = (typeof isBossType === "function") && isBossType(id, "hydra");
  return {
    mobile: t.mobile,
    chase: chase,
    stalk: chase * t.stalkRatio,
    accel: t.accel * (isII ? 1.15 : 1),
    alertMs: Math.round(t.alertMs * (isII ? 0.85 : 1)),
    meleeCd: t.meleeCd,
    retreat: t.retreat,
    home: t.home,
    atkRange: isHydra ? BOSS_RANGE_M_HYDRA : (isII ? BOSS_RANGE_M_II : BOSS_RANGE_M)
  };
};
function _bossAI(b){
  if(!b.ai) b.ai = { state:"idle", vel:0, homeX:b.bossWorldX, stateAt:0 };
  return b.ai;
}
/* 動畫切換：同名不重置幀（避免抖動）；oneshot 播放中不打斷 */
function _bossSetAnim(name){
  if(typeof battleBossAnim === "undefined") return;
  if(battleBossAnim.name === name) return;
  if(BATTLE_BOSS_ONESHOT.indexOf(battleBossAnim.name) !== -1 && battleBossAnim.forcedEnd > performance.now()) return;
  battleBossAnim.name = name;
  battleBossAnim.frame = 0;
  battleBossAnim.lastUpdate = performance.now();
  if(name !== "walk") battleBossAnim.forcedEnd = 0;
}
function _bossAnimRate(b, ai, P){
  var sp = Math.abs(ai.vel);
  if(sp <= 0.15){ b.bossAnimRate = 1; return 0; }
  b.bossAnimRate = Math.max(0.45, Math.min(2.4, sp / Math.max(0.6, P.stalk || P.chase || 1)));
  return sp;
}
/* 加速度趨近目標速度 + 位移 + 步態同步。追趕不推擠玩家（停在 MIN_GAP 外） */
function _bossDrive(b, ai, P, targetX, speed, dt, pushPlayer){
  var dx = targetX - b.bossWorldX;
  var dir = (Math.abs(dx) < 0.05) ? 0 : (dx > 0 ? 1 : -1);
  var want = dir * speed;
  var maxDv = P.accel * dt;
  ai.vel += Math.max(-maxDv, Math.min(maxDv, want - ai.vel));
  if(dir === 0 && Math.abs(ai.vel) < 0.08) ai.vel = 0;
  var nx = b.bossWorldX + ai.vel * dt;
  var minX = b.playerWorldX + BOSS_MIN_GAP_M;
  if(nx < minX){
    if(pushPlayer && ai.vel < 0){ b.playerWorldX = Math.max(0, nx - BOSS_MIN_GAP_M); }
    else { nx = minX; if(ai.vel < 0) ai.vel = 0; }
  }
  b.bossWorldX = nx;
  if(_bossAnimRate(b, ai, P) > 0) _bossSetAnim("walk"); else _bossSetAnim("idle");
}
/* 減速站定（施法 / 出手前），避免滑行攻擊 */
function _bossBrake(b, ai, P, dt){
  var maxDv = P.accel * dt;
  ai.vel += Math.max(-maxDv, Math.min(maxDv, -ai.vel));
  if(Math.abs(ai.vel) < 0.08) ai.vel = 0;
  var nx = b.bossWorldX + ai.vel * dt;
  var minX = b.playerWorldX + BOSS_MIN_GAP_M;
  if(nx < minX){ nx = minX; if(ai.vel < 0) ai.vel = 0; }
  b.bossWorldX = nx;
  if(_bossAnimRate(b, ai, P) > 0) _bossSetAnim("walk"); else _bossSetAnim("idle");
}
/* ===== rev-bossai2:end ===== */
;
/* ===== rev-animatk3:start ===== */
/* 17b 收尾：幀事件 AI / 武器幾何近戰 / 突進四段 / hurt 反饋。
   採「IIFE + 結尾指派」而非函式外科手術 —— 不掃描大括號、不正則匹配函式邊界，
   杜絕 v2 的截斷型語法破壞；且對原檔的宣告風格（function 或 window.x=）都免疫。 */
(function(){
'use strict';

var MIN_GAP  = (typeof BOSS_MIN_GAP_M === 'number') ? BOSS_MIN_GAP_M : 2.5;
var SAFE_Z   = (typeof BOSS_SAFE_ZONE_M === 'number') ? BOSS_SAFE_ZONE_M : 5;
var DETECT_R = (typeof BOSS_DETECT_R === 'number') ? BOSS_DETECT_R : 80;
var NORM_M   = (typeof BOSS_NORM_TO_M === 'number') ? BOSS_NORM_TO_M : 40;
var RM_I     = (typeof BOSS_RANGE_M === 'number') ? BOSS_RANGE_M : 4.5;
var RM_II    = (typeof BOSS_RANGE_M_II === 'number') ? BOSS_RANGE_M_II : 5.5;
var RM_HYD   = (typeof BOSS_RANGE_M_HYDRA === 'number') ? BOSS_RANGE_M_HYDRA : 7.0;

function isHydra(bid){ return (typeof isBossType === 'function') && isBossType(bid, 'hydra'); }
function isOmega(bid){ return (typeof isBossType === 'function') && isBossType(bid, 'omega'); }

function params(bid){
  /* rev-sweep-bossfix2: 唯一真相源 = BOSS_AI_PARAMS（含 mobile:false 定點 Boss） */
  if(typeof window._bossAIParams === 'function') return window._bossAIParams(bid);
  return { mobile:true, chase:2.2, stalk:1.2, retreat:1.0, home:2.2, accel:6.0, alertMs:700, meleeCd:1500, atkRange:RM_I };
}

function aiOf(b){
  if(!b._a3ai) b._a3ai = { state:'idle', stateAt:0, vel:0, homeX:b.bossWorldX };
  if(typeof b._a3ai.homeX !== 'number') b._a3ai.homeX = b.bossWorldX;
  return b._a3ai;
}

function animsOf(b){
  return (typeof BOSS_ANIMS !== 'undefined' && b) ? BOSS_ANIMS[b.bossId] : null;
}

/* 收招保護：非循環動畫播到 cancelFrom 之前，不接受 walk/idle 接手 */
function setAnim(name){
  if(typeof battleBossAnim === 'undefined') return;
  if(battleBossAnim.name === name) return;
  var b = (typeof battle !== 'undefined') ? battle : null;
  if(b && b._atkTL && b._atkTL.active) return;
  var A = animsOf(b);
  var cur = A && A[battleBossAnim.name];
  if(cur && cur.loop === false){
    var cf = (typeof battleBossAnim._cancelFrom === 'number') ? battleBossAnim._cancelFrom : cur.frameCount;
    if(battleBossAnim.frame < cf) return;
  }
  battleBossAnim.name = name;
  battleBossAnim.frame = 0;
  battleBossAnim.lastUpdate = performance.now();
  battleBossAnim.forcedEnd = 0;
  battleBossAnim._cancelFrom = 0;
}

function rate(b, P){
  b.bossAnimRate = Math.max(0.4, Math.min(2.6, Math.abs(aiOf(b).vel) / Math.max(0.6, P.stalk)));
}

function drive(b, ai, P, targetX, speed, dt){
  if(P.mobile === false){ ai.vel = 0; b.bossAnimRate = 1; setAnim('idle'); return; }
  var dx = targetX - b.bossWorldX;
  var want = (Math.abs(dx) < 0.06) ? 0 : (dx > 0 ? speed : -speed);
  var maxDv = P.accel * dt;
  ai.vel += Math.max(-maxDv, Math.min(maxDv, want - ai.vel));
  var nx = b.bossWorldX + ai.vel * dt;
  var minX = b.playerWorldX + MIN_GAP;
  if(nx < minX){ nx = minX; if(ai.vel < 0) ai.vel = 0; }
  b.bossWorldX = nx;
  rate(b, P);
  setAnim(Math.abs(ai.vel) > 0.15 ? 'walk' : 'idle');
}

function brake(b, ai, P, dt){
  if(P.mobile === false){ ai.vel = 0; b.bossAnimRate = 1; setAnim('idle'); return; }
  var maxDv = P.accel * dt;
  ai.vel += Math.max(-maxDv, Math.min(maxDv, 0 - ai.vel));
  if(Math.abs(ai.vel) < 0.02) ai.vel = 0;
  if(ai.vel !== 0){ b.bossWorldX = Math.max(b.playerWorldX + MIN_GAP, b.bossWorldX + ai.vel * dt); }
  rate(b, P);
  setAnim('idle');
}

function reachOf(b){
  var r = (typeof window._bossAttackReachM === 'function') ? window._bossAttackReachM(b.bossId, 'attack_swipe') : null;
  return (r != null && r > 0.5) ? r : params(b.bossId).atkRange;
}

function hitFrameOf(b, a){
  var m = (typeof window._bossAtkMeta === 'function') ? window._bossAtkMeta(b.bossId, 'attack_swipe') : null;
  return (m && typeof m.hitFrame === 'number') ? m.hitFrame : Math.max(1, a.frameCount - 3);
}

function resolveMelee(tl, b){
  var dmg = b.bossDmg * (b.bossDmgMult || 1);
  var pen = b.bossPenMM || 0;
  if(typeof window._bossMeleeResolve === 'function') window._bossMeleeResolve(tl, dmg, pen);
  else if(typeof tryHitPlayer === 'function') tryHitPlayer(dmg, pen);
}

/* ── 近戰：武器掃掠 reach + 短促突步（可被走位甩開 → MISS） ── */
function melee(){
  if(typeof battle === 'undefined' || !battle || !battle.active) return;
  var b = battle;
  if(isOmega(b.bossId) && typeof isOmegaArmBroken === 'function' && isOmegaArmBroken('ring_l')) return;
  var A = animsOf(b);
  var a = A && A.attack_swipe;
  if(!a || typeof window._bossAttackStart !== 'function') return;
  var hitF = hitFrameOf(b, a);
  var reachM = reachOf(b);
  var dist = Math.abs(b.bossWorldX - b.playerWorldX);
  var gap = reachM + 0.12;
  var lunge = null;
  if(dist > gap){
    var bud = Math.min(1.4, dist - gap);
    if(bud > 0.02 && params(b.bossId).mobile !== false) lunge = { targetX: b.playerWorldX + gap, speed: 3.4, budget: bud, spent: 0 };
  }
  window._bossAttackStart({
    anim: 'attack_swipe', kind: 'melee', lunge: lunge,
    windupMs: Math.round(hitF * 1000 / a.fps),
    onContact: function(tl){ resolveMelee(tl, b); }
  });
}

/* ── AI 主循環 ── */
function ai(dt, now){
  if(typeof battle === 'undefined' || !battle) return;
  var b = battle;
  if(b.settling) return;
if(b.sweep) return; /* rev-sweep-bossfix2 */
  var P = params(b.bossId);
  var S = aiOf(b);

  if(isOmega(b.bossId) && b.arms && typeof OMEGA_ARM_IDS !== 'undefined'){
    var anyAlive = OMEGA_ARM_IDS.some(function(id){ return b.arms[id] && b.arms[id].alive; });
    if(!anyAlive){
      if(b._atkTL){ b._atkTL.active = false; b._atkTL = null; }
      S.vel = 0; b.bossAnimRate = 1; setAnim('idle');
      return;
    }
  }
  if(b.playerWorldX < SAFE_Z) return;

  var dist = Math.abs(b.bossWorldX - b.playerWorldX);
  var pR = (typeof b.engagedRange === 'number' && b.engagedRange > 0) ? b.engagedRange : DETECT_R;

  if(b.bossDash){ dashTick(dt, now); return; }
  if(b._atkTL && b._atkTL.active) return;   /* 時間軸擁有動畫與位移 */
  if(b.bossCast) b.bossCast = null;         /* 清舊計時器殘留 */

  if(b.engaged && dist > pR && !b.bossRetreat){
    b.engaged = false; S.state = 'home'; S.stateAt = now;
  }
  if(!b.engaged){
    if(dist <= pR){
      b.engaged = true; S.state = 'alert'; S.stateAt = now; S.vel = 0;
      if(typeof playBossOneshot === 'function') playBossOneshot('skill_charge', P.alertMs);
    } else if(S.state === 'home'){
      drive(b, S, P, S.homeX, P.home, dt);
      if(Math.abs(b.bossWorldX - S.homeX) < 0.3){ S.vel = 0; b.bossAnimRate = 1; setAnim('idle'); S.state = 'idle'; }
      return;
    } else {
      S.vel = 0; b.bossAnimRate = 1; setAnim('idle'); return;
    }
  }

  if(typeof updateBossPhase === 'function') updateBossPhase();

  if(!b.skillCds){
    b.skillCds = {};
    var s0 = (typeof getBossSkillList === 'function') ? getBossSkillList(b.bossId) : (BOSS_SKILLS[b.bossId] || []);
    for(var i0 = 0; i0 < s0.length; i0++) b.skillCds[s0[i0].id] = now + 1500;
  }

  if(b.bossRetreat){
    drive(b, S, P, b.bossRetreat.targetWorldX, P.retreat, dt);
    if(b.bossWorldX >= b.bossRetreat.targetWorldX - 0.25){ b.bossRetreat = null; S.state = 'chase'; S.stateAt = now; }
    return;
  }
  if(S.state === 'alert'){
    S.vel = 0; b.bossAnimRate = 1;
    if(now - S.stateAt >= P.alertMs){ S.state = 'chase'; S.stateAt = now; }
    return;
  }
  if(typeof battleBossAnim !== 'undefined' && battleBossAnim.name === 'hurt'){ brake(b, S, P, dt); return; }
  if(now < (b._skillRecoverUntil || 0)){
    drive(b, S, P, b.playerWorldX + MIN_GAP, P.retreat, dt);
    return;
  }

  S.state = 'chase';
  var skills = (typeof getBossSkillList === 'function') ? getBossSkillList(b.bossId) : (BOSS_SKILLS[b.bossId] || []);
  var eff = b.phaseIdx;
  if(isOmega(b.bossId)){
    var guard = 0;
    while(guard++ < 4){
      var usable = skills.some(function(sk){
        var ph = (sk.unlockPhase === undefined) ? true : (eff >= sk.unlockPhase);
        return ph && !(typeof isOmegaSkillDisabled === 'function' && isOmegaSkillDisabled(sk));
      });
      if(usable) break;
      eff++;
    }
  }

  for(var si = 0; si < skills.length; si++){
    var sk = skills[si];
    var phOK = (sk.unlockPhase === undefined) ? true : (eff >= sk.unlockPhase);
    if(!phOK) continue;
    if(typeof isOmegaSkillDisabled === 'function' && isOmegaSkillDisabled(sk)) continue;
    if(now < (b.skillCds[sk.id] || 0)) continue;
    var rM = (sk.range || 0) * NORM_M;
    var minM = (sk.minRange || 0) * NORM_M;
    if(sk.type === 'dash'){
      if(dist < minM || dist > rM) continue;
      dashStart(sk, now);
      b.skillCds[sk.id] = now + sk.cd * 1000;
      return;
    }
    if(dist > rM) continue;
    var A2 = animsOf(b);
    if(!A2 || !A2[sk.anim] || typeof window._bossAttackStart !== 'function') continue;
    b.bossCast = { skill: sk, startTime: now };
    b.skillCds[sk.id] = now + sk.cd * 1000;
    var t0 = now, ref = sk;
    window._bossAttackStart({
      anim: sk.anim, kind: 'skill', sk: sk,
      windupMs: sk.hitDelay || sk.telegraph || 800,
      onContact: function(){ if(typeof applyBossSkillDamage === 'function') applyBossSkillDamage(ref); },
      onComplete: function(){
        if(typeof battle !== 'undefined' && battle){
          battle.bossCast = null;
          battle._skillRecoverUntil = t0 + (ref.totalTime || 1500);
        }
      }
    });
    if(typeof showBossTelegraph === 'function') showBossTelegraph(sk);
    return;
  }

  var atkR = reachOf(b) + 0.3 + 1.1;
  if(dist <= atkR){
    brake(b, S, P, dt);
    if(Math.abs(S.vel) < 0.2 && now - (b.lastMeleeAt || 0) > P.meleeCd){
      b.lastMeleeAt = now;
      melee();
    }
  } else {
    drive(b, S, P, b.playerWorldX + MIN_GAP, (dist > atkR * 3) ? P.chase : P.stalk, dt);
  }
}

/* ── 突進四段：warn(charge) → dash(leap) → 落地即接觸 → exhaust(移動收招) ── */
function dashStart(sk, now){
  if(typeof battle === 'undefined' || !battle) return;
  var b = battle;
  var distM = (sk.dashDistance || 0.35) * NORM_M;
  var speedM = (sk.dashSpeed || 0.55) * NORM_M;
  var dir = (b.playerWorldX < b.bossWorldX) ? -1 : 1;
  var targetWX = b.bossWorldX + dir * distM;
  if(dir < 0) targetWX = Math.max(targetWX, b.playerWorldX + MIN_GAP);
  b.bossDash = {
    skill: sk, state: 'warn', startTime: now,
    warnMs: sk.telegraph || 800, dir: dir, targetWorldX: targetWX,
    speedM: speedM, lastHit: 0,
    contactDmg: sk.contactDmg || 15, hitTickMs: sk.hitTickMs || 250,
    exhaustMs: sk.exhaustMs || 1500,
    flightProgress: 0, startX: b.bossWorldX, exhaustAt: 0
  };
  var A = animsOf(b);
  if(A && A.skill_charge && typeof window._bossAttackStart === 'function'){
    window._bossAttackStart({ anim: 'skill_charge', kind: 'pose', windupMs: b.bossDash.warnMs });
  }
  var fb = document.getElementById('fighter-boss');
  if(fb && !fb.querySelector('.boss-warning')){
    var w = document.createElement('div');
    w.className = 'boss-warning';
    w.textContent = '\u2757';
    fb.appendChild(w);
  }
}

function dashTick(dt, now){
  var b = (typeof battle !== 'undefined') ? battle : null;
  var d = b && b.bossDash;
  if(!d) return;
  var P = params(b.bossId);
  var S = aiOf(b);

  if(d.state === 'warn'){
    if(now - d.startTime >= d.warnMs){
      if(b._atkTL){ b._atkTL.active = false; b._atkTL = null; }
      d.state = 'dash'; d.startTime = now; d.flightProgress = 0; d.startX = b.bossWorldX;
      var w = document.querySelector('.boss-warning'); if(w) w.remove();
      var A = animsOf(b);
      if(A && A.leap){
        b._leapDrive = true;
        battleBossAnim.name = 'leap';
      } else {
        b._leapDrive = false;
        battleBossAnim.name = 'walk';
      }
      battleBossAnim.frame = 0;
      battleBossAnim.forcedEnd = 0;
      battleBossAnim._cancelFrom = 0;
      battleBossAnim.lastUpdate = now;
    }
    return;
  }

  if(d.state === 'dash'){
    var want = d.dir * d.speedM;
    var maxDv = P.accel * 2.5 * dt;
    S.vel += Math.max(-maxDv, Math.min(maxDv, want - S.vel));
    var nx = b.bossWorldX + S.vel * dt;
    if(d.dir < 0){
      var minX = b.playerWorldX + MIN_GAP;
      if(nx < minX){
        b.playerWorldX = Math.max(0, nx - MIN_GAP);
        if(now - (d.lastHit || 0) > d.hitTickMs){
          d.lastHit = now;
          var sc = (b.bossDmg || 25) / 25;
          if(typeof tryHitPlayer === 'function') tryHitPlayer(d.contactDmg * sc * (b.bossDmgMult || 1), b.bossPenMM || 0);
        }
      }
    }
    b.bossWorldX = nx;
    var span = Math.abs(d.targetWorldX - d.startX) || 1;
    d.flightProgress = Math.min(1, Math.abs(b.bossWorldX - d.startX) / span);
    b.bossAnimRate = Math.max(0.6, Math.min(2.6, Math.abs(S.vel) / Math.max(0.6, P.stalk)));
    var reached = (d.dir > 0 && b.bossWorldX >= d.targetWorldX) ||
                  (d.dir < 0 && b.bossWorldX <= d.targetWorldX) ||
                  Math.abs(b.bossWorldX - d.targetWorldX) < 0.5;
    if(reached){
      b.bossWorldX = d.targetWorldX;
      b._leapDrive = false;
      d.state = 'exhaust'; d.startTime = now; d.exhaustAt = now;
      b.lastMeleeAt = now;
      var A2 = animsOf(b);
      var a2 = A2 && A2.attack_swipe;
      if(a2 && typeof window._bossAttackStart === 'function'){
        var hitF = hitFrameOf(b, a2);
        var reachM = reachOf(b);
        var dist = Math.abs(b.bossWorldX - b.playerWorldX);
        var gap = reachM + 0.12;
        var lunge = null;
        if(dist > gap){
          var bud = Math.min(0.8, dist - gap);
          if(bud > 0.02 && params(b.bossId).mobile !== false) lunge = { targetX: b.playerWorldX + gap, speed: 3.4, budget: bud, spent: 0 };
        }
        window._bossAttackStart({
          anim: 'attack_swipe', kind: 'dashLand',
          startFrame: Math.max(0, hitF - 1),
          windupMs: Math.round(1000 / a2.fps),
          lunge: lunge,
          onContact: function(tl){ resolveMelee(tl, b); }
        });
      }
    }
    return;
  }

  if(d.state === 'exhaust'){
    if(b._atkTL && b._atkTL.active) return;
    drive(b, S, P, b.playerWorldX + MIN_GAP, P.retreat, dt);
    if(now - d.exhaustAt >= d.exhaustMs){ b.bossDash = null; S.state = 'chase'; S.stateAt = now; }
  }
}

/* ── hurt 反饋：外包 applyBossDamage，用血量/護甲/盾實際差值觸發 ── */
if(!window.__a3HurtWrapped && typeof applyBossDamage === 'function'){
  window.__a3HurtWrapped = true;
  var origABD = applyBossDamage;
  window.applyBossDamage = function(){
    var b = (typeof battle !== 'undefined') ? battle : null;
    var before = b ? (b.bossHp + b.bossArmor + (b.shieldHp || 0)) : 0;
    var out = origABD.apply(this, arguments);
    if(b && typeof window._bossHurtFlash === 'function'){
      var after = (b.bossHp + b.bossArmor + (b.shieldHp || 0));
      var shown = before - after;
      if(shown > 0) window._bossHurtFlash(shown, !!arguments[1]);
    }
    return out;
  };
}

window._bossSetAnim   = setAnim;
window.updateBossAI   = ai;
window.doBossMeleeSwipe = melee;
window.startBossDash  = dashStart;
window.updateBossDash = dashTick;
window._a3Params      = params;
window.__revAnimatk3  = { at: Date.now(), target: '17b-boss-combat.js', mode: 'append-override' };
})();
/* ===== rev-animatk3:end ===== */

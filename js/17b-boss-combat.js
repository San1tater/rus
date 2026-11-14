
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
function pushPlayerLeft(newBx){
  const b = battle;
  if(!b) return newBx;
  if(newBx < b.px){
    b.px = Math.max(0.05, newBx);
    if(newBx < b.px) newBx = b.px;
  }
  return newBx;
}

/* ============== AI 主循環 ============== */
function updateBossAI(dt, now){
  const b = battle;
  if(!b) return;
  if(b.settling) return;

  if(isBossType(b.bossId, 'omega') && b.arms){
    const _anyAlive = OMEGA_ARM_IDS.some(function(id){ return b.arms[id] && b.arms[id].alive; });
    if(!_anyAlive){
      if(BATTLE_BOSS_ONESHOT.indexOf(battleBossAnim.name) === -1){
        if(battleBossAnim.name !== 'idle'){
          battleBossAnim.name = 'idle';
          battleBossAnim.frame = 0;
          battleBossAnim.lastUpdate = performance.now();
        }
      }
      return;
    }
  }

  if(!b.engaged){
    const dx = b.bx - b.px;
    if(Math.abs(dx) < b.engagedRange) b.engaged = true;
    return;
  }

  updateBossPhase();

  if(!b.skillCds){
    b.skillCds = {};
    const skills = (typeof getBossSkillList === 'function') ? getBossSkillList(b.bossId) : (BOSS_SKILLS[b.bossId] || []);
    for(const sk of skills) b.skillCds[sk.id] = now + 1500;
  }

  if(b.bossDash){ updateBossDash(dt, now); return; }

  if(b.bossCast){
    const cast = b.bossCast;
    const elapsed = now - cast.startTime;
    if(!cast.applied && elapsed >= cast.skill.hitDelay){
      cast.applied = true;
      applyBossSkillDamage(cast.skill);
    }
    if(elapsed >= cast.skill.totalTime) b.bossCast = null;
    return;
  }

  if(b.bossRetreat){
    if(b.bx < b.bossRetreat.targetX - 0.001){
      const step = 0.025 * dt;
      b.bx = Math.min(b.bx + step, b.bossRetreat.targetX);
      if(BATTLE_BOSS_ONESHOT.indexOf(battleBossAnim.name) === -1){
        if(battleBossAnim.name !== 'walk'){
          battleBossAnim.name = 'walk';
          battleBossAnim.frame = 0;
          battleBossAnim.lastUpdate = performance.now();
        }
      }
      return;
    } else {
      b.bossRetreat = null;
    }
  }

  const dx = b.bx - b.px;
  const dist = Math.abs(dx);
  const playerRightN = getPlayerRightBoundaryN();
  const skills = (typeof getBossSkillList === 'function') ? getBossSkillList(b.bossId) : (BOSS_SKILLS[b.bossId] || []);

  let _effectivePhase = b.phaseIdx;
  if(isBossType(b.bossId, 'omega')){
    let _guard = 0;
    while(_guard++ < 4){
      const _usable = skills.some(function(sk){
        const phaseOK = (sk.unlockPhase === undefined) ? true : (_effectivePhase >= sk.unlockPhase);
        return phaseOK && !isOmegaSkillDisabled(sk);
      });
      if(_usable) break;
      _effectivePhase++;
    }
  }

  for(const sk of skills){
    const phaseOK = (sk.unlockPhase === undefined) ? true : (_effectivePhase >= sk.unlockPhase);
    if(!phaseOK) continue;
    if(isOmegaSkillDisabled(sk)) continue;
    if(now < (b.skillCds[sk.id] || 0)) continue;
    if(sk.type === 'dash'){
      const minR = sk.minRange || 0.15;
      if(dist < minR) continue;
      if(playerRightN < b.bx - sk.range) continue;
      startBossDash(sk, now);
      b.skillCds[sk.id] = now + sk.cd * 1000;
      return;
    } else {
      if(playerRightN < b.bx - sk.range) continue;
      b.bossCast = { skill: sk, startTime: now, applied: false };
      b.skillCds[sk.id] = now + sk.cd * 1000;
      if(typeof playBossOneshot === 'function') playBossOneshot(sk.anim, sk.totalTime);
      if(typeof showBossTelegraph === 'function') showBossTelegraph(sk);
      return;
    }
  }

  const _isII = (b.bossId.indexOf('_ii') >= 0);
  const bRange = _isII ? 0.22 : 0.18;
  let bossMoving = false;

  if(isBossType(b.bossId, 'hydra')){
    if(playerRightN >= b.bx - 0.30){
      if(now - (b.lastMeleeAt || 0) > 1500){
        b.lastMeleeAt = now;
        doBossMeleeSwipe();
      }
    }
  } else if(playerRightN < b.bx - bRange){
    const bspd = (_isII ? 0.075 : 0.055) * dt;
    const gap = (b.bx - bRange) - playerRightN;
    const step = -Math.min(bspd, gap);
    if(Math.abs(step) > 0.0001){
      let newBx = b.bx + step;
      if(step < 0) newBx = pushPlayerLeft(newBx);
      b.bx = clamp(newBx, 0.05 + BOSS_MIN_GAP, 0.95);
      bossMoving = true;
    }
  } else {
    if(now - (b.lastMeleeAt || 0) > 1500){
      b.lastMeleeAt = now;
      doBossMeleeSwipe();
    }
  }

  if(BATTLE_BOSS_ONESHOT.indexOf(battleBossAnim.name) === -1){
    const want = bossMoving ? 'walk' : 'idle';
    if(battleBossAnim.name !== want){
      battleBossAnim.name = want;
      battleBossAnim.frame = 0;
      battleBossAnim.lastUpdate = performance.now();
    }
  }
}

/* ============== 突進 ============== */
function startBossDash(sk, now){
  const b = battle;
  if(!b) return;
  const dir = Math.sign(b.px - b.bx) || 1;
  let targetX;
  if(dir < 0){
    const centerTarget = b.bx - (sk.dashDistance || 0.35);
    targetX = Math.max(centerTarget, b.px);
  } else {
    targetX = b.bx + dir * (sk.dashDistance || 0.35);
  }
  targetX = clamp(targetX, 0.05, 0.95);
  b.bossDash = {
    skill: sk,
    state: 'warn',
    startTime: now,
    warnMs: sk.telegraph || 800,
    dir: dir,
    targetX: targetX,
    speed: sk.dashSpeed || 0.55,
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
  const elapsed = now - d.startTime;

  if(d.state === 'warn'){
    if(battleBossAnim.name !== 'idle' && BATTLE_BOSS_ONESHOT.indexOf(battleBossAnim.name) === -1){
      battleBossAnim.name = 'idle';
      battleBossAnim.frame = 0;
      battleBossAnim.lastUpdate = now;
    }
    if(elapsed >= d.warnMs){
      d.state = 'dash';
      d.startTime = now;
      const w = document.querySelector('.boss-warning');
      if(w) w.remove();
      battleBossAnim.name = 'walk';
      battleBossAnim.frame = 0;
      battleBossAnim.lastUpdate = now;
    }
    return;
  }

  if(d.state === 'dash'){
    const step = d.speed * dt * d.dir;
    let newBx = b.bx + step;

    if(d.dir < 0){
      const _willContact = (newBx <= b.px);
      newBx = pushPlayerLeft(newBx);
      if(_willContact && (now - (d.lastHit || 0)) > d.hitTickMs){
        d.lastHit = now;
        const _contactScale = (b.bossDmg || 25) / 25;
        tryHitPlayer(d.contactDmg * _contactScale * (b.bossDmgMult || 1), b.bossPenMM || 0);
      }
    }

    b.bx = clamp(newBx, 0.05 + BOSS_MIN_GAP, 0.95);

    const reached =
      (d.dir > 0 && b.bx >= d.targetX) ||
      (d.dir < 0 && b.bx <= d.targetX) ||
      Math.abs(b.bx - d.targetX) < 0.005;
    if(reached){
      b.bx = clamp(d.targetX, 0.05 + BOSS_MIN_GAP, 0.95);
      d.state = 'exhaust';
      d.startTime = now;
      b.lastMeleeAt = now;
      doBossMeleeSwipe();
      battleBossAnim.name = 'idle';
      battleBossAnim.frame = 0;
      battleBossAnim.lastUpdate = now;
    }
    return;
  }

  if(d.state === 'exhaust'){
    if(battleBossAnim.name !== 'idle' && BATTLE_BOSS_ONESHOT.indexOf(battleBossAnim.name) === -1){
      battleBossAnim.name = 'idle';
      battleBossAnim.frame = 0;
      battleBossAnim.lastUpdate = now;
    }
    if(elapsed >= d.exhaustMs) b.bossDash = null;
    return;
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
  if(getPlayerRightBoundaryN() < b.bx - 0.30) return;
  if(typeof playBossOneshot === 'function') playBossOneshot('attack_swipe', 500);
  setTimeout(function(){
    if(!battle || !battle.active) return;
    if(getPlayerRightBoundaryN() < battle.bx - 0.30){
      spawnHitFx('boss', 0, 'MISS', 'armor');
      return;
    }
    tryHitPlayer(battle.bossDmg * (battle.bossDmgMult || 1), battle.bossPenMM || 0);
  }, 250);
}

/* ============== 技能傷害 ============== */
function applyBossSkillDamage(sk){
  if(!battle || !battle.active) return;
  if(sk.projectile && typeof spawnBossProjectile === 'function') spawnBossProjectile(sk);
  if(getPlayerRightBoundaryN() < battle.bx - sk.range){
    spawnHitFx('player', 0, 'MISS', 'armor');
    return;
  }
  const _skillScale = (battle.bossDmg || 25) / 25;
  tryHitPlayer(sk.dmg * _skillScale * (battle.bossDmgMult || 1), sk.penMM || 0);
  if(sk.knockback){
    const dir = Math.sign(battle.px - battle.bx) || 1;
    const newPx = clamp(battle.px + dir * sk.knockback, 0.05, 0.95);
    battle.px = Math.min(newPx, battle.bx - BOSS_MIN_GAP);
  }
}

/* ============== 玩家打 Boss ============== */
function applyBossDamage(dmg, isCrit, penMM, isThrowable, skipHitFx, forceNonWeak){
  if(!battle) return;
  battle.engaged = true;
  /* rev-fix-aim-pos: applyBossDamage 内取当前瞄准点作为火花位置 */
  const _aimPos = (typeof getAimTargetPos === 'function') ? getAimTargetPos() : { x: battle.bx, y: battle.by };

  if(isBossType(battle.bossId, 'hydra') && battle.heads){
    applyHydraDamage(dmg, isCrit, penMM, isThrowable);
    return;
  }

  if(battle.shieldMaxHp > 0 && !battle.shieldBroken && battle.shieldHp > 0){
    const _pen = penMM || 0;
    const _shieldScale = clamp(_pen / 32, 0.15, 1.0);
    const _shieldDmg = Math.max(1, Math.round(dmg * _shieldScale));
    battle.shieldHp = Math.max(0, battle.shieldHp - _shieldDmg);
    battle.damageDealt += _shieldDmg;
    if(!skipHitFx) spawnHitFx('boss', 0, '-' + _shieldDmg + (isCrit ? '!' : ''), 'armor', _aimPos.x, _aimPos.y); /* rev-fix-boss-shield-spark */
    const shEl = document.getElementById('boss-shield');
    if(shEl) shEl.style.width = Math.max(0, battle.shieldHp / battle.shieldMaxHp * 100) + '%';
    if(battle.shieldHp <= 0 && typeof breakBossShield === 'function') breakBossShield();
    return;
  }

  if(isThrowable){
    const _dmg = Math.round(dmg);
    battle.bossHp = Math.max(0, battle.bossHp - _dmg);
    battle.damageDealt += _dmg;
    if(!skipHitFx) spawnHitFx('boss', 0, '-' + _dmg + (isCrit ? '!' : ''), isCrit ? 'crit' : 'weak', _aimPos.x, _aimPos.y);
    if(!battle.bossRetreat){
      const hpPct = _dmg / Math.max(1, battle.bossMaxHp);
      const retreatDist = Math.min(0.20, hpPct * 8);
      if(retreatDist >= 0.01){
        battle.bossRetreat = { targetX: clamp(battle.bx + retreatDist, 0.05 + BOSS_MIN_GAP, 0.95) };
      }
    }
    if(battle.bossHp <= 0) endBattle(true);
    return;
  }

  const bossArmorLevel = BOSSES[battle.bossId] ? (BOSSES[battle.bossId].armorLevel || 0) : 0;
  const bossArmorMM = ARMOR_LEVEL_TO_MM[bossArmorLevel] || 0;

  const _isWeak = !forceNonWeak && (typeof isWeakPointHit === 'function' && isWeakPointHit());
  const _armorMMForHit = _isWeak ? 0 : bossArmorMM;

  const target = { hp: battle.bossHp, armor: battle.bossArmor };
  const res = applyDamage(target, dmg, penMM || 0, {
    armorMMOverride: _armorMMForHit
  });
  battle.bossHp = target.hp;
  battle.bossArmor = target.armor;
  battle.damageDealt += (res.hpLost + res.armorLost);

  const shownDmg = res.hpLost > 0 ? res.hpLost : res.armorLost;
  if(!skipHitFx) spawnHitFx('boss', 0, '-' + Math.round(shownDmg) + (isCrit ? '!' : ''), (res.hpLost > 0 ? (isCrit ? 'crit' : (_isWeak ? 'weak' : '')) : 'armor'), _aimPos.x, _aimPos.y);

  if(res.hpLost > 0 && !battle.bossRetreat && !isBossType(battle.bossId, 'hydra')){
    const hpPct = res.hpLost / Math.max(1, battle.bossMaxHp);
    const retreatDist = Math.min(0.20, hpPct * 8);
    if(retreatDist >= 0.01){
      battle.bossRetreat = { targetX: clamp(battle.bx + retreatDist, 0.05 + BOSS_MIN_GAP, 0.95) };
    }
  }

  if(battle.bossHp <= 0) endBattle(true);
}

/* ============== Hydra 多頭 ============== */
function applyHydraDamage(dmg, isCrit, penMM, isThrowable){
  if(!battle || !battle.heads) return;

  if(battle.bossArmor > 0 && !isThrowable){
    const bossArmorLevel = BOSSES[battle.bossId] ? (BOSSES[battle.bossId].armorLevel || 0) : 0;
    const bossArmorMM = ARMOR_LEVEL_TO_MM[bossArmorLevel] || 0;
    const proxy = { hp: 0, armor: battle.bossArmor };
    const r = applyDamage(proxy, dmg, penMM || 0, {
      armorMMOverride: bossArmorMM
    });
    battle.bossArmor = proxy.armor;
    battle.damageDealt += r.armorLost;
    spawnHitFx('boss', 0, '-' + r.armorLost + (isCrit ? '!' : ''), 'armor', battle.bx, battle.by); /* rev-fix-hydra-shield-spark */
    const apEl = document.getElementById('boss-ap');
    if(apEl) apEl.style.width = Math.max(0, battle.bossArmor / battle.bossMaxArmor * 100) + '%';
    return;
  }

  const isBodyPart = !/^(head_|neck_|eye|mouth)/.test(battle.aimPart);
  const adjustedDmg = isBodyPart ? Math.round(dmg * 0.7) : dmg;

  const targets = (typeof getHydraTargets === 'function') ? getHydraTargets(battle.aimPart) : [];
  if(!targets.length) return;

  const share = Math.max(1, Math.round(adjustedDmg / targets.length));
  for(const headId of targets){
    const head = battle.heads[headId];
    if(!head || !head.alive) continue;
    head.hp = Math.max(0, head.hp - share);
    battle.damageDealt += share;
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
      if(_aimIsDeadHead){
        battle.aimPart = defaultAimPartForBoss(battle.bossId);
      }
    }
  }

  battle.bossHp = HYDRA_HEAD_IDS.reduce(function(s, id){
    return s + (battle.heads[id].alive ? battle.heads[id].hp : 0);
  }, 0);

  if(HYDRA_HEAD_IDS.every(function(id){ return !battle.heads[id].alive; })){
    battle.bossHp = 0;
    endBattle(true);
    return;
  }

  if(typeof updateHeadBarsUI === 'function') updateHeadBarsUI();
}

/* ============== 子彈視覺 ============== */
function updateBullets(dt){
  if(!battle) return;
  const now = performance.now();

  for(let i = battle.bullets.length - 1; i >= 0; i--){
    const b = battle.bullets[i];
    
    if(b.startTime && b.duration) {
      b.t = (now - b.startTime) / b.duration;
    } else {
      b.t += dt * 3.5;
    }

    if(b.t >= 1){
      var _fxEl = document.getElementById('battle-fx');
      var _W = _fxEl ? _fxEl.clientWidth : 400;
      var _H = _fxEl ? _fxEl.clientHeight : 500;
      if(b.isGrenade){
        var _ppm = (typeof battle.bgPixelsPerMeter === 'number' && battle.bgPixelsPerMeter > 0)
          ? battle.bgPixelsPerMeter
          : ((_H > 0 ? _H : 500) * 0.4519 * CHAR_HEIGHT_FACTOR_BATTLE / PLAYER_HEIGHT_M);
        var _radG = 4.5 * _ppm;
        if(typeof _spawnExplosionSmoke === 'function') _spawnExplosionSmoke(battle, b.tx * _W, b.ty * _H, _radG);
      }
      battle.bullets.splice(i, 1);
      if(b._onHit) { window._lastBullet = b; try { b._onHit(); } catch(err){ console.error(err); } window._lastBullet = null; }
      continue;
    }
  }
  /* [v212] 移除彈幕 DOM 繪製，僅保留邏輯 */
}

/* ============== 戰鬥結束 ============== */
function endBattle(victory){
  if(!battle) return;
  if(battle.settling) return;
  const b = battle;
  b.settling = true;
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

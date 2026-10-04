/* ============================================================
   ★ BOSS MODULE — 行為 AI（Boss 為障礙物，玩家永遠在其左側）
   ============================================================ */
function getBossSkillList(bossId){
  return BOSS_SKILLS[bossId] || [];
}
function phaseUnlocksSkill(phaseIdx, skill){
  return (skill.unlockPhase === undefined) ? true : (phaseIdx >= skill.unlockPhase);
}
function updateBossPhase(){
  const b = battle;
  if(!b) return;
  const phases = BOSS_PHASES[b.bossId];
  if(!phases || phases.length === 0) return;
  const hpPct = b.bossMaxHp > 0 ? (b.bossHp / b.bossMaxHp) : 0;
  for(let i = phases.length - 1; i >= 0; i--){
    if(hpPct <= phases[i].hpPct && i > b.phaseIdx){
      b.phaseIdx = i;
      const p = phases[i];
      if(p.dmgMult !== undefined) b.bossDmgMult = p.dmgMult;
      if(p.healFull){
        const healed = b.healedPhases || [];
        if(!(p.repeatable === false && healed.includes(i))){
          b.bossHp = b.bossMaxHp;
          if(!b.healedPhases) b.healedPhases = [];
          b.healedPhases.push(i);
        }
      }
      notify(`⚠️ ${b.bossName} 進入第 ${i+1} 階段！`, 'error');
      break;
    }
  }
}
function showBossWarning(){
  const fb = document.getElementById('fighter-boss');
  if(!fb) return;
  if(fb.querySelector('.boss-warning')) return;
  const w = document.createElement('div');
  w.className = 'boss-warning';
  w.textContent = '❗';
  fb.appendChild(w);
}
function hideBossWarning(){
  const w = document.querySelector('.boss-warning');
  if(w) w.remove();
}

/* Boss 向左移動時推動玩家；返回 Boss 允許的最小 x */
function pushPlayerLeft(newBx){
  const b = battle;
  if(!b) return newBx;
  const leftLimit = b.px + BOSS_MIN_GAP;
  if(newBx < leftLimit){
    const push = leftLimit - newBx;
    const newPx = clamp(b.px - push, 0.05, 0.95);
    b.px = newPx;
    if(newBx < b.px + BOSS_MIN_GAP){
      newBx = b.px + BOSS_MIN_GAP;
    }
  }
  return newBx;
}

function updateBossAI(dt, now){
  const b = battle;
  if(!b) return;
  if(b.settling) return;

  if(!b.engaged){
    const dx = b.bx - b.px;
    if(Math.abs(dx) < b.engagedRange){
      b.engaged = true;
    }
    return;
  }

  updateBossPhase();

  if(!b.skillCds){
    b.skillCds = {};
    const skills = getBossSkillList(b.bossId);
    for(const sk of skills) b.skillCds[sk.id] = now + 1500;
  }

  if(b.bossDash){
    updateBossDash(dt, now);
    return;
  }

  if(b.bossCast){
    const cast = b.bossCast;
    const elapsed = now - cast.startTime;
    if(!cast.applied && elapsed >= cast.skill.hitDelay){
      cast.applied = true;
      applyBossSkillDamage(cast.skill);
    }
    if(elapsed >= cast.skill.totalTime){
      b.bossCast = null;
    }
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

  const skills = getBossSkillList(b.bossId);
  for(const sk of skills){
    if(!phaseUnlocksSkill(b.phaseIdx, sk)) continue;
    if(isOmegaSkillDisabled(sk)) continue;
    if(now < (b.skillCds[sk.id] || 0)) continue;
    if(sk.type === 'dash'){
      const minR = sk.minRange || 0.15;
      if(dist < minR || dist > sk.range) continue;
      startBossDash(sk, now);
      b.skillCds[sk.id] = now + sk.cd * 1000;
      return;
    } else {
      if(dist > sk.range) continue;
      b.bossCast = { skill: sk, startTime: now, applied: false };
      b.skillCds[sk.id] = now + sk.cd * 1000;
      playBossOneshot(sk.anim, sk.totalTime);
      showBossTelegraph(sk);
      return;
    }
  }

  const bRange = 0.14;
  let bossMoving = false;

  if(b.bossId === 'swamp_hydra'){
    /* ★ 沼澤九頭：完全不動，僅近戰範圍內咬擊 */
    if(dist <= bRange){
      if(now - (b.lastMeleeAt || 0) > 1500){
        b.lastMeleeAt = now;
        doBossMeleeSwipe();
      }
    }
  } else if(dist > bRange){
    const bspd = 0.028 * dt;
    const step = -Math.sign(dx) * Math.min(bspd, dist - bRange);
    if(Math.abs(step) > 0.0001){
      let newBx = b.bx + step;
      if(step < 0){
        newBx = pushPlayerLeft(newBx);
      }
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

function startBossDash(sk, now){
  const b = battle;
  if(!b) return;
  const dir = Math.sign(b.px - b.bx) || 1;
  const rawTarget = b.bx + dir * (sk.dashDistance || 0.35);
  const targetX = clamp(rawTarget, 0.05 + BOSS_MIN_GAP, 0.95);
  b.bossDash = {
    skill: sk,
    state: 'warn',
    startTime: now,
    warnMs: sk.telegraph || 800,
    dir,
    targetX,
    speed: sk.dashSpeed || 0.55,
    lastHit: 0,
    contactDmg: sk.contactDmg || 15,
    hitTickMs: sk.hitTickMs || 250,
    exhaustMs: sk.exhaustMs || 1500
  };
  showBossWarning();
  notify(`⚠️ ${b.bossName} 準備突進！`, 'error');
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
      hideBossWarning();
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
      /* 向左衝：撞到玩家就推 */
      const leftLimit = b.px + BOSS_MIN_GAP;
      if(newBx < leftLimit){
        const push = leftLimit - newBx;
        const newPx = clamp(b.px - push, 0.05, 0.95);
        b.px = newPx;
        if(newBx < b.px + BOSS_MIN_GAP){
          newBx = b.px + BOSS_MIN_GAP;
        }
        if((now - (d.lastHit||0)) > d.hitTickMs){
          d.lastHit = now;
          const _contactScale = (b.bossDmg || 25) / 25;
          tryHitPlayer(d.contactDmg * _contactScale * (b.bossDmgMult||1), b.bossPen||0);
        }
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
    if(elapsed >= d.exhaustMs){
      b.bossDash = null;
    }
    return;
  }
}

function showBossTelegraph(sk){
  const layer = document.getElementById('battle-fx');
  if(!layer) return;
  const W = layer.clientWidth || 400;
  const ratio = sk.telegraphRatio || sk.range;
  const diameterPx = Math.round(W * ratio * 2);
  const t = document.createElement('div');
  t.className = 'boss-telegraph' + (sk.aoe ? ' aoe' : '');
  t.style.left = (battle.bx * 100) + '%';
  t.style.top  = (battle.by * 100) + '%';
  t.style.width  = diameterPx + 'px';
  t.style.height = diameterPx + 'px';
  layer.appendChild(t);
  setTimeout(()=>t.remove(), (sk.totalTime||1500) + 100);
}

function tryHitPlayer(dmg, pen){
  if(!battle || !battle.active) return;
  const dodge = clamp(0.15 + state.player.level * 0.005, 0, 0.5);
  if(Math.random() < dodge){
    spawnHitFx(battle.px, battle.py, 'MISS', 'armor');
    return;
  }
  let finalDmg = dmg;
  let isCrit = false;
  if(Math.random() < (battle.bossCritRate||0)){
    finalDmg = Math.round(dmg * (battle.bossCritMult||1));
    isCrit = true;
  }
  const target = { hp: battle.playerHp, armor: battle.playerArmor };
  const res = applyDamage(target, finalDmg, pen||0);
  battle.playerHp = target.hp;
  battle.playerArmor = target.armor;
  const _hh=document.getElementById('hero-hp'),_ha=document.getElementById('hero-ap');
  if(_hh)_hh.style.width=Math.max(0,battle.playerHp/battle.playerMaxHp*100)+'%';
  if(_ha)_ha.style.width=Math.max(0,battle.playerArmor/battle.playerMaxArmor*100)+'%';
  spawnHitFx(battle.px, battle.py, isCrit ? `-${Math.round(finalDmg)}!` : `-${Math.round(finalDmg)}`, isCrit ? 'crit' : (res.hpLost > 0 ? 'enemy' : 'armor'));
  if(battle.playerHp <= 0){
    endBattle(false);
  } else if((res.hpLost > 0 || res.armorLost > 0) && !battle.bossRetreat){
    battle.bossRetreat = { targetX: clamp(battle.bx + 0.10, 0.05 + BOSS_MIN_GAP, 0.95) };
  }
}

function doBossMeleeSwipe(){
  if(!battle || !battle.active) return;
  const b = battle;
  if(b.bossId === 'core_omega' && isOmegaArmBroken('arm_lu_tip')) return;
  if(Math.abs(b.bx - b.px) > 0.30) return;
  playBossOneshot('attack_swipe', 500);
  setTimeout(()=>{
    if(!battle || !battle.active) return;
    const dist = Math.abs(battle.bx - battle.px);
    if(dist > 0.30){
      spawnHitFx(battle.bx, battle.by, 'MISS', 'armor');
      return;
    }
    tryHitPlayer(b.bossDmg * (b.bossDmgMult||1), b.bossPen);
  }, 250);
}

function getBossMuzzlePos(){
  const fx = document.getElementById('battle-fx');
  const bossSprite = document.getElementById('boss-sprite');
  if(!fx || !bossSprite) return { x: battle.bx, y: battle.by };
  const fxRect = fx.getBoundingClientRect();
  const spriteRect = bossSprite.getBoundingClientRect();
  if(fxRect.width === 0 || fxRect.height === 0) return { x: battle.bx, y: battle.by };
  const x = (spriteRect.left - fxRect.left + spriteRect.width  * 0.5) / fxRect.width;
  const y = (spriteRect.top  - fxRect.top  + spriteRect.height * 0.62) / fxRect.height;
  return { x, y };
}
function spawnBossProjectile(sk){
  if(!battle || !battle.active) return;
  const fx = document.getElementById('battle-fx');
  if(!fx) return;
  const type = sk.projectile;
  if(!type) return;
  const muzzle = getBossMuzzlePos();
  const n = (type === 'acid') ? 3 : 1;
  for(let i = 0; i < n; i++){
    setTimeout(() => {
      if(!battle || !battle.active) return;
      spawnSingleProjectile(fx, type, muzzle.x, muzzle.y);
    }, i * 90);
  }
}
function spawnSingleProjectile(fx, type, sx, sy){
  const tx = clamp(battle.px + (Math.random() - 0.5) * 0.05, 0.05, 0.95);
  const ty = clamp(battle.py + (Math.random() - 0.5) * 0.05, 0.05, 0.95);
  const wrap = document.createElement('div');
  wrap.className = 'boss-proj-wrap';
  wrap.style.left = (sx * 100) + '%';
  wrap.style.top  = (sy * 100) + '%';
  wrap.style.transition = 'left .5s cubic-bezier(.25,.8,.4,1), top .5s cubic-bezier(.25,.8,.4,1)';
  fx.appendChild(wrap);
  const inner = document.createElement('div');
  if(type === 'web'){
    inner.className = 'boss-proj web';
    const W = fx.clientWidth  || 400;
    const H = fx.clientHeight || 500;
    const dxPx = (tx - sx) * W;
    const dyPx = (ty - sy) * H;
    const ang = Math.atan2(dyPx, dxPx) * 180 / Math.PI;
    inner.style.transform = 'rotate(' + ang + 'deg)';
  } else {
    inner.className = 'boss-proj acid';
  }
  wrap.appendChild(inner);
  requestAnimationFrame(() => {
    wrap.style.left = (tx * 100) + '%';
    wrap.style.top  = (ty * 100) + '%';
  });
  setTimeout(() => {
    if(type === 'acid'){
      inner.style.transition = 'opacity .18s, transform .18s';
      inner.style.opacity = '0';
      inner.style.transform = (inner.style.transform || '') + ' scale(1.5)';
    } else {
      inner.style.transition = 'opacity .15s';
      inner.style.opacity = '0';
    }
    setTimeout(() => wrap.remove(), 200);
  }, 520);
}
function applyBossSkillDamage(sk){
  if(!battle || !battle.active) return;
  if(sk.projectile) spawnBossProjectile(sk);
  const dist = Math.abs(battle.bx - battle.px);
  if(dist > sk.range){
    spawnHitFx(battle.px, battle.py, 'MISS', 'armor');
    return;
  }
  const _skillScale = (battle.bossDmg || 25) / 25;
  tryHitPlayer(sk.dmg * _skillScale * (battle.bossDmgMult||1), sk.pen);
  if(sk.knockback){
    const dir = Math.sign(battle.px - battle.bx) || 1;
    const newPx = clamp(battle.px + dir * sk.knockback, 0.05, 0.95);
    battle.px = Math.min(newPx, battle.bx - BOSS_MIN_GAP);
  }
  if(!battle || !battle.active) return;
}

function battleLoop(now){
  if(!battle||!battle.active)return;
  const dt=Math.min(0.05,(now-battle.lastTime)/1000);battle.lastTime=now;
  const moveSpd=0.35*dt;

  if(battle.settling){
    updateBattleBossAnim(now);
    renderBattleHeroCanvas();
    renderBossBattleCanvas();
    const anims = BOSS_ANIMS[battle.bossId];
    const anim = anims && anims.death;
    if(anim && battleBossAnim.name === 'death' && battleBossAnim.frame >= anim.frameCount - 1 && !battle._settleScheduled){
      battle._settleScheduled = true;
      setTimeout(finishBattleSettle, 300);
    }
    requestAnimationFrame(battleLoop);
    return;
  }

  battle.firing = !battle.settling && !battle.reloading && !battle.consuming &&
                  ((battle.fireHeld && battle.fireMode==='掃射') || battle.burstLeft>0);

  const fxEl = document.getElementById('battle-fx');
  if(fxEl){
    const H = fxEl.clientHeight;
    if(H > 0 && battle.lastH !== H){
      battle.lastH = H;
      const bossSprite = document.getElementById('boss-sprite');
      const bossSize = Math.round(H * BATTLE_BOSS_HEIGHT_RATIO);
      const fxElW = fxEl ? fxEl.clientWidth : H;
      const maxHalfW = Math.floor(fxElW * Math.min(battle.bx, 1 - battle.bx) * 0.98);
      const bossWide = Math.max(bossSize, Math.min(Math.round(bossSize * 1.5), maxHalfW * 2));
      if(bossSprite){
        bossSprite.style.width = bossWide + 'px';
        bossSprite.style.height = bossSize + 'px';
      }
      const groundY = BATTLE_GROUND_TOP_RATIO;
      const playerFootPx = BATTLE_HERO_SPRITE_H * BATTLE_HERO_FOOT_Y_RATIO;
      battle.py = clamp(groundY - playerFootPx / H, 0, 1);
      battle.by = clamp(groundY - bossSize / H, 0, 1);
      updateFighterPos();
    }
  }

  const canMove = !battle.firing && !battle.reloading && !battle.consuming;
  const hasMoveInput = (battle.moveDir !== 0);

  if(canMove && hasMoveInput){
    let newPx = clamp(battle.px + battle.moveDir*moveSpd, 0.05, 0.95);
    /* 玩家永遠在 Boss 左側 */
    const pxMax = Math.max(0.05, battle.bx - BOSS_MIN_GAP);
    if(newPx > pxMax) newPx = pxMax;
    battle.px = newPx;
  }

  if(BATTLE_ONESHOT_ANIMS.indexOf(battleHeroAnim.name) === -1){
    if(canMove && hasMoveInput){
      if(battleHeroAnim.name !== 'walk'){
        battleHeroAnim.name='walk';
        battleHeroAnim.frame=0;
        battleHeroAnim.lastUpdate=performance.now();
      }
    } else {
      if(battleHeroAnim.name !== 'idle'){
        battleHeroAnim.name='idle';
        battleHeroAnim.frame=0;
        battleHeroAnim.lastUpdate=performance.now();
      }
    }
  }

  updateBossAI(dt, now);

  if(battle.firing){
    const interval=fireInterval(battle.fireMode,battle.weapon);
    if(now-battle.lastShot>interval){
      battle.lastShot=now;
      const fired=playerShoot();
      if(fired){ if(battle.burstLeft>0) battle.burstLeft--; }
      else battle.burstLeft=0;
    }
  }
  updateBullets(dt);updateFighterPos();if(battle.bossId==='swamp_hydra')updateHeadBarsUI();
  updateBattleHeroAnim(now);
  updateBattleBossAnim(now);
  renderBattleHeroCanvas();
  renderBossBattleCanvas();
  const heroHp=$('#hero-hp'),heroAp=$('#hero-ap'),bossHp=$('#boss-hp'),bossAp=$('#boss-ap'),bossShield=$('#boss-shield');
  if(heroHp)heroHp.style.width=Math.max(0,battle.playerHp/battle.playerMaxHp*100)+'%';
  if(heroAp)heroAp.style.width=Math.max(0,battle.playerArmor/battle.playerMaxArmor*100)+'%';
  if(bossHp)bossHp.style.width=Math.max(0,battle.bossHp/battle.bossMaxHp*100)+'%';
  if(bossAp)bossAp.style.width=Math.max(0,battle.bossArmor/battle.bossMaxArmor*100)+'%';
  if(bossShield && battle.shieldMaxHp>0)bossShield.style.width=Math.max(0,battle.shieldHp/battle.shieldMaxHp*100)+'%';
  if(!battle.settling&&!battle.consuming&&battle.playerHp/battle.playerMaxHp<(state.preferences.autoConsumeThreshold||0.3))autoConsumeInBattle();
  requestAnimationFrame(battleLoop);
}
function autoConsumeInBattle(){
  if(!battle) return;
  if(battle.consuming) return;
  if(performance.now() < (battle.healDisabledUntil||0)) return;
  if(battle.playerHp >= battle.playerMaxHp){
    battle.autoHealing = false;
    return;
  }
  if(!battle.autoHealing && battle.playerHp/battle.playerMaxHp >= (state.preferences.autoConsumeThreshold||0.3)) return;
  battle.autoHealing = true;
  const item = findNextConsumable();
  if(!item){ battle.autoHealing = false; return; }
  battle.consuming=true;
  battle.firing=false;
  if(battle.healTimer) clearTimeout(battle.healTimer);
  battle.healTimer = setTimeout(()=>{
    if(!battle||!battle.active){ battle.consuming=false; battle.healTimer=null; return; }
    const medbayLv=getBuildingLv('medbay');
    const actualHeal=Math.round(CONSUMABLES[item.id].heal*(RARITY_MULT[item.rarity]||1)*(1+medbayLv*0.15));
    battle.playerHp=Math.min(battle.playerMaxHp,battle.playerHp+actualHeal);
    invRemove(item.id,item.rarity,1);
    battle.consuming=false;
    battle.healTimer=null;
    pushLog(`<span class="pl">玩家</span> 使用 ${itemDef(item.id).name}，恢復 ${actualHeal} HP。`,[],'combat');
    if(battle.playerHp < battle.playerMaxHp){
      autoConsumeInBattle();
    } else {
      battle.autoHealing = false;
    }
  },1200);
}
function manualHeal(){
  if(!battle||!battle.active)return;
  if(battle.settling)return;
  if(battle.consuming||battle.reloading)return;
  if(performance.now() < (battle.healDisabledUntil||0)){ notify('治療冷卻中','error'); return; }
  if(battle.playerHp >= battle.playerMaxHp){ notify('生命值已滿','error'); return; }
  const item = findNextConsumable();
  if(!item){ notify('沒有可用的消耗品','error'); return; }
  battle.consuming=true;
  battle.firing=false;
  battle.autoHealing = false;
  if(battle.healTimer) clearTimeout(battle.healTimer);
  battle.healTimer = setTimeout(()=>{
    if(!battle||!battle.active){ battle.consuming=false; battle.healTimer=null; return; }
    const medbayLv=getBuildingLv('medbay');
    const actualHeal=Math.round(CONSUMABLES[item.id].heal*(RARITY_MULT[item.rarity]||1)*(1+medbayLv*0.15));
    battle.playerHp=Math.min(battle.playerMaxHp,battle.playerHp+actualHeal);
    invRemove(item.id,item.rarity,1);
    battle.consuming=false;
    battle.healTimer=null;
    pushLog(`<span class="pl">玩家</span> 使用 ${itemDef(item.id).name}，恢復 ${actualHeal} 生命。`,[],'combat');
    refreshBattleControlsLive();
  },1200);
  refreshBattleControlsLive();
}
function fireInterval(mode,weapon){
  const def=weapon?weapon.def:null;
  const rpm=def&&def.rpm?def.rpm:600;
  const maxInterval=60000/rpm;
  let base={'點射':350,'短點射':180,'長點射':120,'掃射':90,'近戰':500,'投擲':800}[mode]||300;
  if(mode==='點射')base=maxInterval;
  if(mode==='短點射'||mode==='長點射'||mode==='掃射')base=Math.max(maxInterval,90);
  return Math.max(maxInterval,base);
}
const FIRE_BURST_COUNT = {'點射':1, '短點射':3, '長點射':7, '近戰':1, '投擲':1};
function startPlayerFire(){
  if(!battle || !battle.active) return;
  if(battle.settling) return;
  if(battle.reloading) return;
  if(battle.consuming){
    if(battle.healTimer){ clearTimeout(battle.healTimer); battle.healTimer=null; }
    battle.consuming=false;
    battle.autoHealing=false;
    const now=performance.now();
    if(now >= (battle.healDisabledUntil||0)){
      battle.healDisabledUntil = now + 2000;
    }
    refreshBattleControlsLive();
  }

  const wdef = battle.weapon && battle.weapon.def;
  const rpm = (wdef && wdef.rpm) ? wdef.rpm : 600;
  const cdMs = 60000 / rpm;
  const now = performance.now();
  if(now - (battle.lastManualClick || 0) < cdMs) return;
  battle.lastManualClick = now;

  if(battle.moveDir !== 0){
    battle.moveDir = 0;
    const stick = document.getElementById('stick');
    if(stick){ stick.style.left='50%'; stick.style.top='50%'; stick.style.transform='translate(-50%,-50%)'; }
  }

  if(battle.fireMode === '掃射'){
    battle.fireHeld = true;
  } else {
    const n = FIRE_BURST_COUNT[battle.fireMode] || 1;
    battle.burstLeft = Math.min(30, (battle.burstLeft || 0) + n);
  }
}
function stopPlayerFire(){
  if(!battle) return;
  battle.fireHeld = false;
}

function getPlayerMuzzlePos(){
  const fx = document.getElementById('battle-fx');
  const W = fx ? fx.clientWidth : 400;
  const H = fx ? fx.clientHeight : 500;
  const spriteW = 88, spriteH = BATTLE_HERO_SPRITE_H;

  const B = { x:30, y:30, w:340, h:460 };
  const ORIG_CHAR_H = 386;
  const ORIG_FOOT_X = 200;
  const ORIG_FOOT_Y = 515;
  const scale = (spriteH * CHAR_HEIGHT_FACTOR_BATTLE) / ORIG_CHAR_H;
  const groundY_local = spriteH * 0.95;
  const centerX_local = spriteW / 2;

  const eq = state.player.equipped;
  let wpSlot = null, wpId = null;
  if(battle.weaponSlot && eq[battle.weaponSlot]){
    wpSlot = battle.weaponSlot; wpId = eq[battle.weaponSlot];
  } else if(eq.primary){ wpSlot = 'primary'; wpId = eq.primary; }
  else if(eq.secondary){ wpSlot = 'secondary'; wpId = eq.secondary; }
  else if(eq.melee){ wpSlot = 'melee'; wpId = eq.melee; }

  let localX = centerX_local;
  let localY = groundY_local - spriteH * 0.4;

  if(wpSlot && wpId){
    const cfg = getWeaponCfg(wpSlot, wpId);
    if(cfg){
      const L = GAME_LAYERS.find(l => l.id === cfg.layer);
      if(L){
        const cx = B.x + B.w * L.x;
        const cy = B.y + B.h * L.y;
        const w  = B.w * L.w;
        const h  = B.h * L.h;
        const px = w * L.pivot.x;
        const py = h * L.pivot.y;
        const localXinChar = px + w * (cfg.ox || 0);
        const localYinChar = py + h * (cfg.oy || 0);
        const weaponCenterCharX = cx - px + localXinChar;
        const weaponCenterCharY = cy - py + localYinChar;
        const weaponW = 400 * (cfg.scale || 0.3);
        const rightCharX = weaponCenterCharX + weaponW / 2;

        localX = centerX_local + scale * (rightCharX - ORIG_FOOT_X);
        localY = groundY_local + scale * (weaponCenterCharY - ORIG_FOOT_Y);
      }
    }
  }

  return {
    x: (battle.px * W - spriteW / 2 + localX) / W,
    y: (battle.py * H + localY) / H
  };
}

function slotCanFire(slot){
  if(!battle) return false;
  const w = equippedWeapon(slot);
  if(!w) return false;
  const def = w.def;
  if(def.slot === 'melee') return true;
  if(def.slot === 'throwable') return getThrowableCount() > 0;
  if(!def.cal) return true;
  const st = battle.weaponStates && battle.weaponStates[slot];
  if(st){
    if((st.ammoInMag||0) > 0) return true;
    if(st.ammoRef && st.ammoRef.count > 0) return true;
  }
  const ammo = pickAmmoByPreference(def.cal,'combat');
  return !!ammo;
}
function autoSwitchOnNoAmmo(){
  if(!battle) return false;
  const order = ['primary','secondary','melee'];
  const curIdx = order.indexOf(battle.weaponSlot);
  if(curIdx < 0) return false;
  for(let i = curIdx + 1; i < order.length; i++){
    const nextSlot = order[i];
    if(nextSlot === 'melee'){
      if(state.player.equipped.melee && equippedWeapon('melee')){
        switchBattleWeapon('melee');
        notify('彈藥耗盡，切換至近戰武器','error');
        return true;
      }
    } else {
      if(slotCanFire(nextSlot)){
        switchBattleWeapon(nextSlot);
        notify(`切換至${nextSlot==='primary'?'主武器':'副武器'}`,'error');
        return true;
      }
    }
  }
  return false;
}
function playerShoot(){
  if(battle.settling)return false;
  let w=battle.weapon;
  if(!w||battle.reloading||battle.consuming)return false;
  if(battle.moveDir!==0)return false;
  let def=w.def;
  const dist=Math.abs(battle.bx-battle.px);
  if(dist>battle.playerWeaponRange+0.05){if(Math.random()<0.05)notify('超出武器射程','error');return false;}
  const isMelee = def.slot === 'melee';

  if(def.cal && battle.ammoInMag <= 0){
    if(!(battle.ammoRef && battle.ammoRef.count > 0)){
      const switched = autoSwitchOnNoAmmo();
      if(!switched){
        battle.firing = false;
        battle.burstLeft = 0;
      }
      return false;
    }
  }

  if(battle.weaponSlot === 'secondary'){
    battleHeroAnim.name='fire_secondary';
    battleHeroAnim.frame=0;
    battleHeroAnim.lastUpdate=performance.now();
    battleHeroAnim.forcedEnd=performance.now()+350;
  } else if(battle.weaponSlot === 'melee'){
    battleHeroAnim.name='attack_melee';
    battleHeroAnim.frame=0;
    battleHeroAnim.lastUpdate=performance.now();
    battleHeroAnim.forcedEnd=performance.now()+600;
  } else {
    battleHeroAnim.name='fire_primary';
    battleHeroAnim.frame=0;
    battleHeroAnim.lastUpdate=performance.now();
    battleHeroAnim.forcedEnd=performance.now()+350;
  }
  const isWeak = isWeakPointHit();
  if(def.cal){
    if(battle.ammoInMag<=0){
      battle.reloading=true;battle.firing=false;battle.burstLeft=0;
      refreshBattleControlsLive();
      battleHeroAnim.name='reload';
      battleHeroAnim.frame=0;
      battleHeroAnim.lastUpdate=performance.now();
      battleHeroAnim.forcedEnd=performance.now()+1700;
      const currentSlot=battle.weaponSlot;
      setTimeout(()=>{
        if(!battle||!battle.active)return;
        if(battle.weaponSlot!==currentSlot)return;
        const need=def.mag||30;const take=Math.min(need,battle.ammoRef.count);
        invRemove(battle.ammoRef.id,battle.ammoRef.rarity,take);
        battle.ammoInMag=take;battle.ammoRef.count-=take;
        battle.weaponStates[battle.weaponSlot]={ammoInMag:battle.ammoInMag,ammoRef:battle.ammoRef};
        battle.reloading=false;
        if(battleHeroAnim.name==='reload'){battleHeroAnim.name='idle';battleHeroAnim.frame=0;}
        refreshBattleControlsLive();
      },1700);
      return false;
    }
    battle.ammoInMag--;
    const mz = getPlayerMuzzlePos();
    const target = getAimTargetPos();
    const shotCount = 1 + Math.floor(Math.random()*3);
    for(let s=0;s<shotCount;s++){
      const jx = (Math.random()-0.5)*0.03;
      const jy = (Math.random()-0.5)*0.03;
      battle.bullets.push({sx:mz.x,sy:mz.y,tx:clamp(target.x+jx,0,1),ty:clamp(target.y+jy,0,1),t:0,player:true});
    }
    const hitRate=getHitRate(def.type,battle.fireMode,def.scopeBonus||0);
    const baseDmg=Math.round(battle.ammoRef?AMMO[battle.ammoRef.id].dmg*(RARITY_MULT[battle.ammoRef.rarity]||1):20);
    const ammoPen=battle.ammoRef?(AMMO[battle.ammoRef.id].pen||0):0;
    const critRate=calcCritRate(w.rarity,battle.ammoRef?battle.ammoRef.rarity:'一般');
    const critMult=calcCritMult(w.rarity,battle.ammoRef?battle.ammoRef.rarity:'一般');
    const pellets=battle.ammoRef?(AMMO[battle.ammoRef.id].pellets||1):1;
    for(let p=0;p<pellets;p++){
      if(Math.random()*100<hitRate){
        let dmg=baseDmg;let isCrit=false;
        if(Math.random()<critRate){dmg=Math.round(dmg*critMult);isCrit=true;}
        if(isWeak){
          battle.engaged = true;
          battle.bossHp = Math.max(0, battle.bossHp - dmg);
          battle.damageDealt += dmg;
          spawnHitFx(battle.bx, battle.by, `-${dmg}${isCrit?'!':''}`, isCrit?'crit':'weak');
          if(battle.bossId === 'core_omega' && battle.arms) damageOmegaArm(battle.aimPart, dmg);
          if(battle.bossHp <= 0){ endBattle(true); return true; }
        } else {
          applyBossDamage(dmg,isCrit,ammoPen);
          if(battle.bossHp <= 0) return true;
        }
      }
    }
  } else {
    if(def.slot==='throwable'){
      if(getThrowableCount()<=0){if(!ensureThrowableFromBackpack()){battle.firing=false;battle.burstLeft=0;notify('沒有可用的投擲物','error');return false;}const nw=equippedWeapon('throwable');if(nw){battle.weapon=nw;w=nw;def=nw.def;}}
      state.player.throwableStock--;
      battle.ammoInMag=getThrowableCount();
      if(battle.weaponStates[battle.weaponSlot])battle.weaponStates[battle.weaponSlot].ammoInMag=battle.ammoInMag;
      if(state.player.throwableStock<=0){if(ensureThrowableFromBackpack()){const nw=equippedWeapon('throwable');if(nw){battle.weapon=nw;w=nw;def=nw.def;}battle.ammoInMag=getThrowableCount();if(battle.weaponStates[battle.weaponSlot])battle.weaponStates[battle.weaponSlot].ammoInMag=battle.ammoInMag;}}
    }
    const hitRate=getHitRate(def.type,battle.fireMode)+10;
    const baseDmg=Math.round((def.dmg||0)*(RARITY_MULT[w.rarity]||1));
    const critRate=calcCritRate(w.rarity,'一般');
    const critMult=calcCritMult(w.rarity,'一般');
    const mz = getPlayerMuzzlePos();
    const target = getAimTargetPos();
    if(!isMelee){
      const isArc = def.slot === 'throwable';
      battle.bullets.push({sx:mz.x,sy:mz.y,tx:target.x,ty:target.y,t:0,player:true,big:true,arc:isArc});
    }
    const hits=isMelee?getMeleeHits(def.rpm):1;
    for(let i=0;i<hits;i++){
      if(Math.random()*100<hitRate){
        let dmg=baseDmg;let isCrit=false;
        if(Math.random()<critRate){dmg=Math.round(dmg*critMult);isCrit=true;}
        if(isWeak){
          battle.engaged = true;
          battle.bossHp = Math.max(0, battle.bossHp - dmg);
          battle.damageDealt += dmg;
          spawnHitFx(battle.bx, battle.by, `-${dmg}${isCrit?'!':''}`, isCrit?'crit':'weak');
          if(battle.bossId === 'core_omega' && battle.arms) damageOmegaArm(battle.aimPart, dmg);
          if(battle.bossHp <= 0){ endBattle(true); return true; }
        } else {
          applyBossDamage(dmg,isCrit,0);
          if(battle.bossHp <= 0) return true;
        }
      }
    }
  }
  addProf(battle.weaponSlot,0.01);
  if(def.type)addProf(def.type,0.01);
  refreshBattleControlsLive();
  return true;
}
/* ★ core_omega 四臂系統 ★ */
const OMEGA_ARM_TIP_IDS = ['arm_lu_tip'];
const OMEGA_ARM_HP = 10000;
const OMEGA_SKILL_TO_ARM = { melee:'arm_lu_tip' };
function initOmegaArms(){
  battle.arms = {};
  for(const id of OMEGA_ARM_TIP_IDS){ battle.arms[id] = { hp: OMEGA_ARM_HP, max: OMEGA_ARM_HP, alive: true }; }
}
function getOmegaArmIdOfLayer(layerId){
  const m = layerId.match(/^(arm_lu)_/);
  if(!m) return null;
  return 'arm_lu_tip';
}
function damageOmegaArm(armId, dmg){
  if(!battle || !battle.arms) return;
  const arm = battle.arms[armId];
  if(!arm || !arm.alive) return;
  arm.hp = Math.max(0, arm.hp - dmg);
  if(arm.hp <= 0){
    arm.alive = false;
    playHeadBreakFx(armId);
    if(battle.aimPart === armId){
      battle.aimPart = 'core';
    }
  }
}
function isOmegaArmBroken(armId){
  if(!battle || !battle.arms) return false;
  const arm = battle.arms[armId];
  return !!arm && !arm.alive;
}
function isOmegaSkillDisabled(sk){
  if(!battle || battle.bossId !== 'core_omega') return false;
  if(!sk.armRequired) return false;
  return isOmegaArmBroken(sk.armRequired);
}

/* ★ swamp_hydra 獨立頭部 HP 系統 ★ */
const HYDRA_HEAD_IDS = ['head_1','head_2','head_3','head_4','head_5','head_6','head_7'];
const HYDRA_HEAD_HP = 12857;
const HYDRA_NECK_MAP = { neck_1:'head_1', neck_2:'head_2', neck_3:'head_3', neck_4:'head_4', neck_5:'head_5', neck_6:'head_6', neck_7:'head_7' };
function initHydraHeads(){
  battle.heads = {};
  for(const id of HYDRA_HEAD_IDS){ battle.heads[id] = { hp: HYDRA_HEAD_HP, max: HYDRA_HEAD_HP, alive: true }; }
  battle.bossMaxHp = HYDRA_HEAD_HP * HYDRA_HEAD_IDS.length;
  battle.bossHp = battle.bossMaxHp;
}
function getHeadOwnerOfLayer(layerId){
  if(!battle) return null;
  const def = BOSS_LAYERS[battle.bossId];
  if(!def) return null;
  let cur = def.layers.find(l => l.id === layerId);
  const seen = new Set();
  while(cur && !seen.has(cur.id)){
    if(/^head_\d+$/.test(cur.id)) return cur.id;
    seen.add(cur.id);
    cur = cur.anchor ? def.layers.find(l => l.id === cur.anchor.target) : null;
  }
  return null;
}
function pickHeadForPoint(px, py, def, world, anim, fi){
  for(let i = 1; i <= 7; i++){
    const hid = 'head_' + i;
    const L = def.layers.find(x => x.id === hid);
    if(!L) continue;
    const k = (anim.keys && anim.keys[hid] && anim.keys[hid][fi]) || {rot:0,dx:0,dy:0};
    const w = def.canvas.w * (k.w !== undefined ? k.w : L.w);
    const h = def.canvas.h * (k.h !== undefined ? k.h : L.h);
    const pivotX = w * L.pivot.x;
    const pivotY = h * L.pivot.y;
    const wp = world[hid]; if(!wp) continue;
    const rot = wp.rot * Math.PI / 180;
    const cos = Math.cos(-rot), sin = Math.sin(-rot);
    const dx = px - wp.wx;
    const dy = py - wp.wy;
    const lx = dx * cos - dy * sin + pivotX;
    const ly = dx * sin + dy * cos + pivotY;
    if(lx >= 0 && lx <= w && ly >= 0 && ly <= h) return hid;
  }
  let bestId = null, bestD = Infinity;
  for(let i = 1; i <= 7; i++){
    const hid = 'head_' + i;
    const hw = world[hid]; if(!hw) continue;
    const dx = px - hw.wx, dy = py - hw.wy;
    const d = dx*dx + dy*dy;
    if(d < bestD){ bestD = d; bestId = hid; }
  }
  return bestId;
}
function findNearestHeadForLayer(layerId){
  if(!battle) return null;
  const def = BOSS_LAYERS[battle.bossId]; if(!def) return null;
  const anims = BOSS_ANIMS[battle.bossId]; if(!anims) return null;
  const anim = anims[battleBossAnim.name] || anims.idle; if(!anim) return null;
  const fi = ((battleBossAnim.frame % anim.frameCount) + anim.frameCount) % anim.frameCount;
  const world = resolveBossWorld(def, anim, fi);
  const _isEM = /^(eyes|mouth)/.test(layerId);
  if(!_isEM){
    const self = world[layerId]; if(!self) return null;
    return pickHeadForPoint(self.wx, self.wy, def, world, anim, fi);
  }
  const _emIds = def.layers.filter(L => /^(eyes|mouth)/.test(L.id)).map(L => L.id);
  const _group = [];
  const _visited = new Set();
  const _queue = [layerId];
  while(_queue.length){
    const cur = _queue.shift();
    if(_visited.has(cur)) continue;
    _visited.add(cur);
    _group.push(cur);
    const cL = def.layers.find(x => x.id === cur);
    if(!cL) continue;
    for(const oid of _emIds){
      if(_visited.has(oid)) continue;
      const oL = def.layers.find(x => x.id === oid);
      if(!oL) continue;
      const linked = (oL.anchor && oL.anchor.target === cur) ||
                     (cL.anchor && cL.anchor.target === oid);
      if(linked) _queue.push(oid);
    }
  }
  let sx = 0, sy = 0, cnt = 0;
  for(const gid of _group){
    const w = world[gid];
    if(w){ sx += w.wx; sy += w.wy; cnt++; }
  }
  if(cnt === 0) return null;
  return pickHeadForPoint(sx / cnt, sy / cnt, def, world, anim, fi);
}
function getHydraTargets(aimPart){
  if(battle.heads[aimPart] && battle.heads[aimPart].alive) return [aimPart];
  if(HYDRA_NECK_MAP[aimPart]){
    const h = HYDRA_NECK_MAP[aimPart];
    if(battle.heads[h] && battle.heads[h].alive) return [h];
    return [];
  }
  if(/^(eyes|mouth)/.test(aimPart)){
    const owner = findNearestHeadForLayer(aimPart);
    if(owner && battle.heads[owner] && battle.heads[owner].alive) return [owner];
    return [];
  }
  return HYDRA_HEAD_IDS.filter(h => battle.heads[h].alive);
}
function getHeadScreenPos(headId){
  if(!battle) return null;
  const def = BOSS_LAYERS[battle.bossId]; if(!def) return null;
  const anims = BOSS_ANIMS[battle.bossId]; if(!anims) return null;
  const anim = anims[battleBossAnim.name] || anims.idle; if(!anim) return null;
  const fi = ((battleBossAnim.frame % anim.frameCount) + anim.frameCount) % anim.frameCount;
  const world = resolveBossWorld(def, anim, fi);
  const wp = world[headId]; if(!wp) return null;
  const bossSprite = document.getElementById('boss-sprite');
  const fxEl = document.getElementById('battle-fx');
  if(!bossSprite || !fxEl) return null;
  const W = fxEl.clientWidth, H = fxEl.clientHeight;
  const spriteW = bossSprite.clientWidth || 280;
  const spriteH = bossSprite.clientHeight || 280;
  const spriteLeft = battle.bx * W - spriteW / 2;
  const spriteTop = battle.by * H;
  return {
    x: (spriteLeft + (wp.wx / def.canvas.w) * spriteW) / W,
    y: (spriteTop + (wp.wy / def.canvas.h) * spriteH) / H
  };
}
function playHeadBreakFx(headId){
  const layer = document.getElementById('battle-fx');
  if(!layer || !battle) return;
  const pos = getHeadScreenPos(headId); if(!pos) return;
  const fx = document.createElement('div');
  fx.className = 'head-break-fx';
  fx.style.left = (pos.x * 100) + '%';
  fx.style.top  = (pos.y * 100) + '%';
  const glow = document.createElement('div');
  glow.className = 'glow'; fx.appendChild(glow);
  for(let i = 0; i < 16; i++){
    const frag = document.createElement('div');
    frag.className = (i % 2 === 0) ? 'frag' : 'blood';
    const ang = (i / 16) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
    const dist = 35 + Math.random() * 60;
    const dx = Math.cos(ang) * dist, dy = Math.sin(ang) * dist;
    frag.animate([
      { transform: 'translate(0,0) scale(1) rotate(0deg)', opacity: 1 },
      { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(0.4) rotate(' + (Math.random()*360-180) + 'deg)', opacity: 0 }
    ], { duration: 550 + Math.random() * 250, easing: 'cubic-bezier(.2,.8,.4,1)', fill: 'forwards' });
    fx.appendChild(frag);
  }
  layer.appendChild(fx);
  setTimeout(() => fx.remove(), 900);
  const bar = document.getElementById('head-bar-' + headId.replace('head_', ''));
  if(bar) bar.remove();
}
function updateHeadBarsUI(){
  if(!battle || battle.bossId !== 'swamp_hydra' || !battle.heads) return;
  const container = document.getElementById('head-bars'); if(!container) return;
  const def = BOSS_LAYERS[battle.bossId]; if(!def) return;
  const anims = BOSS_ANIMS[battle.bossId];
  const anim = anims ? (anims[battleBossAnim.name] || anims.idle) : null; if(!anim) return;
  const fi = ((battleBossAnim.frame % anim.frameCount) + anim.frameCount) % anim.frameCount;
  const world = resolveBossWorld(def, anim, fi);
  const bossSprite = document.getElementById('boss-sprite');
  const fxEl = document.getElementById('battle-fx');
  if(!bossSprite || !fxEl) return;
  const W = fxEl.clientWidth, H = fxEl.clientHeight;
  const spriteW = bossSprite.clientWidth || 280;
  const spriteH = bossSprite.clientHeight || 280;
  const spriteLeft = battle.bx * W - spriteW / 2;
  const spriteTop = battle.by * H;
  const _fit = def.autoFit ? computeBossFit(def, battle.bossId, spriteW, spriteH) : null;
  const _baseSx = spriteW / def.canvas.w;
  const _baseSy = spriteH / def.canvas.h;
  for(let i = 1; i <= 7; i++){
    const headId = 'head_' + i;
    const head = battle.heads[headId]; if(!head) continue;
    let bar = document.getElementById('head-bar-' + i);
    if(!head.alive){ if(bar) bar.remove(); continue; }
    const L = def.layers.find(l => l.id === headId); if(!L) continue;
    const k = (anim.keys && anim.keys[headId] && anim.keys[headId][fi]) || {rot:0,dx:0,dy:0};
    const w = def.canvas.w * (k.w !== undefined ? k.w : L.w);
    const h = def.canvas.h * (k.h !== undefined ? k.h : L.h);
    const px = w * L.pivot.x;
    const py = h * L.pivot.y;
    const wp = world[headId]; if(!wp) continue;
    const topLocalX = w / 2;
    const topLocalY = 0;
    const dxx = topLocalX - px;
    const dyy = topLocalY - py;
    const rot = wp.rot * Math.PI / 180;
    const cos = Math.cos(rot), sin = Math.sin(rot);
    const rotX = dxx * cos - dyy * sin;
    const rotY = dxx * sin + dyy * cos;
    const topWX = wp.wx + rotX;
    const topWY = wp.wy + rotY;
    let canvasPx, canvasPy;
    if(_fit){
      canvasPx = _fit.offsetX + topWX * _fit.fitScale;
      canvasPy = _fit.offsetY + topWY * _fit.fitScale;
    } else {
      canvasPx = topWX * _baseSx;
      canvasPy = topWY * _baseSy;
    }
    const screenX = spriteLeft + canvasPx;
    const screenY = spriteTop + canvasPy - 6;
    if(!bar){
      bar = document.createElement('div');
      bar.id = 'head-bar-' + i;
      bar.className = 'head-bar';
      bar.innerHTML = '<div class="bar"><div class="fill"></div></div>';
      container.appendChild(bar);
    }
    bar.style.left = screenX + 'px';
    bar.style.top = screenY + 'px';
    const fill = bar.querySelector('.fill');
    if(fill) fill.style.width = Math.max(0, head.hp / head.max * 100) + '%';
  }
}
function applyHydraDamage(dmg, isCrit, pen){
  if(battle.bossArmor > 0){
    const proxy = { hp: 0, armor: battle.bossArmor };
    const r = applyDamage(proxy, dmg, pen || 0);
    battle.bossArmor = proxy.armor;
    battle.damageDealt += r.armorLost;
    spawnHitFx(battle.bx, battle.by, '-' + r.armorLost + (isCrit ? '!' : ''), isCrit ? 'crit' : 'armor');
    const apEl = document.getElementById('boss-ap');
    if(apEl) apEl.style.width = Math.max(0, battle.bossArmor / battle.bossMaxArmor * 100) + '%';
    return;
  }
  const isBodyPart = !/^(head_|neck_|eyes|mouth)/.test(battle.aimPart);
  const adjustedDmg = isBodyPart ? Math.round(dmg * 0.7) : dmg;
  const targets = getHydraTargets(battle.aimPart);
  if(!targets.length) return;
  const share = Math.max(1, Math.round(adjustedDmg / targets.length));
  for(const headId of targets){
    const head = battle.heads[headId]; if(!head || !head.alive) continue;
    head.hp = Math.max(0, head.hp - share);
    battle.damageDealt += share;
    const pos = getHeadScreenPos(headId);
    if(pos) spawnHitFx(pos.x, pos.y, '-' + share + (isCrit ? '!' : ''), isCrit ? 'crit' : 'weak');
    if(head.hp <= 0){ head.alive = false; playHeadBreakFx(headId); }
  }
  battle.bossHp = HYDRA_HEAD_IDS.reduce((s, id) => s + (battle.heads[id].alive ? battle.heads[id].hp : 0), 0);
  if(HYDRA_HEAD_IDS.every(id => !battle.heads[id].alive)){ battle.bossHp = 0; endBattle(true); return; }
  updateHeadBarsUI();
}
function applyBossDamage(dmg,isCrit,pen){
  battle.engaged = true;
  if(battle.bossId==='swamp_hydra' && battle.heads){ applyHydraDamage(dmg,isCrit,pen); return; }
  if(battle.shieldMaxHp>0 && !battle.shieldBroken && battle.shieldHp>0){
    const _pen=pen||0;
    const _shieldScale=Math.min(1,Math.exp((_pen-7)*0.4));
    const _shieldDmg=Math.max(1,Math.round(dmg*_shieldScale));
    battle.shieldHp=Math.max(0,battle.shieldHp-_shieldDmg);
    battle.damageDealt += _shieldDmg;
    spawnHitFx(battle.bx,battle.by,`-${_shieldDmg}${isCrit?'!':''}`,isCrit?'crit':'armor');
    const shEl=document.getElementById('boss-shield');
    if(shEl)shEl.style.width=Math.max(0,battle.shieldHp/battle.shieldMaxHp*100)+'%';
    if(battle.shieldHp<=0)breakBossShield();
    return;
  }
  const target={hp:battle.bossHp,armor:battle.bossArmor};
  const res=applyDamage(target,dmg,pen||0);
  battle.bossHp=target.hp;battle.bossArmor=target.armor;
  battle.damageDealt += (res.armorLost + res.hpLost);
  const shownDmg = res.hpLost > 0 ? res.hpLost : res.armorLost;
  spawnHitFx(battle.bx,battle.by,`-${Math.round(shownDmg)}${isCrit?'!':''}`,isCrit?'crit':(res.hpLost>0?'':'armor'));
  if(battle.bossHp<=0)endBattle(true);
}
function breakBossShield(){
  if(!battle || battle.shieldBroken) return;
  battle.shieldBroken = true;
  battle.bossArmor = Math.round(battle.bossArmor * 0.6);
  battle.bossMaxArmor = battle.bossArmor;
  const wrap = document.getElementById('shield-bar-wrap');
  if(wrap) wrap.remove();
  playShieldShatterFx();
}
function playShieldShatterFx(){
  const layer = document.getElementById('battle-fx');
  if(!layer || !battle) return;
  const fx = document.createElement('div');
  fx.className = 'shield-shatter-fx';
  fx.style.left = (battle.bx*100)+'%';
  fx.style.top  = (battle.by*100)+'%';
  const glow = document.createElement('div');
  glow.className = 'glow';
  fx.appendChild(glow);
  for(let i=0;i<14;i++){
    const frag = document.createElement('div');
    frag.className = 'frag';
    const ang = (i/14)*Math.PI*2 + (Math.random()-0.5)*0.4;
    const dist = 30 + Math.random()*50;
    const dx = Math.cos(ang)*dist;
    const dy = Math.sin(ang)*dist;
    frag.animate([
      {transform:'translate(0,0) scale(1) rotate(0deg)', opacity:1},
      {transform:`translate(${dx}px,${dy}px) scale(0.4) rotate(${Math.random()*360-180}deg)`, opacity:0}
    ], {duration: 500+Math.random()*200, easing:'cubic-bezier(.2,.8,.4,1)', fill:'forwards'});
    fx.appendChild(frag);
  }
  layer.appendChild(fx);
  setTimeout(()=>fx.remove(), 800);
}
function spawnHitFx(x,y,txt,cls){
  const layer=$('#battle-fx');if(!layer)return;
  const e=el('div','hit-fx'+(cls?' '+cls:''),txt);
  e.style.left=(x*100)+'%';e.style.top=(y*100)+'%';
  layer.appendChild(e);setTimeout(()=>e.remove(),1100);
}
function updateBullets(dt){
  const layer=$('#battle-fx');if(!layer)return;
  for(let i=battle.bullets.length-1;i>=0;i--){
    const b=battle.bullets[i];b.t+=dt*3.5;
    if(b.t>=1){
      if(b.enemy){
        const dodge=clamp(0.15+state.player.level*0.005,0,0.5);
        if(Math.random()>dodge){
          const target={hp:battle.playerHp,armor:battle.playerArmor};
          const res=applyDamage(target,b.dmg,b.pen||0);
          battle.playerHp=target.hp;battle.playerArmor=target.armor;
          spawnHitFx(battle.px,battle.py,`-${Math.round(b.dmg)}`,res.hpLost>0?'enemy':'armor');
          if(battle.playerHp<=0){endBattle(false);return;}
        }
      }
      battle.bullets.splice(i,1);continue;
    }
  }
  layer.querySelectorAll('.bullet').forEach(e=>{if(e.id!=='aim-marker')e.remove();});
  for(const b of battle.bullets){
    const x=b.sx+(b.tx-b.sx)*b.t;
    let y=b.sy+(b.ty-b.sy)*b.t;
    if(b.arc){
      const arcH = 0.18;
      y -= 4 * arcH * b.t * (1 - b.t);
    }
    const e=el('div','bullet'+(b.enemy?' enemy':''));
    e.style.left=(x*100)+'%';e.style.top=(y*100)+'%';
    if(b.big)e.style.transform='translate(-50%,-50%) scale(1.8)';
    layer.appendChild(e);
  }
}
function endBattle(victory){
  if(!battle)return;
  if(battle.settling) return;
  const b=battle;
  b.settling = true;
  state.player.hp=Math.max(1,Math.round(b.playerHp));
  state.player.armor=Math.max(0,Math.round(b.playerArmor));
  addProf(b.weaponSlot,3);
  if(b.weapon&&b.weapon.def.type)addProf(b.weapon.def.type,3);
  let resultHtml='',loot=[];
  const bossDef=BOSSES[b.bossId];
  if(victory){
    state.stats.bossKills++;
    if(!state.defeatedBosses.includes(b.bossId))state.defeatedBosses.push(b.bossId);
    if(bossDef.unlock&&!state.unlockedRegions.includes(bossDef.unlock)){state.unlockedRegions.push(bossDef.unlock);pushLog(`<span class="win">解鎖新地區：${bossDef.unlock}</span>`,[],'combat');}
    const drops=pickN(bossDef.drops,Math.min(2,bossDef.drops.length));
    for(const did of drops){const dd=itemDef(did);if(!dd)continue;const rar=rollRarity();invAdd(did,rar,1);loot.push({id:did,rarity:rar,count:1});}
    addExp(50);
    resultHtml=`<span class="win">勝利！</span> 擊敗 <b>${bossDef.name}</b>。對 Boss 傷害：${Math.round(b.damageDealt)}`;
  } else {
    state.stats.deaths++;
    const total=b.bossMaxHp+b.bossMaxArmor;
    const ratio=clamp(b.damageDealt/total,0,1);
    const n=Math.max(0,Math.round(ratio*2));
    for(let i=0;i<n;i++){const did=pick(bossDef.drops);const dd=itemDef(did);if(!dd)continue;const rar=rollRarity();invAdd(did,rar,1);loot.push({id:did,rarity:rar,count:1});}
    resultHtml=`<span class="lose">失敗…</span> 對 Boss 傷害：${Math.round(b.damageDealt)} / ${total}（${(ratio*100).toFixed(1)}%）<br><span style="color:#4a90d9;font-size:10px">下次進入將自動回滿血量</span>`;
  }
  const lootTxt=loot.length?`獲得：${loot.map(l=>fmtItemSpan(l.id,l.rarity,l.count)).join('、')}`:'無戰利品';
  pushLog(`<span class="pl">玩家</span> 挑戰 <b>${bossDef.name}</b>：${resultHtml}，${lootTxt}。`,loot,'combat');
  save();
  const anims = BOSS_ANIMS[b.bossId];
  const deathAnim = anims && anims.death;
  b.resultData = { bossDef, victory, loot };
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
  }
}
function finishBattleSettle(){
  if(!battle || !battle.settling) return;
  const rd = battle.resultData;
  if(!rd) return;
  battle.active = false;
  showBattleResult(rd.bossDef, battle, rd.victory, rd.loot);
  battle = null;
}
function showBattleResult(bossDef, b, victory, loot){
  const body=`<div class="detail-title ${victory?'r-傳奇':'r-破舊'}">${victory?'⚔️ 勝利':'💀 失敗'}</div>
    <div class="detail-sub">${bossDef.name}</div>
    <div class="stat-line"><span class="k">造成傷害</span><span class="v">${Math.round(b.damageDealt)}</span></div>
    <div class="stat-line"><span class="k">剩餘 HP</span><span class="v">${Math.max(0,Math.round(b.playerHp))}</span></div>
    <div class="divider"></div>
    <div style="font-size:11px;color:#e8a33d;margin-bottom:6px">戰利品</div>
    ${loot.length?loot.map(l=>`<div class="item-row" data-iid="${l.id}" data-irar="${l.rarity}"><div class="icon" style="background:${rarityBg(l.rarity)}">${itemIcon(l.id,30)}</div><div class="info"><div class="nm ${rarityClass(l.rarity)}">${itemDef(l.id).name}</div><div class="sub">${l.rarity}</div></div><div class="cnt">*${l.count}</div></div>`).join(''):'<div class="empty-hint">無</div>'}`;
  const ft=el('div','modal-ft');ft.innerHTML=`<button class="btn primary" id="m-ok">確認</button>`;
  const bd=openModal({title:'戰鬥結算',body,footer:ft});
  ft.querySelector('#m-ok').onclick=()=>{closeModal();battle=null;save();renderCombat();};
  $('.item-row',bd).forEach(r=>{r.onclick=()=>openItemDetail(r.dataset.iid,r.dataset.irar);});
}
const BossModule = {
  get battle(){ return battle; },
  set battle(v){ battle = v; },
  isActive(){ return !!(battle && battle.active); }
};
window.BossModule = BossModule;

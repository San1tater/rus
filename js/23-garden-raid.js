/* v17.5 hotfix batch applied */
/* ============================================================
   23-garden-raid.js — 後院防禦戰（含離線模擬）
   由舊 08-garden-core.js（_gardenRaidShowBattle）與 08b-garden-raid.js（防禦戰部分）重構。
   常量（GARDEN_RAID_INTERVAL_MS / GARDEN_RAID_ENEMY_COUNT_* 等）已在 07-data-garden.js，
   本文件不重複定義。
   ============================================================ */

/* ===== 防禦戰狀態 ===== */
function _gardenRaidInit(){
  const g = _gardenMerchantInit();
  if(!g.raid || typeof g.raid !== 'object') g.raid = { lastAt: 0, count: 0, wins: 0, loses: 0 };
  return g.raid;
}

function _gardenRaidCheck(){
  const raid = _gardenRaidInit();
  const now = Date.now();
  if(raid.lastAt === 0){ raid.lastAt = now; save(); return; }
  if(now - raid.lastAt < GARDEN_RAID_INTERVAL_MS) return;
  raid.lastAt = now;
  raid.count++;
  save();
  const guards = _gardenRaidCollectGuards();
  if(!guards.length){ console.log('[raid] 無守衛參戰，跳過'); return; }
  _gardenRaidStart(guards);
}

/* ===== 離線模擬 ===== */
function _gardenRaidSimulateOffline(guards, region, enemies){
  const guardUnits = [];
  for(const g of guards){
    const s = g.srv;
    const maxHp = servantMaxHp(s);
    let armor = 0, armorLevel = 0;
    const eqCfg = (g.towerCfg && g.towerCfg.eq) || {};
    const eqRar = (g.towerCfg && g.towerCfg.eqRarity) || {};
    for(const slot of ['head','top']){
      const id = eqCfg[slot];
      if(!id) continue;
      const rar = eqRar[slot] || '一般';
      armor += equipArmorValue(id, rar);
      const d = ARMOR[id];
      if(d && d.level) armorLevel = Math.max(armorLevel, d.level);
    }
    const scopeBonus = (g.weaponDef && g.weaponDef.scopeBonus) || 0;
    const hitRate = servantHitRate(s, '點射', scopeBonus);
    const ammoId = g.ammoId;
    const ammoRarity = g.ammoRarity || '一般';
    const critRate = servantCritRate(g.weaponRarity, ammoRarity);
    const critMult = servantCritMult(g.weaponRarity, ammoRarity);
    const magCap = (g.weaponDef && g.weaponDef.mag) || 30;
    const stock = ammoId ? invCount(ammoId, ammoRarity) : 0;
    const ms = (g.towerCfg && g.towerCfg.maxShots) || 'inf';
    let budget;
    if(ms === 'skip') budget = 0;
    else if(ms === 'mag') budget = Math.min(stock, magCap);
    else budget = stock;
    guardUnits.push({
      srv: s, name: servantLabel(s) + ' Lv.' + s.lv,
      rpm: (g.weaponDef && g.weaponDef.rpm) || 600,
      hp: maxHp, maxHp: maxHp,
      armor: armor, maxArmor: armor, armorLevel: armorLevel,
      alive: true, isGuard: true,
      weaponDef: g.weaponDef, weaponRarity: g.weaponRarity,
      towerIdx: g.towerIdx, towerCfg: g.towerCfg,
      ammoId: ammoId, ammoRarity: ammoRarity, ammoStock: stock,
      ammoBudget: budget, ammoUsed: 0, magCap: magCap,
      hitRate: hitRate, critRate: critRate, critMult: critMult,
      dmgDone: 0
    });
  }
  const enemyUnits = enemies.map(function(e){
    const _eid = e.eid || e.id;
    const _ename = e.name || ((typeof ENEMIES !== 'undefined' && ENEMIES[_eid]) ? ENEMIES[_eid].name : _eid);
    const _dmg = e.dmg != null ? e.dmg : (e.primaryWeapon ? (e.primaryWeapon.dmg || 10) : 10);
    const _pen = e.pen != null ? e.pen : (e.primaryWeapon ? (e.primaryWeapon.penMM || 0) : 0);
    return {
      id: _eid, name: _ename,
      dmg: _dmg, pen: _pen, armorLevel: e.armorLevel || 1,
      rpm: 300, hp: e.maxHp, maxHp: e.maxHp,
      armor: e.armor || 0, maxArmor: e.maxArmor || 0, alive: true, isGuard: false
    };
  });
  const MODE_CAP = { '點射': 1, '短點射': 3, '長點射': 7, '掃射': 99, '近戰': 1, '投擲': 1 };
  function pickFireMode(g, aliveE){
    const def = g.weaponDef;
    if(!def || !def.modes) return '點射';
    if(typeof isSemiAutoOnly === 'function' && isSemiAutoOnly(def)) return '點射';
    if(aliveE >= 3 && def.modes.indexOf('掃射') !== -1) return '掃射';
    if(aliveE >= 2 && def.modes.indexOf('短點射') !== -1) return '短點射';
    return '點射';
  }
  function guardsAlive(){ return guardUnits.some(function(u){ return u.alive; }); }
  function enemiesAlive(){ return enemyUnits.some(function(u){ return u.alive; }); }
  function executeShot(fromU, toU, isEnemy){
    if(!toU.alive) return;
    const hit = Math.random() * 100 < (fromU.isGuard ? fromU.hitRate : 75);
    if(!hit) return;
    let dmg;
    if(fromU.isGuard){
      const ammo = fromU.ammoId ? AMMO[fromU.ammoId] : null;
      dmg = ammo ? Math.round(ammo.dmg * (RARITY_MULT[fromU.ammoRarity] || 1)) : Math.round((fromU.weaponDef.dmg || 20) * (RARITY_MULT[fromU.weaponRarity] || 1));
      if(Math.random() < fromU.critRate) dmg = Math.round(dmg * fromU.critMult);
    } else {
      dmg = fromU.dmg || 10;
    }
    const tgt = { hp: toU.hp, armor: toU.armor };
    const pen = fromU.isGuard ? (fromU.ammoId && AMMO[fromU.ammoId] ? (AMMO[fromU.ammoId].penMM || 0) : (fromU.weaponDef.penMM || 0)) : (fromU.pen || 0);
    const res = applyDamage(tgt, dmg, pen, toU.armorLevel || 0);
    toU.hp = tgt.hp; toU.armor = tgt.armor;
    const shown = res.hpLost > 0 ? res.hpLost : res.armorLost;
    fromU.dmgDone = (fromU.dmgDone || 0) + shown;
    if(fromU.isGuard && fromU.srv) servantAddExp(fromU.srv, 2);
      if(fromU.isGuard && fromU.ammoId && shown === 0) fromU._stopFire = true;
      if(toU.hp <= 0) toU.alive = false;
  }
  let round = 0;
  const maxRounds = 30;
  while(guardsAlive() && enemiesAlive() && round < maxRounds){
    round++;
    for(const g of guardUnits){
      if(!g.alive) continue;
      if(!enemiesAlive()) break;
      if(g.ammoId && (g.ammoBudget - g.ammoUsed) <= 0) continue;
      const aliveE = enemyUnits.filter(function(e){ return e.alive; }).length;
      const mode = pickFireMode(g, aliveE);
      let shots = MODE_CAP[mode] || 1;
      shots = Math.min(shots, g.magCap);
      if(g.ammoId) shots = Math.min(shots, g.ammoBudget - g.ammoUsed);
      for(let i = 0; i < shots; i++){
        const aliveTargets = enemyUnits.filter(function(e){ return e.alive; });
        if(!aliveTargets.length) break;
        if(g.ammoId){ if(g.ammoUsed >= g.ammoBudget) break; g.ammoUsed++; }
        const target = aliveTargets[Math.floor(Math.random() * aliveTargets.length)];
        executeShot(g, target, false);
      }
    }
    if(!enemiesAlive()) break;
    if(!guardsAlive()) break;
    for(const e of enemyUnits){
      if(!e.alive) continue;
      const aliveTargets = guardUnits.filter(function(g){ return g.alive; });
      if(!aliveTargets.length) break;
      const target = aliveTargets[Math.floor(Math.random() * aliveTargets.length)];
      executeShot(e, target, true);
    }
  }
  return { guards: guardUnits, enemies: enemyUnits, win: !enemiesAlive() && guardsAlive(), rounds: round };
}

function _offlineGardenRaidSettle(baseTime, now){
  const raid = _gardenRaidInit();
  if(raid.lastAt === 0){ raid.lastAt = baseTime; }
  let curLast = raid.lastAt;
  if(curLast < baseTime) curLast = baseTime;
  if(now - curLast < GARDEN_RAID_INTERVAL_MS) return 0;
  let count = 0;
  let maxIter = 24;
  while(now - curLast >= GARDEN_RAID_INTERVAL_MS && maxIter > 0){
    maxIter--;
    curLast += GARDEN_RAID_INTERVAL_MS;
    count++;
  }
  if(count === 0) return 0;
  raid.lastAt = curLast;
  raid.count += count;
  for(let i = 0; i < count; i++){
    const guards = _gardenRaidCollectGuards();
    if(!guards.length) continue;
    const gen = _gardenRaidGenEnemies();
    if(!gen.enemies.length) continue;
    const sim = _gardenRaidSimulateOffline(guards, gen.region, gen.enemies);
    try {
      _gardenRaidApplyResult(sim, gen.region);
    } catch(e){
      console.warn('[offline raid]', e);
    }
  }
  return count;
}

/* ===== 收集守衛 / 生成敵人 ===== */
function _gardenRaidCollectGuards(){
  const plots = _gardenGetPlots();
  const servants = state.servants || [];
  const result = [];
  for(let i = 0; i < 20; i++){
    const p = plots[i];
    if(!p || p.type !== 'tower' || p.broken) continue;
    const cfg = _gardenTowerInit(p);
    _gardenTowerNormalizeEq(cfg);
    const weaponId = cfg.eq.primary || cfg.eq.secondary;
    const weaponRarity = cfg.eqRarity.primary || cfg.eqRarity.secondary || '一般';
    if(!weaponId) continue;
    const wDef = itemDef(weaponId);
    if(!wDef) continue;
    const resolved = _gardenTowerResolveAmmo(cfg, wDef);
    if(!resolved) continue;
    for(const s of servants){
      if(s.type !== 'guard') continue;
      if(!s.assignedPlots || s.assignedPlots.indexOf(i) === -1) continue;
      if((s.stamina || 0) <= 0) continue;
      result.push({
        srv: s,
        towerIdx: i,
        towerCfg: cfg,
        weaponId: weaponId,
        weaponRarity: weaponRarity,
        weaponDef: wDef,
        ammoId: resolved.id,
        ammoRarity: resolved.rarity
      });
    }
  }
  return result;
}

function _gardenRaidGenEnemies(){
  const regions = (typeof getActiveRegions === 'function') ? getActiveRegions() : ['廢棄工廠'];
  const region = (state.activeRegion && regions.indexOf(state.activeRegion) !== -1) ? state.activeRegion : regions[0];
  const R = REGIONS[region];
  if(!R) return { enemies: [], region: region };
  const lv = (state.player && state.player.level) || 1;
  let count = 2 + Math.floor(lv / 5);
  count = Math.min(8, count);
  const enemies = [];
  for(let i = 0; i < count; i++){
    const eid = pick(R.enemies);
    const inst = (typeof generateEnemyInstance === 'function') ? generateEnemyInstance(eid, 1) : null;
    if(!inst) continue;
    enemies.push(inst);
  }
  return { enemies: enemies, region: region };
}

/* ===== 清理殘留 ===== */
function _raidCleanupAll(){
  const sels = ['.raid-overlay','.raid-guard','.raid-enemy','.raid-enemy-zone','.raid-side','.raid-unit','.raid-sprite','.raid-proj','.raid-dmg','.raid-float','.raid-banner-win','.raid-banner-lose','.raid-unit-sprite','.raid-unit-hpwrap','.raid-unit-name','.raid-hp-wrap','.raid-name','.raid-hp'];
  for(const sel of sels){
    const all = document.querySelectorAll(sel);
    for(let i = all.length - 1; i >= 0; i--){ try{ all[i].remove(); }catch(e){} }
  }
}

/* ===== 僕人繪製輔助 ===== */
function _raidDrawWorkerHelmet(ctx, B, anim, fi, color){
  const L = GAME_LAYERS.find(function(l){ return l.id === 'head'; });
  if(!L) return;
  const keys = anim.keys[L.id] || [];
  const key = keys[fi] || {rot:0, dx:0, dy:0};
  const cx = B.x + B.w * (L.x + (key.dx||0) * 0.01);
  const cy = B.y + B.h * (L.y + (key.dy||0) * 0.01);
  const w = B.w * L.w;
  const h = B.h * L.h;
  const px = w * L.pivot.x;
  const py = h * L.pivot.y;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((key.rot || 0) * Math.PI / 180);
  ctx.translate(-px, -py);
  const cxL = w * 0.5;
  const cyL = h * 0.45;
  const r = w * 0.72;
  ctx.fillStyle = color;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cxL, cyL, r, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawBucketUnit(ctx, u){
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(u.bx - u.topHalf, u.topY);
  ctx.lineTo(u.bx + u.topHalf, u.topY);
  ctx.lineTo(u.bx + u.botHalf, u.botY);
  ctx.lineTo(u.bx - u.botHalf, u.botY);
  ctx.closePath();
  ctx.fillStyle = '#9aa2aa';
  ctx.fill();
  ctx.strokeStyle = '#464d55';
  ctx.lineWidth = 5;
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.restore();
}

function drawHandItemUnit(ctx, u){
  if(u.handItemType === 'sack'){
    const cx = u.bagX;
    const cy = u.bagY;
    ctx.save();
    ctx.fillStyle = '#ede4d3';
    ctx.strokeStyle = '#464d55';
    ctx.lineWidth = 5;
    ctx.lineJoin = 'round';
    const topW = 42, topH = 31;
    ctx.beginPath();
    ctx.moveTo(cx - topW/2, cy - topH);
    ctx.lineTo(cx + topW/2, cy - topH);
    ctx.lineTo(cx, cy);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    const botW = 87, botH = 87;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + botW/2, cy + botH);
    ctx.lineTo(cx - botW/2, cy + botH);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  } else if(u.handItemType === 'shovel'){
    const ax = u.anchorX;
    const ay = u.anchorY;
    const D_W = 30, D_H = 36;
    const HANDLE_LEN = 148, HANDLE_W = 6;
    const HEAD_W = 45, HEAD_H = 57;
    const forkY = ay + D_H;
    const handleBot = forkY + HANDLE_LEN;
    const headBot = handleBot + HEAD_H;
    ctx.save();
    ctx.strokeStyle = '#9a9a9a';
    ctx.lineWidth = HANDLE_W;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(ax, forkY);
    ctx.lineTo(ax - D_W/2, ay);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(ax, forkY);
    ctx.lineTo(ax + D_W/2, ay);
    ctx.stroke();
    ctx.lineWidth = HANDLE_W + 2;
    ctx.beginPath();
    ctx.moveTo(ax - D_W/2, ay);
    ctx.lineTo(ax + D_W/2, ay);
    ctx.stroke();
    ctx.lineWidth = HANDLE_W;
    ctx.lineCap = 'butt';
    ctx.beginPath();
    ctx.moveTo(ax, forkY);
    ctx.lineTo(ax, handleBot);
    ctx.stroke();
    ctx.fillStyle = '#8a8f95';
    ctx.strokeStyle = '#464d55';
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(ax - HEAD_W/2, handleBot);
    ctx.lineTo(ax + HEAD_W/2, handleBot);
    ctx.lineTo(ax + HEAD_W/2 + 2, headBot);
    ctx.lineTo(ax - HEAD_W/2 - 2, headBot);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#5a6068';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ax, handleBot + 5);
    ctx.lineTo(ax, headBot - 8);
    ctx.stroke();
    ctx.restore();
  } else if(u.handItemType === 'clipboard'){
    const w = 90, h = 110;
    const cx = u.armMidX;
    const cy = u.armMidY + 7;
    ctx.save();
    ctx.fillStyle = '#3a78c8';
    ctx.fillRect(cx - w/2, cy - h/2, w, h);
    ctx.restore();
  } else if(u.handItemType === 'flask'){
    const positions = u.flaskPositions || [];
    const R = 37;
    const NECK_W = 26;
    const NECK_H = 52;
    const halfNeck = NECK_W / 2;
    const BODY_OFFSET = R + NECK_H/2 - 3;
    for(const pos of positions){
      const cx = pos.x;
      const cy = pos.y + BODY_OFFSET;
      const neckTopY = cy - R - NECK_H;
      const neckBottomY = cy - R + 5;
      const _dy = neckBottomY - cy;
      const _angleRight = Math.atan2(_dy, halfNeck);
      const _angleLeft = Math.atan2(_dy, -halfNeck);
      ctx.save();
      ctx.fillStyle = 'rgba(80,138,100,0.92)';
      ctx.strokeStyle = '#1f3a2a';
      ctx.lineWidth = 8;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(cx - halfNeck, neckTopY);
      ctx.lineTo(cx - halfNeck, neckBottomY);
      ctx.arc(cx, cy, R, _angleLeft, _angleRight, true);
      ctx.lineTo(cx + halfNeck, neckTopY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - halfNeck - 8, neckTopY);
      ctx.lineTo(cx + halfNeck + 8, neckTopY);
      ctx.stroke();
      ctx.fillStyle = 'rgba(180,230,200,0.55)';
      ctx.beginPath();
      ctx.ellipse(cx - R*0.32, cy - R*0.25, R*0.32, R*0.14, -0.4, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();
    }
  }
}

/* ===== 人形繪製（僕人 / 守衛 / 農民 / 監工 / 敵人） ===== */
function _raidDrawHuman(ctx, px, py, scale, equipped, equippedRarity, animName, frameIdx, weaponSlotOverride, servantType, flipX, hasBucket, handItem, noWorkerHelmet, legOverride){
  var anim = GAME_ANIMS[animName] || GAME_ANIMS.idle;
  var fi = ((frameIdx % anim.frameCount) + anim.frameCount) % anim.frameCount;
  var B = { x:30, y:30, w:340, h:460 };
  var ORIG_FOOT_X = 200, ORIG_FOOT_Y = 515;
  var TYPE_COLORS = {
    farmer:  { body:'#5a9a48', legs:'#3a6a2e' },
    guard:   { body:'#5088bb', legs:'#2e4a6a' },
    foreman: { body:'#e0a830', legs:'#d8d0c0' },
    enemy:   { body:'#8b2a2a', legs:'#3a1010' }
  };
  var _colors = servantType ? TYPE_COLORS[servantType] : null;
  if(_colors){
    for(var li = 0; li < GAME_LAYERS.length; li++){
      var L = GAME_LAYERS[li];
      L._oldColor = L.color;
      if(L.id === 'right_leg' || L.id === 'left_leg') L.color = _colors.legs;
      else if(L.id === 'torso' || L.id === 'back_arm' || L.id === 'front_arm') L.color = _colors.body;
    }
  }
  ctx.save();
  ctx.translate(px, py);
  if(animName === 'dead'){ ctx.rotate(-Math.PI / 2); ctx.translate(-ORIG_FOOT_X * scale, 0); }
  ctx.scale(flipX ? -scale : scale, scale);
  ctx.translate(-ORIG_FOOT_X, -ORIG_FOOT_Y);

  var units = [];
  for(var gi = 0; gi < GAME_LAYERS.length; gi++) units.push({z:GAME_LAYERS[gi].z, kind:'layer', layer:GAME_LAYERS[gi]});

  if(equipped.head){
    var cH = (typeof HEAD_ARMOR_LAYOUT !== 'undefined' && HEAD_ARMOR_LAYOUT[equipped.head]) ? HEAD_ARMOR_LAYOUT[equipped.head] : HERO_VISIBLE_EQ.head;
    var lH = GAME_LAYERS.find(function(l){ return l.id === cH.layer; });
    if(lH){
      var imgH = getHeroImg('icons/items/' + resolveIconId(equipped.head) + '.png');
      units.push({z:lH.z+0.5, kind:'eq', layerId:cH.layer, ox:cH.ox, oy:cH.oy, scale:cH.scale, rotation:cH.rotation, img:imgH});
    }
  }
  if(equipped.top){
    var cT = getTopCfg(equipped.top);
    var lT = GAME_LAYERS.find(function(l){ return l.id === cT.layer; });
    if(lT){
      var imgT = getHeroImg('icons/items/' + resolveIconId(equipped.top) + '.png');
      units.push({z:lT.z+0.5, kind:'eq', layerId:cT.layer, ox:cT.ox, oy:cT.oy, scale:cT.scale, rotation:cT.rotation, img:imgT});
    }
  }
  var wpS = null, wpI = null;
  if(weaponSlotOverride && equipped[weaponSlotOverride]){ wpS = weaponSlotOverride; wpI = equipped[weaponSlotOverride]; }
  else if(equipped.primary){ wpS = 'primary'; wpI = equipped.primary; }
  else if(equipped.secondary){ wpS = 'secondary'; wpI = equipped.secondary; }
  else if(equipped.melee){ wpS = 'melee'; wpI = equipped.melee; }
  if(wpS && wpI && !_isMeleeWeapon(wpI)){
    var cW = getWeaponCfg(wpS, wpI);
    if(cW){
      var lW = GAME_LAYERS.find(function(l){ return l.id === cW.layer; });
      if(lW){
        var imgW = getHeroImg('icons/items/' + resolveIconId(wpI) + '.png');
        units.push({z:lW.z-0.5, kind:'eq', layerId:cW.layer, ox:cW.ox, oy:cW.oy, scale:cW.scale, rotation:cW.rotation, img:imgW, trim:cW.trim});
      }
    }
  }

  if(hasBucket){
    var _fa = GAME_LAYERS.find(function(l){ return l.id === 'front_arm'; });
    var _ba = GAME_LAYERS.find(function(l){ return l.id === 'back_arm'; });
    if(_fa && _ba){
      var _fk = (anim.keys && anim.keys[_fa.id] && anim.keys[_fa.id][fi]) || {rot:0,dx:0,dy:0};
      var _bk = (anim.keys && anim.keys[_ba.id] && anim.keys[_ba.id][fi]) || {rot:0,dx:0,dy:0};
      var _fCx = B.x + B.w * (_fa.x + (_fk.dx||0) * 0.01);
      var _fCy = B.y + B.h * (_fa.y + (_fk.dy||0) * 0.01);
      var _fW = B.w * _fa.w, _fH = B.h * _fa.h;
      var _fMidX = _fCx + _fW * (0.5 - _fa.pivot.x);
      var _fMidY = _fCy + _fH * (0.5 - _fa.pivot.y);
      var _bCx = B.x + B.w * (_ba.x + (_bk.dx||0) * 0.01);
      var _bCy = B.y + B.h * (_ba.y + (_bk.dy||0) * 0.01);
      var _bW = B.w * _ba.w, _bH = B.h * _ba.h;
      var _bMidX = _bCx + _bW * (0.5 - _ba.pivot.x);
      var _bMidY = _bCy + _bH * (0.5 - _ba.pivot.y);
      var _bkx = (_fMidX + _bMidX) / 2;
      var _bky = (_fMidY + _bMidY) / 2;
      units.push({z:58, kind:'bucket', bx:_bkx, topY:_bky-38, botY:_bky+97, topHalf:54, botHalf:39});
    }
  }

  if(handItem === 'stick' || handItem === 'clipboard' || handItem === 'flask'){
    var _fa2 = GAME_LAYERS.find(function(l){ return l.id === 'front_arm'; });
    var _ba2 = GAME_LAYERS.find(function(l){ return l.id === 'back_arm'; });
    if(_fa2 && _ba2){
      var _fk2 = (anim.keys && anim.keys[_fa2.id] && anim.keys[_fa2.id][fi]) || {rot:0,dx:0,dy:0};
      var _bk2 = (anim.keys && anim.keys[_ba2.id] && anim.keys[_ba2.id][fi]) || {rot:0,dx:0,dy:0};
      var _fCx2 = B.x + B.w * (_fa2.x + (_fk2.dx||0) * 0.01);
      var _fCy2 = B.y + B.h * (_fa2.y + (_fk2.dy||0) * 0.01);
      var _fW2 = B.w * _fa2.w, _fH2 = B.h * _fa2.h;
      var _fMidX2 = _fCx2 + _fW2 * (0.5 - _fa2.pivot.x);
      var _fMidY2 = _fCy2 + _fH2 * (0.5 - _fa2.pivot.y);
      var _bCx2 = B.x + B.w * (_ba2.x + (_bk2.dx||0) * 0.01);
      var _bCy2 = B.y + B.h * (_ba2.y + (_bk2.dy||0) * 0.01);
      var _bW2 = B.w * _ba2.w, _bH2 = B.h * _ba2.h;
      var _bMidX2 = _bCx2 + _bW2 * (0.5 - _ba2.pivot.x);
      var _bMidY2 = _bCy2 + _bH2 * (0.5 - _ba2.pivot.y);
      if(handItem === 'stick'){
        units.push({z:60, kind:'handitem', handItemType:'sack', bagX:_bMidX2, bagY:_bMidY2});
        var _shovelX = _fCx2 + _fW2 * (1 - _fa2.pivot.x) - _fW2 * 0.10;
        var _shovelY = _fCy2 + _fH2 * (0 - _fa2.pivot.y) - 7;
        units.push({z:59, kind:'handitem', handItemType:'shovel', anchorX:_shovelX, anchorY:_shovelY});
      } else if(handItem === 'clipboard'){
        units.push({z:58, kind:'handitem', handItemType:'clipboard', armMidX:(_fMidX2+_bMidX2)/2, armMidY:(_fMidY2+_bMidY2)/2});
      } else if(handItem === 'flask'){
        var _flaskRX = _fCx2 + _fW2 * (0.85 - _fa2.pivot.x);
        var _flaskRY = _fCy2 + _fH2 * (0.5 - _fa2.pivot.y);
        var _flaskLX = _bCx2 + _bW2 * (0.2 - _ba2.pivot.x);
        var _flaskLY = _bCy2 + _bH2 * (0.5 - _ba2.pivot.y);
        units.push({z:61, kind:'handitem', handItemType:'flask', flaskPositions:[{x:_flaskLX, y:_flaskLY}, {x:_flaskRX, y:_flaskRY}]});
      }
    }
  }

  units.sort(function(a,b){ return a.z - b.z; });

  for(var ui = 0; ui < units.length; ui++){
    var u = units[ui];
    if(u.kind === 'layer'){
      if(legOverride && legOverride[u.layer.id] && typeof legOverride[u.layer.id].rot === 'number'){
        drawBodyLayerWithRot(ctx, u.layer, B, anim, fi, legOverride[u.layer.id].rot);
      } else {
        drawBodyLayer(ctx, u.layer, B, anim, fi);
      }
    }
    else if(u.kind === 'bucket') drawBucketUnit(ctx, u);
    else if(u.kind === 'handitem') drawHandItemUnit(ctx, u);
    else drawEqLayer(ctx, u, B, anim, fi);
  }

  if(!noWorkerHelmet && servantType === 'foreman') _raidDrawWorkerHelmet(ctx, B, anim, fi, '#ffffff');
  else if(!noWorkerHelmet && servantType === 'farmer') _raidDrawWorkerHelmet(ctx, B, anim, fi, '#ff8800');

  ctx.restore();

  if(_colors){
    for(var ri = 0; ri < GAME_LAYERS.length; ri++){
      var L2 = GAME_LAYERS[ri];
      if(typeof L2._oldColor !== 'undefined'){ L2.color = L2._oldColor; delete L2._oldColor; }
    }
  }
}

function drawBodyLayerWithRot(ctx, L, B, anim, fi, rotOverride){
  var keys = anim.keys[L.id] || [];
  var key = keys[fi] || {rot:0, dx:0, dy:0};
  var cx = B.x + B.w * (L.x + (key.dx||0) * 0.01);
  var cy = B.y + B.h * (L.y + (key.dy||0) * 0.01);
  var w = B.w * L.w;
  var h = B.h * L.h;
  var px = w * L.pivot.x;
  var py = h * L.pivot.y;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotOverride * Math.PI / 180);
  ctx.translate(-px, -py);
  ctx.fillStyle = L.color;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(0,0,0,0.65)';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, w - 2, h - 2);
  ctx.restore();
}

function _raidDrawEnemy(ctx, px, py, scale, animName, frameIdx, enemyId){
  var _realId = enemyId;
  if(typeof HUMAN_ENEMY_DATA !== "undefined"){
    if(!HUMAN_ENEMY_DATA[enemyId] && HUMAN_ENEMY_DATA["human_" + enemyId]){
      _realId = "human_" + enemyId;
    }
  }
  if(typeof HUMAN_ENEMY_DATA !== "undefined" && HUMAN_ENEMY_DATA[_realId]){
    const def = HUMAN_ENEMY_DATA[_realId];
    const anims = def.anims;
    if(!anims) return;
    let anim = anims[animName];
    if(!anim && animName === 'walk') anim = GAME_ANIMS.walk;
    if(!anim) anim = anims.idle;
    if(!anim) return;
    const fi = ((frameIdx % anim.frameCount) + anim.frameCount) % anim.frameCount;
    if(!window._rev510_raidEquipCache) window._rev510_raidEquipCache = {};
    if(!window._rev510_raidEquipCache[_realId]){
      window._rev510_raidEquipCache[_realId] = (typeof _rev506_getRandomEquip === "function")
        ? _rev506_getRandomEquip(_realId) : null;
    }
    const equip = window._rev510_raidEquipCache[_realId];
    const ox = px - def.canvas.w * scale / 2;
    const oy = py - def.canvas.h * scale;
    const _isDeath = (animName === "death");
    if(typeof _rev506_drawHumanCorpse === "function"){
      _rev506_drawHumanCorpse(ctx, _realId, scale, ox, oy, def, anim, fi, equip, _isDeath);
      return;
    }
  }
  if(typeof _drawEnemyAt === "function"){
    var _bdef = (typeof BEAST_LAYERS !== "undefined" && BEAST_LAYERS[_realId]);
    if(_bdef){
      var _bx = px - _bdef.canvas.w * scale / 2;
      var _by = py - _bdef.canvas.h * scale;
      if(_drawEnemyAt(ctx, _realId, _bx, _by, scale, animName, frameIdx)) return;
    }
  }
  if(typeof BEAST_LAYERS !== "undefined" && BEAST_LAYERS[_realId]) {
    const def = BEAST_LAYERS[_realId];
    const bounds = (typeof getBeastBounds === "function") ? getBeastBounds(def) : null;
    if(bounds) {
      const targetVisualH = 386 * 0.9;
      const actualScale = (targetVisualH * scale) / bounds.h;
      ctx.save();
      ctx.translate(px, py);
      ctx.scale(actualScale, actualScale);
      const centerX = (bounds.minX + bounds.maxX) / 2;
      const bottomY = bounds.maxY;
      ctx.translate(-centerX, -bottomY);
      const world = (typeof resolveBossWorld === "function") ? resolveBossWorld(def, { keys:{} }, 0) : {};
      const sorted = def.layers.slice().sort((a,b)=>a.z - b.z);
      for(const L of sorted) {
        const wp = world[L.id];
        if(!wp) continue;
        const w = def.canvas.w * L.w;
        const h = def.canvas.h * L.h;
        const ppx = w * L.pivot.x;
        const ppy = h * L.pivot.y;
        ctx.save();
        ctx.translate(wp.wx, wp.wy);
        ctx.rotate((L.rot || 0) * Math.PI / 180);
        ctx.translate(-ppx, -ppy);
        if(L.id.indexOf("eye") === 0) {
          ctx.shadowColor = "#ff0000";
          ctx.shadowBlur = 15;
        }
        ctx.fillStyle = L.color;
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = "rgba(0,0,0,0.65)";
        ctx.lineWidth = 2;
        ctx.strokeRect(1, 1, w - 2, h - 2);
        ctx.restore();
      }
      ctx.restore();
      return;
    }
  }
  if(typeof _raidDrawHuman === "function") {
    const _eq = { head: "ssh68", top: "6b231", primary: "ak74" };
    const _rar = { head: "一般", top: "一般", primary: "一般" };
    _raidDrawHuman(ctx, px, py, scale, _eq, _rar, animName, frameIdx, "primary", "enemy", true, false, null);
  }
}

/* ===== 塔彈藥解析（供防禦戰使用） ===== */
function _gardenTowerResolveAmmo(cfg, wDef){
  if(!wDef || !wDef.cal) return null;
  const cal = wDef.cal;
  const setAmmo = cfg.ammoId;
  const setRarity = setAmmo ? ((AMMO[setAmmo] && AMMO[setAmmo].rarity) || '一般') : null;
  if(setAmmo){
    const c = invCount(setAmmo, setRarity);
    if(c > 0) return { id: setAmmo, rarity: setRarity, count: c };
  }
  const list = [];
  for(const k in state.inventory){
    const p = k.split('@');
    const id = p[0], rar = p[1];
    const d = AMMO[id];
    if(!d || d.cal !== cal) continue;
    if(setRarity){
      const idx = RARITY_ORDER.indexOf(rar);
      const sIdx = RARITY_ORDER.indexOf(setRarity);
      if(idx < 0 || sIdx < 0) continue;
      if(idx >= sIdx) continue;
    }
    const cnt = state.inventory[k];
    if(cnt <= 0) continue;
    list.push({ id: id, rarity: rar, count: cnt });
  }
  if(!list.length) return null;
  list.sort(function(a, b){
    const ra = sortByRarityDesc(b, a);
    if(ra !== 0) return ra;
    return b.count - a.count;
  });
  return list[0];
}

/* ===== 守衛槍口世界座標 ===== */
function _getRaidMuzzleWorld(u, scale){
  if(!u || !u.equipped || !u.weaponSlot) return null;
  const wpId = u.equipped[u.weaponSlot];
  if(!wpId) return null;
  const cfg = getWeaponCfg(u.weaponSlot, wpId);
  if(!cfg || !cfg.trim) return null;
  const mz = WEAPON_MUZZLE[resolveIconId(wpId)];
  if(!mz) return null;
  const L = GAME_LAYERS.find(function(l){ return l.id === cfg.layer; });
  if(!L) return null;

  const B = { x: 30, y: 30, w: 340, h: 460 };
  const anim = GAME_ANIMS[u.animName] || GAME_ANIMS.idle;
  if(!anim) return null;
  const fi = ((u.animFrame % anim.frameCount) + anim.frameCount) % anim.frameCount;
  const key = (anim.keys[L.id] && anim.keys[L.id][fi]) || {rot:0, dx:0, dy:0};

  const cx = B.x + B.w * (L.x + (key.dx||0) * 0.01);
  const cy = B.y + B.h * (L.y + (key.dy||0) * 0.01);
  const w = B.w * L.w;
  const h = B.h * L.h;
  const anchorX = cx + w * (cfg.ox || 0);
  const anchorY = cy + h * (cfg.oy || 0);

  const baseW = cfg.trim.w * (cfg.scale || 1);
  const baseH = cfg.trim.h * (cfg.scale || 1);
  const mzlX = anchorX + (mz.x / cfg.trim.w) * baseW;
  const mzlY = anchorY - baseH / 2 + (mz.y / cfg.trim.h) * baseH;

  return {
    x: u.x + scale * (mzlX - 200),
    y: u.y + scale * (mzlY - 515)
  };
}

/* ===== 啟動防禦戰 ===== */
function _gardenRaidStart(guards){
  const gen = _gardenRaidGenEnemies();
  if(!gen.enemies.length) return;
  _gardenRaidShowBattle(guards, gen.enemies, gen.region);
}

/* ===== 套用結果 ===== */
function _gardenRaidApplyResult(sim, region){
  for(const g of sim.guards){
    if(!g.ammoId) continue;
    const used = Math.min(g.ammoUsed, g.ammoBudget);
    if(used > 0) invRemove(g.ammoId, g.ammoRarity, used);
  }
  const died = sim.guards.filter(function(g){ return !g.alive; });
  if(died.length){
    const toRemove = {};
    for(const g of died) toRemove[g.srv.id] = true;
    state.servants = (state.servants || []).filter(function(s){ return !toRemove[s.id]; });
  }
  if(!sim.win){
    if(sim.brokenPlots === undefined){
    const plots = _gardenGetPlots();
    let n = 1;
    if(sim.guards.filter(function(g){ return g.alive; }).length === 0) n = 3;
    const candidates = [];
    for(let i = 0; i < 20; i++){
      const p = plots[i];
      if(!p || !p.type) continue;
      if(p.broken) continue;
      candidates.push(i);
    }
    const broken = [];
    for(let k = 0; k < n && candidates.length; k++){
      const pos = Math.floor(Math.random() * candidates.length);
      const idx = candidates.splice(pos, 1)[0];
      const p = plots[idx];
      p.broken = true;
      if(p.crop) p.crop = null;
      broken.push(idx);
    }
    sim.brokenPlots = broken;
    }
    const storage = _gardenStorageInit();
    const stolen = [];
    const cropKeys = [];
    for(const k in storage){
      if(storage[k] <= 0) continue;
      const id = k.split('@')[0];
      if(CROPS[id]) cropKeys.push(k);
    }
    const stealN = Math.min(3, cropKeys.length);
    for(let k = 0; k < stealN; k++){
      const pos = Math.floor(Math.random() * cropKeys.length);
      const key = cropKeys.splice(pos, 1)[0];
      const parts = key.split('@');
      const amount = Math.max(1, Math.floor(storage[key] * 0.3));
      storage[key] -= amount;
      if(storage[key] <= 0) delete storage[key];
      stolen.push({ id: parts[0], rarity: parts[1], count: amount });
    }
    sim.stolen = stolen;
    const raid = _gardenRaidInit();
    raid.loses++;
  } else {
    const raid = _gardenRaidInit();
    raid.wins++;
    const pool = ['wood','metal','screws','cloth','gears','electronics'];
    const loot = [];
    const n = 5 + Math.floor(Math.random() * 6);
    for(let i = 0; i < n; i++){
      const id = pool[Math.floor(Math.random() * pool.length)];
      const rar = rollRarity();
      invAdd(id, rar, 1);
      loot.push({ id: id, rarity: rar, count: 1 });
    }
    sim.loot = loot;
  }
  _gardenRaidLogBattle(sim, region);
  save();
  renderGardenGrid();
  renderGardenContent();
}

/* ===== 戰鬥日誌記錄 ===== */
function _gardenRaidLogBattle(sim, region){
  const g = _gardenMerchantInit();
  if(!Array.isArray(g.battleLog)) g.battleLog = [];
  const ammoMap = {};
  const guardAmmoList = [];
  for(const gd of sim.guards){
    const used = gd.ammoId ? Math.min(gd.ammoUsed, gd.ammoBudget) : 0;
    guardAmmoList.push({
      name: gd.name,
      coord: (typeof plotCoordName === 'function' && gd.towerIdx != null) ? plotCoordName(gd.towerIdx) : '',
      alive: !!gd.alive,
      ammoName: gd.ammoId ? (AMMO[gd.ammoId] ? AMMO[gd.ammoId].name : gd.ammoId) : '無彈藥',
      ammoRarity: gd.ammoRarity || '一般',
      count: used,
      dmg: gd.dmgDone || 0
    });
    if(used > 0){
      const key = gd.ammoId + '@' + gd.ammoRarity;
      if(!ammoMap[key]) ammoMap[key] = { id: gd.ammoId, rarity: gd.ammoRarity, name: (AMMO[gd.ammoId] ? AMMO[gd.ammoId].name : gd.ammoId), count: 0 };
      ammoMap[key].count += used;
    }
  }
  let totalDmg = 0;
  for(const gd of sim.guards) totalDmg += (gd.dmgDone || 0);
  const entry = {
    t: Date.now(),
    win: sim.win,
    region: region,
    rounds: sim.rounds,
    enemyCount: sim.enemies.length,
    guardTotal: sim.guards.length,
    guardAlive: sim.guards.filter(function(x){ return x.alive; }).length,
    ammoUsed: Object.keys(ammoMap).reduce(function(s, k){ return s + ammoMap[k].count; }, 0),
    ammoDetail: Object.keys(ammoMap).map(function(k){ return ammoMap[k]; }),
    guardAmmoList: guardAmmoList,
    totalDmg: totalDmg,
    broken: sim.brokenPlots ? sim.brokenPlots.map(function(i){ return plotCoordName(i); }) : [],
    stolen: sim.stolen ? sim.stolen.map(function(x){ return { id: x.id, rarity: x.rarity || '一般', name: (CROPS[x.id] ? CROPS[x.id].name : x.id), count: x.count }; }) : [],
    loot: sim.loot ? sim.loot.map(function(x){ const d = itemDef(x.id); return { id: x.id, rarity: x.rarity || '一般', name: d ? d.name : x.id, count: x.count }; }) : []
  };
  if(!Array.isArray(g.battleLog)) g.battleLog = [];
  g.battleLog.push(entry);
  if(g.battleLog.length > 30) g.battleLog.splice(0, g.battleLog.length - 30);
}

/* ===== 即時戰鬥日誌（底部頁簽） ===== */
window._raidLiveLog = [];
window._raidLiveActive = false;
function _raidLiveLogPush(text, cls){
  if(typeof text !== 'string'){
    if(text && text.nodeType === 1) text = text.textContent || '';
    else if(text == null) text = '';
    else text = String(text);
  }
  if(/^\[object /.test(text)) return;
  if(!window._raidLiveLog) window._raidLiveLog = [];
  window._raidLiveLog.push({ text: text, cls: cls || '' });
  if(window._raidLiveLog.length > 300) window._raidLiveLog.shift();
  if(!window._raidLiveActive) return;
  if(typeof _gardenUpdateBattleCol === 'function') _gardenUpdateBattleCol();
}
function _esc(s){ return String(s).replace(/[&<>]/g, function(c){ return c === '&' ? '&amp;' : (c === '<' ? '&lt;' : '&gt;'); }); }
const _RARITY_COLOR = { '破舊':'#b87333', '一般':'#e0e0e0', '庫存':'#4caf50', '精品':'#2196f3', '傳奇':'#ffb300', '具名':'#a45ede' };

function _mergeLoot(items){
  const map = {};
  const order = [];
  for(const it of items){
    const k = (it.id || it.name) + '@' + (it.rarity || '一般');
    if(!map[k]){
      map[k] = { id: it.id, name: it.name, rarity: it.rarity || '一般', count: 0 };
      order.push(k);
    }
    map[k].count += it.count;
  }
  return order.map(function(k){ return map[k]; });
}
function _lootHtml(items, color){
  if(!items || !items.length) return '';
  const merged = _mergeLoot(items);
  return merged.map(function(it){
    const _c = _RARITY_COLOR[it.rarity] || color || '#ddd';
    return '<span style="color:' + _c + '">' + it.name + '×' + it.count + '</span>';
  }).join(' ');
}

/* ===== 即時戰鬥日誌欄更新（由 _raidLiveLogPush 觸發） ===== */
function _gardenUpdateBattleCol(){
  const p = document.getElementById('garden-page');
  if(!p) return;
  if(typeof _gardenActiveTab === 'undefined' || _gardenActiveTab !== 'log') return;
  const box = p.querySelector('#gp-content');
  if(!box) return;
  const _rw = box.querySelector('.gs-wrap[data-col="battle"]');
  if(!_rw) return;
  const live = window._raidLiveLog || [];
  let html = '';
  for(let i = 0; i < live.length; i++){
    const e = live[i];
    html += '<div class="raid-live-log-line ' + (e.cls || '') + '">' + _esc(e.text) + '</div>';
  }
  if(!html) html = '<div class="gs-empty" style="position:static;padding:20px 0">戰鬥開始…</div>';
  _rw.innerHTML = html;
  _rw.scrollTop = _rw.scrollHeight;
}

/* ===== 防禦戰主演出 ===== */
function _gardenRaidShowBattle(guards, enemies, region){
  if(window._raidLiveActive){ console.warn('[raid] raid 已在進行中，忽略重複觸發'); return; }
  const page = document.getElementById('garden-page');
  if(!page) return;
  const wrap = page.querySelector('.gp-grid-wrap');
  const grid = page.querySelector('#gp-grid');
  if(!wrap || !grid) return;
  _raidCleanupAll();
  wrap.style.position = 'relative';
  window._raidLiveLog = [];
  window._raidLiveActive = true;
  window._raidSurrenderWorkers = false;
  if(typeof _gardenUpdateBattleCol === 'function') setTimeout(_gardenUpdateBattleCol, 50);
  try {
    const _txtNodes = [];
    const _walk = function(node){
      if(node.nodeType === 3){
        if(node.textContent && /\[object /.test(node.textContent)) _txtNodes.push(node);
      } else if(node.nodeType === 1){
        if(node.children.length === 0 && node.textContent && /^\s*\[object /.test(node.textContent)){
          node.textContent = '';
        } else {
          for(let i = 0; i < node.childNodes.length; i++) _walk(node.childNodes[i]);
        }
      }
    };
    _walk(document.body);
    for(const n of _txtNodes){ try{ n.textContent = ''; }catch(e){} }
  } catch(e){}
  _gardenActiveTab = 'log';
  if(typeof renderGardenTabs === 'function') renderGardenTabs();
  if(typeof renderGardenContent === 'function') renderGardenContent();

  requestAnimationFrame(function(){
    const wrapRect = wrap.getBoundingClientRect();
    let wrapW = wrapRect.width || 320;
    let wrapH = wrapRect.height || 320;

    const overlay = document.createElement('div');
    overlay.id = 'raid-overlay';
    overlay.className = 'raid-overlay';
    overlay.innerHTML = '<canvas class="raid-canvas" id="raid-canvas"></canvas>';
    wrap.appendChild(overlay);

    const canvas = overlay.querySelector('#raid-canvas');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(wrapW * dpr));
    canvas.height = Math.max(1, Math.floor(wrapH * dpr));
    canvas.style.width = wrapW + 'px';
    canvas.style.height = wrapH + 'px';
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;

    const logEntries = window._raidLiveLog = [];
    function addLog(text, cls){ _raidLiveLogPush(text, cls); }

    const CHAR_PX = Math.min(74, Math.max(40, Math.floor(wrapH * 0.18)));
    const SCALE = CHAR_PX / 386;
    const MUZZLE_X_RIGHT = CHAR_PX * 0.60;
    const MUZZLE_X_LEFT = CHAR_PX * 0.60;
    const MUZZLE_Y_UP = CHAR_PX * 0.85;

    const guardUnits = [];
    for(const g of guards){
      const plotEl = grid.querySelector('.gp-plot[data-idx="' + g.towerIdx + '"]');
      if(!plotEl) continue;
      const pr = plotEl.getBoundingClientRect();
      const equipped = { head: null, top: null, primary: null, secondary: null, melee: null };
      const equippedRarity = {};
      const cfg = g.towerCfg || {};
      const eqCfg = cfg.eq || {};
      const eqRar = cfg.eqRarity || {};
      for(const s of ['head','top','primary','secondary']){
        if(eqCfg[s]){ equipped[s] = eqCfg[s]; equippedRarity[s] = eqRar[s] || '一般'; }
      }
      const weaponSlot = equipped.primary ? 'primary' : (equipped.secondary ? 'secondary' : null);
      const s = g.srv;
      const maxHp = (typeof servantMaxHp === 'function') ? servantMaxHp(s) : (100 + s.lv * 20);
      let armor = 0, armorLevel = 0;
      for(const slot of ['head','top']){
        const id = eqCfg[slot];
        if(!id) continue;
        const rar = eqRar[slot] || '一般';
        armor += (typeof equipArmorValue === 'function') ? equipArmorValue(id, rar) : 0;
        const d = ARMOR[id];
        if(d && d.level) armorLevel = Math.max(armorLevel, d.level);
      }
      const scopeBonus = g.weaponDef.scopeBonus || 0;
      const hitRate = (typeof servantHitRate === 'function') ? servantHitRate(s, '點射', scopeBonus) : 20;
      const ammoId = g.ammoId || cfg.ammoId;
      const ammoRarity = g.ammoRarity || (ammoId ? ((AMMO[ammoId] && AMMO[ammoId].rarity) || '一般') : '一般');
      const critRate = (typeof servantCritRate === 'function') ? servantCritRate(g.weaponRarity, ammoRarity) : 0.1;
      const critMult = (typeof servantCritMult === 'function') ? servantCritMult(g.weaponRarity, ammoRarity) : 1.5;
      const magCap = g.weaponDef.mag || 30;
      const stock = ammoId ? invCount(ammoId, ammoRarity) : 0;
      const ms = cfg.maxShots || 'inf';
      let budget;
      if(ms === 'skip') budget = 0;
      else if(ms === 'mag') budget = Math.min(stock, magCap);
      else budget = stock;
      guardUnits.push({
        srv: s, name: servantLabel(s) + ' Lv.' + s.lv,
        rpm: g.weaponDef.rpm || 600,
        x: pr.left - wrapRect.left + pr.width / 2,
        y: pr.top - wrapRect.top + pr.height - 4,
        hp: maxHp, maxHp: maxHp,
        armor: armor, maxArmor: armor, armorLevel: armorLevel,
        alive: true, isGuard: true,
        weaponDef: g.weaponDef, weaponRarity: g.weaponRarity,
        towerCfg: g.towerCfg, towerIdx: g.towerIdx,
        equipped: equipped, equippedRarity: equippedRarity, weaponSlot: weaponSlot,
        ammoId: ammoId, ammoRarity: ammoRarity, ammoStock: stock,
        ammoBudget: budget, ammoUsed: 0, magCap: magCap,
        hitRate: hitRate, critRate: critRate, critMult: critMult,
        animName: 'idle', animFrame: 0, animNext: 0, hurtUntil: 0,
        nextFireAt: 0
      });
    }
    window._raidGuardUnits = guardUnits;

    const enemyUnits = [];
    const _n = enemies.length;
    let _cols;
    if(_n <= 3) _cols = 1;
    else if(_n <= 6) _cols = 2;
    else _cols = 3;
    const _colGap = 50;
    const _rightBase = wrapW - 30;
    const _rowsPerCol = Math.ceil(_n / _cols);
    const _rowGap = Math.min(78, Math.max(52, Math.floor((wrapH - 80) / Math.max(1, _rowsPerCol))));
    for(let i = 0; i < _n; i++){
      const e = enemies[i];
      const _col = i % _cols;
      const _row = Math.floor(i / _cols);
      const _jx = (Math.random() - 0.5) * 16;
      const _jy = (Math.random() - 0.5) * 14;
      const _colX = _rightBase - _col * _colGap + _jx;
      const _rowsInThisCol = (_col === _cols - 1) ? (_n - _col * _rowsPerCol) : _rowsPerCol;
      const _totalH = _rowGap * _rowsInThisCol;
      const _topY = Math.max(60, wrapH / 2 - _totalH / 2 + 30);
      const _y = _topY + _row * _rowGap + _jy;
      const _eid = e.eid || e.id;
      const _ename = e.name || ((typeof ENEMIES !== 'undefined' && ENEMIES[_eid]) ? ENEMIES[_eid].name : _eid);
      const _dmg = e.dmg != null ? e.dmg : (e.primaryWeapon ? (e.primaryWeapon.dmg || 10) : 10);
      const _pen = e.pen != null ? e.pen : (e.primaryWeapon ? (e.primaryWeapon.penMM || 0) : 0);
      enemyUnits.push({
        id: _eid, name: _ename,
        dmg: _dmg, pen: _pen, armorLevel: e.armorLevel || 1,
        rpm: 300,
        homeX: _colX, homeY: _y,
        x: wrapW + 120, targetX: _colX, targetY: _y, slideIn: true,
        y: _y,
        hp: e.maxHp, maxHp: e.maxHp,
        armor: e.armor || 0, maxArmor: e.maxArmor || 0,
        alive: true, isGuard: false,
        state: 'combat',
        weaponId: 'ak74',
        animName: 'idle', animFrame: 0, animNext: 0, hurtUntil: 0,
        nextFireAt: 0,
        destroyUntil: 0,
        targetFieldIdx: -1,
        gone: false
      });
    }
    window._raidEnemyUnits = enemyUnits;

    const bullets = [];
    const damageTexts = [];
    const MAX_DMG_AGE = 900;
    let battleState = 'combat';
    let lastTickTime = performance.now();
    const brokenPlots = [];
    const _t0 = performance.now();
    for(const g of guardUnits) g.nextFireAt = _t0 + 300 + Math.random() * 500;
    for(const e of enemyUnits) e.nextFireAt = _t0 + 800 + Math.random() * 500;

    function tickAnim(u, now){
      if(u.isGuard){
        if(!u._animStart || u._lastAnimName !== u.animName){
          u._animStart = now;
          u._lastAnimName = u.animName;
        }
        u.animFrame = (typeof computeAnimFrame === 'function') ? computeAnimFrame(u.animName, u._animStart, now) : 0;
        return;
      }
      let anim = null;
      if(typeof _resolveEnemyAnims === 'function'){
        const _eid = (typeof HUMAN_ENEMY_DATA !== 'undefined' && HUMAN_ENEMY_DATA['human_' + u.id]) ? 'human_' + u.id : u.id;
        const _anims = _resolveEnemyAnims(_eid);
        if(_anims && _anims[u.animName]) anim = _anims[u.animName];
      }
      if(!anim) anim = GAME_ANIMS[u.animName] || GAME_ANIMS.idle;
      if(!anim) return;
      if(!u._animStart || u._lastAnimName !== u.animName){
        u._animStart = now;
        u._lastAnimName = u.animName;
      }
      const interval = 1000 / anim.fps;
      const elapsed = Math.max(0, now - u._animStart);
      let f = Math.floor(elapsed / interval);
      if(anim.loop){ f = f % anim.frameCount; }
      else if(f > anim.frameCount - 1){ f = anim.frameCount - 1; }
      u.animFrame = f;
    }

    function drawUnit(u, now){
      if(u.gone) return;
      if(!u.alive && u.animName !== 'death'){
        u.animName = 'death'; u.animFrame = 0; u.animNext = 0;
      }
      tickAnim(u, now);
      let ox = 0;
      if(now < u.hurtUntil){
        const t = 1 - (u.hurtUntil - now) / 220;
        ox += Math.sin(t * Math.PI * 5) * 3;
      }
      ctx.save();
      if(!u.isGuard && u.state === 'running_away'){
        ctx.translate(u.x + ox, 0);
        ctx.scale(-1, 1);
        ctx.translate(-(u.x + ox), 0);
      }
      if(u.isGuard){
        _raidDrawHuman(ctx, u.x + ox, u.y, SCALE, u.equipped, u.equippedRarity, u.animName, u.animFrame, u.weaponSlot, false);
      } else {
        _raidDrawEnemy(ctx, u.x + ox, u.y, SCALE, u.animName, u.animFrame, u.id);
      }
      ctx.restore();
      if(u.alive && u.state === 'combat'){
        const barW = 34, barH = 4;
        const bx = u.x - barW / 2;
        const by = u.y - CHAR_PX - 8;
        ctx.fillStyle = 'rgba(0,0,0,.75)';
        ctx.fillRect(bx - 1, by - 1, barW + 2, barH + 2);
        ctx.fillStyle = '#1a1010';
        ctx.fillRect(bx, by, barW, barH);
        ctx.fillStyle = u.isGuard ? '#4caf50' : '#e05252';
        ctx.fillRect(bx, by, barW * Math.max(0, u.hp / u.maxHp), barH);
      }
    }

    function drawBullet(b){
      ctx.save();
      const _bcol = b.isEnemy ? '#ff6060' : (_RARITY_COLOR[b.rarity] || '#ffd680');
      ctx.fillStyle = _bcol;
      ctx.shadowColor = _bcol;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(b.x, b.y, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    function drawDamage(d, now){
      const age = now - d.startTime;
      if(age > MAX_DMG_AGE) return;
      const t = age / MAX_DMG_AGE;
      let alpha, scale, offY;
      if(t < 0.15){ alpha = t / 0.15; scale = 0.6 + t / 0.15 * 0.7; offY = -t * 10; }
      else { alpha = Math.max(0, 1 - (t - 0.15) / 0.85); scale = 1.3 - (t - 0.15) * 0.4; offY = -10 - (t - 0.15) * 60; }
      ctx.save();
      ctx.globalAlpha = alpha;
      const size = d.crit ? 20 : 15;
      ctx.font = 'bold ' + Math.round(size * scale) + 'px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = d.crit ? '#ff3030' : (d.isEnemy ? '#ff8080' : '#ffd680');
      if(d.text === 'MISS') ctx.fillStyle = '#a89a85';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.strokeText(d.text, d.x, d.y + offY);
      ctx.fillText(d.text, d.x, d.y + offY);
      ctx.restore();
    }

    function guardsAlive(){ return guardUnits.some(function(u){ return u.alive; }); }
    function enemiesAlive(){ return enemyUnits.some(function(u){ return u.alive && u.state === 'combat'; }); }

    function spawnBullet(fromU, toU, hit, isEnemy){
      const sx = fromU.x + (isEnemy ? -MUZZLE_X_LEFT : MUZZLE_X_RIGHT);
      const sy = fromU.y - MUZZLE_Y_UP;
      let tx = toU.x;
      let ty = toU.y - MUZZLE_Y_UP;
      if(!hit){
        tx += (Math.random() - 0.5) * 70;
        ty += (Math.random() - 0.5) * 50;
      }
      let dmg = 0, crit = false;
      if(hit){
        if(isEnemy){
          dmg = fromU.dmg || 10;
        } else {
          const ammo = fromU.ammoId ? AMMO[fromU.ammoId] : null;
          const baseDmg = ammo ? Math.round(ammo.dmg * (RARITY_MULT[fromU.ammoRarity] || 1)) : Math.round((fromU.weaponDef.dmg || 20) * (RARITY_MULT[fromU.weaponRarity] || 1));
          dmg = baseDmg;
          if(Math.random() < fromU.critRate){ dmg = Math.round(dmg * fromU.critMult); crit = true; }
        }
      }
      bullets.push({ sx, sy, tx, ty, x: sx, y: sy, t: 0, speed: 2.5, hit, crit, damage: dmg, isEnemy, fromU, toU, rarity: fromU.isGuard ? (fromU.ammoRarity || '一般') : '一般' });
      const wAnim = isEnemy ? 'hurt' : (fromU.weaponSlot === 'secondary' ? 'fire_secondary' : 'fire_primary');
      fromU.animName = wAnim; fromU.animFrame = 0; fromU.animNext = 0;
      const _fu = fromU;
      setTimeout(function(){
        if(_fu.alive && _fu.animName === wAnim && _fu.state === 'combat'){ _fu.animName = 'idle'; _fu.animFrame = 0; _fu.animNext = 0; }
      }, 160);
    }

    function updateBullets(dt){
      for(let i = bullets.length - 1; i >= 0; i--){
        const b = bullets[i];
        b.t += b.speed * dt;
        if(b.t >= 1){
          b.x = b.tx; b.y = b.ty;
          onBulletHit(b);
          bullets.splice(i, 1);
          continue;
        }
        b.x = b.sx + (b.tx - b.sx) * b.t;
        b.y = b.sy + (b.ty - b.sy) * b.t;
      }
    }

    function onBulletHit(b){
      const toU = b.toU;
      if(!toU || !toU.alive){
        if(!b.hit) addLog(b.fromU.name + ' → ' + toU.name + '：已死', 'miss');
        return;
      }
      if(!b.hit){
        damageTexts.push({ x: toU.x, y: toU.y - CHAR_PX - 18, text: 'MISS', crit: false, isEnemy: b.isEnemy, startTime: Date.now() });
        addLog(b.fromU.name + ' → ' + toU.name + '：MISS', 'miss');
        return;
      }
      const tgt = { hp: toU.hp, armor: toU.armor };
      const pen = b.fromU.isGuard ? (b.fromU.ammoId && AMMO[b.fromU.ammoId] ? (AMMO[b.fromU.ammoId].penMM || 0) : (b.fromU.weaponDef.penMM || 0)) : (b.fromU.pen || 0);
      const res = applyDamage(tgt, b.damage, pen, toU.armorLevel || 0);
      toU.hp = tgt.hp; toU.armor = tgt.armor;
      const shown = res.hpLost > 0 ? res.hpLost : res.armorLost;
      b.fromU.dmgDone = (b.fromU.dmgDone || 0) + shown;
      if(b.fromU.isGuard && b.fromU.srv) servantAddExp(b.fromU.srv, 2);
      toU.hurtUntil = Date.now() + 180;
      toU.animName = 'hurt'; toU.animFrame = 0; toU.animNext = 0;
      const _tu = toU;
      setTimeout(function(){
        if(_tu.alive && _tu.animName === 'hurt' && _tu.state === 'combat'){ _tu.animName = 'idle'; _tu.animFrame = 0; _tu.animNext = 0; }
      }, 180);
      damageTexts.push({ x: toU.x, y: toU.y - CHAR_PX - 18, text: '-' + shown + (b.crit ? '!' : ''), crit: b.crit, isEnemy: b.isEnemy, startTime: Date.now() });
      addLog(b.fromU.name + ' → ' + toU.name + '：-' + shown + (b.crit ? '!暴擊' : ''), b.isEnemy ? 'enemy' : 'ally');
      if(toU.hp <= 0){
        toU.alive = false;
        toU.animName = 'idle'; toU.animFrame = 0;
        damageTexts.push({ x: toU.x, y: toU.y - CHAR_PX - 30, text: b.isEnemy ? '☠' : '✖', crit: false, isEnemy: b.isEnemy, startTime: Date.now() });
        addLog((b.isEnemy ? '☠ ' : '✖ ') + toU.name + ' 倒下', b.isEnemy ? 'kill' : 'down');
      }
    }

    function triggerSurrender(){
      window._raidSurrenderWorkers = true;
      addLog('🚩 工作僕人投降', 'lose');
      if(typeof _gardenActors !== 'undefined' && _gardenActors.length){
        const _deadGuardIds = {};
        for(const g of guardUnits){
          if(!g.alive && g.srv) _deadGuardIds[g.srv.id] = true;
        }
        _gardenActors = _gardenActors.filter(function(a){ return !_deadGuardIds[a.id]; });
      }
      setTimeout(function(){
        if(battleState !== 'ended' && battleState !== 'ending'){
          console.warn('[raid] 投降后 8 秒未结束，强制结束');
          battleState = 'ending';
          endBattle(false);
        }
      }, 8000);
    }

    function startDestroyPhase(){
      triggerSurrender();
      const plots = _gardenGetPlots();
      for(const e of enemyUnits){
        if(e.gone) continue;
        if(!e.alive){ e.gone = true; e.state = 'dead_before_destroy'; continue; }
      }
      const alive = enemyUnits.filter(function(e){ return e.alive && !e.gone; });
      const candidates = [];
      for(let i = 0; i < plots.length; i++){
        const p = plots[i];
        if(!p || !p.type) continue;
        if(p.broken) continue;
        candidates.push(i);
      }
      let _ci = 0;
      for(const e of alive){
        e.state = 'walk_to_field';
        if(candidates.length){
          const idx = candidates[_ci % candidates.length];
          _ci++;
          e.targetFieldIdx = idx;
          const plotEl = grid.querySelector('.gp-plot[data-idx="' + idx + '"]');
          if(plotEl){
            const pr = plotEl.getBoundingClientRect();
            e.targetX = pr.left - wrapRect.left + pr.width / 2;
            e.targetY = pr.top - wrapRect.top + pr.height - 4;
          } else {
            e.state = 'running_away';
            e.targetX = wrapW + 200;
            e.targetY = e.y;
          }
        } else {
          e.state = 'running_away';
          e.targetX = wrapW + 200;
          e.targetY = e.y;
        }
      }
      addLog('⚔️ 敵人開始破壞田地', 'kill');
    }

    function tickDestroyPhase(now, dt){
      const liveEnemies = enemyUnits.filter(function(e){ return !e.gone; });
      if(!liveEnemies.length){
        if(battleState === 'destroying'){
          battleState = 'ending';
          setTimeout(function(){ endBattle(false); }, 400);
        }
        return;
      }
      const spd = 180 * dt;
      for(const e of liveEnemies){
        if(e.state === 'walk_to_field'){
          const dx = e.targetX - e.x;
          const dy = e.targetY - e.y;
          const d = Math.sqrt(dx*dx + dy*dy);
          if(d < 6){
            e.state = 'destroying';
            e.destroyUntil = now + 2000;
            e.animName = 'idle'; e.animFrame = 0; e.animNext = 0;
            addLog(e.name + ' 開始破壞田地', 'kill');
          } else {
            const step = Math.min(d, spd);
            e.x += (dx / d) * step;
            e.y += (dy / d) * step;
            e.animName = 'walk';
          }
        } else if(e.state === 'destroying'){
          if(now >= e.destroyUntil){
            if(e.targetFieldIdx >= 0){
              const plots = _gardenGetPlots();
              const plot = plots[e.targetFieldIdx];
              if(plot && !plot.broken){
                plot.broken = true;
                if(plot.crop) plot.crop = null;
                brokenPlots.push(e.targetFieldIdx);
                addLog(plotCoordName(e.targetFieldIdx) + ' 被破壞', 'kill');
              }
            }
            e.state = 'running_away';
            e.targetX = wrapW + 200;
            e.targetY = e.y;
          }
        } else if(e.state === 'running_away'){
          const dx = e.targetX - e.x;
          const d = Math.abs(dx);
          if(d < 6){
            e.gone = true;
            e.alive = false;
          } else {
            e.x += Math.sign(dx) * Math.min(d, spd * 1.6);
            e.animName = 'walk';
          }
        }
      }
    }

    function tickCombat(now, dt){
      updateBullets(dt);
      if(battleState === 'combat'){
        for(const g of guardUnits){
          if(!g.alive) continue;
          if(now < g.nextFireAt) continue;
          const alive = enemyUnits.filter(function(e){ return e.alive && e.state === 'combat'; });
          if(!alive.length) break;
          if(g.ammoId){
            if(g.ammoUsed >= g.ammoBudget) continue;
            g.ammoUsed++;
          }
          const target = alive[Math.floor(Math.random() * alive.length)];
          const hit = Math.random() * 100 < g.hitRate;
          spawnBullet(g, target, hit, false);
          g.nextFireAt = now + 60000 / g.rpm;
        }
        for(const e of enemyUnits){
          if(!e.alive || e.state !== 'combat') continue;
          if(now < e.nextFireAt) continue;
          const alive = guardUnits.filter(function(g){ return g.alive; });
          if(!alive.length) break;
          const target = alive[Math.floor(Math.random() * alive.length)];
          const hit = Math.random() * 100 < 75;
          spawnBullet(e, target, hit, true);
          e.nextFireAt = now + 60000 / e.rpm;
        }
        if(!enemiesAlive()){
          battleState = 'ending';
          addLog('⚔️ 防禦成功', 'win');
          setTimeout(function(){ endBattle(true); }, 1200);
          return;
        }
        if(!guardsAlive()){
          battleState = 'destroying';
          addLog('💀 後院失守', 'lose');
          startDestroyPhase();
          return;
        }
      } else if(battleState === 'destroying'){
        tickDestroyPhase(now, dt);
      }
    }

    function endBattle(win){
      if(battleState === 'ended') return;
      battleState = 'ended';
      window._raidLiveActive = false;
      try { window._raidSurrenderWorkers = false; } catch(e){}
      try {
        if(typeof _gardenActors !== 'undefined' && _gardenActors.length){
          for(const a of _gardenActors){ if(a.state === 'surrender') a.state = 'idle'; }
        }
      } catch(e){}
      try {
        var _ovs = document.querySelectorAll('#raid-overlay');
        for(var _oi = 0; _oi < _ovs.length; _oi++){ try{ _ovs[_oi].remove(); }catch(_e){} }
      } catch(e){ console.warn('[endBattle remove ov]', e); }
      try {
        const sim = { log: logEntries, guards: guardUnits, enemies: enemyUnits, win: win, rounds: 1, brokenPlots: brokenPlots.slice() };
        _gardenRaidApplyResult(sim, region);
      } catch(e){ console.warn('[raid apply]', e); }
      try { _gardenActiveTab = 'log'; } catch(e){}
      try { if(typeof renderGardenTabs === 'function') renderGardenTabs(); } catch(e){}
      try { if(typeof renderGardenContent === 'function') renderGardenContent(); } catch(e){}
      try { if(typeof renderGardenGrid === 'function') renderGardenGrid(); } catch(e){}
      try { if(typeof _gardenStartActorLoop === 'function') _gardenStartActorLoop(); } catch(e){ console.warn('[start actor loop]', e); }
      try { if(typeof _gardenStartActorCanvasLoop === 'function') _gardenStartActorCanvasLoop(); } catch(e){ console.warn('[start actor canvas]', e); }
      setTimeout(function(){
        try { if(typeof _gardenSyncActors === 'function') _gardenSyncActors(); } catch(e){}
        try {
          var _acs = document.querySelectorAll('#gp-actor-canvas');
          for(var _ai = 0; _ai < _acs.length; _ai++){
            var _ac = _acs[_ai];
            var _c2 = _ac.getContext('2d');
            if(_c2) _c2.clearRect(0, 0, _ac.width, _ac.height);
          }
        } catch(e){ console.warn('[endBattle clear actor canvas]', e); }
      }, 100);
    }

    function renderLoop(){
      if(!window._raidLiveActive) return;
      if(!page.querySelector('#raid-overlay')) return;
      const nowP = performance.now();
      const dt = Math.min(0.05, (nowP - lastTickTime) / 1000);
      lastTickTime = nowP;
      tickCombat(nowP, dt);
      const nowD = Date.now();
      ctx.clearRect(0, 0, wrapW, wrapH);

      for(const u of enemyUnits){
        if(u.slideIn){
          const diff = u.x - u.targetX;
          if(diff > 1) u.x -= diff * 0.12;
          else { u.x = u.targetX; u.slideIn = false; }
        }
      }

      for(let i = damageTexts.length - 1; i >= 0; i--){
        if(nowD - damageTexts[i].startTime > MAX_DMG_AGE) damageTexts.splice(i, 1);
      }

      for(const u of guardUnits){
        if(!u.alive) continue;
        const barW = 34, barH = 4;
        const bx = u.x - barW / 2;
        const by = u.y - CHAR_PX - 8;
        ctx.fillStyle = 'rgba(0,0,0,.75)';
        ctx.fillRect(bx - 1, by - 1, barW + 2, barH + 2);
        ctx.fillStyle = '#1a1010';
        ctx.fillRect(bx, by, barW, barH);
        ctx.fillStyle = '#4caf50';
        ctx.fillRect(bx, by, barW * Math.max(0, u.hp / u.maxHp), barH);
      }

      for(const u of enemyUnits) drawUnit(u, nowD);
      for(const b of bullets) drawBullet(b);
      for(const d of damageTexts) drawDamage(d, nowD);

      requestAnimationFrame(renderLoop);
    }

    addLog('⚔️ 戰鬥開始 · ' + region, 'round');
    requestAnimationFrame(renderLoop);
  });
}

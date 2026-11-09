
'use strict';

const _VEHICLE_PART_PROB = [
  { key: 'hullFront',   w: 30 },
  { key: 'side',        w: 25 },
  { key: 'rear',        w: 15 },
  { key: 'turretFront', w: 20 },
  { key: 'turretSide',  w: 10 }
];

const _VEHICLE_INTERNAL_WEIGHTS = {
  default: { ammoRack: 0.10, crew: 0.20, engine: 0.20, tracks: 0.10, gun: 0.20, turret: 0.20 },
  btr80:   { ammoRack: 0.10, crew: 0.22, engine: 0.24, tracks: 0.06, gun: 0.18, turret: 0.20 },
  btr80a:  { ammoRack: 0.10, crew: 0.22, engine: 0.24, tracks: 0.06, gun: 0.18, turret: 0.20 },
  btr82:   { ammoRack: 0.10, crew: 0.22, engine: 0.24, tracks: 0.06, gun: 0.18, turret: 0.20 },
  btr82a:  { ammoRack: 0.10, crew: 0.22, engine: 0.24, tracks: 0.06, gun: 0.18, turret: 0.20 },
  btr90:   { ammoRack: 0.12, crew: 0.22, engine: 0.24, tracks: 0.06, gun: 0.16, turret: 0.20 },
  bmp1:    { ammoRack: 0.14, crew: 0.20, engine: 0.18, tracks: 0.12, gun: 0.18, turret: 0.18 },
  bmp1m:   { ammoRack: 0.14, crew: 0.20, engine: 0.18, tracks: 0.12, gun: 0.18, turret: 0.18 },
  bmp2:    { ammoRack: 0.14, crew: 0.20, engine: 0.18, tracks: 0.12, gun: 0.18, turret: 0.18 },
  bmp3:    { ammoRack: 0.15, crew: 0.20, engine: 0.17, tracks: 0.12, gun: 0.18, turret: 0.18 },
  bmd4:    { ammoRack: 0.15, crew: 0.20, engine: 0.17, tracks: 0.12, gun: 0.18, turret: 0.18 },
  t80:     { ammoRack: 0.20, crew: 0.18, engine: 0.16, tracks: 0.12, gun: 0.16, turret: 0.18 },
  t80b:    { ammoRack: 0.20, crew: 0.18, engine: 0.16, tracks: 0.12, gun: 0.16, turret: 0.18 },
  t80bv:   { ammoRack: 0.20, crew: 0.18, engine: 0.16, tracks: 0.12, gun: 0.16, turret: 0.18 },
  t80u:    { ammoRack: 0.20, crew: 0.18, engine: 0.16, tracks: 0.12, gun: 0.16, turret: 0.18 },
  t80uk:   { ammoRack: 0.20, crew: 0.18, engine: 0.16, tracks: 0.12, gun: 0.16, turret: 0.18 },
  t80um:   { ammoRack: 0.20, crew: 0.18, engine: 0.16, tracks: 0.12, gun: 0.16, turret: 0.18 }
};

const _VEHICLE_MAIN_AMMO = {
  '2a46':   [{ id: '3bm42', type: 'ap' }, { id: '3of26', type: 'he' }, { id: '3bk29', type: 'heat' }],
  '2a46m1': [{ id: '3bm42', type: 'ap' }, { id: '3of26', type: 'he' }, { id: '3bk29', type: 'heat' }],
  '2a70':   [{ id: '3uof17', type: 'he' }],
  '2a28':   [{ id: 'pg15v', type: 'heat' }, { id: 'og15v', type: 'he' }]
};

const _LEG_MULT = 5;
/* rev-fix-vehicle-crit-delegate: 載具武器彈藥定義為傳奇，統一走公式 */
const _VEHICLE_CRIT_RATE = (typeof calcCritRate === 'function') ? calcCritRate('傳奇', '傳奇') : 0.60;
const _VEHICLE_CRIT_MULT = (typeof calcCritMult === 'function') ? calcCritMult('傳奇', '傳奇') : 7.5;

/* rev-fix-splash: 載具濺射參數表
 * maxR 為「傷害歸零」的距離，比現實「保證殺傷半徑」長，代表破片飛散極限。
 * blastPen 為距離 0 的近距等效穿深（遊戲代理值）。
 * HE 類 blastPen = 直擊穿深；HEAT/ATGM 類 blastPen 遠低於直擊（定向聚流不擴散）。
 */
/* rev-fix-splash-v2 */
const VEHICLE_SPLASH = {
  '3of26':    { blastPen: 45, maxR: 60, splashRatio: 0.50 },
  '3uof17':    { blastPen: 35, maxR: 50, splashRatio: 0.50 },
  'og15v': { blastPen: 25, maxR: 30, splashRatio: 0.40 },
  '3bk29':    { blastPen: 18, maxR: 25, splashRatio: 0.35 },
  'pg15v':   { blastPen: 12, maxR: 20, splashRatio: 0.35 },
  'atgm':     { blastPen: 22, maxR: 22, splashRatio: 0.35 },
  '30mm_hef': { blastPen: 10, maxR: 10, splashRatio: 0.20 }
};

function _getVehicleSplashParams(wid, usedAmmoId, mixIsHE, preset){
  if(usedAmmoId && VEHICLE_SPLASH[usedAmmoId]) return VEHICLE_SPLASH[usedAmmoId];
  if(wid === 'atgm') return VEHICLE_SPLASH['atgm'];
  if((wid === '2a42' || wid === '2a72') && (mixIsHE === true || preset === '高爆')) return VEHICLE_SPLASH['30mm_hef'];
  return null;
}

function _applyVehicleSplash(sp, mainTarget, baseDmg, ratioMult, wid, usedAmmoId){
  const c = window._combat;
  const ex = window._explore;
  if(!c || !ex || !sp || !mainTarget) return;
  const impactRelWorldX = mainTarget.worldX;
  const impactAbsWorldX = ex.worldX + impactRelWorldX;
  const maxDmg = baseDmg * sp.splashRatio * (ratioMult || 1.0);
  const targets = [];
  for(let i = 0; i < c.enemies.length; i++){
    if(c.enemies[i] === mainTarget) continue;
    if(c.enemies[i].hp <= 0) continue;
    targets.push({ enemy: c.enemies[i], type: 'current' });
  }
  for(let ni = 0; ni < ex.nodes.length; ni++){
    const node = ex.nodes[ni];
    for(let ei = 0; ei < node.events.length; ei++){
      const ev = node.events[ei];
      if(ev.cleared) continue;
      if(ev.type !== 'combat') continue;
      if(!ev.content) continue;
      for(let j = 0; j < ev.content.length; j++){
        const en = ev.content[j];
        if(en.hp <= 0) continue;
        let dup = false;
        for(let k = 0; k < c.enemies.length; k++){ if(c.enemies[k] === en){ dup = true; break; } }
        if(dup) continue;
        targets.push({ enemy: en, type: 'event', event: ev });
      }
    }
  }
  for(let ti = 0; ti < targets.length; ti++){
    const t = targets[ti];
    let dist;
    if(t.type === 'current') dist = Math.abs(t.enemy.worldX - impactRelWorldX);
    else dist = Math.abs(t.enemy.worldX - impactAbsWorldX);
    if(dist >= sp.maxR) continue;
    const tt = dist / sp.maxR;
    const falloff = 1 - tt * tt;
    if(falloff <= 0) continue;
    const dmgVal = Math.round(maxDmg * falloff);
    if(dmgVal <= 0) continue;
    const penVal = sp.blastPen * falloff;
    const proxy = { hp: t.enemy.hp, armor: t.enemy.armor || 0 };
    const res = applyDamage(proxy, dmgVal, penVal, {
      armorProvider: function(part){ return (typeof getEnemyArmorMMForPart === 'function') ? getEnemyArmorMMForPart(t.enemy, part) : 0; }
    });
    t.enemy.hp = proxy.hp;
    if(t.enemy.armor !== undefined) t.enemy.armor = proxy.armor;
    const shown = res.hpLost > 0 ? res.hpLost : res.armorLost;
    const rel = (t.type === 'current') ? t.enemy.worldX : (t.enemy.worldX - ex.worldX);
    _vehicleCombatFloat(rel, '-' + shown, res.hpLost > 0 ? 'enemy' : 'armor');
    if(t.enemy.hp <= 0){
      _onBTRKillTarget(t.enemy, wid, c, usedAmmoId);
      if(t.type === 'event' && t.event && t.event.content){
        t.event.content = t.event.content.filter(function(x){ return x !== t.enemy; });
        if(!t.event.content.length) t.event.cleared = true;
      }
    }
  }
}

window._vehicleWeaponsDead = function(){
  /* rev-fix-weapon-hp-dead-v2: 每把武器 HP + 炮塔卡死 + 彈藥判定 */
  const g = (typeof _garageInitState === 'function') ? _garageInitState() : null;
  const vid = g ? g.currentVehicle : 'btr80';
  const dmg = state.vehicleDamage && state.vehicleDamage[vid];
  if(!dmg) return false;
  if(dmg.destroyed) return true;
  if(dmg.members && dmg.members.gunner <= 0 && dmg.members.commander <= 0) return true;

  const ld = (typeof _getLoadout === 'function') ? _getLoadout(vid) : null;
  if(!ld || !Object.keys(ld).length) return true;

  const TURRET_WEAPONS_BY_VID = {
    btr80:  { kpvt:1, pkt:1 },
    btr80a: { '2a72':1, pkt:1 },
    btr82:  { kpvt:1, pkt:1 },
    btr82a: { '2a72':1, pkt:1 },
    btr90:  { '2a42':1, pkt:1 },
    bmp1:   { '2a28':1, pkt:1 },
    bmp1m:  { '2a72':1, pkt:1 },
    bmp2:   { '2a42':1, pkt:1 },
    bmp3:   { '2a70':1, '2a72':1, pkt:1 },
    bmd4:   { '2a70':1, '2a72':1, pkt:1 },
    t80:    { '2a46':1, pkt:1 },
    t80b:   { '2a46':1, pkt:1 },
    t80bv:  { '2a46':1, pkt:1 },
    t80u:   { '2a46m1':1, pkt:1 },
    t80uk:  { '2a46m1':1, pkt:1 },
    t80um:  { '2a46m1':1, pkt:1 }
  };
  const turretWeapons = TURRET_WEAPONS_BY_VID[vid] || {};
  const turretDead = dmg.parts && dmg.parts.turret <= 0;
  const ammoState = state.vehicleAmmo && state.vehicleAmmo[vid];

  for(const wid in ld){
    /* 武器 HP 歸零 → 不可用 */
    if(dmg.weapons && dmg.weapons[wid] && dmg.weapons[wid].hp <= 0) continue;
    /* 炮塔卡死 → 炮塔內武器不可用 */
    if(turretWeapons[wid] && turretDead) continue;
    /* 彈藥判定 */
    const a = ammoState && ammoState[wid];
    if(!a){
      const mx = ld[wid].belts ? ld[wid].belts * ld[wid].perBelt : (ld[wid].rounds || 0);
      if(mx > 0) return false;
      continue;
    }
    if(a.breakdown){
      /* rev-fix-weapon-hp-dead-v3: 只算 VEHICLE_MAIN_AMMO_POOL 中的有效 ID，忽略舊 ID */
      const _validIdsD = (typeof VEHICLE_MAIN_AMMO_POOL !== 'undefined' && VEHICLE_MAIN_AMMO_POOL[wid])
        ? VEHICLE_MAIN_AMMO_POOL[wid].map(function(x){ return x.id; })
        : null;
      let sum = 0;
      for(const k in a.breakdown){
        if(_validIdsD && _validIdsD.indexOf(k) < 0) continue;
        sum += (a.breakdown[k] || 0);
      }
      if(sum > 0) return false;
    } else if((a.current || 0) > 0){
      return false;
    }
  }
  return true;
};

function _p28PickDensest(tg, p){
  if(!tg.length) return null;
  let best = tg[0], bestScore = -1;
  for(let i = 0; i < tg.length; i++){
    let sc = 1;
    for(let j = 0; j < tg.length; j++){
      if(i === j) continue;
      if(Math.abs(tg[j].worldX - tg[i].worldX) <= 12) sc++;
    }
    const dist = Math.abs(tg[i].worldX - p.worldX);
    const score = sc * 1000 - dist;
    if(score > bestScore){ bestScore = score; best = tg[i]; }
  }
  return best;
}

window._pickBTRTarget = function(wid, syncGroup){
  const c = window._combat;
  if(!c || !c.active || c.resolved || c.sceneType !== 'vehicle') return null;
  const p = c.allies[0];
  if(!p || !p.isVehicle) return null;

  const _vhHalf = (typeof window.getVehicleHalfLengthWorld === 'function') ? window.getVehicleHalfLengthWorld(p.vehicleId) : 3.6;
  const alive = [];
  for(let i = 0; i < c.enemies.length; i++){
    if(c.enemies[i].hp > 0 && c.enemies[i].worldX > p.worldX + _vhHalf) alive.push(c.enemies[i]);
  }
  if(!alive.length) return null;

  let r = (typeof VEHICLE_RANGE_M !== 'undefined' && VEHICLE_RANGE_M[wid]) ? VEHICLE_RANGE_M[wid] : 300;
  if(typeof hasCrewTalent === 'function' && hasCrewTalent('commander', 'commander_sense')) r *= 1.15;

  const tg = [];
  for(let a = 0; a < alive.length; a++){
    if(window.canEngage(r, alive[a], Math.abs(alive[a].worldX - p.worldX))) tg.push(alive[a]);
  }
  if(!tg.length) return null;

  if(syncGroup !== 'main'){
    const _mainSync = window._btrSyncTargets && window._btrSyncTargets['main'];
    if(_mainSync && _mainSync.hp > 0 && tg.indexOf(_mainSync) >= 0) return _mainSync;
  }
  if(syncGroup && window._btrSyncTargets){
    const _st = window._btrSyncTargets[syncGroup];
    if(_st && _st.hp > 0 && tg.indexOf(_st) >= 0) return _st;
  }

  const bd = function(x, y){ return Math.abs(x.worldX - p.worldX) - Math.abs(y.worldX - p.worldX); };
  const isSplashWid = (wid === '2a70' || wid === '2a28' || wid === '2a46' || wid === '2a46m1');

  if(wid === 'atgm'){
    tg.sort(function(a, b){ return Math.abs(b.worldX - p.worldX) - Math.abs(a.worldX - p.worldX); });
    return tg[0];
  }

  if(isSplashWid) return _p28PickDensest(tg, p);

  if(c.playerFirst){
    const rpg = [];
    for(let r2 = 0; r2 < tg.length; r2++){
      if(tg[r2].hasRPG && tg[r2].rpgAmmo > 0) rpg.push(tg[r2]);
    }
    rpg.sort(bd);
    if(rpg.length) return rpg[0];
    tg.sort(bd);
    return tg[0];
  }

  tg.sort(bd);
  return tg[0];
};

function _getVehicleAmmoStats(wid, ammoId){
  if(ammoId){
    if(ammoId === '3bm42') return VEHICLE_WEAPON_STATS['2a46_apfsds'];
    if(ammoId === '3of26') return VEHICLE_WEAPON_STATS['2a46_he'];
    if(ammoId === '3bk29') return VEHICLE_WEAPON_STATS['2a46_heat'];
    if(ammoId === '3uof17') return VEHICLE_WEAPON_STATS['2a70_he'];
    if(ammoId === 'pg15v') return VEHICLE_WEAPON_STATS['2a28_heat'];
    if(ammoId === 'og15v') return VEHICLE_WEAPON_STATS['2a28_he'];
  }
  if(wid === 'pkt') return VEHICLE_WEAPON_STATS.pkt;
  if(wid === 'kpvt'){
    const _gK = (typeof _garageInitState === 'function') ? _garageInitState() : null;
    const _vidK = _gK ? _gK.currentVehicle : 'btr80';
    const _aK = state.vehicleAmmo && state.vehicleAmmo[_vidK] && state.vehicleAmmo[_vidK][wid];
    if(_aK && _aK.preset === '高爆') return VEHICLE_WEAPON_STATS['kpvt_mdz'];
    return VEHICLE_WEAPON_STATS.kpvt;
  }
  if(wid === 'nsvt'){
    const _gN = (typeof _garageInitState === 'function') ? _garageInitState() : null;
    const _vidN = _gN ? _gN.currentVehicle : 'btr80';
    const _aN = state.vehicleAmmo && state.vehicleAmmo[_vidN] && state.vehicleAmmo[_vidN][wid];
    if(_aN && _aN.preset === '高爆') return VEHICLE_WEAPON_STATS['nsvt_md'];
    return VEHICLE_WEAPON_STATS.nsvt;
  }
  if(wid === '2a72' || wid === '2a42'){
    const g = (typeof _garageInitState === 'function') ? _garageInitState() : null;
    const vid = g ? g.currentVehicle : 'btr80';
    const a = state.vehicleAmmo && state.vehicleAmmo[vid] && state.vehicleAmmo[vid][wid];
    const preset = (a && a.preset) || '穿燃';
    if(preset === '高爆') return VEHICLE_WEAPON_STATS['30mm_hef'];
    return VEHICLE_WEAPON_STATS['30mm_ap'];
  }
  if(wid === 'atgm'){
    return VEHICLE_WEAPON_STATS['atgm_9m113'];
  }
  return null;
}

function _isHEAmmo(wid, ammoId){
  if(ammoId === '3of26' || ammoId === '3uof17' || ammoId === 'og15v') return true;
  if(wid === '2a72' || wid === '2a42'){
    const g = (typeof _garageInitState === 'function') ? _garageInitState() : null;
    const vid = g ? g.currentVehicle : 'btr80';
    const a = state.vehicleAmmo && state.vehicleAmmo[vid] && state.vehicleAmmo[vid][wid];
    return !!(a && a.preset === '高爆');
  }
  return false;
}

function _getSplashRatio(dist, wid, ammoId){
  let splashDef = null;
  if(ammoId && VEHICLE_HE_SPLASH[ammoId]) splashDef = VEHICLE_HE_SPLASH[ammoId];
  if(!splashDef){
    if(wid === '2a28') splashDef = VEHICLE_HE_SPLASH['2a28_he'];
    else if(wid === '2a70') splashDef = VEHICLE_HE_SPLASH['2a70_he'];
    else if(wid === '2a46' || wid === '2a46m1') splashDef = VEHICLE_HE_SPLASH['2a46_he'];
  }
  if(!splashDef) return 0;
  if(dist <= splashDef.full) return 1.0;
  if(dist >= splashDef.max) return 0;
  return (splashDef.max - dist) / (splashDef.max - splashDef.full);
}

function _vehicleCombatFloat(relWorldX, text, cls){
  const c = window._combat;
  if(!c) return;
  const sm = c.sm;
  let sx;
  if(relWorldX < 0) sx = 0.05;
  else {
    sx = EXPLORE_HERO_X_RATIO + (relWorldX / sm.screenRightWorld) * (1 - EXPLORE_HERO_X_RATIO);
    if(sx > 0.95) sx = 0.95;
  }
  c.floats.push({ text: text, cls: cls || '', age: 0, x: sx, y: 0.15 });
}

function _applyHESplash(wid, mainTarget, baseDmg, isCrit, penMM, ammoId){
  const c = window._combat;
  const ex = window._explore;
  if(!c || !ex) return;

  const impactRelWorldX = mainTarget ? mainTarget.worldX : 0;
  const impactAbsWorldX = ex.worldX + impactRelWorldX;

  const targets = [];

  for(let i = 0; i < c.enemies.length; i++){
    if(c.enemies[i] === mainTarget) continue;
    if(c.enemies[i].hp <= 0) continue;
    targets.push({ enemy: c.enemies[i], type: 'current' });
  }

  for(let ni = 0; ni < ex.nodes.length; ni++){
    const node = ex.nodes[ni];
    for(let ei = 0; ei < node.events.length; ei++){
      const ev = node.events[ei];
      if(ev.cleared) continue;
      if(ev.type !== 'combat') continue;
      if(!ev.content) continue;
      for(let j = 0; j < ev.content.length; j++){
        const en = ev.content[j];
        if(en.hp <= 0) continue;
        let dup = false;
        for(let k = 0; k < c.enemies.length; k++){
          if(c.enemies[k] === en){ dup = true; break; }
        }
        if(dup) continue;
        targets.push({ enemy: en, type: 'event', event: ev });
      }
    }
  }

  for(let ti = 0; ti < targets.length; ti++){
    const t = targets[ti];
    let dist;
    if(t.type === 'current'){
      dist = Math.abs(t.enemy.worldX - impactRelWorldX);
    } else {
      dist = Math.abs(t.enemy.worldX - impactAbsWorldX);
    }
    const ratio = _getSplashRatio(dist, wid, ammoId);
    if(ratio <= 0) continue;

    const splashDmg = Math.max(1, Math.round(baseDmg * ratio));

    const proxy = { hp: t.enemy.hp, armor: t.enemy.armor || 0 };
    const res = applyDamage(proxy, splashDmg, penMM || 0, { isHE: true });
    t.enemy.hp = proxy.hp;
    if(t.enemy.armor !== undefined) t.enemy.armor = proxy.armor;

    const rel = (t.type === 'current') ? t.enemy.worldX : (t.enemy.worldX - ex.worldX);
    _vehicleCombatFloat(rel, '-' + res.hpLost, 'enemy');

    if(t.enemy.hp <= 0){
      const eName = (typeof ENEMIES !== 'undefined' && ENEMIES[t.enemy.eid]) ? ENEMIES[t.enemy.eid].name : t.enemy.eid;
      if(typeof pushLog === 'function'){
        (function(){var _vidH140=(state.garage&&state.garage.currentVehicle)||'btr80';var _wn=(typeof window._vehicleWeaponDisplayName==='function')?window._vehicleWeaponDisplayName(wid,_vidH140):({ '2a46':'125mm 2A46','2a46m1':'125mm 2A46M-1','2a70':'100mm 2A70','2a28':'73mm 2A28','2a42':'30mm 2A42','2a72':'30mm 2A72','kpvt':'14.5mm KPVT','nsvt':'12.7mm NSVT','pkt':'7.62mm PKT','atgm':'ATGM' }[wid]||(wid?wid.toUpperCase():'未知武器'));var _af={'3bm42':'3BM42 穿甲','3of26':'3OF26 高爆','3bk29':'3BK29 破甲','3uof17':'3UOF17 高爆','pg15v':'PG-15V 破甲','og15v':'OG-15V 高爆'}[ammoId];var _fm=_af?('（'+_af+'）'):(ammoId==='atgm'?'（反坦克導彈）':(ammoId?'（'+ammoId+'）':''));pushLog('<span class="run">'+_wn+_fm+'</span> 濺射擊殺 <b class="r-'+(t.enemy.rarity||'一般')+'">'+eName+'</b>', [], 'explore');})();
      }
      if(typeof _grantBTRCrewExp === 'function') _grantBTRCrewExp(3);
      /* [v195c D] 車戰濺射擊殺：每敵人 3 玩家經驗 + 事件清空時 roll 信物。 */
      if(typeof addExp === 'function') addExp(3);
      if(typeof window._settleVehicleEventIfCleared === 'function') window._settleVehicleEventIfCleared(t.enemy);
      if(t.type === 'event' && t.event && t.event.content){
        t.event.content = t.event.content.filter(function(x){ return x !== t.enemy; });
        if(!t.event.content.length) t.event.cleared = true;
      }
      if(window.BTRSupport && typeof window.BTRSupport.killCount === 'number'){
        window.BTRSupport.killCount = (window.BTRSupport.killCount || 0) + 1;
        if(!window.BTRSupport.kills) window.BTRSupport.kills = {};
        window.BTRSupport.kills[t.enemy.eid] = (window.BTRSupport.kills[t.enemy.eid] || 0) + 1;
        if(!window.BTRSupport.weaponKills) window.BTRSupport.weaponKills = {};
        var _killKey = wid + (ammoId ? ':' + ammoId : '');
        window.BTRSupport.weaponKills[_killKey] = (window.BTRSupport.weaponKills[_killKey] || 0) + 1;
        if(typeof rollEnemyLoot === 'function'){
          const loot = rollEnemyLoot(t.enemy);
          if(!window.BTRSupport.loot) window.BTRSupport.loot = [];
          for(let li = 0; li < loot.length; li++){
            invAdd(loot[li].id, loot[li].rarity, loot[li].count);
            window.BTRSupport.loot.push(loot[li]);
          }
        }
      }
    }
  }
}

window._onBTRFire = function(wid, now, syncGroup, preselectedTarget){
  const c = window._combat;
  if(!c || !c.active || c.resolved || c.sceneType !== 'vehicle') return false;
  const p = c.allies[0];
  if(!p || !p.isVehicle) return false;
  /* rev-fix-weapon-hp-fire: 該武器 HP 歸零 → 不可開火 */
  const _vd = state.vehicleDamage && state.vehicleDamage[p.vehicleId];
  if(_vd && _vd.weapons && _vd.weapons[wid] && _vd.weapons[wid].hp <= 0) return false;

  const alive = [];
  for(let i = 0; i < c.enemies.length; i++){
    if(c.enemies[i].hp > 0 && c.enemies[i].worldX > p.worldX) alive.push(c.enemies[i]);
  }

  let target = null;
  let _preselectedDead = false;
  if(preselectedTarget){
    target = preselectedTarget;
    if(target.hp <= 0) _preselectedDead = true;
  }
  if(!target){
    if(!alive.length){
      if(syncGroup && window._btrSyncTargets) delete window._btrSyncTargets[syncGroup];
      return false;
    }
    target = window._pickBTRTarget(wid, syncGroup);
    if(!target){
      if(syncGroup && window._btrSyncTargets) delete window._btrSyncTargets[syncGroup];
      return false;
    }
    if(syncGroup && window._btrSyncTargets) window._btrSyncTargets[syncGroup] = target;
  }

  const _ammoObj = state.vehicleAmmo && state.vehicleAmmo[p.vehicleId] && state.vehicleAmmo[p.vehicleId][wid];
  let _usedAmmoId = null;

  if(_ammoObj && _ammoObj.breakdown){
    const defsA = _VEHICLE_MAIN_AMMO[wid] || [];
    const orderA = alive.length >= 2 ? ['he', 'heat', 'ap'] : ['ap', 'heat', 'he'];
    for(let oiA = 0; oiA < orderA.length && !_usedAmmoId; oiA++){
      for(let diA = 0; diA < defsA.length; diA++){
        if(defsA[diA].type === orderA[oiA] && (_ammoObj.breakdown[defsA[diA].id] || 0) > 0){
          _usedAmmoId = defsA[diA].id;
          break;
        }
      }
    }
    if(_usedAmmoId){
      _ammoObj.breakdown[_usedAmmoId] = Math.max(0, (_ammoObj.breakdown[_usedAmmoId] || 0) - 1);
      _ammoObj.current = Math.max(0, (_ammoObj.current || 0) - 1);
    }
  } else if(_ammoObj){
    _ammoObj.current = Math.max(0, (_ammoObj.current || 0) - 1);
  }

  if(_preselectedDead) return true;

  const g = (function(){
    const cr = state.station && state.station.crew;
    if(!cr || !cr.gunner) return null;
    for(let i = 0; i < state.servants.length; i++){
      if(state.servants[i].id === cr.gunner) return state.servants[i];
    }
    return null;
  })();
  const _gLv = g ? (g.lv || 1) : 1;
  const _vehBase = (window.VEHICLE_BASE_HR && window.VEHICLE_BASE_HR[p.vehicleId]) || 50;
  let hr = _vehBase + (_gLv - 1) * 0.8;
  if(g && Array.isArray(g.talents) && g.talents.indexOf('gunner_mastery') >= 0) hr += 10 + (_gLv - 1) * 0.15;
  if(!c.playerFirst) hr = hr * 0.8;
  if(hr > 75) hr = 75;
  if(hr < 0) hr = 0;

  let _mixIsHE = null;
  let _preset30 = null;
  if(wid === '2a72' || wid === '2a42' || wid === 'kpvt' || wid === 'nsvt'){
    const _mixAmmoObj = state.vehicleAmmo && state.vehicleAmmo[p.vehicleId] && state.vehicleAmmo[p.vehicleId][wid];
    if(_mixAmmoObj){
      _preset30 = _mixAmmoObj.preset || null;
      if(_mixAmmoObj.preset === '混合'){
        if(typeof _mixAmmoObj._mixToggle !== 'boolean') _mixAmmoObj._mixToggle = false;
        _mixIsHE = _mixAmmoObj._mixToggle;
        _mixAmmoObj._mixToggle = !_mixAmmoObj._mixToggle;
      }
    }
  }

  let stats;
  if(_mixIsHE === null){
    stats = _getVehicleAmmoStats(wid, _usedAmmoId);
  } else if(wid === '2a72' || wid === '2a42'){
    stats = _mixIsHE ? VEHICLE_WEAPON_STATS['30mm_hef'] : VEHICLE_WEAPON_STATS['30mm_ap'];
  } else if(wid === 'kpvt'){
    stats = _mixIsHE ? VEHICLE_WEAPON_STATS['kpvt_mdz'] : VEHICLE_WEAPON_STATS['kpvt'];
  } else if(wid === 'nsvt'){
    stats = _mixIsHE ? VEHICLE_WEAPON_STATS['nsvt_md'] : VEHICLE_WEAPON_STATS['nsvt'];
  }
  if(!stats) return false;

  const isHE = _isHEAmmo(wid, _usedAmmoId) && (wid === '2a46' || wid === '2a46m1' || wid === '2a70' || wid === '2a28');
  const baseDmg = Math.round(stats.dmg * _LEG_MULT);
  const penMM = stats.penMM || 0;

  const crit = Math.random() < _VEHICLE_CRIT_RATE;
  const finalDmg = crit ? Math.round(baseDmg * _VEHICLE_CRIT_MULT) : baseDmg;

  const hit = Math.random() * 100 < hr;

  const sm = c.sm;
  const relTarget = target.worldX - p.worldX;
  let tx;
  if(relTarget <= sm.screenRightWorld){
    tx = EXPLORE_HERO_X_RATIO + (relTarget / sm.screenRightWorld) * (1 - EXPLORE_HERO_X_RATIO);
  } else {
    tx = 1.05;
  }
  /* 載具不繪製子彈；視覺特效由 BTRSupport 處理 */

  /* rev-fix-splash: 未命中時仍觸發濺射（落點爆炸），ratioMult 0.6 */
  if(!hit){
    const _spMiss = _getVehicleSplashParams(wid, _usedAmmoId, _mixIsHE, _preset30);
    if(_spMiss && target){
      _applyVehicleSplash(_spMiss, target, baseDmg, 0.6, wid, _usedAmmoId);
    }
    return true;
  }

  /* rev-fix-splash: 主目標走普通穿甲（不再 isHE: true 繞過護甲） */
  const mainProxy = { hp: target.hp, armor: target.armor || 0 };
  const mainRes = applyDamage(mainProxy, finalDmg, penMM, {
    armorProvider: function(part){ return (typeof getEnemyArmorMMForPart === 'function') ? getEnemyArmorMMForPart(target, part) : 0; }
  });
  target.hp = mainProxy.hp;
  if(target.armor !== undefined) target.armor = mainProxy.armor;
  const _shownMain = mainRes.hpLost > 0 ? mainRes.hpLost : mainRes.armorLost;
  _vehicleCombatFloat(target.worldX, '-' + _shownMain + (crit ? '!' : ''), crit ? 'crit' : (mainRes.hpLost > 0 ? 'enemy' : 'armor'));
  if(target.hp <= 0){
    _onBTRKillTarget(target, wid, c, _usedAmmoId);
  }

  /* rev-fix-splash: 濺射走單次 applyDamage，穿甲值隨 (1-t²) 衰減 */
  const _spMain = _getVehicleSplashParams(wid, _usedAmmoId, _mixIsHE, _preset30);
  if(_spMain){
    _applyVehicleSplash(_spMain, target, baseDmg, 1.0, wid, _usedAmmoId);
  }
  return true;
};

window._settleVehicleEventIfCleared = function(enemy){
  const ev = enemy && enemy._eventRef;
  if(!ev || ev._settled) return;
  if(!ev.content) return;
  for(let i = 0; i < ev.content.length; i++){
    if(ev.content[i] && ev.content[i].hp > 0) return;
  }
  ev._settled = true;
  const _R = (ev.region && typeof REGIONS !== 'undefined') ? REGIONS[ev.region] : null;
  if(_R && _R.seal && _R.sealRate && Math.random() < _R.sealRate){
    state.seals[_R.seal] = Math.max(0, parseInt(state.seals[_R.seal] || 0, 10)) + 1;
    if(typeof pushLog === 'function'){
      pushLog('<span class="win">獲得 ' + (_R.name || ev.region) + ' 信物 ×1</span>', [], 'explore');
    }
  }
};

function _onBTRKillTarget(target, wid, c, usedAmmoId){
  if(!c && window._combat) c = window._combat;
  var eName = (typeof ENEMIES !== 'undefined' && ENEMIES[target.eid]) ? ENEMIES[target.eid].name : target.eid;
  var _vidForName140 = (c && c.allies && c.allies[0] && c.allies[0].vehicleId)
    || (state.garage && state.garage.currentVehicle) || 'btr80';
  var wn = (typeof window._vehicleWeaponDisplayName === 'function')
    ? window._vehicleWeaponDisplayName(wid, _vidForName140)
    : ({ '2a46':'125mm 2A46','2a46m1':'125mm 2A46M-1','2a70':'100mm 2A70','2a28':'73mm 2A28','2a42':'30mm 2A42','2a72':'30mm 2A72','kpvt':'14.5mm KPVT','nsvt':'12.7mm NSVT','pkt':'7.62mm PKT','atgm':'ATGM' }[wid] || (wid ? wid.toUpperCase() : '未知武器'));
  var form = '';
  if(usedAmmoId){
    var ammoForm = {
      '3bm42':'3BM42 穿甲', '3of26':'3OF26 高爆', '3bk29':'3BK29 破甲',
      '3uof17':'3UOF17 高爆', 'pg15v':'PG-15V 破甲', 'og15v':'OG-15V 高爆'
    }[usedAmmoId];
    if(ammoForm) form = '（' + ammoForm + '）';
    else if(usedAmmoId === 'atgm') form = '（反坦克導彈）';
    else form = '（' + usedAmmoId + '）';
  }
  if(typeof pushLog === 'function') pushLog('<span class="run">' + wn + form + '</span> 擊殺 <b class="r-' + target.rarity + '">' + eName + '</b>', [], 'explore');
  if(typeof _grantBTRCrewExp === 'function') _grantBTRCrewExp(3);
  /* [v195c C] 車戰直接命中擊殺：每敵人 3 玩家經驗 + 事件清空時 roll 信物。 */
  if(typeof addExp === 'function') addExp(3);
  if(typeof window._settleVehicleEventIfCleared === 'function') window._settleVehicleEventIfCleared(target);
  if(window.BTRSupport){
    window.BTRSupport.killCount = (window.BTRSupport.killCount || 0) + 1;
    if(!window.BTRSupport.kills) window.BTRSupport.kills = {};
    if(!window.BTRSupport.weaponKills) window.BTRSupport.weaponKills = {};
    var _killKey = wid + (usedAmmoId ? ':' + usedAmmoId : '');
    window.BTRSupport.weaponKills[_killKey] = (window.BTRSupport.weaponKills[_killKey] || 0) + 1;
    window.BTRSupport.kills[target.eid] = (window.BTRSupport.kills[target.eid] || 0) + 1;
    var loot = (typeof rollEnemyLoot === 'function') ? rollEnemyLoot(target) : [];
    if(!window.BTRSupport.loot) window.BTRSupport.loot = [];
    for(var li = 0; li < loot.length; li++){
      invAdd(loot[li].id, loot[li].rarity, loot[li].count);
      window.BTRSupport.loot.push(loot[li]);
    }
  }
  try {
    if(window._explore && typeof window._renderEnemyCorpseCanvas === 'function'){
      var fx = document.getElementById('explore-fx');
      if(fx){
        var rc = window._renderEnemyCorpseCanvas(target, fx.clientHeight);
        if(rc){
          var wEl = document.createElement('div');
          wEl.style.cssText = 'position:absolute;bottom:0;z-index:13;pointer-events:none;will-change:left;width:' + rc.drawW + 'px;height:' + rc.drawH + 'px;';
          rc.canvas.style.cssText = 'width:100%;height:100%;display:block;';
          wEl.appendChild(rc.canvas);
          fx.appendChild(wEl);
          var _playerX = (c && c.allies && c.allies[0]) ? c.allies[0].worldX : 0;
          /* [v182 G14b] 标记已渲染，避免步战胜利时 onVictoryStart 重复生成 corpse */
          target._corpseRendered = true;
          window._explore.corpses.push({ wrap:wEl, drawW:rc.drawW, drawH:rc.drawH, worldX:window._explore.worldX + (target.worldX - _playerX) });
        }
      }
    }
  } catch(e){}
}

const VEHICLE_WEAPON_NAMES = { '2a46':'125mm 2A46','2a46m1':'125mm 2A46M-1','2a70':'100mm 2A70','2a28':'73mm 2A28','2a42':'30mm 2A42','2a72':'30mm 2A72','kpvt':'14.5mm KPVT','nsvt':'12.7mm NSVT','pkt':'7.62mm PKT','atgm':'ATGM' };

/* rev140: ATGM 依車型取專屬名稱（9M113 競賽 / 9M14 嬰兒 等） */
window._vehicleWeaponDisplayName = function(wid, vid){
  if(wid === 'atgm'){
    const v = (typeof VEHICLES !== 'undefined' && VEHICLES[vid]) ? VEHICLES[vid] : null;
    if(v && v.weaponSpecial && v.weaponSpecial !== '無') return v.weaponSpecial;
    return 'ATGM';
  }
  return (typeof VEHICLE_WEAPON_NAMES !== 'undefined' && VEHICLE_WEAPON_NAMES[wid]) || wid;
};

function _vEnsureDamage(vid){
  if(!state.vehicleDamage) state.vehicleDamage = {};
  let d = state.vehicleDamage[vid];
  if(!d){
    d = {
      ammoRackDamage: 0,
      parts: { engine: 800, tracks: 1000, turret: 400 },
      members: { driver: 1, gunner: 1, commander: 1, player: 1 },
      weapons: {},
      disabled: false,
      destroyed: false,
      repairUntil: 0
    };
    state.vehicleDamage[vid] = d;
  }
  /* rev-fix-weapon-hp-init: 清理舊存檔 parts.gun，初始化武器 HP */
  if(d.parts && typeof d.parts.gun !== 'undefined') delete d.parts.gun;
  if(!d.weapons || typeof d.weapons !== 'object') d.weapons = {};
  const _ld = (typeof _getLoadout === 'function') ? _getLoadout(vid) : null;
  if(_ld){
    for(const _wid in _ld){
      if(!d.weapons[_wid]) d.weapons[_wid] = { hp: 400, max: 400 };
    }
    for(const _wid in d.weapons){
      if(!_ld[_wid]) delete d.weapons[_wid];
    }
  }
  /* v140: members 只存存活標記（1/0），從實時 servant.hp / state.player.hp 同步 */
  if(!d.members || typeof d.members !== 'object') d.members = { driver: 1, gunner: 1, commander: 1, player: 1 };
  const _crewS = state.station && state.station.crew;
  if(_crewS){
    for(const _roleS of ['driver', 'gunner', 'commander']){
      const _sidS = _crewS[_roleS];
      if(!_sidS){ d.members[_roleS] = 0; continue; }
      const _srvS = (state.servants || []).find(function(s){ return s.id === _sidS; });
      if(!_srvS || (_srvS.injuredUntil && _srvS.injuredUntil > Date.now())){ d.members[_roleS] = 0; continue; }
      d.members[_roleS] = (_srvS.hp > 0) ? 1 : 0;
    }
  }
  d.members.player = (state.player.hp > 0) ? 1 : 0;
  return d;
}

function _vGetArmor(vid, partKey){
  const a = VEHICLE_ARMOR_RHA[vid];
  if(!a) return 30;
  if(partKey === 'turretSide') return a.side || 20;
  return a[partKey] || a.hullFront || 30;
}

function _vGetEraBonus(vid, isHeat){
  const a = VEHICLE_ARMOR_RHA[vid];
  if(!a || !a.era) return 0;
  if(a.era === 1) return isHeat ? 250 : 30;
  if(a.era === 2) return isHeat ? 400 : 120;
  return 0;
}

function _vIsHeatAmmo(ammoId){
  if(typeof HEAT_AMMO_IDS !== 'undefined' && HEAT_AMMO_IDS.has(ammoId)) return true;
  if(ammoId === 'atgm' || ammoId === '3bk29' || ammoId === '3ubk10' || ammoId === 'pg-15v') return true;
  return false;
}

function _vPickWeighted(list){
  let total = 0, i;
  for(i = 0; i < list.length; i++) total += list[i].w;
  let r = Math.random() * total;
  for(i = 0; i < list.length; i++){
    r -= list[i].w;
    if(r <= 0) return list[i];
  }
  return list[list.length - 1];
}

function _vGetInternalWeights(vid){ return _VEHICLE_INTERNAL_WEIGHTS[vid] || _VEHICLE_INTERNAL_WEIGHTS.default; }

function _vPickInternalKey(vid){
  const w = _vGetInternalWeights(vid);
  let total = 0;
  for(const k in w) total += w[k];
  let r = Math.random() * total;
  let acc = 0;
  for(const k in w){ acc += w[k]; if(r <= acc) return k; }
  return 'turret';
}

function _vCalcPassengerArmor(p){
  let a = 0;
  if(p && p.equipData){
    if(p.equipData.head){
      const hid = (typeof p.equipData.head === 'object') ? p.equipData.head.id : p.equipData.head;
      const hr = (typeof p.equipData.head === 'object') ? (p.equipData.head.rarity || '一般') : (p.helmetRarity || '一般');
      if(hid && typeof equipArmorValue === 'function') a += equipArmorValue(hid, hr) || 0;
    }
    if(p.equipData.top){
      const tid = (typeof p.equipData.top === 'object') ? p.equipData.top.id : p.equipData.top;
      const tr = (typeof p.equipData.top === 'object') ? (p.equipData.top.rarity || '一般') : (p.bodyRarity || '一般');
      if(tid && typeof equipArmorValue === 'function') a += equipArmorValue(tid, tr) || 0;
    }
  }
  return a;
}

window._vHitVehicle = function(veh, dmg, penMM, ammoId, attackerName, weaponName, weaponRarity, attackerRarity){
  const vid = veh.vehicleId;
  const d = _vEnsureDamage(vid);
  if(attackerName || weaponName){
    var _atkRar = attackerRarity || '一般';
    var _atkNameRaw = attackerName || '???';
    var _atkNameHtml = (typeof rarityClass === 'function') ? ('<span class="' + rarityClass(_atkRar) + '">' + _atkNameRaw + '</span>') : _atkNameRaw;
    d.lastAttacker = { name: _atkNameRaw, nameHtml: _atkNameHtml, weapon: weaponName || '???', rarity: weaponRarity || '一般' };
  }
  const part = _vPickWeighted(_VEHICLE_PART_PROB);
  let armorMM = _vGetArmor(vid, part.key);
  const isHeat = _vIsHeatAmmo(ammoId);
  armorMM += _vGetEraBonus(vid, isHeat);

  /* 載具無護甲池：diff <= 0 直接 0，diff > 0 按剩餘穿深/原穿深 */
  const _diff = penMM - armorMM;
  if(_diff <= 0){
    if(typeof _vehicleCombatFloat === 'function'){
      _vehicleCombatFloat(0, _diff === 0 ? '磨穿' : '跳彈', 'armor');
    }
    return { penetrated: false, damage: 0 };
  }
  dmg = Math.max(1, Math.round(dmg * (_diff / penMM)));

const key = _vPickInternalKey(vid);
  d.lastHit = { part: part.key, internal: key, dmg: dmg };

  if(key === 'ammoRack'){
    d.ammoRackDamage += dmg;
    _vehicleCombatFloat(0, '彈藥架 -' + Math.round(dmg), 'crit');
    if(d.ammoRackDamage >= 600){
      _detonate(vid, veh);
      return { penetrated: true, detonated: true, damage: dmg };
    }
    return { penetrated: true, part: part.key, internal: '彈藥架', damage: dmg };
  }

  if(key === 'crew'){
    const pool = [];
    if(d.members.driver > 0) pool.push({ t: 'crew', r: 'driver' });
    if(d.members.gunner > 0) pool.push({ t: 'crew', r: 'gunner' });
    if(d.members.commander > 0) pool.push({ t: 'crew', r: 'commander' });
    if(d.members.player > 0) pool.push({ t: 'player' });
    const _st = state.station;
    const _cap = (window.CARRIER_CAPACITY && window.CARRIER_CAPACITY[vid]) ? window.CARRIER_CAPACITY[vid] : 0;
    if(_cap > 0 && _st && _st.passengers){
      for(let i = 0; i < _st.passengers.length && i < _cap; i++){
        const pp = _st.passengers[i];
        const ss = (state.servants || []).find(function(x){ return x.id === pp.srvId; });
        if(ss && (!ss.hp || ss.hp > 0)) pool.push({ t: 'passenger', srv: ss, p: pp });
      }
    }
    if(!pool.length) return { penetrated: true, part: part.key, internal: '乘員', damage: 0 };
    const tgt = pool[Math.floor(Math.random() * pool.length)];

    if(tgt.t === 'crew'){
      /* v140: 扣實際 servant.hp，members 只存 1/0 */
      const _crewSidX = state.station && state.station.crew ? state.station.crew[tgt.r] : null;
      const _crewSrvX = _crewSidX ? (state.servants || []).find(function(s){ return s.id === _crewSidX; }) : null;
      if(_crewSrvX){
        _crewSrvX.hp = Math.max(0, (_crewSrvX.hp || 0) - dmg * 1.5);
        d.members[tgt.r] = _crewSrvX.hp > 0 ? 1 : 0;
      } else {
        d.members[tgt.r] = 0;
      }
      _vehicleCombatFloat(0, '乘員 -' + Math.round(dmg * 1.5), 'crit');
      if(tgt.r === 'driver' && d.members.driver <= 0){
        const _drvId = state.station && state.station.crew ? state.station.crew.driver : null;
        const _drvSrv = _drvId ? (state.servants || []).find(function(s){ return s.id === _drvId; }) : null;
        const _drvRar = _drvSrv ? (_drvSrv.rarity || '一般') : '一般';
        const _drvCls = (typeof rarityClass === 'function') ? rarityClass(_drvRar) : '';
        if(typeof pushLog === 'function'){
          var _laDrv = d.lastAttacker;
          if(_laDrv && _laDrv.weapon){
            var _wClsDrv = (typeof rarityClass === 'function') ? rarityClass(_laDrv.rarity || '一般') : '';
            pushLog('<span class="' + _drvCls + '">駕駛</span> 被 ' + (_laDrv.nameHtml || _laDrv.name) + ' 用 <span class="' + _wClsDrv + '">' + _laDrv.weapon + '</span> <span class="lose">擊殺</span>', [], 'explore');
          } else {
            pushLog('<span class="' + _drvCls + '">駕駛</span> <span class="lose">陣亡</span>', [], 'explore');
          }
        }
        if(_drvSrv){ _drvSrv.hp = 0; _drvSrv.injuredUntil = Date.now() + 4 * 3600 * 1000; _drvSrv._injuredDown = true; }
        d.repairUntil = Date.now() + 4 * 3600 * 1000;
        _forceLeave(vid, veh, 'driver_dead');
      }
      if(tgt.r === 'gunner' && d.members.gunner <= 0){
        const _gnrId = state.station && state.station.crew ? state.station.crew.gunner : null;
        const _gnrSrv = _gnrId ? (state.servants || []).find(function(s){ return s.id === _gnrId; }) : null;
        const _gnrRar = _gnrSrv ? (_gnrSrv.rarity || '一般') : '一般';
        const _gnrCls = (typeof rarityClass === 'function') ? rarityClass(_gnrRar) : '';
        if(typeof pushLog === 'function'){
          var _laGnr = d.lastAttacker;
          if(_laGnr && _laGnr.weapon){
            var _wClsGnr = (typeof rarityClass === 'function') ? rarityClass(_laGnr.rarity || '一般') : '';
            pushLog('<span class="' + _gnrCls + '">炮手</span> 被 ' + (_laGnr.nameHtml || _laGnr.name) + ' 用 <span class="' + _wClsGnr + '">' + _laGnr.weapon + '</span> <span class="lose">擊殺</span>', [], 'explore');
          } else {
            pushLog('<span class="' + _gnrCls + '">炮手</span> <span class="lose">陣亡</span>', [], 'explore');
          }
        }
        if(_gnrSrv){ _gnrSrv.hp = 0; _gnrSrv.injuredUntil = Date.now() + 4 * 3600 * 1000; _gnrSrv._injuredDown = true; }
      }
      if(tgt.r === 'commander' && d.members.commander <= 0){
        const _cmdId = state.station && state.station.crew ? state.station.crew.commander : null;
        const _cmdSrv = _cmdId ? (state.servants || []).find(function(s){ return s.id === _cmdId; }) : null;
        const _cmdRar = _cmdSrv ? (_cmdSrv.rarity || '一般') : '一般';
        const _cmdCls = (typeof rarityClass === 'function') ? rarityClass(_cmdRar) : '';
        if(typeof pushLog === 'function'){
          var _laCmd = d.lastAttacker;
          if(_laCmd && _laCmd.weapon){
            var _wClsCmd = (typeof rarityClass === 'function') ? rarityClass(_laCmd.rarity || '一般') : '';
            pushLog('<span class="' + _cmdCls + '">車長</span> 被 ' + (_laCmd.nameHtml || _laCmd.name) + ' 用 <span class="' + _wClsCmd + '">' + _laCmd.weapon + '</span> <span class="lose">擊殺</span>', [], 'explore');
          } else {
            pushLog('<span class="' + _cmdCls + '">車長</span> <span class="lose">陣亡</span>', [], 'explore');
          }
        }
        if(_cmdSrv){ _cmdSrv.hp = 0; _cmdSrv.injuredUntil = Date.now() + 4 * 3600 * 1000; _cmdSrv._injuredDown = true; }
      }
    } else if(tgt.t === 'player'){
      const _tgt = { hp: state.player.hp, armor: state.player.armor };
      const _lv = state.player.armorLevel || 0;
      applyDamage(_tgt, dmg * 1.5, penMM, { armorMMOverride: ARMOR_LEVEL_TO_MM[_lv] || 0 });
      state.player.hp = _tgt.hp;
      state.player.armor = _tgt.armor;
      d.members.player = _tgt.hp > 0 ? 1 : 0;
      _vehicleCombatFloat(0, '玩家 -' + Math.round(dmg * 1.5), 'crit');
      if(state.player.hp <= 0){
        state.player.hp = 0;
        state.player.deadUntil = Date.now() + 60000;
        const _ex = window._explore;
        if(_ex){ _ex.mode = 'dead'; _ex.deadUntil = performance.now() + 60000; _ex._currentSpeed = 0; }
        if(typeof heroAnim !== 'undefined'){ heroAnim.name = 'dead'; heroAnim.frame = 0; heroAnim.lastUpdate = performance.now(); }
        /* rev-fix-player-killer-vehicle: 載具戰玩家倒下時顯示被誰擊倒 */
        if(typeof pushLog === 'function'){
          var _laPK = d.lastAttacker;
          if(_laPK && _laPK.weapon){
            var _wClsPKV = (typeof rarityClass === 'function') ? rarityClass(_laPK.rarity || '一般') : '';
            pushLog('<span class="pl">玩家</span> 被 ' + (_laPK.nameHtml || _laPK.name) + ' 用 <span class="' + _wClsPKV + '">' + _laPK.weapon + '</span> <span class="lose">擊倒</span>', [], 'explore');
          } else {
            pushLog('<span class="pl">玩家</span> <span class="lose">重傷倒地</span>', [], 'explore');
          }
        }
        _forceLeave(vid, veh, 'player_dead');
      }
    } else if(tgt.t === 'passenger'){
      const _arm = _vCalcPassengerArmor(tgt.p);
      const _maxHp = (typeof servantMaxHp === 'function') ? servantMaxHp(tgt.srv) : 100;
      const _curHp = (typeof tgt.srv.hp === 'number') ? tgt.srv.hp : _maxHp;
      const _t2 = { hp: _curHp, armor: _arm };
      const _res2 = applyDamage(_t2, dmg * 1.5, penMM, {
        armorProvider: function(part){
          if (part === 'head' || part === 'face') return tgt.p.helmet ? armorMMForSlot(tgt.p.helmet, part) : 0;
          if (part === 'top') return tgt.p.body ? armorMMForSlot(tgt.p.body, 'top') : 0;
          return 0;
        }
      });
      tgt.srv.hp = _t2.hp;
      _vehicleCombatFloat(0, '載員 -' + Math.round(_res2.hpLost), 'crit');
      if(tgt.srv.hp <= 0){
        tgt.srv.hp = 0;
        tgt.srv.injuredUntil = Date.now() + 4 * 3600 * 1000;
        if(typeof pushLog === 'function'){
          var _laP = d.lastAttacker;
          var _sRarC = (tgt.srv && tgt.srv.rarity) ? tgt.srv.rarity : '一般';
          var _sClsC = (typeof rarityClass === 'function') ? rarityClass(_sRarC) : '';
          var _sNameC = (typeof servantLabel === 'function' ? servantLabel(tgt.srv) : '載員');
          if(_laP && _laP.weapon){
            var _wClsP = (typeof rarityClass === 'function') ? rarityClass(_laP.rarity || '一般') : '';
            pushLog('<span class="' + _sClsC + '">' + _sNameC + '</span> 被 ' + (_laP.nameHtml || _laP.name) + ' 用 <span class="' + _wClsP + '">' + _laP.weapon + '</span> <span class="lose">擊倒</span>', [], 'explore');
          } else {
            pushLog('<span class="' + _sClsC + '">' + _sNameC + '</span> <span class="lose">重傷</span>', [], 'explore');
          }
        }
      }
    }
    return { penetrated: true, part: part.key, internal: '乘員', damage: dmg };
  }

  const _prevPartVal = d.parts[key] || 0;
  d.parts[key] = Math.max(0, (d.parts[key] || 0) - dmg);
  _vehicleCombatFloat(0, '-' + Math.round(dmg), '');
  if(key === 'engine' && d.parts.engine <= 0){
    if(_prevPartVal > 0){
      if(typeof pushLog === 'function'){
      var _laEng = d.lastAttacker;
      if(_laEng && _laEng.weapon){
        var _wClsEng = (typeof rarityClass === 'function') ? rarityClass(_laEng.rarity || '一般') : '';
        pushLog('<span class="run">引擎</span> 被 ' + (_laEng.nameHtml || _laEng.name) + ' 用 <span class="' + _wClsEng + '">' + _laEng.weapon + '</span> <span class="lose">癱瘓</span>', [], 'explore');
      } else {
        pushLog('<span class="run">引擎</span> <span class="lose">癱瘓</span>', [], 'explore');
      }
    }
      d.repairUntil = Date.now() + 4 * 3600 * 1000;
    }
    _forceLeave(vid, veh, 'engine');
  }
  if(key === 'tracks' && d.parts.tracks <= 0){
    if(_prevPartVal > 0){
      if(typeof pushLog === 'function'){
      var _laTrk = d.lastAttacker;
      if(_laTrk && _laTrk.weapon){
        var _wClsTrk = (typeof rarityClass === 'function') ? rarityClass(_laTrk.rarity || '一般') : '';
        pushLog('<span class="run">履帶/輪組</span> 被 ' + (_laTrk.nameHtml || _laTrk.name) + ' 用 <span class="' + _wClsTrk + '">' + _laTrk.weapon + '</span> <span class="lose">癱瘓</span>', [], 'explore');
      } else {
        pushLog('<span class="run">履帶/輪組</span> <span class="lose">癱瘓</span>', [], 'explore');
      }
    }
      d.repairUntil = Date.now() + 4 * 3600 * 1000;
    }
    _forceLeave(vid, veh, 'tracks');
  }
  /* rev-fix-weapon-hp-hit: 每把武器獨立 HP */
  if(key === 'gun'){
    const _weaponIds = [];
    for(const _wid in d.weapons){
      if(d.weapons[_wid] && d.weapons[_wid].hp > 0) _weaponIds.push(_wid);
    }
    if(_weaponIds.length === 0){
      return { penetrated: true, part: part.key, internal: '武器', damage: 0 };
    }
    const _widHit = _weaponIds[Math.floor(Math.random() * _weaponIds.length)];
    const _wPrev = d.weapons[_widHit].hp;
    d.weapons[_widHit].hp = Math.max(0, _wPrev - dmg);
    _vehicleCombatFloat(0, '-' + Math.round(dmg), '');
    if(d.weapons[_widHit].hp <= 0 && _wPrev > 0){
      d.repairUntil = Date.now() + 4 * 3600 * 1000;
      if(typeof pushLog === 'function'){
        const _wn = VEHICLE_WEAPON_NAMES[_widHit] || _widHit;
        const _shouldLeaveGun = window._vehicleWeaponsDead && window._vehicleWeaponsDead();
        if(_shouldLeaveGun){
          /* rev-fix-weapon-log-final */
          pushLog('所有武器 <span class="lose">損壞</span>，載具離場', [], 'explore');
        } else {
          const _remain = [];
          for(const _rwid in d.weapons){
            if(d.weapons[_rwid].hp > 0) _remain.push(VEHICLE_WEAPON_NAMES[_rwid] || _rwid);
          }
          const _remainTxt = _remain.length > 0 ? ('（' + _remain.join('、') + ' 仍可開火）') : '';
          pushLog('<span class="run">' + _wn + '</span> <span class="lose">損壞</span>' + _remainTxt, [], 'explore');
        }
      }
      if(window._vehicleWeaponsDead && window._vehicleWeaponsDead()) _forceLeave(vid, veh, 'gun');
    }
    return { penetrated: true, part: part.key, internal: '武器', damage: dmg };
  }
  if(key === 'turret' && d.parts.turret <= 0){
    if(_prevPartVal > 0){
      /* rev-fix-turret-log-match: 日誌依實際是否全滅分開寫 */
      var _allDeadT = window._vehicleWeaponsDead && window._vehicleWeaponsDead();
      if(typeof pushLog === 'function'){
        var _laTurr = d.lastAttacker;
        var _turrSuffix = _allDeadT ? '，載具離場' : '（車頂武器仍可開火）';
        if(_laTurr && _laTurr.weapon){
          var _wClsTurr = (typeof rarityClass === 'function') ? rarityClass(_laTurr.rarity || '一般') : '';
          pushLog('<span class="run">炮塔</span> 被 ' + (_laTurr.nameHtml || _laTurr.name) + ' 用 <span class="' + _wClsTurr + '">' + _laTurr.weapon + '</span> <span class="lose">卡死</span>' + _turrSuffix, [], 'explore');
        } else {
          pushLog('<span class="run">炮塔</span> <span class="lose">卡死</span>' + _turrSuffix, [], 'explore');
        }
      }
      d.repairUntil = Date.now() + 4 * 3600 * 1000;
    }
    if(window._vehicleWeaponsDead && window._vehicleWeaponsDead()) _forceLeave(vid, veh, 'turret');
  }

  const _allCrew = (d.members.driver <= 0 && d.members.gunner <= 0 && d.members.commander <= 0 && d.members.player <= 0);
  if(_allCrew && !d.destroyed) _detonate(vid, veh);

  return { penetrated: true, part: part.key, internal: key, damage: dmg };
};

window._vEnsureDamage = _vEnsureDamage;
window._vGetArmor = _vGetArmor;

function _detonate(vid, veh){
  const d = _vEnsureDamage(vid);
  d.destroyed = true;
  d.disabled = true;
  d.repairUntil = Date.now() + 8 * 3600 * 1000;
  d.ammoRackDamage = 600;
  d.members.driver = 0;
  d.members.gunner = 0;
  d.members.commander = 0;
  d.members.player = 0;

  /* [v180 F7] 判斷玩家是否還在車上。
     下車後殘留子彈命中舊載具 → 觸發 _detonate → 不能殺已下車的玩家和載員。
     判斷方式：c.active && c.sceneType === 'vehicle' && c.allies[0].isVehicle */
  const _c180 = window._combat;
  const _playerOnBoard180 = !!(_c180 && _c180.active && _c180.sceneType === 'vehicle'
                              && _c180.allies && _c180.allies[0] && _c180.allies[0].isVehicle);

  if(!_playerOnBoard180){
    /* [v180 F7] 玩家已下車：只摧毀載具（彈藥架歸零、部件全毀），不殺玩家和載員 */
    if(state.vehicleAmmo && state.vehicleAmmo[vid]){
      for(const _wid180 in state.vehicleAmmo[vid]) state.vehicleAmmo[vid][_wid180].current = 0;
    }
    if(typeof pushLog === 'function'){
      pushLog('載具<span class="run">彈藥架</span><span class="lose">殉爆</span>（玩家已下車，無人員傷亡）', [], 'explore');
    }
    return;
  }

  const _now = Date.now();
  const _crew = state.station && state.station.crew;
  if(_crew){
    for(const role of ['commander', 'gunner', 'driver']){
      const sid = _crew[role];
      if(!sid) continue;
      const srv = (state.servants || []).find(function(s){ return s.id === sid; });
      if(srv){ srv.hp = 0; srv.injuredUntil = _now + 4 * 3600 * 1000; }
    }
  }
  const _combatRef = window._combat;
  const _passengers = state.station && state.station.passengers;
  if(_combatRef && Array.isArray(_combatRef.allies) && _combatRef.allies.length){
    for(const a of _combatRef.allies){
      if(a.isPassenger && a.srv){
        a.srv.hp = 0;
        a.srv.injuredUntil = _now + 4 * 3600 * 1000;
      }
    }
  }
  /* rev-fix-detonate-passengers: 載具戰中 allies 只有載具，需獨立遍歷車上載員 */
  if(_passengers){
    const _cap = (window.CARRIER_CAPACITY && window.CARRIER_CAPACITY[vid]) ? window.CARRIER_CAPACITY[vid] : 0;
    for(let _pi = 0; _pi < _passengers.length && _pi < _cap; _pi++){
      const p = _passengers[_pi];
      if(!p || !p.srvId) continue;
      const srv = (state.servants || []).find(function(s){ return s.id === p.srvId; });
      if(srv){ srv.hp = 0; srv.injuredUntil = _now + 4 * 3600 * 1000; }
    }
  }

  state.player.hp = 0;
  state.player.deadUntil = _now + 60000;
  const _ex = window._explore;
  if(_ex){ _ex.mode = 'dead'; _ex.deadUntil = performance.now() + 60000; _ex._currentSpeed = 0; _ex.combatEvent = null; }
  if(typeof heroAnim !== 'undefined'){ heroAnim.name = 'dead'; heroAnim.frame = 0; heroAnim.lastUpdate = performance.now(); }

  if(state.vehicleAmmo && state.vehicleAmmo[vid]){
    for(const wid in state.vehicleAmmo[vid]) state.vehicleAmmo[vid][wid].current = 0;
  }

  if(typeof window._vDetonateFx === 'function') window._vDetonateFx(veh);
  if(typeof pushLog === 'function'){
    const _la = d.lastAttacker;
    if(_la && _la.weapon){
      const _wClsDet = (typeof rarityClass === 'function') ? rarityClass(_la.rarity || '一般') : '';
      pushLog((_la.nameHtml || _la.name) + ' 用 <span class="' + _wClsDet + '">' + _la.weapon + '</span> 引發<span class="run">彈藥架</span><span class="lose">殉爆</span>，<span class="lose">全員重傷</span>', [], 'explore');
    } else {
      pushLog('載具<span class="run">彈藥架</span><span class="lose">殉爆</span>，<span class="lose">全員重傷</span>', [], 'explore');
    }
  }

  const _c = window._combat;
  if(_c){ _c.active = false; _c.onResolve = null; }
  const _b = window.BTRSupport;
  if(_b && _b.active){
    if(typeof _b._finishSupportAndLog === 'function'){ try { _b._finishSupportAndLog(); } catch(e){} }
    try { _b._cleanup(); } catch(e){}
    _b.active = false;
  }
  if(typeof window._combatCleanup === 'function') window._combatCleanup();
}

function _forceLeave(vid, veh, reason){
  const c = window._combat;
  if(c && c.active && c.sceneType === 'vehicle'){
    if(c._forceLeaveReason) return;
    c._forceLeaveReason = reason;
    c._forceLeaveAt = performance.now();
    const _cannotDrive = (reason === 'engine' || reason === 'driver_dead' || reason === 'tracks' || reason === 'hull_destroyed' || reason === 'player_dead');
    const b = window.BTRSupport;
    if(b && b.active){
      if(_cannotDrive){
        if(typeof b.enterWreckMode === 'function') b.enterWreckMode();
      } else {
        if(typeof b.enterFastLeave === 'function') b.enterFastLeave();
      }
    }
    setTimeout(function(){
      const _c = window._combat;
      if(_c && _c.active && _c._forceLeaveReason === reason){
        _resolveVehicleLeave(reason);
      }
    }, 800);
  } else {
    const _cannotDrive2 = (reason === 'engine' || reason === 'driver_dead' || reason === 'tracks' || reason === 'hull_destroyed' || reason === 'player_dead');
    if(_cannotDrive2){
      const b2 = window.BTRSupport;
      if(b2 && b2.active && b2.phase !== 'wreck' && typeof b2.enterWreckMode === 'function'){
        b2.enterWreckMode();
      }
    }
  }
}

function _resolveVehicleLeave(reason){
  const c = window._combat;
  if(!c) return;
  const b = window.BTRSupport;

  if(b && b.active){
    if(reason === 'detonated'){
      if(typeof b._finishSupportAndLog === 'function'){ try { b._finishSupportAndLog(); } catch(e){} }
      try { b._cleanup(); } catch(e){}
      b.active = false;
    } else if(reason === 'engine' || reason === 'driver_dead' || reason === 'tracks' || reason === 'hull_destroyed' || reason === 'player_dead'){
      if(typeof b.enterWreckMode === 'function') b.enterWreckMode();
    } else {
      if(typeof b.enterFastLeave === 'function') b.enterFastLeave();
    }
  }

  const _vid = (b && b.vehicleId) ? b.vehicleId : ((state.garage && state.garage.currentVehicle) || 'btr80');
  if(reason === 'detonated' || reason === 'hull_destroyed'){
    _writeVehicleDestroyedLog(reason, _vid);
  } else if(reason === 'crew_dead'){
    if(typeof pushLog === 'function') pushLog('載具 炮手、車長 <span class="lose">陣亡</span>', [], 'explore');
  }

  if(reason === 'detonated' || reason === 'player_dead'){
    const cb = c.onResolve;
    c.active = false;
    c.onResolve = null;
    if(typeof window._combatCleanup === 'function') window._combatCleanup();
    if(reason === 'player_dead'){
      if(typeof heroAnim !== 'undefined'){ heroAnim.name = 'dead'; heroAnim.frame = 0; heroAnim.lastUpdate = performance.now(); }
      const _ex = window._explore;
      if(_ex){ _ex.mode = 'dead'; _ex.deadUntil = performance.now() + 60000; _ex.combatEvent = null; }
      state.player.deadUntil = Date.now() + 60000;
      return;
    }
    if(typeof cb === 'function') cb(false);
    return;
  }

  if(c.active && c.sceneType === 'vehicle'){
    c.sceneType = 'foot';
    c._fromVehicleWreck = true;
    c._enemiesRetreating = false;
    const _pw = (typeof _getPW === 'function') ? _getPW() : null;
    c.allies = [{
      isPlayer: true,
      hp: Math.max(1, state.player.hp),
      maxHp: state.player.maxHp,
      armor: state.player.armor,
      maxArmor: Math.max(1, state.player.maxArmor),
      armorLevel: state.player.armorLevel || 0,
      worldX: 0,
      weapon: _pw,
      _nextFireAt: performance.now() + 800
    }];
    /* [v192 F1] 車毀下車後補回載員到 c.allies。
       原代碼只建玩家，載員在 _disembark 後進入 ex.passengersFollowing，
       但不在 c.allies 裡 → _autoFireFoot / _tickAlliesPositions 不遍歷
       → 敵彈穿過、載員不還擊。此處主動觸發 _disembark（若尚未），
       再從 ex.passengersFollowing 讀非撤退載員，按 _startCombat 的
       同一結構加入 c.allies。 */
    if(b && b.active && typeof _disembark === 'function' && !b._wreckDisembarked){
      b._wreckDisembarked = true;
      try { _disembark(); } catch(e){ console.warn('[v192 F1 disembark]', e); }
    }
    if(window._explore && Array.isArray(window._explore.passengersFollowing)){
      const _exWX2 = (typeof window._explore.worldX === 'number') ? window._explore.worldX : 0;
      const _fw2 = window._explore.passengersFollowing;
      const _publicPool2 = [];
      for(let _pi2 = 0; _pi2 < _fw2.length; _pi2++){
        const _p2 = _fw2[_pi2].p;
        if(!_p2 || !_p2.ammoBox || !_p2.ammoBox.ammoId) continue;
        const _adef2 = (typeof AMMO !== 'undefined') ? AMMO[_p2.ammoBox.ammoId] : null;
        if(!_adef2 || !_adef2.cal) continue;
        _publicPool2.push({
          cal: _adef2.cal,
          id: _p2.ammoBox.ammoId,
          rarity: _p2.ammoBox.rarity || '一般',
          count: _p2.ammoBox.count || 0,
          _src: _p2.ammoBox
        });
      }
      for(let _fi2 = 0; _fi2 < _fw2.length; _fi2++){
        const _f2 = _fw2[_fi2];
        if(!_f2 || !_f2.srv || _f2._retreating) continue;
        const _srv2 = _f2.srv;
        if(_srv2.injuredUntil && _srv2.injuredUntil > Date.now()) continue;
        if(typeof _srv2.hp === 'number' && _srv2.hp <= 0) continue;
        const _pp2 = _f2.p || {};
        const _pwDef2 = _pp2.primaryWeapon ? itemDef(_pp2.primaryWeapon) : null;
        const _wO2 = _pwDef2 ? { id: _pp2.primaryWeapon, rarity: _pp2.primaryWeaponRarity || '一般', def: _pwDef2, slot: 'primary' } : null;
        let _armor2 = 0, _armorLevel2 = 0;
        for(const _slot2 of ['head','top']){
          const _id2 = (_slot2 === 'head') ? _pp2.helmet : _pp2.body;
          const _rar2 = (_slot2 === 'head') ? (_pp2.helmetRarity || '一般') : (_pp2.bodyRarity || '一般');
          if(!_id2) continue;
          _armor2 += (typeof equipArmorValue === 'function') ? (equipArmorValue(_id2, _rar2) || 0) : 0;
          const _d2 = ARMOR[_id2];
          if(_d2 && _d2.level) _armorLevel2 = Math.max(_armorLevel2, _d2.level);
        }
        const _maxHp2 = (typeof servantMaxHp === 'function') ? servantMaxHp(_srv2) : 100;
        c.allies.push({
          isPassenger: true, srv: _srv2,
          hp: _maxHp2, maxHp: _maxHp2,
          armor: _armor2, maxArmor: _armor2, armorLevel: _armorLevel2,
          worldX: _exWX2,
          weapon: _wO2,
          equipData: {
            head: _pp2.helmet || null,
            top: _pp2.body || null,
            primary: _pp2.primaryWeapon || null
          },
          ammoPouch: _pp2.ammoPouch ? { ammoId: _pp2.ammoPouch.ammoId, rarity: _pp2.ammoPouch.rarity, count: _pp2.ammoPouch.count } : null,
          ammoBox: _pp2.ammoBox ? { ammoId: _pp2.ammoBox.ammoId, rarity: _pp2.ammoBox.rarity, count: _pp2.ammoBox.count } : null,
          _publicPool: _publicPool2,
          grenades: Array.isArray(_pp2.grenades) ? _pp2.grenades.map(function(g){
            if(typeof g === 'string') return { id: g, rarity: '一般' };
            if(g && g.id) return { id: g.id, rarity: g.rarity || '一般' };
            return null;
          }).filter(function(g){ return g !== null; }) : []
        });
      }
    }
    c.playerFirst = true;
    c.engaged = true;
    c._playerMag = { inMag: 0, ammoRef: null, weaponId: null };
    c._playerReloadEnd = 0;
    c._fireAnim = null;
    c._playerAnimUntil = 0;
    const _exWX = (window._explore && typeof window._explore.worldX === 'number') ? window._explore.worldX : 0;
    /* v177 修復6：舊邏輯把「後方敵人瞬移到前方 5m」，導致下車一落地被十幾個
       敵人近身圍殺。改為：只保留前方且活著的敵人（含 0.5m 緩衝），
       後方敵人直接從交戰列表移除——它們仍在 event content 裡，
       玩家後續步行時會自然遇到。 */
    c.enemies = c.enemies.filter(function(e){
      return e.hp > 0 && isFinite(e.worldX) && e.worldX >= _exWX + 0.5;
    });
    /* [v178 R5] 缺陷A2/A3/A4+D：下車後清後方事件 + 復位 ex 狀態。
       引擎/履帶/駕駛員陣亡走 enterWreckMode → 本分支 → 3.5s 後 _finishWreck
       → _cleanup 因 sceneType 已改 foot 而 cb 不跑 → 需在此手動清。
       同時清後方事件避免下車時 isV=false 把身後 225m 事件全激活造成刷臉。 */
    if(window._explore && window._explore.nodes){
      for(const _node178 of window._explore.nodes){
        for(const _ev178 of _node178.events){
          if(_ev178.cleared) continue;
          if(_ev178.type !== 'combat') continue;
          if(_ev178.worldX <= _exWX) _ev178.cleared = true;
        }
      }
    }
    if(window._explore){
      window._explore.mode = 'walk';
      window._explore.combatEvent = null;
      window._explore._pendingLootEvents = null;
    }
    if(typeof pushLog === 'function') pushLog('<span class="pl">玩家</span> 下車繼續作戰', [], 'explore');
  }
}

window._resolveVehicleLeave = _resolveVehicleLeave;

function _writeVehicleDestroyedLog(reason, vid){
  const _dmg = state.vehicleDamage && state.vehicleDamage[vid];
  if(!_dmg) return;
  const _brokenParts = [];
  for(const _pk in _dmg.parts){ if(_dmg.parts[_pk] <= 0) _brokenParts.push(_pk); }
  const _deadMembers = [];
  for(const _mk in _dmg.members){ if(_dmg.members[_mk] <= 0) _deadMembers.push(_mk); }
  const _reasonText = reason === 'detonated' ? '彈藥架殉爆' : '車體擊毀';
  const _summary = [];
  if(_brokenParts.length) _summary.push('損壞 ' + _brokenParts.length + ' 處');
  if(_deadMembers.length) _summary.push('陣亡 ' + _deadMembers.length + ' 人');
  const _vdData = {
    vehicleId: vid,
    reason: reason,
    lastHit: _dmg.lastHit || null,
    brokenParts: _brokenParts,
    deadMembers: _deadMembers,
    ammoRackDamage: _dmg.ammoRackDamage || 0,
    repairUntil: _dmg.repairUntil || 0
  };
  if(typeof pushLog === 'function'){
    pushLog('<span class="lose">' + _reasonText + '</span>' + (_summary.length ? ' · ' + _summary.join(' · ') : '') + '，<span style="color:#4a90d9;text-decoration:underline;text-decoration-style:dotted">點擊查看詳情</span>', [], 'vehicle_destroyed');
    if(state.logs && state.logs.length) state.logs[state.logs.length - 1].vehicleDestroyed = _vdData;
  }
}

function _openVehicleDestroyedDetail(log){
  if(!log || !log.vehicleDestroyed) return;
  const d = log.vehicleDestroyed;
  const vid = d.vehicleId;
  const vehName = (typeof VEHICLES !== 'undefined' && VEHICLES[vid]) ? VEHICLES[vid].name : vid;
  const reasonMap = { detonated: '彈藥架殉爆', hull_destroyed: '車體擊毀' };
  const reason = reasonMap[d.reason] || d.reason;
  let body = '';
  body += '<div class="detail-title r-傳奇">💥 ' + vehName + ' 擊毀</div>';
  body += '<div class="detail-sub">' + reason + '</div>';
  if(d.lastHit){
    body += '<div class="divider"></div>';
    body += '<div style="font-size:11px;color:#e8a33d;font-weight:bold;margin-bottom:4px">致命一擊</div>';
    const partName = { hullFront: '車體正面', side: '側面', rear: '後面', turretFront: '炮塔正面', turretSide: '炮塔側面' }[d.lastHit.part] || d.lastHit.part;
    const internalName = { ammoRack: '彈藥架', crew: '乘員', engine: '引擎', tracks: '履帶/輪組', gun: '炮管', turret: '炮塔' }[d.lastHit.internal] || d.lastHit.internal;
    body += '<div class="stat-line"><span class="k">部位</span><span class="v">' + partName + '</span></div>';
    body += '<div class="stat-line"><span class="k">內部</span><span class="v">' + internalName + '</span></div>';
    body += '<div class="stat-line"><span class="k">傷害</span><span class="v">' + Math.round(d.lastHit.dmg) + '</span></div>';
  }
  if(d.brokenParts && d.brokenParts.length){
    body += '<div class="divider"></div>';
    body += '<div style="font-size:11px;color:#e8a33d;font-weight:bold;margin-bottom:4px">損壞部件</div>';
    const partLabel = { engine: '引擎', tracks: '履帶/輪組', gun: '炮管', turret: '炮塔' };
    for(let i = 0; i < d.brokenParts.length; i++){
      body += '<div class="stat-line"><span class="k">' + (partLabel[d.brokenParts[i]] || d.brokenParts[i]) + '</span><span class="v" style="color:#e05252">損壞</span></div>';
    }
  }
  if(d.deadMembers && d.deadMembers.length){
    body += '<div class="divider"></div>';
    body += '<div style="font-size:11px;color:#e8a33d;font-weight:bold;margin-bottom:4px">陣亡成員</div>';
    const memberLabel = { driver: '駕駛', gunner: '炮手', commander: '車長', player: '玩家' };
    for(let i = 0; i < d.deadMembers.length; i++){
      body += '<div class="stat-line"><span class="k">' + (memberLabel[d.deadMembers[i]] || d.deadMembers[i]) + '</span><span class="v" style="color:#e05252">陣亡</span></div>';
    }
  }
  if(d.ammoRackDamage > 0){
    body += '<div class="divider"></div>';
    body += '<div class="stat-line"><span class="k">彈藥架累計傷害</span><span class="v">' + Math.round(d.ammoRackDamage) + '</span></div>';
  }
  if(d.repairUntil > 0){
    let remainH = Math.round((d.repairUntil - Date.now()) / 3600000 * 10) / 10;
    if(remainH < 0) remainH = 0;
    body += '<div class="divider"></div>';
    body += '<div class="stat-line"><span class="k">維修時長</span><span class="v">' + remainH + ' 小時</span></div>';
  }
  const ft = document.createElement('div');
  ft.className = 'modal-ft';
  ft.innerHTML = '';
  openModal({ title: '擊毀報告', body: body, footer: ft });
}

window._openVehicleDestroyedDetail = _openVehicleDestroyedDetail;

window._refillVehicleAmmo = function(vid){
  if(!state.vehicleAmmo || !state.vehicleAmmo[vid]) return;
  const _ld = (typeof VEHICLE_LOADOUT !== 'undefined' && VEHICLE_LOADOUT[vid]) ? VEHICLE_LOADOUT[vid] : ((typeof _buildLoadoutFallback === 'function') ? _buildLoadoutFallback(vid) : null);
  if(!_ld) return;
  for(const _wid in _ld){
    const _a = state.vehicleAmmo[vid][_wid];
    if(!_a) continue;
    const _max = _a.max || (_ld[_wid].belts ? _ld[_wid].belts * _ld[_wid].perBelt : (_ld[_wid].rounds || 0));
    _a.max = _max;
    if(_a.breakdown){
      if(_a.presetBreakdown) _a.breakdown = JSON.parse(JSON.stringify(_a.presetBreakdown));
      let sum = 0;
      for(const _k in _a.breakdown) sum += (_a.breakdown[_k] || 0);
      _a.current = sum;
    } else {
      _a.current = _max;
    }
  }
};

window._radioBTRTrigger = function(){
  const g = (typeof _garageInitState === 'function') ? _garageInitState() : null;
  const vid = g ? g.currentVehicle : 'btr80';

  if(state.vehicleDamage && state.vehicleDamage[vid] && state.vehicleDamage[vid].repairUntil > Date.now()){
    return false;
  }

  const st = state.station || {};
  const crew = st.crew || {};
  for(const role of ['commander', 'gunner', 'driver']){
    const sid = crew[role];
    if(!sid) return false;
    const srv = (state.servants || []).find(function(s){ return s.id === sid; });
    if(!srv) return false;
    if(srv.injuredUntil && srv.injuredUntil > Date.now()) return false;
  }

  const cost = (typeof vcEstimateCallCost === 'function') ? vcEstimateCallCost(vid) : { diff: 0 };
  const avail = (typeof vcAmmoEquivTotal === 'function') ? vcAmmoEquivTotal() : 0;
  if(avail + 0.01 < cost.diff) return false;
  if(cost.diff > 0 && typeof vcConsumeAmmoEquiv === 'function') vcConsumeAmmoEquiv(cost.diff);

  if(state.vehicleDamage && state.vehicleDamage[vid]){
    const d = state.vehicleDamage[vid];
    d.members = { driver: 1, gunner: 1, commander: 1, player: 1 };
    d.parts = { engine: 800, tracks: 1000, turret: 400 };
    if(d.weapons){ for(const _wid in d.weapons){ d.weapons[_wid].hp = d.weapons[_wid].max; } }
    d.ammoRackDamage = 0;
    d.destroyed = false;
    d.disabled = false;
    d.repairUntil = 0;
  }

  if(typeof vcEnsureAmmo === 'function') vcEnsureAmmo(vid);
  if(typeof window._refillVehicleAmmo === 'function') window._refillVehicleAmmo(vid);

  if(window._explore) window._explore._vehicleDisabledTriggered = false;

  window.BTRSupport.start(vid);
  return true;
};


/* v26: BTR 结束且载具战未结束时，强制结束战斗并清理状态 */
window._forceEndVehicleCombat = function(){
  var c = window._combat;
  var ex = window._explore;
  /* [v179 F2b] 只在载具战时强制结束。若 R5 已切 foot，不误杀步战。 */
  if(c && c.active && c.sceneType === 'vehicle'){
    var cb = c.onResolve;
    c.active = false;
    c.onResolve = null;
    if(typeof window._combatCleanup === 'function'){
      try{ window._combatCleanup(); }catch(e){ console.warn('[forceEnd] cleanup', e); }
    }
    if(typeof cb === 'function'){
      try{ cb(true); }catch(e){ console.warn('[forceEnd] onResolve', e); }
    }
  } else if(!c || !c.active){
    /* 真的没战斗才清理残留 */
    if(typeof window._combatCleanup === 'function'){
      try{ window._combatCleanup(); }catch(e){}
    }
  }
  /* [v179 F2b] 只在「没战斗」或「载具战」时清 ex；foot 战不动 */
  if(ex && (!c || !c.active || c.sceneType === 'vehicle')){
    if(ex.mode === 'combat' || ex.mode === 'vehicle'){
      ex.mode = 'walk';
    }
    ex.combatEvent = null;
    ex._pendingLootEvents = null;
  }
  if(typeof window._exploreSetVehicleMode === 'function'){
    try{ window._exploreSetVehicleMode(false); }catch(e){}
  }
};

function _grantBTRCrewExp(exp){
  if(!state.station || !state.station.crew) return;
  const members = [];
  for(const r of ['commander', 'gunner', 'driver']){
    const sid = state.station.crew[r];
    if(!sid) continue;
    const srv = (state.servants || []).find(function(s){ return s.id === sid; });
    if(srv) members.push(srv);
  }
  if(!members.length) return;
  const per = Math.floor(exp / members.length);
  if(per <= 0) return;
  for(const srv of members){
    if(typeof servantAddExp === 'function') servantAddExp(srv, per);
  }
}

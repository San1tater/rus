
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
  '2a70':   [{ id: '100he', type: 'he' }],
  '2a28':   [{ id: '73heat', type: 'heat' }, { id: '73hefrag', type: 'he' }]
};

const _LEG_MULT = 5;
const _VEHICLE_CRIT_RATE = 0.85;
const _VEHICLE_CRIT_MULT = 37.5;

window._vehicleWeaponsDead = function(){
  const g = (typeof _garageInitState === 'function') ? _garageInitState() : null;
  const vid = g ? g.currentVehicle : 'btr80';
  const dmg = state.vehicleDamage && state.vehicleDamage[vid];
  if(!dmg) return false;
  if(dmg.destroyed) return true;
  if(dmg.members && dmg.members.gunner <= 0 && dmg.members.commander <= 0) return true;
  const gunDead = dmg.parts && dmg.parts.gun <= 0;
  const turretDead = dmg.parts && dmg.parts.turret <= 0;
  if(turretDead) return true;
  if(!gunDead) return false;
  const ld = (typeof _getLoadout === 'function') ? _getLoadout(vid) : null;
  if(!ld) return true;
  const ammoState = state.vehicleAmmo && state.vehicleAmmo[vid];
  for(const wid in ld){
    if(wid === 'pkt') continue;
    if(wid === 'nsvt' || wid === 'kpvt' || wid === 'atgm'){
      const a = ammoState && ammoState[wid];
      if(a && a.current > 0) return false;
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

  const alive = [];
  for(let i = 0; i < c.enemies.length; i++){
    if(c.enemies[i].hp > 0 && c.enemies[i].worldX > p.worldX) alive.push(c.enemies[i]);
  }
  if(!alive.length) return null;

  let r = (typeof VEHICLE_RANGE_M !== 'undefined' && VEHICLE_RANGE_M[wid]) ? VEHICLE_RANGE_M[wid] : 300;
  if(typeof hasCrewTalent === 'function' && hasCrewTalent('commander', 'commander_sense')) r *= 1.15;

  const tg = [];
  for(let a = 0; a < alive.length; a++){
    if(Math.abs(alive[a].worldX - p.worldX) <= r) tg.push(alive[a]);
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
    if(ammoId === '100he') return VEHICLE_WEAPON_STATS['2a70_he'];
    if(ammoId === '73heat') return VEHICLE_WEAPON_STATS['2a28_heat'];
    if(ammoId === '73hefrag') return VEHICLE_WEAPON_STATS['2a28_he'];
  }
  if(wid === 'pkt') return VEHICLE_WEAPON_STATS.pkt;
  if(wid === 'kpvt') return VEHICLE_WEAPON_STATS.kpvt;
  if(wid === 'nsvt') return VEHICLE_WEAPON_STATS.nsvt;
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
  if(ammoId === '3of26' || ammoId === '100he' || ammoId === '73hefrag') return true;
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
        (function(){var _wn={ '2a46':'125mm 主炮','2a46m1':'125mm 主炮','2a70':'100mm 主炮','2a28':'73mm 主炮','2a42':'30mm 機炮','2a72':'30mm 機炮','kpvt':'14.5mm KPVT','nsvt':'12.7mm NSVT','pkt':'7.62mm PKT','atgm':'ATGM' }[wid]||(wid?wid.toUpperCase():'未知武器');var _af={'3bm42':'穿甲彈','3of26':'高爆彈','3bk29':'破甲彈','100he':'高爆彈','73heat':'破甲彈','73hefrag':'高爆彈'}[ammoId];var _fm=_af?('（'+_af+'）'):(ammoId==='atgm'?'（反坦克導彈）':(ammoId?'（'+ammoId+'）':''));pushLog('<span class="run">'+_wn+_fm+'</span> 濺射擊殺 <b class="r-'+(t.enemy.rarity||'一般')+'">'+eName+'</b>', [], 'explore');})();
      }
      if(t.type === 'event' && t.event && t.event.content){
        t.event.content = t.event.content.filter(function(x){ return x !== t.enemy; });
        if(!t.event.content.length) t.event.cleared = true;
      }
      if(window.BTRSupport && typeof window.BTRSupport.killCount === 'number'){
        window.BTRSupport.killCount = (window.BTRSupport.killCount || 0) + 1;
        if(!window.BTRSupport.kills) window.BTRSupport.kills = {};
        window.BTRSupport.kills[t.enemy.eid] = (window.BTRSupport.kills[t.enemy.eid] || 0) + 1;
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

  const stats = _getVehicleAmmoStats(wid, _usedAmmoId);
  if(!stats) return false;

  const isHE = _isHEAmmo(wid, _usedAmmoId);
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

  if(!hit){
    if(isHE && target){
      _applyHESplash(wid, target, Math.round(baseDmg * 0.15), false, penMM, _usedAmmoId);
    }
    return true;
  }

  if(isHE){
    const mainProxy = { hp: target.hp, armor: target.armor || 0 };
    const mainRes = applyDamage(mainProxy, finalDmg, penMM, { isHE: true });
    target.hp = mainProxy.hp;
    if(target.armor !== undefined) target.armor = mainProxy.armor;
    _vehicleCombatFloat(target.worldX, '-' + mainRes.hpLost + (crit ? '!' : ''), crit ? 'crit' : 'enemy');
    if(target.hp <= 0){
      _onBTRKillTarget(target, wid, c, _usedAmmoId);
    }
    _applyHESplash(wid, target, finalDmg, crit, penMM, _usedAmmoId);
  } else {
    const targetArmorLevel = target.armorLevel || 0;
    const proxy = { hp: target.hp, armor: target.armor || 0 };
    const res = applyDamage(proxy, finalDmg, penMM, {
      armorMMOverride: (ARMOR_LEVEL_TO_MM[targetArmorLevel] || 0)
    });
    target.hp = proxy.hp;
    if(target.armor !== undefined) target.armor = proxy.armor;
    const shown = res.hpLost > 0 ? res.hpLost : res.armorLost;
    _vehicleCombatFloat(target.worldX, '-' + shown + (crit ? '!' : ''), crit ? 'crit' : 'enemy');
    if(target.hp <= 0){
      _onBTRKillTarget(target, wid, c, _usedAmmoId);
    }
  }
  return true;
};

function _onBTRKillTarget(target, wid, c, usedAmmoId){
  if(!c && window._combat) c = window._combat;
  var eName = (typeof ENEMIES !== 'undefined' && ENEMIES[target.eid]) ? ENEMIES[target.eid].name : target.eid;
  var wn = { '2a46':'125mm 主炮','2a46m1':'125mm 主炮','2a70':'100mm 主炮','2a28':'73mm 主炮','2a42':'30mm 機炮','2a72':'30mm 機炮','kpvt':'14.5mm KPVT','nsvt':'12.7mm NSVT','pkt':'7.62mm PKT','atgm':'ATGM' }[wid] || (wid ? wid.toUpperCase() : '未知武器');
  var form = '';
  if(usedAmmoId){
    var ammoForm = {
      '3bm42':'穿甲彈', '3of26':'高爆彈', '3bk29':'破甲彈',
      '100he':'高爆彈', '73heat':'破甲彈', '73hefrag':'高爆彈'
    }[usedAmmoId];
    if(ammoForm) form = '（' + ammoForm + '）';
    else if(usedAmmoId === 'atgm') form = '（反坦克導彈）';
    else form = '（' + usedAmmoId + '）';
  }
  if(typeof pushLog === 'function') pushLog('<span class="run">' + wn + form + '</span> 擊殺 <b class="r-' + target.rarity + '">' + eName + '</b>', [], 'explore');
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
          window._explore.corpses.push({ wrap:wEl, drawW:rc.drawW, drawH:rc.drawH, worldX:window._explore.worldX + (target.worldX - _playerX) });
        }
      }
    }
  } catch(e){}
}

function _vEnsureDamage(vid){
  if(!state.vehicleDamage) state.vehicleDamage = {};
  let d = state.vehicleDamage[vid];
  if(!d){
    d = {
      ammoRackDamage: 0,
      parts: { engine: 800, tracks: 1000, gun: 400, turret: 400 },
      members: { driver: 300, gunner: 300, commander: 300, player: 100 },
      disabled: false,
      destroyed: false,
      repairUntil: 0
    };
    state.vehicleDamage[vid] = d;
  }
  if(typeof d.members.player !== 'number') d.members.player = 100;
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

window._vHitVehicle = function(veh, dmg, penMM, ammoId, attackerName, weaponName, weaponRarity){
  const vid = veh.vehicleId;
  const d = _vEnsureDamage(vid);
  if(attackerName || weaponName){
    d.lastAttacker = { name: attackerName || '???', weapon: weaponName || '???', rarity: weaponRarity || '一般' };
  }
  const part = _vPickWeighted(_VEHICLE_PART_PROB);
  let armorMM = _vGetArmor(vid, part.key);
  const isHeat = _vIsHeatAmmo(ammoId);
  armorMM += _vGetEraBonus(vid, isHeat);

  if(penMM < armorMM){
    if(typeof _vehicleCombatFloat === 'function'){
      _vehicleCombatFloat(0, '跳彈', 'armor');
    }
    return { penetrated: false, damage: 0 };
  }

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
    if(_st && _st.passengers){
      for(let i = 0; i < _st.passengers.length; i++){
        const pp = _st.passengers[i];
        const ss = (state.servants || []).find(function(x){ return x.id === pp.srvId; });
        if(ss && (!ss.hp || ss.hp > 0)) pool.push({ t: 'passenger', srv: ss, p: pp });
      }
    }
    if(!pool.length) return { penetrated: true, part: part.key, internal: '乘員', damage: 0 };
    const tgt = pool[Math.floor(Math.random() * pool.length)];

    if(tgt.t === 'crew'){
      d.members[tgt.r] = Math.max(0, d.members[tgt.r] - dmg * 1.5);
      _vehicleCombatFloat(0, '乘員 -' + Math.round(dmg * 1.5), 'crit');
      if(tgt.r === 'driver' && d.members.driver <= 0){
        if(typeof pushLog === 'function') pushLog('<span class="lose">駕駛</span> 陣亡', [], 'explore');
        const _drvId = state.station && state.station.crew ? state.station.crew.driver : null;
        if(_drvId){
          const _drvSrv = (state.servants || []).find(function(s){ return s.id === _drvId; });
          if(_drvSrv){ _drvSrv.hp = 0; _drvSrv.injuredUntil = Date.now() + 4 * 3600 * 1000; _drvSrv._injuredDown = true; }
        }
        d.repairUntil = Date.now() + 4 * 3600 * 1000;
        _forceLeave(vid, veh, 'driver_dead');
      }
      if(tgt.r === 'gunner' && d.members.gunner <= 0){
        if(typeof pushLog === 'function') pushLog('<span class="lose">炮手</span> 陣亡', [], 'explore');
        const _gnrId = state.station && state.station.crew ? state.station.crew.gunner : null;
        if(_gnrId){
          const _gnrSrv = (state.servants || []).find(function(s){ return s.id === _gnrId; });
          if(_gnrSrv){ _gnrSrv.hp = 0; _gnrSrv.injuredUntil = Date.now() + 4 * 3600 * 1000; _gnrSrv._injuredDown = true; }
        }
      }
      if(tgt.r === 'commander' && d.members.commander <= 0){
        if(typeof pushLog === 'function') pushLog('<span class="lose">車長</span> 陣亡', [], 'explore');
        const _cmdId = state.station && state.station.crew ? state.station.crew.commander : null;
        if(_cmdId){
          const _cmdSrv = (state.servants || []).find(function(s){ return s.id === _cmdId; });
          if(_cmdSrv){ _cmdSrv.hp = 0; _cmdSrv.injuredUntil = Date.now() + 4 * 3600 * 1000; _cmdSrv._injuredDown = true; }
        }
      }
    } else if(tgt.t === 'player'){
      const _tgt = { hp: state.player.hp, armor: state.player.armor };
      const _lv = state.player.armorLevel || 0;
      applyDamage(_tgt, dmg * 1.5, penMM, { armorMMOverride: ARMOR_LEVEL_TO_MM[_lv] || 0 });
      state.player.hp = _tgt.hp;
      state.player.armor = _tgt.armor;
      _vehicleCombatFloat(0, '玩家 -' + Math.round(dmg * 1.5), 'crit');
      if(state.player.hp <= 0){
        state.player.hp = 0;
        state.player.deadUntil = Date.now() + 60000;
        const _ex = window._explore;
        if(_ex){ _ex.mode = 'dead'; _ex.deadUntil = performance.now() + 60000; _ex._currentSpeed = 0; }
        if(typeof heroAnim !== 'undefined'){ heroAnim.name = 'dead'; heroAnim.frame = 0; heroAnim.lastUpdate = performance.now(); }
        _forceLeave(vid, veh, 'player_dead');
      }
    } else if(tgt.t === 'passenger'){
      const _arm = _vCalcPassengerArmor(tgt.p);
      const _maxHp = (typeof servantMaxHp === 'function') ? servantMaxHp(tgt.srv) : 100;
      const _curHp = (typeof tgt.srv.hp === 'number') ? tgt.srv.hp : _maxHp;
      const _t2 = { hp: _curHp, armor: _arm };
      applyDamage(_t2, dmg * 1.5, penMM, { armorMMOverride: 0 });
      tgt.srv.hp = _t2.hp;
      _vehicleCombatFloat(0, '載員 -' + Math.round(_t2.hpLost || dmg * 1.5), 'crit');
      if(tgt.srv.hp <= 0){
        tgt.srv.hp = 0;
        tgt.srv.injuredUntil = Date.now() + 4 * 3600 * 1000;
        if(typeof pushLog === 'function') pushLog('<span class="lose">' + (typeof servantLabel === 'function' ? servantLabel(tgt.srv) : '載員') + '</span> 重傷', [], 'explore');
      }
    }
    return { penetrated: true, part: part.key, internal: '乘員', damage: dmg };
  }

  const _prevPartVal = d.parts[key] || 0;
  d.parts[key] = Math.max(0, (d.parts[key] || 0) - dmg);
  _vehicleCombatFloat(0, '-' + Math.round(dmg), '');
  if(key === 'engine' && d.parts.engine <= 0){
    if(_prevPartVal > 0){
      if(typeof pushLog === 'function') pushLog('<span class="lose">引擎</span> 癱瘓', [], 'explore');
      d.repairUntil = Date.now() + 4 * 3600 * 1000;
    }
    _forceLeave(vid, veh, 'engine');
  }
  if(key === 'tracks' && d.parts.tracks <= 0){
    if(_prevPartVal > 0){
      if(typeof pushLog === 'function') pushLog('<span class="lose">履帶/輪組</span> 癱瘓', [], 'explore');
      d.repairUntil = Date.now() + 4 * 3600 * 1000;
    }
    _forceLeave(vid, veh, 'tracks');
  }
  if(key === 'gun' && d.parts.gun <= 0){
    if(_prevPartVal > 0){
      if(typeof pushLog === 'function'){
        const _shouldLeaveGun = window._vehicleWeaponsDead && window._vehicleWeaponsDead();
        if(_shouldLeaveGun) pushLog('<span class="lose">炮管</span> 損壞，載具離場', [], 'explore');
        else pushLog('<span class="lose">炮管</span> 損壞（車頂武器仍可開火）', [], 'explore');
      }
      d.repairUntil = Date.now() + 4 * 3600 * 1000;
    }
    if(window._vehicleWeaponsDead && window._vehicleWeaponsDead()) _forceLeave(vid, veh, 'gun');
  }
  if(key === 'turret' && d.parts.turret <= 0){
    if(_prevPartVal > 0){
      if(typeof pushLog === 'function') pushLog('<span class="lose">炮塔</span> 卡死，載具離場', [], 'explore');
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
  const _passengers = state.station && state.station.passengers;
  if(_passengers){
    for(const p of _passengers){
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
      pushLog('<span class="lose">殉爆</span> ' + _la.name + ' 用 <span class="' + _wClsDet + '">' + _la.weapon + '</span> 引發彈藥架殉爆，全員重傷', [], 'explore');
    } else {
      pushLog('<span class="lose">殉爆</span> 載具彈藥架殉爆，全員重傷', [], 'explore');
    }
  }

  const _c = window._combat;
  if(_c){ _c.active = false; _c.onResolve = null; }
  const _b = window.BTRSupport;
  if(_b && _b.active){
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
    if(typeof pushLog === 'function') pushLog('<span class="lose">載具</span> 炮手車長陣亡', [], 'explore');
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
    c.playerFirst = true;
    c.engaged = true;
    c._playerMag = { inMag: 0, ammoRef: null, weaponId: null };
    c._playerReloadEnd = 0;
    c._fireAnim = null;
    c._playerAnimUntil = 0;
    for(let i = 0; i < c.enemies.length; i++){
      if(c.enemies[i].worldX < 0) c.enemies[i].worldX = 5;
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
    d.members = { driver: 300, gunner: 300, commander: 300, player: 100 };
    d.parts = { engine: 800, tracks: 1000, gun: 400, turret: 400 };
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
  if(c && c.active){
    var cb = c.onResolve;
    c.active = false;
    c.onResolve = null;
    if(typeof window._combatCleanup === 'function'){
      try{ window._combatCleanup(); }catch(e){ console.warn('[forceEnd] cleanup', e); }
    }
    if(typeof cb === 'function'){
      try{ cb(true); }catch(e){ console.warn('[forceEnd] onResolve', e); }
    }
  } else {
    /* 没战斗也清理残留 */
    if(typeof window._combatCleanup === 'function'){
      try{ window._combatCleanup(); }catch(e){}
    }
  }
  /* 无论有没有战斗，都清理 ex 状态 */
  if(ex){
    if(ex.mode === 'combat' || ex.mode === 'vehicle'){
      ex.mode = 'walk';
    }
    ex.combatEvent = null;
    ex._pendingLootEvent = null;
  }
  if(typeof window._exploreSetVehicleMode === 'function'){
    try{ window._exploreSetVehicleMode(false); }catch(e){}
  }
};

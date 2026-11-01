/* ==== 13-vehicle-combat.js（原） ==== */


(function(){
'use strict';
window._vehCombat=null;
if(!window.BTRSupport)return;

window.VEHICLE_BASE_HR={
  btr80:50,btr80a:50,btr82:50,btr82a:50,btr90:50,
  bmp1:55,bmp1m:55,bmp2:55,bmp3:60,bmd4:60,
  t80:65,t80b:65,t80bv:65,t80u:65,t80uk:65,t80um:65
};
if(typeof MUZZLE_PROFILES!=='undefined'){MUZZLE_PROFILES['2a46']={burst:1,intervalMs:2500,pauseMs:1500,flashSize:40,flashColor:'255,140,60',bulletSize:6,bulletSpeed:300,projectileType:'bullet'};MUZZLE_PROFILES['2a46m1']={burst:1,intervalMs:2500,pauseMs:1500,flashSize:40,flashColor:'255,140,60',bulletSize:6,bulletSpeed:300,projectileType:'bullet'};MUZZLE_PROFILES['2a70']={burst:1,intervalMs:2500,pauseMs:1500,flashSize:38,flashColor:'255,145,60',bulletSize:5.5,bulletSpeed:310,projectileType:'bullet'};MUZZLE_PROFILES['2a28']={burst:1,intervalMs:2500,pauseMs:1500,flashSize:36,flashColor:'255,150,60',bulletSize:5.5,bulletSpeed:320,projectileType:'bullet'};}
window._combatHasTarget=function(){var c=window._combat;if(!c||!c.active||c.resolved)return false;var p=c.allies[0];if(!p)return false;var alive=[];for(var i=0;i<c.enemies.length;i++)if(c.enemies[i].hp>0)alive.push(c.enemies[i]);if(!alive.length)return false;for(var a=0;a<alive.length;a++)if(Math.abs(alive[a].worldX-p.worldX)<=1000)return true;return false;};
window._vsForceEndSupport=function(){var b=window.BTRSupport;if(!b||!b.active||b.phase!=='support')return;if(typeof BTR_TIMELINE!=='undefined')b.phaseT=BTR_TIMELINE.supportDur+1;};

window._refillVehicleAmmo=function(vid){
  if(!state.vehicleAmmo||!state.vehicleAmmo[vid])return;
  var _ld=(typeof VEHICLE_LOADOUT!=='undefined'&&VEHICLE_LOADOUT[vid])?VEHICLE_LOADOUT[vid]:((typeof _buildLoadoutFallback==='function')?_buildLoadoutFallback(vid):null);
  if(!_ld)return;
  for(var _wid in _ld){
    var _a=state.vehicleAmmo[vid][_wid];
    if(!_a)continue;
    var _max=_a.max||((_ld[_wid].belts?_ld[_wid].belts*_ld[_wid].perBelt:(_ld[_wid].rounds||0)));
    _a.max=_max;
    if(_a.breakdown){
      if(_a.presetBreakdown){_a.breakdown=JSON.parse(JSON.stringify(_a.presetBreakdown));}
      var _sum=0;for(var _k in _a.breakdown)_sum+=(_a.breakdown[_k]||0);
      if(_sum>_a.current)_a.current=_sum;
    }else{
      _a.current=_max;
    }
  }
};
window._radioBTRTrigger=function(){var g=(typeof _garageInitState==='function')?_garageInitState():null;var vid=g?g.currentVehicle:'btr80';if(state.vehicleDamage&&state.vehicleDamage[vid]){var _d=state.vehicleDamage[vid];_d.members={driver:300,gunner:300,commander:300,player:100};_d.parts={engine:800,tracks:1000,gun:400,turret:400};_d.ammoRackDamage=0;_d.destroyed=false;_d.disabled=false;_d.repairUntil=0;}if(state.vehicleAmmo&&state.vehicleAmmo[vid]&&state.vehicleAmmo[vid]['2a70']){var _m270=state.vehicleAmmo[vid]['2a70'].max||40;state.vehicleAmmo[vid]['2a70'].breakdown={'100he':_m270};state.vehicleAmmo[vid]['2a70'].current=_m270;}if(window._explore)window._explore._vehicleDisabledTriggered=false;var cost=(typeof vcEstimateCallCost==='function')?vcEstimateCallCost(vid):{diff:0};var avail=(typeof vcAmmoEquivTotal==='function')?vcAmmoEquivTotal():0;if(avail+0.01<cost.diff){if(typeof notify==='function')notify('彈藥等值不足','warn');return false;}if(cost.diff>0&&typeof vcConsumeAmmoEquiv==='function')vcConsumeAmmoEquiv(cost.diff);if(typeof vcEnsureAmmo==='function')vcEnsureAmmo(vid);if(typeof window._refillVehicleAmmo==='function')window._refillVehicleAmmo(vid);window.BTRSupport.start(vid);return true;};
})();


/* ==== 19-vehicle-fix-v2.js（原） ==== */


(function(){
'use strict';

/* ① 敌人尸體缩放 */
if(typeof _measureDeathBBox === 'function'
   && typeof _measureLayerMaxY === 'function'
   && typeof _drawHumanCorpse === 'function'
   && typeof _resolveEnemyDef === 'function'
   && typeof _resolveEnemyAnims === 'function'){
  window._renderEnemyCorpseCanvas = function(enemy, fxH){
    var eid = enemy.eid || enemy.id;
    if(!eid) return null;
    var r = _resolveEnemyDef(eid);
    if(!r) return null;
    var def = r.def, drawId = r.resolvedId;
    var an = _resolveEnemyAnims(drawId);
    if(!an || !an.death) return null;
    var dA = an.death, lf = dA.frameCount - 1;
    var bb = _measureDeathBBox(def, dA, lf);
    if(!bb) return null;
    var isH = (def.kind === 'human');
    var charPx = fxH * CHAR_HEIGHT_FACTOR;
    var _lenBase = Math.max(bb.w, 1);
    var sc = charPx / _lenBase;
    var amY = isH ? _measureLayerMaxY(def, dA, lf, 'torso') : null;
    var cHU = bb.h;
    if(amY !== null && amY < bb.maxY) cHU = amY - bb.minY;
    var eq = null;
    if(isH){
      var _pool = (typeof _EQI !== 'undefined' && _EQI[drawId]) ? _EQI[drawId] : null;
      if(!_pool && typeof _EQI !== 'undefined') _pool = _EQI.human_raider;
      var _pwId = (enemy.primaryWeapon && enemy.primaryWeapon.id) ? enemy.primaryWeapon.id : null;
      if(!_pwId || (typeof _isMeleeWeapon === 'function' && _isMeleeWeapon(_pwId))){
        if(typeof _pickR === 'function' && _pool) _pwId = _pickR(_pool.primary);
        if(_pwId && typeof _isMeleeWeapon === 'function' && _isMeleeWeapon(_pwId)) _pwId = null;
      }
      var _head = enemy.helmet || (typeof _pickR === 'function' && _pool ? _pickR(_pool.head) : null);
      var _body = enemy.body || (typeof _pickR === 'function' && _pool ? _pickR(_pool.top) : null);
      eq = { head: _head || null, top: _body || null, primary: _pwId };
    }
    var pL = 0, pR = 0, pT = 0;
    if(isH){ pL = 60; pR = 60; if(eq.primary) pT = Math.round(_lenBase * 0.2); }
    cHU += pT;
    var dW = (bb.w + pL + pR) * sc, dH = cHU * sc;
    var cvs = document.createElement('canvas');
    cvs.width = Math.max(1, Math.round(dW * 2));
    cvs.height = Math.max(1, Math.round(dH * 2));
    var ctx = cvs.getContext('2d');
    ctx.setTransform(2, 0, 0, 2, 0, 0);
    _drawHumanCorpse(ctx, drawId, sc, -(bb.minX - pL) * sc, -(bb.minY - pT) * sc, def, dA, lf, eq, true);
    return { canvas: cvs, drawW: dW, drawH: dH };
  };
}

/* ② 瘫痪判定 */
function _vehicleWeaponsDead(){
  var g = (typeof _garageInitState === 'function') ? _garageInitState() : null;
  var vid = g ? g.currentVehicle : 'btr80';
  var dmg = state.vehicleDamage && state.vehicleDamage[vid];
  if(!dmg) return false;
  if(dmg.destroyed) return true;
  if(dmg.members && dmg.members.gunner <= 0 && dmg.members.commander <= 0) return true;
  return false;
}
function _vehicleDisabled(){
  var g = (typeof _garageInitState === 'function') ? _garageInitState() : null;
  var vid = g ? g.currentVehicle : 'btr80';
  var dmg = state.vehicleDamage && state.vehicleDamage[vid];
  if(!dmg) return false;
  if(dmg.destroyed) return true;
  if(dmg.parts && (dmg.parts.tracks <= 0 || dmg.parts.engine <= 0)) return true;
  if(dmg.members && dmg.members.gunner <= 0 && dmg.members.commander <= 0) return true;
  return false;
}


/* ④ 载员错开 + 瘫痪冻结 */
/* 19-vehicle-fix-v2: _exploreTick 包裝已移除（載員輪換由 11-explore._updatePT 獨佔控制；癱瘓不凍結世界） */

/* ⑤ 2a70 目标选密集 */
function _p28PickDensest(tg, p){
  if(!tg.length) return null;
  var best = tg[0], bestScore = -1;
  for(var i = 0; i < tg.length; i++){
    var sc = 1;
    for(var j = 0; j < tg.length; j++){
      if(i === j) continue;
      if(Math.abs(tg[j].worldX - tg[i].worldX) <= 12) sc++;
    }
    var dist = Math.abs(tg[i].worldX - p.worldX);
    var score = sc * 1000 - dist;
    if(score > bestScore){ bestScore = score; best = tg[i]; }
  }
  return best;
}

/* ⑥ 击杀辅助 */
function _p28KillTarget(target, wid, c){
  var eName = (typeof ENEMIES !== 'undefined' && ENEMIES[target.eid]) ? ENEMIES[target.eid].name : target.eid;
  var wn = { '2a46':'125mm 主炮','2a46m1':'125mm 主炮','2a70':'100mm 主炮','2a28':'73mm 主炮','2a42':'30mm 機炮','2a72':'30mm 機炮','kpvt':'14.5mm KPVT','nsvt':'12.7mm NSVT','pkt':'7.62mm PKT','atgm':'ATGM' }[wid] || wid.toUpperCase();
  if(typeof pushLog === 'function') pushLog('<span class="run">' + wn + '</span> 擊殺 <b class="r-' + target.rarity + '">' + eName + '</b>', [], 'explore');
  if(window.BTRSupport){
    window.BTRSupport.killCount = (window.BTRSupport.killCount || 0) + 1;
    if(!window.BTRSupport.kills) window.BTRSupport.kills = {};
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
          window._explore.corpses.push({ wrap:wEl, drawW:rc.drawW, drawH:rc.drawH, worldX:window._explore.worldX + (target.worldX - c.allies[0].worldX) });
        }
      }
    }
  } catch(e){}
}

/* ⑦ _onBTRFire：HE/ATGM 直接扣 HP */

window._pickBTRTarget = function(wid, syncGroup){
  var c = window._combat;
  if(!c || !c.active || c.resolved || c.sceneType !== 'vehicle') return null;
  var p = c.allies[0];
  if(!p || !p.isVehicle) return null;
  var alive = [];
  for(var i = 0; i < c.enemies.length; i++) if(c.enemies[i].hp > 0 && c.enemies[i].worldX > p.worldX) alive.push(c.enemies[i]);
  if(!alive.length) return null;
  var r = (typeof VEHICLE_RANGE_M !== 'undefined' && VEHICLE_RANGE_M[wid]) || 300;
  if(typeof hasCrewTalent === 'function' && hasCrewTalent('commander', 'commander_sense')) r *= 1.15;
  var tg = [];
  for(var a = 0; a < alive.length; a++) if(Math.abs(alive[a].worldX - p.worldX) <= r) tg.push(alive[a]);
  if(!tg.length) return null;
  if(syncGroup !== 'main'){
    var _mainSync = window._btrSyncTargets && window._btrSyncTargets['main'];
    if(_mainSync && _mainSync.hp > 0 && tg.indexOf(_mainSync) >= 0) return _mainSync;
  }
  if(syncGroup && window._btrSyncTargets){
    var _st = window._btrSyncTargets[syncGroup];
    if(_st && _st.hp > 0 && tg.indexOf(_st) >= 0) return _st;
  }
  var bd = function(x, y){ return Math.abs(x.worldX - p.worldX) - Math.abs(y.worldX - p.worldX); };
  var isSplashWid = (wid === '2a70' || wid === '2a28' || wid === '2a46' || wid === '2a46m1');
  if(wid === 'atgm'){
    tg.sort(function(a, b){ return Math.abs(b.worldX - p.worldX) - Math.abs(a.worldX - p.worldX); });
    return tg[0];
  }
  if(isSplashWid) return _p28PickDensest(tg, p);
  if(c.playerFirst){
    var rpg = [];
    for(var r2 = 0; r2 < tg.length; r2++) if(tg[r2].hasRPG && tg[r2].rpgAmmo > 0) rpg.push(tg[r2]);
    rpg.sort(bd);
    if(rpg.length) return rpg[0];
    tg.sort(bd);
    return tg[0];
  }
  tg.sort(bd);
  return tg[0];
};

window._onBTRFire = function(wid, now, syncGroup, preselectedTarget){
  var c = window._combat;
  if(!c || !c.active || c.resolved || c.sceneType !== 'vehicle') return false;
  var p = c.allies[0];
  if(!p || !p.isVehicle) return false;
  var alive = [];
  for(var i = 0; i < c.enemies.length; i++) if(c.enemies[i].hp > 0 && c.enemies[i].worldX > p.worldX) alive.push(c.enemies[i]);

  var target = null;
  var _preselectedDead = false;
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

  // 扣彈藥
  var _ammoObj = state.vehicleAmmo && state.vehicleAmmo[p.vehicleId] && state.vehicleAmmo[p.vehicleId][wid];
  var _usedAmmoId = null;
  if(_ammoObj && _ammoObj.breakdown){
    var MAIN_A = {
      '2a46':[{id:'3bm42',type:'ap'},{id:'3of26',type:'he'},{id:'3bk29',type:'heat'}],
      '2a46m1':[{id:'3bm42',type:'ap'},{id:'3of26',type:'he'},{id:'3bk29',type:'heat'}],
      '2a70':[{id:'100he',type:'he'}],
      '2a28':[{id:'73heat',type:'heat'},{id:'73hefrag',type:'he'}]
    };
    var defsA = MAIN_A[wid] || [];
    var orderA = alive.length >= 2 ? ['he','heat','ap'] : ['ap','heat','he'];
    for(var oiA = 0; oiA < orderA.length && !_usedAmmoId; oiA++){
      for(var diA = 0; diA < defsA.length; diA++){
        if(defsA[diA].type === orderA[oiA] && (_ammoObj.breakdown[defsA[diA].id] || 0) > 0){ _usedAmmoId = defsA[diA].id; break; }
      }
    }
    if(_usedAmmoId){ _ammoObj.breakdown[_usedAmmoId] = Math.max(0, (_ammoObj.breakdown[_usedAmmoId] || 0) - 1); _ammoObj.current = Math.max(0, (_ammoObj.current || 0) - 1); }
  } else if(_ammoObj){
    _ammoObj.current = Math.max(0, (_ammoObj.current || 0) - 1);
  }

  if(_preselectedDead) return true;

  var g = (function(){ var cr = state.station && state.station.crew; if(!cr || !cr.gunner) return null; for(var i = 0; i < state.servants.length; i++) if(state.servants[i].id === cr.gunner) return state.servants[i]; return null; })();
  var _gLv = g ? (g.lv || 1) : 1;
  var _vehBase = (window.VEHICLE_BASE_HR && window.VEHICLE_BASE_HR[p.vehicleId]) || 50;
  var hr = _vehBase + (_gLv - 1) * 0.8;
  if(g && Array.isArray(g.talents) && g.talents.indexOf('gunner_mastery') >= 0) hr += 10 + (_gLv - 1) * 0.15;
  if(!c.playerFirst) hr = hr * 0.8;
  if(hr > 95) hr = 95;
  if(hr < 0) hr = 0;

  var WD = { kpvt:60, pkt:40, nsvt:50, '2a72':200, '2a42':200, '2a28':400, '2a70':800, '2a46':800, '2a46m1':850, atgm:1000 };
  var baseDmg = WD[wid] || 60;
  var penMM = 0;
  if(window.VEHICLE_BELT_RHA && VEHICLE_BELT_RHA[wid]) penMM = VEHICLE_BELT_RHA[wid];
  else if(_ammoObj && _ammoObj.breakdown && _usedAmmoId && window.VEHICLE_AMMO_RHA) penMM = VEHICLE_AMMO_RHA[_usedAmmoId] || 15;
  else if(window.VEHICLE_AMMO_RHA) penMM = VEHICLE_AMMO_RHA[wid] || 15;
  if(!penMM) penMM = 20;

  var isHE = (_usedAmmoId === '100he' || _usedAmmoId === '3of26' || _usedAmmoId === '73hefrag');
  var isATGM = (wid === 'atgm');
  var ignoreArmor = isHE || isATGM;
  var dmg = baseDmg * 5.0 * 1.5;
  var critRate = 0.4, critMult = 5.0;
  var crit = Math.random() < critRate;
  var finalDmg = crit ? dmg * critMult : dmg;

  if(Math.random() * 100 >= hr){
    if(typeof _float === 'function') _float(target, 'MISS', 'miss');
  } else {
    var sh = 0;
    if(ignoreArmor){
      var _hpLoss = Math.round(finalDmg);
      target.hp = Math.max(0, target.hp - _hpLoss);
      sh = _hpLoss;
    } else {
      var res = window.applyDamage ? window.applyDamage(target, finalDmg, penMM, target.armorLevel || 0) : {hpLost:finalDmg, armorLost:0};
      sh = (res.hpLost || 0) + (res.armorLost || 0);
    }
    if(typeof _float === 'function') _float(target, '-' + Math.round(sh) + (crit ? '!' : ''), crit ? 'crit' : '');
    if(target.hp <= 0) _p28KillTarget(target, wid, c);
    var SPLASH_WIDS = { '2a46':1, '2a46m1':1, '2a70':1, '2a28':1 };
    if(SPLASH_WIDS[wid]){
      var splashRange = 4.0;
      for(var si = 0; si < alive.length; si++){
        var se = alive[si];
        if(se === target || se.hp <= 0) continue;
        var sd = Math.abs(se.worldX - target.worldX);
        if(sd <= splashRange){
          var sDmg = Math.round(finalDmg * 0.8);
          var ssh = 0;
          if(ignoreArmor){ se.hp = Math.max(0, se.hp - sDmg); ssh = sDmg; }
          else {
            var sres = window.applyDamage ? window.applyDamage(se, sDmg, penMM * 0.8, se.armorLevel || 0) : {hpLost:sDmg, armorLost:0};
            ssh = (sres.hpLost || 0) + (sres.armorLost || 0);
          }
          if(typeof _float === 'function') _float(se, '-' + Math.round(ssh), '');
          if(se.hp <= 0) _p28KillTarget(se, wid, c);
        }
      }
    }
  }
  return true;
};;;
;

/* ⑩ 让电台按钮走新弹窗 */
window._radioTriggerBTR = function(){
  window._radioShowConfirm();
};

})();


/* ==== 20-radio-fix.js（原） ==== */


(function(){
'use strict';

function _fmtNum(n){ if(n == null || isNaN(n)) return '0'; const v = Math.floor(Math.abs(n)); const sign = n < 0 ? '-' : ''; if(v < 10000) return sign + v; if(v < 1000000) return sign + Math.round(v / 1000) + 'K'; if(v < 10000000) return sign + (v / 1000000).toFixed(1) + 'M'; return sign + Math.round(v / 1000000) + 'M'; }

function installOverrides(){
  if(window._p37Installed) return;
  window._p37Installed = true;

  window.vcEstimateCallCost = function(v){
    var lo = (typeof VEHICLE_LOADOUT !== 'undefined' && VEHICLE_LOADOUT[v]) || (typeof _buildLoadoutFallback === 'function' ? _buildLoadoutFallback(v) : null);
    if(!lo) return {full:0, have:0, diff:0};
    var COST = { pkt:375, nsvt:300, kpvt:250, '2a42':1000, '2a72':800, '2a28':40, '2a70':80, '2a46':150, '2a46m1':150, atgm:400 };
    var ROUNDS = { pkt:250, nsvt:100, kpvt:50, '2a42':100, '2a72':100 };
    var full = 0, have = 0;
    for(var wid in lo){
      var c = lo[wid];
      var per = (typeof VEHICLE_BELT_ROUNDS !== 'undefined' && VEHICLE_BELT_ROUNDS[wid]) || ROUNDS[wid] || 1;
      var unit = (typeof VEHICLE_BELT_COST !== 'undefined' && VEHICLE_BELT_COST[wid]) || COST[wid] || 1;
      var a = state.vehicleAmmo && state.vehicleAmmo[v] && state.vehicleAmmo[v][wid];
      var fr;
      if(c.belts){
        fr = c.belts * c.perBelt;
      } else if(a && (a.presetBreakdown || a.breakdown)){
        var _srcV = a.presetBreakdown || a.breakdown;
        var _bs = 0;
        for(var _bk in _srcV) _bs += (_srcV[_bk] || 0);
        fr = _bs;
      } else {
        fr = c.rounds || 0;
      }
      full += (fr / per) * unit;
      var ac = fr;
      if(a && typeof a.current === 'number'){
        ac = a.current;
      }
      have += (ac / per) * unit;
    }
    return {full: Math.round(full), have: Math.round(have), diff: Math.round(Math.max(0, full - have))};
  };

  window._radioShowConfirm = function(){
    var g = (typeof _garageInitState === 'function') ? _garageInitState() : null;
    var vid = g ? g.currentVehicle : 'btr80';
    var cost = (typeof vcEstimateCallCost === 'function') ? vcEstimateCallCost(vid) : {full:0,have:0,diff:0};
    var avail = (typeof vcAmmoEquivTotal === 'function') ? vcAmmoEquivTotal() : 0;
    var dmg = (state.vehicleDamage && state.vehicleDamage[vid]) || null;
    var repairing = dmg && dmg.repairUntil > Date.now();
    var repairRemainMin = repairing ? Math.ceil((dmg.repairUntil - Date.now()) / 60000) : 0;
    var st = state.station || {};
    var crew = st.crew || {};
    var crewLabels = (typeof CREW_LABELS !== 'undefined') ? CREW_LABELS : { commander:'車長', gunner:'炮手', driver:'駕駛' };
    var crewRoles = (typeof CREW_ROLES !== 'undefined') ? CREW_ROLES : ['commander','gunner','driver'];
    var crewIssues = [];
    var crewSrv = {};
    for(var i = 0; i < crewRoles.length; i++){
      var role = crewRoles[i];
      var sid = crew[role];
      if(!sid){ crewIssues.push({ role: role, label: crewLabels[role], reason: '空缺' }); continue; }
      var srv = null;
      for(var j = 0; j < (state.servants||[]).length; j++) if(state.servants[j].id === sid){ srv = state.servants[j]; break; }
      if(!srv){ crewIssues.push({ role: role, label: crewLabels[role], reason: '僕人不存在' }); continue; }
      crewSrv[role] = srv;
      if(srv.injuredUntil && srv.injuredUntil > Date.now()){
        crewIssues.push({ role: role, label: crewLabels[role], reason: '重傷 ' + Math.ceil((srv.injuredUntil - Date.now())/60000) + ' 分鐘' });
      }
    }
    var injuredPassengers = [];
    var passengers = st.passengers || [];
    for(var pi = 0; pi < passengers.length; pi++){
      var p = passengers[pi];
      var ps = null;
      for(var jj = 0; jj < (state.servants||[]).length; jj++) if(state.servants[jj].id === p.srvId){ ps = state.servants[jj]; break; }
      if(!ps) continue;
      if(ps.injuredUntil && ps.injuredUntil > Date.now()){
        injuredPassengers.push({ srv: ps, remainMin: Math.ceil((ps.injuredUntil - Date.now())/60000) });
      }
    }
    var canSummon = !repairing && crewIssues.length === 0 && avail + 0.01 >= cost.diff;
    var healer = null;
    var healerList = ['ifak','salewa','surv12','ai2'];
    for(var hk = 0; hk < healerList.length; hk++){
      for(var invK in state.inventory){
        var invP = invK.split('@');
        if(invP[0] === healerList[hk] && state.inventory[invK] > 0){ healer = { id: invP[0], rarity: invP[1] }; break; }
      }
      if(healer) break;
    }
    var hasInjured = crewIssues.length > 0 || injuredPassengers.length > 0;
    var canHeal = hasInjured && !!healer;
    var repairCost = { metal: 50, gears: 20, screws: 20 };
    var canRepair = repairing && (typeof _gardenMerchantCanPay === 'function' ? _gardenMerchantCanPay(repairCost) : false);
    var body = '';
    body += '<div style="font-size:11px;color:#e8a33d;font-weight:bold;margin-bottom:6px">彈藥消耗</div>';
    body += '<div style="display:flex;justify-content:space-between;font-size:11px;color:#a89a85;padding:2px 0"><span>需要</span><span>' + _fmtNum(cost.diff) + ' 等值</span></div>';
    body += '<div style="display:flex;justify-content:space-between;font-size:11px;color:#a89a85;padding:2px 0"><span>可用</span><span style="color:' + (avail >= cost.diff ? '#4caf50' : '#e05252') + '">' + _fmtNum(avail) + ' 等值</span></div>';
    body += '<div class="divider"></div>';
    if(repairing){
      body += '<div style="font-size:11px;color:#e05252;font-weight:bold;padding:4px 0">載具維修中（剩 ' + repairRemainMin + ' 分鐘）</div>';
      body += '<div style="display:flex;gap:6px;margin:6px 0">';
      body += '<button class="btn" id="_p37_repair" ' + (canRepair ? '' : 'disabled') + ' style="flex:1;padding:6px;font-size:11px">修復</button>';
      body += '</div>';
      body += '<div class="divider"></div>';
    }
    body += '<div style="font-size:11px;color:#e8a33d;font-weight:bold;margin-bottom:4px">車組</div>';
    for(var ci = 0; ci < crewRoles.length; ci++){
      var cr = crewRoles[ci];
      var cs = crewSrv[cr];
      var issue = null;
      for(var ii = 0; ii < crewIssues.length; ii++) if(crewIssues[ii].role === cr){ issue = crewIssues[ii]; break; }
      var txt = cs ? ((typeof servantLabel === 'function' ? servantLabel(cs) : cs.id) + ' Lv.' + cs.lv) : '（未指派）';
      var status = issue ? '<span style="color:#e05252">' + issue.reason + '</span>' : '<span style="color:#4caf50">正常</span>';
      body += '<div style="display:flex;justify-content:space-between;font-size:11px;padding:2px 0"><span>' + crewLabels[cr] + ' ' + txt + '</span>' + status + '</div>';
    }
    if(injuredPassengers.length){
      body += '<div style="font-size:11px;color:#e8a33d;font-weight:bold;margin:8px 0 4px">載員重傷</div>';
      for(var ip = 0; ip < injuredPassengers.length; ip++){
        var ips = injuredPassengers[ip];
        body += '<div style="display:flex;justify-content:space-between;font-size:11px;padding:2px 0"><span>' + (typeof servantLabel === 'function' ? servantLabel(ips.srv) : ips.srv.id) + '</span><span style="color:#e05252">' + ips.remainMin + ' 分鐘</span></div>';
      }
    }
    if(hasInjured){
      body += '<div style="display:flex;gap:6px;margin:6px 0">';
      body += '<button class="btn" id="_p37_heal" ' + (canHeal ? '' : 'disabled') + ' style="flex:1;padding:6px;font-size:11px">治療</button>';
      body += '</div>';
    }
    if(crewIssues.length > 0) body += '<div style="font-size:11px;color:#e05252;padding:6px 0">車組不完整，無法召喚</div>';
    if(repairing) body += '<div style="font-size:11px;color:#e05252;padding:0 0 6px">載具維修中，無法召喚</div>';
    if(avail < cost.diff) body += '<div style="font-size:11px;color:#e05252;padding:0 0 6px">彈藥不足，無法召喚</div>';
    var ft = document.createElement('div');
    ft.className = 'modal-ft';
    ft.innerHTML = '<button class="btn primary" id="_p37_confirm" ' + (canSummon ? '' : 'disabled') + '>召喚</button>';
    var bd = openModal({ title: '召喚載具', body: body, footer: ft });
    var healBtn = bd.querySelector('#_p37_heal');
    if(healBtn) healBtn.onclick = function(){
      if(!healer) return;
      invRemove(healer.id, healer.rarity, 1);
      for(var ci = 0; ci < crewRoles.length; ci++){
        var cs = crewSrv[crewRoles[ci]];
        if(cs){ cs.injuredUntil = 0; cs.hp = (typeof servantMaxHp === 'function') ? servantMaxHp(cs) : (cs.maxHp||100); }
      }
      for(var ii = 0; ii < injuredPassengers.length; ii++){
        injuredPassengers[ii].srv.injuredUntil = 0;
        injuredPassengers[ii].srv.hp = (typeof servantMaxHp === 'function') ? servantMaxHp(injuredPassengers[ii].srv) : 100;
      }
      save(); closeModal(); window._radioShowConfirm();
    };
    var repairBtn = bd.querySelector('#_p37_repair');
    if(repairBtn) repairBtn.onclick = function(){
      if(!canRepair) return;
      if(typeof _gardenMerchantTryPay === 'function') _gardenMerchantTryPay(repairCost);
      if(dmg){ dmg.repairUntil = 0; dmg.destroyed = false; dmg.disabled = false; }
      save(); closeModal(); window._radioShowConfirm();
    };
    var confirmBtn = ft.querySelector('#_p37_confirm');
    if(confirmBtn) confirmBtn.onclick = function(){
      if(!canSummon) return;
      if(typeof _radioTryConsume === 'function') _radioTryConsume();
      closeModal();
      if(typeof window._radioBTRTrigger === 'function') window._radioBTRTrigger();
    };
  };

  window._radioTriggerBTR = function(){ window._radioShowConfirm(); };
}

if(document.readyState === 'complete'){ installOverrides(); }
else { window.addEventListener('load', installOverrides); }

function healAllCrew(){
  var h = null;
  var hl = ['ifak','salewa','surv12','ai2'];
  for(var hk=0; hk<hl.length; hk++){
    for(var ik in state.inventory){
      if(ik.indexOf(hl[hk]+'@')===0 && state.inventory[ik]>0){ var ip = ik.split('@'); h = {id:ip[0],rarity:ip[1]}; break; }
    }
    if(h) break;
  }
  if(!h){ if(typeof notify==='function') notify('沒有醫療品','warn'); return; }
  invRemove(h.id, h.rarity, 1);
  var crew = state.station && state.station.crew;
  if(crew){
    for(var r in crew){
      if(!crew[r]) continue;
      var srv = state.servants.find(function(x){ return x.id===crew[r]; });
      if(srv){ srv.injuredUntil = 0; srv.hp = (typeof servantMaxHp==='function') ? servantMaxHp(srv) : 100; }
    }
  }
  save();
  if(typeof openStationPage === 'function') openStationPage();
}

function healAllPassengers(){
  var h = null;
  var hl = ['ifak','salewa','surv12','ai2'];
  for(var hk=0; hk<hl.length; hk++){
    for(var ik in state.inventory){
      if(ik.indexOf(hl[hk]+'@')===0 && state.inventory[ik]>0){ var ip = ik.split('@'); h = {id:ip[0],rarity:ip[1]}; break; }
    }
    if(h) break;
  }
  if(!h){ if(typeof notify==='function') notify('沒有醫療品','warn'); return; }
  invRemove(h.id, h.rarity, 1);
  var ps = state.station && state.station.passengers;
  if(ps){
    for(var i=0;i<ps.length;i++){
      (function(pp){
        var srv = state.servants.find(function(x){ return x.id===pp.srvId; });
        if(srv){ srv.injuredUntil = 0; srv.hp = (typeof servantMaxHp==='function') ? servantMaxHp(srv) : 100; }
      })(ps[i]);
    }
  }
  save();
  if(typeof openStationPage === 'function') openStationPage();
}



})();


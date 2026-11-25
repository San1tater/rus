/* rev-pen-chain: 內部抽籤與縱向可達遮罩已廢 —— 命中誰由部件盒與射線求交決定。 */

'use strict';

/* rev-fix-station-snapshot: 支援中讀快照，外部修改（車站/車庫）不影響當前戰鬥 */
window._getLiveStation = function(){
  const b = window.BTRSupport;
  if(b && b.active && b._snap) return b._snap;
  return state.station || { crew:{}, passengers:[] };
};
window._getLiveVehicleAmmo = function(vid){
  const b = window.BTRSupport;
  if(b && b.active && b._ammoSnap && b._ammoSnap[vid]) return b._ammoSnap[vid];
  return state.vehicleAmmo && state.vehicleAmmo[vid];
};
/* rev-fix-turret-wids-module: 炮塔武器表 —— 唯一真相源，_isVehicleWeaponUsable 与 _vHitVehicle 共用 */
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
  bmp3m:  { '2a70':1, '2a72':1, pkt:1 },
  bmp3a: { '2a70':1, '2a72':1, pkt:1 },
  t80:    { '2a46':1, pkt:1 },
  t80b:   { '2a46':1, pkt:1 },
  t80bv:  { '2a46':1, pkt:1 },
  t80u:   { '2a46m1':1, pkt:1 },
  t80uk:  { '2a46m1':1, pkt:1 },
  t80um:  { '2a46m1':1, pkt:1 }
};

window._isWeaponHpAlive = function(vid, wid){
  const dmg = state.vehicleDamage && state.vehicleDamage[vid];
  if(!dmg || !dmg.weapons) return true;
  const w = dmg.weapons[wid];
  if(!w) return true;
  return w.hp > 0;
};

/* rev-fix-weapon-usable: 單武器可用性（武器 HP + 炮塔卡死 + 車組全滅 + 彈藥） */
window._isVehicleWeaponUsable = function(wid, vid){
  if(!wid || !vid) return false;
  const dmg = state.vehicleDamage && state.vehicleDamage[vid];
  if(!dmg) return true;
  if(dmg.destroyed) return false;
  if(!window._isWeaponHpAlive(vid, wid)) return false;
  const turretW = TURRET_WEAPONS_BY_VID[vid] || {};
  if(turretW[wid] && dmg.parts && dmg.parts.turret <= 0) return false;
  if(dmg.members && dmg.members.gunner <= 0 && dmg.members.commander <= 0) return false;
  return true;
};

/* rev-7part: 按車型分佈，反映正面投影比例（含履帶/車輪歸入 hullLowerFront/hullSide） */
const _VEHICLE_PART_PROB_BY_VID = {
  /* ═══ MBT（T-80 系）：炮塔正面最大 ═══ */
  t80:   [
    { key:'turretFront',    w:36 }, { key:'hullUpperFront', w:24 }, { key:'hullLowerFront', w:28 },
    { key:'turretSide',     w:10 }, { key:'hullSide',       w:1  },
    { key:'hullRear',       w:0.5}, { key:'turretRear',     w:0.5}
  ],
  /* ═══ BTR 系列（輪式）：首上最大，輪胎拆到首下/側面 ═══ */
  btr80:  [
    { key:'hullUpperFront', w:38 }, { key:'hullLowerFront', w:30 }, { key:'turretFront', w:10 },
    { key:'turretSide',     w:3  }, { key:'hullSide',       w:15 },
    { key:'hullRear',       w:2  }, { key:'turretRear',     w:2  }
  ],
  /* ═══ BMP 系列（履帶步戰，單人/雙人炮塔） ═══ */
  bmp1:   [
    { key:'hullUpperFront', w:36 }, { key:'hullLowerFront', w:26 }, { key:'turretFront', w:18 },
    { key:'turretSide',     w:5  }, { key:'hullSide',       w:12 },
    { key:'hullRear',       w:1.5}, { key:'turretRear',     w:1.5}
  ],
  /* ═══ BMP-3 / BMD-4（雙人炮塔，炮塔占比更高） ═══ */
  bmp3:   [
    { key:'hullUpperFront', w:32 }, { key:'hullLowerFront', w:24 }, { key:'turretFront', w:22 },
    { key:'turretSide',     w:7  }, { key:'hullSide',       w:12 },
    { key:'hullRear',       w:1.5}, { key:'turretRear',     w:1.5}
  ]
};
/* 同族車型共用 */
_VEHICLE_PART_PROB_BY_VID.t80b  = _VEHICLE_PART_PROB_BY_VID.t80;
_VEHICLE_PART_PROB_BY_VID.t80bv = _VEHICLE_PART_PROB_BY_VID.t80;
_VEHICLE_PART_PROB_BY_VID.t80u  = _VEHICLE_PART_PROB_BY_VID.t80;
_VEHICLE_PART_PROB_BY_VID.t80uk = _VEHICLE_PART_PROB_BY_VID.t80;
_VEHICLE_PART_PROB_BY_VID.t80um = _VEHICLE_PART_PROB_BY_VID.t80;
_VEHICLE_PART_PROB_BY_VID.btr80a  = _VEHICLE_PART_PROB_BY_VID.btr80;
_VEHICLE_PART_PROB_BY_VID.btr82   = _VEHICLE_PART_PROB_BY_VID.btr80;
_VEHICLE_PART_PROB_BY_VID.btr82a  = _VEHICLE_PART_PROB_BY_VID.btr80;
_VEHICLE_PART_PROB_BY_VID.btr90   = _VEHICLE_PART_PROB_BY_VID.btr80;
_VEHICLE_PART_PROB_BY_VID.bmp1m   = _VEHICLE_PART_PROB_BY_VID.bmp1;
_VEHICLE_PART_PROB_BY_VID.bmp2    = _VEHICLE_PART_PROB_BY_VID.bmp1;
_VEHICLE_PART_PROB_BY_VID.bmd4    = _VEHICLE_PART_PROB_BY_VID.bmp3;
_VEHICLE_PART_PROB_BY_VID.bmp3m   = _VEHICLE_PART_PROB_BY_VID.bmp3;
_VEHICLE_PART_PROB_BY_VID.bmp3a   = _VEHICLE_PART_PROB_BY_VID.bmp3;

function _getPartProbForVid(vid){
  return _VEHICLE_PART_PROB_BY_VID[vid] || _VEHICLE_PART_PROB_BY_VID.t80;
}


const _VEHICLE_MAIN_AMMO = {
  '2a46':   [{ id: '3bm42', type: 'ap' }, { id: '3of26', type: 'he' }, { id: '3bk29', type: 'heat' }, { id: '9m112', type: 'gl_atgm' }],
  '2a46m1': [{ id: '3bm42', type: 'ap' }, { id: '3of26', type: 'he' }, { id: '3bk29', type: 'heat' }, { id: '9m119m', type: 'gl_atgm' }],
  '2a70':   [{ id: '3uof17', type: 'he' }, { id: '9m117m1', type: 'gl_atgm' }],
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
/* rev-fix-splash-v2 *//* rev-frag-explosion: 載具濺射參數 —— 只留幾何與引信。
   fragKey → AMMO_FRAG（破片物理）；maxR = 破片飛散極限；burstHeight = 引信爆高。
   blastPen / splashRatio / mainR 已廢：前兩者是预算分配的 fudge，
   mainR 是舊面積模型的死欄位（現行程式碼從未讀取）。 */
const VEHICLE_SPLASH = {
  '3of26':       { fragKey:'3of26',    maxR:20, burstHeight:0 },
  '3of26_ainet': { fragKey:'3of26',    maxR:34, burstHeight:4 },
  '3uof17':      { fragKey:'3uof17',   maxR:18, burstHeight:0 },
  'og15v':       { fragKey:'og15v',    maxR:14, burstHeight:0 },
  '3bk29':       { fragKey:'3bk29',    maxR:12, burstHeight:0 },
  'pg15v':       { fragKey:'pg15v',    maxR:9,  burstHeight:0 },
  '9m14':        { fragKey:'9m14',     maxR:11, burstHeight:0 },
  '9m113':       { fragKey:'9m113',    maxR:11, burstHeight:0 },
  '9m112':       { fragKey:'9m112',    maxR:11, burstHeight:0 },
  '9m119m':      { fragKey:'9m119m',   maxR:12, burstHeight:0 },
  '9m117m1':     { fragKey:'9m117m1',  maxR:12, burstHeight:0 },
  '30mm_hef':    { fragKey:'30mm_hef', maxR:5,  burstHeight:0 }
};


function _getVehicleSplashParams(wid, usedAmmoId, mixIsHE, preset, ainetActive){
  /* rev-ainet: T-80UK 的 3OF26 走 Ainet 参数表 */
  if(ainetActive && usedAmmoId === '3of26') return VEHICLE_SPLASH['3of26_ainet'];
  if(usedAmmoId && VEHICLE_SPLASH[usedAmmoId]) return VEHICLE_SPLASH[usedAmmoId];
  if((wid === '2a42' || wid === '2a72') && (mixIsHE === true || preset === '高爆')) return VEHICLE_SPLASH['30mm_hef'];
  return null;
}

/* rev-splash-area: 面积法 + 3D dy。impactWorldX 由 caller 传入（含散射），不再是 mainTarget.worldX。
 * 敌人矩形 0.5×1.7，5 采样点（4 角 + 中心），覆盖率 = 球内点数 / 5。
 * 距离 d = sqrt(dx² + dy²)，dy = enemy_y - burstHeight。
 * mainR 内吃满伤 + 直击穿深；mainR~maxR 吃衰减伤 + blastPen。 */
/* rev-box3d: 載具濺射改走統一覆蓋引擎 —— 刪除 5 點圓內採樣與單點隨機部位。
   直擊 = 弹丸落在包圍盒內（_hitCtx.isDirect），不再用 mainR 圓判定。
   邊緣距離 falloff；空爆 burstHeight 由角度自然反映（頂部帶吃更多）。 */
function _applyVehicleSplash(sp, impactWorldX, wid, usedAmmoId, directTarget){
  /* rev-frag-explosion: 濺射 = 破片射線組，不是預算分配。
     直擊本身由 _onBTRFire 以全額傷害 + 完整穿深結算，此處只負責其他單位。
     射失不再乘 0.6 —— 落點偏移已經表達了射失，再打折是雙重懲罰。 */
  const c = window._combat;
  const ex = window._explore;
  if(!c || !sp) return;
  const spec = (typeof window._ammoFrag === 'function') ? window._ammoFrag(sp.fragKey) : null;
  if(!spec) return;
  const ctx = window._hitCtx;
  const _hasDirect = !!(directTarget && ctx && ctx.isDirect && typeof ctx.x === 'number');
  const P = _hasDirect
    ? { x: ctx.x, y: ctx.y, z: (typeof ctx.z === 'number') ? ctx.z : 0 }
    : { x: impactWorldX, y: (typeof sp.burstHeight === 'number') ? sp.burstHeight : 0,
        z: (ctx && typeof ctx.z === 'number') ? ctx.z : 0 };
  const _crit = { rate: _VEHICLE_CRIT_RATE, mult: _VEHICLE_CRIT_MULT };
  const _chgW = (typeof window._blastChargeKg === 'function') ? window._blastChargeKg(sp.fragKey) : 0;
  const targets = [];
  for(let i = 0; i < c.enemies.length; i++){
    const en = c.enemies[i];
    if(!en || en.hp <= 0 || en === directTarget) continue;
    targets.push({ enemy: en, type: 'current' });
  }
  if(ex && ex.nodes){
    for(let ni = 0; ni < ex.nodes.length; ni++){
      const node = ex.nodes[ni];
      for(let ei = 0; ei < node.events.length; ei++){
        const ev = node.events[ei];
        if(ev.cleared || ev.type !== 'combat' || !ev.content) continue;
        for(let j = 0; j < ev.content.length; j++){
          const en = ev.content[j];
          if(!en || en.hp <= 0 || en === directTarget) continue;
          let dup = false;
          for(let k = 0; k < c.enemies.length; k++){ if(c.enemies[k] === en){ dup = true; break; } }
          if(dup) continue;
          window._setEnemyEvent(en, ev);
          targets.push({ enemy: en, type: 'event', event: ev });
        }
      }
    }
  }
  for(let ti = 0; ti < targets.length; ti++){
    const t = targets[ti];
    const enemy = t.enemy;
    let res;
    if(enemy.isBoss){
      /* Boss 走統一管線；破片暴擊已由引擎逐片擲，此處傳 false 避免雙重。 */
      res = window._applyExplosionToBox(enemy, P, {
        fragments: spec.frags, fragEff: spec.eff, pen: spec.pen, maxR: sp.maxR, crit: _crit,
        chargeKg: _chgW,
        applyBlast: function(d){
          if(typeof battle !== 'undefined' && battle){ battle.bossHp = Math.max(0, Math.round(battle.bossHp - d)); battle.damageDealt += d; }
        },
        applyBand: function(part, dmg, pen){
          if(typeof applyBossDamage !== 'function') return { hpLost:0, armorLost:0 };
          var r = applyBossDamage(dmg, false, pen, false, true, false, part);
          if(typeof isBossType === 'function' && typeof battle !== 'undefined' && battle
             && isBossType(battle.bossId, 'omega') && battle.arms && typeof damageOmegaArm === 'function'){
            damageOmegaArm(part, dmg);
          }
          return r || { hpLost:0, armorLost:0 };
        }
      });
    } else {
      const proxy = { hp: enemy.hp, armor: enemy.armor || 0 };
      res = window._applyExplosionToBox(enemy, P, {
        fragments: spec.frags, fragEff: spec.eff, pen: spec.pen, maxR: sp.maxR, crit: _crit,
        chargeKg: _chgW,
        applyBlast: function(d){ proxy.hp = Math.max(0, Math.round(proxy.hp - d)); },
        applyBand: function(part, dmg, pen){
          return applyDamage(proxy, dmg, pen, { part: part, armorProvider: function(p){
            return (typeof getEnemyArmorMMForPart === 'function') ? getEnemyArmorMMForPart(enemy, p) : 0;
          } });
        }
      });
      enemy.hp = proxy.hp;
      if(enemy.armor !== undefined) enemy.armor = proxy.armor;
    }
    if(!res || (res.hpLost <= 0 && res.armorLost <= 0)) continue;
    const shown = res.hpLost > 0 ? res.hpLost : res.armorLost;
    if(enemy.isBoss){
      if(typeof spawnHitFx === 'function') spawnHitFx('boss', 0, '-' + Math.round(shown), res.hpLost > 0 ? '' : 'armor');
    } else {
      _vehicleCombatFloat(enemy.worldX, '-' + Math.round(shown), res.hpLost > 0 ? 'enemy' : 'armor');
    }
    if(enemy.hp <= 0){
      _onBTRKillTarget(enemy, wid, c, usedAmmoId);
      if(t.type === 'event' && t.event && typeof window._settleVehicleEventIfCleared === 'function'){
        window._settleVehicleEventIfCleared(enemy);
      }
    }
  }
}
window._vehicleWeaponsDead = function(){
  /* rev-fix-weapon-hp-dead-v2: 每把武器 HP + 炮塔卡死 + 彈藥判定 */
  const vid = window._activeVehicleId();
  const dmg = state.vehicleDamage && state.vehicleDamage[vid];
  if(!dmg) return false;
  if(dmg.destroyed) return true;
  if(dmg.members && dmg.members.gunner <= 0 && dmg.members.commander <= 0) return true;

  const ld = (typeof _getLoadout === 'function') ? _getLoadout(vid) : null;
  if(!ld || !Object.keys(ld).length) return true;

  const turretWeapons = TURRET_WEAPONS_BY_VID[vid] || {};
  const turretDead = dmg.parts && dmg.parts.turret <= 0;
  const ammoState = (typeof window._getLiveVehicleAmmo === 'function') ? window._getLiveVehicleAmmo(vid) : (state.vehicleAmmo && state.vehicleAmmo[vid]);

  for(const wid in ld){
    /* 武器 HP 歸零 → 不可用 */
    if(!window._isWeaponHpAlive(vid, wid)) continue;
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

/* rev-ammo-stats-map: 主炮彈種 → VEHICLE_WEAPON_STATS key 映射表 */
const _AMMO_TO_WEAPON_STATS = {
  '3bm42': '2a46_apfsds',
  '3of26': '2a46_he',
  '3bk29': '2a46_heat',
  '3uof17': '2a70_he',
  'pg15v': '2a28_heat',
  'og15v': '2a28_he'
};

function _getVehicleAmmoStats(wid, ammoId){
  /* rev-gl-atgm: GL-ATGM 直接查 VEHICLE_ATGM_AMMO */
  if(ammoId && _isGLATGMId(ammoId)){
    var _glAmmo = (typeof VEHICLE_ATGM_AMMO !== 'undefined') ? VEHICLE_ATGM_AMMO[ammoId] : null;
    if(_glAmmo) return { dmg: _glAmmo.dmg, penMM: _glAmmo.penMM };
  }
  /* rev-ammo-stats-map: 主炮彈種查表 */
  if(ammoId && _AMMO_TO_WEAPON_STATS[ammoId]){
    return VEHICLE_WEAPON_STATS[_AMMO_TO_WEAPON_STATS[ammoId]];
  }
  if(wid === 'pkt') return VEHICLE_WEAPON_STATS.pkt;
  if(wid === 'kpvt'){
    const _vidK = window._activeVehicleId();
    const _liveAK = (typeof window._getLiveVehicleAmmo === 'function') ? window._getLiveVehicleAmmo(_vidK) : (state.vehicleAmmo && state.vehicleAmmo[_vidK]);
    const _aK = _liveAK && _liveAK[wid];
    if(_aK && _aK.preset === '高爆') return VEHICLE_WEAPON_STATS['kpvt_mdz'];
    return VEHICLE_WEAPON_STATS.kpvt;
  }
  if(wid === 'nsvt'){
    const _vidN = window._activeVehicleId();
    const _liveAN = (typeof window._getLiveVehicleAmmo === 'function') ? window._getLiveVehicleAmmo(_vidN) : (state.vehicleAmmo && state.vehicleAmmo[_vidN]);
    const _aN = _liveAN && _liveAN[wid];
    if(_aN && _aN.preset === '高爆') return VEHICLE_WEAPON_STATS['nsvt_md'];
    return VEHICLE_WEAPON_STATS.nsvt;
  }
  if(wid === '2a72' || wid === '2a42'){
    const vid = window._activeVehicleId();
    const _liveA2A = (typeof window._getLiveVehicleAmmo === 'function') ? window._getLiveVehicleAmmo(vid) : (state.vehicleAmmo && state.vehicleAmmo[vid]);
    const a = _liveA2A && _liveA2A[wid];
    const preset = (a && a.preset) || '穿燃';
    if(preset === '高爆') return VEHICLE_WEAPON_STATS['30mm_hef'];
    return VEHICLE_WEAPON_STATS['30mm_ap'];
  }
  if(wid === 'atgm'){
    if(ammoId && typeof VEHICLE_ATGM_AMMO !== 'undefined' && VEHICLE_ATGM_AMMO[ammoId]){
      return { dmg: VEHICLE_ATGM_AMMO[ammoId].dmg, penMM: VEHICLE_ATGM_AMMO[ammoId].penMM };
    }
    return null;
  }
  return null;
}

/* rev-fix-vehicle-float-unify: 与探索模式 _float 同构——按目标相对玩家的世界距离换算屏幕 x，
 * 载具战 screenRightWorld 约 2 m，敌人 300–500 m 外 → clamp 到 0.95（右边缘）。
 * 参数 absWorldX 统一为「绝对世界坐标」，函数内部自行减玩家 worldX 得相对值。 */
function _vehicleCombatFloat(absWorldX, text, cls){
  var c = window._combat;
  if(!c) return;
  /* rev-vfloat-canvas: 火花像素讀畫布邏輯尺寸；飄字正規化座標不變 */
  var _cvV = c.playerCanvas || document.getElementById('combat-overlay');
  var W = (typeof window._fxViewW === 'function') ? window._fxViewW(_cvV) : (_cvV ? _cvV.clientWidth : 400);
  var H = (typeof window._fxViewH === 'function') ? window._fxViewH(_cvV) : (_cvV ? _cvV.clientHeight : 500);
  var _px = c.allies[0] ? c.allies[0].worldX : 0;
  var _relWX = (typeof absWorldX === 'number') ? (absWorldX - _px) : 0;
  var _sm = c.sm || {};
  var _srw = _sm.screenRightWorld || 2;
  var sxRaw = EXPLORE_HERO_X_RATIO + (_relWX / _srw) * (1 - EXPLORE_HERO_X_RATIO);
  var _b = window._lastBullet;
  var sparkYN = 0.6;
  if(_b && typeof _b.ty === 'number' && !_b.isGrenade){ sparkYN = _b.ty; }
  /* rev-spark-bullet-only: 只有子彈直擊產生火花；RPG 直擊 / 破片 / 手雷不畫。
     目標一致性用世界座標比對 —— 排除濺射受害者沿用直擊 target 的錯位。 */
  var _sparkXN = sxRaw;
  var _hcF = window._hitCtx;
  var _sparkOK = !!(_hcF && _hcF.isDirect && _hcF.bullet
    && !_hcF.bullet.isRPG && !_hcF.bullet.isGrenade
    && _hcF.target && typeof _hcF.target.worldX === 'number'
    && typeof absWorldX === 'number' && Math.abs(_hcF.target.worldX - absWorldX) < 0.01);
  /* rev-veh-spark-edge: 火花落在實繪邊緣 + 對應高度（查表，不篩不改） */
  if(_sparkOK && _hcF.target.isVehicle && typeof window._vehicleHitScreenPos === 'function'){
    var _hpF = window._vehicleHitScreenPos(_hcF.target.vehicleId, (typeof _hcF.y === 'number') ? _hcF.y : null);
    if(_hpF){ _sparkXN = _hpF.nx; sparkYN = _hpF.ny; }
  }
  if(_sparkOK && cls !== 'miss' && cls !== 'heal' && typeof window._spawnHitSpark === 'function'){
    window._spawnHitSpark(c, _sparkXN * W, sparkYN * H, cls === 'crit', cls, false, _hcF.target);
  }
  /* 飄字：clamp x，y=0.12（與步戰 _float 完全一致）—— 位置不變 */
  var _floatX = Math.max(0.05, Math.min(0.95, sxRaw));
  c.floats.push({ text: text, cls: cls || '', age: 0, x: _floatX, y: 0.12 });
}

window._onBTRFire = function(wid, now, syncGroup, preselectedTarget){
  const c = window._combat;
  if(!c || !c.active || c.resolved || c.sceneType !== 'vehicle') return false;
  const p = c.allies[0];
  if(!p || !p.isVehicle) return false;
  /* rev-fix-weapon-usable: 炮塔卡死 / 武器 HP 歸零時該炮不能開火 */
  if(typeof window._isVehicleWeaponUsable === 'function' && !window._isVehicleWeaponUsable(wid, p.vehicleId)) return false;
  /* rev-fix-weapon-hp-fire: 保留舊檢查（防禦性） */
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

  const _liveAmmoObj = (typeof window._getLiveVehicleAmmo === 'function') ? window._getLiveVehicleAmmo(p.vehicleId) : (state.vehicleAmmo && state.vehicleAmmo[p.vehicleId]);
  const _ammoObj = _liveAmmoObj && _liveAmmoObj[wid];
  let _usedAmmoId = null;

  /* rev-gl-atgm-fix: 预装填第一发必 GL-ATGM
   * 修正前：_firstMainGunFired 在 _onBTRFire 首次调用时即置 true，
   *   但并列机枪 pkt（pauseMs:300）在支援阶段最先开火，抢走了首发射机会。
   * 修正后：按 wid 分记录，且仅主炮 + 有 GL-ATGM 配置时才消耗首发射机会。
   *   _cannonFirstShotDone 由 start() 重置为 {}。 */
  const _btr = window.BTRSupport;
  const _isMainCannon = (wid === '2a46' || wid === '2a46m1' || wid === '2a70' || wid === '2a28');
  if(_isMainCannon && _btr){
    if(!_btr._cannonFirstShotDone) _btr._cannonFirstShotDone = {};
    if(!_btr._cannonFirstShotDone[wid] && _ammoObj && _ammoObj.breakdown){
      const _glDefPre = (_VEHICLE_MAIN_AMMO[wid] || []).find(function(d){ return d.type === 'gl_atgm'; });
      if(_glDefPre && (_ammoObj.breakdown[_glDefPre.id] || 0) > 0){
        _usedAmmoId = _glDefPre.id;
        _btr._cannonFirstShotDone[wid] = true;
      }
    }
  }

  if(_ammoObj && _ammoObj.breakdown && !_usedAmmoId){
    const defsA = _VEHICLE_MAIN_AMMO[wid] || [];
    /* rev-gl-atgm: 装填时间比较决定 GL-ATGM 是否参与竞争 */
    const _glDef = defsA.find(function(d){ return d.type === 'gl_atgm'; });
    let _glParticipates = false;
    if(_glDef && (_ammoObj.breakdown[_glDef.id] || 0) > 0){
      const _mainReloadMs = (typeof MUZZLE_PROFILES !== 'undefined' && MUZZLE_PROFILES[wid] ? MUZZLE_PROFILES[wid].pauseMs : 6500);
      const _glReloadMs = (typeof GL_ATGM_RELOAD_MS !== 'undefined' && GL_ATGM_RELOAD_MS[p.vehicleId]) || 999999;
      _glParticipates = (_glReloadMs <= _mainReloadMs);
    }
    /* rev-gl-atgm: 选弹顺序 */
    const _hasArmored = alive.some(function(e){ return e.isArmored === true; });
    let _order;
    if(_hasArmored){
      _order = ['ap','heat','gl_atgm','he'];
    } else {
      const _isRPGTarget = target && target.hasRPG && target.rpgAmmo > 0;
      const _isCluster = alive.length >= 2;
      if(_isRPGTarget) _order = ['gl_atgm','he','heat','ap'];
      else if(_isCluster) _order = ['he','gl_atgm','heat','ap'];
      else _order = ['ap','heat','gl_atgm','he'];
    }
    if(!_glParticipates){
      _order = _order.filter(function(t){ return t !== 'gl_atgm'; });
    }
    for(let oiA = 0; oiA < _order.length && !_usedAmmoId; oiA++){
      for(let diA = 0; diA < defsA.length; diA++){
        if(defsA[diA].type === _order[oiA] && (_ammoObj.breakdown[defsA[diA].id] || 0) > 0){
          _usedAmmoId = defsA[diA].id;
          break;
        }
      }
    }
    if(_usedAmmoId){
      _ammoObj.breakdown[_usedAmmoId] = Math.max(0, (_ammoObj.breakdown[_usedAmmoId] || 0) - 1);
      _ammoObj.current = Math.max(0, (_ammoObj.current || 0) - 1);
    }
  } else if(_ammoObj && _ammoObj.breakdown){
    /* 预装填已扣 */
    if(_usedAmmoId){
      _ammoObj.breakdown[_usedAmmoId] = Math.max(0, (_ammoObj.breakdown[_usedAmmoId] || 0) - 1);
      _ammoObj.current = Math.max(0, (_ammoObj.current || 0) - 1);
    }
  } else if(_ammoObj){
    _ammoObj.current = Math.max(0, (_ammoObj.current || 0) - 1);
    if(wid === 'atgm'){
      const _ldA = (typeof _getLoadout === 'function') ? _getLoadout(p.vehicleId) : null;
      _usedAmmoId = (_ldA && _ldA.atgm && _ldA.atgm.ammoId) ? _ldA.atgm.ammoId : '9m113';
    }
  }
  /* rev-ainet: 查车辆特性 */
  const _feat = (typeof VEHICLE_FEATURES !== 'undefined') ? VEHICLE_FEATURES[p.vehicleId] : null;
  const _isAinet = !!(_feat && _feat.ainet && _usedAmmoId === '3of26');

  if(_preselectedDead) {
    // [v206] 目標死了依然要把砲彈打出去，讓它落到原定位置爆炸
  }

  const g = (function(){
    const _liveSt = window._getLiveStation();
    const cr = _liveSt && _liveSt.crew;
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
  /* rev-atgm-guidance: 按制導方式加成（無線電指令/激光駕束） */
  if(_usedAmmoId && typeof VEHICLE_ATGM_AMMO !== 'undefined' && VEHICLE_ATGM_AMMO[_usedAmmoId] && VEHICLE_ATGM_AMMO[_usedAmmoId].hrBonus){
    hr += VEHICLE_ATGM_AMMO[_usedAmmoId].hrBonus;
  }
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

  const baseDmg = Math.round(stats.dmg * _LEG_MULT);
  const penMM = stats.penMM || 0;

  const crit = Math.random() < _VEHICLE_CRIT_RATE;
  const finalDmg = crit ? Math.round(baseDmg * _VEHICLE_CRIT_MULT) : baseDmg;

  let _spd = 800;
  if(_usedAmmoId && typeof VEHICLE_AMMO_SPEED_MS !== 'undefined' && VEHICLE_AMMO_SPEED_MS[_usedAmmoId]) _spd = VEHICLE_AMMO_SPEED_MS[_usedAmmoId];
  else if(typeof VEHICLE_AMMO_SPEED_MS !== 'undefined' && VEHICLE_AMMO_SPEED_MS[wid]) _spd = VEHICLE_AMMO_SPEED_MS[wid];

  /* rev-weapon-core-onBTRFire: 载具武器统一走 _weaponFire
   * 与步战同一套：预判 + AABB 碰撞 + 精度散射
   * 制导类（GL-ATGM / 独立 atgm）传 guidanceMode 让 _weaponFire 内部实时更新预判
   * 炮弹类 guidanceMode='none'，一次预判不更新
   * 视觉仍由 BTRSupport 自己绘制，不经过 _weaponFire 的渲染 */
  if(typeof window._weaponFire === 'function'){
    const _isGuidedW = _isGLATGMId(_usedAmmoId) || wid === 'atgm';
    let _guideMode = 'none';
    let _guideMs = 0;
    if(_isGuidedW && _usedAmmoId && typeof VEHICLE_ATGM_AMMO !== 'undefined' && VEHICLE_ATGM_AMMO[_usedAmmoId]){
      _guideMode = VEHICLE_ATGM_AMMO[_usedAmmoId].guidanceMode || 'laser';
      _guideMs = VEHICLE_ATGM_AMMO[_usedAmmoId].guidanceUpdateMs || 250;
    }
    const _spMainW = _getVehicleSplashParams(wid, _usedAmmoId, _mixIsHE, _preset30, _isAinet);
    const _weaponRangeW = (typeof VEHICLE_RANGE_M !== 'undefined' && VEHICLE_RANGE_M[wid]) ? VEHICLE_RANGE_M[wid] : 300;
    var _mzStartX = p.worldX, _mzStartY = 1.5;
try{
var _bM = window.BTRSupport;
var _annM = (typeof VEHICLE_ANNOTATIONS !== 'undefined') ? VEHICLE_ANNOTATIONS[p.vehicleId] : null;
var _mzM = null;
if(_annM && _annM.muzzles){ for(var _mi = 0; _mi < _annM.muzzles.length; _mi++){ if(_annM.muzzles[_mi].weaponId === wid){ _mzM = _annM.muzzles[_mi]; break; } } }
if(_mzM && _bM && _bM.active && _bM.width > 0 && _bM.targetW > 0){
var _hrM = (typeof EXPLORE_HERO_X_RATIO === 'number') ? EXPLORE_HERO_X_RATIO : 0.25;
var _srM = (c.sm && c.sm.screenRightWorld) || 2;
var _mzNx = (typeof _mzM.x === 'number') ? _mzM.x : _mzM.mx;
var _mzNy = (typeof _mzM.y === 'number') ? _mzM.y : _mzM.my;
/* rev-muzzle-xy: VEHICLE_ANNOTATIONS.muzzles 用 .x/.y；.mx/.my 只存在於
   BTRSupport.muzzles 執行期物件。讀錯欄位 → NaN → startX=NaN →
   _weaponFire 的 (cfg.startX || 0) 折成 0 → 距離變成絕對世界座標 → 射程閘門全擋。 */
if(isFinite(_mzNx) && isFinite(_mzNy)){
var _mzPx = _bM.x * _bM.width + (_bM.shakeX || 0) + _mzNx * _bM.targetW;
var _mzPy = _bM.height * 0.95 - (_bM._contentBottomRatio || 1) * _bM.targetH + (_bM.yOffset || 0) + (_bM.shakeY || 0) + _mzNy * _bM.targetH;
var _chfM = (typeof CHAR_HEIGHT_FACTOR === 'number') ? CHAR_HEIGHT_FACTOR : 0.58;
var _phmM = (typeof PLAYER_HEIGHT_M === 'number') ? PLAYER_HEIGHT_M : 1.7;
var _sxW = p.worldX + (_mzPx / _bM.width - _hrM) / Math.max(0.05, 1 - _hrM) * _srM;
var _syW = Math.max(0.2, (0.95 - _mzPy / _bM.height) * _phmM / _chfM);
if(isFinite(_sxW) && isFinite(_syW)){ _mzStartX = _sxW; _mzStartY = _syW; }
}
}
}catch(_eM){}
/* rev-muzzle-finite: 最後護欄 —— 任何情況下都不讓 NaN 進入彈道核心 */
if(!isFinite(_mzStartX)) _mzStartX = p.worldX;
if(!isFinite(_mzStartY)) _mzStartY = 1.5;
const _bulletRef = window._weaponFire({
      owner: c,
      weaponId: wid,
      ammoId: _usedAmmoId,
      target: target,
      startX: _mzStartX,
      startY: _mzStartY,
      flightSpeed: _spd,
      hr: hr,
      burstCount: 1,
      weaponRange: _weaponRangeW,
      guidanceMode: _guideMode,
      guidanceUpdateMs: _guideMs,
      isEnemyBullet: false,
      onHit: function(hitX, hitY, tgt, part){
          /* rev-veh-direct: 直擊 = 全額 finalDmg + 完整 penMM，先結算直擊，
             再對「其他」單位施加濺射（blastPen × falloff）。
             Boss 走 applyBossDamage；bossTarget 唯讀 getter 不回寫。 */
          if(!tgt || tgt.hp <= 0){
            if(_spMainW) _applyVehicleSplash(_spMainW, hitX, wid, _usedAmmoId, null);
            return;
          }
          var _shown = 0, _hpLost = 0;
          if(tgt.isBoss){
            var _h0 = battle.bossHp, _a0 = battle.bossArmor, _s0 = battle.shieldHp || 0;
            var _pB = (typeof part === 'string' && part) ? part
              : ((window._hitCtx && typeof window._hitCtx.part === 'string') ? window._hitCtx.part : 'body');
            if(typeof applyBossDamage === 'function'){
              applyBossDamage(finalDmg, crit, penMM, false, true, false, _pB);
              if(typeof isBossType === 'function' && isBossType(battle.bossId, 'omega') && battle.arms && typeof damageOmegaArm === 'function'){
                damageOmegaArm(_pB, finalDmg);
              }
            }
            _hpLost = Math.max(0, _h0 - battle.bossHp);
            _shown = _hpLost > 0 ? _hpLost : Math.max(0, (_a0 - battle.bossArmor) + (_s0 - (battle.shieldHp || 0)));
            if(typeof spawnHitFx === 'function' && _shown > 0){
              spawnHitFx('boss', 0, '-' + Math.round(_shown) + (crit ? '!' : ''), crit ? 'crit' : (_hpLost > 0 ? '' : 'armor'));
            }
          } else {
            const mainProxy = { hp: tgt.hp, armor: tgt.armor || 0 };
            const mainRes = applyDamage(mainProxy, finalDmg, penMM, {
              part: (window._hitCtx && window._hitCtx.part) || null,
              armorProvider: function(p){ return (typeof getEnemyArmorMMForPart === 'function') ? getEnemyArmorMMForPart(tgt, p) : 0; }
            });
            tgt.hp = mainProxy.hp;
            if(tgt.armor !== undefined) tgt.armor = mainProxy.armor;
            _hpLost = mainRes.hpLost;
            _shown = mainRes.hpLost > 0 ? mainRes.hpLost : mainRes.armorLost;
            _vehicleCombatFloat(tgt.worldX, '-' + Math.round(_shown) + (crit ? '!' : ''), crit ? 'crit' : (mainRes.hpLost > 0 ? 'enemy' : 'armor'));
          }
          if(_spMainW) _applyVehicleSplash(_spMainW, hitX, wid, _usedAmmoId, tgt);
          if(tgt.hp <= 0) _onBTRKillTarget(tgt, wid, c, _usedAmmoId);
        },
        onMiss: function(impactX, impactY){
        const _spMissW = _getVehicleSplashParams(wid, _usedAmmoId, _mixIsHE, _preset30, _isAinet);
        if(_spMissW && target){
          _applyVehicleSplash(_spMissW, impactX, wid, _usedAmmoId);
        }
      }
    });
    /* rev-atgm-flighttime: 供 _fireMuzzle 计算导弹视觉速度 */
    const _flightSec = (_bulletRef && typeof _bulletRef.flightTimeSec === 'number' && _bulletRef.flightTimeSec > 0) ? _bulletRef.flightTimeSec : 1;
    return { ok: true, ammoId: _usedAmmoId, reloadMs: _calcReloadMs(wid), flightTimeSec: _flightSec, realSpeedMps: _spd };
  }

  };

window._settleVehicleEventIfCleared = function(enemy){
  /* rev-veh-direct: 每個事件恰好一次信物判定；死者保留 hp<=0 在 content，
     不再 filter 移除（否則 every(hp<=0) / 屍體 / 拾取鏈全部失真）。 */
  const ev = window._getEnemyEvent(enemy);
  if(!ev || ev._settled) return;
  if(!ev.content || !ev.content.length) return;
  for(let i = 0; i < ev.content.length; i++){
    if(ev.content[i] && ev.content[i].hp > 0) return;
  }
  ev._settled = true;
  ev.cleared = true;
  const _R = (ev.region && typeof REGIONS !== 'undefined') ? REGIONS[ev.region] : null;
  if(_R && _R.seal && _R.sealRate && Math.random() < _R.sealRate){
    state.seals[_R.seal] = Math.max(0, parseInt(state.seals[_R.seal] || 0, 10)) + 1;
    if(typeof pushLog === 'function'){
      pushLog('<span class="win">獲得 ' + (_R.name || ev.region) + ' 信物 ×1</span>', [], 'explore');
    }
  }
};

function _onBTRKillTarget(target, wid, c, usedAmmoId){
  /* rev-veh-direct: Boss 無 eid / rarity / 掉落 / 屍體 / 事件；死亡已由 applyBossDamage → endBattle 處理 */
  if(target && target.isBoss){
    if(typeof battle !== 'undefined' && battle && !battle.settling && battle.bossHp <= 0 && typeof endBattle === 'function') endBattle(true);
    return;
  }
  if(!c && window._combat) c = window._combat;
  /* rev-veh-boss: Boss 不是敵人單位 —— 沒有 eid / rarity / 掉落 / 屍體 / 事件。
     死亡已由 applyBossDamage → endBattle 處理，這裡只兜底，绝不跑敵人書務。 */
  if(target && target.isBoss){
    if(typeof battle !== 'undefined' && battle && !battle.settling && battle.bossHp <= 0 && typeof endBattle === 'function') endBattle(true);
    return;
  }
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
    target._lootDone = true;
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
      var layer = (typeof window._getCorpseLayer === 'function') ? window._getCorpseLayer() : null;
      if(fx && layer){
        var rc = window._renderEnemyCorpseCanvas(target, fx.clientHeight);
        if(rc){
          var wEl = document.createElement('div');
          wEl.style.cssText = 'position:absolute;bottom:0;pointer-events:none;will-change:left;width:' + rc.drawW + 'px;height:' + rc.drawH + 'px;';
          rc.canvas.style.cssText = 'width:100%;height:100%;display:block;';
          wEl.appendChild(rc.canvas);
          layer.appendChild(wEl);
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
/* rev-weapon-order: 武器排序唯一真相源 —— 車站配置頁面與支援報告共用。
   同軸機槍(pkt) → 車頂機槍(nsvt/kpvt) → 機炮(2a72/2a42)
   → 主炮(2a28/2a70/2a46/2a46m1，口徑遞增) → 獨立導彈(atgm)。
   主炮內彈種：穿甲 → 高爆 → 破甲 → 導彈（見 _VW_AMMO_ORDER）。
   nsvt_md / kpvt_mdz / pkt_t46m 只是 VEHICLE_WEAPON_STATS 的彈種 key，
   從來不是 weaponId（loadout 只有 nsvt/kpvt/pkt），故不列檔位。 */
const _VW_ORDER = {
/* 同軸機槍 */ pkt:10,
/* 車頂機槍 */ nsvt:20, kpvt:20,
/* 機炮 */ '2a72':40, '2a42':41,
/* 主炮 */ '2a28':50, '2a70':51, '2a46':52, '2a46m1':53,
/* 獨立導彈 */ atgm:90
};;
const _VW_AMMO_ORDER = { '3bm42':0, '3of26':1, '3bk29':2, '9m112':3, '9m119m':3,
'3uof17':1, '9m117m1':3, 'og15v':1, 'pg15v':2 };
window._vehicleWeaponSortKey = function(wid, ammoId){
var w = (typeof _VW_ORDER[wid] === 'number') ? _VW_ORDER[wid] : 99;
var a = (ammoId && typeof _VW_AMMO_ORDER[ammoId] === 'number') ? _VW_AMMO_ORDER[ammoId] : 9;
return w*10 + a;
};
window._vehicleWeaponDisplayName = function(wid, vid){
  if(wid === 'atgm'){
    const _ld = (typeof _getLoadout === 'function') ? _getLoadout(vid) : null;
    const _ammoId = (_ld && _ld.atgm && _ld.atgm.ammoId) ? _ld.atgm.ammoId : null;
    if(_ammoId && typeof VEHICLE_ATGM_AMMO !== 'undefined' && VEHICLE_ATGM_AMMO[_ammoId]) return VEHICLE_ATGM_AMMO[_ammoId].name;
    return 'ATGM';
  }
  return (typeof VEHICLE_WEAPON_NAMES !== 'undefined' && VEHICLE_WEAPON_NAMES[wid]) || wid;
};

/* rev-gl-atgm: 识别 GL-ATGM ammoId */
function _isGLATGMId(id){
  return id === '9m112' || id === '9m119m' || id === '9m117m1';
}
/* rev-aps-reuse: 直接复用 _spawnRPGImpactFx 的视觉，只把 smoke_dark 改成 smoke_light。
 * 玩家已认可 RPG 爆炸的视觉，只是 APS 是白烟不是黑烟——这是拦截 vs 命中的唯一区分。
 * 火球/碎片/火星全部保留（拦截弹也是爆炸），只换烟色。 */
/* rev-aps-smoke-life: APS 攔截煙塵的時間軸倍率。
   小裝藥在空中引爆的煙塵，靜止空氣中要數秒才散；RPG 命中煙柱附著裝甲、被車帶走，
   兩者不該用同一個消散速度。拉長 2.5 倍 → 主煙 3.5~5.9s、次煙 1.75~3.9s；
   擴散速率同比降低，最終煙團尺寸不變 —— 只改「多久散掉」，不改「散到多大」。 */
const APS_SMOKE_LIFE_MUL = 2.5;
window._spawnAPSInterceptFx = function(owner, sx, sy, radPx){
  if(!owner) return;
  if(!owner.explosions) owner.explosions = [];
  var _r = (typeof radPx === 'number' && radPx > 0) ? radPx : 60;
  var _startIdx = owner.explosions.length;
  if(typeof window._spawnRPGImpactFx === 'function'){
    window._spawnRPGImpactFx(owner, sx, sy, _r);
  }
  /* rev-aps-cloud-scale: APS 視覺 = RPG 爆炸視覺，但煙是白的（攔截 vs 命中的唯一區別）。
     反制彈在裝甲前引爆，煙塵雲實際是米級：初始半徑 0.45~0.75m、
     擴散 0.55~0.90 m/s、橫向展佈 1.4m。雲的世界足跡越大、畫面投影越大，
     全速掠過時才讀得出來。消散 2.2~3.6s（靜止空氣中本來就慢）。
     空中爆點的可見窗只有 0.1~0.3s → 生成延遲一律歸零，否則煙在出生前就掠出畫面。 */
  var _cmb = window._combat;
  var _ppm = (_cmb && _cmb.sm && _cmb.sm.bgPixelsPerMeter) ? _cmb.sm.bgPixelsPerMeter : 100;
  for(var i = _startIdx; i < owner.explosions.length; i++){
    var q = owner.explosions[i];
    q.delay = 0;
    if(q.kind !== 'smoke_dark') continue;
    q.kind = 'smoke_light';
    q.size = (0.45 + Math.random() * 0.30) * _ppm;
    q.growth = (0.55 + Math.random() * 0.35) * _ppm;
    q.x += (Math.random() - 0.5) * 1.40 * _ppm;
    q.life = q.maxLife = 2.2 + Math.random() * 1.4;
  }
};

/* rev-aps-world: 拦截点直接用世界坐标生成粒子，不经过屏幕中转。
 * 每个粒子的 _wx = interceptWorldX + (q.x × px→m)，屏幕宽度只影响视觉缩放。
 * 不同设备下拦截点世界坐标都是 camWX + halfLen + 2m。 */
window._spawnAPSInterceptFxWorld = function(owner, interceptWorldX, syPx, radPx){
  if(!owner) return;
  if(!owner.explosions) owner.explosions = [];
  var _r = (typeof radPx === 'number' && radPx > 0) ? radPx : 60;
  var _startIdx = owner.explosions.length;
  /* rev-aps-world-delegate: 視覺（白煙 + 物理尺度 + 慢散）統一由
     _spawnAPSInterceptFx 負責，此處只做世界錨定，不再自己複製一份煙色轉換。
     攔截發生在車體前方空中，雲團留在空氣裡 → 初始落在畫面右外，
     由相機前進把它掃入 —— 不為了可見而搬近。 */
  if(typeof window._spawnAPSInterceptFx === 'function'){
    window._spawnAPSInterceptFx(owner, 0, syPx, _r);
  }
  var _c = window._combat;
  var W = window._fxViewW(_c && _c.playerCanvas);
  var _ppm = (_c && _c.sm && _c.sm.bgPixelsPerMeter) ? _c.sm.bgPixelsPerMeter : 1;
  var _sr = (_c && _c.sm) ? (_c.sm.screenRightWorld || 2) : 2;
  var _hr = (typeof EXPLORE_HERO_X_RATIO === 'number') ? EXPLORE_HERO_X_RATIO : 0.25;
  var _pxToM = (1 / (1 - _hr)) * _sr / W;
  var _cam = (_c && _c.allies && _c.allies[0] && typeof _c.allies[0].worldX === 'number') ? _c.allies[0].worldX : 0;
  for(var i = _startIdx; i < owner.explosions.length; i++){
    var q = owner.explosions[i];
    if(q._wx !== undefined || q._ft) continue;
    if(q.kind === 'smoke_dark') q.kind = 'smoke_light';
    q._wx = interceptWorldX + q.x * _pxToM;
    q._wvx = q.vx * _pxToM;
    q._fxPrevPx = W * (_hr + ((q._wx - _cam) / _sr) * (1 - _hr));
    q._wm = true;
    q.size = q.size / _ppm;
    q.growth = (q.growth || 0) / _ppm;
    q.delay = 0;
    q.x = 0;
    q.vx = 0;
  }
};
/* rev-arena: T-80UM 硬杀拦截。口径 >=40mm 且 弹速 [100,400] m/s 才拦；每车 22 发，0.3s 冷却，82% 成功率。 */
/* ===== rev-aps-pre-decide: 攔截決策與視覺分離 =====
   決策（roll + 扣彈 + 冷卻）在尾煙沉積之前由 09 呼叫 _apsDecide 完成；
   _vHitVehicle 仍走 _tryArenaIntercept，但讀同一份快取，絕不二次 roll。
   攔截面 = 預判到引爆時刻的車頭 + 2m（世界米），比 hit.t 早，尾煙夾到該面。 */
function _apsRoll(vid, bulletSpeed, caliberMM){
  const feat = (typeof VEHICLE_FEATURES !== 'undefined') ? VEHICLE_FEATURES[vid] : null;
  if(!feat || !feat.arena) return false;
  /* rev-bmp3a-radar: 雷達歸零 → 無探測，攔截彈不再發射 */
  var _dR = state.vehicleDamage && state.vehicleDamage[vid];
  if(_dR && typeof _dR.arenaRadarHp === 'number' && _dR.arenaRadarHp <= 0) return false;
  if(typeof bulletSpeed !== 'number' || bulletSpeed < 100 || bulletSpeed > 400) return false;
  if(typeof caliberMM !== 'number' || caliberMM < 40) return false;
  if(!state.vehicleArena) state.vehicleArena = {};
  let a = state.vehicleArena[vid];
  if(!a || typeof a.ammo !== 'number' || typeof a.lastFireAt !== 'number'){
    a = state.vehicleArena[vid] = { ammo: (feat.arenaAmmo || 22), lastFireAt: 0 };
  }
  if(a.ammo <= 0) return false;
  const now = Date.now();
  if(now - a.lastFireAt < 300) return false;
  if(Math.random() > 0.82) return false;
  a.ammo--;
  a.lastFireAt = now;
  return true;
}
function _apsFx(vid, hitY){
  try {
    const _c = window._combat;
    const _btr = window.BTRSupport;
    if(!_c || !_btr || !_btr.active || !(_btr.width > 0) || !(_btr.targetW > 0)) return;
    const _camWXa = (_c.allies && _c.allies[0] && typeof _c.allies[0].worldX === 'number') ? _c.allies[0].worldX : 0;
    const _halfLenA = (typeof window.getVehicleHalfLengthWorld === 'function') ? window.getVehicleHalfLengthWorld(vid) : 3.6;
    const _interceptWXA = _camWXa + _halfLenA + 2;
    var _syN = 0.5;
    var _posA = (typeof window._vehicleHitScreenPos === 'function')
      ? window._vehicleHitScreenPos(vid, (typeof hitY === 'number') ? hitY : null)
      : null;
    if(_posA){ _syN = _posA.ny; }
    else if(typeof hitY === 'number'){
      var _chfA = (typeof CHAR_HEIGHT_FACTOR === 'number') ? CHAR_HEIGHT_FACTOR : 0.58;
      var _phmA = (typeof PLAYER_HEIGHT_M === 'number') ? PLAYER_HEIGHT_M : 1.7;
      _syN = 0.95 - hitY * (_chfA / _phmA);
    }
    if(!isFinite(_syN)) _syN = 0.5;
    _syN = Math.max(0.08, Math.min(0.92, _syN));
    const _syPx = _btr.height * _syN;
    const _radPx = Math.max(40, _btr.width * 0.15);
    if(typeof window._spawnAPSInterceptFxWorld === 'function'){
      window._spawnAPSInterceptFxWorld(_c, _interceptWXA, _syPx, _radPx);
    }
    if(!_c.floats) _c.floats = [];
    _c.floats.push({ text: 'APS 攔截', cls: 'armor', age: 0, x: EXPLORE_HERO_X_RATIO, y: 0.12 });
  } catch(e){ console.warn('[arena fx]', e); }
}
function _tryArenaIntercept(vid, bulletSpeed, caliberMM){
  var _b = (window._hitCtx && window._hitCtx.bullet) ? window._hitCtx.bullet : null;
  var _hit;
  if(_b && _b._apsDone){ _hit = !!_b._apsHit; }
  else { _hit = _apsRoll(vid, bulletSpeed, caliberMM); }
  if(!_hit) return false;
  var _hc = window._hitCtx;
  _apsFx(vid, (_hc && typeof _hc.y === 'number') ? _hc.y : null);
  return true;
}
/* 09 在沉積前呼叫：只決策，不畫、不寫日誌。結果快取；重複呼叫回傳快取（不重 roll）。 */
window._apsDecide = function(b, hit){
  if(!b) return null;
  if(b._apsDone) return b._apsHit ? { t: b._apsT, wx: b._apsWX, wy: b._apsWY } : null;
  if(!b.isEnemyBullet || b.isGrenade || !b.isRPG) return null;
  var tgt = b.target;
  if(!tgt || !tgt.isVehicle) return null;
/* rev-aps-destroyed-guard: 已毀車不再消耗 APS 彈 */
var _dAps = state.vehicleDamage && state.vehicleDamage[tgt.vehicleId];
if(_dAps && _dAps.destroyed) return null;
  /* rev-rpg-tier-cal: 口徑讀實際彈頭，不再恆 RPG-27 的 105 */
var _adCal = (typeof AMMO !== 'undefined' && b.ammoId && AMMO[b.ammoId]) ? AMMO[b.ammoId] : null;
var cal = (_adCal && _adCal.caliberMM) ? _adCal.caliberMM : ((typeof window._rpg27Cal === 'function') ? window._rpg27Cal() : 105);
  b._apsDone = true;
  b._apsHit = false;
  if(!_apsRoll(tgt.vehicleId, b.flightSpeed, cal)) return null;
  var c = window._combat;
  var cam = (c && c.allies && c.allies[0] && typeof c.allies[0].worldX === 'number')
    ? c.allies[0].worldX : (typeof tgt.worldX === 'number' ? tgt.worldX : 0);
  var half = (typeof window.getVehicleHalfLengthWorld === 'function') ? window.getVehicleHalfLengthWorld(tgt.vehicleId) : 3.6;
  var _vAdv = (typeof window._currentWorldSpeed === 'function') ? window._currentWorldSpeed() : 0;
  var _tFace = (hit && typeof hit.t === 'number') ? hit.t : 1;
  var wx = cam + _vAdv * (_tFace * (b.flightTimeSec || 0)) + half + 2;
  var dx = b.impactX - b.startX;
  if(!(Math.abs(dx) > 1e-9)) return null;
  var t = (wx - b.startX) / dx;
  if(!(t >= 0 && t <= 1)) return null;
  if(hit && typeof hit.t === 'number' && t > hit.t) t = hit.t;
  b._apsHit = true;
  b._apsT = t;
  b._apsWX = wx;
  /* rev-aps-visual-y: 回傳攔截面的實繪高度，尾煙終點與 APS 爆炸同點。
     settle 的 hit.y 仍用彈道高（_apsFx 自行做一次實繪轉換，避免雙重轉換）。 */
  var _wyA = b.startY + (b.impactY - b.startY) * t;
  var _posA = (typeof window._vehicleHitScreenPos === 'function') ? window._vehicleHitScreenPos(tgt.vehicleId, _wyA) : null;
  if(_posA){
    var _ftA = (tgt && typeof tgt.y === 'number') ? tgt.y : 0;
    var _chfA = (typeof CHAR_HEIGHT_FACTOR === 'number') ? CHAR_HEIGHT_FACTOR : 0.58;
    var _phmA = (typeof PLAYER_HEIGHT_M === 'number') ? PLAYER_HEIGHT_M : 1.7;
    _wyA = _ftA + (0.95 - _posA.ny) * _phmA / _chfA;
  }
  b._apsWY = _wyA;
  return { t: t, wx: wx, wy: _wyA };
};
/* ===== rev-aps-pre-decide:end ===== */
/* rev-gl-atgm: 按弹种定装填时间 */
function _calcReloadMs(wid){
/* rev-gl-reload-cycle: 炮塔循環恆 = 主炮裝填，與打出什麼彈無關。
   GL_ATGM_RELOAD_MS 是「導彈整備時間」，只用於 _glParticipates 判斷導彈能否跟上
   主炮節奏，不能用來凍結炮塔 —— 舊實作打完導彈回 15000，連 HE 一起啞 15s。 */
return (typeof MUZZLE_PROFILES !== 'undefined' && MUZZLE_PROFILES[wid] ? MUZZLE_PROFILES[wid].pauseMs : 3000);
}

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
  const _crewS = window._getLiveStation().crew || null;
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

/* rev-7part: 按部位 × 彈種查 LAYOUT + ERA_TYPES，一次返回最終等效（mm RHA） */
function _vGetArmor(vid, partKey, isHeat, noEra){
/* rev-band-component-armor: 履帶／車頂武器非裝甲板，以部件本體鋼材等效計。
   20mm 履帶鋼、8mm 武器本體為工程預設值，非實車手冊數據。 */
if(partKey === 'tracks') return 20;
if(partKey === 'roofWeapon') return 8;
const layout = (typeof VEHICLE_ARMOR_LAYOUT !== 'undefined') ? VEHICLE_ARMOR_LAYOUT[vid] : null;
if(!layout) return 30;
const part = layout[partKey];
if(!part) return 30;
const base = isHeat ? (part.baseHEAT != null ? part.baseHEAT : (part.baseKE || 30)) : (part.baseKE || 30);
/* rev-era-noera-param: noEra=true 代表這一發落在爆反縫隙 → 只算基礎等效。
   函式保持純查詢（無隨機），覆蓋 roll 由 _vHitVehicle 命中結算處負責。 */
let eraBonus = 0;
if(!noEra && part.era && typeof ERA_TYPES !== 'undefined' && ERA_TYPES[part.era]){
eraBonus = isHeat ? (ERA_TYPES[part.era].heat || 0) : (ERA_TYPES[part.era].ke || 0);
}
return base + eraBonus;
}

/* rev-heat-set: 化學能彈種白名單，新彈種只加 Set */
const _HEAT_AMMO_SET = new Set([
  'atgm', 'pg27', '3bk29', 'pg15v',
  '9m14', '9m113', '9m112', '9m119m', '9m117m1'
,
/* rev-rpg-tier: 五級火箭彈頭皆 HEAT */
'pg18', 'pg22', 'pg26', 'pg7vl']);
function _vIsHeatAmmo(ammoId){
  return _HEAT_AMMO_SET.has(ammoId);
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

/* ===== rev-veh-chain:start ===== */
/* 載具命中結算：guard → APS → ERA → 幾何穿透鏈 → 後果表。
   命中誰、走多長、傷多少由 _penChain 決定（09），
   本檔只負責「HP 歸零之後發生什麼」—— 按部件性質分派，不是按目標類型。
   每把武器的 weaponId 由部件盒給定（loadout 推導），不再隨機挑武器、
   不再於命中路徑重新推導車頂武器。
   weapon 命中只動 d.weapons，不寫 d.parts —— 舊版通用扣血寫在分支之前，
   會建立一個下次 _vEnsureDamage 即刪除的 d.parts.gun 幽靈欄位。
   乘員護甲統一讀 _vCalcPassengerArmor（單一來源）；舊版池用 equipData、
   等效用 p.helmet，兩者不一致時會判無甲全穿卻照樣扣甲。 */
/* rev-frag-batch: 破片批量結算時抑制逐片浮字（一發 300 片會刷 300 個數字），
   由 _vApplyExplosionToVehicle 結算後發一個聚合值。非批量時行為不變。 */
/* ===== rev-log-unify:start ===== */
/* 載具名與「無法開火原因」唯一真相源。
   _vehicleWeaponsDead 把「武器全毀／炮塔卡死／乘員全滅／彈藥耗盡」併成一個 bool，
   舊日誌一律寫「所有武器損壞」—— 炮手車長陣亡時武器根本沒壞，歸因錯。
   判定順序鏡射 _vehicleWeaponsDead 的早退順序。 */
function _vNameOf(vid){
  return (typeof VEHICLES !== 'undefined' && VEHICLES[vid] && VEHICLES[vid].name) ? VEHICLES[vid].name : (vid || '載具');
}
function _vGunLeaveReason(vid, d){
  if(!d) return '無法開火';
  if(d.destroyed) return '載具全毀';
  if(d.members && d.members.gunner <= 0 && d.members.commander <= 0) return '炮手、車長陣亡';
  var any = false, alive = false;
  if(d.weapons){ for(var k in d.weapons){ any = true; if(d.weapons[k].hp > 0) alive = true; } }
  if(any && !alive) return '所有武器損壞';
  if(d.parts && d.parts.turret <= 0) return '炮塔卡死';
  return '彈藥耗盡';
}
/* ===== rev-log-unify:end ===== */function _vHitFloat(wx, txt, cls){
  if(window._hitCtx && window._hitCtx._batch) return;
  if(typeof _vehicleCombatFloat === 'function') _vehicleCombatFloat(wx, txt, cls);
}
function _vComponentLog(d, label, labelCls, verb, suffix){
  if(typeof pushLog !== 'function') return;
  var head = '<b class="' + (labelCls || 'run') + '">' + label + '</b>';
  var la = d && d.lastAttacker;
  if(la && la.weapon){
    var wCls = (typeof rarityClass === 'function') ? rarityClass(la.rarity || '一般') : '';
    pushLog(head + ' 被 ' + (la.nameHtml || la.name) + ' 用 <span class="' + wCls + '">' + la.weapon + '</span> <span class="lose">' + verb + '</span>' + (suffix || ''), [], 'explore');
  } else {
    pushLog(head + ' <span class="lose">' + verb + '</span>' + (suffix || ''), [], 'explore');
  }
}
/* 把命中幾何轉成射線，取部件盒跑統一遍歷。
   直擊：起點 = 入射面交點，方向由 face 決定（六面皆可）。
   濺射：ctx 帶爆心，方向 = 爆心 → 車體該高度中心（破片徑向）。 */
window._vVehiclePenChain = function(veh, R0, eff){
  if(!veh || !veh.isVehicle || !(R0>0) || !(eff>0)) return [];
  var vid = veh.vehicleId;
  var boxes = (typeof window._vehPartBoxes === 'function') ? window._vehPartBoxes(vid) : null;
  if(!boxes || !boxes.length) return [];
  var box = (typeof window._getTargetBox === 'function') ? window._getTargetBox(veh) : null;
  if(!box) return [];
  var ctx = window._hitCtx || {};
  var twx = (typeof veh.worldX === 'number') ? veh.worldX : 0;
  var foot = (typeof box.yFoot === 'number') ? box.yFoot : 0;
  var cy = (typeof ctx.y === 'number') ? ctx.y : (foot + box.H*0.4);
  var cz = (typeof ctx.z === 'number') ? ctx.z : 0;
  var cx = (typeof ctx.x === 'number') ? ctx.x : (twx + box.L/2);
  var dx, dy, dz;
  if(ctx.isDirect === false){
    dx = twx - cx; dy = 0; dz = -cz;
    var dl = Math.sqrt(dx*dx + dy*dy + dz*dz);
    if(dl < 1e-6){ dx = -1; dy = 0; dz = 0; dl = 1; }
    dx /= dl; dy /= dl; dz /= dl;
  } else {
    var f = ctx.face || '';
    if(f === 'x1'){ dx=1; dy=0; dz=0; }
    else if(f === 'x2'){ dx=-1; dy=0; dz=0; }
    else if(f === 'z1'){ dx=0; dy=0; dz=1; }
    else if(f === 'z2'){ dx=0; dy=0; dz=-1; }
    else if(f === 'y1'){ dx=0; dy=1; dz=0; }
    else if(f === 'y2'){ dx=0; dy=-1; dz=0; }
    else { dx = (cx > twx) ? -1 : 1; dy = 0; dz = 0; }
  }
  var segLen = 2*(box.L + box.H + box.D);
  var d = (state.vehicleDamage && state.vehicleDamage[vid]) ? state.vehicleDamage[vid] : null;
  var roster = (typeof window._vehicleRosterMap === 'function') ? window._vehicleRosterMap() : [];
  function occupantOf(b){
    if(b.seat === 'passenger'){
      var rr = roster[b.seatIdx];
      if(!rr || !rr.srv || !(rr.srv.hp > 0)) return null;
      /* 個人護甲每次由裝備重算（沿用舊語義：舊版 _t2.armor 是臨時物件，
         扣損從未回寫裝備，等於無耐久）。故 armorTake 為 null。 */
      var mm = (typeof _vCalcPassengerArmor === 'function') ? _vCalcPassengerArmor(rr.p) : 0;
      return { alive:true, armorMM:mm, armorTake:null };
    }
    if(b.seat === 'player'){
      if(!d || !(d.members.player > 0)) return null;
      var lv = (state.player && state.player.armorLevel) || 0;
      var mm2 = (typeof ARMOR_LEVEL_TO_MM !== 'undefined' && ARMOR_LEVEL_TO_MM[lv]) || 0;
      return { alive:true, armorMM:(state.player.armor > 0) ? mm2 : 0, armorTake:function(t){
        state.player.armor = Math.max(0, Math.round((state.player.armor || 0) - t));
      } };
    }
    if(!d || !(d.members[b.seat] > 0)) return null;
    return { alive:true, armorMM:0, armorTake:null };
  }
  return window._penChain(boxes, cx-twx, cy, cz, dx, dy, dz, segLen, R0, eff, occupantOf);
};
/* 後果表：HP 歸零之後發生什麼。每項回傳 { internal, dmg, destroyed, decisive }。 */
function _vApplyComponentHit(vid, veh, d, hit){
  var wx = (veh && typeof veh.worldX === 'number') ? veh.worldX : 0;
  var dmg = Math.max(0, Math.round(hit.dmg || 0));
  var out = { component:hit.comp, internal:hit.internal, seat:hit.seat || null,
    weaponId:hit.weaponId || null, dmg:dmg, destroyed:false, decisive:false, detonated:false };
  if(hit.comp === 'obstacle' || dmg <= 0){ out.dmg = 0; return out; }
  var now = Date.now();
  var REPAIR = 4*3600*1000;

  if(hit.comp === 'crew'){
    var st = (typeof window._getLiveStation === 'function') ? window._getLiveStation() : null;
    var seat = hit.seat;
    if(seat === 'player'){
      if(!(d.members.player > 0)){ out.dmg = 0; return out; }
      state.player.hp = Math.max(0, Math.round((state.player.hp || 0) - dmg));
      d.members.player = state.player.hp > 0 ? 1 : 0;
      _vHitFloat(wx, '玩家 -' + dmg, 'crit');
      if(state.player.hp <= 0){
        state.player.deadUntil = now + 60000;
        var ex = window._explore;
        if(ex){ ex.mode = 'dead'; ex.deadUntil = now + 60000; ex._currentSpeed = 0; }
        if(typeof heroAnim !== 'undefined'){ heroAnim.name = 'dead'; heroAnim.frame = 0; heroAnim.lastUpdate = now; }
        _vComponentLog(d, '玩家', 'pl', '擊倒', '');
        _forceLeave(vid, veh, 'player_dead');
        out.destroyed = true; out.decisive = true;
      }
      return out;
    }
    if(seat === 'passenger'){
      var roster = (typeof window._vehicleRosterMap === 'function') ? window._vehicleRosterMap() : [];
      var rr = roster[hit.seatIdx];
      if(!rr || !rr.srv || !(rr.srv.hp > 0)){ out.dmg = 0; return out; }
      rr.srv.hp = Math.max(0, Math.round((rr.srv.hp || 0) - dmg));
      _vHitFloat(wx, '載員 -' + dmg, 'crit');
      if(rr.srv.hp <= 0){
        rr.srv.injuredUntil = now + REPAIR;
        rr.srv._injuredDown = true;
        var sName = (typeof servantLabel === 'function') ? servantLabel(rr.srv) : '載員';
        var sCls = (typeof rarityClass === 'function') ? rarityClass(rr.srv.rarity || '一般') : '';
        _vComponentLog(d, sName, sCls, '擊倒', '');
        out.destroyed = true;
      }
      return out;
    }
    if(!(d.members[seat] > 0)){ out.dmg = 0; return out; }
    var sid = (st && st.crew) ? st.crew[seat] : null;
    var srv = sid ? (state.servants || []).find(function(s){ return s.id === sid; }) : null;
    if(srv){
      srv.hp = Math.max(0, Math.round((srv.hp || 0) - dmg));
      d.members[seat] = srv.hp > 0 ? 1 : 0;
    } else {
      d.members[seat] = 0;
    }
    _vHitFloat(wx, '乘員 -' + dmg, 'crit');
    if(d.members[seat] <= 0){
      var ROLE = { driver:'駕駛', gunner:'炮手', commander:'車長' };
      var rCls = (typeof rarityClass === 'function') ? rarityClass((srv && srv.rarity) || '一般') : '';
      _vComponentLog(d, ROLE[seat] || seat, rCls, '擊倒', '');
      if(srv){ srv.hp = 0; srv.injuredUntil = now + REPAIR; srv._injuredDown = true; }
      out.destroyed = true;
      if(seat === 'driver'){
        d.repairUntil = now + REPAIR;
        _forceLeave(vid, veh, 'driver_dead');
        out.decisive = true;
      }
    }
    return out;
  }

  if(hit.comp === 'ammoRack'){
    d.ammoRackDamage = Math.min(600, (d.ammoRackDamage || 0) + dmg);
    _vHitFloat(wx, '彈藥架 -' + dmg, 'crit');
    if(d.ammoRackDamage >= 600){
      _detonate(vid, veh);
      out.destroyed = true; out.decisive = true; out.detonated = true;
    }
    return out;
  }

  if(hit.comp === 'weapon'){
    var wid = hit.weaponId;
    if(!wid || !d.weapons[wid]){ out.dmg = 0; return out; }
    var wPrev = d.weapons[wid].hp;
    d.weapons[wid].hp = Math.max(0, wPrev - dmg);
    _vHitFloat(wx, '-' + dmg, '');
    if(d.weapons[wid].hp <= 0 && wPrev > 0){
      d.repairUntil = now + REPAIR;
      var allDead = !!(window._vehicleWeaponsDead && window._vehicleWeaponsDead());
      if(allDead){
        if(typeof pushLog === 'function') pushLog('<span class="run">' + _vNameOf(vid) + '</span> ' + _vGunLeaveReason(vid, d) + '，<span class="lose">載具離場</span>', [], 'explore');
        _forceLeave(vid, veh, 'gun');
        out.decisive = true;
      } else {
        var remain = [];
        for(var k in d.weapons){ if(d.weapons[k].hp > 0) remain.push((typeof VEHICLE_WEAPON_NAMES !== 'undefined' && VEHICLE_WEAPON_NAMES[k]) || k); }
        var suf = remain.length ? ('（' + remain.join('、') + ' 仍可開火）') : '';
        if(typeof pushLog === 'function'){
          var wn = (typeof VEHICLE_WEAPON_NAMES !== 'undefined' && VEHICLE_WEAPON_NAMES[wid]) || wid;
          pushLog('<span class="run">' + wn + '</span> <span class="lose">損壞</span>' + suf, [], 'explore');
        }
      }
      out.destroyed = true;
    }
    return out;
  }

  /* rev-bmp3a-radar: Arena 雷達 —— 外部薄殼，歸零即主動防禦失效，不影響武器開火。
     HP 不進 d.parts（非結構件，不計車體血量）；只歸零 HP，不清 APS 彈量。 */
  if(hit.comp === 'arenaRadar'){
  if(typeof d.arenaRadarHp !== 'number') d.arenaRadarHp = 40;
  var rPrev = d.arenaRadarHp;
  d.arenaRadarHp = Math.max(0, rPrev - dmg);
  _vHitFloat(wx, '雷達 -' + dmg, 'crit');
  if(d.arenaRadarHp <= 0 && rPrev > 0){
  _vComponentLog(d, 'Arena 雷達', 'run', '損毀', '（主動防禦失效）');
  out.destroyed = true;
  }
  return out;
  }
  /* 結構件：engine / tracks / turret —— 只有這三類寫 d.parts */
  if(typeof d.parts[hit.comp] !== 'number'){ out.dmg = 0; return out; }
  var prev = d.parts[hit.comp];
  d.parts[hit.comp] = Math.max(0, prev - dmg);
  _vHitFloat(wx, '-' + dmg, '');
  if(d.parts[hit.comp] <= 0){
    if(prev > 0){
      d.repairUntil = now + REPAIR;
      if(hit.comp === 'turret'){
        var allDeadT = !!(window._vehicleWeaponsDead && window._vehicleWeaponsDead());
        _vComponentLog(d, '炮塔', 'run', '卡死', allDeadT ? '，載具離場' : '（車頂武器仍可開火）');
      } else {
        _vComponentLog(d, hit.comp === 'engine' ? '引擎' : '履帶/輪組', 'run', '癱瘓', '');
      }
    }
    out.destroyed = true;
    if(hit.comp === 'engine'){ _forceLeave(vid, veh, 'engine'); out.decisive = true; }
    else if(hit.comp === 'tracks'){ _forceLeave(vid, veh, 'tracks'); out.decisive = true; }
    else if(hit.comp === 'turret' && window._vehicleWeaponsDead && window._vehicleWeaponsDead()){
      _forceLeave(vid, veh, 'turret'); out.decisive = true;
    }
  }
  return out;
}
window._vHitVehicle = function(veh, dmg, penMM, ammoId, attackerName, weaponName, weaponRarity, attackerRarity, bulletSpeed, bulletCaliber, critSpec){
  var vid = veh.vehicleId;
  /* 已殉爆／已擊毀不再承受內部損傷：多帶爆炸逐帶回呼時，第一帶觸發 _detonate
     後其餘帶仍會累加並重複殉爆（實測 _detonate ×3）。 */
  var dg = state.vehicleDamage && state.vehicleDamage[vid];
  if(dg && dg.destroyed) return { penetrated:false, destroyed:true, damage:0, hits:[] };
  if(!(window._hitCtx && window._hitCtx._noArena) && _tryArenaIntercept(vid, bulletSpeed, bulletCaliber)){
    if(typeof pushLog === 'function'){
      var wCls = (typeof rarityClass === 'function') ? rarityClass(weaponRarity || '一般') : '';
      var aHtml = attackerName ? ((typeof rarityClass === 'function') ? ('<b class="' + rarityClass(attackerRarity || '一般') + '">' + attackerName + '</b>') : attackerName) : '';
      pushLog('<span class="run">APS</span> 攔截 ' + (aHtml ? (aHtml + ' 的 ') : '') + '<span class="' + wCls + '">' + (weaponName || '來襲彈藥') + '</span>', [], 'explore');
    }
    return { penetrated:false, intercepted:true, damage:0, hits:[] };
  }
  var d = _vEnsureDamage(vid);
  var wx = (veh && typeof veh.worldX === 'number') ? veh.worldX : 0;
  if(attackerName || weaponName){
    var ar = attackerRarity || '一般';
    var an = attackerName || '???';
    d.lastAttacker = {
      name: an,
      nameHtml: (typeof rarityClass === 'function') ? ('<b class="' + rarityClass(ar) + '">' + an + '</b>') : an,
      weapon: weaponName || '???',
      rarity: weaponRarity || '一般'
    };
  }
  var partKey = _vPartKeyFromCtx(veh);
  var isHeat = _vIsHeatAmmo(ammoId);
  /* 爆反是離散塊，掛載率 <1 時部分命中落在縫隙 → 只算基礎等效。 */
  var lay = (typeof VEHICLE_ARMOR_LAYOUT !== 'undefined' && VEHICLE_ARMOR_LAYOUT[vid]) ? VEHICLE_ARMOR_LAYOUT[vid][partKey] : null;
  var cov = (lay && lay.era && typeof lay.eraCoverage === 'number') ? Math.max(0, Math.min(1, lay.eraCoverage)) : 1;
  var eraHit = (cov >= 1) || (Math.random() < cov);
  var armorMM = _vGetArmor(vid, partKey, isHeat, !eraHit);
  /* 載具無護甲耐久池 —— R <= 0 只有一個狀態：未穿透。 */
  var R = penMM - armorMM;
  if(R <= 0){
    _vHitFloat(wx, '未穿透', 'armor');
    return { penetrated:false, damage:0, hits:[] };
  }
  var chain = window._vVehiclePenChain(veh, R, dmg);
  var applied = [], total = 0, decisive = null, detonated = false;
  for(var i=0;i<chain.length;i++){
    if(d.destroyed) break;
    /* rev-crit-per-part: 暴擊逐部件擲 —— 語義是「這一發的空腔恰好切到要緊處」，
       每個部件是獨立事件。critSpec 為選填：破片路徑不傳（09 引擎已逐片擲，
       避免雙重加成）；未傳的呼叫端沿用呼叫端預乘的舊行為。
       三部件路徑「至少一次暴擊」= 1-(1-rate)^3，rate 0.60 → 93.6%。 */
    var _ch = chain[i];
    if(critSpec && critSpec.rate > 0 && _ch.dmg > 0 && Math.random() < critSpec.rate){
      _ch = { comp:_ch.comp, internal:_ch.internal, seat:_ch.seat, seatIdx:_ch.seatIdx,
        weaponId:_ch.weaponId, dmg:Math.round(_ch.dmg*(critSpec.mult || 1)),
        path:_ch.path, chord:_ch.chord, armorLost:_ch.armorLost };
    }
    var r = _vApplyComponentHit(vid, veh, d, _ch);
    /* 只記有效事件：障礙物只消耗穿深，不是傷害事件 */
    if(r.dmg > 0 || r.destroyed){
      applied.push(r);
      total += r.dmg;
      if(r.detonated) detonated = true;
      if(r.decisive && !decisive) decisive = r;
    }
    if(d.destroyed) break;
  }
  /* 全員喪失戰鬥能力 → 殉爆。整條鏈結算後判一次，不逐部件判。 */
  if(!d.destroyed && d.members.driver <= 0 && d.members.gunner <= 0 && d.members.commander <= 0 && d.members.player <= 0){
    _detonate(vid, veh);
    detonated = true;
  }
  /* lastHit 記決定性那一擊（全損／癱瘓／陣亡），無則取最大傷害者。 */
  var pick = decisive;
  if(!pick){
    for(var j=0;j<applied.length;j++){ if(!pick || applied[j].dmg > pick.dmg) pick = applied[j]; }
  }
  d.lastHit = {
    part: partKey,
    internal: pick ? pick.internal : null,
    seat: pick ? pick.seat : null,
    weaponId: pick ? pick.weaponId : null,
    dmg: pick ? pick.dmg : 0
  };
  return { penetrated:true, part:partKey, damage:total, hits:applied,
    internal:d.lastHit.internal, detonated:detonated, destroyed:!!d.destroyed };
};
/* ===== rev-veh-chain:end ===== */
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
  /* [v236] 标记殉爆，供 onResolve 判断不覆盖失败 */
  if(window._combat) window._combat._detonated = true;

  /* [v180 F7] 判斷玩家是否還在車上。
     下車後殘留子彈命中舊載具 → 觸發 _detonate → 不能殺已下車的玩家和載員。
     判斷方式：c.active && c.sceneType === 'vehicle' && c.allies[0].isVehicle */
  const _c180 = window._combat;
  const _playerOnBoard180 = (typeof window._isPlayerMounted === 'function' ? window._isPlayerMounted() : false);

  if(!_playerOnBoard180){
    /* [v180 F7] 玩家已下車：只摧毀載具（彈藥架歸零、部件全毀），不殺玩家和載員 */
    if(state.vehicleAmmo && state.vehicleAmmo[vid]){
      for(const _wid180 in state.vehicleAmmo[vid]) state.vehicleAmmo[vid][_wid180].current = 0;
    }
    if(typeof pushLog === 'function'){
      pushLog('<span class="run">' + _vNameOf(vid) + ' 彈藥架</span><span class="lose">殉爆</span>（玩家已下車，無人員傷亡）', [], 'explore');
    }
    return;
  }

  const _now = Date.now();
  const _liveStDet = window._getLiveStation();
  const _crew = _liveStDet && _liveStDet.crew;
  if(_crew){
    for(const role of ['commander', 'gunner', 'driver']){
      const sid = _crew[role];
      if(!sid) continue;
      const srv = (state.servants || []).find(function(s){ return s.id === sid; });
      if(srv){ srv.hp = 0; srv.injuredUntil = _now + 4 * 3600 * 1000; }
    }
  }
  const _combatRef = window._combat;
  const _passengers = _liveStDet && _liveStDet.passengers;
  if(_combatRef && Array.isArray(_combatRef.allies) && _combatRef.allies.length){
    for(const a of _combatRef.allies){
      if(a.isPassenger && a.srv){
        a.srv.hp = 0;
        a.srv.injuredUntil = _now + 4 * 3600 * 1000;
      }
    }
  }
  /* rev-fix-detonate-passengers: 載具戰中 allies 只有載具，需獨立遍歷車上載員 */
  var _rosterD = (typeof window._vehicleRosterMap === 'function') ? window._vehicleRosterMap() : [];
for(var _rd = 0; _rd < _rosterD.length; _rd++){
var _srvD = _rosterD[_rd].srv;
if(_srvD){ _srvD.hp = 0; _srvD.injuredUntil = _now + 4 * 3600 * 1000; _srvD._injuredDown = true; }
}state.player.hp = 0;
  state.player.deadUntil = _now + 60000;
  const _ex = window._explore;
  if(_ex){ _ex.mode = 'dead'; _ex.deadUntil = performance.now() + 60000; _ex._currentSpeed = 0; _ex.combatEvent = null; }
  if(typeof window._playHeroDeath === 'function') window._playHeroDeath(); /* rev-fix-detonate-death */

  if(state.vehicleAmmo && state.vehicleAmmo[vid]){
    for(const wid in state.vehicleAmmo[vid]) state.vehicleAmmo[vid][wid].current = 0;
  }

  if(typeof window._vDetonateFx === 'function') window._vDetonateFx(veh);
  if(typeof pushLog === 'function'){
    const _la = d.lastAttacker;
    if(_la && _la.weapon){
      const _wClsDet = (typeof rarityClass === 'function') ? rarityClass(_la.rarity || '一般') : '';
      pushLog((_la.nameHtml || _la.name) + ' 用 <span class="' + _wClsDet + '">' + _la.weapon + '</span> 引發<span class="run">' + _vNameOf(vid) + ' 彈藥架</span><span class="lose">殉爆</span>，<span class="lose">全員重傷</span>', [], 'explore');
    } else {
      pushLog('<span class="run">' + _vNameOf(vid) + ' 彈藥架</span><span class="lose">殉爆</span>，<span class="lose">全員重傷</span>', [], 'explore');
    }
  }

  /* [v201] 不要暴力清空 _combat，必須走 _resolveVehicleLeave 的死亡結算流程 */
  if(typeof window._resolveVehicleLeave === 'function'){
    window._resolveVehicleLeave('detonated');
  } else {
    const _c = window._combat;
    if(_c){ _c.active = false; _c.onResolve = null; }
    const _b = window.BTRSupport;
    if(_b && _b.active){
      if(typeof _b._finishSupportAndLog === 'function'){ try { _b._finishSupportAndLog(); } catch(e){} }
      try { _b._cleanup(); } catch(e){}
      _b.active = false;
      _b.phase = null;
    }
    if(typeof window._combatCleanup === 'function') window._combatCleanup();
  }
}

function _forceLeave(vid, veh, reason){
  /* rev-forceleave-guard: 原版 if(c._forceLeaveReason) return 無計時器守卫，
     且 resolve 後不清 reason → 後續卡死寫了「載具離場」卻不再觸發離場。
     改為：嚴重度優先保留 reason、計時器唯一、resolve 端清除。 */
  const _sev = function(r){
    if(r === 'detonated' || r === 'hull_destroyed') return 3;
    if(r === 'engine' || r === 'driver_dead' || r === 'tracks' || r === 'player_dead') return 2;
    return 1;
  };
  const c = window._combat;
  const b = window.BTRSupport;
  if(c && c.active && c.sceneType === 'vehicle'){
    if(!c._forceLeaveReason || _sev(reason) > _sev(c._forceLeaveReason)) c._forceLeaveReason = reason;
    if(!c._forceLeaveAt) c._forceLeaveAt = performance.now();
    const _cannotDrive = _sev(c._forceLeaveReason) >= 2;
    if(b && b.active){
      if(_cannotDrive){ if(typeof b.enterWreckMode === 'function') b.enterWreckMode(); }
      else { if(typeof b.enterFastLeave === 'function') b.enterFastLeave(); }
    }
    if(!c._forceLeaveTimer){
      c._forceLeaveTimer = setTimeout(function(){
        const _c = window._combat;
        if(!_c) return;
        _c._forceLeaveTimer = null;
        if(_c.active && _c._forceLeaveReason) _resolveVehicleLeave(_c._forceLeaveReason);
      }, 800);
    }
  } else {
    if(_sev(reason) >= 2){
      if(b && b.active && b.phase !== 'wreck' && b.phase !== 'wreckPause' && typeof b.enterWreckMode === 'function'){
        b.enterWreckMode();
      }
    }
  }
}

function _resolveVehicleLeave(reason){
const c = window._combat;
if(!c) return;
const b = window.BTRSupport;
/* rev-forceleave-clear: 離場結算即清除 forcing 狀態，避免下一次卡死被早退吞掉 */
if(c._forceLeaveTimer){ clearTimeout(c._forceLeaveTimer); c._forceLeaveTimer = null; }
c._forceLeaveReason = null;
c._forceLeaveAt = 0;

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
  }

  if(reason === 'detonated' || reason === 'player_dead'){
    const cb = c.onResolve;
    c.active = false;
    c.onResolve = null;
    if(typeof window._combatCleanup === 'function') window._combatCleanup();
    if(reason === 'player_dead'){
      if(typeof window._playHeroDeath === 'function') window._playHeroDeath(); /* rev-fix-veh-death */
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
      worldX: (window._explore && typeof window._explore.worldX === 'number') ? window._explore.worldX : 0,
      weapon: _pw,
      _nextFireAt: performance.now() + 800
    }];
    /* [v192 F1] 車毀下車後補回載員到 c.allies。
       原代碼只建玩家，載員在 _disembark 後進入 ex.passengersFollowing，
       但不在 c.allies 裡 → _autoFireFoot / _tickAlliesPositions 不遍歷
       → 敵彈穿過、載員不還擊。此處主動觸發 _disembark（若尚未），
       再從 ex.passengersFollowing 讀非撤退載員，按 _startCombat 的
       同一結構加入 c.allies。 */
    if(b && b.active && typeof _disembark === 'function' && !b._disembarked){
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
      /* 彈藥手主武器欄彈藥箱一併進公共池（與 _startCombat 同語義） */
for(let _pi3 = 0; _pi3 < _fw2.length; _pi3++){
const _p3 = _fw2[_pi3].p;
if(!_p3 || !_p3.primaryWeapon || typeof AMMO === 'undefined' || !AMMO[_p3.primaryWeapon]) continue;
if(!(_p3.primaryWeaponBoxCount > 0)) continue;
const _adef3 = AMMO[_p3.primaryWeapon];
if(!_adef3 || !_adef3.cal) continue;
_publicPool2.push({ cal:_adef3.cal, id:_p3.primaryWeapon, rarity:_p3.primaryWeaponRarity || '一般', count:_p3.primaryWeaponBoxCount, _isAmmoHandlerBox:true, _ownerP:_p3 });
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
          worldX: _exWX2 + (_f2._slotDX || 0), _slotDX: (_f2._slotDX || 0),
          weapon: _wO2,
          equipData: {
            head: _pp2.helmet || null,
            top: _pp2.body || null,
            primary: _pp2.primaryWeapon || null
          },
          ammoPouch: _pp2.ammoPouch || null,
          ammoBox: _pp2.ammoBox || null,
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
    if(typeof window._resetExploreAfterCombat === 'function') window._resetExploreAfterCombat();
    if(reason !== 'disembark' && typeof pushLog === 'function') pushLog('<span class="pl">玩家</span> 下車繼續作戰', [], 'explore');
  }
}

window._resolveVehicleLeave = _resolveVehicleLeave;
/* rev-fix-vehicle-leave-modularize */
window._resetExploreAfterCombat = function(){
  if(!window._explore) return;
  window._explore.mode = 'walk';
  window._explore.combatEvent = null;
  window._explore._pendingLootEvents = null;
};

function _writeVehicleDestroyedLog(reason, vid){
  const _dmg = state.vehicleDamage && state.vehicleDamage[vid];
  if(!_dmg) return;
  /* rev-log-truth: 武器已有獨立 HP（不再寫 d.parts.gun），
     損壞清單必須同時掃 d.weapons，否則炸毀三門炮仍顯示「損壞 0 處」。 */
  const _brokenParts = [];
  for(const _pk in _dmg.parts){ if(_dmg.parts[_pk] <= 0) _brokenParts.push(_pk); }
  const _brokenWeapons = [];
  if(_dmg.weapons){ for(const _wk in _dmg.weapons){ if(_dmg.weapons[_wk].hp <= 0) _brokenWeapons.push(_wk); } }
  const _deadMembers = [];
  for(const _mk in _dmg.members){ if(_dmg.members[_mk] <= 0) _deadMembers.push(_mk); }
  var _rosterL = (typeof window._vehicleRosterMap === 'function') ? window._vehicleRosterMap() : [];
  for(var _rl = 0; _rl < _rosterL.length; _rl++){
    var _srvL = _rosterL[_rl].srv;
    if(_srvL && (_srvL.hp <= 0 || (_srvL.injuredUntil && _srvL.injuredUntil > Date.now()))){
      _deadMembers.push('passenger_' + (_rl + 1));
    }
  }
  const _reasonText = reason === 'detonated' ? '彈藥架殉爆' : '車體擊毀';
  const _summary = [];
  const _nBroken = _brokenParts.length + _brokenWeapons.length;
  if(_nBroken) _summary.push('損壞 ' + _nBroken + ' 處');
  if(_deadMembers.length) _summary.push('陣亡 ' + _deadMembers.length + ' 人');
  const _vdData = {
    vehicleId: vid, reason: reason,
    lastHit: _dmg.lastHit || null,
    brokenParts: _brokenParts,
    brokenWeapons: _brokenWeapons,
    deadMembers: _deadMembers,
    ammoRackDamage: _dmg.ammoRackDamage || 0,
    repairUntil: _dmg.repairUntil || 0
  };
  if(typeof pushLog === 'function'){
    pushLog('<span class="lose">' + _reasonText + '</span>' + (_summary.length ? ' · ' + _summary.join(' · ') : '') + '，<span class="log-link">點擊查看詳情</span>', [], 'vehicle_destroyed');
    if(state.logs && state.logs.length) state.logs[state.logs.length - 1].vehicleDestroyed = _vdData;
  }
}function _openVehicleDestroyedDetail(log){
  /* rev-log-truth: 部位表補頂面鍵；致命一擊顯示幾何給定的實際席位與武器，
     不再一律「乘員」／「炮管」—— 那兩個籠統詞丟掉了新架構已經算出的資訊。 */
  if(!log || !log.vehicleDestroyed) return;
  const d = log.vehicleDestroyed;
  const vid = d.vehicleId;
  const vehName = (typeof VEHICLES !== 'undefined' && VEHICLES[vid]) ? VEHICLES[vid].name : vid;
  const reasonMap = { detonated: '彈藥架殉爆', hull_destroyed: '車體擊毀' };
  const reason = reasonMap[d.reason] || d.reason;
  const PART_NAME = {
    tracks: '履帶/輪組', roofWeapon: '車頂武器',
    hullUpperFront: '車體首上', hullLowerFront: '車體首下',
    hullSide: '車體側面', hullRear: '車體後部',
    hullRoof: '車體頂部', turretRoof: '炮塔頂部', arenaRadar: 'Arena 雷達',
    turretFront: '炮塔正面', turretSide: '炮塔側面', turretRear: '炮塔後部',
    hullFront: '車體正面', side: '側面', rear: '後面'
  };
  const COMP_NAME = { roofWeapon: '車頂武器', ammoRack: '彈藥架', crew: '乘員', engine: '引擎', tracks: '履帶/輪組', gun: '武器', turret: '炮塔', arenaRadar: 'Arena 雷達' };
  const SEAT_NAME = { driver: '駕駛', gunner: '炮手', commander: '車長', player: '玩家' };
  function weaponName(w){
    if(!w) return null;
    if(typeof window._vehicleWeaponDisplayName === 'function') return window._vehicleWeaponDisplayName(w, vid);
    return (typeof VEHICLE_WEAPON_NAMES !== 'undefined' && VEHICLE_WEAPON_NAMES[w]) || w;
  }
  let body = '';
  body += '<div class="detail-title">💥 ' + vehName + ' · ' + reason + '</div>';
  body += '<div class="divider"></div>';
  if(d.lastHit){
    const partName = PART_NAME[d.lastHit.part] || d.lastHit.part;
    let target = COMP_NAME[d.lastHit.internal] || d.lastHit.internal;
    if(d.lastHit.seat){
      target = SEAT_NAME[d.lastHit.seat] || (d.lastHit.seat === 'passenger' ? '載員' : d.lastHit.seat);
    } else if(d.lastHit.weaponId){
      target = weaponName(d.lastHit.weaponId) || target;
    }
    body += '<div class="logline" style="padding:6px 0">致命一擊：<span style="color:#e8a33d">' + partName + '</span> → <span style="color:#e05252">' + target + '</span>，造成 <span style="color:#e8a33d;font-weight:bold">' + Math.round(d.lastHit.dmg) + '</span> 傷害</div>';
  }
  const _broken = [];
  if(d.brokenParts){ for(var i=0;i<d.brokenParts.length;i++){ _broken.push(COMP_NAME[d.brokenParts[i]] || d.brokenParts[i]); } }
  if(d.brokenWeapons){ for(var j=0;j<d.brokenWeapons.length;j++){ _broken.push(weaponName(d.brokenWeapons[j])); } }
  if(_broken.length){
    body += '<div class="logline" style="padding:6px 0;color:#e05252">損壞部件：' + _broken.join(' · ') + '</div>';
  }
  if(d.deadMembers && d.deadMembers.length){
    body += '<div class="logline" style="padding:6px 0;color:#e05252">陣亡成員：' + d.deadMembers.map(function(m){
      if(m.indexOf('passenger_') === 0) return '載員 #' + m.slice(10);
      return SEAT_NAME[m] || m;
    }).join(' · ') + '</div>';
  }
  if(d.ammoRackDamage > 0){
    body += '<div class="logline" style="padding:6px 0;color:#7a6f60">彈藥架累計傷害：<span style="color:#e8a33d">' + Math.round(d.ammoRackDamage) + '</span> / 600</div>';
  }
  if(d.repairUntil > 0){
    let remainH = Math.round((d.repairUntil - Date.now()) / 3600000 * 10) / 10;
    if(remainH < 0) remainH = 0;
    body += '<div class="logline" style="padding:6px 0;color:#7a6f60">維修時長：<span style="color:#e8a33d">' + remainH + ' 小時</span></div>';
  }
  const ft = document.createElement('div');
  ft.className = 'modal-ft';
  ft.innerHTML = '';
  openModal({ title: '擊毀報告', body: body, footer: ft });
}window._openVehicleDestroyedDetail = _openVehicleDestroyedDetail;

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
/* rev-summon-refill: 載員彈藥同樣在召喚時補滿（從庫存扣差額）。
   必須在 BTRSupport.start() 之前 —— start() 會把 station 快照凍結。 */
if(typeof window._refillPassengerAmmo === 'function') window._refillPassengerAmmo(vid);

  /* rev-arena-reload: 每次出車重置 APS 彈量（戰鬥中不補、出車補滿） */
  var _featAr = (typeof VEHICLE_FEATURES !== 'undefined') ? VEHICLE_FEATURES[vid] : null;
  if(_featAr && _featAr.arena){
    if(!state.vehicleArena) state.vehicleArena = {};
    state.vehicleArena[vid] = { ammo: (_featAr.arenaAmmo || 22), lastFireAt: 0 };
  }

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
  const _liveStGrant = window._getLiveStation();
  if(!_liveStGrant || !_liveStGrant.crew) return;
  const members = [];
  for(const r of ['commander', 'gunner', 'driver']){
    const sid = _liveStGrant.crew[r];
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

/* ============================================================
   rev-box3d: 載具現實尺寸（frontWidth = 正面投影寬 = D；height = 車高 = H）
   L 沿用 VEHICLE_HALF_LENGTH_WORLD × 2。2D AABB 仍是純側面，正/後面為虛擬平面
   ============================================================ */
const VEHICLE_DIM = {
btr80:{frontWidth:2.90,height:2.41}, btr80a:{frontWidth:2.90,height:2.41},
btr82:{frontWidth:2.90,height:2.41}, btr82a:{frontWidth:2.90,height:2.41},
btr90:{frontWidth:3.12,height:2.65},
bmp1:{frontWidth:2.94,height:2.07},  bmp1m:{frontWidth:2.94,height:2.07},
bmp2:{frontWidth:3.15,height:2.26},  bmp3:{frontWidth:3.30,height:2.30},
bmd4:{frontWidth:3.15,height:2.17},
bmp3m:{frontWidth:3.30,height:2.30},
  bmp3a: {frontWidth:3.30,height:2.30},
t80:{frontWidth:3.60,height:2.20},   t80b:{frontWidth:3.60,height:2.20},
t80bv:{frontWidth:3.60,height:2.20}, t80u:{frontWidth:3.60,height:2.20},
t80uk:{frontWidth:3.60,height:2.20}, t80um:{frontWidth:3.60,height:2.20}
};
window.VEHICLE_DIM = VEHICLE_DIM;
/* 高度帶由現有正面投影權重推導，不新增隨機：
   炮塔線 = 1 - turretFront/Σ正面；首下線 = hullLowerFront/Σ正面
   T-80 系 0.32/0.59 · BTR 系 0.38/0.87 · BMP-1/1M/2 0.33/0.78 · BMP-3/BMD-4 0.31/0.72
   側面/後面共用同一條炮塔線（不分首上首下） */
var _V_FACE_BANDS_CACHE = {};
window._vGetFaceBands = function(vid, facing){
var key = vid + '|' + facing;
if(_V_FACE_BANDS_CACHE[key]) return _V_FACE_BANDS_CACHE[key];
/* rev-height-bands-fn: 高度帶改讀現實規格（VEHICLE_HEIGHT_BANDS，05），不再從面積權重推導。
   面積 ≠ 高度：炮塔比車體窄，面積占比系統性低估其高度占比。
   正面五段：履帶／首下／首上／炮塔／車頂武器；側後四段（不分首上下）。
   h5 = VEHICLE_REAL_HEIGHTS（渲染唯一真相源）；h4=null → 車頂段寬 0。 */
var row = (typeof VEHICLE_HEIGHT_BANDS !== 'undefined') ? VEHICLE_HEIGHT_BANDS[vid] : null;
var H = (typeof VEHICLE_REAL_HEIGHTS !== 'undefined' && VEHICLE_REAL_HEIGHTS[vid]) ? VEHICLE_REAL_HEIGHTS[vid] : 0;
var out;
if(row && H > 0){
  var _c01 = function(v){ return Math.max(0, Math.min(1, v)); };
  var b1 = _c01(row.h1 / H);
  var b2 = Math.max(b1, _c01(row.h2 / H));
  var b3 = Math.max(b2, _c01(row.h3 / H));
  var b4 = Math.max(b3, _c01(((row.h4 != null) ? Math.min(row.h4, H) : H) / H));
  var lo, mid, hi;
  if(facing === 'front'){ lo='hullLowerFront'; mid='hullUpperFront'; hi='turretFront'; }
  else if(facing === 'rear'){ lo='hullRear'; mid=null; hi='turretRear'; }
  else { lo='hullSide'; mid=null; hi='turretSide'; }
  out = [{ part:'tracks', lo:0, hi:b1 }];
  if(mid){ out.push({ part:lo, lo:b1, hi:b2 }); out.push({ part:mid, lo:b2, hi:b3 }); }
  else { out.push({ part:lo, lo:b1, hi:b3 }); }
  out.push({ part:hi, lo:b3, hi:b4 });
  /* rev-bmp3a-radar: 有雷達專屬裝甲鍵的車型，頂帶即雷達（8mm），不再冒名車頂武器 */
  var _layT = (typeof VEHICLE_ARMOR_LAYOUT !== 'undefined') ? VEHICLE_ARMOR_LAYOUT[vid] : null;
  if(b4 < 1) out.push({ part:(_layT && _layT.arenaRadar) ? 'arenaRadar' : 'roofWeapon', lo:b4, hi:1 });
} else {
  /* 表缺該車 → 沿用舊面積推導（不靜默改變未列入車型的行為） */
  var pr = _getPartProbForVid(vid), w = {};
  for(var i = 0; i < pr.length; i++) w[pr[i].key] = pr[i].w;
  var sumF = (w.hullUpperFront || 0) + (w.hullLowerFront || 0) + (w.turretFront || 0);
  if(!(sumF > 0)) sumF = 1;
  var lo2 = (w.hullLowerFront || 0) / sumF;
  var tl = lo2 + (w.hullUpperFront || 0) / sumF;
  if(!(tl > lo2)) tl = Math.min(0.95, lo2 + 0.3);
  if(facing === 'front'){
    out = [{part:'hullLowerFront',lo:0,hi:lo2},{part:'hullUpperFront',lo:lo2,hi:tl},{part:'turretFront',lo:tl,hi:1}];
  } else if(facing === 'rear'){
    out = [{part:'hullRear',lo:0,hi:tl},{part:'turretRear',lo:tl,hi:1}];
  } else {
    out = [{part:'hullSide',lo:0,hi:tl},{part:'turretSide',lo:tl,hi:1}];
  }
}
_V_FACE_BANDS_CACHE[key] = out;
return out;
};
/* 直擊部位：優先用引擎幾何判定結果（_hitCtx.part），否則按落點推導 */
/* rev-face-authority: 入射面由 slab 判定（ctx.face）決定，不再用 x 座標反推。
   舊版 facing = (ctx.x > twx + L/2) ? 'front' : ... 用嚴格大於，
   而 slab 回傳的 hit.x 恰好等於 twx + L/2（浮點上常略小）→ 正面命中被判 'side'：
   T-80UM 首上 515+ERA 被讀成側甲 80+ERA，3BM42 pen470 直接穿「正面」。
   face 是幾何結果，直接採用才是根修；加 epsilon 只是掩蓋反推本身的多餘。
   頂／底面：落在炮塔足印 → turretRoof，否則 hullRoof。
   無 face（舊呼叫端）才退回位置推導，且邊界含等號。 */
function _vPartKeyFromCtx(veh){
  var vid = veh && veh.vehicleId;
  var layout = (typeof VEHICLE_ARMOR_LAYOUT !== 'undefined') ? VEHICLE_ARMOR_LAYOUT[vid] : null;
  var ctx = window._hitCtx;
  if(ctx && typeof ctx.part === 'string' && layout && layout[ctx.part]) return ctx.part;
  var box = (typeof window._getTargetBox === 'function') ? window._getTargetBox(veh) : null;
  if(!ctx || !box) return 'hullLowerFront';
  var twx = (typeof veh.worldX === 'number') ? veh.worldX : 0;
  var f = (typeof ctx.face === 'string') ? ctx.face : '';
  if(f === 'y1' || f === 'y2'){
    var pb = (typeof window._vehPartBoxes === 'function') ? window._vehPartBoxes(vid) : null;
    var inTurret = false;
    if(pb && typeof ctx.x === 'number'){
      var lx = ctx.x - twx, lz = (typeof ctx.z === 'number') ? ctx.z : 0;
      for(var ti=0;ti<pb.length;ti++){
        var tb = pb[ti];
        if(tb.comp !== 'turret' || tb.ring) continue;
        if(lx >= tb.x0 && lx <= tb.x1 && lz >= tb.z0 && lz <= tb.z1){ inTurret = true; break; }
      }
    }
    var rk = inTurret ? 'turretRoof' : 'hullRoof';
    if(layout && layout[rk]) return rk;
    if(layout && layout.hullRoof) return 'hullRoof';
    return 'hullSide';
  }
  var facing;
  if(f === 'x2') facing = 'front';
  else if(f === 'x1') facing = 'rear';
  else if(f === 'z1' || f === 'z2') facing = 'side';
  else if(typeof ctx.x === 'number'){
    var eps = 1e-6;
    facing = (ctx.x >= twx + box.L/2 - eps) ? 'front'
           : ((ctx.x <= twx - box.L/2 + eps) ? 'rear' : 'side');
  } else return 'hullLowerFront';
  var r = (typeof ctx.y === 'number') ? (ctx.y - box.yFoot) / box.H : 0.3;
  var bands = window._vGetFaceBands(vid, facing);
  for(var i=0;i<bands.length;i++){ if(r < bands[i].hi) return bands[i].part; }
  return bands[bands.length-1].part;
}
window._vPartKeyFromCtx = _vPartKeyFromCtx;
/* 載具受濺射統一入口（敵人載具尚未實裝，先備好；逐帶回呼 _vHitVehicle 走完內部損傷） */
window._vApplyExplosionToVehicle = function(veh, P, opts){
  if(!veh || !veh.isVehicle || !P || !opts) return null;
  var agg = { hpLost:0, armorLost:0, penetrated:0, bands:[], fragments:0 };
  var isFrag = (opts.fragments > 0 && opts.fragEff > 0);
  var res = window._applyExplosionToBox(veh, P, {
    fragments: opts.fragments, fragEff: opts.fragEff, crit: opts.crit,
    totalDmg: opts.totalDmg, maxR: opts.maxR,
    penFor: opts.penFor || function(){ return opts.pen || 0; },
    applyBand: function(part, dmg, pen, R){
      var prev = window._hitCtx;
      /* rev-frag-rays: 破片模式下每片有自己的入射點 —— ctx 逐片給定，
         不再用帶中心（那會讓整帶所有破片走同一條鏈）。
         _batch：抑制逐片浮字，結算後由本函式發一個聚合數字。 */
      var cx, cy, cz, face;
      if(isFrag && R && typeof R.x === 'number'){
        cx = R.x; cy = R.y; cz = R.z; face = R.face;
      } else {
        cx = P.x; cz = P.z || 0; face = (R && R.face) || null;
        cy = (R && typeof R.yLo === 'number' && typeof R.yHi === 'number') ? (R.yLo + R.yHi)/2 : P.y;
      }
      window._hitCtx = { target:veh, part:part, face:face, x:cx, y:cy, z:cz,
        isDirect:false, _noArena:true, _batch:true };
      var r = null;
      try {
        r = window._vHitVehicle(veh, dmg, pen, opts.ammoId || 'unknown', opts.attackerName,
          opts.weaponName, opts.weaponRarity, opts.attackerRarity, opts.bulletSpeed, opts.bulletCaliber);
      } catch(e){}
      window._hitCtx = prev;
      /* rev-frag-display: 回報實際傷害。穿透 → 部件損傷（hpLost）；
         未穿透 → 該片被裝甲吸收（armorLost）。舊版一律 armorLost。 */
      var real = (r && r.damage) || 0;
      var blocked = (r && !r.penetrated && !r.intercepted) ? Math.round(dmg) : 0;
      if(r && r.penetrated) agg.penetrated++;
      agg.hpLost += real;
      agg.armorLost += blocked;
      agg.bands.push({ part:part, dmg:dmg, pen:pen, result:r });
      return { hpLost:real, armorLost:blocked };
    }
  });
  agg.coverage = res ? res.coverage : 0;
  agg.dNear = res ? res.dNear : Infinity;
  agg.fragments = res ? (res.fragments || 0) : 0;
  if(agg.hpLost > 0 && typeof _vehicleCombatFloat === 'function'){
    _vehicleCombatFloat((typeof veh.worldX==='number')?veh.worldX:0, '-' + Math.round(agg.hpLost), 'enemy');
  }
  return agg;
};
/* rev-veh-dim-sync: 命中盒高度 = 渲染實車高（含車頂武器）。
   VEHICLE_REAL_HEIGHTS（13）為單一真相源，VEHICLE_DIM 不再自帶一套矮值。 */
(function(){
  if(typeof VEHICLE_DIM === 'undefined' || typeof VEHICLE_REAL_HEIGHTS === 'undefined') return;
  for(var k in VEHICLE_DIM){
    if(VEHICLE_REAL_HEIGHTS[k]) VEHICLE_DIM[k].height = VEHICLE_REAL_HEIGHTS[k];
  }
})();

/* 下車：把載具戰交回步兵。與 arrive 的 _toVehicle 對稱，
   與車毀下車共用同一條轉換實作。'disembark' 不在癱瘓/殉爆名單內，
   enterFastLeave 對 lift/exit/leave 本就早退 → 不改相位，只做戰鬥轉換。 */
window._vehicleToFoot = function(){
  var c = window._combat;
  if(!c || !c.active || c.sceneType !== 'vehicle') return false;
  _resolveVehicleLeave('disembark');
  return true;
};

/* rev-rebind-src: 支援結束釋放快照後，把跟隨載員與步戰代理的 p / 彈藥來源重新綁回 live station。
   否則下車後的步戰消耗會寫進已作廢的快照 → 彈藥憑空回復。 */
window._rebindPassengerSnapshots = function(){
  var ex = window._explore;
  if(!ex || !Array.isArray(ex.passengersFollowing)) return;
  var live = (state.station && Array.isArray(state.station.passengers)) ? state.station.passengers : [];
  var byId = {};
  for(var i = 0; i < live.length; i++){ if(live[i] && live[i].srvId) byId[live[i].srvId] = live[i]; }
  for(var j = 0; j < ex.passengersFollowing.length; j++){
    var it = ex.passengersFollowing[j];
    if(it && it.srv && byId[it.srv.id]) it.p = byId[it.srv.id];
  }
  var c = window._combat;
  if(!c || !c.active || c.sceneType !== 'foot' || !Array.isArray(c.allies)) return;
  var pool = [];
  for(var k = 0; k < ex.passengersFollowing.length; k++){
    var pp = ex.passengersFollowing[k].p;
    if(!pp) continue;
    if(pp.ammoBox && pp.ammoBox.ammoId && typeof AMMO !== 'undefined' && AMMO[pp.ammoBox.ammoId]){
      pool.push({ cal: AMMO[pp.ammoBox.ammoId].cal, id: pp.ammoBox.ammoId, rarity: pp.ammoBox.rarity || '一般', count: pp.ammoBox.count || 0, _src: pp.ammoBox });
    }
    if(pp.primaryWeapon && typeof AMMO !== 'undefined' && AMMO[pp.primaryWeapon] && (pp.primaryWeaponBoxCount > 0)){
      pool.push({ cal: AMMO[pp.primaryWeapon].cal, id: pp.primaryWeapon, rarity: pp.primaryWeaponRarity || '一般', count: pp.primaryWeaponBoxCount, _isAmmoHandlerBox: true, _ownerP: pp });
    }
  }
  for(var m = 1; m < c.allies.length; m++){
    var a = c.allies[m];
    if(!a || !a.isPassenger || !a.srv) continue;
    var lp = byId[a.srv.id];
    if(!lp) continue;
    a.ammoPouch = lp.ammoPouch || null;
    a.ammoBox = lp.ammoBox || null;
    a._publicPool = pool;
  }
};

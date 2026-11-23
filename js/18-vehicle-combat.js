
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

function _getPartProbForVid(vid){
  return _VEHICLE_PART_PROB_BY_VID[vid] || _VEHICLE_PART_PROB_BY_VID.t80;
}

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
  bmp3m:   { ammoRack: 0.15, crew: 0.20, engine: 0.17, tracks: 0.12, gun: 0.18, turret: 0.18 },
  t80:     { ammoRack: 0.20, crew: 0.18, engine: 0.16, tracks: 0.12, gun: 0.16, turret: 0.18 },
  t80b:    { ammoRack: 0.20, crew: 0.18, engine: 0.16, tracks: 0.12, gun: 0.16, turret: 0.18 },
  t80bv:   { ammoRack: 0.20, crew: 0.18, engine: 0.16, tracks: 0.12, gun: 0.16, turret: 0.18 },
  t80u:    { ammoRack: 0.20, crew: 0.18, engine: 0.16, tracks: 0.12, gun: 0.16, turret: 0.18 },
  t80uk:   { ammoRack: 0.20, crew: 0.18, engine: 0.16, tracks: 0.12, gun: 0.16, turret: 0.18 },
  t80um:   { ammoRack: 0.20, crew: 0.18, engine: 0.16, tracks: 0.12, gun: 0.16, turret: 0.18 }
};

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
/* rev-fix-splash-v2 */
const VEHICLE_SPLASH = {
  '3of26':       { blastPen: 30, maxR: 20, mainR: 4,   burstHeight: 0, splashRatio: 0.50 },
  '3of26_ainet': { blastPen: 30, maxR: 34, mainR: 4,   burstHeight: 4, splashRatio: 0.50 },
  '3uof17':      { blastPen: 25, maxR: 18, mainR: 3,   burstHeight: 0, splashRatio: 0.50 },
  'og15v':       { blastPen: 20, maxR: 14, mainR: 2.5, burstHeight: 0, splashRatio: 0.40 },
  '3bk29':       { blastPen: 18, maxR: 12, mainR: 2,   burstHeight: 0, splashRatio: 0.35 },
  'pg15v':       { blastPen: 12, maxR: 9,  mainR: 2,   burstHeight: 0, splashRatio: 0.35 },
  '9m14':        { blastPen: 16, maxR: 11, mainR: 2,   burstHeight: 0, splashRatio: 0.35 },
  '9m113':       { blastPen: 16, maxR: 11, mainR: 2,   burstHeight: 0, splashRatio: 0.35 },
  '9m112':       { blastPen: 16, maxR: 11, mainR: 2,   burstHeight: 0, splashRatio: 0.35 },
  '9m119m':      { blastPen: 18, maxR: 12, mainR: 2,   burstHeight: 0, splashRatio: 0.35 },
  '9m117m1':     { blastPen: 18, maxR: 12, mainR: 2,   burstHeight: 0, splashRatio: 0.35 },
  '30mm_hef':    { blastPen: 4,  maxR: 5,  mainR: 1.5, burstHeight: 0, splashRatio: 0.20 }
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
function _applyVehicleSplash(sp, impactWorldX, baseDmg, directPenMM, ratioMult, wid, usedAmmoId, directTarget){
  /* rev-veh-direct: 濺射只負責「直擊目標以外」的單位。
     直擊本身由 _onBTRFire 以全額 finalDmg + 完整穿深結算 ——
     舊實作直擊時 return 掉，只留 35~50% 濺射預算 × 覆蓋率 × falloff，
     這就是 73 / 100 / 125 HE 與導彈傷害遠低於預期的根因。 */
  const c = window._combat;
  const ex = window._explore;
  if(!c || !sp) return;
  const maxR = sp.maxR;
  const maxDmg = baseDmg * sp.splashRatio * (ratioMult || 1.0);
  if(!(maxDmg > 0)) return;
  const ctx = window._hitCtx;
  const _hasDirect = !!(directTarget && ctx && ctx.isDirect && typeof ctx.x === 'number');
  const P = _hasDirect
    ? { x: ctx.x, y: ctx.y, z: (typeof ctx.z === 'number') ? ctx.z : 0 }
    : { x: impactWorldX, y: (typeof sp.burstHeight === 'number') ? sp.burstHeight : 0, z: (ctx && typeof ctx.z === 'number') ? ctx.z : 0 };
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
      /* Boss 走統一 Boss 管線（盾 / 弱點 / 甲階段）；
         bossTarget 的 hp / armor 是唯讀 getter，嚴禁回寫。 */
      res = window._applyExplosionToBox(enemy, P, {
        totalDmg: maxDmg, maxR: maxR,
        penFor: function(part, dNear, falloff){ return sp.blastPen * falloff; },
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
        totalDmg: maxDmg, maxR: maxR,
        penFor: function(part, dNear, falloff){ return sp.blastPen * falloff; },
        applyBand: function(part, dmg, pen){
          return applyDamage(proxy, dmg, pen, { part: part, armorProvider: function(p){ return (typeof getEnemyArmorMMForPart === 'function') ? getEnemyArmorMMForPart(enemy, p) : 0; } });
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
            if(_spMainW) _applyVehicleSplash(_spMainW, hitX, baseDmg, penMM, 1.0, wid, _usedAmmoId, null);
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
          if(_spMainW) _applyVehicleSplash(_spMainW, hitX, baseDmg, penMM, 1.0, wid, _usedAmmoId, tgt);
          if(tgt.hp <= 0) _onBTRKillTarget(tgt, wid, c, _usedAmmoId);
        },
        onMiss: function(impactX, impactY){
        const _spMissW = _getVehicleSplashParams(wid, _usedAmmoId, _mixIsHE, _preset30, _isAinet);
        if(_spMissW && target){
          _applyVehicleSplash(_spMissW, impactX, baseDmg, penMM, 0.6, wid, _usedAmmoId);
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
  var cal = (typeof window._rpg27Cal === 'function') ? window._rpg27Cal() : 105;
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
]);
function _vIsHeatAmmo(ammoId){
  return _HEAT_AMMO_SET.has(ammoId);
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

window._vHitVehicle = function(veh, dmg, penMM, ammoId, attackerName, weaponName, weaponRarity, attackerRarity, bulletSpeed, bulletCaliber){
  const vid = veh.vehicleId;
  /* rev-arena: 硬杀拦截判定（伤害计算前）；拦截成功写日志 */
  if(!(window._hitCtx && window._hitCtx._noArena) && _tryArenaIntercept(vid, bulletSpeed, bulletCaliber)){
    if(typeof pushLog === 'function'){
      var _wLabel = weaponName || '來襲彈藥';
      var _aLabel = attackerName || '';
      var _wCls = (typeof rarityClass === 'function') ? rarityClass(weaponRarity || '一般') : '';
      var _aHtml = attackerName ? ((typeof rarityClass === 'function') ? ('<span class="' + (rarityClass(attackerRarity || '一般')) + '">' + attackerName + '</span>') : attackerName) : '';
      pushLog('<span class="run">APS</span> 攔截 ' + (_aHtml ? (_aHtml + ' 的 ') : '') + '<span class="' + _wCls + '">' + _wLabel + '</span>', [], 'explore');
    }
    return { penetrated: false, intercepted: true };
  }
  const d = _vEnsureDamage(vid);
  /* rev-fix-veh-float-abs: 浮字统一用载具绝对世界坐标（v316 契约），避免 clamp 到屏幕左边缘 */
  const _vehWX = (veh && typeof veh.worldX === 'number') ? veh.worldX : 0;
  if(attackerName || weaponName){
    var _atkRar = attackerRarity || '一般';
    var _atkNameRaw = attackerName || '???';
    var _atkNameHtml = (typeof rarityClass === 'function') ? ('<span class="' + rarityClass(_atkRar) + '">' + _atkNameRaw + '</span>') : _atkNameRaw;
    d.lastAttacker = { name: _atkNameRaw, nameHtml: _atkNameHtml, weapon: weaponName || '???', rarity: weaponRarity || '一般' };
  }
  /* rev-7part: 分車型部位權重 + 一次算完 ERA */
  const part = { key: _vPartKeyFromCtx(veh) }; /* rev-box3d: 幾何定部位，刪權重隨機 */
  const isHeat = _vIsHeatAmmo(ammoId);
/* rev-era-coverage: 爆反是離散塊，掛載率 <1 時部分命中落在縫隙 → 只算基礎等效。
   未標 eraCoverage 的部位預設 1（T-80 系行為不變）。 */
const _layC = (typeof VEHICLE_ARMOR_LAYOUT !== 'undefined' && VEHICLE_ARMOR_LAYOUT[vid]) ? VEHICLE_ARMOR_LAYOUT[vid][part.key] : null;
const _covC = (_layC && _layC.era && typeof _layC.eraCoverage === 'number') ? Math.max(0, Math.min(1, _layC.eraCoverage)) : 1;
const _eraHitC = (_covC >= 1) || (Math.random() < _covC);
const armorMM = _vGetArmor(vid, part.key, isHeat, !_eraHitC);

  /* 載具無護甲池：diff <= 0 直接 0，diff > 0 按剩餘穿深/原穿深 */
  const _diff = penMM - armorMM;
  if(_diff <= 0){
    if(typeof _vehicleCombatFloat === 'function'){
      _vehicleCombatFloat(_vehWX, _diff === 0 ? '磨穿' : '跳彈', 'armor');
    }
    return { penetrated: false, damage: 0 };
  }
  dmg = Math.max(1, Math.round(dmg * (_diff / penMM)));

const key = _vPickInternalKey(vid);
  d.lastHit = { part: part.key, internal: key, dmg: dmg };

  if(key === 'ammoRack'){
    d.ammoRackDamage += dmg;
    _vehicleCombatFloat(_vehWX, '彈藥架 -' + Math.round(dmg), 'crit');
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
    const _st = window._getLiveStation();
    const _cap = (window.CARRIER_CAPACITY && window.CARRIER_CAPACITY[vid]) ? window.CARRIER_CAPACITY[vid] : 0;
    var _roster = (typeof window._vehicleRosterMap === 'function') ? window._vehicleRosterMap() : [];
for(var _ri = 0; _ri < _roster.length; _ri++){
var _rr = _roster[_ri];
if(_rr.srv && _rr.srv.hp > 0) pool.push({ t: 'passenger', srv: _rr.srv, p: _rr.p });
}if(!pool.length) return { penetrated: true, part: part.key, internal: '乘員', damage: 0 };
    const tgt = pool[Math.floor(Math.random() * pool.length)];

    if(tgt.t === 'crew'){
      /* v140: 扣實際 servant.hp，members 只存 1/0 */
      const _crewSidX = _st && _st.crew ? _st.crew[tgt.r] : null;
      const _crewSrvX = _crewSidX ? (state.servants || []).find(function(s){ return s.id === _crewSidX; }) : null;
      if(_crewSrvX){
        _crewSrvX.hp = Math.max(0, (_crewSrvX.hp || 0) - dmg * 1.5);
        d.members[tgt.r] = _crewSrvX.hp > 0 ? 1 : 0;
      } else {
        d.members[tgt.r] = 0;
      }
      _vehicleCombatFloat(_vehWX, '乘員 -' + Math.round(dmg * 1.5), 'crit');
      if(tgt.r === 'driver' && d.members.driver <= 0){
        const _drvId = _st && _st.crew ? _st.crew.driver : null;
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
        const _gnrId = _st && _st.crew ? _st.crew.gunner : null;
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
        const _cmdId = _st && _st.crew ? _st.crew.commander : null;
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
      _vehicleCombatFloat(_vehWX, '玩家 -' + Math.round(dmg * 1.5), 'crit');
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
      _vehicleCombatFloat(_vehWX, '載員 -' + Math.round(_res2.hpLost), 'crit');
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
  _vehicleCombatFloat(_vehWX, '-' + Math.round(dmg), '');
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
      if(d.weapons[_wid] && window._isWeaponHpAlive(vid, _wid)) _weaponIds.push(_wid);
    }
    if(_weaponIds.length === 0){
      return { penetrated: true, part: part.key, internal: '武器', damage: 0 };
    }
    const _widHit = _weaponIds[Math.floor(Math.random() * _weaponIds.length)];
    const _wPrev = d.weapons[_widHit].hp;
    d.weapons[_widHit].hp = Math.max(0, _wPrev - dmg);
    _vehicleCombatFloat(_vehWX, '-' + Math.round(dmg), '');
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
      pushLog('載具<span class="run">彈藥架</span><span class="lose">殉爆</span>（玩家已下車，無人員傷亡）', [], 'explore');
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
      pushLog((_la.nameHtml || _la.name) + ' 用 <span class="' + _wClsDet + '">' + _la.weapon + '</span> 引發<span class="run">彈藥架</span><span class="lose">殉爆</span>，<span class="lose">全員重傷</span>', [], 'explore');
    } else {
      pushLog('載具<span class="run">彈藥架</span><span class="lose">殉爆</span>，<span class="lose">全員重傷</span>', [], 'explore');
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
  } else if(reason === 'crew_dead'){
    if(typeof pushLog === 'function') pushLog('載具 炮手、車長 <span class="lose">陣亡</span>', [], 'explore');
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
  const _brokenParts = [];
  for(const _pk in _dmg.parts){ if(_dmg.parts[_pk] <= 0) _brokenParts.push(_pk); }
  const _deadMembers = [];
  for(const _mk in _dmg.members){ if(_dmg.members[_mk] <= 0) _deadMembers.push(_mk); }
  /* 加入隨車載員統計 */
  var _rosterL = (typeof window._vehicleRosterMap === 'function') ? window._vehicleRosterMap() : [];
for(var _rl = 0; _rl < _rosterL.length; _rl++){
var _srvL = _rosterL[_rl].srv;
if(_srvL && (_srvL.hp <= 0 || (_srvL.injuredUntil && _srvL.injuredUntil > Date.now()))){
_deadMembers.push('passenger_' + (_rl + 1));
}
}const _reasonText = reason === 'detonated' ? '彈藥架殉爆' : '車體擊毀';
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
  /* rev-fix-vd-redesign: 去表格化，改用 logline 风格（一行一属性）。
   * 原版用 detail-title r-傳奇（金色不合适）+ 多个 stat-line（左标签右值），
   * 视觉上像表格，与游戏其他 modal（BTR 支援报告、战斗日志）不一致。 */
  if(!log || !log.vehicleDestroyed) return;
  const d = log.vehicleDestroyed;
  const vid = d.vehicleId;
  const vehName = (typeof VEHICLES !== 'undefined' && VEHICLES[vid]) ? VEHICLES[vid].name : vid;
  const reasonMap = { detonated: '彈藥架殉爆', hull_destroyed: '車體擊毀' };
  const reason = reasonMap[d.reason] || d.reason;
  let body = '';
  body += '<div class="detail-title">💥 ' + vehName + ' · ' + reason + '</div>';
  body += '<div class="divider"></div>';
  if(d.lastHit){
    const _partNameMap = {
      hullUpperFront: '車體首上', hullLowerFront: '車體首下',
      hullSide: '車體側面',       hullRear: '車體後部',
      turretFront: '炮塔正面',    turretSide: '炮塔側面', turretRear: '炮塔後部',
      /* 兼容舊 key */
      hullFront: '車體正面',      side: '側面',          rear: '後面'
    };
    const partName = _partNameMap[d.lastHit.part] || d.lastHit.part;
    const internalName = { ammoRack: '彈藥架', crew: '乘員', engine: '引擎', tracks: '履帶/輪組', gun: '炮管', turret: '炮塔' }[d.lastHit.internal] || d.lastHit.internal;
    body += '<div class="logline" style="padding:6px 0">致命一擊：<span style="color:#e8a33d">' + partName + '</span> → <span style="color:#e05252">' + internalName + '</span>，造成 <span style="color:#e8a33d;font-weight:bold">' + Math.round(d.lastHit.dmg) + '</span> 傷害</div>';
  }
  if(d.brokenParts && d.brokenParts.length){
    const partLabel = { engine: '引擎', tracks: '履帶/輪組', gun: '炮管', turret: '炮塔' };
    body += '<div class="logline" style="padding:6px 0;color:#e05252">損壞部件：' + d.brokenParts.map(function(p){ return partLabel[p] || p; }).join(' · ') + '</div>';
  }
  if(d.deadMembers && d.deadMembers.length){
    const memberLabel = { driver: '駕駛', gunner: '炮手', commander: '車長', player: '玩家' };
    body += '<div class="logline" style="padding:6px 0;color:#e05252">陣亡成員：' + d.deadMembers.map(function(m){
      if(m.indexOf('passenger_') === 0) return '載員 ' + m.replace('passenger_', '#');
      return memberLabel[m] || m;
    }).join(' · ') + '</div>';
  }
  if(d.ammoRackDamage > 0){
    body += '<div class="logline" style="padding:6px 0;color:#7a6f60">彈藥架累計傷害：<span style="color:#e8a33d">' + Math.round(d.ammoRackDamage) + '</span></div>';
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
var pr = _getPartProbForVid(vid), w = {};
for(var i = 0; i < pr.length; i++) w[pr[i].key] = pr[i].w;
var sumF = (w.hullUpperFront || 0) + (w.hullLowerFront || 0) + (w.turretFront || 0);
if(!(sumF > 0)) sumF = 1;
var lo = (w.hullLowerFront || 0) / sumF;
var tl = lo + (w.hullUpperFront || 0) / sumF;
if(!(tl > lo)) tl = Math.min(0.95, lo + 0.3);
var out;
if(facing === 'front'){
out = [{part:'hullLowerFront',lo:0,hi:lo},{part:'hullUpperFront',lo:lo,hi:tl},{part:'turretFront',lo:tl,hi:1}];
} else if(facing === 'rear'){
out = [{part:'hullRear',lo:0,hi:tl},{part:'turretRear',lo:tl,hi:1}];
} else {
out = [{part:'hullSide',lo:0,hi:tl},{part:'turretSide',lo:tl,hi:1}];
}
_V_FACE_BANDS_CACHE[key] = out;
return out;
};
/* 直擊部位：優先用引擎幾何判定結果（_hitCtx.part），否則按落點推導 */
function _vPartKeyFromCtx(veh){
var vid = veh && veh.vehicleId;
var layout = (typeof VEHICLE_ARMOR_LAYOUT !== 'undefined') ? VEHICLE_ARMOR_LAYOUT[vid] : null;
var ctx = window._hitCtx;
if(ctx && typeof ctx.part === 'string' && layout && layout[ctx.part]) return ctx.part;
var box = (typeof window._getTargetBox === 'function') ? window._getTargetBox(veh) : null;
if(ctx && box && typeof ctx.x === 'number'){
var twx = (typeof veh.worldX === 'number') ? veh.worldX : 0;
var facing = (ctx.x > twx + box.L / 2) ? 'front' : ((ctx.x < twx - box.L / 2) ? 'rear' : 'side');
var r = (typeof ctx.y === 'number') ? (ctx.y - box.yFoot) / box.H : 0.3;
var bands = window._vGetFaceBands(vid, facing);
for(var i = 0; i < bands.length; i++){ if(r < bands[i].hi) return bands[i].part; }
return bands[bands.length - 1].part;
}
return 'hullLowerFront';
}
window._vPartKeyFromCtx = _vPartKeyFromCtx;
/* 載具受濺射統一入口（敵人載具尚未實裝，先備好；逐帶回呼 _vHitVehicle 走完內部損傷） */
window._vApplyExplosionToVehicle = function(veh, P, opts){
  if(!veh || !veh.isVehicle || !P || !opts) return null;
  var agg = { hpLost:0, armorLost:0, penetrated:0, bands:[] };
  var res = window._applyExplosionToBox(veh, P, {
    totalDmg: opts.totalDmg, maxR: opts.maxR,
    penFor: opts.penFor || function(){ return opts.pen || 0; },
    applyBand: function(part, dmg, pen, R){
      var prev = window._hitCtx;
      /* rev-splash-band-y: 命中高度 = 該帶實際覆蓋區間中心。
         爆心在地面時 P.y=0，會把火花畫到畫布下方外（實測 ny 1.138）。 */
      var _by = (R && typeof R.yLo === 'number' && typeof R.yHi === 'number') ? (R.yLo + R.yHi) / 2 : P.y;
      window._hitCtx = { target:veh, part:part, x:P.x, y:_by, z:P.z || 0, isDirect:false, _noArena:true };
      var r = null;
      try {
        r = window._vHitVehicle(veh, dmg, pen, opts.ammoId || 'unknown', opts.attackerName, opts.weaponName, opts.weaponRarity, opts.attackerRarity, opts.bulletSpeed, opts.bulletCaliber);
      } catch(e){}
      window._hitCtx = prev;
      if(r && r.penetrated) agg.penetrated++;
      agg.bands.push({ part:part, dmg:dmg, pen:pen, result:r });
      return { hpLost:0, armorLost:(r && r.penetrated) ? 0 : Math.round(dmg) };
    }
  });
  agg.coverage = res ? res.coverage : 0;
  agg.dNear = res ? res.dNear : Infinity;
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

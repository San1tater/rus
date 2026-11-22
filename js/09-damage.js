'use strict';

const HIT_PART_WEIGHTS = [
  { part:'head',  pct:15 },
  { part:'face',  pct:15 },
  { part:'top',   pct:40 },
  { part:'other', pct:30 }
];

/* ===== rev-box3d: 步兵高度分段（依人偶繪製方塊比例，兩位小數） =====
   other=腿方塊 0.42 / top=軀幹方塊 0.42 / face=臉方塊 0.13 / head=頭-臉 0.04
   總判定高 1.01 歸一化後取兩位小數 */
const HIT_PART_SEGMENTS = [
{ part:'other', lo:0.00, hi:0.42 },
{ part:'top',   lo:0.42, hi:0.83 },
{ part:'face',  lo:0.83, hi:0.96 },
{ part:'head',  lo:0.96, hi:1.00 }
];
window.HIT_PART_SEGMENTS = HIT_PART_SEGMENTS;
function _partFromYRatio(r){
if(!(r >= 0)) return 'other';
if(r >= 1) return 'head';
for(var i = 0; i < HIT_PART_SEGMENTS.length; i++){
if(r < HIT_PART_SEGMENTS[i].hi) return HIT_PART_SEGMENTS[i].part;
}
return 'head';
}
window._partFromYRatio = _partFromYRatio;
/* rev-box3d-deprecated: 幾何路徑已不使用；僅供未遷移呼叫方（後院/Boss）過渡。
   分佈改為與高度分段一致，階段 2 遷移完後刪除。 */


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

/* rev-veh-faction: 我方單位唯一判準（含載具）。
   逐幀碰撞與飛行結束兜底共用，避免兩處列舉漂移导致載具被敵彈跳過。 */
window._isAllyUnit = function(t){
  return !!(t && (t.isPlayer || t.isPassenger || t.isGuard || t.isVehicle));
};
function applyDamage(target, rawDmg, penetration, armorOpts){
let armorLevel = 0, armorMMOverride = null, armorProvider = null, optPart = null;
if(armorOpts && typeof armorOpts === 'object'){
armorProvider = armorOpts.armorProvider || null;
armorMMOverride = (armorOpts.armorMMOverride != null) ? armorOpts.armorMMOverride : null;
armorLevel = armorOpts.armorLevel || 0;
optPart = armorOpts.part || null;
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
/* rev-box3d: 部位由幾何決定 —— 顯式 part > _hitCtx.part > top（近戰等無幾何來源）
   只接受步兵四段 key，避免載具內部乘員結算誤讀載具部位 key */
var _cp = (window._hitCtx && typeof window._hitCtx.part === 'string') ? window._hitCtx.part : null;
if(_cp !== 'head' && _cp !== 'face' && _cp !== 'top' && _cp !== 'other') _cp = null;
const part = optPart || _cp || 'top';
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
result.hpLost = hpDmg; result.finalDmg = hpDmg; result.overkill = true;
return result;
}
armorMMVal = armorMM;
} else {
if(pool <= 0){
const hpDmg = Math.round(rawDmg * 1.2);
target.hp = Math.max(0, Math.round((target.hp || 0) - hpDmg));
result.hpLost = hpDmg; result.finalDmg = hpDmg; result.overkill = true;
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
result.armorLost = armorLost; result.hpLost = hpDmg; result.finalDmg = hpDmg;
if((target.armor || 0) <= 0) result.overkill = true;
} else {
const armorDmg = pen > 0 ? Math.round(rawDmg * (pen / armorMMVal)) : 0;
const armorLost = Math.min(pool, armorDmg);
target.armor = Math.max(0, pool - armorLost);
result.armorLost = armorLost; result.finalDmg = armorLost;
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
}
/* ============================================================
   rev-box3d: 統一長方體 L(X 螢幕水平) × H(Y) × D(Z 垂直螢幕)
   步兵/載員/玩家：2D AABB = 側面，D = 現有寬度
   載具：2D AABB = 純側面，L = 車長，D = 現實正面寬
   Boss：2D AABB = 正面 billboard，D = 螢幕寬，L = 身體深度
   ============================================================ */
window._getTargetBox = function(tgt){
  if(!tgt) return null;
  var a = window._getTargetAABB(tgt);
  if(!a) return null;
  var L = (typeof a.width === 'number' && a.width > 0) ? a.width : 0.5;
  var H = (typeof a.height === 'number' && a.height > 0) ? a.height : 1.7;
  var D = (typeof a.depth === 'number' && a.depth > 0) ? a.depth : 0;
  /* rev-scatter-box: Boss 是正面 billboard，部位由 (u,v) 決定。
     若套用人形標定的 σ，命中率會趨近 100% 且落點擠在中心 → 弱點機制失效。
     標記 _selfCal，scatter 對它維持「按自身盒自校準」。 */
  var _selfCal = false;
  if(tgt.isVehicle){
    var vd = (typeof window.VEHICLE_DIM !== 'undefined') ? window.VEHICLE_DIM[tgt.vehicleId] : null;
    if(vd){ if(vd.height > 0) H = vd.height; if(vd.frontWidth > 0) D = vd.frontWidth; }
    if(!(D > 0)) D = 3.0;
    if(typeof window.getVehicleHalfLengthWorld === 'function'){
      L = 2 * window.getVehicleHalfLengthWorld(tgt.vehicleId);
    }
  } else if(tgt.isBoss){
    if(!(D > 0)) D = L;
    L = (typeof a.bodyDepth === 'number' && a.bodyDepth > 0) ? a.bodyDepth : D;
    _selfCal = true;
  } else {
    if(!(D > 0)) D = L;
  }
  return { L:L, H:H, D:D, yFoot:(typeof tgt.y === 'number' ? tgt.y : 0), _selfCal:_selfCal };
};
/* 標準正態反函數（Acklam 有理近似），取代舊分檔表 */
function _normInv(p){
if(!(p > 0) || !(p < 1)) return 0;
var a=[-3.969683028665376e+01,2.209460984245205e+02,-2.759285104469687e+02,1.383577518672690e+02,-3.066479806614716e+01,2.506628277459239e+00];
var b=[-5.447609879822406e+01,1.615858368580409e+02,-1.556989798598866e+02,6.680131188771972e+01,-1.328068155288572e+01];
var c=[-7.784894002430293e-03,-3.223964580411365e-01,-2.400758277161838e+00,-2.549732539343734e+00,4.374664141464968e+00,2.938163982698783e+00];
var d=[7.784695709041462e-03,3.224671290700398e-01,2.445134137142996e+00,3.754408661907416e+00];
var pl=0.02425,q,r;
if(p<pl){q=Math.sqrt(-2*Math.log(p));return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);}
if(p>1-pl){q=Math.sqrt(-2*Math.log(1-p));return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);}
q=p-0.5;r=q*q;
return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q/(((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);
}
/* 3D 散佈：Y / Z 雙軸獨立，聯合通過率 ≈ hr（P_y = P_z = √hr）
   tFace = 近邊緣距離 / 總距離 —— 在近邊緣平面標定，保證名義命中率不隨距離漂移
   連射 accum 同時作用 Y 與 Z（舊模型只作用 Y） */
/* ===== rev-scatter-iso: 各向同性散佈 —— 散佈屬於射手，不屬於目標 =====
   舊式 sY=box.H/(2z), sZ=box.D/(2z)：分子是目標自己的尺寸 → 大目標配大散佈，
   通過率恆為 [2Φ(z)−1]²，H/D 完全對消，車大車小一樣難打中（違反物理直覺）。
   新式：σ 只由 hr 決定，對參考人形盒（H=1.7, D=0.5）標定，使
       [2Φ(H/(2σ))−1] · [2Φ(D/(2σ))−1] = hr
   → 步兵命中率守恆；載具迎彈面大 → 命中率自然升高。
   下表於 patch 時二分求解並逐點回代驗證（maxErr < 1e-4），執行期 O(1) 查表。
   索引 0 ↔ hr=1%，索引 98 ↔ hr=99%。單位：米。 */
window._SCATTER_SIGMA_M = [
  3.660214,2.575433,2.092356,1.802887,1.604302,1.456928,1.341765,1.24842,1.170663,
  1.104504,1.047252,0.997016,0.952424,0.912453,0.876322,0.843423,0.813275,0.785491,
  0.759757,0.735813,0.713444,0.692469,0.672735,0.65411,0.636483,0.619756,0.603844,
  0.588674,0.574181,0.560308,0.547004,0.534223,0.521926,0.510077,0.498643,0.487595,
  0.476906,0.466554,0.456517,0.446775,0.437311,0.428108,0.419153,0.410432,0.401933,
  0.393644,0.385557,0.377662,0.369952,0.362417,0.355052,0.347851,0.340807,0.333916,
  0.327173,0.320573,0.314111,0.307785,0.30159,0.295523,0.289579,0.283756,0.278049,
  0.272456,0.266973,0.261595,0.256319,0.251141,0.246058,0.241064,0.236157,0.23133,
  0.226581,0.221904,0.217294,0.212746,0.208256,0.203817,0.199424,0.195071,0.190752,
  0.18646,0.182188,0.177926,0.173667,0.1694,0.165114,0.160795,0.156427,0.151989,
  0.147458,0.142801,0.137976,0.132923,0.127553,0.121729,0.115203,0.107465,0.097056
];
window._scatterSigmaM = function(hrN){
  var T = window._SCATTER_SIGMA_M;
  var p = Math.min(99, Math.max(1, hrN * 100));
  var lo = Math.max(1, Math.min(98, Math.floor(p)));
  var f = Math.max(0, Math.min(1, p - lo));
  return T[lo-1] + (T[lo] - T[lo-1]) * f;
};
window._calcWeaponScatter3D = function(weaponRange, hr, burstCount, burstFactor, box, tFace){
  var hrN = Math.min(0.99, Math.max(0.01, (hr || 50) / 100));
  var bf = burstFactor || 0;
  var accum = Math.min(1 + ((burstCount || 1) - 1) * bf, 1 + bf * 10);
  /* tf 僅作近緣平面投影補償：sy·tf 後對消 → 距離軸維持關閉 */
  var tf = (typeof tFace === 'number' && tFace > 0.05) ? Math.min(1, tFace) : 1;
  if(box && box.H > 0 && box.D > 0){
    if(box._selfCal){
      /* Boss：按自身盒自校準，保弱點 UV 分佈 */
      var z = _normInv((1 + Math.sqrt(hrN)) / 2);
      if(!(z > 0.05)) z = 0.05;
      var sY = box.H / (2 * z * tf);
      var sZ = box.D / (2 * z * tf);
      return { sx:0, sy:_gaussRand()*sY*accum, sz:_gaussRand()*sZ*accum, baseScatter:sZ, accum:accum };
    }
    /* rev-scatter-iso: 各向同性 σ（與 box.H / box.D 無關）→ 尺寸決定命中率 */
    var sig = window._scatterSigmaM(hrN) / tf;
    return { sx:0, sy:_gaussRand()*sig*accum, sz:_gaussRand()*sig*accum, baseScatter:sig, accum:accum };
  }
  var bs = (weaponRange || 15) * (1 - hrN) / 2;
  return { sx:0, sy:(Math.random()*2-1)*bs*accum, sz:(Math.random()*2-1)*bs*accum, baseScatter:bs, accum:accum };
};;

/* 瞄準點 Y（目標局部座標，腳底=0） */
window._getWeaponAimY = function(weaponId, ammoId, vid){
  if(ammoId && typeof AMMO !== 'undefined' && AMMO[ammoId] && typeof AMMO[ammoId].aimY === 'number'){
    return AMMO[ammoId].aimY;
  }
  /* 具名武器 id（base_mag_scope_grip）先解析回 baseId，否則改裝後瞄準參數全部失效 */
  var _wid = weaponId;
  if(_wid && typeof parseNamedId === 'function'){
    var _p = parseNamedId(_wid);
    if(_p && _p.baseId) _wid = _p.baseId;
  }
  if(_wid && typeof WEAPONS !== 'undefined' && WEAPONS[_wid] && typeof WEAPONS[_wid].aimY === 'number'){
    return WEAPONS[_wid].aimY;
  }
  if(_wid && typeof window.getVehicleWeaponAimY === 'function'){
    return window.getVehicleWeaponAimY(_wid);
  }
  return 0.85;
};

/* 連發累積係數 */
window._getWeaponBurstFactor = function(weaponId, vid){
  var _wid = weaponId;
  if(_wid && typeof parseNamedId === 'function'){
    var _p = parseNamedId(_wid);
    if(_p && _p.baseId) _wid = _p.baseId;
  }
  if(_wid && typeof WEAPONS !== 'undefined' && WEAPONS[_wid] && typeof WEAPONS[_wid].burstFactor === 'number'){
    return WEAPONS[_wid].burstFactor;
  }
  if(_wid && vid && typeof window.getVehicleWeaponBurst === 'function'){
    return window.getVehicleWeaponBurst(vid, _wid);
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



/* 預判點 */
window._predictTargetPoint = function(tgtWorldX, tgtVx, flightSec){
  return (tgtWorldX || 0) + (tgtVx || 0) * (flightSec || 0);
};

/* 發射一次 */
window._weaponFire = function(cfg){
  /* rev-range-gate: 射程是硬閘門，不是散佈參數。
     術語鎖：A 對 B 開火 ⟺ dist ≤ R_B 且 dist ≤ A 自身射程。
     呼叫端若用靜態武器射程放行（例如敵人主武器耗盡切到手槍），
     這裡用「本次實際武器」的 weaponRange 做最後把關，超射程不產生彈體。
     判定採近邊緣語義（dist - L/2），與 canEngage 的中心距閘門相容且更寬，
     不會誤殺任何已由呼叫端放行的合法射擊。 */
  if(!cfg || !cfg.owner || !cfg.target) return null;
  var _t = cfg.target;
  var _twx = (typeof cfg.targetWorldX === 'number') ? cfg.targetWorldX : (_t.worldX || 0);
  var _tvx = (typeof cfg.targetVx === 'number') ? cfg.targetVx : (_t._vx || 0);
  var _ty  = (typeof cfg.targetY === 'number') ? cfg.targetY : (_t.y || 0);
  var _dist = Math.abs(_twx - (cfg.startX || 0));
  var _aabb = window._getTargetAABB(_t);
  var _box  = window._getTargetBox(_t);
  var _rngGate = (typeof cfg.weaponRange === 'number' && cfg.weaponRange > 0) ? cfg.weaponRange : Infinity;
  var _halfL = (_box && _box.L > 0) ? _box.L / 2 : 0;
  if(_dist - _halfL > _rngGate) return null;
  var _spd  = cfg.flightSpeed || 800;
/* rev-flight-closing: 飛行時間 = 實際路徑長 / 彈速。
   終點是預判點，故用閉合速度求解 T = |dx| / (spd - sign(dx)*vx)，
   與 impactX 同一分母 —— 否則抵達閘門會系統性偏移。
   目標逃逸快於彈速時退回舊式（不會永遠追不上）。 */
var _dx0 = _twx - (cfg.startX || 0);
var _sgn0 = (_dx0 < 0) ? -1 : 1;
var _tvx0 = (typeof _tvx === 'number' && isFinite(_tvx)) ? _tvx : 0;
var _close0 = _spd - _sgn0 * _tvx0;
var _flightSec = (_close0 > 1)
? Math.max(0.016, Math.abs(_dx0) / _close0)
: Math.max(0.016, _dist / _spd);
  var _predictX = window._predictTargetPoint(_twx, _tvx, _flightSec);
  var _bf = (typeof cfg.burstFactor === 'number') ? cfg.burstFactor : window._getWeaponBurstFactor(cfg.weaponId, cfg.vid);
  var _tFace = 1;
  if(_box && _dist > 0.01) _tFace = Math.max(0.05, (_dist - _box.L / 2) / _dist);
  var _scat = window._calcWeaponScatter3D(cfg.weaponRange || 15, cfg.hr || 50, cfg.burstCount || 1, _bf, _box, _tFace);
  var _aimYLocal = (typeof cfg.aimY === 'number') ? cfg.aimY : window._getWeaponAimY(cfg.weaponId, cfg.ammoId, cfg.vid);
  var _impactX = _predictX;
  var _impactY = _ty + _aimYLocal + _scat.sy;
  var _impactZ = ((typeof cfg.aimZ === 'number') ? cfg.aimZ : 0) + _scat.sz;
  var _bullet = {
    owner: cfg.owner,
    weaponId: cfg.weaponId,
    ammoId: cfg.ammoId,
    isGrenade: !!cfg.isGrenade,
    startX: cfg.startX || 0,
    startY: (typeof cfg.startY === 'number') ? cfg.startY : 1.5,
    startZ: (typeof cfg.startZ === 'number') ? cfg.startZ : 0,
    impactX: _impactX,
    impactY: _impactY,
    impactZ: _impactZ,
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
    targetBox: _box,
    onHit: cfg.onHit,
    onMiss: cfg.onMiss,
    onTracer: cfg.onTracer || null,
    muzzleN: cfg.muzzleN || null,
    tracerColor: cfg.tracerColor || null,
    tracerRarity: cfg.tracerRarity || null,
    isRPG: !!cfg.isRPG,
    isEnemyBullet: !!cfg.isEnemyBullet,
    _resolved: false,
    _hitDetected: false
  };
  _wbsGet(cfg.owner).push(_bullet);
  return _bullet;
};;

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
var _box = window._getTargetBox(_t) || b.targetBox;
var _dist = Math.abs((_t.worldX || 0) - (b.startX || 0));
var _tFace = 1;
if(_box && _dist > 0.01) _tFace = Math.max(0.05, (_dist - _box.L / 2) / _dist);
var _scat = window._calcWeaponScatter3D(b.weaponRange, b.hr, b.burstCount, b.burstFactor, _box, _tFace);
/* rev-guided-aim-center: 制導更新與首發同一瞄準基準（載具＝判定盒幾何中心） */
var _aimYLocal = (_t.isVehicle && _box && _box.H > 0) ? _box.H / 2 : window._getWeaponAimY(b.weaponId, b.ammoId, null);
var _ty = (typeof _t.y === 'number') ? _t.y : b.targetSnapshotY;
b.targetBox = _box;
b.impactX = _predictX;
b.impactY = _ty + _aimYLocal + _scat.sy;
b.impactZ = _scat.sz;
};;

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
/* 線段 vs 近邊緣 Y-Z 平面（rev-box3d）。dir>0 → x1；dir<0 → x2
   回傳 {t,x,y,z,face}；face x2=正面（車頭朝右）, x1=後面 */
function _raySegFrontFace(sx, sy, sz, ex, ey, ez, twx, box){
var dx = ex - sx;
if(Math.abs(dx) < 1e-9) return null;
var xNear = (dx > 0) ? (twx - box.L / 2) : (twx + box.L / 2);
var t = (xNear - sx) / dx;
if(!(t >= 0 && t <= 1)) return null;
var yN = sy + (ey - sy) * t;
var zN = sz + (ez - sz) * t;
if(yN < box.yFoot || yN > box.yFoot + box.H) return null;
if(Math.abs(zN) > box.D / 2) return null;
return { t:t, x:xNear, y:yN, z:zN, face:(dx > 0 ? 'x1' : 'x2') };
}
/* 面 → 高度帶。載具查 _vGetFaceBands（由現有正面權重推導），步兵四段 */
function _bandsForTarget(tgt, box, face){
if(tgt && tgt.isVehicle && typeof window._vGetFaceBands === 'function'){
var facing = (face === 'x2') ? 'front' : ((face === 'x1') ? 'rear' : 'side');
var b = window._vGetFaceBands(tgt.vehicleId, facing);
if(b && b.length) return b;
}
return HIT_PART_SEGMENTS;
}

function _partFromHit(tgt, box, r, face, z){
/* rev-bossbox: Boss 的 2D AABB 是正面 billboard，部位由 (u,v) 決定 */
if(tgt && tgt.isBoss){
if(typeof window._bossPartFromUV === 'function'){
var u = (box.D > 0) ? (((typeof z === 'number') ? z : 0) / box.D + 0.5) : 0.5;
return window._bossPartFromUV(tgt, u, r);
}
return 'body';
}
if(tgt && tgt.isVehicle){
var bands = _bandsForTarget(tgt, box, face);
for(var i = 0; i < bands.length; i++){ if(r < bands[i].hi) return bands[i].part; }
return bands[bands.length - 1].part;
}
return _partFromYRatio(r);
}


/* 每幀檢測碰撞 + 結算 */
window._tickWeaponBullets = function(owner, dt, allTargets){
  var _bullets = _wbsGet(owner);
  if(!_bullets.length) return;
  var now = performance.now();
  /* rev-box3d: 命中結算集中在此，_hitCtx 同步傳遞部位/落點給場景層 */
  function _settle(b, tgt, box, hit){
    b._resolved = true; b._hitDetected = true;
    var _r = (hit.y - box.yFoot) / box.H;
    var _part = _partFromHit(tgt, box, _r, hit.face, hit.z);
    window._hitCtx = { target:tgt, part:_part, x:hit.x, y:hit.y, z:hit.z, face:hit.face, isDirect:true, bullet:b };
    var _vh = (typeof window._getTargetHitVisualWorld === 'function') ? window._getTargetHitVisualWorld(tgt) : null;
    var _dxT = b.impactX - b.startX;
    var _tC = 0.5;
    if(Math.abs(_dxT) > 1e-6){
      _tC = ((typeof tgt.worldX === 'number' ? tgt.worldX : hit.x) - b.startX) / _dxT;
      if(!isFinite(_tC)) _tC = 0.5;
      if(_tC < 0) _tC = 0; if(_tC > 3) _tC = 3;
    }
    var _tracerX = _vh ? _vh.wx : (b.startX + _dxT * _tC);
    var _tracerY = _vh ? _vh.wy : (b.startY + (b.impactY - b.startY) * _tC);
    window._hitCtx = { target:tgt, part:_part, x:hit.x, y:hit.y, z:hit.z, face:hit.face, isDirect:true, bullet:b };
    if(typeof b.onTracer === 'function'){
      try { b.onTracer(_tracerX, _tracerY, tgt, _part); } catch(e){ console.warn('[wpTrace]', e); }
    }
    if(b.isEnemyBullet && !b.isRPG){
      var _ccE = (owner && owner.tracers) ? owner : window._combat;
      if(_ccE && _ccE.sm && _ccE.tracers){
        var _pWXe = (_ccE.allies && _ccE.allies[0]) ? _ccE.allies[0].worldX : 0;
        var _chfe = (typeof CHAR_HEIGHT_FACTOR === 'number') ? CHAR_HEIGHT_FACTOR : 0.58;
        var _phme = (typeof PLAYER_HEIGHT_M === 'number') ? PLAYER_HEIGHT_M : 1.7;
        var _srcXe = (b.muzzleN && typeof b.muzzleN.x === 'number') ? b.muzzleN.x : EXPLORE_HERO_X_RATIO + ((b.startX || 0) - _pWXe) / _ccE.sm.screenRightWorld * (1 - EXPLORE_HERO_X_RATIO);
        var _srcYe = (b.muzzleN && typeof b.muzzleN.y === 'number') ? b.muzzleN.y : 0.95 - (b.startY || 1.3) * (_chfe / _phme);
        var _tipXe;
        if(tgt && tgt.isPassenger && tgt.srv){
          var _pfArrE = (window._explore && window._explore.passengersFollowing) || [];
          var _foundE = false;
          for(var _iE = 0; _iE < _pfArrE.length; _iE++){
            if(_pfArrE[_iE].srv && _pfArrE[_iE].srv.id === tgt.srv.id){ _tipXe = _pfArrE[_iE].screenX; _foundE = true; break; }
          }
          if(!_foundE){ _tipXe = EXPLORE_HERO_X_RATIO + (_tracerX - _pWXe) / _ccE.sm.screenRightWorld * (1 - EXPLORE_HERO_X_RATIO); }
        } else {
          _tipXe = EXPLORE_HERO_X_RATIO + (_tracerX - _pWXe) / _ccE.sm.screenRightWorld * (1 - EXPLORE_HERO_X_RATIO);
        }
        var _tipYe = 0.95 - _tracerY * (_chfe / _phme);
        _ccE.tracers.push({ sx:_srcXe, sy:_srcYe, tx:_tipXe, ty:_tipYe, born:performance.now(), dur:200, color:(b.tracerColor || '#ffb300'), hit:true, _target:tgt });
      }
    }
    if(typeof b.onHit === 'function'){
      try { b.onHit(_tracerX, _tracerY, tgt, _part, { x:hit.x, y:hit.y, z:hit.z, face:hit.face }); }
      catch(e){ console.warn('[wpHit]', e); }
    }
    window._hitCtx = null;
  }
  for(var i = _bullets.length - 1; i >= 0; i--){
    var b = _bullets[i];
    if(b._resolved){ _bullets.splice(i, 1); continue; }
    if(b.guidanceMode !== 'none') window._updateGuidedBullet(b, now);
    var _elapsed = (now - b.startTime) / 1000;
    var _progress = Math.min(1, _elapsed / b.flightTimeSec);
    var _sz = (typeof b.startZ === 'number') ? b.startZ : 0;
    var _ez = (typeof b.impactZ === 'number') ? b.impactZ : 0;
    /* rev-aps-pre-decide: 幾何相交（與 progress 無關）即決策。
       攔截面在車頭前 2m、比 hit.t 早；若等 progress>=hit.t 才決策，
       中間幀尾煙已噴過攔截面。決策只一次，結果快取在彈體。 */
    var _rayHit = null, _rayTgt = null, _rayBox = null;
    if(!b.isGrenade){
      var _cand = [];
      if(allTargets && allTargets.length){
        for(var ti = 0; ti < allTargets.length; ti++) _cand.push(allTargets[ti]);
      }
      if(b.target && _cand.indexOf(b.target) < 0) _cand.push(b.target);
      for(var ci = 0; ci < _cand.length; ci++){
        var tgt = _cand[ci];
        if(!tgt || tgt.hp <= 0) continue;
        var _tgtIsAlly = window._isAllyUnit(tgt);
        if(b.isEnemyBullet){ if(!_tgtIsAlly) continue; } else { if(_tgtIsAlly) continue; }
        var box = (tgt === b.target && b.targetBox) ? b.targetBox : window._getTargetBox(tgt);
        if(!box) continue;
        var twx = (typeof tgt.worldX === 'number') ? tgt.worldX : 0;
        var hit = _raySegFrontFace(b.startX, b.startY, _sz, b.impactX, b.impactY, _ez, twx, box);
        if(hit && (!_rayHit || hit.t < _rayHit.t)){ _rayHit = hit; _rayTgt = tgt; _rayBox = box; }
      }
    }
    var _aps = null;
    if(_rayHit && _rayTgt === b.target && _rayTgt.isVehicle){
      if(b._apsDone){ _aps = b._apsHit ? { t:b._apsT, wx:b._apsWX } : null; }
      else if(typeof window._apsDecide === 'function'){
        try { _aps = window._apsDecide(b, _rayHit); } catch(e){ _aps = null; }
      }
    }
    var _best = (_rayHit && _progress >= _rayHit.t) ? _rayHit : null;
    /* rev-trail-stop-at-impact: 尾煙上限 = 終端事件（攔截面優先於車頭面） */
    var _tEnd = (_aps && typeof _aps.t === 'number') ? Math.min(_progress, _aps.t)
              : (_best ? Math.min(_progress, _best.t) : _progress);
    var _mvD = (window.MISSILE_VISUAL && b.ammoId) ? window.MISSILE_VISUAL[b.ammoId] : null;
    if(_mvD && b.ammoId !== '9m14'){
      var _ccT = (owner && owner.sm) ? owner : window._combat;
      if(_ccT && _ccT.sm){
        var _t0T = (typeof b._trailT === 'number') ? b._trailT : 0;
        var _PD = (_mvD.smoke === 'tracer') ? window._RPG27 : window.MISSILE_TRAIL;
        if(typeof window._rpgTrailDeposit === 'function') window._rpgTrailDeposit(_ccT, b, _t0T, _tEnd, _PD);
        b._trailT = _tEnd;
      }
    }
    /* 攔截成立：以攔截面上的虛擬命中走原結算鏈（onHit → _vHitVehicle 讀快取 → 攔截日誌） */
    if(_aps && typeof _aps.t === 'number' && _progress >= _aps.t){
      var _ftA = _aps.t;
      _settle(b, _rayTgt, _rayBox, {
        t: _ftA,
        x: _aps.wx,
        y: b.startY + (b.impactY - b.startY) * _ftA,
        z: _sz + (_ez - _sz) * _ftA,
        face: _rayHit.face
      });
      _bullets.splice(i, 1); continue;
    }
    if(_best){ _settle(b, _rayTgt, _rayBox, _best); _bullets.splice(i, 1); continue; }
    if(_progress >= 1){
      b._resolved = true;
      window._hitCtx = { target:b.target, part:null, x:b.impactX, y:b.impactY, z:_ez, isDirect:false, bullet:b };
      if(typeof b.onMiss === 'function'){
        try { b.onMiss(b.impactX, b.impactY, _ez, b); } catch(e){ console.warn('[wpMiss]', e); }
      }
      window._hitCtx = null;
      var _groundX = b.impactX, _groundY = b.impactY;
      var _sxM = (typeof b.startX === 'number') ? b.startX : 0;
      var _syM = (typeof b.startY === 'number') ? b.startY : 1.3;
      var _dxM2 = b.impactX - _sxM, _dyM2 = b.impactY - _syM;
      var _ccMM = (owner && owner.sm) ? owner : window._combat;
      var _pWXMM = (_ccMM && _ccMM.allies && _ccMM.allies[0]) ? _ccMM.allies[0].worldX : 0;
      var _srwMM = (_ccMM && _ccMM.sm) ? _ccMM.sm.screenRightWorld : 2;
      var _hrMM = (typeof EXPLORE_HERO_X_RATIO === 'number') ? EXPLORE_HERO_X_RATIO : 0.25;
      var _rightWX = _pWXMM + _srwMM;
      var _leftWX = _pWXMM - _srwMM * _hrMM / Math.max(0.05, 1 - _hrMM);
      var _tEdge = 200;
      if(Math.abs(_dxM2) > 1e-6){
        _tEdge = (_dxM2 > 0) ? ((_rightWX - _sxM) / _dxM2) : ((_leftWX - _sxM) / _dxM2);
        if(!isFinite(_tEdge) || _tEdge < 1) _tEdge = 200;
        if(_tEdge > 200) _tEdge = 200;
      }
      var _tGround2 = Infinity;
      if(_dyM2 < -1e-6 && _syM > 0) _tGround2 = _syM / (-_dyM2);
      var _tAct = Math.min(_tEdge, _tGround2);
      _groundX = _sxM + _dxM2 * _tAct;
      _groundY = Math.max(0, _syM + _dyM2 * _tAct);
      if(b.isEnemyBullet && !b.isRPG){
        var _ccM = (owner && owner.tracers) ? owner : window._combat;
        if(_ccM && _ccM.sm && _ccM.tracers){
          var _pWXm = (_ccM.allies && _ccM.allies[0]) ? _ccM.allies[0].worldX : 0;
          var _chfm = (typeof CHAR_HEIGHT_FACTOR === 'number') ? CHAR_HEIGHT_FACTOR : 0.58;
          var _phmm = (typeof PLAYER_HEIGHT_M === 'number') ? PLAYER_HEIGHT_M : 1.7;
          var _srcXm = (b.muzzleN && typeof b.muzzleN.x === 'number') ? b.muzzleN.x : EXPLORE_HERO_X_RATIO + ((b.startX || 0) - _pWXm) / _ccM.sm.screenRightWorld * (1 - EXPLORE_HERO_X_RATIO);
          var _srcYm = (b.muzzleN && typeof b.muzzleN.y === 'number') ? b.muzzleN.y : 0.95 - (b.startY || 1.3) * (_chfm / _phmm);
          var _tipXm = EXPLORE_HERO_X_RATIO + (_groundX - _pWXm) / _ccM.sm.screenRightWorld * (1 - EXPLORE_HERO_X_RATIO);
          var _tipYm = 0.95 - _groundY * (_chfm / _phmm);
          _ccM.tracers.push({ sx:_srcXm, sy:_srcYm, tx:_tipXm, ty:_tipYm, born:performance.now(), dur:200, color:(b.tracerColor || '#ffb300'), hit:false, _target:null });
        }
      }
      _bullets.splice(i, 1);
    }
  }
};;

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
  /* rev-incoming-visual: 載具命中 / 曳光落點 = 實際繪製的車體中心。
     舊版用 AABB centerY × 世界 ppm → 落點低於實繪車體（打車底空氣）。 */
  if(!target) return null;
  var _footY = (typeof target.y === 'number') ? target.y : 0;
  var _wx = (typeof target.worldX === 'number') ? target.worldX : 0;
  if(target.isBoss){
    var _c = window._hitCtx;
    var _box = (typeof window._getTargetBox === 'function') ? window._getTargetBox(target) : null;
    var _hz = (_c && typeof _c.z === 'number') ? _c.z : 0;
    var _hy = (_c && typeof _c.y === 'number') ? _c.y : (_footY + ((_box && _box.H > 0) ? _box.H * 0.5 : 1.0));
    return { wx: _wx + _hz, wy: _hy };
  }
  if(target.isVehicle){
/* rev-veh-hit-visual: 載具命中視覺 = 實繪車體在該命中高度的右側像素邊緣。
   判定盒車頭（worldX + 半車長）恆在畫面外，整圖 bbox 右緣是砲管尖，兩者都不是彈著點。
   取實繪螢幕位置後反投影回世界米，下游曳光 / 爆炸沿用既有公式即落在同一點。
   步兵分支不受影響；飄字位置不經此函式，亦不受影響。 */
var _hpV = (typeof window._vehicleHitScreenPos === 'function')
? window._vehicleHitScreenPos(target.vehicleId, (window._hitCtx && typeof window._hitCtx.y === 'number') ? window._hitCtx.y : null)
: null;
if(_hpV){
var _cV = window._combat;
var _camV = (_cV && _cV.allies && _cV.allies[0] && typeof _cV.allies[0].worldX === 'number') ? _cV.allies[0].worldX : _wx;
var _srV = (_cV && _cV.sm && _cV.sm.screenRightWorld) || 2;
var _hrV = (typeof EXPLORE_HERO_X_RATIO === 'number') ? EXPLORE_HERO_X_RATIO : 0.25;
var _chfV = (typeof CHAR_HEIGHT_FACTOR === 'number') ? CHAR_HEIGHT_FACTOR : 0.58;
var _phmV = (typeof PLAYER_HEIGHT_M === 'number') ? PLAYER_HEIGHT_M : 1.7;
return {
wx: _camV + (_hpV.nx - _hrV) / Math.max(0.05, 1 - _hrV) * _srV,
wy: _footY + (0.95 - _hpV.ny) * _phmV / _chfV
};
}
var _ay = (typeof window._vehicleAimWorldY === 'function') ? window._vehicleAimWorldY() : null;
if(_ay != null) return { wx: _wx, wy: _footY + _ay };
var _aabb = (typeof window.getVehicleAABB === 'function') ? window.getVehicleAABB(target.vehicleId) : null;
return { wx: _wx, wy: _footY + ((_aabb && _aabb.centerY) ? _aabb.centerY : 1.2) };
}
  return { wx: _wx, wy: _footY + 1.163 };
};;
;

/* ============================================================
   rev-box3d: 統一爆炸覆蓋引擎（手雷 / 載具 HE / RPG 濺射 / 未來載具受濺射）
   每個暴露面獨立算：可達 u/v 範圍用 maxR 球裁剪 → 張角占比 fu / fv
   帶分配 = fu × (該高度帶張角 / 全 v 張角)，Σ帶 = fu·fv = 覆蓋率
   falloff = 1 - (dNear/maxR)²，dNear = P 到該面矩形最近點距離（邊緣距離）
   多面總量封頂 totalDmg。n=0（正下方）時 atan2 自然退化 → 全額進最低帶
   ============================================================ */
window._applyExplosionToBox = function(tgt, P, opts){
if(!tgt || !P || !opts) return null;
var box = window._getTargetBox(tgt);
if(!box) return null;
if(tgt.isBoss && typeof window._bossExplode === 'function') return window._bossExplode(tgt, P, opts, box);
var maxR = (typeof opts.maxR === 'number' && opts.maxR > 0) ? opts.maxR : 8;
var total = (typeof opts.totalDmg === 'number' && opts.totalDmg > 0) ? opts.totalDmg : 0;
if(total <= 0) return null;
var twx = (typeof tgt.worldX === 'number') ? tgt.worldX : 0;
var x1 = twx - box.L / 2, x2 = twx + box.L / 2;
var v0 = box.yFoot, v1 = box.yFoot + box.H, hz = box.D / 2;
var px = (typeof P.x === 'number') ? P.x : twx;
var py = (typeof P.y === 'number') ? P.y : 0;
var pz = (typeof P.z === 'number') ? P.z : 0;
var dx = (px < x1) ? (x1 - px) : ((px > x2) ? (px - x2) : 0);
var dz = (pz < -hz) ? (-hz - pz) : ((pz > hz) ? (pz - hz) : 0);
var fx = (px > x2) ? 'x2' : 'x1';
var fz = (pz > 0) ? 'z2' : 'z1';
var faces = [];
if(dx > 1e-6) faces.push({ face:fx, n:dx, u0:-hz, u1:hz, pu:pz });
if(dz > 1e-6) faces.push({ face:fz, n:dz, u0:x1, u1:x2, pu:px });
if(!faces.length) faces.push({ face:fz, n:0, u0:x1, u1:x2, pu:px });
var raw = [], sum = 0, minNear = Infinity;
for(var fi = 0; fi < faces.length; fi++){
var F = faces[fi], n = F.n;
if(n >= maxR) continue;
var rho = Math.sqrt(Math.max(0, maxR * maxR - n * n));
var ua = Math.max(F.u0, F.pu - rho), ub = Math.min(F.u1, F.pu + rho);
var va = Math.max(v0, py - rho), vb = Math.min(v1, py + rho);
if(ub <= ua || vb <= va) continue;
var thU = Math.atan2(F.u1 - F.pu, n) - Math.atan2(F.u0 - F.pu, n);
var thV = Math.atan2(v1 - py, n) - Math.atan2(v0 - py, n);
if(!(thU > 1e-9) || !(thV > 1e-9)) continue;
var fu = (Math.atan2(ub - F.pu, n) - Math.atan2(ua - F.pu, n)) / thU;
if(!(fu > 0)) continue;
var du = Math.max(F.u0 - F.pu, 0, F.pu - F.u1);
var dv = Math.max(v0 - py, 0, py - v1);
var dNear = Math.sqrt(n * n + du * du + dv * dv);
if(dNear >= maxR) continue;
if(dNear < minNear) minNear = dNear;
var falloff = 1 - (dNear / maxR) * (dNear / maxR);
if(falloff <= 0) continue;
var bands = _bandsForTarget(tgt, box, F.face);
for(var bi = 0; bi < bands.length; bi++){
var B = bands[bi];
var ba = Math.max(va, v0 + B.lo * box.H), bb = Math.min(vb, v0 + B.hi * box.H);
if(bb <= ba) continue;
var frac = fu * (Math.atan2(bb - py, n) - Math.atan2(ba - py, n)) / thV;
if(!(frac > 0)) continue;
var amt = total * frac * falloff;
if(amt <= 0) continue;
raw.push({ part:B.part, face:F.face, frac:frac, falloff:falloff, dNear:dNear, dmg:amt, yLo:ba, yHi:bb });
sum += amt;
}
}
if(!raw.length) return { hpLost:0, armorLost:0, bands:[], dNear:minNear, coverage:0 };
var scale = (sum > total) ? (total / sum) : 1;
var out = { hpLost:0, armorLost:0, bands:[], dNear:minNear, coverage:sum / total };
for(var ri = 0; ri < raw.length; ri++){
var R = raw[ri];
var dmg = R.dmg * scale;
if(dmg < 0.5) continue;
var pen = (typeof opts.penFor === 'function') ? opts.penFor(R.part, R.dNear, R.falloff, R.face) : (opts.pen || 0);
var r = (typeof opts.applyBand === 'function') ? opts.applyBand(R.part, dmg, pen, R) : null;
var hl = (r && r.hpLost) || 0, al = (r && r.armorLost) || 0;
out.bands.push({ part:R.part, face:R.face, dmg:dmg, pen:pen, hpLost:hl, armorLost:al });
out.hpLost += hl; out.armorLost += al;
}
return out;
};

/* ===== rev-incoming-rig:start =====
   來襲彈道修補（不改 _enemyFire / _enemyFireRPG 本體）：
   1. weaponId='rpg' 強制 isRPG=true → 火箭本體 + 尾煙 + 命中爆炸，不再畫成曳光線。
   2. 目標為載具且未指定 aimY → 注入實繪車體中心（世界米），
      槍彈曳光 / 火箭飛行線 / 命中特效全部落在車體上。 */
(function(){
'use strict';
if(window.__incomingRig) return;
window.__incomingRig = true;
var _wf = window._weaponFire;
window._weaponFire = function(cfg){
  if(cfg){
    if(cfg.weaponId === 'rpg' && !cfg.isRPG) cfg.isRPG = true;
    if(cfg.target && cfg.target.isVehicle && typeof cfg.aimY !== 'number'){
      /* rev-aim-box-center: 物理瞄準點 = 判定盒幾何中心 H/2。
         舊版 _vehicleAimWorldY() 走角色 ppm（與載具 ppm 差 18%）+ sinkOffset，
         瞄點偏低約 0.3m。視覺落點由 _hitCtx.y → _vehicleHitScreenPos 決定，與瞄準點解耦。 */
      var _bxA = (typeof window._getTargetBox === 'function') ? window._getTargetBox(cfg.target) : null;
      if(_bxA && _bxA.H > 0){ cfg.aimY = _bxA.H / 2; }
      else {
        var ay = (typeof window._vehicleAimWorldY === 'function') ? window._vehicleAimWorldY() : null;
        if(ay != null) cfg.aimY = ay;
      }
    }
  }
  return _wf.apply(this, arguments);
};
})();
/* ===== rev-incoming-rig:end ===== */

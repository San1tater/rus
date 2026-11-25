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
/* ===== rev-tissue-chain:start =====
   統一穿透／毀傷結算 —— 人與車內人員同一條式子，不按目標類型分支。
     R    = penMM − 部位護甲等效
     path = min(部件弦長, R / 組織阻力)
     HP  -= rawDmg × (path / 參考弦長) × 部位脆弱係數
   rawDmg（呼叫端已乘稀有度倍率與暴擊）＝「對無甲參考軀幹完整貫穿」的傷害，
   是輸入錨不是派生量：無甲滿穿時 path = 參考弦長、係數 1 → 恰好等於 rawDmg。
   舊 ×1.2 無甲加成已移除 —— 無甲不再額外放大。
   穿深與毀傷脫鉤：組織幾乎不擋（TISSUE_F 極小）但極脆弱（係數高）。
   頭／臉同一部件、同一係數，只有護甲查詢鍵不同（頭盔 vs 面罩）。
   心肺是軀幹的高度子區，共用軀幹護甲，不另立 HP 欄位。
   護甲耐久歸零 → 該部位失效，等同無甲（沿用舊語義）。 */
const TISSUE_F = 0.015;
const REF_CHORD_MM = 240;
const BODY_CHORD_MM = { other:140, top:240, chest:240, face:195, head:195 };
const BODY_VULN     = { other:0.3, top:1.0, chest:3.0, face:4.0, head:4.0 };
const CHEST_RATIO_LO = 0.62, CHEST_RATIO_HI = 0.79;
/* rev-body-ctx-owner: 高度子區只認「屬於該目標」的命中幾何。
   乘員／載員／濺射分支的受損目標不是 ctx.target（ctx 指的是載具），
   舊版把載具命中高度當人體比例 → T-80UM 炮塔帶 y1.74–2.20 被判心肺，傷害 ×3。
   目標不符時一律用呼叫端顯式 part，不從別人的 y 推斷。 */
function _bodyPartKey(part, ctx, target){
  if(part !== 'top') return part;
  if(!ctx || typeof ctx.y !== 'number') return 'top';
/* rev-ctx-is-geom-truth: ctx.target 是幾何唯一真相源，受損物件可以是值代理
   （_resolveSingleAttack 建 {hp,armor}）。舊身分守衛使所有步槍路徑的心肺
   子區永失效；它防的「載具高度當人體比例」在 18 重寫後已不經 applyDamage。 */
  var t = ctx.target || target;
  var ab = (t && typeof window._getTargetAABB === 'function') ? window._getTargetAABB(t) : null;
  var H = (ab && ab.height > 0) ? ab.height : 1.7;
  var foot = (t && typeof t.y === 'number') ? t.y : 0;
  var r = (ctx.y - foot) / H;
  return (r >= CHEST_RATIO_LO && r < CHEST_RATIO_HI) ? 'chest' : 'top';
}
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
const result = { armorLost:0, hpLost:0, finalDmg:0, overkill:false, part:null };
const pool = Math.max(0, Math.round(target.armor || 0));
const ctx = window._hitCtx || null;
let armorMM = null, partForCalc = optPart || null;
if(armorProvider){
var _cp = (ctx && typeof ctx.part === 'string') ? ctx.part : null;
if(_cp !== 'head' && _cp !== 'face' && _cp !== 'top' && _cp !== 'other') _cp = null;
const part = optPart || _cp || 'top';
result.part = part; partForCalc = part;
const mm = armorProvider(part);
if(mm != null && isFinite(mm)) armorMM = mm;
} else if(armorMMOverride !== null){
armorMM = armorMMOverride;
}
if(armorMM === null) armorMM = ARMOR_LEVEL_TO_MM[armorLevel] || 1;
if(!partForCalc) partForCalc = (ctx && typeof ctx.part === 'string') ? ctx.part : 'top';
if(partForCalc !== 'head' && partForCalc !== 'face' && partForCalc !== 'top' && partForCalc !== 'other') partForCalc = 'top';
const effMM = (pool > 0) ? Math.max(0, armorMM) : 0;
const pen = penetration || 0;
const R = pen - effMM;
if(effMM > 0 && pool > 0){
const al = (R > 0) ? Math.round(rawDmg) : (pen > 0 ? Math.round(rawDmg * pen / effMM) : 0);
const lost = Math.min(pool, Math.max(0, al));
target.armor = Math.max(0, pool - lost);
result.armorLost = lost;
if(target.armor <= 0) result.overkill = true;
}
if(R <= 0){ result.finalDmg = result.armorLost; return result; }
const key = _bodyPartKey(partForCalc, ctx, target);
const chord = BODY_CHORD_MM[key] || REF_CHORD_MM;
const vuln = BODY_VULN[key] || 1;
const path = Math.min(chord, R / TISSUE_F);
const hpDmg = Math.round(rawDmg * (path / REF_CHORD_MM) * vuln);
target.hp = Math.max(0, Math.round((target.hp || 0) - hpDmg));
result.hpLost = hpDmg;
result.finalDmg = hpDmg;
return result;
}
/* ===== rev-tissue-chain:end ===== */

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
  /* Boss 是正面 billboard，部位由 (u,v) 經 _bossPartFromUV 決定。 */
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
  } else {
    if(!(D > 0)) D = L;
  }
  return { L:L, H:H, D:D, yFoot:(typeof tgt.y === 'number' ? tgt.y : 0) };
};
/* 標準正態反函數（Acklam 有理近似），取代舊分檔表 */
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
/* ===== rev-aim-model:start ===== */
/* 命中 = 四項獨立誤差疊加。
   ★ 單位契約：本區塊所有 σ 一律 mrad（1σ），只有 _aim 與最終 plane 是米。
     v1 曾把 shooter 表存成弧度，與 gun/recoil/move 的 mrad 相加 → 射手項被
     機械散佈淹沒，所有 hr 命中恆等。此處統一為 mrad 並外露自檢入口。
     σ_aim     瞄準點誤判（米，與距離無關；平台穩定度決定）
     σ_shooter 射手熟練（mrad，對真實人體輪廓標定）
     σ_gun     武器機械散佈（mrad，與射手無關）
     σ_recoil  後坐累積 = 20·bf_eff·√(n−1)（平方和，不乘總 σ）
     σ_move    行進間炮口擾動 = stab·(v/19.4)
   σ_θ = √(shooter²+gun²+recoil²+move²)/1000  → rad
   σ_plane = √(σ_aim²+(R·σ_θ)²)               → m
   ★ 標定必須含該平台參考武器的 gun，否則回代時再疊 gun 會系統性偏高
     （車載 shooter 0.25 與 gun 0.3 同量級，偏差最大）。
   舊 _SCATTER_SIGMA_M（米）與 3σ 截斷造成的載具恆 100% 一併失效。
   Boss 不再 _selfCal：σ_aim 是絕對量，弱點命中率自然隨 hr 變化。 */
var _AIM_PLATFORM = {
  handheld:{ ref:50,  aim:0.15, rangeErr:0.20, gun:0.5 },
  tripod:  { ref:150, aim:0.08, rangeErr:0.15, gun:0.8 },
  vehicle: { ref:500, aim:0.03, rangeErr:0.02, gun:0.3 }
};
var _AIM_K_RECOIL = 20;
var _AIM_REF_SPEED = 19.4;
var _AIM_HUMAN_HW = { other:0.14, top:0.20, face:0.08, head:0.09 };
var _AIM_SIL = null;
window._humanSilhouetteBands = function(){
if(_AIM_SIL) return _AIM_SIL;
var H = 1.7, out = [];
var segs = (typeof HIT_PART_SEGMENTS !== 'undefined') ? HIT_PART_SEGMENTS : null;
if(segs && segs.length){
for(var i=0;i<segs.length;i++){ var s=segs[i];
out.push({ part:s.part, y0:s.lo*H, y1:s.hi*H, hw:(_AIM_HUMAN_HW[s.part]||0.20) }); } }
if(!out.length) out=[{part:'top',y0:0,y1:1.7,hw:0.20}];
_AIM_SIL = out; return out;
};
function _aimErf(x){
var s = x<0 ? -1 : 1; x = Math.abs(x);
var t = 1/(1+0.3275911*x);
var y = 1-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-0.284496736)*t+0.254829592)*t*Math.exp(-x*x);
return s*y; }
function _aimPhi(z){ return 0.5*(1+_aimErf(z/Math.SQRT2)); }
function _aimBandP(y0,y1,hw,aimY,sig){
if(!(sig>0)) return 0;
var py=_aimPhi((y1-aimY)/sig)-_aimPhi((y0-aimY)/sig);
var pz=2*_aimPhi(hw/sig)-1;
return Math.max(0,py)*Math.max(0,pz); }
window._aimSilP = function(aimY,sig){
var B=window._humanSilhouetteBands(), s=0;
for(var i=0;i<B.length;i++) s+=_aimBandP(B[i].y0,B[i].y1,B[i].hw,aimY,sig);
return Math.min(1,s); };
var _AIM_SIG_TABLE = {};
/* 回傳 mrad。二分上限 200 mrad；目標不可達（hr 高於 σ_aim 上限）時自然收斂到 0。 */
function _aimShooterSigma(plat,hrN){
var P=_AIM_PLATFORM[plat]||_AIM_PLATFORM.handheld;
var T=_AIM_SIG_TABLE[plat];
if(!T){ T=_AIM_SIG_TABLE[plat]=[];
for(var h=1;h<=99;h++){
var lo=0, hi=200, tg=h/100;
for(var it=0;it<60;it++){ var mid=(lo+hi)/2;
var tot=Math.sqrt(mid*mid+P.gun*P.gun)/1000;
var sg=Math.sqrt(P.aim*P.aim+(P.ref*tot)*(P.ref*tot));
if(window._aimSilP(0.85,sg)>tg) lo=mid; else hi=mid; }
T.push((lo+hi)/2); } }
var p=Math.min(99,Math.max(1,hrN*100));
var lo2=Math.max(1,Math.min(98,Math.floor(p)));
var f=Math.max(0,Math.min(1,p-lo2));
return T[lo2-1]+(T[lo2]-T[lo2-1])*f; }
window._aimShooterSigmaMrad = _aimShooterSigma;
window._aimPlatformSpec = function(p){ return _AIM_PLATFORM[p]||_AIM_PLATFORM.handheld; };
function _aimGunSigma(o){
var wid=o.weaponId;
if(wid && typeof parseNamedId==='function'){ var p=parseNamedId(wid); if(p&&p.baseId) wid=p.baseId; }
var A=(typeof WEAPON_DISPERSION_MRAD!=='undefined')?WEAPON_DISPERSION_MRAD:null;
if(A&&wid&&typeof A[wid]==='number') return A[wid];
var V=(typeof VEHICLE_WEAPON_DISPERSION_MRAD!=='undefined')?VEHICLE_WEAPON_DISPERSION_MRAD:null;
if(V&&wid&&typeof V[wid]==='number') return V[wid];
var T=(typeof WEAPON_TYPE_DISPERSION_MRAD!=='undefined')?WEAPON_TYPE_DISPERSION_MRAD:null;
var ty=o.weaponType;
if(!ty&&wid&&typeof WEAPONS!=='undefined'&&WEAPONS[wid]) ty=WEAPONS[wid].type;
if(T&&ty&&typeof T[ty]==='number') return T[ty];
return 0.5; }
window._aimGunSigmaMrad = _aimGunSigma;
window._aimMults = function(o){
var am=1, re=1, bm=1;
if(o.scope&&typeof SCOPE_AIM_MULT!=='undefined'&&typeof SCOPE_AIM_MULT[o.scope]==='number') am=SCOPE_AIM_MULT[o.scope];
if(o.scope&&typeof SCOPE_RANGE_ERR_MULT!=='undefined'&&typeof SCOPE_RANGE_ERR_MULT[o.scope]==='number') re=SCOPE_RANGE_ERR_MULT[o.scope];
if(o.scope&&typeof SCOPE_BURST_MULT!=='undefined'&&typeof SCOPE_BURST_MULT[o.scope]==='number') bm*=SCOPE_BURST_MULT[o.scope];
if(o.grip&&typeof GRIP_RECOIL_MULT!=='undefined'&&typeof GRIP_RECOIL_MULT[o.grip]==='number') bm*=GRIP_RECOIL_MULT[o.grip];
if(o.mode&&typeof MODE_BURST_MULT!=='undefined'&&typeof MODE_BURST_MULT[o.mode]==='number') bm*=MODE_BURST_MULT[o.mode];
return { aim:am, rangeErr:re, burst:bm }; };
window._calcWeaponScatter3D = function(weaponRange, hr, burstCount, burstFactor, box, tFace, opts){
opts = opts || {};
var hrN = Math.min(0.99, Math.max(0.01, (hr||50)/100));
var plat = opts.platform || 'handheld';
var P = _AIM_PLATFORM[plat] || _AIM_PLATFORM.handheld;
var M = window._aimMults(opts);
/* 以下四項全部 mrad */
var sg  = _aimShooterSigma(plat,hrN)*M.aim;
var gun = _aimGunSigma(opts);
var bf  = (typeof burstFactor==='number') ? burstFactor : 0;
var n   = Math.max(1, burstCount||1);
var rec = _AIM_K_RECOIL*bf*M.burst*Math.sqrt(n-1);
var stab= (typeof opts.stabMrad==='number') ? opts.stabMrad : 0;
var spd = (typeof opts.shooterSpeed==='number') ? Math.abs(opts.shooterSpeed) : 0;
var mv  = stab*Math.min(1, spd/_AIM_REF_SPEED);
var th  = Math.sqrt(sg*sg+gun*gun+rec*rec+mv*mv)/1000;
var dist= (typeof opts.dist==='number'&&opts.dist>0) ? opts.dist : (weaponRange||15);
var aim = P.aim*M.aim;
var plane = Math.sqrt(aim*aim+(dist*th)*(dist*th));
/* tf：近緣平面補償 —— sy·tf 後於入射面恰好等於 plane，距離軸不被投影吃掉 */
var tf = (typeof tFace==='number'&&tFace>0.05) ? Math.min(1,tFace) : 1;
var sig = plane/tf;
return { sx:0, sy:_gaussRand()*sig, sz:_gaussRand()*sig,
baseScatter:sig, sigmaPlane:plane, sigmaTheta:th, sigmaAim:aim,
sigmaShooter:sg, sigmaGun:gun, sigmaRecoil:rec, sigmaMove:mv, accum:1,
platform:plat, rangeErr:P.rangeErr*M.rangeErr };
};
/* ===== rev-aim-model:end ===== */


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
/* ===== rev-fire-aim:start ===== */
/* 發射一次 —— 命中層唯一入口。
   平台／瞄具／握把／模式／炮架由 cfg 或裝備定義推導，呼叫端不需改。
   測距誤差只進「預測飛行時間」→ 表現為領前誤差；實際飛行仍用真幾何。
   高速彈此項可忽略，慢彈對快目標才顯著（RPG 打行進載具）。 */
window._weaponFire = function(cfg){
if(!cfg || !cfg.owner || !cfg.target) return null;
var _t = cfg.target;
var _twx = (typeof cfg.targetWorldX==='number') ? cfg.targetWorldX : (_t.worldX||0);
var _tvx = (typeof cfg.targetVx==='number') ? cfg.targetVx : (_t._vx||0);
var _ty  = (typeof cfg.targetY==='number') ? cfg.targetY : (_t.y||0);
var _dist = Math.abs(_twx - (cfg.startX||0));
var _aabb = window._getTargetAABB(_t);
var _box  = window._getTargetBox(_t);
var _rngGate = (typeof cfg.weaponRange==='number'&&cfg.weaponRange>0) ? cfg.weaponRange : Infinity;
var _halfL = (_box&&_box.L>0) ? _box.L/2 : 0;
if(_dist - _halfL > _rngGate) return null;
var _spd = cfg.flightSpeed || 800;
var _dx0 = _twx - (cfg.startX||0);
var _sgn0 = (_dx0<0) ? -1 : 1;
var _tvx0 = (typeof _tvx==='number'&&isFinite(_tvx)) ? _tvx : 0;
var _close0 = _spd - _sgn0*_tvx0;
var _flightSec = (_close0>1) ? Math.max(0.016, Math.abs(_dx0)/_close0) : Math.max(0.016, _dist/_spd);
var _bf = (typeof cfg.burstFactor==='number') ? cfg.burstFactor : window._getWeaponBurstFactor(cfg.weaponId, cfg.vid);
var _o = { weaponId:cfg.weaponId, weaponType:cfg.weaponType, scope:cfg.scope, grip:cfg.grip,
mode:cfg.mode, platform:cfg.platform, stabMrad:cfg.stabMrad, shooterSpeed:cfg.shooterSpeed, dist:_dist };
if((!_o.weaponType||!_o.scope||!_o.grip) && typeof itemDef==='function'){
var _d = itemDef(cfg.weaponId);
if(_d){ if(!_o.weaponType) _o.weaponType=_d.type;
if(!_o.scope) _o.scope=_d.scope; if(!_o.grip) _o.grip=_d.grip; } }
if(cfg.vid && typeof window._vehFcs==='function'){
var _f = window._vehFcs(cfg.vid);
if(_f){ if(!_o.platform) _o.platform=_f.platform;
if(_o.stabMrad==null) _o.stabMrad=_f.stabMrad; } }
if(!_o.platform) _o.platform='handheld';
if(_o.shooterSpeed==null){
_o.shooterSpeed = cfg.vid ? ((typeof window._currentWorldSpeed==='function') ? window._currentWorldSpeed() : 0) : 0; }
var _tFace = 1;
if(_box && _dist>0.01) _tFace = Math.max(0.05, (_dist-_box.L/2)/_dist);
var _scat = window._calcWeaponScatter3D(cfg.weaponRange||15, cfg.hr||50, cfg.burstCount||1, _bf, _box, _tFace, _o);
var _re = (typeof _scat.rangeErr==='number') ? _scat.rangeErr : 0;
var _dR = (_re>0) ? (_gaussRand()*_re*_dist) : 0;
var _flightEst = (_close0>1) ? Math.max(0.016, Math.abs(_dx0+_dR)/_close0) : _flightSec;
var _predictX = window._predictTargetPoint(_twx, _tvx0, _flightEst);
var _aimYLocal = (typeof cfg.aimY==='number') ? cfg.aimY : window._getWeaponAimY(cfg.weaponId, cfg.ammoId, cfg.vid);
var _bullet = {
owner: cfg.owner,
weaponId: cfg.weaponId,
ammoId: cfg.ammoId,
isGrenade: !!cfg.isGrenade,
startX: cfg.startX||0,
startY: (typeof cfg.startY==='number') ? cfg.startY : 1.5,
startZ: (typeof cfg.startZ==='number') ? cfg.startZ : 0,
impactX: _predictX,
impactY: _ty + _aimYLocal + _scat.sy,
impactZ: ((typeof cfg.aimZ==='number') ? cfg.aimZ : 0) + _scat.sz,
flightTimeSec: _flightSec,
startTime: performance.now(),
targetSnapshotX: _twx,
targetSnapshotVx: _tvx0,
targetSnapshotY: _ty,
guidanceMode: cfg.guidanceMode || 'none',
guidanceUpdateMs: cfg.guidanceUpdateMs || 0,
lastGuidanceAt: performance.now(),
hr: cfg.hr||50,
burstCount: cfg.burstCount||1,
burstFactor: _bf,
weaponRange: cfg.weaponRange||15,
flightSpeed: _spd,
target: _t,
targetAABB: _aabb,
targetBox: _box,
aimOpts: _o,
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
};
/* ===== rev-fire-aim:end ===== */


/* 制導更新（無線指令 / 激光駕束） */
/* ===== rev-guid-aim:start ===== */
/* 制導更新：每次更新重新量測目標狀態 → 領前誤差被制導吃掉。
   散佈仍走同一條角量模型，瞄準基準與首發一致。 */
window._updateGuidedBullet = function(b, now){
if(!b || b._resolved || b.guidanceMode==='none') return;
if(!b.guidanceUpdateMs) return;
if(now - b.lastGuidanceAt < b.guidanceUpdateMs) return;
var _t=b.target;
if(!_t || _t.hp<=0) return;
b.lastGuidanceAt = now;
var _elapsed=(now-b.startTime)/1000;
var _remain=Math.max(0, b.flightTimeSec-_elapsed);
var _curVx=(typeof _t._vx==='number')?_t._vx:b.targetSnapshotVx;
var _predictX=window._predictTargetPoint(_t.worldX,_curVx,_remain);
var _box=window._getTargetBox(_t)||b.targetBox;
var _dist=Math.abs((_t.worldX||0)-(b.startX||0));
var _tFace=1;
if(_box&&_dist>0.01) _tFace=Math.max(0.05,(_dist-_box.L/2)/_dist);
var _o=b.aimOpts||{}; _o.dist=_dist;
var _scat=window._calcWeaponScatter3D(b.weaponRange,b.hr,b.burstCount,b.burstFactor,_box,_tFace,_o);
var _aimYLocal=(_t.isVehicle&&_box&&_box.H>0)?_box.H/2:window._getWeaponAimY(b.weaponId,b.ammoId,null);
var _ty=(typeof _t.y==='number')?_t.y:b.targetSnapshotY;
b.targetBox=_box;
b.impactX=_predictX;
b.impactY=_ty+_aimYLocal+_scat.sy;
b.impactZ=_scat.sz;
};
/* ===== rev-guid-aim:end ===== */


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
/* ===== rev-ray-slab:start ===== */
/* 命中 = 射線與目標實體相交，六面皆可入射。
   人形按各高度帶真實半寬（頭/臉遠窄於軀幹）—— 不再是一根等寬柱，
   所以「從腦袋旁邊飛過」本來就該 miss。載具/Boss 用包圍盒六面。
   回傳契約不變：{t,x,y,z,face}；face 新增 y1/y2/z1/z2。 */
function _raySlab(sx,sy,sz,dx,dy,dz,x0,x1,y0,y1,z0,z1){
var tmin=0, tmax=1, ax=-1, sg=0;
function axis(p,d,lo,hi,id){
if(Math.abs(d)<1e-9){ return !(p<lo||p>hi); }
var t1=(lo-p)/d, t2=(hi-p)/d, s=-1;
if(t1>t2){ var tt=t1; t1=t2; t2=tt; s=1; }
if(t1>tmin){ tmin=t1; ax=id; sg=s; }
if(t2<tmax) tmax=t2;
return tmin<=tmax; }
if(!axis(sx,dx,x0,x1,0)) return null;
if(!axis(sy,dy,y0,y1,1)) return null;
if(!axis(sz,dz,z0,z1,2)) return null;
if(tmax<0||tmin>1||tmin<0) return null;
return { t:tmin, axis:ax, sgn:sg }; }
window._raySegFrontFace = function(sx,sy,sz,ex,ey,ez,twx,box,tgt){
if(!box) return null;
var dx=ex-sx, dy=ey-sy, dz=ez-sz;
if(Math.abs(dx)<1e-9&&Math.abs(dy)<1e-9&&Math.abs(dz)<1e-9) return null;
var best=null;
function take(r){
if(!r) return;
if(best&&r.t>=best.t) return;
var f = r.axis===0 ? (r.sgn<0?'x1':'x2') : r.axis===1 ? (r.sgn<0?'y1':'y2') : (r.sgn<0?'z1':'z2');
if(r.axis<0) f = dx>0?'x1':'x2';
best={ t:r.t, x:sx+dx*r.t, y:sy+dy*r.t, z:sz+dz*r.t, face:f }; }
var isHuman = tgt && !tgt.isVehicle && !tgt.isBoss;
if(isHuman){
var B=window._humanSilhouetteBands();
var foot=(typeof box.yFoot==='number')?box.yFoot:0;
var H=(box.H>0)?box.H:1.7, L=(box.L>0)?box.L:0.5, k=H/1.7;
for(var i=0;i<B.length;i++){ var b=B[i];
take(_raySlab(sx,sy,sz,dx,dy,dz, twx-L/2,twx+L/2, foot+b.y0*k,foot+b.y1*k, -b.hw*k,b.hw*k)); }
} else {
var f0=(typeof box.yFoot==='number')?box.yFoot:0;
take(_raySlab(sx,sy,sz,dx,dy,dz, twx-box.L/2,twx+box.L/2, f0,f0+box.H, -box.D/2,box.D/2)); }
return best; };
/* ===== rev-ray-slab:end ===== */

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
    /* rev-aps-pre-decide: 幾何相交（與 progress 無關）即決策，結果快取在彈體 */
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
        var hit = _raySegFrontFace(b.startX, b.startY, _sz, b.impactX, b.impactY, _ez, twx, box, tgt);
        if(hit && (!_rayHit || hit.t < _rayHit.t)){ _rayHit = hit; _rayTgt = tgt; _rayBox = box; }
      }
    }
    var _aps = null;
    if(_rayHit && _rayTgt === b.target && _rayTgt.isVehicle){
      if(b._apsDone){ _aps = b._apsHit ? { t:b._apsT, wx:b._apsWX, wy:b._apsWY } : null; }
      else if(typeof window._apsDecide === 'function'){
        try { _aps = window._apsDecide(b, _rayHit); } catch(e){ _aps = null; }
      }
    }
    var _best = (_rayHit && _progress >= _rayHit.t) ? _rayHit : null;
    /* rev-trail-visual-end: 尾煙沿「起點→視覺終點」沉積，與爆炸同點。
       人形=中軸+命中高（每幀跟隨移動目標）；載具=實繪邊緣；APS=攔截面實繪高；
       射失=(impactX,0)，與 _rpgGroundBurst 完全同點。上限 t 沿用 T1/APS 夾止。 */
    var _mvD = (window.MISSILE_VISUAL && b.ammoId) ? window.MISSILE_VISUAL[b.ammoId] : null;
    if(_mvD && b.ammoId !== '9m14'){
      var _ccT = (owner && owner.sm) ? owner : window._combat;
      if(_ccT && _ccT.sm){
        var _t0T = (typeof b._trailT === 'number') ? b._trailT : 0;
        var _tEnd = _progress, _lineB = b;
        if(_aps && typeof _aps.t === 'number'){
          _tEnd = Math.min(_progress, _aps.t);
          var _ayA = (typeof _aps.wy === 'number') ? _aps.wy : (b.startY + (b.impactY - b.startY) * _aps.t);
          _lineB = { startX:b.startX, startY:b.startY, impactX:_aps.wx, impactY:_ayA };
        } else if(_rayHit){
          _tEnd = Math.min(_progress, _rayHit.t);
          var _prevCtx = window._hitCtx;
          window._hitCtx = { target:_rayTgt, part:null, x:_rayHit.x, y:_rayHit.y, z:_rayHit.z, face:_rayHit.face, isDirect:true, bullet:b };
          var _vhE = (typeof window._getTargetHitVisualWorld === 'function') ? window._getTargetHitVisualWorld(_rayTgt) : null;
          window._hitCtx = _prevCtx;
          _lineB = { startX:b.startX, startY:b.startY, impactX:(_vhE ? _vhE.wx : _rayHit.x), impactY:(_vhE ? _vhE.wy : _rayHit.y) };
        } else if(b.guidanceMode === 'none'){
          _lineB = { startX:b.startX, startY:b.startY, impactX:b.impactX, impactY:0 };
        }
        var _PD = (_mvD.smoke === 'tracer') ? window._RPG27 : window.MISSILE_TRAIL;
/* rev-smoke-caliber: 羽流尺度按實際口徑 —— visual 條目有 r0 就覆寫尺度三項，
   壽命 / 濃度 / 上升仍沿用參數組。未標 r0 者（ATGM / 舊 rpg）行為不變。 */
if(_PD && typeof _mvD.r0 === 'number'){
_PD = { r0: _mvD.r0,
grow: (typeof _mvD.grow === 'number') ? _mvD.grow : _PD.grow,
spacing: (typeof _mvD.spacing === 'number') ? _mvD.spacing : _PD.spacing,
life: _PD.life, alpha: _PD.alpha, rise: _PD.rise };
}
/* rev-trail-param-domain: hit.t／aps.t 是彈道線（start→impact）的參數；
   沉積線（start→視覺爆點）長度不同，同一 t 落在不同物理點。
   _trailT 續存彈道域（跨幀可比），沉積時除以終端 t 歸一化到沉積線自身域 ——
   終端幀恰好 t=1，煙鋪到爆點；射失 _tTerm=1，行為不變。 */
var _tTermD = (_aps && typeof _aps.t === 'number') ? _aps.t : (_rayHit ? _rayHit.t : 1);
if(!(_tTermD > 1e-6)) _tTermD = 1e-6;
var _dnD = (_lineB === b) ? 1 : _tTermD;
var _v0D = Math.min(1, _t0T / _dnD), _v1D = Math.min(1, _tEnd / _dnD);
if(_v1D > _v0D && typeof window._rpgTrailDeposit === 'function') window._rpgTrailDeposit(_ccT, _lineB, _v0D, _v1D, _PD);
b._trailT = _tEnd;
      }
    }
    if(_aps && typeof _aps.t === 'number' && _progress >= _aps.t){
      var _ftA = _aps.t;
      _settle(b, _rayTgt, _rayBox, {
        t: _ftA, x: _aps.wx,
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
  /* rev-human-center-x: 人形視覺終點 x 固定中軸 —— 包圍盒含武器輪廓與透明邊，
     不全是人體，但中軸線一定在身體上。y 用實際命中高度，不再固定軀幹中心。 */
  var _hcH = window._hitCtx;
  var _hyH = (_hcH && typeof _hcH.y === 'number') ? _hcH.y : (_footY + 1.163);
  return { wx: _wx, wy: _hyH };
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
/* rev-frag-rays: 破片模式 —— 每片一次穿透事件（自帶完整破片穿深），
   不是「一發爆炸拆成 N 帶、每帶各拿完整穿深」。帶模式保留給未轉換的呼叫端。 */
if(opts.fragments > 0 && opts.fragEff > 0) return window._applyFragmentsToTarget(tgt, P, opts, box);
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

/* ===== rev-pen-chain:start ===== */
/* 統一穿透遍歷 —— 人與載具同一條式子，不按目標類型分支。
     path = min(部件弦長, R / f)
     R   -= path × f
     傷害 = eff × (path / 240mm) × 脆弱係數
   eff 是「對無甲參考軀幹完整貫穿」的傷害（呼叫端已含稀有度與暴擊）。
   穿深與毀傷脫鉤：組織 f 極小但脆弱係數高，鋼件 f 大但係數低。
   重疊部件全部遍歷（不取最前、不抽籤）；穿深耗盡即停，
   所以「勉強穿孔只傷前段」「乾淨貫穿把能量帶出體外」都自然成立。
   弦長沿實際射線方向算 → 同一顆引擎正面 1540mm、側面 1008mm。
   排序用 tEnter 而非硬編 x，正面／背面／左右／頂底同一條路徑。
   crew 盒的個人護甲是盒前一層：先吃穿深，再進組織。

   ★ 參數化契約：所有求交函式的 t ∈ [0,1] 是「射線段比例」，
     因此方向必須是「整段位移向量」= 單位方向 × segLen，不是單位向量。
     v1 傳單位向量卻把 t 夾在 [0,1]，等於把 1 米當段尾 ——
     駕駛盒 980mm 被算成 9916mm，1 米外的部件全被丟棄。 */
var _PEN_REF_CHORD = 240;
function _penSlab(px,py,pz,dx,dy,dz,x0,x1,y0,y1,z0,z1){
  var t0 = 0, t1 = 1;
  function ax(p,d,lo,hi){
    if(Math.abs(d) < 1e-12) return !(p < lo || p > hi);
    var a = (lo-p)/d, b = (hi-p)/d;
    if(a > b){ var t = a; a = b; b = t; }
    if(a > t0) t0 = a;
    if(b < t1) t1 = b;
    return t0 <= t1;
  }
  if(!ax(px,dx,x0,x1)) return null;
  if(!ax(py,dy,y0,y1)) return null;
  if(!ax(pz,dz,z0,z1)) return null;
  if(t1 <= t0 || t1 < 0 || t0 > 1) return null;
  return [t0,t1];
}
function _penCircle(px,pz,dx,dz,r){
  var a = dx*dx + dz*dz;
  if(a < 1e-12) return (px*px + pz*pz <= r*r) ? [0,1] : null;
  var b = 2*(px*dx + pz*dz), c = px*px + pz*pz - r*r;
  var disc = b*b - 4*a*c;
  if(disc < 0) return null;
  var q = Math.sqrt(disc);
  return [(-b-q)/(2*a), (-b+q)/(2*a)];
}
/* 環形彈盤：外圓區間扣掉內圓區間 → 最多兩段弧，兩段都穿。 */
function _penRing(px,py,pz,dx,dy,dz,ring,y0,y1){
  var out = [];
  var ys = _penSlab(px,py,pz,0,dy,0,-1e9,1e9,y0,y1,-1e9,1e9);
  if(!ys) return out;
  var o = _penCircle(px,pz,dx,dz,ring.ro);
  if(!o) return out;
  var inner = (ring.ri > 0) ? _penCircle(px,pz,dx,dz,ring.ri) : null;
  var segs = [];
  if(inner && inner[1] > o[0] && inner[0] < o[1]){
    if(inner[0] > o[0]) segs.push([o[0], Math.min(o[1], inner[0])]);
    if(inner[1] < o[1]) segs.push([Math.max(o[0], inner[1]), o[1]]);
  } else segs.push([o[0], o[1]]);
  for(var i=0;i<segs.length;i++){
    var a = Math.max(segs[i][0], ys[0], 0), b = Math.min(segs[i][1], ys[1], 1);
    if(b > a) out.push([a,b]);
  }
  return out;
}
/* boxes：米空間、目標局部座標。ox/oy/oz：射線起點（局部）。
   dx/dy/dz：單位方向。segLen：整段米數（t=1 對應）。R0：剩餘穿深 mm。
   occupantOf(box) → { alive, armorMM, armorTake(mm) } 或 null（空席／已陣亡）。 */
window._penChain = function(boxes, ox,oy,oz, dx,dy,dz, segLen, R0, eff, occupantOf){
  if(!boxes || !boxes.length || !(segLen>0) || !(eff>0) || !(R0>0)) return [];
  /* 單位方向 → 整段位移，使 t 成為段比例（見上方契約） */
  var sx = dx*segLen, sy = dy*segLen, sz = dz*segLen;
  var segs = [];
  for(var i=0;i<boxes.length;i++){
    var b = boxes[i];
    if(b.ring){
      var rs = _penRing(ox,oy,oz,sx,sy,sz,b.ring,b.y0,b.y1);
      for(var j=0;j<rs.length;j++) segs.push({ b:b, t0:rs[j][0], t1:rs[j][1] });
    } else {
      var r = _penSlab(ox,oy,oz,sx,sy,sz,b.x0,b.x1,b.y0,b.y1,b.z0,b.z1);
      if(r) segs.push({ b:b, t0:r[0], t1:r[1] });
    }
  }
  if(!segs.length) return [];
  segs.sort(function(a,c){ return a.t0 - c.t0; });
  var R = R0, hits = [];
  for(var k=0;k<segs.length;k++){
    if(R <= 1e-6) break;
    var bb = segs[k].b;
    var chord = (segs[k].t1 - segs[k].t0) * segLen * 1000;
    if(!(chord > 0)) continue;
    var armorLost = 0;
    if(bb.comp === 'crew'){
      var oc = (typeof occupantOf === 'function') ? occupantOf(bb) : null;
      if(!oc || !oc.alive) continue;
      var mm = Math.max(0, oc.armorMM || 0);
      if(mm > 0){
        var take = Math.min(mm, R);
        R -= take; armorLost = take;
        if(typeof oc.armorTake === 'function') oc.armorTake(take);
        if(R <= 1e-6){
          hits.push({ comp:'crew', internal:'crew', seat:bb.seat, seatIdx:bb.seatIdx,
            weaponId:null, dmg:0, path:0, chord:Math.round(chord), armorLost:armorLost });
          break;
        }
      }
    }
    var path, used;
    if(bb.eqFix > 0){
      used = Math.min(R, bb.eqFix);
      path = (bb.pathFix || chord) * (used / bb.eqFix);
    } else {
      var f = (bb.f > 0) ? bb.f : 0.1;
      path = Math.min(chord, R / f);
      used = path * f;
    }
    R -= used;
    var dmg = (bb.comp === 'obstacle') ? 0 : Math.round(eff * (path / _PEN_REF_CHORD) * bb.v);
    hits.push({ comp:bb.comp, internal:bb.internal, seat:bb.seat, seatIdx:bb.seatIdx,
      weaponId:bb.weaponId, dmg:dmg, path:Math.round(path), chord:Math.round(chord), armorLost:armorLost });
  }
  return hits;
};
/* ===== rev-pen-chain:end ===== */

/* ===== rev-frag-rays:start ===== */
/* 破片 = 一組徑向射線，不是一份預算。
   期望命中數 E = N × Ω/4π，Ω 是目標輪廓對爆心張開的立體角。
   1/d² 由 Ω 自然給出 —— 不需要 falloff 曲線，也不需要 splashRatio。
   命中數泊松抽樣（破片獨立、稀疏），每片一條射線走既有穿透鏈。

   矩形立體角用精確式，不用兩角寬相乘（後者只在小角度成立，
   2m 處高估 8.6%、10m 處低估 12%）：
     F(u,v) = atan( u·v / (d·√(d²+u²+v²)) )
     Ω = F(u1,v1) − F(u0,v1) − F(u1,v0) + F(u0,v0)
   從外部一點可見 1~3 個面，各面 Ω 相加即總張角（投影不重疊）。
   爆心在盒內 → Ω=4π（接觸引爆，全部破片命中）。
   d 下限 0.05m 只是公式在 d→0 的數值守衛；真正的 d=0 走 inside 分支。

   採樣預算：命中數超過 _FRAG_MAX_RAYS 時改用重要性採樣 ——
   取 _FRAG_MAX_RAYS 條射線，每條代表 n/_FRAG_MAX_RAYS 片，eff 同倍放大。
   期望值完全相同、變異更小，是數值取樣預算不是物理近似。 */
var _FRAG_MAX_RAYS = 48;
var _FRAG_4PI = 4*Math.PI;
function _fragRectOmega(d, u0,u1, v0,v1){
  function F(u,v){ return Math.atan(u*v/(d*Math.sqrt(d*d+u*u+v*v))); }
  return F(u1,v1) - F(u0,v1) - F(u1,v0) + F(u0,v0);
}
function _fragPoisson(E){
  if(!(E>0)) return 0;
  if(E > 30){
    var g = (typeof _gaussRand === 'function') ? _gaussRand() : 0;
    return Math.max(0, Math.round(E + Math.sqrt(E)*g));
  }
  var L = Math.exp(-E), k = 0, p = 1;
  do { k++; p *= Math.random(); } while(p > L && k < 200);
  return k-1;
}
/* 幾何：回傳各可見面的帶（含 Ω）與最近距離。
   人形 x 面用真實輪廓半寬（頭/臉遠窄於軀幹）；側/頂面用盒近似。 */
window._fragGeometry = function(tgt, box, P){
  var twx = (typeof tgt.worldX === 'number') ? tgt.worldX : 0;
  var foot = (typeof box.yFoot === 'number') ? box.yFoot : 0;
  var x0 = twx-box.L/2, x1 = twx+box.L/2, y0 = foot, y1 = foot+box.H, z0 = -box.D/2, z1 = box.D/2;
  var px = (typeof P.x==='number')?P.x:twx, py = (typeof P.y==='number')?P.y:0, pz = (typeof P.z==='number')?P.z:0;
  var dx = (px<x0)?(x0-px):((px>x1)?(px-x1):0);
  var dy = (py<y0)?(y0-py):((py>y1)?(py-y1):0);
  var dz = (pz<z0)?(z0-pz):((pz>z1)?(pz-z1):0);
  var dNear = Math.sqrt(dx*dx+dy*dy+dz*dz);
  var bands = [], omega = 0;
  var isHuman = !tgt.isVehicle && !tgt.isBoss;
  if(dx<=0 && dy<=0 && dz<=0){
    return { bands:[], omega:_FRAG_4PI, dNear:0, twx:twx, inside:true };
  }
  function push(d,u0,u1,v0,v1,part,face,ax){
    if(!(d>0)) return;
    var w = Math.max(0, _fragRectOmega(Math.max(0.05,d),u0,u1,v0,v1));
    if(!(w>0)) return;
    bands.push({ d:d, u0:u0,u1:u1, v0:v0,v1:v1, part:part, face:face, axis:ax, omega:w });
    omega += w;
  }
  if(dx>0){
    var fx = (px<x0)?'x1':'x2';
    if(isHuman && typeof window._humanSilhouetteBands === 'function'){
      var sb = window._humanSilhouetteBands(), k = box.H/1.7;
      for(var i=0;i<sb.length;i++){
        push(dx, -sb[i].hw*k, sb[i].hw*k, foot+sb[i].y0*k-py, foot+sb[i].y1*k-py, sb[i].part, fx, 'x');
      }
    } else {
      push(dx, z0, z1, y0-py, y1-py, null, fx, 'x');
    }
  }
  if(dz>0) push(dz, x0-twx, x1-twx, y0-py, y1-py, null, (pz<z0)?'z1':'z2', 'z');
  if(dy>0) push(dy, x0-twx, x1-twx, z0, z1, null, (py<y1)?'y2':'y1', 'y');
  if(omega > _FRAG_4PI) omega = _FRAG_4PI;
  return { bands:bands, omega:omega, dNear:dNear, twx:twx, inside:false };
};
/* 採樣射線：先按 Ω 選帶，再於帶內均勻取 (u,v)。
   ★ 部位歸屬由實際 hit 點決定，不是取樣帶 —— 地面爆心射向頭部的射線
     會先穿過腿／軀幹，slab 回傳的 hit.y 才是真實入射高度。
     取樣帶只用來分配「射往哪個方向」的權重。 */
window._fragRays = function(tgt, P, N, maxR){
  var box = (typeof window._getTargetBox === 'function') ? window._getTargetBox(tgt) : null;
  if(!box || !(N>0)) return [];
  var g = window._fragGeometry(tgt, box, P);
  if(!(g.omega>0)) return [];
  if(typeof maxR === 'number' && maxR > 0 && g.dNear >= maxR) return [];
  var E = N * g.omega / _FRAG_4PI;
  var n = _fragPoisson(E);
  if(n <= 0) return [];
  var weight = 1;
  if(n > _FRAG_MAX_RAYS){ weight = n/_FRAG_MAX_RAYS; n = _FRAG_MAX_RAYS; }
  var twx = g.twx, foot = (typeof box.yFoot==='number')?box.yFoot:0;
  var px = P.x, py = (typeof P.y==='number')?P.y:0, pz = (typeof P.z==='number')?P.z:0;
  var out = [], i;
  var isHuman = !tgt.isVehicle && !tgt.isBoss;
  var sb = (isHuman && typeof window._humanSilhouetteBands === 'function') ? window._humanSilhouetteBands() : null;
  var kk = box.H/1.7;
  /* rev-frag-part-at-hit: 部位一律由實際 hit 點決定，不是取樣帶。
     人形：hit.y → silhouette 高度帶（地面爆射向頭部的射線會先穿腿／軀幹）。
     Boss：hit.(y,z) → billboard (u,v) → _bossPartFromUV（既有唯一真相源）。
       破片分派插在 _applyExplosionToBox 的 Boss 分支之前後，Boss 落到純盒
      （part=null）→ 全部算 body，弱點對爆炸完全失效。此處補回解析。
     載具：null —— 由 face + 高度帶決定裝甲板，內部部件由 _penChain 解析。
     一個 hit 點只歸一個部位，重疊不重複計帳。 */
  var isBoss = !!tgt.isBoss;
  function partAtY(y){
    if(!sb) return null;
    for(var j=0;j<sb.length;j++){
      if(y >= foot+sb[j].y0*kk && y < foot+sb[j].y1*kk) return sb[j].part;
    }
    return 'top';
  }
  function partAtHit(y,z){
    if(sb) return partAtY(y);
    if(isBoss && typeof window._bossPartFromUV === 'function'){
      var u = (z + box.D/2) / box.D;
      var v = (y - foot) / box.H;
      if(u >= 0 && u <= 1 && v >= 0 && v <= 1) return window._bossPartFromUV(tgt, u, v);
      return 'body';
    }
    return null;
  }
  if(g.inside){
    for(var q=0;q<n;q++){
      var yy = foot + box.H*(0.25+0.5*Math.random());
      var zz = box.D*(Math.random()-0.5)*0.8;
      out.push({ part:partAtHit(yy,zz), face:(px>=twx?'x2':'x1'), x:px, y:yy, z:zz, weight:weight, dNear:0 });
    }
    return out;
  }
  var tot = 0;
  for(i=0;i<g.bands.length;i++) tot += g.bands[i].omega;
  if(!(tot>0)) return [];
  for(var k=0;k<n;k++){
    var r = Math.random()*tot, b = g.bands[0];
    for(i=0;i<g.bands.length;i++){ r -= g.bands[i].omega; b = g.bands[i]; if(r<=0) break; }
    var u = b.u0 + (b.u1-b.u0)*Math.random();
    var v = b.v0 + (b.v1-b.v0)*Math.random();
    var ex, ey, ez;
    if(b.axis === 'x'){ ex = (b.face==='x1') ? twx-box.L/2 : twx+box.L/2; ey = py+v; ez = u; }
    else if(b.axis === 'z'){ ex = twx+u; ey = py+v; ez = (b.face==='z1') ? -box.D/2 : box.D/2; }
    else { ex = twx+u; ey = (b.face==='y1') ? foot : foot+box.H; ez = v; }
    /* 由爆心經採樣點延伸，交給既有 slab 判真實入射（輪廓縫隙自然 miss） */
    var hit = (typeof window._raySegFrontFace === 'function')
      ? window._raySegFrontFace(px,py,pz, px+(ex-px)*3, py+(ey-py)*3, pz+(ez-pz)*3, twx, box, tgt)
      : null;
    if(!hit) continue;
    out.push({ part:partAtHit(hit.y,hit.z), face:hit.face,
      x:hit.x, y:hit.y, z:hit.z, weight:weight, dNear:g.dNear });
  }
  return out;
};
/* 破片結算：每片一次穿透事件（自帶完整破片穿深），依部位聚合回報。
   applyBand(part, eff, pen, ctx) 沿用既有回呼契約。 */
window._applyFragmentsToTarget = function(tgt, P, opts, box){
  var out = { hpLost:0, armorLost:0, bands:[], dNear:Infinity, coverage:0, fragments:0, blastHp:0 };
  var N = opts.fragments, eff0 = opts.fragEff;
  /* 先取幾何：破片數可能抽到 0，但超壓仍要結算，不能因無射線提早返回。 */
  var geo = window._fragGeometry(tgt, box, P);
  out.dNear = geo.dNear;
  var inRange = !(typeof opts.maxR === 'number' && opts.maxR > 0 && geo.dNear >= opts.maxR);
  var rays = inRange ? window._fragRays(tgt, P, N, opts.maxR) : [];
  var agg = {}, order = [];
  var cr = (opts.crit && typeof opts.crit.rate === 'number') ? opts.crit.rate : 0;
  var cm = (opts.crit && typeof opts.crit.mult === 'number') ? opts.crit.mult : 1;
  for(var i=0;i<rays.length;i++){
    var R = rays[i];
    var eff = eff0 * R.weight;
    if(cr > 0 && Math.random() < cr) eff *= cm;
    var pen = (typeof opts.penFor === 'function') ? opts.penFor(R.part, R.dNear, 1, R.face) : (opts.pen || 0);
    /* rev-frag-ctx-owner: ctx 由引擎擁有。呼叫端若已為同一目標建立 ctx
       （載具濺射帶 _batch / _noArena），保留；否則以本片實際入射幾何建立。
       舊版不建立 → applyDamage 讀到上一個直擊目標的 stale ctx，
       心肺子區用錯高度；而 _bodyPartKey 的身分守衛正是在補償這件事。 */
    var ctx = { target:tgt, part:R.part, face:R.face, x:R.x, y:R.y, z:R.z,
      isDirect:false, frag:true, weight:R.weight, dNear:R.dNear };
    var _prevCtx = window._hitCtx;
    if(!_prevCtx || _prevCtx.target !== tgt) window._hitCtx = ctx;
    var r;
    try { r = (typeof opts.applyBand === 'function') ? opts.applyBand(R.part, eff, pen, ctx) : null; }
    finally { window._hitCtx = _prevCtx; }
    var hl = (r && r.hpLost) || 0, al = (r && r.armorLost) || 0;
    out.hpLost += hl; out.armorLost += al;
    out.fragments += R.weight;
    var key = R.part || R.face;
    if(!agg[key]){ agg[key] = { part:R.part, face:R.face, dmg:0, hpLost:0, armorLost:0, n:0 }; order.push(key); }
    agg[key].dmg += eff; agg[key].hpLost += hl; agg[key].armorLost += al; agg[key].n += R.weight;
  }
  for(var k=0;k<order.length;k++){
    var a = agg[order[k]];
    out.bands.push({ part:a.part, face:a.face, dmg:a.dmg, hpLost:a.hpLost, armorLost:a.armorLost, frags:a.n });
  }
  out.coverage = out.fragments / Math.max(1, N);
  /* 超壓通道：封閉殼（載具）免疫；其餘全額，不經護甲、不擲暴擊。 */
  if(inRange && opts.chargeKg > 0 && !tgt.isVehicle && typeof opts.applyBlast === 'function'){
    var bd = window._blastDamage(opts.chargeKg, geo.dNear, (P.y || 0) <= 0.2);
    if(bd > 0){ opts.applyBlast(bd); out.hpLost += bd; out.blastHp = bd; }
  }
  return out;
};/* ===== rev-frag-rays:end ===== */

/* ===== rev-ammo-frag:start ===== */
/* 爆炸彈頭的破片物理 —— 與手雷同一條結算路徑（09 _applyFragmentsToTarget）。
   frags：破片數；eff：單片對無甲參考軀幹完整貫穿的傷害（與 AMMO.dmg 同語義）；
   pen：單片穿深（定值，不隨距離衰減 —— 距離衰減由命中片數變少表達）。

   舊制三處各自掛著沒有物理依據的旋鈕：
     載具濺射 baseDmg × splashRatio(0.35~0.5) × ratioMult，射失再 × 0.6
     RPG 落地 baseDmg × 0.35 × 0.6
     通用濺射 baseDmg × splashRatio(0.35)
   全部廢除。破片數與單片傷害是彈頭屬性，命中率由目標對爆心張開的立體角給出。

   數值來源：3OF26 裝藥 3.4kg A-IX-2 為公開值，破片數由彈體鋼重÷平均破片質量估；
   其餘破片數／單片質量／速度為工程估值。eff 錨定 5.45 PS（1.35kJ → 56）。 */
const AMMO_FRAG = {
  '3of26':    { frags:1000, eff:450, pen:15 },
  '3uof17':   { frags:600,  eff:320, pen:12 },
  'og15v':    { frags:250,  eff:210, pen:10 },
  '3bk29':    { frags:150,  eff:240, pen:10 },
  'pg15v':    { frags:120,  eff:180, pen:8  },
  '30mm_hef': { frags:40,   eff:90,  pen:8  },
  '9m14':     { frags:200,  eff:260, pen:10 },
  '9m113':    { frags:200,  eff:260, pen:10 },
  '9m112':    { frags:180,  eff:240, pen:10 },
  '9m119m':   { frags:200,  eff:260, pen:10 },
  '9m117m1':  { frags:200,  eff:260, pen:10 },
  'pg18':     { frags:100,  eff:150, pen:8  },
  'pg22':     { frags:120,  eff:170, pen:8  },
  'pg26':     { frags:120,  eff:170, pen:8  },
  'pg7vl':    { frags:150,  eff:200, pen:10 },
  'pg27':     { frags:200,  eff:260, pen:10 }
};
window.AMMO_FRAG = AMMO_FRAG;
window._ammoFrag = function(id){ return (id && AMMO_FRAG[id]) ? AMMO_FRAG[id] : null; };
/* ===== rev-ammo-frag:end ===== */

/* ===== rev-blast-op:start ===== */
/* HE 超壓 —— 與破片同一爆心、同一裝藥，但是獨立通道：
   破片是「穿孔」，受護甲阻擋、由立體角決定命中數；
   超壓是「體積」，不消耗穿深、不經護甲，由峰值壓力決定損傷。

   Brode 自由空氣峰值超壓（公開經驗式，Z 單位 m/kg^⅓，Ps 單位 bar）：
     Z  = R / W^(1/3)
     Ps = 0.975/Z + 1.455/Z² + 5.85/Z³ − 0.019
   地面爆為半球反射，有效當量 ×1.8（surface）。

   損傷映射（工程預設）：(Ps_kPa − 35) / 2。
   35 kPa 是耳膜閾值，100 kPa 起肺損傷 —— 手雷超壓不致死，破片才是殺傷源；
   大口徑 HE 在 2~3m 內超壓致死，更遠由破片主導。兩者相加，不重複計帳。

   封閉殼係數：載具有裝甲殼 → 內部乘員不受外部超壓（艙內引爆另計）。
   人形無封閉殼 → 全額；護甲擋破片不擋超壓，這是物理事實。

   接觸爆距下限 0.5m：裝藥貼在外表面時，軀體有效中心仍在半米外。
   沒有下限會讓 dNear=0（爆心落在包圍盒內）算出無限大壓力。

   裝藥質量為公開值；TNT 當量 A-IX-1 取 1.20、A-IX-2 取 1.30（工程估值）。
   聚能裝藥（HEAT／ATGM）不列 —— 能量歸射流，爆壓份額另論。 */
const BLAST_CHARGE = {
  f1:       { kg:0.060, tnt:1.00 },
  rgd5:     { kg:0.110, tnt:1.00 },
  rgo:      { kg:0.090, tnt:1.20 },
  rgn:      { kg:0.097, tnt:1.20 },
  vog17:    { kg:0.069, tnt:1.20 },
  vog25:    { kg:0.048, tnt:1.20 },
  '3of26':  { kg:3.400, tnt:1.30 },
  '3uof17': { kg:1.450, tnt:1.30 },
  'og15v':  { kg:0.900, tnt:1.30 },
  '30mm_hef':{ kg:0.030, tnt:1.30 }
};
var _BLAST_MIN_R = 0.5;
function _blastKPa(chargeKg, distM, surface){
  if(!(chargeKg > 0)) return 0;
  var W = chargeKg * (surface ? 1.8 : 1.0);
  var R = Math.max(_BLAST_MIN_R, (typeof distM === 'number' && isFinite(distM)) ? distM : 0);
  var Z = R / Math.pow(W, 1/3);
  if(!(Z > 0)) return 0;
  var bar = 0.975/Z + 1.455/(Z*Z) + 5.85/(Z*Z*Z) - 0.019;
  return Math.max(0, bar * 100);
}
window._blastKPa = _blastKPa;
window._blastDamage = function(chargeKg, distM, surface){
  return Math.max(0, Math.round((_blastKPa(chargeKg, distM, surface) - 35) / 2));
};
/* id 字串或武器定義物件皆可 —— 定義物件可能沒有 id（itemDef 回傳副本），
   退回 WEAPONS 身分比對，再退回名稱比對（手雷名稱唯一）。 */
window._blastChargeKg = function(idOrDef){
  var id = null;
  if(typeof idOrDef === 'string') id = idOrDef;
  else if(idOrDef && typeof idOrDef === 'object'){
    if(idOrDef.id && BLAST_CHARGE[idOrDef.id]) id = idOrDef.id;
    else if(typeof WEAPONS !== 'undefined'){
      for(var k in WEAPONS){
        if(WEAPONS[k] === idOrDef){ id = k; break; }
        if(WEAPONS[k] && idOrDef.name && WEAPONS[k].name === idOrDef.name){ id = k; break; }
      }
    }
  }
  var e = id ? BLAST_CHARGE[id] : null;
  return e ? e.kg * e.tnt : 0;
};
window.BLAST_CHARGE = BLAST_CHARGE;
/* ===== rev-blast-op:end ===== */
/* ===== rev-melee-geometry:start ===== */
/* 近戰 = 接觸幀的一條短射線，與射擊同一條幾何模型。
   舊制兩套尺度並存：玩家擲 random*100 < hr（hr 是熟練指數），
   敵人擲 random < 0.55×MODE_ACCURACY（flat 機率）—— 同一動作兩種語義。
   此處統一：瞄準點 + 散佈 → slab 求交，揮空（未相交）就是 miss。
   部位由實際入射點決定：人形按高度帶、Boss 按 billboard (u,v)、
   載具 null（交由部件盒鏈解析），與破片／射擊完全一致。

   fromWX：攻擊者世界 x。to：目標物件（_getTargetBox 可解析）。
   opts：{ weaponId, weaponType, hr, range, aimY, aimZ, dist, strikeY }
     dist 可覆寫 —— 離線模擬無 worldX，以交戰距離直接給定。
     aimY/aimZ 可覆寫 —— Boss 戰用玩家選定瞄準點（_bossAimMeters）。

   ★ 已知代價：近距 R·σ_θ 極小（0.75m × 3.7mrad ≈ 3mm），σ_aim=0.15m 主導
     → 命中率約 79% 且幾乎不隨 hr 變化。近戰技能無鑑別度是幾何化的必然結果。 */
var _MELEE_STRIKE_Y = 1.2;
window._meleeStrike = function(fromWX, to, opts){
  if(!to) return null;
  opts = opts || {};
  var box = (typeof window._getTargetBox === 'function') ? window._getTargetBox(to) : null;
  if(!box) return null;
  var tx = (typeof to.worldX === 'number') ? to.worldX : 0;
  var fx = (typeof fromWX === 'number') ? fromWX : 0;
  var dist = (typeof opts.dist === 'number' && opts.dist > 0) ? opts.dist : Math.abs(tx - fx);
  if(!(dist > 0)) dist = 0.3;
  var sgn = (tx >= fx) ? 1 : -1;
  var sx = tx - sgn*dist;
  var foot = (typeof box.yFoot === 'number') ? box.yFoot : 0;
  var aimY = (typeof opts.aimY === 'number') ? opts.aimY
    : ((typeof window._getWeaponAimY === 'function') ? window._getWeaponAimY(opts.weaponId, null, null) : 0.85);
  var aimZ = (typeof opts.aimZ === 'number') ? opts.aimZ : 0;
  var rng = (typeof opts.range === 'number' && opts.range > 0) ? opts.range : Math.max(0.75, dist);
  var hr = (typeof opts.hr === 'number') ? opts.hr : 50;
  var tf = Math.max(0.05, (dist - box.L/2)/dist);
  var sc = window._calcWeaponScatter3D(rng, hr, 1, 0, box, tf,
    { weaponId:opts.weaponId, weaponType:(opts.weaponType || '近戰'), platform:'handheld', dist:dist });
  var iy = foot + aimY + (sc.sy || 0);
  var iz = aimZ + (sc.sz || 0);
  var sy = (typeof opts.strikeY === 'number') ? opts.strikeY : _MELEE_STRIKE_Y;
  var h = (typeof window._raySegFrontFace === 'function')
    ? window._raySegFrontFace(sx, sy, 0, tx, iy, iz, tx, box, to) : null;
  if(!h) return null;
  var part = null;
  if(!to.isVehicle && !to.isBoss){
    var B = (typeof window._humanSilhouetteBands === 'function') ? window._humanSilhouetteBands() : null;
    if(B){ var k = box.H/1.7;
      for(var i=0;i<B.length;i++){
        if(h.y >= foot + B[i].y0*k && h.y < foot + B[i].y1*k){ part = B[i].part; break; } } }
    if(!part) part = 'top';
  } else if(to.isBoss && typeof window._bossPartFromUV === 'function'){
    var u = (h.z + box.D/2)/box.D, v = (h.y - foot)/box.H;
    part = (u>=0 && u<=1 && v>=0 && v<=1) ? window._bossPartFromUV(to, u, v) : 'body';
  }
  return { x:h.x, y:h.y, z:h.z, face:h.face, part:part, dist:dist };
};
/* ===== rev-melee-geometry:end ===== */
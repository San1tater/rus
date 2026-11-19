
'use strict';

const battleBossAnim = { name:'idle', frame:0, lastUpdate:0, forcedEnd:0 };
const BATTLE_BOSS_ONESHOT = ['attack_swipe','skill_charge','hurt','death'];
const BOSS_DEG2RAD = Math.PI / 180;

const OMEGA_ARM_IDS = ['ring_t','ring_b','ring_l','ring_r'];
const OMEGA_ARM_HP = 10000;
const OMEGA_SKILL_TO_ARM = { melee:'ring_l' };

var HYDRA_HEAD_IDS = ['head_1','head_2','head_3','head_4','head_5','head_6','head_7'];
const HYDRA_HEAD_HP = 12857;
var HYDRA_NECK_MAP = { neck_1:'head_1', neck_2:'head_2', neck_3:'head_3', neck_4:'head_4', neck_5:'head_5', neck_6:'head_6', neck_7:'head_7' };

function getBossBgPath(bossId){
  if(!BOSSES[bossId]) return '';
  const _base = bossId.replace(/_ii$/, '');
  const _p = 'images/bg/boss/boss_' + _base + '.png';
  return _p + assetSuffix(_p);
}

/* ============== Boss 骨架解析 ============== */
function _resolveBossWorldRaw(def, anim, frame){
  const result = {};
  const visiting = new Set();
  function resolve(L){
    if(result[L.id]) return result[L.id];
    if(visiting.has(L.id)){
      const k = (anim && anim.keys[L.id] && anim.keys[L.id][frame]) || {rot:0, dx:0, dy:0};
      result[L.id] = {
        wx: def.canvas.w * L.x + def.canvas.w * (k.dx||0) * 0.01,
        wy: def.canvas.h * L.y + def.canvas.h * (k.dy||0) * 0.01,
        rot: k.rot || 0
      };
      return result[L.id];
    }
    visiting.add(L.id);
    let bw = 0, by = 0, br = 0, ri = false;
    if(L.anchor && L.anchor.target){
      const tgt = def.layers.find(x => x.id === L.anchor.target);
      if(tgt){
        const t = resolve(tgt);
        bw = t.wx; by = t.wy;
        if(L.anchor.rot){ br = t.rot; ri = true; }
      }
    }
    const k = (anim && anim.keys[L.id] && anim.keys[L.id][frame]) || {rot:0, dx:0, dy:0};
    let ox = def.canvas.w * L.x + def.canvas.w * (k.dx||0) * 0.01;
    let oy = def.canvas.h * L.y + def.canvas.h * (k.dy||0) * 0.01;
    if(ri && br !== 0){
      const r = br * BOSS_DEG2RAD;
      const c = Math.cos(r), s = Math.sin(r);
      const rx = ox * c - oy * s;
      const ry = ox * s + oy * c;
      ox = rx; oy = ry;
    }
    visiting.delete(L.id);
    result[L.id] = { wx: bw + ox, wy: by + oy, rot: br + (k.rot || 0) };
    return result[L.id];
  }
  for(const L of def.layers) resolve(L);
  return result;
}

function resolveBossWorld(def, anim, frame){
  const world = _resolveBossWorldRaw(def, anim, frame);
  _applyHydraFollowWorld(def, anim, frame, world);
  return world;
}

function _applyHydraFollowWorld(def, anim, frame, world){
  if(!def || !def._hydraFollow) return;
  if(!def._hydraEyeOwner) def._hydraEyeOwner = {};
  if(!def._hydraRefWorld){
    let idleAnim = null;
    for(const bid in BOSS_ANIMS){
      if(BOSS_LAYERS[bid] === def && BOSS_ANIMS[bid] && BOSS_ANIMS[bid].idle){
        idleAnim = BOSS_ANIMS[bid].idle;
        break;
      }
    }
    if(!idleAnim) return;
    def._hydraIdleAnim = idleAnim;
    def._hydraRefWorld = _resolveBossWorldRaw(def, idleAnim, 0);
    if(!def._hydraRefWorld) return;
  }
  const refWorld = def._hydraRefWorld;
  const refAnim = def._hydraIdleAnim;
  if(!refWorld || !refAnim) return;

  for(const L of def.layers){
    if(!/^(eye|mouth)/.test(L.id)) continue;
    let owner = def._hydraEyeOwner[L.id];
    if(!owner){
      const rw = refWorld[L.id];
      if(!rw) continue;
      owner = pickHeadForPoint(rw.wx, rw.wy, def, refWorld, refAnim, 0);
      if(!owner) continue;
      def._hydraEyeOwner[L.id] = owner;
    }
    const cur = world[owner];
    const ref = refWorld[owner];
    if(!cur || !ref) continue;
    const dx = cur.wx - ref.wx;
    const dy = cur.wy - ref.wy;
    const dr = cur.rot - ref.rot;
    const w = world[L.id];
    if(!w) continue;
    w.wx += dx;
    w.wy += dy;
    w.rot += dr;
  }
}

/* ============== Boss 包圍盒 fit ============== */


function computeBossDeathFit(def, bossId, canvasW, canvasH){
  const _ck = 'death|' + canvasW + '|' + canvasH;
  if(def._deathFitCache && def._deathFitCache._key === _ck) return def._deathFitCache;
  const anims = BOSS_ANIMS[bossId];
  if(!anims || !anims.death){ def._deathFitCache = null; return null; }
  const cw = def.canvas.w, ch = def.canvas.h;
  const anim = anims.death;
  let dMinX = Infinity, dMinY = Infinity, dMaxX = -Infinity, dMaxY = -Infinity;
  for(let f = 0; f < anim.frameCount; f++){
    const world = resolveBossWorld(def, anim, f);
    for(const L of def.layers){
      const wp = world[L.id];
      if(!wp) continue;
      const k = (anim.keys && anim.keys[L.id] && anim.keys[L.id][f]) || {rot:0};
      const w = cw * (k.w !== undefined ? k.w : L.w);
      const h = ch * (k.h !== undefined ? k.h : L.h);
      const px = w * L.pivot.x;
      const py = h * L.pivot.y;
      const rot = wp.rot * BOSS_DEG2RAD;
      const cos = Math.cos(rot), sin = Math.sin(rot);
      for(const c of [[0,0],[w,0],[0,h],[w,h]]){
        const dx = c[0] - px, dy = c[1] - py;
        const rx = dx*cos - dy*sin + wp.wx;
        const ry = dx*sin + dy*cos + wp.wy;
        if(rx < dMinX) dMinX = rx;
        if(ry < dMinY) dMinY = ry;
        if(rx > dMaxX) dMaxX = rx;
        if(ry > dMaxY) dMaxY = ry;
      }
    }
  }
  if(!isFinite(dMinX)){ def._deathFitCache = null; return null; }
  const dW = dMaxX - dMinX, dH = dMaxY - dMinY;
  const fitScale = Math.min(canvasW / dW, canvasH / dH);
  const dCX = (dMinX + dMaxX) / 2;
  const offsetX = canvasW / 2 - dCX * fitScale;
  const offsetY = canvasH - dMaxY * fitScale;
  const r = { _key: _ck, fitScale, offsetX, offsetY };
  def._deathFitCache = r;
  return r;
}

function getBossCanvasTransform(def, bossId, canvasW, canvasH){
  const anims = BOSS_ANIMS[bossId];
  if(anims && anims.idle){
    const idleAnim = anims.idle;
    const world = resolveBossWorld(def, idleAnim, 0);
    let iMinY = Infinity, iMaxY = -Infinity, iMinX = Infinity, iMaxX = -Infinity;
    for(const L of def.layers){
      const wp = world[L.id];
      if(!wp) continue;
      const k = (idleAnim.keys && idleAnim.keys[L.id] && idleAnim.keys[L.id][0]) || {rot:0};
      const w = def.canvas.w * (k.w !== undefined ? k.w : L.w);
      const h = def.canvas.h * (k.h !== undefined ? k.h : L.h);
      const px = w * L.pivot.x, py = h * L.pivot.y;
      const rot = wp.rot * BOSS_DEG2RAD;
      const cos = Math.cos(rot), sin = Math.sin(rot);
      for(const c of [[0,0],[w,0],[0,h],[w,h]]){
        const dx = c[0] - px, dy = c[1] - py;
        const rx = dx*cos - dy*sin + wp.wx;
        const ry = dx*sin + dy*cos + wp.wy;
        if(ry < iMinY) iMinY = ry;
        if(ry > iMaxY) iMaxY = ry;
        if(rx < iMinX) iMinX = rx;
        if(rx > iMaxX) iMaxX = rx;
      }
    }
    if(isFinite(iMinY)){
      const idleH = iMaxY - iMinY;
      /* rev-fix: 玩家实际视觉高度 = H * factor * (515-59.26)/386 ≈ H * factor * 1.1807 */
      const PLAYER_VISUAL_RATIO = 455.74 / 386;
      const targetVisualH = canvasH * CHAR_HEIGHT_FACTOR * PLAYER_VISUAL_RATIO;
      const fitScale = targetVisualH / idleH;
      const idleCX = (iMinX + iMaxX) / 2;
      const offsetX = canvasW / 2 - idleCX * fitScale;
      const groundY = canvasH * 0.95;
      const offsetY = groundY - iMaxY * fitScale;
      return { sx: fitScale, sy: fitScale, ox: offsetX, oy: offsetY };
    }
  }
  const s = Math.min(canvasW / def.canvas.w, canvasH / def.canvas.h);
  return { sx: s, sy: s, ox: (canvasW - def.canvas.w * s) / 2, oy: canvasH - def.canvas.h * s };
}

/* ============== Boss 繪製 ============== */
function drawBlockBoss(ctx, canvasW, canvasH, bossId, animName, frameIdx){
  const def = BOSS_LAYERS[bossId];
  if(!def) return;
  const anims = BOSS_ANIMS[bossId];
  if(!anims) return;
  const anim = anims[animName] || anims.idle;
  if(!anim) return;
  const fi = ((frameIdx % anim.frameCount) + anim.frameCount) % anim.frameCount;

  const world = resolveBossWorld(def, anim, fi);

  ctx.save();
  let _tf;
  if((isBossType(bossId, 'omega')) && animName === 'death'){
    const _df = computeBossDeathFit(def, bossId, canvasW, canvasH);
    _tf = _df ? { sx: _df.fitScale, sy: _df.fitScale, ox: _df.offsetX, oy: _df.offsetY } : getBossCanvasTransform(def, bossId, canvasW, canvasH);
  } else {
    _tf = getBossCanvasTransform(def, bossId, canvasW, canvasH);
  }
  ctx.translate(_tf.ox, _tf.oy);
  ctx.scale(_tf.sx, _tf.sy);

  const _SHIELD_LIDS = ['shield','shield_2','shield_3','shield_4'];
  const _hideShield = ((isBossType(bossId, 'tyrant')) && typeof battle !== 'undefined' && battle && battle.shieldBroken);
  const _hideHydraHead = ((isBossType(bossId, 'hydra')) && typeof battle !== 'undefined' && battle && battle.heads);
  let _hydraOwnerMap = null;
  if(_hideHydraHead){
    _hydraOwnerMap = {};
    const _resolveAnchorOwner = (lid, seen) => {
      seen = seen || new Set();
      if(seen.has(lid)) return null;
      seen.add(lid);
      if(/^head_\d+$/.test(lid)) return lid;
      const _L = def.layers.find(x => x.id === lid);
      if(!_L || !_L.anchor) return null;
      return _resolveAnchorOwner(_L.anchor.target, seen);
    };
    for(const L of def.layers){
      const anchorOwner = _resolveAnchorOwner(L.id);
      if(anchorOwner){ _hydraOwnerMap[L.id] = anchorOwner; }
    }
    const _emIds = def.layers.filter(L => /^(eye|mouth)/.test(L.id)).map(L => L.id);
    const _visited = new Set();
    for(const _id of _emIds){
      if(_visited.has(_id)) continue;
      if(_hydraOwnerMap[_id]) continue;
      const _group = [];
      const _queue = [_id];
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
        const w2 = world[gid];
        if(w2){ sx += w2.wx; sy += w2.wy; cnt++; }
      }
      if(cnt === 0) continue;
      const cx2 = sx / cnt, cy2 = sy / cnt;
      const bestId = pickHeadForPoint(cx2, cy2, def, world, anim, fi);
      if(bestId){
        for(const gid of _group) _hydraOwnerMap[gid] = bestId;
      }
    }
  }

  const sorted = def.layers.slice().sort((a,b)=>a.z - b.z);
  for(const L of sorted){
    if(_hideShield && _SHIELD_LIDS.indexOf(L.id) >= 0) continue;
    if(_hideHydraHead && _hydraOwnerMap){
      const _owner = _hydraOwnerMap[L.id];
      if(_owner && !battle.heads[_owner].alive) continue;
    }
    if((isBossType(bossId, 'omega')) && typeof battle !== 'undefined' && battle && battle.arms){
      const _arm = getOmegaArmIdOfLayer(L.id);
      if(_arm && !battle.arms[_arm].alive) continue;
    }
    const k = (anim.keys && anim.keys[L.id] && anim.keys[L.id][fi]) || {rot:0, dx:0, dy:0};
    const wp = world[L.id] || { wx: def.canvas.w * L.x, wy: def.canvas.h * L.y, rot: 0 };
    const w = def.canvas.w * (k.w !== undefined ? k.w : L.w);
    const h = def.canvas.h * (k.h !== undefined ? k.h : L.h);
    const px = w * L.pivot.x;
    const py = h * L.pivot.y;
    if((isBossType(bossId, 'omega')) && animName === 'death'){
      const _cd = Math.cos(wp.rot * BOSS_DEG2RAD);
      const _sd = Math.sin(wp.rot * BOSS_DEG2RAD);
      let _allOut = true;
      for(const _cc of [[0,0],[w,0],[0,h],[w,h]]){
        const _dxc = _cc[0] - px, _dyc = _cc[1] - py;
        const _rxc = _dxc * _cd - _dyc * _sd + wp.wx;
        const _ryc = _dxc * _sd + _dyc * _cd + wp.wy;
        const _cxc = _tf.ox + _rxc * _tf.sx;
        const _cyc = _tf.oy + _ryc * _tf.sy;
        if(_cxc > -2 && _cxc < canvasW + 2 && _cyc > -2 && _cyc < canvasH + 2){
          _allOut = false;
          break;
        }
      }
      if(_allOut) continue;
    }
    ctx.save();
    ctx.translate(wp.wx, wp.wy);
    ctx.rotate(wp.rot * BOSS_DEG2RAD);
    ctx.translate(-px, -py);
    ctx.fillStyle = L.color;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(0,0,0,0.65)';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, w - 2, h - 2);
    ctx.restore();
  }
  ctx.restore();
}

function renderBossBattleCanvas(){
  if(typeof battle === 'undefined' || !battle) return;
  if(!BOSS_LAYERS[battle.bossId]) return;
  const canvas = document.getElementById('boss-battle-canvas');
  if(!canvas) return;
  const sprite = canvas.parentElement;
  const w = sprite.clientWidth  || 280;
  const h = sprite.clientHeight || 280;
  if(canvas.width !== w || canvas.height !== h){ canvas.width = w; canvas.height = h; }
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, w, h);
  drawBlockBoss(ctx, w, h, battle.bossId, battleBossAnim.name, battleBossAnim.frame);
}

function updateBattleBossAnim(now){
  var b=(typeof battle!=='undefined')?battle:null; if(!b) return;
  var anims=BOSS_ANIMS[b.bossId]; if(!anims) return;
  /* rev-animatk2: 攻擊時間軸優先 —— 起手拉伸 / 接觸幀事件 / 收招可取消 */
  var tl=b._atkTL;
  if(tl&&tl.active&&battleBossAnim.name===tl.anim){
    window._bossAttackTick(tl,now,anims[tl.anim]);
    return;
  }
  /* 突進飛行：leap 幀由位移進度驅動 */
  if(b._leapDrive&&b.bossDash&&battleBossAnim.name==='leap'&&anims.leap){
    var la=anims.leap;
    battleBossAnim.frame=Math.floor((b.bossDash.flightProgress||0)*la.frameCount)%la.frameCount;
    return;
  }
  var a=anims[battleBossAnim.name]||anims.idle; if(!a) return;
  var rate=1;
  if(battleBossAnim.name==='walk'&&typeof b.bossAnimRate==='number'){
    rate=Math.max(0.4,Math.min(2.6,b.bossAnimRate));
  }
  var interval=(1000/a.fps)/rate;
  if(now-battleBossAnim.lastUpdate>=interval){
    battleBossAnim.lastUpdate=now;
    if(a.loop){
      battleBossAnim.frame=(battleBossAnim.frame+1)%a.frameCount;
    } else {
      if(battleBossAnim.frame<a.frameCount-1){ battleBossAnim.frame++; }
      /* rev-animatk2: forcedEnd 守衛 —— death（forcedEnd=0）停在最後一幀等結算，不強制回 idle */
      else if(battleBossAnim.forcedEnd&&now>battleBossAnim.forcedEnd){
        battleBossAnim.name='idle'; battleBossAnim.frame=0; battleBossAnim.forcedEnd=0; battleBossAnim._cancelFrom=0;
      }
    }
  }
}



/* ============== 場景 / 邊界 ============== */















/* ============== 部位 / 瞄準 ============== */
function pickAimPartFromClick(canvasX, canvasY){
  if(typeof battle === 'undefined' || !battle) return null;
  const def = BOSS_LAYERS[battle.bossId];
  if(!def) return null;
  const anims = BOSS_ANIMS[battle.bossId];
  const anim = anims ? (anims[battleBossAnim.name] || anims.idle) : null;
  if(!anim) return null;
  const fi = ((battleBossAnim.frame % anim.frameCount) + anim.frameCount) % anim.frameCount;
  const world = resolveBossWorld(def, anim, fi);
  const sorted = def.layers.slice().sort((a,b)=>b.z - a.z);
  /* 1. 精确矩形命中（原逻辑） */
  for(const L of sorted){
    const k = (anim.keys && anim.keys[L.id] && anim.keys[L.id][fi]) || {rot:0,dx:0,dy:0};
    const w = def.canvas.w * (k.w !== undefined ? k.w : L.w);
    const h = def.canvas.h * (k.h !== undefined ? k.h : L.h);
    const px = w * L.pivot.x;
    const py = h * L.pivot.y;
    const wp = world[L.id];
    if(!wp) continue;
    const dx = canvasX - wp.wx;
    const dy = canvasY - wp.wy;
    const angle = -wp.rot * BOSS_DEG2RAD;
    const cosA = Math.cos(angle), sinA = Math.sin(angle);
    const localX = dx * cosA - dy * sinA + px;
    const localY = dx * sinA + dy * cosA + py;
    if(localX >= 0 && localX <= w && localY >= 0 && localY <= h){
      return L.id;
    }
  }
/* rev-fix-boss-aim-no-fallback: 点击不在任何 layer 矩形内 → 返回 null，不建立瞄准点。
   * 原先的 fallback 到最近 layer 会导致点 Boss 空白处误打某个部位。 */
  return null;
}


function getAimTargetPos(){
/* sprite 為 bottom:0 錨定且高度 = 場景高，頂部不是 battle.by*H —— 用實際 DOM rect */
if(typeof battle === "undefined" || !battle) return {x:0.75, y:0.6};
const fxEl = document.getElementById("battle-fx");
const bossSprite = document.getElementById("boss-sprite");
if(!fxEl || !bossSprite) return {x:battle.bx, y:0.6};
const def = (typeof BOSS_LAYERS !== "undefined") ? BOSS_LAYERS[battle.bossId] : null;
const part = battle.aimPart;
if(!def || !part) return {x:battle.bx, y:0.6};
const L = def.layers.find(function(l){ return l.id === part; });
if(!L) return {x:battle.bx, y:0.6};
const anims = BOSS_ANIMS[battle.bossId];
const anim = anims ? (anims[battleBossAnim.name] || anims.idle) : null;
if(!anim) return {x:battle.bx, y:0.6};
const fi = ((battleBossAnim.frame % anim.frameCount) + anim.frameCount) % anim.frameCount;
const world = resolveBossWorld(def, anim, fi);
const wp = world[part];
if(!wp) return {x:battle.bx, y:0.6};
const k = (anim.keys && anim.keys[part] && anim.keys[part][fi]) || {rot:0,dx:0,dy:0};
const w = def.canvas.w * (k.w !== undefined ? k.w : L.w);
const h = def.canvas.h * (k.h !== undefined ? k.h : L.h);
const px = w * L.pivot.x, py = h * L.pivot.y;
let localX, localY;
if(battle.aimLocal && battle.aimLocal.part === part && w > 0 && h > 0){
localX = battle.aimLocal.u * w; localY = battle.aimLocal.v * h;
} else { localX = w / 2; localY = h / 2; }
const offX = localX - px, offY = localY - py;
const ang = wp.rot * BOSS_DEG2RAD, cA = Math.cos(ang), sA = Math.sin(ang);
const tWX = wp.wx + offX * cA - offY * sA;
const tWY = wp.wy + offX * sA + offY * cA;
const _tf = getBossCanvasTransform(def, battle.bossId, bossSprite.clientWidth || 280, bossSprite.clientHeight || 280);
const _fr = fxEl.getBoundingClientRect(), _sr = bossSprite.getBoundingClientRect();
const W = _fr.width || 1, H = _fr.height || 1;
return {
x: ((_sr.left - _fr.left) + _tf.ox + tWX * _tf.sx) / W,
y: ((_sr.top - _fr.top) + _tf.oy + tWY * _tf.sy) / H
};
}


/* rev-aim-reset: 弱點（Hydra 頭 / Omega 臂）被摧毀後，瞄準點必須自動回到預設，
   並清掉 aimLocal 與準星標記 —— 否則準星停在已消失的層上，後續射擊落點全錯。 */
window._bossLiveAimPart = function(part){
  if(typeof battle === 'undefined' || !battle || !part) return false;
  var _isH = (typeof isBossType === 'function') && isBossType(battle.bossId, 'hydra');
  var _isO = (typeof isBossType === 'function') && isBossType(battle.bossId, 'omega');
  if(_isH && battle.heads){
    var owner = null;
    if(battle.heads[part]) owner = part;
    else if(typeof HYDRA_NECK_MAP !== 'undefined' && HYDRA_NECK_MAP[part]) owner = HYDRA_NECK_MAP[part];
    else if(part === 'neck_3b') owner = 'head_3';
    else if(/^(eye|mouth)/.test(String(part)) && typeof findNearestHeadForLayer === 'function') owner = findNearestHeadForLayer(part);
    if(!owner) return false;
    return !!(battle.heads[owner] && battle.heads[owner].alive);
  }
  if(_isO && battle.arms){
    var arm = (typeof getOmegaArmIdOfLayer === 'function') ? getOmegaArmIdOfLayer(part) : null;
    if(arm) return !!(battle.arms[arm] && battle.arms[arm].alive);
  }
  var def = (typeof BOSS_LAYERS !== 'undefined') ? BOSS_LAYERS[battle.bossId] : null;
  if(!def) return false;
  for(var i = 0; i < def.layers.length; i++){ if(def.layers[i].id === part) return true; }
  return false;
};
window._bossDefaultAimPart = function(){
  if(typeof battle === 'undefined' || !battle) return null;
  if(typeof isBossType === 'function' && isBossType(battle.bossId, 'hydra') && battle.heads && typeof HYDRA_HEAD_IDS !== 'undefined'){
    for(var i = 0; i < HYDRA_HEAD_IDS.length; i++){
      var h = battle.heads[HYDRA_HEAD_IDS[i]];
      if(h && h.alive) return HYDRA_HEAD_IDS[i];
    }
  }
  return (typeof defaultAimPartForBoss === 'function') ? defaultAimPartForBoss(battle.bossId) : null;
};
window._bossResetAimIfInvalid = function(){
  if(typeof battle === 'undefined' || !battle) return false;
  if(window._bossLiveAimPart(battle.aimPart)) return false;
  battle.aimPart = window._bossDefaultAimPart();
  battle.aimLocal = null;
  var mk = document.getElementById('aim-marker'); if(mk && mk.parentNode) mk.parentNode.removeChild(mk);
  var gk = document.getElementById('ghost-aim-marker'); if(gk && gk.parentNode) gk.parentNode.removeChild(gk);
  return true;
};
function isWeakPointHit(){
  /* rev-aim-reset: 弱點判定改讀「當前存活」的弱點矩形，
     Hydra 的 BOSS_WEAKPOINTS 是空陣列，舊實作導致點頭永遠不算弱點。 */
  if(typeof battle === 'undefined' || !battle) return false;
  var weak = (typeof BOSS_WEAKPOINTS !== 'undefined' && BOSS_WEAKPOINTS[battle.bossId]) || [];
  if(weak.indexOf(battle.aimPart) >= 0) return true;
  if(typeof window._bossWeakMap === 'function'){
    var rects = window._bossWeakMap();
    for(var i = 0; i < rects.length; i++){ if(rects[i].part === battle.aimPart) return true; }
  }
  return false;
}



/* ============== Boss 血條位置 ============== */




function updateFighterPos(){
if(typeof battle === "undefined" || !battle) return;
/* 只負責水平位置；垂直與 HUD 由 CSS 擁有 */
const h = document.getElementById("fighter-hero");
const b = document.getElementById("fighter-boss");
if(h) h.style.left = (battle.px * 100) + "%";
if(b) b.style.left = (battle.bx * 100) + "%";
}

/* ============== 命中 / 特效 ============== */
/* rev-float-unify: Boss 戰飄字與探索 _float 完全同源 —— 同一組顏色、
   同一字體（bold 16px sans-serif）、同一上浮速度（age*40）、同一 1.2s 生命。
   錨點：虛影開啟 → 虛影內容頭頂；Boss 在畫面內 → Boss 內容頭頂；
   兩者皆無 → 退回 HUD 塊下緣（原行為）。玩家一律用探索的 y=0.12。 */
function _bossFloatAnchorN(x, y, layer){
  var b = (typeof battle !== 'undefined') ? battle : null;
  var W = layer.clientWidth || 400, H = layer.clientHeight || 500;
  var fr = layer.getBoundingClientRect();
  function _contentTopN(el){
    if(!el || !b) return null;
    var def = (typeof BOSS_LAYERS !== 'undefined') ? BOSS_LAYERS[b.bossId] : null;
    if(!def || typeof window._bossIdleBounds !== 'function' || typeof getBossCanvasTransform !== 'function') return null;
    var ib = window._bossIdleBounds(b.bossId); if(!ib) return null;
    var r = el.getBoundingClientRect();
    if(!(r.width > 0 && r.height > 0) || !(fr.width > 0 && fr.height > 0)) return null;
    var tf = getBossCanvasTransform(def, b.bossId, r.width, r.height);
    if(!(tf && tf.sx > 0 && tf.sy > 0)) return null;
    var cx = tf.ox + (ib.minX + ib.maxX) * 0.5 * tf.sx;
    var ty = tf.oy + ib.minY * tf.sy;
    return { x: (r.left - fr.left + cx) / W, y: (r.top - fr.top + ty) / H };
  }
  if(x === 'boss'){
    var p = null;
    if(b && b.ghostOpen) p = _contentTopN(document.getElementById('boss-ghost-canvas'));
    if(!p && b){
      var onScreen = (typeof b.bx === 'number') && b.bx > -0.02 && b.bx < 1.02;
      if(onScreen) p = _contentTopN(document.getElementById('boss-sprite'));
    }
    if(!p){
      var hp = document.querySelector('.fighter.boss-f .hpbar-wrap');
      if(hp && fr.width > 0 && fr.height > 0){
        var hr = hp.getBoundingClientRect();
        if(hr.width > 0) p = { x: (hr.left - fr.left + hr.width / 2) / W, y: (hr.bottom - fr.top + 8) / H + 0.03 };
      }
    }
    if(!p) p = { x: (b && typeof b.bx === 'number') ? b.bx : 0.75, y: 0.15 };
    return { x: Math.max(0.04, Math.min(0.96, p.x)), y: Math.max(0.05, Math.min(0.90, p.y - 0.03)) };
  }
  if(x === 'player'){
    return { x: (b && typeof b.px === 'number') ? b.px : 0.25, y: 0.12 };
  }
  return { x: (typeof x === 'number') ? x : 0.5, y: (typeof y === 'number') ? y : 0.12 };
}
function spawnHitFx(x, y, txt, cls, sparkX, sparkY){
  var layer = document.getElementById('battle-fx');
  if(!layer) return;
  var b = (typeof battle !== 'undefined') ? battle : null;
  var _isMiss = (String(txt).toUpperCase() === 'MISS');
  if(!_isMiss && cls !== 'miss' && cls !== 'heal' && typeof window._spawnHitSpark === 'function'){
    var _sx = null, _sy = null;
    if(typeof sparkX === 'number' && typeof sparkY === 'number'){ _sx = sparkX; _sy = sparkY; }
    else if(typeof x === 'number' && typeof y === 'number'){ _sx = x; _sy = y; }
    if(_sx !== null && _sy !== null && b){
      window._spawnHitSpark(b, _sx * (layer.clientWidth || 400), _sy * (layer.clientHeight || 500), cls === 'crit', cls);
    }
  }
  if(!b) return;
  if(!Array.isArray(b.floats)) b.floats = [];
  var a = _bossFloatAnchorN(x, y, layer);
  b.floats.push({ text: String(txt), cls: cls || '', age: 0, x: a.x, y: a.y });
}


function playShieldShatterFx(){
const layer = document.getElementById("battle-fx");
if(!layer || typeof battle === "undefined" || !battle) return;
let _cx = battle.bx * 100, _cy = 60;
const _sp = document.getElementById("boss-sprite");
if(_sp){
const _fr = layer.getBoundingClientRect(), _sr = _sp.getBoundingClientRect();
if(_fr.width > 0 && _fr.height > 0){
_cx = ((_sr.left - _fr.left) + _sr.width * 0.5) / _fr.width * 100;
_cy = ((_sr.top - _fr.top) + _sr.height * 0.62) / _fr.height * 100;
}
}
const fx = document.createElement("div");
fx.className = "shield-shatter-fx";
fx.style.left = _cx + "%";
fx.style.top  = _cy + "%";
const glow = document.createElement("div");
glow.className = "glow";
fx.appendChild(glow);
for(let i = 0; i < 14; i++){
const frag = document.createElement("div");
frag.className = "frag";
const ang = (i / 14) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
const dist = 30 + Math.random() * 50;
const dx = Math.cos(ang) * dist, dy = Math.sin(ang) * dist;
frag.animate([
{transform:"translate(0,0) scale(1) rotate(0deg)", opacity:1},
{transform:"translate(" + dx + "px," + dy + "px) scale(0.4) rotate(" + (Math.random()*360-180) + "deg)", opacity:0}
], {duration: 500 + Math.random()*200, easing:"cubic-bezier(.2,.8,.4,1)", fill:"forwards"});
fx.appendChild(frag);
}
layer.appendChild(fx);
setTimeout(function(){ fx.remove(); }, 800);
}


function breakBossShield(){
  if(typeof battle === 'undefined' || !battle || battle.shieldBroken) return;
  battle.shieldBroken = true;
  battle.bossArmor = Math.round(battle.bossArmor * 0.6);
  battle.bossMaxArmor = battle.bossArmor;
  const wrap = document.getElementById('shield-bar-wrap');
  if(wrap) wrap.remove();
  playShieldShatterFx();
}


function showBossTelegraph(sk){
const layer = document.getElementById("battle-fx");
if(!layer || typeof battle === "undefined" || !battle) return;
const W = layer.clientWidth || 400;
const ratio = sk.telegraphRatio || sk.range;
const diameterPx = Math.round(W * ratio * 2);
let _cx = battle.bx * 100, _cy = 60;
const _sp = document.getElementById("boss-sprite");
if(_sp){
const _fr = layer.getBoundingClientRect(), _sr = _sp.getBoundingClientRect();
if(_fr.width > 0 && _fr.height > 0){
_cx = ((_sr.left - _fr.left) + _sr.width * 0.5) / _fr.width * 100;
_cy = ((_sr.top - _fr.top) + _sr.height * 0.62) / _fr.height * 100;
}
}
const t = document.createElement("div");
t.className = "boss-telegraph" + (sk.aoe ? " aoe" : "");
t.style.left = _cx + "%";
t.style.top  = _cy + "%";
t.style.width  = diameterPx + "px";
t.style.height = diameterPx + "px";
layer.appendChild(t);
setTimeout(function(){ t.remove(); }, (sk.totalTime || 1500) + 100);
}


function getBossMuzzlePos(){
  if(typeof battle === 'undefined' || !battle) return {x:0.75, y:0.3};
  const fx = document.getElementById('battle-fx');
  const bossSprite = document.getElementById('boss-sprite');
  if(!fx || !bossSprite) return {x:battle.bx, y:battle.by};
  const fxRect = fx.getBoundingClientRect();
  const spriteRect = bossSprite.getBoundingClientRect();
  if(fxRect.width === 0 || fxRect.height === 0) return {x:battle.bx, y:battle.by};
  const x = (spriteRect.left - fxRect.left + spriteRect.width * 0.5) / fxRect.width;
  const y = (spriteRect.top - fxRect.top + spriteRect.height * 0.62) / fxRect.height;
  return { x, y };
}

function spawnBossProjectile(sk){
  if(typeof battle === 'undefined' || !battle || !battle.active) return;
  const fx = document.getElementById('battle-fx');
  if(!fx) return;
  const type = sk.projectile;
  if(!type) return;
  const muzzle = getBossMuzzlePos();
  const n = (type === 'acid') ? 3 : 1;
  for(let i = 0; i < n; i++){
    setTimeout(() => {
      if(typeof battle === 'undefined' || !battle || !battle.active) return;
      spawnSingleProjectile(fx, type, muzzle.x, muzzle.y);
    }, i * 90);
  }
}


function spawnSingleProjectile(fx, type, sx, sy){
if(typeof battle === "undefined" || !battle) return;
let tx = clamp(battle.px + (Math.random() - 0.5) * 0.05, 0.05, 0.95);
let ty = 0.62;
const _hs = document.getElementById("hero-sprite");
if(_hs){
const _fr = fx.getBoundingClientRect(), _hr = _hs.getBoundingClientRect();
if(_fr.width > 0 && _fr.height > 0){
tx = clamp(((_hr.left - _fr.left) + _hr.width * 0.5) / _fr.width + (Math.random() - 0.5) * 0.04, 0.05, 0.95);
ty = clamp(((_hr.top - _fr.top) + _hr.height * 0.62) / _fr.height, 0.05, 0.95);
}
}
const wrap = document.createElement("div");
wrap.className = "boss-proj-wrap";
wrap.style.left = (sx * 100) + "%";
wrap.style.top  = (sy * 100) + "%";
wrap.style.transition = "left .5s cubic-bezier(.25,.8,.4,1), top .5s cubic-bezier(.25,.8,.4,1)";
fx.appendChild(wrap);
const inner = document.createElement("div");
if(type === "web"){
inner.className = "boss-proj web";
const W = fx.clientWidth || 400, H = fx.clientHeight || 500;
const dxPx = (tx - sx) * W, dyPx = (ty - sy) * H;
const ang = Math.atan2(dyPx, dxPx) * 180 / Math.PI;
inner.style.transform = "rotate(" + ang + "deg)";
} else {
inner.className = "boss-proj acid";
}
wrap.appendChild(inner);
requestAnimationFrame(function(){
wrap.style.left = (tx * 100) + "%";
wrap.style.top  = (ty * 100) + "%";
});
setTimeout(function(){
if(type === "acid"){
inner.style.transition = "opacity .18s, transform .18s";
inner.style.opacity = "0";
inner.style.transform = (inner.style.transform || "") + " scale(1.5)";
} else {
inner.style.transition = "opacity .15s";
inner.style.opacity = "0";
}
setTimeout(function(){ wrap.remove(); }, 200);
}, 520);
}


/* ============== Hydra 頭部 ============== */
function initHydraHeads(){
  if(typeof battle === 'undefined' || !battle) return;
  battle.heads = {};
  for(const id of HYDRA_HEAD_IDS){ battle.heads[id] = { hp: HYDRA_HEAD_HP, max: HYDRA_HEAD_HP, alive: true }; }
  battle.bossMaxHp = HYDRA_HEAD_HP * HYDRA_HEAD_IDS.length;
  battle.bossHp = battle.bossMaxHp;
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
  if(typeof battle === 'undefined' || !battle) return null;
  const def = BOSS_LAYERS[battle.bossId]; if(!def) return null;
  const anims = BOSS_ANIMS[battle.bossId]; if(!anims) return null;
  const anim = anims[battleBossAnim.name] || anims.idle; if(!anim) return null;
  const fi = ((battleBossAnim.frame % anim.frameCount) + anim.frameCount) % anim.frameCount;
  const world = resolveBossWorld(def, anim, fi);
  const _isEM = /^(eye|mouth)/.test(layerId);
  if(!_isEM){
    const self = world[layerId]; if(!self) return null;
    return pickHeadForPoint(self.wx, self.wy, def, world, anim, fi);
  }
  const _emIds = def.layers.filter(L => /^(eye|mouth)/.test(L.id)).map(L => L.id);
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
  if(typeof battle === 'undefined' || !battle || !battle.heads) return [];
  if(battle.heads[aimPart] && battle.heads[aimPart].alive) return [aimPart];
  if(HYDRA_NECK_MAP[aimPart]){
    const h = HYDRA_NECK_MAP[aimPart];
    if(battle.heads[h] && battle.heads[h].alive) return [h];
    return [];
  }
  if(/^(eye|mouth)/.test(aimPart)){
    const owner = findNearestHeadForLayer(aimPart);
    if(owner && battle.heads[owner] && battle.heads[owner].alive) return [owner];
    return [];
  }
  return HYDRA_HEAD_IDS.filter(h => battle.heads[h].alive);
}


function getHeadScreenPos(headId){
if(typeof battle === "undefined" || !battle) return null;
const def = BOSS_LAYERS[battle.bossId]; if(!def) return null;
const anims = BOSS_ANIMS[battle.bossId]; if(!anims) return null;
const anim = anims[battleBossAnim.name] || anims.idle; if(!anim) return null;
const fi = ((battleBossAnim.frame % anim.frameCount) + anim.frameCount) % anim.frameCount;
const world = resolveBossWorld(def, anim, fi);
const wp = world[headId]; if(!wp) return null;
const bossSprite = document.getElementById("boss-sprite");
const fxEl = document.getElementById("battle-fx");
if(!bossSprite || !fxEl) return null;
const _tf = getBossCanvasTransform(def, battle.bossId, bossSprite.clientWidth || 280, bossSprite.clientHeight || 280);
const _fr = fxEl.getBoundingClientRect(), _sr = bossSprite.getBoundingClientRect();
const W = _fr.width || 1, H = _fr.height || 1;
return {
x: ((_sr.left - _fr.left) + _tf.ox + wp.wx * _tf.sx) / W,
y: ((_sr.top - _fr.top) + _tf.oy + wp.wy * _tf.sy) / H
};
}


function playHeadBreakFx(headId){
  const layer = document.getElementById('battle-fx');
  if(!layer || typeof battle === 'undefined' || !battle) return;
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
if(typeof battle === "undefined" || !battle) return;
if(!isBossType(battle.bossId, "hydra") || !battle.heads) return;
const container = document.getElementById("head-bars"); if(!container) return;
const def = BOSS_LAYERS[battle.bossId]; if(!def) return;
const anims = BOSS_ANIMS[battle.bossId];
const anim = anims ? (anims[battleBossAnim.name] || anims.idle) : null; if(!anim) return;
const fi = ((battleBossAnim.frame % anim.frameCount) + anim.frameCount) % anim.frameCount;
const world = resolveBossWorld(def, anim, fi);
const bossSprite = document.getElementById("boss-sprite");
const fxEl = document.getElementById("battle-fx");
if(!bossSprite || !fxEl) return;
const _tf = getBossCanvasTransform(def, battle.bossId, bossSprite.clientWidth || 280, bossSprite.clientHeight || 280);
const _fr = fxEl.getBoundingClientRect(), _sr = bossSprite.getBoundingClientRect();
const spriteLeft = _sr.left - _fr.left, spriteTop = _sr.top - _fr.top;
for(let i = 1; i <= 7; i++){
const headId = "head_" + i;
const head = battle.heads[headId]; if(!head) continue;
let bar = document.getElementById("head-bar-" + i);
if(!head.alive){ if(bar) bar.remove(); continue; }
const L = def.layers.find(function(l){ return l.id === headId; }); if(!L) continue;
const k = (anim.keys && anim.keys[headId] && anim.keys[headId][fi]) || {rot:0,dx:0,dy:0};
const w = def.canvas.w * (k.w !== undefined ? k.w : L.w);
const h = def.canvas.h * (k.h !== undefined ? k.h : L.h);
const px = w * L.pivot.x, py = h * L.pivot.y;
const wp = world[headId]; if(!wp) continue;
const dxx = w / 2 - px, dyy = 0 - py;
const rot = wp.rot * BOSS_DEG2RAD, cos = Math.cos(rot), sin = Math.sin(rot);
const topWX = wp.wx + dxx * cos - dyy * sin;
const topWY = wp.wy + dxx * sin + dyy * cos;
const screenX = spriteLeft + _tf.ox + topWX * _tf.sx;
const screenY = spriteTop + _tf.oy + topWY * _tf.sy - 6;
if(!bar){
bar = document.createElement("div");
bar.id = "head-bar-" + i;
bar.className = "head-bar";
bar.innerHTML = "<div class=\"bar\"><div class=\"fill\"></div></div>";
container.appendChild(bar);
}
bar.style.left = screenX + "px";
bar.style.top = screenY + "px";
const fill = bar.querySelector(".fill");
if(fill) fill.style.width = Math.max(0, head.hp / head.max * 100) + "%";
}
}


/* ============== Omega 四臂 ============== */
function initOmegaArms(){
  if(typeof battle === 'undefined' || !battle) return;
  battle.arms = {};
  for(const id of OMEGA_ARM_IDS){
    battle.arms[id] = { hp: OMEGA_ARM_HP, max: OMEGA_ARM_HP, alive: true };
  }
}

function getOmegaArmIdOfLayer(layerId){
  if(layerId && layerId.indexOf('ring_') === 0) return layerId;
  return null;
}

function damageOmegaArm(armId, dmg){
  if(typeof battle === 'undefined' || !battle || !battle.arms) return;
  const arm = battle.arms[armId];
  if(!arm || !arm.alive) return;
  arm.hp = Math.max(0, arm.hp - dmg);
  if(arm.hp <= 0){
    arm.alive = false;
      if(typeof window._bossResetAimIfInvalid === 'function') window._bossResetAimIfInvalid(); /* rev-aim-reset */
    playHeadBreakFx(armId);
    if(battle.aimPart === armId){
      battle.aimPart = (typeof defaultAimPartForBoss === 'function')
        ? defaultAimPartForBoss(battle.bossId)
        : 'core';
    }
  }
}

function isOmegaArmBroken(armId){
  if(typeof battle === 'undefined' || !battle || !battle.arms) return false;
  const arm = battle.arms[armId];
  return !!arm && !arm.alive;
}

function isOmegaSkillDisabled(sk){
  if(typeof battle === 'undefined' || !battle) return false;
  if(!isBossType(battle.bossId, 'omega')) return false;
  if(!sk.armRequired) return false;
  return isOmegaArmBroken(sk.armRequired);
}

/* ===== rev-animatk2:start ===== */
/* rev-animatk2: 攻擊時間軸 + 武器幾何（唯一量測入口，自帶 idle bounds fallback）
   畫布 → 戰鬥米：X 以 BOSS_HALF_WIDTH_M / 視覺半寬 校準（與玩家射程判定同一 footprint），
   Y 用真實米。reach 供 AI 出手決策，掃掠矩形供接觸判定。 */
function _bossBaseId(bid){ return String(bid||'').replace(/_ii$/,''); }
function _bossAtkMeta(bid,animName){
  var M=window.BOSS_ATTACK_META||{};
  var t=M[_bossBaseId(bid)]||{};
  return t[animName]||null;
}
window._bossAtkMeta=_bossAtkMeta;
var _BOSS_IB_LOCAL={};
function _bossIdleBoundsSafe(bid){
  if(typeof window._bossIdleBounds==='function'){ var r=window._bossIdleBounds(bid); if(r) return r; }
  if(_BOSS_IB_LOCAL[bid]) return _BOSS_IB_LOCAL[bid];
  var def=BOSS_LAYERS[bid], anims=BOSS_ANIMS[bid];
  if(!def||!anims||!anims.idle) return null;
  var a=anims.idle, world=resolveBossWorld(def,a,0);
  var mnx=Infinity,mxx=-Infinity,mny=Infinity,mxy=-Infinity;
  for(var i=0;i<def.layers.length;i++){
    var L=def.layers[i], wp=world[L.id]; if(!wp) continue;
    var k=(a.keys&&a.keys[L.id]&&a.keys[L.id][0])||{};
    var w=def.canvas.w*(k.w!==undefined?k.w:L.w), h=def.canvas.h*(k.h!==undefined?k.h:L.h);
    var px=w*L.pivot.x, py=h*L.pivot.y;
    var rot=wp.rot*BOSS_DEG2RAD, cs=Math.cos(rot), sn=Math.sin(rot);
    var co=[[0,0],[w,0],[0,h],[w,h]];
    for(var c=0;c<4;c++){
      var dx=co[c][0]-px, dy=co[c][1]-py;
      var rx=dx*cs-dy*sn+wp.wx, ry=dx*sn+dy*cs+wp.wy;
      if(rx<mnx)mnx=rx; if(rx>mxx)mxx=rx; if(ry<mny)mny=ry; if(ry>mxy)mxy=ry;
    }
  }
  if(!isFinite(mnx)) return null;
  var o={minX:mnx,maxX:mxx,minY:mny,maxY:mxy};
  _BOSS_IB_LOCAL[bid]=o; return o;
}
function _bossLayerRectC(bid,animName,frame,layerId){
  var def=BOSS_LAYERS[bid], anims=BOSS_ANIMS[bid];
  if(!def||!anims) return null;
  var a=anims[animName]; if(!a) return null;
  var L=null;
  for(var i=0;i<def.layers.length;i++) if(def.layers[i].id===layerId){L=def.layers[i];break;}
  if(!L) return null;
  var fi=((frame%a.frameCount)+a.frameCount)%a.frameCount;
  var world=resolveBossWorld(def,a,fi);
  var wp=world[layerId]; if(!wp) return null;
  var k=(a.keys&&a.keys[layerId]&&a.keys[layerId][fi])||{};
  var w=def.canvas.w*(k.w!==undefined?k.w:L.w);
  var h=def.canvas.h*(k.h!==undefined?k.h:L.h);
  var px=w*L.pivot.x, py=h*L.pivot.y;
  var rot=wp.rot*BOSS_DEG2RAD, cs=Math.cos(rot), sn=Math.sin(rot);
  var x1=Infinity,x2=-Infinity,y1=Infinity,y2=-Infinity;
  var co=[[0,0],[w,0],[0,h],[w,h]];
  for(var c=0;c<4;c++){
    var dx=co[c][0]-px, dy=co[c][1]-py;
    var rx=dx*cs-dy*sn+wp.wx, ry=dx*sn+dy*cs+wp.wy;
    if(rx<x1)x1=rx; if(rx>x2)x2=rx; if(ry<y1)y1=ry; if(ry>y2)y2=ry;
  }
  return {x1:x1,x2:x2,y1:y1,y2:y2};
}
window._bossLayerRectC=_bossLayerRectC;
var _BOSS_CONV_CACHE={};
window._bossConvM=function(bid){
  var b=(typeof battle!=='undefined')?battle:null;
  var sp=document.getElementById('boss-sprite');
  var sw=sp?sp.clientWidth:0, sh=sp?sp.clientHeight:0;
  var live=(sw>0&&sh>0);
  if(!live){ sw=600; sh=500; } /* 戰鬥外量測用虛擬視窗 */
  var key=bid+'|'+sw+'|'+sh;
  if(_BOSS_CONV_CACHE[key]) return _BOSS_CONV_CACHE[key];
  var ib=_bossIdleBoundsSafe(bid);
  var def=BOSS_LAYERS[bid];
  if(!ib||!def) return null;
  var tf=getBossCanvasTransform(def,bid,sw,sh);
  var ppm=(live&&b&&b.bgPixelsPerMeter>0)?b.bgPixelsPerMeter:(sh*CHAR_HEIGHT_FACTOR/PLAYER_HEIGHT_M);
  var visHalf=(ib.maxX-ib.minX)*0.5*tf.sx/ppm;
  var halfM=(typeof BOSS_HALF_WIDTH_M==='number')?BOSS_HALF_WIDTH_M:2.0;
  var scale=(visHalf>0.05)?(halfM/visHalf)*(tf.sx/ppm):(tf.sx/ppm);
  var o={cx:(ib.minX+ib.maxX)*0.5,scale:scale,tf:tf,ppm:ppm,sh:sh,groundY:sh*0.95,visHalf:visHalf};
  _BOSS_CONV_CACHE[key]=o; return o;
};
var _BOSS_REACH_CACHE={};
window._bossAttackReachM=function(bid,animName){
  var meta=_bossAtkMeta(bid,animName); if(!meta) return null;
  var conv=window._bossConvM(bid); if(!conv) return null;
  var sp=document.getElementById('boss-sprite');
  var key=bid+'|'+animName+'|'+(sp?sp.clientWidth:0)+'|'+(sp?sp.clientHeight:0);
  if(_BOSS_REACH_CACHE[key]!=null) return _BOSS_REACH_CACHE[key];
  var af=meta.activeFrames||[meta.hitFrame,meta.hitFrame];
  var best=0;
  for(var f=af[0];f<=af[1];f++){
    var r=_bossLayerRectC(bid,animName,f,meta.weapon); if(!r) continue;
    var reach=(conv.cx-r.x1)*conv.scale;
    if(reach>best)best=reach;
  }
  var out=best>0?best:null;
  _BOSS_REACH_CACHE[key]=out; return out;
};
window._bossAttackStart=function(cfg){
  var b=(typeof battle!=='undefined')?battle:null; if(!b) return null;
  var anims=BOSS_ANIMS[b.bossId];
  var a=anims&&anims[cfg.anim]; if(!a) return null;
  var meta=_bossAtkMeta(b.bossId,cfg.anim)||{};
  var kind=cfg.kind||'pose';
  var hitF=(typeof cfg.hitFrame==='number')?cfg.hitFrame:(typeof meta.hitFrame==='number'?meta.hitFrame:a.frameCount-1);
  var cancelF=(typeof meta.cancelFrom==="number")?meta.cancelFrom:a.frameCount;
  if(kind==='pose'){ hitF=a.frameCount-1; cancelF=a.frameCount-1; }
  hitF=Math.max(1,Math.min(hitF,a.frameCount-1));
  var startF=Math.max(0,Math.min(cfg.startFrame||0,hitF-1));
  var nativeWind=Math.round((hitF-startF)*1000/a.fps);
  var tl={
    anim:cfg.anim, kind:kind, active:true,
    hitFrame:hitF, startFrame:startF, cancelFrom:Math.max(cancelF,hitF),
    windupMs:Math.max(50,cfg.windupMs||nativeWind),
    frameDur:1000/a.fps,
    onContact:cfg.onContact||null, onComplete:cfg.onComplete||null,
    lunge:cfg.lunge||null, sk:cfg.sk||null,
    contactDone:false, phase:'windup', phaseAt:performance.now(), lastNow:performance.now()
  };
  b._atkTL=tl;
  battleBossAnim.name=cfg.anim;
  battleBossAnim.frame=startF;
  battleBossAnim.lastUpdate=performance.now();
  battleBossAnim._cancelFrom=tl.cancelFrom;
  battleBossAnim.forcedEnd=performance.now()+tl.windupMs+(a.frameCount-startF)*tl.frameDur+500;
  return tl;
};
function _bossAttackEnd(tl,finished){
  tl.active=false;
  if(typeof battle!=='undefined'&&battle&&battle._atkTL===tl) battle._atkTL=null;
  if(finished){
    battleBossAnim.name='idle'; battleBossAnim.frame=0;
    battleBossAnim.forcedEnd=0; battleBossAnim._cancelFrom=0;
  } else {
    battleBossAnim._cancelFrom=tl.cancelFrom; /* 收招尾巴：可被 walk/idle 接手 */
  }
  if(tl.onComplete){ try{tl.onComplete(tl,finished);}catch(e){console.warn("[atkComplete]",e);} }
}
window._bossAttackTick=function(tl,now,a){
  var b=(typeof battle!=='undefined')?battle:null;
  if(!b||!a){ _bossAttackEnd(tl,true); return; }
  var dt=Math.min(0.05,(now-tl.lastNow)/1000); tl.lastNow=now;
  /* 突步：只在接觸前，預算封頂，不推擠玩家 */
  if(tl.lunge&&!tl.contactDone){
    var lg=tl.lunge;
    var dx=lg.targetX-b.bossWorldX;
    var dir=dx>0?1:-1;
    var step=Math.min(Math.abs(dx),lg.speed*dt,Math.max(0,lg.budget-lg.spent));
    if(step>0.0005){ b.bossWorldX+=dir*step; lg.spent+=step; }
  }
  if(tl.phase==='windup'){
    var n=Math.max(1,tl.hitFrame-tl.startFrame);
    var pf=tl.windupMs/n;
    /* rev-animatk2: tl.startFrame（v1 誤植 tl.startF → NaN → 永不接觸） */
    var f=tl.startFrame+Math.floor((now-tl.phaseAt)/pf);
    if(f>=tl.hitFrame){
      battleBossAnim.frame=tl.hitFrame;
      tl.phase='tail'; tl.phaseAt=now;
      if(!tl.contactDone){
        tl.contactDone=true;
        if(tl.onContact){ try{tl.onContact(tl);}catch(e){console.warn("[atkContact]",e);} }
      }
    } else {
      battleBossAnim.frame=Math.max(tl.startFrame,f);
    }
    return;
  }
  var f2=tl.hitFrame+Math.floor((now-tl.phaseAt)/tl.frameDur);
  if(f2>=a.frameCount){ _bossAttackEnd(tl,true); return; }
  battleBossAnim.frame=f2;
  if(f2>=tl.cancelFrom){ _bossAttackEnd(tl,false); return; }
};
/* 近戰接觸結算：武器掃掠（前一幀 ∪ 接觸幀）∩ 玩家盒；高度 → 部位；whiff = MISS */
window._bossMeleeResolve=function(tl,dmg,pen){
  var b=(typeof battle!=='undefined')?battle:null;
  if(!b||!b.active||b.settling) return;
  var meta=_bossAtkMeta(b.bossId,tl.anim); if(!meta) return;
  var conv=window._bossConvM(b.bossId); if(!conv) return;
  var r1=_bossLayerRectC(b.bossId,tl.anim,tl.hitFrame-1,meta.weapon);
  var r2=_bossLayerRectC(b.bossId,tl.anim,tl.hitFrame,meta.weapon);
  if(!r2) return;
  var rx1=Math.min(r1?r1.x1:r2.x1,r2.x1);
  var rx2=Math.max(r1?r1.x2:r2.x2,r2.x2);
  var tipWX=b.bossWorldX-(conv.cx-rx1)*conv.scale;
  var farWX=b.bossWorldX-(conv.cx-rx2)*conv.scale;
  var pHalf=0.25;
  var pL=b.playerWorldX-pHalf, pR=b.playerWorldX+pHalf;
  var overlapX=(tipWX<=pR&&farWX>=pL);
  var wyTop=(conv.groundY-(conv.tf.oy+r2.y1*conv.tf.sy))/conv.ppm;
  var wyBot=(conv.groundY-(conv.tf.oy+r2.y2*conv.tf.sy))/conv.ppm;
  var overlapY=(wyTop>=0&&wyBot<=1.7)||(wyTop>=0&&wyTop<=1.7)||(wyBot>=0&&wyBot<=1.7)||(wyBot<0&&wyTop>1.7);
  if(!overlapX||!overlapY){
    if(typeof spawnHitFx==='function') spawnHitFx('player',0,'MISS','armor');
    return;
  }
  var hitY=(wyTop+wyBot)/2;
  hitY=Math.max(0.05,Math.min(1.65,hitY));
  var part=(typeof window._partFromYRatio==='function')?window._partFromYRatio(hitY/1.7):'top';
  var prev=window._hitCtx;
  window._hitCtx={target:null,part:part,x:b.playerWorldX,y:hitY,z:0,isDirect:true};
  try{ if(typeof tryHitPlayer==='function') tryHitPlayer(dmg,pen); }
  finally{ window._hitCtx=prev; }
  /* 接觸反饋：60ms 鏡頭震 + 武器尖端火花（無 hitstop） */
  var sc=document.querySelector('.battle-scene');
  if(sc){
    sc.style.transform='translate(2px,1px)';
    setTimeout(function(){ if(sc) sc.style.transform=''; },60);
  }
  if(typeof window._spawnHitSpark==='function'&&typeof window._bossWorldToScreenN==='function'){
    var sp=window._bossWorldToScreenN(Math.max(tipWX,pL),hitY);
    var fx=document.getElementById('battle-fx');
    if(fx) window._spawnHitSpark(b,sp.x*fx.clientWidth,sp.y*fx.clientHeight,false,'enemy');
  }
};
/* Boss 受擊反饋：非攻擊中 + 單次 >2% maxHp 或暴擊 + 900ms 冷卻 */
window._bossHurtFlash=function(shown,isCrit){
  var b=(typeof battle!=='undefined')?battle:null;
  if(!b||b.settling) return;
  if(b._atkTL&&b._atkTL.active) return;
  if(b.bossDash) return;
  var now=performance.now();
  if(now<(b._hurtAnimCdUntil||0)) return;
  var thr=Math.max(1,(b.bossMaxHp||1)*0.02);
  if(!isCrit&&shown<thr) return;
  var anims=BOSS_ANIMS[b.bossId];
  if(!anims||!anims.hurt) return;
  var cur=anims[battleBossAnim.name];
  if(cur&&cur.loop===false&&battleBossAnim.frame<(battleBossAnim._cancelFrom||cur.frameCount)) return;
  battleBossAnim.name='hurt'; battleBossAnim.frame=0; battleBossAnim.lastUpdate=now;
  battleBossAnim._cancelFrom=anims.hurt.frameCount;
  battleBossAnim.forcedEnd=now+anims.hurt.frameCount*1000/anims.hurt.fps;
  b._hurtAnimCdUntil=now+900;
};
/* ===== rev-animatk2:end ===== */

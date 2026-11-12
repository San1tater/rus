
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
  const _p = 'images/bg/boss_' + _base + '.png';
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
function computeBossFit(def, bossId, canvasW, canvasH){
  if(def._fitCached && def._fitCached.cw === canvasW && def._fitCached.ch === canvasH) return def._fitCached;
  const cw = def.canvas.w, ch = def.canvas.h;
  const anims = BOSS_ANIMS[bossId];
  if(!anims){ def._fitCached = null; return null; }
  const _isOmega = (isBossType(bossId, 'omega'));
  let aMinX = Infinity, aMinY = Infinity, aMaxX = -Infinity, aMaxY = -Infinity;
  let iMinX = Infinity, iMinY = Infinity, iMaxX = -Infinity, iMaxY = -Infinity;
  for(const animName in anims){
    if(_isOmega && animName === 'death') continue;
    const anim = anims[animName];
    const isIdle = (animName === 'idle');
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
          if(rx < aMinX) aMinX = rx;
          if(ry < aMinY) aMinY = ry;
          if(rx > aMaxX) aMaxX = rx;
          if(ry > aMaxY) aMaxY = ry;
          if(isIdle){
            if(rx < iMinX) iMinX = rx;
            if(ry < iMinY) iMinY = ry;
            if(rx > iMaxX) iMaxX = rx;
            if(ry > iMaxY) iMaxY = ry;
          }
        }
      }
    }
  }
  if(!isFinite(aMinX)){ def._fitCached = null; return null; }
  if(!isFinite(iMinX)){ iMinX = aMinX; iMinY = aMinY; iMaxX = aMaxX; iMaxY = aMaxY; }
  const allW = aMaxX - aMinX, allH = aMaxY - aMinY;
  const idleW = iMaxX - iMinX;
  const idleH = iMaxY - iMinY;
  const fitScale = def.forceFit
    ? Math.min(canvasH / idleH, canvasW / (idleW * 1.2), canvasW / (allW * 0.97))
    : Math.min(canvasH / idleH, canvasH / allH, canvasW / allW);
  if(!def.forceFit && fitScale >= 1 && aMinX >= 0 && aMinY >= 0 && aMaxX <= cw && aMaxY <= ch){
    def._fitCached = null;
    return null;
  }
  const idleCX = (iMinX + iMaxX) / 2;
  const offsetX = canvasW / 2 - idleCX * fitScale;
  const offsetY = canvasH - iMaxY * fitScale;
  const fit = { fitScale, offsetX, offsetY, cw: canvasW, ch: canvasH };
  def._fitCached = fit;
  return fit;
}

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
  const baseSx = canvasW / def.canvas.w;
  const baseSy = canvasH / def.canvas.h;
  if(def.autoFit){
    const fit = computeBossFit(def, bossId, canvasW, canvasH);
    if(fit) return { sx: fit.fitScale, sy: fit.fitScale, ox: fit.offsetX, oy: fit.offsetY };
    return { sx: baseSx, sy: baseSy, ox: 0, oy: 0 };
  }
  const s = Math.min(baseSx, baseSy);
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
  const bossId = (typeof battle !== 'undefined' && battle) ? battle.bossId : null;
  if(!bossId) return;
  const anims = BOSS_ANIMS[bossId];
  if(!anims) return;
  const a = anims[battleBossAnim.name] || anims.idle;
  if(!a) return;
  const interval = 1000 / a.fps;
  if(now - battleBossAnim.lastUpdate >= interval){
    battleBossAnim.lastUpdate = now;
    if(a.loop){
      battleBossAnim.frame = (battleBossAnim.frame + 1) % a.frameCount;
    } else {
      if(battleBossAnim.frame < a.frameCount - 1){
        battleBossAnim.frame++;
      } else if(battleBossAnim.forcedEnd && now > battleBossAnim.forcedEnd){
        battleBossAnim.name = 'idle';
        battleBossAnim.frame = 0;
        battleBossAnim.forcedEnd = 0;
      }
    }
  }
}

function playBossOneshot(animName, durationMs){
  if(typeof battle === 'undefined' || !battle || !BOSS_ANIMS[battle.bossId]) return;
  const anims = BOSS_ANIMS[battle.bossId];
  if(!anims[animName]) return;
  battleBossAnim.name = animName;
  battleBossAnim.frame = 0;
  battleBossAnim.lastUpdate = performance.now();
  battleBossAnim.forcedEnd = performance.now() + (durationMs || 900);
}

/* ============== 場景 / 邊界 ============== */
function getSceneW(){
  const fxEl = document.getElementById('battle-fx');
  return fxEl ? fxEl.clientWidth : 400;
}
function getPlayerSpriteWidthPx(){
  return (typeof battle !== 'undefined' && battle && battle.playerSpriteW) ? battle.playerSpriteW : 88;
}

function getBossGfxBounds(){
  if(typeof battle === 'undefined' || !battle) return null;
  const def = BOSS_LAYERS[battle.bossId];
  if(!def) return null;
  const anims = BOSS_ANIMS[battle.bossId];
  if(!anims) return null;
  const anim = anims[battleBossAnim.name] || anims.idle;
  if(!anim) return null;
  const sp = document.getElementById('boss-sprite');
  if(!sp) return null;
  const spriteW = sp.clientWidth;
  const spriteH = sp.clientHeight;
  if(!spriteW || !spriteH) return null;
  const cacheKey = battle.bossId + '|' + battleBossAnim.name + '|' + battleBossAnim.frame + '|' + spriteW + '|' + spriteH;
  if(battle._bossGfxBoundsKey === cacheKey && battle._bossGfxBounds) return battle._bossGfxBounds;
  const fi = ((battleBossAnim.frame % anim.frameCount) + anim.frameCount) % anim.frameCount;
  const world = resolveBossWorld(def, anim, fi);
  let minX = Infinity, maxX = -Infinity;
  for(const L of def.layers){
    const k = (anim.keys && anim.keys[L.id] && anim.keys[L.id][fi]) || {rot:0, dx:0, dy:0};
    const w = def.canvas.w * (k.w !== undefined ? k.w : L.w);
    const h = def.canvas.h * (k.h !== undefined ? k.h : L.h);
    const px = w * L.pivot.x;
    const py = h * L.pivot.y;
    const wp = world[L.id];
    if(!wp) continue;
    const rot = wp.rot * Math.PI / 180;
    const cos = Math.cos(rot), sin = Math.sin(rot);
    for(const c of [[0,0],[w,0],[0,h],[w,h]]){
      const dx = c[0] - px, dy = c[1] - py;
      const rx = dx*cos - dy*sin + wp.wx;
      if(rx < minX) minX = rx;
      if(rx > maxX) maxX = rx;
    }
  }
  if(!isFinite(minX)){ battle._bossGfxBoundsKey = cacheKey; battle._bossGfxBounds = null; return null; }
  const baseSx = spriteW / def.canvas.w;
  const baseSy = spriteH / def.canvas.h;
  let s, ox;
  if(def.autoFit){
    const fit = computeBossFit(def, battle.bossId, spriteW, spriteH);
    if(fit){ s = fit.fitScale; ox = fit.offsetX; }
    else { s = Math.min(baseSx, baseSy); ox = (spriteW - def.canvas.w * s) / 2; }
  } else {
    s = Math.min(baseSx, baseSy);
    ox = (spriteW - def.canvas.w * s) / 2;
  }
  const bounds = { leftPx: ox + minX * s, rightPx: ox + maxX * s, spriteW: spriteW };
  battle._bossGfxBoundsKey = cacheKey;
  battle._bossGfxBounds = bounds;
  return bounds;
}

function getBossLeftBoundaryN(){
  const W = getSceneW(); if(!W || typeof battle === 'undefined' || !battle) return 0;
  const sp = document.getElementById('boss-sprite');
  const spriteW = sp ? sp.clientWidth : 280;
  const spriteLeft = battle.bx * W - spriteW / 2;
  const bounds = getBossGfxBounds();
  if(!bounds) return spriteLeft / W;
  return (spriteLeft + bounds.leftPx) / W;
}

function getBossRightBoundaryN(){
  const W = getSceneW(); if(!W || typeof battle === 'undefined' || !battle) return 1;
  const sp = document.getElementById('boss-sprite');
  const spriteW = sp ? sp.clientWidth : 280;
  const spriteLeft = battle.bx * W - spriteW / 2;
  const bounds = getBossGfxBounds();
  if(!bounds) return (spriteLeft + spriteW) / W;
  return (spriteLeft + bounds.rightPx) / W;
}

function getPlayerRightBoundaryN(){
  const W = getSceneW();
  if(!W || typeof battle === 'undefined' || !battle) return 1;
  return battle.px + (getPlayerSpriteWidthPx() / 2) / W;
}
function getPlayerLeftBoundaryN(){
  const W = getSceneW();
  if(!W || typeof battle === 'undefined' || !battle) return 0;
  return battle.px - (getPlayerSpriteWidthPx() / 2) / W;
}

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
  if(typeof battle === 'undefined' || !battle) return {x:0.75, y:0.3};
  const part = battle.aimPart;
  const def = BOSS_LAYERS[battle.bossId];
  if(!def || !part) return {x:battle.bx, y:battle.by};
  const L = def.layers.find(l => l.id === part);
  if(!L) return {x:battle.bx, y:battle.by};
  const anims = BOSS_ANIMS[battle.bossId];
  const anim = anims ? (anims[battleBossAnim.name] || anims.idle) : null;
  const fi = anim ? (((battleBossAnim.frame % anim.frameCount) + anim.frameCount) % anim.frameCount) : 0;
  const k = (anim && anim.keys && anim.keys[part] && anim.keys[part][fi]) || {rot:0,dx:0,dy:0};
  const w = def.canvas.w * (k.w !== undefined ? k.w : L.w);
  const h = def.canvas.h * (k.h !== undefined ? k.h : L.h);
  const px = w * L.pivot.x;
  const py = h * L.pivot.y;
  const world = anim ? resolveBossWorld(def, anim, fi) : null;
  const wp = world ? world[part] : null;
  if(!wp) return {x:battle.bx, y:battle.by};
  let localX, localY;
  if(battle.aimLocal && battle.aimLocal.part === part && w > 0 && h > 0){
    localX = battle.aimLocal.u * w;
    localY = battle.aimLocal.v * h;
  } else {
    localX = w / 2;
    localY = h / 2;
  }
  const offX = localX - px;
  const offY = localY - py;
  const angle = wp.rot * BOSS_DEG2RAD;
  const cosA = Math.cos(angle), sinA = Math.sin(angle);
  const rotOffX = offX * cosA - offY * sinA;
  const rotOffY = offX * sinA + offY * cosA;
  const targetWX = wp.wx + rotOffX;
  const targetWY = wp.wy + rotOffY;
  const fxEl = document.getElementById('battle-fx');
  const W = fxEl ? fxEl.clientWidth : 400;
  const H = fxEl ? fxEl.clientHeight : 500;
  const bossSprite = document.getElementById('boss-sprite');
  const spriteW = bossSprite ? bossSprite.clientWidth : 280;
  const spriteH = bossSprite ? bossSprite.clientHeight : 280;
  const _tf = getBossCanvasTransform(def, battle.bossId, spriteW, spriteH);
  const canvasPx = _tf.ox + targetWX * _tf.sx;
  const canvasPy = _tf.oy + targetWY * _tf.sy;
  const spriteLeft = battle.bx * W - spriteW / 2;
  const spriteTop = battle.by * H;
  return {
    x: (spriteLeft + canvasPx) / W,
    y: (spriteTop + canvasPy) / H
  };
}

function isWeakPointHit(){
  if(typeof battle === 'undefined' || !battle) return false;
  const weak = BOSS_WEAKPOINTS[battle.bossId] || [];
  return weak.includes(battle.aimPart);
}

function isAimPartInRange(){
  if(typeof battle === 'undefined' || !battle) return false;
  const def = BOSS_LAYERS[battle.bossId];
  if(!def) return true;
  const part = battle.aimPart;
  if(!part) return true;
  const L = def.layers.find(l => l.id === part);
  if(!L) return true;
  const anims = BOSS_ANIMS[battle.bossId];
  const anim = anims ? (anims[battleBossAnim.name] || anims.idle) : null;
  if(!anim) return true;
  const fi = ((battleBossAnim.frame % anim.frameCount) + anim.frameCount) % anim.frameCount;
  const k = (anim.keys && anim.keys[part] && anim.keys[part][fi]) || {rot:0,dx:0,dy:0};
  const w = def.canvas.w * (k.w !== undefined ? k.w : L.w);
  const h = def.canvas.h * (k.h !== undefined ? k.h : L.h);
  const px = w * L.pivot.x;
  const py = h * L.pivot.y;
  const world = resolveBossWorld(def, anim, fi);
  const wp = world[part];
  if(!wp) return true;
  let localX, localY;
  if(battle.aimLocal && battle.aimLocal.part === part && w > 0 && h > 0){
    localX = battle.aimLocal.u * w;
    localY = battle.aimLocal.v * h;
  } else {
    localX = w / 2;
    localY = h / 2;
  }
  const offX = localX - px;
  const offY = localY - py;
  const rot = wp.rot * (Math.PI / 180);
  const cos = Math.cos(rot), sin = Math.sin(rot);
  const rotOffX = offX * cos - offY * sin;
  const worldX = wp.wx + rotOffX;
  const W = getSceneW();
  const bossSprite = document.getElementById('boss-sprite');
  const spriteW = bossSprite ? bossSprite.clientWidth : 280;
  const spriteH = bossSprite ? bossSprite.clientHeight : 280;
  const _tf = getBossCanvasTransform(def, battle.bossId, spriteW, spriteH);
  const canvasCenterX = _tf.ox + worldX * _tf.sx;
  const spriteLeft = battle.bx * W - spriteW / 2;
  const worldCenterX = (spriteLeft + canvasCenterX) / W;
  const playerRight = battle.px + battle.playerWeaponRange;
  return playerRight >= worldCenterX;
}

/* ============== Boss 血條位置 ============== */
function updateBossHpbarPos(){
  if(typeof battle === 'undefined' || !battle) return;
  const sp = document.getElementById('boss-sprite');
  if(!sp) return;
  const spriteH = sp.clientHeight;
  const spriteW = sp.clientWidth;
  if(!spriteW || !spriteH) return;
  const def = BOSS_LAYERS[battle.bossId];
  if(!def) return;
  const anims = BOSS_ANIMS[battle.bossId];
  if(!anims || !anims.idle) return;
  const cacheKey = battle.bossId + '|idle|' + spriteW + '|' + spriteH;
  let topPx = null;
  if(battle._bossIdleTopKey === cacheKey){
    topPx = battle._bossIdleTopPx;
  } else {
    const anim = anims.idle;
    const world = resolveBossWorld(def, anim, 0);
    let minY = Infinity;
    for(const L of def.layers){
      const k = (anim.keys && anim.keys[L.id] && anim.keys[L.id][0]) || {rot:0,dx:0,dy:0};
      const w = def.canvas.w * (k.w !== undefined ? k.w : L.w);
      const h = def.canvas.h * (k.h !== undefined ? k.h : L.h);
      const px = w * L.pivot.x;
      const py = h * L.pivot.y;
      const wp = world[L.id];
      if(!wp) continue;
      const rot = wp.rot * Math.PI / 180;
      const cos = Math.cos(rot), sin = Math.sin(rot);
      for(const c of [[0,0],[w,0],[0,h],[w,h]]){
        const dx = c[0] - px, dy = c[1] - py;
        const ry = dx*sin + dy*cos + wp.wy;
        if(ry < minY) minY = ry;
      }
    }
    if(!isFinite(minY)) return;
    const _tf = getBossCanvasTransform(def, battle.bossId, spriteW, spriteH);
    topPx = _tf.oy + minY * _tf.sy;
    battle._bossIdleTopKey = cacheKey;
    battle._bossIdleTopPx = topPx;
  }
  if(topPx == null) return;
  const _hpBottom = Math.max(14, spriteH - topPx + 14);
  const hpWrap = document.getElementById('boss-hpbar-wrap');
  if(hpWrap) hpWrap.style.bottom = _hpBottom + 'px';
}

function updateFighterPos(){
  if(typeof battle === 'undefined' || !battle) return;
  const h = document.getElementById('fighter-hero');
  const b = document.getElementById('fighter-boss');
  if(h){ h.style.left = (battle.px * 100) + '%'; h.style.top = (battle.py * 100) + '%'; }
  if(b){ b.style.left = (battle.bx * 100) + '%'; b.style.top = (battle.by * 100) + '%'; }
  const ri = document.getElementById('range-indicator');
  if(ri){
    const r = battle.playerWeaponRange || 0.5;
    const rLeft = battle.px * 100;
    const rRight = Math.min(1, (battle.px + r)) * 100;
    ri.style.left = rLeft + '%';
    ri.style.width = (rRight - rLeft) + '%';
  }
  const dmgBar = document.getElementById('dmg-bar');
  if(dmgBar){
    const totalHp = battle.bossMaxHp + battle.bossMaxArmor;
    const _curCurHp = battle.bossHp + battle.bossArmor;
    dmgBar.style.width = Math.max(0, Math.min(100, (1 - _curCurHp / totalHp) * 100)) + '%';
  }
  const dmgHd = document.querySelector('.damage-header');
  if(dmgHd){ dmgHd.querySelector('.num').textContent = Math.round(battle.damageDealt); }
  if(typeof updateBossHpbarPos === 'function') updateBossHpbarPos();
}

/* ============== 命中 / 特效 ============== */
function spawnHitFx(x, y, txt, cls, sparkX, sparkY){
  const layer = document.getElementById('battle-fx');
  if(!layer) return;
  let _nx = x, _ny = y;
  const _isNamebar = (x === 'boss' || x === 'player');
  if(_isNamebar){
    const _sel = (x === 'boss') ? '.fighter.boss-f' : '.fighter.hero-f';
    const _fighter = document.querySelector(_sel);
    const _hpbar = _fighter ? _fighter.querySelector('.hpbar-wrap') : null;
    _nx = (x === 'boss') ? 0.75 : 0.15;
    _ny = 0.2;
    if(_hpbar){
      const _fr = layer.getBoundingClientRect();
      const _hr = _hpbar.getBoundingClientRect();
      if(_fr.width && _fr.height && _hr.width){
        _nx = Math.max(0.02, Math.min(0.98, (_hr.left - _fr.left + _hr.width / 2) / _fr.width));
        _ny = Math.max(0.02, (_hr.top - _fr.top - 24) / _fr.height);
      }
    }
  }
  /* rev-fix-hitfx-spark-v2: 火花 —— MISS/治疗跳过；sparkX/sparkY 显式提供时用它们；
   * 否则数字坐标（'boss'/'player'）不画火花。cls 必须完整传给 _spawnHitSpark（第 5 参数） */
  const _isMiss = (String(txt).toUpperCase() === 'MISS');
  if(!_isMiss && cls !== 'miss' && cls !== 'heal' && typeof window._spawnHitSpark === 'function'){
    let _sx = null, _sy = null;
    if(typeof sparkX === 'number' && typeof sparkY === 'number'){
      _sx = sparkX; _sy = sparkY;
    } else if(typeof x === 'number' && typeof y === 'number'){
      _sx = x; _sy = y;
    }
    if(_sx !== null && _sy !== null){
      const _w = layer.clientWidth || 400, _h = layer.clientHeight || 500;
      let _owner = null;
      try { _owner = (typeof battle !== 'undefined' && battle) ? battle : null; } catch(e){}
      if(_owner){
        /* 关键：cls 作为第 5 参数完整传入 */
        window._spawnHitSpark(_owner, _sx * _w, _sy * _h, cls === 'crit', cls);
      }
    }
  }
  const e = document.createElement('div');
  e.className = 'hit-fx' + (cls ? ' ' + cls : '');
  e.textContent = txt;
  e.style.left = (_nx * 100) + '%';
  e.style.top = (_ny * 100) + '%';
  layer.appendChild(e);
  setTimeout(()=>e.remove(), 1100);
}

function playShieldShatterFx(){
  const layer = document.getElementById('battle-fx');
  if(!layer || typeof battle === 'undefined' || !battle) return;
  const fx = document.createElement('div');
  fx.className = 'shield-shatter-fx';
  fx.style.left = (battle.bx * 100) + '%';
  fx.style.top  = (battle.by * 100) + '%';
  const glow = document.createElement('div');
  glow.className = 'glow';
  fx.appendChild(glow);
  for(let i = 0; i < 14; i++){
    const frag = document.createElement('div');
    frag.className = 'frag';
    const ang = (i / 14) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
    const dist = 30 + Math.random() * 50;
    const dx = Math.cos(ang) * dist;
    const dy = Math.sin(ang) * dist;
    frag.animate([
      {transform:'translate(0,0) scale(1) rotate(0deg)', opacity:1},
      {transform:`translate(${dx}px,${dy}px) scale(0.4) rotate(${Math.random()*360-180}deg)`, opacity:0}
    ], {duration: 500+Math.random()*200, easing:'cubic-bezier(.2,.8,.4,1)', fill:'forwards'});
    fx.appendChild(frag);
  }
  layer.appendChild(fx);
  setTimeout(()=>fx.remove(), 800);
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
  const layer = document.getElementById('battle-fx');
  if(!layer || typeof battle === 'undefined' || !battle) return;
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
  if(typeof battle === 'undefined' || !battle) return;
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
  if(typeof battle === 'undefined' || !battle) return null;
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
  const _tf = getBossCanvasTransform(def, battle.bossId, spriteW, spriteH);
  const canvasX = _tf.ox + wp.wx * _tf.sx;
  const canvasY = _tf.oy + wp.wy * _tf.sy;
  return {
    x: (spriteLeft + canvasX) / W,
    y: (spriteTop + canvasY) / H
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
  if(typeof battle === 'undefined' || !battle) return;
  if(!isBossType(battle.bossId, 'hydra') || !battle.heads) return;
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
  const _tf = getBossCanvasTransform(def, battle.bossId, spriteW, spriteH);
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
    const canvasPx = _tf.ox + topWX * _tf.sx;
    const canvasPy = _tf.oy + topWY * _tf.sy;
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

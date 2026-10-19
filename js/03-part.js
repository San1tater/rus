/* ============================================================
   ★ BOSS MODULE — 繪製區
   ============================================================ */
const battleBossAnim = { name:'idle', frame:0, lastUpdate:0, forcedEnd:0 };
const BATTLE_BOSS_ONESHOT = ['attack_swipe','skill_charge','hurt','death'];

const BOSS_DEG2RAD = Math.PI / 180;
function _resolveBossWorldRaw(def, anim, frame){
  const result = {};
  const visiting = new Set();
  function resolve(L){
    if(result[L.id]) return result[L.id];
    if(visiting.has(L.id)){
      const k = (anim && anim.keys[L.id] && anim.keys[L.id][frame]) || {rot:0,dx:0,dy:0};
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
    const k = (anim && anim.keys[L.id] && anim.keys[L.id][frame]) || {rot:0,dx:0,dy:0};
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

/* rev535: swamp_hydra 眼睛/嘴巴跟隨所屬頭部 */
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

/* 計算 Boss 所有動畫所有幀的包圍盒；若超出 canvas，回傳 fit 變換。
   結果快取在 def._fitCached，避免每幀重算。 */
function computeBossFit(def, bossId, canvasW, canvasH){
  if(def._fitCached && def._fitCached.cw === canvasW && def._fitCached.ch === canvasH) return def._fitCached;
  const cw = def.canvas.w, ch = def.canvas.h;
  const anims = BOSS_ANIMS[bossId];
  if(!anims){ def._fitCached = null; return null; }
  /* rev534: core_omega 全局 fit 不含 death（death 有独立 fit，见 computeBossDeathFit） */
  const _isOmega = (bossId === 'core_omega' || bossId === 'core_omega_ii');
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
  /* rev543: forceFit 改用 idleW 主控（允许攻击帧溢出约 15%），避免 idle 被 allW 压得太小 */
  /* rev546: 加入 allW * 0.97 约束，保证攻击帧溢出 ≤ 3%（每侧 1.5%） */
  const fitScale = def.forceFit
    ? Math.min(canvasH / idleH, canvasW / (idleW * 1.2), canvasW / (allW * 0.97))
    : Math.min(canvasH / idleH, canvasH / allH, canvasW / allW);
  if(!def.forceFit && fitScale >= 1 && aMinX >= 0 && aMinY >= 0 && aMaxX <= cw && aMaxY <= ch){
    def._fitCached = null;
    return null;
  }
  /* rev543: offsetX 仅保证 idle 居中；forceFit 时不再拉回，攻击帧允许溢出 */
  const idleCX = (iMinX + iMaxX) / 2;
  const offsetX = canvasW / 2 - idleCX * fitScale;
  const offsetY = canvasH - iMaxY * fitScale;
  const fit = { fitScale, offsetX, offsetY, cw: canvasW, ch: canvasH };
  def._fitCached = fit;
  return fit;
}

/* ★ 統一座標變換 helper：drawBlockBoss / getAimTargetPos / pickAimPart / isAimPartInRange / 血條
   全部使用同一組 (sx, sy, ox, oy)，確保視覺與判定一致。
   - autoFit + fit：等比縮放，水平居中、底部對齊
   - autoFit 無 fit：直接按 sprite/canvas 比例縮放（通常不發生）
   - 非 autoFit：等比縮放取 min(sx, sy)，水平居中、底部對齊 */
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

function drawBlockBoss(ctx, canvasW, canvasH, bossId, animName, frameIdx){
  const def = BOSS_LAYERS[bossId];
  if(!def) return;
  const anims = BOSS_ANIMS[bossId];
  if(!anims) return;
  const anim = anims[animName] || anims.idle;
  if(!anim) return;
  const fi = ((frameIdx % anim.frameCount) + anim.frameCount) % anim.frameCount;

  const baseSx = canvasW / def.canvas.w;
  const baseSy = canvasH / def.canvas.h;

  const world = resolveBossWorld(def, anim, fi);

  ctx.save();
  /* rev534: core_omega death 动画用独立 fit，确保所有部件在画布内 */
  let _tf;
  if((bossId === 'core_omega' || bossId === 'core_omega_ii') && animName === 'death'){
    const _df = computeBossDeathFit(def, bossId, canvasW, canvasH);
    _tf = _df ? { sx: _df.fitScale, sy: _df.fitScale, ox: _df.offsetX, oy: _df.offsetY } : getBossCanvasTransform(def, bossId, canvasW, canvasH);
  } else {
    _tf = getBossCanvasTransform(def, bossId, canvasW, canvasH);
  }
  ctx.translate(_tf.ox, _tf.oy);
  ctx.scale(_tf.sx, _tf.sy);

  const _SHIELD_LIDS = ['shield','shield_2','shield_3','shield_4'];
  const _hideShield = ((bossId === 'road_tyrant' || bossId === 'road_tyrant_ii') && battle && battle.shieldBroken);
  const _hideHydraHead = ((bossId === 'swamp_hydra' || bossId === 'swamp_hydra_ii') && battle && battle.heads);
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
    if((bossId === 'core_omega' || bossId === 'core_omega_ii') && battle && battle.arms){
      const _arm = getOmegaArmIdOfLayer(L.id);
      if(_arm && !battle.arms[_arm].alive) continue;
    }
    const k = (anim.keys && anim.keys[L.id] && anim.keys[L.id][fi]) || {rot:0, dx:0, dy:0};
    const wp = world[L.id] || { wx: def.canvas.w * L.x, wy: def.canvas.h * L.y, rot: 0 };
    const w = def.canvas.w * (k.w !== undefined ? k.w : L.w);
    const h = def.canvas.h * (k.h !== undefined ? k.h : L.h);
    const px = w * L.pivot.x;
    const py = h * L.pivot.y;
    /* rev533: core_omega 死亡动画时，完全飞出画布的部件跳过绘制 */
    if((bossId === 'core_omega' || bossId === 'core_omega_ii') && animName === 'death'){
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

function computeBossDeathFit(def, bossId, canvasW, canvasH){
  /* rev534: core_omega death 动画独立 fit，只按 death 包围盒缩放，确保所有部件都在画布内 */
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
function renderBossBattleCanvas(){
  if(!battle) return;
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
  const bossId = battle ? battle.bossId : null;
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
  if(!battle || !BOSS_ANIMS[battle.bossId]) return;
  const anims = BOSS_ANIMS[battle.bossId];
  if(!anims[animName]) return;
  battleBossAnim.name = animName;
  battleBossAnim.frame = 0;
  battleBossAnim.lastUpdate = performance.now();
  battleBossAnim.forcedEnd = performance.now() + (durationMs || 900);
}

function spawnExploreHealFx(amount){
  if(currentTab !== 'explore') return;
  const fx = document.getElementById('explore-fx');
  if(!fx) return;
  const W = fx.clientWidth, H = fx.clientHeight;
  const el = document.createElement('div');
  el.className = 'explore-heal-fx';
  el.textContent = '+' + amount;
  el.style.left = (W * EXPLORE_HERO_X_RATIO) + 'px';
  el.style.top = (H * 0.37) + 'px';
  fx.appendChild(el);
  setTimeout(() => el.remove(), 1100);
}
function spawnExploreBullets(n){
  const fx = document.getElementById('explore-fx');
  if(!fx) return;
  const W = fx.clientWidth, H = fx.clientHeight;
  const muzzle = getExploreWeaponRightEdge(W, H);
  const startX = muzzle.x;
  const startY = muzzle.y;
  for(let i=0;i<n;i++){
    setTimeout(()=>{
      const bullet = document.createElement('div');
      bullet.className = 'explore-bullet';
      const endX = W*(0.88 + Math.random()*0.08);
      const endY = startY + (Math.random()-0.5) * H * 0.12;
      bullet.style.left = startX+'px';
      bullet.style.top = startY+'px';
      bullet.style.opacity = '1';
      fx.appendChild(bullet);
      requestAnimationFrame(()=>{
        bullet.style.transition = 'left .38s linear, top .38s linear, opacity .38s linear';
        bullet.style.left = endX+'px';
        bullet.style.top = endY+'px';
        bullet.style.opacity = '0.15';
      });
      setTimeout(()=>bullet.remove(), 460);
    }, i*85);
  }
}











/* rev374: 動態計算野獸骨架的精確包圍盒 */










function getBeastBounds(def) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  const world = resolveBossWorld(def, { keys: {} }, 0);
  for(const L of def.layers) {
    const wp = world[L.id];
    if(!wp) continue;
    const w = def.canvas.w * L.w;
    const h = def.canvas.h * L.h;
    const px = w * L.pivot.x;
    const py = h * L.pivot.y;
    const rot = wp.rot * BOSS_DEG2RAD;
    const cos = Math.cos(rot), sin = Math.sin(rot);
    const corners = [[0,0],[w,0],[0,h],[w,h]];
    for(const c of corners) {
      const dx = c[0] - px, dy = c[1] - py;
      const rx = dx*cos - dy*sin + wp.wx;
      const ry = dx*sin + dy*cos + wp.wy;
      if(rx < minX) minX = rx;
      if(ry < minY) minY = ry;
      if(rx > maxX) maxX = rx;
      if(ry > maxY) maxY = ry;
    }
  }
  if(!isFinite(minX)) return null;
  return { minX, maxX, minY, maxY, w: maxX-minX, h: maxY-minY };
}

function drawEnemyPreview(ctx, enemyId, w, h) {
  try {
    /* rev500：優先使用 09-enemy-data.js 的新數據 + anims（idle 第 0 帧） */
    if (typeof _drawEnemyAt === 'function') {
      var _def = (typeof BEAST_LAYERS !== 'undefined' && BEAST_LAYERS[enemyId]) || (typeof HUMAN_ENEMY_DATA !== 'undefined' && HUMAN_ENEMY_DATA[enemyId]);
      if (_def) {
        var _s = Math.min(w / _def.canvas.w, h / _def.canvas.h);
        var _ox = (w - _def.canvas.w * _s) / 2;
        var _oy = h - _def.canvas.h * _s;
        if (_drawEnemyAt(ctx, enemyId, _ox, _oy, _s, 'idle', 0)) return;
      }
    }
    if(typeof BEAST_LAYERS !== 'undefined' && BEAST_LAYERS[enemyId]) {
      const def = BEAST_LAYERS[enemyId];
      let bounds = null;
      try { bounds = getBeastBounds(def); } catch(err) {}
      
      // 如果边界异常，使用原画布尺寸作为兜底
      if(!bounds || bounds.h <= 0 || bounds.w <= 0) {
        bounds = { minX: 0, maxX: def.canvas.w, minY: 0, maxY: def.canvas.h, w: def.canvas.w, h: def.canvas.h };
      }
      
      const scale = h / bounds.h;
      const ox = (w - bounds.w * scale) / 2 - bounds.minX * scale;
      const oy = h - bounds.maxY * scale;
      
      ctx.save();
      ctx.translate(ox, oy);
      ctx.scale(scale, scale);
      const world = resolveBossWorld(def, { keys: {} }, 0);
      const sorted = def.layers.slice().sort((a,b)=>a.z - b.z);
      for(const L of sorted) {
        const wp = world[L.id];
        const lw = def.canvas.w * L.w;
        const lh = def.canvas.h * L.h;
        const ppx = lw * L.pivot.x;
        const ppy = lh * L.pivot.y;
        ctx.save();
        ctx.translate(wp.wx, wp.wy);
        ctx.rotate((L.rot || 0) * BOSS_DEG2RAD);
        ctx.translate(-ppx, -ppy);
        if(L.id.indexOf('eye') === 0) {
          ctx.shadowColor = '#ff0000';
          ctx.shadowBlur = 15;
        }
        ctx.fillStyle = L.color;
        ctx.fillRect(0, 0, lw, lh);
        ctx.strokeStyle = 'rgba(0,0,0,0.65)';
        ctx.lineWidth = 3;
        ctx.strokeRect(1.5, 1.5, lw - 3, lh - 3);
        ctx.restore();
      }
      ctx.restore();
      return;
    }
    
    if(typeof _raidDrawHuman === 'function') {
      const targetCharH = h * 0.7; 
      const scale = targetCharH / 386;
      const groundY = h * 0.95;
      const _eq = { head: 'ssh68', top: '6b231', primary: 'ak74' };
      const _rar = { head: '一般', top: '一般', primary: '一般' };
      _raidDrawHuman(ctx, w / 2, groundY, scale, _eq, _rar, 'idle', 0, 'primary', 'enemy', true, false, null);
      return;
    }
  } catch (e) {
    console.warn('[drawEnemyPreview] error:', e);
  }
}

function _showExploreEnemyGraphics(enemies) {
  window._exploreLastEnemies = (enemies || []).map(function(e){
    return { id: e.id, name: e.name };
  });
  const oldGrp = document.getElementById('explore-enemy-group');
  if(oldGrp) oldGrp.remove();
  /* rev527: 不再清空 corpse-group，保留旧尸体继续左移 */
}







function _resolveExploreEnemyGraphics(victory, survivors) {
  const enemies = window._exploreLastEnemies || [];
  if(victory){
    if(enemies.length){
      setTimeout(function(){ _spawnExploreCorpses(enemies); }, 1500);
    }
  } else {
    setTimeout(function(){ _spawnEnemyBulletsToPlayer(2 + Math.floor(Math.random() * 2)); }, 1500);
  }
}

/* id 映射：REGIONS.enemies 用 raider/ghoul/raider_vet，09 数据用 human_raider 等 */
function _resolveEnemyDef(id){
  if(typeof BEAST_LAYERS !== 'undefined' && BEAST_LAYERS[id]) return { def: BEAST_LAYERS[id], resolvedId: id };
  if(typeof HUMAN_ENEMY_DATA !== 'undefined' && HUMAN_ENEMY_DATA[id]) return { def: HUMAN_ENEMY_DATA[id], resolvedId: id };
  if(typeof HUMAN_ENEMY_DATA !== 'undefined' && HUMAN_ENEMY_DATA['human_' + id]) return { def: HUMAN_ENEMY_DATA['human_' + id], resolvedId: 'human_' + id };
  return null;
}

/* anims 来源：BEAST_LAYERS 没 anims（在 BEAST_ANIMS）；HUMAN_ENEMY_DATA[id].anims 内嵌 */
function _resolveEnemyAnims(id){
  if(typeof BEAST_ANIMS !== 'undefined' && BEAST_ANIMS[id]) return BEAST_ANIMS[id];
  if(typeof HUMAN_ENEMY_DATA !== 'undefined' && HUMAN_ENEMY_DATA[id] && HUMAN_ENEMY_DATA[id].anims) return HUMAN_ENEMY_DATA[id].anims;
  return null;
}

/* 计算死亡末帧的包围盒（复刻 _drawEnemyAt 的 rootRot/rootDy + 层局部变换） */
function _measureDeathBBox(def, anim, frame){
  const cw = def.canvas.w, ch = def.canvas.h;
  const rootRot = ((anim.rootRot && anim.rootRot[frame]) || 0) * Math.PI / 180;
  const rootDy = (anim.rootDy && anim.rootDy[frame]) || 0;
  const rootPivot = anim.rootPivot || { x: 0.5, y: 0.95 };
  const pcx = cw * rootPivot.x, pcy = ch * rootPivot.y;
  const cosR = Math.cos(rootRot), sinR = Math.sin(rootRot);
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for(let li = 0; li < def.layers.length; li++){
    const L = def.layers[li];
    const k = (anim.keys && anim.keys[L.id] && anim.keys[L.id][frame]) || {rot:0,dx:0,dy:0};
    const w = cw * L.w, h = ch * L.h;
    const cx = cw * L.x + cw * (k.dx||0) * 0.01;
    const cy = ch * L.y + ch * (k.dy||0) * 0.01;
    const px = w * L.pivot.x, py = h * L.pivot.y;
    const rot = ((L.rot||0) + (k.rot||0)) * Math.PI / 180;
    const cosL = Math.cos(rot), sinL = Math.sin(rot);
    const corners = [[-px,-py],[w-px,-py],[-px,h-py],[w-px,h-py]];
    for(let ci = 0; ci < 4; ci++){
      const lx = corners[ci][0], ly = corners[ci][1];
      const Px = cx + lx*cosL - ly*sinL;
      const Py = cy + lx*sinL + ly*cosL;
      const ddx = Px - pcx, ddy = Py - pcy;
      const rotX = pcx + ddx*cosR - ddy*sinR;
      const rotY = pcy + ddx*sinR + ddy*cosR + ch * rootDy;
      if(rotX < minX) minX = rotX;
      if(rotY < minY) minY = rotY;
      if(rotX > maxX) maxX = rotX;
      if(rotY > maxY) maxY = rotY;
    }
  }
  if(!isFinite(minX)) return null;
  return { minX, minY, maxX, maxY, w: maxX-minX, h: maxY-minY };
}

/* 尸体：从右侧进入、跟画布同速左移、从左离开；用 death 末帧绘制 */
/* rev506: 人形敌人尸体渲染 —— 装备 + 手臂水平 + torso 贴地 */














/* 尸体：从右侧进入、跟画布同速左移、从左离开；用 death 末帧绘制 */
/* rev507: 人形敌人尸体渲染 —— 装备随机化 + back_arm 偏移 + torso 对齐 */
const _rev506_ANIMAL_ANCHOR = {
  mutant_bear: "torso",
  mutant_wolf: "body",
  mutant_rat: "body",
  mutant_squirrel: "body"
};

const _rev506_HUMAN_EQUIP_POOL = {
  human_ghoul: {
    head: [null],
    top: [null],
    primary: ["6kh2", "6kh5", "kukri"]
  },
  human_raider: {
    head: ["ssh68", "sssh94", "kolpak"],
    top: ["paca", "6b23", "zhuk3"],
    primary: ["aks74u", "aks74un", "ak74", "akms", "akm", "akmn"]
  },
  human_raider_vet: {
    head: ["6b47", "6b47m", "kiver", "maska"],
    top: ["6b13", "6b13m", "6b231", "6b232"],
    primary: ["ak74m", "ak103", "ak104", "ak105", "ak12"]
  }
};

function _rev506_pickRand(arr){
  if(!arr || !arr.length) return null;
  return pick(arr);
}

function _rev506_getRandomEquip(drawId){
  const pool = _rev506_HUMAN_EQUIP_POOL[drawId];
  if(!pool) return null;
  return {
    head: _rev506_pickRand(pool.head),
    top: _rev506_pickRand(pool.top),
    primary: _rev506_pickRand(pool.primary)
  };
}

function _rev506_measureLayerMaxY(def, anim, frame, layerId){
  const L = def.layers.find(function(l){ return l.id === layerId; });
  if(!L) return null;
  const cw = def.canvas.w, ch = def.canvas.h;
  const rootRot = ((anim.rootRot && anim.rootRot[frame]) || 0) * Math.PI / 180;
  const rootDy = (anim.rootDy && anim.rootDy[frame]) || 0;
  const rootPivot = anim.rootPivot || { x: 0.5, y: 0.95 };
  const pcx = cw * rootPivot.x, pcy = ch * rootPivot.y;
  const cosR = Math.cos(rootRot), sinR = Math.sin(rootRot);
  const k = (anim.keys && anim.keys[L.id] && anim.keys[L.id][frame]) || { rot:0, dx:0, dy:0 };
  const w = cw * L.w, h = ch * L.h;
  const cx = cw * L.x + cw * (k.dx || 0) * 0.01;
  const cy = ch * L.y + ch * (k.dy || 0) * 0.01;
  const px = w * L.pivot.x, py = h * L.pivot.y;
  const rot = ((L.rot || 0) + (k.rot || 0)) * Math.PI / 180;
  const cosL = Math.cos(rot), sinL = Math.sin(rot);
  const corners = [[-px,-py],[w-px,-py],[-px,h-py],[w-px,h-py]];
  let maxY = -Infinity;
  for(let ci = 0; ci < 4; ci++){
    const lx = corners[ci][0], ly = corners[ci][1];
    const Px = cx + lx*cosL - ly*sinL;
    const Py = cy + lx*sinL + ly*cosL;
    const ddx = Px - pcx, ddy = Py - pcy;
    const rotY = pcy + ddx*sinR + ddy*cosR + ch * rootDy;
    if(rotY > maxY) maxY = rotY;
  }
  return maxY;
}

function _rev506_tryDrawArmorAtLayer(ctx, armorId, lw, lh, px, py){
  /* rev515: 装备图标为面向右的角色设计；敌人面向左 → 必须水平翻转
     scale(-1,1) + rotate(θ) 与 rotate(-θ) + scale(-1,1) 数学等价
     baseW = 400 * scale * (lw/playerLayerW)（沿用 rev514）*/
  if(typeof HEAD_ARMOR_LAYOUT === "undefined") return false;
  const cfg = HEAD_ARMOR_LAYOUT[armorId];
  if(!cfg) return false;
  if(typeof getHeroImg !== "function" || typeof resolveIconId !== "function") return false;
  const img = getHeroImg("icons/items/" + resolveIconId(armorId) + ".png");
  if(!img || !img.complete || !img.naturalWidth) return false;

  const _targetLayerId = cfg.layer || "head";
  const _playerLayer = (typeof GAME_LAYERS !== "undefined")
    ? GAME_LAYERS.find(function(l){ return l.id === _targetLayerId; })
    : null;
  const _playerLayerW = _playerLayer ? (340 * _playerLayer.w) : 68;
  const _ratio = lw / _playerLayerW;

  const baseW = 400 * (cfg.scale || 0.3) * _ratio;
  const ar = img.naturalWidth / img.naturalHeight;
  const baseH = baseW / ar;
  const drawX = -baseW / 2;

  const localX = px + lw * (cfg.ox || 0);
  const localY = py + lh * (cfg.oy || 0);

  ctx.save();
  ctx.translate(localX, localY);
  /* rev515: 水平翻转（装备面向左）*/
  ctx.scale(-1, 1);
  if(cfg.rotation) ctx.rotate(cfg.rotation * Math.PI / 180);
  ctx.drawImage(img, drawX, -baseH/2, baseW, baseH);
  ctx.restore();
  return true;
}







function _rev506_tryDrawWeaponAtLayer(ctx, weaponId, lw, lh, px, py){
  /* rev514: 完全复用玩家 WEAPON_LAYOUT（scale/ox/oy/rotation/trim）
     baseW = trim.w * scale（绝对尺寸和玩家一致，不补偿层宽）
     锚点镜像：localX = px - lw*ox
     视觉旋转一致：rotate(-rotation) + scale(-1,1) → 枪口朝左 */
  if(typeof WEAPON_LAYOUT === "undefined") return false;
  if(typeof getHeroImg !== "function" || typeof resolveIconId !== "function") return false;
  const baseId = resolveIconId(weaponId);
  const layout = WEAPON_LAYOUT[baseId]
    || (typeof HERO_VISIBLE_EQ !== "undefined" ? HERO_VISIBLE_EQ.primary : null);
  if(!layout) return false;
  const img = getHeroImg("icons/items/" + baseId + ".png");
  if(!img || !img.complete || !img.naturalWidth) return false;

  const hasTrim = !!(layout.trim && layout.trim.w > 0 && layout.trim.h > 0);
  let baseW, baseH;
  if(hasTrim){
    baseW = layout.trim.w * (layout.scale || 1.0);
    baseH = layout.trim.h * (layout.scale || 1.0);
  } else {
    baseW = 400 * (layout.scale || 0.3);
    const ar = img.naturalWidth / img.naturalHeight;
    baseH = baseW / ar;
  }

  /* localX：镜像后锚点（pivot 在右端 0.95，锚点向左偏移 lw*ox） */
  const localX = px - lw * (layout.ox || 0);
  /* localY：和玩家一致（py + lh*oy） */
  const localY = py + lh * (layout.oy || 0);

  ctx.save();
  ctx.translate(localX, localY);
  /* rotate(-rotation) + scale(-1,1)：视觉旋转与玩家一致，枪口朝左 */
  ctx.rotate(-(layout.rotation || 0) * Math.PI / 180);
  ctx.scale(-1, 1);
  if(hasTrim){
    ctx.drawImage(img, layout.trim.x, layout.trim.y, layout.trim.w, layout.trim.h,
                  0, -baseH / 2, baseW, baseH);
  } else {
    ctx.drawImage(img, 0, -baseH / 2, baseW, baseH);
  }
  ctx.restore();
  return true;
}
function _rev506_drawHumanCorpse(ctx, drawId, s, ox, oy, def, anim, fi, equipData, isDeath){
  /* rev512: isDeath 可选参数
     isDeath=true ：倒地专用（bodyBottomY 对齐 + armCorrection + 跳过 back_arm）
     isDeath=false：正常动画（idle/attack/hurt 等，所有层按 anim.keys 绘制）
     z 排序沿用玩家 drawBlockHero 逻辑：装备 z+0.5、武器 z-0.5（武器在手图层下方）*/
  const cw = def.canvas.w, ch = def.canvas.h;
  const eqData = equipData || null;
  const isDeathMode = (isDeath !== false);
  const rRot = (anim.rootRot && anim.rootRot[fi]) || 0;
  const rRotRad = rRot * Math.PI / 180;
  const rDy = (anim.rootDy && anim.rootDy[fi]) || 0;
  const rPivot = anim.rootPivot || { x: 0.5, y: 0.95 };
  const pcx = cw * rPivot.x, pcy = ch * rPivot.y;
  const cosR = Math.cos(rRotRad), sinR = Math.sin(rRotRad);

  /* 仅 death 模式：bodyBottomY 对齐 + front_arm 下移 */
  let frontArmCx = null, frontArmCy = null;
  if(isDeathMode){
    let bodyBottomY = -Infinity;
    for(let i = 0; i < def.layers.length; i++){
      const L = def.layers[i];
      if(L.id === "front_arm" || L.id === "back_arm") continue;
      const y = _rev506_measureLayerMaxY(def, anim, fi, L.id);
      if(y != null && y > bodyBottomY) bodyBottomY = y;
    }
    const faL = def.layers.find(function(l){ return l.id === "front_arm"; });
    if(faL && isFinite(bodyBottomY)){
      const k = (anim.keys && anim.keys.front_arm && anim.keys.front_arm[fi]) || {rot:0,dx:0,dy:0};
      const lw_fa = cw * faL.w, lh_fa = ch * faL.h;
      let cx = cw * faL.x + cw * (k.dx||0) * 0.01;
      let cy = ch * faL.y + ch * (k.dy||0) * 0.01;
      const px_fa = lw_fa * faL.pivot.x, py_fa = lh_fa * faL.pivot.y;
      const localRot = -rRotRad;
      const cosL = Math.cos(localRot), sinL = Math.sin(localRot);
      let curMaxY = -Infinity;
      const cs = [[0,0],[lw_fa,0],[0,lh_fa],[lw_fa,lh_fa]];
      for(let i = 0; i < 4; i++){
        const u = cs[i][0], v = cs[i][1];
        const Lx = cx + (u-px_fa)*cosL - (v-py_fa)*sinL;
        const Ly = cy + (u-px_fa)*sinL + (v-py_fa)*cosL;
        const Wy = pcy + (Lx-pcx)*sinR + (Ly-pcy)*cosR + ch*rDy;
        if(Wy > curMaxY) curMaxY = Wy;
      }
      const dy = bodyBottomY - curMaxY;
      cx += dy * sinR;
      cy += dy * cosR;
      frontArmCx = cx;
      frontArmCy = cy;
    }
  }

  ctx.save();
  ctx.translate(ox, oy);
  ctx.scale(s, s);
  ctx.translate(0, ch * rDy);
  ctx.translate(pcx, pcy);
  ctx.rotate(rRotRad);
  ctx.translate(-pcx, -pcy);

  /* z 排序 units（和玩家 drawBlockHero 一致：装备 z+0.5，武器 z-0.5）*/
  const units = [];
  for(const L of def.layers){
    if(isDeathMode && L.id === "back_arm") continue;
    if(L.id === "front_arm" && eqData && eqData.primary){
      units.push({ z: L.z - 0.5, kind: "weapon", layer: L, weaponId: eqData.primary });
    }
    units.push({ z: L.z, kind: "layer", layer: L });
    if(L.id === "head" && eqData && eqData.head){
      units.push({ z: L.z + 0.5, kind: "armor", layer: L, armorId: eqData.head });
    }
    if(L.id === "torso" && eqData && eqData.top){
      units.push({ z: L.z + 0.5, kind: "armor", layer: L, armorId: eqData.top });
    }
  }
  units.sort(function(a, b){ return a.z - b.z; });

  for(const u of units){
    const L = u.layer;
    const k = (anim.keys && anim.keys[L.id] && anim.keys[L.id][fi]) || { rot:0, dx:0, dy:0 };
    const lw = cw * L.w, lh = ch * L.h;
    let cx, cy;
    if(L.id === "front_arm" && frontArmCx != null){
      cx = frontArmCx;
      cy = frontArmCy;
    } else {
      cx = cw * L.x + cw * (k.dx || 0) * 0.01;
      cy = ch * L.y + ch * (k.dy || 0) * 0.01;
    }
    const px = lw * L.pivot.x, py = lh * L.pivot.y;
    let localRotRad;
    if(isDeathMode && L.id === "front_arm"){
      localRotRad = -rRotRad;
    } else {
      localRotRad = ((L.rot || 0) + (k.rot || 0)) * Math.PI / 180;
    }
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(localRotRad);
    ctx.translate(-px, -py);
    if(u.kind === "layer"){
      const color = (def.colors && def.colors[L.id]) || L.color || "#888";
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, lw, lh);
      ctx.strokeStyle = "rgba(0,0,0,0.65)";
      ctx.lineWidth = 2;
      ctx.strokeRect(1, 1, lw - 2, lh - 2);
    } else if(u.kind === "armor"){
      _rev506_tryDrawArmorAtLayer(ctx, u.armorId, lw, lh, px, py);
    } else if(u.kind === "weapon"){
      _rev506_tryDrawWeaponAtLayer(ctx, u.weaponId, lw, lh, px, py);
    }
    ctx.restore();
  }
  ctx.restore();
}





function _rev506_checkHumanImagesReady(equipData){
  if(!equipData) return true;
  const ids = [];
  if(equipData.head) ids.push(equipData.head);
  if(equipData.top) ids.push(equipData.top);
  if(equipData.primary) ids.push(equipData.primary);
  if(!ids.length) return true;
  for(let i = 0; i < ids.length; i++){
    const img = getHeroImg("icons/items/" + resolveIconId(ids[i]) + ".png");
    if(!img || !img.complete || !img.naturalWidth) return false;
  }
  return true;
}

function _rev506_renderCorpseTo(c){
  const cvs = c.el;
  const ctx = cvs.getContext("2d");
  const dpr = c.dpr;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, cvs.width, cvs.height);
  ctx.scale(dpr, dpr);
  if(c.isHuman){
    _rev506_drawHumanCorpse(ctx, c.drawId, c.idleScale, c.ox, c.oy, c.def, c.deathAnim, c.lastFrame, c.equip);
    c.fullyDrawn = _rev506_checkHumanImagesReady(c.equip);
  } else {
    if(typeof _drawEnemyAt === "function"){
      _drawEnemyAt(ctx, c.drawId, c.ox, c.oy, c.idleScale, "death", c.lastFrame);
    }
    c.fullyDrawn = true;
  }
}

/* 尸体：从右侧进入、跟画布同速左移、从左离开；用 death 末帧绘制 */
function _spawnExploreCorpses(enemies){
  const fx = document.getElementById("explore-fx");
  if(!fx) return;
  if(typeof _drawEnemyAt !== "function") return;
  const fxW = fx.clientWidth || 400;
  const fxH = fx.clientHeight || 500;
  const charPx = fxH * 0.58;
  /* rev527: 復用共享容器，每次生成獨立 batch 子層，不影響舊屍體的左移 */
  let container = document.getElementById("explore-corpse-group");
  if(!container){
    container = document.createElement("div");
    container.id = "explore-corpse-group";
    container.style.cssText = "position:absolute;inset:0;z-index:10;pointer-events:none;";
    fx.appendChild(container);
  }
  const batch = document.createElement("div");
  batch.style.cssText = "position:absolute;inset:0;pointer-events:none;";
  container.appendChild(batch);
  const scrollSpeed = fxW / 10;
  const corpseEls = [];

  /* rev530: 先收集所有屍體參數，統一按金字塔佈局分配位置 */
  const _items = [];
  for(let i = 0; i < enemies.length; i++){
    try {
      const e = enemies[i];
      const r = _resolveEnemyDef(e.id);
      if(!r) continue;
      const def = r.def;
      const drawId = r.resolvedId;
      const anims = _resolveEnemyAnims(drawId);
      if(!anims) continue;
      const deathAnim = anims.death;
      if(!deathAnim) continue;
      const lastFrame = deathAnim.frameCount - 1;
      const bbox = _measureDeathBBox(def, deathAnim, lastFrame);
      if(!bbox) continue;
      const cw = def.canvas.w, ch = def.canvas.h;
      const isHuman = (def.kind === "human");
      let domHIdle;
      if(drawId === "mutant_wolf") domHIdle = charPx * 0.9;
      else if(drawId === "mutant_bear") domHIdle = charPx * 1.05;
      else if(isHuman) domHIdle = charPx * 1.25;
      else domHIdle = charPx * 0.8;
      const idleScale = domHIdle / ch;
      const anchorLayerId = isHuman ? "torso" : (_rev506_ANIMAL_ANCHOR[drawId] || "body");
      const anchorMaxY = _rev506_measureLayerMaxY(def, deathAnim, lastFrame, anchorLayerId);
      let canvasHeightUnits = bbox.h;
      if(anchorMaxY !== null && anchorMaxY < bbox.maxY){
        canvasHeightUnits = anchorMaxY - bbox.minY;
      }
      const equip = isHuman ? _rev506_getRandomEquip(drawId) : null;
      let padLeft = 0, padRight = 0, padTop = 0;
      if(isHuman){
        padLeft = 60;
        padRight = 60;
        if(equip && equip.primary){
          padTop = Math.round(ch * 0.20);
        }
      }
      canvasHeightUnits += padTop;
      const canvasWidthUnits = bbox.w + padLeft + padRight;
      const drawW = canvasWidthUnits * idleScale;
      const drawH = canvasHeightUnits * idleScale;
      _items.push({ def, drawId, deathAnim, lastFrame, idleScale, isHuman, equip, bbox, padLeft, padTop, drawW, drawH });
    } catch(err){ /* silent */ }
  }

  if(!_items.length){ batch.remove(); return; }

  /* rev530: 金字塔布局 —— 3+2+1 */
  /*   i<3 → 第 0 层；i<5 → 第 1 层（错开 0.5 格）；i>=5 → 第 2 层（居中） */
  /*   每层 bottom 提升 50% 尸体高度（垂直重合 50%） */
  /* rev530b/c: 固定间距，方便手调 */
  const CORPSE_GAP_PX = 44;   /* 左右水平间距 */
  const CORPSE_STEP_PX = 20;  /* rev530d: 上下层距 20px（上层 body 下缘落入下层 body 范围） */
  const CORPSE_IN_LAYER_DOWN_PX = 12;  /* rev530c: 同层内每个比前一个偏下 12px */
  const _unitGap = CORPSE_GAP_PX;
  const _layerStep = CORPSE_STEP_PX;
  const _inLayerDown = CORPSE_IN_LAYER_DOWN_PX;

  function _getPlacement(i){
    if(i < 3) return { layer: 0, offsetX: i, layerIndex: i };
    if(i < 5) return { layer: 1, offsetX: (i - 3) + 0.5, layerIndex: i - 3 };
    if(i === 5) return { layer: 2, offsetX: 1, layerIndex: 0 };
    /* 溢出（>6 具）：最上层往右排 */
    return { layer: 2, offsetX: 1 + (i - 5) * 0.8, layerIndex: i - 5 };
  }

  const _baseStartX = fxW + 20;
  const _baseBottomPct = 5;

  for(let i = 0; i < _items.length; i++){
    const it = _items[i];
    const place = _getPlacement(i);
    const xPos = _baseStartX + place.offsetX * _unitGap;
    const layerOffset = place.layer * _layerStep - (place.layerIndex || 0) * _inLayerDown;
    const dpr = 2;
    const cvs = document.createElement("canvas");
    cvs.width = Math.max(1, Math.round(it.drawW * dpr));
    cvs.height = Math.max(1, Math.round(it.drawH * dpr));
    cvs.style.cssText = "position:absolute;left:0;bottom:calc(" + _baseBottomPct + "% + " + layerOffset + "px);width:" + it.drawW + "px;height:" + it.drawH + "px;transform:translateX(" + xPos + "px);z-index:" + (10 + place.layer) + ";";
    const corpseObj = {
      el: cvs,
      dpr: dpr,
      isHuman: it.isHuman,
      drawId: it.drawId,
      def: it.def,
      deathAnim: it.deathAnim,
      lastFrame: it.lastFrame,
      idleScale: it.idleScale,
      ox: -(it.bbox.minX - it.padLeft) * it.idleScale,
      oy: -(it.bbox.minY - it.padTop) * it.idleScale,
      baseLeft: xPos,
      width: it.drawW,
      fullyDrawn: false,
      equip: it.equip
    };
    _rev506_renderCorpseTo(corpseObj);
    batch.appendChild(cvs);
    corpseEls.push(corpseObj);
  }

  const startTime = performance.now();
  function tick(){
    if(!batch.parentNode) return;
    const elapsed = (performance.now() - startTime) / 1000;
    const shift = scrollSpeed * elapsed;
    let allOut = true;
    for(let i = 0; i < corpseEls.length; i++){
      const c = corpseEls[i];
      const x = c.baseLeft - shift;
      c.el.style.transform = "translateX(" + x + "px)";
      if(!c.fullyDrawn){
        _rev506_renderCorpseTo(c);
      }
      if(x + c.width > 0) allOut = false;
    }
    if(allOut){ batch.remove(); return; }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}





/* 弹幕：从右飞入，到达玩家即停 + 玩家 hurt；仅在逃跑时调用 */
function _spawnEnemyBulletsToPlayer(count){
  const fx = document.getElementById('explore-fx');
  if(!fx) return;
  const fxW = fx.clientWidth || 400;
  const fxH = fx.clientHeight || 500;
  const playerX = fxW * (typeof EXPLORE_HERO_X_RATIO === 'number' ? EXPLORE_HERO_X_RATIO : 0.25);
  const playerY = fxH * 0.58;
  for(let i = 0; i < count; i++){
    (function(idx){
      setTimeout(function(){
        if(!fx.parentNode) return;
        const bullet = document.createElement('div');
        const sy = playerY + (Math.random() - 0.5) * 60;
        bullet.style.cssText = 'position:absolute;width:8px;height:8px;border-radius:50%;background:#ff3030;box-shadow:0 0 10px #ff0000;left:' + (fxW + 30) + 'px;top:' + sy + 'px;z-index:20;opacity:1;transition:left 0.4s linear, top 0.4s linear, opacity 0.15s linear;';
        fx.appendChild(bullet);
        requestAnimationFrame(function(){
          bullet.style.left = playerX + 'px';
          bullet.style.top = (playerY - 8) + 'px';
        });
        setTimeout(function(){
          bullet.style.opacity = '0';
          setTimeout(function(){ bullet.remove(); }, 160);
          if(typeof heroAnim !== 'undefined'){
            heroAnim.name = 'hurt';
            heroAnim.frame = 0;
            heroAnim.lastUpdate = performance.now();
            heroAnim.forcedEnd = performance.now() + 500;
          }
        }, 400);
      }, idx * 120);
    })(i);
  }
}



/* id 解析：
   REGIONS.enemies 用 raider / ghoul / raider_vet，
   09 数据用 human_raider / human_ghoul / human_raider_vet。
   有 BEAST_LAYERS 命中直接用；否则尝试 HUMAN_ENEMY_DATA[id] 或 HUMAN_ENEMY_DATA["human_" + id]。 */


/* 尸体：从右侧进入、跟画布同速左移、从左离开；用 death 末帧绘制 */


/* 弹幕：从右侧快速飞入，0.4s 后到达玩家位置即停并淡出；触发玩家 hurt。
   只在 _resolveExploreEnemyGraphics(victory=false) 时调用。 */




/* 尸体从右侧进入、跟画布同速左移、从左离开；用 death 末帧绘制 */


/* 弹幕从右侧快速飞入，打到玩家即停；触发玩家 hurt 动作 */




function playExploreCombatFx(slot, isMelee){
  let animName = 'fire_primary';
  if(slot === 'secondary') animName = 'fire_secondary';
  else if(slot === 'melee' || slot === 'throwable') animName = 'attack_melee';
  heroAnim.name = animName;
  heroAnim.frame = 0;
  heroAnim.lastUpdate = performance.now();
  heroAnim.forcedEnd = performance.now() + 900;
  heroAnim.eqSlot = slot;
  setTimeout(()=>{ if(heroAnim.eqSlot === slot) heroAnim.eqSlot = null; }, 900);
  if(isMelee) return;
  spawnExploreBullets(1 + Math.floor(Math.random()*3));
}

const SAVE_KEY='wasteland_save_v17_5';
function defaultState(){
  return {
    player:{level:1,exp:0,hp:100,maxHp:100,armor:0,maxArmor:0,armorLevel:0,equipped:{head:null,face:null,top:null,pants:null,shoes:null,backpack:'bplarge',primary:null,secondary:null,melee:null,throwable:null},equippedRarity:{backpack:'傳奇'},throwableStock:0},
    inventory:{},logs:[],pendingSalvageEquipped:{},
    proficiency:{primary:0,secondary:0,melee:0,throwable:0,'突擊步槍':0,'機槍':0,'衝鋒槍':0,'狙擊槍':0,'手槍':0,'霰彈槍':0,'刺刀':0,'刀':0,'手榴彈':0,craft:0,salvage:0,drop:0},
    preferences:{ammoExplore:{priority:'一般',fallback:'desc',exclude:[]},ammoCombat:{priority:'傳奇',fallback:'desc',exclude:[]},consume:{priority:'一般',fallback:'desc',exclude:[]},throwableExplore:{priority:'破舊',fallback:'asc',exclude:['精品','傳奇']},throwableCombat:{priority:'傳奇',fallback:'desc',exclude:[]},actionMode:'attack',regions:['廢棄工廠'],ammoOrder:{primary:[],secondary:[],throwable:[]}},
    exploreDelayUntil:0,pendingHealFull:false,
    regionProgress:{},activeRegion:null,stashedWeapons:{},
    base:{slots:new Array(12).fill(null).map((_,i)=>i===0?{id:'control',lv:1}:null)},
    garden:{plots:new Array(20).fill(null),storage:{}},
    servants:[],
    unlockedEquip:{},
    seals:{},defeatedBosses:[],unlockedRegions:['廢棄工廠'],
    radioUses:0,radioLastResetDay:0,radioCooldownUntil:0,
    lastSeen:Date.now(),radioLastTick:0,armoryLastTick:0,crafting:[],
    stats:{kills:0,deaths:0,bossKills:0},
  };
}
let state=defaultState();

function save(){state.lastSeen=Date.now();try{localStorage.setItem(SAVE_KEY,JSON.stringify(state));}catch(e){}}
function load(){
  try{
    const raw=localStorage.getItem(SAVE_KEY);if(!raw)return false;
    const s=JSON.parse(raw);const d=defaultState();
    state=Object.assign(d,s);
    state.player=Object.assign(d.player,s.player||{});
    state.player.equipped=Object.assign(d.player.equipped,(s.player&&s.player.equipped)||{});
    state.player.throwableStock=parseInt(state.player.throwableStock||0,10);
    state.proficiency=Object.assign(d.proficiency,s.proficiency||{});
    state.preferences=Object.assign(d.preferences,s.preferences||{});
    state.preferences.regions=(state.preferences.regions||[]).filter(r=>!!REGIONS[r]);
    state.unlockedRegions=(state.unlockedRegions||[]).filter(r=>!!REGIONS[r]);
    {const _seen={};for(const id of state.preferences.regions){const _b=id.replace(/II$/,'');_seen[_b]=id;}state.preferences.regions=Object.values(_seen);}
    if(!state.unlockedRegions.includes('廢棄工廠'))state.unlockedRegions.push('廢棄工廠');
    /* rev331: 區域解鎖與 boss 進度對齊 */
    if(!Array.isArray(state.defeatedBosses)) state.defeatedBosses = [];
    {
      const _regionBossMap = [
        {region:'廢棄實驗室', boss:'factory_king'},
        {region:'郊區公路', boss:'lab_queen'},
        {region:'輻射沼澤', boss:'road_tyrant'},
        {region:'廢土核心', boss:'swamp_hydra'}
      ];
      for(const _m of _regionBossMap){
        if(!state.defeatedBosses.includes(_m.boss)){
          state.unlockedRegions = state.unlockedRegions.filter(x => x !== _m.region && x !== _m.region + 'II');
          state.preferences.regions = state.preferences.regions.filter(x => x !== _m.region && x !== _m.region + 'II');
        }
      }
    }
    delete state.preferences.autoSalvage;
    delete state.preferences.autoConsumeThreshold;
    if(!state.preferences.ammoOrder || typeof state.preferences.ammoOrder !== 'object'){
      state.preferences.ammoOrder = {primary:[],secondary:[],throwable:[]};
    }
    state.exploreDelayUntil = parseInt(state.exploreDelayUntil||0,10);
    state.pendingHealFull = !!state.pendingHealFull;
    state.base=Object.assign(d.base,s.base||{});
    /* rev126: 後院資料遷移 */
    if(!state.garden || typeof state.garden !== 'object') state.garden = {plots:new Array(20).fill(null)};
    if(!Array.isArray(state.garden.plots)) state.garden.plots = new Array(20).fill(null);
    if(!Array.isArray(state.garden.battleLog)) state.garden.battleLog = [];
    if(!Array.isArray(state.garden.log)) state.garden.log = [];
    if(typeof state.garden.lastMealAt !== 'number') state.garden.lastMealAt = Math.floor(Date.now() / 3600000) * 3600000;
    for(let _pi = 0; _pi < state.garden.plots.length; _pi++){ const _p = state.garden.plots[_pi]; if(_p){ if(typeof _p.broken !== 'boolean') _p.broken = false; if(_p.type === 'tower' && (!_p.towerConfig || typeof _p.towerConfig !== 'object')) _p.towerConfig = { eq:{ head:null, face:null, top:null, pants:null, shoes:null, primary:null, secondary:null, melee:null }, eqRarity:{}, ammoId:null, ammoMax:0 }; } }
    while(state.garden.plots.length < 20) state.garden.plots.push(null);
    if(state.garden.plots.length > 20) state.garden.plots.length = 20;
    if(!state.garden.storage || typeof state.garden.storage !== 'object') state.garden.storage = {};
    if(typeof _cleanGardenStorageRarity === 'function') _cleanGardenStorageRarity();
    if(typeof state.garden.food !== 'number') state.garden.food = 0;
    if(!state.garden.merchant || typeof state.garden.merchant !== 'object') state.garden.merchant = { foodLv:0, seedLv:0, throwLv:0, lastFood:0, lastSeed:0, lastThrow:0, lastFeed:0 };
    { const _m = state.garden.merchant; if(typeof _m.foodLv !== 'number') _m.foodLv = 0; if(typeof _m.seedLv !== 'number') _m.seedLv = 0; if(typeof _m.throwLv !== 'number') _m.throwLv = 0; delete _m.foodLine; delete _m.seedLine; delete _m.throwLine; }
    if(!Array.isArray(state.servants)) state.servants = [];
    if(!state.unlockedEquip || typeof state.unlockedEquip !== 'object') state.unlockedEquip = {};
    if(typeof _initUnlockedFrom === 'function') _initUnlockedFrom();
    for(const _srv of state.servants){
      if(_srv.autoPlant !== 'off' && _srv.autoPlant !== 'any' && _srv.autoPlant !== 'follow'){
        _srv.autoPlant = (_srv.autoPlant && _srv.autoPlant !== 'off') ? 'follow' : 'off';
      }
      if(typeof _srv.stamina !== 'number'){
        _srv.stamina = (typeof servantEffectiveMaxStamina === 'function') ? servantEffectiveMaxStamina(_srv) : 100;
      }
      if(!_srv.foodPolicy) _srv.foodPolicy = 'normal';
      if(typeof _srv.resting !== 'boolean') _srv.resting = false;
      if(typeof _srv._starve !== 'boolean') _srv._starve = false;
    }
    if(!state.garden) state.garden = {};
    if(typeof state.garden.nextServantTag !== 'number') state.garden.nextServantTag = 1;
    for(const _srv of state.servants){
      if(typeof _srv.obtainedAt !== 'number') _srv.obtainedAt = Date.now();
      if(typeof _srv.tag !== 'number') _srv.tag = state.garden.nextServantTag++;
      if(typeof _srv.customName !== 'string') _srv.customName = '';
    }
    for(const _srv of state.servants){
      if(!Array.isArray(_srv.assignedPlots)){
        if(typeof _srv.assignedPlot === 'number' && _srv.assignedPlot >= 0) _srv.assignedPlots = [_srv.assignedPlot];
        else _srv.assignedPlots = [];
      }
      delete _srv.assignedPlot;
    }
    /* rev125: 清理舊存檔中的 merchant / garden（不再是建築） */
    if(!Array.isArray(state.base.slots)) state.base.slots=[];
    while(state.base.slots.length<12) state.base.slots.push(null);
    if(!state.base.slots[0]||state.base.slots[0].id!=='control') state.base.slots[0]={id:'control',lv:1};
    for(let _i=1;_i<12;_i++){
      const _s=state.base.slots[_i];
      if(_s&&(_s.id==='merchant'||_s.id==='garden')) state.base.slots[_i]=null;
    }
    state.regionProgress=Object.assign({},s.regionProgress||{});
    state.pendingSalvageEquipped=s.pendingSalvageEquipped||{};
    state.stashedWeapons=s.stashedWeapons||{};
    delete state.preferences.weaponPriority;
    delete state.preferences.ammoRarity;
    delete state.preferences.consumeRarity;
    const _prefDefaults = {
      ammoExplore:{priority:'一般',fallback:'desc',exclude:[]},
      ammoCombat:{priority:'傳奇',fallback:'desc',exclude:[]},
      consume:{priority:'一般',fallback:'desc',exclude:[]},
      throwableExplore:{priority:'破舊',fallback:'asc',exclude:['精品','傳奇']},
      throwableCombat:{priority:'傳奇',fallback:'desc',exclude:[]},
    };
    for(const k of Object.keys(_prefDefaults)){
      if(!state.preferences[k] || typeof state.preferences[k] !== 'object'){
        state.preferences[k] = Object.assign({}, _prefDefaults[k]);
      }
      const c = state.preferences[k];
      if(!Array.isArray(c.exclude)) c.exclude = [];
      c.exclude = c.exclude.filter(x=>RARITY_ORDER.includes(x));
      if(!RARITY_ORDER.includes(c.priority)) c.priority = _prefDefaults[k].priority;
      if(!['asc','desc'].includes(c.fallback)) c.fallback = _prefDefaults[k].fallback;
    }
    for(const k in state.seals){state.seals[k]=Math.max(0,parseInt(state.seals[k]||0,10));}
    if(!state.player.equipped.backpack){state.player.equipped.backpack='bplarge';state.player.equippedRarity.backpack='傳奇';}
    removeInvalidInventoryItems();
    consolidateInventoryDuplicates();
    _cleanupAmmoRarity();
    for(const slot in state.player.equipped){const id=state.player.equipped[slot];if(id && !ALL_ITEMS[id] && !id.startsWith('named_')){state.player.equipped[slot]=null;delete state.player.equippedRarity[slot];}}
    for(const k in state.inventory){const [id]=k.split('@');if(id.startsWith('named_')){const parts=id.split('_');if(parts.length>=4){const baseId=parts[1];const mag=parts[2]==='x'?null:parseInt(parts[2],10);const scope=parts[3]==='x'?null:parts[3];if(WEAPONS[baseId])getOrCreateNamedItem(baseId,mag,scope);}}}
    for(const slot in state.player.equipped){const id=state.player.equipped[slot];if(id && id.startsWith('named_')){const parts=id.split('_');if(parts.length>=4){const baseId=parts[1];const mag=parts[2]==='x'?null:parseInt(parts[2],10);const scope=parts[3]==='x'?null:parts[3];if(WEAPONS[baseId])getOrCreateNamedItem(baseId,mag,scope);}}}
    return true;
  }catch(e){return false;}
}

function $(s,e){return(e||document).querySelector(s);}
function $$(s,e){return Array.from((e||document).querySelectorAll(s));}
function el(t,c,h){const e=document.createElement(t);if(c)e.className=c;if(h!=null)e.innerHTML=h;return e;}
function pick(a){return a[Math.floor(Math.random()*a.length)];}
function pickN(a,n){const c=a.slice(),r=[];for(let i=0;i<n&&c.length;i++)r.push(c.splice(Math.floor(Math.random()*c.length),1)[0]);return r;}
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function rnd(a,b){return a+Math.random()*(b-a);}
function rndInt(a,b){return Math.floor(rnd(a,b+1));}
function fmtTime(ts){const d=new Date(ts);return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')+':'+String(d.getSeconds()).padStart(2,'0');}
function rarityClass(r){return 'r-'+r;}
function invKey(id,r){return id+'@'+r;}
function _initUnlockedFrom(){
  if(!state.unlockedEquip || typeof state.unlockedEquip !== 'object') state.unlockedEquip = {};
  for(const k in state.inventory){
    const p = k.split('@');
    if(p.length !== 2) continue;
    const d = ALL_ITEMS[p[0]];
    if(d && d.slot) state.unlockedEquip[k] = true;
  }
  for(const slot in state.player.equipped){
    const id = state.player.equipped[slot];
    if(!id) continue;
    const rar = state.player.equippedRarity[slot] || '一般';
    const d = ALL_ITEMS[id];
    if(d && d.slot) state.unlockedEquip[id + '@' + rar] = true;
  }
}
function invAddRaw(id,r,c){
  if(c<=0)return;
  if(!ALL_ITEMS[id] && !id.startsWith('named_')){
    console.warn('[invAddRaw] 非法物品ID：', id, 'rarity:', r);
    return;
  }
  const k=invKey(id,r);state.inventory[k]=(state.inventory[k]||0)+c;if(ALL_ITEMS[id]&&ALL_ITEMS[id].slot){if(!state.unlockedEquip)state.unlockedEquip={};state.unlockedEquip[id+'@'+r]=true;}
}
function invRemove(id,r,c){if(typeof SEEDS !== 'undefined' && SEEDS[id]){ return gardenStorageRemove(id, r, c); } const k=invKey(id,r);if(!state.inventory[k]||state.inventory[k]<c)return false;state.inventory[k]-=c;if(state.inventory[k]<=0)delete state.inventory[k];return true;}
function invCount(id,r){return state.inventory[invKey(id,r)]||0;}
/* ===== rev130: 後院儲備 helper ===== */
function _gardenStorageInit(){
  if(!state.garden || typeof state.garden !== 'object') state.garden = {plots:new Array(20).fill(null), storage:{}};
  if(!Array.isArray(state.garden.plots)) state.garden.plots = new Array(20).fill(null);
  if(!state.garden.storage || typeof state.garden.storage !== 'object') state.garden.storage = {};
  return state.garden.storage;
}
function _cleanGardenStorageRarity(){
  if(typeof state === 'undefined' || !state.garden || !state.garden.storage) return;
  const validRar = ['破舊','一般','庫存','精品','傳奇'];
  const toDel = [];
  const stor = state.garden.storage;
  for(const k in stor){
    const idx = k.lastIndexOf('@');
    if(idx < 0){ toDel.push(k); continue; }
    const id = k.slice(0, idx);
    const rar = k.slice(idx + 1);
    /* rev564: 用 _gardenStorageKind 判断，涵盖 SEEDS/CROPS/GARDEN_EXTRAS，避免未来新物品被误删 */
    const validId = (typeof _gardenStorageKind === 'function')
      ? !!_gardenStorageKind(id)
      : ((typeof SEEDS !== 'undefined' && SEEDS[id]) || (typeof CROPS !== 'undefined' && CROPS[id]));
    if(!validId){ toDel.push(k); continue; }
    if(validRar.indexOf(rar) === -1){ toDel.push(k); continue; }
  }
  for(const k of toDel){ delete stor[k]; }
}
function gardenStorageAdd(id, rarity, count){
  if(count <= 0) return;
  const _validRar = ['破舊','一般','庫存','精品','傳奇'];
  if(_validRar.indexOf(rarity) === -1){ console.warn('[gardenStorageAdd] 非法稀有度：', id, rarity); return; }
  const s = _gardenStorageInit();
  const k = id + '@' + rarity;
  s[k] = (s[k] || 0) + count;
  if(!state.garden.storageBatches || typeof state.garden.storageBatches !== 'object') state.garden.storageBatches = {};
  if(!Array.isArray(state.garden.storageBatches[k])) state.garden.storageBatches[k] = [];
  state.garden.storageBatches[k].push({ count: count, addedAt: Date.now() });
}
function gardenStorageRemove(id, rarity, count){
  const s = _gardenStorageInit();
  const k = id + '@' + rarity;
  if(!s[k] || s[k] < count) return false;
  s[k] -= count;
  if(s[k] <= 0) delete s[k];
  if(state.garden && state.garden.storageBatches && Array.isArray(state.garden.storageBatches[k])){
    const batches = state.garden.storageBatches[k];
    let remain = count;
    while(remain > 0 && batches.length){
      const b = batches[0];
      if(b.count <= remain){ remain -= b.count; batches.shift(); }
      else { b.count -= remain; remain = 0; }
    }
    if(!batches.length) delete state.garden.storageBatches[k];
  }
  return true;
}
function gardenStorageCount(id, rarity){
  const s = _gardenStorageInit();
  return s[id + '@' + rarity] || 0;
}
/* ===== end rev130 ===== */
function invList(){
  const l=[];
  for(const k in state.inventory){
    const p=k.split('@');
    if(p.length!==2) continue;
    const id=p[0],r=p[1];
    const def=itemDef(id);
    if(!def && !id.startsWith('named_')) continue;
    l.push({id,rarity:r,count:state.inventory[k],def});
  }
  return l;
}
function getAmmoByCal(cal){const l=[];for(const k in state.inventory){const p=k.split('@');if(p.length!==2)continue;const id=p[0],r=p[1];const d=AMMO[id];if(!d||d.cal!==cal)continue;const cnt=state.inventory[k];if(!cnt||cnt<=0)continue;l.push({id,rarity:r,count:cnt,def:d});}return l;}
function _ammoOrderKey(slot){
  const id = state.player.equipped[slot];
  if(!id) return slot;
  return slot + ':' + id;
}
function getAmmoOrder(slot){
  const o = state.preferences.ammoOrder || {};
  const key = _ammoOrderKey(slot);
  if(Array.isArray(o[key])) return o[key];
  if(Array.isArray(o[slot])) return o[slot];
  return [];
}
function setAmmoOrder(slot, order){
  const o = state.preferences.ammoOrder = state.preferences.ammoOrder || {};
  const key = _ammoOrderKey(slot);
  o[key] = order.slice();
  delete o[slot];
  save();
}
function getThrowableOrder(){
  const o = state.preferences.ammoOrder || {};
  const id = state.player.equipped.throwable;
  const key = id ? ('throwable:' + id) : 'throwable';
  if(Array.isArray(o[key])) return o[key];
  if(Array.isArray(o['throwable'])) return o['throwable'];
  return [];
}
function setThrowableOrder(order){
  const o = state.preferences.ammoOrder = state.preferences.ammoOrder || {};
  const id = state.player.equipped.throwable;
  const key = id ? ('throwable:' + id) : 'throwable';
  o[key] = order.slice();
  delete o['throwable'];
  save();
}
function pickAmmoByPreferenceOrOrder(cal, context){
  const allOrders = state.preferences.ammoOrder || {};
  const _ctx = (context === 'combat')
    ? (state.preferences.ammoCombat || {exclude:[]})
    : (state.preferences.ammoExplore || {exclude:[]});
  const _ex = _ctx.exclude || [];
  for(const s of ['primary','secondary']){
    const wid = state.player.equipped[s];
    if(!wid) continue;
    const key = s + ':' + wid;
    const order = Array.isArray(allOrders[key]) ? allOrders[key] : (Array.isArray(allOrders[s]) ? allOrders[s] : []);
    for(const aid of order){
      const d = AMMO[aid];
      if(!d || d.cal !== cal) continue;
      if(_ex.indexOf(d.rarity) !== -1) continue;
      const cnt = invCount(aid, d.rarity);
      if(cnt > 0) return {id:aid, rarity:d.rarity, count:cnt, def:d};
    }
  }
  return pickAmmoByPreference(cal, context);
}
function pickThrowableByPreferenceOrOrder(context){
  const order = getThrowableOrder();
  const _ctx = (context === 'combat')
    ? (state.preferences.throwableCombat || {exclude:[]})
    : (state.preferences.throwableExplore || {exclude:['精品','傳奇']});
  const _ex = _ctx.exclude || [];
  if(order.length){
    for(const tid of order){
      const d = WEAPONS[tid];
      if(!d || d.slot !== 'throwable') continue;
      for(const rar of RARITY_ORDER){
        if(_ex.indexOf(rar) !== -1) continue;
        const cnt = invCount(tid, rar);
        if(cnt > 0) return {id:tid, rarity:rar, count:cnt, def:d};
      }
    }
    /* rev539: order 中所有 id 都無貨 → fallback 偏好，不直接 return null */
  }
  return pickThrowableByPreference(context);
}

function pickAmmoByPreference(cal,context){const l=getAmmoByCal(cal);if(!l.length)return null;const ctx=(context==='combat')?(state.preferences.ammoCombat||{priority:'傳奇',fallback:'desc',exclude:[]}):(state.preferences.ammoExplore||{priority:'一般',fallback:'desc',exclude:[]});const ex=ctx.exclude||[];const filtered=l.filter(a=>!ex.includes(a.rarity));if(!filtered.length)return null;const pri=ctx.priority||'一般';if(!ex.includes(pri)){const primary=filtered.filter(a=>a.rarity===pri);if(primary.length)return pick(primary);}const fb=ctx.fallback||'desc';const order=(fb==='asc')?['破舊','一般','庫存','精品','傳奇']:['傳奇','精品','庫存','一般','破舊'];for(const rar of order){const s=filtered.filter(a=>a.rarity===rar);if(s.length)return pick(s);}return pick(filtered);}
/* ★ 投擲物偏好挑選：探索／戰鬥分開，探索預設排除高稀有度以免浪費 */
function pickThrowableByPreference(context){
  const ctx = (context === 'combat')
    ? (state.preferences.throwableCombat || {priority:'傳奇',fallback:'desc',exclude:[]})
    : (state.preferences.throwableExplore || {priority:'破舊',fallback:'asc',exclude:['精品','傳奇']});
  const ex = ctx.exclude || [];
  const items = [];
  for(const k in state.inventory){
    const [id, r] = k.split('@');
    const d = WEAPONS[id];
    if(!d || d.slot !== 'throwable') continue;
    const cnt = state.inventory[k];
    if(!cnt || cnt <= 0) continue;
    if(ex.includes(r)) continue;
    items.push({id, rarity:r, count:cnt, def:d});
  }
  if(!items.length) return null;
  const pri = ctx.priority || '一般';
  /* rev541: items 已过滤 exclude，无需再判断 ex.includes(pri) */
  const primary = items.filter(a => a.rarity === pri);
  if(primary.length) return pick(primary);
  const fb = ctx.fallback || 'desc';
  const order = (fb === 'asc')
    ? ['破舊','一般','庫存','精品','傳奇']
    : ['傳奇','精品','庫存','一般','破舊'];
  for(const rar of order){
    const s = items.filter(a => a.rarity === rar);
    if(s.length) return pick(s);
  }
  return pick(items);
}
function findNextConsumable(){const ctx=state.preferences.consume||{priority:'一般',fallback:'desc',exclude:[]};const ex=ctx.exclude||[];const items=[];for(const k in state.inventory){const [id,r]=k.split('@');if(!CONSUMABLES[id])continue;if(ex.includes(r))continue;items.push({id,rarity:r,count:state.inventory[k]});}if(!items.length)return null;const pri=ctx.priority;if(!ex.includes(pri)){const p=items.filter(a=>a.rarity===pri);if(p.length)return p[0];}const fb=ctx.fallback||'desc';const order=(fb==='asc')?['破舊','一般','庫存','精品','傳奇']:['傳奇','精品','庫存','一般','破舊'];for(const r of order){const s=items.filter(a=>a.rarity===r);if(s.length)return s[0];}return items[0];}
function equippedWeapon(slot){const id=state.player.equipped[slot];if(!id)return null;const rar=state.player.equippedRarity[slot]||'一般';const def=itemDef(id);if(!def)return null;return{id,rarity:rar,def,slot};}
function getBuildingLv(id){for(const s of state.base.slots){if(s&&s.id===id){const _raw=s.lv||1;const _mx=(BUILDINGS[id]&&BUILDINGS[id].maxLv)||999;return Math.min(_raw,_mx);}}return 0;}
function buildingBonusText(bid,lv){
  switch(bid){case 'workbench':{const _c=Math.min(50,Math.max(1,lv));const _s=Math.round(86400*Math.pow(300/86400,(_c-1)/49));const _m=Math.round(_s/60);const _t=_m<60?(_m+' 分鐘'):(Math.round(_m/60)+' 小時');return `改造所需：${_t}/件`;}case 'storage':return `掉落數量 +${lv*2}%`;
  case 'toilet':return `熟練度獲取 +${lv*2}%`;case 'rest':return `生命成長率 ${(0.1*Math.pow(1.02,lv)*100).toFixed(2)}%`;
  case 'generator':return `製造/冷卻加速 +${lv*4}%`;case 'medbay':return `消耗品恢復 +${lv*3}%`;
  case 'forge':return `護甲值 +${lv*3}%`;
  case 'radio':return `補給量 ×${(1+lv*0.3).toFixed(1)}`;
  case 'armory':{
    let targetRarity='一般';
    if(lv<=10)targetRarity='破舊';else if(lv<=20)targetRarity='一般';else if(lv<=35)targetRarity='庫存';else targetRarity='精品';
    return `產出主副彈藥（當前稀有度：${targetRarity}）`;
  }default:return '';}
}
function calcMaxHp(){const rl=getBuildingLv('rest');const base=1+0.1*Math.pow(1.02,rl);return Math.round(100*Math.pow(base,state.player.level-1));}
function equipArmorValue(id,rarity){
  const def=ARMOR[id];
  if(!def)return 0;
  if(def.slot==='backpack')return 0;
  let base=0;
  if(def.slot==='head'){
    base=10*getHelmetTotalLevel(id);
  } else if(def.slot==='top'){
    base=10*(def.level||1)*1.5;
    if(def.armored)base*=1.2;
  } else {
    base=10*(def.level||1);
  }
  return Math.round(base*(RARITY_MULT[rarity]||1));
}
const ROMAN_NUM=['','I','II','III','IV','V','VI'];
function armorBreakdownText(id,rarity){
  const def=ARMOR[id];
  if(!def||def.armor==null)return '';
  const mult=RARITY_MULT[rarity]||1;
  if(def.slot==='head'&&def.subArmor&&def.subArmor.length){
    return def.subArmor.map(s=>{
      const v=Math.round(10*(s.level||0)*mult);
      const r=ROMAN_NUM[s.level]||'';
      return v+'（'+r+'級）';
    }).join('+');
  }
  const total=equipArmorValue(id,rarity);
  const lv=def.level||1;
  const ac=ROMAN_NUM[lv]||'';
  return total+(ac?'（'+ac+'級）':'');
}

/* ★ v17.5 重量工具 */
const HELMET_MASK_WEIGHT = { altyn:1.4, kiver:1.2, maska:1.1, zsh12m:1.0 }; /* v23 eftarkov.com */
function getItemWeight(id, rarity){
  if(!id) return 0;
  const def = itemDef(id);
  let baseId = id;
  if(def && def.named && def.baseId) baseId = def.baseId;
  let w = ITEM_WEIGHT[baseId] || 0;
  if(def && def.slot === 'head' && HELMET_MASK_WEIGHT[baseId]){
    w += HELMET_MASK_WEIGHT[baseId];
  }
  if(def && def.mag && def.cal){
    const aw = AMMO_UNIT_WEIGHT[def.cal] || 0;
    w += def.mag * aw;
  }
  return w;
}
function getTotalWeight(){
  let w = 0;
  for(const slot in state.player.equipped){
    const id = state.player.equipped[slot];
    if(!id) continue;
    w += getItemWeight(id, state.player.equippedRarity[slot]||'一般');
  }
  const tcount = getThrowableCount();
  const tid = state.player.equipped.throwable;
  if(tid && tcount>0) w += (ITEM_WEIGHT[tid]||0.5)*tcount;
  return Math.round(w*100)/100;
}
const BASE_EXPLORE_INTERVAL = 10000;
const WEIGHT_FREE_KG = 20;
const WEIGHT_PENALTY_PER_KG = 0.05;
function getWeightColor(w){
  if(w < WEIGHT_FREE_KG) return '#4caf50';
  const excess = w - WEIGHT_FREE_KG;
  const ratio = Math.min(1, excess / 30);
  const r = Math.round(232 + (224 - 232) * ratio);
  const g = Math.round(163 - (163 - 82) * ratio);
  const b = Math.round(61 - (61 - 82) * ratio);
  return 'rgb(' + r + ',' + g + ',' + b + ')';
}
function getExploreInterval(){
  const w = getTotalWeight();
  const extra = Math.max(0, w - WEIGHT_FREE_KG);
  return Math.round(BASE_EXPLORE_INTERVAL * (1 + extra * WEIGHT_PENALTY_PER_KG));
}
function refreshPlayerStats(){
  const prevMaxArmor = state.player.maxArmor || 0;
  state.player.maxHp=calcMaxHp();
  let armor=0;
  for(const slot of ['head','face','top','pants','shoes']){const id=state.player.equipped[slot];if(id){const rarity=state.player.equippedRarity[slot]||'一般';armor+=equipArmorValue(id,rarity);}}
  const forgeLv=getBuildingLv('forge');
  if(forgeLv>0) armor = Math.round(armor * (1 + forgeLv * 0.03));
  state.player.maxArmor=armor;
  state.player.armorLevel=getPlayerArmorLevel();
  /* v54-preserve-loss: 換裝時保持已損失的護甲 */
  const _prevLoss = Math.max(0, prevMaxArmor - (state.player.armor || 0));
  state.player.maxArmor = armor;
  if(armor !== prevMaxArmor){
    state.player.armor = Math.max(0, armor - _prevLoss);
  }
  if(state.player.hp>state.player.maxHp)state.player.hp=state.player.maxHp;
  if(state.player.armor>state.player.maxArmor)state.player.armor=state.player.maxArmor;
  if(state.player.armor<0)state.player.armor=0;
  /* rev338: HP / 護甲面板即時刷新 */
  if(typeof updatePlayerStatPanel === 'function') updatePlayerStatPanel();
}
function addExp(n){
  state.player.exp+=n;let need=Math.round(50*Math.pow(1.15,state.player.level-1));
  while(state.player.exp>=need){state.player.exp-=need;state.player.level++;refreshPlayerStats();state.player.hp=state.player.maxHp;pushLog(`<span class="pl">玩家</span> 升級至 <b>Lv.${state.player.level}</b>，最大生命 ${state.player.maxHp}。`,[],'explore');need=Math.round(50*Math.pow(1.15,state.player.level-1));}
}
function addProf(cat,n){const tl=getBuildingLv('toilet');const m=1+tl*0.02;state.proficiency[cat]=Math.min(MAX_PROF_RAW,(state.proficiency[cat]||0)+n*m);}
function getHitRate(weaponType,mode,scopeBonus){
  let base=10,p=0;
  /* v51: 改用 itemDef 支援具名武器 */
  const w=state.player.equipped.primary,s=state.player.equipped.secondary,m=state.player.equipped.melee,t=state.player.equipped.throwable;
  const _wd=itemDef(w), _sd=itemDef(s), _md=itemDef(m), _td=itemDef(t);
  if(_wd&&_wd.type===weaponType)p+=Math.floor(state.proficiency.primary||0);
  if(_sd&&_sd.type===weaponType)p+=Math.floor(state.proficiency.secondary||0);
  if(_md&&_md.type===weaponType)p+=Math.floor(state.proficiency.melee||0);
  if(_td&&_td.type===weaponType)p+=Math.floor(state.proficiency.throwable||0);
  p+=Math.floor(state.proficiency[weaponType]||0);
  return clamp(Math.round((base+p)*(MODE_ACCURACY[mode]||1)+(scopeBonus||0)),5,95);
}
function calcCritRate(wr,ar){return clamp(Math.round(10*(RARITY_MULT[wr]||1)*(RARITY_MULT[ar]||1))/100,0,0.85);}
function calcCritMult(wr,ar){return 1.5*(RARITY_MULT[wr]||1)*(RARITY_MULT[ar]||1);}

/* ★ 新穿甲公式：
   - 穿甲達標 (pen >= armorLevel)：同時傷裝甲與生命，
     生命傷害減免 reduction(diff) = 0.5 * 0.01^(diff/7)，diff:0→50%, 7→0.5%
   - 穿甲不足 (pen < armorLevel)：只傷裝甲，
     傷害倍率 mult(diff) = 0.1 * (0.1)^((diff-1)/5)，diff:1→10%, 6→1%
     （diff = armorLevel - pen）
   - 護甲值清零後：沿用 ×1.2 機制 */
function applyDamage(target,rawDmg,penetration,armorLevel){
  const A=Math.round(target.armor);const pen=penetration||0;
  const al=armorLevel||0;
  const result={armorLost:0,hpLost:0,finalDmg:0,overkill:false};
  if(A<=0){const hpDmg=Math.round(rawDmg*1.2);target.hp=Math.max(0,Math.round(target.hp-hpDmg));result.hpLost=hpDmg;result.finalDmg=hpDmg;result.overkill=true;return result;}
  const diff=pen-al;
  if(diff>=0){
    const reduction=0.5*Math.pow(0.01,diff/7);
    const armorDmg=Math.round(rawDmg);
    const hpDmg=Math.round(rawDmg*(1-reduction));
    const armorLost=Math.min(A,armorDmg);
    target.armor=Math.max(0,A-armorLost);
    target.hp=Math.max(0,Math.round(target.hp-hpDmg));
    result.armorLost=armorLost;
    result.hpLost=hpDmg;
    result.finalDmg=hpDmg;
    if(target.armor<=0)result.overkill=true;
  } else {
    const d=-diff;
    const mult=0.1*Math.pow(0.1,(d-1)/5);
    const armorDmg=Math.round(rawDmg*mult);
    const armorLost=Math.min(A,armorDmg);
    target.armor=Math.max(0,A-armorLost);
    result.armorLost=armorLost;
    result.finalDmg=armorLost;
  }
  return result;
}

const toastSlotSet = new Set();
function _safeMsgText(msg){
  try {
    if(msg == null) return '';
    if(typeof msg === 'string') return msg;
    if(typeof msg === 'number' || typeof msg === 'boolean') return String(msg);
    if(typeof msg === 'object'){
      if(typeof msg.nodeType === 'number') return msg.textContent != null ? String(msg.textContent) : '';
      if(typeof msg.message === 'string') return msg.message;
      return '';
    }
    return String(msg);
  } catch(e){ return ''; }
}

function notify(msg,type){
  msg = _safeMsgText(msg);
  if(typeof msg !== 'string'){
    if(msg && msg.nodeType === 1) msg = msg.textContent || '';
    else msg = String(msg);
  }
  if(battle && battle.active) return;
  const n=el('div','toast'+(type?' '+type:''),msg);
  let slot=0;
  while(toastSlotSet.has(slot) && slot<7) slot++;
  toastSlotSet.add(slot);
  n.style.top=`calc(22% + ${slot*50}px)`;
  document.body.appendChild(n);
  setTimeout(()=>{toastSlotSet.delete(slot);n.remove();},2300);
}
function hasGardenPlotType(type){
  if(!state.garden || !Array.isArray(state.garden.plots)) return false;
  for(const p of state.garden.plots){ if(p && p.type === type) return true; }
  return false;
}

function grantRandomServant(){
  const allTypes = Object.keys(SERVANT_TYPES);
  const types = allTypes.filter(function(t){
    if(t === 'foreman') return hasGardenPlotType('shed');
    return true;
  });
  if(!types.length) return null;
  const type = pick(types);
  const rarity = rollRarity();
  const id = 's_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
  if(!state.garden) state.garden = {};
  if(typeof state.garden.nextServantTag !== 'number') state.garden.nextServantTag = 1;
  const _tag = state.garden.nextServantTag++;
  const srv = {
    id: id, type: type, rarity: rarity, lv: 1, exp: 0,
    assignedPlots: [], autoPlant: 'off',
    foodPolicy: 'normal', resting: false,
    obtainedAt: Date.now(),
    tag: _tag,
    customName: ''
  };
  srv.stamina = (typeof servantEffectiveMaxStamina === 'function') ? servantEffectiveMaxStamina(srv) : 100;
  state.servants = state.servants || [];
  state.servants.push(srv);
  return srv;
}
function pushLog(html,items,type){
  html = _safeMsgText(html);if(typeof html !== 'string'){ if(html && html.nodeType === 1) html = html.textContent || ''; else html = String(html); }state.logs.push({t:Date.now(),html,items:items||[],type:type||'explore'});if(state.logs.length>500)state.logs.splice(0,state.logs.length-500);if(currentTab==='explore')renderZone3Log();}
function renderZone3Log(){
  const box=$('#logbox');if(!box)return;box.innerHTML='';
  const logs=state.logs.filter(l=>l.type!=='combat').slice(-60);
  for(const l of logs){
    const line=el('div','logline');
    line.innerHTML=`<span class="tm">${fmtTime(l.t)}</span> ${l.html}`;
    if(l.type==='offline' && l.items && l.items.length){
      line.style.cursor='pointer';
      line.title='點擊檢視獲得物資';
      line.onclick=()=>openOfflineDetail(l);
    }
    if(l.type==='btr'){
      line.style.cursor='pointer';
      line.title='點擊檢視支援報告';
      line.onclick=()=>window._openBTRSupportDetail(l);
    }
    box.appendChild(line);
  }
  box.scrollTop=box.scrollHeight;
}

function salvageToMaterials(id,rarity,count){
  const cat=itemCat(id);const mult={'破舊':1,'一般':2,'庫存':3,'精品':5,'傳奇':8,'具名':8}[rarity]||1;
  let mats=[];
  if(cat==='armor')mats=[['cloth',mult],['metal',mult]];
  else if(cat==='weapon'){mats=[['metal',mult],['screws',mult]];const def=itemDef(id);if(def&&def.cal){const mag=def.mag||10;const ammos=Object.keys(AMMO).filter(k=>AMMO[k].cal===def.cal);if(ammos.length){const aid=pick(ammos);invAddRaw(aid,AMMO[aid].rarity,mag*count);}}}
  else if(cat==='ammo')mats=[['metal',Math.max(1,Math.floor(mult/2))]];
  else if(cat==='consume')mats=[['cloth',mult]];else return false;
  for(const [m,c] of mats)invAddRaw(m,'一般',c*count);
  addProf('salvage',0.5*count);return true;
}
function removeInvalidInventoryItems(){
  const removed=[];
  for(const k in state.inventory){
    const [id]=k.split('@');
    if(!ALL_ITEMS[id] && !id.startsWith('named_')){
      removed.push({id,cnt:state.inventory[k]});
      delete state.inventory[k];
    }
  }
  return removed;
}
function _cleanupAmmoRarity(){
  const toRemove = [];
  const toAdd = {};
  for(const k in state.inventory){
    const p = k.split('@');
    if(p.length !== 2) continue;
    const id = p[0], rar = p[1];
    const d = AMMO[id];
    if(!d) continue;
    if(rar !== d.rarity){
      toRemove.push(k);
      const newKey = id + '@' + d.rarity;
      toAdd[newKey] = (toAdd[newKey] || 0) + state.inventory[k];
    }
  }
  for(const k of toRemove) delete state.inventory[k];
  for(const k in toAdd) state.inventory[k] = (state.inventory[k] || 0) + toAdd[k];
}
function consolidateInventoryDuplicates(){
  const _keep={};
  for(const k in state.inventory){
    const [id,rar]=k.split('@');
    if(!id||id.startsWith('named_')) continue;
    const cat=itemCat(id);
    if(cat!=='weapon'&&cat!=='armor') continue;
    const m=RARITY_MULT[rar]||1;
    if(!_keep[id]||m>_keep[id].m){_keep[id]={m,k};}
  }
  const _toSalvage=[];
  for(const k in state.inventory){
    const [id,rar]=k.split('@');
    if(!id||id.startsWith('named_')) continue;
    if(!_keep[id]) continue;
    if(k===_keep[id].k) continue;
    _toSalvage.push({id,rar,cnt:state.inventory[k],k});
  }
  for(const s of _toSalvage){
    delete state.inventory[s.k];
    salvageToMaterials(s.id,s.rar,s.cnt);
  }
  return _toSalvage;
}
function invAdd(id,rarity,count){
  if(count<=0)return;
  if(typeof SEEDS !== 'undefined' && SEEDS[id]){ gardenStorageAdd(id, rarity, count); return; }
  if(!ALL_ITEMS[id] && !id.startsWith('named_')){
    console.warn('[invAdd] 非法物品ID：', id, 'rarity:', rarity);
    return;
  }
  const cat=itemCat(id);
  /* rev121: 已有該 baseId 的具名武器 → 原版傳奇直接分解，不入庫 */
  if(cat === 'weapon' && id.indexOf('named_') !== 0 && rarity === '傳奇'){
    const _namedPrefix = 'named_' + id + '_';
    let _hasNamed = false;
    for(const _k in state.inventory){
      const _iid = _k.split('@')[0];
      if(_iid.indexOf(_namedPrefix) === 0){ _hasNamed = true; break; }
    }
    if(!_hasNamed){
      for(const _s in state.player.equipped){
        const _eid = state.player.equipped[_s];
        if(_eid && _eid.indexOf(_namedPrefix) === 0){ _hasNamed = true; break; }
      }
    }
    if(_hasNamed){
      salvageToMaterials(id, rarity, count);
      return;
    }
  }
  if(cat==='weapon'||cat==='armor'){
    const newMult=RARITY_MULT[rarity]||1;
    let maxInvMult=0,maxInvKey=null;
    for(const k in state.inventory){const [iid,irar]=k.split('@');if(iid!==id)continue;const m=RARITY_MULT[irar]||1;if(m>maxInvMult){maxInvMult=m;maxInvKey=k;}}
    let maxEqMult=0,maxEqSlot=null;
    for(const s in state.player.equipped){if(state.player.equipped[s]===id){const eRar=state.player.equippedRarity[s]||'一般';const m=RARITY_MULT[eRar]||1;if(m>maxEqMult){maxEqMult=m;maxEqSlot=s;}}}
    const maxExisting=Math.max(maxInvMult,maxEqMult);
    if(maxExisting>0){
      if(newMult<=maxExisting){salvageToMaterials(id,rarity,count);return;}
      else{
        const _toDel=[];
        for(const k in state.inventory){
          const [iid,irar]=k.split('@');
          if(iid!==id) continue;
          const m=RARITY_MULT[irar]||1;
          if(m<newMult) _toDel.push({k,rar:irar,cnt:state.inventory[k]});
        }
        for(const r of _toDel){delete state.inventory[r.k];salvageToMaterials(id,r.rar,r.cnt);}
        if(maxEqSlot){state.pendingSalvageEquipped=state.pendingSalvageEquipped||{};state.pendingSalvageEquipped[maxEqSlot]=true;}
      }
    }
  }
  invAddRaw(id,rarity,count);
}
function materialEquivalent(id){let eq=0;for(const k in state.inventory){const [iid,irar]=k.split('@');if(iid!==id)continue;eq+=state.inventory[k]*(RARITY_MULT[irar]||1);}return Math.round(eq);}
function consumeMaterial(id,amount){
  const order=['破舊','一般','庫存','精品','傳奇'];
  let remaining=amount;
  for(const rar of order){
    if(remaining<=0)break;
    const k=invKey(id,rar);const have=state.inventory[k]||0;if(have<=0)continue;
    const mult=RARITY_MULT[rar];const needThisRar=Math.ceil(remaining/mult);
    const useThisRar=Math.min(have,needThisRar);
    if(useThisRar>0){state.inventory[k]-=useThisRar;if(state.inventory[k]<=0)delete state.inventory[k];remaining-=useThisRar*mult;}
  }
  return remaining<=0.01;
}

function equipThrowable(id,rarity){const k=invKey(id,rarity);const total=state.inventory[k]||0;delete state.inventory[k];state.player.throwableStock=total;state.player.equipped.throwable=id;state.player.equippedRarity.throwable=rarity;if(typeof _refreshThrowableSlot==='function')_refreshThrowableSlot();}
function unequipThrowable(){const id=state.player.equipped.throwable;if(!id)return;const rarity=state.player.equippedRarity.throwable||'一般';const cnt=state.player.throwableStock||0;if(cnt>0)invAddRaw(id,rarity,cnt);state.player.throwableStock=0;state.player.equipped.throwable=null;delete state.player.equippedRarity.throwable;if(typeof _refreshThrowableSlot==='function')_refreshThrowableSlot();}
function getThrowableCount(){return parseInt(state.player.throwableStock||0,10);}
function ensureThrowableFromBackpack(context){
  if(getThrowableCount()>0)return true;
  const _ctx = context || 'combat';
  /* rev540: ammoOrder（彈藥準備頁）只作用於 Boss 戰；探索只用偏好 */
  const t = (_ctx === 'combat')
    ? pickThrowableByPreferenceOrOrder(_ctx)
    : pickThrowableByPreference(_ctx);
  if(!t) return false;
  const total = invCount(t.id, t.rarity);
  if(total <= 0) return false;
  delete state.inventory[invKey(t.id, t.rarity)];
  state.player.equipped.throwable=t.id;
  state.player.equippedRarity.throwable=t.rarity;
  state.player.throwableStock=total;
  if(typeof _refreshThrowableSlot==='function')_refreshThrowableSlot();
  return true;
}

function getActiveRegions(){const l=state.preferences.regions.filter(r=>REGIONS[r]&&(!REGIONS[r].needUnlock||state.unlockedRegions.includes(r)));if(l.length)return l;for(const k in REGIONS){if(!REGIONS[k].needUnlock||state.unlockedRegions.includes(k))return[k];}return['廢棄工廠'];}
function getCurrentNode(region){
  const routes=ROUTES[region];if(!routes||!routes.length)return{path:'',node:'未知',pathIdx:0,nodeIdx:0};
  let prog=state.regionProgress[region];
  if(!prog||prog.pathIdx==null||prog.pathIdx<0||prog.pathIdx>=routes.length){prog={pathIdx:rndInt(0,routes.length-1),nodeIdx:0};state.regionProgress[region]=prog;}
  const path=routes[prog.pathIdx];
  if(prog.nodeIdx>=path.nodes.length){prog.pathIdx=rndInt(0,routes.length-1);prog.nodeIdx=0;}
  return{path:path.name,node:path.nodes[prog.nodeIdx],pathIdx:prog.pathIdx,nodeIdx:prog.nodeIdx};
}
function advanceNode(region){
  const routes=ROUTES[region];if(!routes)return false;
  let prog=state.regionProgress[region];if(!prog)return false;
  prog.nodeIdx++;
  const path=routes[prog.pathIdx];
  if(prog.nodeIdx>=path.nodes.length){prog.pathIdx=rndInt(0,routes.length-1);prog.nodeIdx=0;return true;}
  return false;
}
function getCurrentBg(){
  const region=state.activeRegion;if(!region)return '';
  const prog=state.regionProgress[region];if(!prog)return '';
  const key=REGION_KEYS[region.replace(/II$/,'')];if(!key)return '';
  const routes=ROUTES[region];
  const pathIdx=clamp(prog.pathIdx||0,0,(routes?routes.length:1)-1);
  const nodeIdx=clamp(prog.nodeIdx||0,0,(routes&&routes[pathIdx]?routes[pathIdx].nodes.length:1)-1);
  return `images/bg/${key}_r${pathIdx}_n${nodeIdx}.png${assetSuffix()}`;
}
const _bgPreloadCache = new Set();
function _crossfadeExploreBg(newUrl){
  const z1 = document.getElementById('zone1');
  if(!z1) return;
  const oldScroll = z1.querySelector('.bg-scroll');
  if(!oldScroll){
    const layers = document.querySelectorAll('#zone1 .bg-layer');
    layers.forEach(function(l){ l.style.backgroundImage = newUrl; });
    return;
  }
  /* 若已在过渡中 → 直接换旧层图片，跳过叠加，避免叠加 n 层 */
  if(z1.querySelector('.bg-scroll.xfade-active')){
    oldScroll.querySelectorAll('.bg-layer').forEach(function(l){ l.style.backgroundImage = newUrl; });
    return;
  }
  /* 记录旧 track 的当前动画时间，用于同步新 track 相位 */
  let elapsedMs = 0;
  const oldTrack = oldScroll.querySelector('.bg-track');
  if(oldTrack && typeof oldTrack.getAnimations === 'function'){
    try {
      const anims = oldTrack.getAnimations();
      if(anims && anims.length && typeof anims[0].currentTime === 'number'){
        elapsedMs = anims[0].currentTime;
      }
    } catch(e){ /* 忽略 */ }
  }
  /* 克隆 bg-scroll 作为上层新图层 */
  const newScroll = oldScroll.cloneNode(true);
  newScroll.classList.add('xfade-active');
  newScroll.style.position = 'absolute';
  newScroll.style.inset = '0';
  newScroll.style.opacity = '0';
  newScroll.style.transition = 'opacity 600ms ease-in-out';
  newScroll.style.willChange = 'opacity';
  newScroll.style.zIndex = '1';
  oldScroll.style.position = 'absolute';
  oldScroll.style.inset = '0';
  oldScroll.style.zIndex = '0';
  /* 新 track：animation-delay 用负值把动画快进到旧层当前相位 */
  const newTrack = newScroll.querySelector('.bg-track');
  if(newTrack && elapsedMs > 0){
    newTrack.style.animationDelay = '-' + elapsedMs + 'ms';
  }
  /* 新图写进新图层的 .bg-layer */
  newScroll.querySelectorAll('.bg-layer').forEach(function(l){
    l.style.backgroundImage = newUrl;
  });
  z1.appendChild(newScroll);
  /* 下一帧开始淡入 */
  requestAnimationFrame(function(){
    newScroll.style.opacity = '1';
  });
  /* 600ms 后：写回旧层 → 移除临时层 → 恢复旧层默认样式 */
  setTimeout(function(){
    oldScroll.querySelectorAll('.bg-layer').forEach(function(l){
      l.style.backgroundImage = newUrl;
    });
    newScroll.remove();
    oldScroll.style.position = '';
    oldScroll.style.inset = '';
    oldScroll.style.zIndex = '';
  }, 640);
}

function preloadExploreBackgrounds(){
  let queued = 0;
  for(const region in REGIONS){
    const key = REGION_KEYS[region.replace(/II$/,'')];
    if(!key) continue;
    const routes = ROUTES[region];
    if(!routes) continue;
    for(let r = 0; r < routes.length; r++){
      const route = routes[r];
      if(!route || !route.nodes) continue;
      for(let n = 0; n < route.nodes.length; n++){
        const url = 'images/bg/' + key + '_r' + r + '_n' + n + '.png' + assetSuffix();
        if(_bgPreloadCache.has(url)) continue;
        _bgPreloadCache.add(url);
        const img = new Image();
        img.src = url;
        queued++;
      }
    }
  }
  return queued;
}
function updateExploreBg(){
  const layers=document.querySelectorAll('#zone1 .bg-layer');
  if(!layers.length)return;
  const bg=getCurrentBg();
  if(bg){
    const fadeEl=document.getElementById('explore-bg-fade');
    const newUrl="url('" + bg + "')";
    const curRaw=(layers[0].style.backgroundImage||'').replace(/["']/g,'"');
    const newNorm=newUrl.replace(/["']/g,'"');
    if(curRaw!==newNorm){
      /* rev526: 交叉淡入淡出（600ms，无黑屏） */
      _crossfadeExploreBg(newUrl);
    }
  }
  const t=$('#zone1 .zone-title');
  if(t){const region=state.activeRegion||'';const cur=region?getCurrentNode(region):null;if(cur){const _dr=region.replace(/II$/,' II');t.innerHTML=`🧭 ${_dr} · ${cur.node}`;}}
}

function genEnemies(region,count){const r=REGIONS[region];const arr=[];const mult=r.enemyHpMult||1;for(let i=0;i<count;i++){const eid=pick(r.enemies);const e=ENEMIES[eid];const hp=Math.round(e.hp*mult);arr.push({id:eid,name:e.name,hp:hp,maxHp:hp,armor:0,maxArmor:0});}return arr;}
function spawnCount(region){const R=region?REGIONS[region]:null;if(!R||!R.spawnWeights){const r=Math.random();if(r<0.4)return 1;if(r<0.75)return 2;if(r<0.92)return 3;return 5;}const w=R.spawnWeights;const total=Object.values(w).reduce((a,b)=>a+b,0);let x=Math.random()*total;for(const n in w){x-=w[n];if(x<=0)return parseInt(n,10);}return 1;}

function chooseCombatWeaponVerbose(context,enemyCount){
  const trace=[];
  if(context==='explore'&&enemyCount>=2){
    /* rev539: 裝備槽優先（手動或自動補充的下一次批次） */
    if(getThrowableCount() > 0){
      const _w = equippedWeapon('throwable');
      if(_w){
        const _ex = (state.preferences.throwableExplore || {}).exclude || [];
        if(_ex.indexOf(_w.rarity) === -1){
          trace.push('throwable(多敵·裝備槽):'+_w.def.name+'×'+getThrowableCount()+'✓');
          return {slot:'throwable',weapon:_w,ammo:null,fromSlot:true,trace};
        }
        trace.push('throwable:多敵·裝備槽稀有度被探索排除');
      }
    }
    /* rev540: 探索不讀 ammoOrder，只用 throwableExplore 偏好 */
    const _t=pickThrowableByPreference('explore');
    if(_t){
      const _td=WEAPONS[_t.id];
      trace.push('throwable(多敵·背包):'+_td.name+'×'+_t.count+'✓');
      return {slot:'throwable',weapon:{id:_t.id,rarity:_t.rarity,def:_td,slot:'throwable'},ammo:null,fromBag:true,trace};
    }
    trace.push('throwable:多敵但無手雷');
  }
  const order=['primary','secondary','melee','throwable'];
  for(const slot of order){
    /* ★ 探索模式：投擲槽改為從背包按探索偏好挑選，不碰裝備槽；
       這樣玩家留給 Boss 戰的高稀有度手雷永遠不會在探索中被消耗。 */
    if(slot === 'throwable' && context === 'explore'){
      /* rev537: 优先使用装备槽投掷物（手动或自动补充的下一次批次） */
      if(getThrowableCount() > 0){
        const _w = equippedWeapon('throwable');
        if(_w){
          const _ex = (state.preferences.throwableExplore || {}).exclude || [];
          if(_ex.indexOf(_w.rarity) === -1){
            trace.push(`throwable(装备槽):${_w.def.name}×${getThrowableCount()}✓`);
            return {
              slot:'throwable',
              weapon:_w,
              ammo:null,
              fromSlot:true,
              trace
            };
          }
          trace.push('throwable:装备槽稀有度被探索偏好排除，回退背包');
        }
      }
      /* 装备槽空或稀有度被排除 → 从背包按偏好取 */
      const t = pickThrowableByPreference('explore');
      if(t){
        const tdef = WEAPONS[t.id];
        trace.push(`throwable(背包):${tdef.name}×${t.count}✓`);
        return {
          slot:'throwable',
          weapon:{id:t.id, rarity:t.rarity, def:tdef, slot:'throwable'},
          ammo:null,
          fromBag:true,
          trace
        };
      }
      trace.push('throwable:背包無可用手雷');
      continue;
    }
    const w=equippedWeapon(slot);if(!w){trace.push(`${slot}:未裝備`);continue;}
    const def=itemDef(w.id);if(!def){trace.push(`${slot}:非武器`);continue;}
    if(def.cal){const ammo=pickAmmoByPreferenceOrOrder(def.cal,context);if(ammo){trace.push(`${slot}:${def.name}✓`);return{slot,weapon:w,ammo,trace};}else{trace.push(`${slot}:${def.name}無彈`);continue;}}
    if(slot==='throwable'){if(getThrowableCount()<=0){if(ensureThrowableFromBackpack()){const w2=equippedWeapon('throwable');trace.push(`${slot}:${w2.def.name}×${getThrowableCount()}✓`);return{slot,weapon:w2,ammo:null,trace};}trace.push(`${slot}:${def.name}耗盡`);continue;}trace.push(`${slot}:${def.name}×${getThrowableCount()}✓`);return{slot,weapon:w,ammo:null,trace};}
    trace.push(`${slot}:${def.name}✓`);return{slot,weapon:w,ammo:null,trace};
  }
  return{slot:null,weapon:null,ammo:null,trace};
}
function chooseCombatWeapon(context){const r=chooseCombatWeaponVerbose(context);if(r.slot)return{slot:r.slot,weapon:r.weapon,ammo:r.ammo};return null;}
function isSemiAutoOnly(def){if(!def.modes)return false;return def.modes.length===1&&def.modes[0]==='點射';}
function chooseFireMode(weapon,ec,ac){
  const def=weapon.def;if(!def.modes)return '點射';const m=def.modes;
  if(!def.cal)return m[0];
  if(!m.includes('掃射')){if(ec<=1&&m.includes('點射'))return '點射';if(m.includes('短點射'))return '短點射';return m[0];}
  const mag=def.mag||30;
  if(ec>=4&&ac>=mag&&m.includes('掃射'))return '掃射';
  if(ec>=3&&ac>=15&&m.includes('長點射'))return '長點射';
  if(ec>=2&&ac>=9&&m.includes('短點射'))return '短點射';
  return m.includes('點射')?m[0]:m[0];
}
function modeBulletsPerTarget(mode){return{'點射':1,'短點射':3,'長點射':7,'掃射':99,'近戰':1,'投擲':1}[mode]||1;}
function fmtItemSpan(id,r,c){const d=itemDef(id);const nm=d?d.name:id;return `<span class="${rarityClass(r)} itm" data-iid="${id}" data-irar="${r}">${nm}*${c}</span>`;}
function fmtEnemies(enemies){const map={};for(const e of enemies){const k=e.id;if(!map[k])map[k]={...e,count:0};map[k].count++;}return Object.values(map).map(g=>`${g.name}*${g.count}(HP:${g.maxHp}*${g.count})`).join('、');}
function _refreshThrowableSlot(){
  if(currentTab !== 'explore') return;
  const z2 = document.getElementById('zone2');
  if(!z2) return;
  const slot = z2.querySelector('.slot[data-slot="throwable"]');
  if(!slot) return;
  /* rev536: 库存耗尽自动清空装备槽 */
  if(state.player.equipped.throwable && getThrowableCount() <= 0){
    state.player.equipped.throwable = null;
    delete state.player.equippedRarity.throwable;
    state.player.throwableStock = 0;
  }
  const id = state.player.equipped.throwable;
  const def = id ? itemDef(id) : null;
  if(def){
    slot.classList.remove('empty');
    slot.classList.add('filled');
    slot.style.background = rarityBg(state.player.equippedRarity.throwable || '一般');
    slot.innerHTML = '<img class="slot-img" src="icons/items/' + resolveIconId(id) + '.png' + assetSuffix() + '" alt=""><div class="lbl">投擲</div>';
  } else {
    slot.classList.remove('filled');
    slot.classList.add('empty');
    slot.style.background = '';
    slot.innerHTML = '<div class="nm">投擲</div>';
  }
}

/* rev536: 每 1 秒保险刷新投掷物栏（仅 explore tab，且非战斗），涵盖所有遗漏路径 */
if(typeof window !== 'undefined' && !window._throwableSlotTimer){
  window._throwableSlotTimer = setInterval(function(){
    if(typeof currentTab !== 'undefined' && currentTab === 'explore'){
      try{ _refreshThrowableSlot(); }catch(e){}
    }
  }, 1000);
}

function applyDropBonus(count){const sl=getBuildingLv('storage');return Math.max(1,Math.round(count*(1+sl*0.02)));}

function autoCombat(region,node,enemies){
  try{
    const choice=chooseCombatWeaponVerbose('explore',enemies.length);
    const totalEnemyHp=enemies.reduce((s,e)=>s+e.hp,0);
    if(!choice.slot){pushLog(`<span class="pl">玩家</span> 在探索 <b>${region}·${node}</b> 時 遭遇了 ${fmtEnemies(enemies)}，<span class="lose">手無寸鐵，只能逃跑。</span>`,[],'explore');return{victory:false,loot:[]};}
    const {slot,weapon,ammo}=choice;const def=weapon.def;
    const isMeleeWeapon = def.slot === 'melee';
    if(!_offlineMode) {
      _showExploreEnemyGraphics(enemies);
      setTimeout(() => playExploreCombatFx(slot, isMeleeWeapon), 800);
    }
    addProf(slot,0.1);if(def.type)addProf(def.type,0.1);
    const ec=enemies.length;let bulletsUsed=0,hits=0,dmgDealt=0,crits=0;
    let mode='點射',rounds=1;
    let remaining=enemies.map(e=>({...e}));
    const critRate=calcCritRate(weapon.rarity,ammo?ammo.rarity:'一般');
    const critMult=calcCritMult(weapon.rarity,ammo?ammo.rarity:'一般');
    const scopeBonus=def.scopeBonus||0;

    if(def.cal&&isSemiAutoOnly(def)){
      mode='點射';
      const hitRate=getHitRate(def.type,'點射',scopeBonus);
      const _pl=Math.floor(state.proficiency[def.type]||0);
      const _pe=clamp(_pl/MAX_PROF_LEVEL,0,1);
      const _pd=0.6+_pe*0.9;
      const baseDmg=Math.round(ammo.def.dmg*(RARITY_MULT[ammo.rarity]||1)*_pd);
      const magCap=def.mag||1;const maxBullets=Math.min(magCap,ammo.count);
      const hitP=Math.max(0.01,hitRate/100);
      /* v60-expHits-sum: 累加每隻敵人的命中次數 */
      let expHits=0;
      for(const _e of enemies){ expHits += Math.ceil(_e.hp/Math.max(1,baseDmg)); }
      const expBullets=Math.ceil(expHits/hitP);
      const profErr=(1-_pe)*0.8;
      const jitter=1+(Math.random()*2-1)*profErr;
      const planned=Math.max(1,Math.ceil(expBullets*jitter));
      const bulletsToFire=Math.min(planned,maxBullets);
      for(let i=0;i<bulletsToFire;i++){const alive=remaining.filter(e=>e.hp>0);if(!alive.length)break;const target=pick(alive);bulletsUsed++;if(Math.random()*100<hitRate){let d=baseDmg+rndInt(-3,3);if(Math.random()<critRate){d=Math.round(d*critMult);crits++;}target.hp=Math.max(0,target.hp-Math.max(1,d));hits++;dmgDealt+=Math.max(1,d);}}
      rounds=1;
      if(bulletsUsed>0)invRemove(ammo.id,ammo.rarity,bulletsUsed);
    } else if(def.cal){
      /* v59: 傷害期望發數 + 迭代匹配模式 + jitter */
      const _pl2 = Math.floor(state.proficiency[def.type] || 0);
      const _pe2 = clamp(_pl2 / MAX_PROF_LEVEL, 0, 1);
      const _pd2 = 0.6 + _pe2 * 0.9;
      const baseDmg = Math.round(ammo.def.dmg * (RARITY_MULT[ammo.rarity]||1) * _pd2);
      /* v60-expHits-sum: 累加每隻敵人的命中次數 */
      let expHits = 0;
      for(const _e of enemies){ expHits += Math.ceil(_e.hp / Math.max(1, baseDmg)); }
      let _mode = '點射';
      let _expB = 0;
      for(let _it = 0; _it < 5; _it++){
        const _hr = getHitRate(def.type, _mode, scopeBonus) / 100;
        const _newExp = Math.max(1, Math.ceil(expHits / Math.max(0.01, _hr)));
        let _newMode;
        if(_newExp === ec) _newMode = '點射';
        else if(_newExp % 3 === 0) _newMode = '短點射';
        else if(_newExp % 7 === 0) _newMode = '長點射';
        else _newMode = '掃射';
        if(_newMode === _mode){ _expB = _newExp; break; }
        _mode = _newMode; _expB = _newExp;
      }
      const _profErr2 = (1 - _pe2) * 0.8;
      const _jitter2 = 1 + (Math.random()*2 - 1) * _profErr2;
      bulletsUsed = Math.max(1, Math.round(_expB * _jitter2));
      bulletsUsed = Math.min(bulletsUsed, ammo.count);
      mode = _mode;
      const hitRate = getHitRate(def.type, mode, scopeBonus);
      if(bulletsUsed > 0) invRemove(ammo.id, ammo.rarity, bulletsUsed);
      const pellets = ammo.def.pellets || 1;
      let bi = bulletsUsed;
      while(bi > 0 && remaining.some(e => e.hp > 0)){
        const alive = remaining.filter(e => e.hp > 0);
        if(!alive.length) break;
        const target = pick(alive);
        bi--;
        for(let p = 0; p < pellets; p++){
          if(Math.random()*100 < hitRate){
            let d = baseDmg + rndInt(-3,3);
            if(Math.random() < critRate){ d = Math.round(d*critMult); crits++; }
            target.hp -= Math.max(1, d);
            hits++; dmgDealt += Math.max(1, d);
          }
        }
        if(remaining.every(e => e.hp <= 0)) break;
      }
    } else if(def.explosive){
      /* ★ 投擲物：探索模式一律從背包消耗，裝備槽保留給 Boss 戰 */
      mode=def.modes?def.modes[0]:'投擲';
      if(choice.fromBag){
        if(!invRemove(weapon.id, weapon.rarity, 1)){
          pushLog(`<span class="pl">玩家</span> 在探索 <b>${region}·${node}</b> 遭遇敵人，但投擲物不足。`,[],'explore');
          return {victory:false,loot:[]};
        }
      } else if(choice.fromSlot){
        /* rev537: 装备槽消耗 */
        if(getThrowableCount()<=0 && !ensureThrowableFromBackpack('explore')){
          pushLog(`<span class="pl">玩家</span> 在探索 <b>${region}·${node}</b> 遭遇敵人，但投擲物不足。`,[],'explore');
          return {victory:false,loot:[]};
        }
        state.player.throwableStock--;
        if(state.player.throwableStock <= 0){
          if(typeof ensureThrowableFromBackpack === 'function') ensureThrowableFromBackpack('explore');
        }
        if(typeof _refreshThrowableSlot==='function')_refreshThrowableSlot();
      } else {
        /* 兜底：从背包消耗 */
        if(!invRemove(weapon.id, weapon.rarity, 1)){
          pushLog(`<span class="pl">玩家</span> 在探索 <b>${region}·${node}</b> 遭遇敵人，但投擲物不足。`,[],'explore');
          return {victory:false,loot:[]};
        }
      }
      bulletsUsed=1;
      const hitRate=getHitRate(def.type,mode)+10;
      const _pdT=0.6+clamp(Math.floor(state.proficiency[def.type]||0)/MAX_PROF_LEVEL,0,1)*0.9;
      /* rev531: 破片机制 —— 每片独立 roll 命中/暴击，随机分给活目标 */
      const _frags=def.fragments||1;
      const _fragDmg=def.fragmentDamage||def.dmg||0;
      const _aliveN=remaining.filter(function(e){return e.hp>0;}).length;
      let _effFrags;
      if(def.allFragmentsOnSingle){ _effFrags=_frags; }
      else { _effFrags=Math.round(_frags*Math.min(1,_aliveN/4)); }
      const _pieceBaseDmg=_fragDmg*(RARITY_MULT[weapon.rarity]||1)*_pdT;
      for(let _fi=0;_fi<_effFrags;_fi++){
        const _alive=remaining.filter(function(e){return e.hp>0;});
        if(!_alive.length) break;
        if(Math.random()*100<hitRate){
          let d=_pieceBaseDmg+rndInt(-2,2);
          if(Math.random()<critRate){d=Math.round(d*critMult);crits++;}
          d=Math.max(1,Math.round(d));
          const _t=pick(_alive);
          _t.hp-=d;
          hits++;dmgDealt+=d;
        }
      }
    } else {
      /* 近戰（唯一非槍械非投擲的近戰路徑） */
      mode=def.modes?def.modes[0]:'近戰';
      const hitRate=getHitRate(def.type,mode)+10;
      const _pdM=0.6+clamp(Math.floor(state.proficiency[def.type]||0)/MAX_PROF_LEVEL,0,1)*0.9;
      const baseDmg=Math.round((def.dmg||0)*(RARITY_MULT[weapon.rarity]||1)*_pdM);
      const attackTimes=getMeleeHits(def.rpm);
      bulletsUsed=attackTimes;
      const alive=remaining.filter(e=>e.hp>0);
      if(alive.length){
        const target=pick(alive);
        for(let i=0;i<attackTimes;i++){
          if(Math.random()*100<hitRate){
            let d=baseDmg+rndInt(-3,3);
            if(Math.random()<critRate){d=Math.round(d*critMult);crits++;}
            target.hp-=Math.max(1,d);
            dmgDealt+=Math.max(1,d);
            hits++;
          }
        }
      }
    }
    const reallyVictory=remaining.every(e=>e.hp<=0)&&hits>0;
    if(!_offlineMode) {
      const _survivors = remaining.filter(e => e.hp > 0);
      _resolveExploreEnemyGraphics(reallyVictory, _survivors);
    }
    const ammoTxt=def.cal?`消耗 ${ammo.def.name}子彈${bulletsUsed}發`:(def.explosive?`投出 ${def.name}×1`:'');
    const isMelee=def.slot==='melee';
    const meleeHits=isMelee?getMeleeHits(def.rpm):0;
    const _remHp=remaining.reduce((s,e)=>s+Math.max(0,e.hp),0);const _effDmg=Math.max(0,totalEnemyHp-_remHp);const hitTxt=def.cal?`(命中:${hits}/${bulletsUsed}，暴擊:${crits}，傷害:${_effDmg}/${totalEnemyHp})`:(isMelee?`(近戰 ${meleeHits} 次，命中:${hits}，暴擊:${crits}，傷害:${_effDmg}/${totalEnemyHp})`:`(命中:${hits}，暴擊:${crits}，傷害:${_effDmg}/${totalEnemyHp})`);
    /* v59-mode-display: 短點射/長點射加輪數 */
    let modeDisplay = mode;
    if(def.cal && !isSemiAutoOnly(def) && (mode === '短點射' || mode === '長點射')){
      const _rd = mode === '短點射' ? 3 : 7;
      const _r = Math.max(1, Math.round(bulletsUsed / _rd));
      if(_r > 1) modeDisplay = mode + ' ×' + _r;
    }
    if(def.cal && isSemiAutoOnly(def) && rounds > 1) modeDisplay = rounds + '輪點射';
    let resultTxt='',loot=[];
    let _aftermathTxt='';
    if(reallyVictory){
      resultTxt=`<span class="win">勝利</span>`;state.stats.kills+=enemies.length;
      const dropN=rndInt(1,2);
      for(let i=0;i<dropN;i++){const drop=rollRegionDrop(region);if(!drop)continue;const lid=drop.id,rar=drop.rarity;let cnt=(itemCat(lid)==='ammo')?rndInt(3,8):(itemCat(lid)==='material'?rndInt(1,4):1);cnt=applyDropBonus(cnt);invAdd(lid,rar,cnt);loot.push({id:lid,rarity:rar,count:cnt});}
      addExp(enemies.length*3);
      if(Math.random() < 0.03){ const _srv = grantRandomServant(); if(_srv){ const _sdef = SERVANT_TYPES[_srv.type]; pushLog('<span class="pl">玩家</span> 獲得僕人：<b class="r-' + _srv.rarity + '">' + _sdef.name + '</b>（' + _srv.rarity + '）。',[],'explore'); } }
      if(REGIONS[region].seal&&Math.random()<REGIONS[region].sealRate){state.seals[REGIONS[region].seal]=parseInt(state.seals[REGIONS[region].seal]||0,10)+1;pushLog(`<span class="pl">玩家</span> 在探索 <b>${region}·${node}</b> 時 撿到了 <b>Boss 信物</b>！`,[],'explore');}
    } else {
      resultTxt=`<span class="run">逃跑</span>`;
      if(Math.random()<0.5){const lid=pick(REGIONS[region].loot);const ldef=itemDef(lid);if(ldef){const rar=hasVariableRarity(lid)?rollRarity():ldef.rarity;let cnt=(itemCat(lid)==='ammo')?rndInt(3,8):1;cnt=applyDropBonus(cnt);invAdd(lid,rar,cnt);loot.push({id:lid,rarity:rar,count:cnt});}}
      addExp(1);
    }
    /* ★ 探索模式：敵人反擊 */
    if(!reallyVictory){
      const survivors = remaining.filter(e => e.hp > 0);
      if(survivors.length > 0){
        let totalHpLost = 0, totalArmorLost = 0;
        for(const e of survivors){
          const eDef = ENEMIES[e.id];
          if(!eDef) continue;
          const eDmg = eDef.dmg || 10;
          const ePen = eDef.pen || 0;
          const target = { hp: state.player.hp, armor: state.player.armor };
          const res = applyDamage(target, eDmg, ePen, state.player.armorLevel || 0);
          state.player.hp = target.hp;
          state.player.armor = target.armor;
          totalHpLost += res.hpLost;
          totalArmorLost += res.armorLost;
        }
        _aftermathTxt = handleExploreAftermath(totalHpLost, totalArmorLost, survivors.length);
      }
    }
    const lootTxt=loot.length?`，${resultTxt}:獲得 ${loot.map(l=>fmtItemSpan(l.id,l.rarity,l.count)).join('、')}`:`，${resultTxt}`;
    /* v54-merge-aftermath: 反擊描述放逃跑前 */
    const html=`<span class="pl">玩家</span> 在探索 <b>${region}·${node}</b> 時 遭遇了 ${fmtEnemies(enemies)}，使用 ${def.name} 進行了 ${modeDisplay}，${ammoTxt}${hitTxt}${_aftermathTxt ? '，' + _aftermathTxt : ''}${lootTxt}。`;
    pushLog(html,loot,'explore');
    return{victory:reallyVictory,loot};
  }catch(e){console.error(e);pushLog(`<span class="lose">戰鬥結算異常：${e.message}</span>`,[],'explore');return{victory:false,loot:[]};}
}
function handleExploreAftermath(hpLost, armorLost, enemyCount){
  if(hpLost<=0 && armorLost<=0) return '';
  const txt = '受到 ' + enemyCount + ' 名敵人反擊（HP -' + hpLost + '｜甲 -' + armorLost + '）';
  if(state.player.hp <= 0){
    state.player.hp = 1;
    state.pendingHealFull = true;
    state.exploreDelayUntil = Date.now() + 60000;
    refreshPlayerStats();
    return txt + '，<span class="lose">重傷！</span>需休息 60 秒後以滿血繼續';
  }
  if(state.player.hp >= state.player.maxHp){
    refreshPlayerStats();
    return txt;
  }
  let usedCount = 0, healed = 0;
  while(state.player.hp < state.player.maxHp){
    const item = findNextConsumable();
    if(!item) break;
    const medbayLv = getBuildingLv('medbay');
    const actual = calcConsumableHeal(item, medbayLv);
    const before = state.player.hp;
    state.player.hp = Math.min(state.player.maxHp, state.player.hp + actual);
    healed += state.player.hp - before;
    invRemove(item.id, item.rarity, 1);
    usedCount++;
  }
  state.exploreDelayUntil = Date.now() + 5000;
  refreshPlayerStats();
  if(state.player.hp >= state.player.maxHp){
    return txt + '，使用 ' + usedCount + ' 件消耗品恢復 ' + healed + ' HP（延遲 5 秒）';
  }
  return txt + '，消耗品用罄，休息 5 秒後以 ' + Math.round(state.player.hp) + ' HP 繼續';
}
function searchEvent(region,node){
  const r=REGIONS[region];const roll=Math.random();
  if(roll<0.35){
    const lid=pick(r.loot.filter(id=>WEAPONS[id]||ARMOR[id]));
    if(lid){const ldef=itemDef(lid);const rar=rollRarity();invAdd(lid,rar,1);pushLog(`<span class="pl">玩家</span> 在探索 <b>${region}·${node}</b> 時 開啓了 武器櫃，獲得 ${fmtItemSpan(lid,rar,1)}。`,[{id:lid,rarity:rar,count:1}],'explore');addProf('drop',1);addExp(2);return;}
  }
  if(roll<0.75){
    const pool=r.loot.filter(id=>AMMO[id]||MATERIALS[id]||CONSUMABLES[id]||SEEDS[id]);
    let lid=pick(pool);
    let rar=null;
    if(lid&&AMMO[lid]){const ammoPool=r.loot.filter(id=>AMMO[id]);const selRar=rollAmmoRarity(region);if(selRar){const filtered=ammoPool.filter(id=>AMMO[id].rarity===selRar);if(filtered.length)lid=pick(filtered);}rar=AMMO[lid].rarity;}
    else if(lid&&SEEDS[lid]){rar=rollRarity();}
    else if(lid){const ldef=itemDef(lid);rar=hasVariableRarity(lid)?rollRarity():ldef.rarity;}
    if(lid){let cnt=AMMO[lid]?rndInt(5,15):(MATERIALS[lid]?rndInt(1,5):(SEEDS[lid]?rndInt(1,2):1));cnt=applyDropBonus(cnt);invAdd(lid,rar,cnt);pushLog(`<span class="pl">玩家</span> 在探索 <b>${region}·${node}</b> 時 發現了 補給箱，獲得 ${fmtItemSpan(lid,rar,cnt)}。`,[{id:lid,rarity:rar,count:cnt}],'explore');addProf('drop',1);addExp(1);return;}
  }
  pushLog(`<span class="pl">玩家</span> 在探索 <b>${region}·${node}</b> 時 沒有發現任何東西。`,[],'explore');
}
function doExploreTick(){
  const now = Date.now();
  if(state.exploreDelayUntil && now < state.exploreDelayUntil){
    return;
  }
  if(state.exploreDelayUntil && now >= state.exploreDelayUntil){
    state.exploreDelayUntil = 0;
    if(state.pendingHealFull){
      state.player.hp = state.player.maxHp;
      state.player.armor = state.player.maxArmor;
      state.pendingHealFull = false;
      refreshPlayerStats();
    }
  }
  const regions=getActiveRegions();
  if(!state.activeRegion||!regions.includes(state.activeRegion)){state.activeRegion=pick(regions);}
  const region=state.activeRegion;
  const mode=state.preferences.actionMode;const r=REGIONS[region];
  const cur=getCurrentNode(region);const node=cur.node;
  const cc0=mode==='attack'?r.combat.attack:r.combat.stealth;
  const sb=(state.proficiency.drop||0)*0.001;
  const cc=clamp(cc0-(mode==='stealth'?sb:0),0.05,0.9);
  if(Math.random()<cc){const n=spawnCount(region);const enemies=genEnemies(region,n);autoCombat(region,node,enemies);}
  else searchEvent(region,node);
  const finished=advanceNode(region);
  if(finished){state.activeRegion=pick(regions);}
  updateExploreBg();
  refreshPlayerStats();
}
/* rev112: autoConsumeIfLow 已移除 */
function buildingTick(){
  const now=Date.now();
  const genLv=getBuildingLv('generator');const genMult=1+genLv*0.2;
  const radioLv=getBuildingLv('radio');
  if(radioLv>0){
    const last=state.radioLastTick||0;const interval=5*60*1000/genMult;
    if(now-last>interval){state.radioLastTick=now;const mats=['wood','metal','screws','cloth','gears','electronics'];const m=pick(mats);const cnt=rndInt(3,8)*radioLv;invAdd(m,'一般',cnt);/* rev249: notify removed */}
  }
  const armoryLv=getBuildingLv('armory');
  if(armoryLv>0){
    const last=state.armoryLastTick||0;const interval=3*60*1000/genMult;
    if(now-last>interval){
      state.armoryLastTick=now;
      let targetRarity='一般';
      if(armoryLv<=10)targetRarity='破舊';else if(armoryLv<=20)targetRarity='一般';else if(armoryLv<=35)targetRarity='庫存';else targetRarity='精品';
      const _targetIdx=RARITY_ORDER.indexOf(targetRarity);
      const pw=equippedWeapon('primary'),sw=equippedWeapon('secondary');
      const cals=[];
      if(pw&&pw.def.cal)cals.push(pw.def.cal);
      if(sw&&sw.def.cal&&(!pw||sw.def.cal!==pw.def.cal))cals.push(sw.def.cal);
      if(!cals.length)cals.push('9x19');
      for(const cal of cals){
        const ammos=Object.keys(AMMO).filter(k=>AMMO[k].cal===cal);
        if(!ammos.length)continue;
        const _cands=[];
        let _minDiff=999;
        for(const a of ammos){
          const aIdx=RARITY_ORDER.indexOf(AMMO[a].rarity);
          if(aIdx<0)continue;
          const diff=Math.abs(aIdx-_targetIdx);
          if(diff<_minDiff){_minDiff=diff;_cands.length=0;_cands.push(a);}
          else if(diff===_minDiff){_cands.push(a);}
        }
        if(_cands.length){
          const chosen=_cands[0];
          const cnt=rndInt(5,10)*Math.max(1,Math.ceil(armoryLv/5));          invAdd(chosen,AMMO[chosen].rarity,cnt);
          /* rev249: notify removed */
        }
      }
    }
  }
  processCrafting();
  if(typeof _gardenMealTick === 'function'){ try{ _gardenMealTick(now); }catch(e){} }
  if(typeof _gardenFarmBackgroundTick === 'function'){ try{ _gardenFarmBackgroundTick(now); }catch(e){} }
}
function processCrafting(){
  if(!state.crafting||!state.crafting.length)return;
  const now=Date.now();const genLv=getBuildingLv('generator');const sm=1+genLv*0.2;
  for(let i=state.crafting.length-1;i>=0;i--){
    const c=state.crafting[i];
    if(c.type==='mod'){
      const t=c.time*1000/sm;
      if(now-c.startTime>=t){
        const info=c.modInfo;
        const namedId=getOrCreateNamedItem(info.baseId,info.mag,info.scope);
        if(info.fromEquippedSlot){
          if(!state.player.equipped[info.fromEquippedSlot]){
            state.player.equipped[info.fromEquippedSlot]=namedId;
            state.player.equippedRarity[info.fromEquippedSlot]='具名';
          } else {
            /* v56-safeguard: 槽位已被占用 → 具名武器進背包 */
            invAddRaw(namedId,'具名',1);
            notify('改造完成：'+itemDef(namedId).name+' 已放入背包（槽位已被占用）','warn');
          }
        } else {
          if(info.originalId){
            invRemove(info.originalId, info.originalRarity, 1);
          }
          invAddRaw(namedId,'具名',1);
        }
        
        pushLog(`<span class="pl">玩家</span> 完成改造：<b class="r-具名">${itemDef(namedId).name}</b>。`,[],'explore');
        state.crafting.splice(i,1);addProf('craft',1);refreshPlayerStats();save();
      }
      continue;
    }
  }
}
let _offlineMode = false;
function _offlineSnapshotInv(){
  const snap = {};
  for(const k in state.inventory) snap[k] = state.inventory[k];
  return snap;
}
function _offlineDiffInv(before){
  const diff = {};
  for(const k in state.inventory){
    const prev = before[k] || 0;
    const cur = state.inventory[k];
    if(cur > prev){
      const [id, rarity] = k.split('@');
      diff[k] = { id, rarity, count: cur - prev };
    }
  }
  return diff;
}
/* ★ 離線期間建築產出補算：無線電、軍械庫、改造隊列 ★
   依照離線時長補發多次，避免玩家長時間離線損失產出。
   回傳 { radioCount, armoryCount } 供摘要顯示。 */
function _offlineBuildingSettle(now, baseTime){
  const genLv = getBuildingLv('generator');
  const genMult = 1 + genLv * 0.2;
  let radioCount = 0;
  let armoryCount = 0;

  // ── 無線電：每 5 分鐘（受發電機加速）補一次材料 ──
  const radioLv = getBuildingLv('radio');
  if(radioLv > 0){
    const interval = 5 * 60 * 1000 / genMult;
    const last = Math.max(state.radioLastTick || 0, baseTime);
    const diff = now - last;
    if(diff >= interval){
      const times = Math.floor(diff / interval);
      const mats = ['wood','metal','screws','cloth','gears','electronics'];
      for(let i = 0; i < times; i++){
        const m = pick(mats);
        const cnt = rndInt(3, 8) * radioLv;
        invAdd(m, '一般', cnt);
      }
      radioCount = times;
      state.radioLastTick = last + times * interval;
    }
  }

  // ── 軍械庫：每 3 分鐘（受發電機加速）補一次彈藥 ──
  const armoryLv = getBuildingLv('armory');
  if(armoryLv > 0){
    const interval = 3 * 60 * 1000 / genMult;
    const last = Math.max(state.armoryLastTick || 0, baseTime);
    const diff = now - last;
    if(diff >= interval){
      const times = Math.floor(diff / interval);
      let targetRarity = '一般';
      if(armoryLv<=10)targetRarity='破舊';else if(armoryLv<=20)targetRarity='一般';else if(armoryLv<=35)targetRarity='庫存';else targetRarity='精品';
      const _targetIdx = RARITY_ORDER.indexOf(targetRarity);
      const pw = equippedWeapon('primary'), sw = equippedWeapon('secondary');
      const cals = [];
      if(pw && pw.def.cal) cals.push(pw.def.cal);
      if(sw && sw.def.cal && (!pw || sw.def.cal !== pw.def.cal)) cals.push(sw.def.cal);
      if(!cals.length) cals.push('9x19');
      for(let i = 0; i < times; i++){
        for(const cal of cals){
          const ammos = Object.keys(AMMO).filter(k => AMMO[k].cal === cal);
          if(!ammos.length) continue;
          const _cands = [];
          let _minDiff = 999;
          for(const a of ammos){
            const aIdx = RARITY_ORDER.indexOf(AMMO[a].rarity);
            if(aIdx < 0) continue;
            const d = Math.abs(aIdx - _targetIdx);
            if(d < _minDiff){ _minDiff = d; _cands.length = 0; _cands.push(a); }
            else if(d === _minDiff){ _cands.push(a); }
          }
          if(_cands.length){
            const chosen = _cands[0];
            const cnt = rndInt(5, 10) * Math.max(1, Math.ceil(armoryLv / 5));            invAdd(chosen, AMMO[chosen].rarity, cnt);
          }
        }
      }
      armoryCount = times;
      state.armoryLastTick = last + times * interval;
    }
  }

  // ── 改造隊列：直接用 Date.now() 結算（startTime 是真實時間） ──
  processCrafting();


  return { radioCount, armoryCount };
}
function offlineSettle(){
  const now=Date.now();
  const lastLogTime=state.logs.length?state.logs[state.logs.length-1].t:0;
  const baseTime=Math.max(state.lastSeen||0,lastLogTime);
  const elapsed=now-baseTime;
  if(elapsed<60000){state.lastSeen=now;return 0;}
  const maxMs=8*3600*1000;
  const effMs=Math.min(elapsed,maxMs);
  const hours=effMs/3600000;
  const events=Math.floor(hours*120);
  if(events<=0){state.lastSeen=now;return 0;}
  let wins=0,runs=0;
  const regionPool=getActiveRegions();
  const beforeInv = _offlineSnapshotInv();
  _offlineMode = true;
  let buildingResults = {radioCount:0, armoryCount:0};
  try {
    for(let i=0;i<events;i++){
      /* rev332: 離線結算死亡即時滿血，避免 1 HP 連續戰鬥 */
      if(state.player.hp <= 0 || state.pendingHealFull){
        state.player.hp = state.player.maxHp;
        state.player.armor = state.player.maxArmor;
        state.pendingHealFull = false;
        state.exploreDelayUntil = 0;
      }
      const region=pick(regionPool);const mode=state.preferences.actionMode;const r=REGIONS[region];
      const cc=mode==='attack'?r.combat.attack:r.combat.stealth;
      const cur=getCurrentNode(region);
      if(Math.random()<cc){const n=spawnCount(region);const enemies=genEnemies(region,n);const res=autoCombat(region,cur.node,enemies);if(res.victory)wins++;else runs++;}
      else searchEvent(region,cur.node);
      advanceNode(region);
    }
    /* ★ 新增：離線期間建築產出補算（無線電、軍械庫、改造隊列）★ */
    buildingResults = _offlineBuildingSettle(now, baseTime);
    if(typeof _gardenOfflineSettle === 'function'){
      try{ _gardenOfflineSettle(now, baseTime); }catch(e){ console.warn('[garden offline] err', e); }
    }
  } finally {
    /* rev541: 確保異常時也重置 _offlineMode */
    _offlineMode = false;
  }
  const loot = _offlineDiffInv(beforeInv);
  const lootList = [];
  let totalKinds = 0, totalCount = 0;
  for(const k in loot){
    const it = loot[k];
    lootList.push({ id: it.id, rarity: it.rarity, count: it.count });
    totalKinds++;
    totalCount += it.count;
  }
  lootList.sort((a, b) => {
    const rd = RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity);
    if(rd !== 0) return rd;
    const ad = itemDef(a.id), bd = itemDef(b.id);
    return ((ad && ad.name) || '').localeCompare((bd && bd.name) || '', 'zh-Hant');
  });
  const overtime=elapsed>maxMs;
  let summary=`離線 ${(elapsed/3600000).toFixed(1)} 小時，共 ${events} 次事件（勝利 ${wins}／逃跑 ${runs}），獲得 ${totalKinds} 類 ${totalCount} 件物資。`;
  if(buildingResults.radioCount>0 || buildingResults.armoryCount>0){
    const parts=[];
    if(buildingResults.radioCount>0) parts.push(`無線電×${buildingResults.radioCount}`);
    if(buildingResults.armoryCount>0) parts.push(`軍械庫×${buildingResults.armoryCount}`);
    summary+=` 建築產出：${parts.join('、')}。`;
  }
  if(overtime)summary+=`（超過 8 小時，已進入休息模式）`;
  if(lootList.length)summary+=` 點擊查看 →`;
  state.logs.push({t:now,html:`<b style="color:#4a90d9">[離線摘要]</b> ${summary}`,items:lootList,type:'offline'});
  state.lastSeen=now;
  try{ save(); }catch(e){}
  return events;
}

function renderExplore(){
  const z1=$('#zone1'),z2=$('#zone2'),z3=$('#zone3');
  const regions=getActiveRegions();
  const region=state.activeRegion||regions[0]||'廢棄工廠';
  if(state.activeRegion!==region)state.activeRegion=region;
  const cur=getCurrentNode(region);
  const bg=getCurrentBg();
  const spd=Math.round(EVENT_INTERVAL_MS/1000);
  const _displayRegion=region.replace(/II$/,' II');
  z1.innerHTML=`
    <div class="scene">
      <div class="bg-scroll" style="--spd:${spd}s"><div class="bg-track"><div class="bg-layer" style="background-image:url('${bg}')"></div><div class="bg-layer" style="background-image:url('${bg}')"></div></div></div>
      <div class="bg-fade" id="explore-bg-fade" style="opacity:0"></div><div class="groundline"></div>
      <div class="explore-fx" id="explore-fx"></div>
      <canvas id="hero-canvas" class="hero-canvas"></canvas>
      <div class="zone-title">🧭 ${_displayRegion} · ${cur.node}</div>
      <div class="zone-badge">${state.preferences.actionMode==='attack'?'⚔ 攻擊前進':'🥷 潛行蒐集'}</div>
    </div>`;
  requestAnimationFrame(()=>{ renderExploreHeroCanvas(); });
  renderEquipZone(z2);
  z3.innerHTML=`<div class="z3-head"><div class="z3-title">📜 日誌</div><div class="z3-btn" id="log-history-btn">查看記錄</div></div><div class="logbox" id="logbox"></div>`;
  renderZone3Log();
  $('#log-history-btn').onclick=openLogHistory;
}

/* ===== rev563: 電台次數系統 ===== */
const RADIO_COOLDOWN_MS = 5 * 60 * 1000;
const RADIO_DAY_MS = 24 * 3600 * 1000;

function _radioEnsureInit(){
  const max = (typeof getBuildingLv === 'function') ? getBuildingLv('garage') : 0;
  const today = Math.floor(Date.now() / RADIO_DAY_MS);
  if(typeof state.radioUses !== 'number' || !isFinite(state.radioUses)) state.radioUses = max;
  if(typeof state.radioLastResetDay !== 'number' || !isFinite(state.radioLastResetDay)) state.radioLastResetDay = today;
  if(typeof state.radioCooldownUntil !== 'number' || !isFinite(state.radioCooldownUntil)) state.radioCooldownUntil = 0;
  let _changed = false;
  if(today > state.radioLastResetDay){
    state.radioUses = max;
    state.radioLastResetDay = today;
    _changed = true;
  }
  if(state.radioUses > max){ state.radioUses = max; _changed = true; }
  if(state.radioUses < 0){ state.radioUses = 0; _changed = true; }
  if(_changed && typeof save === 'function') save();
}

function _radioGetStatus(){
  _radioEnsureInit();
  const now = Date.now();
  const cdUntil = state.radioCooldownUntil || 0;
  if(now < cdUntil){
    return { state: 'cooldown', remain: Math.ceil((cdUntil - now) / 1000) };
  }
  if(state.radioUses <= 0){
    return { state: 'empty', uses: 0 };
  }
  return { state: 'ready', uses: state.radioUses };
}

function _radioTryConsume(){
  _radioEnsureInit();
  const st = _radioGetStatus();
  if(st.state !== 'ready') return false;
  state.radioUses -= 1;
  state.radioCooldownUntil = Date.now() + RADIO_COOLDOWN_MS;
  if(typeof save === 'function') save();
  return true;
}

function _radioTriggerBTR(){
  if(typeof window._radioBTRTrigger === 'function'){
    window._radioBTRTrigger();
    return;
  }
  /* Stub：模組 5 实现后覆盖 _radioBTRTrigger */
  notify('BTR 支援演出即將推出');
  state.radioUses += 1;
  state.radioCooldownUntil = 0;
  if(typeof save === 'function') save();
}

function _radioShowConfirm(){
  _radioEnsureInit();
  const st = _radioGetStatus();
  if(st.state === 'cooldown'){
    notify('冷卻中，剩 ' + st.remain + ' 秒');
    return;
  }
  if(st.state === 'empty'){
    notify('今日次數已用盡，每日 00:00 重置');
    return;
  }
  const ft = document.createElement('div');
  ft.className = 'modal-ft';
  ft.innerHTML = '<button class="btn primary" id="rc-ok">確認</button><button class="btn ghost" id="rc-cancel">取消</button>';
  const body = '<div class="detail-title">📻 召喚 BTR 支援</div>'
    + '<div class="detail-sub">消耗 1 次電台次數</div>'
    + '<div class="stat-line"><span class="k">剩餘次數</span><span class="v">' + st.uses + ' → ' + (st.uses - 1) + '</span></div>'
    + '<div class="stat-line"><span class="k">下次重置</span><span class="v">每日 00:00（上限 ' + ((typeof getBuildingLv === 'function') ? getBuildingLv('garage') : 0) + '）</span></div>'
    + '<div style="font-size:10px;color:#7a6f60;margin-top:8px;line-height:1.5">BTR 將從左側駛入，橫衝直撞約 30 秒，期間自動戰鬥並獲得掉落。</div>';
  openModal({ title: '確認', body: body, footer: ft });
  ft.querySelector('#rc-cancel').onclick = closeModal;
  ft.querySelector('#rc-ok').onclick = function(){
    closeModal();
    if(_radioTryConsume()){
      _radioTriggerBTR();
      if(typeof renderEquipZone === 'function'){
        const _z2 = document.getElementById('zone2');
        if(_z2) renderEquipZone(_z2);
      }
    }
  };
}
/* ===== end rev563 ===== */

function renderEquipZone(z2){
  /* rev566d-radiotick */
  if(!window._radioTickTimer){
    window._radioTickTimer = setInterval(function(){
      if(typeof currentTab === 'undefined' || currentTab !== 'explore') return;
      const _rb = document.querySelector('#zone2 .radio-btn');
      if(!_rb) return;
      if(typeof _radioGetStatus !== 'function') return;
      const _st = _radioGetStatus();
      let _txt, _cls;
      if(_st.state === 'cooldown'){ _txt = '📻 ' + _st.remain + 's'; _cls = 'radio-btn cooldown'; }
      else if(_st.state === 'empty'){ _txt = '📻 用盡'; _cls = 'radio-btn empty'; }
      else { _txt = '📻 ' + _st.uses; _cls = 'radio-btn ready'; }
      _rb.textContent = _txt;
      _rb.className = _cls;
      _rb.setAttribute('data-state', _st.state);
    }, 1000);
  }

  const W = z2.clientWidth;
  const H = z2.clientHeight;
  if(!W || !H){
    requestAnimationFrame(() => { renderEquipZone(z2); });
    return;
  }

  const pad = 6;
  const availW = W - pad * 2;
  const availH = H - pad * 2;

  /* rev561c: 格子大小由高度主导；宽度作为上限，避免窄屏溢出 */
  const cellByHeight = Math.floor((availH / 5) * 0.92);
  const cellByWidth  = Math.floor((availW / 3) * 0.98);
  const cellSize = Math.min(cellByHeight, cellByWidth);
  if(cellSize < 20) return;

  /* 剩余空间均分为 gap（水平 4 段、垂直 6 段） */
  const gapX = (W - cellSize * 3) / 4;
  const gapY = (H - cellSize * 5) / 6;

  const colX = [
    gapX,
    gapX + cellSize + gapX,
    gapX + (cellSize + gapX) * 2
  ];
  const rowY = [
    gapY,
    gapY + cellSize + gapY,
    gapY + (cellSize + gapY) * 2,
    gapY + (cellSize + gapY) * 3,
    gapY + (cellSize + gapY) * 4
  ];

  const fontSize = Math.max(7, Math.floor(cellSize * 0.12));

  const slotLayout = {
    head:      { col: 1, row: 0 },
    face:      { col: 1, row: 1 },
    top:       { col: 1, row: 2 },
    pants:     { col: 1, row: 3 },
    shoes:     { col: 1, row: 4 },
    backpack:  { col: 0, row: 2 },
    primary:   { col: 2, row: 0 },
    secondary: { col: 2, row: 1 },
    melee:     { col: 2, row: 2 },
    throwable: { col: 2, row: 3 }
  };

  const labels = {
    head: '頭部', face: '臉部', top: '上衣', pants: '褲子', shoes: '鞋子',
    backpack: '背包', primary: '主武器', secondary: '副武器', melee: '近戰', throwable: '投擲'
  };

  let html = '';
  for(const key in slotLayout){
    const L = slotLayout[key];
    const x = colX[L.col];
    const y = rowY[L.row];
    let id = state.player.equipped[key];
    let def = id ? itemDef(id) : null;
    if(key === 'throwable' && id && getThrowableCount() <= 0){
      state.player.equipped.throwable = null;
      delete state.player.equippedRarity.throwable;
      state.player.throwableStock = 0;
      id = null;
      def = null;
    }
    const isFixed = def && def.fixed;
    let inner = '';
    if(def){
      if(PANTS_SHOES_EMOJI[id]){
        inner = '<span style="font-size:' + Math.floor(cellSize * 0.5) + 'px;line-height:1">' + PANTS_SHOES_EMOJI[id] + '</span><div class="lbl">' + labels[key] + '</div>';
      } else {
        inner = '<img class="slot-img" src="icons/items/' + resolveIconId(id) + '.png' + assetSuffix() + '" alt=""><div class="lbl">' + labels[key] + '</div>';
      }
    } else {
      inner = '<div class="nm">' + labels[key] + '</div>';
    }
    const rar = def ? (state.player.equippedRarity[key] || '一般') : '';
    const bgStyle = def ? 'background:' + rarityBg(rar) + ';' : '';
    const style = 'left:' + x + 'px;top:' + y + 'px;width:' + cellSize + 'px;height:' + cellSize + 'px;font-size:' + fontSize + 'px;' + bgStyle;
    html += '<div class="slot ' + (def ? 'filled' : 'empty') + ' ' + (isFixed ? 'fixed' : '') + '" style="' + style + '" data-slot="' + key + '">' + inner + '</div>';
  }

  const _fmt = (v) => { v = Math.round(v); if(v >= 1e7) return Math.round(v/1e6) + 'M'; if(v >= 1e6) return (v/1e6).toFixed(1) + 'M'; if(v >= 1e4) return Math.round(v/1e3) + 'K'; return v.toString(); };
  const statH = cellSize * 2 + gapY;
  /* rev561d: 生命欄精簡為 3 行、字體與體重框統一 */
  const _statFont = Math.max(9, fontSize);
  html += '<div class="player-stat-panel" style="left:' + colX[0] + 'px;top:' + rowY[0] + 'px;width:' + cellSize + 'px;height:' + statH + 'px;font-size:' + _statFont + 'px;text-align:right">'
    + '<div class="row lv-row"><b class="lv-v">Lv.' + state.player.level + '</b></div>'
    + '<div class="row"><span>❤️</span><b class="hp-v">' + _fmt(state.player.hp) + '</b><b class="hp-m" style="color:#7a6f60">' + _fmt(state.player.maxHp) + '</b></div>'
    + '<div class="row"><span>🛡️</span><b class="ap-v">' + _fmt(state.player.armor) + '</b><b class="ap-m" style="color:#7a6f60">' + _fmt(state.player.maxArmor) + '</b></div>'
    + '</div>';

  const wt = getTotalWeight();
  html += '<div class="weight-display" style="left:' + colX[0] + 'px;top:' + rowY[3] + 'px;width:' + cellSize + 'px;height:' + cellSize + 'px;font-size:' + Math.max(9, fontSize) + 'px">'
    + '<div>⚖️ <b style="color:' + getWeightColor(wt) + '">' + Math.round(wt) + ' kg</b></div>'
    + '<div>🧭 <b>' + Math.round(getExploreInterval()/1000) + 's</b></div>'
    + '</div>';

  /* rev563: 电台按钮（依 tab 分流） */
  if(typeof getBuildingLv === 'function' && getBuildingLv('garage') > 0){
    if(typeof _radioEnsureInit === 'function') _radioEnsureInit();
    if(currentTab === 'combat'){
      const _mode = state.preferences.bossMode || 'challenge';
      const _label = _mode === 'challenge' ? '挑战' : '扫荡';
      html += '<div class="radio-btn" id="radio-btn" data-mode="' + _mode + '" style="left:' + colX[0] + 'px;top:' + rowY[4] + 'px;width:' + cellSize + 'px;height:' + cellSize + 'px;font-size:' + fontSize + 'px">📻 ' + _label + '</div>';
    } else {
      const _st = (typeof _radioGetStatus === 'function') ? _radioGetStatus() : { state: 'empty', uses: 0 };
      let _radioLabel = '';
      let _radioCls = '';
      if(_st.state === 'cooldown'){ _radioLabel = _st.remain + 's'; _radioCls = 'cooldown'; }
      else if(_st.state === 'empty'){ _radioLabel = '用盡'; _radioCls = 'empty'; }
      else { _radioLabel = String(_st.uses); _radioCls = 'ready'; }
      html += '<div class="radio-btn ' + _radioCls + '" id="radio-btn" data-state="' + _st.state + '" style="left:' + colX[0] + 'px;top:' + rowY[4] + 'px;width:' + cellSize + 'px;height:' + cellSize + 'px;font-size:' + fontSize + 'px">📻 ' + _radioLabel + '</div>';
    }
  }

  z2.innerHTML = html;

  $$('.slot', z2).forEach(e => { e.onclick = () => openSlotDetail(e.dataset.slot); });

  const _rb = z2.querySelector('#radio-btn');
  if(_rb){
    _rb.onclick = function(){
      if(currentTab === 'combat'){
        const _cur = state.preferences.bossMode || 'challenge';
        state.preferences.bossMode = _cur === 'challenge' ? 'sweep' : 'challenge';
        save();
        renderCombat();
      } else {
        if(typeof _radioShowConfirm === 'function') _radioShowConfirm();
      }
    };
  }

  if(!window._zone2ResizeBound){
    window._zone2ResizeBound = true;
    let _resizeTimer = null;
    window.addEventListener('resize', function(){
      if(_resizeTimer) clearTimeout(_resizeTimer);
      _resizeTimer = setTimeout(function(){
        const _z2 = document.getElementById('zone2');
        if(_z2 && currentTab === 'explore'){
          renderEquipZone(_z2);
        }
      }, 200);
    });
  }
}

let _inventoryScrollPos = 0;
const modalLayer=$('#modal-layer');
const modalEl=$('.modal',modalLayer);
function openModal({title,body,footer,full,onClose}){
  modalEl.className='modal'+(full?' full':'');modalEl.innerHTML='';
  if(title!==false){
    if(typeof title !== 'string'){
      if(title && title.nodeType === 1) title = title.textContent || '';
      else if(title == null) title = '';
      else title = String(title);
    }
    const hd=el('div','modal-hd');hd.innerHTML=`<div>${title}</div><div class="x">✕</div>`;hd.querySelector('.x').onclick=function(){if(typeof onClose==='function'){try{onClose();}catch(e){console.warn('[onClose]',e);closeModal();}}else{closeModal();}};modalEl.appendChild(hd);
  }
  const bd=el('div','modal-bd-inner');
  if(typeof body==='string')bd.innerHTML=body;else if(body)bd.appendChild(body);
  modalEl.appendChild(bd);
  if(footer){var _hasFt=(typeof footer==='string')?(footer.trim().length>0):((footer.innerHTML||'').trim().length>0);if(_hasFt){const ft=el('div','modal-ft');if(typeof footer==='string')ft.innerHTML=footer;else ft.appendChild(footer);modalEl.appendChild(ft);}}
  modalLayer.classList.add('on');return bd;
}
let modQueueTimer=null;
function closeModal(){if(modQueueTimer){clearInterval(modQueueTimer);modQueueTimer=null;}modalLayer.classList.remove('on');modalEl.innerHTML='';}
$('.modal-bd',modalLayer).onclick=()=>{ _inventoryScrollPos = 0; closeModal(); };

function openSlotDetail(slot){
  const labels={head:'頭部',face:'臉部',top:'上衣',pants:'褲子',shoes:'鞋子',backpack:'背包',primary:'主武器',secondary:'副武器',melee:'近戰武器',throwable:'投擲物'};
  const id=state.player.equipped[slot];
  const def=id?itemDef(id):null;
  const rar=state.player.equippedRarity[slot]||'一般';
  let body='';
  if(def){
    const ac=armorClass(def.level||0);
    const aVal=def.armor!=null?equipArmorValue(id,rar):0;
    const dVal=def.dmg!=null?Math.round(def.dmg*(RARITY_MULT[rar]||1)):null;
    const isArmor=slot==='head'||slot==='face'||slot==='top'||slot==='pants'||slot==='shoes';
    body=`<div class="detail-title ${rarityClass(rar)}">${itemIcon(id,30)} ${def.name}${ac?` <span class="armor-class">${ac}</span>`:''}</div>
      <div class="detail-sub">${labels[slot]} · 稀有度：${rar}</div>
      <div class="stat-line"><span class="k">類型</span><span class="v">${def.type||(def.slot?'裝備':'—')}</span></div>
      ${def.armor!=null?`<div class="stat-line"><span class="k">裝甲值</span><span class="v">${armorBreakdownText(id,rar)}</span></div>`:''}
      <div class="stat-line"><span class="k">重量</span><span class="v">${getItemWeight(id,rar).toFixed(2)} kg</span></div>
      ${def.armored?`<div class="stat-line"><span class="k">特性</span><span class="v" style="color:#4a90d9">帶護臂甲</span></div>`:''}
      ${def.cal?`<div class="stat-line"><span class="k">口徑</span><span class="v">${def.cal}</span></div>`:''}
      ${def.mag?`<div class="stat-line"><span class="k">彈匣</span><span class="v">${def.mag}</span></div>`:''}
      ${def.slot==='throwable' ? `
        <div class="stat-line"><span class="k">破片數</span><span class="v">${def.fragments || 1}</span></div>
        <div class="stat-line"><span class="k">每片傷害</span><span class="v">${Math.round((def.fragmentDamage || def.dmg || 0) * (RARITY_MULT[rar]||1))}</span></div>
        <div class="stat-line"><span class="k">特性</span><span class="v" style="color:#e05252">爆炸群傷</span></div>
      ` : `
        ${!isArmor&&def.rpm?`<div class="stat-line"><span class="k">射速</span><span class="v">${def.rpm} RPM</span></div>`:''}
        ${dVal!=null?`<div class="stat-line"><span class="k">傷害</span><span class="v">${dVal}</span></div>`:''}
        ${def.modes?`<div class="stat-line"><span class="k">射擊模式</span><span class="v">${def.modes.join('/')}</span></div>`:''}
        ${def.explosive?`<div class="stat-line"><span class="k">特性</span><span class="v" style="color:#e05252">爆炸（群傷）</span></div>`:''}
      `}
      ${slot==='melee'?`<div class="stat-line"><span class="k">每輪攻擊次數</span><span class="v">${getMeleeHits(def.rpm)}</span></div>`:''}
      ${def.scopeBonus?`<div class="stat-line"><span class="k">瞄具加成</span><span class="v">+${def.scopeBonus}% 命中</span></div>`:''}
      ${def.fixed?`<div class="stat-line"><span class="k">固定</span><span class="v" style="color:#4a90d9">不可卸下</span></div>`:''}
      ${slot==='throwable'?`<div class="stat-line"><span class="k">庫存</span><span class="v">${getThrowableCount()}</span></div>`:''}`;
  } else {
    body=`<div class="detail-title">空槽位</div><div class="detail-sub">${labels[slot]} 尚未裝備任何物品</div>`;
  }
  const ft=el('div','modal-ft');
  if(slot==='backpack'||isFixedItem(id)){
    ft.innerHTML=`<button class="btn primary" id="m-open">打開</button><button class="btn" id="m-tidy">整理</button>`;
  } else if(def){
    ft.innerHTML=`<button class="btn" id="m-change">更換</button><button class="btn danger" id="m-unequip">卸下</button>`;
  } else {
    ft.innerHTML=`<button class="btn primary" id="m-change">裝備</button>`;
  }
  openModal({title:`${labels[slot]} 詳情`,body,footer:ft});
  const op=ft.querySelector('#m-open');if(op)op.onclick=()=>{closeModal();openInventory();};
  const tidy=ft.querySelector('#m-tidy');
  if(tidy)tidy.onclick=()=>{
    const invalid=removeInvalidInventoryItems();
    const merged=consolidateInventoryDuplicates();
    save();
    let rpt='';
    if(!invalid.length && !merged.length){
      rpt='<div class="empty-hint">背包乾淨，無需整理</div>';
    } else {
      if(invalid.length){
        rpt+='<div style="color:#e8a33d;font-weight:bold;font-size:12px;margin-bottom:6px">🗑️ 移除無效物品 '+invalid.length+' 項</div>';
        for(const it of invalid){rpt+='<div style="font-size:10px;color:#a89a85;margin-bottom:2px">· '+it.id+' ×'+it.cnt+'</div>';}
      }
      if(merged.length){
        rpt+='<div style="color:#e8a33d;font-weight:bold;font-size:12px;margin-top:10px;margin-bottom:6px">🔀 合併重複物品 '+merged.length+' 項</div>';
        for(const it of merged){const d=itemDef(it.id);const name=d?d.name:it.id;rpt+='<div style="font-size:10px;color:#a89a85;margin-bottom:2px">· '+name+'（'+it.rar+' ×'+it.cnt+'）已分解為材料</div>';}
      }
    }
    closeModal();
    const _ft=el('div','modal-ft');
    _ft.innerHTML='<button class="btn primary" id="m-ok">確定</button>';
    const _bd=openModal({title:'整理結果',body:rpt,footer:_ft});
    _ft.querySelector('#m-ok').onclick=()=>{closeModal();openSlotDetail(slot);};
  };
  const ch=ft.querySelector('#m-change');if(ch)ch.onclick=()=>{closeModal();openSlotPicker(slot, ()=>openSlotDetail(slot));};
  const un=ft.querySelector('#m-unequip');
  if(un)un.onclick=()=>{
    if(slot==='throwable'){unequipThrowable();}
    else {
      const curId=state.player.equipped[slot];
      const curRar=state.player.equippedRarity[slot]||'一般';
      state.player.equipped[slot]=null;
      delete state.player.equippedRarity[slot];
      if(curId)invAdd(curId,curRar,1);
    }
    refreshPlayerStats();save();closeModal();renderCurrentTab();
    
  };
}
function openSlotPicker(slot,returnFn){
  const list=[];
  for(const it of invList()){const d=it.def;if(!d)continue;if(d.slot===slot)list.push(it);}
  list.sort((a,b)=>{
    const ra = RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity);
    if(ra !== 0) return ra;
    const an = (a.def && a.def.name) || '';
    const bn = (b.def && b.def.name) || '';
    return an.localeCompare(bn);
  });
  let body='';
  if(!list.length)body='<div class="empty-hint">倉庫中沒有可裝備於此槽位的物品</div>';
  else{for(const it of list){body+=`<div class="item-row" data-iid="${it.id}" data-irar="${it.rarity}"><div class="icon" style="background:${rarityBg(it.rarity)}">${itemIcon(it.id,30)}</div><div class="info"><div class="nm ${rarityClass(it.rarity)}">${it.def.name}</div><div class="sub">${it.def.type||slot} · ${it.rarity}</div></div><div class="cnt">*${it.count}</div></div>`;}}
  const _slotPickerOnClose = (typeof returnFn === 'function') ? returnFn : closeModal;
  const bd=openModal({title:`選擇 ${slot} 裝備`,body,onClose:_slotPickerOnClose});
  $$('.item-row',bd).forEach(row=>{row.onclick=()=>{const iid=row.dataset.iid,irar=row.dataset.irar;closeModal();openEquipmentCompare(slot,iid,irar, null, () => openSlotPicker(slot, returnFn));};});
}
function getDisplayStat(id,rarity,key){
  const d=itemDef(id);if(!d)return null;
  const mult=RARITY_MULT[rarity]||1;
  if(key==='dmg'&&d.dmg!=null)return Math.round(d.dmg*mult);
  if(key==='armor'&&d.armor!=null&&d.armor>0)return equipArmorValue(id,rarity);
  if(key==='heal'&&d.heal!=null)return Math.round(d.heal*mult);
  return d[key]!=null?d[key]:null;
}
function openEquipmentCompare(slot,newId,newRarity,onConfirm,onCancel){
  const oldId=state.player.equipped[slot];
  const oldRarity=state.player.equippedRarity[slot]||'一般';
  const newDef=itemDef(newId);
  const oldDef=oldId?itemDef(oldId):null;
  const labels={head:'頭部',face:'臉部',top:'上衣',pants:'褲子',shoes:'鞋子',backpack:'背包',primary:'主武器',secondary:'副武器',melee:'近戰武器',throwable:'投擲物'};
  const isArmorSlot=slot==='head'||slot==='face'||slot==='top'||slot==='pants'||slot==='shoes';
  const iconBox=(rar,id)=>`<span style="display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:5px;background:${rarityBg(rar)};flex-shrink:0">${itemIcon(id,30)}</span>`;
  let body='';
  if(oldDef){
    body+=`<div class="cmp-header"><div class="cmp-name old">${oldDef.name}<br>（${oldRarity}）</div><div class="cmp-name new">${newDef.name}<br>（${newRarity}）</div></div>`;
    body+=`<div class="cmp-title">← 舊裝備 &nbsp;|&nbsp; 屬性 &nbsp;|&nbsp; 新裝備 →</div>`;
    const stats=[{key:'dmg',label:'基礎傷害'},{key:'armor',label:'裝甲值'},{key:'pen',label:'穿甲'},{key:'mag',label:'彈匣'},{key:'rpm',label:'射速'},{key:'range',label:'射程'},{key:'heal',label:'治療'}];
    for(const st of stats){
      if(isArmorSlot&&(st.key==='rpm'||st.key==='pen'||st.key==='mag'||st.key==='range'))continue;
      const oldVal=oldDef?getDisplayStat(oldId,oldRarity,st.key):null;
      const newVal=getDisplayStat(newId,newRarity,st.key);
      if(oldVal==null&&newVal==null)continue;
      let deltaClass='';let arrow='';
      if(oldVal!=null&&newVal!=null){if(newVal>oldVal){deltaClass='up';arrow=' ▲';}else if(newVal<oldVal){deltaClass='down';arrow=' ▼';}}
      body+=`<div class="cmp-row"><div class="cmp-val old">${oldVal!=null?oldVal:'—'}</div><div class="cmp-lbl">${st.label}</div><div class="cmp-val new ${deltaClass}">${newVal!=null?newVal:'—'}${arrow}</div></div>`;
    }
    if(!isArmorSlot){body+=`<div class="cmp-row"><div class="cmp-val old">×${RARITY_MULT[oldRarity]||1}</div><div class="cmp-lbl">稀有度倍率</div><div class="cmp-val new ${(RARITY_MULT[newRarity]||1)>(RARITY_MULT[oldRarity]||1)?'up':((RARITY_MULT[newRarity]||1)<(RARITY_MULT[oldRarity]||1)?'down':'')}">×${RARITY_MULT[newRarity]||1}${(RARITY_MULT[newRarity]||1)>(RARITY_MULT[oldRarity]||1)?' ▲':((RARITY_MULT[newRarity]||1)<(RARITY_MULT[oldRarity]||1)?' ▼':'')}</div></div>`;}
    const oldCal=oldDef?oldDef.cal:null;const newCal=newDef?newDef.cal:null;
    const oldAmmoId=oldCal?getDefaultAmmo(oldCal):null;const newAmmoId=newCal?getDefaultAmmo(newCal):null;
    if(oldAmmoId||newAmmoId){
      const oldAdmg=oldAmmoId?AMMO[oldAmmoId].dmg:null;const newAdmg=newAmmoId?AMMO[newAmmoId].dmg:null;
      if(oldAdmg!=null||newAdmg!=null){let dClass='';let arrow2='';if(oldAdmg!=null&&newAdmg!=null){if(newAdmg>oldAdmg){dClass='up';arrow2=' ▲';}else if(newAdmg<oldAdmg){dClass='down';arrow2=' ▼';}}body+=`<div class="cmp-row"><div class="cmp-val old">${oldAdmg!=null?oldAdmg:'—'}</div><div class="cmp-lbl">默認彈藥傷害</div><div class="cmp-val new ${dClass}">${newAdmg!=null?newAdmg:'—'}${arrow2}</div></div>`;}
    }
    // ★ v17.5 重量比較
    {
      const oldW = oldId ? getItemWeight(oldId, oldRarity) : 0;
      const newW = getItemWeight(newId, newRarity);
      let dClass = ''; let arrow = '';
      if(newW > oldW){ dClass = 'down'; arrow = ' ▲'; }
      else if(newW < oldW){ dClass = 'up'; arrow = ' ▼'; }
      body += `<div class="cmp-row"><div class="cmp-val old">${oldW.toFixed(2)}</div><div class="cmp-lbl">重量(kg)</div><div class="cmp-val new ${dClass}">${newW.toFixed(2)}${arrow}</div></div>`;
    }
    if((newDef.slot==='melee'||(oldDef&&oldDef.slot==='melee'))&&!isArmorSlot){
      const oldHits=oldDef&&oldDef.slot==='melee'?getMeleeHits(oldDef.rpm):null;
      const newHits=newDef.slot==='melee'?getMeleeHits(newDef.rpm):null;
      if(oldHits!=null||newHits!=null){let dClass='',arrow3='';if(oldHits!=null&&newHits!=null){if(newHits>oldHits){dClass='up';arrow3=' ▲';}else if(newHits<oldHits){dClass='down';arrow3=' ▼';}}body+=`<div class="cmp-row"><div class="cmp-val old">${oldHits!=null?oldHits+' 次':'—'}</div><div class="cmp-lbl">每輪攻擊</div><div class="cmp-val new ${dClass}">${newHits!=null?newHits+' 次':'—'}${arrow3}</div></div>`;}
    }
  } else {
    const ac=armorClass(newDef.level||0);
    const aVal=(newDef.armor!=null)?equipArmorValue(newId,newRarity):0;
    const dVal=(newDef.dmg!=null)?Math.round(newDef.dmg*(RARITY_MULT[newRarity]||1)):null;
    body+=`<div class="detail-title ${rarityClass(newRarity)}">${iconBox(newRarity,newId)} ${newDef.name}${ac?` <span class="armor-class">${ac}</span>`:''}</div>`;
    body+=`<div class="detail-sub">稀有度：${newRarity}</div>`;
    body+=`<div class="stat-line"><span class="k">裝備槽</span><span class="v">${labels[slot]}</span></div>`;
    if(newDef.armor!=null)body+=`<div class="stat-line"><span class="k">裝甲值</span><span class="v">${armorBreakdownText(newId,newRarity)}</span></div>`;
    if(newDef.armored)body+=`<div class="stat-line"><span class="k">特性</span><span class="v" style="color:#4a90d9">帶護臂甲</span></div>`;
    if(dVal!=null)body+=`<div class="stat-line"><span class="k">傷害</span><span class="v">${dVal}</span></div>`;
    if(newDef.cal){const aid=getDefaultAmmo(newDef.cal);if(aid)body+=`<div class="stat-line"><span class="k">默認彈藥</span><span class="v">${AMMO[aid].name}（${AMMO[aid].dmg}）</span></div>`;}
    if(newDef.mag)body+=`<div class="stat-line"><span class="k">彈匣</span><span class="v">${newDef.mag}</span></div>`;
    if(newDef.rpm&&!isArmorSlot)body+=`<div class="stat-line"><span class="k">射速</span><span class="v">${newDef.rpm} RPM</span></div>`;
    if(newDef.slot==='melee')body+=`<div class="stat-line"><span class="k">每輪攻擊</span><span class="v">${getMeleeHits(newDef.rpm)} 次</span></div>`;
    if(newDef.scopeBonus)body+=`<div class="stat-line"><span class="k">瞄具加成</span><span class="v">+${newDef.scopeBonus}% 命中</span></div>`;
    if(newDef.explosive)body+=`<div class="stat-line"><span class="k">特性</span><span class="v" style="color:#e05252">爆炸（群傷）</span></div>`;
  }
  const ft=el('div','modal-ft');
  ft.innerHTML=`<button class="btn primary" id="m-confirm">確定</button>`;
  openModal({title:`更換 ${labels[slot]}`,body,footer:ft,onClose:()=>{ closeModal(); if(onCancel) onCancel(); else renderCurrentTab(); }});
  ft.querySelector('#m-confirm').onclick=()=>{
    const oldId2=state.player.equipped[slot];
    if(oldId2){
      const o=state.player.equippedRarity[slot]||'一般';
      if(slot==='throwable'){unequipThrowable();}
      else if(state.pendingSalvageEquipped&&state.pendingSalvageEquipped[slot]){salvageToMaterials(oldId2,o,1);delete state.pendingSalvageEquipped[slot];}
      else{
        state.player.equipped[slot]=null;
        delete state.player.equippedRarity[slot];
        invAdd(oldId2,o,1);
      }
    }
    if(slot==='throwable'){equipThrowable(newId,newRarity);}
    else{invRemove(newId,newRarity,1);state.player.equipped[slot]=newId;state.player.equippedRarity[slot]=newRarity;}
    refreshPlayerStats();save();
    closeModal();
    renderCurrentTab();
    if(onConfirm) onConfirm();
    
  };
}
const inventoryCollapsed={};
const ARMOR_SLOT_ORDER={head:0,face:1,top:2,pants:3,shoes:4,backpack:5};
const WEAPON_TYPE_ORDER={'突擊步槍':0,'機槍':1,'衝鋒槍':2,'狙擊槍':3,'手槍':4,'霰彈槍':5,'刺刀':6,'刀':7,'手榴彈':8};
function _subCatOrder(it){
  const d=it.def;
  if(!d) return 99;
  if(d.slot && ARMOR_SLOT_ORDER[d.slot]!==undefined) return ARMOR_SLOT_ORDER[d.slot];
  if(d.type && WEAPON_TYPE_ORDER[d.type]!==undefined) return WEAPON_TYPE_ORDER[d.type];
  return 99;
}
function openInventory(){
  const list=invList().sort((a,b)=>{
    const rd = RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity);
    if(rd !== 0) return rd;
    const so=_subCatOrder(a)-_subCatOrder(b);
    if(so!==0) return so;
    const an = (a.def && a.def.name) || '';
    const bn = (b.def && b.def.name) || '';
    return an.localeCompare(bn, 'zh-Hant');
  });
  let body='';
  if(!list.length)body+='<div class="empty-hint">倉庫空空如也</div>';
  else{
    const groups={weapon:[],armor:[],ammo:[],consume:[],material:[],misc:[]};
    for(const it of list)groups[itemCat(it.id)].push(it);
    const names={weapon:'⚔️ 武器',armor:'🛡️ 裝備',ammo:'🔫 彈藥',consume:'💊 消耗品',material:'🔧 材料',misc:'📦 其他'};
    for(const g in groups){
      if(!groups[g].length)continue;
      const collapsed=inventoryCollapsed[g];
      body+=`<div class="cat-header" data-cat="${g}"><span>${names[g]} (${groups[g].length})</span><span>${collapsed?'▶':'▼'}</span></div>`;
      if(!collapsed){
        for(const it of groups[g]){
          if(!it.def) continue;
          const ac=armorClass(it.def.level||0);
          const aVal=(it.def.armor!=null)?equipArmorValue(it.id,it.rarity):0;
          const dVal=(it.def.dmg!=null)?Math.round(it.def.dmg*(RARITY_MULT[it.rarity]||1)):null;
          const isArmorDef=it.def.slot==='head'||it.def.slot==='face'||it.def.slot==='top'||it.def.slot==='pants'||it.def.slot==='shoes';
          body+=`<div class="item-row" data-iid="${it.id}" data-irar="${it.rarity}"><div class="icon" style="background:${rarityBg(it.rarity)}">${itemIcon(it.id,30)}</div><div class="info"><div class="nm ${rarityClass(it.rarity)}">${it.def.name}${ac?` <span class="armor-class">${ac}</span>`:''}</div><div class="sub">${it.rarity}${it.def.type?' · '+it.def.type:''}${it.def.cal?' · '+it.def.cal:''}${!isArmorDef&&it.def.pen?' · 穿甲'+it.def.pen:''}${dVal!=null?' · 傷'+dVal:''}${aVal>0?' · 甲'+aVal:''}</div></div><div class="cnt">*${it.count}</div></div>`;
        }
      }
    }
  }
  const bd=openModal({title:'物品倉庫',body});
  if(_inventoryScrollPos > 0) bd.scrollTop = _inventoryScrollPos;
  bd.onscroll = () => { _inventoryScrollPos = bd.scrollTop; };
  $$('.cat-header',bd).forEach(h=>{h.onclick=()=>{const cat=h.dataset.cat;inventoryCollapsed[cat]=!inventoryCollapsed[cat];closeModal();openInventory();};});
  $$('.item-row',bd).forEach(row=>{row.onclick=()=>openItemDetail(row.dataset.iid,row.dataset.irar, openInventory);});
}
function openItemDetail(id,rarity,returnFn){
  const d=itemDef(id);if(!d)return;
  const ac=armorClass(d.level||0);
  const aVal=(d.armor!=null)?equipArmorValue(id,rarity):0;
  const dVal=(d.dmg!=null)?Math.round(d.dmg*(RARITY_MULT[rarity]||1)):null;
  const ammoId=d.cal?getDefaultAmmo(d.cal):null;
  const isArmorDef=d.slot==='head'||d.slot==='face'||d.slot==='top'||d.slot==='pants'||d.slot==='shoes';
  const iconBox=`<span style="display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:5px;background:${rarityBg(rarity)};flex-shrink:0">${itemIcon(id,30)}</span>`;
  let body=`<div class="detail-title ${rarityClass(rarity)}">${iconBox} ${d.name}${ac?` <span class="armor-class">${ac}</span>`:''}</div>
    <div class="detail-sub">稀有度：${rarity}</div>
    <div class="stat-line"><span class="k">持有</span><span class="v">${invCount(id,rarity)}</span></div>
    ${!AMMO[id] ? `<div class="stat-line"><span class="k">重量</span><span class="v">${getItemWeight(id,rarity).toFixed(2)} kg</span></div>` : ''}
    ${!AMMO[id] ? `` : ''}
    ${!AMMO[id] ? `` : ''}
    ${d.type?`<div class="stat-line"><span class="k">類型</span><span class="v">${d.type}</span></div>`:''}
    ${d.armor!=null?`<div class="stat-line"><span class="k">裝甲值</span><span class="v">${armorBreakdownText(id,rarity)}</span></div>`:''}
    ${d.armored?`<div class="stat-line"><span class="k">特性</span><span class="v" style="color:#4a90d9">帶護臂甲</span></div>`:''}
    ${d.cal?`<div class="stat-line"><span class="k">口徑</span><span class="v">${d.cal}</span></div>`:''}
    
    ${d.slot==='throwable' ? `
      <div class="stat-line"><span class="k">破片數</span><span class="v">${d.fragments || 1}</span></div>
      <div class="stat-line"><span class="k">每片傷害</span><span class="v">${Math.round((d.fragmentDamage || d.dmg || 0) * (RARITY_MULT[rarity]||1))}</span></div>
      <div class="stat-line"><span class="k">特性</span><span class="v" style="color:#e05252">爆炸群傷</span></div>
    ` : `
      ${dVal!=null?`<div class="stat-line"><span class="k">傷害</span><span class="v">${dVal}</span></div>`:''}
      ${!isArmorDef&&d.pen?`<div class="stat-line"><span class="k">穿甲</span><span class="v">${d.pen}</span></div>`:''}
      ${d.pellets?`<div class="stat-line"><span class="k">彈丸數</span><span class="v">${d.pellets}</span></div>`:''}
      ${d.mag?`<div class="stat-line"><span class="k">彈匣</span><span class="v">${d.mag}</span></div>`:''}
      ${!isArmorDef&&d.rpm?`<div class="stat-line"><span class="k">射速</span><span class="v">${d.rpm} RPM</span></div>`:''}
      ${d.modes?`<div class="stat-line"><span class="k">模式</span><span class="v">${d.modes.join('/')}</span></div>`:''}
      ${d.heal?`<div class="stat-line"><span class="k">治療</span><span class="v">${Math.round(d.heal*(RARITY_MULT[rarity]||1))}</span></div>`:''}
      ${d.explosive?`<div class="stat-line"><span class="k">特性</span><span class="v" style="color:#e05252">爆炸群傷</span></div>`:''}
    `}
    ${d.slot==='melee'?`<div class="stat-line"><span class="k">每輪攻擊次數</span><span class="v">${getMeleeHits(d.rpm)}</span></div>`:''}
    ${d.scopeBonus?`<div class="stat-line"><span class="k">瞄具加成</span><span class="v">+${d.scopeBonus}% 命中</span></div>`:''}
    ${d.fixed?`<div class="stat-line"><span class="k">固定</span><span class="v" style="color:#4a90d9">不可卸下</span></div>`:''}`;
  const ft=el('div','modal-ft');
  if(d.slot&&!d.fixed)ft.innerHTML=`<button class="btn primary" id="m-equip">裝備</button>`;
  else ft.innerHTML=``;
  openModal({title:'物品詳情',body,footer:ft,onClose:function(){ if(typeof returnFn === 'function'){ returnFn(); } else { closeModal(); } }});
  const eqb=ft.querySelector('#m-equip');
  if(eqb)eqb.onclick=()=>{const slot=d.slot;closeModal();openEquipmentCompare(slot,id,rarity, returnFn, () => openItemDetail(id,rarity,returnFn));};
}
function openOfflineDetail(log){
  const items = (log && log.items) || [];
  let body = `<div style="font-size:11px;color:#7a6f60;margin-bottom:8px;line-height:1.5">${log.html}</div>`;
  if(!items.length){
    body += '<div class="empty-hint">無獲得物資</div>';
  } else {
    const groups = {weapon:[],armor:[],ammo:[],consume:[],material:[],misc:[]};
    for(const it of items){
      const cat = itemCat(it.id);
      if(groups[cat]) groups[cat].push(it);
      else groups.misc.push(it);
    }
    const names = {weapon:'⚔️ 武器',armor:'🛡️ 裝備',ammo:'🔫 彈藥',consume:'💊 消耗品',material:'🔧 材料',misc:'📦 其他'};
    if(!window._offlineCollapsed) window._offlineCollapsed = {};
    for(const g in groups){
      if(!groups[g].length) continue;
      const col = window._offlineCollapsed[g];
      body += `<div class="cat-header" data-ocat="${g}" style="cursor:pointer"><span>${names[g]} (${groups[g].length})</span><span>${col ? '▶' : '▼'}</span></div>`;
      if(!col){
        for(const it of groups[g]){
          const def = itemDef(it.id);
          if(!def) continue;
          body += `<div class="item-row" data-iid="${it.id}" data-irar="${it.rarity}"><div class="icon" style="background:${rarityBg(it.rarity)}">${itemIcon(it.id,30)}</div><div class="info"><div class="nm ${rarityClass(it.rarity)}">${def.name}</div><div class="sub">${it.rarity}${def.type?' · '+def.type:''}</div></div><div class="cnt">×${it.count}</div></div>`;
        }
      }
    }
  }
  const bd = openModal({title:'離線獲得物資', body});
  $$('.cat-header[data-ocat]', bd).forEach(h => {
    h.onclick = () => {
      window._offlineCollapsed[h.dataset.ocat] = !window._offlineCollapsed[h.dataset.ocat];
      closeModal();
      openOfflineDetail(log);
    };
  });
  $$('.item-row', bd).forEach(r => {
    r.onclick = () => { closeModal(); openItemDetail(r.dataset.iid, r.dataset.irar, () => openOfflineDetail(log)); };
  });
}
function openLogHistory(){
  let body='<div style="font-size:10px">';
  const logs=state.logs.slice().reverse();
  if(!logs.length)body+='<div class="empty-hint">暫無記錄</div>';
  for(const l of logs){
    const clickAttr = (l.type==='offline' && l.items && l.items.length) ? 'data-offline-idx="'+logs.indexOf(l)+'" style="padding:5px 0;cursor:pointer;color:#4a90d9"' : 'style="padding:5px 0"';
    body+=`<div class="logline" ${clickAttr}>${l.html}</div>`;
  }
  body+='</div>';
  const bd=openModal({title:'歷史記錄',body,full:true});
  $$('.itm',bd).forEach(e=>{e.onclick=()=>openItemDetail(e.dataset.iid,e.dataset.irar);});
  $$('[data-offline-idx]',bd).forEach(e=>{
    e.onclick=()=>{ const l=logs[parseInt(e.dataset.offlineIdx,10)]; if(l) openOfflineDetail(l); };
  });
}



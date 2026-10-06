/* ============================================================
   ★ BOSS MODULE — 繪製區
   ============================================================ */
const battleBossAnim = { name:'idle', frame:0, lastUpdate:0, forcedEnd:0 };
const BATTLE_BOSS_ONESHOT = ['attack_swipe','skill_charge','hurt','death'];

const BOSS_DEG2RAD = Math.PI / 180;
function resolveBossWorld(def, anim, frame){
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

/* 計算 Boss 所有動畫所有幀的包圍盒；若超出 canvas，回傳 fit 變換。
   結果快取在 def._fitCached，避免每幀重算。 */
function computeBossFit(def, bossId, canvasW, canvasH){
  if(def._fitCached && def._fitCached.cw === canvasW && def._fitCached.ch === canvasH) return def._fitCached;
  const cw = def.canvas.w, ch = def.canvas.h;
  const anims = BOSS_ANIMS[bossId];
  if(!anims){ def._fitCached = null; return null; }
  let aMinX = Infinity, aMinY = Infinity, aMaxX = -Infinity, aMaxY = -Infinity;
  let iMinX = Infinity, iMinY = Infinity, iMaxX = -Infinity, iMaxY = -Infinity;
  for(const animName in anims){
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
        const corners = [[0,0],[w,0],[0,h],[w,h]];
        for(const c of corners){
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
  const idleH = iMaxY - iMinY;
  const scaleByIdle = canvasH / idleH;
  const scaleByAllH = canvasH / allH;
  const scaleByAllW = canvasW / allW;
  const idleW = iMaxX - iMinX;
  const fitScale = def.forceFit
    ? Math.min(canvasH / idleH, canvasW / idleW)
    : Math.min(scaleByIdle, scaleByAllH, scaleByAllW);
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
  const _tf = getBossCanvasTransform(def, bossId, canvasW, canvasH);
  ctx.translate(_tf.ox, _tf.oy);
  ctx.scale(_tf.sx, _tf.sy);

  const _SHIELD_LIDS = ['shield','shield-2','shield-2_copy','shield-2_copy_1'];
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
    const _emIds = def.layers.filter(L => /^(eyes|mouth)/.test(L.id)).map(L => L.id);
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

function playExploreCombatFx(slot, isMelee){
  if(_offlineMode) return;
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
    preferences:{ammoExplore:{priority:'一般',fallback:'desc',exclude:[]},ammoCombat:{priority:'傳奇',fallback:'desc',exclude:[]},consume:{priority:'一般',fallback:'desc',exclude:[]},throwableExplore:{priority:'破舊',fallback:'asc',exclude:['精品','傳奇']},throwableCombat:{priority:'傳奇',fallback:'desc',exclude:[]},autoConsumeThreshold:0.3,actionMode:'attack',regions:['廢棄工廠']},
    regionProgress:{},activeRegion:null,stashedWeapons:{},
    base:{slots:new Array(12).fill(null).map((_,i)=>i===0?{id:'control',lv:1}:null)},
    seals:{},defeatedBosses:[],unlockedRegions:['廢棄工廠','廢棄實驗室'],
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
    delete state.preferences.autoSalvage;
    state.base=Object.assign(d.base,s.base||{});
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
    for(const k in state.seals){state.seals[k]=parseInt(state.seals[k]||0,10);}
    if(!state.player.equipped.backpack){state.player.equipped.backpack='bplarge';state.player.equippedRarity.backpack='傳奇';}
    removeInvalidInventoryItems();
    consolidateInventoryDuplicates();
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
function invAddRaw(id,r,c){if(c<=0)return;const k=invKey(id,r);state.inventory[k]=(state.inventory[k]||0)+c;}
function invRemove(id,r,c){const k=invKey(id,r);if(!state.inventory[k]||state.inventory[k]<c)return false;state.inventory[k]-=c;if(state.inventory[k]<=0)delete state.inventory[k];return true;}
function invCount(id,r){return state.inventory[invKey(id,r)]||0;}
function invList(){const l=[];for(const k in state.inventory){const [id,r]=k.split('@');l.push({id,rarity:r,count:state.inventory[k],def:itemDef(id)});}return l;}
function getAmmoByCal(cal){const l=[];for(const k in state.inventory){const p=k.split('@');if(p.length!==2)continue;const id=p[0],r=p[1];const d=AMMO[id];if(!d||d.cal!==cal)continue;const cnt=state.inventory[k];if(!cnt||cnt<=0)continue;l.push({id,rarity:r,count:cnt,def:d});}return l;}
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
  if(!ex.includes(pri)){
    const primary = items.filter(a => a.rarity === pri);
    if(primary.length) return pick(primary);
  }
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
function getBuildingLv(id){for(const s of state.base.slots)if(s&&s.id===id)return s.lv||1;return 0;}
function buildingBonusText(bid,lv){
  switch(bid){case 'workbench':return `改造隊列 +${lv}`;case 'storage':return `掉落數量 +${lv*10}%`;
  case 'toilet':return `熟練度獲取 +${lv*10}%`;case 'rest':return `生命成長率 ${(0.03*Math.pow(1.02,lv)*100).toFixed(2)}%`;
  case 'generator':return `製造/冷卻加速 +${lv*20}%`;case 'medbay':return `消耗品恢復 +${lv*15}%`;
  case 'forge':return `護甲值 +${lv*3}%`;
  case 'radio':return `補給量 ×${lv}`;
  case 'armory':{
    let targetRarity='一般';
    if(lv<=5)targetRarity='破舊';else if(lv<=10)targetRarity='一般';else if(lv<=15)targetRarity='庫存';else if(lv<=20)targetRarity='精品';else targetRarity='傳奇';
    return `產出主副彈藥（當前稀有度：${targetRarity}）`;
  }default:return '';}
}
function calcMaxHp(){const rl=getBuildingLv('rest');const base=1+0.10883*Math.pow(1.02,rl);return Math.round(100*Math.pow(base,state.player.level-1));}
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

function refreshPlayerStats(){
  const prevMaxArmor = state.player.maxArmor || 0;
  state.player.maxHp=calcMaxHp();
  let armor=0;
  for(const slot of ['head','face','top','pants','shoes']){const id=state.player.equipped[slot];if(id){const rarity=state.player.equippedRarity[slot]||'一般';armor+=equipArmorValue(id,rarity);}}
  const forgeLv=getBuildingLv('forge');
  if(forgeLv>0) armor = Math.round(armor * (1 + forgeLv * 0.03));
  state.player.maxArmor=armor;
  state.player.armorLevel=getPlayerArmorLevel();
  if(armor !== prevMaxArmor){ state.player.armor = armor; }
  if(state.player.hp>state.player.maxHp)state.player.hp=state.player.maxHp;
  if(state.player.armor>state.player.maxArmor)state.player.armor=state.player.maxArmor;
  if(state.player.armor<0)state.player.armor=0;
}
function addExp(n){
  state.player.exp+=n;let need=Math.round(50*Math.pow(1.15,state.player.level-1));
  while(state.player.exp>=need){state.player.exp-=need;state.player.level++;refreshPlayerStats();state.player.hp=state.player.maxHp;notify(`🎉 升級至 Lv.${state.player.level}（HP ${state.player.maxHp}）`,'ok');pushLog(`<span class="pl">玩家</span> 升級至 <b>Lv.${state.player.level}</b>，最大生命 ${state.player.maxHp}。`,[],'explore');need=Math.round(50*Math.pow(1.15,state.player.level-1));}
}
function addProf(cat,n){const tl=getBuildingLv('toilet');const m=1+tl*0.1;state.proficiency[cat]=Math.min(MAX_PROF_RAW,(state.proficiency[cat]||0)+n*m);}
function getHitRate(weaponType,mode,scopeBonus){
  let base=10,p=0;
  const w=state.player.equipped.primary,s=state.player.equipped.secondary,m=state.player.equipped.melee,t=state.player.equipped.throwable;
  if(WEAPONS[w]&&WEAPONS[w].type===weaponType)p+=Math.floor(state.proficiency.primary||0);
  if(WEAPONS[s]&&WEAPONS[s].type===weaponType)p+=Math.floor(state.proficiency.secondary||0);
  if(WEAPONS[m]&&WEAPONS[m].type===weaponType)p+=Math.floor(state.proficiency.melee||0);
  if(WEAPONS[t]&&WEAPONS[t].type===weaponType)p+=Math.floor(state.proficiency.throwable||0);
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
function notify(msg,type){
  if(battle && battle.active) return;
  const n=el('div','toast'+(type?' '+type:''),msg);
  let slot=0;
  while(toastSlotSet.has(slot) && slot<7) slot++;
  toastSlotSet.add(slot);
  n.style.top=`calc(22% + ${slot*50}px)`;
  document.body.appendChild(n);
  setTimeout(()=>{toastSlotSet.delete(slot);n.remove();},2300);
}
function pushLog(html,items,type){state.logs.push({t:Date.now(),html,items:items||[],type:type||'explore'});if(state.logs.length>500)state.logs.splice(0,state.logs.length-500);if(currentTab==='explore')renderZone3Log();}
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
  const cat=itemCat(id);
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

function equipThrowable(id,rarity){const k=invKey(id,rarity);const total=state.inventory[k]||0;delete state.inventory[k];state.player.throwableStock=total;state.player.equipped.throwable=id;state.player.equippedRarity.throwable=rarity;}
function unequipThrowable(){const id=state.player.equipped.throwable;if(!id)return;const rarity=state.player.equippedRarity.throwable||'一般';const cnt=state.player.throwableStock||0;if(cnt>0)invAddRaw(id,rarity,cnt);state.player.throwableStock=0;state.player.equipped.throwable=null;delete state.player.equippedRarity.throwable;}
function getThrowableCount(){return parseInt(state.player.throwableStock||0,10);}
function ensureThrowableFromBackpack(){
  if(getThrowableCount()>0)return true;
  const opts=[];
  for(const k in state.inventory){const [id,r]=k.split('@');const d=WEAPONS[id];if(d&&d.slot==='throwable'&&state.inventory[k]>0)opts.push({id,rarity:r,count:state.inventory[k]});}
  if(!opts.length)return false;
  opts.sort((a,b)=>{const da=(WEAPONS[a.id].dmg||0)*(RARITY_MULT[a.rarity]||1);const db=(WEAPONS[b.id].dmg||0)*(RARITY_MULT[b.rarity]||1);return db-da;});
  const best=opts[0];
  delete state.inventory[invKey(best.id,best.rarity)];
  state.player.equipped.throwable=best.id;
  state.player.equippedRarity.throwable=best.rarity;
  state.player.throwableStock=best.count;
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
function updateExploreBg(){
  const layers=document.querySelectorAll('#zone1 .bg-layer');
  if(!layers.length)return;
  const bg=getCurrentBg();
  if(bg)layers.forEach(l=>{l.style.backgroundImage=`url('${bg}')`;});
  const t=$('#zone1 .zone-title');
  if(t){const region=state.activeRegion||'';const cur=region?getCurrentNode(region):null;if(cur){const _dr=region.replace(/II$/,' II');t.innerHTML=`🧭 ${_dr} · ${cur.node}`;}}
}

function genEnemies(region,count){const r=REGIONS[region];const arr=[];const mult=r.enemyHpMult||1;for(let i=0;i<count;i++){const eid=pick(r.enemies);const e=ENEMIES[eid];const hp=Math.round(e.hp*mult);arr.push({id:eid,name:e.name,hp:hp,maxHp:hp,armor:0,maxArmor:0});}return arr;}
function spawnCount(region){const R=region?REGIONS[region]:null;if(!R||!R.spawnWeights){const r=Math.random();if(r<0.4)return 1;if(r<0.75)return 2;if(r<0.92)return 3;return 5;}const w=R.spawnWeights;const total=Object.values(w).reduce((a,b)=>a+b,0);let x=Math.random()*total;for(const n in w){x-=w[n];if(x<=0)return parseInt(n,10);}return 1;}

function chooseCombatWeaponVerbose(context,enemyCount){
  const trace=[];
  if(context==='explore'&&enemyCount>=2){
    const _t=pickThrowableByPreference('explore');
    if(_t){
      const _td=WEAPONS[_t.id];
      trace.push('throwable(多敵優先):'+_td.name+'×'+_t.count+'✓');
      return {slot:'throwable',weapon:{id:_t.id,rarity:_t.rarity,def:_td,slot:'throwable'},ammo:null,fromBag:true,trace};
    }
    trace.push('throwable:多敵但無手雷');
  }
  const order=['primary','secondary','melee','throwable'];
  for(const slot of order){
    /* ★ 探索模式：投擲槽改為從背包按探索偏好挑選，不碰裝備槽；
       這樣玩家留給 Boss 戰的高稀有度手雷永遠不會在探索中被消耗。 */
    if(slot === 'throwable' && context === 'explore'){
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
    if(def.cal){const ammo=pickAmmoByPreference(def.cal,context);if(ammo){trace.push(`${slot}:${def.name}✓`);return{slot,weapon:w,ammo,trace};}else{trace.push(`${slot}:${def.name}無彈`);continue;}}
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
function fmtItemSpan(id,r,c){return `<span class="${rarityClass(r)} itm" data-iid="${id}" data-irar="${r}">${itemDef(id).name}*${c}</span>`;}
function fmtEnemies(enemies){const map={};for(const e of enemies){const k=e.id;if(!map[k])map[k]={...e,count:0};map[k].count++;}return Object.values(map).map(g=>`${g.name}*${g.count}(HP:${g.maxHp}*${g.count})`).join('、');}
function checkThrowableUnequip(){const tid=state.player.equipped.throwable;if(!tid)return;if(getThrowableCount()<=0){const def=itemDef(tid);state.player.equipped.throwable=null;delete state.player.equippedRarity.throwable;state.player.throwableStock=0;refreshPlayerStats();notify(`${def?def.name:tid} 已用盡，自動卸下`,'error');}}
function applyDropBonus(count){const sl=getBuildingLv('storage');return Math.max(1,Math.round(count*(1+sl*0.1)));}

function autoCombat(region,node,enemies){
  try{
    const choice=chooseCombatWeaponVerbose('explore',enemies.length);
    const totalEnemyHp=enemies.reduce((s,e)=>s+e.hp,0);
    if(!choice.slot){pushLog(`<span class="pl">玩家</span> 在探索 <b>${region}·${node}</b> 時 遭遇了 ${fmtEnemies(enemies)}，<span class="lose">手無寸鐵，只能逃跑。</span>`,[],'explore');return{victory:false,loot:[]};}
    const {slot,weapon,ammo}=choice;const def=weapon.def;
    const isMeleeWeapon = def.slot === 'melee';
    playExploreCombatFx(slot, isMeleeWeapon);
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
      const avgHp=totalEnemyHp/Math.max(1,ec);
      const expHits=Math.ceil(avgHp/Math.max(1,baseDmg));
      const expBullets=Math.ceil(expHits/hitP);
      const profErr=(1-_pe)*0.8;
      const jitter=1+(Math.random()*2-1)*profErr;
      const planned=Math.max(1,Math.ceil(expBullets*jitter));
      const bulletsToFire=Math.min(planned,maxBullets);
      for(let i=0;i<bulletsToFire;i++){const alive=remaining.filter(e=>e.hp>0);if(!alive.length)break;const target=pick(alive);bulletsUsed++;if(Math.random()*100<hitRate){let d=baseDmg+rndInt(-3,3);if(Math.random()<critRate){d=Math.round(d*critMult);crits++;}target.hp=Math.max(0,target.hp-Math.max(1,d));hits++;dmgDealt+=Math.max(1,d);}}
      rounds=1;
      if(bulletsUsed>0)invRemove(ammo.id,ammo.rarity,bulletsUsed);
    } else if(def.cal){
      mode=chooseFireMode(weapon,ec,ammo.count);
      const hitRate=getHitRate(def.type,mode,scopeBonus);
      const perTarget=modeBulletsPerTarget(mode);
      let needBullets=0;
      if(mode==='掃射')needBullets=Math.min(def.mag||30,ammo.count);else needBullets=perTarget*ec;
      needBullets=Math.min(needBullets,ammo.count);bulletsUsed=needBullets;
      if(bulletsUsed>0)invRemove(ammo.id,ammo.rarity,bulletsUsed);
      const _pd2=0.6+clamp(Math.floor(state.proficiency[def.type]||0)/MAX_PROF_LEVEL,0,1)*0.9;
      const baseDmg=Math.round(ammo.def.dmg*(RARITY_MULT[ammo.rarity]||1)*_pd2);
      const pellets=ammo.def.pellets||1;
      let bi=bulletsUsed;
      while(bi>0&&remaining.some(e=>e.hp>0)){const alive=remaining.filter(e=>e.hp>0);if(!alive.length)break;const target=pick(alive);bi--;for(let p=0;p<pellets;p++){if(Math.random()*100<hitRate){let d=baseDmg+rndInt(-3,3);if(Math.random()<critRate){d=Math.round(d*critMult);crits++;}target.hp-=Math.max(1,d);hits++;dmgDealt+=Math.max(1,d);}}if(remaining.every(e=>e.hp<=0))break;}
    } else if(def.explosive){
      /* ★ 投擲物：探索模式一律從背包消耗，裝備槽保留給 Boss 戰 */
      mode=def.modes?def.modes[0]:'投擲';
      if(choice.fromBag){
        if(!invRemove(weapon.id, weapon.rarity, 1)){
          pushLog(`<span class="pl">玩家</span> 在探索 <b>${region}·${node}</b> 遭遇敵人，但投擲物不足。`,[],'explore');
          return {victory:false,loot:[]};
        }
      } else {
        /* 保險分支：理論上探索不會走到這裡（裝備槽投擲已被 chooseCombatWeaponVerbose 排除） */
        if(getThrowableCount()<=0 && !ensureThrowableFromBackpack()){
          pushLog(`<span class="pl">玩家</span> 在探索 <b>${region}·${node}</b> 遭遇敵人，但投擲物不足。`,[],'explore');
          return {victory:false,loot:[]};
        }
        state.player.throwableStock--;
        setTimeout(checkThrowableUnequip,0);
      }
      bulletsUsed=1;
      const hitRate=getHitRate(def.type,mode)+10;
      const _pdT=0.6+clamp(Math.floor(state.proficiency[def.type]||0)/MAX_PROF_LEVEL,0,1)*0.9;
      const baseDmg=Math.round(def.dmg*(RARITY_MULT[weapon.rarity]||1)*_pdT);
      for(const target of remaining){if(Math.random()*100<hitRate){let d=baseDmg+rndInt(-5,5);if(Math.random()<critRate){d=Math.round(d*critMult);crits++;}target.hp-=Math.max(1,d);hits++;dmgDealt+=Math.max(1,d);}}
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
    const ammoTxt=def.cal?`消耗 ${ammo.def.name}子彈${bulletsUsed}發`:(def.explosive?`投出 ${def.name}×1`:'');
    const isMelee=def.slot==='melee';
    const meleeHits=isMelee?getMeleeHits(def.rpm):0;
    const _remHp=remaining.reduce((s,e)=>s+Math.max(0,e.hp),0);const _effDmg=Math.max(0,totalEnemyHp-_remHp);const hitTxt=def.cal?`(命中:${hits}/${bulletsUsed}，暴擊:${crits}，傷害:${_effDmg}/${totalEnemyHp})`:(isMelee?`(近戰 ${meleeHits} 次，命中:${hits}，暴擊:${crits}，傷害:${_effDmg}/${totalEnemyHp})`:`(命中:${hits}，暴擊:${crits}，傷害:${_effDmg}/${totalEnemyHp})`);
    const modeDisplay=(def.cal&&isSemiAutoOnly(def)&&rounds>1)?`${rounds}輪點射`:mode;
    let resultTxt='',loot=[];
    if(reallyVictory){
      resultTxt=`<span class="win">勝利</span>`;state.stats.kills+=enemies.length;
      const dropN=rndInt(1,2);
      for(let i=0;i<dropN;i++){const drop=rollRegionDrop(region);if(!drop)continue;const lid=drop.id,rar=drop.rarity;let cnt=(itemCat(lid)==='ammo')?rndInt(3,8):(itemCat(lid)==='material'?rndInt(1,4):1);cnt=applyDropBonus(cnt);invAdd(lid,rar,cnt);loot.push({id:lid,rarity:rar,count:cnt});}
      addExp(enemies.length*3);
      if(REGIONS[region].seal&&Math.random()<REGIONS[region].sealRate){state.seals[REGIONS[region].seal]=parseInt(state.seals[REGIONS[region].seal]||0,10)+1;pushLog(`<span class="pl">玩家</span> 在探索 <b>${region}·${node}</b> 時 撿到了 <b>Boss 信物</b>！`,[],'explore');}
    } else {
      resultTxt=`<span class="run">逃跑</span>`;
      if(Math.random()<0.5){const lid=pick(REGIONS[region].loot);const ldef=itemDef(lid);if(ldef){const rar=hasVariableRarity(lid)?rollRarity():ldef.rarity;let cnt=(itemCat(lid)==='ammo')?rndInt(3,8):1;cnt=applyDropBonus(cnt);invAdd(lid,rar,cnt);loot.push({id:lid,rarity:rar,count:cnt});}}
      addExp(1);
    }
    const lootTxt=loot.length?`，${resultTxt}:獲得 ${loot.map(l=>fmtItemSpan(l.id,l.rarity,l.count)).join('、')}`:`，${resultTxt}`;
    const html=`<span class="pl">玩家</span> 在探索 <b>${region}·${node}</b> 時 遭遇了 ${fmtEnemies(enemies)}，使用 ${def.name} 進行了 ${modeDisplay}，${ammoTxt}${hitTxt}${lootTxt}。`;
    pushLog(html,loot,'explore');
    return{victory:reallyVictory,loot};
  }catch(e){console.error(e);pushLog(`<span class="lose">戰鬥結算異常：${e.message}</span>`,[],'explore');return{victory:false,loot:[]};}
}
function searchEvent(region,node){
  const r=REGIONS[region];const roll=Math.random();
  if(roll<0.35){
    const lid=pick(r.loot.filter(id=>WEAPONS[id]||ARMOR[id]));
    if(lid){const ldef=itemDef(lid);const rar=rollRarity();invAdd(lid,rar,1);pushLog(`<span class="pl">玩家</span> 在探索 <b>${region}·${node}</b> 時 開啓了 武器櫃，獲得 ${fmtItemSpan(lid,rar,1)}。`,[{id:lid,rarity:rar,count:1}],'explore');addProf('drop',1);addExp(2);return;}
  }
  if(roll<0.75){
    const pool=r.loot.filter(id=>AMMO[id]||MATERIALS[id]||CONSUMABLES[id]);
    let lid=pick(pool);
    let rar=null;
    if(lid&&AMMO[lid]){const ammoPool=r.loot.filter(id=>AMMO[id]);const selRar=rollAmmoRarity(region);if(selRar){const filtered=ammoPool.filter(id=>AMMO[id].rarity===selRar);if(filtered.length)lid=pick(filtered);}rar=AMMO[lid].rarity;}
    else if(lid){const ldef=itemDef(lid);rar=hasVariableRarity(lid)?rollRarity():ldef.rarity;}
    if(lid){let cnt=AMMO[lid]?rndInt(5,15):(MATERIALS[lid]?rndInt(1,5):1);cnt=applyDropBonus(cnt);invAdd(lid,rar,cnt);pushLog(`<span class="pl">玩家</span> 在探索 <b>${region}·${node}</b> 時 發現了 補給箱，獲得 ${fmtItemSpan(lid,rar,cnt)}。`,[{id:lid,rarity:rar,count:cnt}],'explore');addProf('drop',1);addExp(1);return;}
  }
  pushLog(`<span class="pl">玩家</span> 在探索 <b>${region}·${node}</b> 時 沒有發現任何東西。`,[],'explore');
}
function doExploreTick(){
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
  refreshPlayerStats();autoConsumeIfLow();
}
function autoConsumeIfLow(){
  const thr=state.preferences.autoConsumeThreshold||0.3;
  if(state.player.hp/state.player.maxHp>=thr)return;
  let healTotal = 0;
  while(state.player.hp < state.player.maxHp){
    const item = findNextConsumable();
    if(!item) break;
    const medbayLv=getBuildingLv('medbay');
    const actualHeal=Math.round(CONSUMABLES[item.id].heal*(RARITY_MULT[item.rarity]||1)*(1+medbayLv*0.15));
    state.player.hp=Math.min(state.player.maxHp,state.player.hp+actualHeal);
    invRemove(item.id,item.rarity,1);
    healTotal += actualHeal;
  }
  if(healTotal > 0){
    spawnExploreHealFx(healTotal);
    refreshPlayerStats();
  }
}
function buildingTick(){
  const now=Date.now();
  const genLv=getBuildingLv('generator');const genMult=1+genLv*0.2;
  const radioLv=getBuildingLv('radio');
  if(radioLv>0){
    const last=state.radioLastTick||0;const interval=5*60*1000/genMult;
    if(now-last>interval){state.radioLastTick=now;const mats=['wood','metal','screws','cloth','gears','electronics'];const m=pick(mats);const cnt=rndInt(3,8)*radioLv;invAdd(m,'一般',cnt);notify(`📡 無線電補給：${MATERIALS[m].name}*${cnt}`,'ok');}
  }
  const armoryLv=getBuildingLv('armory');
  if(armoryLv>0){
    const last=state.armoryLastTick||0;const interval=3*60*1000/genMult;
    if(now-last>interval){
      state.armoryLastTick=now;
      let targetRarity='一般';
      if(armoryLv<=5)targetRarity='破舊';else if(armoryLv<=10)targetRarity='一般';else if(armoryLv<=15)targetRarity='庫存';else if(armoryLv<=20)targetRarity='精品';else targetRarity='傳奇';
      const _targetIdx=RARITY_ORDER.indexOf(targetRarity);
      const pw=equippedWeapon('primary'),sw=equippedWeapon('secondary');
      const cals=[];
      if(pw&&pw.def.cal)cals.push(pw.def.cal);
      if(sw&&sw.def.cal&&(!pw||sw.def.cal!==pw.def.cal))cals.push(sw.def.cal);
      if(!cals.length)cals.push('9x19');
      for(const cal of cals){const ammos=Object.keys(AMMO).filter(k=>AMMO[k].cal===cal);if(!ammos.length)continue;let best=null,bestDiff=999,bestIdx=999;for(const a of ammos){const aIdx=RARITY_ORDER.indexOf(AMMO[a].rarity);if(aIdx<0)continue;const diff=Math.abs(aIdx-_targetIdx);if(diff<bestDiff||(diff===bestDiff&&aIdx<bestIdx)){bestDiff=diff;bestIdx=aIdx;best=a;}}if(best){const cnt=rndInt(15,30)*Math.max(1,Math.ceil(armoryLv/3));invAdd(best,AMMO[best].rarity,cnt);notify(`🔫 軍械庫產出：${AMMO[best].name}*${cnt}`,'ok');}}
    }
  }
  processCrafting();
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
          state.player.equipped[info.fromEquippedSlot]=namedId;
          state.player.equippedRarity[info.fromEquippedSlot]='具名';
        } else {
          if(info.originalId){
            invRemove(info.originalId, info.originalRarity, 1);
          }
          invAddRaw(namedId,'具名',1);
        }
        notify(`✅ 改造完成：${itemDef(namedId).name}`,'ok');
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
      if(armoryLv <= 5) targetRarity = '破舊';
      else if(armoryLv <= 10) targetRarity = '一般';
      else if(armoryLv <= 15) targetRarity = '庫存';
      else if(armoryLv <= 20) targetRarity = '精品';
      else targetRarity = '傳奇';
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
          let best = null, bestDiff = 999, bestIdx = 999;
          for(const a of ammos){
            const aIdx = RARITY_ORDER.indexOf(AMMO[a].rarity);
            if(aIdx < 0) continue;
            const d = Math.abs(aIdx - _targetIdx);
            if(d < bestDiff || (d === bestDiff && aIdx < bestIdx)){
              bestDiff = d; bestIdx = aIdx; best = a;
            }
          }
          if(best){
            const cnt = rndInt(15, 30) * Math.max(1, Math.ceil(armoryLv / 3));
            invAdd(best, AMMO[best].rarity, cnt);
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
  for(let i=0;i<events;i++){
    const region=pick(regionPool);const mode=state.preferences.actionMode;const r=REGIONS[region];
    const cc=mode==='attack'?r.combat.attack:r.combat.stealth;
    const cur=getCurrentNode(region);
    if(Math.random()<cc){const n=spawnCount(region);const enemies=genEnemies(region,n);const res=autoCombat(region,cur.node,enemies);if(res.victory)wins++;else runs++;}
    else searchEvent(region,cur.node);
    advanceNode(region);
  }
  /* ★ 新增：離線期間建築產出補算（無線電、軍械庫、改造隊列）★ */
  const buildingResults = _offlineBuildingSettle(now, baseTime);
  _offlineMode = false;
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
      <div class="bg-scroll" style="--spd:${spd}s"><div class="bg-layer" style="background-image:url('${bg}')"></div><div class="bg-layer" style="background-image:url('${bg}')"></div></div>
      <div class="groundline"></div>
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

function renderEquipZone(z2){
  const slots=[
    {key:'backpack',label:'背包',pos:{left:'3%',top:'40%'}},
    {key:'primary',label:'主武器',pos:{right:'3%',top:'6%'}},
    {key:'secondary',label:'副武器',pos:{right:'3%',top:'28%'}},
    {key:'melee',label:'近戰',pos:{right:'3%',top:'50%'}},
    {key:'throwable',label:'投擲',pos:{right:'3%',top:'72%'}},
    {key:'head',label:'頭部',pos:{left:'38%',top:'4%'}},
    {key:'face',label:'臉部',pos:{left:'38%',top:'22%'}},
    {key:'top',label:'上衣',pos:{left:'38%',top:'40%'}},
    {key:'pants',label:'褲子',pos:{left:'38%',top:'60%'}},
    {key:'shoes',label:'鞋子',pos:{left:'38%',top:'80%'}},
  ];
  let html='<canvas id="zone2-silhouette" class="zone2-silhouette"></canvas>';
  for(const s of slots){
    const id=state.player.equipped[s.key];
    const def=id?itemDef(id):null;
    const style=Object.entries(s.pos).map(([k,v])=>`${k}:${v}`).join(';');
    const isFixed=def&&def.fixed;
    let inner='';
    if(def){
      if(PANTS_SHOES_EMOJI[id]){
        inner=`<span style="font-size:34px;line-height:1">${PANTS_SHOES_EMOJI[id]}</span><div class="lbl">${s.label}</div>`;
      } else {
        inner=`<img class="slot-img" src="icons/items/${resolveIconId(id)}.png${assetSuffix()}" alt=""><div class="lbl">${s.label}</div>`;
      }
    } else {
      inner=`<div class="nm">${s.label}</div>`;
    }
    const rar=def?(state.player.equippedRarity[s.key]||'一般'):'';
    const bgStyle=def?`background:${rarityBg(rar)};`:'';
    html+=`<div class="slot ${def?'filled':'empty'} ${isFixed?'fixed':''}" style="${style};${bgStyle}" data-slot="${s.key}">${inner}</div>`;
  }
  html+=`<div class="player-stat-panel" style="left:3%;top:4%">
    <div class="row lv-row"><b>Lv.${state.player.level}</b></div>
    <div class="row"><span>❤️</span><b>${Math.round(state.player.maxHp)}</b></div>
    <div class="row"><span>🛡️</span><b>${Math.round(state.player.maxArmor)}</b></div>
  </div>`;
  z2.innerHTML=html;
  $$('.slot',z2).forEach(e=>{e.onclick=()=>openSlotDetail(e.dataset.slot);});
  requestAnimationFrame(()=>renderZone2Silhouette());
}

const modalLayer=$('#modal-layer');
const modalEl=$('.modal',modalLayer);
function openModal({title,body,footer,full}){
  modalEl.className='modal'+(full?' full':'');modalEl.innerHTML='';
  if(title!==false){const hd=el('div','modal-hd');hd.innerHTML=`<div>${title||''}</div><div class="x">✕</div>`;hd.querySelector('.x').onclick=closeModal;modalEl.appendChild(hd);}
  const bd=el('div','modal-bd-inner');
  if(typeof body==='string')bd.innerHTML=body;else if(body)bd.appendChild(body);
  modalEl.appendChild(bd);
  if(footer){const ft=el('div','modal-ft');if(typeof footer==='string')ft.innerHTML=footer;else ft.appendChild(footer);modalEl.appendChild(ft);}
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
      ${def.armored?`<div class="stat-line"><span class="k">特性</span><span class="v" style="color:#4a90d9">帶護臂甲</span></div>`:''}
      ${def.cal?`<div class="stat-line"><span class="k">口徑</span><span class="v">${def.cal}</span></div>`:''}
      ${def.mag?`<div class="stat-line"><span class="k">彈匣</span><span class="v">${def.mag}</span></div>`:''}
      ${!isArmor&&def.rpm?`<div class="stat-line"><span class="k">射速</span><span class="v">${def.rpm} RPM</span></div>`:''}
      ${dVal!=null?`<div class="stat-line"><span class="k">傷害</span><span class="v">${dVal}</span></div>`:''}
      ${def.modes?`<div class="stat-line"><span class="k">射擊模式</span><span class="v">${def.modes.join('/')}</span></div>`:''}
      ${def.explosive?`<div class="stat-line"><span class="k">特性</span><span class="v" style="color:#e05252">爆炸（群傷）</span></div>`:''}
      ${slot==='melee'?`<div class="stat-line"><span class="k">每輪攻擊次數</span><span class="v">${getMeleeHits(def.rpm)}</span></div>`:''}
      ${def.scopeBonus?`<div class="stat-line"><span class="k">瞄具加成</span><span class="v">+${def.scopeBonus}% 命中</span></div>`:''}
      ${def.fixed?`<div class="stat-line"><span class="k">固定</span><span class="v" style="color:#4a90d9">不可卸下</span></div>`:''}
      ${slot==='throwable'?`<div class="stat-line"><span class="k">庫存</span><span class="v">${getThrowableCount()}</span></div>`:''}`;
  } else {
    body=`<div class="detail-title">空槽位</div><div class="detail-sub">${labels[slot]} 尚未裝備任何物品</div>`;
  }
  const ft=el('div','modal-ft');
  if(slot==='backpack'||isFixedItem(id)){
    ft.innerHTML=`<button class="btn primary" id="m-open">打開</button><button class="btn" id="m-tidy">整理</button><button class="btn ghost" id="m-exit">退出</button>`;
  } else if(def){
    ft.innerHTML=`<button class="btn" id="m-change">更換</button><button class="btn danger" id="m-unequip">卸下</button><button class="btn ghost" id="m-exit">退出</button>`;
  } else {
    ft.innerHTML=`<button class="btn primary" id="m-change">裝備</button><button class="btn ghost" id="m-exit">退出</button>`;
  }
  openModal({title:`${labels[slot]} 詳情`,body,footer:ft});
  ft.querySelector('#m-exit').onclick=closeModal;
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
    notify(`已卸下：${def.name}`,'ok');
  };
}
function openSlotPicker(slot,returnFn){
  const list=[];
  for(const it of invList()){const d=it.def;if(!d)continue;if(d.slot===slot)list.push(it);}
  list.sort((a,b)=>RARITY_ORDER.indexOf(b.rarity)-RARITY_ORDER.indexOf(a.rarity));
  let body='';
  if(!list.length)body='<div class="empty-hint">倉庫中沒有可裝備於此槽位的物品</div>';
  else{for(const it of list){body+=`<div class="item-row" data-iid="${it.id}" data-irar="${it.rarity}"><div class="icon" style="background:${rarityBg(it.rarity)}">${itemIcon(it.id,30)}</div><div class="info"><div class="nm ${rarityClass(it.rarity)}">${it.def.name}</div><div class="sub">${it.def.type||slot} · ${it.rarity}</div></div><div class="cnt">*${it.count}</div></div>`;}}
  const bd=openModal({title:`選擇 ${slot} 裝備`,body});
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
      body+=`<div class="cmp-title" style="margin-top:6px;color:#8a5f18">默認彈藥（一般稀有度）</div>`;
      body+=`<div class="cmp-row"><div class="cmp-val old" style="font-size:10px">${oldAmmoId?AMMO[oldAmmoId].name:'—'}</div><div class="cmp-lbl">彈藥</div><div class="cmp-val new up" style="font-size:10px">${newAmmoId?AMMO[newAmmoId].name:'—'}</div></div>`;
      const oldAdmg=oldAmmoId?AMMO[oldAmmoId].dmg:null;const newAdmg=newAmmoId?AMMO[newAmmoId].dmg:null;
      if(oldAdmg!=null||newAdmg!=null){let dClass='';let arrow2='';if(oldAdmg!=null&&newAdmg!=null){if(newAdmg>oldAdmg){dClass='up';arrow2=' ▲';}else if(newAdmg<oldAdmg){dClass='down';arrow2=' ▼';}}body+=`<div class="cmp-row"><div class="cmp-val old">${oldAdmg!=null?oldAdmg:'—'}</div><div class="cmp-lbl">彈藥傷害</div><div class="cmp-val new ${dClass}">${newAdmg!=null?newAdmg:'—'}${arrow2}</div></div>`;}
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
  ft.innerHTML=`<button class="btn primary" id="m-confirm">確定</button><button class="btn ghost" id="m-exit">退出</button>`;
  openModal({title:`更換 ${labels[slot]}`,body,footer:ft});
  ft.querySelector('#m-exit').onclick=()=>{ closeModal(); if(onCancel) onCancel(); else renderCurrentTab(); };
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
    if(onConfirm) onConfirm(); else renderCurrentTab();
    notify(`已更換：${itemDef(newId).name}`,'ok');
  };
}
const inventoryCollapsed={};
let _inventoryScrollPos = 0;
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
          const ac=armorClass(it.def.level||0);
          const aVal=(it.def.armor!=null)?equipArmorValue(it.id,it.rarity):0;
          const dVal=(it.def.dmg!=null)?Math.round(it.def.dmg*(RARITY_MULT[it.rarity]||1)):null;
          const isArmorDef=it.def.slot==='head'||it.def.slot==='face'||it.def.slot==='top'||it.def.slot==='pants'||it.def.slot==='shoes';
          body+=`<div class="item-row" data-iid="${it.id}" data-irar="${it.rarity}"><div class="icon" style="background:${rarityBg(it.rarity)}">${itemIcon(it.id,30)}</div><div class="info"><div class="nm ${rarityClass(it.rarity)}">${it.def.name}${ac?` <span class="armor-class">${ac}</span>`:''}</div><div class="sub">${it.rarity}${it.def.type?' · '+it.def.type:''}${it.def.cal?' · '+it.def.cal:''}${!isArmorDef&&it.def.pen?' · 穿甲'+it.def.pen:''}${dVal!=null?' · 傷'+dVal:''}${aVal>0?' · 甲'+aVal:''}</div></div><div class="cnt">*${it.count}</div></div>`;
        }
      }
    }
  }
  const bd=openModal({title:'📦 物品倉庫',body});
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
    <div class="stat-line"><span class="k">類別</span><span class="v">${itemCat(id)}</span></div>
    ${d.type?`<div class="stat-line"><span class="k">類型</span><span class="v">${d.type}</span></div>`:''}
    ${d.slot?`<div class="stat-line"><span class="k">裝備槽</span><span class="v">${d.slot}</span></div>`:''}
    ${d.armor!=null?`<div class="stat-line"><span class="k">裝甲值</span><span class="v">${armorBreakdownText(id,rarity)}</span></div>`:''}
    ${d.armored?`<div class="stat-line"><span class="k">特性</span><span class="v" style="color:#4a90d9">帶護臂甲</span></div>`:''}
    ${d.cal?`<div class="stat-line"><span class="k">口徑</span><span class="v">${d.cal}</span></div>`:''}
    ${ammoId?`<div class="stat-line"><span class="k">默認彈藥</span><span class="v">${AMMO[ammoId].name}（${AMMO[ammoId].dmg}）</span></div>`:''}
    ${dVal!=null?`<div class="stat-line"><span class="k">傷害</span><span class="v">${dVal}</span></div>`:''}
    ${!isArmorDef&&d.pen?`<div class="stat-line"><span class="k">穿甲</span><span class="v">${d.pen}</span></div>`:''}
    ${d.pellets?`<div class="stat-line"><span class="k">彈丸數</span><span class="v">${d.pellets}</span></div>`:''}
    ${d.mag?`<div class="stat-line"><span class="k">彈匣</span><span class="v">${d.mag}</span></div>`:''}
    ${!isArmorDef&&d.rpm?`<div class="stat-line"><span class="k">射速</span><span class="v">${d.rpm} RPM</span></div>`:''}
    ${d.modes?`<div class="stat-line"><span class="k">模式</span><span class="v">${d.modes.join('/')}</span></div>`:''}
    ${d.heal?`<div class="stat-line"><span class="k">治療</span><span class="v">${Math.round(d.heal*(RARITY_MULT[rarity]||1))}</span></div>`:''}
    ${d.explosive?`<div class="stat-line"><span class="k">特性</span><span class="v" style="color:#e05252">爆炸群傷</span></div>`:''}
    ${d.slot==='melee'?`<div class="stat-line"><span class="k">每輪攻擊次數</span><span class="v">${getMeleeHits(d.rpm)}</span></div>`:''}
    ${d.scopeBonus?`<div class="stat-line"><span class="k">瞄具加成</span><span class="v">+${d.scopeBonus}% 命中</span></div>`:''}
    ${d.fixed?`<div class="stat-line"><span class="k">固定</span><span class="v" style="color:#4a90d9">不可卸下</span></div>`:''}`;
  const ft=el('div','modal-ft');
  if(d.slot&&!d.fixed)ft.innerHTML=`<button class="btn primary" id="m-equip">裝備</button><button class="btn ghost" id="m-close">關閉</button>`;
  else ft.innerHTML=`<button class="btn ghost" id="m-close">關閉</button>`;
  openModal({title:'物品詳情',body,footer:ft});
  ft.querySelector('#m-close').onclick=()=>{ if(returnFn){ returnFn(); } else { closeModal(); } };
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
    for(const g in groups){
      if(!groups[g].length) continue;
      body += `<div class="cat-header" style="cursor:default"><span>${names[g]} (${groups[g].length})</span><span></span></div>`;
      for(const it of groups[g]){
        const def = itemDef(it.id);
        if(!def) continue;
        body += `<div class="item-row" data-iid="${it.id}" data-irar="${it.rarity}"><div class="icon" style="background:${rarityBg(it.rarity)}">${itemIcon(it.id,30)}</div><div class="info"><div class="nm ${rarityClass(it.rarity)}">${def.name}</div><div class="sub">${it.rarity}${def.type?' · '+def.type:''}</div></div><div class="cnt">×${it.count}</div></div>`;
      }
    }
  }
  const bd = openModal({title:'📦 離線獲得物資', body});
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
  const bd=openModal({title:'📜 歷史記錄',body,full:true});
  $$('.itm',bd).forEach(e=>{e.onclick=()=>openItemDetail(e.dataset.iid,e.dataset.irar);});
  $$('[data-offline-idx]',bd).forEach(e=>{
    e.onclick=()=>{ const l=logs[parseInt(e.dataset.offlineIdx,10)]; if(l) openOfflineDetail(l); };
  });
}

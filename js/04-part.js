/* ============================================================
   ★★★ BOSS MODULE — 戰鬥邏輯區 ★★★
   ============================================================ */
let battle=null;
const BATTLE_ONESHOT_ANIMS=['fire_primary','fire_secondary','attack_melee','reload','switch_secondary','switch_melee','hurt'];

/* rev93/rev94: 輸入優先級助手 —— 搖桿、攻擊、切換、治療互相打斷 */
function stopBattleMovement(){
  if(!battle) return;
  battle.moveDir = 0;
  const stick = document.getElementById('stick');
  if(stick){ stick.style.left='50%'; stick.style.top='50%'; stick.style.transform='translate(-50%,-50%)'; }
  if(typeof battle._joystickCancel === 'function') battle._joystickCancel();
}
function interruptReload(){
  if(!battle || !battle.reloading) return false;
  battle._reloadToken = (battle._reloadToken || 0) + 1;
  battle.reloading = false;
  if(typeof battleHeroAnim !== 'undefined' && battleHeroAnim.name === 'reload'){
    battleHeroAnim.name = 'idle';
    battleHeroAnim.frame = 0;
  }
  if(typeof refreshBattleControlsLive === 'function') refreshBattleControlsLive();
  return true;
}
function interruptHeal(){
  if(!battle || !battle.consuming) return false;
  if(battle.healTimer){ clearTimeout(battle.healTimer); battle.healTimer = null; }
  battle._healToken = (battle._healToken || 0) + 1;
  battle.consuming = false;
  battle.autoHealing = false;
  if(typeof refreshBattleControlsLive === 'function') refreshBattleControlsLive();
  return true;
}


/* ★ Boss 戰背景：獨立圖片，不復用探索圖（比例、地面線、視角皆不同）
   檔名固定為 images/bg/boss_{bossId}.png */
function getBossBgPath(bossId){
  if(!BOSSES[bossId]) return '';
  const _base=bossId.replace(/_ii$/,'');
  return `images/bg/boss_${_base}.png${assetSuffix()}`;
}

function pickAimPartFromClick(canvasX, canvasY){
  if(!battle) return null;
  const def = BOSS_LAYERS[battle.bossId];
  if(!def) return null;
  const anims = BOSS_ANIMS[battle.bossId];
  const anim = anims ? (anims[battleBossAnim.name] || anims.idle) : null;
  if(!anim) return null;
  const fi = ((battleBossAnim.frame % anim.frameCount) + anim.frameCount) % anim.frameCount;
  const world = resolveBossWorld(def, anim, fi);
  const sorted = def.layers.slice().sort((a,b)=>b.z - a.z);
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
  return null;
}

/* ★ 像素級圖形邊界 helper（用於射程判定、碰撞、推動） */
const HERO_SPRITE_W = 88;
function getSceneW(){const fxEl=document.getElementById('battle-fx');return fxEl?fxEl.clientWidth:400;}
function getPlayerSpriteWidthPx(){return HERO_SPRITE_W;}
/* ★ 計算 BOSS 圖形在 sprite 內的實際像素邊界（依動畫 + sprite 尺寸快取） */
function getBossGfxBounds(){
  if(!battle) return null;
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
    const k = (anim.keys && anim.keys[L.id] && anim.keys[L.id][fi]) || {rot:0,dx:0,dy:0};
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
  const W = getSceneW(); if(!W || !battle) return 0;
  const sp = document.getElementById('boss-sprite');
  const spriteW = sp ? sp.clientWidth : 280;
  const spriteLeft = battle.bx * W - spriteW / 2;
  const bounds = getBossGfxBounds();
  if(!bounds) return spriteLeft / W;
  return (spriteLeft + bounds.leftPx) / W;
}
function getBossRightBoundaryN(){
  const W = getSceneW(); if(!W || !battle) return 1;
  const sp = document.getElementById('boss-sprite');
  const spriteW = sp ? sp.clientWidth : 280;
  const spriteLeft = battle.bx * W - spriteW / 2;
  const bounds = getBossGfxBounds();
  if(!bounds) return (spriteLeft + spriteW) / W;
  return (spriteLeft + bounds.rightPx) / W;
}
function getPlayerRightBoundaryN(){const W=getSceneW();if(!W)return 1;return battle.px+(getPlayerSpriteWidthPx()/2)/W;}
function getPlayerLeftBoundaryN(){const W=getSceneW();if(!W)return 0;return battle.px-(getPlayerSpriteWidthPx()/2)/W;}
/* ★ 檢查瞄準部位的圖形是否與玩家攻擊範圍有重疊 */
function isAimPartInRange(){
  if(!battle) return false;
  const def=BOSS_LAYERS[battle.bossId];
  if(!def) return true;
  const part=battle.aimPart;
  if(!part) return true;
  const L=def.layers.find(l=>l.id===part);
  if(!L) return true;
  const anims=BOSS_ANIMS[battle.bossId];
  const anim=anims?(anims[battleBossAnim.name]||anims.idle):null;
  if(!anim) return true;
  const fi=((battleBossAnim.frame%anim.frameCount)+anim.frameCount)%anim.frameCount;
  const k=(anim.keys&&anim.keys[part]&&anim.keys[part][fi])||{rot:0,dx:0,dy:0};
  const w=def.canvas.w*(k.w!==undefined?k.w:L.w);
  const h=def.canvas.h*(k.h!==undefined?k.h:L.h);
  const px=w*L.pivot.x;
  const py=h*L.pivot.y;
  const world=resolveBossWorld(def,anim,fi);
  const wp=world[part];
  if(!wp) return true;
  /* rev520: 手动点击瞄准点优先（u,v 归一化局部坐标），否则用层中心 */
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
  const rot=wp.rot*(Math.PI/180);
  const cos=Math.cos(rot),sin=Math.sin(rot);
  const rotOffX = offX*cos - offY*sin;
  const worldX = wp.wx + rotOffX;
  const W=getSceneW();
  const bossSprite=document.getElementById('boss-sprite');
  const spriteW=bossSprite?bossSprite.clientWidth:280;
  const spriteH=bossSprite?bossSprite.clientHeight:280;
  const _tf=getBossCanvasTransform(def,battle.bossId,spriteW,spriteH);
  const canvasCenterX=_tf.ox+worldX*_tf.sx;
  const spriteLeft=battle.bx*W-spriteW/2;
  const worldCenterX=(spriteLeft+canvasCenterX)/W;
  const playerRight=battle.px+battle.playerWeaponRange;
  return playerRight>=worldCenterX;
}




function getAimTargetPos(){
  if(!battle) return {x:0.75, y:0.3};
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
  /* rev520: 手动点击瞄准点优先（u,v 归一化局部坐标），否则用层中心 */
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
  if(!battle) return false;
  const weak = BOSS_WEAKPOINTS[battle.bossId] || [];
  return weak.includes(battle.aimPart);
}

if(!state.preferences.bossTier) state.preferences.bossTier = {};
let _bossSelectedTier = state.preferences.bossTier;
function renderCombat(){
  const z1=$('#zone1'),z2=$('#zone2'),z3=$('#zone3');
  if(battle&&battle.active){
    try { renderBattleScene(z1); } catch(e){ console.error('[combat] scene:', e); if(z1) z1.innerHTML = '<div style="padding:20px;color:#e05252;font-size:12px">⚔️ Scene: ' + e.message + '</div>'; }
    try { renderBattleJoystick(z2); } catch(e){ console.error('[combat] joystick:', e); if(z2) z2.innerHTML = '<div style="padding:20px;color:#e05252;font-size:12px">🕹️ Joystick: ' + e.message + '</div>'; }
    try { renderBattleControls(z3); } catch(e){ console.error('[combat] controls:', e); if(z3) z3.innerHTML = '<div style="padding:20px;color:#e05252;font-size:12px">🎮 Controls: ' + e.message + '</div>'; }
    return;
  }
  const _BOSS_GROUPS=[{baseKey:'factory_king',regionName:'廢棄工廠'},{baseKey:'lab_queen',regionName:'廢棄實驗室'},{baseKey:'road_tyrant',regionName:'郊區公路'},{baseKey:'swamp_hydra',regionName:'輻射沼澤'},{baseKey:'core_omega',regionName:'廢土核心'}];
  const _isSweep = (state.preferences.bossMode === 'sweep');
  let listHtml='<div class="boss-list">';
  for(const _g of _BOSS_GROUPS){
    const _b1=BOSSES[_g.baseKey];if(!_b1)continue;
    const _b2=BOSSES[_g.baseKey+'_ii'];
    const _t2Exists=!!_b2;
    const _t2Unlocked=_t2Exists&&state.unlockedRegions.includes(_g.regionName+'II');
    let _curTier=_bossSelectedTier[_g.baseKey]||1;
    if(_curTier===2&&!_t2Unlocked)_curTier=1;
    const _b=_curTier===2?_b2:_b1;
    const _bid=_curTier===2?(_g.baseKey+'_ii'):_g.baseKey;
    const _seals1=Math.max(0,parseInt(state.seals[_b1.seal]||0,10));
    const _seals2=_b2?Math.max(0,parseInt(state.seals[_b2.seal]||0,10)):0;
    const _defeated=state.defeatedBosses.includes(_bid);
    let _can, _btnLabel;
    if(_isSweep){
      const _sw = _sweepMaxCount(_bid);
      _can = _sw.max > 0;
      _btnLabel = _can ? ('掃蕩 ×' + _sw.max) : (_sw.reason || '資源不足');
    } else {
        _can = _curTier === 2 ? _seals2 > 0 : _seals1 > 0;
        _btnLabel = _can ? '挑戰' : '無信物';
    }
    listHtml+=`<div class="boss-card ${_can?'':'locked'}"><div class="boss-avatar">${bossIcon(_bid)}</div><div class="boss-info"><div class="bn">${_b.name}${_defeated?' ✅':''}</div><div class="bd">甲 ${_b.armor} ｜ 生命 ${_b.hp}</div></div><div class="boss-tier-selector"><div class="boss-tier-btn ${_curTier===1?'on':''}" data-boss-key="${_g.baseKey}" data-tier="1"><div class="bt-label">I</div><div class="bt-seal">×${_seals1}</div></div>${_t2Exists?`<div class="boss-tier-btn ${_curTier===2?'on':''} ${_t2Unlocked?'':'locked'}" data-boss-key="${_g.baseKey}" data-tier="2"><div class="bt-label">${_t2Unlocked?'II':'🔒'}</div><div class="bt-seal">${_t2Unlocked?'×'+_seals2:'-'}</div></div>`:''}</div><button class="btn ${_can?'primary':''}" data-bid="${_bid}" ${_can?'':'disabled'} style="padding:8px 10px;font-size:11px;flex:0 0 auto">${_btnLabel}</button></div>`;
  }
  listHtml+='</div>';
  z1.innerHTML=listHtml;
  renderEquipZone(z2);
  renderCombatInfoPanel(z3);
  $$('.boss-tier-btn[data-boss-key]',z1).forEach(btn=>{btn.onclick=(e)=>{e.stopPropagation();if(btn.classList.contains('locked'))return;{const _bl=z1.querySelector('.boss-list');const _sp=_bl?_bl.scrollTop:0;_bossSelectedTier[btn.dataset.bossKey]=parseInt(btn.dataset.tier,10);save();renderCombat();const _bl2=z1.querySelector('.boss-list');if(_bl2)_bl2.scrollTop=_sp;}};});
  $$('.boss-card .btn',z1).forEach(btn=>{
    btn.onclick = () => {
      const _bid = btn.dataset.bid;
      if(state.preferences.bossMode === 'sweep'){ _openSweepDialog(_bid); }
      else { startBossBattle(_bid); }
    };
  });
}

function _getAmmoDefRarity(id, slot){
  if(slot === 'throwable'){
    let _best = null, _bi = -1;
    for(const _k in state.inventory){
      const _p = _k.split('@');
      if(_p[0] !== id) continue;
      const _i = RARITY_ORDER.indexOf(_p[1]);
      if(_i > _bi){ _bi = _i; _best = _p[1]; }
    }
    return _best || '一般';
  }
  const d = AMMO[id];
  return d ? d.rarity : '一般';
}
function renderCombatInfoPanel(z3){
  const slots = [
    {key:'primary', label:'主武器'},
    {key:'secondary', label:'副武器'},
    {key:'throwable', label:'投擲物'}
  ];
  let html = '<div class="z3-head"><div class="z3-title">⚔️ 彈藥準備</div></div>';
  html += '<div style="padding:2px 4px;font-size:9px;color:#7a6f60;line-height:1.2;flex:0 0 auto">依序設定優先彈種，留空則自動分配</div>';
  html += '<div style="flex:1;min-height:0;display:flex;flex-direction:column;justify-content:flex-start;padding:4px;gap:2px;overflow:hidden">';
  for(const s of slots){
    html += renderAmmoOrderRow(s.key, s.label);
  }
  html += '</div>';
  z3.innerHTML = html;
  z3.querySelectorAll('.ammo-slot').forEach(el=>{
    el.onclick = () => { openAmmoPicker(el.dataset.slot, parseInt(el.dataset.idx, 10)); };
  });
}

function getEquippedCal(slot){
  const id = state.player.equipped[slot];
  if(!id) return null;
  const def = itemDef(id);
  if(!def) return null;
  return def.cal || null;
}
function getAvailableAmmoForSlot(slot){
  if(slot === 'throwable'){
    const list = [];
    for(const k in state.inventory){
      const parts = k.split('@');
      const id = parts[0], rar = parts[1];
      const d = WEAPONS[id];
      if(!d || d.slot !== 'throwable') continue;
      const cnt = state.inventory[k];
      if(cnt <= 0) continue;
      list.push({id, rarity: rar, count: cnt, def: d});
    }
    return list;
  }
  const cal = getEquippedCal(slot);
  if(!cal) return [];
  const list = [];
  for(const k in state.inventory){
    const parts = k.split('@');
    const id = parts[0], rar = parts[1];
    const d = AMMO[id];
    if(!d || d.cal !== cal) continue;
    const cnt = state.inventory[k];
    if(cnt <= 0) continue;
    /* 稀有度從 AMMO 定義讀取，確保顯示與定義一致 */
    list.push({id, rarity: d.rarity, count: cnt, def: d});
  }
  return list;
}
function getAmmoShortName(id, slot){
  if(slot === 'throwable'){
    const d = WEAPONS[id];
    return d ? d.name.substring(0, 6) : '?';
  }
  const d = AMMO[id];
  if(!d) return '?';
  const parts = d.name.split(' ');
  return parts.length > 1 ? parts[parts.length - 1] : d.name;
}
function renderAmmoOrderRow(slot, label){
  const equipped = state.player.equipped[slot];
  const order = getAmmoOrder(slot);
  /* rev537: 过滤背包中已不存在的弹种 */
  const available = equipped ? getAvailableAmmoForSlot(slot) : [];
  const availableSet = {};
  for(const _a of available) availableSet[_a.id] = true;
  /* rev120: 标签与 3 个格子一起参与 space-between，均分 3 个间距 */
  let html = '<div class="ammo-order-row" style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;padding-right:18px">';
  html += '<div class="lbl" style="flex:0 0 18px;font-size:10px;color:#e8a33d;font-weight:bold;padding-top:10px;text-align:center;writing-mode:vertical-rl;text-orientation:upright;line-height:1;letter-spacing:1px">' + label + '</div>';
  for(let i = 0; i < 3; i++){
    let aid = order[i];
    if(aid && !availableSet[aid]) aid = null;
    let inner = '<span class="empty-lbl" style="font-size:10px;color:#5a5040">空</span>';
    let bgStyle = 'background:#1a1510;border-color:#3a2f25;';
    if(aid){
      const rar = _getAmmoDefRarity(aid, slot);
      bgStyle = 'background:' + rarityBg(rar) + ';border-color:#8a5f18;';
      const nm = getAmmoShortName(aid, slot);
      inner = itemIcon(aid, 26) + '<div class="nm" style="font-size:7px;color:#e8a33d;line-height:1;text-align:center;max-width:40px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;font-weight:bold;margin-top:1px">' + nm + '</div>';
    }
    const dis = !equipped ? 'opacity:.35;pointer-events:none;' : '';
    html += '<div class="ammo-slot" data-slot="' + slot + '" data-idx="' + i + '" style="box-sizing:border-box;width:46px;height:46px;min-width:46px;max-width:46px;min-height:46px;max-height:46px;flex:0 0 auto;display:flex;flex-direction:column;align-items:center;justify-content:center;border:1px solid #3a2f25;border-radius:4px;overflow:hidden;position:relative;cursor:pointer;padding:0;' + bgStyle + dis + '">' + inner + '</div>';
  }
  html += '</div>';
  return html;
}
function openAmmoPicker(slot, idx){
  const equipped = state.player.equipped[slot];
  if(!equipped){  return; }
  const available = getAvailableAmmoForSlot(slot);
  if(!available.length){ openModal({title: '選擇彈種（優先級 ' + (idx + 1) + '）', body: '<div class="empty-hint">沒有可用的彈藥</div>'}); return; }
  available.sort((a, b) => {
    const ra = RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity);
    if(ra !== 0) return ra;
    return (a.def.name || '').localeCompare(b.def.name || '');
  });
  let body = '';
  for(const it of available){
    let statLine = '';
    if(slot === 'throwable'){
      statLine = it.rarity + ' · 傷害 ' + (it.def.dmg || 0) + ' · 穿甲 ' + (it.def.pen || 0) + ' · 庫存 ' + it.count;
    } else {
      statLine = it.rarity + ' · 穿甲 ' + (it.def.pen || 0) + ' · 傷害 ' + (it.def.dmg || 0) + ' · 庫存 ' + it.count;
    }
    body += '<div class="item-row" data-amid="' + it.id + '" data-rar="' + it.rarity + '"><div class="icon" style="background:' + rarityBg(it.rarity) + '">' + itemIcon(it.id, 30) + '</div><div class="info"><div class="nm ' + rarityClass(it.rarity) + '">' + it.def.name + '</div><div class="sub">' + statLine + '</div></div></div>';
  }
  const bd = openModal({title: '選擇彈種（優先級 ' + (idx + 1) + '）', body});
  bd.querySelectorAll('.item-row').forEach(row => {
    row.onclick = () => {
      const aid = row.dataset.amid;
      let order = getAmmoOrder(slot).slice();
      while(order.length < 3) order.push(null);
      for(let i = 0; i < order.length; i++){ if(order[i] === aid) order[i] = null; }
      order[idx] = aid;
      while(order.length && !order[order.length - 1]) order.pop();
      setAmmoOrder(slot, order);
      closeModal();
      renderCombatInfoPanel(document.getElementById('zone3'));
    };
  });
}

function renderBattleScene(z1){
  const b=battle;
  const rLeft=b.px*100;
  const rRight=Math.min(1,(b.px+(b.playerWeaponRange||0.5)))*100;
  const rWidth=rRight-rLeft;
  const totalHp=b.bossMaxHp+b.bossMaxArmor;
  const dealtPct=Math.min(100,(b.damageDealt/totalHp)*100);
  z1.innerHTML=`
    <div class="battle-scene">
      <div class="battle-bg" style="background-image:url('${getBossBgPath(b.bossId)}')"></div>
      <div class="range-indicator" id="range-indicator" style="left:${rLeft}%;width:${rWidth}%"></div>
      <div class="damage-header"><div>對 Boss 傷害 <span class="num">${Math.round(b.damageDealt)}</span> / ${totalHp}</div><div class="bar"><div class="fill" id="dmg-bar" style="width:${dealtPct}%"></div></div></div>
      <div class="fighter boss-f" id="fighter-boss" style="left:${b.bx*100}%;top:${b.by*100}%">
        <div class="hpbar-wrap${(b.shieldMaxHp>0 && !b.shieldBroken) ? ' has-shield' : ''}" id="boss-hpbar-wrap"><div class="nm">${b.bossName}${(b.bossId.indexOf("_ii")>=0 && b.bossName.indexOf("II") === -1)?" II":""}</div>${(b.shieldMaxHp>0 && !b.shieldBroken) ? `<div class="shield-bar-wrap" id="shield-bar-wrap"><div class="bar"><div class="fill" id="boss-shield" style="width:${(b.shieldHp/b.shieldMaxHp*100)}%"></div></div></div>` : ''}<div class="bar ap"><div class="fill" id="boss-ap" style="width:${(b.bossArmor/b.bossMaxArmor*100)}%"></div></div><div class="bar hp"><div class="fill" id="boss-hp" style="width:${(b.bossHp/b.bossMaxHp*100)}%"></div></div></div>
        <div class="sprite" id="boss-sprite">${BOSS_LAYERS[b.bossId] ? '<canvas id="boss-battle-canvas"></canvas>' : bossIcon(b.bossId)}</div>
      </div>
      <div class="fighter hero-f" id="fighter-hero" style="left:${b.px*100}%;top:${b.py*100}%">
        <div class="hpbar-wrap"><div class="nm">玩家</div><div class="bar ap"><div class="fill" id="hero-ap" style="width:${(b.playerArmor/b.playerMaxArmor*100)}%"></div></div><div class="bar hp"><div class="fill" id="hero-hp" style="width:${(b.playerHp/b.playerMaxHp*100)}%"></div></div></div>
        <div class="sprite" id="hero-sprite"><canvas id="hero-battle-canvas"></canvas></div>
      </div>
      <div class="head-bars" id="head-bars"></div>
      <div id="battle-fx"></div>
    </div>`;
  updateFighterPos();
  requestAnimationFrame(()=>{
    if(battle) battle.lastH = 0;
    renderBattleHeroCanvas();
    renderBossBattleCanvas();
  });
  const bs=$('#boss-sprite');
  if(bs) _bindBattleTap(bs, function(e){
    /* rev303: touchstart/click 兼容，正確取座標 */
    let _cx, _cy;
    if(e.changedTouches && e.changedTouches[0]){ _cx = e.changedTouches[0].clientX; _cy = e.changedTouches[0].clientY; }
    else if(e.touches && e.touches[0]){ _cx = e.touches[0].clientX; _cy = e.touches[0].clientY; }
    else { _cx = e.clientX; _cy = e.clientY; }
    if(typeof _cx !== 'number' || typeof _cy !== 'number' || isNaN(_cx) || isNaN(_cy)) return;

    const bossSprite = document.getElementById('boss-sprite');
    if(!bossSprite) return;
    const def = BOSS_LAYERS[battle.bossId];
    if(!def) return;
    const scene = document.querySelector('.battle-scene');
    if(!scene) return;
    const sceneRect = scene.getBoundingClientRect();
    const spriteRect = bossSprite.getBoundingClientRect();
    const spriteX = _cx - spriteRect.left;
    const spriteY = _cy - spriteRect.top;
    const _tf = getBossCanvasTransform(def, battle.bossId, spriteRect.width, spriteRect.height);
    const canvasX = (spriteX - _tf.ox) / _tf.sx;
    const canvasY = (spriteY - _tf.oy) / _tf.sy;
    const part = pickAimPartFromClick(canvasX, canvasY);
    if(part){
      battle.aimPart = part;
      /* rev520: 记录点击局部归一化位置（手动瞄准打点击处，而非区块中心） */
      try {
        const _def = BOSS_LAYERS[battle.bossId];
        const _anims = BOSS_ANIMS[battle.bossId];
        const _anim = _anims ? (_anims[battleBossAnim.name] || _anims.idle) : null;
        if(_def && _anim){
          const _fi = ((battleBossAnim.frame % _anim.frameCount) + _anim.frameCount) % _anim.frameCount;
          const _L = _def.layers.find(function(l){ return l.id === part; });
          if(_L){
            const _k = (_anim.keys && _anim.keys[part] && _anim.keys[part][_fi]) || {rot:0,dx:0,dy:0};
            const _w = _def.canvas.w * (_k.w !== undefined ? _k.w : _L.w);
            const _h = _def.canvas.h * (_k.h !== undefined ? _k.h : _L.h);
            const _px = _w * _L.pivot.x;
            const _py = _h * _L.pivot.y;
            const _world = resolveBossWorld(_def, _anim, _fi);
            const _wp = _world[part];
            if(_wp && _w > 0 && _h > 0){
              const _angle = -_wp.rot * BOSS_DEG2RAD;
              const _cosA = Math.cos(_angle), _sinA = Math.sin(_angle);
              const _dx = canvasX - _wp.wx;
              const _dy = canvasY - _wp.wy;
              const _localX = _dx * _cosA - _dy * _sinA + _px;
              const _localY = _dx * _sinA + _dy * _cosA + _py;
              battle.aimLocal = { part: part, u: _localX / _w, v: _localY / _h };
            }
          }
        }
      } catch(e){ console.warn('[aimLocal]', e); battle.aimLocal = null; }
      const fx = document.getElementById('battle-fx');
      if(fx){
        const old = document.getElementById('aim-marker');
        if(old) old.remove();
        const m = document.createElement('div');
        m.className = 'aim-marker';
        m.id = 'aim-marker';
        m.style.left = ((_cx - sceneRect.left) / sceneRect.width * 100) + '%';
        m.style.top  = ((_cy - sceneRect.top)  / sceneRect.height * 100) + '%';
        fx.appendChild(m);
        setTimeout(()=>{ if(m.parentNode) m.remove(); }, 1000);
      }
    }
  
  });
}
/* rev543: 按 idle 顶部像素动态调整血条 / 盾条位置（贴合角色头顶） */
function updateBossHpbarPos(){
  if(!battle) return;
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
  /* hpbar 底部距 fighter 底部 = spriteH - topPx + 4（4px 间隙） */
  /* rev544: 血条与角色头顶间距 4px → 14px，避免遮挡 Boss 头顶元素 */
  const _hpBottom = Math.max(14, spriteH - topPx + 14);
  const hpWrap = document.getElementById('boss-hpbar-wrap');
  if(hpWrap) hpWrap.style.bottom = _hpBottom + 'px';
  /* rev546: 盾条 / nm 均在 hpbar-wrap 内部 normal flow，由 flex 排版，无需单独定位 */
}

function updateFighterPos(){
  if(!battle)return;
  const h=$('#fighter-hero'),b=$('#fighter-boss');
  if(h){h.style.left=(battle.px*100)+'%';h.style.top=(battle.py*100)+'%';}
  if(b){b.style.left=(battle.bx*100)+'%';b.style.top=(battle.by*100)+'%';}
  const ri=$('#range-indicator');
  if(ri){const r=battle.playerWeaponRange||0.5;const rLeft=battle.px*100;const rRight=Math.min(1,(battle.px+r))*100;ri.style.left=rLeft+'%';ri.style.width=(rRight-rLeft)+'%';}
  const dmgBar=$('#dmg-bar');
  if(dmgBar){const totalHp=battle.bossMaxHp+battle.bossMaxArmor;dmgBar.style.width=Math.min(100,(battle.damageDealt/totalHp)*100)+'%';}
  const dmgHd=$('.damage-header');
  if(dmgHd){dmgHd.querySelector('.num').textContent=Math.round(battle.damageDealt);}
  /* rev543: 血条 / 盾条跟随角色顶部 */
  if(typeof updateBossHpbarPos === 'function') updateBossHpbarPos();
}
function renderBattleJoystick(z2){
  z2.innerHTML=`<div class="joystick" id="joystick"><div class="stick" id="stick"></div></div><div class="z2-hint">拖動搖桿左右移動</div>`;
  const joy=$('#joystick'),stick=$('#stick');
  let touchId=null,cx,cy,radius;
  /* rev93/rev94: 供外部取消當前搖桿會話 */
  if(battle){
    battle._joystickCancel = function(){ touchId = null; };
  }
  function start(e){
    /* rev108: 搖桿輸入不再打斷射擊（射擊優先級最高） */
    const r=joy.getBoundingClientRect();
    cx=r.left+r.width/2; cy=r.top+r.height/2; radius=r.width/2;
    const t=e.changedTouches?e.changedTouches[0]:e;
    touchId=e.changedTouches?t.identifier:null;
    move(e);
  }
  function move(e){
    if(!battle||!battle.active)return;
    /* rev93: 外部已取消會話 → 忽略後續 touchmove（直到重新按下） */
    if(e.changedTouches && touchId===null) return;
    /* rev108: 搖桿輸入僅打斷治療；不再打斷換彈/射擊（射擊優先級最高） */
    if(battle.consuming) interruptHeal();
    let t=e;if(e.changedTouches)t=Array.from(e.changedTouches).find(x=>x.identifier===touchId)||e.changedTouches[0];
    let dx=t.clientX-cx;let dy=t.clientY-cy;
    const dist=Math.sqrt(dx*dx+dy*dy);
    if(dist>radius){dx=dx/dist*radius;dy=dy/dist*radius;}
    stick.style.left=(radius+dx)+'px';stick.style.top=(radius+dy)+'px';stick.style.transform='translate(-50%,-50%)';
    battle.moveDir=dx/radius;
  }
  function end(e){
    if(e.changedTouches&&touchId!==null){const found=Array.from(e.changedTouches).find(x=>x.identifier===touchId);if(!found)return;}
    touchId=null;if(battle){battle.moveDir=0;}
    stick.style.left='50%';stick.style.top='50%';
  }
  joy.addEventListener('touchstart',e=>{e.preventDefault();start(e);},{passive:false});
  joy.addEventListener('touchmove',e=>{e.preventDefault();move(e);},{passive:false});
  joy.addEventListener('touchend',e=>{e.preventDefault();end(e);},{passive:false});
  joy.addEventListener('touchcancel',e=>end(e));
  joy.addEventListener('mousedown',e=>{start(e);const mm=ev=>move(ev);const mu=()=>{end({});document.removeEventListener('mousemove',mm);document.removeEventListener('mouseup',mu);};document.addEventListener('mousemove',mm);document.addEventListener('mouseup',mu);});
}
function buildBattleWeaponInfo(){
  if(!battle) return '無武器';
  const w=battle.weapon, wdef=w?w.def:null;
  if(!wdef) return '無武器';
  if(wdef.slot==='melee') return `${wdef.name} ｜ 近戰`;
  if(wdef.slot==='throwable') return `${wdef.name} ｜ ×${getThrowableCount()}`;
  const ammoTotal=battle.ammoRef?battle.ammoRef.count:0;
  let rarityIcon='';
  if(battle.ammoRef){
    const rr=battle.ammoRef.rarity;
    rarityIcon=`<span class="${rarityClass(rr)}" style="font-size:13px;margin:0 5px;vertical-align:middle">${RARITY_ICON[rr]||'●'}</span>`;
  }
  return `${wdef.name} ｜ ${battle.ammoInMag}/${wdef.mag||0}${rarityIcon}備彈 ${ammoTotal}${battle.reloading?'｜裝填中…':''}`;
}
function refreshBattleControlsLive(){
  if(!battle) return;
  const info=document.getElementById('battle-ammo-info');
  if(info) info.innerHTML=buildBattleWeaponInfo();
  const fb=document.getElementById('fire-btn');
  if(fb){
    const canFire=!battle.reloading&&!battle.consuming;
    fb.classList.toggle('disabled',!canFire);
    fb.textContent=battle.reloading?'裝填':(battle.consuming?'使用中':'攻擊');
  }
  const hb=document.getElementById('heal-btn');
  if(hb){
    const now=performance.now();
    const canHeal = !battle.consuming && !battle.reloading && now >= (battle.healDisabledUntil||0) && battle.playerHp < battle.playerMaxHp;
    hb.classList.toggle('disabled', !canHeal);
  }
  const ds=document.getElementById('battle-dmg-status');
  if(ds) ds.textContent=`對 Boss 傷害：${Math.round(battle.damageDealt)} ｜ ${battle.engaged?'⚔️ 已交戰':'⏸️ 準備中'}`;
}
/* rev273: 戰鬥按鈕 touchstart（避免搖桿 preventDefault 鎖死 click） */
function _bindBattleTap(el, handler){
  let _lastTouch = 0;
  el.addEventListener("touchstart", function(e){
    e.preventDefault();
    e.stopPropagation();
    _lastTouch = Date.now();
    var _t = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]);
    if(_t){
      handler({
        clientX: _t.clientX,
        clientY: _t.clientY,
        pageX: _t.pageX,
        pageY: _t.pageY,
        target: e.target,
        currentTarget: e.currentTarget,
        touches: e.touches,
        changedTouches: e.changedTouches,
        preventDefault: function(){},
        stopPropagation: function(){}
      });
    } else {
      handler(e);
    }
  }, {passive: false});
  el.addEventListener("click", function(e){
    if(Date.now() - _lastTouch < 500) return;
    handler(e);
  });
}

function renderBattleControls(z3){
  const w=battle.weapon;
  const wdef=w?w.def:null;
  const _allModes=wdef&&wdef.modes?wdef.modes:['點射'];
  /* v55-burst-whitelist: 只有現實中有短點射的槍才顯示短點射按鈕 */
  const _BURST_WHITELIST=['ak12'];
  const _wid=battle.weapon?battle.weapon.id:'';
  let _baseId=_wid;
  if(_wid && _wid.indexOf('named_')===0){ const _p=_wid.split('_'); if(_p.length>=2) _baseId=_p[1]; }
  const modes=_allModes.filter(function(m){
    if(m==='長點射') return false;
    if(m==='短點射' && _BURST_WHITELIST.indexOf(_baseId)===-1) return false;
    return true;
  });
  if(modes.indexOf(battle.fireMode)===-1) battle.fireMode=modes[0]||'點射';
  const canFire=!battle.reloading&&!battle.consuming;
  z3.innerHTML=`
    <div class="ctrl-wrap">
      <div class="ammo-info" id="battle-ammo-info">${buildBattleWeaponInfo()}</div>
      <div class="fire-modes">${modes.map(m=>`<div class="fm-btn ${m===battle.fireMode?'on':''}" data-mode="${m}">${m}</div>`).join('')}</div>
      <div style="display:flex;gap:4px">
        <div class="weapon-slot-btn ${battle.weaponSlot==='primary'?'on':''}" data-slot="primary" style="flex:1">主武器</div>
        <div class="weapon-slot-btn ${battle.weaponSlot==='secondary'?'on':''}" data-slot="secondary" style="flex:1">副武器</div>
        <div class="weapon-slot-btn ${battle.weaponSlot==='melee'?'on':''}" data-slot="melee" style="flex:1">近戰</div>
        <div class="weapon-slot-btn ${battle.weaponSlot==='throwable'?'on':''}" data-slot="throwable" style="flex:1">投擲</div>
      </div>
      <div style="flex:1;display:flex;align-items:center;justify-content:center;gap:40px;">
        <div class="heal-btn" id="heal-btn">✚</div>
        <div class="fire-btn ${canFire?'':'disabled'}" id="fire-btn">${battle.reloading?'裝填':(battle.consuming?'使用中':'攻擊')}</div>
      </div>
      <div class="ammo-info" id="battle-dmg-status" style="color:#7a6f60">對 Boss 傷害：${Math.round(battle.damageDealt)} ｜ ${battle.engaged?'⚔️ 已交戰':'⏸️ 準備中'}</div>
    </div>`;
  $$('.fm-btn',z3).forEach(b=>{
    _bindBattleTap(b, function(){
      if(!battle) return;
      battle.fireMode = b.dataset.mode;
      battle.fireHeld = false;
      battle.burstLeft = 0;
      renderBattleControls(document.getElementById('zone3'));
    });
  });
  $$('.weapon-slot-btn',z3).forEach(b=>{
    _bindBattleTap(b, function(){ switchBattleWeapon(b.dataset.slot); });
  });
  const fb=$('#fire-btn');
  if(fb){
    fb.addEventListener('touchstart',e=>{e.preventDefault();startPlayerFire();},{passive:false});
    fb.addEventListener('touchend',e=>{e.preventDefault();stopPlayerFire();},{passive:false});
    fb.addEventListener('touchcancel',()=>{stopPlayerFire();});
    fb.addEventListener('mousedown',e=>{e.preventDefault();startPlayerFire();});
    fb.addEventListener('mouseup',()=>{stopPlayerFire();});
    fb.addEventListener('mouseleave',()=>{stopPlayerFire();});
  }
  const hb=$('#heal-btn');
  if(hb){
    hb.addEventListener('touchstart',e=>{e.preventDefault();manualHeal();},{passive:false});
    hb.addEventListener('mousedown',e=>{e.preventDefault();manualHeal();});
  }
  refreshBattleControlsLive();
}
function switchBattleWeapon(slot){
  /* rev108: 允許移動中換武器 —— 不再重置搖桿 */
  /* ★ v17.5 更換武器時清空該槽位的彈藥準備 */
  /* v39: 不再清空，改為按武器分開存 */
  if(slot==='throwable'&&getThrowableCount()<=0){ensureThrowableFromBackpack();}
  const w=equippedWeapon(slot);if(!w||!itemDef(w.id))return;
  const def=itemDef(w.id);
  battle.weaponStates=battle.weaponStates||{};
  if(battle.weaponSlot){battle.weaponStates[battle.weaponSlot]={ammoInMag:battle.ammoInMag,ammoRef:battle.ammoRef,fireMode:battle.fireMode};}
  if(battle.reloading){battle.reloading=false;}
  battle.weapon=w;battle.weaponSlot=slot;
  const _prevSt=battle.weaponStates[slot];
  if(_prevSt&&_prevSt.fireMode&&def.modes&&def.modes.includes(_prevSt.fireMode)){battle.fireMode=_prevSt.fireMode;}
  else{battle.fireMode=def.modes?def.modes[0]:'點射';}
  battle.fireHeld=false;
  battle.burstLeft=0;
  battle.playerWeaponRange=def.range||0.5;
  const prevSt=battle.weaponStates[slot];
  if(prevSt){battle.ammoInMag=prevSt.ammoInMag||0;battle.ammoRef=prevSt.ammoRef;}
  else if(def.cal){
    const ammo=pickAmmoByPreferenceOrOrder(def.cal,'combat');
    if(!ammo){battle.ammoRef=null;battle.ammoInMag=0;}
    else{
      const need=def.mag||30;
      const take=Math.min(need, ammo.count);
      invRemove(ammo.id, ammo.rarity, take);
      battle.ammoRef={id:ammo.id, rarity:ammo.rarity, count:ammo.count - take};
      battle.ammoInMag=take;
    }
    battle.weaponStates[slot]={ammoInMag:battle.ammoInMag,ammoRef:battle.ammoRef};
  }
  else{battle.ammoRef=null;battle.ammoInMag=def.slot==='throwable'?getThrowableCount():1;battle.weaponStates[slot]={ammoInMag:battle.ammoInMag,ammoRef:null};}
  {
    const _swAnim = (slot === 'secondary') ? 'switch_secondary'
      : (slot === 'melee') ? 'switch_melee' : 'idle';
    const _swDur = (slot === 'primary') ? 0 : 900;
    if(battleHeroAnim.name !== _swAnim){
      battleHeroAnim.name = _swAnim;
      battleHeroAnim.frame = 0;
    }
    battleHeroAnim.lastUpdate = performance.now();
    battleHeroAnim.forcedEnd = performance.now() + _swDur;
  }
  renderBattleControls($('#zone3'));
}

function defaultAimPartForBoss(bossId){
  const def = BOSS_LAYERS[bossId];
  if(!def) return null;
  const torso = def.layers.find(l => l.id === 'torso');
  if(torso) return 'torso';
  /* rev518: 优先 body（生物本体），避免面积最大的地面装饰层（如 swamp）被选为默认瞄准点 */
  const body = def.layers.find(l => l.id === 'body');
  if(body) return 'body';
  let best = null, bestArea = 0;
  for(const L of def.layers){
    const a = L.w * L.h;
    if(a > bestArea){ bestArea = a; best = L.id; }
  }
  return best;
}



function startBossBattle(bid){
  const b=BOSSES[bid];if(!b)return;
  const seals=Math.max(0,parseInt(state.seals[b.seal]||0,10));
  if(seals<=0) return;
  state.seals[b.seal]=seals-1;
  state.player.hp=state.player.maxHp;
  state.player.armor=state.player.maxArmor;
  refreshPlayerStats();
  const w=chooseCombatWeapon('combat');
  const startSlot=w?w.slot:'melee';
  const _isRT=(bid==='road_tyrant'||bid==='road_tyrant_ii');
  const _isCO=(bid==='core_omega'||bid==='core_omega_ii');
  const _hasShield=(_isRT||_isCO);
  const _shieldHp=_isRT?12500:(_isCO?30000:0);
  battle={active:true,bossId:bid,bossName:b.name,bossHp:b.hp,bossMaxHp:b.hp,bossArmor:b.armor,bossMaxArmor:b.armor,bossDmg:b.dmg,bossDmgMult:1,bossPen:b.pen||0,bossCritRate:b.critRate||0,bossCritMult:b.critMult||1,
    phaseIdx:0, healedPhases:[], skillCds:null, bossCast:null, bossDash:null, lastMeleeAt:0,
    shieldMaxHp:_shieldHp, shieldHp:_shieldHp, shieldBroken:false, bossRetreat:null,
    playerHp:state.player.hp,playerMaxHp:state.player.maxHp,playerArmor:state.player.armor,playerMaxArmor:Math.max(1,state.player.maxArmor),
    px:0.15,py:0.75,bx:0.75,by:0.25,moveDir:0,bullets:[],firing:false,reloading:false,consuming:false,
    lastShot:0,damageDealt:0,weapon:null,weaponSlot:null,playerWeaponRange:0.5,fireMode:'點射',fireHeld:false,burstLeft:0,
    ammoRef:null,ammoInMag:0,weaponStates:{},engaged:false,engagedRange:0.35,startTime:Date.now(),
    aimPart:defaultAimPartForBoss(bid),lastManualClick:0,
    players:[{id:'local',isLocal:true}],lastH:0,
    healDisabledUntil:0,healTimer:null,autoHealing:false,chainShots:0,lastShotTime:0,chainResetMs:600,shotLockUntil:0};
  if(bid==='swamp_hydra'||bid==='swamp_hydra_ii') initHydraHeads();
  if(bid==='core_omega'||bid==='core_omega_ii') initOmegaArms();
  battleHeroAnim.name='idle';
  battleHeroAnim.frame=0;
  battleHeroAnim.lastUpdate=performance.now();
  battleHeroAnim.forcedEnd=0;
  battleBossAnim.name='idle';
  battleBossAnim.frame=0;
  battleBossAnim.lastUpdate=performance.now();
  battleBossAnim.forcedEnd=0;
  switchBattleWeapon(startSlot);
  renderCombat();
  battle.lastTime=performance.now();
  requestAnimationFrame(battleLoop);
}



/* ============================================================
   Boss 扫荡系统（rev575：zone1 内演出 + 直观弹窗）
   ============================================================ */

function _bossLevel(bid){
  const baseSeq = { factory_king: 1, lab_queen: 2, road_tyrant: 3, swamp_hydra: 4, core_omega: 5 };
  const isII = bid.endsWith('_ii');
  const baseId = isII ? bid.slice(0, -3) : bid;
  const seq = baseSeq[baseId] || 1;
  return isII ? seq * 2 : seq;
}

function _sweepMaxCount(bid){
  const b = BOSSES[bid];
  if(!b) return { max: 0, reason: 'Boss 不存在' };
  if(!Array.isArray(state.defeatedBosses) || !state.defeatedBosses.includes(bid)){
    return { max: 0, reason: '需先擊敗' };
  }
  const level = _bossLevel(bid);
  const perLiquor = level * 50;
  const perAmmo = level * 500;
  const perSeals = 1;
  const seals = Math.max(0, parseInt(state.seals[b.seal] || 0, 10));
  const liquor = (typeof _gardenLiquorValue === 'function') ? _gardenLiquorValue() : 0;
  const ammo = (typeof _garageAmmoEquiv === 'function') ? _garageAmmoEquiv() : 0;
  const maxBySeals = Math.floor(seals / perSeals);
  const maxByLiquor = Math.floor(liquor / perLiquor);
  const maxByAmmo = Math.floor(ammo / perAmmo);
  const max = Math.min(maxBySeals, maxByLiquor, maxByAmmo);
  let reason = '';
  if(max <= 0){
    if(maxBySeals <= 0) reason = '信物不足';
    else if(maxByLiquor <= 0) reason = '私酒不足';
    else if(maxByAmmo <= 0) reason = '彈藥不足';
    else reason = '資源不足';
  }
  return {
    max: Math.max(0, max),
    level, perSeals, perLiquor, perAmmo,
    seals, liquor, ammo,
    maxBySeals, maxByLiquor, maxByAmmo,
    reason
  };
}

function _sweepExpTarget(){
  const g = (typeof _garageInitState === 'function') ? _garageInitState() : null;
  if(!g) return 'btr80';
  const cur = g.currentVehicle || 'btr80';
  const curDef = VEHICLES[cur];
  const isTopTier = !curDef || !curDef.next || curDef.next.length === 0;
  if(isTopTier && g.researchTarget && VEHICLES[g.researchTarget]){
    return g.researchTarget;
  }
  return cur;
}

function _rollSweepLoot(bid){
  const b = BOSSES[bid];
  if(!b || !b.drops) return [];
  const drops = pickN(b.drops, Math.min(2, b.drops.length));
  const result = [];
  for(const did of drops){
    const dd = itemDef(did);
    if(!dd) continue;
    const rar = rollRarity();
    invAdd(did, rar, 1);
    result.push({ id: did, rarity: rar, count: 1 });
  }
  return result;
}

/* ★ 扫荡弹窗：参考建筑升级页 style */
function _openSweepDialog(bid){
  const sw = _sweepMaxCount(bid);
  if(sw.max <= 0){
    if(typeof notify === 'function') notify(sw.reason || '資源不足', 'err');
    return;
  }
  const b = BOSSES[bid];

  let h = '';
  h += '<div class="detail-title">' + bossIcon(bid) + ' ' + b.name + ' <span style="font-size:12px;color:#7a6f60;font-weight:normal;margin-left:4px">Lv.' + sw.level + '</span></div>';
  h += '<div class="detail-sub">批量掃蕩 · 每次約 3.5 秒</div>';

  h += '<div class="divider"></div>';
  h += '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px">';
  h += '<span style="font-size:11px;color:#e8a33d;font-weight:bold">掃蕩次數</span>';
  h += '<span style="font-size:16px;font-weight:bold;color:#fff"><span id="sweep-count-val" style="color:#e8a33d">1</span><span style="color:#5a5040;font-size:13px"> / ' + sw.max + '</span></span>';
  h += '</div>';
  h += '<input type="range" id="sweep-count" min="1" max="' + sw.max + '" value="1" style="width:100%;accent-color:#e8a33d;margin:0 0 2px 0;">';

  h += '<div class="divider"></div>';
  h += '<div style="font-size:11px;color:#e8a33d;font-weight:bold;margin-bottom:6px">總計消耗</div>';
  h += '<div class="stat-line"><span class="k">Boss 信物</span><span class="v" id="sweep-total-seals"></span></div>';
  h += '<div class="stat-line"><span class="k">私酒等值</span><span class="v" id="sweep-total-liquor"></span></div>';
  h += '<div class="stat-line"><span class="k">彈藥等值</span><span class="v" id="sweep-total-ammo"></span></div>';

  h += '<div class="divider"></div>';
  h += '<div style="font-size:11px;color:#e8a33d;font-weight:bold;margin-bottom:6px">預計獲得</div>';
  h += '<div class="stat-line"><span class="k">載具經驗</span><span class="v" id="sweep-total-exp" style="color:#4caf50">+' + (sw.level * 100) + '</span></div>';
  h += '<div class="stat-line"><span class="k">掉落</span><span class="v" id="sweep-total-loot" style="color:#4caf50">' + (1 * 2) + ' 件</span></div>';

  const ft = document.createElement('div');
  ft.className = 'modal-ft';
  ft.innerHTML = '<button class="btn primary" id="sweep-go">掃蕩</button><button class="btn ghost" id="sweep-cancel">取消</button>';
  const bd = openModal({ title: '掃蕩 ' + b.name, body: h, footer: ft });

  const _fmt = function(n){ return Math.floor(n); };
  const _renderTotals = function(c){
    // 总计消耗（每次 × c → 剩余）
    const totalSeals = sw.perSeals * c;
    const totalLiq = sw.perLiquor * c;
    const totalAmmo = sw.perAmmo * c;
    const remSeals = sw.seals - totalSeals;
    const remLiq = _fmt(sw.liquor) - totalLiq;
    const remAmmo = _fmt(sw.ammo) - totalAmmo;
    const okSeals = remSeals >= 0;
    const okLiq = remLiq >= 0;
    const okAmmo = remAmmo >= 0;
    const _cls = function(ok){ return ok ? '#4caf50' : '#e05252'; };
    bd.querySelector('#sweep-total-seals').innerHTML = '<span style="color:' + _cls(okSeals) + '">×' + totalSeals + '</span> <span style="color:#5a5040">→</span> 剩 <span style="color:' + _cls(okSeals) + '">' + remSeals + '</span>';
    bd.querySelector('#sweep-total-liquor').innerHTML = '<span style="color:' + _cls(okLiq) + '">×' + totalLiq + '</span> <span style="color:#5a5040">→</span> 剩 <span style="color:' + _cls(okLiq) + '">' + remLiq + '</span>';
    bd.querySelector('#sweep-total-ammo').innerHTML = '<span style="color:' + _cls(okAmmo) + '">×' + totalAmmo + '</span> <span style="color:#5a5040">→</span> 剩 <span style="color:' + _cls(okAmmo) + '">' + remAmmo + '</span>';
    bd.querySelector('#sweep-total-exp').textContent = '+' + (sw.level * 100 * c);
    bd.querySelector('#sweep-total-loot').textContent = (c * 2) + ' 件';
    bd.querySelector('#sweep-count-val').textContent = c;
  };
  _renderTotals(1);
  const slider = bd.querySelector('#sweep-count');
  slider.oninput = function(){
    const c = parseInt(slider.value, 10) || 1;
    _renderTotals(c);
  };

  ft.querySelector('#sweep-cancel').onclick = function(){ closeModal(); };
  ft.querySelector('#sweep-go').onclick = function(){
    const c = parseInt(slider.value, 10) || 1;
    closeModal();
    _executeSweep(bid, c);
  };
}

function _executeSweep(bid, count){
  const sw = _sweepMaxCount(bid);
  if(count < 1 || sw.max < count){
    if(typeof notify === 'function') notify('資源不足', 'err');
    return;
  }
  const b = BOSSES[bid];
  state.seals[b.seal] = parseInt(state.seals[b.seal] || 0, 10) - count;
  if(typeof _consumeLiquorByValue === 'function') _consumeLiquorByValue(sw.perLiquor * count);
  if(typeof _consumeAmmoByValue === 'function') _consumeAmmoByValue(sw.perAmmo * count);
  if(typeof save === 'function') save();

  const g = (typeof _garageInitState === 'function') ? _garageInitState() : null;
  const vid = g ? g.currentVehicle : 'btr80';
  const expTarget = _sweepExpTarget();
  const level = sw.level;

  // 锁 tabbar（防止中途切走）
  const tabbar = document.getElementById('tabbar');
  const origPointer = tabbar ? tabbar.style.pointerEvents : '';
  if(tabbar) tabbar.style.pointerEvents = 'none';

  const allLoot = [];
  let servantGained = null;
  let finishedIdx = 0;

  function next(){
    if(finishedIdx >= count){
      if(tabbar) tabbar.style.pointerEvents = origPointer;
      _finishBatchSweep(bid, vid, level, count, allLoot, servantGained, expTarget);
      return;
    }
    finishedIdx++;
    const _idx = finishedIdx;
    _playOneSweepAnim(bid, vid, _idx, count, function(){
      const loot = _rollSweepLoot(bid);
      for(const it of loot) allLoot.push(it);
      if(!servantGained && Math.random() < 0.25){
        const srv = grantRandomServant();
        if(srv) servantGained = srv;
      }
      if(typeof _garageInitState === 'function'){
        const gg = _garageInitState();
        if(gg){
          gg.vehicleExp[expTarget] = (gg.vehicleExp[expTarget] || 0) + level * 100;
        }
      }
      state.stats.bossKills = (state.stats.bossKills || 0) + 1;
      next();
    });
  }
  next();
}

/* ★ zone1 内演出（背景 + 绘制 boss + 载具推 boss 一起出画面） */
function _playOneSweepAnim(bid, vid, currentIdx, totalCount, onComplete){
  var z1 = document.getElementById("zone1");
  if(!z1){ onComplete(); return; }
  z1.innerHTML = "";
  var ZW = z1.clientWidth || 400;
  var ZH = z1.clientHeight || 500;
  var BOSS_START_PCT = 65;

  /* ---------- 载具：玩家视觉高 × 探索模式 BTR 比例 ---------- */
  /* 挑战玩家 sprite = BATTLE_HERO_SPRITE_H(118)，内容高 = 118 × 0.667 = 78.7px */
  /* 探索 BTR / 玩家 = (H × 0.99) / (H × 0.58) = 1.707 */
  /* 载具视觉高 = 78.7 × 1.707 ≈ 134px（固定，不随画布变） */
  var PLAYER_SPRITE_H = (typeof BATTLE_HERO_SPRITE_H !== "undefined") ? BATTLE_HERO_SPRITE_H : 118;
  var PLAYER_FACTOR = (typeof CHAR_HEIGHT_FACTOR_BATTLE !== "undefined") ? CHAR_HEIGHT_FACTOR_BATTLE : 0.667;
  var RATIO_EXPLORE = 0.99 / 0.58;
  var vehH = PLAYER_SPRITE_H * PLAYER_FACTOR * RATIO_EXPLORE;
  var ann = (typeof ANN !== "undefined") ? ANN[vid] : null;
  var imgW = (ann && ann.imageSize) ? ann.imageSize.w : 640;
  var imgH = (ann && ann.imageSize) ? ann.imageSize.h : 240;
  var vehW = vehH * (imgW / imgH);

  /* ---------- Boss sprite：挑战模式规则（battleLoop 一致） ---------- */
  var bossSize = Math.round(ZH * 0.75);
  var maxHalfW = Math.floor(ZW * Math.min(BOSS_START_PCT / 100, 1 - BOSS_START_PCT / 100) * 0.98);
  var bossWide = Math.max(bossSize, Math.min(Math.round(bossSize * 1.5), maxHalfW * 2));
  var BOSS_W = bossWide;
  var BOSS_H = bossSize;

  /* ---------- 场景 ---------- */
  var scene = document.createElement("div");
  scene.style.cssText = "position:absolute;inset:0;overflow:hidden;background:#0a0605;";
  var bg = document.createElement("div");
  bg.style.cssText = "position:absolute;inset:0;background-image:url('" + getBossBgPath(bid) + "');background-size:cover;background-position:center bottom;background-repeat:no-repeat;opacity:0;transition:opacity 0.25s ease-out;";

  /* Boss canvas：挑战模式同一套（drawBlockBoss + bottom:0） */
  var bossCanvas = document.createElement("canvas");
  bossCanvas.width = BOSS_W;
  bossCanvas.height = BOSS_H;
  bossCanvas.style.cssText = "position:absolute;bottom:0;left:" + BOSS_START_PCT + "%;transform:translateX(-50%);width:" + BOSS_W + "px;height:" + BOSS_H + "px;opacity:0;transition:opacity 0.25s ease-out;will-change:left,transform;";
  try {
    var bctx = bossCanvas.getContext("2d");
    drawBlockBoss(bctx, BOSS_W, BOSS_H, bid, "idle", 0);
  } catch(e){}

  /* 载具：bottom:0，和 boss 同地面 */
  var veh = document.createElement("img");
  veh.src = "images/vehicles/" + vid + ".png" + (typeof assetSuffix === "function" ? assetSuffix() : "");
  veh.onerror = function(){
    veh.onerror = null;
    veh.src = "icons/vehicles/" + vid + ".png" + (typeof assetSuffix === "function" ? assetSuffix() : "");
  };
  veh.style.cssText = "position:absolute;bottom:0;left:-50%;width:" + vehW + "px;height:" + vehH + "px;transform:translateX(-50%);will-change:left;";

  /* 火光 canvas */
  var fireCanvas = document.createElement("canvas");
  fireCanvas.style.cssText = "position:absolute;inset:0;pointer-events:none;z-index:5;";
  fireCanvas.width = ZW;
  fireCanvas.height = ZH;
  var fcCtx = fireCanvas.getContext("2d");

  /* 进度条 */
  var progress = document.createElement("div");
  progress.style.cssText = "position:absolute;top:8px;left:50%;transform:translateX(-50%);color:#e8a33d;font-size:12px;font-weight:bold;background:rgba(14,12,10,.85);border:1px solid #8a5f18;padding:3px 12px;border-radius:10px;z-index:10;white-space:nowrap;";
  progress.textContent = "\u6383\u8569 " + currentIdx + " / " + totalCount;

  scene.appendChild(bg);
  scene.appendChild(bossCanvas);
  scene.appendChild(veh);
  scene.appendChild(fireCanvas);
  scene.appendChild(progress);
  z1.appendChild(scene);

  requestAnimationFrame(function(){
    bg.style.opacity = "1";
    bossCanvas.style.opacity = "1";
  });

  /* rev585: 接触点直接用 boss canvas 中心（不再算内容 bbox） */
  var bossHalfPct = (BOSS_W / ZW) * 50;
  var vehHalfPct = (vehW / ZW) * 50;
  var VEH_CONTACT = BOSS_START_PCT - vehHalfPct;
  var VEH_START = Math.min(-vehHalfPct - 10, VEH_CONTACT - 20);
  var distBossPct = (105 + bossHalfPct) - BOSS_START_PCT;
  var distVehPct = 110 + vehHalfPct - VEH_CONTACT;
  var moveDistPct = Math.max(distBossPct, distVehPct, 40);
  var VEH_END = VEH_CONTACT + moveDistPct;
  var BOSS_END = BOSS_START_PCT + moveDistPct;

  /* 火光 */
  var FADE_IN_MS = 250;
  var CONTACT_MS = 1600;
  var TOTAL_MS = 3400;
 var SWEEP_SPEED_PX_PER_SEC = 1200;
  /* BTR 炮口 Y：图片炮口在 BTR 顶部约 17% 位置 */
  var vehTopY = ZH - vehH;
  var muzzleYPx = vehTopY + vehH * 0.17;
  var WEAPON_PROFILE = (typeof MUZZLE_PROFILES !== "undefined") ? MUZZLE_PROFILES.kpvt : { flashSize: 26, flashColor: "255,200,80", bulletSize: 3.5, bulletSpeed: 450 };
  var fireEffects = [];
  var lastFireAt = 0;
  var FIRE_INTERVAL = 150;
  var startTime = performance.now();
  function tick(now){
    var t = now - startTime;
    var elapsed = Math.max(0, t - FADE_IN_MS);
    var vehX, bossX, bossRot = 0;
    /* rev586: single linear sweep, constant velocity */
    var totalMovePx = (VEH_END - VEH_START) / 100 * ZW;
 var totalMoveMs = Math.max(150, totalMovePx / SWEEP_SPEED_PX_PER_SEC * 1000);
    var pTotal = Math.min(1, elapsed / totalMoveMs);
    vehX = VEH_START + (VEH_END - VEH_START) * pTotal;
    bossX = BOSS_START_PCT;
    if(vehX > VEH_CONTACT){
      var pushed = vehX - VEH_CONTACT;
      bossX = BOSS_START_PCT + pushed;
      var pushTotal = Math.max(0.001, VEH_END - VEH_CONTACT);
      bossRot = Math.min(1, pushed / pushTotal) * 25;
    }
    veh.style.left = vehX + "%";
    bossCanvas.style.left = bossX + "%";
    if(bossRot > 0){
      bossCanvas.style.transform = "translateX(-50%) rotate(" + bossRot + "deg)";
    }
    if(t >= FADE_IN_MS && elapsed < totalMoveMs && now - lastFireAt >= FIRE_INTERVAL){
      lastFireAt = now;
      var vehCenterPx = (vehX / 100) * ZW;
      var muzzleXPx = vehCenterPx + vehW * 0.35;
      fireEffects.push({ startTime: now, x: muzzleXPx, y: muzzleYPx, profile: WEAPON_PROFILE });
    }
    fcCtx.clearRect(0, 0, ZW, ZH);
    for(var i = fireEffects.length - 1; i >= 0; i--){
      var fx = fireEffects[i];
      var age = now - fx.startTime;
      var total = 600;
      if(age > total){ fireEffects.splice(i, 1); continue; }
      var ft = age / total;
      var prof = fx.profile;
      if(ft < 0.2){
        var ff = ft / 0.2;
        var r = prof.flashSize * (1 - ff * 0.6);
        var grad = fcCtx.createRadialGradient(fx.x, fx.y, 0, fx.x, fx.y, r);
        grad.addColorStop(0, "rgba(" + prof.flashColor + "," + (1 - ff) + ")");
        grad.addColorStop(1, "rgba(" + prof.flashColor + ",0)");
        fcCtx.fillStyle = grad;
        fcCtx.beginPath();
        fcCtx.arc(fx.x, fx.y, r, 0, Math.PI * 2);
        fcCtx.fill();
      }
      var bx = fx.x + ft * prof.bulletSpeed;
      var alpha = Math.max(0, 1 - ft);
      fcCtx.strokeStyle = "rgba(" + prof.flashColor + "," + (alpha * 0.4) + ")";
      fcCtx.lineWidth = 2;
      fcCtx.beginPath();
      fcCtx.moveTo(fx.x + ft * prof.bulletSpeed * 0.3, fx.y);
      fcCtx.lineTo(bx, fx.y);
      fcCtx.stroke();
      fcCtx.fillStyle = "rgba(255,220,120," + alpha + ")";
      fcCtx.beginPath();
      fcCtx.arc(bx, fx.y, prof.bulletSize, 0, Math.PI * 2);
      fcCtx.fill();
    }
    if(elapsed < totalMoveMs){
      requestAnimationFrame(tick);
    } else {
      onComplete();
    }
  }
  requestAnimationFrame(tick);
}

function _finishBatchSweep(bid, vid, level, count, allLoot, servantGained, expTarget){
  var b = BOSSES[bid];
  var vehName = (VEHICLES[vid] && VEHICLES[vid].name) || vid;
  var expTargetName = (VEHICLES[expTarget] && VEHICLES[expTarget].name) || expTarget;
  var totalExp = level * 100 * count;
  pushLog("<span class=\"pl\">\u73A9\u5BB6</span> \u4E58\u5750 <span class=\"pl\">" + vehName + "</span> \u6383\u8569 <b>" + b.name + "</b> \u00D7" + count +
    (allLoot.length ? "\uFF0C\u7372\u5F97 " + allLoot.map(function(l){ return fmtItemSpan(l.id, l.rarity, l.count); }).join("\u3001") : "\uFF0C\u7121\u6230\u5229\u54C1") +
    (servantGained ? "\uFF0C\u7372\u5F97\u50D5\u4EBA" : "") +
    "\uFF0C\u8F09\u5177\u7D93\u9A57 +" + totalExp + "\uFF08" + expTargetName + "\uFF09", [], "combat");
  if(typeof save === "function") save();
  var merged = {};
  for(var li = 0; li < allLoot.length; li++){
    var it = allLoot[li];
    var k = it.id + "@" + it.rarity;
    if(!merged[k]) merged[k] = { id: it.id, rarity: it.rarity, count: 0 };
    merged[k].count += it.count;
  }
  var items = Object.keys(merged).map(function(k){ return merged[k]; });
  var body = "";
  body += "<div class=\"detail-title r-\u50B3\u5947\">\uD83C\uDFC6 \u6383\u8569\u5B8C\u6210 \u00D7" + count + "</div>";
  body += "<div class=\"detail-sub\">" + vehName + " \u5168\u901F\u885D\u649E " + b.name + "</div>";
  body += "<div class=\"stat-line\"><span class=\"k\">\u8F09\u5177\u7D93\u9A57</span><span class=\"v\" style=\"color:#4caf50\">+" + totalExp + " \u2192 " + expTargetName + "</span></div>";
  if(servantGained){
    var sdef = SERVANT_TYPES[servantGained.type];
    body += "<div class=\"stat-line\"><span class=\"k\">\u7372\u5F97\u50D5\u4EBA</span><span class=\"v\">" + (sdef ? sdef.name : "?") + "\uFF08" + servantGained.rarity + "\uFF09</span></div>";
  }
  if(items.length){
    var groups = { weapon: [], armor: [], ammo: [], consume: [], material: [], misc: [] };
    for(var gi = 0; gi < items.length; gi++){
      var gcat = itemCat(items[gi].id);
      if(groups[gcat]) groups[gcat].push(items[gi]);
      else groups.misc.push(items[gi]);
    }
    for(var gg in groups){
      groups[gg].sort(function(a, b){
        var rd = RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity);
        if(rd !== 0) return rd;
        var ad = itemDef(a.id) || { name: a.id };
        var bd = itemDef(b.id) || { name: b.id };
        return (ad.name || "").localeCompare(bd.name || "", "zh-Hant");
      });
    }
    var catNames = { weapon: "\u2694\uFE0F \u6B66\u5668", armor: "\uD83D\uDEE1\uFE0F \u88DD\u5099", ammo: "\uD83D\uDD2B \u5F48\u85E5", consume: "\uD83D\uDC8A \u6D88\u8017\u54C1", material: "\uD83D\uDD27 \u6750\u6599", misc: "\uD83D\uDCE6 \u5176\u4ED6" };
    body += "<div style=\"font-size:11px;color:#e8a33d;font-weight:bold;margin:10px 0 4px\">\u6230\u5229\u54C1</div>";
    for(var g in groups){
      if(!groups[g].length) continue;
      body += "<div class=\"cat-header\" style=\"cursor:default;margin:4px 0\"><span>" + catNames[g] + " (" + groups[g].length + ")</span></div>";
      for(var ii = 0; ii < groups[g].length; ii++){
        var it2 = groups[g][ii];
        var d = itemDef(it2.id) || { name: it2.id };
        body += "<div class=\"item-row\" data-iid=\"" + it2.id + "\" data-irar=\"" + it2.rarity + "\"><div class=\"icon\" style=\"background:" + rarityBg(it2.rarity) + "\">" + itemIcon(it2.id, 30) + "</div><div class=\"info\"><div class=\"nm " + rarityClass(it2.rarity) + "\">" + d.name + "</div><div class=\"sub\">" + it2.rarity + "</div></div><div class=\"cnt\">\u00D7" + it2.count + "</div></div>";
      }
    }
  } else {
    body += "<div class=\"empty-hint\" style=\"margin:10px 0\">\u7121\u6230\u5229\u54C1</div>";
  }
  var ft = document.createElement("div");
  ft.className = "modal-ft";
  ft.innerHTML = "";
  var bd = openModal({ title: "\u6383\u8569\u7D50\u7B97", body: body, footer: ft });
  var rows = bd.querySelectorAll(".item-row[data-iid]");
  for(var ri = 0; ri < rows.length; ri++){
    (function(r){
      r.onclick = function(){
        var iid = r.getAttribute("data-iid");
        var irar = r.getAttribute("data-irar");
        if(typeof openItemDetail === "function"){
          openItemDetail(iid, irar, function(){ _finishBatchSweep(bid, vid, level, count, allLoot, servantGained, expTarget); });
        }
      };
    })(rows[ri]);
  }
  if(typeof renderCombat === "function") renderCombat();
}


/* rev572 sweep helpers: measure actual pixel content bounds */
function _measureImgContentBounds(img){
  if(!window._vehContentBoundsCache) window._vehContentBoundsCache = {};
  const key = img.src || '';
  if(key && window._vehContentBoundsCache[key]) return window._vehContentBoundsCache[key];
  const w = img.naturalWidth, h = img.naturalHeight;
  if(!w || !h) return null;
  try {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const cx = c.getContext('2d');
    cx.drawImage(img, 0, 0);
    const data = cx.getImageData(0, 0, w, h).data;
    let minX = w, maxX = -1, minY = h, maxY = -1;
    for(let y = 0; y < h; y++){
      const off = y * w * 4;
      for(let x = 0; x < w; x++){
        if(data[off + x * 4 + 3] > 10){
          if(x < minX) minX = x;
          if(x > maxX) maxX = x;
          if(y < minY) minY = y;
          if(y > maxY) maxY = y;
        }
      }
    }
    if(maxX < 0) return null;
    const b = { minX: minX / w, maxX: (maxX + 1) / w, minY: minY / h, maxY: (maxY + 1) / h };
    if(key) window._vehContentBoundsCache[key] = b;
    return b;
  } catch(e){
    return null;
  }
}

function _getBossContentHorizontalBounds(bid, px){
  try {
    const def = BOSS_LAYERS[bid];
    if(!def) return null;
    const anims = BOSS_ANIMS[bid];
    if(!anims || !anims.idle) return null;
    const anim = anims.idle;
    const world = resolveBossWorld(def, anim, 0);
    let minX = Infinity, maxX = -Infinity;
    for(const L of def.layers){
      const k = (anim.keys && anim.keys[L.id] && anim.keys[L.id][0]) || { rot:0, dx:0, dy:0 };
      const w = def.canvas.w * (k.w !== undefined ? k.w : L.w);
      const h = def.canvas.h * (k.h !== undefined ? k.h : L.h);
      const pxL = w * L.pivot.x;
      const pyL = h * L.pivot.y;
      const wp = world[L.id];
      if(!wp) continue;
      const rot = wp.rot * Math.PI / 180;
      const cos = Math.cos(rot), sin = Math.sin(rot);
      for(const c of [[0,0],[w,0],[0,h],[w,h]]){
        const dx = c[0] - pxL, dy = c[1] - pyL;
        const rx = dx*cos - dy*sin + wp.wx;
        if(rx < minX) minX = rx;
        if(rx > maxX) maxX = rx;
      }
    }
    if(!isFinite(minX)) return null;
    const tf = getBossCanvasTransform(def, bid, px, px);
    const leftPx = tf.ox + minX * tf.sx;
    const rightPx = tf.ox + maxX * tf.sx;
    return { left: Math.max(0, leftPx / px), right: Math.min(1, rightPx / px) };
  } catch(e){
    return null;
  }
}



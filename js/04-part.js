/* ============================================================
   ★★★ BOSS MODULE — 戰鬥邏輯區 ★★★
   ============================================================ */
let battle=null;
const BATTLE_ONESHOT_ANIMS=['fire_primary','fire_secondary','attack_melee','reload','switch_secondary','switch_melee','hurt'];

/* rev93: 停止戰鬥中的玩家移動並取消當前搖桿會話 */
function stopBattleMovement(){
  if(!battle) return;
  battle.moveDir = 0;
  const stick = document.getElementById('stick');
  if(stick){ stick.style.left='50%'; stick.style.top='50%'; stick.style.transform='translate(-50%,-50%)'; }
  if(typeof battle._joystickCancel === 'function') battle._joystickCancel();
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
  const rot=wp.rot*(Math.PI/180);
  const cos=Math.cos(rot),sin=Math.sin(rot);
  const corners=[[0,0],[w,0],[0,h],[w,h]];
  let minX=Infinity;
  for(const c of corners){
    const dx=c[0]-px,dy=c[1]-py;
    const rx=dx*cos-dy*sin+wp.wx;
    if(rx<minX)minX=rx;
  }
  const W=getSceneW();
  const bossSprite=document.getElementById('boss-sprite');
  const spriteW=bossSprite?bossSprite.clientWidth:280;
  const spriteH=bossSprite?bossSprite.clientHeight:280;
  const _tf=getBossCanvasTransform(def,battle.bossId,spriteW,spriteH);
  const canvasMinX=_tf.ox+minX*_tf.sx;
  const spriteLeft=battle.bx*W-spriteW/2;
  const worldMinX=(spriteLeft+canvasMinX)/W;
  const playerRight=battle.px+battle.playerWeaponRange;
  return playerRight>=worldMinX;
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
  const centerOffX = w/2 - px;
  const centerOffY = h/2 - py;
  const angle = wp.rot * BOSS_DEG2RAD;
  const cosA = Math.cos(angle), sinA = Math.sin(angle);
  const rotOffX = centerOffX * cosA - centerOffY * sinA;
  const rotOffY = centerOffX * sinA + centerOffY * cosA;
  const centerWX = wp.wx + rotOffX;
  const centerWY = wp.wy + rotOffY;
  const fxEl = document.getElementById('battle-fx');
  const W = fxEl ? fxEl.clientWidth : 400;
  const H = fxEl ? fxEl.clientHeight : 500;
  const bossSprite = document.getElementById('boss-sprite');
  const spriteW = bossSprite ? bossSprite.clientWidth : 280;
  const spriteH = bossSprite ? bossSprite.clientHeight : 280;
  const _tf = getBossCanvasTransform(def, battle.bossId, spriteW, spriteH);
  const canvasPx = _tf.ox + centerWX * _tf.sx;
  const canvasPy = _tf.oy + centerWY * _tf.sy;
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

/* v54-boss-tier-persist */
if(!state.preferences.bossTier) state.preferences.bossTier = {};
let _bossSelectedTier = state.preferences.bossTier;
function renderCombat(){
  const z1=$('#zone1'),z2=$('#zone2'),z3=$('#zone3');
  if(battle&&battle.active){renderBattleScene(z1);renderBattleJoystick(z2);renderBattleControls(z3);return;}
  const _BOSS_GROUPS=[{baseKey:'factory_king',regionName:'廢棄工廠'},{baseKey:'lab_queen',regionName:'廢棄實驗室'},{baseKey:'road_tyrant',regionName:'郊區公路'},{baseKey:'swamp_hydra',regionName:'輻射沼澤'},{baseKey:'core_omega',regionName:'廢土核心'}];
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
    const _seals1=parseInt(state.seals[_b1.seal]||0,10);
    const _seals2=_b2?parseInt(state.seals[_b2.seal]||0,10):0;
    const _defeated=state.defeatedBosses.includes(_bid);
    const _can=_curTier===2?_seals2>0:_seals1>0;
    listHtml+=`<div class="boss-card ${_can?'':'locked'}"><div class="boss-avatar">${bossIcon(_bid)}</div><div class="boss-info"><div class="bn">${_b.name}${_defeated?' ✅':''}</div><div class="bd">甲 ${_b.armor} ｜ 生命 ${_b.hp}</div></div><div class="boss-tier-selector"><div class="boss-tier-btn ${_curTier===1?'on':''}" data-boss-key="${_g.baseKey}" data-tier="1"><div class="bt-label">I</div><div class="bt-seal">×${_seals1}</div></div>${_t2Exists?`<div class="boss-tier-btn ${_curTier===2?'on':''} ${_t2Unlocked?'':'locked'}" data-boss-key="${_g.baseKey}" data-tier="2"><div class="bt-label">${_t2Unlocked?'II':'🔒'}</div><div class="bt-seal">${_t2Unlocked?'×'+_seals2:'-'}</div></div>`:''}</div><button class="btn ${_can?'primary':''}" data-bid="${_bid}" ${_can?'':'disabled'} style="padding:8px 10px;font-size:11px;flex:0 0 auto">${_can?'挑戰':'無信物'}</button></div>`;
  }
  listHtml+='</div>';
  z1.innerHTML=listHtml;
  renderEquipZone(z2);
  renderCombatInfoPanel(z3);
  $$('.boss-tier-btn[data-boss-key]',z1).forEach(btn=>{btn.onclick=(e)=>{e.stopPropagation();if(btn.classList.contains('locked'))return;/* v48-preserve-scroll */ {const _bl=z1.querySelector('.boss-list');const _sp=_bl?_bl.scrollTop:0;_bossSelectedTier[btn.dataset.bossKey]=parseInt(btn.dataset.tier,10);save();renderCombat();const _bl2=z1.querySelector('.boss-list');if(_bl2)_bl2.scrollTop=_sp;}};});
  $$('.boss-card .btn',z1).forEach(btn=>{btn.onclick=()=>startBossBattle(btn.dataset.bid);});
}

/* v51-dedup */
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
  html += '<div style="padding:2px 8px;font-size:9px;color:#7a6f60;line-height:1.2;flex:0 0 auto">依序設定優先彈種，留空則自動分配</div>';
  html += '<div style="flex:1;min-height:0;display:flex;flex-direction:column;justify-content:flex-start;padding:8px;gap:4px;overflow:hidden">';
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
  let html = '<div class="ammo-order-row">';
  html += '<div class="lbl">' + label + '</div>';
  html += '<div class="ammo-order-slots">';
  for(let i = 0; i < 3; i++){
    const aid = order[i];
    let inner = '<span class="empty-lbl">空</span>';
    let cls = 'ammo-slot';
    let style = '';
    if(aid){
      const rar = _getAmmoDefRarity(aid, slot);
      style = 'background:' + rarityBg(rar) + ';';
      const nm = getAmmoShortName(aid, slot);
      inner = itemIcon(aid, 26) + '<div class="nm">' + nm + '</div>';
      cls += ' filled';
    }
    const dis = !equipped ? 'opacity:.35;pointer-events:none;' : '';
    html += '<div class="' + cls + '" data-slot="' + slot + '" data-idx="' + i + '" style="' + style + dis + '">' + inner + '</div>';
  }
  html += '</div></div>';
  return html;
}
function openAmmoPicker(slot, idx){
  const equipped = state.player.equipped[slot];
  if(!equipped){ notify('尚未裝備對應武器', 'error'); return; }
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
        ${(b.shieldMaxHp>0 && !b.shieldBroken) ? `<div class="shield-bar-wrap" id="shield-bar-wrap"><div class="bar"><div class="fill" id="boss-shield" style="width:${(b.shieldHp/b.shieldMaxHp*100)}%"></div></div></div>` : ''}
        <div class="hpbar-wrap"><div class="nm">${b.bossName}${(b.bossId.indexOf("_ii")>=0)?" II":""}</div><div class="bar ap"><div class="fill" id="boss-ap" style="width:${(b.bossArmor/b.bossMaxArmor*100)}%"></div></div><div class="bar hp"><div class="fill" id="boss-hp" style="width:${(b.bossHp/b.bossMaxHp*100)}%"></div></div></div>
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
  if(bs)bs.onclick=(e)=>{
    const bossSprite = document.getElementById('boss-sprite');
    if(!bossSprite) return;
    const def = BOSS_LAYERS[battle.bossId];
    if(!def) return;
    const scene = document.querySelector('.battle-scene');
    if(!scene) return;
    const sceneRect = scene.getBoundingClientRect();
    const spriteRect = bossSprite.getBoundingClientRect();
    const spriteX = e.clientX - spriteRect.left;
    const spriteY = e.clientY - spriteRect.top;
    const _tf = getBossCanvasTransform(def, battle.bossId, spriteRect.width, spriteRect.height);
    const canvasX = (spriteX - _tf.ox) / _tf.sx;
    const canvasY = (spriteY - _tf.oy) / _tf.sy;
    const part = pickAimPartFromClick(canvasX, canvasY);
    if(part){
      battle.aimPart = part;
      const fx = document.getElementById('battle-fx');
      if(fx){
        const old = document.getElementById('aim-marker');
        if(old) old.remove();
        const m = document.createElement('div');
        m.className = 'aim-marker';
        m.id = 'aim-marker';
        m.style.left = ((e.clientX - sceneRect.left) / sceneRect.width * 100) + '%';
        m.style.top  = ((e.clientY - sceneRect.top)  / sceneRect.height * 100) + '%';
        fx.appendChild(m);
        setTimeout(()=>{ if(m.parentNode) m.remove(); }, 1000);
      }
    }
  };
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
}
function renderBattleJoystick(z2){
  z2.innerHTML=`<div class="joystick" id="joystick"><div class="stick" id="stick"></div></div><div class="z2-hint">拖動搖桿左右移動</div>`;
  const joy=$('#joystick'),stick=$('#stick');
  let touchId=null,cx,cy,radius;
  function start(e){
    if(battle){
      if(battle.firing){ battle.fireHeld=false; battle.burstLeft=0; }
    }
    const r=joy.getBoundingClientRect();
    cx=r.left+r.width/2; cy=r.top+r.height/2; radius=r.width/2;
    const t=e.changedTouches?e.changedTouches[0]:e;
    touchId=e.changedTouches?t.identifier:null;
    move(e);
  }
  function move(e){
    if(!battle||!battle.active)return;
    if(battle.reloading || battle.consuming){
      stick.style.left='50%';stick.style.top='50%';
      battle.moveDir=0;
      return;
    }
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
  $$('.fm-btn',z3).forEach(b=>{b.onclick=()=>{
    stopBattleMovement(); battle.fireMode=b.dataset.mode;
    battle.fireHeld=false;
    battle.burstLeft=0;
    renderBattleControls(z3);
  };});
  $$('.weapon-slot-btn',z3).forEach(b=>{b.onclick=()=>switchBattleWeapon(b.dataset.slot);});
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
function switchBattleWeapon(slot){ stopBattleMovement();
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
  if(slot === 'secondary'){
    battleHeroAnim.name='switch_secondary';
    battleHeroAnim.frame=0;
    battleHeroAnim.lastUpdate=performance.now();
    battleHeroAnim.forcedEnd=performance.now()+900;
  } else if(slot === 'melee'){
    battleHeroAnim.name='switch_melee';
    battleHeroAnim.frame=0;
    battleHeroAnim.lastUpdate=performance.now();
    battleHeroAnim.forcedEnd=performance.now()+900;
  } else if(slot === 'primary'){
    battleHeroAnim.name='idle';
    battleHeroAnim.frame=0;
    battleHeroAnim.lastUpdate=performance.now();
    battleHeroAnim.forcedEnd=0;
  }
  renderBattleControls($('#zone3'));
}

function defaultAimPartForBoss(bossId){
  const def = BOSS_LAYERS[bossId];
  if(!def) return null;
  const torso = def.layers.find(l => l.id === 'torso');
  if(torso) return 'torso';
  let best = null, bestArea = 0;
  for(const L of def.layers){
    const a = L.w * L.h;
    if(a > bestArea){ bestArea = a; best = L.id; }
  }
  return best;
}

function startBossBattle(bid){
  const b=BOSSES[bid];if(!b)return;
  const seals=parseInt(state.seals[b.seal]||0,10);
  if(seals<=0){notify('沒有對應的 Boss 信物','error');return;}
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
    healDisabledUntil:0,healTimer:null,autoHealing:false,chainShots:0,lastShotTime:0,chainResetMs:600};
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

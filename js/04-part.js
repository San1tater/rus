/* ============================================================
   ★★★ BOSS MODULE — 戰鬥邏輯區 ★★★
   ============================================================ */
let battle=null;
const BATTLE_ONESHOT_ANIMS=['fire_primary','fire_secondary','attack_melee','reload','switch_secondary','switch_melee','hurt'];

/* ★ Boss 戰背景：獨立圖片，不復用探索圖（比例、地面線、視角皆不同）
   檔名固定為 images/bg/boss_{bossId}.png */
function getBossBgPath(bossId){
  if(!BOSSES[bossId]) return '';
  return `images/bg/boss_${bossId}.png${assetSuffix()}`;
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
  const _fit = def.autoFit ? computeBossFit(def, battle.bossId, spriteW, spriteH) : null;
  let canvasPx, canvasPy;
  if(_fit){
    canvasPx = _fit.offsetX + centerWX * _fit.fitScale;
    canvasPy = _fit.offsetY + centerWY * _fit.fitScale;
  } else {
    canvasPx = centerWX * (spriteW / def.canvas.w);
    canvasPy = centerWY * (spriteH / def.canvas.h);
  }
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

function renderCombat(){
  const z1=$('#zone1'),z2=$('#zone2'),z3=$('#zone3');
  if(battle&&battle.active){renderBattleScene(z1);renderBattleJoystick(z2);renderBattleControls(z3);return;}
  let listHtml='<div class="boss-list">';
  for(const bid in BOSSES){
    const b=BOSSES[bid];
    const seals=parseInt(state.seals[b.seal]||0,10);
    const defeated=state.defeatedBosses.includes(bid);
    const can=seals>0;
    const sealTagText = `信物 *${seals}`;
    listHtml+=`<div class="boss-card ${can?'':'locked'}"><div class="boss-avatar">${bossIcon(bid)}</div><div class="boss-info"><div class="bn">${b.name}${defeated?' ✅':''}</div><div class="bd">地區：${b.region} ｜ HP ${b.hp} ｜ 裝甲 ${b.armor} ｜ 傷害 ${b.dmg} ｜ 穿透 ${b.pen||0}</div><div class="seal-tag ${seals>0?'':'none'}">${sealTagText}</div></div><button class="btn ${can?'primary':''}" data-bid="${bid}" ${can?'':'disabled'} style="flex:0 0 auto;padding:8px 10px;font-size:11px">${can?'挑戰':'無信物'}</button></div>`;
  }
  listHtml+='</div>';
  z1.innerHTML=listHtml;
  renderEquipZone(z2);
  z3.innerHTML=`<div class="z3-head"><div class="z3-title">⚔️ Boss 挑戰</div></div>
    <div class="logbox" style="padding:10px">
      <div style="color:#e8a33d;font-weight:bold;margin-bottom:6px">挑戰說明</div>
      <div style="line-height:1.7;font-size:10px;color:#bfb3a0">
        · 前進至 Boss 警戒範圍才會觸發攻擊<br>
        · 點擊 Boss 設定瞄準部位，預設為軀幹<br>
        · 拖動搖桿左右移動，移動時無法攻擊<br>
        · 點擊攻擊鍵射擊一次；掃射模式可長按連射<br>
        · 主副武器彈藥耗盡後會自動切換到近戰裝備<br>
        · Boss 會阻擋並推動玩家，玩家無法繞到其身後
      </div>
    </div>`;
  $$('.boss-card .btn',z1).forEach(btn=>{btn.onclick=()=>startBossBattle(btn.dataset.bid);});
}

function renderBattleScene(z1){
  const b=battle;
  const rLeft=Math.max(0,(b.px-(b.playerWeaponRange||0.5)))*100;
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
        <div class="hpbar-wrap"><div class="nm">${b.bossName}</div><div class="bar ap"><div class="fill" id="boss-ap" style="width:${(b.bossArmor/b.bossMaxArmor*100)}%"></div></div><div class="bar hp"><div class="fill" id="boss-hp" style="width:${(b.bossHp/b.bossMaxHp*100)}%"></div></div></div>
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
    const _fit = def.autoFit ? computeBossFit(def, battle.bossId, spriteRect.width, spriteRect.height) : null;
    let canvasX, canvasY;
    if(_fit){
      canvasX = (spriteX - _fit.offsetX) / _fit.fitScale;
      canvasY = (spriteY - _fit.offsetY) / _fit.fitScale;
    } else {
      canvasX = spriteX * (def.canvas.w / Math.max(1, spriteRect.width));
      canvasY = spriteY * (def.canvas.h / Math.max(1, spriteRect.height));
    }
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
  if(ri){const r=battle.playerWeaponRange||0.5;const rLeft=Math.max(0,(battle.px-r))*100;const rRight=Math.min(1,(battle.px+r))*100;ri.style.left=rLeft+'%';ri.style.width=(rRight-rLeft)+'%';}
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
  const modes=wdef&&wdef.modes?wdef.modes:['點射'];
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
    battle.fireMode=b.dataset.mode;
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
function switchBattleWeapon(slot){
  if(slot==='throwable'&&getThrowableCount()<=0){ensureThrowableFromBackpack();}
  const w=equippedWeapon(slot);if(!w||!itemDef(w.id))return;
  const def=itemDef(w.id);
  battle.weaponStates=battle.weaponStates||{};
  if(battle.weaponSlot&&battle.weaponStates[battle.weaponSlot]){battle.weaponStates[battle.weaponSlot].ammoInMag=battle.ammoInMag;battle.weaponStates[battle.weaponSlot].ammoRef=battle.ammoRef;}
  else if(battle.weaponSlot){battle.weaponStates[battle.weaponSlot]={ammoInMag:battle.ammoInMag,ammoRef:battle.ammoRef};}
  if(battle.reloading){battle.reloading=false;}
  battle.weapon=w;battle.weaponSlot=slot;
  battle.fireMode=def.modes?def.modes[0]:'點射';
  battle.fireHeld=false;
  battle.burstLeft=0;
  battle.playerWeaponRange=def.range||0.5;
  const prevSt=battle.weaponStates[slot];
  if(prevSt){battle.ammoInMag=prevSt.ammoInMag||0;battle.ammoRef=prevSt.ammoRef;}
  else if(def.cal){
    const ammo=pickAmmoByPreference(def.cal,'combat');
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
  const _hasShield=(bid==='road_tyrant'||bid==='core_omega');
  const _shieldHp=bid==='road_tyrant'?12500:(bid==='core_omega'?30000:0);
  battle={active:true,bossId:bid,bossName:b.name,bossHp:b.hp,bossMaxHp:b.hp,bossArmor:b.armor,bossMaxArmor:b.armor,bossDmg:b.dmg,bossDmgMult:1,bossPen:b.pen||0,bossCritRate:b.critRate||0,bossCritMult:b.critMult||1,
    phaseIdx:0, healedPhases:[], skillCds:null, bossCast:null, bossDash:null, lastMeleeAt:0,
    shieldMaxHp:_shieldHp, shieldHp:_shieldHp, shieldBroken:false, bossRetreat:null,
    playerHp:state.player.hp,playerMaxHp:state.player.maxHp,playerArmor:state.player.armor,playerMaxArmor:Math.max(1,state.player.maxArmor),
    px:0.15,py:0.75,bx:0.75,by:0.25,moveDir:0,bullets:[],firing:false,reloading:false,consuming:false,
    lastShot:0,damageDealt:0,weapon:null,weaponSlot:null,playerWeaponRange:0.5,fireMode:'點射',fireHeld:false,burstLeft:0,
    ammoRef:null,ammoInMag:0,weaponStates:{},engaged:false,engagedRange:0.35,startTime:Date.now(),
    aimPart:defaultAimPartForBoss(bid),lastManualClick:0,
    players:[{id:'local',isLocal:true}],lastH:0,
    healDisabledUntil:0,healTimer:null,autoHealing:false};
  if(bid==='swamp_hydra') initHydraHeads();
  if(bid==='core_omega') initOmegaArms();
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

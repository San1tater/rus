/* v17.5 hotfix batch applied */

'use strict';

const GAME_LAYERS=(function(){var B=window.__PUPPET_BAKE__,bx=B.box,f0=B.anim.R.idle.f[0].L,o=[];
for(var i=0;i<B.ids.length;i++){var id=B.ids[i],d=f0[i];
var z=B.order.R.indexOf(id);if(z<0)z=i;
o.push({id:id,name:id,z:z,color:B.col[id],
pivot:{x:d[3]?d[5]/d[3]:0,y:d[4]?d[6]/d[4]:0.5},
x:(d[0]-bx[0])/bx[2],y:(d[1]-bx[1])/bx[3],w:d[3]/bx[2],h:d[4]/bx[3],rot:d[2]});}
return o;})();

const GAME_ANIMS=(function(){var B=window.__PUPPET_BAKE__,o={},k,i,j;
for(k in B.anim.R){var a=B.anim.R[k],ks={};
for(i=0;i<B.ids.length;i++){var arr=[];for(j=0;j<a.fc;j++)arr.push({rot:0,dx:0,dy:0});ks[B.ids[i]]=arr;}
o[k]={frameCount:a.fc,fps:a.fps,loop:a.loop,showEq:a.show,keys:ks};}
o.death=o.dead;return o;})();

/* rev-fix-heal-melee: 治療動畫 = attack_melee 循環版 */

const WEAPON_LAYOUT=(function(){var B=window.__PUPPET_BAKE__,o={},k;
for(k in B.attach){var a=B.attach[k];o[k]={scale:a.scale,rotation:a.rotation,trim:a.trim};}
return o;})();

const HEAD_ARMOR_LAYOUT=(function(){var B=window.__PUPPET_BAKE__,o={},k;
for(k in B.armor){var a=B.armor[k];
o[k]={layer:a.layer,behind:false,scale:a.scale,ox:a.ox,oy:a.oy,rotation:a.rotation};}
return o;})();

const WEAPON_MUZZLE=(function(){var B=window.__PUPPET_BAKE__,o={},k;
for(k in B.muzzle)o[k]={x:B.muzzle[k].x,y:B.muzzle[k].y};return o;})();

/* rev-fix-mod-source: 改裝圖命名（WEAPON_LAYOUT / WEAPON_MUZZLE）為唯一真相源
 * 掃描 <baseId>_<mag>_<scope>_<grip> 形式的 key，僅提取 mag 段：
 *   x     → 默認彈匣（不擴容），不加入列表
 *   <數字> → 擴容彈匣數
 * 默認彈匣數由 WEAPONS[baseId].mag 定義，getMagOptionsForWeapon 過濾掉小於默認值的項。
 * 不在改裝圖裡的 mag 值 = 死配置，永遠不會返回。 */
var _MOD_OPT_CACHE = {};
function _getModOptionsFromLayout(baseId){
  if(_MOD_OPT_CACHE[baseId] !== undefined) return _MOD_OPT_CACHE[baseId];
  var magSet = {};
  var _empty = { mags: [] };
  if(typeof WEAPON_LAYOUT === 'undefined'){ _MOD_OPT_CACHE[baseId] = _empty; return _empty; }
  function _scan(k){
    if(k.indexOf(baseId + '_') !== 0) return;
    var rest = k.substring(baseId.length + 1);
    var parts = rest.split('_');
    if(parts.length !== 3) return;
    var magSeg = parts[0];
    if(magSeg !== 'x' && /^[0-9]+$/.test(magSeg)) magSet[parseInt(magSeg, 10)] = true;
  }
  for(var k in WEAPON_LAYOUT) _scan(k);
  if(typeof WEAPON_MUZZLE !== 'undefined'){
    for(var k2 in WEAPON_MUZZLE) _scan(k2);
  }
  var result = { mags: Object.keys(magSet).map(Number).sort(function(a, b){ return a - b; }) };
  _MOD_OPT_CACHE[baseId] = result;
  return result;
}
window._getModOptionsFromLayout = _getModOptionsFromLayout;



/* ===== PM: 骨架委派共用 ===== */
function _pmSlot(eq,ov){if(!eq)return null;if(ov==='hidden')return null;if(ov&&eq[ov])return ov;
if(eq.primary)return'primary';if(eq.secondary)return'secondary';if(eq.melee)return'melee';return null;}
function _pmAmmo(id){return typeof AMMO!=='undefined'&&!!AMMO[id];}
function _pmAnim(a){return a==='death'?'dead':(a||'idle');}
var _PM_COL={farmer:{b:'#5a9a48',l:'#3a6a2e'},guard:{b:'#5088bb',l:'#2e4a6a'},foreman:{b:'#e0a830',l:'#d8d0c0'},enemy:{b:'#8b2a2a',l:'#3a1010'}};
function _pmColors(t){var c=_PM_COL[t];if(!c)return null;
return{torso:c.b,front_upper_arm:c.b,front_forearm:c.b,back_upper_arm:c.b,back_forearm:c.b,
right_thigh:c.l,right_shin:c.l,left_thigh:c.l,left_shin:c.l};}
function _pmWorker(t,no){if(no)return null;return t==='foreman'?'#ffffff':(t==='farmer'?'#ff8800':null);}
function _pmFit(px,py){/*PM-STANCE*/return{x:px,y:py};}
function computeWeaponCharLayout(cfg){var R=window.PuppetRig;if(!cfg)return null;
var b=R.boxOf(cfg);if(!b)return null;
return{anchorX:0,anchorY:0,rightX:b.bw,baseW:b.bw,baseH:b.bh,isTrimMode:true};}

/* rev-fix-weapon-muzzle-common: 武器 muzzle 在原圖座標系（400×500）的位置 —— 唯一計算入口
 * 探索 / Boss / 後院三處共用，各調用方自行做 canvas 座標系轉換。
 * 完整考慮三層旋轉：L.rot（靜態）+ key.rot（動畫幀）+ cfg.rotation（武器自身）
 * 返回值：{ x, y } 相對 400×500 原圖左上角的像素坐標；若 weaponId 無效返回 null */
window.getCharWeaponMuzzleLocal=function(weaponSlot,weaponId,animName,frameIdx,flipX){
return window.PuppetRig.muzzle(weaponSlot,weaponId,_pmAnim(animName),frameIdx|0,!!flipX);};

const heroImgCache = new Map();
function getHeroImg(src){
  if(!src) return null;
  const v = (typeof assetSuffix === "function") ? assetSuffix(src) : "";
  const cacheKey = src + v;
  if(heroImgCache.has(cacheKey)) return heroImgCache.get(cacheKey);
  const img = new Image();
  img._fallbackTried = false;
  img.onerror = function(){
    if(img._fallbackTried) return;
    img._fallbackTried = true;
    const _fn = src.split('/').pop().replace(/\.png$/i, '');
    const _parts = _fn.split('_');
    if(_parts[0] === 'named' && _parts[1]){
      const _fbPath = window.getItemIconPath(_parts[1]);
      const _fv = (typeof assetSuffix === 'function') ? assetSuffix(_fbPath) : '';
      img.src = _fbPath + _fv;
    }
  };
  img.src = src + v;
  heroImgCache.set(cacheKey, img);
  return img;
}

/* [v246] 啟動時預加載所有靜態圖片，走 getHeroImg 共享 heroImgCache，一次加載永久緩存 */
function preloadStaticAssets(){
  var _ok = 0;
  try {
    // 武器
    if(typeof WEAPONS !== 'undefined'){
      for(var k in WEAPONS){
        if(WEAPONS[k] && WEAPONS[k].slot && !WEAPONS[k].enemyOnly){ /* rev-enemy-only: 敵方專用武器無圖，不預載 */
          getHeroImg(window.getItemIconPath(k)); _ok++;
        }
      }
    }
    // 防具
    if(typeof ARMOR !== 'undefined'){
      for(var k in ARMOR){
        getHeroImg(window.getItemIconPath(k)); _ok++;
      }
    }
    // 消耗品
    if(typeof CONSUMABLES !== 'undefined'){
      for(var k in CONSUMABLES){
        getHeroImg(window.getItemIconPath(k)); _ok++;
      }
    }
    // 彈藥（按口徑映射）
    if(typeof AMMO_ICON_BY_CAL !== 'undefined'){
      for(var cal in AMMO_ICON_BY_CAL){
        getHeroImg('icons/ammo/' + AMMO_ICON_BY_CAL[cal]); _ok++;
      }
    }
    // [rev-img-path] 已装备的改装武器
    if(typeof state !== 'undefined' && state.player && state.player.equipped){
      ['primary','secondary','melee'].forEach(function(slot){
        var _id = state.player.equipped[slot];
        if(_id && isNamedWeaponId(_id)) getHeroImg(window.getItemIconPath(_id));
      });
    }
    if(typeof state !== 'undefined' && state.stashedWeapons){
      for(var _sk in state.stashedWeapons){
        var _sw = state.stashedWeapons[_sk];
        if(_sw && _sw.id && typeof isNamedWeaponId === 'function' && isNamedWeaponId(_sw.id)) getHeroImg(window.getItemIconPath(_sw.id));
      }
    }
    // 建築
    if(typeof BUILDINGS !== 'undefined'){
      getHeroImg('icons/buildings/control.png'); _ok++;
      for(var k in BUILDINGS){
        getHeroImg('icons/buildings/' + k + '.png'); _ok++;
      }
    }
    // 種子
    if(typeof SEEDS !== 'undefined'){
      for(var k in SEEDS){
        var _img = SEEDS[k].img || k;
        getHeroImg('icons/garden/seeds/' + _img + '.png'); _ok++;
      }
    }
    // 作物（成熟 / 幼苗 / 腐爛）
    if(typeof CROPS !== 'undefined'){
      for(var k in CROPS){
        var _img = CROPS[k].img || k;
        getHeroImg('icons/garden/crops/' + _img + '.png'); _ok++;
        getHeroImg('icons/garden/sprouts/sprout_' + _img + '.png'); _ok++;
        getHeroImg('icons/garden/mature/mature_' + _img + '.png'); _ok++;
        getHeroImg('icons/garden/rotten/rotten_' + _img + '.png'); _ok++;
      }
    }
    // 花園地塊背景 + 特殊物品
    var _gardenIcons = ['soil','tower_bg','shed_bg','compost_bg','fridge_bg','distillery_bg','black_soil','red_soil','liquor'];
    for(var i = 0; i < _gardenIcons.length; i++){
      getHeroImg('icons/garden/' + _gardenIcons[i] + '.png'); _ok++;
    }
    getHeroImg('icons/garden/plot_default.png'); _ok++;
    getHeroImg('icons/garden/garden_bg.png'); _ok++;
    // 敵人武器池（關鍵——修屍體沒武器的根本）
    if(typeof ENEMY_WEAPON_POOLS !== 'undefined'){
      var _seen = {};
      for(var eid in ENEMY_WEAPON_POOLS){
        var pool = ENEMY_WEAPON_POOLS[eid];
        var _tierKeys = ['t1','t2'];
        for(var ti = 0; ti < _tierKeys.length; ti++){
          var arr = pool[_tierKeys[ti]];
          if(!arr) continue;
          for(var ai = 0; ai < arr.length; ai++){
            var wid = arr[ai];
            if(_seen[wid]) continue;
            _seen[wid] = 1;
            getHeroImg(window.getItemIconPath(wid)); _ok++;
          }
        }
      }
    }
    // Boss 圖標
    if(typeof BOSSES !== 'undefined'){
      for(var bid in BOSSES){
        var _base = bid.replace(/_ii$/, '');
        getHeroImg('icons/bosses/' + _base + '.png'); _ok++;
      }
    }
    // 載具
    if(typeof VEHICLES !== 'undefined'){
      for(var vid in VEHICLES){
        getHeroImg('icons/vehicles/' + vid + '.png'); _ok++;
      }
    }
    getHeroImg('icons/vehicles/card_bg.png'); _ok++;
    // 僕人
    if(typeof SERVANT_TYPES !== 'undefined'){
      for(var st in SERVANT_TYPES){
        getHeroImg('icons/servants/' + st + '.png'); _ok++;
      }
    }
    // Boss 背景
    if(typeof BOSSES !== 'undefined'){
      for(var bid2 in BOSSES){
        var _base2 = bid2.replace(/_ii$/, '');
        getHeroImg('images/bg/boss/boss_' + _base2 + '.png'); _ok++;
      }
    }
  } catch(e){ console.warn('[preloadStatic]', e); }
  return _ok;
}

window.preloadStaticAssets = preloadStaticAssets;

const heroAnim = { name:'walk', frame:0, lastUpdate:0, forcedEnd:0, eqSlot:null };
const battleHeroAnim = { name:'idle', frame:0, lastUpdate:0, forcedEnd:0 };
/* rev-eqslot: 哪些動畫「擁有」eqSlot / healItem。
   原本各處守衛寫死 name !== 'heal_melee' 就清 eqSlot，
   導致投擲（attack_melee）想隱藏武器也立刻被清掉 → 手上仍畫步槍。
   改為通用集合：動作動畫期間保留，切回 walk / idle 才清。 */
window._HERO_EQ_HOLD = ['heal_melee','attack_melee','fire_primary','fire_secondary','reload','switch_secondary','switch_melee','hurt'];
window._heroEqHolds = function(name){ return window._HERO_EQ_HOLD.indexOf(name) >= 0; };

/* rev-fix-hero-death-anim: 玩家倒地动画统一入口。记录 _deathStart 供渲染端计算 fallProgress。
 * 幂等：已在 dead 状态则不动，避免重生后立刻死亡时误重置。 */
window._playHeroDeath = function(){
/* rev-arm45: forcedEnd=Infinity + updateHeroAnim 的 dead 分支 → 停末幀，絕不自動回 walk */
if(typeof heroAnim === 'undefined') return;
if(heroAnim.name === 'dead') return;
heroAnim.name = 'dead';
heroAnim.frame = 0;
heroAnim.lastUpdate = performance.now();
heroAnim._deathStart = performance.now();
heroAnim.forcedEnd = Infinity;
heroAnim.eqSlot = null;
heroAnim.healItem = null;
};

function computeAnimFrame(animName, startAt, now){
  const a = GAME_ANIMS[animName] || GAME_ANIMS.idle;
  const interval = 1000 / a.fps;
  const elapsed = Math.max(0, now - startAt);
  let f = Math.floor(elapsed / interval);
  if(a.loop){ f = f % a.frameCount; }
  else if(f > a.frameCount - 1){ f = a.frameCount - 1; }
  return f;
}

function updateHeroAnim(now){
const a = GAME_ANIMS[heroAnim.name];
if(!a) return;
/* rev-arm45: 倒地只推進幀、停在末幀 */
if(heroAnim.name === 'dead'){
const iv = 1000 / a.fps;
if(now - heroAnim.lastUpdate >= iv){
heroAnim.lastUpdate = now;
if(heroAnim.frame < a.frameCount - 1) heroAnim.frame++;
}
return;
}
const isFire = heroAnim.name === 'fire_primary' || heroAnim.name === 'fire_secondary' || heroAnim.name === 'attack_melee';
if(isFire && typeof heroAnim.animStart === 'number'){
const interval = 1000 / a.fps;
const elapsed = Math.max(0, now - heroAnim.animStart);
const totalDur = (a.frameCount / a.fps) * 1000;
heroAnim.frame = (elapsed >= totalDur) ? (a.frameCount - 1) : Math.floor(elapsed / interval);
return;
}
const interval = 1000 / a.fps;
if(now - heroAnim.lastUpdate >= interval){
heroAnim.lastUpdate = now;
if(a.loop){ heroAnim.frame = (heroAnim.frame + 1) % a.frameCount; }
else {
if(heroAnim.frame < a.frameCount - 1){ heroAnim.frame++; }
else if(now > (heroAnim.forcedEnd || 0)){
heroAnim.name = 'walk'; heroAnim.frame = 0; heroAnim.eqSlot = null;
}
}
}
}
function updateBattleHeroAnim(now){
  const a = GAME_ANIMS[battleHeroAnim.name];
  if(!a) return;
  const interval = 1000 / a.fps;
  if(now - battleHeroAnim.lastUpdate >= interval){
    battleHeroAnim.lastUpdate = now;
    if(a.loop){
      battleHeroAnim.frame = (battleHeroAnim.frame + 1) % a.frameCount;
    } else {
      if(battleHeroAnim.frame < a.frameCount - 1){
        battleHeroAnim.frame++;
      } else if(battleHeroAnim.forcedEnd && now > battleHeroAnim.forcedEnd){
        battleHeroAnim.name = 'idle';
        battleHeroAnim.frame = 0;
        battleHeroAnim.forcedEnd = 0;
      }
    }
  }
}

function getWeaponCfg(slot,id){return window.PuppetRig.weaponCfg(slot,id);}
function getTopCfg(id){return window.PuppetRig.topCfg(id);}

function getExploreWeaponRightEdge(canvasW,canvasH){var R=window.PuppetRig;
var s=(canvasH*CHAR_HEIGHT_FACTOR)/386,gy=canvasH*0.95,cx=canvasW*EXPLORE_HERO_X_RATIO;
var eq=(typeof state!=='undefined'&&state.player&&state.player.equipped)||{};
var sl=_pmSlot(eq,heroAnim.eqSlot),id=sl?eq[sl]:null;
if(!id)return{x:cx,y:gy};
var m=R.muzzle(sl,id,_pmAnim(heroAnim.name),heroAnim.frame,false);
return m?{x:cx+s*(m.x-200),y:gy+s*(m.y-515)}:{x:cx,y:gy};}

function getPlayerMuzzlePos(){var R=window.PuppetRig;
var fx=document.getElementById('battle-fx');
var W=fx?fx.clientWidth:400,H=fx?fx.clientHeight:500;
var bt=(typeof battle!=='undefined')?battle:null;
var sw=(bt&&bt.playerCanvasW)?bt.playerCanvasW:220;
var sh=(bt&&bt.playerCanvasH)?bt.playerCanvasH:((typeof BATTLE_HERO_SPRITE_H==='number')?BATTLE_HERO_SPRITE_H:118);
var s=(sh*CHAR_HEIGHT_FACTOR)/386,gy=sh*0.95,cx=sw/2;
var eq=(typeof state!=='undefined'&&state.player&&state.player.equipped)||{};
var sl=_pmSlot(eq,bt?bt.weaponSlot:null),id=sl?eq[sl]:null;
var lx=cx,ly=gy-sh*0.4;
if(id){var m=R.muzzle(sl,id,_pmAnim(battleHeroAnim.name),battleHeroAnim.frame,false);
if(m){lx=cx+s*(m.x-200);ly=gy+s*(m.y-515);}}
var px=bt?bt.px:0.15;return{x:(px*W-sw/2+lx)/W,y:ly/H};}

/* ===== rev-arm45: 兩手角色互換 + 右手持槍（唯一真相源） =====
前側手＝近側小臂；後側手＝遠側小臂。
面向右：右手 = front_arm；面向左：右手 = back_arm。
面向左時兩手互換角色（幾何 + 動畫 keys 同步互換）：
  front_arm 長度不變，遠端對齊原 back_arm 遠端；
  back_arm  w/h/pivot 同步 front_arm，近端＝原 front_arm 近端，上緣＝原 back_arm 上緣。
武器/物品沿用原 ox/oy 綁在右手方塊 → 等價錨點，不需任何抵肩補償。 */












/* rev-corpse-fit: 倒地包圍盒防裁切 —— 僅在會被畫布邊緣裁切時最小位移（所有渲染器同一規則）。
   +90° 面朝右：頭/盔向右伸 ~500 原圖單位、盔下緣向地面下伸 ~82；flip 鏡像。 */
window._corpseFit=function(px,py){/*PM-STANCE*/return{x:px,y:py};};
function drawBlockHero(ctx,canvasW,canvasH,animName,frameIdx,weaponSlotOverride,charHFactor,centerXRatio,legOverride,healItemId,fallProgress,flipXArg){
var R=window.PuppetRig;
var eq=(typeof state!=='undefined'&&state.player&&state.player.equipped)||{};
var s=(canvasH*(charHFactor||CHAR_HEIGHT_FACTOR))/386,gy=canvasH*0.95;
var cx=canvasW*((centerXRatio!=null)?centerXRatio:0.5);
var an=_pmAnim(animName),flip=!!flipXArg;
var sl=_pmSlot(eq,weaponSlotOverride),id=sl?eq[sl]:null;

R.draw(ctx,cx,gy,s,{anim:an,frame:frameIdx|0,flip:flip,slot:sl,weaponId:id,
head:eq.head,top:eq.top,healId:healItemId,ammoBox:_pmAmmo(id)});}

function renderExploreHeroCanvas(){
  if(typeof currentTab === 'undefined' || currentTab !== 'explore') return;
  /* [v187 H33] 渲染层兜底：非 heal_melee 时清 eqSlot / healItem。
     即使 H32 因某种原因没跑（比如 tick 循环挂了），渲染层也保证不残留。 */
  if(typeof heroAnim !== 'undefined' && !(window._heroEqHolds && window._heroEqHolds(heroAnim.name))){
    if(heroAnim.eqSlot === '__hidden__') heroAnim.eqSlot = null;
    if(heroAnim.healItem) heroAnim.healItem = null;
  }
  const canvas = document.getElementById('hero-canvas');
  if(!canvas) return;
  const zone = document.getElementById('zone1');
  if(!zone) return;
  const w = zone.clientWidth, h = zone.clientHeight;
  if(canvas.width !== w || canvas.height !== h){ canvas.width = w; canvas.height = h; }
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, w, h);
  const btr = window.BTRSupport;
  const clipH = (btr && btr.active) ? btr.playerClipH : 1.0;
  /* rev-fix-wreck-render-offset: wreck 阶段玩家已下车，offset 强制 0，兜底防 12px 跳变。 */
  const _isWreckPhaseRO = !!(btr && btr.active && (btr.phase === 'wreck' || btr.phase === 'wreckPause'));
  const offsetX = (btr && btr.active && !_isWreckPhaseRO) ? btr.playerXOffset : 0;
  if(clipH > 0.001){
    if(clipH < 1.0){
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, w, h * clipH);
      ctx.clip();
    }
    /* [v180 F6e] 只在 heal_melee 動畫時傳 healItem，避免其他動畫狀態渲染治療圖標 */
    /* [v184b H19-C] 只在 heal_melee 时传 eqSlot / healItem。
       v180 F6e 只改了 healItem，没改 eqSlot——healing 被打断后
       eqSlot='__hidden__' 残留，导致武器一直不显示。 */
    const _eqSlotH19 = heroAnim.eqSlot || null; /* rev-eqslot */
    const _healItemH19 = heroAnim.healItem || null; /* rev-eqslot */
    /* rev-fix-hero-death-progress: dead 状态基于 _deathStart 计算倒地进度 0→1（350ms） */
    let _fallProgressH = 1;
    if(heroAnim.name === 'dead' && heroAnim._deathStart){
      _fallProgressH = Math.min(1, (performance.now() - heroAnim._deathStart) / 350);
    }
    drawBlockHero(ctx, w, h, heroAnim.name, heroAnim.frame, _eqSlotH19, CHAR_HEIGHT_FACTOR, EXPLORE_HERO_X_RATIO + offsetX, null, _healItemH19, _fallProgressH);
    if(clipH < 1.0) ctx.restore();
  }
}

function renderBattleHeroCanvas(){
  /* rev-hands: 治療 / 投擲不畫武器；上車依 playerClipH 裁切，完全登車則連 HUD 整塊隱藏 */
  if(typeof battle === 'undefined' || !battle) return;
  const canvas = document.getElementById('hero-battle-canvas');
  if(!canvas) return;
  const w = canvas.clientWidth || 220;
  const h = canvas.clientHeight || 118;
  if(canvas.width !== w || canvas.height !== h){ canvas.width = w; canvas.height = h; }
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, w, h);
  const btr = window.BTRSupport;
  const _onBoard = !!(btr && btr.active);
  const _isWreck = !!(_onBoard && (btr.phase === 'wreck' || btr.phase === 'wreckPause'));
  const clipH = _onBoard ? btr.playerClipH : 1.0;
  const _hpw = document.querySelector('.hero-f .hpbar-wrap');
  if(_hpw) _hpw.style.display = (clipH <= 0.01) ? 'none' : '';
  if(clipH <= 0.001) return;
  const offsetX = (_onBoard && !_isWreck) ? (btr.playerXOffset || 0) : 0;
  const overrideSlot = battle.consuming ? 'hidden'
    : (battleHeroAnim.eqSlot || ((battle.weaponSlot === 'throwable') ? 'hidden' : battle.weaponSlot));
  if(clipH < 1.0){
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, w, h * clipH);
    ctx.clip();
  }
  drawBlockHero(ctx, w, h, battleHeroAnim.name, battleHeroAnim.frame, overrideSlot,
    CHAR_HEIGHT_FACTOR, 0.5 + offsetX, battleHeroAnim.legOverride || null, battleHeroAnim.healItem || null);
  if(clipH < 1.0) ctx.restore();
}

function renderZone2Silhouette(){
  /* no-op：drawSilhouette 從未實作，zone2-silhouette canvas 不存在 */
}


/* rev-fix-render-move: 從 23-garden-raid.js 搬移的繪製函數 */



function drawBucketUnit(ctx, u){
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(u.bx - u.topHalf, u.topY);
  ctx.lineTo(u.bx + u.topHalf, u.topY);
  ctx.lineTo(u.bx + u.botHalf, u.botY);
  ctx.lineTo(u.bx - u.botHalf, u.botY);
  ctx.closePath();
  ctx.fillStyle = '#9aa2aa';
  ctx.fill();
  ctx.strokeStyle = '#464d55';
  ctx.lineWidth = 5;
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.restore();
}


function drawHandItemUnit(ctx, u){
  if(u.handItemType === 'sack'){
    const cx = u.bagX;
    const cy = u.bagY;
    ctx.save();
    ctx.fillStyle = '#ede4d3';
    ctx.strokeStyle = '#464d55';
    ctx.lineWidth = 5;
    ctx.lineJoin = 'round';
    const topW = 42, topH = 31;
    ctx.beginPath();
    ctx.moveTo(cx - topW/2, cy - topH);
    ctx.lineTo(cx + topW/2, cy - topH);
    ctx.lineTo(cx, cy);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    const botW = 87, botH = 87;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + botW/2, cy + botH);
    ctx.lineTo(cx - botW/2, cy + botH);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  } else if(u.handItemType === 'shovel'){
    const ax = u.anchorX;
    const ay = u.anchorY;
    const D_W = 30, D_H = 36;
    const HANDLE_LEN = 148, HANDLE_W = 6;
    const HEAD_W = 45, HEAD_H = 57;
    const forkY = ay + D_H;
    const handleBot = forkY + HANDLE_LEN;
    const headBot = handleBot + HEAD_H;
    ctx.save();
    ctx.strokeStyle = '#9a9a9a';
    ctx.lineWidth = HANDLE_W;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(ax, forkY);
    ctx.lineTo(ax - D_W/2, ay);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(ax, forkY);
    ctx.lineTo(ax + D_W/2, ay);
    ctx.stroke();
    ctx.lineWidth = HANDLE_W + 2;
    ctx.beginPath();
    ctx.moveTo(ax - D_W/2, ay);
    ctx.lineTo(ax + D_W/2, ay);
    ctx.stroke();
    ctx.lineWidth = HANDLE_W;
    ctx.lineCap = 'butt';
    ctx.beginPath();
    ctx.moveTo(ax, forkY);
    ctx.lineTo(ax, handleBot);
    ctx.stroke();
    ctx.fillStyle = '#8a8f95';
    ctx.strokeStyle = '#464d55';
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(ax - HEAD_W/2, handleBot);
    ctx.lineTo(ax + HEAD_W/2, handleBot);
    ctx.lineTo(ax + HEAD_W/2 + 2, headBot);
    ctx.lineTo(ax - HEAD_W/2 - 2, headBot);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#5a6068';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ax, handleBot + 5);
    ctx.lineTo(ax, headBot - 8);
    ctx.stroke();
    ctx.restore();
  } else if(u.handItemType === 'clipboard'){
    const w = 90, h = 110;
    const cx = u.armMidX;
    const cy = u.armMidY + 7;
    ctx.save();
    ctx.fillStyle = '#3a78c8';
    ctx.fillRect(cx - w/2, cy - h/2, w, h);
    ctx.restore();
  } else if(u.handItemType === 'flask'){
    const positions = u.flaskPositions || [];
    const R = 37;
    const NECK_W = 26;
    const NECK_H = 52;
    const halfNeck = NECK_W / 2;
    const BODY_OFFSET = R + NECK_H/2 - 3;
    for(const pos of positions){
      const cx = pos.x;
      const cy = pos.y + BODY_OFFSET;
      const neckTopY = cy - R - NECK_H;
      const neckBottomY = cy - R + 5;
      const _dy = neckBottomY - cy;
      const _angleRight = Math.atan2(_dy, halfNeck);
      const _angleLeft = Math.atan2(_dy, -halfNeck);
      ctx.save();
      ctx.fillStyle = 'rgba(80,138,100,0.92)';
      ctx.strokeStyle = '#1f3a2a';
      ctx.lineWidth = 8;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(cx - halfNeck, neckTopY);
      ctx.lineTo(cx - halfNeck, neckBottomY);
      ctx.arc(cx, cy, R, _angleLeft, _angleRight, true);
      ctx.lineTo(cx + halfNeck, neckTopY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - halfNeck - 8, neckTopY);
      ctx.lineTo(cx + halfNeck + 8, neckTopY);
      ctx.stroke();
      ctx.fillStyle = 'rgba(180,230,200,0.55)';
      ctx.beginPath();
      ctx.ellipse(cx - R*0.32, cy - R*0.25, R*0.32, R*0.14, -0.4, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();
    }
  }
}


function _raidDrawHuman(ctx,px,py,scale,equipped,equippedRarity,animName,frameIdx,weaponSlotOverride,servantType,flipX,hasBucket,handItem,noWorkerHelmet,legOverride){
var R=window.PuppetRig;var eq=equipped||{};
var an=_pmAnim(animName),flip=!!flipX;
var sl=_pmSlot(eq,weaponSlotOverride),id=sl?eq[sl]:null;
var wk=_pmWorker(servantType,noWorkerHelmet);

R.draw(ctx,px,py,scale,{anim:an,frame:frameIdx|0,flip:flip,slot:sl,weaponId:id,
head:eq.head,top:eq.top,colors:_pmColors(servantType),
bucket:!!hasBucket,handItem:handItem,worker:wk,ammoBox:_pmAmmo(id)});}





function _raidDrawEnemy(ctx,px,py,scale,animName,frameIdx,enemyId){
var rid=enemyId;
if(typeof HUMAN_ENEMY_DATA!=='undefined'){
if(!HUMAN_ENEMY_DATA[enemyId]&&HUMAN_ENEMY_DATA['human_'+enemyId])rid='human_'+enemyId;
if(HUMAN_ENEMY_DATA[rid]){
if(!window._pmEqC)window._pmEqC={};
if(!window._pmEqC[rid]){var e=null;
try{if(typeof _rev506_getRandomEquip==='function')e=_rev506_getRandomEquip(rid);}catch(x){}
window._pmEqC[rid]=e||{head:'ssh68',top:'6b231',primary:'ak74'};}
var eq=window._pmEqC[rid]||{};
_raidDrawHuman(ctx,px,py,scale,eq,{},_pmAnim(animName),frameIdx|0,
_pmSlot(eq,null),'enemy',true,false,null,true,null);
return;}}
_raidDrawHuman(ctx,px,py,scale,{head:'ssh68',top:'6b231',primary:'ak74'},{},
_pmAnim(animName),frameIdx|0,'primary','enemy',true,false,null,true,null);}

/* ===== rev-btn-unify:start ===== */
(function(){
'use strict';
if(document.getElementById('gp-btn-unify')) return;
var st=document.createElement('style');
st.id='gp-btn-unify';
st.textContent='/* ===== rev-btn-unify: 全遊戲按鍵幾何統一（靜態一次注入；顏色一律不动） ===== */\nhtml{--gp-btn-h:28px;--gp-row-gap:6px}\n.btn:not(.srv-sa-cell):not(.gp-plot):not(.item-row):not(.st-pd-slot):not(.st-pd-grenade):not(.gs-cell):not(.wk-x):not(.weapon-slot-btn):not(.wk-filter):not(.fm-btn):not(.fire-btn):not(.heal-btn):not(.radio-btn):not(.tab):not(.subnav-tab):not(.mode-btn):not(.tier-btn):not(.boss-tier-btn),\nbutton:not(.srv-sa-cell):not(.gp-plot):not(.item-row):not(.st-pd-slot):not(.st-pd-grenade):not(.gs-cell):not(.wk-x):not(.weapon-slot-btn):not(.wk-filter):not(.fm-btn):not(.fire-btn):not(.heal-btn):not(.radio-btn):not(.tab):not(.subnav-tab):not(.mode-btn):not(.tier-btn):not(.boss-tier-btn),\n.z3-btn:not(.srv-sa-cell):not(.gp-plot):not(.item-row):not(.st-pd-slot):not(.st-pd-grenade):not(.gs-cell):not(.wk-x):not(.weapon-slot-btn):not(.wk-filter):not(.fm-btn):not(.fire-btn):not(.heal-btn):not(.radio-btn):not(.tab):not(.subnav-tab):not(.mode-btn):not(.tier-btn):not(.boss-tier-btn),\n.st-x:not(.srv-sa-cell):not(.gp-plot):not(.item-row):not(.st-pd-slot):not(.st-pd-grenade):not(.gs-cell):not(.wk-x):not(.weapon-slot-btn):not(.wk-filter):not(.fm-btn):not(.fire-btn):not(.heal-btn):not(.radio-btn):not(.tab):not(.subnav-tab):not(.mode-btn):not(.tier-btn):not(.boss-tier-btn),\n.modal-hd .x:not(.srv-sa-cell):not(.gp-plot):not(.item-row):not(.st-pd-slot):not(.st-pd-grenade):not(.gs-cell):not(.wk-x):not(.weapon-slot-btn):not(.wk-filter):not(.fm-btn):not(.fire-btn):not(.heal-btn):not(.radio-btn):not(.tab):not(.subnav-tab):not(.mode-btn):not(.tier-btn):not(.boss-tier-btn){\n  height:var(--gp-btn-h)!important;\n  min-height:var(--gp-btn-h)!important;\n  max-height:var(--gp-btn-h)!important;\n  padding:0 12px!important;\n  font-size:11px!important;\n  line-height:1!important;\n  display:inline-flex!important;\n  align-items:center!important;\n  justify-content:center!important;\n  gap:4px!important;\n  border-radius:5px!important;\n  box-sizing:border-box!important;\n  white-space:nowrap!important;\n  vertical-align:middle!important;\n  background-image:none;\n}\n/* ===== rev-row-geom: 等級 / 體力 / 生命 三列等距等長 ===== */\n.gp-vrow{display:grid;grid-template-columns:34px minmax(0,1fr) 72px 46px;align-items:center;gap:8px;height:var(--gp-btn-h);margin:var(--gp-row-gap) 0}\n.gp-vlbl{font-size:10px;color:#8a7c68;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n.gp-vbar{position:relative;height:8px;border-radius:4px;background:#4a1212;border:1px solid #2a1a14;overflow:hidden;min-width:0}\n.gp-vbar>i{position:absolute;left:0;top:0;bottom:0;display:block;border-radius:3px}\n.gp-vnum{font:10px/1 ui-monospace,Menlo,Consolas,monospace;color:#cbbfae;text-align:right;white-space:nowrap;overflow:hidden;font-variant-numeric:tabular-nums}\n.gp-vact{display:flex;justify-content:flex-end;align-items:center;min-width:0}\n.gp-vact:empty{visibility:hidden}\n@media(max-width:420px){.gp-vrow{grid-template-columns:30px minmax(0,1fr) 62px 44px;gap:6px}}';
(document.head||document.documentElement).appendChild(st);
})();
/* ===== rev-btn-unify:end ===== */

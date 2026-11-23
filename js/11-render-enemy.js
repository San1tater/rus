'use strict';
/* ============================================================
   人形敵人渲染 —— 唯一 rig 路徑（自包含）
   姿勢 / 層序 / 掛載一律讀 __PUPPET_BAKE__ 的授權資料。
   不依賴 WEAPON_LAYOUT.ox/oy，不依賴 HERO_VISIBLE_EQ。
   ============================================================ */
const _EQI = {
  human_raider: {
    head:['ssh68','sssh94','kolpak'],
    top:['paca','6b23','zhuk3'],
    primary:['aks74u','aks74un','ak74','akms','akm','akmn']
  },
  human_raider_vet: {
    head:['6b47','6b47m','kiver','maska'],
    top:['6b13','6b13m','6b231','6b232'],
    primary:['ak74m','ak103','ak104','ak105','ak12']
  },
  human_rocket_gunner: {
    head:['6b47','6b47m'],
    top:['6b23','6b231'],
    primary:['ak74','akms','akmn']
  }
};
function _pickR(a){ return (!a || !a.length) ? null : a[Math.floor(Math.random()*a.length)]; }
function _isMeleeWeapon(id){
  if(!id) return false;
  if(typeof WEAPONS !== 'undefined' && WEAPONS[id]){
    if(WEAPONS[id].slot === 'melee') return true;
    if(WEAPONS[id].type === '刺刀') return true;
  }
  return id === '6kh2' || id === '6kh5' || id === 'kukri';
}
function _getRandomEquipForEnemy(id){
  var p = _EQI[id]; if(!p) return null;
  return { head:_pickR(p.head), top:_pickR(p.top), primary:_pickR(p.primary) };
}
function _resolveEnemyDef(id){
  if(typeof HUMAN_ENEMY_DATA === 'undefined') return null;
  if(HUMAN_ENEMY_DATA[id]) return { def:HUMAN_ENEMY_DATA[id], resolvedId:id };
  var k = 'human_' + id;
  if(HUMAN_ENEMY_DATA[k]) return { def:HUMAN_ENEMY_DATA[k], resolvedId:k };
  return null;
}
/* 敵人自訂 anims 退場：回傳 rig 時序（含 death 別名），外部呼叫不斷鏈 */
function _resolveEnemyAnims(id){
  if(typeof GAME_ANIMS === 'undefined') return null;
  if(!window._pmAnimShim){
    var o = {}, k;
    for(k in GAME_ANIMS){
      var a = GAME_ANIMS[k];
      o[k] = { frameCount:a.frameCount, fps:a.fps, loop:a.loop, keys:{} };
    }
    o.death = o.dead || o.idle;
    window._pmAnimShim = o;
  }
  return window._pmAnimShim;
}
var _PM_COL = {
  enemy:{b:'#8b2a2a',l:'#3a1010'}, farmer:{b:'#5a9a48',l:'#3a6a2e'},
  guard:{b:'#5088bb',l:'#2e4a6a'}, foreman:{b:'#e0a830',l:'#d8d0c0'}
};
function _pmColors(t){
  var c = _PM_COL[t]; if(!c) return null;
  return { torso:c.b, front_upper_arm:c.b, front_forearm:c.b, back_upper_arm:c.b, back_forearm:c.b,
    right_thigh:c.l, right_shin:c.l, left_thigh:c.l, left_shin:c.l };
}
function _pmAmmo(id){ return (typeof AMMO !== 'undefined') && !!AMMO[id]; }
/* 死亡當下持有：_activeWeapon 優先，否則 primary → secondary → melee。只回傳一把。 */
function _pmWeaponOf(en){
  if(!en) return null;
  var w = null;
  if(typeof _enemyActiveWeapon === 'function'){ try{ w = _enemyActiveWeapon(en); }catch(e){} }
  if(!w){
    var ex = en._exhaustedWeapons || {};
    w = en._activeWeapon
      || (en.primaryWeapon && !ex[en.primaryWeapon.id] && en.primaryWeapon)
      || (en.secondaryWeapon && !ex[en.secondaryWeapon.id] && en.secondaryWeapon)
      || (en.melee && !ex[en.melee.id] && en.melee) || null;
  }
  if(!w || !w.id) return null;
  var sl = (en.primaryWeapon && en.primaryWeapon.id === w.id) ? 'primary'
    : (en.secondaryWeapon && en.secondaryWeapon.id === w.id) ? 'secondary' : 'melee';
  return { id:w.id, slot:sl };
}
/* [v182 G13] 裝備快取：同一敵人兩次渲染不得換裝備 */
function _pmEquip(en, drawId){
  if(!en._corpseEquip){
    var pool = _EQI[drawId] || _EQI.human_raider;
    var aw = _pmWeaponOf(en);
    var eq = { head: en.helmet || _pickR(pool.head), top: en.body || _pickR(pool.top) };
    if(aw) eq[aw.slot] = aw.id; else eq.primary = _pickR(pool.primary);
    en._corpseEquip = eq;
    en._corpseSlot = aw ? aw.slot : 'primary';
  }
  return en._corpseEquip;
}
/* 屍體畫布：墨跡四邊距畫布緣恰好 pad；footX = 腳點在畫布內的 x。
   呼叫端用 pad 讓墨跡下緣貼齊窗格下緣再下沉。 */
function _renderEnemyCorpseCanvas(enemy, fxH){
  var R = window.PuppetRig;
  if(!R || !enemy || !(fxH > 0)) return null;
  var eid = enemy.eid || enemy.id; if(!eid) return null;
  var r = _resolveEnemyDef(eid);
  var eq = _pmEquip(enemy, r ? r.resolvedId : 'human_raider');
  var slot = enemy._corpseSlot || 'primary';
  var id = eq[slot] || null;
  var cfg = id ? R.weaponCfg(slot, id) : null;
  var opt = { head:eq.head||null, top:eq.top||null, headEnv:!eq.head, topEnv:!eq.top };
  var bb = R.bbox('dead', 9999, true, cfg, opt);
  if(!bb || !(bb.w > 0) || !(bb.h > 0)) return null;
  var sc = (fxH * CHAR_HEIGHT_FACTOR) / 386, pad = 4;
  var dW = bb.w*sc + pad*2, dH = bb.h*sc + pad*2;
  var px = pad - sc*(bb.x0 - 200);
  var py = pad - sc*(bb.y0 - 515);
  var cvs = document.createElement('canvas');
  cvs.width = Math.max(2, Math.round(dW*2));
  cvs.height = Math.max(2, Math.round(dH*2));
  var g = cvs.getContext('2d');
  g.setTransform(2, 0, 0, 2, 0, 0);
  R.draw(g, px, py, sc, { anim:'dead', frame:9999, flip:true, slot:slot, weaponId:id,
    head:eq.head, top:eq.top, colors:_pmColors('enemy'), ammoBox:_pmAmmo(id) });
  return { canvas:cvs, drawW:dW, drawH:dH, footX:px, footY:py, pad:pad };
}
/* 後院屍體：墨跡水平置中於 x，下緣落在 y 再下沉 2px */
function _pmCorpseAt(ctx, x, y, sc, eid, frame, unit){
  var R = window.PuppetRig;
  if(!R || !ctx || !(sc > 0)) return;
  var r = _resolveEnemyDef(eid);
  var eq = null, slot = null, id = null;
  if(unit){
    var aw = _pmWeaponOf(unit);
    eq = { head: unit.helmet || null, top: unit.body || null };
    if(aw){ eq[aw.slot] = aw.id; slot = aw.slot; id = aw.id; }
  }
  if(!id){
    if(!window._pmRaidEq) window._pmRaidEq = {};
    var key = r ? r.resolvedId : 'human_raider';
    if(!window._pmRaidEq[key]){
      window._pmRaidEq[key] = _getRandomEquipForEnemy(key) || { head:'ssh68', top:'6b231', primary:'ak74' };
    }
    eq = window._pmRaidEq[key];
    slot = eq.primary ? 'primary' : (eq.secondary ? 'secondary' : (eq.melee ? 'melee' : null));
    id = slot ? eq[slot] : null;
  }
  var cfg = id ? R.weaponCfg(slot, id) : null;
  var fi = (frame == null ? 9999 : frame);
  var bb = R.bbox('dead', fi, true, cfg, { head:eq.head||null, top:eq.top||null, headEnv:!eq.head, topEnv:!eq.top });
  if(!bb) return;
  var px = x - sc*((bb.x0 + bb.x1)/2 - 200);
  var py = y + 2 - sc*(bb.y1 - 515);
  R.draw(ctx, px, py, sc, { anim:'dead', frame:fi, flip:true, slot:slot, weaponId:id,
    head:eq.head, top:eq.top, colors:_pmColors('enemy'), ammoBox:_pmAmmo(id) });
}
/* 舊簽名轉接 */
function _drawHumanCorpse(ctx, drawId, s, ox, oy, def, anim, fi, eqD, isDeath){
  var R = window.PuppetRig; if(!R || !ctx) return;
  var cw = (def && def.canvas) ? def.canvas.w : 400;
  var ch = (def && def.canvas) ? def.canvas.h : 500;
  var eq = eqD || {};
  var slot = eq.primary ? 'primary' : (eq.secondary ? 'secondary' : (eq.melee ? 'melee' : null));
  var id = slot ? eq[slot] : null;
  if(!isDeath){
    R.draw(ctx, ox + cw*s/2, oy + ch*s, s, { anim:'idle', frame:0, flip:true,
      slot:slot, weaponId:id, head:eq.head, top:eq.top, colors:_pmColors('enemy') });
    return;
  }
  var cfg = id ? R.weaponCfg(slot, id) : null;
  var f = (fi == null ? 9999 : fi);
  var bb = R.bbox('dead', f, true, cfg, { head:eq.head||null, top:eq.top||null, headEnv:!eq.head, topEnv:!eq.top });
  if(!bb) return;
  R.draw(ctx, ox + cw*s/2 - s*((bb.x0+bb.x1)/2 - 200), oy + ch*s - s*(bb.y1 - 515), s,
    { anim:'dead', frame:f, flip:true, slot:slot, weaponId:id,
      head:eq.head, top:eq.top, colors:_pmColors('enemy'), ammoBox:_pmAmmo(id) });
}
/* 舊量測 API → rig 轉接 */
function _measureDeathBBox(def, anim, frame){
  var R = window.PuppetRig; if(!R) return null;
  var b = R.bbox('dead', frame == null ? 9999 : frame, true, null, {});
  if(!b) return null;
  return { minX:b.x0, minY:b.y0, maxX:b.x1, maxY:b.y1, w:b.w, h:b.h };
}
function _measureLayerMaxY(def, anim, frame, layerId){
  var R = window.PuppetRig; if(!R) return null;
  var k = R.B.ix[layerId]; if(k == null) return null;
  var q = R.fr('L', 'dead', frame == null ? 9999 : frame);
  var d = q.d.L[k], m = R.lm(d);
  return Math.max(R.P(m,0,0).y, R.P(m,d[3],0).y, R.P(m,0,d[4]).y, R.P(m,d[3],d[4]).y);
}
/* ===== 匯出 ===== */
window._EQI = _EQI;
window._pickR = _pickR;
window._isMeleeWeapon = _isMeleeWeapon;
window._getRandomEquipForEnemy = _getRandomEquipForEnemy;
window._rev506_getRandomEquip = _getRandomEquipForEnemy;
window._resolveEnemyDef = _resolveEnemyDef;
window.resolveEnemyDef = _resolveEnemyDef;
window._resolveEnemyAnims = _resolveEnemyAnims;
window._measureDeathBBox = _measureDeathBBox;
window._measureLayerMaxY = _measureLayerMaxY;
window._pmColors = _pmColors;
window._pmWeaponOf = _pmWeaponOf;
window._pmCorpseAt = _pmCorpseAt;
window._renderEnemyCorpseCanvas = _renderEnemyCorpseCanvas;
window._drawHumanCorpse = _drawHumanCorpse;
window._rev506_drawHumanCorpse = _drawHumanCorpse;
/* ===== 裝備圖示預載 ===== */
(function(){
  var ids = {}, k;
  for(k in _EQI){
    var p = _EQI[k];
    if(p.head) p.head.forEach(function(x){ ids[x]=1; });
    if(p.top) p.top.forEach(function(x){ ids[x]=1; });
    if(p.primary) p.primary.forEach(function(x){ ids[x]=1; });
  }
  setTimeout(function(){
    for(var id in ids){ try{ getHeroImg(window.getItemIconPath(id)); }catch(e){} }
  }, 200);
})();


'use strict';

var _DEF_COLORS = {
  head:'#c89870', face:'#b88860', torso:'#4a4038',
  right_leg:'#3a3028', left_leg:'#3a3028',
  front_arm:'#4a3a2e', back_arm:'#4a3a2e',
  helmet:'#5a5a5a', legs:'#3a3028'
};

function _resolveEnemyDef(id){
  if(typeof BEAST_LAYERS !== 'undefined' && BEAST_LAYERS[id]) return {def:BEAST_LAYERS[id], resolvedId:id};
  if(typeof HUMAN_ENEMY_DATA !== 'undefined' && HUMAN_ENEMY_DATA[id]) return {def:HUMAN_ENEMY_DATA[id], resolvedId:id};
  if(typeof HUMAN_ENEMY_DATA !== 'undefined' && HUMAN_ENEMY_DATA['human_' + id]) return {def:HUMAN_ENEMY_DATA['human_' + id], resolvedId:'human_' + id};
  return null;
}
function _resolveEnemyAnims(id){
  if(typeof BEAST_ANIMS !== 'undefined' && BEAST_ANIMS[id]) return BEAST_ANIMS[id];
  if(typeof HUMAN_ENEMY_DATA !== 'undefined' && HUMAN_ENEMY_DATA[id] && HUMAN_ENEMY_DATA[id].anims) return HUMAN_ENEMY_DATA[id].anims;
  return null;
}
function _isMeleeWeapon(id){
  if(!id) return false;
  if(typeof WEAPONS !== 'undefined' && WEAPONS[id] && WEAPONS[id].slot === 'melee') return true;
  if(typeof WEAPONS !== 'undefined' && WEAPONS[id] && WEAPONS[id].type === '刺刀') return true;
  if(id === '6kh2' || id === '6kh5' || id === 'kukri') return true;
  return false;
}

function _measureLayerMaxY(def, anim, frame, layerId){
  var L = def.layers.find(function(l){ return l.id === layerId; });
  if(!L) return null;
  var cw = def.canvas.w, ch = def.canvas.h;
  var rootRot = ((anim.rootRot && anim.rootRot[frame]) || 0) * Math.PI / 180;
  var rootDy = (anim.rootDy && anim.rootDy[frame]) || 0;
  var rp = anim.rootPivot || {x:0.5, y:0.95};
  var pcx = cw * rp.x, pcy = ch * rp.y, cosR = Math.cos(rootRot), sinR = Math.sin(rootRot);
  var k = (anim.keys && anim.keys[L.id] && anim.keys[L.id][frame]) || {rot:0, dx:0, dy:0};
  var w = cw * L.w, h = ch * L.h;
  var cx = cw * L.x + cw * (k.dx || 0) * 0.01;
  var cy = ch * L.y + ch * (k.dy || 0) * 0.01;
  var px = w * L.pivot.x, py = h * L.pivot.y;
  var rot = ((L.rot || 0) + (k.rot || 0)) * Math.PI / 180;
  var cL = Math.cos(rot), sL = Math.sin(rot);
  var cs = [[-px,-py],[w-px,-py],[-px,h-py],[w-px,h-py]];
  var maxY = -Infinity;
  for(var ci = 0; ci < 4; ci++){
    var lx = cs[ci][0], ly = cs[ci][1];
    var Px = cx + lx * cL - ly * sL;
    var Py = cy + lx * sL + ly * cL;
    var ry = pcy + (Px - pcx) * sinR + (Py - pcy) * cosR + ch * rootDy;
    if(ry > maxY) maxY = ry;
  }
  return maxY;
}

function _measureDeathBBox(def, anim, frame){
  var cw = def.canvas.w, ch = def.canvas.h;
  var rootRot = ((anim.rootRot && anim.rootRot[frame]) || 0) * Math.PI / 180;
  var rootDy = (anim.rootDy && anim.rootDy[frame]) || 0;
  var rp = anim.rootPivot || {x:0.5, y:0.95};
  var pcx = cw * rp.x, pcy = ch * rp.y;
  var cosR = Math.cos(rootRot), sinR = Math.sin(rootRot);
  var mnX = Infinity, mnY = Infinity, mxX = -Infinity, mxY = -Infinity;
  for(var li = 0; li < def.layers.length; li++){
    var L = def.layers[li];
    var k = (anim.keys && anim.keys[L.id] && anim.keys[L.id][frame]) || {rot:0, dx:0, dy:0};
    var w = cw * L.w, h = ch * L.h;
    var cx = cw * L.x + cw * (k.dx || 0) * 0.01;
    var cy = ch * L.y + ch * (k.dy || 0) * 0.01;
    var px = w * L.pivot.x, py = h * L.pivot.y;
    var rot = ((L.rot || 0) + (k.rot || 0)) * Math.PI / 180;
    var cL = Math.cos(rot), sL = Math.sin(rot);
    var cs = [[-px,-py],[w-px,-py],[-px,h-py],[w-px,h-py]];
    for(var ci = 0; ci < 4; ci++){
      var lx = cs[ci][0], ly = cs[ci][1];
      var Px = cx + lx * cL - ly * sL;
      var Py = cy + lx * sL + ly * cL;
      var rx = pcx + (Px - pcx) * cosR - (Py - pcy) * sinR;
      var ry = pcy + (Px - pcx) * sinR + (Py - pcy) * cosR + ch * rootDy;
      if(rx < mnX) mnX = rx;
      if(ry < mnY) mnY = ry;
      if(rx > mxX) mxX = rx;
      if(ry > mxY) mxY = ry;
    }
  }
  if(!isFinite(mnX)) return null;
  return {minX:mnX, minY:mnY, maxX:mxX, maxY:mxY, w:mxX - mnX, h:mxY - mnY};
}

function _tryDrawArmorAtLayer(ctx, armorId, lw, lh, px, py){
  if(typeof HEAD_ARMOR_LAYOUT === 'undefined') return false;
  var cfg = HEAD_ARMOR_LAYOUT[armorId];
  if(!cfg) return false;
  var img = (typeof getHeroImg === 'function') ? getHeroImg('icons/items/' + resolveIconId(armorId) + '.png') : null;
  if(!img || !img.complete || !img.naturalWidth) return false;
  var lid = cfg.layer || 'head';
  var pl = GAME_LAYERS.find(function(l){ return l.id === lid; });
  var pw = pl ? (340 * pl.w) : 68;
  var ratio = lw / pw, bW = 400 * (cfg.scale || 0.3) * ratio;
  var ar = img.naturalWidth / img.naturalHeight, bH = bW / ar;
  var lX = px + lw * (cfg.ox || 0), lY = py + lh * (cfg.oy || 0);
  ctx.save();
  ctx.translate(lX, lY);
  ctx.scale(-1, 1);
  if(cfg.rotation) ctx.rotate(cfg.rotation * Math.PI / 180);
  ctx.drawImage(img, -bW/2, -bH/2, bW, bH);
  ctx.restore();
  return true;
}

function _tryDrawWeaponAtLayer(ctx, weaponId, lw, lh, px, py){
  if(_isMeleeWeapon(weaponId)) return false;
  if(typeof WEAPON_LAYOUT === 'undefined') return false;
  var baseId = resolveIconId(weaponId);
  var layout = WEAPON_LAYOUT[baseId] || HERO_VISIBLE_EQ.primary;
  if(!layout) return false;
  var img = (typeof getHeroImg === 'function') ? getHeroImg('icons/items/' + baseId + '.png') : null;
  if(!img || !img.complete || !img.naturalWidth) return false;
  var hasTrim = !!(layout.trim && layout.trim.w > 0 && layout.trim.h > 0), bW, bH;
  if(hasTrim){
    bW = layout.trim.w * (layout.scale || 1.0);
    bH = layout.trim.h * (layout.scale || 1.0);
  } else {
    bW = 400 * (layout.scale || 0.3);
    bH = bW / (img.naturalWidth / img.naturalHeight);
  }
  var lX = px - lw * (layout.ox || 0), lY = py + lh * (layout.oy || 0);
  ctx.save();
  ctx.translate(lX, lY);
  ctx.rotate(-(layout.rotation || 0) * Math.PI / 180);
  ctx.scale(-1, 1);
  if(hasTrim) ctx.drawImage(img, layout.trim.x, layout.trim.y, layout.trim.w, layout.trim.h, 0, -bH/2, bW, bH);
  else ctx.drawImage(img, 0, -bH/2, bW, bH);
  ctx.restore();
  return true;
}

/* 完整版 `_drawHumanCorpse`：含 melee 判斷、bodyBottomY 對齊、front_arm 下移 */
function _drawHumanCorpse(ctx, drawId, s, ox, oy, def, anim, fi, eqD, isDeath){
  var cw = def.canvas.w, ch = def.canvas.h, eq = eqD || null, dM = isDeath !== false;
  if(eq && eq.primary && _isMeleeWeapon(eq.primary)) eq = {head:eq.head, top:eq.top, primary:null};
  var rr = (anim.rootRot && anim.rootRot[fi]) || 0, rrd = rr * Math.PI / 180;
  var rDy = (anim.rootDy && anim.rootDy[fi]) || 0;
  var rp = anim.rootPivot || {x:0.5, y:0.95};
  var pcx = cw * rp.x, pcy = ch * rp.y;
  var cosR = Math.cos(rrd), sinR = Math.sin(rrd);
  var faCx = null, faCy = null;

  if(dM){
    var bBot = -Infinity;
    for(var i = 0; i < def.layers.length; i++){
      var L = def.layers[i];
      if(L.id === 'front_arm' || L.id === 'back_arm') continue;
      var y = _measureLayerMaxY(def, anim, fi, L.id);
      if(y != null && y > bBot) bBot = y;
    }
    var faL = def.layers.find(function(l){ return l.id === 'front_arm'; });
    if(faL && isFinite(bBot)){
      var k = (anim.keys && anim.keys.front_arm && anim.keys.front_arm[fi]) || {rot:0, dx:0, dy:0};
      var lwf = cw * faL.w, lhf = ch * faL.h;
      var cx = cw * faL.x + cw * (k.dx || 0) * 0.01;
      var cy = ch * faL.y + ch * (k.dy || 0) * 0.01;
      var pxf = lwf * faL.pivot.x, pyf = lhf * faL.pivot.y;
      var lR = -rrd, cL = Math.cos(lR), sL = Math.sin(lR);
      var cmY = -Infinity;
      var cs = [[0,0],[lwf,0],[0,lhf],[lwf,lhf]];
      for(var ci = 0; ci < 4; ci++){
        var u = cs[ci][0], v = cs[ci][1];
        var Lx = cx + (u-pxf)*cL - (v-pyf)*sL;
        var Ly = cy + (u-pxf)*sL + (v-pyf)*cL;
        var Wy = pcy + (Lx-pcx)*sinR + (Ly-pcy)*cosR + ch*rDy;
        if(Wy > cmY) cmY = Wy;
      }
      var dy = bBot - cmY;
      cx += dy * sinR;
      cy += dy * cosR;
      faCx = cx;
      faCy = cy;
    }
  }

  ctx.save();
  ctx.translate(ox, oy);
  ctx.scale(s, s);
  ctx.translate(0, ch * rDy);
  ctx.translate(pcx, pcy);
  ctx.rotate(rrd);
  ctx.translate(-pcx, -pcy);

  var units = [];
  for(var li = 0; li < def.layers.length; li++){
    var LL = def.layers[li];
    if(dM && LL.id === 'back_arm') continue;
    if(LL.id === 'front_arm' && eq && eq.primary && !_isMeleeWeapon(eq.primary)){
      units.push({z:LL.z-0.5, kind:'weapon', layer:LL, weaponId:eq.primary});
    }
    units.push({z:LL.z, kind:'layer', layer:LL});
    if(LL.id === 'head' && eq && eq.head){
      units.push({z:LL.z+0.5, kind:'armor', layer:LL, armorId:eq.head});
    }
    if(LL.id === 'torso' && eq && eq.top){
      units.push({z:LL.z+0.5, kind:'armor', layer:LL, armorId:eq.top});
    }
  }
  units.sort(function(a,b){ return a.z - b.z; });

  for(var ui = 0; ui < units.length; ui++){
    var uu = units[ui], Lu = uu.layer;
    var ku = (anim.keys && anim.keys[Lu.id] && anim.keys[Lu.id][fi]) || {rot:0, dx:0, dy:0};
    var lwu = cw * Lu.w, lhu = ch * Lu.h, cxu, cyu;
    if(Lu.id === 'front_arm' && faCx != null){ cxu = faCx; cyu = faCy; }
    else {
      cxu = cw * Lu.x + cw * (ku.dx || 0) * 0.01;
      cyu = ch * Lu.y + ch * (ku.dy || 0) * 0.01;
    }
    var pxu = lwu * Lu.pivot.x, pyu = lhu * Lu.pivot.y, lRR;
    if(dM && Lu.id === 'front_arm') lRR = -rrd;
    else lRR = ((Lu.rot || 0) + (ku.rot || 0)) * Math.PI / 180;
    ctx.save();
    ctx.translate(cxu, cyu);
    ctx.rotate(lRR);
    ctx.translate(-pxu, -pyu);
    if(uu.kind === 'layer'){
      var col = (def.colors && def.colors[Lu.id]) || Lu.color || _DEF_COLORS[Lu.id] || '#5a4a3a';
      ctx.fillStyle = col;
      ctx.fillRect(0, 0, lwu, lhu);
      ctx.strokeStyle = 'rgba(0,0,0,0.65)';
      ctx.lineWidth = 2;
      ctx.strokeRect(1, 1, lwu-2, lhu-2);
    } else if(uu.kind === 'armor') _tryDrawArmorAtLayer(ctx, uu.armorId, lwu, lhu, pxu, pyu);
    else if(uu.kind === 'weapon') _tryDrawWeaponAtLayer(ctx, uu.weaponId, lwu, lhu, pxu, pyu);
    ctx.restore();
  }
  ctx.restore();
}

/* 兼容別名：08b 的 _raidDrawEnemy 使用 _rev506_drawHumanCorpse */
window._rev506_drawHumanCorpse = _drawHumanCorpse;

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
function _pickR(arr){ return (!arr || !arr.length) ? null : arr[Math.floor(Math.random() * arr.length)]; }
function _getRandomEquipForEnemy(drawId){
  var p = _EQI[drawId];
  if(!p) return null;
  return { head:_pickR(p.head), top:_pickR(p.top), primary:_pickR(p.primary) };
}
window._rev506_getRandomEquip = _getRandomEquipForEnemy;

(function(){
  var _ids = {};
  for(var _k in _EQI){
    var _p = _EQI[_k];
    if(_p.head) _p.head.forEach(function(x){ _ids[x] = 1; });
    if(_p.top) _p.top.forEach(function(x){ _ids[x] = 1; });
    if(_p.primary) _p.primary.forEach(function(x){ _ids[x] = 1; });
  }
  setTimeout(function(){
    for(var id in _ids){
      try { getHeroImg('icons/items/' + resolveIconId(id) + '.png'); } catch(e){}
    }
  }, 200);
})();

function _renderEnemyCorpseCanvas(enemy, fxH){
  var eid = enemy.eid || enemy.id;
  if(!eid) return null;
  var r = _resolveEnemyDef(eid);
  if(!r) return null;
  var def = r.def, drawId = r.resolvedId;
  var an = _resolveEnemyAnims(drawId);
  if(!an || !an.death) return null;
  var dA = an.death, lf = dA.frameCount - 1;
  var bb = _measureDeathBBox(def, dA, lf);
  if(!bb) return null;
  var isH = (def.kind === 'human');
  var charPx = fxH * CHAR_HEIGHT_FACTOR;
  var sc = charPx / 386;
  var amY = isH ? _measureLayerMaxY(def, dA, lf, 'torso') : null;
  var cHU = bb.h;
  if(amY !== null && amY < bb.maxY) cHU = amY - bb.minY;
  var eq = null;
  if(isH){
    var _pool = _EQI[drawId] || _EQI.human_raider;
    var _pwId = (enemy.primaryWeapon && enemy.primaryWeapon.id) ? enemy.primaryWeapon.id
             : (enemy.secondaryWeapon && enemy.secondaryWeapon.id) ? enemy.secondaryWeapon.id
             : null;
    if(_pwId && _isMeleeWeapon(_pwId)) _pwId = null;
    if(!_pwId){
      _pwId = _pickR(_pool.primary);
      if(_pwId && _isMeleeWeapon(_pwId)) _pwId = null;
    }
    var _head = enemy.helmet || _pickR(_pool.head);
    var _body = enemy.body || _pickR(_pool.top);
    eq = { head:_head || null, top:_body || null, primary:_pwId };
  }
  var pL = 0, pR = 0, pT = 0;
  if(isH){ pL = 60; pR = 60; if(eq.primary) pT = Math.round(386 * 0.2); }
  cHU += pT;
  var dW = (bb.w + pL + pR) * sc, dH = cHU * sc;
  var cvs = document.createElement('canvas');
  cvs.width = Math.max(1, Math.round(dW * 2));
  cvs.height = Math.max(1, Math.round(dH * 2));
  var ctx = cvs.getContext('2d');
  ctx.setTransform(2, 0, 0, 2, 0, 0);
  _drawHumanCorpse(ctx, drawId, sc, -(bb.minX - pL) * sc, -(bb.minY - pT) * sc, def, dA, lf, eq, true);
  return { canvas: cvs, drawW: dW, drawH: dH };
}

/* 手持農具視覺 */


/* 完整版 `_raidDrawHuman`：含 bucket/flask/sack/shovel/clipboard/workerHelmet */


window._renderEnemyCorpseCanvas = _renderEnemyCorpseCanvas;
window._drawHumanCorpse = _drawHumanCorpse;
window._measureDeathBBox = _measureDeathBBox;
window._measureLayerMaxY = _measureLayerMaxY;
window._resolveEnemyDef = _resolveEnemyDef;
window._resolveEnemyAnims = _resolveEnemyAnims;
window._getRandomEquipForEnemy = _getRandomEquipForEnemy;

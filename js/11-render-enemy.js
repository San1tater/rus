
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
    var cx = u.bagX, cy = u.bagY;
    ctx.save();
    ctx.fillStyle = '#ede4d3';
    ctx.strokeStyle = '#464d55';
    ctx.lineWidth = 5;
    ctx.lineJoin = 'round';
    var topW = 42, topH = 31;
    ctx.beginPath();
    ctx.moveTo(cx - topW/2, cy - topH);
    ctx.lineTo(cx + topW/2, cy - topH);
    ctx.lineTo(cx, cy);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    var botW = 87, botH = 87;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + botW/2, cy + botH);
    ctx.lineTo(cx - botW/2, cy + botH);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  } else if(u.handItemType === 'shovel'){
    var ax = u.anchorX, ay = u.anchorY;
    var D_W = 30, D_H = 36;
    var HANDLE_LEN = 148, HANDLE_W = 6;
    var HEAD_W = 45, HEAD_H = 57;
    var forkY = ay + D_H;
    var handleBot = forkY + HANDLE_LEN;
    var headBot = handleBot + HEAD_H;
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
    var w = 90, h = 110;
    var cx2 = u.armMidX, cy2 = u.armMidY + 7;
    ctx.save();
    ctx.fillStyle = '#3a78c8';
    ctx.fillRect(cx2 - w/2, cy2 - h/2, w, h);
    ctx.restore();
  } else if(u.handItemType === 'flask'){
    var positions = u.flaskPositions || [];
    var R = 37, NECK_W = 26, NECK_H = 52;
    var halfNeck = NECK_W / 2;
    var BODY_OFFSET = R + NECK_H/2 - 3;
    for(var pi = 0; pi < positions.length; pi++){
      var pos = positions[pi];
      var cx3 = pos.x, cy3 = pos.y + BODY_OFFSET;
      var neckTopY = cy3 - R - NECK_H;
      var neckBottomY = cy3 - R + 5;
      var _dy = neckBottomY - cy3;
      var _angleRight = Math.atan2(_dy, halfNeck);
      var _angleLeft = Math.atan2(_dy, -halfNeck);
      ctx.save();
      ctx.fillStyle = 'rgba(80,138,100,0.92)';
      ctx.strokeStyle = '#1f3a2a';
      ctx.lineWidth = 8;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(cx3 - halfNeck, neckTopY);
      ctx.lineTo(cx3 - halfNeck, neckBottomY);
      ctx.arc(cx3, cy3, R, _angleLeft, _angleRight, true);
      ctx.lineTo(cx3 + halfNeck, neckTopY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx3 - halfNeck - 8, neckTopY);
      ctx.lineTo(cx3 + halfNeck + 8, neckTopY);
      ctx.stroke();
      ctx.fillStyle = 'rgba(180,230,200,0.55)';
      ctx.beginPath();
      ctx.ellipse(cx3 - R*0.32, cy3 - R*0.25, R*0.32, R*0.14, -0.4, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();
    }
  }
}

function _raidDrawWorkerHelmet(ctx, B, anim, fi, color){
  var L = GAME_LAYERS.find(function(l){ return l.id === 'head'; });
  if(!L) return;
  var keys = anim.keys[L.id] || [];
  var key = keys[fi] || {rot:0, dx:0, dy:0};
  var cx = B.x + B.w * (L.x + (key.dx||0) * 0.01);
  var cy = B.y + B.h * (L.y + (key.dy||0) * 0.01);
  var w = B.w * L.w, h = B.h * L.h;
  var px = w * L.pivot.x, py = h * L.pivot.y;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((key.rot || 0) * Math.PI / 180);
  ctx.translate(-px, -py);
  var cxL = w * 0.5, cyL = h * 0.45;
  var r = w * 0.72;
  ctx.fillStyle = color;
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cxL, cyL, r, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/* 完整版 `_raidDrawHuman`：含 bucket/flask/sack/shovel/clipboard/workerHelmet */
function _raidDrawHuman(ctx, px, py, scale, equipped, equippedRarity, animName, frameIdx, weaponSlotOverride, servantType, flipX, hasBucket, handItem, noWorkerHelmet){
  var anim = GAME_ANIMS[animName] || GAME_ANIMS.idle;
  var fi = ((frameIdx % anim.frameCount) + anim.frameCount) % anim.frameCount;
  var B = { x:30, y:30, w:340, h:460 };
  var ORIG_FOOT_X = 200, ORIG_FOOT_Y = 515;
  var TYPE_COLORS = {
    farmer:  { body:'#5a9a48', legs:'#3a6a2e' },
    guard:   { body:'#5088bb', legs:'#2e4a6a' },
    foreman: { body:'#e0a830', legs:'#d8d0c0' },
    enemy:   { body:'#8b2a2a', legs:'#3a1010' }
  };
  var _colors = servantType ? TYPE_COLORS[servantType] : null;
  if(_colors){
    for(var li = 0; li < GAME_LAYERS.length; li++){
      var L = GAME_LAYERS[li];
      L._oldColor = L.color;
      if(L.id === 'right_leg' || L.id === 'left_leg') L.color = _colors.legs;
      else if(L.id === 'torso' || L.id === 'back_arm' || L.id === 'front_arm') L.color = _colors.body;
    }
  }
  ctx.save();
  ctx.translate(px, py);
  ctx.scale(flipX ? -scale : scale, scale);
  ctx.translate(-ORIG_FOOT_X, -ORIG_FOOT_Y);

  var units = [];
  for(var gi = 0; gi < GAME_LAYERS.length; gi++) units.push({z:GAME_LAYERS[gi].z, kind:'layer', layer:GAME_LAYERS[gi]});

  if(equipped.head){
    var cH = (typeof HEAD_ARMOR_LAYOUT !== 'undefined' && HEAD_ARMOR_LAYOUT[equipped.head]) ? HEAD_ARMOR_LAYOUT[equipped.head] : HERO_VISIBLE_EQ.head;
    var lH = GAME_LAYERS.find(function(l){ return l.id === cH.layer; });
    if(lH){
      var imgH = getHeroImg('icons/items/' + resolveIconId(equipped.head) + '.png');
      units.push({z:lH.z+0.5, kind:'eq', layerId:cH.layer, ox:cH.ox, oy:cH.oy, scale:cH.scale, rotation:cH.rotation, img:imgH});
    }
  }
  if(equipped.top){
    var cT = getTopCfg(equipped.top);
    var lT = GAME_LAYERS.find(function(l){ return l.id === cT.layer; });
    if(lT){
      var imgT = getHeroImg('icons/items/' + resolveIconId(equipped.top) + '.png');
      units.push({z:lT.z+0.5, kind:'eq', layerId:cT.layer, ox:cT.ox, oy:cT.oy, scale:cT.scale, rotation:cT.rotation, img:imgT});
    }
  }
  var wpS = null, wpI = null;
  if(weaponSlotOverride && equipped[weaponSlotOverride]){ wpS = weaponSlotOverride; wpI = equipped[weaponSlotOverride]; }
  else if(equipped.primary){ wpS = 'primary'; wpI = equipped.primary; }
  else if(equipped.secondary){ wpS = 'secondary'; wpI = equipped.secondary; }
  else if(equipped.melee){ wpS = 'melee'; wpI = equipped.melee; }
  if(wpS && wpI && !_isMeleeWeapon(wpI)){
    var cW = getWeaponCfg(wpS, wpI);
    if(cW){
      var lW = GAME_LAYERS.find(function(l){ return l.id === cW.layer; });
      if(lW){
        var imgW = getHeroImg('icons/items/' + resolveIconId(wpI) + '.png');
        units.push({z:lW.z-0.5, kind:'eq', layerId:cW.layer, ox:cW.ox, oy:cW.oy, scale:cW.scale, rotation:cW.rotation, img:imgW, trim:cW.trim});
      }
    }
  }

  if(hasBucket){
    var _fa = GAME_LAYERS.find(function(l){ return l.id === 'front_arm'; });
    var _ba = GAME_LAYERS.find(function(l){ return l.id === 'back_arm'; });
    if(_fa && _ba){
      var _fk = (anim.keys && anim.keys[_fa.id] && anim.keys[_fa.id][fi]) || {rot:0,dx:0,dy:0};
      var _bk = (anim.keys && anim.keys[_ba.id] && anim.keys[_ba.id][fi]) || {rot:0,dx:0,dy:0};
      var _fCx = B.x + B.w * (_fa.x + (_fk.dx||0) * 0.01);
      var _fCy = B.y + B.h * (_fa.y + (_fk.dy||0) * 0.01);
      var _fW = B.w * _fa.w, _fH = B.h * _fa.h;
      var _fMidX = _fCx + _fW * (0.5 - _fa.pivot.x);
      var _fMidY = _fCy + _fH * (0.5 - _fa.pivot.y);
      var _bCx = B.x + B.w * (_ba.x + (_bk.dx||0) * 0.01);
      var _bCy = B.y + B.h * (_ba.y + (_bk.dy||0) * 0.01);
      var _bW = B.w * _ba.w, _bH = B.h * _ba.h;
      var _bMidX = _bCx + _bW * (0.5 - _ba.pivot.x);
      var _bMidY = _bCy + _bH * (0.5 - _ba.pivot.y);
      var _bkx = (_fMidX + _bMidX) / 2;
      var _bky = (_fMidY + _bMidY) / 2;
      units.push({z:58, kind:'bucket', bx:_bkx, topY:_bky-38, botY:_bky+97, topHalf:54, botHalf:39});
    }
  }

  if(handItem === 'stick' || handItem === 'clipboard' || handItem === 'flask'){
    var _fa2 = GAME_LAYERS.find(function(l){ return l.id === 'front_arm'; });
    var _ba2 = GAME_LAYERS.find(function(l){ return l.id === 'back_arm'; });
    if(_fa2 && _ba2){
      var _fk2 = (anim.keys && anim.keys[_fa2.id] && anim.keys[_fa2.id][fi]) || {rot:0,dx:0,dy:0};
      var _bk2 = (anim.keys && anim.keys[_ba2.id] && anim.keys[_ba2.id][fi]) || {rot:0,dx:0,dy:0};
      var _fCx2 = B.x + B.w * (_fa2.x + (_fk2.dx||0) * 0.01);
      var _fCy2 = B.y + B.h * (_fa2.y + (_fk2.dy||0) * 0.01);
      var _fW2 = B.w * _fa2.w, _fH2 = B.h * _fa2.h;
      var _fMidX2 = _fCx2 + _fW2 * (0.5 - _fa2.pivot.x);
      var _fMidY2 = _fCy2 + _fH2 * (0.5 - _fa2.pivot.y);
      var _bCx2 = B.x + B.w * (_ba2.x + (_bk2.dx||0) * 0.01);
      var _bCy2 = B.y + B.h * (_ba2.y + (_bk2.dy||0) * 0.01);
      var _bW2 = B.w * _ba2.w, _bH2 = B.h * _ba2.h;
      var _bMidX2 = _bCx2 + _bW2 * (0.5 - _ba2.pivot.x);
      var _bMidY2 = _bCy2 + _bH2 * (0.5 - _ba2.pivot.y);
      if(handItem === 'stick'){
        units.push({z:60, kind:'handitem', handItemType:'sack', bagX:_bMidX2, bagY:_bMidY2});
        var _shovelX = _fCx2 + _fW2 * (1 - _fa2.pivot.x) - _fW2 * 0.10;
        var _shovelY = _fCy2 + _fH2 * (0 - _fa2.pivot.y) - 7;
        units.push({z:59, kind:'handitem', handItemType:'shovel', anchorX:_shovelX, anchorY:_shovelY});
      } else if(handItem === 'clipboard'){
        units.push({z:58, kind:'handitem', handItemType:'clipboard', armMidX:(_fMidX2+_bMidX2)/2, armMidY:(_fMidY2+_bMidY2)/2});
      } else if(handItem === 'flask'){
        var _flaskRX = _fCx2 + _fW2 * (0.85 - _fa2.pivot.x);
        var _flaskRY = _fCy2 + _fH2 * (0.5 - _fa2.pivot.y);
        var _flaskLX = _bCx2 + _bW2 * (0.2 - _ba2.pivot.x);
        var _flaskLY = _bCy2 + _bH2 * (0.5 - _ba2.pivot.y);
        units.push({z:61, kind:'handitem', handItemType:'flask', flaskPositions:[{x:_flaskLX, y:_flaskLY}, {x:_flaskRX, y:_flaskRY}]});
      }
    }
  }

  units.sort(function(a,b){ return a.z - b.z; });

  for(var ui = 0; ui < units.length; ui++){
    var u = units[ui];
    if(u.kind === 'layer') drawBodyLayer(ctx, u.layer, B, anim, fi);
    else if(u.kind === 'bucket') drawBucketUnit(ctx, u);
    else if(u.kind === 'handitem') drawHandItemUnit(ctx, u);
    else drawEqLayer(ctx, u, B, anim, fi);
  }

  if(!noWorkerHelmet && servantType === 'foreman') _raidDrawWorkerHelmet(ctx, B, anim, fi, '#ffffff');
  else if(!noWorkerHelmet && servantType === 'farmer') _raidDrawWorkerHelmet(ctx, B, anim, fi, '#ff8800');

  ctx.restore();

  if(_colors){
    for(var ri = 0; ri < GAME_LAYERS.length; ri++){
      var L2 = GAME_LAYERS[ri];
      if(typeof L2._oldColor !== 'undefined'){ L2.color = L2._oldColor; delete L2._oldColor; }
    }
  }
}

function _raidDrawEnemy(ctx, px, py, scale, animName, frameIdx, enemyId){
  var _realId = enemyId;
  if(typeof HUMAN_ENEMY_DATA !== 'undefined'){
    if(!HUMAN_ENEMY_DATA[enemyId] && HUMAN_ENEMY_DATA['human_' + enemyId]){
      _realId = 'human_' + enemyId;
    }
  }
  if(typeof HUMAN_ENEMY_DATA !== 'undefined' && HUMAN_ENEMY_DATA[_realId]){
    var def = HUMAN_ENEMY_DATA[_realId];
    var anims = def.anims;
    if(!anims) return;
    var anim = anims[animName];
    if(!anim && animName === 'walk') anim = GAME_ANIMS.walk;
    if(!anim) anim = anims.idle;
    if(!anim) return;
    var fi = ((frameIdx % anim.frameCount) + anim.frameCount) % anim.frameCount;
    if(!window._rev510_raidEquipCache) window._rev510_raidEquipCache = {};
    if(!window._rev510_raidEquipCache[_realId]){
      window._rev510_raidEquipCache[_realId] = (typeof _rev506_getRandomEquip === 'function')
        ? _rev506_getRandomEquip(_realId) : null;
    }
    var equip = window._rev510_raidEquipCache[_realId];
    var ox = px - def.canvas.w * scale / 2;
    var oy = py - def.canvas.h * scale;
    var _isDeath = (animName === 'death');
    if(typeof _rev506_drawHumanCorpse === 'function'){
      _rev506_drawHumanCorpse(ctx, _realId, scale, ox, oy, def, anim, fi, equip, _isDeath);
      return;
    }
  }
  if(typeof _drawEnemyAt === 'function'){
    var _bdef = (typeof BEAST_LAYERS !== 'undefined' && BEAST_LAYERS[_realId]);
    if(_bdef){
      var _bx = px - _bdef.canvas.w * scale / 2;
      var _by = py - _bdef.canvas.h * scale;
      if(_drawEnemyAt(ctx, _realId, _bx, _by, scale, animName, frameIdx)) return;
    }
  }
  if(typeof _raidDrawHuman === 'function'){
    var _eq = { head:'ssh68', top:'6b231', primary:'ak74' };
    var _rar = { head:'一般', top:'一般', primary:'一般' };
    _raidDrawHuman(ctx, px, py, scale, _eq, _rar, animName, frameIdx, 'primary', 'enemy', true, false, null);
  }
}

window._renderEnemyCorpseCanvas = _renderEnemyCorpseCanvas;
window._drawHumanCorpse = _drawHumanCorpse;
window._measureDeathBBox = _measureDeathBBox;
window._measureLayerMaxY = _measureLayerMaxY;
window._resolveEnemyDef = _resolveEnemyDef;
window._resolveEnemyAnims = _resolveEnemyAnims;
window._getRandomEquipForEnemy = _getRandomEquipForEnemy;
window._raidDrawHuman = _raidDrawHuman;
window._raidDrawEnemy = _raidDrawEnemy;
window._drawWorkerHelmet = _raidDrawWorkerHelmet;

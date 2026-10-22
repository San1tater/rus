(function(){
  'use strict';
  if(window._vehicleRendererInstalled) return;
  window._vehicleRendererInstalled = true;

  /* rev622: ANN 补全到 11 款（原缺 btr82 / btr90 / t80b / t80bv / t80uk） */
  if(!window.VEHICLE_ANNOTATIONS){
    window.VEHICLE_ANNOTATIONS = {
      btr80:  typeof VEHICLE_ANNOTATION_BTR80  !== 'undefined' ? VEHICLE_ANNOTATION_BTR80  : null,
      btr80a: typeof VEHICLE_ANNOTATION_BTR80A !== 'undefined' ? VEHICLE_ANNOTATION_BTR80A : null,
      btr82:  typeof VEHICLE_ANNOTATION_BTR82  !== 'undefined' ? VEHICLE_ANNOTATION_BTR82  : null,
      btr82a: typeof VEHICLE_ANNOTATION_BTR82A !== 'undefined' ? VEHICLE_ANNOTATION_BTR82A : null,
      btr90:  typeof VEHICLE_ANNOTATION_BTR90  !== 'undefined' ? VEHICLE_ANNOTATION_BTR90  : null,
      t80:    typeof VEHICLE_ANNOTATION_T80    !== 'undefined' ? VEHICLE_ANNOTATION_T80    : null,
      t80b:   typeof VEHICLE_ANNOTATION_T80B   !== 'undefined' ? VEHICLE_ANNOTATION_T80B   : null,
      t80bv:  typeof VEHICLE_ANNOTATION_T80BV  !== 'undefined' ? VEHICLE_ANNOTATION_T80BV  : null,
      t80u:   typeof VEHICLE_ANNOTATION_T80U   !== 'undefined' ? VEHICLE_ANNOTATION_T80U   : null,
      t80uk:  typeof VEHICLE_ANNOTATION_T80UK  !== 'undefined' ? VEHICLE_ANNOTATION_T80UK  : null,
      t80um:  typeof VEHICLE_ANNOTATION_T80UM  !== 'undefined' ? VEHICLE_ANNOTATION_T80UM  : null
    };
  }
  const ANN = window.VEHICLE_ANNOTATIONS;

  if(typeof window.VEHICLE_REAL_HEIGHTS === 'undefined'){
    window.VEHICLE_REAL_HEIGHTS = {
      btr80: 2.41, btr80a: 2.80, btr82: 2.725, btr82a: 2.725, btr90: 2.98,
      t80: 2.74, t80b: 2.74, t80bv: 2.74, t80u: 2.74, t80uk: 2.74, t80um: 2.74
    };
  }

  

  

  

  

  

  

  

  const _imgCache = new Map();
  function _loadVehicleImg(id){
    if(_imgCache.has(id)) return _imgCache.get(id);
    const img = new Image();
    /* rev601: 統一使用 icons/vehicles/（icons/vehicles/ 已刪除） */
    img.src = 'icons/vehicles/' + id + '.png' + (typeof assetSuffix === 'function' ? assetSuffix() : '');
    _imgCache.set(id, img);
    return img;
  }

  function _getMaskYAtX(ann, nx){
    if(!ann.trackMask || !ann.trackMask.points) return 1;
    const pts = ann.trackMask.points.slice().sort(function(a,b){ return a.x-b.x; });
    if(pts.length < 2) return 1;
    if(nx <= pts[0].x) return pts[0].y;
    if(nx >= pts[pts.length-1].x) return pts[pts.length-1].y;
    for(let i=0;i<pts.length-1;i++){
      if(nx >= pts[i].x && nx <= pts[i+1].x){
        const t = (nx - pts[i].x) / (pts[i+1].x - pts[i].x);
        return pts[i].y + (pts[i+1].y - pts[i].y) * t;
      }
    }
    return 1;
  }

  const _wheelClipCache = new Map();
  function _getWheelClip(img, ann, wheel, cw, ch){
  const cx = wheel.cx * cw;
  const cy = wheel.cy * ch;
  const r = wheel.r * cw;
  const size = Math.ceil(r*2);
  if(size < 3) return null;
  const maskOn = ann.trackMask && ann.trackMask.enabled;
  const maskKey = maskOn ? ann.trackMask.points.map(function(p){ return p.x.toFixed(3)+','+p.y.toFixed(3); }).join(';') : 'off';
  const key = (img.src||'') + '|' + cx.toFixed(1) + '|' + cy.toFixed(1) + '|' + size + '|' + maskKey;
  if(_wheelClipCache.has(key)) return _wheelClipCache.get(key);
  const c = document.createElement('canvas'); c.width = size; c.height = size;
  const cc = c.getContext('2d');
  cc.save();
  cc.beginPath(); cc.arc(size/2, size/2, size/2-0.5, 0, Math.PI*2); cc.clip();
  cc.drawImage(img, -(cx - size/2), -(cy - size/2), cw, ch);
  cc.restore();
  /* rev595: 遮罩鏡像/平鋪填充 —— 用可見部分反覆翻轉/平鋪，填滿整個圓形，
     修復導向輪外露 < 50% 直徑時只翻轉一次導致上半部空缺（橄欖球形）的問題 */
  if(maskOn){
    const maskY = _getMaskYAtX(ann, wheel.cx);
    const maskYInCanvas = maskY * ch - (cy - size/2);
    if(maskYInCanvas > 0.5 && maskYInCanvas < size - 0.5){
      const belowH = size - maskYInCanvas;
      const below = document.createElement('canvas');
      below.width = size;
      below.height = Math.max(1, Math.ceil(belowH));
      const bc = below.getContext('2d');
      bc.drawImage(c, 0, maskYInCanvas, size, belowH, 0, 0, size, belowH);
      cc.save();
      cc.beginPath(); cc.arc(size/2, size/2, size/2-0.5, 0, Math.PI*2); cc.clip();
      cc.clearRect(0, 0, size, maskYInCanvas);
      cc.restore();
      cc.save();
      cc.beginPath(); cc.arc(size/2, size/2, size/2-0.5, 0, Math.PI*2); cc.clip();
      let y = maskYInCanvas;
      let flip = true;
      while(y > 0.5){
        const drawH = Math.min(y, belowH);
        const drawY = y - drawH;
        if(flip){
          cc.save();
          cc.translate(0, y);
          cc.scale(1, -1);
          cc.drawImage(below, 0, 0, size, drawH, 0, 0, size, drawH);
          cc.restore();
        } else {
          cc.drawImage(below, 0, 0, size, drawH, 0, drawY, size, drawH);
        }
        y = drawY;
        flip = !flip;
      }
      cc.restore();
    }
  }
  cc.save();
  cc.globalCompositeOperation = 'destination-in';
  cc.beginPath(); cc.arc(size/2, size/2, size/2-0.5, 0, Math.PI*2); cc.fill();
  cc.restore();
  _wheelClipCache.set(key, c);
  if(_wheelClipCache.size > 40) _wheelClipCache.delete(_wheelClipCache.keys().next().value);
  return c;
}

  const _maskCache = new Map();
  function _getMaskLayer(img, ann, cw, ch){
    if(!ann.trackMask || !ann.trackMask.enabled || ann.trackMask.points.length < 2) return null;
    const key = (img.src||'') + '|' + ann.trackMask.points.map(function(p){ return p.x.toFixed(3)+','+p.y.toFixed(3); }).join(';');
    if(_maskCache.has(key)) return _maskCache.get(key);
    const c = document.createElement('canvas'); c.width = cw; c.height = ch;
    const cc = c.getContext('2d');
    const pts = ann.trackMask.points.slice().sort(function(a,b){ return a.x-b.x; });
    cc.beginPath();
    cc.moveTo(pts[0].x*cw, 0);
    for(const p of pts) cc.lineTo(p.x*cw, p.y*ch);
    cc.lineTo(pts[pts.length-1].x*cw, 0);
    cc.closePath();
    cc.clip();
    cc.drawImage(img, 0, 0, cw, ch);
    _maskCache.set(key, c);
    if(_maskCache.size > 20) _maskCache.delete(_maskCache.keys().next().value);
    return c;
  }

  function _buildTrackPath(ann, cw, ch){
    if(!ann.trackLine || !ann.trackLine.points || ann.trackLine.points.length < 2) return null;
    const pts = ann.trackLine.points.map(function(p){ return { x: p.x*cw, y: p.y*ch }; });
    const segs = []; let totalLen = 0;
    for(let i=0;i<pts.length-1;i++){
      const dx = pts[i+1].x - pts[i].x;
      const dy = pts[i+1].y - pts[i].y;
      const len = Math.hypot(dx, dy);
      if(len < 0.01) continue;
      segs.push({ x1: pts[i].x, y1: pts[i].y, x2: pts[i+1].x, y2: pts[i+1].y, dx: dx/len, dy: dy/len, len: len, startLen: totalLen });
      totalLen += len;
    }
    return { segs: segs, totalLen: totalLen, pixPts: pts };
  }

function _samplePath(segs, s){
    for(const sg of segs){
      if(s >= sg.startLen && s <= sg.startLen + sg.len){
        const t = (s - sg.startLen) / sg.len;
        return { x: sg.x1 + (sg.x2 - sg.x1) * t, y: sg.y1 + (sg.y2 - sg.y1) * t, tx: sg.dx, ty: sg.dy };
      }
    }
    return null;
  }

  /* [rev787] 完全重写 _drawTrackBand：擦除原图履带区 + 纹理 + 条纹（与编辑器一致） */
/* [rev788] 履带：poly clip 到 trackMask~trackLine 全区，擦除+纹理都覆盖全带 */
/* [rev789] _drawTrackBand：drawImage 源坐标用原图尺寸，目标用 cw/ch，擦除+纹理 poly 一致 */
/* [rev791] _drawTrackBand：固定 bandHeight（编辑器同款），单次绘制不拉伸不铺排 */
function _drawTrackBand(ctx, img, ann, cw, ch, animTime, vel){
  const sc = ann.trackScroll;
  if(!sc || !sc.enabled) return;
  const path = _buildTrackPath(ann, cw, ch);
  if(!path || !path.segs.length) return;

  // ★ 源坐标用原图像素，目标用 cw/ch
  const iw = img.naturalWidth || cw;
  const ih = img.naturalHeight || ch;
  const texSrcX0 = sc.textureX0 * iw;
  const texSrcX1 = sc.textureX1 * iw;
  const texSrcY0 = (sc.textureY0 == null || !isFinite(sc.textureY0)) ? 0 : sc.textureY0 * ih;
  const texSrcY1 = (sc.textureY1 == null || !isFinite(sc.textureY1)) ? ih : sc.textureY1 * ih;
  const texSrcW = texSrcX1 - texSrcX0;
  const texSrcH = texSrcY1 - texSrcY0;

  const texW = texSrcW * (cw / iw);
  const texH = texSrcH * (ch / ih);
  if(texW < 2 || texH < 2) return;

  const totalLen = path.totalLen;
  const effDir = -sc.direction;

  // ★ bandH：直接用编辑器固定比例，不做动态计算
  const bandH = (sc.bandHeight || 0.08) * ch;

  // 速度：编辑器公式
  let _vSpeed = vel;
  const _ws = ann.wheels || [];
  if(_ws.length > 0){
    let _refR, _refRot;
    const _idx = (sc.followWheel || 0) | 0;
    if(_idx > 0 && _idx <= _ws.length){
      _refR = _ws[_idx-1].r || 0.05;
      _refRot = _ws[_idx-1].rotSpeed || 1;
    } else {
      _refR = _ws.reduce(function(s,w){ return s + (w.r||0); }, 0) / _ws.length;
      _refRot = _ws.reduce(function(s,w){ return s + (w.rotSpeed||1); }, 0) / _ws.length;
    }
    _vSpeed = _refRot * 3 * _refR * cw;
  }

  const rawOffsetPx = animTime * _vSpeed * effDir;
  const offsetPx = (((rawOffsetPx % texW) + texW) % texW);

  const vScale = bandH / texH;

  if(typeof window._trackDebug === "undefined") window._trackDebug = 0;
  window._trackDebug++;
  if(window._trackDebug % 120 === 1){
    console.log("[track rev791] bandH=" + bandH.toFixed(1) + " texH=" + texH.toFixed(1) + " vScale=" + vScale.toFixed(2) + " texW=" + texW.toFixed(1) + " iw=" + iw + " ih=" + ih);
  }

  // poly：下缘=trackLine，上缘沿法线偏移 bandH
  const upN = [];
  for(let i = 0; i < path.pixPts.length; i++){
    let ux, uy;
    if(i === 0){ ux = path.pixPts[1].x - path.pixPts[0].x; uy = path.pixPts[1].y - path.pixPts[0].y; }
    else if(i === path.pixPts.length-1){ ux = path.pixPts[i].x - path.pixPts[i-1].x; uy = path.pixPts[i].y - path.pixPts[i-1].y; }
    else { ux = path.pixPts[i+1].x - path.pixPts[i-1].x; uy = path.pixPts[i+1].y - path.pixPts[i-1].y; }
    const L = Math.hypot(ux, uy) || 1; ux /= L; uy /= L;
    let nx = -uy, ny = ux;
    if(ny > 0){ nx = -nx; ny = -ny; }
    upN.push({ nx, ny });
  }
  const poly = [];
  for(const p of path.pixPts) poly.push({ x: p.x, y: p.y });
  for(let i = path.pixPts.length - 1; i >= 0; i--){
    poly.push({ x: path.pixPts[i].x + upN[i].nx * bandH, y: path.pixPts[i].y + upN[i].ny * bandH });
  }

  // ① 擦除 poly 内原图
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(poly[0].x, poly[0].y);
  for(let i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x, poly[i].y);
  ctx.closePath();
  ctx.clip();
  ctx.globalCompositeOperation = "destination-out";
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, cw, ch);
  ctx.restore();

  // ② 画纹理 + 条纹
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(poly[0].x, poly[0].y);
  for(let i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x, poly[i].y);
  ctx.closePath();
  ctx.clip();

  const samplePathAngle = function(s){
    if(s <= 0){ const p0 = path.segs[0]; return { x: p0.x1, y: p0.y1, angle: Math.atan2(p0.dy, p0.dx) }; }
    if(s >= totalLen){ const p0 = path.segs[path.segs.length-1]; return { x: p0.x2, y: p0.y2, angle: Math.atan2(p0.dy, p0.dx) }; }
    for(let i = 0; i < path.segs.length; i++){
      const sg = path.segs[i];
      if(s >= sg.startLen && s <= sg.startLen + sg.len){
        const t = (s - sg.startLen) / sg.len;
        return { x: sg.x1 + (sg.x2 - sg.x1) * t, y: sg.y1 + (sg.y2 - sg.y1) * t, angle: Math.atan2(sg.dy, sg.dx) };
      }
    }
    return null;
  };

  if(sc.useTexture){
    ctx.globalAlpha = 1.0;
    for(let a = offsetPx - texW; a < totalLen + texW; a += texW){
      const arcA = Math.max(0, Math.min(totalLen, a));
      const arcB = Math.max(0, Math.min(totalLen, a + texW));
      const pA = samplePathAngle(arcA);
      const pB = samplePathAngle(arcB);
      if(!pA || !pB) continue;
      const dx = pB.x - pA.x, dy = pB.y - pA.y;
      const segLen = Math.hypot(dx, dy);
      if(segLen < 1) continue;
      const angle = Math.atan2(dy, dx);
      const ux = Math.cos(angle), uy = Math.sin(angle);
      const uScale = segLen / texW;
      let nx = -uy, ny = ux;
      if(ny > 0){ nx = -nx; ny = -ny; }
      const topX = pA.x + nx * bandH;
      const topY = pA.y + ny * bandH;
      const vx = -nx, vy = -ny;
      ctx.save();
      ctx.translate(topX, topY);
      ctx.transform(ux * uScale, uy * uScale, vx * vScale, vy * vScale, 0, 0);
      ctx.drawImage(img, texSrcX0, texSrcY0, texSrcW, texSrcH, 0, 0, texW, texH);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  if(sc.useStripes){
    const spacing = sc.spacing * cw;
    if(spacing >= 3){
      const darkW = spacing * 0.55;
      const strength = sc.stripeStrength || 1;
      const stepPx = Math.max(2, spacing / 2);
      for(let s = 0; s < totalLen; s += stepPx){
        const chunkLen = Math.min(stepPx, totalLen - s);
        if(chunkLen < 0.01) continue;
        const midP = _samplePath(path.segs, s + chunkLen / 2);
        if(!midP) continue;
        const texPos = ((s + chunkLen / 2 + rawOffsetPx) % spacing + spacing) % spacing;
        const isDark = texPos < darkW;
        const ang = Math.atan2(midP.ty, midP.tx);
        ctx.save();
        ctx.translate(midP.x, midP.y);
        ctx.rotate(ang);
        ctx.fillStyle = isDark ? "rgba(0,0,0," + (sc.darkAlpha * strength) + ")" : "rgba(255,255,255," + (sc.lightAlpha * strength) + ")";
        ctx.fillRect(0, 0, chunkLen, bandH);
        ctx.restore();
      }
    }
  }

  ctx.restore();
}





function _makeDoorClip(img, pts, cw, ch){
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for(const p of pts){
      const px = p.x*cw, py = p.y*ch;
      if(px < minX) minX = px;
      if(py < minY) minY = py;
      if(px > maxX) maxX = px;
      if(py > maxY) maxY = py;
    }
    const bw = Math.ceil(maxX - minX), bh = Math.ceil(maxY - minY);
    if(bw < 2 || bh < 2) return null;
    const c = document.createElement('canvas'); c.width = bw; c.height = bh;
    const cc = c.getContext('2d');
    cc.beginPath();
    cc.moveTo(pts[0].x*cw - minX, pts[0].y*ch - minY);
    for(let i=1;i<pts.length;i++) cc.lineTo(pts[i].x*cw - minX, pts[i].y*ch - minY);
    cc.closePath();
    cc.clip();
    cc.drawImage(img, -minX, -minY, cw, ch);
    return { canvas: c, minX: minX, minY: minY, bw: bw, bh: bh };
  }

  /* rev696: 舱门描边径向渐变 —— 外缘实色，向内逐渐变淡（nonzero 规则形成环带） */
  function _drawDoorBorderGradient(ctx, pts, cw, ch){
    if(!pts || pts.length < 3) return;
    const pxPts = pts.map(function(p){ return { x: p.x * cw, y: p.y * ch }; });
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(pxPts[0].x, pxPts[0].y);
    for(let i = 1; i < pxPts.length; i++) ctx.lineTo(pxPts[i].x, pxPts[i].y);
    ctx.closePath();
    ctx.lineWidth = Math.max(1, cw * 0.0016);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(180,180,180,0.55)';
    ctx.stroke();
    ctx.restore();
  }

  function _renderDoor(ctx, img, ann, door, cw, ch, openAngle, backColor){
  if(!door || !door.polygon || door.polygon.length < 3) return;
  const pts = door.polygon;
  const x1 = door.hingeP1.x * cw, y1 = door.hingeP1.y * ch;
  const x2 = door.hingeP2.x * cw, y2 = door.hingeP2.y * ch;
  const ang = (openAngle || 0) * Math.PI / 180;
  const cosA = Math.cos(ang);
  const showBack = cosA < 0;
  const alpha = Math.atan2(y2 - y1, x2 - x1);
  ctx.save();
  ctx.translate(x1, y1);
  ctx.rotate(alpha);
  ctx.scale(1, cosA);
  ctx.rotate(-alpha);
  ctx.translate(-x1, -y1);
  if(showBack){
    ctx.fillStyle = backColor || door.fillColor || '#0c0c0c';
    ctx.beginPath();
    ctx.moveTo(pts[0].x*cw, pts[0].y*ch);
    for(let i=1;i<pts.length;i++) ctx.lineTo(pts[i].x*cw, pts[i].y*ch);
    ctx.closePath();
    ctx.fill();
    ctx.save();
    ctx.clip();
    let _bMnX=Infinity, _bMnY=Infinity, _bMxX=-Infinity, _bMxY=-Infinity;
    for(const p of pts){
      const _px = p.x*cw, _py = p.y*ch;
      if(_px < _bMnX) _bMnX = _px;
      if(_py < _bMnY) _bMnY = _py;
      if(_px > _bMxX) _bMxX = _px;
      if(_py > _bMxY) _bMxY = _py;
    }
    const _bCx = (_bMnX + _bMxX) / 2, _bCy = (_bMnY + _bMxY) / 2;
    const _bR = Math.max(_bMxX - _bMnX, _bMxY - _bMnY) / 2 || 1;
    const _bG = ctx.createRadialGradient(_bCx, _bCy, _bR * 0.15, _bCx, _bCy, _bR);
    _bG.addColorStop(0, 'rgba(0,0,0,0)');
    _bG.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = _bG;
    ctx.fillRect(_bMnX, _bMnY, _bMxX - _bMnX, _bMxY - _bMnY);
    ctx.restore();
  } else {
    const clip = _makeDoorClip(img, pts, cw, ch);
    if(clip){
      ctx.drawImage(clip.canvas, clip.minX, clip.minY, clip.bw, clip.bh);
    }
  }
  if(Math.abs(openAngle || 0) > 3){
    _drawDoorBorderGradient(ctx, pts, cw, ch);
  }
  ctx.restore();
}

  function _drawVehicleContent(ctx, id, cw, ch, animTime, opts) {
    opts = opts || {};
    const ann = ANN[id];
    if(!ann) return;
    const img = _loadVehicleImg(id);
    if(!img.complete || !img.naturalWidth) return;

    const hasTrack = ann.trackLine && ann.trackLine.points && ann.trackLine.points.length >= 2;
    const hasTrackScroll = ann.trackScroll && ann.trackScroll.enabled;

    if(hasTrack && hasTrackScroll){
      ctx.save();
      let _maxY = 0;
      for(const _p of ann.trackLine.points){ if(_p.y > _maxY) _maxY = _p.y; }
      ctx.beginPath();
      ctx.rect(0, 0, cw, _maxY * ch);
      ctx.clip();
      ctx.drawImage(img, 0, 0, cw, ch);
      ctx.restore();
    } else {
      ctx.drawImage(img, 0, 0, cw, ch);
    }

    if(hasTrack && hasTrackScroll){
      const vel = opts.trackVel || 60;
      _drawTrackBand(ctx, img, ann, cw, ch, animTime, vel);
    }

    if(ann.wheels && ann.wheels.length){
      for(const wheel of ann.wheels){
        const cx = wheel.cx * cw;
        const cy = wheel.cy * ch;
        const r = wheel.r * cw;
        const clip = _getWheelClip(img, ann, wheel, cw, ch);
        if(clip){
          const rot = (wheel.rotSpeed || 1) * animTime * (opts.wheelSpeed || 3);
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(rot);
          ctx.drawImage(clip, -r, -r, r*2, r*2);
          ctx.restore();
        }
      }
    }

    const maskC = _getMaskLayer(img, ann, cw, ch);
    if(maskC) ctx.drawImage(maskC, 0, 0);

    if(ann.doors){
      const doorOpen = opts.doorOpen || 0;
      if(doorOpen > 3){
        const allDoors = [];
        if(ann.doors.lower) for(const d of ann.doors.lower) allDoors.push(d);
        if(ann.doors.upper) for(const d of ann.doors.upper) allDoors.push(d);
        if(ann.doors.hatch) for(const d of ann.doors.hatch) allDoors.push(d);
        ctx.save();
        ctx.fillStyle = '#000000';
        for(const d of allDoors){
          if(!d.polygon || d.polygon.length < 3) continue;
          ctx.beginPath();
          ctx.moveTo(d.polygon[0].x * cw, d.polygon[0].y * ch);
          for(let i = 1; i < d.polygon.length; i++) ctx.lineTo(d.polygon[i].x * cw, d.polygon[i].y * ch);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      }
      if(ann.doors.lower && ann.doors.lower.length){
        for(const d of ann.doors.lower) _renderDoor(ctx, img, ann, d, cw, ch, doorOpen * (110 / 180), '#0c0c0c');
      }
      if(ann.doors.upper && ann.doors.upper.length){
        for(const d of ann.doors.upper) _renderDoor(ctx, img, ann, d, cw, ch, doorOpen, '#0c0c0c');
      }
      if(ann.doors.hatch && ann.doors.hatch.length){
        for(const d of ann.doors.hatch) _renderDoor(ctx, img, ann, d, cw, ch, doorOpen * 0.5, '#0c0c0c');
      }
    }
  }

  function renderVehicle(ctx, id, x, y, w, h, animTime, opts) {
    opts = opts || {};
    const ann = ANN[id];
    if(!ann) return;
    const img = _loadVehicleImg(id);
    if(!img.complete || !img.naturalWidth) return;
    const cw = w, ch = h;

    const recoils = opts.recoils || {};
    let hasRecoil = false;
    const areas = ann.weaponAreas || [];
    for(const a of areas) {
      const wid = a.weaponId || '__default__';
      if(recoils[wid] && recoils[wid] > 0.1) { hasRecoil = true; break; }
    }

    if (!hasRecoil) {
      ctx.save();
      ctx.translate(x, y);
      _drawVehicleContent(ctx, id, cw, ch, animTime, opts);
      ctx.restore();
      return;
    }

    if (!window._vehRecoilCache) window._vehRecoilCache = {};
    const cache = window._vehRecoilCache;
    if (!cache.baseC || cache.baseC.width !== cw || cache.baseC.height !== ch) {
      cache.baseC = document.createElement('canvas');
      cache.baseC.width = cw; cache.baseC.height = ch;
      cache.bodyC = document.createElement('canvas');
      cache.bodyC.width = cw; cache.bodyC.height = ch;
      cache.wepC = document.createElement('canvas');
      cache.wepC.width = cw; cache.wepC.height = ch;
    }
    const baseC = cache.baseC, baseX = baseC.getContext('2d');
    const bodyC = cache.bodyC, bodyX = bodyC.getContext('2d');
    const wepC = cache.wepC, wepX = wepC.getContext('2d');

    baseX.setTransform(1, 0, 0, 1, 0, 0);
    baseX.clearRect(0, 0, cw, ch);
    _drawVehicleContent(baseX, id, cw, ch, animTime, opts);

    bodyX.setTransform(1, 0, 0, 1, 0, 0);
    bodyX.clearRect(0, 0, cw, ch);
    bodyX.drawImage(baseC, 0, 0);
    bodyX.globalCompositeOperation = 'destination-out';
    for (const a of areas) {
      const pts = a.polygon;
      if (!pts || pts.length < 3) continue;
      bodyX.beginPath();
      bodyX.moveTo(pts[0].x * cw, pts[0].y * ch);
      for (let i = 1; i < pts.length; i++) bodyX.lineTo(pts[i].x * cw, pts[i].y * ch);
      bodyX.closePath();
      bodyX.fill();
    }
    bodyX.globalCompositeOperation = 'source-over';

    ctx.save();
    ctx.translate(x, y);

    for (const a of areas) {
      const wid = a.weaponId || '__default__';
      const rx = recoils[wid] || 0;
      if (rx <= 0.1) continue;
      const pts = a.polygon;
      if (!pts || pts.length < 3) continue;

      wepX.setTransform(1, 0, 0, 1, 0, 0);
      wepX.clearRect(0, 0, cw, ch);
      wepX.drawImage(baseC, -rx, 0);
      wepX.globalCompositeOperation = 'destination-in';
      wepX.beginPath();
      wepX.moveTo(pts[0].x * cw - rx, pts[0].y * ch);
      for (let i = 1; i < pts.length; i++) wepX.lineTo(pts[i].x * cw - rx, pts[i].y * ch);
      wepX.closePath();
      wepX.fill();
      wepX.globalCompositeOperation = 'source-over';

      ctx.drawImage(wepC, 0, 0);
    }

    ctx.drawImage(bodyC, 0, 0);
    ctx.restore();
  }

  window.VehicleRenderer = { render: renderVehicle };

  /* ============ BTR 支援演出 ============ */
const BTR_TIMELINE = {
  enterDur: 2.5, arriveDur: 1.8, sinkDur: 1.5, centerDur: 1.0,
  supportDur: 30, liftDur: 1.5, exitDur: 2.0, leaveDur: 3.5
};
const PHASE_ORDER = ['enter', 'arrive', 'sink', 'center', 'support', 'lift', 'exit', 'leave'];

const MUZZLE_PROFILES = {
  kpvt:    { burst: 3,  intervalMs: 100,  pauseMs: 300, flashSize: 26, flashColor: '255,200,80',  bulletSize: 3.5, bulletSpeed: 450, projectileType: 'bullet' },
  pkt:     { burst: 3,  intervalMs: 80,   pauseMs: 300, flashSize: 22, flashColor: '255,220,120', bulletSize: 3,   bulletSpeed: 480, projectileType: 'bullet' },
  nsvt:    { burst: 3,  intervalMs: 80,   pauseMs: 300, flashSize: 24, flashColor: '255,220,120', bulletSize: 3.5, bulletSpeed: 470, projectileType: 'bullet' },
  '2a72':  { burst: 15, intervalMs: 200,  pauseMs: 500, flashSize: 32, flashColor: '255,180,60',  bulletSize: 4.5, bulletSpeed: 380, projectileType: 'bullet' },
  '2a42':  { burst: 15, intervalMs: 180,  pauseMs: 500, flashSize: 34, flashColor: '255,180,60',  bulletSize: 4.5, bulletSpeed: 400, projectileType: 'bullet' },
  '2a46':  { burst: 1,  intervalMs: 6500, pauseMs: 6500, flashSize: 40, flashColor: '255,140,60', bulletSize: 6,   bulletSpeed: 300, projectileType: 'bullet' },
  '2a46m1':{ burst: 1,  intervalMs: 6500, pauseMs: 6500, flashSize: 40, flashColor: '255,140,60', bulletSize: 6,   bulletSpeed: 300, projectileType: 'bullet' },
  ags17:   { burst: 6,  intervalMs: 300,  pauseMs: 800, flashSize: 28, flashColor: '255,200,100', bulletSize: 4,  bulletSpeed: 350, projectileType: 'bullet' },
  atgm:    { burst: 1,  intervalMs: 5000, pauseMs: 5000, flashSize: 30, flashColor: '255,200,100', bulletSize: 5,  bulletSpeed: 280, projectileType: 'missile' },
  default: { burst: 3,  intervalMs: 100,  pauseMs: 300, flashSize: 22, flashColor: '255,200,80',  bulletSize: 3.5, bulletSpeed: 450, projectileType: 'bullet' }
};

const BTRSupport = {
  active: false, vehicleId: 'btr80', startTime: 0,
  phase: 'enter', phaseT: 0, x: -1.5, yOffset: 0, doorX: -0.735, centerPX: -0.525, doorOffsetRatio: 0.48,
  targetH: 0, targetW: 0, sinkOffset: 0, canvas: null, ctx: null, width: 0, height: 0, dpr: 1, raf: null,
  supportRegion: null, routeCursor: { pathIdx: 0, nodeIdx: 0 }, kills: {}, loot: [], killCount: 0, lastTickSec: -1,
  muzzles: [], fireFx: [], dustParticles: [], recoilStates: {},
  playerClipH: 1.0, playerXOffset: 0, doorOpen: 0, shakeX: 0, shakeY: 0, _finished: false,
  
                        fx: {
    smoke: [], tracers: [],
    spawnCannon(x, y) {
      const _base = this.targetW || 300;
      // 1. 锥形发射烟 (Jet)
      this.smoke.push({ 
        x: x, y: y, 
        vx: _base * 25, vy: (Math.random() - 0.5) * _base * 0.05, 
        life: 1, rate: 1 / 0.3, 
        sizeX: _base * 0.15, sizeY: _base * 0.03, 
        growX: _base * 5.0, growY: _base * 1.0, 
        alpha0: 0.95, isJet: true, isCore: true, 
        friction: 0.65, 
        angle: 0, spin: 0, worldFactor: 0.1
      });
      
      // 2. 弥散烟 (Diffuse) - 降低初始透明度，加快衰减
      for(let i=0; i<6; i++) {
        this.smoke.push({ 
          x: x + _base * 0.15, y: y + (Math.random()-0.5)*_base*0.1, 
          vx: _base * 4 + Math.random() * _base * 2, 
          vy: (Math.random() - 0.5) * _base * 0.3, 
          life: 1, rate: 1 / (1.2 + Math.random() * 0.6), 
          sizeX: _base * 0.15, sizeY: _base * 0.15, 
          growX: _base * 0.8, growY: _base * 0.8, 
          alpha0: 0.15, 
          isJet: false, isCore: false, 
          friction: 0.94, 
          angle: Math.random() * 6.28, spin: (Math.random() - 0.5) * 1,
          worldFactor: 1.0 
        });
      }
    },
    spawnMainGun(x, y) {
      const _base = this.targetW || 300;
      this.smoke.push({ 
        x: x, y: y, 
        vx: _base * 35, vy: (Math.random() - 0.5) * _base * 0.1, 
        life: 1, rate: 1 / 0.4, 
        sizeX: _base * 0.3, sizeY: _base * 0.1, 
        growX: _base * 8.0, growY: _base * 3.0,
        alpha0: 0.98, isJet: true, isCore: true, 
        friction: 0.6, 
        angle: 0, spin: 0, worldFactor: 0.1
      });
      // 主炮弥散烟
      for(let i=0; i<10; i++) {
        this.smoke.push({ 
          x: x + _base * 0.2, y: y + (Math.random()-0.5)*_base*0.2, 
          vx: _base * 6 + Math.random() * _base * 3, 
          vy: -_base * 0.2 - Math.random() * _base * 0.3, 
          life: 1, 
          rate: 1 / (1.5 + Math.random() * 0.8), 
          sizeX: _base * 0.25, sizeY: _base * 0.25, 
          growX: _base * 1.2, growY: _base * 1.2, 
          alpha0: 0.18, 
          isJet: false, isCore: false, 
          friction: 0.92, 
          angle: Math.random() * 6.28, spin: (Math.random() - 0.5) * 1,
          worldFactor: 1.0
        });
      }
    },
    spawnMG(x, y) {
      const _base = this.targetW || 300;
      // 机枪发射烟 - 加入 worldFactor: 1.0 实现向后飘
      this.smoke.push({ 
        x: x, y: y, 
        vx: 0, vy: -_base * 0.2 - Math.random() * _base * 0.1, 
        life: 1, rate: 1 / 1.5, 
        sizeX: _base * 0.02, sizeY: _base * 0.02, 
        growX: _base * 0.1, growY: _base * 0.1, 
        alpha0: 0.3, isJet: false, isCore: false, 
        friction: 0.96, 
        angle: Math.random() * 6.28, spin: (Math.random() - 0.5) * 1,
        worldFactor: 1.0
      });
    },
    spawnTracer(x, y, speed, type) {
      this.tracers.push({ startX: x, startY: y, born: performance.now(), speed: speed, len: type === 'cannon' ? 80 : 40, width: type === 'cannon' ? 3 : 1.5, type: type });
    },
    update(now, dt, worldSpeed) {
      for (let i = this.smoke.length - 1; i >= 0; i--) {
        const p = this.smoke[i];
        const driftSpeed = worldSpeed * (p.worldFactor || 0);
        p.x += (p.vx - driftSpeed) * dt; 
        p.y += p.vy * dt;
        p.vx *= p.friction;
        p.vy *= p.friction;
        p.sizeX += p.growX * dt; 
        p.sizeY += p.growY * dt;
        p.life -= p.rate * dt; 
        p.angle += p.spin * dt;
        if (p.life <= 0) this.smoke.splice(i, 1);
      }
    },
    draw(ctx) {
      for (const p of this.smoke) {
        let a = 0;
        if (p.isJet) {
          a = p.alpha0 * Math.pow(Math.max(0, p.life), 2.0);
        } else {
          a = p.alpha0 * Math.pow(Math.max(0, p.life), 3.0); 
        }
        if (a < 0.005) continue;
        
        ctx.save(); 
        ctx.translate(p.x, p.y); 
        
        if (p.isJet) {
          ctx.scale(p.sizeX / Math.max(1, p.sizeY), 1); 
          ctx.globalAlpha = a; 
          const g = ctx.createRadialGradient(0, 0, 0, 0, 0, p.sizeY);
          g.addColorStop(0, 'rgba(255, 255, 255, 1)');
          g.addColorStop(0.4, 'rgba(230, 240, 255, 0.8)'); 
          g.addColorStop(1, 'rgba(200, 210, 220, 0)');
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(0, 0, p.sizeY, 0, Math.PI * 2); ctx.fill();
        } else {
          ctx.rotate(p.angle);
          ctx.globalAlpha = a; 
          const g = ctx.createRadialGradient(0, 0, 0, 0, 0, p.sizeX);
          g.addColorStop(0, 'rgba(235, 235, 240, 0.9)');
          g.addColorStop(0.5, 'rgba(210, 210, 215, 0.2)'); 
          g.addColorStop(1, 'rgba(190, 190, 195, 0)');
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(0, 0, p.sizeX, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    },
    drawTracers(ctx, now) {
      if (!this.tracers || !this.tracers.length) return;
      ctx.save(); ctx.shadowColor = 'rgba(255,200,50,0.8)'; ctx.shadowBlur = 10;
      for (let i = this.tracers.length - 1; i >= 0; i--) {
        const t = this.tracers[i];
        const tipX = t.startX + (now - t.born) / 1000 * t.speed;
        if (tipX - t.len > ctx.canvas.width + 200) { this.tracers.splice(i, 1); continue; }
        const tailX = Math.max(t.startX, tipX - t.len);
        const grad = ctx.createLinearGradient(tailX, t.startY, tipX, t.startY);
        grad.addColorStop(0, 'rgba(255,200,50,0)'); 
        grad.addColorStop(0.8, 'rgba(255,255,200,0.9)'); 
        grad.addColorStop(1, '#fff');
        ctx.strokeStyle = grad; ctx.lineWidth = t.width;
        ctx.beginPath(); ctx.moveTo(tailX, t.startY); ctx.lineTo(tipX, t.startY); ctx.stroke();
      }
      ctx.restore();
    }
  },























  start(vid) {
    if(this.active) return;
    this.vehicleId = vid || 'btr80';
    if(!ANN[this.vehicleId]) this.vehicleId = 'btr80';
    if(typeof VEHICLES !== 'undefined' && VEHICLES[this.vehicleId] && VEHICLES[this.vehicleId].supportDuration) BTR_TIMELINE.supportDur = VEHICLES[this.vehicleId].supportDuration;
    else BTR_TIMELINE.supportDur = 30;
    this.active = true; this.startTime = performance.now(); this.phase = 'enter'; this.phaseT = 0;
    this.yOffset = 0; this.doorOpen = 0; this.shakeX = 0; this.shakeY = 0; this.sinkOffset = 0;
    this.kills = {}; this.loot = []; this.killCount = 0; this.lastTickSec = -1;
    this.fireFx = []; this.dustParticles = []; this.fx.smoke = []; this.fx.tracers = []; this.recoilStates = {};
    this.playerClipH = 1.0; this.playerXOffset = 0; this._finished = false;
    this._setupCanvas(); this._setupStreamBg(); this._setupMuzzles(); this._setupSupportRegion();
    const self = this; this.raf = requestAnimationFrame(function(t){ self._loop(t); });
  },
  _setupSupportRegion() {
    const regions = (typeof getActiveRegions === 'function') ? getActiveRegions() : ['廢棄工廠'];
    const region = (state.activeRegion && regions.indexOf(state.activeRegion) !== -1) ? state.activeRegion : regions[0];
    this.supportRegion = region; const routes = ROUTES[region]; const prog = state.regionProgress[region] || { pathIdx: 0, nodeIdx: 0 };
    this.routeCursor = routes ? { pathIdx: prog.pathIdx || 0, nodeIdx: (prog.nodeIdx || 0) + 1 } : { pathIdx: 0, nodeIdx: 0 };
  },
  _setupMuzzles() {
    const ann = ANN[this.vehicleId]; this.muzzles = []; if(!ann || !ann.muzzles) return;
    for(const m of ann.muzzles){
      this.muzzles.push({ weaponId: m.weaponId, mx: m.x, my: m.y, profile: MUZZLE_PROFILES[m.weaponId] || MUZZLE_PROFILES.default, shotsLeft: (MUZZLE_PROFILES[m.weaponId] || MUZZLE_PROFILES.default).burst, nextFireAt: 0, lastFireAt: 0 });
    }
  },
  _setupStreamBg() {
    const zone = document.getElementById('zone1'); if(!zone) return;
    if(!document.getElementById('btr-stream-bg-style')){
      const style = document.createElement('style'); style.id = 'btr-stream-bg-style';
      style.textContent = [
        '.btr-stream-bg{position:absolute;inset:0;z-index:0;opacity:0;transition:opacity 0.45s ease-out;pointer-events:none;overflow:hidden;background:radial-gradient(ellipse 120% 80% at 50% 35%, #20202a 0%, #16161e 50%, #0a0a10 100%);}',
        '.btr-stream-bg.on{opacity:1;}',
        '.btr-streak{position:absolute;left:100%;height:2px;border-radius:1px;background:linear-gradient(to right,transparent 0%,rgba(200,200,200,0.65) 25%,rgba(245,245,245,0.95) 50%,rgba(200,200,200,0.65) 75%,transparent 100%);box-shadow:0 0 6px rgba(255,255,255,0.35);animation-name:btrStreakMove;animation-timing-function:linear;animation-iteration-count:infinite;will-change:transform;}',
        '@keyframes btrStreakMove{from{transform:translateX(0);}to{transform:translateX(-200vw);}}'
      ].join('\n');
      document.head.appendChild(style);
    }
    let el = document.getElementById('btr-stream-bg');
    if(!el){
      el = document.createElement('div'); el.id = 'btr-stream-bg'; el.className = 'btr-stream-bg';
      let streaks = '';
      for(let i = 0; i < 24; i++){
        const top = 5 + Math.random() * 90; const width = 12 + Math.random() * 32;
        const delay = Math.random() * 1.4; const duration = 0.5 + Math.random() * 0.8;
        const opacity = 0.3 + Math.random() * 0.55; const height = Math.random() < 0.25 ? 3 : 2;
        streaks += '<div class="btr-streak" style="top:' + top.toFixed(1) + '%;width:' + width.toFixed(1) + '%;height:' + height + 'px;opacity:' + opacity.toFixed(2) + ';animation-delay:' + delay.toFixed(2) + 's;animation-duration:' + duration.toFixed(2) + 's"></div>';
      }
      el.innerHTML = streaks; zone.appendChild(el);
    }
    this.streamBgEl = el;
    if(this.phase === 'support') el.classList.add('on'); else el.classList.remove('on');
  },

  _setupCanvas() {
    const zone = document.getElementById('zone1'); if(!zone) return;
    let c = document.getElementById('btr-support-canvas'); if(!c){ c = document.createElement('canvas'); c.id = 'btr-support-canvas'; zone.appendChild(c); }
    this.canvas = c; const dpr = window.devicePixelRatio || 1; const w = zone.clientWidth, h = zone.clientHeight;
    c.width = Math.floor(w * dpr); c.height = Math.floor(h * dpr); c.style.width = w + 'px'; c.style.height = h + 'px';
    this.ctx = c.getContext('2d'); this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.width = w; this.height = h; this.dpr = dpr;
    const ann = ANN[this.vehicleId];
    if(ann){
      let _contentMinY = 0, _contentMaxY = 1, _contentH = 1.0;
      try { const _m = _loadVehicleImg(this.vehicleId); if(_m && _m.complete && _m.naturalWidth && typeof _measureImgContentBounds === 'function'){ const _b = _measureImgContentBounds(_m); if(_b){ _contentMinY = _b.minY; _contentMaxY = _b.maxY; _contentH = _b.maxY - _b.minY; } } } catch(_e){}
      if(!isFinite(_contentH) || _contentH < 0.1){ _contentH = 1.0; _contentMinY = 0; _contentMaxY = 1; }
      this._contentMinYRatio = _contentMinY; this._contentBottomRatio = _contentMaxY; this._contentH = _contentH;
      const _realH = (window.VEHICLE_REAL_HEIGHTS && window.VEHICLE_REAL_HEIGHTS[this.vehicleId]) || 2.5;
      this.targetH = h * 0.6735 * (_realH / 1.7); this.targetW = this.targetH * (ann.imageSize.w / ann.imageSize.h);
      const playerCenterX = w * (typeof EXPLORE_HERO_X_RATIO === 'number' ? EXPLORE_HERO_X_RATIO : 0.25);
      let _doorCenterRatio = 0.48;
      if(ann.doors){
        let _sumX = 0, _sumN = 0;
        if(ann.doors.upper){ for(const _d of ann.doors.upper){ if(_d.polygon){ for(const _p of _d.polygon){ _sumX += _p.x; _sumN++; } } } }
        if(ann.doors.lower){ for(const _d of ann.doors.lower){ if(_d.polygon){ for(const _p of _d.polygon){ _sumX += _p.x; _sumN++; } } } }
        if(ann.doors.hatch){ for(const _d of ann.doors.hatch){ if(_d.polygon){ for(const _p of _d.polygon){ _sumX += _p.x; _sumN++; } } } }
        if(_sumN > 0) _doorCenterRatio = _sumX / _sumN;
      }
      this.doorOffsetRatio = _doorCenterRatio; this.doorX = (playerCenterX - this.doorOffsetRatio * this.targetW) / w;
      let maxMuzzleX = 0; if(ann.muzzles){ for(const m of ann.muzzles){ if(m.x > maxMuzzleX) maxMuzzleX = m.x; } }
      const maxAllowedLeft = w - 12 - maxMuzzleX * this.targetW; const leftPx = Math.min(w/2 - this.targetW/2, maxAllowedLeft);
      this.centerPX = leftPx / w;
      const groundY = h * 0.95; const py0 = groundY - (this._contentBottomRatio || 1) * this.targetH;
      this.sinkOffset = py0 < 4 ? (4 - py0) : 0;
    }
  },
  _loop(t) {
    if(!this.active) return;
    const now = performance.now(); const el = (now - this.startTime) / 1000;
    this._update(el, now); this._render(now);
    if(this.active){ const self = this; this.raf = requestAnimationFrame(function(t){ self._loop(t); }); }
  },
  _easeInOut(p) { return p < 0.5 ? 2*p*p : 1 - Math.pow(-2*p + 2, 2) / 2; },
  _update(t, now) {
    let acc = 0, curPhase = null, phaseT = 0;
    for(const p of PHASE_ORDER){ if(t < acc + BTR_TIMELINE[p + 'Dur']){ curPhase = p; phaseT = t - acc; break; } acc += BTR_TIMELINE[p + 'Dur']; }
    if(!curPhase){ curPhase = 'leave'; phaseT = t - (acc - BTR_TIMELINE.leaveDur); }
    if(curPhase !== this.phase){ this._onPhaseEnter(curPhase); }
    this.phase = curPhase; this.phaseT = phaseT;
    if(curPhase === 'enter'){
      const p = phaseT / BTR_TIMELINE.enterDur; this.x = -1.5 + this._easeInOut(Math.min(1, p)) * (this.doorX - (-1.5));
      this.doorOpen = 0; this.yOffset = 0; this.playerClipH = 1.0; this.playerXOffset = 0;
    } else if(curPhase === 'arrive'){
      this.x = this.doorX; const p = Math.min(1, phaseT / BTR_TIMELINE.arriveDur);
      if(p < 0.25) this.doorOpen = p / 0.25; else if(p < 0.75) this.doorOpen = 1; else this.doorOpen = 1 - (p - 0.75) / 0.25;
      if(p < 0.15) this.playerClipH = 1.0; else if(p < 0.65) this.playerClipH = 1 - (p - 0.15) / 0.5; else this.playerClipH = 0;
      this.playerXOffset = 0.03 * Math.min(1, p / 0.4);
    } else if(curPhase === 'sink'){
      this.x = this.doorX; this.doorOpen = 0; const p = Math.min(1, phaseT / BTR_TIMELINE.sinkDur); this.yOffset = this._easeInOut(p) * this.sinkOffset;
    } else if(curPhase === 'center'){
      const p = Math.min(1, phaseT / BTR_TIMELINE.centerDur); this.x = this.doorX + this._easeInOut(p) * (this.centerPX - this.doorX); this.doorOpen = 0; this.yOffset = this.sinkOffset;
    } else if(curPhase === 'support'){
      this.x = this.centerPX; this.doorOpen = 0; this.yOffset = this.sinkOffset; this._updateSupport(phaseT, now);
    } else if(curPhase === 'lift'){
      const p = Math.min(1, phaseT / BTR_TIMELINE.liftDur); this.x = this.centerPX + this._easeInOut(p) * (this.doorX - this.centerPX); this.yOffset = (1 - this._easeInOut(p)) * this.sinkOffset; this.doorOpen = 0;
    } else if(curPhase === 'exit'){
      this.x = this.doorX; const p = Math.min(1, phaseT / BTR_TIMELINE.exitDur);
      if(p < 0.25) this.doorOpen = p / 0.25; else if(p < 0.75) this.doorOpen = 1; else this.doorOpen = 1 - (p - 0.75) / 0.25;
      if(p < 0.15) this.playerClipH = 0; else if(p < 0.65) this.playerClipH = (p - 0.15) / 0.5; else this.playerClipH = 1.0;
      this.playerXOffset = 0.03 * Math.max(0, 1 - p / 0.6);
    } else if(curPhase === 'leave'){
      const p = Math.min(1, phaseT / BTR_TIMELINE.leaveDur); this.x = this.doorX + p * (1.5 - this.doorX); this.doorOpen = 0;
      if(p >= 1 && !this._finished){ this._finished = true; try { this._finishSupportAndLog(); } catch(e){} finally { this._cleanup(); this.active = false; } }
    }
  },
  _onPhaseEnter(phase) {
    if(phase === 'support'){ this.lastTickSec = -1; if(this.streamBgEl) this.streamBgEl.classList.add('on'); this._logRegionEntry(); }
    else if(phase === 'lift'){
      if(this.streamBgEl) this.streamBgEl.classList.remove('on');
      if(typeof state !== 'undefined' && state.regionProgress && typeof updateExploreBg === 'function'){
        state.regionProgress[this.supportRegion] = { pathIdx: this.routeCursor.pathIdx, nodeIdx: this.routeCursor.nodeIdx };
        requestAnimationFrame(function(){ try{ updateExploreBg(); }catch(e){} });
      }
    }
  },
  _logRegionEntry() {
    const vehName = (VEHICLES[this.vehicleId] && VEHICLES[this.vehicleId].name) || this.vehicleId;
    pushLog('<span class="pl">玩家</span> 乘坐 <span class="pl">' + vehName + '</span> 在 <b>' + this.supportRegion + '</b> 橫衝直撞', [], 'explore'); this._updateZoneTitle();
  },
  _updateZoneTitle() {
    const t = document.querySelector('#zone1 .zone-title'); if(!t) return;
    const routes = ROUTES[this.supportRegion]; if(!routes) return; const cur = routes[this.routeCursor.pathIdx]; if(!cur) return;
    t.innerHTML = '🧭 ' + this.supportRegion + ' · ' + cur.name + ' · ' + (cur.nodes[this.routeCursor.nodeIdx] || cur.nodes[0]);
  },
  _updateSupport(phaseT, now) {
    this.shakeX = Math.sin(now / 40) * 1.5; this.shakeY = Math.cos(now / 55) * 1.2;
    const secNow = Math.floor(phaseT); if(secNow > this.lastTickSec){ this.lastTickSec = secNow; this._supportTick(now); }
    for(const m of this.muzzles){ if(now >= m.nextFireAt) this._fireMuzzle(m, now); }
  },
  _supportTick(now) {
    this._advanceNode(); this._updateZoneTitle(); const region = this.supportRegion;
    const n = (typeof rndInt === 'function') ? rndInt(1, 3) : (1 + Math.floor(Math.random() * 3));
    const enemies = (typeof genEnemies === 'function') ? genEnemies(region, n) : [];
    for(const e of enemies){
      this.kills[e.id] = (this.kills[e.id] || 0) + 1; this.killCount++;
      const dropN = (typeof rndInt === 'function') ? rndInt(1, 2) : 1;
      for(let i = 0; i < dropN; i++){
        const drop = (typeof rollRegionDrop === 'function') ? rollRegionDrop(region) : null; if(!drop) continue;
        let cnt = (itemCat(drop.id) === 'ammo') ? rndInt(3, 8) : (itemCat(drop.id) === 'material' ? rndInt(1, 4) : 1);
        cnt = applyDropBonus(cnt); invAdd(drop.id, drop.rarity, cnt); this.loot.push({ id: drop.id, rarity: drop.rarity, count: cnt });
      }
    }
  },
  _advanceNode() {
    const routes = ROUTES[this.supportRegion]; if(!routes || !routes.length) return; const cur = routes[this.routeCursor.pathIdx]; if(!cur) return;
    this.routeCursor.nodeIdx++;
    if(this.routeCursor.nodeIdx >= cur.nodes.length){
      this.routeCursor.pathIdx++;
      if(this.routeCursor.pathIdx >= routes.length){ this.routeCursor.pathIdx = 0; this.routeCursor.nodeIdx = 0; this._switchToNextRegion(); }
      else { this.routeCursor.nodeIdx = 0; }
    }
  },
  _switchToNextRegion() {
    const regions = (typeof getActiveRegions === 'function') ? getActiveRegions() : ['廢棄工廠'];
    const idx = regions.indexOf(this.supportRegion); const nextIdx = (idx + 1) % regions.length; const nextRegion = regions[nextIdx];
    if(nextRegion !== this.supportRegion){ this.supportRegion = nextRegion; this._logRegionEntry(); }
  },
    _fireMuzzle(m, now) {
    m.lastFireAt = now;
    const basePx = this.x * this.width;
    const basePy = this.height * 0.95 - (this._contentBottomRatio || 1) * this.targetH + this.yOffset;
    const isMG = (m.weaponId === 'pkt' || m.weaponId === 'nsvt' || m.weaponId === 'kpvt');
    const isMain = (m.weaponId === '2a46' || m.weaponId === '2a46m1');
    const muzzleX = basePx + m.mx * this.targetW;
    const muzzleY = basePy + m.my * this.targetH;
    
    // 生成烟雾
    if (isMG) {
      this.fx.spawnMG(muzzleX, muzzleY);
    } else if (isMain) {
      this.fx.spawnMainGun(muzzleX, muzzleY);
    } else {
      this.fx.spawnCannon(muzzleX, muzzleY);
    }

    this.fx.spawnTracer(muzzleX, muzzleY, isMG ? 800 : 1200, isMG ? 'mg' : 'cannon');

    // 火光随机化：主炮100%，机炮首发100%后续15%，机枪10%
    let triggerFlash = false;
    if (isMain) {
      triggerFlash = true;
    } else if (isMG) {
      triggerFlash = Math.random() < 0.1;
    } else {
      if (m.shotsLeft === m.profile.burst) {
        triggerFlash = true;
      } else {
        triggerFlash = Math.random() < 0.15;
      }
    }

    this.fireFx.push({
      mx: m.mx, my: m.my, 
      spawnX: muzzleX, spawnY: muzzleY, 
      startTime: now, endTime: now + 600, size: m.profile.flashSize, 
      layerOrder: 'above', weaponId: m.weaponId, triggerFlash: triggerFlash
    });

    m.shotsLeft--;
    if (m.shotsLeft <= 0) { m.shotsLeft = m.profile.burst; m.nextFireAt = now + m.profile.pauseMs; }
    else { m.nextFireAt = now + m.profile.intervalMs; }

    if (!this.recoilStates) this.recoilStates = {};
    let rcDist = 0, rcDur = 0;
    if (m.weaponId === '2a46' || m.weaponId === '2a46m1') { rcDist = 0.10; rcDur = 900; }
    else if (m.weaponId === '2a72') { rcDist = 0.055; rcDur = 500; }
    else if (m.weaponId === '2a42') { rcDist = 0.045; rcDur = 500; }
    else if (m.weaponId === 'atgm') { rcDist = 0.040; rcDur = 600; }
    this.recoilStates[m.weaponId] = { startTime: now, duration: rcDur, dist: rcDist };
    m.recoilDur = rcDur;
    m.smokeDur = isMG ? 200 : rcDur; 
  },



  _getBTRWorldSpeed() {
    if (this.phase === 'support') return 100; 
    if (this.phase === 'enter' || this.phase === 'leave') return 130; 
    if (this.phase === 'center' || this.phase === 'lift') return 60; 
    if (this.phase === 'arrive' || this.phase === 'exit') return 20; 
    return 0;
  },

  _render(now) {
    const ctx = this.ctx; if (!ctx) return; ctx.clearRect(0, 0, this.width, this.height);
    const ann = ANN[this.vehicleId]; if (!ann) return;
    
    const px = this.x * this.width + this.shakeX; 
    const py = this.height * 0.95 - (this._contentBottomRatio || 1) * this.targetH + this.yOffset + this.shakeY;
    const basePx = this.x * this.width;
    const basePy = this.height * 0.95 - (this._contentBottomRatio || 1) * this.targetH + this.yOffset;

    const recoilsPx = {};
    if (this.recoilStates) { 
      for (const wid in this.recoilStates) { 
        const rs = this.recoilStates[wid]; const t = (now - rs.startTime) / rs.duration; 
        if (t < 1) { 
          const p = t < 0.08 ? t / 0.08 : Math.pow(1 - (t - 0.08) / 0.92, 2.4); 
          recoilsPx[wid] = rs.dist * this.targetW * p; 
        } else if (wid !== '__default__') { delete this.recoilStates[wid]; } 
      } 
    }
    const dt = Math.min(0.05, (now - (this._lastTick || now)) / 1000); this._lastTick = now; const worldSpeed = this._getBTRWorldSpeed();
    
    // 烟雾生成已移动至 _fireMuzzle，此处只处理特效更新
    this.fx.update(now, dt, worldSpeed);
    
    renderVehicle(ctx, this.vehicleId, px, py, this.targetW, this.targetH, (now - this.startTime) / 1000, { trackVel: (this.phase === 'support') ? 300 : 100, wheelSpeed: (this.phase === 'support') ? 20 : 6, doorOpen: (this.doorOpen || 0) * 180, recoils: recoilsPx });
    
    this.fx.draw(ctx);
    for (const fx of this.fireFx) { 
      if (fx.layerOrder !== 'above') continue; 
      this._drawOneFireFx(ctx, fx, now, px, py); 
    }
    this.fx.drawTracers(ctx, now);
    
    if(!this.dustParticles) this.dustParticles = [];
    const intensity = (this.phase === 'support') ? 0.8 : 0;
    if(ann.wheels && intensity > 0 && Math.random() < intensity){
      const wheel = ann.wheels[Math.floor(Math.random() * ann.wheels.length)];
      this.dustParticles.push({ x: px + wheel.cx * this.targetW, y: py + wheel.cy * this.targetH + wheel.r * this.targetW, vx: -(1.2 + Math.random() * 3.2), vy: -(0.3 + Math.random() * 1.2), life: 1, size: 6 + Math.random() * 10, hue: 28 + Math.random() * 18 });
    }
    for(let i = this.dustParticles.length - 1; i >= 0; i--){
      const p = this.dustParticles[i]; p.x += p.vx; p.y += p.vy; p.vy += 0.06; p.vx *= 0.98; p.life -= 0.014;
      if(p.life <= 0){ this.dustParticles.splice(i, 1); continue; }
      ctx.fillStyle = 'hsla(' + p.hue + ',35%,48%,' + (Math.max(0, p.life) * 0.65) + ')';
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1.5 - p.life * 0.45), 0, Math.PI * 2); ctx.fill();
    }
  },

                _drawOneFireFx(ctx, fx, now, px, py) {
    const age = now - fx.startTime, total = fx.endTime - fx.startTime; if (age > total) return;
    const t = age / total;
    const x = fx.spawnX !== undefined ? fx.spawnX : (px + fx.mx * this.targetW);
    const y = fx.spawnY !== undefined ? fx.spawnY : (py + fx.my * this.targetH);
    if (t < 0.15 && fx.triggerFlash) {
      const ft = t / 0.15; 
      const isCannon = (fx.weaponId === '2a42' || fx.weaponId === '2a72' || fx.weaponId === '2a46' || fx.weaponId === '2a46m1');
      const isMain = (fx.weaponId === '2a46' || fx.weaponId === '2a46m1');
      const fxX = x + (isCannon ? 60 : 15);
      const fxY = y + (Math.random() - 0.5) * (isMain ? 10 : 4);
      const baseR = fx.size * (isMain ? 3.0 : (isCannon ? 2.0 : 0.8));
      const fade = 1 - ft;
      ctx.save();
      ctx.translate(fxX, fxY);
      ctx.scale(isMain ? 3.5 : 2.2, 1);
      const gCore = ctx.createRadialGradient(0, 0, 0, 0, 0, baseR);
      gCore.addColorStop(0, 'rgba(255,255,230,' + (fade * 0.95) + ')');
      gCore.addColorStop(0.3, 'rgba(255,230,120,' + (fade * 0.8) + ')');
      gCore.addColorStop(0.6, 'rgba(255,140,40,' + (fade * 0.4) + ')');
      gCore.addColorStop(1, 'rgba(200,50,10,0)');
      ctx.fillStyle = gCore;
      ctx.beginPath(); ctx.arc(0, 0, baseR, 0, Math.PI * 2); ctx.fill();
      if (isCannon) {
        const gSecondary = ctx.createRadialGradient(baseR * 1.5, 0, 0, baseR * 1.5, 0, baseR * 0.8);
        gSecondary.addColorStop(0, 'rgba(255,200,100,' + (fade * 0.6) + ')');
        gSecondary.addColorStop(1, 'rgba(255,80,20,0)');
        ctx.fillStyle = gSecondary;
        ctx.beginPath(); ctx.arc(baseR * 1.5, 0, baseR * 0.8, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
  },















  _finishSupportAndLog() {
    const exp = this.killCount * 10;
    if(exp > 0){
      if(typeof _garageAddVehicleExp === 'function') _garageAddVehicleExp(this.vehicleId, exp);
      else if(typeof _garageInitState === 'function'){ const g = _garageInitState(); if(g) g.vehicleExp[this.vehicleId] = (g.vehicleExp[this.vehicleId] || 0) + exp; }
      if(typeof save === 'function') save();
    }
    const vehName = (VEHICLES[this.vehicleId] && VEHICLES[this.vehicleId].name) || this.vehicleId;
    state.logs.push({ t: Date.now(), html: '<span class="pl">' + vehName + '</span> 支援已離開，<span style="color:#4a90d9;text-decoration:underline;text-decoration-style:dotted">點擊查看詳情</span>', items: this.loot.slice(), type: 'btr', btrKills: Object.assign({}, this.kills), btrExp: exp, btrTotalKills: this.killCount, vehicleId: this.vehicleId });
    if(typeof currentTab !== 'undefined' && currentTab === 'explore' && typeof renderZone3Log === 'function') renderZone3Log();
    const t = document.querySelector('#zone1 .zone-title');
    if(t){ const region = state.activeRegion || ''; const cur = region ? getCurrentNode(region) : null; if(cur){ t.innerHTML = '🧭 ' + region.replace(/II$/, ' II') + ' · ' + cur.node; } }
  },
  _cleanup() {
    if(this.raf){ cancelAnimationFrame(this.raf); this.raf = null; }
    if(this.canvas){ this.canvas.remove(); this.canvas = null; this.ctx = null; }
    if(this.streamBgEl){ this.streamBgEl.remove(); this.streamBgEl = null; }
    this.fireFx = []; this.muzzles = []; this.dustParticles = []; this.fx.smoke = []; this.fx.tracers = [];
  },
  stop() { this._cleanup(); this.active = false; }
};

window.BTRSupport = BTRSupport;

window._radioBTRTrigger = function(){
  const g = (typeof _garageInitState === 'function') ? _garageInitState() : null;
  const vid = g ? g.currentVehicle : 'btr80';
  BTRSupport.start(vid);
};

window._openBTRSupportDetail = function(log){
  if(!log) return;
  const kills = log.btrKills || {};
  const loot = log.items || [];
  const exp = log.btrExp || 0;
  const vehId = log.vehicleId || 'btr80';
  const vehName = (VEHICLES[vehId] && VEHICLES[vehId].name) || vehId;
  const totalKills = log.btrTotalKills || 0;
  const totalLoot = loot.reduce(function(s, it){ return s + (it.count || 0); }, 0);

  const summary = vehName + ' 橫衝直撞 · 擊殺 ' + totalKills + ' 隻 · 獲得 ' + totalLoot + ' 件物資' + (exp > 0 ? ' · 經驗 +' + exp : '');
  let body = '<div style="font-size:11px;color:#7a6f60;margin-bottom:8px;line-height:1.5">' + summary + '</div>';

  if(!window._btrCollapsed) window._btrCollapsed = {};

  if(Object.keys(kills).length){
    const kc = !!window._btrCollapsed['__kills__'];
    body += '<div class="cat-header" data-btr-cat="__kills__" style="cursor:pointer"><span>💀 擊殺記錄 (' + Object.keys(kills).length + ')</span><span>' + (kc ? '▶' : '▼') + '</span></div>';
    if(!kc){
      for(const eid in kills){
        const eDef = (typeof ENEMIES !== 'undefined' && ENEMIES[eid]) || { name: eid };
        body += '<div class="stat-line"><span class="k">' + eDef.name + '</span><span class="v">×' + kills[eid] + '</span></div>';
      }
    }
  }

  if(loot.length){
    const merged = {};
    for(const it of loot){
      const k = it.id + '@' + it.rarity;
      if(!merged[k]) merged[k] = { id: it.id, rarity: it.rarity, count: 0 };
      merged[k].count += it.count;
    }
    const items = Object.values(merged);
    const groups = { weapon: [], armor: [], ammo: [], consume: [], material: [], misc: [] };
    for(const it of items){
      const cat = itemCat(it.id);
      if(groups[cat]) groups[cat].push(it);
      else groups.misc.push(it);
    }
    for(const g in groups){
      groups[g].sort(function(a, b){
        const rd = RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity);
        if(rd !== 0) return rd;
        const ad = itemDef(a.id) || { name: a.id };
        const bd = itemDef(b.id) || { name: b.id };
        return (ad.name || '').localeCompare(bd.name || '', 'zh-Hant');
      });
    }
    const names = { weapon:'⚔️ 武器', armor:'🛡️ 裝備', ammo:'🔫 彈藥', consume:'💊 消耗品', material:'🔧 材料', misc:'📦 其他' };
    for(const g in groups){
      if(!groups[g].length) continue;
      const col = !!window._btrCollapsed[g];
      body += '<div class="cat-header" data-btr-cat="' + g + '" style="cursor:pointer"><span>' + names[g] + ' (' + groups[g].length + ')</span><span>' + (col ? '▶' : '▼') + '</span></div>';
      if(!col){
        for(const it of groups[g]){
          const d = itemDef(it.id) || { name: it.id };
          const sub = it.rarity + (d.type ? ' · ' + d.type : '');
          body += '<div class="item-row" data-iid="' + it.id + '" data-irar="' + it.rarity + '"><div class="icon" style="background:' + rarityBg(it.rarity) + '">' + itemIcon(it.id, 30) + '</div><div class="info"><div class="nm ' + rarityClass(it.rarity) + '">' + d.name + '</div><div class="sub">' + sub + '</div></div><div class="cnt">×' + it.count + '</div></div>';
        }
      }
    }
  } else {
    body += '<div class="empty-hint" style="margin:10px 0">無掉落</div>';
  }

  const ft = document.createElement('div');
  ft.className = 'modal-ft'; ft.innerHTML = '';
  const bd = openModal({ title: '支援報告', body: body, footer: ft });

  const headers = bd.querySelectorAll('.cat-header[data-btr-cat]');
  for(let i = 0; i < headers.length; i++){
    (function(h){
      h.onclick = function(){
        const key = h.getAttribute('data-btr-cat');
        window._btrCollapsed[key] = !window._btrCollapsed[key];
        closeModal();
        window._openBTRSupportDetail(log);
      };
    })(headers[i]);
  }

  const rows = bd.querySelectorAll('.item-row[data-iid]');
  for(let i = 0; i < rows.length; i++){
    (function(r){
      r.onclick = function(){
        const iid = r.getAttribute('data-iid');
        const irar = r.getAttribute('data-irar');
        if(typeof openItemDetail === 'function'){
          openItemDetail(iid, irar, function(){ window._openBTRSupportDetail(log); });
        }
      };
    })(rows[i]);
  }
};

  


})();

'use strict';

const VEHICLE_REAL_HEIGHTS = {
  btr80: 2.41, btr80a: 2.80, btr82: 2.725, btr82a: 2.725, btr90: 2.98,
  t80: 2.74, t80b: 2.74, t80bv: 2.74, t80u: 2.74, t80uk: 2.74, t80um: 2.74,
  bmp1: 2.15, bmp1m: 2.25, bmp2: 2.45, bmp3: 2.40, bmd4: 2.17
};

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

const _imgCache = new Map();
function _loadVehicleImg(id){
  if(_imgCache.has(id)) return _imgCache.get(id);
  const img = new Image();
  img.src = 'icons/vehicles/' + id + '.png' + (typeof assetSuffix === 'function' ? assetSuffix() : '');
  _imgCache.set(id, img);
  return img;
}

function _isImgReady(src){
  if(!src) return false;
  if(typeof HTMLCanvasElement !== 'undefined' && src instanceof HTMLCanvasElement) return src.width > 0 && src.height > 0;
  return !!(src.complete && src.naturalWidth);
}
function _getSrcKey(src){
  if(!src) return '';
  if(src._baseId) return src._baseId;
  return src.src || '';
}
function _getMaskYAtX(ann, nx){
  if(!ann.trackMask || !ann.trackMask.points) return 1;
  const pts = ann.trackMask.points.slice().sort(function(a,b){ return a.x - b.x; });
  if(pts.length < 2) return 1;
  if(nx <= pts[0].x) return pts[0].y;
  if(nx >= pts[pts.length-1].x) return pts[pts.length-1].y;
  for(let i = 0; i < pts.length-1; i++){
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
  const size = Math.ceil(r * 2);
  if(size < 3) return null;
  if(!_isImgReady(img)) return null;

  const maskOn = ann.trackMask && ann.trackMask.enabled;
  const loopOn = ann.trackLoop && ann.trackLoop.points && ann.trackLoop.points.length >= 3;
  const maskKey = maskOn ? ann.trackMask.points.map(function(p){ return p.x.toFixed(3) + "," + p.y.toFixed(3); }).join(";") : "off";
  const loopKey = loopOn ? ann.trackLoop.points.map(function(p){ return p.x.toFixed(3) + "," + p.y.toFixed(3); }).join(";") : "off";
  const sc = ann.trackScroll || {};
  let _ty0 = sc.textureY0, _ty1 = sc.textureY1;
  if(_ty0 == null || !isFinite(_ty0)) _ty0 = 0.6;
  if(_ty1 == null || !isFinite(_ty1)) _ty1 = 1.0;
  if(_ty0 > _ty1){ const _t = _ty0; _ty0 = _ty1; _ty1 = _t; }
  const texKey = _ty0.toFixed(3) + "," + _ty1.toFixed(3);

  const key = _getSrcKey(img) + "|" + cw + "x" + ch + "|" + cx.toFixed(1) + "|" + cy.toFixed(1) + "|" + size + "|" + maskKey + "|" + loopKey + "|" + texKey;
  if(_wheelClipCache.has(key)) return _wheelClipCache.get(key);

  const c = document.createElement("canvas"); c.width = size; c.height = size;
  const cc = c.getContext("2d");
  cc.save();
  cc.beginPath(); cc.arc(size/2, size/2, size/2 - 0.5, 0, Math.PI * 2); cc.clip();
  cc.drawImage(img, -(cx - size/2), -(cy - size/2), cw, ch);
  cc.restore();

  let cutY_A = -1;
  if(maskOn && ann.trackMask.points.length >= 2){
    cutY_A = _getMaskYAtX(ann, wheel.cx) * ch - (cy - size/2);
  }

  let cutY_B = -1;
  if(loopOn){
    const _ptInPoly = function(px, py, pts){
      let inside = false;
      for(let i = 0, j = pts.length-1; i < pts.length; j = i++){
        const xi = pts[i].x, yi = pts[i].y, xj = pts[j].x, yj = pts[j].y;
        if(((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) inside = !inside;
      }
      return inside;
    };
    const _polyTopYAtX = function(x, pts){
      let topY = 1e9;
      for(let i = 0; i < pts.length; i++){
        const p1 = pts[i], p2 = pts[(i+1) % pts.length];
        if((p1.x <= x && p2.x >= x) || (p2.x <= x && p1.x >= x)){
          if(p1.x === p2.x) topY = Math.min(topY, p1.y, p2.y);
          else {
            const t = (x - p1.x) / (p2.x - p1.x);
            topY = Math.min(topY, p1.y + t * (p2.y - p1.y));
          }
        }
      }
      return topY === 1e9 ? -1 : topY;
    };
    let inTrack = _ptInPoly(wheel.cx, wheel.cy, ann.trackLoop.points);
    if(!inTrack){
      for(let i = 0; i < 16; i++){
        const ang = (i / 16) * Math.PI * 2;
        const nx = wheel.cx + Math.cos(ang) * wheel.r;
        const ny = wheel.cy + Math.sin(ang) * wheel.r * (cw / ch);
        if(_ptInPoly(nx, ny, ann.trackLoop.points)){ inTrack = true; break; }
      }
    }
    if(inTrack){
      const trackTopY = _polyTopYAtX(wheel.cx, ann.trackLoop.points);
      if(trackTopY >= 0){
        const texH = (_ty1 - _ty0) * ch;
        cutY_B = (trackTopY * ch + texH) - (cy - size/2);
      }
    }
  }

  let finalCutY = -1;
  if(cutY_A !== -1) finalCutY = cutY_A;
  if(cutY_B !== -1) finalCutY = finalCutY === -1 ? cutY_B : Math.max(finalCutY, cutY_B);

  let maxWheelCy = 0, hasWheel = false;
  if(ann.wheels){
    for(let wi = 0; wi < ann.wheels.length; wi++){
      if(ann.wheels[wi].cy > maxWheelCy){ maxWheelCy = ann.wheels[wi].cy; hasWheel = true; }
    }
  }
  if(hasWheel){
    const limitY_local = maxWheelCy * ch - (cy - size/2);
    if(finalCutY > limitY_local) finalCutY = limitY_local;
  }
  if(finalCutY > size / 2) finalCutY = size / 2;

  if(finalCutY > 0.5 && finalCutY < size - 0.5){
    cc.save();
    cc.globalCompositeOperation = "destination-out";
    cc.fillRect(0, 0, size, finalCutY);
    cc.restore();

    const isLargeCut = finalCutY > size / 2;
    if(isLargeCut){
      const fan = document.createElement("canvas"); fan.width = size; fan.height = size;
      const fx = fan.getContext("2d");
      fx.save();
      fx.beginPath();
      fx.moveTo(size/2, size/2);
      fx.arc(size/2, size/2, size/2, Math.PI * 0.25, Math.PI * 0.75);
      fx.closePath(); fx.clip();
      fx.drawImage(img, -(cx - size/2), -(cy - size/2), cw, ch);
      fx.restore();
      cc.save();
      cc.globalCompositeOperation = "destination-over";
      for(let j = 1; j <= 7; j++){
        cc.save();
        cc.translate(size/2, size/2);
        cc.rotate((Math.PI/4) * j);
        cc.translate(-size/2, -size/2);
        cc.drawImage(fan, 0, 0);
        cc.restore();
      }
      cc.restore();
    } else {
      const temp = document.createElement("canvas"); temp.width = size; temp.height = size;
      const tc = temp.getContext("2d"); tc.drawImage(c, 0, 0);
      cc.save();
      cc.globalCompositeOperation = "destination-over";
      const angles = [15,-15,30,-30,45,-45,60,-60,90,-90];
      for(let k = 0; k < angles.length; k++){
        cc.save();
        cc.translate(size/2, size/2);
        cc.rotate(angles[k] * Math.PI / 180);
        cc.translate(-size/2, -size/2);
        cc.drawImage(temp, 0, 0);
        cc.restore();
      }
      cc.restore();
    }
  }

  cc.save();
  cc.globalCompositeOperation = "destination-in";
  cc.beginPath(); cc.arc(size/2, size/2, size/2 - 0.5, 0, Math.PI * 2); cc.fill();
  cc.restore();

  _wheelClipCache.set(key, c);
  if(_wheelClipCache.size > 40) _wheelClipCache.delete(_wheelClipCache.keys().next().value);
  return c;
}

const _maskCache = new Map();
function _getMaskLayer(img, ann, cw, ch){
  if(!ann.trackMask || !ann.trackMask.enabled || ann.trackMask.points.length < 2) return null;
  const key = _getSrcKey(img) + "|" + ann.trackMask.points.map(function(p){ return p.x.toFixed(3) + "," + p.y.toFixed(3); }).join(";") + "|" + cw + "x" + ch;
  if(_maskCache.has(key)) return _maskCache.get(key);
  const c = document.createElement("canvas"); c.width = cw; c.height = ch;
  const cc = c.getContext("2d");
  const pts = ann.trackMask.points.slice().sort(function(a,b){ return a.x - b.x; });
  cc.beginPath();
  cc.moveTo(pts[0].x * cw, 0);
  for(const p of pts) cc.lineTo(p.x * cw, p.y * ch);
  cc.lineTo(pts[pts.length-1].x * cw, 0);
  cc.closePath();
  cc.clip();
  cc.drawImage(img, 0, 0, cw, ch);
  _maskCache.set(key, c);
  if(_maskCache.size > 20) _maskCache.delete(_maskCache.keys().next().value);
  return c;
}

function _drawTrackBand(ctx, img, ann, cw, ch, animTime, vel){
  const sc = ann.trackScroll;
  if(!sc || !sc.enabled) return;
  if(!ann.trackLoop || !ann.trackLoop.points || ann.trackLoop.points.length < 3) return;
  const W = cw, H = ch;
  const rawPts = ann.trackLoop.points.map(function(p){ return { x: p.x * W, y: p.y * H }; });
  const n = rawPts.length;
  let totalLen = 0;
  const segs = [];
  for(let i = 0; i < n; i++){
    const p1 = rawPts[i], p2 = rawPts[(i + 1) % n];
    const dx = p2.x - p1.x, dy = p2.y - p1.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if(len < 0.5) continue;
    segs.push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, ux: dx / len, uy: dy / len, len: len, startLen: totalLen });
    totalLen += len;
  }
  if(totalLen < 1) return;
  let cx = 0, cy = 0;
  for(let i = 0; i < n; i++){ cx += rawPts[i].x; cy += rawPts[i].y; }
  cx /= n; cy /= n;

  let _y0 = sc.textureY0, _y1 = sc.textureY1;
  if(_y0 == null || !isFinite(_y0)) _y0 = 0.6;
  if(_y1 == null || !isFinite(_y1)) _y1 = 1.0;
  let _x0 = Math.max(0, Math.min(1, sc.textureX0));
  let _x1 = Math.max(0, Math.min(1, sc.textureX1));
  if(_x0 > _x1){ const _t = _x0; _x0 = _x1; _x1 = _t; }
  if(_y0 > _y1){ const _t = _y0; _y0 = _y1; _y1 = _t; }

  const imgW = img.naturalWidth || img.width || W;
  const imgH = img.naturalHeight || img.height || H;
  const srcX = _x0 * imgW;
  const srcY = _y0 * imgH;
  const srcTileW = (_x1 - _x0) * imgW;
  const srcTileH = (_y1 - _y0) * imgH;
  const dstTileW = (_x1 - _x0) * W;
  const dstTileH = (_y1 - _y0) * H;
  if(srcTileW < 1 || srcTileH < 1 || dstTileW < 1 || dstTileH < 1) return;

  let _minY = 1, _maxY = 0;
  for(const p of ann.trackLoop.points){
    if(p.y < _minY) _minY = p.y;
    if(p.y > _maxY) _maxY = p.y;
  }
  const limitY = ((_minY + _maxY) / 2) * H;

  function sampleArc(s){
    s = s % totalLen;
    if(s < 0) s += totalLen;
    for(let i = 0; i < segs.length; i++){
      const seg = segs[i];
      if(s >= seg.startLen && s <= seg.startLen + seg.len){
        const t = (s - seg.startLen) / seg.len;
        return { x: seg.x1 + (seg.x2 - seg.x1) * t, y: seg.y1 + (seg.y2 - seg.y1) * t, ux: seg.ux, uy: seg.uy };
      }
    }
    const last = segs[segs.length - 1];
    return { x: last.x2, y: last.y2, ux: last.ux, uy: last.uy };
  }
  function normalToCenter(p){
    let nx = -p.uy, ny = p.ux;
    if(nx * (cx - p.x) + ny * (cy - p.y) < 0){ nx = -nx; ny = -ny; }
    return { nx: nx, ny: ny };
  }

  const dir = sc.direction || -1;
  const ext = 1.5;
  const steps = Math.ceil(totalLen / dstTileW) + 2;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(rawPts[0].x, rawPts[0].y);
  for(let i = 1; i < n; i++) ctx.lineTo(rawPts[i].x, rawPts[i].y);
  ctx.closePath();
  ctx.clip();

  ctx.save();
  ctx.globalCompositeOperation = "destination-out";
  ctx.fillStyle = "#000";
  for(let k = 0; k < steps; k++){
    const s0 = k * dstTileW;
    const a = sampleArc(s0);
    const b = sampleArc(s0 + dstTileW);
    const na = normalToCenter(a);
    const nb = normalToCenter(b);
    ctx.beginPath();
    ctx.moveTo(a.x - a.ux * ext, a.y - a.uy * ext);
    ctx.lineTo(b.x + b.ux * ext, b.y + b.uy * ext);
    ctx.lineTo(b.x + b.ux * ext + nb.nx * dstTileH, b.y + b.uy * ext + nb.ny * dstTileH);
    ctx.lineTo(a.x - a.ux * ext + na.nx * dstTileH, a.y - a.uy * ext + na.ny * dstTileH);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  for(let k = 0; k < steps; k++){
    const s0 = k * dstTileW;
    const a = sampleArc(s0);
    const b = sampleArc(s0 + dstTileW);
    const na = normalToCenter(a);
    const nb = normalToCenter(b);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(a.x - a.ux * ext, a.y - a.uy * ext);
    ctx.lineTo(b.x + b.ux * ext, b.y + b.uy * ext);
    ctx.lineTo(b.x + b.ux * ext + nb.nx * dstTileH, b.y + b.uy * ext + nb.ny * dstTileH);
    ctx.lineTo(a.x - a.ux * ext + na.nx * dstTileH, a.y - a.uy * ext + na.ny * dstTileH);
    ctx.closePath();
    ctx.clip();
    ctx.beginPath();
    ctx.rect(0, 0, W, limitY);
    ctx.clip();
    let mx = (na.nx + nb.nx) / 2, my = (na.ny + nb.ny) / 2;
    const _mlen = Math.hypot(mx, my) || 1;
    mx /= _mlen; my /= _mlen;
    ctx.translate(-mx * dstTileH, -my * dstTileH);
    ctx.drawImage(img, 0, 0, W, H);
    ctx.restore();
  }

  if(sc.useTexture){
    let offset = (animTime * vel * dir) % dstTileW;
    if(offset < 0) offset += dstTileW;
    ctx.globalAlpha = (sc.textureOpacity != null ? sc.textureOpacity : 0.85);
    ctx.globalCompositeOperation = "source-over";
    ctx.imageSmoothingEnabled = true;
    for(let k = 0; k < steps; k++){
      const s0 = offset + k * dstTileW;
      const a = sampleArc(s0);
      const b = sampleArc(s0 + dstTileW);
      const na = normalToCenter(a);
      const nb = normalToCenter(b);
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.lineTo(b.x + nb.nx * dstTileH, b.y + nb.ny * dstTileH);
      ctx.lineTo(a.x + na.nx * dstTileH, a.y + na.ny * dstTileH);
      ctx.closePath();
      ctx.clip();
      ctx.translate(a.x, a.y);
      ctx.transform(a.ux, a.uy, na.nx, na.ny, 0, 0);
      ctx.translate(0, dstTileH);
      ctx.scale(1, -1);
      const det = a.ux * na.ny - a.uy * na.nx;
      if(det < 0){ ctx.scale(-1, 1); ctx.translate(-dstTileW, 0); }
      ctx.drawImage(img, srcX, srcY, srcTileW, srcTileH, 0, 0, dstTileW, dstTileH);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

function _makeDoorClip(img, pts, cw, ch){
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for(const p of pts){
    const px = p.x * cw, py = p.y * ch;
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
  cc.moveTo(pts[0].x * cw - minX, pts[0].y * ch - minY);
  for(let i = 1; i < pts.length; i++) cc.lineTo(pts[i].x * cw - minX, pts[i].y * ch - minY);
  cc.closePath();
  cc.clip();
  cc.drawImage(img, -minX, -minY, cw, ch);
  return { canvas: c, minX: minX, minY: minY, bw: bw, bh: bh };
}

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
    ctx.moveTo(pts[0].x * cw, pts[0].y * ch);
    for(let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x * cw, pts[i].y * ch);
    ctx.closePath();
    ctx.fill();
    ctx.save();
    ctx.clip();
    let _bMnX = Infinity, _bMnY = Infinity, _bMxX = -Infinity, _bMxY = -Infinity;
    for(const p of pts){
      const _px = p.x * cw, _py = p.y * ch;
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

function _drawVehicleContent(ctx, id, cw, ch, animTime, opts){
  opts = opts || {};
  const ann = VEHICLE_ANNOTATIONS[id];
  if(!ann) return;
  const img = _loadVehicleImg(id);
  if(!img.complete || !img.naturalWidth) return;

  const _drawSrc = (opts && opts.baseImage) || img;

  if(ann.doors && ann.doors.fusion && ann.doors.fusion.length > 0){
    const doorOpen = opts.doorOpen || 0;
    for(const d of ann.doors.fusion){
      if(!d.polygon || d.polygon.length < 3) continue;
      const ang = 90 - doorOpen * 0.5;
      const cosA = Math.cos(ang * Math.PI / 180);
      if(Math.abs(cosA) < 0.05) continue;

      const pts = d.polygon;
      const x1 = d.hingeP1.x * cw, y1 = d.hingeP1.y * ch;
      const x2 = d.hingeP2.x * cw, y2 = d.hingeP2.y * ch;
      if(Math.hypot(x2 - x1, y2 - y1) < 0.01) continue;

      const alpha = Math.atan2(y2 - y1, x2 - x1);

      ctx.save();
      ctx.translate(x1, y1);
      ctx.rotate(alpha);
      ctx.scale(1, cosA);
      ctx.rotate(-alpha);
      ctx.translate(-x1, -y1);

      ctx.fillStyle = d.fillColor || "#000000";
      ctx.beginPath();
      ctx.moveTo(pts[0].x * cw, pts[0].y * ch);
      for(let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x * cw, pts[i].y * ch);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = "rgba(180,180,180,0.55)";
      ctx.lineWidth = Math.max(1, cw * 0.0016);
      ctx.stroke();
      ctx.restore();
    }
  }

  const hasTrackLoop = ann.trackLoop && ann.trackLoop.points && ann.trackLoop.points.length >= 3;
  const hasTrackLine = ann.trackLine && ann.trackLine.points && ann.trackLine.points.length >= 2;
  const hasTrackScroll = ann.trackScroll && ann.trackScroll.enabled;

  if(hasTrackLoop && hasTrackScroll){
    ctx.drawImage(_drawSrc, 0, 0, cw, ch);
    const vel = opts.trackVel || 60;
    _drawTrackBand(ctx, _drawSrc, ann, cw, ch, animTime, vel);
  } else if(hasTrackLine && hasTrackScroll){
    ctx.save();
    let _maxY = 0;
    for(const _p of ann.trackLine.points){ if(_p.y > _maxY) _maxY = _p.y; }
    ctx.beginPath();
    ctx.rect(0, 0, cw, _maxY * ch);
    ctx.clip();
    ctx.drawImage(_drawSrc, 0, 0, cw, ch);
    ctx.restore();
    const vel = opts.trackVel || 60;
    _drawTrackBand(ctx, _drawSrc, ann, cw, ch, animTime, vel);
  } else {
    ctx.drawImage(_drawSrc, 0, 0, cw, ch);
  }

  if(ann.wheels && ann.wheels.length){
    for(const wheel of ann.wheels){
      const cx = wheel.cx * cw;
      const cy = wheel.cy * ch;
      const r = wheel.r * cw;
      const clip = _getWheelClip(_drawSrc, ann, wheel, cw, ch);
      if(clip){
        const rot = (wheel.rotSpeed || 1) * animTime * (opts.wheelSpeed || 3);
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rot);
        ctx.drawImage(clip, -r, -r, r * 2, r * 2);
        ctx.restore();
      }
    }
  }

  const maskC = _getMaskLayer(_drawSrc, ann, cw, ch);
  if(maskC) ctx.drawImage(maskC, 0, 0);

  if(ann.doors){
    const doorOpen = opts.doorOpen || 0;
    if(doorOpen > 3){
      const allDoors = [];
      if(ann.doors.lower) for(const d of ann.doors.lower) allDoors.push(d);
      if(ann.doors.upper) for(const d of ann.doors.upper) allDoors.push(d);
      if(ann.doors.hatch) for(const d of ann.doors.hatch) allDoors.push(d);
      ctx.save();
      ctx.fillStyle = "#000000";
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
      for(const d of ann.doors.lower) _renderDoor(ctx, _drawSrc, ann, d, cw, ch, doorOpen * (110 / 180), "#0c0c0c");
    }
    if(ann.doors.upper && ann.doors.upper.length){
      for(const d of ann.doors.upper) _renderDoor(ctx, _drawSrc, ann, d, cw, ch, doorOpen, "#0c0c0c");
    }
    if(ann.doors.hatch && ann.doors.hatch.length){
      for(const d of ann.doors.hatch) _renderDoor(ctx, _drawSrc, ann, d, cw, ch, doorOpen * 0.5, "#0c0c0c");
    }
  }
}

function renderVehicle(ctx, id, x, y, w, h, animTime, opts){
  opts = opts || {};
  const ann = VEHICLE_ANNOTATIONS[id];
  if(!ann) return;
  const img = _loadVehicleImg(id);
  if(!img.complete || !img.naturalWidth) return;
  const cw = w, ch = h;

  const recoils = opts.recoils || {};
  let hasRecoil = false;
  const areas = ann.weaponAreas || [];
  for(const a of areas){
    const wid = a.weaponId || '__default__';
    if(recoils[wid] && recoils[wid] > 0.1){ hasRecoil = true; break; }
  }

  if(!hasRecoil){
    ctx.save();
    ctx.translate(x, y);
    _drawVehicleContent(ctx, id, cw, ch, animTime, opts);
    ctx.restore();
    return;
  }

  if(!window._vehRecoilCache) window._vehRecoilCache = {};
  const cache = window._vehRecoilCache;
  if(!cache.baseC || cache.baseC.width !== cw || cache.baseC.height !== ch){
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
  for(const a of areas){
    const pts = a.polygon;
    if(!pts || pts.length < 3) continue;
    bodyX.beginPath();
    bodyX.moveTo(pts[0].x * cw, pts[0].y * ch);
    for(let i = 1; i < pts.length; i++) bodyX.lineTo(pts[i].x * cw, pts[i].y * ch);
    bodyX.closePath();
    bodyX.fill();
  }
  bodyX.globalCompositeOperation = 'source-over';

  ctx.save();
  ctx.translate(x, y);

  for(const a of areas){
    const wid = a.weaponId || '__default__';
    const rx = recoils[wid] || 0;
    if(rx <= 0.1) continue;
    const pts = a.polygon;
    if(!pts || pts.length < 3) continue;

    wepX.setTransform(1, 0, 0, 1, 0, 0);
    wepX.clearRect(0, 0, cw, ch);
    wepX.drawImage(baseC, -rx, 0);
    wepX.globalCompositeOperation = 'destination-in';
    wepX.beginPath();
    wepX.moveTo(pts[0].x * cw - rx, pts[0].y * ch);
    for(let i = 1; i < pts.length; i++) wepX.lineTo(pts[i].x * cw - rx, pts[i].y * ch);
    wepX.closePath();
    wepX.fill();
    wepX.globalCompositeOperation = 'source-over';

    ctx.drawImage(wepC, 0, 0);
  }

  ctx.drawImage(bodyC, 0, 0);
  ctx.restore();
}

window.VehicleRenderer = { render: renderVehicle };

window.computeVehicleDustSource = function(ann){
  if(!ann) return null;
  if(ann.trackLoop && ann.trackLoop.points && ann.trackLoop.points.length >= 2){
    var pts = ann.trackLoop.points;
    var _dustMaxX = 0, _dustMaxY = 0;
    for(var _di = 0; _di < pts.length; _di++){
      if(pts[_di].x > _dustMaxX) _dustMaxX = pts[_di].x;
      if(pts[_di].y > _dustMaxY) _dustMaxY = pts[_di].y;
    }
    var bottomPts = pts.filter(function(p){ return p.y >= _dustMaxY - 0.15 && p.x <= _dustMaxX * 0.85; });
    if(bottomPts.length > 0){
      var maxY = 0;
      for(var i = 0; i < bottomPts.length; i++){ if(bottomPts[i].y > maxY) maxY = bottomPts[i].y; }
      var bottomLine = bottomPts.filter(function(p){ return Math.abs(p.y - maxY) < 0.05; });
      if(bottomLine.length >= 2){
        var p1 = bottomLine[0], p2 = bottomLine[bottomLine.length - 1];
        var t = Math.random();
        return { cx: p1.x + (p2.x - p1.x) * t, cy: p1.y + (p2.y - p1.y) * t, r: 0.015 };
      }
      var srcPt = bottomPts[Math.floor(Math.random() * bottomPts.length)];
      return { cx: srcPt.x, cy: srcPt.y, r: 0.015 };
    }
  }
  if(ann.wheels && ann.wheels.length > 0){
    var _wArr = ann.wheels.filter(function(w){ return w.cx < 0.95; });
    if(_wArr.length > 0){ return _wArr[Math.floor(Math.random() * _wArr.length)]; }
  }
  return null;
};

window.spawnDust = function(particles, px, py, wheel, targetW, targetH, wheelSpd){
  const mult = (wheelSpd === 20) ? 1.5 : 1.0;
  const baseVx = -(5.0 + Math.random() * 4.0) * mult;
  const baseVy = -(1.5 + Math.random() * 2.0) * mult;
  particles.push({
    x: px + wheel.cx * targetW + (Math.random() - 0.5) * wheel.r * targetW * 0.5,
    y: py + wheel.cy * targetH + wheel.r * targetW,
    vx: baseVx, vy: baseVy, life: 1,
    size: (6 + Math.random() * 10) * (wheelSpd === 20 ? 2.0 : 1.5),
    hue: 28 + Math.random() * 18
  });
};
window.updateAndDrawDust = function(ctx, particles, dt){
  const step = dt * 60;
  for(let i = particles.length - 1; i >= 0; i--){
    const p = particles[i];
    p.x += p.vx * step;
    p.y += p.vy * step;
    p.vy += 0.08 * step;
    p.vx *= Math.pow(0.97, step);
    p.life -= 0.016 * step;
    if(p.life <= 0){ particles.splice(i, 1); continue; }
    const radius = p.size * (1.5 - p.life * 0.45);
    const _alpha = Math.max(0, p.life) * 0.65;
    const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius);
    grad.addColorStop(0, 'hsla(' + p.hue + ', 35%, 48%, ' + _alpha + ')');
    grad.addColorStop(1, 'hsla(' + p.hue + ', 35%, 48%, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(p.x, p.y, radius, 0, Math.PI * 2); ctx.fill();
  }
};

const BTR_TIMELINE = {
  enterDur: 2.5, arriveDur: 1.8, sinkDur: 1.5, centerDur: 1.0,
  supportDur: 30, liftDur: 1.5, exitDur: 2.0, leaveDur: 3.5
};
const PHASE_ORDER = ['enter', 'arrive', 'sink', 'center', 'support', 'lift', 'exit', 'leave'];

const MUZZLE_PROFILES = {
  kpvt:    { burst: 5,  intervalMs: 100,   pauseMs: 300,   flashSize: 26, flashColor: '255,200,80',  bulletSize: 3.5, bulletSpeed: 450, projectileType: 'bullet' },
  pkt:     { burst: 5,  intervalMs: 80,    pauseMs: 300,   flashSize: 22, flashColor: '255,220,120', bulletSize: 3,   bulletSpeed: 480, projectileType: 'bullet' },
  nsvt:    { burst: 5,  intervalMs: 80,    pauseMs: 300,   flashSize: 24, flashColor: '255,220,120', bulletSize: 3.5, bulletSpeed: 470, projectileType: 'bullet' },
  '2a72':  { burst: 8, intervalMs: 300,   pauseMs: 600,   flashSize: 32, flashColor: '255,180,60',  bulletSize: 4.5, bulletSpeed: 380, projectileType: 'bullet' },
  '2a42':  { burst: 8, intervalMs: 150,   pauseMs: 600,   flashSize: 34, flashColor: '255,180,60',  bulletSize: 4.5, bulletSpeed: 400, projectileType: 'bullet' },
  '2a72_fast': { burst: 8, intervalMs: 150, pauseMs: 600, flashSize: 32, flashColor: '255,180,60', bulletSize: 4.5, bulletSpeed: 380, projectileType: 'bullet' },
  '2a46':  { burst: 1,  intervalMs: 2500,  pauseMs: 1500,  flashSize: 40, flashColor: '255,140,60',  bulletSize: 6,   bulletSpeed: 300, projectileType: 'bullet' },
  '2a46m1':{ burst: 1,  intervalMs: 2500,  pauseMs: 1500,  flashSize: 40, flashColor: '255,140,60',  bulletSize: 6,   bulletSpeed: 300, projectileType: 'bullet' },
  atgm:    { burst: 1,  intervalMs: 20000, pauseMs: 20000, flashSize: 30, flashColor: '255,200,100', bulletSize: 5,   bulletSpeed: 280, projectileType: 'missile' },
  '2a28':  { burst: 1,  intervalMs: 2500,  pauseMs: 1500,  flashSize: 36, flashColor: '255,150,60',  bulletSize: 5.5, bulletSpeed: 320, projectileType: 'bullet' },
  '2a70':  { burst: 1,  intervalMs: 2500,  pauseMs: 1500,  flashSize: 38, flashColor: '255,145,60',  bulletSize: 5.5, bulletSpeed: 310, projectileType: 'bullet' },
  default: { burst: 3,  intervalMs: 100,   pauseMs: 300,   flashSize: 22, flashColor: '255,200,80',  bulletSize: 3.5, bulletSpeed: 450, projectileType: 'bullet' }
};

const BTRSupport = {
  active: false, vehicleId: 'btr80', startTime: 0,
  phase: 'enter', phaseT: 0, x: -1.5, yOffset: 0,
  doorX: -0.735, centerPX: -0.525, doorOffsetRatio: 0.48,
  targetH: 0, targetW: 0, sinkOffset: 0, canvas: null, ctx: null,
  width: 0, height: 0, dpr: 1, raf: null,
  kills: {}, loot: [], killCount: 0, lastTickSec: -1,
  muzzles: [], fireFx: [], dustParticles: [], recoilStates: {},
  playerClipH: 1.0, playerXOffset: 0, doorOpen: 0, shakeX: 0, shakeY: 0, _finished: false,

  fx: {
    smoke: [], tracers: [],
    spawnJetOne(x, y, weaponId){ return; },
    spawnSpreadOne(x, y, weaponId){ return; },
    spawnMG(x, y, layerOrder){
      const _base = this.targetW || 300;
      this.smoke.push({
        x: x, y: y,
        vx: 0, vy: -_base * 0.2 - Math.random() * _base * 0.1,
        life: 1, rate: 1 / 1.5,
        sizeX: _base * 0.02, sizeY: _base * 0.02,
        growX: _base * 0.1, growY: _base * 0.1,
        alpha0: 0.3, isJet: false, isCore: false,
        friction: 0.96,
        angle: Math.random() * 6.28, spin: (Math.random() - 0.5) * 1,
        worldFactor: 1.0, _layerOrder: layerOrder || 'above'
      });
    },
    spawnTracer(x, y, speed, type, layerOrder, angleDeg){
      this.tracers.push({
        startX: x, startY: y, born: performance.now(),
        speed: speed,
        len: type === 'cannon' ? 80 : 40,
        width: type === 'cannon' ? 3 : 1.5,
        type: type,
        _layerOrder: layerOrder || 'above',
        _ang: (angleDeg || 0) * Math.PI / 180
      });
    },
    spawnMissileJet(x, y){
      this.smoke.push({
        x: x - 15, y: y,
        vx: -100, vy: (Math.random() - 0.5) * 6,
        life: 1, rate: 1 / 0.15,
        sizeX: 20, sizeY: 8,
        growX: 0, growY: 0,
        alpha0: 0.95, isJet: true, isCore: true,
        friction: 0.8,
        angle: 0, spin: 0, worldFactor: 0.5,
        skipUpdate: true
      });
    },
    spawnMissileSpread(x, y){
      this.smoke.push({
        x: x - 20 + (Math.random() - 0.5) * 20,
        y: y + (Math.random() - 0.5) * 10,
        vx: -50 + Math.random() * 20,
        vy: (Math.random() - 0.5) * 20,
        life: 1, rate: 1 / (2.0 + Math.random() * 1.0),
        sizeX: 15, sizeY: 15,
        growX: 30, growY: 30,
        alpha0: 0.35, isJet: false, isCore: false,
        friction: 0.95,
        angle: Math.random() * 6.28, spin: (Math.random() - 0.5) * 0.5,
        worldFactor: 1.5,
        skipUpdate: true
      });
    },
    update(now, dt, worldSpeed){ window._vsUpdateSmoke(this.smoke, dt, worldSpeed); },
    draw(ctx){ window._vsDrawSmoke(ctx, this.smoke); },
    drawTracers(ctx, now, layerOrder){
      if(!this.tracers || !this.tracers.length) return;
      ctx.save();
      ctx.shadowColor = 'rgba(255,200,50,0.8)';
      ctx.shadowBlur = 10;
      for(let i = this.tracers.length - 1; i >= 0; i--){
        const t = this.tracers[i];
        const _c = Math.cos(t._ang || 0), _s = Math.sin(t._ang || 0);
        const _dist = (now - t.born) / 1000 * t.speed;
        const tipX = t.startX + _c * _dist;
        const tipY = t.startY + _s * _dist;
        if(tipX - t.len > ctx.canvas.width + 200){ this.tracers.splice(i, 1); continue; }
        if(layerOrder && (t._layerOrder || 'above') !== layerOrder) continue;
        ctx.save();
        window._vsClipAtMuzzle(ctx, t.startX, t.startY, t._ang || 0);
        const tailX = tipX - _c * t.len;
        const tailY = tipY - _s * t.len;
        const grad = ctx.createLinearGradient(tailX, tailY, tipX, tipY);
        grad.addColorStop(0, 'rgba(255,200,50,0)');
        grad.addColorStop(0.8, 'rgba(255,255,200,0.9)');
        grad.addColorStop(1, '#fff');
        ctx.strokeStyle = grad;
        ctx.lineWidth = t.width;
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(tipX, tipY);
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
    }
  },

  start(vid){
    if(this.active) return;
    this.vehicleId = vid || 'btr80';
    if(!VEHICLE_ANNOTATIONS[this.vehicleId]) this.vehicleId = 'btr80';
    if(typeof VEHICLES !== 'undefined' && VEHICLES[this.vehicleId] && VEHICLES[this.vehicleId].supportDuration) BTR_TIMELINE.supportDur = VEHICLES[this.vehicleId].supportDuration;
    else BTR_TIMELINE.supportDur = 30;
    this.active = true;
    this.startTime = performance.now();
    this.phase = 'enter';
    this.phaseT = 0;
    this.yOffset = 0; this.doorOpen = 0; this.shakeX = 0; this.shakeY = 0; this.sinkOffset = 0;
    this.kills = {}; this.loot = []; this.killCount = 0; this.lastTickSec = -1;
    this.fireFx = []; this.dustParticles = []; this.fx.smoke = []; this.fx.tracers = [];
    this.recoilStates = {}; this.missiles = []; this.erasedMissilePolys = []; this.erasedBaseImg = null;
    this.playerClipH = 1.0; this.playerXOffset = 0; this._finished = false;
    this._setupCanvas();
    this._setupMuzzles();
    const self = this;
    this.raf = requestAnimationFrame(function(t){ self._loop(t); });
  },

  _setupMuzzles(){
    const ann = VEHICLE_ANNOTATIONS[this.vehicleId];
    this.muzzles = [];
    if(!ann || !ann.muzzles) return;
    let mainWid = null;
    for(const mm of ann.muzzles){
      if(mm.weaponId === '2a70'){ mainWid = mm.weaponId; break; }
    }
    for(const m of ann.muzzles){
      let pid = null;
      if((m.weaponId === '2a72' || m.weaponId === '2a42') && mainWid) pid = mainWid;
      const _sg = (m.weaponId === 'atgm' || m.weaponId === 'nsvt') ? null : 'main';
      const _profileKey = (m.weaponId === '2a72' && !pid) ? '2a72_fast' : m.weaponId;
      const _prof = MUZZLE_PROFILES[_profileKey] || MUZZLE_PROFILES.default;
      this.muzzles.push({
        weaponId: m.weaponId,
        mx: m.x, my: m.y,
        angle: m.angle,
        layerOrder: m.layerOrder || 'above',
        _parentId: pid,
        _syncGroup: _sg,
        profile: _prof,
        shotsLeft: _prof.burst,
        nextFireAt: 0, lastFireAt: 0
      });
    }
    window._btrSyncTargets = {};
  },

  _setupCanvas(){
    const zone = document.getElementById('zone1');
    if(!zone) return;
    let c = document.getElementById('btr-support-canvas');
    if(!c){
      c = document.createElement('canvas');
      c.id = 'btr-support-canvas';
      zone.appendChild(c);
    }
    this.canvas = c;
    const dpr = window.devicePixelRatio || 1;
    const w = zone.clientWidth, h = zone.clientHeight;
    c.width = Math.floor(w * dpr);
    c.height = Math.floor(h * dpr);
    c.style.width = w + 'px';
    c.style.height = h + 'px';
    this.ctx = c.getContext('2d');
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.width = w; this.height = h; this.dpr = dpr;
    const ann = VEHICLE_ANNOTATIONS[this.vehicleId];
    if(ann){
      let _contentMinY = 0, _contentMaxY = 1, _contentH = 1.0, _contentMaxX = 1.0;
      try {
        const _m = _loadVehicleImg(this.vehicleId);
        if(_m && _m.complete && _m.naturalWidth && typeof _measureImgContentBounds === 'function'){
          const _b = _measureImgContentBounds(_m);
          if(_b){ _contentMinY = _b.minY; _contentMaxY = _b.maxY; _contentH = _b.maxY - _b.minY; _contentMaxX = _b.maxX; }
        }
      } catch(_e){}
      if(!isFinite(_contentH) || _contentH < 0.1){ _contentH = 1.0; _contentMinY = 0; _contentMaxY = 1; }
      this._contentMinYRatio = _contentMinY;
      this._contentBottomRatio = _contentMaxY;
      this._contentH = _contentH;
      const _realH = (typeof VEHICLE_REAL_HEIGHTS !== 'undefined' && VEHICLE_REAL_HEIGHTS[this.vehicleId]) || 2.5;
      this.targetH = h * 0.6735 * (_realH / 1.7);
      this.targetW = this.targetH * (ann.imageSize.w / ann.imageSize.h);
      const playerCenterX = w * (typeof EXPLORE_HERO_X_RATIO === 'number' ? EXPLORE_HERO_X_RATIO : 0.25);
      let _doorCenterRatio = 0.48;
      if(ann.doors){
        let _sumX = 0, _sumN = 0;
        if(ann.doors.upper){ for(const _d of ann.doors.upper){ if(_d.polygon){ for(const _p of _d.polygon){ _sumX += _p.x; _sumN++; } } } }
        if(ann.doors.lower){ for(const _d of ann.doors.lower){ if(_d.polygon){ for(const _p of _d.polygon){ _sumX += _p.x; _sumN++; } } } }
        if(ann.doors.hatch){ for(const _d of ann.doors.hatch){ if(_d.polygon){ for(const _p of _d.polygon){ _sumX += _p.x; _sumN++; } } } }
        if(_sumN > 0) _doorCenterRatio = _sumX / _sumN;
      }
      this.doorOffsetRatio = _doorCenterRatio;
      this.doorX = (playerCenterX - this.doorOffsetRatio * this.targetW) / w;
      let maxMuzzleX = 0;
      if(ann.muzzles){ for(const m of ann.muzzles){ if(m.x > maxMuzzleX) maxMuzzleX = m.x; } }
      const targetMuzzleRatio = 0.9;
      const maxAllowedLeft = w * targetMuzzleRatio - 12 - maxMuzzleX * this.targetW;
      const leftPx = Math.min(w/2 - this.targetW/2, maxAllowedLeft);
      this.centerPX = leftPx / w;
      const groundY = h * 0.95;
      const py0 = groundY - (this._contentBottomRatio || 1) * this.targetH;
      this.sinkOffset = py0 < 4 ? (4 - py0) : 0;
    }
  },

  _loop(t){
    if(!this.active) return;
    const now = performance.now();
    const el = (now - this.startTime) / 1000;
    this._update(el, now);
    this._render(now);
    if(this.active){
      const self = this;
      this.raf = requestAnimationFrame(function(t){ self._loop(t); });
    }
  },

  _easeInOut(p){ return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; },

  _update(t, now){
    if(this.phase === 'wreckPause'){
      const _elapsed = now - this.wreckPauseStart;
      if(_elapsed < 500){
        const _yT = _elapsed / 500;
        this.yOffset = (this._wreckStartYOffset || 0) * (1 - _yT);
      } else {
        this.yOffset = 0;
      }
      if(_elapsed >= 500){
        this.playerClipH = Math.min(1, (_elapsed - 500) / 300);
      }
      if(!this._wreckDisembarked && _elapsed >= 800){
        this._wreckDisembarked = true;
        if(typeof _disembark === 'function'){ try { _disembark(); } catch(e){ console.warn('[wreck disembark]', e); } }
      }
      if(_elapsed >= this.wreckPauseDuration){
        this.phase = 'wreck';
        this.wreckStartTime = performance.now();
        this._wreckStartClipAt = performance.now();
        this._lastWreckTick = performance.now();
        if(window._explore){ window._explore._currentSpeed = _getPlayerWalkSpeed(); }
      }
      return;
    }
    if(this.active && this.phase === 'support' && window._explore && window._explore._lootingUntil > 0){
      window._explore._lootingUntil = 0;
      window._explore._corpseLootTriggered = false;
      if(window._explore._pendingLootEvent) window._explore._pendingLootEvent = null;
    }
    if(this.phase === 'wreck'){
      this._updateWreck(t, now);
      return;
    }
    let acc = 0, curPhase = null, phaseT = 0;
    for(const p of PHASE_ORDER){
      if(t < acc + BTR_TIMELINE[p + 'Dur']){ curPhase = p; phaseT = t - acc; break; }
      acc += BTR_TIMELINE[p + 'Dur'];
    }
    if(!curPhase){ curPhase = 'leave'; phaseT = t - (acc - BTR_TIMELINE.leaveDur); }
    if(curPhase !== this.phase){ this._onPhaseEnter(curPhase); }
    this.phase = curPhase;
    this.phaseT = phaseT;
    if(curPhase === 'enter'){
      const p = phaseT / BTR_TIMELINE.enterDur;
      this.x = -1.5 + this._easeInOut(Math.min(1, p)) * (this.doorX - (-1.5));
      this.doorOpen = 0;
      this.yOffset = 0;
      this.playerClipH = 1.0;
      this.playerXOffset = 0;
    } else if(curPhase === 'arrive'){
      this.x = this.doorX;
      const p = Math.min(1, phaseT / BTR_TIMELINE.arriveDur);
      if(p < 0.25) this.doorOpen = p / 0.25;
      else if(p < 0.75) this.doorOpen = 1;
      else this.doorOpen = 1 - (p - 0.75) / 0.25;
      if(p < 0.15) this.playerClipH = 1.0;
      else if(p < 0.65) this.playerClipH = 1 - (p - 0.15) / 0.5;
      else this.playerClipH = 0;
      this.playerXOffset = 0.03 * Math.min(1, p / 0.4);
    } else if(curPhase === 'sink'){
      this.x = this.doorX;
      this.doorOpen = 0;
      const p = Math.min(1, phaseT / BTR_TIMELINE.sinkDur);
      this.yOffset = this._easeInOut(p) * this.sinkOffset;
    } else if(curPhase === 'center'){
      const p = Math.min(1, phaseT / BTR_TIMELINE.centerDur);
      this.x = this.doorX + this._easeInOut(p) * (this.centerPX - this.doorX);
      this.doorOpen = 0;
      this.yOffset = this.sinkOffset;
    } else if(curPhase === 'support'){
      this.x = this.centerPX;
      this.doorOpen = 0;
      this.yOffset = this.sinkOffset;
      this._updateSupport(phaseT, now);
    } else if(curPhase === 'lift'){
      const p = Math.min(1, phaseT / BTR_TIMELINE.liftDur);
      this.x = this.centerPX + this._easeInOut(p) * (this.doorX - this.centerPX);
      this.yOffset = (1 - this._easeInOut(p)) * this.sinkOffset;
      this.doorOpen = 0;
    } else if(curPhase === 'exit'){
      this.x = this.doorX;
      const p = Math.min(1, phaseT / BTR_TIMELINE.exitDur);
      if(p < 0.25) this.doorOpen = p / 0.25;
      else if(p < 0.75) this.doorOpen = 1;
      else this.doorOpen = 1 - (p - 0.75) / 0.25;
      if(p < 0.15) this.playerClipH = 0;
      else if(p < 0.65) this.playerClipH = (p - 0.15) / 0.5;
      else this.playerClipH = 1.0;
      this.playerXOffset = 0.03 * Math.max(0, 1 - p / 0.6);
    } else if(curPhase === 'leave'){
      const p = Math.min(1, phaseT / BTR_TIMELINE.leaveDur);
      this.x = this.doorX + p * (1.5 - this.doorX);
      this.doorOpen = 0;
      if(p >= 1 && !this._finished){
        this._finished = true;
        try { this._finishSupportAndLog(); } catch(e){}
        finally { this._cleanup(); this.active = false; }
      }
    }
  },

  enterWreckMode(){
    if(this.phase === 'wreck' || this.phase === 'wreckPause') return;
    this.phase = 'wreckPause';
    this.wreckPauseStart = performance.now();
    this.wreckPauseDuration = 2000;
    this._wreckDisembarked = false;
    this._wreckStartYOffset = this.yOffset || 0;
    this.playerClipH = 0;
    this.shakeX = 0;
    this.shakeY = 0;
    for(let i = 0; i < this.muzzles.length; i++){
      this.muzzles[i].nextFireAt = Infinity;
    }
    if(window._explore){ window._explore._currentSpeed = 0; }
  },

  enterFastLeave(){
    if(this.phase === 'wreck' || this.phase === 'wreckPause' || this.phase === 'lift' || this.phase === 'exit' || this.phase === 'leave') return;
    const acc = BTR_TIMELINE.enterDur + BTR_TIMELINE.arriveDur + BTR_TIMELINE.sinkDur + BTR_TIMELINE.centerDur + BTR_TIMELINE.supportDur;
    this.startTime = performance.now() - acc * 1000;
    this.phase = 'support';
    this.phaseT = 0;
    for(let i = 0; i < this.muzzles.length; i++){
      this.muzzles[i].nextFireAt = Infinity;
    }
  },

  enterFastLeave(){
    if(this.phase === 'wreck' || this.phase === 'wreckPause' || this.phase === 'lift' || this.phase === 'exit' || this.phase === 'leave') return;
    const acc = BTR_TIMELINE.enterDur + BTR_TIMELINE.arriveDur + BTR_TIMELINE.sinkDur + BTR_TIMELINE.centerDur + BTR_TIMELINE.supportDur;
    this.startTime = performance.now() - acc * 1000;
    this.phase = 'support';
    this.phaseT = 0;
    for(let i = 0; i < this.muzzles.length; i++){
      this.muzzles[i].nextFireAt = Infinity;
    }
  },

  _updateWreck(t, now){
    const _clipDur = 600;
    const _clipElapsed = now - this._wreckStartClipAt;
    if(_clipElapsed < _clipDur){
      this.playerClipH = _clipElapsed / _clipDur;
    } else {
      this.playerClipH = 1;
    }
    const _dt = Math.min(0.05, (now - (this._lastWreckTick || now)) / 1000);
    this._lastWreckTick = now;
    const _ex = window._explore;
    if(_ex && this.width > 0){
      const _spd = _ex._currentSpeed || 0;
      const _sm = computeScreenMetrics(this.width, this.height);
      const _ppm = _sm.bgPixelsPerMeter;
      const _dxPx = _spd * _dt * _ppm;
      this.x -= _dxPx / this.width;
    }
    if(this.x < -1.5){
      this._finishWreck();
    }
  },

  _finishWreck(){
    if(!this.active) return;
    try { this._finishSupportAndLog(); } catch(e){}
    this._cleanup();
    this.active = false;
  },

  _onPhaseEnter(phase){
    if(phase === 'support'){
      this.lastTickSec = -1;
      if(typeof window._exploreSetVehicleMode === 'function') window._exploreSetVehicleMode(true);
    } else if(phase === 'lift'){
      /* v28: BTR 结束直接清 ex，不依赖 _forceEndVehicleCombat */
      if(window._explore){
        if(window._explore.mode === 'combat' || window._explore.mode === 'vehicle'){
          window._explore.mode = 'walk';
        }
        window._explore.combatEvent = null;
        window._explore._pendingLootEvent = null;
      }
      if(typeof window._combatCleanup === 'function'){
        try{ window._combatCleanup(); }catch(e){}
      }
      if(typeof window._forceEndVehicleCombat === 'function'){
        try{ window._forceEndVehicleCombat(); }catch(e){}
      }
      /* v26: 强制结束载具战并清理 ex.mode / ex.combatEvent */
      if(typeof window._forceEndVehicleCombat === 'function'){
        try{ window._forceEndVehicleCombat(); }catch(e){ console.warn('[lift forceEnd]', e); }
      } else {
        if(typeof window._exploreSetVehicleMode === 'function') window._exploreSetVehicleMode(false);
        if(typeof window._combatCleanup === 'function') window._combatCleanup();
      }
    }
  },

  _updateSupport(phaseT, now){
    this.shakeX = Math.sin(now / 40) * 1.5;
    this.shakeY = Math.cos(now / 55) * 1.2;
    const _ready = [];
    for(const m of this.muzzles){
      if(now >= m.nextFireAt) _ready.push(m);
    }
    if(!_ready.length) return;

    const _p = window._combat && window._combat.allies[0];
    let _mainTarget = null;
    for(const m of _ready){
      if(m._syncGroup === 'main'){
        m._preselectedTarget = (typeof window._pickBTRTarget === 'function') ? window._pickBTRTarget(m.weaponId, 'main') : null;
        if(m._preselectedTarget && !_mainTarget) _mainTarget = m._preselectedTarget;
      }
    }
    for(const m of _ready){
      if(m._syncGroup === 'main'){
        if(_mainTarget && m._preselectedTarget !== _mainTarget){
          if(_p){
            const _rM = (typeof VEHICLE_RANGE_M !== 'undefined' && VEHICLE_RANGE_M[m.weaponId]) || 300;
            if(Math.abs(_mainTarget.worldX - _p.worldX) <= _rM) m._preselectedTarget = _mainTarget;
          }
        }
      } else {
        if(_mainTarget && _p){
          const _r = (typeof VEHICLE_RANGE_M !== 'undefined' && VEHICLE_RANGE_M[m.weaponId]) || 300;
          if(Math.abs(_mainTarget.worldX - _p.worldX) <= _r){
            m._preselectedTarget = _mainTarget;
            continue;
          }
        }
        m._preselectedTarget = (typeof window._pickBTRTarget === 'function') ? window._pickBTRTarget(m.weaponId, m._syncGroup) : null;
      }
    }
    for(const m of _ready){
      this._fireMuzzle(m, now);
    }
  },

  _fireMuzzle(m, now){
    if(typeof window._vehicleWeaponsDead === 'function' && window._vehicleWeaponsDead()){
      m.nextFireAt = now + 500;
      m._preselectedTarget = null;
      return;
    }
    const _g = (typeof _garageInitState === 'function') ? _garageInitState() : null;
    const _vid = _g ? _g.currentVehicle : 'btr80';
    const _ammo = state.vehicleAmmo && state.vehicleAmmo[_vid] && state.vehicleAmmo[_vid][m.weaponId];
    if(!_ammo || _ammo.current <= 0){
      m.shotsLeft = m.profile.burst;
      m._preselectedTarget = null;
      m.nextFireAt = now + 300;
      return;
    }
    const _isAtgm = (m.weaponId === 'atgm');
    const _inBurst = m.shotsLeft < m.profile.burst;
    const _fired = (typeof window._onBTRFire === 'function')
      ? window._onBTRFire(m.weaponId, now, m._syncGroup, m._preselectedTarget)
      : true;
    m._preselectedTarget = null;
    if(!_fired && !_inBurst){
      if(_isAtgm && (m.lastFireAt || 0) === 0){
        m.nextFireAt = now + 500;
      } else {
        m.nextFireAt = now + m.profile.pauseMs;
      }
      return;
    }
    if(!_fired && _inBurst){
      const _amX = state.vehicleAmmo[_vid][m.weaponId];
      if(_amX){
        if(_amX.breakdown){
          for(const _bkX in _amX.breakdown){
            if((_amX.breakdown[_bkX] || 0) > 0){
              _amX.breakdown[_bkX]--;
              _amX.current = Math.max(0, (_amX.current || 0) - 1);
              break;
            }
          }
        } else {
          _amX.current = Math.max(0, (_amX.current || 0) - 1);
        }
      }
    }
    m.lastFireAt = now;
    const ann = VEHICLE_ANNOTATIONS[this.vehicleId];
    const basePx = this.x * this.width + (this.shakeX || 0);
    const basePy = this.height * 0.95 - (this._contentBottomRatio || 1) * this.targetH + this.yOffset + (this.shakeY || 0);
    const isMG = (m.weaponId === 'pkt' || m.weaponId === 'nsvt' || m.weaponId === 'kpvt');
    const isATGM = _isAtgm;
    const isMain = (m.weaponId === '2a46' || m.weaponId === '2a46m1' || m.weaponId === '2a28' || m.weaponId === '2a70');
    let parentRc = 0;
    if(m._parentId && this.recoilStates[m._parentId]){
      const prs = this.recoilStates[m._parentId];
      const pt = now - prs.startTime;
      if(pt >= 0 && pt <= prs.duration){
        const pp = Math.min(1, pt / prs.duration);
        const pRcP = pp < 0.08 ? pp / 0.08 : Math.pow(1 - (pp - 0.08) / 0.92, 2.4);
        parentRc = prs.dist * this.targetW * pRcP;
      }
    }
    const muzzleX = basePx + m.mx * this.targetW - parentRc;
    const muzzleY = basePy + m.my * this.targetH;

    if(isMG) this.fx.spawnMG(muzzleX, muzzleY, m.layerOrder);

    if(!isATGM){
      let showTracer = false;
      const _shotIdx = m.profile.burst - m.shotsLeft + 1;
      if(isMain) showTracer = Math.random() < 0.5;
      else if(isMG) showTracer = (_shotIdx % 5 === 0);
      else showTracer = (_shotIdx % 4 === 0);
      if(showTracer){
        let _trAng = 0;
        if(typeof m.angle === 'number') _trAng = m.angle;
        else if(window.MUZZLE_ANGLES && window.MUZZLE_ANGLES[m.weaponId]) _trAng = window.MUZZLE_ANGLES[m.weaponId];
        this.fx.spawnTracer(muzzleX, muzzleY, isMG ? 800 : 1200, isMG ? 'mg' : 'cannon', m.layerOrder, _trAng);
      }
    }

    let triggerFlash = false;
    if(isMain) triggerFlash = true;
    else if(isMG) triggerFlash = Math.random() < 0.05;
    else if(isATGM) triggerFlash = true;
    else triggerFlash = (m.shotsLeft === m.profile.burst) ? Math.random() < 0.3 : Math.random() < 0.05;

    this.fireFx.push({
      mx: m.mx, my: m.my,
      spawnX: muzzleX, spawnY: muzzleY,
      startTime: now, endTime: now + 600,
      size: m.profile.flashSize,
      layerOrder: m.layerOrder || 'above',
      weaponId: m.weaponId,
      triggerFlash: triggerFlash
    });

    m.shotsLeft--;
    if(m.shotsLeft <= 0){ m.shotsLeft = m.profile.burst; m.nextFireAt = now + m.profile.pauseMs; }
    else { m.nextFireAt = now + m.profile.intervalMs; }

    if(!this.recoilStates) this.recoilStates = {};
    let rcDist = 0, rcDur = 500;
    let foundDist = false;
    if(ann && ann.weaponAreas){
      for(const area of ann.weaponAreas){
        if(area.weaponId === m.weaponId && typeof area.recoilDist === 'number'){ rcDist = area.recoilDist; foundDist = true; break; }
      }
    }
    if(!foundDist){
      if(m.weaponId === '2a46' || m.weaponId === '2a46m1') rcDist = 0.10;
      else if(m.weaponId === '2a28') rcDist = 0.055;
      else if(m.weaponId === '2a70') rcDist = 0.085;
      else if(m.weaponId === 'atgm') rcDist = 0.040;
    }
    if(!foundDist && (m.weaponId === '2a72' || m.weaponId === '2a42')) rcDist = m._parentId ? 0 : 0.015;
    if(m.weaponId === '2a46' || m.weaponId === '2a46m1' || m.weaponId === '2a70' || m.weaponId === '2a28') rcDur = 900;
    else if(m.weaponId === 'atgm') rcDur = 600;
    this.recoilStates[m.weaponId] = {
      startTime: now, duration: rcDur, dist: rcDist,
      _smokeActive: !isMG && !isATGM,
      _lastJetTime: now, _lastSpreadTime: now,
      _staticMuzzleX: muzzleX, _muzzleY: muzzleY,
      _isMain: isMain
    };

    if(isATGM){
      if(!this.erasedMissileImgs) this.erasedMissileImgs = [];
      const _ann49 = VEHICLE_ANNOTATIONS[this.vehicleId];
      let _pushed49 = false;
      if(_ann49 && _ann49.missiles && _ann49.missiles.length){
        for(let _mi49 = 0; _mi49 < _ann49.missiles.length; _mi49++){
          const _mis49 = _ann49.missiles[_mi49];
          if(_mis49.weaponId !== 'atgm' || !_mis49.polygon || _mis49.polygon.length < 3) continue;
          let _ex49 = -1;
          for(let _ei49 = 0; _ei49 < this.erasedMissilePolys.length; _ei49++){
            if(this.erasedMissilePolys[_ei49] === _mis49.polygon){ _ex49 = _ei49; break; }
          }
          if(_ex49 < 0){
            this.erasedMissilePolys.push(_mis49.polygon);
            this.erasedBaseImg = null;
            _ex49 = this.erasedMissilePolys.length - 1;
          }
          if(!this.erasedMissileImgs[_ex49] || !this.erasedMissileImgs[_ex49].canvas){
            const _img49 = _loadVehicleImg(this.vehicleId);
            if(_img49 && _img49.complete && _img49.naturalWidth){
              const _nw49 = _img49.naturalWidth, _nh49 = _img49.naturalHeight;
              const _poly49 = _mis49.polygon;
              let _mnX49 = 1, _mxX49 = 0, _mnY49 = 1, _mxY49 = 0;
              for(let _pi49 = 0; _pi49 < _poly49.length; _pi49++){
                const _pt49 = _poly49[_pi49];
                if(_pt49.x < _mnX49) _mnX49 = _pt49.x;
                if(_pt49.x > _mxX49) _mxX49 = _pt49.x;
                if(_pt49.y < _mnY49) _mnY49 = _pt49.y;
                if(_pt49.y > _mxY49) _mxY49 = _pt49.y;
              }
              const _tc49 = document.createElement('canvas');
              _tc49.width = _nw49; _tc49.height = _nh49;
              const _tcx49 = _tc49.getContext('2d');
              _tcx49.drawImage(_img49, 0, 0);
              _tcx49.globalCompositeOperation = 'destination-in';
              _tcx49.beginPath();
              _tcx49.moveTo(_poly49[0].x * _nw49, _poly49[0].y * _nh49);
              for(let _pj49 = 1; _pj49 < _poly49.length; _pj49++) _tcx49.lineTo(_poly49[_pj49].x * _nw49, _poly49[_pj49].y * _nh49);
              _tcx49.closePath(); _tcx49.fill();
              this.erasedMissileImgs[_ex49] = {
                canvas: _tc49, imgW: _nw49, imgH: _nh49,
                box: { minX: _mnX49, maxX: _mxX49, minY: _mnY49, maxY: _mxY49, w: _mxX49 - _mnX49, h: _mxY49 - _mnY49 }
              };
            }
          }
          if(this.erasedMissileImgs[_ex49] && this.erasedMissileImgs[_ex49].canvas){
            const _c49 = this.erasedMissileImgs[_ex49];
            this.missiles.push({
              img: _c49.canvas, imgW: _c49.imgW, imgH: _c49.imgH, box: _c49.box,
              x: muzzleX, y: muzzleY, startTime: now,
              lastJetTime: now, lastSpreadTime: now,
              speed: this.width * 0.8, isImageEntity: true
            });
            _pushed49 = true;
          }
        }
      }
      if(!_pushed49){
        this.missiles.push({ x: muzzleX, y: muzzleY, startTime: now, lastJetTime: now, lastSpreadTime: now, speed: this.width * 0.8 });
      }
    }
    m.recoilDur = rcDur;
    m.smokeDur = isMG ? 200 : rcDur;
  },

  _getBTRWorldSpeed(){
    if(this.phase === 'support') return 100;
    if(this.phase === 'enter' || this.phase === 'leave') return 130;
    if(this.phase === 'center' || this.phase === 'lift') return 60;
    if(this.phase === 'arrive' || this.phase === 'exit') return 20;
    return 0;
  },

  _updateRecoilSmoke(now){
    const basePx = this.x * this.width + this.shakeX;
    const basePy = this.height * 0.95 - (this._contentBottomRatio || 1) * this.targetH + this.yOffset + this.shakeY;
    for(const m of this.muzzles){
      const rs = this.recoilStates[m.weaponId];
      if(!rs || !rs._smokeActive) continue;
      const t = now - rs.startTime;
      if(t < 0) continue;
      const p = Math.min(1, t / rs.duration);
      const _rcP = p < 0.08 ? p / 0.08 : Math.pow(1 - (p - 0.08) / 0.92, 2.4);
      let _totalRcPx = rs.dist * this.targetW * _rcP;
      if(m._parentId){
        const prs = this.recoilStates[m._parentId];
        if(prs){
          const pt = now - prs.startTime;
          if(pt >= 0 && pt <= prs.duration){
            const pp = Math.min(1, pt / prs.duration);
            const pRcP = pp < 0.08 ? pp / 0.08 : Math.pow(1 - (pp - 0.08) / 0.92, 2.4);
            _totalRcPx += prs.dist * this.targetW * pRcP;
          }
        }
      }
      const _muzzleXNow = basePx + m.mx * this.targetW - _totalRcPx;
      const _muzzleYNow = basePy + m.my * this.targetH;
      const isMain = rs._isMain;
      const JET_INTERVAL = isMain ? 16 : 24;
      const SPREAD_INTERVAL = isMain ? 24 : 32;
      const JET_MAX_TIME = isMain ? 150 : 250;
      const _jetXNow = _muzzleXNow;
      const _jetYNow = _muzzleYNow;
      while(now - rs._lastJetTime >= JET_INTERVAL && t <= JET_MAX_TIME){
        let jetAngle = 0;
        if(typeof m.angle === 'number') jetAngle = m.angle;
        else if(window.MUZZLE_ANGLES && window.MUZZLE_ANGLES[m.weaponId]) jetAngle = window.MUZZLE_ANGLES[m.weaponId];
        this.fx.spawnJetOne(_jetXNow, _jetYNow, m.weaponId, jetAngle, _muzzleXNow, m.layerOrder);
        rs._lastJetTime += JET_INTERVAL;
      }
      const SPREAD_OFFSET = isMain ? this.targetW * 0.45 : this.targetW * 0.25;
      const _spreadXNow = _muzzleXNow + SPREAD_OFFSET;
      while(now - rs._lastSpreadTime >= SPREAD_INTERVAL && t <= rs.duration){
        this.fx.spawnSpreadOne(_spreadXNow, _muzzleYNow, m.weaponId, m.layerOrder);
        rs._lastSpreadTime += SPREAD_INTERVAL;
      }
      if(t > rs.duration) rs._smokeActive = false;
    }
  },

  _updateMissiles(now, dt){
    if(!this.missiles || !this.missiles.length) return;
    for(let i = this.missiles.length - 1; i >= 0; i--){
      const mis = this.missiles[i];
      mis.x += mis.speed * dt;
      if(mis.x > this.width + 200 || now - mis.startTime > 3000){
        this.missiles.splice(i, 1);
        continue;
      }
      if(now - mis.lastJetTime >= 16){
        mis.lastJetTime = now;
        this.fx.spawnMissileJet(mis.x, mis.y);
      }
      if(now - mis.lastSpreadTime >= 30){
        mis.lastSpreadTime = now;
        this.fx.spawnMissileSpread(mis.x, mis.y);
      }
    }
  },

  _render(now){
    const _spd = (window._explore && window._explore._currentSpeed) || 0;
    const _g = (typeof _garageInitState === 'function') ? _garageInitState() : null;
    const _vid = _g ? _g.currentVehicle : 'btr80';
    let _maxSpd = 80 / 3.6;
    if(typeof VEHICLES !== 'undefined' && VEHICLES[_vid] && VEHICLES[_vid].speedRoad) _maxSpd = VEHICLES[_vid].speedRoad / 3.6;
    const _ratio = _maxSpd > 0 ? Math.min(1, _spd / _maxSpd) : 0;
    const _sTV = this.trackVel, _sWS = this.wheelSpeed, _sSX = this.shakeX, _sSY = this.shakeY;
    this.trackVel = _sTV * _ratio;
    this.wheelSpeed = _sWS * _ratio;
    this.shakeX = _sSX * _ratio;
    this.shakeY = _sSY * _ratio;
    try {
      const ctx = this.ctx;
      if(!ctx) return;
      ctx.clearRect(0, 0, this.width, this.height);
      const ann = VEHICLE_ANNOTATIONS[this.vehicleId];
      if(!ann) return;

      const px = this.x * this.width + this.shakeX;
      const py = this.height * 0.95 - (this._contentBottomRatio || 1) * this.targetH + this.yOffset + this.shakeY;

      const recoilsPx = {};
      if(this.recoilStates){
        for(const wid in this.recoilStates){
          const rs = this.recoilStates[wid];
          const t = (now - rs.startTime) / rs.duration;
          if(t < 1){
            const p = t < 0.08 ? t / 0.08 : Math.pow(1 - (t - 0.08) / 0.92, 2.4);
            recoilsPx[wid] = rs.dist * this.targetW * p;
          } else if(wid !== '__default__'){
            delete this.recoilStates[wid];
          }
        }
      }
      for(const m of this.muzzles){
        if(m._parentId && recoilsPx[m._parentId]){
          recoilsPx[m.weaponId] = (recoilsPx[m.weaponId] || 0) + recoilsPx[m._parentId];
        }
      }

      const dt = Math.min(0.05, (now - (this._lastTick || now)) / 1000);
      this._lastTick = now;
      this._updateMissiles(now, dt);
      const worldSpeed = this._getBTRWorldSpeed();
      this._updateRecoilSmoke(now);
      this.fx.update(now, dt, worldSpeed);

      let _renderOpts;
      if(this.phase === 'wreck'){
        _renderOpts = { trackVel: 0, wheelSpeed: 0, doorOpen: 0, recoils: {} };
      } else {
        let _p25ratio = 0;
        if(this.phase === 'support'){
          const _supSpd = (window._explore && window._explore._currentSpeed) || 0;
          _p25ratio = Math.min(1, Math.max(0, _supSpd / (80 / 3.6)));
        } else if(this.phase === 'enter' || this.phase === 'leave'){
          _p25ratio = 1;
        } else if(this.phase === 'center' || this.phase === 'lift'){
          _p25ratio = 0.5;
        } else if(this.phase === 'arrive' || this.phase === 'exit'){
          _p25ratio = 0.15;
        } else if(this.phase === 'sink'){
          _p25ratio = 0.05;
        } else {
          _p25ratio = 0;
        }
        _renderOpts = { trackVel: 300 * _p25ratio, wheelSpeed: 20 * _p25ratio, doorOpen: (this.doorOpen || 0) * 180, recoils: recoilsPx };
      }

      if(this.erasedMissilePolys && this.erasedMissilePolys.length > 0){
        if(!this.erasedBaseImg){
          const _bImg53 = _loadVehicleImg(this.vehicleId);
          if(_bImg53 && _bImg53.complete && _bImg53.naturalWidth){
            const _nw53 = _bImg53.naturalWidth, _nh53 = _bImg53.naturalHeight;
            const _ec53 = document.createElement('canvas');
            _ec53.width = _nw53; _ec53.height = _nh53;
            const _ecx53 = _ec53.getContext('2d');
            _ecx53.drawImage(_bImg53, 0, 0);
            _ecx53.globalCompositeOperation = 'destination-out';
            _ecx53.fillStyle = '#000';
            for(let _pi53 = 0; _pi53 < this.erasedMissilePolys.length; _pi53++){
              const _poly53 = this.erasedMissilePolys[_pi53];
              if(!_poly53 || _poly53.length < 3) continue;
              _ecx53.beginPath();
              _ecx53.moveTo(_poly53[0].x * _nw53, _poly53[0].y * _nh53);
              for(let _pj53 = 1; _pj53 < _poly53.length; _pj53++) _ecx53.lineTo(_poly53[_pj53].x * _nw53, _poly53[_pj53].y * _nh53);
              _ecx53.closePath();
              _ecx53.fill();
            }
            this.erasedBaseImg = _ec53;
          }
        }
        if(this.erasedBaseImg) _renderOpts.baseImage = this.erasedBaseImg;
      }

      if(this.fx && this.fx.smoke){
        const _smokeBelow = this.fx.smoke.filter(p => p._layerOrder === 'below');
        window._vsDrawSmoke(ctx, _smokeBelow);
      }

      for(const fx of this.fireFx){
        if(fx.layerOrder !== 'below') continue;
        this._drawOneFireFx(ctx, fx, now, px, py);
      }

      this.fx.drawTracers(ctx, now, 'below');

      (window.VehicleRenderer && window.VehicleRenderer.render || renderVehicle)(ctx, this.vehicleId, px, py, this.targetW, this.targetH, (now - this.startTime) / 1000, _renderOpts);

      if(this.fx && this.fx.smoke){
        const _smokeAbove = this.fx.smoke.filter(p => p._layerOrder !== 'below');
        window._vsDrawSmoke(ctx, _smokeAbove);
      }

      if(this.missiles && this.missiles.length){
        for(const mis of this.missiles){
          if(mis.isImageEntity && mis.img){
            const _srcX = mis.box.minX * mis.imgW;
            const _srcY = mis.box.minY * mis.imgH;
            const _srcW = mis.box.w * mis.imgW;
            const _srcH = mis.box.h * mis.imgH;
            const _drawW = mis.box.w * this.width;
            const _drawH = mis.box.h * this.height;
            const _drawX = mis.x + this.shakeX - _drawW / 2;
            const _drawY = mis.y + this.shakeY - _drawH / 2;
            ctx.drawImage(mis.img, _srcX, _srcY, _srcW, _srcH, _drawX, _drawY, _drawW, _drawH);
          } else {
            ctx.save();
            ctx.translate(mis.x + this.shakeX, mis.y + this.shakeY);
            ctx.fillStyle = 'rgba(255, 200, 50, 0.8)';
            ctx.beginPath();
            ctx.moveTo(-15, 0);
            ctx.lineTo(-30 - Math.random() * 10, -4);
            ctx.lineTo(-30 - Math.random() * 10, 4);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = '#ddd';
            ctx.beginPath();
            ctx.ellipse(0, 0, 12, 4, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        }
      }

      for(const fx of this.fireFx){
        if(fx.layerOrder === 'below') continue;
        this._drawOneFireFx(ctx, fx, now, px, py);
      }

      this.fx.drawTracers(ctx, now, 'above');

      if(!this.dustParticles) this.dustParticles = [];
      const wheelSpd = (this.phase === 'support') ? 20 : 6;
      const intensity = (wheelSpd === 20) ? 1.0 : 0.6;
      if(intensity > 0 && Math.random() < intensity){
        const _dustSrc = window.computeVehicleDustSource(ann);
        if(_dustSrc) window.spawnDust(this.dustParticles, px, py, _dustSrc, this.targetW, this.targetH, wheelSpd);
      }
      window.updateAndDrawDust(ctx, this.dustParticles, dt);
    } finally {
      this.trackVel = _sTV;
      this.wheelSpeed = _sWS;
      this.shakeX = _sSX;
      this.shakeY = _sSY;
    }
  },

  _drawOneFireFx(ctx, fx, now, px, py){
    const age = now - fx.startTime, total = fx.endTime - fx.startTime;
    if(age > total) return;
    const t = age / total;
    const x = fx.spawnX !== undefined ? fx.spawnX : (px + fx.mx * this.targetW);
    const y = fx.spawnY !== undefined ? fx.spawnY : (py + fx.my * this.targetH);
    if(t < 0.15 && fx.triggerFlash){
      const ft = t / 0.15;
      const isCannon = (fx.weaponId === '2a42' || fx.weaponId === '2a72' || fx.weaponId === '2a46' || fx.weaponId === '2a46m1' || fx.weaponId === '2a28' || fx.weaponId === '2a70');
      const isMain = (fx.weaponId === '2a46' || fx.weaponId === '2a46m1');
      const fxX = x + this.targetW * (isCannon ? 0.12 : 0.04) + (Math.random() - 0.5) * 10;
      const fxY = y + (Math.random() - 0.5) * (isMain ? 12 : 6);
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
      ctx.beginPath();
      ctx.arc(0, 0, baseR, 0, Math.PI * 2);
      ctx.fill();
      if(isCannon){
        const gSecondary = ctx.createRadialGradient(baseR * 1.5, 0, 0, baseR * 1.5, 0, baseR * 0.8);
        gSecondary.addColorStop(0, 'rgba(255,200,100,' + (fade * 0.6) + ')');
        gSecondary.addColorStop(1, 'rgba(255,80,20,0)');
        ctx.fillStyle = gSecondary;
        ctx.beginPath();
        ctx.arc(baseR * 1.5, 0, baseR * 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  },

  _finishSupportAndLog(){
    const vid = this.vehicleId;
    const vehName = (typeof VEHICLES !== 'undefined' && VEHICLES[vid]) ? VEHICLES[vid].name : vid;
    const exp = (this.killCount || 0) * 10;
    const loot = this.loot || [];
    const kills = this.kills || {};
    if(exp > 0){
      if(typeof _garageAddVehicleExp === 'function') _garageAddVehicleExp(vid, exp);
      if(typeof save === 'function') save();
    }
    const hasContent = (this.killCount > 0) || (loot.length > 0) || (exp > 0);
    if(typeof pushLog === 'function'){
      if(hasContent){
        const parts = [];
        if(this.killCount > 0) parts.push('擊殺 ' + this.killCount + ' 名敵人');
        if(loot.length) parts.push('獲得戰利品');
        if(exp > 0) parts.push('經驗 +' + exp);
        pushLog('<span class="pl">' + vehName + '</span> ' + parts.join(' · ') + '，<span style="color:#4a90d9;text-decoration:underline;text-decoration-style:dotted">點擊查看詳情</span>', loot.slice(), 'btr');
        state.logs[state.logs.length - 1].btrKills = Object.assign({}, kills);
        state.logs[state.logs.length - 1].btrExp = exp;
        state.logs[state.logs.length - 1].btrTotalKills = this.killCount || 0;
        state.logs[state.logs.length - 1].vehicleId = vid;
      } else {
        pushLog('<span class="pl">' + vehName + '</span> 支援結束', [], 'explore');
      }
    }
    if(typeof currentTab !== 'undefined' && currentTab === 'explore' && typeof renderZone3Log === 'function') renderZone3Log();
  },

  _cleanup(){
    try {
      if(window._combat && window._combat.active && window._combat.sceneType === 'vehicle'){
        const cb = window._combat.onResolve;
        if(typeof window._combatCleanup === 'function'){ try { window._combatCleanup(); } catch(e){} }
        if(typeof cb === 'function'){ try { cb(true); } catch(e){} }
      }
    } catch(e){}
    if(window._explore){
      if(window._explore.corpses && window._explore.corpses.length){
        for(let i = window._explore.corpses.length - 1; i >= 0; i--){
          try { window._explore.corpses[i].wrap.remove(); } catch(e){}
        }
        window._explore.corpses = [];
      }
      window._explore._lootingUntil = 0;
      window._explore._corpseLootTriggered = false;
      window._explore._pendingLootEvent = null;
      if(window._explore.mode === 'combat') window._explore.mode = 'walk';
    }
    window._combatActive = false;
    if(this.raf){ cancelAnimationFrame(this.raf); this.raf = null; }
    if(this.canvas){ this.canvas.remove(); this.canvas = null; this.ctx = null; }
    this.fireFx = [];
    this.muzzles = [];
    this.dustParticles = [];
    this.fx.smoke = [];
    this.fx.tracers = [];
    this.missiles = [];
  },

  stop(){ this._cleanup(); this.active = false; }
};

window.BTRSupport = BTRSupport;

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

  if(Object.keys(kills).length){
    const kc = !!window._collapseStates['btr.__kills__'];
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
    const names = { weapon: '⚔️ 武器', armor:'🛡️ 裝備', ammo:'🔫 彈藥', consume:'💊 消耗品', material:'🔧 材料', misc:'📦 其他' };
    for(const g in groups){
      if(!groups[g].length) continue;
      const col = !!window._collapseStates['btr.' + g];
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
  ft.className = 'modal-ft';
  ft.innerHTML = '';
  const bd = openModal({ title: '支援報告', body: body, footer: ft });

  const headers = bd.querySelectorAll('.cat-header[data-btr-cat]');
  for(let i = 0; i < headers.length; i++){
    (function(h){
      h.onclick = function(){
        const key = h.getAttribute('data-btr-cat');
        window._collapseStates['btr.' + key] = !window._collapseStates['btr.' + key];
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

window.MUZZLE_PROFILES = MUZZLE_PROFILES;

window._vsMakeSmokeJet = function(x, y, weaponId, angle){
  const _base = 300;
  const isHeavy = (weaponId === '2a46' || weaponId === '2a46m1' || weaponId === 'atgm');
  const isATGM = (weaponId === 'atgm');

  let vx = 0, vy = 0;
  let sizeX = 0, sizeY = 0, growX = 0, growY = 0;
  let offsetX = -30;

  if(isATGM){
    vx = _base * 40; vy = (Math.random() - 0.5) * _base * 0.01;
    sizeX = _base * 0.2; sizeY = _base * 0.01;
    growX = _base * 6.0; growY = _base * 0.1;
    offsetX = -60;
  } else if(isHeavy){
    vx = _base * 40; vy = (Math.random() - 0.5) * _base * 0.02;
    sizeX = _base * 0.25; sizeY = _base * 0.035;
    growX = _base * 10.0; growY = _base * 0.6;
    offsetX = -60;
  } else {
    vx = _base * 30; vy = (Math.random() - 0.5) * _base * 0.01;
    sizeX = _base * 0.2; sizeY = _base * 0.015;
    growX = _base * 8.0; growY = _base * 0.4;
    offsetX = -60;
  }

  if(angle){
    const rad = angle * Math.PI / 180;
    const cos = Math.cos(rad), sin = Math.sin(rad);
    const nx = vx * cos - vy * sin;
    const ny = vx * sin + vy * cos;
    vx = nx; vy = ny;
  }

  return {
    x: x + offsetX, y: y, vx: vx, vy: vy,
    life: 1, rate: 1 / 0.15,
    sizeX: sizeX, sizeY: sizeY,
    growX: growX, growY: growY,
    alpha0: 1.0, isJet: true, isCore: true,
    friction: 0.92,
    angle: 0, spin: 0, worldFactor: 0.1, skipUpdate: false
  };
};

window._vsMakeSmokeSpread = function(x, y, weaponId){
  const _base = 300;
  const isHeavy = (weaponId === '2a46' || weaponId === '2a46m1' || weaponId === 'atgm');
  if(isHeavy){
    return {
      x: x + (Math.random() - 0.5) * _base * 0.2,
      y: y + (Math.random() - 0.5) * _base * 0.2,
      vx: (Math.random() - 0.5) * _base * 0.5,
      vy: (Math.random() - 0.5) * _base * 0.5,
      life: 1, rate: 1 / (2.0 + Math.random() * 0.8),
      sizeX: _base * 0.3, sizeY: _base * 0.3,
      growX: _base * 3.5, growY: _base * 3.5,
      alpha0: 0.22, isJet: false, isCore: false,
      friction: 0.92,
      angle: Math.random() * 6.28,
      spin: (Math.random() - 0.5) * 0.5,
      worldFactor: 1.5, skipUpdate: true
    };
  }
  return {
    x: x + (Math.random() - 0.5) * _base * 0.2,
    y: y + (Math.random() - 0.5) * _base * 0.15,
    vx: (Math.random() - 0.5) * _base * 0.4,
    vy: (Math.random() - 0.5) * _base * 0.4,
    life: 1, rate: 1 / (1.5 + Math.random() * 0.6),
    sizeX: _base * 0.2, sizeY: _base * 0.2,
    growX: _base * 2.5, growY: _base * 2.5,
    alpha0: 0.18, isJet: false, isCore: false,
    friction: 0.94,
    angle: Math.random() * 6.28,
    spin: (Math.random() - 0.5) * 0.5,
    worldFactor: 1.5, skipUpdate: true
  };
};

window._vsUpdateSmoke = function(particles, dt, worldSpeed){
  for(let i = particles.length - 1; i >= 0; i--){
    const p = particles[i];
    if(p.skipUpdate){ p.skipUpdate = false; continue; }
    const driftSpeed = worldSpeed * (p.worldFactor || 0);
    p.x += (p.vx - driftSpeed) * dt;
    p.y += p.vy * dt;
    const _fric = Math.pow(p.friction, dt * 60);
    p.vx *= _fric;
    p.vy *= _fric;
    p.sizeX += p.growX * dt;
    p.sizeY += p.growY * dt;
    p.life -= p.rate * dt;
    p.angle += p.spin * dt;
    if(p.life <= 0) particles.splice(i, 1);
  }
};

window._vsClipAtMuzzle = function(ctx, mx, my, angleRad){
  const _c = Math.cos(angleRad), _s = Math.sin(angleRad);
  const _px = -_s, _py = _c;
  const _BIG = 10000;
  ctx.beginPath();
  ctx.moveTo(mx + _px * _BIG, my + _py * _BIG);
  ctx.lineTo(mx - _px * _BIG, my - _py * _BIG);
  ctx.lineTo(mx - _px * _BIG + _c * _BIG, my - _py * _BIG + _s * _BIG);
  ctx.lineTo(mx + _px * _BIG + _c * _BIG, my + _py * _BIG + _s * _BIG);
  ctx.closePath();
  ctx.clip();
};

window._vsDrawSmoke = function(ctx, particles){
  for(const p of particles){
    let a = 0;
    if(p.isJet){
      a = p.alpha0 * Math.pow(Math.max(0, p.life), 2.0);
    } else {
      a = p.alpha0 * Math.pow(Math.max(0, p.life), 4.0);
    }
    if(a < 0.005) continue;
    ctx.save();
    if(p.isJet && p._muzzleX !== undefined){
      if(p._muzzleAngle !== undefined){
        window._vsClipAtMuzzle(ctx, p._muzzleX, p._muzzleY !== undefined ? p._muzzleY : p.y, p._muzzleAngle * Math.PI / 180);
      } else {
        ctx.beginPath();
        ctx.rect(p._muzzleX, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.clip();
      }
    }
    ctx.translate(p.x, p.y);
    if(p.isJet){
      ctx.scale(p.sizeX / Math.max(1, p.sizeY), 1);
      ctx.globalAlpha = a;
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, p.sizeY);
      g.addColorStop(0, 'rgba(255, 255, 255, 1)');
      g.addColorStop(0.4, 'rgba(230, 240, 255, 0.8)');
      g.addColorStop(1, 'rgba(200, 210, 220, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, p.sizeY, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.rotate(p.angle);
      ctx.globalAlpha = a;
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, p.sizeX);
      g.addColorStop(0, 'rgba(235, 235, 240, 0.9)');
      g.addColorStop(0.5, 'rgba(210, 210, 215, 0.2)');
      g.addColorStop(1, 'rgba(190, 190, 195, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, p.sizeX, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  ctx.globalAlpha = 1;
};

BTRSupport.fx.spawnJetOne = function(x, y, weaponId, angle, muzzleX, layerOrder){
  const p = window._vsMakeSmokeJet(x, y, weaponId, angle);
  if(p){
    p._muzzleX = muzzleX;
    p._muzzleY = y;
    p._muzzleAngle = angle || 0;
    p._layerOrder = layerOrder || 'above';
  }
  this.smoke.push(p);
};
BTRSupport.fx.spawnSpreadOne = function(x, y, weaponId, layerOrder){
  const p = window._vsMakeSmokeSpread(x, y, weaponId);
  if(p) p._layerOrder = layerOrder || 'above';
  this.smoke.push(p);
};

window._vDetonateFx = function(veh){
  const layer = document.getElementById('battle-fx') || document.getElementById('explore-fx');
  if(!layer) return;
  const fx = document.createElement('div');
  fx.style.cssText = 'position:absolute;pointer-events:none;z-index:30;left:50%;top:60%;transform:translate(-50%,-50%)';
  const glow = document.createElement('div');
  glow.style.cssText = 'width:120px;height:120px;border-radius:50%;background:radial-gradient(circle,rgba(255,200,80,0.95) 0%,rgba(255,80,20,0.6) 40%,transparent 70%);animation:detonateGlow 0.6s ease-out forwards';
  fx.appendChild(glow);
  for(let i = 0; i < 20; i++){
    const f = document.createElement('div');
    f.style.cssText = 'position:absolute;width:8px;height:8px;background:' + (i % 2 ? '#ff8800' : '#ffcc44') + ';border-radius:50%;left:0;top:0';
    const ang = (i / 20) * Math.PI * 2;
    const dist = 60 + Math.random() * 80;
    const dx = Math.cos(ang) * dist, dy = Math.sin(ang) * dist;
    f.animate([
      {transform:'translate(0,0) scale(1)', opacity:1},
      {transform:'translate(' + dx + 'px,' + dy + 'px) scale(0.3)', opacity:0}
    ], {duration: 600 + Math.random() * 300, easing: 'cubic-bezier(.2,.8,.4,1)', fill: 'forwards'});
    fx.appendChild(f);
  }
  layer.appendChild(fx);
  setTimeout(function(){ fx.remove(); }, 1200);
};
if(!document.getElementById('detonateStyle')){
  const st = document.createElement('style');
  st.id = 'detonateStyle';
  st.textContent = '@keyframes detonateGlow{0%{transform:scale(0.3);opacity:1}100%{transform:scale(2.2);opacity:0}}';
  document.head.appendChild(st);
}


/* 补丁 v12: 车门对齐（原 _extDoorPatched，11-vehicle.js 末尾遗漏） */
(function(){
  if (window._extDoorPatchedV12) return;
  window._extDoorPatchedV12 = true;
  function _apply(){
    if (!window.BTRSupport) { setTimeout(_apply, 100); return; }
    if (window.BTRSupport._extDoorPatchedV12) return;
    window.BTRSupport._extDoorPatchedV12 = true;
    var _origSetup = window.BTRSupport._setupCanvas;
    window.BTRSupport._setupCanvas = function(){
      _origSetup.call(this);
      var ann = (window.VEHICLE_ANNOTATIONS || {})[this.vehicleId];
      if (!ann || !ann.doors) return;
      var doors = [];
      if (ann.doors.fusion && ann.doors.fusion.length) doors = ann.doors.fusion;
      else {
        if (ann.doors.upper) doors = doors.concat(ann.doors.upper);
        if (ann.doors.lower) doors = doors.concat(ann.doors.lower);
        if (ann.doors.hatch) doors = doors.concat(ann.doors.hatch);
      }
      if (!doors.length) return;
      var sx = 0, sn = 0;
      for (var i = 0; i < doors.length; i++) {
        var d = doors[i];
        if (!d.polygon) continue;
        for (var j = 0; j < d.polygon.length; j++) { sx += d.polygon[j].x; sn++; }
      }
      if (sn === 0) return;
      var r = sx / sn;
      var w = this.width;
      var pcx = w * (typeof EXPLORE_HERO_X_RATIO === 'number' ? EXPLORE_HERO_X_RATIO : 0.25);
      this.doorOffsetRatio = r;
      this.doorX = (pcx - r * this.targetW) / w;
    };
  }
  _apply();
})();

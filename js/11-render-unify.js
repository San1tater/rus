(function(){
  'use strict';
  if(window._renderUnifyV1) return;
  window._renderUnifyV1 = true;

  var _imgCache = new Map();
  function _loadVehicleImg(id){
    if(_imgCache.has(id)) return _imgCache.get(id);
    var img = new Image();
    img.src = 'icons/vehicles/' + id + '.png' + (typeof assetSuffix === 'function' ? assetSuffix() : '');
    _imgCache.set(id, img);
    return img;
  }

  function _getTextureRect(ann){
    var sc = (ann && ann.trackScroll) || {};
    var y0 = sc.textureY0, y1 = sc.textureY1;
    if(y0 == null || !isFinite(y0)) y0 = 0.6;
    if(y1 == null || !isFinite(y1)) y1 = 1.0;
    var x0 = Math.max(0, Math.min(1, sc.textureX0 != null ? sc.textureX0 : 0.15));
    var x1 = Math.max(0, Math.min(1, sc.textureX1 != null ? sc.textureX1 : 0.40));
    if(x0 > x1){ var t = x0; x0 = x1; x1 = t; }
    if(y0 > y1){ var t2 = y0; y0 = y1; y1 = t2; }
    return { x0: x0, x1: x1, y0: y0, y1: y1 };
  }

  function _buildArc(pts){
    var segs = []; var totalLen = 0;
    var n = pts.length;
    if(n < 3) return null;
    for(var i = 0; i < n; i++){
      var p1 = pts[i], p2 = pts[(i+1)%n];
      var dx = p2.x-p1.x, dy = p2.y-p1.y;
      var len = Math.hypot(dx, dy);
      if(len < 0.5) continue;
      segs.push({ x1:p1.x, y1:p1.y, x2:p2.x, y2:p2.y, ux:dx/len, uy:dy/len, len:len, startLen:totalLen });
      totalLen += len;
    }
    if(totalLen < 1) return null;
    var cx=0, cy=0;
    for(var j = 0; j < pts.length; j++){ cx += pts[j].x; cy += pts[j].y; }
    cx /= n; cy /= n;
    function sampleArc(s){
      s = s % totalLen; if(s<0) s += totalLen;
      for(var k = 0; k < segs.length; k++){
        var seg = segs[k];
        if(s >= seg.startLen && s <= seg.startLen + seg.len){
          var t = (s - seg.startLen) / seg.len;
          return { x: seg.x1+(seg.x2-seg.x1)*t, y: seg.y1+(seg.y2-seg.y1)*t, ux: seg.ux, uy: seg.uy };
        }
      }
      var last = segs[segs.length-1];
      return { x:last.x2, y:last.y2, ux:last.ux, uy:last.uy };
    }
    function normalToCenter(p){
      var nx = -p.uy, ny = p.ux;
      if(nx*(cx-p.x) + ny*(cy-p.y) < 0){ nx=-nx; ny=-ny; }
      return { nx: nx, ny: ny };
    }
    return { segs: segs, totalLen: totalLen, cx: cx, cy: cy, sampleArc: sampleArc, normalToCenter: normalToCenter };
  }

  function _eraseOriginalTrack(ctx, img, ann, cw, ch){
    var sc = ann.trackScroll;
    if(!sc || !sc.enabled) return;
    if(!ann.trackLoop || ann.trackLoop.points.length < 3) return;
    var W = cw, H = ch;
    var rawPts = ann.trackLoop.points.map(function(p){ return { x: p.x * W, y: p.y * H }; });
    var arc = _buildArc(rawPts); if(!arc) return;
    var r = _getTextureRect(ann);
    var texW = (r.x1 - r.x0) * W, texH = (r.y1 - r.y0) * H;
    if(texW < 2 || texH < 2) return;
    var steps = Math.ceil(arc.totalLen / texW) + 2;
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = '#000';
    for(var k = 0; k < steps; k++){
      var s0 = k * texW;
      var a = arc.sampleArc(s0);
      var b = arc.sampleArc(s0 + texW);
      var na = arc.normalToCenter(a);
      var nb = arc.normalToCenter(b);
      var ext = 1.5;
      ctx.beginPath();
      ctx.moveTo(a.x - a.ux*ext, a.y - a.uy*ext);
      ctx.lineTo(b.x + b.ux*ext, b.y + b.uy*ext);
      ctx.lineTo(b.x + b.ux*ext + nb.nx*texH, b.y + b.uy*ext + nb.ny*texH);
      ctx.lineTo(a.x - a.ux*ext + na.nx*texH, a.y - a.uy*ext + na.ny*texH);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  function _drawTrackErasePatch(ctx, img, ann, cw, ch){
    var sc = ann.trackScroll;
    if(!sc || !sc.enabled) return;
    if(!ann.trackLoop || ann.trackLoop.points.length < 3) return;
    var W = cw, H = ch;
    var minY = 1, maxY = 0;
    for(var i = 0; i < ann.trackLoop.points.length; i++){
      var p = ann.trackLoop.points[i];
      if(p.y < minY) minY = p.y;
      if(p.y > maxY) maxY = p.y;
    }
    var limitY = ((minY + maxY) / 2) * H;
    var rawPts = ann.trackLoop.points.map(function(p){ return { x: p.x * W, y: p.y * H }; });
    var arc = _buildArc(rawPts); if(!arc) return;
    var r = _getTextureRect(ann);
    var texW = (r.x1 - r.x0) * W, texH = (r.y1 - r.y0) * H;
    if(texW < 2 || texH < 2) return;
    var steps = Math.ceil(arc.totalLen / texW) + 2;
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    for(var k = 0; k < steps; k++){
      var s0 = k * texW;
      var a = arc.sampleArc(s0);
      var b = arc.sampleArc(s0 + texW);
      var na = arc.normalToCenter(a);
      var nb = arc.normalToCenter(b);
      var ext = 1.5;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(a.x - a.ux*ext, a.y - a.uy*ext);
      ctx.lineTo(b.x + b.ux*ext, b.y + b.uy*ext);
      ctx.lineTo(b.x + b.ux*ext + nb.nx*texH, b.y + b.uy*ext + nb.ny*texH);
      ctx.lineTo(a.x - a.ux*ext + na.nx*texH, a.y - a.uy*ext + na.ny*texH);
      ctx.closePath();
      ctx.clip();
      ctx.beginPath();
      ctx.rect(0, 0, W, limitY);
      ctx.clip();
      var mx = (na.nx + nb.nx) / 2, my = (na.ny + nb.ny) / 2;
      var len = Math.hypot(mx, my) || 1;
      mx /= len; my /= len;
      ctx.translate(-mx * texH, -my * texH);
      ctx.drawImage(img, 0, 0, W, H);
      ctx.restore();
    }
    ctx.restore();
  }

  function _drawTrackScroll(ctx, img, ann, cw, ch, animT, vel){
    var sc = ann.trackScroll;
    if(!sc || !sc.enabled || sc.useTexture === false) return;
    if(!ann.trackLoop || ann.trackLoop.points.length < 3) return;
    var W = cw, H = ch;
    var rawPts = ann.trackLoop.points.map(function(p){ return { x: p.x * W, y: p.y * H }; });
    var arc = _buildArc(rawPts); if(!arc) return;
    var r = _getTextureRect(ann);
    var tx0 = r.x0 * W, ty0 = r.y0 * H, tx1 = r.x1 * W, ty1 = r.y1 * H;
    var texW = tx1 - tx0, texH = ty1 - ty0;
    if(texW < 2 || texH < 2) return;
    var dir = sc.direction || -1;
    var offset0 = (animT * vel * dir) % texW;
    var offset = offset0 < 0 ? offset0 + texW : offset0;
    var steps = Math.ceil(arc.totalLen / texW) + 2;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(rawPts[0].x, rawPts[0].y);
    for(var i = 1; i < rawPts.length; i++) ctx.lineTo(rawPts[i].x, rawPts[i].y);
    ctx.closePath();
    ctx.clip();
    var prevAlpha = ctx.globalAlpha;
    ctx.globalAlpha = (sc.textureOpacity != null ? sc.textureOpacity : 0.85);
    ctx.globalCompositeOperation = 'source-over';
    ctx.imageSmoothingEnabled = true;
    for(var k = 0; k < steps; k++){
      var s0 = offset + k * texW;
      var a = arc.sampleArc(s0);
      var b = arc.sampleArc(s0 + texW);
      var na = arc.normalToCenter(a);
      var nb = arc.normalToCenter(b);
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.lineTo(b.x + nb.nx*texH, b.y + nb.ny*texH);
      ctx.lineTo(a.x + na.nx*texH, a.y + na.ny*texH);
      ctx.closePath();
      ctx.clip();
      ctx.translate(a.x, a.y);
      ctx.transform(a.ux, a.uy, na.nx, na.ny, 0, 0);
      ctx.translate(0, texH);
      ctx.scale(1, -1);
      var det = a.ux*na.ny - a.uy*na.nx;
      if(det < 0){ ctx.scale(-1,1); ctx.translate(-texW, 0); }
      ctx.drawImage(img, tx0, ty0, texW, texH, 0, 0, texW, texH);
      ctx.restore();
    }
    ctx.globalAlpha = prevAlpha;
    ctx.restore();
  }

  function _maskYAtX(ann, nx){
    if(!ann.trackMask || !ann.trackMask.points) return 1;
    var pts = ann.trackMask.points.slice().sort(function(a,b){ return a.x-b.x; });
    if(pts.length < 2) return 1;
    if(nx <= pts[0].x) return pts[0].y;
    if(nx >= pts[pts.length-1].x) return pts[pts.length-1].y;
    for(var i=0; i<pts.length-1; i++){
      if(nx >= pts[i].x && nx <= pts[i+1].x){
        var t = (nx - pts[i].x) / (pts[i+1].x - pts[i].x);
        return pts[i].y + (pts[i+1].y - pts[i].y) * t;
      }
    }
    return 1;
  }
  function _polyTopYAtX(x, pts){
    var topY = 1e9;
    for(var i = 0; i < pts.length; i++){
      var p1 = pts[i], p2 = pts[(i+1)%pts.length];
      if((p1.x <= x && p2.x >= x) || (p2.x <= x && p1.x >= x)){
        if(p1.x === p2.x) topY = Math.min(topY, p1.y, p2.y);
        else { var t = (x - p1.x) / (p2.x - p1.x); topY = Math.min(topY, p1.y + t * (p2.y - p1.y)); }
      }
    }
    return topY === 1e9 ? -1 : topY;
  }
  function _pointInPolygon(x, y, pts){
    var inside = false;
    for(var i = 0, j = pts.length-1; i < pts.length; j = i++){
      var xi = pts[i].x, yi = pts[i].y, xj = pts[j].x, yj = pts[j].y;
      if(((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside;
    }
    return inside;
  }

  var _wheelClipCache = new Map();
  var _maskCache = new Map();
  function _getWheelClip(img, ann, wheel, cw, ch){
    if(!img || !img.complete || !img.naturalWidth) return null;
    var cx = wheel.cx * cw, cy = wheel.cy * ch, r = wheel.r * cw;
    var size = Math.ceil(r * 2);
    if(size < 3) return null;
    var maskKey = (ann.trackMask && ann.trackMask.enabled && ann.trackMask.points.length >= 2)
      ? ann.trackMask.points.map(function(p){ return p.x.toFixed(3) + ',' + p.y.toFixed(3); }).join(';') : 'off';
    var loopKey = (ann.trackLoop && ann.trackLoop.points.length >= 3)
      ? ann.trackLoop.points.map(function(p){ return p.x.toFixed(2) + ',' + p.y.toFixed(2); }).join(';') : 'off';
    var key = (img.src||'') + '|' + cw + 'x' + ch + '|' + cx.toFixed(1) + '|' + cy.toFixed(1) + '|' + size + '|' + maskKey + '|' + loopKey;
    if(_wheelClipCache.has(key)) return _wheelClipCache.get(key);

    var c = document.createElement('canvas'); c.width = size; c.height = size;
    var cc = c.getContext('2d');
    cc.save();
    cc.beginPath(); cc.arc(size/2, size/2, size/2 - 0.5, 0, Math.PI*2); cc.clip();
    cc.drawImage(img, -(cx - size/2), -(cy - size/2), cw, ch);
    cc.restore();

    var cutY_A = -1;
    if(ann.trackMask && ann.trackMask.enabled && ann.trackMask.points.length >= 2){
      cutY_A = _maskYAtX(ann, wheel.cx) * ch - (cy - size/2);
    }
    var cutY_B = -1;
    if(ann.trackLoop && ann.trackLoop.points.length >= 3){
      var inTrack = false;
      if(_pointInPolygon(wheel.cx, wheel.cy, ann.trackLoop.points)) inTrack = true;
      else {
        for(var i = 0; i < 16; i++){
          var ang = (i / 16) * Math.PI * 2;
          var nx = wheel.cx + Math.cos(ang) * wheel.r;
          var ny = wheel.cy + Math.sin(ang) * wheel.r * (cw / ch);
          if(_pointInPolygon(nx, ny, ann.trackLoop.points)){ inTrack = true; break; }
        }
      }
      if(inTrack){
        var topY = _polyTopYAtX(wheel.cx, ann.trackLoop.points);
        if(topY >= 0){
          var rtex = _getTextureRect(ann);
          var texH = (rtex.y1 - rtex.y0) * ch;
          cutY_B = (topY * ch + texH) - (cy - size/2);
        }
      }
    }
    var finalCutY = -1;
    if(cutY_A !== -1) finalCutY = cutY_A;
    if(cutY_B !== -1) finalCutY = finalCutY === -1 ? cutY_B : Math.max(finalCutY, cutY_B);
    var maxWheelCy = 0, hasWheel = false;
    for(var wi = 0; wi < (ann.wheels || []).length; wi++){
      var w = ann.wheels[wi];
      if(w.cy > maxWheelCy){ maxWheelCy = w.cy; hasWheel = true; }
    }
    if(hasWheel){
      var limitY_local = maxWheelCy * ch - (cy - size/2);
      if(finalCutY > limitY_local) finalCutY = limitY_local;
    }
    if(finalCutY > size / 2) finalCutY = size / 2;

    var maskYInCanvas = finalCutY;
    if(maskYInCanvas > 0.5 && maskYInCanvas < size - 0.5){
      cc.save(); cc.globalCompositeOperation = 'destination-out';
      cc.fillRect(0, 0, size, maskYInCanvas); cc.restore();
      var isLargeCut = maskYInCanvas > size / 2;
      if(isLargeCut){
        var fan = document.createElement('canvas'); fan.width = size; fan.height = size;
        var fx = fan.getContext('2d');
        fx.save(); fx.beginPath(); fx.moveTo(size/2, size/2);
        fx.arc(size/2, size/2, size/2, Math.PI*0.25, Math.PI*0.75); fx.closePath(); fx.clip();
        fx.drawImage(img, -(cx-size/2), -(cy-size/2), cw, ch);
        fx.restore();
        cc.save(); cc.globalCompositeOperation = 'destination-over';
        for(var j = 1; j <= 7; j++){
          cc.save(); cc.translate(size/2, size/2); cc.rotate((Math.PI/4)*j); cc.translate(-size/2, -size/2);
          cc.drawImage(fan, 0, 0); cc.restore();
        }
        cc.restore();
      } else {
        var temp = document.createElement('canvas'); temp.width = size; temp.height = size;
        var tc = temp.getContext('2d'); tc.drawImage(c, 0, 0);
        cc.save(); cc.globalCompositeOperation = 'destination-over';
        var angles = [15,-15,30,-30,45,-45,60,-60,90,-90];
        for(var k = 0; k < angles.length; k++){
          cc.save(); cc.translate(size/2, size/2); cc.rotate(angles[k]*Math.PI/180); cc.translate(-size/2, -size/2);
          cc.drawImage(temp, 0, 0); cc.restore();
        }
        cc.restore();
      }
    }
    cc.save(); cc.globalCompositeOperation = 'destination-in';
    cc.beginPath(); cc.arc(size/2, size/2, size/2 - 0.5, 0, Math.PI*2); cc.fill();
    cc.restore();
    _wheelClipCache.set(key, c);
    if(_wheelClipCache.size > 40) _wheelClipCache.delete(_wheelClipCache.keys().next().value);
    return c;
  }

  function _getMaskCanvas(img, ann, cw, ch){
    if(!ann.trackMask || !ann.trackMask.enabled || ann.trackMask.points.length < 2) return null;
    var key = (img.src||'') + '|' + ann.trackMask.points.map(function(p){ return p.x.toFixed(3)+','+p.y.toFixed(3); }).join(';') + '|' + cw + 'x' + ch;
    if(_maskCache.has(key)) return _maskCache.get(key);
    var c = document.createElement('canvas'); c.width = cw; c.height = ch;
    var cc = c.getContext('2d');
    var pts = ann.trackMask.points.slice().sort(function(a,b){ return a.x-b.x; });
    cc.beginPath(); cc.moveTo(pts[0].x*cw, 0);
    for(var i = 0; i < pts.length; i++) cc.lineTo(pts[i].x*cw, pts[i].y*ch);
    cc.lineTo(pts[pts.length-1].x*cw, 0);
    cc.closePath(); cc.clip();
    cc.drawImage(img, 0, 0, cw, ch);
    _maskCache.set(key, c);
    if(_maskCache.size > 20) _maskCache.delete(_maskCache.keys().next().value);
    return c;
  }

  function _makeDoorClip(img, pts, cw, ch){
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for(var i = 0; i < pts.length; i++){
      var p = pts[i];
      var px = p.x*cw, py = p.y*ch;
      if(px < minX) minX = px; if(py < minY) minY = py;
      if(px > maxX) maxX = px; if(py > maxY) maxY = py;
    }
    var bw = Math.ceil(maxX-minX), bh = Math.ceil(maxY-minY);
    if(bw < 2 || bh < 2) return null;
    var c = document.createElement('canvas'); c.width = bw; c.height = bh;
    var cc = c.getContext('2d');
    cc.beginPath();
    cc.moveTo(pts[0].x*cw - minX, pts[0].y*ch - minY);
    for(var j = 1; j < pts.length; j++) cc.lineTo(pts[j].x*cw - minX, pts[j].y*ch - minY);
    cc.closePath(); cc.clip();
    cc.drawImage(img, -minX, -minY, cw, ch);
    return { canvas: c, minX: minX, minY: minY, bw: bw, bh: bh };
  }
  function _drawDoorBorderGradient(ctx, pts, cw, ch){
    if(!pts || pts.length < 3) return;
    var pxPts = pts.map(function(p){ return { x: p.x * cw, y: p.y * ch }; });
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(pxPts[0].x, pxPts[0].y);
    for(var i = 1; i < pxPts.length; i++) ctx.lineTo(pxPts[i].x, pxPts[i].y);
    ctx.closePath();
    ctx.lineWidth = Math.max(1, cw * 0.0016);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(180,180,180,0.55)';
    ctx.stroke();
    ctx.restore();
  }
  function _renderDoor(ctx, img, ann, door, cw, ch, openAngle, backColor){
    if(!door || !door.polygon || door.polygon.length < 3) return;
    var pts = door.polygon;
    var x1 = door.hingeP1.x * cw, y1 = door.hingeP1.y * ch;
    var x2 = door.hingeP2.x * cw, y2 = door.hingeP2.y * ch;
    var ang = (openAngle || 0) * Math.PI / 180;
    var cosA = Math.cos(ang);
    var showBack = cosA < 0;
    var alpha = Math.atan2(y2 - y1, x2 - x1);
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
      for(var i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x*cw, pts[i].y*ch);
      ctx.closePath(); ctx.fill();
      ctx.save(); ctx.clip();
      var _bMnX=Infinity, _bMnY=Infinity, _bMxX=-Infinity, _bMxY=-Infinity;
      for(var b = 0; b < pts.length; b++){
        var bp = pts[b];
        var _px = bp.x*cw, _py = bp.y*ch;
        if(_px < _bMnX) _bMnX = _px; if(_py < _bMnY) _bMnY = _py;
        if(_px > _bMxX) _bMxX = _px; if(_py > _bMxY) _bMxY = _py;
      }
      var _bCx = (_bMnX + _bMxX)/2, _bCy = (_bMnY + _bMxY)/2;
      var _bR = Math.max(_bMxX - _bMnX, _bMxY - _bMnY)/2 || 1;
      var _bG = ctx.createRadialGradient(_bCx, _bCy, _bR*0.15, _bCx, _bCy, _bR);
      _bG.addColorStop(0, 'rgba(0,0,0,0)');
      _bG.addColorStop(1, 'rgba(0,0,0,0.55)');
      ctx.fillStyle = _bG;
      ctx.fillRect(_bMnX, _bMnY, _bMxX - _bMnX, _bMxY - _bMnY);
      ctx.restore();
    } else {
      var clip = _makeDoorClip(img, pts, cw, ch);
      if(clip) ctx.drawImage(clip.canvas, clip.minX, clip.minY, clip.bw, clip.bh);
    }
    if(Math.abs(openAngle || 0) > 3) _drawDoorBorderGradient(ctx, pts, cw, ch);
    ctx.restore();
  }

  function _drawVehicleContent(ctx, id, cw, ch, animT, opts){
    var ann = window.VEHICLE_ANNOTATIONS && window.VEHICLE_ANNOTATIONS[id];
    var img = _loadVehicleImg(id);
    if(!ann){
      if(img.complete && img.naturalWidth) ctx.drawImage(img, 0, 0, cw, ch);
      return;
    }
    if(!img.complete || !img.naturalWidth) return;

    ctx.drawImage(img, 0, 0, cw, ch);
    _eraseOriginalTrack(ctx, img, ann, cw, ch);
    _drawTrackErasePatch(ctx, img, ann, cw, ch);
    _drawTrackScroll(ctx, img, ann, cw, ch, animT, opts.trackVel || 60);

    if(ann.wheels && ann.wheels.length){
      for(var wi = 0; wi < ann.wheels.length; wi++){
        var wheel = ann.wheels[wi];
        var cx = wheel.cx * cw, cy = wheel.cy * ch, r = wheel.r * cw;
        var clip = _getWheelClip(img, ann, wheel, cw, ch);
        if(clip){
          var rot = (wheel.rotSpeed || 1) * animT * (opts.wheelSpeed || 3);
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(rot);
          ctx.drawImage(clip, -r, -r, r*2, r*2);
          ctx.restore();
        }
      }
    }
    var maskC = _getMaskCanvas(img, ann, cw, ch);
    if(maskC) ctx.drawImage(maskC, 0, 0);

    if(ann.doors){
      var doorOpen = opts.doorOpen || 0;
      if(doorOpen > 3){
        var allDoors = [];
        if(ann.doors.lower) for(var dl = 0; dl < ann.doors.lower.length; dl++) allDoors.push(ann.doors.lower[dl]);
        if(ann.doors.upper) for(var du = 0; du < ann.doors.upper.length; du++) allDoors.push(ann.doors.upper[du]);
        if(ann.doors.hatch) for(var dh = 0; dh < ann.doors.hatch.length; dh++) allDoors.push(ann.doors.hatch[dh]);
        ctx.save(); ctx.fillStyle = '#000';
        for(var da = 0; da < allDoors.length; da++){
          var d = allDoors[da];
          if(!d.polygon || d.polygon.length < 3) continue;
          ctx.beginPath();
          ctx.moveTo(d.polygon[0].x*cw, d.polygon[0].y*ch);
          for(var di = 1; di < d.polygon.length; di++) ctx.lineTo(d.polygon[di].x*cw, d.polygon[di].y*ch);
          ctx.closePath(); ctx.fill();
        }
        ctx.restore();
      }
      if(ann.doors.lower && ann.doors.lower.length){
        for(var dr = 0; dr < ann.doors.lower.length; dr++) _renderDoor(ctx, img, ann, ann.doors.lower[dr], cw, ch, doorOpen * (110/180), '#0c0c0c');
      }
      if(ann.doors.upper && ann.doors.upper.length){
        for(var dup = 0; dup < ann.doors.upper.length; dup++) _renderDoor(ctx, img, ann, ann.doors.upper[dup], cw, ch, doorOpen, '#0c0c0c');
      }
      if(ann.doors.hatch && ann.doors.hatch.length){
        for(var dht = 0; dht < ann.doors.hatch.length; dht++) _renderDoor(ctx, img, ann, ann.doors.hatch[dht], cw, ch, doorOpen * 0.5, '#0c0c0c');
      }
    }
  }

  function _renderVehicle(ctx, id, x, y, w, h, animT, opts){
    opts = opts || {};
    var ann = window.VEHICLE_ANNOTATIONS && window.VEHICLE_ANNOTATIONS[id];
    var img = _loadVehicleImg(id);
    if(!img || !img.complete || !img.naturalWidth) return;
    if(!ann){
      ctx.save(); ctx.translate(x, y); ctx.drawImage(img, 0, 0, w, h); ctx.restore();
      return;
    }
    var cw = w, ch = h;
    var recoils = opts.recoils || {};
    var areas = ann.weaponAreas || [];
    var hasRecoil = false;
    for(var ai = 0; ai < areas.length; ai++){
      var wid = areas[ai].weaponId || '__default__';
      if(recoils[wid] && recoils[wid] > 0.1){ hasRecoil = true; break; }
    }

    if(!hasRecoil){
      ctx.save();
      ctx.translate(x, y);
      _drawVehicleContent(ctx, id, cw, ch, animT, opts);
      ctx.restore();
      return;
    }

    if(!window._vehRecoilCache) window._vehRecoilCache = {};
    var cache = window._vehRecoilCache;
    if(!cache.baseC || cache.baseC.width !== cw || cache.baseC.height !== ch){
      cache.baseC = document.createElement('canvas'); cache.baseC.width = cw; cache.baseC.height = ch;
      cache.bodyC = document.createElement('canvas'); cache.bodyC.width = cw; cache.bodyC.height = ch;
      cache.wepC  = document.createElement('canvas'); cache.wepC.width  = cw; cache.wepC.height  = ch;
    }
    var baseC = cache.baseC, baseX = baseC.getContext('2d');
    var bodyC = cache.bodyC, bodyX = bodyC.getContext('2d');
    var wepC  = cache.wepC,  wepX  = wepC.getContext('2d');

    baseX.setTransform(1,0,0,1,0,0); baseX.clearRect(0,0,cw,ch);
    _drawVehicleContent(baseX, id, cw, ch, animT, opts);

    bodyX.setTransform(1,0,0,1,0,0); bodyX.clearRect(0,0,cw,ch);
    bodyX.drawImage(baseC, 0, 0);
    bodyX.globalCompositeOperation = 'destination-out';
    for(var bi = 0; bi < areas.length; bi++){
      var bpts = areas[bi].polygon;
      if(!bpts || bpts.length < 3) continue;
      bodyX.beginPath();
      bodyX.moveTo(bpts[0].x*cw, bpts[0].y*ch);
      for(var bj = 1; bj < bpts.length; bj++) bodyX.lineTo(bpts[bj].x*cw, bpts[bj].y*ch);
      bodyX.closePath(); bodyX.fill();
    }
    bodyX.globalCompositeOperation = 'source-over';

    ctx.save();
    ctx.translate(x, y);
    for(var ri = 0; ri < areas.length; ri++){
      var a = areas[ri];
      var wid2 = a.weaponId || '__default__';
      var rx = recoils[wid2] || 0;
      if(rx <= 0.1) continue;
      var pts = a.polygon;
      if(!pts || pts.length < 3) continue;
      wepX.setTransform(1,0,0,1,0,0); wepX.clearRect(0,0,cw,ch);
      wepX.drawImage(baseC, -rx, 0);
      wepX.globalCompositeOperation = 'destination-in';
      wepX.beginPath();
      wepX.moveTo(pts[0].x*cw - rx, pts[0].y*ch);
      for(var pi = 1; pi < pts.length; pi++) wepX.lineTo(pts[pi].x*cw - rx, pts[pi].y*ch);
      wepX.closePath(); wepX.fill();
      wepX.globalCompositeOperation = 'source-over';
      ctx.drawImage(wepC, 0, 0);
    }
    ctx.drawImage(bodyC, 0, 0);
    ctx.restore();
  }

  window.VehicleRenderer = window.VehicleRenderer || {};
  window.VehicleRenderer.render = _renderVehicle;
  console.log('[render-unify] VehicleRenderer.render 已就緒');
})();

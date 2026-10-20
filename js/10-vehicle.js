(function(){
  'use strict';
  if(window._vehicleRendererInstalled) return;
  window._vehicleRendererInstalled = true;

  if(!window.VEHICLE_ANNOTATIONS){
    window.VEHICLE_ANNOTATIONS = {
      btr80:  typeof VEHICLE_ANNOTATION_BTR80  !== 'undefined' ? VEHICLE_ANNOTATION_BTR80  : null,
      btr80a: typeof VEHICLE_ANNOTATION_BTR80A !== 'undefined' ? VEHICLE_ANNOTATION_BTR80A : null,
      btr82a: typeof VEHICLE_ANNOTATION_BTR82A !== 'undefined' ? VEHICLE_ANNOTATION_BTR82A : null,
      t80:    typeof VEHICLE_ANNOTATION_T80    !== 'undefined' ? VEHICLE_ANNOTATION_T80    : null,
      t80u:   typeof VEHICLE_ANNOTATION_T80U   !== 'undefined' ? VEHICLE_ANNOTATION_T80U   : null,
      t80um:  typeof VEHICLE_ANNOTATION_T80UM  !== 'undefined' ? VEHICLE_ANNOTATION_T80UM  : null
    };
  }
  const ANN = window.VEHICLE_ANNOTATIONS;

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

  function _drawPathQuad(ctx, img, path, sStart, pathLen, srcX, srcLen, srcY, srcH){
    const p1 = _samplePath(path.segs, sStart);
    const p2 = _samplePath(path.segs, sStart + pathLen);
    if(!p1 || !p2) return;
    const n1x = -p1.ty, n1y = p1.tx;
    const n2x = -p2.ty, n2y = p2.tx;
    const l1x = p1.x + n1x * srcH, l1y = p1.y + n1y * srcH;
    const l2x = p2.x + n2x * srcH, l2y = p2.y + n2y * srcH;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.lineTo(l2x, l2y);
    ctx.lineTo(l1x, l1y);
    ctx.closePath();
    ctx.clip();
    const a = (p2.x - p1.x) / srcLen;
    const b = (p2.y - p1.y) / srcLen;
    const c = (l1x - p1.x) / srcH;
    const d = (l1y - p1.y) / srcH;
    ctx.transform(a, b, c, d, p1.x, p1.y);
    ctx.drawImage(img, srcX, srcY, srcLen, srcH, 0, 0, srcLen, srcH);
    ctx.restore();
  }

  function _drawTrackBand(ctx, img, ann, cw, ch, animTime, vel){
    const sc = ann.trackScroll;
    if(!sc || !sc.enabled) return;
    const path = _buildTrackPath(ann, cw, ch);
    if(!path || !path.segs.length) return;
    const texX0 = sc.textureX0 * cw;
    const texX1 = sc.textureX1 * cw;
    const texW = texX1 - texX0;
    const texY0 = sc.textureY0 * ch;
    const texY1 = sc.textureY1 * ch;
    const texH = texY1 - texY0;
    if(texW < 2 || texH < 2) return;
    const bandH = (sc.bandHeight || 0.08) * ch;
    const effDir = -sc.direction;
    const offsetPx = animTime * vel * effDir;
    const totalLen = path.totalLen;

    const upNormals = [];
    for(let i=0;i<path.pixPts.length;i++){
      let ux, uy;
      if(i === 0){ ux = path.pixPts[1].x - path.pixPts[0].x; uy = path.pixPts[1].y - path.pixPts[0].y; }
      else if(i === path.pixPts.length-1){ ux = path.pixPts[i].x - path.pixPts[i-1].x; uy = path.pixPts[i].y - path.pixPts[i-1].y; }
      else { ux = path.pixPts[i+1].x - path.pixPts[i-1].x; uy = path.pixPts[i+1].y - path.pixPts[i-1].y; }
      const len = Math.hypot(ux, uy) || 1;
      ux /= len; uy /= len;
      let nx = -uy, ny = ux;
      if(ny > 0){ nx = -nx; ny = -ny; }
      upNormals.push({ nx: nx, ny: ny });
    }
    const poly = [];
    for(let i=0;i<path.pixPts.length;i++) poly.push({ x: path.pixPts[i].x, y: path.pixPts[i].y });
    for(let i=path.pixPts.length-1;i>=0;i--) poly.push({ x: path.pixPts[i].x + upNormals[i].nx * bandH, y: path.pixPts[i].y + upNormals[i].ny * bandH });

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(poly[0].x, poly[0].y);
    for(let i=1;i<poly.length;i++) ctx.lineTo(poly[i].x, poly[i].y);
    ctx.closePath();
    ctx.clip();

    if(sc.useTexture){
      ctx.globalAlpha = sc.textureOpacity;
      const stepPx = 3;
      for(let s = 0; s < totalLen; s += stepPx){
        const s2 = Math.min(s + stepPx, totalLen);
        const chunkLen = s2 - s;
        if(chunkLen < 0.01) continue;
        let srcX = ((s + offsetPx) % texW + texW) % texW;
        if(srcX + chunkLen > texW){
          const firstLen = texW - srcX;
          const secondLen = chunkLen - firstLen;
          if(firstLen > 0.01) _drawPathQuad(ctx, img, path, s, firstLen, texX0+srcX, firstLen, texY0, texH);
          if(secondLen > 0.01) _drawPathQuad(ctx, img, path, s+firstLen, secondLen, texX0, secondLen, texY0, texH);
        } else {
          _drawPathQuad(ctx, img, path, s, chunkLen, texX0+srcX, chunkLen, texY0, texH);
        }
      }
      ctx.globalAlpha = 1;
    }

    if(sc.useStripes){
      const spacing = sc.spacing * cw;
      if(spacing >= 3){
        const darkW = spacing * 0.55;
        const strength = sc.stripeStrength || 1;
        const stepPx = 3;
        for(let s = 0; s < totalLen; s += stepPx){
          const chunkLen = Math.min(stepPx, totalLen - s);
          if(chunkLen < 0.01) continue;
          const midP = _samplePath(path.segs, s + chunkLen/2);
          if(!midP) continue;
          const texPos = ((s + chunkLen/2 + offsetPx) % spacing + spacing) % spacing;
          const isDark = texPos < darkW;
          const angle = Math.atan2(midP.ty, midP.tx);
          ctx.save();
          ctx.translate(midP.x, midP.y);
          ctx.rotate(angle);
          ctx.fillStyle = isDark ? 'rgba(0,0,0,'+(sc.darkAlpha*strength)+')' : 'rgba(255,255,255,'+(sc.lightAlpha*strength)+')';
          ctx.fillRect(0, 0, chunkLen, bandH);
          ctx.restore();
        }
      }
    }
    ctx.restore();
  }

  // 精确多边形裁切的门
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

  function _renderDoor(ctx, img, ann, door, cw, ch, openAngle){
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
      ctx.fillStyle = door.fillColor || '#000000';
      ctx.beginPath();
      ctx.moveTo(pts[0].x*cw, pts[0].y*ch);
      for(let i=1;i<pts.length;i++) ctx.lineTo(pts[i].x*cw, pts[i].y*ch);
      ctx.closePath();
      ctx.fill();
    } else {
      const clip = _makeDoorClip(img, pts, cw, ch);
      if(clip){
        ctx.drawImage(clip.canvas, clip.minX, clip.minY, clip.bw, clip.bh);
      }
    }
    ctx.restore();
  }

  function renderVehicle(ctx, id, x, y, w, h, animTime, opts){
    opts = opts || {};
    const ann = ANN[id];
    if(!ann) return;
    const img = _loadVehicleImg(id);
    if(!img.complete || !img.naturalWidth) return;
    const cw = w, ch = h;

    const hasTrack = ann.trackLine && ann.trackLine.points && ann.trackLine.points.length >= 2;
    const hasTrackScroll = ann.trackScroll && ann.trackScroll.enabled;

    ctx.save();
    ctx.translate(x, y);

    if(hasTrack && hasTrackScroll){
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, 0);
      const pts = ann.trackLine.points.slice().sort(function(a,b){ return a.x-b.x; });
      for(const p of pts) ctx.lineTo(p.x*cw, p.y*ch);
      ctx.lineTo(cw, 0);
      ctx.closePath();
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
      /* ★ 開門時先填充原始門洞為黑色（車內視覺），再繪製旋轉門 */
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
        for(const d of ann.doors.lower) _renderDoor(ctx, img, ann, d, cw, ch, doorOpen * (110 / 180));
      }
      if(ann.doors.upper && ann.doors.upper.length){
        for(const d of ann.doors.upper) _renderDoor(ctx, img, ann, d, cw, ch, doorOpen);
      }
      if(ann.doors.hatch && ann.doors.hatch.length){
        for(const d of ann.doors.hatch) _renderDoor(ctx, img, ann, d, cw, ch, doorOpen * 0.5);
      }
    }

    ctx.restore();
  }

  window.VehicleRenderer = { render: renderVehicle };

  /* ============ rev566: BTR 支援演出（日志按 region 出） ============ */
/* ============ BTR 支援演出 (rev566e) ============ */


  /* ============ BTR 支援演出 (rev566f) ============ */
  

  /* ============ BTR 支援演出 (rev567) ============ */
  

  /* ============ BTR 支援演出 (rev568) ============ */
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
  phase: 'enter', phaseT: 0,
  x: -1.5, yOffset: 0,
  doorX: -0.735, centerPX: -0.525, doorOffsetRatio: 0.48,
  targetH: 0, targetW: 0, sinkOffset: 0,
  canvas: null, ctx: null, width: 0, height: 0, dpr: 1, raf: null,
  supportRegion: null, routeCursor: { pathIdx: 0, nodeIdx: 0 },
  kills: {}, loot: [], killCount: 0, lastTickSec: -1,
  muzzles: [], fireFx: [], dustParticles: [],
  streamBgEl: null,
  playerClipH: 1.0, playerXOffset: 0,
  doorOpen: 0, shakeX: 0, shakeY: 0,
  _finished: false,

  start(vid) {
    if(this.active) return;
    this.vehicleId = vid || 'btr80';
    if(!ANN[this.vehicleId]) this.vehicleId = 'btr80';
    /* rev595: 依載具動態覆寫 BTR_TIMELINE.supportDur */
    if(typeof VEHICLES !== 'undefined' && VEHICLES[this.vehicleId] && typeof VEHICLES[this.vehicleId].supportDuration === 'number' && VEHICLES[this.vehicleId].supportDuration > 0){
      BTR_TIMELINE.supportDur = VEHICLES[this.vehicleId].supportDuration;
    } else {
      BTR_TIMELINE.supportDur = 30;
    }
    this.active = true;
    this.startTime = performance.now();
    this.phase = 'enter'; this.phaseT = 0;
    this.yOffset = 0; this.doorOpen = 0;
    this.shakeX = 0; this.shakeY = 0;
    this.sinkOffset = 0;
    this.kills = {}; this.loot = []; this.killCount = 0;
    this.lastTickSec = -1;
    this.fireFx = [];
    this.dustParticles = [];
    this.playerClipH = 1.0; this.playerXOffset = 0;
    this._finished = false;
    this._setupCanvas();
    this._setupStreamBg();
    this._setupMuzzles();
    this._setupSupportRegion();
    const self = this;
    this.raf = requestAnimationFrame(function(t){ self._loop(t); });
  },

  _setupSupportRegion() {
    const regions = (typeof getActiveRegions === 'function') ? getActiveRegions() : ['廢棄工廠'];
    const region = (state.activeRegion && regions.indexOf(state.activeRegion) !== -1) ? state.activeRegion : regions[0];
    this.supportRegion = region;
    const routes = ROUTES[region];
    const prog = state.regionProgress[region] || { pathIdx: 0, nodeIdx: 0 };
    this.routeCursor = routes ? { pathIdx: prog.pathIdx || 0, nodeIdx: (prog.nodeIdx || 0) + 1 } : { pathIdx: 0, nodeIdx: 0 };
  },

  _setupMuzzles() {
    const ann = ANN[this.vehicleId];
    this.muzzles = [];
    if(!ann || !ann.muzzles) return;
    for(const m of ann.muzzles){
      const prof = MUZZLE_PROFILES[m.weaponId] || MUZZLE_PROFILES.default;
      this.muzzles.push({
        weaponId: m.weaponId, mx: m.x, my: m.y,
        layerOrder: m.layerOrder === 'below' ? 'below' : 'above',
        profile: prof, shotsLeft: prof.burst, nextFireAt: 0
      });
    }
  },

  _setupStreamBg() {
    const zone = document.getElementById('zone1');
    if(!zone) return;
    /* 動態注入水平流線光束樣式（只注入一次） */
    if(!document.getElementById('btr-stream-bg-style')){
      const style = document.createElement('style');
      style.id = 'btr-stream-bg-style';
      style.textContent = [
        '.btr-stream-bg{position:absolute;inset:0;z-index:0;opacity:0;transition:opacity 0.45s ease-out;pointer-events:none;overflow:hidden;background:#08080a;}',
        '.btr-stream-bg.on{opacity:1;}',
        '.btr-streak{position:absolute;left:100%;height:2px;border-radius:1px;background:linear-gradient(to right,transparent 0%,rgba(200,200,200,0.65) 25%,rgba(245,245,245,0.95) 50%,rgba(200,200,200,0.65) 75%,transparent 100%);box-shadow:0 0 6px rgba(255,255,255,0.35);animation-name:btrStreakMove;animation-timing-function:linear;animation-iteration-count:infinite;will-change:transform;}',
        '@keyframes btrStreakMove{from{transform:translateX(0);}to{transform:translateX(-200vw);}}'
      ].join('\n');
      document.head.appendChild(style);
    }
    let el = document.getElementById('btr-stream-bg');
    if(!el){
      el = document.createElement('div');
      el.id = 'btr-stream-bg';
      el.className = 'btr-stream-bg';
      let streaks = '';
      for(let i = 0; i < 24; i++){
        const top = 5 + Math.random() * 90;
        const width = 12 + Math.random() * 32;
        const delay = Math.random() * 1.4;
        const duration = 0.5 + Math.random() * 0.8;
        const opacity = 0.3 + Math.random() * 0.55;
        const height = Math.random() < 0.25 ? 3 : 2;
        streaks += '<div class="btr-streak" style="top:' + top.toFixed(1) + '%;width:' + width.toFixed(1) + '%;height:' + height + 'px;opacity:' + opacity.toFixed(2) + ';animation-delay:' + delay.toFixed(2) + 's;animation-duration:' + duration.toFixed(2) + 's"></div>';
      }
      el.innerHTML = streaks;
      zone.appendChild(el);
    }
    this.streamBgEl = el;
    /* rev596: 切頁回來時恢復 on 狀態 */
    if(el){
      if(this.phase === 'support') el.classList.add('on');
      else el.classList.remove('on');
    }
  },

  _setupCanvas() {
    const zone = document.getElementById('zone1');
    if(!zone) return;
    let c = document.getElementById('btr-support-canvas');
    if(!c){ c = document.createElement('canvas'); c.id = 'btr-support-canvas'; zone.appendChild(c); }
    this.canvas = c;
    const dpr = window.devicePixelRatio || 1;
    const w = zone.clientWidth, h = zone.clientHeight;
    c.width = Math.floor(w * dpr); c.height = Math.floor(h * dpr);
    c.style.width = w + 'px'; c.style.height = h + 'px';
    this.ctx = c.getContext('2d');
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.width = w; this.height = h; this.dpr = dpr;
    const ann = ANN[this.vehicleId];
    if(ann){
      // ★ 依真實比例：BTR 含炮塔 ≈ 3.0m，人物 1.75m，人物在畫布中占 0.58h
      //   => BTR 約 3.0/1.75*0.58 = 0.994h；這裡取 0.99h 讓溢出自然可見
      this.targetH = h * 0.99;
      this.targetW = this.targetH * (ann.imageSize.w / ann.imageSize.h);
      const playerCenterX = w * (typeof EXPLORE_HERO_X_RATIO === 'number' ? EXPLORE_HERO_X_RATIO : 0.25);
      const doorPx = playerCenterX - this.doorOffsetRatio * this.targetW;
      this.doorX = doorPx / w;

      // ★ support 階段中心位置：優先保證炮口在屏幕內（尤其長炮管如 T-80）
      let maxMuzzleX = 0;
      if(ann.muzzles){
        for(const m of ann.muzzles){
          if(m.x > maxMuzzleX) maxMuzzleX = m.x;
        }
      }
      const MUZZLE_RIGHT_MARGIN = 12;
      const muzzleRightPx = maxMuzzleX * this.targetW;
      const centeredLeft = w / 2 - this.targetW / 2;
      // 若炮口右端將超出屏幕，左移 BTR 讓炮口剛好在右邊距內
      const maxAllowedLeft = w - MUZZLE_RIGHT_MARGIN - muzzleRightPx;
      const leftPx = Math.min(centeredLeft, maxAllowedLeft);
      this.centerPX = leftPx / w;

      // ★ 下沉量不是硬編碼 15%，而是「完整顯示頂部所需偏移量」的結果：
      const groundY = h * 0.95;
      const py0 = groundY - this.targetH;
      const TOP_MARGIN = 4;
      this.sinkOffset = py0 < TOP_MARGIN ? (TOP_MARGIN - py0) : 0;
    }
  },

  _loop(t) {
    if(!this.active) return;
    const now = performance.now();
    const el = (now - this.startTime) / 1000;
    this._update(el, now);
    this._render(now);
    const self = this;
    this.raf = requestAnimationFrame(function(tt){ self._loop(tt); });
  },

  _easeInOut(p) { return p < 0.5 ? 2*p*p : 1 - Math.pow(-2*p + 2, 2) / 2; },

  _update(t, now) {
    let acc = 0, curPhase = null, phaseT = 0;
    for(const p of PHASE_ORDER){
      if(t < acc + BTR_TIMELINE[p + 'Dur']){ curPhase = p; phaseT = t - acc; break; }
      acc += BTR_TIMELINE[p + 'Dur'];
    }
    if(!curPhase){
      curPhase = 'leave';
      phaseT = t - (acc - BTR_TIMELINE.leaveDur);
    }
    if(curPhase !== this.phase){ this._onPhaseEnter(curPhase); }
    this.phase = curPhase; this.phaseT = phaseT;

    if(curPhase === 'enter'){
      const p = phaseT / BTR_TIMELINE.enterDur;
      this.x = -1.5 + this._easeInOut(Math.min(1, p)) * (this.doorX - (-1.5));
      this.doorOpen = 0; this.yOffset = 0;
      this.playerClipH = 1.0; this.playerXOffset = 0;
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
      this.x = this.doorX; this.doorOpen = 0;
      const p = Math.min(1, phaseT / BTR_TIMELINE.sinkDur);
      this.yOffset = this._easeInOut(p) * this.sinkOffset;
    } else if(curPhase === 'center'){
      const p = Math.min(1, phaseT / BTR_TIMELINE.centerDur);
      this.x = this.doorX + this._easeInOut(p) * (this.centerPX - this.doorX);
      this.doorOpen = 0; this.yOffset = this.sinkOffset;
    } else if(curPhase === 'support'){
      this.x = this.centerPX; this.doorOpen = 0;
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
        try { this._finishSupportAndLog(); }
        catch(e){ console.error('[BTR finish error]', e); }
        finally {
          this._cleanup();
          this.active = false;
        }
      }
    }
  },

  _onPhaseEnter(phase) {
    if(phase === 'support'){
      this.lastTickSec = -1;
      if(this.streamBgEl) this.streamBgEl.classList.add('on');
      this._logRegionEntry();
    } else if(phase === 'lift'){
      if(this.streamBgEl) this.streamBgEl.classList.remove('on');
      /* 同步 routeCursor 到 regionProgress，讓背景圖在淡出時切換到 support 結束節點 */
      if(typeof state !== 'undefined' && state.regionProgress && typeof updateExploreBg === 'function'){
        state.regionProgress[this.supportRegion] = {
          pathIdx: this.routeCursor.pathIdx,
          nodeIdx: this.routeCursor.nodeIdx
        };
        requestAnimationFrame(function(){ try{ updateExploreBg(); }catch(e){} });
      }
    }
  },

  _logRegionEntry() {
    const vehName = (VEHICLES[this.vehicleId] && VEHICLES[this.vehicleId].name) || this.vehicleId;
    // ★ 統一玩家/載具樣式：<span class="pl">玩家</span> 乘坐 <span class="pl">載具</span> 在 <b>區域</b> 橫衝直撞
    pushLog('<span class="pl">玩家</span> 乘坐 <span class="pl">' + vehName + '</span> 在 <b>' + this.supportRegion + '</b> 橫衝直撞', [], 'explore');
    this._updateZoneTitle();
  },

  _updateZoneTitle() {
    const t = document.querySelector('#zone1 .zone-title');
    if(!t) return;
    const routes = ROUTES[this.supportRegion];
    if(!routes) return;
    const cur = routes[this.routeCursor.pathIdx];
    if(!cur) return;
    const node = cur.nodes[this.routeCursor.nodeIdx] || cur.nodes[0];
    t.innerHTML = '🧭 ' + this.supportRegion + ' · ' + cur.name + ' · ' + node;
  },

  _updateSupport(phaseT, now) {
    // ★ 與編輯器 getShakeOffset 完全一致的正弦連續抖動（低頻、連貫）
    this.shakeX = Math.sin(now / 40) * 1.5;
    this.shakeY = Math.cos(now / 55) * 1.2;
    const secNow = Math.floor(phaseT);
    if(secNow > this.lastTickSec){ this.lastTickSec = secNow; this._supportTick(now); }
    for(const m of this.muzzles){
      if(now >= m.nextFireAt) this._fireMuzzle(m, now);
    }
    for(let i = this.fireFx.length - 1; i >= 0; i--){
      if(now > this.fireFx[i].endTime) this.fireFx.splice(i, 1);
    }
  },

  _supportTick(now) {
    this._advanceNode();
    this._updateZoneTitle();
    const region = this.supportRegion;
    const n = (typeof rndInt === 'function') ? rndInt(1, 3) : (1 + Math.floor(Math.random() * 3));
    const enemies = (typeof genEnemies === 'function') ? genEnemies(region, n) : [];
    for(const e of enemies){
      this.kills[e.id] = (this.kills[e.id] || 0) + 1;
      this.killCount++;
      const dropN = (typeof rndInt === 'function') ? rndInt(1, 2) : (1 + Math.floor(Math.random() * 2));
      for(let i = 0; i < dropN; i++){
        const drop = (typeof rollRegionDrop === 'function') ? rollRegionDrop(region) : null;
        if(!drop) continue;
        let cnt = (itemCat(drop.id) === 'ammo') ? rndInt(3, 8) : (itemCat(drop.id) === 'material' ? rndInt(1, 4) : 1);
        cnt = applyDropBonus(cnt);
        invAdd(drop.id, drop.rarity, cnt);
        this.loot.push({ id: drop.id, rarity: drop.rarity, count: cnt });
      }
    }
  },

  _advanceNode() {
    const routes = ROUTES[this.supportRegion];
    if(!routes || !routes.length) return;
    const cur = routes[this.routeCursor.pathIdx];
    if(!cur) return;
    this.routeCursor.nodeIdx++;
    if(this.routeCursor.nodeIdx >= cur.nodes.length){
      this.routeCursor.pathIdx++;
      if(this.routeCursor.pathIdx >= routes.length){
        this.routeCursor.pathIdx = 0;
        this.routeCursor.nodeIdx = 0;
        this._switchToNextRegion();
      } else {
        this.routeCursor.nodeIdx = 0;
      }
    }
  },

  _switchToNextRegion() {
    const regions = (typeof getActiveRegions === 'function') ? getActiveRegions() : ['廢棄工廠'];
    const idx = regions.indexOf(this.supportRegion);
    const nextIdx = (idx + 1) % regions.length;
    const nextRegion = regions[nextIdx];
    if(nextRegion !== this.supportRegion){
      this.supportRegion = nextRegion;
      this._logRegionEntry();
    }
  },

  _fireMuzzle(m, now) {
    this.fireFx.push({
      mx: m.mx, my: m.my,
      startTime: now, endTime: now + 600,
      size: m.profile.flashSize,
      color: m.profile.flashColor,
      bulletSize: m.profile.bulletSize,
      bulletSpeed: m.profile.bulletSpeed,
      projectileType: m.profile.projectileType || 'bullet',
      layerOrder: m.layerOrder
    });
    m.shotsLeft--;
    if(m.shotsLeft <= 0){ m.shotsLeft = m.profile.burst; m.nextFireAt = now + m.profile.pauseMs; }
    else { m.nextFireAt = now + m.profile.intervalMs; }
  },

  _render(now) {
    const ctx = this.ctx;
    if(!ctx) return;
    ctx.clearRect(0, 0, this.width, this.height);
    const ann = ANN[this.vehicleId];
    if(!ann) return;
    const groundY = this.height * 0.95;
    const px = this.x * this.width + this.shakeX;
    const py = groundY - this.targetH + this.yOffset + this.shakeY;

    /* 1. below 火光 + 弹幕（在 BTR 之前绘制，被车体遮挡） */
    for(const fx of this.fireFx){
      if(fx.layerOrder !== 'below') continue;
      this._drawOneFireFx(ctx, fx, now, px, py);
    }

    /* 2. 扬尘生成（从轮胎底部卷起） */
    if(!this.dustParticles) this.dustParticles = [];
    const intensity = (this.phase === 'support') ? 0.8
                    : ((this.phase === 'enter' || this.phase === 'leave') ? 0.5
                    : (this.phase === 'center' ? 0.3 : 0));
    if(ann.wheels && intensity > 0 && Math.random() < intensity){
      const wheel = ann.wheels[Math.floor(Math.random() * ann.wheels.length)];
      const wheelCenterX = px + wheel.cx * this.targetW;
      const wheelRadiusPx = wheel.r * this.targetW;
      const wheelBottomY = py + wheel.cy * this.targetH + wheelRadiusPx * 0.98;
      if(wheelCenterX > -60 && wheelCenterX < this.width + 60){
        this.dustParticles.push({
          x: wheelCenterX + (Math.random() - 0.5) * wheelRadiusPx * 1.4,
          y: wheelBottomY + (Math.random() - 0.4) * 6,
          vx: -(1 + Math.random() * 2.5),
          vy: -(0.2 + Math.random() * 0.8),
          life: 1,
          size: 4 + Math.random() * 7,
          hue: 28 + Math.random() * 18
        });
      }
    }

    /* 3. BTR 本體 */
    const wheelSpeed = (this.phase === 'support') ? 20 : ((this.phase === 'enter' || this.phase === 'leave') ? 6 : 3);
    const trackVel = (this.phase === 'support') ? 300 : ((this.phase === 'enter' || this.phase === 'leave') ? 100 : 30);
    renderVehicle(ctx, this.vehicleId, px, py, this.targetW, this.targetH, (now - this.startTime) / 1000, {
      trackVel: trackVel, wheelSpeed: wheelSpeed,
      doorOpen: (this.doorOpen || 0) * 180
    });

    /* 4. above 火光 + 弹幕（在 BTR 之后绘制，盖在车体上） */
    for(const fx of this.fireFx){
      if(fx.layerOrder !== 'above') continue;
      this._drawOneFireFx(ctx, fx, now, px, py);
    }

    /* 5. 扬尘绘制（最上层，BTR 和火光之后） */
    for(let i = this.dustParticles.length - 1; i >= 0; i--){
      const p = this.dustParticles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.06;
      p.vx *= 0.98;
      p.life -= 0.014;
      if(p.life <= 0){ this.dustParticles.splice(i, 1); continue; }
      const alpha = Math.max(0, p.life) * 0.5;
      const sz = p.size * (1.4 - p.life * 0.5);
      ctx.fillStyle = 'hsla(' + p.hue + ',35%,48%,' + alpha + ')';
      ctx.beginPath();
      ctx.arc(p.x, p.y, sz, 0, Math.PI * 2);
      ctx.fill();
    }
  },

  _drawOneFireFx(ctx, fx, now, px, py) {
    const age = now - fx.startTime, total = fx.endTime - fx.startTime;
    if(age > total) return;
    const t = age / total;
    const x = px + fx.mx * this.targetW;
    const y = py + fx.my * this.targetH;
    if(t < 0.2){
      const ft = t / 0.2;
      const flashR = fx.size * (1 - ft * 0.6);
      const grad = ctx.createRadialGradient(x, y, 0, x, y, flashR);
      grad.addColorStop(0, 'rgba(' + fx.color + ',' + (1 - ft) + ')');
      grad.addColorStop(1, 'rgba(' + fx.color + ',0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, flashR, 0, Math.PI * 2);
      ctx.fill();
    }
    /* rev595: 區分 bullet 與 missile */
    const isMissile = fx.projectileType === 'missile';
    const bx = x + t * fx.bulletSpeed;
    const alpha = Math.max(0, 1 - t);
    if(isMissile){
      ctx.strokeStyle = 'rgba(220,220,220,' + (alpha * 0.5) + ')';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x + t * fx.bulletSpeed * 0.15, y);
      ctx.lineTo(bx - 8, y);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,90,30,' + (alpha * 0.95) + ')';
      ctx.beginPath();
      ctx.arc(bx - 7, y, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,210,120,' + alpha + ')';
      ctx.fillRect(bx - 5, y - 1.8, 10, 3.6);
      ctx.fillStyle = 'rgba(255,255,200,' + alpha + ')';
      ctx.beginPath();
      ctx.arc(bx + 4, y, 1.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.strokeStyle = 'rgba(' + fx.color + ',' + (alpha * 0.4) + ')';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + t * fx.bulletSpeed * 0.3, y);
      ctx.lineTo(bx, y);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,220,120,' + alpha + ')';
      ctx.beginPath();
      ctx.arc(bx, y, fx.bulletSize, 0, Math.PI * 2);
      ctx.fill();
    }
  },

  _finishSupportAndLog() {
    const exp = this.killCount * 10;
    if(exp > 0 && typeof _garageInitState === 'function'){
      const g = _garageInitState();
      if(g){
        g.vehicleExp[this.vehicleId] = (g.vehicleExp[this.vehicleId] || 0) + exp;
        if(typeof save === 'function') save();
      }
    }
    const vehName = (VEHICLES[this.vehicleId] && VEHICLES[this.vehicleId].name) || this.vehicleId;
    // ★ 載具名用 .pl，點擊提示用藍色虛線
    state.logs.push({
      t: Date.now(),
      html: '<span class="pl">' + vehName + '</span> 支援已離開，<span style="color:#4a90d9;text-decoration:underline;text-decoration-style:dotted">點擊查看詳情</span>',
      items: this.loot.slice(), type: 'btr',
      btrKills: Object.assign({}, this.kills), btrExp: exp,
      btrTotalKills: this.killCount, vehicleId: this.vehicleId
    });
    if(typeof currentTab !== 'undefined' && currentTab === 'explore' && typeof renderZone3Log === 'function'){
      renderZone3Log();
    }
    const t = document.querySelector('#zone1 .zone-title');
    if(t){
      const region = state.activeRegion || '';
      const cur = region ? getCurrentNode(region) : null;
      if(cur){
        const displayRegion = region.replace(/II$/, ' II');
        t.innerHTML = '🧭 ' + displayRegion + ' · ' + cur.node;
      }
    }
  },

  _cleanup() {
    if(this.raf){ cancelAnimationFrame(this.raf); this.raf = null; }
    if(this.canvas){ this.canvas.remove(); this.canvas = null; this.ctx = null; }
    if(this.streamBgEl){ this.streamBgEl.remove(); this.streamBgEl = null; }
    this.fireFx = []; this.muzzles = []; this.dustParticles = [];
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



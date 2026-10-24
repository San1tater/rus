// [rev874] 闭环履带渲染
// [rev873] 履带环扬尘与机炮节奏
// [rev871] 机炮节奏调整
// [rev868] 共用扬尘
// [rev856] 修正角度
// [rev855] 只看轮子转速
// [rev854] 修正参数下限
// [rev853] 只认轮子转速
// [rev852] 重构扬尘物理
// [rev851] 纯物理抛射
// [rev850] 烟尘滚滚
// [rev849] 烟尘滚滚
// [rev848] 曲面切向抛射扬尘
// [rev847] 引入风速
// [rev846] 统一抛射与扩散物理
// [rev845] 绝对安全修正
// [rev843] 纯滚动扬尘
// [rev842] 抛射角度修正
// [rev841] 车速与扬尘体量关系
// [rev840] 扬尘风速与方向修正
// [rev839] 修正扬尘生成点
// [rev838] 贴地渐变扬尘
// [rev837] 贴地抛射扬尘
// [rev836] 不规则扬尘
// [rev835] 优化扬尘位置
// [rev834] 原版扬尘恢复
// [rev833] 抛射扬尘
// [rev831] 真实物理扬尘
// [rev830] 扬尘复原
// [rev829] 每轮扬尘
// [rev810] 修复 spawnMissile 作用域与导弹绘制抖动
// [rev809] 獨立實體導彈與物理尾跡
// [rev808] ATGM 導彈尾跡（矩形、跟隨、抖動補償）
// [rev807] ATGM 專屬煙霧軌跡（更遠的擴散點與更長的噴射時間）
// [rev806] 擴大擴散覆蓋範圍，維持快速淡出
// [rev805] 擴大發射煙/擴散煙對比：擴散點更遠、更淡、消散更快
// [rev804] 擴散點基於物理尺寸（targetW），無邊界裁剪
// [rev803] 降低擴散煙透明度（alpha0 下調 + pow 3.0 恢復）
// [rev802] 擴散點前移對接 + 發射煙拉長 + 擴散煙加濃
// [rev801] 實拍物理：管退全程連續發射煙柱 + 向左擴散煙雲
// [rev800] 发射烟首帧在炮口 + 扩散烟可见度提高
// [rev799] 烟雾物理修复：管退全程持续喷出 + 首帧不跳过 + friction 时间基
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
  const maskKey = maskOn ? ann.trackMask.points.map(function(p){ return p.x.toFixed(3)+","+p.y.toFixed(3); }).join(";") : "off";
  const key = (img.src||"") + "|" + cw + "x" + ch + "|" + cx.toFixed(1) + "|" + cy.toFixed(1) + "|" + size + "|" + maskKey;
  if(_wheelClipCache.has(key)) return _wheelClipCache.get(key);
  
  const c = document.createElement("canvas"); c.width = size; c.height = size;
  const cc = c.getContext("2d");
  cc.save();
  cc.beginPath(); cc.arc(size/2, size/2, size/2-0.5, 0, Math.PI*2); cc.clip();
  cc.drawImage(img, -(cx - size/2), -(cy - size/2), cw, ch);
  cc.restore();
  
  if(maskOn){
    const pts = ann.trackMask.points.slice().sort(function(a,b){ return a.x-b.x; });
    cc.save();
    cc.globalCompositeOperation = "destination-out";
    cc.beginPath();
    cc.moveTo(pts[0].x * cw - (cx - size/2), -10);
    for(let i = 0; i < pts.length; i++){
      cc.lineTo(pts[i].x * cw - (cx - size/2), pts[i].y * ch - (cy - size/2));
    }
    cc.lineTo(pts[pts.length-1].x * cw - (cx - size/2), -10);
    cc.closePath();
    cc.fill();
    cc.restore();
    
    const maskY = _getMaskYAtX(ann, wheel.cx);
    const maskYInCanvas = maskY * ch - (cy - size/2);
    if(maskYInCanvas > 0.5 && maskYInCanvas < size - 0.5){
      const isLargeCut = maskYInCanvas > size / 2;
      if(isLargeCut){
        const fan = document.createElement("canvas");
        fan.width = size; fan.height = size;
        const fx = fan.getContext("2d");
        fx.save();
        fx.beginPath();
        fx.moveTo(size/2, size/2);
        fx.arc(size/2, size/2, size/2, Math.PI * 0.25, Math.PI * 0.75);
        fx.closePath();
        fx.clip();
        fx.drawImage(img, -(cx - size/2), -(cy - size/2), cw, ch);
        fx.restore();
        cc.save();
        cc.globalCompositeOperation = "destination-over";
        for(let i = 1; i <= 7; i++){
          cc.save();
          cc.translate(size/2, size/2);
          cc.rotate((Math.PI / 4) * i);
          cc.translate(-size/2, -size/2);
          cc.drawImage(fan, 0, 0);
          cc.restore();
        }
        cc.restore();
      } else {
        const temp = document.createElement("canvas");
        temp.width = size; temp.height = size;
        const tc = temp.getContext("2d");
        tc.drawImage(c, 0, 0);
        cc.save();
        cc.globalCompositeOperation = "destination-over";
        const angles = [15,-15,30,-30,45,-45,60,-60,90,-90];
        for(let k = 0; k < angles.length; k++){
          cc.save();
          cc.translate(size/2, size/2);
          cc.rotate(angles[k] * Math.PI/180);
          cc.translate(-size/2, -size/2);
          cc.drawImage(temp, 0, 0);
          cc.restore();
        }
        cc.restore();
      }
    }
  }
  
  cc.save();
  cc.globalCompositeOperation = "destination-in";
  cc.beginPath(); cc.arc(size/2, size/2, size/2-0.5, 0, Math.PI*2); cc.fill();
  cc.restore();
  
  _wheelClipCache.set(key, c);
  if(_wheelClipCache.size > 40) _wheelClipCache.delete(_wheelClipCache.keys().next().value);
  return c;
}

const _maskCache = new Map();
function _getMaskLayer(img, ann, cw, ch){
  if(!ann.trackMask || !ann.trackMask.enabled || ann.trackMask.points.length < 2) return null;
  const key = (img.src||"") + "|" + ann.trackMask.points.map(function(p){ return p.x.toFixed(3)+","+p.y.toFixed(3); }).join(";") + "|" + cw + "x" + ch;
  if(_maskCache.has(key)) return _maskCache.get(key);
  const c = document.createElement("canvas"); c.width = cw; c.height = ch;
  const cc = c.getContext("2d");
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
  let offset = (animTime * vel * dir) % dstTileW;
  if(offset < 0) offset += dstTileW;
  const steps = Math.ceil(totalLen / dstTileW) + 2;
  const ext = 1.5;

  /* ★ v3 band-only erase：只擦「沿弧長鋪 dstTileW、沿法線 dstTileH」的帶子 */
  ctx.save();
  ctx.globalCompositeOperation = "destination-out";
  ctx.fillStyle = "#000";
  for(let k = 0; k < steps; k++){
    const s0 = offset + k * dstTileW;
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

  /* ★ 用相同幾何填回紋理（源採樣用原圖尺寸、目標繪製用 canvas 尺寸） */
  ctx.save();
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

    const hasTrackLoop = ann.trackLoop && ann.trackLoop.points && ann.trackLoop.points.length >= 3;
    const hasTrackLine = ann.trackLine && ann.trackLine.points && ann.trackLine.points.length >= 2;
    const hasTrackScroll = ann.trackScroll && ann.trackScroll.enabled;

    if(hasTrackLoop && hasTrackScroll){
      ctx.drawImage(img, 0, 0, cw, ch);
      const vel = opts.trackVel || 60;
      _drawTrackBand(ctx, img, ann, cw, ch, animTime, vel);
    } else if(hasTrackLine && hasTrackScroll){
      ctx.save();
      let _maxY = 0;
      for(const _p of ann.trackLine.points){ if(_p.y > _maxY) _maxY = _p.y; }
      ctx.beginPath();
      ctx.rect(0, 0, cw, _maxY * ch);
      ctx.clip();
      ctx.drawImage(img, 0, 0, cw, ch);
      ctx.restore();
      const vel = opts.trackVel || 60;
      _drawTrackBand(ctx, img, ann, cw, ch, animTime, vel);
    } else {
      ctx.drawImage(img, 0, 0, cw, ch);
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
          ctx.drawImage(clip, -r, -r, r * 2, r * 2);
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
        for(const d of ann.doors.lower) _renderDoor(ctx, img, ann, d, cw, ch, doorOpen * (110 / 180), "#0c0c0c");
      }
      if(ann.doors.upper && ann.doors.upper.length){
        for(const d of ann.doors.upper) _renderDoor(ctx, img, ann, d, cw, ch, doorOpen, "#0c0c0c");
      }
      if(ann.doors.hatch && ann.doors.hatch.length){
        for(const d of ann.doors.hatch) _renderDoor(ctx, img, ann, d, cw, ch, doorOpen * 0.5, "#0c0c0c");
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

  // [rev868] 共用扬尘系统
  window.spawnDust = function(particles, px, py, wheel, targetW, targetH, wheelSpd) {
    const mult = (wheelSpd === 20) ? 1.5 : 1.0;
    const baseVx = -(5.0 + Math.random() * 4.0) * mult; // 强力的向左初速
    const baseVy = -(1.5 + Math.random() * 2.0) * mult;
    particles.push({
      x: px + wheel.cx * targetW + (Math.random() - 0.5) * wheel.r * targetW * 0.5,
      y: py + wheel.cy * targetH + wheel.r * targetW,
      vx: baseVx,
      vy: baseVy,
      life: 1,
      size: (6 + Math.random() * 10) * (wheelSpd === 20 ? 2.0 : 1.5),
      hue: 28 + Math.random() * 18
    });
  };
  window.updateAndDrawDust = function(ctx, particles, dt) {
    const step = dt * 60;
    for(let i = particles.length - 1; i >= 0; i--){
      const p = particles[i];
      p.x += p.vx * step;
      p.y += p.vy * step;
      p.vy += 0.08 * step; // 重力
      p.vx *= Math.pow(0.97, step); // 阻力
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
  '2a72':  { burst: 7,  intervalMs: 200,  pauseMs: 1500, flashSize: 32, flashColor: '255,180,60',  bulletSize: 4.5, bulletSpeed: 380, projectileType: 'bullet' },
  '2a42':  { burst: 7,  intervalMs: 180,  pauseMs: 1500, flashSize: 34, flashColor: '255,180,60',  bulletSize: 4.5, bulletSpeed: 400, projectileType: 'bullet' },
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
    // [rev799] 发射烟（激波）：单个粒子，由 _updateRecoilSmoke 在 t=0 调用
    // 不设 skipUpdate —— 首帧被 fx.update 推进到炮口前方 125~250px，不遮挡炮口
    // [rev801] 發射煙：高不透明度柱狀射流
    // [rev802] 發射煙：拉長錐形，連接擴散點
    spawnJetOne(x, y, weaponId) {
      const _base = 300;
      const isHeavy = (weaponId === '2a46' || weaponId === '2a46m1' || weaponId === 'atgm');
      const isATGM = (weaponId === 'atgm');
      if (isATGM) {
        // ATGM 專屬：扁平矩形柱狀噴射
        this.smoke.push({
          x: x + 15, y: y,
          vx: _base * 30, vy: (Math.random() - 0.5) * _base * 0.02, // 縱向極小
          life: 1, rate: 1 / 0.25,
          sizeX: _base * 0.2, sizeY: _base * 0.02,
          growX: _base * 4.0, growY: _base * 0.1, // Y 幾乎不長，保持柱狀
          alpha0: 1.0, isJet: true, isCore: true,
          friction: 0.7,
          angle: 0, spin: 0, worldFactor: 0.1,
          skipUpdate: true
        });
      } else if (isHeavy) {
        this.smoke.push({
          x: x + 15, y: y,
          vx: _base * 25, vy: (Math.random() - 0.5) * _base * 0.1,
          life: 1, rate: 1 / 0.25,
          sizeX: _base * 0.15, sizeY: _base * 0.05,
          growX: _base * 10.0, growY: _base * 2.0,
          alpha0: 1.0, isJet: true, isCore: true,
          friction: 0.7,
          angle: 0, spin: 0, worldFactor: 0.1,
          skipUpdate: true
        });
      } else {
        this.smoke.push({
          x: x + 10, y: y,
          vx: _base * 18, vy: (Math.random() - 0.5) * _base * 0.05,
          life: 1, rate: 1 / 0.2,
          sizeX: _base * 0.1, sizeY: _base * 0.03,
          growX: _base * 8.0, growY: _base * 1.5,
          alpha0: 1.0, isJet: true, isCore: true,
          friction: 0.7,
          angle: 0, spin: 0, worldFactor: 0.1,
          skipUpdate: true
        });
      }
    },
    // [rev799] 扩散烟：单个粒子，由 _updateRecoilSmoke 在管退全程按进度调用
    // 设 skipUpdate: true —— 首帧不推进，fx.draw 第一次就画在「当时炮口」位置
    // [rev801] 擴散煙：向左（車尾方向）擴散，半透明
    // [rev802] 擴散煙：半透明，原地爆開膨脹後向左拖曳
    // [rev803] 擴散煙：半透明（降低 alpha0），原地爆開膨脹後向左拖曳
    // [rev805] 擴散煙：極淡、快速消散、向後拖曳
    // [rev806] 擴散煙：長壽命確保覆蓋範圍，高 grow 快速膨脹，pow 4.0 快速淡出
    spawnSpreadOne(x, y, weaponId) {
      const _base = 300;
      const isHeavy = (weaponId === '2a46' || weaponId === '2a46m1' || weaponId === 'atgm');
      if (isHeavy) {
        this.smoke.push({
          x: x + (Math.random() - 0.5) * _base * 0.2, 
          y: y + (Math.random() - 0.5) * _base * 0.2,
          vx: (Math.random() - 0.5) * _base * 0.5, 
          vy: (Math.random() - 0.5) * _base * 0.5,
          life: 1, rate: 1 / (2.0 + Math.random() * 0.8), // 恢復長壽命 2.0~2.8s
          sizeX: _base * 0.3, sizeY: _base * 0.3,
          growX: _base * 3.5, growY: _base * 3.5, // 加快膨脹
          alpha0: 0.22, isJet: false, isCore: false,
          friction: 0.92,
          angle: Math.random() * 6.28, spin: (Math.random() - 0.5) * 0.5,
          worldFactor: 1.5,
          skipUpdate: true
        });
      } else {
        this.smoke.push({
          x: x + (Math.random() - 0.5) * _base * 0.2, 
          y: y + (Math.random() - 0.5) * _base * 0.15,
          vx: (Math.random() - 0.5) * _base * 0.4,
          vy: (Math.random() - 0.5) * _base * 0.4,
          life: 1, rate: 1 / (1.5 + Math.random() * 0.6), // 恢復長壽命 1.5~2.1s
          sizeX: _base * 0.2, sizeY: _base * 0.2,
          growX: _base * 2.5, growY: _base * 2.5, // 加快膨脹
          alpha0: 0.18, isJet: false, isCore: false,
          friction: 0.94,
          angle: Math.random() * 6.28, spin: (Math.random() - 0.5) * 0.5,
          worldFactor: 1.5,
          skipUpdate: true
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
    spawnMissileJet(x, y) {
      // 導彈推力尾焰：短暫、不膨脹、完全覆蓋
      this.smoke.push({
        x: x - 15, y: y,
        vx: -100, vy: (Math.random() - 0.5) * 6,
        life: 1, rate: 1 / 0.15,
        sizeX: 20, sizeY: 8,
        growX: 0, growY: 0, // 不膨脹
        alpha0: 1.0, isJet: true, isCore: true,
        friction: 0.8,
        angle: 0, spin: 0, worldFactor: 0.5,
        skipUpdate: true
      });
    },
    spawnMissileSpread(x, y) {
      // 導彈擴散尾跡：半透明、長壽命、緩慢膨脹
      this.smoke.push({
        x: x - 20 + (Math.random() - 0.5) * 20,
        y: y + (Math.random() - 0.5) * 10,
        vx: -50 + Math.random() * 20,
        vy: (Math.random() - 0.5) * 20,
        life: 1, rate: 1 / (2.0 + Math.random() * 1.0), // 壽命 2~3 秒
        sizeX: 15, sizeY: 15,
        growX: 30, growY: 30,
        alpha0: 0.35, isJet: false, isCore: false,
        friction: 0.95,
        angle: Math.random() * 6.28, spin: (Math.random() - 0.5) * 0.5,
        worldFactor: 1.5,
        skipUpdate: true
      });
    },

    update(now, dt, worldSpeed) {
      for (let i = this.smoke.length - 1; i >= 0; i--) {
        const p = this.smoke[i];
        // [rev799] 首帧不推进（扩散烟专用：让首次 draw 画在出生点）
        if (p.skipUpdate) { p.skipUpdate = false; continue; }
        const driftSpeed = worldSpeed * (p.worldFactor || 0);
        p.x += (p.vx - driftSpeed) * dt; 
        p.y += p.vy * dt;
        // [rev799] friction 时间基：任何帧率下衰减曲线等效 60fps
        const _fric = Math.pow(p.friction, dt * 60);
        p.vx *= _fric;
        p.vy *= _fric;
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
          a = p.alpha0 * Math.pow(Math.max(0, p.life), 4.0); // rev805 加快消散 // rev803 恢復快速淡出 
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
    this.fireFx = []; this.dustParticles = []; this.fx.smoke = []; this.fx.tracers = []; this.recoilStates = {}; this.missiles = [];
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
    
    // 生成烟雾（[rev799] 机炮/主炮/ATGM 改由 _updateRecoilSmoke 按管退进度逐帧生成）
    if (isMG) {
      this.fx.spawnMG(muzzleX, muzzleY);
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
    const isATGM = (m.weaponId === 'atgm');
    this.recoilStates[m.weaponId] = {
      startTime: now, duration: rcDur, dist: rcDist,
      _smokeActive: !isMG && !isATGM, // ATGM 不在此處生成
      _lastJetTime: now,
      _lastSpreadTime: now,
      _staticMuzzleX: muzzleX,
      _muzzleY: muzzleY,
      _isMain: isMain
    };
    
    if (isATGM) {
      this.missiles.push({
        x: muzzleX, y: muzzleY,
        startTime: now,
        lastJetTime: now,
        lastSpreadTime: now,
        speed: this.width * 0.8 // 約 1.25 秒飛出螢幕
      });
    }
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

  // [rev799] 管退全程持续生成烟雾：位置跟随「当时炮口」
  // 发射烟 t=0 一次（原位），扩散烟按管退进度 p ∈ [0.05, 0.98] 均匀分布
  // [rev801] 管退全程持續生成發射煙與擴散煙
  // [rev802] 管退全程持續生成，擴散點前移對接發射煙
  // [rev804] 擴散點基於物理尺寸（targetW），無論是否出界皆完整計算
  // [rev805] 擴散點拉遠，與發射煙區隔
  _updateRecoilSmoke(now) {
    // 實時計算基礎座標（包含抖動），修正位置脫節
    const basePx = this.x * this.width + this.shakeX;
    const basePy = this.height * 0.95 - (this._contentBottomRatio || 1) * this.targetH + this.yOffset + this.shakeY;
    
    for (const m of this.muzzles) {
      const rs = this.recoilStates[m.weaponId];
      if (!rs || !rs._smokeActive) continue;
      const t = now - rs.startTime;
      if (t < 0) continue;
      
      const p = Math.min(1, t / rs.duration);
      const _rcP = p < 0.08 ? p / 0.08 : Math.pow(1 - (p - 0.08) / 0.92, 2.4);
      const _rcPx = rs.dist * this.targetW * _rcP;
      
      // 實時炮口位置
      const _muzzleXNow = basePx + m.mx * this.targetW - _rcPx;
      const _muzzleYNow = basePy + m.my * this.targetH;
      
      const isMain = rs._isMain;
      const JET_INTERVAL = isMain ? 16 : 24;
      const SPREAD_INTERVAL = isMain ? 24 : 32;
      const JET_MAX_TIME = isMain ? 150 : 250;
      
      // 導彈飛行位移：每秒前進 8 個車身寬度
      const _jetXNow = _muzzleXNow;
      const _jetYNow = _muzzleYNow;
      
      while (now - rs._lastJetTime >= JET_INTERVAL && t <= JET_MAX_TIME) {
        this.fx.spawnJetOne(_jetXNow, _jetYNow, m.weaponId);
        rs._lastJetTime += JET_INTERVAL;
      }
      
      const SPREAD_OFFSET = isMain ? this.targetW * 0.45 : this.targetW * 0.25;
      const _spreadXNow = _muzzleXNow + SPREAD_OFFSET;
      while (now - rs._lastSpreadTime >= SPREAD_INTERVAL && t <= rs.duration) {
        this.fx.spawnSpreadOne(_spreadXNow, _muzzleYNow, m.weaponId);
        rs._lastSpreadTime += SPREAD_INTERVAL;
      }
      
      if (t > rs.duration) {
        rs._smokeActive = false;
      }
    }
  },

  _updateMissiles(now, dt) {
    if (!this.missiles || !this.missiles.length) return;
    for (let i = this.missiles.length - 1; i >= 0; i--) {
      const mis = this.missiles[i];
      mis.x += mis.speed * dt;
      
      if (mis.x > this.width + 200 || now - mis.startTime > 3000) {
        this.missiles.splice(i, 1);
        continue;
      }
      
      if (now - mis.lastJetTime >= 16) {
        mis.lastJetTime = now;
        this.fx.spawnMissileJet(mis.x, mis.y);
      }
      if (now - mis.lastSpreadTime >= 30) {
        mis.lastSpreadTime = now;
        this.fx.spawnMissileSpread(mis.x, mis.y);
      }
    }
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
    const dt = Math.min(0.05, (now - (this._lastTick || now)) / 1000); this._lastTick = now;
    this._updateMissiles(now, dt); const worldSpeed = this._getBTRWorldSpeed();
    
    // [rev799] 管退全程持续生成烟雾（位置跟随当时炮口），回位时停止
    this._updateRecoilSmoke(now);
    this.fx.update(now, dt, worldSpeed);
    
    renderVehicle(ctx, this.vehicleId, px, py, this.targetW, this.targetH, (now - this.startTime) / 1000, { trackVel: (this.phase === 'support') ? 300 : 100, wheelSpeed: (this.phase === 'support') ? 20 : 6, doorOpen: (this.doorOpen || 0) * 180, recoils: recoilsPx });
    
    // [rev809] 繪製佔位導彈實體
    if (this.missiles && this.missiles.length) {
      for (const mis of this.missiles) {
        ctx.save();
        ctx.translate(mis.x + this.shakeX, mis.y + this.shakeY);
        // 尾焰
        ctx.fillStyle = 'rgba(255, 200, 50, 0.8)';
        ctx.beginPath();
        ctx.moveTo(-15, 0);
        ctx.lineTo(-30 - Math.random()*10, -4);
        ctx.lineTo(-30 - Math.random()*10, 4);
        ctx.closePath();
        ctx.fill();
        // 彈體
        ctx.fillStyle = '#ddd';
        ctx.beginPath();
        ctx.ellipse(0, 0, 12, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
    
    this.fx.draw(ctx);
    for (const fx of this.fireFx) { 
      if (fx.layerOrder !== 'above') continue; 
      this._drawOneFireFx(ctx, fx, now, px, py); 
    }
    
this.fx.drawTracers(ctx, now);
    
    // [rev868] 使用共用扬尘系统
    if(!this.dustParticles) this.dustParticles = [];
    const wheelSpd = (this.phase === 'support') ? 20 : 6;
    const intensity = (wheelSpd === 20) ? 1.0 : 0.6;
    if(intensity > 0 && Math.random() < intensity){
      let _dustSrc = null;
      // [rev873] 优先使用 trackLoop（闭合环）的底部点生成扬尘
      if (ann.trackLoop && ann.trackLoop.points && ann.trackLoop.points.length >= 2) {
        const pts = ann.trackLoop.points;
        const bottomPts = pts.filter(function(p){ return p.y > 0.4; });
        const srcPt = bottomPts.length ? bottomPts[Math.floor(Math.random() * bottomPts.length)] : pts[Math.floor(Math.random() * pts.length)];
        _dustSrc = { cx: srcPt.x, cy: srcPt.y, r: 0.015 };
      } else if (ann.wheels && ann.wheels.length > 0) {
        _dustSrc = ann.wheels[Math.floor(Math.random() * ann.wheels.length)];
      }
      if(_dustSrc) window.spawnDust(this.dustParticles, px, py, _dustSrc, this.targetW, this.targetH, wheelSpd);
    }
    window.updateAndDrawDust(ctx, this.dustParticles, dt);
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
    this.fireFx = []; this.muzzles = []; this.dustParticles = []; this.fx.smoke = []; this.fx.tracers = []; this.missiles = [];
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

  



  /* ============================================================
     [rev884] 炮口煙共用：BTRSupport.fx 與掃蕩模式都調用這 4 個函數
     ============================================================ */
  window.MUZZLE_PROFILES = MUZZLE_PROFILES;

  window._vsMakeSmokeJet = function(x, y, weaponId){
    const _base = 300;
    const isHeavy = (weaponId === '2a46' || weaponId === '2a46m1' || weaponId === 'atgm');
    const isATGM = (weaponId === 'atgm');
    if (isATGM) {
      return { x: x + 15, y: y, vx: _base * 30, vy: (Math.random() - 0.5) * _base * 0.02,
        life: 1, rate: 1 / 0.25, sizeX: _base * 0.2, sizeY: _base * 0.02,
        growX: _base * 4.0, growY: _base * 0.1, alpha0: 1.0, isJet: true, isCore: true,
        friction: 0.7, angle: 0, spin: 0, worldFactor: 0.1, skipUpdate: true };
    }
    if (isHeavy) {
      return { x: x + 15, y: y, vx: _base * 25, vy: (Math.random() - 0.5) * _base * 0.1,
        life: 1, rate: 1 / 0.25, sizeX: _base * 0.15, sizeY: _base * 0.05,
        growX: _base * 10.0, growY: _base * 2.0, alpha0: 1.0, isJet: true, isCore: true,
        friction: 0.7, angle: 0, spin: 0, worldFactor: 0.1, skipUpdate: true };
    }
    return { x: x + 10, y: y, vx: _base * 18, vy: (Math.random() - 0.5) * _base * 0.05,
      life: 1, rate: 1 / 0.2, sizeX: _base * 0.1, sizeY: _base * 0.03,
      growX: _base * 8.0, growY: _base * 1.5, alpha0: 1.0, isJet: true, isCore: true,
      friction: 0.7, angle: 0, spin: 0, worldFactor: 0.1, skipUpdate: true };
  };

  window._vsMakeSmokeSpread = function(x, y, weaponId){
    const _base = 300;
    const isHeavy = (weaponId === '2a46' || weaponId === '2a46m1' || weaponId === 'atgm');
    if (isHeavy) {
      return { x: x + (Math.random() - 0.5) * _base * 0.2, y: y + (Math.random() - 0.5) * _base * 0.2,
        vx: (Math.random() - 0.5) * _base * 0.5, vy: (Math.random() - 0.5) * _base * 0.5,
        life: 1, rate: 1 / (2.0 + Math.random() * 0.8), sizeX: _base * 0.3, sizeY: _base * 0.3,
        growX: _base * 3.5, growY: _base * 3.5, alpha0: 0.22, isJet: false, isCore: false,
        friction: 0.92, angle: Math.random() * 6.28, spin: (Math.random() - 0.5) * 0.5,
        worldFactor: 1.5, skipUpdate: true };
    }
    return { x: x + (Math.random() - 0.5) * _base * 0.2, y: y + (Math.random() - 0.5) * _base * 0.15,
      vx: (Math.random() - 0.5) * _base * 0.4, vy: (Math.random() - 0.5) * _base * 0.4,
      life: 1, rate: 1 / (1.5 + Math.random() * 0.6), sizeX: _base * 0.2, sizeY: _base * 0.2,
      growX: _base * 2.5, growY: _base * 2.5, alpha0: 0.18, isJet: false, isCore: false,
      friction: 0.94, angle: Math.random() * 6.28, spin: (Math.random() - 0.5) * 0.5,
      worldFactor: 1.5, skipUpdate: true };
  };

  window._vsUpdateSmoke = function(particles, dt, worldSpeed){
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      if (p.skipUpdate) { p.skipUpdate = false; continue; }
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
      if (p.life <= 0) particles.splice(i, 1);
    }
  };

  window._vsDrawSmoke = function(ctx, particles){
    for (const p of particles) {
      let a = 0;
      if (p.isJet) {
        a = p.alpha0 * Math.pow(Math.max(0, p.life), 2.0);
      } else {
        a = p.alpha0 * Math.pow(Math.max(0, p.life), 4.0);
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
  };

  /* 改造 BTRSupport.fx 使用共用函數 */
  BTRSupport.fx.spawnJetOne = function(x, y, weaponId){ this.smoke.push(window._vsMakeSmokeJet(x, y, weaponId)); };
  BTRSupport.fx.spawnSpreadOne = function(x, y, weaponId){ this.smoke.push(window._vsMakeSmokeSpread(x, y, weaponId)); };
  BTRSupport.fx.update = function(now, dt, worldSpeed){ window._vsUpdateSmoke(this.smoke, dt, worldSpeed); };
  BTRSupport.fx.draw = function(ctx){ window._vsDrawSmoke(ctx, this.smoke); };
})();
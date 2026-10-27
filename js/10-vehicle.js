// ★ v94：无画蛇添足
// ★ v93：精准恢复发射筒
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
  // ★ v122：补全 BMP 标注挂载
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
      t80um:  typeof VEHICLE_ANNOTATION_T80UM  !== 'undefined' ? VEHICLE_ANNOTATION_T80UM  : null,
      // ★ 补全 BMP 系列
      bmp1:   typeof VEHICLE_ANNOTATION_BMP1   !== 'undefined' ? VEHICLE_ANNOTATION_BMP1   : null,
      bmp1m:  typeof VEHICLE_ANNOTATION_BMP1M  !== 'undefined' ? VEHICLE_ANNOTATION_BMP1M  : null,
      bmp2:   typeof VEHICLE_ANNOTATION_BMP2   !== 'undefined' ? VEHICLE_ANNOTATION_BMP2   : null,
      bmp3:   typeof VEHICLE_ANNOTATION_BMP3   !== 'undefined' ? VEHICLE_ANNOTATION_BMP3   : null,
      bmd4:   typeof VEHICLE_ANNOTATION_BMD4   !== 'undefined' ? VEHICLE_ANNOTATION_BMD4   : null
    };
  }
  const ANN = window.VEHICLE_ANNOTATIONS;

  if(typeof window.VEHICLE_REAL_HEIGHTS === 'undefined'){
    window.VEHICLE_REAL_HEIGHTS = {
      btr80: 2.41, btr80a: 2.80, btr82: 2.725, btr82a: 2.725, btr90: 2.98,
      t80: 2.74, t80b: 2.74, t80bv: 2.74, t80u: 2.74, t80uk: 2.74, t80um: 2.74,
      bmp1: 2.15, bmp1m: 2.25, bmp2: 2.45, bmp3: 2.40, bmd4: 2.17
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

  function _isImgReady(src){
  if(!src) return false;
  if(typeof HTMLCanvasElement !== "undefined" && src instanceof HTMLCanvasElement) return src.width > 0 && src.height > 0;
  return !!(src.complete && src.naturalWidth);
}
function _getSrcKey(src){
  if(!src) return "";
  if(src._baseId) return src._baseId;
  return src.src || "";
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
  /* [v60-fix] 補齊編輯器 cutY_B / finalCutY / maxWheelCy 邏輯
     解決 BMP / BMD / T-80 車輪上部在車體上緣露出的問題。
     複刻編輯器 getWheelClipCanvas：
       cutY_A = getMaskYAtX(中心)
       cutY_B = getPolygonTopYAtX(中心) + texH
       finalCutY = max(cutY_A, cutY_B) ∩ ≤ maxWheelCyY ∩ ≤ size/2
       fillRect 挖空 + fan/angles 鏡像補全 */
  const cx = wheel.cx * cw;
  const cy = wheel.cy * ch;
  const r = wheel.r * cw;
  const size = Math.ceil(r*2);
  if(size < 3) return null;
  if(!_isImgReady(img)) return null;
  
  const maskOn = ann.trackMask && ann.trackMask.enabled;
  const loopOn = ann.trackLoop && ann.trackLoop.points && ann.trackLoop.points.length >= 3;
  const maskKey = maskOn ? ann.trackMask.points.map(function(p){ return p.x.toFixed(3)+","+p.y.toFixed(3); }).join(";") : "off";
  const loopKey = loopOn ? ann.trackLoop.points.map(function(p){ return p.x.toFixed(3)+","+p.y.toFixed(3); }).join(";") : "off";
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
  cc.beginPath(); cc.arc(size/2, size/2, size/2-0.5, 0, Math.PI*2); cc.clip();
  cc.drawImage(img, -(cx - size/2), -(cy - size/2), cw, ch);
  cc.restore();
  
  /* ── 計算 cutY_A（trackMask 中心處 Y） ── */
  let cutY_A = -1;
  if(maskOn && ann.trackMask.points.length >= 2){
    cutY_A = _getMaskYAtX(ann, wheel.cx) * ch - (cy - size/2);
  }
  
  /* ── 計算 cutY_B（trackLoop 上邊界 + texH） ── */
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
  
  /* ── maxWheelCy 限制（不超過最底車輪中心） ── */
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
  
  /* ── fillRect 挖空 + fan/angles 鏡像補全（複刻編輯器） ── */
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
      fx.arc(size/2, size/2, size/2, Math.PI*0.25, Math.PI*0.75);
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
        cc.rotate(angles[k] * Math.PI/180);
        cc.translate(-size/2, -size/2);
        cc.drawImage(temp, 0, 0);
        cc.restore();
      }
      cc.restore();
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
  const key = _getSrcKey(img) + "|" + ann.trackMask.points.map(function(p){ return p.x.toFixed(3)+","+p.y.toFixed(3); }).join(";") + "|" + cw + "x" + ch;
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
  /* [v59-fix] 復刻編輯器邏輯：擦除 + 整圖法線平移填補 + tile紋理疊加
     修復所有 trackLoop 車輛（BMP1/1M/2/3/BMD4、T-80 系列）車體上緣透明問題
     原理：擦除後先用「整張原圖沿法線反向平移 dstTileH」填補擦除區
     再疊加 tile 紋理做滾動動畫，等效編輯器 drawTrackErasePatchBase + drawTrackScrollByLoop */
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

  /* 複刻編輯器：limitY = 履帶環垂直中線（車體邊界） */
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

  /* ── 外層 clip：只在 trackLoop 多邊形內操作，防止 wrap 溢出 ── */
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(rawPts[0].x, rawPts[0].y);
  for(let i = 1; i < n; i++) ctx.lineTo(rawPts[i].x, rawPts[i].y);
  ctx.closePath();
  ctx.clip();

  /* ── 步驟 1：擦除原圖履帶帶子 ── */
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

  /* ── 步驟 2：整圖法線平移填補（複刻編輯器 drawTrackErasePatchBase）
     對每塊 tile 平行四邊形 clip 到「tile區 ∩ limitY以下」，
     將整張原圖沿平均法線反向平移 dstTileH 後繪製，
     把「原圖中位於帶子法線下方的像素」拉到帶子位置，
     恢復車體上緣細節，避免透明。 ── */
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
    /* 只填到車體中線以下，複刻編輯器 */
    ctx.beginPath();
    ctx.rect(0, 0, W, limitY);
    ctx.clip();
    /* 平均法線 */
    let mx = (na.nx + nb.nx) / 2, my = (na.ny + nb.ny) / 2;
    const _mlen = Math.hypot(mx, my) || 1;
    mx /= _mlen; my /= _mlen;
    /* 整圖沿法線反向平移，覆蓋擦除區 */
    ctx.translate(-mx * dstTileH, -my * dstTileH);
    ctx.drawImage(img, 0, 0, W, H);
    ctx.restore();
  }

  /* ── 步驟 3：tile 紋理滾動疊加（可選，用於履帶紋理動畫） ── */
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

  ctx.restore(); /* 外層 clip */
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

    var _drawSrc = (opts && opts.baseImage) || img;

    
  // ★ v85：融合门绘制（显示门内测，纯色多边形，在原图之前绘制）
  if (ann.doors && ann.doors.fusion && ann.doors.fusion.length > 0) {
    const doorOpen = opts.doorOpen || 0;
    for (const d of ann.doors.fusion) {
      if (!d.polygon || d.polygon.length < 3) continue;
      const ang = 90 - doorOpen * 0.5; 
      const cosA = Math.cos(ang * Math.PI / 180);
      if (Math.abs(cosA) < 0.05) continue; // 压成直线时跳过

      const pts = d.polygon;
      const x1 = d.hingeP1.x * cw, y1 = d.hingeP1.y * ch;
      const x2 = d.hingeP2.x * cw, y2 = d.hingeP2.y * ch;
      if (Math.hypot(x2 - x1, y2 - y1) < 0.01) continue;

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
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x * cw, pts[i].y * ch);
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
  kpvt:    { burst: 5,  intervalMs: 100,   pauseMs: 300,   flashSize: 26, flashColor: '255,200,80',  bulletSize: 3.5, bulletSpeed: 450, projectileType: 'bullet' },
  pkt:     { burst: 5,  intervalMs: 80,    pauseMs: 300,   flashSize: 22, flashColor: '255,220,120', bulletSize: 3,   bulletSpeed: 480, projectileType: 'bullet' },
  nsvt:    { burst: 5,  intervalMs: 80,    pauseMs: 300,   flashSize: 24, flashColor: '255,220,120', bulletSize: 3.5, bulletSpeed: 470, projectileType: 'bullet' },
  '2a72':  { burst: 8, intervalMs: 300,   pauseMs: 600,   flashSize: 32, flashColor: '255,180,60',  bulletSize: 4.5, bulletSpeed: 380, projectileType: 'bullet' },
  '2a42':  { burst: 8, intervalMs: 150,   pauseMs: 600,   flashSize: 34, flashColor: '255,180,60',  bulletSize: 4.5, bulletSpeed: 400, projectileType: 'bullet' },
  '2a46':  { burst: 1,  intervalMs: 7500,  pauseMs: 7500,  flashSize: 40, flashColor: '255,140,60',  bulletSize: 6,   bulletSpeed: 300, projectileType: 'bullet' },
  '2a46m1':{ burst: 1,  intervalMs: 7500,  pauseMs: 7500,  flashSize: 40, flashColor: '255,140,60',  bulletSize: 6,   bulletSpeed: 300, projectileType: 'bullet' },
  atgm:    { burst: 1,  intervalMs: 20000, pauseMs: 20000, flashSize: 30, flashColor: '255,200,100', bulletSize: 5,   bulletSpeed: 280, projectileType: 'missile' },
  '2a28':  { burst: 1,  intervalMs: 6000,  pauseMs: 6000,  flashSize: 36, flashColor: '255,150,60',  bulletSize: 5.5, bulletSpeed: 320, projectileType: 'bullet' },
  '2a70':  { burst: 1,  intervalMs: 6000,  pauseMs: 6000,  flashSize: 38, flashColor: '255,145,60',  bulletSize: 5.5, bulletSpeed: 310, projectileType: 'bullet' },
  default: { burst: 3,  intervalMs: 100,   pauseMs: 300,   flashSize: 22, flashColor: '255,200,80',  bulletSize: 3.5, bulletSpeed: 450, projectileType: 'bullet' }
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
    spawnJetOne(x, y, weaponId) {
      const _base = 300;
      const isHeavy = (weaponId === '2a46' || weaponId === '2a46m1' || weaponId === 'atgm');
      const isATGM = (weaponId === 'atgm');
      if (isATGM) {
        this.smoke.push({
          x: x + 15, y: y,
          vx: _base * 30, vy: (Math.random() - 0.5) * _base * 0.02,
          life: 1, rate: 1 / 0.25,
          sizeX: _base * 0.2, sizeY: _base * 0.02,
          growX: _base * 4.0, growY: _base * 0.1,
          alpha0: 0.95, isJet: true, isCore: true,
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
          alpha0: 0.95, isJet: true, isCore: true,
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
          alpha0: 0.95, isJet: true, isCore: true,
          friction: 0.7,
          angle: 0, spin: 0, worldFactor: 0.1,
          skipUpdate: true
        });
      }
    },
    spawnSpreadOne(x, y, weaponId) {
      const _base = 300;
      const isHeavy = (weaponId === '2a46' || weaponId === '2a46m1' || weaponId === 'atgm');
      if (isHeavy) {
        this.smoke.push({
          x: x + (Math.random() - 0.5) * _base * 0.2, 
          y: y + (Math.random() - 0.5) * _base * 0.2,
          vx: (Math.random() - 0.5) * _base * 0.5, 
          vy: (Math.random() - 0.5) * _base * 0.5,
          life: 1, rate: 1 / (2.0 + Math.random() * 0.8),
          sizeX: _base * 0.3, sizeY: _base * 0.3,
          growX: _base * 3.5, growY: _base * 3.5,
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
          life: 1, rate: 1 / (1.5 + Math.random() * 0.6),
          sizeX: _base * 0.2, sizeY: _base * 0.2,
          growX: _base * 2.5, growY: _base * 2.5,
          alpha0: 0.18, isJet: false, isCore: false,
          friction: 0.94,
          angle: Math.random() * 6.28, spin: (Math.random() - 0.5) * 0.5,
          worldFactor: 1.5,
          skipUpdate: true
        });
      }
    },
    spawnMG(x, y, layerOrder) {
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
        worldFactor: 1.0,
        _layerOrder: layerOrder || 'above'
      });
    },
    spawnTracer(x, y, speed, type, layerOrder, angleDeg) {
      this.tracers.push({
        startX: x, startY: y, born: performance.now(),
        speed: speed,
        len:   type === 'cannon' ? 80 : 40,
        width: type === 'cannon' ? 3  : 1.5,
        type:  type,
        _layerOrder: layerOrder || 'above',
        _ang: (angleDeg || 0) * Math.PI / 180
      });
    },
    spawnMissileJet(x, y) {
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
    spawnMissileSpread(x, y) {
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
    update(now, dt, worldSpeed) {
      for (let i = this.smoke.length - 1; i >= 0; i--) {
        const p = this.smoke[i];
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
        if (p.life <= 0) this.smoke.splice(i, 1);
      }
    },
    draw(ctx) { },
    drawTracers(ctx, now, layerOrder) {
      if (!this.tracers || !this.tracers.length) return;
      ctx.save(); ctx.shadowColor = 'rgba(255,200,50,0.8)'; ctx.shadowBlur = 10;
      for (let i = this.tracers.length - 1; i >= 0; i--) {
        const t = this.tracers[i];
        const _c = Math.cos(t._ang || 0), _s = Math.sin(t._ang || 0);
        const _dist = (now - t.born) / 1000 * t.speed;
        const tipX = t.startX + _c * _dist;
        const tipY = t.startY + _s * _dist;
        if (tipX - t.len > ctx.canvas.width + 200) { this.tracers.splice(i, 1); continue; }
        if (layerOrder && (t._layerOrder || 'above') !== layerOrder) continue;
        /* rev905: 炮口裁切（与发射烟共用） */
        ctx.save();
        window._vsClipAtMuzzle(ctx, t.startX, t.startY, t._ang || 0);
        const tailX = tipX - _c * t.len;
        const tailY = tipY - _s * t.len;
        const grad = ctx.createLinearGradient(tailX, tailY, tipX, tipY);
        grad.addColorStop(0, 'rgba(255,200,50,0)');
        grad.addColorStop(0.8, 'rgba(255,255,200,0.9)');
        grad.addColorStop(1, '#fff');
        ctx.strokeStyle = grad; ctx.lineWidth = t.width;
        ctx.beginPath(); ctx.moveTo(tailX, tailY); ctx.lineTo(tipX, tipY); ctx.stroke();
        ctx.restore();
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
    this.fireFx = []; this.dustParticles = []; this.fx.smoke = []; this.fx.tracers = []; this.recoilStates = {}; this.missiles = []; this.erasedMissilePolys = []; this.erasedBaseImg = null;
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
    // 只有 100mm 2A70 與 30mm 2A72 是剛性並列安裝（bmp3 / bmd4）
    // 125mm 2A46 / 73mm 2A28 沒有並列機炮，不需要 parent 綁定
    let mainWid = null;
    for(const mm of ann.muzzles){
        if(mm.weaponId === '2a70') {
            mainWid = mm.weaponId;
            break;
        }
    }
    for(const m of ann.muzzles){
      let pid = null;
      if ((m.weaponId === '2a72' || m.weaponId === '2a42') && mainWid) {
          pid = mainWid;
      }
      this.muzzles.push({ 
        weaponId: m.weaponId, 
        mx: m.x, 
        my: m.y, 
        angle: m.angle, 
        layerOrder: m.layerOrder || 'above', 
        _parentId: pid, 
        profile: MUZZLE_PROFILES[m.weaponId] || MUZZLE_PROFILES.default, 
        shotsLeft: (MUZZLE_PROFILES[m.weaponId] || MUZZLE_PROFILES.default).burst, 
        nextFireAt: 0, 
        lastFireAt: 0 
      });
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
      let _contentMinY = 0, _contentMaxY = 1, _contentH = 1.0, _contentMaxX = 1.0;
      try { const _m = _loadVehicleImg(this.vehicleId); if(_m && _m.complete && _m.naturalWidth && typeof _measureImgContentBounds === 'function'){ const _b = _measureImgContentBounds(_m); if(_b){ _contentMinY = _b.minY; _contentMaxY = _b.maxY; _contentH = _b.maxY - _b.minY; _contentMaxX = _b.maxX; } } } catch(_e){}
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
      const targetMuzzleRatio = 0.9; 
      const maxAllowedLeft = w * targetMuzzleRatio - 12 - maxMuzzleX * this.targetW; 
      const leftPx = Math.min(w/2 - this.targetW/2, maxAllowedLeft);
      this.centerPX = leftPx / w;
      const groundY = h * 0.95; const py0 = groundY - (this._contentBottomRatio || 1) * this.targetH;
      this.sinkOffset = py0 < 4 ? (4 - py0) : 0;
    }
    
    if (!this._dbgBtn) {
        var _dbg = document.createElement('div');
        _dbg.textContent = 'DBG';
        _dbg.style.cssText = 'position:absolute;right:8px;top:8px;padding:6px 12px;background:rgba(0,0,0,0.8);color:#0f0;border:1px solid #0f0;border-radius:4px;font:bold 12px monospace;z-index:9999;cursor:pointer;user-select:none;';
        _dbg.onclick = function() {
            window._BTR_CLIP_DEBUG = !window._BTR_CLIP_DEBUG;
            _dbg.style.background = window._BTR_CLIP_DEBUG ? 'rgba(0,80,0,0.9)' : 'rgba(0,0,0,0.8)';
        };
        zone.appendChild(_dbg);
        this._dbgBtn = _dbg;
    }
    if (typeof window._BTR_CLIP_DEBUG === 'undefined') window._BTR_CLIP_DEBUG = true;
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
    const ann = ANN[this.vehicleId];
    const basePx = this.x * this.width + (this.shakeX || 0);
    const basePy = this.height * 0.95 - (this._contentBottomRatio || 1) * this.targetH + this.yOffset + (this.shakeY || 0);
    const isMG = (m.weaponId === 'pkt' || m.weaponId === 'nsvt' || m.weaponId === 'kpvt');
    const isATGM = (m.weaponId === 'atgm');
    const isMain = (m.weaponId === '2a46' || m.weaponId === '2a46m1' || m.weaponId === '2a28' || m.weaponId === '2a70');
    let parentRc = 0;
    if (m._parentId && this.recoilStates[m._parentId]) {
        const prs = this.recoilStates[m._parentId];
        const pt = now - prs.startTime;
        if (pt >= 0 && pt <= prs.duration) {
            const pp = Math.min(1, pt / prs.duration);
            const pRcP = pp < 0.08 ? pp / 0.08 : Math.pow(1 - (pp - 0.08) / 0.92, 2.4);
            parentRc = prs.dist * this.targetW * pRcP;
        }
    }
    const muzzleX = basePx + m.mx * this.targetW - parentRc;
    const muzzleY = basePy + m.my * this.targetH;
    
    if (isMG) {
      this.fx.spawnMG(muzzleX, muzzleY, m.layerOrder);
    }

    if (!isATGM) {
      let showTracer = false;
      const _shotIdx = m.profile.burst - m.shotsLeft + 1;
      if (isMain) {
        showTracer = Math.random() < 0.5;
      } else if (isMG) {
        // 機槍：每 5 發中的第 5 發
        showTracer = (_shotIdx % 5 === 0);
      } else {
        // 機炮：每 4 發中的第 4 發
        showTracer = (_shotIdx % 4 === 0);
      }
      if (showTracer) {
        let _trAng = 0;
        if (typeof m.angle === 'number') _trAng = m.angle;
        else if (window.MUZZLE_ANGLES && window.MUZZLE_ANGLES[m.weaponId]) _trAng = window.MUZZLE_ANGLES[m.weaponId];
        this.fx.spawnTracer(muzzleX, muzzleY, isMG ? 800 : 1200, isMG ? 'mg' : 'cannon', m.layerOrder, _trAng);
      }
    }

    let triggerFlash = false;
    if (isMain) {
      triggerFlash = true;
    } else if (isMG) {
      triggerFlash = Math.random() < 0.05;
    } else {
      if (m.shotsLeft === m.profile.burst) {
        triggerFlash = Math.random() < 0.3;
      } else {
        triggerFlash = Math.random() < 0.05;
      }
    }

    this.fireFx.push({
      mx: m.mx, my: m.my, 
      spawnX: muzzleX, spawnY: muzzleY, 
      startTime: now, endTime: now + 600, size: m.profile.flashSize, 
      layerOrder: m.layerOrder || 'above', weaponId: m.weaponId, triggerFlash: triggerFlash
    });

    m.shotsLeft--;
    if (m.shotsLeft <= 0) { m.shotsLeft = m.profile.burst; m.nextFireAt = now + m.profile.pauseMs; }
    else { m.nextFireAt = now + m.profile.intervalMs; }

    if (!this.recoilStates) this.recoilStates = {};
    let rcDist = 0, rcDur = 500;
    
    let foundDist = false;
    if (ann && ann.weaponAreas) {
        for (const area of ann.weaponAreas) {
            if (area.weaponId === m.weaponId && typeof area.recoilDist === 'number') {
                rcDist = area.recoilDist;
                foundDist = true;
                break;
            }
        }
    }

    if (!foundDist) {
        if (m.weaponId === '2a46' || m.weaponId === '2a46m1') { rcDist = 0.10; }
        else if (m.weaponId === '2a28') { rcDist = 0.055; }
        else if (m.weaponId === '2a70') { rcDist = 0.085; }
        else if (m.weaponId === 'atgm') { rcDist = 0.040; }
    }

    if (!foundDist && (m.weaponId === '2a72' || m.weaponId === '2a42')) {
        rcDist = 0.015; // 預設給予微小的獨立管退，若配置了 recoilDist 則不覆蓋
    }

    if (m.weaponId === '2a46' || m.weaponId === '2a46m1' || m.weaponId === '2a70' || m.weaponId === '2a28') rcDur = 900;
    else if (m.weaponId === 'atgm') rcDur = 600;
    
    this.recoilStates[m.weaponId] = {
      startTime: now, duration: rcDur, dist: rcDist,
      _smokeActive: !isMG && !isATGM, 
      _lastJetTime: now,
      _lastSpreadTime: now,
      _staticMuzzleX: muzzleX,
      _muzzleY: muzzleY,
      _isMain: isMain
    };
    
    if (isATGM) {
      if(!this.erasedMissileImgs) this.erasedMissileImgs = [];
      var _ann49 = ANN[this.vehicleId];
      var _pushed49 = false;
      if(_ann49 && _ann49.missiles && _ann49.missiles.length){
        for(var _mi49 = 0; _mi49 < _ann49.missiles.length; _mi49++){
          var _mis49 = _ann49.missiles[_mi49];
          if(_mis49.weaponId !== "atgm" || !_mis49.polygon || _mis49.polygon.length < 3) continue;
          var _ex49 = -1;
          for(var _ei49 = 0; _ei49 < this.erasedMissilePolys.length; _ei49++){
            if(this.erasedMissilePolys[_ei49] === _mis49.polygon){ _ex49 = _ei49; break; }
          }
          if(_ex49 < 0){
            this.erasedMissilePolys.push(_mis49.polygon);
            this.erasedBaseImg = null;
            _ex49 = this.erasedMissilePolys.length - 1;
          }
          if(!this.erasedMissileImgs[_ex49] || !this.erasedMissileImgs[_ex49].canvas){
            var _img49 = _loadVehicleImg(this.vehicleId);
            if(_img49 && _img49.complete && _img49.naturalWidth){
              var _nw49 = _img49.naturalWidth, _nh49 = _img49.naturalHeight;
              var _poly49 = _mis49.polygon;
              var _mnX49 = 1, _mxX49 = 0, _mnY49 = 1, _mxY49 = 0;
              for(var _pi49 = 0; _pi49 < _poly49.length; _pi49++){
                var _pt49 = _poly49[_pi49];
                if(_pt49.x < _mnX49) _mnX49 = _pt49.x;
                if(_pt49.x > _mxX49) _mxX49 = _pt49.x;
                if(_pt49.y < _mnY49) _mnY49 = _pt49.y;
                if(_pt49.y > _mxY49) _mxY49 = _pt49.y;
              }
              var _tc49 = document.createElement("canvas");
              _tc49.width = _nw49; _tc49.height = _nh49;
              var _tcx49 = _tc49.getContext("2d");
              _tcx49.drawImage(_img49, 0, 0);
              _tcx49.globalCompositeOperation = "destination-in";
              _tcx49.beginPath();
              _tcx49.moveTo(_poly49[0].x * _nw49, _poly49[0].y * _nh49);
              for(var _pj49 = 1; _pj49 < _poly49.length; _pj49++) _tcx49.lineTo(_poly49[_pj49].x * _nw49, _poly49[_pj49].y * _nh49);
              _tcx49.closePath(); _tcx49.fill();
              this.erasedMissileImgs[_ex49] = {
                canvas: _tc49, imgW: _nw49, imgH: _nh49,
                box: { minX: _mnX49, maxX: _mxX49, minY: _mnY49, maxY: _mxY49, w: _mxX49 - _mnX49, h: _mxY49 - _mnY49 }
              };
            }
          }
          if(this.erasedMissileImgs[_ex49] && this.erasedMissileImgs[_ex49].canvas){
            var _c49 = this.erasedMissileImgs[_ex49];
            this.missiles.push({
              img: _c49.canvas, imgW: _c49.imgW, imgH: _c49.imgH, box: _c49.box,
              x: muzzleX, y: muzzleY,
              startTime: now, lastJetTime: now, lastSpreadTime: now,
              speed: this.width * 0.8, isImageEntity: true
            });
            _pushed49 = true;
          }
        }
      }
      if(!_pushed49){
        this.missiles.push({
          x: muzzleX, y: muzzleY,
          startTime: now, lastJetTime: now, lastSpreadTime: now,
          speed: this.width * 0.8
        });
      }
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

  _updateRecoilSmoke(now) {
    const basePx = this.x * this.width + this.shakeX;
    const basePy = this.height * 0.95 - (this._contentBottomRatio || 1) * this.targetH + this.yOffset + this.shakeY;
    
    for (const m of this.muzzles) {
      const rs = this.recoilStates[m.weaponId];
      if (!rs || !rs._smokeActive) continue;
      const t = now - rs.startTime;
      if (t < 0) continue;
      
      const p = Math.min(1, t / rs.duration);
      const _rcP = p < 0.08 ? p / 0.08 : Math.pow(1 - (p - 0.08) / 0.92, 2.4);
      let _totalRcPx = rs.dist * this.targetW * _rcP;
      
      if (m._parentId) {
          const prs = this.recoilStates[m._parentId];
          if (prs) {
              const pt = now - prs.startTime;
              if (pt >= 0 && pt <= prs.duration) {
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
      
      while (now - rs._lastJetTime >= JET_INTERVAL && t <= JET_MAX_TIME) {
        let jetAngle = 0;
        if (typeof m.angle === 'number') jetAngle = m.angle;
        else if (window.MUZZLE_ANGLES && window.MUZZLE_ANGLES[m.weaponId]) jetAngle = window.MUZZLE_ANGLES[m.weaponId];
        this.fx.spawnJetOne(_jetXNow, _jetYNow, m.weaponId, jetAngle, _muzzleXNow, m.layerOrder);
        rs._lastJetTime += JET_INTERVAL;
      }
      
      const SPREAD_OFFSET = isMain ? this.targetW * 0.45 : this.targetW * 0.25;
      const _spreadXNow = _muzzleXNow + SPREAD_OFFSET;
      while (now - rs._lastSpreadTime >= SPREAD_INTERVAL && t <= rs.duration) {
        this.fx.spawnSpreadOne(_spreadXNow, _muzzleYNow, m.weaponId, m.layerOrder);
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
    for (const m of this.muzzles) {
        if (m._parentId && recoilsPx[m._parentId]) {
            recoilsPx[m.weaponId] = (recoilsPx[m.weaponId] || 0) + recoilsPx[m._parentId];
        }
    }
    const dt = Math.min(0.05, (now - (this._lastTick || now)) / 1000); this._lastTick = now;
    this._updateMissiles(now, dt); const worldSpeed = this._getBTRWorldSpeed();
    
    this._updateRecoilSmoke(now);
    this.fx.update(now, dt, worldSpeed);
    
    var _renderOpts = { trackVel: (this.phase === "support") ? 300 : 100, wheelSpeed: (this.phase === "support") ? 20 : 6, doorOpen: (this.doorOpen || 0) * 180, recoils: recoilsPx };
    if(this.erasedMissilePolys && this.erasedMissilePolys.length > 0){
      if(!this.erasedBaseImg){
        var _bImg53 = _loadVehicleImg(this.vehicleId);
        if(_bImg53 && _bImg53.complete && _bImg53.naturalWidth){
          var _nw53 = _bImg53.naturalWidth, _nh53 = _bImg53.naturalHeight;
          var _ec53 = document.createElement("canvas");
          _ec53.width = _nw53; _ec53.height = _nh53;
          var _ecx53 = _ec53.getContext("2d");
          _ecx53.drawImage(_bImg53, 0, 0);
          _ecx53.globalCompositeOperation = "destination-out";
          _ecx53.fillStyle = "#000";
          for(var _pi53 = 0; _pi53 < this.erasedMissilePolys.length; _pi53++){
            var _poly53 = this.erasedMissilePolys[_pi53];
            if(!_poly53 || _poly53.length < 3) continue;
            _ecx53.beginPath();
            _ecx53.moveTo(_poly53[0].x * _nw53, _poly53[0].y * _nh53);
            for(var _pj53 = 1; _pj53 < _poly53.length; _pj53++) _ecx53.lineTo(_poly53[_pj53].x * _nw53, _poly53[_pj53].y * _nh53);
            _ecx53.closePath();
            _ecx53.fill();
          }
          this.erasedBaseImg = _ec53;
        }
      }
      if(this.erasedBaseImg) _renderOpts.baseImage = this.erasedBaseImg;
    }
    
    // 1. below 層煙霧
    if (this.fx && this.fx.smoke) {
        const _smokeBelow = this.fx.smoke.filter(p => p._layerOrder === 'below');
        window._vsDrawSmoke(ctx, _smokeBelow);
    }
    
    // 2. below 層火光
    for (const fx of this.fireFx) { 
      if (fx.layerOrder !== 'below') continue; 
      this._drawOneFireFx(ctx, fx, now, px, py); 
    }

    // 3. 畫載具本體
    this.fx.drawTracers(ctx, now, 'below');
    (window.VehicleRenderer && window.VehicleRenderer.render || renderVehicle)(ctx, this.vehicleId, px, py, this.targetW, this.targetH, (now - this.startTime) / 1000, _renderOpts);
    
    // 4. above 層煙霧
    if (this.fx && this.fx.smoke) {
        const _smokeAbove = this.fx.smoke.filter(p => p._layerOrder !== 'below');
        window._vsDrawSmoke(ctx, _smokeAbove);
    }
    
    if (this.missiles && this.missiles.length) {
      for (const mis of this.missiles) {
        if (mis.isImageEntity && mis.img) {
          var _srcX = mis.box.minX * mis.imgW;
          var _srcY = mis.box.minY * mis.imgH;
          var _srcW = mis.box.w * mis.imgW;
          var _srcH = mis.box.h * mis.imgH;
          var _drawW = mis.box.w * this.width;
          var _drawH = mis.box.h * this.height;
          var _drawX = mis.x + this.shakeX - _drawW / 2;
          var _drawY = mis.y + this.shakeY - _drawH / 2;
          ctx.drawImage(mis.img, _srcX, _srcY, _srcW, _srcH, _drawX, _drawY, _drawW, _drawH);
        } else {
          ctx.save();
          ctx.translate(mis.x + this.shakeX, mis.y + this.shakeY);
          ctx.fillStyle = "rgba(255, 200, 50, 0.8)";
          ctx.beginPath();
          ctx.moveTo(-15, 0);
          ctx.lineTo(-30 - Math.random()*10, -4);
          ctx.lineTo(-30 - Math.random()*10, 4);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = "#ddd";
          ctx.beginPath();
          ctx.ellipse(0, 0, 12, 4, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
    }
    
    // 5. above 層火光
    for (const fx of this.fireFx) { 
      if (fx.layerOrder === 'below') continue; 
      this._drawOneFireFx(ctx, fx, now, px, py); 
    }
    
    this.fx.drawTracers(ctx, now, 'above');
    
    if(!this.dustParticles) this.dustParticles = [];
    const wheelSpd = (this.phase === 'support') ? 20 : 6;
    const intensity = (wheelSpd === 20) ? 1.0 : 0.6;
    if(intensity > 0 && Math.random() < intensity){
      let _dustSrc = null;
      if (ann.trackLoop && ann.trackLoop.points && ann.trackLoop.points.length >= 2) {
        const pts = ann.trackLoop.points;
        let _dustMaxX = 0, _dustMaxY = 0;
        for(let _di = 0; _di < pts.length; _di++){ 
            if(pts[_di].x > _dustMaxX) _dustMaxX = pts[_di].x; 
            if(pts[_di].y > _dustMaxY) _dustMaxY = pts[_di].y;
        }
        const bottomPts = pts.filter(function(p){
          if (p.y < 0.5) return false; 
          if (p.x > _dustMaxX * 0.85) return false; 
          return true;
        });
        if(bottomPts.length > 0){
          let minY = 2;
          for(let i=0; i<bottomPts.length; i++){ if(bottomPts[i].y < minY) minY = bottomPts[i].y; }
          const bottomLine = bottomPts.filter(p => Math.abs(p.y - minY) < 0.05);
          if (bottomLine.length >= 2) {
              const p1 = bottomLine[0], p2 = bottomLine[bottomLine.length - 1];
              const t = Math.random();
              const cx = p1.x + (p2.x - p1.x) * t;
              const cy = p1.y + (p2.y - p1.y) * t;
              _dustSrc = { cx: cx, cy: cy, r: 0.015 };
          } else {
              const srcPt = bottomPts[Math.floor(Math.random() * bottomPts.length)];
              _dustSrc = { cx: srcPt.x, cy: srcPt.y, r: 0.015 };
          }
        }
      } else if (ann.wheels && ann.wheels.length > 0) {
        const _wArr = ann.wheels.filter(function(w){ return w.cx < 0.95; });
        if(_wArr.length > 0){
          _dustSrc = _wArr[Math.floor(Math.random() * _wArr.length)];
        }
      }
      if(_dustSrc) window.spawnDust(this.dustParticles, px, py, _dustSrc, this.targetW, this.targetH, wheelSpd);
    }
    window.updateAndDrawDust(ctx, this.dustParticles, dt);
    /* rev908-diag-lines: 红/蓝/绿 三色竖线 */
    if (window._BTR_CLIP_DEBUG) {
      try {
        ctx.save();
        var _m30x = -1, _m100x = -1;
        for (var _mi = 0; _mi < this.muzzles.length; _mi++) {
          var _mm = this.muzzles[_mi];
          if (_mm.weaponId === '2a72' || _mm.weaponId === '2a42') _m30x = this.x * this.width + _mm.mx * this.targetW;
          if (_mm.weaponId === '2a70') _m100x = this.x * this.width + _mm.mx * this.targetW;
        }
        if (_m30x > 0) {
          ctx.strokeStyle = 'red'; ctx.lineWidth = 2; ctx.setLineDash([10, 6]);
          ctx.beginPath(); ctx.moveTo(_m30x, 0); ctx.lineTo(_m30x, this.height); ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = 'red'; ctx.font = 'bold 11px monospace';
          ctx.fillText('30mm', _m30x + 4, 14);
        }
        if (_m100x > 0) {
          ctx.strokeStyle = 'blue'; ctx.lineWidth = 2; ctx.setLineDash([10, 6]);
          ctx.beginPath(); ctx.moveTo(_m100x, 0); ctx.lineTo(_m100x, this.height); ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = 'blue'; ctx.font = 'bold 11px monospace';
          ctx.fillText('100mm', _m100x + 4, 14);
        }
        var _jets = (this.fx && this.fx.smoke) ? this.fx.smoke.filter(function(p){ return p.isJet; }) : [];
        if (_jets.length) {
          var _last = _jets[_jets.length - 1];
          if (_last._muzzleX != null && isFinite(_last._muzzleX)) {
            ctx.strokeStyle = 'lime'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]);
            ctx.beginPath(); ctx.moveTo(_last._muzzleX, 0); ctx.lineTo(_last._muzzleX, this.height); ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = 'lime'; ctx.font = 'bold 11px monospace';
            ctx.fillText('jet', _last._muzzleX + 4, 26);
          }
        }
        ctx.restore();
      } catch(e) {}
    }
    /* rev907-diag: 屏幕右上角诊断文本 */
    {
      var _d = window._vsDiag;
      if (_d){
        var _tn = performance.now();
        if (_d.lastNow > 0){
          _d.frameDelta += (_tn - _d.lastNow); _d.frameCount++;
          if (_d.frameCount >= 15){ _d.fps = 1000 / (_d.frameDelta / _d.frameCount); _d.frameDelta = 0; _d.frameCount = 0; }
        }
        _d.lastNow = _tn;
        var _txt = "dt=" + _d.dt.toFixed(4) + "  fps=" + _d.fps.toFixed(0) + "\n" +
                   "jets=" + _d.jetCount + "  gap=" + _d.gapAvg.toFixed(1) + "px";
        ctx.save();
        ctx.font = "13px monospace";
        ctx.textAlign = "right";
        ctx.textBaseline = "top";
        ctx.fillStyle = "rgba(0,0,0,0.65)";
        ctx.fillRect(this.width - 200, 4, 196, 42);
        ctx.fillStyle = "#e8a33d";
        var _lines = _txt.split("\n");
        for (var _li = 0; _li < _lines.length; _li++){ ctx.fillText(_lines[_li], this.width - 8, 8 + _li * 16); }
        ctx.restore();
      }
    }
  },

  _drawOneFireFx(ctx, fx, now, px, py) {
    const age = now - fx.startTime, total = fx.endTime - fx.startTime; if (age > total) return;
    const t = age / total;
    const x = fx.spawnX !== undefined ? fx.spawnX : (px + fx.mx * this.targetW);
    const y = fx.spawnY !== undefined ? fx.spawnY : (py + fx.my * this.targetH);
    if (t < 0.15 && fx.triggerFlash) {
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
    if (this._dbgBtn) { try { this._dbgBtn.remove(); } catch(e) {} this._dbgBtn = null; }
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
    const names = { weapon: '⚔️ 武器', armor:'🛡️ 裝備', ammo:'🔫 彈藥', consume:'💊 消耗品', material:'🔧 材料', misc:'📦 其他' };
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

  // ★ v88：严格还原物理参数
// ★ v89：动态适配比例
// ★ v90：100%纯净还原
window._vsMakeSmokeJet = function(x, y, weaponId, angle){
  const _base = 300;
  const isHeavy = (weaponId === '2a46' || weaponId === '2a46m1' || weaponId === 'atgm');
  const isATGM = (weaponId === 'atgm');
  
  let vx = 0, vy = 0;
  let sizeX = 0, sizeY = 0, growX = 0, growY = 0;
  let offsetX = -30;

  if (isATGM) {
    vx = _base * 40; vy = (Math.random() - 0.5) * _base * 0.01;
    sizeX = _base * 0.2; sizeY = _base * 0.01;
    growX = _base * 6.0; growY = _base * 0.1;
    offsetX = -60;
  } else if (isHeavy) {
    vx = _base * 40; vy = (Math.random() - 0.5) * _base * 0.02;
    sizeX = _base * 0.25; sizeY = _base * 0.035;
    growX = _base * 10.0; growY = _base * 0.6;
    offsetX = -60;
  } else {
    vx = _base * 30; vy = (Math.random() - 0.5) * _base * 0.01;
    sizeX = _base * 0.2; sizeY = _base * 0.015;
    growX = _base * 8.0; growY = _base * 0.4;
  }

  if (angle) {
    const rad = angle * Math.PI / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const nx = vx * cos - vy * sin;
    const ny = vx * sin + vy * cos;
    vx = nx; vy = ny;
  }

  return { x: x + offsetX, y: y, vx: vx, vy: vy,
    life: 1, rate: 1 / 0.15, sizeX: sizeX, sizeY: sizeY,
    growX: growX, growY: growY, alpha0: 1.0, isJet: true, isCore: true,
    friction: 0.92, angle: 0, spin: 0, worldFactor: 0.1, skipUpdate: false };
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
  /* rev907-diag: 采样 dt 与 jet 粒子间距（供屏幕显示） */
  if (!window._vsDiag) window._vsDiag = { dt: 0, jetCount: 0, gapAvg: 0, frameDelta: 0, frameCount: 0, fps: 0, lastNow: 0 };
  window._vsDiag.dt = dt;
  {
    var _jets = [];
    for (var _i = 0; _i < particles.length; _i++){ if (particles[_i].isJet) _jets.push(particles[_i]); }
    window._vsDiag.jetCount = _jets.length;
    if (_jets.length >= 2){
      var _sum = 0, _n = 0;
      for (var _j = 1; _j < _jets.length; _j++){ _sum += Math.abs(_jets[_j].x - _jets[_j-1].x); _n++; }
      window._vsDiag.gapAvg = _n > 0 ? _sum / _n : 0;
    } else { window._vsDiag.gapAvg = 0; }
  }

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

  /* rev905: 炮口裁切共用（发射烟 + 曳光弹） */
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
    for (const p of particles) {
      let a = 0;
      if (p.isJet) {
        a = p.alpha0 * Math.pow(Math.max(0, p.life), 2.0);
      } else {
        a = p.alpha0 * Math.pow(Math.max(0, p.life), 4.0);
      }
      if (a < 0.005) continue;
      ctx.save();
      if (p.isJet && p._muzzleX !== undefined) {
          if (p._muzzleAngle !== undefined) {
              window._vsClipAtMuzzle(ctx, p._muzzleX, p._muzzleY !== undefined ? p._muzzleY : p.y, p._muzzleAngle * Math.PI / 180);
          } else {
              ctx.beginPath();
              ctx.rect(p._muzzleX, 0, ctx.canvas.width, ctx.canvas.height);
              ctx.clip();
          }
      }
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
  BTRSupport.fx.spawnJetOne = function(x, y, weaponId, angle, muzzleX, layerOrder){
    var p = window._vsMakeSmokeJet(x, y, weaponId, angle);
    if(p) { 
        p._muzzleX = muzzleX; 
        p._muzzleY = y;
        // 30mm 機炮與 100mm 並排時，傾斜裁切在手機 dpr 下易漂移，強制水平裁切
        if (weaponId === '2a72' || weaponId === '2a42') {
            p._muzzleAngle = 0;
        } else {
            p._muzzleAngle = angle || 0;
        }
        p._layerOrder = layerOrder || 'above';
    }
    this.smoke.push(p);
};
  BTRSupport.fx.spawnSpreadOne = function(x, y, weaponId, layerOrder){ 
    var p = window._vsMakeSmokeSpread(x, y, weaponId);
    if(p) p._layerOrder = layerOrder || 'above';
    this.smoke.push(p); 
};
  BTRSupport.fx.update = function(now, dt, worldSpeed){ window._vsUpdateSmoke(this.smoke, dt, worldSpeed); };
  BTRSupport.fx.draw = function(ctx){ window._vsDrawSmoke(ctx, this.smoke); };
})();

//

// [patcher-v21-patch]
// [patcher-fix-v21] 恢复 stat panel 原始布局 + 装甲完整语义多行
(function(){
  "use strict";

  /* ============================================================
   * Part 0: 彻底清理 v15~v20 所有 style 和 inline 修改
   * ============================================================ */
  var styleIds = [
    'patcher-v15-style','patcher-v16-style','patcher-v17-style',
    'patcher-v18-style','patcher-v19-style','patcher-v20-style'
  ];
  styleIds.forEach(function(id){
    var el = document.getElementById(id);
    if(el){ el.remove(); }
  });

  // 断开 v17/v18/v20 的 MutationObserver
  if(window._v17PanelObserver){ try{ window._v17PanelObserver.disconnect(); }catch(_){} }
  if(window._v18Observer){ try{ window._v18Observer.disconnect(); }catch(_){} }
  if(window._v20Obs){ try{ window._v20Obs.disconnect(); }catch(_){} }

  // 清除 stat panel 上被 inline style 强加的属性（恢复原始 flex-wrap:wrap）
  function _resetStatPanelInline(){
    var panels = document.querySelectorAll('.player-stat-panel');
    for(var i = 0; i < panels.length; i++){
      var p = panels[i];
      p.style.removeProperty('font-size');
      p.style.removeProperty('line-height');
      p.style.removeProperty('overflow');
      var rows = p.querySelectorAll('.row');
      for(var j = 0; j < rows.length; j++){
        var r = rows[j];
        r.style.removeProperty('flex-wrap');
        r.style.removeProperty('white-space');
        r.style.removeProperty('overflow');
        for(var k = 0; k < r.children.length; k++){
          r.children[k].style.removeProperty('flex-shrink');
          r.children[k].style.removeProperty('font-size');
          r.children[k].style.removeProperty('color');
          r.children[k].style.removeProperty('font-weight');
        }
      }
    }
  }
  _resetStatPanelInline();

  // [整理] _v21ResetObs 已删除（无对象可清理，性能税）

  var A = window.VEHICLE_ANNOTATIONS = window.VEHICLE_ANNOTATIONS || {};

  /* ============================================================
   * BMP annotation 硬编码（幂等）
   * ============================================================ */
  if(!A.bmp1) A.bmp1 = {id:'bmp1',imageSize:{w:545,h:187},
    doors:{fusion:[{polygon:[{x:0.0106,y:0.3654},{x:0.0202,y:0.4017},{x:0.0197,y:0.5499},{x:0.0091,y:0.5778},{x:-0.0213,y:0.5763},{x:-0.0314,y:0.5624},{x:-0.0329,y:0.389},{x:-0.0296,y:0.3644}],hingeP1:{x:0.0202,y:0.4017},hingeP2:{x:0.0197,y:0.5499},hingeEdgeIdx:1,openRotation:90,fillColor:'#000'}]},
    wheels:[{cx:0.0925,cy:0.6852,r:0.0411},{cx:0.1933,cy:0.8409,r:0.0456},{cx:0.3012,cy:0.8443,r:0.0456},{cx:0.4115,cy:0.8448,r:0.0456},{cx:0.5107,cy:0.8417,r:0.0456},{cx:0.6082,cy:0.8463,r:0.0456},{cx:0.7056,cy:0.8487,r:0.0456},{cx:0.8169,cy:0.6486,r:0.0456},{cx:0.2422,cy:0.5922,r:0.0136},{cx:0.4611,cy:0.5941,r:0.0116},{cx:0.6564,cy:0.5876,r:0.0108}],
    muzzles:[{x:0.7598,y:0.1971,weaponId:'2a28',layerOrder:'above'},{x:0.5196,y:0.1989,weaponId:'pkt',layerOrder:'above'},{x:0.5501,y:0.0706,weaponId:'atgm',layerOrder:'above'}],
    weaponAreas:[{id:'o8tz1ypo',polygon:[{x:0.5915,y:0.1587},{x:0.592,y:0.2436},{x:0.5992,y:0.2317},{x:0.6134,y:0.2193},{x:0.7608,y:0.2219},{x:0.7596,y:0.1702},{x:0.6181,y:0.1809}],weaponId:'2a28',recoilDist:0.055}],
    missiles:[{polygon:[{x:0.551,y:0.051},{x:0.5514,y:0.0898},{x:0.5616,y:0.0895},{x:0.5552,y:0.1258},{x:0.5755,y:0.1244},{x:0.5852,y:0.0856},{x:0.6397,y:0.0866},{x:0.6627,y:0.0627},{x:0.6621,y:0.0549},{x:0.6374,y:0.036},{x:0.5815,y:0.0421},{x:0.5734,y:0.0121},{x:0.5513,y:0.0169},{x:0.551,y:0.0286},{x:0.5556,y:0.0476}],weaponId:'atgm'}]};
  if(!A.bmp1m) A.bmp1m = {id:'bmp1m',imageSize:{w:545,h:204},
    doors:{fusion:[{polygon:[{x:0.0076,y:0.42},{x:0.0227,y:0.4817},{x:0.0227,y:0.6053},{x:0.0144,y:0.6329},{x:-0.023,y:0.6322},{x:-0.0332,y:0.6148},{x:-0.0339,y:0.4541},{x:-0.0291,y:0.4219}],hingeP1:{x:0.0227,y:0.4817},hingeP2:{x:0.0227,y:0.6053},hingeEdgeIdx:1,openRotation:90,fillColor:'#000'}]},
    wheels:[{cx:0.0932,cy:0.7104,r:0.0411},{cx:0.1941,cy:0.8617,r:0.0468},{cx:0.3015,cy:0.8587,r:0.0468},{cx:0.4103,cy:0.8546,r:0.0468},{cx:0.5084,cy:0.8571,r:0.0468},{cx:0.607,cy:0.8635,r:0.0468},{cx:0.7042,cy:0.8607,r:0.0468},{cx:0.8198,cy:0.6641,r:0.0412}],
    muzzles:[{x:0.4134,y:0.141,weaponId:'pkt',layerOrder:'above'},{x:0.6953,y:0.1156,weaponId:'2a42',layerOrder:'above'}],
    weaponAreas:[{id:'onpjf5i7',polygon:[{x:0.4033,y:0.0894},{x:0.4025,y:0.1345},{x:0.6976,y:0.1439},{x:0.7049,y:0.1373},{x:0.7049,y:0.1055},{x:0.6955,y:0.09},{x:0.4358,y:0.0905}],weaponId:'2a42',recoilDist:0.015}],missiles:[]};
  if(!A.bmp2) A.bmp2 = {id:'bmp2',imageSize:{w:545,h:215},
    doors:{fusion:[{polygon:[{x:0.0168,y:0.5241},{x:0.0191,y:0.6018},{x:0.0067,y:0.6455},{x:-0.0443,y:0.6466},{x:-0.0505,y:0.6178},{x:-0.0501,y:0.4665},{x:-0.0398,y:0.4459},{x:0.0016,y:0.4434}],hingeP1:{x:0.0168,y:0.5241},hingeP2:{x:0.0191,y:0.6018},hingeEdgeIdx:0,openRotation:90,fillColor:'#000'}]},
    wheels:[{cx:0.0954,cy:0.7234,r:0.0482},{cx:0.1947,cy:0.867,r:0.0482},{cx:0.306,cy:0.8648,r:0.0482},{cx:0.4142,cy:0.8666,r:0.0482},{cx:0.511,cy:0.8634,r:0.0482},{cx:0.6095,cy:0.8678,r:0.0482},{cx:0.7095,cy:0.8641,r:0.0482},{cx:0.8159,cy:0.6889,r:0.0353}],
    muzzles:[{x:0.8428,y:0.2535,weaponId:'2a42',layerOrder:'above'},{x:0.5435,y:0.2579,weaponId:'pkt',layerOrder:'above'},{x:0.4309,y:0.0347,weaponId:'atgm',layerOrder:'above'}],
    weaponAreas:[{id:'ov6a9s2x',polygon:[{x:0.5965,y:0.234},{x:0.5962,y:0.2836},{x:0.8454,y:0.2749},{x:0.8453,y:0.2329}],weaponId:'2a42',recoilDist:0.015}],
    missiles:[{polygon:[{x:0.551,y:0.051},{x:0.5514,y:0.0898},{x:0.5616,y:0.0895},{x:0.5552,y:0.1258},{x:0.5755,y:0.1244},{x:0.5852,y:0.0856},{x:0.6397,y:0.0866},{x:0.6627,y:0.0627},{x:0.6621,y:0.0549},{x:0.6374,y:0.036},{x:0.5815,y:0.0421},{x:0.5734,y:0.0121},{x:0.5513,y:0.0169},{x:0.551,y:0.0286},{x:0.5556,y:0.0476}],weaponId:'atgm'}]};
  if(!A.bmp3) A.bmp3 = {id:'bmp3',imageSize:{w:592,h:234},
    doors:{fusion:[{polygon:[{x:0.0202,y:0.4219},{x:0.0217,y:0.7016},{x:-0.0397,y:0.7009},{x:-0.0501,y:0.6707},{x:-0.0491,y:0.4412},{x:-0.0345,y:0.4188}],hingeP1:{x:0.0202,y:0.4219},hingeP2:{x:0.0217,y:0.7016},hingeEdgeIdx:0,openRotation:90,fillColor:'#000'}]},
    wheels:[{cx:0.081,cy:0.7308,r:0.0353},{cx:0.1735,cy:0.8718,r:0.042},{cx:0.2893,cy:0.8687,r:0.042},{cx:0.3861,cy:0.8737,r:0.042},{cx:0.4988,cy:0.8735,r:0.042},{cx:0.6343,cy:0.8733,r:0.042},{cx:0.7413,cy:0.8709,r:0.042},{cx:0.8759,cy:0.6859,r:0.0351},{cx:0.2092,cy:0.6732,r:0.0175},{cx:0.4348,cy:0.6617,r:0.0189},{cx:0.6719,cy:0.6454,r:0.018}],
    muzzles:[{x:0.9952,y:0.2548,weaponId:'2a70',layerOrder:'above'},{x:0.6899,y:0.265,weaponId:'pkt',layerOrder:'below'},{x:0.9385,y:0.2507,weaponId:'2a72',layerOrder:'above'}],
    weaponAreas:[{id:'ocb56di9',polygon:[{x:0.717,y:0.2309},{x:0.7161,y:0.2423},{x:0.7072,y:0.2428},{x:0.7071,y:0.2658},{x:0.7163,y:0.2648},{x:0.7162,y:0.284},{x:0.8445,y:0.2829},{x:0.8447,y:0.2953},{x:0.9986,y:0.2902},{x:0.9976,y:0.2285},{x:0.9186,y:0.22},{x:0.8423,y:0.2196}],weaponId:'2a70',recoilDist:0.048}],missiles:[]};
  if(!A.bmd4) A.bmd4 = {id:'bmd4',imageSize:{w:556,h:193},
    doors:{fusion:[{polygon:[{x:0.0267,y:0.3753},{x:0.0293,y:0.6204},{x:-0.02,y:0.6197},{x:-0.029,y:0.5997},{x:-0.0287,y:0.4092},{x:-0.023,y:0.3833}],hingeP1:{x:0.0267,y:0.3753},hingeP2:{x:0.0293,y:0.6204},hingeEdgeIdx:0,openRotation:90,fillColor:'#000'}]},
    wheels:[{cx:0.0877,cy:0.7247,r:0.0353},{cx:0.1796,cy:0.8469,r:0.042},{cx:0.297,cy:0.8466,r:0.042},{cx:0.412,cy:0.8492,r:0.042},{cx:0.5246,cy:0.8438,r:0.042},{cx:0.6401,cy:0.8415,r:0.042},{cx:0.759,cy:0.6839,r:0.042},{cx:0.2332,cy:0.6188,r:0.0175},{cx:0.3435,cy:0.6204,r:0.0189},{cx:0.5775,cy:0.6149,r:0.018},{cx:0.4602,cy:0.6166,r:0.0182}],
    muzzles:[{x:0.9926,y:0.2389,weaponId:'2a70',layerOrder:'above'},{x:0.6229,y:0.246,weaponId:'pkt',layerOrder:'below'},{x:0.9449,y:0.2423,weaponId:'2a72',layerOrder:'above'}],
    weaponAreas:[{id:'omtiwlzc',polygon:[{x:0.6394,y:0.1963},{x:0.6389,y:0.2177},{x:0.6639,y:0.2172},{x:0.6636,y:0.2601},{x:0.639,y:0.2607},{x:0.6378,y:0.2805},{x:0.8764,y:0.2816},{x:1.0026,y:0.2794},{x:0.9958,y:0.2044}],weaponId:'2a70',recoilDist:0.048}],missiles:[]};

  /* ============================================================
   * VEHICLES 重建 + 装甲完整语义多行
   * ============================================================ */
  // [整理] ARMOR_MULTI 已删除（v30 ARMOR_GRID 覆盖）
  if(typeof VEHICLES !== 'undefined'){
    function _ensure(id, def){ if(!VEHICLES[id]){ VEHICLES[id] = def; return true; } return false; }
    _ensure('bmp1',{id:'bmp1',name:'BMP-1',tier:1,line:'bmp',weapon: '73mm 2A28 + 7.62mm PKT',weaponSpecial:'9M14 Malyutka ATGM',armor:'',speedRoad:65,speedOffroad:'45-50',supportDuration:30,next:['bmp1m'],researchCost:{ammoCal:'5.45',ammoCount:1000,liquor:100,exp:500}});
    _ensure('bmp1m',{id:'bmp1m',name:'BMP-1M',tier:2,line:'bmp',weapon: '30mm 2A72 + 7.62mm PKT',weaponSpecial:'無',armor:'',speedRoad:65,speedOffroad:'45-50',supportDuration:32,next:['bmp2'],researchCost:{ammoCal:'5.45',ammoCount:1500,liquor:150,exp:800}});
    _ensure('bmp2',{id:'bmp2',name:'BMP-2',tier:3,line:'bmp',weapon: '30mm 2A42 + 7.62mm PKT + ATGM 發射筒',weaponSpecial:'9M113 Konkurs ATGM',armor:'',speedRoad:65,speedOffroad:'45-50',supportDuration:35,next:['bmp3'],researchCost:{ammoCal:'7.62',ammoCount:2000,liquor:500,exp:3000}});
    _ensure('bmp3',{id:'bmp3',name:'BMP-3',tier:4,line:'bmp',weapon: '100mm 2A70 + 30mm 2A72 + 7.62mm PKT',weaponSpecial:'無',armor:'',speedRoad:70,speedOffroad:'45-50',supportDuration:40,next:['bmd4'],researchCost:{ammoCal:'7.62x54',ammoCount:2500,liquor:2500,exp:12000}});
    _ensure('bmd4',{id:'bmd4',name:'BMD-4',tier:5,line:'bmp',weapon: '100mm 2A70 + 30mm 2A72 + 7.62mm PKT',weaponSpecial:'無',armor:'',speedRoad:70,speedOffroad:'45-50',supportDuration:42,next:[],researchCost:{ammoCal:'7.62x54',ammoCount:3000,liquor:3000,exp:15000}});
    if(VEHICLES.btr80){
      var b0 = VEHICLES.btr80.next = VEHICLES.btr80.next || [];
      if(b0.indexOf('btr80a')<0) b0.push('btr80a');
      if(b0.indexOf('bmp1')<0) b0.push('bmp1');
      if(b0.indexOf('t80')<0) b0.push('t80');
      VEHICLES.btr80.next = b0.filter(function(v){ return v !== 'bmp1am'; });
    }
    var _chain = [['bmp1','bmp1m'],['bmp1m','bmp2'],['bmp2','bmp3'],['bmp3','bmd4']];
    for(var ci = 0; ci < _chain.length; ci++){
      var cur = VEHICLES[_chain[ci][0]];
      if(cur){ var cn = cur.next = cur.next || []; if(cn.indexOf(_chain[ci][1])<0) cn.push(_chain[ci][1]); }
    }
    ['t80','t80b','t80bv','t80u','t80uk','t80um','btr80','btr80a','btr82','btr82a','bmp1m'].forEach(function(id){
      if(VEHICLES[id]) VEHICLES[id].weaponSpecial = '無';
    });
    if(VEHICLES.btr90) VEHICLES.btr90.weaponSpecial = 'ATGM 發射筒';
    if(VEHICLES.bmp1)  VEHICLES.bmp1.weaponSpecial = '9M14 Malyutka ATGM';
    if(VEHICLES.bmp2)  VEHICLES.bmp2.weaponSpecial = '9M113 Konkurs ATGM';
    if(VEHICLES.bmp3)  VEHICLES.bmp3.weaponSpecial = '無';
    if(VEHICLES.bmd4)  VEHICLES.bmd4.weaponSpecial = '無';
  }

  /* BMP door 对准 */
  if(window.BTRSupport && !window.BTRSupport._v21DoorPatched){
    window.BTRSupport._v21DoorPatched = true;
    var _origSetup = window.BTRSupport._setupCanvas;
    window.BTRSupport._setupCanvas = function(){
      _origSetup.call(this);
      var ann = A[this.vehicleId];
      if(!ann || !ann.doors) return;
      var doors = [];
      if(ann.doors.fusion && ann.doors.fusion.length){ doors = ann.doors.fusion; }
      else {
        if(ann.doors.upper) doors = doors.concat(ann.doors.upper);
        if(ann.doors.lower) doors = doors.concat(ann.doors.lower);
        if(ann.doors.hatch) doors = doors.concat(ann.doors.hatch);
      }
      if(!doors.length) return;
      var sx = 0, sn = 0;
      for(var i = 0; i < doors.length; i++){
        var d = doors[i]; if(!d.polygon) continue;
        for(var j = 0; j < d.polygon.length; j++){ sx += d.polygon[j].x; sn++; }
      }
      if(sn === 0) return;
      var r = sx / sn;
      var w = this.width;
      var pcx = w * (typeof EXPLORE_HERO_X_RATIO === 'number' ? EXPLORE_HERO_X_RATIO : 0.25);
      this.doorOffsetRatio = r;
      this.doorX = (pcx - r * this.targetW) / w;
    };
  }

  /* ============================================================
   * _garageDetailHtml —— 装甲完整语义多行（利用左侧空间）
   * ============================================================ */


  /* 科技树 */
  function _pan(c){
    if(!c || c._pb) return; c._pb = true;
    var d=false, sx=0, sy=0, sl=0, st=0;
    c.addEventListener('pointerdown', function(e){
      if(e.pointerType==='touch'||e.button!==0) return;
      if(e.target.closest && e.target.closest('.wt-node')) return;
      d=true; sx=e.clientX; sy=e.clientY; sl=c.scrollLeft; st=c.scrollTop;
      c.style.cursor='grabbing'; try{ c.setPointerCapture(e.pointerId); }catch(_){}
    });
    c.addEventListener('pointermove', function(e){
      if(!d) return;
      c.scrollLeft = sl-(e.clientX-sx); c.scrollTop = st-(e.clientY-sy);
    });
    function end(e){ if(!d) return; d=false; c.style.cursor='grab'; try{ c.releasePointerCapture(e.pointerId); }catch(_){} }
    c.addEventListener('pointerup', end); c.addEventListener('pointercancel', end);
    c.style.cursor='grab';
  }
  window._garageOpenTechTree = function(){
    var NW=100, NH=64;
    var nodes = [
      {vid:'btr80',x:120,y:4},{vid:'btr80a',x:10,y:76},{vid:'btr82',x:10,y:148},{vid:'btr82a',x:10,y:220},{vid:'btr90',x:10,y:292},
      {vid:'bmp1',x:120,y:76},{vid:'bmp1m',x:120,y:148},{vid:'bmp2',x:120,y:220},{vid:'bmp3',x:120,y:292},{vid:'bmd4',x:120,y:364},
      {vid:'t80',x:230,y:76},{vid:'t80b',x:230,y:148},{vid:'t80bv',x:230,y:220},{vid:'t80u',x:230,y:292},{vid:'t80uk',x:230,y:364},{vid:'t80um',x:340,y:364}
    ];
    var s = '<svg width="450" height="440" style="position:absolute;left:0;top:0;pointer-events:none" xmlns="http://www.w3.org/2000/svg">';
    s += '<path d="M 170 68 L 170 72 L 60 72 L 60 76" stroke="#8a5f18" stroke-width="2" fill="none"/>';
    s += '<line x1="170" y1="68" x2="170" y2="76" stroke="#8a5f18" stroke-width="2"/>';
    s += '<path d="M 170 68 L 170 72 L 280 72 L 280 76" stroke="#8a5f18" stroke-width="2" fill="none"/>';
    s += '<line x1="60" y1="140" x2="60" y2="148" stroke="#8a5f18" stroke-width="2"/><line x1="60" y1="212" x2="60" y2="220" stroke="#8a5f18" stroke-width="2"/><line x1="60" y1="284" x2="60" y2="292" stroke="#8a5f18" stroke-width="2"/>';
    s += '<line x1="170" y1="140" x2="170" y2="148" stroke="#8a5f18" stroke-width="2"/><line x1="170" y1="212" x2="170" y2="220" stroke="#8a5f18" stroke-width="2"/><line x1="170" y1="284" x2="170" y2="292" stroke="#8a5f18" stroke-width="2"/><line x1="170" y1="356" x2="170" y2="364" stroke="#8a5f18" stroke-width="2"/>';
    s += '<line x1="280" y1="140" x2="280" y2="148" stroke="#8a5f18" stroke-width="2"/><line x1="280" y1="212" x2="280" y2="220" stroke="#8a5f18" stroke-width="2"/><line x1="280" y1="284" x2="280" y2="292" stroke="#8a5f18" stroke-width="2"/><line x1="280" y1="356" x2="280" y2="364" stroke="#8a5f18" stroke-width="2"/>';
    s += '<path d="M 280 356 L 280 360 L 390 360 L 390 364" stroke="#8a5f18" stroke-width="2" fill="none"/></svg>';
    var g = _garageInitState();
    var res = _garageGetResearchInfo();
    var rId = res ? res.targetId : null;
    var h = '';
    for(var i = 0; i < nodes.length; i++){
      var n = nodes[i];
      var v = VEHICLES[n.vid]; if(!v) continue;
      var own = g.ownedVehicles.indexOf(n.vid) >= 0;
      var cur = g.currentVehicle === n.vid;
      var isR = (rId === n.vid);
      var pre = Object.keys(VEHICLES).filter(function(p){ return (VEHICLES[p].next||[]).indexOf(n.vid)>=0; });
      var hasAll = pre.length === 0 || pre.every(function(p){ return g.ownedVehicles.indexOf(p)>=0; });
      var cls = 'wt-node', mk = '';
      if(own && cur){ cls += ' current'; mk = '✓'; }
      else if(own){ cls += ' owned'; mk = '✓'; }
      else if(!hasAll){ cls += ' locked'; mk = '🔒'; }
      else if(isR){ cls += ' researching'; mk = '🔬'; }
      else if(v.researchCost){ cls += ' researchable'; mk = '🔬'; }
      else { cls += ' locked'; mk = '?'; }
      h += '<div class="'+cls+'" data-tech-node="'+n.vid+'" style="left:'+n.x+'px;top:'+n.y+'px;width:'+NW+'px;height:'+NH+'px"><div class="wt-node-img"><img src="icons/vehicles/'+n.vid+'.png'+assetSuffix()+'" data-fallback="1" alt=""></div><div class="wt-node-name">'+v.name+'</div><div class="wt-node-mark">'+mk+'</div></div>';
    }
    var bd = openModal({ title:'科技樹', body:'<div class="wt-tech-wrap"><div class="wt-tech-canvas" style="width:450px;height:440px">'+s+h+'</div></div>' });
    if(typeof _garageBindTechImgs === 'function') _garageBindTechImgs(bd);
    var wrap = bd.querySelector('.wt-tech-wrap');
    if(wrap) _pan(wrap);
    var btns = bd.querySelectorAll('[data-tech-node]');
    for(var bi = 0; bi < btns.length; bi++){
      (function(b){ b.onclick = function(){ _garageShowTechDetail(b.getAttribute('data-tech-node')); }; })(btns[bi]);
    }
  };

  /* ============================================================
   * CSS：只保留装甲多行 + 科技树，不动 stat panel
   * ============================================================ */
  var st = document.createElement('style');
  st.id = 'patcher-v21-style';
  st.textContent = [
    '.garage-stat-row.armor-row{display:flex !important;align-items:center !important;gap:4px !important;min-width:0 !important;padding:1px 0 !important}',
    '.garage-stat-row.armor-row .k{flex:0 0 26px !important;white-space:nowrap !important;color:#7a6f60 !important;line-height:1.4 !important;min-height:1.4em !important}',
    '.garage-stat-row .armor-val{flex:1 1 0 !important;min-width:0 !important;white-space:nowrap !important;text-overflow:ellipsis !important;overflow:hidden !important;line-height:1.4 !important;text-align:right !important}',
    '.garage-stat-row .v-arrow{flex:0 0 auto !important}',
    '.garage-stat-row .v-cur.armor-val{color:#7a6f60 !important}',
    '.garage-stat-row .v-cur-only.armor-val{color:#e8a33d !important;font-weight:bold !important}',
    '.garage-stat-row .v-new.armor-val{color:#e8a33d !important;font-weight:bold !important}',
    '.garage-stat-row .v-new.armor-val.diff{color:#a45ede !important}',
    '.wt-node{user-select:none;-webkit-user-select:none}'
  ].join('\n');
  document.head.appendChild(st);

  /* fusion door（v20 逻辑） */
  
  })();


// [patcher-v30-patch]
// [patcher-fix-v30] 裝甲 3 行 + 導彈中文譯名 + 速度合併 + 全局經驗整合單行
(function(){
  "use strict";
  if(window._patcherFixV30Installed) return;
  window._patcherFixV30Installed = true;

  /* ============================================================
   * Part 0: 清理 v22~v29 裝甲 style
   * ============================================================ */
  ['patcher-v22-style','patcher-v23-style','patcher-v24-style',
   'patcher-v25-style','patcher-v26-style','patcher-v27-style',
   'patcher-v28-style','patcher-v29-style'].forEach(function(id){
    var el = document.getElementById(id);
    if(el){ el.remove(); }
  });
  var oldV21 = document.getElementById('patcher-v21-style');
  if(oldV21) oldV21.remove();

  /* ============================================================
   * Part 1: 裝甲 3 行（車體/炮塔/附加）
   * ============================================================ */
  var ARMOR_PARTS = ['車體', '炮塔', '附加'];
  var ARMOR_GRID = {
    btr80:  ['10/10/7',      '10/10/10',    '—'],
    btr80a: ['10/10/7',      '23/10/10',    '—'],
    btr82:  ['10/10/7',      '10/10/10',    '—'],
    btr82a: ['15/10/7',      '23/10/10',    '—'],
    btr90:  ['30/15/10',     '30/15/10',    '—'],
    bmp1:   ['19/16/6',      '23/19/13',    '—'],
    bmp1m:  ['19/16/6',      '23/19/13',    '—'],
    bmp2:   ['19/16/6',      '23/19/13',    '—'],
    bmp3:   ['60/43/30',     '50/40/30',    '—'],
    bmd4:   ['40/30/20',     '23/20/15',    '—'],
    t80:    ['450/80/60',    '500/200/80',  '—'],
    t80b:   ['480/80/60',    '500/200/80',  '—'],
    t80bv:  ['480/80/60',    '500/200/80',  '接觸-1'],
    t80u:   ['500/80/60',    '600/250/80',  '接觸-5'],
    t80uk:  ['500/80/60',    '600/250/80',  '接觸-5'],
    t80um:  ['500/80/60',    '600/250/80',  '接觸-5']
  };

  /* ============================================================
   * Part 2: 導彈中文譯名
   * ============================================================ */
  var WEAPON_SPECIAL_ZH = {
    btr80: '無', btr80a: '無', btr82: '無', btr82a: '無', btr90: '9M113 競賽',
    bmp1: '9M14 嬰兒', bmp1m: '無', bmp2: '9M113 競賽', bmp3: '無', bmd4: '無',
    t80: '無', t80b: '無', t80bv: '無', t80u: '無', t80uk: '無', t80um: '無'
};

  /* ============================================================
   * Part 3: 速度（前進/倒車）
   * ============================================================ */
  var SPEED_DATA = {
    btr80:  { fwd: 80,  rev: 20 },
    btr80a: { fwd: 87,  rev: 20 },
    btr82:  { fwd: 100, rev: 20 },
    btr82a: { fwd: 100, rev: 20 },
    btr90:  { fwd: 100, rev: 20 },
    bmp1:   { fwd: 65,  rev: 10 },
    bmp1m:  { fwd: 65,  rev: 10 },
    bmp2:   { fwd: 65,  rev: 10 },
    bmp3:   { fwd: 70,  rev: 20 },
    bmd4:   { fwd: 70,  rev: 20 },
    t80:    { fwd: 70,  rev: 11 },
    t80b:   { fwd: 78,  rev: 11 },
    t80bv:  { fwd: 70,  rev: 11 },
    t80u:   { fwd: 70,  rev: 11 },
    t80uk:  { fwd: 70,  rev: 11 },
    t80um:  { fwd: 70,  rev: 11 }
  };

  /* ============================================================
   * Part 4: 寫入 VEHICLES
   * ============================================================ */
  if(typeof VEHICLES !== 'undefined'){
    Object.keys(ARMOR_GRID).forEach(function(id){
      if(!VEHICLES[id]) return;
      VEHICLES[id].armorGrid = ARMOR_GRID[id].slice();
      VEHICLES[id].armor = ARMOR_PARTS.map(function(p, i){
        return p + ' ' + ARMOR_GRID[id][i];
      }).join('\n');
    });
    Object.keys(WEAPON_SPECIAL_ZH).forEach(function(id){
      if(VEHICLES[id]) VEHICLES[id].weaponSpecial = WEAPON_SPECIAL_ZH[id];
    });
    Object.keys(SPEED_DATA).forEach(function(id){
      if(!VEHICLES[id]) return;
      VEHICLES[id].speedFwd = SPEED_DATA[id].fwd;
      VEHICLES[id].speedRev = SPEED_DATA[id].rev;
      if(typeof VEHICLES[id].speedRoad === 'undefined') VEHICLES[id].speedRoad = SPEED_DATA[id].fwd;
    });
  }

  /* ============================================================
   * Part 5: 重寫 _garageDetailHtml
   * ============================================================ */
  function _esc(v){
    if(v == null) return '';
    return String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }
  function _armorRows(curGrid, tgtGrid){
    var CG = curGrid || [];
    var TG = tgtGrid || null;
    var out = '';
    for(var i = 0; i < ARMOR_PARTS.length; i++){
      var part = ARMOR_PARTS[i];
      var cv = CG[i] != null ? CG[i] : '—';
      var row = '<div class="garage-stat-row armor-row" title="' + part + ' 正/側/背 (mm)">';
      row += '<span class="k">' + part + '</span>';
      if(TG){
        var tv = TG[i] != null ? TG[i] : '—';
        row += '<span class="v-cur armor-val">' + _esc(cv) + '</span>';
        row += '<span class="v-arrow">→</span>';
        row += '<span class="v-new armor-val' + (cv !== tv ? ' diff' : '') + '">' + _esc(tv) + '</span>';
      } else {
        row += '<span class="v-cur-only armor-val">' + _esc(cv) + '</span>';
      }
      row += '</div>';
      out += row;
    }
    return out;
  }
  function _spdText(v){
    if(!v) return '—';
    var f = (v.speedFwd != null) ? v.speedFwd : v.speedRoad;
    var r = (v.speedRev != null) ? v.speedRev : '—';
    if(f == null) return '—';
    return f + ' / ' + r + ' km/h';
  }
  function _spdRow(cur, tgt){
    var cv = _spdText(cur);
    var tv = tgt ? _spdText(tgt) : null;
    var h = '<div class="garage-stat-row" title="前進 / 倒車">';
    h += '<span class="k">速度</span>';
    if(tv !== null){
      h += '<span class="v-cur">' + _esc(cv) + '</span>';
      h += '<span class="v-arrow">→</span>';
      h += '<span class="v-new' + (cv !== tv ? ' diff' : '') + '">' + _esc(tv) + '</span>';
    } else {
      h += '<span class="v-cur-only">' + _esc(cv) + '</span>';
    }
    h += '</div>';
    return h;
  }

  window._garageDetailHtml = function(cur, tgt, cu, mu){
    var h = '';
    var cw = _splitVehicleWeaponList(cur);
    var tw = tgt ? _splitVehicleWeaponList(tgt) : null;
    h += _garageDetailRowMulti('主炮', cw.mainGun, tw ? tw.mainGun : null);
    h += _garageDetailRowMulti('機槍', cw.machineGun, tw ? tw.machineGun : null);
    h += _garageDetailRow('特殊武器', cur.weaponSpecial || '無', tgt ? (tgt.weaponSpecial || '無') : null);
    h += _armorRows(cur.armorGrid, tgt ? tgt.armorGrid : null);
    h += _spdRow(cur, tgt);
    h += _garageDetailRow('支援', cur.supportDuration + 's', tgt ? tgt.supportDuration + 's' : null);
    if(cu != null && mu > 0){
      h += '<div class="garage-stat-row"><span class="k">電台</span><span class="v-cur-only">' + cu + ' / ' + mu + '</span></div>';
    }
    return h;
  };

  /* ============================================================
   * Part 6: 全局經驗 / 轉入數量整合到一行
   *   _garageShowTechDetail 每次打開詳情都會重新生成 #garage-transfer-row
   *   用 MutationObserver 檢測並重整 DOM 結構
   * ============================================================ */
  // [整理] _styleNum 已删除（v32 _restore 清 inline style，调用无实际效果）
  function _integrateTransferRow(){
    var row = document.getElementById('garage-transfer-row');
    if(!row || row._integrated) return;

    var geDiv = row.querySelector(':scope > div:first-child');
    var sliderWrap = row.querySelector('.garage-transfer-slider-wrap');
    if(!geDiv || !sliderWrap){ return; }

    var infoRows = [];
    var _nodes = sliderWrap.querySelectorAll('.garage-transfer-slider-info');
    for(var i = 0; i < _nodes.length; i++) infoRows.push(_nodes[i]);
    if(infoRows.length < 3){ return; }

    row._integrated = true;

    var qtyRow = infoRows[0];
    var afterGeRow = infoRows[1];
    var afterProgRow = infoRows[2];

    /* --- 第一行：全局經驗 + 轉入數量 --- */
    row.style.cssText = 'display:flex;flex-direction:column;gap:5px;margin-top:10px';
    var line1 = document.createElement('div');
    line1.className = 'gt-line1';
    line1.style.cssText = 'display:flex;justify-content:space-between;align-items:baseline;gap:8px;min-width:0';

    geDiv.style.cssText = 'display:inline-flex;align-items:baseline;gap:4px;font-size:11px;flex:0 1 auto;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis';
    qtyRow.style.cssText = 'display:inline-flex;align-items:baseline;gap:4px;font-size:11px;flex:0 1 auto;min-width:0;white-space:nowrap';

        
    sliderWrap.removeChild(qtyRow);
    line1.appendChild(geDiv);
    line1.appendChild(qtyRow);
    row.insertBefore(line1, sliderWrap);

    /* --- 第二行：滑塊 --- */
    sliderWrap.style.cssText = 'display:flex;flex-direction:column;gap:3px;align-self:stretch';
    var slider = sliderWrap.querySelector('#gt-slider');
    if(slider){
      slider.style.cssText = 'width:100%;margin:0;accent-color:#e8a33d';
    }

    /* --- 第三行：轉入後預覽（左右並列） --- */
    var afterLine = document.createElement('div');
    afterLine.style.cssText = 'display:flex;justify-content:space-between;gap:8px;font-size:10px;color:#7a6f60;min-width:0';

    if(afterGeRow){
      sliderWrap.removeChild(afterGeRow);
      afterGeRow.style.cssText = 'display:inline-flex;align-items:baseline;gap:3px;font-size:10px;color:#7a6f60;white-space:nowrap;min-width:0';
      var b1 = afterGeRow.querySelector('b');
      if(b1){ b1.style.color = '#a45ede'; b1.style.fontSize = '11px'; b1.style.fontFamily = 'Menlo,Consolas,monospace'; b1.style.fontWeight = 'bold'; }
      afterLine.appendChild(afterGeRow);
    }
    if(afterProgRow){
      sliderWrap.removeChild(afterProgRow);
      afterProgRow.style.cssText = 'display:inline-flex;align-items:baseline;gap:3px;font-size:10px;color:#7a6f60;white-space:nowrap;min-width:0';
      var b2 = afterProgRow.querySelector('b');
      if(b2){ b2.style.color = '#e8a33d'; b2.style.fontSize = '11px'; b2.style.fontFamily = 'Menlo,Consolas,monospace'; b2.style.fontWeight = 'bold'; }
      afterLine.appendChild(afterProgRow);
    }
    sliderWrap.appendChild(afterLine);

    /* --- 第四行：確認按鈕（右對齊） --- */
    var actions = sliderWrap.querySelector('.garage-transfer-slider-actions');
    if(actions){
      actions.style.cssText = 'display:flex;justify-content:flex-end;margin-top:2px';
      var btn = actions.querySelector('#gt-confirm');
      if(btn) btn.style.cssText = 'padding:5px 16px;font-size:11px;border-radius:5px';
    }
  }

  /* 初次檢查 */
  _integrateTransferRow();

  /* MutationObserver：每次詳情彈窗重建時重新整合 */
  if(typeof MutationObserver !== 'undefined'){
    if(window._v30TransferObs){ try{ window._v30TransferObs.disconnect(); }catch(_){} }
    var _obs = new MutationObserver(function(){
      _integrateTransferRow();
    });
    _obs.observe(document.body, { childList: true, subtree: true });
    window._v30TransferObs = _obs;
  }

  /* ============================================================
   * Part 7: CSS
   * ============================================================ */
  var st = document.createElement('style');
  st.id = 'patcher-v30-style';
  st.textContent = [
    /* 裝甲 3 行 */
    '.garage-stat-row.armor-row{display:flex !important;align-items:center !important;gap:4px !important;min-width:0 !important;padding:1px 0 !important}',
    '.garage-stat-row.armor-row .k{flex:0 0 36px !important;white-space:nowrap !important;color:#a89a85 !important;font-size:10px !important;line-height:1.4 !important;text-align:left !important}',
    '.garage-stat-row .armor-val{flex:1 1 0 !important;min-width:0 !important;white-space:nowrap !important;text-overflow:ellipsis !important;overflow:hidden !important;line-height:1.4 !important;text-align:right !important;font-size:10px !important;font-variant-numeric:tabular-nums !important}',
    '.garage-stat-row .v-arrow{flex:0 0 auto !important;font-size:9px !important}',
    '.garage-stat-row .v-cur.armor-val{color:#7a6f60 !important}',
    '.garage-stat-row .v-cur-only.armor-val{color:#e8a33d !important;font-weight:bold !important}',
    '.garage-stat-row .v-new.armor-val{color:#e8a33d !important;font-weight:bold !important}',
    '.garage-stat-row .v-new.armor-val.diff{color:#a45ede !important}',
    '.garage-bottom-left,.garage-tech-detail-left{overflow-x:hidden !important}',
    '@media (max-width:380px){.garage-stat-row .armor-val{font-size:9px !important}}',
    /* transfer row */
    '#garage-transfer-row{display:flex !important;flex-direction:column !important;gap:5px !important}',
    '#garage-transfer-row .gt-line1{display:flex !important;justify-content:space-between !important;align-items:baseline !important;gap:8px !important;min-width:0 !important}',
    '#garage-transfer-row .garage-transfer-slider-wrap{display:flex !important;flex-direction:column !important;gap:3px !important}',
    '#garage-transfer-row .garage-transfer-slider-actions{display:flex !important;justify-content:flex-end !important;margin-top:2px !important}',
    /* 科技樹 */
    '.wt-tech-canvas{width:450px !important;height:440px !important}',
    '.wt-tech-wrap{cursor:grab;user-select:none;-webkit-user-select:none}',
    '.wt-node{user-select:none;-webkit-user-select:none}'
  ].join('\n');
  document.head.appendChild(st);

  /* ============================================================
   * Part 8: 若當前在車場頁，重繪
   * ============================================================ */
  try{
    var p = document.getElementById('garage-page');
    if(p && p.classList.contains('on') && typeof _garageRenderHtml === 'function'){
      p.innerHTML = _garageRenderHtml();
      if(typeof _garageBind === 'function') _garageBind();
    }
  }catch(e){}

  /* ============================================================
   * 診斷
   * ============================================================ */
  try{
    var _long = [];
    Object.keys(ARMOR_GRID).forEach(function(id){
      ARMOR_GRID[id].forEach(function(v){
        var _en = (v.match(/[A-Za-z0-9]/g) || []).length;
        if(_en > 8) _long.push(id + ':' + v + '(' + _en + ')');
      });
    });
    var _bad = Object.keys(ARMOR_GRID).filter(function(id){
      return typeof VEHICLES === 'undefined' || !VEHICLES[id] || !Array.isArray(VEHICLES[id].armorGrid) || VEHICLES[id].armorGrid.length !== 3;
    });
    }catch(e){ }
  })();

// [patcher-v32-patch]
// [patcher-fix-v32] 轉入後全局經驗 / 轉入後研發進度 各自獨立一行，位於確認按鈕上方
(function(){
  "use strict";
  if(window._patcherFixV32Installed) return;
  window._patcherFixV32Installed = true;

  /* 斷開 v30 的 observer，避免它又把兩行合併 */
  if(window._v30TransferObs){
    try{ window._v30TransferObs.disconnect(); }catch(_){}
    window._v30TransferObs = null;
  }

  function _fix(){
    var row = document.getElementById('garage-transfer-row');
    if(!row) return;
    if(row._v32fixed) return;

    var wrap = row.querySelector('.garage-transfer-slider-wrap');
    if(!wrap) return;

    var actions = wrap.querySelector('.garage-transfer-slider-actions');
    var afterGeRow = null, afterProgRow = null;

    /* v30 若合併過，先拆開 */
    var line2 = row.querySelector('.gt-line2');
    if(line2){
      var kids = Array.prototype.slice.call(line2.children);
      for(var i = 0; i < kids.length; i++){
        var k = kids[i];
        if(k.querySelector('#gt-after-ge')) afterGeRow = k;
        else if(k.querySelector('#gt-after-prog')) afterProgRow = k;
      }
      line2.remove();
    }

    /* 若沒在 line2，直接在 wrap 裡找 */
    if(!afterGeRow){
      var ge = wrap.querySelector('#gt-after-ge');
      if(ge) afterGeRow = ge.parentNode;
    }
    if(!afterProgRow){
      var prog = wrap.querySelector('#gt-after-prog');
      if(prog) afterProgRow = prog.parentNode;
    }
    if(!afterGeRow && !afterProgRow) return;

    row._v32fixed = true;

    /* 恢復原樣：label 文字、flex 佈局、b 標籤清 inline */
    function _restore(elm, labelText){
      if(!elm) return;
      elm.style.display = 'flex';
      elm.style.justifyContent = 'space-between';
      elm.style.alignItems = 'baseline';
      elm.style.gap = '4px';
      elm.style.fontSize = '11px';
      elm.style.color = '#7a6f60';
      elm.style.lineHeight = '1.4';
      elm.style.minWidth = '0';
      var sp = elm.querySelector('span');
      if(sp) sp.textContent = labelText;
      var b = elm.querySelector('b');
      if(b) b.removeAttribute('style');
    }

    _restore(afterGeRow, '轉入後全局經驗');
    _restore(afterProgRow, '轉入後研發進度');

    /* 順序：slider → afterGe → afterProg → actions */
    if(actions){
      if(afterGeRow) wrap.insertBefore(afterGeRow, actions);
      if(afterProgRow) wrap.insertBefore(afterProgRow, actions);
    } else {
      if(afterGeRow && afterGeRow.parentNode !== wrap) wrap.appendChild(afterGeRow);
      if(afterProgRow && afterProgRow.parentNode !== wrap) wrap.appendChild(afterProgRow);
    }
  }

  _fix();

  if(typeof MutationObserver !== 'undefined'){
    if(window._v32Obs){ try{ window._v32Obs.disconnect(); }catch(_){ } }
    var o = new MutationObserver(_fix);
    o.observe(document.body, { childList: true, subtree: true });
    window._v32Obs = o;
  }

  })();







// ★ v126：完美触控
(function(){
  if(window._v126TechTreePatched) return;
  window._v126TechTreePatched = true;

  // 清理历史样式
  for(var i=100; i<=125; i++){
    var el = document.getElementById('wt-tech-v'+i+'-style');
    if(el) el.remove();
  }

  if(!document.getElementById('wt-tech-v126-style')){
    var st = document.createElement('style');
    st.id = 'wt-tech-v126-style';
    st.textContent = `
      .modal-bd-inner.wt-tech-modal {
        padding: 0 !important;
        overflow: hidden !important;
        display: flex !important;
        flex-direction: column !important;
      }
      .wt-tech-custom-scroll {
        flex: 1 !important;
        width: 100% !important;
        height: 100% !important;
        overflow: auto !important;
        scrollbar-width: none !important;
        -ms-overflow-style: none !important;
        -webkit-overflow-scrolling: touch; 
        user-select: none; 
        -webkit-user-select: none;
        touch-action: manipulation; 
      }
      .wt-tech-custom-scroll:active {
        cursor: grabbing;
      }
      .wt-tech-custom-scroll::-webkit-scrollbar {
        display: none !important;
      }
    `;
    document.head.appendChild(st);
  }

  window._garageOpenTechTree = function(){
    var NW = 100, NH = 64;
    var nodes = [
      { vid:'btr80',  x:140, y:10  },
      { vid:'btr80a', x:20,  y:90  },
      { vid:'btr82',  x:20,  y:170 },
      { vid:'btr82a', x:20,  y:250 },
      { vid:'btr90',  x:20,  y:330 },
      { vid:'bmp1',   x:140, y:90  },
      { vid:'bmp1m',  x:140, y:170 },
      { vid:'bmp2',   x:140, y:250 },
      { vid:'bmp3',   x:140, y:330 },
      { vid:'bmd4',   x:140, y:410 },
      { vid:'t80',    x:260, y:90  },
      { vid:'t80b',   x:260, y:170 },
      { vid:'t80bv',  x:260, y:250 },
      { vid:'t80u',   x:260, y:330 },
      { vid:'t80uk',  x:260, y:440 },
      { vid:'t80um',  x:380, y:440 }
    ];

    var svg = '<svg width="500" height="520" style="position:absolute;left:0;top:0;pointer-events:none" xmlns="http://www.w3.org/2000/svg">';
    svg += '<path d="M 190 74 L 190 80 L 70 80 L 70 90" stroke="#8a5f18" stroke-width="2" fill="none"/>';
    svg += '<line x1="190" y1="74" x2="190" y2="90" stroke="#8a5f18" stroke-width="2"/>';
    svg += '<path d="M 190 74 L 190 80 L 310 80 L 310 90" stroke="#8a5f18" stroke-width="2" fill="none"/>';
    svg += '<line x1="70" y1="154" x2="70" y2="170" stroke="#8a5f18" stroke-width="2"/>';
    svg += '<line x1="70" y1="234" x2="70" y2="250" stroke="#8a5f18" stroke-width="2"/>';
    svg += '<line x1="70" y1="314" x2="70" y2="330" stroke="#8a5f18" stroke-width="2"/>';
    svg += '<line x1="190" y1="154" x2="190" y2="170" stroke="#8a5f18" stroke-width="2"/>';
    svg += '<line x1="190" y1="234" x2="190" y2="250" stroke="#8a5f18" stroke-width="2"/>';
    svg += '<line x1="190" y1="314" x2="190" y2="330" stroke="#8a5f18" stroke-width="2"/>';
    svg += '<line x1="190" y1="394" x2="190" y2="410" stroke="#8a5f18" stroke-width="2"/>';
    svg += '<line x1="310" y1="154" x2="310" y2="170" stroke="#8a5f18" stroke-width="2"/>';
    svg += '<line x1="310" y1="234" x2="310" y2="250" stroke="#8a5f18" stroke-width="2"/>';
    svg += '<line x1="310" y1="314" x2="310" y2="330" stroke="#8a5f18" stroke-width="2"/>';
    // T80U 平级分叉
    svg += '<line x1="310" y1="394" x2="310" y2="440" stroke="#8a5f18" stroke-width="2"/>';
    svg += '<path d="M 310 404 L 430 404 L 430 440" stroke="#8a5f18" stroke-width="2" fill="none"/>';
    svg += '</svg>';

    var g = _garageInitState();
    var research = _garageGetResearchInfo();
    var researchId = research ? research.targetId : null;
    var nodesHtml = '';
    for(var i = 0; i < nodes.length; i++){
      var n = nodes[i];
      var v = VEHICLES[n.vid];
      if(!v) continue;
      var owned = g.ownedVehicles.indexOf(n.vid) >= 0;
      var isCurrent = g.currentVehicle === n.vid;
      var isResearch = (researchId === n.vid);
      var prereqs = Object.keys(VEHICLES).filter(function(pvid){
        return (VEHICLES[pvid].next || []).indexOf(n.vid) >= 0;
      });
      var hasAllPrereq = (prereqs.length === 0) || prereqs.every(function(pid){ return g.ownedVehicles.indexOf(pid) >= 0; });
      var cls = 'wt-node';
      var mark = '';
      if(owned && isCurrent){ cls += ' current'; mark = '✓'; }
      else if(owned){ cls += ' owned'; mark = '✓'; }
      else if(!hasAllPrereq){ cls += ' locked'; mark = '🔒'; }
      else if(isResearch){ cls += ' researching'; mark = '🔬'; }
      else if(v.researchCost){ cls += ' researchable'; mark = '🔬'; }
      else { cls += ' locked'; mark = '?'; }
      
      nodesHtml += '<div class="' + cls + '" data-tech-node="' + n.vid + '" style="left:' + n.x + 'px;top:' + n.y + 'px;width:' + NW + 'px;height:' + NH + 'px">'
        + '<div class="wt-node-img"><img draggable="false" src="icons/vehicles/' + n.vid + '.png' + assetSuffix() + '" data-fallback="1" alt=""></div>'
        + '<div class="wt-node-name">' + v.name + '</div>'
        + '<div class="wt-node-mark">' + mark + '</div>'
        + '</div>';
    }

    var body = '<div class="wt-tech-custom-scroll">' +
               '<div style="position:relative; width:500px; height:520px; margin:0; padding:10px 0 10px 20px; box-sizing:border-box;">' + 
               svg + nodesHtml + 
               '</div></div>';

    var bd = openModal({ title: '科技樹', body: body });
    
    if(bd) {
      bd.classList.add('wt-tech-modal');
      var scrollEl = bd.querySelector('.wt-tech-custom-scroll');
      if (scrollEl) {
        scrollEl.addEventListener('dragstart', function(e) { e.preventDefault(); });
        scrollEl.addEventListener('dblclick', function(e) { e.preventDefault(); });

        var isDown = false, startX = 0, startY = 0, scrollLeft = 0, scrollTop = 0;
        var hasMoved = false;

        scrollEl.addEventListener('pointerdown', function(e){
          isDown = true;
          hasMoved = false;
          startX = e.clientX; 
          startY = e.clientY;
          scrollLeft = scrollEl.scrollLeft; 
          scrollTop = scrollEl.scrollTop;
        });
        
        scrollEl.addEventListener('pointermove', function(e){
          if (!isDown) return;
          var dx = e.clientX - startX, dy = e.clientY - startY;
          
          // 移动超过 5 像素才视为拖拽
          if (!hasMoved && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
            hasMoved = true;
            if (e.pointerType === 'mouse') {
              scrollEl.style.cursor = 'grabbing';
              try { scrollEl.setPointerCapture(e.pointerId); } catch(_){}
            }
          }
          
          // 只有鼠标拖拽才在这里手动滚动，触控交给浏览器原生
          if (hasMoved && e.pointerType === 'mouse') {
            if (e.cancelable) e.preventDefault();
            scrollEl.scrollLeft = scrollLeft - dx;
            scrollEl.scrollTop = scrollTop - dy;
          }
        });
        
        function endPan(e) {
          if (!isDown) return;
          isDown = false;
          
          if (hasMoved) {
            scrollEl.style.cursor = '';
            try { scrollEl.releasePointerCapture(e.pointerId); } catch(_){}
            // 延迟重置，以便拦截紧随其后的 click
            setTimeout(function(){ hasMoved = false; }, 50);
          }
        }
        scrollEl.addEventListener('pointerup', endPan);
        scrollEl.addEventListener('pointercancel', endPan);

        // 捕获阶段拦截误触
        scrollEl.addEventListener('click', function(e) {
          if (hasMoved) {
            e.preventDefault();
            e.stopPropagation();
          }
        }, true);
      }
    }

    if(typeof _garageBindTechImgs === 'function') _garageBindTechImgs(bd);
    var btns = bd.querySelectorAll('[data-tech-node]');
    for(var bi = 0; bi < btns.length; bi++){
      (function(btn){
        btn.onclick = function(e){
          var vid = btn.getAttribute('data-tech-node');
          _garageShowTechDetail(vid);
        };
      })(btns[bi]);
    }
  };
})();

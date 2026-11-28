/* rev-remove-named-prefix-fix: 具名武器 id 无前缀，兼容旧存档 */
function parseNamedId(id){
  if(!id) return null;
  if(typeof WEAPONS === "undefined") return null;
  var p = id.split("_");
  if(p.length !== 4 || !WEAPONS[p[0]]) return null;
  return { baseId: p[0], mag: p[1] === "x" ? null : parseInt(p[1],10), scope: p[2] === "x" ? null : p[2], grip: p[3] === "x" ? null : p[3] };
}
function isNamedWeaponId(id){ return parseNamedId(id) !== null; }
/* rev-fix-slot-label: 全局 slot 名称映射（最早加载，确保所有文件可用） */
window.slotLabel = function(s){
  if(!s) return '';
  return { primary:'主武器', secondary:'副武器', melee:'近戰武器', throwable:'投擲物', head:'頭盔', face:'面罩', top:'護甲', top_armored:'護甲', backpack:'背包', pants:'褲子', shoes:'鞋子' }[s] || s;
};

/* ═══════════════════════════════════════════════════════════
 * 【術語鎖】本項目所有 *_DETECTABLE_R 一律讀作「該實體的可被發現半徑 R」。
 * 本項目沒有「主動探測距離」。
 * 開火條件（唯一一條）：dist ≤ R_目標 且 dist ≤ 自身射程
 * 由 window.canEngage(range, target, dist) 統一判定。
 * ═══════════════════════════════════════════════════════════ */
(function(){
'use strict';
window.escapeHtml = function(s){
  if (s == null) return '';
  return String(s).replace(/[&<>"']/g, function(c){
    return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
  });
};
window.sortByRarityDesc = function(a, b){
  if (typeof RARITY_ORDER === 'undefined') return 0;
  return RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity);
};
window.isBossType = function(bid, type){
  var map = {
    hydra:   ['swamp_hydra','swamp_hydra_ii'],
    omega:   ['core_omega','core_omega_ii'],
    tyrant:  ['road_tyrant','road_tyrant_ii'],
    factory: ['factory_king','factory_king_ii'],
    lab:     ['lab_queen','lab_queen_ii']
  };
  return (map[type] || []).indexOf(bid) !== -1;
};
window._collapseStates = window._collapseStates || {};
window.hasCrewTalent = function(role, talentId){
  if(typeof state === 'undefined' || !state.station || !state.station.crew) return false;
  var sid = state.station.crew[role];
  if(!sid) return false;
  var servants = state.servants || [];
  for(var i = 0; i < servants.length; i++){
    if(servants[i].id === sid){
      return Array.isArray(servants[i].talents) && servants[i].talents.indexOf(talentId) >= 0;
    }
  }
  return false;
};

/* rev142: 統一的「可被發現半徑 R」查詢入口 */
window.getEntityDetectableR = function(entity){
  if(!entity) return 80;
  /* rev-known-target: 已選定的既有目標（掃蕩清單來自 defeatedBosses）沒有隱蔽性。
     術語鎖不變：A 對 B 開火 <=> dist <= R_B 且 dist <= A 自身射程；
     這裡只讓「已知目標」的 R_B = Infinity，武器射程閘門完全保留。 */
  if(entity._known) return Infinity;
  if(entity.isBoss){
    return (typeof window._bossDetectableR === 'function') ? window._bossDetectableR(entity.bossId) : 70;
  }
  if(entity.isVehicle){
    return (typeof window.getVehicleDetectableR === 'function') ? window.getVehicleDetectableR(entity.vehicleId) : 80;
  }
  if(entity.isPassenger){
    return (typeof SERVANT_DETECTABLE_R !== 'undefined') ? SERVANT_DETECTABLE_R : 80;
  }
  if(entity.isPlayer){
    /* 潛行 R 由「當前是否帶主副武器」決定 —— 唯一真相源是裝備，不是模式旗標 */
    var eq = (typeof state !== 'undefined' && state.player && state.player.equipped) ? state.player.equipped : null;
    var armed = !!(eq && (eq.primary || eq.secondary));
    if(typeof PLAYER_DETECTABLE_R === 'undefined') return armed ? 80 : 40;
    return armed ? (PLAYER_DETECTABLE_R.attack || 80) : (PLAYER_DETECTABLE_R.stealth || 40);
  }
  if(entity.isGuard){
    return (typeof GARDEN_GUARD_DETECTABLE_R !== 'undefined') ? GARDEN_GUARD_DETECTABLE_R : 40;
  }
  if(entity.rarity && typeof ENEMY_DETECTABLE_R !== 'undefined'){
    return ENEMY_DETECTABLE_R[entity.rarity] || 225;
  }
  if(typeof entity.detectableR === 'number') return entity.detectableR;
  return 80;
};

/* rev142: 統一交戰判定——目標須在「自身的可被發現距離」內、且在自己的射程內 */
/* rev-fix-live-fallback: 預設實現，18-vehicle-combat.js 會用快照版覆蓋。
 * 所有調用點直接 window._getLiveStation() / window._getLiveVehicleAmmo(vid)，不需 typeof 守衛。 */
/* rev-fix-charlayer-common: 角色 layer 任意角點 → canvas 歸一化座標
 * 供探索手部、Boss 釋放幀手部、後院長官槍口等共用；
 * 調用方傳入自己的 canvas 尺寸、scale、centerX/groundY 像素，函數內部做「pivot + key 旋轉」再映射。
 * u/v: 0..1，在 layer 本地矩形上的相對位置（右上頂點 = u:1, v:0）
 * opts: {
 *   animName, frameIdx,
 *   canvasW, canvasH,           // 歸一化基準（screen px）
 *   scale,                      // 角色繪製縮放比 = spriteH * CHAR_HEIGHT_FACTOR(_BATTLE) / 386
 *   centerX_px, groundY_px,     // 角色中心 / 腳底在 screen 的 px（角色 pivot 對齊處）
 *   layerOverride               // 可選，直接傳 layer 定義，跳過 GAME_LAYERS 查找
 * }
 * 回傳 { x, y } 歸一化到 [0..1]，以 canvasW/canvasH 為單位 */
window.getCharLayerCornerN = function(layerId, u, v, opts){
  opts = opts || {};
  const cw = opts.canvasW || 400, ch = opts.canvasH || 500;
  if(!cw || !ch) return { x: 0.25, y: 0.5 };
  const L = opts.layerOverride || (typeof GAME_LAYERS !== 'undefined'
    ? GAME_LAYERS.find(function(l){ return l.id === layerId; })
    : null);
  if(!L) return { x: 0.25, y: 0.5 };
  const anim = (typeof GAME_ANIMS !== 'undefined' && GAME_ANIMS[opts.animName || 'idle']) || null;
  const fc = anim ? anim.frameCount : 1;
  const fi = anim ? (((opts.frameIdx || 0) % fc) + fc) % fc : 0;
  const key = (anim && anim.keys && anim.keys[L.id] && anim.keys[L.id][fi]) || { rot:0, dx:0, dy:0 };

  const B = { x: 30, y: 30, w: 340, h: 460 };
  const ORIG_FOOT_X = 200, ORIG_FOOT_Y = 515;
  const scale = opts.scale || 1;
  const cx = B.x + B.w * (L.x + (key.dx || 0) * 0.01);
  const cy = B.y + B.h * (L.y + (key.dy || 0) * 0.01);
  const w = B.w * L.w, h = B.h * L.h;
  const px = w * L.pivot.x, py = h * L.pivot.y;

  const offX = w * u - px;
  const offY = h * v - py;
  const rot = ((L.rot || 0) + (key.rot || 0)) * Math.PI / 180;
  const cR = Math.cos(rot), sR = Math.sin(rot);
  const rOffX = offX * cR - offY * sR;
  const rOffY = offX * sR + offY * cR;

  const canvasX = (cx + rOffX) - ORIG_FOOT_X;
  const canvasY = (cy + rOffY) - ORIG_FOOT_Y;

  const screenX = (opts.centerX_px || cw * 0.25) + scale * canvasX;
  const screenY = (opts.groundY_px || ch * 0.95) + scale * canvasY;
  return { x: screenX / cw, y: screenY / ch };
};
window._getLiveStation = window._getLiveStation || function(){
  if(typeof state === 'undefined') return { crew:{}, passengers:[] };
  return state.station || { crew:{}, passengers:[] };
};
window._getLiveVehicleAmmo = window._getLiveVehicleAmmo || function(vid){
  if(typeof state === 'undefined') return null;
  return state.vehicleAmmo && state.vehicleAmmo[vid];
};

/* 世界推進速度唯一出口：探索讀 _explore，掃蕩讀 battle._worldSpeed。
   載具渲染 / wreck 位移 / 掃蕩推進全部走這條，不再各自讀一份。 */
window._currentWorldSpeed = function(){
  var b = (window.BossModule && window.BossModule.battle) ? window.BossModule.battle : null;
  if(b && b.active && b.sweep && typeof b._worldSpeed === 'number') return b._worldSpeed;
  return (window._explore && window._explore._currentSpeed) || 0;
};
window.canEngage = function(attackerRange, targetOrR, dist){
  var R;
  if(typeof targetOrR === 'number') R = targetOrR;
  else R = window.getEntityDetectableR(targetOrR);
  return dist <= R && dist <= attackerRange;
};

/* rev-fix-position: 从 16-combat.js 移入。纯函数，无依赖，供 16（_renderTracers）与 23（防御战 tracer）共用。 */
window._hexToRgba = function(hex, a){
  if(!hex) return 'rgba(255,255,255,' + a + ')';
  if(hex.indexOf('rgb') === 0) return hex.replace(')', ', ' + a + ')').replace('rgb(', 'rgba(');
  const h = hex.replace('#','');
  const r = parseInt(h.substring(0,2),16);
  const g = parseInt(h.substring(2,4),16);
  const b = parseInt(h.substring(4,6),16);
  return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
};
})();

/* ===== rev-unify:start ===== */
/* ============================================================
   rev-unify: 距離數字唯一格式化器。
   規則完全照探索 _renderFrames 現行：< 1m 保留一位小數，否則整數。
   探索右側氣泡 / 左側載員氣泡 / 後院氣泡 / Boss 氣泡 / Boss 虛影標籤
   一律呼叫此函式，任何一处改規則不會再造成场景間不一致。
   ============================================================ */
window._fmtDistN = function(d){
  var v = (typeof d === "number" && isFinite(d)) ? Math.abs(d) : 0;
  return v < 1 ? v.toFixed(1) : String(Math.round(v));
};
/* ===== rev-unify:end ===== */

/* ===== 事件歸屬（執行期索引，不進存檔物件圖） =====
   敵人 → 事件 的反向參考掛在敵人身上會與 event.content 形成 JSON 循環，
   使 JSON.stringify(state) 拋錯、存檔靜默失敗。改以 WeakMap 側表保存。 */
const _enemyEventRef = new WeakMap();
window._setEnemyEvent = function(en, ev){
  if(!en || typeof en !== 'object') return;
  if(ev) _enemyEventRef.set(en, ev); else _enemyEventRef.delete(en);
};
window._getEnemyEvent = function(en){
  if(!en || typeof en !== 'object') return null;
  return _enemyEventRef.get(en) || null;
};

/* ===== 載員戰位（世界米，唯一真相源） =====
   顯式戰位表：前兩名拉開大空隙讓出玩家（+0.7 / -0.8，中間 1.5m），
   其後每名間距 0.6m（>= 身體寬 0.5m，不重疊）。
   螢幕外的載員不硬塞進畫面 —— 由左側氣泡 + 倒地補位機制補償。
   targetX 一律回到玩家錨點，screenX 完全由 worldX 決定；
   追趕 / 補位 / 氣泡距離全讀同一表。 */
window._PT_SLOT_DX = [0.7, -0.8, -1.4, -2.0, -2.6, -3.2, -3.8, -4.4];
window._ptSyncSlots = function(ex){
  if(!ex || !Array.isArray(ex.passengersFollowing)) return;
  var hr = (typeof EXPLORE_HERO_X_RATIO === 'number') ? EXPLORE_HERO_X_RATIO : 0.25;
  var T = window._PT_SLOT_DX;
  var L = ex.passengersFollowing;
  for(var i = 0; i < L.length; i++){
    var it = L[i];
    if(!it || it._retreating) continue;
    var tx = (typeof it.targetX === 'number') ? it.targetX : hr;
    /* targetX 由 _updatePT 按存活順位寫入：0.35→0、0.15→1、-0.12-0.12*(j-2)→j。
       倒地者 targetX 停在 hr，rank=-1 → 保留原戰位（屍體随背景左移）。 */
    var rank = -1;
    if(Math.abs(tx - 0.35) < 1e-6) rank = 0;
    else if(Math.abs(tx - 0.15) < 1e-6) rank = 1;
    else if(tx < -0.12 + 1e-6) rank = 2 + Math.round((-0.12 - tx) / 0.12);
    if(rank >= 0){
      it._slotDX = (rank < T.length) ? T[rank] : (T[T.length-1] - 0.6 * (rank - T.length + 1));
    } else if(typeof it._slotDX !== 'number'){
      it._slotDX = 0;
    }
    it.targetX = hr;
  }
  var c = window._combat;
  if(c && Array.isArray(c.allies)){
    for(var j = 1; j < c.allies.length; j++){
      var a = c.allies[j];
      if(!a || !a.isPassenger || !a.srv) continue;
      for(var q = 0; q < L.length; q++){
        if(L[q].srv && L[q].srv.id === a.srv.id){ a._slotDX = L[q]._slotDX || 0; break; }
      }
    }
  }
};

/* ===== rev-rpg27-trail: RPG-27（105mm 一次性反坦克火箭）尾煙物理參數 =====
   口徑 0.105m；尾流初始直徑 ≈ 2×口徑，随湍流線性擴散。
   沉積採固定世界間距（不是按幀、也不是按飛行進度比例）：
   間距 0.12m < 直徑 0.21m → 相鄰煙團恆重疊 → 連續煙柱而非分離點。
   半徑 / 高度一律存世界米，渲染時經 ppm 換算 → 任何裝置物理尺寸一致。
   煙留在空氣裡：世界座標固定，由相機前進把它掃入畫面。 */
/* rev-rpg27-plume-v2: 尾流 = 發動機排焰羽流，初始直徑 ~0.5m（r0 0.25），
   非 2×口徑。間距 0.12 < 有效半徑 → 連續煙柱。alpha 0.18 配合壓平漸變。 */
/* rev-rpg27-data: RPG-27「Tavolga」/ PG-27 唯一數據源。
   105mm 拋棄式無後座筒 —— 發射藥在筒內燃盡，飛行段無續燃發動機，
   所以沒有排焰羽流；可見尾跡是曳光煙，尺度回到口徑級。
   speed 供彈道與 APS 閘門；caliberMM 供 APS 口徑閘門（>=40 通過）。
   r0 = 1×口徑半徑（直徑 2×口徑）；grow 收斂，1.2s 末約 3.4×口徑。
   間距 0.12m < 有效直徑 → 連續；alpha 由沉積端再乘隨機，製造斑駁。 */
/* rev-missile-rpg27: RPG-27 唯一數據源（105mm/130m/s，筒內燃盡無續燃→曳光煙） */
window._RPG27 = {
  caliber: 0.105, caliberMM: 105, speed: 130,
  r0: 0.105, grow: 0.06, spacing: 0.12, life: 1.2, alpha: 0.30, rise: 0.10
};
window._rpg27Spd = function(){ return (window._RPG27 && window._RPG27.speed) || 130; };
window._rpg27Cal = function(){ return (window._RPG27 && window._RPG27.caliberMM) || 105; };

/* 世界錨定粒子的螢幕投影（爆炸 / 尾煙共用，避免各處各寫一份） */
window._fxProjectPx = function(q, W){
  if(!q) return null;
  if(!q._ft && q._wx === undefined) return (typeof q.x === 'number') ? q.x : null;
  var c = window._combat;
  var cam = (c && c.allies && c.allies[0] && typeof c.allies[0].worldX === 'number') ? c.allies[0].worldX : 0;
  var sr = (c && c.sm && c.sm.screenRightWorld) || 2;
  var hr = (typeof EXPLORE_HERO_X_RATIO === 'number') ? EXPLORE_HERO_X_RATIO : 0.25;
  var awx = q._ft ? ((q._ft.worldX || 0) + (q._fdx || 0)) : q._wx;
  return (hr + (awx - cam) / sr * (1 - hr)) * W;
};

/* 沿本幀飛過的路徑沉積尾煙。只沉積「壽命內有機會進入畫面」的區段：
   相機在 life 秒內前進 spd*life，加上可視右半窗 srw，即為可達距離。
   更遠的煙在相機抵達前就已消散，沉積它們只是浪費。 */
window._rpgTrailDeposit = function(owner, b, t0, t1, P){
  if(!owner || !b || !(t1 > t0)) return;
  P = P || window._RPG27; if(!P) return;
  if(!owner.rpgSmoke) owner.rpgSmoke = [];
  if(owner.rpgSmoke.length > 900) return;
  /* rev-trail-no-reach: 移除 reach 過濾器 —— 全速時它把「連到爆點的最後一段煙」
     整段丟掉（reach≈27m 但爆點在 30m 外），造成煙與爆炸分離。上限 900 + 渲染裁切已足夠。 */
  var dx = b.impactX - b.startX, dy = b.impactY - b.startY;
  var pathLen = Math.abs(dx);
  if(!(pathLen > 0.01)) return;
  var spacing = P.spacing || 0.12;
  var steps = Math.ceil(pathLen * (t1 - t0) / spacing);
  if(steps < 1) steps = 1; if(steps > 400) steps = 400;
  for(var i = 1; i <= steps; i++){
    var t = t0 + (t1 - t0) * (i / steps);
    var wx = b.startX + dx * t;
    var wy = b.startY + dy * t;
    owner.rpgSmoke.push({
      _wx: wx, _wy: wy + (Math.random() - 0.5) * 0.06,
      age: 0, life: P.life * (0.7 + Math.random() * 0.6), /* rev-smoke-life-jitter: 壽命離散，斷裂同生同死的剛體柱 */
      r0: P.r0 * (0.85 + Math.random() * 0.3),
      grow: P.grow * (0.8 + Math.random() * 0.5),
      vy: (P.rise || 0.10) * (0.5 + Math.random()),
      alpha: P.alpha * (0.7 + Math.random() * 0.6)
    });
  }
};

/* ===== rev-fx-logical-view: 畫布邏輯尺寸唯一出口 =====
   战斗 FX 畫布背板 = CSS × dpr（與載具畫布一致），ctx 帶 dpr 變換，
   因此所有繪製 / 裁切 / 投影都必須用 CSS（邏輯）座標，不能用 canvas.width。
   clientWidth 即佈局寬；未設 CSS 尺寸時它等於 width 屬性，故對舊畫布同樣安全。 */
window._fxViewW = function(cv){ return (cv && (cv.clientWidth || cv.width)) || 400; };
window._fxViewH = function(cv){ return (cv && (cv.clientHeight || cv.height)) || 500; };


/* ===== rev-missile-visual: 導彈/火箭 icon 渲染數據（彈體長=飛行部分，不含藥筒/發射筒） ===== */
window.MISSILE_VISUAL = /* rev-smoke-caliber: 羽流尺度按實際口徑 —— r0=口徑(m)，grow 沿用 _RPG27 的 grow/r0 比例，
   spacing=min(原間距, 1.6×r0) 保證沉積連續（最小直徑 2×0.85×r0 > spacing）。
   09 選參數組時合併這三個欄位；未標者（ATGM / 舊 rpg）沿用參數組預設。 */
{
  'rpg':     { icon:'pg27',    len:0.90,  smoke:'tracer' },
  '9m112':   { icon:'9m112',   len:0.96,  smoke:'rocket' },
  '9m119m':  { icon:'9m119m',  len:0.695, smoke:'rocket' },
  '9m117m1': { icon:'9m117m1', len:1.11,  smoke:'rocket' },
  '9m113':   { icon:'9m113',   len:1.165, smoke:'rocket' },
  '9m14':    { icon:null,      len:null,  smoke:'rocket', crop:true }
,
/* ===== rev-rpg-tier: 五級火箭 visual =====
   四款無圖 → icon:null，_drawMissileIcon 回 false → 不畫彈體（只有尾煙）。
   smoke:'tracer' 沿用已認可的 _RPG27 羽流參數（此旗標只是參數組選擇器）。
   len = 真實彈體長（m），供鼻端錨定與掃描段裁切。 */
'pg18':  { icon:null,   len:0.60, smoke:'tracer', r0:0.064, grow:0.0366, spacing:0.1024 },
'pg22':  { icon:null,   len:0.66, smoke:'tracer', r0:0.0725, grow:0.0414, spacing:0.116 },
'pg26':  { icon:null,   len:0.72, smoke:'tracer', r0:0.0725, grow:0.0414, spacing:0.116 },
'pg7vl': { icon:null,   len:0.89, smoke:'tracer', r0:0.093, grow:0.0531, spacing:0.12 },
'pg27':  { icon:'pg27', len:0.90, smoke:'tracer', r0:0.105, grow:0.06, spacing:0.12 },
};
/* 火箭排焰煙（續燃/排氣）與曳光煙（RPG-27）分參數；間距統一 */
window.MISSILE_TRAIL = { r0:0.12, grow:0.25, spacing:0.12, life:2.0, alpha:0.30, rise:0.15 };
window._mvIconCache = window._mvIconCache || {};
window._missileIconInfo = function(id){
  /* 自帶 loader：getHeroImg 不載 rounds/ 路徑（實測 214 次呼叫全回 null）。
     結果快取（含失敗），避免每幀重建 canvas + getImageData。
     量測失敗（tainted canvas 等）退回整圖矩形，icon 仍然畫得出來。 */
  var v = window.MISSILE_VISUAL && window.MISSILE_VISUAL[id];
  if(!v || !v.icon) return null;
  var C = window._mvIconCache;
  if(C[id] === null) return null;
  var e = C[id];
  if(!e){
    var path = 'icons/vehicle-ammo/rounds/' + v.icon + '.png';
    var suf = (typeof assetSuffix === 'function') ? assetSuffix(path) : '';
    var img = new Image();
    e = C[id] = { img: img, ready: false, bounds: null };
    img.onerror = function(){ C[id] = null; };
    img.src = path + suf;
  }
  if(e.ready) return e.bounds;
  var im = e.img;
  if(!im.complete || !im.naturalWidth) return null;
  var w = im.naturalWidth, h = im.naturalHeight;
  var b = { img: im, sx: 0, sy: 0, sw: w, sh: h };
  try{
    var cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    var cx = cv.getContext('2d'); cx.drawImage(im, 0, 0);
    var d = cx.getImageData(0, 0, w, h).data;
    var minX = w, maxX = -1, minY = h, maxY = -1;
    for(var y = 0; y < h; y++){
      var off = y * w * 4;
      for(var x = 0; x < w; x++){
        if(d[off + x * 4 + 3] > 10){
          if(x < minX) minX = x;
          if(x > maxX) maxX = x;
          if(y < minY) minY = y;
          if(y > maxY) maxY = y;
        }
      }
    }
    if(maxX >= 0){ b.sx = minX; b.sy = minY; b.sw = maxX - minX + 1; b.sh = maxY - minY + 1; }
  }catch(err){}
  e.bounds = b; e.ready = true;
  return b;
}
/* 鼻端朝上 icon：內容高→lenPx，旋轉 ang=atan2(ux,-uy) 使鼻端對準速度向量 */
window._drawMissileIcon = function(ctx, id, px, py, ang, lenPx, alpha, noseAnchor){
  /* 鼻端朝上 icon：內容高 → lenPx。noseAnchor=true 時鼻端對齊 (px,py)，
     彈體向後延伸 —— 配合炮口半平面裁切即為「從不可見到完整出現」。 */
  var info = window._missileIconInfo(id);
  if(!info || !(lenPx > 0) || !(info.sh > 0)) return false;
  var sc = lenPx / info.sh, dw = info.sw * sc, dh = lenPx;
  ctx.save();
  ctx.globalAlpha = (alpha == null ? 1 : alpha);
  ctx.translate(px, py);
  ctx.rotate(ang);
  ctx.drawImage(info.img, info.sx, info.sy, info.sw, info.sh, -dw / 2, noseAnchor ? 0 : -dh / 2, dw, dh);
  ctx.restore();
  return true;
}
/* 統一尾煙渲染：世界米 + source-over + 壓平漸變 + 拖影 */
window._renderTrailSmoke = function(ctx,c,W,H){
  if(!c||!c.rpgSmoke||!c.rpgSmoke.length)return;
  var ppm=(c.sm&&c.sm.bgPixelsPerMeter)?c.sm.bgPixelsPerMeter:(H*0.58/1.7);
  ctx.save();ctx.globalCompositeOperation='source-over';
  for(var i=0;i<c.rpgSmoke.length;i++){
    var s=c.rpgSmoke[i];
    var lf=(typeof s.life==='number'&&s.life>0)?s.life:1.2;
    var raw=1-s.age/lf;if(raw<=0)continue;
    var sa=Math.pow(raw,0.7);
    var rM=(typeof s.r0==='number')?(s.r0+(s.grow||0)*s.age):((s.size||0.02)*W/ppm);
    var sr=Math.max(0.5,rM*ppm);
/* rev-smoke-density: 質量守恆 —— 膨脹時投影光學厚度按 (r0/r)² 稀釋，
   否則半徑長大而濃度不變，煙柱永不變淡。 */
if(typeof s.r0==='number'&&rM>s.r0){var _dR=s.r0/rM;sa*=_dR*_dR;}
    var sy=(typeof s._wy==='number')?(H*0.95-s._wy*ppm):(s.y*H);
    var sx=(typeof s._wx==='number')?window._fxProjectPx(s,W):(s.x*W);
    var pv=(typeof s._pvPx==='number')?s._pvPx:null;s._pvPx=sx;
    if(!isFinite(sx)||sx<-W*0.5||sx>W*1.5)continue;
    var tdx=(pv!=null)?(sx-pv):0, trx=sr+Math.abs(tdx)*0.5;
    ctx.save();
    ctx.globalAlpha=sa*(typeof s.alpha==='number'?s.alpha:0.30);
    ctx.translate(sx-tdx*0.5,sy);ctx.scale(trx/Math.max(0.001,sr),1);
    var g=ctx.createRadialGradient(0,0,0,0,0,sr);
    g.addColorStop(0,'rgba(238,238,242,0.92)');
    g.addColorStop(0.7,'rgba(198,198,206,0.55)');
    g.addColorStop(1,'rgba(170,170,180,0)');
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,sr,0,Math.PI*2);ctx.fill();
    ctx.restore();
  }
  ctx.restore();
};
/* ===== rev-smoke-plow: 命中平面犁過尾煙 =====
   爆炸煙歸屬目標、被命中平面推著走；尾煙若留在世界靜止，就會越過爆炸平面
   掃到車體後方 —— 物理上不成立。
   平面 = 實繪車頭前緣（與 _getTargetHitVisualWorld 同一換算），隨車體前進。
   被犁到的煙：① 歸屬轉為跟車（與爆炸煙同一套 _ft/_fdx）
             ② 貼齊平面後獲得前向散射衝量（係數讀實際推進速度；靜止車無衝量）
             ③ 上浮 ×3、剩餘壽命壓到原壽命的 1/4 → 快速離散
   摩擦 0.95 與爆炸粒子 _wvx 同一條慣例。
   尚未被犁到的煙壽命與行為不變（自由空氣中的滯留是對的）。
   射失落地的煙同樣會被車體犁過 —— 地面不是推進面，但車體是。
   我方飛出的彈（GL-ATGM / ATGM）尾煙在車頭前方，永遠不會被犁到。 */
window._plowTrailSmoke = function(c, dt){
if(!c || !c.rpgSmoke || !c.rpgSmoke.length) return;
var veh = (c.allies && c.allies[0] && c.allies[0].isVehicle) ? c.allies[0] : null;
if(!veh || typeof window._vehicleHitScreenPos !== 'function') return;
var hp = window._vehicleHitScreenPos(veh.vehicleId, null);
if(!hp || typeof hp.nx !== 'number') return;
var hr = (typeof EXPLORE_HERO_X_RATIO === 'number') ? EXPLORE_HERO_X_RATIO : 0.25;
var sr = (c.sm && c.sm.screenRightWorld) || 2;
var off = (hp.nx - hr) / Math.max(0.05, 1 - hr) * sr;
var vwx = (typeof veh.worldX === 'number') ? veh.worldX : 0;
var planeX = vwx + off;
var vAdv = (typeof window._currentWorldSpeed === 'function') ? window._currentWorldSpeed() : 0;
var fr = Math.pow(0.95, dt * 60);
for(var i = 0; i < c.rpgSmoke.length; i++){
var s = c.rpgSmoke[i];
if(s._ft){
s._fdx += (s._wvx || 0) * dt;
s._wvx = (s._wvx || 0) * fr;
s._wx = ((typeof s._ft.worldX === 'number') ? s._ft.worldX : 0) + s._fdx;
continue;
}
if(typeof s._wx !== 'number' || s._wx > planeX) continue;
s._ft = veh;
s._fdx = off;
s._wx = planeX;
s._wvx = vAdv * (0.10 + Math.random() * 0.15);
s.vy = (typeof s.vy === 'number' ? s.vy : 0.10) * 3;
var lf = (typeof s.life === 'number' && s.life > 0) ? s.life : 1.2;
s.life = s.age + lf * 0.25;
}
};

/* ===== rev-grenade-is-weapon:start ===== */
/* 手雷圖標尺寸唯一真相（螢幕 CSS px）。手雷是武器，不是消耗品：
   消耗品在 rig 走 healId 的 140 rig 單位；手雷手持與飛行必須同一尺寸，
   否則釋放瞬間會大小跳變。rig 端以 GRENADE_ICON_PX / rigScale 換算 rig 單位。 */
window.GRENADE_ICON_PX = 20;
/* ===== rev-grenade-is-weapon:end ===== */

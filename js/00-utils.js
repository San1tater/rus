
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
  if(entity.isVehicle){
    return (typeof window.getVehicleDetectableR === 'function') ? window.getVehicleDetectableR(entity.vehicleId) : 80;
  }
  if(entity.isPassenger){
    return (typeof SERVANT_DETECTABLE_R !== 'undefined') ? SERVANT_DETECTABLE_R : 80;
  }
  if(entity.isPlayer){
    if(typeof PLAYER_DETECTABLE_R === 'undefined') return 80;
    var _mode = (typeof state !== 'undefined' && state.preferences && state.preferences.actionMode) ? state.preferences.actionMode : 'attack';
    return PLAYER_DETECTABLE_R[_mode] || 80;
  }
  if(entity.isGuard){
    return (typeof GARDEN_GUARD_DETECTABLE_R !== 'undefined') ? GARDEN_GUARD_DETECTABLE_R : 40;
  }
  if(entity.rarity && typeof ENEMY_DETECTABLE_R !== 'undefined'){
    return ENEMY_DETECTABLE_R[entity.rarity] || 225;
  }
  if(typeof entity.detectableR === 'number'){
    return entity.detectableR;
  }
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

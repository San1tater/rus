
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


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
})();

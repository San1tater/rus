'use strict';

const HIT_PART_WEIGHTS = [
  { part:'head',  pct:15 },
  { part:'face',  pct:15 },
  { part:'top',   pct:40 },
  { part:'other', pct:30 }
];

function rollHitPart(){
  var r = Math.random() * 100;
  for(var i = 0; i < HIT_PART_WEIGHTS.length; i++){
    r -= HIT_PART_WEIGHTS[i].pct;
    if(r <= 0) return HIT_PART_WEIGHTS[i].part;
  }
  return 'other';
}

function getPlayerArmorMMForPart(part){
  if(part === 'head' || part === 'face'){
    var id = state.player.equipped.head;
    if(!id) return 0;
    return armorMMForSlot(id, part);
  }
  if(part === 'top'){
    var id2 = state.player.equipped.top;
    if(!id2) return 0;
    return armorMMForSlot(id2, 'top');
  }
  return 0;
}

function getEnemyArmorMMForPart(enemy, part){
  if(!enemy) return 0;
  if(part === 'head' || part === 'face'){
    if(!enemy.helmet) return 0;
    return armorMMForSlot(enemy.helmet, part);
  }
  if(part === 'top'){
    if(!enemy.body) return 0;
    return armorMMForSlot(enemy.body, 'top');
  }
  return 0;
}

function getPassengerArmorMMForPart(passenger, part){
  var eq = passenger && passenger.equipData;
  if(!eq) return 0;
  if(part === 'head' || part === 'face'){
    if(!eq.head) return 0;
    var hid = typeof eq.head === 'object' ? eq.head.id : eq.head;
    return armorMMForSlot(hid, part);
  }
  if(part === 'top'){
    if(!eq.top) return 0;
    var tid = typeof eq.top === 'object' ? eq.top.id : eq.top;
    return armorMMForSlot(tid, 'top');
  }
  return 0;
}

function applyDamage(target, rawDmg, penetration, armorOpts){
  let armorLevel = 0, armorMMOverride = null, armorProvider = null;
  if(armorOpts && typeof armorOpts === 'object'){
    armorProvider = armorOpts.armorProvider || null;
    armorMMOverride = (armorOpts.armorMMOverride != null) ? armorOpts.armorMMOverride : null;
    armorLevel = armorOpts.armorLevel || 0;
  } else {
    armorLevel = armorOpts || 0;
  }

  if(rawDmg == null || isNaN(rawDmg) || !isFinite(rawDmg)) rawDmg = 0;
  if(penetration == null || isNaN(penetration) || !isFinite(penetration)) penetration = 0;
  if(isNaN(armorLevel) || !isFinite(armorLevel)) armorLevel = 0;

  const result = {armorLost:0, hpLost:0, finalDmg:0, overkill:false, part:null};
  const pool = Math.max(0, Math.round(target.armor || 0));

  let armorMM = null;
  if(armorProvider){
    const part = rollHitPart();
    result.part = part;
    const mm = armorProvider(part);
    if(mm != null && isFinite(mm)) armorMM = mm;
  } else if(armorMMOverride !== null){
    armorMM = armorMMOverride;
  }

  let armorMMVal = null;
  if(armorMM !== null){
    if(armorMM <= 0 || pool <= 0){
      const hpDmg = Math.round(rawDmg * 1.2);
      target.hp = Math.max(0, Math.round((target.hp || 0) - hpDmg));
      result.hpLost = hpDmg;
      result.finalDmg = hpDmg;
      result.overkill = true;
      return result;
    }
    armorMMVal = armorMM;
  } else {
    if(pool <= 0){
      const hpDmg = Math.round(rawDmg * 1.2);
      target.hp = Math.max(0, Math.round((target.hp || 0) - hpDmg));
      result.hpLost = hpDmg;
      result.finalDmg = hpDmg;
      result.overkill = true;
      return result;
    }
    armorMMVal = ARMOR_LEVEL_TO_MM[armorLevel] || 1;
  }

  const pen = penetration || 0;
  const diff = pen - armorMMVal;

  if(diff >= 0){
    const armorDmg = Math.round(rawDmg);
    const hpDmg = pen > 0 ? Math.round(rawDmg * (diff / pen)) : 0;
    const armorLost = Math.min(pool, armorDmg);
    target.armor = Math.max(0, pool - armorLost);
    target.hp = Math.max(0, Math.round((target.hp || 0) - hpDmg));
    result.armorLost = armorLost;
    result.hpLost = hpDmg;
    result.finalDmg = hpDmg;
    if((target.armor || 0) <= 0) result.overkill = true;
  } else {
    const armorDmg = pen > 0 ? Math.round(rawDmg * (pen / armorMMVal)) : 0;
    const armorLost = Math.min(pool, armorDmg);
    target.armor = Math.max(0, pool - armorLost);
    result.armorLost = armorLost;
    result.finalDmg = armorLost;
  }
  return result;
}

/* rev-fix-armor-provider-unify: 統一按單位類型選部位護甲 */
window._armorProviderFor = function(tgt){
  if(!tgt) return function(){ return 0; };
  if(tgt.isGuard){
    return function(part){
      if(part === 'head' || part === 'face'){ const h = tgt.equipped && tgt.equipped.head; return h ? armorMMForSlot(h, part) : 0; }
      if(part === 'top'){ const t = tgt.equipped && tgt.equipped.top; return t ? armorMMForSlot(t, 'top') : 0; }
      return 0;
    };
  }
  if(tgt.isPlayer) return function(part){ return (typeof getPlayerArmorMMForPart === 'function') ? getPlayerArmorMMForPart(part) : 0; };
  if(tgt.isPassenger) return function(part){ return (typeof getPassengerArmorMMForPart === 'function') ? getPassengerArmorMMForPart(tgt, part) : 0; };
  return function(part){ return (typeof getEnemyArmorMMForPart === 'function') ? getEnemyArmorMMForPart(tgt, part) : 0; };
};
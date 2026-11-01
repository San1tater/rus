
(function(){
'use strict';
window.VEHICLE_ARMOR_RHA={
  btr80:{hullFront:20,turretFront:10,side:7,rear:7},
  btr80a:{hullFront:20,turretFront:23,side:10,rear:7},
  btr82:{hullFront:20,turretFront:23,side:10,rear:7},
  btr82a:{hullFront:20,turretFront:23,side:10,rear:7},
  btr90:{hullFront:30,turretFront:30,side:15,rear:10},
  bmp1:{hullFront:40,turretFront:31,side:18,rear:16},
  bmp1m:{hullFront:40,turretFront:31,side:18,rear:16},
  bmp2:{hullFront:26,turretFront:33,side:20,rear:16},
  bmp3:{hullFront:36,turretFront:50,side:25,rear:20},
  bmd4:{hullFront:50,turretFront:40,side:20,rear:20},
  t80:{hullFront:450,turretFront:500,side:80,rear:60},
  t80b:{hullFront:500,turretFront:550,side:80,rear:60},
  t80bv:{hullFront:500,turretFront:550,side:80,rear:60,era:1},
  t80u:{hullFront:600,turretFront:700,side:80,rear:60,era:2},
  t80uk:{hullFront:600,turretFront:700,side:80,rear:60,era:2},
  t80um:{hullFront:600,turretFront:700,side:80,rear:60,era:2}
};
var PARTS=[{key:'hullFront',w:30},{key:'side',w:25},{key:'rear',w:15},{key:'turretFront',w:20},{key:'turretSide',w:10}];
var INTERNAL_WEIGHTS={
  default:{ammoRack:0.10,crew:0.20,engine:0.20,tracks:0.10,gun:0.20,turret:0.20},
  btr80:{ammoRack:0.10,crew:0.22,engine:0.24,tracks:0.06,gun:0.18,turret:0.20},
  btr80a:{ammoRack:0.10,crew:0.22,engine:0.24,tracks:0.06,gun:0.18,turret:0.20},
  btr82:{ammoRack:0.10,crew:0.22,engine:0.24,tracks:0.06,gun:0.18,turret:0.20},
  btr82a:{ammoRack:0.10,crew:0.22,engine:0.24,tracks:0.06,gun:0.18,turret:0.20},
  btr90:{ammoRack:0.12,crew:0.22,engine:0.24,tracks:0.06,gun:0.16,turret:0.20},
  bmp1:{ammoRack:0.14,crew:0.20,engine:0.18,tracks:0.12,gun:0.18,turret:0.18},
  bmp1m:{ammoRack:0.14,crew:0.20,engine:0.18,tracks:0.12,gun:0.18,turret:0.18},
  bmp2:{ammoRack:0.14,crew:0.20,engine:0.18,tracks:0.12,gun:0.18,turret:0.18},
  bmp3:{ammoRack:0.15,crew:0.20,engine:0.17,tracks:0.12,gun:0.18,turret:0.18},
  bmd4:{ammoRack:0.15,crew:0.20,engine:0.17,tracks:0.12,gun:0.18,turret:0.18},
  t80:{ammoRack:0.20,crew:0.18,engine:0.16,tracks:0.12,gun:0.16,turret:0.18},
  t80b:{ammoRack:0.20,crew:0.18,engine:0.16,tracks:0.12,gun:0.16,turret:0.18},
  t80bv:{ammoRack:0.20,crew:0.18,engine:0.16,tracks:0.12,gun:0.16,turret:0.18},
  t80u:{ammoRack:0.20,crew:0.18,engine:0.16,tracks:0.12,gun:0.16,turret:0.18},
  t80uk:{ammoRack:0.20,crew:0.18,engine:0.16,tracks:0.12,gun:0.16,turret:0.18},
  t80um:{ammoRack:0.20,crew:0.18,engine:0.16,tracks:0.12,gun:0.16,turret:0.18}
};
function _getInternalWeights(vid){return INTERNAL_WEIGHTS[vid]||INTERNAL_WEIGHTS.default;}
function _pickWeighted(list){var total=0,i;for(i=0;i<list.length;i++)total+=list[i].w;var r=Math.random()*total;for(i=0;i<list.length;i++){r-=list[i].w;if(r<=0)return list[i];}return list[list.length-1];}
function _getArmor(vid,partKey){var a=window.VEHICLE_ARMOR_RHA[vid];if(!a)return 30;if(partKey==='turretSide')return a.side||20;return a[partKey]||a.hullFront||30;}
function _getEraBonus(vid,isHeat){var a=window.VEHICLE_ARMOR_RHA[vid];if(!a||!a.era)return 0;if(a.era===1)return isHeat?250:30;if(a.era===2)return isHeat?400:120;return 0;}
function _isHeatAmmo(ammoId){
  if(typeof HEAT_AMMO_IDS!=='undefined'&&HEAT_AMMO_IDS.has(ammoId))return true;
  if(ammoId==='atgm'||ammoId==='3bk29'||ammoId==='3ubk10'||ammoId==='pg-15v')return true;
  return false;
}
function _ensureDamage(vid){
  if(!state.vehicleDamage)state.vehicleDamage={};
  var d=state.vehicleDamage[vid];
  if(!d){
    d={ammoRackDamage:0,parts:{engine:800,tracks:1000,gun:400,turret:400},members:{driver:300,gunner:300,commander:300,player:100},disabled:false,destroyed:false,repairUntil:0,_hullHP:3000,_hullHPMax:3000};
    state.vehicleDamage[vid]=d;
  }
  if(typeof d.members.player!=='number')d.members.player=100;
  return d;
}
function _pickInternalKey(vid){
  var w=_getInternalWeights(vid);
  var total=0,k;
  for(k in w)total+=w[k];
  var r=Math.random()*total,acc=0;
  for(k in w){acc+=w[k];if(r<=acc)return k;}
  return 'turret';
}
function _calcPassengerArmor(p){
  var a=0;
  if(p&&p.equipData){
    if(p.equipData.head){
      var hid=(typeof p.equipData.head==='object')?p.equipData.head.id:p.equipData.head;
      var hr=(typeof p.equipData.head==='object')?(p.equipData.head.rarity||'一般'):(p.helmetRarity||'一般');
      if(hid&&typeof equipArmorValue==='function')a+=equipArmorValue(hid,hr)||0;
    }
    if(p.equipData.top){
      var tid=(typeof p.equipData.top==='object')?p.equipData.top.id:p.equipData.top;
      var tr=(typeof p.equipData.top==='object')?(p.equipData.top.rarity||'一般'):(p.bodyRarity||'一般');
      if(tid&&typeof equipArmorValue==='function')a+=equipArmorValue(tid,tr)||0;
    }
  }
  return a;
}
window._vHitVehicle=function(veh,dmg,penMM,ammoId){
  var vid=veh.vehicleId;
  var d=_ensureDamage(vid);
  var part=_pickWeighted(PARTS);
  var armorMM=_getArmor(vid,part.key);
  var isHeat=_isHeatAmmo(ammoId);
  armorMM+=_getEraBonus(vid,isHeat);
  if(penMM<armorMM){
    if(typeof _float==='function')_float(veh,'跳彈','miss');
    return {penetrated:false,damage:0};
  }
  var key=_pickInternalKey(vid);
  d.lastHit = { part: part.key, internal: key, dmg: dmg };
  if(key==='ammoRack'){
    d.ammoRackDamage+=dmg;
    if(typeof _float==='function')_float(veh,'彈藥架 -'+Math.round(dmg),'crit');
    if(d.ammoRackDamage>=100){_detonate(vid,veh);return {penetrated:true,detonated:true,damage:dmg};}
    return {penetrated:true,part:part.key,internal:'彈藥架',damage:dmg};
  }
  if(key==='crew'){
    var pool=[];
    if(d.members.driver>0)pool.push({t:'crew',r:'driver'});
    if(d.members.gunner>0)pool.push({t:'crew',r:'gunner'});
    if(d.members.commander>0)pool.push({t:'crew',r:'commander'});
    if(d.members.player>0)pool.push({t:'player'});
    var _st=state.station;
    if(_st&&_st.passengers){
      for(var i=0;i<_st.passengers.length;i++){
        var pp=_st.passengers[i];
        var ss=(state.servants||[]).find(function(x){return x.id===pp.srvId;});
        if(ss&&(!ss.hp||ss.hp>0))pool.push({t:'passenger',srv:ss,p:pp});
      }
    }
    if(!pool.length)return {penetrated:true,part:part.key,internal:'乘員',damage:0};
    var tgt=pool[Math.floor(Math.random()*pool.length)];
    if(tgt.t==='crew'){
      d.members[tgt.r]=Math.max(0,d.members[tgt.r]-dmg*1.5);
      if(typeof _float==='function')_float(veh,'乘員 -'+Math.round(dmg*1.5),'crit');
      if(tgt.r==='driver'&&d.members.driver<=0){
        if(typeof pushLog==='function')pushLog('<span class="lose">駕駛</span> 陣亡',[],'explore');
        _forceLeave(vid,veh,'driver_dead');
        if(window._explore)window._explore._currentSpeed=0;
      }
      if(tgt.r==='gunner'&&d.members.gunner<=0){
        if(typeof pushLog==='function')pushLog('<span class="lose">炮手</span> 陣亡',[],'explore');
      }
      if(tgt.r==='commander'&&d.members.commander<=0){
        if(typeof pushLog==='function')pushLog('<span class="lose">車長</span> 陣亡',[],'explore');
      }
    } else if(tgt.t==='player'){
      var _tgt={hp:state.player.hp,armor:state.player.armor};
      var _lv=state.player.armorLevel||0;
      applyDamage(_tgt,dmg*1.5,penMM,_lv);
      state.player.hp=_tgt.hp;
      state.player.armor=_tgt.armor;
      if(typeof _float==='function')_float(veh,'玩家 -'+Math.round(dmg*1.5),'crit');
      if(state.player.hp<=0){
        state.player.hp=0;
        state.player.deadUntil=Date.now()+60000;
        var _ex1=window._explore;
        if(_ex1){_ex1.mode='dead';_ex1.deadUntil=performance.now()+60000;_ex1._currentSpeed=0;}
        if(typeof heroAnim!=='undefined'){heroAnim.name='dead';heroAnim.frame=0;heroAnim.lastUpdate=performance.now();}
        _forceLeave(vid,veh,'player_dead');
      }
    } else if(tgt.t==='passenger'){
      var _arm=_calcPassengerArmor(tgt.p);
      var _maxHp=(typeof servantMaxHp==='function')?servantMaxHp(tgt.srv):100;
      var _curHp=(typeof tgt.srv.hp==='number')?tgt.srv.hp:_maxHp;
      var _t2={hp:_curHp,armor:_arm};
      applyDamage(_t2,dmg*1.5,penMM,0);
      tgt.srv.hp=_t2.hp;
      if(typeof _float==='function')_float(veh,'載員 -'+Math.round(_t2.hpLost||dmg*1.5),'crit');
      if(tgt.srv.hp<=0){
        tgt.srv.hp=0;
        tgt.srv.injuredUntil=Date.now()+4*3600*1000;
        if(typeof pushLog==='function')pushLog('<span class="lose">載員</span> 重傷',[],'explore');
      }
    }
    return {penetrated:true,part:part.key,internal:'乘員',damage:dmg};
  }
  var _dmgFactor=0.5;
  if(key==='tracks'&&typeof hasCrewTalent==='function'&&hasCrewTalent('driver','driver_instinct'))_dmgFactor*=0.8;
  d.parts[key]=Math.max(0,(d.parts[key]||0)-dmg*_dmgFactor);
  if(typeof _float==='function')_float(veh,'-'+Math.round(dmg*_dmgFactor),'');
  if(key==='engine'&&d.parts.engine<=0){
    if(typeof pushLog==='function')pushLog('<span class="lose">引擎</span> 癱瘓',[],'explore');
    _forceLeave(vid,veh,'engine');
    if(window._explore)window._explore._currentSpeed=0;
  }
  if(key==='tracks'&&d.parts.tracks<=0){
    if(typeof pushLog==='function')pushLog('<span class="lose">履帶/輪組</span> 癱瘓',[],'explore');
    _forceLeave(vid,veh,'tracks');
    if(window._explore)window._explore._currentSpeed=0;
  }
  d._hullHP=Math.max(0,d._hullHP-dmg*0.2);
  if(d._hullHP<=0&&!d.destroyed){
    d.destroyed=true;d.disabled=true;d.repairUntil=Date.now()+3*3600*1000;
    _forceLeave(vid,veh,'hull_destroyed');
    if(window._explore)window._explore._currentSpeed=0;
  }
  var _allCrew=(d.members.driver<=0&&d.members.gunner<=0&&d.members.commander<=0&&d.members.player<=0);
  if(_allCrew&&!d.destroyed)_detonate(vid,veh);
  return {penetrated:true,part:part.key,internal:key,damage:dmg};
};;;
function _detonate(vid,veh){
  var d=_ensureDamage(vid);
  d.destroyed=true;d.disabled=true;d.repairUntil=Date.now()+8*3600*1000;d.ammoRackDamage=100;
  d.members.driver=0;d.members.gunner=0;d.members.commander=0;d.members.player=0;
  d._hullHP=0;
  var _now=Date.now();
  var _crew=state.station&&state.station.crew;
  if(_crew){
    ['commander','gunner','driver'].forEach(function(role){
      var sid=_crew[role];if(!sid)return;
      var srv=(state.servants||[]).find(function(s){return s.id===sid;});
      if(srv){srv.hp=0;srv.injuredUntil=_now+4*3600*1000;}
    });
  }
  var _passengers=state.station&&state.station.passengers;
  if(_passengers){
    _passengers.forEach(function(p){
      if(!p||!p.srvId)return;
      var srv=(state.servants||[]).find(function(s){return s.id===p.srvId;});
      if(srv){srv.hp=0;srv.injuredUntil=_now+4*3600*1000;}
    });
  }
  state.player.hp=0;
  state.player.deadUntil=_now+60000;
  var _ex2=window._explore;
  if(_ex2){_ex2.mode='dead';_ex2.deadUntil=performance.now()+60000;_ex2._currentSpeed=0;}
  if(typeof heroAnim!=='undefined'){heroAnim.name='dead';heroAnim.frame=0;heroAnim.lastUpdate=performance.now();}
  if(state.vehicleAmmo&&state.vehicleAmmo[vid]){
    for(var wid in state.vehicleAmmo[vid])state.vehicleAmmo[vid][wid].current=0;
  }
  if(typeof window._vDetonateFx==='function')window._vDetonateFx(veh);
  if(typeof pushLog==='function')pushLog('<span class="lose">殉爆</span> 載具彈藥架殉爆，全員重傷',[],'explore');
  _forceLeave(vid,veh,'detonated');
  if(_ex2)_ex2._currentSpeed=0;
}
function _forceLeave(vid,veh,reason){
  if(window._combat&&window._combat.active&&window._combat.sceneType==='vehicle'){
    window._combat._forceLeaveReason=reason;
    window._combat._forceLeaveAt=performance.now();
  }
}
window._vEnsureDamage=_ensureDamage;
window._vGetArmor=_getArmor;
})();


/* ===== 12-livebattle.js · 完整重寫 ===== */
(function(){
'use strict';
window._combat=null;window._combatActive=false;
var RF=300,RS=600,SH=0.8;
function _start(cfg){
  _cleanup();
  var z1=document.getElementById('zone1');
  var cw=z1?z1.clientWidth:400,ch=z1?z1.clientHeight:500;
  var sm=computeScreenMetrics(cw,ch);
  var now=performance.now();
  var pf=(cfg.firstSide==='player');
  window._combat={active:true,sceneType:cfg.sceneType||'foot',playerFirst:pf,allies:cfg.allies||[],enemies:cfg.enemies||[],bullets:[],floats:[],lastTick:now,playerFireReadyAt:now+(pf?RF:RS),enemyFireReadyAt:now+(pf?RS:RF),resolved:false,victory:null,lootUntil:0,onResolve:cfg.onResolve||null,onVictoryStart:cfg.onVictoryStart||null,sm:sm,playerCanvas:null,playerCtx:null,startLogAt:now,_playerAnimUntil:0,_playerReloadEnd:0,_playerSwitchEnd:0,_switchAnim:null,_fireAnim:null,_hurtUntil:0,_forceLeaveReason:null,_forceLeaveAt:0,_playerMag:(window._playerMagPersistent||(window._playerMagPersistent={inMag:0,ammoRef:null,weaponId:null}))};
  for(var i=0;i<window._combat.allies.length;i++)window._combat.allies[i]._nextFireAt=window._combat.playerFireReadyAt;
  for(var j=0;j<window._combat.enemies.length;j++){var e=window._combat.enemies[j];e._nextFireAt=window._combat.enemyFireReadyAt;e._initWorldX=e.worldX;}
  window._combatActive=true;_setupCanvas();
  if(typeof pushLog==='function'){var names=cfg.enemies.map(function(e){return(ENEMIES[e.eid]||{name:e.eid}).name;}).join('、');pushLog('<span class="pl">玩家</span> 遭遇 '+cfg.enemies.length+' 名敵人（'+names+'）',[],'explore');}
  requestAnimationFrame(_loop);
}
function _setupCanvas(){
  var z1=document.getElementById('zone1');if(!z1)return;
  var c=document.getElementById('combat-overlay');
  if(!c){c=document.createElement('canvas');c.id='combat-overlay';c.style.cssText='position:absolute;inset:0;pointer-events:none;z-index:9;';z1.appendChild(c);}
  var w=z1.clientWidth,h=z1.clientHeight;if(c.width!==w)c.width=w;if(c.height!==h)c.height=h;
  window._combat.playerCanvas=c;window._combat.playerCtx=c.getContext('2d');window._combat.sm=computeScreenMetrics(w,h);
  var fr=document.getElementById('combat-frames');
  if(!fr){fr=document.createElement('div');fr.id='combat-frames';fr.style.cssText='position:absolute;top:36px;right:8px;width:44px;pointer-events:none;z-index:22;display:flex;flex-direction:column;gap:5px;';z1.appendChild(fr);}
}
function _cleanup(){window._combatActive=false;window._combat=null;var c=document.getElementById('combat-overlay');if(c)c.remove();var f=document.getElementById('combat-frames');if(f)f.remove();if(typeof heroAnim!=='undefined'&&heroAnim.name!=='walk'){heroAnim.name='walk';heroAnim.frame=0;heroAnim.lastUpdate=performance.now();}}
window._combatCleanup=_cleanup;
function _loop(now){
  var c=window._combat;if(!c)return;
  if(!c.active){_cleanup();return;}
  var _btrActive = !!(window.BTRSupport && window.BTRSupport.active);
  if(typeof currentTab!=='undefined'&&currentTab!=='explore'&&currentTab!=='combat'){
    if(!_btrActive){_cleanup();return;}
  }
  if(c._forceLeaveReason&&now-c._forceLeaveAt>800){_resolveVehicleLeave(c._forceLeaveReason);return;}
  var dt=Math.min(0.05,(now-c.lastTick)/1000);c.lastTick=now;
  if(!c.resolved){
    _tickAI(dt,now);_tickBullets(dt);_updatePAnim(now);
    var ea=false,aa=false;
    for(var i=0;i<c.enemies.length;i++)if(c.enemies[i].hp>0){ea=true;break;}
    for(var j=0;j<c.allies.length;j++)if(c.allies[j].hp>0){aa=true;break;}
    if(!ea)_resolve(true);else if(!aa)_resolve(false);
  }else{
    _tickBullets(dt);_updatePAnim(now);
    if(c.lootUntil>0&&now>=c.lootUntil){var cb=c.onResolve,vic=c.victory;c.active=false;c.onResolve=null;_cleanup();if(typeof cb==='function')cb(vic);return;}
  }
  if(typeof currentTab==='undefined'||currentTab==='explore'||currentTab==='combat'){
    _render();_renderFrames();
  }
  requestAnimationFrame(_loop);
}

function _writeVehicleDestroyedLog(reason, vid){
  var _dmg = state.vehicleDamage && state.vehicleDamage[vid];
  if(!_dmg) return;
  var _brokenParts = [];
  for(var _pk in _dmg.parts){ if(_dmg.parts[_pk] <= 0) _brokenParts.push(_pk); }
  var _deadMembers = [];
  for(var _mk in _dmg.members){ if(_dmg.members[_mk] <= 0) _deadMembers.push(_mk); }
  var _reasonText = reason === 'detonated' ? '彈藥架殉爆' : '車體擊毀';
  var _summary = [];
  if(_brokenParts.length) _summary.push('損壞 ' + _brokenParts.length + ' 處');
  if(_deadMembers.length) _summary.push('陣亡 ' + _deadMembers.length + ' 人');
  var _vdData = {
    vehicleId: vid,
    reason: reason,
    lastHit: _dmg.lastHit || null,
    brokenParts: _brokenParts,
    deadMembers: _deadMembers,
    ammoRackDamage: _dmg.ammoRackDamage || 0,
    repairUntil: _dmg.repairUntil || 0
  };
  if(typeof pushLog === 'function'){
    pushLog('<span class="lose">' + _reasonText + '</span>' + (_summary.length ? ' · ' + _summary.join(' · ') : '') + '，<span style="color:#4a90d9;text-decoration:underline;text-decoration-style:dotted">點擊查看詳情</span>', [], 'vehicle_destroyed');
    if(state.logs && state.logs.length) state.logs[state.logs.length - 1].vehicleDestroyed = _vdData;
  }
}
function _openVehicleDestroyedDetail(log){
  if(!log || !log.vehicleDestroyed) return;
  var d = log.vehicleDestroyed;
  var vid = d.vehicleId;
  var vehName = (typeof VEHICLES !== 'undefined' && VEHICLES[vid]) ? VEHICLES[vid].name : vid;
  var reasonMap = { detonated: '彈藥架殉爆', hull_destroyed: '車體擊毀' };
  var reason = reasonMap[d.reason] || d.reason;
  var body = '';
  body += '<div class="detail-title r-傳奇">💥 ' + vehName + ' 擊毀</div>';
  body += '<div class="detail-sub">' + reason + '</div>';
  if(d.lastHit){
    body += '<div class="divider"></div>';
    body += '<div style="font-size:11px;color:#e8a33d;font-weight:bold;margin-bottom:4px">致命一擊</div>';
    var partName = { hullFront:'車體正面', side:'側面', rear:'後面', turretFront:'炮塔正面', turretSide:'炮塔側面' }[d.lastHit.part] || d.lastHit.part;
    var internalName = { ammoRack:'彈藥架', crew:'乘員', engine:'引擎', tracks:'履帶/輪組', gun:'炮管', turret:'炮塔' }[d.lastHit.internal] || d.lastHit.internal;
    body += '<div class="stat-line"><span class="k">部位</span><span class="v">' + partName + '</span></div>';
    body += '<div class="stat-line"><span class="k">內部</span><span class="v">' + internalName + '</span></div>';
    body += '<div class="stat-line"><span class="k">傷害</span><span class="v">' + Math.round(d.lastHit.dmg) + '</span></div>';
  }
  if(d.brokenParts && d.brokenParts.length){
    body += '<div class="divider"></div>';
    body += '<div style="font-size:11px;color:#e8a33d;font-weight:bold;margin-bottom:4px">損壞部件</div>';
    var partLabel = { engine:'引擎', tracks:'履帶/輪組', gun:'炮管', turret:'炮塔' };
    for(var i = 0; i < d.brokenParts.length; i++){
      body += '<div class="stat-line"><span class="k">' + (partLabel[d.brokenParts[i]] || d.brokenParts[i]) + '</span><span class="v" style="color:#e05252">損壞</span></div>';
    }
  }
  if(d.deadMembers && d.deadMembers.length){
    body += '<div class="divider"></div>';
    body += '<div style="font-size:11px;color:#e8a33d;font-weight:bold;margin-bottom:4px">陣亡成員</div>';
    var memberLabel = { driver:'駕駛', gunner:'炮手', commander:'車長', player:'玩家' };
    for(var i = 0; i < d.deadMembers.length; i++){
      body += '<div class="stat-line"><span class="k">' + (memberLabel[d.deadMembers[i]] || d.deadMembers[i]) + '</span><span class="v" style="color:#e05252">陣亡</span></div>';
    }
  }
  if(d.ammoRackDamage > 0){
    body += '<div class="divider"></div>';
    body += '<div class="stat-line"><span class="k">彈藥架累計傷害</span><span class="v">' + Math.round(d.ammoRackDamage) + '</span></div>';
  }
  if(d.repairUntil > 0){
    var remainH = Math.round((d.repairUntil - Date.now()) / 3600000 * 10) / 10;
    if(remainH < 0) remainH = 0;
    body += '<div class="divider"></div>';
    body += '<div class="stat-line"><span class="k">維修時長</span><span class="v">' + remainH + ' 小時</span></div>';
  }
  var ft = document.createElement('div');
  ft.className = 'modal-ft';
  ft.innerHTML = '';
  openModal({ title: '擊毀報告', body: body, footer: ft });
}
  window._openVehicleDestroyedDetail = _openVehicleDestroyedDetail;
function _resolveVehicleLeave(reason){
  var c=window._combat;if(!c)return;
  var cb=c.onResolve;
  var vic=(reason!=='detonated'&&reason!=='player_dead');
  c.active=false;c.onResolve=null;_cleanup();
  var _b=window.BTRSupport;
  if(_b&&_b.active){
    if(reason==='detonated'){
      try{_b._cleanup();}catch(e){}
      _b.active=false;
    } else {
      if(typeof _b.enterWreckMode==='function') _b.enterWreckMode();
    }
  }
  var _vid = (_b && _b.vehicleId) ? _b.vehicleId : ((state.garage && state.garage.currentVehicle) || 'btr80');
  if(reason==='detonated' || reason==='hull_destroyed'){
    _writeVehicleDestroyedLog(reason, _vid);
  } else if(typeof pushLog==='function'){
    if(reason==='crew_dead')pushLog('<span class="lose">載具</span> 炮手車長陣亡',[],'explore');
    else if(reason==='driver_dead')pushLog('<span class="lose">載具</span> 駕駛陣亡',[],'explore');
    else if(reason==='engine')pushLog('<span class="lose">載具</span> 引擎癱瘓',[],'explore');
    else if(reason==='tracks')pushLog('<span class="lose">載具</span> 履帶癱瘓',[],'explore');
  }
  if(reason==='player_dead'){
    if(typeof heroAnim!=='undefined'){heroAnim.name='dead';heroAnim.frame=0;heroAnim.lastUpdate=performance.now();}
    var _ex=window._explore;
    if(_ex){ _ex.mode='dead'; _ex.deadUntil=performance.now()+60000; _ex.combatEvent=null; }
    if(state.player) state.player.deadUntil=Date.now()+60000;
    if(_b&&_b.active&&typeof _b.enterWreckMode==='function') _b.enterWreckMode();
    return;
  }
  if(typeof cb==='function')cb(vic);
}

function _playHurt(now){var c=window._combat;if(!c||typeof heroAnim==='undefined'||c.sceneType==='vehicle')return;var a=GAME_ANIMS.hurt;if(!a)return;c._hurtUntil=now+Math.round(a.frameCount/a.fps*1000);heroAnim.name='hurt';heroAnim.frame=0;heroAnim.lastUpdate=now;}
function _updatePAnim(now){
  var c=window._combat;if(!c||typeof heroAnim==='undefined'||c.sceneType==='vehicle')return;
  var p=c.allies[0];if(!p||!p.isPlayer)return;
  if(now<c._hurtUntil){if(heroAnim.name!=='hurt'){heroAnim.name='hurt';heroAnim.frame=0;heroAnim.lastUpdate=now;}return;}
  if(now<c._playerReloadEnd){if(heroAnim.name!=='reload'){heroAnim.name='reload';heroAnim.frame=0;heroAnim.lastUpdate=now;}return;}
  if(now<c._playerSwitchEnd&&c._switchAnim){if(heroAnim.name!==c._switchAnim){heroAnim.name=c._switchAnim;heroAnim.frame=0;heroAnim.lastUpdate=now;}return;}
  if(now<c._playerAnimUntil&&c._fireAnim){if(heroAnim.name!==c._fireAnim)heroAnim.name=c._fireAnim;return;}
  var ex=window._explore;var want=(ex&&ex._currentSpeed>0.5)?'walk':'idle';
  if(heroAnim.name!==want){heroAnim.name=want;heroAnim.frame=0;heroAnim.lastUpdate=now;}
}
function _playFire(now,isP){var c=window._combat;if(!c||typeof heroAnim==='undefined')return;var w=isP?(state.player.equipped.primary?itemDef(state.player.equipped.primary):null):(state.player.equipped.secondary?itemDef(state.player.equipped.secondary):null);var dur=w&&w.rpm?Math.max(120,60000/w.rpm):350;var anim=isP?'fire_primary':'fire_secondary';c._fireAnim=anim;c._playerAnimUntil=now+dur;heroAnim.name=anim;heroAnim.frame=0;heroAnim.lastUpdate=now;}
function _playReload(now){var c=window._combat;if(!c||typeof heroAnim==='undefined')return;var ra=GAME_ANIMS.reload,d=ra?Math.round((ra.frameCount/ra.fps)*1000):1000;c._playerReloadEnd=now+d;heroAnim.name='reload';heroAnim.frame=0;heroAnim.lastUpdate=now;}
function _playSwitch(now,toSecondary){var c=window._combat;if(!c||typeof heroAnim==='undefined')return;var anim=toSecondary?'switch_secondary':'switch_melee';c._switchAnim=anim;c._playerSwitchEnd=now+900;heroAnim.name=anim;heroAnim.frame=0;heroAnim.lastUpdate=now;}

function _rangeOfWeaponDef(wd){
  if(!wd) return 15;
  if(wd._shortRange) return 20;
  return (typeof WEAPON_COMBAT_RANGE!=='undefined'&&WEAPON_COMBAT_RANGE[wd.type])||15;
}
function _eRange(e){
  if(e.hasRPG&&e.rpgAmmo>0)return(typeof RPG_COMBAT_RANGE!=='undefined')?RPG_COMBAT_RANGE:60;
  var w=e.primaryWeapon||e.secondaryWeapon;
  if(!w)return 8;
  var wd=WEAPONS[w.id];
  return _rangeOfWeaponDef(wd);
}
function _tickAI(dt,now){
  var c=window._combat;if(!c)return;var p=c.allies[0];if(!p)return;
  var _isVeh = (c.sceneType === 'vehicle');
  for(var i=0;i<c.enemies.length;i++){
    var e=c.enemies[i];if(e.hp<=0)continue;
    if(_isVeh && (!isFinite(e.worldX) || e.worldX <= p.worldX + 2.0)){
      e.hp = 0; e.gone = true;
      continue;
    }
    var d=Math.abs(e.worldX-p.worldX),r=_eRange(e);
    if(d>r&&e.worldX>p.worldX){e.worldX-=Math.min(8,25*dt);if(e.worldX<p.worldX)e.worldX=p.worldX;}
    var d2=Math.abs(e.worldX-p.worldX);
    if(d2<=r&&now>=e._nextFireAt)_enemyFire(e,p,now);
  }
  if(c.sceneType==='vehicle')return;
  _autoFireFoot(now);
}
function _autoFireFoot(now){
  var c=window._combat,p=c.allies[0];if(!p)return;
  var alive=[];for(var i=0;i<c.enemies.length;i++)if(c.enemies[i].hp>0)alive.push(c.enemies[i]);if(!alive.length)return;
  var _playerTarget=null;
  if(p.isPlayer&&now>=(p._nextFireAt||0)){
    var w=_getPW();
    if(w&&w.def){
      var r=_rangeOfWeaponDef(w.def);
      var ir=[];
      for(var a=0;a<alive.length;a++)if(Math.abs(alive[a].worldX-p.worldX)<=r)ir.push(alive[a]);
      if(ir.length){
        ir.sort(function(x,y){return Math.abs(x.worldX-p.worldX)-Math.abs(y.worldX-p.worldX);});
        var ok=_firePlayer(p,ir[0],now,w);
        if(ok)_playerTarget=ir[0];
        p._nextFireAt=now+(ok?Math.max(120,60000/(w.def.rpm||600)):800);
      }
    }
  }
  if(_playerTarget){
    for(var ii=1;ii<c.allies.length;ii++){
      var a2=c.allies[ii];
      if(a2.hp<=0||!a2.isPassenger||!a2.weapon||!a2.weapon.def)continue;
      var r2=_rangeOfWeaponDef(a2.weapon.def);
      if(Math.abs(_playerTarget.worldX-a2.worldX)>r2)continue;
      _firePassenger(a2,_playerTarget,now,a2.weapon);
      a2._nextFireAt=now+Math.max(120,60000/(a2.weapon.def.rpm||600));
    }
  }
  for(var ii=1;ii<c.allies.length;ii++){
    var a2=c.allies[ii];
    if(a2.hp<=0||!a2.isPassenger||!a2.weapon||!a2.weapon.def)continue;
    if(now<(a2._nextFireAt||0))continue;
    var r2=_rangeOfWeaponDef(a2.weapon.def);
    var ir2=[];
    for(var b=0;b<alive.length;b++)if(Math.abs(alive[b].worldX-a2.worldX)<=r2)ir2.push(alive[b]);
    if(!ir2.length)continue;
    ir2.sort(function(x,y){return Math.abs(x.worldX-a2.worldX)-Math.abs(y.worldX-a2.worldX);});
    _firePassenger(a2,ir2[0],now,a2.weapon);
    a2._nextFireAt=now+Math.max(120,60000/(a2.weapon.def.rpm||600));
  }
}
function _getPW(){var s=null;if(state.player.equipped.primary)s='primary';else if(state.player.equipped.secondary)s='secondary';else if(state.player.equipped.melee)s='melee';if(!s)return null;var id=state.player.equipped[s],d=itemDef(id);if(!d)return null;return{id:id,rarity:state.player.equippedRarity[s]||'一般',slot:s,def:d};}
function _ensureMag(w){var c=window._combat;if(!c)return false;var mg=c._playerMag;if(!mg)return false;if(mg.weaponId!==w.id){mg.inMag=0;mg.weaponId=w.id;mg.ammoRef=null;}if(mg.inMag>0)return true;var ammo=(typeof pickAmmoByPreferenceOrOrder==='function')?pickAmmoByPreferenceOrOrder(w.def.cal,'combat'):null;if(!ammo)return false;var take=Math.min(w.def.mag||30,ammo.count);if(take<=0)return false;invRemove(ammo.id,ammo.rarity,take);mg.ammoRef={id:ammo.id,rarity:ammo.rarity,def:ammo.def||AMMO[ammo.id]};mg.inMag=take;return true;}
function _firePlayer(p,t,now,w){
  var c=window._combat;if(!w||!w.def)return false;var isMelee=(w.def.slot==='melee');
  if(!isMelee&&w.def.cal){if(!_ensureMag(w)){if(w.slot==='primary'&&state.player.equipped.secondary){_playSwitch(now,true);}return false;}c._playerMag.inMag--;}
  var hr=(typeof getHitRate==='function')?getHitRate(w.def.type,'點射',w.def.scopeBonus||0):30;if(!c.playerFirst)hr=hr*SH;_playFire(now,w.slot==='primary');_spawnPB(w,t);
  if(Math.random()*100>=hr){_float(t,'MISS','miss');return true;}
  var a=c._playerMag.ammoRef;var db=a?a.def.dmg*(RARITY_MULT[a.rarity]||1):(w.def.dmg||20)*(RARITY_MULT[w.rarity]||1);var cr=(typeof calcCritRate==='function')?calcCritRate(w.rarity,a?a.rarity:'一般'):0.1;var cm=(typeof calcCritMult==='function')?calcCritMult(w.rarity,a?a.rarity:'一般'):1.5;var crit=Math.random()<cr;var fd=Math.round(db*(crit?cm:1));var res=applyDamage(t,fd,a?(a.def.pen||10):10,t.armorLevel||0);_float(t,'-'+(res.hpLost+res.armorLost)+(crit?'!':''),crit?'crit':'');return true;
}
function _consumePassengerAmmo(a,cal){
  if(a.ammoPouch&&a.ammoPouch.count>0){var d=AMMO[a.ammoPouch.ammoId];if(d&&d.cal===cal){a.ammoPouch.count--;return{id:a.ammoPouch.ammoId,rarity:a.ammoPouch.rarity,def:d};}}
  if(a.ammoBox&&a.ammoBox.count>0){var d2=AMMO[a.ammoBox.ammoId];if(d2&&d2.cal===cal){a.ammoBox.count--;return{id:a.ammoBox.ammoId,rarity:a.ammoBox.rarity,def:d2};}}
  if(a._publicPool){for(var i=0;i<a._publicPool.length;i++){var p=a._publicPool[i];if(p.cal===cal&&p.count>0){p.count--;return{id:p.id,rarity:p.rarity,def:AMMO[p.id]};}}}
  return null;
}
function _firePassenger(a,t,now,w){
  var am=_consumePassengerAmmo(a,w.def.cal);
  if(!am){
    a.hp=0;
    var ex=window._explore;
    if(ex&&ex.passengersFollowing){
      for(var _ri=0;_ri<ex.passengersFollowing.length;_ri++){
        var _pf=ex.passengersFollowing[_ri];
        if(_pf.srv&&a.srv&&_pf.srv.id===a.srv.id){_pf._retreating=true;break;}
      }
    }
    if(typeof pushLog==='function')pushLog('<span class="lose">'+(typeof servantLabel==='function'?servantLabel(a.srv):'載員')+'</span> 彈藥耗盡，撤退',[],'explore');
    return;
  }
  var hr=(typeof servantHitRate==='function')?servantHitRate(a.srv,'點射',0):20;if(!window._combat.playerFirst)hr=hr*SH;_spawnBW(a.worldX,t.worldX,false);if(Math.random()*100>=hr){_float(t,'MISS','miss');return;}
  var db=am.def.dmg*(RARITY_MULT[am.rarity]||1);var crit=Math.random()<0.1,fd=Math.round(db*(crit?1.5:1));var res=applyDamage(t,fd,am.def.pen||10,t.armorLevel||0);_float(t,'-'+(res.hpLost+res.armorLost)+(crit?'!':''),crit?'crit':'');if(typeof servantAddExp==='function')servantAddExp(a.srv,1);
}

function _enemyThrowGrenade(e, p, now){
  var c = window._combat; if(!c) return;
  var wId = e.grenade && e.grenade.id;
  var gDef = WEAPONS[wId];
  if(!gDef) return;
  _spawnBW(e.worldX, p.worldX, true, true);
  var hr = 0.65;
  if(!c.playerFirst) hr *= 0.8;
  if(Math.random() < hr){
    var dmg = Math.round((gDef.dmg || 15) * (RARITY_MULT[e.rarity]||1) * 1.5);
    var pen = gDef.pen || 5;
    if(p.isVehicle){
      if(typeof window._vHitVehicle === 'function') window._vHitVehicle(p, dmg, pen, wId);
    } else {
      var res = applyDamage({hp:p.hp, armor:p.armor}, dmg, pen, p.armorLevel || 0);
      p.hp = Math.max(0, p.hp - (res.hpLost||0));
      p.armor = Math.max(0, p.armor - (res.armorLost||0));
      if(p.isPlayer){ state.player.hp = p.hp; state.player.armor = p.armor; _playHurt(now); }
      _float(p, '-' + ((res.hpLost||0)+(res.armorLost||0)), '');
    }
  } else {
    _float(p, 'MISS', 'miss');
  }
}


function _enemyFire(e,now){
  var c=window._combat;if(!c)return;
  var aliveAllies=[];
  for(var ai=0;ai<c.allies.length;ai++){ if(c.allies[ai].hp>0) aliveAllies.push(c.allies[ai]); }
  if(!aliveAllies.length) return;
  var p=aliveAllies[Math.floor(Math.random()*aliveAllies.length)];
  if(e.grenade && e.grenade.count > 0 && Math.random() < 0.15){
    e.grenade.count--;
    _enemyThrowGrenade(e, p, now);
    e._nextFireAt = now + 1500;
    return;
  }
  var w=e.primaryWeapon||e.secondaryWeapon;
  if(e.primaryWeapon&&e.primaryWeapon.ammoCount<=0&&e.secondaryWeapon){e.primaryWeapon=e.secondaryWeapon;e.secondaryWeapon=null;w=e.primaryWeapon;}
  if(e.hasRPG&&e.rpgAmmo>0&&p.isVehicle){
    e.rpgAmmo--;_spawnMissile(e.worldX,p.worldX);
    var hr=(e.hitBase||0.55)*(window._combat.playerFirst?SH:1);
    if(Math.random()<hr){if(typeof window._vHitVehicle==='function'){window._vHitVehicle(p,60,600,'atgm');}}else _float(p,'MISS','miss');
    e._nextFireAt=now+5000;return;
  }
  if(!w)return;
  if(w.ammoCount!==undefined&&w.ammoCount<=0)return;
  if(w.ammoCount!==undefined)w.ammoCount--;
  _spawnBW(e.worldX,p.worldX,true);
  var _hb=p.isVehicle?0.25:(e.hitBase||0.55);
  var hc=_hb*(window._combat.playerFirst?SH:1);
  if(Math.random()<hc){
    var dmg=(typeof rndInt==='function')?rndInt(e.dmg-5,e.dmg+5):e.dmg;
    if(p.isVehicle){
      var penMM=(typeof AMMO!=='undefined'&&AMMO[w.ammoId])?AMMO[w.ammoId].pen:(e.pen||10);
      if(typeof window._vHitVehicle==='function'){window._vHitVehicle(p,dmg,penMM,w.ammoId||'unknown');}
    }else{
      if(p.isPlayer){
        var res=applyDamage({hp:p.hp,armor:p.armor},dmg,e.pen||10,p.armorLevel||0);
        p.hp=Math.max(0,p.hp-(res.hpLost||0));p.armor=Math.max(0,p.armor-(res.armorLost||0));
        state.player.hp=p.hp;state.player.armor=p.armor;_playHurt(now);
        _float(p,'-'+((res.hpLost||0)+(res.armorLost||0)),'');
      } else if(p.isPassenger && p.srv){
        var _arm=0;
        if(p.equipData){
          if(p.equipData.head){ var hid=(typeof p.equipData.head==='object')?p.equipData.head.id:p.equipData.head; var hrar=(typeof p.equipData.head==='object')?(p.equipData.head.rarity||'一般'):'一般'; if(hid&&typeof equipArmorValue==='function')_arm+=equipArmorValue(hid,hrar)||0; }
          if(p.equipData.top){ var tid=(typeof p.equipData.top==='object')?p.equipData.top.id:p.equipData.top; var trar=(typeof p.equipData.top==='object')?(p.equipData.top.rarity||'一般'):'一般'; if(tid&&typeof equipArmorValue==='function')_arm+=equipArmorValue(tid,trar)||0; }
        }
        var _t={hp:p.hp,armor:_arm};
        var r2=applyDamage(_t,dmg,e.pen||10,0);
        p.hp=_t.hp;
        if(p.hp<=0){ p.hp=0; if(p.srv){ p.srv.hp=0; p.srv.injuredUntil=Date.now()+4*3600*1000; } p._retreating=true; }
        _float(p,'-'+(r2.hpLost||0),'');
      }
    }
  }else _float(p,'MISS','miss');
  e._nextFireAt=now+60000/((WEAPONS[w.id]||{}).rpm||600);
}

function _spawnPB(w,t){var c=window._combat;if(!c)return;var z1=document.getElementById('zone1');if(!z1)return;var W=z1.clientWidth,H=z1.clientHeight;var m={x:0.25,y:0.66};if(typeof getExploreWeaponRightEdge==='function'){var mm=getExploreWeaponRightEdge(W,H);m={x:mm.x/W,y:mm.y/H};}var sm=c.sm,px=c.allies[0]?c.allies[0].worldX:0;var rel=t.worldX-px,tx=1.05;if(rel<=sm.screenRightWorld)tx=EXPLORE_HERO_X_RATIO+(rel/sm.screenRightWorld)*(1-EXPLORE_HERO_X_RATIO);if(tx>1.05)tx=1.05;c.bullets.push({sx:m.x,sy:m.y,tx:tx,ty:0.55,t:0,enemy:false});}
function _spawnBW(sxw,txw,en,big){var c=window._combat;if(!c||!c.sm)return;var px=c.allies[0]?c.allies[0].worldX:0,sm=c.sm;function ts(rel){if(rel<0)return 0.02;var raw=EXPLORE_HERO_X_RATIO+(rel/sm.screenRightWorld)*(1-EXPLORE_HERO_X_RATIO);if(raw>1.5)raw=1.5;return raw;}if(en)c.bullets.push({sx:1.05,sy:0.55,tx:EXPLORE_HERO_X_RATIO,ty:0.55,t:0,enemy:true,big:big});else c.bullets.push({sx:ts(sxw-px),sy:0.55,tx:ts(txw-px),ty:0.55,t:0,enemy:false,big:big});}
function _spawnMissile(sxw,txw){
  var c=window._combat;
  if(!c||!c.sm)return;
  if(!c.missileSmoke)c.missileSmoke=[];
  c.bullets.push({sx:1.05,sy:0.55,tx:EXPLORE_HERO_X_RATIO,ty:0.55,t:0,enemy:true,big:true,missile:true});
}
function _float(t,text,cls){var c=window._combat;if(!c)return;var p=c.allies[0],px=p?p.worldX:0,rel=t.worldX-px,sm=c.sm,sx;if(rel<0)sx=0.05;else{sx=EXPLORE_HERO_X_RATIO+(rel/sm.screenRightWorld)*(1-EXPLORE_HERO_X_RATIO);if(sx>0.95)sx=0.95;}c.floats.push({text:text,cls:cls||'',age:0,x:sx,y:0.12});}
function _tickBullets(dt){
  var c=window._combat;
  if(!c)return;
  if(!c.missileSmoke)c.missileSmoke=[];
  for(var i=c.bullets.length-1;i>=0;i--){
    var b=c.bullets[i];
    var _spd=b.missile?1.2:5;
    b.t+=dt*_spd;
    if(b.missile){
      var _bx=b.sx+(b.tx-b.sx)*b.t;
      var _by=b.sy+(b.ty-b.sy)*b.t;
      c.missileSmoke.push({x:_bx,y:_by,age:0,size:0.015+Math.random()*0.010});
    }
    if(b.t>=1)c.bullets.splice(i,1);
  }
  for(var k=c.missileSmoke.length-1;k>=0;k--){c.missileSmoke[k].age+=dt;if(c.missileSmoke[k].age>1.2)c.missileSmoke.splice(k,1);}
  for(var j=c.floats.length-1;j>=0;j--){c.floats[j].age+=dt;if(c.floats[j].age>1.2)c.floats.splice(j,1);}
}
function _render(){
  var c=window._combat;if(!c)return;
  if(!c.playerCanvas||!c.playerCanvas.isConnected){_setupCanvas();}
  if(!c.playerCtx)return;
  var ctx=c.playerCtx,W=c.playerCanvas.width,H=c.playerCanvas.height;ctx.clearRect(0,0,W,H);
  var px=c.allies[0]?c.allies[0].worldX:0,sm=c.sm;
  for(var i=0;i<c.enemies.length;i++){
    var e=c.enemies[i];if(e.hp<=0)continue;var rel=e.worldX-px;if(rel<0)continue;if(rel>sm.screenRightWorld)continue;
    var sx=(EXPLORE_HERO_X_RATIO+(rel/sm.screenRightWorld)*(1-EXPLORE_HERO_X_RATIO))*W;if(typeof _raidDrawHuman!=='function')continue;
    var eh=H*CHAR_HEIGHT_FACTOR,fy=H*0.95;var pwId=(e.primaryWeapon&&e.primaryWeapon.id)?e.primaryWeapon.id:null;
    var eq={head:e.helmet||null,top:e.body||null,primary:pwId};var eqR={head:e.rarity||'一般',top:e.rarity||'一般',primary:e.rarity||'一般'};
    ctx.save();try{_raidDrawHuman(ctx,sx,fy,eh/386,eq,eqR,'idle',0,pwId?'primary':null,'enemy',true,false,null);}catch(err){}ctx.restore();
  }
  if(c.missileSmoke){
    for(var _si=0;_si<c.missileSmoke.length;_si++){
      var _sm=c.missileSmoke[_si];
      var _sa=1-_sm.age/1.2;
      if(_sa<=0)continue;
      var _sr=_sm.size*W*(1+_sm.age*1.5);
      ctx.save();
      ctx.globalAlpha=_sa*0.75;
      var _sg=ctx.createRadialGradient(_sm.x*W,_sm.y*H,0,_sm.x*W,_sm.y*H,_sr);
      _sg.addColorStop(0,'rgba(230,230,235,0.9)');
      _sg.addColorStop(0.6,'rgba(200,200,210,0.3)');
      _sg.addColorStop(1,'rgba(180,180,190,0)');
      ctx.fillStyle=_sg;
      ctx.beginPath();ctx.arc(_sm.x*W,_sm.y*H,_sr,0,Math.PI*2);ctx.fill();
      ctx.restore();
    }
  }
  for(var b=0;b<c.bullets.length;b++){
    var bb=c.bullets[b];
    var bx=(bb.sx+(bb.tx-bb.sx)*bb.t)*W,by=(bb.sy+(bb.ty-bb.sy)*bb.t)*H;
    if(bb.missile){
      var _c2=Math.cos(Math.PI), _s2=Math.sin(Math.PI);
      ctx.save();
      ctx.shadowColor='#ff8800';
      ctx.shadowBlur=24;
      ctx.fillStyle='#ff5050';
      ctx.beginPath();ctx.arc(bx,by,6,0,Math.PI*2);ctx.fill();
      ctx.shadowBlur=0;
      ctx.fillStyle='#ffcc88';
      ctx.beginPath();ctx.arc(bx,by,2,0,Math.PI*2);ctx.fill();
      ctx.restore();
    } else {
      ctx.save();
      ctx.shadowColor=bb.enemy?'#e05252':'#ffb300';
      ctx.shadowBlur=8;
      ctx.fillStyle=bb.enemy?'#ff5252':'#ffe08a';
      ctx.beginPath();ctx.arc(bx,by,bb.big?5:3,0,Math.PI*2);ctx.fill();
      ctx.restore();
    }
  }
  for(var f=0;f<c.floats.length;f++){var ff=c.floats[f];ctx.save();ctx.fillStyle=ff.cls==='crit'?'#ff3030':(ff.cls==='miss'?'#a89a85':'#ffb300');ctx.font='bold 16px sans-serif';ctx.textAlign='center';ctx.globalAlpha=Math.max(0,1-ff.age);ctx.fillText(ff.text,ff.x*W,ff.y*H-ff.age*40);ctx.restore();}
}
function _renderFrames(){
  var c=window._combat;if(!c)return;var layer=document.getElementById('combat-frames');if(!layer)return;
  var sorted=[];for(var i=0;i<c.enemies.length;i++)if(c.enemies[i].hp>0)sorted.push(c.enemies[i]);
  var px=c.allies[0]?c.allies[0].worldX:0;sorted.sort(function(a,b){return Math.abs(a.worldX-px)-Math.abs(b.worldX-px);});
  var html='';
  for(var j=0;j<sorted.length;j++){var e=sorted[j],d=Math.abs(e.worldX-px);var rc={'破舊':'#b87333','一般':'#e0e0e0','庫存':'#4caf50','精品':'#2196f3','傳奇':'#ffb300'}[e.rarity]||'#e0e0e0';var arc=Math.round(Math.max(0,e.hp/e.maxHp)*360);html+='<div style="width:40px;height:40px;border-radius:50%;border:2px solid '+rc+';background:conic-gradient(#e05252 0deg '+arc+'deg, rgba(20,18,16,0.95) '+arc+'deg 360deg);box-sizing:border-box;position:relative"><div style="position:absolute;inset:3px;border-radius:50%;background:rgba(14,12,10,0.95);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:bold;color:#ffb300">'+Math.round(d)+'</div></div>';}
  layer.innerHTML=html;
}
function _resolve(win){
  var c=window._combat;if(!c||c.resolved)return;c.resolved=true;c.victory=win;
  if(typeof pushLog==='function'){if(win)pushLog('<span class="win">玩家</span> 戰鬥勝利（'+c.enemies.length+' 名敵人）',[],'explore');else if(c.sceneType!=='vehicle')pushLog('<span class="lose">玩家</span> 戰鬥失敗',[],'explore');}
  if(win){if(typeof c.onVictoryStart==='function'){try{c.onVictoryStart();}catch(e){}}c.lootUntil=performance.now()+0;}
  else{c.active=false;var cb=c.onResolve;c.onResolve=null;_cleanup();if(typeof cb==='function')setTimeout(function(){cb(false);},300);}
}
window._playerShouldStandStill=function(){
  var c=window._combat;if(!c||!c.active||c.resolved||c.sceneType==='vehicle')return false;
  var p=c.allies[0];if(!p||!p.isPlayer)return false;var w=_getPW();if(!w||!w.def)return false;
  var r=_rangeOfWeaponDef(w.def);
  for(var i=0;i<c.enemies.length;i++){if(c.enemies[i].hp<=0)continue;if(Math.abs(c.enemies[i].worldX-p.worldX)<=r)return true;}return false;
};
window._combatPlayerAdvance=function(delta){
  var c=window._combat;
  if(!c||!c.active||c.resolved)return;
  var p=c.allies[0];
  var minX=p?p.worldX:0;
  for(var i=0;i<c.enemies.length;i++){
    if(c.enemies[i].hp>0){
      c.enemies[i].worldX-=delta;
      if(c.enemies[i].worldX<minX)c.enemies[i].worldX=minX;
    }
  }
};;;
window._combatStart=_start;
})();

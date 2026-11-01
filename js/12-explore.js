
(function(){
'use strict';
window._tickHeroWalkSwitch=function(){};
window._explore={active:false,worldX:0,mode:'walk',nodes:[],totalLen:0,region:null,routeIdx:0,lastTick:0,deadUntil:0,combatEvent:null,_curNodeIdx:0,_bgDirty:false,_lastBtrPhase:null,passengersFollowing:[],_slot0:0,_slot1:1,_lastRotate:0,evacuatingPassengers:false,evacuateStartAt:0,_currentSpeed:0,corpses:[],_lootingUntil:0,_corpseLootTriggered:false,_vehicleShortStop:false,_vehicleFireDelayUntil:0,_pendingLootEvent:null};
function _fallbackEnemy(){return{eid:'raider',rarity:'一般',hp:45,maxHp:45,armor:0,maxArmor:0,armorLevel:3,dmg:22,pen:10,primaryWeapon:{id:'aks74u',rarity:'一般',ammoId:'5.45_ps',ammoCount:30},secondaryWeapon:null,grenade:null,hasRPG:false,rpgAmmo:0,helmet:'ssh68',body:'paca',detectDist:80,hitBase:0.55,worldX:0};}
function _genMap(region,pi){
  var rs=ROUTES[region];if(!rs||!rs[pi])return{nodes:[],totalLen:0};
  var path=rs[pi],nodes=[],cur=0;
  var _indoorR={'廢棄工廠':1,'廢棄實驗室':1,'廢土核心':1};
  var _outK=/公路|車隊|加油站|收費站|隧道口|集結|小路|農舍|涵洞|山脊|鐵道|信號塔|貨運|灘頭|枯樹林|泥沼|廢船|祭壇|沼心|腐水|孢子|沉沒|外圍|哨塔|高架|通風井|管道區|反應爐|核心|熔爐|卸貨|裝卸|車間|鍋爐|儲油|油罐/;
  var _inK=/室|門|廳|房|庫|間|井|槽|廊|梯|通道|管道|隧道|檢修|排水|維修|動力|主控|樣本|更衣|消毒|觀察|儲藏|冷凍|動物|電梯|接待/;
  var _base=region.replace(/II$/,'');
  for(var i=0;i<path.nodes.length;i++){
    var name=path.nodes[i],indoor=!!_indoorR[_base];
    if(_outK.test(name))indoor=false;
    if(_inK.test(name))indoor=true;
    var len=indoor?(30+Math.random()*20):(100+Math.random()*50);
    var sx=cur,ex=cur+len,evs=[];
    var evCount=Math.max(1,Math.round(len/24));
    var margin=3,span=Math.max(1,len-margin*2),base=span/evCount;
    for(var k=0;k<evCount;k++){
      var pos=sx+margin+base*(k+0.5);
      var jit=(Math.random()-0.5)*base*0.6,lim=Math.abs(base*0.3);
      if(jit>lim)jit=lim;else if(jit<-lim)jit=-lim;
      pos=Math.max(sx+2,Math.min(ex-2,pos+jit));
      var r=Math.random(),t='empty';
      if(r<0.6)t='combat';else if(r<0.85)t='search';
      var e={worldX:pos,type:t,cleared:false,content:null};
      if(t==='combat'){
        var tier=region.endsWith('II')?2:1,n=(window._enemyCountForRegion?window._enemyCountForRegion(region):(1+Math.floor(Math.random()*3)));
        e.content=[];
        for(var m=0;m<n;m++){try{var inst=(typeof generateEnemyInstance==='function')?generateEnemyInstance(pick(REGIONS[region].enemies),tier):null;if(inst)e.content.push(inst);}catch(x){}}
        if(!e.content.length)e.content.push(_fallbackEnemy());
      }else if(t==='search'){
        e.content=[];
        var n2=1+Math.floor(Math.random()*3);
        for(var m2=0;m2<n2;m2++){var d=rollRegionDrop(region);if(d)e.content.push({id:d.id,rarity:d.rarity,count:1+Math.floor(Math.random()*3)});}
      }
      evs.push(e);
    }
    nodes.push({idx:i,name:name,startX:sx,endX:ex,events:evs});
    cur=ex;
  }
  return{nodes:nodes,totalLen:cur};
}
function _ensureES(region,ri){
  if(!state.explore)state.explore={};
  var k=region+'#'+ri,ex=state.explore[k];
  if(!ex||!ex.nodes||!ex.nodes.length){var m=_genMap(region,ri);ex={nodes:m.nodes,totalLen:m.totalLen,worldX:0,routeIdx:ri};state.explore[k]=ex;}
  return ex;
}
function _getPlayerWalkSpeed(){
  var _w = (typeof getTotalWeight === 'function') ? getTotalWeight() : 0;
  var _free = (typeof WEIGHT_FREE_KG !== 'undefined') ? WEIGHT_FREE_KG : 20;
  var _pen = (typeof WEIGHT_PENALTY_PER_KG !== 'undefined') ? WEIGHT_PENALTY_PER_KG : 0.05;
  var _extra = Math.max(0, _w - _free);
  return 1.4 / (1 + _extra * _pen);
}
function _getVSpd(vid){
  var s=80;
  if(typeof VEHICLES!=='undefined'&&VEHICLES[vid]&&VEHICLES[vid].speedRoad)s=VEHICLES[vid].speedRoad;
  if(typeof hasCrewTalent === 'function' && hasCrewTalent('driver', 'driver_instinct')) s *= 1.10;
  return s/3.6;
}
function _hasFireTargets(){
  var c=window._combat;if(!c||!c.active||c.resolved)return false;
  if(c.sceneType!=='vehicle')return false;
  var p=c.allies[0];if(!p||!p.isVehicle)return false;
  var vid=p.vehicleId,lo=(typeof VEHICLE_LOADOUT!=='undefined')?VEHICLE_LOADOUT[vid]:null;
  if(!lo)return false;
  if(!state.vehicleAmmo||!state.vehicleAmmo[vid])return false;
  var wr=(typeof VEHICLE_RANGE_M!=='undefined')?VEHICLE_RANGE_M:{};
  var alive=[];for(var i=0;i<c.enemies.length;i++)if(c.enemies[i].hp>0)alive.push(c.enemies[i]);
  if(!alive.length)return false;
  var _commanderSense = (typeof hasCrewTalent === 'function' && hasCrewTalent('commander', 'commander_sense'));
  for(var wi=0;wi<alive.length;wi++){var e=alive[wi];
    for(var w in lo){var am=state.vehicleAmmo[vid][w];if(!am)continue;
      var _cur=(am.breakdown)?am.current:(am.current||0);
      if(!_cur||_cur<=0)continue;
      var rng=wr[w]||300;
      if(_commanderSense) rng *= 1.15;
      if(Math.abs(e.worldX-p.worldX)<=rng)return true;}}
  return false;
}
function _hasAnyAmmo(vid){
  var lo=(typeof VEHICLE_LOADOUT!=='undefined')?VEHICLE_LOADOUT[vid]:null;if(!lo)return true;
  if(!state.vehicleAmmo||!state.vehicleAmmo[vid])return true;
  for(var w in lo){var a=state.vehicleAmmo[vid][w];if(!a)continue;var _c=(a.breakdown)?a.current:(a.current||0);if(_c>0)return true;}
  return false;
}
function _computeTS(now){
  var ex=window._explore,b=window.BTRSupport;
  if(!b||!b.active)return 1.4;
  var ph=b.phase,g=(typeof _garageInitState==='function')?_garageInitState():null;
  var vid=g?g.currentVehicle:'btr80',vs=_getVSpd(vid);
  if(ph==='center')return vs;
  if(ph==='support')return vs;
  return 1.4;
}
function _updateVFire(now){
  var b=window.BTRSupport;
  if(!b||!b.active||b.phase!=='support')return;
  var g=(typeof _garageInitState==='function')?_garageInitState():null;
  var vid=g?g.currentVehicle:'btr80';
  if(!_hasAnyAmmo(vid)&&typeof window._vsForceEndSupport==='function')window._vsForceEndSupport();
}
window._btrCanFireNow=function(now){return true;};
function _curNodeIdx(){var ex=window._explore;for(var i=0;i<ex.nodes.length;i++){if(ex.worldX>=ex.nodes[i].startX&&ex.worldX<ex.nodes[i].endX)return i;}return Math.max(0,ex.nodes.length-1);}
function _nextEvent(){
  var ex=window._explore,best=null;
  for(var i=0;i<ex.nodes.length;i++)for(var j=0;j<ex.nodes[i].events.length;j++){
    var ev=ex.nodes[i].events[j];if(ev.cleared)continue;
    var d=ev.worldX-ex.worldX;if(d<-0.5)continue;
    if(!best||d<best._d){best=ev;best._d=d;}
  }
  return best;
}
function _renderBg(){
  var ex=window._explore,idx=_curNodeIdx(),node=ex.nodes[idx];if(!node)return;
  var _pathNodes=(ROUTES[ex.region]&&ROUTES[ex.region][ex.routeIdx])?ROUTES[ex.region][ex.routeIdx].nodes:null;
  var _maxIdx=_pathNodes?(_pathNodes.length-1):node.idx;
  var _safeIdx=Math.min(Math.max(0,node.idx),_maxIdx);
  var key=REGION_KEYS[ex.region.replace(/II$/,'')]+'_r'+(ex.routeIdx||0)+'_n'+_safeIdx;
  var url="url('images/bg/"+key+'.png'+(typeof assetSuffix==='function'?assetSuffix():'')+"')";
  var ls=document.querySelectorAll('#zone1 .bg-layer');for(var i=0;i<ls.length;i++)ls[i].style.backgroundImage=url;
  var t=document.querySelector('#zone1 .zone-title');
  if(t)t.textContent='🧭 '+ex.region.replace(/II$/,' II')+' · '+node.name;
  ex._bgDirty=false;
}
function _updateBgTransform(){
  var z1=document.getElementById('zone1');if(!z1)return;
  var track=z1.querySelector('.bg-track');if(!track)return;
  var ex=window._explore;
  var sm=computeScreenMetrics(z1.clientWidth,z1.clientHeight);
  var ppm=sm.bgPixelsPerMeter,cw=z1.clientWidth;
  if(track.style.animation!=='none')track.style.animation='none';
  track.style.transform='translateX('+(-((ex.worldX*ppm)%cw))+'px)';
}
function _updatePT(){
  var ex=window._explore,l=ex.passengersFollowing||[];
  for(var i=0;i<l.length;i++){
    if(l[i]._retreating){l[i].targetX=1.8;continue;}
    if(i===ex._slot0)l[i].targetX=0.35;
    else if(i===ex._slot1)l[i].targetX=0.15;
    else l[i].targetX=-0.6;
  }
}

function _disembark(){
  var g=(typeof _garageInitState==='function')?_garageInitState():null;
  var vid=g?g.currentVehicle:'btr80';
  var cap=(window.CARRIER_CAPACITY&&window.CARRIER_CAPACITY[vid])?window.CARRIER_CAPACITY[vid]:0;
  var ex=window._explore;
  if(cap<=0){ex.passengersFollowing=[];return;}
  var st=state.station;
  if(!st||!Array.isArray(st.passengers)){ex.passengersFollowing=[];return;}
  var list=[],now=performance.now();
  for(var i=0;i<st.passengers.length;i++){
    if(list.length>=cap)break;
    var p=st.passengers[i];
    var srv=state.servants.find(function(s){return s.id===p.srvId;});
    if(!srv)continue;
    if(srv.injuredUntil&&srv.injuredUntil>Date.now())continue;
    list.push({srv:srv,p:p,screenX:0.25,targetX:0.25,animFrame:0,animNext:0,fadeIn:0});
  }
  ex.passengersFollowing=list;
  ex._slot0=0;ex._slot1=list.length>1?1:0;
  ex._rotateSlot=0;
  ex._lastRotate=now+10000;ex.evacuatingPassengers=false;
  _updatePT();
}

function _evac(){
  var ex=window._explore;
  if(!ex.passengersFollowing||!ex.passengersFollowing.length)return;
  if(ex.evacuatingPassengers)return;
  ex.evacuatingPassengers=true;ex.evacuateStartAt=performance.now();
  for(var i=0;i<ex.passengersFollowing.length;i++)ex.passengersFollowing[i].targetX=1.8+i*0.08;
}
function _cleanPC(){
  var fx=document.getElementById('explore-fx');
  if(fx&&fx._pc){for(var k in fx._pc){try{fx._pc[k].remove();}catch(e){}}fx._pc={};}
  if(fx&&fx._pfb){for(var k2 in fx._pfb){try{fx._pfb[k2].remove();}catch(e){}}fx._pfb={};}
}
function _drawP(fx,key,px,fxH,item,evac,now){
  var cw=fxH*0.9,chh=fxH,cvs=fx._pc[key];
  if(!cvs){
    cvs=document.createElement('canvas');cvs.width=Math.round(cw*2);cvs.height=Math.round(chh*2);
    cvs.style.cssText='position:absolute;bottom:0;z-index:11;pointer-events:none;width:'+cw+'px;height:'+chh+'px;';
    fx.appendChild(cvs);fx._pc[key]=cvs;
  }
  cvs.style.left=(px-cw/2)+'px';
  var ctx=cvs.getContext('2d');ctx.setTransform(2,0,0,2,0,0);ctx.clearRect(0,0,cw,chh);
  if(typeof _raidDrawHuman!=='function')return;
  var p=item.p;
  var eq={head:p.helmet||null,top:p.body||null,primary:p.primaryWeapon||null};
  var eqR={head:p.helmetRarity||'一般',top:p.bodyRarity||'一般',primary:p.primaryWeaponRarity||'一般'};
  var wps=p.primaryWeapon?'primary':null;
  var ex=window._explore;
  var worldMoving=ex&&ex._currentSpeed>0.5;
  var moving=Math.abs(item.targetX-item.screenX)>0.005||worldMoving;
  var animN=moving?(evac?'run':'walk'):'idle';
  var iv=evac?60:100;
  if(!item.animNext)item.animNext=now+iv;
  if(now>=item.animNext){item.animFrame=(item.animFrame||0)+1;item.animNext=now+iv;}
  var sc=chh*CHAR_HEIGHT_FACTOR/386;
  if(item.fadeIn<1)item.fadeIn=Math.min(1,(item.fadeIn||0)+0.03);
  ctx.save();
  ctx.globalAlpha=item.fadeIn;
  _raidDrawHuman(ctx,cw/2,chh*0.95,sc,eq,eqR,animN,item.animFrame%8,wps,item.srv?item.srv.type:null,false,false,null,true);
  ctx.restore();
}
function _renderPass(now){
  var ex=window._explore,list=ex.passengersFollowing,fx=document.getElementById('explore-fx');
  if(!fx)return;
  if(!list||!list.length){_cleanPC();return;}
  var fxW=fx.clientWidth,fxH=fx.clientHeight;
  if(!fx._pc)fx._pc={};
  if(ex.evacuatingPassengers){for(var i=0;i<list.length;i++)list[i].targetX=1.8+i*0.08;}
  else if(list.length>2&&now>=ex._lastRotate){
    ex._lastRotate=now+10000;
    var n=list.length;
    ex._slot0=(ex._slot0+1)%n;ex._slot1=(ex._slot1+1)%n;
    if(ex._slot0===ex._slot1)ex._slot1=(ex._slot1+1)%n;
    _updatePT();
  }
  var sm=computeScreenMetrics(fxW,fxH),pps=_getPlayerWalkSpeed()*sm.bgPixelsPerMeter,dr=pps/fxW;
  var dtS=(now-(ex._lastPR||now))/1000;ex._lastPR=now;
  var step=dr*dtS;
  for(var k=0;k<list.length;k++){var s=list[k],diff=s.targetX-s.screenX;if(Math.abs(diff)<=step)s.screenX=s.targetX;else s.screenX+=Math.sign(diff)*step;}
  for(var d=0;d<list.length;d++){var it=list[d];if(it.screenX>1.15||it.screenX<-0.15)continue;_drawP(fx,'p'+d,it.screenX*fxW,fxH,it,ex.evacuatingPassengers,now);}
  for(var kk in fx._pc){var idx=parseInt(kk.substring(1),10);if(isNaN(idx)||idx>=list.length||list[idx].screenX>1.15||list[idx].screenX<-0.15){try{fx._pc[kk].remove();}catch(e){}delete fx._pc[kk];}}
}
function _startCorpses(enemies,enemyWX){
  var ex=window._explore,fx=document.getElementById('explore-fx');
  if(!fx||!enemies)return;
  for(var i=0;i<enemies.length;i++){
    var r=(typeof _renderEnemyCorpseCanvas==='function')?_renderEnemyCorpseCanvas(enemies[i],fx.clientHeight):null;
    if(!r)continue;
    var w=document.createElement('div');
    w.style.cssText='position:absolute;bottom:0;z-index:13;pointer-events:none;will-change:left;width:'+r.drawW+'px;height:'+r.drawH+'px;';
    r.canvas.style.cssText='width:100%;height:100%;display:block;';
    w.appendChild(r.canvas);fx.appendChild(w);
    ex.corpses.push({wrap:w,drawW:r.drawW,drawH:r.drawH,worldX:ex.worldX+(enemyWX[i]||0)});
  }
}
function _updateCorpsesLayout(){
  var ex=window._explore;
  if(!ex.corpses||!ex.corpses.length)return;
  var z1=document.getElementById('zone1'),fx=document.getElementById('explore-fx');
  if(!z1||!fx)return;
  var sm=computeScreenMetrics(z1.clientWidth,z1.clientHeight),ppm=sm.bgPixelsPerMeter;
  var px=fx.clientWidth*EXPLORE_HERO_X_RATIO;
  for(var i=ex.corpses.length-1;i>=0;i--){
    var c=ex.corpses[i];
    var left=px+(c.worldX-ex.worldX)*ppm-c.drawW/2;
    c.wrap.style.left=left+'px';
    if(left+c.drawW<-50){try{c.wrap.remove();}catch(e){}ex.corpses.splice(i,1);}
  }
}
function _lootSearch(ev){
  if(!ev.content)return;
  for(var i=0;i<ev.content.length;i++){var it=ev.content[i];if(it&&it.id)invAdd(it.id,it.rarity,it.count);}
  if(typeof pushLog==='function')pushLog('<span class="pl">玩家</span> 搜獲 '+ev.content.map(function(l){return fmtItemSpan(l.id,l.rarity,l.count);}).join('、'),ev.content,'explore');
}
function _lootVictory(ev){
  if(!ev.content)return;
  var got=[];
  for(var i=0;i<ev.content.length;i++){
    var lo=(typeof rollEnemyLoot==='function')?rollEnemyLoot(ev.content[i]):[];
    for(var j=0;j<lo.length;j++){invAdd(lo[j].id,lo[j].rarity,lo[j].count);got.push(lo[j]);}
  }
  if(got.length&&typeof pushLog==='function')pushLog('<span class="pl">玩家</span> 拾取 '+got.map(function(l){return fmtItemSpan(l.id,l.rarity,l.count);}).join('、'),got,'explore');
}
function _shuffle(){
  var ex=window._explore,pool=[];
  for(var i=0;i<ex.nodes.length;i++)for(var j=0;j<ex.nodes[i].events.length;j++){
    var ev=ex.nodes[i].events[j];
    if(!ev.cleared&&ev.content){for(var k=0;k<ev.content.length;k++)pool.push(ev.content[k]);ev.content=null;}
  }
  for(var a=pool.length-1;a>0;a--){var b=Math.floor(Math.random()*(a+1));var t=pool[a];pool[a]=pool[b];pool[b]=t;}
  for(var n=0;n<ex.nodes.length&&pool.length;n++)for(var m=0;m<ex.nodes[n].events.length&&pool.length;m++){
    var e=ex.nodes[n].events[m];if(e.cleared)continue;
    if(!e.content){var arr=[],cnt=1+Math.floor(Math.random()*2);for(var x=0;x<cnt&&pool.length;x++)arr.push(pool.pop());e.content=arr.length?arr:null;}
  }
}
function _trigger(ev){
  var ex=window._explore;if(ev.cleared)return;
  if(ev.type==='combat'){
    var mode=state.preferences.actionMode||'attack';
    var pd=(typeof PLAYER_DETECT_DIST!=='undefined')?PLAYER_DETECT_DIST[mode]:100;
    var ed=80;
    if(ev.content&&ev.content[0]&&ev.content[0].detectDist)ed=ev.content[0].detectDist;
    var d=Math.abs(ev.worldX-ex.worldX);
    var first='player';
    if(d<=pd&&d<=ed)first=Math.random()<0.5?'player':'enemy';
    else if(d<=pd)first='enemy';
    else if(d<=ed)first='player';
    if(mode==='stealth'&&first==='player'){ev.cleared=true;_lootSearch(ev);return;}
    ex.mode='combat';ex.combatEvent=ev;_startCombat(ev,first);return;
  }
  ev.cleared=true;
  if(ev.type==='search'){
    _lootSearch(ev);
    ex._lootingUntil=performance.now()+2000;
    if(typeof heroAnim!=='undefined'){heroAnim.name='idle';heroAnim.frame=0;heroAnim.lastUpdate=performance.now();}
  }
}
function _getPW(){
  var s=null;
  if(state.player.equipped.primary)s='primary';else if(state.player.equipped.secondary)s='secondary';else if(state.player.equipped.melee)s='melee';
  if(!s)return null;
  var id=state.player.equipped[s],d=itemDef(id);if(!d)return null;
  return{id:id,rarity:state.player.equippedRarity[s]||'一般',slot:s,def:d};
}
function _startCombat(ev,first){
  var ex=window._explore;
  var isV=!!(window.BTRSupport&&window.BTRSupport.active&&window.BTRSupport.phase==='support');
  var allies=[],sceneType='foot';
  if(isV){
    sceneType='vehicle';
    var g=(typeof _garageInitState==='function')?_garageInitState():null;
    var vid=g?g.currentVehicle:'btr80';
    var vdef=(typeof VEHICLES!=='undefined')?VEHICLES[vid]:null;
    var vh=(vdef&&vdef.hp)?vdef.hp:500;
    allies=[{isVehicle:true,vehicleId:vid,hp:vh,maxHp:vh,armorGrid:[30,20,15],armorLevel:5,worldX:0}];
  }else{
    var w=_getPW();
    allies=[{isPlayer:true,hp:state.player.hp,maxHp:state.player.maxHp,armor:state.player.armor,maxArmor:state.player.maxArmor,armorLevel:state.player.armorLevel||0,worldX:0,weapon:w}];
    var fw=ex.passengersFollowing||[],slot=0;
    var _publicPool=[];
    for(var _pi0=0;_pi0<fw.length;_pi0++){
      var _p0=fw[_pi0].p;
      if(_p0.primaryWeapon&&AMMO[_p0.primaryWeapon]){
        _publicPool.push({cal:AMMO[_p0.primaryWeapon].cal,id:_p0.primaryWeapon,rarity:_p0.primaryWeaponRarity||'一般',count:_p0.primaryWeaponBoxCount||AMMOBOX_CAPACITY});
      }
    }
    for(var fi=0;fi<fw.length&&slot<2;fi++){
      var f2=fw[fi],srv=f2.srv,p=f2.p;
      if(srv.injuredUntil&&Date.now()<srv.injuredUntil)continue;
      if(p.primaryWeapon&&AMMO[p.primaryWeapon])continue;
      var pw=p.primaryWeapon?itemDef(p.primaryWeapon):null;
      var wO=pw?{id:p.primaryWeapon,rarity:p.primaryWeaponRarity||'一般',def:pw,slot:'primary'}:null;
      allies.push({isPassenger:true,srv:srv,hp:servantMaxHp(srv),maxHp:servantMaxHp(srv),armor:0,maxArmor:0,armorLevel:0,worldX:slot===0?0.5:0.15,weapon:wO,equipData:{head:p.helmet||null,top:p.body||null,primary:p.primaryWeapon||null},ammoPouch:p.ammoPouch?{ammoId:p.ammoPouch.ammoId,rarity:p.ammoPouch.rarity,count:p.ammoPouch.count}:null,ammoBox:p.ammoBox?{ammoId:p.ammoBox.ammoId,rarity:p.ammoBox.rarity,count:p.ammoBox.count}:null,_publicPool:_publicPool});
      slot++;
    }
  }
  var enemies=[],offs=[];
  var _baseDist=ev.worldX-ex.worldX;
  if(_baseDist<1)_baseDist=1;
  for(var j=0;j<ev.content.length;j++){
    if(!ev.content[j])continue;
    var c=Object.assign({},ev.content[j]);
    var rel=_baseDist+(j-(ev.content.length-1)/2)*1.5;
    c.worldX=rel;enemies.push(c);offs.push(rel);
  }
  if(!enemies.length){ev.cleared=true;return;}
  if(typeof window._combatStart!=='function'){ex.mode=isV?'vehicle':'walk';ev.cleared=true;return;}
  window._combatStart({
    sceneType:sceneType,firstSide:first,allies:allies,enemies:enemies,
    onVictoryStart:function(){
      if(!isV)_startCorpses(ev.content,offs);
      ex._pendingLootEvent=ev;
    },
    onResolve:function(win){
      if(win&&ex.combatEvent)ex.combatEvent.cleared=true;
      ex.combatEvent=null;
      var _isVNow=!!(window.BTRSupport&&window.BTRSupport.active&&window.BTRSupport.phase==='support');
      if(win){ex.mode=_isVNow?'vehicle':'walk';}
      else{
        var _now=Date.now();
        state.player.deadUntil=_now+60000;
        ex.mode='dead';
        ex.deadUntil=performance.now()+60000;
        for(var ci=ex.corpses.length-1;ci>=0;ci--){try{ex.corpses[ci].wrap.remove();}catch(e){}}
        ex.corpses=[];ex._pendingLootEvent=null;
        if(ex.passengersFollowing&&ex.passengersFollowing.length)_evac();
        if(!isV){state.player.hp=state.player.maxHp;state.player.armor=state.player.maxArmor;if(typeof refreshPlayerStats==='function')refreshPlayerStats();}
        if(typeof save==='function')save();
      }
    }
  });
}
function _tick(now){
  var ex=window._explore;if(!ex.active)return;
  var b=window.BTRSupport;
  var ph=(b&&b.active)?b.phase:null;
  if(b&&b.active&&ph==='enter'&&ex.passengersFollowing&&ex.passengersFollowing.length>0&&!ex.evacuatingPassengers){
    _evac();
  }
  if(ex._lastBtrPhase!==ph){
    if(ph==='exit'&&ex._lastBtrPhase!=='exit')_disembark();
    else if(ph==='wreck'&&ex._lastBtrPhase!=='wreck')_disembark();
    ex._lastBtrPhase=ph;
  }
  if(ph==='support'){if(ex.mode!=='combat'&&ex.mode!=='dead')ex.mode='vehicle';}
  else{if(ex.mode==='vehicle')ex.mode='walk';}
  if(ex.passengersFollowing&&ex.passengersFollowing.length)_renderPass(now);
  if(ex.mode==='dead'){
    if(typeof heroAnim !== 'undefined' && heroAnim.name !== 'dead'){
      heroAnim.name = 'dead';
      heroAnim.frame = 0;
      heroAnim.lastUpdate = performance.now();
    }
    var _deadUntilMs=(state.player&&state.player.deadUntil)?state.player.deadUntil:0;
    var _deadRemain=_deadUntilMs-Date.now();
    if(_deadRemain>0){ex._currentSpeed=0;_updateBgTransform();_updateCorpsesLayout();return;}
    ex.mode='walk';ex.deadUntil=0;if(state.player){state.player.deadUntil=0;state.player.hp=state.player.maxHp;state.player.armor=state.player.maxArmor;}if(typeof refreshPlayerStats==='function')refreshPlayerStats();
    if(typeof heroAnim !== 'undefined'){ heroAnim.name = 'walk'; heroAnim.frame = 0; }
    _shuffle();_updateBgTransform();return;
  }
  var dt=Math.min(0.1,(now-(ex.lastTick||now))/1000);ex.lastTick=now;
  _updateVFire(now);
  var _inVehCombat=!!(window._combatActive&&window._combat&&window._combat.sceneType==='vehicle');
  var ts=_getPlayerWalkSpeed();
  if(ex._lootingUntil>0&&now<ex._lootingUntil&&!_inVehCombat){ts=0;}
  else if(ex.mode==='combat'&&!_inVehCombat){ts=(typeof window._playerShouldStandStill==='function'&&window._playerShouldStandStill())?0:1.4;}
  else if(b&&b.active){ts=_computeTS(now);}
  if(!ex.combatEvent){
    var _ne=_nextEvent();
    if(!_ne){
      var _rs=getActiveRegions();var _newR=_rs[Math.floor(Math.random()*_rs.length)];
      if(_newR&&ROUTES[_newR]){
        var _newRi=Math.floor(Math.random()*ROUTES[_newR].length);
        var _m=_genMap(_newR,_newRi);
        var _off=ex.worldX+5;
        for(var ni=0;ni<_m.nodes.length;ni++){
          _m.nodes[ni].startX+=_off;_m.nodes[ni].endX+=_off;
          for(var ei=0;ei<_m.nodes[ni].events.length;ei++)_m.nodes[ni].events[ei].worldX+=_off;
        }
        ex.nodes=ex.nodes.concat(_m.nodes);ex.totalLen=_off+_m.totalLen;
      }
    }
  }
  var k=Math.min(1,dt*8);
  if(ts===0)ex._currentSpeed=0;
  else ex._currentSpeed+=(ts-ex._currentSpeed)*k;
  if(Math.abs(ex._currentSpeed-ts)<0.01)ex._currentSpeed=ts;
  if(ts>0&&ex._currentSpeed===0&&ex.mode==='walk'&&ex._lootingUntil===0&&!window._combatActive){
    ex._currentSpeed=ts;
  }
  var _delta=ex._currentSpeed*dt;
  ex.worldX+=_delta;
  if(_delta>0.001&&typeof window._combatPlayerAdvance==='function')window._combatPlayerAdvance(_delta);
  _updateCorpsesLayout();
  if(ex._lootingUntil>0&&now<ex._lootingUntil){
    if(typeof heroAnim!=='undefined'&&heroAnim.name!=='idle'){heroAnim.name='idle';heroAnim.frame=0;heroAnim.lastUpdate=now;}
  }else{
    if(typeof heroAnim!=='undefined'&&heroAnim.name==='idle'&&ex._currentSpeed>0.5){heroAnim.name='walk';heroAnim.frame=0;heroAnim.lastUpdate=now;}
  }
  if(!ex._corpseLootTriggered&&ex.corpses.length>0&&!_inVehCombat&&ex.mode!=='combat'&&ex._pendingLootEvent){
    var closest=null,closestDist=Infinity;
    for(var ci=0;ci<ex.corpses.length;ci++){
      var cc=ex.corpses[ci],rel=cc.worldX-ex.worldX;
      if(rel<=0&&Math.abs(rel)<=0.5&&Math.abs(rel)<closestDist){closest=cc;closestDist=Math.abs(rel);}
    }
    if(closest){ex._lootingUntil=now+2000;ex._corpseLootTriggered=true;}
  }
  if(ex._lootingUntil>0&&now>=ex._lootingUntil){
    ex._lootingUntil=0;ex._corpseLootTriggered=false;
    if(ex._pendingLootEvent){
      if(!ex._pendingLootEvent.cleared)ex._pendingLootEvent.cleared=true;
      _lootVictory(ex._pendingLootEvent);
      ex._pendingLootEvent=null;
    }
  }
  var prev=ex._curNodeIdx||0,curr=_curNodeIdx();
  if(prev!==curr){ex._curNodeIdx=curr;ex._bgDirty=true;}
  if(ex._bgDirty)_renderBg();
  _updateBgTransform();
  if(!ex.combatEvent&&ex.mode!=='combat'&&!(ex._lootingUntil>0&&now<ex._lootingUntil)&&!window._combatActive){
    var mode=state.preferences.actionMode||'attack';
    var pd=(typeof PLAYER_DETECT_DIST!=='undefined')?PLAYER_DETECT_DIST[mode]:100;
    var _isVMode=(ex.mode==='vehicle');
    var _maxRange=Infinity;
    if(!_isVMode){
      var _pw=_getPW();
      _maxRange=15;
      if(_pw&&_pw.def){
        if(_pw.def._shortRange)_maxRange=20;
        else if(typeof WEAPON_COMBAT_RANGE!=='undefined'&&WEAPON_COMBAT_RANGE[_pw.def.type])_maxRange=WEAPON_COMBAT_RANGE[_pw.def.type];
      }
    }
    var _bestEv=null,_bestD=Infinity;
    for(var _ni=0;_ni<ex.nodes.length;_ni++){
      var _nd=ex.nodes[_ni];
      for(var _ei=0;_ei<_nd.events.length;_ei++){
        var _ev=_nd.events[_ei];
        if(_ev.cleared)continue;
        var _d=_ev.worldX-ex.worldX;
        if(_d<0)continue;
        var _ed=80;
        if(_ev.content&&_ev.content[0]&&_ev.content[0].detectDist)_ed=_ev.content[0].detectDist;
        var _dr=Math.max(pd,_ed);
        if(_d<=_dr&&_d<=_maxRange&&_d<_bestD){_bestEv=_ev;_bestD=_d;}
      }
    }
    if(_bestEv)_trigger(_bestEv);
  }
  if(!ex._lastSaveAt||now-ex._lastSaveAt>500){
    ex._lastSaveAt=now;
    var kk=ex.region+'#'+ex.routeIdx;
    if(state.explore&&state.explore[kk])state.explore[kk].worldX=ex.worldX;
  }
}
window._exploreEnterLootWindow=function(){};
function _startMap(region,ri){
  var ex=window._explore;
  if(!region)region=state.activeRegion||(getActiveRegions()[0]||'廢棄工廠');
  var rs=ROUTES[region];if(!rs)return;
  if(ri===undefined||ri===null)ri=Math.floor(Math.random()*rs.length);
  var persisted=_ensureES(region,ri);
  ex.region=region;ex.routeIdx=ri;
  ex.nodes=persisted.nodes;ex.totalLen=persisted.totalLen;ex.worldX=persisted.worldX||0;
  ex.mode='walk';ex.active=true;ex.deadUntil=0;ex.combatEvent=null;
  ex._curNodeIdx=0;ex._bgDirty=true;ex.corpses=[];ex._lootingUntil=0;ex._pendingLootEvent=null;ex._corpseLootTriggered=false;
  if(!ex.passengersFollowing)ex.passengersFollowing=[];
  var _n=ex.passengersFollowing.length;
  if(_n>0){if(ex._slot0>=_n)ex._slot0=0;if(ex._slot1>=_n)ex._slot1=(_n>1?1:0);}else{ex._slot0=0;ex._slot1=0;}
  ex._lastRotate=0;
  ex._currentSpeed=1.4;ex._vehicleShortStop=false;ex._vehicleFireDelayUntil=0;
  _cleanPC();
}
window.renderExplore=function(){
  var z1=document.getElementById('zone1');if(!z1)return;
  var b=window.BTRSupport;
  if(!b||!b.active){
    var rgs=(typeof getActiveRegions==='function')?getActiveRegions():['廢棄工廠'];
    var region=state.activeRegion||rgs[0]||'廢棄工廠';
    state.activeRegion=region;
    z1.innerHTML='<div class="scene"><div class="bg-scroll" style="--spd:10s"><div class="bg-track"><div class="bg-layer"></div><div class="bg-layer"></div></div></div><div class="bg-fade" id="explore-bg-fade" style="opacity:0"></div><div class="groundline"></div><div class="explore-fx" id="explore-fx"></div><canvas id="hero-canvas" class="hero-canvas"></canvas><div class="zone-title">🧭 '+region.replace(/II$/,' II')+'</div><div class="zone-badge">'+(state.preferences.actionMode==='attack'?'⚔ 攻擊前進':'🥷 潛行蒐集')+'</div></div>';
    try{_startMap(region);}catch(e){console.warn('[explore startMap]',e);}
    try{_renderBg();}catch(e){}
    requestAnimationFrame(function(){if(typeof renderExploreHeroCanvas==='function')renderExploreHeroCanvas();_updateBgTransform();});
  } else if(!z1.querySelector('.scene')){
    var rgs2=(typeof getActiveRegions==='function')?getActiveRegions():['廢棄工廠'];
    var region2=state.activeRegion||rgs2[0]||'廢棄工廠';
    z1.innerHTML='<div class="scene"><div class="bg-scroll" style="--spd:10s"><div class="bg-track"><div class="bg-layer"></div><div class="bg-layer"></div></div></div><div class="bg-fade" id="explore-bg-fade" style="opacity:0"></div><div class="groundline"></div><div class="explore-fx" id="explore-fx"></div><canvas id="hero-canvas" class="hero-canvas"></canvas><div class="zone-title">🧭 '+region2.replace(/II$/,' II')+'</div><div class="zone-badge"></div></div>';
    try{ if(b._setupCanvas) b._setupCanvas(); }catch(e){ console.warn('[btr remount]', e); }
    requestAnimationFrame(function(){if(typeof renderExploreHeroCanvas==='function')renderExploreHeroCanvas();});
  }
  var z2=document.getElementById('zone2');
  if(z2&&typeof renderEquipZone==='function')renderEquipZone(z2);
  var z3=document.getElementById('zone3');
  if(z3){
    z3.innerHTML='<div class="z3-head"><div class="z3-title">📜 日誌</div><div class="z3-btn" id="log-history-btn">查看記錄</div></div><div class="logbox" id="logbox"></div>';
    if(typeof renderZone3Log==='function')renderZone3Log();
    var bb=document.getElementById('log-history-btn');
    if(bb&&typeof openLogHistory==='function')bb.onclick=openLogHistory;
  }
};
window._exploreStartMap=_startMap;
window._exploreTick=_tick;
window._exploreSetVehicleMode=function(on){if(on)window._explore.mode='vehicle';else if(window._explore.mode!=='combat'&&window._explore.mode!=='dead')window._explore.mode='walk';};
window._exploreEvacuatePassengers=_evac;
})();


window._enemyCountWeights = {
  '廢棄工廠':     [40, 35, 25],
  '廢棄實驗室':   [40, 35, 25],
  '郊區公路':     [25, 30, 25, 15, 5],
  '輻射沼澤':     [15, 20, 22, 20, 13, 7, 3],
  '廢土核心':     [5, 8, 12, 20, 22, 20, 13],
  '廢棄工廠II':   [15, 20, 22, 20, 13, 7, 3],
  '廢棄實驗室II': [10, 15, 20, 22, 18, 10, 5],
  '郊區公路II':   [8, 12, 18, 22, 20, 13, 7],
  '輻射沼澤II':   [5, 8, 12, 20, 22, 20, 13],
  '廢土核心II':   [3, 5, 8, 15, 22, 25, 22]
};
window._enemyCountWeights = {
  '廢棄工廠':     [40, 35, 25],
  '廢棄實驗室':   [40, 35, 25],
  '郊區公路':     [25, 30, 25, 15, 5],
  '輻射沼澤':     [15, 20, 22, 20, 13, 7, 3],
  '廢土核心':     [5, 8, 12, 20, 22, 20, 13],
  '廢棄工廠II':   [15, 20, 22, 20, 13, 7, 3],
  '廢棄實驗室II': [10, 15, 20, 22, 18, 10, 5],
  '郊區公路II':   [8, 12, 18, 22, 20, 13, 7],
  '輻射沼澤II':   [5, 8, 12, 20, 22, 20, 13],
  '廢土核心II':   [3, 5, 8, 15, 22, 25, 22]
};
window._enemyCountForRegion = function(region){
  var w = window._enemyCountWeights[region] || [30, 40, 30];
  var total = 0;
  for(var i = 0; i < w.length; i++) total += w[i];
  var r = Math.random() * total;
  for(var i = 0; i < w.length; i++){
    r -= w[i];
    if(r <= 0) return i + 1;
  }
  return w.length;
};

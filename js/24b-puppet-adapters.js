(function(){
'use strict';
if(window.__pmAdp)return;
var R=window.PuppetRig;if(!R)return;
window.__pmAdp=1;
function CHF(){return typeof CHAR_HEIGHT_FACTOR==='number'?CHAR_HEIGHT_FACTOR:0.58;}
function HR(){return typeof EXPLORE_HERO_X_RATIO==='number'?EXPLORE_HERO_X_RATIO:0.25;}
function HA(){return typeof heroAnim!=='undefined'?heroAnim:null;}
function BA(){return typeof battleHeroAnim!=='undefined'?battleHeroAnim:null;}
function BT(){return typeof battle!=='undefined'?battle:null;}
function ST(){return typeof state!=='undefined'?state:null;}
function AM(id){return typeof AMMO!=='undefined'&&!!AMMO[id];}
function nm(a){return a==='death'?'dead':(a||'idle');}
var LAST=9999;
var COL={farmer:{b:'#5a9a48',l:'#3a6a2e'},guard:{b:'#5088bb',l:'#2e4a6a'},
foreman:{b:'#e0a830',l:'#d8d0c0'},enemy:{b:'#8b2a2a',l:'#3a1010'}};
function colors(t){var c=COL[t];if(!c)return null;
return{torso:c.b,front_upper_arm:c.b,front_forearm:c.b,back_upper_arm:c.b,back_forearm:c.b,
right_thigh:c.l,right_shin:c.l,left_thigh:c.l,left_shin:c.l};}
function helm(t,no){if(no)return null;return t==='foreman'?'#ffffff':(t==='farmer'?'#ff8800':null);}
try{if(typeof GAME_ANIMS!=='undefined'){var A=GAME_ANIMS,BB=R.B.anim.R,k;
for(k in BB){if(!A[k])A[k]={keys:{}};A[k].frameCount=BB[k].fc;A[k].fps=BB[k].fps;A[k].loop=BB[k].loop;A[k].showEq=BB[k].show;}
if(!A.garden_work){A.garden_work=JSON.parse(JSON.stringify(A.fire_primary||A.idle));A.garden_work.loop=true;}}}catch(e){}
function slot(eq,ov){if(ov==='hidden')return null;if(ov&&eq[ov])return ov;
if(eq.primary)return'primary';if(eq.secondary)return'secondary';if(eq.melee)return'melee';return null;}
function fit(px,py,s,W,H,flip,sl,id,eq,worker,props){
var c=id?R.weaponCfg(sl,id):null;
var o={headEnv:true,topEnv:true,worker:!!worker,props:!!props};
if(eq){o.head=eq.head||null;o.top=eq.top||null;}
if(props){o.bucket=(props==='bucket');o.handItem=(props==='bucket'?null:props);}
var bb=R.bbox('dead',LAST,flip,c,o);
var nL=Math.max(0,200-bb.x0)*s+3,nR=Math.max(0,bb.x1-200)*s+3;
var nA=Math.max(0,515-bb.y0)*s+3,nB=Math.max(0,bb.y1-515)*s+3;
var x=Math.min(px,W-nR);x=Math.max(x,nL);
var y=Math.min(py,H-nB);y=Math.max(y,nA);
return{x:x,y:y};}
window.getWeaponCfg=function(s,id){return R.weaponCfg(s,id);};
window.getTopCfg=function(id){return R.topCfg(id);};
window.computeWeaponCharLayout=function(c){if(!c)return null;var b=R.boxOf(c);if(!b)return null;
return{anchorX:0,anchorY:0,rightX:b.bw,baseW:b.bw,baseH:b.bh,isTrimMode:true};};
window.getCharWeaponMuzzleLocal=function(s,id,a,i,f){return R.muzzle(s,id,nm(a),i|0,!!f);};
window.getCharLayerCornerN=function(l,u,v,o){o=o||{};var p=R.point(l,u,v,nm(o.animName),o.frameIdx|0,false);
if(!p)return{x:0,y:0};var s=o.scale||1,W=o.canvasW||1,H=o.canvasH||1;
return{x:((o.centerX_px||0)+s*(p.x-200))/W,y:((o.groundY_px||0)+s*(p.y-515))/H};};
window._corpseFit=function(px,py,s,W,H,hasHelmet,dir){
var st=ST(),eq=(st&&st.player&&st.player.equipped)||{},sl=slot(eq,null);
return fit(px,py,s,W,H,dir<0,sl,sl?eq[sl]:null,eq,null,null);};
window.drawBlockHero=function(ctx,W,H,a,i,ov,fac,ratio,leg,heal,fall,flip){
var st=ST(),eq=(st&&st.player&&st.player.equipped)||{};
var s=(H*(fac||CHF()))/386,cy=H*0.95,cx=W*(ratio!=null?ratio:0.5);
var sl=slot(eq,ov),id=sl?eq[sl]:null,an=nm(a);
var fi=(an==='dead'&&fall===1)?LAST:(i|0);
if(an==='dead'){var f=fit(cx,cy,s,W,H,!!flip,sl,id,eq,null,null);cx=f.x;cy=f.y;}
R.draw(ctx,cx,cy,s,{anim:an,frame:fi,flip:!!flip,slot:sl,weaponId:id,
head:eq.head,top:eq.top,healId:heal,ammoBox:AM(id)});};
window._raidDrawHuman=function(ctx,px,py,s,eq,eqR,a,i,ov,type,flip,bucket,hand,noHelm,leg){
eq=eq||{};var sl=slot(eq,ov),id=sl?eq[sl]:null,an=nm(a),fi=i|0,wk=helm(type,noHelm);
var props=bucket?'bucket':(hand||null);
if(an==='dead'){var cv=ctx.canvas,W=(cv&&cv.clientWidth)||400,H=(cv&&cv.clientHeight)||500;
var f=fit(px,py,s,W,H,!!flip,sl,id,eq,wk,props);px=f.x;py=f.y;fi=LAST;}
R.draw(ctx,px,py,s,{anim:an,frame:fi,flip:!!flip,slot:sl,weaponId:id,
head:eq.head,top:eq.top,colors:colors(type),bucket:!!bucket,handItem:hand,
worker:wk,ammoBox:AM(id)});};
window.drawHumanSprite=window._raidDrawHuman;
var _oldE=window._raidDrawEnemy;
window._raidDrawEnemy=function(ctx,px,py,s,a,i,eid){var rid=eid;
if(typeof HUMAN_ENEMY_DATA!=='undefined'){
if(!HUMAN_ENEMY_DATA[eid]&&HUMAN_ENEMY_DATA['human_'+eid])rid='human_'+eid;
if(HUMAN_ENEMY_DATA[rid]){
if(!window._pmEqC)window._pmEqC={};
if(!window._pmEqC[rid]){var e=null;
try{if(typeof _rev506_getRandomEquip==='function')e=_rev506_getRandomEquip(rid);}catch(x){}
window._pmEqC[rid]=e||{head:'ssh68',top:'6b231',primary:'ak74'};}
var eq=window._pmEqC[rid]||{},an=nm(a);
window._raidDrawHuman(ctx,px,py,s,eq,{},an,an==='dead'?LAST:(i|0),
eq.primary?'primary':null,'enemy',true,false,null,true,null);
return;}}
if(typeof _oldE==='function')return _oldE.apply(this,arguments);};
window.drawEnemySprite=window._raidDrawEnemy;
if(typeof window._renderEnemyCorpseCanvas==='function'){
window._renderEnemyCorpseCanvas=function(en,fxH){
var pw=en&&en.primaryWeapon&&en.primaryWeapon.id,sw=en&&en.secondaryWeapon&&en.secondaryWeapon.id;
var sl=pw?'primary':(sw?'secondary':null),id=pw||sw||null;
var eq={head:(en&&en.helmet)||null,top:(en&&en.body)||null};
var c=id?R.weaponCfg(sl,id):null;
var bb=R.bbox('dead',LAST,true,c,{head:eq.head,top:eq.top,headEnv:!eq.head,topEnv:!eq.top});
var s=(fxH*CHF())/386;
var dw=Math.max(8,Math.ceil(bb.w*s)+10),dh=Math.max(8,Math.ceil(bb.h*s)+10);
var cv=document.createElement('canvas');cv.width=dw*2;cv.height=dh*2;
var g=cv.getContext('2d');g.setTransform(2,0,0,2,0,0);
var ox=dw/2-s*((bb.x0+bb.x1)/2-200),oy=dh/2-s*((bb.y0+bb.y1)/2-515);
R.draw(g,ox,oy,s,{anim:'dead',frame:LAST,flip:true,slot:sl,weaponId:id,
head:eq.head,top:eq.top,colors:colors('enemy')});
return{canvas:cv,drawW:dw,drawH:dh,footX:ox,footY:oy};};}
if(typeof window._rev506_drawHumanCorpse==='function'){
window._rev506_drawHumanCorpse=function(ctx,rid,s,ox,oy,def,a,f,equip,isDeath){
var eq=equip||{},sl=eq.primary?'primary':(eq.secondary?'secondary':null);
var cv=ctx.canvas,W=(cv&&cv.clientWidth)||400,H=(cv&&cv.clientHeight)||500;
var px=ox+((def&&def.canvas)?def.canvas.w*s/2:0),py=oy+((def&&def.canvas)?def.canvas.h*s:0);
if(isDeath){var ff=fit(px,py,s,W,H,true,sl,sl?eq[sl]:null,eq,null,null);px=ff.x;py=ff.y;}
R.draw(ctx,px,py,s,{anim:isDeath?'dead':'idle',frame:isDeath?LAST:f,flip:true,slot:sl,
weaponId:sl?eq[sl]:null,head:eq.head,top:eq.top,colors:colors('enemy')});};}
window._getPlayerHandPos=function(a,i){
var cv=document.getElementById('hero-canvas');
var W=(cv&&cv.clientWidth)?cv.clientWidth:400,H=(cv&&cv.clientHeight)?cv.clientHeight:500;
var s=(H*CHF())/386,ha=HA(),an=nm(a||(ha?ha.name:'idle'));
var p=R.hand(an,(typeof i==='number')?i:(ha?ha.frame:0),false);
return{x:(W*HR()+s*(p.x-200))/W,y:(H*0.95+s*(p.y-515))/H};};
window.getExploreWeaponRightEdge=function(W,H){
var s=(H*CHF())/386,gy=H*0.95,cx=W*HR(),st=ST(),eq=(st&&st.player&&st.player.equipped)||{};
var ha=HA(),sl=slot(eq,ha?ha.eqSlot:null),id=sl?eq[sl]:null;
if(!id)return{x:cx,y:gy};
var m=R.muzzle(sl,id,nm(ha?ha.name:'idle'),ha?ha.frame:0,false);
return m?{x:cx+s*(m.x-200),y:gy+s*(m.y-515)}:{x:cx,y:gy};};
window.getPlayerMuzzlePos=function(){
var fx=document.getElementById('battle-fx'),W=fx?fx.clientWidth:400,H=fx?fx.clientHeight:500,bt=BT();
var sw=(bt&&bt.playerCanvasW)?bt.playerCanvasW:220;
var sh=(bt&&bt.playerCanvasH)?bt.playerCanvasH:(typeof BATTLE_HERO_SPRITE_H==='number'?BATTLE_HERO_SPRITE_H:118);
var s=(sh*CHF())/386,gy=sh*0.95,cx=sw/2,st=ST(),eq=(st&&st.player&&st.player.equipped)||{};
var sl=slot(eq,bt?bt.weaponSlot:null),id=sl?eq[sl]:null,lx=cx,ly=gy-sh*0.4,ba=BA();
if(id){var m=R.muzzle(sl,id,nm(ba?ba.name:'idle'),ba?ba.frame:0,false);
if(m){lx=cx+s*(m.x-200);ly=gy+s*(m.y-515);}}
var px=bt?bt.px:0.15;return{x:(px*W-sw/2+lx)/W,y:ly/H};};
window._getPassengerMuzzlePos=function(a){
var c=window._combat;if(!c||!a||!a.weapon||!a.weapon.id)return null;
var fx=document.getElementById('combat-overlay');if(!fx)return null;
var W=fx.clientWidth,H=fx.clientHeight;if(!W||!H)return null;
var ex=window._explore,list=(ex&&ex.passengersFollowing)||[],it=null,i;
for(i=0;i<list.length;i++){if(list[i].srv&&a.srv&&list[i].srv.id===a.srv.id){it=list[i];break;}}
if(!it)return null;
var m=R.muzzle(a.weapon.slot||'primary',a.weapon.id,nm(it._lastAnimN),it.animFrame|0,false);
if(!m)return null;
var cw=H*1.2,s=(H*CHF())/386,left=it.screenX*W-cw/2;
return{x:(left+cw/2+s*(m.x-200))/W,y:(H*0.96+s*(m.y-515))/H};};
window._getEnemyMuzzlePos=function(e,p,isRPG){
var fx=document.getElementById('combat-overlay'),W=fx?fx.clientWidth:400,H=fx?fx.clientHeight:500;
var c=window._combat;if(!c)return{x:1.05,y:0.55};
var sm=c.sm||{screenRightWorld:2},rel=(e.worldX-p.worldX)+(isRPG?0.5:0);
var sx=(HR()+rel/(sm.screenRightWorld||2)*(1-HR()))*W;
if(rel<=0)sx=0.02*W;
var wid=(isRPG&&e.hasRPG)?'rpg':((e._activeWeapon&&e._activeWeapon.id)||(e.primaryWeapon&&e.primaryWeapon.id)||(e.secondaryWeapon&&e.secondaryWeapon.id));
if(!wid)return{x:sx/W,y:0.55};
var sl=(wid==='rpg'||(e.primaryWeapon&&e.primaryWeapon.id===wid))?'primary':'secondary';
var now=performance.now();
var as=(typeof getUnitAnimState==='function')?getUnitAnimState(e,now):{name:'idle',startTime:now};
var an=nm(as.name),fi=Math.floor(Math.max(0,now-as.startTime)/(1000/R.fps(an)));
var m=R.muzzle(sl,wid,an,fi,true);if(!m)return{x:sx/W,y:0.55};
var s=(H*CHF())/386;
return{x:(sx+s*(m.x-200))/W,y:(H*0.95+s*(m.y-515))/H};};
window._getRaidMuzzleWorld=function(u,scale){
if(!u||!u.equipped||!u.weaponSlot)return null;
var id=u.equipped[u.weaponSlot];if(!id)return null;
var act=u._actor||null;
var px=(act&&typeof act.x==='number')?act.x:u.x,py=(act&&typeof act.y==='number')?act.y:u.y;
if(typeof px!=='number'||typeof py!=='number')return null;
var sc=scale;
if(typeof window._gardenActorCharPx==='number'&&window._gardenActorCharPx>0)sc=window._gardenActorCharPx/386;
if(!(sc>0))return null;
var an=u.weaponSlot==='secondary'?'fire_secondary':'fire_primary';
var fi=(act&&typeof act._animFrame==='number')?act._animFrame:0;
var m=R.muzzle(u.weaponSlot,id,an,fi,!!(act&&act._facingLeft));
return m?{x:px+sc*(m.x-200),y:py+sc*(m.y-515)}:null;};
try{console.log('[puppet] rig '+R.version+' · '+R.anims.length+' anims · adapters installed');}catch(e){}
})();

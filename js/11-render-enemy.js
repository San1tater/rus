'use strict';

/* 人形敵人：唯一 rig 路徑；資料部件原樣保留 */

var _EQI={human_raider:{head:['ssh68','sssh94','kolpak'],top:['paca','6b23','zhuk3'],primary:['aks74u','aks74un','ak74','akms','akm','akmn']},human_raider_vet:{head:['6b47','6b47m','kiver','maska'],top:['6b13','6b13m','6b231','6b232'],primary:['ak74m','ak103','ak104','ak105','ak12']},human_rocket_gunner:{head:['6b47','6b47m'],top:['6b23','6b231'],primary:['ak74','akms','akmn']}};

function _pickR(a){return(!a||!a.length)?null:a[Math.floor(Math.random()*a.length)];}

function _getRandomEquipForEnemy(id){var p=_EQI[id];if(!p)return null;return{head:_pickR(p.head),top:_pickR(p.top),primary:_pickR(p.primary)};}

function _isMeleeWeapon(id){if(!id)return false;if(typeof WEAPONS!=='undefined'&&WEAPONS[id]){if(WEAPONS[id].slot==='melee')return true;if(WEAPONS[id].type==='刺刀')return true;}return id==='6kh2'||id==='6kh5'||id==='kukri';}

/*PM-ANCHOR*/
function _resolveEnemyDef(id){if(typeof HUMAN_ENEMY_DATA==='undefined')return null;
if(HUMAN_ENEMY_DATA[id])return{def:HUMAN_ENEMY_DATA[id],resolvedId:id};
var k='human_'+id;if(HUMAN_ENEMY_DATA[k])return{def:HUMAN_ENEMY_DATA[k],resolvedId:k};return null;}
function _resolveEnemyAnims(){if(typeof GAME_ANIMS==='undefined')return null;
if(!window._pmAS){var o={},k;for(k in GAME_ANIMS){var a=GAME_ANIMS[k];o[k]={frameCount:a.frameCount,fps:a.fps,loop:a.loop,keys:{}};}
o.death=o.dead||o.idle;window._pmAS=o;}return window._pmAS;}
var _PMC={enemy:{b:'#8b2a2a',l:'#3a1010'},farmer:{b:'#5a9a48',l:'#3a6a2e'},guard:{b:'#5088bb',l:'#2e4a6a'},foreman:{b:'#e0a830',l:'#d8d0c0'}};
function _pmCol(t){var c=_PMC[t];if(!c)return null;return{torso:c.b,front_upper_arm:c.b,front_forearm:c.b,back_upper_arm:c.b,back_forearm:c.b,right_thigh:c.l,right_shin:c.l,left_thigh:c.l,left_shin:c.l};}
function _pmAmmo(id){return typeof AMMO!=='undefined'&&!!AMMO[id];}
function _pmWeapon(en){if(!en)return null;var w=null;
if(typeof _enemyActiveWeapon==='function'){try{w=_enemyActiveWeapon(en);}catch(e){}}
if(!w){var ex=en._exhaustedWeapons||{};w=en._activeWeapon||(en.primaryWeapon&&!ex[en.primaryWeapon.id]&&en.primaryWeapon)||(en.secondaryWeapon&&!ex[en.secondaryWeapon.id]&&en.secondaryWeapon)||(en.melee&&!ex[en.melee.id]&&en.melee)||null;}
if(!w||!w.id)return null;
var sl=(en.primaryWeapon&&en.primaryWeapon.id===w.id)?'primary':((en.secondaryWeapon&&en.secondaryWeapon.id===w.id)?'secondary':'melee');return{id:w.id,slot:sl};}
function _pmEquip(en,id){if(!en._corpseEquip){var pool=_EQI[id]||_EQI.human_raider;var aw=_pmWeapon(en);
var eq={head:en.helmet||_pickR(pool.head),top:en.body||_pickR(pool.top)};
if(aw)eq[aw.slot]=aw.id;else eq.primary=_pickR(pool.primary);
en._corpseEquip=eq;en._corpseSlot=aw?aw.slot:'primary';}return en._corpseEquip;}
/* 屍體畫布＝完整動畫窗格，錨點 0.98 與活體同線；低于窗格底自然裁切 */
function _renderEnemyCorpseCanvas(enemy,fxH){var R=window.PuppetRig;
if(!R||!enemy||!(fxH>0))return null;var eid=enemy.eid||enemy.id;if(!eid)return null;
var r=_resolveEnemyDef(eid);var eq=_pmEquip(enemy,r?r.resolvedId:'human_raider');
var slot=enemy._corpseSlot||'primary',id=eq[slot]||null;
var dW=fxH*2.0,dH=fxH,ax=dW/2,ay=dH*0.98;
var cvs=document.createElement('canvas');
cvs.width=Math.max(2,Math.round(dW*2));cvs.height=Math.max(2,Math.round(dH*2));
var g=cvs.getContext('2d');g.setTransform(2,0,0,2,0,0);
R.draw(g,ax,ay,(fxH*CHAR_HEIGHT_FACTOR)/386,{anim:'dead',frame:9999,flip:true,slot:slot,weaponId:id,head:eq.head,top:eq.top,colors:_pmCol('enemy'),ammoBox:_pmAmmo(id)});
return{canvas:cvs,drawW:dW,drawH:dH,footX:ax,footY:ay};}
function _pmCorpseAt(ctx,x,y,sc,eid,fi,unit){var R=window.PuppetRig;if(!R||!ctx||!(sc>0))return;
var r=_resolveEnemyDef(eid),eq=null,slot=null,id=null;
if(unit){var aw=_pmWeapon(unit);eq={head:unit.helmet||null,top:unit.body||null};if(aw){eq[aw.slot]=aw.id;slot=aw.slot;id=aw.id;}}
if(!id){if(!window._pmReq)window._pmReq={};var key=r?r.resolvedId:'human_raider';
if(!window._pmReq[key])window._pmReq[key]=_getRandomEquipForEnemy(key)||{head:'ssh68',top:'6b231',primary:'ak74'};
eq=window._pmReq[key];slot=eq.primary?'primary':(eq.secondary?'secondary':(eq.melee?'melee':null));id=slot?eq[slot]:null;}
R.draw(ctx,x,y,sc,{anim:'dead',frame:fi==null?9999:fi,flip:true,slot:slot,weaponId:id,head:eq.head,top:eq.top,colors:_pmCol('enemy'),ammoBox:_pmAmmo(id)});}
function _drawHumanCorpse(ctx,id,s,ox,oy,def,anim,fi,eqD,isDeath){var R=window.PuppetRig;if(!R||!ctx)return;
var cw=(def&&def.canvas)?def.canvas.w:400,ch=(def&&def.canvas)?def.canvas.h:500;
if(!isDeath){var eq=eqD||{},sl=eq.primary?'primary':(eq.secondary?'secondary':(eq.melee?'melee':null));
R.draw(ctx,ox+cw*s/2,oy+ch*s,s,{anim:'idle',frame:0,flip:true,slot:sl,weaponId:sl?eq[sl]:null,head:eq.head,top:eq.top,colors:_pmCol('enemy')});return;}
_pmCorpseAt(ctx,ox+cw*s/2,oy+ch*s,s,id,fi,eqD);}
function _measureDeathBBox(def,anim,frame){var R=window.PuppetRig;if(!R)return null;
var b=R.bbox('dead',frame==null?9999:frame,true,null,{});if(!b)return null;
return{minX:b.x0,minY:b.y0,maxX:b.x1,maxY:b.y1,w:b.w,h:b.h};}
function _measureLayerMaxY(def,anim,frame,lid){var R=window.PuppetRig;if(!R)return null;
var k=R.B.ix[lid];if(k==null)return null;var q=R.fr('L','dead',frame==null?9999:frame),d=q.d.L[k],m=R.lm(d);
return Math.max(R.P(m,0,0).y,R.P(m,d[3],0).y,R.P(m,0,d[4]).y,R.P(m,d[3],d[4]).y);}

window._EQI=_EQI;window._pickR=_pickR;window._isMeleeWeapon=_isMeleeWeapon;
window._getRandomEquipForEnemy=_getRandomEquipForEnemy;window._rev506_getRandomEquip=_getRandomEquipForEnemy;
window._resolveEnemyDef=_resolveEnemyDef;window.resolveEnemyDef=_resolveEnemyDef;
window._resolveEnemyAnims=_resolveEnemyAnims;window._measureDeathBBox=_measureDeathBBox;window._measureLayerMaxY=_measureLayerMaxY;
window._pmCol=_pmCol;window._pmWeapon=_pmWeapon;window._pmCorpseAt=_pmCorpseAt;
window._renderEnemyCorpseCanvas=_renderEnemyCorpseCanvas;
window._drawHumanCorpse=_drawHumanCorpse;window._rev506_drawHumanCorpse=_drawHumanCorpse;

(function(){var ids={},k;for(k in _EQI){var p=_EQI[k];if(p.head)p.head.forEach(function(x){ids[x]=1;});if(p.top)p.top.forEach(function(x){ids[x]=1;});if(p.primary)p.primary.forEach(function(x){ids[x]=1;});}setTimeout(function(){for(var id in ids){try{getHeroImg(window.getItemIconPath(id));}catch(e){}}},200);})();

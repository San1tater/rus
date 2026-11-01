/* ===== 09-enemy-data.js ===== v17.5 */
(function(){
"use strict";
function _baseLayers(){ return [
{id:"right_leg",name:"右腿",x:0.4,y:0.562,w:0.13,h:0.42,color:"#2a2a2a",pivot:{x:0.5,y:0.05},z:18},
{id:"torso",name:"躯干",x:0.5,y:0.232,w:0.3,h:0.42,color:"#4a6741",pivot:{x:0.5,y:0.1},z:30},
{id:"head",name:"头",x:0.47,y:0.182,w:0.2,h:0.17,color:"#c89870",pivot:{x:0.5,y:0.92},z:45},
{id:"face",name:"面部",x:0.43,y:0.192,w:0.14,h:0.13,color:"#b88860",pivot:{x:0.5,y:0.92},z:48},
{id:"left_leg",name:"左腿",x:0.56,y:0.582,w:0.14,h:0.44,color:"#3a3a3a",pivot:{x:0.5,y:0.05},z:52},
{id:"back_arm",name:"后臂",x:0.2,y:0.322,w:0.11,h:0.1,color:"#3d3020",pivot:{x:0.5,y:0.5},z:55},
{id:"front_arm",name:"前臂",x:0.73,y:0.342,w:0.4,h:0.08,color:"#5a4a35",pivot:{x:0.95,y:0.5},z:62}
];}
function _baseAnims(){ return {
idle:{frameCount:4,fps:4,loop:true,rootPivot:{x:0.5,y:0.95},rootRot:[0,0,0,0],rootDy:[0,-0.008,0,0.008],keys:{right_leg:[{rot:0},{rot:1.5},{rot:0},{rot:-1.5}],left_leg:[{rot:0},{rot:-1.5},{rot:0},{rot:1.5}]}},
attack:{frameCount:4,fps:12,loop:false,rootPivot:{x:0.5,y:0.95},rootRot:[0,0,0,0],rootDy:[0,0,0,0],keys:{right_leg:[{rot:0},{rot:2},{rot:3.5},{rot:0}],torso:[{rot:0},{rot:3},{rot:1.5},{rot:0}],head:[{rot:0},{rot:2},{rot:1},{rot:0}],face:[{rot:0},{rot:2},{rot:1},{rot:0}],left_leg:[{rot:0},{rot:-1},{rot:-1.75},{rot:0}],back_arm:[{rot:0},{rot:2,dx:-1},{rot:1,dx:-0.5},{rot:0}],front_arm:[{rot:0},{rot:6,dx:-3},{rot:3,dx:-1.5},{rot:0}]}},
death:{frameCount:4,fps:8,loop:false,rootPivot:{x:0.48,y:1},rootRot:[0,22,53,90],rootDy:[0,-0.0326,-0.0803,-0.136],keys:{right_leg:[{rot:0},{rot:5},{rot:3},{rot:0}],left_leg:[{rot:0},{rot:-5},{rot:-3},{rot:0}]}}
};}
var D = window.HUMAN_ENEMY_DATA = window.HUMAN_ENEMY_DATA || {};
D.human_raider={kind:"human",canvas:{w:400,h:500},layers:_baseLayers(),enemyType:"human_gun",colors:{right_leg:"#3a1a1a",left_leg:"#3a1a1a",torso:"#7a2828",head:"#a07878",face:"#906868",back_arm:"#4a2020",front_arm:"#5a2828"},anims:_baseAnims()};
D.human_raider_vet={kind:"human",canvas:{w:400,h:500},layers:_baseLayers(),enemyType:"human_gun",colors:{right_leg:"#2a0a0a",left_leg:"#2a0a0a",torso:"#5a1010",head:"#805858",face:"#704848",back_arm:"#3a0808",front_arm:"#4a1010"},anims:_baseAnims()};
var _rl=_baseLayers(); _rl.push({id:"rpg_back",name:"RPG筒",x:0.32,y:0.24,w:0.55,h:0.06,color:"#3a3a3a",pivot:{x:0.5,y:0.5},z:14,rot:-20});
D.human_rocket_gunner={kind:"human",canvas:{w:400,h:500},layers:_rl,enemyType:"human_gun",colors:{right_leg:"#2a1a0a",left_leg:"#2a1a0a",torso:"#4a3a1a",head:"#a08868",face:"#907850",back_arm:"#3a2a10",front_arm:"#4a3a1a"},anims:_baseAnims()};
window.BEAST_LAYERS = {}; window.BEAST_ANIMS = {};
window._drawEnemyAt = function(ctx, id, ox, oy, s, animName, fi){
  var def = D[id]; if(!def) return false;
  var anims = def.anims, anim = anims[animName] || anims.idle; if(!anim) return false;
  fi = ((fi||0)%anim.frameCount+anim.frameCount)%anim.frameCount;
  var cw=def.canvas.w, ch=def.canvas.h;
  var rRot=(anim.rootRot&&anim.rootRot[fi])||0, rDy=(anim.rootDy&&anim.rootDy[fi])||0;
  var rP=anim.rootPivot||{x:0.5,y:0.95};
  ctx.save(); ctx.translate(ox,oy); ctx.scale(s,s); ctx.translate(0,ch*rDy);
  ctx.translate(cw*rP.x, ch*rP.y); ctx.rotate(rRot*Math.PI/180); ctx.translate(-cw*rP.x, -ch*rP.y);
  var Ls = def.layers.slice().sort(function(a,b){return a.z-b.z;});
  for(var i=0;i<Ls.length;i++){ var L=Ls[i]; var k=(anim.keys&&anim.keys[L.id]&&anim.keys[L.id][fi])||{rot:0,dx:0,dy:0};
    var lw=cw*L.w, lh=ch*L.h, cx=cw*L.x+cw*(k.dx||0)*0.01, cy=ch*L.y+ch*(k.dy||0)*0.01;
    var px=lw*L.pivot.x, py=lh*L.pivot.y, rot=((L.rot||0)+(k.rot||0))*Math.PI/180;
    var col=(def.colors&&def.colors[L.id])||L.color||"#888";
    ctx.save(); ctx.translate(cx,cy); ctx.rotate(rot); ctx.translate(-px,-py);
    ctx.fillStyle=col; ctx.fillRect(0,0,lw,lh);
    ctx.strokeStyle="rgba(0,0,0,0.65)"; ctx.lineWidth=2; ctx.strokeRect(1,1,lw-2,lh-2);
    ctx.restore();
  }
  ctx.restore(); return true;
};
})();

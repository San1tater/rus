/* v17.5 hotfix batch applied */

'use strict';

const ENEMIES={
  raider:{name:'掠奪者',hp:175,dmg:22,pen:3,armorLevel:3},
  raider_vet:{name:'掠奪者老兵',hp:175,dmg:38,pen:4,armorLevel:4},
  rocket_gunner:{name:'火箭筒手',hp:175,dmg:30,pen:4,armorLevel:3}
};

const PISTOL_POOL = ['pm','pb','mp443','aps'];
const ENEMY_WEAPON_POOLS = {
  raider:{t1:['pp19','aks74u','aks74un','ak74','ak74n','ak74m','ak105','akm','akms','akmn','mp133','mp153','mp155','saiga12','toz106','pm','mp443'],t2:['ak103','ak104','rpk16','rpd','rpdn','ak12']},
  raider_vet:{t1:['ak74m','ak103','ak104','ak105','ak12','rpk16','svd','vss','asval'],t2:['pkm','pkp','svd','sv98','rpk16']},
  rocket_gunner:{t1:['pp19','aks74u','aks74un','ak74','ak105','mp133','toz106'],t2:[]}
};

function rollEnemyRarity(t){
  var r=Math.random();
  if(t===1){
    if(r<0.40)return '破舊';
    if(r<0.72)return '一般';
    if(r<0.90)return '庫存';
    if(r<0.99)return '精品';
    return '傳奇';
  }
  if(r<0.05)return '破舊';
  if(r<0.20)return '一般';
  if(r<0.50)return '庫存';
  if(r<0.85)return '精品';
  return '傳奇';
}

function pickEnemyWeapon(e,r,t){
  var p=ENEMY_WEAPON_POOLS[e]||ENEMY_WEAPON_POOLS.raider;
  /* rev-fix-enemy-weapon-tier: 高 tier 提高 t2 概率（0.5 → 0.65 → 0.80 → 0.95 → 1.10） */
  var _tier = t || 1;
  var _t2Chance = 0.5 + (_tier - 1) * 0.15;
  var w=(RARITY_ORDER.indexOf(r)>=RARITY_ORDER.indexOf('精品'))&&Math.random()<_t2Chance;
  var a=(w&&p.t2.length)?p.t2:p.t1;
  return a.length?pick(a):pick(PISTOL_POOL);
}

function _getAmmoDmg(ammoId){
  var d=AMMO[ammoId];
  return d ? d.dmg : 0;
}
function _getAmmoPenMM(ammoId){
  var d=AMMO[ammoId];
  return d ? (d.penMM||0) : 0;
}
function _getAmmoRarity(ammoId){
  var d=AMMO[ammoId];
  return d ? d.rarity : '一般';
}
function _pickArmorBySlot(slot){
  var keys=[];
  for(var k in ARMOR){ if(ARMOR[k].slot===slot) keys.push(k); }
  return keys.length ? pick(keys) : null;
}

function generateEnemyInstance(e,t){
  var b=ENEMIES[e];
  if(!b) return null;
  var rarity = rollEnemyRarity(t||1);
  var m = RARITY_MULT[rarity] || 1;
  var hp = Math.max(1, Math.round(b.hp * m));

  var helmet = _pickArmorBySlot('head');
  var body = _pickArmorBySlot('top');

  var armorTotal = 0;
  var armorLevel = 0;
  if(helmet){
    armorTotal += equipArmorValue(helmet, rarity);
    var _hl = getHelmetTotalLevel(helmet);
    if(_hl > armorLevel) armorLevel = _hl;
  }
  if(body){
    armorTotal += equipArmorValue(body, rarity);
    var _bl = (ARMOR[body] && ARMOR[body].level) || 0;
    if(_bl > armorLevel) armorLevel = _bl;
  }

  var primaryWeapon = null;
  var secondaryWeapon = null;
  var grenade = null;
  var hasRPG = false;
  var rpgAmmo = 0;
  var rpgRarity = null;
  var rpgPenMM = 0;
  var rpgDmg = 0;

  /* rev-fix-enemy-melee-all: 所有敵人（含 rocket_gunner）都配近戰武器 */
  var _meleeId = pick(['6kh2','6kh5','kukri']);
  var _meleeDef = WEAPONS[_meleeId];
  var melee = _meleeDef ? { id: _meleeId, rarity: '一般' } : null;

  if(e === 'rocket_gunner'){
    hasRPG = true;
    rpgAmmo = 1;
    rpgRarity = rarity;
    rpgPenMM = 600;
    rpgDmg = 100 * (RARITY_MULT[rarity] || 1);

    var w = pickEnemyWeapon(e, rarity, t);
    var wd = WEAPONS[w];
    if(wd){
      var ai = getAmmoByRarity(wd.cal, rarity) || getDefaultAmmo(wd.cal);
      primaryWeapon = {
        id: w, rarity: rarity, ammoId: ai,
        ammoInMag: wd.mag, magsLeft: 2, magSize: wd.mag,
        dmg: _getAmmoDmg(ai), penMM: _getAmmoPenMM(ai)
      };
    }
  } else {
    var w2 = pickEnemyWeapon(e, rarity, t);
    var wd2 = WEAPONS[w2];
    /* rev-fix-enemy-3mags: 枪上 1 个弹匣 + 身上 2 个 */
    if(wd2){
      var _magSize2 = wd2.mag;
      var ai2 = getAmmoByRarity(wd2.cal, rarity) || getDefaultAmmo(wd2.cal);
      if(wd2.slot === 'secondary'){
        secondaryWeapon = {
          id: w2, rarity: rarity, ammoId: ai2,
          ammoInMag: _magSize2, magsLeft: 2, magSize: _magSize2,
          dmg: _getAmmoDmg(ai2), penMM: _getAmmoPenMM(ai2)
        };
      } else {
        primaryWeapon = {
          id: w2, rarity: rarity, ammoId: ai2,
          ammoInMag: _magSize2, magsLeft: 2, magSize: _magSize2,
          dmg: _getAmmoDmg(ai2), penMM: _getAmmoPenMM(ai2)
        };
        if(Math.random() < 0.4){
          var pi = pick(PISTOL_POOL);
          var pd = WEAPONS[pi];
          if(pd){
            var _magSizeP = pd.mag;
            var pai = getAmmoByRarity(pd.cal, rarity) || getDefaultAmmo(pd.cal);
            secondaryWeapon = {
              id: pi, rarity: rarity, ammoId: pai,
              ammoInMag: _magSizeP, magsLeft: 2, magSize: _magSizeP,
              dmg: _getAmmoDmg(pai), penMM: _getAmmoPenMM(pai)
            };
          }
        }
      }
    }
  }

  if(Math.random() < 0.15){
    var gid = pick(['f1','rgd5','rgo','rgn']);
    var gRar = rollRarity();
    grenade = { id: gid, count: 1, rarity: gRar };
  }

  return {
    eid: e,
    rarity: rarity,
    hp: hp, maxHp: hp,
    armor: armorTotal, maxArmor: armorTotal,
    armorLevel: armorLevel,
    primaryWeapon: primaryWeapon,
    secondaryWeapon: secondaryWeapon,
    melee: melee,
    grenade: grenade,
    hasRPG: hasRPG,
    rpgAmmo: rpgAmmo,
    rpgRarity: rpgRarity,
    rpgPenMM: rpgPenMM,
    rpgDmg: rpgDmg,
    helmet: helmet,
    helmetRarity: rarity,
    body: body,
    bodyRarity: rarity,
    detectableR: ENEMY_DETECTABLE_R[rarity] || 80,
    hitBase: ENEMY_HIT_BASE,
    worldX: 0
  };
}

function rollEnemyLoot(en){
  if(!en) return [];
  var L = [];
  /* rev-fix-loot-random: 掉落加入隨機性，稀有度越高裝備越容易被打壞 */
  var rar = en.rarity || '一般';
  var rarIdx = RARITY_ORDER.indexOf(rar);
  var baseChance = rarIdx >= 0 ? Math.max(0.55, 0.85 - rarIdx * 0.08) : 0.85;

  if(en.primaryWeapon && Math.random() < baseChance * 0.90){
    L.push({id: en.primaryWeapon.id, rarity: en.primaryWeapon.rarity, count: 1});
    if(en.primaryWeapon.ammoId && Math.random() < 0.60){
      L.push({id: en.primaryWeapon.ammoId, rarity: _getAmmoRarity(en.primaryWeapon.ammoId), count: rndInt(15, 35)});
    }
  }
  if(en.secondaryWeapon && Math.random() < baseChance * 0.60){
    L.push({id: en.secondaryWeapon.id, rarity: en.secondaryWeapon.rarity, count: 1});
    if(en.secondaryWeapon.ammoId && Math.random() < 0.60){
      L.push({id: en.secondaryWeapon.ammoId, rarity: _getAmmoRarity(en.secondaryWeapon.ammoId), count: rndInt(10, 25)});
    }
  }
  if(en.helmet && Math.random() < baseChance * 0.40){
    L.push({id: en.helmet, rarity: en.helmetRarity || '一般', count: 1});
  }
  if(en.body && Math.random() < baseChance * 0.35){
    L.push({id: en.body, rarity: en.bodyRarity || '一般', count: 1});
  }
  if(en.grenade && en.grenade.count > 0 && Math.random() < 0.70){
    L.push({id: en.grenade.id, rarity: en.grenade.rarity || '一般', count: 1});
  }
  return L;
}

(function(){
  'use strict';

  function _baseLayers(){
    return [
      {id:"right_leg",name:"右腿",x:0.4,y:0.562,w:0.13,h:0.42,color:"#2a2a2a",pivot:{x:0.5,y:0.05},z:18},
      {id:"torso",name:"躯干",x:0.5,y:0.232,w:0.3,h:0.42,color:"#4a6741",pivot:{x:0.5,y:0.1},z:30},
      {id:"head",name:"头",x:0.47,y:0.182,w:0.2,h:0.17,color:"#c89870",pivot:{x:0.5,y:0.92},z:45},
      {id:"face",name:"面部",x:0.43,y:0.192,w:0.14,h:0.13,color:"#b88860",pivot:{x:0.5,y:0.92},z:48},
      {id:"left_leg",name:"左腿",x:0.56,y:0.582,w:0.14,h:0.44,color:"#3a3a3a",pivot:{x:0.5,y:0.05},z:52},
      {id:"back_arm",name:"后臂",x:0.2,y:0.322,w:0.11,h:0.1,color:"#3d3020",pivot:{x:0.5,y:0.5},z:55},
      {id:"front_arm",name:"前臂",x:0.73,y:0.342,w:0.4,h:0.08,color:"#5a4a35",pivot:{x:0.95,y:0.5},z:62}
    ];
  }

  function _baseAnims(){
    return {
      idle:{
        frameCount:4,fps:4,loop:true,
        rootPivot:{x:0.5,y:0.95},rootRot:[0,0,0,0],rootDy:[0,-0.008,0,0.008],
        keys:{
          right_leg:[{rot:0},{rot:1.5},{rot:0},{rot:-1.5}],
          left_leg:[{rot:0},{rot:-1.5},{rot:0},{rot:1.5}]
        }
      },
      walk:{
        frameCount:4,fps:8,loop:true,
        rootPivot:{x:0.5,y:0.95},rootRot:[0,0,0,0],rootDy:[0,-0.01,0,-0.01],
        keys:{
          right_leg:[{rot:10},{rot:0},{rot:-10},{rot:0}],
          left_leg:[{rot:-10},{rot:0},{rot:10},{rot:0}]
        }
      },
      attack:{
        frameCount:4,fps:12,loop:false,
        rootPivot:{x:0.5,y:0.95},rootRot:[0,0,0,0],rootDy:[0,0,0,0],
        keys:{
          right_leg:[{rot:0},{rot:2},{rot:3.5},{rot:0}],
          torso:[{rot:0},{rot:3},{rot:1.5},{rot:0}],
          head:[{rot:0},{rot:2},{rot:1},{rot:0}],
          face:[{rot:0},{rot:2},{rot:1},{rot:0}],
          left_leg:[{rot:0},{rot:-1},{rot:-1.75},{rot:0}],
          back_arm:[{rot:0},{rot:2,dx:-1},{rot:1,dx:-0.5},{rot:0}],
          front_arm:[{rot:0},{rot:6,dx:-3},{rot:3,dx:-1.5},{rot:0}]
        }
      },
      hurt:{
        frameCount:4,fps:12,loop:false,
        rootPivot:{x:0.5,y:0.95},rootRot:[0,0,0,0],rootDy:[0,0,0,0],
        keys:{
          torso:[{rot:0},{rot:-3},{rot:-1.5},{rot:0}],
          head:[{rot:0},{rot:-3},{rot:-1.5},{rot:0}],
          face:[{rot:0},{rot:-3},{rot:-1.5},{rot:0}]
        }
      },
      death:{
        frameCount:4,fps:8,loop:false,
        rootPivot:{x:0.48,y:1},rootRot:[0,22,53,90],rootDy:[0,-0.0326,-0.0803,-0.136],
        keys:{
          right_leg:[{rot:0},{rot:5},{rot:3},{rot:0}],
          left_leg:[{rot:0},{rot:-5},{rot:-3},{rot:0}]
        }
      }
    };
  }

  var D = window.HUMAN_ENEMY_DATA = window.HUMAN_ENEMY_DATA || {};
  D.human_raider={
    kind:"human",canvas:{w:400,h:500},layers:_baseLayers(),enemyType:"human_gun",
    colors:{right_leg:"#3a1a1a",left_leg:"#3a1a1a",torso:"#7a2828",head:"#a07878",face:"#906868",back_arm:"#4a2020",front_arm:"#5a2828"},
    anims:_baseAnims()
  };
  D.human_raider_vet={
    kind:"human",canvas:{w:400,h:500},layers:_baseLayers(),enemyType:"human_gun",
    colors:{right_leg:"#2a0a0a",left_leg:"#2a0a0a",torso:"#5a1010",head:"#805858",face:"#704848",back_arm:"#3a0808",front_arm:"#4a1010"},
    anims:_baseAnims()
  };
  D.human_rocket_gunner={
    kind:"human",canvas:{w:400,h:500},layers:_baseLayers(),enemyType:"human_gun",
    colors:{right_leg:"#2a1a0a",left_leg:"#2a1a0a",torso:"#4a3a1a",head:"#a08868",face:"#907850",back_arm:"#3a2a10",front_arm:"#4a3a1a"},
    anims:_baseAnims()
  };

  window.BEAST_LAYERS = window.BEAST_LAYERS || {};
  window.BEAST_ANIMS = window.BEAST_ANIMS || {};

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
    for(var i=0;i<Ls.length;i++){
      var L=Ls[i]; var k=(anim.keys&&anim.keys[L.id]&&anim.keys[L.id][fi])||{rot:0,dx:0,dy:0};
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

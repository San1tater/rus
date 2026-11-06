
'use strict';

const BOSSES={
  factory_king:{name:'鐵匠',region:'廢棄工廠',hp:10000,armor:2000,armorLevel:4,dmg:125,penMM:12,critRate:0.10,critMult:1.5,seal:'seal_factory',unlock:'廢棄實驗室',drops:['zhuk6a','svd','altyn','rpk16','maska','sssh94']},
  lab_queen:{name:'醫師',region:'廢棄實驗室',hp:25000,armor:6000,armorLevel:5,dmg:225,penMM:18,critRate:0.12,critMult:1.6,seal:'seal_lab',unlock:'郊區公路',drops:['altyn','zsh12m','rpk16','asval','maska','6b232','sssh94']},
  road_tyrant:{name:'鉗子',region:'郊區公路',hp:50000,armor:12500,armorLevel:6,dmg:350,penMM:24,critRate:0.15,critMult:1.8,seal:'seal_road',unlock:'輻射沼澤',drops:['zhuk6a','svd','pkp','rpk16','belleville','zhuk3','redutm']},
  swamp_hydra:{name:'蝮蛇',region:'輻射沼澤',hp:90000,armor:20000,armorLevel:6,dmg:500,penMM:30,critRate:0.18,critMult:2.0,seal:'seal_swamp',unlock:'廢土核心',drops:['altyn','zsh12m','svd','pkp','6b43','zhuk6a','maska']},
  core_omega:{name:'熔爐',region:'廢土核心',hp:160000,armor:120000,armorLevel:7,dmg:650,penMM:36,critRate:0.20,critMult:2.2,seal:'seal_core',unlock:null,unlockTier2:'廢棄工廠',drops:['pkm','pkp','ash12','svd','altyn','zsh12m','6b43','defender2','zhuk6a','belleville','6b45','redutm','rgn']},
  factory_king_ii:{name:'鐵匠 II',region:'廢棄工廠',tier:2,hp:25000,armor:8000,armorLevel:5,dmg:160,penMM:18,critRate:0.12,critMult:1.6,seal:'seal_factory_ii',unlock:'廢棄實驗室',drops:['zhuk6a','svd','altyn','rpk16','maska','6b43','redutm']},
  lab_queen_ii:{name:'醫師 II',region:'廢棄實驗室',tier:2,hp:50000,armor:15000,armorLevel:6,dmg:280,penMM:24,critRate:0.14,critMult:1.7,seal:'seal_lab_ii',unlock:'郊區公路',drops:['altyn','zsh12m','rpk16','asval','maska','6b232','zhuk3','6b45']},
  road_tyrant_ii:{name:'鉗子 II',region:'郊區公路',tier:2,hp:90000,armor:25000,armorLevel:6,dmg:420,penMM:30,critRate:0.16,critMult:1.9,seal:'seal_road_ii',unlock:'輻射沼澤',drops:['zhuk6a','svd','pkp','rpk16','belleville','zhuk3','6b43','6b45']},
  swamp_hydra_ii:{name:'蝮蛇 II',region:'輻射沼澤',tier:2,hp:160000,armor:40000,armorLevel:7,dmg:560,penMM:30,critRate:0.18,critMult:2.0,seal:'seal_swamp_ii',unlock:'廢土核心',drops:['altyn','zsh12m','svd','pkp','6b43','zhuk6a','maska','defender2','6b45','redutm']},
  core_omega_ii:{name:'熔爐 II',region:'廢土核心',tier:2,hp:280000,armor:240000,armorLevel:7,dmg:750,penMM:36,critRate:0.22,critMult:2.4,seal:'seal_core_ii',unlock:null,drops:['pkm','pkp','ash12','svd','altyn','zsh12m','6b43','defender2','zhuk6a','belleville','6b45','redutm','rgn']},
};
for(const bid in BOSSES){ if(!BOSSES[bid].tier) BOSSES[bid].tier = 1; }

const BOSS_WEAKPOINTS = {
  factory_king: ['leg_r', 'leg_l'],
  lab_queen:    ['abdomen'],
  road_tyrant:  [],
  swamp_hydra:  [],
  core_omega:   ['ring_t','ring_b','ring_l','ring_r']
};

const BOSS_PHASES = {
  factory_king: [
    { hpPct:1.00, dmgMult:1.0,  unlockSkills:[] },
    { hpPct:0.75, dmgMult:1.15, unlockSkills:[] },
    { hpPct:0.50, dmgMult:1.3,  unlockSkills:['dash'] },
    { hpPct:0.25, dmgMult:1.5,  unlockSkills:[] }
  ],
  lab_queen: [
    { hpPct:1.00, dmgMult:1.0,  unlockSkills:[] },
    { hpPct:0.75, dmgMult:1.15, unlockSkills:[] },
    { hpPct:0.50, dmgMult:1.3,  unlockSkills:['dash'] },
    { hpPct:0.25, dmgMult:1.6,  unlockSkills:[] }
  ],
  road_tyrant: [
    { hpPct:1.00, dmgMult:1.0,  unlockSkills:[] },
    { hpPct:0.75, dmgMult:1.15, unlockSkills:[] },
    { hpPct:0.50, dmgMult:1.3,  unlockSkills:['charge'] },
    { hpPct:0.25, dmgMult:1.5,  unlockSkills:[] }
  ],
  swamp_hydra: [
    { hpPct:1.00, dmgMult:1.0,  unlockSkills:[] },
    { hpPct:0.75, dmgMult:1.15, unlockSkills:[] },
    { hpPct:0.50, dmgMult:1.3,  unlockSkills:['breath'] },
    { hpPct:0.25, dmgMult:1.6,  unlockSkills:[] }
  ],
  core_omega: [
    { hpPct:1.00, dmgMult:1.0,  unlockSkills:[] },
    { hpPct:0.75, dmgMult:1.15, unlockSkills:['laser_spray'] },
    { hpPct:0.50, dmgMult:1.35, unlockSkills:['laser_charge'] },
    { hpPct:0.25, dmgMult:1.7,  unlockSkills:[] }
  ]
};

const BOSS_SKILLS = {
  factory_king: [
    { id:'smash', name:'碎地重錘', type:'aoe', cd:10, range:0.20,
      dmg:45, penMM:12, anim:'skill_charge',
      telegraph:1300, hitDelay:1300, totalTime:2000,
      aoe:true, knockback:0.10, telegraphRatio:0.20, unlockPhase:0 },
    { id:'sweep', name:'揮錘掃擊', type:'aoe', cd:16, range:0.30,
      dmg:30, penMM:12, anim:'attack_swipe',
      telegraph:800, hitDelay:800, totalTime:1500,
      aoe:true, knockback:0.12, telegraphRatio:0.30, unlockPhase:0 },
    { id:'dash', name:'突進', type:'dash', cd:14, range:0.65, minRange:0.20,
      dmg:35, penMM:12, contactDmg:20,
      telegraph:800, dashSpeed:0.55, dashDistance:0.35,
      exhaustMs:1500, hitTickMs:250,
      unlockPhase: 1 }
  ],
  lab_queen: [
    { id:'smash', name:'腹部噴酸', type:'aoe', cd:9, range:0.24,
      dmg:55, penMM:18, anim:'skill_charge',
      telegraph:1300, hitDelay:1300, totalTime:2000,
      aoe:true, knockback:0.08, telegraphRatio:0.20, unlockPhase:0,
      projectile:'acid' },
    { id:'sweep', name:'前肢橫掃', type:'aoe', cd:14, range:0.30,
      dmg:38, penMM:18, anim:'attack_swipe',
      telegraph:800, hitDelay:800, totalTime:1500,
      aoe:true, knockback:0.10, telegraphRatio:0.30, unlockPhase:0,
      projectile:'web' },
    { id:'dash', name:'蛛絲突進', type:'dash', cd:15, range:0.68, minRange:0.20,
      dmg:42, penMM:18, contactDmg:25,
      telegraph:800, dashSpeed:0.55, dashDistance:0.38,
      exhaustMs:1500, contactRadius:0.12, hitTickMs:250,
      unlockPhase:1 }
  ],
  road_tyrant: [
    { id:'smash', name:'碎地重錘', type:'aoe', cd:12, range:0.16,
      dmg:60, penMM:24, anim:'skill_charge',
      telegraph:1300, hitDelay:1300, totalTime:2000,
      aoe:true, knockback:0.10, telegraphRatio:0.16, unlockPhase:0 },
    { id:'sweep', name:'盾牌橫掃', type:'aoe', cd:16, range:0.20,
      dmg:45, penMM:24, anim:'attack_swipe',
      telegraph:800, hitDelay:800, totalTime:1500,
      aoe:true, knockback:0.12, telegraphRatio:0.20, unlockPhase:0 },
    { id:'charge', name:'盾牌衝撞', type:'dash', cd:15, range:0.65, minRange:0.20,
      dmg:55, penMM:24, contactDmg:30,
      telegraph:800, dashSpeed:0.55, dashDistance:0.38,
      exhaustMs:1500, hitTickMs:250,
      unlockPhase:1 }
  ],
  swamp_hydra: [
    { id:'spray',  name:'腐蝕噴灑', type:'aoe', cd:8,  range:0.56,
      dmg:55, penMM:30, anim:'skill_charge',
      telegraph:1200, hitDelay:1200, totalTime:2000,
      aoe:true, knockback:0.06, telegraphRatio:0.56, unlockPhase:0,
      projectile:'acid' },
    { id:'burst',  name:'毒沼爆發', type:'aoe', cd:14, range:0.58,
      dmg:75, penMM:30, anim:'skill_charge',
      telegraph:1500, hitDelay:1500, totalTime:2400,
      aoe:true, knockback:0.10, telegraphRatio:0.58, unlockPhase:0 },
    { id:'breath', name:'毒霧吐息', type:'aoe', cd:20, range:0.60,
      dmg:100, penMM:30, anim:'skill_charge',
      telegraph:1800, hitDelay:1800, totalTime:2800,
      aoe:true, knockback:0.08, telegraphRatio:0.60, unlockPhase:1,
      projectile:'acid' }
  ],
  core_omega: [
    { id:'laser_single', name:'單發雷射', type:'aoe', cd:6, range:0.40,
      dmg:50, penMM:36, anim:'laser_single',
      telegraph:900, hitDelay:900, totalTime:1400,
      aoe:true, knockback:0.05, telegraphRatio:0.12, unlockPhase:0, armRequired:'ring_t' },
    { id:'laser_spray', name:'掃射雷射', type:'aoe', cd:12, range:0.35,
      dmg:32, penMM:30, anim:'laser_spray',
      telegraph:1200, hitDelay:1200, totalTime:1800,
      aoe:true, knockback:0.06, telegraphRatio:0.15, unlockPhase:1, armRequired:'ring_r' },
    { id:'laser_charge', name:'蓄力雷射', type:'aoe', cd:20, range:0.50,
      dmg:95, penMM:36, anim:'laser_charge',
      telegraph:2000, hitDelay:2000, totalTime:2800,
      aoe:true, knockback:0.10, telegraphRatio:0.18, unlockPhase:2, armRequired:'ring_b' }
  ]
};

/* rev-fix-getBossSkillList: 補全缺失定義（17a/17b 用 typeof 守衛回退到 BOSS_SKILLS[bossId]） */
function getBossSkillList(bossId){
  return BOSS_SKILLS[bossId] || [];
}

const BOSS_LAYERS = {
  factory_king: {
    canvas: { w:400, h:500 },
    foot:   { x:0.5, y:0.98 },
    layers: [
      { id:'leg_r', z:10, color:'#3a2a1a', pivot:{x:0.5, y:0.05}, x:0.58, y:0.58, w:0.14, h:0.4 },
      { id:'leg_l', z:20, color:'#3a2a1a', pivot:{x:0.5, y:0.05}, x:0.28, y:0.58, w:0.14, h:0.4 },
      { id:'torso', z:30, color:'#5a4a35', pivot:{x:0.5, y:0.1}, x:0.25, y:0.22, w:0.5, h:0.42 },
      { id:'arm_r', z:40, color:'#4a3020', pivot:{x:0.5, y:0.1}, x:0.769, y:0.351, w:0.12, h:0.32 },
      { id:'shoulder_r', z:50, color:'#6a3a1a', pivot:{x:0.5, y:0.5}, x:0.69, y:0.18, w:0.16, h:0.16 },
      { id:'arm_l', z:60, color:'#4a3020', pivot:{x:0.5, y:0.1}, x:0.106, y:0.346, w:0.12, h:0.32 },
      { id:'shoulder_l', z:70, color:'#6a3a1a', pivot:{x:0.5, y:0.5}, x:0.15, y:0.18, w:0.16, h:0.16 },
      { id:'head', z:80, color:'#c89870', pivot:{x:0.5, y:0.9}, x:0.421, y:0.099, w:0.2, h:0.18 },
      { id:'helmet', z:90, color:'#888888', pivot:{x:0.5, y:0.5}, x:-0.006, y:0.136, w:0.2, h:0.2, anchor:{target:'head', rot:true} },
      { id:'eye_1', z:100, color:'#b3dfea', pivot:{x:0.5, y:0.5}, x:-0.006, y:0.298, w:0.2, h:0.2, anchor:{target:'helmet', rot:true} },
      { id:'hammer-h', z:110, color:'#c1870b', pivot:{x:0.5, y:0.5}, x:0.668, y:0.489, w:0.2, h:0.2 },
      { id:'hammer', z:120, color:'#888888', pivot:{x:0.5, y:0.5}, x:0.003, y:-0.19, w:0.2, h:0.2, anchor:{target:'hammer-h', rot:true} }
    ]
  },
  lab_queen: {
    canvas: { w:400, h:500 },
    foot:   { x:0.5, y:1 },
    autoFit: true,
    layers: [
      { id:'leg_b31', z:10, color:'#a8a0b0', pivot:{x:0.5, y:0}, x:-0.642, y:-0.181, w:0.035, h:0.22, anchor:{target:'leg_b3', rot:true} },
      { id:'leg_b3', z:20, color:'#a8a0b0', pivot:{x:0.5, y:0}, x:-0.645, y:-0.357, w:0.035, h:0.22 },
      { id:'leg_b41', z:30, color:'#a8a0b0', pivot:{x:0.5, y:1}, x:-0.458, y:0.147, w:0.05, h:0.16, anchor:{target:'leg_b4', rot:true} },
      { id:'leg_b4', z:40, color:'#a8a0b0', pivot:{x:0.5, y:1}, x:0.438, y:0.583, w:0.05, h:0.16 },
      { id:'leg_b21', z:50, color:'#a8a0b0', pivot:{x:0.5, y:1}, x:0.232, y:1.148, w:0.05, h:0.16 },
      { id:'leg_b2', z:60, color:'#a8a0b0', pivot:{x:0.5, y:0}, x:-0.889, y:-1.101, w:0.035, h:0.22, anchor:{target:'leg_b21', rot:true} },
      { id:'abdomen', z:70, color:'#a898a8', pivot:{x:0.5, y:0.5}, x:0.856, y:0.449, w:0.28, h:0.36 },
      { id:'torso', z:80, color:'#b8b0c0', pivot:{x:0.5, y:0.5}, x:0.59, y:0.456, w:0.28, h:0.28 },
      { id:'leg_b11', z:90, color:'#a8a0b0', pivot:{x:0.5, y:0}, x:-1.027, y:-0.817, w:0.035, h:0.22 },
      { id:'leg_b1', z:100, color:'#a8a0b0', pivot:{x:0.5, y:1}, x:0.5, y:0.096, w:0.05, h:0.16, anchor:{target:'leg_b11', rot:true} },
      { id:'leg_f41', z:110, color:'#a8a0b0', pivot:{x:0.5, y:1}, x:0.441, y:0.58, w:0.05, h:0.16 },
      { id:'leg_f4', z:120, color:'#a8a0b0', pivot:{x:0.5, y:0}, x:-0.284, y:0.276, w:0.035, h:0.22, anchor:{target:'leg_f41', rot:true} },
      { id:'leg_f31', z:130, color:'#a8a0b0', pivot:{x:0.5, y:1}, x:0.441, y:0.58, w:0.05, h:0.16 },
      { id:'leg_f3', z:140, color:'#a8a0b0', pivot:{x:0.5, y:0}, x:-0.632, y:-0.294, w:0.035, h:0.22, anchor:{target:'leg_f31', rot:true} },
      { id:'leg_f21', z:150, color:'#a8a0b0', pivot:{x:0.5, y:1}, x:0.441, y:0.58, w:0.05, h:0.16 },
      { id:'leg_f2', z:160, color:'#a8a0b0', pivot:{x:0.5, y:0}, x:-0.169, y:0.418, w:0.035, h:0.22, anchor:{target:'leg_f21', rot:true} },
      { id:'leg_f11', z:170, color:'#a8a0b0', pivot:{x:0.5, y:1}, x:0.442, y:0.58, w:0.05, h:0.16 },
      { id:'leg_f1', z:180, color:'#a8a0b0', pivot:{x:0.5, y:0}, x:-1.073, y:-0.839, w:0.035, h:0.22, anchor:{target:'leg_f11', rot:true} },
      { id:'head', z:190, color:'#c8c0d0', pivot:{x:0.5, y:0.5}, x:0.35, y:0.41, w:0.18, h:0.18 },
      { id:'mandible', z:200, color:'#6a3040', pivot:{x:0.5, y:0.5}, x:0.213, y:0.519, w:0.1, h:0.06 },
      { id:'eye', z:210, color:'#8a1020', pivot:{x:0.5, y:0.5}, x:0.033, y:-0.054, w:0.1, h:0.06, anchor:{target:'head', rot:true} },
      { id:'eye_2', z:220, color:'#8a1020', pivot:{x:0.5, y:0.5}, x:0.033, y:-0.054, w:0.1, h:0.06, anchor:{target:'head', rot:true} }
    ]
  },
  road_tyrant: {
    canvas: { w:400, h:500 },
    foot:   { x:0.5, y:0.98 },
    autoFit: true,
    layers: [
      { id:'leg_r', z:10, color:'#311877', pivot:{x:0.5, y:0.05}, x:0.62, y:0.585, w:0.15, h:0.4 },
      { id:'leg_l', z:20, color:'#311877', pivot:{x:0.5, y:0.05}, x:0.235, y:0.604, w:0.15, h:0.4 },
      { id:'torso', z:30, color:'#470606', pivot:{x:0.5, y:0.1}, x:0.28, y:0.222, w:0.56, h:0.42 },
      { id:'shoulder_l', z:40, color:'#2d0101', pivot:{x:0.5, y:0.5}, x:0.08, y:0.16, w:0.2, h:0.2 },
      { id:'head', z:50, color:'#c89870', pivot:{x:0.5, y:0.9}, x:0.4, y:0.1, w:0.2, h:0.16 },
      { id:'helmet', z:60, color:'#291915', pivot:{x:0.5, y:0.5}, x:-0.028, y:-0.17, w:0.22, h:0.2, anchor:{target:'head', rot:true} },
      { id:'arm_l', z:70, color:'#311877', pivot:{x:0.5, y:0.1}, x:0.093, y:0.333, w:0.13, h:0.34 },
      { id:'visor', z:80, color:'#c85020', pivot:{x:0.5, y:0.5}, x:0, y:-0.022, w:0.16, h:0.05, anchor:{target:'helmet', rot:true} },
      { id:'shield_3', z:90, color:'#073b0a', pivot:{x:0.5, y:0.5}, x:-0.091, y:-0.209, w:0.2, h:0.2, anchor:{target:'shield', rot:true} },
      { id:'shield_4', z:100, color:'#073b0a', pivot:{x:0.5, y:0.5}, x:-0.091, y:-0.209, w:0.2, h:0.2, anchor:{target:'shield', rot:true} },
      { id:'shield', z:110, color:'#073b0a', pivot:{x:0.5, y:0.5}, x:-0.39, y:-0.151, w:0.2, h:0.5, anchor:{target:'arm_l', rot:true} },
      { id:'shield_2', z:120, color:'#073b0a', pivot:{x:0.5, y:0.5}, x:-0.099, y:0.013, w:0.2, h:0.2, anchor:{target:'shield', rot:true} },
      { id:'hammer-h', z:130, color:'#442f12', pivot:{x:0.5, y:0.5}, x:0.87, y:0.48, w:0.06, h:0.38 },
      { id:'arm_r', z:140, color:'#311877', pivot:{x:0.5, y:0.1}, x:0.78, y:0.34, w:0.13, h:0.34 },
      { id:'shoulder_r', z:150, color:'#2d0101', pivot:{x:0.5, y:0.5}, x:0.72, y:0.16, w:0.2, h:0.2 },
      { id:'hammer', z:160, color:'#ff540a', pivot:{x:0.5, y:0.5}, x:-0.009, y:-0.229, w:0.22, h:0.2, anchor:{target:'hammer-h', rot:true} }
    ]
  },
  swamp_hydra: {
    canvas: { w:500, h:600 },
    foot:   { x:0.5, y:0.98 },
    autoFit: true,
    layers: [
      { id:'swamp', z:10, color:'#101a0a', pivot:{x:0.5, y:1}, x:0.126, y:0.964, w:0.8, h:0.17 },
      { id:'body_2', z:20, color:'#2b4413', pivot:{x:0.5, y:1}, x:-0.298, y:0.012, w:0.3, h:0.35, anchor:{target:'body_1', rot:true} },
      { id:'body_1', z:30, color:'#3d5823', pivot:{x:0.5, y:1}, x:0.354, y:0.83, w:0.3, h:0.35 },
      { id:'body', z:40, color:'#3b482e', pivot:{x:0.5, y:1}, x:-0.213, y:0.012, w:0.3, h:0.35, anchor:{target:'body_1', rot:true} },
      { id:'neck_7', z:50, color:'#6b7c5a', pivot:{x:0.5, y:1}, x:0.74, y:0.48, w:0.04, h:0.16 },
      { id:'neck_6', z:60, color:'#293121', pivot:{x:0.5, y:1}, x:0.64, y:0.46, w:0.04, h:0.15 },
      { id:'neck_5', z:70, color:'#1f3607', pivot:{x:0.5, y:1}, x:0.56, y:0.44, w:0.04, h:0.15 },
      { id:'neck_4', z:80, color:'#47800f', pivot:{x:0.5, y:1}, x:0.46, y:0.42, w:0.04, h:0.14 },
      { id:'neck_3b', z:90, color:'#2e510b', pivot:{x:0.5, y:1}, x:0.061, y:-0.148, w:0.04, h:0.15, anchor:{target:'head_3', rot:true} },
      { id:'neck_3', z:100, color:'#29450d', pivot:{x:0.5, y:1}, x:0.366, y:0.42, w:0.04, h:0.15 },
      { id:'neck_2', z:110, color:'#2b4a0d', pivot:{x:0.5, y:1}, x:0.277, y:0.525, w:0.04, h:0.15 },
      { id:'neck_1', z:120, color:'#30431e', pivot:{x:0.5, y:1}, x:0.211, y:0.511, w:0.04, h:0.16 },
      { id:'head_7', z:130, color:'#5a6a4a', pivot:{x:0.5, y:1}, x:0.126, y:-0.27, w:0.1, h:0.16, anchor:{target:'neck_7', rot:true} },
      { id:'head_6', z:140, color:'#5a6a4a', pivot:{x:0.5, y:1}, x:0.124, y:-0.198, w:0.1, h:0.16, anchor:{target:'neck_6', rot:true} },
      { id:'head_5', z:150, color:'#5a6a4a', pivot:{x:0.5, y:1}, x:0.116, y:-0.316, w:0.1, h:0.17, anchor:{target:'neck_5', rot:true} },
      { id:'head_4', z:160, color:'#5a6a4a', pivot:{x:0.5, y:1}, x:0.023, y:-0.256, w:0.1, h:0.18, anchor:{target:'neck_4', rot:true} },
      { id:'head_3', z:170, color:'#5a6a4a', pivot:{x:0.5, y:1}, x:0.355, y:0.247, w:0.1, h:0.17 },
      { id:'head_2', z:180, color:'#5a6a4a', pivot:{x:0.5, y:1}, x:-0.016, y:-0.239, w:0.1, h:0.16, anchor:{target:'neck_2', rot:true} },
      { id:'mouth_3', z:190, color:'#000000', pivot:{x:0.5, y:0.5}, x:0.341, y:0.324, w:0.2, h:0.2 },
      { id:'head_1', z:200, color:'#5a6a4a', pivot:{x:0.5, y:1}, x:-0.027, y:-0.212, w:0.1, h:0.16, anchor:{target:'neck_1', rot:true} },
      { id:'eye_12', z:210, color:'#00ff40', pivot:{x:0.5, y:0.5}, x:-0.188, y:-0.251, w:0.2, h:0.2, anchor:{target:'eye_7', rot:true} },
      { id:'eye_9', z:220, color:'#00ff40', pivot:{x:0.5, y:0.5}, x:0.113, y:0.002, w:0.2, h:0.2, anchor:{target:'eye_2', rot:true} },
      { id:'eye_10', z:230, color:'#00ff40', pivot:{x:0.5, y:0.5}, x:0.324, y:0.317, w:0.2, h:0.2 },
      { id:'eye_11', z:240, color:'#00ff40', pivot:{x:0.5, y:0.5}, x:0.324, y:0.317, w:0.2, h:0.2 },
      { id:'eye_14', z:250, color:'#00ff40', pivot:{x:0.5, y:0.5}, x:-0.33, y:-0.039, w:0.2, h:0.2, anchor:{target:'eye_8', rot:true} },
      { id:'eye_13', z:260, color:'#00ff40', pivot:{x:0.5, y:0.5}, x:-0.277, y:0.06, w:0.2, h:0.2, anchor:{target:'eye_1', rot:true} },
      { id:'eye_8', z:270, color:'#00ff40', pivot:{x:0.5, y:0.5}, x:0.324, y:0.317, w:0.2, h:0.2 },
      { id:'eye_7', z:280, color:'#00ff40', pivot:{x:0.5, y:0.5}, x:0.326, y:0.318, w:0.2, h:0.2 },
      { id:'eye_6', z:290, color:'#00ff40', pivot:{x:0.5, y:0.5}, x:0.324, y:0.317, w:0.2, h:0.2 },
      { id:'eye_5', z:300, color:'#00ff40', pivot:{x:0.5, y:0.5}, x:0.005, y:-0.217, w:0.2, h:0.2, anchor:{target:'eye_6', rot:true} },
      { id:'eye_4', z:310, color:'#00ff40', pivot:{x:0.5, y:0.5}, x:-0.095, y:-0.02, w:0.2, h:0.2, anchor:{target:'eye_11', rot:true} },
      { id:'eye_3', z:320, color:'#00ff40', pivot:{x:0.5, y:0.5}, x:0.05, y:0.052, w:0.2, h:0.2, anchor:{target:'eye_10', rot:true} },
      { id:'eye_2', z:330, color:'#00ff40', pivot:{x:0.5, y:0.5}, x:0.324, y:0.317, w:0.2, h:0.2 },
      { id:'eye_1', z:340, color:'#00ff40', pivot:{x:0.5, y:0.5}, x:0.324, y:0.317, w:0.2, h:0.2 },
      { id:'mouth_7', z:350, color:'#000000', pivot:{x:0.5, y:0.5}, x:0.332, y:0.32, w:0.2, h:0.2 },
      { id:'mouth_6', z:360, color:'#000000', pivot:{x:0.5, y:0.5}, x:0.338, y:0.318, w:0.2, h:0.2 },
      { id:'mouth_5', z:370, color:'#000000', pivot:{x:0.5, y:0.5}, x:0.331, y:0.297, w:0.2, h:0.2 },
      { id:'mouth_4', z:380, color:'#000000', pivot:{x:0.5, y:0.5}, x:0.339, y:0.302, w:0.2, h:0.2 },
      { id:'mouth_2', z:390, color:'#000000', pivot:{x:0.5, y:0.5}, x:0.343, y:0.317, w:0.2, h:0.2 },
      { id:'mouth_1', z:400, color:'#000000', pivot:{x:0.5, y:0.5}, x:0.352, y:0.325, w:0.2, h:0.2 }
    ]
  },
  core_omega: {
    canvas: { w:500, h:500 },
    foot:   { x:0.5, y:0.92 },
    autoFit: true,
    forceFit: true,
    layers: [
      { id:'ring_t', z:5, color:'#3a4a5a', pivot:{x:0.5, y:0.5}, x:-0.511, y:-0.167, w:0.6, h:0.04, anchor:{target:'arm_ru_mid', rot:true} },
      { id:'ring_b', z:5, color:'#3a4a5a', pivot:{x:0.5, y:0.5}, x:-0.404, y:0.015, w:0.6, h:0.04, anchor:{target:'arm_ld_mid', rot:true} },
      { id:'ring_l', z:5, color:'#3a4a5a', pivot:{x:0.5, y:0.5}, x:-0.063, y:-0.383, w:0.04, h:0.6, anchor:{target:'arm_lu_tip', rot:true} },
      { id:'ring_r', z:5, color:'#3a4a5a', pivot:{x:0.5, y:0.5}, x:0.209, y:-0.242, w:0.04, h:0.6, anchor:{target:'arm_rd_mid', rot:true} },
      { id:'arm_lu_base', z:10, color:'#4a5a6a', pivot:{x:0.5, y:1}, x:0.28, y:0.3, w:0.06, h:0.14 },
      { id:'arm_lu_mid', z:11, color:'#5a6a7a', pivot:{x:0.5, y:1}, x:0.675, y:0.044, w:0.06, h:0.14, anchor:{target:'arm_lu_base', rot:true} },
      { id:'arm_lu_tip', z:12, color:'#7a8a9a', pivot:{x:0.5, y:1}, x:0.79, y:0.021, w:0.1, h:0.08, anchor:{target:'arm_lu_mid', rot:true} },
      { id:'arm_ru_base', z:13, color:'#4a5a6a', pivot:{x:0.5, y:1}, x:0.66, y:0.3, w:0.06, h:0.14 },
      { id:'arm_ru_mid', z:14, color:'#5a6a7a', pivot:{x:0.5, y:1}, x:0.104, y:-0.291, w:0.06, h:0.14, anchor:{target:'arm_ru_base', rot:true} },
      { id:'arm_ld_base', z:16, color:'#4a5a6a', pivot:{x:0.5, y:0}, x:0.28, y:0.7, w:0.06, h:0.14 },
      { id:'arm_ld_mid', z:17, color:'#5a6a7a', pivot:{x:0.5, y:0}, x:0.358, y:0.175, w:0.06, h:0.14, anchor:{target:'arm_ld_base', rot:true} },
      { id:'arm_rd_base', z:19, color:'#4a5a6a', pivot:{x:0.5, y:0}, x:0.66, y:0.7, w:0.06, h:0.14 },
      { id:'arm_rd_mid', z:20, color:'#5a6a7a', pivot:{x:0.5, y:0}, x:0.08, y:-0.418, w:0.06, h:0.14, anchor:{target:'arm_rd_base', rot:true} },
      { id:'core_ring_outer', z:30, color:'#5a7a9a', pivot:{x:0.5, y:0.5}, x:0.3, y:0.3, w:0.4, h:0.4 },
      { id:'core_ring_mid', z:31, color:'#3a5a7a', pivot:{x:0.5, y:0.5}, x:0.35, y:0.35, w:0.3, h:0.3 },
      { id:'core', z:32, color:'#2a3a4a', pivot:{x:0.5, y:0.5}, x:0.4, y:0.4, w:0.2, h:0.2 },
      { id:'core_eye', z:33, color:'#00e0ff', pivot:{x:0.5, y:0.5}, x:0.47, y:0.47, w:0.06, h:0.06 }
    ]
  }
};

/* ============================================================
   ★ BOSS MODULE — 資料區
   ============================================================ */
const BOSSES={
  factory_king:{name:'工廠之王 · 鐵手',region:'廢棄工廠',hp:10000,armor:2000,armorLevel:4,dmg:125,pen:2,critRate:0.10,critMult:1.5,seal:'seal_factory',unlock:'廢棄實驗室',drops:['zhuk6a','svd','altyn','rpk16','maska']},
  lab_queen:{name:'實驗室女王 · 白蝕',region:'廢棄實驗室',hp:25000,armor:6000,armorLevel:5,dmg:225,pen:3,critRate:0.12,critMult:1.6,seal:'seal_lab',unlock:'郊區公路',drops:['altyn','zsh12m','rpk16','asval','maska','6b232']},
  road_tyrant:{name:'公路暴君 · 鐵鎚',region:'郊區公路',hp:50000,armor:12500,armorLevel:6,dmg:350,pen:4,critRate:0.15,critMult:1.8,seal:'seal_road',unlock:'輻射沼澤',drops:['zhuk6a','svd','pkp','rpk16','belleville','zhuk3']},
  swamp_hydra:{name:'沼澤九頭 · 腐母',region:'輻射沼澤',hp:90000,armor:20000,armorLevel:6,dmg:500,pen:5,critRate:0.18,critMult:2.0,seal:'seal_swamp',unlock:'廢土核心',drops:['altyn','zsh12m','svd','pkp','6b43','zhuk6a','maska']},
  core_omega:{name:'核心終焉 · OMEGA',region:'廢土核心',hp:160000,armor:30000,armorLevel:7,dmg:650,pen:6,critRate:0.20,critMult:2.2,seal:'seal_core',unlock:null,drops:['pkm','pkp','ash12','svd','altyn','zsh12m','6b43','defender2','zhuk6a','belleville','rgn']},
};

const BOSS_WEAKPOINTS = {
  factory_king: ['leg_r', 'leg_l'],
  lab_queen:    ['abdomen'],
  road_tyrant:  [],
  swamp_hydra:  [],
  core_omega:  ['ring_t','ring_b','ring_l','ring_r']
};

const BOSS_PHASES = {
  factory_king: [
    { hpPct:1.00, dmgMult:1.0, unlockSkills:[] },
    { hpPct:0.66, dmgMult:1.2, unlockSkills:['dash'] },
    { hpPct:0.33, dmgMult:1.5, unlockSkills:[] }
  ],
  lab_queen: [
    { hpPct:1.00, dmgMult:1.0,  unlockSkills:[] },
    { hpPct:0.66, dmgMult:1.25, unlockSkills:['dash'] },
    { hpPct:0.33, dmgMult:1.6,  unlockSkills:[] }
  ],
  road_tyrant: [
    { hpPct:1.00, dmgMult:1.0, unlockSkills:[] },
    { hpPct:0.50, dmgMult:1.3, unlockSkills:['charge'] }
  ],
  swamp_hydra: [
    { hpPct:1.00, dmgMult:1.0,  unlockSkills:[] },
    { hpPct:0.66, dmgMult:1.25, unlockSkills:['breath'] },
    { hpPct:0.33, dmgMult:1.6,  unlockSkills:[] }
  ],
  core_omega: [
    { hpPct:1.00, dmgMult:1.0,  unlockSkills:[] },
    { hpPct:0.75, dmgMult:1.15, unlockSkills:['laser_spray'] },
    { hpPct:0.50, dmgMult:1.35, unlockSkills:['laser_charge'] },
    { hpPct:0.25, dmgMult:1.7,  unlockSkills:[] }
  ]
};

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
      { id:'eyes', z:100, color:'#b3dfea', pivot:{x:0.5, y:0.5}, x:-0.006, y:0.298, w:0.2, h:0.2, anchor:{target:'helmet', rot:true} },
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
      { id:'eye_copy', z:220, color:'#8a1020', pivot:{x:0.5, y:0.5}, x:0.033, y:-0.054, w:0.1, h:0.06, anchor:{target:'head', rot:true} }
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
      { id:'shield-2_copy', z:90, color:'#073b0a', pivot:{x:0.5, y:0.5}, x:-0.091, y:-0.209, w:0.2, h:0.2, anchor:{target:'shield', rot:true} },
      { id:'shield-2_copy_1', z:100, color:'#073b0a', pivot:{x:0.5, y:0.5}, x:-0.091, y:-0.209, w:0.2, h:0.2, anchor:{target:'shield', rot:true} },
      { id:'shield', z:110, color:'#073b0a', pivot:{x:0.5, y:0.5}, x:-0.39, y:-0.151, w:0.2, h:0.5, anchor:{target:'arm_l', rot:true} },
      { id:'shield-2', z:120, color:'#073b0a', pivot:{x:0.5, y:0.5}, x:-0.099, y:0.013, w:0.2, h:0.2, anchor:{target:'shield', rot:true} },
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
      { id:'body_copy_1', z:20, color:'#2b4413', pivot:{x:0.5, y:1}, x:-0.298, y:0.012, w:0.3, h:0.35, anchor:{target:'body', rot:true} },
      { id:'body', z:30, color:'#3d5823', pivot:{x:0.5, y:1}, x:0.354, y:0.83, w:0.3, h:0.35 },
      { id:'body_copy', z:40, color:'#3b482e', pivot:{x:0.5, y:1}, x:-0.213, y:0.012, w:0.3, h:0.35, anchor:{target:'body', rot:true} },
      { id:'neck_7', z:50, color:'#6b7c5a', pivot:{x:0.5, y:1}, x:0.74, y:0.48, w:0.04, h:0.16 },
      { id:'neck_6', z:60, color:'#293121', pivot:{x:0.5, y:1}, x:0.64, y:0.46, w:0.04, h:0.15 },
      { id:'neck_5', z:70, color:'#1f3607', pivot:{x:0.5, y:1}, x:0.56, y:0.44, w:0.04, h:0.15 },
      { id:'neck_4', z:80, color:'#47800f', pivot:{x:0.5, y:1}, x:0.46, y:0.42, w:0.04, h:0.14 },
      { id:'neck_3_copy', z:90, color:'#2e510b', pivot:{x:0.5, y:1}, x:0.061, y:-0.148, w:0.04, h:0.15, anchor:{target:'head_3', rot:true} },
      { id:'neck_3', z:100, color:'#29450d', pivot:{x:0.5, y:1}, x:0.366, y:0.42, w:0.04, h:0.15 },
      { id:'neck_2', z:110, color:'#2b4a0d', pivot:{x:0.5, y:1}, x:0.277, y:0.525, w:0.04, h:0.15 },
      { id:'neck_1', z:120, color:'#30431e', pivot:{x:0.5, y:1}, x:0.211, y:0.511, w:0.04, h:0.16 },
      { id:'head_7', z:130, color:'#5a6a4a', pivot:{x:0.5, y:1}, x:0.126, y:-0.27, w:0.1, h:0.16, anchor:{target:'neck_7', rot:true} },
      { id:'head_6', z:140, color:'#5a6a4a', pivot:{x:0.5, y:1}, x:0.124, y:-0.198, w:0.1, h:0.16, anchor:{target:'neck_6', rot:true} },
      { id:'head_5', z:150, color:'#5a6a4a', pivot:{x:0.5, y:1}, x:0.116, y:-0.316, w:0.1, h:0.17, anchor:{target:'neck_5', rot:true} },
      { id:'head_4', z:160, color:'#5a6a4a', pivot:{x:0.5, y:1}, x:0.023, y:-0.256, w:0.1, h:0.18, anchor:{target:'neck_4', rot:true} },
      { id:'head_3', z:170, color:'#5a6a4a', pivot:{x:0.5, y:1}, x:0.355, y:0.247, w:0.1, h:0.17 },
      { id:'head_2', z:180, color:'#5a6a4a', pivot:{x:0.5, y:1}, x:-0.016, y:-0.239, w:0.1, h:0.16, anchor:{target:'neck_2', rot:true} },
      { id:'mouth_copy_1', z:190, color:'#000000', pivot:{x:0.5, y:0.5}, x:0.341, y:0.324, w:0.2, h:0.2 },
      { id:'head_1', z:200, color:'#5a6a4a', pivot:{x:0.5, y:1}, x:-0.027, y:-0.212, w:0.1, h:0.16, anchor:{target:'neck_1', rot:true} },
      { id:'eyes_copy_5_copy', z:210, color:'#00ff40', pivot:{x:0.5, y:0.5}, x:-0.188, y:-0.251, w:0.2, h:0.2, anchor:{target:'eyes_copy_5', rot:true} },
      { id:'eyes_copy_copy', z:220, color:'#00ff40', pivot:{x:0.5, y:0.5}, x:0.113, y:0.002, w:0.2, h:0.2, anchor:{target:'eyes_copy', rot:true} },
      { id:'eyes_copy_1_copy', z:230, color:'#00ff40', pivot:{x:0.5, y:0.5}, x:0.324, y:0.317, w:0.2, h:0.2 },
      { id:'eyes_copy_2_copy', z:240, color:'#00ff40', pivot:{x:0.5, y:0.5}, x:0.324, y:0.317, w:0.2, h:0.2 },
      { id:'eyes_copy_6_copy_1', z:250, color:'#00ff40', pivot:{x:0.5, y:0.5}, x:-0.33, y:-0.039, w:0.2, h:0.2, anchor:{target:'eyes_copy_6', rot:true} },
      { id:'eyes_copy_6_copy', z:260, color:'#00ff40', pivot:{x:0.5, y:0.5}, x:-0.277, y:0.06, w:0.2, h:0.2, anchor:{target:'eyes', rot:true} },
      { id:'eyes_copy_6', z:270, color:'#00ff40', pivot:{x:0.5, y:0.5}, x:0.324, y:0.317, w:0.2, h:0.2 },
      { id:'eyes_copy_5', z:280, color:'#00ff40', pivot:{x:0.5, y:0.5}, x:0.326, y:0.318, w:0.2, h:0.2 },
      { id:'eyes_copy_4', z:290, color:'#00ff40', pivot:{x:0.5, y:0.5}, x:0.324, y:0.317, w:0.2, h:0.2 },
      { id:'eyes_copy_3', z:300, color:'#00ff40', pivot:{x:0.5, y:0.5}, x:0.005, y:-0.217, w:0.2, h:0.2, anchor:{target:'eyes_copy_4', rot:true} },
      { id:'eyes_copy_2', z:310, color:'#00ff40', pivot:{x:0.5, y:0.5}, x:-0.095, y:-0.02, w:0.2, h:0.2, anchor:{target:'eyes_copy_2_copy', rot:true} },
      { id:'eyes_copy_1', z:320, color:'#00ff40', pivot:{x:0.5, y:0.5}, x:0.05, y:0.052, w:0.2, h:0.2, anchor:{target:'eyes_copy_1_copy', rot:true} },
      { id:'eyes_copy', z:330, color:'#00ff40', pivot:{x:0.5, y:0.5}, x:0.324, y:0.317, w:0.2, h:0.2 },
      { id:'eyes', z:340, color:'#00ff40', pivot:{x:0.5, y:0.5}, x:0.324, y:0.317, w:0.2, h:0.2 },
      { id:'mouth_copy_5', z:350, color:'#000000', pivot:{x:0.5, y:0.5}, x:0.332, y:0.32, w:0.2, h:0.2 },
      { id:'mouth_copy_4', z:360, color:'#000000', pivot:{x:0.5, y:0.5}, x:0.338, y:0.318, w:0.2, h:0.2 },
      { id:'mouth_copy_3', z:370, color:'#000000', pivot:{x:0.5, y:0.5}, x:0.331, y:0.297, w:0.2, h:0.2 },
      { id:'mouth_copy_2', z:380, color:'#000000', pivot:{x:0.5, y:0.5}, x:0.339, y:0.302, w:0.2, h:0.2 },
      { id:'mouth_copy', z:390, color:'#000000', pivot:{x:0.5, y:0.5}, x:0.343, y:0.317, w:0.2, h:0.2 },
      { id:'mouth', z:400, color:'#000000', pivot:{x:0.5, y:0.5}, x:0.352, y:0.325, w:0.2, h:0.2 }
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

const BOSS_ANIMS = {
  factory_king: {
    idle: {
      frameCount: 4, fps: 4, loop: true,
      keys: {
        leg_r: [{rot:0, dx:0.09, dy:-1.72, w:0.14, h:0.4}, {rot:0, dx:0.09, dy:-1.72, w:0.14, h:0.4}, {rot:0, dx:0.09, dy:-1.72, w:0.14, h:0.4}, {rot:0, dx:0.09, dy:-1.72, w:0.14, h:0.4}],
        leg_l: [{rot:0, dx:0, dy:0, w:0.14, h:0.4}, {rot:0, dx:0, dy:0, w:0.14, h:0.4}, {rot:0, dx:0, dy:0, w:0.14, h:0.4}, {rot:0, dx:0, dy:0, w:0.14, h:0.4}],
        torso: [{rot:0, dx:18.44, dy:5.8, w:0.5, h:0.42}, {rot:0, dx:18.35, dy:7.31, w:0.5, h:0.42}, {rot:0, dx:18.35, dy:7.02, w:0.5, h:0.42}, {rot:0, dx:18.35, dy:6.73, w:0.5, h:0.42}],
        arm_r: [{rot:0, dx:-13.07, dy:-2.43, w:0.12, h:0.32}, {rot:0, dx:-13.07, dy:-2.43, w:0.12, h:0.32}, {rot:0, dx:-13.25, dy:-2.21, w:0.11, h:0.288}, {rot:0, dx:-13.25, dy:-2.21, w:0.11, h:0.288}],
        shoulder_r: [{rot:0, dx:-4.57, dy:4.8, w:0.16, h:0.16}, {rot:0, dx:-4.57, dy:4.8, w:0.16, h:0.16}, {rot:0, dx:-4.57, dy:4.8, w:0.16, h:0.16}, {rot:0, dx:-4.57, dy:4.8, w:0.16, h:0.16}],
        arm_l: [{rot:0, dx:11.28, dy:-2.15, w:0.12, h:0.32}, {rot:0, dx:11.28, dy:-2.15, w:0.126, h:0.291}, {rot:0, dx:11.28, dy:-2.15, w:0.126, h:0.328}, {rot:-4.8, dx:12, dy:-2.94, w:0.125, h:0.295}],
        shoulder_l: [{rot:0, dx:7.16, dy:4.66, w:0.16, h:0.16}, {rot:0, dx:7.16, dy:4.66, w:0.16, h:0.16}, {rot:0, dx:7.16, dy:4.66, w:0.16, h:0.16}, {rot:0, dx:7.16, dy:4.66, w:0.16, h:0.16}],
        head: [{rot:0, dx:1.61, dy:16.85, w:0.241, h:0.224}, {rot:0, dx:1.61, dy:16.85, w:0.241, h:0.224}, {rot:0, dx:1.61, dy:16.85, w:0.241, h:0.224}, {rot:0, dx:1.43, dy:14.56, w:0.241, h:0.224}],
        helmet: [{rot:0, dx:0.27, dy:-25.23, w:0.263, h:0.205}, {rot:0, dx:0.45, dy:-25.01, w:0.263, h:0.205}, {rot:0, dx:0.72, dy:-23.97, w:0.263, h:0.205}, {rot:0, dx:0.72, dy:-23.97, w:0.263, h:0.205}],
        eyes: [{rot:0, dx:-0.71, dy:-30.1, w:0.193, h:0.067}, {rot:0, dx:-0.71, dy:-30.1, w:0.193, h:0.067}, {rot:0, dx:-0.71, dy:-30.1, w:0.193, h:0.067}, {rot:0, dx:-0.71, dy:-30.1, w:0.193, h:0.067}],
        "hammer-h": [{rot:-1.85, dx:-22.26, dy:12.39, w:0.736, h:0.023}, {rot:3.22, dx:-22.61, dy:10.38, w:0.736, h:0.023}, {rot:-6.48, dx:-21.99, dy:11.65, w:0.736, h:0.023}, {rot:3.09, dx:-23.5, dy:9.02, w:0.736, h:0.023}],
        hammer: [{rot:0, dx:38.22, dy:18.64, w:0.103, h:0.175}, {rot:0, dx:38.22, dy:18.64, w:0.103, h:0.175}, {rot:0, dx:38.22, dy:18.64, w:0.103, h:0.175}, {rot:0, dx:38.22, dy:18.64, w:0.103, h:0.175}]
      }
    },
    walk: {
      frameCount: 8, fps: 10, loop: true,
      keys: {
        leg_r: [{rot:10, dx:0.09, dy:-1.72, w:0.14, h:0.4}, {rot:5, dx:0.09, dy:-1.72, w:0.14, h:0.4}, {rot:0, dx:0.09, dy:-1.72, w:0.14, h:0.4}, {rot:-5, dx:0.09, dy:-1.72, w:0.14, h:0.4}, {rot:-10, dx:0.09, dy:-1.72, w:0.14, h:0.4}, {rot:-5, dx:0.09, dy:-1.72, w:0.14, h:0.4}, {rot:0, dx:0.09, dy:-1.72, w:0.14, h:0.4}, {rot:5, dx:0.09, dy:-1.72, w:0.14, h:0.4}],
        leg_l: [{rot:0, dx:0, dy:0, w:0.14, h:0.4}, {rot:0, dx:0, dy:0, w:0.14, h:0.4}, {rot:0, dx:0, dy:0, w:0.14, h:0.4}, {rot:0, dx:0, dy:0, w:0.14, h:0.4}, {rot:0, dx:0, dy:0, w:0.14, h:0.4}, {rot:0, dx:0, dy:0, w:0.14, h:0.4}, {rot:0, dx:0, dy:0, w:0.14, h:0.4}, {rot:0, dx:0, dy:0, w:0.14, h:0.4}],
        torso: [{rot:0, dx:18.44, dy:5.8, w:0.5, h:0.42}, {rot:0, dx:18.44, dy:5.8, w:0.5, h:0.42}, {rot:0, dx:18.44, dy:5.8, w:0.5, h:0.42}, {rot:0, dx:18.44, dy:5.8, w:0.5, h:0.42}, {rot:0, dx:18.44, dy:5.8, w:0.5, h:0.42}, {rot:0, dx:18.44, dy:5.8, w:0.5, h:0.42}, {rot:0, dx:18.44, dy:5.8, w:0.5, h:0.42}, {rot:0, dx:18.44, dy:5.8, w:0.5, h:0.42}],
        arm_r: [{rot:-6, dx:-13.07, dy:-2.43, w:0.12, h:0.32}, {rot:-3, dx:-13.07, dy:-2.43, w:0.12, h:0.32}, {rot:0, dx:-13.07, dy:-2.43, w:0.12, h:0.32}, {rot:3, dx:-13.07, dy:-2.43, w:0.12, h:0.32}, {rot:6, dx:-13.07, dy:-2.43, w:0.12, h:0.32}, {rot:3, dx:-13.07, dy:-2.43, w:0.12, h:0.32}, {rot:0, dx:-13.07, dy:-2.43, w:0.12, h:0.32}, {rot:-3, dx:-13.07, dy:-2.43, w:0.12, h:0.32}],
        shoulder_r: [{rot:0, dx:-4.57, dy:4.8, w:0.16, h:0.16}, {rot:0, dx:-4.57, dy:4.8, w:0.16, h:0.16}, {rot:0, dx:-4.57, dy:4.8, w:0.16, h:0.16}, {rot:0, dx:-4.57, dy:4.8, w:0.16, h:0.16}, {rot:0, dx:-4.57, dy:4.8, w:0.16, h:0.16}, {rot:0, dx:-4.57, dy:4.8, w:0.16, h:0.16}, {rot:0, dx:-4.57, dy:4.8, w:0.16, h:0.16}, {rot:0, dx:-4.57, dy:4.8, w:0.16, h:0.16}],
        arm_l: [{rot:6, dx:12.62, dy:-2.08, w:0.12, h:0.32}, {rot:-0.81, dx:12.62, dy:-2.08, w:0.12, h:0.32}, {rot:-7.36, dx:12.62, dy:-2.08, w:0.12, h:0.32}, {rot:-23.32, dx:12.62, dy:-2.08, w:0.12, h:0.32}, {rot:-26.79, dx:12.62, dy:-2.08, w:0.12, h:0.32}, {rot:-25.49, dx:12.62, dy:-2.08, w:0.12, h:0.32}, {rot:-16.89, dx:12.35, dy:-2.01, w:0.12, h:0.32}, {rot:-3.54, dx:12.35, dy:-2.01, w:0.12, h:0.32}],
        shoulder_l: [{rot:0, dx:7.16, dy:4.66, w:0.16, h:0.16}, {rot:0, dx:7.16, dy:4.66, w:0.16, h:0.16}, {rot:0, dx:7.16, dy:4.66, w:0.16, h:0.16}, {rot:0, dx:7.16, dy:4.66, w:0.16, h:0.16}, {rot:0, dx:7.16, dy:4.66, w:0.16, h:0.16}, {rot:0, dx:7.16, dy:4.66, w:0.16, h:0.16}, {rot:0, dx:7.16, dy:4.66, w:0.16, h:0.16}, {rot:0, dx:7.16, dy:4.66, w:0.16, h:0.16}],
        head: [{rot:0, dx:1.61, dy:16.85, w:0.241, h:0.224}, {rot:0, dx:0.97, dy:17.29, w:0.241, h:0.224}, {rot:0, dx:1.43, dy:17.29, w:0.241, h:0.224}, {rot:0, dx:1.43, dy:17.29, w:0.241, h:0.224}, {rot:0, dx:1.43, dy:17.29, w:0.241, h:0.224}, {rot:0, dx:1.43, dy:17.29, w:0.241, h:0.224}, {rot:0, dx:1.43, dy:17.29, w:0.241, h:0.224}, {rot:0, dx:0.88, dy:18.18, w:0.241, h:0.224}],
        helmet: [{rot:0, dx:0.27, dy:-25.23, w:0.263, h:0.205}, {rot:0, dx:0.27, dy:-25.23, w:0.263, h:0.205}, {rot:0, dx:0.27, dy:-25.23, w:0.263, h:0.205}, {rot:0, dx:0.27, dy:-25.23, w:0.263, h:0.205}, {rot:0, dx:0.27, dy:-25.23, w:0.263, h:0.205}, {rot:0, dx:0.27, dy:-25.23, w:0.263, h:0.205}, {rot:0, dx:0.27, dy:-25.23, w:0.263, h:0.205}, {rot:0, dx:0.27, dy:-25.23, w:0.263, h:0.205}],
        eyes: [{rot:0, dx:-0.71, dy:-30.1, w:0.193, h:0.067}, {rot:0, dx:-0.71, dy:-30.1, w:0.193, h:0.067}, {rot:0, dx:-0.71, dy:-30.1, w:0.193, h:0.067}, {rot:0, dx:-0.71, dy:-30.1, w:0.193, h:0.067}, {rot:0, dx:-0.71, dy:-30.1, w:0.193, h:0.067}, {rot:0, dx:-0.71, dy:-30.1, w:0.193, h:0.067}, {rot:0, dx:-0.71, dy:-30.1, w:0.193, h:0.067}, {rot:0, dx:-0.71, dy:-30.1, w:0.193, h:0.067}],
        "hammer-h": [{rot:6.1, dx:-20.92, dy:12.46, w:0.736, h:0.023}, {rot:-0.71, dx:-16.97, dy:10.086, w:0.736, h:0.023}, {rot:-7.26, dx:-13.529, dy:7.465, w:0.736, h:0.023}, {rot:-23.22, dx:-6.881, dy:-0.088, w:0.736, h:0.023}, {rot:-26.69, dx:-5.8, dy:-1.908, w:0.736, h:0.023}, {rot:-25.39, dx:-6.189, dy:-1.22, w:0.736, h:0.023}, {rot:-16.79, dx:-9.511, dy:3.201, w:0.736, h:0.023}, {rot:-3.44, dx:-15.76, dy:9.102, w:0.736, h:0.023}],
        hammer: [{rot:0, dx:38.22, dy:18.64, w:0.103, h:0.175}, {rot:0, dx:38.22, dy:18.64, w:0.103, h:0.175}, {rot:0, dx:38.22, dy:18.64, w:0.103, h:0.175}, {rot:0, dx:38.22, dy:18.64, w:0.103, h:0.175}, {rot:0, dx:38.22, dy:18.64, w:0.103, h:0.175}, {rot:0, dx:38.22, dy:18.64, w:0.103, h:0.175}, {rot:0, dx:38.221, dy:18.64, w:0.103, h:0.175}, {rot:0, dx:38.22, dy:18.64, w:0.103, h:0.175}]
      }
    },
    attack_swipe: {
      frameCount: 6, fps: 14, loop: false,
      keys: {
        leg_r: [{rot:0, dx:0.09, dy:-1.72, w:0.14, h:0.4}, {rot:0, dx:0.09, dy:-1.72, w:0.14, h:0.4}, {rot:0, dx:0.09, dy:-1.72, w:0.14, h:0.4}, {rot:0, dx:0.09, dy:-1.72, w:0.14, h:0.4}, {rot:0, dx:0.09, dy:-1.72, w:0.14, h:0.4}, {rot:0, dx:0.09, dy:-1.72, w:0.14, h:0.4}],
        leg_l: [{rot:0, dx:0, dy:0, w:0.14, h:0.4}, {rot:0, dx:0, dy:0, w:0.14, h:0.4}, {rot:0, dx:0, dy:0, w:0.14, h:0.4}, {rot:0, dx:0, dy:0, w:0.14, h:0.4}, {rot:0, dx:0, dy:0, w:0.14, h:0.4}, {rot:0, dx:0, dy:0, w:0.14, h:0.4}],
        torso: [{rot:0, dx:18.44, dy:5.8, w:0.5, h:0.42}, {rot:-3, dx:18.44, dy:4.8, w:0.5, h:0.42}, {rot:-5, dx:18.44, dy:3.8, w:0.5, h:0.42}, {rot:5, dx:18.44, dy:7.8, w:0.5, h:0.42}, {rot:3, dx:18.44, dy:6.8, w:0.5, h:0.42}, {rot:0, dx:18.44, dy:5.8, w:0.5, h:0.42}],
        arm_r: [{rot:0, dx:-13.07, dy:-2.43, w:0.12, h:0.32}, {rot:-40, dx:-13.07, dy:-2.43, w:0.12, h:0.32}, {rot:-70, dx:-13.07, dy:-2.43, w:0.12, h:0.32}, {rot:60, dx:-13.07, dy:-2.43, w:0.12, h:0.32}, {rot:20, dx:-13.07, dy:-2.43, w:0.12, h:0.32}, {rot:0, dx:-13.07, dy:-2.43, w:0.12, h:0.32}],
        shoulder_r: [{rot:0, dx:-4.57, dy:4.8, w:0.16, h:0.16}, {rot:-8, dx:-4.57, dy:4.8, w:0.16, h:0.16}, {rot:-12, dx:-4.57, dy:4.8, w:0.16, h:0.16}, {rot:10, dx:-4.57, dy:4.8, w:0.16, h:0.16}, {rot:5, dx:-4.57, dy:4.8, w:0.16, h:0.16}, {rot:0, dx:-4.57, dy:4.8, w:0.16, h:0.16}],
        arm_l: [{rot:0, dx:11.28, dy:-2.15, w:0.12, h:0.32}, {rot:5, dx:11.28, dy:-2.15, w:0.12, h:0.32}, {rot:8, dx:11.28, dy:-2.15, w:0.12, h:0.32}, {rot:-5, dx:11.28, dy:-2.15, w:0.12, h:0.32}, {rot:-2, dx:11.28, dy:-2.15, w:0.12, h:0.32}, {rot:0, dx:11.28, dy:-2.15, w:0.12, h:0.32}],
        shoulder_l: [{rot:0, dx:7.16, dy:4.66, w:0.16, h:0.16}, {rot:0, dx:7.16, dy:4.66, w:0.16, h:0.16}, {rot:0, dx:7.16, dy:4.66, w:0.16, h:0.16}, {rot:0, dx:7.16, dy:4.66, w:0.16, h:0.16}, {rot:0, dx:7.16, dy:4.66, w:0.16, h:0.16}, {rot:0, dx:7.16, dy:4.66, w:0.16, h:0.16}],
        head: [{rot:0, dx:1.61, dy:16.85, w:0.241, h:0.224}, {rot:-2, dx:1.61, dy:16.85, w:0.241, h:0.224}, {rot:-3, dx:1.61, dy:16.85, w:0.241, h:0.224}, {rot:3, dx:1.61, dy:16.85, w:0.241, h:0.224}, {rot:2, dx:1.61, dy:16.85, w:0.241, h:0.224}, {rot:0, dx:1.61, dy:16.85, w:0.241, h:0.224}],
        helmet: [{rot:0, dx:0.27, dy:-25.23, w:0.263, h:0.205}, {rot:0, dx:0.78, dy:-25.232, w:0.263, h:0.205}, {rot:0, dx:1.035, dy:-25.228, w:0.263, h:0.205}, {rot:0, dx:-0.494, dy:-25.2, w:0.263, h:0.205}, {rot:0, dx:-0.239, dy:-25.213, w:0.263, h:0.205}, {rot:0, dx:0.27, dy:-25.23, w:0.263, h:0.205}],
        eyes: [{rot:0, dx:-0.71, dy:-30.1, w:0.193, h:0.067}, {rot:0, dx:-0.71, dy:-30.1, w:0.193, h:0.067}, {rot:0, dx:-0.71, dy:-30.1, w:0.193, h:0.067}, {rot:0, dx:-0.71, dy:-30.1, w:0.193, h:0.067}, {rot:0, dx:-0.71, dy:-30.1, w:0.193, h:0.067}, {rot:0, dx:-0.71, dy:-30.1, w:0.193, h:0.067}],
        "hammer-h": [{rot:-1.85, dx:-22.26, dy:12.39, w:0.736, h:0.023}, {rot:-35, dx:-22.259, dy:12.39, w:0.736, h:0.023}, {rot:-60, dx:-22.26, dy:12.39, w:0.736, h:0.023}, {rot:50, dx:-22.26, dy:12.39, w:0.736, h:0.023}, {rot:15, dx:-22.26, dy:12.39, w:0.736, h:0.023}, {rot:-1.85, dx:-22.26, dy:12.39, w:0.736, h:0.023}],
        hammer: [{rot:0, dx:38.22, dy:18.64, w:0.103, h:0.175}, {rot:0, dx:38.22, dy:18.64, w:0.103, h:0.175}, {rot:0, dx:38.22, dy:18.64, w:0.103, h:0.175}, {rot:0, dx:38.222, dy:18.64, w:0.103, h:0.175}, {rot:0, dx:38.222, dy:18.64, w:0.103, h:0.175}, {rot:0, dx:38.22, dy:18.64, w:0.103, h:0.175}]
      }
    },
    skill_charge: {
      frameCount: 8, fps: 10, loop: false,
      keys: {
        leg_r: [{rot:0, dx:0.09, dy:-1.72, w:0.14, h:0.4}, {rot:0, dx:0.09, dy:-1.72, w:0.14, h:0.4}, {rot:0, dx:0.09, dy:-1.72, w:0.14, h:0.4}, {rot:-20.9, dx:0.09, dy:-1.72, w:0.14, h:0.4}, {rot:-20.9, dx:0.09, dy:-1.72, w:0.14, h:0.4}, {rot:-12.9, dx:-0.18, dy:-1.72, w:0.14, h:0.4}, {rot:-10.1, dx:-0.18, dy:-1.79, w:0.14, h:0.4}, {rot:-36.7, dx:-0.45, dy:-1.79, w:0.14, h:0.4}],
        leg_l: [{rot:0, dx:0, dy:0, w:0.14, h:0.4}, {rot:0, dx:0, dy:0, w:0.14, h:0.4}, {rot:0, dx:0, dy:0, w:0.14, h:0.4}, {rot:0, dx:0, dy:0, w:0.14, h:0.4}, {rot:0, dx:0, dy:0, w:0.14, h:0.4}, {rot:0, dx:0, dy:0, w:0.14, h:0.4}, {rot:0, dx:0, dy:0, w:0.14, h:0.4}, {rot:0, dx:0, dy:0, w:0.14, h:0.4}],
        torso: [{rot:0, dx:18.44, dy:5.8, w:0.5, h:0.42}, {rot:-5, dx:18.44, dy:5.8, w:0.5, h:0.42}, {rot:-1.1, dx:18.53, dy:6.66, w:0.5, h:0.42}, {rot:-1.1, dx:18.53, dy:6.66, w:0.5, h:0.42}, {rot:-1.1, dx:18.53, dy:6.66, w:0.5, h:0.42}, {rot:-1.1, dx:18.53, dy:6.66, w:0.5, h:0.42}, {rot:-1.1, dx:18.53, dy:6.66, w:0.5, h:0.42}, {rot:-8.7, dx:18.53, dy:6.66, w:0.5, h:0.42}],
        arm_r: [{rot:0, dx:-13.07, dy:-2.43, w:0.12, h:0.32}, {rot:-15, dx:-13.07, dy:-2.43, w:0.12, h:0.32}, {rot:-37.07, dx:-16.03, dy:-5.08, w:0.12, h:0.32}, {rot:-29.04, dx:-12.25, dy:-8.14, w:0.12, h:0.32}, {rot:-29.04, dx:-12.25, dy:-8.14, w:0.12, h:0.32}, {rot:-40.3, dx:-12.34, dy:-8.14, w:0.12, h:0.32}, {rot:-40.3, dx:-12.34, dy:-8.14, w:0.12, h:0.32}, {rot:-17.5, dx:-12.43, dy:-8.14, w:0.115, h:0.249}],
        shoulder_r: [{rot:0, dx:-4.57, dy:4.8, w:0.16, h:0.16}, {rot:0, dx:-4.57, dy:4.8, w:0.16, h:0.16}, {rot:0, dx:-4.57, dy:4.8, w:0.16, h:0.16}, {rot:0, dx:-4.57, dy:4.8, w:0.16, h:0.16}, {rot:0, dx:-4.57, dy:4.8, w:0.16, h:0.16}, {rot:0, dx:-4.57, dy:4.8, w:0.16, h:0.16}, {rot:0, dx:-4.57, dy:4.8, w:0.16, h:0.16}, {rot:0, dx:-4.57, dy:4.8, w:0.16, h:0.16}],
        arm_l: [{rot:0, dx:11.28, dy:-2.15, w:0.12, h:0.32}, {rot:15, dx:11.55, dy:-2.08, w:0.12, h:0.32}, {rot:15, dx:11.55, dy:-2.08, w:0.12, h:0.32}, {rot:15, dx:11.55, dy:-2.08, w:0.12, h:0.32}, {rot:15, dx:11.55, dy:-2.08, w:0.12, h:0.32}, {rot:15, dx:11.55, dy:-2.08, w:0.12, h:0.32}, {rot:15, dx:11.55, dy:-2.08, w:0.12, h:0.32}, {rot:-28.2, dx:11.55, dy:-2.08, w:0.123, h:0.218}],
        shoulder_l: [{rot:0, dx:7.16, dy:4.66, w:0.16, h:0.16}, {rot:0, dx:7.16, dy:4.66, w:0.16, h:0.16}, {rot:0, dx:7.16, dy:4.66, w:0.16, h:0.16}, {rot:0, dx:7.16, dy:4.66, w:0.16, h:0.16}, {rot:0, dx:7.16, dy:4.66, w:0.16, h:0.16}, {rot:0, dx:7.16, dy:4.66, w:0.16, h:0.16}, {rot:0, dx:7.16, dy:4.66, w:0.16, h:0.16}, {rot:0, dx:7.16, dy:4.66, w:0.16, h:0.16}],
        head: [{rot:0, dx:1.61, dy:16.85, w:0.241, h:0.224}, {rot:-3, dx:1.61, dy:16.85, w:0.241, h:0.224}, {rot:-6, dx:1.61, dy:16.85, w:0.241, h:0.224}, {rot:-9, dx:1.61, dy:16.85, w:0.241, h:0.224}, {rot:-6, dx:1.61, dy:16.85, w:0.241, h:0.224}, {rot:3, dx:1.61, dy:16.85, w:0.241, h:0.224}, {rot:6, dx:1.61, dy:16.85, w:0.241, h:0.224}, {rot:0, dx:1.61, dy:16.85, w:0.241, h:0.224}],
        helmet: [{rot:0, dx:0.27, dy:-25.23, w:0.263, h:0.205}, {rot:0, dx:1.035, dy:-25.228, w:0.263, h:0.205}, {rot:0, dx:1.798, dy:-25.194, w:0.263, h:0.205}, {rot:0, dx:-0.842, dy:-23.96, w:0.263, h:0.205}, {rot:-3, dx:0.993, dy:-25.192, w:0.263, h:0.205}, {rot:1.08, dx:0.52, dy:-27.465, w:0.263, h:0.205}, {rot:-1.92, dx:-0.391, dy:-27.442, w:0.263, h:0.205}, {rot:0.07, dx:0.39, dy:-24.94, w:0.263, h:0.205}],
        eyes: [{rot:0, dx:-0.71, dy:-30.1, w:0.193, h:0.067}, {rot:0, dx:-0.71, dy:-30.1, w:0.193, h:0.067}, {rot:0, dx:-0.71, dy:-30.1, w:0.193, h:0.067}, {rot:0, dx:-0.711, dy:-30.1, w:0.193, h:0.067}, {rot:0, dx:-0.711, dy:-30.1, w:0.193, h:0.067}, {rot:0, dx:-0.71, dy:-30.1, w:0.193, h:0.067}, {rot:0, dx:-0.71, dy:-30.1, w:0.193, h:0.067}, {rot:0, dx:-0.71, dy:-30.1, w:0.193, h:0.067}],
        "hammer-h": [{rot:-1.85, dx:-22.26, dy:12.39, w:0.736, h:0.023}, {rot:-15, dx:-11.88, dy:13.18, w:0.736, h:0.023}, {rot:-27.07, dx:-7.1, dy:11.484, w:0.736, h:0.023}, {rot:-38.55, dx:-0.07, dy:9.6, w:0.736, h:0.023}, {rot:-64.08, dx:11.1, dy:2.78, w:0.736, h:0.023}, {rot:-93.36, dx:18.04, dy:-13.17, w:0.736, h:0.023}, {rot:-139.81, dx:5.79, dy:-10.72, w:0.736, h:0.023}, {rot:-184.14, dx:-26.2, dy:-1.39, w:0.736, h:0.023}],
        hammer: [{rot:0, dx:38.22, dy:18.64, w:0.103, h:0.175}, {rot:0, dx:38.22, dy:18.64, w:0.103, h:0.175}, {rot:0, dx:38.22, dy:18.64, w:0.103, h:0.175}, {rot:-0.04, dx:37.241, dy:18.654, w:0.103, h:0.175}, {rot:1.35, dx:31.638, dy:19.305, w:0.103, h:0.175}, {rot:1.35, dx:31.638, dy:19.305, w:0.103, h:0.175}, {rot:1.35, dx:31.638, dy:19.305, w:0.103, h:0.175}, {rot:1.35, dx:31.638, dy:19.305, w:0.103, h:0.175}]
      }
    },
    hurt: {
      frameCount: 4, fps: 12, loop: false,
      keys: {
        leg_r: [{rot:0, dx:0.09, dy:-1.72, w:0.14, h:0.4}, {rot:0, dx:-0.91, dy:-1.72, w:0.14, h:0.4}, {rot:0, dx:1.09, dy:-1.72, w:0.14, h:0.4}, {rot:0, dx:0.09, dy:-1.72, w:0.14, h:0.4}],
        leg_l: [{rot:0, dx:0, dy:0, w:0.14, h:0.4}, {rot:0, dx:0, dy:0, w:0.14, h:0.4}, {rot:0, dx:0, dy:0, w:0.14, h:0.4}, {rot:0, dx:0, dy:0, w:0.14, h:0.4}],
        torso: [{rot:0, dx:18.44, dy:5.8, w:0.5, h:0.42}, {rot:0, dx:16.44, dy:5.8, w:0.5, h:0.42}, {rot:0, dx:20.44, dy:5.8, w:0.5, h:0.42}, {rot:0, dx:18.44, dy:5.8, w:0.5, h:0.42}],
        arm_r: [{rot:0, dx:-13.07, dy:-2.43, w:0.12, h:0.32}, {rot:0, dx:-15.07, dy:-2.43, w:0.12, h:0.32}, {rot:0, dx:-11.07, dy:-2.43, w:0.12, h:0.32}, {rot:0, dx:-13.07, dy:-2.43, w:0.12, h:0.32}],
        shoulder_r: [{rot:0, dx:-4.57, dy:4.8, w:0.16, h:0.16}, {rot:0, dx:-6.57, dy:4.8, w:0.16, h:0.16}, {rot:0, dx:-2.57, dy:4.8, w:0.16, h:0.16}, {rot:0, dx:-4.57, dy:4.8, w:0.16, h:0.16}],
        arm_l: [{rot:0, dx:11.28, dy:-2.15, w:0.12, h:0.32}, {rot:0, dx:9.28, dy:-2.15, w:0.12, h:0.32}, {rot:0, dx:13.28, dy:-2.15, w:0.12, h:0.32}, {rot:0, dx:11.1, dy:-2.08, w:0.12, h:0.32}],
        shoulder_l: [{rot:0, dx:7.16, dy:4.66, w:0.16, h:0.16}, {rot:0, dx:5.16, dy:4.66, w:0.16, h:0.16}, {rot:0, dx:9.16, dy:4.66, w:0.16, h:0.16}, {rot:0, dx:7.16, dy:4.66, w:0.16, h:0.16}],
        head: [{rot:0, dx:1.61, dy:16.85, w:0.241, h:0.224}, {rot:0, dx:-0.39, dy:16.85, w:0.241, h:0.224}, {rot:0, dx:3.61, dy:16.85, w:0.241, h:0.224}, {rot:0, dx:1.61, dy:16.85, w:0.241, h:0.224}],
        helmet: [{rot:0, dx:0.27, dy:-25.23, w:0.263, h:0.205}, {rot:0, dx:0.27, dy:-25.23, w:0.263, h:0.205}, {rot:0, dx:0.27, dy:-25.23, w:0.263, h:0.205}, {rot:0, dx:0.27, dy:-25.23, w:0.263, h:0.205}],
        eyes: [{rot:0, dx:-0.71, dy:-30.1, w:0.193, h:0.067}, {rot:0, dx:-2.71, dy:-30.1, w:0.193, h:0.067}, {rot:0, dx:1.29, dy:-30.1, w:0.193, h:0.067}, {rot:0, dx:-0.71, dy:-30.1, w:0.193, h:0.067}],
        "hammer-h": [{rot:-1.85, dx:-22.26, dy:12.39, w:0.736, h:0.023}, {rot:-1.85, dx:-24.26, dy:12.39, w:0.736, h:0.023}, {rot:-1.85, dx:-20.26, dy:12.39, w:0.736, h:0.023}, {rot:-1.85, dx:-22.26, dy:12.39, w:0.736, h:0.023}],
        hammer: [{rot:0, dx:38.22, dy:18.64, w:0.103, h:0.175}, {rot:0, dx:38.22, dy:18.64, w:0.103, h:0.175}, {rot:0, dx:38.22, dy:18.64, w:0.103, h:0.175}, {rot:0, dx:38.22, dy:18.64, w:0.103, h:0.175}]
      }
    },
    death: {
      frameCount: 6, fps: 8, loop: false,
      keys: {
        leg_r: [{rot:0, dx:0.09, dy:-1.72, w:0.14, h:0.4}, {rot:0, dx:0.09, dy:-1.72, w:0.14, h:0.4}, {rot:0, dx:0.09, dy:-1.72, w:0.14, h:0.4}, {rot:82.4, dx:11.34, dy:23.75, w:0.14, h:0.4}, {rot:82.4, dx:11.34, dy:23.75, w:0.14, h:0.4}, {rot:82.4, dx:11.34, dy:23.75, w:0.14, h:0.4}],
        leg_l: [{rot:0, dx:0, dy:0, w:0.14, h:0.4}, {rot:0, dx:0, dy:0, w:0.14, h:0.4}, {rot:0, dx:0, dy:0, w:0.14, h:0.4}, {rot:0, dx:0, dy:0, w:0.14, h:0.4}, {rot:0, dx:0, dy:0, w:0.14, h:0.4}, {rot:0, dx:0, dy:0, w:0.14, h:0.4}],
        torso: [{rot:0, dx:18.44, dy:5.8, w:0.5, h:0.42}, {rot:8, dx:18.44, dy:7, w:0.5, h:0.42}, {rot:3.4, dx:22.5, dy:16.51, w:0.5, h:0.42}, {rot:3.4, dx:24.44, dy:19.46, w:0.5, h:0.42}, {rot:3.4, dx:24.44, dy:19.46, w:0.5, h:0.42}, {rot:3.4, dx:24.44, dy:19.46, w:0.5, h:0.42}],
        arm_r: [{rot:0, dx:-13.07, dy:-2.43, w:0.12, h:0.32}, {rot:-8, dx:-13.07, dy:-1.43, w:0.12, h:0.32}, {rot:-20, dx:-12.15, dy:2.86, w:0.12, h:0.32}, {rot:-20, dx:-9.84, dy:7.59, w:0.12, h:0.32}, {rot:-20, dx:-9.84, dy:7.59, w:0.12, h:0.32}, {rot:-20, dx:-6.24, dy:23.25, w:0.12, h:0.32}],
        shoulder_r: [{rot:0, dx:-4.57, dy:4.8, w:0.16, h:0.16}, {rot:0, dx:-5.57, dy:5.8, w:0.16, h:0.16}, {rot:0, dx:-6.92, dy:11.57, w:0.16, h:0.16}, {rot:0, dx:-2.86, dy:20.8, w:0.16, h:0.16}, {rot:0, dx:-2.86, dy:20.8, w:0.16, h:0.16}, {rot:0, dx:-0.46, dy:28.63, w:0.16, h:0.16}],
        arm_l: [{rot:0, dx:11.28, dy:-2.15, w:0.12, h:0.32}, {rot:8, dx:11.28, dy:-1.15, w:0.12, h:0.32}, {rot:20, dx:13.59, dy:11.85, w:0.12, h:0.32}, {rot:20, dx:13.59, dy:11.85, w:0.12, h:0.32}, {rot:20, dx:13.59, dy:11.85, w:0.12, h:0.32}, {rot:20, dx:12.39, dy:21.89, w:0.12, h:0.32}],
        shoulder_l: [{rot:0, dx:7.16, dy:4.66, w:0.16, h:0.16}, {rot:0, dx:6.16, dy:5.66, w:0.16, h:0.16}, {rot:0, dx:9.51, dy:20.44, w:0.16, h:0.16}, {rot:0, dx:9.51, dy:20.44, w:0.16, h:0.16}, {rot:0, dx:9.51, dy:20.44, w:0.16, h:0.16}, {rot:0, dx:7.57, dy:33.66, w:0.16, h:0.16}],
        head: [{rot:0, dx:1.61, dy:16.85, w:0.241, h:0.224}, {rot:10, dx:1.7, dy:18.59, w:0.241, h:0.224}, {rot:-5.56, dx:2.17, dy:27.65, w:0.241, h:0.224}, {rot:-5.56, dx:2.17, dy:27.65, w:0.241, h:0.224}, {rot:-25.41, dx:0, dy:31.2, w:0.241, h:0.224}, {rot:-25.41, dx:2.49, dy:40.21, w:0.241, h:0.224}],
        helmet: [{rot:0, dx:0.27, dy:-25.23, w:0.263, h:0.205}, {rot:3.83, dx:1.368, dy:-23.7, w:0.263, h:0.205}, {rot:3.83, dx:1.368, dy:-23.7, w:0.263, h:0.205}, {rot:3.83, dx:1.368, dy:-23.7, w:0.263, h:0.205}, {rot:3.83, dx:1.368, dy:-23.7, w:0.263, h:0.205}, {rot:3.83, dx:1.368, dy:-23.7, w:0.263, h:0.205}],
        eyes: [{rot:0, dx:-0.71, dy:-30.1, w:0.193, h:0.067}, {rot:1.07, dx:-0.71, dy:-28.9, w:0.193, h:0.067}, {rot:1.07, dx:-0.71, dy:-28.9, w:0.193, h:0.067}, {rot:1.07, dx:-0.71, dy:-28.9, w:0.193, h:0.067}, {rot:1.07, dx:-0.71, dy:-28.9, w:0.193, h:0.067}, {rot:1.07, dx:-0.71, dy:-28.9, w:0.193, h:0.067}],
        "hammer-h": [{rot:-1.85, dx:-22.26, dy:12.39, w:0.736, h:0.023}, {rot:-10, dx:-22.26, dy:13.39, w:0.736, h:0.023}, {rot:-25, dx:-22.26, dy:15.39, w:0.736, h:0.023}, {rot:-45, dx:-22.261, dy:18.39, w:0.736, h:0.023}, {rot:-65, dx:-21.98, dy:20.32, w:0.736, h:0.023}, {rot:-65, dx:-17, dy:21.8, w:0.736, h:0.023}],
        hammer: [{rot:0, dx:38.22, dy:18.64, w:0.103, h:0.175}, {rot:0, dx:38.22, dy:18.64, w:0.103, h:0.175}, {rot:0, dx:38.22, dy:18.64, w:0.103, h:0.175}, {rot:0, dx:38.22, dy:18.64, w:0.103, h:0.175}, {rot:0, dx:38.22, dy:18.64, w:0.103, h:0.175}, {rot:0, dx:38.219, dy:18.64, w:0.103, h:0.175}]
      }
    }
  },
  lab_queen: {
    idle: {
      frameCount: 4, fps: 4, loop: true,
      keys: {
        torso: [{rot:0, dx:-8.42, dy:0.79, w:0.291, h:0.322}, {rot:0, dx:-8.42, dy:1.99, w:0.291, h:0.322}, {rot:0, dx:-8.42, dy:0.79, w:0.291, h:0.322}, {rot:0, dx:-8.42, dy:0.19, w:0.291, h:0.322}],
        head: [{rot:0.26, dx:6.88, dy:2.85, w:0.18, h:0.18}, {rot:0.26, dx:6.88, dy:4.05, w:0.18, h:0.18}, {rot:0.26, dx:6.88, dy:2.85, w:0.18, h:0.18}, {rot:0.26, dx:6.88, dy:2.25, w:0.18, h:0.18}],
        eye: [{rot:-0.26, dx:-10.73, dy:0.94, w:0.077, h:0.056}, {rot:-0.26, dx:-10.73, dy:2.14, w:0.077, h:0.056}, {rot:-0.26, dx:-10.73, dy:0.94, w:0.077, h:0.056}, {rot:-0.26, dx:-10.73, dy:0.34, w:0.077, h:0.056}],
        mandible: [{rot:0.26, dx:19.34, dy:-4.3, w:0.085, h:0.051}, {rot:0.26, dx:19.34, dy:-3.1, w:0.085, h:0.051}, {rot:0.26, dx:19.34, dy:-4.3, w:0.085, h:0.051}, {rot:0.26, dx:19.34, dy:-4.9, w:0.085, h:0.051}],
        abdomen: [{rot:47.3, dx:-11.73, dy:-2.94, w:0.381, h:0.317}, {rot:47.3, dx:-11.73, dy:-1.44, w:0.393, h:0.327}, {rot:47.3, dx:-11.73, dy:-2.94, w:0.381, h:0.317}, {rot:47.3, dx:-11.73, dy:-3.94, w:0.381, h:0.317}],
        leg_f41: [{rot:140.98, dx:49.84, dy:-23.49, w:0.051, h:0.369}, {rot:140.98, dx:49.84, dy:-23.49, w:0.051, h:0.369}, {rot:140.98, dx:48.41, dy:-22.56, w:0.051, h:0.369}, {rot:140.98, dx:48.59, dy:-24.5, w:0.051, h:0.369}],
        leg_f4: [{rot:-110.9, dx:27.84, dy:-29.97, w:0.055, h:0.137}, {rot:-110.9, dx:27.84, dy:-29.97, w:0.055, h:0.137}, {rot:-110.9, dx:27.84, dy:-29.97, w:0.055, h:0.137}, {rot:-110.9, dx:27.84, dy:-29.97, w:0.055, h:0.137}],
        leg_f31: [{rot:146.33, dx:33.86, dy:-15.09, w:0.051, h:0.369}, {rot:146.33, dx:33.86, dy:-15.09, w:0.051, h:0.369}, {rot:146.33, dx:32.7, dy:-14.09, w:0.051, h:0.369}, {rot:146.33, dx:33.6, dy:-15.38, w:0.051, h:0.369}],
        leg_f3: [{rot:-20.4, dx:67.86, dy:24.22, w:0.163, h:0.045}, {rot:-20.4, dx:67.86, dy:24.22, w:0.163, h:0.045}, {rot:-20.4, dx:67.86, dy:24.22, w:0.163, h:0.045}, {rot:-20.4, dx:67.86, dy:24.22, w:0.163, h:0.045}],
        leg_f1: [{rot:-227.7, dx:112.25, dy:81.35, w:0.132, h:0.037}, {rot:-227.7, dx:112.25, dy:81.35, w:0.132, h:0.037}, {rot:-227.7, dx:112.25, dy:81.35, w:0.132, h:0.037}, {rot:-227.7, dx:112.25, dy:81.35, w:0.132, h:0.037}],
        leg_f11: [{rot:160.93, dx:13.52, dy:-7.02, w:0.049, h:0.342}, {rot:160.93, dx:12.36, dy:-6.88, w:0.049, h:0.342}, {rot:160.93, dx:12.36, dy:-6.88, w:0.049, h:0.342}, {rot:160.93, dx:11.11, dy:-7.24, w:0.049, h:0.342}],
        leg_b11: [{rot:86.1, dx:143.05, dy:137.11, w:0.128, h:0.04}, {rot:86.1, dx:144.22, dy:137.47, w:0.128, h:0.04}, {rot:86.1, dx:144.22, dy:137.47, w:0.128, h:0.04}, {rot:86.1, dx:143.41, dy:137.61, w:0.128, h:0.04}],
        leg_b1: [{rot:-54.68, dx:-15.48, dy:15.1, w:0.054, h:0.395}, {rot:-54.68, dx:-15.48, dy:15.1, w:0.054, h:0.395}, {rot:-54.68, dx:-15.48, dy:15.1, w:0.054, h:0.395}, {rot:-54.68, dx:-15.48, dy:15.1, w:0.054, h:0.395}],
        eye_copy: [{rot:-0.26, dx:-2.05, dy:1.3, w:0.077, h:0.056}, {rot:-0.26, dx:-2.05, dy:2.5, w:0.077, h:0.056}, {rot:-0.26, dx:-2.05, dy:1.3, w:0.077, h:0.056}, {rot:-0.26, dx:-2.05, dy:0.7, w:0.077, h:0.056}],
        leg_f2: [{rot:-134.6, dx:15.608, dy:-43, w:0.049, h:0.109}, {rot:-134.6, dx:15.608, dy:-43, w:0.049, h:0.109}, {rot:-134.6, dx:15.608, dy:-43, w:0.049, h:0.109}, {rot:-134.6, dx:15.608, dy:-43, w:0.049, h:0.109}],
        leg_b31: [{rot:-97, dx:62.853, dy:28.255, w:0.048, h:0.242}, {rot:-97, dx:62.853, dy:28.255, w:0.048, h:0.242}, {rot:-97, dx:62.853, dy:28.255, w:0.048, h:0.242}, {rot:-97, dx:62.853, dy:28.255, w:0.048, h:0.242}],
        leg_b3: [{rot:130.4, dx:123.09, dy:85.37, w:0.046, h:0.123}, {rot:130.4, dx:123.09, dy:85.37, w:0.046, h:0.123}, {rot:130.4, dx:123.09, dy:85.37, w:0.046, h:0.123}, {rot:130.4, dx:122.28, dy:88.09, w:0.046, h:0.123}],
        leg_b2: [{rot:8.3, dx:95.34, dy:82.29, w:0.163, h:0.045}, {rot:8.3, dx:95.34, dy:82.29, w:0.163, h:0.045}, {rot:8.3, dx:95.34, dy:82.29, w:0.163, h:0.045}, {rot:8.3, dx:95.34, dy:82.29, w:0.163, h:0.045}],
        leg_b4: [{rot:139.64, dx:21.15, dy:-19.51, w:0.044, h:0.123}, {rot:139.64, dx:21.15, dy:-19.51, w:0.044, h:0.123}, {rot:139.64, dx:21.15, dy:-19.51, w:0.044, h:0.123}, {rot:139.64, dx:21.15, dy:-19.51, w:0.044, h:0.123}],
        leg_f21: [{rot:165.11, dx:24.83, dy:-10.89, w:0.051, h:0.369}, {rot:165.11, dx:24.02, dy:-11.03, w:0.051, h:0.369}, {rot:165.11, dx:24.02, dy:-11.03, w:0.051, h:0.369}, {rot:165.11, dx:24.47, dy:-12.39, w:0.051, h:0.369}],
        leg_b21: [{rot:43.5, dx:-15.887, dy:-46.36, w:0.043, h:0.29}, {rot:43.5, dx:-15.887, dy:-46.36, w:0.043, h:0.29}, {rot:43.5, dx:-13.92, dy:-46.43, w:0.043, h:0.29}, {rot:43.5, dx:-14.37, dy:-47.08, w:0.043, h:0.29}],
        leg_b41: [{rot:-100.2, dx:75.164, dy:-20.714, w:0.052, h:0.252}, {rot:-100.2, dx:75.164, dy:-20.714, w:0.052, h:0.252}, {rot:-100.2, dx:75.164, dy:-20.714, w:0.052, h:0.252}, {rot:-100.2, dx:75.164, dy:-20.714, w:0.052, h:0.252}]
      }
    },
    walk: {
      frameCount: 8, fps: 10, loop: true,
      keys: {
        torso: [{rot:0, dx:-8.42, dy:0.39, w:0.291, h:0.322}, {rot:0, dx:-8.42, dy:1.59, w:0.291, h:0.322}, {rot:0, dx:-8.42, dy:0.39, w:0.291, h:0.322}, {rot:0, dx:-8.42, dy:1.59, w:0.291, h:0.322}, {rot:0, dx:-8.42, dy:0.39, w:0.291, h:0.322}, {rot:0, dx:-8.42, dy:1.59, w:0.291, h:0.322}, {rot:0, dx:-8.42, dy:0.39, w:0.291, h:0.322}, {rot:0, dx:-8.42, dy:1.59, w:0.291, h:0.322}],
        head: [{rot:0.26, dx:6.88, dy:2.45, w:0.18, h:0.18}, {rot:0.26, dx:6.88, dy:3.65, w:0.18, h:0.18}, {rot:0.26, dx:6.88, dy:2.45, w:0.18, h:0.18}, {rot:0.26, dx:6.88, dy:3.65, w:0.18, h:0.18}, {rot:0.26, dx:6.88, dy:2.45, w:0.18, h:0.18}, {rot:0.26, dx:6.88, dy:3.65, w:0.18, h:0.18}, {rot:0.26, dx:6.88, dy:2.45, w:0.18, h:0.18}, {rot:0.26, dx:6.88, dy:3.65, w:0.18, h:0.18}],
        eye: [{rot:-0.26, dx:-10.73, dy:0.54, w:0.077, h:0.056}, {rot:-0.26, dx:-10.73, dy:1.74, w:0.077, h:0.056}, {rot:-0.26, dx:-10.73, dy:0.54, w:0.077, h:0.056}, {rot:-0.26, dx:-10.73, dy:1.74, w:0.077, h:0.056}, {rot:-0.26, dx:-10.73, dy:0.54, w:0.077, h:0.056}, {rot:-0.26, dx:-10.73, dy:1.74, w:0.077, h:0.056}, {rot:-0.26, dx:-10.73, dy:0.54, w:0.077, h:0.056}, {rot:-0.26, dx:-10.73, dy:1.74, w:0.077, h:0.056}],
        mandible: [{rot:0.26, dx:19.34, dy:-4.7, w:0.085, h:0.051}, {rot:0.26, dx:19.34, dy:-3.5, w:0.085, h:0.051}, {rot:0.26, dx:19.34, dy:-4.7, w:0.085, h:0.051}, {rot:0.26, dx:19.34, dy:-3.5, w:0.085, h:0.051}, {rot:0.26, dx:19.34, dy:-4.7, w:0.085, h:0.051}, {rot:0.26, dx:19.34, dy:-3.5, w:0.085, h:0.051}, {rot:0.26, dx:19.34, dy:-4.7, w:0.085, h:0.051}, {rot:0.26, dx:19.34, dy:-3.5, w:0.085, h:0.051}],
        abdomen: [{rot:47.3, dx:-11.73, dy:-2.54, w:0.381, h:0.317}, {rot:47.3, dx:-11.73, dy:-3.54, w:0.381, h:0.317}, {rot:47.3, dx:-11.73, dy:-2.54, w:0.381, h:0.317}, {rot:47.3, dx:-11.73, dy:-3.54, w:0.381, h:0.317}, {rot:47.3, dx:-11.73, dy:-2.54, w:0.381, h:0.317}, {rot:47.3, dx:-11.73, dy:-3.54, w:0.381, h:0.317}, {rot:47.3, dx:-11.73, dy:-2.54, w:0.381, h:0.317}, {rot:47.3, dx:-11.73, dy:-3.54, w:0.381, h:0.317}],
        leg_f41: [{rot:140.98, dx:49.84, dy:-23.49, w:0.051, h:0.369}, {rot:135.32, dx:49.84, dy:-23.49, w:0.051, h:0.369}, {rot:132.98, dx:49.84, dy:-23.49, w:0.051, h:0.369}, {rot:135.32, dx:49.84, dy:-23.49, w:0.051, h:0.369}, {rot:140.98, dx:49.84, dy:-23.49, w:0.051, h:0.369}, {rot:146.64, dx:49.84, dy:-23.49, w:0.051, h:0.369}, {rot:148.98, dx:49.84, dy:-23.49, w:0.051, h:0.369}, {rot:146.64, dx:49.84, dy:-23.49, w:0.051, h:0.369}],
        leg_f4: [{rot:-110.9, dx:27.84, dy:-29.97, w:0.055, h:0.137}, {rot:-107.36, dx:27.84, dy:-29.97, w:0.055, h:0.137}, {rot:-105.9, dx:27.84, dy:-29.97, w:0.055, h:0.137}, {rot:-107.36, dx:27.84, dy:-29.97, w:0.055, h:0.137}, {rot:-110.9, dx:27.84, dy:-29.97, w:0.055, h:0.137}, {rot:-114.44, dx:27.84, dy:-29.97, w:0.055, h:0.137}, {rot:-115.9, dx:27.84, dy:-29.97, w:0.055, h:0.137}, {rot:-114.44, dx:27.84, dy:-29.97, w:0.055, h:0.137}],
        leg_f31: [{rot:146.33, dx:33.86, dy:-15.09, w:0.051, h:0.369}, {rot:151.99, dx:33.86, dy:-15.09, w:0.051, h:0.369}, {rot:154.33, dx:33.86, dy:-15.09, w:0.051, h:0.369}, {rot:151.99, dx:33.86, dy:-15.09, w:0.051, h:0.369}, {rot:146.33, dx:33.86, dy:-15.09, w:0.051, h:0.369}, {rot:140.67, dx:33.86, dy:-15.09, w:0.051, h:0.369}, {rot:138.33, dx:33.86, dy:-15.09, w:0.051, h:0.369}, {rot:140.67, dx:33.86, dy:-15.09, w:0.051, h:0.369}],
        leg_f3: [{rot:-20.4, dx:67.86, dy:24.22, w:0.163, h:0.045}, {rot:-23.94, dx:67.86, dy:24.22, w:0.163, h:0.045}, {rot:-25.4, dx:67.86, dy:24.22, w:0.163, h:0.045}, {rot:-23.94, dx:67.86, dy:24.22, w:0.163, h:0.045}, {rot:-20.4, dx:67.86, dy:24.22, w:0.163, h:0.045}, {rot:-16.86, dx:67.86, dy:24.22, w:0.163, h:0.045}, {rot:-15.4, dx:67.86, dy:24.22, w:0.163, h:0.045}, {rot:-16.86, dx:67.86, dy:24.22, w:0.163, h:0.045}],
        leg_f1: [{rot:-227.7, dx:112.25, dy:81.35, w:0.132, h:0.037}, {rot:-231.24, dx:112.25, dy:81.35, w:0.132, h:0.037}, {rot:-232.7, dx:112.25, dy:81.35, w:0.132, h:0.037}, {rot:-231.24, dx:112.25, dy:81.35, w:0.132, h:0.037}, {rot:-227.7, dx:112.25, dy:81.35, w:0.132, h:0.037}, {rot:-224.16, dx:112.25, dy:81.35, w:0.132, h:0.037}, {rot:-222.7, dx:112.25, dy:81.35, w:0.132, h:0.037}, {rot:-224.16, dx:112.25, dy:81.35, w:0.132, h:0.037}],
        leg_f11: [{rot:160.93, dx:13.52, dy:-7.02, w:0.049, h:0.342}, {rot:166.59, dx:13.52, dy:-7.02, w:0.049, h:0.342}, {rot:168.93, dx:13.52, dy:-7.02, w:0.049, h:0.342}, {rot:166.59, dx:13.52, dy:-7.02, w:0.049, h:0.342}, {rot:160.93, dx:13.52, dy:-7.02, w:0.049, h:0.342}, {rot:155.27, dx:13.52, dy:-7.02, w:0.049, h:0.342}, {rot:152.93, dx:13.52, dy:-7.02, w:0.049, h:0.342}, {rot:155.27, dx:13.52, dy:-7.02, w:0.049, h:0.342}],
        leg_b11: [{rot:86.1, dx:143.05, dy:137.11, w:0.128, h:0.04}, {rot:80.44, dx:143.05, dy:137.11, w:0.128, h:0.04}, {rot:78.1, dx:143.05, dy:137.11, w:0.128, h:0.04}, {rot:80.44, dx:143.05, dy:137.11, w:0.128, h:0.04}, {rot:86.1, dx:143.05, dy:137.68, w:0.128, h:0.04}, {rot:86.1, dx:143.05, dy:137.68, w:0.128, h:0.04}, {rot:86.1, dx:143.05, dy:137.68, w:0.128, h:0.04}, {rot:86.1, dx:143.05, dy:137.68, w:0.128, h:0.04}],
        leg_b1: [{rot:-54.68, dx:-15.48, dy:15.1, w:0.054, h:0.395}, {rot:-51.14, dx:-15.48, dy:15.1, w:0.054, h:0.395}, {rot:-49.68, dx:-15.48, dy:15.1, w:0.054, h:0.395}, {rot:-51.14, dx:-15.48, dy:15.1, w:0.054, h:0.395}, {rot:-54.68, dx:-15.48, dy:15.1, w:0.054, h:0.395}, {rot:-58.22, dx:-15.48, dy:15.1, w:0.054, h:0.395}, {rot:-59.68, dx:-15.48, dy:15.1, w:0.054, h:0.395}, {rot:-58.22, dx:-15.48, dy:15.1, w:0.054, h:0.395}],
        eye_copy: [{rot:-0.26, dx:-2.05, dy:0.9, w:0.077, h:0.056}, {rot:-0.26, dx:-2.05, dy:2.1, w:0.077, h:0.056}, {rot:-0.26, dx:-2.05, dy:0.9, w:0.077, h:0.056}, {rot:-0.26, dx:-2.05, dy:2.1, w:0.077, h:0.056}, {rot:-0.26, dx:-2.05, dy:0.9, w:0.077, h:0.056}, {rot:-0.26, dx:-2.05, dy:2.1, w:0.077, h:0.056}, {rot:-0.26, dx:-2.05, dy:0.9, w:0.077, h:0.056}, {rot:-0.26, dx:-2.05, dy:2.1, w:0.077, h:0.056}],
        leg_f2: [{rot:-134.6, dx:15.608, dy:-43, w:0.049, h:0.109}, {rot:-131.06, dx:15.608, dy:-43, w:0.049, h:0.109}, {rot:-129.6, dx:15.608, dy:-43, w:0.049, h:0.109}, {rot:-131.06, dx:15.608, dy:-43, w:0.049, h:0.109}, {rot:-134.6, dx:15.608, dy:-43, w:0.049, h:0.109}, {rot:-138.14, dx:15.608, dy:-43, w:0.049, h:0.109}, {rot:-139.6, dx:15.608, dy:-43, w:0.049, h:0.109}, {rot:-138.14, dx:15.608, dy:-43, w:0.049, h:0.109}],
        leg_b31: [{rot:-97, dx:62.853, dy:28.255, w:0.048, h:0.242}, {rot:-102.66, dx:62.853, dy:28.255, w:0.048, h:0.242}, {rot:-105, dx:62.853, dy:28.255, w:0.048, h:0.242}, {rot:-102.66, dx:62.853, dy:28.255, w:0.048, h:0.242}, {rot:-97, dx:62.853, dy:28.255, w:0.048, h:0.242}, {rot:-91.34, dx:62.853, dy:28.255, w:0.048, h:0.242}, {rot:-89, dx:62.853, dy:28.255, w:0.048, h:0.242}, {rot:-91.34, dx:62.853, dy:28.255, w:0.048, h:0.242}],
        leg_b3: [{rot:130.4, dx:123.09, dy:85.37, w:0.046, h:0.123}, {rot:133.94, dx:123.09, dy:85.37, w:0.046, h:0.123}, {rot:135.4, dx:123.09, dy:85.37, w:0.046, h:0.123}, {rot:133.94, dx:123.09, dy:85.37, w:0.046, h:0.123}, {rot:130.4, dx:123.09, dy:85.37, w:0.046, h:0.123}, {rot:126.86, dx:123.09, dy:85.37, w:0.046, h:0.123}, {rot:125.4, dx:123.09, dy:85.37, w:0.046, h:0.123}, {rot:126.86, dx:123.09, dy:85.37, w:0.046, h:0.123}],
        leg_b2: [{rot:8.3, dx:95.34, dy:82.29, w:0.163, h:0.045}, {rot:2.64, dx:95.434, dy:83.433, w:0.154, h:0.036}, {rot:1.76, dx:93.993, dy:83.306, w:0.154, h:0.036}, {rot:2.64, dx:95.434, dy:83.433, w:0.154, h:0.036}, {rot:19, dx:95.455, dy:82.395, w:0.154, h:0.036}, {rot:19, dx:95.455, dy:82.395, w:0.154, h:0.036}, {rot:19, dx:95.455, dy:82.395, w:0.154, h:0.036}, {rot:19, dx:95.455, dy:82.395, w:0.154, h:0.036}],
        leg_b4: [{rot:139.64, dx:21.15, dy:-19.51, w:0.044, h:0.123}, {rot:136.1, dx:21.15, dy:-19.51, w:0.044, h:0.123}, {rot:134.64, dx:21.15, dy:-19.51, w:0.044, h:0.123}, {rot:136.1, dx:21.15, dy:-19.51, w:0.044, h:0.123}, {rot:139.64, dx:21.15, dy:-19.51, w:0.044, h:0.123}, {rot:143.18, dx:21.15, dy:-19.51, w:0.044, h:0.123}, {rot:144.64, dx:21.15, dy:-19.51, w:0.044, h:0.123}, {rot:143.18, dx:21.15, dy:-19.51, w:0.044, h:0.123}],
        leg_f21: [{rot:165.11, dx:24.83, dy:-10.89, w:0.051, h:0.369}, {rot:159.45, dx:24.83, dy:-10.89, w:0.051, h:0.369}, {rot:157.11, dx:24.83, dy:-10.89, w:0.051, h:0.369}, {rot:159.45, dx:24.83, dy:-10.89, w:0.051, h:0.369}, {rot:165.11, dx:24.83, dy:-10.89, w:0.051, h:0.369}, {rot:170.77, dx:24.83, dy:-10.89, w:0.051, h:0.369}, {rot:173.11, dx:24.83, dy:-10.89, w:0.051, h:0.369}, {rot:170.77, dx:24.83, dy:-10.89, w:0.051, h:0.369}],
        leg_b21: [{rot:43.5, dx:-15.887, dy:-46.36, w:0.043, h:0.29}, {rot:45.62, dx:-14.52, dy:-44.922, w:0.043, h:0.29}, {rot:46.5, dx:-13.925, dy:-44.349, w:0.043, h:0.29}, {rot:40.86, dx:-12.88, dy:-43.09, w:0.043, h:0.29}, {rot:35.39, dx:-10.67, dy:-41.06, w:0.043, h:0.29}, {rot:41.22, dx:-13.02, dy:-43.23, w:0.043, h:0.29}, {rot:45.21, dx:-14.46, dy:-44.82, w:0.043, h:0.29}, {rot:46.3, dx:-14.83, dy:-45.27, w:0.043, h:0.29}],
        leg_b41: [{rot:-100.2, dx:75.164, dy:-20.714, w:0.052, h:0.252}, {rot:-94.54, dx:75.164, dy:-20.714, w:0.052, h:0.252}, {rot:-92.2, dx:75.164, dy:-20.714, w:0.052, h:0.252}, {rot:-94.54, dx:75.164, dy:-20.714, w:0.052, h:0.252}, {rot:-100.2, dx:75.164, dy:-20.714, w:0.052, h:0.252}, {rot:-105.86, dx:75.164, dy:-20.714, w:0.052, h:0.252}, {rot:-108.2, dx:75.164, dy:-20.714, w:0.052, h:0.252}, {rot:-105.86, dx:75.164, dy:-20.714, w:0.052, h:0.252}]
      }
    },
    attack_swipe: {
      frameCount: 6, fps: 14, loop: false,
      keys: {
        torso: [{rot:0, dx:-8.42, dy:0.79, w:0.291, h:0.322}, {rot:-4, dx:-8.42, dy:0.79, w:0.291, h:0.322}, {rot:-8, dx:-8.42, dy:0.79, w:0.291, h:0.322}, {rot:6, dx:-8.42, dy:0.79, w:0.291, h:0.322}, {rot:3, dx:-8.42, dy:0.79, w:0.291, h:0.322}, {rot:0, dx:-8.42, dy:0.79, w:0.291, h:0.322}],
        head: [{rot:0.26, dx:6.88, dy:2.85, w:0.18, h:0.18}, {rot:-7.74, dx:6.88, dy:2.85, w:0.18, h:0.18}, {rot:-14.74, dx:6.88, dy:2.85, w:0.18, h:0.18}, {rot:10.26, dx:6.88, dy:2.85, w:0.18, h:0.18}, {rot:5.26, dx:6.88, dy:2.85, w:0.18, h:0.18}, {rot:0.26, dx:6.88, dy:2.85, w:0.18, h:0.18}],
        eye: [{rot:-0.26, dx:-10.73, dy:0.94, w:0.077, h:0.056}, {rot:-0.26, dx:-10.73, dy:0.94, w:0.077, h:0.056}, {rot:-0.26, dx:-10.73, dy:0.94, w:0.077, h:0.056}, {rot:-0.26, dx:-10.73, dy:0.94, w:0.077, h:0.056}, {rot:-0.26, dx:-10.73, dy:0.94, w:0.077, h:0.056}, {rot:-0.26, dx:-10.73, dy:0.94, w:0.077, h:0.056}],
        mandible: [{rot:0.26, dx:19.34, dy:-4.3, w:0.085, h:0.051}, {rot:0.26, dx:16.34, dy:-4.3, w:0.085, h:0.051}, {rot:0.26, dx:13.34, dy:-4.3, w:0.085, h:0.051}, {rot:0.26, dx:27.34, dy:-4.3, w:0.085, h:0.051}, {rot:0.26, dx:23.34, dy:-4.3, w:0.085, h:0.051}, {rot:0.26, dx:19.34, dy:-4.3, w:0.085, h:0.051}],
        abdomen: [{rot:47.3, dx:-11.73, dy:-2.94, w:0.381, h:0.317}, {rot:50.3, dx:-11.73, dy:-2.94, w:0.381, h:0.317}, {rot:52.3, dx:-11.73, dy:-2.94, w:0.381, h:0.317}, {rot:44.3, dx:-11.73, dy:-2.94, w:0.381, h:0.317}, {rot:46.3, dx:-11.73, dy:-2.94, w:0.381, h:0.317}, {rot:47.3, dx:-11.73, dy:-2.94, w:0.381, h:0.317}],
        leg_f41: [{rot:140.98, dx:49.84, dy:-23.49, w:0.051, h:0.369}, {rot:145.98, dx:49.84, dy:-23.49, w:0.051, h:0.369}, {rot:150.98, dx:49.84, dy:-23.49, w:0.051, h:0.369}, {rot:132.98, dx:49.84, dy:-23.49, w:0.051, h:0.369}, {rot:137.98, dx:49.84, dy:-23.49, w:0.051, h:0.369}, {rot:140.98, dx:49.84, dy:-23.49, w:0.051, h:0.369}],
        leg_f4: [{rot:-110.9, dx:27.84, dy:-29.97, w:0.055, h:0.137}, {rot:-113.9, dx:27.84, dy:-29.97, w:0.055, h:0.137}, {rot:-115.9, dx:27.84, dy:-29.97, w:0.055, h:0.137}, {rot:-105.9, dx:27.84, dy:-29.97, w:0.055, h:0.137}, {rot:-108.9, dx:27.84, dy:-29.97, w:0.055, h:0.137}, {rot:-110.9, dx:27.84, dy:-29.97, w:0.055, h:0.137}],
        leg_f31: [{rot:146.33, dx:33.86, dy:-15.09, w:0.051, h:0.369}, {rot:151.33, dx:33.86, dy:-15.09, w:0.051, h:0.369}, {rot:156.33, dx:33.86, dy:-15.09, w:0.051, h:0.369}, {rot:138.33, dx:33.86, dy:-15.09, w:0.051, h:0.369}, {rot:143.33, dx:33.86, dy:-15.09, w:0.051, h:0.369}, {rot:146.33, dx:33.86, dy:-15.09, w:0.051, h:0.369}],
        leg_f3: [{rot:-20.4, dx:67.86, dy:24.22, w:0.163, h:0.045}, {rot:-23.4, dx:67.86, dy:24.22, w:0.163, h:0.045}, {rot:-25.4, dx:67.86, dy:24.22, w:0.163, h:0.045}, {rot:-15.4, dx:67.86, dy:24.22, w:0.163, h:0.045}, {rot:-18.4, dx:67.86, dy:24.22, w:0.163, h:0.045}, {rot:-20.4, dx:67.86, dy:24.22, w:0.163, h:0.045}],
        leg_f1: [{rot:-227.7, dx:112.25, dy:81.35, w:0.132, h:0.037}, {rot:-242.7, dx:112.25, dy:81.35, w:0.132, h:0.037}, {rot:-252.7, dx:112.25, dy:81.35, w:0.132, h:0.037}, {rot:-202.7, dx:112.25, dy:81.35, w:0.132, h:0.037}, {rot:-217.7, dx:112.25, dy:81.35, w:0.132, h:0.037}, {rot:-227.7, dx:112.25, dy:81.35, w:0.132, h:0.037}],
        leg_f11: [{rot:160.93, dx:13.52, dy:-7.02, w:0.049, h:0.342}, {rot:180.93, dx:13.52, dy:-7.02, w:0.049, h:0.342}, {rot:195.93, dx:13.52, dy:-7.02, w:0.049, h:0.342}, {rot:130.93, dx:13.52, dy:-7.02, w:0.049, h:0.342}, {rot:150.93, dx:13.52, dy:-7.02, w:0.049, h:0.342}, {rot:160.93, dx:13.52, dy:-7.02, w:0.049, h:0.342}],
        leg_b11: [{rot:86.1, dx:143.05, dy:137.11, w:0.128, h:0.04}, {rot:86.1, dx:143.05, dy:137.11, w:0.128, h:0.04}, {rot:86.1, dx:143.05, dy:137.11, w:0.128, h:0.04}, {rot:86.1, dx:143.05, dy:137.11, w:0.128, h:0.04}, {rot:86.1, dx:143.05, dy:137.11, w:0.128, h:0.04}, {rot:86.1, dx:143.05, dy:137.11, w:0.128, h:0.04}],
        leg_b1: [{rot:-54.68, dx:-15.48, dy:15.1, w:0.054, h:0.395}, {rot:-54.68, dx:-15.48, dy:15.1, w:0.054, h:0.395}, {rot:-54.68, dx:-15.48, dy:15.1, w:0.054, h:0.395}, {rot:-54.68, dx:-15.48, dy:15.1, w:0.054, h:0.395}, {rot:-54.68, dx:-15.48, dy:15.1, w:0.054, h:0.395}, {rot:-54.68, dx:-15.48, dy:15.1, w:0.054, h:0.395}],
        eye_copy: [{rot:-0.26, dx:-2.05, dy:1.3, w:0.077, h:0.056}, {rot:-0.26, dx:-2.05, dy:1.3, w:0.077, h:0.056}, {rot:-0.26, dx:-2.05, dy:1.3, w:0.077, h:0.056}, {rot:-0.26, dx:-2.05, dy:1.3, w:0.077, h:0.056}, {rot:-0.26, dx:-2.05, dy:1.3, w:0.077, h:0.056}, {rot:-0.26, dx:-2.05, dy:1.3, w:0.077, h:0.056}],
        leg_f2: [{rot:-134.6, dx:15.608, dy:-43, w:0.049, h:0.109}, {rot:-149.6, dx:15.608, dy:-43, w:0.049, h:0.109}, {rot:-159.6, dx:15.608, dy:-43, w:0.049, h:0.109}, {rot:-109.6, dx:15.608, dy:-43, w:0.049, h:0.109}, {rot:-124.6, dx:15.608, dy:-43, w:0.049, h:0.109}, {rot:-134.6, dx:15.608, dy:-43, w:0.049, h:0.109}],
        leg_b31: [{rot:-97, dx:62.853, dy:28.255, w:0.048, h:0.242}, {rot:-97, dx:62.853, dy:28.255, w:0.048, h:0.242}, {rot:-97, dx:62.853, dy:28.255, w:0.048, h:0.242}, {rot:-97, dx:62.853, dy:28.255, w:0.048, h:0.242}, {rot:-97, dx:62.853, dy:28.255, w:0.048, h:0.242}, {rot:-97, dx:62.853, dy:28.255, w:0.048, h:0.242}],
        leg_b3: [{rot:130.4, dx:123.09, dy:85.37, w:0.046, h:0.123}, {rot:130.4, dx:123.09, dy:85.37, w:0.046, h:0.123}, {rot:130.4, dx:123.09, dy:85.37, w:0.046, h:0.123}, {rot:130.4, dx:123.09, dy:85.37, w:0.046, h:0.123}, {rot:130.4, dx:123.09, dy:85.37, w:0.046, h:0.123}, {rot:130.4, dx:123.09, dy:85.37, w:0.046, h:0.123}],
        leg_b2: [{rot:8.3, dx:95.34, dy:82.29, w:0.163, h:0.045}, {rot:8.3, dx:95.34, dy:82.29, w:0.163, h:0.045}, {rot:8.3, dx:95.34, dy:82.29, w:0.163, h:0.045}, {rot:8.3, dx:95.34, dy:82.29, w:0.163, h:0.045}, {rot:8.3, dx:95.34, dy:82.29, w:0.163, h:0.045}, {rot:8.3, dx:95.34, dy:82.29, w:0.163, h:0.045}],
        leg_b4: [{rot:139.64, dx:21.15, dy:-19.51, w:0.044, h:0.123}, {rot:139.64, dx:21.15, dy:-19.51, w:0.044, h:0.123}, {rot:139.64, dx:21.15, dy:-19.51, w:0.044, h:0.123}, {rot:139.64, dx:21.15, dy:-19.51, w:0.044, h:0.123}, {rot:139.64, dx:21.15, dy:-19.51, w:0.044, h:0.123}, {rot:139.64, dx:21.15, dy:-19.51, w:0.044, h:0.123}],
        leg_f21: [{rot:165.11, dx:24.83, dy:-10.89, w:0.051, h:0.369}, {rot:185.11, dx:24.83, dy:-10.89, w:0.051, h:0.369}, {rot:200.11, dx:24.83, dy:-10.89, w:0.051, h:0.369}, {rot:135.11, dx:24.83, dy:-10.89, w:0.051, h:0.369}, {rot:155.11, dx:24.83, dy:-10.89, w:0.051, h:0.369}, {rot:165.11, dx:24.83, dy:-10.89, w:0.051, h:0.369}],
        leg_b21: [{rot:43.5, dx:-15.887, dy:-46.36, w:0.043, h:0.29}, {rot:43.5, dx:-15.887, dy:-46.36, w:0.043, h:0.29}, {rot:43.5, dx:-15.887, dy:-46.36, w:0.043, h:0.29}, {rot:43.5, dx:-15.887, dy:-46.36, w:0.043, h:0.29}, {rot:43.5, dx:-15.887, dy:-46.36, w:0.043, h:0.29}, {rot:43.5, dx:-15.887, dy:-46.36, w:0.043, h:0.29}],
        leg_b41: [{rot:-100.2, dx:75.164, dy:-20.714, w:0.052, h:0.252}, {rot:-100.2, dx:75.164, dy:-20.714, w:0.052, h:0.252}, {rot:-100.2, dx:75.164, dy:-20.714, w:0.052, h:0.252}, {rot:-100.2, dx:75.164, dy:-20.714, w:0.052, h:0.252}, {rot:-100.2, dx:75.164, dy:-20.714, w:0.052, h:0.252}, {rot:-100.2, dx:75.164, dy:-20.714, w:0.052, h:0.252}]
      }
    },
    skill_charge: {
      frameCount: 8, fps: 10, loop: false,
      keys: {
        torso: [{rot:0, dx:-8.42, dy:0.79, w:0.291, h:0.322}, {rot:-3, dx:-8.42, dy:0.79, w:0.291, h:0.322}, {rot:-6, dx:-8.42, dy:0.79, w:0.291, h:0.322}, {rot:-10, dx:-8.42, dy:0.79, w:0.291, h:0.322}, {rot:8, dx:-8.42, dy:0.79, w:0.291, h:0.322}, {rot:15, dx:-8.42, dy:0.79, w:0.291, h:0.322}, {rot:8, dx:-8.42, dy:0.79, w:0.291, h:0.322}, {rot:0, dx:-8.42, dy:0.79, w:0.291, h:0.322}],
        head: [{rot:0.26, dx:6.88, dy:2.85, w:0.18, h:0.18}, {rot:-4.74, dx:6.88, dy:2.85, w:0.18, h:0.18}, {rot:-7.74, dx:6.88, dy:2.85, w:0.18, h:0.18}, {rot:-11.74, dx:6.88, dy:2.85, w:0.18, h:0.18}, {rot:10.26, dx:6.88, dy:2.85, w:0.18, h:0.18}, {rot:15.26, dx:6.88, dy:2.85, w:0.18, h:0.18}, {rot:8.26, dx:6.88, dy:2.85, w:0.18, h:0.18}, {rot:0.26, dx:6.88, dy:2.85, w:0.18, h:0.18}],
        eye: [{rot:-0.26, dx:-10.73, dy:0.94, w:0.077, h:0.056}, {rot:-0.26, dx:-10.73, dy:0.94, w:0.077, h:0.056}, {rot:-0.26, dx:-10.73, dy:0.94, w:0.077, h:0.056}, {rot:-0.26, dx:-10.73, dy:0.94, w:0.077, h:0.056}, {rot:-0.26, dx:-10.73, dy:0.94, w:0.077, h:0.056}, {rot:-0.26, dx:-10.73, dy:0.94, w:0.077, h:0.056}, {rot:-0.26, dx:-10.73, dy:0.94, w:0.077, h:0.056}, {rot:-0.26, dx:-10.73, dy:0.94, w:0.077, h:0.056}],
        mandible: [{rot:0.26, dx:19.34, dy:-4.3, w:0.085, h:0.051}, {rot:0.26, dx:19.34, dy:-6.3, w:0.085, h:0.051}, {rot:0.26, dx:19.34, dy:-7.3, w:0.085, h:0.051}, {rot:0.26, dx:19.34, dy:-8.3, w:0.085, h:0.051}, {rot:0.26, dx:19.34, dy:-1.3, w:0.085, h:0.051}, {rot:0.26, dx:19.34, dy:0.7, w:0.085, h:0.051}, {rot:0.26, dx:19.34, dy:-1.3, w:0.085, h:0.051}, {rot:0.26, dx:19.34, dy:-4.3, w:0.085, h:0.051}],
        abdomen: [{rot:47.3, dx:-11.73, dy:-2.94, w:0.381, h:0.317}, {rot:47.3, dx:-11.73, dy:-2.94, w:0.411, h:0.347}, {rot:47.3, dx:-11.73, dy:-2.94, w:0.451, h:0.377}, {rot:47.3, dx:-11.73, dy:-2.94, w:0.501, h:0.417}, {rot:47.3, dx:-11.73, dy:-2.94, w:0.481, h:0.397}, {rot:47.3, dx:-11.73, dy:-2.94, w:0.431, h:0.357}, {rot:47.3, dx:-11.73, dy:-2.94, w:0.401, h:0.327}, {rot:47.3, dx:-11.73, dy:-2.94, w:0.381, h:0.317}],
        leg_f41: [{rot:140.98, dx:49.84, dy:-23.49, w:0.051, h:0.369}, {rot:140.98, dx:49.84, dy:-23.49, w:0.051, h:0.369}, {rot:140.98, dx:49.84, dy:-23.49, w:0.051, h:0.369}, {rot:140.98, dx:49.84, dy:-23.49, w:0.051, h:0.369}, {rot:140.98, dx:49.84, dy:-23.49, w:0.051, h:0.369}, {rot:140.98, dx:49.84, dy:-23.49, w:0.051, h:0.369}, {rot:140.98, dx:49.84, dy:-23.49, w:0.051, h:0.369}, {rot:140.98, dx:49.84, dy:-23.49, w:0.051, h:0.369}],
        leg_f4: [{rot:-110.9, dx:27.84, dy:-29.97, w:0.055, h:0.137}, {rot:-110.9, dx:27.84, dy:-29.97, w:0.055, h:0.137}, {rot:-110.9, dx:27.84, dy:-29.97, w:0.055, h:0.137}, {rot:-110.9, dx:27.84, dy:-29.97, w:0.055, h:0.137}, {rot:-110.9, dx:27.84, dy:-29.97, w:0.055, h:0.137}, {rot:-110.9, dx:27.84, dy:-29.97, w:0.055, h:0.137}, {rot:-110.9, dx:27.84, dy:-29.97, w:0.055, h:0.137}, {rot:-110.9, dx:27.84, dy:-29.97, w:0.055, h:0.137}],
        leg_f31: [{rot:146.33, dx:33.86, dy:-15.09, w:0.051, h:0.369}, {rot:146.33, dx:33.86, dy:-15.09, w:0.051, h:0.369}, {rot:146.33, dx:33.86, dy:-15.09, w:0.051, h:0.369}, {rot:146.33, dx:33.86, dy:-15.09, w:0.051, h:0.369}, {rot:146.33, dx:33.86, dy:-15.09, w:0.051, h:0.369}, {rot:146.33, dx:33.86, dy:-15.09, w:0.051, h:0.369}, {rot:146.33, dx:33.86, dy:-15.09, w:0.051, h:0.369}, {rot:146.33, dx:33.86, dy:-15.09, w:0.051, h:0.369}],
        leg_f3: [{rot:-20.4, dx:67.86, dy:24.22, w:0.163, h:0.045}, {rot:-20.4, dx:67.86, dy:24.22, w:0.163, h:0.045}, {rot:-20.4, dx:67.86, dy:24.22, w:0.163, h:0.045}, {rot:-20.4, dx:67.86, dy:24.22, w:0.163, h:0.045}, {rot:-20.4, dx:67.86, dy:24.22, w:0.163, h:0.045}, {rot:-20.4, dx:67.86, dy:24.22, w:0.163, h:0.045}, {rot:-20.4, dx:67.86, dy:24.22, w:0.163, h:0.045}, {rot:-20.4, dx:67.86, dy:24.22, w:0.163, h:0.045}],
        leg_f1: [{rot:-227.7, dx:112.25, dy:81.35, w:0.132, h:0.037}, {rot:-227.7, dx:112.25, dy:81.35, w:0.132, h:0.037}, {rot:-227.7, dx:112.25, dy:81.35, w:0.132, h:0.037}, {rot:-227.7, dx:112.25, dy:81.35, w:0.132, h:0.037}, {rot:-227.7, dx:112.25, dy:81.35, w:0.132, h:0.037}, {rot:-227.7, dx:112.25, dy:81.35, w:0.132, h:0.037}, {rot:-227.7, dx:112.25, dy:81.35, w:0.132, h:0.037}, {rot:-227.7, dx:112.25, dy:81.35, w:0.132, h:0.037}],
        leg_f11: [{rot:160.93, dx:13.52, dy:-7.02, w:0.049, h:0.342}, {rot:160.93, dx:13.52, dy:-7.02, w:0.049, h:0.342}, {rot:160.93, dx:13.52, dy:-7.02, w:0.049, h:0.342}, {rot:160.93, dx:13.52, dy:-7.02, w:0.049, h:0.342}, {rot:160.93, dx:13.52, dy:-7.02, w:0.049, h:0.342}, {rot:160.93, dx:13.52, dy:-7.02, w:0.049, h:0.342}, {rot:160.93, dx:13.52, dy:-7.02, w:0.049, h:0.342}, {rot:160.93, dx:13.52, dy:-7.02, w:0.049, h:0.342}],
        leg_b11: [{rot:86.1, dx:143.05, dy:137.11, w:0.128, h:0.04}, {rot:86.1, dx:143.05, dy:137.11, w:0.128, h:0.04}, {rot:86.1, dx:143.05, dy:137.11, w:0.128, h:0.04}, {rot:86.1, dx:143.05, dy:137.11, w:0.128, h:0.04}, {rot:86.1, dx:143.05, dy:137.11, w:0.128, h:0.04}, {rot:86.1, dx:143.05, dy:137.11, w:0.128, h:0.04}, {rot:86.1, dx:143.05, dy:137.11, w:0.128, h:0.04}, {rot:86.1, dx:143.05, dy:137.11, w:0.128, h:0.04}],
        leg_b1: [{rot:-54.68, dx:-15.48, dy:15.1, w:0.054, h:0.395}, {rot:-54.68, dx:-15.48, dy:15.1, w:0.054, h:0.395}, {rot:-54.68, dx:-15.48, dy:15.1, w:0.054, h:0.395}, {rot:-54.68, dx:-15.48, dy:15.1, w:0.054, h:0.395}, {rot:-54.68, dx:-15.48, dy:15.1, w:0.054, h:0.395}, {rot:-54.68, dx:-15.48, dy:15.1, w:0.054, h:0.395}, {rot:-54.68, dx:-15.48, dy:15.1, w:0.054, h:0.395}, {rot:-54.68, dx:-15.48, dy:15.1, w:0.054, h:0.395}],
        eye_copy: [{rot:-0.26, dx:-2.05, dy:1.3, w:0.077, h:0.056}, {rot:-0.26, dx:-2.05, dy:1.3, w:0.077, h:0.056}, {rot:-0.26, dx:-2.05, dy:1.3, w:0.077, h:0.056}, {rot:-0.26, dx:-2.05, dy:1.3, w:0.077, h:0.056}, {rot:-0.26, dx:-2.05, dy:1.3, w:0.077, h:0.056}, {rot:-0.26, dx:-2.05, dy:1.3, w:0.077, h:0.056}, {rot:-0.26, dx:-2.05, dy:1.3, w:0.077, h:0.056}, {rot:-0.26, dx:-2.05, dy:1.3, w:0.077, h:0.056}],
        leg_f2: [{rot:-134.6, dx:15.608, dy:-43, w:0.049, h:0.109}, {rot:-134.6, dx:15.608, dy:-43, w:0.049, h:0.109}, {rot:-134.6, dx:15.608, dy:-43, w:0.049, h:0.109}, {rot:-134.6, dx:15.608, dy:-43, w:0.049, h:0.109}, {rot:-134.6, dx:15.608, dy:-43, w:0.049, h:0.109}, {rot:-134.6, dx:15.608, dy:-43, w:0.049, h:0.109}, {rot:-134.6, dx:15.608, dy:-43, w:0.049, h:0.109}, {rot:-134.6, dx:15.608, dy:-43, w:0.049, h:0.109}],
        leg_b31: [{rot:-97, dx:62.853, dy:28.255, w:0.048, h:0.242}, {rot:-97, dx:62.853, dy:28.255, w:0.048, h:0.242}, {rot:-97, dx:62.853, dy:28.255, w:0.048, h:0.242}, {rot:-97, dx:62.853, dy:28.255, w:0.048, h:0.242}, {rot:-97, dx:62.853, dy:28.255, w:0.048, h:0.242}, {rot:-97, dx:62.853, dy:28.255, w:0.048, h:0.242}, {rot:-97, dx:62.853, dy:28.255, w:0.048, h:0.242}, {rot:-97, dx:62.853, dy:28.255, w:0.048, h:0.242}],
        leg_b3: [{rot:130.4, dx:123.09, dy:85.37, w:0.046, h:0.123}, {rot:130.4, dx:123.09, dy:85.37, w:0.046, h:0.123}, {rot:130.4, dx:123.09, dy:85.37, w:0.046, h:0.123}, {rot:130.4, dx:123.09, dy:85.37, w:0.046, h:0.123}, {rot:130.4, dx:123.09, dy:85.37, w:0.046, h:0.123}, {rot:130.4, dx:123.09, dy:85.37, w:0.046, h:0.123}, {rot:130.4, dx:123.09, dy:85.37, w:0.046, h:0.123}, {rot:130.4, dx:123.09, dy:85.37, w:0.046, h:0.123}],
        leg_b2: [{rot:8.3, dx:95.34, dy:82.29, w:0.163, h:0.045}, {rot:8.3, dx:95.34, dy:82.29, w:0.163, h:0.045}, {rot:8.3, dx:95.34, dy:82.29, w:0.163, h:0.045}, {rot:8.3, dx:95.34, dy:82.29, w:0.163, h:0.045}, {rot:8.3, dx:95.34, dy:82.29, w:0.163, h:0.045}, {rot:8.3, dx:95.34, dy:82.29, w:0.163, h:0.045}, {rot:8.3, dx:95.34, dy:82.29, w:0.163, h:0.045}, {rot:8.3, dx:95.34, dy:82.29, w:0.163, h:0.045}],
        leg_b4: [{rot:139.64, dx:21.15, dy:-19.51, w:0.044, h:0.123}, {rot:139.64, dx:21.15, dy:-19.51, w:0.044, h:0.123}, {rot:139.64, dx:21.15, dy:-19.51, w:0.044, h:0.123}, {rot:139.64, dx:21.15, dy:-19.51, w:0.044, h:0.123}, {rot:139.64, dx:21.15, dy:-19.51, w:0.044, h:0.123}, {rot:139.64, dx:21.15, dy:-19.51, w:0.044, h:0.123}, {rot:139.64, dx:21.15, dy:-19.51, w:0.044, h:0.123}, {rot:139.64, dx:21.15, dy:-19.51, w:0.044, h:0.123}],
        leg_f21: [{rot:165.11, dx:24.83, dy:-10.89, w:0.051, h:0.369}, {rot:165.11, dx:24.83, dy:-10.89, w:0.051, h:0.369}, {rot:165.11, dx:24.83, dy:-10.89, w:0.051, h:0.369}, {rot:165.11, dx:24.83, dy:-10.89, w:0.051, h:0.369}, {rot:165.11, dx:24.83, dy:-10.89, w:0.051, h:0.369}, {rot:165.11, dx:24.83, dy:-10.89, w:0.051, h:0.369}, {rot:165.11, dx:24.83, dy:-10.89, w:0.051, h:0.369}, {rot:165.11, dx:24.83, dy:-10.89, w:0.051, h:0.369}],
        leg_b21: [{rot:43.5, dx:-15.887, dy:-46.36, w:0.043, h:0.29}, {rot:43.5, dx:-15.887, dy:-46.36, w:0.043, h:0.29}, {rot:43.5, dx:-15.887, dy:-46.36, w:0.043, h:0.29}, {rot:43.5, dx:-15.887, dy:-46.36, w:0.043, h:0.29}, {rot:43.5, dx:-15.887, dy:-46.36, w:0.043, h:0.29}, {rot:43.5, dx:-15.887, dy:-46.36, w:0.043, h:0.29}, {rot:43.5, dx:-15.887, dy:-46.36, w:0.043, h:0.29}, {rot:43.5, dx:-15.887, dy:-46.36, w:0.043, h:0.29}],
        leg_b41: [{rot:-100.2, dx:75.164, dy:-20.714, w:0.052, h:0.252}, {rot:-100.2, dx:75.164, dy:-20.714, w:0.052, h:0.252}, {rot:-100.2, dx:75.164, dy:-20.714, w:0.052, h:0.252}, {rot:-100.2, dx:75.164, dy:-20.714, w:0.052, h:0.252}, {rot:-100.2, dx:75.164, dy:-20.714, w:0.052, h:0.252}, {rot:-100.2, dx:75.164, dy:-20.714, w:0.052, h:0.252}, {rot:-100.2, dx:75.164, dy:-20.714, w:0.052, h:0.252}, {rot:-100.2, dx:75.164, dy:-20.714, w:0.052, h:0.252}]
      }
    },
    hurt: {
      frameCount: 4, fps: 12, loop: false,
      keys: {
        torso: [{rot:0, dx:-8.42, dy:0.79, w:0.291, h:0.322}, {rot:0, dx:-11.42, dy:0.79, w:0.291, h:0.322}, {rot:0, dx:-5.42, dy:0.79, w:0.291, h:0.322}, {rot:0, dx:-8.42, dy:0.79, w:0.291, h:0.322}],
        head: [{rot:0.26, dx:6.88, dy:2.85, w:0.18, h:0.18}, {rot:0.26, dx:3.88, dy:2.85, w:0.18, h:0.18}, {rot:0.26, dx:9.88, dy:2.85, w:0.18, h:0.18}, {rot:0.26, dx:6.88, dy:2.85, w:0.18, h:0.18}],
        eye: [{rot:-0.26, dx:-10.73, dy:0.94, w:0.077, h:0.056}, {rot:-0.26, dx:-13.73, dy:0.94, w:0.077, h:0.056}, {rot:-0.26, dx:-7.73, dy:0.94, w:0.077, h:0.056}, {rot:-0.26, dx:-10.73, dy:0.94, w:0.077, h:0.056}],
        mandible: [{rot:0.26, dx:19.34, dy:-4.3, w:0.085, h:0.051}, {rot:0.26, dx:16.34, dy:-4.3, w:0.085, h:0.051}, {rot:0.26, dx:22.34, dy:-4.3, w:0.085, h:0.051}, {rot:0.26, dx:19.34, dy:-4.3, w:0.085, h:0.051}],
        abdomen: [{rot:47.3, dx:-11.73, dy:-2.94, w:0.381, h:0.317}, {rot:47.3, dx:-15.73, dy:-2.94, w:0.381, h:0.317}, {rot:47.3, dx:-7.73, dy:-2.94, w:0.381, h:0.317}, {rot:47.3, dx:-11.73, dy:-2.94, w:0.381, h:0.317}],
        leg_f41: [{rot:140.98, dx:49.84, dy:-23.49, w:0.051, h:0.369}, {rot:140.98, dx:47.84, dy:-23.49, w:0.051, h:0.369}, {rot:140.98, dx:51.84, dy:-23.49, w:0.051, h:0.369}, {rot:140.98, dx:49.84, dy:-23.49, w:0.051, h:0.369}],
        leg_f4: [{rot:-110.9, dx:27.84, dy:-29.97, w:0.055, h:0.137}, {rot:-110.9, dx:25.84, dy:-29.97, w:0.055, h:0.137}, {rot:-110.9, dx:29.84, dy:-29.97, w:0.055, h:0.137}, {rot:-110.9, dx:27.84, dy:-29.97, w:0.055, h:0.137}],
        leg_f31: [{rot:146.33, dx:33.86, dy:-15.09, w:0.051, h:0.369}, {rot:146.33, dx:31.86, dy:-15.09, w:0.051, h:0.369}, {rot:146.33, dx:35.86, dy:-15.09, w:0.051, h:0.369}, {rot:146.33, dx:33.86, dy:-15.09, w:0.051, h:0.369}],
        leg_f3: [{rot:-20.4, dx:67.86, dy:24.22, w:0.163, h:0.045}, {rot:-20.4, dx:65.86, dy:24.22, w:0.163, h:0.045}, {rot:-20.4, dx:69.86, dy:24.22, w:0.163, h:0.045}, {rot:-20.4, dx:67.86, dy:24.22, w:0.163, h:0.045}],
        leg_f1: [{rot:-227.7, dx:112.25, dy:81.35, w:0.132, h:0.037}, {rot:-227.7, dx:110.25, dy:81.35, w:0.132, h:0.037}, {rot:-227.7, dx:114.25, dy:81.35, w:0.132, h:0.037}, {rot:-227.7, dx:112.25, dy:81.35, w:0.132, h:0.037}],
        leg_f11: [{rot:160.93, dx:13.52, dy:-7.02, w:0.049, h:0.342}, {rot:160.93, dx:11.52, dy:-7.02, w:0.049, h:0.342}, {rot:160.93, dx:15.52, dy:-7.02, w:0.049, h:0.342}, {rot:160.93, dx:13.52, dy:-7.02, w:0.049, h:0.342}],
        leg_b11: [{rot:86.1, dx:143.05, dy:137.11, w:0.128, h:0.04}, {rot:86.1, dx:141.05, dy:137.11, w:0.128, h:0.04}, {rot:86.1, dx:145.05, dy:137.11, w:0.128, h:0.04}, {rot:86.1, dx:143.05, dy:137.11, w:0.128, h:0.04}],
        leg_b1: [{rot:-54.68, dx:-15.48, dy:15.1, w:0.054, h:0.395}, {rot:-54.68, dx:-17.48, dy:15.1, w:0.054, h:0.395}, {rot:-54.68, dx:-13.48, dy:15.1, w:0.054, h:0.395}, {rot:-54.68, dx:-15.48, dy:15.1, w:0.054, h:0.395}],
        eye_copy: [{rot:-0.26, dx:-2.05, dy:1.3, w:0.077, h:0.056}, {rot:-0.26, dx:-5.05, dy:1.3, w:0.077, h:0.056}, {rot:-0.26, dx:0.95, dy:1.3, w:0.077, h:0.056}, {rot:-0.26, dx:-2.05, dy:1.3, w:0.077, h:0.056}],
        leg_f2: [{rot:-134.6, dx:15.608, dy:-43, w:0.049, h:0.109}, {rot:-134.6, dx:13.608, dy:-43, w:0.049, h:0.109}, {rot:-134.6, dx:17.608, dy:-43, w:0.049, h:0.109}, {rot:-134.6, dx:15.608, dy:-43, w:0.049, h:0.109}],
        leg_b31: [{rot:-97, dx:62.853, dy:28.255, w:0.048, h:0.242}, {rot:-97, dx:60.853, dy:28.255, w:0.048, h:0.242}, {rot:-97, dx:64.853, dy:28.255, w:0.048, h:0.242}, {rot:-97, dx:62.853, dy:28.255, w:0.048, h:0.242}],
        leg_b3: [{rot:130.4, dx:123.09, dy:85.37, w:0.046, h:0.123}, {rot:130.4, dx:121.09, dy:85.37, w:0.046, h:0.123}, {rot:130.4, dx:125.09, dy:85.37, w:0.046, h:0.123}, {rot:130.4, dx:123.09, dy:85.37, w:0.046, h:0.123}],
        leg_b2: [{rot:8.3, dx:95.34, dy:82.29, w:0.163, h:0.045}, {rot:8.3, dx:97.319, dy:82.521, w:0.163, h:0.045}, {rot:8.3, dx:93.361, dy:82.059, w:0.163, h:0.045}, {rot:8.3, dx:95.34, dy:82.29, w:0.163, h:0.045}],
        leg_b4: [{rot:139.64, dx:21.15, dy:-19.51, w:0.044, h:0.123}, {rot:139.64, dx:19.15, dy:-19.51, w:0.044, h:0.123}, {rot:139.64, dx:23.15, dy:-19.51, w:0.044, h:0.123}, {rot:139.64, dx:21.15, dy:-19.51, w:0.044, h:0.123}],
        leg_f21: [{rot:165.11, dx:24.83, dy:-10.89, w:0.051, h:0.369}, {rot:165.11, dx:22.83, dy:-10.89, w:0.051, h:0.369}, {rot:165.11, dx:26.83, dy:-10.89, w:0.051, h:0.369}, {rot:165.11, dx:24.83, dy:-10.89, w:0.051, h:0.369}],
        leg_b21: [{rot:43.5, dx:-15.887, dy:-46.36, w:0.043, h:0.29}, {rot:43.5, dx:-19.124, dy:-47.617, w:0.043, h:0.29}, {rot:43.5, dx:-12.65, dy:-45.103, w:0.043, h:0.29}, {rot:43.5, dx:-15.887, dy:-46.36, w:0.043, h:0.29}],
        leg_b41: [{rot:-100.2, dx:75.164, dy:-20.714, w:0.052, h:0.252}, {rot:-100.2, dx:73.164, dy:-20.714, w:0.052, h:0.252}, {rot:-100.2, dx:77.164, dy:-20.714, w:0.052, h:0.252}, {rot:-100.2, dx:75.164, dy:-20.714, w:0.052, h:0.252}]
      }
    },
    death: {
      frameCount: 6, fps: 8, loop: false,
      keys: {
        torso: [{rot:0, dx:-8.42, dy:0.79, w:0.291, h:0.322}, {rot:5, dx:-8.42, dy:0.79, w:0.291, h:0.322}, {rot:15, dx:-8.42, dy:0.79, w:0.291, h:0.322}, {rot:30, dx:-8.42, dy:0.79, w:0.291, h:0.322}, {rot:45, dx:-8.42, dy:0.79, w:0.291, h:0.322}, {rot:60, dx:-8.42, dy:0.79, w:0.291, h:0.322}],
        head: [{rot:0.26, dx:6.88, dy:2.85, w:0.18, h:0.18}, {rot:8.26, dx:6.88, dy:2.85, w:0.18, h:0.18}, {rot:20.26, dx:6.88, dy:2.85, w:0.18, h:0.18}, {rot:35.26, dx:6.88, dy:2.85, w:0.18, h:0.18}, {rot:50.26, dx:6.88, dy:2.85, w:0.18, h:0.18}, {rot:65.26, dx:6.88, dy:2.85, w:0.18, h:0.18}],
        eye: [{rot:-0.26, dx:-10.73, dy:0.94, w:0.077, h:0.056}, {rot:7.74, dx:-10.73, dy:0.94, w:0.077, h:0.056}, {rot:19.74, dx:-10.73, dy:0.94, w:0.077, h:0.056}, {rot:34.74, dx:-10.73, dy:0.94, w:0.077, h:0.056}, {rot:49.74, dx:-10.73, dy:0.94, w:0.077, h:0.056}, {rot:64.74, dx:-10.73, dy:0.94, w:0.077, h:0.056}],
        mandible: [{rot:0.26, dx:19.34, dy:-4.3, w:0.085, h:0.051}, {rot:10.26, dx:19.34, dy:-4.3, w:0.085, h:0.051}, {rot:25.26, dx:19.34, dy:-4.3, w:0.085, h:0.051}, {rot:40.26, dx:19.34, dy:-4.3, w:0.085, h:0.051}, {rot:55.26, dx:19.34, dy:-4.3, w:0.085, h:0.051}, {rot:70.26, dx:19.34, dy:-4.3, w:0.085, h:0.051}],
        abdomen: [{rot:47.3, dx:-11.73, dy:-2.94, w:0.381, h:0.317}, {rot:47.3, dx:-11.73, dy:0.06, w:0.381, h:0.317}, {rot:47.3, dx:-11.73, dy:5.06, w:0.381, h:0.317}, {rot:47.3, dx:-11.73, dy:12.06, w:0.381, h:0.317}, {rot:47.3, dx:-11.73, dy:19.06, w:0.381, h:0.317}, {rot:47.3, dx:-11.73, dy:25.06, w:0.381, h:0.317}],
        leg_f41: [{rot:140.98, dx:49.84, dy:-23.49, w:0.051, h:0.369}, {rot:130.98, dx:49.84, dy:-23.49, w:0.051, h:0.369}, {rot:120.98, dx:49.84, dy:-23.49, w:0.051, h:0.369}, {rot:110.98, dx:49.84, dy:-23.49, w:0.051, h:0.369}, {rot:100.98, dx:49.84, dy:-23.49, w:0.051, h:0.369}, {rot:90.98, dx:49.84, dy:-23.49, w:0.051, h:0.369}],
        leg_f4: [{rot:-110.9, dx:27.84, dy:-29.97, w:0.055, h:0.137}, {rot:-102.9, dx:27.84, dy:-29.97, w:0.055, h:0.137}, {rot:-94.9, dx:27.84, dy:-29.97, w:0.055, h:0.137}, {rot:-86.9, dx:27.84, dy:-29.97, w:0.055, h:0.137}, {rot:-78.9, dx:27.84, dy:-29.97, w:0.055, h:0.137}, {rot:-70.9, dx:27.84, dy:-29.97, w:0.055, h:0.137}],
        leg_f31: [{rot:146.33, dx:33.86, dy:-15.09, w:0.051, h:0.369}, {rot:136.33, dx:33.86, dy:-15.09, w:0.051, h:0.369}, {rot:126.33, dx:33.86, dy:-15.09, w:0.051, h:0.369}, {rot:116.33, dx:33.86, dy:-15.09, w:0.051, h:0.369}, {rot:106.33, dx:33.86, dy:-15.09, w:0.051, h:0.369}, {rot:96.33, dx:33.86, dy:-15.09, w:0.051, h:0.369}],
        leg_f3: [{rot:-20.4, dx:67.86, dy:24.22, w:0.163, h:0.045}, {rot:-12.4, dx:67.86, dy:24.22, w:0.163, h:0.045}, {rot:-4.4, dx:67.86, dy:24.22, w:0.163, h:0.045}, {rot:3.6, dx:67.86, dy:24.22, w:0.163, h:0.045}, {rot:11.6, dx:67.86, dy:24.22, w:0.163, h:0.045}, {rot:19.6, dx:67.86, dy:24.22, w:0.163, h:0.045}],
        leg_f1: [{rot:-227.7, dx:112.25, dy:81.35, w:0.132, h:0.037}, {rot:-219.7, dx:112.25, dy:81.35, w:0.132, h:0.037}, {rot:-211.7, dx:112.25, dy:81.35, w:0.132, h:0.037}, {rot:-203.7, dx:112.25, dy:81.35, w:0.132, h:0.037}, {rot:-195.7, dx:112.25, dy:81.35, w:0.132, h:0.037}, {rot:-187.7, dx:112.25, dy:81.35, w:0.132, h:0.037}],
        leg_f11: [{rot:160.93, dx:13.52, dy:-7.02, w:0.049, h:0.342}, {rot:150.93, dx:13.52, dy:-7.02, w:0.049, h:0.342}, {rot:140.93, dx:13.52, dy:-7.02, w:0.049, h:0.342}, {rot:130.93, dx:13.52, dy:-7.02, w:0.049, h:0.342}, {rot:120.93, dx:13.52, dy:-7.02, w:0.049, h:0.342}, {rot:110.93, dx:13.52, dy:-7.02, w:0.049, h:0.342}],
        leg_b11: [{rot:86.1, dx:143.05, dy:137.11, w:0.128, h:0.04}, {rot:76.1, dx:143.05, dy:137.11, w:0.128, h:0.04}, {rot:66.1, dx:143.05, dy:137.11, w:0.128, h:0.04}, {rot:56.1, dx:143.05, dy:137.11, w:0.128, h:0.04}, {rot:46.1, dx:143.05, dy:137.11, w:0.128, h:0.04}, {rot:36.1, dx:143.05, dy:137.11, w:0.128, h:0.04}],
        leg_b1: [{rot:-54.68, dx:-15.48, dy:15.1, w:0.054, h:0.395}, {rot:-46.68, dx:-15.48, dy:15.1, w:0.054, h:0.395}, {rot:-38.68, dx:-15.48, dy:15.1, w:0.054, h:0.395}, {rot:-30.68, dx:-15.48, dy:15.1, w:0.054, h:0.395}, {rot:-22.68, dx:-15.48, dy:15.1, w:0.054, h:0.395}, {rot:-14.68, dx:-15.48, dy:15.1, w:0.054, h:0.395}],
        eye_copy: [{rot:-0.26, dx:-2.05, dy:1.3, w:0.077, h:0.056}, {rot:7.74, dx:-2.05, dy:1.3, w:0.077, h:0.056}, {rot:19.74, dx:-2.05, dy:1.3, w:0.077, h:0.056}, {rot:34.74, dx:-2.05, dy:1.3, w:0.077, h:0.056}, {rot:49.74, dx:-2.05, dy:1.3, w:0.077, h:0.056}, {rot:64.74, dx:-2.05, dy:1.3, w:0.077, h:0.056}],
        leg_f2: [{rot:-134.6, dx:15.608, dy:-43, w:0.049, h:0.109}, {rot:-126.6, dx:15.608, dy:-43, w:0.049, h:0.109}, {rot:-118.6, dx:15.608, dy:-43, w:0.049, h:0.109}, {rot:-110.6, dx:15.608, dy:-43, w:0.049, h:0.109}, {rot:-102.6, dx:15.608, dy:-43, w:0.049, h:0.109}, {rot:-94.6, dx:15.608, dy:-43, w:0.049, h:0.109}],
        leg_b31: [{rot:-97, dx:62.853, dy:28.255, w:0.048, h:0.242}, {rot:-107, dx:62.853, dy:28.255, w:0.048, h:0.242}, {rot:-117, dx:62.853, dy:28.255, w:0.048, h:0.242}, {rot:-127, dx:62.853, dy:28.255, w:0.048, h:0.242}, {rot:-137, dx:62.853, dy:28.255, w:0.048, h:0.242}, {rot:-147, dx:62.853, dy:28.255, w:0.048, h:0.242}],
        leg_b3: [{rot:130.4, dx:123.09, dy:85.37, w:0.046, h:0.123}, {rot:138.4, dx:123.09, dy:85.37, w:0.046, h:0.123}, {rot:146.4, dx:123.09, dy:85.37, w:0.046, h:0.123}, {rot:154.4, dx:123.09, dy:85.37, w:0.046, h:0.123}, {rot:162.4, dx:123.09, dy:85.37, w:0.046, h:0.123}, {rot:170.4, dx:123.09, dy:85.37, w:0.046, h:0.123}],
        leg_b2: [{rot:8.3, dx:95.34, dy:82.29, w:0.163, h:0.045}, {rot:18.3, dx:101.426, dy:83.683, w:0.163, h:0.045}, {rot:28.3, dx:107.114, dy:85.904, w:0.163, h:0.045}, {rot:38.3, dx:112.231, dy:88.885, w:0.163, h:0.045}, {rot:48.3, dx:116.618, dy:92.537, w:0.163, h:0.045}, {rot:58.3, dx:120.144, dy:96.746, w:0.163, h:0.045}],
        leg_b4: [{rot:139.64, dx:21.15, dy:-19.51, w:0.044, h:0.123}, {rot:147.64, dx:21.15, dy:-19.51, w:0.044, h:0.123}, {rot:155.64, dx:21.15, dy:-19.51, w:0.044, h:0.123}, {rot:163.64, dx:21.15, dy:-19.51, w:0.044, h:0.123}, {rot:171.64, dx:21.15, dy:-19.51, w:0.044, h:0.123}, {rot:179.64, dx:21.15, dy:-19.51, w:0.044, h:0.123}],
        leg_f21: [{rot:165.11, dx:24.83, dy:-10.89, w:0.051, h:0.369}, {rot:155.11, dx:24.83, dy:-10.89, w:0.051, h:0.369}, {rot:145.11, dx:24.83, dy:-10.89, w:0.051, h:0.369}, {rot:135.11, dx:24.83, dy:-10.89, w:0.051, h:0.369}, {rot:125.11, dx:24.83, dy:-10.89, w:0.051, h:0.369}, {rot:115.11, dx:24.83, dy:-10.89, w:0.051, h:0.369}],
        leg_b21: [{rot:43.5, dx:-15.887, dy:-46.36, w:0.043, h:0.29}, {rot:41.5, dx:-18.549, dy:-49.84, w:0.043, h:0.29}, {rot:39.5, dx:-20.58, dy:-53.583, w:0.043, h:0.29}, {rot:37.5, dx:-21.941, dy:-57.515, w:0.043, h:0.29}, {rot:35.5, dx:-22.603, dy:-61.561, w:0.043, h:0.29}, {rot:49.13, dx:-19.24, dy:-65.14, w:0.043, h:0.29}],
        leg_b41: [{rot:-100.2, dx:75.164, dy:-20.714, w:0.052, h:0.252}, {rot:-110.2, dx:75.164, dy:-20.714, w:0.052, h:0.252}, {rot:-120.2, dx:75.164, dy:-20.714, w:0.052, h:0.252}, {rot:-130.2, dx:75.164, dy:-20.714, w:0.052, h:0.252}, {rot:-140.2, dx:75.164, dy:-20.714, w:0.052, h:0.252}, {rot:-150.2, dx:75.164, dy:-20.714, w:0.052, h:0.252}]
      }
    }
  },
  road_tyrant: {
    idle: {
      frameCount: 4, fps: 4, loop: true,
      keys: {
        leg_r: [{rot:0.7, dx:3.93, dy:0.93, w:0.109, h:0.384}, {rot:0.7, dx:3.93, dy:0.93, w:0.109, h:0.384}, {rot:0.7, dx:3.93, dy:0.93, w:0.109, h:0.384}, {rot:0.7, dx:3.93, dy:0.93, w:0.109, h:0.384}],
        leg_l: [{rot:0, dx:12.26, dy:0.29, w:0.121, h:0.374}, {rot:0, dx:12.26, dy:0.29, w:0.121, h:0.374}, {rot:0, dx:12.26, dy:0.29, w:0.121, h:0.374}, {rot:0, dx:12.26, dy:0.29, w:0.121, h:0.374}],
        torso: [{rot:0, dx:22.47, dy:7.96, w:0.457, h:0.476}, {rot:0, dx:22.47, dy:6.96, w:0.457, h:0.476}, {rot:0, dx:22.47, dy:5.96, w:0.457, h:0.476}, {rot:0, dx:22.47, dy:6.96, w:0.457, h:0.476}],
        arm_r: [{rot:-12, dx:-7.79, dy:-0.79, w:0.13, h:0.34}, {rot:-12, dx:-7.79, dy:-1.79, w:0.13, h:0.34}, {rot:-12, dx:-7.79, dy:-2.79, w:0.13, h:0.34}, {rot:-12, dx:-7.79, dy:-1.79, w:0.13, h:0.34}],
        shoulder_r: [{rot:0, dx:-6.89, dy:10.82, w:0.2, h:0.2}, {rot:0, dx:-6.89, dy:9.82, w:0.2, h:0.2}, {rot:0, dx:-6.89, dy:8.82, w:0.2, h:0.2}, {rot:0, dx:-6.89, dy:9.82, w:0.2, h:0.2}],
        arm_l: [{rot:-102.2, dx:10.21, dy:14.77, w:0.136, h:0.272}, {rot:-102.2, dx:10.21, dy:13.77, w:0.136, h:0.272}, {rot:-102.2, dx:10.21, dy:12.77, w:0.136, h:0.272}, {rot:-102.2, dx:10.21, dy:13.77, w:0.136, h:0.272}],
        shoulder_l: [{rot:0, dx:20.5, dy:12.47, w:0.2, h:0.2}, {rot:0, dx:20.5, dy:11.47, w:0.2, h:0.2}, {rot:0, dx:20.5, dy:10.47, w:0.2, h:0.2}, {rot:0, dx:20.5, dy:11.47, w:0.2, h:0.2}],
        head: [{rot:0, dx:2.77, dy:15.05, w:0.2, h:0.16}, {rot:0, dx:2.77, dy:14.05, w:0.2, h:0.16}, {rot:0, dx:2.77, dy:13.05, w:0.2, h:0.16}, {rot:0, dx:2.77, dy:14.05, w:0.2, h:0.16}],
        helmet: [{rot:0, dx:1.97, dy:10.17, w:0.22, h:0.2}, {rot:0, dx:1.97, dy:10.17, w:0.22, h:0.2}, {rot:0, dx:1.97, dy:10.17, w:0.22, h:0.2}, {rot:0, dx:1.97, dy:10.17, w:0.22, h:0.2}],
        visor: [{rot:0, dx:0, dy:0, w:0.16, h:0.05}, {rot:0, dx:0, dy:0, w:0.16, h:0.05}, {rot:0, dx:0, dy:0, w:0.16, h:0.05}, {rot:0, dx:0, dy:0, w:0.16, h:0.05}],
        'hammer-h': [{rot:-132.44, dx:-19.51, dy:16.04, w:0.06, h:0.38}, {rot:-132.44, dx:-19.51, dy:15.04, w:0.06, h:0.38}, {rot:-132.44, dx:-19.51, dy:14.04, w:0.06, h:0.38}, {rot:-132.44, dx:-19.51, dy:15.04, w:0.06, h:0.38}],
        hammer: [{rot:0, dx:0.81, dy:6.88, w:0.092, h:0.226}, {rot:0, dx:0.81, dy:6.88, w:0.092, h:0.226}, {rot:0, dx:0.81, dy:6.88, w:0.092, h:0.226}, {rot:0, dx:0.81, dy:6.88, w:0.092, h:0.226}],
        shield: [{rot:91, dx:33.6, dy:21.48, w:0.371, h:0.448}, {rot:91, dx:33.6, dy:21.48, w:0.371, h:0.448}, {rot:91, dx:33.6, dy:21.48, w:0.371, h:0.448}, {rot:91, dx:33.6, dy:21.48, w:0.371, h:0.448}],
        'shield-2': [{rot:-89.6, dx:9.39, dy:-2.78, w:0.678, h:0.114}, {rot:-89.6, dx:9.39, dy:-2.78, w:0.678, h:0.114}, {rot:-89.6, dx:9.39, dy:-2.78, w:0.678, h:0.114}, {rot:-89.6, dx:9.39, dy:-2.78, w:0.678, h:0.114}],
        'shield-2_copy': [{rot:59.2, dx:0.35, dy:-0.43, w:0.125, h:0.122}, {rot:59.2, dx:0.35, dy:-0.43, w:0.125, h:0.122}, {rot:59.2, dx:0.35, dy:-0.43, w:0.125, h:0.122}, {rot:59.2, dx:0.35, dy:-0.43, w:0.125, h:0.122}],
        'shield-2_copy_1': [{rot:-57.5, dx:18.35, dy:-0.21, w:0.125, h:0.122}, {rot:-57.5, dx:18.35, dy:-0.21, w:0.125, h:0.122}, {rot:-57.5, dx:18.35, dy:-0.21, w:0.125, h:0.122}, {rot:-57.5, dx:18.35, dy:-0.21, w:0.125, h:0.122}]
      }
    },
    walk: {
      frameCount: 8, fps: 10, loop: true,
      keys: {
        leg_r: [{rot:8.7, dx:3.93, dy:0.93, w:0.109, h:0.384}, {rot:4.7, dx:3.93, dy:0.93, w:0.109, h:0.384}, {rot:0.7, dx:3.93, dy:0.93, w:0.109, h:0.384}, {rot:-3.3, dx:3.93, dy:0.93, w:0.109, h:0.384}, {rot:-7.3, dx:3.93, dy:0.93, w:0.109, h:0.384}, {rot:-3.3, dx:3.93, dy:0.93, w:0.109, h:0.384}, {rot:0.7, dx:3.93, dy:0.93, w:0.109, h:0.384}, {rot:4.7, dx:3.93, dy:0.93, w:0.109, h:0.384}],
        leg_l: [{rot:-8, dx:12.26, dy:0.29, w:0.121, h:0.374}, {rot:-4, dx:12.26, dy:0.29, w:0.121, h:0.374}, {rot:0, dx:12.26, dy:0.29, w:0.121, h:0.374}, {rot:4, dx:12.26, dy:0.29, w:0.121, h:0.374}, {rot:8, dx:12.26, dy:0.29, w:0.121, h:0.374}, {rot:4, dx:12.26, dy:0.29, w:0.121, h:0.374}, {rot:0, dx:12.26, dy:0.29, w:0.121, h:0.374}, {rot:-4, dx:12.26, dy:0.29, w:0.121, h:0.374}],
        torso: [{rot:0, dx:22.47, dy:7.96, w:0.457, h:0.476}, {rot:0, dx:22.47, dy:6.96, w:0.457, h:0.476}, {rot:0, dx:22.47, dy:7.96, w:0.457, h:0.476}, {rot:0, dx:22.47, dy:6.96, w:0.457, h:0.476}, {rot:0, dx:22.47, dy:7.96, w:0.457, h:0.476}, {rot:0, dx:22.47, dy:6.96, w:0.457, h:0.476}, {rot:0, dx:22.47, dy:7.96, w:0.457, h:0.476}, {rot:0, dx:22.47, dy:6.96, w:0.457, h:0.476}],
        arm_r: [{rot:-18, dx:-7.79, dy:-0.79, w:0.13, h:0.34}, {rot:-15, dx:-7.79, dy:-0.79, w:0.13, h:0.34}, {rot:-12, dx:-7.79, dy:-0.79, w:0.13, h:0.34}, {rot:-9, dx:-7.79, dy:-0.79, w:0.13, h:0.34}, {rot:-6, dx:-7.79, dy:-0.79, w:0.13, h:0.34}, {rot:-9, dx:-7.79, dy:-0.79, w:0.13, h:0.34}, {rot:-12, dx:-7.79, dy:-0.79, w:0.13, h:0.34}, {rot:-15, dx:-7.79, dy:-0.79, w:0.13, h:0.34}],
        shoulder_r: [{rot:0, dx:-6.89, dy:10.82, w:0.2, h:0.2}, {rot:0, dx:-6.89, dy:9.82, w:0.2, h:0.2}, {rot:0, dx:-6.89, dy:10.82, w:0.2, h:0.2}, {rot:0, dx:-6.89, dy:9.82, w:0.2, h:0.2}, {rot:0, dx:-6.89, dy:10.82, w:0.2, h:0.2}, {rot:0, dx:-6.89, dy:9.82, w:0.2, h:0.2}, {rot:0, dx:-6.89, dy:10.82, w:0.2, h:0.2}, {rot:0, dx:-6.89, dy:9.82, w:0.2, h:0.2}],
        arm_l: [{rot:-102.2, dx:10.21, dy:14.77, w:0.136, h:0.272}, {rot:-103, dx:10.16, dy:14.87, w:0.136, h:0.272}, {rot:-105.14, dx:10.04, dy:15.14, w:0.136, h:0.272}, {rot:-103.6, dx:10.13, dy:14.94, w:0.136, h:0.272}, {rot:-102.37, dx:10.2, dy:14.79, w:0.136, h:0.272}, {rot:-101.87, dx:10.23, dy:14.73, w:0.136, h:0.272}, {rot:-103.96, dx:10.1, dy:14.99, w:0.136, h:0.272}, {rot:-106.55, dx:9.96, dy:15.32, w:0.136, h:0.272}],
        shoulder_l: [{rot:0, dx:20.5, dy:12.47, w:0.2, h:0.2}, {rot:0, dx:20.5, dy:11.47, w:0.2, h:0.2}, {rot:0, dx:20.5, dy:12.47, w:0.2, h:0.2}, {rot:0, dx:20.5, dy:11.47, w:0.2, h:0.2}, {rot:0, dx:20.5, dy:12.47, w:0.2, h:0.2}, {rot:0, dx:20.5, dy:11.47, w:0.2, h:0.2}, {rot:0, dx:20.5, dy:12.47, w:0.2, h:0.2}, {rot:0, dx:20.5, dy:11.47, w:0.2, h:0.2}],
        head: [{rot:0, dx:2.77, dy:15.05, w:0.2, h:0.16}, {rot:0, dx:2.77, dy:14.05, w:0.2, h:0.16}, {rot:0, dx:2.77, dy:15.05, w:0.2, h:0.16}, {rot:0, dx:2.77, dy:14.05, w:0.2, h:0.16}, {rot:0, dx:2.77, dy:15.05, w:0.2, h:0.16}, {rot:0, dx:2.77, dy:14.05, w:0.2, h:0.16}, {rot:0, dx:2.77, dy:15.05, w:0.2, h:0.16}, {rot:0, dx:2.77, dy:14.05, w:0.2, h:0.16}],
        helmet: [{rot:0, dx:1.97, dy:10.17, w:0.22, h:0.2}, {rot:0, dx:1.97, dy:10.17, w:0.22, h:0.2}, {rot:0, dx:1.97, dy:10.17, w:0.22, h:0.2}, {rot:0, dx:1.97, dy:10.17, w:0.22, h:0.2}, {rot:0, dx:1.97, dy:10.17, w:0.22, h:0.2}, {rot:0, dx:1.97, dy:10.17, w:0.22, h:0.2}, {rot:0, dx:1.97, dy:10.17, w:0.22, h:0.2}, {rot:0, dx:1.97, dy:10.17, w:0.22, h:0.2}],
        visor: [{rot:0, dx:0, dy:0, w:0.16, h:0.05}, {rot:0, dx:0, dy:0, w:0.16, h:0.05}, {rot:0, dx:0, dy:0, w:0.16, h:0.05}, {rot:0, dx:0, dy:0, w:0.16, h:0.05}, {rot:0, dx:0, dy:0, w:0.16, h:0.05}, {rot:0, dx:0, dy:0, w:0.16, h:0.05}, {rot:0, dx:0, dy:0, w:0.16, h:0.05}, {rot:0, dx:0, dy:0, w:0.16, h:0.05}],
        'hammer-h': [{rot:-138, dx:-19.51, dy:16.04, w:0.06, h:0.38}, {rot:-135, dx:-19.51, dy:16.04, w:0.06, h:0.38}, {rot:-132.44, dx:-19.51, dy:16.04, w:0.06, h:0.38}, {rot:-129, dx:-19.51, dy:16.04, w:0.06, h:0.38}, {rot:-126, dx:-19.51, dy:16.04, w:0.06, h:0.38}, {rot:-129, dx:-19.51, dy:16.04, w:0.06, h:0.38}, {rot:-132.44, dx:-19.51, dy:16.04, w:0.06, h:0.38}, {rot:-135, dx:-19.51, dy:16.04, w:0.06, h:0.38}],
        hammer: [{rot:0, dx:0.81, dy:6.88, w:0.092, h:0.226}, {rot:0, dx:0.81, dy:6.88, w:0.092, h:0.226}, {rot:0, dx:0.81, dy:6.88, w:0.092, h:0.226}, {rot:0, dx:0.81, dy:6.88, w:0.092, h:0.226}, {rot:0, dx:0.81, dy:6.88, w:0.092, h:0.226}, {rot:0, dx:0.81, dy:6.88, w:0.092, h:0.226}, {rot:0, dx:0.81, dy:6.88, w:0.092, h:0.226}, {rot:0, dx:0.81, dy:6.88, w:0.092, h:0.226}],
        shield: [{rot:91, dx:33.6, dy:21.48, w:0.371, h:0.448}, {rot:91, dx:33.6, dy:21.48, w:0.371, h:0.448}, {rot:91, dx:33.6, dy:21.48, w:0.371, h:0.448}, {rot:91, dx:33.6, dy:21.48, w:0.371, h:0.448}, {rot:91, dx:33.6, dy:21.48, w:0.371, h:0.448}, {rot:91, dx:33.6, dy:21.48, w:0.371, h:0.448}, {rot:91, dx:33.6, dy:21.48, w:0.371, h:0.448}, {rot:91, dx:33.6, dy:21.48, w:0.371, h:0.448}],
        'shield-2': [{rot:-89.6, dx:9.39, dy:-2.78, w:0.678, h:0.114}, {rot:-89.6, dx:9.39, dy:-2.78, w:0.678, h:0.114}, {rot:-89.6, dx:9.39, dy:-2.78, w:0.678, h:0.114}, {rot:-89.6, dx:9.39, dy:-2.78, w:0.678, h:0.114}, {rot:-89.6, dx:9.39, dy:-2.78, w:0.678, h:0.114}, {rot:-89.6, dx:9.39, dy:-2.78, w:0.678, h:0.114}, {rot:-89.6, dx:9.39, dy:-2.78, w:0.678, h:0.114}, {rot:-89.6, dx:9.39, dy:-2.78, w:0.678, h:0.114}],
        'shield-2_copy': [{rot:59.2, dx:0.35, dy:-0.43, w:0.125, h:0.122}, {rot:59.2, dx:0.35, dy:-0.43, w:0.125, h:0.122}, {rot:59.2, dx:0.35, dy:-0.43, w:0.125, h:0.122}, {rot:59.2, dx:0.35, dy:-0.43, w:0.125, h:0.122}, {rot:59.2, dx:0.35, dy:-0.43, w:0.125, h:0.122}, {rot:59.2, dx:0.35, dy:-0.43, w:0.125, h:0.122}, {rot:59.2, dx:0.35, dy:-0.43, w:0.125, h:0.122}, {rot:59.2, dx:0.35, dy:-0.43, w:0.125, h:0.122}],
        'shield-2_copy_1': [{rot:-57.5, dx:18.35, dy:-0.21, w:0.125, h:0.122}, {rot:-57.5, dx:18.35, dy:-0.21, w:0.125, h:0.122}, {rot:-57.5, dx:18.35, dy:-0.21, w:0.125, h:0.122}, {rot:-57.5, dx:18.35, dy:-0.21, w:0.125, h:0.122}, {rot:-57.5, dx:18.35, dy:-0.21, w:0.125, h:0.122}, {rot:-57.5, dx:18.35, dy:-0.21, w:0.125, h:0.122}, {rot:-57.5, dx:18.35, dy:-0.21, w:0.125, h:0.122}, {rot:-57.5, dx:18.35, dy:-0.21, w:0.125, h:0.122}]
      }
    },
    attack_swipe: {
      frameCount: 6, fps: 14, loop: false,
      keys: {
        leg_r: [{rot:0.7, dx:3.93, dy:0.93, w:0.109, h:0.384}, {rot:-6.5, dx:3.93, dy:0.93, w:0.109, h:0.384}, {rot:-6.5, dx:3.93, dy:0.93, w:0.109, h:0.384}, {rot:-6.5, dx:3.93, dy:0.93, w:0.109, h:0.384}, {rot:1, dx:3.93, dy:0.93, w:0.109, h:0.384}, {rot:1, dx:3.93, dy:0.93, w:0.109, h:0.384}],
        leg_l: [{rot:0, dx:12.26, dy:0.29, w:0.121, h:0.374}, {rot:5, dx:12.26, dy:0.29, w:0.121, h:0.374}, {rot:5, dx:12.26, dy:-1.22, w:0.121, h:0.374}, {rot:10.5, dx:11.74, dy:-0.94, w:0.121, h:0.374}, {rot:2, dx:12.1, dy:-1.3, w:0.121, h:0.374}, {rot:2, dx:12.1, dy:-1.3, w:0.121, h:0.374}],
        torso: [{rot:0, dx:22.47, dy:7.96, w:0.539, h:0.456}, {rot:0, dx:22.47, dy:7.96, w:0.539, h:0.456}, {rot:0, dx:22.47, dy:7.96, w:0.539, h:0.456}, {rot:0, dx:22.47, dy:7.96, w:0.539, h:0.456}, {rot:0, dx:22.47, dy:7.96, w:0.539, h:0.456}, {rot:0, dx:22.47, dy:7.96, w:0.539, h:0.456}],
        arm_r: [{rot:-12, dx:-7.79, dy:-0.79, w:0.13, h:0.34}, {rot:-12, dx:-7.79, dy:-0.79, w:0.13, h:0.34}, {rot:-12, dx:-7.79, dy:-0.79, w:0.13, h:0.34}, {rot:-12, dx:-7.79, dy:-0.79, w:0.13, h:0.34}, {rot:-12, dx:-7.79, dy:-0.79, w:0.13, h:0.34}, {rot:-12, dx:-7.79, dy:-0.79, w:0.13, h:0.34}],
        shoulder_r: [{rot:0, dx:-6.89, dy:10.82, w:0.2, h:0.2}, {rot:0, dx:-6.89, dy:10.82, w:0.2, h:0.2}, {rot:0, dx:-6.89, dy:10.82, w:0.2, h:0.2}, {rot:0, dx:-6.89, dy:10.82, w:0.2, h:0.2}, {rot:0, dx:-6.89, dy:10.82, w:0.2, h:0.2}, {rot:0, dx:-6.89, dy:10.82, w:0.2, h:0.2}],
        arm_l: [{rot:-82.54, dx:11.32, dy:12.66, w:0.136, h:0.272}, {rot:-74.53, dx:10.14, dy:2.87, w:0.136, h:0.272}, {rot:-59.11, dx:-0.45, dy:4.68, w:0.136, h:0.272}, {rot:-31.75, dx:6.94, dy:12.9, w:0.136, h:0.272}, {rot:-57.29, dx:20.99, dy:4.63, w:0.136, h:0.272}, {rot:-76.56, dx:18.9, dy:6.13, w:0.136, h:0.272}],
        shoulder_l: [{rot:0, dx:20.5, dy:12.47, w:0.2, h:0.2}, {rot:0, dx:20.5, dy:12.47, w:0.2, h:0.2}, {rot:0, dx:20.5, dy:12.47, w:0.2, h:0.2}, {rot:0, dx:20.5, dy:12.47, w:0.2, h:0.2}, {rot:0, dx:20.5, dy:12.47, w:0.2, h:0.2}, {rot:0, dx:20.5, dy:12.47, w:0.2, h:0.2}],
        head: [{rot:0, dx:2.77, dy:15.05, w:0.2, h:0.16}, {rot:-3, dx:2.77, dy:15.05, w:0.2, h:0.16}, {rot:-5, dx:2.77, dy:15.05, w:0.2, h:0.16}, {rot:6, dx:2.77, dy:15.12, w:0.2, h:0.16}, {rot:6, dx:2.77, dy:15.12, w:0.2, h:0.16}, {rot:6, dx:2.77, dy:15.12, w:0.2, h:0.16}],
        helmet: [{rot:0, dx:1.97, dy:10.17, w:0.22, h:0.2}, {rot:0, dx:2.421, dy:10.146, w:0.22, h:0.2}, {rot:0, dx:2.723, dy:10.14, w:0.22, h:0.2}, {rot:0, dx:1.523, dy:10.237, w:0.22, h:0.2}, {rot:0, dx:1.523, dy:10.237, w:0.22, h:0.2}, {rot:0, dx:1.523, dy:10.237, w:0.22, h:0.2}],
        visor: [{rot:0, dx:0, dy:0, w:0.16, h:0.05}, {rot:3, dx:0.142, dy:0.004, w:0.16, h:0.05}, {rot:5, dx:0.236, dy:0.011, w:0.16, h:0.05}, {rot:-6, dx:-0.283, dy:0.009, w:0.16, h:0.05}, {rot:-3, dx:-0.142, dy:0.002, w:0.16, h:0.05}, {rot:0, dx:0, dy:0, w:0.16, h:0.05}],
        'hammer-h': [{rot:-132.44, dx:-19.51, dy:16.04, w:0.06, h:0.38}, {rot:-132.44, dx:-19.51, dy:16.04, w:0.06, h:0.38}, {rot:-132.44, dx:-19.51, dy:16.04, w:0.06, h:0.38}, {rot:-132.44, dx:-19.51, dy:16.04, w:0.06, h:0.38}, {rot:-132.44, dx:-19.51, dy:16.04, w:0.06, h:0.38}, {rot:-132.44, dx:-19.51, dy:16.04, w:0.06, h:0.38}],
        hammer: [{rot:0, dx:0.81, dy:6.88, w:0.092, h:0.226}, {rot:0, dx:0.81, dy:6.88, w:0.092, h:0.226}, {rot:0, dx:0.81, dy:6.88, w:0.092, h:0.226}, {rot:0, dx:0.81, dy:6.88, w:0.092, h:0.226}, {rot:0, dx:0.81, dy:6.88, w:0.092, h:0.226}, {rot:0, dx:0.81, dy:6.88, w:0.092, h:0.226}],
        shield: [{rot:91, dx:33.6, dy:21.48, w:0.371, h:0.448}, {rot:91, dx:33.6, dy:21.48, w:0.371, h:0.448}, {rot:91, dx:33.6, dy:21.48, w:0.371, h:0.448}, {rot:91, dx:33.6, dy:21.48, w:0.371, h:0.448}, {rot:91, dx:33.6, dy:21.48, w:0.371, h:0.448}, {rot:91, dx:33.6, dy:21.48, w:0.371, h:0.448}],
        'shield-2': [{rot:-89.6, dx:9.39, dy:-2.78, w:0.678, h:0.114}, {rot:-89.6, dx:9.39, dy:-2.78, w:0.678, h:0.114}, {rot:-89.6, dx:9.39, dy:-2.78, w:0.678, h:0.114}, {rot:-89.6, dx:9.39, dy:-2.78, w:0.678, h:0.114}, {rot:-89.6, dx:9.39, dy:-2.78, w:0.678, h:0.114}, {rot:-89.6, dx:9.39, dy:-2.78, w:0.678, h:0.114}],
        'shield-2_copy': [{rot:59.2, dx:0.35, dy:-0.43, w:0.125, h:0.122}, {rot:59.2, dx:0.35, dy:-0.43, w:0.125, h:0.122}, {rot:59.2, dx:0.35, dy:-0.43, w:0.125, h:0.122}, {rot:59.2, dx:0.35, dy:-0.43, w:0.125, h:0.122}, {rot:59.2, dx:0.35, dy:-0.43, w:0.125, h:0.122}, {rot:59.2, dx:0.35, dy:-0.43, w:0.125, h:0.122}],
        'shield-2_copy_1': [{rot:-57.5, dx:18.35, dy:-0.21, w:0.125, h:0.122}, {rot:-57.5, dx:18.35, dy:-0.21, w:0.125, h:0.122}, {rot:-57.5, dx:18.35, dy:-0.21, w:0.125, h:0.122}, {rot:-57.5, dx:18.35, dy:-0.21, w:0.125, h:0.122}, {rot:-57.5, dx:18.35, dy:-0.21, w:0.125, h:0.122}, {rot:-57.5, dx:18.35, dy:-0.21, w:0.125, h:0.122}]
      }
    },
    skill_charge: {
      frameCount: 8, fps: 10, loop: false,
      keys: {
        leg_r: [{rot:0.7, dx:3.93, dy:0.93, w:0.109, h:0.384}, {rot:0.7, dx:3.93, dy:0.93, w:0.109, h:0.384}, {rot:0.7, dx:3.93, dy:0.93, w:0.109, h:0.384}, {rot:0.7, dx:3.93, dy:0.93, w:0.109, h:0.384}, {rot:0.7, dx:3.93, dy:0.93, w:0.109, h:0.384}, {rot:0.7, dx:3.93, dy:0.93, w:0.109, h:0.384}, {rot:0.7, dx:3.93, dy:0.93, w:0.109, h:0.384}, {rot:0.7, dx:3.93, dy:0.93, w:0.109, h:0.384}],
        leg_l: [{rot:0, dx:12.26, dy:0.29, w:0.121, h:0.374}, {rot:0, dx:12.26, dy:0.29, w:0.121, h:0.374}, {rot:0, dx:12.26, dy:0.29, w:0.121, h:0.374}, {rot:0, dx:12.26, dy:0.29, w:0.121, h:0.374}, {rot:0, dx:12.26, dy:0.29, w:0.121, h:0.374}, {rot:0, dx:12.26, dy:0.29, w:0.121, h:0.374}, {rot:0, dx:12.26, dy:0.29, w:0.121, h:0.374}, {rot:0, dx:12.26, dy:0.29, w:0.121, h:0.374}],
        torso: [{rot:0, dx:22.47, dy:7.96, w:0.457, h:0.476}, {rot:0, dx:22.47, dy:7.96, w:0.457, h:0.476}, {rot:0, dx:22.47, dy:7.96, w:0.457, h:0.476}, {rot:0, dx:22.47, dy:7.96, w:0.457, h:0.476}, {rot:0, dx:22.47, dy:7.96, w:0.457, h:0.476}, {rot:0, dx:22.47, dy:7.96, w:0.457, h:0.476}, {rot:0, dx:22.47, dy:7.96, w:0.457, h:0.476}, {rot:0, dx:22.47, dy:7.96, w:0.457, h:0.476}],
        arm_r: [{rot:-12, dx:-7.79, dy:-0.79, w:0.13, h:0.34}, {rot:-25, dx:-7.79, dy:-0.79, w:0.13, h:0.34}, {rot:25.4, dx:-7.79, dy:-0.86, w:0.13, h:0.34}, {rot:48.8, dx:-8.77, dy:-0.36, w:0.13, h:0.34}, {rot:101.6, dx:-8.77, dy:-0.36, w:0.13, h:0.34}, {rot:59.6, dx:-8.77, dy:-0.43, w:0.13, h:0.34}, {rot:28.6, dx:-8.95, dy:-0.5, w:0.13, h:0.34}, {rot:28.6, dx:-8.95, dy:-0.5, w:0.13, h:0.34}],
        shoulder_r: [{rot:0, dx:-6.89, dy:10.82, w:0.2, h:0.2}, {rot:0, dx:-6.89, dy:10.82, w:0.2, h:0.2}, {rot:0, dx:-6.89, dy:10.82, w:0.2, h:0.2}, {rot:0, dx:-6.89, dy:10.82, w:0.2, h:0.2}, {rot:0, dx:-6.89, dy:10.82, w:0.2, h:0.2}, {rot:0, dx:-6.89, dy:10.82, w:0.2, h:0.2}, {rot:0, dx:-6.89, dy:10.82, w:0.2, h:0.2}, {rot:0, dx:-6.89, dy:10.82, w:0.2, h:0.2}],
        arm_l: [{rot:-102.2, dx:10.21, dy:14.77, w:0.136, h:0.272}, {rot:-102.2, dx:10.21, dy:14.77, w:0.136, h:0.272}, {rot:-102.2, dx:10.21, dy:14.77, w:0.136, h:0.272}, {rot:-102.2, dx:10.21, dy:14.77, w:0.136, h:0.272}, {rot:-102.2, dx:10.21, dy:14.77, w:0.136, h:0.272}, {rot:-102.2, dx:10.21, dy:14.77, w:0.136, h:0.272}, {rot:-102.2, dx:10.21, dy:14.77, w:0.136, h:0.272}, {rot:-102.2, dx:10.21, dy:14.77, w:0.136, h:0.272}],
        shoulder_l: [{rot:0, dx:20.5, dy:12.47, w:0.2, h:0.2}, {rot:0, dx:20.5, dy:12.47, w:0.2, h:0.2}, {rot:0, dx:20.5, dy:12.47, w:0.2, h:0.2}, {rot:0, dx:20.5, dy:12.47, w:0.2, h:0.2}, {rot:0, dx:20.5, dy:12.47, w:0.2, h:0.2}, {rot:0, dx:20.5, dy:12.47, w:0.2, h:0.2}, {rot:0, dx:20.5, dy:12.47, w:0.2, h:0.2}, {rot:0, dx:20.5, dy:12.47, w:0.2, h:0.2}],
        head: [{rot:0, dx:2.77, dy:15.05, w:0.2, h:0.16}, {rot:-2, dx:2.77, dy:15.05, w:0.2, h:0.16}, {rot:-4, dx:2.77, dy:15.05, w:0.2, h:0.16}, {rot:-6, dx:2.77, dy:15.05, w:0.2, h:0.16}, {rot:-3, dx:2.77, dy:15.05, w:0.2, h:0.16}, {rot:5, dx:2.77, dy:15.12, w:0.2, h:0.16}, {rot:5, dx:2.77, dy:15.12, w:0.2, h:0.16}, {rot:5, dx:2.77, dy:15.12, w:0.2, h:0.16}],
        helmet: [{rot:0, dx:1.97, dy:10.17, w:0.22, h:0.2}, {rot:0, dx:2.271, dy:10.152, w:0.22, h:0.2}, {rot:0, dx:2.572, dy:10.142, w:0.22, h:0.2}, {rot:0, dx:2.873, dy:10.141, w:0.22, h:0.2}, {rot:0, dx:2.421, dy:10.146, w:0.22, h:0.2}, {rot:0, dx:1.224, dy:10.252, w:0.22, h:0.2}, {rot:0, dx:1.67, dy:10.197, w:0.22, h:0.2}, {rot:0, dx:1.97, dy:10.17, w:0.22, h:0.2}],
        visor: [{rot:0, dx:0, dy:0, w:0.16, h:0.05}, {rot:2, dx:0.094, dy:0.002, w:0.16, h:0.05}, {rot:4, dx:0.189, dy:0.007, w:0.16, h:0.05}, {rot:6, dx:0.284, dy:0.014, w:0.16, h:0.05}, {rot:3, dx:0.142, dy:0.004, w:0.16, h:0.05}, {rot:-5, dx:-0.237, dy:0.006, w:0.16, h:0.05}, {rot:-2, dx:-0.094, dy:0, w:0.16, h:0.05}, {rot:0, dx:0, dy:0, w:0.16, h:0.05}],
        'hammer-h': [{rot:-132.44, dx:-19.51, dy:16.04, w:0.06, h:0.38}, {rot:-119.78, dx:-19.51, dy:16.04, w:0.06, h:0.38}, {rot:-60.66, dx:-41.71, dy:3.14, w:0.06, h:0.38}, {rot:-30.65, dx:-50.43, dy:-9.27, w:0.06, h:0.38}, {rot:27.33, dx:-44.55, dy:-28.26, w:0.06, h:0.38}, {rot:-68.49, dx:-54.12, dy:-5.46, w:0.06, h:0.38}, {rot:-123.95, dx:-51.51, dy:15.23, w:0.06, h:0.38}, {rot:-73.53, dx:-44.44, dy:5.48, w:0.06, h:0.38}],
        hammer: [{rot:0, dx:0.81, dy:6.88, w:0.092, h:0.226}, {rot:0, dx:0.81, dy:6.88, w:0.092, h:0.226}, {rot:0, dx:0.81, dy:6.88, w:0.092, h:0.226}, {rot:0, dx:0.81, dy:6.88, w:0.092, h:0.226}, {rot:0, dx:0.81, dy:6.88, w:0.092, h:0.226}, {rot:0, dx:0.81, dy:6.88, w:0.092, h:0.226}, {rot:0, dx:0.81, dy:6.88, w:0.092, h:0.226}, {rot:0, dx:0.81, dy:6.88, w:0.092, h:0.226}],
        shield: [{rot:91, dx:33.6, dy:21.48, w:0.371, h:0.448}, {rot:91, dx:33.6, dy:21.48, w:0.371, h:0.448}, {rot:91, dx:33.6, dy:21.48, w:0.371, h:0.448}, {rot:91, dx:33.6, dy:21.48, w:0.371, h:0.448}, {rot:91, dx:33.6, dy:21.48, w:0.371, h:0.448}, {rot:91, dx:33.6, dy:21.48, w:0.371, h:0.448}, {rot:91, dx:33.6, dy:21.48, w:0.371, h:0.448}, {rot:91, dx:33.6, dy:21.48, w:0.371, h:0.448}],
        'shield-2': [{rot:-89.6, dx:9.39, dy:-2.78, w:0.678, h:0.114}, {rot:-89.6, dx:9.39, dy:-2.78, w:0.678, h:0.114}, {rot:-89.6, dx:9.39, dy:-2.78, w:0.678, h:0.114}, {rot:-89.6, dx:9.39, dy:-2.78, w:0.678, h:0.114}, {rot:-89.6, dx:9.39, dy:-2.78, w:0.678, h:0.114}, {rot:-89.6, dx:9.39, dy:-2.78, w:0.678, h:0.114}, {rot:-89.6, dx:9.39, dy:-2.78, w:0.678, h:0.114}, {rot:-89.6, dx:9.39, dy:-2.78, w:0.678, h:0.114}],
        'shield-2_copy': [{rot:59.2, dx:0.35, dy:-0.43, w:0.125, h:0.122}, {rot:59.2, dx:0.35, dy:-0.43, w:0.125, h:0.122}, {rot:59.2, dx:0.35, dy:-0.43, w:0.125, h:0.122}, {rot:59.2, dx:0.35, dy:-0.43, w:0.125, h:0.122}, {rot:59.2, dx:0.35, dy:-0.43, w:0.125, h:0.122}, {rot:59.2, dx:0.35, dy:-0.43, w:0.125, h:0.122}, {rot:59.2, dx:0.35, dy:-0.43, w:0.125, h:0.122}, {rot:59.2, dx:0.35, dy:-0.43, w:0.125, h:0.122}],
        'shield-2_copy_1': [{rot:-57.5, dx:18.35, dy:-0.21, w:0.125, h:0.122}, {rot:-57.5, dx:18.35, dy:-0.21, w:0.125, h:0.122}, {rot:-57.5, dx:18.35, dy:-0.21, w:0.125, h:0.122}, {rot:-57.5, dx:18.35, dy:-0.21, w:0.125, h:0.122}, {rot:-57.5, dx:18.35, dy:-0.21, w:0.125, h:0.122}, {rot:-57.5, dx:18.35, dy:-0.21, w:0.125, h:0.122}, {rot:-57.5, dx:18.35, dy:-0.21, w:0.125, h:0.122}, {rot:-57.5, dx:18.35, dy:-0.21, w:0.125, h:0.122}]
      }
    },
    hurt: {
      frameCount: 4, fps: 12, loop: false,
      keys: {
        leg_r: [{rot:0.7, dx:3.93, dy:0.93, w:0.109, h:0.384}, {rot:0.7, dx:3.93, dy:0.93, w:0.109, h:0.384}, {rot:0.7, dx:3.93, dy:0.93, w:0.109, h:0.384}, {rot:0.7, dx:3.93, dy:0.93, w:0.109, h:0.384}],
        leg_l: [{rot:0, dx:12.26, dy:0.29, w:0.121, h:0.374}, {rot:0, dx:12.26, dy:0.29, w:0.121, h:0.374}, {rot:0, dx:12.26, dy:0.29, w:0.121, h:0.374}, {rot:0, dx:12.26, dy:0.29, w:0.121, h:0.374}],
        torso: [{rot:0, dx:22.47, dy:7.96, w:0.457, h:0.476}, {rot:0, dx:24.47, dy:7.96, w:0.457, h:0.476}, {rot:0, dx:20.47, dy:7.96, w:0.457, h:0.476}, {rot:0, dx:22.47, dy:7.96, w:0.457, h:0.476}],
        arm_r: [{rot:-12, dx:-7.79, dy:-0.79, w:0.13, h:0.34}, {rot:-12, dx:-7.79, dy:-0.79, w:0.13, h:0.34}, {rot:-12, dx:-7.79, dy:-0.79, w:0.13, h:0.34}, {rot:-12, dx:-7.79, dy:-0.79, w:0.13, h:0.34}],
        shoulder_r: [{rot:0, dx:-6.89, dy:10.82, w:0.2, h:0.2}, {rot:0, dx:-6.89, dy:10.82, w:0.2, h:0.2}, {rot:0, dx:-6.89, dy:10.82, w:0.2, h:0.2}, {rot:0, dx:-6.89, dy:10.82, w:0.2, h:0.2}],
        arm_l: [{rot:-102.2, dx:10.21, dy:14.77, w:0.136, h:0.272}, {rot:-102.2, dx:10.21, dy:14.77, w:0.136, h:0.272}, {rot:-102.2, dx:10.21, dy:14.77, w:0.136, h:0.272}, {rot:-102.2, dx:10.21, dy:14.77, w:0.136, h:0.272}],
        shoulder_l: [{rot:0, dx:20.5, dy:12.47, w:0.2, h:0.2}, {rot:0, dx:20.5, dy:12.47, w:0.2, h:0.2}, {rot:0, dx:20.5, dy:12.47, w:0.2, h:0.2}, {rot:0, dx:20.5, dy:12.47, w:0.2, h:0.2}],
        head: [{rot:0, dx:2.77, dy:15.05, w:0.2, h:0.16}, {rot:0, dx:5.77, dy:15.05, w:0.2, h:0.16}, {rot:0, dx:-0.23, dy:15.05, w:0.2, h:0.16}, {rot:0, dx:2.77, dy:15.05, w:0.2, h:0.16}],
        helmet: [{rot:0, dx:1.97, dy:10.17, w:0.22, h:0.2}, {rot:0, dx:1.97, dy:10.17, w:0.22, h:0.2}, {rot:0, dx:1.97, dy:10.17, w:0.22, h:0.2}, {rot:0, dx:1.97, dy:10.17, w:0.22, h:0.2}],
        visor: [{rot:0, dx:0, dy:0, w:0.16, h:0.05}, {rot:0, dx:-3, dy:0, w:0.16, h:0.05}, {rot:0, dx:3, dy:0, w:0.16, h:0.05}, {rot:0, dx:0, dy:0, w:0.16, h:0.05}],
        'hammer-h': [{rot:-132.44, dx:-19.51, dy:16.04, w:0.06, h:0.38}, {rot:-132.44, dx:-19.51, dy:16.04, w:0.06, h:0.38}, {rot:-132.44, dx:-19.51, dy:16.04, w:0.06, h:0.38}, {rot:-132.44, dx:-19.51, dy:16.04, w:0.06, h:0.38}],
        hammer: [{rot:0, dx:0.81, dy:6.88, w:0.092, h:0.226}, {rot:0, dx:0.81, dy:6.88, w:0.092, h:0.226}, {rot:0, dx:0.81, dy:6.88, w:0.092, h:0.226}, {rot:0, dx:0.81, dy:6.88, w:0.092, h:0.226}],
        shield: [{rot:91, dx:33.6, dy:21.48, w:0.371, h:0.448}, {rot:91, dx:33.6, dy:21.48, w:0.371, h:0.448}, {rot:91, dx:33.6, dy:21.48, w:0.371, h:0.448}, {rot:91, dx:33.6, dy:21.48, w:0.371, h:0.448}],
        'shield-2': [{rot:-89.6, dx:9.39, dy:-2.78, w:0.678, h:0.114}, {rot:-89.6, dx:9.39, dy:-2.78, w:0.678, h:0.114}, {rot:-89.6, dx:9.39, dy:-2.78, w:0.678, h:0.114}, {rot:-89.6, dx:9.39, dy:-2.78, w:0.678, h:0.114}],
        'shield-2_copy': [{rot:59.2, dx:0.35, dy:-0.43, w:0.125, h:0.122}, {rot:59.2, dx:0.35, dy:-0.43, w:0.125, h:0.122}, {rot:59.2, dx:0.35, dy:-0.43, w:0.125, h:0.122}, {rot:59.2, dx:0.35, dy:-0.43, w:0.125, h:0.122}],
        'shield-2_copy_1': [{rot:-57.5, dx:18.35, dy:-0.21, w:0.125, h:0.122}, {rot:-57.5, dx:18.35, dy:-0.21, w:0.125, h:0.122}, {rot:-57.5, dx:18.35, dy:-0.21, w:0.125, h:0.122}, {rot:-57.5, dx:18.35, dy:-0.21, w:0.125, h:0.122}]
      }
    },
    death: {
      frameCount: 6, fps: 8, loop: false,
      keys: {
        leg_r: [{rot:0.7, dx:3.93, dy:0.93, w:0.109, h:0.384}, {rot:0.7, dx:3.93, dy:0.93, w:0.109, h:0.384}, {rot:0.7, dx:-0.01, dy:21.72, w:0.188, h:0.17}, {rot:0.7, dx:-0.01, dy:21.72, w:0.188, h:0.17}, {rot:0.7, dx:-0.01, dy:21.72, w:0.188, h:0.17}, {rot:0.7, dx:-0.01, dy:21.72, w:0.188, h:0.17}],
        leg_l: [{rot:0, dx:12.26, dy:0.29, w:0.121, h:0.374}, {rot:0, dx:12.26, dy:0.29, w:0.121, h:0.374}, {rot:0, dx:12.26, dy:0.29, w:0.121, h:0.374}, {rot:0, dx:12.26, dy:0.29, w:0.121, h:0.374}, {rot:0, dx:12.26, dy:0.29, w:0.121, h:0.374}, {rot:0, dx:12.26, dy:0.29, w:0.121, h:0.374}],
        torso: [{rot:0, dx:22.47, dy:7.96, w:0.457, h:0.476}, {rot:-23.5, dx:10.12, dy:14.2, w:0.457, h:0.476}, {rot:-17.4, dx:10.47, dy:23.09, w:0.469, h:0.418}, {rot:-17.4, dx:10.47, dy:23.09, w:0.469, h:0.418}, {rot:-17.4, dx:9.75, dy:30.83, w:0.469, h:0.418}, {rot:-17.4, dx:9.75, dy:30.83, w:0.469, h:0.418}],
        arm_r: [{rot:-12, dx:-7.79, dy:-0.79, w:0.13, h:0.34}, {rot:-12, dx:-7.79, dy:-0.79, w:0.13, h:0.34}, {rot:-24.1, dx:-10.75, dy:10.25, w:0.13, h:0.34}, {rot:5, dx:-14.42, dy:23.15, w:0.13, h:0.34}, {rot:5, dx:-8.87, dy:29.75, w:0.13, h:0.34}, {rot:5, dx:-8.87, dy:29.75, w:0.13, h:0.34}],
        shoulder_r: [{rot:0, dx:-6.89, dy:10.82, w:0.2, h:0.2}, {rot:0, dx:-9.22, dy:10.96, w:0.2, h:0.2}, {rot:0, dx:-9.04, dy:18.34, w:0.2, h:0.2}, {rot:0, dx:-5.64, dy:31.32, w:0.2, h:0.2}, {rot:0, dx:-3.67, dy:36.05, w:0.2, h:0.2}, {rot:0, dx:-2.86, dy:35.62, w:0.2, h:0.2}],
        arm_l: [{rot:-102.2, dx:10.21, dy:14.77, w:0.136, h:0.272}, {rot:-102.2, dx:5.47, dy:36.85, w:0.136, h:0.272}, {rot:-102.2, dx:5.47, dy:36.85, w:0.136, h:0.272}, {rot:-102.2, dx:5.47, dy:36.85, w:0.136, h:0.272}, {rot:-28.14, dx:16.42, dy:36.74, w:0.136, h:0.272}, {rot:-28.14, dx:16.42, dy:36.74, w:0.136, h:0.272}],
        shoulder_l: [{rot:0, dx:20.5, dy:12.47, w:0.2, h:0.2}, {rot:-24, dx:8.87, dy:18.35, w:0.2, h:0.2}, {rot:-24, dx:9.68, dy:20.5, w:0.2, h:0.2}, {rot:-24, dx:12.63, dy:35.48, w:0.2, h:0.2}, {rot:-24, dx:13.53, dy:43.8, w:0.2, h:0.2}, {rot:-24, dx:13.53, dy:43.8, w:0.2, h:0.2}],
        head: [{rot:0, dx:2.77, dy:15.05, w:0.2, h:0.16}, {rot:-13.4, dx:0.55, dy:16.69, w:0.2, h:0.16}, {rot:-13.4, dx:1.98, dy:30.45, w:0.2, h:0.16}, {rot:-13.4, dx:5.38, dy:40.56, w:0.2, h:0.16}, {rot:-13.4, dx:5.47, dy:40.56, w:0.2, h:0.16}, {rot:-13.4, dx:5.47, dy:40.56, w:0.2, h:0.16}],
        helmet: [{rot:0, dx:1.97, dy:10.17, w:0.22, h:0.2}, {rot:0, dx:2.421, dy:10.146, w:0.22, h:0.2}, {rot:0, dx:3.175, dy:10.148, w:0.22, h:0.2}, {rot:0, dx:4.223, dy:10.239, w:0.22, h:0.2}, {rot:0, dx:3.643, dy:10.596, w:0.22, h:0.2}, {rot:0, dx:3.643, dy:10.596, w:0.22, h:0.2}],
        visor: [{rot:0, dx:0, dy:0, w:0.16, h:0.05}, {rot:3, dx:0.142, dy:0.004, w:0.16, h:0.05}, {rot:8, dx:0.377, dy:0.024, w:0.16, h:0.05}, {rot:15, dx:0.701, dy:0.08, w:0.16, h:0.05}, {rot:25, dx:1.144, dy:0.214, w:0.16, h:0.05}, {rot:40, dx:1.737, dy:0.523, w:0.16, h:0.05}],
        'hammer-h': [{rot:-132.44, dx:-19.51, dy:16.04, w:0.06, h:0.38}, {rot:-132.44, dx:-17.18, dy:26.15, w:0.06, h:0.38}, {rot:-89.82, dx:-12.42, dy:44.35, w:0.06, h:0.38}, {rot:-89.82, dx:-12.42, dy:44.35, w:0.06, h:0.38}, {rot:-89.82, dx:-12.42, dy:44.35, w:0.06, h:0.38}, {rot:-89.82, dx:-12.42, dy:44.35, w:0.06, h:0.38}],
        hammer: [{rot:0, dx:0.81, dy:6.88, w:0.092, h:0.226}, {rot:0, dx:0.81, dy:6.88, w:0.092, h:0.226}, {rot:0, dx:0.81, dy:6.88, w:0.092, h:0.226}, {rot:0, dx:0.81, dy:6.88, w:0.092, h:0.226}, {rot:0, dx:0.81, dy:6.88, w:0.092, h:0.226}, {rot:0, dx:0.81, dy:6.88, w:0.092, h:0.226}],
        shield: [{rot:91, dx:33.6, dy:21.48, w:0.371, h:0.448}, {rot:91, dx:33.6, dy:21.48, w:0.371, h:0.448}, {rot:91, dx:33.6, dy:21.48, w:0.371, h:0.448}, {rot:91, dx:33.6, dy:21.48, w:0.371, h:0.448}, {rot:91, dx:33.6, dy:21.48, w:0.371, h:0.448}, {rot:91, dx:33.6, dy:21.48, w:0.371, h:0.448}],
        'shield-2': [{rot:-89.6, dx:9.39, dy:-2.78, w:0.678, h:0.114}, {rot:-89.6, dx:9.39, dy:-2.78, w:0.678, h:0.114}, {rot:-89.6, dx:9.39, dy:-2.78, w:0.678, h:0.114}, {rot:-89.6, dx:9.39, dy:-2.78, w:0.678, h:0.114}, {rot:-89.6, dx:9.39, dy:-2.78, w:0.678, h:0.114}, {rot:-89.6, dx:9.39, dy:-2.78, w:0.678, h:0.114}],
        'shield-2_copy': [{rot:59.2, dx:0.35, dy:-0.43, w:0.125, h:0.122}, {rot:59.2, dx:0.35, dy:-0.43, w:0.125, h:0.122}, {rot:59.2, dx:0.35, dy:-0.43, w:0.125, h:0.122}, {rot:59.2, dx:0.35, dy:-0.43, w:0.125, h:0.122}, {rot:59.2, dx:0.35, dy:-0.43, w:0.125, h:0.122}, {rot:59.2, dx:0.35, dy:-0.43, w:0.125, h:0.122}],
        'shield-2_copy_1': [{rot:-57.5, dx:18.35, dy:-0.21, w:0.125, h:0.122}, {rot:-57.5, dx:18.35, dy:-0.21, w:0.125, h:0.122}, {rot:-57.5, dx:18.35, dy:-0.21, w:0.125, h:0.122}, {rot:-57.5, dx:18.35, dy:-0.21, w:0.125, h:0.122}, {rot:-57.5, dx:18.35, dy:-0.21, w:0.125, h:0.122}, {rot:-57.5, dx:18.35, dy:-0.21, w:0.125, h:0.122}]
      }
    }
  },
  swamp_hydra: {
    idle: {
      frameCount: 4, fps: 4, loop: true,
      keys: {
        swamp: [{rot:2.3, dx:39.62, dy:-6.45, w:0.852, h:0.246}, {rot:2.3, dx:39.62, dy:-6.45, w:0.852, h:0.246}, {rot:2.3, dx:39.62, dy:-6.45, w:0.852, h:0.246}, {rot:2.3, dx:39.62, dy:-6.45, w:0.852, h:0.246}],
        body_copy_1: [{rot:0, dx:44.61, dy:-1.22, w:0.244, h:0.143}, {rot:0, dx:44.61, dy:-1.72, w:0.244, h:0.143}, {rot:0, dx:44.61, dy:-2.22, w:0.244, h:0.143}, {rot:0, dx:44.61, dy:-1.72, w:0.244, h:0.143}],
        body: [{rot:0, dx:26.58, dy:-1.29, w:0.309, h:0.19}, {rot:0, dx:26.58, dy:-1.79, w:0.309, h:0.19}, {rot:0, dx:26.58, dy:-2.29, w:0.309, h:0.19}, {rot:0, dx:26.58, dy:-1.79, w:0.309, h:0.19}],
        body_copy: [{rot:0, dx:1.12, dy:-1.37, w:0.414, h:0.312}, {rot:0, dx:1.12, dy:-1.87, w:0.414, h:0.312}, {rot:0, dx:1.12, dy:-2.37, w:0.414, h:0.312}, {rot:0, dx:1.12, dy:-1.87, w:0.414, h:0.312}],
        neck_7: [{rot:40.4, dx:-16.5, dy:3.58, w:0.04, h:0.16}, {rot:40.4, dx:-16.5, dy:3.28, w:0.04, h:0.16}, {rot:40.4, dx:-16.5, dy:2.98, w:0.04, h:0.16}, {rot:40.4, dx:-16.5, dy:3.28, w:0.04, h:0.16}],
        neck_6: [{rot:-12.5, dx:-4.98, dy:3.8, w:0.04, h:0.15}, {rot:-12.5, dx:-4.98, dy:3.5, w:0.04, h:0.15}, {rot:-12.5, dx:-4.98, dy:3.2, w:0.04, h:0.15}, {rot:-12.5, dx:-4.98, dy:3.5, w:0.04, h:0.15}],
        neck_5: [{rot:18, dx:-5.59, dy:13.04, w:0.04, h:0.15}, {rot:18, dx:-5.59, dy:12.74, w:0.04, h:0.15}, {rot:18, dx:-5.59, dy:12.44, w:0.04, h:0.15}, {rot:18, dx:-5.59, dy:12.74, w:0.04, h:0.15}],
        neck_4: [{rot:0, dx:-1.03, dy:9.61, w:0.04, h:0.14}, {rot:0, dx:-1.03, dy:9.31, w:0.04, h:0.14}, {rot:0, dx:-1.03, dy:9.01, w:0.04, h:0.14}, {rot:0, dx:-1.03, dy:9.31, w:0.04, h:0.14}],
        neck_3_copy: [{rot:17.3, dx:-3.7, dy:7.89, w:0.04, h:0.15}, {rot:17.3, dx:-3.7, dy:7.59, w:0.04, h:0.15}, {rot:17.3, dx:-3.7, dy:7.29, w:0.04, h:0.15}, {rot:17.3, dx:-3.7, dy:7.59, w:0.04, h:0.15}],
        neck_3: [{rot:-5.8, dx:3.52, dy:9.33, w:0.045, h:0.138}, {rot:-5.8, dx:3.52, dy:9.03, w:0.045, h:0.138}, {rot:-5.8, dx:3.52, dy:8.73, w:0.045, h:0.138}, {rot:-5.8, dx:3.52, dy:9.03, w:0.045, h:0.138}],
        neck_2: [{rot:0, dx:0.77, dy:1.43, w:0.035, h:0.215}, {rot:0, dx:0.77, dy:1.13, w:0.035, h:0.215}, {rot:0, dx:0.77, dy:0.83, w:0.035, h:0.215}, {rot:0, dx:0.77, dy:1.13, w:0.035, h:0.215}],
        neck_1: [{rot:-16.8, dx:3.35, dy:0.93, w:0.043, h:0.143}, {rot:-16.8, dx:3.35, dy:0.63, w:0.043, h:0.143}, {rot:-16.8, dx:3.35, dy:0.33, w:0.043, h:0.143}, {rot:-16.8, dx:3.35, dy:0.63, w:0.043, h:0.143}],
        head_7: [{rot:-40.4, dx:-7.82, dy:14.12, w:0.119, h:0.138}, {rot:-40.4, dx:-7.82, dy:13.82, w:0.119, h:0.138}, {rot:-40.4, dx:-7.82, dy:13.52, w:0.119, h:0.138}, {rot:-40.4, dx:-7.82, dy:13.82, w:0.119, h:0.138}],
        head_6: [{rot:12.5, dx:-10.83, dy:7.31, w:0.123, h:0.121}, {rot:12.5, dx:-10.83, dy:7.01, w:0.123, h:0.121}, {rot:12.5, dx:-10.83, dy:6.71, w:0.123, h:0.121}, {rot:12.5, dx:-10.83, dy:7.01, w:0.123, h:0.121}],
        head_5: [{rot:-18, dx:-8.42, dy:44.23, w:0.083, h:0.147}, {rot:-18, dx:-8.42, dy:43.93, w:0.083, h:0.147}, {rot:-18, dx:-8.42, dy:43.63, w:0.083, h:0.147}, {rot:-18, dx:-8.42, dy:43.93, w:0.083, h:0.147}],
        head_4: [{rot:0, dx:-1.89, dy:15.91, w:0.125, h:0.114}, {rot:0, dx:-1.89, dy:15.61, w:0.125, h:0.114}, {rot:0, dx:-1.89, dy:15.31, w:0.125, h:0.114}, {rot:0, dx:-1.89, dy:15.61, w:0.125, h:0.114}],
        head_3: [{rot:0, dx:-5.59, dy:34.12, w:0.129, h:0.137}, {rot:0, dx:-5.59, dy:33.82, w:0.129, h:0.137}, {rot:0, dx:-5.59, dy:33.52, w:0.129, h:0.137}, {rot:0, dx:-5.59, dy:33.82, w:0.129, h:0.137}],
        head_2: [{rot:0, dx:1.72, dy:7.74, w:0.138, h:0.157}, {rot:0, dx:1.72, dy:7.44, w:0.138, h:0.157}, {rot:0, dx:1.72, dy:7.14, w:0.138, h:0.157}, {rot:0, dx:1.72, dy:7.44, w:0.138, h:0.157}],
        mouth_copy_1: [{rot:0, dx:-6.45, dy:1.08, w:0.062, h:0.028}, {rot:0, dx:-6.45, dy:1.08, w:0.062, h:0.028}, {rot:0, dx:-6.45, dy:1.08, w:0.062, h:0.028}, {rot:0, dx:-6.45, dy:1.08, w:0.062, h:0.028}],
        head_1: [{rot:16.8, dx:0.25, dy:7.6, w:0.123, h:0.108}, {rot:16.8, dx:0.25, dy:7.3, w:0.123, h:0.108}, {rot:16.8, dx:0.25, dy:7, w:0.123, h:0.108}, {rot:16.8, dx:0.25, dy:7.3, w:0.123, h:0.108}],
        eyes_copy_5_copy: [{rot:0, dx:13.57, dy:27.17, w:0.048, h:0.035}, {rot:0, dx:13.57, dy:27.17, w:0.048, h:0.035}, {rot:0, dx:13.57, dy:27.17, w:0.048, h:0.035}, {rot:0, dx:13.57, dy:27.17, w:0.048, h:0.035}],
        eyes_copy_copy: [{rot:0, dx:-16.76, dy:0.14, w:0.048, h:0.035}, {rot:0, dx:-16.76, dy:0.14, w:0.048, h:0.035}, {rot:0, dx:-16.76, dy:0.14, w:0.048, h:0.035}, {rot:0, dx:-16.76, dy:0.14, w:0.048, h:0.035}],
        eyes_copy_1_copy: [{rot:0, dx:-4.99, dy:-5.24, w:0.048, h:0.035}, {rot:0, dx:-4.99, dy:-5.24, w:0.048, h:0.035}, {rot:0, dx:-4.99, dy:-5.24, w:0.048, h:0.035}, {rot:0, dx:-4.99, dy:-5.24, w:0.048, h:0.035}],
        eyes_copy_2_copy: [{rot:0, dx:9.45, dy:2, w:0.048, h:0.035}, {rot:0, dx:9.45, dy:2, w:0.048, h:0.035}, {rot:0, dx:9.45, dy:2, w:0.048, h:0.035}, {rot:0, dx:9.45, dy:2, w:0.048, h:0.035}],
        eyes_copy_6_copy_1: [{rot:0, dx:38.67, dy:3.38, w:0.048, h:0.035}, {rot:0, dx:38.67, dy:3.38, w:0.048, h:0.035}, {rot:0, dx:38.67, dy:3.38, w:0.048, h:0.035}, {rot:0, dx:38.67, dy:3.38, w:0.048, h:0.035}],
        eyes_copy_6_copy: [{rot:0, dx:20.19, dy:-6.23, w:0.048, h:0.035}, {rot:0, dx:20.19, dy:-6.23, w:0.048, h:0.035}, {rot:0, dx:20.19, dy:-6.23, w:0.048, h:0.035}, {rot:0, dx:20.19, dy:-6.23, w:0.048, h:0.035}],
        eyes_copy_6: [{rot:0, dx:33, dy:3.88, w:0.048, h:0.035}, {rot:0, dx:33, dy:3.88, w:0.048, h:0.035}, {rot:0, dx:33, dy:3.88, w:0.048, h:0.035}, {rot:0, dx:33, dy:3.88, w:0.048, h:0.035}],
        eyes_copy_5: [{rot:0, dx:18.56, dy:25.09, w:0.044, h:0.035}, {rot:0, dx:18.56, dy:25.09, w:0.044, h:0.035}, {rot:0, dx:18.56, dy:25.09, w:0.044, h:0.035}, {rot:0, dx:18.56, dy:25.09, w:0.044, h:0.035}],
        eyes_copy_4: [{rot:0, dx:-0.52, dy:21.65, w:0.048, h:0.035}, {rot:0, dx:-0.52, dy:21.65, w:0.048, h:0.035}, {rot:0, dx:-0.52, dy:21.65, w:0.048, h:0.035}, {rot:0, dx:-0.52, dy:21.65, w:0.048, h:0.035}],
        eyes_copy_3: [{rot:0, dx:-6.54, dy:21.22, w:0.048, h:0.035}, {rot:0, dx:-6.54, dy:21.22, w:0.048, h:0.035}, {rot:0, dx:-6.54, dy:21.22, w:0.048, h:0.035}, {rot:0, dx:-6.54, dy:21.22, w:0.048, h:0.035}],
        eyes_copy_2: [{rot:0, dx:15.47, dy:1.57, w:0.048, h:0.035}, {rot:0, dx:15.47, dy:1.57, w:0.048, h:0.035}, {rot:0, dx:15.47, dy:1.57, w:0.048, h:0.035}, {rot:0, dx:15.47, dy:1.57, w:0.048, h:0.035}],
        eyes_copy_1: [{rot:0, dx:0.85, dy:-6.03, w:0.048, h:0.035}, {rot:0, dx:0.85, dy:-6.03, w:0.048, h:0.035}, {rot:0, dx:0.85, dy:-6.03, w:0.048, h:0.035}, {rot:0, dx:0.85, dy:-6.03, w:0.048, h:0.035}],
        eyes_copy: [{rot:0, dx:-11.26, dy:-0.22, w:0.048, h:0.035}, {rot:0, dx:-11.26, dy:-0.22, w:0.048, h:0.035}, {rot:0, dx:-11.26, dy:-0.22, w:0.048, h:0.035}, {rot:0, dx:-11.26, dy:-0.22, w:0.048, h:0.035}],
        eyes: [{rot:0, dx:27.66, dy:-6.01, w:0.048, h:0.035}, {rot:0, dx:27.66, dy:-6.01, w:0.048, h:0.035}, {rot:0, dx:27.66, dy:-6.01, w:0.048, h:0.035}, {rot:0, dx:27.66, dy:-6.01, w:0.048, h:0.035}],
        mouth_copy_5: [{rot:12.5, dx:22.09, dy:-0.43, w:0.051, h:0.042}, {rot:12.5, dx:22.09, dy:-0.43, w:0.051, h:0.042}, {rot:12.5, dx:22.09, dy:-0.43, w:0.051, h:0.042}, {rot:12.5, dx:22.09, dy:-0.43, w:0.051, h:0.042}],
        mouth_copy_4: [{rot:0, dx:13.75, dy:34.19, w:0.051, h:0.042}, {rot:0, dx:13.75, dy:34.19, w:0.051, h:0.042}, {rot:0, dx:13.75, dy:34.19, w:0.051, h:0.042}, {rot:0, dx:13.75, dy:34.19, w:0.051, h:0.042}],
        mouth_copy_3: [{rot:0, dx:-5.42, dy:25.88, w:0.057, h:0.02}, {rot:0, dx:-5.42, dy:25.88, w:0.057, h:0.02}, {rot:0, dx:-5.42, dy:25.88, w:0.057, h:0.02}, {rot:0, dx:-5.42, dy:25.88, w:0.057, h:0.02}],
        mouth_copy_2: [{rot:0, dx:7.64, dy:7.67, w:0.062, h:0.028}, {rot:0, dx:7.64, dy:7.67, w:0.062, h:0.028}, {rot:0, dx:7.64, dy:7.67, w:0.062, h:0.028}, {rot:0, dx:7.64, dy:7.67, w:0.062, h:0.028}],
        mouth_copy: [{rot:0, dx:-18.56, dy:5.09, w:0.062, h:0.028}, {rot:0, dx:-18.56, dy:5.09, w:0.062, h:0.028}, {rot:0, dx:-18.56, dy:5.09, w:0.062, h:0.028}, {rot:0, dx:-18.56, dy:5.09, w:0.062, h:0.028}],
        mouth: [{rot:0, dx:36.27, dy:8.1, w:0.051, h:0.042}, {rot:0, dx:36.27, dy:8.1, w:0.051, h:0.042}, {rot:0, dx:36.27, dy:8.1, w:0.051, h:0.042}, {rot:0, dx:36.27, dy:8.1, w:0.051, h:0.042}]
      }
    },
    walk: {
      frameCount: 4, fps: 4, loop: true,
      keys: {
        swamp: [{rot:2.3, dx:39.62, dy:-6.45, w:0.852, h:0.246}, {rot:2.3, dx:39.62, dy:-6.45, w:0.852, h:0.246}, {rot:2.3, dx:39.62, dy:-6.45, w:0.852, h:0.246}, {rot:2.3, dx:39.62, dy:-6.45, w:0.852, h:0.246}],
        body_copy_1: [{rot:0, dx:44.61, dy:-1.22, w:0.244, h:0.143}, {rot:0, dx:44.61, dy:-1.72, w:0.244, h:0.143}, {rot:0, dx:44.61, dy:-2.22, w:0.244, h:0.143}, {rot:0, dx:44.61, dy:-1.72, w:0.244, h:0.143}],
        body: [{rot:0, dx:26.58, dy:-1.29, w:0.309, h:0.19}, {rot:0, dx:26.58, dy:-1.79, w:0.309, h:0.19}, {rot:0, dx:26.58, dy:-2.29, w:0.309, h:0.19}, {rot:0, dx:26.58, dy:-1.79, w:0.309, h:0.19}],
        body_copy: [{rot:0, dx:1.12, dy:-1.37, w:0.414, h:0.312}, {rot:0, dx:1.12, dy:-1.87, w:0.414, h:0.312}, {rot:0, dx:1.12, dy:-2.37, w:0.414, h:0.312}, {rot:0, dx:1.12, dy:-1.87, w:0.414, h:0.312}],
        neck_7: [{rot:40.4, dx:-16.5, dy:3.58, w:0.04, h:0.16}, {rot:40.4, dx:-16.5, dy:3.28, w:0.04, h:0.16}, {rot:40.4, dx:-16.5, dy:2.98, w:0.04, h:0.16}, {rot:40.4, dx:-16.5, dy:3.28, w:0.04, h:0.16}],
        neck_6: [{rot:-12.5, dx:-4.98, dy:3.8, w:0.04, h:0.15}, {rot:-12.5, dx:-4.98, dy:3.5, w:0.04, h:0.15}, {rot:-12.5, dx:-4.98, dy:3.2, w:0.04, h:0.15}, {rot:-12.5, dx:-4.98, dy:3.5, w:0.04, h:0.15}],
        neck_5: [{rot:18, dx:-5.59, dy:13.04, w:0.04, h:0.15}, {rot:18, dx:-5.59, dy:12.74, w:0.04, h:0.15}, {rot:18, dx:-5.59, dy:12.44, w:0.04, h:0.15}, {rot:18, dx:-5.59, dy:12.74, w:0.04, h:0.15}],
        neck_4: [{rot:0, dx:-1.03, dy:9.61, w:0.04, h:0.14}, {rot:0, dx:-1.03, dy:9.31, w:0.04, h:0.14}, {rot:0, dx:-1.03, dy:9.01, w:0.04, h:0.14}, {rot:0, dx:-1.03, dy:9.31, w:0.04, h:0.14}],
        neck_3_copy: [{rot:17.3, dx:-3.7, dy:7.89, w:0.04, h:0.15}, {rot:17.3, dx:-3.7, dy:7.59, w:0.04, h:0.15}, {rot:17.3, dx:-3.7, dy:7.29, w:0.04, h:0.15}, {rot:17.3, dx:-3.7, dy:7.59, w:0.04, h:0.15}],
        neck_3: [{rot:-5.8, dx:3.52, dy:9.33, w:0.045, h:0.138}, {rot:-5.8, dx:3.52, dy:9.03, w:0.045, h:0.138}, {rot:-5.8, dx:3.52, dy:8.73, w:0.045, h:0.138}, {rot:-5.8, dx:3.52, dy:9.03, w:0.045, h:0.138}],
        neck_2: [{rot:0, dx:0.77, dy:1.43, w:0.035, h:0.215}, {rot:0, dx:0.77, dy:1.13, w:0.035, h:0.215}, {rot:0, dx:0.77, dy:0.83, w:0.035, h:0.215}, {rot:0, dx:0.77, dy:1.13, w:0.035, h:0.215}],
        neck_1: [{rot:-16.8, dx:3.35, dy:0.93, w:0.043, h:0.143}, {rot:-16.8, dx:3.35, dy:0.63, w:0.043, h:0.143}, {rot:-16.8, dx:3.35, dy:0.33, w:0.043, h:0.143}, {rot:-16.8, dx:3.35, dy:0.63, w:0.043, h:0.143}],
        head_7: [{rot:-40.4, dx:-7.82, dy:14.12, w:0.119, h:0.138}, {rot:-40.4, dx:-7.82, dy:13.82, w:0.119, h:0.138}, {rot:-40.4, dx:-7.82, dy:13.52, w:0.119, h:0.138}, {rot:-40.4, dx:-7.82, dy:13.82, w:0.119, h:0.138}],
        head_6: [{rot:12.5, dx:-10.83, dy:7.31, w:0.123, h:0.121}, {rot:12.5, dx:-10.83, dy:7.01, w:0.123, h:0.121}, {rot:12.5, dx:-10.83, dy:6.71, w:0.123, h:0.121}, {rot:12.5, dx:-10.83, dy:7.01, w:0.123, h:0.121}],
        head_5: [{rot:-18, dx:-8.42, dy:44.23, w:0.083, h:0.147}, {rot:-18, dx:-8.42, dy:43.93, w:0.083, h:0.147}, {rot:-18, dx:-8.42, dy:43.63, w:0.083, h:0.147}, {rot:-18, dx:-8.42, dy:43.93, w:0.083, h:0.147}],
        head_4: [{rot:0, dx:-1.89, dy:15.91, w:0.125, h:0.114}, {rot:0, dx:-1.89, dy:15.61, w:0.125, h:0.114}, {rot:0, dx:-1.89, dy:15.31, w:0.125, h:0.114}, {rot:0, dx:-1.89, dy:15.61, w:0.125, h:0.114}],
        head_3: [{rot:0, dx:-5.59, dy:34.12, w:0.129, h:0.137}, {rot:0, dx:-5.59, dy:33.82, w:0.129, h:0.137}, {rot:0, dx:-5.59, dy:33.52, w:0.129, h:0.137}, {rot:0, dx:-5.59, dy:33.82, w:0.129, h:0.137}],
        head_2: [{rot:0, dx:1.72, dy:7.74, w:0.138, h:0.157}, {rot:0, dx:1.72, dy:7.44, w:0.138, h:0.157}, {rot:0, dx:1.72, dy:7.14, w:0.138, h:0.157}, {rot:0, dx:1.72, dy:7.44, w:0.138, h:0.157}],
        mouth_copy_1: [{rot:0, dx:-6.45, dy:1.08, w:0.062, h:0.028}, {rot:0, dx:-6.45, dy:1.08, w:0.062, h:0.028}, {rot:0, dx:-6.45, dy:1.08, w:0.062, h:0.028}, {rot:0, dx:-6.45, dy:1.08, w:0.062, h:0.028}],
        head_1: [{rot:16.8, dx:0.25, dy:7.6, w:0.123, h:0.108}, {rot:16.8, dx:0.25, dy:7.3, w:0.123, h:0.108}, {rot:16.8, dx:0.25, dy:7, w:0.123, h:0.108}, {rot:16.8, dx:0.25, dy:7.3, w:0.123, h:0.108}],
        eyes_copy_5_copy: [{rot:0, dx:13.57, dy:27.17, w:0.048, h:0.035}, {rot:0, dx:13.57, dy:27.17, w:0.048, h:0.035}, {rot:0, dx:13.57, dy:27.17, w:0.048, h:0.035}, {rot:0, dx:13.57, dy:27.17, w:0.048, h:0.035}],
        eyes_copy_copy: [{rot:0, dx:-16.76, dy:0.14, w:0.048, h:0.035}, {rot:0, dx:-16.76, dy:0.14, w:0.048, h:0.035}, {rot:0, dx:-16.76, dy:0.14, w:0.048, h:0.035}, {rot:0, dx:-16.76, dy:0.14, w:0.048, h:0.035}],
        eyes_copy_1_copy: [{rot:0, dx:-4.99, dy:-5.24, w:0.048, h:0.035}, {rot:0, dx:-4.99, dy:-5.24, w:0.048, h:0.035}, {rot:0, dx:-4.99, dy:-5.24, w:0.048, h:0.035}, {rot:0, dx:-4.99, dy:-5.24, w:0.048, h:0.035}],
        eyes_copy_2_copy: [{rot:0, dx:9.45, dy:2, w:0.048, h:0.035}, {rot:0, dx:9.45, dy:2, w:0.048, h:0.035}, {rot:0, dx:9.45, dy:2, w:0.048, h:0.035}, {rot:0, dx:9.45, dy:2, w:0.048, h:0.035}],
        eyes_copy_6_copy_1: [{rot:0, dx:38.67, dy:3.38, w:0.048, h:0.035}, {rot:0, dx:38.67, dy:3.38, w:0.048, h:0.035}, {rot:0, dx:38.67, dy:3.38, w:0.048, h:0.035}, {rot:0, dx:38.67, dy:3.38, w:0.048, h:0.035}],
        eyes_copy_6_copy: [{rot:0, dx:20.19, dy:-6.23, w:0.048, h:0.035}, {rot:0, dx:20.19, dy:-6.23, w:0.048, h:0.035}, {rot:0, dx:20.19, dy:-6.23, w:0.048, h:0.035}, {rot:0, dx:20.19, dy:-6.23, w:0.048, h:0.035}],
        eyes_copy_6: [{rot:0, dx:33, dy:3.88, w:0.048, h:0.035}, {rot:0, dx:33, dy:3.88, w:0.048, h:0.035}, {rot:0, dx:33, dy:3.88, w:0.048, h:0.035}, {rot:0, dx:33, dy:3.88, w:0.048, h:0.035}],
        eyes_copy_5: [{rot:0, dx:18.56, dy:25.09, w:0.044, h:0.035}, {rot:0, dx:18.56, dy:25.09, w:0.044, h:0.035}, {rot:0, dx:18.56, dy:25.09, w:0.044, h:0.035}, {rot:0, dx:18.56, dy:25.09, w:0.044, h:0.035}],
        eyes_copy_4: [{rot:0, dx:-0.52, dy:21.65, w:0.048, h:0.035}, {rot:0, dx:-0.52, dy:21.65, w:0.048, h:0.035}, {rot:0, dx:-0.52, dy:21.65, w:0.048, h:0.035}, {rot:0, dx:-0.52, dy:21.65, w:0.048, h:0.035}],
        eyes_copy_3: [{rot:0, dx:-6.54, dy:21.22, w:0.048, h:0.035}, {rot:0, dx:-6.54, dy:21.22, w:0.048, h:0.035}, {rot:0, dx:-6.54, dy:21.22, w:0.048, h:0.035}, {rot:0, dx:-6.54, dy:21.22, w:0.048, h:0.035}],
        eyes_copy_2: [{rot:0, dx:15.47, dy:1.57, w:0.048, h:0.035}, {rot:0, dx:15.47, dy:1.57, w:0.048, h:0.035}, {rot:0, dx:15.47, dy:1.57, w:0.048, h:0.035}, {rot:0, dx:15.47, dy:1.57, w:0.048, h:0.035}],
        eyes_copy_1: [{rot:0, dx:0.85, dy:-6.03, w:0.048, h:0.035}, {rot:0, dx:0.85, dy:-6.03, w:0.048, h:0.035}, {rot:0, dx:0.85, dy:-6.03, w:0.048, h:0.035}, {rot:0, dx:0.85, dy:-6.03, w:0.048, h:0.035}],
        eyes_copy: [{rot:0, dx:-11.26, dy:-0.22, w:0.048, h:0.035}, {rot:0, dx:-11.26, dy:-0.22, w:0.048, h:0.035}, {rot:0, dx:-11.26, dy:-0.22, w:0.048, h:0.035}, {rot:0, dx:-11.26, dy:-0.22, w:0.048, h:0.035}],
        eyes: [{rot:0, dx:27.66, dy:-6.01, w:0.048, h:0.035}, {rot:0, dx:27.66, dy:-6.01, w:0.048, h:0.035}, {rot:0, dx:27.66, dy:-6.01, w:0.048, h:0.035}, {rot:0, dx:27.66, dy:-6.01, w:0.048, h:0.035}],
        mouth_copy_5: [{rot:12.5, dx:22.09, dy:-0.43, w:0.051, h:0.042}, {rot:12.5, dx:22.09, dy:-0.43, w:0.051, h:0.042}, {rot:12.5, dx:22.09, dy:-0.43, w:0.051, h:0.042}, {rot:12.5, dx:22.09, dy:-0.43, w:0.051, h:0.042}],
        mouth_copy_4: [{rot:0, dx:13.75, dy:34.19, w:0.051, h:0.042}, {rot:0, dx:13.75, dy:34.19, w:0.051, h:0.042}, {rot:0, dx:13.75, dy:34.19, w:0.051, h:0.042}, {rot:0, dx:13.75, dy:34.19, w:0.051, h:0.042}],
        mouth_copy_3: [{rot:0, dx:-5.42, dy:25.88, w:0.057, h:0.02}, {rot:0, dx:-5.42, dy:25.88, w:0.057, h:0.02}, {rot:0, dx:-5.42, dy:25.88, w:0.057, h:0.02}, {rot:0, dx:-5.42, dy:25.88, w:0.057, h:0.02}],
        mouth_copy_2: [{rot:0, dx:7.64, dy:7.67, w:0.062, h:0.028}, {rot:0, dx:7.64, dy:7.67, w:0.062, h:0.028}, {rot:0, dx:7.64, dy:7.67, w:0.062, h:0.028}, {rot:0, dx:7.64, dy:7.67, w:0.062, h:0.028}],
        mouth_copy: [{rot:0, dx:-18.56, dy:5.09, w:0.062, h:0.028}, {rot:0, dx:-18.56, dy:5.09, w:0.062, h:0.028}, {rot:0, dx:-18.56, dy:5.09, w:0.062, h:0.028}, {rot:0, dx:-18.56, dy:5.09, w:0.062, h:0.028}],
        mouth: [{rot:0, dx:36.27, dy:8.1, w:0.051, h:0.042}, {rot:0, dx:36.27, dy:8.1, w:0.051, h:0.042}, {rot:0, dx:36.27, dy:8.1, w:0.051, h:0.042}, {rot:0, dx:36.27, dy:8.1, w:0.051, h:0.042}]
      }
    },
    hurt: {
      frameCount: 4, fps: 12, loop: false,
      keys: {
        swamp: [{rot:2.3, dx:39.62, dy:-6.45, w:0.852, h:0.246}, {rot:2.3, dx:39.62, dy:-6.45, w:0.852, h:0.246}, {rot:2.3, dx:39.62, dy:-6.45, w:0.852, h:0.246}, {rot:2.3, dx:39.62, dy:-6.45, w:0.852, h:0.246}],
        body_copy_1: [{rot:0, dx:44.61, dy:-1.22, w:0.244, h:0.143}, {rot:0, dx:45.61, dy:-1.22, w:0.244, h:0.143}, {rot:0, dx:43.61, dy:-1.22, w:0.244, h:0.143}, {rot:0, dx:44.61, dy:-1.22, w:0.244, h:0.143}],
        body: [{rot:0, dx:26.58, dy:-1.29, w:0.309, h:0.19}, {rot:0, dx:27.58, dy:-1.29, w:0.309, h:0.19}, {rot:0, dx:25.58, dy:-1.29, w:0.309, h:0.19}, {rot:0, dx:26.58, dy:-1.29, w:0.309, h:0.19}],
        body_copy: [{rot:0, dx:1.12, dy:-1.37, w:0.414, h:0.312}, {rot:0, dx:2.12, dy:-1.37, w:0.414, h:0.312}, {rot:0, dx:0.12, dy:-1.37, w:0.414, h:0.312}, {rot:0, dx:1.12, dy:-1.37, w:0.414, h:0.312}],
        neck_7: [{rot:40.4, dx:-16.5, dy:3.58, w:0.04, h:0.16}, {rot:42.4, dx:-16.5, dy:3.58, w:0.04, h:0.16}, {rot:38.4, dx:-16.5, dy:3.58, w:0.04, h:0.16}, {rot:40.4, dx:-16.5, dy:3.58, w:0.04, h:0.16}],
        neck_6: [{rot:-12.5, dx:-4.98, dy:3.8, w:0.04, h:0.15}, {rot:-10.5, dx:-4.98, dy:3.8, w:0.04, h:0.15}, {rot:-14.5, dx:-4.98, dy:3.8, w:0.04, h:0.15}, {rot:-12.5, dx:-4.98, dy:3.8, w:0.04, h:0.15}],
        neck_5: [{rot:18, dx:-5.59, dy:13.04, w:0.04, h:0.15}, {rot:20, dx:-5.59, dy:13.04, w:0.04, h:0.15}, {rot:16, dx:-5.59, dy:13.04, w:0.04, h:0.15}, {rot:18, dx:-5.59, dy:13.04, w:0.04, h:0.15}],
        neck_4: [{rot:0, dx:-1.03, dy:9.61, w:0.04, h:0.14}, {rot:2, dx:-1.03, dy:9.61, w:0.04, h:0.14}, {rot:-2, dx:-1.03, dy:9.61, w:0.04, h:0.14}, {rot:0, dx:-1.03, dy:9.61, w:0.04, h:0.14}],
        neck_3_copy: [{rot:17.3, dx:-3.7, dy:7.89, w:0.04, h:0.15}, {rot:19.3, dx:-3.7, dy:7.89, w:0.04, h:0.15}, {rot:15.3, dx:-3.7, dy:7.89, w:0.04, h:0.15}, {rot:17.3, dx:-3.7, dy:7.89, w:0.04, h:0.15}],
        neck_3: [{rot:-5.8, dx:3.52, dy:9.33, w:0.045, h:0.138}, {rot:-3.8, dx:3.52, dy:9.33, w:0.045, h:0.138}, {rot:-7.8, dx:3.52, dy:9.33, w:0.045, h:0.138}, {rot:-5.8, dx:3.52, dy:9.33, w:0.045, h:0.138}],
        neck_2: [{rot:0, dx:0.77, dy:1.43, w:0.035, h:0.215}, {rot:2, dx:0.77, dy:1.43, w:0.035, h:0.215}, {rot:-2, dx:0.77, dy:1.43, w:0.035, h:0.215}, {rot:0, dx:0.77, dy:1.43, w:0.035, h:0.215}],
        neck_1: [{rot:-16.8, dx:3.35, dy:0.93, w:0.043, h:0.143}, {rot:-14.8, dx:3.35, dy:0.93, w:0.043, h:0.143}, {rot:-18.8, dx:3.35, dy:0.93, w:0.043, h:0.143}, {rot:-16.8, dx:3.35, dy:0.93, w:0.043, h:0.143}],
        head_7: [{rot:-40.4, dx:-7.82, dy:14.12, w:0.119, h:0.138}, {rot:-37.4, dx:-7.82, dy:14.12, w:0.119, h:0.138}, {rot:-43.4, dx:-7.82, dy:14.12, w:0.119, h:0.138}, {rot:-40.4, dx:-7.82, dy:14.12, w:0.119, h:0.138}],
        head_6: [{rot:12.5, dx:-10.83, dy:7.31, w:0.123, h:0.121}, {rot:15.5, dx:-10.83, dy:7.31, w:0.123, h:0.121}, {rot:9.5, dx:-10.83, dy:7.31, w:0.123, h:0.121}, {rot:12.5, dx:-10.83, dy:7.31, w:0.123, h:0.121}],
        head_5: [{rot:-18, dx:-8.42, dy:44.23, w:0.083, h:0.147}, {rot:-15, dx:-8.42, dy:44.23, w:0.083, h:0.147}, {rot:-21, dx:-8.42, dy:44.23, w:0.083, h:0.147}, {rot:-18, dx:-8.42, dy:44.23, w:0.083, h:0.147}],
        head_4: [{rot:0, dx:-1.89, dy:15.91, w:0.125, h:0.114}, {rot:3, dx:-1.89, dy:15.91, w:0.125, h:0.114}, {rot:-3, dx:-1.89, dy:15.91, w:0.125, h:0.114}, {rot:0, dx:-1.89, dy:15.91, w:0.125, h:0.114}],
        head_3: [{rot:0, dx:-5.59, dy:34.12, w:0.129, h:0.137}, {rot:3, dx:-5.59, dy:34.12, w:0.129, h:0.137}, {rot:-3, dx:-5.59, dy:34.12, w:0.129, h:0.137}, {rot:0, dx:-5.59, dy:34.12, w:0.129, h:0.137}],
        head_2: [{rot:0, dx:1.72, dy:7.74, w:0.138, h:0.157}, {rot:3, dx:1.72, dy:7.74, w:0.138, h:0.157}, {rot:-3, dx:1.72, dy:7.74, w:0.138, h:0.157}, {rot:0, dx:1.72, dy:7.74, w:0.138, h:0.157}],
        mouth_copy_1: [{rot:0, dx:-6.45, dy:1.08, w:0.062, h:0.028}, {rot:0, dx:-6.45, dy:1.08, w:0.062, h:0.028}, {rot:0, dx:-6.45, dy:1.08, w:0.062, h:0.028}, {rot:0, dx:-6.45, dy:1.08, w:0.062, h:0.028}],
        head_1: [{rot:16.8, dx:0.25, dy:7.6, w:0.123, h:0.108}, {rot:19.8, dx:0.25, dy:7.6, w:0.123, h:0.108}, {rot:13.8, dx:0.25, dy:7.6, w:0.123, h:0.108}, {rot:16.8, dx:0.25, dy:7.6, w:0.123, h:0.108}],
        eyes_copy_5_copy: [{rot:0, dx:13.57, dy:27.17, w:0.048, h:0.035}, {rot:0, dx:13.57, dy:27.17, w:0.048, h:0.035}, {rot:0, dx:13.57, dy:27.17, w:0.048, h:0.035}, {rot:0, dx:13.57, dy:27.17, w:0.048, h:0.035}],
        eyes_copy_copy: [{rot:0, dx:-16.76, dy:0.14, w:0.048, h:0.035}, {rot:0, dx:-16.76, dy:0.14, w:0.048, h:0.035}, {rot:0, dx:-16.76, dy:0.14, w:0.048, h:0.035}, {rot:0, dx:-16.76, dy:0.14, w:0.048, h:0.035}],
        eyes_copy_1_copy: [{rot:0, dx:-4.99, dy:-5.24, w:0.048, h:0.035}, {rot:0, dx:-4.99, dy:-5.24, w:0.048, h:0.035}, {rot:0, dx:-4.99, dy:-5.24, w:0.048, h:0.035}, {rot:0, dx:-4.99, dy:-5.24, w:0.048, h:0.035}],
        eyes_copy_2_copy: [{rot:0, dx:9.45, dy:2, w:0.048, h:0.035}, {rot:0, dx:9.45, dy:2, w:0.048, h:0.035}, {rot:0, dx:9.45, dy:2, w:0.048, h:0.035}, {rot:0, dx:9.45, dy:2, w:0.048, h:0.035}],
        eyes_copy_6_copy_1: [{rot:0, dx:38.67, dy:3.38, w:0.048, h:0.035}, {rot:0, dx:38.67, dy:3.38, w:0.048, h:0.035}, {rot:0, dx:38.67, dy:3.38, w:0.048, h:0.035}, {rot:0, dx:38.67, dy:3.38, w:0.048, h:0.035}],
        eyes_copy_6_copy: [{rot:0, dx:20.19, dy:-6.23, w:0.048, h:0.035}, {rot:0, dx:20.19, dy:-6.23, w:0.048, h:0.035}, {rot:0, dx:20.19, dy:-6.23, w:0.048, h:0.035}, {rot:0, dx:20.19, dy:-6.23, w:0.048, h:0.035}],
        eyes_copy_6: [{rot:0, dx:33, dy:3.88, w:0.048, h:0.035}, {rot:0, dx:33, dy:3.88, w:0.048, h:0.035}, {rot:0, dx:33, dy:3.88, w:0.048, h:0.035}, {rot:0, dx:33, dy:3.88, w:0.048, h:0.035}],
        eyes_copy_5: [{rot:0, dx:18.56, dy:25.09, w:0.044, h:0.035}, {rot:0, dx:18.56, dy:25.09, w:0.044, h:0.035}, {rot:0, dx:18.56, dy:25.09, w:0.044, h:0.035}, {rot:0, dx:18.56, dy:25.09, w:0.044, h:0.035}],
        eyes_copy_4: [{rot:0, dx:-0.52, dy:21.65, w:0.048, h:0.035}, {rot:0, dx:-0.52, dy:21.65, w:0.048, h:0.035}, {rot:0, dx:-0.52, dy:21.65, w:0.048, h:0.035}, {rot:0, dx:-0.52, dy:21.65, w:0.048, h:0.035}],
        eyes_copy_3: [{rot:0, dx:-6.54, dy:21.22, w:0.048, h:0.035}, {rot:0, dx:-6.54, dy:21.22, w:0.048, h:0.035}, {rot:0, dx:-6.54, dy:21.22, w:0.048, h:0.035}, {rot:0, dx:-6.54, dy:21.22, w:0.048, h:0.035}],
        eyes_copy_2: [{rot:0, dx:15.47, dy:1.57, w:0.048, h:0.035}, {rot:0, dx:15.47, dy:1.57, w:0.048, h:0.035}, {rot:0, dx:15.47, dy:1.57, w:0.048, h:0.035}, {rot:0, dx:15.47, dy:1.57, w:0.048, h:0.035}],
        eyes_copy_1: [{rot:0, dx:0.85, dy:-6.03, w:0.048, h:0.035}, {rot:0, dx:0.85, dy:-6.03, w:0.048, h:0.035}, {rot:0, dx:0.85, dy:-6.03, w:0.048, h:0.035}, {rot:0, dx:0.85, dy:-6.03, w:0.048, h:0.035}],
        eyes_copy: [{rot:0, dx:-11.26, dy:-0.22, w:0.048, h:0.035}, {rot:0, dx:-11.26, dy:-0.22, w:0.048, h:0.035}, {rot:0, dx:-11.26, dy:-0.22, w:0.048, h:0.035}, {rot:0, dx:-11.26, dy:-0.22, w:0.048, h:0.035}],
        eyes: [{rot:0, dx:27.66, dy:-6.01, w:0.048, h:0.035}, {rot:0, dx:27.66, dy:-6.01, w:0.048, h:0.035}, {rot:0, dx:27.66, dy:-6.01, w:0.048, h:0.035}, {rot:0, dx:27.66, dy:-6.01, w:0.048, h:0.035}],
        mouth_copy_5: [{rot:12.5, dx:22.09, dy:-0.43, w:0.051, h:0.042}, {rot:12.5, dx:22.09, dy:-0.43, w:0.051, h:0.042}, {rot:12.5, dx:22.09, dy:-0.43, w:0.051, h:0.042}, {rot:12.5, dx:22.09, dy:-0.43, w:0.051, h:0.042}],
        mouth_copy_4: [{rot:0, dx:13.75, dy:34.19, w:0.051, h:0.042}, {rot:0, dx:13.75, dy:34.19, w:0.051, h:0.042}, {rot:0, dx:13.75, dy:34.19, w:0.051, h:0.042}, {rot:0, dx:13.75, dy:34.19, w:0.051, h:0.042}],
        mouth_copy_3: [{rot:0, dx:-5.42, dy:25.88, w:0.057, h:0.02}, {rot:0, dx:-5.42, dy:25.88, w:0.057, h:0.02}, {rot:0, dx:-5.42, dy:25.88, w:0.057, h:0.02}, {rot:0, dx:-5.42, dy:25.88, w:0.057, h:0.02}],
        mouth_copy_2: [{rot:0, dx:7.64, dy:7.67, w:0.062, h:0.028}, {rot:0, dx:7.64, dy:7.67, w:0.062, h:0.028}, {rot:0, dx:7.64, dy:7.67, w:0.062, h:0.028}, {rot:0, dx:7.64, dy:7.67, w:0.062, h:0.028}],
        mouth_copy: [{rot:0, dx:-18.56, dy:5.09, w:0.062, h:0.028}, {rot:0, dx:-18.56, dy:5.09, w:0.062, h:0.028}, {rot:0, dx:-18.56, dy:5.09, w:0.062, h:0.028}, {rot:0, dx:-18.56, dy:5.09, w:0.062, h:0.028}],
        mouth: [{rot:0, dx:36.27, dy:8.1, w:0.051, h:0.042}, {rot:0, dx:36.27, dy:8.1, w:0.051, h:0.042}, {rot:0, dx:36.27, dy:8.1, w:0.051, h:0.042}, {rot:0, dx:36.27, dy:8.1, w:0.051, h:0.042}]
      }
    },
    skill_charge: {
      frameCount: 8, fps: 10, loop: false,
      keys: {
        swamp: [{rot:2.3, dx:39.62, dy:-6.45, w:0.852, h:0.246}, {rot:2.3, dx:39.62, dy:-6.45, w:0.852, h:0.246}, {rot:2.3, dx:39.62, dy:-6.45, w:0.852, h:0.246}, {rot:2.3, dx:39.62, dy:-6.45, w:0.852, h:0.246}, {rot:2.3, dx:39.62, dy:-6.45, w:0.852, h:0.246}, {rot:2.3, dx:39.62, dy:-6.45, w:0.852, h:0.246}, {rot:2.3, dx:39.62, dy:-6.45, w:0.852, h:0.246}, {rot:2.3, dx:39.62, dy:-6.45, w:0.852, h:0.246}],
        body_copy_1: [{rot:0, dx:44.61, dy:-1.22, w:0.244, h:0.143}, {rot:-1, dx:44.61, dy:-1.52, w:0.244, h:0.143}, {rot:-1.5, dx:44.61, dy:-1.72, w:0.244, h:0.143}, {rot:-2, dx:44.61, dy:-1.82, w:0.244, h:0.143}, {rot:1, dx:44.61, dy:-0.92, w:0.244, h:0.143}, {rot:2, dx:44.61, dy:-0.62, w:0.244, h:0.143}, {rot:1, dx:44.61, dy:-0.92, w:0.244, h:0.143}, {rot:0, dx:44.61, dy:-1.22, w:0.244, h:0.143}],
        body: [{rot:0, dx:26.58, dy:-1.29, w:0.309, h:0.19}, {rot:-1, dx:26.58, dy:-1.59, w:0.309, h:0.19}, {rot:-1.5, dx:26.58, dy:-1.79, w:0.309, h:0.19}, {rot:-2, dx:26.58, dy:-1.89, w:0.309, h:0.19}, {rot:1, dx:26.58, dy:-0.99, w:0.309, h:0.19}, {rot:2, dx:26.58, dy:-0.69, w:0.309, h:0.19}, {rot:1, dx:26.58, dy:-0.99, w:0.309, h:0.19}, {rot:0, dx:26.58, dy:-1.29, w:0.309, h:0.19}],
        body_copy: [{rot:0, dx:1.12, dy:-1.37, w:0.414, h:0.312}, {rot:-1, dx:1.12, dy:-1.67, w:0.414, h:0.312}, {rot:-1.5, dx:1.12, dy:-1.87, w:0.414, h:0.312}, {rot:-2, dx:1.12, dy:-1.97, w:0.414, h:0.312}, {rot:1, dx:1.12, dy:-1.07, w:0.414, h:0.312}, {rot:2, dx:1.12, dy:-0.77, w:0.414, h:0.312}, {rot:1, dx:1.12, dy:-1.07, w:0.414, h:0.312}, {rot:0, dx:1.12, dy:-1.37, w:0.414, h:0.312}],
        neck_7: [{rot:40.4, dx:-16.5, dy:3.58, w:0.04, h:0.16}, {rot:37.4, dx:-16.5, dy:3.08, w:0.04, h:0.16}, {rot:34.4, dx:-16.5, dy:2.58, w:0.04, h:0.16}, {rot:32.4, dx:-16.5, dy:2.08, w:0.04, h:0.16}, {rot:46.4, dx:-16.5, dy:4.08, w:0.04, h:0.16}, {rot:54.4, dx:-16.5, dy:5.08, w:0.04, h:0.16}, {rot:46.4, dx:-16.5, dy:4.08, w:0.04, h:0.16}, {rot:40.4, dx:-16.5, dy:3.58, w:0.04, h:0.16}],
        neck_6: [{rot:-12.5, dx:-4.98, dy:3.8, w:0.04, h:0.15}, {rot:-15.5, dx:-4.98, dy:3.3, w:0.04, h:0.15}, {rot:-18.5, dx:-4.98, dy:2.8, w:0.04, h:0.15}, {rot:-20.5, dx:-4.98, dy:2.3, w:0.04, h:0.15}, {rot:-6.5, dx:-4.98, dy:4.3, w:0.04, h:0.15}, {rot:1.5, dx:-4.98, dy:5.3, w:0.04, h:0.15}, {rot:-6.5, dx:-4.98, dy:4.3, w:0.04, h:0.15}, {rot:-12.5, dx:-4.98, dy:3.8, w:0.04, h:0.15}],
        neck_5: [{rot:18, dx:-5.59, dy:13.04, w:0.04, h:0.15}, {rot:15, dx:-5.59, dy:12.54, w:0.04, h:0.15}, {rot:12, dx:-5.59, dy:12.04, w:0.04, h:0.15}, {rot:10, dx:-5.59, dy:11.54, w:0.04, h:0.15}, {rot:24, dx:-5.59, dy:13.54, w:0.04, h:0.15}, {rot:32, dx:-5.59, dy:14.54, w:0.04, h:0.15}, {rot:24, dx:-5.59, dy:13.54, w:0.04, h:0.15}, {rot:18, dx:-5.59, dy:13.04, w:0.04, h:0.15}],
        neck_4: [{rot:0, dx:-1.03, dy:9.61, w:0.04, h:0.14}, {rot:-3, dx:-1.03, dy:9.11, w:0.04, h:0.14}, {rot:-6, dx:-1.03, dy:8.61, w:0.04, h:0.14}, {rot:-8, dx:-1.03, dy:8.11, w:0.04, h:0.14}, {rot:6, dx:-1.03, dy:10.11, w:0.04, h:0.14}, {rot:14, dx:-1.03, dy:11.11, w:0.04, h:0.14}, {rot:6, dx:-1.03, dy:10.11, w:0.04, h:0.14}, {rot:0, dx:-1.03, dy:9.61, w:0.04, h:0.14}],
        neck_3_copy: [{rot:17.3, dx:-3.7, dy:7.89, w:0.04, h:0.15}, {rot:14.3, dx:-3.7, dy:7.39, w:0.04, h:0.15}, {rot:11.3, dx:-3.7, dy:6.89, w:0.04, h:0.15}, {rot:9.3, dx:-3.7, dy:6.39, w:0.04, h:0.15}, {rot:23.3, dx:-3.7, dy:8.39, w:0.04, h:0.15}, {rot:31.3, dx:-3.7, dy:9.39, w:0.04, h:0.15}, {rot:23.3, dx:-3.7, dy:8.39, w:0.04, h:0.15}, {rot:17.3, dx:-3.7, dy:7.89, w:0.04, h:0.15}],
        neck_3: [{rot:-5.8, dx:3.52, dy:9.33, w:0.045, h:0.138}, {rot:-8.8, dx:3.52, dy:8.83, w:0.045, h:0.138}, {rot:-11.8, dx:3.52, dy:8.33, w:0.045, h:0.138}, {rot:-13.8, dx:3.52, dy:7.83, w:0.045, h:0.138}, {rot:0.2, dx:3.52, dy:9.83, w:0.045, h:0.138}, {rot:8.2, dx:3.52, dy:10.83, w:0.045, h:0.138}, {rot:0.2, dx:3.52, dy:9.83, w:0.045, h:0.138}, {rot:-5.8, dx:3.52, dy:9.33, w:0.045, h:0.138}],
        neck_2: [{rot:0, dx:0.77, dy:1.43, w:0.035, h:0.215}, {rot:-3, dx:0.77, dy:0.93, w:0.035, h:0.215}, {rot:-6, dx:0.77, dy:0.43, w:0.035, h:0.215}, {rot:-8, dx:0.77, dy:-0.07, w:0.035, h:0.215}, {rot:6, dx:0.77, dy:1.93, w:0.035, h:0.215}, {rot:14, dx:0.77, dy:2.93, w:0.035, h:0.215}, {rot:6, dx:0.77, dy:1.93, w:0.035, h:0.215}, {rot:0, dx:0.77, dy:1.43, w:0.035, h:0.215}],
        neck_1: [{rot:-16.8, dx:3.35, dy:0.93, w:0.043, h:0.143}, {rot:-19.8, dx:3.35, dy:0.43, w:0.043, h:0.143}, {rot:-22.8, dx:3.35, dy:-0.07, w:0.043, h:0.143}, {rot:-24.8, dx:3.35, dy:-0.57, w:0.043, h:0.143}, {rot:-10.8, dx:3.35, dy:1.43, w:0.043, h:0.143}, {rot:-2.8, dx:3.35, dy:2.43, w:0.043, h:0.143}, {rot:-10.8, dx:3.35, dy:1.43, w:0.043, h:0.143}, {rot:-16.8, dx:3.35, dy:0.93, w:0.043, h:0.143}],
        head_7: [{rot:-40.4, dx:-7.82, dy:14.12, w:0.119, h:0.138}, {rot:-46.4, dx:-7.82, dy:13.32, w:0.119, h:0.138}, {rot:-50.4, dx:-7.82, dy:12.82, w:0.119, h:0.138}, {rot:-53.4, dx:-7.82, dy:12.52, w:0.119, h:0.138}, {rot:-30.4, dx:-7.82, dy:14.92, w:0.119, h:0.138}, {rot:-18.4, dx:-7.82, dy:15.92, w:0.119, h:0.138}, {rot:-30.4, dx:-7.82, dy:14.92, w:0.119, h:0.138}, {rot:-40.4, dx:-7.82, dy:14.12, w:0.119, h:0.138}],
        head_6: [{rot:12.5, dx:-10.83, dy:7.31, w:0.123, h:0.121}, {rot:6.5, dx:-10.83, dy:6.51, w:0.123, h:0.121}, {rot:2.5, dx:-10.83, dy:6.01, w:0.123, h:0.121}, {rot:-0.5, dx:-10.83, dy:5.71, w:0.123, h:0.121}, {rot:22.5, dx:-10.83, dy:8.11, w:0.123, h:0.121}, {rot:34.5, dx:-10.83, dy:9.11, w:0.123, h:0.121}, {rot:22.5, dx:-10.83, dy:8.11, w:0.123, h:0.121}, {rot:12.5, dx:-10.83, dy:7.31, w:0.123, h:0.121}],
        head_5: [{rot:-18, dx:-8.42, dy:44.23, w:0.083, h:0.147}, {rot:-24, dx:-8.42, dy:43.43, w:0.083, h:0.147}, {rot:-28, dx:-8.42, dy:42.93, w:0.083, h:0.147}, {rot:-31, dx:-8.42, dy:42.63, w:0.083, h:0.147}, {rot:-8, dx:-8.42, dy:45.03, w:0.083, h:0.147}, {rot:4, dx:-8.42, dy:46.03, w:0.083, h:0.147}, {rot:-8, dx:-8.42, dy:45.03, w:0.083, h:0.147}, {rot:-18, dx:-8.42, dy:44.23, w:0.083, h:0.147}],
        head_4: [{rot:0, dx:-1.89, dy:15.91, w:0.125, h:0.114}, {rot:-6, dx:-1.89, dy:15.11, w:0.125, h:0.114}, {rot:-10, dx:-1.89, dy:14.61, w:0.125, h:0.114}, {rot:-13, dx:-1.89, dy:14.31, w:0.125, h:0.114}, {rot:10, dx:-1.89, dy:16.71, w:0.125, h:0.114}, {rot:22, dx:-1.89, dy:17.71, w:0.125, h:0.114}, {rot:10, dx:-1.89, dy:16.71, w:0.125, h:0.114}, {rot:0, dx:-1.89, dy:15.91, w:0.125, h:0.114}],
        head_3: [{rot:0, dx:-5.59, dy:34.12, w:0.129, h:0.137}, {rot:-6, dx:-5.59, dy:33.32, w:0.129, h:0.137}, {rot:-10, dx:-5.59, dy:32.82, w:0.129, h:0.137}, {rot:-13, dx:-5.59, dy:32.52, w:0.129, h:0.137}, {rot:10, dx:-5.59, dy:34.92, w:0.129, h:0.137}, {rot:22, dx:-5.59, dy:35.92, w:0.129, h:0.137}, {rot:10, dx:-5.59, dy:34.92, w:0.129, h:0.137}, {rot:0, dx:-5.59, dy:34.12, w:0.129, h:0.137}],
        head_2: [{rot:0, dx:1.72, dy:7.74, w:0.138, h:0.157}, {rot:-6, dx:1.72, dy:6.94, w:0.138, h:0.157}, {rot:-10, dx:1.72, dy:6.44, w:0.138, h:0.157}, {rot:-13, dx:1.72, dy:6.14, w:0.138, h:0.157}, {rot:10, dx:1.72, dy:8.54, w:0.138, h:0.157}, {rot:22, dx:1.72, dy:9.54, w:0.138, h:0.157}, {rot:10, dx:1.72, dy:8.54, w:0.138, h:0.157}, {rot:0, dx:1.72, dy:7.74, w:0.138, h:0.157}],
        mouth_copy_1: [{rot:0, dx:-6.45, dy:1.08, w:0.062, h:0.028}, {rot:0, dx:-6.45, dy:1.08, w:0.062, h:0.028}, {rot:0, dx:-6.45, dy:1.08, w:0.062, h:0.028}, {rot:0, dx:-6.45, dy:1.08, w:0.062, h:0.028}, {rot:0, dx:-6.45, dy:1.08, w:0.062, h:0.028}, {rot:0, dx:-6.45, dy:1.08, w:0.062, h:0.028}, {rot:0, dx:-6.45, dy:1.08, w:0.062, h:0.028}, {rot:0, dx:-6.45, dy:1.08, w:0.062, h:0.028}],
        head_1: [{rot:16.8, dx:0.25, dy:7.6, w:0.123, h:0.108}, {rot:10.8, dx:0.25, dy:6.8, w:0.123, h:0.108}, {rot:6.8, dx:0.25, dy:6.3, w:0.123, h:0.108}, {rot:3.8, dx:0.25, dy:6, w:0.123, h:0.108}, {rot:26.8, dx:0.25, dy:8.4, w:0.123, h:0.108}, {rot:38.8, dx:0.25, dy:9.4, w:0.123, h:0.108}, {rot:26.8, dx:0.25, dy:8.4, w:0.123, h:0.108}, {rot:16.8, dx:0.25, dy:7.6, w:0.123, h:0.108}],
        eyes_copy_5_copy: [{rot:0, dx:13.57, dy:27.17, w:0.048, h:0.035}, {rot:0, dx:13.57, dy:27.17, w:0.048, h:0.035}, {rot:0, dx:13.57, dy:27.17, w:0.048, h:0.035}, {rot:0, dx:13.57, dy:27.17, w:0.048, h:0.035}, {rot:0, dx:13.57, dy:27.17, w:0.048, h:0.035}, {rot:0, dx:13.57, dy:27.17, w:0.048, h:0.035}, {rot:0, dx:13.57, dy:27.17, w:0.048, h:0.035}, {rot:0, dx:13.57, dy:27.17, w:0.048, h:0.035}],
        eyes_copy_copy: [{rot:0, dx:-16.76, dy:0.14, w:0.048, h:0.035}, {rot:0, dx:-16.76, dy:0.14, w:0.048, h:0.035}, {rot:0, dx:-16.76, dy:0.14, w:0.048, h:0.035}, {rot:0, dx:-16.76, dy:0.14, w:0.048, h:0.035}, {rot:0, dx:-16.76, dy:0.14, w:0.048, h:0.035}, {rot:0, dx:-16.76, dy:0.14, w:0.048, h:0.035}, {rot:0, dx:-16.76, dy:0.14, w:0.048, h:0.035}, {rot:0, dx:-16.76, dy:0.14, w:0.048, h:0.035}],
        eyes_copy_1_copy: [{rot:0, dx:-4.99, dy:-5.24, w:0.048, h:0.035}, {rot:0, dx:-4.99, dy:-5.24, w:0.048, h:0.035}, {rot:0, dx:-4.99, dy:-5.24, w:0.048, h:0.035}, {rot:0, dx:-4.99, dy:-5.24, w:0.048, h:0.035}, {rot:0, dx:-4.99, dy:-5.24, w:0.048, h:0.035}, {rot:0, dx:-4.99, dy:-5.24, w:0.048, h:0.035}, {rot:0, dx:-4.99, dy:-5.24, w:0.048, h:0.035}, {rot:0, dx:-4.99, dy:-5.24, w:0.048, h:0.035}],
        eyes_copy_2_copy: [{rot:0, dx:9.45, dy:2, w:0.048, h:0.035}, {rot:0, dx:9.45, dy:2, w:0.048, h:0.035}, {rot:0, dx:9.45, dy:2, w:0.048, h:0.035}, {rot:0, dx:9.45, dy:2, w:0.048, h:0.035}, {rot:0, dx:9.45, dy:2, w:0.048, h:0.035}, {rot:0, dx:9.45, dy:2, w:0.048, h:0.035}, {rot:0, dx:9.45, dy:2, w:0.048, h:0.035}, {rot:0, dx:9.45, dy:2, w:0.048, h:0.035}],
        eyes_copy_6_copy_1: [{rot:0, dx:38.67, dy:3.38, w:0.048, h:0.035}, {rot:0, dx:38.67, dy:3.38, w:0.048, h:0.035}, {rot:0, dx:38.67, dy:3.38, w:0.048, h:0.035}, {rot:0, dx:38.67, dy:3.38, w:0.048, h:0.035}, {rot:0, dx:38.67, dy:3.38, w:0.048, h:0.035}, {rot:0, dx:38.67, dy:3.38, w:0.048, h:0.035}, {rot:0, dx:38.67, dy:3.38, w:0.048, h:0.035}, {rot:0, dx:38.67, dy:3.38, w:0.048, h:0.035}],
        eyes_copy_6_copy: [{rot:0, dx:20.19, dy:-6.23, w:0.048, h:0.035}, {rot:0, dx:20.19, dy:-6.23, w:0.048, h:0.035}, {rot:0, dx:20.19, dy:-6.23, w:0.048, h:0.035}, {rot:0, dx:20.19, dy:-6.23, w:0.048, h:0.035}, {rot:0, dx:20.19, dy:-6.23, w:0.048, h:0.035}, {rot:0, dx:20.19, dy:-6.23, w:0.048, h:0.035}, {rot:0, dx:20.19, dy:-6.23, w:0.048, h:0.035}, {rot:0, dx:20.19, dy:-6.23, w:0.048, h:0.035}],
        eyes_copy_6: [{rot:0, dx:33, dy:3.88, w:0.048, h:0.035}, {rot:0, dx:33, dy:3.88, w:0.048, h:0.035}, {rot:0, dx:33, dy:3.88, w:0.048, h:0.035}, {rot:0, dx:33, dy:3.88, w:0.048, h:0.035}, {rot:0, dx:33, dy:3.88, w:0.048, h:0.035}, {rot:0, dx:33, dy:3.88, w:0.048, h:0.035}, {rot:0, dx:33, dy:3.88, w:0.048, h:0.035}, {rot:0, dx:33, dy:3.88, w:0.048, h:0.035}],
        eyes_copy_5: [{rot:0, dx:18.56, dy:25.09, w:0.044, h:0.035}, {rot:0, dx:18.56, dy:25.09, w:0.044, h:0.035}, {rot:0, dx:18.56, dy:25.09, w:0.044, h:0.035}, {rot:0, dx:18.56, dy:25.09, w:0.044, h:0.035}, {rot:0, dx:18.56, dy:25.09, w:0.044, h:0.035}, {rot:0, dx:18.56, dy:25.09, w:0.044, h:0.035}, {rot:0, dx:18.56, dy:25.09, w:0.044, h:0.035}, {rot:0, dx:18.56, dy:25.09, w:0.044, h:0.035}],
        eyes_copy_4: [{rot:0, dx:-0.52, dy:21.65, w:0.048, h:0.035}, {rot:0, dx:-0.52, dy:21.65, w:0.048, h:0.035}, {rot:0, dx:-0.52, dy:21.65, w:0.048, h:0.035}, {rot:0, dx:-0.52, dy:21.65, w:0.048, h:0.035}, {rot:0, dx:-0.52, dy:21.65, w:0.048, h:0.035}, {rot:0, dx:-0.52, dy:21.65, w:0.048, h:0.035}, {rot:0, dx:-0.52, dy:21.65, w:0.048, h:0.035}, {rot:0, dx:-0.52, dy:21.65, w:0.048, h:0.035}],
        eyes_copy_3: [{rot:0, dx:-6.54, dy:21.22, w:0.048, h:0.035}, {rot:0, dx:-6.54, dy:21.22, w:0.048, h:0.035}, {rot:0, dx:-6.54, dy:21.22, w:0.048, h:0.035}, {rot:0, dx:-6.54, dy:21.22, w:0.048, h:0.035}, {rot:0, dx:-6.54, dy:21.22, w:0.048, h:0.035}, {rot:0, dx:-6.54, dy:21.22, w:0.048, h:0.035}, {rot:0, dx:-6.54, dy:21.22, w:0.048, h:0.035}, {rot:0, dx:-6.54, dy:21.22, w:0.048, h:0.035}],
        eyes_copy_2: [{rot:0, dx:15.47, dy:1.57, w:0.048, h:0.035}, {rot:0, dx:15.47, dy:1.57, w:0.048, h:0.035}, {rot:0, dx:15.47, dy:1.57, w:0.048, h:0.035}, {rot:0, dx:15.47, dy:1.57, w:0.048, h:0.035}, {rot:0, dx:15.47, dy:1.57, w:0.048, h:0.035}, {rot:0, dx:15.47, dy:1.57, w:0.048, h:0.035}, {rot:0, dx:15.47, dy:1.57, w:0.048, h:0.035}, {rot:0, dx:15.47, dy:1.57, w:0.048, h:0.035}],
        eyes_copy_1: [{rot:0, dx:0.85, dy:-6.03, w:0.048, h:0.035}, {rot:0, dx:0.85, dy:-6.03, w:0.048, h:0.035}, {rot:0, dx:0.85, dy:-6.03, w:0.048, h:0.035}, {rot:0, dx:0.85, dy:-6.03, w:0.048, h:0.035}, {rot:0, dx:0.85, dy:-6.03, w:0.048, h:0.035}, {rot:0, dx:0.85, dy:-6.03, w:0.048, h:0.035}, {rot:0, dx:0.85, dy:-6.03, w:0.048, h:0.035}, {rot:0, dx:0.85, dy:-6.03, w:0.048, h:0.035}],
        eyes_copy: [{rot:0, dx:-11.26, dy:-0.22, w:0.048, h:0.035}, {rot:0, dx:-11.26, dy:-0.22, w:0.048, h:0.035}, {rot:0, dx:-11.26, dy:-0.22, w:0.048, h:0.035}, {rot:0, dx:-11.26, dy:-0.22, w:0.048, h:0.035}, {rot:0, dx:-11.26, dy:-0.22, w:0.048, h:0.035}, {rot:0, dx:-11.26, dy:-0.22, w:0.048, h:0.035}, {rot:0, dx:-11.26, dy:-0.22, w:0.048, h:0.035}, {rot:0, dx:-11.26, dy:-0.22, w:0.048, h:0.035}],
        eyes: [{rot:0, dx:27.66, dy:-6.01, w:0.048, h:0.035}, {rot:0, dx:27.66, dy:-6.01, w:0.048, h:0.035}, {rot:0, dx:27.66, dy:-6.01, w:0.048, h:0.035}, {rot:0, dx:27.66, dy:-6.01, w:0.048, h:0.035}, {rot:0, dx:27.66, dy:-6.01, w:0.048, h:0.035}, {rot:0, dx:27.66, dy:-6.01, w:0.048, h:0.035}, {rot:0, dx:27.66, dy:-6.01, w:0.048, h:0.035}, {rot:0, dx:27.66, dy:-6.01, w:0.048, h:0.035}],
        mouth_copy_5: [{rot:12.5, dx:22.09, dy:-0.43, w:0.051, h:0.042}, {rot:12.5, dx:22.09, dy:-0.43, w:0.051, h:0.042}, {rot:12.5, dx:22.09, dy:-0.43, w:0.051, h:0.042}, {rot:12.5, dx:22.09, dy:-0.43, w:0.051, h:0.042}, {rot:12.5, dx:22.09, dy:-0.43, w:0.051, h:0.042}, {rot:12.5, dx:22.09, dy:-0.43, w:0.051, h:0.042}, {rot:12.5, dx:22.09, dy:-0.43, w:0.051, h:0.042}, {rot:12.5, dx:22.09, dy:-0.43, w:0.051, h:0.042}],
        mouth_copy_4: [{rot:0, dx:13.75, dy:34.19, w:0.051, h:0.042}, {rot:0, dx:13.75, dy:34.19, w:0.051, h:0.042}, {rot:0, dx:13.75, dy:34.19, w:0.051, h:0.042}, {rot:0, dx:13.75, dy:34.19, w:0.051, h:0.042}, {rot:0, dx:13.75, dy:34.19, w:0.051, h:0.042}, {rot:0, dx:13.75, dy:34.19, w:0.051, h:0.042}, {rot:0, dx:13.75, dy:34.19, w:0.051, h:0.042}, {rot:0, dx:13.75, dy:34.19, w:0.051, h:0.042}],
        mouth_copy_3: [{rot:0, dx:-5.42, dy:25.88, w:0.057, h:0.02}, {rot:0, dx:-5.42, dy:25.88, w:0.057, h:0.02}, {rot:0, dx:-5.42, dy:25.88, w:0.057, h:0.02}, {rot:0, dx:-5.42, dy:25.88, w:0.057, h:0.02}, {rot:0, dx:-5.42, dy:25.88, w:0.057, h:0.02}, {rot:0, dx:-5.42, dy:25.88, w:0.057, h:0.02}, {rot:0, dx:-5.42, dy:25.88, w:0.057, h:0.02}, {rot:0, dx:-5.42, dy:25.88, w:0.057, h:0.02}],
        mouth_copy_2: [{rot:0, dx:7.64, dy:7.67, w:0.062, h:0.028}, {rot:0, dx:7.64, dy:7.67, w:0.062, h:0.028}, {rot:0, dx:7.64, dy:7.67, w:0.062, h:0.028}, {rot:0, dx:7.64, dy:7.67, w:0.062, h:0.028}, {rot:0, dx:7.64, dy:7.67, w:0.062, h:0.028}, {rot:0, dx:7.64, dy:7.67, w:0.062, h:0.028}, {rot:0, dx:7.64, dy:7.67, w:0.062, h:0.028}, {rot:0, dx:7.64, dy:7.67, w:0.062, h:0.028}],
        mouth_copy: [{rot:0, dx:-18.56, dy:5.09, w:0.062, h:0.028}, {rot:0, dx:-18.56, dy:5.09, w:0.062, h:0.028}, {rot:0, dx:-18.56, dy:5.09, w:0.062, h:0.028}, {rot:0, dx:-18.56, dy:5.09, w:0.062, h:0.028}, {rot:0, dx:-18.56, dy:5.09, w:0.062, h:0.028}, {rot:0, dx:-18.56, dy:5.09, w:0.062, h:0.028}, {rot:0, dx:-18.56, dy:5.09, w:0.062, h:0.028}, {rot:0, dx:-18.56, dy:5.09, w:0.062, h:0.028}],
        mouth: [{rot:0, dx:36.27, dy:8.1, w:0.051, h:0.042}, {rot:0, dx:36.27, dy:8.1, w:0.051, h:0.042}, {rot:0, dx:36.27, dy:8.1, w:0.051, h:0.042}, {rot:0, dx:36.27, dy:8.1, w:0.051, h:0.042}, {rot:0, dx:36.27, dy:8.1, w:0.051, h:0.042}, {rot:0, dx:36.27, dy:8.1, w:0.051, h:0.042}, {rot:0, dx:36.27, dy:8.1, w:0.051, h:0.042}, {rot:0, dx:36.27, dy:8.1, w:0.051, h:0.042}]
      }
    },
    death: {
      frameCount: 8, fps: 8, loop: false,
      keys: {
        swamp: [{rot:2.3, dx:39.62, dy:-6.45, w:0.852, h:0.246}, {rot:2.3, dx:39.62, dy:-6.45, w:0.852, h:0.246}, {rot:2.3, dx:39.62, dy:-6.45, w:0.852, h:0.246}, {rot:2.3, dx:39.62, dy:-6.45, w:0.852, h:0.246}, {rot:2.3, dx:39.62, dy:-6.45, w:0.852, h:0.246}, {rot:2.3, dx:39.62, dy:-6.45, w:0.852, h:0.246}, {rot:2.3, dx:39.62, dy:-6.45, w:0.852, h:0.246}, {rot:2.3, dx:39.62, dy:-6.45, w:0.852, h:0.246}],
        body_copy_1: [{rot:0, dx:44.61, dy:-1.22, w:0.244, h:0.143}, {rot:0.571, dx:44.61, dy:-0.649, w:0.244, h:0.143}, {rot:1.143, dx:44.61, dy:-0.077, w:0.244, h:0.143}, {rot:1.714, dx:44.61, dy:0.494, w:0.244, h:0.143}, {rot:2.286, dx:44.61, dy:1.066, w:0.244, h:0.143}, {rot:2.857, dx:44.61, dy:1.637, w:0.244, h:0.143}, {rot:3.429, dx:44.61, dy:2.209, w:0.244, h:0.143}, {rot:4, dx:44.61, dy:2.78, w:0.244, h:0.143}],
        body: [{rot:0, dx:26.58, dy:-1.29, w:0.309, h:0.19}, {rot:0.571, dx:26.58, dy:-0.719, w:0.309, h:0.19}, {rot:1.143, dx:26.58, dy:-0.147, w:0.309, h:0.19}, {rot:1.714, dx:26.58, dy:0.424, w:0.309, h:0.19}, {rot:2.286, dx:26.58, dy:0.996, w:0.309, h:0.19}, {rot:2.857, dx:26.58, dy:1.567, w:0.309, h:0.19}, {rot:3.429, dx:26.58, dy:2.139, w:0.309, h:0.19}, {rot:4, dx:26.58, dy:2.71, w:0.309, h:0.19}],
        body_copy: [{rot:0, dx:1.12, dy:-1.37, w:0.414, h:0.312}, {rot:0.571, dx:1.12, dy:-0.799, w:0.414, h:0.312}, {rot:1.143, dx:1.12, dy:-0.227, w:0.414, h:0.312}, {rot:1.714, dx:1.12, dy:0.344, w:0.414, h:0.312}, {rot:2.286, dx:1.12, dy:0.916, w:0.414, h:0.312}, {rot:2.857, dx:1.12, dy:1.487, w:0.414, h:0.312}, {rot:3.429, dx:1.12, dy:2.059, w:0.414, h:0.312}, {rot:4, dx:1.12, dy:2.63, w:0.414, h:0.312}],
        neck_7: [{rot:40.4, dx:-16.5, dy:3.58, w:0.04, h:0.16}, {rot:42.4, dx:-16.5, dy:4.437, w:0.04, h:0.16}, {rot:44.4, dx:-16.5, dy:5.294, w:0.04, h:0.16}, {rot:46.4, dx:-16.5, dy:6.151, w:0.04, h:0.16}, {rot:48.4, dx:-16.5, dy:7.009, w:0.04, h:0.16}, {rot:50.4, dx:-16.5, dy:7.866, w:0.04, h:0.16}, {rot:52.4, dx:-16.5, dy:8.723, w:0.04, h:0.16}, {rot:54.4, dx:-16.5, dy:9.58, w:0.04, h:0.16}],
        neck_6: [{rot:-12.5, dx:-4.98, dy:3.8, w:0.04, h:0.15}, {rot:-10.5, dx:-4.98, dy:4.657, w:0.04, h:0.15}, {rot:-8.5, dx:-4.98, dy:5.514, w:0.04, h:0.15}, {rot:-6.5, dx:-4.98, dy:6.371, w:0.04, h:0.15}, {rot:-4.5, dx:-4.98, dy:7.229, w:0.04, h:0.15}, {rot:-2.5, dx:-4.98, dy:8.086, w:0.04, h:0.15}, {rot:-0.5, dx:-4.98, dy:8.943, w:0.04, h:0.15}, {rot:1.5, dx:-4.98, dy:9.8, w:0.04, h:0.15}],
        neck_5: [{rot:18, dx:-5.59, dy:13.04, w:0.04, h:0.15}, {rot:20, dx:-5.59, dy:13.897, w:0.04, h:0.15}, {rot:22, dx:-5.59, dy:14.754, w:0.04, h:0.15}, {rot:24, dx:-5.59, dy:15.611, w:0.04, h:0.15}, {rot:26, dx:-5.59, dy:16.469, w:0.04, h:0.15}, {rot:28, dx:-5.59, dy:17.326, w:0.04, h:0.15}, {rot:30, dx:-5.59, dy:18.183, w:0.04, h:0.15}, {rot:32, dx:-5.59, dy:19.04, w:0.04, h:0.15}],
        neck_4: [{rot:0, dx:-1.03, dy:9.61, w:0.04, h:0.14}, {rot:2, dx:-1.03, dy:10.467, w:0.04, h:0.14}, {rot:4, dx:-1.03, dy:11.324, w:0.04, h:0.14}, {rot:6, dx:-1.03, dy:12.181, w:0.04, h:0.14}, {rot:8, dx:-1.03, dy:13.039, w:0.04, h:0.14}, {rot:10, dx:-1.03, dy:13.896, w:0.04, h:0.14}, {rot:12, dx:-1.03, dy:14.753, w:0.04, h:0.14}, {rot:14, dx:-1.03, dy:15.61, w:0.04, h:0.14}],
        neck_3_copy: [{rot:17.3, dx:-3.7, dy:7.89, w:0.04, h:0.15}, {rot:19.3, dx:-3.7, dy:8.747, w:0.04, h:0.15}, {rot:21.3, dx:-3.7, dy:9.604, w:0.04, h:0.15}, {rot:23.3, dx:-3.7, dy:10.461, w:0.04, h:0.15}, {rot:25.3, dx:-3.7, dy:11.319, w:0.04, h:0.15}, {rot:27.3, dx:-3.7, dy:12.176, w:0.04, h:0.15}, {rot:29.3, dx:-3.7, dy:13.033, w:0.04, h:0.15}, {rot:31.3, dx:-3.7, dy:13.89, w:0.04, h:0.15}],
        neck_3: [{rot:-5.8, dx:3.52, dy:9.33, w:0.045, h:0.138}, {rot:-3.8, dx:3.52, dy:10.187, w:0.045, h:0.138}, {rot:-1.8, dx:3.52, dy:11.044, w:0.045, h:0.138}, {rot:0.2, dx:3.52, dy:11.901, w:0.045, h:0.138}, {rot:2.2, dx:3.52, dy:12.759, w:0.045, h:0.138}, {rot:4.2, dx:3.52, dy:13.616, w:0.045, h:0.138}, {rot:6.2, dx:3.52, dy:14.473, w:0.045, h:0.138}, {rot:8.2, dx:3.52, dy:15.33, w:0.045, h:0.138}],
        neck_2: [{rot:0, dx:0.77, dy:1.43, w:0.035, h:0.215}, {rot:2, dx:0.77, dy:2.287, w:0.035, h:0.215}, {rot:4, dx:0.77, dy:3.144, w:0.035, h:0.215}, {rot:6, dx:0.77, dy:4.001, w:0.035, h:0.215}, {rot:8, dx:0.77, dy:4.859, w:0.035, h:0.215}, {rot:10, dx:0.77, dy:5.716, w:0.035, h:0.215}, {rot:12, dx:0.77, dy:6.573, w:0.035, h:0.215}, {rot:14, dx:0.77, dy:7.43, w:0.035, h:0.215}],
        neck_1: [{rot:-16.8, dx:3.35, dy:0.93, w:0.043, h:0.143}, {rot:-14.8, dx:3.35, dy:1.787, w:0.043, h:0.143}, {rot:-12.8, dx:3.35, dy:2.644, w:0.043, h:0.143}, {rot:-10.8, dx:3.35, dy:3.501, w:0.043, h:0.143}, {rot:-8.8, dx:3.35, dy:4.359, w:0.043, h:0.143}, {rot:-6.8, dx:3.35, dy:5.216, w:0.043, h:0.143}, {rot:-4.8, dx:3.35, dy:6.073, w:0.043, h:0.143}, {rot:-2.8, dx:3.35, dy:6.93, w:0.043, h:0.143}],
        head_7: [{rot:-40.4, dx:-7.82, dy:14.12, w:0.119, h:0.138}, {rot:-36.4, dx:-7.82, dy:15.549, w:0.119, h:0.138}, {rot:-32.4, dx:-7.82, dy:16.977, w:0.119, h:0.138}, {rot:-28.4, dx:-7.82, dy:18.406, w:0.119, h:0.138}, {rot:-24.4, dx:-7.82, dy:19.834, w:0.119, h:0.138}, {rot:-20.4, dx:-7.82, dy:21.263, w:0.119, h:0.138}, {rot:-16.4, dx:-7.82, dy:22.691, w:0.119, h:0.138}, {rot:-12.4, dx:-7.82, dy:24.12, w:0.119, h:0.138}],
        head_6: [{rot:12.5, dx:-10.83, dy:7.31, w:0.123, h:0.121}, {rot:16.5, dx:-10.83, dy:8.739, w:0.123, h:0.121}, {rot:20.5, dx:-10.83, dy:10.167, w:0.123, h:0.121}, {rot:24.5, dx:-10.83, dy:11.596, w:0.123, h:0.121}, {rot:28.5, dx:-10.83, dy:13.024, w:0.123, h:0.121}, {rot:32.5, dx:-10.83, dy:14.453, w:0.123, h:0.121}, {rot:36.5, dx:-10.83, dy:15.881, w:0.123, h:0.121}, {rot:40.5, dx:-10.83, dy:17.31, w:0.123, h:0.121}],
        head_5: [{rot:-18, dx:-8.42, dy:44.23, w:0.083, h:0.147}, {rot:-14, dx:-8.42, dy:45.659, w:0.083, h:0.147}, {rot:-10, dx:-8.42, dy:47.087, w:0.083, h:0.147}, {rot:-6, dx:-8.42, dy:48.516, w:0.083, h:0.147}, {rot:-2, dx:-8.42, dy:49.944, w:0.083, h:0.147}, {rot:2, dx:-8.42, dy:51.373, w:0.083, h:0.147}, {rot:6, dx:-8.42, dy:52.801, w:0.083, h:0.147}, {rot:10, dx:-8.42, dy:54.23, w:0.083, h:0.147}],
        head_4: [{rot:0, dx:-1.89, dy:15.91, w:0.125, h:0.114}, {rot:4, dx:-1.89, dy:17.339, w:0.125, h:0.114}, {rot:8, dx:-1.89, dy:18.767, w:0.125, h:0.114}, {rot:12, dx:-1.89, dy:20.196, w:0.125, h:0.114}, {rot:16, dx:-1.89, dy:21.624, w:0.125, h:0.114}, {rot:20, dx:-1.89, dy:23.053, w:0.125, h:0.114}, {rot:24, dx:-1.89, dy:24.481, w:0.125, h:0.114}, {rot:28, dx:-1.89, dy:25.91, w:0.125, h:0.114}],
        head_3: [{rot:0, dx:-5.59, dy:34.12, w:0.129, h:0.137}, {rot:4, dx:-5.59, dy:35.549, w:0.129, h:0.137}, {rot:8, dx:-5.59, dy:36.977, w:0.129, h:0.137}, {rot:12, dx:-5.59, dy:38.406, w:0.129, h:0.137}, {rot:16, dx:-5.59, dy:39.834, w:0.129, h:0.137}, {rot:20, dx:-5.59, dy:41.263, w:0.129, h:0.137}, {rot:24, dx:-5.59, dy:42.691, w:0.129, h:0.137}, {rot:28, dx:-5.59, dy:44.12, w:0.129, h:0.137}],
        head_2: [{rot:0, dx:1.72, dy:7.74, w:0.138, h:0.157}, {rot:4, dx:1.72, dy:9.169, w:0.138, h:0.157}, {rot:8, dx:1.72, dy:10.597, w:0.138, h:0.157}, {rot:12, dx:1.72, dy:12.026, w:0.138, h:0.157}, {rot:16, dx:1.72, dy:13.454, w:0.138, h:0.157}, {rot:20, dx:1.72, dy:14.883, w:0.138, h:0.157}, {rot:24, dx:1.72, dy:16.311, w:0.138, h:0.157}, {rot:28, dx:1.72, dy:17.74, w:0.138, h:0.157}],
        mouth_copy_1: [{rot:0, dx:-6.45, dy:1.08, w:0.062, h:0.028}, {rot:0, dx:-6.45, dy:1.08, w:0.062, h:0.028}, {rot:0, dx:-6.45, dy:1.08, w:0.062, h:0.028}, {rot:0, dx:-6.45, dy:1.08, w:0.062, h:0.028}, {rot:0, dx:-6.45, dy:1.08, w:0.062, h:0.028}, {rot:0, dx:-6.45, dy:1.08, w:0.062, h:0.028}, {rot:0, dx:-6.45, dy:1.08, w:0.062, h:0.028}, {rot:0, dx:-6.45, dy:1.08, w:0.062, h:0.028}],
        head_1: [{rot:16.8, dx:0.25, dy:7.6, w:0.123, h:0.108}, {rot:20.8, dx:0.25, dy:9.029, w:0.123, h:0.108}, {rot:24.8, dx:0.25, dy:10.457, w:0.123, h:0.108}, {rot:28.8, dx:0.25, dy:11.886, w:0.123, h:0.108}, {rot:32.8, dx:0.25, dy:13.314, w:0.123, h:0.108}, {rot:36.8, dx:0.25, dy:14.743, w:0.123, h:0.108}, {rot:40.8, dx:0.25, dy:16.171, w:0.123, h:0.108}, {rot:44.8, dx:0.25, dy:17.6, w:0.123, h:0.108}],
        eyes_copy_5_copy: [{rot:0, dx:13.57, dy:27.17, w:0.048, h:0.035}, {rot:0, dx:13.57, dy:27.17, w:0.048, h:0.035}, {rot:0, dx:13.57, dy:27.17, w:0.048, h:0.035}, {rot:0, dx:13.57, dy:27.17, w:0.048, h:0.035}, {rot:0, dx:13.57, dy:27.17, w:0.048, h:0.035}, {rot:0, dx:13.57, dy:27.17, w:0.048, h:0.035}, {rot:0, dx:13.57, dy:27.17, w:0.048, h:0.035}, {rot:0, dx:13.57, dy:27.17, w:0.048, h:0.035}],
        eyes_copy_copy: [{rot:0, dx:-16.76, dy:0.14, w:0.048, h:0.035}, {rot:0, dx:-16.76, dy:0.14, w:0.048, h:0.035}, {rot:0, dx:-16.76, dy:0.14, w:0.048, h:0.035}, {rot:0, dx:-16.76, dy:0.14, w:0.048, h:0.035}, {rot:0, dx:-16.76, dy:0.14, w:0.048, h:0.035}, {rot:0, dx:-16.76, dy:0.14, w:0.048, h:0.035}, {rot:0, dx:-16.76, dy:0.14, w:0.048, h:0.035}, {rot:0, dx:-16.76, dy:0.14, w:0.048, h:0.035}],
        eyes_copy_1_copy: [{rot:0, dx:-4.99, dy:-5.24, w:0.048, h:0.035}, {rot:0, dx:-4.99, dy:-5.24, w:0.048, h:0.035}, {rot:0, dx:-4.99, dy:-5.24, w:0.048, h:0.035}, {rot:0, dx:-4.99, dy:-5.24, w:0.048, h:0.035}, {rot:0, dx:-4.99, dy:-5.24, w:0.048, h:0.035}, {rot:0, dx:-4.99, dy:-5.24, w:0.048, h:0.035}, {rot:0, dx:-4.99, dy:-5.24, w:0.048, h:0.035}, {rot:0, dx:-4.99, dy:-5.24, w:0.048, h:0.035}],
        eyes_copy_2_copy: [{rot:0, dx:9.45, dy:2, w:0.048, h:0.035}, {rot:0, dx:9.45, dy:2, w:0.048, h:0.035}, {rot:0, dx:9.45, dy:2, w:0.048, h:0.035}, {rot:0, dx:9.45, dy:2, w:0.048, h:0.035}, {rot:0, dx:9.45, dy:2, w:0.048, h:0.035}, {rot:0, dx:9.45, dy:2, w:0.048, h:0.035}, {rot:0, dx:9.45, dy:2, w:0.048, h:0.035}, {rot:0, dx:9.45, dy:2, w:0.048, h:0.035}],
        eyes_copy_6_copy_1: [{rot:0, dx:38.67, dy:3.38, w:0.048, h:0.035}, {rot:0, dx:38.67, dy:3.38, w:0.048, h:0.035}, {rot:0, dx:38.67, dy:3.38, w:0.048, h:0.035}, {rot:0, dx:38.67, dy:3.38, w:0.048, h:0.035}, {rot:0, dx:38.67, dy:3.38, w:0.048, h:0.035}, {rot:0, dx:38.67, dy:3.38, w:0.048, h:0.035}, {rot:0, dx:38.67, dy:3.38, w:0.048, h:0.035}, {rot:0, dx:38.67, dy:3.38, w:0.048, h:0.035}],
        eyes_copy_6_copy: [{rot:0, dx:20.19, dy:-6.23, w:0.048, h:0.035}, {rot:0, dx:20.19, dy:-6.23, w:0.048, h:0.035}, {rot:0, dx:20.19, dy:-6.23, w:0.048, h:0.035}, {rot:0, dx:20.19, dy:-6.23, w:0.048, h:0.035}, {rot:0, dx:20.19, dy:-6.23, w:0.048, h:0.035}, {rot:0, dx:20.19, dy:-6.23, w:0.048, h:0.035}, {rot:0, dx:20.19, dy:-6.23, w:0.048, h:0.035}, {rot:0, dx:20.19, dy:-6.23, w:0.048, h:0.035}],
        eyes_copy_6: [{rot:0, dx:33, dy:3.88, w:0.048, h:0.035}, {rot:0, dx:33, dy:3.88, w:0.048, h:0.035}, {rot:0, dx:33, dy:3.88, w:0.048, h:0.035}, {rot:0, dx:33, dy:3.88, w:0.048, h:0.035}, {rot:0, dx:33, dy:3.88, w:0.048, h:0.035}, {rot:0, dx:33, dy:3.88, w:0.048, h:0.035}, {rot:0, dx:33, dy:3.88, w:0.048, h:0.035}, {rot:0, dx:33, dy:3.88, w:0.048, h:0.035}],
        eyes_copy_5: [{rot:0, dx:18.56, dy:25.09, w:0.044, h:0.035}, {rot:0, dx:18.56, dy:25.09, w:0.044, h:0.035}, {rot:0, dx:18.56, dy:25.09, w:0.044, h:0.035}, {rot:0, dx:18.56, dy:25.09, w:0.044, h:0.035}, {rot:0, dx:18.56, dy:25.09, w:0.044, h:0.035}, {rot:0, dx:18.56, dy:25.09, w:0.044, h:0.035}, {rot:0, dx:18.56, dy:25.09, w:0.044, h:0.035}, {rot:0, dx:18.56, dy:25.09, w:0.044, h:0.035}],
        eyes_copy_4: [{rot:0, dx:-0.52, dy:21.65, w:0.048, h:0.035}, {rot:0, dx:-0.52, dy:21.65, w:0.048, h:0.035}, {rot:0, dx:-0.52, dy:21.65, w:0.048, h:0.035}, {rot:0, dx:-0.52, dy:21.65, w:0.048, h:0.035}, {rot:0, dx:-0.52, dy:21.65, w:0.048, h:0.035}, {rot:0, dx:-0.52, dy:21.65, w:0.048, h:0.035}, {rot:0, dx:-0.52, dy:21.65, w:0.048, h:0.035}, {rot:0, dx:-0.52, dy:21.65, w:0.048, h:0.035}],
        eyes_copy_3: [{rot:0, dx:-6.54, dy:21.22, w:0.048, h:0.035}, {rot:0, dx:-6.54, dy:21.22, w:0.048, h:0.035}, {rot:0, dx:-6.54, dy:21.22, w:0.048, h:0.035}, {rot:0, dx:-6.54, dy:21.22, w:0.048, h:0.035}, {rot:0, dx:-6.54, dy:21.22, w:0.048, h:0.035}, {rot:0, dx:-6.54, dy:21.22, w:0.048, h:0.035}, {rot:0, dx:-6.54, dy:21.22, w:0.048, h:0.035}, {rot:0, dx:-6.54, dy:21.22, w:0.048, h:0.035}],
        eyes_copy_2: [{rot:0, dx:15.47, dy:1.57, w:0.048, h:0.035}, {rot:0, dx:15.47, dy:1.57, w:0.048, h:0.035}, {rot:0, dx:15.47, dy:1.57, w:0.048, h:0.035}, {rot:0, dx:15.47, dy:1.57, w:0.048, h:0.035}, {rot:0, dx:15.47, dy:1.57, w:0.048, h:0.035}, {rot:0, dx:15.47, dy:1.57, w:0.048, h:0.035}, {rot:0, dx:15.47, dy:1.57, w:0.048, h:0.035}, {rot:0, dx:15.47, dy:1.57, w:0.048, h:0.035}],
        eyes_copy_1: [{rot:0, dx:0.85, dy:-6.03, w:0.048, h:0.035}, {rot:0, dx:0.85, dy:-6.03, w:0.048, h:0.035}, {rot:0, dx:0.85, dy:-6.03, w:0.048, h:0.035}, {rot:0, dx:0.85, dy:-6.03, w:0.048, h:0.035}, {rot:0, dx:0.85, dy:-6.03, w:0.048, h:0.035}, {rot:0, dx:0.85, dy:-6.03, w:0.048, h:0.035}, {rot:0, dx:0.85, dy:-6.03, w:0.048, h:0.035}, {rot:0, dx:0.85, dy:-6.03, w:0.048, h:0.035}],
        eyes_copy: [{rot:0, dx:-11.26, dy:-0.22, w:0.048, h:0.035}, {rot:0, dx:-11.26, dy:-0.22, w:0.048, h:0.035}, {rot:0, dx:-11.26, dy:-0.22, w:0.048, h:0.035}, {rot:0, dx:-11.26, dy:-0.22, w:0.048, h:0.035}, {rot:0, dx:-11.26, dy:-0.22, w:0.048, h:0.035}, {rot:0, dx:-11.26, dy:-0.22, w:0.048, h:0.035}, {rot:0, dx:-11.26, dy:-0.22, w:0.048, h:0.035}, {rot:0, dx:-11.26, dy:-0.22, w:0.048, h:0.035}],
        eyes: [{rot:0, dx:27.66, dy:-6.01, w:0.048, h:0.035}, {rot:0, dx:27.66, dy:-6.01, w:0.048, h:0.035}, {rot:0, dx:27.66, dy:-6.01, w:0.048, h:0.035}, {rot:0, dx:27.66, dy:-6.01, w:0.048, h:0.035}, {rot:0, dx:27.66, dy:-6.01, w:0.048, h:0.035}, {rot:0, dx:27.66, dy:-6.01, w:0.048, h:0.035}, {rot:0, dx:27.66, dy:-6.01, w:0.048, h:0.035}, {rot:0, dx:27.66, dy:-6.01, w:0.048, h:0.035}],
        mouth_copy_5: [{rot:12.5, dx:22.09, dy:-0.43, w:0.051, h:0.042}, {rot:12.5, dx:22.09, dy:-0.43, w:0.051, h:0.042}, {rot:12.5, dx:22.09, dy:-0.43, w:0.051, h:0.042}, {rot:12.5, dx:22.09, dy:-0.43, w:0.051, h:0.042}, {rot:12.5, dx:22.09, dy:-0.43, w:0.051, h:0.042}, {rot:12.5, dx:22.09, dy:-0.43, w:0.051, h:0.042}, {rot:12.5, dx:22.09, dy:-0.43, w:0.051, h:0.042}, {rot:12.5, dx:22.09, dy:-0.43, w:0.051, h:0.042}],
        mouth_copy_4: [{rot:0, dx:13.75, dy:34.19, w:0.051, h:0.042}, {rot:0, dx:13.75, dy:34.19, w:0.051, h:0.042}, {rot:0, dx:13.75, dy:34.19, w:0.051, h:0.042}, {rot:0, dx:13.75, dy:34.19, w:0.051, h:0.042}, {rot:0, dx:13.75, dy:34.19, w:0.051, h:0.042}, {rot:0, dx:13.75, dy:34.19, w:0.051, h:0.042}, {rot:0, dx:13.75, dy:34.19, w:0.051, h:0.042}, {rot:0, dx:13.75, dy:34.19, w:0.051, h:0.042}],
        mouth_copy_3: [{rot:0, dx:-5.42, dy:25.88, w:0.057, h:0.02}, {rot:0, dx:-5.42, dy:25.88, w:0.057, h:0.02}, {rot:0, dx:-5.42, dy:25.88, w:0.057, h:0.02}, {rot:0, dx:-5.42, dy:25.88, w:0.057, h:0.02}, {rot:0, dx:-5.42, dy:25.88, w:0.057, h:0.02}, {rot:0, dx:-5.42, dy:25.88, w:0.057, h:0.02}, {rot:0, dx:-5.42, dy:25.88, w:0.057, h:0.02}, {rot:0, dx:-5.42, dy:25.88, w:0.057, h:0.02}],
        mouth_copy_2: [{rot:0, dx:7.64, dy:7.67, w:0.062, h:0.028}, {rot:0, dx:7.64, dy:7.67, w:0.062, h:0.028}, {rot:0, dx:7.64, dy:7.67, w:0.062, h:0.028}, {rot:0, dx:7.64, dy:7.67, w:0.062, h:0.028}, {rot:0, dx:7.64, dy:7.67, w:0.062, h:0.028}, {rot:0, dx:7.64, dy:7.67, w:0.062, h:0.028}, {rot:0, dx:7.64, dy:7.67, w:0.062, h:0.028}, {rot:0, dx:7.64, dy:7.67, w:0.062, h:0.028}],
        mouth_copy: [{rot:0, dx:-18.56, dy:5.09, w:0.062, h:0.028}, {rot:0, dx:-18.56, dy:5.09, w:0.062, h:0.028}, {rot:0, dx:-18.56, dy:5.09, w:0.062, h:0.028}, {rot:0, dx:-18.56, dy:5.09, w:0.062, h:0.028}, {rot:0, dx:-18.56, dy:5.09, w:0.062, h:0.028}, {rot:0, dx:-18.56, dy:5.09, w:0.062, h:0.028}, {rot:0, dx:-18.56, dy:5.09, w:0.062, h:0.028}, {rot:0, dx:-18.56, dy:5.09, w:0.062, h:0.028}],
        mouth: [{rot:0, dx:36.27, dy:8.1, w:0.051, h:0.042}, {rot:0, dx:36.27, dy:8.1, w:0.051, h:0.042}, {rot:0, dx:36.27, dy:8.1, w:0.051, h:0.042}, {rot:0, dx:36.27, dy:8.1, w:0.051, h:0.042}, {rot:0, dx:36.27, dy:8.1, w:0.051, h:0.042}, {rot:0, dx:36.27, dy:8.1, w:0.051, h:0.042}, {rot:0, dx:36.27, dy:8.1, w:0.051, h:0.042}, {rot:0, dx:36.27, dy:8.1, w:0.051, h:0.042}]
      }
    }
  },
  core_omega: {
    idle: {
      frameCount: 4, fps: 4, loop: true,
      keys: {
        ring_t: [{rot:-5.58, dx:33.12, dy:6.24, w:0.6, h:0.04}, {rot:-5.58, dx:33.12, dy:6.24, w:0.6, h:0.04}, {rot:-5.58, dx:33.12, dy:6.24, w:0.6, h:0.04}, {rot:-5.58, dx:33.12, dy:6.24, w:0.6, h:0.04}],
        ring_b: [{rot:-110.54, dx:28.96, dy:-17.06, w:0.6, h:0.04}, {rot:-110.54, dx:28.96, dy:-17.06, w:0.6, h:0.04}, {rot:-110.54, dx:28.96, dy:-17.06, w:0.6, h:0.04}, {rot:-110.54, dx:28.96, dy:-17.06, w:0.6, h:0.04}],
        ring_l: [{rot:0, dx:3.8, dy:28.31, w:0.04, h:0.6}, {rot:0, dx:3.8, dy:28.31, w:0.04, h:0.6}, {rot:0, dx:3.8, dy:28.31, w:0.04, h:0.6}, {rot:0, dx:3.8, dy:28.31, w:0.04, h:0.6}],
        ring_r: [{rot:67.17, dx:-5.67, dy:29.24, w:0.04, h:0.6}, {rot:67.17, dx:-5.67, dy:29.24, w:0.04, h:0.6}, {rot:67.17, dx:-5.67, dy:29.24, w:0.04, h:0.6}, {rot:67.17, dx:-5.67, dy:29.24, w:0.04, h:0.6}],
        arm_lu_base: [{rot:44.4, dx:-7.21, dy:11.49, w:0.06, h:0.14}, {rot:44.4, dx:-7.21, dy:12.49, w:0.06, h:0.14}, {rot:44.4, dx:-7.21, dy:11.49, w:0.06, h:0.14}, {rot:44.4, dx:-7.21, dy:10.49, w:0.06, h:0.14}],
        arm_lu_mid: [{rot:-26.6, dx:-61.79, dy:6.31, w:0.06, h:0.14}, {rot:-26.6, dx:-61.79, dy:6.31, w:0.06, h:0.14}, {rot:-26.6, dx:-61.79, dy:6.31, w:0.06, h:0.14}, {rot:-26.6, dx:-61.79, dy:6.31, w:0.06, h:0.14}],
        arm_lu_tip: [{rot:-17.8, dx:-79.57, dy:2.15, w:0.1, h:0.08}, {rot:-17.8, dx:-79.57, dy:2.15, w:0.1, h:0.08}, {rot:-17.8, dx:-79.57, dy:2.15, w:0.1, h:0.08}, {rot:-17.8, dx:-79.57, dy:2.15, w:0.1, h:0.08}],
        arm_ru_base: [{rot:49.5, dx:-4.6, dy:2.37, w:0.06, h:0.14}, {rot:49.5, dx:-4.6, dy:3.37, w:0.06, h:0.14}, {rot:49.5, dx:-4.6, dy:2.37, w:0.06, h:0.14}, {rot:49.5, dx:-4.6, dy:1.37, w:0.06, h:0.14}],
        arm_ru_mid: [{rot:-43.92, dx:-9.32, dy:19.43, w:0.06, h:0.14}, {rot:-43.92, dx:-9.32, dy:19.43, w:0.06, h:0.14}, {rot:-43.92, dx:-9.32, dy:19.43, w:0.06, h:0.14}, {rot:-43.92, dx:-9.32, dy:19.43, w:0.06, h:0.14}],
        arm_ld_base: [{rot:6.88, dx:2.84, dy:-5.33, w:0.06, h:0.14}, {rot:6.88, dx:2.84, dy:-4.33, w:0.06, h:0.14}, {rot:6.88, dx:2.84, dy:-5.33, w:0.06, h:0.14}, {rot:6.88, dx:2.84, dy:-6.33, w:0.06, h:0.14}],
        arm_ld_mid: [{rot:110.54, dx:-35.27, dy:-5.23, w:0.06, h:0.14}, {rot:110.54, dx:-35.27, dy:-5.23, w:0.06, h:0.14}, {rot:110.54, dx:-35.27, dy:-5.23, w:0.06, h:0.14}, {rot:110.54, dx:-35.27, dy:-5.23, w:0.06, h:0.14}],
        arm_rd_base: [{rot:-89.4, dx:-5.37, dy:-7.47, w:0.06, h:0.14}, {rot:-89.4, dx:-5.37, dy:-6.47, w:0.06, h:0.14}, {rot:-89.4, dx:-5.37, dy:-7.47, w:0.06, h:0.14}, {rot:-89.4, dx:-5.37, dy:-8.47, w:0.06, h:0.14}],
        arm_rd_mid: [{rot:22.23, dx:-6.66, dy:52.97, w:0.06, h:0.14}, {rot:22.23, dx:-6.66, dy:52.97, w:0.06, h:0.14}, {rot:22.23, dx:-6.66, dy:52.97, w:0.06, h:0.14}, {rot:22.23, dx:-6.66, dy:52.97, w:0.06, h:0.14}],
        core_ring_outer: [{rot:0, dx:16.56, dy:17.57, w:0.408, h:0.408}, {rot:0, dx:16.56, dy:17.57, w:0.416, h:0.416}, {rot:0, dx:16.56, dy:17.57, w:0.408, h:0.408}, {rot:0, dx:16.56, dy:17.57, w:0.4, h:0.4}],
        core_ring_mid: [{rot:0, dx:11.98, dy:13.37, w:0.309, h:0.309}, {rot:0, dx:11.98, dy:13.37, w:0.318, h:0.318}, {rot:0, dx:11.98, dy:13.37, w:0.309, h:0.309}, {rot:0, dx:11.98, dy:13.37, w:0.3, h:0.3}],
        core: [{rot:0, dx:6.38, dy:6.74, w:0.206, h:0.206}, {rot:0, dx:6.38, dy:6.74, w:0.212, h:0.212}, {rot:0, dx:6.38, dy:6.74, w:0.206, h:0.206}, {rot:0, dx:6.38, dy:6.74, w:0.2, h:0.2}],
        core_eye: [{rot:0, dx:0, dy:0, w:0.066, h:0.066}, {rot:0, dx:0, dy:0, w:0.072, h:0.072}, {rot:0, dx:0, dy:0, w:0.066, h:0.066}, {rot:0, dx:0, dy:0, w:0.06, h:0.06}]
      }
    },
    walk: {
      frameCount: 4, fps: 4, loop: true,
      keys: {
        ring_t: [{rot:-5.58, dx:33.12, dy:6.24, w:0.6, h:0.04}, {rot:-5.58, dx:33.12, dy:6.24, w:0.6, h:0.04}, {rot:-5.58, dx:33.12, dy:6.24, w:0.6, h:0.04}, {rot:-5.58, dx:33.12, dy:6.24, w:0.6, h:0.04}],
        ring_b: [{rot:-110.54, dx:28.96, dy:-17.06, w:0.6, h:0.04}, {rot:-110.54, dx:28.96, dy:-17.06, w:0.6, h:0.04}, {rot:-110.54, dx:28.96, dy:-17.06, w:0.6, h:0.04}, {rot:-110.54, dx:28.96, dy:-17.06, w:0.6, h:0.04}],
        ring_l: [{rot:0, dx:3.8, dy:28.31, w:0.04, h:0.6}, {rot:0, dx:3.8, dy:28.31, w:0.04, h:0.6}, {rot:0, dx:3.8, dy:28.31, w:0.04, h:0.6}, {rot:0, dx:3.8, dy:28.31, w:0.04, h:0.6}],
        ring_r: [{rot:67.17, dx:-5.67, dy:29.24, w:0.04, h:0.6}, {rot:67.17, dx:-5.67, dy:29.24, w:0.04, h:0.6}, {rot:67.17, dx:-5.67, dy:29.24, w:0.04, h:0.6}, {rot:67.17, dx:-5.67, dy:29.24, w:0.04, h:0.6}],
        arm_lu_base: [{rot:44.4, dx:-7.21, dy:11.49, w:0.06, h:0.14}, {rot:44.4, dx:-7.21, dy:11.49, w:0.06, h:0.14}, {rot:44.4, dx:-7.21, dy:11.49, w:0.06, h:0.14}, {rot:44.4, dx:-7.21, dy:11.49, w:0.06, h:0.14}],
        arm_lu_mid: [{rot:-26.6, dx:-61.79, dy:6.31, w:0.06, h:0.14}, {rot:-26.6, dx:-61.79, dy:6.31, w:0.06, h:0.14}, {rot:-26.6, dx:-61.79, dy:6.31, w:0.06, h:0.14}, {rot:-26.6, dx:-61.79, dy:6.31, w:0.06, h:0.14}],
        arm_lu_tip: [{rot:-17.8, dx:-79.57, dy:2.15, w:0.1, h:0.08}, {rot:-17.8, dx:-79.57, dy:2.15, w:0.1, h:0.08}, {rot:-17.8, dx:-79.57, dy:2.15, w:0.1, h:0.08}, {rot:-17.8, dx:-79.57, dy:2.15, w:0.1, h:0.08}],
        arm_ru_base: [{rot:49.5, dx:-4.6, dy:2.37, w:0.06, h:0.14}, {rot:49.5, dx:-4.6, dy:2.37, w:0.06, h:0.14}, {rot:49.5, dx:-4.6, dy:2.37, w:0.06, h:0.14}, {rot:49.5, dx:-4.6, dy:2.37, w:0.06, h:0.14}],
        arm_ru_mid: [{rot:-43.92, dx:-9.32, dy:19.43, w:0.06, h:0.14}, {rot:-43.92, dx:-9.32, dy:19.43, w:0.06, h:0.14}, {rot:-43.92, dx:-9.32, dy:19.43, w:0.06, h:0.14}, {rot:-43.92, dx:-9.32, dy:19.43, w:0.06, h:0.14}],
        arm_ld_base: [{rot:6.88, dx:2.84, dy:-5.33, w:0.06, h:0.14}, {rot:6.88, dx:2.84, dy:-5.33, w:0.06, h:0.14}, {rot:6.88, dx:2.84, dy:-5.33, w:0.06, h:0.14}, {rot:6.88, dx:2.84, dy:-5.33, w:0.06, h:0.14}],
        arm_ld_mid: [{rot:110.54, dx:-35.27, dy:-5.23, w:0.06, h:0.14}, {rot:110.54, dx:-35.27, dy:-5.23, w:0.06, h:0.14}, {rot:110.54, dx:-35.27, dy:-5.23, w:0.06, h:0.14}, {rot:110.54, dx:-35.27, dy:-5.23, w:0.06, h:0.14}],
        arm_rd_base: [{rot:-89.4, dx:-5.37, dy:-7.47, w:0.06, h:0.14}, {rot:-89.4, dx:-5.37, dy:-7.47, w:0.06, h:0.14}, {rot:-89.4, dx:-5.37, dy:-7.47, w:0.06, h:0.14}, {rot:-89.4, dx:-5.37, dy:-7.47, w:0.06, h:0.14}],
        arm_rd_mid: [{rot:22.23, dx:-6.66, dy:52.97, w:0.06, h:0.14}, {rot:22.23, dx:-6.66, dy:52.97, w:0.06, h:0.14}, {rot:22.23, dx:-6.66, dy:52.97, w:0.06, h:0.14}, {rot:22.23, dx:-6.66, dy:52.97, w:0.06, h:0.14}],
        core_ring_outer: [{rot:0, dx:16.56, dy:17.57, w:0.4, h:0.4}, {rot:0, dx:16.56, dy:17.57, w:0.41, h:0.41}, {rot:0, dx:16.56, dy:17.57, w:0.42, h:0.42}, {rot:0, dx:16.56, dy:17.57, w:0.41, h:0.41}],
        core_ring_mid: [{rot:0, dx:11.98, dy:13.37, w:0.3, h:0.3}, {rot:0, dx:11.98, dy:13.37, w:0.31, h:0.31}, {rot:0, dx:11.98, dy:13.37, w:0.321, h:0.321}, {rot:0, dx:11.98, dy:13.37, w:0.31, h:0.31}],
        core: [{rot:0, dx:6.38, dy:6.74, w:0.2, h:0.2}, {rot:0, dx:6.38, dy:6.74, w:0.21, h:0.21}, {rot:0, dx:6.38, dy:6.74, w:0.22, h:0.22}, {rot:0, dx:6.38, dy:6.74, w:0.21, h:0.21}],
        core_eye: [{rot:0, dx:0, dy:0, w:0.06, h:0.06}, {rot:0, dx:0, dy:0, w:0.069, h:0.069}, {rot:0, dx:0, dy:0, w:0.078, h:0.078}, {rot:0, dx:0, dy:0, w:0.069, h:0.069}]
      }
    },
    attack_swipe: {
      frameCount: 6, fps: 14, loop: false,
      keys: {
        ring_t: [{rot:-5.58, dx:33.12, dy:6.24, w:0.6, h:0.04}, {rot:-5.58, dx:33.12, dy:6.24, w:0.6, h:0.04}, {rot:-5.58, dx:33.12, dy:6.24, w:0.6, h:0.04}, {rot:-5.58, dx:33.12, dy:6.24, w:0.6, h:0.04}, {rot:-5.58, dx:33.12, dy:6.24, w:0.6, h:0.04}, {rot:-5.58, dx:33.12, dy:6.24, w:0.6, h:0.04}],
        ring_b: [{rot:-110.54, dx:28.96, dy:-17.06, w:0.6, h:0.04}, {rot:-110.54, dx:28.96, dy:-17.06, w:0.6, h:0.04}, {rot:-110.54, dx:28.96, dy:-17.06, w:0.6, h:0.04}, {rot:-110.54, dx:28.96, dy:-17.06, w:0.6, h:0.04}, {rot:-110.54, dx:28.96, dy:-17.06, w:0.6, h:0.04}, {rot:-110.54, dx:28.96, dy:-17.06, w:0.6, h:0.04}],
        ring_l: [{rot:0, dx:3.8, dy:28.31, w:0.04, h:0.6}, {rot:0, dx:3.8, dy:28.31, w:0.04, h:0.6}, {rot:0, dx:3.8, dy:28.31, w:0.04, h:0.6}, {rot:0, dx:3.8, dy:28.31, w:0.04, h:0.6}, {rot:0, dx:3.8, dy:28.31, w:0.04, h:0.6}, {rot:0, dx:3.8, dy:28.31, w:0.04, h:0.6}],
        ring_r: [{rot:67.17, dx:-5.67, dy:29.24, w:0.04, h:0.6}, {rot:67.17, dx:-5.67, dy:29.24, w:0.04, h:0.6}, {rot:67.17, dx:-5.67, dy:29.24, w:0.04, h:0.6}, {rot:67.17, dx:-5.67, dy:29.24, w:0.04, h:0.6}, {rot:67.17, dx:-5.67, dy:29.24, w:0.04, h:0.6}, {rot:67.17, dx:-5.67, dy:29.24, w:0.04, h:0.6}],
        arm_lu_base: [{rot:44.4, dx:-7.21, dy:11.49, w:0.06, h:0.14}, {rot:34.4, dx:-7.21, dy:11.49, w:0.06, h:0.14}, {rot:24.4, dx:-7.21, dy:11.49, w:0.06, h:0.14}, {rot:69.4, dx:-7.21, dy:11.49, w:0.06, h:0.14}, {rot:54.4, dx:-7.21, dy:11.49, w:0.06, h:0.14}, {rot:44.4, dx:-7.21, dy:11.49, w:0.06, h:0.14}],
        arm_lu_mid: [{rot:-26.6, dx:-61.79, dy:6.31, w:0.06, h:0.14}, {rot:-31.6, dx:-61.79, dy:6.31, w:0.06, h:0.14}, {rot:-36.6, dx:-61.79, dy:6.31, w:0.06, h:0.14}, {rot:-11.6, dx:-61.79, dy:6.31, w:0.06, h:0.14}, {rot:-21.6, dx:-61.79, dy:6.31, w:0.06, h:0.14}, {rot:-26.6, dx:-61.79, dy:6.31, w:0.06, h:0.14}],
        arm_lu_tip: [{rot:-17.8, dx:-79.57, dy:2.15, w:0.1, h:0.08}, {rot:-20.8, dx:-79.57, dy:2.15, w:0.1, h:0.08}, {rot:-23.8, dx:-79.57, dy:2.15, w:0.1, h:0.08}, {rot:-7.8, dx:-79.57, dy:2.15, w:0.1, h:0.08}, {rot:-14.8, dx:-79.57, dy:2.15, w:0.1, h:0.08}, {rot:-17.8, dx:-79.57, dy:2.15, w:0.1, h:0.08}],
        arm_ru_base: [{rot:49.5, dx:-4.6, dy:2.37, w:0.06, h:0.14}, {rot:49.5, dx:-4.6, dy:2.37, w:0.06, h:0.14}, {rot:49.5, dx:-4.6, dy:2.37, w:0.06, h:0.14}, {rot:49.5, dx:-4.6, dy:2.37, w:0.06, h:0.14}, {rot:49.5, dx:-4.6, dy:2.37, w:0.06, h:0.14}, {rot:49.5, dx:-4.6, dy:2.37, w:0.06, h:0.14}],
        arm_ru_mid: [{rot:-43.92, dx:-9.32, dy:19.43, w:0.06, h:0.14}, {rot:-43.92, dx:-9.32, dy:19.43, w:0.06, h:0.14}, {rot:-43.92, dx:-9.32, dy:19.43, w:0.06, h:0.14}, {rot:-43.92, dx:-9.32, dy:19.43, w:0.06, h:0.14}, {rot:-43.92, dx:-9.32, dy:19.43, w:0.06, h:0.14}, {rot:-43.92, dx:-9.32, dy:19.43, w:0.06, h:0.14}],
        arm_ld_base: [{rot:6.88, dx:2.84, dy:-5.33, w:0.06, h:0.14}, {rot:6.88, dx:2.84, dy:-5.33, w:0.06, h:0.14}, {rot:6.88, dx:2.84, dy:-5.33, w:0.06, h:0.14}, {rot:6.88, dx:2.84, dy:-5.33, w:0.06, h:0.14}, {rot:6.88, dx:2.84, dy:-5.33, w:0.06, h:0.14}, {rot:6.88, dx:2.84, dy:-5.33, w:0.06, h:0.14}],
        arm_ld_mid: [{rot:110.54, dx:-35.27, dy:-5.23, w:0.06, h:0.14}, {rot:110.54, dx:-35.27, dy:-5.23, w:0.06, h:0.14}, {rot:110.54, dx:-35.27, dy:-5.23, w:0.06, h:0.14}, {rot:110.54, dx:-35.27, dy:-5.23, w:0.06, h:0.14}, {rot:110.54, dx:-35.27, dy:-5.23, w:0.06, h:0.14}, {rot:110.54, dx:-35.27, dy:-5.23, w:0.06, h:0.14}],
        arm_rd_base: [{rot:-89.4, dx:-5.37, dy:-7.47, w:0.06, h:0.14}, {rot:-89.4, dx:-5.37, dy:-7.47, w:0.06, h:0.14}, {rot:-89.4, dx:-5.37, dy:-7.47, w:0.06, h:0.14}, {rot:-89.4, dx:-5.37, dy:-7.47, w:0.06, h:0.14}, {rot:-89.4, dx:-5.37, dy:-7.47, w:0.06, h:0.14}, {rot:-89.4, dx:-5.37, dy:-7.47, w:0.06, h:0.14}],
        arm_rd_mid: [{rot:22.23, dx:-6.66, dy:52.97, w:0.06, h:0.14}, {rot:22.23, dx:-6.66, dy:52.97, w:0.06, h:0.14}, {rot:22.23, dx:-6.66, dy:52.97, w:0.06, h:0.14}, {rot:22.23, dx:-6.66, dy:52.97, w:0.06, h:0.14}, {rot:22.23, dx:-6.66, dy:52.97, w:0.06, h:0.14}, {rot:22.23, dx:-6.66, dy:52.97, w:0.06, h:0.14}],
        core_ring_outer: [{rot:0, dx:16.56, dy:17.57, w:0.4, h:0.4}, {rot:0, dx:16.56, dy:17.57, w:0.4, h:0.4}, {rot:0, dx:16.56, dy:17.57, w:0.4, h:0.4}, {rot:0, dx:16.56, dy:17.57, w:0.4, h:0.4}, {rot:0, dx:16.56, dy:17.57, w:0.4, h:0.4}, {rot:0, dx:16.56, dy:17.57, w:0.4, h:0.4}],
        core_ring_mid: [{rot:0, dx:11.98, dy:13.37, w:0.3, h:0.3}, {rot:0, dx:11.98, dy:13.37, w:0.3, h:0.3}, {rot:0, dx:11.98, dy:13.37, w:0.3, h:0.3}, {rot:0, dx:11.98, dy:13.37, w:0.3, h:0.3}, {rot:0, dx:11.98, dy:13.37, w:0.3, h:0.3}, {rot:0, dx:11.98, dy:13.37, w:0.3, h:0.3}],
        core: [{rot:0, dx:6.38, dy:6.74, w:0.2, h:0.2}, {rot:0, dx:6.38, dy:6.74, w:0.2, h:0.2}, {rot:0, dx:6.38, dy:6.74, w:0.2, h:0.2}, {rot:0, dx:6.38, dy:6.74, w:0.2, h:0.2}, {rot:0, dx:6.38, dy:6.74, w:0.2, h:0.2}, {rot:0, dx:6.38, dy:6.74, w:0.2, h:0.2}],
        core_eye: [{rot:0, dx:0, dy:0, w:0.06, h:0.06}, {rot:0, dx:0, dy:0, w:0.066, h:0.066}, {rot:0, dx:0, dy:0, w:0.075, h:0.075}, {rot:0, dx:0, dy:0, w:0.084, h:0.084}, {rot:0, dx:0, dy:0, w:0.069, h:0.069}, {rot:0, dx:0, dy:0, w:0.06, h:0.06}]
      }
    },
    skill_charge: {
      frameCount: 8, fps: 10, loop: false,
      keys: {
        ring_t: [{rot:-5.58, dx:33.12, dy:6.24, w:0.6, h:0.04}, {rot:-5.58, dx:33.12, dy:6.24, w:0.6, h:0.04}, {rot:-5.58, dx:33.12, dy:6.24, w:0.6, h:0.04}, {rot:-5.58, dx:33.12, dy:6.24, w:0.6, h:0.04}, {rot:-5.58, dx:33.12, dy:6.24, w:0.6, h:0.04}, {rot:-5.58, dx:33.12, dy:6.24, w:0.6, h:0.04}, {rot:-5.58, dx:33.12, dy:6.24, w:0.6, h:0.04}, {rot:-5.58, dx:33.12, dy:6.24, w:0.6, h:0.04}],
        ring_b: [{rot:-110.54, dx:28.96, dy:-17.06, w:0.6, h:0.04}, {rot:-110.54, dx:28.96, dy:-17.06, w:0.6, h:0.04}, {rot:-110.54, dx:28.96, dy:-17.06, w:0.6, h:0.04}, {rot:-110.54, dx:28.96, dy:-17.06, w:0.6, h:0.04}, {rot:-110.54, dx:28.96, dy:-17.06, w:0.6, h:0.04}, {rot:-110.54, dx:28.96, dy:-17.06, w:0.6, h:0.04}, {rot:-110.54, dx:28.96, dy:-17.06, w:0.6, h:0.04}, {rot:-110.54, dx:28.96, dy:-17.06, w:0.6, h:0.04}],
        ring_l: [{rot:0, dx:3.8, dy:28.31, w:0.04, h:0.6}, {rot:0, dx:3.8, dy:28.31, w:0.04, h:0.6}, {rot:0, dx:3.8, dy:28.31, w:0.04, h:0.6}, {rot:0, dx:3.8, dy:28.31, w:0.04, h:0.6}, {rot:0, dx:3.8, dy:28.31, w:0.04, h:0.6}, {rot:0, dx:3.8, dy:28.31, w:0.04, h:0.6}, {rot:0, dx:3.8, dy:28.31, w:0.04, h:0.6}, {rot:0, dx:3.8, dy:28.31, w:0.04, h:0.6}],
        ring_r: [{rot:67.17, dx:-5.67, dy:29.24, w:0.04, h:0.6}, {rot:67.17, dx:-5.67, dy:29.24, w:0.04, h:0.6}, {rot:67.17, dx:-5.67, dy:29.24, w:0.04, h:0.6}, {rot:67.17, dx:-5.67, dy:29.24, w:0.04, h:0.6}, {rot:67.17, dx:-5.67, dy:29.24, w:0.04, h:0.6}, {rot:67.17, dx:-5.67, dy:29.24, w:0.04, h:0.6}, {rot:67.17, dx:-5.67, dy:29.24, w:0.04, h:0.6}, {rot:67.17, dx:-5.67, dy:29.24, w:0.04, h:0.6}],
        arm_lu_base: [{rot:44.4, dx:-7.21, dy:11.49, w:0.06, h:0.14}, {rot:39.4, dx:-7.21, dy:11.49, w:0.06, h:0.14}, {rot:32.4, dx:-7.21, dy:11.49, w:0.06, h:0.14}, {rot:26.4, dx:-7.21, dy:11.49, w:0.06, h:0.14}, {rot:64.4, dx:-7.21, dy:11.49, w:0.06, h:0.14}, {rot:74.4, dx:-7.21, dy:11.49, w:0.06, h:0.14}, {rot:59.4, dx:-7.21, dy:11.49, w:0.06, h:0.14}, {rot:44.4, dx:-7.21, dy:11.49, w:0.06, h:0.14}],
        arm_lu_mid: [{rot:-26.6, dx:-61.79, dy:6.31, w:0.06, h:0.14}, {rot:-34.6, dx:-61.79, dy:6.31, w:0.06, h:0.14}, {rot:-41.6, dx:-61.79, dy:6.31, w:0.06, h:0.14}, {rot:-46.6, dx:-61.79, dy:6.31, w:0.06, h:0.14}, {rot:-1.6, dx:-61.79, dy:6.31, w:0.06, h:0.14}, {rot:8.4, dx:-61.79, dy:6.31, w:0.06, h:0.14}, {rot:-11.6, dx:-61.79, dy:6.31, w:0.06, h:0.14}, {rot:-26.6, dx:-61.79, dy:6.31, w:0.06, h:0.14}],
        arm_lu_tip: [{rot:-17.8, dx:-79.57, dy:2.15, w:0.1, h:0.08}, {rot:-20.8, dx:-79.57, dy:2.15, w:0.1, h:0.08}, {rot:-25.8, dx:-79.57, dy:2.15, w:0.1, h:0.08}, {rot:-29.8, dx:-79.57, dy:2.15, w:0.1, h:0.08}, {rot:-5.8, dx:-79.57, dy:2.15, w:0.1, h:0.08}, {rot:2.2, dx:-79.57, dy:2.15, w:0.1, h:0.08}, {rot:-7.8, dx:-79.57, dy:2.15, w:0.1, h:0.08}, {rot:-17.8, dx:-79.57, dy:2.15, w:0.1, h:0.08}],
        arm_ru_base: [{rot:49.5, dx:-4.6, dy:2.37, w:0.06, h:0.14}, {rot:44.5, dx:-4.6, dy:2.37, w:0.06, h:0.14}, {rot:37.5, dx:-4.6, dy:2.37, w:0.06, h:0.14}, {rot:31.5, dx:-4.6, dy:2.37, w:0.06, h:0.14}, {rot:69.5, dx:-4.6, dy:2.37, w:0.06, h:0.14}, {rot:79.5, dx:-4.6, dy:2.37, w:0.06, h:0.14}, {rot:64.5, dx:-4.6, dy:2.37, w:0.06, h:0.14}, {rot:49.5, dx:-4.6, dy:2.37, w:0.06, h:0.14}],
        arm_ru_mid: [{rot:-43.92, dx:-9.32, dy:19.43, w:0.06, h:0.14}, {rot:-51.92, dx:-9.32, dy:19.43, w:0.06, h:0.14}, {rot:-58.92, dx:-9.32, dy:19.43, w:0.06, h:0.14}, {rot:-63.92, dx:-9.32, dy:19.43, w:0.06, h:0.14}, {rot:-18.92, dx:-9.32, dy:19.43, w:0.06, h:0.14}, {rot:-8.92, dx:-9.32, dy:19.43, w:0.06, h:0.14}, {rot:-28.92, dx:-9.32, dy:19.43, w:0.06, h:0.14}, {rot:-43.92, dx:-9.32, dy:19.43, w:0.06, h:0.14}],
        arm_ld_base: [{rot:6.88, dx:2.84, dy:-5.33, w:0.06, h:0.14}, {rot:1.88, dx:2.84, dy:-5.33, w:0.06, h:0.14}, {rot:-5.12, dx:2.84, dy:-5.33, w:0.06, h:0.14}, {rot:-11.12, dx:2.84, dy:-5.33, w:0.06, h:0.14}, {rot:26.88, dx:2.84, dy:-5.33, w:0.06, h:0.14}, {rot:36.88, dx:2.84, dy:-5.33, w:0.06, h:0.14}, {rot:21.88, dx:2.84, dy:-5.33, w:0.06, h:0.14}, {rot:6.88, dx:2.84, dy:-5.33, w:0.06, h:0.14}],
        arm_ld_mid: [{rot:110.54, dx:-35.27, dy:-5.23, w:0.06, h:0.14}, {rot:102.54, dx:-35.27, dy:-5.23, w:0.06, h:0.14}, {rot:95.54, dx:-35.27, dy:-5.23, w:0.06, h:0.14}, {rot:90.54, dx:-35.27, dy:-5.23, w:0.06, h:0.14}, {rot:135.54, dx:-35.27, dy:-5.23, w:0.06, h:0.14}, {rot:145.54, dx:-35.27, dy:-5.23, w:0.06, h:0.14}, {rot:125.54, dx:-35.27, dy:-5.23, w:0.06, h:0.14}, {rot:110.54, dx:-35.27, dy:-5.23, w:0.06, h:0.14}],
        arm_rd_base: [{rot:-89.4, dx:-5.37, dy:-7.47, w:0.06, h:0.14}, {rot:-94.4, dx:-5.37, dy:-7.47, w:0.06, h:0.14}, {rot:-101.4, dx:-5.37, dy:-7.47, w:0.06, h:0.14}, {rot:-107.4, dx:-5.37, dy:-7.47, w:0.06, h:0.14}, {rot:-69.4, dx:-5.37, dy:-7.47, w:0.06, h:0.14}, {rot:-59.4, dx:-5.37, dy:-7.47, w:0.06, h:0.14}, {rot:-74.4, dx:-5.37, dy:-7.47, w:0.06, h:0.14}, {rot:-89.4, dx:-5.37, dy:-7.47, w:0.06, h:0.14}],
        arm_rd_mid: [{rot:22.23, dx:-6.66, dy:52.97, w:0.06, h:0.14}, {rot:14.23, dx:-6.66, dy:52.97, w:0.06, h:0.14}, {rot:7.23, dx:-6.66, dy:52.97, w:0.06, h:0.14}, {rot:2.23, dx:-6.66, dy:52.97, w:0.06, h:0.14}, {rot:47.23, dx:-6.66, dy:52.97, w:0.06, h:0.14}, {rot:57.23, dx:-6.66, dy:52.97, w:0.06, h:0.14}, {rot:37.23, dx:-6.66, dy:52.97, w:0.06, h:0.14}, {rot:22.23, dx:-6.66, dy:52.97, w:0.06, h:0.14}],
        core_ring_outer: [{rot:0, dx:16.56, dy:17.57, w:0.4, h:0.4}, {rot:0, dx:16.56, dy:17.57, w:0.408, h:0.408}, {rot:0, dx:16.56, dy:17.57, w:0.42, h:0.42}, {rot:0, dx:16.56, dy:17.57, w:0.432, h:0.432}, {rot:0, dx:16.56, dy:17.57, w:0.448, h:0.448}, {rot:0, dx:16.56, dy:17.57, w:0.46, h:0.46}, {rot:0, dx:16.56, dy:17.57, w:0.432, h:0.432}, {rot:0, dx:16.56, dy:17.57, w:0.4, h:0.4}],
        core_ring_mid: [{rot:0, dx:11.98, dy:13.37, w:0.3, h:0.3}, {rot:0, dx:11.98, dy:13.37, w:0.309, h:0.309}, {rot:0, dx:11.98, dy:13.37, w:0.321, h:0.321}, {rot:0, dx:11.98, dy:13.37, w:0.336, h:0.336}, {rot:0, dx:11.98, dy:13.37, w:0.354, h:0.354}, {rot:0, dx:11.98, dy:13.37, w:0.366, h:0.366}, {rot:0, dx:11.98, dy:13.37, w:0.33, h:0.33}, {rot:0, dx:11.98, dy:13.37, w:0.3, h:0.3}],
        core: [{rot:0, dx:6.38, dy:6.74, w:0.2, h:0.2}, {rot:0, dx:6.38, dy:6.74, w:0.21, h:0.21}, {rot:0, dx:6.38, dy:6.74, w:0.224, h:0.224}, {rot:0, dx:6.38, dy:6.74, w:0.24, h:0.24}, {rot:0, dx:6.38, dy:6.74, w:0.26, h:0.26}, {rot:0, dx:6.38, dy:6.74, w:0.28, h:0.28}, {rot:0, dx:6.38, dy:6.74, w:0.23, h:0.23}, {rot:0, dx:6.38, dy:6.74, w:0.2, h:0.2}],
        core_eye: [{rot:0, dx:0, dy:0, w:0.06, h:0.06}, {rot:0, dx:0, dy:0, w:0.072, h:0.072}, {rot:0, dx:0, dy:0, w:0.084, h:0.084}, {rot:0, dx:0, dy:0, w:0.096, h:0.096}, {rot:0, dx:0, dy:0, w:0.12, h:0.12}, {rot:0, dx:0, dy:0, w:0.132, h:0.132}, {rot:0, dx:0, dy:0, w:0.09, h:0.09}, {rot:0, dx:0, dy:0, w:0.06, h:0.06}]
      }
    },
    hurt: {
      frameCount: 4, fps: 12, loop: false,
      keys: {
        ring_t: [{rot:-5.58, dx:33.12, dy:6.24, w:0.6, h:0.04}, {rot:-5.58, dx:33.12, dy:6.24, w:0.6, h:0.04}, {rot:-5.58, dx:33.12, dy:6.24, w:0.6, h:0.04}, {rot:-5.58, dx:33.12, dy:6.24, w:0.6, h:0.04}],
        ring_b: [{rot:-110.54, dx:28.96, dy:-17.06, w:0.6, h:0.04}, {rot:-110.54, dx:28.96, dy:-17.06, w:0.6, h:0.04}, {rot:-110.54, dx:28.96, dy:-17.06, w:0.6, h:0.04}, {rot:-110.54, dx:28.96, dy:-17.06, w:0.6, h:0.04}],
        ring_l: [{rot:0, dx:3.8, dy:28.31, w:0.04, h:0.6}, {rot:0, dx:3.8, dy:28.31, w:0.04, h:0.6}, {rot:0, dx:3.8, dy:28.31, w:0.04, h:0.6}, {rot:0, dx:3.8, dy:28.31, w:0.04, h:0.6}],
        ring_r: [{rot:67.17, dx:-5.67, dy:29.24, w:0.04, h:0.6}, {rot:67.17, dx:-5.67, dy:29.24, w:0.04, h:0.6}, {rot:67.17, dx:-5.67, dy:29.24, w:0.04, h:0.6}, {rot:67.17, dx:-5.67, dy:29.24, w:0.04, h:0.6}],
        arm_lu_base: [{rot:44.4, dx:-7.21, dy:11.49, w:0.06, h:0.14}, {rot:44.4, dx:-4.21, dy:11.49, w:0.06, h:0.14}, {rot:44.4, dx:-10.21, dy:11.49, w:0.06, h:0.14}, {rot:44.4, dx:-7.21, dy:11.49, w:0.06, h:0.14}],
        arm_lu_mid: [{rot:-26.6, dx:-61.79, dy:6.31, w:0.06, h:0.14}, {rot:-26.6, dx:-58.79, dy:6.31, w:0.06, h:0.14}, {rot:-26.6, dx:-64.79, dy:6.31, w:0.06, h:0.14}, {rot:-26.6, dx:-61.79, dy:6.31, w:0.06, h:0.14}],
        arm_lu_tip: [{rot:-17.8, dx:-79.57, dy:2.15, w:0.1, h:0.08}, {rot:-17.8, dx:-76.57, dy:2.15, w:0.1, h:0.08}, {rot:-17.8, dx:-82.57, dy:2.15, w:0.1, h:0.08}, {rot:-17.8, dx:-79.57, dy:2.15, w:0.1, h:0.08}],
        arm_ru_base: [{rot:49.5, dx:-4.6, dy:2.37, w:0.06, h:0.14}, {rot:49.5, dx:-1.6, dy:2.37, w:0.06, h:0.14}, {rot:49.5, dx:-7.6, dy:2.37, w:0.06, h:0.14}, {rot:49.5, dx:-4.6, dy:2.37, w:0.06, h:0.14}],
        arm_ru_mid: [{rot:-43.92, dx:-9.32, dy:19.43, w:0.06, h:0.14}, {rot:-43.92, dx:-6.32, dy:19.43, w:0.06, h:0.14}, {rot:-43.92, dx:-12.32, dy:19.43, w:0.06, h:0.14}, {rot:-43.92, dx:-9.32, dy:19.43, w:0.06, h:0.14}],
        arm_ld_base: [{rot:6.88, dx:2.84, dy:-5.33, w:0.06, h:0.14}, {rot:6.88, dx:5.84, dy:-5.33, w:0.06, h:0.14}, {rot:6.88, dx:-0.16, dy:-5.33, w:0.06, h:0.14}, {rot:6.88, dx:2.84, dy:-5.33, w:0.06, h:0.14}],
        arm_ld_mid: [{rot:110.54, dx:-35.27, dy:-5.23, w:0.06, h:0.14}, {rot:110.54, dx:-32.27, dy:-5.23, w:0.06, h:0.14}, {rot:110.54, dx:-38.27, dy:-5.23, w:0.06, h:0.14}, {rot:110.54, dx:-35.27, dy:-5.23, w:0.06, h:0.14}],
        arm_rd_base: [{rot:-89.4, dx:-5.37, dy:-7.47, w:0.06, h:0.14}, {rot:-89.4, dx:-2.37, dy:-7.47, w:0.06, h:0.14}, {rot:-89.4, dx:-8.37, dy:-7.47, w:0.06, h:0.14}, {rot:-89.4, dx:-5.37, dy:-7.47, w:0.06, h:0.14}],
        arm_rd_mid: [{rot:22.23, dx:-6.66, dy:52.97, w:0.06, h:0.14}, {rot:22.23, dx:-3.66, dy:52.97, w:0.06, h:0.14}, {rot:22.23, dx:-9.66, dy:52.97, w:0.06, h:0.14}, {rot:22.23, dx:-6.66, dy:52.97, w:0.06, h:0.14}],
        core_ring_outer: [{rot:0, dx:16.56, dy:17.57, w:0.4, h:0.4}, {rot:0, dx:19.56, dy:17.57, w:0.4, h:0.4}, {rot:0, dx:13.56, dy:17.57, w:0.4, h:0.4}, {rot:0, dx:16.56, dy:17.57, w:0.4, h:0.4}],
        core_ring_mid: [{rot:0, dx:11.98, dy:13.37, w:0.3, h:0.3}, {rot:0, dx:14.98, dy:13.37, w:0.3, h:0.3}, {rot:0, dx:8.98, dy:13.37, w:0.3, h:0.3}, {rot:0, dx:11.98, dy:13.37, w:0.3, h:0.3}],
        core: [{rot:0, dx:6.38, dy:6.74, w:0.2, h:0.2}, {rot:0, dx:9.38, dy:6.74, w:0.2, h:0.2}, {rot:0, dx:3.38, dy:6.74, w:0.2, h:0.2}, {rot:0, dx:6.38, dy:6.74, w:0.2, h:0.2}],
        core_eye: [{rot:0, dx:0, dy:0, w:0.06, h:0.06}, {rot:0, dx:0, dy:0, w:0.054, h:0.054}, {rot:0, dx:0, dy:0, w:0.069, h:0.069}, {rot:0, dx:0, dy:0, w:0.06, h:0.06}]
      }
    },
    death: {
      frameCount: 8, fps: 8, loop: false,
      keys: {
        ring_t: [{rot:-5.58, dx:33.12, dy:6.24, w:0.6, h:0.04}, {rot:-5.58, dx:33.12, dy:6.24, w:0.6, h:0.04}, {rot:-5.58, dx:33.12, dy:6.24, w:0.6, h:0.04}, {rot:-5.58, dx:33.12, dy:6.24, w:0.6, h:0.04}, {rot:-5.58, dx:33.12, dy:6.24, w:0.6, h:0.04}, {rot:-5.58, dx:33.12, dy:6.24, w:0.6, h:0.04}, {rot:-5.58, dx:33.12, dy:6.24, w:0.6, h:0.04}, {rot:-5.58, dx:33.12, dy:6.24, w:0.6, h:0.04}],
        ring_b: [{rot:-110.54, dx:28.96, dy:-17.06, w:0.6, h:0.04}, {rot:-110.54, dx:28.96, dy:-17.06, w:0.6, h:0.04}, {rot:-110.54, dx:28.96, dy:-17.06, w:0.6, h:0.04}, {rot:-110.54, dx:28.96, dy:-17.06, w:0.6, h:0.04}, {rot:-110.54, dx:28.96, dy:-17.06, w:0.6, h:0.04}, {rot:-110.54, dx:28.96, dy:-17.06, w:0.6, h:0.04}, {rot:-110.54, dx:28.96, dy:-17.06, w:0.6, h:0.04}, {rot:-110.54, dx:28.96, dy:-17.06, w:0.6, h:0.04}],
        ring_l: [{rot:0, dx:3.8, dy:28.31, w:0.04, h:0.6}, {rot:0, dx:3.8, dy:28.31, w:0.04, h:0.6}, {rot:0, dx:3.8, dy:28.31, w:0.04, h:0.6}, {rot:0, dx:3.8, dy:28.31, w:0.04, h:0.6}, {rot:0, dx:3.8, dy:28.31, w:0.04, h:0.6}, {rot:0, dx:3.8, dy:28.31, w:0.04, h:0.6}, {rot:0, dx:3.8, dy:28.31, w:0.04, h:0.6}, {rot:0, dx:3.8, dy:28.31, w:0.04, h:0.6}],
        ring_r: [{rot:67.17, dx:-5.67, dy:29.24, w:0.04, h:0.6}, {rot:67.17, dx:-5.67, dy:29.24, w:0.04, h:0.6}, {rot:67.17, dx:-5.67, dy:29.24, w:0.04, h:0.6}, {rot:67.17, dx:-5.67, dy:29.24, w:0.04, h:0.6}, {rot:67.17, dx:-5.67, dy:29.24, w:0.04, h:0.6}, {rot:67.17, dx:-5.67, dy:29.24, w:0.04, h:0.6}, {rot:67.17, dx:-5.67, dy:29.24, w:0.04, h:0.6}, {rot:67.17, dx:-5.67, dy:29.24, w:0.04, h:0.6}],
        arm_lu_base: [{rot:44.4, dx:-7.21, dy:11.49, w:0.06, h:0.14}, {rot:50.114, dx:-7.21, dy:14.347, w:0.06, h:0.14}, {rot:55.829, dx:-7.21, dy:17.204, w:0.06, h:0.14}, {rot:61.543, dx:-7.21, dy:20.061, w:0.06, h:0.14}, {rot:67.257, dx:-7.21, dy:22.919, w:0.06, h:0.14}, {rot:72.971, dx:-7.21, dy:25.776, w:0.06, h:0.14}, {rot:78.686, dx:-7.21, dy:28.633, w:0.06, h:0.14}, {rot:84.4, dx:-7.21, dy:31.49, w:0.06, h:0.14}],
        arm_lu_mid: [{rot:-26.6, dx:-61.79, dy:6.31, w:0.06, h:0.14}, {rot:-22.314, dx:-61.79, dy:8.453, w:0.06, h:0.14}, {rot:-18.029, dx:-61.79, dy:10.596, w:0.06, h:0.14}, {rot:-13.743, dx:-61.79, dy:12.739, w:0.06, h:0.14}, {rot:-9.457, dx:-61.79, dy:14.881, w:0.06, h:0.14}, {rot:-5.171, dx:-61.79, dy:17.024, w:0.06, h:0.14}, {rot:-0.886, dx:-61.79, dy:19.167, w:0.06, h:0.14}, {rot:3.4, dx:-61.79, dy:21.31, w:0.06, h:0.14}],
        arm_lu_tip: [{rot:-17.8, dx:-79.57, dy:2.15, w:0.1, h:0.08}, {rot:-14.943, dx:-79.57, dy:3.579, w:0.1, h:0.08}, {rot:-12.086, dx:-79.57, dy:5.007, w:0.1, h:0.08}, {rot:-9.229, dx:-79.57, dy:6.436, w:0.1, h:0.08}, {rot:-6.371, dx:-79.57, dy:7.864, w:0.1, h:0.08}, {rot:-3.514, dx:-79.57, dy:9.293, w:0.1, h:0.08}, {rot:-0.657, dx:-79.57, dy:10.721, w:0.1, h:0.08}, {rot:2.2, dx:-79.57, dy:12.15, w:0.1, h:0.08}],
        arm_ru_base: [{rot:49.5, dx:-4.6, dy:2.37, w:0.06, h:0.14}, {rot:55.214, dx:-4.6, dy:5.227, w:0.06, h:0.14}, {rot:60.929, dx:-4.6, dy:8.084, w:0.06, h:0.14}, {rot:66.643, dx:-4.6, dy:10.941, w:0.06, h:0.14}, {rot:72.357, dx:-4.6, dy:13.799, w:0.06, h:0.14}, {rot:78.071, dx:-4.6, dy:16.656, w:0.06, h:0.14}, {rot:83.786, dx:-4.6, dy:19.513, w:0.06, h:0.14}, {rot:89.5, dx:-4.6, dy:22.37, w:0.06, h:0.14}],
        arm_ru_mid: [{rot:-43.92, dx:-9.32, dy:19.43, w:0.06, h:0.14}, {rot:-39.634, dx:-9.32, dy:21.573, w:0.06, h:0.14}, {rot:-35.349, dx:-9.32, dy:23.716, w:0.06, h:0.14}, {rot:-31.063, dx:-9.32, dy:25.859, w:0.06, h:0.14}, {rot:-26.777, dx:-9.32, dy:28.001, w:0.06, h:0.14}, {rot:-22.491, dx:-9.32, dy:30.144, w:0.06, h:0.14}, {rot:-18.206, dx:-9.32, dy:32.287, w:0.06, h:0.14}, {rot:-13.92, dx:-9.32, dy:34.43, w:0.06, h:0.14}],
        arm_ld_base: [{rot:6.88, dx:2.84, dy:-5.33, w:0.06, h:0.14}, {rot:12.594, dx:2.84, dy:-2.473, w:0.06, h:0.14}, {rot:18.309, dx:2.84, dy:0.384, w:0.06, h:0.14}, {rot:24.023, dx:2.84, dy:3.241, w:0.06, h:0.14}, {rot:29.737, dx:2.84, dy:6.099, w:0.06, h:0.14}, {rot:35.451, dx:2.84, dy:8.956, w:0.06, h:0.14}, {rot:41.166, dx:2.84, dy:11.813, w:0.06, h:0.14}, {rot:46.88, dx:2.84, dy:14.67, w:0.06, h:0.14}],
        arm_ld_mid: [{rot:110.54, dx:-35.27, dy:-5.23, w:0.06, h:0.14}, {rot:114.826, dx:-35.27, dy:-3.087, w:0.06, h:0.14}, {rot:119.111, dx:-35.27, dy:-0.944, w:0.06, h:0.14}, {rot:123.397, dx:-35.27, dy:1.199, w:0.06, h:0.14}, {rot:127.683, dx:-35.27, dy:3.341, w:0.06, h:0.14}, {rot:131.969, dx:-35.27, dy:5.484, w:0.06, h:0.14}, {rot:136.254, dx:-35.27, dy:7.627, w:0.06, h:0.14}, {rot:140.54, dx:-35.27, dy:9.77, w:0.06, h:0.14}],
        arm_rd_base: [{rot:-89.4, dx:-5.37, dy:-7.47, w:0.06, h:0.14}, {rot:-83.686, dx:-5.37, dy:-4.613, w:0.06, h:0.14}, {rot:-77.971, dx:-5.37, dy:-1.756, w:0.06, h:0.14}, {rot:-72.257, dx:-5.37, dy:1.101, w:0.06, h:0.14}, {rot:-66.543, dx:-5.37, dy:3.959, w:0.06, h:0.14}, {rot:-60.829, dx:-5.37, dy:6.816, w:0.06, h:0.14}, {rot:-55.114, dx:-5.37, dy:9.673, w:0.06, h:0.14}, {rot:-49.4, dx:-5.37, dy:12.53, w:0.06, h:0.14}],
        arm_rd_mid: [{rot:22.23, dx:-6.66, dy:52.97, w:0.06, h:0.14}, {rot:26.516, dx:-6.66, dy:55.113, w:0.06, h:0.14}, {rot:30.801, dx:-6.66, dy:57.256, w:0.06, h:0.14}, {rot:35.087, dx:-6.66, dy:59.399, w:0.06, h:0.14}, {rot:39.373, dx:-6.66, dy:61.541, w:0.06, h:0.14}, {rot:43.659, dx:-6.66, dy:63.684, w:0.06, h:0.14}, {rot:47.944, dx:-6.66, dy:65.827, w:0.06, h:0.14}, {rot:52.23, dx:-6.66, dy:67.97, w:0.06, h:0.14}],
        core_ring_outer: [{rot:0, dx:16.56, dy:17.57, w:0.4, h:0.4}, {rot:0, dx:16.56, dy:17.57, w:0.371, h:0.371}, {rot:0, dx:16.56, dy:17.57, w:0.343, h:0.343}, {rot:0, dx:16.56, dy:17.57, w:0.314, h:0.314}, {rot:0, dx:16.56, dy:17.57, w:0.286, h:0.286}, {rot:0, dx:16.56, dy:17.57, w:0.257, h:0.257}, {rot:0, dx:16.56, dy:17.57, w:0.229, h:0.229}, {rot:0, dx:16.56, dy:17.57, w:0.2, h:0.2}],
        core_ring_mid: [{rot:0, dx:11.98, dy:13.37, w:0.3, h:0.3}, {rot:0, dx:11.98, dy:13.37, w:0.274, h:0.274}, {rot:0, dx:11.98, dy:13.37, w:0.249, h:0.249}, {rot:0, dx:11.98, dy:13.37, w:0.223, h:0.223}, {rot:0, dx:11.98, dy:13.37, w:0.197, h:0.197}, {rot:0, dx:11.98, dy:13.37, w:0.171, h:0.171}, {rot:0, dx:11.98, dy:13.37, w:0.146, h:0.146}, {rot:0, dx:11.98, dy:13.37, w:0.12, h:0.12}],
        core: [{rot:0, dx:6.38, dy:6.74, w:0.2, h:0.2}, {rot:0, dx:6.38, dy:6.74, w:0.183, h:0.183}, {rot:0, dx:6.38, dy:6.74, w:0.166, h:0.166}, {rot:0, dx:6.38, dy:6.74, w:0.149, h:0.149}, {rot:0, dx:6.38, dy:6.74, w:0.131, h:0.131}, {rot:0, dx:6.38, dy:6.74, w:0.114, h:0.114}, {rot:0, dx:6.38, dy:6.74, w:0.097, h:0.097}, {rot:0, dx:6.38, dy:6.74, w:0.08, h:0.08}],
        core_eye: [{rot:0, dx:0, dy:0, w:0.06, h:0.06}, {rot:0, dx:0, dy:0, w:0.054, h:0.054}, {rot:0, dx:0, dy:0, w:0.049, h:0.049}, {rot:0, dx:0, dy:0, w:0.043, h:0.043}, {rot:0, dx:0, dy:0, w:0.037, h:0.037}, {rot:0, dx:0, dy:0, w:0.031, h:0.031}, {rot:0, dx:0, dy:0, w:0.026, h:0.026}, {rot:0, dx:0, dy:0, w:0.02, h:0.02}]
      }
    }
  }};

/* ★ 交換 core_omega 的 idle 和 walk ★ */
(function(){ var A = BOSS_ANIMS.core_omega; if(A){ var t = A.idle; A.idle = A.walk; A.walk = t; } })();

const BOSS_SKILLS = {
  factory_king: [
    { id:'smash', name:'碎地重錘', type:'aoe', cd:10, range:0.20,
      dmg:45, pen:2, anim:'skill_charge',
      telegraph:1300, hitDelay:1300, totalTime:2000,
      aoe:true, knockback:0.10, telegraphRatio:0.20, unlockPhase:0 },
    { id:'sweep', name:'揮錘掃擊', type:'aoe', cd:16, range:0.30,
      dmg:30, pen:2, anim:'attack_swipe',
      telegraph:800, hitDelay:800, totalTime:1500,
      aoe:true, knockback:0.12, telegraphRatio:0.30, unlockPhase:0 },
    { id:'dash', name:'突進', type:'dash', cd:14, range:0.65, minRange:0.20,
      dmg:35, pen:2, contactDmg:20,
      telegraph:800, dashSpeed:0.55, dashDistance:0.35,
      exhaustMs:1500, hitTickMs:250,
      unlockPhase: 1 }
  ],
  lab_queen: [
    { id:'smash', name:'腹部噴酸', type:'aoe', cd:9, range:0.24,
      dmg:55, pen:3, anim:'skill_charge',
      telegraph:1300, hitDelay:1300, totalTime:2000,
      aoe:true, knockback:0.08, telegraphRatio:0.20, unlockPhase:0,
      projectile:'acid' },
    { id:'sweep', name:'前肢橫掃', type:'aoe', cd:14, range:0.30,
      dmg:38, pen:3, anim:'attack_swipe',
      telegraph:800, hitDelay:800, totalTime:1500,
      aoe:true, knockback:0.10, telegraphRatio:0.30, unlockPhase:0,
      projectile:'web' },
    { id:'dash', name:'蛛絲突進', type:'dash', cd:15, range:0.68, minRange:0.20,
      dmg:42, pen:3, contactDmg:25,
      telegraph:800, dashSpeed:0.55, dashDistance:0.38,
      exhaustMs:1500, contactRadius:0.12, hitTickMs:250,
      unlockPhase:1 }
  ],
  road_tyrant: [
    { id:'smash', name:'碎地重錘', type:'aoe', cd:12, range:0.16,
      dmg:60, pen:3, anim:'skill_charge',
      telegraph:1300, hitDelay:1300, totalTime:2000,
      aoe:true, knockback:0.10, telegraphRatio:0.16, unlockPhase:0 },
    { id:'sweep', name:'盾牌橫掃', type:'aoe', cd:16, range:0.20,
      dmg:45, pen:3, anim:'attack_swipe',
      telegraph:800, hitDelay:800, totalTime:1500,
      aoe:true, knockback:0.12, telegraphRatio:0.20, unlockPhase:0 },
    { id:'charge', name:'盾牌衝撞', type:'dash', cd:15, range:0.65, minRange:0.20,
      dmg:55, pen:3, contactDmg:30,
      telegraph:800, dashSpeed:0.55, dashDistance:0.38,
      exhaustMs:1500, hitTickMs:250,
      unlockPhase:1 }
  ],
  swamp_hydra: [
    { id:'spray',  name:'腐蝕噴灑', type:'aoe', cd:8,  range:0.28,
      dmg:55, pen:5, anim:'skill_charge',
      telegraph:1200, hitDelay:1200, totalTime:2000,
      aoe:true, knockback:0.06, telegraphRatio:0.28, unlockPhase:0,
      projectile:'acid' },
    { id:'burst',  name:'毒沼爆發', type:'aoe', cd:14, range:0.35,
      dmg:75, pen:5, anim:'skill_charge',
      telegraph:1500, hitDelay:1500, totalTime:2400,
      aoe:true, knockback:0.10, telegraphRatio:0.35, unlockPhase:0 },
    { id:'breath', name:'毒霧吐息', type:'aoe', cd:20, range:0.45,
      dmg:100, pen:5, anim:'skill_charge',
      telegraph:1800, hitDelay:1800, totalTime:2800,
      aoe:true, knockback:0.08, telegraphRatio:0.30, unlockPhase:1,
      projectile:'acid' }
  ],
  core_omega: [
    { id:'laser_single', name:'單發雷射', type:'aoe', cd:6, range:0.40,
      dmg:50, pen:6, anim:'attack_swipe',
      telegraph:900, hitDelay:900, totalTime:1400,
      aoe:true, knockback:0.05, telegraphRatio:0.12, unlockPhase:0 },
    { id:'laser_spray', name:'掃射雷射', type:'aoe', cd:12, range:0.35,
      dmg:32, pen:5, anim:'attack_swipe',
      telegraph:1200, hitDelay:1200, totalTime:1800,
      aoe:true, knockback:0.06, telegraphRatio:0.15, unlockPhase:1 },
    { id:'laser_charge', name:'蓄力雷射', type:'aoe', cd:20, range:0.50,
      dmg:95, pen:7, anim:'skill_charge',
      telegraph:2000, hitDelay:2000, totalTime:2800,
      aoe:true, knockback:0.10, telegraphRatio:0.18, unlockPhase:2 }
  ]
};

const BUILDINGS={
  workbench:{name:'工作台',desc:'改造傳奇武器',cost:{wood:20,metal:10,screws:5}},
  storage:{name:'倉庫',desc:'掉落物數量加成',cost:{wood:15,metal:5}},
  toilet:{name:'厠所',desc:'熟練度加成',cost:{wood:10,cloth:5}},
  rest:{name:'休息室',desc:'生命值成長加成',cost:{wood:20,cloth:10}},
  generator:{name:'發電機',desc:'加速製造與冷卻',cost:{metal:20,gears:5,electronics:3}},
  medbay:{name:'醫療站',desc:'加強消耗品恢復',cost:{wood:15,cloth:10,metal:5}},
  radio:{name:'無線電',desc:'定期資源補給',cost:{electronics:5,metal:10,gears:3}},
  armory:{name:'軍械庫',desc:'產出主副彈藥',cost:{metal:25,gears:8,screws:10}},
  forge:{name:'護甲車間',desc:'護甲值加成',cost:{metal:250,gears:80,screws:100}},
};

const GAME_LAYERS = [
  { id:'right_leg', name:'右腿', z:18, color:'#2a2a2a', pivot:{x:0.5,y:0.05},
    x:0.5977, y:0.5984, w:0.1263, h:0.4214 },
  { id:'torso',     name:'軀幹', z:30, color:'#4a6741', pivot:{x:0.5,y:0.10},
    x:0.4988, y:0.2718, w:0.3029, h:0.4165 },
  { id:'head',      name:'頭',   z:45, color:'#c89870', pivot:{x:0.5,y:0.92},
    x:0.5316, y:0.2161, w:0.2049, h:0.1678 },
  { id:'face',      name:'面部', z:48, color:'#b88860', pivot:{x:0.5,y:0.92},
    x:0.5708, y:0.2300, w:0.1449, h:0.1256 },
  { id:'left_leg',  name:'左腿', z:52, color:'#3a3a3a', pivot:{x:0.5,y:0.05},
    x:0.4369, y:0.6189, w:0.1422, h:0.4358 },
  { id:'back_arm',  name:'後臂', z:55, color:'#3d3020', pivot:{x:0.5,y:0.5},
    x:0.8007, y:0.3625, w:0.1059, h:0.1043 },
  { id:'front_arm', name:'前臂', z:62, color:'#5a4a35', pivot:{x:0.05,y:0.5},
    x:0.2794, y:0.3737, w:0.3683, h:0.0892 },
];

const GAME_ANIMS = {
  idle: {
    frameCount: 4, fps: 4, loop: true, showEq: 'primary',
    keys: {
      head:      Array(4).fill(0).map((_,i)=>({rot:0,dx:0,dy:[0,-0.5,-0.8,-0.5][i]})),
      face:      Array(4).fill(0).map((_,i)=>({rot:0,dx:0,dy:[0,-0.5,-0.8,-0.5][i]})),
      torso:     Array(4).fill(0).map((_,i)=>({rot:0,dx:0,dy:[0,-0.5,-0.8,-0.5][i]})),
      back_arm:  Array(4).fill(0).map((_,i)=>({rot:0,dx:0,dy:[0,-0.5,-0.8,-0.5][i]})),
      front_arm: Array(4).fill(0).map((_,i)=>({rot:0,dx:0,dy:[0,-0.5,-0.8,-0.5][i]})),
    }
  },
  walk: {
    frameCount: 8, fps: 10, loop: true, showEq: 'primary',
    keys: {
      head:      Array(8).fill(0).map((_,i)=>({rot:0,dx:0,dy:i%2?-0.5:0})),
      face:      Array(8).fill(0).map((_,i)=>({rot:0,dx:0,dy:i%2?-0.5:0})),
      torso:     Array(8).fill(0).map((_,i)=>({rot:0,dx:0,dy:i%2?-0.5:0})),
      back_arm:  Array(8).fill(0).map((_,i)=>({rot:0,dx:0,dy:i%2?-0.5:0})),
      front_arm: Array(8).fill(0).map((_,i)=>({rot:0,dx:0,dy:i%2?-0.5:0})),
      right_leg: [-18,-9,0,9,18,9,0,-9].map(r=>({rot:r,dx:0,dy:0})),
      left_leg:  [18,9,0,-9,-18,-9,0,9].map(r=>({rot:r,dx:0,dy:0})),
    }
  },
  run: {
    frameCount: 8, fps: 16, loop: true, showEq: 'primary',
    keys: {
      head:      Array(8).fill(0).map((_,i)=>({rot:-3,dx:0,dy:i%2?-1.5:-0.5})),
      face:      Array(8).fill(0).map((_,i)=>({rot:-3,dx:0,dy:i%2?-1.5:-0.5})),
      torso:     Array(8).fill(0).map((_,i)=>({rot:-5,dx:0,dy:i%2?-1.5:-0.5})),
      back_arm:  Array(8).fill(0).map((_,i)=>({rot:-5,dx:0,dy:i%2?-1.5:-0.5})),
      front_arm: Array(8).fill(0).map((_,i)=>({rot:-5,dx:0,dy:i%2?-1.5:-0.5})),
      right_leg: [-42,-22,0,22,42,22,0,-22].map(r=>({rot:r,dx:0,dy:0})),
      left_leg:  [42,22,0,-22,-42,-22,0,22].map(r=>({rot:r,dx:0,dy:0})),
    }
  },
  hurt: {
    frameCount: 4, fps: 8, loop: false, showEq: 'context',
    keys: {
      head:      [{rot:0,dx:0,dy:0},{rot:6,dx:0,dy:-1},{rot:6,dx:0,dy:-1},{rot:0,dx:0,dy:0}],
      face:      [{rot:0,dx:0,dy:0},{rot:6,dx:0,dy:-1},{rot:6,dx:0,dy:-1},{rot:0,dx:0,dy:0}],
      torso:     [{rot:0,dx:0,dy:0},{rot:4,dx:0,dy:-1},{rot:4,dx:0,dy:-1},{rot:0,dx:0,dy:0}],
      back_arm:  [{rot:0,dx:0,dy:0},{rot:4,dx:0,dy:-1},{rot:4,dx:0,dy:-1},{rot:0,dx:0,dy:0}],
      front_arm: [{rot:0,dx:0,dy:0},{rot:5,dx:0,dy:-1},{rot:5,dx:0,dy:-1},{rot:0,dx:0,dy:0}],
    }
  },
  fire_primary: {
    frameCount: 4, fps: 16, loop: false, showEq: 'primary',
    keys: {
      head:      [{rot:0,dx:0,dy:0},{rot:1,dx:0,dy:-1},{rot:0,dx:0,dy:0},{rot:0,dx:0,dy:0}],
      face:      [{rot:0,dx:0,dy:0},{rot:1,dx:0,dy:-1},{rot:0,dx:0,dy:0},{rot:0,dx:0,dy:0}],
      torso:     [{rot:0,dx:0,dy:0},{rot:2,dx:0,dy:-1},{rot:1,dx:0,dy:0},{rot:0,dx:0,dy:0}],
      back_arm:  [{rot:0,dx:0,dy:0},{rot:4,dx:0,dy:-1},{rot:1,dx:0,dy:0},{rot:0,dx:0,dy:0}],
      front_arm: [
        {rot:0,  dx:0,  dy:0},
        {rot:-8, dx:-3, dy:-1},
        {rot:-3, dx:-1, dy:0},
        {rot:0,  dx:0,  dy:0},
      ],
    }
  },
  reload: {
    frameCount: 10, fps: 10, loop: false, showEq: 'primary',
    keys: {
      head:      Array(10).fill(0).map((_,i)=>{const p=[0,2,3,3,2,1,0,-1,0,0][i];return {rot:0,dx:0,dy:p*0.3};}),
      face:      Array(10).fill(0).map((_,i)=>{const p=[0,2,3,3,2,1,0,-1,0,0][i];return {rot:0,dx:0,dy:p*0.3};}),
      torso:     Array(10).fill(0).map((_,i)=>{const p=[0,2,3,3,2,1,0,-1,0,0][i];return {rot:0,dx:0,dy:p*0.5};}),
      back_arm:  [0,-15,-30,-35,-25,-10,5,15,5,0].map(r=>({rot:r,dx:0,dy:0})),
      front_arm: [
        {rot:0,  dx:0,  dy:0},
        {rot:-20,dx:-5, dy:1},
        {rot:-40,dx:-8, dy:2},
        {rot:-45,dx:-8, dy:2.5},
        {rot:-30,dx:-5, dy:1.5},
        {rot:-10,dx:-2, dy:0.5},
        {rot:15, dx:5,  dy:-0.5},
        {rot:30, dx:10, dy:-1.5},
        {rot:10, dx:5,  dy:-0.5},
        {rot:0,  dx:0,  dy:0},
      ],
    }
  },
  switch_secondary: {
    frameCount: 8, fps: 10, loop: false, showEq: 'secondary',
    keys: {
      head:      Array(8).fill(0).map((_,i)=>{const p=[0,1,2,2,1,0,-1,-1][i];return {rot:0,dx:0,dy:p*0.3};}),
      face:      Array(8).fill(0).map((_,i)=>{const p=[0,1,2,2,1,0,-1,-1][i];return {rot:0,dx:0,dy:p*0.3};}),
      torso:     Array(8).fill(0).map((_,i)=>{const p=[0,2,3,3,2,1,0,0][i];return {rot:0,dx:0,dy:p*0.4};}),
      back_arm:  [
        {rot:0,  dx:0,  dy:0},{rot:-8, dx:-2, dy:0},{rot:-15,dx:-4, dy:0},{rot:-12,dx:-3, dy:0},
        {rot:-8, dx:-2, dy:0},{rot:-4, dx:-1, dy:0},{rot:0,  dx:0,  dy:0},{rot:0,  dx:0,  dy:0},
      ],
      front_arm: [
        {rot:0,  dx:0,   dy:0},{rot:-15,dx:-3,  dy:1},{rot:-25,dx:-5,  dy:2},{rot:-15,dx:-3,  dy:1.5},
        {rot:-5, dx:-1,  dy:0.5},{rot:0,  dx:0,   dy:-0.5},{rot:3,  dx:0,   dy:-1},{rot:3,  dx:0,   dy:-1},
      ],
    }
  },
  fire_secondary: {
    frameCount: 4, fps: 14, loop: false, showEq: 'secondary',
    keys: {
      head:      Array(4).fill({rot:0,dx:0,dy:0}),
      face:      Array(4).fill({rot:0,dx:0,dy:0}),
      torso:     Array(4).fill({rot:0,dx:0,dy:0}),
      back_arm:  Array(4).fill({rot:0,dx:0,dy:0}),
      front_arm: [
        {rot:3,   dx:0,   dy:-1},
        {rot:-12, dx:-1,  dy:-3},
        {rot:-4,  dx:0,   dy:-1.8},
        {rot:3,   dx:0,   dy:-1},
      ],
    }
  },
  switch_melee: {
    frameCount: 8, fps: 10, loop: false, showEq: 'melee',
    keys: {
      head:      Array(8).fill(0).map((_,i)=>{const p=[0,1,2,2,1,0,-1,-1][i];return {rot:0,dx:0,dy:p*0.3};}),
      face:      Array(8).fill(0).map((_,i)=>{const p=[0,1,2,2,1,0,-1,-1][i];return {rot:0,dx:0,dy:p*0.3};}),
      torso:     Array(8).fill(0).map((_,i)=>{const p=[0,2,3,3,2,1,0,0][i];return {rot:0,dx:0,dy:p*0.4};}),
      back_arm:  [0,-8,-15,-15,-10,-5,5,10].map(r=>({rot:r,dx:0,dy:0})),
      front_arm: [
        {rot:0,  dx:0,  dy:0},{rot:-15,dx:-3, dy:1},{rot:-25,dx:-5, dy:2},{rot:-10,dx:-2, dy:1.5},
        {rot:10, dx:0,  dy:0.5},{rot:20, dx:2,  dy:0},{rot:15, dx:2,  dy:-1},{rot:10, dx:1,  dy:-1},
      ],
    }
  },
  attack_melee: {
    frameCount: 8, fps: 14, loop: false, showEq: 'melee',
    keys: {
      head:      [{rot:0,dx:0,dy:0},{rot:-2,dx:0,dy:0},{rot:-3,dx:0,dy:0},{rot:0,dx:0,dy:0},{rot:3,dx:0,dy:0},{rot:2,dx:0,dy:0},{rot:1,dx:0,dy:0},{rot:0,dx:0,dy:0}],
      face:      [{rot:0,dx:0,dy:0},{rot:-2,dx:0,dy:0},{rot:-3,dx:0,dy:0},{rot:0,dx:0,dy:0},{rot:3,dx:0,dy:0},{rot:2,dx:0,dy:0},{rot:1,dx:0,dy:0},{rot:0,dx:0,dy:0}],
      torso:     [{rot:0,dx:0,dy:0},{rot:-3,dx:-1,dy:0},{rot:-6,dx:-2,dy:0},{rot:0,dx:0,dy:0},{rot:6,dx:2,dy:0},{rot:3,dx:1,dy:0},{rot:1,dx:0,dy:0},{rot:0,dx:0,dy:0}],
      back_arm:  [10,-10,-25,-10,15,5,5,10].map(r=>({rot:r,dx:0,dy:0})),
      front_arm: [
        {rot:10, dx:1,  dy:-1},{rot:-15,dx:-2, dy:-1},{rot:-40,dx:-5, dy:-2},{rot:0,  dx:0,  dy:-1},
        {rot:60, dx:10, dy:0},{rot:100,dx:15, dy:1},{rot:60, dx:8,  dy:0},{rot:10, dx:1,  dy:-1},
      ],
    }
  },
};

const HERO_VISIBLE_EQ = {
  head:              { layer:'head',      behind:false, scale:0.34, ox:-0.14926568895119788, oy:-0.5893343612503056, rotation:4 },
  top:               { layer:'torso',     behind:false, scale:0.42, ox: 0.06118610784887918, oy: 0.37261399041264553, rotation:0 },
  top_armored:       { layer:'torso',     behind:false, scale:0.69, ox: 0.01932121500187131, oy: 0.47659930482259394, rotation:0 },
  primary:           { layer:'front_arm', behind:true,  scale:0.65, ox: 1.172848538298235,   oy:-0.179409255863679,  rotation:0 },
  secondary_pistol:  { layer:'front_arm', behind:true,  scale:0.30, ox: 0.9651682108009549,  oy:-0.20433511738218535, rotation:0 },
  secondary_shotgun: { layer:'front_arm', behind:true,  scale:0.82, ox: 1.0823428754163478,  oy:-0.22286666388149015, rotation:-6 },
  melee:             { layer:'front_arm', behind:true,  scale:0.28, ox: 1.032533995645278,   oy:-0.5089333212549385,  rotation:-34 },
};

const heroImgCache = new Map();
function getHeroImg(src){
  if(!src) return null;
  const v = assetSuffix();
  const cacheKey = src;
  if(heroImgCache.has(cacheKey)) return heroImgCache.get(cacheKey);
  const img = new Image();
  img.src = src + v;
  heroImgCache.set(cacheKey, img);
  return img;
}

const heroAnim = { name:'walk', frame:0, lastUpdate:0, forcedEnd:0, eqSlot:null };
const battleHeroAnim = { name:'idle', frame:0, lastUpdate:0, forcedEnd:0 };

function updateHeroAnim(now){
  const a = GAME_ANIMS[heroAnim.name];
  if(!a) return;
  const interval = 1000 / a.fps;
  if(now - heroAnim.lastUpdate >= interval){
    heroAnim.lastUpdate = now;
    if(a.loop){
      heroAnim.frame = (heroAnim.frame + 1) % a.frameCount;
    } else {
      if(heroAnim.frame < a.frameCount - 1){
        heroAnim.frame++;
      } else if(now > (heroAnim.forcedEnd||0)){
        heroAnim.name = 'walk';
        heroAnim.frame = 0;
        heroAnim.eqSlot = null;
      }
    }
  }
}
function updateBattleHeroAnim(now){
  const a = GAME_ANIMS[battleHeroAnim.name];
  if(!a) return;
  const interval = 1000 / a.fps;
  if(now - battleHeroAnim.lastUpdate >= interval){
    battleHeroAnim.lastUpdate = now;
    if(a.loop){
      battleHeroAnim.frame = (battleHeroAnim.frame + 1) % a.frameCount;
    } else {
      if(battleHeroAnim.frame < a.frameCount - 1){
        battleHeroAnim.frame++;
      } else if(battleHeroAnim.forcedEnd && now > battleHeroAnim.forcedEnd){
        battleHeroAnim.name = 'idle';
        battleHeroAnim.frame = 0;
        battleHeroAnim.forcedEnd = 0;
      }
    }
  }
}

function getWeaponCfg(slot, id){
  if(slot === 'primary') return HERO_VISIBLE_EQ.primary;
  if(slot === 'melee') return HERO_VISIBLE_EQ.melee;
  if(slot === 'secondary'){
    const def = itemDef(id);
    if(def && def.type === '霰彈槍') return HERO_VISIBLE_EQ.secondary_shotgun;
    return HERO_VISIBLE_EQ.secondary_pistol;
  }
  return null;
}
function getTopCfg(id){
  const def = itemDef(id);
  if(def && def.armored) return HERO_VISIBLE_EQ.top_armored;
  return HERO_VISIBLE_EQ.top;
}

function getExploreWeaponRightEdge(canvasW, canvasH){
  const B = { x: 30, y: 30, w: 340, h: 460 };
  const ORIG_CHAR_H = 386;
  const ORIG_FOOT_X = 200;
  const ORIG_FOOT_Y = 515;
  const scale = (canvasH * CHAR_HEIGHT_FACTOR) / ORIG_CHAR_H;
  const groundY = canvasH * 0.95;
  const centerX = canvasW * EXPLORE_HERO_X_RATIO;

  const eq = state.player.equipped;
  let wpSlot = null, wpId = null;
  if(heroAnim.eqSlot && eq[heroAnim.eqSlot]){ wpSlot = heroAnim.eqSlot; wpId = eq[heroAnim.eqSlot]; }
  else if(eq.primary){ wpSlot = 'primary'; wpId = eq.primary; }
  else if(eq.secondary){ wpSlot = 'secondary'; wpId = eq.secondary; }
  else if(eq.melee){ wpSlot = 'melee'; wpId = eq.melee; }

  if(!wpSlot || !wpId) return { x: centerX, y: groundY };
  const cfg = getWeaponCfg(wpSlot, wpId);
  if(!cfg) return { x: centerX, y: groundY };
  const L = GAME_LAYERS.find(l => l.id === cfg.layer);
  if(!L) return { x: centerX, y: groundY };

  const cx = B.x + B.w * L.x;
  const cy = B.y + B.h * L.y;
  const w = B.w * L.w;
  const h = B.h * L.h;
  const px = w * L.pivot.x;
  const py = h * L.pivot.y;
  const localX = px + w * (cfg.ox || 0);
  const localY = py + h * (cfg.oy || 0);
  const weaponCenterCharX = cx - px + localX;
  const weaponCenterCharY = cy - py + localY;
  const weaponW = 400 * (cfg.scale || 0.3);
  const rightCharX = weaponCenterCharX + weaponW / 2;

  return {
    x: centerX + scale * (rightCharX - ORIG_FOOT_X),
    y: groundY + scale * (weaponCenterCharY - ORIG_FOOT_Y)
  };
}

function drawBlockHero(ctx, canvasW, canvasH, animName, frameIdx, weaponSlotOverride, charHFactor, centerXRatio){
  const anim = GAME_ANIMS[animName] || GAME_ANIMS.idle;
  const fi = ((frameIdx % anim.frameCount) + anim.frameCount) % anim.frameCount;
  const factor = charHFactor || CHAR_HEIGHT_FACTOR;

  const B = { x: 30, y: 30, w: 340, h: 460 };
  const ORIG_CHAR_H = 386;
  const ORIG_FOOT_X = 200;
  const ORIG_FOOT_Y = 515;

  const targetCharH = canvasH * factor;
  const scale = targetCharH / ORIG_CHAR_H;
  const groundY = canvasH * 0.95;
  const ratio = (centerXRatio != null) ? centerXRatio : 0.5;
  const centerX = canvasW * ratio;

  ctx.save();
  ctx.translate(centerX, groundY);
  ctx.scale(scale, scale);
  ctx.translate(-ORIG_FOOT_X, -ORIG_FOOT_Y);

  const units = [];
  for(const L of GAME_LAYERS){
    units.push({ z: L.z, kind:'layer', layer: L });
  }

  const eq = state.player.equipped;

  if(eq.head){
    const cfg = HERO_VISIBLE_EQ.head;
    const layerDef = GAME_LAYERS.find(l => l.id === cfg.layer);
    if(layerDef){
      const img = getHeroImg(`icons/items/${resolveIconId(eq.head)}.png`);
      units.push({ z: layerDef.z + 0.5, kind:'eq', layerId: cfg.layer, ox: cfg.ox, oy: cfg.oy, scale: cfg.scale, rotation: cfg.rotation, img });
    }
  }

  if(eq.top){
    const cfg = getTopCfg(eq.top);
    const layerDef = GAME_LAYERS.find(l => l.id === cfg.layer);
    if(layerDef){
      const img = getHeroImg(`icons/items/${resolveIconId(eq.top)}.png`);
      units.push({ z: layerDef.z + 0.5, kind:'eq', layerId: cfg.layer, ox: cfg.ox, oy: cfg.oy, scale: cfg.scale, rotation: cfg.rotation, img });
    }
  }

  let wpSlot = null, wpId = null;
  if(weaponSlotOverride && eq[weaponSlotOverride]){
    wpSlot = weaponSlotOverride;
    wpId = eq[weaponSlotOverride];
  } else if(eq.primary){ wpSlot = 'primary'; wpId = eq.primary; }
  else if(eq.secondary){ wpSlot = 'secondary'; wpId = eq.secondary; }
  else if(eq.melee){ wpSlot = 'melee'; wpId = eq.melee; }

  if(wpSlot && wpId){
    const cfg = getWeaponCfg(wpSlot, wpId);
    if(cfg){
      const layerDef = GAME_LAYERS.find(l => l.id === cfg.layer);
      if(layerDef){
        const img = getHeroImg(`icons/items/${resolveIconId(wpId)}.png`);
        units.push({ z: layerDef.z - 0.5, kind:'eq', layerId: cfg.layer, ox: cfg.ox, oy: cfg.oy, scale: cfg.scale, rotation: cfg.rotation, img });
      }
    }
  }

  units.sort((a,b)=>a.z - b.z);

  for(const u of units){
    if(u.kind === 'layer') drawBodyLayer(ctx, u.layer, B, anim, fi);
    else drawEqLayer(ctx, u, B, anim, fi);
  }
  ctx.restore();
}

function drawBodyLayer(ctx, L, B, anim, fi){
  const keys = anim.keys[L.id] || [];
  const key = keys[fi] || {rot:0, dx:0, dy:0};
  const cx = B.x + B.w * (L.x + (key.dx||0) * 0.01);
  const cy = B.y + B.h * (L.y + (key.dy||0) * 0.01);
  const w = B.w * L.w;
  const h = B.h * L.h;
  const px = w * L.pivot.x;
  const py = h * L.pivot.y;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((key.rot || 0) * Math.PI / 180);
  ctx.translate(-px, -py);
  ctx.fillStyle = L.color;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(0,0,0,0.65)';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, w - 2, h - 2);
  ctx.restore();
}

function drawEqLayer(ctx, u, B, anim, fi){
  const img = u.img;
  if(!img || !img.complete || !img.naturalWidth) return;
  const L = GAME_LAYERS.find(l => l.id === u.layerId);
  const keys = anim.keys[L.id] || [];
  const key = keys[fi] || {rot:0, dx:0, dy:0};
  const cx = B.x + B.w * (L.x + (key.dx||0) * 0.01);
  const cy = B.y + B.h * (L.y + (key.dy||0) * 0.01);
  const w = B.w * L.w;
  const h = B.h * L.h;
  const px = w * L.pivot.x;
  const py = h * L.pivot.y;
  const localX = px + w * (u.ox || 0);
  const localY = py + h * (u.oy || 0);
  const baseW = 400 * (u.scale || 0.3);
  const ar = img.naturalWidth / img.naturalHeight;
  const baseH = baseW / ar;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((key.rot || 0) * Math.PI / 180);
  ctx.translate(-px, -py);
  ctx.translate(localX, localY);
  if(u.rotation) ctx.rotate(u.rotation * Math.PI / 180);
  ctx.drawImage(img, -baseW/2, -baseH/2, baseW, baseH);
  ctx.restore();
}

function drawSilhouette(ctx, canvasW, canvasH, topY, bottomY){
  const anim = GAME_ANIMS.idle;
  const fi = 0;
  const B = { x: 30, y: 30, w: 340, h: 460 };
  const ORIG_FOOT_X = 200;
  const ORIG_FOOT_Y = 515;
  const CHAR_TOP_Y = 58.4;
  const span = (bottomY - topY) / (ORIG_FOOT_Y - CHAR_TOP_Y);
  ctx.save();
  ctx.translate(canvasW / 2, bottomY);
  ctx.scale(span, span);
  ctx.translate(-ORIG_FOOT_X, -ORIG_FOOT_Y);
  for(const L of GAME_LAYERS){
    const key = (anim.keys[L.id] || [])[fi] || {rot:0, dx:0, dy:0};
    const cx = B.x + B.w * (L.x + (key.dx||0) * 0.01);
    const cy = B.y + B.h * (L.y + (key.dy||0) * 0.01);
    const w = B.w * L.w;
    const h = B.h * L.h;
    const px = w * L.pivot.x;
    const py = h * L.pivot.y;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((key.rot || 0) * Math.PI / 180);
    ctx.translate(-px, -py);
    ctx.fillStyle = '#2a231c';
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
  ctx.restore();
}

function renderExploreHeroCanvas(){
  if(currentTab !== 'explore') return;
  const canvas = document.getElementById('hero-canvas');
  if(!canvas) return;
  const zone = document.getElementById('zone1');
  if(!zone) return;
  const w = zone.clientWidth, h = zone.clientHeight;
  if(canvas.width !== w || canvas.height !== h){ canvas.width = w; canvas.height = h; }
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, w, h);
  drawBlockHero(ctx, w, h, heroAnim.name, heroAnim.frame, heroAnim.eqSlot || null, CHAR_HEIGHT_FACTOR, EXPLORE_HERO_X_RATIO);
}

function renderBattleHeroCanvas(){
  if(!battle) return;
  const canvas = document.getElementById('hero-battle-canvas');
  if(!canvas) return;
  const sprite = canvas.parentElement;
  const w = sprite.clientWidth || 88;
  const h = sprite.clientHeight || 118;
  if(canvas.width !== w || canvas.height !== h){ canvas.width = w; canvas.height = h; }
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, w, h);
  const overrideSlot = (battle.weaponSlot === 'throwable') ? null : battle.weaponSlot;
  drawBlockHero(ctx, w, h, battleHeroAnim.name, battleHeroAnim.frame, overrideSlot, CHAR_HEIGHT_FACTOR_BATTLE);
}

function renderZone2Silhouette(){
  const canvas = document.getElementById('zone2-silhouette');
  const zone = document.getElementById('zone2');
  if(!canvas || !zone) return;
  const w = zone.clientWidth, h = zone.clientHeight;
  if(canvas.width !== w || canvas.height !== h){ canvas.width = w; canvas.height = h; }
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, w, h);
  const headSlot = zone.querySelector('.slot[data-slot="head"]');
  const shoesSlot = zone.querySelector('.slot[data-slot="shoes"]');
  if(!headSlot || !shoesSlot) return;
  const zr = zone.getBoundingClientRect();
  const topY = headSlot.getBoundingClientRect().top - zr.top;
  const bottomY = shoesSlot.getBoundingClientRect().bottom - zr.top;
  drawSilhouette(ctx, w, h, topY, bottomY);
}

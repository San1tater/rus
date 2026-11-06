/* v17.5 hotfix batch applied */

'use strict';

const GAME_LAYERS = [
  { id:'right_leg', name:'右腿', z:18, color:'#2a2a2a', pivot:{x:0.5,y:0.05}, x:0.6, y:0.6, w:0.13, h:0.42 },
  { id:'torso', name:'軀幹', z:30, color:'#4a6741', pivot:{x:0.5,y:0.10}, x:0.5, y:0.27, w:0.3, h:0.42 },
  { id:'head', name:'頭', z:45, color:'#c89870', pivot:{x:0.5,y:0.92}, x:0.53, y:0.22, w:0.2, h:0.17 },
  { id:'face', name:'面部', z:48, color:'#b88860', pivot:{x:0.5,y:0.92}, x:0.57, y:0.23, w:0.14, h:0.13 },
  { id:'left_leg', name:'左腿', z:52, color:'#3a3a3a', pivot:{x:0.5,y:0.05}, x:0.44, y:0.62, w:0.14, h:0.44 },
  { id:'back_arm', name:'後臂', z:55, color:'#3d3020', pivot:{x:0.5,y:0.5}, x:0.8, y:0.36, w:0.11, h:0.1 },
  { id:'front_arm', name:'前臂', z:62, color:'#5a4a35', pivot:{x:0.05,y:0.5}, x:0.27, y:0.38, w:0.4, h:0.08 },
];

const GAME_ANIMS = {
  dead: { frameCount: 1, fps: 1, loop: true, showEq: 'primary', keys: {} },
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

/* rev-fix-heal-melee: 治療動畫 = attack_melee 循環版 */
GAME_ANIMS.heal_melee = JSON.parse(JSON.stringify(GAME_ANIMS.attack_melee));
GAME_ANIMS.heal_melee.loop = true;

const WEAPON_LAYOUT = {
  '6kh2':     { scale:1, ox:0.89, oy:0.69, rotation:-80, trim:{x:5,y:19,w:117,h:28} },
  '6kh5':     { scale:1, ox:0.89, oy:0.69, rotation:-80, trim:{x:5,y:19,w:117,h:28} },
  '9a91':     { scale:1, ox:0.05, oy:-0.2, rotation:0, trim:{x:0,y:28,w:215,h:79} },
  'ak103':    { scale:1, ox:0.115847, oy:-0.090232, rotation:0, trim:{x:16,y:18,w:287,h:91} },
  'ak104':    { scale:1, ox:0.25, oy:-0.15, rotation:0, trim:{x:12,y:22,w:232,h:83} },
  'ak105':    { scale:1, ox:0.25, oy:-0.15, rotation:0, trim:{x:12,y:21,w:232,h:84} },
  'ak12':     { scale:1, ox:0.115847, oy:-0.090232, rotation:0, trim:{x:15,y:18,w:288,h:92} },
  'ak74':     { scale:1, ox:0.115847, oy:-0.090232, rotation:0, trim:{x:15,y:17,w:288,h:93} },
  'ak74m':    { scale:1, ox:0.115847, oy:-0.090232, rotation:0, trim:{x:16,y:18,w:287,h:91} },
  'ak74n':    { scale:1, ox:0.115847, oy:-0.090232, rotation:0, trim:{x:15,y:17,w:288,h:93} },
  'akm':      { scale:1, ox:0.115847, oy:-0.090232, rotation:0, trim:{x:15,y:15,w:287,h:97} },
  'akmn':     { scale:1, ox:0.115847, oy:-0.090232, rotation:0, trim:{x:15,y:15,w:288,h:97} },
  'akms':     { scale:1, ox:0.115847, oy:-0.090232, rotation:0, trim:{x:15,y:16,w:288,h:94} },
  'aks74u':   { scale:1, ox:0.25, oy:-0.2, rotation:0, trim:{x:19,y:28,w:194,h:85} },
  'aks74un':  { scale:1, ox:0.25, oy:-0.2, rotation:0, trim:{x:19,y:28,w:194,h:85} },
  'aps':      { scale:1, ox:0.67, oy:-0.22, rotation:0, trim:{x:19,y:0,w:89,h:64} },
  'ash12':    { scale:1, ox:-0.1, oy:-0.51, rotation:0, trim:{x:15,y:17,w:229,h:93} },
  'asval':    { scale:1, ox:0.01, oy:-0.090232, rotation:0, trim:{x:11,y:15,w:299,h:85} },
  'f1':       { scale:1, ox:0, oy:0.2, rotation:0, trim:{x:13,y:4,w:33,h:57} },
  'ks23':     { scale:1, ox:0.154468, oy:-0.038305, rotation:-6, trim:{x:57,y:0,w:266,h:64} },
  'kukri':    { scale:1, ox:0.89, oy:0.69, rotation:-80, trim:{x:8,y:13,w:112,h:34} },
  'mp133':    { scale:1, ox:0.05, oy:0, rotation:-6, trim:{x:40,y:0,w:368,h:64} },
  'mp153':    { scale:1, ox:0.05, oy:0, rotation:-6, trim:{x:13,y:0,w:290,h:62} },
  'mp155':    { scale:1, ox:0.154468, oy:-0.038305, rotation:-6, trim:{x:18,y:1,w:344,h:60} },
  'mp443':    { scale:1, ox:0.67, oy:-0.22, rotation:0, trim:{x:26,y:0,w:75,h:61} },
  'pb':       { scale:1, ox:0.67, oy:-0.22, rotation:0, trim:{x:30,y:0,w:130,h:64} },
  'pkm':      { scale:1, ox:-0.05, oy:-0.25, rotation:0, trim:{x:0,y:42,w:376,h:112} },
  'pkp':      { scale:1, ox:-0.05, oy:-0.25, rotation:0, trim:{x:0,y:42,w:378,h:119} },
  'pm':       { scale:1, ox:0.67, oy:-0.22, rotation:0, trim:{x:27,y:0,w:74,h:64} },
  'pp19':     { scale:1.25, ox:0.3, oy:-0.15, rotation:0, trim:{x:8,y:34,w:149,h:69} },
  'rgd5':     { scale:1, ox:0, oy:0.2, rotation:0, trim:{x:11,y:3,w:36,h:60} },
  'rgn':      { scale:1, ox:0, oy:0.2, rotation:0, trim:{x:9,y:0,w:42,h:62} },
  'rgo':      { scale:1, ox:0, oy:0.2, rotation:0, trim:{x:11,y:1,w:37,h:58} },
  'rpd':      { scale:1, ox:0, oy:-0.05, rotation:0, trim:{x:33,y:5,w:362,h:122} },
  'rpdn':     { scale:1, ox:0, oy:-0.05, rotation:0, trim:{x:33,y:5,w:362,h:122} },
  'rpg':      { scale:1, ox:-0.04529, oy:-1.109863, rotation:0, trim:{x:21,y:0,w:210,h:64} },
  'rpk16':    { scale:1, ox:0.115847, oy:-0.090232, rotation:0, trim:{x:15,y:13,w:288,h:101} },
  'saiga12':  { scale:1, ox:0.05, oy:0, rotation:-6, trim:{x:15,y:24,w:284,h:78} },
  'sr3m':     { scale:1.25, ox:0.25, oy:-0.15, rotation:0, trim:{x:9,y:37,w:142,h:67} },
  'sv98':     { scale:1, ox:0.115847, oy:-0.9, rotation:0, trim:{x:18,y:17,w:344,h:93} },
  'svd':      { scale:1, ox:0.07, oy:-0.7, rotation:0, trim:{x:19,y:24,w:344,h:80} },
  'toz106':   { scale:1.25, ox:0.15, oy:0, rotation:-6, trim:{x:8,y:10,w:182,h:54} },
  'vog17':    { scale:1, ox:0, oy:0.2, rotation:0, trim:{x:14,y:3,w:33,h:54} },
  'vog25':    { scale:1, ox:0, oy:0.2, rotation:0, trim:{x:14,y:3,w:33,h:54} },
  'vss':      { scale:1, ox:0, oy:-0.75, rotation:0, trim:{x:16,y:1,w:294,h:99} },
};

const HEAD_ARMOR_LAYOUT = {
  '6b13':     { layer:"torso", behind:false, scale:0.44, ox:0.04, oy:0.36, rotation:0 },
  '6b13m':    { layer:"torso", behind:false, scale:0.44, ox:0.04, oy:0.36, rotation:0 },
  '6b23':     { layer:"torso", behind:false, scale:0.44, ox:0.04, oy:0.36, rotation:0 },
  '6b231':    { layer:"torso", behind:false, scale:0.44, ox:0.04, oy:0.36, rotation:0 },
  '6b232':    { layer:"torso", behind:false, scale:0.44, ox:0.04, oy:0.36, rotation:0 },
  '6b43':     { layer:"torso", behind:false, scale:0.65, ox:0, oy:0.47, rotation:0 },
  '6b45':     { layer:"torso", behind:false, scale:0.44, ox:0.04, oy:0.36, rotation:0 },
  '6b47':     { layer:"head", behind:false, scale:0.28, ox:-0.019509, oy:-0.61, rotation:4 },
  '6b47m':    { layer:"head", behind:false, scale:0.28, ox:-0.019509, oy:-0.61, rotation:4 },
  'altyn':    { layer:"head", behind:false, scale:0.34, ox:-0.02, oy:-0.68, rotation:4 },
  'defender2':{ layer:"torso", behind:false, scale:0.44, ox:0.04, oy:0.45, rotation:0 },
  'kiver':    { layer:"head", behind:false, scale:0.37, ox:-0.127016, oy:-0.527087, rotation:4 },
  'kolpak':   { layer:"head", behind:false, scale:0.34, ox:-0.019509, oy:-0.675705, rotation:4 },
  'maska':    { layer:"head", behind:false, scale:0.34, ox:-0.019509, oy:-0.675705, rotation:4 },
  'paca':     { layer:"torso", behind:false, scale:0.44, ox:0.04, oy:0.36, rotation:0 },
  'redutm':   { layer:"torso", behind:false, scale:0.44, ox:0.04, oy:0.36, rotation:0 },
  'ssh68':    { layer:"head", behind:false, scale:0.34, ox:-0.019509, oy:-0.675705, rotation:4 },
  'sssh94':   { layer:"head", behind:false, scale:0.34, ox:-0.04, oy:-0.6, rotation:0 },
  'zhuk3':    { layer:"torso", behind:false, scale:0.44, ox:0.04, oy:0.36, rotation:0 },
  'zhuk6a':   { layer:"torso", behind:false, scale:0.44, ox:0.04, oy:0.36, rotation:0 },
  'zsh12m':   { layer:"head", behind:false, scale:0.35, ox:-0.1, oy:-0.6, rotation:4 },
};

const WEAPON_MUZZLE = {
  '9a91':     { x: 214, y: 17 },
  'ak103':    { x: 286, y: 19.5 },
  'ak104':    { x: 231, y: 17.5 },
  'ak105':    { x: 231, y: 18.5 },
  'ak12':     { x: 287, y: 22.5 },
  'ak74':     { x: 287, y: 20 },
  'ak74m':    { x: 286, y: 19.5 },
  'ak74n':    { x: 287, y: 20 },
  'akm':      { x: 286, y: 23.5 },
  'akmn':     { x: 287, y: 23.5 },
  'akms':     { x: 287, y: 23 },
  'aks74u':   { x: 193, y: 20 },
  'aks74un':  { x: 193, y: 20 },
  'aps':      { x: 88, y: 9.5 },
  'ash12':    { x: 228, y: 34.5 },
  'asval':    { x: 298, y: 17 },
  'ks23':     { x: 265, y: 11 },
  'mp133':    { x: 367, y: 7 },
  'mp153':    { x: 289, y: 13.5 },
  'mp155':    { x: 343, y: 11.5 },
  'mp443':    { x: 74, y: 8.5 },
  'pb':       { x: 129, y: 11 },
  'pkm':      { x: 375, y: 29 },
  'pkp':      { x: 377, y: 29 },
  'pm':       { x: 73, y: 10.5 },
  'pp19':     { x: 148, y: 13.5 },
  'rpd':      { x: 361, y: 26 },
  'rpdn':     { x: 361, y: 26 },
  'rpg':      { x: 209, y: 42.5 },
  'rpk16':    { x: 287, y: 24.5 },
  'saiga12':  { x: 283, y: 18 },
  'sr3m':     { x: 141, y: 13.5 },
  'sv98':     { x: 343, y: 41 },
  'svd':      { x: 343, y: 34 },
  'toz106':   { x: 181, y: 7 },
  'vss':      { x: 293, y: 46 },
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

function computeWeaponCharLayout(cfg){
  if(!cfg || !cfg.layer) return null;
  const L = GAME_LAYERS.find(l => l.id === cfg.layer);
  if(!L) return null;
  const B = { x:30, y:30, w:340, h:460 };
  const w = B.w * L.w;
  const h = B.h * L.h;
  const cx = B.x + B.w * L.x;
  const cy = B.y + B.h * L.y;
  const anchorX = cx + w * (cfg.ox || 0);
  const anchorY = cy + h * (cfg.oy || 0);
  const isTrimMode = !!(cfg.trim && cfg.trim.w > 0);
  const baseW = isTrimMode
    ? cfg.trim.w * (cfg.scale || 1.0)
    : 400 * (cfg.scale || 0.3);
  const rightX = isTrimMode ? (anchorX + baseW) : (anchorX + baseW / 2);
  return { anchorX, anchorY, rightX, baseW, isTrimMode };
}

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

function computeAnimFrame(animName, startAt, now){
  const a = GAME_ANIMS[animName] || GAME_ANIMS.idle;
  const interval = 1000 / a.fps;
  const elapsed = Math.max(0, now - startAt);
  let f = Math.floor(elapsed / interval);
  if(a.loop){ f = f % a.frameCount; }
  else if(f > a.frameCount - 1){ f = a.frameCount - 1; }
  return f;
}

function updateHeroAnim(now){
  const a = GAME_ANIMS[heroAnim.name];
  if(!a) return;
  const isFire = heroAnim.name === 'fire_primary' || heroAnim.name === 'fire_secondary' || heroAnim.name === 'attack_melee';
  /* rev-fix-anim-start: fire 動畫基於 animStart 計算幀，確保每發都從 0 開始且正常更新 */
  if(isFire && typeof heroAnim.animStart === 'number'){
    /* rev-fix-anim-loop: 射擊期間持續循環 01230123，不鎖死在最後一幀 */
    const interval = 1000 / a.fps;
    const elapsed = Math.max(0, now - heroAnim.animStart);
    heroAnim.frame = Math.floor(elapsed / interval) % a.frameCount;
    return;
  }
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
  const baseId = resolveIconId(id);
  const layout = WEAPON_LAYOUT[baseId];
  if(layout){
    return { layer:'front_arm', behind:true, scale:layout.scale, ox:layout.ox, oy:layout.oy, rotation:layout.rotation, trim:layout.trim };
  }
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
  /* rev92: 優先查 per-item 表，回退到類型級別 */
  if(typeof HEAD_ARMOR_LAYOUT !== 'undefined' && HEAD_ARMOR_LAYOUT[id]) return HEAD_ARMOR_LAYOUT[id];
  const def = itemDef(id);
  if(def && def.armored) return HERO_VISIBLE_EQ.top_armored;
  return HERO_VISIBLE_EQ.top;
}

function getExploreWeaponRightEdge(canvasW, canvasH){
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
  const layout = computeWeaponCharLayout(cfg);
  if(!layout) return { x: centerX, y: groundY };

  const _wid = resolveIconId(wpId);
  const _wm = (typeof WEAPON_MUZZLE !== 'undefined' && WEAPON_MUZZLE[_wid]) ? WEAPON_MUZZLE[_wid] : null;
  const _tr = cfg.trim;
  if(_wm && _tr && _tr.w > 0 && _tr.h > 0 && layout.isTrimMode){
    const _baseW = layout.baseW;
    const _baseH = _tr.h * (cfg.scale || 1.0);
    const _mzLocalX = layout.anchorX + (_wm.x / _tr.w) * _baseW;
    const _mzLocalY = layout.anchorY - _baseH / 2 + (_wm.y / _tr.h) * _baseH;
    return {
      x: centerX + scale * (_mzLocalX - ORIG_FOOT_X),
      y: groundY + scale * (_mzLocalY - ORIG_FOOT_Y)
    };
  }
  return {
    x: centerX + scale * (layout.rightX - ORIG_FOOT_X),
    y: groundY + scale * (layout.anchorY - ORIG_FOOT_Y)
  };
}

function getPlayerMuzzlePos(){
  const fx = document.getElementById('battle-fx');
  const W = fx ? fx.clientWidth : 400;
  const H = fx ? fx.clientHeight : 500;
  const spriteW = (typeof battle !== 'undefined' && battle && battle.playerCanvasW) ? battle.playerCanvasW : 220;
  const spriteH = (typeof battle !== 'undefined' && battle && battle.playerCanvasH) ? battle.playerCanvasH : BATTLE_HERO_SPRITE_H;

  const ORIG_CHAR_H = 386;
  const ORIG_FOOT_X = 200;
  const ORIG_FOOT_Y = 515;
  const scale = (spriteH * CHAR_HEIGHT_FACTOR_BATTLE) / ORIG_CHAR_H;
  const groundY_local = spriteH * 0.95;
  const centerX_local = spriteW / 2;

  const eq = state.player.equipped;
  let wpSlot = null, wpId = null;
  if(typeof battle !== 'undefined' && battle && battle.weaponSlot && eq[battle.weaponSlot]){ wpSlot = battle.weaponSlot; wpId = eq[battle.weaponSlot]; }
  else if(eq.primary){ wpSlot = 'primary'; wpId = eq.primary; }
  else if(eq.secondary){ wpSlot = 'secondary'; wpId = eq.secondary; }
  else if(eq.melee){ wpSlot = 'melee'; wpId = eq.melee; }

  let localX = centerX_local;
  let localY = groundY_local - spriteH * 0.4;

  if(wpSlot && wpId){
    const cfg = getWeaponCfg(wpSlot, wpId);
    if(cfg){
      const layout = computeWeaponCharLayout(cfg);
      if(layout){
        const _wid = resolveIconId(wpId);
        const _wm = (typeof WEAPON_MUZZLE !== 'undefined' && WEAPON_MUZZLE[_wid]) ? WEAPON_MUZZLE[_wid] : null;
        const _tr = cfg.trim;
        if(_wm && _tr && _tr.w > 0 && _tr.h > 0 && layout.isTrimMode){
          const _baseW = layout.baseW;
          const _baseH = _tr.h * (cfg.scale || 1.0);
          const _mzLocalX = layout.anchorX + (_wm.x / _tr.w) * _baseW;
          const _mzLocalY = layout.anchorY - _baseH / 2 + (_wm.y / _tr.h) * _baseH;
          localX = centerX_local + scale * (_mzLocalX - ORIG_FOOT_X);
          localY = groundY_local + scale * (_mzLocalY - ORIG_FOOT_Y);
        } else {
          localX = centerX_local + scale * (layout.rightX - ORIG_FOOT_X);
          localY = groundY_local + scale * (layout.anchorY - ORIG_FOOT_Y);
        }
      }
    }
  }
  const px = (typeof battle !== 'undefined' && battle) ? battle.px : 0.15;
  const py = (typeof battle !== 'undefined' && battle) ? battle.py : 0.75;
  return {
    x: (px * W - spriteW / 2 + localX) / W,
    y: (py * H + localY) / H
  };
}

function drawBodyLayer(ctx, L, B, anim, fi, rotOverride){
  const keys = anim.keys[L.id] || [];
  const key = keys[fi] || {rot:0, dx:0, dy:0};
  const cx = B.x + B.w * (L.x + (key.dx||0) * 0.01);
  const cy = B.y + B.h * (L.y + (key.dy||0) * 0.01);
  const w = B.w * L.w;
  const h = B.h * L.h;
  const px = w * L.pivot.x;
  const py = h * L.pivot.y;
  const _finalRot = (typeof rotOverride === 'number') ? rotOverride : (key.rot || 0);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(_finalRot * Math.PI / 180);
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

  const hasTrim = u.trim && u.trim.w > 0;
  let baseW, baseH, drawX;
  if(hasTrim){
    baseW = u.trim.w * (u.scale || 1.0);
    baseH = u.trim.h * (u.scale || 1.0);
    drawX = 0;
  } else {
    baseW = 400 * (u.scale || 0.3);
    const ar = img.naturalWidth / img.naturalHeight;
    baseH = baseW / ar;
    drawX = -baseW / 2;
  }

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((key.rot || 0) * Math.PI / 180);
  ctx.translate(-px, -py);
  ctx.translate(localX, localY);
  if(u.rotation) ctx.rotate(u.rotation * Math.PI / 180);
  if(hasTrim){
    ctx.drawImage(img, u.trim.x, u.trim.y, u.trim.w, u.trim.h,
                  drawX, -baseH/2, baseW, baseH);
  } else {
    ctx.drawImage(img, drawX, -baseH/2, baseW, baseH);
  }
  ctx.restore();
}

function drawBlockHero(ctx, canvasW, canvasH, animName, frameIdx, weaponSlotOverride, charHFactor, centerXRatio, legOverride, healItemId){
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
  if(animName === 'dead'){ ctx.rotate(Math.PI / 2); }
  ctx.scale(scale, scale);
  ctx.translate(-ORIG_FOOT_X, -ORIG_FOOT_Y);

  const units = [];
  for(const L of GAME_LAYERS){
    units.push({ z: L.z, kind:'layer', layer: L });
  }

  const eq = state.player.equipped;

  if(eq.head){
    const cfg = HEAD_ARMOR_LAYOUT[eq.head] || HERO_VISIBLE_EQ.head;
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
  if(weaponSlotOverride === '__hidden__'){
    /* rev-fix-heal-anim: 治療動畫隱藏武器 */
  } else if(weaponSlotOverride && eq[weaponSlotOverride]){
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
        units.push({ z: layerDef.z - 0.5, kind:'eq', layerId: cfg.layer, ox: cfg.ox, oy: cfg.oy, scale: cfg.scale, rotation: cfg.rotation, img, trim: cfg.trim });
      }
    }
  }

  /* rev-fix-heal-item-render: 治療時前側手下方顯示消耗品圖標 */
  if(healItemId){
    const _fa = GAME_LAYERS.find(l => l.id === 'front_arm');
    if(_fa){
      const _hImg = getHeroImg(`icons/items/${resolveIconId(healItemId)}.png`);
      units.push({ z: _fa.z - 0.4, kind:'eq', layerId: 'front_arm', ox: 0.88, oy: 0.15, scale: 0.35, rotation: 45, img: _hImg });
    }
  }

  units.sort((a,b)=>a.z - b.z);

  for(const u of units){
    if(u.kind === 'layer'){
      let _rotOverride;
      if(legOverride && legOverride[u.layer.id] != null && typeof legOverride[u.layer.id].rot === 'number'){
        _rotOverride = legOverride[u.layer.id].rot;
      }
      drawBodyLayer(ctx, u.layer, B, anim, fi, _rotOverride);
    }
    else drawEqLayer(ctx, u, B, anim, fi);
  }
  ctx.restore();
}

function renderExploreHeroCanvas(){
  if(typeof currentTab === 'undefined' || currentTab !== 'explore') return;
  const canvas = document.getElementById('hero-canvas');
  if(!canvas) return;
  const zone = document.getElementById('zone1');
  if(!zone) return;
  const w = zone.clientWidth, h = zone.clientHeight;
  if(canvas.width !== w || canvas.height !== h){ canvas.width = w; canvas.height = h; }
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, w, h);
  const btr = window.BTRSupport;
  const clipH = (btr && btr.active) ? btr.playerClipH : 1.0;
  const offsetX = (btr && btr.active) ? btr.playerXOffset : 0;
  if(clipH > 0.001){
    if(clipH < 1.0){
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, w, h * clipH);
      ctx.clip();
    }
    drawBlockHero(ctx, w, h, heroAnim.name, heroAnim.frame, heroAnim.eqSlot || null, CHAR_HEIGHT_FACTOR, EXPLORE_HERO_X_RATIO + offsetX, null, heroAnim.healItem || null);
    if(clipH < 1.0) ctx.restore();
  }
}

function renderBattleHeroCanvas(){
  if(typeof battle === 'undefined' || !battle) return;
  const canvas = document.getElementById('hero-battle-canvas');
  if(!canvas) return;
  const w = canvas.clientWidth || 220;
  const h = canvas.clientHeight || 118;
  if(canvas.width !== w || canvas.height !== h){ canvas.width = w; canvas.height = h; }
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, w, h);
  /* rev-fix-boss-heal-anim: 治療中隱藏武器 */
  const overrideSlot = battle.consuming ? '__hidden__' : ((battle.weaponSlot === 'throwable') ? null : battle.weaponSlot);
  drawBlockHero(ctx, w, h, battleHeroAnim.name, battleHeroAnim.frame, overrideSlot, CHAR_HEIGHT_FACTOR_BATTLE, 0.5, battleHeroAnim.legOverride || null, battleHeroAnim.healItem || null);
}

function renderZone2Silhouette(){
  /* no-op：drawSilhouette 從未實作，zone2-silhouette canvas 不存在 */
}

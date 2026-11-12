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

/* rev-fix-weapon-muzzle-common: 武器 muzzle 在原圖座標系（400×500）的位置 —— 唯一計算入口
 * 探索 / Boss / 後院三處共用，各調用方自行做 canvas 座標系轉換。
 * 完整考慮三層旋轉：L.rot（靜態）+ key.rot（動畫幀）+ cfg.rotation（武器自身）
 * 返回值：{ x, y } 相對 400×500 原圖左上角的像素坐標；若 weaponId 無效返回 null */
window.getCharWeaponMuzzleLocal = function(weaponSlot, weaponId, animName, frameIdx){
  if(!weaponSlot || !weaponId) return null;
  if(typeof getWeaponCfg !== 'function') return null;
  const cfg = getWeaponCfg(weaponSlot, weaponId);
  if(!cfg) return null;
  const L = (typeof GAME_LAYERS !== 'undefined') ? GAME_LAYERS.find(function(l){ return l.id === cfg.layer; }) : null;
  if(!L) return null;

  const anim = (typeof GAME_ANIMS !== 'undefined' && GAME_ANIMS[animName || 'idle']) || null;
  const fc = anim ? anim.frameCount : 1;
  const fi = anim ? (((frameIdx || 0) % fc) + fc) % fc : 0;
  const key = (anim && anim.keys && anim.keys[L.id] && anim.keys[L.id][fi]) || { rot:0, dx:0, dy:0 };

  const B = { x: 30, y: 30, w: 340, h: 460 };
  const w = B.w * L.w;
  const h = B.h * L.h;
  const cx = B.x + B.w * (L.x + (key.dx || 0) * 0.01);
  const cy = B.y + B.h * (L.y + (key.dy || 0) * 0.01);

  const hasTrim = !!(cfg.trim && cfg.trim.w > 0 && cfg.trim.h > 0);
  let localX, localY;

  if(hasTrim){
    const _wid = (typeof resolveIconId === 'function') ? resolveIconId(weaponId) : weaponId;
    const mz = (typeof WEAPON_MUZZLE !== 'undefined') ? WEAPON_MUZZLE[_wid] : null;
    const baseW = cfg.trim.w * (cfg.scale || 1.0);
    const baseH = cfg.trim.h * (cfg.scale || 1.0);
    if(mz){
      /* muzzle 在武器未旋轉坐標系（相對旋轉中心 = 圖片左邊緣中點）的偏移 */
      let mxRaw = (mz.x / cfg.trim.w) * baseW;
      let myRaw = -baseH / 2 + (mz.y / cfg.trim.h) * baseH;
      /* 武器自身 rotation（drawEqLayer 裡 rotate(cfg.rotation) 繞武器中心） */
      if(cfg.rotation){
        const r = cfg.rotation * Math.PI / 180;
        const cR = Math.cos(r), sR = Math.sin(r);
        const nx = mxRaw * cR - myRaw * sR;
        const ny = mxRaw * sR + myRaw * cR;
        mxRaw = nx; myRaw = ny;
      }
      localX = w * (cfg.ox || 0) + mxRaw;
      localY = h * (cfg.oy || 0) + myRaw;
    } else {
      /* 無 muzzle 定義 → 武器右邊緣中點（與原探索/Boss 行為一致） */
      localX = w * (cfg.ox || 0) + baseW;
      localY = h * (cfg.oy || 0);
    }
  } else {
    /* 無 trim → 武器中心 */
    const baseW2 = 400 * (cfg.scale || 0.3);
    localX = w * (cfg.ox || 0) + baseW2 / 2;
    localY = h * (cfg.oy || 0);
  }

  /* 應用 L.rot + key.rot（與 drawEqLayer 完全一致） */
  const rot = ((L.rot || 0) + (key.rot || 0)) * Math.PI / 180;
  const cK = Math.cos(rot), sK = Math.sin(rot);
  const rOffX = localX * cK - localY * sK;
  const rOffY = localX * sK + localY * cK;

  return { x: cx + rOffX, y: cy + rOffY };
};

const heroImgCache = new Map();
function getHeroImg(src){
  if(!src) return null;
  const v = (typeof assetSuffix === "function") ? assetSuffix(src) : "";
  const cacheKey = src + v;
  if(heroImgCache.has(cacheKey)) return heroImgCache.get(cacheKey);
  const img = new Image();
  img.src = src + v;
  heroImgCache.set(cacheKey, img);
  return img;
}

/* [v246] 啟動時預加載所有靜態圖片，走 getHeroImg 共享 heroImgCache，一次加載永久緩存 */
function preloadStaticAssets(){
  var _ok = 0;
  try {
    // 武器
    if(typeof WEAPONS !== 'undefined'){
      for(var k in WEAPONS){
        if(WEAPONS[k] && WEAPONS[k].slot){
          getHeroImg('icons/items/' + k + '.png'); _ok++;
        }
      }
    }
    // 防具
    if(typeof ARMOR !== 'undefined'){
      for(var k in ARMOR){
        getHeroImg('icons/items/' + k + '.png'); _ok++;
      }
    }
    // 消耗品
    if(typeof CONSUMABLES !== 'undefined'){
      for(var k in CONSUMABLES){
        getHeroImg('icons/items/' + k + '.png'); _ok++;
      }
    }
    // 彈藥（按口徑映射）
    if(typeof AMMO_ICON_BY_CAL !== 'undefined'){
      for(var cal in AMMO_ICON_BY_CAL){
        getHeroImg('icons/items/' + AMMO_ICON_BY_CAL[cal]); _ok++;
      }
    }
    // 建築
    if(typeof BUILDINGS !== 'undefined'){
      getHeroImg('icons/buildings/control.png'); _ok++;
      for(var k in BUILDINGS){
        getHeroImg('icons/buildings/' + k + '.png'); _ok++;
      }
    }
    // 種子
    if(typeof SEEDS !== 'undefined'){
      for(var k in SEEDS){
        var _img = SEEDS[k].img || k;
        getHeroImg('icons/garden/seeds/' + _img + '.png'); _ok++;
      }
    }
    // 作物（成熟 / 幼苗 / 腐爛）
    if(typeof CROPS !== 'undefined'){
      for(var k in CROPS){
        var _img = CROPS[k].img || k;
        getHeroImg('icons/garden/crops/' + _img + '.png'); _ok++;
        getHeroImg('icons/garden/sprouts/sprout_' + _img + '.png'); _ok++;
        getHeroImg('icons/garden/mature/mature_' + _img + '.png'); _ok++;
        getHeroImg('icons/garden/rotten/rotten_' + _img + '.png'); _ok++;
      }
    }
    // 花園地塊背景 + 特殊物品
    var _gardenIcons = ['soil','tower_bg','shed_bg','compost_bg','fridge_bg','distillery_bg','black_soil','red_soil','liquor'];
    for(var i = 0; i < _gardenIcons.length; i++){
      getHeroImg('icons/garden/' + _gardenIcons[i] + '.png'); _ok++;
    }
    getHeroImg('images/garden/default.png'); _ok++;
    getHeroImg('images/garden/bg.png'); _ok++;
    // 敵人武器池（關鍵——修屍體沒武器的根本）
    if(typeof ENEMY_WEAPON_POOLS !== 'undefined'){
      var _seen = {};
      for(var eid in ENEMY_WEAPON_POOLS){
        var pool = ENEMY_WEAPON_POOLS[eid];
        var _tierKeys = ['t1','t2'];
        for(var ti = 0; ti < _tierKeys.length; ti++){
          var arr = pool[_tierKeys[ti]];
          if(!arr) continue;
          for(var ai = 0; ai < arr.length; ai++){
            var wid = arr[ai];
            if(_seen[wid]) continue;
            _seen[wid] = 1;
            getHeroImg('icons/items/' + wid + '.png'); _ok++;
          }
        }
      }
    }
    // Boss 圖標
    if(typeof BOSSES !== 'undefined'){
      for(var bid in BOSSES){
        var _base = bid.replace(/_ii$/, '');
        getHeroImg('icons/bosses/' + _base + '.png'); _ok++;
      }
    }
    // 載具
    if(typeof VEHICLES !== 'undefined'){
      for(var vid in VEHICLES){
        getHeroImg('icons/vehicles/' + vid + '.png'); _ok++;
      }
    }
    getHeroImg('icons/vehicles/card_bg.png'); _ok++;
    // 僕人
    if(typeof SERVANT_TYPES !== 'undefined'){
      for(var st in SERVANT_TYPES){
        getHeroImg('icons/servants/' + st + '.png'); _ok++;
      }
    }
    // Boss 背景
    if(typeof BOSSES !== 'undefined'){
      for(var bid2 in BOSSES){
        var _base2 = bid2.replace(/_ii$/, '');
        getHeroImg('images/bg/boss_' + _base2 + '.png'); _ok++;
      }
    }
  } catch(e){ console.warn('[preloadStatic]', e); }
  return _ok;
}

window.preloadStaticAssets = preloadStaticAssets;

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
    /* rev-fix-throw-full-anim: 單輪播完停在最後一幀，不循環；下一發 _playFire/_playMeleeFire 重設 animStart */
    const interval = 1000 / a.fps;
    const elapsed = Math.max(0, now - heroAnim.animStart);
    const totalDur = (a.frameCount / a.fps) * 1000;
    if(elapsed >= totalDur){
      heroAnim.frame = a.frameCount - 1;
    } else {
      heroAnim.frame = Math.floor(elapsed / interval);
    }
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
  const ORIG_FOOT_X = 200;
  const ORIG_FOOT_Y = 515;
  const scale = (canvasH * CHAR_HEIGHT_FACTOR) / 386;
  const groundY = canvasH * 0.95;
  const centerX = canvasW * EXPLORE_HERO_X_RATIO;

  const eq = state.player.equipped;
  let wpSlot = null, wpId = null;
  if(heroAnim.eqSlot && eq[heroAnim.eqSlot]){ wpSlot = heroAnim.eqSlot; wpId = eq[heroAnim.eqSlot]; }
  else if(eq.primary){ wpSlot = 'primary'; wpId = eq.primary; }
  else if(eq.secondary){ wpSlot = 'secondary'; wpId = eq.secondary; }
  else if(eq.melee){ wpSlot = 'melee'; wpId = eq.melee; }

  if(!wpSlot || !wpId) return { x: centerX, y: groundY };
  /* 委託通用槍口函數，跟隨 heroAnim 當前幀 */
  const mz = window.getCharWeaponMuzzleLocal(wpSlot, wpId, heroAnim.name, heroAnim.frame);
  if(!mz) return { x: centerX, y: groundY };
  return {
    x: centerX + scale * (mz.x - ORIG_FOOT_X),
    y: groundY + scale * (mz.y - ORIG_FOOT_Y)
  };
}

function getPlayerMuzzlePos(){
  const fx = document.getElementById('battle-fx');
  const W = fx ? fx.clientWidth : 400;
  const H = fx ? fx.clientHeight : 500;
  const spriteW = (typeof battle !== 'undefined' && battle && battle.playerCanvasW) ? battle.playerCanvasW : 220;
  const spriteH = (typeof battle !== 'undefined' && battle && battle.playerCanvasH) ? battle.playerCanvasH : BATTLE_HERO_SPRITE_H;

  const ORIG_FOOT_X = 200;
  const ORIG_FOOT_Y = 515;
  const scale = (spriteH * CHAR_HEIGHT_FACTOR_BATTLE) / 386;
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
    if(typeof AMMO !== 'undefined' && AMMO[wpId]){
      /* rev-fix-ammo-box-center: 彈藥箱中心點對齊前側手右上角 */
      const _fa = GAME_LAYERS.find(l => l.id === 'front_arm');
      if(_fa){
        const _img = getHeroImg('icons/garden/ammo_pack.png');
        units.push({
          z: _fa.z - 0.5,
          kind: 'eq',
          layerId: 'front_arm',
          ox: 1 - _fa.pivot.x,
          oy: -_fa.pivot.y,
          scale: 0.3,
          rotation: 0,
          img: _img,
          _fitMax: true
        });
      }
    } else {
      const cfg = getWeaponCfg(wpSlot, wpId);
      if(cfg){
        const layerDef = GAME_LAYERS.find(l => l.id === cfg.layer);
        if(layerDef){
          const img = getHeroImg(`icons/items/${resolveIconId(wpId)}.png`);
          units.push({ z: layerDef.z - 0.5, kind:'eq', layerId: cfg.layer, ox: cfg.ox, oy: cfg.oy, scale: cfg.scale, rotation: cfg.rotation, img, trim: cfg.trim });
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
  } else if(u._fitMax){
    /* [v196] 長邊歸一化：最大邊固定 400*scale，另一邊按比例。
       用於 healItem（water/salewa 是 64×127，原邏輯 baseH = baseW/ar 會爆到 1.98 倍）。 */
    const _maxSide = 400 * (u.scale || 0.3);
    const _ar = img.naturalWidth / img.naturalHeight;
    if(_ar >= 1){ baseW = _maxSide; baseH = _maxSide / _ar; }
    else { baseH = _maxSide; baseW = _maxSide * _ar; }
    drawX = -baseW / 2;
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
      units.push({ z: _fa.z - 0.4, kind:'eq', layerId: 'front_arm', ox: 0.88, oy: 0.15, scale: 0.35, rotation: 45, img: _hImg, _fitMax: true });
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
  /* [v187 H33] 渲染层兜底：非 heal_melee 时清 eqSlot / healItem。
     即使 H32 因某种原因没跑（比如 tick 循环挂了），渲染层也保证不残留。 */
  if(typeof heroAnim !== 'undefined' && heroAnim.name !== 'heal_melee'){
    if(heroAnim.eqSlot === '__hidden__') heroAnim.eqSlot = null;
    if(heroAnim.healItem) heroAnim.healItem = null;
  }
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
  /* rev-fix-wreck-render-offset: wreck 阶段玩家已下车，offset 强制 0，兜底防 12px 跳变。 */
  const _isWreckPhaseRO = !!(btr && btr.active && (btr.phase === 'wreck' || btr.phase === 'wreckPause'));
  const offsetX = (btr && btr.active && !_isWreckPhaseRO) ? btr.playerXOffset : 0;
  if(clipH > 0.001){
    if(clipH < 1.0){
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, w, h * clipH);
      ctx.clip();
    }
    /* [v180 F6e] 只在 heal_melee 動畫時傳 healItem，避免其他動畫狀態渲染治療圖標 */
    /* [v184b H19-C] 只在 heal_melee 时传 eqSlot / healItem。
       v180 F6e 只改了 healItem，没改 eqSlot——healing 被打断后
       eqSlot='__hidden__' 残留，导致武器一直不显示。 */
    const _eqSlotH19 = (heroAnim.name === 'heal_melee') ? (heroAnim.eqSlot || null) : null;
    const _healItemH19 = (heroAnim.name === 'heal_melee') ? (heroAnim.healItem || null) : null;
    drawBlockHero(ctx, w, h, heroAnim.name, heroAnim.frame, _eqSlotH19, CHAR_HEIGHT_FACTOR, EXPLORE_HERO_X_RATIO + offsetX, null, _healItemH19);
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


/* rev-fix-render-move: 從 23-garden-raid.js 搬移的繪製函數 */
function _raidDrawWorkerHelmet(ctx, B, anim, fi, color){
  const L = GAME_LAYERS.find(function(l){ return l.id === 'head'; });
  if(!L) return;
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
  const cxL = w * 0.5;
  const cyL = h * 0.45;
  const r = w * 0.72;
  ctx.fillStyle = color;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cxL, cyL, r, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}


function drawBucketUnit(ctx, u){
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(u.bx - u.topHalf, u.topY);
  ctx.lineTo(u.bx + u.topHalf, u.topY);
  ctx.lineTo(u.bx + u.botHalf, u.botY);
  ctx.lineTo(u.bx - u.botHalf, u.botY);
  ctx.closePath();
  ctx.fillStyle = '#9aa2aa';
  ctx.fill();
  ctx.strokeStyle = '#464d55';
  ctx.lineWidth = 5;
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.restore();
}


function drawHandItemUnit(ctx, u){
  if(u.handItemType === 'sack'){
    const cx = u.bagX;
    const cy = u.bagY;
    ctx.save();
    ctx.fillStyle = '#ede4d3';
    ctx.strokeStyle = '#464d55';
    ctx.lineWidth = 5;
    ctx.lineJoin = 'round';
    const topW = 42, topH = 31;
    ctx.beginPath();
    ctx.moveTo(cx - topW/2, cy - topH);
    ctx.lineTo(cx + topW/2, cy - topH);
    ctx.lineTo(cx, cy);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    const botW = 87, botH = 87;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + botW/2, cy + botH);
    ctx.lineTo(cx - botW/2, cy + botH);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  } else if(u.handItemType === 'shovel'){
    const ax = u.anchorX;
    const ay = u.anchorY;
    const D_W = 30, D_H = 36;
    const HANDLE_LEN = 148, HANDLE_W = 6;
    const HEAD_W = 45, HEAD_H = 57;
    const forkY = ay + D_H;
    const handleBot = forkY + HANDLE_LEN;
    const headBot = handleBot + HEAD_H;
    ctx.save();
    ctx.strokeStyle = '#9a9a9a';
    ctx.lineWidth = HANDLE_W;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(ax, forkY);
    ctx.lineTo(ax - D_W/2, ay);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(ax, forkY);
    ctx.lineTo(ax + D_W/2, ay);
    ctx.stroke();
    ctx.lineWidth = HANDLE_W + 2;
    ctx.beginPath();
    ctx.moveTo(ax - D_W/2, ay);
    ctx.lineTo(ax + D_W/2, ay);
    ctx.stroke();
    ctx.lineWidth = HANDLE_W;
    ctx.lineCap = 'butt';
    ctx.beginPath();
    ctx.moveTo(ax, forkY);
    ctx.lineTo(ax, handleBot);
    ctx.stroke();
    ctx.fillStyle = '#8a8f95';
    ctx.strokeStyle = '#464d55';
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(ax - HEAD_W/2, handleBot);
    ctx.lineTo(ax + HEAD_W/2, handleBot);
    ctx.lineTo(ax + HEAD_W/2 + 2, headBot);
    ctx.lineTo(ax - HEAD_W/2 - 2, headBot);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#5a6068';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ax, handleBot + 5);
    ctx.lineTo(ax, headBot - 8);
    ctx.stroke();
    ctx.restore();
  } else if(u.handItemType === 'clipboard'){
    const w = 90, h = 110;
    const cx = u.armMidX;
    const cy = u.armMidY + 7;
    ctx.save();
    ctx.fillStyle = '#3a78c8';
    ctx.fillRect(cx - w/2, cy - h/2, w, h);
    ctx.restore();
  } else if(u.handItemType === 'flask'){
    const positions = u.flaskPositions || [];
    const R = 37;
    const NECK_W = 26;
    const NECK_H = 52;
    const halfNeck = NECK_W / 2;
    const BODY_OFFSET = R + NECK_H/2 - 3;
    for(const pos of positions){
      const cx = pos.x;
      const cy = pos.y + BODY_OFFSET;
      const neckTopY = cy - R - NECK_H;
      const neckBottomY = cy - R + 5;
      const _dy = neckBottomY - cy;
      const _angleRight = Math.atan2(_dy, halfNeck);
      const _angleLeft = Math.atan2(_dy, -halfNeck);
      ctx.save();
      ctx.fillStyle = 'rgba(80,138,100,0.92)';
      ctx.strokeStyle = '#1f3a2a';
      ctx.lineWidth = 8;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(cx - halfNeck, neckTopY);
      ctx.lineTo(cx - halfNeck, neckBottomY);
      ctx.arc(cx, cy, R, _angleLeft, _angleRight, true);
      ctx.lineTo(cx + halfNeck, neckTopY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - halfNeck - 8, neckTopY);
      ctx.lineTo(cx + halfNeck + 8, neckTopY);
      ctx.stroke();
      ctx.fillStyle = 'rgba(180,230,200,0.55)';
      ctx.beginPath();
      ctx.ellipse(cx - R*0.32, cy - R*0.25, R*0.32, R*0.14, -0.4, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();
    }
  }
}


function _raidDrawHuman(ctx, px, py, scale, equipped, equippedRarity, animName, frameIdx, weaponSlotOverride, servantType, flipX, hasBucket, handItem, noWorkerHelmet, legOverride){
  var anim = GAME_ANIMS[animName] || GAME_ANIMS.idle;
  var fi = ((frameIdx % anim.frameCount) + anim.frameCount) % anim.frameCount;
  var B = { x:30, y:30, w:340, h:460 };
  var ORIG_FOOT_X = 200, ORIG_FOOT_Y = 515;
  var TYPE_COLORS = {
    farmer:  { body:'#5a9a48', legs:'#3a6a2e' },
    guard:   { body:'#5088bb', legs:'#2e4a6a' },
    foreman: { body:'#e0a830', legs:'#d8d0c0' },
    enemy:   { body:'#8b2a2a', legs:'#3a1010' }
  };
  var _colors = servantType ? TYPE_COLORS[servantType] : null;
  if(_colors){
    for(var li = 0; li < GAME_LAYERS.length; li++){
      var L = GAME_LAYERS[li];
      L._oldColor = L.color;
      if(L.id === 'right_leg' || L.id === 'left_leg') L.color = _colors.legs;
      else if(L.id === 'torso' || L.id === 'back_arm' || L.id === 'front_arm') L.color = _colors.body;
    }
  }
  ctx.save();
  ctx.translate(px, py);
  /* [v236] 去掉额外 translate，倒地定位与玩家一致 */
  /* [v237] 倒地旋转方向与玩家一致 */
  if(animName === 'dead'){ ctx.rotate(Math.PI / 2); }
  ctx.scale(flipX ? -scale : scale, scale);
  ctx.translate(-ORIG_FOOT_X, -ORIG_FOOT_Y);

  var units = [];
  for(var gi = 0; gi < GAME_LAYERS.length; gi++) units.push({z:GAME_LAYERS[gi].z, kind:'layer', layer:GAME_LAYERS[gi]});

  if(equipped.head){
    var cH = (typeof HEAD_ARMOR_LAYOUT !== 'undefined' && HEAD_ARMOR_LAYOUT[equipped.head]) ? HEAD_ARMOR_LAYOUT[equipped.head] : HERO_VISIBLE_EQ.head;
    var lH = GAME_LAYERS.find(function(l){ return l.id === cH.layer; });
    if(lH){
      var imgH = getHeroImg('icons/items/' + resolveIconId(equipped.head) + '.png');
      units.push({z:lH.z+0.5, kind:'eq', layerId:cH.layer, ox:cH.ox, oy:cH.oy, scale:cH.scale, rotation:cH.rotation, img:imgH});
    }
  }
  if(equipped.top){
    var cT = getTopCfg(equipped.top);
    var lT = GAME_LAYERS.find(function(l){ return l.id === cT.layer; });
    if(lT){
      var imgT = getHeroImg('icons/items/' + resolveIconId(equipped.top) + '.png');
      units.push({z:lT.z+0.5, kind:'eq', layerId:cT.layer, ox:cT.ox, oy:cT.oy, scale:cT.scale, rotation:cT.rotation, img:imgT});
    }
  }
  var wpS = null, wpI = null;
  if(weaponSlotOverride && equipped[weaponSlotOverride]){ wpS = weaponSlotOverride; wpI = equipped[weaponSlotOverride]; }
  else if(equipped.primary){ wpS = 'primary'; wpI = equipped.primary; }
  else if(equipped.secondary){ wpS = 'secondary'; wpI = equipped.secondary; }
  else if(equipped.melee){ wpS = 'melee'; wpI = equipped.melee; }
  if(wpS && wpI && typeof AMMO !== 'undefined' && AMMO[wpI]){
    /* rev-fix-ammo-handler-render: 弹药手（主武器栏是弹药箱）绘制弹药箱图标，而非子弹图标 */
    var _aLayer = GAME_LAYERS.find(function(l){ return l.id === 'front_arm'; });
    if(_aLayer){
      var _aImg = getHeroImg('icons/garden/ammo_pack.png');
/* rev-fix-ammo-box-raid: 彈藥箱中心點對齊前側手右上角 */
      units.push({
        z: _aLayer.z - 0.5,
        kind: 'eq',
        layerId: 'front_arm',
        ox: 1 - _aLayer.pivot.x,
        oy: -_aLayer.pivot.y,
        scale: 0.3,
        rotation: 0,
        img: _aImg,
        _fitMax: true
      });
    }
  } else if(wpS && wpI && !_isMeleeWeapon(wpI)){
    var cW = getWeaponCfg(wpS, wpI);
    if(cW){
      var lW = GAME_LAYERS.find(function(l){ return l.id === cW.layer; });
      if(lW){
        var imgW = getHeroImg('icons/items/' + resolveIconId(wpI) + '.png');
        units.push({z:lW.z-0.5, kind:'eq', layerId:cW.layer, ox:cW.ox, oy:cW.oy, scale:cW.scale, rotation:cW.rotation, img:imgW, trim:cW.trim});
      }
    }
  }

  if(hasBucket){
    var _fa = GAME_LAYERS.find(function(l){ return l.id === 'front_arm'; });
    var _ba = GAME_LAYERS.find(function(l){ return l.id === 'back_arm'; });
    if(_fa && _ba){
      var _fk = (anim.keys && anim.keys[_fa.id] && anim.keys[_fa.id][fi]) || {rot:0,dx:0,dy:0};
      var _bk = (anim.keys && anim.keys[_ba.id] && anim.keys[_ba.id][fi]) || {rot:0,dx:0,dy:0};
      var _fCx = B.x + B.w * (_fa.x + (_fk.dx||0) * 0.01);
      var _fCy = B.y + B.h * (_fa.y + (_fk.dy||0) * 0.01);
      var _fW = B.w * _fa.w, _fH = B.h * _fa.h;
      var _fMidX = _fCx + _fW * (0.5 - _fa.pivot.x);
      var _fMidY = _fCy + _fH * (0.5 - _fa.pivot.y);
      var _bCx = B.x + B.w * (_ba.x + (_bk.dx||0) * 0.01);
      var _bCy = B.y + B.h * (_ba.y + (_bk.dy||0) * 0.01);
      var _bW = B.w * _ba.w, _bH = B.h * _ba.h;
      var _bMidX = _bCx + _bW * (0.5 - _ba.pivot.x);
      var _bMidY = _bCy + _bH * (0.5 - _ba.pivot.y);
      var _bkx = (_fMidX + _bMidX) / 2;
      var _bky = (_fMidY + _bMidY) / 2;
      units.push({z:58, kind:'bucket', bx:_bkx, topY:_bky-38, botY:_bky+97, topHalf:54, botHalf:39});
    }
  }

  if(handItem === 'stick' || handItem === 'clipboard' || handItem === 'flask'){
    var _fa2 = GAME_LAYERS.find(function(l){ return l.id === 'front_arm'; });
    var _ba2 = GAME_LAYERS.find(function(l){ return l.id === 'back_arm'; });
    if(_fa2 && _ba2){
      var _fk2 = (anim.keys && anim.keys[_fa2.id] && anim.keys[_fa2.id][fi]) || {rot:0,dx:0,dy:0};
      var _bk2 = (anim.keys && anim.keys[_ba2.id] && anim.keys[_ba2.id][fi]) || {rot:0,dx:0,dy:0};
      var _fCx2 = B.x + B.w * (_fa2.x + (_fk2.dx||0) * 0.01);
      var _fCy2 = B.y + B.h * (_fa2.y + (_fk2.dy||0) * 0.01);
      var _fW2 = B.w * _fa2.w, _fH2 = B.h * _fa2.h;
      var _fMidX2 = _fCx2 + _fW2 * (0.5 - _fa2.pivot.x);
      var _fMidY2 = _fCy2 + _fH2 * (0.5 - _fa2.pivot.y);
      var _bCx2 = B.x + B.w * (_ba2.x + (_bk2.dx||0) * 0.01);
      var _bCy2 = B.y + B.h * (_ba2.y + (_bk2.dy||0) * 0.01);
      var _bW2 = B.w * _ba2.w, _bH2 = B.h * _ba2.h;
      var _bMidX2 = _bCx2 + _bW2 * (0.5 - _ba2.pivot.x);
      var _bMidY2 = _bCy2 + _bH2 * (0.5 - _ba2.pivot.y);
      if(handItem === 'stick'){
        units.push({z:60, kind:'handitem', handItemType:'sack', bagX:_bMidX2, bagY:_bMidY2});
        var _shovelX = _fCx2 + _fW2 * (1 - _fa2.pivot.x) - _fW2 * 0.10;
        var _shovelY = _fCy2 + _fH2 * (0 - _fa2.pivot.y) - 7;
        units.push({z:59, kind:'handitem', handItemType:'shovel', anchorX:_shovelX, anchorY:_shovelY});
      } else if(handItem === 'clipboard'){
        units.push({z:58, kind:'handitem', handItemType:'clipboard', armMidX:(_fMidX2+_bMidX2)/2, armMidY:(_fMidY2+_bMidY2)/2});
      } else if(handItem === 'flask'){
        var _flaskRX = _fCx2 + _fW2 * (0.85 - _fa2.pivot.x);
        var _flaskRY = _fCy2 + _fH2 * (0.5 - _fa2.pivot.y);
        var _flaskLX = _bCx2 + _bW2 * (0.2 - _ba2.pivot.x);
        var _flaskLY = _bCy2 + _bH2 * (0.5 - _ba2.pivot.y);
        units.push({z:61, kind:'handitem', handItemType:'flask', flaskPositions:[{x:_flaskLX, y:_flaskLY}, {x:_flaskRX, y:_flaskRY}]});
      }
    }
  }

  units.sort(function(a,b){ return a.z - b.z; });

  for(var ui = 0; ui < units.length; ui++){
    var u = units[ui];
    if(u.kind === 'layer'){
      if(legOverride && legOverride[u.layer.id] && typeof legOverride[u.layer.id].rot === 'number'){
        drawBodyLayerWithRot(ctx, u.layer, B, anim, fi, legOverride[u.layer.id].rot);
      } else {
        drawBodyLayer(ctx, u.layer, B, anim, fi);
      }
    }
    else if(u.kind === 'bucket') drawBucketUnit(ctx, u);
    else if(u.kind === 'handitem') drawHandItemUnit(ctx, u);
    else drawEqLayer(ctx, u, B, anim, fi);
  }

  if(!noWorkerHelmet && servantType === 'foreman') _raidDrawWorkerHelmet(ctx, B, anim, fi, '#ffffff');
  else if(!noWorkerHelmet && servantType === 'farmer') _raidDrawWorkerHelmet(ctx, B, anim, fi, '#ff8800');

  ctx.restore();

  if(_colors){
    for(var ri = 0; ri < GAME_LAYERS.length; ri++){
      var L2 = GAME_LAYERS[ri];
      if(typeof L2._oldColor !== 'undefined'){ L2.color = L2._oldColor; delete L2._oldColor; }
    }
  }
}


function drawBodyLayerWithRot(ctx, L, B, anim, fi, rotOverride){
  var keys = anim.keys[L.id] || [];
  var key = keys[fi] || {rot:0, dx:0, dy:0};
  var cx = B.x + B.w * (L.x + (key.dx||0) * 0.01);
  var cy = B.y + B.h * (L.y + (key.dy||0) * 0.01);
  var w = B.w * L.w;
  var h = B.h * L.h;
  var px = w * L.pivot.x;
  var py = h * L.pivot.y;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotOverride * Math.PI / 180);
  ctx.translate(-px, -py);
  ctx.fillStyle = L.color;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(0,0,0,0.65)';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, w - 2, h - 2);
  ctx.restore();
}


function _raidDrawEnemy(ctx, px, py, scale, animName, frameIdx, enemyId){
  var _realId = enemyId;
  if(typeof HUMAN_ENEMY_DATA !== "undefined"){
    if(!HUMAN_ENEMY_DATA[enemyId] && HUMAN_ENEMY_DATA["human_" + enemyId]){
      _realId = "human_" + enemyId;
    }
  }
  if(typeof HUMAN_ENEMY_DATA !== "undefined" && HUMAN_ENEMY_DATA[_realId]){
    const def = HUMAN_ENEMY_DATA[_realId];
    const anims = def.anims;
    if(!anims) return;
    let anim = anims[animName];
    if(!anim && animName === 'walk') anim = GAME_ANIMS.walk;
    if(!anim) anim = anims.idle;
    if(!anim) return;
    const fi = ((frameIdx % anim.frameCount) + anim.frameCount) % anim.frameCount;
    if(!window._rev510_raidEquipCache) window._rev510_raidEquipCache = {};
    if(!window._rev510_raidEquipCache[_realId]){
      window._rev510_raidEquipCache[_realId] = (typeof _rev506_getRandomEquip === "function")
        ? _rev506_getRandomEquip(_realId) : null;
    }
    const equip = window._rev510_raidEquipCache[_realId];
    const ox = px - def.canvas.w * scale / 2;
    const oy = py - def.canvas.h * scale;
    const _isDeath = (animName === "death");
    if(typeof _rev506_drawHumanCorpse === "function"){
      _rev506_drawHumanCorpse(ctx, _realId, scale, ox, oy, def, anim, fi, equip, _isDeath);
      return;
    }
  }
  if(typeof _drawEnemyAt === "function"){
    var _bdef = (typeof BEAST_LAYERS !== "undefined" && BEAST_LAYERS[_realId]);
    if(_bdef){
      var _bx = px - _bdef.canvas.w * scale / 2;
      var _by = py - _bdef.canvas.h * scale;
      if(_drawEnemyAt(ctx, _realId, _bx, _by, scale, animName, frameIdx)) return;
    }
  }
  if(typeof BEAST_LAYERS !== "undefined" && BEAST_LAYERS[_realId]) {
    const def = BEAST_LAYERS[_realId];
    const bounds = (typeof getBeastBounds === "function") ? getBeastBounds(def) : null;
    if(bounds) {
      const targetVisualH = 386 * 0.9;
      const actualScale = (targetVisualH * scale) / bounds.h;
      ctx.save();
      ctx.translate(px, py);
      ctx.scale(actualScale, actualScale);
      const centerX = (bounds.minX + bounds.maxX) / 2;
      const bottomY = bounds.maxY;
      ctx.translate(-centerX, -bottomY);
      const world = (typeof resolveBossWorld === "function") ? resolveBossWorld(def, { keys:{} }, 0) : {};
      const sorted = def.layers.slice().sort((a,b)=>a.z - b.z);
      for(const L of sorted) {
        const wp = world[L.id];
        if(!wp) continue;
        const w = def.canvas.w * L.w;
        const h = def.canvas.h * L.h;
        const ppx = w * L.pivot.x;
        const ppy = h * L.pivot.y;
        ctx.save();
        ctx.translate(wp.wx, wp.wy);
        ctx.rotate((L.rot || 0) * Math.PI / 180);
        ctx.translate(-ppx, -ppy);
        if(L.id.indexOf("eye") === 0) {
          ctx.shadowColor = "#ff0000";
          ctx.shadowBlur = 15;
        }
        ctx.fillStyle = L.color;
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = "rgba(0,0,0,0.65)";
        ctx.lineWidth = 2;
        ctx.strokeRect(1, 1, w - 2, h - 2);
        ctx.restore();
      }
      ctx.restore();
      return;
    }
  }
  if(typeof _raidDrawHuman === "function") {
    const _eq = { head: "ssh68", top: "6b231", primary: "ak74" };
    const _rar = { head: "一般", top: "一般", primary: "一般" };
    _raidDrawHuman(ctx, px, py, scale, _eq, _rar, animName, frameIdx, "primary", "enemy", true, false, null);
  }
}

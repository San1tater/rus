/* ===== 09-enemy-data.js ===== */
/* 由 Patcher rev500 自動生成 */
(function() {
  "use strict";

  var ENEMY_V2 = {"version":2,"enemies":{"mutant_bear":{"kind":"beast","canvas":{"w":500,"h":500},"layers":[{"id":"tail","x":0.8046,"y":0.7325,"w":0.08,"h":0.1,"color":"#4a2a10","pivot":[0.5,0.5],"z":0,"grp":"g_mvd7tc16"},{"id":"leg_b","x":0.4992,"y":0.6817,"w":0.12,"h":0.32,"color":"#221100","pivot":[0.5,0.05],"z":14,"grp":"g_mvd818na","main":1},{"id":"leg_f","x":0.7586,"y":0.696,"w":0.12,"h":0.32,"color":"#221100","pivot":[0.5,0.05],"z":21,"grp":"g_mvd81502","main":1},{"id":"arm_b","x":0.4266,"y":0.3959,"w":0.1,"h":0.28,"color":"#221100","pivot":[0.5,0.95],"z":16,"grp":"g_mvd80ygc","main":1},{"id":"arm_f","x":0.7804,"y":0.4087,"w":0.1,"h":0.3,"color":"#221100","pivot":[0.5,0.95],"z":21,"grp":"g_mvd8d8lx"},{"id":"torso","x":0.6454,"y":0.3952,"w":0.3153,"h":0.373,"color":"#4a2a10","pivot":[0.5,0.1],"z":20,"grp":"g_mvd7tc16","main":1},{"id":"head","x":0.5964,"y":0.2498,"w":0.22,"h":0.2,"color":"#4a2a10","pivot":[0.5,0.5],"z":31,"grp":"g_mvd8d8lx","main":1},{"id":"snout","x":0.5029,"y":0.2637,"w":0.1148,"h":0.082,"color":"#5a3a20","pivot":[0.5,0.5],"z":43,"grp":"g_mvd8d8lx"},{"id":"fang1","x":0.5037,"y":0.3244,"w":0.02,"h":0.03,"color":"#fff","pivot":[0.5,0.5],"z":46,"grp":"g_mvd8d8lx"},{"id":"fang2","x":0.4765,"y":0.3224,"w":0.02,"h":0.03,"color":"#fff","pivot":[0.5,0.5],"z":46,"grp":"g_mvd8d8lx"},{"id":"eye1","x":0.56,"y":0.1955,"w":0.03,"h":0.03,"color":"#ff0000","pivot":[0.5,0.5],"z":50,"grp":"g_mvd8d8lx"},{"id":"eye2","x":0.4948,"y":0.1955,"w":0.03,"h":0.03,"color":"#ff0000","pivot":[0.5,0.5],"z":50,"grp":"g_mvd8d8lx"},{"id":"g_fang1","x":0.8116,"y":0.1272,"w":0.02,"h":0.03,"color":"#fff","pivot":[0.5,0.5],"z":46.5,"grp":"g_mvd80qy9","main":1},{"id":"g_fang1_2","x":0.7772,"y":0.1267,"w":0.02,"h":0.03,"color":"#fff","pivot":[0.5,0.5],"z":47,"grp":"g_mvd80qy9"},{"id":"g_fang1_3","x":0.747,"y":0.1283,"w":0.02,"h":0.03,"color":"#fff","pivot":[0.5,0.5],"z":47.5,"grp":"g_mvd80qy9"},{"id":"arm_b_fang1","x":0.455,"y":0.1252,"w":0.02,"h":0.03,"color":"#fff","pivot":[0.5,0.5],"z":46.5,"grp":"g_mvd80ygc"},{"id":"arm_b_fang1_2","x":0.4227,"y":0.1247,"w":0.02,"h":0.03,"color":"#fff","pivot":[0.5,0.5],"z":47,"grp":"g_mvd80ygc"},{"id":"arm_b_fang1_3","x":0.3966,"y":0.1262,"w":0.02,"h":0.03,"color":"#fff","pivot":[0.5,0.5],"z":47.5,"grp":"g_mvd80ygc"},{"id":"head_leg_b","x":0.6475,"y":0.1271,"w":0.0346,"h":0.0555,"color":"#221100","pivot":[0.5,0.05],"z":57.5,"grp":"g_mvd8d8lx"},{"id":"head_leg_b_2","x":0.5913,"y":0.1192,"w":0.0292,"h":0.0292,"color":"#221100","pivot":[0.5,0.05],"z":58,"grp":"g_mvd8d8lx"},{"id":"leg_f_fang2","x":0.7946,"y":0.992,"w":0.02,"h":0.03,"color":"#fff","pivot":[0.5,0.5],"z":46.5,"grp":"g_mvd81502"},{"id":"leg_f_fang2_2","x":0.7602,"y":0.9935,"w":0.02,"h":0.03,"color":"#fff","pivot":[0.5,0.5],"z":47,"grp":"g_mvd81502"},{"id":"leg_f_fang2_3","x":0.7259,"y":0.9951,"w":0.02,"h":0.03,"color":"#fff","pivot":[0.5,0.5],"z":47.5,"grp":"g_mvd81502"},{"id":"leg_b_fang2","x":0.544,"y":0.9762,"w":0.02,"h":0.03,"color":"#fff","pivot":[0.5,0.5],"z":48,"grp":"g_mvd818na"},{"id":"leg_b_fang2_2","x":0.5117,"y":0.9818,"w":0.02,"h":0.03,"color":"#fff","pivot":[0.5,0.5],"z":48.5,"grp":"g_mvd818na"},{"id":"leg_b_fang2_3","x":0.4692,"y":0.9793,"w":0.02,"h":0.03,"color":"#fff","pivot":[0.5,0.5],"z":49,"grp":"g_mvd818na"}],"enemyType":"beast","anims":{"idle":{"n":4,"fps":4,"loop":1,"piv":[0.5,0.95],"rD":[0,-0.008,0,0.008],"keys":{"tail":{"1":{"r":-3,"x":0.3},"3":{"r":3,"x":-0.3}},"leg_b":{"1":{"r":-1.5},"3":{"r":1.5}},"leg_f":{"1":{"r":1.5},"3":{"r":-1.5}},"g_fang1":{"0":{"y":0}},"g_fang1_2":{"0":{"y":0}},"g_fang1_3":{"0":{"y":0}},"arm_b_fang1_2":{"0":{"y":0}},"head_leg_b":{"1":{"r":-1.5},"3":{"r":1.5}},"head_leg_b_2":{"1":{"r":-1.5},"3":{"r":1.5}}}},"attack":{"n":4,"fps":12,"loop":0,"piv":[0.5,0.95],"keys":{"tail":{"1":{"r":-8,"y":-3},"2":{"r":-15,"y":-5}},"leg_b":{"1":{"r":-15},"2":{"r":-26.25}},"leg_f":{"1":{"r":20},"2":{"r":35}},"arm_b":{"1":{"r":25,"y":-5},"2":{"r":40,"y":-9}},"arm_f":{"1":{"r":-5,"x":3.315,"y":-1.664},"2":{"r":-12,"x":7.902,"y":-4.173}},"torso":{"1":{"r":-2},"2":{"r":-4}},"head":{"1":{"r":-5,"x":2},"2":{"r":-12,"x":5}},"snout":{"1":{"r":-5,"x":2.157,"y":0.809},"2":{"r":-12,"x":5.494,"y":1.913}},"fang1":{"1":{"r":-5,"x":2.686,"y":0.78},"2":{"r":-12,"x":6.755,"y":1.764}},"fang2":{"1":{"r":-5,"x":2.679,"y":1.018},"2":{"r":-12,"x":6.772,"y":2.335}},"eye1":{"1":{"r":-5,"x":1.541,"y":0.338},"2":{"r":-12,"x":3.951,"y":0.875}},"eye2":{"1":{"r":-5,"x":1.566,"y":0.906},"2":{"r":-12,"x":4.094,"y":2.23}},"g_fang1":{"0":{"y":0}},"g_fang1_2":{"0":{"y":0}},"g_fang1_3":{"0":{"y":0}},"arm_b_fang1":{"1":{"r":25,"x":11.176,"y":-1.265},"2":{"r":40,"x":16.739,"y":-0.843}},"arm_b_fang1_2":{"0":{"y":0},"1":{"r":25,"x":11.5,"y":-2.625},"2":{"r":40,"x":17.526,"y":-2.907}},"arm_b_fang1_3":{"1":{"r":25,"x":11.679,"y":-3.745},"2":{"r":40,"x":18.038,"y":-4.625}},"head_leg_b":{"1":{"r":-5,"x":0.912,"y":-0.399},"2":{"r":-12,"x":2.338,"y":-0.795}},"head_leg_b_2":{"1":{"r":-5,"x":0.864,"y":0.094},"2":{"r":-12,"x":2.296,"y":0.391}}}},"death":{"n":4,"fps":8,"loop":0,"piv":[0.6289,1],"rR":[0,22,53,90],"rD":[0,-0.0417,-0.1028,-0.1741],"keys":{"tail":{"1":{"r":-5},"2":{"r":-12},"3":{"r":-20}},"leg_b":{"1":{"r":-5},"2":{"r":-3}},"leg_f":{"1":{"r":5},"2":{"r":3}},"g_fang1":{"0":{"y":0}},"g_fang1_2":{"0":{"y":0}},"g_fang1_3":{"0":{"y":0}},"arm_b_fang1_2":{"0":{"y":0}},"head_leg_b":{"1":{"r":-5},"2":{"r":-3}},"head_leg_b_2":{"1":{"r":-5},"2":{"r":-3}}}}}},"mutant_wolf":{"kind":"beast","canvas":{"w":400,"h":400},"layers":[{"id":"tail","x":0.9006,"y":0.6196,"w":0.2175,"h":0.0654,"rot":-15,"color":"#444","pivot":[0.9,0.5],"z":0},{"id":"leg_b","x":0.6684,"y":0.8228,"w":0.0648,"h":0.1779,"rot":-33,"color":"#333","pivot":[0.5,0.1],"z":14},{"id":"leg_f","x":0.3252,"y":0.8291,"w":0.06,"h":0.2,"rot":-30,"color":"#333","pivot":[0.5,0.1],"z":14},{"id":"body","x":0.4866,"y":0.7011,"w":0.4936,"h":0.2146,"color":"#555","pivot":[0.5,0.5],"z":20},{"id":"head","x":0.2027,"y":0.7158,"w":0.1247,"h":0.1382,"color":"#555","pivot":[0.8,0.5],"z":30,"grp":"g_mvd8i3nq","main":1},{"id":"ear","x":0.197,"y":0.639,"w":0.0554,"h":0.0746,"rot":15,"color":"#333","pivot":[0.5,0.8],"z":40,"grp":"g_mvd8i3nq"},{"id":"snout","x":0.0832,"y":0.7276,"w":0.1167,"h":0.0638,"color":"#444","pivot":[0.5,0.5],"z":42,"grp":"g_mvd8i3nq"},{"id":"fang1","x":0.0379,"y":0.7804,"w":0.0185,"h":0.028,"color":"#fff","pivot":[0.5,0.5],"z":46,"grp":"g_mvd8i3nq"},{"id":"fang2","x":0.0638,"y":0.7817,"w":0.0185,"h":0.028,"color":"#fff","pivot":[0.5,0.5],"z":46,"grp":"g_mvd8i3nq"},{"id":"eye","x":0.1226,"y":0.6678,"w":0.0228,"h":0.026,"color":"#ff0000","pivot":[0.5,0.5],"z":50,"grp":"g_mvd8i3nq"},{"id":"leg_f_2","x":0.6959,"y":0.8337,"w":0.06,"h":0.2,"rot":22,"color":"#333","pivot":[0.5,0.1],"z":14.5},{"id":"leg_b_2","x":0.2979,"y":0.8406,"w":0.06,"h":0.2,"rot":46,"color":"#333","pivot":[0.5,0.1],"z":14.5},{"id":"head_ear","x":0.1734,"y":0.6597,"w":0.0554,"h":0.0746,"rot":15,"color":"#333","pivot":[0.5,0.8],"z":26.5,"grp":"g_mvd8i3nq"}],"enemyType":"beast","anims":{"idle":{"n":4,"fps":4,"loop":1,"piv":[0.5,0.95],"rD":[0,-0.008,0,0.008],"keys":{"tail":{"1":{"r":-3,"x":0.3},"3":{"r":3,"x":-0.3}},"leg_b":{"1":{"r":-1.5},"3":{"r":1.5}},"leg_f":{"1":{"r":1.5},"3":{"r":-1.5}},"fang1":{"0":{"x":0}},"leg_f_2":{"1":{"r":1.5},"3":{"r":-1.5}},"leg_b_2":{"1":{"r":-1.5},"3":{"r":1.5}}}},"attack":{"n":4,"fps":12,"loop":0,"piv":[0.5,0.95],"keys":{"tail":{"1":{"r":-8,"y":-3},"2":{"r":-15,"y":-5}},"leg_b":{"1":{"r":-15},"2":{"r":-26.25}},"leg_f":{"1":{"r":20},"2":{"r":35}},"body":{"1":{"r":3,"x":-2},"2":{"r":6,"x":-4}},"head":{"1":{"r":5,"x":-2},"2":{"r":12,"x":-5}},"ear":{"1":{"r":5,"x":-1.328,"y":-0.021},"2":{"r":12,"x":-3.39,"y":0.047}},"snout":{"1":{"r":5,"x":-2.057,"y":-1.047},"2":{"r":12,"x":-4.984,"y":-2.512}},"fang1":{"0":{"x":0},"1":{"r":5,"x":-2.5,"y":-1.462},"2":{"r":12,"x":-5.982,"y":-3.569}},"fang2":{"1":{"r":5,"x":-2.521,"y":-1.236},"2":{"r":12,"x":-6.067,"y":-3.032}},"eye":{"1":{"r":5,"x":-1.551,"y":-0.68},"2":{"r":12,"x":-3.826,"y":-1.561}},"leg_f_2":{"1":{"r":20},"2":{"r":35}},"leg_b_2":{"1":{"r":-15},"2":{"r":-26.25}},"head_ear":{"1":{"r":5,"x":-1.499,"y":-0.235},"2":{"r":12,"x":-3.768,"y":-0.488}}}},"death":{"n":4,"fps":8,"loop":0,"piv":[0.6684,1],"rR":[0,43,106,180],"rD":[0,-0.0974,-0.2398,-0.4062],"keys":{"tail":{"1":{"r":-5},"2":{"r":-12},"3":{"r":-20}},"leg_b":{"1":{"r":-5},"2":{"r":-3}},"leg_f":{"1":{"r":5},"2":{"r":3}},"fang1":{"0":{"x":0}},"leg_f_2":{"1":{"r":5},"2":{"r":3}},"leg_b_2":{"1":{"r":-5},"2":{"r":-3}}}}}},"mutant_rat":{"kind":"beast","canvas":{"w":300,"h":300},"layers":[{"id":"tail","x":0.7126,"y":0.6632,"w":0.3,"h":0.04,"rot":-10,"color":"#666","pivot":[0.1,0.5],"z":0},{"id":"leg_b","x":0.5663,"y":0.8591,"w":0.06,"h":0.15,"color":"#444","pivot":[0.5,0.1],"z":14},{"id":"leg_f","x":0.3002,"y":0.865,"w":0.06,"h":0.15,"color":"#444","pivot":[0.5,0.1],"z":14},{"id":"body","x":0.4734,"y":0.7715,"w":0.45,"h":0.25,"color":"#777","pivot":[0.5,0.5],"z":20},{"id":"head","x":0.2107,"y":0.7011,"w":0.18,"h":0.13,"color":"#777","pivot":[0.8,0.5],"z":30,"grp":"g_mvd8kxqs","main":1},{"id":"ear","x":0.2608,"y":0.6494,"w":0.15,"h":0.1,"color":"#555","pivot":[0.5,0.8],"z":40,"grp":"g_mvd8kxqs"},{"id":"fang1","x":0.081,"y":0.7692,"w":0.02,"h":0.05,"color":"#fff","pivot":[0.5,0.5],"z":46,"grp":"g_mvd8kxqs"},{"id":"fang2","x":0.1084,"y":0.7678,"w":0.02,"h":0.05,"color":"#fff","pivot":[0.5,0.5],"z":46,"grp":"g_mvd8kxqs"},{"id":"eye","x":0.1236,"y":0.6804,"w":0.03,"h":0.03,"color":"#ff0000","pivot":[0.5,0.5],"z":50,"grp":"g_mvd8kxqs"},{"id":"head_ear","x":0.211,"y":0.6647,"w":0.15,"h":0.1,"color":"#555","pivot":[0.5,0.8],"z":15.5,"grp":"g_mvd8kxqs"},{"id":"leg_f_2","x":0.3799,"y":0.883,"w":0.06,"h":0.15,"color":"#444","pivot":[0.5,0.1],"z":14.5},{"id":"leg_b_2","x":0.6557,"y":0.8879,"w":0.0606,"h":0.15,"color":"#444","pivot":[0.5,0.1],"z":14.5}],"enemyType":"beast","anims":{"idle":{"n":4,"fps":4,"loop":1,"piv":[0.5,0.95],"rD":[0,-0.008,0,0.008],"keys":{"tail":{"1":{"r":-3,"x":0.3},"3":{"r":3,"x":-0.3}},"leg_b":{"1":{"r":-1.5},"3":{"r":1.5}},"leg_f":{"1":{"r":1.5},"3":{"r":-1.5}},"leg_f_2":{"1":{"r":1.5},"3":{"r":-1.5}},"leg_b_2":{"1":{"r":-1.5},"3":{"r":1.5}}}},"attack":{"n":4,"fps":12,"loop":0,"piv":[0.5,0.95],"keys":{"tail":{"1":{"r":-8,"y":-3},"2":{"r":-15,"y":-5}},"leg_b":{"1":{"r":-15},"2":{"r":-26.25}},"leg_f":{"1":{"r":20},"2":{"r":35}},"body":{"1":{"r":3,"x":-2},"2":{"r":6,"x":-4}},"head":{"1":{"r":5,"x":-2},"2":{"r":12,"x":-5}},"ear":{"1":{"r":5,"x":-1.568,"y":0.457},"2":{"r":12,"x":-4.034,"y":1.155}},"fang1":{"1":{"r":5,"x":-2.544,"y":-1.156},"2":{"r":12,"x":-6.133,"y":-2.844}},"fang2":{"1":{"r":5,"x":-2.542,"y":-0.917},"2":{"r":12,"x":-6.163,"y":-2.273}},"eye":{"1":{"r":5,"x":-1.787,"y":-0.751},"2":{"r":12,"x":-4.38,"y":-1.765}},"head_ear":{"1":{"r":5,"x":-1.683,"y":0.017},"2":{"r":12,"x":-4.244,"y":0.087}},"leg_f_2":{"1":{"r":20},"2":{"r":35}},"leg_b_2":{"1":{"r":-15},"2":{"r":-26.25}}}},"death":{"n":4,"fps":8,"loop":0,"piv":[0.5663,1],"rR":[0,43,106,180],"rD":[0,-0.0847,-0.2087,-0.3535],"keys":{"tail":{"1":{"r":-5},"2":{"r":-12},"3":{"r":-20}},"leg_b":{"1":{"r":-5},"2":{"r":-3}},"leg_f":{"1":{"r":5},"2":{"r":3}},"leg_f_2":{"1":{"r":5},"2":{"r":3}},"leg_b_2":{"1":{"r":-5},"2":{"r":-3}}}}}},"mutant_squirrel":{"kind":"beast","canvas":{"w":300,"h":300},"layers":[{"id":"tail","x":0.8456,"y":0.5112,"w":0.2739,"h":0.2562,"rot":-47,"color":"#a04020","pivot":[0.9,0.5],"z":0},{"id":"leg_b","x":0.5699,"y":0.6622,"w":0.0265,"h":0.3754,"color":"#603010","pivot":[0.5,0.1],"z":14},{"id":"leg_f","x":0.2624,"y":0.6774,"w":0.034,"h":0.3465,"color":"#603010","pivot":[0.5,0.1],"z":14},{"id":"body","x":0.4298,"y":0.5831,"w":0.4073,"h":0.1308,"color":"#804020","pivot":[0.5,0.5],"z":20},{"id":"head","x":0.1909,"y":0.6749,"w":0.13,"h":0.18,"rot":15,"color":"#804020","pivot":[0.8,0.5],"z":30,"grp":"g_mvd8nvpm","main":1},{"id":"ear","x":0.1661,"y":0.5648,"w":0.06,"h":0.13,"rot":15,"color":"#603010","pivot":[0.5,0.8],"z":40,"grp":"g_mvd8nvpm"},{"id":"fang1","x":0.0988,"y":0.7455,"w":0.015,"h":0.025,"color":"#fff","pivot":[0.5,0.5],"z":46,"grp":"g_mvd8nvpm"},{"id":"fang2","x":0.1148,"y":0.7455,"w":0.015,"h":0.025,"color":"#fff","pivot":[0.5,0.5],"z":46,"grp":"g_mvd8nvpm"},{"id":"eye","x":0.1131,"y":0.6401,"w":0.0361,"h":0.0343,"color":"#ff0000","pivot":[0.5,0.5],"z":50,"grp":"g_mvd8nvpm"},{"id":"leg_b_2","x":0.6148,"y":0.6741,"w":0.0265,"h":0.3754,"color":"#603010","pivot":[0.5,0.1],"z":14.5},{"id":"leg_f_2","x":0.3085,"y":0.6873,"w":0.034,"h":0.3465,"color":"#603010","pivot":[0.5,0.1],"z":14.5},{"id":"head_ear","x":0.141,"y":0.5598,"w":0.0343,"h":0.1068,"rot":15,"color":"#603010","pivot":[0.5,0.8],"z":20,"grp":"g_mvd8nvpm"}],"enemyType":"beast","anims":{"idle":{"n":4,"fps":4,"loop":1,"piv":[0.5,0.95],"rD":[0,-0.008,0,0.008],"keys":{"tail":{"1":{"r":-3,"x":0.3},"3":{"r":3,"x":-0.3}},"leg_b":{"1":{"r":-1.5},"3":{"r":1.5}},"leg_f":{"1":{"r":1.5},"3":{"r":-1.5}},"leg_b_2":{"1":{"r":-1.5},"3":{"r":1.5}},"leg_f_2":{"1":{"r":1.5},"3":{"r":-1.5}}}},"attack":{"n":4,"fps":12,"loop":0,"piv":[0.5,0.95],"keys":{"tail":{"1":{"r":-8,"y":-3},"2":{"r":-15,"y":-5}},"leg_b":{"1":{"r":-15},"2":{"r":-26.25}},"leg_f":{"1":{"r":20},"2":{"r":35}},"body":{"1":{"r":3,"x":-2},"2":{"r":6,"x":-4}},"head":{"1":{"r":5,"x":-2},"2":{"r":12,"x":-5}},"ear":{"1":{"r":5,"x":-1.031,"y":-0.174},"2":{"r":12,"x":-2.657,"y":-0.275}},"fang1":{"1":{"r":5,"x":-2.58,"y":-0.83},"2":{"r":12,"x":-6.267,"y":-2.07}},"fang2":{"1":{"r":5,"x":-2.586,"y":-0.691},"2":{"r":12,"x":-6.302,"y":-1.738}},"eye":{"1":{"r":5,"x":-1.668,"y":-0.665},"2":{"r":12,"x":-4.108,"y":-1.542}},"leg_b_2":{"1":{"r":-15},"2":{"r":-26.25}},"leg_f_2":{"1":{"r":20},"2":{"r":35}},"head_ear":{"1":{"r":5,"x":-0.978,"y":-0.391},"2":{"r":12,"x":-2.498,"y":-0.786}}}},"death":{"n":4,"fps":8,"loop":0,"piv":[0.5699,1],"rR":[0,43,106,180],"rD":[0,-0.1156,-0.2847,-0.4823],"keys":{"tail":{"1":{"r":-5},"2":{"r":-12},"3":{"r":-20}},"leg_b":{"1":{"r":-5},"2":{"r":-3}},"leg_f":{"1":{"r":5},"2":{"r":3}},"leg_b_2":{"1":{"r":-5},"2":{"r":-3}},"leg_f_2":{"1":{"r":5},"2":{"r":3}}}}}},"human_ghoul":{"kind":"human","canvas":{"w":400,"h":500},"layers":[{"id":"right_leg","name":"右腿","x":0.4,"y":0.562,"w":0.13,"h":0.42,"color":"#2a2a2a","pivot":[0.5,0.05],"z":18},{"id":"torso","name":"躯干","x":0.5,"y":0.232,"w":0.3,"h":0.42,"color":"#4a6741","pivot":[0.5,0.1],"z":30},{"id":"head","name":"头","x":0.47,"y":0.182,"w":0.2,"h":0.17,"color":"#c89870","pivot":[0.5,0.92],"z":45},{"id":"face","name":"面部","x":0.43,"y":0.192,"w":0.14,"h":0.13,"color":"#b88860","pivot":[0.5,0.92],"z":48},{"id":"left_leg","name":"左腿","x":0.56,"y":0.582,"w":0.14,"h":0.44,"color":"#3a3a3a","pivot":[0.5,0.05],"z":52},{"id":"back_arm","name":"后臂","x":0.2,"y":0.322,"w":0.11,"h":0.1,"color":"#3d3020","pivot":[0.5,0.5],"z":55},{"id":"front_arm","name":"前臂","x":0.73,"y":0.342,"w":0.4,"h":0.08,"color":"#5a4a35","pivot":[0.95,0.5],"z":62}],"enemyType":"human_melee","colors":{"right_leg":"#3a4a2a","left_leg":"#3a4a2a","torso":"#5a6a4a","head":"#9a9a80","face":"#808068","back_arm":"#4a5a3a","front_arm":"#5a6a4a"},"anims":{"idle":{"n":4,"fps":4,"loop":1,"piv":[0.5,0.95],"rD":[0,-0.008,0,0.008],"keys":{"right_leg":{"1":{"r":1.5},"3":{"r":-1.5}},"left_leg":{"1":{"r":-1.5},"3":{"r":1.5}}}},"attack":{"n":4,"fps":12,"loop":0,"piv":[0.5,0.95],"keys":{"right_leg":{"1":{"r":20},"2":{"r":35}},"torso":{"1":{"r":2},"2":{"r":4}},"head":{"1":{"r":-3},"2":{"r":-8}},"face":{"1":{"r":-3},"2":{"r":-8}},"left_leg":{"1":{"r":-15},"2":{"r":-26.25}},"front_arm":{"1":{"r":-55},"2":{"r":-95,"x":4}}}},"death":{"n":4,"fps":8,"loop":0,"piv":[0.48,1],"rR":[0,22,53,90],"rD":[0,-0.0326,-0.0803,-0.136],"keys":{"right_leg":{"1":{"r":5},"2":{"r":3}},"left_leg":{"1":{"r":-5},"2":{"r":-3}}}}}},"human_raider":{"kind":"human","canvas":{"w":400,"h":500},"layers":[{"id":"right_leg","name":"右腿","x":0.4,"y":0.562,"w":0.13,"h":0.42,"color":"#2a2a2a","pivot":[0.5,0.05],"z":18},{"id":"torso","name":"躯干","x":0.5,"y":0.232,"w":0.3,"h":0.42,"color":"#4a6741","pivot":[0.5,0.1],"z":30},{"id":"head","name":"头","x":0.47,"y":0.182,"w":0.2,"h":0.17,"color":"#c89870","pivot":[0.5,0.92],"z":45},{"id":"face","name":"面部","x":0.43,"y":0.192,"w":0.14,"h":0.13,"color":"#b88860","pivot":[0.5,0.92],"z":48},{"id":"left_leg","name":"左腿","x":0.56,"y":0.582,"w":0.14,"h":0.44,"color":"#3a3a3a","pivot":[0.5,0.05],"z":52},{"id":"back_arm","name":"后臂","x":0.2,"y":0.322,"w":0.11,"h":0.1,"color":"#3d3020","pivot":[0.5,0.5],"z":55},{"id":"front_arm","name":"前臂","x":0.73,"y":0.342,"w":0.4,"h":0.08,"color":"#5a4a35","pivot":[0.95,0.5],"z":62}],"enemyType":"human_gun","colors":{"right_leg":"#3a1a1a","left_leg":"#3a1a1a","torso":"#7a2828","head":"#a07878","face":"#906868","back_arm":"#4a2020","front_arm":"#5a2828"},"anims":{"idle":{"n":4,"fps":4,"loop":1,"piv":[0.5,0.95],"rD":[0,-0.008,0,0.008],"keys":{"right_leg":{"1":{"r":1.5},"3":{"r":-1.5}},"left_leg":{"1":{"r":-1.5},"3":{"r":1.5}}}},"attack":{"n":4,"fps":12,"loop":0,"piv":[0.5,0.95],"keys":{"right_leg":{"1":{"r":2},"2":{"r":3.5}},"torso":{"1":{"r":3},"2":{"r":1.5}},"head":{"1":{"r":2},"2":{"r":1}},"face":{"1":{"r":2},"2":{"r":1}},"left_leg":{"1":{"r":-1},"2":{"r":-1.75}},"back_arm":{"1":{"r":2,"x":-1},"2":{"r":1,"x":-0.5}},"front_arm":{"1":{"r":6,"x":-3},"2":{"r":3,"x":-1.5}}}},"death":{"n":4,"fps":8,"loop":0,"piv":[0.48,1],"rR":[0,22,53,90],"rD":[0,-0.0326,-0.0803,-0.136],"keys":{"right_leg":{"1":{"r":5},"2":{"r":3}},"left_leg":{"1":{"r":-5},"2":{"r":-3}}}}}},"human_raider_vet":{"kind":"human","canvas":{"w":400,"h":500},"layers":[{"id":"right_leg","name":"右腿","x":0.4,"y":0.562,"w":0.13,"h":0.42,"color":"#2a2a2a","pivot":[0.5,0.05],"z":18},{"id":"torso","name":"躯干","x":0.5,"y":0.232,"w":0.3,"h":0.42,"color":"#4a6741","pivot":[0.5,0.1],"z":30},{"id":"head","name":"头","x":0.47,"y":0.182,"w":0.2,"h":0.17,"color":"#c89870","pivot":[0.5,0.92],"z":45},{"id":"face","name":"面部","x":0.43,"y":0.192,"w":0.14,"h":0.13,"color":"#b88860","pivot":[0.5,0.92],"z":48},{"id":"left_leg","name":"左腿","x":0.56,"y":0.582,"w":0.14,"h":0.44,"color":"#3a3a3a","pivot":[0.5,0.05],"z":52},{"id":"back_arm","name":"后臂","x":0.2,"y":0.322,"w":0.11,"h":0.1,"color":"#3d3020","pivot":[0.5,0.5],"z":55},{"id":"front_arm","name":"前臂","x":0.73,"y":0.342,"w":0.4,"h":0.08,"color":"#5a4a35","pivot":[0.95,0.5],"z":62}],"enemyType":"human_gun","colors":{"right_leg":"#2a0a0a","left_leg":"#2a0a0a","torso":"#5a1010","head":"#805858","face":"#704848","back_arm":"#3a0808","front_arm":"#4a1010"},"anims":{"idle":{"n":4,"fps":4,"loop":1,"piv":[0.5,0.95],"rD":[0,-0.008,0,0.008],"keys":{"right_leg":{"1":{"r":1.5},"3":{"r":-1.5}},"left_leg":{"1":{"r":-1.5},"3":{"r":1.5}}}},"attack":{"n":4,"fps":12,"loop":0,"piv":[0.5,0.95],"keys":{"right_leg":{"1":{"r":2},"2":{"r":3.5}},"torso":{"1":{"r":3},"2":{"r":1.5}},"head":{"1":{"r":2},"2":{"r":1}},"face":{"1":{"r":2},"2":{"r":1}},"left_leg":{"1":{"r":-1},"2":{"r":-1.75}},"back_arm":{"1":{"r":2,"x":-1},"2":{"r":1,"x":-0.5}},"front_arm":{"1":{"r":6,"x":-3},"2":{"r":3,"x":-1.5}}}},"death":{"n":4,"fps":8,"loop":0,"piv":[0.48,1],"rR":[0,22,53,90],"rD":[0,-0.0326,-0.0803,-0.136],"keys":{"right_leg":{"1":{"r":5},"2":{"r":3}},"left_leg":{"1":{"r":-5},"2":{"r":-3}}}}}}}};

  function parseLayer(lo) {
    var L = { id: lo.id, x: lo.x, y: lo.y, w: lo.w, h: lo.h,
      rot: lo.rot || 0, pivot: { x: lo.pivot[0], y: lo.pivot[1] }, z: lo.z };
    if (lo.name) L.name = lo.name;
    if (lo.color) L.color = lo.color;
    return L;
  }

  function parseAnim(ae, layerIds) {
    var n = ae.n;
    var a = { frameCount: n, fps: ae.fps, loop: !!ae.loop,
      rootRot: [], rootDy: [],
      rootPivot: { x: ae.piv[0], y: ae.piv[1] }, keys: {} };
    var i, f;
    for (i = 0; i < n; i++) {
      a.rootRot.push((ae.rR && ae.rR[i]) || 0);
      a.rootDy.push((ae.rD && ae.rD[i]) || 0);
    }
    for (i = 0; i < layerIds.length; i++) {
      var lid = layerIds[i];
      var arr = [];
      for (f = 0; f < n; f++) arr.push({ rot: 0, dx: 0, dy: 0 });
      var src = ae.keys && ae.keys[lid];
      if (src) {
        for (var fs in src) {
          var fi = parseInt(fs, 10);
          if (fi < 0 || fi >= n) continue;
          var kd = src[fs];
          arr[fi] = { rot: kd.r || 0, dx: kd.x || 0, dy: kd.y || 0 };
        }
      }
      a.keys[lid] = arr;
    }
    return a;
  }

  var parsedAll = {};
  for (var id in ENEMY_V2.enemies) {
    var e = ENEMY_V2.enemies[id];
    var layerIds = e.layers.map(function(L){ return L.id; });
    var parsed = { kind: e.kind, canvas: { w: e.canvas.w, h: e.canvas.h },
      layers: e.layers.map(parseLayer), anims: {} };
    if (e.colors) parsed.colors = e.colors;
    if (e.enemyType) parsed.enemyType = e.enemyType;
    for (var an in e.anims) parsed.anims[an] = parseAnim(e.anims[an], layerIds);
    parsedAll[id] = parsed;
  }

  var beastIds = ["mutant_squirrel", "mutant_rat", "mutant_wolf", "mutant_bear"];
  var humanIds = ["human_ghoul", "human_raider", "human_raider_vet"];

  if (typeof BEAST_LAYERS !== "undefined") {
    for (var k in BEAST_LAYERS) delete BEAST_LAYERS[k];
    for (var bi = 0; bi < beastIds.length; bi++) {
      var bid = beastIds[bi];
      if (parsedAll[bid]) BEAST_LAYERS[bid] = { canvas: parsedAll[bid].canvas, layers: parsedAll[bid].layers };
    }
  }

  window.BEAST_ANIMS = {};
  for (var bi2 = 0; bi2 < beastIds.length; bi2++) {
    var bid2 = beastIds[bi2];
    if (parsedAll[bid2]) BEAST_ANIMS[bid2] = parsedAll[bid2].anims;
  }

  window.HUMAN_ENEMY_DATA = {};
  for (var hi = 0; hi < humanIds.length; hi++) {
    var hid = humanIds[hi];
    if (parsedAll[hid]) HUMAN_ENEMY_DATA[hid] = parsedAll[hid];
  }

  if (typeof GAME_ANIMS !== "undefined" && GAME_ANIMS.attack_melee && HUMAN_ENEMY_DATA.human_ghoul) {
    var atk = GAME_ANIMS.attack_melee;
    var ghoul = HUMAN_ENEMY_DATA.human_ghoul;
    var newKeys = {};
    for (var gi = 0; gi < ghoul.layers.length; gi++) {
      var glid = ghoul.layers[gi].id;
      var src2 = atk.keys[glid];
      var garr = [];
      for (var gf = 0; gf < atk.frameCount; gf++) {
        var gk = src2 && src2[gf] ? src2[gf] : {};
        garr.push({ rot: gk.rot || 0, dx: gk.dx || 0, dy: gk.dy || 0 });
      }
      newKeys[glid] = garr;
    }
    var newAtk = { frameCount: atk.frameCount, fps: atk.fps, loop: false,
      rootRot: [], rootDy: [],
      rootPivot: { x: 0.5, y: 0.95 }, keys: newKeys };
    for (var nf = 0; nf < atk.frameCount; nf++) {
      newAtk.rootRot.push(0);
      newAtk.rootDy.push(0);
    }
    ghoul.anims.attack = newAtk;
  }

  window._drawEnemyAt = function(ctx, enemyId, ox, oy, s, animName, fi) {
    var def = (typeof BEAST_LAYERS !== "undefined" && BEAST_LAYERS[enemyId]) || (HUMAN_ENEMY_DATA && HUMAN_ENEMY_DATA[enemyId]);
    if (!def) return false;
    var anims = (typeof BEAST_ANIMS !== "undefined" && BEAST_ANIMS[enemyId]) || (HUMAN_ENEMY_DATA && HUMAN_ENEMY_DATA[enemyId] && HUMAN_ENEMY_DATA[enemyId].anims);
    if (!anims) return false;
    var anim = anims[animName] || anims.idle;
    if (!anim) return false;
    fi = ((fi || 0) % anim.frameCount + anim.frameCount) % anim.frameCount;
    var cw = def.canvas.w, ch = def.canvas.h;
    var rRot = (anim.rootRot && anim.rootRot[fi]) || 0;
    var rDy = (anim.rootDy && anim.rootDy[fi]) || 0;
    var rPivot = anim.rootPivot || { x: 0.5, y: 0.95 };
    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(s, s);
    ctx.translate(0, ch * rDy);
    ctx.translate(cw * rPivot.x, ch * rPivot.y);
    ctx.rotate(rRot * Math.PI / 180);
    ctx.translate(-cw * rPivot.x, -ch * rPivot.y);
    var layers = def.layers.slice().sort(function(a, b){ return a.z - b.z; });
    for (var li = 0; li < layers.length; li++) {
      var L = layers[li];
      var k = (anim.keys && anim.keys[L.id] && anim.keys[L.id][fi]) || { rot: 0, dx: 0, dy: 0 };
      var lw = cw * L.w, lh = ch * L.h;
      var cx = cw * L.x + cw * (k.dx || 0) * 0.01;
      var cy = ch * L.y + ch * (k.dy || 0) * 0.01;
      var px = lw * L.pivot.x, py = lh * L.pivot.y;
      var rot = ((L.rot || 0) + (k.rot || 0)) * Math.PI / 180;
      var color = (def.colors && def.colors[L.id]) || L.color || "#888";
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);
      ctx.translate(-px, -py);
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, lw, lh);
      ctx.strokeStyle = "rgba(0,0,0,0.65)";
      ctx.lineWidth = 2;
      ctx.strokeRect(1, 1, lw - 2, lh - 2);
      ctx.restore();
    }
    ctx.restore();
    return true;
  };
})();

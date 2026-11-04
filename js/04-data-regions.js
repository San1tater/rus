
'use strict';

const REGION_AMMO_WEIGHTS = {
  '廢棄工廠':{'破舊':55,'一般':30,'庫存':10,'精品':4,'傳奇':1},
  '廢棄實驗室':{'破舊':40,'一般':32,'庫存':18,'精品':8,'傳奇':2},
  '郊區公路':{'破舊':25,'一般':30,'庫存':25,'精品':15,'傳奇':5},
  '輻射沼澤':{'破舊':12,'一般':22,'庫存':28,'精品':28,'傳奇':10},
  '廢土核心':{'破舊':5,'一般':12,'庫存':22,'精品':35,'傳奇':26},
  '廢棄工廠II':{'破舊':20,'一般':25,'庫存':25,'精品':22,'傳奇':8},
  '廢棄實驗室II':{'破舊':15,'一般':22,'庫存':25,'精品':26,'傳奇':12},
  '郊區公路II':{'破舊':10,'一般':18,'庫存':24,'精品':30,'傳奇':18},
  '輻射沼澤II':{'破舊':5,'一般':12,'庫存':20,'精品':35,'傳奇':28},
  '廢土核心II':{'破舊':2,'一般':8,'庫存':15,'精品':38,'傳奇':37}
};

function rollAmmoRarity(region){
  const w=REGION_AMMO_WEIGHTS[region];
  if(!w)return null;
  const total=Object.values(w).reduce((a,b)=>a+b,0);
  let r=Math.random()*total;
  for(const rar in w){r-=w[rar];if(r<=0)return rar;}
  return '一般';
}

function rollRegionDrop(region){
  const R=REGIONS[region];
  if(!R)return null;
  const lid=pick(R.loot);
  if(SEEDS[lid]){return {id:lid,rarity:rollRarity()};}
  const def=itemDef(lid);
  if(!def)return null;
  if(AMMO[lid]){
    const pool=R.loot.filter(id=>AMMO[id]);
    const rar=rollAmmoRarity(region);
    if(rar){
      const filtered=pool.filter(id=>AMMO[id].rarity===rar);
      if(filtered.length)return{id:pick(filtered),rarity:rar};
    }
    return{id:lid,rarity:AMMO[lid].rarity};
  }
  const rar=hasVariableRarity(lid)?rollRarity():def.rarity;
  return{id:lid,rarity:rar};
}

const REGIONS={
  '廢棄工廠':{name:'廢棄工廠',desc:'生鏽的機械與堆積的貨櫃',enemies:['raider','raider_vet','rocket_gunner'],loot:['wood','wood','wood','metal','metal','screws','cloth','9x18_pst','9x18_ps','9x19_pbp','9x19_pst','12ga_buck','12ga_7mm','20x70_5.6','20x70_6.2','5.45_hp','23x75_shrapnel25','pp19','aks74u','aks74un','mp133','toz106','mp153','pm','pb','6kh2','kukri','rgd5','ssh68','sssh94','balaclava','shemagh','ballglasses','paca','cargopants','workboots','tactboots','ai2','bandage','water','painkiller'],combat:{attack:0.55,stealth:0.22},seal:'seal_factory',sealRate:0.03,enemyHpMult:1.0},
  '廢棄實驗室':{name:'廢棄實驗室',desc:'冷白的燈管與腐蝕的培養槽',enemies:['raider','raider_vet','rocket_gunner'],loot:['electronics','electronics','metal','screws','cloth','gears','9x18_pmm','9x18_psv','9x19_ap63','9x19_pbp','20x70_5.6','20x70_6.2','9x39_fmj','9x39_sp5','9x39_pab9','9x39_spp','9a91','sr3m','vss','asval','pb','mp155','kukri','6kh5','f1','rgd5','vog17','kolpak','6b47','6b47m','sssh94','balaclava','gp7','6b23','6b231','tactboots','salewa','ifak','painkiller','splint'],combat:{attack:0.6,stealth:0.28},seal:'seal_lab',sealRate:0.02,enemyHpMult:1.5,needUnlock:true,unlockHint:'擊敗 鐵匠 解鎖'},
  '郊區公路':{name:'郊區公路',desc:'翻覆的車隊與荒廢的加油站',enemies:['raider','raider_vet','rocket_gunner'],loot:['wood','wood','metal','gears','cloth','screws','5.45_ps','5.45_bt','7.62_hp','7.62_fmj','7.62_ps','9x19_pst','9x19_ap63','12ga_buck','12ga_express','20x70_5.6','20x70_6.2','23x75_shrapnel10','akm','akms','akmn','ak74','ak74n','ak74m','ak105','ak12','pp19','mp443','aps','mp133','mp153','rgd5','f1','rgo','kiver','kolpak','sssh94','shemagh','6b13','6b13m','6b23','cargopants','tactboots','painkiller','tushonka','water','ai2','splint'],combat:{attack:0.62,stealth:0.3},seal:'seal_road',sealRate:0.02,enemyHpMult:2.5,needUnlock:true,unlockHint:'擊敗 醫師 解鎖'},
  '輻射沼澤':{name:'輻射沼澤',desc:'發綠的水窪與扭曲的枯樹',enemies:['raider','raider_vet','rocket_gunner'],loot:['wood','electronics','gears','cloth','metal','7.62x54_hp','7.62x54_fmj','7.62x54_ps','7.62x54_bt','7.62_bp','9x39_spp','9x39_sp6','12ga_express','12ga_magnum','20x70_5.6','20x70_6.2','23x75_shrapnel10','23x75_shrapnel25','sv98','svd','ak103','ak104','vss','saiga12','asval','mp155','ks23','f1','rgo','kiver','6b23','6b231','salewa','ifak','surv12','tushonka','splint'],combat:{attack:0.7,stealth:0.35},seal:'seal_swamp',sealRate:0.015,enemyHpMult:4.0,needUnlock:true,unlockHint:'擊敗 實驗室女王 · 白蝕 解鎖'},
  '廢土核心':{name:'廢土核心',desc:'鋼鐵巨構與永不熄滅的火光',enemies:['raider','raider_vet','rocket_gunner'],loot:['electronics','gears','metal','cloth','7.62x54_bs','7.62_ma','5.45_bp','5.45_7n39','7.62_bp','12ga_magnum','20x70_5.6','20x70_6.2','12.7_ps12','9x18_sp7','9x19_cci','9x19_pso','9x39_sp6','9x39_spp','23x75_barrikada','rpd','rpdn','rpk16','svd','sv98','vss','asval','saiga12','ks23','mp155','vog25','f1','rgo','maska','zhuk3','6b232','6b45','redutm','sssh94','haix','salewa','ifak','surv12'],combat:{attack:0.75,stealth:0.4},seal:'seal_core',sealRate:0.008,enemyHpMult:6.0,needUnlock:true,unlockHint:'擊敗 沼澤九頭 · 腐母 解鎖'},
};

REGIONS['廢棄工廠II']={name:'廢棄工廠 II',desc:'二級入口：更深處的機械墓場',enemies:['raider','raider_vet','rocket_gunner'],loot:['electronics','gears','metal','cloth','5.45_bt','5.45_bp','7.62_ps','7.62_bp','7.62x54_ps','7.62x54_bt','9x39_pab9','9x39_spp','ak74m','ak103','rpk16','vss','asval','saiga12','ks23','6b47','kiver','6b23','6b231','6b232','redutm','salewa','ifak','surv12','vog25','f1','rgo'],combat:{attack:0.65,stealth:0.28},seal:'seal_factory_ii',sealRate:0.02,enemyHpMult:4.0,needUnlock:true,unlockHint:'擊敗 核心終焉 · OMEGA 解鎖',spawnWeights:{1:0.40,2:0.35,3:0.20,4:0.05},maxEnemies:4};
REGIONS['廢棄實驗室II']={name:'廢棄實驗室 II',desc:'二級入口：被封鎖的深層實驗區',enemies:['raider','raider_vet','rocket_gunner'],loot:['electronics','gears','metal','cloth','5.45_bp','5.45_7n39','7.62_bp','7.62_ma','7.62x54_bt','7.62x54_bs','9x39_spp','9x39_sp6','12ga_magnum','rpk16','svd','vss','asval','6b232','zhuk3','altyn','zsh12m','maska','6b45','redutm','surv12','ifak','f1','rgo','vog25'],combat:{attack:0.68,stealth:0.30},seal:'seal_lab_ii',sealRate:0.015,enemyHpMult:5.0,needUnlock:true,unlockHint:'擊敗 工廠之王 · 鐵手 II 解鎖',spawnWeights:{1:0.35,2:0.35,3:0.22,4:0.08},maxEnemies:4};
REGIONS['郊區公路II']={name:'郊區公路 II',desc:'二級入口：深入被封鎖的公路腹地',enemies:['raider','raider_vet','rocket_gunner'],loot:['electronics','metal','gears','cloth','5.45_7n39','7.62_ma','7.62x54_bs','9x39_sp6','12ga_magnum','12.7_ps12b','rpd','rpk16','svd','pkm','pkp','ash12','6b43','defender2','zhuk6a','6b45','altyn','zsh12m','maska','surv12','f1','rgo','rgn'],combat:{attack:0.70,stealth:0.32},seal:'seal_road_ii',sealRate:0.012,enemyHpMult:6.0,needUnlock:true,unlockHint:'擊敗 實驗室女王 · 白蝕 II 解鎖',spawnWeights:{1:0.30,2:0.35,3:0.25,4:0.10},maxEnemies:4};
REGIONS['輻射沼澤II']={name:'輻射沼澤 II',desc:'二級入口：腐化最深的沼心',enemies:['raider','raider_vet','rocket_gunner'],loot:['electronics','gears','metal','cloth','7.62x54_bs','7.62_ma','9x39_sp6','12ga_magnum','12.7_ps12b','23x75_barrikada','rpd','pkm','pkp','ash12','svd','sv98','6b43','defender2','zhuk6a','6b45','redutm','altyn','zsh12m','maska','surv12','rgn'],combat:{attack:0.72,stealth:0.35},seal:'seal_swamp_ii',sealRate:0.010,enemyHpMult:8.0,needUnlock:true,unlockHint:'擊敗 公路暴君 · 鐵鎚 II 解鎖',spawnWeights:{1:0.25,2:0.30,3:0.30,4:0.15},maxEnemies:5};
REGIONS['廢土核心II']={name:'廢土核心 II',desc:'二級入口：接近終焉的鋼鐵深淵',enemies:['raider','raider_vet','rocket_gunner'],loot:['electronics','gears','metal','cloth','7.62x54_bs','7.62_ma','5.45_7n39','9x39_sp6','12.7_ps12b','23x75_barrikada','pkm','pkp','ash12','svd','rpd','rpdn','6b43','defender2','zhuk6a','altyn','zsh12m','maska','6b45','redutm','belleville','surv12','rgn'],combat:{attack:0.75,stealth:0.38},seal:'seal_core_ii',sealRate:0.008,enemyHpMult:10.0,needUnlock:true,unlockHint:'擊敗 沼澤九頭 · 腐母 II 解鎖',spawnWeights:{1:0.20,2:0.30,3:0.30,4:0.15,5:0.05},maxEnemies:5};

const ROUTES={
  '廢棄工廠':[{name:'東線',nodes:['東門','休息室一樓','休息室二樓','回廊','檢修通道','儲油罐','車床','經理室']},{name:'西線',nodes:['西側卸貨區','倉庫','裝卸平台','車間','鍋爐房','經理室']},{name:'地下線',nodes:['地下入口','排水管道','維修隧道','動力室','經理室']}],
  '廢棄實驗室':[{name:'主樓',nodes:['正門大廳','接待處','電梯井','B1 實驗區','樣本室','主控室']},{name:'側翼',nodes:['側門','更衣室','消毒通道','培養槽區','觀察室','主控室']},{name:'地下',nodes:['貨梯','儲藏間','冷凍庫','動物房','主控室']}],
  '郊區公路':[{name:'主幹道',nodes:['收費站','翻覆車隊','加油站','休息區','隧道口','集結點']},{name:'繞行路',nodes:['小路','廢棄農舍','涵洞','山脊','集結點']},{name:'鐵軌',nodes:['鐵道口','信號塔','貨運列車','集結點']}],
  '輻射沼澤':[{name:'淺灘',nodes:['灘頭','枯樹林','泥沼','廢船','祭壇','沼心']},{name:'深沼',nodes:['腐水區','孢子林','沉沒教堂','沼心']}],
  '廢土核心':[{name:'外環',nodes:['外圍防線','哨塔','斷裂高架','中央熔爐','核心']},{name:'內環',nodes:['通風井','管道區','反應爐','核心']}],
};
for(const _rk of ['廢棄工廠','廢棄實驗室','郊區公路','輻射沼澤','廢土核心']){if(ROUTES[_rk])ROUTES[_rk+'II']=ROUTES[_rk];}

(function(){
  const _SEED_DROPS = {
    '廢棄工廠': ['seed_potato','seed_carrot'],
    '廢棄實驗室': ['seed_cabbage','seed_wheat'],
    '郊區公路': ['seed_potato','seed_beet','seed_wheat'],
    '輻射沼澤': ['seed_beet','seed_cabbage'],
    '廢土核心': ['seed_wheat','seed_beet'],
    '廢棄工廠II': ['seed_potato','seed_carrot','seed_cabbage'],
    '廢棄實驗室II': ['seed_cabbage','seed_wheat','seed_beet'],
    '郊區公路II': ['seed_potato','seed_beet','seed_wheat'],
    '輻射沼澤II': ['seed_beet','seed_cabbage','seed_wheat'],
    '廢土核心II': ['seed_wheat','seed_beet','seed_cabbage']
  };
  for(const _r in _SEED_DROPS){
    if(REGIONS[_r] && Array.isArray(REGIONS[_r].loot)){
      for(const _s of _SEED_DROPS[_r]){
        REGIONS[_r].loot.push(_s);
      }
    }
  }
})();

/* v17.5 hotfix batch applied */
/* ============================================================
   23-garden-raid.js — 後院防禦戰（含離線模擬）
   由舊 08-garden-core.js（_gardenRaidShowBattle）與 08b-garden-raid.js（防禦戰部分）重構。
   常量（GARDEN_RAID_INTERVAL_MS / GARDEN_RAID_ENEMY_COUNT_* 等）已在 07-data-garden.js，
   本文件不重複定義。
   ============================================================ */

/* ===== 防禦戰狀態 ===== */
function _gardenRaidInit(){
  const g = _gardenMerchantInit();
  if(!g.raid || typeof g.raid !== 'object') g.raid = { lastAt: 0, count: 0, wins: 0, loses: 0 };
  return g.raid;
}

function _gardenRaidCheck(){
  const raid = _gardenRaidInit();
  const now = Date.now();
  if(raid.lastAt === 0){ raid.lastAt = now; save(); return; }
  if(now - raid.lastAt < GARDEN_RAID_INTERVAL_MS) return;
  raid.lastAt = now;
  raid.count++;
  save();
  const guards = _gardenRaidCollectGuards();
  if(!guards.length){ console.log('[raid] 無守衛參戰，跳過'); return; }
  _gardenRaidStart(guards);
}

/* ===== 離線模擬 ===== */
function _gardenRaidSimulateOffline(guards, region, enemies){
  const guardUnits = [];
  for(const g of guards){
    const s = g.srv;
    const maxHp = servantMaxHp(s);
    let armor = 0, armorLevel = 0;
    const eqCfg = (g.towerCfg && g.towerCfg.eq) || {};
    const eqRar = (g.towerCfg && g.towerCfg.eqRarity) || {};
    for(const slot of ['head','top']){
      const id = eqCfg[slot];
      if(!id) continue;
      const rar = eqRar[slot] || '一般';
      armor += equipArmorValue(id, rar);
      const d = ARMOR[id];
      if(d && d.level) armorLevel = Math.max(armorLevel, d.level);
    }
    const scopeBonus = (g.weaponDef && g.weaponDef.scopeBonus) || 0;
    const hitRate = servantHitRate(s, '點射', scopeBonus);
    const ammoId = g.ammoId;
    const ammoRarity = g.ammoRarity || '一般';
    const critRate = servantCritRate(g.weaponRarity, ammoRarity);
    const critMult = servantCritMult(g.weaponRarity, ammoRarity);
    const magCap = (g.weaponDef && g.weaponDef.mag) || 30;
    const stock = ammoId ? invCount(ammoId, ammoRarity) : 0;
    const ms = (g.towerCfg && g.towerCfg.maxShots) || 'inf';
    let budget;
    if(ms === 'skip') budget = 0;
    else if(ms === 'mag') budget = Math.min(stock, magCap);
    else budget = stock;
    guardUnits.push({
      srv: s, name: servantLabel(s) + ' Lv.' + s.lv,
      rpm: (g.weaponDef && g.weaponDef.rpm) || 600,
      hp: maxHp, maxHp: maxHp,
      armor: armor, maxArmor: armor, armorLevel: armorLevel,
      alive: true, isGuard: true,
      weaponDef: g.weaponDef, weaponRarity: g.weaponRarity,
      towerIdx: g.towerIdx, towerCfg: g.towerCfg,
      ammoId: ammoId, ammoRarity: ammoRarity, ammoStock: stock,
      ammoBudget: budget, ammoUsed: 0, magCap: magCap,
      /* rev-fix-raid-offline-guard-armor: 與步戰一致 — 記錄裝備以計算部位護甲 */
      equipped: { head: (eqCfg && eqCfg.head) || null, top: (eqCfg && eqCfg.top) || null },
      equippedRarity: { head: (eqRar && eqRar.head) || '一般', top: (eqRar && eqRar.top) || '一般' },
      hitRate: hitRate, critRate: critRate, critMult: critMult,
      dmgDone: 0
    });
  }
  const enemyUnits = enemies.map(function(e){
    const _eid = e.eid || e.id;
    const _ename = e.name || ((typeof ENEMIES !== 'undefined' && ENEMIES[_eid]) ? ENEMIES[_eid].name : _eid);
    const _dmg = e.dmg != null ? e.dmg : (e.primaryWeapon ? (e.primaryWeapon.dmg || 10) : 10);
    const _pen = e.pen != null ? e.pen : (e.primaryWeapon ? (e.primaryWeapon.penMM || 0) : 0);
    return {
      id: _eid, name: _ename,
      dmg: _dmg, pen: _pen, armorLevel: e.armorLevel || 1,
      /* rev-fix-raid-offline-enemy-armor: 與步戰一致 — 記錄裝備以計算部位護甲 */
      helmet: e.helmet || null,
      body: e.body || null,
      helmetRarity: e.helmetRarity || '一般',
      bodyRarity: e.bodyRarity || '一般',
      rarity: e.rarity || '一般',
      ammoId: (e.primaryWeapon && e.primaryWeapon.ammoId) || null,
      rpm: 300, hp: e.maxHp, maxHp: e.maxHp,
      armor: e.armor || 0, maxArmor: e.maxArmor || 0, alive: true, isGuard: false
    };
  });
  const MODE_CAP = { '點射': 1, '短點射': 3, '長點射': 7, '掃射': 99, '近戰': 1, '投擲': 1 };
  function pickFireMode(g, aliveE){
    const def = g.weaponDef;
    if(!def || !def.modes) return '點射';
    if(typeof isSemiAutoOnly === 'function' && isSemiAutoOnly(def)) return '點射';
    if(aliveE >= 3 && def.modes.indexOf('掃射') !== -1) return '掃射';
    if(aliveE >= 2 && def.modes.indexOf('短點射') !== -1) return '短點射';
    return '點射';
  }
  function guardsAlive(){ return guardUnits.some(function(u){ return u.alive; }); }
  function enemiesAlive(){ return enemyUnits.some(function(u){ return u.alive; }); }
  function executeShot(fromU, toU, isEnemy){
    if(!toU.alive) return;
    const hit = Math.random() * 100 < (fromU.isGuard ? fromU.hitRate : 75);
    if(!hit) return;
    /* rev-fix-attack-unify: 統一結算 */
    let atkInfo;
    if(fromU.isGuard){
      atkInfo = {
        ammoId: fromU.ammoId,
        ammoRarity: fromU.ammoRarity,
        weaponRarity: fromU.weaponRarity,
        penMM: (fromU.ammoId && AMMO[fromU.ammoId]) ? (AMMO[fromU.ammoId].penMM || 0) : (fromU.weaponDef.penMM || 0),
        fallbackDmg: 20
      };
    } else {
      atkInfo = {
        ammoId: fromU.ammoId,
        ammoRarity: (fromU.ammoId && AMMO[fromU.ammoId]) ? AMMO[fromU.ammoId].rarity : '一般',
        weaponRarity: fromU.rarity || '一般',
        penMM: fromU.pen || 0,
        fallbackDmg: fromU.dmg || 10
      };
    }
    const r = _resolveSingleAttack(atkInfo, toU);
    toU.hp = Math.max(0, toU.hp - r.hpLost);
    toU.armor = Math.max(0, (toU.armor || 0) - r.armorLost);
    const shown = r.totalShown;
    fromU.dmgDone = (fromU.dmgDone || 0) + shown;
    if(fromU.isGuard && fromU.srv) servantAddExp(fromU.srv, 2);
    if(fromU.isGuard && fromU.ammoId && shown === 0) fromU._stopFire = true;
    if(toU.hp <= 0) toU.alive = false;
  }
  let round = 0;
  const maxRounds = 30;
  while(guardsAlive() && enemiesAlive() && round < maxRounds){
    round++;
    for(const g of guardUnits){
      if(!g.alive) continue;
      if(!enemiesAlive()) break;
      if(g.ammoId && (g.ammoBudget - g.ammoUsed) <= 0) continue;
      const aliveE = enemyUnits.filter(function(e){ return e.alive; }).length;
      const mode = pickFireMode(g, aliveE);
      let shots = MODE_CAP[mode] || 1;
      shots = Math.min(shots, g.magCap);
      if(g.ammoId) shots = Math.min(shots, g.ammoBudget - g.ammoUsed);
      for(let i = 0; i < shots; i++){
        const aliveTargets = enemyUnits.filter(function(e){ return e.alive; });
        if(!aliveTargets.length) break;
        if(g.ammoId){ if(g.ammoUsed >= g.ammoBudget) break; g.ammoUsed++; }
        const target = aliveTargets[Math.floor(Math.random() * aliveTargets.length)];
        executeShot(g, target, false);
      }
    }
    if(!enemiesAlive()) break;
    if(!guardsAlive()) break;
    for(const e of enemyUnits){
      if(!e.alive) continue;
      const aliveTargets = guardUnits.filter(function(g){ return g.alive; });
      if(!aliveTargets.length) break;
      const target = aliveTargets[Math.floor(Math.random() * aliveTargets.length)];
      executeShot(e, target, true);
    }
  }
  return { guards: guardUnits, enemies: enemyUnits, win: !enemiesAlive() && guardsAlive(), rounds: round };
}

function _offlineGardenRaidSettle(baseTime, now){
  const raid = _gardenRaidInit();
  if(raid.lastAt === 0){ raid.lastAt = baseTime; }
  let curLast = raid.lastAt;
  if(curLast < baseTime) curLast = baseTime;
  if(now - curLast < GARDEN_RAID_INTERVAL_MS) return 0;
  let count = 0;
  let maxIter = 24;
  while(now - curLast >= GARDEN_RAID_INTERVAL_MS && maxIter > 0){
    maxIter--;
    curLast += GARDEN_RAID_INTERVAL_MS;
    count++;
  }
  if(count === 0) return 0;
  raid.lastAt = curLast;
  raid.count += count;
  for(let i = 0; i < count; i++){
    const guards = _gardenRaidCollectGuards();
    if(!guards.length) continue;
    const gen = _gardenRaidGenEnemies();
    if(!gen.enemies.length) continue;
    const sim = _gardenRaidSimulateOffline(guards, gen.region, gen.enemies);
    try {
      _gardenRaidApplyResult(sim, gen.region);
    } catch(e){
      console.warn('[offline raid]', e);
    }
  }
  return count;
}

/* ===== 收集守衛 / 生成敵人 ===== */
function _gardenRaidCollectGuards(){
  const plots = _gardenGetPlots();
  const servants = state.servants || [];
  const result = [];
  for(let i = 0; i < 20; i++){
    const p = plots[i];
    if(!p || p.type !== 'tower' || p.broken) continue;
    const cfg = _gardenTowerInit(p);
    _gardenTowerNormalizeEq(cfg);
    const weaponId = cfg.eq.primary || cfg.eq.secondary;
    const weaponRarity = cfg.eqRarity.primary || cfg.eqRarity.secondary || '一般';
    if(!weaponId) continue;
    const wDef = itemDef(weaponId);
    if(!wDef) continue;
    const resolved = _gardenTowerResolveAmmo(cfg, wDef);
    if(!resolved) continue;
    for(const s of servants){
      if(s.type !== 'guard') continue;
      if(!s.assignedPlots || s.assignedPlots.indexOf(i) === -1) continue;
      if((s.stamina || 0) <= 0) continue;
      result.push({
        srv: s,
        towerIdx: i,
        towerCfg: cfg,
        weaponId: weaponId,
        weaponRarity: weaponRarity,
        weaponDef: wDef,
        ammoId: resolved.id,
        ammoRarity: resolved.rarity
      });
    }
  }
  return result;
}

/* rev-fix-raid-tier: 按 spawnWeights 随机 tier */
function _rollTierByWeights(weights){
  if(!weights || typeof weights !== 'object') return 1;
  const keys = Object.keys(weights);
  if(!keys.length) return 1;
  let total = 0;
  for(const k of keys) total += weights[k];
  let r = Math.random() * total;
  for(const k of keys){
    r -= weights[k];
    if(r <= 0) return parseInt(k, 10);
  }
  return parseInt(keys[keys.length - 1], 10);
}

function _gardenRaidGenEnemies(){
  const regions = (typeof getActiveRegions === 'function') ? getActiveRegions() : ['廢棄工廠'];
  const region = (state.activeRegion && regions.indexOf(state.activeRegion) !== -1) ? state.activeRegion : regions[0];
  const R = REGIONS[region];
  if(!R) return { enemies: [], region: region };
  const lv = (state.player && state.player.level) || 1;
  let count = 2 + Math.floor(lv / 5);
  count = Math.min(8, count);
  const enemies = [];
  for(let i = 0; i < count; i++){
    const eid = pick(R.enemies);
    /* rev-fix-raid-tier: 按 spawnWeights 随机 tier（无则默认 1） */
    const _t = _rollTierByWeights(R.spawnWeights);
    const inst = (typeof generateEnemyInstance === 'function') ? generateEnemyInstance(eid, _t) : null;
    if(!inst) continue;
    enemies.push(inst);
  }
  return { enemies: enemies, region: region };
}

/* ===== 清理殘留 ===== */
function _raidCleanupAll(){
  const sels = ['.raid-overlay','.raid-guard','.raid-enemy','.raid-enemy-zone','.raid-side','.raid-unit','.raid-sprite','.raid-proj','.raid-dmg','.raid-float','.raid-banner-win','.raid-banner-lose','.raid-unit-sprite','.raid-unit-hpwrap','.raid-unit-name','.raid-hp-wrap','.raid-name','.raid-hp'];
  for(const sel of sels){
    const all = document.querySelectorAll(sel);
    for(let i = all.length - 1; i >= 0; i--){ try{ all[i].remove(); }catch(e){} }
  }
}

/* ===== 塔彈藥解析（供防禦戰使用） ===== */
function _gardenTowerResolveAmmo(cfg, wDef){
  if(!wDef || !wDef.cal) return null;
  const cal = wDef.cal;
  const setAmmo = cfg.ammoId;
  const setRarity = setAmmo ? ((AMMO[setAmmo] && AMMO[setAmmo].rarity) || '一般') : null;
  if(setAmmo){
    const c = invCount(setAmmo, setRarity);
    if(c > 0) return { id: setAmmo, rarity: setRarity, count: c };
  }
  const list = [];
  for(const k in state.inventory){
    const p = k.split('@');
    const id = p[0], rar = p[1];
    const d = AMMO[id];
    if(!d || d.cal !== cal) continue;
    if(setRarity){
      const idx = RARITY_ORDER.indexOf(rar);
      const sIdx = RARITY_ORDER.indexOf(setRarity);
      if(idx < 0 || sIdx < 0) continue;
      if(idx >= sIdx) continue;
    }
    const cnt = state.inventory[k];
    if(cnt <= 0) continue;
    list.push({ id: id, rarity: rar, count: cnt });
  }
  if(!list.length) return null;
  list.sort(function(a, b){
    const ra = sortByRarityDesc(b, a);
    if(ra !== 0) return ra;
    return b.count - a.count;
  });
  return list[0];
}

/* ===== 守衛槍口世界座標 ===== */
function _getRaidMuzzleWorld(u, scale){
  if(!u || !u.equipped || !u.weaponSlot) return null;
  const wpId = u.equipped[u.weaponSlot];
  if(!wpId) return null;
  /* 委託通用槍口函數，跟隨 u.animName / u.animFrame */
  const mz = window.getCharWeaponMuzzleLocal(u.weaponSlot, wpId, u.animName, u.animFrame);
  if(!mz) return null;
  return {
    x: u.x + scale * (mz.x - 200),
    y: u.y + scale * (mz.y - 515)
  };
}

/* ===== 啟動防禦戰 ===== */
function _gardenRaidStart(guards){
  const gen = _gardenRaidGenEnemies();
  if(!gen.enemies.length) return;
  _gardenRaidShowBattle(guards, gen.enemies, gen.region);
}

/* ===== 套用結果 ===== */
function _gardenRaidApplyResult(sim, region){
  for(const g of sim.guards){
    if(!g.ammoId) continue;
    const used = Math.min(g.ammoUsed, g.ammoBudget);
    if(used > 0) invRemove(g.ammoId, g.ammoRarity, used);
  }
  /* rev-fix-guard-injured-keep: 守卫死亡不删除，走重伤路径 */
  const died = sim.guards.filter(function(g){ return !g.alive; });
  for(const g of died){
    if(g.srv && !g.srv.injuredUntil){
      g.srv.hp = 0;
      g.srv.injuredUntil = Date.now() + 4 * 3600 * 1000;
      g.srv._injuredDown = true;
    }
  }
  if(!sim.win){
    if(sim.brokenPlots === undefined){
    const plots = _gardenGetPlots();
    let n = 1;
    if(sim.guards.filter(function(g){ return g.alive; }).length === 0) n = 3;
    const candidates = [];
    for(let i = 0; i < 20; i++){
      const p = plots[i];
      if(!p || !p.type) continue;
      if(p.broken) continue;
      candidates.push(i);
    }
    const broken = [];
    for(let k = 0; k < n && candidates.length; k++){
      const pos = Math.floor(Math.random() * candidates.length);
      const idx = candidates.splice(pos, 1)[0];
      const p = plots[idx];
      p.broken = true;
      if(p.crop) p.crop = null;
      broken.push(idx);
    }
    sim.brokenPlots = broken;
    }
    const storage = _gardenStorageInit();
    const stolen = [];
    const cropKeys = [];
    for(const k in storage){
      if(storage[k] <= 0) continue;
      const id = k.split('@')[0];
      if(CROPS[id]) cropKeys.push(k);
    }
    const stealN = Math.min(3, cropKeys.length);
    for(let k = 0; k < stealN; k++){
      const pos = Math.floor(Math.random() * cropKeys.length);
      const key = cropKeys.splice(pos, 1)[0];
      const parts = key.split('@');
      const amount = Math.max(1, Math.floor(storage[key] * 0.3));
      storage[key] -= amount;
      if(storage[key] <= 0) delete storage[key];
      stolen.push({ id: parts[0], rarity: parts[1], count: amount });
    }
    sim.stolen = stolen;
    const raid = _gardenRaidInit();
    raid.loses++;
  } else {
    const raid = _gardenRaidInit();
    raid.wins++;
    const pool = ['wood','metal','screws','cloth','gears','electronics'];
    const loot = [];
    const n = 5 + Math.floor(Math.random() * 6);
    for(let i = 0; i < n; i++){
      const id = pool[Math.floor(Math.random() * pool.length)];
      const rar = rollRarity();
      invAdd(id, rar, 1);
      loot.push({ id: id, rarity: rar, count: 1 });
    }
    sim.loot = loot;
  }
  _gardenRaidLogBattle(sim, region);
  save();
  renderGardenGrid();
  renderGardenContent();
}

/* ===== 戰鬥日誌記錄 ===== */
function _gardenRaidLogBattle(sim, region){
  const g = _gardenMerchantInit();
  if(!Array.isArray(g.battleLog)) g.battleLog = [];
  const ammoMap = {};
  const guardAmmoList = [];
  for(const gd of sim.guards){
    const used = gd.ammoId ? Math.min(gd.ammoUsed, gd.ammoBudget) : 0;
    guardAmmoList.push({
      name: gd.name,
      coord: (typeof plotCoordName === 'function' && gd.towerIdx != null) ? plotCoordName(gd.towerIdx) : '',
      alive: !!gd.alive,
      ammoName: gd.ammoId ? (AMMO[gd.ammoId] ? AMMO[gd.ammoId].name : gd.ammoId) : '無彈藥',
      ammoRarity: gd.ammoRarity || '一般',
      count: used,
      dmg: gd.dmgDone || 0
    });
    if(used > 0){
      const key = gd.ammoId + '@' + gd.ammoRarity;
      if(!ammoMap[key]) ammoMap[key] = { id: gd.ammoId, rarity: gd.ammoRarity, name: (AMMO[gd.ammoId] ? AMMO[gd.ammoId].name : gd.ammoId), count: 0 };
      ammoMap[key].count += used;
    }
  }
  let totalDmg = 0;
  for(const gd of sim.guards) totalDmg += (gd.dmgDone || 0);
  const _summary = {
    rounds: sim.rounds,
    /* rev-fix-raid-initial-count: 用初始敵人數，避免戰鬥中 splice 後為 0 */
    enemyCount: sim.initialEnemyCount || sim.enemies.length,
    guardTotal: sim.guards.length,
    guardAlive: sim.guards.filter(function(x){ return x.alive; }).length,
    ammoUsed: Object.keys(ammoMap).reduce(function(s, k){ return s + ammoMap[k].count; }, 0),
    ammoDetail: Object.keys(ammoMap).map(function(k){ return ammoMap[k]; }),
    guardAmmoList: guardAmmoList,
    totalDmg: totalDmg,
    broken: sim.brokenPlots ? sim.brokenPlots.map(function(i){ return plotCoordName(i); }) : [],
    stolen: sim.stolen ? sim.stolen.map(function(x){ return { id: x.id, rarity: x.rarity || '一般', name: (CROPS[x.id] ? CROPS[x.id].name : x.id), count: x.count }; }) : [],
    loot: sim.loot ? sim.loot.map(function(x){ const d = itemDef(x.id); return { id: x.id, rarity: x.rarity || '一般', name: d ? d.name : x.id, count: x.count }; }) : []
  };
  /* rev-fix-raid-battleLog: 有活動 entry 則更新，否則新建（離線模擬） */
  var _entry = window._raidActiveBattleEntry;
  if(!_entry){
    _entry = { t: Date.now(), win: sim.win, region: region, kills: [], status: [], summary: null };
    if(!Array.isArray(g.battleLog)) g.battleLog = [];
    g.battleLog.push(_entry);
    if(g.battleLog.length > 30) g.battleLog.splice(0, g.battleLog.length - 30);
  }
  _entry.win = sim.win;
  _entry.summary = _summary;
  window._raidActiveBattleEntry = null;
}

/* ===== 戰鬥中狀態（僅標記，不再收集實時日誌） ===== */
window._raidLiveActive = false;
function _esc(s){ return String(s).replace(/[&<>]/g, function(c){ return c === '&' ? '&amp;' : (c === '<' ? '&lt;' : '&gt;'); }); }
const _RARITY_COLOR = { '破舊':'#b87333', '一般':'#e0e0e0', '庫存':'#4caf50', '精品':'#2196f3', '傳奇':'#ffb300', '具名':'#a45ede' };

function _mergeLoot(items){
  const map = {};
  const order = [];
  for(const it of items){
    const k = (it.id || it.name) + '@' + (it.rarity || '一般');
    if(!map[k]){
      map[k] = { id: it.id, name: it.name, rarity: it.rarity || '一般', count: 0 };
      order.push(k);
    }
    map[k].count += it.count;
  }
  return order.map(function(k){ return map[k]; });
}
function _lootHtml(items, color){
  if(!items || !items.length) return '';
  const merged = _mergeLoot(items);
  return merged.map(function(it){
    const _c = _RARITY_COLOR[it.rarity] || color || '#ddd';
    return '<span style="color:' + _c + '">' + it.name + '×' + it.count + '</span>';
  }).join(' ');
}

/* rev-fix-raid-log-unify: _gardenUpdateBattleCol 移除 */

/* ===== 防禦戰主演出 ===== */
function _gardenRaidShowBattle(guards, enemies, region){
  if(window._raidLiveActive){ console.warn('[raid] raid 已在進行中，忽略重複觸發'); return; }
  /* rev-fix-raid-initial-count: 開戰時記錄敵人總數，供總結用 */
  const _initialEnemyCount = (enemies && enemies.length) || 0;
  const page = document.getElementById('garden-page');
  if(!page) return;
  const wrap = page.querySelector('.gp-grid-wrap');
  const grid = page.querySelector('#gp-grid');
  if(!wrap || !grid) return;
  _raidCleanupAll();
  wrap.style.position = 'relative';
  /* rev-fix-raid-log-unify: 不再初始化 _raidLiveLog */
  window._raidLiveActive = true;
  window._raidSurrenderWorkers = false;
  if(typeof _gardenUpdateBattleCol === 'function') setTimeout(_gardenUpdateBattleCol, 50);
  try {
    const _txtNodes = [];
    const _walk = function(node){
      if(node.nodeType === 3){
        if(node.textContent && /\[object /.test(node.textContent)) _txtNodes.push(node);
      } else if(node.nodeType === 1){
        if(node.children.length === 0 && node.textContent && /^\s*\[object /.test(node.textContent)){
          node.textContent = '';
        } else {
          for(let i = 0; i < node.childNodes.length; i++) _walk(node.childNodes[i]);
        }
      }
    };
    _walk(document.body);
    for(const n of _txtNodes){ try{ n.textContent = ''; }catch(e){} }
  } catch(e){}
  _gardenActiveTab = 'log';
  if(typeof renderGardenTabs === 'function') renderGardenTabs();
  if(typeof renderGardenContent === 'function') renderGardenContent();

  requestAnimationFrame(function(){
    const wrapRect = wrap.getBoundingClientRect();
    let wrapW = wrapRect.width || 320;
    let wrapH = wrapRect.height || 320;

    const overlay = document.createElement('div');
    overlay.id = 'raid-overlay';
    overlay.className = 'raid-overlay';
    overlay.innerHTML = '<canvas class="raid-canvas" id="raid-canvas"></canvas>';
    wrap.appendChild(overlay);

    /* rev-fix-garden-realscale: 螢幕外敵人氣泡容器（探索模式同款） */
    let _enemyBubbles = page.querySelector('#raid-enemy-bubbles');
    if(!_enemyBubbles){
      _enemyBubbles = document.createElement('div');
      _enemyBubbles.id = 'raid-enemy-bubbles';
      _enemyBubbles.style.cssText = 'position:absolute;top:36px;right:8px;width:48px;pointer-events:none;z-index:23;display:flex;flex-direction:column;gap:5px;';
      wrap.appendChild(_enemyBubbles);
    }

    const canvas = overlay.querySelector('#raid-canvas');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(wrapW * dpr));
    canvas.height = Math.max(1, Math.floor(wrapH * dpr));
    canvas.style.width = wrapW + 'px';
    canvas.style.height = wrapH + 'px';
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;

    /* rev-fix-raid-log-unify: 改用 pushLog 寫入 state.logs */
    const logEntries = [];
    /* rev-fix-raid-battleLog: 每次戰鬥創建一個 battleLog entry */
    var _battleEntry = { t: Date.now(), win: null, region: region, kills: [], status: [], summary: null };
    window._raidActiveBattleEntry = _battleEntry;
    var _gBL = (typeof _gardenMerchantInit === 'function') ? _gardenMerchantInit() : null;
    if(_gBL){
      if(!Array.isArray(_gBL.battleLog)) _gBL.battleLog = [];
      _gBL.battleLog.push(_battleEntry);
      if(_gBL.battleLog.length > 30) _gBL.battleLog.splice(0, _gBL.battleLog.length - 30);
    }
    function addLog(text, cls){
      /* rev-fix-raid-battleLog: 寫入當前 entry.status（狀態日誌） */
      if(window._raidActiveBattleEntry){
        window._raidActiveBattleEntry.status.push({ t: Date.now(), html: text, cls: cls || '' });
        /* rev-fix-raid-realtime-log: 實時刷新日誌欄 */
        if(typeof _gardenRefreshBattleLogNow === 'function') _gardenRefreshBattleLogNow();
      }
    }

    const CHAR_PX = Math.min(74, Math.max(40, Math.floor(wrapH * 0.18)));
    const SCALE = CHAR_PX / 386;
    const MUZZLE_X_RIGHT = CHAR_PX * 0.60;
    const MUZZLE_X_LEFT = CHAR_PX * 0.60;
    const MUZZLE_Y_UP = CHAR_PX * 0.85;

    const guardUnits = [];
    for(const g of guards){
      const plotEl = grid.querySelector('.gp-plot[data-idx="' + g.towerIdx + '"]');
      if(!plotEl) continue;
      const pr = plotEl.getBoundingClientRect();
      const equipped = { head: null, top: null, primary: null, secondary: null, melee: null };
      const equippedRarity = {};
      const cfg = g.towerCfg || {};
      const eqCfg = cfg.eq || {};
      const eqRar = cfg.eqRarity || {};
      for(const s of ['head','top','primary','secondary']){
        if(eqCfg[s]){ equipped[s] = eqCfg[s]; equippedRarity[s] = eqRar[s] || '一般'; }
      }
      const weaponSlot = equipped.primary ? 'primary' : (equipped.secondary ? 'secondary' : null);
      const s = g.srv;
      const maxHp = (typeof servantMaxHp === 'function') ? servantMaxHp(s) : (100 + s.lv * 20);
      let armor = 0, armorLevel = 0;
      for(const slot of ['head','top']){
        const id = eqCfg[slot];
        if(!id) continue;
        const rar = eqRar[slot] || '一般';
        armor += (typeof equipArmorValue === 'function') ? equipArmorValue(id, rar) : 0;
        const d = ARMOR[id];
        if(d && d.level) armorLevel = Math.max(armorLevel, d.level);
      }
      const scopeBonus = g.weaponDef.scopeBonus || 0;
      const hitRate = (typeof servantHitRate === 'function') ? servantHitRate(s, '點射', scopeBonus) : 20;
      const ammoId = g.ammoId || cfg.ammoId;
      const ammoRarity = g.ammoRarity || (ammoId ? ((AMMO[ammoId] && AMMO[ammoId].rarity) || '一般') : '一般');
      const critRate = (typeof servantCritRate === 'function') ? servantCritRate(g.weaponRarity, ammoRarity) : 0.1;
      const critMult = (typeof servantCritMult === 'function') ? servantCritMult(g.weaponRarity, ammoRarity) : 1.5;
      const magCap = g.weaponDef.mag || 30;
      const stock = ammoId ? invCount(ammoId, ammoRarity) : 0;
      const ms = cfg.maxShots || 'inf';
      let budget;
      if(ms === 'skip') budget = 0;
      else if(ms === 'mag') budget = Math.min(stock, magCap);
      else budget = stock;
      guardUnits.push({
        /* rev-fix-raid-guard-name: name 只用 servantLabel，去掉 Lv.N */
        srv: s, name: servantLabel(s),
        rpm: g.weaponDef.rpm || 600,
        x: pr.left - wrapRect.left + pr.width / 2,
        y: pr.top - wrapRect.top + pr.height - 4,
        /* rev-fix-raid-worldx: 守衛 worldX 由塔螢幕位置換算 */
        worldX: ((pr.left - wrapRect.left + pr.width / 2) - wrapW / 2) / (CHAR_PX / 1.7),
        hp: maxHp, maxHp: maxHp,
        armor: armor, maxArmor: armor, armorLevel: armorLevel,
        alive: true, isGuard: true,
        weaponDef: g.weaponDef, weaponRarity: g.weaponRarity,
        towerCfg: g.towerCfg, towerIdx: g.towerIdx,
        equipped: equipped, equippedRarity: equippedRarity, weaponSlot: weaponSlot,
        ammoId: ammoId, ammoRarity: ammoRarity, ammoStock: stock,
        ammoBudget: budget, ammoUsed: 0, magCap: magCap,
        _magazine: { inMag: Math.min(magCap, budget) },
        _reloadEnd: 0, _reloadStart: 0,
        hitRate: hitRate, critRate: critRate, critMult: critMult,
        animName: 'idle', animFrame: 0, animNext: 0, hurtUntil: 0,
        nextFireAt: 0
      });
    }
    /* rev-fix-raid-guard-pos: 從 _gardenActors 同步守衛當前位置 + 關聯 _combatUnit */
    if(typeof _gardenActors !== 'undefined' && _gardenActors && _gardenActors.length){
      for(const _gu of guardUnits){
        if(!_gu.srv) continue;
        for(const _ga of _gardenActors){
          if(_ga.id === _gu.srv.id){
            if(typeof _ga.x === 'number' && typeof _ga.y === 'number'){
              _gu.x = _ga.x;
              _gu.y = _ga.y;
            }
            _ga._combatUnit = _gu;
            _gu._actor = _ga;
            break;
          }
        }
      }
    }
    window._raidGuardUnits = guardUnits;

    const enemyUnits = [];
    const _n = enemies.length;
    let _cols;
    if(_n <= 3) _cols = 1;
    else if(_n <= 6) _cols = 2;
    else _cols = 3;
    const _colGap = 50;
    const _rightBase = wrapW - 30;
    const _rowsPerCol = Math.ceil(_n / _cols);
    const _rowGap = Math.min(78, Math.max(52, Math.floor((wrapH - 80) / Math.max(1, _rowsPerCol))));
    for(let i = 0; i < _n; i++){
      const e = enemies[i];
      const _col = i % _cols;
      const _row = Math.floor(i / _cols);
      const _jx = (Math.random() - 0.5) * 16;
      const _jy = (Math.random() - 0.5) * 14;
      const _colX = _rightBase - _col * _colGap + _jx;
      const _rowsInThisCol = (_col === _cols - 1) ? (_n - _col * _rowsPerCol) : _rowsPerCol;
      const _totalH = _rowGap * _rowsInThisCol;
      const _topY = Math.max(60, wrapH / 2 - _totalH / 2 + 30);
      const _y = _topY + _row * _rowGap + _jy;
      const _eid = e.eid || e.id;
      const _ename = e.name || ((typeof ENEMIES !== 'undefined' && ENEMIES[_eid]) ? ENEMIES[_eid].name : _eid);
      const _dmg = e.dmg != null ? e.dmg : (e.primaryWeapon ? (e.primaryWeapon.dmg || 10) : 10);
      const _pen = e.pen != null ? e.pen : (e.primaryWeapon ? (e.primaryWeapon.penMM || 0) : 0);
      enemyUnits.push({
        id: _eid, name: _ename,
        dmg: _dmg, pen: _pen, armorLevel: e.armorLevel || 1,
        /* rev-fix-raid-online-enemy-armor: 與步戰一致 — 記錄裝備以計算部位護甲 */
        helmet: e.helmet || null,
        body: e.body || null,
        helmetRarity: e.helmetRarity || '一般',
        bodyRarity: e.bodyRarity || '一般',
        rarity: e.rarity || '一般',
        ammoId: (e.primaryWeapon && e.primaryWeapon.ammoId) || null,
        rpm: 300,
        homeX: _colX, homeY: _y,
        x: wrapW, targetX: _colX, targetY: _y,
        worldX: 50,
        y: _y,
        hp: e.maxHp, maxHp: e.maxHp,
        armor: e.armor || 0, maxArmor: e.maxArmor || 0,
        alive: true, isGuard: false,
        /* rev-fix-raid-no-state: 移除 walking_in 狀態機 */
        walkSpeed: 1.4,
        weaponId: (e.primaryWeapon && e.primaryWeapon.id) || 'ak74',
        /* rev-fix-raid-rpg-data: 拷貝 RPG / 手榴彈字段 */
        hasRPG: !!e.hasRPG,
        rpgAmmo: e.rpgAmmo || 0,
        rpgRarity: e.rpgRarity || null,
        rpgDmg: e.rpgDmg || 0,
        rpgPenMM: e.rpgPenMM || 0,
        grenade: e.grenade || null,
        animName: 'idle', animFrame: 0, animNext: 0, hurtUntil: 0,
        nextFireAt: 0,
        destroyUntil: 0,
        targetFieldIdx: -1,
        gone: false
      });
    }
    window._raidEnemyUnits = enemyUnits;

    const bullets = [];
    const damageTexts = [];
    const raidOwner = { sparks: [], explosions: [] };

    /* rev-fix-corpse-timing: 獨立屍體數組 */
    const corpses = [];
    const MAX_DMG_AGE = 900;
    let battleState = 'combat';
    let lastTickTime = performance.now();
    const brokenPlots = [];
    const _t0 = performance.now();
    for(const g of guardUnits) g.nextFireAt = _t0 + 300 + Math.random() * 500;
    for(const e of enemyUnits) e.nextFireAt = _t0 + 800 + Math.random() * 500;

    function tickAnim(u, now){
      /* rev-fix-tickanim-walk: 不覆盖 u.animName（保留移动循环/tickDestroyPhase 设的 walk） */
      const _as = (typeof getUnitAnimState === 'function') ? getUnitAnimState(u, now) : { name: 'idle', startTime: now };
      let _animName, _animStart;
      if(_as.name !== 'idle'){
        /* action 动画（hurt/reload/fire）覆盖 */
        _animName = _as.name;
        _animStart = _as.startTime;
        u.animName = _animName;
        u._animStart = _animStart;
        u._lastAnimName = _animName;
      } else {
        /* 无 action → 保留 u.animName（walk / idle） */
        _animName = u.animName || 'idle';
        if(!u._lastAnimName || u._lastAnimName !== _animName){
          u._animStart = now;
          u._lastAnimName = _animName;
        }
        _animStart = u._animStart || now;
      }
      let anim = null;
      if(typeof _resolveEnemyAnims === 'function'){
        const _eid = (typeof HUMAN_ENEMY_DATA !== 'undefined' && HUMAN_ENEMY_DATA['human_' + u.id]) ? 'human_' + u.id : u.id;
        const _anims = _resolveEnemyAnims(_eid);
        if(_anims && _anims[_animName]) anim = _anims[_animName];
      }
      if(!anim) anim = GAME_ANIMS[_animName] || GAME_ANIMS.idle;
      if(!anim) return;
      const interval = 1000 / anim.fps;
      const elapsed = Math.max(0, now - _animStart);
      let f = Math.floor(elapsed / interval);
      if(anim.loop){ f = f % anim.frameCount; }
      else if(f > anim.frameCount - 1){ f = anim.frameCount - 1; }
      u.animFrame = f;
    }

    function drawUnit(u, now){
      if(u.gone) return;
      if(!u.alive && u.animName !== 'death'){
        u.animName = 'death'; u.animFrame = 0; u.animNext = 0;
      }
      tickAnim(u, now);
      let ox = 0;
      if(now < u.hurtUntil){
        const t = 1 - (u.hurtUntil - now) / 220;
        ox += Math.sin(t * Math.PI * 5) * 3;
      }
      ctx.save();
      if(!u.isGuard && u.state === 'running_away'){
        ctx.translate(u.x + ox, 0);
        ctx.scale(-1, 1);
        ctx.translate(-(u.x + ox), 0);
      }
      if(u.isGuard){
        _raidDrawHuman(ctx, u.x + ox, u.y, SCALE, u.equipped, u.equippedRarity, u.animName, u.animFrame, u.weaponSlot, false);
      } else {
        _raidDrawEnemy(ctx, u.x + ox, u.y, SCALE, u.animName, u.animFrame, u.id);
      }
      ctx.restore();
      if(u.alive && u.state === 'combat'){
        const barW = 34, barH = 4;
        const bx = u.x - barW / 2;
        const by = u.y - CHAR_PX - 8;
        ctx.fillStyle = 'rgba(0,0,0,.75)';
        ctx.fillRect(bx - 1, by - 1, barW + 2, barH + 2);
        ctx.fillStyle = '#1a1010';
        ctx.fillRect(bx, by, barW, barH);
        ctx.fillStyle = u.isGuard ? '#4caf50' : '#e05252';
        ctx.fillRect(bx, by, barW * Math.max(0, u.hp / u.maxHp), barH);
      }
    }

function drawBullet(b){
      /* rev-fix-bullet-v103: 从 BULLET_VISUAL_RADIUS 常量读 */
      const _br = (typeof BULLET_VISUAL_RADIUS !== 'undefined') ? BULLET_VISUAL_RADIUS : { normal: 3, grenade: 5, missile: 6 };
      const _chf = (typeof CHAR_HEIGHT_FACTOR !== 'undefined') ? CHAR_HEIGHT_FACTOR : 0.15;
      const _z1 = document.getElementById('zone1');
      const _ehExpl = (_z1 ? _z1.clientHeight : 500) * _chf;
      const _scale = Math.max(0.1, CHAR_PX / _ehExpl);
      let _baseR = _br.normal;
      if(b.missile){ _baseR = _br.missile; }
      else if(b.big || b.isGrenade){ _baseR = _br.grenade; }
      const _r = _baseR * _scale;
      ctx.save();
      const _bcol = b.isEnemy ? '#ff6060' : (_RARITY_COLOR[b.rarity] || '#ffd680');
      ctx.fillStyle = _bcol;
      ctx.shadowColor = _bcol;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(b.x, b.y, _r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }    function drawDamage(d, now){
      const age = now - d.startTime;
      if(age > MAX_DMG_AGE) return;
      const t = age / MAX_DMG_AGE;
      let alpha, scale, offY;
      if(t < 0.15){ alpha = t / 0.15; scale = 0.6 + t / 0.15 * 0.7; offY = -t * 10; }
      else { alpha = Math.max(0, 1 - (t - 0.15) / 0.85); scale = 1.3 - (t - 0.15) * 0.4; offY = -10 - (t - 0.15) * 60; }
      ctx.save();
      ctx.globalAlpha = alpha;
      const size = d.crit ? 20 : 15;
      ctx.font = 'bold ' + Math.round(size * scale) + 'px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = d.crit ? '#ff3030' : (d.isEnemy ? '#ff8080' : '#ffd680');
      if(d.text === 'MISS') ctx.fillStyle = '#a89a85';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.strokeText(d.text, d.x, d.y + offY);
      ctx.fillText(d.text, d.x, d.y + offY);
      ctx.restore();
    }

    function guardsAlive(){ return guardUnits.some(function(u){ return u.alive; }); }
    /* rev-fix-garden-walk: walking_in 也算在場，避免開局誤判勝利 */
    function enemiesAlive(){ return enemyUnits.some(function(u){ return u.alive; }); }

    function spawnBullet(fromU, toU, hit, isEnemy){
      /* rev-fix-raid-muzzle: 守衛用 _getRaidMuzzleWorld 精確計算槍口位置 */
      let _mzPos = null;
      if(fromU.isGuard && typeof _getRaidMuzzleWorld === 'function'){
        /* [v231] 用實際繪製的 SCALE，而非硬編碼 56/386，避免槍口焰偏離 */
        _mzPos = _getRaidMuzzleWorld(fromU, SCALE);
      }
      const sx = _mzPos ? _mzPos.x : (fromU.x + (isEnemy ? -MUZZLE_X_LEFT : MUZZLE_X_RIGHT));
      const sy = _mzPos ? _mzPos.y : (fromU.y - MUZZLE_Y_UP);
      let tx = toU.x;
      let ty = toU.y - MUZZLE_Y_UP;
      if(!hit){
        tx += (Math.random() - 0.5) * 70;
        ty += (Math.random() - 0.5) * 50;
      }
      
      /* [v207] 真實彈速與延遲結算 */
      let _cal = null;
      if(fromU.weaponDef && fromU.weaponDef.cal) _cal = fromU.weaponDef.cal;
      else if(fromU.ammoId && typeof AMMO !== 'undefined' && AMMO[fromU.ammoId]) _cal = AMMO[fromU.ammoId].cal;
      
      let _spd = 500;
      if(_cal && typeof AMMO_SPEED_MS !== 'undefined' && AMMO_SPEED_MS[_cal]) _spd = AMMO_SPEED_MS[_cal];
      
      // 換算為像素距離 (guardUnits 的 worldX 為基準)
      const _pixelDist = Math.abs(tx - sx);
      const _worldDist = Math.abs(fromU.worldX - toU.worldX);
      const _duration = Math.max(16, (_worldDist / _spd) * 1000);

      const _isFast = true; // 統一視為高速彈
      let _rar;
      if(fromU.isGuard){
        _rar = fromU.ammoRarity || '一般';
      } else {
        const _ammoDef = (fromU.ammoId && typeof AMMO !== 'undefined' && AMMO[fromU.ammoId]) ? AMMO[fromU.ammoId] : null;
        _rar = _ammoDef ? _ammoDef.rarity : (fromU.rarity || '一般');
      }
      const _color = (typeof window._rarityBulletColor === 'function') ? window._rarityBulletColor(_rar) : '#ffd680';

      bullets.push({ 
        sx, sy, tx, ty, x: sx, y: sy, 
        startTime: performance.now(), 
        duration: _duration,
        hit, isEnemy, fromU, toU, 
        rarity: _rar, isFast: _isFast, color: _color
      });

      // [v216] 曳光僅敵人
      if (isEnemy) {
        if (!window._raidTracers) window._raidTracers = [];
        window._raidTracers.push({
          sx, sy, tx, ty,
          born: performance.now(),
          dur: 200,
          color: _color,
          hit: hit
        });
      }

      // [v210] 統一調用全局煙火模塊
      if(window.MuzzleFX) window.MuzzleFX.spawn(sx, sy, fromU.isGuard ? 1.0 : 0.9, isEnemy, 'raid');
    

      const wAnim = (fromU.weaponSlot === 'secondary') ? 'fire_secondary' : 'fire_primary';
      const _animDef = (typeof GAME_ANIMS !== 'undefined' && GAME_ANIMS[wAnim]) ? GAME_ANIMS[wAnim] : null;
      const _animDur = _animDef ? Math.round(_animDef.frameCount / _animDef.fps * 1000) : 250;
      fromU._fireAnimName = wAnim;
      fromU._fireAnimStart = performance.now();
      fromU._fireAnimUntil = performance.now() + _animDur;
    }

    /* rev-fix-raid-rpg-fire: 後院版 RPG，走 applyDamage + 濺射 */
    function _raidEnemyFireRPG(e, target, now){
      if(!e || !target) return;
      const _rar = e.rpgRarity || e.rarity || '一般';
      const _baseDmg = e.rpgDmg || (100 * ((typeof RARITY_MULT !== 'undefined' && RARITY_MULT[_rar]) || 1));
      const _penMM = e.rpgPenMM || 600;
      const hit = Math.random() < 0.6;
      const sx = e.x;
      const sy = e.y - 20;
      const tx = hit ? target.x : (target.x + (Math.random() - 0.5) * 80);
      const ty = target.y - 20;
      const _fpAnimDefR = (typeof GAME_ANIMS !== 'undefined' && GAME_ANIMS.fire_primary) ? GAME_ANIMS.fire_primary : null;
      const _fpDurR = _fpAnimDefR ? Math.round(_fpAnimDefR.frameCount / _fpAnimDefR.fps * 1000) : 400;
      e._fireAnimName = 'fire_primary';
      e._fireAnimStart = now;
      e._fireAnimUntil = now + _fpDurR;
      bullets.push({
        sx: sx, sy: sy, tx: tx, ty: ty, x: sx, y: sy, t: 0, speed: 1.2,
        hit: hit, isEnemy: true, big: true, missile: true,
        fromU: e, toU: target, rarity: _rar,
        _onHit: function(){
          if(!hit || !target.alive) return;
          const _cr = (typeof calcCritRate === 'function') ? calcCritRate(_rar, _rar) : 0.1;
          const _cm = (typeof calcCritMult === 'function') ? calcCritMult(_rar, _rar) : 1.5;
          const crit = Math.random() < _cr;
          const dmg = Math.round(_baseDmg * (crit ? _cm : 1));
          /* 主目標 */
          const proxy = { hp: target.hp, armor: target.armor || 0 };
          const res = applyDamage(proxy, dmg, _penMM, {
            armorProvider: function(part){
              if(part === 'head' || part === 'face'){
                const h = target.equipped && target.equipped.head;
                return h ? armorMMForSlot(h, part) : 0;
              }
              if(part === 'top'){
                const t2 = target.equipped && target.equipped.top;
                return t2 ? armorMMForSlot(t2, 'top') : 0;
              }
              return 0;
            }
          });
          target.hp = Math.max(0, target.hp - res.hpLost);
          target.armor = Math.max(0, (target.armor || 0) - res.armorLost);
          const shown = res.hpLost > 0 ? res.hpLost : res.armorLost;
          damageTexts.push({ x: target.x, y: target.y - CHAR_PX - 18, text: '-' + shown + (crit ? '!' : ''), crit: crit, isEnemy: true, startTime: Date.now() });
          target.hurtUntil = Date.now() + 180;
          target.animName = 'hurt'; target.animFrame = 0;
          const _tg = target;
          setTimeout(function(){
            if(_tg.alive && _tg.animName === 'hurt'){ _tg.animName = 'idle'; _tg.animFrame = 0; }
          }, 180);
          if(target.hp <= 0){
            target.alive = false;
            target.animName = 'idle'; target.animFrame = 0;
          }
          /* rev-fix-splash-shared: 濺射改調共用函數（用 worldX） */
          const _rpgWX = (typeof target.worldX === 'number') ? target.worldX : 0;
          const _nearbyList = [];
          for(const g of guardUnits){
            if(g === target) continue;
            if(!g.alive) continue;
            _nearbyList.push({ target: g, worldX: (typeof g.worldX === 'number') ? g.worldX : 0 });
          }
          _applySplashDamage(target, _rpgWX, _nearbyList, dmg, {
            maxR: 8, blastPen: 18, splashRatio: 0.35,
            armorProviderFn: function(g){
              return function(part){
                if(part === 'head' || part === 'face'){
                  const h2 = g.equipped && g.equipped.head;
                  return h2 ? armorMMForSlot(h2, part) : 0;
                }
                if(part === 'top'){
                  const t3 = g.equipped && g.equipped.top;
                  return t3 ? armorMMForSlot(t3, 'top') : 0;
                }
                return 0;
              };
            },
            onHit: function(g, hpLost, armorLost){
              const _sShown = hpLost > 0 ? hpLost : armorLost;
              if(_sShown > 0){
                damageTexts.push({ x: g.x, y: g.y - CHAR_PX - 18, text: '-' + _sShown, crit: false, isEnemy: true, startTime: Date.now() });
              }
              if(g.hp <= 0){
                g.alive = false;
                g.animName = 'idle'; g.animFrame = 0;
                if(g.srv){
                  g.srv.hp = 0;
                  g.srv.injuredUntil = Date.now() + 4 * 3600 * 1000;
                  g.srv._injuredDown = true;
                }
              }
            }
          });
        }
      });
    }

    function updateBullets(dt){
      const nowMs = performance.now();
      for(let i = bullets.length - 1; i >= 0; i--){
        const b = bullets[i];
        b.t = (nowMs - b.startTime) / b.duration;
        if(b.t >= 1){
          b.x = b.tx; b.y = b.ty;
          onBulletHit(b);
          bullets.splice(i, 1);
          continue;
        }
        b.x = b.sx + (b.tx - b.sx) * b.t;
        b.y = b.sy + (b.ty - b.sy) * b.t;
      }
    }

    function onBulletHit(b){
      const toU = b.toU;
      if(!toU || !toU.alive){
        /* [v207] 目標已死，靜默丟棄子彈，防止鞭屍 */
        return;
      }
      if(!b.hit){
        damageTexts.push({ x: toU.x, y: toU.y - CHAR_PX - 18, text: 'MISS', crit: false, isEnemy: b.isEnemy, startTime: Date.now() });
        return;
      }
      /* rev-fix-attack-unify: 調用 _resolveSingleAttack 統一結算 */
      let atkInfo;
      if(b.fromU.isGuard){
        atkInfo = {
          ammoId: b.fromU.ammoId,
          ammoRarity: b.fromU.ammoRarity,
          weaponRarity: b.fromU.weaponRarity,
          penMM: (b.fromU.ammoId && AMMO[b.fromU.ammoId]) ? (AMMO[b.fromU.ammoId].penMM || 0) : (b.fromU.weaponDef.penMM || 0),
          fallbackDmg: 20
        };
      } else {
        atkInfo = {
          ammoId: b.fromU.ammoId,
          ammoRarity: (b.fromU.ammoId && AMMO[b.fromU.ammoId]) ? AMMO[b.fromU.ammoId].rarity : '一般',
          weaponRarity: b.fromU.rarity || '一般',
          penMM: b.fromU.pen || 0,
          fallbackDmg: b.fromU.dmg || 10
        };
      }
      const r = _resolveSingleAttack(atkInfo, toU);
      toU.hp = Math.max(0, toU.hp - r.hpLost);
      toU.armor = Math.max(0, (toU.armor || 0) - r.armorLost);
      const shown = r.totalShown;
      b.fromU.dmgDone = (b.fromU.dmgDone || 0) + shown;
      if(b.fromU.isGuard && b.fromU.srv) servantAddExp(b.fromU.srv, 2);
      if(typeof _spawnHitSpark === 'function'){
        /* rev-fix-spark-color-v2: 颜色规则集中在 _spawnHitSpark，只传 cls（击穿 '' / 未击穿 'armor'） */
        _spawnHitSpark(raidOwner, toU.x, toU.y - CHAR_PX * 0.5, r.crit, r.hpLost > 0 ? '' : 'armor');
      }
      /* rev-fix-anim-state-unified: 受伤时长从 GAME_ANIMS 计算，同时设两套时间戳 */
      const _hurtAnimDef = (typeof GAME_ANIMS !== 'undefined' && GAME_ANIMS.hurt) ? GAME_ANIMS.hurt : null;
      const _hurtDurVal = _hurtAnimDef ? Math.round(_hurtAnimDef.frameCount / _hurtAnimDef.fps * 1000) : 180;
      toU.hurtUntil = Date.now() + _hurtDurVal;
      toU._hurtStart = performance.now();
      toU._hurtUntil = performance.now() + _hurtDurVal;
      damageTexts.push({ x: toU.x, y: toU.y - CHAR_PX - 18, text: '-' + shown + (r.crit ? '!' : ''), crit: r.crit, isEnemy: b.isEnemy, startTime: Date.now() });
      if(toU.hp <= 0){
        toU.alive = false;
        // [v208] 移除 animName = 'idle' 的強制覆蓋，保留死亡動畫狀態機
        toU._deathStart = performance.now();
        damageTexts.push({ x: toU.x, y: toU.y - CHAR_PX - 30, text: b.isEnemy ? '☠' : '✖', crit: false, isEnemy: b.isEnemy, startTime: Date.now() });
        /* rev-fix-raid-kill-vs-down: 守卫击杀敌人 →「擊殺」，敌人击杀守卫 →「被 X 用 Y 擊倒」 */
        if(window._raidActiveBattleEntry && b.fromU && b.toU){
          var _fromHtml, _wHtml, _toHtml, _logText;
          if(b.fromU.isGuard){
            _fromHtml = '<span class="r-' + ((b.fromU.srv && b.fromU.srv.rarity) || '一般') + '">' + b.fromU.name + '</span>';
            _wHtml = '<span class="' + (typeof rarityClass === 'function' ? rarityClass(b.fromU.weaponRarity || '一般') : 'r-一般') + '">' + ((b.fromU.weaponDef && b.fromU.weaponDef.name) || '武器') + '</span>';
            _toHtml = '<b class="r-' + (b.toU.rarity || '一般') + '">' + b.toU.name + '</b>';
            _logText = _fromHtml + ' 用 ' + _wHtml + ' 擊殺 ' + _toHtml;
          } else {
            _fromHtml = '<span class="r-' + (b.fromU.rarity || '一般') + '">' + b.fromU.name + '</span>';
            _wHtml = '<span class="r-' + (b.fromU.rarity || '一般') + '">' + ((b.fromU.weaponId && WEAPONS[b.fromU.weaponId] && WEAPONS[b.fromU.weaponId].name) || '武器') + '</span>';
            _toHtml = '<b class="r-' + ((b.toU.srv && b.toU.srv.rarity) || '一般') + '">' + b.toU.name + '</b>';
            if(b.toU.isGuard){
              _logText = _toHtml + ' 被 ' + _fromHtml + ' 用 ' + _wHtml + ' <span class="lose">擊倒</span>';
            } else {
              _logText = _fromHtml + ' 用 ' + _wHtml + ' 擊殺 ' + _toHtml;
            }
          }
          window._raidActiveBattleEntry.kills.push({ t: Date.now(), html: _logText });
          /* rev-fix-raid-realtime-log: 實時刷新日誌欄 */
          if(typeof _gardenRefreshBattleLogNow === 'function') _gardenRefreshBattleLogNow();
        }
        /* rev-fix-raid-guard-injured: 守衛被擊殺 → 重傷 4h */
        if(toU.isGuard && toU.srv){
          toU.srv.hp = 0;
          toU.srv.injuredUntil = Date.now() + 4 * 3600 * 1000;
          toU.srv._injuredDown = true;
        }
        /* rev-fix-corpse-timing: 敵人屍體移入獨立數組，不計時 */
        if(!toU.isGuard){
          corpses.push({ x: toU.x, y: toU.y, id: toU.id, animStart: Date.now(), fadeStartAt: 0, fadeDuration: 1000 });
          const _idx = enemyUnits.indexOf(toU);
          if(_idx >= 0) enemyUnits.splice(_idx, 1);
        }
      }
    }

    function triggerSurrender(){
      window._raidSurrenderWorkers = true;
      addLog('🚩 工作僕人投降', 'lose');
      /* rev-fix-guard-corpse-in-raid: 不删除死亡守卫的 actor，保留尸体 */
      /* rev-fix-raid-no-force-end: 移除 8 秒強制結束 */
    }

    function startDestroyPhase(){
      triggerSurrender();
      const plots = _gardenGetPlots();
      for(const e of enemyUnits){
        if(e.gone) continue;
        if(!e.alive){ e.gone = true; e.state = 'dead_before_destroy'; continue; }
      }
      const alive = enemyUnits.filter(function(e){ return e.alive && !e.gone; });
      const candidates = [];
      for(let i = 0; i < plots.length; i++){
        const p = plots[i];
        if(!p || !p.type) continue;
        if(p.broken) continue;
        candidates.push(i);
      }
      const _PXPM = CHAR_PX / 1.7;
      let _ci = 0;
      for(const e of alive){
        e.state = 'walk_to_field';
        if(candidates.length){
          const idx = candidates[_ci % candidates.length];
          _ci++;
          e.targetFieldIdx = idx;
          const plotEl = grid.querySelector('.gp-plot[data-idx="' + idx + '"]');
          if(plotEl){
            const pr = plotEl.getBoundingClientRect();
            /* rev-fix-raid-destroy-worldx: 用 worldX 而非像素 */
            e.targetX = pr.left - wrapRect.left + pr.width / 2;
            e.targetY = pr.top - wrapRect.top + pr.height - 4;
            e.targetWorldX = ((pr.left - wrapRect.left + pr.width / 2) - wrapW / 2) / _PXPM;
          } else {
            e.state = 'running_away';
            e.targetWorldX = null;
            e.targetX = wrapW + 200;
            e.targetY = e.y;
          }
        } else {
          e.state = 'running_away';
          e.targetWorldX = null;
          e.targetX = wrapW + 200;
          e.targetY = e.y;
        }
      }
      addLog('⚔️ 敵人開始破壞田地', 'kill');
    }

    function tickDestroyPhase(now, dt){
      const liveEnemies = enemyUnits.filter(function(e){ return !e.gone; });
      if(!liveEnemies.length){
        if(battleState === 'destroying'){
          battleState = 'ending';
          setTimeout(function(){ endBattle(false); }, 400);
        }
        return;
      }
      const _PXPM = CHAR_PX / 1.7;
      const _walkSpeedM = 1.4;
      for(const e of liveEnemies){
        if(e.state === 'walk_to_field'){
          if(typeof e.targetWorldX !== 'number'){
            /* 無格子 → 跑走 */
            e.state = 'running_away';
            e.targetX = wrapW + 200;
            e.targetY = e.y;
            continue;
          }
          const _dxWX = e.targetWorldX - e.worldX;
          /* rev-fix-raid-destroy-worldx: 用 worldX 移動 */
          if(Math.abs(_dxWX) < 0.3){
            e.worldX = e.targetWorldX;
            e.x = wrapW * 0.5 + e.worldX * _PXPM;
            e.y = e.targetY;
            e.state = 'destroying';
            e.destroyUntil = now + 2000;
            e.animName = 'idle'; e.animFrame = 0; e.animNext = 0;
            addLog(e.name + ' 開始破壞田地', 'kill');
          } else {
            const _stepM = Math.min(Math.abs(_dxWX), _walkSpeedM * dt);
            e.worldX += Math.sign(_dxWX) * _stepM;
            e.x = wrapW * 0.5 + e.worldX * _PXPM;
            /* y 也慢慢走向目標 */
            const _dy = e.targetY - e.y;
            if(Math.abs(_dy) > 0.5) e.y += Math.sign(_dy) * Math.min(Math.abs(_dy), 180 * dt);
            e.animName = 'walk';
          }
        } else if(e.state === 'destroying'){
          if(now >= e.destroyUntil){
            if(e.targetFieldIdx >= 0){
              const plots = _gardenGetPlots();
              const plot = plots[e.targetFieldIdx];
              if(plot && !plot.broken){
                plot.broken = true;
                if(plot.crop) plot.crop = null;
                brokenPlots.push(e.targetFieldIdx);
                addLog(plotCoordName(e.targetFieldIdx) + ' 被破壞', 'kill');
              }
            }
            e.state = 'running_away';
            e.targetX = wrapW + 200;
            e.targetY = e.y;
          }
        } else if(e.state === 'running_away'){
          const dx = e.targetX - e.x;
          const d = Math.abs(dx);
          if(d < 6){
            e.gone = true;
            e.alive = false;
          } else {
            /* rev-fix-spd-undef: spd 未定義 → 用 180 * dt */
            e.x += Math.sign(dx) * Math.min(d, 180 * dt * 1.6);
            e.animName = 'walk';
          }
        }
      }
    }

    function tickCombat(now, dt){
      updateBullets(dt);
      if(battleState === 'combat'){
        for(const g of guardUnits){
          if(!g.alive) continue;
          if(now < g.nextFireAt) continue;
          const _guardRangeM = (typeof _rangeOfWeaponDef === 'function' ? _rangeOfWeaponDef(g.weaponDef) : 15);
          const _gWX = (typeof g.worldX === 'number') ? g.worldX : 0;
          /* rev-fix-raid-detect: 已發現 + 射程內 */
          const alive = enemyUnits.filter(function(e){
            if(!e.alive) return false;
            const _eWX = (typeof e.worldX === 'number') ? e.worldX : 0;
            return window.canEngage(_guardRangeM, e, Math.abs(_eWX - _gWX));
          });
          if(!alive.length) continue;
          if(g.ammoId){
            if(g._reloadEnd && now < g._reloadEnd) continue;
            if(!g._magazine) g._magazine = { inMag: 0 };
            if(g._magazine.inMag <= 0){
              const _remaining = g.ammoBudget - g.ammoUsed;
              if(_remaining <= 0) continue;
              const _fill = Math.min(g.magCap, _remaining);
              g._magazine.inMag = _fill;
              g._reloadEnd = now + 1000;
              g._reloadStart = now;
              continue;
            }
            g._magazine.inMag--;
            g.ammoUsed++;
          }
          let target = null;
          const _rpgTargets = alive.filter(function(e){ return e.hasRPG && e.rpgAmmo > 0; });
          if(_rpgTargets.length){
            _rpgTargets.sort(function(a, b){ return Math.abs(a.worldX - _gWX) - Math.abs(b.worldX - _gWX); });
            target = _rpgTargets[0];
          } else {
            alive.sort(function(a, b){ return Math.abs(a.worldX - _gWX) - Math.abs(b.worldX - _gWX); });
            target = alive[0];
          }
          const _gMode = (typeof _getFireChainMode === 'function') ? _getFireChainMode(g) : '點射';
          const _gScopeBonus = (g.weaponDef && g.weaponDef.scopeBonus) || 0;
          const _gHitRate = (typeof servantHitRate === 'function')
            ? servantHitRate(g.srv, _gMode, _gScopeBonus)
            : (g.hitRate || 20);
          const hit = Math.random() * 100 < _gHitRate;
          spawnBullet(g, target, hit, false);
          g.nextFireAt = now + Math.max(120, 60000 / g.rpm);
        }
        for(const e of enemyUnits){
          if(!e.alive) continue;
          if(now < e.nextFireAt) continue;
          const _eWX = (typeof e.worldX === 'number') ? e.worldX : 0;
          /* rev-fix-raid-detect: 敵人先發現守衛（40 米） */
          const _detectDistE = (typeof GARDEN_GUARD_DETECTABLE_R !== 'undefined') ? GARDEN_GUARD_DETECTABLE_R : 40;
          const _detected = guardUnits.filter(function(g){
            if(!g.alive) return false;
            const _gWX = (typeof g.worldX === 'number') ? g.worldX : 0;
            return Math.abs(_gWX - _eWX) <= _detectDistE;
          });
          if(!_detected.length) continue;
          if(e.hasRPG && e.rpgAmmo > 0){
            const _RPG_RANGE = (typeof RPG_COMBAT_RANGE !== 'undefined') ? RPG_COMBAT_RANGE : 150;
            const _rpgInRange = guardUnits.filter(function(g){
              if(!g.alive) return false;
              const _gWX = (typeof g.worldX === 'number') ? g.worldX : 0;
              return window.canEngage(_RPG_RANGE, g, Math.abs(_gWX - _eWX));
            });
            if(_rpgInRange.length){
              e.rpgAmmo--;
              _rpgInRange.sort(function(a, b){ return Math.abs(a.worldX - _eWX) - Math.abs(b.worldX - _eWX); });
              const target = _rpgInRange[0];
              _raidEnemyFireRPG(e, target, now);
              e.nextFireAt = now + 5000;
              continue;
            }
          }
          const _eWeaponDef = (typeof WEAPONS !== 'undefined' && e.weaponId) ? WEAPONS[e.weaponId] : null;
          const _enemyRangeM = (typeof _rangeOfWeaponDef === 'function' && _eWeaponDef) ? _rangeOfWeaponDef(_eWeaponDef) : 15;
          const alive = guardUnits.filter(function(g){
            if(!g.alive) return false;
            const _gWX = (typeof g.worldX === 'number') ? g.worldX : 0;
            return window.canEngage(_enemyRangeM, g, Math.abs(_gWX - _eWX));
          });
          if(!alive.length) continue;
          alive.sort(function(a, b){ return Math.abs(a.worldX - _eWX) - Math.abs(b.worldX - _eWX); });
          const target = alive[0];
          const _effMode = _getFireChainMode(e);
          const _hb = 0.55;
          const _modeMult = (typeof MODE_ACCURACY !== 'undefined' && MODE_ACCURACY[_effMode]) || 1.0;
          const hc = _hb * _modeMult;
          const hit = Math.random() < hc;
          spawnBullet(e, target, hit, true);
          e.nextFireAt = now + Math.max(200, 60000 / e.rpm);
        }
        if(!enemiesAlive()){
          battleState = 'ending';
          /* rev-fix-raid-remove-noise: 防禦成功日誌移除（總結行已顯示） */
          /* rev-fix-corpse-timing: 延時 4000ms，讓 3 秒停留 + 1 秒淡出完整播放 */
          setTimeout(function(){ endBattle(true); }, 4000);
          return;
        }
        if(!guardsAlive()){
          battleState = 'destroying';
          addLog('💀 後院失守', 'lose');
          startDestroyPhase();
          return;
        }
      } else if(battleState === 'destroying'){
        tickDestroyPhase(now, dt);
      }
    }

    function endBattle(win){
      if(battleState === 'ended') return;
      battleState = 'ended';
      window._raidLiveActive = false;
      try { window._raidSurrenderWorkers = false; } catch(e){}
      /* rev-fix-raid-actor-cleanup: 清空守衛 actor 的 _combatUnit 引用 */
      if(typeof _gardenActors !== 'undefined' && _gardenActors){
        for(const _ga of _gardenActors){ _ga._combatUnit = null; }
      }
      try {
        if(typeof _gardenActors !== 'undefined' && _gardenActors.length){
          for(const a of _gardenActors){ if(a.state === 'surrender') a.state = 'idle'; }
        }
      } catch(e){}
      try {
        var _ovs = document.querySelectorAll('#raid-overlay');
        for(var _oi = 0; _oi < _ovs.length; _oi++){ try{ _ovs[_oi].remove(); }catch(_e){} }
        var _bbs = document.querySelectorAll('#raid-enemy-bubbles');
        for(var _bi = 0; _bi < _bbs.length; _bi++){ try{ _bbs[_bi].remove(); }catch(_e){} }
      } catch(e){ console.warn('[endBattle remove ov]', e); }
      try {
        const sim = { log: logEntries, guards: guardUnits, enemies: enemyUnits, win: win, rounds: 1, brokenPlots: brokenPlots.slice(), initialEnemyCount: _initialEnemyCount };
        _gardenRaidApplyResult(sim, region);
      } catch(e){ console.warn('[raid apply]', e); }
      try { _gardenActiveTab = 'log'; } catch(e){}
      try { if(typeof renderGardenTabs === 'function') renderGardenTabs(); } catch(e){}
      /* rev-fix-raid-double-render: renderGardenContent/Grid 已由 _gardenRaidApplyResult 内部调用，此处不重复 */
      try { if(typeof _gardenStartActorLoop === 'function') _gardenStartActorLoop(); } catch(e){ console.warn('[start actor loop]', e); }
      try { if(typeof _gardenStartActorCanvasLoop === 'function') _gardenStartActorCanvasLoop(); } catch(e){ console.warn('[start actor canvas]', e); }
      setTimeout(function(){
        try { if(typeof _gardenSyncActors === 'function') _gardenSyncActors(); } catch(e){}
        try {
          var _acs = document.querySelectorAll('#gp-actor-canvas');
          for(var _ai = 0; _ai < _acs.length; _ai++){
            var _ac = _acs[_ai];
            var _c2 = _ac.getContext('2d');
            if(_c2) _c2.clearRect(0, 0, _ac.width, _ac.height);
          }
        } catch(e){ console.warn('[endBattle clear actor canvas]', e); }
      }, 100);
    }

    function renderLoop(){
      if(!window._raidLiveActive) return;
      if(!page.querySelector('#raid-overlay')) return;
      const nowP = performance.now();
      const dt = Math.min(0.05, (nowP - lastTickTime) / 1000);
      lastTickTime = nowP;
      tickCombat(nowP, dt);
      const nowD = Date.now();
      ctx.clearRect(0, 0, wrapW, wrapH);

      /* rev-fix-move-combat-only: 移动循环只在 combat 阶段执行，destroying 阶段保留 tickDestroyPhase 设的 walk 动画 */
      const _PX_PER_METER = CHAR_PX / 1.7;
      if(battleState === 'combat'){
      for(const u of enemyUnits){
        if(!u.alive) continue;
        if(typeof u.worldX !== 'number') continue;
        let _nearestG = null, _nearestDist = Infinity;
        for(const g of guardUnits){
          if(!g.alive) continue;
          const _gWX = (typeof g.worldX === 'number') ? g.worldX : 0;
          const _d = Math.abs(_gWX - u.worldX);
          if(_d < _nearestDist){ _nearestDist = _d; _nearestG = g; }
        }
        let _isMoving = false;
        if(_nearestG){
          const _eWeaponDef = (typeof WEAPONS !== 'undefined' && u.weaponId) ? WEAPONS[u.weaponId] : null;
          const _uRange = (typeof _rangeOfWeaponDef === 'function' && _eWeaponDef) ? _rangeOfWeaponDef(_eWeaponDef) : 15;
          const _detectDist = (typeof GARDEN_GUARD_DETECTABLE_R !== 'undefined') ? GARDEN_GUARD_DETECTABLE_R : 40;
          /* rev-fix-move-v103: 没发现 或 不在射程内 → 继续前进 */
          if(_nearestDist > _detectDist || _nearestDist > _uRange){
            const _gWX = (typeof _nearestG.worldX === 'number') ? _nearestG.worldX : 0;
            const _dir = _gWX > u.worldX ? 1 : -1;
            u.worldX += _dir * (u.walkSpeed || 1.4) * dt;
            _isMoving = true;
          }
        }
        u.x = wrapW * 0.5 + u.worldX * _PX_PER_METER;
        const _isActionAnim = (u.animName === 'fire_primary' || u.animName === 'fire_secondary' || u.animName === 'hurt' || u.animName === 'death');
        if(!_isActionAnim){
          u.animName = _isMoving ? 'walk' : 'idle';
        }
      }
      }

      for(let i = damageTexts.length - 1; i >= 0; i--){
        if(nowD - damageTexts[i].startTime > MAX_DMG_AGE) damageTexts.splice(i, 1);
      }

      /* rev-fix-raid-actor-draw: 守衛由 actor canvas 繪製，raid canvas 不重複畫 */

      /* rev-fix-corpse-timing: 所有敵人已進入 corpses → 統一觸發計時 */
      if(corpses.length > 0 && enemyUnits.length === 0){
        for(let ci = 0; ci < corpses.length; ci++){
          if(corpses[ci].fadeStartAt === 0){
            corpses[ci].fadeStartAt = nowD + 3000;
          }
        }
      }
      for(let ci = corpses.length - 1; ci >= 0; ci--){
        const cc = corpses[ci];
        let _alpha = 1;
        if(cc.fadeStartAt > 0){
          const _age = nowD - cc.fadeStartAt;
          if(_age > 0) _alpha = Math.max(0, 1 - _age / cc.fadeDuration);
          if(_alpha <= 0){ corpses.splice(ci, 1); continue; }
        }
        const _animKey = (typeof HUMAN_ENEMY_DATA !== 'undefined' && !HUMAN_ENEMY_DATA[cc.id] && HUMAN_ENEMY_DATA['human_' + cc.id]) ? 'human_' + cc.id : cc.id;
        const _anims = (typeof _resolveEnemyAnims === 'function') ? _resolveEnemyAnims(_animKey) : null;
        const _deathAnim = _anims && _anims.death;
        const _fps = _deathAnim ? _deathAnim.fps : 8;
        const _frameCount = _deathAnim ? _deathAnim.frameCount : 6;
        const _elapsed = (nowD - cc.animStart) / 1000;
        const _fi = Math.min(_frameCount - 1, Math.floor(_elapsed * _fps));
        ctx.save();
        ctx.globalAlpha = _alpha;
        _raidDrawEnemy(ctx, cc.x, cc.y, SCALE, 'death', _fi, cc.id);
        ctx.restore();
      }
      for(const u of enemyUnits) drawUnit(u, nowD);
      
      // [v210] 統一更新與渲染
      if(window.MuzzleFX) {
        window.MuzzleFX.update(dt);
        window.MuzzleFX.render(ctx, 'raid');
      }
      if(typeof _tickBattleFX === 'function') _tickBattleFX(raidOwner, dt);
      if(typeof _renderBattleFX === 'function') _renderBattleFX(ctx, raidOwner);

      // [v208] 跳過快速子彈的實體繪製，改為繪製曳光
    
      for(const b of bullets) {
        if (!b.isFast) drawBullet(b);
      }
      
      // [v208] 渲染曳光
      if (window._raidTracers) {
        const _trNow = performance.now();
        for (let i = window._raidTracers.length - 1; i >= 0; i--) {
          const tr = window._raidTracers[i];
          const age = _trNow - tr.born;
          if (age >= tr.dur) {
            window._raidTracers.splice(i, 1);
            continue;
          }
          const alpha = (1 - age / tr.dur) * (tr.hit ? 0.95 : 0.65);
          const grad = ctx.createLinearGradient(tr.sx, tr.sy, tr.tx, tr.ty);
          grad.addColorStop(0, (typeof _hexToRgba === 'function') ? _hexToRgba(tr.color, 0) : 'rgba(255,255,255,0)');
          grad.addColorStop(0.5, (typeof _hexToRgba === 'function') ? _hexToRgba(tr.color, alpha * 0.5) : 'rgba(255,255,255,' + (alpha*0.5) + ')');
          grad.addColorStop(0.92, (typeof _hexToRgba === 'function') ? _hexToRgba(tr.color, alpha) : 'rgba(255,255,255,' + alpha + ')');
          grad.addColorStop(1, 'rgba(255,255,255,' + alpha + ')');
          ctx.strokeStyle = grad;
          ctx.lineWidth = 2.2;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(tr.sx, tr.sy);
          ctx.lineTo(tr.tx, tr.ty);
          ctx.stroke();
        }
      }
      
      for(const d of damageTexts) drawDamage(d, nowD);

      /* rev-fix-raid-bubbles: 螢幕外敵人氣泡（同探索） */
      if(_enemyBubbles){
        var _bh = '';
        for(var _bi = 0; _bi < enemyUnits.length; _bi++){
          var _be = enemyUnits[_bi];
          if(!_be.alive) continue;
          if(_be.x <= wrapW - 10) continue;
          var _bd = Math.abs(_be.worldX || 0);
          var _brc = {'破舊':'#b87333','一般':'#e0e0e0','庫存':'#4caf50','精品':'#2196f3','傳奇':'#ffb300'}[_be.rarity] || '#e0e0e0';
          var _barc = Math.round(Math.max(0, _be.hp / _be.maxHp) * 360);
          var _bdt = _bd < 1 ? _bd.toFixed(1) : Math.round(_bd);
          _bh += '<div style="width:44px;height:44px;border-radius:50%;border:2px solid ' + _brc + ';background:conic-gradient(#e05252 0deg ' + _barc + 'deg, rgba(20,18,16,0.95) ' + _barc + 'deg 360deg);box-sizing:border-box;position:relative"><div style="position:absolute;inset:4px;border-radius:50%;background:rgba(14,12,10,0.95);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:bold;color:#ffb300">' + _bdt + '</div></div>';
        }
        if(_enemyBubbles.innerHTML !== _bh) _enemyBubbles.innerHTML = _bh;
      }

      requestAnimationFrame(renderLoop);
    }

    /* rev-fix-raid-remove-noise: 戰鬥開始日誌移除（無意義） */
    requestAnimationFrame(renderLoop);
  });
}

/* rev-fix-anim-ref-unify: 暴露繪製函數為 window 別名，供其他模組調用 */
window.drawHumanSprite = _raidDrawHuman;
window.drawEnemySprite = _raidDrawEnemy;
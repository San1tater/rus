
/* ============================================================
   25-boot.js — 啟動 / 路由 / 主循環 / 離線結算
   由舊 16-boot.js 重構。
   buildingTick / _offlineBuildingSettle / processCrafting → 08-state.js
   _gardenOfflineSettle → 21-garden.js
   _offlineGardenRaidSettle → 23-garden-raid.js
   _offlineExploreSettle / offlineSettle → 本文件
   ============================================================ */

let currentTab = 'explore';
let _sceneFadeTimer = null;

function _applySceneFadeIn(){
  ['zone1','zone2','zone3'].forEach(function(id){
    const el = document.getElementById(id);
    if(!el) return;
    el.classList.remove('scene-enter');
    void el.offsetWidth;
    el.classList.add('scene-enter');
  });
  if(_sceneFadeTimer) clearTimeout(_sceneFadeTimer);
  _sceneFadeTimer = setTimeout(function(){
    ['zone1','zone2','zone3'].forEach(function(id){
      const el = document.getElementById(id);
      if(el) el.classList.remove('scene-enter');
    });
    _sceneFadeTimer = null;
  }, 320);
}

function renderCurrentTab(){
  /* 切頁先清理舊戰鬥殘留；BTR 支援進行中時保留 _combat */
  var _btrActive = !!(window.BTRSupport && window.BTRSupport.active);
  if(!_btrActive && typeof window._combatCleanup === 'function'){
    try { window._combatCleanup(); } catch(e){ console.warn('[combatCleanup]', e); }
  }
  if(currentTab === 'explore') renderExplore();
  else if(currentTab === 'combat') renderCombat();
  else if(currentTab === 'base') renderBase();
  _applySceneFadeIn();
}

/* ===== tab 切換 ===== */
$$('.tab').forEach(t=>{
  t.onclick = () => {
    if(BossModule.isActive()){
      if(!confirm('戰鬥尚未結束，確定要離開嗎？')) return;
      BossModule.battle.active = false;
      BossModule.battle = null;
    }
    const _prevTab = currentTab;
    const _nextTab = t.dataset.tab;
    if(_prevTab === 'garden' && _nextTab !== 'garden'){
      if(typeof closeGarden === 'function') closeGarden();
    }
    if(typeof closeGaragePage === 'function'){ closeGaragePage(); }
    if(typeof closeStationPage === 'function'){ closeStationPage(); }
    currentTab = _nextTab;
    if(_nextTab !== 'explore' && _nextTab !== 'combat'){
      var _btrActive = !!(window.BTRSupport && window.BTRSupport.active);
      if(!_btrActive && typeof window._combatCleanup === 'function'){
        try { window._combatCleanup(); } catch(_){}
      }
    }
    if(currentTab === 'base') _regionScrollPos = 0;
    $$('.tab').forEach(x => x.classList.toggle('active', x === t));
    if(currentTab === 'garden'){
      if(typeof openGarden === 'function') openGarden();
    } else {
      renderCurrentTab();
    }
  };
});

/* ===== 主 tab 滑動切換 ===== */
(function(){
  if(window._mainTabSwipeVer === 558) return;
  window._mainTabSwipeVer = 558;
  const TABS = ['explore', 'combat', 'garden', 'base'];
  const host = document.body;
  let sx = 0, sy = 0, st = 0, active = false;
  host.addEventListener('touchstart', function(e){
    if(e.touches.length !== 1){ active = false; return; }
    const tgt = e.target;
    if(tgt && tgt.closest){
      if(tgt.closest('#joystick') || tgt.closest('#fire-btn') || tgt.closest('#heal-btn') ||
         tgt.closest('#modal-layer')){
        active = false; return;
      }
    }
    sx = e.touches[0].clientX;
    sy = e.touches[0].clientY;
    st = Date.now();
    active = true;
  }, {passive: true});
  host.addEventListener('touchcancel', function(){ active = false; });
  host.addEventListener('touchend', function(e){
    if(!active) return;
    active = false;
    if(!e.changedTouches || e.changedTouches.length !== 1) return;
    const dx = e.changedTouches[0].clientX - sx;
    const dy = e.changedTouches[0].clientY - sy;
    const dt = Date.now() - st;
    if(dt > 800) return;
    if(Math.abs(dx) < 60) return;
    if(Math.abs(dy) > Math.abs(dx) * 0.6) return;
    if(typeof BossModule !== 'undefined' && BossModule.isActive()) return;
    const _gp = document.getElementById('garage-page');
    if(_gp && _gp.classList.contains('on')) return;
    if(typeof currentTab !== 'string') return;
    const curIdx = TABS.indexOf(currentTab);
    if(curIdx < 0) return;
    const nextIdx = dx < 0 ? curIdx + 1 : curIdx - 1;
    if(nextIdx < 0 || nextIdx >= TABS.length) return;
    e.preventDefault();
    const target = document.querySelector('.tab[data-tab="' + TABS[nextIdx] + '"]');
    if(target) target.click();
  }, {passive: false});
})();

/* ===== 每 30 秒建築 tick ===== */
setInterval(function(){ buildingTick(); }, 30000);

/* ===== 玩家面板實時刷新 ===== */
function updatePlayerStatPanel(){
  const panel = document.querySelector('#zone2 .player-stat-panel');
  if(!panel) return;
  const _f = fmtNum;
  const lv = panel.querySelector('.lv-v');
  const hpv = panel.querySelector('.hp-v');
  const hpm = panel.querySelector('.hp-m');
  const apv = panel.querySelector('.ap-v');
  const apm = panel.querySelector('.ap-m');
  if(lv) lv.textContent = 'Lv.' + state.player.level;
  if(hpv) hpv.textContent = _f(state.player.hp);
  if(hpm) hpm.textContent = '/ ' + _f(state.player.maxHp);
  if(apv) apv.textContent = _f(state.player.armor);
  if(apm) apm.textContent = '/ ' + _f(state.player.maxArmor);
}

/* ===== 主循環 ===== */
function heroLoop(now){
  if(typeof window._tickHeroWalkSwitch === 'function') window._tickHeroWalkSwitch(now);
  updateHeroAnim(now);
  if(currentTab === 'explore'){
    renderExploreHeroCanvas();
    if(typeof window._exploreTick === 'function'){
      try { window._exploreTick(now); } catch(e){ console.warn('[exploreTick]', e); }
    }
  }
  if(!heroLoop._lastHpCheck || now - heroLoop._lastHpCheck > 500){
    heroLoop._lastHpCheck = now;
    const _sig = state.player.hp + '|' + state.player.maxHp + '|' + state.player.armor + '|' + state.player.maxArmor + '|' + state.player.level;
    if(heroLoop._lastSig !== _sig){
      heroLoop._lastSig = _sig;
      updatePlayerStatPanel();
    }
    var _spEl = document.getElementById('speed-display');
    if(_spEl && typeof window._calcSpeedDisplay === 'function'){
      var _spText = window._calcSpeedDisplay().toFixed(1) + ' m/s';
      if(_spEl.textContent !== _spText){ _spEl.textContent = _spText; }
    }
  }
  requestAnimationFrame(heroLoop);
}
requestAnimationFrame(heroLoop);

/* ===== 視窗大小 / 可見性 / 卸載 ===== */
window.addEventListener('resize', () => {
  if(currentTab === 'explore') renderExploreHeroCanvas();
  if(currentTab === 'combat' && BossModule.isActive()) {
    if(BossModule.battle) BossModule.battle.lastH = 0;
    renderBattleHeroCanvas();
    renderBossBattleCanvas();
  }
  if(currentTab === 'explore' || currentTab === 'combat') renderZone2Silhouette();
});

document.addEventListener('visibilitychange', () => {
  if(document.hidden){ save(); }
  else { offlineSettle(); refreshPlayerStats(); save(); renderCurrentTab(); }
});
window.addEventListener('beforeunload', save);

/* ===== 初始化 ===== */
function init(){
  const loaded = load();
  if(loaded){
    if(state.garden && Array.isArray(state.garden.battleLog)) state.garden.battleLog = [];
    const elapsed = Date.now() - (state.lastSeen || Date.now());
    if(elapsed > 60000){
      offlineSettle();
    }
  } else {
    invAddRaw('6kh2','一般',1);
    invAddRaw('bandage','一般',3);
    invAddRaw('ai2','一般',1);
    invAddRaw('5.45_ps','一般',30);
    invAddRaw('9x19_ap63','一般',16);
    state.player.equipped.melee='6kh2';
    state.player.equippedRarity.melee='一般';
    invRemove('6kh2','一般',1);
    state.player.equipped.backpack='bplarge';
    state.player.equippedRarity.backpack='傳奇';
    pushLog('<span class="pl">玩家</span> 在廢土中醒來，身上只有一把 <span class="r-一般">6Kh2 刺刀</span> 和一個 <span class="r-傳奇">探險背包</span>。',[],'explore');
  }
  refreshPlayerStats();
  if(state.player.hp <= 0) state.player.hp = state.player.maxHp;
  state.player.armor = Math.min(state.player.armor || 0, state.player.maxArmor);
  save();
  renderCurrentTab();
  setTimeout(function(){
    try{
      if(typeof preloadExploreBackgrounds === 'function'){
        preloadExploreBackgrounds();
      }
    }catch(e){ console.warn('[assets] 背景預載失敗', e); }
  }, 800);
  setTimeout(async ()=>{
    const changed = await probeAssetVersion();
    if(changed){
      renderCurrentTab();
      try{ if(typeof preloadExploreBackgrounds === 'function') preloadExploreBackgrounds(); }catch(e){}
    }
  }, 500);
}
init();

/* ===== 全局點擊物品詳情 ===== */
document.addEventListener('click', e => {
  const t = e.target.closest('.itm');
  if(t && t.dataset.iid) openItemDetail(t.dataset.iid, t.dataset.irar);
});

/* ===== 後院診斷 ===== */
window.__gpDiag = function(){
  const gp = document.getElementById('garden-page');
  const ct = document.getElementById('content');
  const tb = document.getElementById('tabbar');
  console.group('[rev563 garden diag]');
  if(gp){
    const cs = getComputedStyle(gp);
    const r = gp.getBoundingClientRect();
    console.log('%c garden-page', 'color:#e8a33d;font-weight:bold');
    console.log('  position:', cs.position);
    console.log('  rect: top=' + r.top + ' bottom=' + r.bottom + ' height=' + r.height);
    console.log('  offsetHeight:', gp.offsetHeight);
    console.log('  z-index:', cs.zIndex);
    console.log('  display:', cs.display);
  } else console.log('%c garden-page: NOT FOUND', 'color:#e05252');
  if(ct){
    const cs = getComputedStyle(ct);
    const r = ct.getBoundingClientRect();
    console.log('%c content', 'color:#4a90d9;font-weight:bold');
    console.log('  position:', cs.position);
    console.log('  rect: top=' + r.top + ' bottom=' + r.bottom + ' height=' + r.height);
    console.log('  clientHeight:', ct.clientHeight);
  }
  if(tb){
    const r = tb.getBoundingClientRect();
    console.log('%c tabbar', 'color:#a45ede;font-weight:bold');
    console.log('  rect: top=' + r.top + ' bottom=' + r.bottom + ' height=' + r.height);
  }
  if(gp && ct && tb){
    const gr = gp.getBoundingClientRect();
    const cr = ct.getBoundingClientRect();
    const tr = tb.getBoundingClientRect();
    console.log('%c 對比', 'color:#4caf50;font-weight:bold');
    console.log('  garden 底 = ' + gr.bottom.toFixed(1));
    console.log('  content 底 = ' + cr.bottom.toFixed(1));
    console.log('  tabbar 頂 = ' + tr.top.toFixed(1));
    console.log('  garden 底 vs content 底 差 = ' + (gr.bottom - cr.bottom).toFixed(2) + 'px（應 ≈ 0）');
    console.log('  content 底 vs tabbar 頂 差 = ' + (cr.bottom - tr.top).toFixed(2) + 'px（應 ≈ 0）');
  }
  console.groupEnd();
};

/* ===== 全局暴露 ===== */
window.WastelandGame = {
  VERSION,
  get state(){ return state; },
  save,
  renderCurrentTab,
  addProf,
  notify,
  offlineSettle,
  getMeleeHits,
  getOrCreateNamedItem,
  BossModule,
  probeAssetVersion,
  get assetVersion(){ return ASSET_VERSION; }
};

/* ===== 離線探索結算 ===== */
function _offlineExploreSettle(now, baseTime){
  var region = state.activeRegion || ((typeof getActiveRegions === 'function') ? getActiveRegions()[0] : '廢棄工廠');
  if(!region || !REGIONS[region]) return null;
  var R = REGIONS[region];
  var elapsedMs = Math.min(now - baseTime, 8 * 3600 * 1000);
  if(elapsedMs < 60000) return null;
  var walkSpeed = 1.4;
  var totalDist = (elapsedMs / 1000) * walkSpeed;
  var avgInterval = 24.5;
  var totalEvents = Math.floor(totalDist / avgInterval);
  var MAX_EVENTS = 300;
  if(totalEvents > MAX_EVENTS) totalEvents = MAX_EVENTS;
  if(totalEvents <= 0) return null;
  var regionTier = region.endsWith('II') ? 2 : 1;
  var _playerScore = (function(){
    var score = 0;
    var eq = state.player.equipped;
    for(var slot in eq){
      if(!eq[slot]) continue;
      var d = itemDef(eq[slot]);
      if(!d) continue;
      var rar = state.player.equippedRarity[slot] || '一般';
      var m = RARITY_MULT[rar] || 1;
      if(d.cal && typeof getDefaultAmmo === 'function' && typeof AMMO !== 'undefined'){
        var _defAmmoId = getDefaultAmmo(d.cal);
        if(_defAmmoId && AMMO[_defAmmoId] && AMMO[_defAmmoId].dmg){
          score += AMMO[_defAmmoId].dmg * m * 2;
        }
      }
      if(d.dmg != null) score += d.dmg * m * 2;
      if(d.rpm) score += d.rpm * 0.05;
      if(typeof equipArmorValue === 'function'){
        if(d.slot === 'head' || d.slot === 'top' || d.slot === 'pants' || d.slot === 'shoes'){
          score += equipArmorValue(eq[slot], rar) * 1.2;
        }
      }
    }
    var lvMult = 1 + (state.player.level - 1) * 0.1;
    return Math.max(10, score * lvMult);
  })();
  var _enemyScore = function(inst){
    var _dmg = (inst.dmg != null) ? inst.dmg
             : (inst.primaryWeapon && inst.primaryWeapon.dmg != null) ? inst.primaryWeapon.dmg
             : (inst.secondaryWeapon && inst.secondaryWeapon.dmg != null) ? inst.secondaryWeapon.dmg
             : 10;
    var _hp = inst.maxHp || 0;
    var _ar = inst.maxArmor || 0;
    return Math.max(1, _hp * 0.8 + _ar * 1.5 + _dmg * 3);
  };
  var wins = 0, losses = 0;
  var offlineServantGained = null;
  var allLoot = {};
  var searchCount = 0;
  var emptyCount = 0;
  var _lootAdd = function(loot){
    for(var li = 0; li < loot.length; li++){
      if(!loot[li] || !loot[li].id) continue;
      var k = loot[li].id + '@' + loot[li].rarity;
      if(!allLoot[k]) allLoot[k] = { id: loot[li].id, rarity: loot[li].rarity, count: 0 };
      allLoot[k].count += loot[li].count;
    }
  };
  /* rev-fix-offline-ammo: 靜態裝備分數（不含彈藥）+ 主武器口徑 */
  var _staticScore = (function(){
    var _s = 0;
    var _eq = state.player.equipped;
    for(var _slot in _eq){
      if(!_eq[_slot]) continue;
      var _d = itemDef(_eq[_slot]);
      if(!_d) continue;
      var _r = state.player.equippedRarity[_slot] || '一般';
      var _m = RARITY_MULT[_r] || 1;
      if(_d.dmg != null) _s += _d.dmg * _m * 2;
      if(_d.rpm) _s += _d.rpm * 0.05;
      if(typeof equipArmorValue === 'function'){
        if(_d.slot === 'head' || _d.slot === 'top' || _d.slot === 'pants' || _d.slot === 'shoes'){
          _s += equipArmorValue(_eq[_slot], _r) * 1.2;
        }
      }
    }
    var _lvM = 1 + (state.player.level - 1) * 0.1;
    return Math.max(10, _s * _lvM);
  })();
  var _mainCal = null;
  var _pw = state.player.equipped.primary;
  var _sw = state.player.equipped.secondary;
  if(_pw){ var _pd = itemDef(_pw); if(_pd && _pd.cal) _mainCal = _pd.cal; }
  if(!_mainCal && _sw){ var _sd = itemDef(_sw); if(_sd && _sd.cal) _mainCal = _sd.cal; }

  for(var i = 0; i < totalEvents; i++){
    var r = Math.random();
    if(r < 0.60){
      var n=(window._enemyCountForRegion?window._enemyCountForRegion(region):(1+Math.floor(Math.random()*3)));
      var eventScore = 0;
      var eventEnemies = [];
      for(var ei = 0; ei < n; ei++){
        var eid = pick(R.enemies);
        var inst = (typeof generateEnemyInstance === 'function') ? generateEnemyInstance(eid, regionTier) : null;
        if(!inst) continue;
        eventScore += _enemyScore(inst);
        eventEnemies.push(inst);
      }
      if(!eventEnemies.length) continue;
      if(!isFinite(eventScore) || eventScore <= 0) eventScore = 100;
      /* rev-fix-offline-ammo: 用偏好彈藥計算戰力 */
      var _ammoRef = null;
      if(_mainCal && typeof pickAmmoByPreferenceOrOrder === 'function'){
        _ammoRef = pickAmmoByPreferenceOrOrder(_mainCal, 'explore');
      }
      var _eventPlayerScore = _staticScore;
      if(_ammoRef && _ammoRef.def){
        var _aM = RARITY_MULT[_ammoRef.rarity] || 1;
        _eventPlayerScore += _ammoRef.def.dmg * _aM * 2 + (_ammoRef.def.penMM || 0) * 5;
      } else if(state.player.equipped.melee){
        var _mDef = itemDef(state.player.equipped.melee);
        if(_mDef) _eventPlayerScore += (_mDef.dmg || 25) * 2;
      }
      var winRate = _eventPlayerScore / (_eventPlayerScore + eventScore);
      if(!isFinite(winRate)) winRate = 0.5;
      if(winRate < 0.05) winRate = 0.05;
      if(winRate > 0.95) winRate = 0.95;
      if(Math.random() < winRate){
        wins++;
        /* rev-fix-offline-ammo: 扣除彈藥 */
        if(_ammoRef){
          var _need = Math.ceil(n * 5);
          var _take = Math.min(_need, _ammoRef.count);
          if(_take > 0) invRemove(_ammoRef.id, _ammoRef.rarity, _take);
        }
        /* rev-fix-offline-servant: 2% 掉僕人（與在線一致） */
        if(Math.random() < 0.02 && typeof grantRandomServant === 'function'){
          var _srv = grantRandomServant();
          if(_srv && !offlineServantGained) offlineServantGained = _srv;
        }
        for(var ei2 = 0; ei2 < eventEnemies.length; ei2++){
          var loot = (typeof rollEnemyLoot === 'function') ? rollEnemyLoot(eventEnemies[ei2]) : [];
          _lootAdd(loot);
        }
      } else {
        losses++;
      }
    } else if(r < 0.85){
      /* rev-fix-offline-search: 與在線一致，1~3 種 */
      searchCount++;
      var _nSearch = 1 + Math.floor(Math.random() * 3);
      for(var _si = 0; _si < _nSearch; _si++){
        var drop = (typeof rollRegionDrop === 'function') ? rollRegionDrop(region) : null;
        if(drop){
          var cnt = 1 + Math.floor(Math.random() * 3);
          _lootAdd([{ id: drop.id, rarity: drop.rarity, count: cnt }]);
        }
      }
    } else {
      emptyCount++;
    }
  }
  var items = [];
  for(var k in allLoot){
    var it = allLoot[k];
    invAdd(it.id, it.rarity, it.count);
    items.push(it);
  }
  var exp = wins * 3;
  if(exp > 0 && typeof addExp === 'function'){
    try{ addExp(exp); }catch(e){}
  }
  return {
    region: region,
    elapsedMs: elapsedMs,
    totalDist: Math.round(totalDist),
    totalEvents: totalEvents,
    wins: wins,
    losses: losses,
    searchCount: searchCount,
    emptyCount: emptyCount,
    items: items,
    exp: exp,
    servant: offlineServantGained
  };
}

/* ===== 離線結算總調度 ===== */
function offlineSettle(){
  var now = Date.now();
  var lastLogTime = state.logs.length ? state.logs[state.logs.length-1].t : 0;
  var baseTime = Math.max(state.lastSeen || 0, lastLogTime);
  var elapsed = now - baseTime;
  if(elapsed < 60000){ state.lastSeen = now; return 0; }
  var maxMs = 8 * 3600 * 1000;
  var effMs = Math.min(elapsed, maxMs);
  var buildingResults = { radioCount: 0, armoryCount: 0 };
  try {
    if(typeof _offlineBuildingSettle === 'function') buildingResults = _offlineBuildingSettle(now, baseTime);
  } catch(e){ console.warn('[offline] building', e); }
  if(typeof _gardenOfflineSettle === 'function'){
    try{ _gardenOfflineSettle(now, baseTime); }catch(e){ console.warn('[offline] garden', e); }
  }
  var exploreResult = null;
  try {
    exploreResult = _offlineExploreSettle(now, baseTime);
  } catch(e){ console.warn('[offline] explore', e); }
  var overtime = elapsed > maxMs;
  var summary = '離線 ' + (elapsed/3600000).toFixed(1) + ' 小時。';
  if(buildingResults.radioCount > 0 || buildingResults.armoryCount > 0){
    var parts = [];
    if(buildingResults.radioCount > 0) parts.push('無線電×' + buildingResults.radioCount);
    if(buildingResults.armoryCount > 0) parts.push('軍械庫×' + buildingResults.armoryCount);
    summary += ' 建築產出：' + parts.join('、') + '。';
  }
  if(exploreResult && exploreResult.totalEvents > 0){
    var _ep = [];
    if(exploreResult.wins + exploreResult.losses > 0) _ep.push('戰 ' + exploreResult.wins + '勝/' + exploreResult.losses + '敗');
    if(exploreResult.searchCount > 0) _ep.push('搜 ' + exploreResult.searchCount + ' 次');
    if(exploreResult.items.length > 0){
      var _cnt = 0;
      for(var _i = 0; _i < exploreResult.items.length; _i++) _cnt += exploreResult.items[_i].count;
      _ep.push('獲 ' + _cnt + ' 件');
    }
    if(exploreResult.exp > 0) _ep.push('經驗 +' + exploreResult.exp);
    if(exploreResult.servant){
      var _sdef = (typeof SERVANT_TYPES !== 'undefined' && SERVANT_TYPES[exploreResult.servant.type]) ? SERVANT_TYPES[exploreResult.servant.type] : null;
      _ep.push('招募了 <b class="r-' + exploreResult.servant.rarity + '">' + (_sdef ? _sdef.name : '僕人') + '</b>');
    }
    if(_ep.length) summary += ' ' + exploreResult.region + '：' + _ep.join(' · ') + '。';
  }
  if(overtime) summary += '（超過 8 小時，已進入休息模式）';
  state.logs.push({ t: now, html: '<b style="color:#4a90d9">[離線摘要]</b> ' + summary, items: exploreResult ? exploreResult.items : [], type: 'offline' });
  state.lastSeen = now;
  save();
  return 0;
}


/* 兜底：fmtItemSpan（缺失補丁） */
if(typeof window.fmtItemSpan === "undefined"){
  window.fmtItemSpan = function(id, r, c){
    var d = (typeof itemDef === "function") ? itemDef(id) : null;
    var nm = d ? d.name : id;
    var rc = (typeof rarityClass === "function") ? rarityClass(r) : "r-" + r;
    return '<span class="' + rc + ' itm" data-iid="' + id + '" data-irar="' + r + '">' + nm + '*' + c + '</span>';
  };
}

/* 兜底：buildingTick（缺失補丁，完整版） */
window.buildingTick = function(){
  var now = Date.now();
  var genLv = getBuildingLv("generator");
  var genMult = 1 + genLv * 0.2;
  var radioLv = getBuildingLv("radio");
  if(radioLv > 0){
    var rLast = state.radioLastTick || 0;
    var rInt = 5 * 60 * 1000 / genMult;
    if(now - rLast >= rInt){
      var times = Math.floor((now - rLast) / rInt);
      var mats = ["wood","metal","screws","cloth","gears","electronics"];
      for(var i=0; i<times; i++){
        var m = pick(mats);
        var cnt = rndInt(3, 8) * radioLv;
        invAdd(m, "一般", cnt);
      }
      state.radioLastTick = rLast + times * rInt;
    }
  }
  var armoryLv = getBuildingLv("armory");
  if(armoryLv > 0){
    var aLast = state.armoryLastTick || 0;
    var aInt = 3 * 60 * 1000 / genMult;
    if(now - aLast >= aInt){
      var times = Math.floor((now - aLast) / aInt);
      var tRar = "一般";
      if(armoryLv <= 10) tRar = "破舊"; else if(armoryLv <= 20) tRar = "一般"; else if(armoryLv <= 35) tRar = "庫存"; else tRar = "精品";
      var _ti = RARITY_ORDER.indexOf(tRar);
      var pw = equippedWeapon("primary");
      var sw = equippedWeapon("secondary");
      var cals = [];
      if(pw && pw.def.cal) cals.push(pw.def.cal);
      if(sw && sw.def.cal && (!pw || sw.def.cal !== pw.def.cal)) cals.push(sw.def.cal);
      if(!cals.length) cals.push("9x19");
      for(var t=0; t<times; t++){
        for(var ci=0; ci<cals.length; ci++){
          var cal = cals[ci];
          var ammos = Object.keys(AMMO).filter(function(k){ return AMMO[k].cal === cal; });
          if(!ammos.length) continue;
          var cands = [];
          var minD = 999;
          for(var ai=0; ai<ammos.length; ai++){
            var aIdx = RARITY_ORDER.indexOf(AMMO[ammos[ai]].rarity);
            if(aIdx < 0) continue;
            var dd = Math.abs(aIdx - _ti);
            if(dd < minD){ minD = dd; cands.length = 0; cands.push(ammos[ai]); }
            else if(dd === minD){ cands.push(ammos[ai]); }
          }
          if(cands.length){
            var chosen = cands[0];
            var acnt = rndInt(5, 10) * Math.max(1, Math.ceil(armoryLv / 5));
            invAdd(chosen, AMMO[chosen].rarity, acnt);
          }
        }
      }
      state.armoryLastTick = aLast + times * aInt;
    }
  }
  if(typeof processCrafting === "function") processCrafting();
  if(typeof _gardenMealTick === "function"){ try{ _gardenMealTick(now); }catch(e){} }
  if(typeof _gardenFarmBackgroundTick === "function"){ try{ _gardenFarmBackgroundTick(now); }catch(e){} }
  if(typeof _gardenStorageRotCheck === "function"){ try{ _gardenStorageRotCheck(); }catch(e){} }
};


/* 補丁 v5：_calcSpeedDisplay 覆蓋（arrive/sink/center/support/lift/exit 都顯示載具速度） */
window._calcSpeedDisplay = function(){
  var b = window.BTRSupport;
  if(b && b.active){
    var ph = b.phase;
    if(ph === 'arrive' || ph === 'sink' || ph === 'center' || ph === 'support' || ph === 'lift' || ph === 'exit'){
      var g = (typeof _garageInitState === 'function') ? _garageInitState() : null;
      var vid = g ? g.currentVehicle : 'btr80';
      var s = 80;
      if(typeof VEHICLES !== 'undefined' && VEHICLES[vid] && VEHICLES[vid].speedRoad) s = VEHICLES[vid].speedRoad;
      if(typeof hasCrewTalent === 'function' && hasCrewTalent('driver', 'driver_instinct')) s *= 1.10;
      return s / 3.6;
    }
  }
  var w = (typeof getTotalWeight === 'function') ? getTotalWeight() : 0;
  var _free = (typeof WEIGHT_FREE_KG !== 'undefined') ? WEIGHT_FREE_KG : 20;
  var _pen = (typeof WEIGHT_PENALTY_PER_KG !== 'undefined') ? WEIGHT_PENALTY_PER_KG : 0.05;
  var _extra = Math.max(0, w - _free);
  return 1.4 / (1 + _extra * _pen);
};

/* [Patch] 補全工作台改造結算 */
function processCrafting(){
  if(!state.crafting || !state.crafting.length) return;
  const now = Date.now();
  const genLv = (typeof getBuildingLv === 'function') ? getBuildingLv('generator') : 0;
  const sm = 1 + genLv * 0.2;
  for(let i = state.crafting.length - 1; i >= 0; i--){
    const c = state.crafting[i];
    if(c.type === 'mod'){
      const t = c.time * 1000 / sm;
      if(now - c.startTime >= t){
        const info = c.modInfo;
        const namedId = getOrCreateNamedItem(info.baseId, info.mag, info.scope);
        if(info.fromEquippedSlot){
          if(!state.player.equipped[info.fromEquippedSlot]){
            state.player.equipped[info.fromEquippedSlot] = namedId;
            state.player.equippedRarity[info.fromEquippedSlot] = '具名';
          } else {
            invAddRaw(namedId, '具名', 1);
            pushLog('<span class="pl">系統</span> 改造完成：<b class="r-具名">' + itemDef(namedId).name + '</b> 已放入背包（原槽位已被佔用）。', [], 'explore');
          }
        } else {
          if(info.originalId) invRemove(info.originalId, info.originalRarity, 1);
          invAddRaw(namedId, '具名', 1);
        }
        pushLog('<span class="pl">玩家</span> 完成改造：<b class="r-具名">' + itemDef(namedId).name + '</b>。', [], 'explore');
        state.crafting.splice(i, 1);
        if (typeof addProf === 'function') addProf('craft', 1);
        if (typeof refreshPlayerStats === 'function') refreshPlayerStats();
        if (typeof save === 'function') save();
      }
    }
  }
}

/* [Patch] 補全離線建築產出 */
function _offlineBuildingSettle(now, baseTime){
  const genLv = getBuildingLv('generator');
  const genMult = 1 + genLv * 0.2;
  let radioCount = 0;
  let armoryCount = 0;

  const radioLv = getBuildingLv('radio');
  if(radioLv > 0){
    const interval = 5 * 60 * 1000 / genMult;
    const last = Math.max(state.radioLastTick || 0, baseTime);
    if(now - last >= interval){
      const times = Math.floor((now - last) / interval);
      const mats = ['wood','metal','screws','cloth','gears','electronics'];
      for(let i = 0; i < times; i++){
        const m = pick(mats);
        const cnt = rndInt(3, 8) * radioLv;
        invAdd(m, '一般', cnt);
      }
      radioCount = times;
      state.radioLastTick = last + times * interval;
    }
  }

  const armoryLv = getBuildingLv('armory');
  if(armoryLv > 0){
    const interval = 3 * 60 * 1000 / genMult;
    const last = Math.max(state.armoryLastTick || 0, baseTime);
    if(now - last >= interval){
      const times = Math.floor((now - last) / interval);
      let targetRarity = '一般';
      if(armoryLv<=10)targetRarity='破舊'; else if(armoryLv<=20)targetRarity='一般'; else if(armoryLv<=35)targetRarity='庫存'; else targetRarity='精品';
      const _targetIdx = RARITY_ORDER.indexOf(targetRarity);
      const pw = equippedWeapon('primary'), sw = equippedWeapon('secondary');
      const cals = [];
      if(pw && pw.def.cal) cals.push(pw.def.cal);
      if(sw && sw.def.cal && (!pw || sw.def.cal !== pw.def.cal)) cals.push(sw.def.cal);
      if(!cals.length) cals.push('9x19');
      for(let i = 0; i < times; i++){
        for(const cal of cals){
          const ammos = Object.keys(AMMO).filter(k => AMMO[k].cal === cal);
          if(!ammos.length) continue;
          const _cands = [];
          let _minDiff = 999;
          for(const a of ammos){
            const aIdx = RARITY_ORDER.indexOf(AMMO[a].rarity);
            if(aIdx < 0) continue;
            const d = Math.abs(aIdx - _targetIdx);
            if(d < _minDiff){ _minDiff = d; _cands.length = 0; _cands.push(a); }
            else if(d === _minDiff){ _cands.push(a); }
          }
          if(_cands.length){
            const chosen = _cands[0];
            const cnt = rndInt(5, 10) * Math.max(1, Math.ceil(armoryLv / 5));
            invAdd(chosen, AMMO[chosen].rarity, cnt);
          }
        }
      }
      armoryCount = times;
      state.armoryLastTick = last + times * interval;
    }
  }
  processCrafting();
  return { radioCount, armoryCount };
}

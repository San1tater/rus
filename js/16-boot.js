// [rev825] 修復導航切換與車場關閉
/* ============================================================
   06-core.js — 啟動 / 路由 / 全局事件
   由 06-part.js 拆解而來（rev343）
   ============================================================ */
let currentTab='explore';
let _sceneFadeTimer = null;
function _applySceneFadeIn(){
  ['zone1','zone2','zone3'].forEach(function(id){
    const el=document.getElementById(id);
    if(!el)return;
    el.classList.remove('scene-enter');
    void el.offsetWidth;
    el.classList.add('scene-enter');
  });
  if(_sceneFadeTimer) clearTimeout(_sceneFadeTimer);
  _sceneFadeTimer = setTimeout(function(){
    ['zone1','zone2','zone3'].forEach(function(id){
      const el=document.getElementById(id);
      if(el)el.classList.remove('scene-enter');
    });
    _sceneFadeTimer = null;
  }, 320);
}
function renderCurrentTab(){
  /* ★ 切頁先清理舊戰鬥殘留（距離框 / 彈道 canvas）；但 BTR 支援進行中時保留 _combat */
  var _btrActive = !!(window.BTRSupport && window.BTRSupport.active);
  if(!_btrActive && typeof window._combatCleanup === 'function'){
    try { window._combatCleanup(); } catch(e){ console.warn('[combatCleanup]', e); }
  }
  if(currentTab==='explore')renderExplore();
  else if(currentTab==='combat')renderCombat();
  else if(currentTab==='base')renderBase();
  _applySceneFadeIn();
}
/* _combatCleanupInTabSwitch marker */
$$('.tab').forEach(t=>{
  t.onclick=()=>{
    if(BossModule.isActive()){if(!confirm('戰鬥尚未結束，確定要離開嗎？'))return;BossModule.battle.active=false;BossModule.battle=null;}
    const _prevTab = currentTab;
    const _nextTab = t.dataset.tab;
    /* rev321: 後院為獨立 tab（overlay），切走時關閉 */
    if(_prevTab === 'garden' && _nextTab !== 'garden'){
      if(typeof closeGarden === 'function') closeGarden();
    }
    /* [rev825] 關閉車場覆蓋層 */
    if(typeof closeGaragePage === 'function'){ closeGaragePage(); }
    /* v17.5 車站：與車場一致，切 tab 即關閉 */
    if(typeof closeStationPage === 'function'){ closeStationPage(); }
    currentTab=_nextTab;
    /* 切換頁面時若新頁不是 explore/combat，強制清理戰鬥；但若 BTR 支援進行中則保留（切回時自動恢復） */
    if(_nextTab !== 'explore' && _nextTab !== 'combat'){
      var _btrActive = !!(window.BTRSupport && window.BTRSupport.active);
      if(!_btrActive && typeof window._combatCleanup === 'function'){
        try { window._combatCleanup(); } catch(_){}
      }
    }
    if(currentTab==='base') _regionScrollPos=0;
    $$('.tab').forEach(x=>x.classList.toggle('active',x===t));
    if(currentTab === 'garden'){
      if(typeof openGarden === 'function') openGarden();
    } else {
      renderCurrentTab();
    }
  };
});

/* rev558: 主 tabbar 左右滑動切換（探索 / 戰鬥 / 後院 / 基地）
   監聽 document.body 而非 #content，使 garden-page overlay 也能触發 */
(function(){
  if(window._mainTabSwipeVer === 558) return;
  window._mainTabSwipeVer = 558;
  const TABS = ['explore', 'combat', 'garden', 'base'];
  const host = document.body;
  let sx=0, sy=0, st=0, active=false;
  host.addEventListener('touchstart', function(e){
    if(e.touches.length !== 1){ active=false; return; }
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
    /* rev559: Boss 戰進行中禁用滑動翻頁 */
    if(typeof BossModule !== 'undefined' && BossModule.isActive()) return;
    /* rev889: 車場頁開啟時禁用主 tab 滑動切換 */
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

let lastTickTime=Date.now();

let _tickTimer = null;
/* v17.5: 由新探索接管 */
setInterval(()=>{buildingTick();},30000);

let _heroWalkSwitchAt = 0;
function _tickHeroWalkSwitch(now){ if(true)return;
  if(_heroWalkSwitchAt === 0){
    _heroWalkSwitchAt = now + 3000 + Math.random() * 3000;
    return;
  }
  if(now < _heroWalkSwitchAt) return;
  _heroWalkSwitchAt = now + 3000 + Math.random() * 3000;
  /* 僅在探索、且沒在播放 oneshot 動畫時切換 */
  if(currentTab !== 'explore') return;
  if(heroAnim.eqSlot) return;
  if(heroAnim.name === 'walk'){ heroAnim.name = 'run'; heroAnim.frame = 0; heroAnim.lastUpdate = now; }
  else if(heroAnim.name === 'run'){ heroAnim.name = 'walk'; heroAnim.frame = 0; heroAnim.lastUpdate = now; }
}
/* rev337: HP / 護甲面板實時刷新（不依赖切 tab） */
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
function heroLoop(now){
  _tickHeroWalkSwitch(now);
  updateHeroAnim(now);
  if(currentTab === 'explore'){
    renderExploreHeroCanvas();
    if(typeof window._exploreTick === 'function'){
      try { window._exploreTick(now); } catch(e){ console.warn('[exploreTick]', e); }
    }
  }
  /* rev337: 每 500ms 检测 HP/護甲/等級变化，實時刷新面板 */
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

window.addEventListener('resize', () => {
  if(currentTab === 'explore') renderExploreHeroCanvas();
  if(currentTab === 'combat' && BossModule.isActive()) {
    if(BossModule.battle) BossModule.battle.lastH = 0;
    renderBattleHeroCanvas();
    renderBossBattleCanvas();
  }
  if(currentTab === 'explore' || currentTab === 'combat') renderZone2Silhouette();
});

document.addEventListener('visibilitychange',()=>{if(document.hidden){save();}else{offlineSettle();refreshPlayerStats();save();renderCurrentTab();}});
window.addEventListener('beforeunload',save);

function init(){
  const loaded=load();
  if(loaded){
    /* rev309b: 後院戰鬥日誌只保留本次上線期間的記錄 */
    if(state.garden && Array.isArray(state.garden.battleLog)) state.garden.battleLog = [];
    const elapsed=Date.now()-(state.lastSeen||Date.now());
    if(elapsed>60000){console.log('[init] 距上次儲存',(elapsed/1000).toFixed(1),'秒，觸發離線結算');offlineSettle();}
  } else {
    invAddRaw('6kh2','一般',1);
    invAddRaw('bandage','一般',3);
    invAddRaw('ai2','一般',1);
    invAddRaw('5.45_ps','一般',30);
    invAddRaw('9x19_ap63','一般',16); /* rev332: 原 9x19_ps 不存在，修正為合法 9x19 AP 6.3 */
    state.player.equipped.melee='6kh2';
    state.player.equippedRarity.melee='一般';
    invRemove('6kh2','一般',1);
    state.player.equipped.backpack='bplarge';
    state.player.equippedRarity.backpack='傳奇';
    pushLog('<span class="pl">玩家</span> 在廢土中醒來，身上只有一把 <span class="r-一般">6Kh2 刺刀</span> 和一個 <span class="r-傳奇">探險背包</span>。',[],'explore');
  }
  refreshPlayerStats();
  if(state.player.hp<=0)state.player.hp=state.player.maxHp;
  state.player.armor=Math.min(state.player.armor||0,state.player.maxArmor);
  lastTickTime=Date.now();
  save();renderCurrentTab();
  /* rev106: 提前預載探索背景圖，避免播放時才下載造成閃爍 */
  setTimeout(function(){
    try{
      if(typeof preloadExploreBackgrounds === 'function'){
        const _queued = preloadExploreBackgrounds();
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

document.addEventListener('click',e=>{
  const t=e.target.closest('.itm');
  if(t&&t.dataset.iid)openItemDetail(t.dataset.iid,t.dataset.irar);
});


/* ===== rev563: 後院頁診斷（console 執行 __gpDiag()） ===== */
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
/* ===== end rev563 diag ===== */

window.WastelandGame={VERSION,get state(){return state;},save,renderCurrentTab,addProf,notify,offlineSettle,getMeleeHits,getOrCreateNamedItem,BossModule,probeAssetVersion,get assetVersion(){return ASSET_VERSION;}};
/* v17.5 重構：舊調度器已刪除 */


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
      if(d.dmg) score += d.dmg * m * 2;
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
    return Math.max(1, inst.maxHp * 0.8 + inst.maxArmor * 1.5 + inst.dmg * 3);
  };
  var wins = 0, losses = 0;
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
      var winRate = _playerScore / (_playerScore + eventScore);
      if(winRate < 0.05) winRate = 0.05;
      if(winRate > 0.95) winRate = 0.95;
      if(Math.random() < winRate){
        wins++;
        for(var ei2 = 0; ei2 < eventEnemies.length; ei2++){
          var loot = (typeof rollEnemyLoot === 'function') ? rollEnemyLoot(eventEnemies[ei2]) : [];
          _lootAdd(loot);
        }
      } else {
        losses++;
      }
    } else if(r < 0.85){
      searchCount++;
      var drop = (typeof rollRegionDrop === 'function') ? rollRegionDrop(region) : null;
      if(drop){
        var cnt = 1 + Math.floor(Math.random() * 3);
        _lootAdd([{ id: drop.id, rarity: drop.rarity, count: cnt }]);
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
    exp: exp
  };
}

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
    if(_ep.length) summary += ' ' + exploreResult.region + '：' + _ep.join(' · ') + '。';
  }
  if(overtime) summary += '（超過 8 小時，已進入休息模式）';
  state.logs.push({ t: now, html: '<b style="color:#4a90d9">[離線摘要]</b> ' + summary, items: exploreResult ? exploreResult.items : [], type: 'offline' });
  state.lastSeen = now;
  save();
  return 0;
}

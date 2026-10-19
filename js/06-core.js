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
  if(currentTab==='explore')renderExplore();
  else if(currentTab==='combat')renderCombat();
  else if(currentTab==='base')renderBase();
  _applySceneFadeIn();
}
$$('.tab').forEach(t=>{
  t.onclick=()=>{
    if(BossModule.isActive()){if(!confirm('戰鬥尚未結束，確定要離開嗎？'))return;BossModule.battle.active=false;BossModule.battle=null;}
    const _prevTab = currentTab;
    const _nextTab = t.dataset.tab;
    /* rev321: 後院為獨立 tab（overlay），切走時關閉 */
    if(_prevTab === 'garden' && _nextTab !== 'garden'){
      if(typeof closeGarden === 'function') closeGarden();
    }
    currentTab=_nextTab;
    if(currentTab==='base') _regionScrollPos=0;
    $$('.tab').forEach(x=>x.classList.toggle('active',x===t));
    if(currentTab === 'garden'){
      if(typeof openGarden === 'function') openGarden();
    } else {
      renderCurrentTab();
    }
  };
});

/* rev558: 主 tabbar 左右滑动切换（探索 / 战斗 / 后院 / 基地）
   监听 document.body 而非 #content，使 garden-page overlay 也能触发 */
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
function onlineTick(){
  const now=Date.now();const dt=now-lastTickTime;lastTickTime=now;
  if(dt>EVENT_INTERVAL_MS*2){console.log('[tick] 偵測到離線中斷，時間差:',(dt/1000).toFixed(1),'秒');offlineSettle();return;}
  if(BossModule.isActive())return;
  doExploreTick();
}

let _tickTimer = null;
function _getNextDelay(){
  /* v59-delay-add: 治療延遲疊加在基礎探索時長上 */
  const now = Date.now();
  const interval = getExploreInterval();
  if(state.exploreDelayUntil && state.exploreDelayUntil > now){
    return interval + (state.exploreDelayUntil - now);
  }
  return interval;
}
function _scheduleNextTick(){
  if(_tickTimer) clearTimeout(_tickTimer);
  _tickTimer = setTimeout(()=>{
    const now = Date.now();
    let dt = now - lastTickTime;
    lastTickTime = now;
    /* rev332: 死亡冷卻恢復必須先於任何離線判斷 */
    if(state.exploreDelayUntil && now >= state.exploreDelayUntil){
      state.exploreDelayUntil = 0;
      if(state.pendingHealFull){
        state.player.hp = state.player.maxHp;
        state.player.armor = state.player.maxArmor;
        state.pendingHealFull = false;
        refreshPlayerStats();
      }
      dt = 0;
    }
    if(state.exploreDelayUntil && now < state.exploreDelayUntil){
      _scheduleNextTick();
      return;
    }
    const maxInterval = Math.max(getExploreInterval(), EVENT_INTERVAL_MS);
    if(dt > maxInterval*3){
      offlineSettle();
      _scheduleNextTick();
      return;
    }
    if(BossModule.isActive()){
      _scheduleNextTick();
      return;
    }
    doExploreTick();
    save();
    _scheduleNextTick();
  }, _getNextDelay());
}
_scheduleNextTick();
setInterval(()=>{buildingTick();},30000);

let _heroWalkSwitchAt = 0;
function _tickHeroWalkSwitch(now){
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
/* rev337: HP / 护甲面板实时刷新（不依赖切 tab） */
function updatePlayerStatPanel(){
  const panel = document.querySelector('#zone2 .player-stat-panel');
  if(!panel) return;
  const _f = function(v){ v = Math.round(v); if(v >= 1e7) return Math.round(v/1e6) + 'M'; if(v >= 1e6) return (v/1e6).toFixed(1) + 'M'; if(v >= 1e4) return Math.round(v/1e3) + 'K'; return v.toString(); };
  const lv = panel.querySelector('.lv-v');
  const hpv = panel.querySelector('.hp-v');
  const hpm = panel.querySelector('.hp-m');
  const apv = panel.querySelector('.ap-v');
  const apm = panel.querySelector('.ap-m');
  if(lv) lv.textContent = 'Lv.' + state.player.level;
  if(hpv) hpv.textContent = _f(state.player.hp);
  if(hpm) hpm.textContent = _f(state.player.maxHp);
  if(apv) apv.textContent = _f(state.player.armor);
  if(apm) apm.textContent = _f(state.player.maxArmor);
}
function heroLoop(now){
  _tickHeroWalkSwitch(now);
  updateHeroAnim(now);
  if(currentTab === 'explore'){ renderExploreHeroCanvas(); }
  /* rev337: 每 500ms 检测 HP/护甲/等级变化，实时刷新面板 */
  if(!heroLoop._lastHpCheck || now - heroLoop._lastHpCheck > 500){
    heroLoop._lastHpCheck = now;
    const _sig = state.player.hp + '|' + state.player.maxHp + '|' + state.player.armor + '|' + state.player.maxArmor + '|' + state.player.level;
    if(heroLoop._lastSig !== _sig){
      heroLoop._lastSig = _sig;
      updatePlayerStatPanel();
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

window.WastelandGame={VERSION,get state(){return state;},save,renderCurrentTab,addProf,notify,offlineSettle,getMeleeHits,getOrCreateNamedItem,BossModule,probeAssetVersion,get assetVersion(){return ASSET_VERSION;}};
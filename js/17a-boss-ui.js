
'use strict';

/* rev-boss-world: Boss 戰世界米座標常量 */
const BOSS_SAFE_ZONE_M = 5;
const BOSS_WORLD_START = 95;
const BOSS_DETECT_R = 80;
const BOSS_ENGAGED_RANGE = 15;
const PLAYER_MOVE_SPEED_MPS = 5;
const BOSS_RANGE_M = 4.5;
const BOSS_RANGE_M_II = 5.5;
const BOSS_RANGE_M_HYDRA = 7.0;
const BOSS_SWIPE_RANGE_M = 12;
const BOSS_MIN_GAP_M = 2.5;
const BOSS_HALF_WIDTH_M = 2.0;
const BOSS_NORM_TO_M = 40;
/* Boss 戰 UI 幾何（寫死；源自人偶繪製比例，不隨動畫 / 頭盔變動）
   腳底 = H×0.95；裸頭頂 = H×(0.95 − 455.74/386 × CHAR_HEIGHT_FACTOR) = H×0.2652
   HUD 中心 = 裸頭頂與螢幕頂的中點 = H×0.1326（styles.css .hpbar-wrap top）
   視覺中心 = (0.2652 + 0.95)/2 = 0.6076（火花 / 飄字 fallback） */

/* rev-boss-world: 覆蓋舊版 */
function playBossOneshot(animName, opts){
  if(typeof battle==='undefined'||!battle||!BOSS_ANIMS[battle.bossId]) return;
  var a=BOSS_ANIMS[battle.bossId][animName]; if(!a) return;
  if(typeof opts==='number') opts={totalMs:opts}; /* 舊 durationMs 呼叫（alert）相容 */
  opts=opts||{};
  if(battle._atkTL&&battle._atkTL.active) return;
  var cur=BOSS_ANIMS[battle.bossId][battleBossAnim.name];
  /* rev-animatk: 保護改判 loop===false + cancelFrom，刪名字白名單（熔爐雷射恢復） */
  if(cur&&cur.loop===false&&battleBossAnim.frame<(battleBossAnim._cancelFrom||cur.frameCount)) return;
  if(typeof window._bossAttackStart==='function'){
    window._bossAttackStart({
      anim:animName, kind:opts.kind||'pose',
      windupMs:opts.totalMs||opts.windupMs||Math.round(a.frameCount*1000/a.fps),
      hitFrame:opts.hitFrame, startFrame:opts.startFrame,
      onContact:opts.onContact, onComplete:opts.onComplete
    });
  }
}
function isAimPartInRange(){
  if(typeof battle === 'undefined' || !battle) return false;
  /* rev-detect: 唯一開火閘門 = 已發現 且 進入射程。
     發現用中心距 <= R_boss；射程沿用「到 Boss 近邊緣」語義，
     故把 BOSS_HALF_WIDTH_M 補進射程 —— 否則近戰 0.75m 在
     BOSS_MIN_GAP_M = 2.5 的限制下永遠打不到 Boss。 */
  var distC = Math.abs(battle.bossWorldX - battle.playerWorldX);
  var R = (typeof window._bossDetectableR === 'function') ? window._bossDetectableR(battle.bossId) : 70;
  var range = (battle.playerWeaponRangeM || 30) + BOSS_HALF_WIDTH_M;
  return (typeof window.canEngage === 'function') ? window.canEngage(range, R, distC) : (distC <= R && distC <= range);
}
function getBossLeftBoundaryN(){
  if(typeof battle === 'undefined' || !battle) return 0;
  const sm = battle.sm || { screenRightWorld: 4.2 };
  const srw = sm.screenRightWorld || 4.2;
  const px = (typeof EXPLORE_HERO_X_RATIO === 'number') ? EXPLORE_HERO_X_RATIO : 0.25;
  const _bossLeftWX = battle.bossWorldX - BOSS_HALF_WIDTH_M;
  const _rel = _bossLeftWX - battle.playerWorldX;
  return px + _rel / srw * (1 - px);
}
function getPlayerRightBoundaryN(){
  if(typeof battle === 'undefined' || !battle) return 0.25;
  const sm = battle.sm || { screenRightWorld: 4.2 };
  const srw = sm.screenRightWorld || 4.2;
  const px = (typeof EXPLORE_HERO_X_RATIO === 'number') ? EXPLORE_HERO_X_RATIO : 0.25;
  const _playerHalfM = 0.3;
  return px + _playerHalfM / srw * (1 - px);
}

let battle = null;

/* rev-fix-boss-throw-origin: Boss 戰投雷起點 = attack_melee 釋放幀的手部位置 */
/* rev-fix-boss-throw-origin: Boss 戰投雷起點 = attack_melee 釋放幀的手部位置
 * 具體計算委託 window.getCharLayerCornerN（與探索模式共用） */
function _getBossThrowHandPosAtFrame(frameIdx){
  /* rev-sweepcore: groundY = H×0.95，與探索 _getPlayerHandPos 同基準（腳底在場景 95%） */
  if(!battle) return { x: 0.15, y: 0.5 };
  const fx = document.getElementById('battle-fx');
  const W = fx ? fx.clientWidth : 400;
  const H = fx ? fx.clientHeight : 500;
  if(!W || !H) return { x: battle.px || 0.15, y: (battle.py || 0.75) - 0.2 };
  const spriteH = (typeof battle.playerCanvasH === 'number' && battle.playerCanvasH > 0) ? battle.playerCanvasH : BATTLE_HERO_SPRITE_H;
  const scale = (spriteH * CHAR_HEIGHT_FACTOR) / 386;
  const pxN = (typeof battle.px === 'number') ? battle.px : 0.25;
  /* rev-throw-hand-anchor: front_arm 不在 registry（id 由 __PUPPET_BAKE__.ids 烘焙，
     實為 front_forearm），find 失敗 → 回傳固定預設 (0.25,0.5)，手雷才會憑空出現在定點。
     錨點 (.88,.15) 對齊 PuppetRig 的 healId point()，釋放瞬間無跳變。 */
  /* rev-grenade-hand-anchor: 手部錨點 = front_forearm 角點 (1,0)，翻面 (0,0) ——
     標注工具原文「方向線為此面所有武器共用」。手雷是武器，手持中心與此釋放起點
     必須同一個點；先前誤用消耗品內部點 (.88,.15)，兩者不同故釋放跳變。
     front_arm 不在 registry，find 失敗會回傳固定預設 (0.25,0.5)。 */
  return window.getCharLayerCornerN('front_forearm', 1, 0, {
    animName: 'attack_melee',
    frameIdx: frameIdx,
    canvasW: W, canvasH: H,
    scale: scale,
    centerX_px: pxN * W,
    groundY_px: H * 0.95
  });
}
/* 當前 attack_melee 幀的手部位置（渲染釋放前跟隨用） */
function _getBossThrowHandPos(){
  const _fi = (battleHeroAnim.name === 'attack_melee') ? (battleHeroAnim.frame || 0) : 0;
  return _getBossThrowHandPosAtFrame(_fi);
}


/* [v222] Boss戰特效 canvas 清理 */
function _cleanBossFxCanvases(){
  ['boss-fx-canvas', 'boss-aimhit-canvas', 'boss-bullets-canvas'].forEach(function(id){
    var el = document.getElementById(id);
    if(el && el.parentNode) el.parentNode.removeChild(el);
  });
}

/* rev-fix-boss-grenade-arc: 從落點看 Boss 全身/弱點各占多少角度。
 * 復用 _calcFragmentRatio（2·atan((w/2)/d)/π，上半圓）。落點在地面，僅 x 影響。 */

function stopBattleMovement(){
  if(!battle) return;
  battle.moveDir = 0;
  const stick = document.getElementById('stick');
  if(stick){ stick.style.left = '50%'; stick.style.top = '50%'; stick.style.transform = 'translate(-50%,-50%)'; }
  if(typeof battle._joystickCancel === 'function') battle._joystickCancel();
}

function interruptHeal(){
  if(!battle || !battle.consuming) return false;
  if(battle.healTimer){ clearTimeout(battle.healTimer); battle.healTimer = null; }
  battle._healToken = (battle._healToken || 0) + 1;
  battle.consuming = false;
  battle.autoHealing = false;
  if(typeof refreshBattleControlsLive === 'function') refreshBattleControlsLive();
  return true;
}

/* ============== 掃蕩 ============== */
function _bossLevel(bid){
  const baseSeq = { factory_king: 1, lab_queen: 2, road_tyrant: 3, swamp_hydra: 4, core_omega: 5 };
  const isII = bid.endsWith('_ii');
  const baseId = isII ? bid.slice(0, -3) : bid;
  const seq = baseSeq[baseId] || 1;
  return isII ? seq * 2 : seq;
}

function _sweepMaxCount(bid){
  const b = BOSSES[bid];
  if(!b) return { max: 0, reason: 'Boss 不存在' };
  if(!Array.isArray(state.defeatedBosses) || state.defeatedBosses.indexOf(bid) === -1){
    return { max: 0, reason: '需先擊敗' };
  }
  const level = _bossLevel(bid);
  const perLiquor = level * 50;
  const perAmmo = level * 500;
  const perSeals = 1;
  const seals = Math.max(0, parseInt(state.seals[b.seal] || 0, 10));
  const liquor = (typeof _gardenLiquorValue === 'function') ? _gardenLiquorValue() : 0;
  const ammo = (typeof _garageAmmoEquiv === 'function') ? _garageAmmoEquiv() : 0;
  const maxBySeals = Math.floor(seals / perSeals);
  const maxByLiquor = Math.floor(liquor / perLiquor);
  const maxByAmmo = Math.floor(ammo / perAmmo);
  const max = Math.min(maxBySeals, maxByLiquor, maxByAmmo);
  let reason = '';
  if(max <= 0){
    if(maxBySeals <= 0) reason = '信物不足';
    else if(maxByLiquor <= 0) reason = '私酒不足';
    else if(maxByAmmo <= 0) reason = '彈藥不足';
    else reason = '資源不足';
  }
  return {
    max: Math.max(0, max),
    level: level, perSeals: perSeals, perLiquor: perLiquor, perAmmo: perAmmo,
    seals: seals, liquor: liquor, ammo: ammo,
    maxBySeals: maxBySeals, maxByLiquor: maxByLiquor, maxByAmmo: maxByAmmo,
    reason: reason
  };
}

function _sweepExpTarget(){
  const g = (typeof _garageInitState === 'function') ? _garageInitState() : null;
  if(!g) return 'btr80';
  const cur = g.currentVehicle || 'btr80';
  const curDef = VEHICLES[cur];
  const isTopTier = !curDef || !curDef.next || curDef.next.length === 0;
  if(isTopTier && g.researchTarget && VEHICLES[g.researchTarget]){
    return g.researchTarget;
  }
  return cur;
}

function _rollSweepLoot(bid){
  const b = BOSSES[bid];
  if(!b || !b.drops) return [];
  const drops = pickN(b.drops, Math.min(2, b.drops.length));
  const result = [];
  for(const did of drops){
    const dd = itemDef(did);
    if(!dd) continue;
    const rar = rollRarity();
    invAdd(did, rar, 1);
    result.push({ id: did, rarity: rar, count: 1 });
  }
  return result;
}

function _openSweepDialog(bid){
  if(window._sweepLock) return;
  const sw = _sweepMaxCount(bid);
  if(sw.max <= 0) return;
  const b = BOSSES[bid];

  let h = '';
  h += '<div class="detail-title">' + bossIcon(bid) + ' ' + b.name + ' <span style="font-size:12px;color:#7a6f60;font-weight:normal;margin-left:4px">Lv.' + sw.level + '</span></div>';
  h += '<div class="divider"></div>';
  h += '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px">';
  h += '<span style="font-size:11px;color:#e8a33d;font-weight:bold">掃蕩次數</span>';
  h += '<span style="font-size:16px;font-weight:bold;color:#fff"><span id="sweep-count-val" style="color:#e8a33d">1</span><span style="color:#5a5040;font-size:13px"> / ' + sw.max + '</span></span>';
  h += '</div>';
  h += '<input type="range" id="sweep-count" min="1" max="' + sw.max + '" value="1" style="width:100%;accent-color:#e8a33d;margin:0 0 2px 0;">';
  h += '<div class="divider"></div>';
  h += '<div style="font-size:11px;color:#e8a33d;font-weight:bold;margin-bottom:6px">總計消耗</div>';
  h += '<div class="stat-line"><span class="k">Boss 信物</span><span class="v" id="sweep-total-seals"></span></div>';
  h += '<div class="stat-line"><span class="k">私酒等值</span><span class="v" id="sweep-total-liquor"></span></div>';
  h += '<div class="stat-line"><span class="k">彈藥等值</span><span class="v" id="sweep-total-ammo"></span></div>';
  h += '<div class="divider"></div>';
  h += '<div style="font-size:11px;color:#e8a33d;font-weight:bold;margin-bottom:6px">預計獲得</div>';
  h += '<div class="stat-line"><span class="k">載具經驗</span><span class="v" id="sweep-total-exp" style="color:#4caf50">+' + (sw.level * 100) + '</span></div>';
  h += '<div class="stat-line"><span class="k">掉落</span><span class="v" id="sweep-total-loot" style="color:#4caf50">' + (1 * 2) + ' 件</span></div>';

  const ft = document.createElement('div');
  ft.className = 'modal-ft';
  ft.innerHTML = '<button class="btn primary" id="sweep-go">掃蕩</button><button class="btn ghost" id="sweep-cancel">取消</button>';
  const bd = openModal({ title: '掃蕩 ' + b.name, body: h, footer: ft });

  const _fmt = function(n){ return Math.floor(n); };
  const _renderTotals = function(c){
    const totalSeals = sw.perSeals * c;
    const totalLiq = sw.perLiquor * c;
    const totalAmmo = sw.perAmmo * c;
    const remSeals = sw.seals - totalSeals;
    const remLiq = _fmt(sw.liquor) - totalLiq;
    const remAmmo = _fmt(sw.ammo) - totalAmmo;
    const okSeals = remSeals >= 0;
    const okLiq = remLiq >= 0;
    const okAmmo = remAmmo >= 0;
    const _cls = function(ok){ return ok ? '#4caf50' : '#e05252'; };
    bd.querySelector('#sweep-total-seals').innerHTML = '<span style="color:' + _cls(okSeals) + '">×' + totalSeals + '</span> <span style="color:#5a5040">→</span> 剩 <span style="color:' + _cls(okSeals) + '">' + remSeals + '</span>';
    bd.querySelector('#sweep-total-liquor').innerHTML = '<span style="color:' + _cls(okLiq) + '">×' + totalLiq + '</span> <span style="color:#5a5040">→</span> 剩 <span style="color:' + _cls(okLiq) + '">' + remLiq + '</span>';
    bd.querySelector('#sweep-total-ammo').innerHTML = '<span style="color:' + _cls(okAmmo) + '">×' + totalAmmo + '</span> <span style="color:#5a5040">→</span> 剩 <span style="color:' + _cls(okAmmo) + '">' + remAmmo + '</span>';
    bd.querySelector('#sweep-total-exp').textContent = '+' + (sw.level * 100 * c);
    bd.querySelector('#sweep-total-loot').textContent = (c * 2) + ' 件';
    bd.querySelector('#sweep-count-val').textContent = c;
  };
  _renderTotals(1);
  const slider = bd.querySelector('#sweep-count');
  slider.oninput = function(){
    const c = parseInt(slider.value, 10) || 1;
    _renderTotals(c);
  };

  ft.querySelector('#sweep-cancel').onclick = function(){ closeModal(); };
  ft.querySelector('#sweep-go').onclick = function(){
    const c = parseInt(slider.value, 10) || 1;
    closeModal();
    _executeSweep(bid, c);
  };
}

function _executeSweep(bid, count){
  /* rev-sweep-ux: 一趟車 · 結算 N 份。
     zone1/zone2 只鎖操作（zone2 保持原狀渲染）；zone3 日誌可互動；tabbar 不鎖 —— 切出 = 放棄。 */
  if(window._sweepLock) return;
  var sw = _sweepMaxCount(bid);
  if(count < 1 || sw.max < count) return;
  var b = BOSSES[bid];
  if(!b) return;
  if(typeof window._sweepInstall === 'function') window._sweepInstall();
  state.seals[b.seal] = Math.max(0, parseInt(state.seals[b.seal] || 0, 10) - count);
  if(typeof _consumeLiquorByValue === 'function') _consumeLiquorByValue(sw.perLiquor * count);
  if(typeof _consumeAmmoByValue === 'function') _consumeAmmoByValue(sw.perAmmo * count);
  if(typeof save === 'function') save();
  var g = (typeof _garageInitState === 'function') ? _garageInitState() : null;
  var vid = g ? g.currentVehicle : 'btr80';
  var expTarget = _sweepExpTarget();
  var level = sw.level;
  window._sweepLock = true;
  var _locks = [];
  ['zone1','zone2'].forEach(function(id){
    var el = document.getElementById(id);
    if(el){ _locks.push({ el:el, pe:el.style.pointerEvents }); el.style.pointerEvents = 'none'; }
  });
  window._sweepUnlock = function(){
    window._sweepLock = false;
    for(var i = 0; i < _locks.length; i++){ _locks[i].el.style.pointerEvents = _locks[i].pe; }
    _locks = [];
    window._sweepUnlock = null;
  };
  function _setTab(t){
    try{
      currentTab = t;
      $$('.tab').forEach(function(x){ x.classList.toggle('active', x.dataset.tab === t); });
    }catch(e){}
  }
  function _finish(){
    var allLoot = [], servantGained = null;
    for(var i = 0; i < count; i++){
      var loot = _rollSweepLoot(bid);
      for(var j = 0; j < loot.length; j++) allLoot.push(loot[j]);
      if(!servantGained && Math.random() < 0.25){
        var srv = (typeof grantRandomServant === 'function') ? grantRandomServant() : null;
        if(srv) servantGained = srv;
      }
      if(typeof _garageAddVehicleExp === 'function') _garageAddVehicleExp(expTarget, level * 100);
      else if(g) g.vehicleExp[expTarget] = (g.vehicleExp[expTarget] || 0) + level * 100;
      state.stats.bossKills = (state.stats.bossKills || 0) + 1;
    }
    if(typeof window._sweepUnlock === 'function') window._sweepUnlock();
    window._sweepLock = false;
    try{ _finishBatchSweep(bid, vid, level, count, allLoot, servantGained, expTarget); }
    catch(e){ console.error('[sweep finish]', e); }
    /* 完成後若玩家已自行切頁，尊重當前頁，不強行拉回 */
    if(typeof currentTab === 'string' && currentTab === 'combat'){
      try{ if(typeof renderCurrentTab === 'function') renderCurrentTab(); }catch(e){}
    }
  }
  try{ var b0 = window.BTRSupport; if(b0 && b0.active) b0.stop(); }catch(e){}
  _setTab('combat');
  startBossBattle(bid, {
    sweep: true, vehicleId: vid, index: 1, total: count,
    onDone: function(){ setTimeout(_finish, 60); }
  });
  if(typeof window._sweepLog === 'function'){
    var vn = (typeof VEHICLES !== 'undefined' && VEHICLES[vid]) ? VEHICLES[vid].name : vid;
    window._sweepLog('<span class="pl">玩家</span> 發起掃蕩 <b>' + b.name + '</b> ×' + count);
    window._sweepLog('預扣資源：信物×' + count + ' · 私酒等值 ' + (sw.perLiquor * count) + ' · 彈藥等值 ' + (sw.perAmmo * count));
    window._sweepLog('<span class="run">' + vn + '</span> 出擊，全速前往 Boss');
  }
}

/* rev-worldsweep: 掃蕩 = 探索座標系 × 探索縮放 × 載具全速。
   載具從世界 0 全速衝向 BOSS_WORLD_START（Boss 世界盡頭），接觸後把 Boss 推出界，車尾越界即結算。 */
/* rev-sweepcore: 掃蕩載具 = 探索 BTRSupport 同一條繪製管線。
   dpr 全區 canvas + VehicleRenderer.render + 繼承 BTRSupport.fx，
   不再自建小 canvas / CSS 縮放（白邊與車輪錯亂根因）。
   世界米 choreography：車頭從 0 全速衝到 BOSS_WORLD_START，推 Boss 出界。 */
/* ════════════════════════════════════════════════════════════
   掃蕩 = 進入 Boss 戰 + 立刻召喚載具。
   載具走探索同一條 BTRSupport 管線：進場 → 接人 → 調整 → 全速支援 → 開火；
   沒打死就由 _tickAI 的載具接觸必殺收尾。Boss 一死掃蕩結束，不再另畫動畫。
   畫面外不強求可見 —— 該出現的特效自然出現，其餘由距離氣泡指示。
   ════════════════════════════════════════════════════════════ */
function _sweepBattleTick(now, dt){
  /* rev-sweep-ux: 玩家層敘事日誌 + 引擎調試分層；support 才開火；擊殺即收尾不等支援結束。 */
  var b = battle;
  if(!b) return;
  var btr = window.BTRSupport;
  var ph = (btr && btr.active) ? btr.phase : null;
  var V = (typeof window._vehicleSpeedKmh === 'function') ? window._vehicleSpeedKmh(b.sweep.vid) / 3.6 : 22;
  var _wt = (typeof getTotalWeight === 'function') ? getTotalWeight() : 0;
  var walk = (typeof window._walkSpeedMs === 'function') ? window._walkSpeedMs(_wt) : 1.4;
  var _exiting = !!b.sweepOut;
  var ts = _exiting ? V : ((ph === 'center' || ph === 'support') ? V : walk);
  b._worldSpeed += (ts - b._worldSpeed) * Math.min(1, dt * 8);
  if(Math.abs(b._worldSpeed - ts) < 0.01) b._worldSpeed = ts;
  b.playerWorldX += b._worldSpeed * dt;
  var c = window._combat;
  if(c && c.allies && c.allies[0]) c.allies[0].worldX = b.playerWorldX;
  /* 掃蕩只打這隻 Boss —— 探索事件敵人不混入 */
  if(c && Array.isArray(c.enemies)){
    for(var ei = c.enemies.length - 1; ei >= 0; ei--){
      if(c.enemies[ei] !== b.bossTarget) c.enemies.splice(ei, 1);
    }
    if(b.bossHp > 0 && c.enemies.indexOf(b.bossTarget) < 0) c.enemies.push(b.bossTarget);
  }
  var fxEl = document.getElementById('battle-fx');
  var _W = fxEl ? fxEl.clientWidth : 400, _H = fxEl ? fxEl.clientHeight : 500;
  b.sm = (typeof computeScreenMetrics === 'function') ? computeScreenMetrics(_W, _H) : { screenRightWorld:4.2, bgPixelsPerMeter:88 };
  b.px = (typeof EXPLORE_HERO_X_RATIO === 'number') ? EXPLORE_HERO_X_RATIO : 0.25;
  b.bx = b.px + (b.bossWorldX - b.playerWorldX) / (b.sm.screenRightWorld || 4.2) * (1 - b.px);
  b.bgPixelsPerMeter = b.sm.bgPixelsPerMeter || 88;
  if(c) c.sm = b.sm;
  var _bg = document.querySelector('.battle-scene .battle-bg');
  if(_bg){
    _bg.style.backgroundPositionX = (-b.playerWorldX * b.bgPixelsPerMeter) + 'px';
    _bg.style.backgroundSize = 'auto 100%';
    _bg.style.backgroundRepeat = 'repeat-x';
  }
  if(fxEl && _H > 0 && b.lastH !== _H){
    b.lastH = _H;
    b.playerCanvasH = _H;
    b.playerCanvasW = Math.round(_H * 1.2);
    b.playerSpriteW = b.playerCanvasW;
    b.playerSpriteH = _H;
    var _spr = 'position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:' + b.playerCanvasW + 'px;height:' + _H + 'px;';
    var _hs = document.querySelector('.hero-f .sprite'); if(_hs) _hs.style.cssText = _spr;
    var _bs = document.getElementById('boss-sprite'); if(_bs) _bs.style.cssText = _spr;
    var _hc = document.getElementById('hero-battle-canvas');
    if(_hc){ _hc.style.width='100%'; _hc.style.height='100%'; _hc.style.display='block'; }
    var _bc = document.getElementById('boss-battle-canvas');
    if(_bc){ _bc.style.width='100%'; _bc.style.height='100%'; _bc.style.display='block'; }
  }
  if(_exiting){
    var _bf = document.getElementById('fighter-boss'); if(_bf) _bf.style.display = 'none';
    var _hb = document.getElementById('head-bars'); if(_hb) _hb.style.display = 'none';
  } else if(!b.settling){
    var _clip = (btr && btr.active) ? btr.playerClipH : 1;
    var _want = (_clip > 0.01 && b._worldSpeed > 0.5) ? 'walk' : 'idle';
    if(battleHeroAnim.name !== _want){
      battleHeroAnim.name = _want;
      battleHeroAnim.frame = 0;
      battleHeroAnim.lastUpdate = now;
      battleHeroAnim.forcedEnd = 0;
    }
  }
  updateFighterPos();
  if(typeof isBossType === 'function' && isBossType(b.bossId, 'hydra')) updateHeadBarsUI();
  updateBattleHeroAnim(now);
  updateBattleBossAnim(now);
  renderBattleHeroCanvas();
  renderBossBattleCanvas();
  if(typeof updateBullets === 'function') updateBullets(dt);
  if(window.MuzzleFX){
    window.MuzzleFX.update(dt);
    if(fxEl){
      var _cvs = document.getElementById('boss-fx-canvas');
      if(!_cvs){
        _cvs = document.createElement('canvas');
        _cvs.id = 'boss-fx-canvas';
        _cvs.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:9;';
        fxEl.appendChild(_cvs);
      }
      if(_cvs.width !== fxEl.clientWidth || _cvs.height !== fxEl.clientHeight){
        _cvs.width = fxEl.clientWidth; _cvs.height = fxEl.clientHeight;
      }
      var _cx = _cvs.getContext('2d');
      _cx.clearRect(0, 0, _cvs.width, _cvs.height);
      window.MuzzleFX.render(_cx, 'boss');
    }
  }
  var _bhp = document.getElementById('boss-hp'), _bap = document.getElementById('boss-ap'), _bsh = document.getElementById('boss-shield');
  if(_bhp) _bhp.style.width = Math.max(0, b.bossHp / b.bossMaxHp * 100) + '%';
  if(_bap) _bap.style.width = Math.max(0, b.bossArmor / Math.max(1, b.bossMaxArmor) * 100) + '%';
  if(_bsh && b.shieldMaxHp > 0) _bsh.style.width = Math.max(0, b.shieldHp / b.shieldMaxHp * 100) + '%';

  /* ── 玩家層：狀態條 + 敘事事件 ── */
  var _dist = Math.max(0, b.bossWorldX - b.playerWorldX);
  var _tot = Math.max(1, b.bossMaxHp + b.bossMaxArmor + (b.shieldMaxHp || 0));
  var _cur = Math.max(0, b.bossHp + b.bossArmor + (b.shieldHp || 0));
  var _pct = Math.round(_cur / _tot * 100);
  var _phKey = _exiting ? 'sweepOut' : (ph || 'idle');
  var _phTxt = { enter:'載具進場', arrive:'接人 · 車門開啟', sink:'玩家登車', center:'陣位調整', support:'全速支援 · 開火', sweepOut:'衝出屏幕', idle:'待命' }[_phKey] || _phKey;
  var _lp = document.getElementById('sweep-live-phase'); if(_lp) _lp.textContent = _phTxt;
  var _ln = document.getElementById('sweep-live-nums');
  if(_ln) _ln.textContent = '距離 ' + ((typeof window._fmtDistN === 'function') ? window._fmtDistN(_dist) : Math.round(_dist)) + ' m · ' + Math.round(b._worldSpeed * 3.6) + ' km/h · ×' + b.sweep.total;
  var _bar = document.getElementById('sweep-boss-bar'); if(_bar) _bar.style.width = _pct + '%';
  var _bp = document.getElementById('sweep-boss-pct'); if(_bp) _bp.textContent = _pct + '%';
  if(b._lastPh !== _phKey){
    b._lastPh = _phKey;
    var _evt = {
      enter:'載具進場，駛向玩家',
      arrive:'車門開啟，準備接人',
      sink:'玩家登車完畢',
      center:'載具調整陣位',
      support:'<span class="run">全速支援開始</span>，車載武器開火',
      sweepOut:'<span class="run">載具全速衝出屏幕</span>，準備結算'
    }[_phKey];
    if(_evt && typeof window._sweepLog === 'function') window._sweepLog(_evt);
  }
  var _marks = [0.75, 0.5, 0.25];
  for(var mi = 0; mi < _marks.length; mi++){
    if(_cur / _tot <= _marks[mi] && b._hpMark <= mi){
      b._hpMark = mi + 1;
      if(typeof window._sweepLog === 'function') window._sweepLog('Boss 剩餘 <b style="color:#ffb300">' + Math.round(_marks[mi] * 100) + '%</b>');
    }
  }
  if(b.shieldMaxHp > 0 && b.shieldBroken && !b._shieldWas){
    b._shieldWas = true;
    if(typeof window._sweepLog === 'function') window._sweepLog('Boss <span class="win">護盾擊破</span>');
  }
  if(b.bossMaxArmor > 0 && b.bossArmor <= 0 && !b._armorZero){
    b._armorZero = true;
    if(typeof window._sweepLog === 'function') window._sweepLog('Boss <span class="win">護甲擊穿</span>');
  }

  /* ── 引擎調試層（摺疊區，展開時才寫） ── */
  var _dbg = document.getElementById('sweep-dbg');
  if(_dbg && _dbg.style.display !== 'none' && (!b._dbgAt || now - b._dbgAt > 200)){
    b._dbgAt = now;
    _dbg.textContent =
      'phase=' + _phKey + '  t=' + ((Date.now() - b.startTime) / 1000).toFixed(1) + 's\n'
    + 'playerWX=' + b.playerWorldX.toFixed(2) + '  bossWX=' + b.bossWorldX.toFixed(2) + '  dist=' + _dist.toFixed(2) + '\n'
    + 'worldSpd=' + b._worldSpeed.toFixed(2) + ' m/s  veh=' + V.toFixed(2) + ' m/s\n'
    + 'bossHP=' + Math.round(b.bossHp) + '  armor=' + Math.round(b.bossArmor) + '  shield=' + Math.round(b.shieldHp || 0) + '\n'
    + 'btr.x=' + (btr ? (btr.x || 0).toFixed(3) : '-') + '  clipH=' + (btr ? (btr.playerClipH || 0).toFixed(2) : '-') + '\n'
    + 'combat.enemies=' + (c && c.enemies ? c.enemies.length : 0) + '  bullets=' + (c && c.bullets ? c.bullets.length : 0) + '\n'
    + 'settling=' + (!!b.settling) + '  sweepOut=' + _exiting + '  lock=' + (!!window._sweepLock);
  }
  try{ if(window._bossOffscreenUpdate) window._bossOffscreenUpdate(); }catch(e){}

  /* ── 擊殺 / 撞擊 → 立刻收尾，不等支援結束 ── */
  if(!b.settling){
    var _half = (typeof window.getVehicleHalfLengthWorld === 'function') ? window.getVehicleHalfLengthWorld(b.sweep.vid) : 3.6;
    if(b.bossHp <= 0 || b.bossWorldX <= b.playerWorldX + _half){
      if(b.heads){ for(var hi in b.heads){ b.heads[hi].hp = 0; b.heads[hi].alive = false; } }
      if(b.arms){ for(var ai in b.arms){ b.arms[ai].hp = 0; b.arms[ai].alive = false; } }
      b.shieldHp = 0; b.shieldBroken = true; b.bossArmor = 0; b.bossHp = 0;
      if(typeof endBattle === 'function') endBattle(true);
    }
  }
  if(b.settling){
    if(b.sweepOut){
      if(!btr || !btr.active){ if(typeof window._completeSweepBattle === 'function') window._completeSweepBattle(b); }
    } else {
      var _an = BOSS_ANIMS[b.bossId], _da = _an && _an.death;
      if(_da && battleBossAnim.name === 'death' && battleBossAnim.frame >= _da.frameCount - 1 && !b._settleScheduled){
        b._settleScheduled = true;
        setTimeout(finishBattleSettle, 160);
      }
      if(!b._settleScheduled && Date.now() - (b.startTime || Date.now()) > 20000){
        b._settleScheduled = true;
        setTimeout(finishBattleSettle, 50);
      }
    }
    return;
  }
  /* 90s 兜底：強制撞擊必殺，保證掃蕩必然收尾 */
  if(Date.now() - (b.startTime || Date.now()) > 90000 && b.bossHp > 0){
    b.bossHp = 0;
    if(typeof endBattle === 'function') endBattle(true);
  }
}

window._finishSweepBattle = function(b){
  /* rev-sweep-rig: 死亡動畫播完 → 不放人，車保持原速向右衝出屏幕，出緣才結算。 */
  if(!b || b._sweepFinalizing) return;
  b._sweepFinalizing = true;
  if(typeof window._sweepInstall === 'function') window._sweepInstall();
  b.sweepOut = true;
  var btr = window.BTRSupport;
  if(btr && btr.active && typeof btr.enterSweepOut === 'function'){
    btr.enterSweepOut();
    return;
  }
  window._completeSweepBattle(b);
};

function _finishBatchSweep(bid, vid, level, count, allLoot, servantGained, expTarget){
  const b = BOSSES[bid];
  const vehName = (VEHICLES[vid] && VEHICLES[vid].name) || vid;
  const expTargetName = (VEHICLES[expTarget] && VEHICLES[expTarget].name) || expTarget;
  const totalExp = level * 100 * count;
  pushLog('<span class="pl">玩家</span> 乘坐 <span class="pl">' + vehName + '</span> 掃蕩 <b>' + b.name + '</b> ×' + count +
    (allLoot.length ? '，獲得 ' + allLoot.map(function(l){ return fmtItemSpan(l.id, l.rarity, l.count); }).join('、') : '，無戰利品') +
    (servantGained ? '，獲得僕人' : '') +
    '，載具經驗 +' + totalExp + '（' + expTargetName + '）', [], 'combat');
  if(typeof save === 'function') save();

  const merged = {};
  for(let li = 0; li < allLoot.length; li++){
    const it = allLoot[li];
    const k = it.id + '@' + it.rarity;
    if(!merged[k]) merged[k] = { id: it.id, rarity: it.rarity, count: 0 };
    merged[k].count += it.count;
  }
  const items = Object.keys(merged).map(function(k){ return merged[k]; });
  let body = '';
  body += '<div class="detail-title r-傳奇">🏆 掃蕩完成 ×' + count + '</div>';
  body += '<div class="detail-sub">' + vehName + ' 全速衝撞 ' + b.name + '</div>';
  body += '<div class="stat-line"><span class="k">載具經驗</span><span class="v" style="color:#4caf50">+' + totalExp + ' → ' + expTargetName + '</span></div>';
  if(servantGained){
    const sdef = SERVANT_TYPES[servantGained.type];
    body += '<div class="stat-line"><span class="k">獲得僕人</span><span class="v">' + (sdef ? sdef.name : '?') + '（' + servantGained.rarity + '）</span></div>';
  }
  if(items.length){
    const groups = { weapon: [], armor: [], ammo: [], consume: [], material: [], misc: [] };
    for(let gi = 0; gi < items.length; gi++){
      const gcat = itemCat(items[gi].id);
      if(groups[gcat]) groups[gcat].push(items[gi]);
      else groups.misc.push(items[gi]);
    }
    for(const gg in groups){
      groups[gg].sort(function(a, b){
        const rd = sortByRarityDesc(a, b);
        if(rd !== 0) return rd;
        const ad = itemDef(a.id) || { name: a.id };
        const bd = itemDef(b.id) || { name: b.id };
        return (ad.name || '').localeCompare(bd.name || '', 'zh-Hant');
      });
    }
    const catNames = { weapon: '⚔️ 武器', armor: '🛡️ 裝備', ammo: '🔫 彈藥', consume: '💊 消耗品', material: '🔧 材料', misc: '📦 其他' };
    body += '<div style="font-size:11px;color:#e8a33d;font-weight:bold;margin:10px 0 4px">戰利品</div>';
    for(const g in groups){
      if(!groups[g].length) continue;
      body += '<div class="cat-header" style="cursor:default;margin:4px 0"><span>' + catNames[g] + ' (' + groups[g].length + ')</span></div>';
      for(let ii = 0; ii < groups[g].length; ii++){
        const it2 = groups[g][ii];
        const d = itemDef(it2.id) || { name: it2.id };
        body += '<div class="item-row" data-iid="' + it2.id + '" data-irar="' + it2.rarity + '"><div class="icon" style="background:' + rarityBg(it2.rarity) + '">' + itemIcon(it2.id, 30) + '</div><div class="info"><div class="nm ' + rarityClass(it2.rarity) + '">' + d.name + '</div><div class="sub">' + it2.rarity + '</div></div><div class="cnt">×' + it2.count + '</div></div>';
      }
    }
  } else {
    body += '<div class="empty-hint" style="margin:10px 0">無戰利品</div>';
  }
  const ft = document.createElement('div');
  ft.className = 'modal-ft';
  ft.innerHTML = '';
  const bd = openModal({ title: '掃蕩結算', body: body, footer: ft });
  const rows = bd.querySelectorAll('.item-row[data-iid]');
  for(let ri = 0; ri < rows.length; ri++){
    (function(r){
      r.onclick = function(){
        const iid = r.getAttribute('data-iid');
        const irar = r.getAttribute('data-irar');
        if(typeof openItemDetail === 'function'){
          openItemDetail(iid, irar, function(){ _finishBatchSweep(bid, vid, level, count, allLoot, servantGained, expTarget); });
        }
      };
    })(rows[ri]);
  }
  if(typeof renderCombat === 'function') renderCombat();
}

/* ============== Boss 選擇頁 ============== */
function _getAmmoDefRarity(id, slot){
  if(slot === 'throwable'){
    let best = null, bi = -1;
    for(const k in state.inventory){
      const p = k.split('@');
      if(p[0] !== id) continue;
      const i = RARITY_ORDER.indexOf(p[1]);
      if(i > bi){ bi = i; best = p[1]; }
    }
    return best || '一般';
  }
  const d = AMMO[id];
  return d ? d.rarity : '一般';
}

function getEquippedCal(slot){
  const id = state.player.equipped[slot];
  if(!id) return null;
  const def = itemDef(id);
  if(!def) return null;
  return def.cal || null;
}

function getAvailableAmmoForSlot(slot){
  if(slot === 'throwable'){
    const list = [];
    for(const k in state.inventory){
      const parts = k.split('@');
      const id = parts[0], rar = parts[1];
      const d = WEAPONS[id];
      if(!d || d.slot !== 'throwable') continue;
      const cnt = state.inventory[k];
      if(cnt <= 0) continue;
      list.push({ id: id, rarity: rar, count: cnt, def: d });
    }
    return list;
  }
  const cal = getEquippedCal(slot);
  if(!cal) return [];
  const list = [];
  for(const k in state.inventory){
    const parts = k.split('@');
    const id = parts[0];
    const d = AMMO[id];
    if(!d || d.cal !== cal) continue;
    const cnt = state.inventory[k];
    if(cnt <= 0) continue;
    list.push({ id: id, rarity: d.rarity, count: cnt, def: d });
  }
  return list;
}

function getAmmoShortName(id, slot){
  if(slot === 'throwable'){
    const d = WEAPONS[id];
    return d ? d.name.substring(0, 6) : '?';
  }
  const d = AMMO[id];
  if(!d) return '?';
  const parts = d.name.split(' ');
  return parts.length > 1 ? parts[parts.length - 1] : d.name;
}

function renderAmmoOrderRow(slot, label){
  const equipped = state.player.equipped[slot];
  const order = getAmmoOrder(slot);
  const available = equipped ? getAvailableAmmoForSlot(slot) : [];
  const availableSet = {};
  for(const _a of available) availableSet[_a.id] = true;

  let html = '<div class="ammo-order-row" style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;padding-right:18px">';
  html += '<div class="lbl" style="flex:0 0 18px;font-size:10px;color:#e8a33d;font-weight:bold;padding-top:10px;text-align:center;writing-mode:vertical-rl;text-orientation:upright;line-height:1;letter-spacing:1px">' + label + '</div>';
  for(let i = 0; i < 3; i++){
    let aid = order[i];
    if(aid && !availableSet[aid]) aid = null;
    let inner = '<span class="empty-lbl" style="font-size:10px;color:#5a5040">空</span>';
    let bgStyle = 'background:#1a1510;border-color:#3a2f25;';
    if(aid){
      const rar = _getAmmoDefRarity(aid, slot);
      bgStyle = 'background:' + rarityBg(rar) + ';border-color:#8a5f18;';
      const nm = getAmmoShortName(aid, slot);
      inner = itemIcon(aid, 26) + '<div class="nm" style="font-size:7px;color:#e8a33d;line-height:1;text-align:center;max-width:40px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;font-weight:bold;margin-top:1px">' + nm + '</div>';
    }
    const dis = !equipped ? 'opacity:.35;pointer-events:none;' : '';
    html += '<div class="ammo-slot" data-slot="' + slot + '" data-idx="' + i + '" style="box-sizing:border-box;width:46px;height:46px;min-width:46px;max-width:46px;min-height:46px;max-height:46px;flex:0 0 auto;display:flex;flex-direction:column;align-items:center;justify-content:center;border:1px solid #3a2f25;border-radius:4px;overflow:hidden;position:relative;cursor:pointer;padding:0;' + bgStyle + dis + '">' + inner + '</div>';
  }
  html += '</div>';
  return html;
}

function openAmmoPicker(slot, idx){
  const equipped = state.player.equipped[slot];
  if(!equipped) return;
  const available = getAvailableAmmoForSlot(slot);
  if(!available.length){
    openModal({ title: '選擇彈種（優先級 ' + (idx + 1) + '）', body: '<div class="empty-hint">沒有可用的彈藥</div>' });
    return;
  }
  available.sort(function(a, b){
    const ra = sortByRarityDesc(a, b);
    if(ra !== 0) return ra;
    return (a.def.name || '').localeCompare(b.def.name || '');
  });
  let body = '';
  for(const it of available){
    let statLine = '';
    if(slot === 'throwable'){
      statLine = it.rarity + ' · 傷害 ' + (it.def.dmg || 0) + ' · 穿甲 ' + (it.def.penMM || 0) + 'mm · 庫存 ' + it.count;
    } else {
      statLine = it.rarity + ' · 穿甲 ' + (it.def.penMM || 0) + 'mm · 傷害 ' + (it.def.dmg || 0) + ' · 庫存 ' + it.count;
    }
    body += '<div class="item-row" data-amid="' + it.id + '" data-rar="' + it.rarity + '"><div class="icon" style="background:' + rarityBg(it.rarity) + '">' + itemIcon(it.id, 30) + '</div><div class="info"><div class="nm ' + rarityClass(it.rarity) + '">' + it.def.name + '</div><div class="sub">' + statLine + '</div></div></div>';
  }
  const bd = openModal({ title: '選擇彈種（優先級 ' + (idx + 1) + '）', body: body });
  bd.querySelectorAll('.item-row').forEach(function(row){
    row.onclick = function(){
      const aid = row.dataset.amid;
      let order = getAmmoOrder(slot).slice();
      while(order.length < 3) order.push(null);
      for(let i = 0; i < order.length; i++){ if(order[i] === aid) order[i] = null; }
      order[idx] = aid;
      while(order.length && !order[order.length - 1]) order.pop();
      setAmmoOrder(slot, order);
      closeModal();
      renderCombatInfoPanel(document.getElementById('zone3'));
    };
  });
}

function renderCombatInfoPanel(z3){
  const slots = [
    { key: 'primary', label: '主武器' },
    { key: 'secondary', label: '副武器' },
    { key: 'throwable', label: '投擲物' }
  ];
  let html = '<div class="z3-head"><div class="z3-title">⚔️ 彈藥準備</div></div>';
  html += '<div style="padding:2px 4px;font-size:9px;color:#7a6f60;line-height:1.2;flex:0 0 auto">依序設定優先彈種，留空則自動分配</div>';
  html += '<div style="flex:1;min-height:0;display:flex;flex-direction:column;justify-content:flex-start;padding:4px;gap:2px;overflow:hidden">';
  for(const s of slots){
    html += renderAmmoOrderRow(s.key, s.label);
  }
  html += '</div>';
  z3.innerHTML = html;
  z3.querySelectorAll('.ammo-slot').forEach(function(el){
    el.onclick = function(){
      openAmmoPicker(el.dataset.slot, parseInt(el.dataset.idx, 10));
    };
  });
}

function renderCombat(){
  if(window._sweepLock) return;
  const z1 = document.getElementById('zone1');
  const z2 = document.getElementById('zone2');
  const z3 = document.getElementById('zone3');

  if(battle && battle.active){
    try { renderBattleScene(z1); } catch(e){ console.error('[combat] scene:', e); if(z1) z1.innerHTML = '<div style="padding:20px;color:#e05252;font-size:12px">⚔️ Scene: ' + e.message + '</div>'; }
    try { renderBattleJoystick(z2); } catch(e){ console.error('[combat] joystick:', e); if(z2) z2.innerHTML = '<div style="padding:20px;color:#e05252;font-size:12px">🕹️ Joystick: ' + e.message + '</div>'; }
    try { renderBattleControls(z3); } catch(e){ console.error('[combat] controls:', e); if(z3) z3.innerHTML = '<div style="padding:20px;color:#e05252;font-size:12px">🎮 Controls: ' + e.message + '</div>'; }
    return;
  }

  const _BOSS_GROUPS = [
    { baseKey: 'factory_king', regionName: '廢棄工廠' },
    { baseKey: 'lab_queen', regionName: '廢棄實驗室' },
    { baseKey: 'road_tyrant', regionName: '郊區公路' },
    { baseKey: 'swamp_hydra', regionName: '輻射沼澤' },
    { baseKey: 'core_omega', regionName: '廢土核心' }
  ];
  const _isSweep = (state.preferences.bossMode === 'sweep');
  if(!state.preferences.bossTier) state.preferences.bossTier = {};
  const _bossSelectedTier = state.preferences.bossTier;

  let listHtml = '<div class="boss-list">';
  for(const _g of _BOSS_GROUPS){
    const _b1 = BOSSES[_g.baseKey];
    if(!_b1) continue;
    const _b2 = BOSSES[_g.baseKey + '_ii'];
    const _t2Exists = !!_b2;
    const _t2Unlocked = _t2Exists && state.unlockedRegions.includes(_g.regionName + 'II');
    let _curTier = _bossSelectedTier[_g.baseKey] || 1;
    if(_curTier === 2 && !_t2Unlocked) _curTier = 1;
    const _b = _curTier === 2 ? _b2 : _b1;
    const _bid = _curTier === 2 ? (_g.baseKey + '_ii') : _g.baseKey;
    const _seals1 = Math.max(0, parseInt(state.seals[_b1.seal] || 0, 10));
    const _seals2 = _b2 ? Math.max(0, parseInt(state.seals[_b2.seal] || 0, 10)) : 0;
    const _defeated = state.defeatedBosses.includes(_bid);
    let _can, _btnLabel;
    if(_isSweep){
      const _sw = _sweepMaxCount(_bid);
      _can = _sw.max > 0;
      _btnLabel = _can ? ('掃蕩 ×' + _sw.max) : (_sw.reason || '資源不足');
    } else {
      _can = _curTier === 2 ? _seals2 > 0 : _seals1 > 0;
      _btnLabel = _can ? '挑戰' : '信物不足';
    }
    listHtml += '<div class="boss-card ' + (_can ? '' : 'locked') + '"><div class="boss-avatar">' + bossIcon(_bid) + '</div><div class="boss-info"><div class="bn">' + _b.name + (_defeated ? ' ✅' : '') + '</div><div class="bd"><div>甲 ' + _b.armor + '</div><div>生命 ' + _b.hp + '</div></div></div><div class="boss-tier-selector"><div class="boss-tier-btn ' + (_curTier === 1 ? 'on' : '') + '" data-boss-key="' + _g.baseKey + '" data-tier="1"><div class="bt-label">I</div><div class="bt-seal">×' + _seals1 + '</div></div>' + (_t2Exists ? '<div class="boss-tier-btn ' + (_curTier === 2 ? 'on' : '') + ' ' + (_t2Unlocked ? '' : 'locked') + '" data-boss-key="' + _g.baseKey + '" data-tier="2"><div class="bt-label">' + (_t2Unlocked ? 'II' : '🔒') + '</div><div class="bt-seal">' + (_t2Unlocked ? '×' + _seals2 : '-') + '</div></div>' : '') + '</div><button class="btn ' + (_can ? 'primary' : '') + '" data-bid="' + _bid + '" ' + (_can ? '' : 'disabled') + ' style="padding:8px 10px;font-size:11px;flex:0 0 auto">' + _btnLabel + '</button></div>';
  }
  listHtml += '</div>';
  z1.innerHTML = listHtml;
  renderEquipZone(z2);
  renderCombatInfoPanel(z3);

  z1.querySelectorAll('.boss-tier-btn[data-boss-key]').forEach(function(btn){
    btn.onclick = function(e){
      e.stopPropagation();
      if(btn.classList.contains('locked')) return;
      const _bl = z1.querySelector('.boss-list');
      const _sp = _bl ? _bl.scrollTop : 0;
      _bossSelectedTier[btn.dataset.bossKey] = parseInt(btn.dataset.tier, 10);
      save();
      renderCombat();
      const _bl2 = z1.querySelector('.boss-list');
      if(_bl2) _bl2.scrollTop = _sp;
    };
  });
  z1.querySelectorAll('.boss-card .btn').forEach(function(btn){
    btn.onclick = function(){
      const _bid = btn.dataset.bid;
      if(state.preferences.bossMode === 'sweep'){ _openSweepDialog(_bid); }
      else { startBossBattle(_bid); }
    };
  });
}

/* ============== 戰鬥場景 ============== */
function renderBattleScene(z1){
  const b = battle;

  /* rev-fix-boss-dmgbar: dmgBar 显示「当前血条已掉比例」，II Boss 回血后进度条回退；
   * 文字「對 Boss 傷害」仍是累计 damageDealt，互不冲突。 */
  const totalHp = b.bossMaxHp + b.bossMaxArmor;
  const _curCurHp = b.bossHp + b.bossArmor;
  const dealtPct = Math.max(0, Math.min(100, (1 - _curCurHp / totalHp) * 100));

  z1.innerHTML = '<div class="battle-scene"><div class="battle-bg" style="background-image:url(\'' + getBossBgPath(b.bossId) + '\')"></div><div class="fighter boss-f" id="fighter-boss" style="left:' + (b.bx * 100) + '%"><div class="hpbar-wrap' + ((b.shieldMaxHp > 0 && !b.shieldBroken) ? ' has-shield' : '') + '" id="boss-hpbar-wrap"><div class="nm">' + b.bossName + ((b.bossId.indexOf('_ii') >= 0 && b.bossName.indexOf('II') === -1) ? ' II' : '') + '</div>' + ((b.shieldMaxHp > 0 && !b.shieldBroken) ? '<div class="shield-bar-wrap" id="shield-bar-wrap"><div class="bar"><div class="fill" id="boss-shield" style="width:' + (b.shieldHp / b.shieldMaxHp * 100) + '%"></div></div></div>' : '') + '<div class="bar ap"><div class="fill" id="boss-ap" style="width:' + (b.bossArmor / b.bossMaxArmor * 100) + '%"></div></div><div class="bar hp"><div class="fill" id="boss-hp" style="width:' + (b.bossHp / b.bossMaxHp * 100) + '%"></div></div></div><div class="sprite" id="boss-sprite">' + (BOSS_LAYERS[b.bossId] ? '<canvas id="boss-battle-canvas"></canvas>' : bossIcon(b.bossId)) + '</div></div><div class="fighter hero-f" id="fighter-hero" style="left:' + (b.px * 100) + '%"><div class="hpbar-wrap"><div class="nm">玩家</div><div class="bar ap"><div class="fill" id="hero-ap" style="width:' + (b.playerArmor / b.playerMaxArmor * 100) + '%"></div></div><div class="bar hp"><div class="fill" id="hero-hp" style="width:' + (b.playerHp / b.playerMaxHp * 100) + '%"></div></div></div><div class="sprite" id="hero-sprite"><canvas id="hero-battle-canvas"></canvas></div></div><div class="head-bars" id="head-bars"></div><div id="battle-fx"></div></div>';

  {
    const _z1w = z1.clientWidth || 400;
    const _z1h = z1.clientHeight || 500;
    const _sm0 = (typeof computeScreenMetrics === 'function') ? computeScreenMetrics(_z1w, _z1h) : { screenRightWorld: 4.2, bgPixelsPerMeter: 88 };
    battle.sm = _sm0;
    battle.px = (typeof EXPLORE_HERO_X_RATIO === 'number') ? EXPLORE_HERO_X_RATIO : 0.25;
    battle.bx = battle.px + (battle.bossWorldX - battle.playerWorldX) / (_sm0.screenRightWorld || 4.2) * (1 - battle.px);
    battle.bgPixelsPerMeter = _sm0.bgPixelsPerMeter || 88;
    const _bgElInit = z1.querySelector('.battle-bg');
    if(_bgElInit){
      _bgElInit.style.backgroundPositionX = (-(battle.playerWorldX || 0) * battle.bgPixelsPerMeter) + 'px';
      _bgElInit.style.backgroundSize = 'auto 100%';
      _bgElInit.style.backgroundRepeat = 'repeat-x';
    }
  }

  updateFighterPos();
  requestAnimationFrame(function(){
    if(battle) battle.lastH = 0;
    renderBattleHeroCanvas();
    renderBossBattleCanvas();
  });

  const bs = document.getElementById('boss-sprite');
  if(bs) _bindBattleTap(bs, function(e){
    let _cx, _cy;
    if(e.changedTouches && e.changedTouches[0]){ _cx = e.changedTouches[0].clientX; _cy = e.changedTouches[0].clientY; }
    else if(e.touches && e.touches[0]){ _cx = e.touches[0].clientX; _cy = e.touches[0].clientY; }
    else { _cx = e.clientX; _cy = e.clientY; }
    if(typeof _cx !== 'number' || typeof _cy !== 'number' || isNaN(_cx) || isNaN(_cy)) return;

    const bossSprite = document.getElementById('boss-sprite');
    if(!bossSprite) return;
    const def = BOSS_LAYERS[battle.bossId];
    if(!def) return;
    const scene = document.querySelector('.battle-scene');
    if(!scene) return;
    const sceneRect = scene.getBoundingClientRect();
    const spriteRect = bossSprite.getBoundingClientRect();
    const spriteX = _cx - spriteRect.left;
    const spriteY = _cy - spriteRect.top;
    const _tf = getBossCanvasTransform(def, battle.bossId, spriteRect.width, spriteRect.height);
    const canvasX = (spriteX - _tf.ox) / _tf.sx;
    const canvasY = (spriteY - _tf.oy) / _tf.sy;
    const part = pickAimPartFromClick(canvasX, canvasY);
    if(part){
      battle.aimPart = part;
      try {
        const _def = BOSS_LAYERS[battle.bossId];
        const _anims = BOSS_ANIMS[battle.bossId];
        const _anim = _anims ? (_anims[battleBossAnim.name] || _anims.idle) : null;
        if(_def && _anim){
          const _fi = ((battleBossAnim.frame % _anim.frameCount) + _anim.frameCount) % _anim.frameCount;
          const _L = _def.layers.find(function(l){ return l.id === part; });
          if(_L){
            const _k = (_anim.keys && _anim.keys[part] && _anim.keys[part][_fi]) || { rot: 0, dx: 0, dy: 0 };
            const _w = _def.canvas.w * (_k.w !== undefined ? _k.w : _L.w);
            const _h = _def.canvas.h * (_k.h !== undefined ? _k.h : _L.h);
            const _px = _w * _L.pivot.x;
            const _py = _h * _L.pivot.y;
            const _world = resolveBossWorld(_def, _anim, _fi);
            const _wp = _world[part];
            if(_wp && _w > 0 && _h > 0){
              const _angle = -_wp.rot * BOSS_DEG2RAD;
              const _cosA = Math.cos(_angle), _sinA = Math.sin(_angle);
              const _dx = canvasX - _wp.wx;
              const _dy = canvasY - _wp.wy;
              const _localX = _dx * _cosA - _dy * _sinA + _px;
              const _localY = _dx * _sinA + _dy * _cosA + _py;
              battle.aimLocal = { part: part, u: _localX / _w, v: _localY / _h };
            }
          }
        }
      } catch(e){ battle.aimLocal = null; }

      const fx = document.getElementById('battle-fx');
      if(fx){
        /* rev-fix-aim-marker-reuse: 复用同一个 marker，避免快速连点时创建/移除闪烁 */
        let m = document.getElementById('aim-marker');
        if(!m){
          m = document.createElement('div');
          m.className = 'aim-marker';
          m.id = 'aim-marker';
          fx.appendChild(m);
        }
        m.style.left = ((_cx - sceneRect.left) / sceneRect.width * 100) + '%';
        m.style.top = ((_cy - sceneRect.top) / sceneRect.height * 100) + '%';
        if(m._timer) clearTimeout(m._timer);
        m._timer = setTimeout(function(){ if(m.parentNode) m.remove(); }, 1000);
      }
    }
  });
}

function _bindBattleTap(el, handler){
  if(!el) return;
  /* rev-fix-bind-tap-pointerdown: 用 pointerdown 取代 touchstart + click。
   * 桌面端 click 需等 mouseup 才触发，快速连点有延迟感；
   * 移动端 touchstart 已即时响应但合成 click 需抑制。改 pointerdown 统一。 */
  el.addEventListener('pointerdown', function(e){
    if(e.button !== undefined && e.button !== 0) return;
    if(e.pointerType === 'touch' || e.pointerType === 'pen'){
      e.preventDefault();
      e.stopPropagation();
    }
    handler(e);
  }, { passive: false });
}

function renderBattleJoystick(z2){
  z2.innerHTML = '<div class="joystick" id="joystick"><div class="stick" id="stick"></div></div>';
  const joy = document.getElementById('joystick'), stick = document.getElementById('stick');
  let touchId = null, cx, cy, radius;

  if(battle){
    battle._joystickCancel = function(){ touchId = null; };
  }
  function start(e){
    const r = joy.getBoundingClientRect();
    cx = r.left + r.width / 2;
    cy = r.top + r.height / 2;
    radius = r.width / 2;
    const t = e.changedTouches ? e.changedTouches[0] : e;
    touchId = e.changedTouches ? t.identifier : null;
    move(e);
  }
  function move(e){
    if(!battle || !battle.active) return;
    if(e.changedTouches && touchId === null) return;
    if(battle.consuming) interruptHeal();
    let t = e;
    if(e.changedTouches) t = Array.from(e.changedTouches).find(function(x){ return x.identifier === touchId; }) || e.changedTouches[0];
    let dx = t.clientX - cx;
    let dy = t.clientY - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if(dist > radius){ dx = dx / dist * radius; dy = dy / dist * radius; }
    stick.style.left = (radius + dx) + 'px';
    stick.style.top = (radius + dy) + 'px';
    stick.style.transform = 'translate(-50%,-50%)';
    battle.moveDir = dx / radius;
  }
  function end(e){
    if(e.changedTouches && touchId !== null){
      const found = Array.from(e.changedTouches).find(function(x){ return x.identifier === touchId; });
      if(!found) return;
    }
    touchId = null;
    if(battle) battle.moveDir = 0;
    stick.style.left = '50%';
    stick.style.top = '50%';
  }
  joy.addEventListener('touchstart', function(e){ e.preventDefault(); start(e); }, { passive: false });
  joy.addEventListener('touchmove', function(e){ e.preventDefault(); move(e); }, { passive: false });
  joy.addEventListener('touchend', function(e){ e.preventDefault(); end(e); }, { passive: false });
  joy.addEventListener('touchcancel', function(e){ end(e); });
  joy.addEventListener('mousedown', function(e){
    start(e);
    const mm = function(ev){ move(ev); };
    const mu = function(){
      end({});
      document.removeEventListener('mousemove', mm);
      document.removeEventListener('mouseup', mu);
    };
    document.addEventListener('mousemove', mm);
    document.addEventListener('mouseup', mu);
  });
}

function buildBattleWeaponInfo(){
  if(!battle) return '無武器';
  const w = battle.weapon, wdef = w ? w.def : null;
  if(!wdef) return '無武器';
  if(wdef.slot === 'melee') return wdef.name + ' ｜ 近戰';
  if(wdef.slot === 'throwable') return wdef.name + ' ｜ ×' + getThrowableCount();
  const ammoTotal = battle.ammoRef ? battle.ammoRef.count : 0;
  let rarityIcon = '';
  if(battle.ammoRef){
    const rr = battle.ammoRef.rarity;
    rarityIcon = '<span class="' + rarityClass(rr) + '" style="font-size:13px;margin:0 5px;vertical-align:middle">' + (RARITY_ICON[rr] || '●') + '</span>';
  }
  return wdef.name + ' ｜ ' + battle.ammoInMag + '/' + (wdef.mag || 0) + rarityIcon + '備彈 ' + ammoTotal + (battle.reloading ? '｜裝填中…' : '');
}

var _bclPrev = null;
function refreshBattleControlsLive(){
  if(!battle) return;
  /* rev-fire-live: 可用性是連續變化狀態（射程／發現／裝填／使用中）的推導值。
     舊版只在離散事件重算 → 走進射程後按鈕仍灰。現在 battleLoop 每幀呼叫，
     判據沿用同一條（不新增第二套定義），但只在值真的改變時寫 DOM，
     避免每幀重建 innerHTML。renderBattleControls 重建 DOM 後元素身分改變，
     快取自動失效，heal-btn 等無模板初值的狀態會被重新套用。 */
  const info = document.getElementById('battle-ammo-info');
  const fb = document.getElementById('fire-btn');
  const hb = document.getElementById('heal-btn');
  const ds = document.getElementById('battle-dmg-status');
  if(!_bclPrev || _bclPrev.b !== battle || _bclPrev.fb !== fb || _bclPrev.hb !== hb || _bclPrev.info !== info){
    _bclPrev = { b:battle, fb:fb, hb:hb, info:info, html:null, fire:null, label:null, heal:null, dmg:null };
  }
  if(info){
    const _html = buildBattleWeaponInfo();
    if(_html !== _bclPrev.html){ info.innerHTML = _html; _bclPrev.html = _html; }
  }
  if(fb){
    const canFire = !battle.reloading && !battle.consuming && (typeof isAimPartInRange !== 'function' || isAimPartInRange()); /* rev-detect: 未發現/超射程即灰掉 */
    if(canFire !== _bclPrev.fire){ fb.classList.toggle('disabled', !canFire); _bclPrev.fire = canFire; }
    const _label = battle.reloading ? '裝填' : (battle.consuming ? '使用中' : '攻擊');
    if(_label !== _bclPrev.label){ fb.textContent = _label; _bclPrev.label = _label; }
  }
  if(hb){
    const now = performance.now();
    const canHeal = !battle.consuming && !battle.reloading && now >= (battle.healDisabledUntil || 0) && battle.playerHp < battle.playerMaxHp;
    if(canHeal !== _bclPrev.heal){ hb.classList.toggle('disabled', !canHeal); _bclPrev.heal = canHeal; }
  }
  if(ds){
    const _dmg = '對 Boss 傷害：' + Math.round(battle.damageDealt) + ' ｜ ' + (battle.engaged ? '⚔️ 已交戰' : '⏸️ 準備中');
    if(_dmg !== _bclPrev.dmg){ ds.textContent = _dmg; _bclPrev.dmg = _dmg; }
  }
}function renderBattleControls(z3){
  const w = battle.weapon;
  const wdef = w ? w.def : null;
  const _allModes = wdef && wdef.modes ? wdef.modes : ['點射'];
  const _BURST_WHITELIST = ['ak12'];
  const _wid = battle.weapon ? battle.weapon.id : '';
  let _baseId = _wid;
  if(_wid && isNamedWeaponId(_wid)){
    const _p = _wid.split('_');
    if(_p.length >= 2) _baseId = _p[1];
  }
  const modes = _allModes.filter(function(m){
    if(m === '長點射') return false;
    if(m === '短點射' && _BURST_WHITELIST.indexOf(_baseId) === -1) return false;
    return true;
  });
  if(modes.indexOf(battle.fireMode) === -1) battle.fireMode = modes[0] || '點射';
  const canFire = !battle.reloading && !battle.consuming && (typeof isAimPartInRange !== 'function' || isAimPartInRange()); /* rev-detect: 未發現/超射程即灰掉 */

  z3.innerHTML = '<div class="ctrl-wrap"><div class="ammo-info" id="battle-ammo-info">' + buildBattleWeaponInfo() + '</div><div class="fire-modes">' + modes.map(function(m){ return '<div class="fm-btn ' + (m === battle.fireMode ? 'on' : '') + '" data-mode="' + m + '">' + m + '</div>'; }).join('') + '</div><div style="display:flex;gap:4px"><div class="weapon-slot-btn ' + (battle.weaponSlot === 'primary' ? 'on' : '') + '" data-slot="primary" style="flex:1">主武器</div><div class="weapon-slot-btn ' + (battle.weaponSlot === 'secondary' ? 'on' : '') + '" data-slot="secondary" style="flex:1">副武器</div><div class="weapon-slot-btn ' + (battle.weaponSlot === 'melee' ? 'on' : '') + '" data-slot="melee" style="flex:1">近戰</div><div class="weapon-slot-btn ' + (battle.weaponSlot === 'throwable' ? 'on' : '') + '" data-slot="throwable" style="flex:1">投擲</div></div><div style="flex:1;display:flex;align-items:center;justify-content:center;gap:40px;"><div class="heal-btn" id="heal-btn">✚</div><div class="fire-btn ' + (canFire ? '' : 'disabled') + '" id="fire-btn">' + (battle.reloading ? '裝填' : (battle.consuming ? '使用中' : '攻擊')) + '</div></div><!--rev-fix-remove-dmg-status--></div>';

  z3.querySelectorAll('.fm-btn').forEach(function(b){
    _bindBattleTap(b, function(){
      if(!battle) return;
      battle.fireMode = b.dataset.mode;
      battle.fireHeld = false;
      battle.burstLeft = 0;
      renderBattleControls(document.getElementById('zone3'));
    });
  });
  z3.querySelectorAll('.weapon-slot-btn').forEach(function(b){
    _bindBattleTap(b, function(){ switchBattleWeapon(b.dataset.slot); });
  });

  const fb = document.getElementById('fire-btn');
  if(fb){
    fb.addEventListener('touchstart', function(e){ e.preventDefault(); startPlayerFire(); }, { passive: false });
    fb.addEventListener('touchend', function(e){ e.preventDefault(); stopPlayerFire(); }, { passive: false });
    fb.addEventListener('touchcancel', function(){ stopPlayerFire(); });
    fb.addEventListener('mousedown', function(e){ e.preventDefault(); startPlayerFire(); });
    fb.addEventListener('mouseup', function(){ stopPlayerFire(); });
    fb.addEventListener('mouseleave', function(){ stopPlayerFire(); });
  }
  const hb = document.getElementById('heal-btn');
  if(hb){
    hb.addEventListener('touchstart', function(e){ e.preventDefault(); manualHeal(); }, { passive: false });
    hb.addEventListener('mousedown', function(e){ e.preventDefault(); manualHeal(); });
  }
  refreshBattleControlsLive();
}

function switchBattleWeapon(slot){
  if(slot === 'throwable' && getThrowableCount() <= 0) ensureThrowableFromBackpack();
  const w = equippedWeapon(slot);
  if(!w || !itemDef(w.id)) return;
  const def = itemDef(w.id);
  battle.weaponStates = battle.weaponStates || {};
  if(battle.weaponSlot){
    battle.weaponStates[battle.weaponSlot] = { ammoInMag: battle.ammoInMag, ammoRef: battle.ammoRef, fireMode: battle.fireMode };
  }
  if(battle.reloading){ battle.reloading = false; }
  battle.weapon = w;
  battle.weaponSlot = slot;
  const _prevSt = battle.weaponStates[slot];
  if(_prevSt && _prevSt.fireMode && def.modes && def.modes.includes(_prevSt.fireMode)){
    battle.fireMode = _prevSt.fireMode;
  } else {
    battle.fireMode = def.modes ? def.modes[0] : '點射';
  }
  battle.fireHeld = false;
  battle.burstLeft = 0;
  battle.playerWeaponRange = def.range || 0.5;
  battle.playerWeaponRangeM = (typeof _rangeOfWeaponDef === 'function') ? _rangeOfWeaponDef(def) : (def.range || 30);
  const prevSt = battle.weaponStates[slot];
  if(prevSt){
    battle.ammoInMag = prevSt.ammoInMag || 0;
    battle.ammoRef = prevSt.ammoRef;
  } else if(def.cal){
    const ammo = pickAmmoByPreferenceOrOrder(def.cal, 'combat');
    if(!ammo){ battle.ammoRef = null; battle.ammoInMag = 0; }
    else {
      const need = def.mag || 30;
      const take = Math.min(need, ammo.count);
      invRemove(ammo.id, ammo.rarity, take);
      battle.ammoRef = { id: ammo.id, rarity: ammo.rarity, count: ammo.count - take };
      battle.ammoInMag = take;
    }
    battle.weaponStates[slot] = { ammoInMag: battle.ammoInMag, ammoRef: battle.ammoRef };
  } else {
    battle.ammoRef = null;
    battle.ammoInMag = def.slot === 'throwable' ? getThrowableCount() : 1;
    battle.weaponStates[slot] = { ammoInMag: battle.ammoInMag, ammoRef: null };
  }
  {
    const _swAnim = (slot === 'secondary') ? 'switch_secondary' : (slot === 'melee') ? 'switch_melee' : 'idle';
    const _swDur = (slot === 'primary') ? 0 : 900;
    if(battleHeroAnim.name !== _swAnim){
      battleHeroAnim.name = _swAnim;
      battleHeroAnim.frame = 0;
    }
    battleHeroAnim.lastUpdate = performance.now();
    battleHeroAnim.forcedEnd = performance.now() + _swDur;
  }
  renderBattleControls(document.getElementById('zone3'));
}

/* ============== 玩家攻擊 ============== */
function fireInterval(mode, weapon){
  const def = weapon ? weapon.def : null;
  const rpm = def && def.rpm ? def.rpm : 600;
  const maxInterval = 60000 / rpm;
  let base = { '點射': 350, '短點射': 180, '長點射': 120, '掃射': 90, '近戰': 500, '投擲': 800 }[mode] || 300;
  if(mode === '點射') base = maxInterval;
  if(mode === '短點射' || mode === '長點射' || mode === '掃射') base = Math.max(maxInterval, 90);
  return Math.max(maxInterval, base);
}

const FIRE_BURST_COUNT = { '點射': 1, '短點射': 3, '長點射': 7, '近戰': 1, '投擲': 1 };

function startPlayerFire(){
  if(!battle || !battle.active) return;
  if(battle.settling) return;
  if(battle.reloading) return;
  if(!isAimPartInRange()) return; /* rev-detect: 唯一閘門（發現 + 射程） */
  if(battle.consuming){
    if(battle.healTimer){ clearTimeout(battle.healTimer); battle.healTimer = null; }
    battle._healToken = (battle._healToken || 0) + 1;
    battle.consuming = false;
    battle.autoHealing = false;
    const now = performance.now();
    if(now >= (battle.healDisabledUntil || 0)){
      battle.healDisabledUntil = now + 2000;
    }
    refreshBattleControlsLive();
  }

  const wdef = battle.weapon && battle.weapon.def;
  const rpm = (wdef && wdef.rpm) ? wdef.rpm : 600;
  const cdMs = 60000 / rpm;
  const now = performance.now();
  if(now - (battle.lastManualClick || 0) < cdMs) return;
  battle.lastManualClick = now;

  if(battle.fireMode === '掃射'){
    battle.fireHeld = true;
  } else {
    const n = FIRE_BURST_COUNT[battle.fireMode] || 1;
    battle.burstLeft = Math.min(30, (battle.burstLeft || 0) + n);
  }
}

function stopPlayerFire(){
  if(!battle) return;
  battle.fireHeld = false;
}

function slotCanFire(slot){
  if(!battle) return false;
  const w = equippedWeapon(slot);
  if(!w) return false;
  const def = w.def;
  if(def.slot === 'melee') return true;
  if(def.slot === 'throwable') return getThrowableCount() > 0;
  if(!def.cal) return true;
  const st = battle.weaponStates && battle.weaponStates[slot];
  if(st){
    if((st.ammoInMag || 0) > 0) return true;
    if(st.ammoRef && st.ammoRef.count > 0) return true;
  }
  const ammo = pickAmmoByPreferenceOrOrder(def.cal, 'combat');
  return !!ammo;
}

function autoSwitchOnNoAmmo(){
  if(!battle) return false;
  const order = ['primary','secondary','melee'];
  const curIdx = order.indexOf(battle.weaponSlot);
  if(curIdx < 0) return false;
  for(let i = curIdx + 1; i < order.length; i++){
    const nextSlot = order[i];
    if(nextSlot === 'melee'){
      if(state.player.equipped.melee && equippedWeapon('melee')){
        switchBattleWeapon('melee');
        return true;
      }
    } else {
      if(slotCanFire(nextSlot)){
        switchBattleWeapon(nextSlot);
        return true;
      }
    }
  }
  return false;
}

function triggerReload(){
  if(!battle || !battle.active) return;
  if(battle.reloading) return;
  const w = battle.weapon;
  if(!w || !w.def || !w.def.cal) return;
  const def = w.def;
  if(!battle.ammoRef || battle.ammoRef.count <= 0) return;
  if(battle.ammoInMag >= (def.mag || 30)) return;
  battle.reloading = true;
  battle.firing = false;
  battle.burstLeft = 0;
  battle._reloadToken = (battle._reloadToken || 0) + 1;
  const _myReloadToken = battle._reloadToken;
  refreshBattleControlsLive();
  if(battleHeroAnim.name !== 'reload'){
    battleHeroAnim.name = 'reload';
    battleHeroAnim.frame = 0;
    battleHeroAnim.lastUpdate = performance.now();
  }
  const _reloadAnim = GAME_ANIMS.reload;
  const _reloadMs = _reloadAnim ? Math.round((_reloadAnim.frameCount / _reloadAnim.fps) * 1000) : 1000;
  battleHeroAnim.forcedEnd = performance.now() + _reloadMs;
  const currentSlot = battle.weaponSlot;
  setTimeout(function(){
    if(!battle || !battle.active) return;
    if(battle._reloadToken !== _myReloadToken) return;
    if(battle.weaponSlot !== currentSlot) return;
    const need = def.mag || 30;
    const take = Math.min(need, battle.ammoRef.count);
    invRemove(battle.ammoRef.id, battle.ammoRef.rarity, take);
    battle.ammoInMag = take;
    battle.ammoRef.count -= take;
    battle.weaponStates[battle.weaponSlot] = { ammoInMag: battle.ammoInMag, ammoRef: battle.ammoRef };
    battle.reloading = false;
    if(battleHeroAnim.name === 'reload'){ battleHeroAnim.name = 'idle'; battleHeroAnim.frame = 0; }
    refreshBattleControlsLive();
  }, _reloadMs);
}


function playerShoot(){
if(battle.settling) return false;
let w = battle.weapon;
if(!w || battle.reloading || battle.consuming) return false;
let def = w.def;
if(!isAimPartInRange()) return false; /* rev-detect: 唯一閘門（發現 + 射程） */
const isMelee = def.slot === 'melee';
if(def.cal && battle.ammoInMag <= 0){
if(!(battle.ammoRef && battle.ammoRef.count > 0)){
const switched = autoSwitchOnNoAmmo();
if(!switched){ battle.firing = false; battle.burstLeft = 0; }
return false;
}
}
battle.shotLockUntil = performance.now() + 350;
/* rev-fix-boss-throw-anim: 投擲復用近戰 attack_melee */
{
const _isThrow = (battle.weaponSlot === 'throwable');
const _isMelee = (battle.weaponSlot === 'melee');
const _amAnim = (typeof GAME_ANIMS !== 'undefined' && GAME_ANIMS.attack_melee) ? GAME_ANIMS.attack_melee : null;
const _amDur = _amAnim ? Math.round(_amAnim.frameCount / _amAnim.fps * 1000) : 600;
if(battle.weaponSlot === 'secondary'){
battleHeroAnim.name = 'fire_secondary';
battleHeroAnim.frame = 0;
battleHeroAnim.lastUpdate = performance.now();
battleHeroAnim.forcedEnd = performance.now() + 350;
} else if(_isMelee || _isThrow){
battleHeroAnim.name = 'attack_melee';
battleHeroAnim.frame = 0;
battleHeroAnim.lastUpdate = performance.now();
battleHeroAnim.forcedEnd = performance.now() + _amDur;
} else {
battleHeroAnim.name = 'fire_primary';
battleHeroAnim.frame = 0;
battleHeroAnim.lastUpdate = performance.now();
battleHeroAnim.forcedEnd = performance.now() + 350;
}
}
const _effectiveMode = (typeof _getFireChainMode === 'function') ? _getFireChainMode(battle) : (battle.fireMode || '點射');
/* ═══ rev-bossbox: 槍彈走統一武器核心（aimY/aimZ 幾何瞄準 + 散佈 → 部位） ═══ */
if(def.cal){
if(battle.ammoInMag <= 0){ triggerReload(); return false; }
if(typeof window._weaponFire !== 'function' || !battle.bossTarget) return false;
battle.ammoInMag--;
const mz = getPlayerMuzzlePos();
const _fxElB = document.getElementById('battle-fx');
if(window.MuzzleFX) window.MuzzleFX.spawn(mz.x*(_fxElB?_fxElB.clientWidth:400), mz.y*(_fxElB?_fxElB.clientHeight:500), w.def.type==='機槍'?1.2:1.0, false, 'boss');
const _spd = (window.AMMO_SPEED_MS && window.AMMO_SPEED_MS[def.cal]) || 800;
const hitRate = getHitRate(def.type);
const _aRef = battle.ammoRef;
const ammoPenMM = _aRef ? (AMMO[_aRef.id].penMM || 0) : 0;
const pellets = _aRef ? (AMMO[_aRef.id].pellets || 1) : 1;
const _aId = _aRef ? _aRef.id : null;
const _aRar = _aRef ? _aRef.rarity : '一般';
const _wRar = w.rarity, _wId = w.id, _fbDmg = def.dmg || 20;
const _bc = (battle._chainShots || 1);
const _rng = battle.playerWeaponRangeM || 30;
const _aimM = (typeof window._bossAimMeters === 'function') ? window._bossAimMeters() : {aimY:0.85,aimZ:0};
for(let pi = 0; pi < pellets; pi++){
window._weaponFire({
owner: battle,
weaponId: _wId,
ammoId: _aId,
target: battle.bossTarget,
startX: battle.playerWorldX,
startY: 1.3,
targetWorldX: battle.bossWorldX,
targetVx: 0,
targetY: 0,
flightSpeed: _spd,
hr: hitRate,
burstCount: _bc,
weaponRange: _rng,
aimY: _aimM.aimY,
aimZ: _aimM.aimZ,
guidanceMode: 'none',
isEnemyBullet: false,
onHit: function(hx, hy, tgt, part){
if(!battle || battle.settling) return;
const _d = (typeof _calcAttackDamage === 'function') ? _calcAttackDamage({
ammoId: _aId, ammoRarity: _aRar, weaponRarity: _wRar, penMM: ammoPenMM, fallbackDmg: _fbDmg
}) : { baseDmg: _fbDmg, crit: false };
const _sp = (typeof window._bossWorldToScreenN === 'function') ? window._bossWorldToScreenN(hx, hy) : {x:battle.bx,y:0.6};
const _dmg = _d.baseDmg, _crit = _d.crit;
if(part && part !== 'body'){
battle.engaged = true;
battle.bossHp = Math.max(0, battle.bossHp - _dmg);
battle.damageDealt += _dmg;
spawnHitFx('boss', 0, '-' + _dmg + (_crit ? '!' : ''), _crit ? 'crit' : 'weak', _sp.x, _sp.y);
if(isBossType(battle.bossId, 'omega') && battle.arms) damageOmegaArm(part, _dmg);
if(battle.bossHp <= 0){ endBattle(true); return; }
} else {
applyBossDamage(_dmg, _crit, ammoPenMM, false, false, false, part || 'body');
}
},
onMiss: function(ix, iy){
if(!battle) return;
const _sp = (typeof window._bossWorldToScreenN === 'function') ? window._bossWorldToScreenN(ix, Math.max(0, iy)) : {x:battle.bx,y:0.6};
spawnHitFx('boss', 0, 'MISS', 'miss', _sp.x, _sp.y);
}
});
}
addProf(battle.weaponSlot, 0.01);
if(def.type) addProf(def.type, 0.01);
refreshBattleControlsLive();
return true;
}
/* ═══ 投擲 / 近戰 ═══ */
if(def.slot === 'throwable'){
if(getThrowableCount() <= 0){
if(!ensureThrowableFromBackpack()){
battle.firing = false;
battle.burstLeft = 0;
return false;
}
const nw = equippedWeapon('throwable');
if(nw){ battle.weapon = nw; w = nw; def = nw.def; }
}
state.player.throwableStock--;
battle.ammoInMag = getThrowableCount();
if(battle.weaponStates[battle.weaponSlot]) battle.weaponStates[battle.weaponSlot].ammoInMag = battle.ammoInMag;
if(state.player.throwableStock <= 0){
if(ensureThrowableFromBackpack()){
const nw = equippedWeapon('throwable');
if(nw){ battle.weapon = nw; w = nw; def = nw.def; }
battle.ammoInMag = getThrowableCount();
if(battle.weaponStates[battle.weaponSlot]) battle.weaponStates[battle.weaponSlot].ammoInMag = battle.ammoInMag;
}
}
}
/* rev-bossbox: 手雷 = 探索同一條鏈（真實拋物線 + casualtyRadius + 覆蓋引擎） */
if(def.slot === 'throwable' && def.explosive && (def.fragments || 0) > 0){
/* rev-boss-throw-unify: 與探索 _playerThrowGrenade 同源 —— 手部釋放幀起點、
   hr → 投擲距離誤差、引信決定爆點。
   舊版外層算一整套變數後內層又重算一次，外層八個變數從未被讀；
   熟練度傷害乘數在破片化後也成死值，一併刪除。
   外層唯一的 live 作用是參數求解失敗時的 return false，移入內層保留。 */
const _hS = _getBossThrowHandPosAtFrame(5);
const _mS = (typeof window._bossScreenMetrics === 'function') ? window._bossScreenMetrics() : { H:500, ppm:100, px:0.25, srw:4.2 };
const _H0S = (typeof _handYToH0 === 'function') ? _handYToH0(_hS.y) : Math.max(0.05, (0.95 - _hS.y) * _mS.H / _mS.ppm);
const _wsxS = battle.playerWorldX + (_hS.x - _mS.px) / (1 - _mS.px) * _mS.srw;
const _aimS = (typeof window._bossAimMeters === 'function') ? window._bossAimMeters() : { aimWX: battle.bossWorldX };
const _aimWXS = (typeof _aimS.aimWX === 'number') ? _aimS.aimWX : battle.bossWorldX;
const _hrS = (typeof getHitRate === 'function') ? getHitRate(def.type) + 10 : 40;
const _rawDistS = Math.max(0.01, Math.abs(_aimWXS - _wsxS));
const _distS = (typeof _grenadeThrowDist === 'function') ? _grenadeThrowDist(_rawDistS, _hrS / 100) : _rawDistS;
const _parS = (typeof _calcGrenadeParams === 'function') ? _calcGrenadeParams(_distS, w.id, _H0S) : null;
if(!_parS) return false;
const _dirS = (_aimWXS >= _wsxS) ? 1 : -1;
const _landS = _wsxS + _dirS * _parS.vx * _parS.T;
const _amS = (typeof GAME_ANIMS !== 'undefined' && GAME_ANIMS.attack_melee) ? GAME_ANIMS.attack_melee : null;
const _relS = performance.now() + (_amS ? Math.round(5 / _amS.fps * 1000) : 357);
const _txS = _mS.px + (_landS - battle.playerWorldX) / _mS.srw * (1 - _mS.px);
const _gDS = def, _gRS = w.rarity || '一般', _gWS = w;
battle.bullets.push({
isGrenade:true, grenadeId:_gWS.id, rarity:_gRS, player:true, big:true, arc:true, hit:true,
worldStartX:_wsxS, H0:_H0S, dir:_dirS, vx:_parS.vx, vy:_parS.vy, T:_parS.T,
start:_relS, releaseAt:_relS, startTime:_relS, duration:_parS.T * 1000,
sx:_hS.x, sy:_hS.y, tx:_txS, ty:0.95, t:0,
_onHit: function(){
if(typeof window._bossGrenadeBurst !== 'function') return;
var _bpS = (typeof _grenadeBurstPoint === 'function')
? _grenadeBurstPoint(_gDS, _wsxS, _dirS, _parS, _H0S, battle.bossTarget, _landS)
: null;
window._bossGrenadeBurst(_gDS, _gRS, _hrS, _landS, _gWS, 0, _bpS);
}
});
addProf(battle.weaponSlot, 0.01);
if(def.type) addProf(def.type, 0.01);
refreshBattleControlsLive();
return true;
}
/* 近戰 / 無破片投擲：保留即時接觸結算 */
const hitRate = getHitRate(def.type) + 10;
const baseDmg = Math.round((def.dmg || 0) * (RARITY_MULT[w.rarity] || 1));
const critRate = calcCritRate(w.rarity, '一般');
const critMult = calcCritMult(w.rarity, '一般');
const mz = getPlayerMuzzlePos();
const target = getAimTargetPos();
if(!isMelee){
const isArc = def.slot === 'throwable';
battle.bullets.push({ sx: mz.x, sy: mz.y, tx: target.x, ty: target.y, t: 0, player: true, big: true, arc: isArc });
}
const hits = isMelee ? getMeleeHits(def.rpm) : 1;
for(let i = 0; i < hits; i++){
  /* rev-animatk: 近戰對幀 —— 接觸幀 5（front_arm 最前），hits 分散 [4,5,6]，每下重檢 */
  (function(_i){
    var _run = function(){
      if(!battle || !battle.active || battle.settling) return;
      if(isMelee){
        if(battle.weaponSlot !== 'melee') return;
        var _dN = Math.abs(battle.bossWorldX - battle.playerWorldX);
        var _rngN = (typeof _rangeOfWeaponDef === 'function') ? _rangeOfWeaponDef(def) : 0.75;
        if(_dN > _rngN + BOSS_HALF_WIDTH_M) return;
      }

/* rev-melee-geom: 接觸幀幾何 —— 玩家瞄準點 + 散佈 → slab 求交 */
var _aimB = (typeof window._bossAimMeters === 'function') ? window._bossAimMeters() : { aimY:0.85, aimZ:0 };
var _rngB = (typeof _rangeOfWeaponDef === 'function') ? _rangeOfWeaponDef(def) : 0.75;
var _msB = (typeof window._meleeStrike === 'function')
  ? window._meleeStrike(battle.playerWorldX, battle.bossTarget, { weaponId:w.id, weaponType:def.type, hr:hitRate, range:_rngB, aimY:_aimB.aimY, aimZ:_aimB.aimZ })
  : null;
if(_msB){
/* rev-melee-geom: 命中由接觸幀幾何決定 —— 玩家選定瞄準點 + 散佈 → slab 求交，
   部位由實際入射點經 _bossPartFromUV 判定，不再用 isWeakPointHit() 的布林。
   統一走 applyBossDamage（單一 Boss 入口）：弱點 0 甲、Hydra 走頭部 HP、
   Omega 手臂另扣 —— 舊版弱點分支直接扣 bossHp，對 Hydra 是錯的。 */
let dmg = baseDmg;
let isCrit = false;
if(Math.random() < critRate){ dmg = Math.round(dmg * critMult); isCrit = true; }
var _weakB = !!(_msB.part && _msB.part !== 'body');
var _spB = (typeof window._bossWorldToScreenN === 'function') ? window._bossWorldToScreenN(_msB.x, _msB.y) : { x:target.x, y:target.y };
var _h0B = battle.bossHp, _a0B = battle.bossArmor, _s0B = battle.shieldHp || 0;
applyBossDamage(dmg, isCrit, def.penMM || 0, def.slot === 'throwable', true, false, _msB.part || 'body');
if(!battle) return true;
if(_weakB && isBossType(battle.bossId, 'omega') && battle.arms && typeof damageOmegaArm === 'function') damageOmegaArm(_msB.part, dmg);
var _hlB = Math.max(0, _h0B - battle.bossHp);
var _alB = Math.max(0, (_a0B - battle.bossArmor) + (_s0B - (battle.shieldHp || 0)));
var _shownB = _hlB > 0 ? _hlB : _alB;
if(_shownB > 0 && typeof spawnHitFx === 'function'){
  spawnHitFx('boss', 0, '-' + Math.round(_shownB) + (isCrit ? '!' : ''), isCrit ? 'crit' : (_hlB > 0 ? (_weakB ? 'weak' : '') : 'armor'), _spB.x, _spB.y);
}
if(battle.bossHp <= 0){ endBattle(true); return true; }
}

    };
    if(isMelee){
      var _amA = (typeof GAME_ANIMS !== 'undefined' && GAME_ANIMS.attack_melee) ? GAME_ANIMS.attack_melee : null;
      var _fdN = _amA ? 1000/_amA.fps : 71.4;
      setTimeout(_run, Math.round([4,5,6][Math.min(_i,2)] * _fdN));
    } else { _run(); }
  })(i);
}
addProf(battle.weaponSlot, 0.01);
if(def.type) addProf(def.type, 0.01);
refreshBattleControlsLive();
return true;
}


function manualHeal(){
  if(!battle || !battle.active) return;
  if(battle.settling) return;
  stopBattleMovement();
  if(battle.consuming || battle.reloading) return;
  if(performance.now() < (battle.healDisabledUntil || 0)) return;
  if(battle.playerHp >= battle.playerMaxHp) return;
  const item = findNextConsumable();
  if(!item) return;

  battle.consuming = true;
  battle.firing = false;
  battle._healToken = (battle._healToken || 0) + 1;
  const _myHealToken = battle._healToken;
  /* rev-fix-heal-anim: 播放攻擊動作 */
  if(typeof battleHeroAnim !== 'undefined'){
    battleHeroAnim.name = 'heal_melee';
    battleHeroAnim.frame = 0;
    battleHeroAnim.lastUpdate = performance.now();
    battleHeroAnim.forcedEnd = performance.now() + 2100;
    battleHeroAnim.healItem = item.id;
    /* rev-fix-preload-heal-item-boss */
    if(typeof getHeroImg === 'function'){
      try { getHeroImg(window.getItemIconPath(item.id)); } catch(e){}
    }
  }
  if(battle.healTimer) clearTimeout(battle.healTimer);
  battle.healTimer = setTimeout(function(){
    if(!battle || !battle.active){ battle.consuming = false; battle.healTimer = null; return; }
    if(battle._healToken !== _myHealToken) return;
    const medbayLv = getBuildingLv('medbay');
    const actualHeal = calcConsumableHeal(item, medbayLv);
    battle.playerHp = Math.min(battle.playerMaxHp, battle.playerHp + actualHeal);
    invRemove(item.id, item.rarity, 1);
    battle.consuming = false;
    battle.healTimer = null;
    if(typeof battleHeroAnim !== 'undefined') battleHeroAnim.healItem = null;
    if(typeof spawnHitFx === 'function'){ spawnHitFx('player', 0, '+' + actualHeal, 'heal'); }
    pushLog('<span class="pl">玩家</span> 使用 ' + itemDef(item.id).name + '，恢復 ' + actualHeal + ' 生命。', [], 'combat');
    if(typeof refreshBattleControlsLive === 'function') refreshBattleControlsLive();
  }, 2000);
  if(typeof refreshBattleControlsLive === 'function') refreshBattleControlsLive();
}

function battleLoop(now){
if(!battle) return;
/* 備彈自動補位 / 空匣自動裝填 */
if(!battle.settling && battle.weapon && battle.weapon.def && battle.weapon.def.cal){
if(!battle.ammoRef || battle.ammoRef.count <= 0){
const _rfNext = pickAmmoByPreferenceOrOrder(battle.weapon.def.cal, 'combat');
if(_rfNext){
battle.ammoRef = { id: _rfNext.id, rarity: _rfNext.rarity, count: _rfNext.count };
if(battle.weaponSlot) battle.weaponStates[battle.weaponSlot] = { ammoInMag: battle.ammoInMag, ammoRef: battle.ammoRef };
refreshBattleControlsLive();
}
}
if(!battle.reloading && !battle.consuming && battle.ammoInMag <= 0 && battle.ammoRef && battle.ammoRef.count > 0){
triggerReload();
}
}
if(!battle.active) return;
const dt = Math.min(0.05, (now - battle.lastTime) / 1000);
battle.lastTime = now;
if(battle.sweep){ _sweepBattleTick(now, dt); requestAnimationFrame(battleLoop); return; }
/* 結算中：只播死亡動畫，等 finishBattleSettle */
if(battle.settling){
updateBattleBossAnim(now);
renderBattleHeroCanvas();
renderBossBattleCanvas();
const _anims = BOSS_ANIMS[battle.bossId];
const _death = _anims && _anims.death;
if(_death && battleBossAnim.name === 'death' && battleBossAnim.frame >= _death.frameCount - 1 && !battle._settleScheduled){
battle._settleScheduled = true;
setTimeout(finishBattleSettle, 300);
}
try{ if(window._bossOffscreenUpdate) window._bossOffscreenUpdate(); }catch(e){}
requestAnimationFrame(battleLoop);
return;
}
battle.firing = !battle.reloading && !battle.consuming &&
((battle.fireHeld && battle.fireMode === '掃射') || battle.burstLeft > 0);
/* 尺寸唯一擁有者：兩個 sprite / canvas 都撐滿場景高 H。
   位置不在此寫 —— .fighter 全高零寬錨點、.sprite bottom:0、.hpbar-wrap top:13.26% 全由 CSS 負責。
   Boss 內容由 getBossCanvasTransform 縮放到與玩家相同視覺高度。 */
const fxEl = document.getElementById('battle-fx');
if(fxEl){
const H = fxEl.clientHeight;
if(H > 0 && battle.lastH !== H){
battle.lastH = H;
battle.playerCanvasH = H;
battle.playerCanvasW = Math.round(H * 1.2);
battle.playerSpriteW = battle.playerCanvasW;
battle.playerSpriteH = H;
battle.bgPixelsPerMeter = H * CHAR_HEIGHT_FACTOR / PLAYER_HEIGHT_M;
battle.py = BOSS_UNIT_CENTER;
battle.by = BOSS_UNIT_CENTER;
var _sprCss = "position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:" + battle.playerCanvasW + "px;height:" + H + "px;";
var _hs = document.querySelector(".hero-f .sprite");
if(_hs) _hs.style.cssText = _sprCss;
var _bs = document.getElementById("boss-sprite");
if(_bs) _bs.style.cssText = _sprCss;
var _hc = document.getElementById("hero-battle-canvas");
if(_hc){ _hc.style.width = "100%"; _hc.style.height = "100%"; _hc.style.display = "block"; }
var _bc = document.getElementById("boss-battle-canvas");
if(_bc){ _bc.style.width = "100%"; _bc.style.height = "100%"; _bc.style.display = "block"; }
updateFighterPos();
}
}
/* 移動 */
const hasMoveInput = (battle.moveDir !== 0);
/* rev-detect: 後退輸入立即取消殘餘連射，避免被 burst 卡住無法後退 */
if(hasMoveInput && battle.moveDir < 0){ battle.burstLeft = 0; battle.fireHeld = false; }
if(hasMoveInput && battle.consuming) interruptHeal();
const canMove = !battle.consuming && !battle.reloading && (battle.moveDir < 0 || (!battle.firing && now >= (battle.shotLockUntil || 0))); /* rev-detect: 後退豁免射擊鎖 */
if(canMove && hasMoveInput){
let newPWX = Math.max(0, battle.playerWorldX + battle.moveDir * PLAYER_MOVE_SPEED_MPS * dt);
const _maxPWX = battle.bossWorldX - BOSS_MIN_GAP_M;
if(newPWX > _maxPWX) newPWX = Math.max(0, _maxPWX);
battle.playerWorldX = newPWX;
}
/* 相機：玩家固定 25%，背景向左滾 */
{
const _fxW = fxEl ? fxEl.clientWidth : 400;
const _fxH = fxEl ? fxEl.clientHeight : 500;
battle.sm = (typeof computeScreenMetrics === 'function') ? computeScreenMetrics(_fxW, _fxH) : { screenRightWorld: 4.2, bgPixelsPerMeter: 88 };
battle.px = (typeof EXPLORE_HERO_X_RATIO === 'number') ? EXPLORE_HERO_X_RATIO : 0.25;
const _srw = battle.sm.screenRightWorld || 4.2;
battle.bx = battle.px + (battle.bossWorldX - battle.playerWorldX) / _srw * (1 - battle.px);
battle.bgPixelsPerMeter = battle.sm.bgPixelsPerMeter || 88;
const _bgEl = document.querySelector('.battle-scene .battle-bg');
if(_bgEl){
_bgEl.style.backgroundPositionX = (-battle.playerWorldX * battle.bgPixelsPerMeter) + 'px';
_bgEl.style.backgroundSize = 'auto 100%';
_bgEl.style.backgroundRepeat = 'repeat-x';
}
}
/* rev-anim-single-clock: 幀唯一擁有者 = updateBattleHeroAnim（依當前動畫自身 fps）。
   舊版 _walkFrame 恆以 walk.fps(10) 推進，updateBattleHeroAnim 再依 run.fps(16) 推一次，
   兩時鐘疊加 → 偶爾跳 2 格偶爾停 1 格；跑步時 fps 不同更產生拍頻抖動。 */
/* 玩家動畫優先級：攻擊流程 > 受擊 > 治療 > 移動 > idle */
{
let _wantAnim;
if(battle.reloading) _wantAnim = 'reload';
else if(battle.firing){
if(battle.weaponSlot === 'secondary') _wantAnim = 'fire_secondary';
else if(battle.weaponSlot === 'melee' || battle.weaponSlot === 'throwable') _wantAnim = 'attack_melee';
else _wantAnim = 'fire_primary';
}
else if((battleHeroAnim.name === 'switch_secondary' || battleHeroAnim.name === 'switch_melee') && battleHeroAnim.forcedEnd > now) _wantAnim = battleHeroAnim.name;
else if(battleHeroAnim.name === 'attack_melee' && battleHeroAnim.forcedEnd > now) _wantAnim = 'attack_melee';
else if((battleHeroAnim.name === 'fire_primary' || battleHeroAnim.name === 'fire_secondary') && battleHeroAnim.forcedEnd > now) _wantAnim = battleHeroAnim.name; /* rev-combatfix: 點射單發後播完 forcedEnd 才回 idle */
else if(battle._hurtUntil && now < battle._hurtUntil) _wantAnim = 'hurt';
else if(battle.consuming) _wantAnim = 'heal_melee';
else if(canMove && hasMoveInput) _wantAnim = (Math.abs(battle.moveDir) > 0.66) ? 'run' : 'walk';
else _wantAnim = 'idle';
if(battleHeroAnim.name !== _wantAnim){
const _prev = battleHeroAnim.name;
if((_prev === 'walk' || _prev === 'run') && _wantAnim !== 'walk' && _wantAnim !== 'run'){
battleHeroAnim.legTransitionStart = now;
battleHeroAnim.legTransitionFrom = battleHeroAnim.frame || 0;
}
battleHeroAnim.name = _wantAnim;
battleHeroAnim.lastUpdate = now;
battleHeroAnim.frame = 0; /* rev-anim-single-clock: 換動畫才歸零 */
}
if(battleHeroAnim.legTransitionStart){
const _el = now - battleHeroAnim.legTransitionStart;
if(_el < 150){
const _t = _el / 150;
/* rev-leg-registry-ids: override 的鍵必須是 drawBlockHero 認得的 layer id。
   id 由 __PUPPET_BAKE__.ids 烘焙進 GAME_ANIMS／GAME_LAYERS，腿部實際是
   right_thigh / right_shin / left_thigh / left_shin；舊版寫死 right_leg /
   left_leg 不在 registry，取 undefined 再索引幀號即拋（走／跑→停 150ms 窗）。
   這裡遍歷 registry 取值，不寫死層名，語義仍是把該幀腿部姿態衰減到 0。 */
const _wf = battleHeroAnim.legTransitionFrom || 0;
const _wl = (GAME_ANIMS.walk && GAME_ANIMS.walk.keys) || {};
const _ids = (typeof GAME_LAYERS !== "undefined" && GAME_LAYERS && GAME_LAYERS.length)
? GAME_LAYERS.map(function(l){ return l && l.id; })
: Object.keys(_wl);
const _ov = {};
for(let _li = 0; _li < _ids.length; _li++){
const _id = _ids[_li];
if(!_id || !/thigh|shin|leg|foot/i.test(_id)) continue;
const _arr = _wl[_id];
const _k = (_arr && _arr[_wf]) ? _arr[_wf] : null;
  _ov[_id] = { rot: ((_k && _k.rot) || 0) * (1 - _t) };
}
battleHeroAnim.legOverride = _ov;
} else {
battleHeroAnim.legTransitionStart = null;
battleHeroAnim.legOverride = null;
}
} else {
battleHeroAnim.legOverride = null;
}
}
if(typeof updateBossAI === 'function') updateBossAI(dt, now);

if(battle.firing){
const interval = fireInterval(battle.fireMode, battle.weapon);
if(now - battle.lastShot > interval){
battle.lastShot = now;
if(playerShoot()){ if(battle.burstLeft > 0) battle.burstLeft--; }
else battle.burstLeft = 0;
}
}
if(typeof updateBullets === 'function') updateBullets(dt);
/* 全局煙火 */
if(window.MuzzleFX){
window.MuzzleFX.update(dt);
if(fxEl){
let _cvs = document.getElementById('boss-fx-canvas');
if(!_cvs){
_cvs = document.createElement('canvas');
_cvs.id = 'boss-fx-canvas';
_cvs.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:9;';
fxEl.appendChild(_cvs);
}
if(_cvs.width !== fxEl.clientWidth || _cvs.height !== fxEl.clientHeight){
_cvs.width = fxEl.clientWidth;
_cvs.height = fxEl.clientHeight;
}
const _ctx = _cvs.getContext('2d');
_ctx.clearRect(0, 0, _cvs.width, _cvs.height);
window.MuzzleFX.render(_ctx, 'boss');
}
}
updateFighterPos();
if(isBossType(battle.bossId, 'hydra')) updateHeadBarsUI();
updateBattleHeroAnim(now);
updateBattleBossAnim(now);
renderBattleHeroCanvas();
renderBossBattleCanvas();
/* 狀態條寬度 */
const _hhp = document.getElementById('hero-hp'), _hap = document.getElementById('hero-ap');
const _bhp = document.getElementById('boss-hp'), _bap = document.getElementById('boss-ap'), _bsh = document.getElementById('boss-shield');
if(_hhp) _hhp.style.width = Math.max(0, battle.playerHp / battle.playerMaxHp * 100) + '%';
if(_hap) _hap.style.width = Math.max(0, battle.playerArmor / battle.playerMaxArmor * 100) + '%';
if(_bhp) _bhp.style.width = Math.max(0, battle.bossHp / battle.bossMaxHp * 100) + '%';
if(_bap) _bap.style.width = Math.max(0, battle.bossArmor / battle.bossMaxArmor * 100) + '%';
if(_bsh && battle.shieldMaxHp > 0) _bsh.style.width = Math.max(0, battle.shieldHp / battle.shieldMaxHp * 100) + '%';
/* rev-fire-live: 每幀重算攻擊／治療可用性 —— 射程與發現狀態連續變化，
   離散事件重算會讓玩家走進射程後按鈕仍灰。DOM 寫入已在函式內做變更偵測。 */
refreshBattleControlsLive();
try{ if(window._bossOffscreenUpdate) window._bossOffscreenUpdate(); }catch(e){}
requestAnimationFrame(battleLoop);
}

function startBossBattle(bid, opts){
  opts = opts || {};
  const b = BOSSES[bid];
  if(!b) return;
  if(!opts.sweep){
    const seals = Math.max(0, parseInt(state.seals[b.seal] || 0, 10));
    if(seals <= 0) return;
    state.seals[b.seal] = seals - 1;
  }
  state.player.hp = state.player.maxHp;
  state.player.armor = state.player.maxArmor;
  refreshPlayerStats();
  const _cp = equippedWeapon('primary');
  const _cs = equippedWeapon('secondary');
  const _cm = equippedWeapon('melee');
  const _pick = _cp || _cs || _cm;
  const startSlot = _pick ? _pick.slot : 'melee';
  const _isRT = isBossType(bid, 'tyrant');
  const _isCO = isBossType(bid, 'omega');
  const _shieldHp = _isRT ? 12500 : (_isCO ? 30000 : 0);
  battle = {
    active: true,
    bossId: bid, bossName: b.name,
    bossHp: b.hp, bossMaxHp: b.hp,
    bossArmor: b.armor, bossMaxArmor: b.armor,
    bossDmg: b.dmg, bossDmgMult: 1,
    bossPenMM: b.penMM || 0,
    bossCritRate: b.critRate || 0, bossCritMult: b.critMult || 1,
    phaseIdx: 0, healedPhases: [], skillCds: null,
    bossCast: null, bossDash: null, lastMeleeAt: 0,
    shieldMaxHp: _shieldHp, shieldHp: _shieldHp, shieldBroken: false,
    bossRetreat: null,
    playerHp: state.player.hp, playerMaxHp: state.player.maxHp,
    playerArmor: state.player.armor, playerMaxArmor: Math.max(1, state.player.maxArmor),
    px: 0.15, py: BOSS_UNIT_CENTER, bx: 0.75, by: BOSS_UNIT_CENTER,
    moveDir: 0, bullets: [], firing: false, reloading: false, consuming: false,
    lastShot: 0, damageDealt: 0,
    weapon: null, weaponSlot: null, playerWeaponRange: 0.5,
    fireMode: '點射', fireHeld: false, burstLeft: 0,
    ammoRef: null, ammoInMag: 0, weaponStates: {},
    engaged: false,
    engagedRange: (typeof window.getEntityDetectableR === 'function') ? window.getEntityDetectableR({ isPlayer:true }) : BOSS_DETECT_R,
    startTime: Date.now(),
    aimPart: defaultAimPartForBoss(bid), lastManualClick: 0,
    players: [{ id: 'local', isLocal: true }], lastH: 0, aimHitFx: [],
    healDisabledUntil: 0, healTimer: null,
    autoHealing: false, shotLockUntil: 0
  };
  battle.playerWorldX = 0;
  battle.bossWorldX = BOSS_WORLD_START;
  battle.ai = null;
  battle.bossAnimRate = 1;
  battle._worldSpeed = 0;
  battle.sweepOut = false;
  battle.sweep = opts.sweep ? {
    vid: opts.vehicleId || 'btr80',
    onDone: (typeof opts.onDone === 'function') ? opts.onDone : null,
    index: opts.index || 1,
    total: opts.total || 1
  } : null;
  /* rev-sweep-ux: bossTarget 補 setter —— 載具撞擊 / 命中寫 hp、_tickAI 寫 worldX 不再拋錯。
     掃蕩目標為已知目標：detectableR = Infinity（武器射程閘門保留）。 */
  battle.bossTarget = {
    isBoss: true,
    y: 0,
    _known: !!opts.sweep,
    detectableR: opts.sweep ? Infinity : undefined,
    get bossId(){ return (typeof battle !== 'undefined' && battle) ? battle.bossId : ''; },
    get worldX(){ return (typeof battle !== 'undefined' && battle) ? battle.bossWorldX : 0; },
    set worldX(v){ if(typeof battle !== 'undefined' && battle) battle.bossWorldX = v; },
    get hp(){ return (typeof battle !== 'undefined' && battle) ? battle.bossHp : 0; },
    set hp(v){ if(typeof battle !== 'undefined' && battle) battle.bossHp = Math.max(0, v); },
    get armor(){ return (typeof battle !== 'undefined' && battle) ? battle.bossArmor : 0; },
    set armor(v){ if(typeof battle !== 'undefined' && battle) battle.bossArmor = Math.max(0, v); },
    get _aabbOverride(){ return (typeof window._bossAABB === 'function') ? window._bossAABB() : { width:4, height:2, centerY:1, depth:4, bodyDepth:1.6 }; }
  };
  battle.sm = null;
  battle.tracers = [];
  battle.floats = [];
  battle.playerWeaponRangeM = 30;
  if(isBossType(bid, 'hydra')) initHydraHeads();
  if(isBossType(bid, 'omega')) initOmegaArms();
  battleHeroAnim.name = 'idle';
  battleHeroAnim.frame = 0;
  battleHeroAnim.lastUpdate = performance.now();
  battleHeroAnim.forcedEnd = 0;
  battleHeroAnim.eqSlot = null;
  battleHeroAnim.healItem = null;
  battleBossAnim.name = 'idle';
  battleBossAnim.frame = 0;
  battleBossAnim.lastUpdate = performance.now();
  battleBossAnim.forcedEnd = 0;
  if(battle.sweep){
    battle.weapon = null; battle.weaponSlot = null;
    battle.ammoInMag = 0; battle.ammoRef = null;
    battle._lastPh = null; battle._hpMark = 0;
    battle._shieldWas = false; battle._armorZero = false; battle._killLogged = false;
    battle._dbgAt = 0;
    const _vidS = battle.sweep.vid;
    const _vdefS = (typeof VEHICLES !== 'undefined' && VEHICLES[_vidS]) ? VEHICLES[_vidS] : null;
    const _vhS = (_vdefS && _vdefS.hp) ? _vdefS.hp : 500;
    const _z1 = document.getElementById('zone1');
    if(_z1) renderBattleScene(_z1);
    /* rev-sweep-ux: zone2 保持原狀（裝備格 + 屬性 + 電台），外層已 pointer-events:none 屏蔽操作 */
    const _z2 = document.getElementById('zone2');
    if(_z2 && typeof renderEquipZone === 'function') renderEquipZone(_z2);
    /* rev-sweep-ux: zone3 = 玩家敘事層（佔滿）＋ 引擎調試層（摺疊、可展開） */
    const _z3 = document.getElementById('zone3');
    if(_z3){
      _z3.innerHTML =
        '<div class="z3-head"><div class="z3-title">🧹 掃蕩 ×' + battle.sweep.total + '</div><div class="z3-btn" id="sweep-dbg-btn">調試 ▸</div></div>'
      + '<div style="flex:0 0 auto;padding:6px 8px;border-bottom:1px solid #2a231c;background:#151210">'
      +   '<div id="sweep-live-phase" style="font-size:11px;color:#e8a33d;font-weight:bold">載具出擊</div>'
      +   '<div id="sweep-live-nums" style="font-size:10px;color:#a89a85;margin-top:2px;font-family:Menlo,Consolas,monospace">—</div>'
      +   '<div style="height:5px;background:#241d16;border:1px solid #2a231c;border-radius:3px;overflow:hidden;margin-top:5px"><div id="sweep-boss-bar" style="height:100%;width:100%;background:linear-gradient(90deg,#e05252,#ff7a4a)"></div></div>'
      +   '<div style="display:flex;justify-content:space-between;font-size:9px;color:#7a6f60;margin-top:2px"><span>Boss 剩餘</span><span id="sweep-boss-pct">100%</span></div>'
      + '</div>'
      + '<div class="logbox" id="sweep-status" style="flex:1;min-height:0"></div>'
      + '<div id="sweep-dbg" style="display:none;flex:0 0 auto;max-height:36%;overflow-y:auto;border-top:1px dashed #3a2f25;background:#0d0b09;padding:4px 8px;font:9px/1.6 Menlo,Consolas,monospace;color:#6a5f4d;white-space:pre"></div>';
      const _db = _z3.querySelector('#sweep-dbg-btn');
      if(_db) _db.onclick = function(){
        const p = document.getElementById('sweep-dbg');
        if(!p) return;
        const on = p.style.display !== 'none';
        p.style.display = on ? 'none' : 'block';
        _db.textContent = on ? '調試 ▸' : '調試 ▾';
        _db.style.color = on ? '' : '#39d7e6';
      };
    }
    battle.lastH = 0;
    if(typeof window._combatStart === 'function'){
      window._combatStart({
        sceneType: 'vehicle', firstSide: 'player', sweep: true,
        allies: [{ isVehicle:true, vehicleId:_vidS, hp:_vhS, maxHp:_vhS, armorGrid:[30,20,15], armorLevel:5, worldX:0 }],
        enemies: [battle.bossTarget],
        onResolve: function(){}
      });
      const _cS = window._combat;
      if(_cS){
        _cS._sweep = true;
        /* 掃蕩不使用玩家隨身彈藥：退還 _combatStart 預裝填扣除 */
        if(_cS._playerMag && _cS._playerMag.ammoRef && _cS._playerMag.inMag > 0){
          invAdd(_cS._playerMag.ammoRef.id, _cS._playerMag.ammoRef.rarity, _cS._playerMag.inMag);
        }
        _cS._playerMag = { inMag:0, ammoRef:null, weaponId:null };
      }
    }
    const _btr = window.BTRSupport;
    if(_btr && typeof _btr.start === 'function') _btr.start(_vidS);
  } else {
    switchBattleWeapon(startSlot);
    renderCombat();
  }
  battle.lastTime = performance.now();
  try{ if(window._bossOffscreenUpdate) window._bossOffscreenUpdate(); }catch(e){}
  requestAnimationFrame(battleLoop);
}



/* [v280] Boss 战 FX 系统（复用 16-combat.js） */
(function(){
  if(window._bossFXReuseInstalled) return;
  window._bossFXReuseInstalled = true;

  function _bossRenderBullets(now){
  /* rev-float-unify: 手雷 = 探索 _render 同款真實拋物線；
     傷害飄字改用探索 _float 完全相同的 canvas 繪製參數。 */
  if(!battle || !battle.active) return;
  var fxEl = document.getElementById('battle-fx');
  if(!fxEl) return;
  var cvs = document.getElementById('boss-bullets-canvas');
  if(!cvs){
    cvs = document.createElement('canvas');
    cvs.id = 'boss-bullets-canvas';
    cvs.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:10;';
    fxEl.appendChild(cvs);
  }
  var W = fxEl.clientWidth, H = fxEl.clientHeight;
  if(!W || !H) return;
  if(cvs.width !== W || cvs.height !== H){ cvs.width = W; cvs.height = H; }
  var ctx = cvs.getContext('2d');
  ctx.clearRect(0, 0, W, H);
  var nowMs = performance.now();
  var _chf = (typeof CHAR_HEIGHT_FACTOR === 'number') ? CHAR_HEIGHT_FACTOR : 0.58;
  var _phm = (typeof PLAYER_HEIGHT_M === 'number') ? PLAYER_HEIGHT_M : 1.7;
  var _ppm = (typeof battle.bgPixelsPerMeter === 'number' && battle.bgPixelsPerMeter > 0) ? battle.bgPixelsPerMeter : H * _chf / _phm;
  var _srw = (battle.sm && battle.sm.screenRightWorld > 0) ? battle.sm.screenRightWorld : 4.2;
  var _pxN = (typeof battle.px === 'number') ? battle.px : 0.25;
  var _G = (typeof GRENADE_G === 'number') ? GRENADE_G : 9.8;
  for(var i = 0; i < battle.bullets.length; i++){
    var bb = battle.bullets[i];
    if(!bb.isGrenade || bb.isFast) continue;
    var bx, by, _tD = 0;
    if(typeof bb.worldStartX === 'number' && typeof bb.vx === 'number' && bb.T > 0){
      if(bb.releaseAt && nowMs < bb.releaseAt){
      /* rev-throw-hand-anchor: 釋放前由 rig 繪於前手之下，FX 層（z10）不再搶畫 */
      continue;
      } else {
        var _el = Math.max(0, (nowMs - bb.start) / 1000);
        if(_el > bb.T + 0.5) continue;
        var _dir = (bb.dir === -1) ? -1 : 1;
        var _wx = bb.worldStartX + _dir * bb.vx * _el;
        var _wy = (bb.H0 || 1.3) + bb.vy * _el - 0.5 * _G * _el * _el;
        var _sxN = _pxN + (_wx - battle.playerWorldX) / _srw * (1 - _pxN);
        var _syN = 0.95 - (_wy * _ppm) / H;
        bx = _sxN * W; by = _syN * H;
        _tD = Math.min(1, _el / bb.T);
      }
    } else {
      var _dt2 = Math.min(1, bb.t || 0);
      bx = (bb.sx + (bb.tx - bb.sx) * _dt2) * W;
      by = (bb.sy + (bb.ty - bb.sy) * _dt2) * H - Math.sin(_dt2 * Math.PI) * H * 0.35;
      _tD = _dt2;
    }
    if(bx < -30 || bx > W + 30 || by < -30 || by > H + 30) continue;
    if(typeof window._drawBulletShape === 'function'){
      window._drawBulletShape(ctx, bx, by, { isGrenade:true, grenadeId:bb.grenadeId, t:_tD, big:true });
    } else {
      ctx.save();
      ctx.fillStyle = '#ffd680'; ctx.shadowColor = '#ffb300'; ctx.shadowBlur = 6;
      ctx.beginPath(); ctx.arc(bx, by, 5, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }
  if(typeof _renderBattleFX === 'function') _renderBattleFX(ctx, battle);
  if(battle.floats && battle.floats.length){
    for(var fi2 = 0; fi2 < battle.floats.length; fi2++){
      var ff = battle.floats[fi2];
      ctx.save();
      ctx.fillStyle = ff.cls === 'crit' ? '#ff3030' : (ff.cls === 'miss' ? '#a89a85' : (ff.cls === 'armor' ? '#5ab0ff' : (ff.cls === 'heal' ? '#4caf50' : '#ffb300')));
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(ff.text, ff.x * W, ff.y * H - ff.age * 40);
      ctx.restore();
    }
  }
}

  /* rev-fix-boss-dmg-num-restore: 移除傷害數字與火花的耦合。
   * spawnHitFx 只負責畫傷害數字；火花如需獨立顯示，應在結算點（applyBossDamage / tryHitPlayer）單獨觸發。 */

  /* 独立 rAF（Boss 战没有统一 tick 帧循环处理 bullets 绘制） */
  window._bossRenderBullets = _bossRenderBullets;
  var _lastTime = performance.now();
  var _raf = function(){
    requestAnimationFrame(_raf);
    if(!battle || !battle.active){
      var cvs = document.getElementById('boss-bullets-canvas');
      if(cvs && cvs.parentNode) cvs.parentNode.removeChild(cvs);
      return;
    }
    var now = performance.now();
    var dt = Math.min(0.05, (now - _lastTime) / 1000);
    _lastTime = now;
    if(typeof _tickBattleFX === 'function') _tickBattleFX(battle, dt);
    _bossRenderBullets(now);
  };
  requestAnimationFrame(_raf);
})();



/* ============================================================
   rev-bossbox: Boss = 探索 + 手動瞄準 + 弱點
   2D AABB = 正面 billboard（L=身體深度, H=視覺高, D=螢幕可見寬）
   盒尺寸由 idle bounds × getBossCanvasTransform ÷ bgPixelsPerMeter 推導
   弱點 = billboard 上的 (u,v) 矩形；part='body' 表示非弱點區
   ============================================================ */
var _BOSS_IB_CACHE = {};
window._bossIdleBounds = function(bid){
if(_BOSS_IB_CACHE[bid]) return _BOSS_IB_CACHE[bid];
var def = (typeof BOSS_LAYERS !== 'undefined') ? BOSS_LAYERS[bid] : null;
var anims = (typeof BOSS_ANIMS !== 'undefined') ? BOSS_ANIMS[bid] : null;
if(!def || !anims || !anims.idle){ _BOSS_IB_CACHE[bid] = null; return null; }
var anim = anims.idle;
var world = resolveBossWorld(def, anim, 0);
var mnx=Infinity,mxx=-Infinity,mny=Infinity,mxy=-Infinity;
for(var i=0;i<def.layers.length;i++){
var L=def.layers[i], wp=world[L.id]; if(!wp) continue;
var k=(anim.keys&&anim.keys[L.id]&&anim.keys[L.id][0])||{rot:0};
var w=def.canvas.w*(k.w!==undefined?k.w:L.w), h=def.canvas.h*(k.h!==undefined?k.h:L.h);
var px=w*L.pivot.x, py=h*L.pivot.y;
var rot=wp.rot*BOSS_DEG2RAD, cs=Math.cos(rot), sn=Math.sin(rot);
var co=[[0,0],[w,0],[0,h],[w,h]];
for(var c=0;c<4;c++){
var dx=co[c][0]-px, dy=co[c][1]-py;
var rx=dx*cs-dy*sn+wp.wx, ry=dx*sn+dy*cs+wp.wy;
if(rx<mnx)mnx=rx; if(rx>mxx)mxx=rx; if(ry<mny)mny=ry; if(ry>mxy)mxy=ry;
}
}
if(!isFinite(mnx)){ _BOSS_IB_CACHE[bid]=null; return null; }
var o={minX:mnx,maxX:mxx,minY:mny,maxY:mxy};
_BOSS_IB_CACHE[bid]=o; return o;
};
var _BOSS_AABB_CACHE={key:null,val:null};
window._bossAABB = function(){
var b=(typeof battle!=='undefined')?battle:null;
var fb={width:4,height:2,centerY:1,depth:4,bodyDepth:1.6};
if(!b||!b.bossId) return fb;
var sp=document.getElementById('boss-sprite');
var sw=sp?sp.clientWidth:0, sh=sp?sp.clientHeight:0;
var ppm=(b.bgPixelsPerMeter>0)?b.bgPixelsPerMeter:0;
var key=b.bossId+'|'+sw+'|'+sh+'|'+ppm.toFixed(3);
if(_BOSS_AABB_CACHE.key===key) return _BOSS_AABB_CACHE.val;
var ib=window._bossIdleBounds(b.bossId);
var Hm=2.0, Dm=4.0;
if(ib){
var iw=ib.maxX-ib.minX, ih=ib.maxY-ib.minY;
if(sw>0&&sh>0&&ppm>0&&typeof getBossCanvasTransform==='function'){
var tf=getBossCanvasTransform(BOSS_LAYERS[b.bossId],b.bossId,sw,sh);
Hm=ih*tf.sy/ppm; Dm=iw*tf.sx/ppm;
} else if(ih>0){
var K=((typeof PLAYER_HEIGHT_M==='number')?PLAYER_HEIGHT_M:1.7)*(455.74/386);
Hm=K; Dm=K*iw/ih;
}
}
if(!(Hm>0.2))Hm=2.0;
if(!(Dm>0.2))Dm=4.0;
var o={width:Dm,height:Hm,centerY:Hm/2,depth:Dm,bodyDepth:Math.max(0.6,Dm*0.45)};
_BOSS_AABB_CACHE={key:key,val:o};
return o;
};
/* 當前幀 alive 弱點層 → billboard 正規化矩形（canvas 單位比值，與縮放無關） */
window._bossWeakMap = function(){
  /* rev-aim-live: Hydra 弱點 = 當前存活頭部整條鏈（頭 → 頸 → 眼/口），
     不再依賴 BOSS_WEAKPOINTS 的靜態空陣列 —— 槍彈與近戰判定同源。 */
  var b = (typeof battle !== 'undefined') ? battle : null;
  if(!b || !b.bossId) return [];
  var def = BOSS_LAYERS[b.bossId]; if(!def) return [];
  var anims = BOSS_ANIMS[b.bossId]; if(!anims) return [];
  var anim = anims[battleBossAnim.name] || anims.idle; if(!anim) return [];
  var ib = window._bossIdleBounds(b.bossId); if(!ib) return [];
  var iw = ib.maxX - ib.minX, ih = ib.maxY - ib.minY;
  if(!(iw > 0 && ih > 0)) return [];
  var fi = ((battleBossAnim.frame % anim.frameCount) + anim.frameCount) % anim.frameCount;
  var world = resolveBossWorld(def, anim, fi);
  var isH = (typeof isBossType === 'function') && isBossType(b.bossId, 'hydra');
  var isO = (typeof isBossType === 'function') && isBossType(b.bossId, 'omega');
  var weak = (typeof BOSS_WEAKPOINTS !== 'undefined' && BOSS_WEAKPOINTS[b.bossId]) || [];
  var lids = weak.slice();
  if(isH && b.heads){
    lids = [];
    var hi;
    for(hi = 0; hi < def.layers.length; hi++){ if(/^head_/.test(def.layers[hi].id)) lids.push(def.layers[hi].id); }
    for(hi = 0; hi < def.layers.length; hi++){ if(/^neck_/.test(def.layers[hi].id)) lids.push(def.layers[hi].id); }
    for(hi = 0; hi < def.layers.length; hi++){ if(/^(eye|mouth)/.test(def.layers[hi].id)) lids.push(def.layers[hi].id); }
  }
  var out = [];
  for(var i = 0; i < lids.length; i++){
    var lid = lids[i], part = lid;
    if(isH && b.heads){
      if(typeof HYDRA_NECK_MAP !== 'undefined' && HYDRA_NECK_MAP[lid]) part = HYDRA_NECK_MAP[lid];
      else if(lid === 'neck_3b') part = 'head_3';
      else if(/^(eye|mouth)/.test(lid)){
        var ow = (def._hydraEyeOwner && def._hydraEyeOwner[lid]) || (typeof findNearestHeadForLayer === 'function' ? findNearestHeadForLayer(lid) : null);
        if(!ow) continue;
        part = ow;
      }
      if(!b.heads[part] || !b.heads[part].alive) continue;
    }
    if(isO && b.arms){ if(!b.arms[lid] || !b.arms[lid].alive) continue; }
    var L = null;
    for(var j = 0; j < def.layers.length; j++){ if(def.layers[j].id === lid){ L = def.layers[j]; break; } }
    if(!L) continue;
    var wp = world[lid]; if(!wp) continue;
    var k = (anim.keys && anim.keys[lid] && anim.keys[lid][fi]) || { rot:0, dx:0, dy:0 };
    var w = def.canvas.w * (k.w !== undefined ? k.w : L.w);
    var h = def.canvas.h * (k.h !== undefined ? k.h : L.h);
    if(!(w > 0 && h > 0)) continue;
    var px = w * L.pivot.x, py = h * L.pivot.y;
    var rot = wp.rot * BOSS_DEG2RAD, cs = Math.cos(rot), sn = Math.sin(rot);
    var mnx = Infinity, mxx = -Infinity, mny = Infinity, mxy = -Infinity;
    var co = [[0,0],[w,0],[0,h],[w,h]];
    for(var c = 0; c < 4; c++){
      var dx = co[c][0] - px, dy = co[c][1] - py;
      var rx = dx * cs - dy * sn + wp.wx, ry = dx * sn + dy * cs + wp.wy;
      if(rx < mnx) mnx = rx; if(rx > mxx) mxx = rx;
      if(ry < mny) mny = ry; if(ry > mxy) mxy = ry;
    }
    var u0 = Math.max(0, Math.min(1, (mnx - ib.minX) / iw));
    var u1 = Math.max(0, Math.min(1, (mxx - ib.minX) / iw));
    var v0 = Math.max(0, Math.min(1, (ib.maxY - mxy) / ih));
    var v1 = Math.max(0, Math.min(1, (ib.maxY - mny) / ih));
    if(u1 <= u0 || v1 <= v0) continue;
    out.push({ part:part, u0:u0, u1:u1, v0:v0, v1:v1 });
  }
  return out;
};
window._bossPartFromUV = function(tgt,u,v){
var rects=window._bossWeakMap();
for(var i=0;i<rects.length;i++){
var R=rects[i];
if(u>=R.u0&&u<=R.u1&&v>=R.v0&&v<=R.v1) return R.part;
}
return 'body';
};
/* Boss 爆炸：只算 billboard 面，面內 2D 網格細分（弱點優先，剩餘 body）
   Σcell = fu·fv（望遠角可加性），總量守恆；falloff 用邊緣距離 */
window._bossExplode = function(tgt,P,opts,box){
var out={hpLost:0,armorLost:0,bands:[],dNear:Infinity,coverage:0};
var maxR=(typeof opts.maxR==='number'&&opts.maxR>0)?opts.maxR:8;
var total=(typeof opts.totalDmg==='number'&&opts.totalDmg>0)?opts.totalDmg:0;
if(total<=0) return out;
var twx=(typeof tgt.worldX==='number')?tgt.worldX:0;
var x1=twx-box.L/2, x2=twx+box.L/2;
var px=(typeof P.x==='number')?P.x:twx;
var py=(typeof P.y==='number')?P.y:0;
var pz=(typeof P.z==='number')?P.z:0;
var n=(px<x1)?(x1-px):((px>x2)?(px-x2):0);
if(n>=maxR) return out;
var hz=box.D/2, v0=box.yFoot, v1=box.yFoot+box.H;
if(!(hz>0)||!(v1>v0)) return out;
var rho=Math.sqrt(Math.max(0,maxR*maxR-n*n));
var ua=Math.max(-hz,pz-rho), ub=Math.min(hz,pz+rho);
var va=Math.max(v0,py-rho), vb=Math.min(v1,py+rho);
if(ub<=ua||vb<=va) return out;
var thU=Math.atan2(hz-pz,n)-Math.atan2(-hz-pz,n);
var thV=Math.atan2(v1-py,n)-Math.atan2(v0-py,n);
if(!(thU>1e-9)||!(thV>1e-9)) return out;
var du=Math.max(-hz-pz,0,pz-hz), dv=Math.max(v0-py,0,py-v1);
var dNear=Math.sqrt(n*n+du*du+dv*dv);
if(dNear>=maxR) return out;
out.dNear=dNear;
var falloff=1-(dNear/maxR)*(dNear/maxR);
if(falloff<=0) return out;
var rects=window._bossWeakMap();
var NU=28, NV=28, us=[], au=[], vs=[], av=[];
for(var i=0;i<=NU;i++){ var u=ua+(ub-ua)*i/NU; us.push(u); au.push(Math.atan2(u-pz,n)); }
for(var j=0;j<=NV;j++){ var v=va+(vb-va)*j/NV; vs.push(v); av.push(Math.atan2(v-py,n)); }
var acc={}, sum=0;
for(var i=0;i<NU;i++){
var fu=(au[i+1]-au[i])/thU; if(!(fu>0)) continue;
var uu=((us[i]+us[i+1])*0.5+hz)/box.D;
for(var j=0;j<NV;j++){
var fv=(av[j+1]-av[j])/thV; if(!(fv>0)) continue;
var vv=((vs[j]+vs[j+1])*0.5-v0)/box.H;
var part='body';
for(var r=0;r<rects.length;r++){
var R=rects[r];
if(uu>=R.u0&&uu<=R.u1&&vv>=R.v0&&vv<=R.v1){ part=R.part; break; }
}
var frac=fu*fv;
acc[part]=(acc[part]||0)+frac;
sum+=frac;
}
}
if(!(sum>0)) return out;
out.coverage=sum;
var scale=(sum>1)?(1/sum):1;
for(var key in acc){
var dmg=total*acc[key]*scale*falloff;
if(dmg<0.5) continue;
var pen=(typeof opts.penFor==='function')?opts.penFor(key,dNear,falloff,'x1'):(opts.pen||0);
var rr=(typeof opts.applyBand==='function')?opts.applyBand(key,dmg,pen,{part:key,face:'x1',frac:acc[key],falloff:falloff,dNear:dNear}):null;
var hl=(rr&&rr.hpLost)||0, al=(rr&&rr.armorLost)||0;
out.bands.push({part:key,face:'x1',dmg:dmg,pen:pen,hpLost:hl,armorLost:al});
out.hpLost+=hl; out.armorLost+=al;
}
return out;
};
window._bossScreenMetrics = function(){
var b=(typeof battle!=='undefined')?battle:null;
var fx=document.getElementById('battle-fx');
var W=fx?fx.clientWidth:400, H=fx?fx.clientHeight:500;
var chf=(typeof CHAR_HEIGHT_FACTOR==='number')?CHAR_HEIGHT_FACTOR:0.58;
var phm=(typeof PLAYER_HEIGHT_M==='number')?PLAYER_HEIGHT_M:1.7;
var ppm=(b&&b.bgPixelsPerMeter>0)?b.bgPixelsPerMeter:(H*chf/phm);
var px=(typeof EXPLORE_HERO_X_RATIO==='number')?EXPLORE_HERO_X_RATIO:0.25;
var srw=(b&&b.sm&&b.sm.screenRightWorld>0)?b.sm.screenRightWorld:4.2;
return {W:W,H:H,ppm:ppm,px:px,srw:srw};
};
window._bossWorldToScreenN = function(wx,wy){
var b=(typeof battle!=='undefined')?battle:null;
if(!b) return {x:0.75,y:0.6};
var m=window._bossScreenMetrics();
return { x: m.px+((wx-b.playerWorldX)/m.srw)*(1-m.px), y: 0.95-(wy*m.ppm)/m.H };
};
/* 手動瞄準點 → 米（aimY 局部高、aimZ billboard 橫向偏移） */
window._bossAimMeters = function(){
var b=(typeof battle!=='undefined')?battle:null;
if(!b) return {aimY:0.85,aimZ:0,aimWX:0};
var t=(typeof getAimTargetPos==='function')?getAimTargetPos():{x:b.bx,y:0.6};
var m=window._bossScreenMetrics();
var aimWX=b.playerWorldX+(t.x-m.px)/(1-m.px)*m.srw;
var aimY=(0.95-t.y)*m.H/m.ppm;
var box=(b.bossTarget&&typeof window._getTargetBox==='function')?window._getTargetBox(b.bossTarget):null;
var Hm=(box&&box.H>0)?box.H:2.0, Dm=(box&&box.D>0)?box.D:4.0;
aimY=Math.max(0,Math.min(Hm,aimY));
var aimZ=Math.max(-Dm/2,Math.min(Dm/2,aimWX-b.bossWorldX));
return {aimY:aimY,aimZ:aimZ,aimWX:aimWX};
};

;
/* 手雷結算：與探索同一條鏈（_calcGrenadeParams → _applyExplosionToBox） */
window._bossGrenadeBurst = function(gDef,gRar,hitRate,landWX,w,pdB,burstPt){
var b=(typeof battle!=='undefined')?battle:null;
if(!b||!b.bossTarget||b.settling) return;
/* rev-frag-rays: 與探索手雷同一引擎、同一 N/eff 資料。
   hitRate / splashRatio / allFragmentsOnSingle 三個補償旋鈕全部廢除 ——
   舊版 ratio=1 分支只在此實作，16 沒有，VOG-25 兩邊差 12.5×。
   爆點目前仍為落地點；Boss 投擲端的接觸判定待 17a 投擲呼叫端一併改。 */
var N=gDef.fragments||1;
var eff=(gDef.fragmentDamage||gDef.dmg||0)*((typeof RARITY_MULT!=='undefined'&&RARITY_MULT[gRar])||1);
if(!(N>0)||!(eff>0)) return;
var gid=(w&&w.id)||gDef.id;
var phys=(typeof _getGrenadePhysics==='function')?_getGrenadePhysics(gid):null;
var maxR=(phys&&phys.casualtyRadius>0)?phys.casualtyRadius:10;
var pen=gDef.penMM||0;
var critRate=(typeof calcCritRate==='function')?calcCritRate(gRar,'一般'):0.1;
var critMult=(typeof calcCritMult==='function')?calcCritMult(gRar,'一般'):1.5;
var sumHp=0,sumAr=0;
var _bpB = (burstPt && typeof burstPt.x === 'number') ? burstPt : {x:landWX,y:0,z:0};
var _chgB = (typeof window._blastChargeKg === 'function') ? window._blastChargeKg(gDef) : 0;
window._applyExplosionToBox(b.bossTarget,_bpB,{
fragments:N,fragEff:eff,maxR:maxR,pen:pen,
crit:{rate:critRate,mult:critMult},
chargeKg:_chgB,
applyBlast:function(d){ if(battle){ battle.bossHp = Math.max(0, Math.round(battle.bossHp - d)); battle.damageDealt += d; } },
applyBand:function(part,dmg,pg){
if(!battle||battle.settling) return {hpLost:0,armorLost:0};
var h0=battle.bossHp,a0=battle.bossArmor,s0=battle.shieldHp||0;
var rd=Math.round(dmg);
if(part&&part!=='body'){
battle.engaged=true;
battle.bossHp=Math.max(0,battle.bossHp-rd);
battle.damageDealt+=rd;
if(isBossType(battle.bossId,'omega')&&battle.arms) damageOmegaArm(part,rd);
} else {
applyBossDamage(dmg,false,pen,false,true,false,part||'body');
}
if(!battle) return {hpLost:0,armorLost:0};
var dh=Math.max(0,h0-battle.bossHp);
var da=Math.max(0,a0-battle.bossArmor);
var ds=Math.max(0,s0-(battle.shieldHp||0));
sumHp+=dh; sumAr+=da+ds;
return {hpLost:dh,armorLost:da+ds};
}
});
if(battle&&!battle.settling&&(sumHp+sumAr)>0){
var _pos=(typeof getAimTargetPos==='function')?getAimTargetPos():{x:battle.bx,y:0.6};
spawnHitFx('boss',0,'-'+Math.round(sumHp>0?sumHp:sumAr),sumHp>0?'weak':'armor',_pos.x,_pos.y);
}
if(battle&&!battle.settling&&battle.bossHp<=0) endBattle(true);
};
/* ===== rev-hudroot:start ===== */
/* Boss 戰 UI 幾何（寫死；源自人偶繪製比例，不隨動畫 / 頭盔變動）
   腳底 = H*0.95；裸頭頂 = H*(0.95 - 455.74/386 * CHAR_HEIGHT_FACTOR) = H*0.2652
   HUD 中心 = 裸頭頂與螢幕頂的中點 = H*0.1326（styles.css .hpbar-wrap top）
   視覺中心 = (0.2652 + 0.95)/2 = 0.6076 */
const BOSS_UNIT_HEAD_TOP = 0.2652;
const BOSS_UNIT_CENTER = 0.6076;

/* 點擊 canvas 座標 -> 設定瞄準部位 + 層內局部座標（sprite 與虛影共用） */
window._bossSetAimFromCanvas = function(part, canvasX, canvasY){
if(typeof battle === 'undefined' || !battle || !part) return false;
var def = (typeof BOSS_LAYERS !== 'undefined') ? BOSS_LAYERS[battle.bossId] : null;
var anims = (typeof BOSS_ANIMS !== 'undefined') ? BOSS_ANIMS[battle.bossId] : null;
if(!def || !anims) return false;
var anim = anims[battleBossAnim.name] || anims.idle;
if(!anim) return false;
battle.aimPart = part;
battle.aimLocal = null;
var L = null;
for(var i = 0; i < def.layers.length; i++){ if(def.layers[i].id === part){ L = def.layers[i]; break; } }
if(!L) return true;
var fi = ((battleBossAnim.frame % anim.frameCount) + anim.frameCount) % anim.frameCount;
var k = (anim.keys && anim.keys[part] && anim.keys[part][fi]) || { rot:0, dx:0, dy:0 };
var w = def.canvas.w * (k.w !== undefined ? k.w : L.w);
var h = def.canvas.h * (k.h !== undefined ? k.h : L.h);
if(!(w > 0 && h > 0)) return true;
var world = resolveBossWorld(def, anim, fi);
var wp = world[part];
if(!wp) return true;
var px = w * L.pivot.x, py = h * L.pivot.y;
var a = -wp.rot * BOSS_DEG2RAD, ca = Math.cos(a), sa = Math.sin(a);
var dx = canvasX - wp.wx, dy = canvasY - wp.wy;
var lx = dx * ca - dy * sa + px;
var ly = dx * sa + dy * ca + py;
battle.aimLocal = { part: part, u: lx / w, v: ly / h };
return true;
};

/* 螢幕外距離氣泡（探索同款）+ 虛影（與實體同尺寸），惰性建立、冪等 */
window._bossOffscreenMount = function(){
var scene = document.querySelector('.battle-scene');
if(!scene) return null;
var bub = document.getElementById('boss-offscreen');
if(!bub){
bub = document.createElement('div');
bub.id = 'boss-offscreen';
bub.className = 'boss-offscreen';
bub.innerHTML = '<div class="bub" id="boss-offscreen-bub"><div class="in"><span class="d" id="boss-offscreen-d">0</span></div></div>';
scene.appendChild(bub);
var btn = document.getElementById('boss-offscreen-bub');
if(btn){
btn.addEventListener('pointerdown', function(e){
if(e.button !== undefined && e.button !== 0) return;
e.preventDefault(); e.stopPropagation();
if(typeof battle === 'undefined' || !battle) return;
battle.ghostOpen = !battle.ghostOpen;
if(typeof window._bossOffscreenUpdate === 'function') window._bossOffscreenUpdate();
}, { passive:false });
}
}
var gh = document.getElementById('boss-ghost');
if(!gh){
gh = document.createElement('div');
gh.id = 'boss-ghost';
gh.className = 'boss-ghost';
gh.innerHTML = '<div class="lbl" id="boss-ghost-lbl">虛影</div><canvas id="boss-ghost-canvas"></canvas><div class="scan"></div><div class="hint">點擊虛影可預先瞄準</div>';
scene.appendChild(gh);
gh.addEventListener('pointerdown', function(e){
if(e.button !== undefined && e.button !== 0) return;
e.preventDefault(); e.stopPropagation();
if(typeof battle === 'undefined' || !battle) return;
var cv = document.getElementById('boss-ghost-canvas');
var def = (typeof BOSS_LAYERS !== 'undefined') ? BOSS_LAYERS[battle.bossId] : null;
if(!cv || !def || typeof pickAimPartFromClick !== 'function') return;
var r = cv.getBoundingClientRect();
if(!(r.width > 0 && r.height > 0)) return;
var tf = getBossCanvasTransform(def, battle.bossId, r.width, r.height);
if(!(tf.sx > 0 && tf.sy > 0)) return;
var cx = (e.clientX - r.left - tf.ox) / tf.sx;
var cy = (e.clientY - r.top - tf.oy) / tf.sy;
var part = pickAimPartFromClick(cx, cy);
if(!part) return;
window._bossSetAimFromCanvas(part, cx, cy);
var mk = document.getElementById('ghost-aim-marker');
if(!mk){
mk = document.createElement('div');
mk.id = 'ghost-aim-marker';
mk.className = 'aim-marker';
mk.style.borderColor = '#39c6c0';
gh.appendChild(mk);
}
mk.style.left = (e.clientX - r.left) + 'px';
mk.style.top = (e.clientY - r.top) + 'px';
if(mk._t) clearTimeout(mk._t);
mk._t = setTimeout(function(){ if(mk.parentNode) mk.remove(); }, 1200);
if(typeof window._bossGhostRender === 'function') window._bossGhostRender();
}, { passive:false });
}
return { bub: bub, gh: gh };
};

/* 虛影渲染：canvas = playerCanvasW x playerCanvasH，drawBlockBoss 同變換
   -> 視覺尺寸 / 腳底落地與實體 Boss 完全一致 */
window._bossGhostRender = function(){
if(typeof battle === 'undefined' || !battle) return;
var gh = document.getElementById('boss-ghost');
var cv = document.getElementById('boss-ghost-canvas');
var fx = document.getElementById('battle-fx');
if(!gh || !cv || !fx) return;
var H = battle.playerCanvasH || fx.clientHeight || 281;
var W = battle.playerCanvasW || Math.round(H * 1.2);
gh.style.width = W + 'px';
gh.style.height = H + 'px';
if(cv.width !== W || cv.height !== H){ cv.width = W; cv.height = H; }
var ctx = cv.getContext('2d');
ctx.clearRect(0, 0, W, H);
ctx.save();
ctx.globalAlpha = 0.45;
try { drawBlockBoss(ctx, W, H, battle.bossId, battleBossAnim.name, battleBossAnim.frame); } catch(e){}
ctx.restore();
try{
var def = BOSS_LAYERS[battle.bossId];
var ib = (typeof window._bossIdleBounds === 'function') ? window._bossIdleBounds(battle.bossId) : null;
var rects = (typeof window._bossWeakMap === 'function') ? window._bossWeakMap() : [];
if(def && ib && rects && rects.length){
var tf = getBossCanvasTransform(def, battle.bossId, W, H);
var iw = ib.maxX - ib.minX, ih = ib.maxY - ib.minY;
if(iw > 0 && ih > 0){
ctx.save();
ctx.strokeStyle = '#ff4fa0'; ctx.lineWidth = 1.2; ctx.setLineDash([3, 2]);
for(var i = 0; i < rects.length; i++){
var R = rects[i];
var x0 = tf.ox + (ib.minX + R.u0 * iw) * tf.sx;
var x1 = tf.ox + (ib.minX + R.u1 * iw) * tf.sx;
var y0 = tf.oy + (ib.maxY - R.v1 * ih) * tf.sy;
var y1 = tf.oy + (ib.maxY - R.v0 * ih) * tf.sy;
ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
}
ctx.restore();
}
}
}catch(e){}
var lbl = document.getElementById('boss-ghost-lbl');
if(lbl){
var d = Math.abs(battle.bossWorldX - battle.playerWorldX);
lbl.textContent = '虛影 · ' + (typeof window._fmtDistN === 'function' ? window._fmtDistN(d) : (String(Math.round(d)))) + 'm · ' + battle.bossName;
}
};

window._bossOffscreenUpdate = function(){
if(typeof battle === 'undefined' || !battle) return;
var m = window._bossOffscreenMount();
if(!m) return;
var distM = Math.abs(battle.bossWorldX - battle.playerWorldX);
var off = (battle.bx > 1.02 || battle.bx < -0.02);
/* rev-detect: 玩家發現 Boss = dist <= R_boss（Boss 自己的可被發現半徑）。
   與開火閘門無關：看見不代表能打，還要 dist <= 武器射程。
   不可 OR battle.engaged —— 那是 Boss 發現玩家，方向相反。 */
var detectR = (typeof window._bossDetectableR === 'function') ? window._bossDetectableR(battle.bossId) : 70;
var seen = distM <= detectR;
var show = off && seen && !battle.settling && !!battle.active;
m.bub.classList.toggle('on', show);
if(!show) battle.ghostOpen = false;
m.bub.classList.toggle('open', !!battle.ghostOpen);
var dEl = document.getElementById('boss-offscreen-d');
if(dEl) dEl.textContent = (typeof window._fmtDistN === 'function' ? window._fmtDistN(distM) : (String(Math.round(distM))));
var bEl = document.getElementById('boss-offscreen-bub');
if(bEl){
var tot = Math.max(1, (battle.bossMaxHp || 0) + (battle.bossMaxArmor || 0) + (battle.shieldMaxHp || 0));
var cur = Math.max(0, (battle.bossHp || 0) + (battle.bossArmor || 0) + (battle.shieldHp || 0));
var arc = Math.round(Math.max(0, Math.min(1, cur / tot)) * 360);
bEl.style.background = 'conic-gradient(#e05252 0deg ' + arc + 'deg, rgba(20,18,16,0.95) ' + arc + 'deg 360deg)';
}
var open = !!battle.ghostOpen && show;
m.gh.classList.toggle('on', open);
if(open) window._bossGhostRender();
};
/* ===== rev-hudroot:end ===== */

/* ===== rev-detect:start ===== */
/* ============================================================
   rev-detect: 術語鎖 —— R_目標 = 該目標「可被發現半徑」，是目標的隱蔽性。
   A 發現 B  <=>  dist <= R_B（與觀察者是誰無關）
   A 對 B 開火 <=> dist <= R_B 且 dist <= A 自身射程
   本專案沒有主動探測距離。

   R_boss 按 Boss 特性給值（非現實換算）：
   - 全部 < BOSS_WORLD_START(95)：開場 dist=95，雙方皆未發現
   - II 階除以 1.25（更隱蔽，與 ENEMY_DETECTABLE_R = 225/RARITY_MULT 同向）
   - 階梯遞減：早期玩家先發現（優勢窗口），後期 Boss 先發現（威脅窗口）
   ============================================================ */
const BOSS_DETECTABLE_R = {
  factory_king: 85,   factory_king_ii: 68,
  lab_queen: 80,      lab_queen_ii: 64,
  road_tyrant: 70,    road_tyrant_ii: 56,
  swamp_hydra: 55,    swamp_hydra_ii: 44,
  core_omega: 45,     core_omega_ii: 36
};
window.BOSS_DETECTABLE_R = BOSS_DETECTABLE_R;
window._bossDetectableR = function(bid){
  var id = String(bid || '');
  if(BOSS_DETECTABLE_R[id] != null) return BOSS_DETECTABLE_R[id];
  var base = id.replace(/_ii$/, '');
  var r = BOSS_DETECTABLE_R[base];
  if(r == null) return 70;
  return (id.indexOf('_ii') >= 0) ? Math.round(r / 1.25) : r;
};
/* ===== rev-detect:end ===== */

/* ===== rev-sweep-rig:start =====
   掃蕩載具行為全部用執行期 override 安裝 —— 13-render-vehicle.js / 17b-boss-combat.js
   一行不改。安裝時機 = 第一次發起掃蕩（此時所有腳本已載入）。 */
(function(){
  'use strict';
  function BTR(){ return window.BTRSupport; }
  function BT(){ return (typeof battle !== 'undefined') ? battle : null; }
  function vSpeed(vid){
    return (typeof window._vehicleSpeedKmh === 'function') ? window._vehicleSpeedKmh(vid) / 3.6 : 22;
  }

  /* Boss proxy 的 hp / armor 原本只有 getter；載具撞擊時 _tickAI 寫 e.hp = 0
     會在 strict mode 拋 TypeError。補上 setter。 */
  window._sweepBindTarget = function(){
    var b = BT();
    if(!b || !b.bossTarget) return;
    try{
      Object.defineProperty(b.bossTarget, 'hp', {
        configurable: true,
        get: function(){ var x = BT(); return x ? x.bossHp : 0; },
        set: function(v){ var x = BT(); if(x) x.bossHp = Math.max(0, v); }
      });
      Object.defineProperty(b.bossTarget, 'armor', {
        configurable: true,
        get: function(){ var x = BT(); return x ? x.bossArmor : 0; },
        set: function(v){ var x = BT(); if(x) x.bossArmor = Math.max(0, v); }
      });
    }catch(e){ console.warn('[sweep bind]', e); }
  };

  function rig(){
    var B = BTR();
    if(!B || B.__sweepRig) return;
    B.__sweepRig = true;

    /* (1) 開火閘門：掃蕩只在 support 開火，與探索完全一致。
           任何提前開火的 hook 在此被中和。 */
    var _fire = B._fireMuzzle;
    if(typeof _fire === 'function'){
      B._fireMuzzle = function(m, now){
        var b = BT();
        if(b && b.sweep && this.phase !== 'support'){
          m.nextFireAt = now + 250;
          m._preselectedTarget = null;
          return;
        }
        return _fire.apply(this, arguments);
      };
    }

    /* (2) sweepOut 相位：不放人、原速向右、出緣收尾 */
    var _upd = B._update;
    if(typeof _upd === 'function'){
      B._update = function(t, now){
        if(this.phase !== 'sweepOut') return _upd.apply(this, arguments);
        var dt = Math.min(0.05, (now - (this._sweepOutLast || now)) / 1000);
        this._sweepOutLast = now;
        var V = vSpeed(this.vehicleId);
        var sm = (typeof computeScreenMetrics === 'function') ? computeScreenMetrics(this.width, this.height) : null;
        var ppm = (sm && sm.bgPixelsPerMeter > 0) ? sm.bgPixelsPerMeter : (this.height * 0.58 / 1.7);
        this.shakeX = Math.sin(now / 40) * 1.5;
        this.shakeY = Math.cos(now / 55) * 1.2;
        this.doorOpen = 0;
        this.playerClipH = 0;
        this.playerXOffset = 0;
        this.x += (V * dt * ppm) / Math.max(1, this.width);
        if(this.x * this.width > this.width + 24){
          this._finished = true;
          this.active = false;
          this.phase = null;
          /* 掃蕩已預扣資源，不讓 _cleanup 把車戰彈藥快照寫回 */
          this._snap = null;
          this._ammoSnap = null;
          try{ this._cleanup(); }catch(e){}
        }
        return;
      };
    }

    /* (3) sweepOut 期間讓 _render 用全速輪速 / 履帶（暫借 support 分支，同步還原） */
    var _rnd = B._render;
    if(typeof _rnd === 'function'){
      B._render = function(now){
        if(this.phase !== 'sweepOut') return _rnd.apply(this, arguments);
        var ex = window._explore;
        var _p = this.phase;
        var _s = ex ? ex._currentSpeed : 0;
        this.phase = 'support';
        if(ex) ex._currentSpeed = vSpeed(this.vehicleId);
        try{ return _rnd.call(this, now); }
        finally{ this.phase = _p; if(ex) ex._currentSpeed = _s; }
      };
    }

    B.enterSweepOut = function(){
      if(this.phase === 'sweepOut') return;
      this.phase = 'sweepOut';
      this._sweepOutLast = performance.now();
      this.doorOpen = 0;
      this.playerClipH = 0;
      this.playerXOffset = 0;
      if(this.muzzles){
        for(var i = 0; i < this.muzzles.length; i++) this.muzzles[i].nextFireAt = Infinity;
      }
    };
  }

  /* (4) 單場收尾：車已出屏 → 清場景 → 回呼 _executeSweep 結算 N 份 */
  window._completeSweepBattle = function(b){
    if(!b || b._sweepDone) return;
    b._sweepDone = true;
    var cb = b.sweep && b.sweep.onDone;
    b.active = false;
    b.settling = false;
    b.sweepOut = false;
    try{ var B = BTR(); if(B && B.active) B.stop(); }catch(e){}
    try{ if(typeof window._combatCleanup === 'function') window._combatCleanup(); }catch(e){}
    try{ if(typeof _cleanBossFxCanvases === 'function') _cleanBossFxCanvases(); }catch(e){}
    battle = null;
    if(typeof cb === 'function') cb();
  };

  /* (5) endBattle / finishBattleSettle 的掃蕩分支：不發獎、不彈結算，
         死亡動畫 → sweepOut → 報告。17b 一行不改。 */
  window._sweepInstall = function(){
    rig();
    if(window.__sweepBattleHooks) return;
    window.__sweepBattleHooks = true;
    var _end = window.endBattle;
    if(typeof _end === 'function'){
      window.endBattle = function(victory){
        var b = BT();
        if(b && b.sweep){
          if(b.settling) return;
          b.settling = true;
          b.resultData = { victory: victory };
          var an = (typeof BOSS_ANIMS !== 'undefined') ? BOSS_ANIMS[b.bossId] : null;
          var da = an && an.death;
          if(victory && da){
            battleBossAnim.name = 'death';
            battleBossAnim.frame = 0;
            battleBossAnim.lastUpdate = performance.now();
            battleBossAnim.forcedEnd = 0;
            b._settleScheduled = false;
          } else if(typeof window._finishSweepBattle === 'function'){
            window._finishSweepBattle(b);
          }
          return;
        }
        return _end.apply(this, arguments);
      };
    }
    var _fs = window.finishBattleSettle;
    if(typeof _fs === 'function'){
      window.finishBattleSettle = function(){
        var b = BT();
        if(b && b.sweep){
          if(typeof window._finishSweepBattle === 'function') window._finishSweepBattle(b);
          return;
        }
        return _fs.apply(this, arguments);
      };
    }
  };
})();
/* ===== rev-sweep-rig:end ===== */

/* ===== rev-sweep-ux:start =====
   掃蕩收尾 / 放棄 / 日誌 helper。13 / 17b / 16 一行不改 —— 執行期 override，首次掃蕩時安裝。 */
(function(){
  'use strict';
  if(window.__sweepUxRig) return;
  window.__sweepUxRig = true;
  function BT(){ return (typeof battle !== 'undefined') ? battle : null; }

  window._sweepLog = function(html){
    var box = document.getElementById('sweep-status');
    if(!box) return;
    var d = document.createElement('div');
    d.className = 'logline';
    var t = new Date();
    var ts = ('0'+t.getHours()).slice(-2)+':'+('0'+t.getMinutes()).slice(-2)+':'+('0'+t.getSeconds()).slice(-2);
    d.innerHTML = '<span class="tm">'+ts+'</span> ' + html;
    box.appendChild(d);
    while(box.children.length > 80) box.removeChild(box.firstChild);
    box.scrollTop = box.scrollHeight;
  };

  window._abandonSweep = function(reason){
    if(!window._sweepLock) return false;
    var b = BT();
    var bid = b ? b.bossId : null;
    var total = (b && b.sweep) ? b.sweep.total : 0;
    try{
      var btr = window.BTRSupport;
      if(btr){ btr._snap = null; btr._ammoSnap = null; if(btr.active) btr.stop(); btr.phase = null; }
    }catch(e){}
    try{ if(typeof window._combatCleanup === 'function') window._combatCleanup(); }catch(e){}
    try{ if(typeof _cleanBossFxCanvases === 'function') _cleanBossFxCanvases(); }catch(e){}
    try{ if(b && typeof window._clearWeaponBullets === 'function') window._clearWeaponBullets(b); }catch(e){}
    if(b){ b.active = false; b.sweep = null; b.settling = false; }
    battle = null;
    if(typeof window._sweepUnlock === 'function') window._sweepUnlock();
    window._sweepLock = false;
    var bn = (bid && typeof BOSSES !== 'undefined' && BOSSES[bid]) ? BOSSES[bid].name : (bid || '');
    if(typeof pushLog === 'function'){
      pushLog('<span class="pl">玩家</span> <span class="lose">放棄掃蕩</span> <b>' + bn + '</b>' + (total ? ' ×' + total : '') + '（已消耗資源不退還，無獎勵）', [], 'combat');
    }
    if(typeof save === 'function') save();
    return true;
  };

  window._sweepInstall = function(){
    if(window.__sweepUxInstalled) return;
    window.__sweepUxInstalled = true;

    var _end = window.endBattle;
    if(typeof _end === 'function'){
      window.endBattle = function(victory){
        var b = BT();
        if(b && b.sweep){
          if(b.settling) return;
          b.settling = true;
          b.resultData = { victory: victory };
          if(victory){
            if(!b._killLogged){ b._killLogged = true; if(typeof window._sweepLog === 'function') window._sweepLog('<span class="win">Boss 擊殺！</span>'); }
            var an = (typeof BOSS_ANIMS !== 'undefined') ? BOSS_ANIMS[b.bossId] : null;
            var da = an && an.death;
            if(da && typeof battleBossAnim !== 'undefined'){
              battleBossAnim.name = 'death'; battleBossAnim.frame = 0;
              battleBossAnim.lastUpdate = performance.now(); battleBossAnim.forcedEnd = 0;
            }
            b._settleScheduled = false;
          } else if(typeof window._finishSweepBattle === 'function'){
            window._finishSweepBattle(b);
          }
          return;
        }
        return _end.apply(this, arguments);
      };
    }
    var _fs = window.finishBattleSettle;
    if(typeof _fs === 'function'){
      window.finishBattleSettle = function(){
        var b = BT();
        if(b && b.sweep){ if(typeof window._finishSweepBattle === 'function') window._finishSweepBattle(b); return; }
        return _fs.apply(this, arguments);
      };
    }
    /* Boss 不走敵人擊殺流程（無掉落日誌 / 無經驗 / 無屍體） */
    var _ok = window._onBTRKillTarget;
    if(typeof _ok === 'function'){
      window._onBTRKillTarget = function(target){
        var b = BT();
        if(b && b.sweep && target === b.bossTarget) return;
        return _ok.apply(this, arguments);
      };
    }
    /* 掃蕩期間禁止探索事件敵人混入載具戰 */
    var _swe = window._syncWorldEnemies;
    if(typeof _swe === 'function'){
      window._syncWorldEnemies = function(){
        if(window._combat && window._combat._sweep) return;
        return _swe.apply(this, arguments);
      };
    }

    var B = window.BTRSupport;
    if(B && !B.__sweepUx){
      B.__sweepUx = true;
      var _fire = B._fireMuzzle;
      if(typeof _fire === 'function'){
        B._fireMuzzle = function(m, now){
          var b = BT();
          if(b && b.sweep && this.phase !== 'support'){
            m.nextFireAt = now + 250; m._preselectedTarget = null; return;
          }
          return _fire.apply(this, arguments);
        };
      }
      var _upd = B._update;
      if(typeof _upd === 'function'){
        B._update = function(t, now){
          if(this.phase !== 'sweepOut') return _upd.apply(this, arguments);
          var dt = Math.min(0.05, (now - (this._sweepOutLast || now)) / 1000);
          this._sweepOutLast = now;
          var V = (typeof window._vehicleSpeedKmh === 'function') ? window._vehicleSpeedKmh(this.vehicleId) / 3.6 : 22;
          var sm = (typeof computeScreenMetrics === 'function') ? computeScreenMetrics(this.width, this.height) : null;
          var ppm = (sm && sm.bgPixelsPerMeter > 0) ? sm.bgPixelsPerMeter : (this.height * 0.58 / 1.7);
          this.shakeX = Math.sin(now / 40) * 1.5;
          this.shakeY = Math.cos(now / 55) * 1.2;
          this.doorOpen = 0; this.playerClipH = 0; this.playerXOffset = 0;
          this.x += (V * dt * ppm) / Math.max(1, this.width);
          if(this.x * this.width > this.width + 24){
            this._finished = true; this.active = false; this.phase = null;
            this._snap = null; this._ammoSnap = null;
            try{ this._cleanup(); }catch(e){}
          }
        };
      }
      var _rnd = B._render;
      if(typeof _rnd === 'function'){
        B._render = function(now){
          if(this.phase !== 'sweepOut') return _rnd.apply(this, arguments);
          var ex = window._explore, _p = this.phase, _s = ex ? ex._currentSpeed : 0;
          this.phase = 'support';
          if(ex) ex._currentSpeed = (typeof window._vehicleSpeedKmh === 'function') ? window._vehicleSpeedKmh(this.vehicleId) / 3.6 : 22;
          try{ return _rnd.call(this, now); }
          finally{ this.phase = _p; if(ex) ex._currentSpeed = _s; }
        };
      }
      B.enterSweepOut = function(){
        if(this.phase === 'sweepOut') return;
        this.phase = 'sweepOut';
        this._sweepOutLast = performance.now();
        this.doorOpen = 0; this.playerClipH = 0; this.playerXOffset = 0;
        if(this.muzzles){ for(var i = 0; i < this.muzzles.length; i++) this.muzzles[i].nextFireAt = Infinity; }
      };
    }

    window._completeSweepBattle = function(b){
      if(!b || b._sweepDone) return;
      b._sweepDone = true;
      var cb = b.sweep && b.sweep.onDone;
      var total = (b.sweep && b.sweep.total) || 1;
      b.active = false; b.settling = false; b.sweepOut = false;
      try{ var B2 = window.BTRSupport; if(B2){ B2._snap = null; B2._ammoSnap = null; if(B2.active) B2.stop(); B2.phase = null; } }catch(e){}
      try{ if(typeof window._combatCleanup === 'function') window._combatCleanup(); }catch(e){}
      try{ if(typeof _cleanBossFxCanvases === 'function') _cleanBossFxCanvases(); }catch(e){}
      battle = null;
      if(typeof window._sweepUnlock === 'function') window._sweepUnlock();
      window._sweepLock = false;
      if(typeof window._sweepLog === 'function') window._sweepLog('結算 <b style="color:#4caf50">×' + total + '</b> 份獎勵');
      if(typeof cb === 'function') cb();
    };
  };
})();
/* ===== rev-sweep-ux:end ===== */

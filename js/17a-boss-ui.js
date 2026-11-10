
'use strict';

let battle = null;

/* [v222] Boss戰特效 canvas 清理 */
function _cleanBossFxCanvases(){
  ['boss-fx-canvas', 'boss-aimhit-canvas', 'boss-bullets-canvas'].forEach(function(id){
    var el = document.getElementById(id);
    if(el && el.parentNode) el.parentNode.removeChild(el);
  });
}

const BATTLE_ONESHOT_ANIMS = ['fire_primary','fire_secondary','attack_melee','reload','switch_secondary','switch_melee','hurt'];

function stopBattleMovement(){
  if(!battle) return;
  battle.moveDir = 0;
  const stick = document.getElementById('stick');
  if(stick){ stick.style.left = '50%'; stick.style.top = '50%'; stick.style.transform = 'translate(-50%,-50%)'; }
  if(typeof battle._joystickCancel === 'function') battle._joystickCancel();
}

function interruptReload(){
  if(!battle || !battle.reloading) return false;
  battle._reloadToken = (battle._reloadToken || 0) + 1;
  battle.reloading = false;
  if(typeof battleHeroAnim !== 'undefined' && battleHeroAnim.name === 'reload'){
    battleHeroAnim.name = 'idle';
    battleHeroAnim.frame = 0;
  }
  if(typeof refreshBattleControlsLive === 'function') refreshBattleControlsLive();
  return true;
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
  const sw = _sweepMaxCount(bid);
  if(count < 1 || sw.max < count) return;
  const b = BOSSES[bid];
  state.seals[b.seal] = parseInt(state.seals[b.seal] || 0, 10) - count;
  if(typeof _consumeLiquorByValue === 'function') _consumeLiquorByValue(sw.perLiquor * count);
  if(typeof _consumeAmmoByValue === 'function') _consumeAmmoByValue(sw.perAmmo * count);
  if(typeof save === 'function') save();

  const g = (typeof _garageInitState === 'function') ? _garageInitState() : null;
  const vid = g ? g.currentVehicle : 'btr80';
  const expTarget = _sweepExpTarget();
  const level = sw.level;

  const tabbar = document.getElementById('tabbar');
  const origPointer = tabbar ? tabbar.style.pointerEvents : '';
  if(tabbar) tabbar.style.pointerEvents = 'none';

  _playOneSweepAnim(bid, vid, count, function(){
    const allLoot = [];
    let servantGained = null;
    for(let i = 0; i < count; i++){
      const loot = _rollSweepLoot(bid);
      for(const it of loot) allLoot.push(it);
      if(!servantGained && Math.random() < 0.25){
        const srv = (typeof grantRandomServant === 'function') ? grantRandomServant() : null;
        if(srv) servantGained = srv;
      }
      if(typeof _garageAddVehicleExp === 'function'){
        _garageAddVehicleExp(expTarget, level * 100);
      } else if(typeof _garageInitState === 'function'){
        const gg = _garageInitState();
        if(gg) gg.vehicleExp[expTarget] = (gg.vehicleExp[expTarget] || 0) + level * 100;
      }
      state.stats.bossKills = (state.stats.bossKills || 0) + 1;
    }
    if(tabbar) tabbar.style.pointerEvents = origPointer;
    _finishBatchSweep(bid, vid, level, count, allLoot, servantGained, expTarget);
  });
}

function _playOneSweepAnim(bid, vid, totalCount, onComplete){
  const z1 = document.getElementById('zone1');
  if(!z1){ onComplete(); return; }
  z1.innerHTML = '';
  const ZW = z1.clientWidth || 400;
  const ZH = z1.clientHeight || 500;
  const BOSS_START_PCT = 65;

  const PLAYER_SPRITE_H = ZH * 0.4519;
  const PLAYER_FACTOR = 0.667;
  const RATIO_EXPLORE = 0.99 / 0.58;
  const vehH = PLAYER_SPRITE_H * PLAYER_FACTOR * RATIO_EXPLORE;
  const ann = (window.VEHICLE_ANNOTATIONS && window.VEHICLE_ANNOTATIONS[vid]) ? window.VEHICLE_ANNOTATIONS[vid] : null;
  const imgW = (ann && ann.imageSize) ? ann.imageSize.w : 640;
  const imgH = (ann && ann.imageSize) ? ann.imageSize.h : 240;
  const vehW = vehH * (imgW / imgH);
  const bossSize = Math.round(ZH * 0.75);
  const maxHalfW = Math.floor(ZW * Math.min(BOSS_START_PCT / 100, 1 - BOSS_START_PCT / 100) * 0.98);
  const bossWide = Math.max(bossSize, Math.min(Math.round(bossSize * 1.5), maxHalfW * 2));
  const BOSS_W = bossWide;
  const BOSS_H = bossSize;

  const scene = document.createElement('div');
  scene.style.cssText = 'position:absolute;inset:0;overflow:hidden;background:#0a0605;';
  const bg = document.createElement('div');
  bg.style.cssText = "position:absolute;inset:0;background-image:url('" + getBossBgPath(bid) + "');background-size:cover;background-position:center bottom;background-repeat:no-repeat;opacity:0;transition:opacity 0.25s ease-out;";
  const bossCanvas = document.createElement('canvas');
  bossCanvas.width = BOSS_W; bossCanvas.height = BOSS_H;
  bossCanvas.style.cssText = 'position:absolute;bottom:0;left:' + BOSS_START_PCT + '%;transform:translateX(-50%);width:' + BOSS_W + 'px;height:' + BOSS_H + 'px;opacity:0;transition:opacity 0.25s ease-out;will-change:left,transform;';
  try {
    const bctx = bossCanvas.getContext('2d');
    drawBlockBoss(bctx, BOSS_W, BOSS_H, bid, 'idle', 0);
  } catch(e){}
  const veh = document.createElement('canvas');
  veh.width = Math.max(1, Math.floor(vehW));
  veh.height = Math.max(1, Math.floor(vehH));
  veh.style.cssText = 'position:absolute;bottom:0;left:-50%;width:' + vehW + 'px;height:' + vehH + 'px;transform:translateX(-50%);will-change:left;';
  const _vehCtx = veh.getContext('2d');
  const fireCanvas = document.createElement('canvas');
  fireCanvas.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:5;';
  fireCanvas.width = ZW; fireCanvas.height = ZH;
  const fcCtx = fireCanvas.getContext('2d');
  const progress = document.createElement('div');
  progress.style.cssText = 'position:absolute;top:8px;left:50%;transform:translateX(-50%);color:#e8a33d;font-size:12px;font-weight:bold;background:rgba(14,12,10,.85);border:1px solid #8a5f18;padding:3px 12px;border-radius:10px;z-index:10;white-space:nowrap;';
  progress.textContent = '掃蕩 ×' + totalCount;
  scene.appendChild(bg);
  scene.appendChild(bossCanvas);
  scene.appendChild(veh);
  scene.appendChild(fireCanvas);
  scene.appendChild(progress);
  z1.appendChild(scene);
  requestAnimationFrame(function(){ bg.style.opacity = '1'; bossCanvas.style.opacity = '1'; });

  const bossHalfPct = (BOSS_W / ZW) * 50;
  const vehHalfPct = (vehW / ZW) * 50;
  const VEH_CONTACT = BOSS_START_PCT - vehHalfPct;
  const VEH_START = Math.min(-vehHalfPct - 10, VEH_CONTACT - 20);
  const distBossPct = (105 + bossHalfPct) - BOSS_START_PCT;
  const distVehPct = 110 + vehHalfPct - VEH_CONTACT;
  const moveDistPct = Math.max(distBossPct, distVehPct, 40);
  const VEH_END = VEH_CONTACT + moveDistPct;
  const BOSS_END = BOSS_START_PCT + moveDistPct;

  const FADE_IN_MS = 250;
  const SWEEP_SPEED_PX_PER_SEC = 1200;
  const vehTopY = ZH - vehH;
  const startTime = performance.now();

  let sweepSmoke = [];
  let sweepTracers = [];
  let _sweepErasedMissilePolys = [];
  let _sweepErasedBaseImg = null;
  let _sweepMissiles = [];

  const _sweepMuzzles = [];
  if(ann && ann.muzzles && ann.muzzles.length){
    for(let mi = 0; mi < ann.muzzles.length; mi++){
      const md = ann.muzzles[mi];
      const prof = (typeof window.MUZZLE_PROFILES !== 'undefined' && window.MUZZLE_PROFILES[md.weaponId]) ? window.MUZZLE_PROFILES[md.weaponId] : ((window.MUZZLE_PROFILES && window.MUZZLE_PROFILES.default) || { burst: 3, intervalMs: 100, pauseMs: 300 });
      if(md.weaponId !== 'atgm'){
        _sweepMuzzles.push({ weaponId: md.weaponId, mx: md.x, my: md.y, profile: prof, shotsLeft: prof.burst, nextFireAt: 0 });
      }
    }
  }
  if(!_sweepMuzzles.length){
    _sweepMuzzles.push({ weaponId: '__default__', mx: 0.85, my: 0.17, profile: ((window.MUZZLE_PROFILES && window.MUZZLE_PROFILES.default) || { burst: 3, intervalMs: 100, pauseMs: 300 }), shotsLeft: 3, nextFireAt: 0 });
  }

  window._sweepDustParticles = [];

  const sweepTex = (function(){
    const c = document.createElement('canvas'); c.width = 128; c.height = 128;
    const cx = c.getContext('2d');
    for(let i = 0; i < 8; i++){
      const ox = (Math.random()-0.5)*30, oy = (Math.random()-0.5)*30, r = 20+Math.random()*30;
      const g = cx.createRadialGradient(64+ox, 64+oy, 0, 64+ox, 64+oy, r);
      g.addColorStop(0, 'rgba(235,235,240,0.7)');
      g.addColorStop(0.5, 'rgba(220,220,225,0.4)');
      g.addColorStop(1, 'rgba(200,200,205,0)');
      cx.fillStyle = g;
      cx.beginPath(); cx.arc(64+ox, 64+oy, r, 0, Math.PI*2); cx.fill();
    }
    return c;
  })();

  let _sweepDone = false;
  const _safeDone = function(){ if(_sweepDone) return; _sweepDone = true; onComplete(); };
  const _safety = setTimeout(_safeDone, 15000);

  function tick(now){
    try {
      if(_sweepDone) return;
      const t = now - startTime;
      const elapsed = Math.max(0, t - FADE_IN_MS);
      const totalMovePx = (VEH_END - VEH_START) / 100 * ZW;
      let totalMoveMs = Math.max(150, totalMovePx / SWEEP_SPEED_PX_PER_SEC * 1000);
      if(!isFinite(totalMoveMs) || totalMoveMs <= 0) totalMoveMs = 2000;
      if(elapsed >= totalMoveMs){
        clearTimeout(_safety);
        _safeDone();
        return;
      }
      const pTotal = Math.min(1, elapsed / totalMoveMs);
      const vehX = VEH_START + (VEH_END - VEH_START) * pTotal;
      const bossX = BOSS_START_PCT;
      let bossRot = 0;
      if(vehX > VEH_CONTACT){
        const pushed = vehX - VEH_CONTACT;
        const pushTotal = Math.max(0.001, VEH_END - VEH_CONTACT);
        bossRot = Math.min(1, pushed / pushTotal) * 25;
      }
      veh.style.left = vehX + '%';
      if(typeof window.VehicleRenderer !== 'undefined' && window.VEHICLE_ANNOTATIONS && window.VEHICLE_ANNOTATIONS[vid]){
        try {
          _vehCtx.clearRect(0, 0, veh.width, veh.height);
          const _vehRenderOpts = { trackVel: 300, wheelSpeed: 20, doorOpen: 0, recoils: {} };
          if(_sweepErasedMissilePolys.length > 0){
            if(!_sweepErasedBaseImg && typeof window._makeErasedBaseImage === 'function'){
              _sweepErasedBaseImg = window._makeErasedBaseImage(vid, _sweepErasedMissilePolys);
            }
            if(_sweepErasedBaseImg) _vehRenderOpts.baseImage = _sweepErasedBaseImg;
          }
          window.VehicleRenderer.render(_vehCtx, vid, 0, 0, veh.width, veh.height, (now - startTime) / 1000, _vehRenderOpts);
        } catch(e){}
      }
      if(vehX > VEH_CONTACT){
        bossCanvas.style.left = (BOSS_START_PCT + (vehX - VEH_CONTACT)) + '%';
        bossCanvas.style.transform = 'translateX(-50%) rotate(' + bossRot + 'deg)';
      }

      const dt = Math.min(0.05, (now - (window._sweepLastTick || now)) / 1000);
      window._sweepLastTick = now;
      const vehCenterPx = (vehX / 100) * ZW;

      const worldSpeed = SWEEP_SPEED_PX_PER_SEC;
      if(t >= FADE_IN_MS && elapsed < totalMoveMs){
        const _vehLeftPx = vehCenterPx - vehW / 2;
        const _vehTopPx = ZH - vehH;
        for(let mi = 0; mi < _sweepMuzzles.length; mi++){
          const mz = _sweepMuzzles[mi];
          if(now < mz.nextFireAt) continue;
          mz.nextFireAt = now + (mz.shotsLeft > 1 ? mz.profile.intervalMs : mz.profile.pauseMs);
          mz.shotsLeft--;
          if(mz.shotsLeft <= 0) mz.shotsLeft = mz.profile.burst;
          const mxPx = _vehLeftPx + mz.mx * vehW;
          const myPx = _vehTopPx + mz.my * vehH;
          if(typeof window._vsMakeSmokeJet === 'function'){
            sweepSmoke.push(window._vsMakeSmokeJet(mxPx, myPx, mz.weaponId));
            for(let si = 0; si < 4; si++){
              sweepSmoke.push(window._vsMakeSmokeSpread(mxPx + vehW * 0.04, myPx, mz.weaponId));
            }
          }
          sweepTracers.push({ startX: mxPx, startY: myPx, born: now, speed: 2500, len: 100, width: 3 });
        }
      }

      if(typeof window._vsUpdateSmoke === 'function'){
        window._vsUpdateSmoke(sweepSmoke, dt, worldSpeed);
      }
      fcCtx.clearRect(0, 0, ZW, ZH);

      for(let smi = 0; smi < _sweepMissiles.length; smi++){
        const sm = _sweepMissiles[smi];
        const smx = sm.x + (now - sm.born) / 1000 * sm.speed;
        if(smx > ZW + 200) continue;
        fcCtx.save();
        fcCtx.translate(smx, sm.y);
        fcCtx.fillStyle = 'rgba(255, 200, 50, 0.85)';
        fcCtx.beginPath();
        fcCtx.moveTo(-15, 0);
        fcCtx.lineTo(-30 - Math.random()*10, -4);
        fcCtx.lineTo(-30 - Math.random()*10, 4);
        fcCtx.closePath();
        fcCtx.fill();
        fcCtx.fillStyle = '#eee';
        fcCtx.beginPath();
        fcCtx.ellipse(0, 0, 12, 4, 0, 0, Math.PI * 2);
        fcCtx.fill();
        fcCtx.restore();
      }
      _sweepMissiles = _sweepMissiles.filter(function(m){ return m.x + (now - m.born) / 1000 * m.speed <= ZW + 200; });

      if(!window._sweepDustParticles) window._sweepDustParticles = [];
      if(ann && elapsed < totalMoveMs && Math.random() < 0.8){
        const _dustSrc = window.computeVehicleDustSource ? window.computeVehicleDustSource(ann) : null;
        if(_dustSrc){
          window.spawnDust(window._sweepDustParticles, vehCenterPx - vehW/2, ZH - vehH, _dustSrc, vehW, vehH, 20);
        }
      }
      window.updateAndDrawDust(fcCtx, window._sweepDustParticles, dt);

      if(typeof window._vsDrawSmoke === 'function'){
        window._vsDrawSmoke(fcCtx, sweepSmoke);
      }
      fcCtx.globalAlpha = 1;
      fcCtx.save();
      fcCtx.shadowColor = 'rgba(255,200,50,0.8)';
      fcCtx.shadowBlur = 10;
      for(let i = sweepTracers.length - 1; i >= 0; i--){
        const tr = sweepTracers[i];
        const tipX = tr.startX + (now - tr.born) / 1000 * tr.speed;
        if(tipX - tr.len > ZW + 200){ sweepTracers.splice(i, 1); continue; }
        const tailX = Math.max(tr.startX, tipX - tr.len);
        const grad = fcCtx.createLinearGradient(tailX, tr.startY, tipX, tr.startY);
        grad.addColorStop(0, 'rgba(255,200,50,0)');
        grad.addColorStop(0.8, 'rgba(255,255,200,0.9)');
        grad.addColorStop(1, '#fff');
        fcCtx.strokeStyle = grad;
        fcCtx.lineWidth = tr.width;
        fcCtx.beginPath();
        fcCtx.moveTo(tailX, tr.startY);
        fcCtx.lineTo(tipX, tr.startY);
        fcCtx.stroke();
      }
      fcCtx.restore();
      requestAnimationFrame(tick);
    } catch(err){
      console.error('[sweep tick error]', err);
      clearTimeout(_safety);
      _safeDone();
    }
  }
  requestAnimationFrame(tick);
}

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
  const rLeft = b.px * 100;
  const rRight = Math.min(1, (b.px + (b.playerWeaponRange || 0.5))) * 100;
  const rWidth = rRight - rLeft;
  const totalHp = b.bossMaxHp + b.bossMaxArmor;
  const dealtPct = Math.min(100, (b.damageDealt / totalHp) * 100);

  z1.innerHTML = '<div class="battle-scene"><div class="battle-bg" style="background-image:url(\'' + getBossBgPath(b.bossId) + '\')"></div><div class="range-indicator" id="range-indicator" style="left:' + rLeft + '%;width:' + rWidth + '%"></div><div class="damage-header"><div>對 Boss 傷害 <span class="num">' + Math.round(b.damageDealt) + '</span> / ' + totalHp + '</div><div class="bar"><div class="fill" id="dmg-bar" style="width:' + dealtPct + '%"></div></div></div><div class="fighter boss-f" id="fighter-boss" style="left:' + (b.bx * 100) + '%;top:' + (b.by * 100) + '%"><div class="hpbar-wrap' + ((b.shieldMaxHp > 0 && !b.shieldBroken) ? ' has-shield' : '') + '" id="boss-hpbar-wrap"><div class="nm">' + b.bossName + ((b.bossId.indexOf('_ii') >= 0 && b.bossName.indexOf('II') === -1) ? ' II' : '') + '</div>' + ((b.shieldMaxHp > 0 && !b.shieldBroken) ? '<div class="shield-bar-wrap" id="shield-bar-wrap"><div class="bar"><div class="fill" id="boss-shield" style="width:' + (b.shieldHp / b.shieldMaxHp * 100) + '%"></div></div></div>' : '') + '<div class="bar ap"><div class="fill" id="boss-ap" style="width:' + (b.bossArmor / b.bossMaxArmor * 100) + '%"></div></div><div class="bar hp"><div class="fill" id="boss-hp" style="width:' + (b.bossHp / b.bossMaxHp * 100) + '%"></div></div></div><div class="sprite" id="boss-sprite">' + (BOSS_LAYERS[b.bossId] ? '<canvas id="boss-battle-canvas"></canvas>' : bossIcon(b.bossId)) + '</div></div><div class="fighter hero-f" id="fighter-hero" style="left:' + (b.px * 100) + '%;top:' + (b.py * 100) + '%"><div class="hpbar-wrap"><div class="nm">玩家</div><div class="bar ap"><div class="fill" id="hero-ap" style="width:' + (b.playerArmor / b.playerMaxArmor * 100) + '%"></div></div><div class="bar hp"><div class="fill" id="hero-hp" style="width:' + (b.playerHp / b.playerMaxHp * 100) + '%"></div></div></div><div class="sprite" id="hero-sprite"><canvas id="hero-battle-canvas"></canvas></div></div><div class="head-bars" id="head-bars"></div><div id="battle-fx"></div></div>';

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
        const old = document.getElementById('aim-marker');
        if(old) old.remove();
        const m = document.createElement('div');
        m.className = 'aim-marker';
        m.id = 'aim-marker';
        m.style.left = ((_cx - sceneRect.left) / sceneRect.width * 100) + '%';
        m.style.top = ((_cy - sceneRect.top) / sceneRect.height * 100) + '%';
        fx.appendChild(m);
        setTimeout(function(){ if(m.parentNode) m.remove(); }, 1000);
      }
    }
  });
}

function _bindBattleTap(el, handler){
  let _lastTouch = 0;
  el.addEventListener('touchstart', function(e){
    e.preventDefault();
    e.stopPropagation();
    _lastTouch = Date.now();
    const _t = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]);
    if(_t){
      handler({
        clientX: _t.clientX,
        clientY: _t.clientY,
        pageX: _t.pageX,
        pageY: _t.pageY,
        target: e.target,
        currentTarget: e.currentTarget,
        touches: e.touches,
        changedTouches: e.changedTouches,
        preventDefault: function(){},
        stopPropagation: function(){}
      });
    } else {
      handler(e);
    }
  }, { passive: false });
  el.addEventListener('click', function(e){
    if(Date.now() - _lastTouch < 500) return;
    handler(e);
  });
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

function refreshBattleControlsLive(){
  if(!battle) return;
  const info = document.getElementById('battle-ammo-info');
  if(info) info.innerHTML = buildBattleWeaponInfo();
  const fb = document.getElementById('fire-btn');
  if(fb){
    const canFire = !battle.reloading && !battle.consuming;
    fb.classList.toggle('disabled', !canFire);
    fb.textContent = battle.reloading ? '裝填' : (battle.consuming ? '使用中' : '攻擊');
  }
  const hb = document.getElementById('heal-btn');
  if(hb){
    const now = performance.now();
    const canHeal = !battle.consuming && !battle.reloading && now >= (battle.healDisabledUntil || 0) && battle.playerHp < battle.playerMaxHp;
    hb.classList.toggle('disabled', !canHeal);
  }
  const ds = document.getElementById('battle-dmg-status');
  if(ds) ds.textContent = '對 Boss 傷害：' + Math.round(battle.damageDealt) + ' ｜ ' + (battle.engaged ? '⚔️ 已交戰' : '⏸️ 準備中');
}

function renderBattleControls(z3){
  const w = battle.weapon;
  const wdef = w ? w.def : null;
  const _allModes = wdef && wdef.modes ? wdef.modes : ['點射'];
  const _BURST_WHITELIST = ['ak12'];
  const _wid = battle.weapon ? battle.weapon.id : '';
  let _baseId = _wid;
  if(_wid && _wid.indexOf('named_') === 0){
    const _p = _wid.split('_');
    if(_p.length >= 2) _baseId = _p[1];
  }
  const modes = _allModes.filter(function(m){
    if(m === '長點射') return false;
    if(m === '短點射' && _BURST_WHITELIST.indexOf(_baseId) === -1) return false;
    return true;
  });
  if(modes.indexOf(battle.fireMode) === -1) battle.fireMode = modes[0] || '點射';
  const canFire = !battle.reloading && !battle.consuming;

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
  {
    const _pr = battle.px + battle.playerWeaponRange;
    const _bl = getBossLeftBoundaryN();
    if(_pr < _bl) return;
    if(!isAimPartInRange()) return;
  }
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
  const playerRightPx = battle.px + battle.playerWeaponRange;
  const bossLeftPx = getBossLeftBoundaryN();
  if(playerRightPx < bossLeftPx) return false;
  if(!isAimPartInRange()) return false;
  const isMelee = def.slot === 'melee';

  if(def.cal && battle.ammoInMag <= 0){
    if(!(battle.ammoRef && battle.ammoRef.count > 0)){
      const switched = autoSwitchOnNoAmmo();
      if(!switched){
        battle.firing = false;
        battle.burstLeft = 0;
      }
      return false;
    }
  }

  battle.shotLockUntil = performance.now() + 350;

  {
    const _fireAnimName = (battle.weaponSlot === 'secondary') ? 'fire_secondary' : (battle.weaponSlot === 'melee') ? 'attack_melee' : 'fire_primary';
    const _fireDur = (battle.weaponSlot === 'melee') ? 600 : 350;
    if(battle.weaponSlot === 'secondary'){
      battleHeroAnim.name = 'fire_secondary';
      battleHeroAnim.frame = 0;
    } else if(battle.weaponSlot === 'melee'){
      battleHeroAnim.name = 'attack_melee';
      battleHeroAnim.frame = 0;
    } else {
      battleHeroAnim.name = 'fire_primary';
      battleHeroAnim.frame = 0;
    }
    battleHeroAnim.lastUpdate = performance.now();
    battleHeroAnim.forcedEnd = performance.now() + _fireDur;
  }

  const _now = performance.now();
  if(_now - (battle.lastShotTime || 0) > (battle.chainResetMs || 600)){ battle.chainShots = 0; }
  battle.chainShots = (battle.chainShots || 0) + 1;
  battle.lastShotTime = _now;
  const _n = battle.chainShots;
  let _effectiveMode;
  if(_n === 1) _effectiveMode = '點射';
  else if(_n <= 3) _effectiveMode = '短點射';
  else if(_n <= 7) _effectiveMode = '長點射';
  else _effectiveMode = '掃射';

  const isWeak = isWeakPointHit();

  if(def.cal){
    if(battle.ammoInMag <= 0){
      triggerReload();
      return false;
    }
    battle.ammoInMag--;
    const mz = getPlayerMuzzlePos();
    const target = getAimTargetPos();
    
    /* [v211-fix] 生成槍口煙火 */
    const _fxElB = document.getElementById('battle-fx');
    if(window.MuzzleFX) window.MuzzleFX.spawn(mz.x * (_fxElB? _fxElB.clientWidth : 400), mz.y * (_fxElB? _fxElB.clientHeight : 500), w.def.type === '機槍' ? 1.2 : 1.0, false, 'boss');
    
    /* [v212] 真實彈速與延遲結算 */
    const _dist = Math.abs(battle.bx - battle.px); 
    const _spd = (window.AMMO_SPEED_MS && window.AMMO_SPEED_MS[def.cal]) || 800;
    const _duration = Math.max(16, _dist * 100 / _spd * 1000);

    const hitRate = getHitRate(def.type, _effectiveMode, def.scopeBonus || 0);
    const _pdB = 0.6 + clamp(Math.floor(state.proficiency[def.type] || 0) / MAX_PROF_LEVEL, 0, 1) * 0.9;
    const baseDmg = Math.round((battle.ammoRef ? AMMO[battle.ammoRef.id].dmg * (RARITY_MULT[battle.ammoRef.rarity] || 1) : 20) * _pdB);
    const ammoPenMM = battle.ammoRef ? (AMMO[battle.ammoRef.id].penMM || 0) : 0;
    const critRate = calcCritRate(w.rarity, battle.ammoRef ? battle.ammoRef.rarity : '一般');
    const critMult = calcCritMult(w.rarity, battle.ammoRef ? battle.ammoRef.rarity : '一般');
    const pellets = battle.ammoRef ? (AMMO[battle.ammoRef.id].pellets || 1) : 1;

    battle.bullets.push({
      sx: mz.x, sy: mz.y, tx: clamp(target.x, 0, 1), ty: clamp(target.y, 0, 1), 
      startTime: performance.now(), duration: _duration, player: true,
      _onHit: function(){
        for(let p = 0; p < pellets; p++){
          if(Math.random() * 100 < hitRate){
            let dmg = baseDmg;
            let isCrit = false;
            if(Math.random() < critRate){ dmg = Math.round(dmg * critMult); isCrit = true; }
            /* [v217] 瞄準點小型爆炸特效 */
            if(!battle.aimHitFx) battle.aimHitFx = [];
            {
              const _pCount = isCrit ? 8 : 5;
              const _parts = [];
              for(let _pi = 0; _pi < _pCount; _pi++){
                const _ang = Math.random() * Math.PI * 2;
                const _spd = 20 + Math.random() * 15;
                _parts.push({ dx: Math.cos(_ang) * _spd, dy: Math.sin(_ang) * _spd, r: 1.5 + Math.random() * 1.5 });
              }
              battle.aimHitFx.push({ x: target.x, y: target.y, startTime: performance.now(), crit: isCrit, particles: _parts });
            }
            if(isWeak){
              battle.engaged = true;
              battle.bossHp = Math.max(0, battle.bossHp - dmg);
              battle.damageDealt += dmg;
              spawnHitFx(battle.bx, battle.by, '-' + dmg + (isCrit ? '!' : ''), isCrit ? 'crit' : 'weak');
              if(isBossType(battle.bossId, 'omega') && battle.arms) damageOmegaArm(battle.aimPart, dmg);
              if(battle.bossHp <= 0){ endBattle(true); return; }
            } else {
              applyBossDamage(dmg, isCrit, ammoPenMM);
              if(battle.bossHp <= 0) return;
            }
          }
        }
      }
    });
  } else {
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
    if(def.slot === 'throwable' && def.explosive && (def.fragments || 0) > 0){
      const _hitRate = getHitRate(def.type, battle.fireMode) + 10;
      const _pdB = 0.6 + clamp(Math.floor(state.proficiency[def.type] || 0) / MAX_PROF_LEVEL, 0, 1) * 0.9;
      const _frags = def.fragments;
      let _effFrags;
      if(def.allFragmentsOnSingle){ _effFrags = _frags; }
      else { _effFrags = Math.round(_frags * 0.25); }
      const _pieceBaseDmg = (def.fragmentDamage || def.dmg || 0) * (RARITY_MULT[w.rarity] || 1) * _pdB;
      const _critRate = calcCritRate(w.rarity, '一般');
      const _critMult = calcCritMult(w.rarity, '一般');
      const _isWeak = isWeakPointHit();
      const _mz = getPlayerMuzzlePos();
      const _target = getAimTargetPos();
      const _battleRef = battle;
      battle.bullets.push({
        sx: _mz.x, sy: _mz.y, tx: _target.x, ty: 0.95, t: 0,
        player: true, big: true, arc: true, isGrenade: true,
        grenadeId: w.id,
        startTime: performance.now(), duration: 500,
        _onHit: function(){
          let _fragHits = 0, _fragCrits = 0;
          for(let _fi = 0; _fi < _effFrags; _fi++){
            if(Math.random() * 100 < _hitRate){
              let _d = Math.round(_pieceBaseDmg) + rndInt(-2, 2);
              let _isCrit = false;
              if(Math.random() < _critRate){ _d = Math.round(_d * _critMult); _isCrit = true; _fragCrits++; }
              _d = Math.max(1, _d);
              _fragHits++;
              if(_isWeak){
                _battleRef.engaged = true;
                _battleRef.bossHp = Math.max(0, _battleRef.bossHp - _d);
                _battleRef.damageDealt += _d;
                if(isBossType(_battleRef.bossId, 'omega') && _battleRef.arms) damageOmegaArm(_battleRef.aimPart, _d);
                if(_battleRef.bossHp <= 0){ endBattle(true); return; }
              } else {
                applyBossDamage(_d, _isCrit, def.penMM || 0, true);
                if(_battleRef.bossHp <= 0) return;
              }
            }
          }
          if(_fragHits > 0){
            spawnHitFx(_battleRef.bx, _battleRef.by, _fragHits + '片' + (_fragCrits > 0 ? '×' + _fragCrits + '暴' : ''), 'weak');

          }
        }
      });
      addProf(battle.weaponSlot, 0.01);
      if(def.type) addProf(def.type, 0.01);
      refreshBattleControlsLive();
      return true;
    }
    const hitRate = getHitRate(def.type, battle.fireMode) + 10;
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
      if(Math.random() * 100 < hitRate){
        let dmg = baseDmg;
        let isCrit = false;
        if(Math.random() < critRate){ dmg = Math.round(dmg * critMult); isCrit = true; }
        if(isWeak){
          battle.engaged = true;
          battle.bossHp = Math.max(0, battle.bossHp - dmg);
          battle.damageDealt += dmg;
          spawnHitFx(battle.bx, battle.by, '-' + dmg + (isCrit ? '!' : ''), isCrit ? 'crit' : 'weak');
          if(isBossType(battle.bossId, 'omega') && battle.arms) damageOmegaArm(battle.aimPart, dmg);
          if(battle.bossHp <= 0){ endBattle(true); return true; }
        } else {
          applyBossDamage(dmg, isCrit, def.penMM || 0, def.slot === 'throwable');
          if(battle.bossHp <= 0) return true;
        }
      }
    }
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
      try { getHeroImg('icons/items/' + resolveIconId(item.id) + '.png'); } catch(e){}
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
    if(typeof spawnHitFx === 'function'){ spawnHitFx(battle.px, battle.py, '+' + actualHeal, 'heal'); }
    pushLog('<span class="pl">玩家</span> 使用 ' + itemDef(item.id).name + '，恢復 ' + actualHeal + ' 生命。', [], 'combat');
    if(typeof refreshBattleControlsLive === 'function') refreshBattleControlsLive();
  }, 2000);
  if(typeof refreshBattleControlsLive === 'function') refreshBattleControlsLive();
}

function battleLoop(now){
  if(battle && !battle.settling && battle.weapon && battle.weapon.def && battle.weapon.def.cal){
    if(!battle.ammoRef || battle.ammoRef.count <= 0){
      const _rfNext = pickAmmoByPreferenceOrOrder(battle.weapon.def.cal, 'combat');
      if(_rfNext){
        battle.ammoRef = { id: _rfNext.id, rarity: _rfNext.rarity, count: _rfNext.count };
        if(battle.weaponSlot){ battle.weaponStates[battle.weaponSlot] = { ammoInMag: battle.ammoInMag, ammoRef: battle.ammoRef }; }
        refreshBattleControlsLive();
      }
    }
  }

  if(battle && !battle.settling && !battle.reloading && !battle.consuming
     && battle.weapon && battle.weapon.def && battle.weapon.def.cal
     && battle.ammoInMag <= 0
     && battle.ammoRef && battle.ammoRef.count > 0){
    triggerReload();
  }

  if(!battle || !battle.active) return;
  const dt = Math.min(0.05, (now - battle.lastTime) / 1000);
  battle.lastTime = now;
  const moveSpd = 0.35 * dt;

  if(battle.settling){
    updateBattleBossAnim(now);
    renderBattleHeroCanvas();
    renderBossBattleCanvas();
    const anims = BOSS_ANIMS[battle.bossId];
    const anim = anims && anims.death;
    if(anim && battleBossAnim.name === 'death' && battleBossAnim.frame >= anim.frameCount - 1 && !battle._settleScheduled){
      battle._settleScheduled = true;
      setTimeout(finishBattleSettle, 300);
    }
    requestAnimationFrame(battleLoop);
    return;
  }

  battle.firing = !battle.settling && !battle.reloading && !battle.consuming &&
                  ((battle.fireHeld && battle.fireMode === '掃射') || battle.burstLeft > 0);

  const fxEl = document.getElementById('battle-fx');
  if(fxEl){
    const H = fxEl.clientHeight;
    if(H > 0 && battle.lastH !== H){
      battle.lastH = H;
      const bossSprite = document.getElementById('boss-sprite');
      const bossSize = Math.round(H * BATTLE_BOSS_HEIGHT_RATIO);
      const fxElW = fxEl ? fxEl.clientWidth : H;
      const maxHalfW = Math.floor(fxElW * Math.min(battle.bx, 1 - battle.bx) * 0.98);
      const bossWide = Math.max(bossSize, Math.min(Math.round(bossSize * 1.5), maxHalfW * 2));
      if(bossSprite){
        bossSprite.style.width = bossWide + 'px';
        bossSprite.style.height = bossSize + 'px';
      }
      const groundY = BATTLE_GROUND_TOP_RATIO;
      battle.playerCanvasH = H * 0.4519;
      battle.playerCanvasW = H * 0.8423;
      battle.playerSpriteW = H * 0.3370;
      battle.playerSpriteH = H * 0.4519;
      const playerFootPx = battle.playerCanvasH * 0.95;
      battle.py = clamp(groundY - playerFootPx / H, 0, 1);
      {
        const _hc = document.getElementById('hero-battle-canvas');
        if(_hc){ _hc.style.width = battle.playerCanvasW + 'px'; _hc.style.height = battle.playerCanvasH + 'px'; }
        const _hs = document.querySelector('.hero-f .sprite');
        if(_hs){ _hs.style.width = battle.playerSpriteW + 'px'; _hs.style.height = battle.playerSpriteH + 'px'; }
        const _hb = document.querySelector('.hero-f .hpbar-wrap');
        if(_hb){ _hb.style.width = Math.round(battle.playerSpriteW * 0.68) + 'px'; }
      }
      battle.by = clamp(groundY - bossSize / H, 0, 1);
      updateFighterPos();
    }
  }

  const hasMoveInput = (battle.moveDir !== 0);
  if(hasMoveInput && battle.consuming){
    interruptHeal();
  }

  const canMove = !battle.firing && !battle.consuming && !battle.reloading && now >= (battle.shotLockUntil || 0);

  if(canMove && hasMoveInput){
    let newPx = clamp(battle.px + battle.moveDir * moveSpd, 0.05, 0.95);
    if(newPx > battle.bx) newPx = Math.max(0.05, battle.bx);
    battle.px = newPx;
  }

  if(battle._walkFrame === undefined) battle._walkFrame = 0;
  if(battle._walkTick === undefined) battle._walkTick = performance.now();
  {
    const _nowT = performance.now();
    const _movingNow = canMove && hasMoveInput;
    const _walkAnim = GAME_ANIMS.walk;
    const _walkInterval = 1000 / _walkAnim.fps;
    if(_movingNow && (_nowT - battle._walkTick >= _walkInterval)){
      battle._walkTick = _nowT;
      battle._walkFrame = (battle._walkFrame + 1) % _walkAnim.frameCount;
    } else if(!_movingNow){
      battle._walkTick = _nowT;
    }
  }

  {
    let _wantAnim;
    if(battle.consuming){
      _wantAnim = 'heal_melee';
    } else if(battle.reloading){
      _wantAnim = 'reload';
    } else if(battle.firing){
      if(battle.weaponSlot === 'secondary') _wantAnim = 'fire_secondary';
      else if(battle.weaponSlot === 'melee') _wantAnim = 'attack_melee';
      else _wantAnim = 'fire_primary';
    } else if(canMove && hasMoveInput){
      _wantAnim = (Math.abs(battle.moveDir) > 0.66) ? 'run' : 'walk';
    } else if((battleHeroAnim.name === 'switch_secondary' || battleHeroAnim.name === 'switch_melee') && battleHeroAnim.forcedEnd > now){
      _wantAnim = battleHeroAnim.name;
    } else if(battleHeroAnim.name === 'hurt' && battleHeroAnim.forcedEnd > now){
      _wantAnim = 'hurt';
    } else if(battleHeroAnim.name === 'attack_melee' && battleHeroAnim.forcedEnd > now){
      _wantAnim = 'attack_melee';
    } else {
      _wantAnim = 'idle';
    }
    if(battleHeroAnim.name !== _wantAnim){
      const _prevAnim = battleHeroAnim.name;
      const _wasMoving = (_prevAnim === 'walk' || _prevAnim === 'run');
      const _nowStanding = (_wantAnim !== 'walk' && _wantAnim !== 'run');
      if(_wasMoving && _nowStanding){
        battleHeroAnim.legTransitionStart = performance.now();
        battleHeroAnim.legTransitionFrom = battleHeroAnim.frame || 0;
      }
      battleHeroAnim.name = _wantAnim;
      battleHeroAnim.lastUpdate = performance.now();
      if(_wantAnim === 'walk' || _wantAnim === 'run'){
        battleHeroAnim.frame = battle._walkFrame;
      } else {
        battleHeroAnim.frame = 0;
      }
    } else if(_wantAnim === 'walk' || _wantAnim === 'run'){
      battleHeroAnim.frame = battle._walkFrame;
    }
    if(battleHeroAnim.legTransitionStart){
      const _elapsedT = now - battleHeroAnim.legTransitionStart;
      if(_elapsedT < 150){
        const _t = _elapsedT / 150;
        const _wf = battleHeroAnim.legTransitionFrom || 0;
        const _walkAnim = GAME_ANIMS.walk;
        const _wl = _walkAnim.keys;
        battleHeroAnim.legOverride = {
          right_leg: { rot: (_wl.right_leg[_wf] ? _wl.right_leg[_wf].rot : 0) * (1 - _t) },
          left_leg: { rot: (_wl.left_leg[_wf] ? _wl.left_leg[_wf].rot : 0) * (1 - _t) }
        };
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
      const fired = playerShoot();
      if(fired){ if(battle.burstLeft > 0) battle.burstLeft--; }
      else battle.burstLeft = 0;
    }
  }
  if(typeof updateBullets === 'function') updateBullets(dt);
  
  /* [v217] 瞄準點小型爆炸特效渲染 */
  if(battle && battle.aimHitFx && battle.aimHitFx.length){
    const _fxLayer = document.getElementById('battle-fx');
    if(_fxLayer){
      let _ahCvs = document.getElementById('boss-aimhit-canvas');
      if(!_ahCvs){
        _ahCvs = document.createElement('canvas');
        _ahCvs.id = 'boss-aimhit-canvas';
        _ahCvs.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:9;';
        _fxLayer.appendChild(_ahCvs);
      }
      if(_ahCvs.width !== _fxLayer.clientWidth || _ahCvs.height !== _fxLayer.clientHeight){
        _ahCvs.width = _fxLayer.clientWidth;
        _ahCvs.height = _fxLayer.clientHeight;
      }
      const _ahCtx = _ahCvs.getContext('2d');
      _ahCtx.clearRect(0, 0, _ahCvs.width, _ahCvs.height);
      const _ahNow = performance.now();
      const AIM_HIT_DUR = 250;
      for(let _i = battle.aimHitFx.length - 1; _i >= 0; _i--){
        const f = battle.aimHitFx[_i];
        const age = _ahNow - f.startTime;
        if(age >= AIM_HIT_DUR){ battle.aimHitFx.splice(_i, 1); continue; }
        const t = age / AIM_HIT_DUR;
        const fade = 1 - t;
        const cx = f.x * _ahCvs.width;
        const cy = f.y * _ahCvs.height;
        _ahCtx.save();
        // 中心小光斑（前 40% 出現）
        if(t < 0.4){
          const coreR = (f.crit ? 12 : 9) * fade;
          const g = _ahCtx.createRadialGradient(cx, cy, 0, cx, cy, coreR);
          g.addColorStop(0, f.crit ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,220,0.9)');
          g.addColorStop(0.4, f.crit ? 'rgba(255,80,30,0.6)' : 'rgba(255,200,80,0.5)');
          g.addColorStop(1, 'rgba(255,150,50,0)');
          _ahCtx.fillStyle = g;
          _ahCtx.beginPath();
          _ahCtx.arc(cx, cy, coreR, 0, Math.PI * 2);
          _ahCtx.fill();
        }
        // 火花粒子
        if(f.particles){
          _ahCtx.globalAlpha = fade * (f.crit ? 1 : 0.85);
          _ahCtx.fillStyle = f.crit ? '#ff5030' : '#ffd680';
          for(let _pi = 0; _pi < f.particles.length; _pi++){
            const p = f.particles[_pi];
            const px = cx + p.dx * t;
            const py = cy + p.dy * t;
            const pr = p.r * (1 - t * 0.5);
            _ahCtx.beginPath();
            _ahCtx.arc(px, py, pr, 0, Math.PI * 2);
            _ahCtx.fill();
          }
        }
        _ahCtx.restore();
      }
    }
  }

  /* [v211-fix] Boss戰渲染全局煙火 */
  if(window.MuzzleFX) {
    window.MuzzleFX.update(dt);
    const _fxLayer = document.getElementById('battle-fx');
    if(_fxLayer) {
      let _cvs = document.getElementById('boss-fx-canvas');
      if(!_cvs) {
        _cvs = document.createElement('canvas');
        _cvs.id = 'boss-fx-canvas';
        _cvs.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:9;';
        _fxLayer.appendChild(_cvs);
      }
      if(_cvs.width !== _fxLayer.clientWidth || _cvs.height !== _fxLayer.clientHeight) {
        _cvs.width = _fxLayer.clientWidth;
        _cvs.height = _fxLayer.clientHeight;
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
  const heroHp = document.getElementById('hero-hp'), heroAp = document.getElementById('hero-ap'), bossHp = document.getElementById('boss-hp'), bossAp = document.getElementById('boss-ap'), bossShield = document.getElementById('boss-shield');
  if(heroHp) heroHp.style.width = Math.max(0, battle.playerHp / battle.playerMaxHp * 100) + '%';
  if(heroAp) heroAp.style.width = Math.max(0, battle.playerArmor / battle.playerMaxArmor * 100) + '%';
  if(bossHp) bossHp.style.width = Math.max(0, battle.bossHp / battle.bossMaxHp * 100) + '%';
  if(bossAp) bossAp.style.width = Math.max(0, battle.bossArmor / battle.bossMaxArmor * 100) + '%';
  if(bossShield && battle.shieldMaxHp > 0) bossShield.style.width = Math.max(0, battle.shieldHp / battle.shieldMaxHp * 100) + '%';
  requestAnimationFrame(battleLoop);
}

function startBossBattle(bid){
  const b = BOSSES[bid];
  if(!b) return;
  const seals = Math.max(0, parseInt(state.seals[b.seal] || 0, 10));
  if(seals <= 0) return;
  state.seals[b.seal] = seals - 1;
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
  const _hasShield = (_isRT || _isCO);
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
    px: 0.15, py: 0.75, bx: 0.75, by: 0.25,
    moveDir: 0, bullets: [], firing: false, reloading: false, consuming: false,
    lastShot: 0, damageDealt: 0,
    weapon: null, weaponSlot: null, playerWeaponRange: 0.5,
    fireMode: '點射', fireHeld: false, burstLeft: 0,
    ammoRef: null, ammoInMag: 0, weaponStates: {},
    engaged: false, engagedRange: 0.35, startTime: Date.now(),
    aimPart: defaultAimPartForBoss(bid), lastManualClick: 0,
    players: [{ id: 'local', isLocal: true }], lastH: 0, aimHitFx: [],
    healDisabledUntil: 0, healTimer: null,
    autoHealing: false, chainShots: 0, lastShotTime: 0,
    chainResetMs: 600, shotLockUntil: 0
  };

  if(isBossType(bid, 'hydra')) initHydraHeads();
  if(isBossType(bid, 'omega')) initOmegaArms();

  battleHeroAnim.name = 'idle';
  battleHeroAnim.frame = 0;
  battleHeroAnim.lastUpdate = performance.now();
  battleHeroAnim.forcedEnd = 0;

  battleBossAnim.name = 'idle';
  battleBossAnim.frame = 0;
  battleBossAnim.lastUpdate = performance.now();
  battleBossAnim.forcedEnd = 0;

  switchBattleWeapon(startSlot);
  renderCombat();
  battle.lastTime = performance.now();
  requestAnimationFrame(battleLoop);
}



/* [v280] Boss 战 FX 系统（复用 16-combat.js） */
(function(){
  if(window._bossFXReuseInstalled) return;
  window._bossFXReuseInstalled = true;

  function _bossRenderBullets(now){
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

    /* 只绘制手雷，普通子弹保持隐形 */
    for(var i = 0; i < battle.bullets.length; i++){
      var bb = battle.bullets[i];
      if(!bb.isGrenade || bb.isFast) continue;
      var drawT = Math.min(1, bb.t);
      var bx = (bb.sx + (bb.tx - bb.sx) * drawT) * W;
      var by = (bb.sy + (bb.ty - bb.sy) * drawT) * H;
      var _arcT = Math.min(1, bb.t);
      var _arcH = Math.sin(_arcT * Math.PI) * H * 0.35;
      by -= _arcH;
      if(bx < -30 || bx > W + 30 || by < -30 || by > H + 30) continue;
      var _gimg = (bb.grenadeId && typeof getHeroImg === 'function') ? getHeroImg('icons/items/' + bb.grenadeId + '.png') : null;
      var _gsize = 20;
      if(_gimg && _gimg.complete && _gimg.naturalWidth){
        ctx.save();
        ctx.translate(bx, by);
        ctx.rotate(bb.t * Math.PI * 2);
        ctx.drawImage(_gimg, -_gsize/2, -_gsize/2, _gsize, _gsize);
        ctx.restore();
      } else {
        ctx.save();
        ctx.fillStyle = '#ffd680';
        ctx.shadowColor = '#ffb300';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(bx, by, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    /* 复用 16-combat.js 的 FX 渲染 */
    if(typeof _renderBattleFX === 'function'){
      _renderBattleFX(ctx, battle);
    }
  }

  /* 包装 spawnHitFx：命中时生成火花（复用 _spawnHitSpark） */
  var _origSpawnHitFx = window.spawnHitFx;
  if(_origSpawnHitFx && !window._bossHitFxReuseWrapped){
    window._bossHitFxReuseWrapped = true;
    window.spawnHitFx = function(x, y, txt, cls){
      _origSpawnHitFx(x, y, txt, cls);
      if(txt && String(txt).indexOf('-') === 0 && cls !== 'miss' && cls !== 'heal'){
        var fxEl = document.getElementById('battle-fx');
        var W = fxEl ? fxEl.clientWidth : 400;
        var H = fxEl ? fxEl.clientHeight : 500;
        if(typeof _spawnHitSpark === 'function') _spawnHitSpark(battle, x * W, y * H, cls === 'crit');
      }
    };
  }

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


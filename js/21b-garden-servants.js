'use strict';

/* ===== rev-srv-order: 僕人卡片排序唯一比較器 =====
   後院工作中 → 車站配置中 → 等級(遞減) → 稀有度(遞減) → 序號(遞增) */
/* 後院僕人（CRUD / 指派 / 詳情 / 改名 / 地塊負責人 / 確認對話框） */
/* 由 21-garden.js 拆分而來，加載順序 21a → 21b → 21c → 21d → 21e，
 * 21d/21e 依賴 21a/21b/21c；21c 依賴 21a/21b。
 * 跨文件共享符號（GARDEN_TABS / _gardenActiveTab / _gardenTickTimer /
 *   _gardenActors / _gardenActorTimer / _gardenActorCanvasRAF）
 * 以 var = window.xxx = 形式暴露。 */

function _gardenPickServantForPlot(idx, type){
  const all = (state.servants || []).filter(function(s){ return s.type === type; }).sort(function(a, b){
    const aAs = (a.assignedPlots && a.assignedPlots.length > 0) ? 1 : 0;
    const bAs = (b.assignedPlots && b.assignedPlots.length > 0) ? 1 : 0;
    if(aAs !== bAs) return bAs - aAs;
    if((b.lv || 1) !== (a.lv || 1)) return (b.lv || 1) - (a.lv || 1);
    const ra = sortByRarityDesc(a, b);
    if(ra !== 0) return ra;
    return servantLabel(a).localeCompare(servantLabel(b), 'zh-Hant');
  });
  const tDef = SERVANT_TYPES[type] || {name:'僕人'};
  const _targetPlot = _gardenGetPlots()[idx];
  const _isExclusiveList = !!(_targetPlot && (_targetPlot.type === 'compost' || _targetPlot.type === 'distillery'));
  let body = '';
  if(!all.length){
    body = '<div class="empty-hint">沒有可用的' + tDef.name + '</div>';
  } else {
    for(const s of all){
      const maxSlots = servantSlots(s.rarity, s.type);
      const cur = (s.assignedPlots || []).length;
      const isFull = cur >= maxSlots;
      const alreadyHere = (s.assignedPlots || []).indexOf(idx) !== -1;
      const _inStn = _isServantInStation(s.id);
      const _img = 'icons/servants/' + s.type + '.png' + assetSuffix('icons/servants/' + s.type + '.png');
      const dis = alreadyHere || (isFull && !_isExclusiveList);
      const _stnMark = _inStn ? ' 🚂工作中' : '';
      body += '<div class="item-row' + (dis ? ' disabled' : '') + '" data-sid="' + s.id + '"' + (dis ? ' style="opacity:.4"' : '') + '>';
      body += '<div class="icon" style="background:' + rarityBg(s.rarity) + '"><img src="' + _img + '" style="width:100%;height:100%;object-fit:contain"></div>';
      body += '<div class="info"><div class="nm ' + rarityClass(s.rarity) + '">' + servantLabel(s) + _stnMark + '</div>';
      body += '<div class="sub">Lv.' + s.lv + ' · ' + cur + '/' + maxSlots + ' 格' + (alreadyHere ? ' · 已在此地塊' : (isFull ? ' · 已滿' : '')) + '</div></div>';
      body += '</div>';
    }
  }
  const bd = openModal({ title: '指派' + tDef.name + '至 ' + plotCoordName(idx), body: body });
  const rows = bd.querySelectorAll('.item-row[data-sid]');
  for(let i = 0; i < rows.length; i++){
    (function(row){
      row.onclick = function(){
        const sid = row.getAttribute('data-sid');
        const srv = (state.servants || []).find(function(s){ return s.id === sid; });
        if(!srv) return;
        const _proceedAssign = function(){
          const plots = _gardenGetPlots();
          const targetPlot = plots[idx];
          if(!targetPlot) return;
          const isExclusiveTarget = (targetPlot.type === 'compost' || targetPlot.type === 'distillery');
          const _targetLabel = targetPlot.type === 'distillery' ? '蒸餾室' : '堆肥區';
          const otherList = (srv.assignedPlots || []).filter(function(x){ return x !== idx; });
          const hasExclusiveAlready = otherList.some(function(x){ return plots[x] && (plots[x].type === 'compost' || plots[x].type === 'distillery'); });
          function doAssign(){
            const maxSlots = servantSlots(srv.rarity, srv.type);
            if((srv.assignedPlots || []).length >= maxSlots){
              const _noUse = true;
            }
            for(const o of (state.servants || [])){
              if(o.id === sid) continue;
              if(!Array.isArray(o.assignedPlots)) continue;
              o.assignedPlots = o.assignedPlots.filter(function(x){ return x !== idx; });
            }
            if(isExclusiveTarget){
              srv.assignedPlots = [idx];
            } else {
              for(var _oi2 = 0; _oi2 < otherList.length; _oi2++){
              var _oldIdx2 = otherList[_oi2];
              if(_oldIdx2 !== idx && plots[_oldIdx2] && (plots[_oldIdx2].type === 'compost' || plots[_oldIdx2].type === 'distillery') && plots[_oldIdx2].assignedServant === sid){
                delete plots[_oldIdx2].assignedServant;
              }
            }
            srv.assignedPlots = otherList.filter(function(x){ return plots[x] && plots[x].type !== 'compost' && plots[x].type !== 'distillery'; });
              if(srv.assignedPlots.indexOf(idx) === -1) srv.assignedPlots.push(idx);
            }
            if(plots[idx]) plots[idx].assignedServant = sid;
            save();
            closeModal();
            renderGardenGrid();
            if(typeof _gardenSyncActors === 'function') _gardenSyncActors();
            if(typeof _refreshServantListNow === 'function') _refreshServantListNow();
            setTimeout(function(){ if(typeof onGardenPlotClick === 'function') onGardenPlotClick(idx); }, 100);
          }
          if(isExclusiveTarget && otherList.length > 0){
            openConfirm('指派至' + _targetLabel + '將解除此農民的其他 ' + otherList.length + ' 個地塊綁定。確認？', doAssign);
            return;
          }
          if(!isExclusiveTarget && hasExclusiveAlready){
            openConfirm('此農民已在蒸餾室/堆肥區，指派至其他地塊將解除綁定。確認？', doAssign);
            return;
          }
          doAssign();
        };
        const _inStn = _isServantInStation(sid);
        if(_inStn){
          const ft = document.createElement('div');
          ft.className = 'modal-ft';
          ft.innerHTML = '<button class="btn primary" id="gr-ok">確認</button>';
          openModal({
            title: '轉移至後院',
            body: '<div style="font-size:12px;line-height:1.6;color:#ddd">此僕人正在車站服役，是否轉至後院？將從車站移除。</div>',
            footer: ft,
            onClose: function(){
              closeModal();
              setTimeout(function(){ _gardenPickServantForPlot(idx, type); }, 50);
            }
          });
          ft.querySelector('#gr-ok').onclick = function(){
            _removeFromStation(sid);
            closeModal();
            _proceedAssign();
          };
        } else {
          _proceedAssign();
        }
      };
    })(rows[i]);
  }
}


function _isServantWorking(s){
  return !!(s && s.assignedPlots && s.assignedPlots.length > 0);
}


function renderGardenServants(box){
  if(!box) return;
  const servants = (state.servants || []).slice().sort(_srvSortCmp);
  if(!servants.length){
    box.innerHTML = '<div class="gs-cols"><div class="gs-col" style="border-left:none"><div class="gs-wrap"><div class="gs-empty" style="position:static;padding:40px 0">尚未擁有僕人</div></div></div></div>';
    return;
  }
  function _draw(){
    const cellSize = _gardenComputeCellSize(box, 1);
    const cellStyle = 'width:' + cellSize + 'px;height:' + cellSize + 'px;min-width:' + cellSize + 'px;min-height:' + cellSize + 'px;flex:0 0 auto;';
    const rows = [];
    for(let r = 0; r * 4 < servants.length; r++){
      let rowHtml = '<div class="gs-row">';
      for(let j = 0; j < 4; j++){
        const idx = r * 4 + j;
        if(idx < servants.length){
          const s = servants[idx];
          const tDef = SERVANT_TYPES[s.type] || {name:'?'};
          const _img = 'icons/servants/' + s.type + '.png' + assetSuffix('icons/servants/' + s.type + '.png');
          const _star = (_srvBadge(s) !== '') ? '<div class="srv-star">' + _srvBadge(s) + '</div>' : '';
          const _label = servantLabel(s);
          const _labelEsc = _servantEscHtml(_label);
          /* rev-fix-servant-tab-injured: 重伤守卫卡片加 cant-go */
          const _srvInjured = !!(s.injuredUntil && s.injuredUntil > Date.now());
          rowHtml += '<div class="gs-cell filled srv' + (_srvInjured ? ' cant-go' : '') + '" data-srv-id="' + s.id + '" style="background:' + rarityBg(s.rarity) + ';' + cellStyle + '">' +
            '<img class="srv-portrait" src="' + _img + '" alt="">' +
            _star +
            '<div class="srv-tag">' + _labelEsc + '</div>' +
            '<div class="gs-cell-cnt srv-cnt">Lv.' + s.lv + ' ' + tDef.name + '</div>' +
            '</div>';
        } else {
          rowHtml += '<div class="gs-cell placeholder" style="' + cellStyle + '"></div>';
        }
      }
      rowHtml += '</div>';
      rows.push(rowHtml);
    }
    let html = '<div class="gs-cols"><div class="gs-col" style="border-left:none">';
    html += '<div class="gs-wrap">' + rows.join('') + '</div>';
    html += '</div></div>';
    const prev = (typeof window._gsScrollServants === 'number') ? window._gsScrollServants : 0;
    box.innerHTML = html;
    const _w = box.querySelector('.gs-wrap');
    if(_w){
      _w.scrollTop = prev;
      _w.onscroll = function(){ window._gsScrollServants = _w.scrollTop; };
    }
    const cells = box.querySelectorAll('.gs-cell[data-srv-id]');
    for(let i = 0; i < cells.length; i++){
      (function(el){
        el.onclick = function(){
 openServantDetail(el.getAttribute('data-srv-id')); };
      })(cells[i]);
    }
  }
  let _tries = 0;
  function _retry(){
    if(!box.isConnected) return;
    if(box.clientWidth < 40){
      _tries++;
      if(_tries > 60) return;
      requestAnimationFrame(_retry);
      return;
    }
    _draw();
  }
  _retry();
}

/* ===== 指派僕人（20 格勾選式） ===== */

function openServantAssign(srvId, returnFn){
  const srv = (state.servants || []).find(function(s){ return s.id === srvId; });
  if(!srv) return;
  const def = SERVANT_TYPES[srv.type];
  if(!def) return;
  const maxSlots = servantSlots(srv.rarity, srv.type);
  const plots = _gardenGetPlots();
  const selected = {};
  for(const i of (srv.assignedPlots || [])) selected[i] = true;
  function countSel(){ let n = 0; for(const k in selected) if(selected[k]) n++; return n; }
  function renderGridHtml(){
    let html = '<div class="srv-sa-info">已選 <span id="srv-sel-cnt">' + countSel() + '</span> / ' + maxSlots + ' 格</div>';
    html += '<div class="srv-sa-grid">';
    for(let i = 0; i < 20; i++){
      const plot = plots[i];
      let cls = 'srv-sa-cell';
      let inner = '';
      let disabled = false;
      if(!plot || !plot.type){
        cls += ' empty'; inner = '<div class="srv-sa-icon">＋</div>'; disabled = true;
      } else if(srv.type === 'farmer' ? !(plot.type === 'compost' || plot.type === 'distillery' || _isSoilType(plot.type)) : (plot.type !== def.targetPlot)){
        cls += ' mismatch';
        inner = '<div class="srv-sa-icon">' + _getPlotTypeIconHtml(plot.type, 22, false, true) + '</div>'; disabled = true;
      } else {
        const owner = plot.assignedServant;
        if(selected[i]) cls += ' selected';
        if(owner && owner !== srvId) cls += ' occupied';
        inner = '<div class="srv-sa-icon">' + _getPlotTypeIconHtml(plot.type, 22, false, true) + '</div>';
        if(owner && owner !== srvId){
          const otherSrv = (state.servants || []).find(function(s){ return s.id === owner; });
          if(otherSrv){
            inner += '<div class="srv-sa-owner">' + servantLabel(otherSrv) + '</div>';
          }
        }
      }
      html += '<div class="' + cls + '" data-idx="' + i + '"' + (disabled ? ' data-disabled="1"' : '') + '>' + inner + '</div>';
    }
    html += '</div>';
    return html;
  }
  function applyAndSave(){
    const newList = [];
    for(const k in selected) if(selected[k]) newList.push(parseInt(k, 10));
    const _plots = _gardenGetPlots();
    const _exclusiveIdxs = newList.filter(function(x){ return _plots[x] && (_plots[x].type === 'compost' || _plots[x].type === 'distillery'); });
    let _finalList = newList;
    if(_exclusiveIdxs.length > 1){
      _finalList = [_exclusiveIdxs[_exclusiveIdxs.length - 1]];
    } else if(_exclusiveIdxs.length === 1){
      _finalList = [_exclusiveIdxs[0]];
    }
    for(const other of (state.servants || [])){
      if(other.id === srvId) continue;
      if(!Array.isArray(other.assignedPlots)) continue;
      other.assignedPlots = other.assignedPlots.filter(function(x){ return _finalList.indexOf(x) === -1; });
    }
    const oldList = srv.assignedPlots || [];
    for(const oldIdx of oldList){
      if(_finalList.indexOf(oldIdx) === -1){
        const p2 = plots[oldIdx];
        if(p2 && p2.assignedServant === srvId) delete p2.assignedServant;
      }
    }
    for(const newIdx of _finalList){
      if(plots[newIdx]) plots[newIdx].assignedServant = srvId;
    }
    srv.assignedPlots = _finalList;
    save();
    renderGardenGrid();
    if(typeof _refreshServantListNow === 'function') _refreshServantListNow();
  }
  const ft = document.createElement('div');
  ft.className = 'modal-ft';
  ft.innerHTML = '';
  const bd = openModal({
    title: '指派 ' + def.name,
    body: renderGridHtml(),
    footer: ft,
    onClose: function(){ openServantDetail(srvId, returnFn); }
  });
  function bindCells(){
    const cells = bd.querySelectorAll('.srv-sa-cell');
    for(let i = 0; i < cells.length; i++){
      (function(el){
        el.onclick = function(){
          if(el.getAttribute('data-disabled') === '1') return;
          const idx = parseInt(el.getAttribute('data-idx'), 10);
          const plot = plots[idx];
          if(!plot) return;
          if(selected[idx]){ delete selected[idx]; applyAndSave(); refresh(); return; }
          if(countSel() >= maxSlots){ return; }
          const _isExclusive = function(p){ return p && (p.type === 'compost' || p.type === 'distillery'); };
          const _wouldBeExclusive = _isExclusive(plot);
          const owner = plot.assignedServant;
          const _ownerConflict = (owner && owner !== srvId);
          if(_wouldBeExclusive){
            const _doAddExclusive = function(){
              for(const _k in selected) delete selected[_k];
              selected[idx] = true;
              applyAndSave(); refresh();
            };
            if(_ownerConflict){
              openConfirm('此格已被其他僕人指派，是否取代？', _doAddExclusive);
              return;
            }
            _doAddExclusive();
            return;
          }
          let _hasExclusiveSelected = false;
          for(const _k in selected){
            if(!selected[_k]) continue;
            const _p = plots[parseInt(_k, 10)];
            if(_isExclusive(_p)){ _hasExclusiveSelected = true; break; }
          }
          const _doAddNormal = function(){ selected[idx] = true; applyAndSave(); refresh(); };
          if(_hasExclusiveSelected){
            openConfirm('指派至普通地塊將解除蒸餾室/堆肥區綁定。確認？', function(){
              for(const _k in selected){
                const _p = plots[parseInt(_k, 10)];
                if(_isExclusive(_p)) delete selected[_k];
              }
              _doAddNormal();
            });
            return;
          }
          if(_ownerConflict){
            openConfirm('此格已被其他僕人指派，是否取代？', _doAddNormal);
            return;
          }
          _doAddNormal();
        };
      })(cells[i]);
    }
  }
  function refresh(){
    bd.innerHTML = renderGridHtml();
    bindCells();
  }
  bindCells();
}

/* ===== 實時刷新僕人列表（當前在僕人 tab 時） ===== */

function _refreshServantListNow(){
  try {
    const p = document.getElementById('garden-page');
    if(!p) return;
    if(typeof _gardenActiveTab === 'undefined' || _gardenActiveTab !== 'servant') return;
    const box = p.querySelector('#gp-content');
    if(!box) return;
    if(typeof renderGardenServants === 'function') renderGardenServants(box);
  } catch(e){ console.warn('[refresh servants] err', e); }
}


function openConfirm(msg, onOk, onCancel){
  const el = document.createElement('div');
  el.className = 'confirm-layer';
  el.innerHTML = '<div class="confirm-box"><div class="confirm-msg">' + msg + '</div><div class="confirm-btns"><button class="btn danger" id="cf-ok">取代</button><button class="btn ghost" id="cf-cancel">取消</button></div></div>';
  document.body.appendChild(el);
  el.querySelector('#cf-ok').onclick = function(){ el.remove(); if(onOk) onOk(); };
  el.querySelector('#cf-cancel').onclick = function(){ el.remove(); if(onCancel) onCancel(); };
}

/* ===== 僕人任務系統（體力 + 叫醒 + 演員循環） ===== */

function servantLabel(srv){
  if(!srv) return '?';
  if(srv.customName) return srv.customName;
  return '#' + (srv.tag || '?');
}


function _truncateServantName(s){
  if(!s) return '';
  let n = 0;
  let out = '';
  for(const c of s){
    const w = c.codePointAt(0) > 0x7F ? 2 : 1;
    if(n + w > 8) break;
    out += c;
    n += w;
  }
  return out;
}


function _servantEscHtml(s){
  if (s == null) return '';
  return String(s).replace(/[&<>"']/g, function(c){
    return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
  });
}


function openServantRename(srvId, returnFn){
  const srv = (state.servants || []).find(function(s){ return s.id === srvId; });
  if(!srv) return;
  const cur = srv.customName || '';
  const ft = document.createElement('div');
  ft.className = 'modal-ft';
  ft.innerHTML = '<button class="btn primary" id="rn-ok">確定</button><button class="btn" id="rn-clear">清除</button><button class="btn ghost" id="rn-cancel">取消</button>';
  const _escaped = _servantEscHtml(cur);
  let body = '<div style="font-size:11px;color:#7a6f60;margin-bottom:6px">留空則使用編號（#' + (srv.tag || '?') + '）</div>';
  body += '<input id="rn-input" type="text" value="' + _escaped + '" style="width:100%;background:#151210;color:#ddd;border:1px solid #2a231c;border-radius:4px;padding:8px;font-size:13px;font-family:inherit;box-sizing:border-box">';
  const bd = openModal({ title: '改名', body: body, footer: ft, onClose: function(){ openServantDetail(srvId, returnFn); } });
  const inp = bd.querySelector('#rn-input');
  if(inp){
    setTimeout(function(){ inp.focus(); inp.select(); }, 100);
    inp.oninput = function(){
      const t = _truncateServantName(inp.value);
      if(t !== inp.value) inp.value = t;
    };
  }
  ft.querySelector('#rn-ok').onclick = function(){
    const v = (inp.value || '').trim();
    srv.customName = _truncateServantName(v);
    save();
    if(typeof _refreshServantListNow === 'function') _refreshServantListNow();
    closeModal();
    openServantDetail(srvId, returnFn);
  };
  ft.querySelector('#rn-clear').onclick = function(){
    srv.customName = '';
    save();
    if(typeof _refreshServantListNow === 'function') _refreshServantListNow();
    closeModal();
    openServantDetail(srvId, returnFn);
  };
  ft.querySelector('#rn-cancel').onclick = closeModal;
}/* ===== gp-srv-ui: 僕人 UI 共用（純函式；樣式於字串產生時決定，無執行期改樣式） ===== */
var GP_GOLD = 'background:#8a5f18;border-color:#e8a33d;color:#fff3d6';
var GP_RED = 'background:#7d2b20;border-color:#c0392b;color:#ffd9d2';
var GP_GREEN = 'background:#2f7a3c;border-color:#4ade80;color:#eafff0';
var GP_GREY = 'background:#241d16;border-color:#4a3a26;color:#a89a85';

/* ===== gp-ui-core: 僕人 UI 唯一真相源（純函式；樣式於字串產生時決定，無執行期改樣式） ===== */
var GP_MINI = 'height:24px;padding:0 8px;font-size:10px;line-height:1;border-radius:5px;flex:0 0 auto;display:inline-flex;align-items:center;justify-content:center;font-weight:bold';
var GP_GOLD = 'background:#8a5f18;border-color:#e8a33d;color:#fff3d6';
var GP_RED = 'background:#7d2b20;border-color:#c0392b;color:#ffd9d2';
var GP_GREEN = 'background:#2f7a3c;border-color:#4ade80;color:#eafff0';
var GP_GREY = 'background:#241d16;border-color:#4a3a26;color:#a89a85';

function _gpEsc(t){
return String(t == null ? '' : t).replace(/[&<>"]/g, function(c){
if(c === '&') return '&amp;';
if(c === '<') return '&lt;';
if(c === '>') return '&gt;';
return '&quot;';
});
}
function _gpNum(n){
if(typeof _stFmtNum === 'function') return _stFmtNum(n);
var v = Math.round(Math.abs(n || 0));
var s = (n < 0) ? '-' : '';
if(v < 10000) return s + v;
if(v < 1000000) return s + Math.round(v / 1000) + 'K';
return s + (v / 1000000).toFixed(1) + 'M';
}
function _gpSlots(srv){
if(!srv) return 1;
if(typeof servantSlots === 'function') return servantSlots(srv.rarity, srv.type);
return 1;
}
function _gpMaxPlots(srv){ return _gpSlots(srv); }
function _gpOrderRank(s){
if(!s) return 3;
if(s.assignedPlots && s.assignedPlots.length) return 0;
if(typeof _isServantInStation === 'function' && _isServantInStation(s.id)) return 1;
return 2;
}
function _srvOrderRank(s){ return _gpOrderRank(s); }
function _gpSrvCmp(a, b){
var A = (a && a.srv) ? a.srv : a;
var B = (b && b.srv) ? b.srv : b;
if(!A || !B) return 0;
var ra = _gpOrderRank(A), rb = _gpOrderRank(B);
if(ra !== rb) return ra - rb;
var la = A.lv || 1, lb = B.lv || 1;
if(la !== lb) return lb - la;
var RO = (typeof RARITY_ORDER !== 'undefined') ? RARITY_ORDER : ['破舊','一般','庫存','精品','傳奇','具名'];
var ia = RO.indexOf(A.rarity), ib = RO.indexOf(B.rarity);
if(ia !== ib) return ib - ia;
return (A.tag || 0) - (B.tag || 0);
}
function _srvSortCmp(a, b){ return _gpSrvCmp(a, b); }
function _gpStats(srv){
var mh = (typeof servantMaxHp === 'function') ? servantMaxHp(srv) : 100;
var hp = (typeof srv.hp === 'number') ? srv.hp : mh;
if(srv.injuredUntil && srv.injuredUntil > Date.now()) hp = 0;
hp = Math.max(0, Math.min(mh, hp));
var ms = (typeof servantEffectiveMaxStamina === 'function') ? servantEffectiveMaxStamina(srv) : 100;
var st = Math.max(0, Math.min(ms, srv.stamina || 0));
var lv = srv.lv || 1;
var cap = (typeof SERVANT_MAX_LV === 'number') ? SERVANT_MAX_LV : 50;
var need = (lv >= cap) ? 1 : ((typeof servantExpNeed === 'function') ? servantExpNeed(lv) : 100);
var ex = (lv >= cap) ? need : Math.max(0, Math.min(need, srv.exp || 0));
return { mh:mh, hp:hp, ms:ms, st:st, lv:lv, cap:cap, need:need, ex:ex };
}
function _gpFood(srv){
var pol = srv.foodPolicy || 'normal';
var base = (typeof FOOD_COST_BASE !== 'undefined' && FOOD_COST_BASE[pol] != null) ? FOOD_COST_BASE[pol] : 0;
var mult = (typeof RARITY_FOOD_MULT !== 'undefined' && RARITY_FOOD_MULT[srv.rarity] != null) ? RARITY_FOOD_MULT[srv.rarity] : 1;
return Math.round(base * mult * 10) / 10;
}
function _gpBar(c, m, col){
var p = Math.max(0, Math.min(100, Math.round(c / Math.max(1, m) * 100)));
return '<div style="min-width:0;height:8px;border-radius:4px;background:#4a1212;border:1px solid #2a1a14;overflow:hidden">'
+ '<div style="height:100%;width:' + p + '%;background:' + col + '"></div></div>';
}
/* grid 四欄：標籤 34 / 條 1fr / 數值 72 / 動作 46。三列欄寬一致 → 三條等長且定長，
   短按鈕固定在動作欄，绝不壓縮條寬。compact 版（地塊卡片）省略動作欄。 */
function _gpRow(lbl, c, m, col, act){
/* rev-row-geom: 固定高度 grid —— 標籤 34 / 條 1fr / 數值 72 / 動作 46。
   三列同高同距；條長不隨數字位數或按鈕有無而變動。 */
var _p = Math.max(0, Math.min(100, Math.round(c / Math.max(1, m) * 100)));
var _f = function(v){
if(typeof _stFmtNum === 'function') return _stFmtNum(v);
return String(Math.round(v || 0));
};
return '<div class="gp-vrow">'
+ '<span class="gp-vlbl">' + lbl + '</span>'
+ '<div class="gp-vbar"><i style="width:' + _p + '%;background:' + col + '"></i></div>'
+ '<span class="gp-vnum">' + _f(c) + '/' + _f(m) + '</span>'
+ '<span class="gp-vact">' + (act || '') + '</span>'
+ '</div>';
}
function _gpMini(label, attr, color){
return '<button class="btn" ' + attr + ' style="' + GP_MINI + ';' + color + '">' + label + '</button>';
}
function _gpKV(k, v, color){
return '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin:3px 0;padding:6px 9px;background:#1a1510;border:1px solid #2a231c;border-radius:5px">'
+ '<span style="font-size:10px;color:#8a7c68">' + k + '</span>'
+ '<b style="font:800 11px/1 Menlo,Consolas,monospace;color:' + color + '">' + v + '</b></div>';
}
function _gpHeal(srv){
if(!srv) return false;
var mh = (typeof servantMaxHp === 'function') ? servantMaxHp(srv) : 100;
var cur = (typeof srv.hp === 'number') ? srv.hp : mh;
if(srv.injuredUntil && srv.injuredUntil > Date.now()) cur = 0;
if(cur >= mh) return false;
var ok = false;
if(typeof _stHealServantByValue === 'function'){
var r = _stHealServantByValue(srv, mh);
ok = !!(r && r.used && r.used.length);
}
if(ok){
if(typeof srv.hp !== 'number') srv.hp = mh;
if(srv.hp >= mh){ delete srv.injuredUntil; delete srv.injuredAt; srv._injuredDown = false; srv._injuredAnimStart = null; }
if(typeof save === 'function') save();
}
return ok;
}
function _gpRefresh(){
if(typeof save === 'function') save();
var fns = ['renderGardenGrid','renderGardenContent','_refreshServantListNow','_gardenSyncActors','_gardenUpdateFoodInfo'];
for(var i = 0; i < fns.length; i++){
try{ if(typeof window[fns[i]] === 'function') window[fns[i]](); }catch(e){}
}
}
function _gpReopenPlot(idx){
var ps = (typeof _gardenGetPlots === 'function') ? _gardenGetPlots() : [];
var p = ps[idx];
if(!p){ if(typeof renderGardenGrid === 'function') renderGardenGrid(); return; }
if(p.type === 'tower' && typeof _gardenTowerOpen === 'function'){ _gardenTowerOpen(idx); return; }
if(p.type === 'compost' && typeof openCompostDetail === 'function'){ openCompostDetail(idx); return; }
if(p.type === 'distillery' && typeof openDistilleryDetail === 'function'){ openDistilleryDetail(idx); return; }
if(typeof onGardenPlotClick === 'function'){ onGardenPlotClick(idx); return; }
if(typeof renderGardenGrid === 'function') renderGardenGrid();
}
/* 詳情主體：頭像列（改名貼名字 / 解僱靠右）→ 等級經驗 → 體力 → 生命(短治療鈕)
   → 已指派 a/b（不列地塊）→ 食物消耗 → 等級效果 → 自動種植｜食物策略（各一個標題）。 */
function _gpDetailBody(srv){
var v = _gpStats(srv);
var n = (srv.assignedPlots || []).length, mx = _gpSlots(srv);
var ip = 'icons/servants/' + srv.type + '.png';
var sf = (typeof assetSuffix === 'function') ? assetSuffix(ip) : '';
var rc = (typeof rarityClass === 'function') ? rarityClass(srv.rarity) : '';
var rb = (typeof rarityBg === 'function') ? rarityBg(srv.rarity) : '#241d16';
var h = '<div data-gp-ui="detail" style="display:flex;align-items:flex-start;gap:9px;padding:2px 0 8px">'
+ '<div style="flex:0 0 52px;width:52px;height:52px;border-radius:8px;overflow:hidden;background:' + rb + ';display:flex;align-items:center;justify-content:center">'
+ '<img src="' + ip + sf + '" style="width:100%;height:100%;object-fit:contain" alt=""></div>'
+ '<div style="flex:1;min-width:0">'
+ '<div style="display:flex;align-items:center;gap:6px;min-width:0">'
+ '<span class="' + rc + '" style="font-size:14px;font-weight:bold;line-height:1.25;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + _gpEsc(servantLabel(srv)) + '</span>'
+ _gpMini('改名', 'data-gp-ren="1"', GP_GREY)
+ '</div>';
var tal = (typeof getServantTalents === 'function') ? getServantTalents(srv) : [];
if(tal && tal.length){
h += '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:5px">';
for(var t = 0; t < tal.length; t++){
var td = (typeof TALENT_DEFS !== 'undefined') ? TALENT_DEFS[tal[t]] : null;
h += '<span style="font-size:9px;padding:3px 6px;background:#2a1f10;border:1px solid #8a5f18;border-radius:3px;color:#ffd680">' + _gpEsc((td && td.name) || tal[t]) + '</span>';
}
h += '</div>';
}
h += '</div>' + _gpMini('解僱', 'data-gp-fire="1"', GP_RED) + '</div>';
h += _gpRow('Lv.' + v.lv, v.ex, v.need, '#f0c040', '');
h += _gpRow('體力', v.st, v.ms, '#3aa0ff', '');
h += _gpRow('生命', v.hp, v.mh, '#4ade80', _gpMini('治療', 'data-gp-heal="1"', GP_GREEN));
if(srv.injuredUntil && srv.injuredUntil > Date.now()){
h += '<div style="color:#e05252;font-size:11px;font-weight:bold;padding:3px 0">重傷 · 剩 ' + Math.ceil((srv.injuredUntil - Date.now()) / 60000) + ' 分鐘</div>';
}
h += _gpKV('已指派', n + '/' + mx, '#e8a33d');
h += _gpKV('食物消耗', _gpFood(srv) + ' /h', '#7ee07e');
var eff = (typeof servantLevelEffectText === 'function') ? servantLevelEffectText(srv) : '';
if(eff && eff !== '—') h += _gpKV('等級效果', _gpEsc(eff), '#e8a33d');
var sel = 'width:100%;background:#151210;color:#ddd;border:1px solid #3a2f25;border-radius:5px;padding:6px;font-size:11px;font-family:inherit;box-sizing:border-box';
h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:8px 0 2px">';
h += '<div style="min-width:0"><div style="font-size:10px;color:#e8a33d;font-weight:bold;margin-bottom:4px">自動種植</div>';
if(srv.type === 'farmer'){
var ap = srv.autoPlant || 'off';
var APN = { off:'關閉', follow:'跟隨上次', any:'高稀有度優先' };
h += '<select data-gp-f="autoPlant" style="' + sel + '">';
for(var k1 in APN){ h += '<option value="' + k1 + '"' + (ap === k1 ? ' selected' : '') + '>' + APN[k1] + '</option>'; }
h += '</select>';
} else {
h += '<div style="padding:6px;background:#151210;border:1px solid #2a231c;border-radius:5px;font-size:11px;color:#a89a85">' + (srv.type === 'guard' ? '哨塔執勤' : '工棚管理') + '</div>';
}
h += '</div>';
h += '<div style="min-width:0"><div style="font-size:10px;color:#e8a33d;font-weight:bold;margin-bottom:4px">食物策略</div>';
var fp = srv.foodPolicy || 'normal';
var FPN = _gpFoodPolicyNames('');
h += '<select data-gp-f="foodPolicy" style="' + sel + '">';
for(var k2 in FPN){ h += '<option value="' + k2 + '"' + (fp === k2 ? ' selected' : '') + '>' + FPN[k2] + '</option>'; }
h += '</select></div></div>';
return h;
}
function _gardenPlotOwnersHtml(idx, type){
var all = (typeof state !== 'undefined' && state.servants) ? state.servants : [];
var ow = all.filter(function(s){ return (s.assignedPlots || []).indexOf(idx) >= 0; });
var h = '<div data-gp-own="' + idx + '" data-gp-type="' + _gpEsc(type || '') + '" style="margin:8px 0 4px">';
h += '<div style="font-size:11px;color:#e8a33d;font-weight:bold;margin-bottom:5px">責任僕人</div>';
if(!ow.length){
h += '<div style="font-size:11px;color:#7a6f60;padding:9px;background:#151210;border:1px dashed #3a2f25;border-radius:6px;text-align:center">未指派</div>';
} else {
for(var i = 0; i < ow.length; i++){
var s = ow[i], v = _gpStats(s);
var ip = 'icons/servants/' + s.type + '.png';
var sf = (typeof assetSuffix === 'function') ? assetSuffix(ip) : '';
h += '<div data-gp-srv="' + _gpEsc(s.id) + '" style="display:flex;gap:9px;padding:8px;background:#1a1510;border:1px solid #3a2f25;border-radius:6px;margin-bottom:6px;cursor:pointer;align-items:flex-start">'
+ '<div style="flex:0 0 34px;width:34px;height:34px;border-radius:5px;overflow:hidden;background:' + rarityBg(s.rarity) + ';display:flex;align-items:center;justify-content:center">'
+ '<img src="' + ip + sf + '" style="width:100%;height:100%;object-fit:contain" alt=""></div>'
+ '<div style="flex:1;min-width:0">'
+ '<div class="' + rarityClass(s.rarity) + '" style="font-size:12px;font-weight:bold;margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + _gpEsc(servantLabel(s)) + '</div>'
+ _gpRow('經驗', v.ex, v.need, '#f0c040', '', true)
+ _gpRow('體力', v.st, v.ms, '#3aa0ff', '', true)
+ _gpRow('生命', v.hp, v.mh, '#4ade80', '', true)
+ '</div></div>';
}
}
h += '<div style="display:flex;gap:6px;margin-top:6px">';
h += '<button class="btn" data-gp-act="swap" style="flex:1;' + GP_GOLD + '">' + (ow.length ? '更換' : '指派') + '</button>';
if(ow.length){
h += '<button class="btn" data-gp-act="remove" style="flex:1;' + GP_RED + '">移除</button>';
h += '<button class="btn" data-gp-act="heal" style="flex:1;' + GP_GREEN + '">治療</button>';
}
h += '</div></div>';
return h;
}

/* ===== gp-ui-flow: 綁定 / 地塊選人 / 詳情（呼叫原版指派與改名） ===== */
function _gardenPlotOwnersBind(bd){
if(!bd || !bd.querySelectorAll) return;
var wraps = bd.querySelectorAll('[data-gp-own]');
for(var i = 0; i < wraps.length; i++){
(function(w){
if(w.__gpBound) return;
w.__gpBound = true;
var idx = parseInt(w.getAttribute('data-gp-own'), 10);
var type = w.getAttribute('data-gp-type') || '';
function owners(){
var all = (typeof state !== 'undefined' && state.servants) ? state.servants : [];
return all.filter(function(s){ return (s.assignedPlots || []).indexOf(idx) >= 0; });
}
w.addEventListener('click', function(e){
var t = e.target;
if(!t || !t.closest) return;
var act = t.closest('[data-gp-act]');
if(act && w.contains(act)){
e.preventDefault(); e.stopPropagation();
var a = act.getAttribute('data-gp-act'), ow = owners(), k;
if(a === 'swap'){ _gpPlotPick(idx, type); return; }
if(a === 'remove'){
var ps = (typeof _gardenGetPlots === 'function') ? _gardenGetPlots() : [];
for(k = 0; k < ow.length; k++){
ow[k].assignedPlots = (ow[k].assignedPlots || []).filter(function(x){ return x !== idx; });
if(!ow[k].assignedPlots.length) ow[k].resting = false;
}
if(ps[idx] && ps[idx].assignedServant) delete ps[idx].assignedServant;
_gpRefresh(); closeModal(); _gpReopenPlot(idx); return;
}
if(a === 'heal'){
var did = 0;
for(k = 0; k < ow.length; k++){ if(_gpHeal(ow[k])) did++; }
_gpRefresh();
if(!did && typeof notify === 'function') notify('沒有需要治療或醫療品不足', 'warn');
closeModal(); _gpReopenPlot(idx); return;
}
return;
}
var card = t.closest('[data-gp-srv]');
if(card && w.contains(card)){
e.preventDefault(); e.stopPropagation();
var sid = (card.getAttribute('data-gp-srv') || '').trim();
closeModal();
openServantDetail(sid, function(){ _gpReopenPlot(idx); });
}
});
})(wraps[i]);
}
}
function _gpPlotPick(idx, type){
var ps = (typeof _gardenGetPlots === 'function') ? _gardenGetPlots() : [];
var p = ps[idx];
if(!p) return;
var need = type || (p.type === 'tower' ? 'guard' : (p.type === 'shed' ? 'foreman' : 'farmer'));
var all = (typeof state !== 'undefined' && state.servants) ? state.servants : [];
var curIds = all.filter(function(s){ return (s.assignedPlots || []).indexOf(idx) >= 0; }).map(function(s){ return s.id; });
var list = all.filter(function(s){ return s.type === need && curIds.indexOf(s.id) < 0; }).slice().sort(_gpSrvCmp);
var h = '<div style="font-size:11px;color:#7a6f60;margin-bottom:8px;line-height:1.5">更換 <b style="color:#e8a33d">'
+ _gpEsc(plotCoordName(idx)) + '</b> 的僕人 · 右側為已綁定地塊 / 上限；已滿仍可選，選中後確認改綁。</div>';
if(!list.length) h += '<div class="empty-hint">沒有其他可用的僕人</div>';
for(var i = 0; i < list.length; i++){
var s = list[i], n = (s.assignedPlots || []).length, mx = _gpSlots(s);
var ip = 'icons/servants/' + s.type + '.png';
var sf = (typeof assetSuffix === 'function') ? assetSuffix(ip) : '';
var mark = '';
if(typeof _isServantInStation === 'function' && _isServantInStation(s.id)) mark = ' <span style="color:#39d7e6;font-size:9px">🚂車站中</span>';
else if(n) mark = ' <span style="color:#b6f24a;font-size:9px">🌱工作中</span>';
h += '<div class="item-row" data-gp-pick="' + _gpEsc(s.id) + '">'
+ '<div class="icon" style="background:' + rarityBg(s.rarity) + '"><img src="' + ip + sf + '" style="width:100%;height:100%;object-fit:contain" alt=""></div>'
+ '<div class="info"><div class="nm ' + rarityClass(s.rarity) + '">' + _gpEsc(servantLabel(s)) + mark + '</div>'
+ '<div class="sub">Lv.' + (s.lv || 1) + '</div></div>'
+ '<div class="cnt" style="color:' + (n >= mx ? '#e8a33d' : '#a89a85') + '">' + n + '/' + mx + '</div></div>';
}
var bd = openModal({ title:'更換僕人 · ' + plotCoordName(idx), body:h, onClose:function(){ closeModal(); _gpReopenPlot(idx); } });
var rows = bd.querySelectorAll('[data-gp-pick]');
for(var k = 0; k < rows.length; k++){
(function(el){
el.onclick = function(){
var sid = (el.getAttribute('data-gp-pick') || '').trim();
var srv = null;
for(var q = 0; q < all.length; q++){ if(all[q].id === sid){ srv = all[q]; break; } }
if(!srv) return;
function bindNow(){
var others = all.filter(function(s){ return s.id !== srv.id && (s.assignedPlots || []).indexOf(idx) >= 0; });
for(var q2 = 0; q2 < others.length; q2++){
others[q2].assignedPlots = (others[q2].assignedPlots || []).filter(function(x){ return x !== idx; });
if(!others[q2].assignedPlots.length) others[q2].resting = false;
}
srv.assignedPlots = srv.assignedPlots || [];
if(srv.assignedPlots.indexOf(idx) < 0) srv.assignedPlots.push(idx);
srv.resting = false;
if(ps[idx]) ps[idx].assignedServant = srv.id;
_gpRefresh(); closeModal(); _gpReopenPlot(idx);
}
function afterStation(){
if((srv.assignedPlots || []).length >= _gpSlots(srv)){
var here = (srv.assignedPlots || []).map(function(x){ return plotCoordName(x); }).join('、');
var ft = document.createElement('div');
ft.className = 'modal-ft';
ft.innerHTML = '<button class="btn" id="gp-rb-ok" style="flex:1;' + GP_GOLD + '">更換綁定</button>'
+ '<button class="btn" id="gp-rb-no" style="flex:1;' + GP_GREY + '">取消</button>';
openModal({ title:'更換綁定',
body:'<div style="font-size:12px;line-height:1.7;color:#ddd"><b class="' + rarityClass(srv.rarity) + '">' + _gpEsc(servantLabel(srv))
+ '</b> 已綁定 ' + _gpEsc(here) + '。<br>是否將綁定更換為 <b style="color:#e8a33d">' + _gpEsc(plotCoordName(idx)) + '</b>？原綁定將被解除。</div>',
footer:ft, onClose:function(){ closeModal(); _gpPlotPick(idx, type); } });
ft.querySelector('#gp-rb-ok').onclick = function(){ srv.assignedPlots = [idx]; bindNow(); };
ft.querySelector('#gp-rb-no').onclick = function(){ closeModal(); _gpPlotPick(idx, type); };
return;
}
bindNow();
}
if(typeof _isServantInStation === 'function' && _isServantInStation(srv.id)){
if(typeof _openRelocateConfirm === 'function'){
_openRelocateConfirm('後院', function(){
if(typeof _removeFromStation === 'function') _removeFromStation(srv.id);
afterStation();
}, function(){ setTimeout(function(){ _gpPlotPick(idx, type); }, 40); });
return;
}
if(typeof openConfirm === 'function'){
openConfirm('此僕人正在車站服役，轉至後院將從車站移除。確認？', function(){
if(typeof _removeFromStation === 'function') _removeFromStation(srv.id);
afterStation();
}, function(){ _gpPlotPick(idx, type); });
return;
}
}
afterStation();
};
})(rows[k]);
}
}
function openServantDetail(a, b){
var list = (typeof state !== 'undefined' && state.servants) ? state.servants : [];
var srv = null;
if(a && typeof a === 'object' && a.id) srv = a;
else if(typeof a === 'string'){
var key = a.trim();
for(var i = 0; i < list.length; i++){ if(list[i].id === key){ srv = list[i]; break; } }
} else if(typeof a === 'number') srv = list[a] || null;
if(!srv){ if(typeof closeModal === 'function') closeModal(); return; }
var ret = (typeof b === 'function') ? b : null;
var sid = srv.id;
function back(){
if(typeof closeModal === 'function') closeModal();
if(ret) ret();
else {
if(typeof renderGardenGrid === 'function') renderGardenGrid();
if(typeof renderGardenContent === 'function') renderGardenContent();
}
}
var ft = document.createElement('div');
ft.className = 'modal-ft';
ft.innerHTML = '<button class="btn" id="gp-sd-asg" style="flex:1;' + GP_GOLD + '">指派</button>'
+ '<button class="btn" id="gp-sd-rec" style="flex:1;' + GP_RED + '">撤回</button>';
var bd = openModal({ title:'僕人詳情', body:_gpDetailBody(srv), footer:ft, onClose:back });
function rerender(){ bd.innerHTML = _gpDetailBody(srv); bindBody(); }
function bindBody(){
var hb = bd.querySelector('[data-gp-heal]');
if(hb) hb.onclick = function(){
if(_gpHeal(srv)){ _gpRefresh(); rerender(); }
else if(typeof notify === 'function') notify('已滿血或沒有醫療品', 'warn');
};
var rb = bd.querySelector('[data-gp-ren]');
if(rb) rb.onclick = function(){ closeModal(); openServantRename(sid, ret); };
var fb = bd.querySelector('[data-gp-fire]');
if(fb) fb.onclick = function(){
openConfirm('確定解僱 ' + servantLabel(srv) + '？將同時退出所有地塊與車站配置。', function(){
if(typeof _removeFromStation === 'function') _removeFromStation(sid);
var ps = (typeof _gardenGetPlots === 'function') ? _gardenGetPlots() : [];
var old = srv.assignedPlots || [];
for(var j = 0; j < old.length; j++){ if(ps[old[j]] && ps[old[j]].assignedServant === sid) delete ps[old[j]].assignedServant; }
state.servants = (state.servants || []).filter(function(s){ return s.id !== sid; });
_gpRefresh(); back();
});
};
var sels = bd.querySelectorAll('[data-gp-f]');
for(var i = 0; i < sels.length; i++){
(function(sel){
sel.onchange = function(){ srv[sel.getAttribute('data-gp-f')] = sel.value; _gpRefresh(); };
})(sels[i]);
}
}
bindBody();
ft.querySelector('#gp-sd-asg').onclick = function(){ closeModal(); openServantAssign(sid, ret); };
ft.querySelector('#gp-sd-rec').onclick = function(){
var ps = (typeof _gardenGetPlots === 'function') ? _gardenGetPlots() : [];
var old = srv.assignedPlots || [];
for(var i = 0; i < old.length; i++){ if(ps[old[i]] && ps[old[i]].assignedServant === sid) delete ps[old[i]].assignedServant; }
srv.assignedPlots = []; srv.resting = false;
_gpRefresh(); rerender();
};
}

/* ===== gp-two-fix helpers: 食物策略標籤（FOOD_POLICY_MULT 唯一真相源）+ 種子裝備槽 ===== */
function _gpFoodPolicyNames(prefix, starveText){
var NM = { full:'吃到撐', normal:'吃飽', half:'半飽', lick:'舔舔', starve:'餓著' };
var M = (typeof FOOD_POLICY_MULT !== 'undefined' && FOOD_POLICY_MULT) ? FOOD_POLICY_MULT : {};
var out = {};
for(var k in NM){
if(k === 'starve' && starveText){ out[k] = starveText; continue; }
out[k] = NM[k] + '（' + (prefix || '') + Math.round((M[k] || 0) * 100) + '%）';
}
return out;
}
/* ===== gp-two-fix helpers:end ===== */

'use strict';

/* 後院僕人（CRUD / 指派 / 詳情 / 改名 / 地塊負責人 / 確認對話框） */
/* 由 21-garden.js 拆分而來，加載順序 21a → 21b → 21c → 21d → 21e，
 * 21d/21e 依賴 21a/21b/21c；21c 依賴 21a/21b。
 * 跨文件共享符號（GARDEN_TABS / _gardenActiveTab / _gardenTickTimer /
 *   _gardenActors / _gardenActorTimer / _gardenActorCanvasRAF）
 * 以 var = window.xxx = 形式暴露。 */

function _gardenPlotOwnersHtml(idx, type){
  _gardenEnsureStyles();
  const servants = (state.servants || []).filter(function(s){
    return s.type === type && s.assignedPlots && s.assignedPlots.indexOf(idx) !== -1;
  });
  const labelMap = { farmer: '責任農民', foreman: '責任監工', guard: '駐守守衛' };
  const label = labelMap[type] || '責任人';
  const emptyLabelMap = { farmer: '指派農民', foreman: '指派監工', guard: '指派守衛' };
  const emptyLabel = emptyLabelMap[type] || '指派';
  let html = '<div style="font-size:11px;color:#e8a33d;font-weight:bold;margin:8px 0 4px">' + label + '</div>';
  if(!servants.length){
    html += '<div class="owner-empty" data-assign-idx="' + idx + '" data-assign-type="' + type + '">＋ ' + emptyLabel + '</div>';
    return html;
  }
  for(const s of servants){
    const _img = 'icons/servants/' + s.type + '.png' + assetSuffix('icons/servants/' + s.type + '.png');
    const effMax = servantEffectiveMaxStamina(s);
    const stam = Math.max(0, s.stamina || 0);
    const pct = effMax > 0 ? Math.round((stam / effMax) * 100) : 0;
    const color = pct <= 0 ? '#e05252' : (pct <= 30 ? '#e8741e' : (pct <= 70 ? '#e8a33d' : '#4caf50'));
    const tDef = SERVANT_TYPES[s.type] || {name:''};
    html += '<div class="owner-row">';
    /* rev-fix-guard-card-injured: 守衛重傷時加 cant-go */
    const _isInjured = !!(s.injuredUntil && s.injuredUntil > Date.now());
    html += '<div class="tower-guard-btn' + (_isInjured ? ' cant-go' : '') + '" data-srv-id="' + s.id + '" data-plot-idx="' + idx + '" style="background:' + rarityBg(s.rarity) + '">';
    html += '<img class="tg-icon" src="' + _img + '" alt="">';
    html += '<div class="tg-name">' + servantLabel(s) + '</div>';
    html += '</div>';
    html += '<div class="owner-info">';
    html += '<div class="owner-line"><span class="' + rarityClass(s.rarity) + '">Lv.' + s.lv + ' ' + tDef.name + '</span></div>';
    html += '<div class="owner-stam-bar"><div class="owner-stam-fill" style="width:' + pct + '%;background:' + color + '"></div></div>';
    html += '<div class="owner-stam-text" style="color:' + color + '">體力 ' + stam + ' / ' + effMax + '</div>';
    /* rev-fix-guard-hp-bar-v5: 只对守卫显示 HP 条 */
    if(type === 'guard'){
      const _maxHp2 = (typeof servantMaxHp === 'function') ? servantMaxHp(s) : (s.hp || 100);
      const _curHp2 = _isInjured ? 0 : _maxHp2;
      const _hpPct2 = _isInjured ? 0 : 100;
      const _hpCol2 = _isInjured ? '#e05252' : '#4caf50';
      html += '<div class="owner-stam-bar" style="margin-top:2px"><div class="owner-stam-fill" style="width:' + _hpPct2 + '%;background:' + _hpCol2 + '"></div></div>';
      html += '<div class="owner-stam-text" style="color:' + _hpCol2 + '">' + (_isInjured ? '<span style="color:#e8a33d;font-weight:bold">治療</span> · ' : '') + 'HP ' + _curHp2 + '/' + _maxHp2 + '</div>';
    }
    html += '</div>';
    html += '</div>';
  }
  return html;
}


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


function _gardenPlotOwnersBind(bd){
  /* rev-fix-guard-heal-v4: 重伤守卫整个 owner-info 可点 */
  const _ownerInfos = bd.querySelectorAll('.owner-info');
  for(let _hi = 0; _hi < _ownerInfos.length; _hi++){
    (function(_oi){
      const _row = _oi.closest('.owner-row');
      if(!_row) return;
      const _btn = _row.querySelector('.tower-guard-btn[data-srv-id]');
      if(!_btn) return;
      const _sid = _btn.getAttribute('data-srv-id');
      const _plotIdx = parseInt(_btn.getAttribute('data-plot-idx'), 10);
      const _srv = (state.servants || []).find(function(s){ return s.id === _sid; });
      if(!_srv) return;
      const _isInjuredNow = !!(_srv.injuredUntil && _srv.injuredUntil > Date.now());
      if(!_isInjuredNow) return;
      _oi.style.cursor = 'pointer';
      _oi.onclick = function(e){
        if(e && e.stopPropagation) e.stopPropagation();
        if(typeof _stConsumeLowestMed !== 'function') return;
        const _med = _stConsumeLowestMed();
        if(!_med){
          if(typeof notify === 'function') notify('沒有醫療品', 'warn');
          return;
        }
        _srv.injuredUntil = 0;
        _srv._injuredDown = false;
        _srv.hp = (typeof servantMaxHp === 'function') ? servantMaxHp(_srv) : (_srv.hp || 100);
        if(_srv._injuredAnimStart) _srv._injuredAnimStart = null;
        save();
        if(typeof _refreshServantListNow === 'function') _refreshServantListNow();
        renderGardenGrid();
        closeModal();
        if(isFinite(_plotIdx) && _plotIdx >= 0){
          setTimeout(function(){ _gardenTowerOpen(_plotIdx); }, 50);
        }
      };
    })(_ownerInfos[_hi]);
  }
  const btns = bd.querySelectorAll('.tower-guard-btn[data-srv-id]');
  for(let i = 0; i < btns.length; i++){
    (function(el){
      el.onclick = function(){
        const sid = el.getAttribute('data-srv-id');
        const _pIdx = parseInt(el.getAttribute('data-plot-idx'), 10);
        closeModal();
        const _returnFn = (isFinite(_pIdx) && _pIdx >= 0) ? function(){ onGardenPlotClick(_pIdx); } : null;
        setTimeout(function(){ openServantDetail(sid, _returnFn); }, 200);
      };
    })(btns[i]);
  }
  const emptyBtns = bd.querySelectorAll('.owner-empty[data-assign-idx]');
  for(let i = 0; i < emptyBtns.length; i++){
    (function(el){
      el.onclick = function(){
        const idx = parseInt(el.getAttribute('data-assign-idx'), 10);
        const type = el.getAttribute('data-assign-type');
        closeModal();
        setTimeout(function(){ _gardenPickServantForPlot(idx, type); }, 100);
      };
    })(emptyBtns[i]);
  }
}


function _isServantWorking(s){
  return !!(s && s.assignedPlots && s.assignedPlots.length > 0);
}


function renderGardenServants(box){
  if(!box) return;
  const servants = (state.servants || []).slice().sort(function(a, b){
    const wa = _isServantWorking(a) ? 1 : 0;
    const wb = _isServantWorking(b) ? 1 : 0;
    if(wb !== wa) return wb - wa;
    if(b.lv !== a.lv) return b.lv - a.lv;
    const ra = sortByRarityDesc(a, b);
    if(ra !== 0) return ra;
    const typeOrder = ['farmer', 'guard', 'foreman'];
    return typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type);
  });
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
          const _star = _isServantWorking(s) ? '<div class="srv-star">★</div>' : '';
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
        el.onclick = function(){ openServantDetail(el.getAttribute('data-srv-id')); };
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


function openServantDetail(srvId, returnFn){
  const srv = (state.servants || []).find(function(s){ return s.id === srvId; });
  if(!srv) return;
  const def = SERVANT_TYPES[srv.type] || {name:'?', icon:'?', desc:''};
  const slots = servantSlots(srv.rarity, srv.type);
  const plots = (srv.assignedPlots || []);
  const maxStam = servantEffectiveMaxStamina(srv);
  const stam = Math.max(0, srv.stamina || 0);
  const stamPct = maxStam > 0 ? Math.round((stam / maxStam) * 100) : 0;
  const stamColor = stamPct <= 0 ? '#e05252' : (stamPct <= 30 ? '#e8741e' : (stamPct <= 70 ? '#e8a33d' : '#4caf50'));
  const ft = document.createElement('div');
  ft.className = 'modal-ft';
  let ftHtml = '';

  ftHtml += '<button class="btn primary" id="srv-assign">指派</button>';
  if((srv.assignedPlots||[]).length > 0) ftHtml += '<button class="btn" id="srv-withdraw">撤回</button>';
  ftHtml += '';
  ft.innerHTML = ftHtml;
  let body = '';
  body += '<div style="font-size:15px;color:#e8a33d;font-weight:bold;display:flex;align-items:center;gap:8px">';
  body += '<span style="display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:5px;background:' + rarityBg(srv.rarity) + ';flex:0 0 auto"><img style="width:28px;height:28px;object-fit:contain" src="icons/servants/' + srv.type + '.png' + assetSuffix('icons/servants/' + srv.type + '.png') + '" alt=""></span>';
  body += '<span class="' + rarityClass(srv.rarity) + '">' + _servantEscHtml(servantLabel(srv)) + '</span>';
  body += '<span class="srv-rename-btn" style="font-size:11px;color:#e8a33d;cursor:pointer;padding:4px 10px;border:1px solid #3a2f25;border-radius:4px;margin-left:6px">改名</span>';
{
  const _fcP = srv.foodPolicy || 'normal';
  const _fcB = (typeof FOOD_COST_BASE !== 'undefined' ? FOOD_COST_BASE[_fcP] : 0) || 0;
  const _fcM = (typeof RARITY_FOOD_MULT !== 'undefined' ? RARITY_FOOD_MULT[srv.rarity] : 1) || 1;
  const _fcC = Math.round(_fcB * _fcM * 10) / 10;
  body += '<span class="srv-food-rate" style="font-size:11px;color:#e05252;font-weight:bold">🍲 -' + _fcC + '/hr</span>';
}
body += '<button class="btn danger" id="srv-dismiss" style="margin-left:auto;padding:4px 12px;font-size:11px;flex:0 0 auto">解僱</button>';

  body += '</div>';
  /* rev-fix-servant-hp-bar-v6: HP 条在体力条下面 */
  const _isInjuredDetail = !!(srv.injuredUntil && srv.injuredUntil > Date.now());
  body += '<div class="detail-sub">' + srv.rarity + ' · Lv.' + srv.lv + ' · ' + def.name + (srv.resting ? ' · <span style="color:#7a6f60">休息中</span>' : (srv.stamina <= 0 ? ' · <span style="color:#e05252">偷懶中</span>' : '')) + '</div>';
  body += '<div class="stat-line"><span class="k">當前效果</span><span class="v" style="color:#4caf50;font-weight:bold">' + servantLevelEffectText(srv) + '</span></div>';
  body += '<div style="margin:8px 0 4px">';
  body += '<div style="font-size:10px;color:#7a6f60;margin-bottom:3px;display:flex;justify-content:space-between"><span>體力</span><span>' + stam + ' / ' + maxStam + '（' + stamPct + '%）</span></div>';
  body += '<div style="height:6px;background:#1a1510;border-radius:3px;overflow:hidden;border:1px solid #2a231c"><div style="height:100%;width:' + stamPct + '%;background:' + stamColor + '"></div></div>';
  body += '</div>';
  const _maxHpV = (typeof servantMaxHp === 'function') ? servantMaxHp(srv) : (srv.hp || 100);
  let _curHpV = (srv.hp !== undefined && srv.hp !== null) ? srv.hp : _maxHpV;
  if(_isInjuredDetail) _curHpV = 0;
  const _hpPctV = _maxHpV > 0 ? Math.round(_curHpV / _maxHpV * 100) : 0;
  const _hpColV = _isInjuredDetail ? '#e05252' : (_curHpV < _maxHpV ? '#e8a33d' : '#4caf50');
  body += '<div style="margin:8px 0 4px"' + (_isInjuredDetail ? ' class="srv-detail-heal" data-heal="1" style="cursor:pointer;margin:8px 0 4px"' : '') + '>';
  body += '<div style="font-size:10px;color:' + (_isInjuredDetail ? '#e05252' : '#7a6f60') + ';margin-bottom:3px;display:flex;justify-content:space-between"><span>HP</span><span>' + _curHpV + ' / ' + _maxHpV + '（' + _hpPctV + '%）' + (_isInjuredDetail ? ' · <span style="color:#e8a33d;font-weight:bold">治療</span>' : '') + '</span></div>';
  body += '<div style="height:6px;background:#1a1510;border-radius:3px;overflow:hidden;border:1px solid #2a231c"><div style="height:100%;width:' + _hpPctV + '%;background:' + _hpColV + '"></div></div>';
  body += '</div>';
  /* rev-fix-servant-detail-dedup: 删除重复的当前效果 + 体力条 */
  if(srv.lv < SERVANT_MAX_LV){
    const _need = servantExpNeed(srv.lv);
    const _cur = srv.exp || 0;
    const _pct = Math.min(100, Math.round((_cur / _need) * 100));
    body += '<div style="margin:6px 0 4px">';
    body += '<div style="font-size:10px;color:#7a6f60;margin-bottom:3px;display:flex;justify-content:space-between"><span>經驗</span><span>' + _cur + ' / ' + _need + '（' + _pct + '%）</span></div>';
    body += '<div style="height:5px;background:#1a1510;border-radius:3px;overflow:hidden;border:1px solid #2a231c"><div style="height:100%;width:' + _pct + '%;background:linear-gradient(90deg,#4caf50,#7ee07e)"></div></div>';
    body += '</div>';
  } else {
    body += '<div style="font-size:10px;color:#4caf50;margin:6px 0 4px;text-align:center;font-weight:bold">✦ 已滿級 Lv.' + SERVANT_MAX_LV + '</div>';
  }
  body += '<div class="stat-line"><span class="k">已指派</span><span class="v">' + plots.length + ' / ' + slots + '</span></div>';
  if(plots.length){
    body += '<div class="stat-line"><span class="k">地塊</span><span class="v">' + plots.map(function(i){ return plotCoordName(i); }).join('、') + '</span></div>';
  }
  if(srv.type === 'farmer'){
    body += '<div class="divider"></div>';
    body += '<div style="font-size:11px;color:#e8a33d;font-weight:bold;margin-bottom:6px">🌱 自動種植</div>';
    body += '<select id="srv-auto-plant" style="width:100%;background:#151210;color:#ddd;border:1px solid #2a231c;border-radius:4px;padding:6px;font-size:11px">';
    body += '<option value="off">關閉</option>';
    body += '<option value="any">高價值</option>';
    body += '<option value="follow">重複</option>';
    body += '</select>';
  }
  body += '<div class="divider"></div>';
  body += '<div style="font-size:11px;color:#e8a33d;font-weight:bold;margin-bottom:6px">🍲 食物策略</div>';
  body += '<select id="srv-food-policy" style="width:100%;background:#151210;color:#ddd;border:1px solid #2a231c;border-radius:4px;padding:6px;font-size:11px">';
  body += '<option value="full">吃到撐（120%）</option>';
  body += '<option value="normal">吃飽（70%）</option>';
  body += '<option value="half">半飽（50%）</option>';
  body += '<option value="lick">舔舔（30%）</option>';
  body += '<option value="starve">餓著（0%）</option>';
  body += '</select>';
  body += '<div style="font-size:9px;color:#5a5040;margin-top:4px;line-height:1.5">需與商人訂閱食物生產線後生效</div>';
  const _detailOnClose = (typeof returnFn === 'function') ? returnFn : closeModal;
  const bd = openModal({ title: '僕人詳情', body: body, footer: ft, onClose: _detailOnClose });
  /* rev-fix-servant-heal-v3: 点击整个 HP 条区域治疗 */
  const _healArea = bd.querySelector('.srv-detail-heal[data-heal]');
  if(_healArea) _healArea.onclick = function(){
    if(typeof _stConsumeLowestMed !== 'function') return;
    const _med = _stConsumeLowestMed();
    if(!_med){
      if(typeof notify === 'function') notify('沒有醫療品', 'warn');
      return;
    }
    srv.injuredUntil = 0;
    srv._injuredDown = false;
    srv.hp = _maxHpV;
    if(srv._injuredAnimStart) srv._injuredAnimStart = null;
    save();
    closeModal();
    if(typeof _refreshServantListNow === 'function') _refreshServantListNow();
    renderGardenGrid();
    openServantDetail(srvId, returnFn);
  };
  const _wdBtn = ft.querySelector('#srv-withdraw');
  if(_wdBtn) _wdBtn.onclick = function(){
    const _list = srv.assignedPlots || [];
    const _plots = _gardenGetPlots();
    for(const _idx of _list){
      const _p2 = _plots[_idx];
      if(_p2 && _p2.assignedServant === srv.id) delete _p2.assignedServant;
    }
    srv.assignedPlots = [];
    save();
    closeModal();
    _gardenLog('<span class="r-' + srv.rarity + '">' + servantLabel(srv) + '</span> 已撤回', 'clean');
    renderGardenGrid();
    if(typeof _gardenSyncActors === 'function') _gardenSyncActors();
    if(typeof _refreshServantListNow === 'function') _refreshServantListNow();
  };
  const _dsBtn = bd.querySelector('#srv-dismiss');
  if(_dsBtn) _dsBtn.onclick = function(){
    openConfirm('確定解僱 ' + (SERVANT_TYPES[srv.type]||{}).name + '？', function(){
      const _list = srv.assignedPlots || [];
      const _plots = _gardenGetPlots();
      for(const _idx of _list){
        const _p2 = _plots[_idx];
        if(_p2 && _p2.assignedServant === srv.id) delete _p2.assignedServant;
      }
      state.servants = (state.servants || []).filter(function(s){ return s.id !== srv.id; });
      const _rw = { '破舊':{s:[0,1],m:[1,2]}, '一般':{s:[1,1],m:[2,3]}, '庫存':{s:[1,2],m:[3,4]}, '精品':{s:[2,3],m:[4,6]}, '傳奇':{s:[3,5],m:[6,10]} };
      const _r = _rw[srv.rarity] || _rw['一般'];
      const _sn = Object.keys(SEEDS);
      const _mn = ['wood','metal','screws','cloth','gears','electronics'];
      const _parts = [];
      const _sc = rndInt(_r.s[0], _r.s[1]);
      for(let _i = 0; _i < _sc; _i++){ const _sid = pick(_sn); gardenStorageAdd(_sid, srv.rarity, 1); _parts.push('🌰' + (SEEDS[_sid]?SEEDS[_sid].name:_sid)); }
      const _mc = rndInt(_r.m[0], _r.m[1]);
      for(let _i = 0; _i < _mc; _i++){ const _mid = pick(_mn); invAdd(_mid, '一般', 1); _parts.push((MATERIAL_EMOJI[_mid]||'') + (MATERIALS[_mid]?MATERIALS[_mid].name:_mid)); }
      save();
      closeModal();
      _gardenLog('解僱 <span class="r-' + srv.rarity + '">' + servantLabel(srv) + '</span>', 'leave');
      renderGardenGrid();
      if(typeof _refreshServantListNow === 'function') _refreshServantListNow();
    });
  };
  const _rnBtn = bd.querySelector('.srv-rename-btn');
  if(_rnBtn) _rnBtn.onclick = function(){ closeModal(); openServantRename(srvId, returnFn); };
  ft.querySelector('#srv-assign').onclick = function(){ closeModal(); openServantAssign(srvId, returnFn); };
  const apSel = bd.querySelector('#srv-auto-plant');
  if(apSel){
    apSel.value = srv.autoPlant || 'off';
    apSel.onchange = function(){
      srv.autoPlant = apSel.value;
      save();
    };
  }
  const fpSel = bd.querySelector('#srv-food-policy');
  if(fpSel){
    fpSel.value = srv.foodPolicy || 'normal';
    fpSel.onchange = function(){
      srv.foodPolicy = fpSel.value;
      const _eff = servantEffectiveMaxStamina(srv);
      if((srv.stamina || 0) > _eff) srv.stamina = _eff;
      save();
      const _rateEl = bd.querySelector('.srv-food-rate');
      if(_rateEl){
        const _fcB = (typeof FOOD_COST_BASE !== 'undefined' ? FOOD_COST_BASE[srv.foodPolicy] : 0) || 0;
        const _fcM = (typeof RARITY_FOOD_MULT !== 'undefined' ? RARITY_FOOD_MULT[srv.rarity] : 1) || 1;
        const _fcC = Math.round(_fcB * _fcM * 10) / 10;
        _rateEl.textContent = '🍲 -' + _fcC + '/hr';
        _rateEl.style.color = '#e05252';
        _rateEl.style.fontWeight = 'bold';
      }
    };
  }
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
}

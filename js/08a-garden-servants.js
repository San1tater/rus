/* ===== rev255: 五修合一 ===== */
(function(){
  if(window._rev255Installed) return;
  window._rev255Installed = true;

  /* ── ① 收獲 ── */
  window.gardenHarvest = function(idx){
    try {
      const plots = _gardenGetPlots();
      const plot = plots[idx];
      if(!plot || !plot.crop){ return; }
      const c = plot.crop;
      const seed = SEEDS[c.seedId];
      if(!seed){ return; }
      const now = Date.now();
      if(now < c.matureAt){ return; }
      const rottenAt = c.matureAt + seed.rotMs;
      if(now >= rottenAt){ return; }
      const baseYield = seed.baseYield;
      const mult = RARITY_MULT[c.rarity] || 1;
      const expected = baseYield * mult;
      const jitter = 0.8 + Math.random() * 0.4;
      let count = Math.max(1, Math.round(expected * jitter));
      if(plot.fertilized && now < (plot.fertExpireAt || 0)){ count = Math.round(count * 1.3); }
      plot.fertilized = false;
      plot.fertExpireAt = 0;
      const cropDef = CROPS[seed.cropId];
      gardenStorageAdd(seed.cropId, c.rarity, count);
      plot.crop = null;
      _gardenLog('<span class="pl">玩家</span> 收穫 ' + fmtItemSpan(seed.cropId, c.rarity, count), 'harvest');
      save();
      closeModal();
      
      
      renderGardenGrid();
      renderGardenContent();
    } catch(err){
      /* silent */
    }
  };

  /* ── ②③ 指派立即生效 + 僕人列表立即重排 ── */
  window._refreshServantListNow = function(){
    try {
      const p = document.getElementById('garden-page');
      if(!p) return;
      if(typeof _gardenActiveTab === 'undefined' || _gardenActiveTab !== 'servant') return;
      const box = p.querySelector('#gp-content');
      if(!box) return;
      if(typeof renderGardenServants === 'function') renderGardenServants(box);
    } catch(e){ console.warn('[refresh servants] err', e); }
  };

  window.openServantAssign = function(srvId, returnFn){
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
          const t = GARDEN_PLOT_TYPES[plot.type] || {icon:'?'};
          inner = '<div class="srv-sa-icon">' + _getPlotTypeIconHtml(plot.type, 22, false, true) + '</div>'; disabled = true;
        } else {
          const t = GARDEN_PLOT_TYPES[plot.type];
          const owner = plot.assignedServant;
          if(selected[i]) cls += ' selected';
          if(owner && owner !== srvId) cls += ' occupied';
          inner = '<div class="srv-sa-icon">' + _getPlotTypeIconHtml(plot.type, 22, false, true) + '</div>';
          if(owner && owner !== srvId){
            const otherSrv = (state.servants || []).find(function(s){ return s.id === owner; });
            if(otherSrv){
              const oDef = SERVANT_TYPES[otherSrv.type] || {};
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
      const _hasCompost = newList.some(function(x){ return _plots[x] && _plots[x].type === 'compost'; });
      const _hasOther = newList.some(function(x){ return _plots[x] && _plots[x].type !== 'compost'; });
      const _exclusiveIdxs = newList.filter(function(x){ return _plots[x] && (_plots[x].type === 'compost' || _plots[x].type === 'distillery'); });
      let _finalList = newList;
      if(_exclusiveIdxs.length > 1){
        const _keep = _exclusiveIdxs[_exclusiveIdxs.length - 1];
        _finalList = [_keep];
        console.warn('[servant assign] multiple exclusive plots detected, kept', _keep);
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
    const bd = openModal({ title: '指派 ' + def.name, body: renderGridHtml(), footer: ft, onClose: function(){ openServantDetail(srvId, returnFn); } });
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
  };

  /* ── ④ 产線進度實時刷新 ── */
  window._startMerchantLiveTimer = function(){
    if(window._merchantLiveTimer) return;
    window._merchantLiveTimer = setInterval(function(){
      if(typeof _gardenActiveTab === 'undefined' || _gardenActiveTab !== 'merchant') return;
      const p = document.getElementById('garden-page');
      if(!p || !p.classList.contains('on')) return;
      if(typeof _gardenMerchantRefreshUI === 'function') _gardenMerchantRefreshUI();
    }, 1000);
  };
  window._startMerchantLiveTimer();

  
})();
/* ===== end rev255 ===== */


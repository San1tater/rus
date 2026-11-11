'use strict';

/* 後院日誌（渲染 / 日誌詳情 / 戰鬥詳情 / 離線詳情） */
/* 由 21-garden.js 拆分而來，加載順序 21a → 21b → 21c → 21d → 21e，
 * 21d/21e 依賴 21a/21b/21c；21c 依賴 21a/21b。
 * 跨文件共享符號（GARDEN_TABS / _gardenActiveTab / _gardenTickTimer /
 *   _gardenActors / _gardenActorTimer / _gardenActorCanvasRAF）
 * 以 var = window.xxx = 形式暴露。 */

function _logCat(key, title, count, collapsed){
  return '<div class="cat-header" data-gcat="' + key + '" style="cursor:pointer"><span>' + title + ' (' + count + ')</span><span>' + (collapsed ? '▶' : '▼') + '</span></div>';
}

function _logItem(id, rarity, count, isFood){
  const def = isFood ? { name: '食物' } : (itemDef(id) || { name: id });
  const icon = isFood ? '🍲' : itemIcon(id, 30);
  const clickable = !isFood;
  const attrs = clickable ? (' data-iid="' + id + '" data-irar="' + rarity + '"') : '';
  const cursor = clickable ? '' : ' style="cursor:default"';
  return '<div class="item-row"' + attrs + cursor + '><div class="icon" style="background:' + rarityBg(rarity) + '">' + icon + '</div><div class="info"><div class="nm ' + rarityClass(rarity) + '">' + def.name + '</div><div class="sub">' + rarity + '</div></div><div class="cnt">×' + count + '</div></div>';
}

function _bindGardenLogItems(bd, entry){
  const _hds = bd.querySelectorAll('.cat-header[data-gcat]');
  for(let _i = 0; _i < _hds.length; _i++){
    (function(h){
      h.onclick = function(){
        const _kk = h.getAttribute('data-gcat');
        window._collapseStates['gl.'+_kk] = !window._collapseStates['gl.'+_kk];
        closeModal(); _openGardenLogDetail(entry);
      };
    })(_hds[_i]);
  }
  const _rows = bd.querySelectorAll('.item-row[data-iid]');
  for(let _i = 0; _i < _rows.length; _i++){
    (function(row){
      row.onclick = function(){
        const iid = row.getAttribute('data-iid');
        const irar = row.getAttribute('data-irar');
        closeModal();
        openItemDetail(iid, irar, function(){ _openGardenLogDetail(entry); });
      };
    })(_rows[_i]);
  }
}


function _openGardenLogDetail(entry){
  if(!entry || !entry.detail) return;
  const d = entry.detail;
  if(d.type === 'merchant_batch'){ _openMerchantBatchDetail(entry); return; }
  if(d.type === 'offline_garden'){ _openOfflineGardenDetail(entry); return; }
  let body = '<div class="empty-hint">未知日誌類型：' + String(d.type || '?') + '</div>';
  body += '<div style="font-size:10px;color:#7a6f60;margin-top:8px;word-break:break-all">keys: ' + Object.keys(d).join(', ') + '</div>';
  const ft = document.createElement('div');
  ft.className = 'modal-ft';
  ft.innerHTML = '';
  openModal({ title: '詳情', body: body, footer: ft });
}


function _openMerchantBatchDetail(entry){
  const d = entry.detail;
  const _keys = ['food','seed','throw','ammo'];
  let body = '';
  for(const _k of _keys){
    const _line = d.lines && d.lines[_k];
    if(!_line || !_line.items || !_line.items.length) continue;
    const _meta = _gardenMerchantLineMeta(_k) || { icon: '?', title: _k };
    const _col = !!window._collapseStates['gl.mb_' + _k];
    body += '<div class="cat-header" data-gcat="mb_' + _k + '" style="cursor:pointer"><span>' + _meta.icon + ' ' + _meta.title + ' · ' + (_line.batches||0) + ' 批</span><span>' + (_col ? '▶' : '▼') + '</span></div>';
    if(!_col){
      for(const _it of _line.items){
        if(_it.id === 'food'){
          body += '<div class="item-row" style="cursor:default"><div class="icon" style="background:' + rarityBg(_it.rarity) + '">🍲</div><div class="info"><div class="nm ' + rarityClass(_it.rarity) + '">食物</div><div class="sub">' + _it.rarity + '</div></div><div class="cnt">×' + _it.count + '</div></div>';
        } else {
          const _def = itemDef(_it.id) || { name: _it.id };
          body += '<div class="item-row" data-iid="' + _it.id + '" data-irar="' + _it.rarity + '"><div class="icon" style="background:' + rarityBg(_it.rarity) + '">' + itemIcon(_it.id, 30) + '</div><div class="info"><div class="nm ' + rarityClass(_it.rarity) + '">' + _def.name + '</div><div class="sub">' + _it.rarity + '</div></div><div class="cnt">×' + _it.count + '</div></div>';
        }
      }
    }
  }
  if(!body){ body = '<div class="empty-hint">無產出資料</div>'; }
  const ft = document.createElement('div');
  ft.className = 'modal-ft';
  ft.innerHTML = '';
  const bd = openModal({ title: '產線結算', body: body, footer: ft });
  _bindGardenLogItems(bd, entry);
}


function _openOfflineGardenDetail(entry){
  const d = entry.detail;
  let body = '<div style="font-size:11px;color:#7a6f60;margin-bottom:8px;line-height:1.5">' + _esc(entry.text || '') + '</div>';
  function _catHtml(key, title, items){
    if(!items || !items.length) return '';
    const col = !!window._collapseStates['gl.og_' + key];
    let h = '<div class="cat-header" data-gcat="og_' + key + '" style="cursor:pointer"><span>' + title + ' (' + items.length + ')</span><span>' + (col ? '▶' : '▼') + '</span></div>';
    if(!col){
      for(const it of items){
        const _isFood = (it.id === 'food');
        const _isGardenExtra = (typeof GARDEN_EXTRAS !== 'undefined' && GARDEN_EXTRAS[it.id]);
        let def, _iconHtml, _clickable;
        if(_isFood){
          def = { name: '食物' };
          _iconHtml = '🍲';
          _clickable = false;
        } else if(_isGardenExtra){
          def = GARDEN_EXTRAS[it.id];
          _iconHtml = '<img src="icons/garden/' + def.img + '.png' + assetSuffix('icons/garden/' + def.img + '.png') + '" style="width:30px;height:30px;object-fit:contain;display:block" alt="">';
          _clickable = false;
        } else {
          def = itemDef(it.id) || { name: it.id };
          _iconHtml = itemIcon(it.id, 30);
          _clickable = true;
        }
        h += '<div class="item-row"' + (_clickable ? (' data-iid="' + it.id + '" data-irar="' + it.rarity + '"') : ' style="cursor:default"') + '><div class="icon" style="background:' + rarityBg(it.rarity) + '">' + _iconHtml + '</div><div class="info"><div class="nm ' + rarityClass(it.rarity) + '">' + def.name + '</div><div class="sub">' + it.rarity + '</div></div><div class="cnt">×' + it.count + '</div></div>';
      }
    }
    return h;
  }
  const _cArr = [], _sArr = [], _mArr = [], _lqArr = [];
  if(d.crops){ for(const k in d.crops){ const sp = k.split('@'); _cArr.push({ id: sp[0], rarity: sp[1], count: d.crops[k] }); } }
  if(d.seeds){ for(const k in d.seeds){ const sp = k.split('@'); _sArr.push({ id: sp[0], rarity: sp[1], count: d.seeds[k] }); } }
  if(d.mats){ for(const k in d.mats){ _mArr.push({ id: k, rarity: '一般', count: d.mats[k] }); } }
  if(d.liquor){ for(const k in d.liquor){ const sp = k.split('@'); _lqArr.push({ id: sp[0], rarity: sp[1], count: d.liquor[k] }); } }
  body += _catHtml('crops', '🌾 作物', _cArr);
  body += _catHtml('seeds', '🌰 種子', _sArr);
  body += _catHtml('mats', '🔩 材料', _mArr);
  body += _catHtml('liquor', '🍶 私酒', _lqArr);
  if(d.merchant){
    if(d.merchant.foodBatches > 0){
      body += _catHtml('mfood', '🍲 食物生產線', [{ id:'food', rarity:'一般', count: d.merchant.foodBatches }]);
    }
    for(const _k of ['seed','throw','ammo']){
      const _src = d.merchant[_k];
      if(!_src) continue;
      const _items = Object.keys(_src).map(function(kk){ return _src[kk]; });
      if(!_items.length) continue;
      const _meta = _gardenMerchantLineMeta(_k) || { icon: '?', title: _k };
      body += _catHtml(_k, _meta.icon + ' ' + _meta.title, _items);
    }
  }
  const ft = document.createElement('div');
  ft.className = 'modal-ft';
  ft.innerHTML = '';
  const bd = openModal({ title: '離線後院', body: body, footer: ft });
  _bindGardenLogItems(bd, entry);
}


function _openBattleLogDetail(entry){
  if(!entry) return;
  /* rev-fix-raid-battleLog: 新格式 entry.summary，舊格式 entry 本身 */
  const _s = entry.summary || entry;
  const win = entry.win;
  let body = '<div class="detail-title ' + (win?'r-傳奇':'r-破舊') + '">' + (win?'⚔️ 勝利':'💀 失敗') + '</div>';
  body += '<div class="detail-sub">' + _esc(entry.region || '') + '</div>';
  body += '<div class="stat-line"><span class="k">回合</span><span class="v">' + (_s.rounds||0) + '</span></div>';
  body += '<div class="stat-line"><span class="k">守衛</span><span class="v">' + (_s.guardAlive||0) + ' / ' + (_s.guardTotal||0) + '</span></div>';
  body += '<div class="stat-line"><span class="k">敵人</span><span class="v">' + (_s.enemyCount||0) + '</span></div>';
  body += '<div class="stat-line"><span class="k">彈藥</span><span class="v">' + (_s.ammoUsed||0) + ' 發</span></div>';
  body += '<div class="stat-line"><span class="k">總傷害</span><span class="v">' + (_s.totalDmg||0) + '</span></div>';
  if(_s.guardAmmoList && _s.guardAmmoList.length){
    body += '<div class="divider"></div><div style="font-size:11px;color:#e8a33d;margin-bottom:4px">守衛表現</div>';
    for(const ga of _s.guardAmmoList){
      body += '<div class="stat-line"><span class="k">' + _esc((ga.coord||'') + ' ' + ga.name) + '</span><span class="v">' + ga.ammoName + '×' + ga.count + ' 傷' + ga.dmg + '</span></div>';
    }
  }
  if(!win && _s.broken && _s.broken.length){
    body += '<div class="divider"></div><div style="color:#e05252;font-size:11px">損壞：' + _s.broken.join(' ') + '</div>';
  }
  if(!win && _s.stolen && _s.stolen.length){
    body += '<div style="color:#e05252;font-size:11px">掠奪：' + _lootHtml(_s.stolen, '#e05252') + '</div>';
  }
  if(win && _s.loot && _s.loot.length){
    body += '<div class="divider"></div><div style="color:#4caf50;font-size:11px">獲得：' + _lootHtml(_s.loot, '#4caf50') + '</div>';
  }
  const ft = document.createElement('div');
  ft.className = 'modal-ft';
  ft.innerHTML = '';
  openModal({ title: '戰鬥詳情', body: body, footer: ft });
}

/* rev-fix-raid-realtime-log: 只更新右欄（戰鬥日誌），不重建左欄（生產日誌） */

function _gardenRefreshBattleLogNow(){
  try {
    if(typeof _gardenActiveTab === 'undefined' || _gardenActiveTab !== 'log') return;
    const p = document.getElementById('garden-page');
    if(!p || !p.classList.contains('on')) return;
    const box = p.querySelector('#gp-content');
    if(!box) return;
    const rw = box.querySelector('.gs-wrap[data-col="battle"]');
    if(!rw) return;
    const battleLog = (state.garden && state.garden.battleLog) || [];
    let right = '';
    if(!battleLog.length){
      right = '<div class="gs-empty" style="position:static;padding:20px 0">暫無戰鬥</div>';
    } else {
      for(let i = 0; i < battleLog.length; i++){
        const e = battleLog[i];
        if(e.kills !== undefined || e.status !== undefined || e.summary !== undefined){
          if(e.kills && e.kills.length){
            for(const k of e.kills){
              /* rev-fix-raid-log-timestamp-v2: 加时间戳 */
            const _ts3 = k.t ? (('0' + new Date(k.t).getHours()).slice(-2) + ':' + ('0' + new Date(k.t).getMinutes()).slice(-2)) : '';
            right += '<div class="garden-log-line raid-log-kill" style="padding-left:0;border-left:none">' + (_ts3 ? '<span class="gl-time">' + _ts3 + '</span> ' : '') + (k.html || '') + '</div>';
            }
          }
          if(e.status && e.status.length){
            for(const s of e.status){
              var _sCls = s.cls ? (' ' + s.cls) : '';
              right += '<div class="garden-log-line raid-log-status' + _sCls + '" style="padding-left:0;border-left:none">' + (s.html || '') + '</div>';
            }
          }
          if(e.summary){
            const _sum = e.summary;
            const _win = e.win;
            const _txt = (_win?'⚔️ 防禦成功':'💀 後院失守') + ' · ' + (e.region||'') + ' · 擊殺 ' + (_sum.enemyCount||0) + ' · 彈藥 ' + (_sum.ammoUsed||0) + ' · 傷害 ' + (_sum.totalDmg||0);
            right += '<div class="garden-log-line raid-log-summary" data-battle-idx="' + i + '" style="padding-left:0;border-left:none;cursor:pointer;text-decoration:underline dotted;color:#e8a33d">' + _txt + '</div>';
          }
        } else {
          const _win = e.win;
          const _txt = (_win?'⚔️勝':'💀敗') + ' ' + (e.region||'') + ' · ' + e.rounds + '回 · 守' + e.guardAlive + '/' + e.guardTotal + ' · 敵' + e.enemyCount + ' · 彈' + e.ammoUsed + ' · 傷' + e.totalDmg;
          right += '<div class="garden-log-line raid-log-summary" data-battle-idx="' + i + '" style="padding-left:0;border-left:none;cursor:pointer;text-decoration:underline dotted;color:#e8a33d">' + _txt + '</div>';
        }
      }
    }
    rw.innerHTML = right;
    rw.scrollTop = rw.scrollHeight;
  } catch(e){}
}


function renderGardenLog(box){
  if(!box) return;
  const log = (state.garden && state.garden.log) || [];
  const battleLog = (state.garden && state.garden.battleLog) || [];
  /* rev-fix-raid-log-unify: 不再使用 liveActive / live */
  function tsStr(t){
    const d = new Date(t);
    return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
  }
  function tsFull(t){
    const d = new Date(t);
    return ('0' + (d.getMonth()+1)).slice(-2) + '/' + ('0' + d.getDate()).slice(-2) + ' ' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
  }
  let left = '<div class="gs-wrap" data-col="prod">';
  if(!log.length){
    left += '<div class="gs-empty" style="position:static;padding:20px 0">暫無記錄</div>';
  } else {
    for(let i = 0; i < log.length; i++){
      const e = log[i];
      const clickAttr = e.detail ? ' data-log-idx="' + i + '"' : '';
      left += '<div class="garden-log-line ' + (e.cls||'') + '"' + clickAttr + '><span class="gl-time">' + tsStr(e.t) + '</span> ' + e.text + '</div>';
    }
  }
  left += '</div>';
  let right = '<div class="gs-wrap" data-col="battle">';
  /* rev-fix-raid-battleLog: 文字形式渲染（kills + status + summary） */
  if(!battleLog.length){
    right += '<div class="gs-empty" style="position:static;padding:20px 0">暫無戰鬥</div>';
  } else {
    for(let i = 0; i < battleLog.length; i++){
      const e = battleLog[i];
      /* 新格式：kills + status + summary */
      if(e.kills !== undefined || e.status !== undefined || e.summary !== undefined){
        if(e.kills && e.kills.length){
          for(const k of e.kills){
            /* rev-fix-raid-log-timestamp: 加时间戳 */
            /* rev-fix-tsstr-scope: tsStr 在 _gardenRefreshBattleLogNow 内未定义 → 内联 */
            const _ts = k.t ? (('0' + new Date(k.t).getHours()).slice(-2) + ':' + ('0' + new Date(k.t).getMinutes()).slice(-2)) : '';
            right += '<div class="garden-log-line raid-log-kill" style="padding-left:0;border-left:none">' + (_ts ? '<span class="gl-time">' + _ts + '</span> ' : '') + (k.html || '') + '</div>';
          }
        }
        if(e.status && e.status.length){
          for(const s of e.status){
            var _sCls2 = s.cls ? (' ' + s.cls) : '';
            /* rev-fix-raid-log-timestamp-v3: 加时间戳 */
            const _ts4 = s.t ? (('0' + new Date(s.t).getHours()).slice(-2) + ':' + ('0' + new Date(s.t).getMinutes()).slice(-2)) : '';
            right += '<div class="garden-log-line raid-log-status' + _sCls2 + '" style="padding-left:0;border-left:none">' + (_ts4 ? '<span class="gl-time">' + _ts4 + '</span> ' : '') + (s.html || '') + '</div>';
          }
        }
        if(e.summary){
          const _sum = e.summary;
          const _win = e.win;
          const _txt = (_win?'⚔️ 防禦成功':'💀 後院失守') + ' · ' + (e.region||'') + ' · 擊殺 ' + (_sum.enemyCount||0) + ' · 彈藥 ' + (_sum.ammoUsed||0) + ' · 傷害 ' + (_sum.totalDmg||0);
          right += '<div class="garden-log-line raid-log-summary" data-battle-idx="' + i + '" style="padding-left:0;border-left:none;cursor:pointer;text-decoration:underline dotted;color:#e8a33d">' + _txt + '</div>';
        }
      } else {
        /* 舊格式：一行總結 */
        const _win = e.win;
        const _txt = (_win?'⚔️勝':'💀敗') + ' ' + (e.region||'') + ' · ' + e.rounds + '回 · 守' + e.guardAlive + '/' + e.guardTotal + ' · 敵' + e.enemyCount + ' · 彈' + e.ammoUsed + ' · 傷' + e.totalDmg;
        right += '<div class="garden-log-line raid-log-summary" data-battle-idx="' + i + '" style="padding-left:0;border-left:none;cursor:pointer;text-decoration:underline dotted;color:#e8a33d">' + _txt + '</div>';
      }
    }
  }
  right += '</div>';
  box.innerHTML = '<div class="gs-cols">' +
    '<div class="gs-col" style="padding:0 6px;border-left:none">' + left + '</div>' +
    '<div class="gs-col" style="padding:0 6px;border-left:1px solid #e8a33d">' + right + '</div>' +
    '</div>';
  const _lw = box.querySelector('.gs-wrap[data-col="prod"]');
  const _rw = box.querySelector('.gs-wrap[data-col="battle"]');
  requestAnimationFrame(function(){
    if(_lw) _lw.scrollTop = _lw.scrollHeight;
    if(_rw) _rw.scrollTop = _rw.scrollHeight;
  });
}

/* ===== 僕人編號 + 改名 ===== */
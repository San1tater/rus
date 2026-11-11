
'use strict';

const ROMAN_NUM = ['','I','II','III','IV','V','VI'];

function armorBreakdownText(id, rarity){
  const def = ARMOR[id];
  if(!def || def.armor == null) return '';
  /* rev-fix-armor-class-whitelist: 只有 head/top 顯示護甲等級；面罩/褲子/鞋子只顯示裝甲值 */
  if(def.slot !== 'head' && def.slot !== 'top'){
    const total = equipArmorValue(id, rarity);
    return total > 0 ? String(total) : '';
  }
  const mult = RARITY_MULT[rarity] || 1;
  if(def.slot === 'head' && def.subArmor && def.subArmor.length){
    return def.subArmor.map(function(s){
      const v = Math.round(10 * (s.level || 0) * mult);
      const r = ROMAN_NUM[s.level] || '';
      return v + '（' + r + '級）';
    }).join('+');
  }
  const total = equipArmorValue(id, rarity);
  const lv = def.level || 1;
  const ac = ROMAN_NUM[lv] || '';
  return total + (ac ? '（' + ac + '級）' : '');
}



function _armorClassWithSub(def){
  /* rev-fix-armor-class-whitelist: 只有 head/top 顯示護甲等級；面罩/褲子/鞋子的 armor 是物理強度，非防彈等級 */
  if(!def || def.armor == null || !def.level) return '';
  if(def.slot !== 'head' && def.slot !== 'top') return '';
  const main = armorClass(def.level);
  if(!def.subArmor || !def.subArmor.length) return main;
  let maxSub = 0;
  for(let i = 0; i < def.subArmor.length; i++){
    const lv = def.subArmor[i].level || 0;
    if(lv > maxSub) maxSub = lv;
  }
  if(maxSub <= 0) return main;
  return main + '+' + armorClass(maxSub);
}

let _inventoryScrollPos = 0;
const inventoryCollapsed = {};
const ARMOR_SLOT_ORDER = { head:0, face:1, top:2, pants:3, shoes:4, backpack:5 };
const WEAPON_TYPE_ORDER = { '突擊步槍':0, '機槍':1, '衝鋒槍':2, '狙擊槍':3, '手槍':4, '霰彈槍':5, '刺刀':6, '刀':7, '手榴彈':8 };
function _subCatOrder(it){
  const d = it.def;
  if(!d) return 99;
  if(d.slot && ARMOR_SLOT_ORDER[d.slot] !== undefined) return ARMOR_SLOT_ORDER[d.slot];
  if(d.type && WEAPON_TYPE_ORDER[d.type] !== undefined) return WEAPON_TYPE_ORDER[d.type];
  return 99;
}

const modalLayer = document.getElementById('modal-layer');
const modalEl = modalLayer.querySelector('.modal');

function openModal(opts){
  opts = opts || {};
  const title = opts.title;
  const body = opts.body;
  const footer = opts.footer;
  const full = opts.full;
  const onClose = opts.onClose;
  modalEl.className = 'modal' + (full ? ' full' : '');
  modalEl.innerHTML = '';
  if(title !== false){
    let _title = title;
    if(typeof _title !== 'string'){
      if(_title && _title.nodeType === 1) _title = _title.textContent || '';
      else if(_title == null) _title = '';
      else _title = String(_title);
    }
    const hd = el('div', 'modal-hd');
    hd.innerHTML = '<div>' + _title + '</div><div class="x">✕</div>';
    hd.querySelector('.x').onclick = function(){
      if(typeof onClose === 'function'){
        try { onClose(); } catch(e){ console.warn('[onClose]', e); closeModal(); }
      } else {
        closeModal();
      }
    };
    modalEl.appendChild(hd);
  }
  const bd = el('div', 'modal-bd-inner');
  if(typeof body === 'string') bd.innerHTML = body;
  else if(body) bd.appendChild(body);
  modalEl.appendChild(bd);
  if(footer){
    const _hasFt = (typeof footer === 'string') ? (footer.trim().length > 0) : ((footer.innerHTML || '').trim().length > 0);
    if(_hasFt){
      const ft = el('div', 'modal-ft');
      if(typeof footer === 'string') ft.innerHTML = footer;
      else ft.appendChild(footer);
      modalEl.appendChild(ft);
    }
  }
  modalLayer.classList.add('on');
  return bd;
}

function closeModal(){
  if(window._modQueueTimer){ clearInterval(window._modQueueTimer); window._modQueueTimer = null; }
  modalLayer.classList.remove('on');
  modalEl.innerHTML = '';
}
modalLayer.querySelector('.modal-bd').onclick = function(){
  _inventoryScrollPos = 0;
  closeModal();
};

/* ============== 裝備詳情 / 比較 ============== */
function openSlotDetail(slot){
  const labels = {head:'頭部',face:'臉部',top:'上衣',pants:'褲子',shoes:'鞋子',backpack:'背包',primary:'主武器',secondary:'副武器',melee:'近戰武器',throwable:'投擲物'};
  const id = state.player.equipped[slot];
  const def = id ? itemDef(id) : null;
  const rar = state.player.equippedRarity[slot] || '一般';
  let body = '';
  if(def){
    const ac = _armorClassWithSub(def);
    const isArmor = slot === 'head' || slot === 'face' || slot === 'top' || slot === 'pants' || slot === 'shoes';
    const dVal = def.dmg != null ? Math.round(def.dmg * (RARITY_MULT[rar] || 1)) : null;
    body += '<div class="detail-title ' + rarityClass(rar) + '">' + itemIcon(id, 30) + ' ' + def.name + (ac ? ' <span class="armor-class">' + ac + '</span>' : '') + '</div>';
    body += '<div class="detail-sub">' + labels[slot] + ' · 稀有度：' + rar + '</div>';
    /* rev-fix-unify-order-slot: 統一順序（類型→口徑→攻擊屬性→裝甲→重量→特性→瞄具→固定→庫存） */
    body += '<div class="stat-line"><span class="k">類型</span><span class="v">' + (def.type || (def.slot ? '裝備' : '—')) + '</span></div>';
    if(def.cal) body += '<div class="stat-line"><span class="k">口徑</span><span class="v">' + def.cal + '</span></div>';
    if(def.slot === 'throwable'){
      body += '<div class="stat-line"><span class="k">破片數</span><span class="v">' + (def.fragments || 1) + '</span></div>';
      body += '<div class="stat-line"><span class="k">每片傷害</span><span class="v">' + Math.round((def.fragmentDamage || def.dmg || 0) * (RARITY_MULT[rar] || 1)) + '</span></div>';
    } else {
      if(dVal != null) body += '<div class="stat-line"><span class="k">傷害</span><span class="v">' + dVal + '</span></div>';
      if(def.mag) body += '<div class="stat-line"><span class="k">彈匣</span><span class="v">' + def.mag + '</span></div>';
      if(!isArmor && def.rpm) body += '<div class="stat-line"><span class="k">射速</span><span class="v">' + def.rpm + ' RPM</span></div>';
      var _rangeMS = getDisplayStat(id, rar, 'range');
      if(_rangeMS != null) body += '<div class="stat-line"><span class="k">射程</span><span class="v">' + _rangeMS + ' m</span></div>';
      if(def.modes) body += '<div class="stat-line"><span class="k">射擊模式</span><span class="v">' + _fireModeLabel(def) + '</span></div>';
    }
    if(slot === 'melee') body += '<div class="stat-line"><span class="k">每輪攻擊次數</span><span class="v">' + getMeleeHits(def.rpm) + '</span></div>';
    if(def.armor != null) body += '<div class="stat-line"><span class="k">裝甲值</span><span class="v">' + armorBreakdownText(id, rar) + '</span></div>';
    body += '<div class="stat-line"><span class="k">重量</span><span class="v">' + getItemWeight(id, rar).toFixed(2) + ' kg</span></div>';
    if(def.armored) body += '<div class="stat-line"><span class="k">特性</span><span class="v" style="color:#4a90d9">帶護臂甲</span></div>';
    if(def.explosive) body += '<div class="stat-line"><span class="k">特性</span><span class="v" style="color:#e05252">' + (slot === 'throwable' ? '爆炸群傷' : '爆炸（群傷）') + '</span></div>';
    if(def.scopeBonus) body += '<div class="stat-line"><span class="k">瞄具加成</span><span class="v">+' + def.scopeBonus + '% 命中</span></div>';
    if(def.fixed) body += '<div class="stat-line"><span class="k">固定</span><span class="v" style="color:#4a90d9">不可卸下</span></div>';
    if(slot === 'throwable') body += '<div class="stat-line"><span class="k">庫存</span><span class="v">' + getThrowableCount() + '</span></div>';
  } else {
    body = '<div class="detail-title">空槽位</div><div class="detail-sub">' + labels[slot] + ' 尚未裝備任何物品</div>';
  }
  const ft = el('div', 'modal-ft');
  if(slot === 'backpack' || isFixedItem(id)){
    ft.innerHTML = '<button class="btn primary" id="m-open">打開</button><button class="btn" id="m-tidy">整理</button>';
  } else if(def){
    ft.innerHTML = '<button class="btn" id="m-change">更換</button><button class="btn danger" id="m-unequip">卸下</button>';
  } else {
    ft.innerHTML = '<button class="btn primary" id="m-change">裝備</button>';
  }
  openModal({ title: labels[slot] + ' 詳情', body: body, footer: ft });

  const op = ft.querySelector('#m-open');
  if(op) op.onclick = function(){ closeModal(); openInventory(); };

  const tidy = ft.querySelector('#m-tidy');
  if(tidy) tidy.onclick = function(){
    const invalid = removeInvalidInventoryItems();
    const merged = consolidateInventoryDuplicates();
    save();
    let rpt = '';
    if(!invalid.length && !merged.length){
      rpt = '<div class="empty-hint">背包乾淨，無需整理</div>';
    } else {
      if(invalid.length){
        rpt += '<div style="color:#e8a33d;font-weight:bold;font-size:12px;margin-bottom:6px">🗑️ 移除無效物品 ' + invalid.length + ' 項</div>';
        for(const it of invalid) rpt += '<div style="font-size:10px;color:#a89a85;margin-bottom:2px">· ' + it.id + ' ×' + it.cnt + '</div>';
      }
      if(merged.length){
        rpt += '<div style="color:#e8a33d;font-weight:bold;font-size:12px;margin-top:10px;margin-bottom:6px">🔀 合併重複物品 ' + merged.length + ' 項</div>';
        for(const it of merged){
          const d = itemDef(it.id);
          const name = d ? d.name : it.id;
          rpt += '<div style="font-size:10px;color:#a89a85;margin-bottom:2px">· ' + name + '（' + it.rar + ' ×' + it.cnt + '）已分解為材料</div>';
        }
      }
    }
    closeModal();
    const _ft = el('div', 'modal-ft');
    _ft.innerHTML = '<button class="btn primary" id="m-ok">確定</button>';
    openModal({ title: '整理結果', body: rpt, footer: _ft });
    _ft.querySelector('#m-ok').onclick = function(){ closeModal(); openSlotDetail(slot); };
  };

  const ch = ft.querySelector('#m-change');
  if(ch) ch.onclick = function(){ closeModal(); openSlotPicker(slot, function(){ openSlotDetail(slot); }); };

  const un = ft.querySelector('#m-unequip');
  if(un) un.onclick = function(){
    if(slot === 'throwable'){ unequipThrowable(); }
    else {
      const curId = state.player.equipped[slot];
      const curRar = state.player.equippedRarity[slot] || '一般';
      state.player.equipped[slot] = null;
      delete state.player.equippedRarity[slot];
      if(curId) invAdd(curId, curRar, 1);
    }
    refreshPlayerStats(); save(); closeModal(); renderCurrentTab();
  };
}

function openSlotPicker(slot, returnFn){
  const list = [];
  for(const it of invList()){
    const d = it.def;
    if(!d) continue;
    if(d.slot === slot) list.push(it);
  }
  list.sort(function(a, b){
    const ra = sortByRarityDesc(a, b);
    if(ra !== 0) return ra;
    const an = (a.def && a.def.name) || '';
    const bn = (b.def && b.def.name) || '';
    return an.localeCompare(bn);
  });
  let body = '';
  if(!list.length) body = '<div class="empty-hint">倉庫中沒有可裝備於此槽位的物品</div>';
  else {
    for(const it of list){
      const _ac = (it.def.armor != null && it.def.level) ? _armorClassWithSub(it.def) : '';
      const _acHtml = _ac ? ' <span class="armor-class">' + _ac + '</span>' : '';
      body += '<div class="item-row" data-iid="' + it.id + '" data-irar="' + it.rarity + '"><div class="icon" style="background:' + rarityBg(it.rarity) + '">' + itemIcon(it.id, 30) + '</div><div class="info"><div class="nm ' + rarityClass(it.rarity) + '">' + it.def.name + _acHtml + '</div><div class="sub">' + (it.def.type || slot) + ' · ' + it.rarity + '</div></div><div class="cnt">*' + it.count + '</div></div>';
    }
  }
  const _slotPickerOnClose = (typeof returnFn === 'function') ? returnFn : closeModal;
  const bd = openModal({ title: '選擇 ' + slot + ' 裝備', body: body, onClose: _slotPickerOnClose });
  bd.querySelectorAll('.item-row').forEach(function(row){
    row.onclick = function(){
      const iid = row.dataset.iid, irar = row.dataset.irar;
      closeModal();
      openEquipmentCompare(slot, iid, irar, null, function(){ openSlotPicker(slot, returnFn); });
    };
  });
}

/* rev-fix-firemode-label: 武器射擊模式顯示為全自動/半自動/栓動/泵動 */
function _fireModeLabel(def){
  if(!def) return '—';
  if(def.slot === 'melee') return '近戰';
  if(def.slot === 'throwable') return '投擲';
  if(def.fireMode) return def.fireMode;
  const rpm = def.rpm || 600;
  if(def.type === '霰彈槍'){
    if(rpm < 50) return '泵動';
    return '半自動';
  }
  const modes = def.modes || [];
  if(modes.indexOf('掃射') >= 0) return '全自動';
  if(rpm < 50){
    if(def.type === '狙擊槍') return '栓動';
    return '手動';
  }
  return '半自動';
}

function getDisplayStat(id, rarity, key){
  const d = itemDef(id);
  if(!d) return null;
  const mult = RARITY_MULT[rarity] || 1;
  if(key === 'dmg' && d.dmg != null) return Math.round(d.dmg * mult);
  if(key === 'armor' && d.armor != null && d.armor > 0) return equipArmorValue(id, rarity);
  if(key === 'heal' && d.heal != null) return Math.round(d.heal * mult);
  if(key === 'range'){
    if(d.slot === 'melee') return 2;
    if(d._shortRange) return (typeof FOOT_RANGE_SHORT === 'number') ? FOOT_RANGE_SHORT : 20;
    return (typeof WEAPON_COMBAT_RANGE !== 'undefined' && WEAPON_COMBAT_RANGE[d.type]) || null;
  }
  return d[key] != null ? d[key] : null;
}

function openEquipmentCompare(slot, newId, newRarity, onConfirm, onCancel){
  const oldId = state.player.equipped[slot];
  const oldRarity = state.player.equippedRarity[slot] || '一般';
  const newDef = itemDef(newId);
  const oldDef = oldId ? itemDef(oldId) : null;
  const labels = {head:'頭部',face:'臉部',top:'上衣',pants:'褲子',shoes:'鞋子',backpack:'背包',primary:'主武器',secondary:'副武器',melee:'近戰武器',throwable:'投擲物'};
  const isArmorSlot = slot === 'head' || slot === 'face' || slot === 'top' || slot === 'pants' || slot === 'shoes';
  const iconBox = function(rar, id){
    return '<span style="display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:5px;background:' + rarityBg(rar) + ';flex-shrink:0">' + itemIcon(id, 30) + '</span>';
  };
  let body = '';

  if(oldDef){
    body += '<div class="cmp-header"><div class="cmp-name old">' + oldDef.name + '<br>（' + oldRarity + '）</div><div class="cmp-name new">' + newDef.name + '<br>（' + newRarity + '）</div></div>';
    body += '<div class="cmp-title">← 舊裝備 &nbsp;|&nbsp; 屬性 &nbsp;|&nbsp; 新裝備 →</div>';
    const stats = [{key:'dmg',label:'基礎傷害'},{key:'armor',label:'裝甲值'},{key:'mag',label:'彈匣'},{key:'rpm',label:'射速'},{key:'range',label:'射程'},{key:'heal',label:'治療'}];
    for(const st of stats){
      if(isArmorSlot && (st.key === 'rpm' || st.key === 'mag' || st.key === 'range')) continue;
      const oldVal = oldDef ? getDisplayStat(oldId, oldRarity, st.key) : null;
      const newVal = getDisplayStat(newId, newRarity, st.key);
      if(oldVal == null && newVal == null) continue;
      let deltaClass = '';
      let arrow = '';
      if(oldVal != null && newVal != null){
        if(newVal > oldVal){ deltaClass = 'up'; arrow = ' ▲'; }
        else if(newVal < oldVal){ deltaClass = 'down'; arrow = ' ▼'; }
      }
      body += '<div class="cmp-row"><div class="cmp-val old">' + (oldVal != null ? oldVal : '—') + '</div><div class="cmp-lbl">' + st.label + '</div><div class="cmp-val new ' + deltaClass + '">' + (newVal != null ? newVal : '—') + arrow + '</div></div>';
    }
    if(!isArmorSlot){
      const oldMult = RARITY_MULT[oldRarity] || 1;
      const newMult = RARITY_MULT[newRarity] || 1;
      let dcls = '';
      if(newMult > oldMult) dcls = 'up';
      else if(newMult < oldMult) dcls = 'down';
      body += '<div class="cmp-row"><div class="cmp-val old">×' + oldMult + '</div><div class="cmp-lbl">稀有度倍率</div><div class="cmp-val new ' + dcls + '">×' + newMult + (dcls === 'up' ? ' ▲' : dcls === 'down' ? ' ▼' : '') + '</div></div>';
    }
    const oldCal = oldDef ? oldDef.cal : null;
    const newCal = newDef ? newDef.cal : null;
    const oldAmmoId = oldCal ? getDefaultAmmo(oldCal) : null;
    const newAmmoId = newCal ? getDefaultAmmo(newCal) : null;
    if(oldAmmoId || newAmmoId){
      const oldAdmg = oldAmmoId ? AMMO[oldAmmoId].dmg : null;
      const newAdmg = newAmmoId ? AMMO[newAmmoId].dmg : null;
      if(oldAdmg != null || newAdmg != null){
        let dClass = '', arrow2 = '';
        if(oldAdmg != null && newAdmg != null){
          if(newAdmg > oldAdmg){ dClass = 'up'; arrow2 = ' ▲'; }
          else if(newAdmg < oldAdmg){ dClass = 'down'; arrow2 = ' ▼'; }
        }
        body += '<div class="cmp-row"><div class="cmp-val old">' + (oldAdmg != null ? oldAdmg : '—') + '</div><div class="cmp-lbl">默認彈藥傷害</div><div class="cmp-val new ' + dClass + '">' + (newAdmg != null ? newAdmg : '—') + arrow2 + '</div></div>';
      }
    }
    {
      const oldW = oldId ? getItemWeight(oldId, oldRarity) : 0;
      const newW = getItemWeight(newId, newRarity);
      let dClass = '', arrow = '';
      if(newW > oldW){ dClass = 'down'; arrow = ' ▲'; }
      else if(newW < oldW){ dClass = 'up'; arrow = ' ▼'; }
      body += '<div class="cmp-row"><div class="cmp-val old">' + oldW.toFixed(2) + '</div><div class="cmp-lbl">重量(kg)</div><div class="cmp-val new ' + dClass + '">' + newW.toFixed(2) + arrow + '</div></div>';
    }
    if((newDef.slot === 'melee' || (oldDef && oldDef.slot === 'melee')) && !isArmorSlot){
      const oldHits = oldDef && oldDef.slot === 'melee' ? getMeleeHits(oldDef.rpm) : null;
      const newHits = newDef.slot === 'melee' ? getMeleeHits(newDef.rpm) : null;
      if(oldHits != null || newHits != null){
        let dClass = '', arrow3 = '';
        if(oldHits != null && newHits != null){
          if(newHits > oldHits){ dClass = 'up'; arrow3 = ' ▲'; }
          else if(newHits < oldHits){ dClass = 'down'; arrow3 = ' ▼'; }
        }
        body += '<div class="cmp-row"><div class="cmp-val old">' + (oldHits != null ? oldHits + ' 次' : '—') + '</div><div class="cmp-lbl">每輪攻擊</div><div class="cmp-val new ' + dClass + '">' + (newHits != null ? newHits + ' 次' : '—') + arrow3 + '</div></div>';
      }
    }
  } else {
    const ac = _armorClassWithSub(newDef);
    const dVal = (newDef.dmg != null) ? Math.round(newDef.dmg * (RARITY_MULT[newRarity] || 1)) : null;
    body += '<div class="detail-title ' + rarityClass(newRarity) + '">' + iconBox(newRarity, newId) + ' ' + newDef.name + (ac ? ' <span class="armor-class">' + ac + '</span>' : '') + '</div>';
    body += '<div class="detail-sub">稀有度：' + newRarity + '</div>';
    /* rev-fix-unify-order-equiv: 統一順序 */
    body += '<div class="stat-line"><span class="k">裝備槽</span><span class="v">' + labels[slot] + '</span></div>';
    if(newDef.type) body += '<div class="stat-line"><span class="k">類型</span><span class="v">' + newDef.type + '</span></div>';
    if(newDef.cal) body += '<div class="stat-line"><span class="k">口徑</span><span class="v">' + newDef.cal + '</span></div>';
    if(newDef.slot === 'throwable'){
      body += '<div class="stat-line"><span class="k">破片數</span><span class="v">' + (newDef.fragments || 1) + '</span></div>';
      body += '<div class="stat-line"><span class="k">每片傷害</span><span class="v">' + Math.round((newDef.fragmentDamage || newDef.dmg || 0) * (RARITY_MULT[newRarity] || 1)) + '</span></div>';
    } else {
      if(dVal != null) body += '<div class="stat-line"><span class="k">傷害</span><span class="v">' + dVal + '</span></div>';
      if(newDef.mag) body += '<div class="stat-line"><span class="k">彈匣</span><span class="v">' + newDef.mag + '</span></div>';
      if(newDef.rpm && !isArmorSlot) body += '<div class="stat-line"><span class="k">射速</span><span class="v">' + newDef.rpm + ' RPM</span></div>';
      var _rangeEQ = getDisplayStat(newId, newRarity, 'range');
      if(_rangeEQ != null) body += '<div class="stat-line"><span class="k">射程</span><span class="v">' + _rangeEQ + ' m</span></div>';
      if(newDef.modes) body += '<div class="stat-line"><span class="k">射擊模式</span><span class="v">' + _fireModeLabel(newDef) + '</span></div>';
    }
    if(newDef.slot === 'melee') body += '<div class="stat-line"><span class="k">每輪攻擊</span><span class="v">' + getMeleeHits(newDef.rpm) + ' 次</span></div>';
    if(newDef.armor != null) body += '<div class="stat-line"><span class="k">裝甲值</span><span class="v">' + armorBreakdownText(newId, newRarity) + '</span></div>';
    body += '<div class="stat-line"><span class="k">重量</span><span class="v">' + getItemWeight(newId, newRarity).toFixed(2) + ' kg</span></div>';
    if(newDef.armored) body += '<div class="stat-line"><span class="k">特性</span><span class="v" style="color:#4a90d9">帶護臂甲</span></div>';
    if(newDef.explosive) body += '<div class="stat-line"><span class="k">特性</span><span class="v" style="color:#e05252">' + (newDef.slot === 'throwable' ? '爆炸群傷' : '爆炸（群傷）') + '</span></div>';
    if(newDef.scopeBonus) body += '<div class="stat-line"><span class="k">瞄具加成</span><span class="v">+' + newDef.scopeBonus + '% 命中</span></div>';
  }

  const ft = el('div', 'modal-ft');
  ft.innerHTML = '<button class="btn primary" id="m-confirm">確定</button>';
  openModal({ title: '更換 ' + labels[slot], body: body, footer: ft, onClose: function(){ closeModal(); if(onCancel) onCancel(); else renderCurrentTab(); } });

  ft.querySelector('#m-confirm').onclick = function(){
    const oldId2 = state.player.equipped[slot];
    if(oldId2){
      const o = state.player.equippedRarity[slot] || '一般';
      if(slot === 'throwable'){ unequipThrowable(); }
      else if(state.pendingSalvageEquipped && state.pendingSalvageEquipped[slot]){
        salvageToMaterials(oldId2, o, 1);
        delete state.pendingSalvageEquipped[slot];
      } else {
        state.player.equipped[slot] = null;
        delete state.player.equippedRarity[slot];
        invAdd(oldId2, o, 1);
      }
    }
    if(slot === 'throwable'){ equipThrowable(newId, newRarity); }
    else {
      invRemove(newId, newRarity, 1);
      state.player.equipped[slot] = newId;
      state.player.equippedRarity[slot] = newRarity;
    }
    refreshPlayerStats(); save(); closeModal(); renderCurrentTab();
    if(onConfirm) onConfirm();
  };
}

/* ============== 倉庫 ============== */
function openInventory(){
  const list = invList().sort(function(a, b){
    const rd = sortByRarityDesc(a, b);
    if(rd !== 0) return rd;
    const so = _subCatOrder(a) - _subCatOrder(b);
    if(so !== 0) return so;
    const an = (a.def && a.def.name) || '';
    const bn = (b.def && b.def.name) || '';
    return an.localeCompare(bn, 'zh-Hant');
  });
  let body = '';
  if(!list.length){
    body += '<div class="empty-hint">倉庫空空如也</div>';
  } else {
    const groups = { weapon:[], armor:[], ammo:[], consume:[], material:[], misc:[] };
    for(const it of list) groups[itemCat(it.id)].push(it);
    const names = { weapon:'⚔️ 武器', armor:'🛡️ 裝備', ammo:'🔫 彈藥', consume:'💊 消耗品', material:'🔧 材料', misc:'📦 其他' };
    for(const g in groups){
      if(!groups[g].length) continue;
      const collapsed = inventoryCollapsed[g];
      body += '<div class="cat-header" data-cat="' + g + '"><span>' + names[g] + ' (' + groups[g].length + ')</span><span>' + (collapsed ? '▶' : '▼') + '</span></div>';
      if(!collapsed){
        for(const it of groups[g]){
          if(!it.def) continue;
          const ac = _armorClassWithSub(it.def);
          const dVal = (it.def.dmg != null) ? Math.round(it.def.dmg * (RARITY_MULT[it.rarity] || 1)) : null;
          const isArmorDef = it.def.slot === 'head' || it.def.slot === 'face' || it.def.slot === 'top' || it.def.slot === 'pants' || it.def.slot === 'shoes';
          const sub = it.rarity
            + (it.def.type ? ' · ' + it.def.type : '')
            + (it.def.cal ? ' · ' + it.def.cal : '')
            + (!isArmorDef && it.def.penMM ? ' · 穿甲' + it.def.penMM + 'mm' : '')
            + (dVal != null ? ' · 傷' + dVal : '');
          body += '<div class="item-row" data-iid="' + it.id + '" data-irar="' + it.rarity + '"><div class="icon" style="background:' + rarityBg(it.rarity) + '">' + itemIcon(it.id, 30) + '</div><div class="info"><div class="nm ' + rarityClass(it.rarity) + '">' + it.def.name + (ac ? ' <span class="armor-class">' + ac + '</span>' : '') + '</div><div class="sub">' + sub + '</div></div><div class="cnt">*' + it.count + '</div></div>';
        }
      }
    }
  }
  const bd = openModal({ title: '物品倉庫', body: body });
  if(_inventoryScrollPos > 0) bd.scrollTop = _inventoryScrollPos;
  bd.onscroll = function(){ _inventoryScrollPos = bd.scrollTop; };
  bd.querySelectorAll('.cat-header').forEach(function(h){
    h.onclick = function(){
      const cat = h.dataset.cat;
      inventoryCollapsed[cat] = !inventoryCollapsed[cat];
      closeModal();
      openInventory();
    };
  });
  bd.querySelectorAll('.item-row').forEach(function(row){
    row.onclick = function(){ openItemDetail(row.dataset.iid, row.dataset.irar, openInventory); };
  });
}

function openItemDetail(id, rarity, returnFn){
  const d = itemDef(id);
  if(!d) return;
  const ac = _armorClassWithSub(d);
  const dVal = (d.dmg != null) ? Math.round(d.dmg * (RARITY_MULT[rarity] || 1)) : null;
  const isArmorDef = d.slot === 'head' || d.slot === 'face' || d.slot === 'top' || d.slot === 'pants' || d.slot === 'shoes';
  const iconBox = '<span style="display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:5px;background:' + rarityBg(rarity) + ';flex-shrink:0">' + itemIcon(id, 30) + '</span>';
  let body = '<div class="detail-title ' + rarityClass(rarity) + '">' + iconBox + ' ' + d.name + (ac ? ' <span class="armor-class">' + ac + '</span>' : '') + '</div>';
  body += '<div class="detail-sub">稀有度：' + rarity + '</div>';
  /* rev-fix-unify-order-item: 統一順序 */
  if(d.type) body += '<div class="stat-line"><span class="k">類型</span><span class="v">' + d.type + '</span></div>';
  if(d.cal) body += '<div class="stat-line"><span class="k">口徑</span><span class="v">' + d.cal + '</span></div>';
  if(d.slot === 'throwable'){
    body += '<div class="stat-line"><span class="k">破片數</span><span class="v">' + (d.fragments || 1) + '</span></div>';
    body += '<div class="stat-line"><span class="k">每片傷害</span><span class="v">' + Math.round((d.fragmentDamage || d.dmg || 0) * (RARITY_MULT[rarity] || 1)) + '</span></div>';
  } else {
    if(dVal != null) body += '<div class="stat-line"><span class="k">傷害</span><span class="v">' + dVal + '</span></div>';
    if(!isArmorDef && d.penMM) body += '<div class="stat-line"><span class="k">穿甲</span><span class="v">' + d.penMM + ' mm</span></div>';
    if(d.pellets) body += '<div class="stat-line"><span class="k">彈丸數</span><span class="v">' + d.pellets + '</span></div>';
    if(d.mag) body += '<div class="stat-line"><span class="k">彈匣</span><span class="v">' + d.mag + '</span></div>';
    if(!isArmorDef && d.rpm) body += '<div class="stat-line"><span class="k">射速</span><span class="v">' + d.rpm + ' RPM</span></div>';
    var _rangeMI = getDisplayStat(id, rarity, 'range');
    if(_rangeMI != null) body += '<div class="stat-line"><span class="k">射程</span><span class="v">' + _rangeMI + ' m</span></div>';
    if(d.modes) body += '<div class="stat-line"><span class="k">射擊模式</span><span class="v">' + _fireModeLabel(d) + '</span></div>';
    if(d.heal) body += '<div class="stat-line"><span class="k">治療</span><span class="v">' + Math.round(d.heal * (RARITY_MULT[rarity] || 1)) + '</span></div>';
  }
  if(d.slot === 'melee') body += '<div class="stat-line"><span class="k">每輪攻擊次數</span><span class="v">' + getMeleeHits(d.rpm) + '</span></div>';
  if(d.armor != null) body += '<div class="stat-line"><span class="k">裝甲值</span><span class="v">' + armorBreakdownText(id, rarity) + '</span></div>';
  if(!AMMO[id]) body += '<div class="stat-line"><span class="k">重量</span><span class="v">' + getItemWeight(id, rarity).toFixed(2) + ' kg</span></div>';
  if(d.armored) body += '<div class="stat-line"><span class="k">特性</span><span class="v" style="color:#4a90d9">帶護臂甲</span></div>';
  if(d.explosive) body += '<div class="stat-line"><span class="k">特性</span><span class="v" style="color:#e05252">' + (d.slot === 'throwable' ? '爆炸群傷' : '爆炸群傷') + '</span></div>';
  if(d.scopeBonus) body += '<div class="stat-line"><span class="k">瞄具加成</span><span class="v">+' + d.scopeBonus + '% 命中</span></div>';
  if(d.fixed) body += '<div class="stat-line"><span class="k">固定</span><span class="v" style="color:#4a90d9">不可卸下</span></div>';
  /* rev-fix-stackable-owned: 「持有」只對可堆疊物品有意義（無 slot，或投擲物）；其餘為唯一實例 */
  var _stackable = !d.slot || d.slot === 'throwable';
  if(_stackable){
    body += '<div class="stat-line"><span class="k">持有</span><span class="v">' + invCount(id, rarity) + '</span></div>';
  }
  const ft = el('div', 'modal-ft');
  if(d.slot && !d.fixed) ft.innerHTML = '<button class="btn primary" id="m-equip">裝備</button>';
  openModal({ title: '物品詳情', body: body, footer: ft, onClose: function(){ if(typeof returnFn === 'function'){ returnFn(); } else { closeModal(); } } });
  const eqb = ft.querySelector('#m-equip');
  if(eqb) eqb.onclick = function(){
    const slot = d.slot;
    closeModal();
    openEquipmentCompare(slot, id, rarity, returnFn, function(){ openItemDetail(id, rarity, returnFn); });
  };
}

function openOfflineDetail(log){
  const items = (log && log.items) || [];
  let body = '<div style="font-size:11px;color:#7a6f60;margin-bottom:8px;line-height:1.5">' + (log.html || '') + '</div>';
  if(!items.length){
    body += '<div class="empty-hint">無獲得物資</div>';
  } else {
    const groups = { weapon:[], armor:[], ammo:[], consume:[], material:[], misc:[] };
    for(const it of items){
      const cat = itemCat(it.id);
      if(groups[cat]) groups[cat].push(it);
      else groups.misc.push(it);
    }
    /* rev-fix-offline-sort: 稀有度 desc → 名稱 */
    for(const g in groups){
      groups[g].sort(function(a, b){
        const rd = sortByRarityDesc(a, b);
        if(rd !== 0) return rd;
        const ad = itemDef(a.id) || { name: a.id };
        const bd = itemDef(b.id) || { name: b.id };
        return (ad.name || '').localeCompare(bd.name || '', 'zh-Hant');
      });
    }
    const names = { weapon:'⚔️ 武器', armor:'🛡️ 裝備', ammo:'🔫 彈藥', consume:'💊 消耗品', material:'🔧 材料', misc:'📦 其他' };
    if(!window._offlineCollapsed) window._offlineCollapsed = {};
    for(const g in groups){
      if(!groups[g].length) continue;
      const col = window._offlineCollapsed[g];
      body += '<div class="cat-header" data-ocat="' + g + '" style="cursor:pointer"><span>' + names[g] + ' (' + groups[g].length + ')</span><span>' + (col ? '▶' : '▼') + '</span></div>';
      if(!col){
        for(const it of groups[g]){
          const def = itemDef(it.id);
          if(!def) continue;
          const sub = it.rarity + (def.type ? ' · ' + def.type : '');
          body += '<div class="item-row" data-iid="' + it.id + '" data-irar="' + it.rarity + '"><div class="icon" style="background:' + rarityBg(it.rarity) + '">' + itemIcon(it.id, 30) + '</div><div class="info"><div class="nm ' + rarityClass(it.rarity) + '">' + def.name + '</div><div class="sub">' + sub + '</div></div><div class="cnt">×' + it.count + '</div></div>';
        }
      }
    }
  }
  const bd = openModal({ title: '離線獲得物資', body: body });
  bd.querySelectorAll('.cat-header[data-ocat]').forEach(function(h){
    h.onclick = function(){
      window._offlineCollapsed[h.dataset.ocat] = !window._offlineCollapsed[h.dataset.ocat];
      closeModal();
      openOfflineDetail(log);
    };
  });
  bd.querySelectorAll('.item-row').forEach(function(r){
    r.onclick = function(){ closeModal(); openItemDetail(r.dataset.iid, r.dataset.irar, function(){ openOfflineDetail(log); }); };
  });
}

function openLogHistory(){
  const logs = state.logs.slice().reverse();
  let body = '<div style="font-size:10px">';
  if(!logs.length) body += '<div class="empty-hint">暫無記錄</div>';
  for(const l of logs){
    const clickable = (l.type === 'offline' && l.items && l.items.length);
    const attr = clickable ? 'data-offline-idx="' + logs.indexOf(l) + '" style="padding:5px 0;cursor:pointer;color:#4a90d9"' : 'style="padding:5px 0"';
    body += '<div class="logline" ' + attr + '>' + l.html + '</div>';
  }
  body += '</div>';
  const bd = openModal({ title: '歷史記錄', body: body, full: true });
  bd.querySelectorAll('.itm').forEach(function(e){ e.onclick = function(){ openItemDetail(e.dataset.iid, e.dataset.irar); }; });
  bd.querySelectorAll('[data-offline-idx]').forEach(function(e){
    e.onclick = function(){
      const l = logs[parseInt(e.dataset.offlineIdx, 10)];
      if(l) openOfflineDetail(l);
    };
  });
}

/* ============== 控制中心 / 偏好 ============== */

/* rev-fix-position: renderEquipZone 是唯一实现，去掉 if(typeof) 包裹 */
window.renderEquipZone = function(z2){
    if(!z2) return;

    /* 電台按鈕每秒倒數（只在探索頁生效） */
    if(!window._radioTickTimer){
      window._radioTickTimer = setInterval(function(){
        if(typeof currentTab === 'undefined' || currentTab !== 'explore') return;
        const _rb = document.querySelector('#zone2 .radio-btn');
        if(!_rb) return;
        if(typeof _radioGetStatus !== 'function') return;
        const _st = _radioGetStatus();
        let _txt, _cls;
        if(_st.state === 'cooldown'){ _txt = '📻 ' + _st.remain + 's'; _cls = 'radio-btn cooldown'; }
        else if(_st.state === 'empty'){ _txt = '📻 用盡'; _cls = 'radio-btn empty'; }
        else { _txt = '📻 ' + _st.uses; _cls = 'radio-btn ready'; }
        _rb.textContent = _txt;
        _rb.className = _cls;
        _rb.setAttribute('data-state', _st.state);
      }, 1000);
    }

    const W = z2.clientWidth;
    const H = z2.clientHeight;
    if(!W || !H){
      requestAnimationFrame(function(){ renderEquipZone(z2); });
      return;
    }

    const pad = 6;
    const availW = W - pad * 2;
    const availH = H - pad * 2;

    const cellByHeight = Math.floor((availH / 5) * 0.92);
    const cellByWidth  = Math.floor((availW / 3) * 0.98);
    const cellSize = Math.min(cellByHeight, cellByWidth);
    if(cellSize < 20) return;

    const gapX = (W - cellSize * 3) / 4;
    const gapY = (H - cellSize * 5) / 6;

    const colX = [
      gapX,
      gapX + cellSize + gapX,
      gapX + (cellSize + gapX) * 2
    ];
    const rowY = [
      gapY,
      gapY + cellSize + gapY,
      gapY + (cellSize + gapY) * 2,
      gapY + (cellSize + gapY) * 3,
      gapY + (cellSize + gapY) * 4
    ];

    const fontSize = Math.max(7, Math.floor(cellSize * 0.12));

    /* 自動遞補投擲物 */
    if(typeof ensureThrowableFromBackpack === 'function' && getThrowableCount() <= 0){
      try { ensureThrowableFromBackpack('explore'); } catch(e){}
    }
    const slotLayout = {
      head:      { col: 1, row: 0 },
      face:      { col: 1, row: 1 },
      top:       { col: 1, row: 2 },
      pants:     { col: 1, row: 3 },
      shoes:     { col: 1, row: 4 },
      backpack:  { col: 0, row: 2 },
      primary:   { col: 2, row: 0 },
      secondary: { col: 2, row: 1 },
      melee:     { col: 2, row: 2 },
      throwable: { col: 2, row: 3 }
    };

    const labels = {
      head: '頭部', face: '臉部', top: '上衣', pants: '褲子', shoes: '鞋子',
      backpack: '背包', primary: '主武器', secondary: '副武器', melee: '近戰', throwable: '投擲'
    };

    let html = '';
    for(const key in slotLayout){
      const L = slotLayout[key];
      const x = colX[L.col];
      const y = rowY[L.row];
      let id = state.player.equipped[key];
      let def = id ? itemDef(id) : null;
      if(key === 'throwable' && id && getThrowableCount() <= 0){
        state.player.equipped.throwable = null;
        delete state.player.equippedRarity.throwable;
        state.player.throwableStock = 0;
        id = null;
        def = null;
      }
      const isFixed = def && def.fixed;
      let inner = '';
      if(def){
        inner = '<img class="slot-img" src="icons/items/' + resolveIconId(id) + '.png' + assetSuffix('icons/items/' + resolveIconId(id) + '.png') + '" alt=""><div class="lbl">' + labels[key] + '</div>';
      } else {
        inner = '<div class="nm">' + labels[key] + '</div>';
      }
      const rar = def ? (state.player.equippedRarity[key] || '一般') : '';
      const bgStyle = def ? 'background:' + rarityBg(rar) + ';' : '';
      const style = 'left:' + x + 'px;top:' + y + 'px;width:' + cellSize + 'px;height:' + cellSize + 'px;font-size:' + fontSize + 'px;' + bgStyle;
      html += '<div class="slot ' + (def ? 'filled' : 'empty') + ' ' + (isFixed ? 'fixed' : '') + '" style="' + style + '" data-slot="' + key + '">' + inner + '</div>';
    }

    const _fmt = function(v){ v = Math.round(v); if(v >= 1e7) return Math.round(v/1e6) + 'M'; if(v >= 1e6) return (v/1e6).toFixed(1) + 'M'; if(v >= 1e4) return Math.round(v/1e3) + 'K'; return v.toString(); };
    const statH = cellSize * 2 + gapY;
    const _statFont = Math.max(9, fontSize);
    html += '<div class="player-stat-panel" style="left:' + colX[0] + 'px;top:' + rowY[0] + 'px;width:' + cellSize + 'px;height:' + statH + 'px;font-size:' + _statFont + 'px;text-align:right;display:flex;flex-direction:column;justify-content:space-around;padding:4px 6px">'
      + '<div class="row lv-row" style="justify-content:flex-end"><b class="lv-v">Lv.' + state.player.level + '</b></div>'
      + '<div class="row" style="justify-content:flex-end"><span class="stat-pair"><span>❤️</span><b class="hp-v">' + _fmt(state.player.hp) + '</b></span><b class="hp-m" style="color:#7a6f60">/ ' + _fmt(state.player.maxHp) + '</b></div>'
      + '<div class="row" style="justify-content:flex-end"><span class="stat-pair"><span>🛡️</span><b class="ap-v">' + _fmt(state.player.armor) + '</b></span><b class="ap-m" style="color:#7a6f60">/ ' + _fmt(state.player.maxArmor) + '</b></div>'
      + '</div>';

    const wt = getTotalWeight();
    html += '<div class="weight-display" style="left:' + colX[0] + 'px;top:' + rowY[3] + 'px;width:' + cellSize + 'px;height:' + cellSize + 'px;font-size:' + Math.max(9, fontSize) + 'px">'
      + '<div>⚖️ <b style="color:' + getWeightColor(wt) + '">' + Math.round(wt) + ' kg</b></div>'
      + '<div><b id="speed-display">' + ((typeof window._calcSpeedDisplay === 'function') ? window._calcSpeedDisplay().toFixed(1) : '1.4') + ' m/s</b></div>'
      + '</div>';

    if(typeof getBuildingLv === 'function' && getBuildingLv('garage') > 0){
      if(typeof _radioEnsureInit === 'function') _radioEnsureInit();
      if(currentTab === 'combat'){
        const _mode = state.preferences.bossMode || 'challenge';
        const _label = _mode === 'challenge' ? '挑戰' : '掃蕩';
        html += '<div class="radio-btn" id="radio-btn" data-mode="' + _mode + '" style="left:' + colX[0] + 'px;top:' + rowY[4] + 'px;width:' + cellSize + 'px;height:' + cellSize + 'px;font-size:' + fontSize + 'px">📻 ' + _label + '</div>';
      } else {
        const _st = (typeof _radioGetStatus === 'function') ? _radioGetStatus() : { state: 'empty', uses: 0 };
        let _radioLabel = '';
        let _radioCls = '';
        if(_st.state === 'cooldown'){ _radioLabel = _st.remain + 's'; _radioCls = 'cooldown'; }
        else if(_st.state === 'empty'){ _radioLabel = '用盡'; _radioCls = 'empty'; }
        else { _radioLabel = String(_st.uses); _radioCls = 'ready'; }
        html += '<div class="radio-btn ' + _radioCls + '" id="radio-btn" data-state="' + _st.state + '" style="left:' + colX[0] + 'px;top:' + rowY[4] + 'px;width:' + cellSize + 'px;height:' + cellSize + 'px;font-size:' + fontSize + 'px">📻 ' + _radioLabel + '</div>';
      }
    }

    z2.innerHTML = html;

    $$('.slot', z2).forEach(function(e){ e.onclick = function(){ openSlotDetail(e.dataset.slot); }; });

    const _rb = z2.querySelector('#radio-btn');
    if(_rb){
      _rb.onclick = function(){
        if(currentTab === 'combat'){
          const _cur = state.preferences.bossMode || 'challenge';
          state.preferences.bossMode = _cur === 'challenge' ? 'sweep' : 'challenge';
          save();
          renderCombat();
        } else {
          if(typeof _radioShowConfirm === 'function') _radioShowConfirm();
        }
      };
    }

    if(!window._zone2ResizeBound){
      window._zone2ResizeBound = true;
      let _resizeTimer = null;
      window.addEventListener('resize', function(){
        if(_resizeTimer) clearTimeout(_resizeTimer);
        _resizeTimer = setTimeout(function(){
          const _z2 = document.getElementById('zone2');
          if(_z2 && currentTab === 'explore'){
            renderEquipZone(_z2);
          }
        }, 200);
      });
    }
  };


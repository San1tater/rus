/* ============================================================
   基地
   ============================================================ */
const collapsedSections={weapons:true,types:true,other:true};
function profDisplay(v){v=v||0;if(v>=MAX_PROF_LEVEL)return `Lv.${MAX_PROF_LEVEL} (MAX)`;const capped=Math.min(MAX_PROF_LEVEL,v);const lv=Math.floor(capped),pct=Math.round((capped-lv)*100);return `Lv.${lv} (${pct}%)`;}
function renderBase(){
  const z1=$('#zone1'),z2=$('#zone2'),z3=$('#zone3');
  let html='<div class="build-grid">';
  for(let i=0;i<12;i++){
    const slot=state.base.slots[i];
    if(i===0)html+=`<div class="cell core" data-i="${i}"><div class="cico">${buildingIcon('control')}</div><div class="cnm">控制中心</div><div class="clv">Lv.1</div></div>`;
    else if(slot){const b=BUILDINGS[slot.id]||{name:'未知'};html+=`<div class="cell built" data-i="${i}"><div class="cico">${buildingIcon(slot.id)}</div><div class="cnm">${b.name}</div><div class="clv">Lv.${slot.lv}</div></div>`;}
    else html+=`<div class="cell" data-i="${i}"><div class="cico">＋</div><div class="cnm">空地</div></div>`;
  }
  html+='</div>';z1.innerHTML=html;
  $$('.cell',z1).forEach(c=>{c.onclick=()=>onBuildCell(parseInt(c.dataset.i));});
  const p=state.proficiency;
  const types=['突擊步槍','機槍','衝鋒槍','狙擊槍','手槍','霰彈槍','刺刀','刀','手榴彈'];
  z2.innerHTML=`
    <div class="prof-area">
      <div class="prof-sec ${collapsedSections.weapons?'collapsed':''}" data-sec="weapons">
        <h4 data-toggle="weapons"><span>🔫 熟練度（欄位）</span><span>▼</span></h4>
        <div class="prof-body">
          <div class="prof-line"><span>主武器</span><span class="v">${profDisplay(p.primary)}</span></div>
          <div class="prof-line"><span>副武器</span><span class="v">${profDisplay(p.secondary)}</span></div>
          <div class="prof-line"><span>近戰武器</span><span class="v">${profDisplay(p.melee)}</span></div>
          <div class="prof-line"><span>投擲物</span><span class="v">${profDisplay(p.throwable)}</span></div>
        </div>
      </div>
      <div class="prof-sec ${collapsedSections.types?'collapsed':''}" data-sec="types">
        <h4 data-toggle="types"><span>🎯 熟練度（武器）</span><span>▼</span></h4>
        <div class="prof-body">${types.map(t=>`<div class="prof-line"><span>${t}</span><span class="v">${profDisplay(p[t])}</span></div>`).join('')}</div>
      </div>
      <div class="prof-sec ${collapsedSections.other?'collapsed':''}" data-sec="other">
        <h4 data-toggle="other"><span>🛠️ 其他</span><span>▼</span></h4>
        <div class="prof-body">
          <div class="prof-line"><span>物品製造</span><span class="v">${profDisplay(p.craft)}</span></div>
          <div class="prof-line"><span>物品拆解</span><span class="v">${profDisplay(p.salvage)}</span></div>
          <div class="prof-line"><span>物品掉落</span><span class="v">${profDisplay(p.drop)}</span></div>
        </div>
      </div>
      <div class="pref-btn" id="pref-btn">⚙️ 偏好設定</div>
    </div>`;
  $$('.prof-sec h4',z2).forEach(h=>{h.onclick=()=>{const key=h.dataset.toggle;collapsedSections[key]=!collapsedSections[key];h.parentElement.classList.toggle('collapsed');};});
  $('#pref-btn').onclick=openPreference;
  renderRegionArea(z3);
}
let _regionScrollPos=0;
function getSelectedRegionTier(baseName){
  for(const id of state.preferences.regions){
    if(id===baseName)return 1;
    if(id===baseName+'II')return 2;
  }
  return 0;
}
function setRegionTier(baseName,tier){
  state.preferences.regions=state.preferences.regions.filter(id=>id!==baseName&&id!==baseName+'II');
  if(tier===1)state.preferences.regions.push(baseName);
  else if(tier===2)state.preferences.regions.push(baseName+'II');
}
function ensureAtLeastOneRegion(){
  if(state.preferences.regions.length>0)return;
  for(const k in REGIONS){
    if(!REGIONS[k].needUnlock||state.unlockedRegions.includes(k)){state.preferences.regions.push(k);return;}
  }
  state.preferences.regions.push('廢棄工廠');
}
function renderRegionArea(z3){
  const _ra=z3.querySelector('.region-area');
  if(_ra) _regionScrollPos=_ra.scrollTop;
  ensureAtLeastOneRegion();
  let html=`<div class="z3-head"><div class="z3-title">🗺️ 探索區域</div></div>
    <div class="mode-sel">
      <div class="mode-btn ${state.preferences.actionMode==='attack'?'on':''}" data-mode="attack">⚔ 攻擊</div>
      <div class="mode-btn ${state.preferences.actionMode==='stealth'?'on':''}" data-mode="stealth">🥷 潛行</div>
    </div>
    <div class="region-area">`;
  const _baseKeys=['廢棄工廠','廢棄實驗室','郊區公路','輻射沼澤','廢土核心'];
  for(const baseName of _baseKeys){
    const r1=REGIONS[baseName];
    if(!r1)continue;
    const iiName=baseName+'II';
    const r2=REGIONS[iiName];
    const t2Exists=!!r2;
    const t2Unlocked=t2Exists&&(!r2.needUnlock||state.unlockedRegions.includes(iiName));
    const selTier=getSelectedRegionTier(baseName);
    html+=`<div class="reg-item" data-sel-tier="${selTier}">
      <div class="ri"><div class="rn">${r1.name}</div></div>
      <div class="tier-selector">
        <div class="tier-btn ${selTier===1?'on':''}" data-key="${baseName}" data-tier="1">I</div>
        ${t2Exists?`<div class="tier-btn ${selTier===2?'on':''} ${t2Unlocked?'':'locked'}" data-key="${baseName}" data-tier="2">${t2Unlocked?'II':'🔒'}</div>`:''}
      </div>
    </div>`;
  }
  html+=`</div>`;
  z3.innerHTML=html;
  const _ra2=z3.querySelector('.region-area');
  if(_ra2) _ra2.scrollTop=_regionScrollPos;
  $$('.mode-btn',z3).forEach(b=>{b.onclick=()=>setActionMode(b.dataset.mode);});
  $$('.tier-btn',z3).forEach(btn=>{
    btn.onclick=(e)=>{
      e.stopPropagation();
      const key=btn.dataset.key;
      const tier=parseInt(btn.dataset.tier,10);
      if(tier===2&&!state.unlockedRegions.includes(key+'II')){notify('二級區域尚未解鎖','error');return;}
      const cur=getSelectedRegionTier(key);
      setRegionTier(key,cur===tier?0:tier);
      ensureAtLeastOneRegion();
      save();renderRegionArea(z3);
    };
  });
}
function setActionMode(mode){
  const oldMode=state.preferences.actionMode;if(oldMode===mode)return;
  if(mode==='stealth'){
    state.stashedWeapons=state.stashedWeapons||{};
    for(const slot of ['primary','secondary']){
      const id=state.player.equipped[slot];
      if(id){const _r=state.player.equippedRarity[slot]||'一般';state.stashedWeapons[slot]={id,rarity:_r};state.player.equipped[slot]=null;delete state.player.equippedRarity[slot];invAdd(id,_r,1);}
    }
  } else {
    if(state.stashedWeapons){
      for(const slot of ['primary','secondary']){
        if(state.stashedWeapons[slot]){
          const {id,rarity}=state.stashedWeapons[slot];
          const curId=state.player.equipped[slot];
          const curRarity=state.player.equippedRarity[slot];
          if(curId&&(curId!==id||curRarity!==rarity)){invAddRaw(curId,curRarity||'一般',1);}
          let taken=false;
          if(invCount(id,rarity)>0){invRemove(id,rarity,1);state.player.equipped[slot]=id;state.player.equippedRarity[slot]=rarity;taken=true;}
          else{for(const k in state.inventory){const [iid,irar]=k.split('@');if(iid===id){invRemove(iid,irar,1);state.player.equipped[slot]=iid;state.player.equippedRarity[slot]=irar;taken=true;break;}}}
          delete state.stashedWeapons[slot];
        }
      }
    }
  }
  state.preferences.actionMode=mode;
  refreshPlayerStats();save();renderCurrentTab();
  notify(mode==='stealth'?'切換至潛行蒐集，主副武器已卸下':'切換至攻擊前進','ok');
}
function onBuildCell(i){
  if(i===0){openModal({title:'🏛️ 控制中心',body:'<div class="empty-hint">基地核心，無法升級。</div>'});return;}
  const slot=state.base.slots[i];
  if(slot){
    const b=BUILDINGS[slot.id];
    const upCost=(slot.id==='forge')?{metal:150*slot.lv,screws:50*slot.lv}:{wood:15*slot.lv,metal:15*slot.lv,screws:5*slot.lv};
    const curBonus=buildingBonusText(slot.id,slot.lv);
    const nextBonus=buildingBonusText(slot.id,slot.lv+1);
    let body=`<div class="detail-title">${buildingIcon(slot.id)} ${b.name} Lv.${slot.lv}</div>
      <div class="detail-sub">${b.desc}</div>
      <div class="stat-line"><span class="k">當前效果</span><span class="v">${curBonus}</span></div>
      <div class="stat-line"><span class="k">升級後</span><span class="v">${nextBonus}</span></div>
      <div class="divider"></div>
      <div style="font-size:11px;color:#e8a33d;margin-bottom:4px">升級需求（等值一般）</div>`;
    for(const [k,v] of Object.entries(upCost)){const have=materialEquivalent(k);const ok=have>=v;body+=`<div class="stat-line"><span class="k">${MATERIALS[k].name}</span><span class="v" style="color:${ok?'#4caf50':'#e05252'}">${have}/${v}</span></div>`;}
    const ft=el('div','modal-ft');
    const isWorkbench=slot.id==='workbench';
    ft.innerHTML=`<button class="btn primary" id="m-up">升級</button>${isWorkbench?'<button class="btn" id="m-craft">改造</button>':''}<button class="btn ghost" id="m-close">關閉</button>`;
    openModal({title:b.name,body,footer:ft});
    ft.querySelector('#m-close').onclick=closeModal;
    ft.querySelector('#m-up').onclick=()=>{
      for(const [k,v] of Object.entries(upCost))if(materialEquivalent(k)<v){notify('材料不足，無法升級','error');return;}
      for(const [k,v] of Object.entries(upCost))consumeMaterial(k,v);
      slot.lv++;refreshPlayerStats();save();renderBase();
      notify(`${b.name} 升級至 Lv.${slot.lv}`,'ok');
      closeModal(); onBuildCell(i);
    };
    const craftBtn=ft.querySelector('#m-craft');
    if(craftBtn)craftBtn.onclick=()=>{closeModal();openModding(slot.lv);};
    return;
  }
  const builtSet=new Set();
  state.base.slots.forEach((s,idx)=>{if(s&&idx!==i)builtSet.add(s.id);});
  const available=[],taken=[];
  for(const bid in BUILDINGS){if(builtSet.has(bid))taken.push(bid);else available.push(bid);}
  let body='<div style="font-size:11px;color:#e8a33d;margin-bottom:6px">選擇要建造的設施</div>';
  for(const bid of available){
    const b=BUILDINGS[bid];
    let costHtml='';
    for(const [k,v] of Object.entries(b.cost)){const have=materialEquivalent(k);const ok=have>=v;costHtml+=`<span class="${ok?'cost-ok':'cost-no'}">${MATERIALS[k].name} ${have}/${v}</span>`;}
    body+=`<div class="item-row" data-bid="${bid}"><div class="icon">${buildingIcon(bid)}</div><div class="info"><div class="nm">${b.name}</div><div class="sub">${b.desc}</div><div class="sub">${costHtml}</div><div class="sub" style="color:#4caf50">效果：${buildingBonusText(bid,1)}</div></div></div>`;
  }
  if(taken.length){
    body+=`<div class="divider"></div><div style="color:#5a5040;font-size:10px;margin:4px 0 6px">已建造（不可重複）</div>`;
    for(const bid of taken){const b=BUILDINGS[bid];body+=`<div class="item-row" style="opacity:.35;background:#151210;cursor:not-allowed;border-color:#241d16"><div class="icon" style="filter:grayscale(1)">${buildingIcon(bid)}</div><div class="info"><div class="nm" style="color:#7a6f60">${b.name}</div><div class="sub">已建造</div></div></div>`;}
  }
  const bd=openModal({title:'建造設施',body});
  $$('.item-row[data-bid]',bd).forEach(r=>{
    r.onclick=()=>{
      const bid=r.dataset.bid;const b=BUILDINGS[bid];
      for(const [k,v] of Object.entries(b.cost))if(materialEquivalent(k)<v){notify('材料不足，無法建造','error');return;}
      for(const [k,v] of Object.entries(b.cost))consumeMaterial(k,v);
      state.base.slots[i]={id:bid,lv:1};addProf('craft',1);refreshPlayerStats();save();closeModal();renderBase();
      notify(`建造完成：${b.name}`,'ok');
    };
  });
}
function renderModQueueHtml(workbenchLv){
  if(!state.crafting||!state.crafting.length)return '';
  const now=Date.now();
  const genLv=getBuildingLv('generator');const sm=1+genLv*0.2;
  let html=`<div style="font-size:11px;color:#4caf50;font-weight:bold;margin:8px 0 6px">📋 改造隊列（${state.crafting.filter(c=>c.type==='mod').length}/${workbenchLv}）</div>`;
  for(const c of state.crafting){
    if(c.type!=='mod')continue;
    const info=c.modInfo;
    const total=c.time*1000/sm;
    const elapsed=now-c.startTime;
    const pct=Math.min(100,(elapsed/total)*100);
    const remain=Math.max(0,Math.ceil((total-elapsed)/1000));
    const newName=namedWeaponName(info.baseId,info.mag,info.scope);
    html+=`<div class="craft-slot"><div style="flex:1"><div style="color:#e8a33d;font-weight:bold;font-size:11px">${newName}</div><div class="progress"><div class="fill" style="width:${pct}%"></div></div><div style="font-size:9px;color:#7a6f60;margin-top:2px">剩餘 ${remain}s</div></div></div>`;
  }
  html+='<div class="divider"></div>';
  return html;
}
function openModding(workbenchLv){
  const candidates=[];
  for(const slot of ['primary','secondary']){
    const id=state.player.equipped[slot];
    const rar=state.player.equippedRarity[slot];
    if(!id||!rar) continue;
    if(rar==='傳奇'||rar==='具名'){
      const def=itemDef(id);
      if(!def) continue;
      const baseId = def.named ? def.baseId : id;
      if(!WEAPONS[baseId]) continue;
      const rules=WEAPON_MOD_RULES[baseId]||{mags:[],scopes:[]};
      const magOpts = getMagOptionsForWeapon(baseId);
      const scopeOpts = rules.scopes||[];
      if(magOpts.length || scopeOpts.length){
        candidates.push({id, rarity:rar, baseId, mag:def.mag, scope:def.scope||null, equippedSlot:slot, def});
      }
    }
  }
  for(const k in state.inventory){
    const [id,r]=k.split('@');
    if(r!=='傳奇'&&r!=='具名') continue;
    const def=itemDef(id);
    if(!def) continue;
    const baseId = def.named ? def.baseId : id;
    if(!WEAPONS[baseId]) continue;
    const rules=WEAPON_MOD_RULES[baseId]||{mags:[],scopes:[]};
    const magOpts = getMagOptionsForWeapon(baseId);
    const scopeOpts = rules.scopes||[];
    if(magOpts.length || scopeOpts.length){
      candidates.push({id, rarity:r, baseId, mag:def.mag, scope:def.scope||null, equippedSlot:null, def, count:state.inventory[k]});
    }
  }
  let body='<div style="font-size:11px;color:#e8a33d;font-weight:bold;margin-bottom:6px">🔧 改造傳奇武器</div>';
  body+='<div style="font-size:9px;color:#7a6f60;margin-bottom:8px">改造需要：對應武器熟練度滿級（Lv.'+MAX_PROF_LEVEL+'）</div>';
  body+=`<div id="mod-queue-area">${renderModQueueHtml(workbenchLv)}</div>`;
  if(!candidates.length){
    body+='<div class="empty-hint">沒有可改造的傳奇武器</div>';
    body+='<div style="font-size:9px;color:#7a6f60;margin-top:8px;padding:6px;background:#1a1510;border-radius:4px">可改造的傳奇武器需：<br>· 稀有度為傳奇或具名<br>· 具備改造槽位（彈匣/瞄具）</div>';
    openModal({title:'工作台',body});
    return;
  }
  for(const c of candidates){
    const wdef=WEAPONS[c.baseId];
    const rules=WEAPON_MOD_RULES[c.baseId]||{mags:[],scopes:[]};
    const typeMaxed=isProfMaxed(wdef.type);
    const eqLabel=c.equippedSlot?'（裝備中）':`×${c.count||1}`;
    body+=`<div class="item-row" data-idx="${candidates.indexOf(c)}" style="${typeMaxed?'':'opacity:.5'}"><div class="icon">${itemIcon(c.id,30)}</div><div class="info"><div class="nm ${c.rarity==='具名'?'r-具名':'r-傳奇'}">${c.def.name} ${eqLabel}</div><div class="sub">彈匣：${getMagOptionsForWeapon(c.baseId).join('/')||'—'} ｜ 瞄具：${(rules.scopes||[]).join('/')||'—'}</div><div class="sub" style="color:${typeMaxed?'#4caf50':'#e05252'}">熟練度 ${Math.floor(state.proficiency[wdef.type]||0)}/${MAX_PROF_LEVEL}</div></div></div>`;
  }
  const bd=openModal({title:'工作台 · 改造',body});
  if(modQueueTimer){clearInterval(modQueueTimer);modQueueTimer=null;}
  modQueueTimer=setInterval(()=>{const qa=document.getElementById('mod-queue-area');if(!qa){if(modQueueTimer){clearInterval(modQueueTimer);modQueueTimer=null;}return;}qa.innerHTML=renderModQueueHtml(workbenchLv);},500);
  $$('.item-row[data-idx]',bd).forEach(r=>{
    r.onclick=()=>{
      const idx = parseInt(r.dataset.idx);
      const c = candidates[idx];
      const wdef=WEAPONS[c.baseId];
      if(!isProfMaxed(wdef.type)){notify(`${wdef.type} 熟練度未滿級`,'error');return;}
      closeModal();
      const initMag = (c.mag === wdef.mag) ? null : c.mag;
      const initScope = c.scope || null;
      openModdingOptions(c.baseId, c.rarity, c.equippedSlot, workbenchLv, {mag: initMag, scope: initScope}, c.id, c.rarity, () => openModding(workbenchLv));
    };
  });
}
function openModdingOptions(baseId, baseRarity, equippedSlot, workbenchLv, state_mod, originalId, originalRarity, onCancel){
  const wdef=WEAPONS[baseId];
  const rules=WEAPON_MOD_RULES[baseId]||{mags:[],scopes:[]};
  if(!state_mod)state_mod={mag:null,scope:null};
  const defaultMag = wdef.mag;
  const magOptions = getMagOptionsForWeapon(baseId);
  function renderModBody(){
    let body='';
    body+=`<div style="font-size:12px;font-weight:bold;color:#e8a33d;margin-bottom:4px">${wdef.name} <span class="r-傳奇">(傳奇)</span></div>`;
    body+=`<div style="font-size:10px;color:#7a6f60;margin-bottom:8px">基礎彈匣：${defaultMag}｜口徑：${wdef.cal}</div>`;
    if(magOptions.length){
      body+=`<div style="color:#e8a33d;font-weight:bold;font-size:11px;margin:8px 0 4px">彈匣擴展（可選）</div>`;
      body+=`<div class="mod-opt ${state_mod.mag===null?'on':''}" data-opt="mag" data-val=""><div class="nm">保持原彈匣（${defaultMag}）</div><div class="bonus">—</div></div>`;
      for(const m of magOptions){
        if(m === defaultMag) continue;
        const bonus = m - defaultMag;
        body+=`<div class="mod-opt ${state_mod.mag===m?'on':''}" data-opt="mag" data-val="${m}"><div class="nm">${m} 發彈匣</div><div class="bonus">容量 +${bonus}</div></div>`;
      }
    }
    if(rules.scopes&&rules.scopes.length){
      const sortedScopes=rules.scopes.slice().sort((a,b)=>(SCOPE_BONUS[b]||0)-(SCOPE_BONUS[a]||0));
      body+=`<div style="color:#e8a33d;font-weight:bold;font-size:11px;margin:8px 0 4px">瞄具（可選）</div>`;
      body+=`<div class="mod-opt ${state_mod.scope===null?'on':''}" data-opt="scope" data-val=""><div class="nm">不裝瞄具</div><div class="bonus">—</div></div>`;
      for(const s of sortedScopes){body+=`<div class="mod-opt ${state_mod.scope===s?'on':''}" data-opt="scope" data-val="${s}"><div class="nm">${SCOPE_NAME[s]||s}</div><div class="bonus">命中 +${SCOPE_BONUS[s]||0}%</div></div>`;}
    }
    const mag=state_mod.mag;const scope=state_mod.scope;
    if(mag||scope){
      const newName=namedWeaponName(baseId,mag,scope);
      const totalCost={};
      if(mag){const c=calcModCost(baseId,mag,null);for(const k in c)totalCost[k]=(totalCost[k]||0)+c[k];}
      if(scope){const c=calcModCost(baseId,null,scope);for(const k in c)totalCost[k]=(totalCost[k]||0)+c[k];}
      const totalTime=calcModTime(baseId,mag,scope);
      body+=`<div class="divider"></div>`;
      body+=`<div style="color:#a45ede;font-weight:bold;font-size:12px;margin:4px 0">${newName}</div>`;
      let ok=true;
      for(const [k,v] of Object.entries(totalCost)){const have=materialEquivalent(k);const ok2=have>=v;if(!ok2)ok=false;body+=`<div class="stat-line"><span class="k">${MATERIALS[k].name}</span><span class="v" style="color:${ok2?'#4caf50':'#e05252'}">${have}/${v}</span></div>`;}
      body+=`<div class="stat-line"><span class="k">花費時間</span><span class="v">${totalTime} 秒</span></div>`;
      return {body,ok,totalCost,totalTime};
    }
    return {body,ok:false,totalCost:{},totalTime:0};
  }
  const result=renderModBody();
  const ft=el('div','modal-ft');
  ft.innerHTML=`<button class="btn primary" id="m-confirm" ${result.ok?'':'disabled'}>改造</button><button class="btn ghost" id="m-exit">退出</button>`;
  const bd=openModal({title:`改造 ${wdef.name}`,body:result.body,footer:ft});
  $$('.mod-opt',bd).forEach(o=>{
    o.onclick=()=>{
      const opt=o.dataset.opt;const val=o.dataset.val;
      if(opt==='mag')state_mod.mag=val?parseInt(val,10):null;
      if(opt==='scope')state_mod.scope=val||null;
      closeModal();
      openModdingOptions(baseId,baseRarity,equippedSlot,workbenchLv,state_mod,originalId,originalRarity,onCancel);
    };
  });
  ft.querySelector('#m-exit').onclick=()=>{ closeModal(); if(onCancel) onCancel(); };
  ft.querySelector('#m-confirm').onclick=()=>{
    const r=renderModBody();
    if(!r.ok){notify('材料不足','error');return;}
    const maxQueue=workbenchLv||1;
    if(!state.crafting)state.crafting=[];
    if(state.crafting.length>=maxQueue){notify(`改造隊列已滿（上限 ${maxQueue}）`,'error');return;}
    for(const [k,v] of Object.entries(r.totalCost))consumeMaterial(k,v);
    state.crafting.push({type:'mod',modInfo:{baseId,baseRarity,mag:state_mod.mag,scope:state_mod.scope,fromEquippedSlot:equippedSlot,originalId,originalRarity},time:r.totalTime,startTime:Date.now()});
    save();closeModal();
    notify('已加入改造隊列','ok');
  };
}
function rarityPolicyBlockHTML(prefix, title, ctx, showExclude){
  if(showExclude === undefined) showExclude = true;
  const pri = ctx.priority || '一般';
  const fb = ctx.fallback || 'desc';
  const ex = ctx.exclude || [];
  let h = `<div style="color:#e8a33d;font-weight:bold;font-size:11px;margin:10px 0 6px">${title}</div>`;
  h += `<div style="display:flex;align-items:center;gap:8px;padding:4px 0"><span style="flex:0 0 60px;color:#7a6f60;font-size:11px">優先使用</span><select id="${prefix}-pri" style="flex:1;background:#151210;color:#ddd;border:1px solid #2a231c;border-radius:4px;padding:4px 6px;font-size:11px">`;
  for(const r of RARITY_ORDER){h += `<option value="${r}" ${pri===r?'selected':''}>${r}</option>`;}
  h += `</select></div>`;
  if(showExclude){
    h += `<div style="display:flex;align-items:flex-start;gap:8px;padding:4px 0"><span style="flex:0 0 60px;color:#7a6f60;font-size:11px;padding-top:4px">不使用</span><div style="flex:1;display:flex;flex-wrap:wrap;gap:4px">`;
    for(const r of UI_RARITY_LIST){
      const on = ex.includes(r);
      const bc = on ? '#e05252' : '#3a2f25';
      const bg = on ? '#3a1a1a' : '#241d16';
      const tc = on ? '#e05252' : '#a89a85';
      h += `<label class="excl-label" data-prefix="${prefix}" data-r="${r}" style="cursor:pointer;font-size:10px;padding:3px 8px;border-radius:4px;border:1px solid ${bc};background:${bg};color:${tc};user-select:none;display:flex;align-items:center;gap:4px;line-height:1.2"><input type="checkbox" class="excl-cb" data-prefix="${prefix}" data-r="${r}" ${on?'checked':''} style="accent-color:#e05252;margin:0;width:auto;flex:0 0 auto">${r}</label>`;
    }
    h += `</div></div>`;
  }
  h += `<div style="display:flex;align-items:center;gap:8px;padding:4px 0"><span style="flex:0 0 60px;color:#7a6f60;font-size:11px">用罄後</span><select id="${prefix}-fb" style="flex:1;background:#151210;color:#ddd;border:1px solid #2a231c;border-radius:4px;padding:4px 6px;font-size:11px">`;
  h += `<option value="desc" ${fb==='desc'?'selected':''}>降序（傳奇→破舊）</option>`;
  h += `<option value="asc" ${fb==='asc'?'selected':''}>升序（破舊→傳奇）</option>`;
  h += `</select></div>`;
  return h;
}
function openPreference(){
  const p=state.preferences;
  let body='';
  body+=rarityPolicyBlockHTML('exp','🎯 探索模式彈藥',p.ammoExplore, true);
  body+=rarityPolicyBlockHTML('cmb','⚔️ 戰鬥模式彈藥',p.ammoCombat, false);
  body+=rarityPolicyBlockHTML('con','💊 消耗品使用',p.consume, false);
  /* ★ 手雷偏好：探索預設排除高稀有度，避免打 Boss 用的手雷被浪費 */
  body+=rarityPolicyBlockHTML('texp','💣 探索模式手雷',p.throwableExplore, true);
  body+=rarityPolicyBlockHTML('tcmb','💣 戰鬥模式手雷',p.throwableCombat, false);
  body+=`<div style="color:#e8a33d;font-weight:bold;font-size:11px;margin:10px 0 6px">🩸 自動使用消耗品血量閾值：${Math.round(p.autoConsumeThreshold*100)}%</div><input type="range" min="5" max="90" value="${Math.round(p.autoConsumeThreshold*100)}" id="thr-slider" style="width:100%">`;
  const bd=openModal({title:'⚙️ 偏好設定',body});
  const getCtx=(k)=>{
    if(k==='exp') return state.preferences.ammoExplore;
    if(k==='cmb') return state.preferences.ammoCombat;
    if(k==='con') return state.preferences.consume;
    if(k==='texp') return state.preferences.throwableExplore;
    if(k==='tcmb') return state.preferences.throwableCombat;
    return null;
  };
  for(const prefix of ['exp','cmb','con','texp','tcmb']){
    const ctx=getCtx(prefix);
    const pri=bd.querySelector('#'+prefix+'-pri');
    if(pri)pri.onchange=()=>{ctx.priority=pri.value;save();};
    const fb=bd.querySelector('#'+prefix+'-fb');
    if(fb)fb.onchange=()=>{ctx.fallback=fb.value;save();};
  }
  bd.addEventListener('change', function(e){
    var t = e.target;
    if(!t || !t.classList || !t.classList.contains('excl-cb')) return;
    var ctx = getCtx(t.dataset.prefix);
    if(!ctx) return;
    var r = t.dataset.r;
    if(!ctx.exclude) ctx.exclude = [];
    var idx = ctx.exclude.indexOf(r);
    if(t.checked){ if(idx<0) ctx.exclude.push(r); }
    else { if(idx>=0) ctx.exclude.splice(idx,1); }
    var label = t.closest('label');
    if(label){
      if(t.checked){ label.style.borderColor='#e05252';label.style.background='#3a1a1a';label.style.color='#e05252'; }
      else { label.style.borderColor='#3a2f25';label.style.background='#241d16';label.style.color='#a89a85'; }
    }
    save();
    try{
      var _keyMap = {exp:'ammoExplore', cmb:'ammoCombat', con:'consume', texp:'throwableExplore', tcmb:'throwableCombat'};
      var _key = _keyMap[t.dataset.prefix];
      console.log('[偏好儲存]', t.dataset.prefix, r, t.checked, 'exclude=', state.preferences[_key].exclude);
    }catch(_){}
  });
  bd.addEventListener('click', function(e){
    var t = e.target;
    if(!t) return;
    if(t.tagName === 'INPUT') return;
    var label = t.closest ? t.closest('.excl-label') : null;
    if(!label) return;
    e.preventDefault();
    var cb = label.querySelector('.excl-cb');
    if(!cb) return;
    cb.checked = !cb.checked;
    cb.dispatchEvent(new Event('change', { bubbles: true }));
  });
  $$('.excl-label',bd).forEach(label=>{
    label.onclick=(e)=>{
      if(e.target && (e.target.classList.contains('excl-cb') || e.target.tagName === 'INPUT')) return;
      e.preventDefault();
      const cb = label.querySelector('.excl-cb');
      if(!cb) return;
      const ctx=getCtx(cb.dataset.prefix);
      if(!ctx) return;
      const r=cb.dataset.r;
      if(!ctx.exclude)ctx.exclude=[];
      cb.checked = !cb.checked;
      const idx=ctx.exclude.indexOf(r);
      if(cb.checked){
        if(idx<0)ctx.exclude.push(r);
      } else {
        if(idx>=0)ctx.exclude.splice(idx,1);
      }
      if(cb.checked){
        label.style.borderColor='#e05252';label.style.background='#3a1a1a';label.style.color='#e05252';
      } else {
        label.style.borderColor='#3a2f25';label.style.background='#241d16';label.style.color='#a89a85';
      }
      save();
    };
  });
  const slider=bd.querySelector('#thr-slider');
  if(slider)slider.oninput=()=>{state.preferences.autoConsumeThreshold=parseInt(slider.value)/100;slider.previousElementSibling.textContent=`🩸 自動使用消耗品血量閾值：${slider.value}%`;save();};
}

let currentTab='explore';
function renderCurrentTab(){
  if(currentTab==='explore')renderExplore();
  else if(currentTab==='combat')renderCombat();
  else if(currentTab==='base')renderBase();
}
$$('.tab').forEach(t=>{
  t.onclick=()=>{
    if(BossModule.isActive()){if(!confirm('戰鬥尚未結束，確定要離開嗎？'))return;BossModule.battle.active=false;BossModule.battle=null;}
    currentTab=t.dataset.tab;
    if(currentTab==='base') _regionScrollPos=0;
    $$('.tab').forEach(x=>x.classList.toggle('active',x===t));
    renderCurrentTab();
  };
});

let lastTickTime=Date.now();
function onlineTick(){
  const now=Date.now();const dt=now-lastTickTime;lastTickTime=now;
  if(dt>EVENT_INTERVAL_MS*2){console.log('[tick] 偵測到離線中斷，時間差:',(dt/1000).toFixed(1),'秒');offlineSettle();return;}
  if(BossModule.isActive())return;
  doExploreTick();
}

setInterval(()=>{onlineTick();save();},EVENT_INTERVAL_MS);
setInterval(()=>{buildingTick();},30000);

function heroLoop(now){
  updateHeroAnim(now);
  if(currentTab === 'explore'){ renderExploreHeroCanvas(); }
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
    const elapsed=Date.now()-(state.lastSeen||Date.now());
    if(elapsed>60000){console.log('[init] 距上次儲存',(elapsed/1000).toFixed(1),'秒，觸發離線結算');offlineSettle();}
  } else {
    invAddRaw('6kh2','一般',1);
    invAddRaw('bandage','一般',3);
    invAddRaw('ai2','一般',1);
    invAddRaw('5.45_ps','一般',30);
    invAddRaw('9x19_ps','一般',16);
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
  console.log('=== 廢土求生',VERSION,'啟動 ===');

  setTimeout(async ()=>{
    const changed = await probeAssetVersion();
    if(changed){
      console.log('[assets] 重新渲染以套用新版資源');
      renderCurrentTab();
    }
  }, 500);
}
init();

document.addEventListener('click',e=>{
  const t=e.target.closest('.itm');
  if(t&&t.dataset.iid)openItemDetail(t.dataset.iid,t.dataset.irar);
});

window.WastelandGame={VERSION,get state(){return state;},save,renderCurrentTab,addProf,notify,offlineSettle,getMeleeHits,getOrCreateNamedItem,BossModule,probeAssetVersion,get assetVersion(){return ASSET_VERSION;}};

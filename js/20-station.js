'use strict';

const _ST_FIXED_SLOTS = 9;
const _ST_CREW_ROLES = ['commander', 'gunner', 'driver'];
const _ST_CREW_LABELS = { commander: '車長', gunner: '炮手', driver: '駕駛' };
const _ST_BELT_WIDS = { kpvt: 1, pkt: 1, nsvt: 1, '2a42': 1, '2a72': 1 };
const _ST_CALIBER_MAP = { pkt: 7.62, kpvt: 14.5, nsvt: 12.7, '2a42': 30, '2a72': 30, '2a28': 73, '2a70': 100, '2a46': 125, '2a46m1': 125 };
const _ST_PRESETS = {
  '穿燃': { name: '穿燃', desc: '穿甲燃燒彈鏈', img: 'ap' },
  '高爆': { name: '高爆', desc: '高爆彈鏈', img: 'he' },
  '混合': { name: '混合', desc: '穿甲 / 高爆交替', img: 'mix' }
};

const _ST_PRESET_DESC_BY_WID = {
  kpvt:  { '穿燃': 'B-32 / BZT 交替', '高爆': 'MD / MDZ 交替', '混合': 'B-32 / MD 交替' },
  nsvt:  { '穿燃': 'B-32 / BZT 交替', '高爆': 'MD / MDZ 交替', '混合': 'B-32 / MD 交替' },
  '2a42': { '穿燃': '3UBR6 穿甲曳光彈', '高爆': '3UOF8 高爆燃燒彈', '混合': '3UBR6 / 3UOF8 交替' },
  '2a72': { '穿燃': '3UBR6 穿甲曳光彈', '高爆': '3UOF8 高爆燃燒彈', '混合': '3UBR6 / 3UOF8 交替' },
  pkt:   { '穿燃': 'B-32 / BZT 交替' }
};
const _ST_SLOT_LABELS = { primaryWeapon: '主武器', helmet: '頭盔', body: '上衣', ammoPouch: '彈掛', ammoBox: '彈藥箱' };

function _stEnsureStyles(){
  if(document.getElementById('station-styles')) return;
  const st = document.createElement('style');
  st.id = 'station-styles';
  st.textContent = [
    '#station-page{position:fixed;top:0;left:0;right:0;bottom:calc(54px + env(safe-area-inset-bottom,0px));background:#0e0c0a;z-index:9300;display:none;flex-direction:column;overflow:hidden}',
    '#station-page.on{display:flex}',
    '.st-header{flex:0 0 auto;display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid #2a231c;background:#17140f}',
    '.st-title{font-size:14px;color:#e8a33d;font-weight:bold;flex:0 0 auto;max-width:45%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.st-veh{flex:1;display:flex;justify-content:flex-end;align-items:center;gap:8px;min-width:0}',
    '.st-veh .btn{padding:5px 12px;font-size:11px;border-radius:5px}',
    '.st-x{font-size:15px;color:#fff;padding:6px 12px;background:#6a2a2a;border:1px solid #6a2a2a;border-radius:6px;cursor:pointer;flex:0 0 auto;margin-left:4px;font-weight:bold}',
    '.st-body{flex:1;min-height:0;overflow-y:auto;padding:8px;display:flex;flex-direction:column;gap:8px;scrollbar-width:none}',
    '.st-body::-webkit-scrollbar{display:none}',
    '.st-section{background:#1a1510;border:1px solid #2a231c;border-radius:8px;padding:8px}',
    '.st-sec-title{font-size:12px;color:#e8a33d;font-weight:bold;margin-bottom:6px}',
    '.st-crew-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}',
    '.st-crew-role{font-size:10px;color:#7a6f60;text-align:center;margin-bottom:2px;font-weight:bold}',
    '.st-crew-card{position:relative;border:1.5px solid #3a2f25;border-radius:6px;padding:8px 6px;min-height:76px;cursor:pointer;display:flex;align-items:center;gap:6px;box-sizing:border-box}',
    '.st-crew-card.occupied{border-color:#4caf50}',
    '.st-crew-ico{width:40px;height:40px;flex:0 0 40px;display:flex;align-items:center;justify-content:center;border-radius:4px;overflow:hidden}',
    '.st-crew-ico img{width:100%;height:100%;object-fit:contain}',
    '.st-crew-info{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;line-height:1.2}',
    '.st-crew-name{font-size:12px;font-weight:bold;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.st-crew-stat{font-family:monospace;font-size:10px;color:#fff;white-space:nowrap}',
    '.st-passenger-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}',
    '.st-passenger-card{position:relative;border:1.5px solid #3a2f25;border-radius:6px;padding:8px 6px;cursor:pointer;display:flex;align-items:center;gap:6px;box-sizing:border-box;min-width:0;min-height:76px}',
    '.st-pass-ico{width:40px;height:40px;flex:0 0 40px;display:flex;align-items:center;justify-content:center;border-radius:4px;overflow:hidden}',
    '.st-pass-ico img{width:100%;height:100%;object-fit:contain}',
    '.st-pass-info{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;line-height:1.2}',
    '.st-pass-name{font-size:12px;font-weight:bold;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.st-pass-stat{font-family:monospace;font-size:10px;color:#fff;white-space:nowrap}',
    '.st-passenger-card.cant-go,.st-crew-card.cant-go,.tower-guard-btn.cant-go{filter:grayscale(1);opacity:0.45}',
    '.st-passenger-card.cant-go::after,.st-crew-card.cant-go::after,.tower-guard-btn.cant-go::after{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(to top right,transparent calc(50% - 0.5px),rgba(255,255,255,0.55) 50%,transparent calc(50% + 0.5px)),linear-gradient(to top left,transparent calc(50% - 0.5px),rgba(255,255,255,0.55) 50%,transparent calc(50% + 0.5px))}',
    '.st-belt-row{display:flex;align-items:center;gap:6px;padding:6px 8px;background:#241d16;border:1px solid #2a231c;border-radius:5px;margin-bottom:4px;font-size:11px;cursor:pointer}',
    '.st-belt-name{flex:0 0 auto;color:#e8a33d;font-weight:bold;white-space:nowrap;padding-right:8px}',
    '.st-belt-count{flex:1;text-align:center;color:#a89a85;font-family:monospace;font-size:10px}',
    '.st-belt-preset{flex:0 0 auto;display:flex;align-items:center;gap:4px;color:#7ee07e;font-size:10px}',
    '.st-belt-preset img{width:32px;height:32px;object-fit:contain;opacity:0.85}',
    '.st-main-row{display:flex;align-items:center;gap:6px;padding:6px 8px;background:#241d16;border:1px solid #2a231c;border-radius:5px;margin-bottom:4px;font-size:11px;cursor:pointer}',
    '.st-main-name{flex:0 0 auto;color:#e8a33d;font-weight:bold;white-space:nowrap;padding-right:8px}',
    '.st-main-icons{flex:1;display:flex;gap:4px;justify-content:flex-end;flex-wrap:wrap}',
    '.st-main-icon{position:relative;width:32px;height:32px;display:flex;align-items:center;justify-content:center;overflow:hidden}',
    '.st-main-icon img{width:90%;height:90%;object-fit:contain}',
    '.st-main-icon-lbl{position:absolute;bottom:-1px;right:1px;font-size:9px;color:#fff;background:rgba(0,0,0,.7);padding:0 2px;border-radius:2px;line-height:1.1;font-weight:bold}',
    '.st-main-curmax{margin-left:auto;color:#e8a33d;font-family:monospace;font-size:11px;font-weight:bold;flex:0 0 auto}',
    '.st-talent-chip{font-size:9px;padding:2px 6px;background:#2a1f10;border:1px solid #8a5f18;border-radius:3px;color:#ffd680}',
    '.st-pd-head{display:flex;gap:10px;align-items:center;padding:4px 0 10px}',
    '.st-pd-sprite{flex:0 0 56px;width:56px;height:56px;border-radius:8px;display:flex;align-items:center;justify-content:center;overflow:hidden;align-self:center}',
    '.st-pd-sprite img{width:100%;height:100%;object-fit:contain}',
    '.st-pd-info{flex:0 0 auto;min-width:0;display:flex;flex-direction:column;gap:2px;justify-content:center}',
    '.st-pd-name{font-size:14px;font-weight:bold}',
    '.st-pd-sub{font-size:11px;color:#7a6f60}',
    '.st-pd-heal-area{cursor:pointer;padding:6px 10px;border:1px solid #3a2f25;border-radius:5px;background:#241d16;display:flex;flex-direction:column;justify-content:center;gap:6px;flex:1;min-width:0;height:56px;box-sizing:border-box}',
    '.st-pd-heal-area:active{background:#1a1510}',
    '.st-pd-heal-bar{height:6px;background:#0e0c0a;border:1px solid #2a231c;border-radius:3px;overflow:hidden}',
    '.st-pd-heal-fill{height:100%;background:#4caf50}',
    '.st-pd-heal-row{display:flex;justify-content:space-between;align-items:center;font-size:10px;font-family:monospace}',
    '.st-pd-heal-txt{color:#fff}',
    '.st-pd-heal-btn{color:#e8a33d;font-weight:bold;font-size:10px}',
    '.st-talent-badge{width:56px;height:56px;box-sizing:border-box}',
    '.st-talent-badge.st-talent-empty{font-size:14px}',
    '.st-pd-talents{display:flex;flex-wrap:wrap;gap:4px;margin:4px 0 8px}',
    '.st-pd-section-title{font-size:11px;color:#e8a33d;font-weight:bold;margin:8px 0 4px}',
    '.st-pd-row{display:grid;grid-template-columns:repeat(3,72px);gap:6px;margin-bottom:6px}',
    '.st-pd-grenades{display:grid;grid-template-columns:repeat(3,72px);gap:6px}',
    '.st-pd-slot{position:relative;background:#1a1510;border:1.5px solid #3a2f25;border-radius:6px;cursor:pointer;display:flex;align-items:center;justify-content:center;width:72px;height:72px;box-sizing:border-box;overflow:hidden;padding:0}',
    '.st-pd-slot.filled{border-color:#5a4410}',
    '.st-pd-slot-icon{position:absolute;inset:0;z-index:1;display:flex;align-items:center;justify-content:center;overflow:hidden}',
    '.st-pd-slot-icon img{width:100%!important;height:100%!important;object-fit:contain;display:block;padding:8px;box-sizing:border-box}',
    '.st-pd-slot-icon.empty{font-size:14px;color:#3a2f25;background:#0e0c0a}',
    '.st-pd-slot-lbl{position:absolute;top:2px;left:3px;z-index:10;pointer-events:none;font-size:9px;color:#fff;background:rgba(0,0,0,.75);padding:0 3px;border-radius:2px;line-height:1.3;font-weight:bold}',
    '.st-pd-slot-wt{position:absolute;bottom:2px;right:3px;z-index:10;pointer-events:none;font-size:9px;color:#fff;font-weight:bold;background:rgba(0,0,0,.75);padding:0 3px;border-radius:2px;line-height:1.3}',
    '.st-pd-grenade{position:relative;background:#1a1510;border:1.5px solid #3a2f25;border-radius:6px;display:flex;align-items:center;justify-content:center;width:72px;height:72px;cursor:pointer;box-sizing:border-box;overflow:hidden;padding:0}',
    '.st-pd-grenade.filled{border-color:#5a4410}',
    '.st-pd-grenade-icon{position:absolute;inset:0;z-index:1;display:flex;align-items:center;justify-content:center;overflow:hidden}',
    '.st-pd-grenade-icon img{width:100%!important;height:100%!important;object-fit:contain;display:block;padding:8px;box-sizing:border-box}',
    '.st-pd-grenade-icon.empty{font-size:14px;color:#3a2f25;background:#0e0c0a}',
    '.st-pd-grenade-wt{position:absolute;bottom:2px;right:3px;z-index:10;pointer-events:none;font-size:9px;color:#fff;font-weight:bold;background:rgba(0,0,0,.75);padding:0 3px;border-radius:2px;line-height:1.3}',
    '.st-pd-grenade-lbl{position:absolute;top:2px;left:3px;z-index:10;pointer-events:none;font-size:9px;color:#fff;background:rgba(0,0,0,.75);padding:0 3px;border-radius:2px;line-height:1.3;font-weight:bold}',
    '.item-row.disabled{opacity:0.45;cursor:not-allowed;pointer-events:none}',
    '.st-main-slider{width:100%;accent-color:#e8a33d;margin:4px 0}',
    '.st-ammo-cell{padding:8px;background:#1a1510;border:1px solid #2a231c;border-radius:5px;margin-bottom:6px}',
    '.st-ammo-cell-hd{display:flex;align-items:center;gap:8px;margin-bottom:4px}',
    '.st-ammo-cell-hd img{width:32px;height:32px;object-fit:contain;flex:0 0 auto}',
    '.st-ammo-cell-hd .nm{flex:1;color:#e8a33d;font-weight:bold;font-size:12px}',
    '.st-ammo-cell-hd .cnt{color:#fff;font-family:monospace;font-size:14px;font-weight:bold}',
    '@media (max-width:420px){.st-passenger-card,.st-crew-card{min-height:64px;padding:6px 4px;gap:4px}.st-pass-ico,.st-crew-ico{width:32px;height:32px;flex:0 0 32px}.st-pass-name,.st-crew-name{font-size:11px}.st-pass-stat,.st-crew-stat{font-size:9px}.st-belt-preset img{width:24px;height:24px}.st-main-icon{width:26px;height:26px}.st-pd-slot,.st-pd-grenade{width:56px;height:56px}.st-pd-row,.st-pd-grenades{grid-template-columns:repeat(3,56px);gap:4px}.st-veh .btn{padding:4px 8px;font-size:10px}.st-title{font-size:12px;max-width:40%}.st-pd-sprite{flex:0 0 44px;width:44px;height:44px}.st-pd-heal-area{height:44px;padding:4px 8px}.st-belt-name,.st-main-name{font-size:10px;padding-right:4px}.st-talent-badge{width:44px;height:44px}}'
    ,'.st-passenger-card.over-cap::after,.st-crew-card.over-cap::after{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(to top right,transparent calc(50% - 0.5px),rgba(255,255,255,0.55) 50%,transparent calc(50% + 0.5px)),linear-gradient(to top left,transparent calc(50% - 0.5px),rgba(255,255,255,0.55) 50%,transparent calc(50% + 0.5px))}'
  ].join('');
  document.head.appendChild(st);
}

function _stInit(){
  if(!state.station) state.station = { crew: {}, passengers: [] };
  const s = state.station;
  if(!s.crew) s.crew = {};
  for(let i = 0; i < _ST_CREW_ROLES.length; i++){
    const r = _ST_CREW_ROLES[i];
    if(typeof s.crew[r] === 'undefined') s.crew[r] = null;
  }
  if(!Array.isArray(s.passengers)) s.passengers = [];
  return s;
}

function _stBlank(){
  return {
    srvId: null,
    primaryWeapon: null, primaryWeaponRarity: '', primaryWeaponBoxCount: 0,
    ammoPouch: null, ammoBox: null,
    helmet: null, helmetRarity: '',
    body: null, bodyRarity: '',
    grenades: [null, null, null]
  };
}

function _stNormG(p){
  if(!Array.isArray(p.grenades)){ p.grenades = [null, null, null]; return; }
  for(let i = 0; i < p.grenades.length; i++){
    const g = p.grenades[i];
    if(!g) continue;
    if(typeof g === 'string'){
      let r = '一般';
      for(const k in state.inventory){
        const kp = k.split('@');
        if(kp[0] === g){ r = kp[1]; break; }
      }
      p.grenades[i] = { id: g, rarity: r };
    } else if(typeof g === 'object' && g.id && !g.rarity){
      g.rarity = '一般';
    } else if(typeof g !== 'object'){
      p.grenades[i] = null;
    }
  }
}

function _stPrune(s){
  if(!s) return;
  
  // 清理車組
  if(s.crew){
    for(const r of _ST_CREW_ROLES){
      const sid = s.crew[r];
      if(sid){
        let found = false;
        for(let j = 0; j < state.servants.length; j++){
          if(state.servants[j].id === sid){ found = true; break; }
        }
        if(!found) s.crew[r] = null;
      }
    }
  }

  // 清理載員
  if(!Array.isArray(s.passengers)) return;
  const v = [];
  for(let i = 0; i < s.passengers.length; i++){
    const p = s.passengers[i];
    let found = false;
    for(let j = 0; j < state.servants.length; j++){
      if(state.servants[j].id === p.srvId){ found = true; break; }
    }
    if(found){ _stNormG(p); v.push(p); }
  }
  if(v.length !== s.passengers.length) s.passengers = v;
}

function _stPassW(p){
  if(!p) return 0;
  let w = 0;
  if(p.primaryWeapon){
    if(AMMO[p.primaryWeapon]) w += calcAmmoBoxWeight(p.primaryWeapon);
    else w += getItemWeight(p.primaryWeapon, p.primaryWeaponRarity || '一般');
  }
  if(p.ammoPouch){
    const c = (AMMO[p.ammoPouch.ammoId] || {}).cal || '5.45';
    w += 0.5 + (AMMO_UNIT_WEIGHT[c] || 0.01) * (p.ammoPouch.count || 0);
  }
  if(p.ammoBox) w += calcAmmoBoxWeight(p.ammoBox.ammoId);
  if(p.helmet) w += getItemWeight(p.helmet, p.helmetRarity || '一般');
  if(p.body) w += getItemWeight(p.body, p.bodyRarity || '一般');
  if(Array.isArray(p.grenades)){
    for(let i = 0; i < p.grenades.length; i++){
      const g = p.grenades[i];
      if(!g) continue;
      const gid = typeof g === 'string' ? g : g.id;
      if(gid) w += (ITEM_WEIGHT[gid] || 0.5);
    }
  }
  return w;
}

function _stOcc(){
  const ids = {};
  const s = _stInit();
  for(let i = 0; i < _ST_CREW_ROLES.length; i++){
    const r = _ST_CREW_ROLES[i];
    if(s.crew[r]) ids[s.crew[r]] = 'crew';
  }
  for(let j = 0; j < s.passengers.length; j++){
    if(s.passengers[j] && s.passengers[j].srvId) ids[s.passengers[j].srvId] = 'passenger';
  }
  return ids;
}

function _stFmtNum(n){
  if(n == null || isNaN(n)) return '0';
  const v = Math.floor(Math.abs(n));
  const sign = n < 0 ? '-' : '';
  if(v < 10000) return sign + v;
  if(v < 1000000) return sign + Math.round(v / 1000) + 'K';
  if(v < 10000000) return sign + (v / 1000000).toFixed(1) + 'M';
  return sign + Math.round(v / 1000000) + 'M';
}

function _stTalentBadges(srv){
  const tal = srv && srv.talents ? srv.talents : [];
  const icons = { gunner_mastery: '🎯', commander_sense: '👁', driver_instinct: '🚗', strongman: '💪', bombardier: '💣', ammo_handler: '🎒' };
  const base = 'display:flex;flex-direction:column;align-items:center;justify-content:center;border-radius:4px;flex:0 0 auto;gap:2px;line-height:1;padding:2px 0';
  if(!tal.length){
    return '<span class="st-talent-badge st-talent-empty" style="' + base + ';background:#1a1510;border:1px solid #3a2f25;color:#3a2f25">·</span>';
  }
  const first = tal[0];
  const ic = icons[first] || '?';
  const extra = tal.length - 1;
  let h = '<span class="st-talent-badge" data-talent="' + first + '" style="' + base + ';background:#2a1f10;border:1px solid #8a5f18;color:#ffd680">';
  h += '<span style="font-size:18px;line-height:1">' + ic + '</span>';
  if(extra > 0){
    h += '<span style="font-size:9px;background:#e8a33d;color:#0e0c0a;border-radius:6px;padding:0 3px;line-height:1.2;font-weight:bold;min-width:14px;text-align:center">+' + extra + '</span>';
  }
  h += '</span>';
  return h;
}

function _stConsumeLowestMed(){
  const _rl = ['破舊', '一般', '庫存', '精品', '傳奇', '具名'];
  for(let ri = 0; ri < _rl.length; ri++){
    for(const k in state.inventory){
      const p = k.split('@');
      if(p[1] !== _rl[ri]) continue;
      if(state.inventory[k] <= 0) continue;
      const c = CONSUMABLES[p[0]];
      if(!c || !c.heal) continue;
      invRemove(p[0], p[1], 1);
      return { id: p[0], rarity: p[1] };
    }
  }
  return null;
}

function _stHealAreaHtml(hp, maxHp, hpPct, talentHtml){
  const _col = hp <= 0 ? '#e05252' : (hp < maxHp ? '#e8a33d' : '#4caf50');
  const _txtCol = hp <= 0 ? '#e05252' : '#fff';
  const _inner = '<div class="st-pd-heal-area" data-heal="1" style="flex:1;min-width:0">'
    + '<div class="st-pd-heal-bar"><div class="st-pd-heal-fill" style="width:' + hpPct + '%;background:' + _col + '"></div></div>'
    + '<div class="st-pd-heal-row"><span class="st-pd-heal-txt" style="color:' + _txtCol + '">HP ' + _stFmtNum(hp) + '/' + _stFmtNum(maxHp) + '</span><span class="st-pd-heal-btn">治療</span></div>'
    + '</div>';
  if(talentHtml){
    return '<div style="display:flex;align-items:stretch;gap:4px;flex:1;min-width:0">' + _inner + '<div style="flex:0 0 auto;display:flex;align-items:stretch">' + talentHtml + '</div></div>';
  }
  return _inner;
}

function _stCard(p, srv, pi, cap){
  const w = _stPassW(p);
  const mw = calcPassengerMaxWeight(srv);
  const over = w > mw;
  const _overCap = (typeof cap === 'number' && pi >= cap);
  const maxHp = (typeof servantMaxHp === 'function') ? servantMaxHp(srv) : 100;
  let hp = (srv.hp !== undefined && srv.hp !== null) ? srv.hp : maxHp;
  if(srv.injuredUntil && srv.injuredUntil > Date.now()) hp = 0;
  const bgc = rarityBg(srv.rarity);
  const hpCol = hp <= 0 ? '#e05252' : '#fff';
  const wtCol = over ? '#e05252' : '#fff';
  const _cantGo = (hp <= 0 || over) ? ' cant-go' : '';
  const _overCls = _overCap ? ' over-cap' : '';
  let h = '<div class="st-passenger-card' + _cantGo + _overCls + '" data-passenger="' + pi + '" style="border-color:' + bgc + '">';
  h += '<div class="st-pass-ico" style="background:' + bgc + '"><img src="icons/servants/' + srv.type + '.png' + assetSuffix('icons/servants/' + srv.type + '.png') + '"></div>';
  h += '<div class="st-pass-info">';
  h += '<div class="st-pass-name ' + rarityClass(srv.rarity) + '">' + servantLabel(srv) + '</div>';
  h += '<div class="st-pass-stat" style="color:' + hpCol + '">HP ' + _stFmtNum(hp) + '/' + _stFmtNum(maxHp) + '</div>';
  h += '<div class="st-pass-stat" style="color:' + wtCol + '">' + w.toFixed(1) + '/' + mw + 'kg</div>';
  h += '</div></div>';
  return h;
}

function _stEmptyCardAt(pi, isExtra){
  const extraLbl = isExtra ? '<div style="font-size:7px;color:#e05252;line-height:1.1">超載</div>' : '';
  const bg = isExtra ? '#100a06' : '#1a1510';
  const bc = isExtra ? '#5a2a2a' : '#3a2f25';
  const _overCls = isExtra ? ' over-cap' : '';
  return '<div class="st-passenger-card' + _overCls + '" data-add-passenger="' + pi + '" style="min-height:76px;background:' + bg + ';border:1.5px dashed ' + bc + ';display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;color:#5a5040;font-size:9px;padding:4px;cursor:pointer;box-sizing:border-box"><div style="font-size:22px;line-height:1;color:#3a2f25;font-weight:300">＋</div>' + extraLbl + '</div>';
}

function _stSlotHtml(slot, label, id, rar, cnt){
  let w = 0;
  if(id){
    if(slot === 'primaryWeapon'){ if(AMMO[id]) w = calcAmmoBoxWeight(id); else w = getItemWeight(id, rar); }
    else if(slot === 'helmet' || slot === 'body') w = getItemWeight(id, rar);
    else if(slot === 'ammoPouch'){ const c = (AMMO[id] || {}).cal || '5.45'; w = 0.5 + (AMMO_UNIT_WEIGHT[c] || 0.01) * (cnt || 0); }
    else if(slot === 'ammoBox') w = calcAmmoBoxWeight(id);
  }
  const bg = id ? rarityBg(rar) : '#241d16';
  let h = '<div class="st-pd-slot' + (id ? ' filled' : '') + '" data-slot="' + slot + '"' + (id ? ' style="border-color:' + bg + '"' : '') + '>';
  h += '<div class="st-pd-slot-lbl">' + label + '</div>';
  if(id){
    h += '<div class="st-pd-slot-icon" style="background:' + bg + '">' + itemIcon(id, 60) + '</div>';
    h += '<div class="st-pd-slot-wt">' + w.toFixed(1) + 'kg</div>';
  } else {
    h += '<div class="st-pd-slot-icon empty">＋</div>';
  }
  h += '</div>';
  return h;
}

function _stVehicleHealth(vid){
  const d = state.vehicleDamage && state.vehicleDamage[vid];
  if(!d) return { hp: 2600, max: 2600, pct: 100, repairing: false, destroyed: false };
  const maxParts = 800 + 1000 + 400;
  if(d.destroyed) return { hp: 0, max: maxParts, pct: 0, repairing: false, destroyed: true };
  if(d.repairUntil && d.repairUntil > Date.now()){
    return { hp: 0, max: maxParts, pct: 0, repairing: true, repairUntil: d.repairUntil, destroyed: false };
  }
  const sum = (d.parts.engine || 0) + (d.parts.tracks || 0) + (d.parts.gun || 0) + (d.parts.turret || 0);
  return { hp: Math.round(sum), max: maxParts, pct: Math.round(sum / maxParts * 100), repairing: false, destroyed: false };
}

function _stRender(page){
  const s = _stInit();
  _stPrune(s);
  const g = (typeof _garageInitState === 'function') ? _garageInitState() : null;
  const vid = g ? g.currentVehicle : 'btr80';
  const cap = (window.CARRIER_CAPACITY && window.CARRIER_CAPACITY[vid]) ? window.CARRIER_CAPACITY[vid] : 0;

  const _vh = _stVehicleHealth(vid);
  const _hpCol = _vh.pct > 60 ? '#4caf50' : (_vh.pct > 30 ? '#e8a33d' : '#e05252');
  const _repairTxt = _vh.repairing ? ('維修 ' + Math.ceil((_vh.repairUntil - Date.now()) / 60000) + 'm') : '';
  const _vname = (typeof VEHICLES !== 'undefined' && VEHICLES[vid]) ? VEHICLES[vid].name : vid;

  let html = '<div class="st-header">';
  html += '<div class="st-title">🚂 車站 · ' + _vname + '</div>';
  html += '<div class="st-veh">';
  html += '<span style="color:' + _hpCol + ';font-size:12px;font-weight:bold;font-family:monospace">' + _stFmtNum(_vh.hp) + '/' + _stFmtNum(_vh.max) + '</span>';
  if(_repairTxt) html += '<span style="color:#e05252;font-size:11px">' + _repairTxt + '</span>';
  html += '<button class="btn" id="st-repair-btn" style="background:#e8a33d;color:#0e0c0a;border-color:#e8a33d;font-weight:bold">維修</button>';
  html += '<button class="btn" id="st-heal-btn" style="background:#4caf50;color:#fff;border-color:#4caf50;font-weight:bold">治療</button>';
  html += '</div>';
  html += '<div class="st-x" id="st-close">✕</div></div>';
  html += '<div class="st-body" id="st-body-scroll">';

  const _crewFilled = [s.crew.commander, s.crew.gunner, s.crew.driver].filter(function(x){ return !!x; }).length;
  html += '<div class="st-section"><div class="st-sec-title">車組（' + _crewFilled + ' / 3）</div>';
  html += '<div class="st-crew-grid">';
  for(let i = 0; i < _ST_CREW_ROLES.length; i++){ html += '<div class="st-crew-role">' + _ST_CREW_LABELS[_ST_CREW_ROLES[i]] + '</div>'; }
  for(let i2 = 0; i2 < _ST_CREW_ROLES.length; i2++){
    const r2 = _ST_CREW_ROLES[i2];
    const sid2 = s.crew[r2];
    let srv2 = null;
    if(sid2) srv2 = state.servants.find(function(x){ return x.id === sid2; });
    if(srv2){
      const cbg = rarityBg(srv2.rarity);
      const maxHp2 = (typeof servantMaxHp === 'function') ? servantMaxHp(srv2) : 100;
      let hp2 = (srv2.hp !== undefined && srv2.hp !== null) ? srv2.hp : maxHp2;
      if(srv2.injuredUntil && srv2.injuredUntil > Date.now()) hp2 = 0;
      const hpCol2 = hp2 <= 0 ? '#e05252' : '#fff';
      const _isInjured = srv2.injuredUntil && srv2.injuredUntil > Date.now();
      html += '<div class="st-crew-card occupied' + (_isInjured ? ' cant-go' : '') + '" data-crew="' + r2 + '" style="border-color:' + cbg + '">';
      html += '<div class="st-crew-ico" style="background:' + cbg + '"><img src="icons/servants/' + srv2.type + '.png' + assetSuffix('icons/servants/' + srv2.type + '.png') + '"></div>';
      html += '<div class="st-crew-info">';
      html += '<div class="st-crew-name ' + rarityClass(srv2.rarity) + '">' + servantLabel(srv2) + '</div>';
      html += '<div class="st-crew-stat" style="color:' + hpCol2 + '">HP ' + _stFmtNum(hp2) + '/' + _stFmtNum(maxHp2) + '</div>';
      html += '</div></div>';
    } else {
      html += '<div class="st-crew-card" data-crew="' + r2 + '"><div class="st-crew-ico" style="color:#3a2f25;font-size:22px">＋</div><div class="st-crew-info"><div style="color:#5a5040;font-size:11px">空缺</div></div></div>';
    }
  }
  html += '</div></div>';

  html += '<div class="st-section"><div class="st-sec-title">載員（' + s.passengers.length + ' / ' + _ST_FIXED_SLOTS + '）</div><div class="st-passenger-grid">';
  for(let pi = 0; pi < _ST_FIXED_SLOTS; pi++){
    if(pi < s.passengers.length){
      const p = s.passengers[pi];
      const psrv = state.servants.find(function(x){ return x.id === p.srvId; });
      if(psrv) html += _stCard(p, psrv, pi, cap);
      else html += _stEmptyCardAt(pi, pi >= cap);
    } else {
      html += _stEmptyCardAt(pi, pi >= cap);
    }
  }
  html += '</div></div>';

  const _cost = (typeof vcEstimateCallCost === 'function') ? vcEstimateCallCost(vid) : { diff: 0 };
  const _avail = (typeof vcAmmoEquivTotal === 'function') ? Math.round(vcAmmoEquivTotal()) : 0;
  html += '<div class="st-section"><div class="st-sec-title" style="display:flex;justify-content:space-between;align-items:center"><div style="display:flex;gap:6px;align-items:center"><span>彈藥配置</span><button class="btn" id="st-garage-btn" style="padding:2px 10px;font-size:10px;background:#4caf50;color:#fff;border-color:#4caf50;font-weight:bold;border-radius:4px;flex:0 0 auto;white-space:nowrap;display:inline-flex;align-items:center;gap:4px">車場 <span style="font-size:11px;line-height:1;color:#fff;-webkit-text-fill-color:#fff">▶︎</span></button></div><span style="font-size:11px;color:#e8a33d;font-weight:bold;font-family:monospace">預估 ' + _stFmtNum(_cost ? _cost.diff : 0) + ' / 可用 ' + _stFmtNum(_avail) + '</span></div>';

  const ld = (typeof _getLoadout === 'function') ? _getLoadout(vid) : null;
  let beltRows = '';
  if(ld){
    const _beltKeys = [];
    for(const _bk in ld){ if(_ST_BELT_WIDS[_bk]) _beltKeys.push(_bk); }
    _beltKeys.sort(function(a, b){ return (_ST_CALIBER_MAP[a] || 999) - (_ST_CALIBER_MAP[b] || 999); });
    for(let _bi = 0; _bi < _beltKeys.length; _bi++){
      const wid = _beltKeys[_bi];
      let a = (state.vehicleAmmo && state.vehicleAmmo[vid] && state.vehicleAmmo[vid][wid]);
      if(!a){
        const _mx = (ld[wid].belts ? ld[wid].belts * ld[wid].perBelt : (ld[wid].rounds || 0));
        a = { current: _mx, max: _mx, preset: '穿燃' };
        if(!state.vehicleAmmo) state.vehicleAmmo = {};
        if(!state.vehicleAmmo[vid]) state.vehicleAmmo[vid] = {};
        state.vehicleAmmo[vid][wid] = a;
      }
      const mx = a.max || 0, cu = a.current || 0;
      const pn = _ST_PRESETS[a.preset] ? _ST_PRESETS[a.preset].name : (a.preset || '穿燃');
      const pimg = _ST_PRESETS[a.preset] ? _ST_PRESETS[a.preset].img : 'ap';
      const _calPrefix = (_ST_CALIBER_MAP[wid] ? _ST_CALIBER_MAP[wid] + 'mm ' : '');
      beltRows += '<div class="st-belt-row" data-belt-wid="' + wid + '">';
      beltRows += '<div class="st-belt-name">' + _calPrefix + wid.toUpperCase() + '</div>';
      beltRows += '<div class="st-belt-count">' + _stFmtNum(cu) + ' / ' + _stFmtNum(mx) + '</div>';
      beltRows += '<div class="st-belt-preset"><img src="icons/ammo/belt_' + pimg + '.png' + assetSuffix('icons/ammo/belt_' + pimg + '.png') + '" alt="">' + pn + ' ▶</div>';
      beltRows += '</div>';
    }
  }
  if(beltRows) html += beltRows;

  let mainRows = '';
  if(ld){
    const _mainKeys = [];
    for(const _mk in ld){ if(VEHICLE_MAIN_AMMO_POOL && VEHICLE_MAIN_AMMO_POOL[_mk]) _mainKeys.push(_mk); }
    _mainKeys.sort(function(a, b){ return (_ST_CALIBER_MAP[a] || 999) - (_ST_CALIBER_MAP[b] || 999); });
    for(let _mi2 = 0; _mi2 < _mainKeys.length; _mi2++){
      const wid2 = _mainKeys[_mi2];
      let a2 = (state.vehicleAmmo && state.vehicleAmmo[vid] && state.vehicleAmmo[vid][wid2]);
      if(!a2){
        a2 = { current: 0, max: ld[wid2].rounds || 0, breakdown: {}, presetBreakdown: {} };
        if(!state.vehicleAmmo) state.vehicleAmmo = {};
        if(!state.vehicleAmmo[vid]) state.vehicleAmmo[vid] = {};
        state.vehicleAmmo[vid][wid2] = a2;
      }
      if(!a2.breakdown && VEHICLE_AMMO_DEFAULT_BREAKDOWN[wid2]){
        a2.breakdown = JSON.parse(JSON.stringify(VEHICLE_AMMO_DEFAULT_BREAKDOWN[wid2]));
        a2.presetBreakdown = JSON.parse(JSON.stringify(a2.breakdown));
        let sum = 0;
        for(const k in a2.breakdown) sum += a2.breakdown[k];
        a2.current = sum;
      }
      if(!a2.presetBreakdown) a2.presetBreakdown = JSON.parse(JSON.stringify(a2.breakdown || {}));

      const defs = VEHICLE_MAIN_AMMO_POOL[wid2];
      let icons = '';
      for(let di = 0; di < defs.length; di++){
        const d = defs[di];
        const srcT = a2.presetBreakdown || a2.breakdown;
        const cnt = (srcT && srcT[d.id]) || 0;
        if(cnt <= 0) continue;
        icons += '<div class="st-main-icon"><img src="icons/ammo/' + (d.img || d.id) + '.png' + assetSuffix('icons/ammo/' + (d.img || d.id) + '.png') + '" alt=""><div class="st-main-icon-lbl">×' + _stFmtNum(cnt) + '</div></div>';
      }
      if(!icons) icons = '<div style="color:#5a5040;font-size:11px;padding:8px">未配置</div>';
      const _calPrefix2 = (_ST_CALIBER_MAP[wid2] ? _ST_CALIBER_MAP[wid2] + 'mm ' : '');
      let _dispMax = 0;
      const _srcD = a2 && (a2.presetBreakdown || a2.breakdown);
      if(_srcD){ for(const _dk in _srcD) _dispMax += (_srcD[_dk] || 0); }
      else { _dispMax = a2.max || 0; }
      mainRows += '<div class="st-main-row" data-main-wid="' + wid2 + '"><div class="st-main-name">' + _calPrefix2 + wid2.toUpperCase() + '</div><div class="st-main-icons">' + icons + '</div><div class="st-main-curmax">' + _stFmtNum(a2.current || 0) + ' / ' + _stFmtNum(_dispMax) + '</div></div>';
    }
  }
  if(mainRows) html += mainRows;
  if(ld && ld.atgm){
    const _atgmName140 = (typeof window._vehicleWeaponDisplayName === 'function') ? window._vehicleWeaponDisplayName('atgm', vid) : 'ATGM';
    html += '<div class="st-main-row" style="cursor:default;opacity:.85"><div class="st-main-name">' + _atgmName140 + '</div><div class="st-main-icons" style="color:#e8a33d;font-weight:bold">車型固定 ' + (ld.atgm.rounds || 0) + ' 發</div></div>';
  }

  html += '</div>';
  html += '</div>';

  let prevScroll = 0;
  const be = document.getElementById('st-body-scroll');
  if(be) prevScroll = be.scrollTop;
  page.innerHTML = html;
  const nb = document.getElementById('st-body-scroll');
  if(nb && prevScroll > 0) nb.scrollTop = prevScroll;

  const x = document.getElementById('st-close');
  if(x) x.onclick = closeStationPage;

  const cc = page.querySelectorAll('[data-crew]');
  for(let ci = 0; ci < cc.length; ci++){
    (function(elEl){
      elEl.onclick = function(){
        const _role = elEl.getAttribute('data-crew');
        const _sid = s.crew[_role];
        if(_sid) _stCrewDetail(_role, _sid);
        else _stPickCrew(_role);
      };
    })(cc[ci]);
  }

  const pc = page.querySelectorAll('[data-passenger]');
  for(let pci = 0; pci < pc.length; pci++){
    (function(el){
      el.onclick = function(){ _stDetail(parseInt(el.getAttribute('data-passenger'), 10)); };
    })(pc[pci]);
  }

  const aps = page.querySelectorAll('[data-add-passenger]');
  for(let _ai = 0; _ai < aps.length; _ai++){
    (function(el){
      el.onclick = function(){ _stPickPassenger(); };
    })(aps[_ai]);
  }

  const br = page.querySelectorAll('[data-belt-wid]');
  for(let bi = 0; bi < br.length; bi++){
    (function(el){
      el.onclick = function(){ _stPickBelt(vid, el.getAttribute('data-belt-wid')); };
    })(br[bi]);
  }

  const mr = page.querySelectorAll('[data-main-wid]');
  for(let mi = 0; mi < mr.length; mi++){
    (function(el){
      el.onclick = function(){ _stOpenMainAmmoPicker(vid, el.getAttribute('data-main-wid'), function(){ _stRefresh(); }); };
    })(mr[mi]);
  }

  const hb = page.querySelector('#st-heal-btn');
  if(hb) hb.onclick = function(){ _stHealAllCrew(vid); };

  const rb = page.querySelector('#st-repair-btn');
  if(rb) rb.onclick = function(){ _stOpenRepairDialog(vid); };

  const gb = page.querySelector('#st-garage-btn');
  if(gb) gb.onclick = function(){ closeStationPage(); if(typeof openGaragePage === 'function') openGaragePage(); };
}

function _stHealAllCrew(vid){
  const st = _stInit();
  const _now = Date.now();
  const _allInjured = [];
  const _injuredNames = [];
  for(const role of _ST_CREW_ROLES){
    const sid = st.crew[role];
    if(!sid) continue;
    const srv = state.servants.find(function(s){ return s.id === sid; });
    if(!srv) continue;
    if((srv.injuredUntil && srv.injuredUntil > _now) || srv.hp <= 0){
      _allInjured.push(srv);
      _injuredNames.push('車組·' + _ST_CREW_LABELS[role] + ' ' + servantLabel(srv));
    }
  }
  for(const p of st.passengers){
    if(!p || !p.srvId) continue;
    const srv = state.servants.find(function(s){ return s.id === p.srvId; });
    if(!srv) continue;
    if((srv.injuredUntil && srv.injuredUntil > _now) || srv.hp <= 0){
      _allInjured.push(srv);
      _injuredNames.push('載員 ' + servantLabel(srv));
    }
  }
  if(!_allInjured.length){
    if(typeof notify === 'function') notify('沒有需要治療的成員', 'warn');
    return;
  }
  /* rev-fix-heal-all-by-value: 按總缺失 HP 和庫存醫療值判斷 */
  let _totalMissingHp = 0;
  let _totalMaxHp = 0;
  for(const srv of _allInjured){
    const _maxHp = (typeof servantMaxHp === 'function') ? servantMaxHp(srv) : 100;
    const _curHp = (typeof srv.hp === 'number') ? srv.hp : _maxHp;
    _totalMissingHp += Math.max(0, _maxHp - _curHp);
    _totalMaxHp += _maxHp;
  }
  const _avgMaxHp = _allInjured.length > 0 ? (_totalMaxHp / _allInjured.length) : 100;
  const _totalMedValue = _stTotalMedValue(_avgMaxHp);
  const _canHeal = _totalMedValue >= _totalMissingHp;
  let body = '<div class="detail-sub">需要治療 ' + _allInjured.length + ' 名成員</div>';
  body += '<div class="stat-line"><span class="k">總缺失 HP</span><span class="v">' + Math.round(_totalMissingHp) + '</span></div>';
  body += '<div class="stat-line"><span class="k">庫存醫療值</span><span class="v" style="color:' + (_canHeal ? '#4caf50' : '#e05252') + '">' + Math.round(_totalMedValue) + '</span></div>';
  body += '<div class="divider"></div>';
  body += '<div style="font-size:11px;color:#e8a33d;font-weight:bold;margin-bottom:6px">名單</div>';
  for(const name of _injuredNames){
    body += '<div style="font-size:11px;color:#a89a85;padding:3px 0">· ' + name + '</div>';
  }
  const ft = document.createElement('div');
  ft.className = 'modal-ft';
  ft.innerHTML = '<button class="btn primary" id="st-heal-all-ok" ' + (_canHeal ? '' : 'disabled') + '>確認治療</button>';
  const bd = openModal({ title: '一鍵治療', body: body, footer: ft });
  const ok = ft.querySelector('#st-heal-all-ok');
  if(ok) ok.onclick = function(){
    let _healed = 0;
    for(const srv of _allInjured){
      const r = _stHealServantByValue(srv, (typeof servantMaxHp === 'function') ? servantMaxHp(srv) : 100);
      if(r.used.length > 0) _healed++;
    }
    save();
    closeModal();
    if(typeof notify === 'function') notify('治療 ' + _healed + ' 名成員');
    _stRefresh();
  };
}

function _stOpenRepairDialog(vid){
  const _vh = _stVehicleHealth(vid);
  const dmgPct = Math.max(1, 100 - _vh.pct);
  const _c = {
    metal: Math.max(5, Math.round(50 * dmgPct / 100)),
    gears: Math.max(2, Math.round(20 * dmgPct / 100)),
    screws: Math.max(2, Math.round(20 * dmgPct / 100))
  };
  const metal = materialEquivalent('metal');
  const gears = materialEquivalent('gears');
  const screws = materialEquivalent('screws');
  const canRepair = metal >= _c.metal && gears >= _c.gears && screws >= _c.screws;

  let body = '<div style="font-size:11px;color:#7a6f60;margin-bottom:8px">完好度 ' + _vh.pct + '%，需消耗材料</div>';
  body += '<div style="display:flex;justify-content:space-between;font-size:11px;padding:2px 0"><span>金屬廢料</span><span style="color:' + (metal >= _c.metal ? '#4caf50' : '#e05252') + '">' + Math.floor(metal) + '/' + _c.metal + '</span></div>';
  body += '<div style="display:flex;justify-content:space-between;font-size:11px;padding:2px 0"><span>齒輪</span><span style="color:' + (gears >= _c.gears ? '#4caf50' : '#e05252') + '">' + Math.floor(gears) + '/' + _c.gears + '</span></div>';
  body += '<div style="display:flex;justify-content:space-between;font-size:11px;padding:2px 0"><span>螺絲</span><span style="color:' + (screws >= _c.screws ? '#4caf50' : '#e05252') + '">' + Math.floor(screws) + '/' + _c.screws + '</span></div>';
  const ft = document.createElement('div');
  ft.className = 'modal-ft';
  ft.innerHTML = '<button class="btn primary" id="st-repair-ok"' + (canRepair ? '' : ' disabled') + '>維修</button>';
  openModal({ title: '維修', body: body, footer: ft });
  const ok = ft.querySelector('#st-repair-ok');
  if(ok) ok.onclick = function(){
    if(!canRepair) return;
    consumeMaterial('metal', _c.metal);
    consumeMaterial('gears', _c.gears);
    consumeMaterial('screws', _c.screws);
    const d = (typeof _vEnsureDamage === 'function') ? _vEnsureDamage(vid) : (state.vehicleDamage && state.vehicleDamage[vid]);
    if(d){
      d.repairUntil = 0;
      d.destroyed = false;
      d.disabled = false;
      d.parts = { engine: 800, tracks: 1000, turret: 400 };
      if(d.weapons){ for(const _wid in d.weapons){ d.weapons[_wid].hp = d.weapons[_wid].max; } }
      d.members = { driver: 1, gunner: 1, commander: 1, player: 1 };
      d.ammoRackDamage = 0;
    }
    save();
    closeModal();
    _stRefresh();
  };
}

function _stPickBelt(vid, wid){
  const a = (state.vehicleAmmo && state.vehicleAmmo[vid] && state.vehicleAmmo[vid][wid]) || null;
  if(!a) return;
  const cur = a.preset || '穿燃';
  let body = '<div style="font-size:11px;color:#7a6f60;margin-bottom:8px">' + wid.toUpperCase() + ' · 彈鏈預設</div>';
  const _descMap = _ST_PRESET_DESC_BY_WID[wid] || null;
  for(const k in _ST_PRESETS){
    if(_descMap && !_descMap[k]) continue;
    const pr = _ST_PRESETS[k];
    const on = (k === cur);
    const _rowDesc = (_descMap && _descMap[k]) || pr.desc;
    body += '<div class="item-row" data-preset="' + k + '"' + (on ? ' style="border-color:#e8a33d;background:#2a1f10"' : '') + '>';
    body += '<div class="icon" style="background:transparent;border-color:transparent"><img src="icons/ammo/belt_' + pr.img + '.png' + assetSuffix('icons/ammo/belt_' + pr.img + '.png') + '" style="width:100%;height:100%;object-fit:contain" alt=""></div>';
    body += '<div class="info"><div class="nm">' + pr.name + '</div><div class="sub">' + _rowDesc + '</div></div>';
    if(on) body += '<div style="color:#e8a33d;font-weight:bold;padding:0 6px">✓</div>';
    body += '</div>';
  }
  const bd = openModal({ title: '彈鏈預設', body: body, onClose: function(){ closeModal(); _stRefresh(); } });
  const els = bd.querySelectorAll('[data-preset]');
  for(let i = 0; i < els.length; i++){
    (function(el){
      el.onclick = function(){
        a.preset = el.getAttribute('data-preset');
        a._mixToggle = false;
        save();
        closeModal();
        _stRefresh();
      };
    })(els[i]);
  }
}

function _stOpenMainAmmoPicker(vid, wid, onClose){
  const ld = (typeof _getLoadout === 'function') ? _getLoadout(vid) : null;
  if(!ld || !ld[wid]) return;
  const defs = VEHICLE_MAIN_AMMO_POOL[wid];
  if(!defs) return;
  const mr = ld[wid].rounds || 0;
  if(mr <= 0) return;

  let a = (state.vehicleAmmo && state.vehicleAmmo[vid] && state.vehicleAmmo[vid][wid]);
  if(!a) return;
  if(!a.breakdown){
    if(VEHICLE_AMMO_DEFAULT_BREAKDOWN[wid]){
      a.breakdown = JSON.parse(JSON.stringify(VEHICLE_AMMO_DEFAULT_BREAKDOWN[wid]));
    } else {
      a.breakdown = {};
    }
    let sum = 0;
    for(const k in a.breakdown) sum += a.breakdown[k];
    a.current = sum;
  }
  if(!a.presetBreakdown) a.presetBreakdown = JSON.parse(JSON.stringify(a.breakdown));

  function _rb(){
    const srcR = a.presetBreakdown || a.breakdown;
    /* rev-fix-ammo-pool-valid-ids: 只算 defs 中的有效 ID */
    const _validIdsR = defs.map(function(x){ return x.id; });
    let total = 0;
    for(const k in srcR){ if(_validIdsR.indexOf(k) >= 0) total += (srcR[k] || 0); }
    let h = '<div style="font-size:11px;color:#7a6f60;margin-bottom:8px">上限 ' + mr + ' 發 · 已配置 <span id="st-ammo-total" style="color:#e8a33d;font-weight:bold">' + total + '</span> 發</div>';
    for(let i = 0; i < defs.length; i++){
      const d = defs[i];
      const srcS = a.presetBreakdown || a.breakdown;
      const cnt = (srcS && srcS[d.id]) || 0;
      h += '<div class="st-ammo-cell"><div class="st-ammo-cell-hd"><img src="icons/ammo/' + d.id + '.png' + assetSuffix('icons/ammo/' + d.id + '.png') + '" alt=""><span class="nm">' + d.name + '</span><span class="cnt" id="st-ammo-cnt-' + d.id + '">' + cnt + '</span></div><input type="range" class="st-main-slider" data-ammo-id="' + d.id + '" min="0" max="' + mr + '" value="' + cnt + '"></div>';
    }
    h += '<button class="btn primary" id="st-ammo-confirm" style="width:100%;margin-top:8px">確認</button>';
    return h;
  }

  const bd = openModal({ title: vid.toUpperCase() + ' · ' + wid.toUpperCase() + ' 主炮彈藥', body: _rb() });
  const sliders = bd.querySelectorAll('.st-main-slider');
  for(let j = 0; j < sliders.length; j++){
    (function(sl){
      const id = sl.getAttribute('data-ammo-id');
      sl.oninput = function(){
        if(!a.presetBreakdown) a.presetBreakdown = JSON.parse(JSON.stringify(a.breakdown));
        /* rev-fix-ammo-pool-valid-ids: other 只算 defs 中的有效 ID，忽略舊 ID */
        const _validIdsIn = defs.map(function(x){ return x.id; });
        let v = parseInt(sl.value, 10) || 0;
        let other = 0;
        for(const k in a.presetBreakdown){ if(k !== id && _validIdsIn.indexOf(k) >= 0) other += (a.presetBreakdown[k] || 0); }
        const c = mr - other;
        if(v > c){ v = c; sl.value = c; }
        a.presetBreakdown[id] = v;
        const ce = bd.querySelector('#st-ammo-cnt-' + id);
        if(ce) ce.textContent = v;
        const te = bd.querySelector('#st-ammo-total');
        let nt = 0;
        for(const k2 in a.presetBreakdown){ if(_validIdsIn.indexOf(k2) >= 0) nt += (a.presetBreakdown[k2] || 0); }
        if(te) te.textContent = nt;
      };
      sl.onchange = function(){ save(); };
    })(sliders[j]);
  }
  const cb = bd.querySelector('#st-ammo-confirm');
  if(cb) cb.onclick = function(){
    if(a.presetBreakdown){
      /* rev-fix-ammo-pool-valid-ids: 確認時只保留 defs 中的有效 ID */
      const _validIdsOk = defs.map(function(x){ return x.id; });
      const _cleaned = {};
      for(const _k4 in a.presetBreakdown){
        if(_validIdsOk.indexOf(_k4) >= 0) _cleaned[_k4] = a.presetBreakdown[_k4];
      }
      a.breakdown = _cleaned;
      a.presetBreakdown = JSON.parse(JSON.stringify(_cleaned));
      let nt = 0;
      for(const _k5 in a.breakdown) nt += (a.breakdown[_k5] || 0);
      a.current = nt;
    }
    save();
    closeModal();
    if(typeof onClose === 'function') onClose();
  };
}

function _stCrewDetail(role, srvId){
  const srv = state.servants.find(function(x){ return x.id === srvId; });
  if(!srv){
    const s = _stInit();
    s.crew[role] = null;
    if(typeof save === 'function') save();
    if(typeof closeModal === 'function') closeModal();
    if(typeof _stRefresh === 'function') _stRefresh();
    if(typeof notify === 'function') notify('該僕人已不存在');
    return;
  }
  const td = SERVANT_TYPES[srv.type] || { name: '?' };
  const tal = (typeof getServantTalents === 'function') ? getServantTalents(srv) : [];
  const maxHp = (typeof servantMaxHp === 'function') ? servantMaxHp(srv) : 100;
  let hp = (srv.hp !== undefined && srv.hp !== null) ? srv.hp : maxHp;
  if(srv.injuredUntil && srv.injuredUntil > Date.now()) hp = 0;
  const inj = srv.injuredUntil && srv.injuredUntil > Date.now();
  const hpPct = maxHp > 0 ? Math.round(hp / maxHp * 100) : 0;

  let body = '';
  body += '<div class="st-pd-head">';
  body += '<div class="st-pd-sprite" style="background:' + rarityBg(srv.rarity) + '"><img src="icons/servants/' + srv.type + '.png' + assetSuffix('icons/servants/' + srv.type + '.png') + '"></div>';
  body += '<div class="st-pd-info">';
  body += '<div class="st-pd-name ' + rarityClass(srv.rarity) + '">' + servantLabel(srv) + '</div>';
  body += '<div class="st-pd-sub">Lv.' + srv.lv + ' · ' + td.name + '</div>';
  body += '</div>';
  body += _stHealAreaHtml(hp, maxHp, hpPct, _stTalentBadges(srv));
  body += '</div>';

  if(tal.length){
    body += '<div class="st-pd-talents">';
    for(let t = 0; t < tal.length; t++){
      const tDef = TALENT_DEFS[tal[t]];
      if(tDef) body += '<span class="st-talent-chip">' + tDef.name + '</span>';
    }
    body += '</div>';
  } else {
    body += '<div style="font-size:11px;color:#7a6f60;margin:4px 0 8px">無天賦</div>';
  }
  if(inj){
    const injMin = Math.ceil((srv.injuredUntil - Date.now()) / 60000);
    body += '<div style="color:#e05252;font-size:12px;font-weight:bold;padding:6px 0;text-align:center">重傷 · 剩 ' + injMin + ' 分鐘</div>';
  }

  const ft = document.createElement('div');
  ft.className = 'modal-ft';
  ft.innerHTML = '<button class="btn primary" id="st-cd-swap">更換</button><button class="btn danger" id="st-cd-remove">解除</button>';
  const bd = openModal({ title: '車組詳情 · ' + _ST_CREW_LABELS[role], body: body, footer: ft, onClose: function(){ closeModal(); _stRefresh(); } });

  const ha = bd.querySelector('.st-pd-heal-area');
  if(ha) ha.onclick = function(){
    if(hp >= maxHp){ if(typeof notify === 'function') notify('已滿血', 'warn'); return; }
    const _r = _stHealServantByValue(srv, maxHp);
    if(_r.used.length === 0){ if(typeof notify === 'function') notify('沒有醫療品', 'warn'); return; }
    save();
    closeModal();
    _stRefresh();
    _stCrewDetail(role, srvId);
  };

  const sb = ft.querySelector('#st-cd-swap');
  if(sb) sb.onclick = function(){ closeModal(); _stPickCrew(role); };

  const rb = ft.querySelector('#st-cd-remove');
  if(rb) rb.onclick = function(){
    _stInit().crew[role] = null;
    save();
    closeModal();
    _stRefresh();
  };
}

function _stPickCrew(role){
  const s = _stInit();
  const occ = _stOcc();
  const cur = s.crew[role];
  const avail = [];
  for(let i = 0; i < state.servants.length; i++){
    const srv = state.servants[i];
    const o = occ[srv.id];
    if(o && o !== 'crew') continue;
    if(o === 'crew' && srv.id !== cur) continue;
    avail.push(srv);
  }
  let body = '<div style="font-size:11px;color:#7a6f60;margin-bottom:8px">選擇 ' + _ST_CREW_LABELS[role] + '</div>';
  if(cur) body += '<div class="item-row" data-clear="1"><div class="icon">✕</div><div class="info"><div class="nm">解除</div><div class="sub">清空當前位置</div></div></div>';
  if(!avail.length) body += '<div class="empty-hint">沒有可用僕人</div>';
  for(let j = 0; j < avail.length; j++){
    const sv = avail[j];
    const td = SERVANT_TYPES[sv.type] || { name: '?' };
    const _inGarden = Array.isArray(sv.assignedPlots) && sv.assignedPlots.length > 0;
    body += '<div class="item-row" data-srv="' + sv.id + '"><div class="icon" style="background:' + rarityBg(sv.rarity) + '"><img src="icons/servants/' + sv.type + '.png' + assetSuffix('icons/servants/' + sv.type + '.png') + '" style="width:100%;height:100%;object-fit:contain"></div><div class="info"><div class="nm ' + rarityClass(sv.rarity) + '">' + servantLabel(sv) + (_inGarden ? ' 🌱工作中' : '') + '</div><div class="sub">Lv.' + sv.lv + ' ' + td.name + '</div></div></div>';
  }
  const bd = openModal({
    title: _ST_CREW_LABELS[role],
    body: body,
    onClose: function(){
      closeModal();
      setTimeout(function(){
        const _sid = state.station && state.station.crew ? state.station.crew[role] : null;
        if(_sid) _stCrewDetail(role, _sid);
        else _stRefresh();
      }, 40);
    }
  });
  const els = bd.querySelectorAll('.item-row');
  for(let k = 0; k < els.length; k++){
    (function(elEl){
      elEl.onclick = function(){
        if(elEl.getAttribute('data-clear')){ s.crew[role] = null; save(); closeModal(); _stRefresh(); return; }
        const sid = elEl.getAttribute('data-srv');
        const srv = (state.servants || []).find(function(x){ return x.id === sid; });
        if(!srv) return;
        const _inGarden = Array.isArray(srv.assignedPlots) && srv.assignedPlots.length > 0;
        const _doAdd = function(){
          s.crew[role] = sid;
          save();
          closeModal();
          _stRefresh();
          setTimeout(function(){ _stCrewDetail(role, sid); }, 50);
        };
        if(_inGarden){
          _openRelocateConfirm('車站', function(){
            srv.assignedPlots = [];
            _doAdd();
          }, function(){
            setTimeout(function(){ _stPickCrew(role); }, 50);
          });
        } else {
          _doAdd();
        }
      };
    })(els[k]);
  }
}

function _stPickPassenger(){
  const s = _stInit();
  const occ = _stOcc();
  const avail = [];
  for(let i = 0; i < state.servants.length; i++){
    if(!occ[state.servants[i].id]) avail.push(state.servants[i]);
  }
  let body = '<div style="font-size:11px;color:#7a6f60;margin-bottom:8px">選擇載員</div>';
  if(!avail.length) body += '<div class="empty-hint">沒有可用僕人</div>';
  for(let j = 0; j < avail.length; j++){
    const sv = avail[j];
    const td = SERVANT_TYPES[sv.type] || { name: '?' };
    const tal = (typeof getServantTalents === 'function') ? getServantTalents(sv) : [];
    const ts = tal.length ? ' · 天賦 ' + tal.length : '';
    const _inGarden = Array.isArray(sv.assignedPlots) && sv.assignedPlots.length > 0;
    body += '<div class="item-row" data-srv="' + sv.id + '"><div class="icon" style="background:' + rarityBg(sv.rarity) + '"><img src="icons/servants/' + sv.type + '.png' + assetSuffix('icons/servants/' + sv.type + '.png') + '" style="width:100%;height:100%;object-fit:contain"></div><div class="info"><div class="nm ' + rarityClass(sv.rarity) + '">' + servantLabel(sv) + (_inGarden ? ' 🌱工作中' : '') + '</div><div class="sub">Lv.' + sv.lv + ' ' + td.name + ts + '</div></div></div>';
  }
  const bd = openModal({ title: '添加載員', body: body, onClose: function(){ closeModal(); _stRefresh(); } });
  const els = bd.querySelectorAll('.item-row');
  for(let k = 0; k < els.length; k++){
    (function(el){
      el.onclick = function(){
        const sid = el.getAttribute('data-srv');
        const srv = (state.servants || []).find(function(x){ return x.id === sid; });
        if(!srv) return;
        const _inGarden = Array.isArray(srv.assignedPlots) && srv.assignedPlots.length > 0;
        const _doAdd = function(){
          const np = _stBlank();
          np.srvId = sid;
          s.passengers.push(np);
          const _newIdx = s.passengers.length - 1;
          save();
          closeModal();
          _stRefresh();
          setTimeout(function(){ _stDetail(_newIdx); }, 50);
        };
        if(_inGarden){
          _openRelocateConfirm('車站', function(){
            srv.assignedPlots = [];
            _doAdd();
          }, function(){
            setTimeout(function(){ _stPickPassenger(); }, 50);
          });
        } else {
          _doAdd();
        }
      };
    })(els[k]);
  }
}

function _stDetail(idx){
  const s = _stInit();
  const p = s.passengers[idx];
  if(!p) return;
  const srv = state.servants.find(function(x){ return x.id === p.srvId; });
  if(!srv){ _stRefresh(); return; }
  _stNormG(p);

  const tw = _stPassW(p);
  const mw = calcPassengerMaxWeight(srv);
  const tal = (typeof getServantTalents === 'function') ? getServantTalents(srv) : [];
  const maxHp = (typeof servantMaxHp === 'function') ? servantMaxHp(srv) : 100;
  let hp = (srv.hp !== undefined && srv.hp !== null) ? srv.hp : maxHp;
  if(srv.injuredUntil && srv.injuredUntil > Date.now()) hp = 0;
  const inj = srv.injuredUntil && srv.injuredUntil > Date.now();
  const hpPct = maxHp > 0 ? Math.round(hp / maxHp * 100) : 0;
  const isBomb = (tal.indexOf('bombardier') >= 0);
  const slots = isBomb ? 3 : 1;

  if(p.grenades.length !== slots){
    const _ng = new Array(slots);
    for(let _gi = 0; _gi < slots && _gi < p.grenades.length; _gi++) _ng[_gi] = p.grenades[_gi];
    p.grenades = _ng;
  }

  let body = '';
  body += '<div class="st-pd-head">';
  body += '<div class="st-pd-sprite" style="background:' + rarityBg(srv.rarity) + '"><img src="icons/servants/' + srv.type + '.png' + assetSuffix('icons/servants/' + srv.type + '.png') + '"></div>';
  body += '<div class="st-pd-info">';
  body += '<div class="st-pd-name ' + rarityClass(srv.rarity) + '">' + servantLabel(srv) + '</div>';
  body += '<div class="st-pd-sub">Lv.' + srv.lv + ' · ' + (SERVANT_TYPES[srv.type] ? SERVANT_TYPES[srv.type].name : '') + '</div>';
  body += '</div>';
  body += _stHealAreaHtml(hp, maxHp, hpPct, _stTalentBadges(srv));
  body += '</div>';

  if(tal.length){
    body += '<div class="st-pd-talents">';
    for(let t = 0; t < tal.length; t++){
      const td = TALENT_DEFS[tal[t]];
      if(td) body += '<span class="st-talent-chip">' + td.name + '</span>';
    }
    body += '</div>';
  }
  if(inj){
    const injMin = Math.ceil((srv.injuredUntil - Date.now()) / 60000);
    body += '<div style="color:#e05252;font-size:12px;font-weight:bold;padding:6px 0;text-align:center">重傷 · 剩 ' + injMin + ' 分鐘</div>';
  }

  body += '<div class="st-pd-section-title">主武器 + 彈藥箱</div><div class="st-pd-row">';
  body += _stSlotHtml('primaryWeapon', '主武器', p.primaryWeapon, p.primaryWeaponRarity, 0);
  body += _stSlotHtml('ammoBox', '彈藥箱', p.ammoBox ? p.ammoBox.ammoId : null, p.ammoBox ? p.ammoBox.rarity : '', p.ammoBox ? p.ammoBox.count : 0);
  body += '</div><div class="st-pd-section-title">護甲 + 彈掛</div><div class="st-pd-row">';
  body += _stSlotHtml('helmet', '頭盔', p.helmet, p.helmetRarity, 0);
  body += _stSlotHtml('body', '上衣', p.body, p.bodyRarity, 0);
  body += _stSlotHtml('ammoPouch', '彈掛', p.ammoPouch ? p.ammoPouch.ammoId : null, p.ammoPouch ? p.ammoPouch.rarity : '', p.ammoPouch ? p.ammoPouch.count : 0);
  body += '</div><div class="st-pd-section-title">手榴彈</div><div class="st-pd-grenades">';

  for(let g = 0; g < slots; g++){
    const gi = p.grenades[g];
    const gid = gi ? (typeof gi === 'string' ? gi : gi.id) : null;
    const gr = gi ? (typeof gi === 'string' ? '一般' : (gi.rarity || '一般')) : null;
    const gw = gid ? (ITEM_WEIGHT[gid] || 0.5) : 0;
    const bg = gid ? rarityBg(gr) : '';
    const _stockQ141 = gid ? ((typeof invCount === 'function') ? invCount(gid, gr) : 0) : 0;
    const _stockCol141 = _stockQ141 > 0 ? '#fff' : '#e05252';
    body += '<div class="st-pd-grenade' + (gid ? ' filled' : '') + '" data-grenade="' + g + '"' + (gid ? ' style="border-color:' + bg + '"' : '') + '>';
    body += '<div class="st-pd-grenade-lbl">#' + (g + 1) + '</div>';
    if(gid) body += '<div class="st-pd-grenade-icon" style="background:' + bg + '">' + itemIcon(gid, 60) + '</div><div class="st-pd-grenade-wt" style="color:' + _stockCol141 + '">×' + _stockQ141 + (_stockQ141 > 0 ? ' · ' + gw.toFixed(1) + 'kg' : ' 缺') + '</div>';
    else body += '<div class="st-pd-grenade-icon empty">＋</div>';
    body += '</div>';
  }
  body += '</div>';

  const ft = document.createElement('div');
  ft.className = 'modal-ft';
  ft.innerHTML = '<button class="btn primary" id="st-swap">更換</button><button class="btn danger" id="st-remove">移除</button>';
  const bd = openModal({ title: '載員詳情 · ' + tw.toFixed(1) + ' / ' + mw + ' kg' + (tw > mw ? ' ⚠' : ''), body: body, footer: ft, onClose: function(){ closeModal(); _stRefresh(); } });

  const ha = bd.querySelector('.st-pd-heal-area');
  if(ha) ha.onclick = function(){
    if(hp >= maxHp){ if(typeof notify === 'function') notify('已滿血', 'warn'); return; }
    const _r = _stHealServantByValue(srv, maxHp);
    if(_r.used.length === 0){ if(typeof notify === 'function') notify('沒有醫療品', 'warn'); return; }
    save();
    closeModal();
    _stRefresh();
    _stDetail(idx);
  };

  ft.querySelector('#st-remove').onclick = function(){
    _stReturnPassengerEquip(p);
    s.passengers.splice(idx, 1);
    save();
    closeModal();
    _stRefresh();
  };

  ft.querySelector('#st-swap').onclick = function(){
    closeModal();
    _stSwapPassenger(idx);
  };

  const se = bd.querySelectorAll('[data-slot]');
  for(let si = 0; si < se.length; si++){
    (function(el){ el.onclick = function(){ _stPickEquip(idx, el.getAttribute('data-slot')); }; })(se[si]);
  }
  const ge = bd.querySelectorAll('[data-grenade]');
  for(let gi2 = 0; gi2 < ge.length; gi2++){
    (function(el){ el.onclick = function(){ _stPickGrenade(idx, parseInt(el.getAttribute('data-grenade'), 10)); }; })(ge[gi2]);
  }
}

function _stSlotW(slot, p){
  if(!p) return 0;
  if(slot === 'primaryWeapon' && p.primaryWeapon){
    if(AMMO[p.primaryWeapon]) return calcAmmoBoxWeight(p.primaryWeapon);
    return getItemWeight(p.primaryWeapon, p.primaryWeaponRarity || '一般');
  }
  if(slot === 'helmet' && p.helmet) return getItemWeight(p.helmet, p.helmetRarity || '一般');
  if(slot === 'body' && p.body) return getItemWeight(p.body, p.bodyRarity || '一般');
  if(slot === 'ammoPouch' && p.ammoPouch){
    const c = (AMMO[p.ammoPouch.ammoId] || {}).cal || '5.45';
    return 0.5 + (AMMO_UNIT_WEIGHT[c] || 0.01) * (p.ammoPouch.count || 0);
  }
  if(slot === 'ammoBox' && p.ammoBox) return calcAmmoBoxWeight(p.ammoBox.ammoId);
  return 0;
}

function _stCandW(slot, it){
  if(slot === 'primaryWeapon'){ if(AMMO[it.id]) return calcAmmoBoxWeight(it.id); return getItemWeight(it.id, it.rarity); }
  if(slot === 'helmet' || slot === 'body') return getItemWeight(it.id, it.rarity);
  if(slot === 'ammoPouch'){ const c = (AMMO[it.id] || {}).cal || '5.45'; return 0.5 + (AMMO_UNIT_WEIGHT[c] || 0.01) * (it.count || 0); }
  if(slot === 'ammoBox') return calcAmmoBoxWeight(it.id);
  return 0;
}

function _stPickEquip(idx, slot){
  const s = _stInit();
  const p = s.passengers[idx];
  if(!p) return;
  const srv = state.servants.find(function(x){ return x.id === p.srvId; });
  if(!srv){ _stDetail(idx); return; }
  const tal = (typeof getServantTalents === 'function') ? getServantTalents(srv) : [];
  const tw = _stPassW(p);
  const mw = calcPassengerMaxWeight(srv);
  const csw = _stSlotW(slot, p);
  const bw = tw - csw;
  const list = [];
  let hint = '';

  if(slot === 'primaryWeapon'){
    for(const k in state.unlockedEquip){
      const pp = k.split('@');
      const d = itemDef(pp[0]);
      if(!d || d.slot !== 'primary') continue;
      list.push({ id: pp[0], rarity: pp[1], def: d, count: 0 });
    }
    if(tal.indexOf('ammo_handler') >= 0){
      for(const k5 in state.inventory){
        const pp5 = k5.split('@');
        if(!AMMO[pp5[0]]) continue;
        if(state.inventory[k5] <= 0) continue;
        const _bc = Math.min(AMMOBOX_CAPACITY, state.inventory[k5]);
        list.push({ id: pp5[0], rarity: pp5[1], def: AMMO[pp5[0]], count: _bc, isBox: true });
      }
    }
  } else if(slot === 'helmet' || slot === 'body'){
    const tgt = (slot === 'helmet') ? 'head' : 'top';
    for(const k2 in state.unlockedEquip){
      const pp2 = k2.split('@');
      const d2 = itemDef(pp2[0]);
      if(!d2 || d2.slot !== tgt) continue;
      const dv = ARMOR[d2.id] || {};
      list.push({ id: pp2[0], rarity: pp2[1], def: d2, count: 0, armorLv: dv.level || 0, armorVal: equipArmorValue(pp2[0], pp2[1]) });
    }
  } else if(slot === 'ammoPouch'){
    const pw = p.primaryWeapon;
    if(!pw) hint = '請先裝備主武器';
    else {
      const pd = itemDef(pw);
      const cal = pd ? pd.cal : null;
      if(!cal) hint = '主武器沒有口徑資訊';
      else {
        for(const k3 in state.inventory){
          const pp3 = k3.split('@');
          if(!AMMO[pp3[0]]) continue;
          if(AMMO[pp3[0]].cal !== cal) continue;
          if(state.inventory[k3] <= 0) continue;
          list.push({ id: pp3[0], rarity: pp3[1], def: AMMO[pp3[0]], count: Math.min(120, state.inventory[k3]) });
        }
        if(!list.length) hint = '庫存沒有主武器口徑彈藥';
      }
    }
  } else if(slot === 'ammoBox'){
    for(const k4 in state.inventory){
      const pp4 = k4.split('@');
      if(!AMMO[pp4[0]]) continue;
      if(state.inventory[k4] <= 0) continue;
      list.push({ id: pp4[0], rarity: pp4[1], def: AMMO[pp4[0]], count: Math.min(AMMOBOX_CAPACITY, state.inventory[k4]) });
    }
  }

  list.sort(function(a, b){
    const rd = sortByRarityDesc(a, b);
    return rd !== 0 ? rd : (a.def.name || '').localeCompare(b.def.name || '', 'zh-Hant');
  });

  let body = '';
  const hasCur = (slot === 'primaryWeapon' && p.primaryWeapon) || (slot === 'helmet' && p.helmet) || (slot === 'body' && p.body) || (slot === 'ammoPouch' && p.ammoPouch) || (slot === 'ammoBox' && p.ammoBox);
  if(hasCur) body += '<div class="item-row" data-clear="1"><div class="icon">✕</div><div class="info"><div class="nm">卸下</div><div class="sub">清空此欄</div></div></div>';
  if(hint) body += '<div class="empty-hint">' + hint + '</div>';
  else if(!list.length) body += '<div class="empty-hint">沒有可選項</div>';
  const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI'];

  for(let li = 0; li < list.length; li++){
    const it = list[li];
    const iw = _stCandW(slot, it);
    const dis = (bw + iw) > mw;
    let wl = iw.toFixed(1) + ' kg' + (dis ? ' · 超重' : '');
    if(it.count && (slot === 'ammoPouch' || slot === 'ammoBox')) wl += ' ×' + it.count;
    const _isArmorSlot = (slot === 'helmet' || slot === 'body');
    if(_isArmorSlot && it.armorVal) wl += ' · 甲' + it.armorVal;
    const _acStr = _isArmorSlot ? (_armorClassWithSub(it.def) || '') : '';
    const _acHtml = _acStr ? ' <span class="armor-class">' + _acStr + '</span>' : '';
    body += '<div class="item-row' + (dis ? ' disabled' : '') + '" data-eid="' + it.id + '" data-rid="' + it.rarity + '"><div class="icon" style="background:' + rarityBg(it.rarity) + '">' + itemIcon(it.id, 40) + '</div><div class="info"><div class="nm ' + rarityClass(it.rarity) + '">' + it.def.name + _acHtml + '</div><div class="sub">' + it.rarity + ' · ' + wl + '</div></div>' + (dis ? '<div class="cnt" style="color:#e05252;font-weight:bold">✕</div>' : '') + '</div>';
  }

  const _title = '選擇 ' + (_ST_SLOT_LABELS[slot] || slot) + ' · ' + tw.toFixed(1) + ' / ' + mw + ' kg' + (tw > mw ? ' ⚠' : '');
  const bd = openModal({ title: _title, body: body, onClose: function(){ closeModal(); _stDetail(idx); } });
  const rows = bd.querySelectorAll('.item-row:not(.disabled)');
  for(let ri = 0; ri < rows.length; ri++){
    (function(el){
      el.onclick = function(){
        if(el.getAttribute('data-clear')){
          if(slot === 'primaryWeapon'){
            if(p.primaryWeapon && AMMO[p.primaryWeapon]){ invAdd(p.primaryWeapon, p.primaryWeaponRarity, p.primaryWeaponBoxCount || AMMOBOX_CAPACITY); }
            p.primaryWeapon = null; p.primaryWeaponRarity = ''; p.primaryWeaponBoxCount = 0;
          } else if(slot === 'helmet'){ p.helmet = null; p.helmetRarity = ''; }
          else if(slot === 'body'){ p.body = null; p.bodyRarity = ''; }
          else if(slot === 'ammoPouch'){ if(p.ammoPouch) invAdd(p.ammoPouch.ammoId, p.ammoPouch.rarity, p.ammoPouch.count); p.ammoPouch = null; }
          else if(slot === 'ammoBox'){ if(p.ammoBox) invAdd(p.ammoBox.ammoId, p.ammoBox.rarity, p.ammoBox.count); p.ammoBox = null; }
          save();
          closeModal();
          _stDetail(idx);
          return;
        }
        const eid = el.getAttribute('data-eid');
        const rid = el.getAttribute('data-rid');
        if(slot === 'ammoPouch' || slot === 'ammoBox'){
          let f = null;
          for(let fi = 0; fi < list.length; fi++){
            if(list[fi].id === eid && list[fi].rarity === rid){ f = list[fi]; break; }
          }
          if(!f) return;
          const take = f.count;
          if(take <= 0) return;
          invRemove(eid, rid, take);
          if(slot === 'ammoPouch'){
            if(p.ammoPouch) invAdd(p.ammoPouch.ammoId, p.ammoPouch.rarity, p.ammoPouch.count);
            p.ammoPouch = { ammoId: eid, rarity: rid, count: take };
          } else {
            if(p.ammoBox) invAdd(p.ammoBox.ammoId, p.ammoBox.rarity, p.ammoBox.count);
            p.ammoBox = { ammoId: eid, rarity: rid, count: take };
          }
        } else {
          if(slot === 'primaryWeapon'){
            if(p.primaryWeapon && AMMO[p.primaryWeapon]){ invAdd(p.primaryWeapon, p.primaryWeaponRarity, p.primaryWeaponBoxCount || AMMOBOX_CAPACITY); }
            if(AMMO[eid]){
              const _boxCnt = Math.min(AMMOBOX_CAPACITY, invCount(eid, rid));
              if(_boxCnt <= 0) return;
              invRemove(eid, rid, _boxCnt);
              p.primaryWeaponBoxCount = _boxCnt;
            } else {
              p.primaryWeaponBoxCount = 0;
            }
            p.primaryWeapon = eid;
            p.primaryWeaponRarity = rid;
            if(p.ammoPouch && p.ammoPouch.ammoId){
              const nd = itemDef(eid);
              if(!nd || (AMMO[p.ammoPouch.ammoId] && AMMO[p.ammoPouch.ammoId].cal) !== (nd && nd.cal)){
                invAdd(p.ammoPouch.ammoId, p.ammoPouch.rarity, p.ammoPouch.count);
                p.ammoPouch = null;
              }
            }
          } else if(slot === 'helmet'){ p.helmet = eid; p.helmetRarity = rid; }
          else if(slot === 'body'){ p.body = eid; p.bodyRarity = rid; }
        }
        save();
        closeModal();
        _stRefresh();
        _stDetail(idx);
      };
    })(rows[ri]);
  }
}

function _stPickGrenade(idx, gi){
  const s = _stInit();
  const p = s.passengers[idx];
  if(!p) return;
  const srv = state.servants.find(function(x){ return x.id === p.srvId; });
  if(!srv){ _stDetail(idx); return; }
  _stNormG(p);
  const tw = _stPassW(p);
  const mw = calcPassengerMaxWeight(srv);
  const ci = p.grenades[gi];
  const cid = ci ? (typeof ci === 'string' ? ci : ci.id) : null;
  const cr = ci ? (typeof ci === 'string' ? '一般' : (ci.rarity || '一般')) : null;
  const cw = cid ? (ITEM_WEIGHT[cid] || 0.5) : 0;
  const bw = tw - cw;

  /* rev141: 手榴彈 = 配置；裝/卸不扣庫存，投擲時才扣。列表含「當前已配置」即使庫存 0 */
  const list = [];
  const seen = {};
  if(cid){
    const _curDef = WEAPONS[cid];
    if(_curDef && _curDef.slot === 'throwable'){
      const _curCnt = invCount(cid, cr || '一般');
      list.push({ id: cid, rarity: cr || '一般', def: _curDef, count: _curCnt, isCurrent: true });
      seen[cid + '@' + (cr || '一般')] = true;
    }
  }
  for(const k in state.inventory){
    const pp = k.split('@');
    const d = WEAPONS[pp[0]];
    if(!d || d.slot !== 'throwable') continue;
    if(state.inventory[k] <= 0) continue;
    const _key = pp[0] + '@' + pp[1];
    if(seen[_key]) continue;
    seen[_key] = true;
    list.push({ id: pp[0], rarity: pp[1], def: d, count: state.inventory[k] });
  }
  list.sort(function(a, b){
    if(a.isCurrent !== b.isCurrent) return a.isCurrent ? -1 : 1;
    const rd = sortByRarityDesc(a, b);
    return rd !== 0 ? rd : (a.def.name || '').localeCompare(b.def.name || '', 'zh-Hant');
  });

  let body = '';
  body += '<div style="font-size:10px;color:#7a6f60;margin-bottom:8px;line-height:1.4">配置只決定「傾向使用什麼」，投擲時才從庫存扣除。庫存為 0 則不投擲。</div>';
  if(cid) body += '<div class="item-row" data-clear="1"><div class="icon">✕</div><div class="info"><div class="nm">卸下</div><div class="sub">清空此欄（不影響庫存）</div></div></div>';
  if(!list.length) body += '<div class="empty-hint">庫存沒有手榴彈</div>';
  for(let li = 0; li < list.length; li++){
    const it = list[li];
    const gw = ITEM_WEIGHT[it.id] || 0.5;
    const dis = (bw + gw) > mw;
    const _stockCol = it.count > 0 ? '#4caf50' : '#e05252';
    const _stockTxt = it.count > 0 ? ('×' + it.count) : '缺貨';
    const _curBadge = it.isCurrent ? ' <span style="color:#e8a33d;font-size:9px">（當前配置）</span>' : '';
    const wl = gw.toFixed(1) + ' kg' + (dis ? ' · 超重' : '');
    body += '<div class="item-row' + (dis ? ' disabled' : '') + '" data-gid="' + it.id + '" data-grid="' + it.rarity + '"><div class="icon" style="background:' + rarityBg(it.rarity) + '">' + itemIcon(it.id, 40) + '</div><div class="info"><div class="nm ' + rarityClass(it.rarity) + '">' + it.def.name + _curBadge + '</div><div class="sub">' + it.rarity + ' · ' + wl + ' · <span style="color:' + _stockCol + '">' + _stockTxt + '</span></div></div>' + (dis ? '<div class="cnt" style="color:#e05252;font-weight:bold">✕</div>' : '') + '</div>';
  }

  const _title = '配置手榴彈 · ' + tw.toFixed(1) + ' / ' + mw + ' kg' + (tw > mw ? ' ⚠' : '');
  const bd = openModal({ title: _title, body: body, onClose: function(){ closeModal(); _stDetail(idx); } });
  const rows = bd.querySelectorAll('.item-row:not(.disabled)');
  for(let ri = 0; ri < rows.length; ri++){
    (function(el){
      el.onclick = function(){
        if(el.getAttribute('data-clear')){
          /* rev141: 卸下不退庫存（本來就沒扣） */
          p.grenades[gi] = null;
        } else {
          const gid = el.getAttribute('data-gid');
          const grid = el.getAttribute('data-grid');
          /* rev141: 裝上不扣庫存，只記錄配置 */
          p.grenades[gi] = { id: gid, rarity: grid };
        }
        save();
        closeModal();
        _stRefresh();
        _stDetail(idx);
      };
    })(rows[ri]);
  }
}

function openStationPage(){
  _stEnsureStyles();
  _stInit();

  const _g = (typeof _garageInitState === 'function') ? _garageInitState() : null;
  const _vid = _g ? _g.currentVehicle : 'btr80';
  if(typeof vcEnsureAmmo === 'function') vcEnsureAmmo(_vid);

  if(typeof state !== 'undefined'){
    if(!state.vehicleAmmo) state.vehicleAmmo = {};
    if(!state.vehicleAmmo[_vid]) state.vehicleAmmo[_vid] = {};
    const _ld = (typeof _getLoadout === 'function') ? _getLoadout(_vid) : null;
    if(_ld){
      for(const _wf in _ld){
        const _cf = _ld[_wf];
        const _mx = _cf.belts ? _cf.belts * _cf.perBelt : (_cf.rounds || 0);
        const _a = state.vehicleAmmo[_vid][_wf];
        if(!_a || typeof _a !== 'object'){
          state.vehicleAmmo[_vid][_wf] = { current: _mx, max: _mx, preset: '穿燃' };
        } else {
          if(typeof _a.max !== 'number' || _a.max <= 0) _a.max = _mx;
          if(typeof _a.current !== 'number' || _a.current < 0) _a.current = _mx;
          if(!_a.preset) _a.preset = '穿燃';
          if(_a.preset === '全穿甲') _a.preset = '穿燃';
          if(_wf === 'pkt' && _a.preset !== '穿燃') _a.preset = '穿燃';
        }
      }
    }
    for(const _cw in state.vehicleAmmo[_vid]){
      if(!VEHICLE_MAIN_AMMO_POOL || !VEHICLE_MAIN_AMMO_POOL[_cw]) continue;
      if(!state.vehicleAmmo[_vid][_cw].breakdown) continue;
      const _bd = state.vehicleAmmo[_vid][_cw].breakdown;
      const _ok = {};
      const _defs = VEHICLE_MAIN_AMMO_POOL[_cw];
      for(let _ki = 0; _ki < _defs.length; _ki++) _ok[_defs[_ki].id] = 1;
      for(const _bid in _bd){ if(!_ok[_bid]) delete _bd[_bid]; }
      let _sum = 0;
      for(const _bid2 in _bd) _sum += (_bd[_bid2] || 0);
      if(typeof state.vehicleAmmo[_vid][_cw].current !== 'number') state.vehicleAmmo[_vid][_cw].current = _sum;
      else state.vehicleAmmo[_vid][_cw].current = Math.min(state.vehicleAmmo[_vid][_cw].current, _sum);
    }
  }

  let p = document.getElementById('station-page');
  if(!p){
    p = document.createElement('div');
    p.id = 'station-page';
    (document.getElementById('content') || document.body).appendChild(p);
  }
  _stRender(p);
  p.classList.add('on');
}

function closeStationPage(){
  const p = document.getElementById('station-page');
  if(p) p.classList.remove('on');
}

function _stRefresh(){
  const p = document.getElementById('station-page');
  if(!p || !p.classList.contains('on')) return;
  const _be = document.getElementById('st-body-scroll');
  const _st = _be ? _be.scrollTop : 0;
  _stRender(p);
  const _nb = document.getElementById('st-body-scroll');
  if(_nb) _nb.scrollTop = _st;
}

window.openStationPage = openStationPage;
window.closeStationPage = closeStationPage;
window._talentBadges = _stTalentBadges;

function _openRelocateConfirm(targetLabel, onConfirm, onCancel){
  const fromLabel = (targetLabel === '車站') ? '後院' : '車站';
  const ft = document.createElement('div');
  ft.className = 'modal-ft';
  ft.innerHTML = '<button class="btn primary" id="rc-ok">確認</button>';
  const body = '<div style="font-size:12px;line-height:1.6;color:#ddd">此僕人正在' + fromLabel + '工作，是否轉至' + targetLabel + '？</div>';
  openModal({
    title: '轉移至' + targetLabel,
    body: body,
    footer: ft,
    onClose: function(){
      closeModal();
      if(onCancel) setTimeout(onCancel, 50);
    }
  });
  ft.querySelector('#rc-ok').onclick = function(){
    closeModal();
    if(onConfirm) onConfirm();
  };
}

function _stReturnPassengerEquip(p){
  if(!p) return;
  if(p.primaryWeapon){
    if(AMMO[p.primaryWeapon]){
      invAdd(p.primaryWeapon, p.primaryWeaponRarity || '一般', p.primaryWeaponBoxCount || AMMOBOX_CAPACITY);
    } else {
      invAdd(p.primaryWeapon, p.primaryWeaponRarity || '一般', 1);
    }
    p.primaryWeapon = null;
    p.primaryWeaponRarity = '';
    p.primaryWeaponBoxCount = 0;
  }
  if(p.helmet){
    invAdd(p.helmet, p.helmetRarity || '一般', 1);
    p.helmet = null;
    p.helmetRarity = '';
  }
  if(p.body){
    invAdd(p.body, p.bodyRarity || '一般', 1);
    p.body = null;
    p.bodyRarity = '';
  }
  if(p.ammoPouch){
    invAdd(p.ammoPouch.ammoId, p.ammoPouch.rarity || '一般', p.ammoPouch.count || 0);
    p.ammoPouch = null;
  }
  if(p.ammoBox){
    invAdd(p.ammoBox.ammoId, p.ammoBox.rarity || '一般', p.ammoBox.count || 0);
    p.ammoBox = null;
  }
  if(Array.isArray(p.grenades)){
    /* rev141: 手榴彈 = 配置，卸載員時不退庫存 */
    for(let i = 0; i < p.grenades.length; i++) p.grenades[i] = null;
  }
}

function _stSwapPassenger(idx){
  const s = _stInit();
  const p = s.passengers[idx];
  if(!p) return;
  const occ = _stOcc();
  const curSrvId = p.srvId;
  const avail = [];
  for(let i = 0; i < state.servants.length; i++){
    const srv = state.servants[i];
    if(srv.id === curSrvId) continue;
    const o = occ[srv.id];
    if(o === 'crew') continue;
    if(o === 'passenger') continue;
    avail.push(srv);
  }
  let body = '<div style="font-size:11px;color:#7a6f60;margin-bottom:8px">選擇替換載員（裝備欄保留）</div>';
  if(!avail.length) body += '<div class="empty-hint">沒有可用僕人</div>';
  for(let j = 0; j < avail.length; j++){
    const sv = avail[j];
    const td = SERVANT_TYPES[sv.type] || { name: '?' };
    const _inGarden = Array.isArray(sv.assignedPlots) && sv.assignedPlots.length > 0;
    const _stnMark = _inGarden ? ' 🌱工作中' : '';
    body += '<div class="item-row" data-srv="' + sv.id + '"><div class="icon" style="background:' + rarityBg(sv.rarity) + '"><img src="icons/servants/' + sv.type + '.png' + assetSuffix('icons/servants/' + sv.type + '.png') + '" style="width:100%;height:100%;object-fit:contain"></div><div class="info"><div class="nm ' + rarityClass(sv.rarity) + '">' + servantLabel(sv) + _stnMark + '</div><div class="sub">Lv.' + sv.lv + ' ' + td.name + '</div></div></div>';
  }
  const bd = openModal({ title: '更換載員', body: body, onClose: function(){ closeModal(); _stDetail(idx); } });
  const els = bd.querySelectorAll('.item-row');
  for(let k = 0; k < els.length; k++){
    (function(el){
      el.onclick = function(){
        const sid = el.getAttribute('data-srv');
        const srv = (state.servants || []).find(function(x){ return x.id === sid; });
        if(!srv) return;
        const _doSwap = function(){
          p.srvId = sid;
          save();
          closeModal();
          _stRefresh();
          setTimeout(function(){ _stDetail(idx); }, 50);
        };
        const _inGarden = Array.isArray(srv.assignedPlots) && srv.assignedPlots.length > 0;
        if(_inGarden && typeof _openRelocateConfirm === 'function'){
          _openRelocateConfirm('車站', function(){
            srv.assignedPlots = [];
            _doSwap();
          }, function(){
            setTimeout(function(){ _stSwapPassenger(idx); }, 50);
          });
        } else {
          if(_inGarden) srv.assignedPlots = [];
          _doSwap();
        }
      };
    })(els[k]);
  }
}

/* rev-fix-station-op-position: 从 21d 前移 */
function _isServantInStation(srvId){
  if(!state.station) return false;
  const c = state.station.crew || {};
  if(c.commander === srvId || c.gunner === srvId || c.driver === srvId) return true;
  if(Array.isArray(state.station.passengers)){
    for(let i = 0; i < state.station.passengers.length; i++){
      if(state.station.passengers[i] && state.station.passengers[i].srvId === srvId) return true;
    }
  }
  return false;
}
function _removeFromStation(srvId){
  if(!state.station) return;
  const c = state.station.crew;
  if(c){ for(const r of ['commander','gunner','driver']){ if(c[r] === srvId) c[r] = null; } }
  if(Array.isArray(state.station.passengers)){
    state.station.passengers = state.station.passengers.filter(function(p){ return !(p && p.srvId === srvId); });
  }
}
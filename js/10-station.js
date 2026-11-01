
(function(){
'use strict';
if(typeof window.CARRIER_CAPACITY==='undefined'){window.CARRIER_CAPACITY={btr80:7,btr80a:7,btr82:7,btr82a:7,btr90:7,t80:0,t80b:0,t80bv:0,t80u:0,t80uk:0,t80um:0,bmp1:8,bmp1m:8,bmp2:7,bmp3:7,bmd4:5};}
var MAIN_AMMO={'2a46':[{id:'3bm42',name:'3BM42 穿甲',type:'ap'},{id:'3of26',name:'3OF26 高爆',type:'he'},{id:'3bk29',name:'3BK29 破甲',type:'heat'}],'2a46m1':[{id:'3bm42',name:'3BM42 穿甲',type:'ap'},{id:'3of26',name:'3OF26 高爆',type:'he'},{id:'3bk29',name:'3BK29 破甲',type:'heat'}],'2a70':[{id:'100he',name:'100mm HE',type:'he'}],'2a28':[{id:'73heat',name:'73mm HEAT',type:'heat'},{id:'73hefrag',name:'73mm HE-FRAG',type:'he'}]};
var DEFAULT_BREAKDOWN={'2a46':{'3bm42':20,'3of26':15,'3bk29':5},'2a46m1':{'3bm42':20,'3of26':15,'3bk29':5},'2a70':{'100he':40},'2a28':{'73heat':25,'73hefrag':15}};
var PRESETS={'穿燃':{name:'穿燃',desc:'AP-I / API-T 交替',img:'ap'},'全穿甲':{name:'全穿甲',desc:'AP-I 四連',img:'ap'},'高爆':{name:'高爆',desc:'OFZT / BT 混合',img:'he'},'混合':{name:'混合',desc:'BT / OFZT 交替',img:'mix'}};
var BELT_WIDS={kpvt:1,pkt:1,nsvt:1,'2a42':1,'2a72':1};
var _SLOT_LABELS={primaryWeapon:'主武器',helmet:'頭盔',body:'上衣',ammoPouch:'彈掛',ammoBox:'彈藥箱'};
var _FALLBACK_LOADOUT={'pkt':{belts:8,perBelt:250},'kpvt':{belts:10,perBelt:50},'2a46':{rounds:40},'2a46m1':{rounds:40},'2a70':{rounds:40},'2a28':{rounds:40},'2a42':{belts:5,perBelt:100},'2a72':{belts:5,perBelt:100},'nsvt':{belts:3,perBelt:100},'atgm':{rounds:2}};
function _buildLoadout(vid){var v=(typeof VEHICLES!=='undefined')?VEHICLES[vid]:null;if(!v)return null;var wp=(v.weapon||'').toUpperCase();var lo={};if(wp.indexOf('2A46M1')>=0)lo['2a46m1']={rounds:40};else if(wp.indexOf('2A46')>=0)lo['2a46']={rounds:40};if(wp.indexOf('2A70')>=0)lo['2a70']={rounds:40};if(wp.indexOf('2A28')>=0)lo['2a28']={rounds:40};if(wp.indexOf('2A42')>=0)lo['2a42']={belts:5,perBelt:100};if(wp.indexOf('2A72')>=0)lo['2a72']={belts:5,perBelt:100};if(wp.indexOf('KPVT')>=0)lo['kpvt']={belts:10,perBelt:50};if(wp.indexOf('NSVT')>=0)lo['nsvt']={belts:3,perBelt:100};if(wp.indexOf('PKT')>=0)lo['pkt']={belts:8,perBelt:250};if(wp.indexOf('ATGM')>=0||wp.indexOf('9M')>=0)lo['atgm']={rounds:2};return Object.keys(lo).length?lo:null;}

function _lo(v){
  if(typeof VEHICLE_LOADOUT!=='undefined'&&VEHICLE_LOADOUT&&VEHICLE_LOADOUT[v]) return VEHICLE_LOADOUT[v];
  var built=_buildLoadout(v);
  if(built) return built;
  return _FALLBACK_LOADOUT;
}

function _ensureMainBreak(vid,wid,ld){if(!state.vehicleAmmo)state.vehicleAmmo={};if(!state.vehicleAmmo[vid])state.vehicleAmmo[vid]={};var a=state.vehicleAmmo[vid][wid];if(!a||typeof a!=='object'){a={current:0,max:0};state.vehicleAmmo[vid][wid]=a;}if(!MAIN_AMMO[wid])return a;var mr=(ld[wid]&&ld[wid].rounds)||0;if(mr<=0)return a;if(!a.breakdown){var def=DEFAULT_BREAKDOWN[wid]||{},keys=Object.keys(def),sum=0;a.breakdown={};for(var i=0;i<keys.length;i++)sum+=def[keys[i]];if(sum===mr){a.breakdown=JSON.parse(JSON.stringify(def));}else{var per=Math.floor(mr/Math.max(1,keys.length));for(var k=0;k<keys.length;k++)a.breakdown[keys[k]]=per;a.breakdown[keys[0]]+=mr-per*keys.length;}var tot=0;for(var kk in a.breakdown)tot+=a.breakdown[kk];a.current=tot;a.max=mr;}
  if(!a.presetBreakdown)a.presetBreakdown=JSON.parse(JSON.stringify(a.breakdown));
  return a;}
function _init(){if(!state.station)state.station={crew:{},passengers:[],crewGear:{commander:null,gunner:null,driver:null}};var s=state.station;if(!s.crewGear)s.crewGear={commander:null,gunner:null,driver:null};if(!s.crew)s.crew={};for(var i=0;i<CREW_ROLES.length;i++){var r=CREW_ROLES[i];if(typeof s.crew[r]==='undefined')s.crew[r]=null;}if(!Array.isArray(s.passengers))s.passengers=[];return s;}
function _blank(){return{srvId:null,primaryWeapon:null,primaryWeaponRarity:'',primaryWeaponBoxCount:0,ammoPouch:null,ammoBox:null,helmet:null,helmetRarity:'',body:null,bodyRarity:'',grenades:[null,null,null]};}
function _normG(p){if(!Array.isArray(p.grenades)){p.grenades=[null,null,null];return;}for(var i=0;i<p.grenades.length;i++){var g=p.grenades[i];if(!g)continue;if(typeof g==='string'){var r='一般';for(var k in state.inventory){var kp=k.split('@');if(kp[0]===g){r=kp[1];break;}}p.grenades[i]={id:g,rarity:r};}else if(typeof g==='object'&&g.id&&!g.rarity)g.rarity='一般';else if(typeof g!=='object')p.grenades[i]=null;}}
function _prune(s){if(!s||!Array.isArray(s.passengers))return;var v=[];for(var i=0;i<s.passengers.length;i++){var p=s.passengers[i],f=false;for(var j=0;j<state.servants.length;j++)if(state.servants[j].id===p.srvId){f=true;break;}if(f){_normG(p);v.push(p);}}if(v.length!==s.passengers.length)s.passengers=v;}
function _passW(p){if(!p)return 0;var w=0;if(p.primaryWeapon){if(AMMO[p.primaryWeapon])w+=calcAmmoBoxWeight(p.primaryWeapon);else w+=getItemWeight(p.primaryWeapon,p.primaryWeaponRarity||'一般');}if(p.ammoPouch){var c=(AMMO[p.ammoPouch.ammoId]||{}).cal||'5.45';w+=0.5+(AMMO_UNIT_WEIGHT[c]||0.01)*(p.ammoPouch.count||0);}if(p.ammoBox)w+=calcAmmoBoxWeight(p.ammoBox.ammoId);if(p.helmet)w+=getItemWeight(p.helmet,p.helmetRarity||'一般');if(p.body)w+=getItemWeight(p.body,p.bodyRarity||'一般');if(Array.isArray(p.grenades))for(var i=0;i<p.grenades.length;i++){var g=p.grenades[i];if(!g)continue;var gid=typeof g==='string'?g:g.id;if(gid)w+=(ITEM_WEIGHT[gid]||0.5);}return w;}
function _occ(){var ids={},s=_init();for(var i=0;i<CREW_ROLES.length;i++){var r=CREW_ROLES[i];if(s.crew[r])ids[s.crew[r]]='crew';}for(var j=0;j<s.passengers.length;j++){if(s.passengers[j]&&s.passengers[j].srvId)ids[s.passengers[j].srvId]='passenger';}return ids;}
function _fmtNum(n){if(n==null||isNaN(n))return "0";const v=Math.floor(Math.abs(n));const sign=n<0?"-":"";if(v<10000)return sign+v;if(v<1000000)return sign+Math.round(v/1000)+"K";if(v<10000000)return sign+(v/1000000).toFixed(1)+"M";return sign+Math.round(v/1000000)+"M";}
function _talentBadges(srv){
  var tal=srv&&srv.talents?srv.talents:[];
  var icons={gunner_mastery:'🎯',commander_sense:'👁',driver_instinct:'🚗',strongman:'💪',bombardier:'💣',ammo_handler:'🎒'};
  var base='display:flex;flex-direction:column;align-items:center;justify-content:center;border-radius:4px;flex:0 0 auto;gap:2px;line-height:1;padding:2px 0';
  if(!tal.length){
    return '<span class="st-talent-badge st-talent-empty" style="'+base+';background:#1a1510;border:1px solid #3a2f25;color:#3a2f25">·</span>';
  }
  var first=tal[0],ic=icons[first]||'?';
  var extra=tal.length-1;
  var h='<span class="st-talent-badge" data-talent="'+first+'" style="'+base+';background:#2a1f10;border:1px solid #8a5f18;color:#ffd680">';
  h+='<span style="font-size:18px;line-height:1">'+ic+'</span>';
  if(extra>0){
    h+='<span style="font-size:9px;background:#e8a33d;color:#0e0c0a;border-radius:6px;padding:0 3px;line-height:1.2;font-weight:bold;min-width:14px;text-align:center">+'+extra+'</span>';
  }
  h+='</span>';
  return h;
}
function _consumeLowestMed(){var _rl=['破舊','一般','庫存','精品','傳奇','具名'];for(var ri=0;ri<_rl.length;ri++){for(var k in state.inventory){var p=k.split('@');if(p[1]!==_rl[ri])continue;if(state.inventory[k]<=0)continue;var c=CONSUMABLES[p[0]];if(!c||!c.heal)continue;invRemove(p[0],p[1],1);return {id:p[0],rarity:p[1]};}}return null;}

function _styles(){
  var old=document.getElementById('station-styles');if(old)old.remove();
  var st=document.createElement('style');st.id='station-styles';
  st.textContent=[
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
    '.st-passenger-card.cant-go,.st-crew-card.cant-go{filter:grayscale(1);opacity:0.45}',
    '.st-passenger-card.cant-go::after,.st-crew-card.cant-go::after{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(to top right,transparent calc(50% - 0.5px),rgba(255,255,255,0.55) 50%,transparent calc(50% + 0.5px)),linear-gradient(to top left,transparent calc(50% - 0.5px),rgba(255,255,255,0.55) 50%,transparent calc(50% + 0.5px))}',
    '.st-belt-row{display:flex;align-items:center;gap:6px;padding:6px 8px;background:#241d16;border:1px solid #2a231c;border-radius:5px;margin-bottom:4px;font-size:11px;cursor:pointer}',
    '.st-belt-name{flex:0 0 auto;color:#e8a33d;font-weight:bold;white-space:nowrap;padding-right:8px}',
    '.st-belt-count{flex:1;text-align:center;color:#a89a85;font-family:monospace;font-size:10px}',
    '.st-belt-preset{flex:0 0 auto;display:flex;align-items:center;gap:4px;color:#7ee07e;font-size:10px}',
    '.st-belt-preset img{width:32px;height:32px;object-fit:contain;opacity:0.85}',
    '.st-main-row{display:flex;align-items:center;gap:6px;padding:6px 8px;background:#241d16;border:1px solid #2a231c;border-radius:5px;margin-bottom:4px;font-size:11px;cursor:pointer}',
    '.st-main-name{flex:0 0 auto;color:#e8a33d;font-weight:bold;white-space:nowrap;padding-right:8px}',
    '.st-main-icons{flex:1;display:flex;gap:4px;justify-content:flex-end;flex-wrap:wrap}',
    '.st-main-icon{position:relative;width:32px;height:32px;border-radius:4px;background:#0e0c0a;border:1px solid #3a2f25;display:flex;align-items:center;justify-content:center;overflow:hidden}',
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
  ].join('');
  document.head.appendChild(st);
}

/* 通用治疗区 HTML：hpPct 0-100，hp/maxHp */
function _healAreaHtml(hp, maxHp, hpPct, talentHtml){
  var _col = hp<=0 ? '#e05252' : (hp<maxHp ? '#e8a33d' : '#4caf50');
  var _txtCol = hp<=0 ? '#e05252' : '#fff';
  var _btnTxt = '治療';
  var _inner = '<div class="st-pd-heal-area" data-heal="1" style="flex:1;min-width:0">' +
    '<div class="st-pd-heal-bar"><div class="st-pd-heal-fill" style="width:'+hpPct+'%;background:'+_col+'"></div></div>' +
    '<div class="st-pd-heal-row"><span class="st-pd-heal-txt" style="color:'+_txtCol+'">HP '+_fmtNum(hp)+'/'+_fmtNum(maxHp)+'</span><span class="st-pd-heal-btn">'+_btnTxt+'</span></div>' +
    '</div>';
  if(talentHtml){
    return '<div style="display:flex;align-items:stretch;gap:4px;flex:1;min-width:0">' + _inner + '<div style="flex:0 0 auto;display:flex;align-items:stretch">' + talentHtml + '</div></div>';
  }
  return _inner;
}

function _card(p,srv,pi){
  var w=_passW(p),mw=calcPassengerMaxWeight(srv),over=w>mw;
  var maxHp=(typeof servantMaxHp==='function')?servantMaxHp(srv):100;
  var hp=(srv.hp!==undefined&&srv.hp!==null)?srv.hp:maxHp;
  if(srv.injuredUntil&&srv.injuredUntil>Date.now())hp=0;
  var bgc=rarityBg(srv.rarity);
  var hpCol = hp<=0 ? '#e05252' : '#fff';
  var wtCol = over ? '#e05252' : '#fff';
  var _cantGo=(hp<=0||over)?' cant-go':'';
  var h='<div class="st-passenger-card'+_cantGo+'" data-passenger="'+pi+'" style="border-color:'+bgc+'">';
  h+='<div class="st-pass-ico" style="background:'+bgc+'"><img src="icons/servants/'+srv.type+'.png'+assetSuffix()+'"></div>';
  h+='<div class="st-pass-info">';
  h+='<div class="st-pass-name '+rarityClass(srv.rarity)+'">'+servantLabel(srv)+'</div>';
  h+='<div class="st-pass-stat" style="color:'+hpCol+'">HP '+_fmtNum(hp)+'/'+_fmtNum(maxHp)+'</div>';
  h+='<div class="st-pass-stat" style="color:'+wtCol+'">'+w.toFixed(1)+'/'+mw+'kg</div>';
  h+='</div></div>';
  return h;
}
function _emptyCardAt(pi,isExtra){
  var extraLbl=isExtra?'<div style="font-size:7px;color:#e05252;line-height:1.1">超載</div>':'';
  var bg=isExtra?'#100a06':'#1a1510';
  var bc=isExtra?'#5a2a2a':'#3a2f25';
  return '<div class="st-passenger-card" data-add-passenger="'+pi+'" style="min-height:76px;background:'+bg+';border:1.5px dashed '+bc+';display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;color:#5a5040;font-size:9px;padding:4px;cursor:pointer;box-sizing:border-box"><div style="font-size:22px;line-height:1;color:#3a2f25;font-weight:300">＋</div>'+extraLbl+'</div>';
}
function _slotHtml(slot,label,id,rar,cnt){
  var w=0;
  if(id){
    if(slot==='primaryWeapon'){if(AMMO[id])w=calcAmmoBoxWeight(id);else w=getItemWeight(id,rar);}
    else if(slot==='helmet'||slot==='body')w=getItemWeight(id,rar);
    else if(slot==='ammoPouch'){var c=(AMMO[id]||{}).cal||'5.45';w=0.5+(AMMO_UNIT_WEIGHT[c]||0.01)*(cnt||0);}
    else if(slot==='ammoBox')w=calcAmmoBoxWeight(id);
  }
  var bg=id?rarityBg(rar):'#241d16';
  var h='<div class="st-pd-slot'+(id?' filled':'')+'" data-slot="'+slot+'"'+(id?' style="border-color:'+bg+'"':'')+'>';
  h+='<div class="st-pd-slot-lbl">'+label+'</div>';
  if(id){h+='<div class="st-pd-slot-icon" style="background:'+bg+'">'+itemIcon(id,60)+'</div><div class="st-pd-slot-wt">'+w.toFixed(1)+'kg</div>';}
  else h+='<div class="st-pd-slot-icon empty">＋</div>';
  h+='</div>';
  return h;
}

function _render(page){
  var s=_init();_prune(s);
  var g=(typeof _garageInitState==='function')?_garageInitState():null;
  var vid=g?g.currentVehicle:'btr80';
  var cap=(window.CARRIER_CAPACITY&&window.CARRIER_CAPACITY[vid])?window.CARRIER_CAPACITY[vid]:0;
  var ld=_lo(vid);
  var _FIXED_SLOTS=9;
  var _dmg=state.vehicleDamage&&state.vehicleDamage[vid];
  var _hp=(_dmg&&typeof _dmg._hullHP==='number')?_dmg._hullHP:1000;
  var _hmax=(_dmg&&typeof _dmg._hullHPMax==='number')?_dmg._hullHPMax:1000;
  var _hpPct=Math.round(Math.max(0,Math.min(100,_hp/_hmax*100)));
  var _hpCol=_hpPct>60?'#4caf50':(_hpPct>30?'#e8a33d':'#e05252');
  var _repairing=_dmg&&_dmg.repairUntil>Date.now();
  var _repairTxt=_repairing?('維修 '+Math.ceil((_dmg.repairUntil-Date.now())/60000)+'m'):'';
  var _vname=(typeof VEHICLES!=='undefined'&&VEHICLES[vid])?VEHICLES[vid].name:vid;
  var html='<div class="st-header">';
  html+='<div class="st-title">🚂 車站 · '+_vname+'</div>';
  html+='<div class="st-veh">';
  html+='<span style="color:'+_hpCol+';font-size:12px;font-weight:bold;font-family:monospace">'+_fmtNum(_hp)+'/'+_fmtNum(_hmax)+'</span>';
  if(_repairTxt)html+='<span style="color:#e05252;font-size:11px">'+_repairTxt+'</span>';
  html+='<button class="btn" id="st-repair-btn" style="background:#e8a33d;color:#0e0c0a;border-color:#e8a33d;font-weight:bold">維修</button>';
  html+='<button class="btn" id="st-garage-btn" style="background:#4caf50;color:#fff;border-color:#4caf50;font-weight:bold">車場</button>';
  html+='</div>';
  html+='<div class="st-x" id="st-close">✕</div></div><div class="st-body" id="st-body-scroll">';

  var _crewFilled=[s.crew.commander,s.crew.gunner,s.crew.driver].filter(function(x){return !!x;}).length;
  html+='<div class="st-section"><div class="st-sec-title">車組（'+_crewFilled+' / 3）</div>';
  html+='<div class="st-crew-grid">';
  for(var i=0;i<CREW_ROLES.length;i++){html+='<div class="st-crew-role">'+CREW_LABELS[CREW_ROLES[i]]+'</div>';}
  for(var i2=0;i2<CREW_ROLES.length;i2++){
    var r2=CREW_ROLES[i2],sid2=s.crew[r2],srv2=null;
    if(sid2)srv2=state.servants.find(function(x){return x.id===sid2;});
    if(srv2){
      var cbg=rarityBg(srv2.rarity);
      var maxHp2=(typeof servantMaxHp==='function')?servantMaxHp(srv2):100;
      var hp2=(srv2.hp!==undefined&&srv2.hp!==null)?srv2.hp:maxHp2;
      if(srv2.injuredUntil&&srv2.injuredUntil>Date.now())hp2=0;
      var hpCol2 = hp2<=0?'#e05252':'#fff';
      var _isInjured=srv2.injuredUntil&&srv2.injuredUntil>Date.now();
      html+='<div class="st-crew-card occupied'+(_isInjured?' cant-go':'')+'" data-crew="'+r2+'" style="border-color:'+cbg+'">';
      html+='<div class="st-crew-ico" style="background:'+cbg+'"><img src="icons/servants/'+srv2.type+'.png'+assetSuffix()+'"></div>';
      html+='<div class="st-crew-info">';
      html+='<div class="st-crew-name '+rarityClass(srv2.rarity)+'">'+servantLabel(srv2)+'</div>';
      html+='<div class="st-crew-stat" style="color:'+hpCol2+'">HP '+_fmtNum(hp2)+'/'+_fmtNum(maxHp2)+'</div>';
      html+='</div></div>';
    }else{
      html+='<div class="st-crew-card" data-crew="'+r2+'"><div class="st-crew-ico" style="color:#3a2f25;font-size:22px">＋</div><div class="st-crew-info"><div style="color:#5a5040;font-size:11px">空缺</div></div></div>';
    }
  }
  html+='</div></div>';

  html+='<div class="st-section"><div class="st-sec-title">載員（'+s.passengers.length+' / '+_FIXED_SLOTS+'）</div><div class="st-passenger-grid">';
  for(var pi=0;pi<_FIXED_SLOTS;pi++){
    if(pi<s.passengers.length){
      var p=s.passengers[pi],psrv=state.servants.find(function(x){return x.id===p.srvId;});
      if(psrv)html+=_card(p,psrv,pi);else html+=_emptyCardAt(pi,pi>=cap);
    }else{html+=_emptyCardAt(pi,pi>=cap);}
  }
  html+='</div></div>';

  var _cost={diff:0};if(typeof vcEstimateCallCost==='function')_cost=vcEstimateCallCost(vid);
  var _avail=0;if(typeof vcAmmoEquivTotal==='function')_avail=Math.round(vcAmmoEquivTotal());
  html+='<div class="st-section"><div class="st-sec-title" style="display:flex;justify-content:space-between;align-items:center"><span>彈藥配置</span><span style="font-size:11px;color:#e8a33d;font-weight:bold;padding-left:40px;margin-left:auto;font-family:monospace">預估 '+_fmtNum(_cost?_cost.diff:0)+' / 可用 '+_fmtNum(_avail)+'</span></div>';
  var CALIBER_MAP={pkt:7.62,kpvt:14.5,nsvt:12.7,'2a42':30,'2a72':30,'2a28':73,'2a70':100,'2a46':125,'2a46m1':125};
  var _beltKeys=[];for(var _bk in ld){if(BELT_WIDS[_bk])_beltKeys.push(_bk);}
  _beltKeys.sort(function(a,b){return (CALIBER_MAP[a]||999)-(CALIBER_MAP[b]||999);});
  var beltRows='';
  for(var _bi=0;_bi<_beltKeys.length;_bi++){
    var wid=_beltKeys[_bi];
    var a=(state.vehicleAmmo&&state.vehicleAmmo[vid]&&state.vehicleAmmo[vid][wid]);
    if(!a){var _mx=(ld[wid].belts?ld[wid].belts*ld[wid].perBelt:(ld[wid].rounds||0));a={current:_mx,max:_mx,preset:'穿燃'};if(!state.vehicleAmmo)state.vehicleAmmo={};if(!state.vehicleAmmo[vid])state.vehicleAmmo[vid]={};state.vehicleAmmo[vid][wid]=a;}
    var mx=a.max||0,cu=a.current||0;
    var pn=PRESETS[a.preset]?PRESETS[a.preset].name:(a.preset||'穿燃');
    var pimg=PRESETS[a.preset]?PRESETS[a.preset].img:'ap';
    var _calPrefix=(CALIBER_MAP[wid]?CALIBER_MAP[wid]+'mm ':'');
    beltRows+='<div class="st-belt-row" data-belt-wid="'+wid+'">';
    beltRows+='<div class="st-belt-name">'+_calPrefix+wid.toUpperCase()+'</div>';
    beltRows+='<div class="st-belt-count">'+_fmtNum(cu)+' / '+_fmtNum(mx)+'</div>';
    beltRows+='<div class="st-belt-preset"><img src="icons/ammo/belt_'+pimg+'.png'+assetSuffix()+'" alt="">'+pn+' ▶</div>';
    beltRows+='</div>';
  }
  if(beltRows){html+=beltRows;}
  var _mainKeys=[];for(var _mk in ld){if(MAIN_AMMO[_mk])_mainKeys.push(_mk);}
  _mainKeys.sort(function(a,b){return (CALIBER_MAP[a]||999)-(CALIBER_MAP[b]||999);});
  var mainRows='';
  for(var _mi2=0;_mi2<_mainKeys.length;_mi2++){
    var wid2=_mainKeys[_mi2];
    var a2=_ensureMainBreak(vid,wid2,ld);
    var defs=MAIN_AMMO[wid2],icons='';
    for(var di=0;di<defs.length;di++){
      var d=defs[di],_srcT=a2.presetBreakdown||a2.breakdown,cnt=(_srcT&&_srcT[d.id])||0;
      if(cnt<=0)continue;
      icons+='<div class="st-main-icon"><img src="icons/ammo/'+d.id+'.png'+assetSuffix()+'" alt=""><div class="st-main-icon-lbl">×'+_fmtNum(cnt)+'</div></div>';
    }
    if(!icons)icons='<div style="color:#5a5040;font-size:11px;padding:8px">未配置</div>';
    var _calPrefix2=(CALIBER_MAP[wid2]?CALIBER_MAP[wid2]+'mm ':'');
    var _dispMax=0;var _srcD=a2&&(a2.presetBreakdown||a2.breakdown);if(_srcD){for(var _dk in _srcD)_dispMax+=(_srcD[_dk]||0);}else{_dispMax=(a2&&a2.max)||0;}mainRows+='<div class="st-main-row" data-main-wid="'+wid2+'"><div class="st-main-name">'+_calPrefix2+wid2.toUpperCase()+'</div><div class="st-main-icons">'+icons+'</div><div class="st-main-curmax">'+_fmtNum(a2.current||0)+' / '+_fmtNum(_dispMax)+'</div></div>';
  }
  if(mainRows){html+=mainRows;}
  if(ld.atgm){html+='<div class="st-main-row" style="cursor:default;opacity:.85"><div class="st-main-name">ATGM</div><div class="st-main-icons" style="color:#e8a33d;font-weight:bold">車型固定 '+(ld.atgm.rounds||0)+' 發</div></div>';}
  html+='</div>';

  html+='</div>';
  var prevScroll=0;var be=document.getElementById('st-body-scroll');if(be)prevScroll=be.scrollTop;
  page.innerHTML=html;
  var nb=document.getElementById('st-body-scroll');if(nb&&prevScroll>0)nb.scrollTop=prevScroll;

  var x=document.getElementById('st-close');if(x)x.onclick=closeStationPage;
  var cc=page.querySelectorAll('[data-crew]');
  for(var ci=0;ci<cc.length;ci++)(function(el){
    el.onclick=function(){
      var _role=el.getAttribute('data-crew');
      var _sid=s.crew[_role];
      if(_sid)_crewDetail(_role,_sid);else _pickCrew(_role);
    };
  })(cc[ci]);
  var pc=page.querySelectorAll('[data-passenger]');
  for(var pci=0;pci<pc.length;pci++)(function(el){
    el.onclick=function(){_detail(parseInt(el.getAttribute('data-passenger'),10));};
  })(pc[pci]);
  var aps=page.querySelectorAll('[data-add-passenger]');
  for(var _ai=0;_ai<aps.length;_ai++)(function(el){
    el.onclick=function(){_pickPassenger();};
  })(aps[_ai]);
  var br=page.querySelectorAll('[data-belt-wid]');
  for(var bi=0;bi<br.length;bi++)(function(el){
    el.onclick=function(){_pickBelt(vid,el.getAttribute('data-belt-wid'));};
  })(br[bi]);
  var mr=page.querySelectorAll('[data-main-wid]');
  for(var mi=0;mi<mr.length;mi++)(function(el){
    el.onclick=function(){_openMainAmmoPicker(vid,el.getAttribute('data-main-wid'),function(){_refresh();});};
  })(mr[mi]);

  var rb=page.querySelector('#st-repair-btn');
  if(rb)rb.onclick=function(){
    var _dmgPct=Math.max(1,100-_hpPct);
    var _c={
      metal:Math.max(5,Math.round(50*_dmgPct/100)),
      gears:Math.max(2,Math.round(20*_dmgPct/100)),
      screws:Math.max(2,Math.round(20*_dmgPct/100))
    };
    var _body='<div style="font-size:11px;color:#7a6f60;margin-bottom:8px">損傷 '+_dmgPct+'%，消耗材料</div>';
    _body+='<div style="display:flex;justify-content:space-between;font-size:11px;padding:2px 0"><span>金屬廢料</span><span>'+_c.metal+'</span></div>';
    _body+='<div style="display:flex;justify-content:space-between;font-size:11px;padding:2px 0"><span>齒輪</span><span>'+_c.gears+'</span></div>';
    _body+='<div style="display:flex;justify-content:space-between;font-size:11px;padding:2px 0"><span>螺絲</span><span>'+_c.screws+'</span></div>';
    var _ft=document.createElement('div');_ft.className='modal-ft';
    _ft.innerHTML='<button class="btn primary" id="st-repair-ok">維修</button>';
    openModal({title:'維修',body:_body,footer:_ft});
    var _ok=_ft.querySelector('#st-repair-ok');
    if(_ok)_ok.onclick=function(){
      if(typeof _gardenMerchantTryPay==='function')_gardenMerchantTryPay(_c);
      if(state.vehicleDamage&&state.vehicleDamage[vid]){
        var _d=state.vehicleDamage[vid];
        _d.repairUntil=0;
        _d.destroyed=false;
        _d.disabled=false;
        _d._hullHP=_d._hullHPMax||1000;
        _d.ammoRackDamage=0;
        _d.parts={engine:800,tracks:1000,gun:400,turret:400};
        _d.members={driver:300,gunner:300,commander:300,player:100};
      }
      save();closeModal();_refresh();
    };
  };
  var gb=page.querySelector('#st-garage-btn');
  if(gb)gb.onclick=function(){closeStationPage();if(typeof openGaragePage==='function')openGaragePage();};
}

function _pickBelt(vid,wid){
  var a=(state.vehicleAmmo&&state.vehicleAmmo[vid]&&state.vehicleAmmo[vid][wid])||null;
  if(!a)return;
  var cur=a.preset||'穿燃';
  var body='<div style="font-size:11px;color:#7a6f60;margin-bottom:8px">'+wid.toUpperCase()+' · 彈鏈預設</div>';
  for(var k in PRESETS){
    var pr=PRESETS[k],on=(k===cur);
    body+='<div class="item-row" data-preset="'+k+'"'+(on?' style="border-color:#e8a33d;background:#2a1f10"':'')+'>';
    body+='<div class="icon" style="background:#0e0c0a"><img src="icons/ammo/belt_'+pr.img+'.png'+assetSuffix()+'" style="width:100%;height:100%;object-fit:contain" alt=""></div>';
    body+='<div class="info"><div class="nm">'+pr.name+'</div><div class="sub">'+pr.desc+'</div></div>';
    if(on)body+='<div style="color:#e8a33d;font-weight:bold;padding:0 6px">✓</div>';
    body+='</div>';
  }
  var bd=openModal({title:'彈鏈預設',body:body,onClose:function(){closeModal();_refresh();}});
  var els=bd.querySelectorAll('[data-preset]');
  for(var i=0;i<els.length;i++)(function(el){
    el.onclick=function(){a.preset=el.getAttribute('data-preset');save();closeModal();_refresh();};
  })(els[i]);
}

function _openMainAmmoPicker(vid,wid,onClose){
  var ld=_lo(vid);
  if(!ld||!ld[wid])return;
  var defs=MAIN_AMMO[wid];if(!defs)return;
  var mr=ld[wid].rounds||0;if(mr<=0)return;
  var a=_ensureMainBreak(vid,wid,ld);
  function _rb(){
    var _srcR=a.presetBreakdown||a.breakdown;
    var total=0;for(var k in _srcR)total+=(_srcR[k]||0);
    var h='<div style="font-size:11px;color:#7a6f60;margin-bottom:8px">上限 '+mr+' 發 · 已配置 <span id="st-ammo-total" style="color:#e8a33d;font-weight:bold">'+total+'</span> 發</div>';
    for(var i=0;i<defs.length;i++){
      var d=defs[i],_srcS=a.presetBreakdown||a.breakdown,cnt=(_srcS&&_srcS[d.id])||0;
      h+='<div class="st-ammo-cell"><div class="st-ammo-cell-hd"><img src="icons/ammo/'+d.id+'.png'+assetSuffix()+'" alt=""><span class="nm">'+d.name+'</span><span class="cnt" id="st-ammo-cnt-'+d.id+'">'+cnt+'</span></div><input type="range" class="st-main-slider" data-ammo-id="'+d.id+'" min="0" max="'+mr+'" value="'+cnt+'"></div>';
    }
    h+='<button class="btn primary" id="st-ammo-confirm" style="width:100%;margin-top:8px">確認</button>';
    return h;
  }
  var bd=openModal({title:vid.toUpperCase()+' · '+wid.toUpperCase()+' 主炮彈藥',body:_rb()});
  var sliders=bd.querySelectorAll('.st-main-slider');
  for(var j=0;j<sliders.length;j++)(function(sl){
    var id=sl.getAttribute('data-ammo-id');
    sl.oninput=function(){
      if(!a.presetBreakdown)a.presetBreakdown=JSON.parse(JSON.stringify(a.breakdown));
      var v=parseInt(sl.value,10)||0,other=0;
      for(var k in a.presetBreakdown)if(k!==id)other+=(a.presetBreakdown[k]||0);
      var c=mr-other;
      if(v>c){v=c;sl.value=c;}
      a.presetBreakdown[id]=v;
      var ce=bd.querySelector('#st-ammo-cnt-'+id);if(ce)ce.textContent=v;
      var te=bd.querySelector('#st-ammo-total');
      var nt=0;for(var k2 in a.presetBreakdown)nt+=(a.presetBreakdown[k2]||0);
      if(te)te.textContent=nt;
    };
    sl.onchange=function(){save();};
  })(sliders[j]);
  var cb=bd.querySelector('#st-ammo-confirm');
  if(cb)cb.onclick=function(){
    if(a.presetBreakdown){
      a.breakdown=JSON.parse(JSON.stringify(a.presetBreakdown));
      var _nt2=0;for(var _k4 in a.breakdown)_nt2+=(a.breakdown[_k4]||0);
      a.current=_nt2;
    }
    save();closeModal();if(typeof onClose==='function')onClose();
  };
}

function _crewDetail(role,srvId){
  var srv=state.servants.find(function(x){return x.id===srvId;});
  if(!srv)return;
  var td=SERVANT_TYPES[srv.type]||{name:'?'};
  var tal=(typeof getServantTalents==='function')?getServantTalents(srv):[];
  var maxHp=(typeof servantMaxHp==='function')?servantMaxHp(srv):100;
  var hp=(srv.hp!==undefined&&srv.hp!==null)?srv.hp:maxHp;
  if(srv.injuredUntil&&srv.injuredUntil>Date.now())hp=0;
  var inj=srv.injuredUntil&&srv.injuredUntil>Date.now();
  var hpPct=maxHp>0?Math.round(hp/maxHp*100):0;
  var body='';
  body+='<div class="st-pd-head">';
  body+='<div class="st-pd-sprite" style="background:'+rarityBg(srv.rarity)+'"><img src="icons/servants/'+srv.type+'.png'+assetSuffix()+'"></div>';
  body+='<div class="st-pd-info">';
  body+='<div class="st-pd-name '+rarityClass(srv.rarity)+'">'+servantLabel(srv)+'</div>';
  body+='<div class="st-pd-sub">Lv.'+srv.lv+'</div>';
  body+='</div>';
  body+=_healAreaHtml(hp,maxHp,hpPct,_talentBadges(srv));
  body+='</div>';
  if(tal.length){body+='<div class="st-pd-talents">';for(var t=0;t<tal.length;t++){var tDef=TALENT_DEFS[tal[t]];if(tDef)body+='<span class="st-talent-chip">'+tDef.name+'</span>';}body+='</div>';}
  else{body+='<div style="font-size:11px;color:#7a6f60;margin:4px 0 8px">無天賦</div>';}
  if(inj){var injMin=Math.ceil((srv.injuredUntil-Date.now())/60000);body+='<div style="color:#e05252;font-size:12px;font-weight:bold;padding:6px 0;text-align:center">重傷 · 剩 '+injMin+' 分鐘</div>';}
  var ft=document.createElement('div');ft.className='modal-ft';
  ft.innerHTML='<button class="btn primary" id="st-cd-swap">更換</button><button class="btn danger" id="st-cd-remove">解除</button>';
  var bd=openModal({title:'車組詳情 · '+CREW_LABELS[role],body:body,footer:ft});
  var ha=bd.querySelector('.st-pd-heal-area');
  if(ha)ha.onclick=function(){
    if(hp>=maxHp){if(typeof notify==='function')notify('已滿血','warn');return;}
    var _m=_consumeLowestMed();
    if(!_m){if(typeof notify==='function')notify('沒有醫療品','warn');return;}
    srv.injuredUntil=0;srv.hp=maxHp;
    save();closeModal();_refresh();
  };
  var sb=ft.querySelector('#st-cd-swap');if(sb)sb.onclick=function(){closeModal();_pickCrew(role);};
  var rb=ft.querySelector('#st-cd-remove');if(rb)rb.onclick=function(){_init().crew[role]=null;save();closeModal();_refresh();};
}

function _pickCrew(role){
  var s=_init(),occ=_occ(),cur=s.crew[role],avail=[];
  for(var i=0;i<state.servants.length;i++){
    var srv=state.servants[i],o=occ[srv.id];
    if(o&&o!=='crew')continue;
    if(o==='crew'&&srv.id!==cur)continue;
    avail.push(srv);
  }
  var body='<div style="font-size:11px;color:#7a6f60;margin-bottom:8px">選擇 '+CREW_LABELS[role]+'</div>';
  if(cur)body+='<div class="item-row" data-clear="1"><div class="icon">✕</div><div class="info"><div class="nm">解除</div><div class="sub">清空當前位置</div></div></div>';
  if(!avail.length)body+='<div class="empty-hint">沒有可用僕人</div>';
  for(var j=0;j<avail.length;j++){
    var sv=avail[j],td=SERVANT_TYPES[sv.type]||{name:'?'};
    body+='<div class="item-row" data-srv="'+sv.id+'"><div class="icon" style="background:'+rarityBg(sv.rarity)+'"><img src="icons/servants/'+sv.type+'.png'+assetSuffix()+'" style="width:100%;height:100%;object-fit:contain"></div><div class="info"><div class="nm '+rarityClass(sv.rarity)+'">'+servantLabel(sv)+'</div><div class="sub">Lv.'+sv.lv+' '+td.name+'</div></div></div>';
  }
  var bd=openModal({
    title:CREW_LABELS[role],body:body,
    onClose:function(){
      closeModal();
      setTimeout(function(){
        var _sid=state.station&&state.station.crew?state.station.crew[role]:null;
        if(_sid)_crewDetail(role,_sid);else _refresh();
      },40);
    }
  });
  var els=bd.querySelectorAll('.item-row');
  for(var k=0;k<els.length;k++)(function(el){
    el.onclick=function(){
      if(el.getAttribute('data-clear'))s.crew[role]=null;else s.crew[role]=el.getAttribute('data-srv');
      save();closeModal();_refresh();
    };
  })(els[k]);
}

function _pickPassenger(){
  var s=_init(),occ=_occ(),avail=[];
  for(var i=0;i<state.servants.length;i++)if(!occ[state.servants[i].id])avail.push(state.servants[i]);
  var body='<div style="font-size:11px;color:#7a6f60;margin-bottom:8px">選擇載員</div>';
  if(!avail.length)body+='<div class="empty-hint">沒有可用僕人</div>';
  for(var j=0;j<avail.length;j++){
    var sv=avail[j],td=SERVANT_TYPES[sv.type]||{name:'?'},tal=getServantTalents(sv),ts=tal.length?' · 天賦 '+tal.length:'';
    body+='<div class="item-row" data-srv="'+sv.id+'"><div class="icon" style="background:'+rarityBg(sv.rarity)+'"><img src="icons/servants/'+sv.type+'.png'+assetSuffix()+'" style="width:100%;height:100%;object-fit:contain"></div><div class="info"><div class="nm '+rarityClass(sv.rarity)+'">'+servantLabel(sv)+'</div><div class="sub">Lv.'+sv.lv+' '+td.name+ts+'</div></div></div>';
  }
  var bd=openModal({title:'添加載員',body:body,onClose:function(){closeModal();_refresh();}});
  var els=bd.querySelectorAll('.item-row');
  for(var k=0;k<els.length;k++)(function(el){
    el.onclick=function(){var np=_blank();np.srvId=el.getAttribute('data-srv');s.passengers.push(np);save();closeModal();_refresh();};
  })(els[k]);
}

function _detail(idx){
  var s=_init(),p=s.passengers[idx];if(!p)return;
  var srv=state.servants.find(function(x){return x.id===p.srvId;});
  if(!srv){_refresh();return;}
  _normG(p);
  var tw=_passW(p),mw=calcPassengerMaxWeight(srv),tal=getServantTalents(srv);
  var maxHp=(typeof servantMaxHp==='function')?servantMaxHp(srv):100;
  var hp=(srv.hp!==undefined&&srv.hp!==null)?srv.hp:maxHp;
  if(srv.injuredUntil&&srv.injuredUntil>Date.now())hp=0;
  var inj=srv.injuredUntil&&srv.injuredUntil>Date.now();
  var hpPct=maxHp>0?Math.round(hp/maxHp*100):0;
  var isBomb=(tal.indexOf('bombardier')>=0);
  var slots=isBomb?3:1;
  if(p.grenades.length!==slots){
    var _ng=new Array(slots);
    for(var _gi=0;_gi<slots&&_gi<p.grenades.length;_gi++)_ng[_gi]=p.grenades[_gi];
    p.grenades=_ng;
  }
  var body='';
  body+='<div class="st-pd-head">';
  body+='<div class="st-pd-sprite" style="background:'+rarityBg(srv.rarity)+'"><img src="icons/servants/'+srv.type+'.png'+assetSuffix()+'"></div>';
  body+='<div class="st-pd-info">';
  body+='<div class="st-pd-name '+rarityClass(srv.rarity)+'">'+servantLabel(srv)+'</div>';
  body+='<div class="st-pd-sub">Lv.'+srv.lv+'</div>';
  body+='</div>';
  body+=_healAreaHtml(hp,maxHp,hpPct,_talentBadges(srv));
  body+='</div>';
  if(tal.length){body+='<div class="st-pd-talents">';for(var t=0;t<tal.length;t++){var td=TALENT_DEFS[tal[t]];if(td)body+='<span class="st-talent-chip">'+td.name+'</span>';}body+='</div>';}
  if(inj){var injMin=Math.ceil((srv.injuredUntil-Date.now())/60000);body+='<div style="color:#e05252;font-size:12px;font-weight:bold;padding:6px 0;text-align:center">重傷 · 剩 '+injMin+' 分鐘</div>';}
  body+='<div class="st-pd-section-title">主武器 + 彈藥箱</div><div class="st-pd-row">';
  body+=_slotHtml('primaryWeapon','主武器',p.primaryWeapon,p.primaryWeaponRarity,0);
  body+=_slotHtml('ammoBox','彈藥箱',p.ammoBox?p.ammoBox.ammoId:null,p.ammoBox?p.ammoBox.rarity:'',p.ammoBox?p.ammoBox.count:0);
  body+='</div><div class="st-pd-section-title">護甲 + 彈掛</div><div class="st-pd-row">';
  body+=_slotHtml('helmet','頭盔',p.helmet,p.helmetRarity,0);
  body+=_slotHtml('body','上衣',p.body,p.bodyRarity,0);
  body+=_slotHtml('ammoPouch','彈掛',p.ammoPouch?p.ammoPouch.ammoId:null,p.ammoPouch?p.ammoPouch.rarity:'',p.ammoPouch?p.ammoPouch.count:0);
  body+='</div><div class="st-pd-section-title">手榴彈</div><div class="st-pd-grenades">';
  for(var g=0;g<slots;g++){
    var gi=p.grenades[g],gid=gi?(typeof gi==='string'?gi:gi.id):null;
    var gr=gi?(typeof gi==='string'?'一般':(gi.rarity||'一般')):null;
    var gw=gid?(ITEM_WEIGHT[gid]||0.5):0,bg=gid?rarityBg(gr):'';
    body+='<div class="st-pd-grenade'+(gid?' filled':'')+'" data-grenade="'+g+'"'+(gid?' style="border-color:'+bg+'"':'')+'>';
    body+='<div class="st-pd-grenade-lbl">#'+(g+1)+'</div>';
    if(gid)body+='<div class="st-pd-grenade-icon" style="background:'+bg+'">'+itemIcon(gid,60)+'</div><div class="st-pd-grenade-wt">'+gw.toFixed(1)+'kg</div>';
    else body+='<div class="st-pd-grenade-icon empty">＋</div>';
    body+='</div>';
  }
  body+='</div>';
  var ft=document.createElement('div');ft.className='modal-ft';
  ft.innerHTML='<button class="btn danger" id="st-remove">移除載員</button>';
  var bd=openModal({title:'載員詳情 · '+tw.toFixed(1)+' / '+mw+' kg'+(tw>mw?' ⚠':''),body:body,footer:ft});
  var ha=bd.querySelector('.st-pd-heal-area');
  if(ha)ha.onclick=function(){
    if(hp>=maxHp){if(typeof notify==='function')notify('已滿血','warn');return;}
    var _m=_consumeLowestMed();
    if(!_m){if(typeof notify==='function')notify('沒有醫療品','warn');return;}
    srv.injuredUntil=0;srv.hp=maxHp;
    save();closeModal();_detail(idx);
  };
  ft.querySelector('#st-remove').onclick=function(){s.passengers.splice(idx,1);save();closeModal();_refresh();};
  var se=bd.querySelectorAll('[data-slot]');
  for(var si=0;si<se.length;si++)(function(el){el.onclick=function(){_pickEquip(idx,el.getAttribute('data-slot'));};})(se[si]);
  var ge=bd.querySelectorAll('[data-grenade]');
  for(var gi2=0;gi2<ge.length;gi2++)(function(el){el.onclick=function(){_pickGrenade(idx,parseInt(el.getAttribute('data-grenade'),10));};})(ge[gi2]);
}

function _slotW(slot,p){
  if(!p)return 0;
  if(slot==='primaryWeapon'&&p.primaryWeapon){if(AMMO[p.primaryWeapon])return calcAmmoBoxWeight(p.primaryWeapon);return getItemWeight(p.primaryWeapon,p.primaryWeaponRarity||'一般');}
  if(slot==='helmet'&&p.helmet)return getItemWeight(p.helmet,p.helmetRarity||'一般');
  if(slot==='body'&&p.body)return getItemWeight(p.body,p.bodyRarity||'一般');
  if(slot==='ammoPouch'&&p.ammoPouch){var c=(AMMO[p.ammoPouch.ammoId]||{}).cal||'5.45';return 0.5+(AMMO_UNIT_WEIGHT[c]||0.01)*(p.ammoPouch.count||0);}
  if(slot==='ammoBox'&&p.ammoBox)return calcAmmoBoxWeight(p.ammoBox.ammoId);
  return 0;
}
function _candW(slot,it){
  if(slot==='primaryWeapon'){if(AMMO[it.id])return calcAmmoBoxWeight(it.id);return getItemWeight(it.id,it.rarity);}
  if(slot==='helmet'||slot==='body')return getItemWeight(it.id,it.rarity);
  if(slot==='ammoPouch'){var c=(AMMO[it.id]||{}).cal||'5.45';return 0.5+(AMMO_UNIT_WEIGHT[c]||0.01)*(it.count||0);}
  if(slot==='ammoBox')return calcAmmoBoxWeight(it.id);
  return 0;
}
function _pickEquip(idx,slot){
  var s=_init(),p=s.passengers[idx];if(!p)return;
  var srv=state.servants.find(function(x){return x.id===p.srvId;});
  if(!srv){_detail(idx);return;}
  var tal=getServantTalents(srv);
  var tw=_passW(p),mw=calcPassengerMaxWeight(srv),csw=_slotW(slot,p),bw=tw-csw;
  var list=[],hint='';
  if(slot==='primaryWeapon'){
    for(var k in state.unlockedEquip){var pp=k.split('@'),d=itemDef(pp[0]);if(!d||d.slot!=='primary')continue;list.push({id:pp[0],rarity:pp[1],def:d,count:0});}
    if(tal.indexOf('ammo_handler')>=0){
      for(var k5 in state.inventory){
        var pp5=k5.split('@');
        if(!AMMO[pp5[0]])continue;
        if(state.inventory[k5]<=0)continue;
        var _bc=Math.min(AMMOBOX_CAPACITY,state.inventory[k5]);
        list.push({id:pp5[0],rarity:pp5[1],def:AMMO[pp5[0]],count:_bc,isBox:true});
      }
    }
  }else if(slot==='helmet'||slot==='body'){
    var tgt=(slot==='helmet')?'head':'top';
    for(var k2 in state.unlockedEquip){var pp2=k2.split('@'),d2=itemDef(pp2[0]);if(!d2||d2.slot!==tgt)continue;var dv=ARMOR[d2.id]||{};list.push({id:pp2[0],rarity:pp2[1],def:d2,count:0,armorLv:dv.level||0,armorVal:equipArmorValue(pp2[0],pp2[1])});}
  }else if(slot==='ammoPouch'){
    var pw=p.primaryWeapon;
    if(!pw)hint='請先裝備主武器';
    else{
      var pd=itemDef(pw),cal=pd?pd.cal:null;
      if(!cal)hint='主武器沒有口徑資訊';
      else{
        for(var k3 in state.inventory){var pp3=k3.split('@');if(!AMMO[pp3[0]])continue;if(AMMO[pp3[0]].cal!==cal)continue;if(state.inventory[k3]<=0)continue;list.push({id:pp3[0],rarity:pp3[1],def:AMMO[pp3[0]],count:Math.min(120,state.inventory[k3])});}
        if(!list.length)hint='庫存沒有主武器口徑彈藥';
      }
    }
  }else if(slot==='ammoBox'){
    for(var k4 in state.inventory){var pp4=k4.split('@');if(!AMMO[pp4[0]])continue;if(state.inventory[k4]<=0)continue;list.push({id:pp4[0],rarity:pp4[1],def:AMMO[pp4[0]],count:Math.min(AMMOBOX_CAPACITY,state.inventory[k4])});}
  }
  list.sort(function(a,b){var rd=sortByRarityDesc(a,b);return rd!==0?rd:(a.def.name||'').localeCompare(b.def.name||'','zh-Hant');});
  var body='';
  var hasCur=(slot==='primaryWeapon'&&p.primaryWeapon)||(slot==='helmet'&&p.helmet)||(slot==='body'&&p.body)||(slot==='ammoPouch'&&p.ammoPouch)||(slot==='ammoBox'&&p.ammoBox);
  if(hasCur)body+='<div class="item-row" data-clear="1"><div class="icon">✕</div><div class="info"><div class="nm">卸下</div><div class="sub">清空此欄</div></div></div>';
  if(hint)body+='<div class="empty-hint">'+hint+'</div>';
  else if(!list.length)body+='<div class="empty-hint">沒有可選項</div>';
  var ROMAN=['','I','II','III','IV','V','VI'];
  for(var li=0;li<list.length;li++){
    var it=list[li],iw=_candW(slot,it),dis=(bw+iw)>mw;
    var wl=iw.toFixed(1)+' kg'+(dis?' · 超重':'');
    if(it.count&&(slot==='ammoPouch'||slot==='ammoBox'))wl+=' ×'+it.count;
    if((slot==='helmet'||slot==='body')&&it.armorLv)wl+=' · '+ROMAN[Math.min(6,it.armorLv)]+'級 甲'+it.armorVal;
    body+='<div class="item-row'+(dis?' disabled':'')+'" data-eid="'+it.id+'" data-rid="'+it.rarity+'"><div class="icon" style="background:'+rarityBg(it.rarity)+'">'+itemIcon(it.id,40)+'</div><div class="info"><div class="nm '+rarityClass(it.rarity)+'">'+it.def.name+'</div><div class="sub">'+it.rarity+' · '+wl+'</div></div>'+(dis?'<div class="cnt" style="color:#e05252;font-weight:bold">✕</div>':'')+'</div>';
  }
  var _title='選擇 '+(_SLOT_LABELS[slot]||slot)+' · '+tw.toFixed(1)+' / '+mw+' kg'+(tw>mw?' ⚠':'');
  var bd=openModal({title:_title,body:body,onClose:function(){closeModal();_detail(idx);}});
  var rows=bd.querySelectorAll('.item-row:not(.disabled)');
  for(var ri=0;ri<rows.length;ri++)(function(el){
    el.onclick=function(){
      if(el.getAttribute('data-clear')){
        if(slot==='primaryWeapon'){if(p.primaryWeapon&&AMMO[p.primaryWeapon]){invAdd(p.primaryWeapon,p.primaryWeaponRarity,p.primaryWeaponBoxCount||AMMOBOX_CAPACITY);}p.primaryWeapon=null;p.primaryWeaponRarity='';p.primaryWeaponBoxCount=0;}
        else if(slot==='helmet'){p.helmet=null;p.helmetRarity='';}
        else if(slot==='body'){p.body=null;p.bodyRarity='';}
        else if(slot==='ammoPouch'){if(p.ammoPouch)invAdd(p.ammoPouch.ammoId,p.ammoPouch.rarity,p.ammoPouch.count);p.ammoPouch=null;}
        else if(slot==='ammoBox'){if(p.ammoBox)invAdd(p.ammoBox.ammoId,p.ammoBox.rarity,p.ammoBox.count);p.ammoBox=null;}
        save();closeModal();_detail(idx);return;
      }
      var eid=el.getAttribute('data-eid'),rid=el.getAttribute('data-rid');
      if(slot==='ammoPouch'||slot==='ammoBox'){
        var f=null;
        for(var fi=0;fi<list.length;fi++)if(list[fi].id===eid&&list[fi].rarity===rid){f=list[fi];break;}
        if(!f)return;
        var take=f.count;if(take<=0)return;
        invRemove(eid,rid,take);
        if(slot==='ammoPouch'){if(p.ammoPouch)invAdd(p.ammoPouch.ammoId,p.ammoPouch.rarity,p.ammoPouch.count);p.ammoPouch={ammoId:eid,rarity:rid,count:take};}
        else{if(p.ammoBox)invAdd(p.ammoBox.ammoId,p.ammoBox.rarity,p.ammoBox.count);p.ammoBox={ammoId:eid,rarity:rid,count:take};}
      }else{
        if(slot==='primaryWeapon'){
          if(p.primaryWeapon&&AMMO[p.primaryWeapon]){invAdd(p.primaryWeapon,p.primaryWeaponRarity,p.primaryWeaponBoxCount||AMMOBOX_CAPACITY);}
          if(AMMO[eid]){
            var _boxCnt=Math.min(AMMOBOX_CAPACITY,invCount(eid,rid));
            if(_boxCnt<=0)return;
            invRemove(eid,rid,_boxCnt);
            p.primaryWeaponBoxCount=_boxCnt;
          }else{p.primaryWeaponBoxCount=0;}
          p.primaryWeapon=eid;p.primaryWeaponRarity=rid;
          if(p.ammoPouch&&p.ammoPouch.ammoId){var nd=itemDef(eid);if(!nd||(AMMO[p.ammoPouch.ammoId]&&AMMO[p.ammoPouch.ammoId].cal)!==(nd&&nd.cal)){invAdd(p.ammoPouch.ammoId,p.ammoPouch.rarity,p.ammoPouch.count);p.ammoPouch=null;}}
        }else if(slot==='helmet'){p.helmet=eid;p.helmetRarity=rid;}
        else if(slot==='body'){p.body=eid;p.bodyRarity=rid;}
      }
      save();closeModal();_refresh();_detail(idx);
    };
  })(rows[ri]);
}

function _pickGrenade(idx,gi){
  var s=_init(),p=s.passengers[idx];if(!p)return;
  var srv=state.servants.find(function(x){return x.id===p.srvId;});
  if(!srv){_detail(idx);return;}
  _normG(p);
  var tw=_passW(p),mw=calcPassengerMaxWeight(srv);
  var ci=p.grenades[gi],cid=ci?(typeof ci==='string'?ci:ci.id):null,cr=ci?(typeof ci==='string'?'一般':(ci.rarity||'一般')):null;
  var cw=cid?(ITEM_WEIGHT[cid]||0.5):0,bw=tw-cw,list=[];
  for(var k in state.inventory){var pp=k.split('@'),d=WEAPONS[pp[0]];if(!d||d.slot!=='throwable')continue;if(state.inventory[k]<=0)continue;list.push({id:pp[0],rarity:pp[1],def:d,count:state.inventory[k]});}
  list.sort(function(a,b){var rd=sortByRarityDesc(a,b);return rd!==0?rd:(a.def.name||'').localeCompare(b.def.name||'','zh-Hant');});
  var body='';
  if(cid)body+='<div class="item-row" data-clear="1"><div class="icon">✕</div><div class="info"><div class="nm">卸下</div><div class="sub">清空此欄</div></div></div>';
  if(!list.length)body+='<div class="empty-hint">庫存沒有手榴彈</div>';
  for(var li=0;li<list.length;li++){
    var it=list[li],gw=ITEM_WEIGHT[it.id]||0.5,dis=(bw+gw)>mw;
    var wl=gw.toFixed(1)+' kg'+(dis?' · 超重':'');
    body+='<div class="item-row'+(dis?' disabled':'')+'" data-gid="'+it.id+'" data-grid="'+it.rarity+'"><div class="icon" style="background:'+rarityBg(it.rarity)+'">'+itemIcon(it.id,40)+'</div><div class="info"><div class="nm '+rarityClass(it.rarity)+'">'+it.def.name+'</div><div class="sub">'+it.rarity+' · '+wl+' ×'+it.count+'</div></div>'+(dis?'<div class="cnt" style="color:#e05252;font-weight:bold">✕</div>':'')+'</div>';
  }
  var _title='選擇手榴彈 · '+tw.toFixed(1)+' / '+mw+' kg'+(tw>mw?' ⚠':'');
  var bd=openModal({title:_title,body:body,onClose:function(){closeModal();_detail(idx);}});
  var rows=bd.querySelectorAll('.item-row:not(.disabled)');
  for(var ri=0;ri<rows.length;ri++)(function(el){
    el.onclick=function(){
      if(el.getAttribute('data-clear')){if(cid)invAdd(cid,cr||'一般',1);p.grenades[gi]=null;}
      else{var gid=el.getAttribute('data-gid'),grid=el.getAttribute('data-grid');if(!invRemove(gid,grid,1))return;if(cid)invAdd(cid,cr||'一般',1);p.grenades[gi]={id:gid,rarity:grid};}
      save();closeModal();_refresh();_detail(idx);
    };
  })(rows[ri]);
}

function openStationPage(){
  _init();_styles();
  var _g=(typeof _garageInitState==='function')?_garageInitState():null;
  var _vid=_g?_g.currentVehicle:'btr80';
  if(typeof vcEnsureAmmo==='function')vcEnsureAmmo(_vid);
  if(typeof state!=='undefined'){
    if(!state.vehicleAmmo)state.vehicleAmmo={};
    if(!state.vehicleAmmo[_vid])state.vehicleAmmo[_vid]={};
    var _ld=_lo(_vid);
    for(var _wf in _ld){
      var _cf=_ld[_wf],_mx=_cf.belts?_cf.belts*_cf.perBelt:(_cf.rounds||0);
      var _a=state.vehicleAmmo[_vid][_wf];
      if(!_a||typeof _a!=='object')state.vehicleAmmo[_vid][_wf]={current:_mx,max:_mx,preset:'穿燃'};
      else{
        if(typeof _a.max!=='number'||_a.max<=0)_a.max=_mx;
        if(typeof _a.current!=='number'||_a.current<0)_a.current=_mx;
        if(!_a.preset)_a.preset='穿燃';
      }
    }
    for(var _cw in state.vehicleAmmo[_vid]){
      var _cd=MAIN_AMMO[_cw];
      if(!_cd||!state.vehicleAmmo[_vid][_cw].breakdown)continue;
      var _bd=state.vehicleAmmo[_vid][_cw].breakdown;
      var _ok={};
      for(var _ki=0;_ki<_cd.length;_ki++)_ok[_cd[_ki].id]=1;
      for(var _bid in _bd){if(!_ok[_bid])delete _bd[_bid];}
      var _sum=0;for(var _bid2 in _bd)_sum+=(_bd[_bid2]||0);
      /* 同步：current 必須 ≤ breakdown 總和，防止開火只扣一邊造成預估 0 */
      if(typeof state.vehicleAmmo[_vid][_cw].current!=='number') state.vehicleAmmo[_vid][_cw].current=_sum;
      else state.vehicleAmmo[_vid][_cw].current=Math.min(state.vehicleAmmo[_vid][_cw].current,_sum);
    }
  }
  var p=document.getElementById('station-page');
  if(!p){p=document.createElement('div');p.id='station-page';(document.getElementById('content')||document.body).appendChild(p);}
  _render(p);
  p.classList.add('on');
}
function closeStationPage(){var p=document.getElementById('station-page');if(p)p.classList.remove('on');}
function _refresh(){
  var p=document.getElementById('station-page');
  if(!p||!p.classList.contains('on'))return;
  var _be=document.getElementById('st-body-scroll');
  var _st=_be?_be.scrollTop:0;
  _render(p);
  var _nb=document.getElementById('st-body-scroll');
  if(_nb)_nb.scrollTop=_st;
}
window.openStationPage=openStationPage;
window.closeStationPage=closeStationPage;
window._talentBadges=_talentBadges;
})();

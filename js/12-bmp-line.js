(function(){
  'use strict';
  if(window._bmpLineInstalled) return;
  window._bmpLineInstalled = true;

  if(typeof VEHICLES === 'undefined'){
    console.warn('[bmp-line] VEHICLES undefined');
    return;
  }

  // ============ 2. 新增 bmp1m ============

  if(!VEHICLES.bmp1){
    VEHICLES.bmp1 = {
      id:'bmp1', name:'BMP-1', tier:1, line:'bmp',
      weapon:'73mm 2A28 + 7.62mm PKT + ATGM',
      armor:'33mm', speedRoad:65, speedOffroad:'45-50',
      supportDuration:30,
      next:['bmp1m'],
      researchCost:{ ammoCal:'5.45', ammoCount:1000, liquor:100, exp:500 }
    };
  }
  if(!VEHICLES.bmp1m){
    VEHICLES.bmp1m = {
      id:'bmp1m', name:'BMP-1M', tier:2, line:'bmp',
      weapon:'30mm 2A72 + 7.62mm PKT',
      armor:'33mm', speedRoad:65, speedOffroad:'45-50',
      supportDuration:32,
      next:['bmp2'],
      researchCost:{ ammoCal:'5.45', ammoCount:1500, liquor:150, exp:800 }
    };
  }
  if(!VEHICLES.bmp2){
    VEHICLES.bmp2 = {
      id:'bmp2', name:'BMP-2', tier:3, line:'bmp',
      weapon:'30mm 2A42 + 7.62mm PKT + ATGM',
      armor:'33mm（加強）', speedRoad:65, speedOffroad:'45-50',
      supportDuration:35,
      next:['bmp3'],
      researchCost:{ ammoCal:'7.62', ammoCount:2000, liquor:500, exp:3000 }
    };
  }
  if(!VEHICLES.bmp3){
    VEHICLES.bmp3 = {
      id:'bmp3', name:'BMP-3', tier:4, line:'bmp',
      weapon:'100mm 2A70 + 30mm 2A72 + 7.62mm PKT',
      armor:'35mm + ERA', speedRoad:70, speedOffroad:'45-50',
      supportDuration:40,
      next:[],
      researchCost:{ ammoCal:'7.62x54', ammoCount:2500, liquor:2500, exp:12000 }
    };
  }

  // ============ 3. btr80 是 BMP/T-80 兩線的共同前置 ============
  if(VEHICLES.btr80){
    var baseNext = Array.isArray(VEHICLES.btr80.next) ? VEHICLES.btr80.next.slice() : [];
    if(baseNext.indexOf('btr80a') < 0) baseNext.push('btr80a');
    if(baseNext.indexOf('bmp1')   < 0) baseNext.push('bmp1');
    if(baseNext.indexOf('t80')    < 0) baseNext.push('t80');
    // 舊版可能殘留 bmp1am
    baseNext = baseNext.filter(function(v){ return v !== 'bmp1am'; });
    VEHICLES.btr80.next = baseNext;
  }

  // ============ 4. VEHICLE_ANNOTATIONS 補位 ============
  if(window.VEHICLE_ANNOTATIONS){
    if(typeof window.VEHICLE_ANNOTATIONS.bmp1  === 'undefined') window.VEHICLE_ANNOTATIONS.bmp1  = (typeof VEHICLE_ANNOTATION_BMP1  !== 'undefined') ? VEHICLE_ANNOTATION_BMP1  : null;
    if(typeof window.VEHICLE_ANNOTATIONS.bmp1m === 'undefined') window.VEHICLE_ANNOTATIONS.bmp1m = (typeof VEHICLE_ANNOTATION_BMP1M !== 'undefined') ? VEHICLE_ANNOTATION_BMP1M : null;
    if(typeof window.VEHICLE_ANNOTATIONS.bmp2  === 'undefined') window.VEHICLE_ANNOTATIONS.bmp2  = (typeof VEHICLE_ANNOTATION_BMP2  !== 'undefined') ? VEHICLE_ANNOTATION_BMP2  : null;
    if(typeof window.VEHICLE_ANNOTATIONS.bmp3  === 'undefined') window.VEHICLE_ANNOTATIONS.bmp3  = (typeof VEHICLE_ANNOTATION_BMP3  !== 'undefined') ? VEHICLE_ANNOTATION_BMP3  : null;
    if(typeof window.VEHICLE_ANNOTATIONS.bmp1am !== 'undefined') delete window.VEHICLE_ANNOTATIONS.bmp1am;
  }

  // ============ 5. 科技樹：btr80 居中作根，三列縱向 ============
  //   x 列: 10 / 120 / 230 (NW=100, NH=64, canvas 340x440)
  //   y 行: 4 / 76 / 148 / 220 / 292 / 364
  //   btr80 在 (120, 4) 居中，分支到 y=76 行的三節點
  window._garageOpenTechTree = function(){
    var NW = 100, NH = 64;
    var nodes = [
      // btr80 根節點（居中）
      { vid:'btr80',  x:120, y:4   },
      // BTR 線（左列）
      { vid:'btr80a', x:10,  y:76  },
      { vid:'btr82',  x:10,  y:148 },
      { vid:'btr82a', x:10,  y:220 },
      { vid:'btr90',  x:10,  y:292 },
      // BMP 線（中列）
      { vid:'bmp1',   x:120, y:76  },
      { vid:'bmp1m',  x:120, y:148 },
      { vid:'bmp2',   x:120, y:220 },
      { vid:'bmp3',   x:120, y:292 },
      // T-80 線（右列）
      { vid:'t80',    x:230, y:76  },
      { vid:'t80b',   x:230, y:148 },
      { vid:'t80bv',  x:230, y:220 },
      { vid:'t80u',   x:230, y:292 },
      // t80u 分叉：t80uk 左偏（與 BMP 同列但更低），t80um 直下
      { vid:'t80uk',  x:120, y:364 },
      { vid:'t80um',  x:230, y:364 }
    ];

    var svg = '<svg width="340" height="440" style="position:absolute;left:0;top:0;pointer-events:none" xmlns="http://www.w3.org/2000/svg">';
    // btr80 → 三分支（正交折線）
    svg += '<path d="M 170 68 L 170 72 L 60 72 L 60 76" stroke="#8a5f18" stroke-width="2" fill="none"/>';
    svg += '<line x1="170" y1="68" x2="170" y2="76" stroke="#8a5f18" stroke-width="2"/>';
    svg += '<path d="M 170 68 L 170 72 L 280 72 L 280 76" stroke="#8a5f18" stroke-width="2" fill="none"/>';
    // BTR 線豎線
    svg += '<line x1="60" y1="140" x2="60" y2="148" stroke="#8a5f18" stroke-width="2"/>';
    svg += '<line x1="60" y1="212" x2="60" y2="220" stroke="#8a5f18" stroke-width="2"/>';
    svg += '<line x1="60" y1="284" x2="60" y2="292" stroke="#8a5f18" stroke-width="2"/>';
    // BMP 線豎線
    svg += '<line x1="170" y1="140" x2="170" y2="148" stroke="#8a5f18" stroke-width="2"/>';
    svg += '<line x1="170" y1="212" x2="170" y2="220" stroke="#8a5f18" stroke-width="2"/>';
    svg += '<line x1="170" y1="284" x2="170" y2="292" stroke="#8a5f18" stroke-width="2"/>';
    // T-80 線豎線
    svg += '<line x1="280" y1="140" x2="280" y2="148" stroke="#8a5f18" stroke-width="2"/>';
    svg += '<line x1="280" y1="212" x2="280" y2="220" stroke="#8a5f18" stroke-width="2"/>';
    svg += '<line x1="280" y1="284" x2="280" y2="292" stroke="#8a5f18" stroke-width="2"/>';
    // t80u → t80um 直下
    svg += '<line x1="280" y1="356" x2="280" y2="364" stroke="#8a5f18" stroke-width="2"/>';
    // t80u → t80uk 左下折線
    svg += '<path d="M 280 356 L 280 360 L 170 360 L 170 364" stroke="#8a5f18" stroke-width="2" fill="none"/>';
    svg += '</svg>';

    var g = _garageInitState();
    var research = _garageGetResearchInfo();
    var researchId = research ? research.targetId : null;
    var nodesHtml = '';
    for(var i = 0; i < nodes.length; i++){
      var n = nodes[i];
      var v = VEHICLES[n.vid];
      if(!v) continue;
      var owned = g.ownedVehicles.indexOf(n.vid) >= 0;
      var isCurrent = g.currentVehicle === n.vid;
      var isResearch = (researchId === n.vid);
      var prereqs = Object.keys(VEHICLES).filter(function(pvid){
        return (VEHICLES[pvid].next || []).indexOf(n.vid) >= 0;
      });
      var hasAllPrereq = (prereqs.length === 0) || prereqs.every(function(pid){ return g.ownedVehicles.indexOf(pid) >= 0; });
      var cls = 'wt-node';
      var mark = '';
      if(owned && isCurrent){ cls += ' current'; mark = '✓'; }
      else if(owned){ cls += ' owned'; mark = '✓'; }
      else if(!hasAllPrereq){ cls += ' locked'; mark = '🔒'; }
      else if(isResearch){ cls += ' researching'; mark = '🔬'; }
      else if(v.researchCost){ cls += ' researchable'; mark = '🔬'; }
      else { cls += ' locked'; mark = '?'; }
      nodesHtml += '<div class="' + cls + '" data-tech-node="' + n.vid + '" style="left:' + n.x + 'px;top:' + n.y + 'px;width:' + NW + 'px;height:' + NH + 'px">'
        + '<div class="wt-node-img"><img src="icons/vehicles/' + n.vid + '.png' + assetSuffix() + '" data-fallback="1" alt=""></div>'
        + '<div class="wt-node-name">' + v.name + '</div>'
        + '<div class="wt-node-mark">' + mark + '</div>'
        + '</div>';
    }

    var body = '<div class="wt-tech-wrap"><div class="wt-tech-canvas">' + svg + nodesHtml + '</div></div>';
    var bd = openModal({ title: '🌳 科技樹', body: body });
    if(typeof _garageBindTechImgs === 'function') _garageBindTechImgs(bd);
    var btns = bd.querySelectorAll('[data-tech-node]');
    for(var bi = 0; bi < btns.length; bi++){
      (function(btn){
        btn.onclick = function(){
          var vid = btn.getAttribute('data-tech-node');
          _garageShowTechDetail(vid);
        };
      })(btns[bi]);
    }
  };

  console.log('[bmp-line] bmp1m 已就位，btr80.next = [btr80a, bmp1, t80]，科技樹縱向三列');
})();

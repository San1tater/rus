/* 載具配置：t80um (由載具標注編輯器 v2.0 生成) */
/* - 車輪完整圓形旋轉 + 遮罩下緣鏡像補全
 * - trackMask：車體遮罩折線（遮住輪子上半部），與履帶滾動無關
 * - trackLine：履帶帶子上邊界折線（履帶滾動 + 原圖擦除用），只用於履帶
 * - trackScroll：沿 trackLine 弧長參數化滾動（A 層原圖紋理 + B 層條紋，v = ω·r）
 * - 渲染順序：image → eraseOriginalTrack → trackScroll → wheels → trackMask → doors → muzzles → effects
 *   （原圖 trackLine 以下且 trackMask 以下被擦除，保護車體；履帶在輪子下層）
 * - 已移除炮射導彈（9M112 / 9M119 / 9M119M / 9M113）
 * - T-80BVD / T-80BU 合併至 t80bv 作為未開放塗裝，不獨立成科技樹節點
 */
const VEHICLE_ANNOTATION_T80UM = {
  "id": "t80um",
  "orientation": "right",
  "imageSize": {
    "w": 790,
    "h": 301
  },
  "vehicleMeta": {
    "name": "T-80UM",
    "tier": 6,
    "line": "t80",
    "weapons": [
      {
        "id": "pkt",
        "name": "7.62mm PKT",
        "type": "機槍",
        "caliber": "7.62mm"
      },
      {
        "id": "nsvt",
        "name": "12.7mm NSVT",
        "type": "機槍",
        "caliber": "12.7mm"
      },
      {
        "id": "2a46m1",
        "name": "125mm 2A46M-1",
        "type": "主炮",
        "caliber": "125mm"
      }
    ]
  },
  "anchor": {
    "groundY": 1,
    "centerX": 0.5
  },
  "trackMask": {
    "enabled": true,
    "points": [
      {
        "x": 0.0383,
        "y": 0.75
      },
      {
        "x": 0.1054,
        "y": 0.821
      },
      {
        "x": 0.7153,
        "y": 0.8163
      },
      {
        "x": 0.7257,
        "y": 0.7571
      }
    ]
  },
  "trackLine": {
    "points": [
      {
        "x": 0.0629,
        "y": 0.7371
      },
      {
        "x": 0.0763,
        "y": 0.858
      },
      {
        "x": 0.1638,
        "y": 1.0032
      },
      {
        "x": 0.6058,
        "y": 0.9979
      },
      {
        "x": 0.6781,
        "y": 0.8774
      },
      {
        "x": 0.7063,
        "y": 0.8099
      },
      {
        "x": 0.71,
        "y": 0.7729
      },
      {
        "x": 0.7084,
        "y": 0.7565
      }
    ]
  },
  "trackScroll": {
    "enabled": true,
    "direction": -1,
    "spacing": 0.06,
    "darkAlpha": 0.28,
    "lightAlpha": 0.12,
    "followWheel": 0,
    "useTexture": true,
    "textureX0": 0.378,
    "textureX1": 0.3923,
    "textureY0": 0.9271,
    "textureY1": 1,
    "bandHeight": 0.08,
    "textureOpacity": 0.85,
    "useStripes": true,
    "stripeStrength": 0.25
  },
  "renderOrder": [
    "image",
    "eraseOriginalTrack",
    "trackScroll",
    "wheels",
    "trackMask",
    "doors",
    "muzzles",
    "effects"
  ],
  "weapons": [
    {
      "id": "pkt",
      "name": "7.62mm PKT",
      "type": "機槍",
      "caliber": "7.62mm"
    },
    {
      "id": "nsvt",
      "name": "12.7mm NSVT",
      "type": "機槍",
      "caliber": "12.7mm"
    },
    {
      "id": "2a46m1",
      "name": "125mm 2A46M-1",
      "type": "主炮",
      "caliber": "125mm"
    }
  ],
  "wheels": [
    {
      "cx": 0.1167,
      "cy": 0.8124,
      "r": 0.0341,
      "rotSpeed": 1
    },
    {
      "cx": 0.1873,
      "cy": 0.8874,
      "r": 0.0341,
      "rotSpeed": 1
    },
    {
      "cx": 0.2602,
      "cy": 0.8826,
      "r": 0.0341,
      "rotSpeed": 1
    },
    {
      "cx": 0.3467,
      "cy": 0.8835,
      "r": 0.0341,
      "rotSpeed": 1
    },
    {
      "cx": 0.4252,
      "cy": 0.8872,
      "r": 0.0341,
      "rotSpeed": 1
    },
    {
      "cx": 0.514,
      "cy": 0.8855,
      "r": 0.0341,
      "rotSpeed": 1
    },
    {
      "cx": 0.5932,
      "cy": 0.8834,
      "r": 0.0341,
      "rotSpeed": 1
    },
    {
      "cx": 0.6694,
      "cy": 0.7842,
      "r": 0.0341,
      "rotSpeed": 1
    }
  ],
  "doors": {
    "upper": [],
    "lower": [],
    "hatch": [
      {
        "polygon": [
          {
            "x": 0.3136,
            "y": 0.3821
          },
          {
            "x": 0.3225,
            "y": 0.3808
          },
          {
            "x": 0.3373,
            "y": 0.3844
          },
          {
            "x": 0.349,
            "y": 0.3916
          },
          {
            "x": 0.3541,
            "y": 0.4027
          },
          {
            "x": 0.3533,
            "y": 0.4127
          },
          {
            "x": 0.3495,
            "y": 0.4197
          },
          {
            "x": 0.3302,
            "y": 0.4189
          },
          {
            "x": 0.3292,
            "y": 0.4369
          },
          {
            "x": 0.3195,
            "y": 0.4408
          },
          {
            "x": 0.31,
            "y": 0.441
          },
          {
            "x": 0.3001,
            "y": 0.4305
          },
          {
            "x": 0.2949,
            "y": 0.4161
          },
          {
            "x": 0.2969,
            "y": 0.4017
          },
          {
            "x": 0.3029,
            "y": 0.3909
          }
        ],
        "fillColor": "#000000",
        "hingeP1": {
          "x": 0.31,
          "y": 0.441
        },
        "hingeP2": {
          "x": 0.3195,
          "y": 0.4408
        },
        "hingeEdgeIdx": 9,
        "openRotation": 90,
        "frontUses": "image_crop",
        "backUses": "solid_color",
        "flipDirection": "outward"
      }
    ]
  },
  "weaponAreas": [],
  "muzzles": [
    {
      "x": 1,
      "y": 0.4795,
      "name": "槍口 1",
      "weaponId": "2a46",
      "layerOrder": "above"
    },
    {
      "x": 0.4788,
      "y": 0.5411,
      "name": "槍口 3",
      "weaponId": "pkt",
      "layerOrder": "below"
    },
    {
      "x": 0.5367,
      "y": 0.2835,
      "name": "槍口 3",
      "weaponId": "nsvt",
      "layerOrder": "above"
    }
  ],
  "btrDoorTimeline": {
    "cycle": 20,
    "segments": [
      {
        "t0": 0,
        "t1": 1,
        "mode": "closed"
      },
      {
        "t0": 1,
        "t1": 2,
        "mode": "open"
      },
      {
        "t0": 2,
        "t1": 3.5,
        "mode": "holdOpen"
      },
      {
        "t0": 3.5,
        "t1": 4.5,
        "mode": "close"
      },
      {
        "t0": 4.5,
        "t1": 12,
        "mode": "closed"
      },
      {
        "t0": 12,
        "t1": 13,
        "mode": "open"
      },
      {
        "t0": 13,
        "t1": 14.5,
        "mode": "holdOpen"
      },
      {
        "t0": 14.5,
        "t1": 15.5,
        "mode": "close"
      },
      {
        "t0": 15.5,
        "t1": 20,
        "mode": "closed"
      }
    ]
  }
};

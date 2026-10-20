/* 載具配置：t80u (由載具標注編輯器 v2.0 生成) */
/* - 車輪完整圓形旋轉 + 遮罩下緣鏡像補全
 * - trackMask：車體遮罩折線（遮住輪子上半部），與履帶滾動無關
 * - trackLine：履帶帶子上邊界折線（履帶滾動 + 原圖擦除用），只用於履帶
 * - trackScroll：沿 trackLine 弧長參數化滾動（A 層原圖紋理 + B 層條紋，v = ω·r）
 * - 渲染順序：image → eraseOriginalTrack → trackScroll → wheels → trackMask → doors → muzzles → effects
 *   （原圖 trackLine 以下且 trackMask 以下被擦除，保護車體；履帶在輪子下層）
 * - 已移除炮射導彈（9M112 / 9M119 / 9M119M / 9M113）
 * - T-80BVD / T-80BU 合併至 t80bv 作為未開放塗裝，不獨立成科技樹節點
 */
const VEHICLE_ANNOTATION_T80U = {
  "id": "t80u",
  "orientation": "right",
  "imageSize": {
    "w": 790,
    "h": 237
  },
  "vehicleMeta": {
    "name": "T-80U",
    "tier": 5,
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
        "x": 0.0288,
        "y": 0.649
      },
      {
        "x": 0.1,
        "y": 0.7597
      },
      {
        "x": 0.6887,
        "y": 0.7688
      },
      {
        "x": 0.7266,
        "y": 0.7294
      }
    ]
  },
  "trackLine": {
    "points": [
      {
        "x": 0.0676,
        "y": 0.6786
      },
      {
        "x": 0.0823,
        "y": 0.8423
      },
      {
        "x": 0.1592,
        "y": 0.9867
      },
      {
        "x": 0.6058,
        "y": 0.9979
      },
      {
        "x": 0.6727,
        "y": 0.8697
      },
      {
        "x": 0.7082,
        "y": 0.7714
      },
      {
        "x": 0.6926,
        "y": 0.6775
      },
      {
        "x": 0.6877,
        "y": 0.7336
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
    "textureX0": 0.382,
    "textureX1": 0.3961,
    "textureY0": 0.9172,
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
      "cx": 0.1144,
      "cy": 0.7521,
      "r": 0.0341,
      "rotSpeed": 1
    },
    {
      "cx": 0.1842,
      "cy": 0.8519,
      "r": 0.0341,
      "rotSpeed": 1
    },
    {
      "cx": 0.2607,
      "cy": 0.8506,
      "r": 0.0341,
      "rotSpeed": 1
    },
    {
      "cx": 0.3485,
      "cy": 0.8504,
      "r": 0.0341,
      "rotSpeed": 1
    },
    {
      "cx": 0.4257,
      "cy": 0.8506,
      "r": 0.0341,
      "rotSpeed": 1
    },
    {
      "cx": 0.5171,
      "cy": 0.8536,
      "r": 0.0341,
      "rotSpeed": 1
    },
    {
      "cx": 0.5937,
      "cy": 0.8384,
      "r": 0.0341,
      "rotSpeed": 1
    },
    {
      "cx": 0.6712,
      "cy": 0.7097,
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
            "x": 0.3234,
            "y": 0.2178
          },
          {
            "x": 0.3393,
            "y": 0.2163
          },
          {
            "x": 0.3521,
            "y": 0.2289
          },
          {
            "x": 0.3556,
            "y": 0.2427
          },
          {
            "x": 0.3454,
            "y": 0.2787
          },
          {
            "x": 0.3338,
            "y": 0.2889
          },
          {
            "x": 0.3051,
            "y": 0.2837
          },
          {
            "x": 0.2981,
            "y": 0.2743
          },
          {
            "x": 0.295,
            "y": 0.2515
          },
          {
            "x": 0.2978,
            "y": 0.2324
          },
          {
            "x": 0.3076,
            "y": 0.2163
          }
        ],
        "fillColor": "#000000",
        "hingeP1": {
          "x": 0.3051,
          "y": 0.2837
        },
        "hingeP2": {
          "x": 0.3338,
          "y": 0.2889
        },
        "hingeEdgeIdx": 5,
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
      "y": 0.3443,
      "name": "槍口 1",
      "weaponId": "2a46",
      "layerOrder": "above"
    },
    {
      "x": 0.5332,
      "y": 0.0442,
      "name": "槍口 2",
      "weaponId": "nsvt",
      "layerOrder": "above"
    },
    {
      "x": 0.4999,
      "y": 0.4264,
      "name": "槍口 3",
      "weaponId": "pkt",
      "layerOrder": "below"
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

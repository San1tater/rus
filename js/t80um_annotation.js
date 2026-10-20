/* 載具配置：t80um (由載具標注編輯器 v1.9 生成) */
/* - 車輪完整圓形旋轉 + 遮罩下緣鏡像補全
 * - trackMask：車體遮罩折線（遮住輪子上半部），與履帶滾動無關
 * - trackLine：履帶帶子上邊界折線（履帶滾動 + 原圖擦除用），只用於履帶
 * - trackScroll：沿 trackLine 弧長參數化滾動（A 層原圖紋理 + B 層條紋，v = ω·r）
 * - 渲染順序：image → eraseOriginalTrack → trackScroll → wheels → trackMask → doors → muzzles → effects
 *   （原圖 trackLine 以下且 trackMask 以下被擦除，保護車體；履帶在輪子下層）
 */
const VEHICLE_ANNOTATION_T80UM = {
  "id": "t80um",
  "orientation": "right",
  "imageSize": {
    "w": 790,
    "h": 240
  },
  "anchor": {
    "groundY": 1,
    "centerX": 0.5
  },
  "trackMask": {
    "enabled": true,
    "points": [
      {
        "x": 0.0366,
        "y": 0.6559
      },
      {
        "x": 0.105,
        "y": 0.7657
      },
      {
        "x": 0.7005,
        "y": 0.7725
      },
      {
        "x": 0.7369,
        "y": 0.6587
      }
    ]
  },
  "trackLine": {
    "points": [
      {
        "x": 0.0604,
        "y": 0.6954
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
        "x": 0.7106,
        "y": 0.7756
      },
      {
        "x": 0.7106,
        "y": 0.757
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
      "cx": 0.1148,
      "cy": 0.7547,
      "r": 0.0341,
      "rotSpeed": 1
    },
    {
      "cx": 0.1832,
      "cy": 0.8526,
      "r": 0.0341,
      "rotSpeed": 1
    },
    {
      "cx": 0.2616,
      "cy": 0.8571,
      "r": 0.0341,
      "rotSpeed": 1
    },
    {
      "cx": 0.3497,
      "cy": 0.8518,
      "r": 0.0341,
      "rotSpeed": 1
    },
    {
      "cx": 0.4264,
      "cy": 0.8528,
      "r": 0.0341,
      "rotSpeed": 1
    },
    {
      "cx": 0.5162,
      "cy": 0.8537,
      "r": 0.0341,
      "rotSpeed": 1
    },
    {
      "cx": 0.593,
      "cy": 0.8497,
      "r": 0.0341,
      "rotSpeed": 1
    },
    {
      "cx": 0.6684,
      "cy": 0.7093,
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
            "x": 0.3159,
            "y": 0.2301
          },
          {
            "x": 0.3248,
            "y": 0.2288
          },
          {
            "x": 0.3396,
            "y": 0.2324
          },
          {
            "x": 0.3513,
            "y": 0.2396
          },
          {
            "x": 0.3564,
            "y": 0.2507
          },
          {
            "x": 0.3556,
            "y": 0.2607
          },
          {
            "x": 0.3518,
            "y": 0.2677
          },
          {
            "x": 0.3298,
            "y": 0.2696
          },
          {
            "x": 0.3295,
            "y": 0.2946
          },
          {
            "x": 0.3232,
            "y": 0.293
          },
          {
            "x": 0.3117,
            "y": 0.2935
          },
          {
            "x": 0.3015,
            "y": 0.2826
          },
          {
            "x": 0.2972,
            "y": 0.2641
          },
          {
            "x": 0.2992,
            "y": 0.2497
          },
          {
            "x": 0.3052,
            "y": 0.2389
          }
        ],
        "fillColor": "#000000",
        "hingeP1": {
          "x": 0.3117,
          "y": 0.2935
        },
        "hingeP2": {
          "x": 0.3295,
          "y": 0.2946
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
      "y": 0.352,
      "name": "槍口 1",
      "weaponId": "2a46",
      "layerOrder": "above"
    },
    {
      "x": 0.531,
      "y": 0.4171,
      "name": "槍口 2",
      "weaponId": "pkt",
      "layerOrder": "above"
    },
    {
      "x": 0.536,
      "y": 0.1129,
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

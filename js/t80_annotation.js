/* 載具配置：t80 (由載具標注編輯器 v1.9 生成) */
/* - 車輪完整圓形旋轉 + 遮罩下緣鏡像補全
 * - trackMask：車體遮罩折線（遮住輪子上半部），與履帶滾動無關
 * - trackLine：履帶帶子上邊界折線（履帶滾動 + 原圖擦除用），只用於履帶
 * - trackScroll：沿 trackLine 弧長參數化滾動（A 層原圖紋理 + B 層條紋，v = ω·r）
 * - 渲染順序：image → eraseOriginalTrack → trackScroll → wheels → trackMask → doors → muzzles → effects
 *   （原圖 trackLine 以下且 trackMask 以下被擦除，保護車體；履帶在輪子下層）
 */
const VEHICLE_ANNOTATION_T80 = {
  "id": "t80",
  "orientation": "right",
  "imageSize": {
    "w": 790,
    "h": 235
  },
  "anchor": {
    "groundY": 1,
    "centerX": 0.5
  },
  "trackMask": {
    "enabled": true,
    "points": [
      {
        "x": 0.0545,
        "y": 0.7264
      },
      {
        "x": 0.141,
        "y": 0.787
      },
      {
        "x": 0.6775,
        "y": 0.7355
      },
      {
        "x": 0.723,
        "y": 0.6628
      }
    ]
  },
  "trackLine": {
    "points": [
      {
        "x": 0.0741,
        "y": 0.7262
      },
      {
        "x": 0.0864,
        "y": 0.8487
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
        "x": 0.6727,
        "y": 0.8697
      },
      {
        "x": 0.7082,
        "y": 0.7714
      },
      {
        "x": 0.7045,
        "y": 0.6256
      },
      {
        "x": 0.7045,
        "y": 0.6256
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
    "textureX0": 0.3806,
    "textureX1": 0.3955,
    "textureY0": 0.9147,
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
      "id": "2a46",
      "name": "125mm 2A46",
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
            "x": 0.312,
            "y": 0.204
          },
          {
            "x": 0.3272,
            "y": 0.2003
          },
          {
            "x": 0.3362,
            "y": 0.2125
          },
          {
            "x": 0.3398,
            "y": 0.2293
          },
          {
            "x": 0.3398,
            "y": 0.2505
          },
          {
            "x": 0.3371,
            "y": 0.2632
          },
          {
            "x": 0.3316,
            "y": 0.2686
          },
          {
            "x": 0.3273,
            "y": 0.2691
          },
          {
            "x": 0.3195,
            "y": 0.2713
          },
          {
            "x": 0.3137,
            "y": 0.2691
          },
          {
            "x": 0.3072,
            "y": 0.265
          },
          {
            "x": 0.3,
            "y": 0.2587
          },
          {
            "x": 0.2987,
            "y": 0.255
          },
          {
            "x": 0.2968,
            "y": 0.2451
          },
          {
            "x": 0.2973,
            "y": 0.2397
          },
          {
            "x": 0.3003,
            "y": 0.2279
          },
          {
            "x": 0.3022,
            "y": 0.2189
          },
          {
            "x": 0.3064,
            "y": 0.2135
          }
        ],
        "fillColor": "#000000",
        "hingeP1": {
          "x": 0.3195,
          "y": 0.2713
        },
        "hingeP2": {
          "x": 0.3273,
          "y": 0.2691
        },
        "hingeEdgeIdx": 7,
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
      "x": 0.9983,
      "y": 0.4098,
      "name": "槍口 1",
      "weaponId": "2a46",
      "layerOrder": "above"
    },
    {
      "x": 0.5037,
      "y": 0.04,
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

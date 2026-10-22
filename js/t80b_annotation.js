/* 載具配置：t80b (由載具標注編輯器 v1.9 生成) */
/* - 車輪完整圓形旋轉 + 遮罩下緣鏡像補全
 * - trackMask：車體遮罩折線（遮住輪子上半部），與履帶滾動無關
 * - trackLine：履帶帶子上邊界折線（履帶滾動 + 原圖擦除用），只用於履帶
 * - trackScroll：沿 trackLine 弧長參數化滾動（A 層原圖紋理 + B 層條紋，v = ω·r）
 * - 渲染順序：image → eraseOriginalTrack → trackScroll → wheels → trackMask → doors → muzzles → effects
 *   （原圖 trackLine 以下且 trackMask 以下被擦除，保護車體；履帶在輪子下層）
 */
const VEHICLE_ANNOTATION_T80B = {
  "id": "t80b",
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
        "x": 0.0479,
        "y": 0.6829
      },
      {
        "x": 0.0593,
        "y": 0.7152
      },
      {
        "x": 0.1191,
        "y": 0.7546
      },
      {
        "x": 0.691,
        "y": 0.7433
      },
      {
        "x": 0.7229,
        "y": 0.6552
      }
    ]
  },
  "trackLine": {
    "points": [
      {
        "x": 0.0759,
        "y": 0.6724
      },
      {
        "x": 0.078,
        "y": 0.785
      },
      {
        "x": 0.0925,
        "y": 0.8575
      },
      {
        "x": 0.1743,
        "y": 1.005
      },
      {
        "x": 0.6075,
        "y": 0.9938
      },
      {
        "x": 0.6573,
        "y": 0.9052
      },
      {
        "x": 0.7045,
        "y": 0.7902
      },
      {
        "x": 0.7101,
        "y": 0.672
      },
      {
        "x": 0.7161,
        "y": 0.6523
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
      "id": "2a46",
      "name": "125mm 2A46",
      "type": "主炮",
      "caliber": "125mm"
    }
  ],
  "wheels": [
    {
      "cx": 0.115,
      "cy": 0.7552,
      "r": 0.0341,
      "rotSpeed": 1
    },
    {
      "cx": 0.1835,
      "cy": 0.8429,
      "r": 0.0341,
      "rotSpeed": 1
    },
    {
      "cx": 0.2616,
      "cy": 0.8476,
      "r": 0.0341,
      "rotSpeed": 1
    },
    {
      "cx": 0.3481,
      "cy": 0.8487,
      "r": 0.0341,
      "rotSpeed": 1
    },
    {
      "cx": 0.4252,
      "cy": 0.8509,
      "r": 0.0341,
      "rotSpeed": 1
    },
    {
      "cx": 0.5149,
      "cy": 0.8476,
      "r": 0.0341,
      "rotSpeed": 1
    },
    {
      "cx": 0.5927,
      "cy": 0.8455,
      "r": 0.0341,
      "rotSpeed": 1
    },
    {
      "cx": 0.6726,
      "cy": 0.7145,
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
            "x": 0.3209,
            "y": 0.2081
          },
          {
            "x": 0.3349,
            "y": 0.2052
          },
          {
            "x": 0.3458,
            "y": 0.2168
          },
          {
            "x": 0.3521,
            "y": 0.2293
          },
          {
            "x": 0.3541,
            "y": 0.2462
          },
          {
            "x": 0.3511,
            "y": 0.2559
          },
          {
            "x": 0.3482,
            "y": 0.2684
          },
          {
            "x": 0.3447,
            "y": 0.2761
          },
          {
            "x": 0.3404,
            "y": 0.2831
          },
          {
            "x": 0.3333,
            "y": 0.2887
          },
          {
            "x": 0.3171,
            "y": 0.2887
          },
          {
            "x": 0.3094,
            "y": 0.2859
          },
          {
            "x": 0.303,
            "y": 0.28
          },
          {
            "x": 0.2979,
            "y": 0.2694
          },
          {
            "x": 0.2947,
            "y": 0.2597
          },
          {
            "x": 0.293,
            "y": 0.2496
          },
          {
            "x": 0.2942,
            "y": 0.2385
          },
          {
            "x": 0.298,
            "y": 0.2259
          },
          {
            "x": 0.3018,
            "y": 0.2202
          },
          {
            "x": 0.3076,
            "y": 0.212
          },
          {
            "x": 0.3132,
            "y": 0.2076
          }
        ],
        "fillColor": "#000000",
        "hingeP1": {
          "x": 0.3171,
          "y": 0.2887
        },
        "hingeP2": {
          "x": 0.3333,
          "y": 0.2887
        },
        "hingeEdgeIdx": 11,
        "openRotation": 90,
        "frontUses": "image_crop",
        "backUses": "solid_color",
        "flipDirection": "outward"
      }
    ]
  },
  "weaponAreas": [
    {
      "id": "ov5a01d4",
      "polygon": [
        {
          "x": 0.5212,
          "y": 0.3523
        },
        {
          "x": 0.5213,
          "y": 0.4926
        },
        {
          "x": 1.0095,
          "y": 0.4736
        },
        {
          "x": 1.0116,
          "y": 0.3503
        }
      ],
      "name": "武器 1",
      "weaponId": "2a46",
      "recoilDist": 0.06
    }
  ],
  "muzzles": [
    {
      "x": 1.0042,
      "y": 0.4131,
      "name": "槍口 1",
      "weaponId": "2a46",
      "layerOrder": "above"
    },
    {
      "x": 0.5015,
      "y": 0.4299,
      "name": "槍口 3",
      "weaponId": "pkt",
      "layerOrder": "above"
    },
    {
      "x": 0.4905,
      "y": 0.1119,
      "name": "槍口 2",
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

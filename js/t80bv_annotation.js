/* 載具配置：t80bv (由載具標注編輯器 v2.0 生成) */
/* - 車輪完整圓形旋轉 + 遮罩下緣鏡像補全
 * - trackMask：車體遮罩折線（遮住輪子上半部），與履帶滾動無關
 * - trackLoop：履帶環多邊形（閉合），遊戲端需按此多邊形執行擦除與貼圖
 * - trackScroll：沿 trackLoop 弧長參數化滾動（原圖紋理，方向正向）
 * - fusion：融合車門（純實色多邊形）
 * - missiles：單發實體導彈
 */
const VEHICLE_ANNOTATION_T80BV = {
  "id": "t80bv",
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
        "x": 0.0298,
        "y": 0.6227
      },
      {
        "x": 0.053,
        "y": 0.6386
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
        "x": 0.7359,
        "y": 0.7152
      }
    ]
  },
  "trackLoop": {
    "points": [
      {
        "x": 0.0689,
        "y": 0.6522
      },
      {
        "x": 0.0786,
        "y": 0.821
      },
      {
        "x": 0.1567,
        "y": 1
      },
      {
        "x": 0.604,
        "y": 1
      },
      {
        "x": 0.7023,
        "y": 0.8203
      },
      {
        "x": 0.7185,
        "y": 0.7143
      },
      {
        "x": 0.7018,
        "y": 0.6401
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
            "x": 0.3471,
            "y": 0.265
          },
          {
            "x": 0.3435,
            "y": 0.2723
          },
          {
            "x": 0.3418,
            "y": 0.2742
          },
          {
            "x": 0.3376,
            "y": 0.2607
          },
          {
            "x": 0.3078,
            "y": 0.2631
          },
          {
            "x": 0.3061,
            "y": 0.2732
          },
          {
            "x": 0.3029,
            "y": 0.2742
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
          "x": 0.3029,
          "y": 0.2742
        },
        "hingeP2": {
          "x": 0.3418,
          "y": 0.2742
        },
        "hingeEdgeIdx": 11,
        "openRotation": 90,
        "frontUses": "image_crop",
        "backUses": "solid_color",
        "flipDirection": "outward"
      }
    ],
    "fusion": []
  },
  "missiles": [],
  "weaponAreas": [
    {
      "id": "oqniw45i",
      "polygon": [
        {
          "x": 0.523,
          "y": 0.3691
        },
        {
          "x": 0.5213,
          "y": 0.396
        },
        {
          "x": 0.5226,
          "y": 0.4799
        },
        {
          "x": 1.0134,
          "y": 0.4692
        },
        {
          "x": 1.0122,
          "y": 0.3587
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
      "x": 0.4982,
      "y": 0.4421,
      "name": "槍口 3",
      "weaponId": "pkt",
      "layerOrder": "above"
    },
    {
      "x": 0.5183,
      "y": 0.0864,
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

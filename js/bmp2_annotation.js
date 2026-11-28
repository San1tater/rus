/* 載具配置：bmp2 (由載具標注編輯器 v2.0 生成) */
/* - 車輪完整圓形旋轉 + 遮罩下緣鏡像補全
 * - trackMask：車體遮罩折線（遮住輪子上半部），與履帶滾動無關
 * - trackLoop：履帶環多邊形（閉合），遊戲端需按此多邊形執行擦除與貼圖
 * - trackScroll：沿 trackLoop 弧長參數化滾動（原圖紋理，方向正向）
 * - fusion：融合車門（純實色多邊形）
 * - missiles：單發實體導彈
 * - muzzles[].angle：砲管仰角（度），遊戲端 _setupMuzzles 讀取後驅動曳光／煙jet 方向
 */
const VEHICLE_ANNOTATION_BMP2 = {
  "id": "bmp2",
  "orientation": "right",
  "imageSize": {
    "w": 545,
    "h": 215
  },
  "trackMask": {
    "enabled": true,
    "points": [
      {
        "x": 0.0204,
        "y": 0.8338
      },
      {
        "x": 0.0467,
        "y": 0.6605
      },
      {
        "x": 0.769,
        "y": 0.6583
      },
      {
        "x": 0.8946,
        "y": 0.7399
      }
    ]
  },
  "trackLoop": {
    "points": [
      {
        "x": 0.0902,
        "y": 0.5446
      },
      {
        "x": 0.0381,
        "y": 0.6281
      },
      {
        "x": 0.0403,
        "y": 0.7928
      },
      {
        "x": 0.0854,
        "y": 0.8717
      },
      {
        "x": 0.1706,
        "y": 1
      },
      {
        "x": 0.7339,
        "y": 1
      },
      {
        "x": 0.8663,
        "y": 0.7523
      },
      {
        "x": 0.8783,
        "y": 0.5907
      },
      {
        "x": 0.7678,
        "y": 0.5227
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
    "textureX0": 0.3518,
    "textureX1": 0.3716,
    "textureY0": 0.9342,
    "textureY1": 1,
    "bandHeight": 0.08,
    "textureOpacity": 0.85,
    "useStripes": false,
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
      "id": "2a42",
      "name": "30mm 2A42",
      "type": "機炮",
      "caliber": "30mm"
    },
    {
      "id": "atgm",
      "name": "ATGM 發射筒",
      "type": "反坦克導彈",
      "caliber": "—"
    }
  ],
  "wheels": [
    {
      "cx": 0.0917,
      "cy": 0.7187,
      "r": 0.043,
      "rotSpeed": 1
    },
    {
      "cx": 0.1947,
      "cy": 0.867,
      "r": 0.0482,
      "rotSpeed": 1
    },
    {
      "cx": 0.3047,
      "cy": 0.8655,
      "r": 0.0482,
      "rotSpeed": 1
    },
    {
      "cx": 0.4142,
      "cy": 0.8666,
      "r": 0.0482,
      "rotSpeed": 1
    },
    {
      "cx": 0.511,
      "cy": 0.8634,
      "r": 0.0482,
      "rotSpeed": 1
    },
    {
      "cx": 0.6095,
      "cy": 0.8678,
      "r": 0.0482,
      "rotSpeed": 1
    },
    {
      "cx": 0.7095,
      "cy": 0.8641,
      "r": 0.0482,
      "rotSpeed": 1
    },
    {
      "cx": 0.8139,
      "cy": 0.6971,
      "r": 0.0353,
      "rotSpeed": 1
    }
  ],
  "doors": {
    "upper": [],
    "lower": [],
    "hatch": [],
    "fusion": [
      {
        "polygon": [
          {
            "x": 0.0143,
            "y": 0.4821
          },
          {
            "x": 0.0263,
            "y": 0.6263
          },
          {
            "x": 0.0034,
            "y": 0.6734
          },
          {
            "x": -0.0367,
            "y": 0.6744
          },
          {
            "x": -0.0503,
            "y": 0.6359
          },
          {
            "x": -0.05,
            "y": 0.4655
          },
          {
            "x": -0.0394,
            "y": 0.4423
          },
          {
            "x": 0.0016,
            "y": 0.4434
          }
        ],
        "fillColor": "#000000",
        "hingeP1": {
          "x": 0.0143,
          "y": 0.4821
        },
        "hingeP2": {
          "x": 0.0263,
          "y": 0.6263
        },
        "hingeEdgeIdx": 0,
        "openRotation": 90
      }
    ]
  },
  "missiles": [
    {
      "polygon": [
        {
          "x": 0.551,
          "y": 0.051
        },
        {
          "x": 0.5514,
          "y": 0.0898
        },
        {
          "x": 0.5616,
          "y": 0.0895
        },
        {
          "x": 0.5552,
          "y": 0.1258
        },
        {
          "x": 0.5755,
          "y": 0.1244
        },
        {
          "x": 0.5852,
          "y": 0.0856
        },
        {
          "x": 0.6397,
          "y": 0.0866
        },
        {
          "x": 0.6627,
          "y": 0.0627
        },
        {
          "x": 0.6621,
          "y": 0.0549
        },
        {
          "x": 0.6374,
          "y": 0.036
        },
        {
          "x": 0.5815,
          "y": 0.0421
        },
        {
          "x": 0.5734,
          "y": 0.0121
        },
        {
          "x": 0.5513,
          "y": 0.0169
        },
        {
          "x": 0.551,
          "y": 0.0286
        },
        {
          "x": 0.5556,
          "y": 0.0476
        }
      ],
      "weaponId": "atgm"
    }
  ],
  "weaponAreas": [
    {
      "id": "omq3vxb1",
      "polygon": [
        {
          "x": 0.5983,
          "y": 0.2318
        },
        {
          "x": 0.598,
          "y": 0.2814
        },
        {
          "x": 0.8472,
          "y": 0.2727
        },
        {
          "x": 0.8471,
          "y": 0.2307
        }
      ],
      "name": "武器 1",
      "weaponId": "2a42",
      "recoilDist": 0.015
    }
  ],
  "muzzles": [
    {
      "x": 0.8428,
      "y": 0.2535,
      "name": "槍口 1",
      "weaponId": "2a42",
      "layerOrder": "above",
      "angle": 0
    },
    {
      "x": 0.5435,
      "y": 0.2579,
      "name": "槍口 2",
      "weaponId": "pkt",
      "layerOrder": "above",
      "angle": 0
    },
    {
      "x": 0.4309,
      "y": 0.0347,
      "name": "槍口 3",
      "weaponId": "atgm",
      "layerOrder": "above",
      "angle": 0
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

/* 載具配置：bmp3m (由載具標注編輯器 v2.0 生成) */
/* - 車輪完整圓形旋轉 + 遮罩下緣鏡像補全
 * - trackMask：車體遮罩折線（遮住輪子上半部），與履帶滾動無關
 * - trackLoop：履帶環多邊形（閉合），遊戲端需按此多邊形執行擦除與貼圖
 * - trackScroll：沿 trackLoop 弧長參數化滾動（原圖紋理，方向正向）
 * - fusion：融合車門（純實色多邊形）
 * - missiles：單發實體導彈
 * - muzzles[].angle：砲管仰角（度），遊戲端 _setupMuzzles 讀取後驅動曳光／煙jet 方向
 */
const VEHICLE_ANNOTATION_BMP3M = {
  "id": "bmp3m",
  "orientation": "right",
  "imageSize": {
    "w": 626,
    "h": 234
  },
  "trackMask": {
    "enabled": true,
    "points": [
      {
        "x": 0,
        "y": 0.6692
      },
      {
        "x": 0.2412,
        "y": 0.6902
      },
      {
        "x": 0.2364,
        "y": 0.6718
      },
      {
        "x": 0.7594,
        "y": 0.7113
      },
      {
        "x": 1,
        "y": 0.7548
      }
    ]
  },
  "trackLoop": {
    "points": [
      {
        "x": 0.0766,
        "y": 0.577
      },
      {
        "x": 0.0488,
        "y": 0.7242
      },
      {
        "x": 0.056,
        "y": 0.8045
      },
      {
        "x": 0.0809,
        "y": 0.8591
      },
      {
        "x": 0.1716,
        "y": 0.998
      },
      {
        "x": 0.7593,
        "y": 0.9964
      },
      {
        "x": 0.8908,
        "y": 0.7678
      },
      {
        "x": 0.8851,
        "y": 0.6116
      },
      {
        "x": 0.8414,
        "y": 0.5524
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
    "textureX0": 0.3361,
    "textureX1": 0.3541,
    "textureY0": 0.9365,
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
      "id": "2a72",
      "name": "30mm 2A72",
      "type": "機炮",
      "caliber": "30mm"
    },
    {
      "id": "2a70",
      "name": "100mm 2A70",
      "type": "主炮",
      "caliber": "100mm"
    }
  ],
  "wheels": [
    {
      "cx": 0.0949,
      "cy": 0.7411,
      "r": 0.0386,
      "rotSpeed": 1
    },
    {
      "cx": 0.1834,
      "cy": 0.8796,
      "r": 0.0386,
      "rotSpeed": 1
    },
    {
      "cx": 0.2984,
      "cy": 0.879,
      "r": 0.0386,
      "rotSpeed": 1
    },
    {
      "cx": 0.3936,
      "cy": 0.8813,
      "r": 0.0386,
      "rotSpeed": 1
    },
    {
      "cx": 0.5021,
      "cy": 0.8805,
      "r": 0.0386,
      "rotSpeed": 1
    },
    {
      "cx": 0.6357,
      "cy": 0.8787,
      "r": 0.0386,
      "rotSpeed": 1
    },
    {
      "cx": 0.7359,
      "cy": 0.8827,
      "r": 0.0386,
      "rotSpeed": 1
    },
    {
      "cx": 0.8602,
      "cy": 0.7148,
      "r": 0.0264,
      "rotSpeed": 1
    },
    {
      "cx": 0.2194,
      "cy": 0.682,
      "r": 0.0151,
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
            "x": 0.0408,
            "y": 0.4346
          },
          {
            "x": 0.0393,
            "y": 0.7
          },
          {
            "x": -0.0098,
            "y": 0.6987
          },
          {
            "x": -0.0191,
            "y": 0.6692
          },
          {
            "x": -0.0209,
            "y": 0.4599
          },
          {
            "x": -0.0118,
            "y": 0.4336
          }
        ],
        "fillColor": "#000000",
        "hingeP1": {
          "x": 0.0408,
          "y": 0.4346
        },
        "hingeP2": {
          "x": 0.0393,
          "y": 0.7
        },
        "hingeEdgeIdx": 0,
        "openRotation": 90
      }
    ]
  },
  "missiles": [],
  "weaponAreas": [
    {
      "id": "o3gr5hbc",
      "polygon": [
        {
          "x": 0.6892,
          "y": 0.2267
        },
        {
          "x": 0.6886,
          "y": 0.2568
        },
        {
          "x": 0.6901,
          "y": 0.2595
        },
        {
          "x": 0.6899,
          "y": 0.2737
        },
        {
          "x": 0.7132,
          "y": 0.2759
        },
        {
          "x": 0.7132,
          "y": 0.2907
        },
        {
          "x": 0.8289,
          "y": 0.2924
        },
        {
          "x": 0.8286,
          "y": 0.3027
        },
        {
          "x": 0.9733,
          "y": 0.304
        },
        {
          "x": 0.9735,
          "y": 0.2363
        },
        {
          "x": 0.9056,
          "y": 0.2354
        },
        {
          "x": 0.9052,
          "y": 0.2209
        },
        {
          "x": 0.8275,
          "y": 0.2217
        },
        {
          "x": 0.8276,
          "y": 0.23
        }
      ],
      "name": "武器 1",
      "weaponId": "2a70",
      "recoilDist": 0.035
    }
  ],
  "muzzles": [
    {
      "x": 0.9685,
      "y": 0.2658,
      "name": "槍口 1",
      "weaponId": "2a70",
      "layerOrder": "above",
      "angle": 0
    },
    {
      "x": 0.6907,
      "y": 0.265,
      "name": "槍口 2",
      "weaponId": "pkt",
      "layerOrder": "below",
      "angle": 0
    },
    {
      "x": 0.9165,
      "y": 0.2649,
      "name": "槍口 3",
      "weaponId": "2a72",
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

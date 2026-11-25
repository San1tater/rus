/* 載具配置：bmp3m (由載具標注編輯器 v2.0 生成) */
/* - 車輪完整圓形旋轉 + 遮罩下緣鏡像補全
 * - trackMask：車體遮罩折線（遮住輪子上半部），與履帶滾動無關
 * - trackLoop：履帶環多邊形（閉合），遊戲端需按此多邊形執行擦除與貼圖
 * - trackScroll：沿 trackLoop 弧長參數化滾動（原圖紋理，方向正向）
 * - fusion：融合車門（純實色多邊形）
 * - missiles：單發實體導彈
 */
const VEHICLE_ANNOTATION_BMP3M = {
  "id": "bmp3m",
  "orientation": "right",
  "imageSize": {
    "w": 626,
    "h": 234
  },
  "anchor": {
    "groundY": 0.85,
    "centerX": 0.5
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
      "id": "kpvt",
      "name": "14.5mm KPVT",
      "type": "機槍",
      "caliber": "14.5mm"
    },
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
      "id": "2a72",
      "name": "30mm 2A72",
      "type": "機炮",
      "caliber": "30mm"
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
    },
    {
      "id": "2a46",
      "name": "125mm 2A46",
      "type": "主炮",
      "caliber": "125mm"
    },
    {
      "id": "2a46m1",
      "name": "125mm 2A46M-1",
      "type": "主炮",
      "caliber": "125mm"
    },
    {
      "id": "2a28",
      "name": "73mm 2A28",
      "type": "低壓炮",
      "caliber": "73mm"
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
            "x": 0.0395,
            "y": 0.4152
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
            "x": -0.0196,
            "y": 0.4424
          },
          {
            "x": -0.0068,
            "y": 0.4158
          }
        ],
        "fillColor": "#000000",
        "hingeP1": {
          "x": 0.0395,
          "y": 0.4152
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
      "id": "otaygqqz",
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
          "x": 0.8335,
          "y": 0.2913
        },
        {
          "x": 0.8341,
          "y": 0.3011
        },
        {
          "x": 0.9862,
          "y": 0.2967
        },
        {
          "x": 0.9855,
          "y": 0.2354
        },
        {
          "x": 0.9195,
          "y": 0.2349
        },
        {
          "x": 0.9191,
          "y": 0.224
        },
        {
          "x": 0.8231,
          "y": 0.2234
        },
        {
          "x": 0.8227,
          "y": 0.2344
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
      "layerOrder": "above"
    },
    {
      "x": 0.6907,
      "y": 0.265,
      "name": "槍口 2",
      "weaponId": "pkt",
      "layerOrder": "below"
    },
    {
      "x": 0.9165,
      "y": 0.2649,
      "name": "槍口 3",
      "weaponId": "2a72",
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

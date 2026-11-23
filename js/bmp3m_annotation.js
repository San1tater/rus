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
    "w": 601,
    "h": 240
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
        "y": 0.688
      },
      {
        "x": 0.0552,
        "y": 0.6835
      },
      {
        "x": 0.2519,
        "y": 0.7277
      },
      {
        "x": 0.9611,
        "y": 0.7681
      }
    ]
  },
  "trackLoop": {
    "points": [
      {
        "x": 0.0795,
        "y": 0.546
      },
      {
        "x": 0.0232,
        "y": 0.7043
      },
      {
        "x": 0.0368,
        "y": 0.8156
      },
      {
        "x": 0.0697,
        "y": 0.8807
      },
      {
        "x": 0.1498,
        "y": 1.0029
      },
      {
        "x": 0.7593,
        "y": 0.9964
      },
      {
        "x": 0.8651,
        "y": 0.8396
      },
      {
        "x": 0.9271,
        "y": 0.6408
      },
      {
        "x": 0.8744,
        "y": 0.5396
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
    "textureX0": 0.2287,
    "textureX1": 0.2498,
    "textureY0": 0.9454,
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
      "cx": 0.085,
      "cy": 0.7599,
      "r": 0.038,
      "rotSpeed": 1
    },
    {
      "cx": 0.1836,
      "cy": 0.8893,
      "r": 0.038,
      "rotSpeed": 1
    },
    {
      "cx": 0.3036,
      "cy": 0.8902,
      "r": 0.038,
      "rotSpeed": 1
    },
    {
      "cx": 0.394,
      "cy": 0.8875,
      "r": 0.038,
      "rotSpeed": 1
    },
    {
      "cx": 0.4976,
      "cy": 0.8877,
      "r": 0.038,
      "rotSpeed": 1
    },
    {
      "cx": 0.6419,
      "cy": 0.8904,
      "r": 0.038,
      "rotSpeed": 1
    },
    {
      "cx": 0.7408,
      "cy": 0.8921,
      "r": 0.038,
      "rotSpeed": 1
    },
    {
      "cx": 0.8354,
      "cy": 0.7329,
      "r": 0.038,
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
            "x": 0.0202,
            "y": 0.4219
          },
          {
            "x": 0.0217,
            "y": 0.7016
          },
          {
            "x": -0.0397,
            "y": 0.7009
          },
          {
            "x": -0.0501,
            "y": 0.6707
          },
          {
            "x": -0.0491,
            "y": 0.4412
          },
          {
            "x": -0.0345,
            "y": 0.4188
          }
        ],
        "fillColor": "#000000",
        "hingeP1": {
          "x": 0.0202,
          "y": 0.4219
        },
        "hingeP2": {
          "x": 0.0217,
          "y": 0.7016
        },
        "hingeEdgeIdx": 0,
        "openRotation": 90
      }
    ]
  },
  "missiles": [],
  "weaponAreas": [
    {
      "id": "obkoiz94",
      "polygon": [
        {
          "x": 0.7041,
          "y": 0.2584
        },
        {
          "x": 0.7024,
          "y": 0.2929
        },
        {
          "x": 0.7042,
          "y": 0.3003
        },
        {
          "x": 0.7267,
          "y": 0.3003
        },
        {
          "x": 0.727,
          "y": 0.3136
        },
        {
          "x": 0.8453,
          "y": 0.3164
        },
        {
          "x": 0.8467,
          "y": 0.3283
        },
        {
          "x": 0.9937,
          "y": 0.3278
        },
        {
          "x": 0.9934,
          "y": 0.2519
        },
        {
          "x": 0.8455,
          "y": 0.2519
        },
        {
          "x": 0.8442,
          "y": 0.2613
        }
      ],
      "name": "武器 1",
      "weaponId": "2a70",
      "recoilDist": 0.035
    }
  ],
  "muzzles": [
    {
      "x": 0.9917,
      "y": 0.289,
      "name": "槍口 1",
      "weaponId": "2a70",
      "layerOrder": "above"
    },
    {
      "x": 0.7063,
      "y": 0.2889,
      "name": "槍口 2",
      "weaponId": "pkt",
      "layerOrder": "below"
    },
    {
      "x": 0.94,
      "y": 0.2878,
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

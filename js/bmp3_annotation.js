/* 載具配置：bmp3 (由載具標注編輯器 v2.0 生成) */
/* - 車輪完整圓形旋轉 + 遮罩下緣鏡像補全
 * - trackMask：車體遮罩折線（遮住輪子上半部），與履帶滾動無關
 * - trackLoop：履帶環多邊形（閉合），遊戲端需按此多邊形執行擦除與貼圖
 * - trackScroll：沿 trackLoop 弧長參數化滾動（原圖紋理，方向正向）
 * - fusion：融合車門（純實色多邊形）
 * - missiles：單發實體導彈
 */
const VEHICLE_ANNOTATION_BMP3 = {
  "id": "bmp3",
  "orientation": "right",
  "imageSize": {
    "w": 592,
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
        "x": 0.0012,
        "y": 0.651
      },
      {
        "x": 0.0486,
        "y": 0.6432
      },
      {
        "x": 0.7622,
        "y": 0.6457
      },
      {
        "x": 0.9687,
        "y": 0.6779
      }
    ]
  },
  "trackLoop": {
    "points": [
      {
        "x": 0.0815,
        "y": 0.5563
      },
      {
        "x": 0.0333,
        "y": 0.6772
      },
      {
        "x": 0.0384,
        "y": 0.787
      },
      {
        "x": 0.0611,
        "y": 0.8699
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
        "x": 0.9101,
        "y": 0.7594
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
    "textureX0": 0.3201,
    "textureX1": 0.3364,
    "textureY0": 0.9341,
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
      "cx": 0.081,
      "cy": 0.7308,
      "r": 0.0353,
      "rotSpeed": 1
    },
    {
      "cx": 0.1735,
      "cy": 0.8718,
      "r": 0.042,
      "rotSpeed": 1
    },
    {
      "cx": 0.2893,
      "cy": 0.8687,
      "r": 0.042,
      "rotSpeed": 1
    },
    {
      "cx": 0.3861,
      "cy": 0.8737,
      "r": 0.042,
      "rotSpeed": 1
    },
    {
      "cx": 0.4988,
      "cy": 0.8735,
      "r": 0.042,
      "rotSpeed": 1
    },
    {
      "cx": 0.6343,
      "cy": 0.8733,
      "r": 0.042,
      "rotSpeed": 1
    },
    {
      "cx": 0.7413,
      "cy": 0.8709,
      "r": 0.042,
      "rotSpeed": 1
    },
    {
      "cx": 0.8759,
      "cy": 0.6859,
      "r": 0.0351,
      "rotSpeed": 1
    },
    {
      "cx": 0.2092,
      "cy": 0.6732,
      "r": 0.0175,
      "rotSpeed": 1
    },
    {
      "cx": 0.4348,
      "cy": 0.6617,
      "r": 0.0189,
      "rotSpeed": 1
    },
    {
      "cx": 0.6719,
      "cy": 0.6454,
      "r": 0.018,
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
      "id": "ocb56di9",
      "polygon": [
        {
          "x": 0.717,
          "y": 0.2309
        },
        {
          "x": 0.7161,
          "y": 0.2423
        },
        {
          "x": 0.7072,
          "y": 0.2428
        },
        {
          "x": 0.7071,
          "y": 0.2658
        },
        {
          "x": 0.7163,
          "y": 0.2648
        },
        {
          "x": 0.7162,
          "y": 0.284
        },
        {
          "x": 0.8445,
          "y": 0.2829
        },
        {
          "x": 0.8447,
          "y": 0.2953
        },
        {
          "x": 0.9986,
          "y": 0.2902
        },
        {
          "x": 0.9976,
          "y": 0.2285
        },
        {
          "x": 0.9186,
          "y": 0.22
        },
        {
          "x": 0.8423,
          "y": 0.2196
        }
      ],
      "name": "武器 1",
      "weaponId": "2a70",
      "recoilDist": 0.048
    }
  ],
  "muzzles": [
    {
      "x": 0.9952,
      "y": 0.2548,
      "name": "槍口 1",
      "weaponId": "2a70",
      "layerOrder": "above"
    },
    {
      "x": 0.6899,
      "y": 0.265,
      "name": "槍口 2",
      "weaponId": "pkt",
      "layerOrder": "below"
    },
    {
      "x": 0.9385,
      "y": 0.2507,
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

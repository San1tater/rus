/* 載具配置：bmp3 (由載具標注編輯器 v2.0 生成) */
/* - 車輪完整圓形旋轉 + 遮罩下緣鏡像補全
 * - trackMask：車體遮罩折線（遮住輪子上半部），與履帶滾動無關
 * - trackLoop：履帶環多邊形（閉合），遊戲端需按此多邊形執行擦除與貼圖
 * - trackScroll：沿 trackLoop 弧長參數化滾動（原圖紋理，方向正向）
 * - fusion：融合車門（純實色多邊形）
 * - missiles：單發實體導彈
 * - muzzles[].angle：砲管仰角（度），遊戲端 _setupMuzzles 讀取後驅動曳光／煙jet 方向
 */
const VEHICLE_ANNOTATION_BMP3 = {
  "id": "bmp3",
  "orientation": "right",
  "imageSize": {
    "w": 592,
    "h": 234
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
    "textureX0": 0.3294,
    "textureX1": 0.3468,
    "textureY0": 0.9351,
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
      "cx": 0.082,
      "cy": 0.7361,
      "r": 0.0394,
      "rotSpeed": 1
    },
    {
      "cx": 0.1718,
      "cy": 0.8704,
      "r": 0.041,
      "rotSpeed": 1
    },
    {
      "cx": 0.2928,
      "cy": 0.8698,
      "r": 0.041,
      "rotSpeed": 1
    },
    {
      "cx": 0.3908,
      "cy": 0.8754,
      "r": 0.041,
      "rotSpeed": 1
    },
    {
      "cx": 0.5031,
      "cy": 0.8735,
      "r": 0.041,
      "rotSpeed": 1
    },
    {
      "cx": 0.6415,
      "cy": 0.8725,
      "r": 0.041,
      "rotSpeed": 1
    },
    {
      "cx": 0.7467,
      "cy": 0.8735,
      "r": 0.041,
      "rotSpeed": 1
    },
    {
      "cx": 0.8766,
      "cy": 0.6835,
      "r": 0.0333,
      "rotSpeed": 1
    },
    {
      "cx": 0.212,
      "cy": 0.6716,
      "r": 0.0172,
      "rotSpeed": 1
    },
    {
      "cx": 0.4377,
      "cy": 0.6633,
      "r": 0.0194,
      "rotSpeed": 1
    },
    {
      "cx": 0.6788,
      "cy": 0.6465,
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
      "id": "ofijtet6",
      "polygon": [
        {
          "x": 0.7005,
          "y": 0.2303
        },
        {
          "x": 0.7007,
          "y": 0.2547
        },
        {
          "x": 0.7022,
          "y": 0.2574
        },
        {
          "x": 0.702,
          "y": 0.2716
        },
        {
          "x": 0.7253,
          "y": 0.2738
        },
        {
          "x": 0.7253,
          "y": 0.2886
        },
        {
          "x": 0.8456,
          "y": 0.2892
        },
        {
          "x": 0.8469,
          "y": 0.301
        },
        {
          "x": 0.9979,
          "y": 0.3013
        },
        {
          "x": 0.9976,
          "y": 0.2333
        },
        {
          "x": 0.9316,
          "y": 0.2328
        },
        {
          "x": 0.9312,
          "y": 0.2219
        },
        {
          "x": 0.8352,
          "y": 0.2213
        },
        {
          "x": 0.8348,
          "y": 0.2323
        }
      ],
      "name": "武器 1",
      "weaponId": "2a70",
      "recoilDist": 0.035
    }
  ],
  "muzzles": [
    {
      "x": 0.9945,
      "y": 0.2668,
      "name": "槍口 1",
      "weaponId": "2a70",
      "layerOrder": "above",
      "angle": 0
    },
    {
      "x": 0.7014,
      "y": 0.2665,
      "name": "槍口 2",
      "weaponId": "pkt",
      "layerOrder": "below",
      "angle": 0
    },
    {
      "x": 0.9379,
      "y": 0.2645,
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

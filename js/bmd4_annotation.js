/* 載具配置：bmd4 (由載具標注編輯器 v2.0 生成) */
/* - 車輪完整圓形旋轉 + 遮罩下緣鏡像補全
 * - trackMask：車體遮罩折線（遮住輪子上半部），與履帶滾動無關
 * - trackLoop：履帶環多邊形（閉合），遊戲端需按此多邊形執行擦除與貼圖
 * - trackScroll：沿 trackLoop 弧長參數化滾動（原圖紋理，方向正向）
 * - fusion：融合車門（純實色多邊形）
 * - missiles：單發實體導彈
 */
const VEHICLE_ANNOTATION_BMD4 = {
  "id": "bmd4",
  "orientation": "right",
  "imageSize": {
    "w": 556,
    "h": 193
  },
  "anchor": {
    "groundY": 0.85,
    "centerX": 0.5
  },
  "trackMask": {
    "enabled": true,
    "points": [
      {
        "x": 0.0028,
        "y": 0.711
      },
      {
        "x": 0.0712,
        "y": 0.5171
      },
      {
        "x": 0.7757,
        "y": 0.5236
      },
      {
        "x": 0.86,
        "y": 0.7025
      }
    ]
  },
  "trackLoop": {
    "points": [
      {
        "x": 0.0602,
        "y": 0.5977
      },
      {
        "x": 0.1255,
        "y": 0.5614
      },
      {
        "x": 0.2096,
        "y": 0.5399
      },
      {
        "x": 0.598,
        "y": 0.5433
      },
      {
        "x": 0.7649,
        "y": 0.5563
      },
      {
        "x": 0.794,
        "y": 0.5938
      },
      {
        "x": 0.8068,
        "y": 0.6792
      },
      {
        "x": 0.7991,
        "y": 0.7614
      },
      {
        "x": 0.6645,
        "y": 0.9976
      },
      {
        "x": 0.1538,
        "y": 0.9967
      },
      {
        "x": 0.0548,
        "y": 0.8177
      },
      {
        "x": 0.0399,
        "y": 0.7422
      },
      {
        "x": 0.0464,
        "y": 0.6576
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
    "textureX0": 0.3409,
    "textureX1": 0.3575,
    "textureY0": 0.9322,
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
      "cx": 0.0877,
      "cy": 0.7247,
      "r": 0.0353,
      "rotSpeed": 1
    },
    {
      "cx": 0.1796,
      "cy": 0.8469,
      "r": 0.042,
      "rotSpeed": 1
    },
    {
      "cx": 0.297,
      "cy": 0.8466,
      "r": 0.042,
      "rotSpeed": 1
    },
    {
      "cx": 0.412,
      "cy": 0.8492,
      "r": 0.042,
      "rotSpeed": 1
    },
    {
      "cx": 0.5246,
      "cy": 0.8438,
      "r": 0.042,
      "rotSpeed": 1
    },
    {
      "cx": 0.6401,
      "cy": 0.8415,
      "r": 0.042,
      "rotSpeed": 1
    },
    {
      "cx": 0.759,
      "cy": 0.6839,
      "r": 0.042,
      "rotSpeed": 1
    },
    {
      "cx": 0.2332,
      "cy": 0.6188,
      "r": 0.0175,
      "rotSpeed": 1
    },
    {
      "cx": 0.3435,
      "cy": 0.6204,
      "r": 0.0189,
      "rotSpeed": 1
    },
    {
      "cx": 0.5775,
      "cy": 0.6149,
      "r": 0.018,
      "rotSpeed": 1
    },
    {
      "cx": 0.4602,
      "cy": 0.6166,
      "r": 0.0182,
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
            "x": 0.0267,
            "y": 0.3753
          },
          {
            "x": 0.0293,
            "y": 0.6204
          },
          {
            "x": -0.02,
            "y": 0.6197
          },
          {
            "x": -0.029,
            "y": 0.5997
          },
          {
            "x": -0.0287,
            "y": 0.4092
          },
          {
            "x": -0.023,
            "y": 0.3833
          }
        ],
        "fillColor": "#000000",
        "hingeP1": {
          "x": 0.0267,
          "y": 0.3753
        },
        "hingeP2": {
          "x": 0.0293,
          "y": 0.6204
        },
        "hingeEdgeIdx": 0,
        "openRotation": 90
      }
    ]
  },
  "missiles": [],
  "weaponAreas": [
    {
      "id": "omtiwlzc",
      "polygon": [
        {
          "x": 0.6394,
          "y": 0.1963
        },
        {
          "x": 0.6389,
          "y": 0.2177
        },
        {
          "x": 0.6639,
          "y": 0.2172
        },
        {
          "x": 0.6636,
          "y": 0.2601
        },
        {
          "x": 0.639,
          "y": 0.2607
        },
        {
          "x": 0.6378,
          "y": 0.2805
        },
        {
          "x": 0.8764,
          "y": 0.2816
        },
        {
          "x": 1.0026,
          "y": 0.2794
        },
        {
          "x": 0.9958,
          "y": 0.2044
        }
      ],
      "name": "武器 1",
      "weaponId": "2a70",
      "recoilDist": 0.085
    }
  ],
  "muzzles": [
    {
      "x": 0.9926,
      "y": 0.2389,
      "name": "槍口 1",
      "weaponId": "2a70",
      "layerOrder": "above"
    },
    {
      "x": 0.6229,
      "y": 0.246,
      "name": "槍口 2",
      "weaponId": "pkt",
      "layerOrder": "below"
    },
    {
      "x": 0.9449,
      "y": 0.2423,
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

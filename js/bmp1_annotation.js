/* 載具配置：bmp1 (由載具標注編輯器 v2.0 生成) */
/* - 車輪完整圓形旋轉 + 遮罩下緣鏡像補全
 * - trackMask：車體遮罩折線（遮住輪子上半部），與履帶滾動無關
 * - trackLoop：履帶環多邊形（閉合），遊戲端需按此多邊形執行擦除與貼圖
 * - trackScroll：沿 trackLoop 弧長參數化滾動（原圖紋理，方向正向）
 * - fusion：融合車門（純實色多邊形）
 * - missiles：單發實體導彈
 */
const VEHICLE_ANNOTATION_BMP1 = {
  "id": "bmp1",
  "orientation": "right",
  "imageSize": {
    "w": 545,
    "h": 187
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
        "y": 0.6974
      },
      {
        "x": 0.0879,
        "y": 0.5741
      },
      {
        "x": 0.7714,
        "y": 0.5856
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
        "x": 0.0883,
        "y": 0.5195
      },
      {
        "x": 0.039,
        "y": 0.6271
      },
      {
        "x": 0.0414,
        "y": 0.7614
      },
      {
        "x": 0.0876,
        "y": 0.8603
      },
      {
        "x": 0.1706,
        "y": 1
      },
      {
        "x": 0.7187,
        "y": 1
      },
      {
        "x": 0.8614,
        "y": 0.7255
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
    "textureX0": 0.3463,
    "textureX1": 0.3657,
    "textureY0": 0.9426,
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
      "id": "atgm",
      "name": "ATGM 發射筒",
      "type": "反坦克導彈",
      "caliber": "—"
    },
    {
      "id": "2a28",
      "name": "73mm 2A28",
      "type": "低壓炮",
      "caliber": "73mm"
    }
  ],
  "wheels": [
    {
      "cx": 0.0925,
      "cy": 0.6852,
      "r": 0.0411,
      "rotSpeed": 1
    },
    {
      "cx": 0.1933,
      "cy": 0.8409,
      "r": 0.0456,
      "rotSpeed": 1
    },
    {
      "cx": 0.3012,
      "cy": 0.8443,
      "r": 0.0456,
      "rotSpeed": 1
    },
    {
      "cx": 0.4115,
      "cy": 0.8448,
      "r": 0.0456,
      "rotSpeed": 1
    },
    {
      "cx": 0.5107,
      "cy": 0.8417,
      "r": 0.0456,
      "rotSpeed": 1
    },
    {
      "cx": 0.6082,
      "cy": 0.8463,
      "r": 0.0456,
      "rotSpeed": 1
    },
    {
      "cx": 0.7056,
      "cy": 0.8487,
      "r": 0.0456,
      "rotSpeed": 1
    },
    {
      "cx": 0.8169,
      "cy": 0.6486,
      "r": 0.0456,
      "rotSpeed": 1
    },
    {
      "cx": 0.2422,
      "cy": 0.5922,
      "r": 0.0136,
      "rotSpeed": 1
    },
    {
      "cx": 0.4611,
      "cy": 0.5941,
      "r": 0.0116,
      "rotSpeed": 1
    },
    {
      "cx": 0.6564,
      "cy": 0.5876,
      "r": 0.0108,
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
            "x": 0.0106,
            "y": 0.3654
          },
          {
            "x": 0.0202,
            "y": 0.4017
          },
          {
            "x": 0.0197,
            "y": 0.5499
          },
          {
            "x": 0.0091,
            "y": 0.5778
          },
          {
            "x": -0.0213,
            "y": 0.5763
          },
          {
            "x": -0.0314,
            "y": 0.5624
          },
          {
            "x": -0.0329,
            "y": 0.389
          },
          {
            "x": -0.0296,
            "y": 0.3644
          }
        ],
        "fillColor": "#000000",
        "hingeP1": {
          "x": 0.0202,
          "y": 0.4017
        },
        "hingeP2": {
          "x": 0.0197,
          "y": 0.5499
        },
        "hingeEdgeIdx": 1,
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
      "id": "o8tz1ypo",
      "polygon": [
        {
          "x": 0.5915,
          "y": 0.1587
        },
        {
          "x": 0.592,
          "y": 0.2436
        },
        {
          "x": 0.5992,
          "y": 0.2317
        },
        {
          "x": 0.6134,
          "y": 0.2193
        },
        {
          "x": 0.7608,
          "y": 0.2219
        },
        {
          "x": 0.7596,
          "y": 0.1702
        },
        {
          "x": 0.6181,
          "y": 0.1809
        }
      ],
      "name": "武器 1",
      "weaponId": "2a28",
      "recoilDist": 0.055
    }
  ],
  "muzzles": [
    {
      "x": 0.7598,
      "y": 0.1971,
      "name": "槍口 1",
      "weaponId": "2a28",
      "layerOrder": "above"
    },
    {
      "x": 0.5196,
      "y": 0.1989,
      "name": "槍口 2",
      "weaponId": "pkt",
      "layerOrder": "above"
    },
    {
      "x": 0.5501,
      "y": 0.0706,
      "name": "槍口 3",
      "weaponId": "atgm",
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

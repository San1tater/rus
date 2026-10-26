/* 載具配置：bmp1m (由載具標注編輯器 v2.0 生成) */
/* - 車輪完整圓形旋轉 + 遮罩下緣鏡像補全
 * - trackMask：車體遮罩折線（遮住輪子上半部），與履帶滾動無關
 * - trackLoop：履帶環多邊形（閉合），遊戲端需按此多邊形執行擦除與貼圖
 * - trackScroll：沿 trackLoop 弧長參數化滾動（原圖紋理，方向正向）
 * - fusion：融合車門（純實色多邊形）
 * - missiles：單發實體導彈
 */
const VEHICLE_ANNOTATION_BMP1M = {
  "id": "bmp1m",
  "orientation": "right",
  "imageSize": {
    "w": 545,
    "h": 204
  },
  "anchor": {
    "groundY": 0.85,
    "centerX": 0.5
  },
  "trackMask": {
    "enabled": true,
    "points": [
      {
        "x": 0.0124,
        "y": 0.5768
      },
      {
        "x": 0.0465,
        "y": 0.6543
      },
      {
        "x": 0.768,
        "y": 0.6485
      },
      {
        "x": 0.9045,
        "y": 0.75
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
        "x": 0.8738,
        "y": 0.7455
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
      "id": "2a42",
      "name": "30mm 2A42",
      "type": "機炮",
      "caliber": "30mm"
    }
  ],
  "wheels": [
    {
      "cx": 0.0932,
      "cy": 0.7104,
      "r": 0.0411,
      "rotSpeed": 1
    },
    {
      "cx": 0.1941,
      "cy": 0.8617,
      "r": 0.0468,
      "rotSpeed": 1
    },
    {
      "cx": 0.3015,
      "cy": 0.8587,
      "r": 0.0468,
      "rotSpeed": 1
    },
    {
      "cx": 0.4103,
      "cy": 0.8546,
      "r": 0.0468,
      "rotSpeed": 1
    },
    {
      "cx": 0.5084,
      "cy": 0.8571,
      "r": 0.0468,
      "rotSpeed": 1
    },
    {
      "cx": 0.607,
      "cy": 0.8635,
      "r": 0.0468,
      "rotSpeed": 1
    },
    {
      "cx": 0.7042,
      "cy": 0.8607,
      "r": 0.0468,
      "rotSpeed": 1
    },
    {
      "cx": 0.8198,
      "cy": 0.6641,
      "r": 0.0412,
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
            "x": 0.0076,
            "y": 0.42
          },
          {
            "x": 0.0227,
            "y": 0.4817
          },
          {
            "x": 0.0227,
            "y": 0.6053
          },
          {
            "x": 0.0144,
            "y": 0.6329
          },
          {
            "x": -0.023,
            "y": 0.6322
          },
          {
            "x": -0.0332,
            "y": 0.6148
          },
          {
            "x": -0.0339,
            "y": 0.4541
          },
          {
            "x": -0.0291,
            "y": 0.4219
          }
        ],
        "fillColor": "#000000",
        "hingeP1": {
          "x": 0.0227,
          "y": 0.4817
        },
        "hingeP2": {
          "x": 0.0227,
          "y": 0.6053
        },
        "hingeEdgeIdx": 1,
        "openRotation": 90
      }
    ]
  },
  "missiles": [],
  "weaponAreas": [
    {
      "id": "onpjf5i7",
      "polygon": [
        {
          "x": 0.4033,
          "y": 0.0894
        },
        {
          "x": 0.4025,
          "y": 0.1345
        },
        {
          "x": 0.6976,
          "y": 0.1439
        },
        {
          "x": 0.7049,
          "y": 0.1373
        },
        {
          "x": 0.7049,
          "y": 0.1055
        },
        {
          "x": 0.6955,
          "y": 0.09
        },
        {
          "x": 0.4358,
          "y": 0.0905
        }
      ],
      "name": "武器 1",
      "weaponId": "2a42",
      "recoilDist": 0.015
    }
  ],
  "muzzles": [
    {
      "x": 0.4134,
      "y": 0.141,
      "name": "槍口 1",
      "weaponId": "pkt",
      "layerOrder": "above"
    },
    {
      "x": 0.6924,
      "y": 0.1216,
      "name": "槍口 2",
      "weaponId": "2a42",
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

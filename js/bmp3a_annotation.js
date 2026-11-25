/* 載具配置：bmp3a (由載具標注編輯器 v2.0 生成) */
/* - 車輪完整圓形旋轉 + 遮罩下緣鏡像補全
 * - trackMask：車體遮罩折線（遮住輪子上半部），與履帶滾動無關
 * - trackLoop：履帶環多邊形（閉合），遊戲端需按此多邊形執行擦除與貼圖
 * - trackScroll：沿 trackLoop 弧長參數化滾動（原圖紋理，方向正向）
 * - fusion：融合車門（純實色多邊形）
 * - missiles：單發實體導彈
 */
const VEHICLE_ANNOTATION_BMP3A = {
  "id": "bmp3a",
  "orientation": "right",
  "imageSize": {
    "w": 598,
    "h": 247
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
        "y": 0.7718
      },
      {
        "x": 0.0462,
        "y": 0.7144
      },
      {
        "x": 0.7691,
        "y": 0.7062
      },
      {
        "x": 0.9609,
        "y": 0.7532
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
        "x": 0.9113,
        "y": 0.7675
      },
      {
        "x": 0.9242,
        "y": 0.6534
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
    "textureX0": 0.331,
    "textureX1": 0.3482,
    "textureY0": 0.9348,
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
      "cx": 0.0832,
      "cy": 0.7537,
      "r": 0.0374,
      "rotSpeed": 1
    },
    {
      "cx": 0.1729,
      "cy": 0.8861,
      "r": 0.0397,
      "rotSpeed": 1
    },
    {
      "cx": 0.2913,
      "cy": 0.8863,
      "r": 0.0397,
      "rotSpeed": 1
    },
    {
      "cx": 0.3888,
      "cy": 0.8896,
      "r": 0.0397,
      "rotSpeed": 1
    },
    {
      "cx": 0.4982,
      "cy": 0.8878,
      "r": 0.0397,
      "rotSpeed": 1
    },
    {
      "cx": 0.6359,
      "cy": 0.8867,
      "r": 0.0397,
      "rotSpeed": 1
    },
    {
      "cx": 0.7407,
      "cy": 0.885,
      "r": 0.0397,
      "rotSpeed": 1
    },
    {
      "cx": 0.8711,
      "cy": 0.7128,
      "r": 0.034,
      "rotSpeed": 1
    },
    {
      "cx": 0.211,
      "cy": 0.6998,
      "r": 0.0146,
      "rotSpeed": 1
    },
    {
      "cx": 0.4357,
      "cy": 0.697,
      "r": 0.0149,
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
          "x": 0.6809,
          "y": 0.2791
        },
        {
          "x": 0.6805,
          "y": 0.3131
        },
        {
          "x": 0.7045,
          "y": 0.3131
        },
        {
          "x": 0.7044,
          "y": 0.3318
        },
        {
          "x": 0.7213,
          "y": 0.3309
        },
        {
          "x": 0.8243,
          "y": 0.3285
        },
        {
          "x": 0.8258,
          "y": 0.3432
        },
        {
          "x": 0.9064,
          "y": 0.3409
        },
        {
          "x": 0.9731,
          "y": 0.3411
        },
        {
          "x": 0.9738,
          "y": 0.27
        },
        {
          "x": 0.9023,
          "y": 0.2695
        },
        {
          "x": 0.8258,
          "y": 0.2697
        }
      ],
      "name": "武器 1",
      "weaponId": "2a70",
      "recoilDist": 0.048
    }
  ],
  "muzzles": [
    {
      "x": 0.9693,
      "y": 0.3041,
      "name": "槍口 1",
      "weaponId": "2a70",
      "layerOrder": "above"
    },
    {
      "x": 0.6685,
      "y": 0.3086,
      "name": "槍口 2",
      "weaponId": "pkt",
      "layerOrder": "below"
    },
    {
      "x": 0.9167,
      "y": 0.3029,
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

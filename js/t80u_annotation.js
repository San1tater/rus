/* 載具配置：t80u (由載具標注編輯器 v2.0 生成) */
/* - 車輪完整圓形旋轉 + 遮罩下緣鏡像補全
 * - trackMask：車體遮罩折線（遮住輪子上半部），與履帶滾動無關
 * - trackLoop：履帶環多邊形（閉合），遊戲端需按此多邊形執行擦除與貼圖
 * - trackScroll：沿 trackLoop 弧長參數化滾動（原圖紋理，方向正向）
 * - fusion：融合車門（純實色多邊形）
 * - missiles：單發實體導彈
 */
const VEHICLE_ANNOTATION_T80U = {
  "id": "t80u",
  "orientation": "right",
  "imageSize": {
    "w": 790,
    "h": 237
  },
  "anchor": {
    "groundY": 1,
    "centerX": 0.5
  },
  "trackMask": {
    "enabled": true,
    "points": [
      {
        "x": 0.0203,
        "y": 0.7888
      },
      {
        "x": 0.0749,
        "y": 0.7198
      },
      {
        "x": 0.1072,
        "y": 0.7557
      },
      {
        "x": 0.6887,
        "y": 0.7688
      },
      {
        "x": 0.7266,
        "y": 0.7294
      }
    ]
  },
  "trackLoop": {
    "points": [
      {
        "x": 0.0751,
        "y": 0.8047
      },
      {
        "x": 0.114,
        "y": 0.9153
      },
      {
        "x": 0.168,
        "y": 0.9999
      },
      {
        "x": 0.6006,
        "y": 0.999
      },
      {
        "x": 0.6319,
        "y": 0.9707
      },
      {
        "x": 0.7051,
        "y": 0.7994
      },
      {
        "x": 0.7088,
        "y": 0.7607
      },
      {
        "x": 0.6953,
        "y": 0.6976
      },
      {
        "x": 0.0753,
        "y": 0.661
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
    "textureX0": 0.382,
    "textureX1": 0.3961,
    "textureY0": 0.9172,
    "textureY1": 1,
    "bandHeight": 0.08,
    "textureOpacity": 0.85,
    "useStripes": true,
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
      "id": "nsvt",
      "name": "12.7mm NSVT",
      "type": "機槍",
      "caliber": "12.7mm"
    },
    {
      "id": "2a46m1",
      "name": "125mm 2A46M-1",
      "type": "主炮",
      "caliber": "125mm"
    }
  ],
  "wheels": [
    {
      "cx": 0.1144,
      "cy": 0.7521,
      "r": 0.0295,
      "rotSpeed": 1
    },
    {
      "cx": 0.1842,
      "cy": 0.8519,
      "r": 0.0361,
      "rotSpeed": 1
    },
    {
      "cx": 0.2607,
      "cy": 0.8506,
      "r": 0.0361,
      "rotSpeed": 1
    },
    {
      "cx": 0.3485,
      "cy": 0.8504,
      "r": 0.0361,
      "rotSpeed": 1
    },
    {
      "cx": 0.4257,
      "cy": 0.8506,
      "r": 0.0361,
      "rotSpeed": 1
    },
    {
      "cx": 0.5155,
      "cy": 0.8508,
      "r": 0.0361,
      "rotSpeed": 1
    },
    {
      "cx": 0.5933,
      "cy": 0.8497,
      "r": 0.0361,
      "rotSpeed": 1
    },
    {
      "cx": 0.669,
      "cy": 0.7266,
      "r": 0.0303,
      "rotSpeed": 1
    }
  ],
  "doors": {
    "upper": [],
    "lower": [],
    "hatch": [
      {
        "polygon": [
          {
            "x": 0.3234,
            "y": 0.2178
          },
          {
            "x": 0.3393,
            "y": 0.2163
          },
          {
            "x": 0.3521,
            "y": 0.2289
          },
          {
            "x": 0.3556,
            "y": 0.2427
          },
          {
            "x": 0.3454,
            "y": 0.2787
          },
          {
            "x": 0.3338,
            "y": 0.2889
          },
          {
            "x": 0.3051,
            "y": 0.2837
          },
          {
            "x": 0.2981,
            "y": 0.2743
          },
          {
            "x": 0.295,
            "y": 0.2515
          },
          {
            "x": 0.2978,
            "y": 0.2324
          },
          {
            "x": 0.3076,
            "y": 0.2163
          }
        ],
        "fillColor": "#000000",
        "hingeP1": {
          "x": 0.3051,
          "y": 0.2837
        },
        "hingeP2": {
          "x": 0.3338,
          "y": 0.2889
        },
        "hingeEdgeIdx": 5,
        "openRotation": 90,
        "frontUses": "image_crop",
        "backUses": "solid_color",
        "flipDirection": "outward"
      }
    ],
    "fusion": []
  },
  "missiles": [],
  "weaponAreas": [
    {
      "id": "oapjqexh",
      "polygon": [
        {
          "x": 0.5214,
          "y": 0.3839
        },
        {
          "x": 0.5532,
          "y": 0.4557
        },
        {
          "x": 1.0134,
          "y": 0.3992
        },
        {
          "x": 1.0118,
          "y": 0.2896
        },
        {
          "x": 0.5208,
          "y": 0.3362
        }
      ],
      "name": "武器 1",
      "weaponId": "2a46m1",
      "recoilDist": 0.06
    }
  ],
  "muzzles": [
    {
      "x": 1,
      "y": 0.3443,
      "name": "槍口 1",
      "weaponId": "2a46m1",
      "layerOrder": "above"
    },
    {
      "x": 0.5332,
      "y": 0.0442,
      "name": "槍口 2",
      "weaponId": "nsvt",
      "layerOrder": "above"
    },
    {
      "x": 0.5333,
      "y": 0.4121,
      "name": "槍口 3",
      "weaponId": "pkt",
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

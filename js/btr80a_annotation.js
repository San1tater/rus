/* 載具配置：btr80a (由載具標注編輯器 v2.0 生成) */
/* - 車輪完整圓形旋轉 + 遮罩下緣鏡像補全
 * - trackMask：車體遮罩折線（遮住輪子上半部），與履帶滾動無關
 * - trackLoop：履帶環多邊形（閉合），遊戲端需按此多邊形執行擦除與貼圖
 * - trackScroll：沿 trackLoop 弧長參數化滾動（原圖紋理，方向正向）
 * - fusion：融合車門（純實色多邊形）
 * - missiles：單發實體導彈
 * - muzzles[].angle：砲管仰角（度），遊戲端 _setupMuzzles 讀取後驅動曳光／煙jet 方向
 */
const VEHICLE_ANNOTATION_BTR80A = {
  "id": "btr80a",
  "orientation": "right",
  "imageSize": {
    "w": 620,
    "h": 222
  },
  "trackMask": {
    "enabled": false,
    "points": [
      {
        "x": 0,
        "y": 0.6
      },
      {
        "x": 1,
        "y": 0.6
      }
    ]
  },
  "trackLoop": null,
  "trackScroll": {
    "enabled": false,
    "direction": -1,
    "spacing": 0.06,
    "darkAlpha": 0.28,
    "lightAlpha": 0.12,
    "followWheel": 0,
    "useTexture": true,
    "textureX0": 0.15,
    "textureX1": 0.4,
    "textureY0": null,
    "textureY1": null,
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
      "id": "2a72",
      "name": "30mm 2A72",
      "type": "機炮",
      "caliber": "30mm"
    }
  ],
  "wheels": [
    {
      "cx": 0.1839,
      "cy": 0.79,
      "r": 0.0776,
      "rotSpeed": 1
    },
    {
      "cx": 0.3659,
      "cy": 0.7858,
      "r": 0.0776,
      "rotSpeed": 1
    },
    {
      "cx": 0.5933,
      "cy": 0.7928,
      "r": 0.0776,
      "rotSpeed": 1
    },
    {
      "cx": 0.7764,
      "cy": 0.787,
      "r": 0.0776,
      "rotSpeed": 1
    }
  ],
  "doors": {
    "upper": [
      {
        "polygon": [
          {
            "x": 0.4285,
            "y": 0.3465
          },
          {
            "x": 0.4272,
            "y": 0.5036
          },
          {
            "x": 0.5162,
            "y": 0.5068
          },
          {
            "x": 0.5143,
            "y": 0.3438
          }
        ],
        "fillColor": "#000000",
        "hingeP1": {
          "x": 0.5143,
          "y": 0.3438
        },
        "hingeP2": {
          "x": 0.5162,
          "y": 0.5068
        },
        "openRotation": 180,
        "frontUses": "image_crop",
        "backUses": "solid_color"
      }
    ],
    "lower": [],
    "hatch": [],
    "fusion": []
  },
  "missiles": [],
  "weaponAreas": [
    {
      "id": "o5ckzz5b",
      "polygon": [
        {
          "x": 0.6832,
          "y": 0.1168
        },
        {
          "x": 0.6833,
          "y": 0.15
        },
        {
          "x": 0.8661,
          "y": 0.1496
        },
        {
          "x": 0.8656,
          "y": 0.1091
        }
      ],
      "name": "武器 1",
      "weaponId": "2a72",
      "recoilDist": 0.035
    }
  ],
  "muzzles": [
    {
      "x": 0.6997,
      "y": 0.0903,
      "name": "槍口 1",
      "weaponId": "pkt",
      "layerOrder": "above",
      "angle": 0
    },
    {
      "x": 0.8642,
      "y": 0.1268,
      "name": "槍口 2",
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

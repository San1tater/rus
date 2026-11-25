/* 載具配置：btr90 (由載具標注編輯器 v2.0 生成) */
/* - 車輪完整圓形旋轉 + 遮罩下緣鏡像補全
 * - trackMask：車體遮罩折線（遮住輪子上半部），與履帶滾動無關
 * - trackLoop：履帶環多邊形（閉合），遊戲端需按此多邊形執行擦除與貼圖
 * - trackScroll：沿 trackLoop 弧長參數化滾動（原圖紋理，方向正向）
 * - fusion：融合車門（純實色多邊形）
 * - missiles：單發實體導彈
 */
const VEHICLE_ANNOTATION_BTR90 = {
  "id": "btr90",
  "orientation": "right",
  "imageSize": {
    "w": 598,
    "h": 243
  },
  "anchor": {
    "groundY": 1,
    "centerX": 0.5
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
    }
  ],
  "wheels": [
    {
      "cx": 0.1562,
      "cy": 0.8058,
      "r": 0.0825,
      "rotSpeed": 1
    },
    {
      "cx": 0.3402,
      "cy": 0.807,
      "r": 0.0825,
      "rotSpeed": 1
    },
    {
      "cx": 0.582,
      "cy": 0.8089,
      "r": 0.0825,
      "rotSpeed": 1
    },
    {
      "cx": 0.7587,
      "cy": 0.8097,
      "r": 0.0825,
      "rotSpeed": 1
    }
  ],
  "doors": {
    "upper": [
      {
        "polygon": [
          {
            "x": 0.4119,
            "y": 0.3769
          },
          {
            "x": 0.41,
            "y": 0.5116
          },
          {
            "x": 0.5034,
            "y": 0.5108
          },
          {
            "x": 0.5008,
            "y": 0.3753
          }
        ],
        "fillColor": "#000000",
        "hingeP1": {
          "x": 0.5008,
          "y": 0.3753
        },
        "hingeP2": {
          "x": 0.5034,
          "y": 0.5108
        },
        "openRotation": 180,
        "frontUses": "image_crop",
        "backUses": "solid_color"
      }
    ],
    "lower": [
      {
        "polygon": [
          {
            "x": 0.4094,
            "y": 0.5057
          },
          {
            "x": 0.4279,
            "y": 0.754
          },
          {
            "x": 0.4895,
            "y": 0.7515
          },
          {
            "x": 0.5037,
            "y": 0.5044
          }
        ],
        "fillColor": "#000000",
        "hingeP1": {
          "x": 0.4279,
          "y": 0.754
        },
        "hingeP2": {
          "x": 0.4895,
          "y": 0.7515
        },
        "openRotation": 110,
        "frontUses": "image_crop",
        "backUses": "solid_color"
      }
    ],
    "hatch": [],
    "fusion": []
  },
  "missiles": [],
  "weaponAreas": [
    {
      "id": "onn7x5pj",
      "polygon": [
        {
          "x": 0.778,
          "y": 0.2202
        },
        {
          "x": 0.7782,
          "y": 0.2514
        },
        {
          "x": 0.8414,
          "y": 0.2479
        },
        {
          "x": 0.9961,
          "y": 0.2518
        },
        {
          "x": 0.9961,
          "y": 0.2144
        }
      ],
      "name": "武器 1",
      "weaponId": "2a42",
      "recoilDist": 0.015
    }
  ],
  "muzzles": [
    {
      "x": 0.9968,
      "y": 0.2322,
      "name": "槍口 1",
      "weaponId": "2a42",
      "layerOrder": "above"
    },
    {
      "x": 0.7215,
      "y": 0.2348,
      "name": "槍口 2",
      "weaponId": "pkt",
      "layerOrder": "above"
    },
    {
      "x": 0.6367,
      "y": 0.0554,
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

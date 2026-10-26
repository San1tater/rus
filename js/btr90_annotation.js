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
    "h": 241
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
      "cx": 0.1551,
      "cy": 0.812,
      "r": 0.0818,
      "rotSpeed": 1
    },
    {
      "cx": 0.3384,
      "cy": 0.813,
      "r": 0.0818,
      "rotSpeed": 1
    },
    {
      "cx": 0.5809,
      "cy": 0.8193,
      "r": 0.0818,
      "rotSpeed": 1
    },
    {
      "cx": 0.7578,
      "cy": 0.8159,
      "r": 0.0818,
      "rotSpeed": 1
    }
  ],
  "doors": {
    "upper": [
      {
        "polygon": [
          {
            "x": 0.4111,
            "y": 0.3871
          },
          {
            "x": 0.4095,
            "y": 0.5244
          },
          {
            "x": 0.5036,
            "y": 0.5278
          },
          {
            "x": 0.5034,
            "y": 0.3865
          }
        ],
        "fillColor": "#000000",
        "hingeP1": {
          "x": 0.5034,
          "y": 0.3865
        },
        "hingeP2": {
          "x": 0.5036,
          "y": 0.5278
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
            "x": 0.4085,
            "y": 0.5155
          },
          {
            "x": 0.428,
            "y": 0.8174
          },
          {
            "x": 0.4872,
            "y": 0.82
          },
          {
            "x": 0.5042,
            "y": 0.5148
          }
        ],
        "fillColor": "#000000",
        "hingeP1": {
          "x": 0.428,
          "y": 0.8174
        },
        "hingeP2": {
          "x": 0.4872,
          "y": 0.82
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
          "x": 0.7797,
          "y": 0.2264
        },
        {
          "x": 0.7799,
          "y": 0.2576
        },
        {
          "x": 0.8431,
          "y": 0.2541
        },
        {
          "x": 0.9978,
          "y": 0.258
        },
        {
          "x": 0.9978,
          "y": 0.2206
        }
      ],
      "name": "武器 1",
      "weaponId": "2a42",
      "recoilDist": 0.015
    }
  ],
  "muzzles": [
    {
      "x": 0.9975,
      "y": 0.2372,
      "name": "槍口 1",
      "weaponId": "2a42",
      "layerOrder": "above"
    },
    {
      "x": 0.7203,
      "y": 0.2424,
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

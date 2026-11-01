/* 載具配置：btr80a (由載具標注編輯器 v1.9 生成) */
/* - 車輪完整圓形旋轉 + 遮罩下緣鏡像補全
 * - trackMask：車體遮罩折線（遮住輪子上半部），與履帶滾動無關
 * - trackLine：履帶帶子上邊界折線（履帶滾動 + 原圖擦除用），只用於履帶
 * - trackScroll：沿 trackLine 弧長參數化滾動（A 層原圖紋理 + B 層條紋，v = ω·r）
 * - 渲染順序：image → eraseOriginalTrack → trackScroll → wheels → trackMask → doors → muzzles → effects
 *   （原圖 trackLine 以下且 trackMask 以下被擦除，保護車體；履帶在輪子下層）
 */
const VEHICLE_ANNOTATION_BTR80A = {
  "id": "btr80a",
  "orientation": "right",
  "imageSize": {
    "w": 620,
    "h": 222
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
  "trackLine": null,
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
            "x": 0.427,
            "y": 0.3439
          },
          {
            "x": 0.4238,
            "y": 0.5371
          },
          {
            "x": 0.519,
            "y": 0.5345
          },
          {
            "x": 0.5157,
            "y": 0.3468
          }
        ],
        "fillColor": "#000000",
        "hingeP1": {
          "x": 0.5157,
          "y": 0.3468
        },
        "hingeP2": {
          "x": 0.519,
          "y": 0.5345
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
            "x": 0.4246,
            "y": 0.5347
          },
          {
            "x": 0.4593,
            "y": 0.7592
          },
          {
            "x": 0.4871,
            "y": 0.7592
          },
          {
            "x": 0.5187,
            "y": 0.5322
          }
        ],
        "fillColor": "#000000",
        "hingeP1": {
          "x": 0.4593,
          "y": 0.7592
        },
        "hingeP2": {
          "x": 0.4871,
          "y": 0.7592
        },
        "openRotation": 110,
        "frontUses": "image_crop",
        "backUses": "solid_color"
      }
    ],
    "hatch": []
  },
  "weaponAreas": [
    {
      "id": "oonvm1dj",
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
      "layerOrder": "above"
    },
    {
      "x": 0.8642,
      "y": 0.1268,
      "name": "槍口 2",
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

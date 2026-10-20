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
    "w": 636,
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
      "cx": 0.199,
      "cy": 0.8023,
      "r": 0.0776,
      "rotSpeed": 1
    },
    {
      "cx": 0.3747,
      "cy": 0.8016,
      "r": 0.0776,
      "rotSpeed": 1
    },
    {
      "cx": 0.5999,
      "cy": 0.8025,
      "r": 0.0776,
      "rotSpeed": 1
    },
    {
      "cx": 0.7764,
      "cy": 0.8016,
      "r": 0.0776,
      "rotSpeed": 1
    }
  ],
  "doors": {
    "upper": [
      {
        "polygon": [
          {
            "x": 0.4516,
            "y": 0.4023
          },
          {
            "x": 0.4321,
            "y": 0.5671
          },
          {
            "x": 0.5307,
            "y": 0.5643
          },
          {
            "x": 0.5176,
            "y": 0.4066
          }
        ],
        "fillColor": "#000000",
        "hingeP1": {
          "x": 0.5176,
          "y": 0.4066
        },
        "hingeP2": {
          "x": 0.5307,
          "y": 0.5643
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
            "x": 0.4337,
            "y": 0.5574
          },
          {
            "x": 0.4714,
            "y": 0.8022
          },
          {
            "x": 0.4992,
            "y": 0.8022
          },
          {
            "x": 0.5286,
            "y": 0.5643
          }
        ],
        "fillColor": "#000000",
        "hingeP1": {
          "x": 0.4714,
          "y": 0.8022
        },
        "hingeP2": {
          "x": 0.4992,
          "y": 0.8022
        },
        "openRotation": 110,
        "frontUses": "image_crop",
        "backUses": "solid_color"
      }
    ],
    "hatch": []
  },
  "weaponAreas": [],
  "muzzles": [
    {
      "x": 0.6289,
      "y": 0.1414,
      "name": "槍口 1",
      "weaponId": "pkt",
      "layerOrder": "above"
    },
    {
      "x": 0.8605,
      "y": 0.1961,
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

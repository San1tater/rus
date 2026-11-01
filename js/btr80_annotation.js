/* 載具配置：btr80 (由載具標注編輯器 v1.9 生成) */
/* - 車輪完整圓形旋轉 + 遮罩下緣鏡像補全
 * - trackMask：車體遮罩折線（遮住輪子上半部），與履帶滾動無關
 * - trackLine：履帶帶子上邊界折線（履帶滾動 + 原圖擦除用），只用於履帶
 * - trackScroll：沿 trackLine 弧長參數化滾動（A 層原圖紋理 + B 層條紋，v = ω·r）
 * - 渲染順序：image → eraseOriginalTrack → trackScroll → wheels → trackMask → doors → muzzles → effects
 *   （原圖 trackLine 以下且 trackMask 以下被擦除，保護車體；履帶在輪子下層）
 */
const VEHICLE_ANNOTATION_BTR80 = {
  "id": "btr80",
  "orientation": "right",
  "imageSize": {
    "w": 636,
    "h": 213
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
    }
  ],
  "wheels": [
    {
      "cx": 0.1976,
      "cy": 0.7762,
      "r": 0.0776,
      "rotSpeed": 1
    },
    {
      "cx": 0.3747,
      "cy": 0.7762,
      "r": 0.0776,
      "rotSpeed": 1
    },
    {
      "cx": 0.6012,
      "cy": 0.7825,
      "r": 0.0776,
      "rotSpeed": 1
    },
    {
      "cx": 0.7778,
      "cy": 0.7762,
      "r": 0.0776,
      "rotSpeed": 1
    }
  ],
  "doors": {
    "upper": [
      {
        "polygon": [
          {
            "x": 0.4471,
            "y": 0.3318
          },
          {
            "x": 0.4307,
            "y": 0.4923
          },
          {
            "x": 0.5252,
            "y": 0.4931
          },
          {
            "x": 0.5189,
            "y": 0.3396
          }
        ],
        "fillColor": "#000000",
        "hingeP1": {
          "x": 0.5189,
          "y": 0.3396
        },
        "hingeP2": {
          "x": 0.5252,
          "y": 0.4931
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
            "x": 0.4321,
            "y": 0.4867
          },
          {
            "x": 0.4641,
            "y": 0.7496
          },
          {
            "x": 0.4919,
            "y": 0.7496
          },
          {
            "x": 0.5244,
            "y": 0.493
          }
        ],
        "fillColor": "#000000",
        "hingeP1": {
          "x": 0.4641,
          "y": 0.7496
        },
        "hingeP2": {
          "x": 0.4919,
          "y": 0.7496
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
      "x": 0.8045,
      "y": 0.1706,
      "name": "槍口 1",
      "weaponId": "kpvt",
      "layerOrder": "above"
    },
    {
      "x": 0.7285,
      "y": 0.1831,
      "name": "槍口 2",
      "weaponId": "pkt",
      "layerOrder": "below"
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

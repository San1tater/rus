/* 載具配置：btr82 (由載具標注編輯器 v2.0 生成) */
/* - 車輪完整圓形旋轉 + 遮罩下緣鏡像補全
 * - trackMask：車體遮罩折線（遮住輪子上半部），與履帶滾動無關
 * - trackLoop：履帶環多邊形（閉合），遊戲端需按此多邊形執行擦除與貼圖
 * - trackScroll：沿 trackLoop 弧長參數化滾動（原圖紋理，方向正向）
 * - 渲染順序：image → eraseOriginalTrack（trackLoop） → trackScroll → wheels → trackMask → doors → muzzles → effects
 */
const VEHICLE_ANNOTATION_BTR82 = {
  "id": "btr82",
  "orientation": "right",
  "imageSize": {
    "w": 623,
    "h": 220
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
      "cx": 0.181,
      "cy": 0.7788,
      "r": 0.0774,
      "rotSpeed": 1
    },
    {
      "cx": 0.3613,
      "cy": 0.777,
      "r": 0.0774,
      "rotSpeed": 1
    },
    {
      "cx": 0.5915,
      "cy": 0.7834,
      "r": 0.0774,
      "rotSpeed": 1
    },
    {
      "cx": 0.77,
      "cy": 0.7855,
      "r": 0.0774,
      "rotSpeed": 1
    }
  ],
  "doors": {
    "upper": [
      {
        "polygon": [
          {
            "x": 0.428,
            "y": 0.3447
          },
          {
            "x": 0.4199,
            "y": 0.5079
          },
          {
            "x": 0.5147,
            "y": 0.5083
          },
          {
            "x": 0.5055,
            "y": 0.3491
          }
        ],
        "fillColor": "#000000",
        "hingeP1": {
          "x": 0.5055,
          "y": 0.3491
        },
        "hingeP2": {
          "x": 0.5147,
          "y": 0.5083
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
            "x": 0.42,
            "y": 0.5015
          },
          {
            "x": 0.4474,
            "y": 0.7719
          },
          {
            "x": 0.4905,
            "y": 0.7746
          },
          {
            "x": 0.5152,
            "y": 0.5033
          }
        ],
        "fillColor": "#000000",
        "hingeP1": {
          "x": 0.4474,
          "y": 0.7719
        },
        "hingeP2": {
          "x": 0.4905,
          "y": 0.7746
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
      "x": 0.6637,
      "y": 0.0598,
      "name": "槍口 1",
      "weaponId": "pkt",
      "layerOrder": "above"
    },
    {
      "x": 0.7765,
      "y": 0.1097,
      "name": "槍口 2",
      "weaponId": "kpvt",
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

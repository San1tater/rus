/* 載具配置：btr80 (由載具標注編輯器 v1.9 生成) */
/* 車輪完整圓形旋轉 + 遮罩下緣鏡像補全；履帶遮罩為全局折線；艙門以底邊為軸向外翻（朝向觀眾）；槍口支持層序 */
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
            "x": 0.4329,
            "y": 0.4867
          },
          {
            "x": 0.5246,
            "y": 0.4883
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
          "x": 0.5246,
          "y": 0.4883
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
  ]
};

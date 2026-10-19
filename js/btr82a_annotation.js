/* 載具配置：btr82a (由載具標注編輯器 v1.9 生成) */
/* 車輪完整圓形旋轉 + 遮罩下緣鏡像補全；履帶遮罩為全局折線；艙門以底邊為軸向外翻（朝向觀眾）；槍口支持層序 */
const VEHICLE_ANNOTATION_BTR82A = {
  "id": "btr82a",
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
      "cx": 0.1815,
      "cy": 0.784,
      "r": 0.0776,
      "rotSpeed": 1
    },
    {
      "cx": 0.3584,
      "cy": 0.7748,
      "r": 0.0776,
      "rotSpeed": 1
    },
    {
      "cx": 0.5906,
      "cy": 0.7885,
      "r": 0.0776,
      "rotSpeed": 1
    },
    {
      "cx": 0.7698,
      "cy": 0.7959,
      "r": 0.0776,
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
            "x": 0.4205,
            "y": 0.5023
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
            "x": 0.4205,
            "y": 0.5083
          },
          {
            "x": 0.4462,
            "y": 0.7629
          },
          {
            "x": 0.4864,
            "y": 0.772
          },
          {
            "x": 0.5152,
            "y": 0.5083
          }
        ],
        "fillColor": "#000000",
        "hingeP1": {
          "x": 0.4462,
          "y": 0.7629
        },
        "hingeP2": {
          "x": 0.4864,
          "y": 0.772
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
      "weaponId": "2a72",
      "layerOrder": "above"
    }
  ]
};

/* 載具配置：btr80a (由載具標注編輯器 v1.9 生成) */
/* 車輪完整圓形旋轉 + 遮罩下緣鏡像補全；履帶遮罩為全局折線；艙門以底邊為軸向外翻（朝向觀眾）；槍口支持層序 */
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
      "cx": 0.1976,
      "cy": 0.8052,
      "r": 0.0776,
      "rotSpeed": 1
    },
    {
      "cx": 0.3752,
      "cy": 0.8066,
      "r": 0.0776,
      "rotSpeed": 1
    },
    {
      "cx": 0.5981,
      "cy": 0.7991,
      "r": 0.0776,
      "rotSpeed": 1
    },
    {
      "cx": 0.7783,
      "cy": 0.808,
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
      "x": 0.7332,
      "y": 0.1936,
      "name": "槍口 1",
      "weaponId": "pkt",
      "layerOrder": "below"
    },
    {
      "x": 0.8605,
      "y": 0.1961,
      "name": "槍口 2",
      "weaponId": "2a72",
      "layerOrder": "above"
    }
  ]
};

# 廢土求生 — v17.5

一款以瀏覽器為平台的單機戰鬥 / 探索遊戲（前端靜態專案）。遊戲以廢土世界觀為主，在探索、資源管理、基地建造與 Boss 戰之間切換，儲存使用 localStorage。主要面向想在本機或自架靜態伺服器上遊玩或開發的玩家與開發者。

---

## 主要特色
- 探索多個區域（廢棄工廠、實驗室、郊區公路、輻射沼澤、廢土核心，以及其 II 進階入口）。
- 角色裝備、背包、消耗品與改造系統（武器、護甲、彈藥分級與稀有度）。
- Boss 戰系統：有豐富的視覺化渲染、部位瞄準、範圍判定、特殊技能與護盾機制。
- 基地（Base）建造、改造與資源合成/工坊流程。
- 游玩資料會存在瀏覽器 localStorage（可存檔 / 讀檔）。

---

## 快速開始（玩家）
最短的本機啟動方式：下載或 clone 專案後直接開啟或使用簡單靜態伺服器。

直接在檔案系統開啟（注意：某些資源版本檢查會在 file:// 下被跳過，但遊戲仍可運行）：
- 在檔案總管或瀏覽器打開 index.html

以簡單 HTTP server（推薦，可避免跨域或 HEAD 探測限制）：
```bash
# 使用 Python 3
python -m http.server 8000

# 或用 Node.js 的 http-server（需先安裝）
npx http-server -c-1 . -p 8000
```
然後在瀏覽器開啟 http://localhost:8000 。

---

## 玩法快速說明（介面 / 操作）
- 主畫面分為三個區域（zone1、zone2、zone3），底部有 tabbar：探索（探索）、戰鬥（Combat）、基地（Base）。
- 探索：派角色出發、拾取資源、戰鬥與遇事件。
- 戰鬥（Boss）：選擇 Boss 後進入場景，可點選 Boss 部位瞄準（可看到瞄準標記），使用搖桿或鍵鼠控制移動/瞄準，按下攻擊按鈕發動攻擊或使用技能/治療。
- 基地：建造、升級與改造裝備。

觸控操作：
- 搖桿（joystick）在右側（或 zone2），拖動左右移動玩家。
- 攻擊按鈕（fire-btn）支援 touchstart / touchend 開始或停止攻擊。
- 治療按鈕（heal-btn）呼叫手動治療（若可用）。

儲存：
- 自動儲存到 localStorage（state 的 save()/load() 實作）。如果需要備份，請從瀏覽器開發工具導出 localStorage 的 SAVE_KEY。

---

## 專案結構（重點檔案/目錄）
（刪除非必要檔案，保留能理解程式的主要目錄）
```
index.html            # 單頁入口（載入 styles.css 與 js/01-06-part.js）
styles.css            # 全域樣式（遊戲 UI 與 battle/scene CSS）
icons/                # 圖示資源（items/buildings）
images/               # 遊戲圖片（背景、boss 等）
js/
  01-part.js          # 資料層：常數、物品/武器/彈藥/裝甲定義、資源版本探測、icon helper、基本資料結構
  02-part.js          # UI 與探索渲染：探索畫面、畫布渲染、modal 與清單互動
  03-part.js          # 核心邏輯：存檔/讀檔、背包/物品管理、數值計算、探索節點流程、輔助函式
  04-part.js          # Boss 視覺與操控：boss 層、點擊選取、畫布 transform、搖桿與控制面板
  05-part.js          # Boss 戰鬥處理：傷害/治療/傷害分配、boss 特殊邏輯、BossModule 導出 API
  06-part.js          # 基地系統、偏好設定、主迴圈（init、tick、事件綁定）
README.md             # 本檔案
deepseek_html_...html #（工具輸出／分析檔案，可忽略）
```

如何協同運作（簡述）
- js/01-part.js 提供遊戲資料表、道具與資源 helper（如 itemIcon()、probeAssetVersion()）
- js/03-part.js 實作核心遊戲流程、狀態（state）、儲存機制與多數遊戲邏輯
- js/02-part.js、js/04-part.js 與 js/05-part.js 負責 UI 與 Boss 戰的呈現與互動
- js/06-part.js 作為整合層，負責初始化、主循環與基地功能

---

## 開發者說明 / 調試提示
- 資源版本檢測：probeAssetVersion() 會對 icons/buildings/control.png 發出 HEAD 請求，取得 Last-Modified/ETag 以決定是否更新資源快取；在 file:// 下會被跳過（函式直接回傳 false）。
- 儲存鍵（localStorage）與存檔：
  - SAVE_KEY 在程式中定義（檔案 03-part.js），存檔會呼叫 save()，讀檔用 load()。
- 畫布/渲染注意：
  - 多處 canvas 實作會根據元素 clientWidth/clientHeight 計算 scale，調整視窗大小後會重新調整 canvas。
- 若要開發：
  - 使用簡單靜態伺服器以避免資源探測與 CORS 問題。
  - 主要開發點：ui/渲染（02,04）與遊戲邏輯（03,05）。資料型別與物件定義在 01-part.js。

建議的本地開發步驟
```bash
# 1. Clone
git clone https://github.com/San1tater/rus.git
cd rus

# 2. 用靜態伺服器執行（推薦）
python -m http.server 8000
# 或
npx http-server -c-1 . -p 8000
```

---

## 已知版本 / 變更（簡要）
- 當前可見代碼版本標記：v17.5（在 js/01-part.js 常數 VERSION='v17.5'）
- 變更重點示例：引入 v17.5 的重量系統、Boss 與彈藥 UI 調整、v52-dedup 樣式與一些性能/行為修正（可查看各檔案註解）

---

## 常見問題 (FAQ)
Q: 為何某些圖示不顯示或沒有更新？
A: 專案會對 icons 的某張 probe 圖 HEAD 檢查 metadata 以產生資源版本參數（ASSET_VERSION）。若使用 file://，該檢查會被跳過；若使用 HTTP，伺服器需正確回傳 Last-Modified 或 ETag。

Q: 如何備份/還原遊戲進度？
A: 使用瀏覽器開發工具（Application / Local Storage）匯出與匯入存放 SAVE_KEY 的 JSON 字串。

Q: 沒看到 LICENSE？
A: 本倉庫目前沒有顯式的 LICENSE 檔（如果你要開源或分享，建議新增一個 LICENSE 文件）。

---

## 想要貢獻或二次開發？
- 如果要修 bug、加新 Boss 或增加道具：
  - 建議把資料（武器/彈藥/護甲/region/route）維護在 js/01-part.js 的對應物件中（ARMOR、WEAPONS、AMMO、REGIONS、ROUTES）。
  - 視覺或畫布變動優先修改 js/02-part.js、js/04-part.js。
- 提交 Pull Request 前，請說明修改內容、測試方式（如何重現）與影響範圍（儲存結構變更需特別註明）。
- 建議新增 LICENSE 檔案以明確授權條款。

---

## 聯絡與致謝
- 作者／維護者：專案內作者資訊（若欲聯絡請使用 GitHub Issues 或在 repo 上留言）。
- 感謝所有提供測試與回饋的玩家與貢獻者。

---

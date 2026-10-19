# 廢土求生 (rus)

> 瀏覽器單機求生遊戲 — 版本 v17.5

一款以純前端（HTML/CSS/JavaScript）實作的廢土題材單機遊戲，玩家可以在瀏覽器中探索廢墟、收集資源、強化裝備、挑戰 Boss，並建設與維護基地。

版本與語言

- 目前版本：v17.5
- 主要技術：JavaScript、HTML、CSS
- 倉庫語言分佈（大約）：JavaScript 59.8%、HTML 27.6%、CSS 12.6%

主要特色

- 探索與戰鬥：多區域探索、敵人與素材搜刮
- 裝備系統：武器、護甲、彈藥、消耗品、模組與稀有度
- Boss 戰：部位、護盾、弱點與 AI 行為
- 基地與農園：建造/升級設施、資源加工、農業系統
- 存檔：使用 localStorage，支援手動備份/還原
- 純前端：無需安裝或建置工具，可直接在瀏覽器執行

檔案與目錄（modelized 分支 / 專案根目錄）

- index.html — 遊戲入口與主 UI（載入下列腳本與資源）
- styles.css — 全域樣式（另有 styles.cleanup.bak.css 備份）
- V9.5.html, v1.html, v2.html — 歷史或備份頁面
- 拆分工具.html — 開發用工具頁面
- icons/、images/ — 圖示與靜態資源
- js/ — 主要 JavaScript 檔案與模組（選擇性）：
  - js/01-part.js — 資料定義（物品、武器、裝備、區域、版本設定）
  - js/02-part.js — UI 渲染與探索畫面邏輯
  - js/03-part.js — 存檔、背包、道具與流程控制
  - js/04-part.js — Boss 場景與流程
  - js/05-part.js — 戰鬥計算、傷害與 Boss 特殊邏輯
  - js/06-core.js — 核心循環與共用基礎邏輯
  - js/07-garden.js — 農園 / 園藝系統（基地的一部分）
  - js/08-base.js — 基地/設施相關系統
  - js/09-enemy-data.js — 敵人 / 數據定義
  - js/10-vehicle.js — 車輛系統（若存在）
  - 多個 annotation / 擴充腳本（例如 btr80_annotation.js、t80_annotation.js 等）

註：index.html 會依序載入上述腳本，部分檔案為資產或動態產生的擴充模組。

快速開始

1) 直接開啟（最簡單）

  - 在檔案管理器雙擊 `index.html` 或用瀏覽器開啟（可能因為瀏覽器對本機檔案的資源限制而有差異）。

2) 建議：使用本地 HTTP 靜態伺服器（避免 file:// 的資源或快取問題）

```bash
# Python 3
cd rus
python -m http.server 8000

# 或使用 Node.js 的 http-server
npx http-server -c-1 . -p 8000
```
然後打開：http://localhost:8000

注意事項

- 快取：專案會使用 ASSET_VERSION 或查詢參數來避免舊快取；如看不到更新請強制重新整理（Ctrl/Cmd+Shift+R）或清除 localStorage 及瀏覽器快取。
- 存檔：遊戲進度保存在 localStorage，請用瀏覽器開發者工具匯出備份 JSON（可在 `state` 或對應 UI 找到匯出功能）。
- 單機：本專案為純前端單機遊戲，無後端同步或多人功能。

開發與修改指引（精簡）

- 修改資料（物品、掉落、區域等）：編輯 `js/01-part.js`
- UI / 探索畫面：編輯 `js/02-part.js`
- 存檔、背包、流程控制：編輯 `js/03-part.js`
- Boss 與戰鬥邏輯：編輯 `js/04-part.js`、`js/05-part.js`
- 核心循環 / 共用邏輯：編輯 `js/06-core.js`
- 農園 / 基地系統：編輯 `js/07-garden.js`、`js/08-base.js`
- 敵人資料：編輯 `js/09-enemy-data.js`

建議工作流程

1. Fork 並在本倉庫建立新分支
2. 在本地以靜態伺服器測試變更
3. 開 Pull Request，說明變更與驗證方法

授權

本倉庫目前沒有 LICENSE 檔。若要接受外部貢獻或公開發行，建議加入開源授權（例如 MIT 或 Apache-2.0）。

貢獻與聯絡

歡迎 PR 與 issue。如需我代勞：
- 我可以將 README 翻成英文版本（在同一 PR 提供雙語版），或精簡為展示用 README（Landing 版）。

回覆「英文」或「展示」我會在 modelized 分支建立一個 PR 提交對應變更。

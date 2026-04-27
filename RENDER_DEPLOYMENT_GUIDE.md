# Render 部署指南 - AlphaTest 修復版

本指南將引導您完成 AlphaTest 平台的部署，確保所有新功能（目標規劃、優化器、分享功能）正常運作。

## 🚀 部署步驟

1. **環境變量設置**
   在 Render 的 Dashboard 中，進入您的 Web Service 設置，點擊 "Environment"，確保以下變量已設置：
   - `POE_API_KEY`: 您提供的 POE API Key
   - `DATABASE_URL`: 您的 SQL 數據庫連接字串

2. **自動部署**
   代碼已推送到 GitHub `main` 分支。Render 應該會自動檢測並開始構建。

3. **數據庫遷移**
   系統使用 Drizzle ORM。在啟動時，它會自動嘗試連接您的數據庫。如果您新增了表結構（如分享功能所需的表），請確保數據庫帳號具有創建表的權限。

## 🛠️ 功能驗證

部署完成後，您可以進行以下測試：
- **目標規劃**：點擊頂部的「智能目標規劃」，看是否能自動配置參數。
- **AI 診斷**：執行回測後，查看下方的 AI 診斷是否變得更嚴苛，且支持投資組合分析。
- **資產曲線**：確認「圖表」分頁中的曲線不再是空白。
- **分享功能**：點擊「分享結果」，看是否能成功複製連結。

## ❓ 常見問題

- **Build 失敗**：如果出現 `vite: not found` 或類似錯誤，請確保您的 `package.json` 中 `devDependencies` 包含 `vite`，且 Render 的 Build Command 設置為 `pnpm install && pnpm build`。
- **AI 診斷報錯**：請檢查 `POE_API_KEY` 是否有效。

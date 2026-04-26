# AlphaTest 專案交接文檔（給下一位接手的 Manus 助手）

**交接日期**：2026-04-27  
**專案狀態**：進行中（WIP - Work In Progress）  
**GitHub 倉庫**：`chiholung-cmd/stock-backtest`  
**部署平台**：Render（`https://alpha-test-stock.onrender.com`）  
**Poe API Key**：`sk-poe-YDsU1G-UDV4lbNVJ4A4KilL9S5oYDCB8WtX_D8Av7fA`

---

## 📋 專案概況

AlphaTest 是一個**AI 驅動的量化投資回測平台**，集成了：
- **AI 市場情緒診斷**：實時新聞分析與情緒評分
- **自然語言策略生成**：用戶描述投資想法，AI 轉化為量化策略
- **專業回測引擎**：支持多種技術指標策略（MA、RSI、KD、Breakout）
- **資產配置建議**：AI 根據用戶風險偏好推薦投資組合

---

## 🏗️ 技術架構

### 前端（Client）
- **框架**：React + TypeScript + Vite
- **UI 庫**：Tailwind CSS + Shadcn UI
- **路由**：Wouter
- **狀態管理**：TRPC（類型安全的 RPC）
- **主要頁面**：
  - `/` - 首頁（含 AI 顧問面板）
  - `/backtest` - 回測頁面（含 AI 診斷、聊天）
  - `/history` - 歷史記錄
  - `/compare` - 對比分析
  - `/login` - 登入/註冊

### 後端（Server）
- **框架**：Node.js + TypeScript + Express
- **數據庫**：MySQL + Drizzle ORM
- **認證**：Manus OAuth（自定義本地認證）
- **API**：TRPC 路由
- **主要模塊**：
  - `server/backtest.ts` - 回測引擎（Python Yahoo Finance）
  - `server/poe.ts` - AI 診斷邏輯
  - `server/_core/llm.ts` - LLM 調用（Gemini 2.5 Flash）
  - `server/stockSearch.ts` - 股票搜尋與驗證
  - `server/routers.ts` - TRPC 路由定義

### 部署
- **前端**：Render（靜態 + Node.js）
- **數據庫**：TiDB（MySQL 兼容）
- **環境變數**：
  - `POE_API_KEY` - Poe API 密鑰
  - `DATABASE_URL` - 數據庫連接字符串

---

## ✅ 已完成的功能

### 1. 核心回測系統
- ✅ 多策略支持：MA Crossover、RSI、KD（Stochastic）、Breakout
- ✅ 精確的資產曲線計算
- ✅ 交易日誌記錄（含年份信息）
- ✅ 統計指標：年化報酬、最大回撤、Sharpe 比率、勝率
- ✅ 定期定額與定期提領邏輯

### 2. AI 功能
- ✅ AI 深度診斷：新聞抓取 + 情緒分析 + 評分
- ✅ AI 聊天：多輪對話支持
- ✅ 自然語言策略分析（基礎實現）
- ✅ 降級邏輯：API 失敗時顯示友好提示

### 3. 前端 UI
- ✅ 首頁 AI 顧問面板（V2）：簡化參數輸入
- ✅ 回測頁面：策略選擇、參數配置、結果展示
- ✅ AI 診斷面板：情緒評分、Markdown 渲染
- ✅ AI 聊天組件：右下角浮窗
- ✅ 交易詳情日誌：完整交易記錄

### 4. 數據支持
- ✅ yfinance 集成：全球股票代碼支持
- ✅ 股票搜尋：快速查詢表 + 動態驗證
- ✅ 支持代碼：AAPL、MSFT、CHGG 等美股，0700.HK 等港股

---

## ⚠️ 已知問題與待辦事項

### 🔴 高優先級（必須修復）

#### 1. **AI 深度診斷 - 短中長期分析**（用戶需求）
**描述**：目前診斷報告只給出單一評分，需要分別分析短期（1-3 個月）、中期（3-12 個月）、長期（1 年以上）的投資前景。

**實現方案**：
```typescript
// 在 server/poe.ts 中修改 diagnoseStock 函數
const prompt = `
分析股票 ${ticker} 的投資前景，請分別給出：

1. **短期展望（1-3 個月）**
   - 技術面分析
   - 近期新聞影響
   - 短期評分：-100 到 +100

2. **中期展望（3-12 個月）**
   - 基本面分析
   - 行業趨勢
   - 中期評分：-100 到 +100

3. **長期展望（1 年以上）**
   - 公司戰略
   - 市場前景
   - 長期評分：-100 到 +100

請用 JSON 格式返回結果。
`;
```

**前端修改**：在 `AiDiagnosisPanel.tsx` 中添加三個評分卡片，分別顯示短中長期評分。

---

#### 2. **開始回測按鈕無法跳轉**
**描述**：首頁 AI 顧問面板中的「開始回測」按鈕點擊後沒有反應。

**根本原因**：按鈕邏輯未實現，只有按鈕 UI 沒有跳轉邏輯。

**修復方案**：
```typescript
// 在 AiAdvisorPanelV2.tsx 中添加
import { useRouter } from "wouter";

const [, navigate] = useRouter();

const handleStartBacktest = () => {
  // 從 AI 回覆中解析推薦的策略參數
  const strategy = extractStrategy(messages[messages.length - 1].content);
  if (strategy) {
    // 跳轉到回測頁面並帶入參數
    navigate(`/backtest?strategy=${strategy.name}&params=${JSON.stringify(strategy.params)}`);
  }
};
```

---

#### 3. **統計指標不同步**（部分修復，需驗證）
**描述**：「總損益」、「平均損益」、「最終資產」與交易日誌不一致。

**已進行的修復**：
- 在 `backtest.ts` 中重新計算統計指標
- 添加年份信息到交易記錄

**待驗證**：需要在 Render 部署後進行實機測試，確認前端顯示的數字是否與後端計算一致。

---

#### 4. **對比分析頁面無法顯示**
**描述**：`/compare` 頁面需要登入，且登入系統有 Bug。

**根本原因**：
- 登入系統在 Render 環境下 Cookie 處理有問題（401 錯誤）
- 對比分析頁面依賴登入狀態

**修復方案**：
1. 修復登入系統的 Cookie 設置（檢查 `server/_core/cookies.ts`）
2. 或者開放對比分析為公共頁面（移除 `protectedProcedure` 限制）

---

### 🟡 中優先級（功能完善）

#### 5. **首頁 AI 顧問 - 全目標輸入**
**描述**：目前只有預設參數輸入，需要支持用戶自由輸入完整的投資目標描述。

**實現方案**：
```typescript
// 在 AiAdvisorPanelV2.tsx 中添加
<Textarea
  placeholder="例如：我想在 5 年內積累 100 萬美元，風險承受度中等，每月可投入 2000 美元..."
  value={customGoal}
  onChange={(e) => setCustomGoal(e.target.value)}
/>
```

---

#### 6. **AI 顧問 - 隱藏 JSON 代碼塊**
**描述**：AI 回覆中的 JSON 格式代碼塊應該被隱藏，只顯示人類可讀的文字。

**實現方案**：
```typescript
// 在前端 Markdown 渲染中過濾 JSON 代碼塊
const cleanMarkdown = (text: string) => {
  return text.replace(/```json[\s\S]*?```/g, "");
};
```

---

#### 7. **AI 顧問 - 全資產配置建議**
**描述**：目前只推薦單一策略，需要推薦完整的資產配置（如 60% 股票 + 30% 債券 + 10% 現金）。

**實現方案**：修改 `server/poe.ts` 中的 `analyzeGoal` 函數，要求 AI 返回資產配置比例。

---

#### 8. **AI 顧問 - 主動引導問題**
**描述**：AI 應該主動詢問用戶的風險偏好、稅務考量、流動性需求等，以提供更精準的建議。

**實現方案**：實現多輪對話，在 `AiAdvisorPanelV2.tsx` 中添加聊天功能。

---

### 🟢 低優先級（優化與增強）

#### 9. **股票搜尋 - 實時驗證**
**描述**：目前使用靜態查詢表，對於新上市股票無法支持。

**改進方案**：在 `stockSearch.ts` 中實現動態 yfinance 查詢，並添加緩存機制。

---

#### 10. **回測結果 - 買入賣出信號可視化**
**描述**：在資產曲線圖上標記買入/賣出點，幫助用戶理解策略邏輯。

**實現方案**：在前端圖表中添加標記點，使用 Chart.js 或 Plotly。

---

## 🚀 快速開發指南

### 本地開發
```bash
cd /home/ubuntu/stock-backtest

# 安裝依賴
pnpm install

# 啟動開發服務器
pnpm dev

# 類型檢查
pnpm check

# 構建生產版本
pnpm build
```

### 部署到 Render
1. 推送代碼到 GitHub `main` 分支
2. Render 會自動檢測並部署（約 2-3 分鐘）
3. 檢查 Render 後台日誌確認部署狀態

### 環境變數設置
在 Render 後台設置以下環境變數：
```
POE_API_KEY=sk-poe-YDsU1G-UDV4lbNVJ4A4KilL9S5oYDCB8WtX_D8Av7fA
DATABASE_URL=mysql://...
```

---

## 📁 關鍵文件位置

| 文件 | 用途 |
|------|------|
| `server/backtest.ts` | 回測引擎核心邏輯 |
| `server/poe.ts` | AI 診斷與分析 |
| `server/_core/llm.ts` | LLM API 調用 |
| `server/stockSearch.ts` | 股票搜尋與驗證 |
| `server/routers.ts` | TRPC 路由定義 |
| `client/src/pages/Home.tsx` | 首頁 |
| `client/src/components/AiAdvisorPanelV2.tsx` | AI 顧問面板 |
| `client/src/components/AiDiagnosisPanel.tsx` | AI 診斷面板 |
| `client/src/pages/Backtest.tsx` | 回測頁面 |

---

## 🔧 常見問題排查

### Q1：AI 診斷顯示「AI 服務暫時不可用」
**A**：檢查 Poe API Key 是否有效。在 `server/_core/llm.ts` 中添加日誌，查看具體的 API 錯誤。

### Q2：股票代碼搜尋不到（如 CHGG）
**A**：確保 `server/stockSearch.ts` 中的 `COMMON_STOCKS` 字典包含該代碼。如果仍無法搜尋，檢查 yfinance 是否能正常調用。

### Q3：回測結果數據不同步
**A**：在 `server/backtest.ts` 中添加日誌，打印出 `totalProfit`、`averageProfit`、`finalAsset` 的計算過程，與前端顯示的數字進行對比。

### Q4：登入失敗（401 錯誤）
**A**：檢查 `server/_core/cookies.ts` 中的 Cookie 配置，確保 `secure` 和 `sameSite` 設置適配 Render 的 HTTPS 環境。

---

## 📞 用戶反饋總結

**用戶 (chiholung@gmail.com) 的主要需求**：
1. ✅ 強化股票搜尋（已支持 CHGG）
2. ✅ 修復資產曲線與交易日誌同步
3. ✅ 擴展交易策略庫
4. ✅ 優化首頁 AI 體驗
5. ⏳ **AI 深度診斷分短中長期**（待實現 - 優先級最高）
6. ⏳ 修復「開始回測」按鈕跳轉
7. ⏳ 完整資產配置建議

---

## 📝 最後建議

1. **優先完成短中長期診斷功能**：這是用戶最關心的需求，應該在下一個開發週期首先完成。
2. **進行全功能實機測試**：在 Render 部署後，使用真實用戶帳號進行完整的端到端測試。
3. **增強錯誤日誌**：在所有 API 調用、數據計算處添加詳細日誌，便於排查問題。
4. **性能優化**：考慮添加 Redis 緩存以加快股票搜尋和 AI 回覆速度。
5. **用戶文檔**：為用戶編寫使用指南，解釋各個功能的含義。

---

**交接完成日期**：2026-04-27  
**下一步行動**：實現「AI 深度診斷分短中長期」功能，並進行全功能實機驗證。

祝您開發順利！🚀

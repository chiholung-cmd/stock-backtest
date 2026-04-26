import { spawn } from "child_process";

// 常見股票代碼快速查詢表
const COMMON_STOCKS: Record<string, { name: string; exchange: string }> = {
  // 美股科技
  "AAPL": { name: "Apple Inc.", exchange: "NASDAQ" },
  "MSFT": { name: "Microsoft Corporation", exchange: "NASDAQ" },
  "GOOGL": { name: "Alphabet Inc.", exchange: "NASDAQ" },
  "AMZN": { name: "Amazon.com Inc.", exchange: "NASDAQ" },
  "NVDA": { name: "NVIDIA Corporation", exchange: "NASDAQ" },
  "META": { name: "Meta Platforms Inc.", exchange: "NASDAQ" },
  "TSLA": { name: "Tesla Inc.", exchange: "NASDAQ" },
  "NFLX": { name: "Netflix Inc.", exchange: "NASDAQ" },
  
  // 美股教育 - 重點支持
  "CHGG": { name: "Chegg Inc.", exchange: "NASDAQ" },
  
  // 美股金融
  "JPM": { name: "JPMorgan Chase & Co.", exchange: "NYSE" },
  "BAC": { name: "Bank of America Corp.", exchange: "NYSE" },
  "GS": { name: "The Goldman Sachs Group Inc.", exchange: "NYSE" },
  
  // 美股能源
  "XOM": { name: "Exxon Mobil Corporation", exchange: "NYSE" },
  "CVX": { name: "Chevron Corporation", exchange: "NYSE" },
  
  // 美股醫療
  "JNJ": { name: "Johnson & Johnson", exchange: "NYSE" },
  "PFE": { name: "Pfizer Inc.", exchange: "NYSE" },
  "ABBV": { name: "AbbVie Inc.", exchange: "NYSE" },
  
  // 港股
  "0700.HK": { name: "Tencent Holdings Limited", exchange: "HKEX" },
  "0941.HK": { name: "China Mobile Limited", exchange: "HKEX" },
};

// 使用 Python 子進程調用 yfinance
export async function validateAndGetStockInfo(ticker: string): Promise<{
  symbol: string;
  name: string;
  exchange: string;
  currency: string;
  isValid: boolean;
} | null> {
  const upperTicker = ticker.toUpperCase();
  
  // 先檢查快速查詢表
  if (COMMON_STOCKS[upperTicker]) {
    const stock = COMMON_STOCKS[upperTicker];
    return {
      symbol: upperTicker,
      name: stock.name,
      exchange: stock.exchange,
      currency: "USD",
      isValid: true,
    };
  }
  
  // 如果不在快速表中，調用 Python 進行驗證
  return new Promise((resolve) => {
    const python = spawn("python3", ["-c", `
import yfinance as yf
import json
import sys

try:
    ticker = "${upperTicker}"
    stock = yf.Ticker(ticker)
    info = stock.info
    
    if not info or 'symbol' not in info:
        print(json.dumps({"isValid": False}))
        sys.exit(0)
    
    result = {
        "isValid": True,
        "symbol": info.get('symbol', ticker),
        "name": info.get('longName', info.get('shortName', ticker)),
        "exchange": info.get('exchange', 'UNKNOWN'),
        "currency": info.get('currency', 'USD')
    }
    print(json.dumps(result))
except Exception as e:
    print(json.dumps({"isValid": False, "error": str(e)}))
`]);

    let output = "";
    python.stdout.on("data", (data) => {
      output += data.toString();
    });

    python.on("close", (code) => {
      try {
        const result = JSON.parse(output);
        resolve(result.isValid ? result : null);
      } catch {
        resolve(null);
      }
    });

    // 超時控制
    setTimeout(() => {
      python.kill();
      resolve(null);
    }, 5000);
  });
}

// 搜尋股票（支持模糊匹配）
export async function searchStocks(query: string): Promise<Array<{
  ticker: string;
  name: string;
  exchange: string;
}>> {
  const upperQuery = query.toUpperCase();
  const results = Object.entries(COMMON_STOCKS)
    .filter(([ticker, info]) => 
      ticker.includes(upperQuery) || 
      info.name.toUpperCase().includes(upperQuery)
    )
    .map(([ticker, info]) => ({
      ticker,
      name: info.name,
      exchange: info.exchange,
    }));
  
  return results;
}

// 獲取股票歷史數據以計算回測指標
export async function getStockHistoricalData(
  ticker: string,
  startDate: string,
  endDate: string
): Promise<{ date: string; close: number }[] | null> {
  return new Promise((resolve) => {
    const python = spawn("python3", ["-c", `
import yfinance as yf
import json
import sys

try:
    ticker = "${ticker.toUpperCase()}"
    start = "${startDate}"
    end = "${endDate}"
    
    stock = yf.Ticker(ticker)
    hist = stock.history(start=start, end=end)
    
    if hist.empty:
        print(json.dumps([]))
        sys.exit(0)
    
    data = []
    for date, row in hist.iterrows():
        data.append({
            "date": date.strftime("%Y-%m-%d"),
            "close": float(row['Close'])
        })
    
    print(json.dumps(data))
except Exception as e:
    print(json.dumps([]))
`]);

    let output = "";
    python.stdout.on("data", (data) => {
      output += data.toString();
    });

    python.on("close", (code) => {
      try {
        const result = JSON.parse(output);
        resolve(Array.isArray(result) && result.length > 0 ? result : null);
      } catch {
        resolve(null);
      }
    });

    // 超時控制
    setTimeout(() => {
      python.kill();
      resolve(null);
    }, 10000);
  });
}

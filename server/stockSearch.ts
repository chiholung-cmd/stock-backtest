import { spawn } from "child_process";

// 使用 Python 子進程調用 yfinance
export async function validateAndGetStockInfo(ticker: string): Promise<{
  symbol: string;
  name: string;
  exchange: string;
  currency: string;
  isValid: boolean;
} | null> {
  return new Promise((resolve) => {
    const python = spawn("python3", ["-c", `
import yfinance as yf
import json
import sys

try:
    ticker = "${ticker.toUpperCase()}"
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

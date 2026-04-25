import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Search, X, Globe, TrendingUp, Zap } from "lucide-react";

// 全球熱門股票與 ETF 數據庫 (支援美股、港股、加密)
const STOCK_DATABASE = [
  // 美股科技龍頭
  { symbol: "AAPL", name: "Apple Inc.", exchange: "NASDAQ", type: "US Stock" },
  { symbol: "MSFT", name: "Microsoft Corp.", exchange: "NASDAQ", type: "US Stock" },
  { symbol: "GOOGL", name: "Alphabet Inc.", exchange: "NASDAQ", type: "US Stock" },
  { symbol: "AMZN", name: "Amazon.com Inc.", exchange: "NASDAQ", type: "US Stock" },
  { symbol: "NVDA", name: "NVIDIA Corp.", exchange: "NASDAQ", type: "US Stock" },
  { symbol: "TSLA", name: "Tesla Inc.", exchange: "NASDAQ", type: "US Stock" },
  { symbol: "META", name: "Meta Platforms Inc.", exchange: "NASDAQ", type: "US Stock" },
  { symbol: "NFLX", name: "Netflix Inc.", exchange: "NASDAQ", type: "US Stock" },
  
  // 美股其他
  { symbol: "ASTS", name: "Astra Space Inc.", exchange: "NASDAQ", type: "US Stock" },
  { symbol: "ASML", name: "ASML Holding N.V.", exchange: "NASDAQ", type: "US Stock" },
  { symbol: "AMD", name: "Advanced Micro Devices", exchange: "NASDAQ", type: "US Stock" },
  { symbol: "INTC", name: "Intel Corporation", exchange: "NASDAQ", type: "US Stock" },
  { symbol: "PYPL", name: "PayPal Holdings Inc.", exchange: "NASDAQ", type: "US Stock" },
  { symbol: "ADBE", name: "Adobe Inc.", exchange: "NASDAQ", type: "US Stock" },
  { symbol: "CSCO", name: "Cisco Systems Inc.", exchange: "NASDAQ", type: "US Stock" },
  { symbol: "CRWD", name: "CrowdStrike Holdings", exchange: "NASDAQ", type: "US Stock" },
  { symbol: "DDOG", name: "Datadog Inc.", exchange: "NASDAQ", type: "US Stock" },
  { symbol: "SNOW", name: "Snowflake Inc.", exchange: "NASDAQ", type: "US Stock" },
  { symbol: "CRM", name: "Salesforce Inc.", exchange: "NYSE", type: "US Stock" },
  { symbol: "OKTA", name: "Okta Inc.", exchange: "NASDAQ", type: "US Stock" },
  
  // 槓桿 ETF (超熱門)
  { symbol: "TQQQ", name: "Invesco QQQ Trust 3x", exchange: "NASDAQ", type: "Leveraged ETF" },
  { symbol: "SQQQ", name: "ProShares UltraPro QQQ", exchange: "NASDAQ", type: "Inverse ETF" },
  { symbol: "SOXL", name: "Direxion Daily Semiconductor 3x", exchange: "NASDAQ", type: "Leveraged ETF" },
  { symbol: "UPRO", name: "ProShares UltraPro S&P 500", exchange: "NYSE", type: "Leveraged ETF" },
  { symbol: "SPXU", name: "ProShares UltraPro Short S&P", exchange: "NYSE", type: "Inverse ETF" },
  { symbol: "UDOW", name: "ProShares UltraPro Dow 30", exchange: "NYSE", type: "Leveraged ETF" },
  { symbol: "SDOW", name: "ProShares UltraPro Short Dow", exchange: "NYSE", type: "Inverse ETF" },
  
  // 常規 ETF
  { symbol: "QQQ", name: "Invesco QQQ Trust", exchange: "NASDAQ", type: "ETF" },
  { symbol: "SPY", name: "SPDR S&P 500 ETF", exchange: "NYSE", type: "ETF" },
  { symbol: "IWM", name: "iShares Russell 2000", exchange: "NYSE", type: "ETF" },
  { symbol: "EEM", name: "iShares MSCI Emerging", exchange: "NYSE", type: "ETF" },
  { symbol: "GLD", name: "SPDR Gold Shares", exchange: "NYSE", type: "ETF" },
  
  // 港股 (HKEX)
  { symbol: "0700.HK", name: "騰訊控股 (Tencent)", exchange: "HKEX", type: "HK Stock" },
  { symbol: "9988.HK", name: "阿里巴巴 (Alibaba)", exchange: "HKEX", type: "HK Stock" },
  { symbol: "3690.HK", name: "美團 (Meituan)", exchange: "HKEX", type: "HK Stock" },
  { symbol: "2318.HK", name: "中國平安 (Ping An)", exchange: "HKEX", type: "HK Stock" },
  { symbol: "1398.HK", name: "工商銀行 (ICBC)", exchange: "HKEX", type: "HK Stock" },
  { symbol: "0939.HK", name: "中國銀行 (Bank of China)", exchange: "HKEX", type: "HK Stock" },
  { symbol: "0005.HK", name: "匯豐控股 (HSBC)", exchange: "HKEX", type: "HK Stock" },
  { symbol: "0001.HK", name: "長和 (CK Hutchison)", exchange: "HKEX", type: "HK Stock" },
  { symbol: "2333.HK", name: "北京京東方科技", exchange: "HKEX", type: "HK Stock" },
  { symbol: "9618.HK", name: "京東 (JD.com)", exchange: "HKEX", type: "HK Stock" },
  
  // 加密貨幣
  { symbol: "BTC-USD", name: "Bitcoin", exchange: "CRYPTO", type: "Crypto" },
  { symbol: "ETH-USD", name: "Ethereum", exchange: "CRYPTO", type: "Crypto" },
  { symbol: "SOL-USD", name: "Solana", exchange: "CRYPTO", type: "Crypto" },
];

interface StockSearchInputProps {
  onSelect?: (symbol: string) => void;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
}

export function StockSearchInput({
  onSelect,
  placeholder = "輸入代碼 (如: AAPL, TQQQ, 0700.HK)",
  value: externalValue,
  onChange: onExternalChange,
}: StockSearchInputProps) {
  const [value, setValue] = useState(externalValue || "");
  const [suggestions, setSuggestions] = useState<typeof STOCK_DATABASE>([]);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const query = value.toUpperCase().trim();
    if (query.length === 0) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    // 優先匹配精確符號開頭，然後匹配名稱
    const filtered = STOCK_DATABASE.filter(
      (stock) =>
        stock.symbol.startsWith(query) || stock.name.toUpperCase().includes(query)
    )
      .sort((a, b) => {
        const aSymbolMatch = a.symbol.startsWith(query);
        const bSymbolMatch = b.symbol.startsWith(query);
        if (aSymbolMatch && !bSymbolMatch) return -1;
        if (!aSymbolMatch && bSymbolMatch) return 1;
        return 0;
      })
      .slice(0, 8); // 最多顯示 8 筆

    setSuggestions(filtered);
    setIsOpen(filtered.length > 0);
  }, [value]);

  useEffect(() => {
    if (externalValue !== undefined && externalValue !== value) {
      setValue(externalValue);
    }
  }, [externalValue]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectStock = (symbol: string) => {
    setValue(symbol);
    onExternalChange?.(symbol);
    onSelect?.(symbol);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <Input
          type="text"
          value={value}
          onChange={(e) => {
            const newValue = e.target.value.toUpperCase();
            setValue(newValue);
            onExternalChange?.(newValue);
          }}
          onFocus={() => value && suggestions.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          className="pl-10 pr-10 h-12 text-lg font-bold tracking-wider rounded-xl border-slate-200 focus:ring-teal-500"
        />
        {value && (
          <button 
            onClick={() => selectStock("")} 
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {isOpen && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50">
          <div className="p-2 max-h-96 overflow-y-auto">
            {suggestions.map((stock) => (
              <button
                key={stock.symbol}
                onClick={() => selectStock(stock.symbol)}
                className="w-full flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-teal-50 group-hover:text-teal-600 transition-colors">
                    {stock.exchange === "HKEX" ? <Globe size={18} /> : stock.type === "Crypto" ? <Zap size={18} /> : <TrendingUp size={18} />}
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-black text-slate-900">{stock.symbol}</div>
                    <div className="text-xs text-slate-500 font-medium">{stock.name}</div>
                  </div>
                </div>
                <div className="text-[10px] font-bold px-2 py-1 rounded-md bg-slate-100 text-slate-500 group-hover:bg-teal-100 group-hover:text-teal-700 transition-colors">
                  {stock.exchange}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 無結果但允許自訂輸入 */}
      {value && !isOpen && suggestions.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 text-center text-sm text-slate-500 z-50">
          <p className="font-medium mb-2">找不到預設代碼</p>
          <p className="text-xs text-slate-400">您仍可使用自訂代碼進行回測（如 <code className="bg-slate-50 px-2 py-1 rounded">{value}</code>）</p>
        </div>
      )}
    </div>
  );
}

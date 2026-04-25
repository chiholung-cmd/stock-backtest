import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Search, X, Globe, TrendingUp } from "lucide-react";

// 全球常見代碼列表 (支援美股與港股)
const STOCK_DATABASE = [
  { symbol: "AAPL", name: "Apple Inc.", exchange: "NASDAQ", type: "US Stock" },
  { symbol: "TSLA", name: "Tesla Inc.", exchange: "NASDAQ", type: "US Stock" },
  { symbol: "NVDA", name: "NVIDIA Corp.", exchange: "NASDAQ", type: "US Stock" },
  { symbol: "MSFT", name: "Microsoft Corp.", exchange: "NASDAQ", type: "US Stock" },
  { symbol: "AMZN", name: "Amazon.com Inc.", exchange: "NASDAQ", type: "US Stock" },
  { symbol: "GOOGL", name: "Alphabet Inc.", exchange: "NASDAQ", type: "US Stock" },
  { symbol: "0700.HK", name: "騰訊控股", exchange: "HKEX", type: "HK Stock" },
  { symbol: "9988.HK", name: "阿里巴巴", exchange: "HKEX", type: "HK Stock" },
  { symbol: "3690.HK", name: "美團", exchange: "HKEX", type: "HK Stock" },
  { symbol: "2318.HK", name: "中國平安", exchange: "HKEX", type: "HK Stock" },
  { symbol: "BTC-USD", name: "Bitcoin", exchange: "CRYPTO", type: "Crypto" },
];

interface StockSearchInputProps {
  onSelect?: (symbol: string) => void;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
}

export function StockSearchInput({
  onSelect,
  placeholder = "輸入代碼 (如: AAPL, 0700.HK)",
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

    const filtered = STOCK_DATABASE.filter(
      (stock) =>
        stock.symbol.startsWith(query) || stock.name.toUpperCase().includes(query)
    ).slice(0, 5);

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
          <button onClick={() => selectStock("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
            <X size={16} />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50">
          <div className="p-2">
            {suggestions.map((stock) => (
              <button
                key={stock.symbol}
                onClick={() => selectStock(stock.symbol)}
                className="w-full flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-teal-50 group-hover:text-teal-600 transition-colors">
                    {stock.exchange === "HKEX" ? <Globe size={18} /> : <TrendingUp size={18} />}
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-black text-slate-900">{stock.symbol}</div>
                    <div className="text-xs text-slate-500 font-medium">{stock.name}</div>
                  </div>
                </div>
                <div className="text-[10px] font-bold px-2 py-1 rounded-md bg-slate-100 text-slate-500 group-hover:bg-teal-100 group-hover:text-teal-700">
                  {stock.exchange}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

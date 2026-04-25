import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";

// 美股常見代碼列表 (可從 API 動態擴展)
const STOCK_DATABASE = [
  { symbol: "AAPL", name: "Apple Inc." },
  { symbol: "MSFT", name: "Microsoft Corporation" },
  { symbol: "GOOGL", name: "Alphabet Inc." },
  { symbol: "AMZN", name: "Amazon.com Inc." },
  { symbol: "NVDA", name: "NVIDIA Corporation" },
  { symbol: "TSLA", name: "Tesla Inc." },
  { symbol: "META", name: "Meta Platforms Inc." },
  { symbol: "ASTS", name: "Astra Space Inc." },
  { symbol: "ASML", name: "ASML Holding N.V." },
  { symbol: "AMD", name: "Advanced Micro Devices" },
  { symbol: "INTC", name: "Intel Corporation" },
  { symbol: "NFLX", name: "Netflix Inc." },
  { symbol: "PYPL", name: "PayPal Holdings Inc." },
  { symbol: "ADBE", name: "Adobe Inc." },
  { symbol: "CSCO", name: "Cisco Systems Inc." },
  { symbol: "CRWD", name: "CrowdStrike Holdings" },
  { symbol: "DDOG", name: "Datadog Inc." },
  { symbol: "SNOW", name: "Snowflake Inc." },
  { symbol: "CRM", name: "Salesforce Inc." },
  { symbol: "OKTA", name: "Okta Inc." },
];

interface StockSearchInputProps {
  onSelect?: (symbol: string) => void;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
}

export function StockSearchInput({
  onSelect,
  placeholder = "輸入股票代碼 (如: AAPL)",
  value: externalValue,
  onChange: onExternalChange,
}: StockSearchInputProps) {
  const [value, setValue] = useState(externalValue || "");
  const [suggestions, setSuggestions] = useState<typeof STOCK_DATABASE>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 過濾股票列表
  useEffect(() => {
    const query = value.toUpperCase().trim();

    if (query.length === 0) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    // 優先匹配符號開頭，然後匹配名稱
    const filtered = STOCK_DATABASE.filter(
      (stock) =>
        stock.symbol.startsWith(query) || stock.name.toUpperCase().includes(query)
    )
      .sort((a, b) => {
        // 優先顯示符號完全匹配或開頭匹配的結果
        const aSymbolMatch = a.symbol.startsWith(query);
        const bSymbolMatch = b.symbol.startsWith(query);
        if (aSymbolMatch && !bSymbolMatch) return -1;
        if (!aSymbolMatch && bSymbolMatch) return 1;
        return 0;
      })
      .slice(0, 5); // 最多顯示 5 筆

    setSuggestions(filtered);
    setIsOpen(filtered.length > 0);
    setSelectedIndex(-1);
  }, [value]);

  // 處理外部值變化
  useEffect(() => {
    if (externalValue !== undefined && externalValue !== value) {
      setValue(externalValue);
    }
  }, [externalValue]);

  // 處理點擊外部關閉下拉菜單
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 處理鍵盤導航
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0) {
          selectStock(suggestions[selectedIndex].symbol);
        }
        break;
      case "Escape":
        setIsOpen(false);
        break;
    }
  };

  // 選擇股票
  const selectStock = (symbol: string) => {
    setValue(symbol);
    onExternalChange?.(symbol);
    onSelect?.(symbol);
    setIsOpen(false);
    setSuggestions([]);
  };

  // 清空輸入
  const handleClear = () => {
    setValue("");
    onExternalChange?.("");
    setSuggestions([]);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
        <Input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            const newValue = e.target.value.toUpperCase();
            setValue(newValue);
            onExternalChange?.(newValue);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => value && suggestions.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          className="pl-10 pr-10"
        />
        {value && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* 下拉菜單 */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          {suggestions.map((stock, index) => (
            <button
              key={stock.symbol}
              onClick={() => selectStock(stock.symbol)}
              className={`w-full px-4 py-3 text-left transition-colors ${
                index === selectedIndex
                  ? "bg-teal-50 border-l-2 border-teal-600"
                  : "hover:bg-gray-50"
              } ${index !== suggestions.length - 1 ? "border-b border-gray-100" : ""}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-gray-900">{stock.symbol}</div>
                  <div className="text-xs text-gray-500">{stock.name}</div>
                </div>
                {index === selectedIndex && (
                  <div className="w-2 h-2 rounded-full bg-teal-600" />
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* 無結果提示 */}
      {value && !isOpen && suggestions.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-center text-sm text-gray-500 z-50">
          找不到相符的股票代碼
        </div>
      )}
    </div>
  );
}

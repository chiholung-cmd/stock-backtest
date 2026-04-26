import { useState } from "react";
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, DollarSign } from "lucide-react";

interface Trade {
  date: string;
  action: string;
  price: number;
  amount: number;
  pnl: number | null;
  balance: number;
}

interface TradeDetailsPanelProps {
  trades: Trade[];
  initialCapital: number;
  currency: string;
}

export function TradeDetailsPanel({ trades, initialCapital, currency }: TradeDetailsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [sortBy, setSortBy] = useState<"date" | "pnl">("date");

  // 計算統計數據
  const buyTrades = trades.filter(t => t.action === "BUY");
  const sellTrades = trades.filter(t => t.action === "SELL" || t.action === "SELL (Close)");
  
  // 修正：後端傳回的 pnl 是百分比，需要轉換為金額
  // 損益金額 = 賣出價格 * 數量 - 買入價格 * 數量
  // 由於 Trade 對象中沒有直接存儲買入價格，我們從 balance 變化來推算或直接使用最後一筆 balance
  const finalBalance = trades.length > 0 ? trades[trades.length - 1].balance : initialCapital;
  
  // 計算總投入資金 (初始資金 + 定期定額總額 - 定期提領總額)
  const totalContributed = trades.filter(t => t.action === "CONTRIBUTE").reduce((sum, t) => sum + t.amount, 0);
  const totalRedrawn = trades.filter(t => t.action === "REDRAW").reduce((sum, t) => sum + t.amount, 0);
  const netInvestment = initialCapital + totalContributed - totalRedrawn;
  
  const totalPnL = finalBalance - netInvestment;
  const avgPnL = sellTrades.length > 0 ? totalPnL / sellTrades.length : 0;

  // 排序交易
  const sortedTrades = [...trades].sort((a, b) => {
    if (sortBy === "date") {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    } else {
      return (b.pnl || 0) - (a.pnl || 0);
    }
  });

  const formatCurrency = (value: number) => {
    return `${currency} ${Math.abs(value).toFixed(2)}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("zh-TW", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-8 py-6 cursor-pointer hover:bg-slate-50 transition-colors flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-600">
            <DollarSign size={24} />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900">交易詳情日誌</h3>
            <p className="text-xs text-slate-500 font-medium mt-1">
              共 {trades.length} 筆交易 · 買入 {buyTrades.length} 次 · 賣出 {sellTrades.length} 次
            </p>
          </div>
        </div>
        {isExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
      </div>

      {/* Statistics Bar */}
      {isExpanded && (
        <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 grid grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-xs font-bold text-slate-400 uppercase mb-1">總交易筆數</div>
            <div className="text-2xl font-black text-slate-900">{trades.length}</div>
          </div>
          <div className="text-center">
            <div className="text-xs font-bold text-slate-400 uppercase mb-1">總損益</div>
            <div className={`text-2xl font-black ${totalPnL > 0 ? "text-teal-700" : "text-rose-700"}`}>
              {formatCurrency(totalPnL)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs font-bold text-slate-400 uppercase mb-1">平均損益</div>
            <div className={`text-2xl font-black ${avgPnL > 0 ? "text-teal-700" : "text-rose-700"}`}>
              {formatCurrency(avgPnL)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs font-bold text-slate-400 uppercase mb-1">最終資產</div>
            <div className="text-2xl font-black text-slate-900">
              {formatCurrency(finalBalance)}
            </div>
          </div>
        </div>
      )}

      {/* Trade List */}
      {isExpanded && (
        <div className="px-8 py-6 border-t border-slate-100">
          {/* Sort Controls */}
          <div className="flex items-center gap-3 mb-6">
            <span className="text-xs font-bold text-slate-400">排序方式：</span>
            <button
              onClick={() => setSortBy("date")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                sortBy === "date"
                  ? "bg-teal-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              按日期
            </button>
            <button
              onClick={() => setSortBy("pnl")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                sortBy === "pnl"
                  ? "bg-teal-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              按損益
            </button>
          </div>

          {/* Trade Rows */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {sortedTrades.map((trade, index) => {
              const isBuy = trade.action === "BUY";
              const isSell = trade.action === "SELL" || trade.action === "SELL (Close)";
              const isProfitable = (trade.pnl ?? 0) > 0;

              return (
                <div
                  key={index}
                  className="grid grid-cols-7 gap-3 p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors items-center text-sm font-medium"
                >
                  {/* 序號 */}
                  <div className="text-center">
                    <div className="text-xs font-bold text-slate-400 mb-1">序號</div>
                    <div className="text-lg font-black text-slate-900">{index + 1}</div>
                  </div>

                  {/* 日期 */}
                  <div className="text-center">
                    <div className="text-xs font-bold text-slate-400 mb-1">日期</div>
                    <div className="text-xs font-bold text-slate-700">{formatDate(trade.date)}</div>
                  </div>

                  {/* 操作 */}
                  <div className="text-center">
                    <div className="text-xs font-bold text-slate-400 mb-1">操作</div>
                    <div
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-black ${
                        isBuy
                          ? "bg-teal-50 text-teal-700"
                          : "bg-rose-50 text-rose-700"
                      }`}
                    >
                      {isBuy ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                      {trade.action}
                    </div>
                  </div>

                  {/* 價格 */}
                  <div className="text-center">
                    <div className="text-xs font-bold text-slate-400 mb-1">價格</div>
                    <div className="text-sm font-black text-slate-900">{currency} {trade.price.toFixed(2)}</div>
                  </div>

                  {/* 數量 */}
                  <div className="text-center">
                    <div className="text-xs font-bold text-slate-400 mb-1">數量</div>
                    <div className="text-sm font-black text-slate-900">{trade.amount.toFixed(2)}</div>
                  </div>

                  {/* 損益 (僅賣出顯示) */}
                  <div className="text-center">
                    <div className="text-xs font-bold text-slate-400 mb-1">損益</div>
                    {isSell && trade.pnl !== null ? (
                      <div
                        className={`text-sm font-black ${
                          isProfitable ? "text-teal-700" : "text-rose-700"
                        }`}
                      >
                        {isProfitable ? "+" : ""}{(trade.pnl * 100).toFixed(2)}%
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400">—</div>
                    )}
                  </div>

                  {/* 資產餘額 */}
                  <div className="text-center">
                    <div className="text-xs font-bold text-slate-400 mb-1">資產餘額</div>
                    <div className="text-sm font-black text-slate-900">{formatCurrency(trade.balance)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

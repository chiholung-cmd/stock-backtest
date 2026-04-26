import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Link } from "wouter";
import {
  ArrowLeft, BarChart3, Trash2, TrendingUp, TrendingDown,
  Activity, Zap, GitCompare, LogIn, Clock
} from "lucide-react";

const STRATEGY_LABELS: Record<string, string> = {
  ma_crossover: "MA 交叉",
  rsi: "RSI",
  macd: "MACD",
  bollinger_bands: "布林帶",
};

const STRATEGY_COLORS: Record<string, string> = {
  ma_crossover: "oklch(0.52 0.18 195)",
  rsi: "oklch(0.65 0.22 25)",
  macd: "oklch(0.58 0.2 260)",
  bollinger_bands: "oklch(0.52 0.18 150)",
};

function formatPercent(v: number | null) {
  if (v === null) return "—";
  return `${(v * 100).toFixed(2)}%`;
}

function formatRatio(v: number | null) {
  if (v === null) return "—";
  return v.toFixed(3);
}

export default function History() {
  const { isAuthenticated } = useAuth();
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const { data: results, isLoading, refetch } = trpc.backtest.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const deleteMutation = trpc.backtest.delete.useMutation({
    onSuccess: () => {
      toast.success("已刪除回測記錄");
      refetch();
    },
    onError: (err) => toast.error(`刪除失敗：${err.message}`),
  });

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen grid-bg flex items-center justify-center">
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm max-w-md">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: "oklch(0.52 0.18 195 / 0.1)" }}>
            <LogIn size={28} style={{ color: "oklch(0.52 0.18 195)" }} />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">請先登入</h2>
          <p className="text-sm text-gray-400 mb-6">登入後即可儲存並查看回測歷史記錄</p>
          <Link href="/login">
            <Button className="text-white gap-2" style={{ background: "oklch(0.52 0.18 195)" }}>
              <LogIn size={16} />
              立即登入
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid-bg">
      {/* Nav */}
      <nav className="border-b border-gray-100 bg-white/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors">
              <ArrowLeft size={16} />
              <span className="text-sm">返回首頁</span>
            </Link>
            <div className="w-px h-4 bg-gray-200" />
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-gray-500" />
              <span className="font-bold text-gray-900">歷史記錄</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {selectedIds.size >= 2 && (
              <Link href={`/compare?ids=${Array.from(selectedIds).join(",")}`}>
                <Button size="sm" className="gap-2 text-white" style={{ background: "oklch(0.58 0.2 260)" }}>
                  <GitCompare size={14} />
                  比較選取的 {selectedIds.size} 筆
                </Button>
              </Link>
            )}
            <Link href="/backtest">
              <Button size="sm" className="gap-2 text-white" style={{ background: "oklch(0.52 0.18 195)" }}>
                <BarChart3 size={14} />
                新增回測
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <div className="container py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">回測歷史記錄</h1>
            <p className="text-sm text-gray-400 mt-1">
              {results ? `共 ${results.length} 筆記錄` : "載入中..."}
              {selectedIds.size > 0 && ` · 已選取 ${selectedIds.size} 筆`}
            </p>
          </div>
          {selectedIds.size > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-400 text-xs"
              onClick={() => setSelectedIds(new Set())}
            >
              取消選取
            </Button>
          )}
        </div>

        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse">
                <div className="h-4 bg-gray-100 rounded w-1/3 mb-3" />
                <div className="h-8 bg-gray-100 rounded w-1/2 mb-4" />
                <div className="grid grid-cols-2 gap-2">
                  {[1, 2, 3, 4].map(j => (
                    <div key={j} className="h-12 bg-gray-50 rounded" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && results && results.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center shadow-sm">
            <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: "oklch(0.52 0.18 195 / 0.1)" }}>
              <Clock size={28} style={{ color: "oklch(0.52 0.18 195)" }} />
            </div>
            <h3 className="text-lg font-bold text-gray-700 mb-2">尚無回測記錄</h3>
            <p className="text-sm text-gray-400 mb-6">執行回測後點擊「儲存結果」即可在此查看</p>
            <Link href="/backtest">
              <Button className="text-white gap-2" style={{ background: "oklch(0.52 0.18 195)" }}>
                <BarChart3 size={16} />
                開始第一次回測
              </Button>
            </Link>
          </div>
        )}

        {!isLoading && results && results.length > 0 && (
          <>
            {selectedIds.size > 0 && (
              <div className="mb-4 p-3 rounded-xl border flex items-center gap-2 text-sm" style={{ background: "oklch(0.58 0.2 260 / 0.06)", borderColor: "oklch(0.58 0.2 260 / 0.2)" }}>
                <GitCompare size={14} style={{ color: "oklch(0.58 0.2 260)" }} />
                <span style={{ color: "oklch(0.4 0.15 260)" }}>
                  已選取 {selectedIds.size} 筆記錄。選取 2 筆或以上即可進行比較分析。
                </span>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {results.map((r: any) => {
                const isSelected = selectedIds.has(r.id);
                const strategyColor = STRATEGY_COLORS[r.strategy] ?? "oklch(0.52 0.18 195)";
                const annReturn = r.annualizedReturn ?? 0;
                const isPositive = annReturn >= 0;

                return (
                  <div
                    key={r.id}
                    onClick={() => toggleSelect(r.id)}
                    className={`bg-white rounded-2xl border-2 p-5 cursor-pointer transition-all hover:shadow-md ${
                      isSelected ? "shadow-md" : "border-gray-100"
                    }`}
                    style={isSelected ? { borderColor: strategyColor } : {}}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xl font-extrabold text-gray-900">{r.ticker}</span>
                          <span
                            className="px-2 py-0.5 rounded-full text-xs font-semibold"
                            style={{ background: strategyColor + "15", color: strategyColor }}
                          >
                            {STRATEGY_LABELS[r.strategy] ?? r.strategy}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400">{r.startDate} ~ {r.endDate}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: strategyColor }}>
                            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                              <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                            </svg>
                          </div>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteMutation.mutate({ id: r.id });
                          }}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Main metric */}
                    <div className="mb-4">
                      <div className={`text-3xl font-extrabold ${isPositive ? "text-positive" : "text-negative"}`}>
                        {isPositive ? "+" : ""}{formatPercent(r.annualizedReturn)}
                      </div>
                      <div className="text-xs text-gray-400">年化報酬率</div>
                    </div>

                    {/* Secondary metrics */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-gray-50 rounded-lg p-2.5">
                        <div className="flex items-center gap-1 mb-1">
                          <TrendingDown size={11} className="text-gray-400" />
                          <span className="text-xs text-gray-400">最大回撤</span>
                        </div>
                        <div className="text-sm font-bold text-negative">{formatPercent(r.maxDrawdown)}</div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-2.5">
                        <div className="flex items-center gap-1 mb-1">
                          <Activity size={11} className="text-gray-400" />
                          <span className="text-xs text-gray-400">夏普比率</span>
                        </div>
                        <div className={`text-sm font-bold ${(r.sharpeRatio ?? 0) >= 0 ? "text-positive" : "text-negative"}`}>
                          {formatRatio(r.sharpeRatio)}
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-2.5">
                        <div className="flex items-center gap-1 mb-1">
                          <Zap size={11} className="text-gray-400" />
                          <span className="text-xs text-gray-400">勝率</span>
                        </div>
                        <div className={`text-sm font-bold ${(r.winRate ?? 0) >= 0.5 ? "text-positive" : "text-negative"}`}>
                          {formatPercent(r.winRate)}
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-2.5">
                        <div className="flex items-center gap-1 mb-1">
                          <TrendingUp size={11} className="text-gray-400" />
                          <span className="text-xs text-gray-400">交易次數</span>
                        </div>
                        <div className="text-sm font-bold text-gray-700">{r.totalTrades ?? "—"}</div>
                      </div>
                    </div>

                    {/* Params */}
                    <div className="mt-3 pt-3 border-t border-gray-50">
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(r.strategyParams as Record<string, number>).map(([k, v]) => (
                          <span key={k} className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-500 font-mono">
                            {k}: {v}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

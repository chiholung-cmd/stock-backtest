import { useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Link, useSearch } from "wouter";
import {
  ArrowLeft, GitCompare, TrendingUp, TrendingDown,
  Activity, Zap, BarChart3, LogIn
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from "recharts";

const STRATEGY_LABELS: Record<string, string> = {
  ma_crossover: "MA 交叉",
  rsi: "RSI",
  macd: "MACD",
  bollinger_bands: "布林帶",
};

const COMPARE_COLORS = [
  "oklch(0.52 0.18 195)",
  "oklch(0.65 0.22 25)",
  "oklch(0.58 0.2 260)",
  "oklch(0.52 0.18 150)",
  "oklch(0.55 0.2 310)",
];

const COMPARE_HEX = ["#0d9488", "#f97316", "#6366f1", "#22c55e", "#a855f7"];

function formatPercent(v: number | null) {
  if (v === null) return "—";
  return `${(v * 100).toFixed(2)}%`;
}
function formatRatio(v: number | null) {
  if (v === null) return "—";
  return v.toFixed(3);
}

type BacktestRecord = {
  id: number;
  ticker: string;
  strategy: string;
  strategyParams: unknown;
  startDate: string;
  endDate: string;
  annualizedReturn: number | null;
  maxDrawdown: number | null;
  sharpeRatio: number | null;
  winRate: number | null;
  totalTrades: number | null;
  equityCurve: unknown;
  trades: unknown;
  createdAt: Date;
  userId: number;
};

// ─── Combined Equity Curve Chart ─────────────────────────────────────────────

function CombinedEquityChart({ records }: { records: BacktestRecord[] }) {
  const chartData = useMemo(() => {
    if (records.length === 0) return [];

    // Get all unique dates from all records
    const allDates = new Set<string>();
    records.forEach(r => {
      const curve = r.equityCurve as { date: string; value: number }[] | null;
      if (curve) curve.forEach(p => allDates.add(p.date));
    });

    const sortedDates = Array.from(allDates).sort();

    // Build lookup maps
    const lookups = records.map(r => {
      const curve = r.equityCurve as { date: string; value: number }[] | null;
      const map = new Map<string, number>();
      if (curve) curve.forEach(p => map.set(p.date, p.value));
      return map;
    });

    // Sample to max 200 points
    const step = Math.max(1, Math.floor(sortedDates.length / 200));
    return sortedDates
      .filter((_, i) => i % step === 0 || i === sortedDates.length - 1)
      .map(date => {
        const point: Record<string, string | number> = { date };
        records.forEach((r, i) => {
          const val = lookups[i]?.get(date);
          if (val !== undefined) {
            point[`series_${i}`] = val;
          }
        });
        return point;
      });
  }, [records]);

  if (chartData.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">資產淨值曲線比較</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.93 0.004 240)" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: "oklch(0.6 0.01 240)" }}
            tickFormatter={(v) => v.slice(0, 7)}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 10, fill: "oklch(0.6 0.01 240)" }}
            tickFormatter={(v) => `$${v.toFixed(0)}`}
            width={70}
          />
          <Tooltip
            formatter={(value: number, name: string) => {
              const idx = parseInt(name.replace("series_", ""));
              const r = records[idx];
              return [`$${value.toFixed(2)}`, `${r?.ticker} (${STRATEGY_LABELS[r?.strategy ?? ""] ?? r?.strategy})`];
            }}
            labelFormatter={(label) => `日期: ${label}`}
            contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid oklch(0.92 0.004 240)" }}
          />
          <Legend
            formatter={(value) => {
              const idx = parseInt(value.replace("series_", ""));
              const r = records[idx];
              return `${r?.ticker} · ${STRATEGY_LABELS[r?.strategy ?? ""] ?? r?.strategy}`;
            }}
          />
          {records.map((_, i) => (
            <Line
              key={i}
              type="monotone"
              dataKey={`series_${i}`}
              stroke={COMPARE_HEX[i % COMPARE_HEX.length]}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Comparison Table ─────────────────────────────────────────────────────────

function ComparisonTable({ records }: { records: BacktestRecord[] }) {
  const metrics = [
    { key: "annualizedReturn", label: "年化報酬率", icon: TrendingUp, format: "percent" as const },
    { key: "maxDrawdown", label: "最大回撤", icon: TrendingDown, format: "percent" as const },
    { key: "sharpeRatio", label: "夏普比率", icon: Activity, format: "ratio" as const },
    { key: "winRate", label: "勝率", icon: Zap, format: "percent" as const },
    { key: "totalTrades", label: "總交易次數", icon: BarChart3, format: "number" as const },
  ];

  const getBestIdx = (key: string, higherIsBetter: boolean) => {
    const values = records.map(r => r[key as keyof BacktestRecord] as number | null);
    const validValues = values.filter(v => v !== null) as number[];
    if (validValues.length === 0) return -1;
    const best = higherIsBetter ? Math.max(...validValues) : Math.min(...validValues);
    return values.findIndex(v => v === best);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-gray-50">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">績效指標比較</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-50">
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide w-40">指標</th>
              {records.map((r, i) => (
                <th key={r.id} className="px-4 py-3 text-center">
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ background: COMPARE_COLORS[i % COMPARE_COLORS.length] }}
                    />
                    <span className="text-sm font-bold text-gray-900">{r.ticker}</span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{
                        background: COMPARE_COLORS[i % COMPARE_COLORS.length] + "15",
                        color: COMPARE_COLORS[i % COMPARE_COLORS.length],
                      }}
                    >
                      {STRATEGY_LABELS[r.strategy] ?? r.strategy}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {metrics.map((metric) => {
              const higherIsBetter = metric.key !== "maxDrawdown";
              const bestIdx = getBestIdx(metric.key, higherIsBetter);
              const Icon = metric.icon;

              return (
                <tr key={metric.key} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Icon size={14} className="text-gray-400" />
                      <span className="text-sm font-medium text-gray-600">{metric.label}</span>
                    </div>
                  </td>
                  {records.map((r, i) => {
                    const val = r[metric.key as keyof BacktestRecord] as number | null;
                    const isBest = i === bestIdx;
                    const formatted =
                      metric.format === "percent"
                        ? formatPercent(val)
                        : metric.format === "ratio"
                        ? formatRatio(val)
                        : (val ?? "—").toString();

                    let colorClass = "text-gray-700";
                    if (metric.format === "percent" && val !== null) {
                      if (metric.key === "maxDrawdown") colorClass = "text-negative";
                      else colorClass = val >= 0 ? "text-positive" : "text-negative";
                    } else if (metric.format === "ratio" && val !== null) {
                      colorClass = val >= 0 ? "text-positive" : "text-negative";
                    }

                    return (
                      <td key={r.id} className="px-4 py-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`text-base font-bold ${colorClass}`}>{formatted}</span>
                          {isBest && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 font-semibold">
                              最佳
                            </span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}

            {/* Date range row */}
            <tr className="border-b border-gray-50">
              <td className="px-6 py-4">
                <span className="text-sm font-medium text-gray-600">回測期間</span>
              </td>
              {records.map((r) => (
                <td key={r.id} className="px-4 py-4 text-center">
                  <div className="text-xs text-gray-400 font-mono">
                    {r.startDate}<br />~ {r.endDate}
                  </div>
                </td>
              ))}
            </tr>

            {/* Params row */}
            <tr>
              <td className="px-6 py-4">
                <span className="text-sm font-medium text-gray-600">策略參數</span>
              </td>
              {records.map((r) => (
                <td key={r.id} className="px-4 py-4 text-center">
                  <div className="flex flex-wrap gap-1 justify-center">
                    {Object.entries(r.strategyParams as Record<string, number>).map(([k, v]) => (
                      <span key={k} className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-mono">
                        {k}: {v}
                      </span>
                    ))}
                  </div>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main Compare Page ────────────────────────────────────────────────────────

export default function Compare() {
  const { isAuthenticated } = useAuth();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const idsParam = params.get("ids");
  const selectedIds = useMemo(
    () => idsParam ? idsParam.split(",").map(Number).filter(Boolean) : [],
    [idsParam]
  );

  const { data: allResults, isLoading } = trpc.backtest.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const compareRecords = useMemo(() => {
    if (!allResults) return [];
    if (selectedIds.length > 0) {
      return allResults.filter(r => selectedIds.includes(r.id));
    }
    return allResults.slice(0, 5);
  }, [allResults, selectedIds]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen grid-bg flex items-center justify-center">
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm max-w-md">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: "oklch(0.52 0.18 195 / 0.1)" }}>
            <LogIn size={28} style={{ color: "oklch(0.52 0.18 195)" }} />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">請先登入</h2>
          <p className="text-sm text-gray-400 mb-6">登入後即可比較多筆回測結果</p>
          <a href={getLoginUrl()}>
            <Button className="text-white gap-2" style={{ background: "oklch(0.52 0.18 195)" }}>
              <LogIn size={16} />
              立即登入
            </Button>
          </a>
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
            <Link href="/history" className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors">
              <ArrowLeft size={16} />
              <span className="text-sm">返回歷史記錄</span>
            </Link>
            <div className="w-px h-4 bg-gray-200" />
            <div className="flex items-center gap-2">
              <GitCompare size={16} className="text-gray-500" />
              <span className="font-bold text-gray-900">比較分析</span>
            </div>
          </div>
          <Link href="/backtest">
            <Button size="sm" className="gap-2 text-white" style={{ background: "oklch(0.52 0.18 195)" }}>
              <BarChart3 size={14} />
              新增回測
            </Button>
          </Link>
        </div>
      </nav>

      <div className="container py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">比較分析</h1>
          <p className="text-sm text-gray-400 mt-1">
            {compareRecords.length > 0
              ? `正在比較 ${compareRecords.length} 筆回測結果`
              : "從歷史記錄中選取記錄進行比較"}
          </p>
        </div>

        {isLoading && (
          <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center shadow-sm animate-pulse">
            <div className="h-4 bg-gray-100 rounded w-1/4 mx-auto mb-3" />
            <div className="h-4 bg-gray-100 rounded w-1/3 mx-auto" />
          </div>
        )}

        {!isLoading && compareRecords.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center shadow-sm">
            <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: "oklch(0.58 0.2 260 / 0.1)" }}>
              <GitCompare size={28} style={{ color: "oklch(0.58 0.2 260)" }} />
            </div>
            <h3 className="text-lg font-bold text-gray-700 mb-2">沒有可比較的記錄</h3>
            <p className="text-sm text-gray-400 mb-6">請先執行並儲存至少 2 筆回測結果，然後從歷史記錄頁面選取進行比較</p>
            <Link href="/history">
              <Button variant="outline" className="gap-2">
                <ArrowLeft size={16} />
                前往歷史記錄
              </Button>
            </Link>
          </div>
        )}

        {!isLoading && compareRecords.length > 0 && (
          <>
            <CombinedEquityChart records={compareRecords} />
            <ComparisonTable records={compareRecords} />
          </>
        )}
      </div>
    </div>
  );
}

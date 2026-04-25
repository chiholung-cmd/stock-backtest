import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { StockSearchInput } from "@/components/StockSearchInput";
import { toast } from "sonner";
import {
  BarChart3, TrendingUp, TrendingDown, Zap, Activity,
  Play, Save, ArrowLeft, ChevronDown, ChevronUp, Info
} from "lucide-react";
import { Link } from "wouter";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────

type Strategy = "ma_crossover" | "rsi" | "macd" | "bollinger_bands";

interface BacktestResult {
  ticker: string;
  strategy: string;
  strategyParams: Record<string, number>;
  startDate: string;
  endDate: string;
  annualizedReturn: number;
  maxDrawdown: number;
  sharpeRatio: number;
  winRate: number;
  totalTrades: number;
  equityCurve: { date: string; value: number }[];
  trades: { date: string; action: string; price: number; pnl: number | null }[];
}

// ─── Strategy Definitions ─────────────────────────────────────────────────────

const STRATEGIES = [
  {
    id: "ma_crossover" as Strategy,
    name: "MA 交叉",
    description: "短期均線上穿長期均線買入，下穿賣出",
    color: "oklch(0.52 0.18 195)",
    params: [
      { key: "shortPeriod", label: "短期 MA 週期", min: 2, max: 100, default: 10, step: 1 },
      { key: "longPeriod", label: "長期 MA 週期", min: 5, max: 300, default: 30, step: 1 },
    ],
  },
  {
    id: "rsi" as Strategy,
    name: "RSI",
    description: "RSI 突破超賣區買入，突破超買區賣出",
    color: "oklch(0.65 0.22 25)",
    params: [
      { key: "period", label: "RSI 週期", min: 2, max: 50, default: 14, step: 1 },
      { key: "oversold", label: "超賣閾值", min: 10, max: 45, default: 30, step: 1 },
      { key: "overbought", label: "超買閾值", min: 55, max: 90, default: 70, step: 1 },
    ],
  },
  {
    id: "macd" as Strategy,
    name: "MACD",
    description: "MACD 線上穿信號線買入，下穿賣出",
    color: "oklch(0.58 0.2 260)",
    params: [
      { key: "fastPeriod", label: "快線週期 (EMA)", min: 2, max: 50, default: 12, step: 1 },
      { key: "slowPeriod", label: "慢線週期 (EMA)", min: 5, max: 100, default: 26, step: 1 },
      { key: "signalPeriod", label: "信號線週期", min: 2, max: 30, default: 9, step: 1 },
    ],
  },
  {
    id: "bollinger_bands" as Strategy,
    name: "布林帶",
    description: "價格觸及下軌買入，觸及上軌賣出",
    color: "oklch(0.52 0.18 150)",
    params: [
      { key: "period", label: "均線週期", min: 5, max: 100, default: 20, step: 1 },
      { key: "stdDev", label: "標準差倍數", min: 0.5, max: 4, default: 2, step: 0.1 },
    ],
  },
];

// ─── Metric Card ──────────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  format,
  icon: Icon,
  positive,
  description,
}: {
  label: string;
  value: number | null;
  format: "percent" | "number" | "ratio";
  icon: React.ElementType;
  positive?: boolean;
  description?: string;
}) {
  const formatted =
    value === null
      ? "—"
      : format === "percent"
      ? `${(value * 100).toFixed(2)}%`
      : format === "ratio"
      ? value.toFixed(3)
      : value.toString();

  const isPositive = positive !== undefined ? positive : (value ?? 0) >= 0;
  const colorClass = format === "percent" || format === "ratio"
    ? isPositive ? "text-positive" : "text-negative"
    : "text-gray-900";

  return (
    <div className="metric-card p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon size={16} className="text-gray-400" />
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
        </div>
        {description && (
          <div className="group relative">
            <Info size={13} className="text-gray-300 cursor-help" />
            <div className="absolute right-0 top-5 w-48 p-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
              {description}
            </div>
          </div>
        )}
      </div>
      <div className={`text-2xl font-extrabold ${colorClass}`}>{formatted}</div>
    </div>
  );
}

// ─── TradingView Widget ───────────────────────────────────────────────────────

function TradingViewWidget({ ticker }: { ticker: string }) {
  const symbol = ticker.includes(":") ? ticker : `NASDAQ:${ticker}`;
  return (
    <div className="w-full h-[420px] rounded-xl overflow-hidden border border-gray-100">
      <iframe
        src={`https://www.tradingview.com/widgetembed/?frameElementId=tv_chart&symbol=${encodeURIComponent(symbol)}&interval=D&hidesidetoolbar=0&symboledit=1&saveimage=1&toolbarbg=f1f3f6&studies=[]&theme=light&style=1&timezone=Asia%2FHong_Kong&withdateranges=1&showpopupbutton=1&studies_overrides={}&overrides={}&enabled_features=[]&disabled_features=[]&locale=zh_TW&utm_source=&utm_medium=widget&utm_campaign=chart&utm_term=${encodeURIComponent(symbol)}`}
        style={{ width: "100%", height: "100%", border: "none" }}
        allowFullScreen
        title={`TradingView Chart - ${ticker}`}
      />
    </div>
  );
}

// ─── Equity Curve Chart ───────────────────────────────────────────────────────

function EquityCurveChart({ data, initialCapital = 10000 }: { data: { date: string; value: number }[]; initialCapital?: number }) {
  if (!data || data.length === 0) return null;

  const minVal = Math.min(...data.map(d => d.value));
  const maxVal = Math.max(...data.map(d => d.value));
  const finalValue = data[data.length - 1]?.value ?? initialCapital;
  const isPositive = finalValue >= initialCapital;

  const chartColor = isPositive ? "oklch(0.52 0.18 150)" : "oklch(0.55 0.22 25)";

  // Sample data for performance (max 200 points)
  const step = Math.max(1, Math.floor(data.length / 200));
  const sampledData = data.filter((_, i) => i % step === 0 || i === data.length - 1);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">資產淨值曲線</h3>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span>初始資本 $10,000</span>
          <span>→</span>
          <span className={isPositive ? "text-positive font-semibold" : "text-negative font-semibold"}>
            ${finalValue.toFixed(0)}
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={sampledData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={chartColor} stopOpacity={0.2} />
              <stop offset="95%" stopColor={chartColor} stopOpacity={0.02} />
            </linearGradient>
          </defs>
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
            domain={[minVal * 0.98, maxVal * 1.02]}
            width={70}
          />
          <Tooltip
            formatter={(value: number) => [`$${value.toFixed(2)}`, "淨值"]}
            labelFormatter={(label) => `日期: ${label}`}
            contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid oklch(0.92 0.004 240)" }}
          />
          <ReferenceLine y={initialCapital} stroke="oklch(0.7 0.01 240)" strokeDasharray="4 4" strokeWidth={1} />
          <Area
            type="monotone"
            dataKey="value"
            stroke={chartColor}
            strokeWidth={2}
            fill="url(#equityGradient)"
            dot={false}
            activeDot={{ r: 4, fill: chartColor }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Trade List ───────────────────────────────────────────────────────────────

function TradeList({ trades }: { trades: BacktestResult["trades"] }) {
  const [expanded, setExpanded] = useState(false);
  const displayTrades = expanded ? trades : trades.slice(0, 8);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">交易記錄</h3>
        <span className="text-xs text-gray-400">{trades.length} 筆</span>
      </div>
      <div className="space-y-1.5">
        {displayTrades.map((trade, i) => (
          <div
            key={i}
            className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50 text-xs"
          >
            <div className="flex items-center gap-3">
              <span
                className={`px-2 py-0.5 rounded font-semibold ${
                  trade.action.startsWith("BUY")
                    ? "bg-positive-light text-positive"
                    : "bg-negative-light text-negative"
                }`}
              >
                {trade.action.startsWith("BUY") ? "買入" : "賣出"}
              </span>
              <span className="font-mono text-gray-500">{trade.date}</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-mono text-gray-700">${trade.price.toFixed(2)}</span>
              {trade.pnl !== null && (
                <span className={`font-semibold font-mono ${trade.pnl >= 0 ? "text-positive" : "text-negative"}`}>
                  {trade.pnl >= 0 ? "+" : ""}{(trade.pnl * 100).toFixed(2)}%
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
      {trades.length > 8 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 w-full text-xs text-gray-400 hover:text-gray-600 flex items-center justify-center gap-1 py-2"
        >
          {expanded ? <><ChevronUp size={14} /> 收起</> : <><ChevronDown size={14} /> 顯示全部 {trades.length} 筆</>}
        </button>
      )}
    </div>
  );
}

// ─── Main Backtest Page ───────────────────────────────────────────────────────

export default function Backtest() {
  const { user, isAuthenticated } = useAuth();

  // Form state
  const [ticker, setTicker] = useState("AAPL");
  const [strategy, setStrategy] = useState<Strategy>("ma_crossover");
  const [params, setParams] = useState<Record<string, number>>({});
  const [startDate, setStartDate] = useState("2022-01-01");
  const [endDate, setEndDate] = useState("2024-12-31");
  const [timeframe, setTimeframe] = useState<"1d" | "1wk" | "1mo">("1d");
  const [initialCapital, setInitialCapital] = useState(10000);
  const [contributeAmount, setContributeAmount] = useState(0);
  const [contributePeriod, setContributePeriod] = useState<"none" | "weekly" | "monthly" | "quarterly">("none");
  const [redrawAmount, setRedrawAmount] = useState(0);
  const [redrawPeriod, setRedrawPeriod] = useState<"none" | "weekly" | "monthly" | "quarterly">("none");

  // Result state
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  // 解析 URL 參數 (來自 AI 顧問)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlTicker = params.get("ticker");
    const urlStrategy = params.get("strategy");
    const urlParams = params.get("params");

    if (urlTicker) setTicker(urlTicker);
    if (urlStrategy) setStrategy(urlStrategy as Strategy);
    if (urlParams) {
      try {
        setParams(JSON.parse(urlParams));
      } catch (e) {
        console.error("Failed to parse URL params", e);
      }
    }
  }, []);

  const selectedStrategy = STRATEGIES.find(s => s.id === strategy)!;

  // Get current param value
  const getParam = useCallback((key: string, defaultVal: number) => {
    return params[key] ?? defaultVal;
  }, [params]);

  const setParam = (key: string, value: number) => {
    setParams(prev => ({ ...prev, [key]: value }));
  };

  // Build params object with defaults
  const buildParams = () => {
    const result: Record<string, number> = {};
    selectedStrategy.params.forEach(p => {
      result[p.key] = getParam(p.key, p.default);
    });
    return result;
  };

  // tRPC mutation
  const runMutation = trpc.backtest.run.useMutation({
    onSuccess: (data) => {
      setResult(data as BacktestResult);
      setIsSaved(false);
      toast.success(`${data.ticker} 回測完成！共 ${data.totalTrades} 筆交易`);
    },
    onError: (err) => {
      toast.error(`回測失敗：${err.message}`);
    },
  });

  const saveMutation = trpc.backtest.save.useMutation({
    onSuccess: () => {
      setIsSaved(true);
      toast.success("回測結果已儲存！");
    },
    onError: (err) => {
      toast.error(`儲存失敗：${err.message}`);
    },
  });

  const handleRun = () => {
    if (!ticker.trim()) {
      toast.error("請輸入股票代碼");
      return;
    }
    if (startDate >= endDate) {
      toast.error("結束日期必須晚於開始日期");
      return;
    }
    runMutation.mutate({
      ticker: ticker.trim().toUpperCase(),
      strategy,
      params: buildParams(),
      startDate,
      endDate,
      timeframe,
      initialCapital,
      contributeAmount,
      contributePeriod,
      redrawAmount,
      redrawPeriod,
      saveResult: false,
    });
  };

  const handleSave = () => {
    if (!result || !isAuthenticated) return;
    saveMutation.mutate({
      ticker: result.ticker,
      strategy: result.strategy,
      strategyParams: result.strategyParams,
      startDate: result.startDate,
      endDate: result.endDate,
      annualizedReturn: result.annualizedReturn,
      maxDrawdown: result.maxDrawdown,
      sharpeRatio: result.sharpeRatio,
      winRate: result.winRate,
      totalTrades: result.totalTrades,
      equityCurve: result.equityCurve,
      trades: result.trades,
    });
  };

  return (
    <div className="min-h-screen grid-bg">
      {/* Top Navigation */}
      <nav className="border-b border-gray-100 bg-white/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors">
              <ArrowLeft size={16} />
              <span className="text-sm">返回首頁</span>
            </Link>
            <div className="w-px h-4 bg-gray-200" />
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: "oklch(0.52 0.18 195)" }}>
                <BarChart3 size={12} className="text-white" />
              </div>
              <span className="font-bold text-gray-900">策略回測</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/history" className="text-sm text-gray-500 hover:text-gray-900">歷史記錄</Link>
            <Link href="/compare" className="text-sm text-gray-500 hover:text-gray-900">比較分析</Link>
            {!isAuthenticated && (
              <Link href="/login">
                <Button size="sm" variant="outline" className="text-xs">登入以儲存結果</Button>
              </Link>
            )}
          </div>
        </div>
      </nav>

      <div className="container py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-8">

          {/* ─── Left Panel: Configuration ─── */}
          <div className="space-y-5">

            {/* Stock Input */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: "oklch(0.52 0.18 195 / 0.15)" }}>
                  <TrendingUp size={12} style={{ color: "oklch(0.52 0.18 195)" }} />
                </div>
                股票代碼
              </h2>
              <StockSearchInput
                value={ticker}
                onChange={setTicker}
                onSelect={setTicker}
                placeholder="輸入股票代碼或名稱"
              />
              <p className="text-xs text-gray-400 mt-2 text-center">支援美股市場所有標的</p>
            </div>

            {/* Timeframe & Capital */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
              <h2 className="text-base font-bold text-gray-900 mb-2 flex items-center gap-2">
                <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: "oklch(0.52 0.18 195 / 0.15)" }}>
                  <Activity size={12} style={{ color: "oklch(0.52 0.18 195)" }} />
                </div>
                時間週期與資金管理
              </h2>
              
              <div className="space-y-2">
                <Label className="text-xs">時間週期</Label>
                <div className="flex gap-2">
                  {(["1d", "1wk", "1mo"] as const).map(tf => (
                    <Button
                      key={tf}
                      size="sm"
                      variant={timeframe === tf ? "default" : "outline"}
                      onClick={() => setTimeframe(tf)}
                      className="flex-1 text-xs"
                    >
                      {tf === "1d" ? "日線" : tf === "1wk" ? "週線" : "月線"}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">初始資金 ($)</Label>
                <Input
                  type="number"
                  value={initialCapital}
                  onChange={e => setInitialCapital(Number(e.target.value))}
                  className="h-9"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">定期投入</Label>
                  <Input
                    type="number"
                    value={contributeAmount}
                    onChange={e => setContributeAmount(Number(e.target.value))}
                    placeholder="金額"
                    className="h-9"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">投入頻率</Label>
                  <select
                    value={contributePeriod}
                    onChange={e => setContributePeriod(e.target.value as any)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors"
                  >
                    <option value="none">無</option>
                    <option value="weekly">每週</option>
                    <option value="monthly">每月</option>
                    <option value="quarterly">每季</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Strategy Selection */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: "oklch(0.65 0.22 25 / 0.15)" }}>
                  <Zap size={12} style={{ color: "oklch(0.65 0.22 25)" }} />
                </div>
                交易策略
              </h2>
              <div className="space-y-2">
                {STRATEGIES.map(s => (
                  <button
                    key={s.id}
                    onClick={() => { setStrategy(s.id); setParams({}); }}
                    className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                      strategy === s.id
                        ? "border-2 bg-white"
                        : "border-gray-100 bg-gray-50 hover:bg-white hover:border-gray-200"
                    }`}
                    style={strategy === s.id ? { borderColor: s.color } : {}}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-gray-900">{s.name}</span>
                      {strategy === s.id && (
                        <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{s.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Strategy Parameters */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: "oklch(0.58 0.2 260 / 0.15)" }}>
                  <Activity size={12} style={{ color: "oklch(0.58 0.2 260)" }} />
                </div>
                策略參數
              </h2>
              <div className="space-y-5">
                {selectedStrategy.params.map(p => (
                  <div key={p.key}>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-xs font-medium text-gray-600">{p.label}</Label>
                      <span className="text-sm font-bold font-mono" style={{ color: selectedStrategy.color }}>
                        {getParam(p.key, p.default)}
                      </span>
                    </div>
                    <Slider
                      min={p.min}
                      max={p.max}
                      step={p.step}
                      value={[getParam(p.key, p.default)]}
                      onValueChange={([v]) => setParam(p.key, v)}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-300 mt-1">
                      <span>{p.min}</span>
                      <span>{p.max}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Date Range */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <h2 className="text-base font-bold text-gray-900 mb-4">回測時間範圍</h2>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs font-medium text-gray-600 mb-1.5 block">開始日期</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-600 mb-1.5 block">結束日期</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Run Button */}
            <Button
              onClick={handleRun}
              disabled={runMutation.isPending}
              className="w-full h-12 text-white font-bold text-base gap-2"
              style={{ background: "oklch(0.52 0.18 195)" }}
            >
              {runMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  正在執行回測...
                </>
              ) : (
                <>
                  <Play size={18} />
                  執行回測
                </>
              )}
            </Button>
          </div>

          {/* ─── Right Panel: Results ─── */}
          <div className="space-y-6">
            {!result && !runMutation.isPending && (
              <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center shadow-sm">
                <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: "oklch(0.52 0.18 195 / 0.1)" }}>
                  <BarChart3 size={28} style={{ color: "oklch(0.52 0.18 195)" }} />
                </div>
                <h3 className="text-lg font-bold text-gray-700 mb-2">尚未執行回測</h3>
                <p className="text-sm text-gray-400">在左側設定股票代碼、策略與時間範圍，然後點擊「執行回測」</p>
              </div>
            )}

            {runMutation.isPending && (
              <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center shadow-sm">
                <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center animate-pulse" style={{ background: "oklch(0.52 0.18 195 / 0.1)" }}>
                  <Activity size={28} style={{ color: "oklch(0.52 0.18 195)" }} />
                </div>
                <h3 className="text-lg font-bold text-gray-700 mb-2">正在執行回測</h3>
                <p className="text-sm text-gray-400">從 Yahoo Finance 獲取數據並計算策略信號...</p>
              </div>
            )}

            {result && (
              <>
                {/* Result Header */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h2 className="text-2xl font-extrabold text-gray-900">{result.ticker}</h2>
                        <span
                          className="px-3 py-1 rounded-full text-xs font-semibold"
                          style={{
                            background: selectedStrategy.color + "15",
                            color: selectedStrategy.color,
                          }}
                        >
                          {selectedStrategy.name}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400">
                        {result.startDate} ~ {result.endDate}
                      </p>
                    </div>
                    {isAuthenticated && (
                      <Button
                        onClick={handleSave}
                        disabled={isSaved || saveMutation.isPending}
                        variant="outline"
                        size="sm"
                        className="gap-2"
                      >
                        <Save size={14} />
                        {isSaved ? "已儲存" : "儲存結果"}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Performance Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
                  <MetricCard
                    label="年化報酬率"
                    value={result.annualizedReturn}
                    format="percent"
                    icon={TrendingUp}
                    description="以年化計算的總報酬率"
                  />
                  <MetricCard
                    label="最大回撤"
                    value={result.maxDrawdown}
                    format="percent"
                    icon={TrendingDown}
                    positive={false}
                    description="從高點到低點的最大跌幅"
                  />
                  <MetricCard
                    label="夏普比率"
                    value={result.sharpeRatio}
                    format="ratio"
                    icon={Activity}
                    positive={(result.sharpeRatio ?? 0) > 0}
                    description="每單位風險的超額報酬（>1 為佳）"
                  />
                  <MetricCard
                    label="勝率"
                    value={result.winRate}
                    format="percent"
                    icon={Zap}
                    positive={(result.winRate ?? 0) >= 0.5}
                    description="獲利交易佔總交易的比例"
                  />
                  <MetricCard
                    label="總交易次數"
                    value={result.totalTrades}
                    format="number"
                    icon={BarChart3}
                    description="回測期間的完整交易筆數"
                  />
                </div>

                {/* Equity Curve */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                  <EquityCurveChart data={result.equityCurve} />
                </div>

                {/* TradingView Chart */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
                    K 線圖表 · TradingView
                  </h3>
                  <TradingViewWidget ticker={result.ticker} />
                </div>

                {/* Trade List */}
                {result.trades.length > 0 && (
                  <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                    <TradeList trades={result.trades} />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StockSearchInput } from "@/components/StockSearchInput";
import { TradeDetailsPanel } from "@/components/TradeDetailsPanel";
import { toast } from "sonner";
import {
  BarChart3, TrendingUp, TrendingDown, Zap, Activity,
  Play, Save, ArrowLeft, Info, Globe, Calculator
} from "lucide-react";
import { Link } from "wouter";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
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
  description,
}: {
  label: string;
  value: number | null | undefined;
  format: "percent" | "number" | "ratio";
  icon: React.ElementType;
  description: string;
}) {
  const isPositive = value !== null && value !== undefined && value > 0;
  
  const formattedValue =
    value === null || value === undefined
      ? "N/A"
      : format === "percent"
      ? (value * 100).toFixed(2) + "%"
      : format === "number"
      ? value.toString()
      : value.toFixed(2);

  const displayColorClass = label === "最大回撤" 
    ? "bg-rose-50 text-rose-600 border-rose-100" 
    : isPositive 
    ? "bg-teal-50 text-teal-600 border-teal-100" 
    : "bg-slate-50 text-slate-600 border-slate-100";

  const textColorClass = label === "最大回撤"
    ? "text-rose-700"
    : isPositive
    ? "text-teal-700"
    : "text-slate-700";

  return (
    <div className={`rounded-3xl border p-6 shadow-sm transition-all hover:shadow-md bg-white`}>
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-2.5 rounded-2xl ${displayColorClass}`}>
          <Icon size={20} />
        </div>
        <span className="text-xs font-black text-slate-500 uppercase tracking-widest">{label}</span>
      </div>
      <div className={`text-3xl font-black tracking-tight ${textColorClass}`}>
        {formattedValue}
      </div>
      <p className="text-xs text-slate-400 mt-3 font-bold leading-snug">{description}</p>
    </div>
  );
}

// ─── TradingView Widget ───────────────────────────────────────────────────────

function TradingViewWidget({ ticker }: { ticker: string }) {
  const symbol = ticker.includes(":") ? ticker : ticker.includes(".HK") ? `HKEX:${ticker.replace(".HK", "")}` : `NASDAQ:${ticker}`;
  return (
    <div className="w-full h-[420px] rounded-[2rem] overflow-hidden border border-slate-100 shadow-inner">
      <iframe
        src={`https://www.tradingview.com/widgetembed/?frameElementId=tv_chart&symbol=${encodeURIComponent(symbol)}&interval=D&hidesidetoolbar=0&symboledit=1&saveimage=1&toolbarbg=f1f3f6&studies=[]&theme=light&style=1&timezone=Asia%2FHong_Kong&withdateranges=1&showpopupbutton=1&studies_overrides={}&overrides={}&enabled_features=[]&disabled_features=[]&locale=zh_TW`}
        style={{ width: "100%", height: "100%", border: "none" }}
        allowFullScreen
        title={`TradingView Chart - ${ticker}`}
      />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Backtest() {
  const { user, isAuthenticated } = useAuth();
  
  // Form state
  const [ticker, setTicker] = useState("AAPL");
  const [strategy, setStrategy] = useState<Strategy>("ma_crossover");
  const [params, setParams] = useState<Record<string, number>>({});
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [timeframe, setTimeframe] = useState<"1d" | "1wk" | "1mo">("1d");
  const [initialCapital, setInitialCapital] = useState(10000);
  const [contributeAmount, setContributeAmount] = useState(0);
  const [contributePeriod, setContributePeriod] = useState<"none" | "weekly" | "monthly" | "quarterly">("none");
  const [redrawAmount, setRedrawAmount] = useState(0);
  const [redrawPeriod, setRedrawPeriod] = useState<"none" | "weekly" | "monthly" | "quarterly">("none");
  const [currency, setCurrency] = useState("HKD");

  // Result state
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  // 解析 URL 參數
  useEffect(() => {
    const paramsObj = new URLSearchParams(window.location.search);
    const tickerParam = paramsObj.get("ticker");
    const strategyParam = paramsObj.get("strategy");
    const strategyParamsJson = paramsObj.get("params");

    if (tickerParam) setTicker(tickerParam);
    if (strategyParam) setStrategy(strategyParam as Strategy);
    if (strategyParamsJson) {
      try {
        setParams(JSON.parse(strategyParamsJson));
      } catch (e) {
        console.error("Failed to parse strategy params from URL", e);
      }
    }
  }, []);

  const selectedStrategy = STRATEGIES.find(s => s.id === strategy)!;

  // Initialize params when strategy changes
  useEffect(() => {
    const newParams: Record<string, number> = {};
    selectedStrategy.params.forEach(p => {
      newParams[p.key] = params[p.key] ?? p.default;
    });
    setParams(newParams);
  }, [strategy]);

  const runMutation = trpc.backtest.run.useMutation({
    onSuccess: (data) => {
      setResult(data as BacktestResult);
      setIsSaved(false);
      toast.success("回測完成！");
    },
    onError: (err) => {
      toast.error(`回測失敗: ${err.message}`);
    },
  });

  const saveMutation = trpc.backtest.save.useMutation({
    onSuccess: () => {
      setIsSaved(true);
      toast.success("結果已儲存至歷史記錄");
    },
    onError: (err) => {
      toast.error(`儲存失敗: ${err.message}`);
    },
  });

  const handleRun = () => {
    if (!startDate || !endDate) {
      toast.error("請選擇開始與結束日期");
      return;
    }
    runMutation.mutate({
      ticker,
      strategy,
      params,
      startDate,
      endDate,
      timeframe,
      initialCapital,
      contributeAmount,
      contributePeriod,
      redrawAmount,
      redrawPeriod,
    });
  };

  const handleSave = () => {
    if (!result) return;
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
    <div className="min-h-screen bg-[#F8FAFC] pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/">
            <Button variant="ghost" size="icon" className="rounded-full bg-white shadow-sm border border-slate-100">
              <ArrowLeft size={20} />
            </Button>
          </Link>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">策略回測驗證</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* ─── Left Panel: Config ─── */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm space-y-8">
              {/* Stock Search */}
              <div className="space-y-3">
                <Label className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Globe size={16} className="text-teal-600" /> 選擇股票標的
                </Label>
                <StockSearchInput 
                  value={ticker} 
                  onSelect={setTicker} 
                  onChange={setTicker} 
                />
              </div>

              {/* Strategy Select */}
              <div className="space-y-3">
                <Label className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Zap size={16} className="text-amber-500" /> 選擇交易策略
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {STRATEGIES.map(s => (
                    <button
                      key={s.id}
                      onClick={() => setStrategy(s.id)}
                      className={`px-4 py-3 rounded-2xl text-xs font-bold transition-all border ${
                        strategy === s.id 
                        ? "bg-slate-900 text-white border-slate-900 shadow-md" 
                        : "bg-slate-50 text-slate-600 border-slate-100 hover:bg-slate-100"
                      }`}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Strategy Params */}
              <div className="space-y-4 pt-4 border-t border-slate-50">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-black text-slate-900">策略參數</Label>
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-md">CUSTOM</span>
                </div>
                {selectedStrategy.params.map(p => (
                  <div key={p.key} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label className="text-xs font-bold text-slate-500">{p.label}</Label>
                      <span className="text-xs font-black text-teal-600">{params[p.key] || p.default}</span>
                    </div>
                    <input
                      type="range"
                      min={p.min}
                      max={p.max}
                      step={p.step}
                      value={params[p.key] || p.default}
                      onChange={e => setParams(prev => ({ ...prev, [p.key]: Number(e.target.value) }))}
                      className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-teal-600"
                    />
                  </div>
                ))}
              </div>

              {/* Money Management */}
              <div className="space-y-4 pt-4 border-t border-slate-50">
                <Label className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Calculator size={16} className="text-blue-600" /> 資金管理設定
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-400 uppercase">結算幣別</Label>
                    <select
                      value={currency}
                      onChange={e => setCurrency(e.target.value)}
                      className="w-full h-10 rounded-xl border border-slate-100 bg-slate-50 px-3 text-sm font-bold text-slate-700"
                    >
                      <option value="HKD">HKD (預設)</option>
                      <option value="USD">USD</option>
                      <option value="CNY">CNY</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-400 uppercase">初始資金</Label>
                    <Input
                      type="number"
                      value={initialCapital}
                      onChange={e => setInitialCapital(Number(e.target.value))}
                      className="h-10 rounded-xl bg-slate-50 border-slate-100 font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Time Range */}
              <div className="space-y-4 pt-4 border-t border-slate-50">
                <Label className="text-sm font-black text-slate-900">回測時間範圍</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-400 uppercase">開始日期</Label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                      className="h-10 rounded-xl bg-slate-50 border-slate-100 font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-400 uppercase">結束日期</Label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={e => setEndDate(e.target.value)}
                      className="h-10 rounded-xl bg-slate-50 border-slate-100 font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Run Button */}
              <Button
                onClick={handleRun}
                disabled={runMutation.isPending}
                className="w-full h-14 bg-gradient-to-r from-teal-600 to-blue-600 text-white font-black text-lg rounded-2xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
              >
                {runMutation.isPending ? "正在執行..." : "執行回測驗證"}
              </Button>
            </div>
          </div>

          {/* ─── Right Panel: Results ─── */}
          <div className="lg:col-span-8 space-y-8">
            {!result && !runMutation.isPending && (
              <div className="bg-white rounded-[2.5rem] border border-slate-100 p-24 text-center shadow-sm">
                <div className="w-20 h-20 rounded-3xl mx-auto mb-6 flex items-center justify-center bg-slate-50 text-slate-300">
                  <BarChart3 size={40} />
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-3">準備就緒</h3>
                <p className="text-slate-500 font-medium">在左側設定參數後點擊執行，AI 回測引擎將為您分析績效。</p>
              </div>
            )}

            {runMutation.isPending && (
              <div className="bg-white rounded-[2.5rem] border border-slate-100 p-24 text-center shadow-sm">
                <div className="w-20 h-20 rounded-3xl mx-auto mb-6 flex items-center justify-center bg-teal-50 text-teal-600 animate-pulse">
                  <Activity size={40} />
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-3">正在計算策略績效</h3>
                <p className="text-slate-500 font-medium">獲取 Yahoo Finance 歷史數據並模擬交易信號...</p>
              </div>
            )}

            {result && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
                {/* Performance Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                  <MetricCard
                    label="年化報酬率"
                    value={result.annualizedReturn}
                    format="percent"
                    icon={TrendingUp}
                    description="以複利計算的平均年化回報"
                  />
                  <MetricCard
                    label="最大回撤"
                    value={result.maxDrawdown}
                    format="percent"
                    icon={TrendingDown}
                    description="歷史最大淨值跌幅"
                  />
                  <MetricCard
                    label="夏普比率"
                    value={result.sharpeRatio}
                    format="ratio"
                    icon={Activity}
                    description="風險調整後的報酬表現"
                  />
                  <MetricCard
                    label="勝率"
                    value={result.winRate}
                    format="percent"
                    icon={Zap}
                    description="獲利交易佔總交易比例"
                  />
                </div>

                {/* Charts */}
                <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xl font-black text-slate-900">資產增長曲線</h3>
                    <div className="text-xs font-bold text-slate-400 bg-slate-50 px-3 py-1.5 rounded-full">
                      {result.ticker} · {result.startDate} ~ {result.endDate}
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={result.equityCurve}>
                      <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0d9488" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#0d9488" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" hide />
                      <YAxis hide domain={['auto', 'auto']} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                        formatter={(val: number) => [`$${val.toFixed(2)}`, '資產淨值']}
                      />
                      <Area type="monotone" dataKey="value" stroke="#0d9488" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* TradingView */}
                <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm">
                  <h3 className="text-xl font-black text-slate-900 mb-6">TradingView 市場圖表</h3>
                  <TradingViewWidget ticker={result.ticker} />
                </div>

                {/* Trade Details */}
                {result.trades && result.trades.length > 0 && (
                  <TradeDetailsPanel 
                    trades={result.trades.map((t: any, idx: number) => ({
                      ...t,
                      balance: t.balance ?? (initialCapital + (t.pnl ?? 0))
                    }))} 
                    initialCapital={initialCapital}
                    currency={currency}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

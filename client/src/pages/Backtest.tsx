import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StockSearchInput } from "@/components/StockSearchInput";
import { TradeDetailsPanel } from "@/components/TradeDetailsPanel";
import { AiDiagnosisPanel } from "@/components/AiDiagnosisPanel";
import { StockComparisonPanel } from "@/components/StockComparisonPanel";
import { toast } from "sonner";
import {
  BarChart3, TrendingUp, TrendingDown, Zap, Activity,
  Play, Save, ArrowLeft, Info, Globe, Calculator, BrainCircuit
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  buyAndHoldCurve?: { date: string; value: number }[];
  trades: { date: string; action: string; price: number; amount: number; pnl: number | null; balance: number }[];
}

// ─── Strategy Definitions ─────────────────────────────────────────────────────

const STRATEGIES = [
  {
    id: "ma_crossover" as Strategy,
    name: "MA 交叉",
    description: "短期均線上穿長期均線買入，下穿賣出",
    color: "#0d9488",
    params: [
      { key: "shortPeriod", label: "短期 MA 週期", min: 2, max: 100, default: 10, step: 1 },
      { key: "longPeriod", label: "長期 MA 週期", min: 5, max: 300, default: 30, step: 1 },
    ],
  },
  {
    id: "rsi" as Strategy,
    name: "RSI",
    description: "RSI 突破超賣區買入，突破超買區賣出",
    color: "#f59e0b",
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
    color: "#3b82f6",
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
    color: "#8b5cf6",
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
      ? "—"
      : format === "percent"
      ? (value * 100).toFixed(2) + "%"
      : format === "number"
      ? value.toString()
      : value.toFixed(2);

  const isDrawdown = label === "最大回撤";
  const colorClass = isDrawdown ? "text-rose-600" : isPositive ? "text-teal-600" : "text-slate-900";

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Icon size={16} className="text-slate-400" />
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</span>
      </div>
      <div className={`text-2xl font-black tracking-tight ${colorClass}`}>
        {formattedValue}
      </div>
      <p className="text-[10px] text-slate-400 mt-2 font-medium">{description}</p>
    </div>
  );
}

// ─── TradingView Widget ───────────────────────────────────────────────────────

function TradingViewWidget({ ticker }: { ticker: string }) {
  const symbol = ticker.includes(":") ? ticker : ticker.includes(".HK") ? `HKEX:${ticker.replace(".HK", "")}` : `NASDAQ:${ticker}`;
  return (
    <div className="w-full h-[400px] rounded-xl overflow-hidden border border-slate-100">
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
  const [, setLocation] = useState("");
  
  // Form state
  const [ticker, setTicker] = useState("AAPL");
  const [strategy, setStrategy] = useState<Strategy>("ma_crossover");
  const [params, setParams] = useState<Record<string, number>>({});
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [initialCapital, setInitialCapital] = useState(10000);
  const [currency, setCurrency] = useState("HKD");
  const [contributeAmount, setContributeAmount] = useState(0);
  const [contributePeriod, setContributePeriod] = useState("none");
  const [redrawAmount, setRedrawAmount] = useState(0);
  const [redrawPeriod, setRedrawPeriod] = useState("none");

  // Result state
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  // 解析 URL 參數
  useEffect(() => {
    try {
      const paramsObj = new URLSearchParams(window.location.search);
      const tickerParam = paramsObj.get("ticker");
      const strategyParam = paramsObj.get("strategy");
      const strategyParamsJson = paramsObj.get("params");

      if (tickerParam) setTicker(tickerParam);
      if (strategyParam && STRATEGIES.find(s => s.id === strategyParam)) {
        setStrategy(strategyParam as Strategy);
      }
      if (strategyParamsJson) {
        try {
          const parsed = JSON.parse(decodeURIComponent(strategyParamsJson));
          if (parsed && typeof parsed === 'object') {
            setParams(parsed);
          }
        } catch (e) {
          console.error("Failed to parse strategy params from URL", e);
          setParams({});
        }
      }
    } catch (error) {
      console.error("Error parsing URL parameters", error);
    }
  }, []);

  const selectedStrategy = STRATEGIES.find(s => s.id === strategy);
  
  if (!selectedStrategy) {
    return <div className="p-4 text-red-600">策略未找到</div>;
  }

  // Initialize params when strategy changes
  useEffect(() => {
    const newParams: Record<string, number> = {};
    if (selectedStrategy && selectedStrategy.params) {
      selectedStrategy.params.forEach(p => {
        newParams[p.key] = params[p.key] ?? p.default;
      });
    }
    setParams(newParams);
  }, [strategy, selectedStrategy]);

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
      initialCapital,
      contributeAmount: contributePeriod === "none" ? 0 : contributeAmount,
      contributePeriod,
      redrawAmount: redrawPeriod === "none" ? 0 : redrawAmount,
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
    <div className="min-h-screen bg-[#FDFDFD] pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" className="rounded-xl bg-white border border-slate-100 shadow-sm">
                <ArrowLeft size={18} />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">策略回測驗證</h1>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Backtest Engine v2.0</p>
            </div>
          </div>
          
          {result && isAuthenticated && (
            <Button
              onClick={handleSave}
              disabled={isSaved || saveMutation.isPending}
              variant="outline"
              className="rounded-xl gap-2 font-bold text-xs"
            >
              <Save size={14} />
              {isSaved ? "已儲存" : "儲存結果"}
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* ─── Left Panel: Config ─── */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm space-y-8">
              {/* Stock Search */}
              <div className="space-y-3">
                <Label className="text-xs font-black text-slate-500 uppercase tracking-widest">股票標的</Label>
                <StockSearchInput 
                  value={ticker} 
                  onSelect={setTicker} 
                  onChange={setTicker} 
                />
              </div>

              {/* Strategy Select */}
              <div className="space-y-3">
                <Label className="text-xs font-black text-slate-500 uppercase tracking-widest">交易策略</Label>
                <div className="grid grid-cols-1 gap-2">
                  {STRATEGIES.map(s => (
                    <button
                      key={s.id}
                      onClick={() => setStrategy(s.id)}
                      className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all border ${
                        strategy === s.id 
                        ? "bg-slate-900 text-white border-slate-900 shadow-md" 
                        : "bg-slate-50 text-slate-600 border-slate-100 hover:bg-slate-100"
                      }`}
                    >
                      {s.name}
                      {strategy === s.id && <Zap size={14} className="text-amber-400 fill-amber-400" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Strategy Params */}
              <div className="space-y-5 pt-6 border-t border-slate-50">
                <Label className="text-xs font-black text-slate-500 uppercase tracking-widest">策略參數</Label>
                {selectedStrategy.params.map(p => (
                  <div key={p.key} className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-600">{p.label}</span>
                      <span className="text-xs font-black text-teal-600 bg-teal-50 px-2 py-0.5 rounded-md">{params[p.key] || p.default}</span>
                    </div>
                    <input
                      type="range"
                      min={p.min}
                      max={p.max}
                      step={p.step}
                      value={params[p.key] || p.default}
                      onChange={e => setParams(prev => ({ ...prev, [p.key]: Number(e.target.value) }))}
                      className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-teal-600"
                    />
                  </div>
                ))}
              </div>

              {/* Settings */}
              <div className="space-y-5 pt-6 border-t border-slate-50">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-400 uppercase">幣別</Label>
                    <select
                      value={currency}
                      onChange={e => setCurrency(e.target.value)}
                      className="w-full h-10 rounded-xl border border-slate-100 bg-slate-50 px-3 text-xs font-bold text-slate-700 focus:outline-none"
                    >
                      <option value="HKD">HKD</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-400 uppercase">初始資金</Label>
                    <Input
                      type="number"
                      value={initialCapital}
                      onChange={e => setInitialCapital(Number(e.target.value))}
                      className="h-10 rounded-xl bg-slate-50 border-slate-100 font-bold text-xs"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-400 uppercase">開始日期</Label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                      className="h-10 rounded-xl bg-slate-50 border-slate-100 font-bold text-[10px]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-400 uppercase">結束日期</Label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={e => setEndDate(e.target.value)}
                      className="h-10 rounded-xl bg-slate-50 border-slate-100 font-bold text-[10px]"
                    />
                  </div>
                </div>

                {/* 定期定額 */}
                <div className="space-y-3 pt-4 border-t border-slate-50">
                  <Label className="text-[10px] font-black text-slate-400 uppercase">定期定額投入</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      type="number"
                      placeholder="金額"
                      value={contributeAmount || ""}
                      onChange={e => setContributeAmount(Number(e.target.value) || 0)}
                      className="h-9 rounded-lg bg-slate-50 border-slate-100 font-bold text-xs"
                    />
                    <select
                      value={contributePeriod}
                      onChange={e => setContributePeriod(e.target.value)}
                      className="h-9 rounded-lg border border-slate-100 bg-slate-50 px-2 text-xs font-bold text-slate-700"
                    >
                      <option value="none">無</option>
                      <option value="weekly">每週</option>
                      <option value="monthly">每月</option>
                      <option value="quarterly">每季</option>
                    </select>
                  </div>
                </div>

                {/* 定期提領 */}
                <div className="space-y-3 pt-3">
                  <Label className="text-[10px] font-black text-slate-400 uppercase">定期提領</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      type="number"
                      placeholder="金額"
                      value={redrawAmount || ""}
                      onChange={e => setRedrawAmount(Number(e.target.value) || 0)}
                      className="h-9 rounded-lg bg-slate-50 border-slate-100 font-bold text-xs"
                    />
                    <select
                      value={redrawPeriod}
                      onChange={e => setRedrawPeriod(e.target.value)}
                      className="h-9 rounded-lg border border-slate-100 bg-slate-50 px-2 text-xs font-bold text-slate-700"
                    >
                      <option value="none">無</option>
                      <option value="weekly">每週</option>
                      <option value="monthly">每月</option>
                      <option value="quarterly">每季</option>
                    </select>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleRun}
                disabled={runMutation.isPending}
                className="w-full h-12 bg-teal-600 hover:bg-teal-700 text-white font-black rounded-xl transition-all shadow-md"
              >
                {runMutation.isPending ? "運算中..." : "執行回測"}
              </Button>
            </div>
          </div>

          {/* ─── Right Panel: Results ─── */}
          <div className="lg:col-span-8 space-y-6">
            <Tabs defaultValue="backtest" className="w-full">
              <TabsList className="bg-white border border-slate-100 rounded-xl p-1 mb-6 h-auto">
                <TabsTrigger 
                  value="backtest" 
                  className="rounded-lg px-6 py-2.5 text-xs font-black uppercase tracking-widest data-[state=active]:bg-slate-900 data-[state=active]:text-white"
                >
                  <BarChart3 size={14} className="mr-2" />
                  策略回測
                </TabsTrigger>
                <TabsTrigger 
                  value="comparison" 
                  className="rounded-lg px-6 py-2.5 text-xs font-black uppercase tracking-widest data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                >
                  <TrendingUp size={14} className="mr-2" />
                  對比分析
                </TabsTrigger>
                <TabsTrigger 
                  value="diagnosis" 
                  className="rounded-lg px-6 py-2.5 text-xs font-black uppercase tracking-widest data-[state=active]:bg-teal-600 data-[state=active]:text-white"
                >
                  <BrainCircuit size={14} className="mr-2" />
                  AI 深度診斷
                </TabsTrigger>
              </TabsList>

              <TabsContent value="backtest" className="space-y-6 mt-0">
                {!result && !runMutation.isPending && (
                  <div className="bg-white rounded-3xl border border-slate-100 p-20 text-center shadow-sm">
                    <div className="w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center bg-slate-50 text-slate-300">
                      <BarChart3 size={32} />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 mb-2">等待數據輸入</h3>
                    <p className="text-slate-400 text-xs font-medium">請在左側面板設定您的策略參數，系統將即時生成績效報告。</p>
                  </div>
                )}

                {runMutation.isPending && (
                  <div className="bg-white rounded-3xl border border-slate-100 p-20 text-center shadow-sm">
                    <div className="w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center bg-teal-50 text-teal-600 animate-pulse">
                      <Activity size={32} />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 mb-2">正在處理大數據</h3>
                    <p className="text-slate-400 text-xs font-medium">獲取歷史 K 線數據並模擬交易信號...</p>
                  </div>
                )}

                {result && (
                  <div className="space-y-6 animate-in fade-in duration-700">
                {/* Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <MetricCard
                    label="年化報酬率"
                    value={result.annualizedReturn}
                    format="percent"
                    icon={TrendingUp}
                    description="平均年度複利回報"
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
                    description="風險回報比"
                  />
                  <MetricCard
                    label="勝率"
                    value={result.winRate}
                    format="percent"
                    icon={Zap}
                    description="獲利交易佔比"
                  />
                </div>

                {/* Equity Curve */}
                <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">資產增長曲線</h3>
                    <span className="text-[10px] font-bold text-slate-400">{result.ticker} · {currency}</span>
                  </div>
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={result.equityCurve}>
                      <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0d9488" stopOpacity={0.15}/>
                          <stop offset="95%" stopColor="#0d9488" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                      <XAxis dataKey="date" hide />
                      <YAxis hide domain={['auto', 'auto']} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontSize: '12px' }}
                        formatter={(val: number) => [`${currency} ${val.toFixed(2)}`, '淨值']}
                      />
                      <Area type="monotone" dataKey="value" name="AI 策略" stroke="#0d9488" strokeWidth={2} fillOpacity={1} fill="url(#colorValue)" />
                      {result.buyAndHoldCurve && (
                        <Area type="monotone" dataKey="buyHoldValue" name="買入持有" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" fill="none" />
                      )}
                    </AreaChart>
                  </ResponsiveContainer>
                  {result.buyAndHoldCurve && (
                    <div className="mt-4 flex items-center justify-center gap-6">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-teal-600" />
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">AI 策略績效</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-slate-400" />
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">單純買入持有 (基準)</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* TradingView */}
                <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">市場圖表回顧</h3>
                  <TradingViewWidget ticker={result.ticker} />
                </div>

                {/* Trade Details */}
                {result.trades && result.trades.length > 0 && (
                  <TradeDetailsPanel 
                    trades={result.trades} 
                    initialCapital={initialCapital}
                    currency={currency}
                  />
                )}
              </div>
              )}
              </TabsContent>

              <TabsContent value="comparison" className="mt-0">
                {result && <StockComparisonPanel data={result} />}
              </TabsContent>

              <TabsContent value="diagnosis" className="mt-0">
                <AiDiagnosisPanel ticker={ticker} />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}

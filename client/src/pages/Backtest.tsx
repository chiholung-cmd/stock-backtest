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
import { EnhancedEquityChart } from "@/components/EnhancedEquityChart";
import { toast } from "sonner";
import {
  BarChart3, TrendingUp, TrendingDown, Zap, Activity,
  Play, Save, ArrowLeft, Info, Globe, Calculator, BrainCircuit,
  Plus, X, AlertCircle, Loader2
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "wouter";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ComposedChart, Bar
} from "recharts";

type Strategy = "ma_crossover" | "rsi" | "macd" | "bollinger_bands" | "bb_breakout" | "macd_divergence" | "dual_rsi";
type Mode = "single" | "portfolio";

interface PortfolioAsset {
  ticker: string;
  weight: number;
}

interface BacktestResult {
  ticker?: string;
  portfolio?: PortfolioAsset[];
  strategy: string;
  strategyParams: Record<string, number>;
  startDate: string;
  endDate: string;
  annualizedReturn: number;
  maxDrawdown: number;
  sharpeRatio: number;
  winRate: number;
  totalTrades: number;
  totalProfit: number;
  averageProfit: number;
  finalAsset: number;
  equityCurve: { date: string; value: number }[];
  buyAndHoldCurve?: { date: string; value: number }[];
  trades: { date: string; action: string; price: number; amount: number; pnl: number | null; balance: number }[];
  rebalancePeriod?: string;
  rebalanceEvents?: any[];
  assetPerformance?: {
    ticker: string;
    weight: number;
    totalReturn: number;
    annualizedReturn: number;
    maxDrawdown: number;
    sharpeRatio: number;
  }[];
}

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
  {
    id: "bb_breakout" as Strategy,
    name: "布林帶突破",
    description: "價格突破上軌買入，突破下軌賣出（反向操作）",
    color: "#ec4899",
    params: [
      { key: "period", label: "均線週期", min: 5, max: 100, default: 20, step: 1 },
      { key: "stdDev", label: "標準差倍數", min: 0.5, max: 4, default: 2, step: 0.1 },
      { key: "threshold", label: "突破幅度 (%)", min: 0.1, max: 5, default: 1, step: 0.1 },
    ],
  },
  {
    id: "macd_divergence" as Strategy,
    name: "MACD 背離",
    description: "偵測 MACD 與價格的背離，進行反向交易",
    color: "#06b6d4",
    params: [
      { key: "fastPeriod", label: "快線週期 (EMA)", min: 2, max: 50, default: 12, step: 1 },
      { key: "slowPeriod", label: "慢線週期 (EMA)", min: 5, max: 100, default: 26, step: 1 },
      { key: "signalPeriod", label: "信號線週期", min: 2, max: 30, default: 9, step: 1 },
    ],
  },
  {
    id: "dual_rsi" as Strategy,
    name: "雙 RSI",
    description: "使用兩個不同週期的 RSI 進行多層次確認",
    color: "#14b8a6",
    params: [
      { key: "fastPeriod", label: "快速 RSI 週期", min: 2, max: 30, default: 7, step: 1 },
      { key: "slowPeriod", label: "慢速 RSI 週期", min: 10, max: 50, default: 21, step: 1 },
      { key: "oversold", label: "超賣閾值", min: 10, max: 45, default: 30, step: 1 },
      { key: "overbought", label: "超買閾值", min: 55, max: 90, default: 70, step: 1 },
    ],
  },
];

function MetricCard({
  label,
  value,
  format,
  icon: Icon,
  description,
}: {
  label: string;
  value: number | null | undefined;
  format: (v: number) => string;
  icon: any;
  description?: string;
}) {
  const isPositive = value !== null && value !== undefined && value >= 0;
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} className={isPositive ? "text-teal-600" : "text-rose-600"} />
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
      </div>
      <div className="text-2xl font-black text-slate-900">
        {value !== null && value !== undefined ? format(value) : "—"}
      </div>
      {description && <p className="text-[10px] text-slate-400 mt-1">{description}</p>}
    </div>
  );
}

function TradingViewWidget({ ticker }: { ticker: string }) {
  const symbol = ticker.includes(":") ? ticker : ticker.includes(".HK") ? `HKEX:${ticker.replace(".HK", "")}` : `NASDAQ:${ticker}`;
  return (
    <div className="h-96 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center">
      <div className="text-center">
        <BarChart3 size={32} className="mx-auto text-slate-300 mb-2" />
        <p className="text-sm text-slate-400">TradingView Chart - {symbol}</p>
      </div>
    </div>
  );
}

function PortfolioAssetInput({
  asset,
  index,
  onUpdate,
  onRemove,
}: {
  asset: PortfolioAsset;
  index: number;
  onUpdate: (index: number, asset: PortfolioAsset) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="flex gap-3 items-end">
      <div className="flex-1">
        <Label className="text-[10px] font-bold text-slate-500 mb-1 block">股票代碼</Label>
        <StockSearchInput
          value={asset.ticker}
          onSelect={(ticker) => onUpdate(index, { ...asset, ticker })}
          onChange={(ticker) => onUpdate(index, { ...asset, ticker })}
        />
      </div>
      <div className="w-20">
        <Label className="text-[10px] font-bold text-slate-500 mb-1 block">權重 %</Label>
        <Input
          type="number"
          min="0"
          max="100"
          step="0.1"
          value={asset.weight}
          onChange={(e) => onUpdate(index, { ...asset, weight: Number(e.target.value) })}
          className="h-9 rounded-lg bg-slate-50 border-slate-100 font-bold text-xs text-right"
        />
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onRemove(index)}
        className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 h-9 w-9 p-0"
      >
        <X size={16} />
      </Button>
    </div>
  );
}

export default function Backtest() {
  const { user } = useAuth();
  const backtestMutation = trpc.backtest.run.useMutation();
  const saveMutation = trpc.backtest.save.useMutation();

  const [mode, setMode] = useState<Mode>("single");
  const [ticker, setTicker] = useState("AAPL");
  const [portfolio, setPortfolio] = useState<PortfolioAsset[]>([
    { ticker: "AAPL", weight: 50 },
    { ticker: "MSFT", weight: 50 },
  ]);

  const [strategy, setStrategy] = useState<Strategy>("ma_crossover");
  const [params, setParams] = useState<Record<string, number>>({
    shortPeriod: 10,
    longPeriod: 30,
  });

  const [currency, setCurrency] = useState("USD");
  const [initialCapital, setInitialCapital] = useState(10000);
  const [startDate, setStartDate] = useState("2023-01-01");
  const [endDate, setEndDate] = useState("2024-01-01");
  const [timeframe, setTimeframe] = useState<"1d" | "1wk" | "1mo">("1d");
  const [rebalancePeriod, setRebalancePeriod] = useState<"none" | "quarterly" | "semi-annual" | "annual">("none");

  // DCA (定期定額投資) 設置
  const [dcaEnabled, setDcaEnabled] = useState(false);
  const [dcaAmount, setDcaAmount] = useState(1000);
  const [dcaPeriod, setDcaPeriod] = useState<"monthly" | "quarterly" | "semi-annual" | "annual">("monthly");

  const [result, setResult] = useState<BacktestResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isPlanning, setIsPlanning] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(null);

  const generatePlanMutation = trpc.ai.goalPlanning.generatePlan.useMutation();
  const optimizeMutation = trpc.ai.strategyOptimization.optimizeWithGA.useMutation();
  const optimizePortfolioMutation = trpc.ai.portfolioOptimization.optimizeWeights.useMutation();
  const createShareLinkMutation = trpc.ai.sharing.createShareLink.useMutation();

  const selectedStrategy = STRATEGIES.find(s => s.id === strategy);

  const handleGoalPlan = async () => {
    setIsPlanning(true);
    try {
      const plans = await generatePlanMutation.mutateAsync({
        targetAnnualReturn: 0.15,
        monthlyContribution: 5000,
        investmentPeriod: 5,
        initialCapital,
        riskTolerance: "moderate",
        startDate,
        endDate,
      });
      if (plans && plans.length > 0) {
        const best = plans[0];
        if (best.portfolioComposition) {
          setMode("portfolio");
          setPortfolio(best.portfolioComposition.map((a) => ({ ticker: a.ticker, weight: a.weight * 100 })));
        }
        setStrategy(best.strategy.id as Strategy);
        setParams(best.strategy.params);
        toast.success("已根據您的目標自動配置最佳方案！");
      }
    } catch (e) {
      toast.error("規劃失敗");
    } finally {
      setIsPlanning(false);
    }
  };

  const handleOptimizeParams = async () => {
    setIsOptimizing(true);
    try {
      const paramRanges: Record<string, [number, number]> = {};
      selectedStrategy?.params.forEach(p => {
        paramRanges[p.key] = [p.min, p.max];
      });

      const bestParams = await optimizeMutation.mutateAsync({
        ticker,
        strategy,
        paramRanges,
        startDate,
        endDate,
      });
      setParams(bestParams);
      toast.success("策略參數已自動優化！");
    } catch (e) {
      toast.error("優化失敗");
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleOptimizePortfolio = async () => {
    setIsOptimizing(true);
    try {
      const tickers = portfolio.map(p => p.ticker);
      const expectedReturns: Record<string, number> = {};
      const volatilities: Record<string, number> = {};
      const correlation: Record<string, Record<string, number>> = {};
      
      tickers.forEach(t => {
        expectedReturns[t] = 0.12; 
        volatilities[t] = 0.2;
        correlation[t] = {};
        tickers.forEach(t2 => {
          correlation[t][t2] = t === t2 ? 1 : 0.5;
        });
      });

      const bestWeights = await optimizePortfolioMutation.mutateAsync({
        tickers,
        expectedReturns,
        volatilities,
        correlation
      });
      
      setPortfolio(portfolio.map(p => ({
        ...p,
        weight: (bestWeights[p.ticker] || 0) * 100
      })));
      toast.success("投資組合權重已優化！");
    } catch (e) {
      toast.error("組合優化失敗");
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleShare = async () => {
    if (!result) return;
    try {
      const share = await createShareLinkMutation.mutateAsync({
        backtestId: 0,
        isPublic: true
      });
      setShareToken(share.token);
      const url = `${window.location.origin}/share/${share.token}`;
      navigator.clipboard.writeText(url);
      toast.success("分享連結已複製到剪貼板！");
    } catch (e) {
      toast.error("分享失敗");
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tickerParam = params.get("ticker");
    const strategyParam = params.get("strategy");
    const autoRunParam = params.get("autoRun");
    const paramsParam = params.get("params");

    if (tickerParam) setTicker(tickerParam);
    if (strategyParam && STRATEGIES.find(s => s.id === strategyParam)) {
      setStrategy(strategyParam as Strategy);
    }
    if (paramsParam) {
      try {
        const parsedParams = JSON.parse(decodeURIComponent(paramsParam));
        setParams(parsedParams);
      } catch (e) {
        console.error("Failed to parse params", e);
      }
    }

    // 如果 autoRun=true，自動執行回測
    if (autoRunParam === "true") {
      setTimeout(() => {
        handleRun();
      }, 500);
    }
  }, []);

  const handleRun = async () => {
    try {
      setLoading(true);

      const input = mode === "single"
        ? {
            ticker,
            strategy,
            params,
            startDate,
            endDate,
            timeframe,
            initialCapital,
            contributeAmount: 0,
            contributePeriod: "none" as const,
            redrawAmount: 0,
            redrawPeriod: "none" as const,
            rebalancePeriod: "none" as const,
          }
        : {
            portfolio,
            strategy,
            params,
            startDate,
            endDate,
            timeframe,
            initialCapital,
            contributeAmount: 0,
            contributePeriod: "none" as const,
            redrawAmount: 0,
            redrawPeriod: "none" as const,
            rebalancePeriod,
          };

      const result = await backtestMutation.mutateAsync(input as any);
      setResult(result);
      toast.success("回測完成！");
    } catch (error) {
      console.error("Backtest error:", error);
      toast.error("回測失敗，請檢查參數");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!result || !user) {
      toast.error("請先執行回測或登入");
      return;
    }

    try {
      await saveMutation.mutateAsync({
        ticker: mode === "single" ? ticker : "",
        strategy,
        strategyParams: params,
        startDate,
        endDate,
        annualizedReturn: result.annualizedReturn,
        maxDrawdown: result.maxDrawdown,
        sharpeRatio: result.sharpeRatio,
        winRate: result.winRate,
        totalTrades: result.totalTrades,
        equityCurve: result.equityCurve,
        trades: result.trades,
      });
      toast.success("回測結果已保存");
    } catch (error) {
      toast.error("保存失敗");
    }
  };

  const portfolioWeightSum = portfolio.reduce((sum, a) => sum + a.weight, 0);
  const isPortfolioValid = Math.abs(portfolioWeightSum - 100) < 0.01;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="rounded-xl">
                <ArrowLeft size={16} className="mr-2" />
                返回
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-black text-slate-900">量化回測引擎</h1>
              <p className="text-sm text-slate-500 mt-1">支持單標的與投資組合策略回測</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleGoalPlan}
              disabled={isPlanning}
              variant="outline"
              className="rounded-xl border-teal-200 text-teal-700 hover:bg-teal-50"
              size="sm"
            >
              {isPlanning ? <Loader2 size={14} className="mr-2 animate-spin" /> : <BrainCircuit size={14} className="mr-2" />}
              智能目標規劃
            </Button>
            {result && (
              <div className="flex gap-2">
                <Button
                  onClick={handleShare}
                  variant="outline"
                  className="rounded-xl border-blue-200 text-blue-700 hover:bg-blue-50"
                  size="sm"
                >
                  <Globe size={14} className="mr-2" />
                  分享結果
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={!user}
                  className="rounded-xl bg-teal-600 hover:bg-teal-700"
                  size="sm"
                >
                  <Save size={14} className="mr-2" />
                  保存結果
                </Button>
              </div>
            )}
          </div>
        </div>

          <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm flex items-center justify-between">
          <div className="flex gap-2">
            <Button
              variant={mode === "single" ? "default" : "outline"}
              onClick={() => setMode("single")}
              className="rounded-lg"
            >
              單標的回測
            </Button>
            <Button
              variant={mode === "portfolio" ? "default" : "outline"}
              onClick={() => setMode("portfolio")}
              className="rounded-lg"
            >
              投資組合回測
            </Button>
          </div>
          {mode === "portfolio" && (
            <Button
              onClick={handleOptimizePortfolio}
              disabled={isOptimizing || portfolio.length < 2}
              variant="outline"
              className="rounded-lg border-indigo-200 text-indigo-700 hover:bg-indigo-50"
              size="sm"
            >
              {isOptimizing ? <Loader2 size={14} className="mr-2 animate-spin" /> : <TrendingUp size={14} className="mr-2" />}
              優化組合權重
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm space-y-8">
              {mode === "single" ? (
                <div className="space-y-3">
                  <Label className="text-xs font-black text-slate-500 uppercase tracking-widest">股票標的</Label>
                  <StockSearchInput 
                    value={ticker} 
                    onSelect={setTicker} 
                    onChange={setTicker} 
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-black text-slate-500 uppercase tracking-widest">投資組合</Label>
                    <span className={`text-xs font-bold px-2 py-1 rounded ${isPortfolioValid ? "bg-teal-50 text-teal-700" : "bg-rose-50 text-rose-700"}`}>
                      {portfolioWeightSum.toFixed(1)}%
                    </span>
                  </div>
                  <div className="space-y-3">
                    {portfolio.map((asset, idx) => (
                      <PortfolioAssetInput
                        key={idx}
                        asset={asset}
                        index={idx}
                        onUpdate={(i, a) => {
                          const newPortfolio = [...portfolio];
                          newPortfolio[i] = a;
                          setPortfolio(newPortfolio);
                        }}
                        onRemove={(i) => {
                          setPortfolio(portfolio.filter((_, idx) => idx !== i));
                        }}
                      />
                    ))}
                  </div>
                  {portfolio.length < 10 && (
                    <Button
                      variant="outline"
                      onClick={() => setPortfolio([...portfolio, { ticker: "", weight: 0 }])}
                      className="w-full rounded-lg"
                      size="sm"
                    >
                      <Plus size={14} className="mr-2" />
                      添加標的
                    </Button>
                  )}
                  {!isPortfolioValid && (
                    <div className="flex gap-2 p-3 bg-rose-50 rounded-lg border border-rose-100">
                      <AlertCircle size={14} className="text-rose-600 shrink-0 mt-0.5" />
                      <p className="text-xs text-rose-700">權重必須總和為 100%</p>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-3 pt-6 border-t border-slate-50">
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

              <div className="space-y-5 pt-6 border-t border-slate-50">
                <Label className="text-xs font-black text-slate-500 uppercase tracking-widest">策略參數</Label>
                {selectedStrategy?.params.map(p => (
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
                
                <Button
                  onClick={handleOptimizeParams}
                  disabled={isOptimizing}
                  variant="outline"
                  className="w-full rounded-xl border-amber-200 text-amber-700 hover:bg-amber-50 mt-4"
                  size="sm"
                >
                  {isOptimizing ? <Loader2 size={14} className="mr-2 animate-spin" /> : <Zap size={14} className="mr-2" />}
                  自動優化參數
                </Button>
              </div>

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

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-400 uppercase">時間框架</Label>
                    <select
                      value={timeframe}
                      onChange={e => setTimeframe(e.target.value as any)}
                      className="w-full h-10 rounded-xl border border-slate-100 bg-slate-50 px-3 text-xs font-bold text-slate-700 focus:outline-none"
                    >
                      <option value="1d">每日</option>
                      <option value="1wk">每週</option>
                      <option value="1mo">每月</option>
                    </select>
                  </div>
                  {mode === "portfolio" && (
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black text-slate-400 uppercase">再平衡頻率</Label>
                      <select
                        value={rebalancePeriod}
                        onChange={e => setRebalancePeriod(e.target.value as any)}
                        className="w-full h-10 rounded-xl border border-slate-100 bg-slate-50 px-3 text-xs font-bold text-slate-700 focus:outline-none"
                      >
                        <option value="none">無</option>
                        <option value="quarterly">季度</option>
                        <option value="semi-annual">半年</option>
                        <option value="annual">年度</option>
                      </select>
                    </div>
                  )}
                  
                  {/* DCA 定期定額投資 */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="dca-toggle"
                        checked={dcaEnabled}
                        onChange={e => setDcaEnabled(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 cursor-pointer"
                      />
                      <Label htmlFor="dca-toggle" className="text-[10px] font-black text-slate-400 uppercase cursor-pointer">啟用定期定額投資 (DCA)</Label>
                    </div>
                    {dcaEnabled && (
                      <div className="space-y-2 bg-slate-50 p-3 rounded-lg">
                        <div>
                          <Label className="text-[10px] font-bold text-slate-600">投入金額 ($)</Label>
                          <Input
                            type="number"
                            value={dcaAmount}
                            onChange={e => setDcaAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                            min="0"
                            step="100"
                            className="h-8 text-xs"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] font-bold text-slate-600">投入頻率</Label>
                          <select
                            value={dcaPeriod}
                            onChange={e => setDcaPeriod(e.target.value as any)}
                            className="w-full h-8 rounded-lg border border-slate-100 bg-white px-2 text-xs font-bold text-slate-700 focus:outline-none"
                          >
                            <option value="monthly">每月</option>
                            <option value="quarterly">每季度</option>
                            <option value="semi-annual">每半年</option>
                            <option value="annual">每年</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <Button
                onClick={handleRun}
                disabled={loading || (mode === "portfolio" && !isPortfolioValid)}
                className="w-full rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold h-12"
                size="lg"
              >
                {loading ? (
                  <>
                    <Activity size={16} className="mr-2 animate-spin" />
                    回測中...
                  </>
                ) : (
                  <>
                    <Play size={16} className="mr-2" />
                    開始回測
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="lg:col-span-8 space-y-6">
            {!result ? (
              <div className="bg-white rounded-3xl border border-slate-100 p-12 shadow-sm text-center">
                <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-4">
                  <Calculator size={32} className="text-slate-200" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">尚未執行回測</h3>
                <p className="text-sm text-slate-500">配置策略參數後點擊「開始回測」按鈕</p>
              </div>
            ) : (
              <Tabs defaultValue="overview" className="space-y-4">
                <TabsList className="grid w-full grid-cols-4 rounded-xl bg-slate-100 p-1">
                  <TabsTrigger value="overview" className="rounded-lg">概覽</TabsTrigger>
                  <TabsTrigger value="chart" className="rounded-lg">圖表</TabsTrigger>
                  {mode === "portfolio" && <TabsTrigger value="assets" className="rounded-lg">資產</TabsTrigger>}
                  {mode === "portfolio" && <TabsTrigger value="rebalance" className="rounded-lg">再平衡</TabsTrigger>}
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <MetricCard
                      label="年化報酬率"
                      value={result.annualizedReturn}
                      format={(v) => `${(v * 100).toFixed(2)}%`}
                      icon={TrendingUp}
                    />
                    <MetricCard
                      label="最大回撤"
                      value={result.maxDrawdown}
                      format={(v) => `${(v * 100).toFixed(2)}%`}
                      icon={TrendingDown}
                    />
                    <MetricCard
                      label="夏普比率"
                      value={result.sharpeRatio}
                      format={(v) => v.toFixed(2)}
                      icon={BarChart3}
                    />
                    <MetricCard
                      label="勝率"
                      value={result.winRate}
                      format={(v) => `${(v * 100).toFixed(1)}%`}
                      icon={Activity}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
                      <p className="text-[10px] font-black text-slate-400 uppercase mb-1">總交易次數</p>
                      <p className="text-2xl font-black text-slate-900">{result.totalTrades}</p>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
                      <p className="text-[10px] font-black text-slate-400 uppercase mb-1">最終資產</p>
                      <p className="text-2xl font-black text-teal-600">{currency} {result.finalAsset.toFixed(2)}</p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="chart" className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">資產增長曲線</h3>
                  <EnhancedEquityChart data={result.equityCurve} trades={result.trades} currency={currency} />
                </TabsContent>

                {mode === "portfolio" && result.assetPerformance && (
                  <TabsContent value="assets" className="space-y-4">
                    {result.assetPerformance.map((asset) => (
                      <div key={asset.ticker} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <p className="font-black text-slate-900">{asset.ticker}</p>
                            <p className="text-xs text-slate-500">權重: {asset.weight}%</p>
                          </div>
                          <div className="text-right">
                            <p className={`font-black ${asset.totalReturn >= 0 ? "text-teal-600" : "text-rose-600"}`}>
                              {(asset.totalReturn * 100).toFixed(2)}%
                            </p>
                            <p className="text-xs text-slate-500">總報酬</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="bg-slate-50 rounded-lg p-2">
                            <p className="text-[10px] text-slate-500 font-bold">年化報酬</p>
                            <p className="text-sm font-black text-slate-900">{(asset.annualizedReturn * 100).toFixed(2)}%</p>
                          </div>
                          <div className="bg-slate-50 rounded-lg p-2">
                            <p className="text-[10px] text-slate-500 font-bold">最大回撤</p>
                            <p className="text-sm font-black text-rose-600">{(asset.maxDrawdown * 100).toFixed(2)}%</p>
                          </div>
                          <div className="bg-slate-50 rounded-lg p-2">
                            <p className="text-[10px] text-slate-500 font-bold">夏普比率</p>
                            <p className="text-sm font-black text-slate-900">{asset.sharpeRatio.toFixed(2)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </TabsContent>
                )}

                {mode === "portfolio" && result.rebalanceEvents && (
                  <TabsContent value="rebalance" className="space-y-4">
                    {result.rebalanceEvents.length === 0 ? (
                      <div className="bg-slate-50 rounded-2xl border border-slate-100 p-8 text-center">
                        <p className="text-sm text-slate-500">未設置再平衡，或無再平衡事件</p>
                      </div>
                    ) : (
                      result.rebalanceEvents.map((event, idx) => (
                        <div key={idx} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
                          <p className="font-bold text-slate-900 mb-3">{event.date}</p>
                          <div className="space-y-2">
                            {event.details.map((detail: any, didx: number) => (
                              <div key={didx} className="flex items-center justify-between text-sm">
                                <span className="text-slate-600">{detail.ticker}</span>
                                <span className="font-bold text-slate-900">{detail.targetWeight}% → {detail.actualWeight}%</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </TabsContent>
                )}
              </Tabs>
            )}

            {result && (
              <TradeDetailsPanel trades={result.trades} currency={currency} initialCapital={initialCapital} />
            )}

            {result && (
              <AiDiagnosisPanel 
                ticker={mode === "single" ? ticker : undefined} 
                portfolioData={mode === "portfolio" ? {
                  assets: result.portfolio,
                  performance: {
                    annualizedReturn: result.annualizedReturn,
                    maxDrawdown: result.maxDrawdown,
                    sharpeRatio: result.sharpeRatio
                  }
                } : undefined}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

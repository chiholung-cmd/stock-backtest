import { useState } from "react";
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Activity,
  Zap,
  Target
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ComposedChart
} from "recharts";

interface ComparisonData {
  equityCurve: { date: string; value: number }[];
  buyAndHoldCurve?: { date: string; value: number }[];
  annualizedReturn: number;
  maxDrawdown: number;
  sharpeRatio: number;
  winRate: number;
}

export function StockComparisonPanel({ data }: { data: ComparisonData }) {
  const [comparisonType, setComparisonType] = useState<"equity" | "returns" | "metrics">("equity");

  // 計算買入持有的績效指標
  const calculateBuyHoldMetrics = () => {
    if (!data.buyAndHoldCurve || data.buyAndHoldCurve.length < 2) {
      return { return: 0, maxDD: 0, sharpe: 0 };
    }

    const first = data.buyAndHoldCurve[0].value;
    const last = data.buyAndHoldCurve[data.buyAndHoldCurve.length - 1].value;
    const totalReturn = (last - first) / first;

    // 簡化計算
    let maxEquity = -Infinity;
    let maxDD = 0;
    for (const point of data.buyAndHoldCurve) {
      if (point.value > maxEquity) maxEquity = point.value;
      const dd = (maxEquity - point.value) / maxEquity;
      if (dd > maxDD) maxDD = dd;
    }

    return {
      return: totalReturn,
      maxDD,
      sharpe: 0 // 簡化，實際應計算
    };
  };

  const buyHoldMetrics = calculateBuyHoldMetrics();

  // 合併數據用於對比圖表
  const mergedData = data.equityCurve.map((point, idx) => ({
    date: point.date,
    aiStrategy: point.value,
    buyHold: data.buyAndHoldCurve?.[idx]?.value || 0
  }));

  // 計算日收益率對比
  const returnsData = mergedData.slice(1).map((point, idx) => {
    const prevPoint = mergedData[idx];
    const aiReturn = ((point.aiStrategy - prevPoint.aiStrategy) / prevPoint.aiStrategy) * 100;
    const bhReturn = ((point.buyHold - prevPoint.buyHold) / prevPoint.buyHold) * 100;
    return {
      date: point.date,
      aiReturn,
      bhReturn
    };
  });

  return (
    <div className="space-y-6">
      {/* 對比類型選擇 */}
      <div className="flex gap-2 bg-white rounded-xl border border-slate-100 p-2">
        <Button
          variant={comparisonType === "equity" ? "default" : "ghost"}
          size="sm"
          onClick={() => setComparisonType("equity")}
          className="rounded-lg text-xs font-bold"
        >
          <BarChart3 size={14} className="mr-2" />
          資產對比
        </Button>
        <Button
          variant={comparisonType === "returns" ? "default" : "ghost"}
          size="sm"
          onClick={() => setComparisonType("returns")}
          className="rounded-lg text-xs font-bold"
        >
          <TrendingUp size={14} className="mr-2" />
          收益率對比
        </Button>
        <Button
          variant={comparisonType === "metrics" ? "default" : "ghost"}
          size="sm"
          onClick={() => setComparisonType("metrics")}
          className="rounded-lg text-xs font-bold"
        >
          <Activity size={14} className="mr-2" />
          指標對比
        </Button>
      </div>

      {/* 資產對比圖 */}
      {comparisonType === "equity" && (
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6">資產增長曲線對比</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={mergedData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
              <XAxis dataKey="date" hide />
              <YAxis hide domain={['auto', 'auto']} />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontSize: '12px' }}
              />
              <Legend />
              <Line type="monotone" dataKey="aiStrategy" name="AI 策略" stroke="#0d9488" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="buyHold" name="買入持有" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* 收益率對比圖 */}
      {comparisonType === "returns" && (
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6">日收益率對比 (%)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={returnsData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
              <XAxis dataKey="date" hide />
              <YAxis hide />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontSize: '12px' }}
              />
              <Legend />
              <Bar dataKey="aiReturn" name="AI 策略" fill="#0d9488" opacity={0.7} />
              <Bar dataKey="bhReturn" name="買入持有" fill="#94a3b8" opacity={0.7} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* 指標對比表 */}
      {comparisonType === "metrics" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* AI 策略指標 */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-3 h-3 rounded-full bg-teal-600" />
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">AI 策略績效</h3>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-slate-50">
                <span className="text-xs font-bold text-slate-500">年化報酬率</span>
                <span className="text-lg font-black text-teal-600">{(data.annualizedReturn * 100).toFixed(2)}%</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-slate-50">
                <span className="text-xs font-bold text-slate-500">最大回撤</span>
                <span className="text-lg font-black text-rose-600">{(data.maxDrawdown * 100).toFixed(2)}%</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-slate-50">
                <span className="text-xs font-bold text-slate-500">夏普比率</span>
                <span className="text-lg font-black text-slate-900">{data.sharpeRatio.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-500">勝率</span>
                <span className="text-lg font-black text-slate-900">{(data.winRate * 100).toFixed(2)}%</span>
              </div>
            </div>
          </div>

          {/* 買入持有指標 */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-3 h-3 rounded-full bg-slate-400" />
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">買入持有績效</h3>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-slate-50">
                <span className="text-xs font-bold text-slate-500">總收益率</span>
                <span className="text-lg font-black text-slate-600">{(buyHoldMetrics.return * 100).toFixed(2)}%</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-slate-50">
                <span className="text-xs font-bold text-slate-500">最大回撤</span>
                <span className="text-lg font-black text-rose-600">{(buyHoldMetrics.maxDD * 100).toFixed(2)}%</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-slate-50">
                <span className="text-xs font-bold text-slate-500">風險調整收益</span>
                <span className="text-lg font-black text-slate-900">—</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-500">超額收益</span>
                <span className={`text-lg font-black ${(data.annualizedReturn - buyHoldMetrics.return) > 0 ? 'text-teal-600' : 'text-rose-600'}`}>
                  {((data.annualizedReturn - buyHoldMetrics.return) * 100).toFixed(2)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { 
  Lightbulb, 
  Loader2, 
  Zap,
  TrendingUp
} from "lucide-react";
import { toast } from "sonner";

interface StrategyRecommendationPanelProps {
  onStrategySelected?: (strategy: any) => void;
}

export function StrategyRecommendationPanel({ onStrategySelected }: StrategyRecommendationPanelProps) {
  const [marketCondition, setMarketCondition] = useState("當前市場處於上升趨勢，但波動性增加");
  const [riskTolerance, setRiskTolerance] = useState<"low" | "medium" | "high">("medium");
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const getRecommendations = trpc.ai.getRecommendations.useMutation();

  const handleGetRecommendations = async () => {
    if (!marketCondition.trim()) {
      toast.error("請描述當前市場條件");
      return;
    }

    setIsLoading(true);
    try {
      const result = await getRecommendations.mutateAsync({
        marketCondition,
        riskTolerance,
      });
      setRecommendations(result.recommendations);
      toast.success("已獲取 AI 推薦策略");
    } catch (error) {
      console.error("Failed to get recommendations:", error);
      toast.error("獲取推薦失敗，請重試");
    } finally {
      setIsLoading(false);
    }
  };

  const riskLevelConfig = {
    low: { label: "保守型", color: "text-blue-600", bgColor: "bg-blue-50", borderColor: "border-blue-200" },
    medium: { label: "平衡型", color: "text-amber-600", bgColor: "bg-amber-50", borderColor: "border-amber-200" },
    high: { label: "激進型", color: "text-rose-600", bgColor: "bg-rose-50", borderColor: "border-rose-200" },
  };

  return (
    <div className="space-y-6">
      {/* 輸入區域 */}
      <div className="bg-white rounded-2xl border border-slate-100 p-8 shadow-sm space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
            <Lightbulb size={20} className="text-amber-600" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900">AI 策略推薦引擎</h3>
            <p className="text-xs text-slate-400 font-medium">根據市場條件和風險偏好推薦最適合的交易策略</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* 市場條件輸入 */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">當前市場條件</label>
            <textarea
              placeholder="例如：市場處於上升趨勢，但波動性增加，科技股領漲..."
              value={marketCondition}
              onChange={(e) => setMarketCondition(e.target.value)}
              className="w-full h-20 px-4 py-3 rounded-lg border border-slate-100 bg-slate-50 text-sm font-medium resize-none focus:outline-none focus:ring-2 focus:ring-amber-500"
              disabled={isLoading}
            />
          </div>

          {/* 風險承受度選擇 */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">風險承受度</label>
            <div className="grid grid-cols-3 gap-3">
              {(["low", "medium", "high"] as const).map((level) => (
                <button
                  key={level}
                  onClick={() => setRiskTolerance(level)}
                  className={`px-4 py-3 rounded-lg border-2 font-bold text-sm transition-all ${
                    riskTolerance === level
                      ? `${riskLevelConfig[level].bgColor} ${riskLevelConfig[level].borderColor} border-2`
                      : "bg-slate-50 border-slate-100 text-slate-600 hover:border-slate-200"
                  }`}
                >
                  {riskLevelConfig[level].label}
                </button>
              ))}
            </div>
          </div>

          <Button
            onClick={handleGetRecommendations}
            disabled={isLoading || !marketCondition.trim()}
            className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl"
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin mr-2" />
                AI 正在分析...
              </>
            ) : (
              <>
                <Lightbulb size={16} className="mr-2" />
                獲取推薦策略
              </>
            )}
          </Button>
        </div>
      </div>

      {/* 推薦結果 */}
      {recommendations.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">推薦的交易策略</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recommendations.map((rec, idx) => (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm hover:shadow-md transition-shadow space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-black text-slate-900 mb-1">{rec.name}</h4>
                    <p className="text-xs text-slate-500 font-medium">{rec.description}</p>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center flex-shrink-0">
                    <Zap size={16} className="text-teal-600" />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-50">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">推薦理由</p>
                  <p className="text-xs text-slate-600 leading-relaxed">{rec.rationale}</p>
                </div>

                <div className="pt-4 border-t border-slate-50">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">建議參數</p>
                  <div className="space-y-1">
                    {Object.entries(rec.params || {}).map(([key, value]: [string, any]) => (
                      <div key={key} className="flex justify-between text-xs">
                        <span className="text-slate-600">{key}:</span>
                        <span className="font-bold text-slate-900">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={() => {
                    onStrategySelected?.(rec);
                    toast.success("已選擇此策略，請在回測頁面配置參數");
                  }}
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg text-xs"
                >
                  <TrendingUp size={14} className="mr-2" />
                  選擇此策略
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

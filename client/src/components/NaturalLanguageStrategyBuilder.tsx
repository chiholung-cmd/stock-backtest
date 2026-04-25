import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { 
  Sparkles, 
  Loader2, 
  Send,
  Zap,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";

interface NaturalLanguageStrategyBuilderProps {
  onStrategyGenerated?: (strategy: any) => void;
}

export function NaturalLanguageStrategyBuilder({ onStrategyGenerated }: NaturalLanguageStrategyBuilderProps) {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const analyzeGoal = trpc.ai.analyzeGoal.useMutation();

  const examplePrompts = [
    "我想要一個保守的策略，在股價跌破 50 天均線時買入，漲破 200 天均線時賣出。",
    "幫我設計一個短期交易策略，利用 RSI 超賣買入，超買賣出，適合每週交易 2-3 次。",
    "我想要一個波動性策略，在布林帶下軌買入，上軌賣出，適合高風險高收益的投資者。",
    "設計一個 MACD 交叉策略，用於中期趨勢交易，初始資金 50,000 港元。"
  ];

  const handleGenerate = async () => {
    if (!input.trim()) {
      toast.error("請輸入您的策略需求");
      return;
    }

    setIsLoading(true);
    try {
      const result = await analyzeGoal.mutateAsync({
        goal: input,
        model: "claude"
      });

      // 嘗試解析策略數據
      const match = result.analysis.match(/```json\n([\s\S]*?)\n```/);
      if (match) {
        const strategy = JSON.parse(match[1]);
        onStrategyGenerated?.(strategy);
        toast.success("策略已生成！點擊「立即執行回測驗證」開始測試。");
      }

      setSuggestions([result.analysis]);
    } catch (error) {
      console.error("Strategy generation failed:", error);
      toast.error("策略生成失敗，請重試");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 輸入區域 */}
      <div className="bg-white rounded-2xl border border-slate-100 p-8 shadow-sm space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center">
            <Sparkles size={20} className="text-teal-600" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900">自然語言策略生成器</h3>
            <p className="text-xs text-slate-400 font-medium">用您的語言描述投資想法，AI 將自動轉化為量化策略</p>
          </div>
        </div>

        <Textarea
          placeholder="例如：我想要一個保守的策略，在股價跌破 50 天均線時買入，漲破 200 天均線時賣出..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="min-h-24 resize-none"
          disabled={isLoading}
        />

        <div className="flex gap-2">
          <Button
            onClick={handleGenerate}
            disabled={isLoading || !input.trim()}
            className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl"
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin mr-2" />
                AI 正在分析...
              </>
            ) : (
              <>
                <Sparkles size={16} className="mr-2" />
                生成策略
              </>
            )}
          </Button>
        </div>

        {/* 提示詞示例 */}
        <div className="pt-4 border-t border-slate-50">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">💡 示例提示詞</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {examplePrompts.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => setInput(prompt)}
                className="text-left px-3 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-100 text-[11px] font-medium text-slate-600 hover:text-slate-900"
              >
                {prompt.substring(0, 50)}...
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 建議結果 */}
      {suggestions.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 p-8 shadow-sm space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-teal-600" />
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">AI 生成的策略建議</h3>
          </div>

          <div className="prose prose-slate max-w-none text-slate-600 text-sm">
            {suggestions[0].replace(/```json\n[\s\S]*?\n```/, "")}
          </div>

          <div className="pt-4 border-t border-slate-50 flex gap-3">
            <Button
              onClick={() => {
                setInput("");
                setSuggestions([]);
              }}
              variant="outline"
              className="flex-1 rounded-xl"
            >
              重新生成
            </Button>
            <Button
              onClick={() => {
                toast.success("請在左側面板確認參數後執行回測");
              }}
              className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl"
            >
              <Zap size={16} className="mr-2" />
              立即執行回測
            </Button>
          </div>
        </div>
      )}

      {/* 提示 */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
        <AlertCircle size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-blue-700 font-medium">
          <p className="font-bold mb-1">💡 提示：如何寫出好的策略描述？</p>
          <ul className="list-disc list-inside space-y-1 text-blue-600">
            <li>明確指定買入和賣出的條件</li>
            <li>提及風險承受度（保守/平衡/激進）</li>
            <li>說明交易頻率（日交易/週交易/月交易）</li>
            <li>指定目標股票或市場</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

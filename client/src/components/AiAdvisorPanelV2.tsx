import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, Sparkles, TrendingUp, AlertCircle, Calendar, MessageSquare } from "lucide-react";
import { trpc } from "@/lib/trpc";
import ReactMarkdown from "react-markdown";
import { useLocation } from "wouter";

interface Message {
  role: "user" | "assistant";
  content: string;
}

// 將 AI 回覆中的 JSON 代碼塊過濾掉，只顯示人類可讀的文字
function cleanMarkdown(text: string): string {
  return text.replace(/```json[\s\S]*?```/g, "").trim();
}

// Backtest.tsx 中定義的策略預設參數（以 Backtest.tsx 的實際鍵名為準）
const BACKTEST_STRATEGY_DEFAULTS: Record<string, Record<string, number>> = {
  ma_crossover: { shortPeriod: 10, longPeriod: 30 },
  rsi: { period: 14, oversold: 30, overbought: 70 },
  macd: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
  bollinger_bands: { period: 20, stdDev: 2 },
};

// 合法的策略 ID
const VALID_STRATEGIES = ["ma_crossover", "rsi", "macd", "bollinger_bands"];

// 從 AI 回覆中解析推薦的策略 JSON
function extractStrategy(text: string): { ticker: string; strategy: string; params: Record<string, number> } | null {
  try {
    const match = text.match(/```json\n([\s\S]*?)\n```/);
    if (!match) return null;
    const data = JSON.parse(match[1]);
    if (!data.ticker || !data.strategy) return null;

    const strategyId = data.strategy as string;

    // 如果 AI 推薦的策略不在支援列表，預設使用 ma_crossover
    const safeStrategyId = VALID_STRATEGIES.includes(strategyId) ? strategyId : "ma_crossover";

    // 取得該策略的預設參數作為基底
    const defaultParams = { ...BACKTEST_STRATEGY_DEFAULTS[safeStrategyId] };

    // AI 提供的參數，只覆蓋存在於預設參數中的鍵
    const rawParams: Record<string, number> = data.params || {};
    const mergedParams: Record<string, number> = { ...defaultParams };
    for (const [key, value] of Object.entries(rawParams)) {
      if (key in defaultParams && typeof value === 'number') {
        mergedParams[key] = value;
      }
    }

    return { ticker: data.ticker, strategy: safeStrategyId, params: mergedParams };
  } catch {
    return null;
  }
}

export function AiAdvisorPanelV2() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState<"input" | "analyzing" | "result">("input");
  const [inputMode, setInputMode] = useState<"structured" | "freeform">("structured");
  const [expectedReturn, setExpectedReturn] = useState("15");
  const [maxDrawdown, setMaxDrawdown] = useState("20");
  const [monthlyContribution, setMonthlyContribution] = useState("1000");
  const [investmentHorizon, setInvestmentHorizon] = useState("5");
  const [customGoal, setCustomGoal] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [parsedStrategy, setParsedStrategy] = useState<{ ticker: string; strategy: string; params: Record<string, number> } | null>(null);

  const analyzeGoal = trpc.ai.analyzeGoal.useMutation();

  const handleAnalyze = async () => {
    let goalText: string;

    if (inputMode === "freeform") {
      if (!customGoal.trim()) return;
      goalText = customGoal.trim();
    } else {
      if (!expectedReturn || !maxDrawdown || !monthlyContribution) return;
      goalText = `
我的投資目標：
- 預期年化報酬率：${expectedReturn}%
- 最大可接受回撤：${maxDrawdown}%
- 每月定投金額：$${monthlyContribution}
- 投資年限：${investmentHorizon}年

請根據這些參數，為我推薦最適合的投資策略和資產配置。
      `.trim();
    }

    setStep("analyzing");
    setLoading(true);
    setMessages([{ role: "user", content: goalText }]);

    try {
      const response = await analyzeGoal.mutateAsync({
        model: "gemini-2.5-flash",
        goal: goalText,
      });

      const assistantContent = response.analysis;
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: assistantContent },
      ]);

      // 嘗試解析策略 JSON
      const strategy = extractStrategy(assistantContent);
      setParsedStrategy(strategy);

      setStep("result");
    } catch (error) {
      console.error("Analysis failed:", error);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "分析失敗，請重試。" },
      ]);
      setStep("result");
    } finally {
      setLoading(false);
    }
  };

  const handleStartBacktest = () => {
    if (!parsedStrategy) return;
    const { ticker, strategy, params } = parsedStrategy;
    navigate(`/backtest?ticker=${encodeURIComponent(ticker)}&strategy=${encodeURIComponent(strategy)}&params=${encodeURIComponent(JSON.stringify(params))}`);
  };

  const handleReset = () => {
    setStep("input");
    setMessages([]);
    setParsedStrategy(null);
    setExpectedReturn("15");
    setMaxDrawdown("20");
    setMonthlyContribution("1000");
    setInvestmentHorizon("5");
    setCustomGoal("");
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-blue-600 flex items-center justify-center">
          <Sparkles size={20} className="text-white" />
        </div>
        <div>
          <h3 className="font-bold text-slate-900">AI 投資顧問</h3>
          <p className="text-xs text-slate-500">智能策略推薦</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {step === "input" && (
          <div className="space-y-5">
            {/* 輸入模式切換 */}
            <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
              <button
                onClick={() => setInputMode("structured")}
                className={`flex-1 text-xs font-semibold py-2 rounded-lg transition-all ${
                  inputMode === "structured"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                快速設定
              </button>
              <button
                onClick={() => setInputMode("freeform")}
                className={`flex-1 text-xs font-semibold py-2 rounded-lg transition-all flex items-center justify-center gap-1 ${
                  inputMode === "freeform"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <MessageSquare size={12} />
                自由描述
              </button>
            </div>

            {inputMode === "structured" ? (
              <>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    <div className="flex items-center gap-2">
                      <TrendingUp size={14} className="text-teal-600" />
                      預期年化報酬率 (%)
                    </div>
                  </label>
                  <Input
                    type="number"
                    value={expectedReturn}
                    onChange={(e) => setExpectedReturn(e.target.value)}
                    placeholder="15"
                    className="text-sm font-semibold"
                  />
                  <p className="text-xs text-slate-400 mt-1">目標年化報酬率，通常 10-20% 為合理目標</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    <div className="flex items-center gap-2">
                      <AlertCircle size={14} className="text-orange-600" />
                      最大可接受回撤 (%)
                    </div>
                  </label>
                  <Input
                    type="number"
                    value={maxDrawdown}
                    onChange={(e) => setMaxDrawdown(e.target.value)}
                    placeholder="20"
                    className="text-sm font-semibold"
                  />
                  <p className="text-xs text-slate-400 mt-1">您能承受的最大虧損幅度</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-blue-600" />
                      每月定投金額 ($)
                    </div>
                  </label>
                  <Input
                    type="number"
                    value={monthlyContribution}
                    onChange={(e) => setMonthlyContribution(e.target.value)}
                    placeholder="1000"
                    className="text-sm font-semibold"
                  />
                  <p className="text-xs text-slate-400 mt-1">每月 1 號自動投入</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    投資年限 (年)
                  </label>
                  <Input
                    type="number"
                    value={investmentHorizon}
                    onChange={(e) => setInvestmentHorizon(e.target.value)}
                    placeholder="5"
                    className="text-sm font-semibold"
                  />
                  <p className="text-xs text-slate-400 mt-1">計劃投資多久</p>
                </div>
              </>
            ) : (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  描述您的投資目標
                </label>
                <Textarea
                  placeholder="例如：我想在 5 年內積累 100 萬美元，風險承受度中等，每月可投入 2000 美元，偏好科技股，希望了解適合的量化策略..."
                  value={customGoal}
                  onChange={(e) => setCustomGoal(e.target.value)}
                  className="text-sm min-h-[140px] resize-none"
                />
                <p className="text-xs text-slate-400 mt-1">用自然語言描述您的投資需求，AI 將為您量身推薦策略</p>
              </div>
            )}
          </div>
        )}

        {step === "analyzing" && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-500 to-blue-600 flex items-center justify-center animate-spin">
              <Loader2 size={24} className="text-white" />
            </div>
            <p className="text-sm font-semibold text-slate-600">AI 正在分析您的投資目標...</p>
            <p className="text-xs text-slate-400">這通常需要 10-30 秒</p>
          </div>
        )}

        {step === "result" && messages.length > 0 && (
          <div className="space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                    <Sparkles size={16} className="text-white" />
                  </div>
                )}
                <div
                  className={`max-w-xs px-4 py-3 rounded-2xl ${
                    msg.role === "user"
                      ? "bg-teal-600 text-white rounded-br-none"
                      : "bg-slate-100 text-slate-900 rounded-bl-none"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm max-w-none text-sm leading-relaxed">
                      <ReactMarkdown
                        components={{
                          strong: ({ node, ...props }) => (
                            <strong className="font-bold text-teal-700" {...props} />
                          ),
                          em: ({ node, ...props }) => (
                            <em className="italic text-slate-600" {...props} />
                          ),
                          p: ({ node, ...props }) => (
                            <p className="mb-2 last:mb-0" {...props} />
                          ),
                          ul: ({ node, ...props }) => (
                            <ul className="list-disc list-inside space-y-1 mb-2" {...props} />
                          ),
                          li: ({ node, ...props }) => (
                            <li className="text-sm" {...props} />
                          ),
                        }}
                      >
                        {cleanMarkdown(msg.content)}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-sm">{msg.content}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-slate-100 flex gap-2">
        {step === "input" && (
          <Button
            onClick={handleAnalyze}
            disabled={
              loading ||
              (inputMode === "structured"
                ? !expectedReturn || !maxDrawdown || !monthlyContribution
                : !customGoal.trim())
            }
            className="w-full bg-gradient-to-r from-teal-600 to-blue-600 text-white hover:shadow-lg transition-shadow"
          >
            <Sparkles size={16} className="mr-2" />
            {loading ? "分析中..." : "開始分析"}
          </Button>
        )}

        {step === "result" && (
          <>
            <Button
              onClick={handleReset}
              variant="outline"
              className="flex-1"
            >
              重新設定
            </Button>
            <Button
              onClick={handleStartBacktest}
              disabled={!parsedStrategy}
              className="flex-1 bg-gradient-to-r from-teal-600 to-blue-600 text-white disabled:opacity-50"
              title={!parsedStrategy ? "AI 未能解析出策略參數，請重新分析" : "前往回測頁面"}
            >
              <Send size={16} className="mr-2" />
              開始回測
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

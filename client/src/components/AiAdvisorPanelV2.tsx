import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Send, Sparkles, TrendingUp, AlertCircle, Calendar } from "lucide-react";
import { trpc } from "@/lib/trpc";
import ReactMarkdown from "react-markdown";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function AiAdvisorPanelV2() {
  const [step, setStep] = useState<"input" | "analyzing" | "result">("input");
  const [expectedReturn, setExpectedReturn] = useState("15");
  const [maxDrawdown, setMaxDrawdown] = useState("20");
  const [monthlyContribution, setMonthlyContribution] = useState("1000");
  const [investmentHorizon, setInvestmentHorizon] = useState("5");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const analyzeGoal = trpc.ai.analyzeGoal.useMutation();

  const handleAnalyze = async () => {
    if (!expectedReturn || !maxDrawdown || !monthlyContribution) return;

    setStep("analyzing");
    setLoading(true);

    const goalText = `
我的投資目標：
- 預期年化報酬率：${expectedReturn}%
- 最大可接受回撤：${maxDrawdown}%
- 每月定投金額：$${monthlyContribution}
- 投資年限：${investmentHorizon}年

請根據這些參數，為我推薦最適合的投資策略和資產配置。
    `.trim();

    setMessages([{ role: "user", content: goalText }]);

    try {
      const response = await analyzeGoal.mutateAsync({
        model: "gemini-2.5-flash",
        goal: goalText,
      });

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: response.analysis },
      ]);
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

  const handleReset = () => {
    setStep("input");
    setMessages([]);
    setExpectedReturn("15");
    setMaxDrawdown("20");
    setMonthlyContribution("1000");
    setInvestmentHorizon("5");
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
                        {msg.content}
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
            disabled={loading || !expectedReturn || !maxDrawdown || !monthlyContribution}
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
              className="flex-1 bg-gradient-to-r from-teal-600 to-blue-600 text-white"
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

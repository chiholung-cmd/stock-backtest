import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, Sparkles } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function AiAdvisorPanel() {
  const [model, setModel] = useState<"claude" | "gpt" | "gemini">("claude");
  const [goal, setGoal] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);

  const analyzeGoal = trpc.ai.analyzeGoal.useMutation();
  const chat = trpc.ai.chat.useMutation();

  // 解析 AI 回傳的 JSON 策略參數 (如果有的話)
  const extractStrategy = (text: string) => {
    try {
      const match = text.match(/```json\n([\s\S]*?)\n```/);
      if (match) return JSON.parse(match[1]);
    } catch (e) {
      return null;
    }
    return null;
  };

  // 分析投資目標
  const handleAnalyzeGoal = async () => {
    if (!goal.trim()) return;

    setLoading(true);
    setMessages([{ role: "user", content: goal }]);

    try {
      const response = await analyzeGoal.mutateAsync({
        model,
        goal,
      });

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: response.analysis },
      ]);
      setGoal("");
    } catch (error) {
      console.error("Analysis failed:", error);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "分析失敗，請重試。" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // 發送後續聊天訊息
  const handleSendMessage = async (userMessage: string) => {
    if (!userMessage.trim()) return;

    const newMessages = [...messages, { role: "user" as const, content: userMessage }];
    setMessages(newMessages);
    setStreaming(true);

    try {
      const response = await chat.mutateAsync({
        model,
        messages: newMessages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      });

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: response.reply },
      ]);
    } catch (error) {
      console.error("Chat failed:", error);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "聊天失敗，請重試。" },
      ]);
    } finally {
      setStreaming(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="metric-card p-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-teal-100">
            <Sparkles size={20} className="text-teal-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">AI 投資顧問</h2>
            <p className="text-sm text-gray-500">由 AI 驅動的智能策略分析</p>
          </div>
        </div>

        {/* Model Selector */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            選擇 AI 模型
          </label>
          <div className="flex gap-3">
            {(["claude", "gpt", "gemini"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setModel(m)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  model === m
                    ? "bg-teal-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {m === "claude" ? "Claude 3" : m === "gpt" ? "GPT-4" : "Gemini"}
              </button>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4 h-80 overflow-y-auto border border-gray-200">
          {messages.length === 0 ? (
            <div className="text-center text-gray-400 py-12">
              <p className="text-sm">輸入您的投資目標，AI 將為您分析最適合的策略</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-xs px-4 py-2 rounded-lg ${
                      msg.role === "user"
                        ? "bg-teal-600 text-white rounded-br-none"
                        : "bg-white text-gray-900 border border-gray-200 rounded-bl-none"
                    }`}
                  >
                    <div className="text-sm">
                      {msg.content}
                      {msg.role === "assistant" && extractStrategy(msg.content) && (
                        <div className="mt-4 p-3 bg-teal-50 rounded border border-teal-200">
                          <p className="text-xs font-bold text-teal-800 mb-2">AI 已為您生成策略參數：</p>
                          <Button 
                            size="sm" 
                            className="w-full bg-teal-600 text-white"
                            onClick={() => {
                              const strategy = extractStrategy(msg.content);
                              window.location.href = `/backtest?ticker=${strategy.ticker || "AAPL"}&strategy=${strategy.strategy || "ma_crossover"}&params=${encodeURIComponent(JSON.stringify(strategy.params))}`;
                            }}
                          >
                            立即執行回測驗證
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {streaming && (
                <div className="flex justify-start">
                  <div className="bg-white text-gray-900 border border-gray-200 px-4 py-2 rounded-lg rounded-bl-none">
                    <Loader2 size={16} className="animate-spin" />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input Area */}
        {messages.length === 0 ? (
          <div className="space-y-3">
            <Textarea
              placeholder="例如：我想在美股市場中找到穩定的短期交易策略，偏好每週交易 2-3 次，風險承受度中等..."
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              className="min-h-24 resize-none"
              disabled={loading}
            />
            <Button
              onClick={handleAnalyzeGoal}
              disabled={loading || !goal.trim()}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin mr-2" />
                  分析中...
                </>
              ) : (
                <>
                  <Sparkles size={16} className="mr-2" />
                  分析投資目標
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Input
              placeholder="繼續提問..."
              onKeyPress={(e) => {
                if (e.key === "Enter" && !streaming) {
                  handleSendMessage(e.currentTarget.value);
                  e.currentTarget.value = "";
                }
              }}
              disabled={streaming}
            />
            <Button
              onClick={(e) => {
                const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
                if (input.value.trim()) {
                  handleSendMessage(input.value);
                  input.value = "";
                }
              }}
              disabled={streaming}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              <Send size={16} />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

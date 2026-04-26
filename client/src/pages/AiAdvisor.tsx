"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "sonner";
import { Loader2, Copy, Check, ChevronDown, X } from "lucide-react";

const POPULAR_STOCKS = [
  { symbol: "AAPL", name: "Apple Inc." },
  { symbol: "MSFT", name: "Microsoft" },
  { symbol: "GOOGL", name: "Google" },
  { symbol: "AMZN", name: "Amazon" },
  { symbol: "NVDA", name: "NVIDIA" },
  { symbol: "TSLA", name: "Tesla" },
  { symbol: "META", name: "Meta" },
  { symbol: "QQQ", name: "Invesco QQQ Trust" },
  { symbol: "SPY", name: "S&P 500 ETF" },
  { symbol: "IVV", name: "iShares Core S&P 500" },
];

const GOAL_TEMPLATES = [
  {
    label: "保守型投資者",
    value: "我今年 50 歲，希望穩定增長，年化報酬率 5-8%，風險承受度低，投資期限 10 年。我傾向於債券和股票混合組合。",
  },
  {
    label: "平衡型投資者",
    value: "我 35 歲，目標年化報酬率 10-12%，中等風險承受度，投資期限 15 年。我希望在成長和穩定性之間取得平衡。",
  },
  {
    label: "積極型投資者",
    value: "我 28 歲，尋求高增長，目標年化報酬率 15%+，高風險承受度，投資期限 20 年。我對科技和成長型股票感興趣。",
  },
  {
    label: "短期交易者",
    value: "我想進行 3-6 個月的短期交易，目標月回報率 2-3%，可接受較高波動性。我專注於技術分析和市場時機。",
  },
];

export default function AiAdvisor() {
  const [step, setStep] = useState<"preferences" | "goal">("preferences");
  const [selectedStocks, setSelectedStocks] = useState<string[]>([]);
  const [stockInput, setStockInput] = useState("");
  const [goal, setGoal] = useState("");
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const analyzeGoalMutation = trpc.ai.analyzeGoal.useMutation();

  const handleAddStock = () => {
    const symbol = stockInput.toUpperCase().trim();
    if (!symbol) {
      toast.error("請輸入股票代碼");
      return;
    }
    if (selectedStocks.includes(symbol)) {
      toast.error("該股票已被選擇");
      return;
    }
    if (selectedStocks.length >= 10) {
      toast.error("最多只能選擇 10 個股票");
      return;
    }
    setSelectedStocks([...selectedStocks, symbol]);
    setStockInput("");
  };

  const handleRemoveStock = (symbol: string) => {
    setSelectedStocks(selectedStocks.filter(s => s !== symbol));
  };

  const handleSelectPopularStock = (symbol: string) => {
    if (selectedStocks.includes(symbol)) {
      handleRemoveStock(symbol);
    } else if (selectedStocks.length < 10) {
      setSelectedStocks([...selectedStocks, symbol]);
    } else {
      toast.error("最多只能選擇 10 個股票");
    }
  };

  const handleProceedToGoal = () => {
    if (selectedStocks.length === 0) {
      toast.error("請至少選擇一個股票");
      return;
    }
    setStep("goal");
  };

  const handleAnalyzeGoal = async () => {
    if (!goal.trim()) {
      toast.error("請輸入您的投資目標");
      return;
    }

    if (goal.trim().length < 20) {
      toast.error("請提供更詳細的投資目標描述（至少 20 個字符）");
      return;
    }

    setIsLoading(true);
    try {
      const result = await analyzeGoalMutation.mutateAsync({
        goal: `我的偏好股票：${selectedStocks.join(", ")}\n\n${goal}`,
        model: "Claude-3-5-Sonnet",
      });
      setAnalysis(result.analysis);
      toast.success("分析完成！");
    } catch (error) {
      console.error("Error analyzing goal:", error);
      toast.error("分析失敗，請稍後重試");
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyTemplate = (template: string) => {
    setGoal(template);
    toast.success("已應用範本，請修改以符合您的具體情況");
  };

  const handleCopyAnalysis = () => {
    if (analysis) {
      navigator.clipboard.writeText(analysis);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("已複製到剪貼板");
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const wordCount = goal.trim().length;
  const isGoalValid = wordCount >= 20;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-black text-slate-900">AlphaTest AI 投資顧問</h1>
          <p className="text-slate-600">
            {step === "preferences" 
              ? "第 1 步：選擇您感興趣的股票或 ETF"
              : "第 2 步：描述您的投資目標"}
          </p>
        </div>

        {/* Step 1: Stock Preferences */}
        {step === "preferences" && (
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">選擇您的投資偏好</CardTitle>
              <CardDescription>
                選擇最多 10 個您感興趣的股票或 ETF，AI 將基於這些偏好提供個性化建議
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Stock Input */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">自訂股票代碼</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="輸入股票代碼 (如: AAPL, TSLA)"
                    value={stockInput}
                    onChange={(e) => setStockInput(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleAddStock()}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleAddStock}
                    className="bg-teal-600 hover:bg-teal-700"
                  >
                    新增
                  </Button>
                </div>
              </div>

              {/* Popular Stocks Grid */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">熱門股票</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {POPULAR_STOCKS.map((stock) => (
                    <button
                      key={stock.symbol}
                      onClick={() => handleSelectPopularStock(stock.symbol)}
                      className={`p-3 rounded-lg border-2 transition-all text-sm font-bold ${
                        selectedStocks.includes(stock.symbol)
                          ? "border-teal-600 bg-teal-50 text-teal-700"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                      }`}
                    >
                      <div>{stock.symbol}</div>
                      <div className="text-xs font-normal text-slate-500 mt-1">{stock.name}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Selected Stocks */}
              {selectedStocks.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">
                    已選擇 ({selectedStocks.length}/10)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {selectedStocks.map((symbol) => (
                      <div
                        key={symbol}
                        className="bg-teal-100 text-teal-700 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-2"
                      >
                        {symbol}
                        <button
                          onClick={() => handleRemoveStock(symbol)}
                          className="hover:text-teal-900"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Proceed Button */}
              <Button
                onClick={handleProceedToGoal}
                disabled={selectedStocks.length === 0}
                className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-2"
              >
                繼續 →
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Goal Input */}
        {step === "goal" && (
          <>
            {/* Back Button */}
            <Button
              variant="outline"
              onClick={() => setStep("preferences")}
              className="text-slate-700"
            >
              ← 返回修改股票選擇
            </Button>

            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">描述您的投資目標</CardTitle>
                <CardDescription>
                  提供越詳細越好。包括您的年齡、投資期限、風險承受度、期望報酬率等信息
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Quick Templates */}
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">快速範本</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {GOAL_TEMPLATES.map((template) => (
                      <Button
                        key={template.label}
                        variant="outline"
                        onClick={() => handleApplyTemplate(template.value)}
                        className="justify-start text-left h-auto py-2 px-3"
                      >
                        <div className="text-sm font-bold text-slate-700">{template.label}</div>
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Goal Input */}
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">投資目標描述</label>
                  <Textarea
                    placeholder="例如：我 35 歲，目標年化報酬率 12%，中等風險承受度，投資期限 15 年..."
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                    className="min-h-32 resize-none"
                  />
                  <div className="flex justify-between items-center text-xs text-slate-500">
                    <span>{wordCount} 字符</span>
                    <span className={isGoalValid ? "text-teal-600" : "text-rose-600"}>
                      {isGoalValid ? "✓ 符合要求" : "✗ 至少 20 個字符"}
                    </span>
                  </div>
                </div>

                {/* Analyze Button */}
                <Button
                  onClick={handleAnalyzeGoal}
                  disabled={!isGoalValid || isLoading}
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      分析中...
                    </>
                  ) : (
                    "開始分析"
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Analysis Results */}
            {analysis && (
              <Card className="border-slate-200 shadow-sm bg-white">
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <div>
                    <CardTitle className="text-lg">智能策略推薦</CardTitle>
                    <CardDescription>基於您的投資目標和偏好</CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyAnalysis}
                    className="text-slate-600 hover:text-slate-900"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-teal-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Render Analysis with Collapsible Sections */}
                  {analysis.split("\n\n").map((section, idx) => {
                    const isHeading = section.startsWith("##");
                    const sectionKey = `section-${idx}`;
                    
                    if (isHeading) {
                      const title = section.replace(/^#+\s*/, "").trim();
                      return (
                        <Collapsible
                          key={sectionKey}
                          open={expandedSections[sectionKey] ?? idx < 3}
                          onOpenChange={() => toggleSection(sectionKey)}
                        >
                          <CollapsibleTrigger className="flex items-center gap-2 font-bold text-slate-900 hover:text-teal-600 transition-colors">
                            <ChevronDown
                              size={18}
                              className={`transition-transform ${
                                expandedSections[sectionKey] ?? idx < 3 ? "rotate-180" : ""
                              }`}
                            />
                            {title}
                          </CollapsibleTrigger>
                          <CollapsibleContent className="mt-3 ml-6 text-sm text-slate-700 space-y-2">
                            {section
                              .split("\n")
                              .slice(1)
                              .map((line, lineIdx) => (
                                <p key={lineIdx} className="leading-relaxed">
                                  {line}
                                </p>
                              ))}
                          </CollapsibleContent>
                        </Collapsible>
                      );
                    }

                    return (
                      <p key={sectionKey} className="text-sm text-slate-700 leading-relaxed">
                        {section}
                      </p>
                    );
                  })}

                  {/* Auto Backtest Button */}
                  <Button
                    onClick={() => {
                      // 提取策略信息並跳轉到回測頁面
                      const strategyMatch = analysis.match(/ma_crossover|rsi|macd|bb_breakover|macd_divergence|dual_rsi/i);
                      const strategy = strategyMatch ? strategyMatch[0].toLowerCase() : "ma_crossover";
                      const ticker = selectedStocks[0] || "AAPL";
                      window.location.href = `/backtest?ticker=${ticker}&strategy=${strategy}&autoRun=true`;
                    }}
                    className="w-full bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-700 hover:to-blue-700 text-white font-bold py-2 mt-4"
                  >
                    自動回測推薦策略 →
                  </Button>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}

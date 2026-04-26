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
import { toast } from "sonner";
import { Loader2, Copy, Check } from "lucide-react";

const AI_MODELS = [
  { value: "Claude-3-5-Sonnet", label: "Claude 3.5 Sonnet" },
  { value: "GPT-4o", label: "GPT-4o" },
  { value: "Gemini-1.5-Pro", label: "Gemini 1.5 Pro" },
  { value: "Claude-3-Opus", label: "Claude 3 Opus" },
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
  const [selectedModel, setSelectedModel] = useState("Claude-3-5-Sonnet");
  const [goal, setGoal] = useState("");
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const analyzeGoalMutation = trpc.ai.analyzeGoal.useMutation();

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
        goal,
        model: selectedModel,
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

  const wordCount = goal.trim().length;
  const isGoalValid = wordCount >= 20;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-slate-900">AI 投資顧問</h1>
          <p className="text-lg text-slate-600">
            描述您的投資目標，AI 將為您推薦個性化的投資策略和資產配置方案
          </p>
        </div>

        {/* Model Selector Card */}
        <Card>
          <CardHeader>
            <CardTitle>選擇 AI 模型</CardTitle>
            <CardDescription>選擇用於分析的 AI 模型</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AI_MODELS.map((model) => (
                  <SelectItem key={model.value} value={model.value}>
                    {model.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Goal Input Card */}
        <Card>
          <CardHeader>
            <CardTitle>您的投資目標</CardTitle>
            <CardDescription>
              詳細描述您的投資目標、風險承受度、投資期限等信息。AI 將根據這些信息提供專業建議。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Textarea
                placeholder="例如：我今年 35 歲，希望年化報酬率 10-12%，中等風險承受度，投資期限 15 年。我對科技股和 ETF 感興趣，並希望獲得定期定額投資建議。"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                className="min-h-[140px] resize-none"
              />
              <div className="flex justify-between items-center text-sm">
                <span className={`font-medium ${isGoalValid ? "text-teal-600" : "text-slate-400"}`}>
                  {wordCount} 個字符
                </span>
                {!isGoalValid && (
                  <span className="text-rose-600 text-xs font-medium">
                    至少需要 20 個字符
                  </span>
                )}
              </div>
            </div>

            {/* Templates */}
            <div className="space-y-3">
              <p className="text-sm font-semibold text-slate-700">快速選擇範本：</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {GOAL_TEMPLATES.map((template) => (
                  <Button
                    key={template.label}
                    variant="outline"
                    size="sm"
                    onClick={() => handleApplyTemplate(template.value)}
                    className="justify-start text-left h-auto py-2 px-3"
                  >
                    <span className="text-xs font-medium">{template.label}</span>
                  </Button>
                ))}
              </div>
            </div>

            <Button
              onClick={handleAnalyzeGoal}
              disabled={isLoading || !isGoalValid}
              className="w-full"
              size="lg"
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

        {/* Analysis Results Card */}
        {analysis && (
          <Card className="border-teal-200 bg-teal-50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-teal-900">AI 分析結果</CardTitle>
                <CardDescription>基於您的投資目標</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyAnalysis}
                className="gap-2"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    已複製
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    複製
                  </>
                )}
              </Button>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none text-slate-700 space-y-4">
                {analysis
                  .split("```json")
                  .map((part, idx) => {
                    if (idx === 0) {
                      return (
                        <div key={idx} className="whitespace-pre-wrap">
                          {part}
                        </div>
                      );
                    }
                    const afterJson = part.split("```")[1] || "";
                    return (
                      <div key={idx} className="whitespace-pre-wrap">
                        {afterJson}
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tips Card */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-900 text-sm">💡 提示</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-blue-800 space-y-2">
            <p>• 提供越詳細的信息，AI 的建議就越精準</p>
            <p>• 包括您的年齡、投資期限、風險承受度和具體目標</p>
            <p>• 提及您感興趣的資產類別（股票、債券、ETF 等）</p>
            <p>• AI 將提供資產配置比例和量化策略建議</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

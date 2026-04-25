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
import { Loader2 } from "lucide-react";

const AI_MODELS = [
  { value: "Claude-3-5-Sonnet", label: "Claude 3.5 Sonnet" },
  { value: "GPT-4o", label: "GPT-4o" },
  { value: "Gemini-1.5-Pro", label: "Gemini 1.5 Pro" },
  { value: "Claude-3-Opus", label: "Claude 3 Opus" },
];

export default function AiAdvisor() {
  const [selectedModel, setSelectedModel] = useState("Claude-3-5-Sonnet");
  const [goal, setGoal] = useState("");
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const analyzeGoalMutation = trpc.ai.analyzeGoal.useMutation();

  const handleAnalyzeGoal = async () => {
    if (!goal.trim()) {
      toast.error("Please enter your investment goal");
      return;
    }

    setIsLoading(true);
    try {
      const result = await analyzeGoalMutation.mutateAsync({
        goal,
        model: selectedModel,
      });
      setAnalysis(result.analysis);
      toast.success("Analysis completed!");
    } catch (error) {
      console.error("Error analyzing goal:", error);
      toast.error("Failed to analyze goal. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-slate-900">AI Investment Advisor</h1>
          <p className="text-lg text-slate-600">
            Describe your investment goals and let AI recommend a personalized strategy
          </p>
        </div>

        {/* Model Selector Card */}
        <Card>
          <CardHeader>
            <CardTitle>Select AI Model</CardTitle>
            <CardDescription>Choose which AI model to use for analysis</CardDescription>
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
            <CardTitle>Your Investment Goal</CardTitle>
            <CardDescription>
              Describe your investment objectives, risk tolerance, and time horizon
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Example: I'm 35 years old, want 15% annual return, moderate risk tolerance, investment horizon 5 years"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              className="min-h-[120px]"
            />
            <Button
              onClick={handleAnalyzeGoal}
              disabled={isLoading}
              className="w-full"
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                "Analyze Goal"
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Analysis Results Card */}
        {analysis && (
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="text-green-900">AI Analysis Results</CardTitle>
              <CardDescription>Based on your investment goal</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none text-slate-700">
                <p className="whitespace-pre-wrap">{analysis}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

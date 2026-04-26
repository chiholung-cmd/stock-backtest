import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { 
  BrainCircuit, 
  Newspaper, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  CheckCircle2,
  Loader2,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import ReactMarkdown from "react-markdown";

interface AiDiagnosisPanelProps {
  ticker: string;
}

export function AiDiagnosisPanel({ ticker }: AiDiagnosisPanelProps) {
  const [diagnosis, setDiagnosis] = useState<string | null>(null);
  const [structuredData, setStructuredData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const lastTickerRef = useRef<string>("");

  const diagnoseMutation = trpc.ai.diagnose.useMutation();

  const handleDiagnose = async (force = false) => {
    if (!ticker) return;
    
    // 如果 ticker 沒變且不是強制刷新，且已經有診斷結果，就不重複分析
    if (!force && ticker === lastTickerRef.current && diagnosis) {
      return;
    }

    setLoading(true);
    try {
      const result = await diagnoseMutation.mutateAsync({ ticker });
      setDiagnosis(result.diagnosis);
      lastTickerRef.current = ticker;
      
      // 嘗試解析 JSON
      const match = result.diagnosis.match(/```json\n([\s\S]*?)\n```/);
      if (match) {
        setStructuredData(JSON.parse(match[1]));
      } else {
        setStructuredData(null);
      }
    } catch (error) {
      console.error("Diagnosis failed:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleDiagnose();
  }, [ticker]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-100 shadow-sm">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600 mb-4" />
        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">AI 正在深度診斷市場情緒...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sentiment Overview */}
      {structuredData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <BrainCircuit size={16} className="text-teal-600" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">市場情緒評分</span>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-black text-slate-900">{structuredData.score}</span>
              <span className="text-sm font-bold text-slate-400 mb-1">/ 100</span>
            </div>
            <Progress 
              value={(structuredData.score + 100) / 2} 
              className="h-1.5 mt-4" 
            />
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={16} className="text-teal-600" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">投資建議</span>
            </div>
            <div className={`text-2xl font-black ${
              structuredData.recommendation === "買入" ? "text-teal-600" : 
              structuredData.recommendation === "賣出" ? "text-rose-600" : "text-amber-500"
            }`}>
              {structuredData.recommendation}
            </div>
            <p className="text-[10px] text-slate-400 mt-2 font-medium">基於新聞與情緒判讀</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Newspaper size={16} className="text-teal-600" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">情緒狀態</span>
            </div>
            <div className="text-2xl font-black text-slate-900">
              {structuredData.sentiment}
            </div>
            <p className="text-[10px] text-slate-400 mt-2 font-medium">{structuredData.summary}</p>
          </div>
        </div>
      )}

      {/* Detailed Analysis */}
      <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
              <BrainCircuit size={18} className="text-teal-600" />
            </div>
            <h3 className="text-lg font-black text-slate-900">AI 深度診斷報告</h3>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => handleDiagnose(true)}
            className="text-slate-400 hover:text-teal-600"
          >
            <RefreshCw size={14} className="mr-2" />
            重新分析
          </Button>
        </div>
        
        <div className="prose prose-slate max-w-none text-slate-600">
          {diagnosis ? (
            <ReactMarkdown>{diagnosis.replace(/```json\n[\s\S]*?\n```/, "")}</ReactMarkdown>
          ) : (
            <p className="text-slate-400 italic">點擊上方按鈕開始分析...</p>
          )}
        </div>
      </div>
    </div>
  );
}

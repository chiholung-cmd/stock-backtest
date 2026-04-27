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
  RefreshCw,
  Quote,
  Clock,
  Calendar,
  BarChart3
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import ReactMarkdown from "react-markdown";
import { Components } from "react-markdown";

interface AiDiagnosisPanelProps {
  ticker?: string;
  portfolioData?: any;
}

interface StructuredData {
  score: number;
  shortTermScore?: number;
  midTermScore?: number;
  longTermScore?: number;
  sentiment: string;
  recommendation: string;
  summary: string;
}

function ScoreCard({
  label,
  sublabel,
  score,
  icon,
  iconBg,
  iconColor,
}: {
  label: string;
  sublabel: string;
  score: number;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
}) {
  const isPositive = score >= 0;
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2 mb-3">
        <div className={`p-2 rounded-xl ${iconBg}`}>
          {icon}
        </div>
        <div>
          <span className="text-xs font-black text-slate-400 uppercase tracking-widest block">{label}</span>
          <span className="text-[10px] text-slate-300 font-medium">{sublabel}</span>
        </div>
      </div>
      <div className="flex items-end gap-1">
        <span className={`text-3xl font-black ${isPositive ? "text-teal-600" : "text-rose-600"}`}>{score > 0 ? "+" : ""}{score}</span>
        <span className="text-sm font-bold text-slate-400 mb-1">/ 100</span>
      </div>
      <div className="mt-3">
        <Progress
          value={(score + 100) / 2}
          className={`h-1.5 rounded-full ${isPositive ? "[&>div]:bg-teal-500" : "[&>div]:bg-rose-500"}`}
        />
        <div className="flex justify-between mt-1.5">
          <span className="text-[9px] font-bold text-slate-300">悲觀</span>
          <span className="text-[9px] font-bold text-slate-300">樂觀</span>
        </div>
      </div>
    </div>
  );
}

export function AiDiagnosisPanel({ ticker, portfolioData }: AiDiagnosisPanelProps) {
  const [diagnosis, setDiagnosis] = useState<string | null>(null);
  const [structuredData, setStructuredData] = useState<StructuredData | null>(null);
  const [loading, setLoading] = useState(false);
  const lastInputRef = useRef<string>("");

  const diagnoseMutation = trpc.ai.diagnose.useMutation();

  const handleDiagnose = async (force = false) => {
    if (!ticker && !portfolioData) return;
    
    const currentInput = ticker || JSON.stringify(portfolioData);
    
    // 如果輸入沒變且不是強制刷新，且已經有診斷結果，就不重複分析
    if (!force && currentInput === lastInputRef.current && diagnosis) {
      return;
    }

    setLoading(true);
    try {
      const result = await diagnoseMutation.mutateAsync({ 
        ticker, 
        portfolioData 
      });
      setDiagnosis(result.diagnosis);
      lastInputRef.current = currentInput;
      
      // 嘗試解析 JSON
      const match = result.diagnosis.match(/```json\n([\s\S]*?)\n```/);
      if (match) {
        try {
          setStructuredData(JSON.parse(match[1]));
        } catch {
          setStructuredData(null);
        }
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
  }, [ticker, portfolioData]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl border border-slate-100 shadow-xl shadow-teal-500/5">
        <div className="relative mb-6">
          <div className="absolute inset-0 animate-ping rounded-full bg-teal-100 opacity-75"></div>
          <div className="relative rounded-full bg-teal-50 p-4">
            <BrainCircuit className="h-10 w-10 text-teal-600 animate-pulse" />
          </div>
        </div>
        <p className="text-lg font-black text-slate-800 tracking-tight">AI 正在掃描全球新聞與市場情緒...</p>
        <p className="text-sm text-slate-400 mt-2">這通常需要 10-20 秒，請稍候</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Overall Sentiment Overview */}
      {structuredData && (
        <>
          {/* 整體評分 + 建議 + 總結 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-xl bg-indigo-50">
                  <BrainCircuit size={18} className="text-indigo-600" />
                </div>
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">整體情緒評分</span>
              </div>
              <div className="flex items-end gap-2">
                <span className="text-4xl font-black text-slate-900">{structuredData.score}</span>
                <span className="text-sm font-bold text-slate-400 mb-1.5">/ 100</span>
              </div>
              <div className="mt-5">
                <Progress 
                  value={(structuredData.score + 100) / 2} 
                  className={`h-2 rounded-full ${structuredData.score > 0 ? "[&>div]:bg-teal-500" : "[&>div]:bg-rose-500"}`}
                />
                <div className="flex justify-between mt-2">
                  <span className="text-[10px] font-bold text-slate-300">極度悲觀</span>
                  <span className="text-[10px] font-bold text-slate-300">極度樂觀</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-xl bg-teal-50">
                  <TrendingUp size={18} className="text-teal-600" />
                </div>
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">投資建議</span>
              </div>
              <div className={`text-3xl font-black flex items-center gap-2 ${
                structuredData.recommendation === "買入" ? "text-teal-600" : 
                structuredData.recommendation === "賣出" ? "text-rose-600" : "text-amber-500"
              }`}>
                {structuredData.recommendation === "買入" && <CheckCircle2 size={24} />}
                {structuredData.recommendation === "賣出" && <AlertCircle size={24} />}
                {structuredData.recommendation}
              </div>
              <p className="text-xs text-slate-400 mt-3 font-medium leading-relaxed">AI 模型根據即時數據判讀之建議</p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-xl bg-amber-50">
                  <Newspaper size={18} className="text-amber-600" />
                </div>
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">核心總結</span>
              </div>
              <div className="text-xl font-bold text-slate-900 leading-tight">
                {structuredData.sentiment}
              </div>
              <div className="flex gap-2 mt-3">
                <Quote size={12} className="text-slate-200 shrink-0" />
                <p className="text-xs text-slate-500 font-medium leading-relaxed">{structuredData.summary}</p>
              </div>
            </div>
          </div>

          {/* 短中長期三維度評分 */}
          {(structuredData.shortTermScore !== undefined || structuredData.midTermScore !== undefined || structuredData.longTermScore !== undefined) && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 size={16} className="text-slate-500" />
                <h4 className="text-sm font-black text-slate-500 uppercase tracking-widest">多期間展望評分</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ScoreCard
                  label="短期展望"
                  sublabel="1–3 個月"
                  score={structuredData.shortTermScore ?? 0}
                  icon={<Clock size={16} className="text-blue-600" />}
                  iconBg="bg-blue-50"
                  iconColor="text-blue-600"
                />
                <ScoreCard
                  label="中期展望"
                  sublabel="3–12 個月"
                  score={structuredData.midTermScore ?? 0}
                  icon={<Calendar size={16} className="text-violet-600" />}
                  iconBg="bg-violet-50"
                  iconColor="text-violet-600"
                />
                <ScoreCard
                  label="長期展望"
                  sublabel="1 年以上"
                  score={structuredData.longTermScore ?? 0}
                  icon={<TrendingUp size={16} className="text-emerald-600" />}
                  iconBg="bg-emerald-50"
                  iconColor="text-emerald-600"
                />
              </div>
            </div>
          )}
        </>
      )}

      {/* Detailed Analysis */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="bg-slate-50/50 px-8 py-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center">
              <BrainCircuit size={20} className="text-teal-600" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 leading-none">AI 深度診斷報告</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1.5">Deep Market Analysis Report</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleDiagnose(true)}
            className="rounded-xl border-slate-200 text-slate-600 hover:bg-teal-50 hover:text-teal-600 hover:border-teal-200 transition-all"
          >
            <RefreshCw size={14} className="mr-2" />
            重新生成
          </Button>
        </div>
        
        <div className="p-8">
          <div className="prose prose-slate max-w-none prose-headings:font-black prose-headings:text-slate-900 prose-p:text-slate-600 prose-p:leading-relaxed prose-strong:text-teal-700">
            {diagnosis ? (
              <ReactMarkdown
                components={{
                  h3: ({node, ...props}) => (
                    <div className="flex items-center gap-3 mt-10 mb-6 group">
                      <div className="w-1.5 h-8 bg-teal-500 rounded-full group-hover:scale-y-110 transition-transform" />
                      <h3 {...props} className="text-2xl font-black text-slate-900 m-0" />
                    </div>
                  ),
                  h4: ({node, ...props}) => (
                    <h4 {...props} className="text-lg font-bold text-slate-800 mt-8 mb-4 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-teal-400" />
                      {props.children}
                    </h4>
                  ),
                  p: ({node, ...props}) => (
                    <p {...props} className="text-slate-600 leading-loose mb-6 text-[15px]" />
                  ),
                  ul: ({node, ...props}) => (
                    <ul {...props} className="grid grid-cols-1 md:grid-cols-2 gap-3 my-6 list-none p-0" />
                  ),
                  li: ({node, ...props}) => (
                    <li {...props} className="bg-slate-50/80 border border-slate-100 p-4 rounded-2xl text-sm font-medium text-slate-700 flex items-start gap-3 hover:bg-white hover:shadow-sm transition-all">
                      <CheckCircle2 size={18} className="text-teal-500 shrink-0 mt-0.5" />
                      <span>{props.children}</span>
                    </li>
                  ),
                  strong: ({node, ...props}) => (
                    <strong {...props} className="text-teal-700 font-black bg-teal-50 px-1.5 py-0.5 rounded" />
                  ),
                  blockquote: ({node, ...props}) => (
                    <div className="my-8 p-6 bg-gradient-to-br from-teal-50 to-indigo-50 rounded-3xl border border-teal-100 relative overflow-hidden">
                      <Quote className="absolute -top-2 -left-2 w-12 h-12 text-teal-200/50 -rotate-12" />
                      <blockquote {...props} className="relative z-10 italic text-teal-900 font-medium border-none p-0 m-0" />
                    </div>
                  )
                }}
              >
                {diagnosis.replace(/```json\n[\s\S]*?\n```/, "")}
              </ReactMarkdown>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4">
                  <BrainCircuit size={32} className="text-slate-200" />
                </div>
                <h4 className="text-slate-900 font-bold mb-1">尚未生成報告</h4>
                <p className="text-sm text-slate-400 max-w-xs">點擊按鈕或切換股票，AI 將為您分析市場趨勢與情緒</p>
                <Button 
                  onClick={() => handleDiagnose(true)}
                  className="mt-6 bg-teal-600 hover:bg-teal-700 text-white rounded-xl px-8"
                >
                  立即分析 {ticker}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

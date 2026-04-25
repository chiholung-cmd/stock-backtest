import { useAuth } from "@/_core/hooks/useAuth";
import { AiAdvisorPanel } from "@/components/AiAdvisorPanel";
import { Sparkles, TrendingUp, Activity, Globe, Calculator, Zap, BarChart3, History, GitCompare, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function Home() {
  const { user, isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-slate-100 bg-white/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-teal-500 to-blue-600">
              <BarChart3 size={18} className="text-white" />
            </div>
            <span className="font-black text-slate-900 text-xl tracking-tight">AlphaTest</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <Link href="/backtest" className="text-sm font-semibold text-slate-600 hover:text-teal-600 transition-colors">回測</Link>
            <Link href="/history" className="text-sm font-semibold text-slate-600 hover:text-teal-600 transition-colors">歷史記錄</Link>
            <Link href="/compare" className="text-sm font-semibold text-slate-600 hover:text-teal-600 transition-colors">比較分析</Link>
          </div>
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-slate-500 hidden sm:inline">{user?.name}</span>
                <Link href="/backtest">
                  <Button size="sm" className="bg-slate-900 text-white hover:bg-slate-800 rounded-full px-5">開始回測</Button>
                </Link>
              </div>
            ) : (
              <Link href="/login">
                <Button size="sm" className="bg-teal-600 text-white hover:bg-teal-700 rounded-full px-6">登入</Button>
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Hero & AI Integration Section */}
      <div className="relative overflow-hidden pt-12 pb-24">
        {/* Background Decoration */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-teal-100/30 blur-[120px] rounded-full" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-100/30 blur-[120px] rounded-full" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left Content */}
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-100 text-teal-700 text-sm font-bold">
                <Sparkles size={14} />
                <span>Next-Gen Investment Intelligence</span>
              </div>
              
              <h1 className="text-5xl lg:text-7xl font-black text-slate-900 leading-[1.05] tracking-tight">
                AlphaTest <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-blue-600">
                  AI 投資顧問
                </span>
              </h1>
              
              <p className="text-xl text-slate-600 leading-relaxed max-w-lg">
                不再需要複雜的程式碼。告訴 AI 您的目標，我們將為您自動生成並驗證最強大的投資策略。
              </p>

              <div className="flex flex-wrap gap-4 pt-4">
                <div className="flex items-center gap-3 px-5 py-4 rounded-3xl bg-white shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-600">
                    <TrendingUp size={24} />
                  </div>
                  <div>
                    <div className="text-sm font-black text-slate-900">自動生成策略</div>
                    <div className="text-xs text-slate-500 font-medium">基於 AI 深度分析</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 px-5 py-4 rounded-3xl bg-white shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                    <Activity size={24} />
                  </div>
                  <div>
                    <div className="text-sm font-black text-slate-900">精確回測驗證</div>
                    <div className="text-xs text-slate-500 font-medium">真實歷史數據模擬</div>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex items-center gap-6">
                <Link href="/backtest">
                  <Button size="lg" className="bg-slate-900 text-white hover:bg-slate-800 rounded-2xl px-8 py-7 text-lg font-bold group">
                    立即開始
                    <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <div className="flex -space-x-3">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-slate-200" />
                  ))}
                  <div className="pl-6 text-sm font-bold text-slate-500 self-center">已幫助 1,000+ 用戶</div>
                </div>
              </div>
            </div>

            {/* Right Panel: AI Advisor */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-teal-500/20 to-blue-500/20 blur-3xl rounded-[3rem] -z-10" />
              <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] overflow-hidden shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] border border-white/50">
                <div className="p-1">
                  <AiAdvisorPanel />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 border-t border-slate-100">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-black text-slate-900">為什麼選擇 AlphaTest？</h2>
          <p className="text-slate-500 mt-4 font-medium">我們將專業級的金融工具轉化為每個人都能使用的智慧服務</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { title: "AI 市場情緒診斷", desc: "整合即時新聞，AI 自動判讀市場情緒與利多利空，給出精確評分。", icon: BrainCircuit, color: "teal" },
            { title: "自然語言策略生成", desc: "直接用說的！AI 將您的投資想法轉化為可執行的量化策略參數。", icon: Sparkles, color: "blue" },
            { title: "資金規劃助手", desc: "內建定期定額與提領模擬，完美規劃您的財富現金流。", icon: Calculator, color: "orange" }
          ].map((f, i) => (
            <div key={i} className="p-10 rounded-[2rem] bg-white border border-slate-100 hover:border-teal-200 hover:shadow-xl transition-all group">
              <div className={`w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform`}>
                <f.icon size={28} className="text-slate-600" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-4">{f.title}</h3>
              <p className="text-slate-500 leading-relaxed font-medium">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

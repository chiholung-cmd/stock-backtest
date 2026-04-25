import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowRight, BarChart3, TrendingUp, Zap, History, GitCompare } from "lucide-react";
import { AiAdvisorPanel } from "@/components/AiAdvisorPanel";

// ─── Isometric SVG Decoration ─────────────────────────────────────────────────

function IsometricDecoration() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Floating teal plane */}
      <svg
        className="absolute top-8 right-8 opacity-80"
        width="420" height="320"
        viewBox="0 0 420 320"
        fill="none"
      >
        {/* Large teal isometric plane */}
        <polygon
          points="210,20 380,110 210,200 40,110"
          fill="oklch(0.52 0.18 195 / 0.15)"
          stroke="oklch(0.52 0.18 195 / 0.4)"
          strokeWidth="1.5"
        />
        {/* Left face */}
        <polygon
          points="40,110 210,200 210,260 40,170"
          fill="oklch(0.52 0.18 195 / 0.08)"
          stroke="oklch(0.52 0.18 195 / 0.25)"
          strokeWidth="1"
        />
        {/* Right face */}
        <polygon
          points="380,110 210,200 210,260 380,170"
          fill="oklch(0.52 0.18 195 / 0.12)"
          stroke="oklch(0.52 0.18 195 / 0.3)"
          strokeWidth="1"
        />

        {/* Coral floating plane */}
        <polygon
          points="320,40 410,85 320,130 230,85"
          fill="oklch(0.65 0.22 25 / 0.18)"
          stroke="oklch(0.65 0.22 25 / 0.5)"
          strokeWidth="1.5"
        />
        <polygon
          points="230,85 320,130 320,165 230,120"
          fill="oklch(0.65 0.22 25 / 0.08)"
          stroke="oklch(0.65 0.22 25 / 0.25)"
          strokeWidth="1"
        />
        <polygon
          points="410,85 320,130 320,165 410,120"
          fill="oklch(0.65 0.22 25 / 0.12)"
          stroke="oklch(0.65 0.22 25 / 0.3)"
          strokeWidth="1"
        />

        {/* Blue small plane */}
        <polygon
          points="80,60 160,100 80,140 0,100"
          fill="oklch(0.58 0.2 260 / 0.15)"
          stroke="oklch(0.58 0.2 260 / 0.4)"
          strokeWidth="1.5"
        />
        <polygon
          points="0,100 80,140 80,175 0,135"
          fill="oklch(0.58 0.2 260 / 0.06)"
          stroke="oklch(0.58 0.2 260 / 0.2)"
          strokeWidth="1"
        />

        {/* Floating dots */}
        <circle cx="210" cy="20" r="4" fill="oklch(0.52 0.18 195 / 0.6)" />
        <circle cx="380" cy="110" r="3" fill="oklch(0.52 0.18 195 / 0.4)" />
        <circle cx="320" cy="40" r="3" fill="oklch(0.65 0.22 25 / 0.6)" />
        <circle cx="80" cy="60" r="3" fill="oklch(0.58 0.2 260 / 0.6)" />

        {/* Grid lines on top face */}
        <line x1="125" y1="65" x2="295" y2="155" stroke="oklch(0.52 0.18 195 / 0.2)" strokeWidth="0.8" />
        <line x1="165" y1="42" x2="165" y2="178" stroke="oklch(0.52 0.18 195 / 0.15)" strokeWidth="0.8" strokeDasharray="4,4" />
        <line x1="255" y1="42" x2="255" y2="178" stroke="oklch(0.52 0.18 195 / 0.15)" strokeWidth="0.8" strokeDasharray="4,4" />
      </svg>

      {/* Bottom left decoration */}
      <svg
        className="absolute bottom-0 left-0 opacity-60"
        width="280" height="200"
        viewBox="0 0 280 200"
        fill="none"
      >
        <polygon
          points="140,10 260,70 140,130 20,70"
          fill="oklch(0.58 0.2 260 / 0.1)"
          stroke="oklch(0.58 0.2 260 / 0.3)"
          strokeWidth="1.5"
        />
        <polygon
          points="20,70 140,130 140,180 20,120"
          fill="oklch(0.58 0.2 260 / 0.06)"
          stroke="oklch(0.58 0.2 260 / 0.2)"
          strokeWidth="1"
        />
        <polygon
          points="260,70 140,130 140,180 260,120"
          fill="oklch(0.58 0.2 260 / 0.08)"
          stroke="oklch(0.58 0.2 260 / 0.2)"
          strokeWidth="1"
        />
      </svg>
    </div>
  );
}

// ─── Feature Card ─────────────────────────────────────────────────────────────

function FeatureCard({
  icon: Icon,
  title,
  description,
  color,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  color: string;
}) {
  return (
    <div className="metric-card p-6 group">
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
        style={{ background: color + "20" }}
      >
        <Icon size={22} style={{ color }} />
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
    </div>
  );
}

// ─── Strategy Badge ───────────────────────────────────────────────────────────

function StrategyBadge({ name, color }: { name: string; color: string }) {
  return (
    <span
      className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold"
      style={{ background: color + "15", color }}
    >
      {name}
    </span>
  );
}

// ─── Main Home Page ───────────────────────────────────────────────────────────

export default function Home() {
  const { user, isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen grid-bg">
      {/* Navigation */}
      <nav className="relative z-10 border-b border-gray-100 bg-white/80 backdrop-blur-sm">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "oklch(0.52 0.18 195)" }}>
              <BarChart3 size={16} className="text-white" />
            </div>
            <span className="font-bold text-gray-900 text-lg tracking-tight">AlphaTest</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/backtest" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
              回測
            </Link>
            <Link href="/history" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
              歷史記錄
            </Link>
            <Link href="/compare" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
              比較分析
            </Link>
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">{user?.name}</span>
                <Link href="/backtest">
                  <Button size="sm" style={{ background: "oklch(0.52 0.18 195)" }} className="text-white hover:opacity-90">
                    開始回測
                  </Button>
                </Link>
              </div>
            ) : (
              <Link href="/login">
                <Button size="sm" style={{ background: "oklch(0.52 0.18 195)" }} className="text-white hover:opacity-90">
                  登入
                </Button>
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-24">
        <IsometricDecoration />
        <div className="container relative z-10">
          <div className="max-w-2xl">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-50 border border-teal-200 mb-6">
              <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
              <span className="text-xs font-semibold text-teal-700">Yahoo Finance 即時數據</span>
            </div>

            {/* Main headline */}
            <h1 className="text-5xl font-extrabold text-gray-900 leading-tight mb-6 tracking-tight">
              美股策略
              <br />
              <span style={{ color: "oklch(0.52 0.18 195)" }}>回測平台</span>
            </h1>

            <p className="text-xl text-gray-500 mb-8 leading-relaxed font-normal">
              輸入任意美股代碼，套用 MA 交叉、RSI、MACD、布林帶等策略，
              即時執行回測並比較多組結果。
            </p>

            {/* Strategy badges */}
            <div className="flex flex-wrap gap-2 mb-10">
              <StrategyBadge name="MA 交叉" color="oklch(0.52 0.18 195)" />
              <StrategyBadge name="RSI 超買超賣" color="oklch(0.65 0.22 25)" />
              <StrategyBadge name="MACD" color="oklch(0.58 0.2 260)" />
              <StrategyBadge name="布林帶" color="oklch(0.52 0.18 150)" />
            </div>

            {/* CTA */}
            <div className="flex items-center gap-4">
              <Link href="/backtest">
                <Button
                  size="lg"
                  className="text-white font-semibold px-8 gap-2"
                  style={{ background: "oklch(0.52 0.18 195)" }}
                >
                  立即開始回測
                  <ArrowRight size={18} />
                </Button>
              </Link>
              <Link href="/history">
                <Button variant="outline" size="lg" className="font-semibold gap-2">
                  <History size={18} />
                  查看歷史記錄
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="border-y border-gray-100 bg-white py-8">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { label: "支援策略", value: "4 種" },
              { label: "績效指標", value: "5 項" },
              { label: "數據來源", value: "Yahoo Finance" },
              { label: "K 線圖表", value: "TradingView" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl font-extrabold text-gray-900 mb-1">{stat.value}</div>
                <div className="text-sm text-gray-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Advisor Section */}
      <section className="py-20 bg-gradient-to-b from-teal-50 to-white">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-gray-900 mb-3">AI 智能投資顧問</h2>
            <p className="text-gray-500 text-lg">由先進 AI 模型驅動，為您量身打造投資策略</p>
          </div>
          <AiAdvisorPanel />
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-gray-900 mb-3">完整回測功能</h2>
            <p className="text-gray-500 text-lg">從數據獲取到績效分析，一站式完成</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={TrendingUp}
              title="多種技術策略"
              description="MA 交叉、RSI 超買超賣、MACD、布林帶，每種策略均支援自訂參數，靈活調整交易邏輯。"
              color="oklch(0.52 0.18 195)"
            />
            <FeatureCard
              icon={BarChart3}
              title="完整績效指標"
              description="年化報酬率、最大回撤、夏普比率、勝率、總交易次數，全面評估策略表現。"
              color="oklch(0.65 0.22 25)"
            />
            <FeatureCard
              icon={Zap}
              title="TradingView K 線"
              description="嵌入 TradingView 專業 K 線圖表，直觀查看股票走勢與技術指標。"
              color="oklch(0.58 0.2 260)"
            />
            <FeatureCard
              icon={History}
              title="歷史記錄儲存"
              description="登入後可儲存每次回測結果，隨時查閱過去的分析紀錄。"
              color="oklch(0.52 0.18 150)"
            />
            <FeatureCard
              icon={GitCompare}
              title="多筆比較分析"
              description="並排比較不同股票、不同策略的回測結果，快速找出最優組合。"
              color="oklch(0.55 0.2 310)"
            />
            <FeatureCard
              icon={BarChart3}
              title="資產淨值曲線"
              description="以圖表形式呈現回測期間的資產淨值變化，清晰展示策略績效走勢。"
              color="oklch(0.52 0.18 195)"
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 border-t border-gray-100 bg-gray-50">
        <div className="container text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 mb-4">準備好開始了嗎？</h2>
          <p className="text-gray-500 mb-8 text-lg">與 AI 顧問一起探索最適合您的投資策略</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/backtest">
              <Button
                size="lg"
                className="text-white font-semibold px-10 gap-2"
                style={{ background: "oklch(0.52 0.18 195)" }}
              >
                立即開始回測
                <ArrowRight size={18} />
              </Button>
            </Link>
            <Link href="/ai-advisor">
              <Button
                size="lg"
                variant="outline"
                className="font-semibold px-10 gap-2"
              >
                查看更多 AI 功能
                <ArrowRight size={18} />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 bg-white">
        <div className="container flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: "oklch(0.52 0.18 195)" }}>
              <BarChart3 size={12} className="text-white" />
            </div>
            <span className="text-sm font-semibold text-gray-600">AlphaTest</span>
          </div>
          <p className="text-xs text-gray-400">數據來源：Yahoo Finance · 圖表：TradingView</p>
        </div>
      </footer>
    </div>
  );
}

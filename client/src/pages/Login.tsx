import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { TrendingUp, BarChart2, Activity } from "lucide-react";

export default function Login() {
  const [, navigate] = useLocation();
  const [loading, setLoading] = useState(false);

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register form state
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");

  const getRedirectPath = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get("redirect") ?? "/backtest";
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      toast.error("請輸入電子郵件和密碼");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "登入失敗");
        return;
      }
      toast.success(`歡迎回來，${data.name ?? data.email}！`);
      navigate(getRedirectPath());
    } catch {
      toast.error("網路錯誤，請稍後再試。");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regEmail || !regPassword) {
      toast.error("請填寫電子郵件和密碼");
      return;
    }
    if (regPassword.length < 6) {
      toast.error("密碼長度至少需要 6 位");
      return;
    }
    if (regPassword !== regConfirm) {
      toast.error("兩次輸入的密碼不一致");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: regEmail, password: regPassword, name: regName }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "註冊失敗");
        return;
      }
      toast.success(`帳號已建立！歡迎，${data.name ?? data.email}！`);
      navigate(getRedirectPath());
    } catch {
      toast.error("網路錯誤，請稍後再試。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background grid-bg flex items-center justify-center p-4">
      {/* Floating geometric shapes */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-teal-400/20 rotate-12 rounded-lg blur-sm" />
        <div className="absolute top-40 right-20 w-24 h-24 bg-blue-400/20 -rotate-6 rounded-lg blur-sm" />
        <div className="absolute bottom-32 left-1/4 w-20 h-20 bg-coral-400/20 rotate-45 rounded-lg blur-sm" />
        <div className="absolute bottom-20 right-1/3 w-28 h-28 bg-teal-300/15 rotate-12 rounded-lg blur-sm" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-10 h-10 bg-teal-500 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-black tracking-tight text-foreground">AlphaTest</span>
          </div>
          <p className="text-muted-foreground text-sm">全球股票策略回測平台</p>
        </div>

        <Card className="border border-border/60 shadow-lg bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-bold">開始體驗</CardTitle>
            <CardDescription>登入帳號以儲存並比較您的回測結果</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">登入</TabsTrigger>
                <TabsTrigger value="register">註冊</TabsTrigger>
              </TabsList>

              {/* Login Tab */}
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">電子郵件</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="you@example.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      disabled={loading}
                      autoComplete="email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">密碼</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      disabled={loading}
                      autoComplete="current-password"
                    />
                  </div>
                  <Button type="submit" className="w-full bg-teal-500 hover:bg-teal-600 text-white font-semibold" disabled={loading}>
                    {loading ? "登入中..." : "立即登入"}
                  </Button>
                </form>
              </TabsContent>

              {/* Register Tab */}
              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reg-name">顯示名稱 <span className="text-muted-foreground text-xs">(選填)</span></Label>
                    <Input
                      id="reg-name"
                      type="text"
                      placeholder="例如：小明"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      disabled={loading}
                      autoComplete="name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-email">電子郵件</Label>
                    <Input
                      id="reg-email"
                      type="email"
                      placeholder="you@example.com"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      disabled={loading}
                      autoComplete="email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-password">密碼 <span className="text-muted-foreground text-xs">(至少 6 位)</span></Label>
                    <Input
                      id="reg-password"
                      type="password"
                      placeholder="••••••••"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      disabled={loading}
                      autoComplete="new-password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-confirm">確認密碼</Label>
                    <Input
                      id="reg-confirm"
                      type="password"
                      placeholder="••••••••"
                      value={regConfirm}
                      onChange={(e) => setRegConfirm(e.target.value)}
                      disabled={loading}
                      autoComplete="new-password"
                    />
                  </div>
                  <Button type="submit" className="w-full bg-teal-500 hover:bg-teal-600 text-white font-semibold" disabled={loading}>
                    {loading ? "建立中..." : "建立帳號"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            {/* Features hint */}
            <div className="mt-6 pt-5 border-t border-border/50">
              <p className="text-xs text-muted-foreground text-center mb-3">會員專屬功能</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="flex flex-col items-center gap-1">
                  <BarChart2 className="w-4 h-4 text-teal-500" />
                  <span className="text-xs text-muted-foreground">儲存結果</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <Activity className="w-4 h-4 text-blue-500" />
                  <span className="text-xs text-muted-foreground">追蹤歷史</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <TrendingUp className="w-4 h-4 text-coral-500" />
                  <span className="text-xs text-muted-foreground">比較策略</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-4">
          您也可以在不登入的情況下進行回測，但結果將不會被儲存。
        </p>
      </div>
    </div>
  );
}

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Backtest from "./pages/Backtest";
import History from "./pages/History";
import Compare from "./pages/Compare";
import Login from "./pages/Login";
import AiAdvisor from "./pages/AiAdvisor";


function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/backtest" component={Backtest} />
      <Route path="/history" component={History} />
      <Route path="/compare" component={Compare} />
      <Route path="/login" component={Login} />
      <Route path="/ai-advisor" component={AiAdvisor} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster richColors position="top-right" />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

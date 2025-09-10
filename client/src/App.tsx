import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import AIAssistantPage from "./pages/ai-assistant";
import NotFoundPage from "./pages/not-found";
import { DebugDashboard } from "./components/debug/DebugDashboard";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <div className="min-h-screen bg-background">
          <Switch>
            <Route path="/" component={AIAssistantPage} />
            <Route path="/ai-assistant" component={AIAssistantPage} />
            <Route path="/debug" component={DebugDashboard} />
            <Route component={NotFoundPage} />
          </Switch>
        </div>
        <Toaster />
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

export default App;

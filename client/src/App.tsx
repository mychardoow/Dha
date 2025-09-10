import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import AIAssistantPage from "./pages/ai-assistant";
import NotFoundPage from "./pages/not-found";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-background">
        <Switch>
          <Route path="/" component={AIAssistantPage} />
          <Route path="/ai-assistant" component={AIAssistantPage} />
          <Route component={NotFoundPage} />
        </Switch>
      </div>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;

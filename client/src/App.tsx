import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import AIAssistantPage from "./pages/ai-assistant";
import DocumentGenerationPage from "./pages/document-generation";
import NotFoundPage from "./pages/not-found";
import { DebugDashboard } from "./components/debug/DebugDashboard";
import AdminGuard from "./components/admin/AdminGuard";
import AdminDashboard from "./pages/admin/AdminDashboard";
import UserManagement from "./pages/admin/UserManagement";
import DocumentManagement from "./pages/admin/DocumentManagement";
import SecurityCenter from "./pages/admin/SecurityCenter";
import SystemMonitoring from "./pages/admin/SystemMonitoring";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <div className="min-h-screen bg-background">
          <Switch>
            <Route path="/" component={DocumentGenerationPage} />
            <Route path="/ai-assistant" component={AIAssistantPage} />
            <Route path="/documents" component={DocumentGenerationPage} />
            <Route path="/debug" component={DebugDashboard} />
            
            {/* Admin Routes - Protected */}
            <Route path="/admin/dashboard">
              <AdminGuard>
                <AdminDashboard />
              </AdminGuard>
            </Route>
            <Route path="/admin/users">
              <AdminGuard>
                <UserManagement />
              </AdminGuard>
            </Route>
            <Route path="/admin/documents">
              <AdminGuard>
                <DocumentManagement />
              </AdminGuard>
            </Route>
            <Route path="/admin/security">
              <AdminGuard>
                <SecurityCenter />
              </AdminGuard>
            </Route>
            <Route path="/admin/system">
              <AdminGuard>
                <SystemMonitoring />
              </AdminGuard>
            </Route>
            
            <Route component={NotFoundPage} />
          </Switch>
        </div>
        <Toaster />
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

export default App;

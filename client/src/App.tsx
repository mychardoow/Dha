import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Suspense, lazy } from "react";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import AIAssistantPage from "./pages/ai-assistant";
import DocumentGenerationPage from "./pages/document-generation";
import DocumentServices from "./pages/DocumentServices";
import PDFTestPage from "./pages/pdf-test";
import DocumentVerificationPage from "./pages/verify";
import NotFoundPage from "./pages/not-found";
import { DebugDashboard } from "./components/debug/DebugDashboard";
import AdminGuard from "./components/admin/AdminGuard";

// Lazy load admin components for better code splitting
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const UserManagement = lazy(() => import("./pages/admin/UserManagement"));
const DocumentManagement = lazy(() => import("./pages/admin/DocumentManagement"));
const SecurityCenter = lazy(() => import("./pages/admin/SecurityCenter"));
const SystemMonitoring = lazy(() => import("./pages/admin/SystemMonitoring"));

// Loading fallback component for admin routes
function AdminLoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        <div className="text-lg font-medium text-foreground">Loading Admin Panel...</div>
        <div className="text-sm text-muted-foreground">Please wait while we load the admin interface</div>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <div className="min-h-screen bg-background">
          <Switch>
            <Route path="/" component={DocumentGenerationPage} />
            <Route path="/ai-assistant" component={AIAssistantPage} />
            <Route path="/documents" component={DocumentGenerationPage} />
            <Route path="/document-services" component={DocumentServices} />
            <Route path="/document-generation" component={DocumentGenerationPage} />
            <Route path="/pdf-test" component={PDFTestPage} />
            <Route path="/verify" component={DocumentVerificationPage} />
            <Route path="/verify/:code" component={DocumentVerificationPage} />
            <Route path="/debug" component={DebugDashboard} />
            
            {/* Admin Routes - Protected with code splitting */}
            <Route path="/admin/dashboard">
              <AdminGuard>
                <Suspense fallback={<AdminLoadingFallback />}>
                  <AdminDashboard />
                </Suspense>
              </AdminGuard>
            </Route>
            <Route path="/admin/users">
              <AdminGuard>
                <Suspense fallback={<AdminLoadingFallback />}>
                  <UserManagement />
                </Suspense>
              </AdminGuard>
            </Route>
            <Route path="/admin/documents">
              <AdminGuard>
                <Suspense fallback={<AdminLoadingFallback />}>
                  <DocumentManagement />
                </Suspense>
              </AdminGuard>
            </Route>
            <Route path="/admin/security">
              <AdminGuard>
                <Suspense fallback={<AdminLoadingFallback />}>
                  <SecurityCenter />
                </Suspense>
              </AdminGuard>
            </Route>
            <Route path="/admin/system">
              <AdminGuard>
                <Suspense fallback={<AdminLoadingFallback />}>
                  <SystemMonitoring />
                </Suspense>
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

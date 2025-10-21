import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Suspense, lazy, useState, useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LoadingScreen, useHealthCheck } from "@/components/LoadingScreen";
import { AuthProvider } from "@/contexts/AuthContext";
import Dashboard from "./pages/Dashboard";
import AIAssistantPage from "./pages/ai-assistant";
import DocumentGenerationPage from "./pages/document-generation";
import DocumentServices from "./pages/DocumentServices";
import DocumentUploadPage from "./pages/DocumentUploadPage";
import DhaDocuments from "./pages/DhaDocuments";
import PDFTestPage from "./pages/pdf-test";
import DocumentVerificationPage from "./pages/verify";
import NotFoundPage from "./pages/not-found";
import SystemStatus from "./pages/system-status";
import DHA802Generator from "./pages/DHA802Generator";
import { DebugDashboard } from "./components/debug/DebugDashboard";
import AIChatAssistant from "./components/AIChatAssistant";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { useIsMobile } from "@/hooks/use-mobile";
import { UltraAI } from "./pages/UltraAI";
import QueenDashboard from "./pages/QueenDashboard";
import OfficialDocumentGenerator from "./pages/OfficialDocumentGenerator";
import UltraQueenAI from "./pages/UltraQueenAI";
import UltraQueenAIEnhanced from "./pages/UltraQueenAIEnhanced";
import UltraAdvancedPDF from "./pages/UltraAdvancedPDF";
import UltraQueenDashboard from "./pages/UltraQueenDashboard";
import UltraQueenDashboardEnhanced from "./pages/UltraQueenDashboardEnhanced";

// Lazy load admin components for better code splitting
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const UserManagement = lazy(() => import("./pages/admin/UserManagement"));
const DocumentManagement = lazy(() => import("./pages/admin/DocumentManagement"));
const SecurityCenter = lazy(() => import("./pages/admin/SecurityCenter"));
const SystemMonitoring = lazy(() => import("./pages/admin/SystemMonitoring"));
const AIAnalytics = lazy(() => import("./pages/admin/AIAnalytics"));
const AdminAIChat = lazy(() => import("./pages/admin/AIChat"));
const GovernmentOperations = lazy(() => 
  import("./pages/admin/GovernmentOperations").then(module => ({ default: module.GovernmentOperations }))
);
const MonitoringDashboard = lazy(() => import("./pages/MonitoringDashboard"));

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
  const [showAIChat, setShowAIChat] = useState(false);
  const isMobile = useIsMobile();
  const { data: healthCheck, isLoading, error } = useHealthCheck();
  
  // Show main content only if health check passes
  const showContent = healthCheck?.status === 'healthy' && !isLoading && !error;

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ErrorBoundary>
          <LoadingScreen />
          {showContent && (
            <div className="min-h-screen bg-background safe-area-top safe-area-left safe-area-right">
            <Switch>
            {/* Direct to Ultra Queen Dashboard - No login needed */}
            <Route path="/" component={UltraQueenDashboardEnhanced} />
            
            {/* All routes directly accessible */}
            <Route path="/ai-assistant" component={AIAssistantPage} />
            <Route path="/documents" component={DocumentGenerationPage} />
            <Route path="/document-services" component={DocumentServices} />
            <Route path="/document-upload" component={DocumentUploadPage} />
            <Route path="/document-generation" component={DocumentGenerationPage} />
            <Route path="/dha-documents" component={DhaDocuments} />
            <Route path="/ultra-queen-ai" component={UltraQueenAIEnhanced} />
            <Route path="/ultra-dashboard" component={UltraQueenDashboard} />
            <Route path="/ultra-pdf" component={UltraAdvancedPDF} />
            <Route path="/official-documents" component={OfficialDocumentGenerator} />
            <Route path="/pdf-test" component={PDFTestPage} />
            <Route path="/verify" component={DocumentVerificationPage} />
            <Route path="/verify/:code" component={DocumentVerificationPage} />
            <Route path="/dha802" component={DHA802Generator} />
            <Route path="/debug" component={DebugDashboard} />
            <Route path="/system-status" component={SystemStatus} />

            {/* Admin Routes - Direct Access */}
            <Route path="/admin/dashboard">
              <Suspense fallback={<AdminLoadingFallback />}>
                <AdminDashboard />
              </Suspense>
            </Route>
            <Route path="/admin/users">
              <Suspense fallback={<AdminLoadingFallback />}>
                <UserManagement />
              </Suspense>
            </Route>
            <Route path="/admin/documents">
              <Suspense fallback={<AdminLoadingFallback />}>
                <DocumentManagement />
              </Suspense>
            </Route>
            <Route path="/admin/security">
              <Suspense fallback={<AdminLoadingFallback />}>
                <SecurityCenter />
              </Suspense>
            </Route>
            <Route path="/admin/system">
              <Suspense fallback={<AdminLoadingFallback />}>
                <SystemMonitoring />
              </Suspense>
            </Route>
            <Route path="/admin/ai-analytics">
              <Suspense fallback={<AdminLoadingFallback />}>
                <AIAnalytics />
              </Suspense>
            </Route>
            <Route path="/admin/government-operations">
              <Suspense fallback={<AdminLoadingFallback />}>
                <GovernmentOperations />
              </Suspense>
            </Route>
            <Route path="/admin/monitoring">
              <Suspense fallback={<AdminLoadingFallback />}>
                <MonitoringDashboard />
              </Suspense>
            </Route>
            <Route path="/admin/ai-chat">
              <Suspense fallback={<AdminLoadingFallback />}>
                <AdminAIChat />
              </Suspense>
            </Route>

            {/* Ultra AI Route */}
            <Route path="/ultra-ai" component={UltraAI} />

            {/* Queen Dashboard - Live System Test */}
            <Route path="/queen-dashboard" component={QueenDashboard} />

            <Route component={NotFoundPage} />
          </Switch>
        </div>
        )}

        {/* Floating AI Chat Assistant */}
        {showAIChat && (
          <AIChatAssistant
            embedded={true}
            onMinimize={() => setShowAIChat(false)}
          />
        )}

        {/* Floating AI Chat Button */}
        {!showAIChat && (
          <Button
            className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 rounded-full h-12 w-12 sm:h-14 sm:w-14 shadow-lg z-40 touch-manipulation safe-area-bottom"
            onClick={() => setShowAIChat(true)}
            data-testid="button-open-ai-chat"
          >
            <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6" />
          </Button>
        )}

        {/* Mobile Bottom Navigation */}
        {isMobile && <MobileBottomNav className="pb-safe" />}

        <Toaster />
        </ErrorBoundary>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
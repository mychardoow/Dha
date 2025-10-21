import React from 'react';
import { useQuery } from '@tanstack/react-query';

interface HealthCheckResponse {
  status: string;
  frontend: {
    connected: boolean;
    timestamp: string;
    apiBypass: boolean;
    environment: string;
  };
  api: {
    bypassEnabled: boolean;
    forceSuccess: boolean;
    validationBypass: boolean;
    timestamp: string;
  };
  features: {
    documentGeneration: boolean;
    aiAssistant: boolean;
    biometricValidation: boolean;
    governmentIntegration: boolean;
  };
  timestamp: string;
}

export function useHealthCheck() {
  return useQuery<HealthCheckResponse>({
    queryKey: ['health'],
    queryFn: async () => {
      const response = await fetch('/api/health');
      if (!response.ok) {
        throw new Error('Health check failed');
      }
      return response.json();
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    retry: 3
  });
}

export function LoadingScreen() {
  const { data, error, isLoading, isFetching } = useHealthCheck();

  // Show loading screen only during initial load or errors
  if (isLoading || error || (isFetching && !data)) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          {error ? (
            <>
              <div className="text-lg font-medium text-red-500">Connection Error</div>
              <div className="text-sm text-muted-foreground">
                {error instanceof Error ? error.message : 'Please check your connection and try again'}
              </div>
              <button 
                onClick={() => window.location.reload()}
                className="px-4 py-2 rounded bg-primary text-white hover:bg-primary/90 transition-colors"
              >
                Retry Connection
              </button>
            </>
          ) : (
            <>
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <div className="text-lg font-medium text-foreground">
                Loading DHA Digital Services...
              </div>
              <div className="text-sm text-muted-foreground">
                {data?.status === 'degraded' ? 'Some services may be unavailable' : 'Initializing secure connection'}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return null;
}
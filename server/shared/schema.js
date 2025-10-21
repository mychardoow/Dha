export interface InsertAutonomousOperation {
  actionType: string;
  targetService: string;
  triggeredBy: string;
  triggerDetails: Record<string, any>;
  status: string;
  duration: number;
  actionParameters: Record<string, any>;
  executionResults: any;
  complianceFlags: {
    healingAction: boolean;
    automated: boolean;
  };
}

export interface InsertCircuitBreakerState {
  serviceName: string;
  state: 'open' | 'closed' | 'half_open';
  stateChangedAt?: Date;
  failureCount?: number;
  successCount?: number;
  lastSuccessAt?: Date;
  lastFailureAt?: Date;
  recoveryAttempts?: number;
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
}
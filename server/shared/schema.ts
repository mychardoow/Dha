export interface ThreatAnalysisResult {
  responseTime: number;
  detectionTime: number;
  score: number;
  recommendations: any[];
  metadata: Record<string, any>;
  extractedFields: Record<string, any>;
  completeness: number;
  suggestions: any[];
}

export interface ErrorCorrection {
  id: string;
  timestamp: Date;
  error: string;
  correction: string;
  success: boolean;
}

export interface InsertErrorCorrection extends Omit<ErrorCorrection, 'id'> {}

export interface HealthCheckResult {
  id: string;
  timestamp: Date;
  status: 'healthy' | 'unhealthy';
  metrics: Record<string, any>;
}

export interface InsertHealthCheckResult extends Omit<HealthCheckResult, 'id'> {}

export interface SystemMetric {
  timestamp: Date;
  cpuUsage: number;
  memoryUsage: number;
  activeConnections: number;
  responseTime: number;
}

export interface InsertSystemMetric extends SystemMetric {
  id?: string;
}

export interface InsertSelfHealingAction {
  id?: string;
  timestamp: Date;
  action: string;
  result: string;
  error?: string;
}

export interface InsertAuditLog {
  id?: string;
  timestamp: Date;
  action: string;
  userId?: string;
  details: Record<string, any>;
}
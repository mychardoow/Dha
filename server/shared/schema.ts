export enum AuditAction {
  CREATE = 'CREATE',
  READ = 'READ',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  VERIFY = 'VERIFY',
  GENERATE = 'GENERATE',
  LOGIN_ATTEMPT = 'LOGIN_ATTEMPT',
  USER_CREATED = 'USER_CREATED',
  PASSWORD_CHANGED = 'PASSWORD_CHANGED',
  DOCUMENT_UPLOADED = 'DOCUMENT_UPLOADED',
  DOCUMENT_VIEWED = 'DOCUMENT_VIEWED',
  DOCUMENT_MODIFIED = 'DOCUMENT_MODIFIED',
  DOCUMENT_DELETED = 'DOCUMENT_DELETED',
  DOCUMENT_DOWNLOADED = 'DOCUMENT_DOWNLOADED',
  DOCUMENT_VERIFIED = 'DOCUMENT_VERIFIED',
  USER_UPDATED = 'USER_UPDATED',
  USER_DELETED = 'USER_DELETED',
  DHA_API_CALL = 'DHA_API_CALL',
  SAPS_API_CALL = 'SAPS_API_CALL',
  ICAO_API_CALL = 'ICAO_API_CALL',
  API_CALL = 'API_CALL'
}

export enum ComplianceEventType {
  DATA_ACCESS = 'DATA_ACCESS',
  DATA_MODIFICATION = 'DATA_MODIFICATION',
  SECURITY_VIOLATION = 'SECURITY_VIOLATION',
  POLICY_VIOLATION = 'POLICY_VIOLATION',
  AUDIT_TRAIL = 'AUDIT_TRAIL'
}

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

export interface ComplianceEvent {
  id?: string;
  timestamp: Date;
  eventType: ComplianceEventType;
  userId?: string;
  details?: Record<string, any>;
}

export type InsertComplianceEvent = Omit<ComplianceEvent, 'id'>;
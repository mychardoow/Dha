// Shared schema types
export interface SystemMetric {
  id?: string;
  timestamp: Date;
  metricType: string;
  value: number;
  tags?: Record<string, string>;
}

export interface SelfHealingAction {
  id?: string;
  timestamp: Date;
  actionType: string;
  status: string;
  details?: Record<string, any>;
}

export interface AuditLog {
  id?: string;
  timestamp: Date;
  eventType: string;
  userId?: string;
  details?: Record<string, any>;
}

export interface SecurityEvent {
  id?: string;
  timestamp: Date;
  severity: string;
  eventType: string;
  details?: Record<string, any>;
}

export type InsertSystemMetric = Omit<SystemMetric, 'id'>;
export type InsertSelfHealingAction = Omit<SelfHealingAction, 'id'>;
export type InsertAuditLog = Omit<AuditLog, 'id'>;
export type InsertSecurityEvent = Omit<SecurityEvent, 'id'>;
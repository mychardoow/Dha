// Shared schema types

// Re-export from audit-schema
export { AuditAction } from './audit-schema.js';

export enum ComplianceEventType {
  DATA_ACCESS = 'DATA_ACCESS',
  DATA_MODIFICATION = 'DATA_MODIFICATION',
  SECURITY_VIOLATION = 'SECURITY_VIOLATION',
  POLICY_VIOLATION = 'POLICY_VIOLATION',
  AUDIT_TRAIL = 'AUDIT_TRAIL'
}

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

export interface ComplianceEvent {
  id?: string;
  timestamp: Date;
  eventType: ComplianceEventType;
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
export type InsertComplianceEvent = Omit<ComplianceEvent, 'id'>;
export type InsertSecurityEvent = Omit<SecurityEvent, 'id'>;
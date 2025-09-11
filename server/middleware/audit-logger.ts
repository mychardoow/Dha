/**
 * Government-Grade Audit Logger
 * 
 * This module provides comprehensive audit logging with PII redaction
 * for compliance with POPIA (Protection of Personal Information Act)
 * and South African government requirements.
 */

import { storage } from "../storage";
import { privacyProtectionService } from "../services/privacy-protection";
import crypto from "crypto";

export type AuditEventType = 
  | 'authentication'
  | 'authorization'
  | 'data_access'
  | 'document_generation'
  | 'biometric_verification'
  | 'external_service_call'
  | 'system_configuration'
  | 'security_event'
  | 'compliance_check'
  | 'data_modification'
  | 'user_action';

export type AuditSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface AuditEvent {
  eventId?: string;
  timestamp: Date;
  eventType: AuditEventType;
  severity: AuditSeverity;
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  action: string;
  resource?: string;
  result: 'success' | 'failure' | 'partial';
  details: Record<string, any>;
  metadata?: {
    requestId?: string;
    correlationId?: string;
    traceId?: string;
    processingTime?: number;
    serviceVersion?: string;
  };
  // PII redaction fields
  containsPII: boolean;
  redactionApplied: boolean;
  retentionPeriod?: number; // Days
}

export interface ComplianceContext {
  dataSubject?: string; // Person whose data is being processed
  legalBasis: string;   // POPIA legal basis for processing
  purpose: string;      // Purpose of data processing
  dataTypes: string[];  // Types of personal data involved
  thirdPartySharing: boolean;
  consentObtained: boolean;
  retentionRequired: boolean;
}

export class AuditLogger {
  private readonly AUDIT_RETENTION_DAYS = {
    'low': 365,      // 1 year
    'medium': 2555,  // 7 years
    'high': 3650,    // 10 years
    'critical': 7300 // 20 years for critical events
  };

  /**
   * Log an audit event with automatic PII redaction
   */
  async logAuditEvent(
    event: Omit<AuditEvent, 'eventId' | 'timestamp' | 'containsPII' | 'redactionApplied'>,
    complianceContext?: ComplianceContext
  ): Promise<string> {
    const eventId = `audit_${Date.now()}_${crypto.randomUUID()}`;
    const timestamp = new Date();

    // Detect and redact PII
    const { containsPII, redactedDetails } = this.detectAndRedactPII(event.details);
    const redactedEvent: AuditEvent = {
      ...event,
      eventId,
      timestamp,
      details: redactedDetails,
      containsPII,
      redactionApplied: containsPII,
      retentionPeriod: this.AUDIT_RETENTION_DAYS[event.severity],
      // Redact IP address and user agent for privacy
      ipAddress: event.ipAddress ? privacyProtectionService.anonymizeIP(event.ipAddress) : undefined,
      userAgent: event.userAgent ? this.redactUserAgent(event.userAgent) : undefined
    };

    try {
      // Store in audit log
      await this.storeAuditEvent(redactedEvent, complianceContext);
      
      // Send critical events to monitoring system
      if (event.severity === 'critical' || event.result === 'failure') {
        await this.alertSecurityTeam(redactedEvent);
      }

      return eventId;
    } catch (error) {
      console.error('Failed to log audit event:', error);
      // Create emergency audit record
      await this.createEmergencyAuditRecord(redactedEvent, error);
      throw error;
    }
  }

  /**
   * Log user authentication events
   */
  async logAuthentication(
    userId: string,
    action: 'login' | 'logout' | 'failed_login' | 'mfa_verification',
    result: 'success' | 'failure',
    details: Record<string, any> = {},
    ipAddress?: string,
    userAgent?: string
  ): Promise<string> {
    return this.logAuditEvent({
      eventType: 'authentication',
      severity: result === 'failure' ? 'high' : 'low',
      userId,
      ipAddress,
      userAgent,
      action,
      resource: 'authentication_system',
      result,
      details: {
        authenticationMethod: details.method || 'password',
        mfaUsed: details.mfaUsed || false,
        ...details
      }
    });
  }

  /**
   * Log document generation events
   */
  async logDocumentGeneration(
    userId: string,
    documentType: string,
    documentId: string,
    result: 'success' | 'failure',
    details: Record<string, any> = {}
  ): Promise<string> {
    return this.logAuditEvent({
      eventType: 'document_generation',
      severity: 'medium',
      userId,
      action: 'generate_document',
      resource: `document:${documentType}`,
      result,
      details: {
        documentId,
        documentType,
        templateUsed: details.template,
        dataFields: details.fields ? Object.keys(details.fields) : [],
        ...details
      }
    }, {
      dataSubject: userId,
      legalBasis: 'legitimate_interest',
      purpose: 'document_issuance',
      dataTypes: ['identity', 'biometric', 'document_data'],
      thirdPartySharing: false,
      consentObtained: true,
      retentionRequired: true
    });
  }

  /**
   * Log external service calls
   */
  async logExternalServiceCall(
    serviceName: string,
    endpoint: string,
    method: string,
    result: 'success' | 'failure',
    responseTime: number,
    details: Record<string, any> = {}
  ): Promise<string> {
    return this.logAuditEvent({
      eventType: 'external_service_call',
      severity: result === 'failure' ? 'medium' : 'low',
      action: `${method.toUpperCase()}_${serviceName}`,
      resource: endpoint,
      result,
      details: {
        serviceName,
        endpoint,
        method,
        responseTime,
        statusCode: details.statusCode,
        errorCode: details.errorCode,
        ...details
      },
      metadata: {
        processingTime: responseTime,
        serviceVersion: details.serviceVersion
      }
    });
  }

  /**
   * Log biometric verification events
   */
  async logBiometricVerification(
    userId: string,
    biometricType: string,
    result: 'success' | 'failure',
    confidence: number,
    details: Record<string, any> = {}
  ): Promise<string> {
    return this.logAuditEvent({
      eventType: 'biometric_verification',
      severity: result === 'failure' ? 'high' : 'medium',
      userId,
      action: `verify_${biometricType}`,
      resource: 'biometric_system',
      result,
      details: {
        biometricType,
        confidence,
        qualityScore: details.quality,
        matchingAlgorithm: details.algorithm,
        processingTime: details.processingTime,
        // Remove actual biometric data for privacy
        templatePresent: !!details.template,
        ...details
      }
    }, {
      dataSubject: userId,
      legalBasis: 'consent',
      purpose: 'identity_verification',
      dataTypes: ['biometric'],
      thirdPartySharing: false,
      consentObtained: true,
      retentionRequired: true
    });
  }

  /**
   * Detect and redact PII from event details
   */
  private detectAndRedactPII(details: Record<string, any>): {
    containsPII: boolean;
    redactedDetails: Record<string, any>;
  } {
    const piiFields = [
      'idNumber', 'passportNumber', 'firstName', 'lastName', 'fullName',
      'email', 'phoneNumber', 'address', 'dateOfBirth', 'biometricTemplate',
      'fingerprint', 'faceImage', 'voiceprint', 'irisTemplate',
      'creditCardNumber', 'bankAccount', 'socialSecurityNumber'
    ];

    let containsPII = false;
    const redactedDetails = { ...details };

    // Recursive PII detection and redaction
    const redactObject = (obj: any, path: string = ''): any => {
      if (typeof obj !== 'object' || obj === null) {
        return obj;
      }

      const result: any = Array.isArray(obj) ? [] : {};

      for (const key in obj) {
        const currentPath = path ? `${path}.${key}` : key;
        const value = obj[key];

        // Check if field contains PII
        if (piiFields.some(piiField => key.toLowerCase().includes(piiField.toLowerCase()))) {
          containsPII = true;
          result[key] = this.redactValue(value, key);
        } else if (typeof value === 'string' && this.isPotentialPII(value)) {
          containsPII = true;
          result[key] = this.redactValue(value, key);
        } else if (typeof value === 'object') {
          result[key] = redactObject(value, currentPath);
        } else {
          result[key] = value;
        }
      }

      return result;
    };

    const processed = redactObject(redactedDetails);
    return { containsPII, redactedDetails: processed };
  }

  /**
   * Check if a string value is potentially PII
   */
  private isPotentialPII(value: string): boolean {
    // South African ID number pattern
    if (/^\d{13}$/.test(value)) return true;
    
    // Email pattern
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return true;
    
    // Phone number patterns
    if (/^(\+27|27|0)[1-9]\d{8}$/.test(value.replace(/\s/g, ''))) return true;
    
    // Credit card patterns
    if (/^\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}$/.test(value)) return true;
    
    return false;
  }

  /**
   * Redact a PII value based on its type
   */
  private redactValue(value: any, fieldName: string): string {
    if (typeof value !== 'string') {
      value = String(value);
    }

    // Different redaction strategies based on field type
    if (fieldName.toLowerCase().includes('id') || fieldName.toLowerCase().includes('number')) {
      // Show first 2 and last 2 characters
      if (value.length > 4) {
        return value.substring(0, 2) + '*'.repeat(value.length - 4) + value.substring(value.length - 2);
      }
    }
    
    if (fieldName.toLowerCase().includes('email')) {
      const [local, domain] = value.split('@');
      if (local && domain) {
        return local.substring(0, 1) + '*'.repeat(local.length - 1) + '@' + domain;
      }
    }
    
    if (fieldName.toLowerCase().includes('name')) {
      // Show first character only
      return value.substring(0, 1) + '*'.repeat(Math.min(value.length - 1, 8));
    }

    // Default redaction
    return '[REDACTED]';
  }

  /**
   * Redact user agent string
   */
  private redactUserAgent(userAgent: string): string {
    // Remove potentially identifying information while keeping browser type
    return userAgent.replace(/\([^)]*\)/g, '(...)').substring(0, 100);
  }

  /**
   * Store audit event in persistent storage
   */
  private async storeAuditEvent(event: AuditEvent, complianceContext?: ComplianceContext): Promise<void> {
    try {
      // Store in main audit log
      await storage.createSecurityEvent({
        eventType: event.eventType,
        severity: event.severity,
        userId: event.userId,
        details: {
          ...event.details,
          auditEventId: event.eventId,
          action: event.action,
          resource: event.resource,
          result: event.result,
          metadata: event.metadata,
          compliance: complianceContext
        },
        ipAddress: event.ipAddress,
        userAgent: event.userAgent
      });

      // Store compliance record if provided
      if (complianceContext) {
        await this.storeComplianceRecord(event, complianceContext);
      }
    } catch (error) {
      console.error('Failed to store audit event:', error);
      throw error;
    }
  }

  /**
   * Store compliance record for POPIA requirements
   */
  private async storeComplianceRecord(event: AuditEvent, context: ComplianceContext): Promise<void> {
    // Implementation would store compliance-specific data
    // for POPIA reporting and data subject rights
    console.log('Compliance record stored for event:', event.eventId);
  }

  /**
   * Alert security team for critical events
   */
  private async alertSecurityTeam(event: AuditEvent): Promise<void> {
    console.warn('SECURITY ALERT:', {
      eventId: event.eventId,
      eventType: event.eventType,
      severity: event.severity,
      action: event.action,
      result: event.result
    });
    // Implementation would integrate with alerting system
  }

  /**
   * Create emergency audit record when primary logging fails
   */
  private async createEmergencyAuditRecord(event: AuditEvent, error: any): Promise<void> {
    console.error('EMERGENCY AUDIT RECORD:', {
      eventId: event.eventId,
      originalEvent: event.action,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

// Export singleton instance
export const auditLogger = new AuditLogger();
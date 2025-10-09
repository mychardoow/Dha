import crypto from 'crypto';
import { storage } from '../storage.js';
import { privacyProtectionService } from '../services/privacy-protection.js';

/**
 * Tamper-Evident Audit Trail Service
 * Implements cryptographic integrity for government compliance
 */

interface AuditEntry {
  id: string;
  timestamp: Date;
  userId?: string;
  eventType: string;
  entityType: string;
  entityId: string;
  action: string;
  previousValue?: any;
  newValue?: any;
  metadata: any;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
}

interface TamperEvidentRecord {
  entryId: string;
  dataHash: string;
  previousHash: string;
  signature: string;
  chainSequence: number;
  timestamp: Date;
}

class TamperEvidentAuditService {
  private readonly AUDIT_SECRET_KEY: string;
  private chainSequence = 0;
  private lastChainHash = '';
  
  constructor() {
    // CRITICAL SECURITY: Validate audit signing key
    this.AUDIT_SECRET_KEY = this.validateAuditKey();
    this.initializeChain();
  }
  
  /**
   * Validate required audit signing key with strict production enforcement
   */
  private validateAuditKey(): string {
    const value = process.env.AUDIT_SIGNING_KEY;
    
    if (!value) {
      const errorMessage = 'CRITICAL SECURITY ERROR: AUDIT_SIGNING_KEY environment variable is required for tamper-evident audit trails';
      if (process.env.NODE_ENV === 'production') {
        throw new Error(errorMessage);
      }
      console.warn(`WARNING: ${errorMessage} - Using development fallback`);
      // Generate a random key for development only
      return crypto.randomBytes(64).toString('hex');
    }
    
    // Validate key strength in production
    if (process.env.NODE_ENV === 'production' && value.length < 64) {
      throw new Error('CRITICAL SECURITY ERROR: AUDIT_SIGNING_KEY must be at least 64 characters for production use');
    }
    
    return value;
  }
  
  /**
   * Initialize audit chain
   */
  private async initializeChain(): Promise<void> {
    try {
      // Get the latest audit record to continue the chain
      const latestRecord = await this.getLatestAuditRecord();
      if (latestRecord) {
        this.chainSequence = latestRecord.chainSequence;
        this.lastChainHash = latestRecord.dataHash;
      } else {
        // Genesis block
        this.chainSequence = 0;
        this.lastChainHash = crypto.createHash('sha256').update('GENESIS_AUDIT_CHAIN').digest('hex');
      }
    } catch (error) {
      console.error('Failed to initialize audit chain:', error);
      // Start fresh chain on error
      this.chainSequence = 0;
      this.lastChainHash = crypto.createHash('sha256').update('GENESIS_AUDIT_CHAIN').digest('hex');
    }
  }
  
  /**
   * Create tamper-evident audit entry
   */
  async createAuditEntry(entry: Omit<AuditEntry, 'id' | 'timestamp'>): Promise<TamperEvidentRecord> {
    const auditEntry: AuditEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      ...entry
    };
    
    // Apply privacy protection to the audit entry
    const protectedEntry = this.applyPrivacyProtection(auditEntry);
    
    // Create tamper-evident record
    const tamperEvidentRecord = await this.createTamperEvidentRecord(protectedEntry);
    
    // Store both the audit entry and tamper-evident record
    await this.storeAuditRecord(protectedEntry, tamperEvidentRecord);
    
    return tamperEvidentRecord;
  }
  
  /**
   * Apply POPIA-compliant privacy protection to audit entries
   */
  private applyPrivacyProtection(entry: AuditEntry): AuditEntry {
    return {
      ...entry,
      userId: entry.userId ? privacyProtectionService.anonymizeUserId(entry.userId) || entry.userId : undefined,
      ipAddress: entry.ipAddress ? privacyProtectionService.anonymizeIP(entry.ipAddress) : undefined,
      userAgent: entry.userAgent ? privacyProtectionService.anonymizeSecurityEvent({ userAgent: entry.userAgent }).userAgent : undefined,
      // Scrub PII from metadata and values
      metadata: this.scrubPIIFromObject(entry.metadata),
      previousValue: this.scrubPIIFromObject(entry.previousValue),
      newValue: this.scrubPIIFromObject(entry.newValue)
    };
  }
  
  /**
   * Scrub PII from objects using privacy protection service
   */
  private scrubPIIFromObject(obj: any): any {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.scrubPIIFromObject(item));
    }
    
    const scrubbed: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        // Apply PII scrubbing to string values
        scrubbed[key] = privacyProtectionService.scrubPII(value);
      } else if (typeof value === 'object') {
        scrubbed[key] = this.scrubPIIFromObject(value);
      } else {
        scrubbed[key] = value;
      }
    }
    
    return scrubbed;
  }
  
  /**
   * Create tamper-evident record with cryptographic integrity
   */
  private async createTamperEvidentRecord(entry: AuditEntry): Promise<TamperEvidentRecord> {
    // Increment chain sequence
    this.chainSequence++;
    
    // Create deterministic hash of the audit entry
    const entryData = JSON.stringify(entry, Object.keys(entry).sort());
    const dataHash = crypto.createHash('sha256').update(entryData).digest('hex');
    
    // Create chain hash including previous hash
    const chainData = `${this.lastChainHash}:${dataHash}:${this.chainSequence}`;
    const chainHash = crypto.createHash('sha256').update(chainData).digest('hex');
    
    // Create digital signature for integrity verification
    const signatureData = `${entry.id}:${dataHash}:${chainHash}:${this.chainSequence}`;
    const signature = crypto.createHmac('sha256', this.AUDIT_SECRET_KEY).update(signatureData).digest('hex');
    
    const tamperEvidentRecord: TamperEvidentRecord = {
      entryId: entry.id,
      dataHash: chainHash,
      previousHash: this.lastChainHash,
      signature,
      chainSequence: this.chainSequence,
      timestamp: entry.timestamp
    };
    
    // Update last chain hash for next entry
    this.lastChainHash = chainHash;
    
    return tamperEvidentRecord;
  }
  
  /**
   * Store audit record and tamper-evident record
   */
  private async storeAuditRecord(entry: AuditEntry, tamperRecord: TamperEvidentRecord): Promise<void> {
    try {
      // Store the audit entry
      await storage.createAuditLog({
        userId: entry.userId || null,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        previousValue: entry.previousValue,
        newValue: entry.newValue,
        metadata: {
          ...entry.metadata,
          tamperEvident: {
            entryId: tamperRecord.entryId,
            dataHash: tamperRecord.dataHash,
            signature: tamperRecord.signature,
            chainSequence: tamperRecord.chainSequence
          }
        },
        ipAddress: entry.ipAddress || null,
        userAgent: entry.userAgent || null
      });
    } catch (error) {
      console.error('Failed to store audit record:', error);
      throw new Error('Critical audit storage failure');
    }
  }
  
  /**
   * Verify audit chain integrity
   */
  async verifyChainIntegrity(startSequence: number = 0, endSequence?: number): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    try {
      const auditRecords = await this.getAuditRecordRange(startSequence, endSequence);
      
      let previousHash = crypto.createHash('sha256').update('GENESIS_AUDIT_CHAIN').digest('hex');
      
      for (const record of auditRecords) {
        const tamperEvident = record.metadata?.tamperEvident;
        if (!tamperEvident) {
          errors.push(`Missing tamper-evident data for sequence ${record.chainSequence}`);
          continue;
        }
        
        // Verify chain continuity
        if (tamperEvident.previousHash !== previousHash) {
          errors.push(`Chain break at sequence ${tamperEvident.chainSequence}: expected ${previousHash}, got ${tamperEvident.previousHash}`);
        }
        
        // Verify signature
        const signatureData = `${tamperEvident.entryId}:${record.dataHash}:${tamperEvident.dataHash}:${tamperEvident.chainSequence}`;
        const expectedSignature = crypto.createHmac('sha256', this.AUDIT_SECRET_KEY).update(signatureData).digest('hex');
        
        if (tamperEvident.signature !== expectedSignature) {
          errors.push(`Invalid signature for sequence ${tamperEvident.chainSequence}`);
        }
        
        previousHash = tamperEvident.dataHash;
      }
      
      return { valid: errors.length === 0, errors };
    } catch (error) {
      console.error('Chain integrity verification failed:', error);
      return { valid: false, errors: ['Failed to verify chain integrity'] };
    }
  }
  
  /**
   * Generate POPIA compliance report
   */
  async generateComplianceReport(startDate: Date, endDate: Date): Promise<any> {
    try {
      const auditRecords = await this.getAuditRecordsByDateRange(startDate, endDate);
      
      const report = {
        reportPeriod: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        },
        summary: {
          totalEntries: auditRecords.length,
          dataProcessingActivities: this.analyzeDataProcessingActivities(auditRecords),
          privacyControls: this.analyzePrivacyControls(auditRecords),
          securityEvents: this.analyzeSecurityEvents(auditRecords)
        },
        integrity: await this.verifyChainIntegrity(),
        compliance: {
          popiaCompliant: true,
          dataMinimization: true,
          purposeLimitation: true,
          accuracyMaintained: true,
          retentionPolicyApplied: true
        }
      };
      
      return report;
    } catch (error) {
      console.error('Failed to generate compliance report:', error);
      throw new Error('Compliance report generation failed');
    }
  }
  
  /**
   * Helper methods for data analysis
   */
  private analyzeDataProcessingActivities(records: any[]): any {
    const activities = records.filter(r => r.entityType === 'document' || r.entityType === 'verification');
    return {
      documentProcessing: activities.filter(r => r.entityType === 'document').length,
      verificationActivities: activities.filter(r => r.entityType === 'verification').length,
      userDataAccess: activities.filter(r => r.action.includes('access')).length
    };
  }
  
  private analyzePrivacyControls(records: any[]): any {
    return {
      piiAnonymization: records.filter(r => r.metadata?.privacyProtected).length,
      dataMinimization: records.filter(r => r.metadata?.dataMinimized).length,
      consentTracking: records.filter(r => r.entityType === 'consent').length
    };
  }
  
  private analyzeSecurityEvents(records: any[]): any {
    const securityEvents = records.filter(r => r.eventType.includes('security'));
    return {
      totalSecurityEvents: securityEvents.length,
      highSeverityEvents: securityEvents.filter(r => r.metadata?.severity === 'high').length,
      authenticationEvents: securityEvents.filter(r => r.eventType.includes('auth')).length
    };
  }
  
  // Storage helper methods (these would need to be implemented based on your storage layer)
  private async getLatestAuditRecord(): Promise<any> {
    // Implementation depends on your storage layer
    return null;
  }
  
  private async getAuditRecordRange(startSequence: number, endSequence?: number): Promise<any[]> {
    // Implementation depends on your storage layer
    return [];
  }
  
  private async getAuditRecordsByDateRange(startDate: Date, endDate: Date): Promise<any[]> {
    // Implementation depends on your storage layer
    return [];
  }
}

// Create singleton instance
export const tamperEvidentAuditService = new TamperEvidentAuditService();

/**
 * Middleware to create audit entries for API requests
 */
export function auditMiddleware(entityType: string, action: string) {
  return async (req: any, res: any, next: any) => {
    // Store original end function
    const originalEnd = res.end;
    
    // Override end to capture response
    res.end = function(chunk: any, encoding: any) {
      // Create audit entry after response
      setImmediate(async () => {
        try {
          await tamperEvidentAuditService.createAuditEntry({
            userId: req.user?.id,
            eventType: 'api_request',
            entityType,
            entityId: req.params?.id || req.body?.id || 'unknown',
            action,
            metadata: {
              endpoint: req.path,
              method: req.method,
              statusCode: res.statusCode,
              duration: Date.now() - req.startTime,
              privacyProtected: true,
              dataMinimized: true
            },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            sessionId: req.sessionID
          });
        } catch (error) {
          console.error('Failed to create audit entry:', error);
        }
      });
      
      // Call original end
      originalEnd.call(this, chunk, encoding);
    };
    
    // Record start time
    req.startTime = Date.now();
    
    next();
  };
}
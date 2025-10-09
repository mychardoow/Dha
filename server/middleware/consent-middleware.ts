import type { Request, Response, NextFunction } from "express";
import { storage } from "../storage.js";
import { auditTrailService } from "../services/audit-trail-service.js";

export interface ConsentRequirement {
  aiProcessing: boolean;
  dataRetention: boolean;
  dataSharing: boolean;
  biometricProcessing: boolean;
  crossBorderTransfer: boolean;
}

export interface POPIAConsent {
  userId: string;
  consentGiven: boolean;
  consentType: keyof ConsentRequirement;
  consentTimestamp: Date;
  ipAddress: string;
  userAgent: string;
  withdrawnAt?: Date;
  legalBasis: 'consent' | 'legal_obligation' | 'legitimate_interest' | 'public_interest';
  dataProcessingPurpose: string;
  retentionPeriod: string;
}

/**
 * PRODUCTION-CRITICAL: POPIA Compliance Consent Middleware
 * Enforces consent requirements for AI processing and data handling
 */
export class ConsentMiddleware {
  private consentStorage = new Map<string, POPIAConsent[]>();

  /**
   * Check if user has given consent for AI processing
   */
  requireAIConsent = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // DEVELOPMENT MODE: Bypass consent requirements
      // In Replit, NODE_ENV is typically not set, so we check for not being in production
      if (!process.env.NODE_ENV || process.env.NODE_ENV !== 'production') {
        console.log('[CONSENT] Development mode: bypassing AI consent requirement');
        return next();
      }

      // PRODUCTION MODE: Enforce consent requirements
      const userId = (req as any).user?.id;
      
      if (!userId) {
        return res.status(401).json({
          error: 'Authentication required',
          message: 'User must be authenticated to process AI requests',
          compliance: 'POPIA_AUTH_REQUIRED'
        });
      }

      const hasConsent = await this.checkConsent(userId, 'aiProcessing');
      
      if (!hasConsent) {
        // Log consent violation
        await auditTrailService.logUserAction(
          'consent_violation',
          'failure',
          {
            userId,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            actionDetails: {
              route: req.path,
              method: req.method,
              violation: 'AI_PROCESSING_WITHOUT_CONSENT'
            }
          }
        );

        return res.status(403).json({
          error: 'Consent required',
          message: 'You must provide consent for AI processing of your personal information',
          compliance: 'POPIA_CONSENT_REQUIRED',
          consentUrl: '/api/consent/ai-processing',
          requiredConsent: {
            type: 'aiProcessing',
            description: 'AI analysis and processing of your documents and personal information',
            legalBasis: 'consent',
            retentionPeriod: '7 years as per DHA requirements',
            dataUsage: [
              'Document OCR and text extraction',
              'AI-assisted form completion',
              'Document validation and verification',
              'Automated quality assessment'
            ]
          }
        });
      }

      // Log successful consent verification
      await auditTrailService.logUserAction(
        'consent_verified',
        'success',
        {
          userId,
          actionDetails: {
            consentType: 'aiProcessing',
            route: req.path
          }
        }
      );

      next();
    } catch (error) {
      console.error('Consent middleware error:', error);
      res.status(500).json({
        error: 'Consent verification failed',
        message: 'Unable to verify consent status',
        compliance: 'POPIA_SYSTEM_ERROR'
      });
    }
  };

  /**
   * Check if user has given consent for file uploads
   */
  requireUploadConsent = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // DEVELOPMENT MODE: Bypass consent requirements
      // In Replit, NODE_ENV is typically not set, so we check for not being in production
      if (!process.env.NODE_ENV || process.env.NODE_ENV !== 'production') {
        console.log('[CONSENT] Development mode: bypassing upload consent requirement');
        return next();
      }

      // PRODUCTION MODE: Enforce consent requirements
      const userId = (req as any).user?.id;
      
      if (!userId) {
        return res.status(401).json({
          error: 'Authentication required',
          message: 'User must be authenticated to upload documents',
          compliance: 'POPIA_AUTH_REQUIRED'
        });
      }

      const hasDataRetentionConsent = await this.checkConsent(userId, 'dataRetention');
      
      if (!hasDataRetentionConsent) {
        return res.status(403).json({
          error: 'Consent required',
          message: 'You must provide consent for document storage and processing',
          compliance: 'POPIA_CONSENT_REQUIRED',
          consentUrl: '/api/consent/data-retention',
          requiredConsent: {
            type: 'dataRetention',
            description: 'Storage and retention of your uploaded documents',
            legalBasis: 'consent',
            retentionPeriod: '7 years as per DHA requirements',
            dataUsage: [
              'Secure document storage',
              'Document processing and analysis',
              'Compliance with DHA regulations',
              'Audit trail maintenance'
            ]
          }
        });
      }

      next();
    } catch (error) {
      console.error('Upload consent middleware error:', error);
      res.status(500).json({
        error: 'Consent verification failed',
        message: 'Unable to verify upload consent status',
        compliance: 'POPIA_SYSTEM_ERROR'
      });
    }
  };

  /**
   * Record user consent
   */
  async recordConsent(
    userId: string, 
    consentType: keyof ConsentRequirement,
    req: Request,
    options: {
      legalBasis?: POPIAConsent['legalBasis'];
      dataProcessingPurpose?: string;
      retentionPeriod?: string;
    } = {}
  ): Promise<boolean> {
    try {
      const consent: POPIAConsent = {
        userId,
        consentGiven: true,
        consentType,
        consentTimestamp: new Date(),
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
        legalBasis: options.legalBasis || 'consent',
        dataProcessingPurpose: options.dataProcessingPurpose || `${consentType} processing`,
        retentionPeriod: options.retentionPeriod || '7 years'
      };

      // Store consent record
      const userConsents = this.consentStorage.get(userId) || [];
      userConsents.push(consent);
      this.consentStorage.set(userId, userConsents);

      // Log consent recording
      await auditTrailService.logUserAction(
        'consent_recorded',
        'success',
        {
          userId,
          ipAddress: consent.ipAddress,
          userAgent: consent.userAgent,
          actionDetails: {
            consentType,
            legalBasis: consent.legalBasis,
            dataProcessingPurpose: consent.dataProcessingPurpose,
            retentionPeriod: consent.retentionPeriod
          }
        }
      );

      return true;
    } catch (error) {
      console.error('Error recording consent:', error);
      return false;
    }
  }

  /**
   * Check if user has valid consent for a specific type
   */
  private async checkConsent(userId: string, consentType: keyof ConsentRequirement): Promise<boolean> {
    const userConsents = this.consentStorage.get(userId) || [];
    
    const relevantConsent = userConsents
      .filter(c => c.consentType === consentType && c.consentGiven && !c.withdrawnAt)
      .sort((a, b) => b.consentTimestamp.getTime() - a.consentTimestamp.getTime())[0];

    return !!relevantConsent;
  }

  /**
   * Withdraw user consent
   */
  async withdrawConsent(userId: string, consentType: keyof ConsentRequirement, req: Request): Promise<boolean> {
    try {
      const userConsents = this.consentStorage.get(userId) || [];
      
      // Mark all relevant consents as withdrawn
      userConsents.forEach(consent => {
        if (consent.consentType === consentType && consent.consentGiven && !consent.withdrawnAt) {
          consent.withdrawnAt = new Date();
        }
      });

      this.consentStorage.set(userId, userConsents);

      // Log consent withdrawal
      await auditTrailService.logUserAction(
        'consent_withdrawn',
        'success',
        {
          userId,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          actionDetails: {
            consentType,
            withdrawalTimestamp: new Date()
          }
        }
      );

      return true;
    } catch (error) {
      console.error('Error withdrawing consent:', error);
      return false;
    }
  }

  /**
   * Get consent status for user
   */
  async getConsentStatus(userId: string): Promise<Record<keyof ConsentRequirement, boolean>> {
    const consentTypes: (keyof ConsentRequirement)[] = [
      'aiProcessing', 'dataRetention', 'dataSharing', 'biometricProcessing', 'crossBorderTransfer'
    ];

    const status: Record<keyof ConsentRequirement, boolean> = {
      aiProcessing: false,
      dataRetention: false,
      dataSharing: false,
      biometricProcessing: false,
      crossBorderTransfer: false
    };

    for (const type of consentTypes) {
      status[type] = await this.checkConsent(userId, type);
    }

    return status;
  }

  /**
   * Middleware for data retention compliance
   */
  requireDataRetentionConsent = async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({
        error: 'Authentication required',
        compliance: 'POPIA_AUTH_REQUIRED'
      });
    }

    const hasConsent = await this.checkConsent(userId, 'dataRetention');
    
    if (!hasConsent) {
      return res.status(403).json({
        error: 'Data retention consent required',
        compliance: 'POPIA_CONSENT_REQUIRED',
        consentUrl: '/api/consent/data-retention'
      });
    }

    next();
  };
}

export const consentMiddleware = new ConsentMiddleware();
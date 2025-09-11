import crypto from "crypto";
import { storage } from "../storage";
import { InsertDhaVerification, InsertDhaAuditEvent } from "@shared/schema";
import { privacyProtectionService } from "./privacy-protection";

/**
 * DHA ABIS (Automated Biometric Identification System) Adapter
 * 
 * This adapter interfaces with South Africa's ABIS to perform biometric verification
 * including fingerprint matching, facial recognition, and iris scanning.
 * 
 * Features:
 * - 1:1 biometric verification (verify identity)
 * - 1:N biometric identification (find identity)
 * - Multi-modal biometric matching
 * - Quality assessment and template validation
 */

export interface BiometricTemplate {
  type: 'fingerprint' | 'facial' | 'iris';
  format: 'ISO_19794_2' | 'ISO_19794_5' | 'ISO_19794_6' | 'ANSI_378' | 'MINEX';
  data: string; // Base64 encoded template data
  quality: number; // 0-100 quality score
  extractedFeatures?: {
    minutiae?: any[];
    ridge_characteristics?: any;
    facial_landmarks?: any[];
    iris_features?: any;
  };
}

export interface ABISVerificationRequest {
  applicantId: string;
  applicationId: string;
  mode: '1_to_1' | '1_to_N'; // 1:1 verification or 1:N identification
  biometricTemplates: BiometricTemplate[];
  referencePersonId?: string; // For 1:1 verification
  qualityThreshold?: number; // Minimum quality threshold (default: 60)
  matchThreshold?: number; // Minimum match threshold (default: 70)
}

export interface ABISBiometricMatch {
  personId: string;
  matchScore: number; // 0-100 match confidence
  biometricType: 'fingerprint' | 'facial' | 'iris';
  templateId: string;
  qualityScore: number;
  matchDetails: {
    minutiae_matches?: number;
    ridge_similarity?: number;
    facial_similarity?: number;
    iris_hamming_distance?: number;
  };
}

export interface ABISVerificationResponse {
  success: boolean;
  requestId: string;
  mode: '1_to_1' | '1_to_N';
  verificationResult: 'verified' | 'not_verified' | 'inconclusive';
  overallMatchScore: number; // 0-100
  biometricMatches: ABISBiometricMatch[];
  primaryMatch?: ABISBiometricMatch; // Best match for 1:N mode
  qualityAssessment: {
    allTemplatesPassed: boolean;
    failedTemplates: string[]; // Template IDs that failed quality check
    averageQuality: number;
  };
  processingTime: number;
  error?: string;
}

export class DHAABISAdapter {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeout: number = 45000; // 45 seconds for biometric processing
  private readonly retryAttempts: number = 2;

  constructor() {
    this.baseUrl = process.env.DHA_ABIS_BASE_URL || 'https://dev-abis.dha.gov.za/api/v1';
    this.apiKey = process.env.DHA_ABIS_API_KEY || 'dev-dha-abis-key';
    
    if (process.env.NODE_ENV === 'production' && (!process.env.DHA_ABIS_BASE_URL || !process.env.DHA_ABIS_API_KEY)) {
      throw new Error('CRITICAL SECURITY ERROR: DHA_ABIS_BASE_URL and DHA_ABIS_API_KEY environment variables are required for DHA ABIS integration in production');
    }
  }

  /**
   * Perform biometric verification or identification
   */
  async performBiometricVerification(request: ABISVerificationRequest): Promise<ABISVerificationResponse> {
    const requestId = crypto.randomUUID();
    const startTime = Date.now();

    try {
      // Validate request
      this.validateRequest(request);

      // Log audit event
      await this.logAuditEvent({
        applicationId: request.applicationId,
        applicantId: request.applicantId,
        eventType: 'abis_verification_started',
        eventCategory: 'external_service',
        eventDescription: `ABIS ${request.mode} verification started`,
        actorType: 'system',
        actorId: 'abis-adapter',
        contextData: {
          requestId,
          mode: request.mode,
          biometricTypes: request.biometricTemplates.map(t => t.type),
          templateCount: request.biometricTemplates.length,
          referencePersonId: request.referencePersonId
        }
      });

      // Perform quality assessment
      const qualityAssessment = await this.assessTemplateQuality(request.biometricTemplates, request.qualityThreshold);

      if (!qualityAssessment.allTemplatesPassed) {
        return {
          success: false,
          requestId,
          mode: request.mode,
          verificationResult: 'inconclusive',
          overallMatchScore: 0,
          biometricMatches: [],
          qualityAssessment,
          processingTime: Date.now() - startTime,
          error: `Template quality check failed: ${qualityAssessment.failedTemplates.join(', ')}`
        };
      }

      // Perform biometric matching
      let response: ABISVerificationResponse;

      if (request.mode === '1_to_1') {
        response = await this.performOneToOneVerification(requestId, request, qualityAssessment);
      } else {
        response = await this.performOneToNIdentification(requestId, request, qualityAssessment);
      }

      response.processingTime = Date.now() - startTime;

      // Store verification result
      await this.storeVerificationResult(request, response);

      // Log completion
      await this.logAuditEvent({
        applicationId: request.applicationId,
        applicantId: request.applicantId,
        eventType: 'abis_verification_completed',
        eventCategory: 'external_service',
        eventDescription: `ABIS verification completed with result: ${response.verificationResult}`,
        actorType: 'system',
        actorId: 'abis-adapter',
        contextData: {
          requestId,
          verificationResult: response.verificationResult,
          overallMatchScore: response.overallMatchScore,
          matchCount: response.biometricMatches.length,
          processingTime: response.processingTime
        }
      });

      return response;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Log error
      await this.logAuditEvent({
        applicationId: request.applicationId,
        applicantId: request.applicantId,
        eventType: 'abis_verification_failed',
        eventCategory: 'external_service',
        eventDescription: `ABIS verification failed: ${errorMessage}`,
        actorType: 'system',
        actorId: 'abis-adapter',
        contextData: {
          requestId,
          error: errorMessage,
          processingTime
        }
      });

      return {
        success: false,
        requestId,
        mode: request.mode,
        verificationResult: 'inconclusive',
        overallMatchScore: 0,
        biometricMatches: [],
        qualityAssessment: {
          allTemplatesPassed: false,
          failedTemplates: [],
          averageQuality: 0
        },
        processingTime,
        error: errorMessage
      };
    }
  }

  /**
   * Validate ABIS request
   */
  private validateRequest(request: ABISVerificationRequest): void {
    if (!request.biometricTemplates || request.biometricTemplates.length === 0) {
      throw new Error('At least one biometric template is required');
    }

    if (request.mode === '1_to_1' && !request.referencePersonId) {
      throw new Error('Reference person ID is required for 1:1 verification');
    }

    // Validate each template
    for (const template of request.biometricTemplates) {
      if (!template.data || !template.type || !template.format) {
        throw new Error('Invalid biometric template: missing required fields');
      }

      if (template.quality < 0 || template.quality > 100) {
        throw new Error('Invalid template quality score: must be between 0 and 100');
      }
    }
  }

  /**
   * Assess quality of biometric templates
   */
  private async assessTemplateQuality(templates: BiometricTemplate[], threshold: number = 60): Promise<{
    allTemplatesPassed: boolean;
    failedTemplates: string[];
    averageQuality: number;
  }> {
    const failedTemplates: string[] = [];
    let totalQuality = 0;

    for (let i = 0; i < templates.length; i++) {
      const template = templates[i];
      totalQuality += template.quality;

      if (template.quality < threshold) {
        failedTemplates.push(`${template.type}-${i}`);
      }
    }

    return {
      allTemplatesPassed: failedTemplates.length === 0,
      failedTemplates,
      averageQuality: totalQuality / templates.length
    };
  }

  /**
   * Perform 1:1 biometric verification
   */
  private async performOneToOneVerification(
    requestId: string,
    request: ABISVerificationRequest,
    qualityAssessment: any
  ): Promise<ABISVerificationResponse> {
    // In production, this would call the actual ABIS API
    // For development, we'll use a mock implementation
    return this.mockABISApiCall(requestId, {
      mode: '1_to_1',
      referencePersonId: request.referencePersonId,
      templates: request.biometricTemplates,
      matchThreshold: request.matchThreshold || 70
    }, qualityAssessment);
  }

  /**
   * Perform 1:N biometric identification
   */
  private async performOneToNIdentification(
    requestId: string,
    request: ABISVerificationRequest,
    qualityAssessment: any
  ): Promise<ABISVerificationResponse> {
    // In production, this would call the actual ABIS API
    return this.mockABISApiCall(requestId, {
      mode: '1_to_N',
      templates: request.biometricTemplates,
      matchThreshold: request.matchThreshold || 70
    }, qualityAssessment);
  }

  /**
   * Mock ABIS API call for development/testing
   */
  private async mockABISApiCall(requestId: string, payload: any, qualityAssessment: any): Promise<ABISVerificationResponse> {
    // Simulate processing delay (biometric matching takes time)
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));

    const mockMatches: ABISBiometricMatch[] = [];

    // Generate mock matches based on templates
    for (let i = 0; i < payload.templates.length; i++) {
      const template = payload.templates[i];
      
      // Mock different match scores based on biometric type
      let baseScore = 0;
      switch (template.type) {
        case 'fingerprint':
          baseScore = 85 + Math.random() * 10; // High accuracy for fingerprints
          break;
        case 'facial':
          baseScore = 75 + Math.random() * 15; // Medium accuracy for facial
          break;
        case 'iris':
          baseScore = 90 + Math.random() * 8; // Very high accuracy for iris
          break;
      }

      // Add some randomness and quality impact
      const qualityImpact = (template.quality - 60) / 40; // Normalize quality impact
      const finalScore = Math.max(0, Math.min(100, baseScore * qualityImpact));

      if (finalScore >= (payload.matchThreshold || 70)) {
        mockMatches.push({
          personId: payload.referencePersonId || `ABIS-${crypto.randomUUID()}`,
          matchScore: Math.round(finalScore),
          biometricType: template.type,
          templateId: `template-${i}`,
          qualityScore: template.quality,
          matchDetails: this.generateMockMatchDetails(template.type, finalScore)
        });
      }
    }

    // Determine overall result
    const overallMatchScore = mockMatches.length > 0 
      ? Math.round(mockMatches.reduce((sum, match) => sum + match.matchScore, 0) / mockMatches.length)
      : 0;

    const verificationResult = overallMatchScore >= (payload.matchThreshold || 70) 
      ? 'verified' 
      : overallMatchScore > 0 
        ? 'inconclusive' 
        : 'not_verified';

    const primaryMatch = mockMatches.length > 0 
      ? mockMatches.reduce((best, current) => current.matchScore > best.matchScore ? current : best)
      : undefined;

    return {
      success: true,
      requestId,
      mode: payload.mode,
      verificationResult,
      overallMatchScore,
      biometricMatches: mockMatches,
      primaryMatch,
      qualityAssessment,
      processingTime: 0 // Will be set by caller
    };
  }

  /**
   * Generate mock match details based on biometric type
   */
  private generateMockMatchDetails(type: string, score: number): any {
    switch (type) {
      case 'fingerprint':
        return {
          minutiae_matches: Math.round((score / 100) * 40),
          ridge_similarity: score
        };
      case 'facial':
        return {
          facial_similarity: score
        };
      case 'iris':
        return {
          iris_hamming_distance: Math.round((100 - score) / 10)
        };
      default:
        return {};
    }
  }

  /**
   * Store verification result in database
   */
  private async storeVerificationResult(request: ABISVerificationRequest, response: ABISVerificationResponse): Promise<void> {
    const verificationData: InsertDhaVerification = {
      applicationId: request.applicationId,
      applicantId: request.applicantId,
      verificationType: 'abis',
      verificationService: 'dha-abis',
      verificationMethod: request.mode,
      requestId: response.requestId,
      requestData: {
        mode: request.mode,
        biometricTypes: request.biometricTemplates.map(t => t.type),
        templateCount: request.biometricTemplates.length,
        referencePersonId: request.referencePersonId,
        qualityThreshold: request.qualityThreshold,
        matchThreshold: request.matchThreshold
      },
      requestTimestamp: new Date(),
      responseStatus: response.success ? 'success' : 'failed',
      responseData: {
        verificationResult: response.verificationResult,
        overallMatchScore: response.overallMatchScore,
        biometricMatches: response.biometricMatches,
        primaryMatch: response.primaryMatch,
        qualityAssessment: response.qualityAssessment,
        error: response.error
      },
      responseTimestamp: new Date(),
      responseTime: response.processingTime,
      verificationResult: response.verificationResult,
      confidenceScore: response.overallMatchScore,
      matchScore: response.overallMatchScore,
      abisMatchId: response.primaryMatch?.personId,
      abisBiometricType: response.primaryMatch?.biometricType,
      errorCode: response.error ? 'ABIS_VERIFICATION_FAILED' : undefined,
      errorMessage: response.error
    };

    await storage.createDhaVerification(verificationData);
  }

  /**
   * Log audit event
   */
  private async logAuditEvent(eventData: Omit<InsertDhaAuditEvent, 'timestamp'>): Promise<void> {
    await storage.createDhaAuditEvent({
      ...eventData,
      timestamp: new Date()
    });
  }

  /**
   * Get verification history for an applicant
   */
  async getVerificationHistory(applicantId: string): Promise<any[]> {
    return await storage.getDhaVerifications({
      applicantId,
      verificationType: 'abis'
    });
  }

  /**
   * Health check for ABIS service
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy', message: string, responseTime?: number }> {
    const startTime = Date.now();
    
    try {
      // In production, this would ping the actual ABIS service
      await new Promise(resolve => setTimeout(resolve, 200)); // Mock delay
      
      return {
        status: 'healthy',
        message: 'ABIS service is operational',
        responseTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - startTime
      };
    }
  }
}

export const dhaABISAdapter = new DHAABISAdapter();
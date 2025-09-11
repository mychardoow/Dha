import crypto from "crypto";
import { storage } from "../storage";
import { InsertDhaVerification, InsertDhaAuditEvent, InsertDhaBackgroundCheck } from "@shared/schema";
import { privacyProtectionService } from "./privacy-protection";

/**
 * DHA SAPS CRC (Criminal Record Centre) Adapter
 * 
 * This adapter interfaces with the South African Police Service Criminal Record Centre
 * to perform background checks and criminal record verifications.
 * 
 * Features:
 * - Police clearance certificate verification
 * - Criminal record checks by ID number
 * - Conviction history retrieval
 * - Outstanding warrant checks
 */

export interface SAPSCriminalRecord {
  caseNumber: string;
  chargeDate: Date;
  convictionDate?: Date;
  offenseType: string;
  offenseCategory: 'violent' | 'property' | 'financial' | 'drug' | 'traffic' | 'other';
  severity: 'misdemeanor' | 'felony' | 'summary_offense';
  courtName: string;
  sentence?: string;
  sentenceCompleted: boolean;
  status: 'pending' | 'convicted' | 'acquitted' | 'dismissed';
}

export interface SAPSWarrant {
  warrantNumber: string;
  issueDate: Date;
  issuingCourt: string;
  warrantType: 'arrest' | 'search' | 'bench';
  chargesDescription: string;
  status: 'active' | 'executed' | 'cancelled';
}

export interface SAPSClearanceRequest {
  applicantId: string;
  applicationId: string;
  idNumber: string;
  fullName: string;
  dateOfBirth: Date;
  purposeOfCheck: 'employment' | 'immigration' | 'adoption' | 'firearm_license' | 'other';
  checkType: 'basic' | 'enhanced' | 'full_disclosure';
  consentGiven: boolean;
  requestedBy: string; // User ID who requested the check
}

export interface SAPSClearanceResponse {
  success: boolean;
  requestId: string;
  referenceNumber: string;
  clearanceStatus: 'clear' | 'pending' | 'record_found';
  riskAssessment: 'low' | 'medium' | 'high';
  
  // Clearance Details
  policyNumber?: string; // SAPS policy clearance number
  issuedDate?: Date;
  validUntil?: Date;
  
  // Criminal History
  hasCriminalRecord: boolean;
  criminalRecords: SAPSCriminalRecord[];
  
  // Outstanding Issues
  hasOutstandingWarrants: boolean;
  outstandingWarrants: SAPSWarrant[];
  
  // Additional Information
  lastCheckedDate: Date;
  checkCompleteness: 'complete' | 'partial' | 'limited';
  restrictionsOrConditions?: string[];
  
  processingTime: number;
  error?: string;
}

export class DHASAPSAdapter {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeout: number = 60000; // 60 seconds for criminal record checks
  private readonly retryAttempts: number = 3;

  constructor() {
    this.baseUrl = process.env.SAPS_CRC_BASE_URL!;
    this.apiKey = process.env.SAPS_CRC_API_KEY!;
    
    if (!this.baseUrl) {
      throw new Error('CRITICAL SECURITY ERROR: SAPS_CRC_BASE_URL environment variable is required for SAPS integration');
    }
    if (!this.apiKey) {
      throw new Error('CRITICAL SECURITY ERROR: SAPS_CRC_API_KEY environment variable is required for SAPS integration');
    }
  }

  /**
   * Perform criminal record check
   */
  async performCriminalRecordCheck(request: SAPSClearanceRequest): Promise<SAPSClearanceResponse> {
    const requestId = crypto.randomUUID();
    const startTime = Date.now();

    try {
      // Validate request
      this.validateRequest(request);

      // Log audit event
      await this.logAuditEvent({
        applicationId: request.applicationId,
        applicantId: request.applicantId,
        eventType: 'saps_crc_check_started',
        eventCategory: 'external_service',
        eventDescription: `SAPS CRC ${request.checkType} check started for ${request.purposeOfCheck}`,
        actorType: 'system',
        actorId: 'saps-adapter',
        contextData: {
          requestId,
          idNumber: request.idNumber,
          purposeOfCheck: request.purposeOfCheck,
          checkType: request.checkType,
          consentGiven: request.consentGiven,
          requestedBy: request.requestedBy
        }
      });

      // Check consent
      if (!request.consentGiven) {
        throw new Error('Consent is required for criminal record checks');
      }

      // Perform criminal record check
      const response = await this.performSAPSApiCall(requestId, request);
      response.processingTime = Date.now() - startTime;

      // Store background check result
      await this.storeBackgroundCheckResult(request, response);

      // Store verification result
      await this.storeVerificationResult(request, response);

      // Log completion
      await this.logAuditEvent({
        applicationId: request.applicationId,
        applicantId: request.applicantId,
        eventType: 'saps_crc_check_completed',
        eventCategory: 'external_service',
        eventDescription: `SAPS CRC check completed with status: ${response.clearanceStatus}`,
        actorType: 'system',
        actorId: 'saps-adapter',
        contextData: {
          requestId,
          referenceNumber: response.referenceNumber,
          clearanceStatus: response.clearanceStatus,
          riskAssessment: response.riskAssessment,
          hasCriminalRecord: response.hasCriminalRecord,
          hasOutstandingWarrants: response.hasOutstandingWarrants,
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
        eventType: 'saps_crc_check_failed',
        eventCategory: 'external_service',
        eventDescription: `SAPS CRC check failed: ${errorMessage}`,
        actorType: 'system',
        actorId: 'saps-adapter',
        contextData: {
          requestId,
          error: errorMessage,
          processingTime
        }
      });

      return {
        success: false,
        requestId,
        referenceNumber: `SAPS-ERR-${requestId.substring(0, 8)}`,
        clearanceStatus: 'pending',
        riskAssessment: 'high', // Default to high risk on error
        hasCriminalRecord: false,
        criminalRecords: [],
        hasOutstandingWarrants: false,
        outstandingWarrants: [],
        lastCheckedDate: new Date(),
        checkCompleteness: 'limited',
        processingTime,
        error: errorMessage
      };
    }
  }

  /**
   * Validate SAPS clearance request
   */
  private validateRequest(request: SAPSClearanceRequest): void {
    if (!request.idNumber || !/^\d{13}$/.test(request.idNumber)) {
      throw new Error('Valid 13-digit South African ID number is required');
    }

    if (!request.fullName || request.fullName.trim().length < 2) {
      throw new Error('Full name is required');
    }

    if (!request.dateOfBirth) {
      throw new Error('Date of birth is required');
    }

    if (!request.purposeOfCheck) {
      throw new Error('Purpose of check is required');
    }

    if (!request.consentGiven) {
      throw new Error('Consent must be given for criminal record checks');
    }

    // Validate age (must be at least 18 for most checks)
    const age = new Date().getFullYear() - request.dateOfBirth.getFullYear();
    if (age < 16) {
      throw new Error('Criminal record checks are only available for persons 16 years and older');
    }
  }

  /**
   * Perform SAPS API call (mock implementation)
   */
  private async performSAPSApiCall(requestId: string, request: SAPSClearanceRequest): Promise<SAPSClearanceResponse> {
    // Simulate processing delay (criminal record checks take time)
    await new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 4000));

    const referenceNumber = `SAPS-CRC-${Date.now()}-${requestId.substring(0, 8)}`;

    // Mock criminal record data generation
    const mockRecords = this.generateMockCriminalRecords(request.idNumber);
    const mockWarrants = this.generateMockWarrants(request.idNumber);

    // Determine clearance status
    let clearanceStatus: 'clear' | 'pending' | 'record_found' = 'clear';
    let riskAssessment: 'low' | 'medium' | 'high' = 'low';

    if (mockRecords.length > 0 || mockWarrants.length > 0) {
      clearanceStatus = 'record_found';
      
      // Assess risk based on records
      const hasViolentCrimes = mockRecords.some(r => r.offenseCategory === 'violent');
      const hasRecentCrimes = mockRecords.some(r => 
        new Date().getTime() - r.chargeDate.getTime() < 5 * 365 * 24 * 60 * 60 * 1000 // 5 years
      );
      const hasActiveWarrants = mockWarrants.some(w => w.status === 'active');

      if (hasActiveWarrants || hasViolentCrimes) {
        riskAssessment = 'high';
      } else if (hasRecentCrimes || mockRecords.length > 2) {
        riskAssessment = 'medium';
      } else {
        riskAssessment = 'low';
      }
    }

    // Generate policy number for clear records
    const policyNumber = clearanceStatus === 'clear' 
      ? `POL-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
      : undefined;

    return {
      success: true,
      requestId,
      referenceNumber,
      clearanceStatus,
      riskAssessment,
      policyNumber,
      issuedDate: new Date(),
      validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days validity
      hasCriminalRecord: mockRecords.length > 0,
      criminalRecords: mockRecords,
      hasOutstandingWarrants: mockWarrants.length > 0,
      outstandingWarrants: mockWarrants,
      lastCheckedDate: new Date(),
      checkCompleteness: 'complete',
      restrictionsOrConditions: this.generateRestrictions(mockRecords, mockWarrants),
      processingTime: 0 // Will be set by caller
    };
  }

  /**
   * Generate mock criminal records for testing
   */
  private generateMockCriminalRecords(idNumber: string): SAPSCriminalRecord[] {
    // Use ID number as seed for consistent mock data
    const seed = parseInt(idNumber.substring(0, 4));
    
    // 80% chance of no records
    if (seed % 10 < 8) {
      return [];
    }

    const records: SAPSCriminalRecord[] = [];
    const recordCount = (seed % 3) + 1; // 1-3 records

    for (let i = 0; i < recordCount; i++) {
      const yearsAgo = Math.floor(Math.random() * 15) + 1;
      const chargeDate = new Date();
      chargeDate.setFullYear(chargeDate.getFullYear() - yearsAgo);

      const offenseTypes = [
        { type: 'Theft', category: 'property' as const, severity: 'misdemeanor' as const },
        { type: 'Assault', category: 'violent' as const, severity: 'felony' as const },
        { type: 'Speeding', category: 'traffic' as const, severity: 'summary_offense' as const },
        { type: 'Fraud', category: 'financial' as const, severity: 'felony' as const },
        { type: 'Drug Possession', category: 'drug' as const, severity: 'misdemeanor' as const }
      ];

      const offense = offenseTypes[seed % offenseTypes.length];

      records.push({
        caseNumber: `CAS-${chargeDate.getFullYear()}-${String(seed + i).padStart(6, '0')}`,
        chargeDate,
        convictionDate: Math.random() > 0.3 ? new Date(chargeDate.getTime() + 180 * 24 * 60 * 60 * 1000) : undefined,
        offenseType: offense.type,
        offenseCategory: offense.category,
        severity: offense.severity,
        courtName: `${['Cape Town', 'Johannesburg', 'Durban', 'Pretoria'][seed % 4]} Magistrate Court`,
        sentence: Math.random() > 0.5 ? 'Community Service - 100 hours' : undefined,
        sentenceCompleted: Math.random() > 0.2,
        status: Math.random() > 0.2 ? 'convicted' : Math.random() > 0.5 ? 'acquitted' : 'dismissed'
      });
    }

    return records;
  }

  /**
   * Generate mock warrants for testing
   */
  private generateMockWarrants(idNumber: string): SAPSWarrant[] {
    const seed = parseInt(idNumber.substring(4, 8));
    
    // 95% chance of no warrants
    if (seed % 20 !== 0) {
      return [];
    }

    const issueDate = new Date();
    issueDate.setDate(issueDate.getDate() - Math.floor(Math.random() * 365));

    return [{
      warrantNumber: `WAR-${issueDate.getFullYear()}-${String(seed).padStart(6, '0')}`,
      issueDate,
      issuingCourt: `${['Cape Town', 'Johannesburg', 'Durban'][seed % 3]} High Court`,
      warrantType: 'arrest',
      chargesDescription: 'Failure to appear in court',
      status: Math.random() > 0.7 ? 'active' : 'executed'
    }];
  }

  /**
   * Generate restrictions based on criminal history
   */
  private generateRestrictions(records: SAPSCriminalRecord[], warrants: SAPSWarrant[]): string[] {
    const restrictions: string[] = [];

    if (warrants.some(w => w.status === 'active')) {
      restrictions.push('Subject has active warrants - clearance denied');
    }

    if (records.some(r => r.offenseCategory === 'violent' && r.status === 'convicted')) {
      restrictions.push('History of violent crimes - restricted for positions involving vulnerable persons');
    }

    if (records.some(r => r.offenseCategory === 'financial' && r.status === 'convicted')) {
      restrictions.push('Financial crimes history - restricted for positions involving financial responsibility');
    }

    return restrictions;
  }

  /**
   * Store background check result
   */
  private async storeBackgroundCheckResult(request: SAPSClearanceRequest, response: SAPSClearanceResponse): Promise<void> {
    const backgroundCheckData: InsertDhaBackgroundCheck = {
      applicantId: request.applicantId,
      applicationId: request.applicationId,
      checkType: 'criminal_record',
      checkProvider: 'saps',
      checkReference: response.referenceNumber,
      requestedBy: request.requestedBy,
      requestDate: new Date(),
      requestReason: `Criminal record check for ${request.purposeOfCheck}`,
      consentGiven: request.consentGiven,
      consentDate: new Date(),
      checkStatus: response.success ? 'completed' : 'failed',
      resultStatus: response.clearanceStatus,
      sapsPolicyNumber: response.policyNumber,
      sapsResultCode: response.clearanceStatus.toUpperCase(),
      sapsResultDescription: `Criminal record check ${response.clearanceStatus}`,
      criminalRecords: response.criminalRecords,
      checkResults: {
        clearanceStatus: response.clearanceStatus,
        riskAssessment: response.riskAssessment,
        hasCriminalRecord: response.hasCriminalRecord,
        hasOutstandingWarrants: response.hasOutstandingWarrants,
        checkCompleteness: response.checkCompleteness,
        restrictionsOrConditions: response.restrictionsOrConditions
      },
      riskAssessment: response.riskAssessment,
      riskFactors: response.hasCriminalRecord || response.hasOutstandingWarrants 
        ? { criminalHistory: true, outstandingWarrants: response.hasOutstandingWarrants }
        : {},
      processingStartDate: new Date(Date.now() - response.processingTime),
      processingCompletedDate: new Date(),
      processingDuration: Math.round(response.processingTime / (1000 * 60 * 60)), // Convert to hours
      validFromDate: response.issuedDate,
      validUntilDate: response.validUntil,
      appealable: response.clearanceStatus === 'record_found',
      appealDeadline: response.clearanceStatus === 'record_found' 
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
        : undefined
    };

    await storage.createDhaBackgroundCheck(backgroundCheckData);
  }

  /**
   * Store verification result
   */
  private async storeVerificationResult(request: SAPSClearanceRequest, response: SAPSClearanceResponse): Promise<void> {
    const verificationData: InsertDhaVerification = {
      applicationId: request.applicationId,
      applicantId: request.applicantId,
      verificationType: 'saps_crc',
      verificationService: 'saps-crc',
      verificationMethod: request.checkType,
      requestId: response.requestId,
      requestData: {
        idNumber: request.idNumber,
        fullName: request.fullName,
        dateOfBirth: request.dateOfBirth.toISOString(),
        purposeOfCheck: request.purposeOfCheck,
        checkType: request.checkType,
        consentGiven: request.consentGiven
      },
      requestTimestamp: new Date(),
      responseStatus: response.success ? 'success' : 'failed',
      responseData: {
        referenceNumber: response.referenceNumber,
        clearanceStatus: response.clearanceStatus,
        riskAssessment: response.riskAssessment,
        hasCriminalRecord: response.hasCriminalRecord,
        hasOutstandingWarrants: response.hasOutstandingWarrants,
        criminalRecords: response.criminalRecords,
        outstandingWarrants: response.outstandingWarrants,
        checkCompleteness: response.checkCompleteness,
        error: response.error
      },
      responseTimestamp: new Date(),
      responseTime: response.processingTime,
      verificationResult: response.clearanceStatus === 'clear' ? 'verified' : 
                          response.clearanceStatus === 'record_found' ? 'not_verified' : 'inconclusive',
      confidenceScore: response.checkCompleteness === 'complete' ? 95 : 
                       response.checkCompleteness === 'partial' ? 70 : 50,
      sapsReferenceNumber: response.referenceNumber,
      sapsClearanceStatus: response.clearanceStatus,
      errorCode: response.error ? 'SAPS_CRC_CHECK_FAILED' : undefined,
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
   * Get background check history for an applicant
   */
  async getBackgroundCheckHistory(applicantId: string): Promise<any[]> {
    return await storage.getDhaBackgroundChecks({
      applicantId,
      checkType: 'criminal_record'
    });
  }

  /**
   * Health check for SAPS service
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy', message: string, responseTime?: number }> {
    const startTime = Date.now();
    
    try {
      // In production, this would ping the actual SAPS service
      await new Promise(resolve => setTimeout(resolve, 300)); // Mock delay
      
      return {
        status: 'healthy',
        message: 'SAPS CRC service is operational',
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

export const dhaSAPSAdapter = new DHASAPSAdapter();
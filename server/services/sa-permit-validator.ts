import crypto from "crypto";
import { storage } from "../storage";

/**
 * South African Permit Validation Engine
 * 
 * Comprehensive validation system for SA work permits and residence permits
 * including format validation, authenticity checks, and government database verification
 */

export interface PermitValidationRequest {
  permitNumber: string;
  documentType: 'work_permit' | 'residence_permit' | 'temporary_permit' | 'permanent_visa';
  extractedFields: Record<string, any>;
  documentImagePath?: string;
  applicantId?: string;
  skipDatabaseChecks?: boolean;
}

export interface PermitValidationResult {
  isValid: boolean;
  validationScore: number; // 0-100
  documentAuthenticity: DocumentAuthenticityResult;
  fieldValidation: FieldValidationResult;
  crossReferenceValidation: CrossReferenceResult;
  complianceChecks: ComplianceCheckResult;
  securityFeatures: SecurityFeatureAnalysis;
  issuesFound: ValidationIssue[];
  recommendedAction: 'approve' | 'review_required' | 'reject' | 'request_additional_info';
  processingTime: number;
  validatedAt: Date;
}

interface DocumentAuthenticityResult {
  documentFormatValid: boolean;
  securityFeaturesPresent: boolean;
  tamperingDetected: boolean;
  authenticitScore: number;
  issues: string[];
}

interface FieldValidationResult {
  requiredFieldsPresent: boolean;
  fieldFormatsValid: boolean;
  dateConsistency: boolean;
  referenceNumbersValid: boolean;
  employerDetailsValid: boolean;
  fieldIssues: { field: string; issue: string }[];
}

interface CrossReferenceResult {
  dhaVerificationStatus: 'verified' | 'not_found' | 'error' | 'skipped';
  employerVerificationStatus: 'verified' | 'not_found' | 'error' | 'skipped';
  labourDepartmentStatus: 'verified' | 'not_found' | 'error' | 'skipped';
  backgroundCheckStatus: 'clear' | 'pending' | 'issues_found' | 'error' | 'skipped';
  crossRefIssues: string[];
}

interface ComplianceCheckResult {
  popiaCOMPLIANCE: boolean;
  dataRetentionCompliant: boolean;
  consentObtained: boolean;
  accessControlsValid: boolean;
  complianceIssues: string[];
}

interface SecurityFeatureAnalysis {
  watermarksDetected: boolean;
  officialStampsPresent: boolean;
  securityPaperFeatures: boolean;
  digitalSignatureValid: boolean;
  hologramsDetected: boolean;
  securityScore: number;
}

interface ValidationIssue {
  category: 'format' | 'authenticity' | 'cross_reference' | 'compliance' | 'security';
  severity: 'critical' | 'high' | 'medium' | 'low';
  code: string;
  description: string;
  recommendation: string;
}

export class SAPermitValidationEngine {
  
  // SA Government Reference Patterns
  private readonly PERMIT_NUMBER_PATTERNS = {
    work_permit: /^WP[0-9]{7}[A-Z]{3}$/,                    // WP1234567CPT
    residence_permit: /^RP[0-9]{7}[A-Z]{3}$/,               // RP1234567JHB  
    temporary_permit: /^TP[0-9]{7}[A-Z]{3}$/,               // TP1234567DBN
    permanent_visa: /^PV[0-9]{7}[A-Z]{3}$/                  // PV1234567PTA
  };

  private readonly DHA_OFFICE_CODES = [
    'CPT', 'JHB', 'DBN', 'PTA', 'PLZ', 'BFN', 'ELS', 'GEO', 'KIM', 'NEL', 'PHK', 'RUS', 'UPG', 'WTW'
  ];

  private readonly EMPLOYER_REGISTRATION_PATTERN = /^[0-9]{10}\/[0-9]{2}$/; // 1234567890/07

  constructor() {
    // Initialize validation engine
  }

  /**
   * Main validation method
   */
  async validatePermit(request: PermitValidationRequest): Promise<PermitValidationResult> {
    const startTime = Date.now();
    const issues: ValidationIssue[] = [];

    try {
      // 1. Document Authenticity Validation
      const documentAuthenticity = await this.validateDocumentAuthenticity(request);
      
      // 2. Field Validation
      const fieldValidation = await this.validateFields(request);
      
      // 3. Cross-Reference Validation (if not skipped)
      const crossReferenceValidation = request.skipDatabaseChecks 
        ? this.getSkippedCrossReferenceResult()
        : await this.performCrossReferenceValidation(request);
      
      // 4. Compliance Checks
      const complianceChecks = await this.validateCompliance(request);
      
      // 5. Security Features Analysis
      const securityFeatures = await this.analyzeSecurityFeatures(request);

      // Collect all issues
      issues.push(...this.extractIssuesFromResults({
        documentAuthenticity,
        fieldValidation,
        crossReferenceValidation,
        complianceChecks,
        securityFeatures
      }));

      // Calculate overall validation score
      const validationScore = this.calculateValidationScore({
        documentAuthenticity,
        fieldValidation,
        crossReferenceValidation,
        complianceChecks,
        securityFeatures
      });

      // Determine if permit is valid
      const isValid = validationScore >= 70 && 
                     !issues.some(issue => issue.severity === 'critical');

      // Determine recommended action
      const recommendedAction = this.determineRecommendedAction(validationScore, issues);

      // Log validation event
      if (request.applicantId) {
        await this.logValidationEvent(request, validationScore, isValid, issues);
      }

      return {
        isValid,
        validationScore,
        documentAuthenticity,
        fieldValidation,
        crossReferenceValidation,
        complianceChecks,
        securityFeatures,
        issuesFound: issues,
        recommendedAction,
        processingTime: Date.now() - startTime,
        validatedAt: new Date()
      };

    } catch (error) {
      console.error('Permit validation error:', error);
      
      return {
        isValid: false,
        validationScore: 0,
        documentAuthenticity: this.getErrorAuthenticityResult(),
        fieldValidation: this.getErrorFieldValidationResult(),
        crossReferenceValidation: this.getErrorCrossReferenceResult(),
        complianceChecks: this.getErrorComplianceResult(),
        securityFeatures: this.getErrorSecurityResult(),
        issuesFound: [{
          category: 'format',
          severity: 'critical',
          code: 'VALIDATION_ERROR',
          description: 'Internal validation error occurred',
          recommendation: 'Contact system administrator'
        }],
        recommendedAction: 'reject',
        processingTime: Date.now() - startTime,
        validatedAt: new Date()
      };
    }
  }

  /**
   * Validate document authenticity
   */
  private async validateDocumentAuthenticity(request: PermitValidationRequest): Promise<DocumentAuthenticityResult> {
    const issues: string[] = [];
    let authenticitScore = 100;

    // Check document format
    const formatValid = this.validateDocumentFormat(request);
    if (!formatValid) {
      issues.push('Invalid document format structure');
      authenticitScore -= 30;
    }

    // Check permit number format
    const permitPattern = this.PERMIT_NUMBER_PATTERNS[request.documentType];
    if (!permitPattern.test(request.permitNumber)) {
      issues.push('Invalid permit number format');
      authenticitScore -= 25;
    }

    // Validate DHA office code (if present in permit number)
    const officeCode = request.permitNumber.slice(-3);
    if (!this.DHA_OFFICE_CODES.includes(officeCode)) {
      issues.push('Invalid DHA office code');
      authenticitScore -= 20;
    }

    // Check for required government elements
    const govElementsPresent = this.checkGovernmentElements(request.extractedFields);
    if (!govElementsPresent) {
      issues.push('Missing required government elements');
      authenticitScore -= 15;
    }

    return {
      documentFormatValid: formatValid,
      securityFeaturesPresent: govElementsPresent,
      tamperingDetected: false, // Would require image analysis
      authenticitScore: Math.max(0, authenticitScore),
      issues
    };
  }

  /**
   * Validate extracted fields
   */
  private async validateFields(request: PermitValidationRequest): Promise<FieldValidationResult> {
    const fieldIssues: { field: string; issue: string }[] = [];
    const fields = request.extractedFields;

    // Check required fields based on document type
    const requiredFields = this.getRequiredFields(request.documentType);
    const missingFields = requiredFields.filter(field => !fields[field] || !fields[field].trim());
    
    missingFields.forEach(field => {
      fieldIssues.push({
        field,
        issue: 'Required field is missing or empty'
      });
    });

    // Validate date formats and consistency
    const dateFields = ['issueDate', 'validFrom', 'validUntil', 'expiryDate'];
    let dateConsistency = true;

    for (const dateField of dateFields) {
      if (fields[dateField] && !this.isValidDateFormat(fields[dateField])) {
        fieldIssues.push({
          field: dateField,
          issue: 'Invalid date format'
        });
        dateConsistency = false;
      }
    }

    // Check date logic (issue date before valid from, valid from before expiry, etc.)
    if (fields.issueDate && fields.validFrom && 
        new Date(fields.issueDate) > new Date(fields.validFrom)) {
      fieldIssues.push({
        field: 'validFrom',
        issue: 'Valid from date cannot be before issue date'
      });
      dateConsistency = false;
    }

    // Validate employer details (for work permits)
    let employerDetailsValid = true;
    if (request.documentType === 'work_permit') {
      if (fields.employerRegistrationNumber && 
          !this.EMPLOYER_REGISTRATION_PATTERN.test(fields.employerRegistrationNumber)) {
        fieldIssues.push({
          field: 'employerRegistrationNumber',
          issue: 'Invalid employer registration number format'
        });
        employerDetailsValid = false;
      }

      if (!fields.jobTitle || fields.jobTitle.length < 3) {
        fieldIssues.push({
          field: 'jobTitle',
          issue: 'Job title must be at least 3 characters'
        });
        employerDetailsValid = false;
      }
    }

    // Validate reference numbers
    let referenceNumbersValid = true;
    const refFields = ['permitNumber', 'referenceNumber', 'applicationNumber'];
    
    for (const refField of refFields) {
      if (fields[refField] && !/^[A-Z0-9\-\/]{6,20}$/.test(fields[refField])) {
        fieldIssues.push({
          field: refField,
          issue: 'Invalid reference number format'
        });
        referenceNumbersValid = false;
      }
    }

    return {
      requiredFieldsPresent: missingFields.length === 0,
      fieldFormatsValid: fieldIssues.filter(i => i.issue.includes('format')).length === 0,
      dateConsistency,
      referenceNumbersValid,
      employerDetailsValid,
      fieldIssues
    };
  }

  /**
   * Perform cross-reference validation with mock government databases
   */
  private async performCrossReferenceValidation(request: PermitValidationRequest): Promise<CrossReferenceResult> {
    const crossRefIssues: string[] = [];

    try {
      // Mock DHA verification
      const dhaVerificationStatus = await this.verifyWithDHA(request.permitNumber, request.documentType);
      
      // Mock employer verification (for work permits)
      let employerVerificationStatus: 'verified' | 'not_found' | 'error' | 'skipped' = 'skipped';
      if (request.documentType === 'work_permit' && request.extractedFields.employerRegistrationNumber) {
        employerVerificationStatus = await this.verifyEmployer(request.extractedFields.employerRegistrationNumber);
      }

      // Mock Labour Department verification (for work permits)
      let labourDepartmentStatus: 'verified' | 'not_found' | 'error' | 'skipped' = 'skipped';
      if (request.documentType === 'work_permit') {
        labourDepartmentStatus = await this.verifyWithLabourDepartment(request.permitNumber);
      }

      // Mock background check
      const backgroundCheckStatus = await this.performBackgroundCheck(request.applicantId);

      // Collect issues
      if (dhaVerificationStatus === 'not_found') {
        crossRefIssues.push('Permit not found in DHA database');
      }
      if (employerVerificationStatus === 'not_found') {
        crossRefIssues.push('Employer not found in registration database');
      }
      if (backgroundCheckStatus === 'issues_found') {
        crossRefIssues.push('Background check revealed issues');
      }

      return {
        dhaVerificationStatus,
        employerVerificationStatus,
        labourDepartmentStatus,
        backgroundCheckStatus,
        crossRefIssues
      };

    } catch (error) {
      console.error('Cross-reference validation error:', error);
      return this.getErrorCrossReferenceResult();
    }
  }

  /**
   * Validate POPIA compliance
   */
  private async validateCompliance(request: PermitValidationRequest): Promise<ComplianceCheckResult> {
    const complianceIssues: string[] = [];

    // Check if consent was obtained (mock implementation)
    const consentObtained = true; // Would check actual consent records

    // Check data retention policies
    const dataRetentionCompliant = true; // Would validate retention periods

    // Check access controls
    const accessControlsValid = true; // Would validate access permissions

    // POPIA compliance (Protection of Personal Information Act)
    const popiaCOMPLIANCE = consentObtained && dataRetentionCompliant && accessControlsValid;

    if (!consentObtained) {
      complianceIssues.push('No valid consent record found');
    }
    if (!dataRetentionCompliant) {
      complianceIssues.push('Data retention period exceeded');
    }
    if (!accessControlsValid) {
      complianceIssues.push('Inadequate access controls');
    }

    return {
      popiaCOMPLIANCE,
      dataRetentionCompliant,
      consentObtained,
      accessControlsValid,
      complianceIssues
    };
  }

  /**
   * Analyze security features
   */
  private async analyzeSecurityFeatures(request: PermitValidationRequest): Promise<SecurityFeatureAnalysis> {
    let securityScore = 0;

    // Mock security feature detection (would require image analysis)
    const watermarksDetected = this.detectWatermarks(request.extractedFields);
    const officialStampsPresent = this.detectOfficialStamps(request.extractedFields);
    const securityPaperFeatures = true; // Mock
    const digitalSignatureValid = this.validateDigitalSignature(request.permitNumber);
    const hologramsDetected = false; // Mock

    // Calculate security score
    if (watermarksDetected) securityScore += 20;
    if (officialStampsPresent) securityScore += 25;
    if (securityPaperFeatures) securityScore += 20;
    if (digitalSignatureValid) securityScore += 25;
    if (hologramsDetected) securityScore += 10;

    return {
      watermarksDetected,
      officialStampsPresent,
      securityPaperFeatures,
      digitalSignatureValid,
      hologramsDetected,
      securityScore
    };
  }

  // Helper methods
  private validateDocumentFormat(request: PermitValidationRequest): boolean {
    return Object.keys(request.extractedFields).length > 3; // Basic format check
  }

  private checkGovernmentElements(fields: Record<string, any>): boolean {
    const govKeywords = ['Department of Home Affairs', 'Republic of South Africa', 'DHA'];
    const fieldValues = Object.values(fields).join(' ').toLowerCase();
    return govKeywords.some(keyword => fieldValues.includes(keyword.toLowerCase()));
  }

  private getRequiredFields(documentType: string): string[] {
    const fieldSets = {
      work_permit: ['permitNumber', 'employerName', 'jobTitle', 'validFrom', 'validUntil'],
      residence_permit: ['permitNumber', 'permitType', 'validFrom', 'validUntil'],
      temporary_permit: ['permitNumber', 'validFrom', 'validUntil'],
      permanent_visa: ['permitNumber', 'nationality']
    };
    return fieldSets[documentType as keyof typeof fieldSets] || [];
  }

  private isValidDateFormat(dateStr: string): boolean {
    const dateFormats = [
      /^\d{1,2}\/\d{1,2}\/\d{4}$/,
      /^\d{4}-\d{1,2}-\d{1,2}$/,
      /^\d{1,2}-\d{1,2}-\d{4}$/
    ];
    return dateFormats.some(format => format.test(dateStr)) && !isNaN(Date.parse(dateStr));
  }

  // Mock government database verification methods
  private async verifyWithDHA(permitNumber: string, documentType: string): Promise<'verified' | 'not_found' | 'error'> {
    // Mock DHA database verification
    await this.delay(100 + Math.random() * 200);
    
    // 85% success rate for demo
    const random = Math.random();
    if (random < 0.85) return 'verified';
    if (random < 0.95) return 'not_found';
    return 'error';
  }

  private async verifyEmployer(employerRegNumber: string): Promise<'verified' | 'not_found' | 'error'> {
    await this.delay(50 + Math.random() * 100);
    
    const random = Math.random();
    if (random < 0.90) return 'verified';
    if (random < 0.97) return 'not_found';
    return 'error';
  }

  private async verifyWithLabourDepartment(permitNumber: string): Promise<'verified' | 'not_found' | 'error'> {
    await this.delay(150 + Math.random() * 100);
    
    const random = Math.random();
    if (random < 0.80) return 'verified';
    if (random < 0.92) return 'not_found';
    return 'error';
  }

  private async performBackgroundCheck(applicantId?: string): Promise<'clear' | 'pending' | 'issues_found' | 'error'> {
    if (!applicantId) return 'clear';
    
    await this.delay(200 + Math.random() * 300);
    
    const random = Math.random();
    if (random < 0.88) return 'clear';
    if (random < 0.94) return 'pending';
    if (random < 0.98) return 'issues_found';
    return 'error';
  }

  private detectWatermarks(fields: Record<string, any>): boolean {
    const text = Object.values(fields).join(' ').toLowerCase();
    return text.includes('republic of south africa') || text.includes('department of home affairs');
  }

  private detectOfficialStamps(fields: Record<string, any>): boolean {
    const text = Object.values(fields).join(' ').toLowerCase();
    return text.includes('official stamp') || text.includes('dha office');
  }

  private validateDigitalSignature(permitNumber: string): boolean {
    // Mock signature validation
    return permitNumber.length >= 10;
  }

  private calculateValidationScore(results: any): number {
    let score = 0;
    
    // Document authenticity (25%)
    score += results.documentAuthenticity.authenticitScore * 0.25;
    
    // Field validation (25%)
    const fieldScore = results.fieldValidation.requiredFieldsPresent ? 25 : 0;
    score += fieldScore;
    
    // Cross-reference validation (25%)
    const crossRefScore = results.crossReferenceValidation.dhaVerificationStatus === 'verified' ? 25 : 0;
    score += crossRefScore;
    
    // Security features (25%)
    score += results.securityFeatures.securityScore * 0.25;
    
    return Math.round(Math.max(0, Math.min(100, score)));
  }

  private determineRecommendedAction(score: number, issues: ValidationIssue[]): 'approve' | 'review_required' | 'reject' | 'request_additional_info' {
    const criticalIssues = issues.filter(i => i.severity === 'critical').length;
    const highIssues = issues.filter(i => i.severity === 'high').length;
    
    if (criticalIssues > 0) return 'reject';
    if (score < 50) return 'reject';
    if (score < 70 || highIssues > 2) return 'review_required';
    if (score < 85 || highIssues > 0) return 'request_additional_info';
    return 'approve';
  }

  private extractIssuesFromResults(results: any): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    
    // Add issues from each validation component
    if (!results.documentAuthenticity.documentFormatValid) {
      issues.push({
        category: 'authenticity',
        severity: 'critical',
        code: 'INVALID_FORMAT',
        description: 'Document format is invalid or unrecognized',
        recommendation: 'Verify document is genuine SA government permit'
      });
    }
    
    results.fieldValidation.fieldIssues.forEach((issue: any) => {
      issues.push({
        category: 'format',
        severity: 'medium',
        code: 'FIELD_VALIDATION_ERROR',
        description: `${issue.field}: ${issue.issue}`,
        recommendation: 'Correct field format or provide missing information'
      });
    });
    
    if (results.crossReferenceValidation.dhaVerificationStatus === 'not_found') {
      issues.push({
        category: 'cross_reference',
        severity: 'high',
        code: 'DHA_VERIFICATION_FAILED',
        description: 'Permit not found in DHA database',
        recommendation: 'Contact DHA to verify permit authenticity'
      });
    }
    
    return issues;
  }

  // Error result helpers
  private getSkippedCrossReferenceResult(): CrossReferenceResult {
    return {
      dhaVerificationStatus: 'skipped',
      employerVerificationStatus: 'skipped',
      labourDepartmentStatus: 'skipped',
      backgroundCheckStatus: 'skipped',
      crossRefIssues: []
    };
  }

  private getErrorAuthenticityResult(): DocumentAuthenticityResult {
    return {
      documentFormatValid: false,
      securityFeaturesPresent: false,
      tamperingDetected: false,
      authenticitScore: 0,
      issues: ['Validation error occurred']
    };
  }

  private getErrorFieldValidationResult(): FieldValidationResult {
    return {
      requiredFieldsPresent: false,
      fieldFormatsValid: false,
      dateConsistency: false,
      referenceNumbersValid: false,
      employerDetailsValid: false,
      fieldIssues: []
    };
  }

  private getErrorCrossReferenceResult(): CrossReferenceResult {
    return {
      dhaVerificationStatus: 'error',
      employerVerificationStatus: 'error',
      labourDepartmentStatus: 'error',
      backgroundCheckStatus: 'error',
      crossRefIssues: ['Cross-reference validation failed']
    };
  }

  private getErrorComplianceResult(): ComplianceCheckResult {
    return {
      popiaCOMPLIANCE: false,
      dataRetentionCompliant: false,
      consentObtained: false,
      accessControlsValid: false,
      complianceIssues: ['Compliance validation failed']
    };
  }

  private getErrorSecurityResult(): SecurityFeatureAnalysis {
    return {
      watermarksDetected: false,
      officialStampsPresent: false,
      securityPaperFeatures: false,
      digitalSignatureValid: false,
      hologramsDetected: false,
      securityScore: 0
    };
  }

  private async logValidationEvent(
    request: PermitValidationRequest, 
    score: number, 
    isValid: boolean, 
    issues: ValidationIssue[]
  ): Promise<void> {
    try {
      await storage.createSecurityEvent({
        userId: request.applicantId || 'system',
        eventType: 'permit_validation',
        severity: isValid ? 'low' : 'medium',
        details: {
          permitNumber: request.permitNumber,
          documentType: request.documentType,
          validationScore: score,
          isValid,
          issuesCount: issues.length,
          criticalIssues: issues.filter(i => i.severity === 'critical').length
        }
      });
    } catch (error) {
      console.error('Failed to log validation event:', error);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const saPermitValidator = new SAPermitValidationEngine();
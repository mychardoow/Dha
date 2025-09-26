#!/usr/bin/env tsx

/**
 * 🏛️ DHA DOCUMENT WORKFLOW VALIDATOR
 * 
 * Comprehensive end-to-end validation of all 21 DHA document generation workflows
 * Tests complete user journeys from authentication through document delivery
 */

import { performance } from 'perf_hooks';

export interface DocumentWorkflowTestConfig {
  documentType: string;
  displayName: string;
  testData: any;
  requiredFields: string[];
  expectedDuration: number; // milliseconds
  securityLevel: 'standard' | 'high' | 'ultra';
  biometricRequired: boolean;
  nprVerificationRequired: boolean;
  pkdVerificationRequired: boolean;
}

export interface WorkflowTestResult {
  documentType: string;
  success: boolean;
  duration: number;
  stages: {
    authentication: boolean;
    dataValidation: boolean;
    nprVerification: boolean;
    biometricVerification: boolean;
    documentGeneration: boolean;
    pkdSigning: boolean;
    securityFeatures: boolean;
    delivery: boolean;
  };
  securityFeatures: string[];
  verificationCode: string;
  error?: string;
  metrics: {
    responseTime: number;
    fileSize: number;
    securityScore: number;
    complianceScore: number;
  };
}

export class DocumentWorkflowValidator {
  private baseUrl: string;
  private authToken: string;

  constructor(baseUrl: string, authToken: string) {
    this.baseUrl = baseUrl;
    this.authToken = authToken;
  }

  /**
   * 🏛️ ALL 21 DHA DOCUMENT WORKFLOW CONFIGURATIONS
   */
  static readonly DOCUMENT_WORKFLOWS: DocumentWorkflowTestConfig[] = [
    // Identity Documents (4)
    {
      documentType: 'smart_id_card',
      displayName: 'Smart ID Card',
      testData: {
        idNumber: '9001015800082',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1990-01-01',
        nationality: 'South African',
        gender: 'M',
        placeOfBirth: 'Cape Town',
        address: '123 Main Street, Cape Town, 8001'
      },
      requiredFields: ['idNumber', 'firstName', 'lastName', 'dateOfBirth'],
      expectedDuration: 5000,
      securityLevel: 'high',
      biometricRequired: true,
      nprVerificationRequired: true,
      pkdVerificationRequired: true
    },
    {
      documentType: 'identity_document_book', 
      displayName: 'Identity Document Book',
      testData: {
        idNumber: '8505126789123',
        firstName: 'Jane',
        lastName: 'Smith',
        dateOfBirth: '1985-05-12',
        nationality: 'South African',
        gender: 'F',
        placeOfBirth: 'Johannesburg'
      },
      requiredFields: ['idNumber', 'firstName', 'lastName', 'dateOfBirth'],
      expectedDuration: 4500,
      securityLevel: 'high',
      biometricRequired: true,
      nprVerificationRequired: true,
      pkdVerificationRequired: true
    },
    {
      documentType: 'temporary_id_certificate',
      displayName: 'Temporary ID Certificate',
      testData: {
        firstName: 'Emergency',
        lastName: 'User',
        dateOfBirth: '1995-03-15',
        nationality: 'South African',
        gender: 'M',
        reason: 'Lost ID Document'
      },
      requiredFields: ['firstName', 'lastName', 'dateOfBirth', 'reason'],
      expectedDuration: 3000,
      securityLevel: 'standard',
      biometricRequired: false,
      nprVerificationRequired: true,
      pkdVerificationRequired: false
    },
    {
      documentType: 'green_barcoded_id',
      displayName: 'Green Barcoded ID',
      testData: {
        idNumber: '7803124567890',
        firstName: 'Legacy',
        lastName: 'Holder',
        dateOfBirth: '1978-03-12',
        nationality: 'South African',
        gender: 'F'
      },
      requiredFields: ['idNumber', 'firstName', 'lastName', 'dateOfBirth'],
      expectedDuration: 4000,
      securityLevel: 'standard',
      biometricRequired: false,
      nprVerificationRequired: true,
      pkdVerificationRequired: false
    },

    // Travel Documents (5)
    {
      documentType: 'south_african_passport',
      displayName: 'South African Passport',
      testData: {
        idNumber: '9203051234567',
        firstName: 'Traveler',
        lastName: 'International',
        dateOfBirth: '1992-03-05',
        nationality: 'South African',
        gender: 'M',
        placeOfBirth: 'Durban',
        passportType: 'ordinary'
      },
      requiredFields: ['idNumber', 'firstName', 'lastName', 'dateOfBirth', 'passportType'],
      expectedDuration: 8000,
      securityLevel: 'ultra',
      biometricRequired: true,
      nprVerificationRequired: true,
      pkdVerificationRequired: true
    },
    {
      documentType: 'emergency_travel_document',
      displayName: 'Emergency Travel Document',
      testData: {
        firstName: 'Emergency',
        lastName: 'Traveler',
        dateOfBirth: '1988-07-20',
        nationality: 'South African',
        gender: 'F',
        emergencyReason: 'Lost passport abroad',
        destination: 'South Africa'
      },
      requiredFields: ['firstName', 'lastName', 'dateOfBirth', 'emergencyReason'],
      expectedDuration: 6000,
      securityLevel: 'high',
      biometricRequired: true,
      nprVerificationRequired: true,
      pkdVerificationRequired: true
    },
    {
      documentType: 'refugee_travel_document',
      displayName: 'Refugee Travel Document',
      testData: {
        firstName: 'Refugee',
        lastName: 'Protected',
        dateOfBirth: '1985-11-30',
        nationality: 'Stateless',
        gender: 'M',
        refugeeStatus: 'Recognized Refugee',
        destinationCountry: 'Various'
      },
      requiredFields: ['firstName', 'lastName', 'dateOfBirth', 'refugeeStatus'],
      expectedDuration: 7000,
      securityLevel: 'high',
      biometricRequired: true,
      nprVerificationRequired: false,
      pkdVerificationRequired: true
    },
    {
      documentType: 'diplomatic_passport',
      displayName: 'Diplomatic Passport',
      testData: {
        idNumber: '7012015678901',
        firstName: 'Ambassador',
        lastName: 'Diplomatic',
        dateOfBirth: '1970-12-01',
        nationality: 'South African',
        gender: 'F',
        diplomaticRank: 'Ambassador',
        mission: 'Embassy'
      },
      requiredFields: ['idNumber', 'firstName', 'lastName', 'diplomaticRank'],
      expectedDuration: 10000,
      securityLevel: 'ultra',
      biometricRequired: true,
      nprVerificationRequired: true,
      pkdVerificationRequired: true
    },
    {
      documentType: 'official_passport',
      displayName: 'Official Passport',
      testData: {
        idNumber: '8506123456789',
        firstName: 'Official',
        lastName: 'Government',
        dateOfBirth: '1985-06-12',
        nationality: 'South African',
        gender: 'M',
        officialPosition: 'Government Official',
        department: 'Department of Home Affairs'
      },
      requiredFields: ['idNumber', 'firstName', 'lastName', 'officialPosition'],
      expectedDuration: 9000,
      securityLevel: 'ultra',
      biometricRequired: true,
      nprVerificationRequired: true,
      pkdVerificationRequired: true
    },

    // Civil Documents (6)
    {
      documentType: 'birth_certificate',
      displayName: 'Birth Certificate',
      testData: {
        childFirstName: 'Newborn',
        childLastName: 'Baby',
        dateOfBirth: '2023-01-15',
        placeOfBirth: 'Cape Town',
        motherFirstName: 'Mother',
        motherLastName: 'Parent',
        motherIdNumber: '8901011234567',
        fatherFirstName: 'Father',
        fatherLastName: 'Parent',
        fatherIdNumber: '8801011234567'
      },
      requiredFields: ['childFirstName', 'childLastName', 'dateOfBirth', 'placeOfBirth'],
      expectedDuration: 4000,
      securityLevel: 'high',
      biometricRequired: false,
      nprVerificationRequired: true,
      pkdVerificationRequired: true
    },
    {
      documentType: 'abridged_birth_certificate',
      displayName: 'Abridged Birth Certificate',
      testData: {
        childFirstName: 'Child',
        childLastName: 'Name',
        dateOfBirth: '2020-06-10',
        placeOfBirth: 'Johannesburg',
        registrationNumber: 'BC123456789'
      },
      requiredFields: ['childFirstName', 'childLastName', 'dateOfBirth'],
      expectedDuration: 3000,
      securityLevel: 'standard',
      biometricRequired: false,
      nprVerificationRequired: true,
      pkdVerificationRequired: false
    },
    {
      documentType: 'death_certificate',
      displayName: 'Death Certificate',
      testData: {
        deceasedFirstName: 'Deceased',
        deceasedLastName: 'Person',
        dateOfDeath: '2023-12-01',
        placeOfDeath: 'Pretoria',
        causeOfDeath: 'Natural causes',
        informantFirstName: 'Informant',
        informantLastName: 'Family',
        informantIdNumber: '7801011234567'
      },
      requiredFields: ['deceasedFirstName', 'deceasedLastName', 'dateOfDeath'],
      expectedDuration: 5000,
      securityLevel: 'high',
      biometricRequired: false,
      nprVerificationRequired: true,
      pkdVerificationRequired: true
    },
    {
      documentType: 'marriage_certificate',
      displayName: 'Marriage Certificate',
      testData: {
        spouse1FirstName: 'Spouse',
        spouse1LastName: 'One',
        spouse1IdNumber: '8501011234567',
        spouse2FirstName: 'Spouse',
        spouse2LastName: 'Two',
        spouse2IdNumber: '8601011234567',
        marriageDate: '2023-02-14',
        marriagePlace: 'Cape Town',
        marriageOfficer: 'Marriage Officer Name'
      },
      requiredFields: ['spouse1FirstName', 'spouse1LastName', 'spouse2FirstName', 'spouse2LastName', 'marriageDate'],
      expectedDuration: 6000,
      securityLevel: 'high',
      biometricRequired: false,
      nprVerificationRequired: true,
      pkdVerificationRequired: true
    },
    {
      documentType: 'customary_marriage_certificate',
      displayName: 'Customary Marriage Certificate',
      testData: {
        spouse1FirstName: 'Traditional',
        spouse1LastName: 'Spouse',
        spouse1IdNumber: '8401011234567',
        spouse2FirstName: 'Cultural',
        spouse2LastName: 'Partner',
        spouse2IdNumber: '8501011234567',
        marriageDate: '2023-03-20',
        customaryLaw: 'African Customary Law',
        witnesses: ['Witness One', 'Witness Two']
      },
      requiredFields: ['spouse1FirstName', 'spouse1LastName', 'spouse2FirstName', 'spouse2LastName'],
      expectedDuration: 6500,
      securityLevel: 'high',
      biometricRequired: false,
      nprVerificationRequired: true,
      pkdVerificationRequired: true
    },
    {
      documentType: 'death_register_extract',
      displayName: 'Death Register Extract',
      testData: {
        deceasedFirstName: 'Extract',
        deceasedLastName: 'Request',
        dateOfDeath: '2022-08-15',
        registrationNumber: 'DR987654321',
        requestReason: 'Legal proceedings'
      },
      requiredFields: ['deceasedFirstName', 'deceasedLastName', 'registrationNumber'],
      expectedDuration: 3500,
      securityLevel: 'standard',
      biometricRequired: false,
      nprVerificationRequired: true,
      pkdVerificationRequired: false
    },

    // Immigration Documents (6)
    {
      documentType: 'general_work_visa',
      displayName: 'General Work Visa',
      testData: {
        firstName: 'Worker',
        lastName: 'International',
        passportNumber: 'P123456789',
        nationality: 'Foreign National',
        dateOfBirth: '1985-04-10',
        employer: 'South African Company',
        position: 'Software Developer',
        workLocation: 'Johannesburg'
      },
      requiredFields: ['firstName', 'lastName', 'passportNumber', 'employer'],
      expectedDuration: 7000,
      securityLevel: 'high',
      biometricRequired: true,
      nprVerificationRequired: false,
      pkdVerificationRequired: true
    },
    {
      documentType: 'critical_skills_visa',
      displayName: 'Critical Skills Visa',
      testData: {
        firstName: 'Skilled',
        lastName: 'Professional',
        passportNumber: 'P987654321',
        nationality: 'Highly Skilled Foreign National',
        dateOfBirth: '1980-09-25',
        criticalSkill: 'Software Engineering',
        qualifications: 'Masters in Computer Science',
        experience: '10 years'
      },
      requiredFields: ['firstName', 'lastName', 'passportNumber', 'criticalSkill'],
      expectedDuration: 8000,
      securityLevel: 'high',
      biometricRequired: true,
      nprVerificationRequired: false,
      pkdVerificationRequired: true
    },
    {
      documentType: 'business_permit',
      displayName: 'Business Permit',
      testData: {
        firstName: 'Business',
        lastName: 'Owner',
        passportNumber: 'P456789123',
        nationality: 'Foreign Entrepreneur',
        dateOfBirth: '1975-12-08',
        businessType: 'Technology Startup',
        investmentAmount: '1000000',
        businessLocation: 'Cape Town'
      },
      requiredFields: ['firstName', 'lastName', 'passportNumber', 'businessType'],
      expectedDuration: 9000,
      securityLevel: 'high',
      biometricRequired: true,
      nprVerificationRequired: false,
      pkdVerificationRequired: true
    },
    {
      documentType: 'study_visa_permit',
      displayName: 'Study Visa/Permit',
      testData: {
        firstName: 'Student',
        lastName: 'International',
        passportNumber: 'P789123456',
        nationality: 'Foreign Student',
        dateOfBirth: '2000-03-22',
        institution: 'University of Cape Town',
        course: 'Bachelor of Science',
        studyDuration: '4 years'
      },
      requiredFields: ['firstName', 'lastName', 'passportNumber', 'institution'],
      expectedDuration: 6000,
      securityLevel: 'standard',
      biometricRequired: true,
      nprVerificationRequired: false,
      pkdVerificationRequired: true
    },
    {
      documentType: 'medical_treatment_visa',
      displayName: 'Medical Treatment Visa',
      testData: {
        firstName: 'Patient',
        lastName: 'Medical',
        passportNumber: 'P321654987',
        nationality: 'Medical Tourist',
        dateOfBirth: '1960-07-14',
        medicalCondition: 'Specialized Surgery',
        hospital: 'Groote Schuur Hospital',
        treatmentDuration: '3 months'
      },
      requiredFields: ['firstName', 'lastName', 'passportNumber', 'medicalCondition'],
      expectedDuration: 5000,
      securityLevel: 'standard',
      biometricRequired: true,
      nprVerificationRequired: false,
      pkdVerificationRequired: true
    },
    {
      documentType: 'asylum_seeker_permit',
      displayName: 'Asylum Seeker Permit',
      testData: {
        firstName: 'Asylum',
        lastName: 'Seeker',
        nationality: 'Country of Origin',
        dateOfBirth: '1990-11-05',
        countryOfOrigin: 'Conflict Zone',
        asylumReason: 'Political persecution',
        arrivalDate: '2023-10-01'
      },
      requiredFields: ['firstName', 'lastName', 'countryOfOrigin', 'asylumReason'],
      expectedDuration: 7500,
      securityLevel: 'high',
      biometricRequired: true,
      nprVerificationRequired: false,
      pkdVerificationRequired: false
    }
  ];

  /**
   * 🎯 TEST ALL DOCUMENT WORKFLOWS
   */
  async testAllDocumentWorkflows(): Promise<WorkflowTestResult[]> {
    console.log('🏛️ Testing all 21 DHA document workflows...\n');
    
    const results: WorkflowTestResult[] = [];
    
    for (const workflow of DocumentWorkflowValidator.DOCUMENT_WORKFLOWS) {
      console.log(`📋 Testing: ${workflow.displayName}`);
      const result = await this.testSingleDocumentWorkflow(workflow);
      results.push(result);
      
      const status = result.success ? '✅' : '❌';
      console.log(`${status} ${workflow.displayName}: ${result.duration.toFixed(2)}ms\n`);
    }

    return results;
  }

  /**
   * 🎯 TEST SINGLE DOCUMENT WORKFLOW
   */
  async testSingleDocumentWorkflow(workflow: DocumentWorkflowTestConfig): Promise<WorkflowTestResult> {
    const startTime = performance.now();
    
    const result: WorkflowTestResult = {
      documentType: workflow.documentType,
      success: false,
      duration: 0,
      stages: {
        authentication: false,
        dataValidation: false,
        nprVerification: false,
        biometricVerification: false,
        documentGeneration: false,
        pkdSigning: false,
        securityFeatures: false,
        delivery: false
      },
      securityFeatures: [],
      verificationCode: '',
      metrics: {
        responseTime: 0,
        fileSize: 0,
        securityScore: 0,
        complianceScore: 0
      }
    };

    try {
      // Stage 1: Authentication
      result.stages.authentication = await this.testAuthentication();
      
      // Stage 2: Data Validation
      result.stages.dataValidation = await this.testDataValidation(workflow);
      
      // Stage 3: NPR Verification (if required)
      if (workflow.nprVerificationRequired) {
        result.stages.nprVerification = await this.testNPRVerification(workflow.testData);
      } else {
        result.stages.nprVerification = true;
      }
      
      // Stage 4: Biometric Verification (if required)
      if (workflow.biometricRequired) {
        result.stages.biometricVerification = await this.testBiometricVerification();
      } else {
        result.stages.biometricVerification = true;
      }
      
      // Stage 5: Document Generation
      const docGenResult = await this.testDocumentGeneration(workflow);
      result.stages.documentGeneration = docGenResult.success;
      result.securityFeatures = docGenResult.securityFeatures;
      result.verificationCode = docGenResult.verificationCode;
      
      // Stage 6: PKD Signing (if required)
      if (workflow.pkdVerificationRequired) {
        result.stages.pkdSigning = await this.testPKDSigning(docGenResult.documentId);
      } else {
        result.stages.pkdSigning = true;
      }
      
      // Stage 7: Security Features Validation
      result.stages.securityFeatures = await this.testSecurityFeatures(docGenResult.securityFeatures);
      
      // Stage 8: Document Delivery
      result.stages.delivery = await this.testDocumentDelivery(docGenResult.documentId);
      
      // Calculate overall success
      result.success = Object.values(result.stages).every(stage => stage === true);
      
      // Calculate metrics
      result.duration = performance.now() - startTime;
      result.metrics.responseTime = result.duration;
      result.metrics.fileSize = docGenResult.fileSize || 0;
      result.metrics.securityScore = this.calculateSecurityScore(result);
      result.metrics.complianceScore = this.calculateComplianceScore(result, workflow);
      
    } catch (error) {
      result.error = error instanceof Error ? error.message : String(error);
      result.duration = performance.now() - startTime;
    }

    return result;
  }

  /**
   * 🔐 TEST AUTHENTICATION
   */
  private async testAuthentication(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/verify`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      });
      
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * ✅ TEST DATA VALIDATION
   */
  private async testDataValidation(workflow: DocumentWorkflowTestConfig): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/documents/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`
        },
        body: JSON.stringify({
          documentType: workflow.documentType,
          data: workflow.testData
        })
      });
      
      const result = await response.json();
      return response.ok && result.valid;
    } catch (error) {
      return false;
    }
  }

  /**
   * 🏛️ TEST NPR VERIFICATION
   */
  private async testNPRVerification(testData: any): Promise<boolean> {
    if (!testData.idNumber) return true; // Skip if no ID number
    
    try {
      const response = await fetch(`${this.baseUrl}/api/government/npr/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`
        },
        body: JSON.stringify({
          idNumber: testData.idNumber,
          firstName: testData.firstName,
          lastName: testData.lastName,
          dateOfBirth: testData.dateOfBirth
        })
      });
      
      const result = await response.json();
      return response.ok && result.verified;
    } catch (error) {
      return false;
    }
  }

  /**
   * 👁️ TEST BIOMETRIC VERIFICATION
   */
  private async testBiometricVerification(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/biometric/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`
        },
        body: JSON.stringify({
          biometricData: 'test_biometric_template',
          verificationType: 'fingerprint'
        })
      });
      
      const result = await response.json();
      return response.ok && result.verified;
    } catch (error) {
      return false;
    }
  }

  /**
   * 📄 TEST DOCUMENT GENERATION
   */
  private async testDocumentGeneration(workflow: DocumentWorkflowTestConfig): Promise<{
    success: boolean;
    documentId: string;
    securityFeatures: string[];
    verificationCode: string;
    fileSize?: number;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/documents/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`
        },
        body: JSON.stringify({
          documentType: workflow.documentType,
          applicantData: workflow.testData
        })
      });
      
      if (!response.ok) {
        throw new Error(`Document generation failed: ${response.status}`);
      }
      
      const result = await response.json();
      
      return {
        success: true,
        documentId: result.documentId,
        securityFeatures: result.securityFeatures || [],
        verificationCode: result.verificationCode || '',
        fileSize: result.fileSize
      };
    } catch (error) {
      return {
        success: false,
        documentId: '',
        securityFeatures: [],
        verificationCode: ''
      };
    }
  }

  /**
   * 🔒 TEST PKD SIGNING
   */
  private async testPKDSigning(documentId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/documents/pkd-sign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`
        },
        body: JSON.stringify({
          documentId
        })
      });
      
      const result = await response.json();
      return response.ok && result.signed;
    } catch (error) {
      return false;
    }
  }

  /**
   * 🛡️ TEST SECURITY FEATURES
   */
  private async testSecurityFeatures(securityFeatures: string[]): Promise<boolean> {
    const requiredFeatures = ['watermark', 'digital_signature', 'qr_code', 'barcode'];
    const hasRequiredFeatures = requiredFeatures.every(feature => 
      securityFeatures.includes(feature)
    );
    
    return hasRequiredFeatures;
  }

  /**
   * 📦 TEST DOCUMENT DELIVERY
   */
  private async testDocumentDelivery(documentId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/documents/download/${documentId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      });
      
      return response.ok && response.headers.get('content-type')?.includes('application/pdf');
    } catch (error) {
      return false;
    }
  }

  /**
   * 📊 CALCULATE SECURITY SCORE
   */
  private calculateSecurityScore(result: WorkflowTestResult): number {
    let score = 0;
    const maxScore = 100;
    
    // Authentication (20 points)
    if (result.stages.authentication) score += 20;
    
    // Biometric verification (20 points)
    if (result.stages.biometricVerification) score += 20;
    
    // PKD signing (20 points)
    if (result.stages.pkdSigning) score += 20;
    
    // Security features (20 points)
    if (result.stages.securityFeatures) score += 20;
    
    // NPR verification (20 points)
    if (result.stages.nprVerification) score += 20;
    
    return Math.min(score, maxScore);
  }

  /**
   * 📊 CALCULATE COMPLIANCE SCORE
   */
  private calculateComplianceScore(result: WorkflowTestResult, workflow: DocumentWorkflowTestConfig): number {
    let score = 0;
    const maxScore = 100;
    
    // All stages completed (50 points)
    if (result.success) score += 50;
    
    // Response time within expected (25 points)
    if (result.duration <= workflow.expectedDuration) score += 25;
    
    // Security level compliance (25 points)
    if (workflow.securityLevel === 'ultra' && result.metrics.securityScore >= 80) score += 25;
    else if (workflow.securityLevel === 'high' && result.metrics.securityScore >= 60) score += 25;
    else if (workflow.securityLevel === 'standard' && result.metrics.securityScore >= 40) score += 25;
    
    return Math.min(score, maxScore);
  }

  /**
   * 📋 GENERATE WORKFLOW REPORT
   */
  generateWorkflowReport(results: WorkflowTestResult[]): any {
    const totalWorkflows = results.length;
    const successfulWorkflows = results.filter(r => r.success).length;
    const averageDuration = results.reduce((sum, r) => sum + r.duration, 0) / totalWorkflows;
    const averageSecurityScore = results.reduce((sum, r) => sum + r.metrics.securityScore, 0) / totalWorkflows;
    const averageComplianceScore = results.reduce((sum, r) => sum + r.metrics.complianceScore, 0) / totalWorkflows;

    return {
      summary: {
        totalWorkflows,
        successfulWorkflows,
        successRate: (successfulWorkflows / totalWorkflows) * 100,
        averageDuration: Math.round(averageDuration),
        averageSecurityScore: Math.round(averageSecurityScore),
        averageComplianceScore: Math.round(averageComplianceScore)
      },
      workflowResults: results,
      recommendations: this.generateWorkflowRecommendations(results)
    };
  }

  /**
   * 💡 GENERATE WORKFLOW RECOMMENDATIONS
   */
  private generateWorkflowRecommendations(results: WorkflowTestResult[]): string[] {
    const recommendations: string[] = [];
    
    const failedResults = results.filter(r => !r.success);
    if (failedResults.length > 0) {
      recommendations.push(`Fix ${failedResults.length} failed workflow(s): ${failedResults.map(r => r.documentType).join(', ')}`);
    }
    
    const slowWorkflows = results.filter(r => r.duration > 10000);
    if (slowWorkflows.length > 0) {
      recommendations.push(`Optimize ${slowWorkflows.length} slow workflow(s) taking >10s`);
    }
    
    const lowSecurityWorkflows = results.filter(r => r.metrics.securityScore < 80);
    if (lowSecurityWorkflows.length > 0) {
      recommendations.push(`Enhance security for ${lowSecurityWorkflows.length} workflow(s) with low security scores`);
    }
    
    const averageSuccessRate = (results.filter(r => r.success).length / results.length) * 100;
    if (averageSuccessRate >= 95) {
      recommendations.push('All document workflows are operating at high reliability standards');
    }
    
    return recommendations;
  }
}

export default DocumentWorkflowValidator;
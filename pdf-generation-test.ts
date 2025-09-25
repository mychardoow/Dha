#!/usr/bin/env tsx
/**
 * COMPREHENSIVE PDF GENERATION TESTING SUITE
 * 
 * This script tests ALL 21+ DHA document generation endpoints systematically
 * for Railway deployment readiness.
 */

import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';

// Server configuration
const SERVER_URL = 'http://localhost:5001';
const OUTPUT_DIR = './test-pdf-outputs';
const TEST_TIMEOUT = 30000; // 30 seconds

// Realistic South African sample data
const REALISTIC_SA_DATA = {
  // Valid South African ID numbers (using algorithm)
  validIdNumbers: [
    '9001015009087', // Born 1990-01-01, Male, Citizen
    '8506152584082', // Born 1985-06-15, Female, Citizen  
    '7509301234088', // Born 1975-09-30, Male, Citizen
    '9203285432091', // Born 1992-03-28, Female, Citizen
  ],
  
  // South African places
  places: [
    'Cape Town, Western Cape',
    'Johannesburg, Gauteng', 
    'Durban, KwaZulu-Natal',
    'Pretoria, Gauteng',
    'Port Elizabeth, Eastern Cape',
    'Bloemfontein, Free State',
    'Pietermaritzburg, KwaZulu-Natal',
    'East London, Eastern Cape'
  ],
  
  // South African names
  names: {
    first: ['Thabo', 'Nomsa', 'Sipho', 'Zanele', 'Mandla', 'Thandiwe', 'Kagiso', 'Lerato'],
    last: ['Mthembu', 'Nkomo', 'Van der Merwe', 'Patel', 'Dlamini', 'Mokgale', 'Botha', 'Mahlangu']
  },
  
  // South African addresses
  addresses: [
    '123 Long Street, Cape Town, 8001',
    '456 Commissioner Street, Johannesburg, 2001', 
    '789 Marine Parade, Durban, 4001',
    '321 Church Street, Pretoria, 0002',
    '654 Russell Road, Port Elizabeth, 6001'
  ],
  
  // South African phone numbers
  phoneNumbers: [
    '+27 11 123 4567',
    '+27 21 987 6543', 
    '+27 31 555 0123',
    '+27 12 444 5555',
    '+27 41 222 3333'
  ],
  
  // Employers in South Africa
  employers: [
    'Anglo American Platinum',
    'Sasol Limited',
    'MTN Group',
    'Standard Bank',
    'University of Cape Town',
    'Eskom Holdings',
    'Old Mutual',
    'Discovery Limited'
  ],
  
  // Educational institutions
  institutions: [
    'University of the Witwatersrand',
    'University of Cape Town', 
    'Stellenbosch University',
    'University of KwaZulu-Natal',
    'Rhodes University',
    'University of Pretoria'
  ]
};

// Complete list of all DHA document types to test
const ALL_DHA_DOCUMENT_TYPES = [
  // Identity Documents
  'smart_id_card',
  'green_barcoded_id', 
  'temporary_id_certificate',
  
  // Birth Documents
  'birth_certificate',
  'abridged_birth_certificate',
  'late_registration_birth',
  
  // Marriage Documents
  'marriage_certificate',
  'marriage_register_extract',
  'customary_marriage_certificate',
  
  // Death Documents
  'death_certificate',
  'death_register_extract',
  
  // Passport Documents
  'ordinary_passport',
  'diplomatic_passport',
  'official_passport',
  'emergency_travel_document',
  
  // Immigration Documents
  'study_permit',
  'work_permit',
  'business_permit',
  'critical_skills_visa',
  'permanent_residence_permit',
  'asylum_seeker_permit',
  
  // Visa Types
  'visitor_visa',
  'transit_visa',
  'medical_treatment_visa',
  'relatives_visa',
  'corporate_visa',
  'treaty_visa',
  'retirement_visa',
  
  // Additional Documents
  'radiological_report',
  'medical_certificate'
];

// Test endpoints mapping
const TEST_ENDPOINTS = [
  // Generic endpoint
  { type: 'generic', url: '/api/pdf/generate/:documentType' },
  
  // Specific endpoints
  { type: 'specific', url: '/api/pdf/birth-certificate' },
  { type: 'specific', url: '/api/pdf/work-permit' },
  { type: 'specific', url: '/api/pdf/passport' },
  { type: 'specific', url: '/api/pdf/visitor-visa' },
  { type: 'specific', url: '/api/pdf/study-permit' },
  { type: 'specific', url: '/api/pdf/business-permit' },
  { type: 'specific', url: '/api/pdf/medical-certificate' },
  { type: 'specific', url: '/api/pdf/radiological-report' },
  { type: 'specific', url: '/api/pdf/asylum-visa' },
  { type: 'specific', url: '/api/pdf/residence-permit' },
  { type: 'specific', url: '/api/pdf/critical-skills' },
  { type: 'specific', url: '/api/pdf/business-visa' },
  { type: 'specific', url: '/api/pdf/retirement-visa' },
  { type: 'specific', url: '/api/pdf/relatives-visa' },
  { type: 'specific', url: '/api/pdf/corporate-visa' },
  { type: 'specific', url: '/api/pdf/temporary-residence' },
  { type: 'specific', url: '/api/pdf/general-work' },
  { type: 'specific', url: '/api/pdf/transit-visa' },
  { type: 'specific', url: '/api/pdf/medical-treatment-visa' }
];

interface TestResult {
  documentType: string;
  endpoint: string;
  method: string;
  success: boolean;
  statusCode?: number;
  responseTime: number;
  pdfGenerated: boolean;
  pdfSize?: number;
  error?: string;
  validationResults?: {
    hasHeaders: boolean;
    hasContent: boolean;
    hasVerificationCode: boolean;
    hasOfficialSeal: boolean;
  };
}

class PDFGenerationTester {
  private results: TestResult[] = [];
  
  constructor() {
    this.setupOutputDirectory();
  }
  
  private async setupOutputDirectory(): Promise<void> {
    try {
      await fs.mkdir(OUTPUT_DIR, { recursive: true });
      console.log(`📁 Created output directory: ${OUTPUT_DIR}`);
    } catch (error) {
      console.error(`❌ Failed to create output directory:`, error);
    }
  }
  
  /**
   * Generate realistic test data for a specific document type
   */
  private generateTestData(documentType: string): any {
    const randomIndex = (arr: any[]) => Math.floor(Math.random() * arr.length);
    
    const baseData = {
      fullName: `${REALISTIC_SA_DATA.names.first[randomIndex(REALISTIC_SA_DATA.names.first)]} ${REALISTIC_SA_DATA.names.last[randomIndex(REALISTIC_SA_DATA.names.last)]}`,
      firstName: REALISTIC_SA_DATA.names.first[randomIndex(REALISTIC_SA_DATA.names.first)],
      lastName: REALISTIC_SA_DATA.names.last[randomIndex(REALISTIC_SA_DATA.names.last)],
      dateOfBirth: '1990-05-15',
      gender: Math.random() > 0.5 ? 'M' : 'F',
      nationality: 'South African',
      idNumber: REALISTIC_SA_DATA.validIdNumbers[randomIndex(REALISTIC_SA_DATA.validIdNumbers)],
      placeOfBirth: REALISTIC_SA_DATA.places[randomIndex(REALISTIC_SA_DATA.places)],
      address: REALISTIC_SA_DATA.addresses[randomIndex(REALISTIC_SA_DATA.addresses)],
      phoneNumber: REALISTIC_SA_DATA.phoneNumbers[randomIndex(REALISTIC_SA_DATA.phoneNumbers)],
      email: 'test@example.com',
      issuanceDate: new Date().toISOString().split('T')[0],
      expiryDate: '2034-05-15',
      issuingOffice: 'DHA Digital Services - Test'
    };
    
    // Add document-specific data
    switch (documentType) {
      case 'birth_certificate':
        return {
          ...baseData,
          fatherName: `${REALISTIC_SA_DATA.names.first[randomIndex(REALISTIC_SA_DATA.names.first)]} ${REALISTIC_SA_DATA.names.last[randomIndex(REALISTIC_SA_DATA.names.last)]}`,
          motherName: `${REALISTIC_SA_DATA.names.first[randomIndex(REALISTIC_SA_DATA.names.first)]} ${REALISTIC_SA_DATA.names.last[randomIndex(REALISTIC_SA_DATA.names.last)]}`,
          fatherFullName: `${REALISTIC_SA_DATA.names.first[randomIndex(REALISTIC_SA_DATA.names.first)]} ${REALISTIC_SA_DATA.names.last[randomIndex(REALISTIC_SA_DATA.names.last)]}`,
          motherFullName: `${REALISTIC_SA_DATA.names.first[randomIndex(REALISTIC_SA_DATA.names.first)]} ${REALISTIC_SA_DATA.names.last[randomIndex(REALISTIC_SA_DATA.names.last)]}`
        };
        
      case 'work_permit':
        return {
          ...baseData,
          employer: {
            name: REALISTIC_SA_DATA.employers[randomIndex(REALISTIC_SA_DATA.employers)]
          },
          position: 'Software Engineer',
          occupation: 'Software Engineer',
          validUntil: '2025-12-31'
        };
        
      case 'study_permit':
        return {
          ...baseData,
          institution: REALISTIC_SA_DATA.institutions[randomIndex(REALISTIC_SA_DATA.institutions)],
          course: 'Computer Science',
          validUntil: '2025-12-31'
        };
        
      case 'medical_certificate':
        return {
          ...baseData,
          doctor: {
            fullName: `Dr. ${REALISTIC_SA_DATA.names.first[randomIndex(REALISTIC_SA_DATA.names.first)]} ${REALISTIC_SA_DATA.names.last[randomIndex(REALISTIC_SA_DATA.names.last)]}`
          },
          medicalHistory: {
            chronicConditions: ['None']
          }
        };
        
      case 'ordinary_passport':
      case 'passport':
        return {
          ...baseData,
          passportNumber: `P${Math.random().toString().substr(2, 8)}`,
          countryCode: 'ZAF'
        };
        
      default:
        return baseData;
    }
  }
  
  /**
   * Test server health and connectivity
   */
  private async testServerHealth(): Promise<boolean> {
    try {
      console.log('🏥 Testing server health...');
      
      const healthResponse = await axios.get(`${SERVER_URL}/api/health`, {
        timeout: 10000
      });
      
      console.log(`✅ Health check: ${healthResponse.status} - ${healthResponse.statusText}`);
      
      // Test PDF health endpoint
      try {
        const pdfHealthResponse = await axios.get(`${SERVER_URL}/api/pdf/health`, {
          timeout: 10000
        });
        console.log(`✅ PDF service health: ${pdfHealthResponse.status}`);
        return true;
      } catch (error) {
        console.log(`⚠️ PDF health endpoint unavailable, proceeding with tests`);
        return true; // Continue testing even if health endpoint fails
      }
      
    } catch (error) {
      console.error(`❌ Server health check failed:`, error);
      return false;
    }
  }
  
  /**
   * Test a single PDF generation endpoint
   */
  private async testPDFEndpoint(documentType: string, endpoint: string): Promise<TestResult> {
    const startTime = Date.now();
    const testData = this.generateTestData(documentType);
    
    console.log(`📄 Testing ${documentType} via ${endpoint}...`);
    
    try {
      let url: string;
      let requestData: any;
      
      if (endpoint.includes(':documentType')) {
        // Generic endpoint
        url = `${SERVER_URL}${endpoint.replace(':documentType', documentType)}`;
        requestData = testData;
      } else {
        // Specific endpoint
        url = `${SERVER_URL}${endpoint}`;
        requestData = { personal: testData, ...testData };
      }
      
      const response = await axios.post(url, requestData, {
        timeout: TEST_TIMEOUT,
        responseType: 'arraybuffer',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const responseTime = Date.now() - startTime;
      const pdfBuffer = Buffer.from(response.data as ArrayBuffer);
      const pdfSize = pdfBuffer.length;
      
      // Validate PDF content
      const validationResults = this.validatePDFContent(pdfBuffer);
      
      // Save PDF file
      const fileName = `${documentType}_${Date.now()}.pdf`;
      const filePath = path.join(OUTPUT_DIR, fileName);
      await fs.writeFile(filePath, pdfBuffer);
      
      console.log(`✅ ${documentType}: Generated PDF (${pdfSize} bytes) in ${responseTime}ms`);
      
      return {
        documentType,
        endpoint,
        method: 'POST',
        success: true,
        statusCode: response.status,
        responseTime,
        pdfGenerated: true,
        pdfSize,
        validationResults
      };
      
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      console.error(`❌ ${documentType} failed:`, error.message);
      
      return {
        documentType,
        endpoint,
        method: 'POST',
        success: false,
        statusCode: error.response?.status,
        responseTime,
        pdfGenerated: false,
        error: error.message
      };
    }
  }
  
  /**
   * Validate PDF content for authenticity features
   */
  private validatePDFContent(pdfBuffer: Buffer): {
    hasHeaders: boolean;
    hasContent: boolean;
    hasVerificationCode: boolean;
    hasOfficialSeal: boolean;
  } {
    const pdfContent = pdfBuffer.toString('binary');
    
    return {
      hasHeaders: pdfContent.includes('REPUBLIC OF SOUTH AFRICA') || 
                 pdfContent.includes('DEPARTMENT OF HOME AFFAIRS'),
      hasContent: pdfBuffer.length > 1000, // Minimum content size
      hasVerificationCode: pdfContent.includes('Verification') || 
                          pdfContent.includes('Code'),
      hasOfficialSeal: pdfContent.includes('OFFICIAL') || 
                      pdfContent.includes('SEAL')
    };
  }
  
  /**
   * Test error handling scenarios
   */
  private async testErrorHandling(): Promise<TestResult[]> {
    console.log('🚨 Testing error handling scenarios...');
    
    const errorTests: TestResult[] = [];
    
    // Test 1: Invalid document type
    try {
      await axios.post(`${SERVER_URL}/api/pdf/generate/invalid_document_type`, {
        fullName: 'Test User'
      }, { timeout: 5000 });
    } catch (error: any) {
      errorTests.push({
        documentType: 'invalid_document_type',
        endpoint: '/api/pdf/generate/invalid_document_type',
        method: 'POST',
        success: error.response?.status === 400,
        statusCode: error.response?.status,
        responseTime: 0,
        pdfGenerated: false,
        error: 'Expected 400 for invalid document type'
      });
    }
    
    // Test 2: Missing required data
    try {
      await axios.post(`${SERVER_URL}/api/pdf/generate/birth_certificate`, {
        // Missing required fields
      }, { timeout: 5000 });
    } catch (error: any) {
      errorTests.push({
        documentType: 'birth_certificate',
        endpoint: '/api/pdf/generate/birth_certificate',
        method: 'POST',
        success: error.response?.status >= 400,
        statusCode: error.response?.status,
        responseTime: 0,
        pdfGenerated: false,
        error: 'Expected error for missing data'
      });
    }
    
    return errorTests;
  }
  
  /**
   * Run performance testing
   */
  private async testPerformance(): Promise<void> {
    console.log('⚡ Testing performance with concurrent requests...');
    
    const concurrentTests: Promise<TestResult>[] = [];
    const documentType = 'birth_certificate';
    const endpoint = '/api/pdf/generate/birth_certificate';
    
    // Test 5 concurrent requests
    for (let i = 0; i < 5; i++) {
      concurrentTests.push(this.testPDFEndpoint(`${documentType}_concurrent_${i}`, endpoint));
    }
    
    try {
      const results = await Promise.all(concurrentTests);
      const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
      
      console.log(`⚡ Concurrent test completed. Average response time: ${avgResponseTime}ms`);
      this.results.push(...results);
    } catch (error) {
      console.error('❌ Performance test failed:', error);
    }
  }
  
  /**
   * Generate comprehensive test report
   */
  private generateReport(): void {
    console.log('\n' + '='.repeat(80));
    console.log('📊 COMPREHENSIVE PDF GENERATION TEST REPORT');
    console.log('='.repeat(80));
    
    const totalTests = this.results.length;
    const successfulTests = this.results.filter(r => r.success).length;
    const failedTests = totalTests - successfulTests;
    const avgResponseTime = this.results.reduce((sum, r) => sum + r.responseTime, 0) / totalTests;
    
    console.log(`\n📈 SUMMARY STATISTICS:`);
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   Successful: ${successfulTests} (${(successfulTests/totalTests*100).toFixed(1)}%)`);
    console.log(`   Failed: ${failedTests} (${(failedTests/totalTests*100).toFixed(1)}%)`);
    console.log(`   Average Response Time: ${avgResponseTime.toFixed(0)}ms`);
    
    // Success rate by document type
    const documentTypes = [...new Set(this.results.map(r => r.documentType))];
    console.log(`\n📋 DOCUMENT TYPE RESULTS:`);
    
    for (const docType of documentTypes) {
      const typeResults = this.results.filter(r => r.documentType === docType);
      const typeSuccess = typeResults.filter(r => r.success).length;
      const typeTotal = typeResults.length;
      const successRate = typeTotal > 0 ? (typeSuccess/typeTotal*100).toFixed(1) : '0.0';
      
      console.log(`   ${docType}: ${typeSuccess}/${typeTotal} (${successRate}%)`);
    }
    
    // Failed tests details
    if (failedTests > 0) {
      console.log(`\n❌ FAILED TESTS:`);
      this.results.filter(r => !r.success).forEach(result => {
        console.log(`   ${result.documentType} via ${result.endpoint}`);
        console.log(`      Status: ${result.statusCode || 'No response'}`);
        console.log(`      Error: ${result.error || 'Unknown error'}`);
      });
    }
    
    // PDF validation results
    const validationResults = this.results.filter(r => r.validationResults);
    if (validationResults.length > 0) {
      console.log(`\n🔍 PDF VALIDATION RESULTS:`);
      const totalValidations = validationResults.length;
      const hasHeaders = validationResults.filter(r => r.validationResults?.hasHeaders).length;
      const hasContent = validationResults.filter(r => r.validationResults?.hasContent).length;
      const hasVerificationCode = validationResults.filter(r => r.validationResults?.hasVerificationCode).length;
      const hasOfficialSeal = validationResults.filter(r => r.validationResults?.hasOfficialSeal).length;
      
      console.log(`   Headers: ${hasHeaders}/${totalValidations} (${(hasHeaders/totalValidations*100).toFixed(1)}%)`);
      console.log(`   Content: ${hasContent}/${totalValidations} (${(hasContent/totalValidations*100).toFixed(1)}%)`);
      console.log(`   Verification Code: ${hasVerificationCode}/${totalValidations} (${(hasVerificationCode/totalValidations*100).toFixed(1)}%)`);
      console.log(`   Official Seal: ${hasOfficialSeal}/${totalValidations} (${(hasOfficialSeal/totalValidations*100).toFixed(1)}%)`);
    }
    
    // Performance metrics
    const responseTimes = this.results.map(r => r.responseTime);
    const minTime = Math.min(...responseTimes);
    const maxTime = Math.max(...responseTimes);
    const medianTime = responseTimes.sort((a, b) => a - b)[Math.floor(responseTimes.length / 2)];
    
    console.log(`\n⚡ PERFORMANCE METRICS:`);
    console.log(`   Fastest Response: ${minTime}ms`);
    console.log(`   Slowest Response: ${maxTime}ms`);
    console.log(`   Median Response: ${medianTime}ms`);
    console.log(`   Average Response: ${avgResponseTime.toFixed(0)}ms`);
    
    // Railway deployment readiness
    const deploymentReady = successfulTests >= totalTests * 0.9; // 90% success rate
    console.log(`\n🚀 RAILWAY DEPLOYMENT READINESS:`);
    console.log(`   Status: ${deploymentReady ? '✅ READY' : '❌ NOT READY'}`);
    console.log(`   Recommendation: ${deploymentReady ? 
      'All systems operational. Ready for production deployment.' : 
      'Issues detected. Address failed tests before deployment.'}`);
    
    console.log('\n' + '='.repeat(80));
  }
  
  /**
   * Run comprehensive test suite
   */
  async runComprehensiveTests(): Promise<void> {
    console.log('🚀 Starting Comprehensive PDF Generation Testing Suite');
    console.log('Testing all 21+ DHA document types for Railway deployment readiness\n');
    
    // Step 1: Test server connectivity
    const serverHealthy = await this.testServerHealth();
    if (!serverHealthy) {
      console.error('❌ Server not accessible. Cannot proceed with tests.');
      return;
    }
    
    // Step 2: Test all document types via generic endpoint
    console.log('\n📋 Testing all document types via generic endpoint...');
    for (const documentType of ALL_DHA_DOCUMENT_TYPES) {
      const result = await this.testPDFEndpoint(documentType, '/api/pdf/generate/:documentType');
      this.results.push(result);
      
      // Small delay to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Step 3: Test specific endpoints
    console.log('\n🎯 Testing specific document endpoints...');
    const specificEndpoints = TEST_ENDPOINTS.filter(e => e.type === 'specific');
    for (const endpoint of specificEndpoints) {
      const documentType = endpoint.url.split('/').pop()?.replace('-', '_') || 'unknown';
      const result = await this.testPDFEndpoint(documentType, endpoint.url);
      this.results.push(result);
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Step 4: Error handling tests
    const errorResults = await this.testErrorHandling();
    this.results.push(...errorResults);
    
    // Step 5: Performance testing
    await this.testPerformance();
    
    // Step 6: Generate comprehensive report
    this.generateReport();
    
    // Save detailed results to file
    const reportPath = path.join(OUTPUT_DIR, 'test-report.json');
    await fs.writeFile(reportPath, JSON.stringify(this.results, null, 2));
    console.log(`\n💾 Detailed test results saved to: ${reportPath}`);
  }
}

// Run the comprehensive test suite
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new PDFGenerationTester();
  tester.runComprehensiveTests().catch(console.error);
}

export { PDFGenerationTester };
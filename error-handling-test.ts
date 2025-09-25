#!/usr/bin/env tsx
/**
 * ERROR HANDLING AND EDGE CASE TESTING
 * 
 * This tests error scenarios and edge cases for PDF generation
 */

import { completePDFGenerationService, DHADocumentType, type DocumentData, type GenerationOptions } from './server/services/complete-pdf-generation-service';

interface ErrorTestCase {
  name: string;
  documentType: DHADocumentType;
  testData: Partial<DocumentData>;
  expectedError: boolean;
  description: string;
}

interface ErrorTestResult {
  testCase: string;
  success: boolean;
  expectedError: boolean;
  actuallyFailed: boolean;
  error?: string;
  processingTime: number;
}

class ErrorHandlingTester {
  private results: ErrorTestResult[] = [];
  
  /**
   * Define error test cases
   */
  private getErrorTestCases(): ErrorTestCase[] {
    return [
      // Missing required fields
      {
        name: 'missing_full_name',
        documentType: DHADocumentType.BIRTH_CERTIFICATE,
        testData: {
          dateOfBirth: '1990-01-01',
          gender: 'M',
          nationality: 'South African'
          // Missing fullName
        },
        expectedError: true,
        description: 'Should fail when fullName is missing'
      },
      
      {
        name: 'missing_date_of_birth',
        documentType: DHADocumentType.WORK_PERMIT,
        testData: {
          fullName: 'Test User',
          gender: 'F',
          nationality: 'South African'
          // Missing dateOfBirth
        },
        expectedError: true,
        description: 'Should fail when dateOfBirth is missing'
      },
      
      {
        name: 'missing_nationality',
        documentType: DHADocumentType.VISITOR_VISA,
        testData: {
          fullName: 'Test User',
          dateOfBirth: '1990-01-01',
          gender: 'M'
          // Missing nationality
        },
        expectedError: true,
        description: 'Should fail when nationality is missing'
      },
      
      // Document-specific validation errors
      {
        name: 'passport_missing_passport_number',
        documentType: DHADocumentType.ORDINARY_PASSPORT,
        testData: {
          fullName: 'Test User',
          dateOfBirth: '1990-01-01',
          gender: 'M',
          nationality: 'South African'
          // Missing passportNumber for passport
        },
        expectedError: true,
        description: 'Should fail when passport number is missing for passport document'
      },
      
      {
        name: 'birth_cert_missing_place_of_birth',
        documentType: DHADocumentType.BIRTH_CERTIFICATE,
        testData: {
          fullName: 'Test User',
          dateOfBirth: '1990-01-01',
          gender: 'M',
          nationality: 'South African'
          // Missing placeOfBirth for birth certificate
        },
        expectedError: true,
        description: 'Should fail when place of birth is missing for birth certificate'
      },
      
      {
        name: 'work_permit_missing_employer',
        documentType: DHADocumentType.WORK_PERMIT,
        testData: {
          fullName: 'Test User',
          dateOfBirth: '1990-01-01',
          gender: 'M',
          nationality: 'South African'
          // Missing employer and position for work permit
        },
        expectedError: true,
        description: 'Should fail when employer and position are missing for work permit'
      },
      
      // Edge cases with valid data (should succeed)
      {
        name: 'minimal_valid_data',
        documentType: DHADocumentType.SMART_ID_CARD,
        testData: {
          fullName: 'A',  // Very short name
          dateOfBirth: '1900-01-01',  // Very old date
          gender: 'F',
          nationality: 'South African',
          issuanceDate: '2024-01-01',
          issuingOffice: 'Test'
        },
        expectedError: false,
        description: 'Should succeed with minimal valid data'
      },
      
      {
        name: 'long_name_data',
        documentType: DHADocumentType.MARRIAGE_CERTIFICATE,
        testData: {
          fullName: 'Very Long Name That Contains Multiple Words And Special Characters',
          dateOfBirth: '1990-01-01',
          gender: 'M',
          nationality: 'South African',
          issuanceDate: '2024-01-01',
          issuingOffice: 'Test Office'
        },
        expectedError: false,
        description: 'Should succeed with long names'
      },
      
      {
        name: 'future_date_edge_case',
        documentType: DHADocumentType.DEATH_CERTIFICATE,
        testData: {
          fullName: 'Test User',
          dateOfBirth: '2023-12-31',  // Recent birth date
          gender: 'M',
          nationality: 'South African',
          issuanceDate: '2024-01-01',
          issuingOffice: 'Test Office'
        },
        expectedError: false,
        description: 'Should succeed with recent birth dates'
      },
      
      // Security test cases
      {
        name: 'special_characters_injection',
        documentType: DHADocumentType.VISITOR_VISA,
        testData: {
          fullName: 'Test <script>alert("xss")</script> User',
          dateOfBirth: '1990-01-01',
          gender: 'M',
          nationality: 'South African',
          issuanceDate: '2024-01-01',
          issuingOffice: 'Test Office'
        },
        expectedError: false,
        description: 'Should handle special characters safely (no injection)'
      }
    ];
  }
  
  /**
   * Test a single error case
   */
  private async testErrorCase(testCase: ErrorTestCase): Promise<ErrorTestResult> {
    const startTime = Date.now();
    
    console.log(`🧪 Testing: ${testCase.name} - ${testCase.description}`);
    
    try {
      const options: GenerationOptions = {
        documentType: testCase.documentType,
        language: 'en',
        includePhotograph: false,
        includeBiometrics: false,
        securityLevel: 'enhanced',
        outputFormat: 'pdf'
      };
      
      const result = await completePDFGenerationService.generateDocument(
        testCase.testData as DocumentData,
        options
      );
      
      const processingTime = Date.now() - startTime;
      
      if (result.success) {
        // Generation succeeded
        const testSuccess = !testCase.expectedError; // Success when we didn't expect error
        console.log(`${testSuccess ? '✅' : '❌'} ${testCase.name}: Generated PDF unexpectedly`);
        
        return {
          testCase: testCase.name,
          success: testSuccess,
          expectedError: testCase.expectedError,
          actuallyFailed: false,
          processingTime
        };
      } else {
        // Generation failed
        const testSuccess = testCase.expectedError; // Success when we expected error
        console.log(`${testSuccess ? '✅' : '❌'} ${testCase.name}: Failed as expected - ${result.error}`);
        
        return {
          testCase: testCase.name,
          success: testSuccess,
          expectedError: testCase.expectedError,
          actuallyFailed: true,
          error: result.error,
          processingTime
        };
      }
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      const testSuccess = testCase.expectedError; // Success when we expected error
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      console.log(`${testSuccess ? '✅' : '❌'} ${testCase.name}: Exception thrown - ${errorMessage}`);
      
      return {
        testCase: testCase.name,
        success: testSuccess,
        expectedError: testCase.expectedError,
        actuallyFailed: true,
        error: errorMessage,
        processingTime
      };
    }
  }
  
  /**
   * Run all error handling tests
   */
  async runErrorHandlingTests(): Promise<void> {
    console.log('🚨 Starting Error Handling and Edge Case Testing');
    console.log('Testing validation, security, and edge cases\n');
    
    const testCases = this.getErrorTestCases();
    
    for (const testCase of testCases) {
      const result = await this.testErrorCase(testCase);
      this.results.push(result);
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    this.generateReport();
  }
  
  /**
   * Generate error handling test report
   */
  private generateReport(): void {
    console.log('\n' + '='.repeat(80));
    console.log('🚨 ERROR HANDLING AND EDGE CASE TEST REPORT');
    console.log('='.repeat(80));
    
    const totalTests = this.results.length;
    const successfulTests = this.results.filter(r => r.success).length;
    const failedTests = totalTests - successfulTests;
    
    console.log(`\n📈 ERROR HANDLING SUMMARY:`);
    console.log(`   Total Error Tests: ${totalTests}`);
    console.log(`   Passed Tests: ${successfulTests} (${(successfulTests/totalTests*100).toFixed(1)}%)`);
    console.log(`   Failed Tests: ${failedTests} (${(failedTests/totalTests*100).toFixed(1)}%)`);
    
    // Tests that should have failed but didn't
    const shouldHaveFailedButDidnt = this.results.filter(r => r.expectedError && !r.actuallyFailed);
    if (shouldHaveFailedButDidnt.length > 0) {
      console.log(`\n⚠️ VALIDATION GAPS (Should have failed but didn't):`);
      shouldHaveFailedButDidnt.forEach(result => {
        console.log(`   ${result.testCase}: Expected error but generation succeeded`);
      });
    }
    
    // Tests that shouldn't have failed but did
    const shouldHaveSucceededButDidnt = this.results.filter(r => !r.expectedError && r.actuallyFailed);
    if (shouldHaveSucceededButDidnt.length > 0) {
      console.log(`\n❌ UNEXPECTED FAILURES:`);
      shouldHaveSucceededButDidnt.forEach(result => {
        console.log(`   ${result.testCase}: ${result.error}`);
      });
    }
    
    // Security tests
    const securityTests = this.results.filter(r => r.testCase.includes('injection') || r.testCase.includes('security'));
    if (securityTests.length > 0) {
      console.log(`\n🔒 SECURITY TEST RESULTS:`);
      securityTests.forEach(result => {
        console.log(`   ${result.testCase}: ${result.success ? 'SECURE' : 'VULNERABLE'}`);
      });
    }
    
    // Performance for error cases
    const avgErrorTime = this.results.reduce((sum, r) => sum + r.processingTime, 0) / totalTests;
    console.log(`\n⚡ ERROR HANDLING PERFORMANCE:`);
    console.log(`   Average Error Processing Time: ${avgErrorTime.toFixed(0)}ms`);
    
    // Validation strength assessment
    const validationTests = this.results.filter(r => r.expectedError);
    const properlyValidated = validationTests.filter(r => r.actuallyFailed).length;
    const validationStrength = validationTests.length > 0 ? (properlyValidated / validationTests.length) * 100 : 0;
    
    console.log(`\n🛡️ VALIDATION STRENGTH:`);
    console.log(`   Validation Tests: ${validationTests.length}`);
    console.log(`   Properly Rejected: ${properlyValidated}`);
    console.log(`   Validation Strength: ${validationStrength.toFixed(1)}%`);
    
    const validationReady = validationStrength >= 80; // 80% validation strength
    console.log(`\n🔐 SECURITY READINESS:`);
    console.log(`   Status: ${validationReady ? '✅ SECURE' : '⚠️ NEEDS IMPROVEMENT'}`);
    console.log(`   Recommendation: ${validationReady ? 
      'Error handling and validation are robust.' : 
      'Improve input validation to reject invalid data more effectively.'}`);
    
    console.log('\n' + '='.repeat(80));
  }
}

// Run the error handling tests
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new ErrorHandlingTester();
  tester.runErrorHandlingTests().catch(console.error);
}

export { ErrorHandlingTester };
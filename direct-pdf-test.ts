#!/usr/bin/env tsx
/**
 * DIRECT PDF GENERATION TESTING
 * 
 * This tests the PDF generation service directly without a server
 * to verify core functionality works properly.
 */

import { completePDFGenerationService, DHADocumentType, type DocumentData, type GenerationOptions } from './server/services/complete-pdf-generation-service';
import fs from 'fs/promises';
import path from 'path';

// Output directory
const OUTPUT_DIR = './test-pdf-outputs';

// Realistic South African test data
const REALISTIC_SA_DATA = {
  validIdNumbers: [
    '9001015009087', // Born 1990-01-01, Male, Citizen
    '8506152584082', // Born 1985-06-15, Female, Citizen  
    '7509301234088', // Born 1975-09-30, Male, Citizen
  ],
  
  places: [
    'Cape Town, Western Cape',
    'Johannesburg, Gauteng', 
    'Durban, KwaZulu-Natal',
    'Pretoria, Gauteng'
  ],
  
  names: {
    first: ['Thabo', 'Nomsa', 'Sipho', 'Zanele', 'Mandla', 'Thandiwe'],
    last: ['Mthembu', 'Nkomo', 'Van der Merwe', 'Patel', 'Dlamini', 'Mokgale']
  },
  
  addresses: [
    '123 Long Street, Cape Town, 8001',
    '456 Commissioner Street, Johannesburg, 2001', 
    '789 Marine Parade, Durban, 4001'
  ],
  
  employers: [
    'Anglo American Platinum',
    'Sasol Limited',
    'MTN Group',
    'Standard Bank'
  ],
  
  institutions: [
    'University of the Witwatersrand',
    'University of Cape Town', 
    'Stellenbosch University'
  ]
};

interface DirectTestResult {
  documentType: string;
  success: boolean;
  processingTime: number;
  pdfGenerated: boolean;
  pdfSize?: number;
  error?: string;
  fileName?: string;
}

class DirectPDFTester {
  private results: DirectTestResult[] = [];
  
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
  private generateTestData(documentType: DHADocumentType): DocumentData {
    const randomIndex = (arr: any[]) => Math.floor(Math.random() * arr.length);
    
    const baseData: DocumentData = {
      fullName: `${REALISTIC_SA_DATA.names.first[randomIndex(REALISTIC_SA_DATA.names.first)]} ${REALISTIC_SA_DATA.names.last[randomIndex(REALISTIC_SA_DATA.names.last)]}`,
      dateOfBirth: '1990-05-15',
      gender: Math.random() > 0.5 ? 'M' : 'F',
      nationality: 'South African',
      issuanceDate: new Date().toISOString().split('T')[0],
      issuingOffice: 'DHA Digital Services - Direct Test'
    };
    
    // Add document-specific data
    switch (documentType) {
      case DHADocumentType.BIRTH_CERTIFICATE:
        return {
          ...baseData,
          placeOfBirth: REALISTIC_SA_DATA.places[randomIndex(REALISTIC_SA_DATA.places)],
          fatherName: `${REALISTIC_SA_DATA.names.first[randomIndex(REALISTIC_SA_DATA.names.first)]} ${REALISTIC_SA_DATA.names.last[randomIndex(REALISTIC_SA_DATA.names.last)]}`,
          motherName: `${REALISTIC_SA_DATA.names.first[randomIndex(REALISTIC_SA_DATA.names.first)]} ${REALISTIC_SA_DATA.names.last[randomIndex(REALISTIC_SA_DATA.names.last)]}`
        };
        
      case DHADocumentType.WORK_PERMIT:
        return {
          ...baseData,
          employer: REALISTIC_SA_DATA.employers[randomIndex(REALISTIC_SA_DATA.employers)],
          position: 'Software Engineer',
          expiryDate: '2025-12-31'
        };
        
      case DHADocumentType.STUDY_PERMIT:
        return {
          ...baseData,
          institution: REALISTIC_SA_DATA.institutions[randomIndex(REALISTIC_SA_DATA.institutions)],
          course: 'Computer Science',
          expiryDate: '2025-12-31'
        };
        
      case DHADocumentType.ORDINARY_PASSPORT:
      case DHADocumentType.DIPLOMATIC_PASSPORT:
      case DHADocumentType.OFFICIAL_PASSPORT:
        return {
          ...baseData,
          passportNumber: `P${Math.random().toString().substr(2, 8)}`,
          expiryDate: '2034-05-15'
        };
        
      case DHADocumentType.MEDICAL_CERTIFICATE:
        return {
          ...baseData,
          doctorName: `Dr. ${REALISTIC_SA_DATA.names.first[randomIndex(REALISTIC_SA_DATA.names.first)]} ${REALISTIC_SA_DATA.names.last[randomIndex(REALISTIC_SA_DATA.names.last)]}`,
          medicalCondition: 'Fit for Purpose'
        };
        
      default:
        return {
          ...baseData,
          idNumber: REALISTIC_SA_DATA.validIdNumbers[randomIndex(REALISTIC_SA_DATA.validIdNumbers)]
        };
    }
  }
  
  /**
   * Test a single document type
   */
  private async testDocumentType(documentType: DHADocumentType): Promise<DirectTestResult> {
    const startTime = Date.now();
    
    console.log(`📄 Testing ${documentType}...`);
    
    try {
      const testData = this.generateTestData(documentType);
      
      const options: GenerationOptions = {
        documentType,
        language: 'en',
        includePhotograph: false,
        includeBiometrics: false,
        securityLevel: 'enhanced',
        outputFormat: 'pdf'
      };
      
      const result = await completePDFGenerationService.generateDocument(testData, options);
      const processingTime = Date.now() - startTime;
      
      if (result.success && result.pdfBuffer) {
        // Save PDF file
        const fileName = `${documentType}_${Date.now()}.pdf`;
        const filePath = path.join(OUTPUT_DIR, fileName);
        await fs.writeFile(filePath, result.pdfBuffer);
        
        console.log(`✅ ${documentType}: Generated PDF (${result.pdfBuffer.length} bytes) in ${processingTime}ms`);
        
        return {
          documentType,
          success: true,
          processingTime,
          pdfGenerated: true,
          pdfSize: result.pdfBuffer.length,
          fileName
        };
      } else {
        console.error(`❌ ${documentType}: ${result.error}`);
        
        return {
          documentType,
          success: false,
          processingTime,
          pdfGenerated: false,
          error: result.error
        };
      }
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(`❌ ${documentType} failed:`, error);
      
      return {
        documentType,
        success: false,
        processingTime,
        pdfGenerated: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Test all document types
   */
  async testAllDocumentTypes(): Promise<void> {
    console.log('🚀 Starting Direct PDF Generation Testing');
    console.log('Testing all DHA document types directly via service\n');
    
    // Test each document type
    for (const documentType of Object.values(DHADocumentType)) {
      const result = await this.testDocumentType(documentType);
      this.results.push(result);
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Generate report
    this.generateReport();
  }
  
  /**
   * Generate comprehensive test report
   */
  private generateReport(): void {
    console.log('\n' + '='.repeat(80));
    console.log('📊 DIRECT PDF GENERATION TEST REPORT');
    console.log('='.repeat(80));
    
    const totalTests = this.results.length;
    const successfulTests = this.results.filter(r => r.success).length;
    const failedTests = totalTests - successfulTests;
    const avgResponseTime = this.results.reduce((sum, r) => sum + r.processingTime, 0) / totalTests;
    
    console.log(`\n📈 SUMMARY STATISTICS:`);
    console.log(`   Total Document Types Tested: ${totalTests}`);
    console.log(`   Successful: ${successfulTests} (${(successfulTests/totalTests*100).toFixed(1)}%)`);
    console.log(`   Failed: ${failedTests} (${(failedTests/totalTests*100).toFixed(1)}%)`);
    console.log(`   Average Processing Time: ${avgResponseTime.toFixed(0)}ms`);
    
    // Successful document types
    const successfulDocs = this.results.filter(r => r.success);
    if (successfulDocs.length > 0) {
      console.log(`\n✅ SUCCESSFUL DOCUMENT TYPES:`);
      successfulDocs.forEach(result => {
        console.log(`   ${result.documentType}: ${result.pdfSize} bytes, ${result.processingTime}ms`);
      });
    }
    
    // Failed document types
    const failedDocs = this.results.filter(r => !r.success);
    if (failedDocs.length > 0) {
      console.log(`\n❌ FAILED DOCUMENT TYPES:`);
      failedDocs.forEach(result => {
        console.log(`   ${result.documentType}: ${result.error}`);
      });
    }
    
    // Performance metrics
    const responseTimes = this.results.map(r => r.processingTime);
    const minTime = Math.min(...responseTimes);
    const maxTime = Math.max(...responseTimes);
    const medianTime = responseTimes.sort((a, b) => a - b)[Math.floor(responseTimes.length / 2)];
    
    console.log(`\n⚡ PERFORMANCE METRICS:`);
    console.log(`   Fastest Generation: ${minTime}ms`);
    console.log(`   Slowest Generation: ${maxTime}ms`);
    console.log(`   Median Generation: ${medianTime}ms`);
    console.log(`   Average Generation: ${avgResponseTime.toFixed(0)}ms`);
    
    // PDF file information
    const pdfFiles = this.results.filter(r => r.pdfGenerated);
    if (pdfFiles.length > 0) {
      const totalSize = pdfFiles.reduce((sum, r) => sum + (r.pdfSize || 0), 0);
      const avgSize = totalSize / pdfFiles.length;
      
      console.log(`\n📄 PDF GENERATION STATS:`);
      console.log(`   Total PDFs Generated: ${pdfFiles.length}`);
      console.log(`   Total Size: ${(totalSize / 1024).toFixed(1)} KB`);
      console.log(`   Average Size: ${(avgSize / 1024).toFixed(1)} KB`);
      console.log(`   Largest PDF: ${Math.max(...pdfFiles.map(r => r.pdfSize || 0))} bytes`);
      console.log(`   Smallest PDF: ${Math.min(...pdfFiles.map(r => r.pdfSize || 0))} bytes`);
    }
    
    // Railway deployment readiness
    const deploymentReady = successfulTests >= totalTests * 0.9; // 90% success rate
    console.log(`\n🚀 RAILWAY DEPLOYMENT READINESS:`);
    console.log(`   Status: ${deploymentReady ? '✅ READY' : '❌ NOT READY'}`);
    console.log(`   PDF Generation Success Rate: ${(successfulTests/totalTests*100).toFixed(1)}%`);
    console.log(`   Total Document Types Supported: ${Object.keys(DHADocumentType).length}`);
    console.log(`   Recommendation: ${deploymentReady ? 
      'PDF generation system is operational and ready for production deployment.' : 
      'PDF generation issues detected. Address failed document types before deployment.'}`);
    
    console.log('\n' + '='.repeat(80));
    
    // Save results to file
    const reportData = {
      summary: {
        totalTests,
        successfulTests,
        failedTests,
        successRate: successfulTests/totalTests*100,
        avgResponseTime
      },
      results: this.results,
      deploymentReady
    };
    
    const reportPath = path.join(OUTPUT_DIR, 'direct-test-report.json');
    fs.writeFile(reportPath, JSON.stringify(reportData, null, 2))
      .then(() => console.log(`\n💾 Detailed test results saved to: ${reportPath}`))
      .catch(console.error);
  }
}

// Run the direct test
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new DirectPDFTester();
  tester.testAllDocumentTypes().catch(console.error);
}

export { DirectPDFTester };
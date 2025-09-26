#!/usr/bin/env tsx

/**
 * 🔧 VALIDATION TEST UTILITIES
 * 
 * Shared utilities and helper functions for all validation modules
 * Provides common functionality for test execution, reporting, and data management
 */

import { performance } from 'perf_hooks';
import { writeFileSync, readFileSync, existsSync } from 'fs';

// ===================== SHARED INTERFACES =====================

export interface TestExecutionConfig {
  retries: number;
  timeout: number;
  parallelExecution: boolean;
  skipOnFailure: boolean;
  generateScreenshots: boolean;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
}

export interface ValidationEnvironment {
  baseUrl: string;
  environment: 'development' | 'staging' | 'production';
  authTokens: {
    admin?: string;
    user?: string;
    queen?: string;
  };
  testData: {
    users: any[];
    documents: any[];
    biometricData: any[];
  };
}

export interface TestDataGenerator {
  generateTestUser(role?: string): any;
  generateTestDocument(type: string): any;
  generateBiometricData(): any;
  generateTestScenario(category: string): any;
}

// ===================== TEST EXECUTION UTILITIES =====================

export class ValidationTestUtilities {
  private config: TestExecutionConfig;
  private environment: ValidationEnvironment;

  constructor(config: TestExecutionConfig, environment: ValidationEnvironment) {
    this.config = config;
    this.environment = environment;
  }

  /**
   * 🔄 RETRY MECHANISM FOR FLAKY TESTS
   */
  async executeWithRetry<T>(
    testFn: () => Promise<T>,
    testName: string,
    maxRetries: number = this.config.retries
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        const startTime = performance.now();
        const result = await Promise.race([
          testFn(),
          this.createTimeoutPromise(this.config.timeout)
        ]);
        
        const duration = performance.now() - startTime;
        
        if (attempt > 1) {
          this.log('info', `✅ ${testName} succeeded on attempt ${attempt} (${duration.toFixed(2)}ms)`);
        }
        
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt <= maxRetries) {
          this.log('warn', `⚠️ ${testName} failed on attempt ${attempt}, retrying... (${lastError.message})`);
          await this.sleep(1000 * attempt); // Exponential backoff
        }
      }
    }
    
    this.log('error', `❌ ${testName} failed after ${maxRetries + 1} attempts`);
    throw lastError!;
  }

  /**
   * ⏱️ CREATE TIMEOUT PROMISE
   */
  private createTimeoutPromise<T>(timeoutMs: number): Promise<T> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Test timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });
  }

  /**
   * 💤 SLEEP UTILITY
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 📊 PARALLEL TEST EXECUTION
   */
  async executeTestsInParallel<T>(
    tests: Array<{ name: string; testFn: () => Promise<T> }>,
    concurrency: number = 5
  ): Promise<Array<{ name: string; result?: T; error?: string }>> {
    const results: Array<{ name: string; result?: T; error?: string }> = [];
    
    for (let i = 0; i < tests.length; i += concurrency) {
      const batch = tests.slice(i, i + concurrency);
      
      const batchPromises = batch.map(async (test) => {
        try {
          const result = await this.executeWithRetry(test.testFn, test.name);
          return { name: test.name, result };
        } catch (error) {
          return { 
            name: test.name, 
            error: error instanceof Error ? error.message : String(error) 
          };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      this.log('info', `Completed batch ${Math.floor(i / concurrency) + 1}/${Math.ceil(tests.length / concurrency)}`);
    }
    
    return results;
  }

  /**
   * 📝 LOGGING UTILITY
   */
  private log(level: 'error' | 'warn' | 'info' | 'debug', message: string): void {
    const levels = { error: 0, warn: 1, info: 2, debug: 3 };
    const configLevel = levels[this.config.logLevel];
    const messageLevel = levels[level];
    
    if (messageLevel <= configLevel) {
      const timestamp = new Date().toISOString();
      const prefix = {
        error: '❌',
        warn: '⚠️',
        info: 'ℹ️',
        debug: '🔍'
      }[level];
      
      console.log(`${timestamp} ${prefix} ${message}`);
    }
  }

  /**
   * 🔍 TEST DATA VALIDATION
   */
  validateTestData(data: any, schema: any): boolean {
    try {
      // Simple validation - in production, use a proper schema validator like Joi or Zod
      const requiredFields = schema.required || [];
      
      for (const field of requiredFields) {
        if (!data.hasOwnProperty(field) || data[field] === null || data[field] === undefined) {
          throw new Error(`Missing required field: ${field}`);
        }
      }
      
      return true;
    } catch (error) {
      this.log('error', `Test data validation failed: ${String(error)}`);
      return false;
    }
  }

  /**
   * 📸 SCREENSHOT CAPTURE (for visual validation)
   */
  async captureScreenshot(testName: string, elementSelector?: string): Promise<string> {
    if (!this.config.generateScreenshots) {
      return '';
    }
    
    try {
      // In a real implementation, this would capture actual screenshots
      // For now, we'll simulate it
      const timestamp = Date.now();
      const filename = `screenshot-${testName}-${timestamp}.png`;
      
      this.log('debug', `Screenshot captured: ${filename}`);
      return filename;
    } catch (error) {
      this.log('warn', `Failed to capture screenshot: ${String(error)}`);
      return '';
    }
  }

  /**
   * 📊 PERFORMANCE METRICS COLLECTION
   */
  createPerformanceTracker(testName: string) {
    const startTime = performance.now();
    const startMemory = process.memoryUsage();
    
    return {
      finish: () => {
        const endTime = performance.now();
        const endMemory = process.memoryUsage();
        
        return {
          testName,
          duration: endTime - startTime,
          memoryDelta: {
            heapUsed: endMemory.heapUsed - startMemory.heapUsed,
            heapTotal: endMemory.heapTotal - startMemory.heapTotal,
            external: endMemory.external - startMemory.external
          },
          timestamp: new Date().toISOString()
        };
      }
    };
  }
}

// ===================== TEST DATA GENERATORS =====================

export class DHATestDataGenerator implements TestDataGenerator {
  
  /**
   * 👤 GENERATE TEST USER
   */
  generateTestUser(role: string = 'user'): any {
    const timestamp = Date.now();
    const randomId = Math.floor(Math.random() * 10000);
    
    return {
      username: `test_user_${timestamp}_${randomId}`,
      email: `test${timestamp}${randomId}@dha.gov.za`,
      password: 'TestPassword123!',
      firstName: 'Test',
      lastName: `User${randomId}`,
      role,
      idNumber: this.generateSouthAfricanID(),
      phoneNumber: '+27' + Math.floor(Math.random() * 1000000000).toString().padStart(9, '0'),
      address: {
        street: `${randomId} Test Street`,
        city: 'Cape Town',
        province: 'Western Cape',
        postalCode: '8001',
        country: 'South Africa'
      },
      dateOfBirth: this.generateRandomDate(new Date('1950-01-01'), new Date('2005-12-31')),
      nationality: 'South African',
      gender: Math.random() > 0.5 ? 'M' : 'F'
    };
  }

  /**
   * 📄 GENERATE TEST DOCUMENT
   */
  generateTestDocument(type: string): any {
    const user = this.generateTestUser();
    const timestamp = Date.now();
    
    const baseDocument = {
      documentType: type,
      applicantData: user,
      applicationDate: new Date().toISOString(),
      applicationId: `APP${timestamp}`,
      status: 'pending'
    };

    // Add document-specific fields
    switch (type) {
      case 'south_african_passport':
        return {
          ...baseDocument,
          passportType: 'ordinary',
          previousPassportNumber: '',
          travelDocumentType: 'passport',
          validityYears: 10
        };
        
      case 'smart_id_card':
        return {
          ...baseDocument,
          cardType: 'smart_id',
          chipEnabled: true,
          biometricEnabled: true
        };
        
      case 'birth_certificate':
        return {
          ...baseDocument,
          childFirstName: 'Test',
          childLastName: 'Baby',
          dateOfBirth: new Date().toISOString(),
          placeOfBirth: 'Cape Town',
          motherData: this.generateTestUser('mother'),
          fatherData: this.generateTestUser('father')
        };
        
      case 'marriage_certificate':
        return {
          ...baseDocument,
          spouse1Data: this.generateTestUser('spouse'),
          spouse2Data: this.generateTestUser('spouse'),
          marriageDate: this.generateRandomDate(new Date('2020-01-01'), new Date()),
          marriagePlace: 'Cape Town',
          marriageOfficer: 'Test Marriage Officer'
        };
        
      default:
        return baseDocument;
    }
  }

  /**
   * 👁️ GENERATE BIOMETRIC DATA
   */
  generateBiometricData(): any {
    return {
      fingerprintTemplate: this.generateRandomHex(256),
      faceTemplate: this.generateRandomHex(512),
      signatureTemplate: this.generateRandomHex(128),
      voicePrint: this.generateRandomHex(256),
      retinalScan: this.generateRandomHex(384),
      dnaSequence: this.generateRandomHex(1024),
      behavioralBiometrics: {
        keystrokeDynamics: this.generateRandomArray(10),
        mouseMovements: this.generateRandomArray(20),
        walkingGait: this.generateRandomArray(15)
      },
      qualityScores: {
        fingerprint: Math.floor(Math.random() * 40) + 60, // 60-100
        face: Math.floor(Math.random() * 40) + 60,
        signature: Math.floor(Math.random() * 40) + 60,
        voice: Math.floor(Math.random() * 40) + 60
      },
      livelinessScore: Math.floor(Math.random() * 20) + 80, // 80-100
      antispoofingScore: Math.floor(Math.random() * 30) + 70 // 70-100
    };
  }

  /**
   * 🎬 GENERATE TEST SCENARIO
   */
  generateTestScenario(category: string): any {
    const scenarios = {
      authentication: [
        'normal_login',
        'failed_password',
        'locked_account',
        'mfa_required',
        'biometric_auth',
        'social_engineering_attempt'
      ],
      document_generation: [
        'standard_application',
        'expedited_processing',
        'document_replacement',
        'name_change',
        'address_update',
        'emergency_travel'
      ],
      security: [
        'brute_force_attack',
        'sql_injection_attempt',
        'xss_attack',
        'ddos_simulation',
        'privilege_escalation',
        'data_exfiltration_attempt'
      ],
      performance: [
        'high_load_simulation',
        'memory_stress_test',
        'database_load_test',
        'concurrent_user_test',
        'api_rate_limiting',
        'resource_exhaustion'
      ]
    };

    const categoryScenarios = scenarios[category as keyof typeof scenarios] || ['default_scenario'];
    const selectedScenario = categoryScenarios[Math.floor(Math.random() * categoryScenarios.length)];

    return {
      category,
      scenario: selectedScenario,
      parameters: this.generateScenarioParameters(selectedScenario),
      expectedOutcome: this.generateExpectedOutcome(selectedScenario),
      severity: this.generateSeverityLevel(selectedScenario)
    };
  }

  // ===================== PRIVATE HELPER METHODS =====================

  private generateSouthAfricanID(): string {
    // Generate a valid South African ID number format: YYMMDDGGGGSAAC
    const year = Math.floor(Math.random() * 50) + 50; // 50-99 (1950-1999)
    const month = Math.floor(Math.random() * 12) + 1;
    const day = Math.floor(Math.random() * 28) + 1;
    const gender = Math.floor(Math.random() * 5000) + 5000; // 5000-9999 for male, 0000-4999 for female
    const citizenship = 0; // 0 for SA citizen
    const race = 8; // Not used anymore but part of format
    
    const idPrefix = `${year.toString().padStart(2, '0')}${month.toString().padStart(2, '0')}${day.toString().padStart(2, '0')}${gender.toString().padStart(4, '0')}${citizenship}${race}`;
    
    // Calculate check digit (simplified Luhn algorithm)
    const checkDigit = this.calculateLuhnCheckDigit(idPrefix);
    
    return idPrefix + checkDigit;
  }

  private calculateLuhnCheckDigit(digits: string): string {
    // Simplified Luhn algorithm for demo purposes
    let sum = 0;
    for (let i = 0; i < digits.length; i++) {
      let digit = parseInt(digits[i]);
      if (i % 2 === 1) {
        digit *= 2;
        if (digit > 9) {
          digit = digit - 9;
        }
      }
      sum += digit;
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    return checkDigit.toString();
  }

  private generateRandomDate(start: Date, end: Date): string {
    const randomTime = start.getTime() + Math.random() * (end.getTime() - start.getTime());
    return new Date(randomTime).toISOString().split('T')[0];
  }

  private generateRandomHex(length: number): string {
    const chars = '0123456789ABCDEF';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
  }

  private generateRandomArray(length: number): number[] {
    return Array.from({ length }, () => Math.random() * 100);
  }

  private generateScenarioParameters(scenario: string): any {
    // Generate parameters based on scenario type
    const baseParams = {
      timestamp: new Date().toISOString(),
      testId: `test_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      environment: 'test'
    };

    switch (scenario) {
      case 'high_load_simulation':
        return {
          ...baseParams,
          concurrentUsers: Math.floor(Math.random() * 1000) + 100,
          requestsPerSecond: Math.floor(Math.random() * 500) + 50,
          duration: Math.floor(Math.random() * 300) + 60 // 60-360 seconds
        };
        
      case 'brute_force_attack':
        return {
          ...baseParams,
          attackVector: 'password_guessing',
          attemptRate: Math.floor(Math.random() * 100) + 10,
          targetUser: 'admin'
        };
        
      default:
        return baseParams;
    }
  }

  private generateExpectedOutcome(scenario: string): string {
    const outcomes = {
      'normal_login': 'successful_authentication',
      'failed_password': 'authentication_failed',
      'brute_force_attack': 'attack_blocked',
      'high_load_simulation': 'performance_maintained',
      'standard_application': 'document_generated'
    };

    return outcomes[scenario as keyof typeof outcomes] || 'test_completed';
  }

  private generateSeverityLevel(scenario: string): 'low' | 'medium' | 'high' | 'critical' {
    const severities = {
      'normal_login': 'low',
      'failed_password': 'low',
      'brute_force_attack': 'high',
      'sql_injection_attempt': 'critical',
      'ddos_simulation': 'high',
      'high_load_simulation': 'medium'
    };

    return severities[scenario as keyof typeof severities] as any || 'medium';
  }
}

// ===================== VALIDATION REPORT UTILITIES =====================

export class ValidationReportManager {
  
  /**
   * 📊 GENERATE CONSOLIDATED METRICS
   */
  static consolidateMetrics(reports: any[]): any {
    const consolidated = {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      criticalFailures: 0,
      averageExecutionTime: 0,
      moduleBreakdown: {} as any
    };

    reports.forEach(report => {
      if (report && report.summary) {
        consolidated.totalTests += report.summary.totalTests || 0;
        consolidated.passedTests += report.summary.passedTests || 0;
        consolidated.failedTests += report.summary.failedTests || 0;
        consolidated.criticalFailures += report.summary.criticalFailures || 0;
        
        // Store module-specific data
        consolidated.moduleBreakdown[report.moduleName] = report.summary;
      }
    });

    consolidated.averageExecutionTime = reports.length > 0 
      ? reports.reduce((sum, r) => sum + (r.summary?.averageDuration || 0), 0) / reports.length 
      : 0;

    return consolidated;
  }

  /**
   * 📈 GENERATE TREND ANALYSIS
   */
  static generateTrendAnalysis(historicalReports: any[]): any {
    if (historicalReports.length < 2) {
      return { trend: 'insufficient_data' };
    }

    const latest = historicalReports[historicalReports.length - 1];
    const previous = historicalReports[historicalReports.length - 2];

    const successRateTrend = latest.successRate - previous.successRate;
    const executionTimeTrend = latest.averageExecutionTime - previous.averageExecutionTime;

    return {
      trend: successRateTrend >= 0 ? 'improving' : 'declining',
      successRateChange: successRateTrend,
      executionTimeChange: executionTimeTrend,
      recommendations: ValidationReportManager.generateTrendRecommendations(successRateTrend, executionTimeTrend)
    };
  }

  private static generateTrendRecommendations(successRateChange: number, executionTimeChange: number): string[] {
    const recommendations: string[] = [];

    if (successRateChange < -5) {
      recommendations.push('Critical: Success rate declining significantly - investigate failing tests immediately');
    } else if (successRateChange < 0) {
      recommendations.push('Warning: Success rate declining - monitor test stability');
    } else if (successRateChange > 5) {
      recommendations.push('Good: Success rate improving - maintain current practices');
    }

    if (executionTimeChange > 30000) { // 30 seconds
      recommendations.push('Performance: Execution time increasing - optimize test efficiency');
    } else if (executionTimeChange < -10000) { // 10 seconds improvement
      recommendations.push('Performance: Execution time improving - excellent optimization');
    }

    return recommendations;
  }

  /**
   * 🔍 GENERATE COMPLIANCE CHECKLIST
   */
  static generateComplianceChecklist(validationResults: any): any {
    return {
      popia: {
        dataGovernance: validationResults.securityCompliance?.popiaCompliance?.dataGovernance || false,
        privacyProtection: validationResults.securityCompliance?.popiaCompliance?.privacyProtection || false,
        auditCompliance: validationResults.securityCompliance?.popiaCompliance?.auditCompliance || false,
        overallCompliant: validationResults.securityCompliance?.popiaCompliance?.overallCompliant || false
      },
      militaryGrade: {
        encryption: validationResults.securityCompliance?.summary?.militaryGradeSecurityCompliance || false,
        accessControl: validationResults.queenRaesaAccess?.summary?.accessSuccessRate >= 95 || false,
        auditTrail: validationResults.securityCompliance?.summary?.auditTrailCompleteness >= 95 || false,
        threatDetection: validationResults.securityCompliance?.summary?.threatDetectionActive || false
      },
      government: {
        documentAuthenticity: validationResults.documentWorkflows?.summary?.successRate >= 95 || false,
        apiIntegration: validationResults.securityCompliance?.summary?.governmentStandardsCompliance || false,
        crossBorderCompliance: validationResults.queenRaesaAccess?.categoryAnalysis?.documentAuth || false,
        internationalStandards: validationResults.securityCompliance?.summary?.internationalStandardsCompliance || false
      }
    };
  }
}

export default ValidationTestUtilities;
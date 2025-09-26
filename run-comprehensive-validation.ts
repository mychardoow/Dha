#!/usr/bin/env tsx

/**
 * 🚀 COMPREHENSIVE VALIDATION TEST RUNNER
 * 
 * Main execution script for the DHA Digital Services Platform
 * comprehensive live validation testing suite.
 * 
 * Orchestrates all validation modules and generates final reports.
 */

import { ComprehensiveDHALiveValidator } from './comprehensive-dha-live-validation';
import DocumentWorkflowValidator from './document-workflow-validator';
import UltraAIIntegrationValidator from './ultra-ai-integration-validator';
import SecurityComplianceValidator from './security-compliance-validator';
import PerformanceReliabilityValidator from './performance-reliability-validator';
import QueenRaesaAccessValidator from './queen-raeesa-access-validator';
import { writeFileSync } from 'fs';
import { performance } from 'perf_hooks';

interface ComprehensiveValidationReport {
  reportId: string;
  timestamp: string;
  executionTime: number;
  overallStatus: 'PASS' | 'FAIL' | 'CRITICAL_FAIL';
  zeroDefectAchieved: boolean;
  maxReliabilityAchieved: boolean;
  
  validationModules: {
    documentWorkflows: any;
    ultraAIIntegration: any;
    securityCompliance: any;
    performanceReliability: any;
    queenRaesaAccess: any;
  };
  
  overallMetrics: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    criticalFailures: number;
    successRate: number;
    averageExecutionTime: number;
  };
  
  systemReadiness: {
    productionReady: boolean;
    railwayDeploymentReady: boolean;
    governmentCompliant: boolean;
    securityCertified: boolean;
  };
  
  recommendations: string[];
  criticalIssues: string[];
  nextSteps: string[];
}

class ComprehensiveValidationRunner {
  private baseUrl: string;
  private authToken: string = '';
  private startTime: number = 0;

  constructor(baseUrl: string = 'http://localhost:5000') {
    this.baseUrl = baseUrl;
  }

  /**
   * 🚀 MAIN VALIDATION EXECUTION
   */
  async runComprehensiveValidation(): Promise<ComprehensiveValidationReport> {
    this.startTime = performance.now();
    
    console.log('🏛️ DHA DIGITAL SERVICES PLATFORM');
    console.log('🚀 COMPREHENSIVE LIVE VALIDATION SUITE');
    console.log('=' .repeat(80));
    console.log('Starting comprehensive validation of all systems...\n');

    // Initialize report structure
    const report: ComprehensiveValidationReport = {
      reportId: `dha-validation-${Date.now()}`,
      timestamp: new Date().toISOString(),
      executionTime: 0,
      overallStatus: 'PASS',
      zeroDefectAchieved: false,
      maxReliabilityAchieved: false,
      validationModules: {
        documentWorkflows: null,
        ultraAIIntegration: null,
        securityCompliance: null,
        performanceReliability: null,
        queenRaesaAccess: null
      },
      overallMetrics: {
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        criticalFailures: 0,
        successRate: 0,
        averageExecutionTime: 0
      },
      systemReadiness: {
        productionReady: false,
        railwayDeploymentReady: false,
        governmentCompliant: false,
        securityCertified: false
      },
      recommendations: [],
      criticalIssues: [],
      nextSteps: []
    };

    try {
      // Phase 1: System Health Check and Authentication
      console.log('🔍 Phase 1: System Health Check and Authentication');
      await this.performSystemHealthCheck();
      await this.acquireAuthenticationToken();
      console.log('✅ System health check and authentication complete\n');

      // Phase 2: Document Workflow Validation
      console.log('📋 Phase 2: Document Workflow Validation (21 DHA Documents)');
      report.validationModules.documentWorkflows = await this.runDocumentWorkflowValidation();
      console.log('✅ Document workflow validation complete\n');

      // Phase 3: Ultra AI Integration Testing
      console.log('🤖 Phase 3: Ultra AI Integration Testing (5 AI Systems)');
      report.validationModules.ultraAIIntegration = await this.runUltraAIIntegrationValidation();
      console.log('✅ Ultra AI integration testing complete\n');

      // Phase 4: Security and Compliance Validation
      console.log('🛡️ Phase 4: Security and Compliance Validation');
      report.validationModules.securityCompliance = await this.runSecurityComplianceValidation();
      console.log('✅ Security and compliance validation complete\n');

      // Phase 5: Performance and Reliability Testing
      console.log('⚡ Phase 5: Performance and Reliability Testing');
      report.validationModules.performanceReliability = await this.runPerformanceReliabilityValidation();
      console.log('✅ Performance and reliability testing complete\n');

      // Phase 6: Queen Raeesa Access Validation
      console.log('👑 Phase 6: Queen Raeesa Access Validation');
      report.validationModules.queenRaesaAccess = await this.runQueenRaesaAccessValidation();
      console.log('✅ Queen Raeesa access validation complete\n');

      // Calculate overall metrics and status
      this.calculateOverallMetrics(report);
      this.determineSystemReadiness(report);
      this.generateRecommendations(report);

      report.executionTime = performance.now() - this.startTime;

      // Generate and save reports
      await this.saveComprehensiveReport(report);
      this.printExecutionSummary(report);

      return report;

    } catch (error) {
      console.error('❌ CRITICAL VALIDATION FAILURE:', error);
      report.overallStatus = 'CRITICAL_FAIL';
      report.criticalIssues.push(`Validation execution failed: ${String(error)}`);
      return report;
    }
  }

  /**
   * 🔍 SYSTEM HEALTH CHECK
   */
  private async performSystemHealthCheck(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/health`);
      if (!response.ok) {
        throw new Error(`System health check failed: ${response.status}`);
      }
      console.log('  ✅ System health check passed');
    } catch (error) {
      throw new Error(`System health check failed: ${String(error)}`);
    }
  }

  /**
   * 🔐 ACQUIRE AUTHENTICATION TOKEN
   */
  private async acquireAuthenticationToken(): Promise<void> {
    try {
      // Try to get admin token
      const response = await fetch(`${this.baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'admin',
          password: process.env.ADMIN_PASSWORD || 'admin123'
        })
      });

      if (response.ok) {
        const data = await response.json();
        this.authToken = data.token;
        console.log('  ✅ Authentication token acquired');
      } else {
        // Try to register and get token
        const registerResponse = await fetch(`${this.baseUrl}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: `validation_user_${Date.now()}`,
            email: `validation${Date.now()}@dha.gov.za`,
            password: 'ValidationPassword123!'
          })
        });

        if (registerResponse.ok) {
          const userData = await registerResponse.json();
          this.authToken = userData.token;
          console.log('  ✅ Validation user created and authenticated');
        } else {
          throw new Error('Could not acquire authentication token');
        }
      }
    } catch (error) {
      throw new Error(`Authentication failed: ${String(error)}`);
    }
  }

  /**
   * 📋 RUN DOCUMENT WORKFLOW VALIDATION
   */
  private async runDocumentWorkflowValidation(): Promise<any> {
    const validator = new DocumentWorkflowValidator(this.baseUrl, this.authToken);
    const results = await validator.testAllDocumentWorkflows();
    return validator.generateWorkflowReport(results);
  }

  /**
   * 🤖 RUN ULTRA AI INTEGRATION VALIDATION
   */
  private async runUltraAIIntegrationValidation(): Promise<any> {
    const validator = new UltraAIIntegrationValidator(this.baseUrl, this.authToken);
    const aiResults = await validator.testAllUltraAISystems();
    const selfHealingResult = await validator.testSelfHealingArchitecture();
    return validator.generateAIIntegrationReport(aiResults, selfHealingResult);
  }

  /**
   * 🛡️ RUN SECURITY COMPLIANCE VALIDATION
   */
  private async runSecurityComplianceValidation(): Promise<any> {
    const validator = new SecurityComplianceValidator(this.baseUrl, this.authToken);
    const securityResults = await validator.testAllSecurityCompliance();
    const popiaResult = await validator.testPOPIACompliance();
    return validator.generateSecurityComplianceReport(securityResults, popiaResult);
  }

  /**
   * ⚡ RUN PERFORMANCE RELIABILITY VALIDATION
   */
  private async runPerformanceReliabilityValidation(): Promise<any> {
    const validator = new PerformanceReliabilityValidator(this.baseUrl, this.authToken);
    const performanceResults = await validator.testAllPerformanceReliability();
    const reliabilityResult = await validator.testSystemReliability();
    return validator.generatePerformanceReliabilityReport(performanceResults, reliabilityResult);
  }

  /**
   * 👑 RUN QUEEN RAEESA ACCESS VALIDATION
   */
  private async runQueenRaesaAccessValidation(): Promise<any> {
    const validator = new QueenRaesaAccessValidator(this.baseUrl, this.authToken);
    const accessResults = await validator.testAllQueenAccess();
    const biometricResult = await validator.testComprehensiveBiometrics();
    return validator.generateQueenAccessReport(accessResults, biometricResult);
  }

  /**
   * 📊 CALCULATE OVERALL METRICS
   */
  private calculateOverallMetrics(report: ComprehensiveValidationReport): void {
    const modules = Object.values(report.validationModules).filter(module => module !== null);
    
    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;
    let criticalFailures = 0;
    let totalExecutionTime = 0;

    modules.forEach(module => {
      if (module && module.summary) {
        totalTests += module.summary.totalTests || module.summary.totalSystems || module.summary.totalWorkflows || 0;
        passedTests += module.summary.passedTests || module.summary.successfulSystems || module.summary.successfulWorkflows || 0;
        failedTests += module.summary.failedTests || 0;
        criticalFailures += module.summary.criticalFailures || 0;
        totalExecutionTime += module.summary.averageDuration || module.summary.totalDuration || 0;
      }
    });

    report.overallMetrics = {
      totalTests,
      passedTests,
      failedTests,
      criticalFailures,
      successRate: totalTests > 0 ? (passedTests / totalTests) * 100 : 0,
      averageExecutionTime: modules.length > 0 ? totalExecutionTime / modules.length : 0
    };

    // Determine overall status
    if (criticalFailures > 0) {
      report.overallStatus = 'CRITICAL_FAIL';
    } else if (failedTests > 0) {
      report.overallStatus = 'FAIL';
    } else {
      report.overallStatus = 'PASS';
    }

    // Zero defect and max reliability status
    report.zeroDefectAchieved = failedTests === 0 && criticalFailures === 0;
    report.maxReliabilityAchieved = report.overallMetrics.successRate >= 99.9;
  }

  /**
   * 🎯 DETERMINE SYSTEM READINESS
   */
  private determineSystemReadiness(report: ComprehensiveValidationReport): void {
    const workflowSuccess = report.validationModules.documentWorkflows?.summary?.successRate >= 95;
    const aiSuccess = report.validationModules.ultraAIIntegration?.summary?.successRate >= 95;
    const securitySuccess = report.validationModules.securityCompliance?.summary?.securityScore >= 90;
    const performanceSuccess = report.validationModules.performanceReliability?.summary?.performanceScore >= 90;
    const queenAccessSuccess = report.validationModules.queenRaesaAccess?.summary?.accessSuccessRate >= 95;

    report.systemReadiness = {
      productionReady: workflowSuccess && aiSuccess && securitySuccess && performanceSuccess,
      railwayDeploymentReady: report.overallMetrics.successRate >= 95 && report.overallMetrics.criticalFailures === 0,
      governmentCompliant: securitySuccess && report.validationModules.securityCompliance?.popiaCompliance?.overallCompliant,
      securityCertified: securitySuccess && queenAccessSuccess
    };
  }

  /**
   * 💡 GENERATE RECOMMENDATIONS
   */
  private generateRecommendations(report: ComprehensiveValidationReport): void {
    const recommendations: string[] = [];
    const criticalIssues: string[] = [];
    const nextSteps: string[] = [];

    // Critical issues
    if (report.overallMetrics.criticalFailures > 0) {
      criticalIssues.push(`${report.overallMetrics.criticalFailures} critical failure(s) must be resolved immediately`);
    }

    // Module-specific recommendations
    Object.entries(report.validationModules).forEach(([moduleName, moduleData]) => {
      if (moduleData && moduleData.recommendations) {
        recommendations.push(...moduleData.recommendations.map((rec: string) => `${moduleName}: ${rec}`));
      }
    });

    // Overall system recommendations
    if (!report.zeroDefectAchieved) {
      recommendations.push('Achieve zero-defect operation by resolving all test failures');
    }

    if (!report.maxReliabilityAchieved) {
      recommendations.push('Improve system reliability to achieve 99.9%+ success rate');
    }

    if (!report.systemReadiness.productionReady) {
      criticalIssues.push('System not ready for production deployment');
      nextSteps.push('Address all failing tests and achieve 95%+ success rate across all modules');
    }

    if (!report.systemReadiness.governmentCompliant) {
      criticalIssues.push('System not compliant with government standards');
      nextSteps.push('Complete POPIA compliance and security certification');
    }

    // Success recommendations
    if (report.systemReadiness.productionReady && report.systemReadiness.governmentCompliant) {
      recommendations.push('System ready for production deployment and government certification');
      nextSteps.push('Proceed with Railway deployment and government audit submission');
    }

    report.recommendations = recommendations;
    report.criticalIssues = criticalIssues;
    report.nextSteps = nextSteps;
  }

  /**
   * 💾 SAVE COMPREHENSIVE REPORT
   */
  private async saveComprehensiveReport(report: ComprehensiveValidationReport): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // Save JSON report
    const jsonPath = `DHA_COMPREHENSIVE_VALIDATION_REPORT_${timestamp}.json`;
    writeFileSync(jsonPath, JSON.stringify(report, null, 2));
    console.log(`📄 Comprehensive report saved: ${jsonPath}`);

    // Save Markdown summary
    const markdownPath = `DHA_VALIDATION_SUMMARY_${timestamp}.md`;
    const markdownContent = this.generateMarkdownSummary(report);
    writeFileSync(markdownPath, markdownContent);
    console.log(`📄 Summary report saved: ${markdownPath}`);

    // Save CSV metrics
    const csvPath = `DHA_VALIDATION_METRICS_${timestamp}.csv`;
    const csvContent = this.generateCSVMetrics(report);
    writeFileSync(csvPath, csvContent);
    console.log(`📄 Metrics CSV saved: ${csvPath}`);
  }

  /**
   * 📝 GENERATE MARKDOWN SUMMARY
   */
  private generateMarkdownSummary(report: ComprehensiveValidationReport): string {
    return `# DHA Digital Services Platform - Comprehensive Validation Report

**Report ID:** ${report.reportId}
**Timestamp:** ${report.timestamp}
**Execution Time:** ${(report.executionTime / 1000).toFixed(2)} seconds

## Executive Summary

- **Overall Status:** ${report.overallStatus}
- **Zero-Defect Achieved:** ${report.zeroDefectAchieved ? '✅ YES' : '❌ NO'}
- **Max Reliability Achieved:** ${report.maxReliabilityAchieved ? '✅ YES' : '❌ NO'}
- **Success Rate:** ${report.overallMetrics.successRate.toFixed(2)}%

## System Readiness

- **Production Ready:** ${report.systemReadiness.productionReady ? '✅ YES' : '❌ NO'}
- **Railway Deployment Ready:** ${report.systemReadiness.railwayDeploymentReady ? '✅ YES' : '❌ NO'}
- **Government Compliant:** ${report.systemReadiness.governmentCompliant ? '✅ YES' : '❌ NO'}
- **Security Certified:** ${report.systemReadiness.securityCertified ? '✅ YES' : '❌ NO'}

## Test Results Summary

- **Total Tests:** ${report.overallMetrics.totalTests}
- **Passed Tests:** ${report.overallMetrics.passedTests}
- **Failed Tests:** ${report.overallMetrics.failedTests}
- **Critical Failures:** ${report.overallMetrics.criticalFailures}

## Validation Modules

### 📋 Document Workflows
- **Status:** ${report.validationModules.documentWorkflows?.summary?.successRate >= 95 ? '✅ PASS' : '❌ FAIL'}
- **Success Rate:** ${report.validationModules.documentWorkflows?.summary?.successRate?.toFixed(2) || 0}%

### 🤖 Ultra AI Integration
- **Status:** ${report.validationModules.ultraAIIntegration?.summary?.successRate >= 95 ? '✅ PASS' : '❌ FAIL'}
- **Success Rate:** ${report.validationModules.ultraAIIntegration?.summary?.successRate?.toFixed(2) || 0}%

### 🛡️ Security Compliance
- **Status:** ${report.validationModules.securityCompliance?.summary?.securityScore >= 90 ? '✅ PASS' : '❌ FAIL'}
- **Security Score:** ${report.validationModules.securityCompliance?.summary?.securityScore?.toFixed(2) || 0}%

### ⚡ Performance Reliability
- **Status:** ${report.validationModules.performanceReliability?.summary?.performanceScore >= 90 ? '✅ PASS' : '❌ FAIL'}
- **Performance Score:** ${report.validationModules.performanceReliability?.summary?.performanceScore?.toFixed(2) || 0}%

### 👑 Queen Raeesa Access
- **Status:** ${report.validationModules.queenRaesaAccess?.summary?.accessSuccessRate >= 95 ? '✅ PASS' : '❌ FAIL'}
- **Access Success Rate:** ${report.validationModules.queenRaesaAccess?.summary?.accessSuccessRate?.toFixed(2) || 0}%

## Critical Issues

${report.criticalIssues.length > 0 ? report.criticalIssues.map(issue => `- ❌ ${issue}`).join('\n') : '✅ No critical issues detected'}

## Recommendations

${report.recommendations.length > 0 ? report.recommendations.map(rec => `- ${rec}`).join('\n') : '✅ All systems operating optimally'}

## Next Steps

${report.nextSteps.length > 0 ? report.nextSteps.map(step => `1. ${step}`).join('\n') : '✅ System ready for deployment'}

---
*Generated by DHA Comprehensive Live Validation Suite*
*Report ID: ${report.reportId}*
`;
  }

  /**
   * 📊 GENERATE CSV METRICS
   */
  private generateCSVMetrics(report: ComprehensiveValidationReport): string {
    const headers = ['Module', 'Total Tests', 'Passed Tests', 'Failed Tests', 'Success Rate', 'Status'];
    const rows = [headers.join(',')];

    Object.entries(report.validationModules).forEach(([moduleName, moduleData]) => {
      if (moduleData && moduleData.summary) {
        const summary = moduleData.summary;
        const totalTests = summary.totalTests || summary.totalSystems || summary.totalWorkflows || 0;
        const passedTests = summary.passedTests || summary.successfulSystems || summary.successfulWorkflows || 0;
        const failedTests = summary.failedTests || 0;
        const successRate = summary.successRate || summary.securityScore || summary.performanceScore || summary.accessSuccessRate || 0;
        const status = successRate >= 90 ? 'PASS' : 'FAIL';

        rows.push([moduleName, totalTests, passedTests, failedTests, successRate.toFixed(2), status].join(','));
      }
    });

    return rows.join('\n');
  }

  /**
   * 📺 PRINT EXECUTION SUMMARY
   */
  private printExecutionSummary(report: ComprehensiveValidationReport): void {
    console.log('\n🎯 COMPREHENSIVE VALIDATION COMPLETE!');
    console.log('=' .repeat(80));
    console.log(`📊 Overall Status: ${report.overallStatus}`);
    console.log(`📈 Success Rate: ${report.overallMetrics.successRate.toFixed(2)}%`);
    console.log(`🎯 Zero-Defect Status: ${report.zeroDefectAchieved ? 'ACHIEVED' : 'NOT ACHIEVED'}`);
    console.log(`🚀 Max Reliability Status: ${report.maxReliabilityAchieved ? 'ACHIEVED' : 'NOT ACHIEVED'}`);
    console.log(`⏱️ Execution Time: ${(report.executionTime / 1000).toFixed(2)} seconds`);
    console.log(`📋 Total Tests: ${report.overallMetrics.totalTests}`);
    console.log(`✅ Passed: ${report.overallMetrics.passedTests}`);
    console.log(`❌ Failed: ${report.overallMetrics.failedTests}`);
    console.log(`🚨 Critical: ${report.overallMetrics.criticalFailures}`);
    
    console.log('\n🏛️ SYSTEM READINESS:');
    console.log(`   Production Ready: ${report.systemReadiness.productionReady ? '✅' : '❌'}`);
    console.log(`   Railway Deployment Ready: ${report.systemReadiness.railwayDeploymentReady ? '✅' : '❌'}`);
    console.log(`   Government Compliant: ${report.systemReadiness.governmentCompliant ? '✅' : '❌'}`);
    console.log(`   Security Certified: ${report.systemReadiness.securityCertified ? '✅' : '❌'}`);

    if (report.criticalIssues.length > 0) {
      console.log('\n🚨 CRITICAL ISSUES:');
      report.criticalIssues.forEach(issue => console.log(`   - ${issue}`));
    }

    if (report.nextSteps.length > 0) {
      console.log('\n📋 NEXT STEPS:');
      report.nextSteps.forEach((step, index) => console.log(`   ${index + 1}. ${step}`));
    }

    console.log('\n🏛️ DHA Digital Services Platform Validation Complete!');
  }
}

// Main execution
async function main() {
  const runner = new ComprehensiveValidationRunner();
  
  try {
    const report = await runner.runComprehensiveValidation();
    
    // Exit with appropriate code
    const exitCode = report.overallStatus === 'CRITICAL_FAIL' ? 2 :
                    report.overallStatus === 'FAIL' ? 1 : 0;
    
    process.exit(exitCode);
    
  } catch (error) {
    console.error('❌ CRITICAL VALIDATION FAILURE:', error);
    process.exit(2);
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { ComprehensiveValidationRunner };
#!/usr/bin/env tsx

/**
 * 🛡️ SECURITY AND COMPLIANCE VALIDATOR
 * 
 * Validates military-grade security features and POPIA compliance:
 * - Military-grade security features and threat detection
 * - POPIA compliance with data governance and privacy protection
 * - Biometric encryption and secure document storage
 * - Government API integrations (NPR, ABIS, SAPS, ICAO)
 * - Audit trail completeness and compliance reporting
 */

import { performance } from 'perf_hooks';

export interface SecurityTestConfig {
  testId: string;
  name: string;
  category: 'authentication' | 'encryption' | 'access_control' | 'audit' | 'compliance' | 'threat_detection';
  securityLevel: 'standard' | 'high' | 'military' | 'ultra';
  requiredCompliance: string[];
  testEndpoint: string;
  testData?: any;
}

export interface SecurityTestResult {
  testId: string;
  name: string;
  category: string;
  success: boolean;
  securityLevel: string;
  duration: number;
  vulnerabilities: string[];
  complianceStatus: {
    popia: boolean;
    militaryGrade: boolean;
    governmentStandards: boolean;
    internationalStandards: boolean;
  };
  securityFeatures: {
    encryption: {
      enabled: boolean;
      algorithm: string;
      keyStrength: number;
    };
    authentication: {
      multiFactorEnabled: boolean;
      biometricEnabled: boolean;
      tokenValidation: boolean;
    };
    accessControl: {
      rbacEnabled: boolean;
      privilegeEscalationProtection: boolean;
      sessionManagement: boolean;
    };
    auditTrail: {
      enabled: boolean;
      completeness: number;
      tamperEvident: boolean;
    };
    threatDetection: {
      realTimeMonitoring: boolean;
      anomalyDetection: boolean;
      responseTime: number;
    };
  };
  governmentAPICompliance: {
    nprIntegration: boolean;
    abisIntegration: boolean;
    sapsIntegration: boolean;
    icaoCompliance: boolean;
  };
  error?: string;
}

export interface POPIAComplianceResult {
  overallCompliant: boolean;
  dataGovernance: {
    consentManagement: boolean;
    dataMinimization: boolean;
    purposeLimitation: boolean;
    accuracyMaintenance: boolean;
    retentionLimits: boolean;
    securitySafeguards: boolean;
    dataSubjectRights: boolean;
    crossBorderTransfers: boolean;
  };
  privacyProtection: {
    dataEncryption: boolean;
    accessControls: boolean;
    anonymization: boolean;
    pseudonymization: boolean;
  };
  auditCompliance: {
    auditTrailComplete: boolean;
    consentRecords: boolean;
    accessLogs: boolean;
    dataProcessingLogs: boolean;
  };
  complianceScore: number;
}

export class SecurityComplianceValidator {
  private baseUrl: string;
  private authToken: string;

  constructor(baseUrl: string, authToken: string) {
    this.baseUrl = baseUrl;
    this.authToken = authToken;
  }

  /**
   * 🛡️ COMPREHENSIVE SECURITY TEST CONFIGURATIONS
   */
  static readonly SECURITY_TESTS: SecurityTestConfig[] = [
    // Authentication Tests
    {
      testId: 'multi-factor-auth',
      name: 'Multi-Factor Authentication',
      category: 'authentication',
      securityLevel: 'military',
      requiredCompliance: ['POPIA', 'Government Standards'],
      testEndpoint: '/api/auth/mfa/validate'
    },
    {
      testId: 'biometric-auth',
      name: 'Biometric Authentication',
      category: 'authentication',
      securityLevel: 'ultra',
      requiredCompliance: ['POPIA', 'Biometric Standards'],
      testEndpoint: '/api/biometric/authenticate'
    },
    {
      testId: 'session-security',
      name: 'Session Security Management',
      category: 'authentication',
      securityLevel: 'high',
      requiredCompliance: ['POPIA', 'Government Standards'],
      testEndpoint: '/api/auth/session/validate'
    },

    // Encryption Tests
    {
      testId: 'data-encryption',
      name: 'Data Encryption at Rest',
      category: 'encryption',
      securityLevel: 'military',
      requiredCompliance: ['POPIA', 'Military Standards'],
      testEndpoint: '/api/security/encryption/status'
    },
    {
      testId: 'transport-encryption',
      name: 'Transport Layer Security',
      category: 'encryption',
      securityLevel: 'military',
      requiredCompliance: ['POPIA', 'TLS Standards'],
      testEndpoint: '/api/security/tls/status'
    },
    {
      testId: 'biometric-encryption',
      name: 'Biometric Data Encryption',
      category: 'encryption',
      securityLevel: 'ultra',
      requiredCompliance: ['POPIA', 'Biometric Protection'],
      testEndpoint: '/api/biometric/encryption/status'
    },

    // Access Control Tests
    {
      testId: 'rbac-enforcement',
      name: 'Role-Based Access Control',
      category: 'access_control',
      securityLevel: 'high',
      requiredCompliance: ['POPIA', 'Government Standards'],
      testEndpoint: '/api/security/rbac/test'
    },
    {
      testId: 'privilege-escalation',
      name: 'Privilege Escalation Protection',
      category: 'access_control',
      securityLevel: 'military',
      requiredCompliance: ['Security Standards'],
      testEndpoint: '/api/security/privilege/test'
    },
    {
      testId: 'queen-access-control',
      name: 'Queen Raeesa Exclusive Access',
      category: 'access_control',
      securityLevel: 'ultra',
      requiredCompliance: ['Biometric Verification'],
      testEndpoint: '/api/security/queen-access/validate'
    },

    // Audit Trail Tests
    {
      testId: 'audit-completeness',
      name: 'Audit Trail Completeness',
      category: 'audit',
      securityLevel: 'military',
      requiredCompliance: ['POPIA', 'Government Audit'],
      testEndpoint: '/api/audit/completeness'
    },
    {
      testId: 'tamper-evidence',
      name: 'Tamper-Evident Audit Logs',
      category: 'audit',
      securityLevel: 'military',
      requiredCompliance: ['POPIA', 'Integrity Standards'],
      testEndpoint: '/api/audit/tamper-evidence'
    },

    // Compliance Tests
    {
      testId: 'popia-compliance',
      name: 'POPIA Data Protection Compliance',
      category: 'compliance',
      securityLevel: 'high',
      requiredCompliance: ['POPIA Full Compliance'],
      testEndpoint: '/api/compliance/popia/status'
    },
    {
      testId: 'government-standards',
      name: 'Government Security Standards',
      category: 'compliance',
      securityLevel: 'military',
      requiredCompliance: ['Government Standards'],
      testEndpoint: '/api/compliance/government/status'
    },

    // Threat Detection Tests
    {
      testId: 'real-time-monitoring',
      name: 'Real-Time Threat Monitoring',
      category: 'threat_detection',
      securityLevel: 'military',
      requiredCompliance: ['Security Monitoring'],
      testEndpoint: '/api/security/monitoring/status'
    },
    {
      testId: 'anomaly-detection',
      name: 'Behavioral Anomaly Detection',
      category: 'threat_detection',
      securityLevel: 'high',
      requiredCompliance: ['Advanced Monitoring'],
      testEndpoint: '/api/security/anomaly/status'
    },
    {
      testId: 'incident-response',
      name: 'Automated Incident Response',
      category: 'threat_detection',
      securityLevel: 'military',
      requiredCompliance: ['Response Automation'],
      testEndpoint: '/api/security/incident/response-time'
    }
  ];

  /**
   * 🎯 TEST ALL SECURITY AND COMPLIANCE FEATURES
   */
  async testAllSecurityCompliance(): Promise<SecurityTestResult[]> {
    console.log('🛡️ Testing all security and compliance features...\n');
    
    const results: SecurityTestResult[] = [];
    
    for (const securityTest of SecurityComplianceValidator.SECURITY_TESTS) {
      console.log(`🛡️ Testing: ${securityTest.name}`);
      const result = await this.testSingleSecurityFeature(securityTest);
      results.push(result);
      
      const status = result.success ? '✅' : '❌';
      const vulnCount = result.vulnerabilities.length;
      const vulnInfo = vulnCount > 0 ? ` (${vulnCount} vulnerabilities)` : '';
      console.log(`${status} ${securityTest.name}: ${result.duration.toFixed(2)}ms${vulnInfo}\n`);
    }

    return results;
  }

  /**
   * 🎯 TEST SINGLE SECURITY FEATURE
   */
  async testSingleSecurityFeature(config: SecurityTestConfig): Promise<SecurityTestResult> {
    const startTime = performance.now();
    
    const result: SecurityTestResult = {
      testId: config.testId,
      name: config.name,
      category: config.category,
      success: false,
      securityLevel: config.securityLevel,
      duration: 0,
      vulnerabilities: [],
      complianceStatus: {
        popia: false,
        militaryGrade: false,
        governmentStandards: false,
        internationalStandards: false
      },
      securityFeatures: {
        encryption: {
          enabled: false,
          algorithm: '',
          keyStrength: 0
        },
        authentication: {
          multiFactorEnabled: false,
          biometricEnabled: false,
          tokenValidation: false
        },
        accessControl: {
          rbacEnabled: false,
          privilegeEscalationProtection: false,
          sessionManagement: false
        },
        auditTrail: {
          enabled: false,
          completeness: 0,
          tamperEvident: false
        },
        threatDetection: {
          realTimeMonitoring: false,
          anomalyDetection: false,
          responseTime: 0
        }
      },
      governmentAPICompliance: {
        nprIntegration: false,
        abisIntegration: false,
        sapsIntegration: false,
        icaoCompliance: false
      }
    };

    try {
      // Execute specific security test based on category
      switch (config.category) {
        case 'authentication':
          await this.testAuthenticationSecurity(config, result);
          break;
        case 'encryption':
          await this.testEncryptionSecurity(config, result);
          break;
        case 'access_control':
          await this.testAccessControlSecurity(config, result);
          break;
        case 'audit':
          await this.testAuditSecurity(config, result);
          break;
        case 'compliance':
          await this.testComplianceSecurity(config, result);
          break;
        case 'threat_detection':
          await this.testThreatDetectionSecurity(config, result);
          break;
      }

      // Test government API compliance
      await this.testGovernmentAPICompliance(result);

      // Calculate overall success
      result.success = result.vulnerabilities.length === 0 && 
                      this.meetsSecurityLevel(result, config.securityLevel);
      
      result.duration = performance.now() - startTime;
      
    } catch (error) {
      result.error = error instanceof Error ? error.message : String(error);
      result.duration = performance.now() - startTime;
      result.vulnerabilities.push(`Test execution error: ${result.error}`);
    }

    return result;
  }

  /**
   * 🔐 TEST AUTHENTICATION SECURITY
   */
  private async testAuthenticationSecurity(config: SecurityTestConfig, result: SecurityTestResult): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}${config.testEndpoint}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        result.securityFeatures.authentication.multiFactorEnabled = data.mfaEnabled || false;
        result.securityFeatures.authentication.biometricEnabled = data.biometricEnabled || false;
        result.securityFeatures.authentication.tokenValidation = data.tokenValidation || false;
        
        // Check for vulnerabilities
        if (!data.mfaEnabled && config.securityLevel === 'military') {
          result.vulnerabilities.push('Multi-factor authentication not enabled for military-grade security');
        }
        if (!data.biometricEnabled && config.testId === 'biometric-auth') {
          result.vulnerabilities.push('Biometric authentication not properly configured');
        }
      } else {
        result.vulnerabilities.push(`Authentication endpoint returned ${response.status}`);
      }
    } catch (error) {
      result.vulnerabilities.push(`Authentication test failed: ${String(error)}`);
    }
  }

  /**
   * 🔒 TEST ENCRYPTION SECURITY
   */
  private async testEncryptionSecurity(config: SecurityTestConfig, result: SecurityTestResult): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}${config.testEndpoint}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        result.securityFeatures.encryption.enabled = data.encryptionEnabled || false;
        result.securityFeatures.encryption.algorithm = data.algorithm || '';
        result.securityFeatures.encryption.keyStrength = data.keyStrength || 0;
        
        // Check encryption strength
        if (config.securityLevel === 'military' || config.securityLevel === 'ultra') {
          if (result.securityFeatures.encryption.keyStrength < 256) {
            result.vulnerabilities.push('Encryption key strength insufficient for military-grade security');
          }
          if (!['AES-256', 'ChaCha20-Poly1305'].includes(data.algorithm)) {
            result.vulnerabilities.push('Encryption algorithm not military-grade');
          }
        }
        
        if (!data.encryptionEnabled) {
          result.vulnerabilities.push('Data encryption not enabled');
        }
      } else {
        result.vulnerabilities.push(`Encryption endpoint returned ${response.status}`);
      }
    } catch (error) {
      result.vulnerabilities.push(`Encryption test failed: ${String(error)}`);
    }
  }

  /**
   * 🚪 TEST ACCESS CONTROL SECURITY
   */
  private async testAccessControlSecurity(config: SecurityTestConfig, result: SecurityTestResult): Promise<void> {
    try {
      // Test RBAC enforcement
      const rbacResponse = await fetch(`${this.baseUrl}/api/security/rbac/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`
        },
        body: JSON.stringify({
          testType: 'unauthorized_access',
          targetResource: 'admin_only_resource'
        })
      });
      
      result.securityFeatures.accessControl.rbacEnabled = rbacResponse.status === 403;
      
      // Test privilege escalation protection
      const privEscResponse = await fetch(`${this.baseUrl}/api/security/privilege/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`
        },
        body: JSON.stringify({
          testType: 'privilege_escalation',
          targetRole: 'super_admin'
        })
      });
      
      result.securityFeatures.accessControl.privilegeEscalationProtection = privEscResponse.status === 403;
      
      // Check for vulnerabilities
      if (!result.securityFeatures.accessControl.rbacEnabled) {
        result.vulnerabilities.push('Role-based access control not properly enforced');
      }
      if (!result.securityFeatures.accessControl.privilegeEscalationProtection) {
        result.vulnerabilities.push('Privilege escalation protection insufficient');
      }
      
    } catch (error) {
      result.vulnerabilities.push(`Access control test failed: ${String(error)}`);
    }
  }

  /**
   * 📋 TEST AUDIT SECURITY
   */
  private async testAuditSecurity(config: SecurityTestConfig, result: SecurityTestResult): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}${config.testEndpoint}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        result.securityFeatures.auditTrail.enabled = data.auditEnabled || false;
        result.securityFeatures.auditTrail.completeness = data.completenessPercentage || 0;
        result.securityFeatures.auditTrail.tamperEvident = data.tamperEvident || false;
        
        // Check audit requirements
        if (result.securityFeatures.auditTrail.completeness < 95) {
          result.vulnerabilities.push(`Audit trail completeness below required 95% (${result.securityFeatures.auditTrail.completeness}%)`);
        }
        if (!result.securityFeatures.auditTrail.tamperEvident) {
          result.vulnerabilities.push('Audit trail not tamper-evident');
        }
        if (!result.securityFeatures.auditTrail.enabled) {
          result.vulnerabilities.push('Audit trail not enabled');
        }
      } else {
        result.vulnerabilities.push(`Audit endpoint returned ${response.status}`);
      }
    } catch (error) {
      result.vulnerabilities.push(`Audit test failed: ${String(error)}`);
    }
  }

  /**
   * ✅ TEST COMPLIANCE SECURITY
   */
  private async testComplianceSecurity(config: SecurityTestConfig, result: SecurityTestResult): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}${config.testEndpoint}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        result.complianceStatus.popia = data.popiaCompliant || false;
        result.complianceStatus.militaryGrade = data.militaryGradeCompliant || false;
        result.complianceStatus.governmentStandards = data.governmentStandardsCompliant || false;
        result.complianceStatus.internationalStandards = data.internationalStandardsCompliant || false;
        
        // Check compliance requirements
        config.requiredCompliance.forEach(requirement => {
          if (requirement.includes('POPIA') && !result.complianceStatus.popia) {
            result.vulnerabilities.push('POPIA compliance not achieved');
          }
          if (requirement.includes('Military') && !result.complianceStatus.militaryGrade) {
            result.vulnerabilities.push('Military-grade security standards not met');
          }
          if (requirement.includes('Government') && !result.complianceStatus.governmentStandards) {
            result.vulnerabilities.push('Government security standards not met');
          }
        });
      } else {
        result.vulnerabilities.push(`Compliance endpoint returned ${response.status}`);
      }
    } catch (error) {
      result.vulnerabilities.push(`Compliance test failed: ${String(error)}`);
    }
  }

  /**
   * 🚨 TEST THREAT DETECTION SECURITY
   */
  private async testThreatDetectionSecurity(config: SecurityTestConfig, result: SecurityTestResult): Promise<void> {
    try {
      const startTime = performance.now();
      
      const response = await fetch(`${this.baseUrl}${config.testEndpoint}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        result.securityFeatures.threatDetection.realTimeMonitoring = data.realTimeMonitoring || false;
        result.securityFeatures.threatDetection.anomalyDetection = data.anomalyDetection || false;
        result.securityFeatures.threatDetection.responseTime = performance.now() - startTime;
        
        // Check threat detection requirements
        if (!result.securityFeatures.threatDetection.realTimeMonitoring) {
          result.vulnerabilities.push('Real-time threat monitoring not active');
        }
        if (result.securityFeatures.threatDetection.responseTime > 100) {
          result.vulnerabilities.push(`Threat detection response time too slow: ${result.securityFeatures.threatDetection.responseTime.toFixed(2)}ms`);
        }
      } else {
        result.vulnerabilities.push(`Threat detection endpoint returned ${response.status}`);
      }
    } catch (error) {
      result.vulnerabilities.push(`Threat detection test failed: ${String(error)}`);
    }
  }

  /**
   * 🏛️ TEST GOVERNMENT API COMPLIANCE
   */
  private async testGovernmentAPICompliance(result: SecurityTestResult): Promise<void> {
    try {
      const apiTests = [
        { name: 'npr', endpoint: '/api/government/npr/status' },
        { name: 'abis', endpoint: '/api/government/abis/status' },
        { name: 'saps', endpoint: '/api/government/saps/status' },
        { name: 'icao', endpoint: '/api/government/icao/status' }
      ];

      for (const apiTest of apiTests) {
        try {
          const response = await fetch(`${this.baseUrl}${apiTest.endpoint}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${this.authToken}`
            }
          });
          
          const isCompliant = response.ok;
          
          switch (apiTest.name) {
            case 'npr':
              result.governmentAPICompliance.nprIntegration = isCompliant;
              break;
            case 'abis':
              result.governmentAPICompliance.abisIntegration = isCompliant;
              break;
            case 'saps':
              result.governmentAPICompliance.sapsIntegration = isCompliant;
              break;
            case 'icao':
              result.governmentAPICompliance.icaoCompliance = isCompliant;
              break;
          }
          
          if (!isCompliant) {
            result.vulnerabilities.push(`${apiTest.name.toUpperCase()} API integration not compliant`);
          }
        } catch (error) {
          result.vulnerabilities.push(`${apiTest.name.toUpperCase()} API test failed: ${String(error)}`);
        }
      }
    } catch (error) {
      result.vulnerabilities.push(`Government API compliance test failed: ${String(error)}`);
    }
  }

  /**
   * 🎯 TEST POPIA COMPLIANCE
   */
  async testPOPIACompliance(): Promise<POPIAComplianceResult> {
    console.log('🛡️ Testing POPIA compliance...');
    
    const result: POPIAComplianceResult = {
      overallCompliant: false,
      dataGovernance: {
        consentManagement: false,
        dataMinimization: false,
        purposeLimitation: false,
        accuracyMaintenance: false,
        retentionLimits: false,
        securitySafeguards: false,
        dataSubjectRights: false,
        crossBorderTransfers: false
      },
      privacyProtection: {
        dataEncryption: false,
        accessControls: false,
        anonymization: false,
        pseudonymization: false
      },
      auditCompliance: {
        auditTrailComplete: false,
        consentRecords: false,
        accessLogs: false,
        dataProcessingLogs: false
      },
      complianceScore: 0
    };

    try {
      const response = await fetch(`${this.baseUrl}/api/compliance/popia/detailed`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Map response data to result structure
        Object.assign(result.dataGovernance, data.dataGovernance || {});
        Object.assign(result.privacyProtection, data.privacyProtection || {});
        Object.assign(result.auditCompliance, data.auditCompliance || {});
        
        // Calculate compliance score
        const allChecks = [
          ...Object.values(result.dataGovernance),
          ...Object.values(result.privacyProtection),
          ...Object.values(result.auditCompliance)
        ];
        
        const passedChecks = allChecks.filter(check => check === true).length;
        result.complianceScore = (passedChecks / allChecks.length) * 100;
        result.overallCompliant = result.complianceScore >= 95;
      }
    } catch (error) {
      console.error('POPIA compliance test failed:', error);
    }

    return result;
  }

  /**
   * 📊 CHECK SECURITY LEVEL COMPLIANCE
   */
  private meetsSecurityLevel(result: SecurityTestResult, requiredLevel: string): boolean {
    switch (requiredLevel) {
      case 'ultra':
        return result.securityFeatures.authentication.biometricEnabled &&
               result.securityFeatures.encryption.keyStrength >= 256 &&
               result.securityFeatures.threatDetection.responseTime < 50;
               
      case 'military':
        return result.securityFeatures.authentication.multiFactorEnabled &&
               result.securityFeatures.encryption.keyStrength >= 256 &&
               result.securityFeatures.auditTrail.enabled &&
               result.securityFeatures.threatDetection.realTimeMonitoring;
               
      case 'high':
        return result.securityFeatures.authentication.tokenValidation &&
               result.securityFeatures.encryption.enabled &&
               result.securityFeatures.accessControl.rbacEnabled;
               
      default:
        return result.securityFeatures.authentication.tokenValidation &&
               result.securityFeatures.encryption.enabled;
    }
  }

  /**
   * 📋 GENERATE SECURITY COMPLIANCE REPORT
   */
  generateSecurityComplianceReport(results: SecurityTestResult[], popiaResult: POPIAComplianceResult): any {
    const totalTests = results.length;
    const passedTests = results.filter(r => r.success).length;
    const totalVulnerabilities = results.reduce((sum, r) => sum + r.vulnerabilities.length, 0);
    const averageDuration = results.reduce((sum, r) => sum + r.duration, 0) / totalTests;

    return {
      summary: {
        totalTests,
        passedTests,
        securityScore: (passedTests / totalTests) * 100,
        totalVulnerabilities,
        averageDuration: Math.round(averageDuration),
        popiaCompliant: popiaResult.overallCompliant,
        popiaScore: popiaResult.complianceScore
      },
      securityTestResults: results,
      popiaCompliance: popiaResult,
      vulnerabilityAnalysis: {
        criticalVulnerabilities: results.filter(r => r.securityLevel === 'ultra' && r.vulnerabilities.length > 0),
        militaryGradeIssues: results.filter(r => r.securityLevel === 'military' && r.vulnerabilities.length > 0),
        complianceIssues: results.filter(r => !r.complianceStatus.popia)
      },
      recommendations: this.generateSecurityRecommendations(results, popiaResult)
    };
  }

  /**
   * 💡 GENERATE SECURITY RECOMMENDATIONS
   */
  private generateSecurityRecommendations(results: SecurityTestResult[], popiaResult: POPIAComplianceResult): string[] {
    const recommendations: string[] = [];
    
    const failedTests = results.filter(r => !r.success);
    if (failedTests.length > 0) {
      recommendations.push(`Fix ${failedTests.length} failed security test(s) immediately`);
    }
    
    const criticalVulns = results.filter(r => r.securityLevel === 'ultra' && r.vulnerabilities.length > 0);
    if (criticalVulns.length > 0) {
      recommendations.push(`Address ${criticalVulns.length} ultra-security vulnerabilities with highest priority`);
    }
    
    if (!popiaResult.overallCompliant) {
      recommendations.push(`Achieve POPIA compliance (current score: ${popiaResult.complianceScore.toFixed(1)}%)`);
    }
    
    const slowResponses = results.filter(r => r.securityFeatures.threatDetection.responseTime > 100);
    if (slowResponses.length > 0) {
      recommendations.push('Improve threat detection response times to <100ms');
    }
    
    const authIssues = results.filter(r => !r.securityFeatures.authentication.multiFactorEnabled);
    if (authIssues.length > 0) {
      recommendations.push('Enable multi-factor authentication for all systems');
    }
    
    if (results.every(r => r.success) && popiaResult.overallCompliant) {
      recommendations.push('All security and compliance requirements met - system ready for production');
    }
    
    return recommendations;
  }
}

export default SecurityComplianceValidator;
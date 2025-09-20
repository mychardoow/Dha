
/**
 * Environment Validator for Production Deployment
 * Validates all required environment variables and configurations
 */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  recommendations: string[];
}

export class EnvironmentValidator {
  private requiredSecrets = [
    'JWT_SECRET',
    'SESSION_SECRET', 
    'ENCRYPTION_KEY',
    'VITE_ENCRYPTION_KEY',
    'MASTER_ENCRYPTION_KEY',
    'QUANTUM_ENCRYPTION_KEY',
    'BIOMETRIC_ENCRYPTION_KEY',
    'DOCUMENT_SIGNING_KEY',
    'DATABASE_URL'
  ];

  private governmentAPIKeys = [
    'DHA_NPR_API_KEY',
    'DHA_ABIS_API_KEY',
    'SAPS_CRC_API_KEY',
    'ICAO_PKD_API_KEY',
    'SITA_ESERVICES_API_KEY'
  ];

  private aiServiceKeys = [
    'OPENAI_API_KEY',
    'ANTHROPIC_API_KEY'
  ];

  public validateEnvironment(): ValidationResult {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      recommendations: []
    };

    // Validate required secrets
    this.validateRequiredSecrets(result);
    
    // Validate government API keys
    this.validateGovernmentAPIs(result);
    
    // Validate AI services
    this.validateAIServices(result);
    
    // Validate database configuration
    this.validateDatabase(result);
    
    // Validate security configuration
    this.validateSecurity(result);

    // Set overall validity
    result.valid = result.errors.length === 0;

    return result;
  }

  private validateRequiredSecrets(result: ValidationResult): void {
    for (const secret of this.requiredSecrets) {
      const value = process.env[secret];
      
      if (!value) {
        result.errors.push(`Missing required environment variable: ${secret}`);
        continue;
      }

      // Validate secret strength in production
      if (process.env.NODE_ENV === 'production') {
        if (secret.includes('SECRET') || secret.includes('KEY')) {
          if (value.length < 32) {
            result.errors.push(`${secret} must be at least 32 characters in production`);
          }
          
          if (value.includes('dev-') || value.includes('test-')) {
            result.errors.push(`${secret} appears to be a development key in production`);
          }
        }
      }
    }
  }

  private validateGovernmentAPIs(result: ValidationResult): void {
    for (const apiKey of this.governmentAPIKeys) {
      const value = process.env[apiKey];
      const enabled = process.env[`${apiKey.replace('_API_KEY', '_ENABLED')}`];
      
      if (enabled === 'true' && !value) {
        result.errors.push(`${apiKey} is required when service is enabled`);
      } else if (!value) {
        result.warnings.push(`${apiKey} not configured - service will be disabled`);
      }
    }
  }

  private validateAIServices(result: ValidationResult): void {
    const openAIKey = process.env.OPENAI_API_KEY;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;

    if (!openAIKey && !anthropicKey) {
      result.errors.push('At least one AI service (OpenAI or Anthropic) must be configured');
    }

    if (openAIKey && !openAIKey.startsWith('sk-')) {
      result.warnings.push('OPENAI_API_KEY format appears invalid');
    }

    if (anthropicKey && !anthropicKey.startsWith('sk-ant-')) {
      result.warnings.push('ANTHROPIC_API_KEY format appears invalid');
    }
  }

  private validateDatabase(result: ValidationResult): void {
    const databaseUrl = process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      result.errors.push('DATABASE_URL is required');
      return;
    }

    try {
      const url = new URL(databaseUrl);
      
      if (url.protocol !== 'postgresql:' && url.protocol !== 'postgres:') {
        result.errors.push('DATABASE_URL must be a PostgreSQL connection string');
      }

      if (process.env.NODE_ENV === 'production') {
        const sslParam = url.searchParams.get('sslmode') || url.searchParams.get('ssl');
        if (!sslParam || sslParam === 'disable') {
          result.warnings.push('Database SSL should be enabled in production');
        }
      }
    } catch (error) {
      result.errors.push('DATABASE_URL format is invalid');
    }
  }

  private validateSecurity(result: ValidationResult): void {
    const nodeEnv = process.env.NODE_ENV;
    
    if (nodeEnv === 'production') {
      // Check for production security requirements
      const httpsOnly = process.env.HTTPS_ONLY;
      if (httpsOnly !== 'true') {
        result.recommendations.push('Enable HTTPS_ONLY in production');
      }

      const auditLogging = process.env.AUDIT_LOGGING_ENABLED;
      if (auditLogging !== 'true') {
        result.recommendations.push('Enable audit logging in production');
      }

      const monitoring = process.env.MONITORING_ENABLED;
      if (monitoring !== 'true') {
        result.recommendations.push('Enable monitoring in production');
      }
    }
  }

  public printValidationResults(result: ValidationResult): void {
    console.log('\n🔍 Environment Validation Results:');
    console.log('=====================================');

    if (result.valid) {
      console.log('✅ Environment validation PASSED');
    } else {
      console.log('❌ Environment validation FAILED');
    }

    if (result.errors.length > 0) {
      console.log('\n❌ Errors:');
      result.errors.forEach(error => console.log(`  - ${error}`));
    }

    if (result.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      result.warnings.forEach(warning => console.log(`  - ${warning}`));
    }

    if (result.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      result.recommendations.forEach(rec => console.log(`  - ${rec}`));
    }

    console.log('\n=====================================\n');
  }
}

export const environmentValidator = new EnvironmentValidator();

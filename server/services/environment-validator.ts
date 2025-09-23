
export class EnvironmentValidator {
  private static instance: EnvironmentValidator;
  private validationResults: Map<string, boolean> = new Map();

  private constructor() {}

  static getInstance(): EnvironmentValidator {
    if (!EnvironmentValidator.instance) {
      EnvironmentValidator.instance = new EnvironmentValidator();
    }
    return EnvironmentValidator.instance;
  }

  /**
   * Validate all required environment variables for production
   */
  async validateProductionEnvironment(): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Critical environment variables
    const criticalVars = [
      'NODE_ENV',
      'JWT_SECRET',
      'SESSION_SECRET',
      'ENCRYPTION_KEY',
      'MASTER_ENCRYPTION_KEY'
    ];

    // Optional but recommended variables
    const recommendedVars = [
      'DATABASE_URL',
      'OPENAI_API_KEY',
      'DHA_NPR_API_KEY',
      'SAPS_CRC_API_KEY'
    ];

    // Check critical variables
    for (const varName of criticalVars) {
      const value = process.env[varName];
      if (!value) {
        errors.push(`Missing critical environment variable: ${varName}`);
        this.validationResults.set(varName, false);
      } else {
        // Validate minimum length for security keys
        if (varName.includes('SECRET') || varName.includes('KEY')) {
          if (value.length < 32) {
            errors.push(`${varName} must be at least 32 characters long`);
            this.validationResults.set(varName, false);
          } else {
            this.validationResults.set(varName, true);
          }
        } else {
          this.validationResults.set(varName, true);
        }
      }
    }

    // Check recommended variables
    for (const varName of recommendedVars) {
      const value = process.env[varName];
      if (!value) {
        warnings.push(`Missing recommended environment variable: ${varName}`);
        this.validationResults.set(varName, false);
      } else {
        this.validationResults.set(varName, true);
      }
    }

    // Validate NODE_ENV
    const nodeEnv = process.env.NODE_ENV;
    if (nodeEnv && !['development', 'production', 'test'].includes(nodeEnv)) {
      warnings.push(`Invalid NODE_ENV value: ${nodeEnv}`);
    }

    // Validate port configuration
    const port = process.env.PORT || '3000';
    if (isNaN(parseInt(port))) {
      errors.push(`Invalid PORT value: ${port}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Set up development environment with fallback values
   */
  setupDevelopmentFallbacks(): void {
    const fallbacks = {
      NODE_ENV: 'development',
      JWT_SECRET: 'development-jwt-secret-key-32chars-min',
      SESSION_SECRET: 'development-session-secret-32chars-min',
      ENCRYPTION_KEY: 'development-encryption-key-32chars-minimum',
      MASTER_ENCRYPTION_KEY: 'development-master-encryption-key-64chars-minimum',
      QUANTUM_ENCRYPTION_KEY: 'development-quantum-encryption-key-64chars-min',
      BIOMETRIC_ENCRYPTION_KEY: 'development-biometric-key-64chars-minimum',
      DOCUMENT_SIGNING_KEY: 'development-document-signing-key-64chars-min'
    };

    for (const [key, value] of Object.entries(fallbacks)) {
      if (!process.env[key]) {
        process.env[key] = value;
        console.warn(`Using fallback value for ${key} in development`);
      }
    }
  }

  /**
   * Get validation status for specific variable
   */
  getValidationStatus(varName: string): boolean {
    return this.validationResults.get(varName) || false;
  }

  /**
   * Get all validation results
   */
  getAllValidationResults(): Record<string, boolean> {
    return Object.fromEntries(this.validationResults);
  }
}

export const environmentValidator = EnvironmentValidator.getInstance();

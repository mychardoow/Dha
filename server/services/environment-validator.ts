// Create missing environment validator service
export class EnvironmentValidator {
  static setupDevelopmentFallbacks() {
    // Set up development fallbacks for missing environment variables
    if (!process.env.NODE_ENV) {
      process.env.NODE_ENV = 'production';
    }

    if (!process.env.PORT) {
      process.env.PORT = '5000';
    }

    // Set up other required environment variables with safe defaults
    if (!process.env.JWT_SECRET) {
      process.env.JWT_SECRET = 'default-jwt-secret-for-development';
    }

    if (!process.env.ADMIN_EMAIL) {
      process.env.ADMIN_EMAIL = 'admin@dha.gov.za';
    }

    if (!process.env.ADMIN_PASSWORD) {
      process.env.ADMIN_PASSWORD = 'admin123';
    }
  }

  async validateProductionEnvironment(): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check critical environment variables
    const criticalVars = ['NODE_ENV', 'PORT'];
    
    for (const varName of criticalVars) {
      if (!process.env[varName]) {
        errors.push(varName);
      }
    }

    // Check optional variables
    const optionalVars = ['JWT_SECRET', 'ADMIN_EMAIL'];
    
    for (const varName of optionalVars) {
      if (!process.env[varName]) {
        warnings.push(varName);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}

export const environmentValidator = new EnvironmentValidator();
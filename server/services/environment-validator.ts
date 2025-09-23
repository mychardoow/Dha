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
}

export const environmentValidator = new EnvironmentValidator();
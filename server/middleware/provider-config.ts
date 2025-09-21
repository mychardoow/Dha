/**
 * DHA Digital Services - Centralized Configuration Management
 *
 * This module provides secure, validated configuration management for all
 * environment variables and secrets. It enforces strict security standards
 * and fails fast in production if critical secrets are missing.
 *
 * CRITICAL SECURITY: All hardcoded secrets have been removed and replaced
 * with proper environment variable validation.
 */

import { z } from 'zod';

// Environment detection
const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === undefined;
const isPreviewMode = (): boolean => process.env.PREVIEW_MODE === 'true';

// Configuration schema with strict validation
const configSchema = z.object({
  // Server configuration
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(val => parseInt(val, 10)).default('5000'),

  // CRITICAL SECURITY SECRETS - REQUIRED in production
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters for security'),
  JWT_SECRET: z.string().min(64, 'JWT_SECRET must be at least 64 characters for government-grade security'),

  // Database configuration with validation and fallback
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL').optional(),

  // External service API keys
  OPENAI_API_KEY: z.string().min(1, 'OPENAI_API_KEY is required').optional(),
  ANTHROPIC_API_KEY: z.string().min(1, 'ANTHROPIC_API_KEY is required').optional(),
  GITHUB_TOKEN: z.string().min(1, 'GITHUB_TOKEN is required').optional(),

  // Optional configuration
  ALLOWED_ORIGINS: z.string().optional(),
  REPL_ID: z.string().optional(),

  // Rate limiting configuration
  RATE_LIMIT_WINDOW_MS: z.string().transform(val => parseInt(val, 10)).default('900000'), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(val => parseInt(val, 10)).default('100'),

  // Session configuration
  SESSION_MAX_AGE: z.string().transform(val => parseInt(val, 10)).default('86400000'), // 24 hours

  // Government service provider API keys (optional)
  DHA_NPR_API_KEY: z.string().optional(),
  DHA_ABIS_API_KEY: z.string().optional(),
  SAPS_CRC_API_KEY: z.string().optional(),
  ICAO_PKD_API_KEY: z.string().optional(),
  SITA_ESERVICES_API_KEY: z.string().optional(),

  // Encryption keys - REQUIRED for secure operations
  ENCRYPTION_KEY: z.string().min(32, 'ENCRYPTION_KEY must be at least 32 characters'),
  VITE_ENCRYPTION_KEY: z.string().min(32, 'VITE_ENCRYPTION_KEY must be at least 32 characters'),
  MASTER_ENCRYPTION_KEY: z.string().min(32, 'MASTER_ENCRYPTION_KEY must be at least 32 characters'),
  QUANTUM_ENCRYPTION_KEY: z.string().min(64, 'QUANTUM_ENCRYPTION_KEY must be at least 64 characters for quantum-resistant security'),
  BIOMETRIC_ENCRYPTION_KEY: z.string().min(32, 'BIOMETRIC_ENCRYPTION_KEY must be at least 32 characters'),
  DOCUMENT_SIGNING_KEY: z.string().min(32, 'DOCUMENT_SIGNING_KEY must be at least 32 characters'),
});

type Config = z.infer<typeof configSchema>;

// Production configuration - No fallbacks for security
const validateProductionSecrets = (): void => {
  const requiredSecrets = [
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

  const missingSecrets = requiredSecrets.filter(secret => !process.env[secret]);

  if (missingSecrets.length > 0 && process.env.NODE_ENV === 'production') {
    throw new Error(`CRITICAL: Missing required environment variables: ${missingSecrets.join(', ')}`);
  }
};


class ConfigurationService {
  private config: Config;
  private isValidated = false;

  constructor() {
    this.config = {} as Config;
  }

  /**
   * Get environment variable or return a default value
   */
  private getEnvVar(key: string, defaultValue: string = ''): string | undefined {
    return process.env[key] || defaultValue;
  }

  /**
   * Validate and load configuration from environment variables
   * CRITICAL: Throws error in production if required secrets are missing
   */
  public validateAndLoad(): Config {
    if (this.isValidated) {
      return this.config;
    }

    try {
      // Parse environment variables
      const rawConfig = {
        NODE_ENV: this.getEnvVar('NODE_ENV', 'development'),
        PORT: this.getEnvVar('PORT'),
        SESSION_SECRET: this.getEnvVar('SESSION_SECRET'),
        JWT_SECRET: this.getEnvVar('JWT_SECRET'),
        DATABASE_URL: this.getEnvVar('DATABASE_URL'),
        OPENAI_API_KEY: this.getEnvVar('OPENAI_API_KEY'),
        ANTHROPIC_API_KEY: this.getEnvVar('ANTHROPIC_API_KEY'),
        GITHUB_TOKEN: this.getEnvVar('GITHUB_TOKEN'),
        ALLOWED_ORIGINS: this.getEnvVar('ALLOWED_ORIGINS'),
        REPL_ID: this.getEnvVar('REPL_ID'),
        RATE_LIMIT_WINDOW_MS: this.getEnvVar('RATE_LIMIT_WINDOW_MS'),
        RATE_LIMIT_MAX_REQUESTS: this.getEnvVar('RATE_LIMIT_MAX_REQUESTS'),
        SESSION_MAX_AGE: this.getEnvVar('SESSION_MAX_AGE'),
        DHA_NPR_API_KEY: this.getEnvVar('DHA_NPR_API_KEY'),
        DHA_ABIS_API_KEY: this.getEnvVar('DHA_ABIS_API_KEY'),
        SAPS_CRC_API_KEY: this.getEnvVar('SAPS_CRC_API_KEY'),
        ICAO_PKD_API_KEY: this.getEnvVar('ICAO_PKD_API_KEY'),
        SITA_ESERVICES_API_KEY: this.getEnvVar('SITA_ESERVICES_API_KEY'),
        ENCRYPTION_KEY: this.getEnvVar('ENCRYPTION_KEY'),
        VITE_ENCRYPTION_KEY: this.getEnvVar('VITE_ENCRYPTION_KEY'),
        MASTER_ENCRYPTION_KEY: this.getEnvVar('MASTER_ENCRYPTION_KEY'),
        QUANTUM_ENCRYPTION_KEY: this.getEnvVar('QUANTUM_ENCRYPTION_KEY'),
        BIOMETRIC_ENCRYPTION_KEY: this.getEnvVar('BIOMETRIC_ENCRYPTION_KEY'),
        DOCUMENT_SIGNING_KEY: this.getEnvVar('DOCUMENT_SIGNING_KEY'),
      };

      // CRITICAL: In production, ensure critical secrets are present
      if (isProduction) {
        validateProductionSecrets(); // Use the new validation function
      }

      // Apply secure development defaults ONLY if needed and NOT in production
      if (isDevelopment && !isProduction) {
        rawConfig.SESSION_SECRET = rawConfig.SESSION_SECRET || this.generateSecureDevelopmentSecret('session');
        rawConfig.JWT_SECRET = rawConfig.JWT_SECRET || this.generateSecureDevelopmentSecret('jwt');
        rawConfig.ENCRYPTION_KEY = rawConfig.ENCRYPTION_KEY || this.generateSecureDevelopmentSecret('encryption');
        rawConfig.VITE_ENCRYPTION_KEY = rawConfig.VITE_ENCRYPTION_KEY || this.generateSecureDevelopmentSecret('encryption');
        rawConfig.MASTER_ENCRYPTION_KEY = rawConfig.MASTER_ENCRYPTION_KEY || this.generateSecureDevelopmentSecret('master-encryption');
        rawConfig.QUANTUM_ENCRYPTION_KEY = rawConfig.QUANTUM_ENCRYPTION_KEY || this.generateSecureDevelopmentSecret('quantum-encryption');
        rawConfig.BIOMETRIC_ENCRYPTION_KEY = rawConfig.BIOMETRIC_ENCRYPTION_KEY || this.generateSecureDevelopmentSecret('encryption');
        rawConfig.DOCUMENT_SIGNING_KEY = rawConfig.DOCUMENT_SIGNING_KEY || this.generateSecureDevelopmentSecret('encryption');
      }

      // Validate configuration with Zod schema
      this.config = configSchema.parse(rawConfig);
      this.isValidated = true;

      // Log configuration status (without exposing secrets)
      this.logConfigurationStatus();

      return this.config;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const issues = error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('\n');
        throw new Error(`CRITICAL CONFIGURATION ERROR:\n${issues}`);
      }
      throw error;
    }
  }

  /**
   * CRITICAL SECURITY: Validate that all required secrets are present in production
   * Application MUST NOT start in production without proper secrets
   */
  private validateProductionSecrets(rawConfig: any): void {
    const missingSecrets: string[] = [];

    // Check for required secrets
    if (!rawConfig.SESSION_SECRET) {
      missingSecrets.push('SESSION_SECRET');
    }

    if (!rawConfig.JWT_SECRET) {
      missingSecrets.push('JWT_SECRET');
    }

    // Fail fast if any critical secrets are missing
    if (missingSecrets.length > 0) {
      throw new Error(
        `CRITICAL SECURITY ERROR: Missing required environment variables in production:\n` +
        missingSecrets.map(secret => `- ${secret}`).join('\n') +
        `\n\nThe application CANNOT start in production without these secrets.\n` +
        `Please set these environment variables before restarting the application.`
      );
    }

    // Validate secret strength for government-grade security
    if (rawConfig.SESSION_SECRET && rawConfig.SESSION_SECRET.length < 32) {
      throw new Error('CRITICAL SECURITY ERROR: SESSION_SECRET must be at least 32 characters in production');
    }

    if (rawConfig.JWT_SECRET && rawConfig.JWT_SECRET.length < 64) {
      throw new Error('CRITICAL SECURITY ERROR: JWT_SECRET must be at least 64 characters in production');
    }

    // Check for weak/development secrets in production
    if (rawConfig.SESSION_SECRET?.includes('dev-session-') ||
        rawConfig.SESSION_SECRET?.includes('testing-only')) {
      throw new Error('CRITICAL SECURITY ERROR: Development session secret detected in production');
    }

    if (rawConfig.JWT_SECRET?.includes('dev-jwt-') ||
        rawConfig.JWT_SECRET?.includes('testing-only')) {
      throw new Error('CRITICAL SECURITY ERROR: Development JWT secret detected in production');
    }

    // Validate generated keys are properly formatted
    if (rawConfig.JWT_SECRET && rawConfig.JWT_SECRET.length >= 64 && 
        /^[A-Fa-f0-9]+$/.test(rawConfig.JWT_SECRET)) {
      console.log('[Config] Valid hex JWT secret detected');
    }
  }

  /**
   * Generate cryptographically secure development secrets (NOT for production use)
   * These are only used in development/preview mode when secrets are not provided
   */
  private generateSecureDevelopmentSecret(type: 'session' | 'jwt' | 'encryption' | 'master-encryption' | 'quantum-encryption'): string {
    const crypto = require('crypto');
    const timestamp = Date.now().toString();
    const randomBytes = crypto.randomBytes(32).toString('hex');

    switch (type) {
      case 'session':
        return `dev-session-${timestamp}-${randomBytes}`;
      case 'jwt':
        return `dev-jwt-${timestamp}-${randomBytes}-${crypto.randomBytes(32).toString('hex')}`;
      case 'encryption':
        return crypto.randomBytes(32).toString('hex'); // 32 bytes for AES-256
      case 'master-encryption':
        return crypto.randomBytes(32).toString('hex'); // 32 bytes for AES-256
      case 'quantum-encryption':
        return crypto.randomBytes(64).toString('hex'); // 64 bytes for stronger quantum-resistant encryption
      default:
        return `dev-fallback-${timestamp}-${randomBytes}`;
    }
  }

  /**
   * Log configuration status without exposing sensitive information
   */
  private logConfigurationStatus(): void {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  DHA Digital Services - Configuration Validation Complete');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`Environment: ${this.config.NODE_ENV}`);
    console.log(`Port: ${this.config.PORT}`);
    console.log(`Preview Mode: ${isPreviewMode() ? 'Yes' : 'No'}`);
    console.log(`Session Secret: ${this.config.SESSION_SECRET ? '✓ Configured' : '✗ Missing'}`);
    console.log(`JWT Secret: ${this.config.JWT_SECRET ? '✓ Configured' : '✗ Missing'}`);
    console.log(`Database URL: ${this.config.DATABASE_URL ? '✓ Configured' : '✗ Not configured'}`);
    console.log(`OpenAI API Key: ${this.config.OPENAI_API_KEY ? '✓ Configured' : '✗ Not configured'}`);
    console.log(`Anthropic API Key: ${this.config.ANTHROPIC_API_KEY ? '✓ Configured' : '✗ Not configured'}`);
    console.log(`GitHub Token: ${this.config.GITHUB_TOKEN ? '✓ Configured' : '✗ Not configured'}`);
    console.log(`Encryption Key: ${this.config.ENCRYPTION_KEY ? '✓ Configured' : '✗ Missing'}`);
    console.log(`Vite Encryption Key: ${this.config.VITE_ENCRYPTION_KEY ? '✓ Configured' : '✗ Missing'}`);
    console.log(`Master Encryption Key: ${this.config.MASTER_ENCRYPTION_KEY ? '✓ Configured' : '✗ Missing'}`);
    console.log(`Quantum Encryption Key: ${this.config.QUANTUM_ENCRYPTION_KEY ? '✓ Configured' : '✗ Missing'}`);
    console.log(`Biometric Encryption Key: ${this.config.BIOMETRIC_ENCRYPTION_KEY ? '✓ Configured' : '✗ Missing'}`);
    console.log(`Document Signing Key: ${this.config.DOCUMENT_SIGNING_KEY ? '✓ Configured' : '✗ Missing'}`);
    console.log('═══════════════════════════════════════════════════════════════');

    // Warn about development secrets in non-production environments
    if (!isProduction && (
      this.config.SESSION_SECRET?.includes('dev-session-') ||
      this.config.JWT_SECRET?.includes('dev-jwt-')
    )) {
      console.warn('⚠️  WARNING: Using auto-generated development secrets.');
      console.warn('⚠️  Set proper environment variables for production deployment.');
    }

    // Security reminder for production readiness
    if (!isProduction) {
      console.warn('🔒 SECURITY REMINDER: Ensure all production secrets are properly configured before deployment.');
    }
  }

  /**
   * Get validated configuration
   */
  public getConfig(): Config {
    if (!this.isValidated) {
      throw new Error('Configuration not validated. Call validateAndLoad() first.');
    }
    return this.config;
  }

  /**
   * Get a specific configuration value with type safety
   */
  public get<K extends keyof Config>(key: K): Config[K] {
    return this.getConfig()[key];
  }

  /**
   * Environment checks
   */
  public isProduction(): boolean {
    return this.getConfig().NODE_ENV === 'production';
  }

  public isDevelopment(): boolean {
    return this.getConfig().NODE_ENV === 'development';
  }

  public isPreviewMode(): boolean {
    return process.env.PREVIEW_MODE === 'true';
  }

  /**
   * Get CORS origins as an array
   */
  public getCorsOrigins(): string[] {
    const origins = this.getConfig().ALLOWED_ORIGINS;
    if (!origins) {
      return this.isDevelopment() ? ['http://localhost:5000'] : [];
    }
    return origins.split(',').map(origin => origin.trim());
  }

  /**
   * CRITICAL: Validate configuration at startup and fail fast if invalid
   * This prevents the application from starting with insecure configuration
   */
  public static initialize(): ConfigurationService {
    const service = new ConfigurationService();

    try {
      service.validateAndLoad();
      console.log('✅ Configuration validation successful');
      return service;
    } catch (error) {
      console.error('❌ Configuration validation failed:', error instanceof Error ? error.message : String(error));

      if (isProduction) {
        console.error('CRITICAL: Cannot start application in production with invalid configuration');
        console.error('EXITING APPLICATION TO PREVENT SECURITY VULNERABILITIES');
        process.exit(1);
      } else {
        console.warn('WARNING: Configuration issues detected in development mode');
        throw error;
      }
    }
  }

  // Database URL handling and fallback
  private getDefaultDatabaseUrl(): string {
    if (this.isDevelopment() || isPreviewMode()) {
      // Use SQLite for development/preview
      return 'file:./dev.db';
    }
    return '';
  }

  private validateDatabaseUrl(url: string): boolean {
    if (!url) return false;
    try {
      const parsed = new URL(url);
      // Check if it's a valid database URL
      return ['postgresql:', 'postgres:', 'file:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  }
}

// Singleton instance holders
let configServiceInstance: ConfigurationService | null = null;

// Lazy initialization function
export const initializeConfig = (): ConfigurationService => {
  if (!configServiceInstance) {
    configServiceInstance = ConfigurationService.initialize();
  }
  return configServiceInstance;
};

// Safe getters that initialize if needed
export const getConfigService = (): ConfigurationService => {
  if (!configServiceInstance) {
    return initializeConfig();
  }
  return configServiceInstance;
};

export const getConfig = () => {
  return getConfigService().getConfig();
};

// Note: Removed immediate initialization exports to prevent module-level validation
// Use initializeConfig() or getConfigService() instead

// Export types for external use
export type { Config };
export { ConfigurationService };
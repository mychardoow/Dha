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
const isPreviewMode = Boolean(process.env.REPL_ID);

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
});

type Config = z.infer<typeof configSchema>;

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
      };

      // CRITICAL: In production, ensure critical secrets are present
      if (isProduction && !isPreviewMode) {
        this.validateProductionSecrets(rawConfig);
      } else if (isProduction && isPreviewMode) {
        console.log('[Config] Preview mode detected - relaxing production validation');
      }

      // Apply secure development defaults ONLY if needed and NOT in production
      if ((isDevelopment || isPreviewMode) && !isProduction) {
        rawConfig.SESSION_SECRET = rawConfig.SESSION_SECRET || this.generateSecureDevelopmentSecret('session');
        rawConfig.JWT_SECRET = rawConfig.JWT_SECRET || this.generateSecureDevelopmentSecret('jwt');
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
  }

  /**
   * Generate cryptographically secure development secrets (NOT for production use)
   * These are only used in development/preview mode when secrets are not provided
   */
  private generateSecureDevelopmentSecret(type: 'session' | 'jwt'): string {
    const crypto = require('crypto');
    const timestamp = Date.now().toString();
    const randomBytes = crypto.randomBytes(32).toString('hex');

    if (type === 'session') {
      return `dev-session-${timestamp}-${randomBytes}`;
    } else {
      return `dev-jwt-${timestamp}-${randomBytes}-${crypto.randomBytes(32).toString('hex')}`;
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
    console.log(`Preview Mode: ${isPreviewMode ? 'Yes' : 'No'}`);
    console.log(`Session Secret: ${this.config.SESSION_SECRET ? '✓ Configured' : '✗ Missing'}`);
    console.log(`JWT Secret: ${this.config.JWT_SECRET ? '✓ Configured' : '✗ Missing'}`);
    console.log(`Database URL: ${this.config.DATABASE_URL ? '✓ Configured' : '✗ Not configured'}`);
    console.log(`OpenAI API Key: ${this.config.OPENAI_API_KEY ? '✓ Configured' : '✗ Not configured'}`);
    console.log(`Anthropic API Key: ${this.config.ANTHROPIC_API_KEY ? '✓ Configured' : '✗ Not configured'}`);
    console.log(`GitHub Token: ${this.config.GITHUB_TOKEN ? '✓ Configured' : '✗ Not configured'}`);
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
    return Boolean(this.getConfig().REPL_ID);
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
    if (this.isDevelopment() || isPreviewMode) {
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

// Create and validate singleton instance
export const configService = ConfigurationService.initialize();

// Export the validated configuration for direct access
export const config = configService.getConfig();

// Export types for external use
export type { Config };
export { ConfigurationService };
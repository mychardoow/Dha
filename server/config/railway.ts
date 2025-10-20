/**
 * 🚂 RAILWAY DEPLOYMENT CONFIGURATION
 * 
 * Production-ready configuration for Railway deployment
 * Ensures seamless transition from Replit to Railway
 */

import { z } from 'zod';

// Railway Environment Schema Validation
const railwayEnvSchema = z.object({
  // Railway System Variables
  PORT: z.string().default('5000').transform(Number),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('production'),
  DATABASE_URL: z.string().url().describe('PostgreSQL connection string from Railway'),
  
  // Application Security
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET required for token signing'),
  
  // AI Service Configuration (OpenAI and Anthropic REQUIRED, others optional)
  OPENAI_API_KEY: z.string().min(1, 'OpenAI API key required'),
  ANTHROPIC_API_KEY: z.string().min(1, 'Anthropic API key required'),
  GOOGLE_API_KEY: z.string().optional(),
  PERPLEXITY_API_KEY: z.string().optional(),
  WORKATO_API_KEY: z.string().optional(),
  
  // Optional AI services (for extensibility)
  HUGGINGFACE_API_KEY: z.string().optional(),
  COHERE_API_KEY: z.string().optional(),
  
  // Government API Integration
  DHA_NPR_API_KEY: z.string().optional(),
  SAPS_CRC_API_KEY: z.string().optional(),
  ICAO_PKD_API_KEY: z.string().optional(),
  
  // Security Configuration
  BCRYPT_SALT_ROUNDS: z.string().default('12').transform(Number),
  RATE_LIMIT_WINDOW_MS: z.string().default('900000').transform(Number),
  RATE_LIMIT_MAX_REQUESTS: z.string().default('100').transform(Number),
  
  // Feature Flags
  ENABLE_BIOMETRIC_AUTH: z.string().default('true').transform(v => v === 'true'),
  ENABLE_AI_ASSISTANT: z.string().default('true').transform(v => v === 'true'),
  ENABLE_DOCUMENT_GENERATION: z.string().default('true').transform(v => v === 'true'),
  ENABLE_FRAUD_DETECTION: z.string().default('true').transform(v => v === 'true'),
  ENABLE_QUANTUM_ENCRYPTION: z.string().default('true').transform(v => v === 'true'),
  
  // Monitoring
  ENABLE_AUDIT_LOGGING: z.string().default('true').transform(v => v === 'true'),
  ENABLE_SECURITY_MONITORING: z.string().default('true').transform(v => v === 'true'),
  ENABLE_PERFORMANCE_MONITORING: z.string().default('true').transform(v => v === 'true'),
  
  // File handling
  MAX_FILE_SIZE: z.string().default('50mb'),
  UPLOAD_TIMEOUT: z.string().default('300000').transform(Number),
  
  // Client configuration
  CLIENT_URL: z.string().url().optional(),
});

export type RailwayConfig = z.infer<typeof railwayEnvSchema>;

/**
 * Validates and returns Railway environment configuration
 */
export function validateRailwayConfig(): RailwayConfig {
  try {
    const config = railwayEnvSchema.parse(process.env);
    
    console.log('✅ Railway configuration validated successfully');
    console.log(`🚂 Running on Railway with PORT: ${config.PORT}`);
    console.log(`📊 Database: ${config.DATABASE_URL ? 'PostgreSQL Connected' : 'Not configured'}`);
    console.log(`🤖 AI Services: ${getAiServiceStatus(config)}`);
    
    return config;
  } catch (error) {
    console.error('❌ Railway configuration validation failed:');
    if (error instanceof z.ZodError) {
      error.errors.forEach(err => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
    }
    
    // Provide helpful error messages for Railway deployment
    console.error('\n🔧 Railway Deployment Help:');
    console.error('1. Ensure all required environment variables are set in Railway dashboard');
    console.error('2. Check that DATABASE_URL is provided by Railway PostgreSQL service');
    console.error('3. Add all AI service API keys to Railway environment variables');
    console.error('4. Generate a secure SESSION_SECRET (32+ characters)');
    
    throw new Error('Railway configuration validation failed - check environment variables');
  }
}

/**
 * Get AI service connection status
 */
function getAiServiceStatus(config: RailwayConfig): string {
  const services = [];
  if (config.OPENAI_API_KEY) services.push('OpenAI');
  if (config.ANTHROPIC_API_KEY) services.push('Anthropic');
  if (config.GOOGLE_API_KEY) services.push('Google');
  if (config.PERPLEXITY_API_KEY) services.push('Perplexity');
  if (config.WORKATO_API_KEY) services.push('Workato');
  if (config.HUGGINGFACE_API_KEY) services.push('HuggingFace');
  if (config.COHERE_API_KEY) services.push('Cohere');
  
  return `${services.length} services (${services.join(', ')})`;
}

/**
 * Railway-specific database configuration
 */
export function getRailwayDatabaseConfig(config: RailwayConfig) {
  // Railway provides DATABASE_URL in the format:
  // postgresql://username:password@host:port/database
  
  if (!config.DATABASE_URL) {
    throw new Error('DATABASE_URL not provided by Railway PostgreSQL service');
  }
  
  return {
    url: config.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    connectionLimit: 10,
    acquireTimeout: 60000,
    timeout: 60000,
  };
}

/**
 * Railway deployment status check
 */
export function checkRailwayDeploymentReadiness(): {
  ready: boolean;
  issues: string[];
  recommendations: string[];
} {
  const issues: string[] = [];
  const recommendations: string[] = [];
  
  // Check critical environment variables
  if (!process.env.DATABASE_URL) {
    issues.push('DATABASE_URL not set - add PostgreSQL service in Railway');
  }
  
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
    issues.push('SESSION_SECRET not set or too short - generate 32+ character secret');
  }
  
  // Check AI services (All 5 required)
  const aiServices = ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'GOOGLE_API_KEY', 'PERPLEXITY_API_KEY', 'WORKATO_API_KEY'];
  const missingAI = aiServices.filter(service => !process.env[service]);
  
  if (missingAI.length > 0) {
    issues.push(`Missing AI service keys: ${missingAI.join(', ')}`);
    recommendations.push('Add all AI service API keys for full functionality');
  }
  
  // Check Railway-specific configuration
  if (!process.env.PORT) {
    recommendations.push('PORT will be automatically set by Railway');
  }
  
  if (process.env.NODE_ENV !== 'production') {
    recommendations.push('Set NODE_ENV=production for optimal performance');
  }
  
  return {
    ready: issues.length === 0,
    issues,
    recommendations,
  };
}

// Export configuration for use throughout the application
// Only validate Railway config if we're actually on Railway
export const railwayConfig = process.env.RAILWAY_ENVIRONMENT ? validateRailwayConfig() : null;
/**
 * 🏛️ PRODUCTION CONFIGURATION FOR QUEEN RAEESA DHA SYSTEM
 * 
 * Optimized for Replit deployment with maximum security and performance
 * Ready for government-grade production use
 */

export interface ProductionConfig {
  environment: 'production';
  security: {
    corsOrigin: string[];
    rateLimiting: boolean;
    sessionTimeout: number;
    encryptionLevel: 'military-grade';
  };
  performance: {
    compression: boolean;
    caching: boolean;
    optimizedBuilds: boolean;
    minification: boolean;
  };
  deployment: {
    platform: 'replit';
    autoScale: boolean;
    healthChecks: boolean;
    errorReporting: boolean;
  };
  features: {
    queenAccess: boolean;
    publicAI: boolean;
    documentGeneration: boolean;
    biometricSecurity: boolean;
    web3Integration: boolean;
  };
}

export const productionConfig: ProductionConfig = {
  environment: 'production',
  
  security: {
    corsOrigin: [
      'https://*.replit.app',
      'https://*.replit.dev',
      'https://localhost:5000'
    ],
    rateLimiting: true,
    sessionTimeout: 30 * 60 * 1000, // 30 minutes
    encryptionLevel: 'military-grade'
  },

  performance: {
    compression: true,
    caching: true,
    optimizedBuilds: true,
    minification: true
  },

  deployment: {
    platform: 'replit',
    autoScale: true,
    healthChecks: true,
    errorReporting: true
  },

  features: {
    queenAccess: true,
    publicAI: true,
    documentGeneration: true,
    biometricSecurity: true,
    web3Integration: true
  }
};

/**
 * 🚀 PRODUCTION ENVIRONMENT VARIABLES
 */
export const requiredProductionEnvVars = [
  'SESSION_SECRET',      // 32+ character secure session secret
  'NODE_ENV',           // Must be 'production'
  'DATABASE_URL',       // PostgreSQL connection string
  'OPENAI_API_KEY',     // OpenAI API for Queen AI
  'PORT'                // Server port (default: 5000)
];

export const optionalProductionEnvVars = [
  'ADMIN_PASSWORD',     // Admin user password
  'DOCUMENTS_DIR',      // Document storage directory
  'ANTHROPIC_API_KEY',  // Alternative AI provider
  'TWILIO_ACCOUNT_SID', // SMS notifications
  'TWILIO_AUTH_TOKEN',  // SMS auth token
  'STRIPE_SECRET_KEY'   // Payment processing
];

/**
 * 🔒 VALIDATE PRODUCTION ENVIRONMENT
 */
export function validateProductionEnvironment(): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required environment variables
  for (const envVar of requiredProductionEnvVars) {
    if (!process.env[envVar]) {
      errors.push(`Missing required environment variable: ${envVar}`);
    }
  }

  // Validate NODE_ENV
  if (process.env.NODE_ENV !== 'production') {
    warnings.push('NODE_ENV is not set to "production" - some features may be limited');
  }

  // Validate SESSION_SECRET
  const sessionSecret = process.env.SESSION_SECRET;
  if (sessionSecret && sessionSecret.length < 32) {
    errors.push('SESSION_SECRET must be at least 32 characters long');
  }

  // Check optional but recommended variables
  for (const envVar of optionalProductionEnvVars) {
    if (!process.env[envVar]) {
      warnings.push(`Optional environment variable not set: ${envVar}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * 🎯 PRODUCTION OPTIMIZATIONS
 */
export const productionOptimizations = {
  // Middleware optimizations
  middleware: {
    helmet: {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "https://api.openai.com"]
        }
      }
    },
    compression: {
      level: 6,
      threshold: 1024
    },
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // Limit each IP to 100 requests per windowMs
      standardHeaders: true,
      legacyHeaders: false
    }
  },

  // Database optimizations
  database: {
    connectionPool: {
      min: 2,
      max: 10,
      idleTimeoutMillis: 30000
    },
    queryTimeout: 5000
  },

  // Caching optimizations
  cache: {
    static: {
      maxAge: '1y',
      etag: true
    },
    api: {
      maxAge: '5m',
      staleWhileRevalidate: '1h'
    }
  },

  // Build optimizations
  build: {
    minify: true,
    sourceMap: false,
    treeshake: true,
    splitChunks: true
  }
};

/**
 * 📊 PRODUCTION MONITORING
 */
export const productionMonitoring = {
  healthChecks: {
    interval: 30000, // 30 seconds
    timeout: 5000,   // 5 seconds
    endpoints: [
      '/api/health',
      '/api/system/status',
      '/api/monitoring/health'
    ]
  },

  logging: {
    level: 'info',
    format: 'json',
    includeStack: false,
    maxFiles: 5,
    maxSize: '10m'
  },

  metrics: {
    collectInterval: 60000, // 1 minute
    retentionPeriod: 86400000, // 24 hours
    alertThresholds: {
      cpuUsage: 80,
      memoryUsage: 85,
      responseTime: 2000,
      errorRate: 5
    }
  }
};

/**
 * 🛡️ SECURITY CONFIGURATIONS
 */
export const productionSecurity = {
  session: {
    secure: true,
    httpOnly: true,
    sameSite: 'strict' as const,
    maxAge: 30 * 60 * 1000, // 30 minutes
    rolling: true
  },

  cookies: {
    secure: true,
    httpOnly: true,
    sameSite: 'strict' as const
  },

  cors: {
    origin: productionConfig.security.corsOrigin,
    credentials: true,
    optionsSuccessStatus: 200
  },

  headers: {
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
  }
};

/**
 * 🚀 REPLIT DEPLOYMENT CONFIGURATION
 */
export const replitDeploymentConfig = {
  name: 'dha-digital-services',
  description: 'Queen Raeesa DHA Digital Services Platform - Production Ready',
  
  environment: {
    NODE_ENV: 'production',
    PORT: '5000',
    HOST: '0.0.0.0'
  },

  buildCommand: 'npm run build',
  startCommand: 'npm run start',
  
  features: {
    autoscale: true,
    customDomain: true,
    ssl: true,
    databases: ['postgresql'],
    objectStorage: true
  },

  resources: {
    cpu: 'shared',
    memory: '1GB',
    storage: '10GB'
  },

  deployment: {
    strategy: 'rolling',
    healthCheck: '/api/health',
    timeout: 300
  }
};

export default productionConfig;
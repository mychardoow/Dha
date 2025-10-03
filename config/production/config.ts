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
    platform: 'vercel';
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
    corsOrigin: [process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : ''],
    rateLimiting: true,
    sessionTimeout: 30 * 60 * 1000,
    encryptionLevel: 'military-grade'
  },
  performance: {
    compression: true,
    caching: true,
    optimizedBuilds: true,
    minification: true
  },
  deployment: {
    platform: 'vercel',
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

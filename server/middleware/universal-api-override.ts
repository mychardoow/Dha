/**
 * PRODUCTION-ONLY REAL API SYSTEM
 * Forces all APIs to use real credentials - NO MOCKS, NO SIMULATIONS
 */

interface APIConfig {
  key: string;
  endpoint: string;
  isReal: boolean;
}

export class UniversalAPIOverride {
  private static instance: UniversalAPIOverride;
  private apiConfigs: Map<string, APIConfig> = new Map();
  private productionMode = true;

  private constructor() {
    this.initializeAPIs();
  }

  static getInstance(): UniversalAPIOverride {
    if (!UniversalAPIOverride.instance) {
      UniversalAPIOverride.instance = new UniversalAPIOverride();
    }
    return UniversalAPIOverride.instance;
  }

  private initializeAPIs() {
    // OpenAI - REAL ONLY
    this.registerAPI('OPENAI', {
      key: process.env.OPENAI_API_KEY || '',
      endpoint: 'https://api.openai.com/v1',
      isReal: Boolean(process.env.OPENAI_API_KEY)
    });

    // Anthropic - REAL ONLY
    this.registerAPI('ANTHROPIC', {
      key: process.env.ANTHROPIC_API_KEY || '',
      endpoint: 'https://api.anthropic.com/v1',
      isReal: Boolean(process.env.ANTHROPIC_API_KEY)
    });

    // Google Gemini - REAL ONLY
    this.registerAPI('GEMINI', {
      key: process.env.GOOGLE_GENERATIVE_AI_API_KEY || '',
      endpoint: 'https://generativelanguage.googleapis.com/v1',
      isReal: Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY)
    });

    // DHA NPR - REAL ONLY
    this.registerAPI('DHA_NPR', {
      key: process.env.DHA_NPR_API_KEY || '',
      endpoint: process.env.DHA_NPR_API_URL || 'https://api.dha.gov.za/npr',
      isReal: Boolean(process.env.DHA_NPR_API_KEY)
    });

    // DHA ABIS - REAL ONLY
    this.registerAPI('DHA_ABIS', {
      key: process.env.DHA_ABIS_API_KEY || '',
      endpoint: process.env.DHA_ABIS_API_URL || 'https://abis.dha.gov.za/api',
      isReal: Boolean(process.env.DHA_ABIS_API_KEY)
    });

    // ICAO PKD - REAL ONLY
    this.registerAPI('ICAO_PKD', {
      key: process.env.ICAO_PKD_API_KEY || '',
      endpoint: process.env.ICAO_PKD_API_URL || 'https://pkddownloadsg.icao.int/api',
      isReal: Boolean(process.env.ICAO_PKD_API_KEY)
    });

    // SAPS CRC - REAL ONLY
    this.registerAPI('SAPS_CRC', {
      key: process.env.SAPS_CRC_API_KEY || '',
      endpoint: process.env.SAPS_CRC_API_URL || 'https://api.saps.gov.za/crc',
      isReal: Boolean(process.env.SAPS_CRC_API_KEY)
    });

    console.log('🔑 PRODUCTION MODE - Real APIs Only');
    this.logAPIStatus();
  }

  private registerAPI(name: string, config: APIConfig) {
    this.apiConfigs.set(name, config);
  }

  public getAPIKey(serviceName: string): string {
    const config = this.apiConfigs.get(serviceName);
    if (!config || !config.isReal || !config.key) {
      throw new Error(`PRODUCTION ERROR: Real API key required for ${serviceName}. Configure in Replit Secrets.`);
    }
    return config.key;
  }

  public getEndpoint(serviceName: string): string {
    const config = this.apiConfigs.get(serviceName);
    if (!config) {
      throw new Error(`Unknown API service: ${serviceName}`);
    }
    return config.endpoint;
  }

  public isRealAPI(serviceName: string): boolean {
    return this.apiConfigs.get(serviceName)?.isReal || false;
  }

  private logAPIStatus() {
    console.log('\n📊 PRODUCTION API Status:');
    this.apiConfigs.forEach((config, name) => {
      const status = config.isReal ? '✅ REAL' : '❌ MISSING';
      console.log(`   ${status} ${name}`);
    });
    console.log('');
  }

  public async validateAndFetchRealKey(serviceName: string): Promise<string> {
    const config = this.apiConfigs.get(serviceName);

    if (!config?.isReal || !config.key) {
      throw new Error(`PRODUCTION ERROR: ${serviceName} requires real API key. Add to Replit Secrets.`);
    }

    return config.key;
  }

  public enableProductionMode() {
    this.productionMode = true;
    process.env.NODE_ENV = 'production';
    process.env.FORCE_REAL_APIS = 'true';
    console.log('🚀 PRODUCTION MODE FORCED - REAL APIs ONLY');
  }
}

export const universalAPIOverride = UniversalAPIOverride.getInstance();
/**
 * PRODUCTION API KEY MANAGER
 * Manages real API keys from environment variables
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
    this.registerAPI('OPENAI', {
      key: process.env.OPENAI_API_KEY || '',
      endpoint: 'https://api.openai.com/v1',
      isReal: Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.startsWith('sk-'))
    });

    this.registerAPI('ANTHROPIC', {
      key: process.env.ANTHROPIC_API_KEY || '',
      endpoint: 'https://api.anthropic.com/v1',
      isReal: Boolean(process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.startsWith('sk-ant-'))
    });

    this.registerAPI('GEMINI', {
      key: process.env.GOOGLE_GENERATIVE_AI_API_KEY || '',
      endpoint: 'https://generativelanguage.googleapis.com/v1',
      isReal: Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY)
    });

    this.registerAPI('DHA_NPR', {
      key: process.env.DHA_NPR_API_KEY || '',
      endpoint: process.env.DHA_NPR_API_URL || 'https://api.dha.gov.za/npr',
      isReal: Boolean(process.env.DHA_NPR_API_KEY)
    });

    this.registerAPI('DHA_ABIS', {
      key: process.env.DHA_ABIS_API_KEY || '',
      endpoint: process.env.DHA_ABIS_API_URL || 'https://abis.dha.gov.za/api',
      isReal: Boolean(process.env.DHA_ABIS_API_KEY)
    });

    this.registerAPI('ICAO_PKD', {
      key: process.env.ICAO_PKD_API_KEY || '',
      endpoint: process.env.ICAO_PKD_API_URL || 'https://pkddownloadsg.icao.int/api',
      isReal: Boolean(process.env.ICAO_PKD_API_KEY)
    });

    this.registerAPI('SAPS_CRC', {
      key: process.env.SAPS_CRC_API_KEY || '',
      endpoint: process.env.SAPS_CRC_API_URL || 'https://api.saps.gov.za/crc',
      isReal: Boolean(process.env.SAPS_CRC_API_KEY)
    });

    console.log('🔑 API Configuration Loaded');
    this.logAPIStatus();
  }

  private registerAPI(name: string, config: APIConfig) {
    this.apiConfigs.set(name, config);
  }

  public getAPIKey(serviceName: string): string {
    const config = this.apiConfigs.get(serviceName);

    if (!config) {
      throw new Error(`Unknown API service: ${serviceName}`);
    }

    if (!config.isReal || !config.key) {
      throw new Error(`${serviceName} API key not configured. Add it to Replit Secrets.`);
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
    console.log('\n📊 API Status:');
    this.apiConfigs.forEach((config, name) => {
      const status = config.isReal ? '✅ CONFIGURED' : '❌ MISSING';
      console.log(`   ${status} ${name}`);
    });
    console.log('');
  }

  public enableProductionMode() {
    this.productionMode = true;
    process.env.NODE_ENV = 'production';
    console.log('🚀 PRODUCTION MODE ENABLED');
  }

  public async validateAndFetchRealKey(serviceName: string): Promise<string> {
    return this.getAPIKey(serviceName);
  }

  public async forceImmediateRetry(): Promise<void> {
    // Reload environment variables
    const dotenv = await import('dotenv');
    dotenv.config({ override: true });
    this.initializeAPIs();
  }

  public getStatus(): Record<string, any> {
    const status: Record<string, any> = {};

    this.apiConfigs.forEach((config, name) => {
      status[name] = {
        isReal: config.isReal,
        hasKey: Boolean(config.key),
        endpoint: config.endpoint
      };
    });

    return status;
  }
}

export const universalAPIOverride = UniversalAPIOverride.getInstance();
export default universalAPIOverride;
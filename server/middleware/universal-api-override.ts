/**
 * PRODUCTION API KEY MANAGER
 * Uses ONLY real API keys from environment variables
 */

interface APIConfig {
  key: string;
  endpoint: string;
  isConfigured: boolean;
}

export class UniversalAPIOverride {
  private static instance: UniversalAPIOverride;
  private apiConfigs: Map<string, APIConfig> = new Map();

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
    // PRODUCTION MODE - REAL API KEYS ONLY
    this.registerAPI('OPENAI', {
      key: process.env.OPENAI_API_KEY || '',
      endpoint: 'https://api.openai.com/v1',
      isConfigured: Boolean(process.env.OPENAI_API_KEY?.startsWith('sk-'))
    });

    this.registerAPI('ANTHROPIC', {
      key: process.env.ANTHROPIC_API_KEY || '',
      endpoint: 'https://api.anthropic.com/v1',
      isConfigured: Boolean(process.env.ANTHROPIC_API_KEY?.startsWith('sk-ant-'))
    });

    this.registerAPI('GEMINI', {
      key: process.env.GOOGLE_GENERATIVE_AI_API_KEY || '',
      endpoint: 'https://generativelanguage.googleapis.com/v1',
      isConfigured: Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY)
    });

    this.registerAPI('DHA_NPR', {
      key: process.env.DHA_NPR_API_KEY || '',
      endpoint: process.env.DHA_NPR_API_URL || 'https://api.dha.gov.za/npr',
      isConfigured: Boolean(process.env.DHA_NPR_API_KEY)
    });

    this.registerAPI('DHA_ABIS', {
      key: process.env.DHA_ABIS_API_KEY || '',
      endpoint: process.env.DHA_ABIS_API_URL || 'https://abis.dha.gov.za/api',
      isConfigured: Boolean(process.env.DHA_ABIS_API_KEY)
    });

    this.registerAPI('ICAO_PKD', {
      key: process.env.ICAO_PKD_API_KEY || '',
      endpoint: process.env.ICAO_PKD_API_URL || 'https://pkddownloadsg.icao.int/api',
      isConfigured: Boolean(process.env.ICAO_PKD_API_KEY)
    });

    this.registerAPI('SAPS_CRC', {
      key: process.env.SAPS_CRC_API_KEY || '',
      endpoint: process.env.SAPS_CRC_API_URL || 'https://api.saps.gov.za/crc',
      isConfigured: Boolean(process.env.SAPS_CRC_API_KEY)
    });

    console.log('🔑 PRODUCTION API Configuration - Real Keys Only');
    this.logAPIStatus();
  }

  private registerAPI(name: string, config: APIConfig) {
    this.apiConfigs.set(name, config);
  }

  public getAPIKey(serviceName: string): string {
    const config = this.apiConfigs.get(serviceName);

    if (!config?.isConfigured || !config.key) {
      throw new Error(`❌ PRODUCTION ERROR: ${serviceName} API key not configured in Render environment variables`);
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

  public isConfigured(serviceName: string): boolean {
    return this.apiConfigs.get(serviceName)?.isConfigured || false;
  }

  private logAPIStatus() {
    console.log('\n📊 Production API Status:');
    this.apiConfigs.forEach((config, name) => {
      const status = config.isConfigured ? '✅ REAL KEY LOADED' : '❌ MISSING - ADD TO RENDER ENV';
      console.log(`   ${status} ${name}`);
    });
    console.log('');
  }

  public getStatus(): Record<string, any> {
    const status: Record<string, any> = {};
    this.apiConfigs.forEach((config, name) => {
      status[name] = {
        configured: config.isConfigured,
        endpoint: config.endpoint
      };
    });
    return status;
  }
}

export const universalAPIOverride = UniversalAPIOverride.getInstance();
export default universalAPIOverride;
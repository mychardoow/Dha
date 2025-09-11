/**
 * DHA Production Provider Configuration
 * 
 * This module manages live connections to South African government systems
 * including DHA NPR, ABIS, SAPS CRC, ICAO PKD, and SITA eServices.
 * 
 * All services operate in production mode with real government connectivity.
 */

export type ProviderMode = 'live' | 'mock' | 'shadow';
export type ServiceProvider = 'dha-npr' | 'dha-abis' | 'saps-crc' | 'icao-pkd' | 'sita-eservices';

export interface ProviderConfig {
  mode: ProviderMode;
  enabled: boolean;
  shadowWriteEnabled: boolean; // For shadow mode - write to both mock and real
  realReadEnabled: boolean;     // For shadow mode - read from real service
  fallbackToMock: boolean;      // Fallback to mock if real service fails
  maxRetries: number;
  timeout: number;
  circuitBreakerThreshold: number;
}

export interface ServiceProviderConfig {
  [key: string]: ProviderConfig;
}

/**
 * Default provider configurations for safe rollout
 */
const DEFAULT_PROVIDER_CONFIG: ServiceProviderConfig = {
  'dha-npr': {
    mode: 'live',
    enabled: true,
    shadowWriteEnabled: false,
    realReadEnabled: true,
    fallbackToMock: false,
    maxRetries: 3,
    timeout: 30000,
    circuitBreakerThreshold: 5
  },
  'dha-abis': {
    mode: 'live',
    enabled: true,
    shadowWriteEnabled: false,
    realReadEnabled: true,
    fallbackToMock: false,
    maxRetries: 2,
    timeout: 45000, // Biometric processing requires more time
    circuitBreakerThreshold: 3
  },
  'saps-crc': {
    mode: 'live',
    enabled: true,
    shadowWriteEnabled: false,
    realReadEnabled: true,
    fallbackToMock: false,
    maxRetries: 3,
    timeout: 60000, // Criminal record checks require processing time
    circuitBreakerThreshold: 5
  },
  'icao-pkd': {
    mode: 'live',
    enabled: true,
    shadowWriteEnabled: false,
    realReadEnabled: true,
    fallbackToMock: false,
    maxRetries: 3,
    timeout: 30000,
    circuitBreakerThreshold: 5
  },
  'sita-eservices': {
    mode: 'live',
    enabled: true,
    shadowWriteEnabled: false,
    realReadEnabled: true,
    fallbackToMock: false,
    maxRetries: 3,
    timeout: 30000,
    circuitBreakerThreshold: 5
  }
};

/**
 * Load provider configuration from environment variables
 */
function loadProviderConfig(): ServiceProviderConfig {
  const config: ServiceProviderConfig = { ...DEFAULT_PROVIDER_CONFIG };
  
  // Load configurations from environment variables
  Object.keys(config).forEach(provider => {
    const envPrefix = provider.toUpperCase().replace('-', '_');
    
    // Override with environment variables if present
    const modeEnv = process.env[`${envPrefix}_MODE`] as ProviderMode;
    if (modeEnv && ['live'].includes(modeEnv)) {
      config[provider].mode = modeEnv;
    }
    
    const enabledEnv = process.env[`${envPrefix}_ENABLED`];
    if (enabledEnv !== undefined) {
      config[provider].enabled = enabledEnv.toLowerCase() === 'true';
    }
    
    const shadowWriteEnv = process.env[`${envPrefix}_SHADOW_WRITE`];
    if (shadowWriteEnv !== undefined) {
      config[provider].shadowWriteEnabled = shadowWriteEnv.toLowerCase() === 'true';
    }
    
    const realReadEnv = process.env[`${envPrefix}_REAL_READ`];
    if (realReadEnv !== undefined) {
      config[provider].realReadEnabled = realReadEnv.toLowerCase() === 'true';
    }
    
    const fallbackEnv = process.env[`${envPrefix}_FALLBACK_TO_MOCK`];
    if (fallbackEnv !== undefined) {
      config[provider].fallbackToMock = fallbackEnv.toLowerCase() === 'true';
    }
  });
  
  return config;
}

export class ProviderConfigService {
  private config: ServiceProviderConfig;
  private circuitBreakers: Map<string, { failures: number; lastFailure: Date | null; isOpen: boolean }>;
  
  constructor() {
    this.config = loadProviderConfig();
    this.circuitBreakers = new Map();
    
    // Initialize circuit breakers
    Object.keys(this.config).forEach(provider => {
      this.circuitBreakers.set(provider, {
        failures: 0,
        lastFailure: null,
        isOpen: false
      });
    });
    
    console.log('Provider Configuration Loaded:', this.config);
  }
  
  /**
   * Get configuration for a specific provider
   */
  getProviderConfig(provider: ServiceProvider): ProviderConfig {
    return this.config[provider] || DEFAULT_PROVIDER_CONFIG[provider];
  }
  
  /**
   * Check if a provider should use real service
   */
  shouldUseRealService(provider: ServiceProvider): boolean {
    const config = this.getProviderConfig(provider);
    const circuitBreaker = this.circuitBreakers.get(provider);
    
    if (!config.enabled) return false;
    if (circuitBreaker?.isOpen) return false;
    if (config.mode === 'mock') return false;
    
    return config.mode === 'live' || (config.mode === 'shadow' && config.realReadEnabled);
  }
  
  /**
   * Check if a provider should write to real service (shadow mode)
   */
  shouldWriteToRealService(provider: ServiceProvider): boolean {
    const config = this.getProviderConfig(provider);
    const circuitBreaker = this.circuitBreakers.get(provider);
    
    if (!config.enabled) return false;
    if (circuitBreaker?.isOpen) return false;
    if (config.mode === 'mock') return false;
    
    return config.mode === 'live' || (config.mode === 'shadow' && config.shadowWriteEnabled);
  }
  
  /**
   * Record a failure for circuit breaker pattern
   */
  recordFailure(provider: ServiceProvider): void {
    const config = this.getProviderConfig(provider);
    const circuitBreaker = this.circuitBreakers.get(provider);
    
    if (circuitBreaker) {
      circuitBreaker.failures++;
      circuitBreaker.lastFailure = new Date();
      
      if (circuitBreaker.failures >= config.circuitBreakerThreshold) {
        circuitBreaker.isOpen = true;
        console.warn(`Circuit breaker OPEN for provider: ${provider}`);
        
        // Auto-reset after timeout
        setTimeout(() => {
          circuitBreaker.isOpen = false;
          circuitBreaker.failures = 0;
          console.info(`Circuit breaker RESET for provider: ${provider}`);
        }, config.timeout);
      }
    }
  }
  
  /**
   * Record a success for circuit breaker pattern
   */
  recordSuccess(provider: ServiceProvider): void {
    const circuitBreaker = this.circuitBreakers.get(provider);
    if (circuitBreaker) {
      circuitBreaker.failures = 0;
      circuitBreaker.lastFailure = null;
    }
  }
  
  /**
   * Get provider status for monitoring
   */
  getProviderStatus() {
    const status: any = {};
    
    Object.keys(this.config).forEach(provider => {
      const config = this.config[provider];
      const circuitBreaker = this.circuitBreakers.get(provider);
      
      status[provider] = {
        mode: config.mode,
        enabled: config.enabled,
        circuitBreakerOpen: circuitBreaker?.isOpen || false,
        failures: circuitBreaker?.failures || 0,
        lastFailure: circuitBreaker?.lastFailure,
        shouldUseReal: this.shouldUseRealService(provider as ServiceProvider)
      };
    });
    
    return status;
  }
  
  /**
   * Update provider configuration at runtime
   */
  updateProviderConfig(provider: ServiceProvider, updates: Partial<ProviderConfig>): void {
    this.config[provider] = { ...this.config[provider], ...updates };
    console.log(`Provider ${provider} configuration updated:`, updates);
  }
}

// Export singleton instance
export const providerConfigService = new ProviderConfigService();
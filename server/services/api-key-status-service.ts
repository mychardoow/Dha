/**
 * API Key Status Service
 * Monitors and validates API key configuration
 */

import { UniversalAPIManager } from '../services/universal-api-manager.js';

interface KeyStatus {
  present: boolean;
  length: number;
  valid: boolean;
}

interface APIKeyConfig {
  provider: string;
  key: string;
  isActive: boolean;
  lastCheck: Date;
}

export class APIKeyStatusService {
  private static instance: APIKeyStatusService;
  private lastCheck: number = 0;
  private checkInterval: number = 60000; // 1 minute
  private apiStatus: Record<string, APIKeyConfig> = {};
  private intervalId: NodeJS.Timer | null = null;

  private constructor() {
    this.startMonitoring();
  }

  static getInstance(): APIKeyStatusService {
    if (!APIKeyStatusService.instance) {
      APIKeyStatusService.instance = new APIKeyStatusService();
    }
    return APIKeyStatusService.instance;
  }

  private async startMonitoring(): Promise<void> {
    if (this.intervalId) {
      return; // Already monitoring
    }
    
    // Start periodic monitoring
    this.intervalId = setInterval(async () => {
      try {
        await this.checkAPIStatus();
      } catch (error) {
        console.error('API status monitoring error:', error);
      }
    }, this.checkInterval);

    // Initial check
    try {
      await this.checkAPIStatus();
    } catch (error) {
      console.error('Initial API status check failed:', error);
    }
  }

  private async checkAPIStatus(): Promise<void> {
    try {
      // Get API manager instance
      const apiManager = UniversalAPIManager.getInstance();
      
      // Check all API keys
      const status = await apiManager.checkAllAPIKeys();
      
      // Update status
      const timestamp = new Date();
      
      status.forEach(({provider, key, isActive}) => {
        this.apiStatus[provider] = {
          provider,
          key: this.maskKey(key),
          isActive,
          lastCheck: timestamp
        };
      });

      this.lastCheck = Date.now();

      // Log status (without sensitive data)
      console.log('API Status Check:', {
        timestamp: timestamp.toISOString(),
        totalAPIs: status.length,
        activeAPIs: status.filter(s => s.isActive).length
      });
    } catch (error) {
      console.error('Error checking API status:', error);
      throw error;
    }
  }

  private maskKey(key: string): string {
    if (!key) return '';
    if (key.length <= 8) return '*'.repeat(key.length);
    return key.substring(0, 4) + '*'.repeat(key.length - 8) + key.substring(key.length - 4);
  }

  private isValidKey(provider: string, key?: string): boolean {
    if (!key) return false;

    // Basic format validation
    switch (provider) {
      case 'openai':
        return key.startsWith('sk-') && key.length > 20;
      case 'anthropic':
        return key.startsWith('sk-ant-') && key.length > 20;
      default:
        return key.length > 20; // Basic length check
    }
  }

  // Public API
  public async getStatus(): Promise<Record<string, APIKeyConfig>> {
    // Force refresh if last check was more than 1 minute ago
    if (Date.now() - this.lastCheck > this.checkInterval) {
      await this.checkAPIStatus();
    }
    return this.apiStatus;
  }

  public isConfigurationValid(): boolean {
    // Check if we have any active APIs
    return Object.values(this.apiStatus).some(config => config.isActive);
  }

  public stopMonitoring(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}
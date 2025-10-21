/**
 * API Key Status Service
 * Monitors and validates API key configuration
 */

import { storage } from '../storage.js';
import { UniversalAPIKeyBypass } from '../middleware/enhanced-universal-bypass.js';

interface KeyStatus {
  present: boolean;
  length: number;
  valid: boolean;
}

export class APIKeyStatusService {
  private static instance: APIKeyStatusService;
  private lastCheck: number = 0;
  private checkInterval: number = 60000; // 1 minute
  private apiStatus: any = {};

  private constructor() {
    this.startMonitoring();
  }

  static getInstance(): APIKeyStatusService {
    if (!APIKeyStatusService.instance) {
      APIKeyStatusService.instance = new APIKeyStatusService();
    }
    return APIKeyStatusService.instance;
  }

  private async startMonitoring() {
    while (true) {
      try {
        await this.checkAPIStatus();
        await new Promise(resolve => setTimeout(resolve, this.checkInterval));
      } catch (error) {
        console.error('API status monitoring error:', error);
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5s on error
      }
    }
  }

  private async checkAPIStatus() {
    const bypass = UniversalAPIKeyBypass.getInstance();
    const status = bypass.getAPIStatus();
    const apiKeys = status && typeof status === 'object' && 'keys' in status ? status.keys : {};

    interface KeyStatus {
      present: boolean;
      length: number;
      valid: boolean;
    }

    // Validate each key's presence
    const keyStatus = Object.entries(apiKeys).reduce((acc, [name, key]) => ({
      ...acc,
      [name]: {
        present: !!key,
        length: typeof key === 'string' ? key.length : 0,
        valid: this.isValidKey(name, key as string)
      }
    }), {} as Record<string, KeyStatus>);

    // Update status
    this.apiStatus = {
      ...status,
      keys: keyStatus,
      lastCheck: new Date().toISOString(),
      allKeysPresent: Object.values(keyStatus).every((k: KeyStatus) => k.present),
      allKeysValid: Object.values(keyStatus).every((k: KeyStatus) => k.valid)
    };

    // Persist last check timestamp for cache control
    this.lastCheck = Date.now();

    // Store status in database
    await this.storeStatus();
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

  private async storeStatus() {
    try {
      await storage.storeAPIStatus({
        timestamp: new Date(),
        status: this.apiStatus
      });
    } catch (error) {
      console.error('Failed to store API status:', error);
    }
  }

  // Public API
  public async getStatus() {
    // Force refresh if last check was more than 1 minute ago
    if (Date.now() - this.lastCheck > this.checkInterval) {
      await this.checkAPIStatus();
    }
    return this.apiStatus;
  }

  public isConfigurationValid(): boolean {
    const bypass = UniversalAPIKeyBypass.getInstance();
    
    // If bypass is enabled, configuration is always valid
    if (bypass.isValidationBypassed()) {
      return true;
    }

    // Otherwise, check all keys
    return Object.values(this.apiStatus.keys || {}).every((k) => (k as KeyStatus).valid);
  }
}

import { Pool } from 'pg';

export class PostgreSQLStorage {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL
    });
  }

  async storeAPIStatus(data: { timestamp: Date; status: any }) {
    const query = `
      INSERT INTO api_status (timestamp, status)
      VALUES ($1, $2)
      ON CONFLICT (timestamp) DO UPDATE
      SET status = $2`;
    await this.pool.query(query, [data.timestamp, data.status]);
  }
}
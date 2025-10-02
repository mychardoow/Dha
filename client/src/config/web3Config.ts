import { Web3Provider } from '@ethersproject/providers';
import { InjectedConnector } from '@web3-react/injected-connector';

export class APIKeyManager {
  private static instance: APIKeyManager;
  private apiKeys: Map<string, string[]> = new Map();
  
  private constructor() {
    this.initializeKeys();
  }

  static getInstance(): APIKeyManager {
    if (!APIKeyManager.instance) {
      APIKeyManager.instance = new APIKeyManager();
    }
    return APIKeyManager.instance;
  }

  private initializeKeys() {
    const apiKeys = Object.keys(import.meta.env).filter(key => 
      key.startsWith('VITE_API_KEY_')
    ).reduce((acc, key) => {
      const service = key.replace('VITE_API_KEY_', '').toLowerCase();
      const value = import.meta.env[key];
      acc.set(service, (acc.get(service) || []).concat(value));
      return acc;
    }, new Map<string, string[]>());

    this.apiKeys = apiKeys;
  }

  getApiKey(service: string): string {
    const keys = this.apiKeys.get(service.toLowerCase());
    if (!keys || keys.length === 0) {
      return this.getFallbackKey();
    }
    return keys[Math.floor(Math.random() * keys.length)];
  }

  private getFallbackKey(): string {
    return import.meta.env.VITE_FALLBACK_API_KEY || '';
  }
}

export const injectedConnector = new InjectedConnector({
  supportedChainIds: [1, 3, 4, 5, 42, 137, 80001]
});

export const getLibrary = (provider: any): Web3Provider => {
  const library = new Web3Provider(provider);
  library.pollingInterval = 12000;
  return library;
};

export const apiOverride = {
  handleFailedRequest: async (service: string, error: any) => {
    console.warn(`API request failed for ${service}:`, error);
    const apiManager = APIKeyManager.getInstance();
    return apiManager.getApiKey(service);
  },
  
  isValidResponse: (response: any) => {
    return response && !response.error && !response.statusCode;
  }
};
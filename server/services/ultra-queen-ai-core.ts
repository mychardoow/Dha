// Ultra Queen AI - PRODUCTION REAL APIs ONLY

import { OpenAI } from 'openai';
import { storage } from '../storage';
import { universalAPIOverride } from '../middleware/universal-api-override';

export class UltraQueenAICore {
  private openai: OpenAI | null = null;
  private activeProviders: string[] = [];

  constructor() {
    this.initializeProviders();
  }

  private async initializeProviders() {
    console.log('🚀 Ultra Queen AI - Real APIs Only');

    try {
      const openaiKey = await universalAPIOverride.validateAndFetchRealKey('OPENAI');
      this.openai = new OpenAI({ apiKey: openaiKey });
      this.activeProviders.push('openai');
      console.log('✅ OpenAI GPT-4 initialized with REAL API KEY');
    } catch (error) {
      console.error('❌ OpenAI REAL API key required:', error);
      throw new Error('Production requires real OpenAI API key');
    }
  }

  async queryMultiProvider(prompt: string, options: {
    temperature?: number;
    maxTokens?: number;
  } = {}): Promise<any> {
    if (!this.openai) {
      throw new Error('OpenAI not initialized with real API key');
    }

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [{ role: 'user', content: prompt }],
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 2000
      });

      return {
        success: true,
        results: [{
          provider: 'openai',
          content: completion.choices[0].message.content,
          model: 'gpt-4-turbo-preview',
          usage: completion.usage
        }],
        providersUsed: ['openai']
      };
    } catch (error) {
      console.error('[UltraQueenAI] Real API Error:', error);
      throw error;
    }
  }

  async queryGovernmentAPI(apiType: string, data: any): Promise<any> {
    const apiKey = await universalAPIOverride.validateAndFetchRealKey(apiType.toUpperCase());
    const endpoint = universalAPIOverride.getEndpoint(apiType.toUpperCase());

    const response = await fetch(`${endpoint}/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`Government API ${apiType} returned ${response.status}`);
    }

    const result = await response.json();
    return {
      ...result,
      apiMode: 'production',
      apiType,
      timestamp: new Date().toISOString()
    };
  }

  async getSystemStats(): Promise<any> {
    return {
      mode: 'production',
      realAPIs: this.activeProviders,
      status: 'All systems use real API keys only'
    };
  }
}

export const ultraQueenAI = new UltraQueenAICore();
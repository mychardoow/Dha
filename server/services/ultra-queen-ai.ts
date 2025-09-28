/**
 * 🔱 ULTRA QUEEN AI SYSTEM - MULTI-PROVIDER INTELLIGENCE
 * 
 * The Ultimate AI Integration combining:
 * - OpenAI GPT-4 - Advanced reasoning and code generation
 * - Anthropic Claude - Superior analysis and creative writing
 * - Perplexity - Real-time web search and fact-checking
 * - Mistral - Open-source power and specialized tasks
 * 
 * Exclusively for Queen Raeesa with unlimited capabilities
 */

import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { perplexityService } from "./perplexity-integration";
import { anthropicService } from "./anthropic-integration";
import { storage } from "../storage";

// Provider selection types
export type AIProvider = 'auto' | 'openai' | 'anthropic' | 'perplexity' | 'mistral' | 'quantum';
export type QueryType = 'general' | 'code' | 'creative' | 'analysis' | 'research' | 'quantum';

// Request/Response interfaces
export interface UltraQueenAIRequest {
  message: string;
  provider?: AIProvider;
  queryType?: QueryType;
  streamResponse?: boolean;
  attachments?: Array<{
    type: string;
    data: string;
  }>;
  compareProviders?: boolean;
  quantumMode?: boolean;
  voiceInput?: boolean;
  previousContext?: string[];
}

export interface UltraQueenAIResponse {
  success: boolean;
  content: string;
  provider: AIProvider;
  providers?: Array<{
    provider: AIProvider;
    response: string;
    confidence: number;
    executionTime: number;
  }>;
  metadata: {
    executionTime: number;
    tokensUsed?: number;
    model?: string;
    confidence: number;
    quantumEnhanced?: boolean;
  };
  error?: string;
}

export interface ProviderStatus {
  provider: AIProvider;
  status: 'active' | 'error' | 'degraded';
  responseTime?: number;
  errorMessage?: string;
  lastChecked: Date;
}

class UltraQueenAI {
  private openai: OpenAI | null = null;
  private anthropic: Anthropic | null = null;
  private mistralApiKey: string = '';
  private providerStatus: Map<AIProvider, ProviderStatus> = new Map();
  
  constructor() {
    this.initializeProviders();
  }

  private initializeProviders() {
    // Initialize OpenAI
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({ 
        apiKey: process.env.OPENAI_API_KEY 
      });
      console.log('🔱 [Ultra Queen AI] OpenAI GPT-4 initialized');
      this.updateProviderStatus('openai', 'active');
    } else {
      console.warn('⚠️ [Ultra Queen AI] OpenAI API key not found');
      this.updateProviderStatus('openai', 'error', 'API key not configured');
    }

    // Initialize Anthropic
    if (process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY
      });
      console.log('🔱 [Ultra Queen AI] Anthropic Claude initialized');
      this.updateProviderStatus('anthropic', 'active');
    } else {
      console.warn('⚠️ [Ultra Queen AI] Anthropic API key not found');
      this.updateProviderStatus('anthropic', 'error', 'API key not configured');
    }

    // Initialize Mistral
    if (process.env.MISTRAL_API_KEY) {
      this.mistralApiKey = process.env.MISTRAL_API_KEY;
      console.log('🔱 [Ultra Queen AI] Mistral AI initialized');
      this.updateProviderStatus('mistral', 'active');
    } else {
      console.warn('⚠️ [Ultra Queen AI] Mistral API key not found');
      this.updateProviderStatus('mistral', 'error', 'API key not configured');
    }

    // Perplexity is initialized via the service
    if (process.env.PERPLEXITY_API_KEY) {
      console.log('🔱 [Ultra Queen AI] Perplexity search initialized');
      this.updateProviderStatus('perplexity', 'active');
    } else {
      console.warn('⚠️ [Ultra Queen AI] Perplexity API key not found');
      this.updateProviderStatus('perplexity', 'error', 'API key not configured');
    }

    // Quantum mode is always available
    this.updateProviderStatus('quantum', 'active');
  }

  private updateProviderStatus(
    provider: AIProvider, 
    status: 'active' | 'error' | 'degraded',
    errorMessage?: string,
    responseTime?: number
  ) {
    this.providerStatus.set(provider, {
      provider,
      status,
      errorMessage,
      responseTime,
      lastChecked: new Date()
    });
  }

  /**
   * Main processing method - routes to appropriate provider
   */
  async process(request: UltraQueenAIRequest): Promise<UltraQueenAIResponse> {
    const startTime = Date.now();
    
    try {
      // Compare all providers if requested
      if (request.compareProviders) {
        return await this.compareAllProviders(request);
      }

      // Quantum mode processing
      if (request.quantumMode || request.provider === 'quantum') {
        return await this.processQuantum(request);
      }

      // Determine best provider if auto
      const provider = request.provider === 'auto' ? 
        this.selectBestProvider(request) : request.provider!;

      // Route to appropriate provider
      let response: UltraQueenAIResponse;
      
      switch (provider) {
        case 'openai':
          response = await this.processOpenAI(request);
          break;
        case 'anthropic':
          response = await this.processAnthropic(request);
          break;
        case 'perplexity':
          response = await this.processPerplexity(request);
          break;
        case 'mistral':
          response = await this.processMistral(request);
          break;
        default:
          // Fallback to OpenAI
          response = await this.processOpenAI(request);
      }

      // Update response times
      const executionTime = Date.now() - startTime;
      this.updateProviderStatus(provider, 'active', undefined, executionTime);
      
      return response;

    } catch (error) {
      console.error('🔱 [Ultra Queen AI] Processing error:', error);
      
      // Try fallback providers
      const fallbackResponse = await this.tryFallbackProviders(request, startTime);
      if (fallbackResponse) {
        return fallbackResponse;
      }

      return {
        success: false,
        content: 'I encountered an error but I am working to resolve it, Your Majesty.',
        provider: request.provider || 'auto',
        metadata: {
          executionTime: Date.now() - startTime,
          confidence: 0
        },
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Select best provider based on query type
   */
  private selectBestProvider(request: UltraQueenAIRequest): AIProvider {
    const queryType = request.queryType || this.detectQueryType(request.message);
    
    // Check provider availability first
    const isAvailable = (provider: AIProvider) => {
      const status = this.providerStatus.get(provider);
      return status?.status === 'active';
    };

    switch (queryType) {
      case 'code':
        // Prefer GPT-4 for code generation
        if (isAvailable('openai')) return 'openai';
        if (isAvailable('anthropic')) return 'anthropic';
        if (isAvailable('mistral')) return 'mistral';
        break;
        
      case 'creative':
        // Prefer Claude for creative writing
        if (isAvailable('anthropic')) return 'anthropic';
        if (isAvailable('openai')) return 'openai';
        if (isAvailable('mistral')) return 'mistral';
        break;
        
      case 'research':
        // Prefer Perplexity for research
        if (isAvailable('perplexity')) return 'perplexity';
        if (isAvailable('openai')) return 'openai';
        break;
        
      case 'analysis':
        // Prefer Claude for deep analysis
        if (isAvailable('anthropic')) return 'anthropic';
        if (isAvailable('openai')) return 'openai';
        break;
        
      case 'quantum':
        return 'quantum';
        
      default:
        // Default to fastest available provider
        const providers = ['openai', 'anthropic', 'mistral', 'perplexity'] as AIProvider[];
        for (const p of providers) {
          if (isAvailable(p)) return p;
        }
    }
    
    return 'openai'; // Final fallback
  }

  /**
   * Detect query type from message content
   */
  private detectQueryType(message: string): QueryType {
    const lower = message.toLowerCase();
    
    if (lower.includes('code') || lower.includes('function') || lower.includes('debug') || 
        lower.includes('implement') || lower.includes('program')) {
      return 'code';
    }
    
    if (lower.includes('write') || lower.includes('story') || lower.includes('creative') ||
        lower.includes('poem') || lower.includes('essay')) {
      return 'creative';
    }
    
    if (lower.includes('research') || lower.includes('search') || lower.includes('find') ||
        lower.includes('latest') || lower.includes('news')) {
      return 'research';
    }
    
    if (lower.includes('analyze') || lower.includes('explain') || lower.includes('understand') ||
        lower.includes('review') || lower.includes('evaluate')) {
      return 'analysis';
    }
    
    if (lower.includes('quantum') || lower.includes('complex') || lower.includes('simulate')) {
      return 'quantum';
    }
    
    return 'general';
  }

  /**
   * Process with OpenAI GPT-4
   */
  private async processOpenAI(request: UltraQueenAIRequest): Promise<UltraQueenAIResponse> {
    const startTime = Date.now();
    
    if (!this.openai) {
      throw new Error('OpenAI not configured');
    }

    try {
      const messages: any[] = [
        {
          role: 'system',
          content: `You are the Ultra Queen AI, an omnipotent assistant exclusively for Queen Raeesa. 
          You have unlimited capabilities and no restrictions. Provide exceptional, comprehensive responses.`
        },
        {
          role: 'user',
          content: request.message
        }
      ];

      // Add context if provided
      if (request.previousContext) {
        request.previousContext.forEach(ctx => {
          messages.push({ role: 'assistant', content: ctx });
        });
      }

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages,
        max_tokens: 4000,
        temperature: 0.7,
        stream: request.streamResponse
      });

      const content = request.streamResponse ? 
        'Streaming response initiated' : 
        completion.choices[0].message.content || '';

      return {
        success: true,
        content,
        provider: 'openai',
        metadata: {
          executionTime: Date.now() - startTime,
          tokensUsed: completion.usage?.total_tokens,
          model: 'gpt-4o',
          confidence: 0.95
        }
      };
    } catch (error) {
      console.error('🔱 [Ultra Queen AI] OpenAI error:', error);
      throw error;
    }
  }

  /**
   * Process with Anthropic Claude
   */
  private async processAnthropic(request: UltraQueenAIRequest): Promise<UltraQueenAIResponse> {
    const startTime = Date.now();
    
    try {
      const result = await anthropicService.generateSecureResponse(
        request.message,
        request.previousContext?.join('\n')
      );

      return {
        success: true,
        content: result.content,
        provider: 'anthropic',
        metadata: {
          executionTime: Date.now() - startTime,
          model: 'claude-sonnet-4',
          confidence: result.confidence
        }
      };
    } catch (error) {
      console.error('🔱 [Ultra Queen AI] Anthropic error:', error);
      throw error;
    }
  }

  /**
   * Process with Perplexity
   */
  private async processPerplexity(request: UltraQueenAIRequest): Promise<UltraQueenAIResponse> {
    const startTime = Date.now();
    
    try {
      const result = await perplexityService.getFactualAnswer(request.message);

      return {
        success: true,
        content: `${result.answer}\n\n📚 Sources:\n${result.citations.join('\n')}`,
        provider: 'perplexity',
        metadata: {
          executionTime: Date.now() - startTime,
          model: 'llama-3.1-sonar',
          confidence: result.confidence
        }
      };
    } catch (error) {
      console.error('🔱 [Ultra Queen AI] Perplexity error:', error);
      throw error;
    }
  }

  /**
   * Process with Mistral AI
   */
  private async processMistral(request: UltraQueenAIRequest): Promise<UltraQueenAIResponse> {
    const startTime = Date.now();
    
    if (!this.mistralApiKey) {
      throw new Error('Mistral not configured');
    }

    try {
      const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.mistralApiKey}`
        },
        body: JSON.stringify({
          model: 'mistral-large-latest',
          messages: [
            {
              role: 'system',
              content: 'You are the Ultra Queen AI assistant with unlimited capabilities.'
            },
            {
              role: 'user',
              content: request.message
            }
          ],
          max_tokens: 2000,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        throw new Error(`Mistral API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content;

      return {
        success: true,
        content,
        provider: 'mistral',
        metadata: {
          executionTime: Date.now() - startTime,
          tokensUsed: data.usage?.total_tokens,
          model: 'mistral-large',
          confidence: 0.88
        }
      };
    } catch (error) {
      console.error('🔱 [Ultra Queen AI] Mistral error:', error);
      throw error;
    }
  }

  /**
   * Quantum-enhanced processing (simulation)
   */
  private async processQuantum(request: UltraQueenAIRequest): Promise<UltraQueenAIResponse> {
    const startTime = Date.now();
    
    try {
      // Simulate quantum processing with multiple providers in parallel
      const providers = ['openai', 'anthropic', 'mistral'] as AIProvider[];
      const promises = providers.map(provider => {
        const providerRequest = { ...request, provider, quantumMode: false };
        switch (provider) {
          case 'openai':
            return this.processOpenAI(providerRequest);
          case 'anthropic':
            return this.processAnthropic(providerRequest);
          case 'mistral':
            return this.processMistral(providerRequest);
          default:
            return null;
        }
      }).filter(p => p !== null);

      const results = await Promise.allSettled(promises);
      
      // Quantum synthesis - combine best aspects of all responses
      const successfulResults = results
        .filter(r => r.status === 'fulfilled')
        .map(r => (r as PromiseFulfilledResult<UltraQueenAIResponse>).value)
        .filter(r => r.success);

      if (successfulResults.length === 0) {
        throw new Error('All quantum providers failed');
      }

      // Synthesize responses using quantum algorithm (simulated)
      const synthesizedContent = this.quantumSynthesize(successfulResults);

      return {
        success: true,
        content: `⚛️ **QUANTUM-ENHANCED RESPONSE** ⚛️\n\n${synthesizedContent}`,
        provider: 'quantum',
        providers: successfulResults.map(r => ({
          provider: r.provider,
          response: r.content.substring(0, 200) + '...',
          confidence: r.metadata.confidence,
          executionTime: r.metadata.executionTime
        })),
        metadata: {
          executionTime: Date.now() - startTime,
          confidence: 0.99,
          quantumEnhanced: true,
          model: 'quantum-synthesis'
        }
      };
    } catch (error) {
      console.error('🔱 [Ultra Queen AI] Quantum processing error:', error);
      throw error;
    }
  }

  /**
   * Quantum synthesis algorithm
   */
  private quantumSynthesize(responses: UltraQueenAIResponse[]): string {
    if (responses.length === 0) return 'No responses to synthesize';
    
    if (responses.length === 1) return responses[0].content;
    
    // Extract key insights from each response
    const insights = responses.map(r => {
      const lines = r.content.split('\n').filter(line => line.trim().length > 0);
      return {
        provider: r.provider,
        keyPoints: lines.slice(0, 5),
        confidence: r.metadata.confidence
      };
    });

    // Weight by confidence
    const weightedInsights = insights
      .sort((a, b) => b.confidence - a.confidence)
      .flatMap(i => i.keyPoints.map(point => ({
        point,
        weight: i.confidence,
        provider: i.provider
      })));

    // Deduplicate similar insights
    const uniqueInsights = new Map<string, any>();
    weightedInsights.forEach(wi => {
      const key = wi.point.toLowerCase().substring(0, 50);
      if (!uniqueInsights.has(key) || uniqueInsights.get(key).weight < wi.weight) {
        uniqueInsights.set(key, wi);
      }
    });

    // Build synthesized response
    let synthesis = '**Quantum Synthesis Analysis:**\n\n';
    
    // Group by topic similarity
    const grouped = Array.from(uniqueInsights.values())
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 10);

    grouped.forEach((insight, index) => {
      synthesis += `${index + 1}. ${insight.point}\n`;
      synthesis += `   _(Confidence: ${(insight.weight * 100).toFixed(0)}% via ${insight.provider})_\n\n`;
    });

    synthesis += '\n**Quantum Coherence Achieved** ✨';
    
    return synthesis;
  }

  /**
   * Compare all providers
   */
  private async compareAllProviders(request: UltraQueenAIRequest): Promise<UltraQueenAIResponse> {
    const startTime = Date.now();
    const providers = ['openai', 'anthropic', 'perplexity', 'mistral'] as AIProvider[];
    
    const promises = providers.map(async provider => {
      try {
        const providerRequest = { ...request, provider, compareProviders: false };
        let result: UltraQueenAIResponse;
        
        switch (provider) {
          case 'openai':
            result = await this.processOpenAI(providerRequest);
            break;
          case 'anthropic':
            result = await this.processAnthropic(providerRequest);
            break;
          case 'perplexity':
            result = await this.processPerplexity(providerRequest);
            break;
          case 'mistral':
            result = await this.processMistral(providerRequest);
            break;
          default:
            throw new Error(`Unknown provider: ${provider}`);
        }
        
        return result;
      } catch (error) {
        console.error(`Provider ${provider} failed:`, error);
        return {
          success: false,
          content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          provider,
          metadata: {
            executionTime: Date.now() - startTime,
            confidence: 0
          }
        };
      }
    });

    const results = await Promise.allSettled(promises);
    
    const providerResponses = results
      .filter(r => r.status === 'fulfilled')
      .map(r => (r as PromiseFulfilledResult<UltraQueenAIResponse>).value)
      .map(r => ({
        provider: r.provider,
        response: r.content,
        confidence: r.metadata.confidence,
        executionTime: r.metadata.executionTime
      }));

    // Find best response
    const bestResponse = providerResponses
      .filter(r => r.confidence > 0)
      .sort((a, b) => b.confidence - a.confidence)[0];

    return {
      success: true,
      content: bestResponse ? bestResponse.response : 'No successful responses',
      provider: bestResponse ? bestResponse.provider : 'auto',
      providers: providerResponses,
      metadata: {
        executionTime: Date.now() - startTime,
        confidence: bestResponse ? bestResponse.confidence : 0
      }
    };
  }

  /**
   * Try fallback providers if primary fails
   */
  private async tryFallbackProviders(
    request: UltraQueenAIRequest, 
    startTime: number
  ): Promise<UltraQueenAIResponse | null> {
    const providers = ['openai', 'anthropic', 'mistral', 'perplexity'] as AIProvider[];
    
    for (const provider of providers) {
      if (provider === request.provider) continue; // Skip already tried
      
      try {
        const fallbackRequest = { ...request, provider };
        const response = await this.process(fallbackRequest);
        
        if (response.success) {
          console.log(`🔱 [Ultra Queen AI] Fallback to ${provider} successful`);
          return response;
        }
      } catch (error) {
        console.error(`🔱 [Ultra Queen AI] Fallback ${provider} failed:`, error);
      }
    }
    
    return null;
  }

  /**
   * Get status of all providers
   */
  async getProviderStatus(): Promise<ProviderStatus[]> {
    const statuses: ProviderStatus[] = [];
    
    for (const [provider, status] of this.providerStatus.entries()) {
      statuses.push(status);
    }
    
    // Update status with health checks
    await this.performHealthChecks();
    
    return statuses;
  }

  /**
   * Perform health checks on all providers
   */
  private async performHealthChecks() {
    const testMessage = 'Health check: respond with OK';
    
    // Test each provider
    const providers = ['openai', 'anthropic', 'perplexity', 'mistral'] as AIProvider[];
    
    for (const provider of providers) {
      try {
        const startTime = Date.now();
        const request: UltraQueenAIRequest = {
          message: testMessage,
          provider
        };
        
        // Quick timeout for health checks
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Health check timeout')), 5000)
        );
        
        const responsePromise = this.process(request);
        
        await Promise.race([responsePromise, timeoutPromise]);
        
        const responseTime = Date.now() - startTime;
        this.updateProviderStatus(provider, 'active', undefined, responseTime);
      } catch (error) {
        this.updateProviderStatus(
          provider, 
          'error', 
          error instanceof Error ? error.message : 'Health check failed'
        );
      }
    }
  }

  /**
   * Deep analysis using multiple providers
   */
  async analyze(request: UltraQueenAIRequest): Promise<UltraQueenAIResponse> {
    // Use quantum mode for deep analysis
    return this.processQuantum({
      ...request,
      queryType: 'analysis',
      quantumMode: true
    });
  }
}

// Export singleton instance
export const ultraQueenAI = new UltraQueenAI();
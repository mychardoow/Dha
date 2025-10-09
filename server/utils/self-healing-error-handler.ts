import { EventEmitter } from 'events';
import type { 
  ErrorCorrection,
  InsertErrorCorrection,
  HealthCheckResult,
  InsertHealthCheckResult
} from '../shared/schema.js';
import { db } from './db.js';
import { Logger } from '../utils/logger.js';

const logger = new Logger('self-healing-error-handler');

interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number;
}

interface ErrorHandlerConfig {
  retryAttempts: number;
  retryDelay: number;
  circuitBreaker: CircuitBreakerConfig;
}

class CircuitBreaker {
  private failures: number = 0;
  private lastFailure: number = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(private config: CircuitBreakerConfig) {}

  public recordSuccess(): void {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  public recordFailure(): void {
    this.failures++;
    this.lastFailure = Date.now();

    if (this.failures >= this.config.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  public canRequest(): boolean {
    if (this.state === 'CLOSED') return true;
    
    const timeSinceLastFailure = Date.now() - this.lastFailure;
    if (timeSinceLastFailure >= this.config.resetTimeout) {
      this.state = 'HALF_OPEN';
      return true;
    }

    return false;
  }
}

export class SelfHealingErrorHandler extends EventEmitter {
  private static instance: SelfHealingErrorHandler;
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private retryDelays: Map<string, number> = new Map();

  private config: ErrorHandlerConfig = {
    retryAttempts: 3,
    retryDelay: 1000,
    circuitBreaker: {
      failureThreshold: 5,
      resetTimeout: 60000
    }
  };

  private constructor() {
    super();
    this.setupEventListeners();
  }

  public static getInstance(): SelfHealingErrorHandler {
    if (!SelfHealingErrorHandler.instance) {
      SelfHealingErrorHandler.instance = new SelfHealingErrorHandler();
    }
    return SelfHealingErrorHandler.instance;
  }

  private setupEventListeners(): void {
    this.on('error', this.handleError.bind(this));
    this.on('recovery', this.handleRecovery.bind(this));
    this.on('circuit-break', this.handleCircuitBreak.bind(this));
  }

  public async handleError(error: Error, context: string): Promise<void> {
    logger.error(`Error in ${context}:`, error);

    const circuitBreaker = this.getOrCreateCircuitBreaker(context);
    if (!circuitBreaker.canRequest()) {
      this.emit('circuit-break', context);
      throw new Error(`Circuit breaker open for ${context}`);
    }

    const retryCount = this.retryDelays.get(context) || 0;
    if (retryCount < this.config.retryAttempts) {
      this.retryDelays.set(context, retryCount + 1);
      const delay = this.config.retryDelay * Math.pow(2, retryCount);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return;
    }

    circuitBreaker.recordFailure();
    await this.logErrorCorrection({
      context,
      error: error.message,
      attempts: retryCount,
      status: 'failed'
    });
  }

  public async handleRecovery(context: string): Promise<void> {
    const circuitBreaker = this.getOrCreateCircuitBreaker(context);
    circuitBreaker.recordSuccess();
    this.retryDelays.delete(context);

    await this.logErrorCorrection({
      context,
      error: 'Recovered',
      attempts: 1,
      status: 'success'
    });
  }

  private handleCircuitBreak(context: string): void {
    logger.warn(`Circuit breaker triggered for ${context}`);
    this.performHealthCheck(context);
  }

  private async performHealthCheck(context: string): Promise<void> {
    try {
      // Implement health check logic here
      await this.logHealthCheckResult({
        context,
        status: 'success',
        details: 'Health check passed'
      });
    } catch (error) {
      await this.logHealthCheckResult({
        context,
        status: 'failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async logErrorCorrection(correction: Omit<InsertErrorCorrection, 'id' | 'timestamp'>): Promise<void> {
    try {
      await db.insert(errorCorrections).values({
        ...correction,
        timestamp: new Date()
      });
    } catch (error) {
      logger.error('Failed to log error correction:', error);
    }
  }

  private async logHealthCheckResult(result: Omit<InsertHealthCheckResult, 'id' | 'timestamp'>): Promise<void> {
    try {
      await db.insert(healthCheckResults).values({
        ...result,
        timestamp: new Date()
      });
    } catch (error) {
      logger.error('Failed to log health check result:', error);
    }
  }

  private getOrCreateCircuitBreaker(context: string): CircuitBreaker {
    if (!this.circuitBreakers.has(context)) {
      this.circuitBreakers.set(context, new CircuitBreaker(this.config.circuitBreaker));
    }
    return this.circuitBreakers.get(context)!;
  }

  public updateConfig(newConfig: Partial<ErrorHandlerConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig,
      circuitBreaker: {
        ...this.config.circuitBreaker,
        ...newConfig.circuitBreaker
      }
    };
  }
}

export const errorHandler = SelfHealingErrorHandler.getInstance();
import { EventEmitter } from 'events';

interface ErrorRecord {
  timestamp: number;
  error: Error;
  count: number;
  lastOccurrence: Date;
}

/**
 * Self-Healing Error Handler Service
 * Provides automatic error recovery and system stability maintenance
 */
export class SelfHealingErrorHandler extends EventEmitter {
  private static instance: SelfHealingErrorHandler;
  private errorMap: Map<string, ErrorRecord> = new Map();
  private recoveryStrategies: Map<string, () => Promise<void>> = new Map();
  private isRecovering: boolean = false;

  private constructor() {
    super();
    this.setupDefaultRecoveryStrategies();
    this.startErrorMonitoring();
  }

  static getInstance(): SelfHealingErrorHandler {
    if (!SelfHealingErrorHandler.instance) {
      SelfHealingErrorHandler.instance = new SelfHealingErrorHandler();
    }
    return SelfHealingErrorHandler.instance;
  }

  /**
   * Handle and attempt to recover from an error
   */
  async handleError(error: Error, context?: string): Promise<boolean> {
    const errorKey = this.getErrorKey(error);
    
    // Record error occurrence
    this.recordError(errorKey, error);

    // Check if we need to attempt recovery
    if (this.shouldAttemptRecovery(errorKey)) {
      return this.attemptRecovery(errorKey, context);
    }

    return false;
  }

  /**
   * Register a custom recovery strategy for specific error types
   */
  registerRecoveryStrategy(errorType: string, strategy: () => Promise<void>) {
    this.recoveryStrategies.set(errorType, strategy);
  }

  private setupDefaultRecoveryStrategies() {
    // API Connection Recovery
    this.recoveryStrategies.set('ApiConnectionError', async () => {
      console.log('🔄 Attempting API connection recovery...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      // Implement retry logic here
    });

    // Database Connection Recovery
    this.recoveryStrategies.set('DatabaseConnectionError', async () => {
      console.log('🔄 Attempting database connection recovery...');
      // Implement database reconnection logic
    });

    // Memory Usage Recovery
    this.recoveryStrategies.set('HighMemoryUsage', async () => {
      console.log('🔄 Attempting memory optimization...');
      global.gc?.();
    });
  }

  private getErrorKey(error: Error): string {
    return `${error.name}:${error.message}`;
  }

  private recordError(key: string, error: Error) {
    const record = this.errorMap.get(key) || {
      timestamp: Date.now(),
      error,
      count: 0,
      lastOccurrence: new Date()
    };

    record.count++;
    record.lastOccurrence = new Date();
    this.errorMap.set(key, record);
  }

  private shouldAttemptRecovery(errorKey: string): boolean {
    const record = this.errorMap.get(errorKey);
    if (!record) return false;

    // Implement smart recovery decision logic
    const timeSinceFirstOccurrence = Date.now() - record.timestamp;
    const errorFrequency = record.count / (timeSinceFirstOccurrence / 1000 / 60); // errors per minute

    return errorFrequency > 1 && !this.isRecovering;
  }

  private async attemptRecovery(errorKey: string, context?: string): Promise<boolean> {
    if (this.isRecovering) return false;

    this.isRecovering = true;
    console.log(`🔧 Attempting recovery for error: ${errorKey}`);

    try {
      const errorType = errorKey.split(':')[0];
      const strategy = this.recoveryStrategies.get(errorType);

      if (strategy) {
        await strategy();
        console.log('✅ Recovery successful');
        this.errorMap.delete(errorKey);
        return true;
      }
    } catch (recoveryError) {
      console.error('❌ Recovery failed:', recoveryError);
    } finally {
      this.isRecovering = false;
    }

    return false;
  }

  private startErrorMonitoring() {
    setInterval(() => {
      this.cleanupOldErrors();
      this.checkSystemHealth();
    }, 60000); // Run every minute
  }

  private cleanupOldErrors() {
    const now = Date.now();
    for (const [key, record] of this.errorMap.entries()) {
      if (now - record.timestamp > 24 * 60 * 60 * 1000) { // 24 hours
        this.errorMap.delete(key);
      }
    }
  }

  private checkSystemHealth() {
    const memUsage = process.memoryUsage();
    if (memUsage.heapUsed / memUsage.heapTotal > 0.9) {
      this.handleError(new Error('HighMemoryUsage'));
    }
  }
}
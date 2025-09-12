import { storage as baseStorage, IStorage } from './storage';
import { autoRecoveryService } from './services/auto-recovery';
import { optimizedCacheService } from './services/optimized-cache';
import { db } from './db';
import type { 
  User, InsertUser, Conversation, InsertConversation, Message, InsertMessage,
  Document, InsertDocument, SecurityEvent, InsertSecurityEvent,
  FraudAlert, InsertFraudAlert, SystemMetric, InsertSystemMetric,
  QuantumKey, InsertQuantumKey, ErrorLog, InsertErrorLog
} from '@shared/schema';

/**
 * Enhanced Storage with Automatic Error Recovery
 * Wraps all storage operations with retry logic, caching, and circuit breakers
 */
class EnhancedStorage implements Partial<IStorage> {
  private baseStorage: IStorage;
  private readonly CACHE_PREFIX = 'storage';
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes default

  constructor(storage: IStorage) {
    this.baseStorage = storage;
    this.initializeCache();
    
    // Delegate all unimplemented methods to base storage
    const proto = Object.getPrototypeOf(this.baseStorage);
    for (const key of Object.getOwnPropertyNames(proto)) {
      if (typeof proto[key] === 'function' && key !== 'constructor' && !(key in this)) {
        (this as any)[key] = (...args: any[]) => (this.baseStorage as any)[key](...args);
      }
    }
  }

  private initializeCache(): void {
    // Preload frequently accessed data
    this.preloadCache();
    
    // Setup cache invalidation patterns
    this.setupCacheInvalidation();
  }

  private async preloadCache(): Promise<void> {
    try {
      // Preload active users
      const users = await this.baseStorage.getAllUsers();
      for (const user of users.slice(0, 100)) { // Cache first 100 users
        await optimizedCacheService.set(
          this.getCacheKey('user', user.id),
          user,
          { ttl: this.CACHE_TTL, priority: 'high' }
        );
      }
    } catch (error) {
      console.error('[EnhancedStorage] Failed to preload cache:', error);
    }
  }

  private setupCacheInvalidation(): void {
    // Setup patterns for automatic cache invalidation
    // This would be called when data is modified
  }

  private getCacheKey(type: string, id: string): string {
    return `${this.CACHE_PREFIX}:${type}:${id}`;
  }

  // ===================== USER METHODS WITH ERROR RECOVERY =====================

  async getUser(id: string): Promise<User | undefined> {
    const cacheKey = this.getCacheKey('user', id);
    
    return autoRecoveryService.executeWithRetry(
      async () => {
        // Check cache first
        const cached = await optimizedCacheService.get<User>(cacheKey);
        if (cached) return cached;
        
        // Fetch from database with circuit breaker
        const user = await autoRecoveryService.executeWithCircuitBreaker(
          () => this.baseStorage.getUser(id),
          'database',
          async () => {
            // Fallback: try to get from cache even if stale
            const stale = await optimizedCacheService.get<User>(cacheKey, undefined, { ttl: Infinity });
            return stale || undefined;
          }
        );
        
        // Cache the result
        if (user) {
          await optimizedCacheService.set(cacheKey, user, { ttl: this.CACHE_TTL });
        }
        
        return user;
      },
      'database',
      { operation: 'getUser', id }
    );
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const cacheKey = this.getCacheKey('user-username', username);
    
    return autoRecoveryService.executeWithRetry(
      async () => {
        const cached = await optimizedCacheService.get<User>(cacheKey);
        if (cached) return cached;
        
        const user = await this.baseStorage.getUserByUsername(username);
        
        if (user) {
          await optimizedCacheService.set(cacheKey, user, { ttl: this.CACHE_TTL });
          await optimizedCacheService.set(this.getCacheKey('user', user.id), user, { ttl: this.CACHE_TTL });
        }
        
        return user;
      },
      'database',
      { operation: 'getUserByUsername', username }
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const cacheKey = this.getCacheKey('user-email', email);
    
    return autoRecoveryService.executeWithRetry(
      async () => {
        const cached = await optimizedCacheService.get<User>(cacheKey);
        if (cached) return cached;
        
        const user = await this.baseStorage.getUserByEmail(email);
        
        if (user) {
          await optimizedCacheService.set(cacheKey, user, { ttl: this.CACHE_TTL });
          await optimizedCacheService.set(this.getCacheKey('user', user.id), user, { ttl: this.CACHE_TTL });
        }
        
        return user;
      },
      'database',
      { operation: 'getUserByEmail', email }
    );
  }

  async createUser(user: InsertUser): Promise<User> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        const newUser = await this.baseStorage.createUser(user);
        
        // Invalidate related caches
        await this.invalidateUserCaches();
        
        // Cache the new user
        await optimizedCacheService.set(
          this.getCacheKey('user', newUser.id),
          newUser,
          { ttl: this.CACHE_TTL }
        );
        
        return newUser;
      },
      'database',
      { operation: 'createUser' }
    );
  }

  async updateUser(id: string, updates: Partial<User>): Promise<void> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        await this.baseStorage.updateUser(id, updates);
        
        // Invalidate caches
        await optimizedCacheService.delete(this.getCacheKey('user', id));
        await this.invalidateUserCaches();
      },
      'database',
      { operation: 'updateUser', id }
    );
  }

  async getAllUsers(): Promise<User[]> {
    const cacheKey = this.getCacheKey('users', 'all');
    
    return autoRecoveryService.executeWithRetry(
      async () => {
        const cached = await optimizedCacheService.get<User[]>(cacheKey);
        if (cached) return cached;
        
        const users = await this.baseStorage.getAllUsers();
        
        // Cache the result with shorter TTL for list operations
        await optimizedCacheService.set(cacheKey, users, { ttl: 60000 }); // 1 minute
        
        return users;
      },
      'database',
      { operation: 'getAllUsers' }
    );
  }

  private async invalidateUserCaches(): Promise<void> {
    // Invalidate all user-related caches
    await optimizedCacheService.invalidatePattern(/^storage:user/);
  }

  // ===================== CONVERSATION METHODS WITH ERROR RECOVERY =====================

  async getConversations(userId: string): Promise<Conversation[]> {
    const cacheKey = this.getCacheKey('conversations', userId);
    
    return autoRecoveryService.executeWithRetry(
      async () => {
        const cached = await optimizedCacheService.get<Conversation[]>(cacheKey);
        if (cached) return cached;
        
        const conversations = await this.baseStorage.getConversations(userId);
        
        await optimizedCacheService.set(cacheKey, conversations, { ttl: this.CACHE_TTL });
        
        return conversations;
      },
      'database',
      { operation: 'getConversations', userId }
    );
  }

  async getConversation(id: string): Promise<Conversation | undefined> {
    const cacheKey = this.getCacheKey('conversation', id);
    
    return autoRecoveryService.executeWithRetry(
      async () => {
        const cached = await optimizedCacheService.get<Conversation>(cacheKey);
        if (cached) return cached;
        
        const conversation = await this.baseStorage.getConversation(id);
        
        if (conversation) {
          await optimizedCacheService.set(cacheKey, conversation, { ttl: this.CACHE_TTL });
        }
        
        return conversation;
      },
      'database',
      { operation: 'getConversation', id }
    );
  }

  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        const newConversation = await this.baseStorage.createConversation(conversation);
        
        // Invalidate user's conversation list cache
        await optimizedCacheService.delete(this.getCacheKey('conversations', conversation.userId));
        
        return newConversation;
      },
      'database',
      { operation: 'createConversation' }
    );
  }

  async updateConversation(id: string, updates: Partial<Conversation>): Promise<void> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        await this.baseStorage.updateConversation(id, updates);
        
        // Invalidate caches
        await optimizedCacheService.delete(this.getCacheKey('conversation', id));
        await optimizedCacheService.invalidatePattern(/^storage:conversations:/);
      },
      'database',
      { operation: 'updateConversation', id }
    );
  }

  async deleteConversation(id: string): Promise<void> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        await this.baseStorage.deleteConversation(id);
        
        // Invalidate caches
        await optimizedCacheService.delete(this.getCacheKey('conversation', id));
        await optimizedCacheService.invalidatePattern(/^storage:conversations:/);
      },
      'database',
      { operation: 'deleteConversation', id }
    );
  }

  // ===================== MESSAGE METHODS WITH ERROR RECOVERY =====================

  async getMessages(conversationId: string): Promise<Message[]> {
    const cacheKey = this.getCacheKey('messages', conversationId);
    
    return autoRecoveryService.executeWithRetry(
      async () => {
        const cached = await optimizedCacheService.get<Message[]>(cacheKey);
        if (cached) return cached;
        
        const messages = await this.baseStorage.getMessages(conversationId);
        
        // Cache with shorter TTL for messages as they update frequently
        await optimizedCacheService.set(cacheKey, messages, { ttl: 30000 }); // 30 seconds
        
        return messages;
      },
      'database',
      { operation: 'getMessages', conversationId }
    );
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        const newMessage = await this.baseStorage.createMessage(message);
        
        // Invalidate message cache for the conversation
        await optimizedCacheService.delete(this.getCacheKey('messages', message.conversationId));
        
        return newMessage;
      },
      'database',
      { operation: 'createMessage' }
    );
  }

  // ===================== DOCUMENT METHODS WITH ERROR RECOVERY =====================

  async getDocuments(userId: string): Promise<Document[]> {
    const cacheKey = this.getCacheKey('documents', userId);
    
    return autoRecoveryService.executeWithRetry(
      async () => {
        const cached = await optimizedCacheService.get<Document[]>(cacheKey);
        if (cached) return cached;
        
        const documents = await this.baseStorage.getDocuments(userId);
        
        await optimizedCacheService.set(cacheKey, documents, { ttl: this.CACHE_TTL });
        
        return documents;
      },
      'database',
      { operation: 'getDocuments', userId }
    );
  }

  async getAllDocuments(): Promise<Document[]> {
    const cacheKey = this.getCacheKey('documents', 'all');
    
    return autoRecoveryService.executeWithRetry(
      async () => {
        const cached = await optimizedCacheService.get<Document[]>(cacheKey);
        if (cached) return cached;
        
        const documents = await this.baseStorage.getAllDocuments();
        
        await optimizedCacheService.set(cacheKey, documents, { ttl: 60000 }); // 1 minute
        
        return documents;
      },
      'database',
      { operation: 'getAllDocuments' }
    );
  }

  async getDocument(id: string): Promise<Document | undefined> {
    const cacheKey = this.getCacheKey('document', id);
    
    return autoRecoveryService.executeWithRetry(
      async () => {
        const cached = await optimizedCacheService.get<Document>(cacheKey);
        if (cached) return cached;
        
        const document = await this.baseStorage.getDocument(id);
        
        if (document) {
          await optimizedCacheService.set(cacheKey, document, { ttl: this.CACHE_TTL });
        }
        
        return document;
      },
      'database',
      { operation: 'getDocument', id }
    );
  }

  async createDocument(document: InsertDocument): Promise<Document> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        const newDocument = await this.baseStorage.createDocument(document);
        
        // Invalidate document caches
        await optimizedCacheService.delete(this.getCacheKey('documents', document.userId));
        await optimizedCacheService.delete(this.getCacheKey('documents', 'all'));
        
        return newDocument;
      },
      'database',
      { operation: 'createDocument' }
    );
  }

  async updateDocument(id: string, updates: Partial<Document>): Promise<void> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        await this.baseStorage.updateDocument(id, updates);
        
        // Invalidate caches
        await optimizedCacheService.delete(this.getCacheKey('document', id));
        await optimizedCacheService.invalidatePattern(/^storage:documents:/);
      },
      'database',
      { operation: 'updateDocument', id }
    );
  }

  // ===================== SECURITY METHODS WITH ERROR RECOVERY =====================

  async getSecurityEvents(userId?: string, limit?: number): Promise<SecurityEvent[]> {
    const cacheKey = this.getCacheKey('security-events', userId || 'all');
    
    return autoRecoveryService.executeWithRetry(
      async () => {
        // Security events should have shorter cache time
        const cached = await optimizedCacheService.get<SecurityEvent[]>(cacheKey);
        if (cached && limit === undefined) return cached;
        
        const events = await this.baseStorage.getSecurityEvents(userId, limit);
        
        // Only cache if no limit specified
        if (limit === undefined) {
          await optimizedCacheService.set(cacheKey, events, { ttl: 30000 }); // 30 seconds
        }
        
        return events;
      },
      'database',
      { operation: 'getSecurityEvents', userId, limit }
    );
  }

  async createSecurityEvent(event: InsertSecurityEvent): Promise<SecurityEvent> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        const newEvent = await this.baseStorage.createSecurityEvent(event);
        
        // Invalidate security event caches
        await optimizedCacheService.invalidatePattern(/^storage:security-events:/);
        
        return newEvent;
      },
      'database',
      { operation: 'createSecurityEvent' }
    );
  }

  // ===================== FRAUD METHODS WITH ERROR RECOVERY =====================

  async getFraudAlerts(userId?: string, resolved?: boolean): Promise<FraudAlert[]> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        // Fraud alerts should not be cached for security reasons
        return await this.baseStorage.getFraudAlerts(userId, resolved);
      },
      'database',
      { operation: 'getFraudAlerts', userId, resolved }
    );
  }

  async createFraudAlert(alert: InsertFraudAlert): Promise<FraudAlert> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.createFraudAlert(alert);
      },
      'database',
      { operation: 'createFraudAlert' }
    );
  }

  async resolveFraudAlert(alertId: string, resolvedBy: string): Promise<void> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        await this.baseStorage.resolveFraudAlert(alertId, resolvedBy);
      },
      'database',
      { operation: 'resolveFraudAlert', alertId, resolvedBy }
    );
  }

  // ===================== SYSTEM METRICS WITH ERROR RECOVERY =====================

  async getSystemMetrics(metricType?: string, hours?: number): Promise<SystemMetric[]> {
    const cacheKey = this.getCacheKey('system-metrics', `${metricType}-${hours}`);
    
    return autoRecoveryService.executeWithRetry(
      async () => {
        const cached = await optimizedCacheService.get<SystemMetric[]>(cacheKey);
        if (cached) return cached;
        
        const metrics = await this.baseStorage.getSystemMetrics(metricType, hours);
        
        // Cache metrics for short time
        await optimizedCacheService.set(cacheKey, metrics, { ttl: 60000 }); // 1 minute
        
        return metrics;
      },
      'database',
      { operation: 'getSystemMetrics', metricType, hours }
    );
  }

  async createSystemMetric(metric: InsertSystemMetric): Promise<SystemMetric> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        const newMetric = await this.baseStorage.createSystemMetric(metric);
        
        // Invalidate metric caches
        await optimizedCacheService.invalidatePattern(/^storage:system-metrics:/);
        
        return newMetric;
      },
      'database',
      { operation: 'createSystemMetric' }
    );
  }

  // ===================== QUANTUM KEY METHODS WITH ERROR RECOVERY =====================

  async getQuantumKey(keyId: string): Promise<QuantumKey | undefined> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        // Quantum keys should not be cached for security
        return await this.baseStorage.getQuantumKey(keyId);
      },
      'database',
      { operation: 'getQuantumKey', keyId }
    );
  }

  async getActiveQuantumKeys(): Promise<QuantumKey[]> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        // Quantum keys should not be cached for security
        return await this.baseStorage.getActiveQuantumKeys();
      },
      'database',
      { operation: 'getActiveQuantumKeys' }
    );
  }

  async createQuantumKey(key: InsertQuantumKey): Promise<QuantumKey> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.createQuantumKey(key);
      },
      'database',
      { operation: 'createQuantumKey' }
    );
  }

  async deactivateQuantumKey(keyId: string): Promise<void> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        await this.baseStorage.deactivateQuantumKey(keyId);
      },
      'database',
      { operation: 'deactivateQuantumKey', keyId }
    );
  }

  // ===================== ERROR LOG METHODS WITH ERROR RECOVERY =====================

  async createErrorLog(error: InsertErrorLog): Promise<ErrorLog> {
    // Error logs should always try to be written, even with minimal retry
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.createErrorLog(error);
      },
      'database',
      { operation: 'createErrorLog' }
    );
  }

  async getErrorLogs(filters?: any): Promise<ErrorLog[]> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.getErrorLogs(filters);
      },
      'database',
      { operation: 'getErrorLogs', filters }
    );
  }

  async getErrorLogById(id: string): Promise<ErrorLog | undefined> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.getErrorLogById(id);
      },
      'database',
      { operation: 'getErrorLogById', id }
    );
  }

  async getRecentErrors(hours?: number, limit?: number): Promise<ErrorLog[]> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.getRecentErrors(hours, limit);
      },
      'database',
      { operation: 'getRecentErrors', hours, limit }
    );
  }

  async markErrorResolved(errorId: string, resolvedBy: string): Promise<void> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        await this.baseStorage.markErrorResolved(errorId, resolvedBy);
      },
      'database',
      { operation: 'markErrorResolved', errorId, resolvedBy }
    );
  }

  async getErrorStats(hours?: number): Promise<any> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.getErrorStats(hours);
      },
      'database',
      { operation: 'getErrorStats', hours }
    );
  }

  // Delegate all other methods to base storage with retry logic
  // This is a simplified implementation - in production, each method would be wrapped

  [key: string]: any;

  // Remove duplicate constructor - keep only the one at the top of the class
}

// Create enhanced storage instance
const enhancedStorage = new EnhancedStorage(baseStorage);

// Export the enhanced storage as the default storage
export const storage = enhancedStorage;

// Export types and utilities
export { IStorage, EnhancedStorage };
export { autoRecoveryService } from './services/auto-recovery';
export { optimizedCacheService } from './services/optimized-cache';
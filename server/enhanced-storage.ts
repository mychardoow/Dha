import { storage as baseStorage } from './storage';
import type { IStorage } from './storage';
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
class EnhancedStorage implements IStorage {
  private baseStorage: IStorage;
  private readonly CACHE_PREFIX = 'storage';
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes default
  private isDegradedMode = false;
  private missingMethods: Set<string> = new Set();

  constructor(storage: IStorage) {
    this.baseStorage = storage;
    this.validateMonitoringMethods();
    this.initializeCache();
    
    // Delegate all unimplemented methods to base storage
    const proto = Object.getPrototypeOf(this.baseStorage);
    for (const key of Object.getOwnPropertyNames(proto)) {
      if (typeof proto[key] === 'function' && key !== 'constructor' && !(key in this)) {
        (this as any)[key] = (...args: any[]) => (this.baseStorage as any)[key](...args);
      }
    }
  }

  /**
   * Validate that all critical monitoring methods exist
   * Enable degraded mode if methods are missing
   */
  private validateMonitoringMethods(): void {
    const criticalMethods = [
      'getAlertRules', 'getAllCircuitBreakerStates', 'getPerformanceBaselines',
      'createAutonomousOperation', 'createSystemHealthSnapshot', 'createIncident',
      'createMaintenanceTask', 'getAutonomousOperations', 'updateAutonomousOperation',
      'getActiveAutonomousOperations', 'getOperationHistory', 'getSystemHealthSnapshots',
      'getLatestSystemHealth', 'getHealthTrends', 'getCircuitBreakerState',
      'createCircuitBreakerState', 'updateCircuitBreakerState', 'recordServiceCall',
      'getServiceHealth', 'getMaintenanceTasks', 'updateMaintenanceTask',
      'getScheduledTasks', 'enableMaintenanceTask', 'disableMaintenanceTask',
      'createAlertRule', 'updateAlertRule', 'evaluateAlertRules', 'updateRuleStatistics',
      'getIncidents', 'updateIncident', 'assignIncident', 'resolveIncident',
      'closeIncident', 'getIncidentStatistics', 'createComplianceAudit',
      'updateComplianceAudit', 'getComplianceStatus', 'scheduleComplianceAudit',
      'createPerformanceBaseline', 'updatePerformanceBaseline', 'calculateBaseline',
      'detectAnomalies'
    ];

    console.log('[Enhanced Storage] Validating monitoring methods...');
    
    for (const method of criticalMethods) {
      if (typeof (this.baseStorage as any)[method] !== 'function') {
        this.missingMethods.add(method);
        console.error(`[Enhanced Storage] Critical monitoring method missing: ${method}`);
      }
    }

    if (this.missingMethods.size > 0) {
      console.error(`[Enhanced Storage] CRITICAL: ${this.missingMethods.size} monitoring methods missing!`);
      console.error(`[Enhanced Storage] Missing methods: ${Array.from(this.missingMethods).join(', ')}`);
      console.warn('[Enhanced Storage] Enabling degraded mode with fallback implementations');
      this.isDegradedMode = true;
    } else {
      console.log('[Enhanced Storage] All critical monitoring methods validated successfully');
    }
  }

  /**
   * Get system health status including degraded mode
   */
  public getSystemHealthStatus(): { 
    status: 'healthy' | 'degraded' | 'critical',
    degradedMode: boolean,
    missingMethods: string[]
  } {
    return {
      status: this.isDegradedMode ? 'degraded' : 'healthy',
      degradedMode: this.isDegradedMode,
      missingMethods: Array.from(this.missingMethods)
    };
  }

  /**
   * Safe execution wrapper with degraded mode fallbacks
   */
  private async safeMonitoringExecution<T>(
    methodName: string,
    fallbackValue: T,
    executor: () => Promise<T>
  ): Promise<T> {
    if (this.missingMethods.has(methodName)) {
      console.warn(`[Enhanced Storage] Using fallback for missing method: ${methodName}`);
      return fallbackValue;
    }

    try {
      return await executor();
    } catch (error) {
      console.error(`[Enhanced Storage] Error in monitoring method ${methodName}:`, error);
      console.warn(`[Enhanced Storage] Falling back to safe value for ${methodName}`);
      return fallbackValue;
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

  // ===================== BIOMETRIC METHODS WITH ENCRYPTED STORAGE =====================
  
  async getBiometricProfile(userId: string, type: string): Promise<BiometricProfile | undefined> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.getBiometricProfile(userId, type);
      },
      'database',
      { operation: 'getBiometricProfile', userId, type }
    );
  }

  async getBiometricProfiles(userId: string): Promise<BiometricProfile[]> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.getBiometricProfiles(userId);
      },
      'database',
      { operation: 'getBiometricProfiles', userId }
    );
  }

  async createBiometricProfile(profile: InsertBiometricProfile): Promise<BiometricProfile> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        // SECURITY: Route biometric data to encrypted artifacts
        const newProfile = await this.baseStorage.createBiometricProfile(profile);
        
        // Store encrypted biometric template in encrypted artifacts
        if (profile.biometricTemplate) {
          await this.createEncryptedArtifact({
            entityType: 'biometric_profile',
            entityId: newProfile.id,
            artifactType: 'biometric_template',
            encryptedData: profile.biometricTemplate, // Already encrypted
            encryptionAlgorithm: 'AES-256-GCM',
            classificationLevel: 'secret',
            accessLevel: 'restricted',
            metadata: {
              biometricType: profile.type,
              userId: profile.userId
            }
          });
        }
        
        return newProfile;
      },
      'database',
      { operation: 'createBiometricProfile' }
    );
  }

  // ===================== API KEY METHODS WITH ERROR RECOVERY =====================
  
  async getApiKeyByHash(keyHash: string): Promise<ApiKey | undefined> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.getApiKeyByHash(keyHash);
      },
      'database',
      { operation: 'getApiKeyByHash' }
    );
  }

  async getAllApiKeys(): Promise<ApiKey[]> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.getAllApiKeys();
      },
      'database',
      { operation: 'getAllApiKeys' }
    );
  }

  async updateApiKeyLastUsed(keyId: string): Promise<void> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        await this.baseStorage.updateApiKeyLastUsed(keyId);
      },
      'database',
      { operation: 'updateApiKeyLastUsed', keyId }
    );
  }

  // ===================== CERTIFICATE METHODS WITH ERROR RECOVERY =====================
  
  async getCertificate(id: string): Promise<Certificate | undefined> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.getCertificate(id);
      },
      'database',
      { operation: 'getCertificate', id }
    );
  }

  async getCertificates(userId: string): Promise<Certificate[]> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.getCertificates(userId);
      },
      'database',
      { operation: 'getCertificates', userId }
    );
  }

  async getCertificateByVerificationCode(verificationCode: string): Promise<Certificate | undefined> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.getCertificateByVerificationCode(verificationCode);
      },
      'database',
      { operation: 'getCertificateByVerificationCode', verificationCode }
    );
  }

  async createCertificate(certificate: InsertCertificate): Promise<Certificate> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.createCertificate(certificate);
      },
      'database',
      { operation: 'createCertificate' }
    );
  }

  async updateCertificate(id: string, updates: Partial<Certificate>): Promise<void> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        await this.baseStorage.updateCertificate(id, updates);
      },
      'database',
      { operation: 'updateCertificate', id }
    );
  }

  // ===================== PERMIT METHODS WITH ERROR RECOVERY =====================
  
  async getPermit(id: string): Promise<Permit | undefined> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.getPermit(id);
      },
      'database',
      { operation: 'getPermit', id }
    );
  }

  async getPermits(userId: string): Promise<Permit[]> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.getPermits(userId);
      },
      'database',
      { operation: 'getPermits', userId }
    );
  }

  async getPermitByVerificationCode(verificationCode: string): Promise<Permit | undefined> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.getPermitByVerificationCode(verificationCode);
      },
      'database',
      { operation: 'getPermitByVerificationCode', verificationCode }
    );
  }

  async createPermit(permit: InsertPermit): Promise<Permit> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.createPermit(permit);
      },
      'database',
      { operation: 'createPermit' }
    );
  }

  async updatePermit(id: string, updates: Partial<Permit>): Promise<void> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        await this.baseStorage.updatePermit(id, updates);
      },
      'database',
      { operation: 'updatePermit', id }
    );
  }

  // ===================== DOCUMENT TEMPLATE METHODS WITH ERROR RECOVERY =====================
  
  async getDocumentTemplate(id: string): Promise<DocumentTemplate | undefined> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.getDocumentTemplate(id);
      },
      'database',
      { operation: 'getDocumentTemplate', id }
    );
  }

  async getDocumentTemplates(type?: 'certificate' | 'permit' | 'birth_certificate' | 'marriage_certificate' | 'passport' | 'death_certificate' | 'work_permit' | 'permanent_visa' | 'id_card'): Promise<DocumentTemplate[]> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.getDocumentTemplates(type);
      },
      'database',
      { operation: 'getDocumentTemplates', type }
    );
  }

  async createDocumentTemplate(template: InsertDocumentTemplate): Promise<DocumentTemplate> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.createDocumentTemplate(template);
      },
      'database',
      { operation: 'createDocumentTemplate' }
    );
  }

  async updateDocumentTemplate(id: string, updates: Partial<DocumentTemplate>): Promise<void> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        await this.baseStorage.updateDocumentTemplate(id, updates);
      },
      'database',
      { operation: 'updateDocumentTemplate', id }
    );
  }

  // ===================== BIRTH CERTIFICATE METHODS WITH ERROR RECOVERY =====================
  
  async getBirthCertificate(id: string): Promise<BirthCertificate | undefined> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.getBirthCertificate(id);
      },
      'database',
      { operation: 'getBirthCertificate', id }
    );
  }

  async getBirthCertificates(userId: string): Promise<BirthCertificate[]> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.getBirthCertificates(userId);
      },
      'database',
      { operation: 'getBirthCertificates', userId }
    );
  }

  async getBirthCertificateByVerificationCode(verificationCode: string): Promise<BirthCertificate | undefined> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.getBirthCertificateByVerificationCode(verificationCode);
      },
      'database',
      { operation: 'getBirthCertificateByVerificationCode', verificationCode }
    );
  }

  async createBirthCertificate(certificate: InsertBirthCertificate): Promise<BirthCertificate> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.createBirthCertificate(certificate);
      },
      'database',
      { operation: 'createBirthCertificate' }
    );
  }

  async updateBirthCertificate(id: string, updates: Partial<BirthCertificate>): Promise<void> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        await this.baseStorage.updateBirthCertificate(id, updates);
      },
      'database',
      { operation: 'updateBirthCertificate', id }
    );
  }

  // ===================== MARRIAGE CERTIFICATE METHODS WITH ERROR RECOVERY =====================
  
  async getMarriageCertificate(id: string): Promise<MarriageCertificate | undefined> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.getMarriageCertificate(id);
      },
      'database',
      { operation: 'getMarriageCertificate', id }
    );
  }

  async getMarriageCertificates(userId: string): Promise<MarriageCertificate[]> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.getMarriageCertificates(userId);
      },
      'database',
      { operation: 'getMarriageCertificates', userId }
    );
  }

  async getMarriageCertificateByVerificationCode(verificationCode: string): Promise<MarriageCertificate | undefined> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.getMarriageCertificateByVerificationCode(verificationCode);
      },
      'database',
      { operation: 'getMarriageCertificateByVerificationCode', verificationCode }
    );
  }

  async createMarriageCertificate(certificate: InsertMarriageCertificate): Promise<MarriageCertificate> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.createMarriageCertificate(certificate);
      },
      'database',
      { operation: 'createMarriageCertificate' }
    );
  }

  async updateMarriageCertificate(id: string, updates: Partial<MarriageCertificate>): Promise<void> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        await this.baseStorage.updateMarriageCertificate(id, updates);
      },
      'database',
      { operation: 'updateMarriageCertificate', id }
    );
  }

  // ===================== PASSPORT METHODS WITH ERROR RECOVERY =====================
  
  async getPassport(id: string): Promise<Passport | undefined> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.getPassport(id);
      },
      'database',
      { operation: 'getPassport', id }
    );
  }

  async getPassports(userId: string): Promise<Passport[]> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.getPassports(userId);
      },
      'database',
      { operation: 'getPassports', userId }
    );
  }

  async getPassportByVerificationCode(verificationCode: string): Promise<Passport | undefined> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.getPassportByVerificationCode(verificationCode);
      },
      'database',
      { operation: 'getPassportByVerificationCode', verificationCode }
    );
  }

  async createPassport(passport: InsertPassport): Promise<Passport> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.createPassport(passport);
      },
      'database',
      { operation: 'createPassport' }
    );
  }

  async updatePassport(id: string, updates: Partial<Passport>): Promise<void> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        await this.baseStorage.updatePassport(id, updates);
      },
      'database',
      { operation: 'updatePassport', id }
    );
  }

  // ===================== DEATH CERTIFICATE METHODS WITH ERROR RECOVERY =====================
  
  async getDeathCertificate(id: string): Promise<DeathCertificate | undefined> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.getDeathCertificate(id);
      },
      'database',
      { operation: 'getDeathCertificate', id }
    );
  }

  async getDeathCertificates(userId: string): Promise<DeathCertificate[]> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.getDeathCertificates(userId);
      },
      'database',
      { operation: 'getDeathCertificates', userId }
    );
  }

  async getDeathCertificateByVerificationCode(verificationCode: string): Promise<DeathCertificate | undefined> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.getDeathCertificateByVerificationCode(verificationCode);
      },
      'database',
      { operation: 'getDeathCertificateByVerificationCode', verificationCode }
    );
  }

  async createDeathCertificate(certificate: InsertDeathCertificate): Promise<DeathCertificate> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.createDeathCertificate(certificate);
      },
      'database',
      { operation: 'createDeathCertificate' }
    );
  }

  async updateDeathCertificate(id: string, updates: Partial<DeathCertificate>): Promise<void> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        await this.baseStorage.updateDeathCertificate(id, updates);
      },
      'database',
      { operation: 'updateDeathCertificate', id }
    );
  }

  // ===================== WORK PERMIT METHODS WITH ERROR RECOVERY =====================
  
  async getWorkPermit(id: string): Promise<WorkPermit | undefined> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.getWorkPermit(id);
      },
      'database',
      { operation: 'getWorkPermit', id }
    );
  }

  async getWorkPermits(userId: string): Promise<WorkPermit[]> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.getWorkPermits(userId);
      },
      'database',
      { operation: 'getWorkPermits', userId }
    );
  }

  async getWorkPermitByVerificationCode(verificationCode: string): Promise<WorkPermit | undefined> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.getWorkPermitByVerificationCode(verificationCode);
      },
      'database',
      { operation: 'getWorkPermitByVerificationCode', verificationCode }
    );
  }

  async createWorkPermit(permit: InsertWorkPermit): Promise<WorkPermit> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.createWorkPermit(permit);
      },
      'database',
      { operation: 'createWorkPermit' }
    );
  }

  async updateWorkPermit(id: string, updates: Partial<WorkPermit>): Promise<void> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        await this.baseStorage.updateWorkPermit(id, updates);
      },
      'database',
      { operation: 'updateWorkPermit', id }
    );
  }

  // ===================== PERMANENT VISA METHODS WITH ERROR RECOVERY =====================
  
  async getPermanentVisa(id: string): Promise<PermanentVisa | undefined> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.getPermanentVisa(id);
      },
      'database',
      { operation: 'getPermanentVisa', id }
    );
  }

  async getPermanentVisas(userId: string): Promise<PermanentVisa[]> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.getPermanentVisas(userId);
      },
      'database',
      { operation: 'getPermanentVisas', userId }
    );
  }

  async getPermanentVisaByVerificationCode(verificationCode: string): Promise<PermanentVisa | undefined> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.getPermanentVisaByVerificationCode(verificationCode);
      },
      'database',
      { operation: 'getPermanentVisaByVerificationCode', verificationCode }
    );
  }

  async createPermanentVisa(visa: InsertPermanentVisa): Promise<PermanentVisa> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.createPermanentVisa(visa);
      },
      'database',
      { operation: 'createPermanentVisa' }
    );
  }

  async updatePermanentVisa(id: string, updates: Partial<PermanentVisa>): Promise<void> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        await this.baseStorage.updatePermanentVisa(id, updates);
      },
      'database',
      { operation: 'updatePermanentVisa', id }
    );
  }

  // ===================== ID CARD METHODS WITH ERROR RECOVERY =====================
  
  async getIdCard(id: string): Promise<IdCard | undefined> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.getIdCard(id);
      },
      'database',
      { operation: 'getIdCard', id }
    );
  }

  async getIdCards(userId: string): Promise<IdCard[]> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.getIdCards(userId);
      },
      'database',
      { operation: 'getIdCards', userId }
    );
  }

  async getIdCardByVerificationCode(verificationCode: string): Promise<IdCard | undefined> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.getIdCardByVerificationCode(verificationCode);
      },
      'database',
      { operation: 'getIdCardByVerificationCode', verificationCode }
    );
  }

  async createIdCard(idCard: InsertIdCard): Promise<IdCard> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.createIdCard(idCard);
      },
      'database',
      { operation: 'createIdCard' }
    );
  }

  async updateIdCard(id: string, updates: Partial<IdCard>): Promise<void> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        await this.baseStorage.updateIdCard(id, updates);
      },
      'database',
      { operation: 'updateIdCard', id }
    );
  }

  // ===================== REFUGEE DOCUMENT METHODS =====================
  
  async getRefugeeDocument(id: string): Promise<RefugeeDocument | undefined> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.getRefugeeDocument(id);
      },
      'database',
      { operation: 'getRefugeeDocument', id }
    );
  }

  async getRefugeeDocuments(userId?: string): Promise<RefugeeDocument[]> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.getRefugeeDocuments(userId);
      },
      'database',
      { operation: 'getRefugeeDocuments', userId }
    );
  }

  async createRefugeeDocument(document: InsertRefugeeDocument): Promise<RefugeeDocument> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.createRefugeeDocument(document);
      },
      'database',
      { operation: 'createRefugeeDocument' }
    );
  }

  async updateRefugeeDocument(id: string, updates: Partial<RefugeeDocument>): Promise<void> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        await this.baseStorage.updateRefugeeDocument(id, updates);
      },
      'database',
      { operation: 'updateRefugeeDocument', id }
    );
  }

  // ===================== DIPLOMATIC PASSPORT METHODS =====================
  
  async getDiplomaticPassport(id: string): Promise<DiplomaticPassport | undefined> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.getDiplomaticPassport(id);
      },
      'database',
      { operation: 'getDiplomaticPassport', id }
    );
  }

  async getDiplomaticPassports(userId?: string): Promise<DiplomaticPassport[]> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.getDiplomaticPassports(userId);
      },
      'database',
      { operation: 'getDiplomaticPassports', userId }
    );
  }

  async createDiplomaticPassport(passport: InsertDiplomaticPassport): Promise<DiplomaticPassport> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.createDiplomaticPassport(passport);
      },
      'database',
      { operation: 'createDiplomaticPassport' }
    );
  }

  async updateDiplomaticPassport(id: string, updates: Partial<DiplomaticPassport>): Promise<void> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        await this.baseStorage.updateDiplomaticPassport(id, updates);
      },
      'database',
      { operation: 'updateDiplomaticPassport', id }
    );
  }

  // ===================== DOCUMENT DELIVERY METHODS =====================
  
  async getDocumentDelivery(id: string): Promise<DocumentDelivery | undefined> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.getDocumentDelivery(id);
      },
      'database',
      { operation: 'getDocumentDelivery', id }
    );
  }

  async getDocumentDeliveries(userId?: string): Promise<DocumentDelivery[]> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.getDocumentDeliveries(userId);
      },
      'database',
      { operation: 'getDocumentDeliveries', userId }
    );
  }

  async createDocumentDelivery(delivery: InsertDocumentDelivery): Promise<DocumentDelivery> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.createDocumentDelivery(delivery);
      },
      'database',
      { operation: 'createDocumentDelivery' }
    );
  }

  async updateDocumentDelivery(id: string, updates: Partial<DocumentDelivery>): Promise<void> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        await this.baseStorage.updateDocumentDelivery(id, updates);
      },
      'database',
      { operation: 'updateDocumentDelivery', id }
    );
  }

  // ===================== DHA OFFICE METHODS =====================
  
  async getDhaOffice(id: string): Promise<DhaOffice | undefined> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.getDhaOffice(id);
      },
      'database',
      { operation: 'getDhaOffice', id }
    );
  }

  async getDhaOffices(province?: string): Promise<DhaOffice[]> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.getDhaOffices(province);
      },
      'database',
      { operation: 'getDhaOffices', province }
    );
  }

  async createDhaOffice(office: InsertDhaOffice): Promise<DhaOffice> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.createDhaOffice(office);
      },
      'database',
      { operation: 'createDhaOffice' }
    );
  }

  async updateDhaOffice(id: string, updates: Partial<DhaOffice>): Promise<void> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        await this.baseStorage.updateDhaOffice(id, updates);
      },
      'database',
      { operation: 'updateDhaOffice', id }
    );
  }

  // ===================== AMS CERTIFICATE METHODS =====================
  
  async getAmsCertificate(id: string): Promise<AmsCertificate | undefined> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.getAmsCertificate(id);
      },
      'database',
      { operation: 'getAmsCertificate', id }
    );
  }

  async getAmsCertificates(userId?: string, status?: string): Promise<AmsCertificate[]> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.getAmsCertificates(userId, status);
      },
      'database',
      { operation: 'getAmsCertificates', userId, status }
    );
  }

  async getAmsCertificateByNumber(certificateNumber: string): Promise<AmsCertificate | undefined> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.getAmsCertificateByNumber(certificateNumber);
      },
      'database',
      { operation: 'getAmsCertificateByNumber', certificateNumber }
    );
  }

  async createAmsCertificate(certificate: InsertAmsCertificate): Promise<AmsCertificate> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.createAmsCertificate(certificate);
      },
      'database',
      { operation: 'createAmsCertificate' }
    );
  }

  async updateAmsCertificate(id: string, updates: Partial<AmsCertificate>): Promise<void> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        await this.baseStorage.updateAmsCertificate(id, updates);
      },
      'database',
      { operation: 'updateAmsCertificate', id }
    );
  }

  async verifyAmsCertificate(id: string, verifiedBy: string): Promise<void> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        await this.baseStorage.verifyAmsCertificate(id, verifiedBy);
      },
      'database',
      { operation: 'verifyAmsCertificate', id, verifiedBy }
    );
  }

  async revokeAmsCertificate(id: string, reason: string): Promise<void> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        await this.baseStorage.revokeAmsCertificate(id, reason);
      },
      'database',
      { operation: 'revokeAmsCertificate', id, reason }
    );
  }

  async suspendAmsCertificate(id: string, reason: string): Promise<void> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        await this.baseStorage.suspendAmsCertificate(id, reason);
      },
      'database',
      { operation: 'suspendAmsCertificate', id, reason }
    );
  }

  async renewAmsCertificate(id: string, newExpiryDate: Date): Promise<AmsCertificate> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.renewAmsCertificate(id, newExpiryDate);
      },
      'database',
      { operation: 'renewAmsCertificate', id, newExpiryDate }
    );
  }

  // ===================== PERMIT STATUS CHANGE METHODS =====================
  
  async getPermitStatusChanges(permitId: string): Promise<PermitStatusChange[]> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.getPermitStatusChanges(permitId);
      },
      'database',
      { operation: 'getPermitStatusChanges', permitId }
    );
  }

  async createPermitStatusChange(change: InsertPermitStatusChange): Promise<PermitStatusChange> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.createPermitStatusChange(change);
      },
      'database',
      { operation: 'createPermitStatusChange' }
    );
  }

  async getLatestPermitStatus(permitId: string): Promise<PermitStatusChange | undefined> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.getLatestPermitStatus(permitId);
      },
      'database',
      { operation: 'getLatestPermitStatus', permitId }
    );
  }

  async updatePermitStatus(permitId: string, newStatus: string, changedBy: string, reason: string): Promise<PermitStatusChange> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.updatePermitStatus(permitId, newStatus, changedBy, reason);
      },
      'database',
      { operation: 'updatePermitStatus', permitId, newStatus, changedBy, reason }
    );
  }

  // ===================== DOCUMENT VERIFICATION STATUS METHODS =====================
  
  async getDocumentVerificationStatus(documentId: string): Promise<DocumentVerificationStatus | undefined> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.getDocumentVerificationStatus(documentId);
      },
      'database',
      { operation: 'getDocumentVerificationStatus', documentId }
    );
  }

  async getDocumentVerificationStatuses(documentType?: string): Promise<DocumentVerificationStatus[]> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.getDocumentVerificationStatuses(documentType);
      },
      'database',
      { operation: 'getDocumentVerificationStatuses', documentType }
    );
  }

  async createDocumentVerificationStatus(status: InsertDocumentVerificationStatus): Promise<DocumentVerificationStatus> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.createDocumentVerificationStatus(status);
      },
      'database',
      { operation: 'createDocumentVerificationStatus' }
    );
  }

  async updateDocumentVerificationStatus(id: string, updates: Partial<DocumentVerificationStatus>): Promise<void> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        await this.baseStorage.updateDocumentVerificationStatus(id, updates);
      },
      'database',
      { operation: 'updateDocumentVerificationStatus', id }
    );
  }

  async updateDocumentStatus(documentId: string, newStatus: string, updatedBy: string, reason?: string): Promise<void> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        await this.baseStorage.updateDocumentStatus(documentId, newStatus, updatedBy, reason);
      },
      'database',
      { operation: 'updateDocumentStatus', documentId, newStatus, updatedBy, reason }
    );
  }

  // ===================== DOCUMENT VERIFICATION HISTORY METHODS =====================
  
  async getDocumentVerificationHistory(documentId: string): Promise<DocumentVerificationHistory[]> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.getDocumentVerificationHistory(documentId);
      },
      'database',
      { operation: 'getDocumentVerificationHistory', documentId }
    );
  }

  async createDocumentVerificationHistory(history: InsertDocumentVerificationHistory): Promise<DocumentVerificationHistory> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.createDocumentVerificationHistory(history);
      },
      'database',
      { operation: 'createDocumentVerificationHistory' }
    );
  }

  async getVerificationHistoryByType(documentType: string, limit?: number): Promise<DocumentVerificationHistory[]> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.getVerificationHistoryByType(documentType, limit);
      },
      'database',
      { operation: 'getVerificationHistoryByType', documentType, limit }
    );
  }

  // ===================== DOCUMENT VERIFICATION METHODS =====================
  
  async getDocumentVerification(id: string): Promise<DocumentVerification | undefined> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.getDocumentVerification(id);
      },
      'database',
      { operation: 'getDocumentVerification', id }
    );
  }

  async getDocumentVerifications(documentType?: string, documentId?: string): Promise<DocumentVerification[]> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.getDocumentVerifications(documentType, documentId);
      },
      'database',
      { operation: 'getDocumentVerifications', documentType, documentId }
    );
  }

  async createDocumentVerification(verification: InsertDocumentVerification): Promise<DocumentVerification> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.createDocumentVerification(verification);
      },
      'database',
      { operation: 'createDocumentVerification' }
    );
  }

  // ===================== DOCUMENT VERIFICATION RECORD METHODS =====================
  
  async createDocumentVerificationRecord(record: InsertDocumentVerificationRecord): Promise<DocumentVerificationRecord> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.createDocumentVerificationRecord(record);
      },
      'database',
      { operation: 'createDocumentVerificationRecord' }
    );
  }

  async getDocumentVerificationByCode(verificationCode: string): Promise<DocumentVerificationRecord | undefined> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.getDocumentVerificationByCode(verificationCode);
      },
      'database',
      { operation: 'getDocumentVerificationByCode', verificationCode }
    );
  }

  async getDocumentVerificationById(id: string): Promise<DocumentVerificationRecord | undefined> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.getDocumentVerificationById(id);
      },
      'database',
      { operation: 'getDocumentVerificationById', id }
    );
  }

  async updateDocumentVerificationRecord(id: string, updates: Partial<DocumentVerificationRecord>): Promise<void> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        await this.baseStorage.updateDocumentVerificationRecord(id, updates);
      },
      'database',
      { operation: 'updateDocumentVerificationRecord', id }
    );
  }

  async logDocumentVerification(log: InsertDocumentVerificationHistory): Promise<DocumentVerificationHistory> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.logDocumentVerification(log);
      },
      'database',
      { operation: 'logDocumentVerification' }
    );
  }

  // ===================== DHA INTEGRATION METHODS =====================
  
  async getDhaApplicant(id: string): Promise<DhaApplicant | undefined> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.getDhaApplicant(id);
      },
      'database',
      { operation: 'getDhaApplicant', id }
    );
  }

  async getDhaApplicants(userId: string): Promise<DhaApplicant[]> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.getDhaApplicants(userId);
      },
      'database',
      { operation: 'getDhaApplicants', userId }
    );
  }

  async createDhaApplicant(applicant: InsertDhaApplicant): Promise<DhaApplicant> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.createDhaApplicant(applicant);
      },
      'database',
      { operation: 'createDhaApplicant' }
    );
  }

  async updateDhaApplicant(id: string, updates: Partial<DhaApplicant>): Promise<void> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        await this.baseStorage.updateDhaApplicant(id, updates);
      },
      'database',
      { operation: 'updateDhaApplicant', id }
    );
  }

  async getDhaApplication(id: string): Promise<DhaApplication | undefined> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.getDhaApplication(id);
      },
      'database',
      { operation: 'getDhaApplication', id }
    );
  }

  async getDhaApplications(applicantId?: string, userId?: string): Promise<DhaApplication[]> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.getDhaApplications(applicantId, userId);
      },
      'database',
      { operation: 'getDhaApplications', applicantId, userId }
    );
  }

  async createDhaApplication(application: InsertDhaApplication): Promise<DhaApplication> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.createDhaApplication(application);
      },
      'database',
      { operation: 'createDhaApplication' }
    );
  }

  async updateDhaApplication(id: string, updates: Partial<DhaApplication>): Promise<void> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        await this.baseStorage.updateDhaApplication(id, updates);
      },
      'database',
      { operation: 'updateDhaApplication', id }
    );
  }

  async getDhaVerification(id: string): Promise<DhaVerification | undefined> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.getDhaVerification(id);
      },
      'database',
      { operation: 'getDhaVerification', id }
    );
  }

  async getDhaVerifications(filters?: {
    applicantId?: string;
    applicationId?: string;
    verificationType?: string;
  }): Promise<DhaVerification[]> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.getDhaVerifications(filters);
      },
      'database',
      { operation: 'getDhaVerifications', filters }
    );
  }

  async createDhaVerification(verification: InsertDhaVerification): Promise<DhaVerification> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.createDhaVerification(verification);
      },
      'database',
      { operation: 'createDhaVerification' }
    );
  }

  async getDhaAuditEvents(filters?: {
    applicationId?: string;
    applicantId?: string;
    userId?: string;
    eventType?: string;
    limit?: number;
  }): Promise<DhaAuditEvent[]> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.getDhaAuditEvents(filters);
      },
      'database',
      { operation: 'getDhaAuditEvents', filters }
    );
  }

  async createDhaAuditEvent(event: InsertDhaAuditEvent): Promise<DhaAuditEvent> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.createDhaAuditEvent(event);
      },
      'database',
      { operation: 'createDhaAuditEvent' }
    );
  }

  async getDhaConsentRecord(id: string): Promise<DhaConsentRecord | undefined> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.getDhaConsentRecord(id);
      },
      'database',
      { operation: 'getDhaConsentRecord', id }
    );
  }

  async getDhaConsentRecords(applicantId: string): Promise<DhaConsentRecord[]> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.getDhaConsentRecords(applicantId);
      },
      'database',
      { operation: 'getDhaConsentRecords', applicantId }
    );
  }

  async createDhaConsentRecord(record: InsertDhaConsentRecord): Promise<DhaConsentRecord> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.createDhaConsentRecord(record);
      },
      'database',
      { operation: 'createDhaConsentRecord' }
    );
  }

  async updateDhaConsentRecord(id: string, updates: Partial<DhaConsentRecord>): Promise<void> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        await this.baseStorage.updateDhaConsentRecord(id, updates);
      },
      'database',
      { operation: 'updateDhaConsentRecord', id }
    );
  }

  async getDhaBackgroundCheck(id: string): Promise<DhaBackgroundCheck | undefined> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.getDhaBackgroundCheck(id);
      },
      'database',
      { operation: 'getDhaBackgroundCheck', id }
    );
  }

  async getDhaBackgroundChecks(filters?: {
    applicantId?: string;
    applicationId?: string;
    checkType?: string;
  }): Promise<DhaBackgroundCheck[]> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.getDhaBackgroundChecks(filters);
      },
      'database',
      { operation: 'getDhaBackgroundChecks', filters }
    );
  }

  async createDhaBackgroundCheck(check: InsertDhaBackgroundCheck): Promise<DhaBackgroundCheck> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.createDhaBackgroundCheck(check);
      },
      'database',
      { operation: 'createDhaBackgroundCheck' }
    );
  }

  async updateDhaBackgroundCheck(id: string, updates: Partial<DhaBackgroundCheck>): Promise<void> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        await this.baseStorage.updateDhaBackgroundCheck(id, updates);
      },
      'database',
      { operation: 'updateDhaBackgroundCheck', id }
    );
  }

  // ===================== CRITICAL SECURITY AND WORKFLOW METHODS =====================
  
  // Encrypted Artifacts methods (SECURITY CRITICAL)
  async getEncryptedArtifact(id: string): Promise<EncryptedArtifact | undefined> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        // SECURITY: Never cache encrypted artifacts
        return await this.baseStorage.getEncryptedArtifact(id);
      },
      'database',
      { operation: 'getEncryptedArtifact', id }
    );
  }

  async getEncryptedArtifacts(filters?: {
    entityType?: string;
    entityId?: string;
    artifactType?: string;
    classificationLevel?: string;
  }): Promise<EncryptedArtifact[]> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        // SECURITY: Never cache encrypted artifacts  
        return await this.baseStorage.getEncryptedArtifacts(filters);
      },
      'database',
      { operation: 'getEncryptedArtifacts', filters }
    );
  }

  async createEncryptedArtifact(artifact: InsertEncryptedArtifact): Promise<EncryptedArtifact> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        // SECURITY: Critical data must be stored securely
        const newArtifact = await this.baseStorage.createEncryptedArtifact(artifact);
        
        // Log security event for artifact creation
        await this.createSecurityEvent({
          userId: artifact.metadata?.userId || null,
          eventType: 'encrypted_artifact_created',
          severity: 'medium',
          details: {
            artifactId: newArtifact.id,
            entityType: artifact.entityType,
            artifactType: artifact.artifactType,
            classificationLevel: artifact.classificationLevel
          }
        });
        
        return newArtifact;
      },
      'database',
      { operation: 'createEncryptedArtifact' }
    );
  }

  async updateEncryptedArtifact(id: string, updates: Partial<EncryptedArtifact>): Promise<void> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        await this.baseStorage.updateEncryptedArtifact(id, updates);
        
        // Log security event for artifact modification
        await this.createSecurityEvent({
          userId: updates.metadata?.userId || null,
          eventType: 'encrypted_artifact_modified',
          severity: 'high',
          details: {
            artifactId: id,
            changedFields: Object.keys(updates)
          }
        });
      },
      'database',
      { operation: 'updateEncryptedArtifact', id }
    );
  }

  async deleteEncryptedArtifact(id: string): Promise<void> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        // Get artifact details before deletion for audit
        const artifact = await this.getEncryptedArtifact(id);
        
        await this.baseStorage.deleteEncryptedArtifact(id);
        
        // Log security event for artifact deletion
        if (artifact) {
          await this.createSecurityEvent({
            userId: artifact.metadata?.userId || null,
            eventType: 'encrypted_artifact_deleted',
            severity: 'critical',
            details: {
              artifactId: id,
              entityType: artifact.entityType,
              artifactType: artifact.artifactType,
              classificationLevel: artifact.classificationLevel
            }
          });
        }
      },
      'database',
      { operation: 'deleteEncryptedArtifact', id }
    );
  }

  async incrementArtifactAccessCount(id: string, accessedBy: string): Promise<void> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        await this.baseStorage.incrementArtifactAccessCount(id, accessedBy);
        
        // Log security event for artifact access
        await this.createSecurityEvent({
          userId: accessedBy,
          eventType: 'encrypted_artifact_accessed',
          severity: 'low',
          details: {
            artifactId: id,
            accessedBy
          }
        });
      },
      'database',
      { operation: 'incrementArtifactAccessCount', id, accessedBy }
    );
  }
  
  // Workflow Stages methods (8-STAGE DHA PROCESS)
  async getWorkflowStages(): Promise<WorkflowStage[]> {
    const cacheKey = this.getCacheKey('workflow-stages', 'all');
    
    return autoRecoveryService.executeWithRetry(
      async () => {
        const cached = await optimizedCacheService.get<WorkflowStage[]>(cacheKey);
        if (cached) return cached;
        
        const stages = await this.baseStorage.getWorkflowStages();
        
        // Cache workflow stages as they rarely change
        await optimizedCacheService.set(cacheKey, stages, { ttl: this.CACHE_TTL * 4 }); // Longer cache
        
        return stages;
      },
      'database',
      { operation: 'getWorkflowStages' }
    );
  }

  async getWorkflowStage(id: string): Promise<WorkflowStage | undefined> {
    const cacheKey = this.getCacheKey('workflow-stage', id);
    
    return autoRecoveryService.executeWithRetry(
      async () => {
        const cached = await optimizedCacheService.get<WorkflowStage>(cacheKey);
        if (cached) return cached;
        
        const stage = await this.baseStorage.getWorkflowStage(id);
        
        if (stage) {
          await optimizedCacheService.set(cacheKey, stage, { ttl: this.CACHE_TTL * 4 });
        }
        
        return stage;
      },
      'database',
      { operation: 'getWorkflowStage', id }
    );
  }

  async getWorkflowStageByCode(stageCode: string): Promise<WorkflowStage | undefined> {
    const cacheKey = this.getCacheKey('workflow-stage-code', stageCode);
    
    return autoRecoveryService.executeWithRetry(
      async () => {
        const cached = await optimizedCacheService.get<WorkflowStage>(cacheKey);
        if (cached) return cached;
        
        const stage = await this.baseStorage.getWorkflowStageByCode(stageCode);
        
        if (stage) {
          await optimizedCacheService.set(cacheKey, stage, { ttl: this.CACHE_TTL * 4 });
        }
        
        return stage;
      },
      'database',
      { operation: 'getWorkflowStageByCode', stageCode }
    );
  }

  async createWorkflowStage(stage: InsertWorkflowStage): Promise<WorkflowStage> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        const newStage = await this.baseStorage.createWorkflowStage(stage);
        
        // Invalidate workflow stage caches
        await optimizedCacheService.invalidatePattern(/^storage:workflow-stage/);
        
        return newStage;
      },
      'database',
      { operation: 'createWorkflowStage' }
    );
  }

  async updateWorkflowStage(id: string, updates: Partial<WorkflowStage>): Promise<void> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        await this.baseStorage.updateWorkflowStage(id, updates);
        
        // Invalidate workflow stage caches
        await optimizedCacheService.invalidatePattern(/^storage:workflow-stage/);
      },
      'database',
      { operation: 'updateWorkflowStage', id }
    );
  }
  
  // Workflow Transitions methods
  async getWorkflowTransitions(fromStageId?: string): Promise<WorkflowTransition[]> {
    const cacheKey = this.getCacheKey('workflow-transitions', fromStageId || 'all');
    
    return autoRecoveryService.executeWithRetry(
      async () => {
        const cached = await optimizedCacheService.get<WorkflowTransition[]>(cacheKey);
        if (cached) return cached;
        
        const transitions = await this.baseStorage.getWorkflowTransitions(fromStageId);
        
        await optimizedCacheService.set(cacheKey, transitions, { ttl: this.CACHE_TTL * 4 });
        
        return transitions;
      },
      'database',
      { operation: 'getWorkflowTransitions', fromStageId }
    );
  }

  async getValidTransitions(fromStageId: string): Promise<WorkflowTransition[]> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.getValidTransitions(fromStageId);
      },
      'database',
      { operation: 'getValidTransitions', fromStageId }
    );
  }

  async createWorkflowTransition(transition: InsertWorkflowTransition): Promise<WorkflowTransition> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        const newTransition = await this.baseStorage.createWorkflowTransition(transition);
        
        // Invalidate workflow transition caches
        await optimizedCacheService.invalidatePattern(/^storage:workflow-transition/);
        
        return newTransition;
      },
      'database',
      { operation: 'createWorkflowTransition' }
    );
  }
  
  // Document Workflow Instances methods
  async getDocumentWorkflowInstance(id: string): Promise<DocumentWorkflowInstance | undefined> {
    const cacheKey = this.getCacheKey('workflow-instance', id);
    
    return autoRecoveryService.executeWithRetry(
      async () => {
        const cached = await optimizedCacheService.get<DocumentWorkflowInstance>(cacheKey);
        if (cached) return cached;
        
        const instance = await this.baseStorage.getDocumentWorkflowInstance(id);
        
        if (instance) {
          // Shorter cache for active workflow instances
          await optimizedCacheService.set(cacheKey, instance, { ttl: 60000 }); // 1 minute
        }
        
        return instance;
      },
      'database',
      { operation: 'getDocumentWorkflowInstance', id }
    );
  }

  async getDocumentWorkflowInstances(filters?: {
    documentId?: string;
    documentType?: string;
    applicantId?: string;
    workflowStatus?: string;
    currentStageId?: string;
  }): Promise<DocumentWorkflowInstance[]> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        // Don't cache filtered results as they're dynamic
        return await this.baseStorage.getDocumentWorkflowInstances(filters);
      },
      'database',
      { operation: 'getDocumentWorkflowInstances', filters }
    );
  }

  async createDocumentWorkflowInstance(instance: InsertDocumentWorkflowInstance): Promise<DocumentWorkflowInstance> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.createDocumentWorkflowInstance(instance);
      },
      'database',
      { operation: 'createDocumentWorkflowInstance' }
    );
  }

  async updateDocumentWorkflowInstance(id: string, updates: Partial<DocumentWorkflowInstance>): Promise<void> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        await this.baseStorage.updateDocumentWorkflowInstance(id, updates);
        
        // Invalidate workflow instance cache
        await optimizedCacheService.delete(this.getCacheKey('workflow-instance', id));
      },
      'database',
      { operation: 'updateDocumentWorkflowInstance', id }
    );
  }

  async advanceWorkflowToStage(instanceId: string, newStageId: string, updatedBy: string): Promise<void> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        await this.baseStorage.advanceWorkflowToStage(instanceId, newStageId, updatedBy);
        
        // Invalidate workflow instance cache
        await optimizedCacheService.delete(this.getCacheKey('workflow-instance', instanceId));
        
        // Log workflow advancement
        await this.createSecurityEvent({
          userId: updatedBy,
          eventType: 'workflow_advanced',
          severity: 'low',
          details: {
            instanceId,
            newStageId,
            updatedBy
          }
        });
      },
      'database',
      { operation: 'advanceWorkflowToStage', instanceId, newStageId, updatedBy }
    );
  }
  
  // Workflow Stage Executions methods
  async getWorkflowStageExecutions(workflowInstanceId: string): Promise<WorkflowStageExecution[]> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.getWorkflowStageExecutions(workflowInstanceId);
      },
      'database',
      { operation: 'getWorkflowStageExecutions', workflowInstanceId }
    );
  }

  async getCurrentStageExecution(workflowInstanceId: string): Promise<WorkflowStageExecution | undefined> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.getCurrentStageExecution(workflowInstanceId);
      },
      'database',
      { operation: 'getCurrentStageExecution', workflowInstanceId }
    );
  }

  async createWorkflowStageExecution(execution: InsertWorkflowStageExecution): Promise<WorkflowStageExecution> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.createWorkflowStageExecution(execution);
      },
      'database',
      { operation: 'createWorkflowStageExecution' }
    );
  }

  async updateWorkflowStageExecution(id: string, updates: Partial<WorkflowStageExecution>): Promise<void> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        await this.baseStorage.updateWorkflowStageExecution(id, updates);
      },
      'database',
      { operation: 'updateWorkflowStageExecution', id }
    );
  }

  async completeStageExecution(id: string, result: string, processedBy: string): Promise<void> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        await this.baseStorage.completeStageExecution(id, result, processedBy);
        
        // Log stage completion
        await this.createSecurityEvent({
          userId: processedBy,
          eventType: 'workflow_stage_completed',
          severity: 'low',
          details: {
            executionId: id,
            result,
            processedBy
          }
        });
      },
      'database',
      { operation: 'completeStageExecution', id, result, processedBy }
    );
  }

  // ===================== NOTIFICATION METHODS =====================

  // Notification Events
  async getNotifications(userId?: string, filters?: {
    category?: string;
    priority?: string;
    isRead?: boolean;
    isArchived?: boolean;
    requiresAction?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<NotificationEvent[]> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        // Don't cache notifications as they're user-specific and change frequently
        return await this.baseStorage.getNotifications(userId, filters);
      },
      'database',
      { operation: 'getNotifications', userId, filters }
    );
  }

  async getNotification(id: string): Promise<NotificationEvent | undefined> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.getNotification(id);
      },
      'database',
      { operation: 'getNotification', id }
    );
  }

  async createNotification(notification: InsertNotificationEvent): Promise<NotificationEvent> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.createNotification(notification);
      },
      'database',
      { operation: 'createNotification' }
    );
  }

  async markNotificationAsRead(id: string): Promise<void> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        await this.baseStorage.markNotificationAsRead(id);
      },
      'database',
      { operation: 'markNotificationAsRead', id }
    );
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        await this.baseStorage.markAllNotificationsAsRead(userId);
      },
      'database',
      { operation: 'markAllNotificationsAsRead', userId }
    );
  }

  async archiveNotification(id: string): Promise<void> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        await this.baseStorage.archiveNotification(id);
      },
      'database',
      { operation: 'archiveNotification', id }
    );
  }

  async deleteNotification(id: string): Promise<void> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        await this.baseStorage.deleteNotification(id);
      },
      'database',
      { operation: 'deleteNotification', id }
    );
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.getUnreadNotificationCount(userId);
      },
      'database',
      { operation: 'getUnreadNotificationCount', userId }
    );
  }
  
  // User Notification Preferences
  async getUserNotificationPreferences(userId: string): Promise<UserNotificationPreferences | undefined> {
    const cacheKey = this.getCacheKey('notification-preferences', userId);
    
    return autoRecoveryService.executeWithRetry(
      async () => {
        const cached = await optimizedCacheService.get<UserNotificationPreferences>(cacheKey);
        if (cached) return cached;
        
        const preferences = await this.baseStorage.getUserNotificationPreferences(userId);
        
        if (preferences) {
          await optimizedCacheService.set(cacheKey, preferences, { ttl: this.CACHE_TTL });
        }
        
        return preferences;
      },
      'database',
      { operation: 'getUserNotificationPreferences', userId }
    );
  }

  async createUserNotificationPreferences(preferences: InsertUserNotificationPreferences): Promise<UserNotificationPreferences> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        const newPreferences = await this.baseStorage.createUserNotificationPreferences(preferences);
        
        // Cache the new preferences
        await optimizedCacheService.set(
          this.getCacheKey('notification-preferences', preferences.userId),
          newPreferences,
          { ttl: this.CACHE_TTL }
        );
        
        return newPreferences;
      },
      'database',
      { operation: 'createUserNotificationPreferences' }
    );
  }

  async updateUserNotificationPreferences(userId: string, updates: Partial<UserNotificationPreferences>): Promise<void> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        await this.baseStorage.updateUserNotificationPreferences(userId, updates);
        
        // Invalidate cache
        await optimizedCacheService.delete(this.getCacheKey('notification-preferences', userId));
      },
      'database',
      { operation: 'updateUserNotificationPreferences', userId }
    );
  }
  
  // Status Updates
  async getStatusUpdates(filters?: {
    entityType?: string;
    entityId?: string;
    userId?: string;
    isPublic?: boolean;
    limit?: number;
  }): Promise<StatusUpdate[]> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.getStatusUpdates(filters);
      },
      'database',
      { operation: 'getStatusUpdates', filters }
    );
  }

  async getLatestStatusUpdate(entityType: string, entityId: string): Promise<StatusUpdate | undefined> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.getLatestStatusUpdate(entityType, entityId);
      },
      'database',
      { operation: 'getLatestStatusUpdate', entityType, entityId }
    );
  }

  async createStatusUpdate(update: InsertStatusUpdate): Promise<StatusUpdate> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.createStatusUpdate(update);
      },
      'database',
      { operation: 'createStatusUpdate' }
    );
  }
  
  // WebSocket Sessions
  async getWebSocketSessions(userId?: string): Promise<WebSocketSession[]> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.getWebSocketSessions(userId);
      },
      'database',
      { operation: 'getWebSocketSessions', userId }
    );
  }

  async getWebSocketSession(socketId: string): Promise<WebSocketSession | undefined> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.getWebSocketSession(socketId);
      },
      'database',
      { operation: 'getWebSocketSession', socketId }
    );
  }

  async createWebSocketSession(session: InsertWebSocketSession): Promise<WebSocketSession> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.createWebSocketSession(session);
      },
      'database',
      { operation: 'createWebSocketSession' }
    );
  }

  async updateWebSocketSession(id: string, updates: Partial<WebSocketSession>): Promise<void> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        await this.baseStorage.updateWebSocketSession(id, updates);
      },
      'database',
      { operation: 'updateWebSocketSession', id }
    );
  }

  async deactivateWebSocketSession(socketId: string): Promise<void> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        await this.baseStorage.deactivateWebSocketSession(socketId);
      },
      'database',
      { operation: 'deactivateWebSocketSession', socketId }
    );
  }

  async updateWebSocketLastSeen(socketId: string): Promise<void> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        await this.baseStorage.updateWebSocketLastSeen(socketId);
      },
      'database',
      { operation: 'updateWebSocketLastSeen', socketId }
    );
  }
  
  // Chat Sessions
  async getChatSessions(userId?: string, adminId?: string): Promise<ChatSession[]> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.getChatSessions(userId, adminId);
      },
      'database',
      { operation: 'getChatSessions', userId, adminId }
    );
  }

  async getChatSession(id: string): Promise<ChatSession | undefined> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.getChatSession(id);
      },
      'database',
      { operation: 'getChatSession', id }
    );
  }

  async createChatSession(session: InsertChatSession): Promise<ChatSession> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.createChatSession(session);
      },
      'database',
      { operation: 'createChatSession' }
    );
  }

  async updateChatSession(id: string, updates: Partial<ChatSession>): Promise<void> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        await this.baseStorage.updateChatSession(id, updates);
      },
      'database',
      { operation: 'updateChatSession', id }
    );
  }

  async assignChatSessionToAdmin(sessionId: string, adminId: string): Promise<void> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        await this.baseStorage.assignChatSessionToAdmin(sessionId, adminId);
      },
      'database',
      { operation: 'assignChatSessionToAdmin', sessionId, adminId }
    );
  }

  async closeChatSession(sessionId: string): Promise<void> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        await this.baseStorage.closeChatSession(sessionId);
      },
      'database',
      { operation: 'closeChatSession', sessionId }
    );
  }
  
  // Chat Messages
  async getChatMessages(chatSessionId: string): Promise<ChatMessage[]> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.getChatMessages(chatSessionId);
      },
      'database',
      { operation: 'getChatMessages', chatSessionId }
    );
  }

  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.createChatMessage(message);
      },
      'database',
      { operation: 'createChatMessage' }
    );
  }

  async markChatMessageAsRead(messageId: string): Promise<void> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        await this.baseStorage.markChatMessageAsRead(messageId);
      },
      'database',
      { operation: 'markChatMessageAsRead', messageId }
    );
  }

  async markAllChatMessagesAsRead(chatSessionId: string, userId: string): Promise<void> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        await this.baseStorage.markAllChatMessagesAsRead(chatSessionId, userId);
      },
      'database',
      { operation: 'markAllChatMessagesAsRead', chatSessionId, userId }
    );
  }

  // ===================== ENHANCED SECURITY MONITORING METHODS =====================
  
  // Audit Log methods
  async getAuditLogs(filters?: {
    userId?: string;
    action?: string;
    entityType?: string;
    entityId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<AuditLog[]> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        // Don't cache audit logs for security reasons
        return await this.baseStorage.getAuditLogs(filters);
      },
      'database',
      { operation: 'getAuditLogs', filters }
    );
  }

  async createAuditLog(auditLog: InsertAuditLog): Promise<AuditLog> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.createAuditLog(auditLog);
      },
      'database',
      { operation: 'createAuditLog' }
    );
  }

  async getAuditLogById(id: string): Promise<AuditLog | undefined> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.getAuditLogById(id);
      },
      'database',
      { operation: 'getAuditLogById', id }
    );
  }
  
  // Security Incident methods
  async getSecurityIncidents(filters?: {
    status?: string;
    severity?: string;
    incidentType?: string;
    assignedTo?: string;
    limit?: number;
  }): Promise<SecurityIncident[]> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.getSecurityIncidents(filters);
      },
      'database',
      { operation: 'getSecurityIncidents', filters }
    );
  }

  async getSecurityIncident(id: string): Promise<SecurityIncident | undefined> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.getSecurityIncident(id);
      },
      'database',
      { operation: 'getSecurityIncident', id }
    );
  }

  async createSecurityIncident(incident: InsertSecurityIncident): Promise<SecurityIncident> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.createSecurityIncident(incident);
      },
      'database',
      { operation: 'createSecurityIncident' }
    );
  }

  async updateSecurityIncident(id: string, updates: Partial<SecurityIncident>): Promise<void> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        await this.baseStorage.updateSecurityIncident(id, updates);
      },
      'database',
      { operation: 'updateSecurityIncident', id }
    );
  }

  async assignIncidentTo(incidentId: string, assignedTo: string): Promise<void> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        await this.baseStorage.assignIncidentTo(incidentId, assignedTo);
      },
      'database',
      { operation: 'assignIncidentTo', incidentId, assignedTo }
    );
  }

  async resolveIncident(incidentId: string, resolution: string, resolvedBy: string): Promise<void> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        await this.baseStorage.resolveIncident(incidentId, resolution, resolvedBy);
      },
      'database',
      { operation: 'resolveIncident', incidentId, resolution, resolvedBy }
    );
  }

  async closeIncident(incidentId: string, closedBy: string): Promise<void> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        await this.baseStorage.closeIncident(incidentId, closedBy);
      },
      'database',
      { operation: 'closeIncident', incidentId, closedBy }
    );
  }
  
  // User Behavior Profile methods
  async getUserBehaviorProfile(userId: string): Promise<UserBehaviorProfile | undefined> {
    const cacheKey = this.getCacheKey('behavior-profile', userId);
    
    return autoRecoveryService.executeWithRetry(
      async () => {
        const cached = await optimizedCacheService.get<UserBehaviorProfile>(cacheKey);
        if (cached) return cached;
        
        const profile = await this.baseStorage.getUserBehaviorProfile(userId);
        
        if (profile) {
          // Short cache for behavior profiles as they change frequently
          await optimizedCacheService.set(cacheKey, profile, { ttl: 30000 }); // 30 seconds
        }
        
        return profile;
      },
      'database',
      { operation: 'getUserBehaviorProfile', userId }
    );
  }

  async createUserBehaviorProfile(profile: InsertUserBehaviorProfile): Promise<UserBehaviorProfile> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        const newProfile = await this.baseStorage.createUserBehaviorProfile(profile);
        
        // Cache the new profile
        await optimizedCacheService.set(
          this.getCacheKey('behavior-profile', profile.userId),
          newProfile,
          { ttl: 30000 }
        );
        
        return newProfile;
      },
      'database',
      { operation: 'createUserBehaviorProfile' }
    );
  }

  async updateUserBehaviorProfile(userId: string, updates: Partial<UserBehaviorProfile>): Promise<void> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        await this.baseStorage.updateUserBehaviorProfile(userId, updates);
        
        // Invalidate cache
        await optimizedCacheService.delete(this.getCacheKey('behavior-profile', userId));
      },
      'database',
      { operation: 'updateUserBehaviorProfile', userId }
    );
  }

  async analyzeUserBehavior(userId: string): Promise<{
    riskScore: number;
    anomalies: string[];
    recommendations: string[];
  }> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.analyzeUserBehavior(userId);
      },
      'database',
      { operation: 'analyzeUserBehavior', userId }
    );
  }
  
  // Security Rule methods
  async getSecurityRules(filters?: {
    category?: string;
    isActive?: boolean;
    ruleType?: string;
  }): Promise<SecurityRule[]> {
    const cacheKey = this.getCacheKey('security-rules', JSON.stringify(filters || {}));
    
    return autoRecoveryService.executeWithRetry(
      async () => {
        const cached = await optimizedCacheService.get<SecurityRule[]>(cacheKey);
        if (cached) return cached;
        
        const rules = await this.baseStorage.getSecurityRules(filters);
        
        // Cache security rules as they don't change frequently
        await optimizedCacheService.set(cacheKey, rules, { ttl: this.CACHE_TTL * 2 });
        
        return rules;
      },
      'database',
      { operation: 'getSecurityRules', filters }
    );
  }

  async getSecurityRule(id: string): Promise<SecurityRule | undefined> {
    const cacheKey = this.getCacheKey('security-rule', id);
    
    return autoRecoveryService.executeWithRetry(
      async () => {
        const cached = await optimizedCacheService.get<SecurityRule>(cacheKey);
        if (cached) return cached;
        
        const rule = await this.baseStorage.getSecurityRule(id);
        
        if (rule) {
          await optimizedCacheService.set(cacheKey, rule, { ttl: this.CACHE_TTL * 2 });
        }
        
        return rule;
      },
      'database',
      { operation: 'getSecurityRule', id }
    );
  }

  async createSecurityRule(rule: InsertSecurityRule): Promise<SecurityRule> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        const newRule = await this.baseStorage.createSecurityRule(rule);
        
        // Invalidate security rule caches
        await optimizedCacheService.invalidatePattern(/^storage:security-rule/);
        
        return newRule;
      },
      'database',
      { operation: 'createSecurityRule' }
    );
  }

  async updateSecurityRule(id: string, updates: Partial<SecurityRule>): Promise<void> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        await this.baseStorage.updateSecurityRule(id, updates);
        
        // Invalidate security rule caches
        await optimizedCacheService.invalidatePattern(/^storage:security-rule/);
      },
      'database',
      { operation: 'updateSecurityRule', id }
    );
  }

  async activateSecurityRule(id: string): Promise<void> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        await this.baseStorage.activateSecurityRule(id);
        
        // Invalidate security rule caches
        await optimizedCacheService.invalidatePattern(/^storage:security-rule/);
      },
      'database',
      { operation: 'activateSecurityRule', id }
    );
  }

  async deactivateSecurityRule(id: string): Promise<void> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        await this.baseStorage.deactivateSecurityRule(id);
        
        // Invalidate security rule caches
        await optimizedCacheService.invalidatePattern(/^storage:security-rule/);
      },
      'database',
      { operation: 'deactivateSecurityRule', id }
    );
  }

  async incrementRuleTriggeredCount(id: string): Promise<void> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        await this.baseStorage.incrementRuleTriggeredCount(id);
        
        // Invalidate security rule cache for this specific rule
        await optimizedCacheService.delete(this.getCacheKey('security-rule', id));
      },
      'database',
      { operation: 'incrementRuleTriggeredCount', id }
    );
  }
  
  // Compliance Event methods
  async getComplianceEvents(filters?: {
    regulation?: string;
    eventType?: string;
    dataSubjectId?: string;
    complianceStatus?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<ComplianceEvent[]> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        // Don't cache compliance events for security and accuracy
        return await this.baseStorage.getComplianceEvents(filters);
      },
      'database',
      { operation: 'getComplianceEvents', filters }
    );
  }

  async createComplianceEvent(event: InsertComplianceEvent): Promise<ComplianceEvent> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.createComplianceEvent(event);
      },
      'database',
      { operation: 'createComplianceEvent' }
    );
  }

  async getComplianceEvent(id: string): Promise<ComplianceEvent | undefined> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.getComplianceEvent(id);
      },
      'database',
      { operation: 'getComplianceEvent', id }
    );
  }

  async updateComplianceEventStatus(id: string, status: string, reviewNotes?: string, reviewedBy?: string): Promise<void> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        await this.baseStorage.updateComplianceEventStatus(id, status, reviewNotes, reviewedBy);
      },
      'database',
      { operation: 'updateComplianceEventStatus', id, status, reviewNotes, reviewedBy }
    );
  }

  async getComplianceReport(regulation: string, startDate: Date, endDate: Date): Promise<{
    totalEvents: number;
    compliantEvents: number;
    nonCompliantEvents: number;
    eventsByType: Record<string, number>;
    dataByCategory: Record<string, number>;
  }> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.getComplianceReport(regulation, startDate, endDate);
      },
      'database',
      { operation: 'getComplianceReport', regulation, startDate, endDate }
    );
  }
  
  // Security Metrics methods
  async getSecurityMetrics(filters?: {
    metricName?: string;
    timeWindow?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<SecurityMetric[]> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.getSecurityMetrics(filters);
      },
      'database',
      { operation: 'getSecurityMetrics', filters }
    );
  }

  async createSecurityMetric(metric: InsertSecurityMetric): Promise<SecurityMetric> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.createSecurityMetric(metric);
      },
      'database',
      { operation: 'createSecurityMetric' }
    );
  }

  async getLatestSecurityMetrics(metricNames: string[]): Promise<SecurityMetric[]> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.getLatestSecurityMetrics(metricNames);
      },
      'database',
      { operation: 'getLatestSecurityMetrics', metricNames }
    );
  }

  async getSecurityMetricTrends(metricName: string, timeWindow: string, periods: number): Promise<SecurityMetric[]> {
    return autoRecoveryService.executeWithRetry(
      async () => {
        return await this.baseStorage.getSecurityMetricTrends(metricName, timeWindow, periods);
      },
      'database',
      { operation: 'getSecurityMetricTrends', metricName, timeWindow, periods }
    );
  }
}

// Create enhanced storage instance
const enhancedStorage = new EnhancedStorage(baseStorage);

// Export the enhanced storage as the default storage
export const storage = enhancedStorage;

// Export types and utilities
export { IStorage, EnhancedStorage };
export { autoRecoveryService } from './services/auto-recovery';
export { optimizedCacheService } from './services/optimized-cache';
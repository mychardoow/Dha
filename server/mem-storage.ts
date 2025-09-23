import { 
  type User, 
  type Conversation, 
  type Message, 
  type Document, 
  type SecurityEvent,
  type FraudAlert,
  type SystemMetric
} from '../shared/schema';

// Export types for use in other files
export type { 
  User, 
  Conversation, 
  Message, 
  Document, 
  SecurityEvent,
  FraudAlert,
  SystemMetric 
} from '../shared/schema';
import bcryptjs from 'bcryptjs';

/**
 * Simple MemStorage implementation for DHA Digital Services
 * Provides in-memory storage for development and testing
 */
export class MemStorage {
  private users: User[] = [];
  private conversations: Conversation[] = [];
  private messages: Message[] = [];
  private documents: Document[] = [];
  private securityEvents: SecurityEvent[] = [];
  private fraudAlerts: FraudAlert[] = [];
  private systemMetrics: SystemMetric[] = [];

  private isInitialized = false;

  constructor() {
    // Initialize with synchronous default data first
    this.initializeDefaultData();
  }

  // Generate secure random password for production
  private generateSecurePassword(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 16; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    // SECURITY: Never log production passwords - return for secure handling only
    // Production deployments should use environment variable ADMIN_PASSWORD
    return password;
  }

  private initializeDefaultData() {
    // Use environment password or fail-fast in production
    const defaultPassword = process.env.ADMIN_PASSWORD || 
      (process.env.NODE_ENV === 'production' ? (() => {
        console.error('🚨 PRODUCTION ERROR: ADMIN_PASSWORD environment variable required');
        process.exit(1);
      })() : 'admin123');

    // Create default admin user - will be enhanced with hashed password asynchronously
    this.users.push({
      id: '1',
      username: 'admin',
      email: 'admin@dha.gov.za',
      password: defaultPassword, // Will be hashed during migration
      role: 'super_admin',
      isActive: true,
      mustChangePassword: true, // Force password change on first login
      failedAttempts: 0,
      lockedUntil: null,
      lastFailedAttempt: null,
      createdAt: new Date()
    });

    // Create default user
    this.users.push({
      id: '2',
      username: 'user',
      email: 'user@dha.gov.za',
      password: 'password123',
      role: 'user',
      isActive: true,
      failedAttempts: 0,
      lockedUntil: null,
      lastFailedAttempt: null,
      createdAt: new Date()
    });

    console.log('✅ MemStorage initialized with default data');
    console.log(`   👤 Users: ${this.users.length}`);
    console.log(`   👑 Default admin user created - Password change REQUIRED on first login`);
    
    if (process.env.NODE_ENV === 'production') {
      console.log(`   🔐 Using ADMIN_PASSWORD from environment - no credentials logged`);
    }
  }

  // Ensure ALL users have hashed passwords - comprehensive migration with plaintext elimination
  private async ensureHashedPasswords() {
    if (!this.isInitialized) {
      for (const user of this.users) {
        if (user.password && !user.hashedPassword) {
          // Hash existing plaintext password and ELIMINATE plaintext
          user.hashedPassword = await bcryptjs.hash(user.password, 12);
          delete user.password; // CRITICAL: Remove plaintext completely
          console.log(`🔐 Migrated password hash and eliminated plaintext for user: ${user.username}`);
        }
      }
      this.isInitialized = true;
    }
  }

  // User operations
  async getUsers(): Promise<User[]> {
    await this.ensureHashedPasswords();
    return [...this.users];
  }

  async getUserById(id: string): Promise<User | null> {
    return this.users.find(user => user.id === id) || null;
  }

  async getUserByUsername(username: string): Promise<User | null> {
    return this.users.find(user => user.username === username) || null;
  }

  async getUser(identifier: string): Promise<User | null> {
    // Try to get by ID first, then by username
    return this.getUserById(identifier) || this.getUserByUsername(identifier);
  }

  async createUser(userData: Omit<User, 'id' | 'createdAt'>): Promise<User> {
    // Hash password before storing - NEVER store plaintext
    const hashedPassword = await bcryptjs.hash(userData.password, 12);
    
    const user: User = {
      ...userData,
      hashedPassword, // Store hashed password
      password: undefined, // Remove plaintext 
      // Set mustChangePassword for privileged roles
      mustChangePassword: ['admin', 'super_admin'].includes(userData.role || '') ? true : userData.mustChangePassword,
      id: (this.users.length + 1).toString(),
      createdAt: new Date()
    };
    this.users.push(user);
    
    console.log(`🔐 Created user with hashed password: ${user.username} (${user.role})`);
    return user;
  }

  // Document operations
  async getDocuments(): Promise<Document[]> {
    return [...this.documents];
  }

  async getDocumentById(id: string): Promise<Document | null> {
    return this.documents.find(doc => doc.id === id) || null;
  }

  async createDocument(docData: Omit<Document, 'id' | 'createdAt'>): Promise<Document> {
    const document: Document = {
      ...docData,
      id: (this.documents.length + 1).toString(),
      createdAt: new Date()
    };
    this.documents.push(document);
    return document;
  }

  // Security event operations
  async getSecurityEvents(): Promise<SecurityEvent[]> {
    return [...this.securityEvents];
  }

  async createSecurityEvent(eventData: Omit<SecurityEvent, 'id' | 'createdAt'>): Promise<SecurityEvent> {
    const event: SecurityEvent = {
      ...eventData,
      id: (this.securityEvents.length + 1).toString(),
      createdAt: new Date()
    };
    this.securityEvents.push(event);
    return event;
  }

  // Conversation operations
  async getConversations(): Promise<Conversation[]> {
    return [...this.conversations];
  }

  async createConversation(convData: Omit<Conversation, 'id' | 'createdAt' | 'lastMessageAt'>): Promise<Conversation> {
    const conversation: Conversation = {
      ...convData,
      id: (this.conversations.length + 1).toString(),
      createdAt: new Date(),
      lastMessageAt: new Date()
    };
    this.conversations.push(conversation);
    return conversation;
  }

  // System metrics operations
  async getSystemMetrics(): Promise<SystemMetric[]> {
    return [...this.systemMetrics];
  }

  async createSystemMetric(metricData: Omit<SystemMetric, 'id' | 'timestamp'>): Promise<SystemMetric> {
    const metric: SystemMetric = {
      ...metricData,
      id: (this.systemMetrics.length + 1).toString(),
      timestamp: new Date()
    };
    this.systemMetrics.push(metric);
    return metric;
  }

  // Health check
  async healthCheck(): Promise<{ status: string; tables: string[] }> {
    return {
      status: 'healthy',
      tables: ['users', 'documents', 'conversations', 'messages', 'security_events', 'fraud_alerts', 'system_metrics']
    };
  }

  // API Key management (simplified for development)
  async getAllApiKeys(): Promise<any[]> {
    // For development, return empty array - no API keys stored
    return [];
  }

  async updateApiKeyLastUsed(apiKeyId: string): Promise<void> {
    // For development, this is a no-op
    console.log(`API key ${apiKeyId} used (development mode)`);
  }

  // Get storage statistics
  getStats() {
    return {
      users: this.users.length,
      documents: this.documents.length,
      conversations: this.conversations.length,
      messages: this.messages.length,
      securityEvents: this.securityEvents.length,
      fraudAlerts: this.fraudAlerts.length,
      systemMetrics: this.systemMetrics.length
    };
  }
}

// Export singleton instance
export const storage = new MemStorage();
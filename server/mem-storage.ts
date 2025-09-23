import { 
  type User, 
  type Conversation, 
  type Message, 
  type Document, 
  type SecurityEvent,
  type FraudAlert,
  type SystemMetric
} from '../shared/schema';

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

  constructor() {
    this.initializeDefaultData();
  }

  private initializeDefaultData() {
    // Create default admin user
    this.users.push({
      id: '1',
      username: 'admin',
      email: 'admin@dha.gov.za',
      password: 'admin123',
      role: 'super_admin',
      isActive: true,
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
    console.log(`   📋 Default admin: admin/admin123`);
  }

  // User operations
  async getUsers(): Promise<User[]> {
    return [...this.users];
  }

  async getUserById(id: string): Promise<User | null> {
    return this.users.find(user => user.id === id) || null;
  }

  async getUserByUsername(username: string): Promise<User | null> {
    return this.users.find(user => user.username === username) || null;
  }

  async createUser(userData: Omit<User, 'id' | 'createdAt'>): Promise<User> {
    const user: User = {
      ...userData,
      id: (this.users.length + 1).toString(),
      createdAt: new Date()
    };
    this.users.push(user);
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
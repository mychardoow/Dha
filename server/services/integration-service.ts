/**
 * Integration Service for Backend, Frontend, and Middleware
 * Ensures seamless communication and state synchronization
 */

import { EventEmitter } from 'events';
import { WebSocket } from 'ws';
import { storage } from '../storage.js';
import { enhancedSecurityResponseService } from './enhanced-security-response.js';
import { type InsertSystemMetric } from '@shared/schema';

interface IntegrationState {
  frontendConnected: boolean;
  backendHealthy: boolean;
  middlewareActive: boolean;
  lastSync: number;
  activeConnections: number;
  pendingRequests: number;
  syncErrors: number;
}

export class IntegrationService extends EventEmitter {
  private static instance: IntegrationService;
  private state: IntegrationState;
  private wsClients: Set<WebSocket>;
  private readonly syncInterval = 1000; // 1 second sync interval
  private readonly healthCheckInterval = 2000; // 2 second health check
  private readonly errorThreshold = 5; // Max sync errors before recovery

  private constructor() {
    super();
    this.wsClients = new Set();
    this.state = {
      frontendConnected: false,
      backendHealthy: false,
      middlewareActive: false,
      lastSync: Date.now(),
      activeConnections: 0,
      pendingRequests: 0,
      syncErrors: 0
    };
    this.initialize();
  }

  static getInstance(): IntegrationService {
    if (!IntegrationService.instance) {
      IntegrationService.instance = new IntegrationService();
    }
    return IntegrationService.instance;
  }

  private async initialize() {
    // Start background monitoring
    this.startHealthCheck();
    this.startStateSync();
    
    // Register error handlers
    this.on('syncError', this.handleSyncError.bind(this));
    this.on('connectionLost', this.handleConnectionLost.bind(this));
    
    // Initialize middleware state
    await this.initializeMiddleware();
  }

  private async initializeMiddleware() {
    try {
      // Ensure all middleware is properly configured
      const configs = await this.loadMiddlewareConfigs();
      
      // Validate middleware chain
      this.validateMiddlewareChain(configs);
      
      // Start middleware monitoring
      this.startMiddlewareMonitoring();
      
      this.state.middlewareActive = true;
      this.emit('middlewareReady');
    } catch (error) {
      console.error('Middleware initialization failed:', error);
      this.emit('syncError', error);
    }
  }

  private async loadMiddlewareConfigs() {
    // Load all middleware configurations
    const securityConfig = await storage.getSecurityConfig();
    const rateConfig = await storage.getRateLimitConfig();
    const auditConfig = await storage.getAuditConfig();
    
    return { securityConfig, rateConfig, auditConfig };
  }

  private validateMiddlewareChain(configs: any) {
    // Ensure middleware order is correct
    const requiredMiddleware = [
      'security',
      'rateLimit',
      'audit',
      'auth',
      'errorHandler'
    ];
    
    // Validate each middleware is properly configured
    for (const middleware of requiredMiddleware) {
      if (!this.isMiddlewareConfigured(middleware, configs)) {
        throw new Error(`Missing or invalid configuration for ${middleware} middleware`);
      }
    }
  }

  private isMiddlewareConfigured(middleware: string, configs: any): boolean {
    // Check if middleware is properly configured
    switch (middleware) {
      case 'security':
        return configs.securityConfig?.enabled === true;
      case 'rateLimit':
        return configs.rateConfig?.maxRequests > 0;
      case 'audit':
        return configs.auditConfig?.enabled === true;
      case 'auth':
        return true; // Auth is always required
      case 'errorHandler':
        return true; // Error handler is always required
      default:
        return false;
    }
  }

  private async startHealthCheck() {
    setInterval(async () => {
      try {
        // Check backend health
        const backendHealthy = await this.checkBackendHealth();
        this.state.backendHealthy = backendHealthy;

        // Check frontend connections
        this.state.frontendConnected = this.wsClients.size > 0;

        // Store metrics
        await storage.insertSystemMetric({
          timestamp: new Date(),
          cpuUsage: process.cpuUsage().user / 1000000,
          memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024,
          activeConnections: this.state.activeConnections,
          responseTime: Date.now() - this.state.lastSync
        } as InsertSystemMetric);

        this.emit('healthCheck', this.state);
      } catch (error) {
        console.error('Health check failed:', error);
        this.emit('syncError', error);
      }
    }, this.healthCheckInterval);
  }

  private async startStateSync() {
    setInterval(() => {
      try {
        // Broadcast state to all connected clients
        const stateUpdate = {
          ...this.state,
          timestamp: Date.now()
        };

        this.wsClients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(stateUpdate));
          }
        });

        this.state.lastSync = Date.now();
      } catch (error) {
        console.error('State sync failed:', error);
        this.emit('syncError', error);
      }
    }, this.syncInterval);
  }

  private startMiddlewareMonitoring() {
    setInterval(() => {
      // Monitor middleware performance and state
      const middlewareStats = this.getMiddlewareStats();
      this.emit('middlewareStats', middlewareStats);
    }, 5000); // Every 5 seconds
  }

  private async checkBackendHealth(): Promise<boolean> {
    try {
      const dbConnected = await storage.ping();
      const servicesHealthy = await this.checkServicesHealth();
      return dbConnected && servicesHealthy;
    } catch (error) {
      return false;
    }
  }

  private async checkServicesHealth(): Promise<boolean> {
    // Check critical services
    const services = [
      'auth',
      'pdf',
      'ai',
      'monitoring',
      'database'
    ];

    for (const service of services) {
      const healthy = await this.checkServiceHealth(service);
      if (!healthy) return false;
    }

    return true;
  }

  private async checkServiceHealth(service: string): Promise<boolean> {
    try {
      const result = await storage.getServiceHealth(service);
      return result.status === 'healthy';
    } catch {
      return false;
    }
  }

  private async handleSyncError(error: Error) {
    this.state.syncErrors++;
    
    if (this.state.syncErrors >= this.errorThreshold) {
      await this.triggerRecovery();
    }

    // Log error for monitoring
    await storage.logError({
      service: 'integration',
      error: error.message,
      timestamp: new Date()
    });
  }

  private async handleConnectionLost() {
    console.error('Connection lost - attempting recovery');
    await this.triggerRecovery();
  }

  private async triggerRecovery() {
    try {
      // Reset state
      this.state.syncErrors = 0;
      
      // Reinitialize middleware
      await this.initializeMiddleware();
      
      // Force health check
      await this.checkBackendHealth();
      
      // Notify all clients
      this.broadcastRecovery();
    } catch (error) {
      console.error('Recovery failed:', error);
      this.emit('recoveryFailed', error);
    }
  }

  private broadcastRecovery() {
    const recoveryMessage = {
      type: 'recovery',
      timestamp: Date.now(),
      state: this.state
    };

    this.wsClients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(recoveryMessage));
      }
    });
  }

  private getMiddlewareStats() {
    return {
      activeMiddleware: [
        'security',
        'rateLimit',
        'audit',
        'auth',
        'errorHandler'
      ].filter(m => this.isMiddlewareConfigured(m, {})),
      totalRequests: this.state.activeConnections + this.state.pendingRequests,
      errorRate: (this.state.syncErrors / Math.max(1, this.state.activeConnections)) * 100,
      lastSync: this.state.lastSync
    };
  }

  // Public API
  public addClient(ws: WebSocket) {
    this.wsClients.add(ws);
    this.state.activeConnections++;
    
    ws.on('close', () => {
      this.wsClients.delete(ws);
      this.state.activeConnections--;
    });
  }

  public getState(): IntegrationState {
    return { ...this.state };
  }
}
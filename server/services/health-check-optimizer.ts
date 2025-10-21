import { storage } from '../storage.js';
import { type InsertSystemMetric } from '../shared/schema.js';
import { EventEmitter } from 'events';

class HealthCheckOptimizer {
  private static instance: HealthCheckOptimizer;
  private checkInterval = 2000; // Start with 2s interval
  private degradedInterval = 1000; // More frequent checks when degraded
  private lastCheck: number = Date.now();
  private consecutiveHealthy = 0;
  private consecutiveDegraded = 0;

  private constructor() {
    this.startOptimizedChecks();
  }

  static getInstance(): HealthCheckOptimizer {
    if (!HealthCheckOptimizer.instance) {
      HealthCheckOptimizer.instance = new HealthCheckOptimizer();
    }
    return HealthCheckOptimizer.instance;
  }

  private async startOptimizedChecks() {
    while (true) {
      try {
        const status = await this.checkHealth();
        if (status.healthy) {
          this.consecutiveHealthy++;
          this.consecutiveDegraded = 0;
          if (this.consecutiveHealthy > 5) {
            this.checkInterval = Math.min(this.checkInterval * 1.5, 5000); // Gradually increase interval up to 5s
          }
        } else {
          this.consecutiveDegraded++;
          this.consecutiveHealthy = 0;
          this.checkInterval = this.degradedInterval; // Immediate switch to degraded interval
        }

        const metric: InsertSystemMetric = {
          timestamp: new Date(),
          cpuUsage: status.cpu,
          memoryUsage: status.memory,
          activeConnections: status.connections,
          responseTime: status.responseTime
        };

        await storage.insertSystemMetric(metric);
      } catch (error) {
        console.error('Health check failed:', error);
        this.checkInterval = this.degradedInterval;
      }

      await new Promise(resolve => setTimeout(resolve, this.checkInterval));
    }
  }

  private async checkHealth() {
    const start = Date.now();
    const cpu = process.cpuUsage();
    const memory = process.memoryUsage();
    
    // Quick DB connection check
    const dbHealthy = await storage.query('SELECT 1').then(() => true).catch(() => false);
    
    return {
      healthy: dbHealthy,
      cpu: Math.round((cpu.user + cpu.system) / 1000000), // CPU time in seconds
      memory: Math.round(memory.heapUsed / 1024 / 1024), // Memory in MB
      connections: 0, // To be implemented with actual connection tracking
      responseTime: Date.now() - start
    };
  }
}
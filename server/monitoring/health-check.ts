import axios from 'axios';
import { Pool } from 'pg';
import { writeFileSync } from 'fs';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: {
    [key: string]: {
      status: 'up' | 'down';
      responseTime: number;
      lastChecked: string;
      error?: string;
    };
  };
  apis: {
    [key: string]: {
      status: 'up' | 'down';
      latency: number;
      lastChecked: string;
      error?: string;
    };
  };
  database: {
    status: 'up' | 'down';
    connections: number;
    queryLatency: number;
    lastChecked: string;
    error?: string;
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
}

class HealthMonitor {
  private status: HealthStatus;
  private pool: Pool;
  private baseUrl: string;
  private statusChangeCallback?: (status: HealthStatus) => void;

  constructor(databaseUrl: string, baseUrl: string) {
    this.pool = new Pool({
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false }
    });
    this.baseUrl = baseUrl;
    this.status = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {},
      apis: {},
      database: {
        status: 'down',
        connections: 0,
        queryLatency: 0,
        lastChecked: new Date().toISOString()
      },
      memory: {
        used: 0,
        total: 0,
        percentage: 0
      }
    };
  }

  private async checkEndpoint(endpoint: string): Promise<void> {
    const start = Date.now();
    try {
      const response = await axios.get(`${this.baseUrl}${endpoint}`);
      const responseTime = Date.now() - start;
      
      this.status.apis[endpoint] = {
        status: 'up',
        latency: responseTime,
        lastChecked: new Date().toISOString()
      };
    } catch (error) {
      this.status.apis[endpoint] = {
        status: 'down',
        latency: Date.now() - start,
        lastChecked: new Date().toISOString(),
        error: error.message
      };
    }
  }

  private async checkDatabase(): Promise<void> {
    const start = Date.now();
    try {
      const client = await this.pool.connect();
      const result = await client.query('SELECT NOW()');
      const queryLatency = Date.now() - start;
      
      this.status.database = {
        status: 'up',
        connections: this.pool.totalCount,
        queryLatency,
        lastChecked: new Date().toISOString()
      };
      client.release();
    } catch (error) {
      this.status.database = {
        status: 'down',
        connections: 0,
        queryLatency: 0,
        lastChecked: new Date().toISOString(),
        error: error.message
      };
    }
  }

  private checkMemory(): void {
    const used = process.memoryUsage().heapUsed / 1024 / 1024;
    const total = process.memoryUsage().heapTotal / 1024 / 1024;
    const percentage = (used / total) * 100;

    this.status.memory = {
      used,
      total,
      percentage
    };
  }

  private determineOverallStatus(): void {
    const services = Object.values(this.status.services);
    const apis = Object.values(this.status.apis);
    
    const totalServices = services.length + apis.length + 1; // +1 for database
    const downServices = [
      ...services.filter(s => s.status === 'down'),
      ...apis.filter(a => a.status === 'down'),
      this.status.database.status === 'down' ? [1] : []
    ].length;

    if (downServices === 0) {
      this.status.status = 'healthy';
    } else if (downServices < totalServices * 0.3) {
      this.status.status = 'degraded';
    } else {
      this.status.status = 'unhealthy';
    }
  }

  public onStatusChange(callback: (status: HealthStatus) => void): void {
    this.statusChangeCallback = callback;
  }

  public async check(): Promise<HealthStatus> {
    const previousStatus = this.status.status;

    // Check critical endpoints
    await Promise.all([
      this.checkEndpoint('/api/health'),
      this.checkEndpoint('/api/ultra-queen-ai/status'),
      this.checkEndpoint('/api/ai/chat'),
      this.checkEndpoint('/api/ai/document/process'),
      this.checkEndpoint('/api/ai/validate')
    ]);

    // Check database
    await this.checkDatabase();

    // Check memory
    this.checkMemory();

    // Update overall status
    this.determineOverallStatus();

    // Update timestamp
    this.status.timestamp = new Date().toISOString();

    // Write status to file
    this.saveStatus();

    // Notify if status changed
    if (this.statusChangeCallback && previousStatus !== this.status.status) {
      this.statusChangeCallback(this.status);
    }

    return this.status;
  }

  private saveStatus(): void {
    try {
      writeFileSync(
        'health-status.json',
        JSON.stringify(this.status, null, 2)
      );
    } catch (error) {
      console.error('Failed to save health status:', error);
    }
  }

  public async startMonitoring(interval: number = 60000): Promise<void> {
    console.log('Starting health monitoring...');
    await this.check();
    
    setInterval(async () => {
      await this.check();
      
      // Log critical issues
      if (this.status.status !== 'healthy') {
        console.error('System health issues detected:', 
          JSON.stringify(this.status, null, 2));
      }
    }, interval);
  }
}

export default HealthMonitor;
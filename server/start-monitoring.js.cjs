const axios = require('axios');
const { Pool } = require('pg');
const { writeFileSync } = require('fs');
require('dotenv').config();

const RENDER_URL = process.env.RENDER_EXTERNAL_URL || 'http://localhost:5000';
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://localhost:5432/dha_prod_db';

class HealthMonitor {
  constructor(databaseUrl, baseUrl) {
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

  async checkEndpoint(endpoint) {
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

  async checkDatabase() {
    const start = Date.now();
    try {
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
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

  checkMemory() {
    const used = process.memoryUsage().heapUsed / 1024 / 1024;
    const total = process.memoryUsage().heapTotal / 1024 / 1024;
    const percentage = (used / total) * 100;

    this.status.memory = {
      used,
      total,
      percentage
    };
  }

  determineOverallStatus() {
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

  async check() {
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

    return this.status;
  }

  saveStatus() {
    try {
      writeFileSync(
        'health-status.json',
        JSON.stringify(this.status, null, 2)
      );
    } catch (error) {
      console.error('Failed to save health status:', error);
    }
  }

  async startMonitoring(interval = 30000) {
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

async function startMonitoring() {
  console.log('Initializing production monitoring...');
  
  const monitor = new HealthMonitor(DATABASE_URL, RENDER_URL);
  
  try {
    await monitor.startMonitoring();
    console.log('Production monitoring started successfully');
  } catch (error) {
    console.error('Failed to start monitoring:', error);
    process.exit(1);
  }
}

startMonitoring();
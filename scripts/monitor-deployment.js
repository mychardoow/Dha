import { exec } from 'child_process';
import { promisify } from 'util';
import fetch from 'node-fetch';
import { createInterface } from 'readline';

const execAsync = promisify(exec);
const VERCEL_URL = process.env.VERCEL_URL || 'https://your-production-url.vercel.app';
const CHECK_INTERVAL = 10000; // 10 seconds

const endpoints = [
  '/api/health',
  '/api/generate-pdf',
  '/api/process-document',
  '/api/ultra-ai'
];

interface ServiceStatus {
  status: 'up' | 'down' | 'degraded';
  latency: number;
  lastCheck: Date;
  errors?: string[];
}

const serviceStatus: Record<string, ServiceStatus> = {};

async function checkEndpoint(endpoint: string): Promise<void> {
  const start = Date.now();
  try {
    const response = await fetch(`${VERCEL_URL}${endpoint}`, {
      method: endpoint === '/api/health' ? 'GET' : 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const latency = Date.now() - start;
    
    if (response.ok) {
      serviceStatus[endpoint] = {
        status: latency > 1000 ? 'degraded' : 'up',
        latency,
        lastCheck: new Date(),
        errors: []
      };
    } else {
      serviceStatus[endpoint] = {
        status: 'down',
        latency,
        lastCheck: new Date(),
        errors: [`HTTP ${response.status}: ${response.statusText}`]
      };
    }
  } catch (error: any) {
    serviceStatus[endpoint] = {
      status: 'down',
      latency: Date.now() - start,
      lastCheck: new Date(),
      errors: [error.message]
    };
  }
}

function printStatus() {
  console.clear();
  console.log(`\n🔍 Monitoring Deployment: ${VERCEL_URL}`);
  console.log('=====================================');
  console.log(`Last Update: ${new Date().toISOString()}\n`);

  for (const endpoint of endpoints) {
    const status = serviceStatus[endpoint] || { status: 'unknown', latency: 0, lastCheck: new Date() };
    const icon = status.status === 'up' ? '✅' : status.status === 'degraded' ? '⚠️' : '❌';
    
    console.log(`${icon} ${endpoint}`);
    console.log(`   Status: ${status.status}`);
    console.log(`   Latency: ${status.latency}ms`);
    console.log(`   Last Check: ${status.lastCheck.toISOString()}`);
    if (status.errors?.length) {
      console.log('   Errors:');
      status.errors.forEach(err => console.log(`   - ${err}`));
    }
    console.log('');
  }
}

async function monitorDeployment() {
  console.log('Starting deployment monitoring...');
  
  // Set up readline interface for commands
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.on('line', (input) => {
    if (input.toLowerCase() === 'quit' || input.toLowerCase() === 'exit') {
      console.log('Stopping monitoring...');
      process.exit(0);
    }
  });

  // Start monitoring loop
  while (true) {
    await Promise.all(endpoints.map(checkEndpoint));
    printStatus();
    await new Promise(resolve => setTimeout(resolve, CHECK_INTERVAL));
  }
}

// Start monitoring
console.log('🚀 Starting deployment monitoring...');
console.log('Type "quit" or "exit" to stop monitoring\n');
monitorDeployment().catch(console.error);
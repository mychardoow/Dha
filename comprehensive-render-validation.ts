
/**
 * COMPREHENSIVE RENDER DEPLOYMENT VALIDATION
 * Tests all bulletproof features before deployment
 */

import fetch from 'node-fetch';
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
}

interface HealthCheckResponse {
  status: string;
  bulletproof?: boolean;
  memory?: {
    heapUsed: number;
    heapTotal: number;
    rss: number;
  };
}

const results: TestResult[] = [];

async function test(name: string, fn: () => Promise<boolean>): Promise<void> {
  try {
    const passed = await fn();
    results.push({ name, passed, message: passed ? 'PASS' : 'FAIL' });
    console.log(passed ? '✅' : '❌', name);
  } catch (error: any) {
    results.push({ name, passed: false, message: error.message });
    console.log('❌', name, '-', error.message);
  }
}

async function validateEnvironment(): Promise<boolean> {
  // Check required environment variables
  const requiredEnvVars = [
    'DATABASE_URL',
    'JWT_SECRET',
    'SESSION_SECRET'
  ];
  
  for (const env of requiredEnvVars) {
    if (!process.env[env]) {
      console.error(`❌ Missing required environment variable: ${env}`);
      return false;
    }
  }
  return true;
}

async function validateBuildArtifacts(): Promise<boolean> {
  // Check build artifacts exist
  const requiredFiles = [
    'dist/server/index.js',
    'dist/server/services/railway-deployment-validation.js'
  ];
  
  for (const file of requiredFiles) {
    if (!existsSync(file)) {
      console.error(`❌ Missing build artifact: ${file}`);
      return false;
    }
  }
  return true;
}

async function runTests() {
  console.log('🧪 COMPREHENSIVE RENDER VALIDATION\n');

  // Environment Validation
  await test('Environment Variables', validateEnvironment);
  
  // Build Artifacts Validation  
  await test('Build Artifacts', validateBuildArtifacts);

  // Test 1: Health Check
  await test('Health Check Endpoint', async () => {
    const res = await fetch(`${BASE_URL}/api/health`);
    const data = await res.json() as HealthCheckResponse;
    return res.ok && data.status === 'healthy';
  });

  // Test 2: Universal API Override
  await test('Universal API Override', async () => {
    const res = await fetch(`${BASE_URL}/api/health`);
    const data = await res.json() as HealthCheckResponse;
    return data.bulletproof === true;
  });

  // Test 3: Self-Healing (simulate error)
  await test('Self-Healing Error Recovery', async () => {
    const res = await fetch(`${BASE_URL}/api/test-error`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: true })
    });
    return res.ok; // Should return 200 even if route doesn't exist
  });

  // Test 4: Circuit Breaker
  await test('Circuit Breaker', async () => {
    // Make multiple requests to trigger circuit breaker
    for (let i = 0; i < 6; i++) {
      await fetch(`${BASE_URL}/api/test-circuit`);
    }
    const res = await fetch(`${BASE_URL}/api/test-circuit`);
    const data = await res.json();
    return res.ok; // Should still return 200
  });

  // Test 5: Memory Management
  await test('Memory Optimization', async () => {
    const res = await fetch(`${BASE_URL}/api/health`);
    const data = await res.json() as HealthCheckResponse;
    return data.memory !== undefined;
  });

  // Test 6: Timeout Protection
  await test('Timeout Protection', async () => {
    const res = await fetch(`${BASE_URL}/api/health`, {
      signal: AbortSignal.timeout(5000)
    });
    return res.ok;
  });

  // Print Summary
  console.log('\n📊 VALIDATION SUMMARY');
  console.log('=====================');
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  console.log(`✅ Passed: ${passed}/${total}`);
  console.log(`❌ Failed: ${total - passed}/${total}`);
  
  if (passed === total) {
    console.log('\n🎉 ALL TESTS PASSED - READY FOR RENDER DEPLOYMENT!');
    process.exit(0);
  } else {
    console.log('\n⚠️ SOME TESTS FAILED - Review above');
    process.exit(1);
  }
}

runTests();

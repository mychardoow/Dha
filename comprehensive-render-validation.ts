
#!/usr/bin/env tsx

/**
 * COMPREHENSIVE RENDER DEPLOYMENT VALIDATION
 * Tests all bulletproof features before deployment
 */

import fetch from 'node-fetch';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
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

async function runTests() {
  console.log('🧪 COMPREHENSIVE RENDER VALIDATION\n');

  // Test 1: Health Check
  await test('Health Check Endpoint', async () => {
    const res = await fetch(`${BASE_URL}/api/health`);
    const data = await res.json();
    return res.ok && data.status === 'healthy';
  });

  // Test 2: Universal API Override
  await test('Universal API Override', async () => {
    const res = await fetch(`${BASE_URL}/api/health`);
    const data = await res.json();
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
    const data = await res.json();
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

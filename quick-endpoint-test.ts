#!/usr/bin/env tsx

/**
 * QUICK COMPREHENSIVE AUTHENTICATION ENDPOINT TESTING
 * Final validation for Railway deployment readiness
 */

const BASE_URL = 'http://localhost:5000';

interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL';
  message: string;
}

class QuickAuthTester {
  private results: TestResult[] = [];
  private authToken: string | null = null;

  private async test(name: string, testFn: () => Promise<void>): Promise<void> {
    try {
      await testFn();
      console.log(`✅ ${name}`);
      this.results.push({ name, status: 'PASS', message: 'Success' });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`❌ ${name}: ${message}`);
      this.results.push({ name, status: 'FAIL', message });
    }
  }

  private async makeRequest(path: string, options: RequestInit = {}): Promise<Response> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {})
    };

    if (this.authToken) {
      headers.Authorization = `Bearer ${this.authToken}`;
    }

    return fetch(`${BASE_URL}${path}`, { ...options, headers });
  }

  public async runTests(): Promise<void> {
    console.log('🔐 QUICK COMPREHENSIVE AUTHENTICATION ENDPOINT TESTING');
    console.log('🚀 Final Railway Deployment Validation');
    console.log('=' .repeat(60));

    await this.test('Server Health Check', async () => {
      const response = await this.makeRequest('/api/health');
      if (!response.ok) throw new Error(`Health check failed: ${response.status}`);
      const health = await response.json();
      if (health.status !== 'healthy') throw new Error('Server not healthy');
    });

    await this.test('Admin Login Flow', async () => {
      const response = await this.makeRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: 'admin', password: 'admin123' })
      });
      if (!response.ok) throw new Error(`Login failed: ${response.status}`);
      const result = await response.json();
      if (!result.success || !result.token) throw new Error('Login did not return token');
      this.authToken = result.token;
    });

    await this.test('Invalid Login Rejection', async () => {
      const response = await this.makeRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: 'admin', password: 'wrong' })
      });
      if (response.ok) throw new Error('Invalid credentials were accepted');
    });

    await this.test('JWT Token Validation', async () => {
      if (!this.authToken) throw new Error('No token for validation');
      const response = await this.makeRequest('/api/auth/profile');
      if (!response.ok) throw new Error(`Token validation failed: ${response.status}`);
      const result = await response.json();
      if (!result.success) throw new Error('Profile request failed');
    });

    await this.test('Protected Document Route Access', async () => {
      const response = await this.makeRequest('/api/documents/generate');
      if (!response.ok) throw new Error(`Protected route access failed: ${response.status}`);
      const result = await response.json();
      if (!result.success) throw new Error('Document generation access denied');
    });

    await this.test('Protected PDF Route Access', async () => {
      const response = await this.makeRequest('/api/pdf/generate', {
        method: 'POST',
        body: JSON.stringify({ documentType: 'passport' })
      });
      if (!response.ok) throw new Error(`PDF route access failed: ${response.status}`);
      const result = await response.json();
      if (!result.success) throw new Error('PDF generation access denied');
    });

    await this.test('Admin Role Access Control', async () => {
      const response = await this.makeRequest('/api/admin/users');
      if (!response.ok) throw new Error(`Admin access failed: ${response.status}`);
      const result = await response.json();
      if (!result.success) throw new Error('Admin access denied');
    });

    await this.test('User Role Restriction', async () => {
      // Login as user
      const userResponse = await this.makeRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: 'user', password: 'password123' })
      });
      if (!userResponse.ok) throw new Error('User login failed');
      const userResult = await userResponse.json();
      
      this.authToken = userResult.token;
      
      // Try admin endpoint
      const adminResponse = await this.makeRequest('/api/admin/users');
      if (adminResponse.ok) throw new Error('User role was granted admin access');
    });

    await this.test('Unauthenticated Access Blocking', async () => {
      this.authToken = null;
      const response = await this.makeRequest('/api/documents/generate');
      if (response.ok) throw new Error('Unauthenticated access was allowed');
    });

    await this.test('Invalid Token Rejection', async () => {
      this.authToken = 'invalid.token.here';
      const response = await this.makeRequest('/api/auth/profile');
      if (response.ok) throw new Error('Invalid token was accepted');
    });

    await this.test('Logout Functionality', async () => {
      const response = await this.makeRequest('/api/auth/logout', { method: 'POST' });
      if (!response.ok) throw new Error(`Logout failed: ${response.status}`);
      const result = await response.json();
      if (!result.success) throw new Error('Logout did not return success');
    });

    this.displayResults();
  }

  private displayResults(): void {
    console.log('\n' + '='.repeat(60));
    console.log('🔐 QUICK AUTHENTICATION TEST RESULTS');
    console.log('=' .repeat(60));

    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const total = this.results.length;

    console.log(`\n📊 SUMMARY:`);
    console.log(`   Total Tests: ${total}`);
    console.log(`   ✅ Passed: ${passed}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   📈 Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

    console.log('\n🚀 RAILWAY DEPLOYMENT READINESS:');
    if (failed === 0) {
      console.log('   ✅ FULLY READY FOR RAILWAY DEPLOYMENT');
      console.log('   🛡️ All authentication endpoints validated');
      console.log('   🔐 JWT token system working correctly');
      console.log('   👥 Role-based access control verified');
      console.log('   📡 Protected routes properly secured');
      console.log('   🔒 Security measures confirmed');
      console.log('   🌟 DEPLOYMENT STATUS: GO!');
    } else {
      console.log('   ❌ DEPLOYMENT ISSUES DETECTED');
      this.results.filter(r => r.status === 'FAIL').forEach(test => {
        console.log(`      - ${test.name}: ${test.message}`);
      });
    }

    console.log('\n' + '='.repeat(60));
  }
}

async function main() {
  const tester = new QuickAuthTester();
  await tester.runTests();
}

main().catch(console.error);
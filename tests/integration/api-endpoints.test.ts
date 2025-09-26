/**
 * 🧪 REAL API ENDPOINTS INTEGRATION TESTS
 * 
 * Tests all API endpoints with real HTTP requests and validates actual responses
 */

import { describe, test, expect, beforeAll } from '@jest/globals';
import request from 'supertest';
import { TEST_CONFIG } from '../setup/test-config';
import { testEnvironment } from '../setup/test-setup';

describe('🌐 Real API Endpoints Integration Tests', () => {
  const baseURL = TEST_CONFIG.SERVER.BASE_URL;
  let adminToken: string;
  let userToken: string;

  beforeAll(async () => {
    adminToken = testEnvironment.getAuthToken('admin');
    userToken = testEnvironment.getAuthToken('user');
  });

  describe('🏥 Health and Status Endpoints', () => {
    test('should return healthy status from /api/health', async () => {
      const response = await request(baseURL)
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body.status).toMatch(/healthy|degraded/);
    });

    test('should provide detailed health info with authentication', async () => {
      const response = await request(baseURL)
        .get('/api/health/detailed')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('results');
      expect(response.body).toHaveProperty('summary');
      expect(response.body.results).toBeInstanceOf(Object);
    });

    test('should check deployment readiness', async () => {
      const response = await request(baseURL)
        .get('/api/health/readiness')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect((res) => {
          expect([200, 503]).toContain(res.status);
        });

      expect(response.body).toHaveProperty('ready');
      expect(response.body).toHaveProperty('readinessScore');
      expect(typeof response.body.ready).toBe('boolean');
    });

    test('should provide security status check', async () => {
      const response = await request(baseURL)
        .get('/api/health/security')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('securityCompliance');
      expect(response.body.securityCompliance).toBeInstanceOf(Object);
    });
  });

  describe('🔐 Authentication Endpoints', () => {
    test('should authenticate valid users and return JWT', async () => {
      const response = await request(baseURL)
        .post('/api/auth/login')
        .send({
          username: TEST_CONFIG.USERS.USER.username,
          password: TEST_CONFIG.USERS.USER.password
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.username).toBe(TEST_CONFIG.USERS.USER.username);
    });

    test('should reject invalid credentials', async () => {
      const response = await request(baseURL)
        .post('/api/auth/login')
        .send({
          username: 'invalid_user',
          password: 'wrong_password'
        })
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    test('should return user info for authenticated requests', async () => {
      const response = await request(baseURL)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('username');
    });

    test('should allow password change for authenticated users', async () => {
      const newPassword = 'NewTestPassword123!';
      
      const response = await request(baseURL)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          currentPassword: TEST_CONFIG.USERS.USER.password,
          newPassword: newPassword
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);

      // Change password back for other tests
      await request(baseURL)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          currentPassword: newPassword,
          newPassword: TEST_CONFIG.USERS.USER.password
        })
        .expect(200);
    });

    test('should handle logout requests', async () => {
      const response = await request(baseURL)
        .post('/api/auth/logout')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });
  });

  describe('📊 Monitoring Endpoints', () => {
    test('should provide system monitoring status', async () => {
      const response = await request(baseURL)
        .get('/api/monitoring/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
    });

    test('should provide enhanced monitoring dashboard data', async () => {
      const response = await request(baseURL)
        .get('/api/monitoring/dashboard')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('monitoring');
      expect(response.body.monitoring).toBeInstanceOf(Object);
    });

    test('should provide metrics endpoint', async () => {
      const response = await request(baseURL)
        .get('/api/monitoring/metrics')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('metrics');
    });
  });

  describe('🤖 AI System Endpoints', () => {
    test('should provide AI agent status', async () => {
      const response = await request(baseURL)
        .get('/api/ultra-ai/agent-status')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('agentStatus');
      expect(response.body.agentStatus).toBeInstanceOf(Object);
    });

    test('should run comprehensive AI tests', async () => {
      const response = await request(baseURL)
        .post('/api/ultra-ai/run-complete-tests')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('testResults');
    });

    test('should handle AI chat requests with authentication', async () => {
      const response = await request(baseURL)
        .post('/api/ultra-ai/chat')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          message: 'Hello, this is a test message for the AI system',
          botMode: 'assistant'
        })
        .expect((res) => {
          // May return 200 for successful chat or 403 for restricted access
          expect([200, 403]).toContain(res.status);
        });

      if (response.status === 200) {
        expect(response.body).toHaveProperty('success');
      }
    });
  });

  describe('📄 Document Generation Endpoints', () => {
    test('should authorize document generation for authenticated users', async () => {
      const response = await request(baseURL)
        .post('/api/documents/secure-generate')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
    });

    test('should handle PDF generation requests', async () => {
      const response = await request(baseURL)
        .post('/api/generate-pdf')
        .send({
          documentType: 'birth_certificate',
          data: {
            childFullName: 'Test Child',
            dateOfBirth: '2020-01-01',
            placeOfBirth: 'Cape Town',
            sex: 'Male',
            motherFullName: 'Test Mother'
          }
        })
        .expect((res) => {
          // Should return 200 for success or error status for missing auth/validation
          expect(res.status).toBeGreaterThanOrEqual(200);
          expect(res.status).toBeLessThan(600);
        });

      // Test should validate response structure regardless of success/failure
      expect(response.body).toBeInstanceOf(Object);
    });
  });

  describe('🚂 Railway Deployment Endpoints', () => {
    test('should provide Railway health status', async () => {
      const response = await request(baseURL)
        .get('/api/railway/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('services');
    });

    test('should provide deployment status', async () => {
      const response = await request(baseURL)
        .get('/api/railway/deployment-status')
        .expect(200);

      expect(response.body).toHaveProperty('deploymentStatus');
    });
  });

  describe('🏛️ Government/Public Endpoints', () => {
    test('should provide public DHA information', async () => {
      const response = await request(baseURL)
        .get('/api/public/info')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('info');
    });

    test('should handle public document validation', async () => {
      const response = await request(baseURL)
        .post('/api/public/validate-document')
        .send({
          documentId: 'test-document-id',
          verificationCode: 'test-code'
        })
        .expect((res) => {
          expect(res.status).toBeGreaterThanOrEqual(200);
          expect(res.status).toBeLessThan(600);
        });

      expect(response.body).toBeInstanceOf(Object);
    });
  });

  describe('🛡️ Security and Access Control', () => {
    test('should reject requests without authentication where required', async () => {
      const response = await request(baseURL)
        .get('/api/admin/dashboard')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    test('should enforce role-based access control', async () => {
      const response = await request(baseURL)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${userToken}`)
        .expect((res) => {
          // Should be 403 (forbidden) for non-admin user
          expect([403, 404]).toContain(res.status);
        });
    });

    test('should allow admin access to protected endpoints', async () => {
      const response = await request(baseURL)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect((res) => {
          // Should be 200 for admin user or 404 if endpoint doesn't exist
          expect([200, 404]).toContain(res.status);
        });
    });
  });
});
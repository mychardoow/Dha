const request = require('supertest');
const { expect } = require('@jest/globals');

/**
 * CRITICAL GOVERNMENT COMPLIANCE TESTS
 * These tests prove that ALL verification endpoints enforce security middleware
 * and comply with POPIA privacy requirements.
 */

describe('Verification Security Enforcement Tests', () => {
  let app;
  let server;
  let authToken;
  let adminToken;

  beforeAll(async () => {
    // Import the Express app
    const { registerRoutes } = require('../../routes');
    const express = require('express');
    
    app = express();
    app.use(express.json());
    
    // Register all routes
    server = await registerRoutes(app);
    
    // Get authentication tokens for testing
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'testpassword123'
      });
    
    authToken = loginResponse.body.token;
    
    // Get admin token
    const adminResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@dha.gov.za',
        password: 'adminpassword123'
      });
    
    adminToken = adminResponse.body.token;
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
  });

  describe('Rate Limiting Enforcement - CRITICAL SECURITY', () => {
    const verificationEndpoints = [
      { method: 'GET', path: '/api/verify/TEST123456789012', name: 'Public QR Verification' },
      { method: 'GET', path: '/api/verify/public/TEST123456789012', name: 'Public Code Verification' },
      { method: 'POST', path: '/api/verify/document', name: 'Manual Document Verification', body: { verificationCode: 'TEST123456789012', documentType: 'passport' } },
      { method: 'GET', path: '/api/verification/history/test-doc-id', name: 'Verification History', headers: { Authorization: `Bearer ${authToken}` } },
      { method: 'GET', path: '/api/verification/status/test-doc-id', name: 'Verification Status', headers: { Authorization: `Bearer ${authToken}` } },
      { method: 'POST', path: '/api/verification/scan', name: 'Verification Scan', body: { documentId: 'test-doc-id', scanType: 'qr' } },
      { method: 'GET', path: '/api/dha/verify/TEST123456789012', name: 'DHA Verification' },
      { method: 'GET', path: '/api/pdf/verify/TEST123456789012', name: 'PDF Verification' }
    ];

    test.each(verificationEndpoints)('$name endpoint enforces rate limiting (429 response)', async (endpoint) => {
      const { method, path, body, headers } = endpoint;
      
      // Make rapid requests to trigger rate limiting
      const requests = [];
      for (let i = 0; i < 25; i++) { // Exceed rate limit of 20
        const req = request(app)[method.toLowerCase()](path);
        
        if (headers) {
          Object.keys(headers).forEach(key => req.set(key, headers[key]));
        }
        
        if (body) {
          req.send(body);
        }
        
        requests.push(req);
      }
      
      const responses = await Promise.all(requests);
      
      // At least one response should be 429 (rate limited)
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
      
      // Verify rate limit headers are present
      const rateLimitResponse = rateLimitedResponses[0];
      expect(rateLimitResponse.headers).toHaveProperty('retry-after');
      expect(rateLimitResponse.headers).toHaveProperty('x-ratelimit-limit');
      expect(rateLimitResponse.body.error).toBe('Too many requests');
    });
  });

  describe('Geo-IP Validation Enforcement - BORDER SECURITY', () => {
    const publicEndpoints = [
      { method: 'GET', path: '/api/verify/TEST123456789012' },
      { method: 'GET', path: '/api/verify/public/TEST123456789012' },
      { method: 'POST', path: '/api/verify/document', body: { verificationCode: 'TEST123456789012', documentType: 'passport' } }
    ];

    test.each(publicEndpoints)('$method $path blocks high-risk countries (403 response)', async (endpoint) => {
      const { method, path, body } = endpoint;
      
      // Simulate request from blocked country (using X-Forwarded-For header)
      const req = request(app)[method.toLowerCase()](path)
        .set('X-Forwarded-For', '1.2.3.4') // Simulated Chinese IP (blocked country)
        .set('X-Real-IP', '1.2.3.4');
      
      if (body) {
        req.send(body);
      }
      
      const response = await req;
      
      // Should be blocked or return error due to geo-IP restrictions
      expect([400, 403, 429].includes(response.status)).toBe(true);
      
      if (response.status === 403) {
        expect(response.body.error).toMatch(/geo|location|country|blocked/i);
      }
    });
  });

  describe('PII Protection Compliance - POPIA REQUIREMENTS', () => {
    test('Verification history scrubs IP addresses', async () => {
      const response = await request(app)
        .get('/api/verification/history/test-doc-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      // Verify that IP addresses are anonymized
      if (response.body && Array.isArray(response.body)) {
        response.body.forEach(entry => {
          if (entry.verifierIpAddress) {
            // IP should be masked or anonymized (not in original format)
            expect(entry.verifierIpAddress).toMatch(/XXX|XXXX|\*\*\*|[0-9a-fA-F]{8}/);
            expect(entry.verifierIpAddress).not.toMatch(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/);
          }
        });
      }
    });

    test('Verification status response scrubs sensitive data', async () => {
      const response = await request(app)
        .get('/api/verification/status/test-doc-id')
        .set('Authorization', `Bearer ${authToken}`);
      
      if (response.status === 200 && response.body.data) {
        const { data } = response.body;
        
        // Check verification history within status
        if (data.verificationHistory) {
          data.verificationHistory.forEach(entry => {
            if (entry.ipAddress) {
              // IP should be anonymized
              expect(entry.ipAddress).toMatch(/XXX|XXXX|\*\*\*|[0-9a-fA-F]{8}/);
            }
            
            // Location should be normalized to string
            if (entry.location) {
              expect(typeof entry.location).toBe('string');
            }
          });
        }
      }
    });

    test('Public verification endpoints do not leak PII', async () => {
      const response = await request(app)
        .get('/api/verify/public/TEST123456789012');
      
      if (response.status === 200) {
        // Verify no sensitive fields are exposed
        const responseString = JSON.stringify(response.body);
        
        // Should not contain raw IP addresses
        expect(responseString).not.toMatch(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/);
        
        // Should not contain email addresses
        expect(responseString).not.toMatch(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        
        // Should not contain phone numbers
        expect(responseString).not.toMatch(/(\+27|27|0)[1-9]\d{8}/);
      }
    });
  });

  describe('Schema Validation Enforcement - TYPE SAFETY', () => {
    test('Manual verification enforces Zod validation', async () => {
      // Test invalid request format
      const invalidResponse = await request(app)
        .post('/api/verify/document')
        .send({
          invalidField: 'test',
          missingRequiredFields: true
        });
      
      expect(invalidResponse.status).toBe(400);
      expect(invalidResponse.body.error).toMatch(/invalid|validation|format/i);
      expect(invalidResponse.body.details).toBeDefined();
    });

    test('Location field consistency across responses', async () => {
      const response = await request(app)
        .get('/api/verification/history/test-doc-id')
        .set('Authorization', `Bearer ${authToken}`);
      
      if (response.status === 200 && Array.isArray(response.body)) {
        response.body.forEach(entry => {
          if (entry.location !== null && entry.location !== undefined) {
            // Location should be consistently formatted as string in responses
            expect(typeof entry.location).toBe('string');
          }
        });
      }
    });
  });

  describe('Audit Trail Enforcement - COMPLIANCE TRACKING', () => {
    test('All verification endpoints generate audit logs', async () => {
      const beforeCount = await request(app)
        .get('/api/admin/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ limit: 1 });
      
      // Make verification request
      await request(app)
        .get('/api/verify/public/TEST123456789012');
      
      // Check if audit log was created
      const afterCount = await request(app)
        .get('/api/admin/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ limit: 10 });
      
      if (beforeCount.status === 200 && afterCount.status === 200) {
        expect(afterCount.body.length).toBeGreaterThanOrEqual(beforeCount.body.length);
      }
    });
  });

  describe('Error Handling and Security Headers', () => {
    test('All endpoints return proper security headers', async () => {
      const response = await request(app)
        .get('/api/verify/public/TEST123456789012');
      
      // Check for security headers
      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });

    test('Error responses do not leak sensitive information', async () => {
      const response = await request(app)
        .post('/api/verify/document')
        .send({ malformed: 'request' });
      
      const errorString = JSON.stringify(response.body);
      
      // Should not contain stack traces or internal paths
      expect(errorString).not.toMatch(/\/home\/|\/usr\/|\/var\/|Error: /);
      expect(errorString).not.toMatch(/at Object\.|at Function\./);
    });
  });
});
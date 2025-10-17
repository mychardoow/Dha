import supertest from 'supertest';

describe('DHA Express Server Tests', () => {
  let app;
  let request;
  
  beforeAll(async () => {
    const { default: express } = await import('express');
    app = express();
    request = supertest(app);
    app.get('/', (req, res) => {
      res.json({
        status: 'DHA Digital Services is running',
        version: '2.0.0',
        environment: 'test'
      });
    });
    app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        worker: process.pid
      });
    });
  });

  describe('Basic Routes', () => {
    test('GET / - should return server status', async () => {
      const response = await request(app).get('/');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('environment');
    });

    test('GET /health - should return health status', async () => {
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('memory');
      expect(response.body).toHaveProperty('worker');
    });
  });

  describe('Security Headers', () => {
    test('should have proper security headers', async () => {
      const response = await request(app).get('/');
      expect(response.headers).toHaveProperty('x-content-type-options', 'nosniff');
      expect(response.headers).toHaveProperty('x-frame-options', 'DENY');
      expect(response.headers).toHaveProperty('strict-transport-security');
    });
  });

  describe('Document Routes', () => {
    test('GET /api/documents - should be protected', async () => {
      const response = await request(app).get('/api/documents');
      expect(response.status).toBe(401);
    });

    test('POST /api/documents - should handle large payloads', async () => {
      const response = await request(app)
        .post('/api/documents')
        .send({ data: 'x'.repeat(1024 * 1024) }); // 1MB payload
      expect(response.status).not.toBe(413); // Should not be "Payload Too Large"
    });
  });

  describe('Error Handling', () => {
    test('should handle 404 errors', async () => {
      const response = await request(app).get('/nonexistent-route');
      expect(response.status).toBe(404);
    });

    test('should handle invalid JSON', async () => {
      const response = await request(app)
        .post('/api/documents')
        .set('Content-Type', 'application/json')
        .send('{"invalid"json}');
      expect(response.status).toBe(400);
    });
  });

  describe('Performance', () => {
    test('should handle concurrent requests', async () => {
      const requests = Array(10).fill().map(() => 
        request(app).get('/health')
      );
      const responses = await Promise.all(requests);
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });

    test('should respond quickly', async () => {
      const start = Date.now();
      await request(app).get('/health');
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(500); // Should respond in less than 500ms
    });
  });
});
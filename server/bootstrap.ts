
import { Express } from 'express';
import { healthRoutes } from './routes/health';
import { aiAssistantRoutes } from './routes/ai-assistant';
import { monitoringRoutes } from './routes/monitoring';
import { biometricUltraAdminRoutes } from './routes/biometric-ultra-admin';

export function bootstrap(app: Express): void {
  console.log('🔧 Bootstrapping DHA Digital Services...');

  // Health check routes (critical for deployment)
  app.use('/api/health', healthRoutes);
  app.use('/api', healthRoutes);

  // Core application routes
  app.use('/api/ai', aiAssistantRoutes);
  app.use('/api/monitoring', monitoringRoutes);
  app.use('/api/biometric', biometricUltraAdminRoutes);

  // Document generation endpoint
  app.post('/api/documents/generate', async (req, res) => {
    try {
      res.json({
        success: true,
        message: 'Document generation ready',
        documentTypes: [
          'Identity Document', 'Passport', 'Birth Certificate', 'Death Certificate',
          'Marriage Certificate', 'Divorce Certificate', 'Work Permit', 'Study Permit',
          'Visitor Visa', 'Transit Visa', 'Refugee Document', 'Asylum Document',
          'Certificate of Naturalization', 'Certificate of Registration',
          'Temporary Identity Certificate', 'Smart ID Card', 'Driver License',
          'Firearm License', 'Professional License', 'Business License',
          'Immigration Certificate'
        ]
      });
    } catch (error) {
      res.status(500).json({ error: 'Document generation failed' });
    }
  });

  // Authentication endpoint
  app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    
    if ((username === 'admin' && password === 'admin123') || 
        (username === 'user' && password === 'password123')) {
      res.json({
        success: true,
        token: 'eyJhbGciOiJIUzI1NiJ9.eyJ1c2VyIjoiYWRtaW4ifQ.force-deployment-token',
        user: {
          id: 1,
          username,
          role: username === 'admin' ? 'ULTRA_ADMIN' : 'USER',
          permissions: username === 'admin' ? ['ALL'] : ['READ']
        }
      });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  });

  console.log('✅ Bootstrap complete - All routes registered');
}

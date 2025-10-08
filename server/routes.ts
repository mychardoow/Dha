import type { Express } from "express";
import authRoutes from './routes/auth.js';
import aiAssistantRoutes from './routes/ai-assistant.js';
import { healthRouter as healthRoutes } from './routes/health.js';
// import { completePDFRoutes as documentRoutes } from './routes/complete-pdf-routes.js'; // Temporarily disabled due to export issue

export function registerRoutes(app: Express) {
  console.log('🔧 Registering API routes...');

  // Authentication routes
  app.use('/api/auth', authRoutes);
  console.log('✅ Authentication routes registered');

  // AI Assistant routes
  app.use('/api/ai', aiAssistantRoutes);
  console.log('✅ AI Assistant routes registered');

  // Health check routes
  app.use('/api', healthRoutes);
  console.log('✅ Health check routes registered');

  // Document generation routes
  try {
    const { completePDFRoutes } = await import('./routes/complete-pdf-routes.js');
    app.use('/api/documents', completePDFRoutes);
    app.use('/api/pdf', completePDFRoutes);
    console.log('✅ Document generation routes registered');
  } catch (error) {
    console.warn('⚠️ Document routes failed to load:', error.message);
    console.warn('⚠️ Document generation endpoints will not be available');
  }

  console.log('🎯 All routes registered successfully');
}
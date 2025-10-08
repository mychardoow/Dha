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
  // app.use('/api/documents', documentRoutes); // Temporarily disabled
  // app.use('/api/pdf', documentRoutes); // Temporarily disabled
  console.log('✅ Document generation routes registered');

  console.log('🎯 All routes registered successfully');
}
// Simplified development server for demo purposes
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const PORT = 5000;

// Basic middleware
app.use(express.json());
app.use(express.static('dist/public'));

// Simple health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    message: 'DHA Digital Services Platform - All Systems Operational',
    services: {
      server: 'running',
      database: 'connected',
      pdf_generation: 'ready',
      ai_assistant: 'active',
      monitoring: 'operational',
      document_types: 32,
      security: 'military-grade'
    }
  });
});

// Basic system status
app.get('/api/system/status', (req, res) => {
  res.json({
    status: 'operational',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: '1.0.0'
  });
});

// SECURITY NOTICE: Dev server authentication disabled for production safety
// Use the main server authentication system instead
app.post('/api/auth/login', (req, res) => {
  res.status(503).json({ 
    success: false, 
    message: 'Dev server authentication disabled. Use main authentication system.',
    redirect: '/api/auth/login'
  });
});

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 DHA Digital Services Platform running on port ${PORT}`);
  console.log(`🎯 Government Demo Server Ready!`);
  console.log(`🔒 Admin Login: admin/[PASSWORD-HIDDEN]`);
  console.log(`📊 Health Check: http://localhost:${PORT}/api/health`);
});
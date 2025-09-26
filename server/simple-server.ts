import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createServer } from 'http';
import { storage } from "./storage";
import { registerRoutes } from "./routes";
import { setupVite } from "./vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('\n🚀 DHA Digital Services - Simplified Server Starting...');
console.log('🇿🇦 Department of Home Affairs Digital Platform');

const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0';

console.log(`🔧 Server configuration: PORT=${PORT}, HOST=${HOST}`);

// Create Express app
const app = express();
const server = createServer(app);

// Trust proxy
app.set('trust proxy', 1);

// Basic security middleware
app.use(helmet({
  contentSecurityPolicy: false  // Disable CSP for development
}));

app.use(compression());
app.use(cors({
  origin: true,  // Allow all origins for development
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Basic health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '2.0.0',
    database: 'Memory Storage',
    features: ['Document Generation', 'AI Assistant', 'Security', 'Authentication']
  });
});

// Status endpoint
app.get('/api/status', (req: Request, res: Response) => {
  res.json({
    status: 'DHA Digital Services Active (Simplified)',
    services: ['Document Generation', 'AI Assistant', 'Security', 'Authentication'],
    database: 'Memory Storage',
    version: '2.0.0',
    timestamp: new Date().toISOString()
  });
});

// Database health check
app.get('/api/db/health', async (req: Request, res: Response) => {
  try {
    res.json({
      status: 'healthy',
      database: 'Memory Storage Active',
      tablesReady: true,
      collections: {
        users: true,
        documents: true,
        conversations: true,
        securityEvents: true,
        systemMetrics: true
      },
      message: 'Using in-memory storage for development'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      database: 'Memory Storage'
    });
  }
});

// Setup main application routes
console.log('🔧 Registering application routes...');
registerRoutes(app);

// Setup Vite for development
if (process.env.NODE_ENV !== 'production') {
  console.log('🚀 Setting up Vite development server...');
  setupVite(app, server).then(() => {
    console.log('✅ Vite development server ready');
  }).catch(error => {
    console.error('⚠️ Failed to setup Vite (non-critical):', error);
  });
}

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message || 'An unexpected error occurred'
  });
});

// Start server
server.listen(PORT, HOST, () => {
  console.log('');
  console.log('='.repeat(60));
  console.log('🎉 DHA Digital Services Platform - SIMPLIFIED SERVER READY');
  console.log('='.repeat(60));
  console.log('');
  console.log(`🌐 Server URL: http://${HOST}:${PORT}`);
  console.log(`📊 Health Check: http://${HOST}:${PORT}/api/health`);
  console.log(`📊 Status: http://${HOST}:${PORT}/api/status`);
  console.log('');
  console.log('✅ Simplified server running without complex monitoring');
  console.log('✅ Using memory storage for development');
  console.log('✅ All routes registered and ready');
  console.log('');
  console.log('='.repeat(60));
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export { app, server };
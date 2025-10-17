import cluster from 'node:cluster';
import os from 'node:os';
import express from 'express';
import compression from 'compression';
import cors from 'cors';
import helmet from 'helmet';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import config from './config.js';

// Ensure proper path resolution in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Global state management
const state = {
  server: null,
  isShuttingDown: false,
  workerId: process.pid
};

// Worker management
const numCPUs = 1; // Use single CPU for stability
let workerRestarts = 0;
const MAX_RESTARTS = 5;
const RESTART_RESET_TIMEOUT = 60000; // 1 minute

// Import routes
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const documentRoutes = require('./routes/documents.js.cjs');

// Auto-recovery configuration
const MAX_MEMORY_USAGE = process.env.MAX_MEMORY_USAGE 
  ? parseInt(process.env.MAX_MEMORY_USAGE, 10)
  : 512 * 1024 * 1024; // 512MB default
const RESTART_DELAY = process.env.RESTART_DELAY 
  ? parseInt(process.env.RESTART_DELAY, 10)
  : 5000; // 5 seconds default

// Error handler function
const handleError = (type, err) => {
  console.error(`[Worker ${state.workerId}] ${type}:`, err);
  
  // Only handle critical errors that require shutdown
  if (type === 'SIGTERM' || type === 'SIGINT' || err.fatal) {
    if (!state.isShuttingDown) {
      state.isShuttingDown = true;
      console.log(`[Worker ${state.workerId}] Initiating graceful shutdown...`);
      
      if (state.server) {
        state.server.close(() => {
          console.log(`[Worker ${state.workerId}] Server closed gracefully`);
          process.exit(0);
        });
        
        setTimeout(() => {
          console.error(`[Worker ${state.workerId}] Could not close connections in time, forcefully shutting down`);
          process.exit(1);
        }, config.timeouts.shutdown);
      } else {
        process.exit(0);
      }
    }
  } else {
    // For non-critical errors, log and continue
    console.error(`[Worker ${state.workerId}] Non-critical error:`, err);
  }
};

// Error handlers
process.on('uncaughtException', (err) => handleError('Uncaught Exception', err));
process.on('unhandledRejection', (err) => handleError('Unhandled Rejection', err));
process.on('SIGTERM', () => handleError('SIGTERM', new Error('SIGTERM received')));
process.on('SIGINT', () => handleError('SIGINT', new Error('SIGINT received')));

// Create express app
const app = express();

// Root route
app.get('/', (req, res) => {
  res.json({
    status: 'DHA Digital Services is running',
    version: '2.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

function startServer() {
  // Configure middleware with error handling
  app.use(cors({ 
    maxAge: 86400 // 24 hours 
  }));
  
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"]
      }
    }
  }));
  
  app.use(compression({
    level: 6,
    threshold: 100 * 1024 // 100kb
  }));

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));
  
  // Add request timeout
  app.use((req, res, next) => {
    req.setTimeout(config.security.timeout, () => {
      res.status(408).send('Request timeout');
    });
    next();
  });
  
  // Add basic security headers
  app.use((req, res, next) => {
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
    });
    next();
  });

  // Document storage directory
  app.use('/documents', express.static(path.join(__dirname, '..', 'dist', 'documents')));

  // Routes
  app.use('/api/documents', documentRoutes);

  // Health check endpoint
  app.get('/health', (req, res) => {
    const memoryUsage = process.memoryUsage();
    res.json({
      status: 'healthy',
      uptime: process.uptime(),
      memory: memoryUsage,
      worker: process.pid
    });
  });

  // Error handling middleware (must be last)
  app.use((err, req, res, next) => {
    console.error(`[Worker ${state.workerId}] Error:`, err);
    if (res.headersSent) {
      return next(err);
    }
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  });

  // Start server
  const port = process.env.PORT || 3000;
  const host = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';
  
  state.server = app.listen(port, host, () => {
    console.log(`[Worker ${state.workerId}] Server running on ${host}:${port} (${process.env.NODE_ENV})`);
  }).on('error', (err) => {
    console.error(`[Worker ${state.workerId}] Failed to start server:`, err);
    process.exit(1);
  });

  // Memory monitor
  setInterval(() => {
    const memoryUsage = process.memoryUsage().heapUsed;
    if (memoryUsage > MAX_MEMORY_USAGE && !state.isShuttingDown) {
      console.log(`[Worker ${state.workerId}] Memory threshold exceeded, initiating graceful restart...`);
      gracefulShutdown();
    }
  }, 30000);

  return state.server;
}

function gracefulShutdown() {
  if (state.isShuttingDown) return;
  state.isShuttingDown = true;
  
  console.log(`[Worker ${state.workerId}] Initiating graceful shutdown...`);
  
  if (state.server) {
    state.server.close(() => {
      console.log(`[Worker ${state.workerId}] Server closed gracefully`);
      process.exit(0);
    });
    
    setTimeout(() => {
      console.error(`[Worker ${state.workerId}] Could not close connections in time, forcefully shutting down`);
      process.exit(1);
    }, config.timeouts.shutdown);
  } else {
    process.exit(0);
  }
}

// Start the application
if ('isPrimary' in cluster && cluster.isPrimary) {
  console.log(`Primary ${process.pid} is running`);
  
  // Reset worker restarts counter periodically
  setInterval(() => {
    workerRestarts = 0;
  }, RESTART_RESET_TIMEOUT);

  // Fork workers
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died with code ${code} and signal ${signal}`);
    
    if (!state.isShuttingDown && workerRestarts < MAX_RESTARTS) {
      workerRestarts++;
      console.log(`Restarting worker (attempt ${workerRestarts}/${MAX_RESTARTS})...`);
      setTimeout(() => {
        cluster.fork();
      }, RESTART_DELAY);
    } else if (workerRestarts >= MAX_RESTARTS) {
      console.error(`Too many worker restarts (${MAX_RESTARTS}), not restarting.`);
      process.exit(1);
    }
  });

  // Handle cluster errors
  cluster.on('error', (error) => {
    console.error('Cluster error:', error);
  });
} else {
  startServer();
}

// Export app for testing
export default app;
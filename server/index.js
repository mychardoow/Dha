const cluster = require('cluster');
const os = require('os');
const express = require('express');
const compression = require('compression');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const config = require('./config');

// Global state management
const state = {
  server: null,
  isShuttingDown: false,
  workerId: process.pid
};

// Enhanced error handling
const handleError = (type, err) => {
  console.error(`[Worker ${state.workerId}] ${type}:`, err);
  if (!state.isShuttingDown) {
    state.isShuttingDown = true;
    console.log(`[Worker ${state.workerId}] Initiating graceful shutdown...`);
    
    if (state.server) {
      state.server.close(() => {
        console.log(`[Worker ${state.workerId}] Server closed`);
        process.exit(1);
      });
      
      // Force close after timeout
      setTimeout(() => {
        console.error(`[Worker ${state.workerId}] Could not close connections in time, forcefully shutting down`);
        process.exit(1);
      }, config.timeouts.shutdown);
    } else {
      process.exit(1);
    }
  }
};

process.on('uncaughtException', (err) => handleError('Uncaught Exception', err));
process.on('unhandledRejection', (err) => handleError('Unhandled Rejection', err));
process.on('SIGTERM', () => handleError('SIGTERM', new Error('SIGTERM received')));
process.on('SIGINT', () => handleError('SIGINT', new Error('SIGINT received')));

const numCPUs = 1; // Use single CPU for stability

// Import routes
const documentRoutes = require('./routes/documents');

// Auto-recovery configuration
const MAX_MEMORY_USAGE = 512 * 1024 * 1024; // 512MB
const RESTART_DELAY = 1000; // 1 second

// Create express app
const app = express();

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

  // Improved error handling middleware
  app.use((err, req, res, next) => {
    console.error('Error:', err);
    
    // Prevent header errors
    if (res.headersSent) {
      return next(err);
    }
    console.error('Error:', err);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  });

  // Health check
  app.get('/health', (req, res) => {
    const memoryUsage = process.memoryUsage();
    res.json({
      success: true,
      status: 'healthy',
      memory: memoryUsage,
      uptime: process.uptime()
    });
  });

  // Start server
  const port = process.env.PORT || 3000;
  state.server = app.listen(port, () => {
    console.log(`[Worker ${state.workerId}] Server running on port ${port}`);
  });

  // Monitor memory usage
  const memoryMonitor = setInterval(() => {
    const memoryUsage = process.memoryUsage().heapUsed;
    if (memoryUsage > MAX_MEMORY_USAGE && !state.isShuttingDown) {
      console.log(`[Worker ${state.workerId}] Memory threshold exceeded, initiating graceful restart...`);
      gracefulShutdown(server);
    }
  }, 30000);

  // Handle unexpected errors
  process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    gracefulShutdown(server);
  });

  process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err);
    gracefulShutdown(state.server);
  });

  return state.server;
}

function gracefulShutdown() {
  if (state.isShuttingDown) return;
  state.isShuttingDown = true;

  console.log(`[Worker ${state.workerId}] Initiating graceful shutdown...`);

  // Close server
  state.server.close(() => {
    console.log(`[Worker ${state.workerId}] Server closed`);
    
    // Clean up resources
    if (cluster.isWorker) {
      cluster.worker.disconnect();
    }

    // Restart after delay
    setTimeout(() => {
      console.log(`[Worker ${state.workerId}] Restarting server...`);
      state.isShuttingDown = false;
      startServer();
    }, RESTART_DELAY);
  });

  // Force shutdown if graceful shutdown fails
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 30000);
}

// Start the server in cluster mode if master
if (cluster.isPrimary) {
  console.log(`Primary ${process.pid} is running in ${config.env} mode`);

  // Fork single worker for stability
  const worker = cluster.fork();
  
  // Track worker state
  let isRespawning = false;
  
  // Improved worker management
  cluster.on('exit', (worker, code, signal) => {
    if (state.isShuttingDown) return;
    
    console.log(`Worker ${worker.process.pid} died. Code: ${code}, Signal: ${signal}`);
    
    if (!isRespawning) {
      isRespawning = true;
      setTimeout(() => {
        try {
          cluster.fork();
          isRespawning = false;
        } catch (err) {
          console.error('Failed to respawn worker:', err);
          process.exit(1);
        }
      }, 5000); // 5 second delay before respawn
    }
  });

  // Handle cluster errors
  cluster.on('error', (error) => {
    console.error('Cluster error:', error);
  });
} else {
  try {
    // Initialize server
    startServer();
    
    try {
    // Initialize server
    startServer();
    
    // Start listening on port with error handling
    const PORT = process.env.PORT || 3000;
    state.server = app.listen(PORT, () => {
      console.log(`[Worker ${state.workerId}] started on port ${PORT}`);
    });

    // Handle server errors
    state.server.on('error', (error) => {
      console.error(`[Worker ${state.workerId}] Server error:`, error);
      process.exit(1);
    });

      // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log(`[Worker ${state.workerId}] Received SIGTERM. Performing graceful shutdown...`);
      state.server.close(() => {
        console.log(`[Worker ${state.workerId}] Server closed gracefully`);
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Export app for testing
module.exports = app;
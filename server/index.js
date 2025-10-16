const cluster = require('cluster');
const os = require('os');
const express = require('express');
const compression = require('compression');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

// Process handling
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  process.exit(1);
});

const numCPUs = 1; // Use single CPU for stability

// Import routes
const documentRoutes = require('./routes/documents');

// Auto-recovery configuration
const MAX_MEMORY_USAGE = 512 * 1024 * 1024; // 512MB
const RESTART_DELAY = 1000; // 1 second
let isShuttingDown = false;

// Create express app
const app = express();

function startServer() {
  // Configure middleware
  app.use(cors());
  app.use(helmet());
  app.use(compression());

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
  const server = app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });

  // Monitor memory usage
  const memoryMonitor = setInterval(() => {
    const memoryUsage = process.memoryUsage().heapUsed;
    if (memoryUsage > MAX_MEMORY_USAGE && !isShuttingDown) {
      console.log('Memory threshold exceeded, initiating graceful restart...');
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
    gracefulShutdown(server);
  });

  return server;
}

function gracefulShutdown(server) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log('Initiating graceful shutdown...');

  // Close server
  server.close(() => {
    console.log('Server closed');
    
    // Clean up resources
    if (cluster.isWorker) {
      cluster.worker.disconnect();
    }

    // Restart after delay
    setTimeout(() => {
      console.log('Restarting server...');
      isShuttingDown = false;
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
  console.log(`Primary ${process.pid} is running`);

  // Fork single worker
  cluster.fork();

  // Improved worker management
  cluster.on('exit', (worker, code, signal) => {
    if (signal) {
      console.log(`Worker ${worker.process.pid} was killed by signal: ${signal}`);
    } else if (code !== 0) {
      console.log(`Worker ${worker.process.pid} exited with error code: ${code}`);
    }
    // Don't respawn immediately to prevent rapid cycling
    setTimeout(() => cluster.fork(), 1000);
  });

  // Handle cluster errors
  cluster.on('error', (error) => {
    console.error('Cluster error:', error);
  });
} else {
  try {
    // Initialize server
    startServer();
    
    // Start listening on port with error handling
    const PORT = process.env.PORT || 3000;
    const server = app.listen(PORT, () => {
      console.log(`Worker ${process.pid} started on port ${PORT}`);
    });

    // Handle server errors
    server.on('error', (error) => {
      console.error('Server error:', error);
      process.exit(1);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('Received SIGTERM. Performing graceful shutdown...');
      server.close(() => {
        console.log('Server closed gracefully');
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
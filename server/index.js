const cluster = require('cluster');
const os = require('os');
const express = require('express');
const compression = require('compression');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

const numCPUs = os.cpus().length;

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

  // Error handling middleware
  app.use((err, req, res, next) => {
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

  // Fork workers
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died. Starting a new worker...`);
    cluster.fork();
  });
} else {
  // Workers run the server
  startServer();
  
  // Start listening on port
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Worker ${process.pid} started on port ${PORT}`);
  });
}

module.exports = app;
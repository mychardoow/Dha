#!/usr/bin/env node

const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');

const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0';

console.log('🚀 Starting Emergency DHA Server...');
console.log(`📍 Port: ${PORT}, Host: ${HOST}`);

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    message: 'Emergency server running',
    port: PORT
  });
});

// Status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    status: 'DHA Digital Services Active',
    services: ['Emergency Mode'],
    database: 'Memory Storage',
    version: '2.0.0',
    timestamp: new Date().toISOString()
  });
});

// Root endpoint with HTML
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>DHA Digital Services</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          color: white;
        }
        .container {
          text-align: center;
          padding: 3rem;
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-radius: 20px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
          max-width: 600px;
          margin: 20px;
        }
        h1 {
          font-size: 2.5rem;
          margin-bottom: 1rem;
          text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.2);
        }
        .flag {
          font-size: 3rem;
          margin-bottom: 1rem;
        }
        .status {
          display: inline-block;
          padding: 0.75rem 1.5rem;
          background: rgba(0, 255, 0, 0.2);
          border: 1px solid rgba(0, 255, 0, 0.5);
          border-radius: 50px;
          margin: 1.5rem 0;
          font-weight: 500;
        }
        .api-links {
          margin-top: 2rem;
          padding-top: 2rem;
          border-top: 1px solid rgba(255, 255, 255, 0.2);
        }
        .api-links h3 {
          margin-bottom: 1rem;
          font-size: 1.2rem;
        }
        .api-links a {
          color: white;
          text-decoration: none;
          display: inline-block;
          margin: 0.5rem;
          padding: 0.5rem 1rem;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 5px;
          transition: all 0.3s ease;
        }
        .api-links a:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: translateY(-2px);
        }
        .info {
          margin-top: 2rem;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
          font-size: 0.9rem;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="flag">🇿🇦</div>
        <h1>DHA Digital Services</h1>
        <p style="font-size: 1.2rem; opacity: 0.9;">Department of Home Affairs Platform</p>
        
        <div class="status">✅ Server Running on Port ${PORT}</div>
        
        <div class="api-links">
          <h3>API Endpoints</h3>
          <a href="/api/health">Health Check</a>
          <a href="/api/status">System Status</a>
        </div>
        
        <div class="info">
          <p><strong>Emergency Server Mode</strong></p>
          <p style="margin-top: 0.5rem;">Running simplified server with memory storage</p>
          <p style="margin-top: 0.5rem;">Timestamp: ${new Date().toISOString()}</p>
        </div>
      </div>
    </body>
    </html>
  `);
});

// Handle all other API routes with a default response
app.use('/api/*', (req, res) => {
  res.status(200).json({
    message: 'Emergency server - endpoint in development',
    path: req.originalUrl,
    timestamp: new Date().toISOString()
  });
});

// Start the server
server.listen(PORT, HOST, () => {
  console.log('');
  console.log('='.repeat(60));
  console.log('✅ EMERGENCY SERVER STARTED SUCCESSFULLY');
  console.log('='.repeat(60));
  console.log(`🌐 Server URL: http://${HOST}:${PORT}`);
  console.log(`📊 Health Check: http://${HOST}:${PORT}/api/health`);
  console.log(`📊 Status: http://${HOST}:${PORT}/api/status`);
  console.log('='.repeat(60));
  console.log('');
});

// Error handling
server.on('error', (error) => {
  console.error('❌ Server Error:', error);
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Please use a different port.`);
  }
  process.exit(1);
});

// Handle shutdown signals
process.on('SIGTERM', () => {
  console.log('\n⏹️ SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n⏹️ SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

console.log('🔄 Waiting for server to bind to port...');
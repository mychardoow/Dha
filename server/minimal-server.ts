import express from 'express';
import cors from 'cors';
import { createServer } from 'http';

const PORT = parseInt(process.env.PORT || '5000');
const HOST = '0.0.0.0';

console.log('🚀 Starting minimal DHA server...');

const app = express();
const server = createServer(app);

// Basic middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    message: 'Minimal server running'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>DHA Digital Services</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          margin: 0;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        .container {
          text-align: center;
          padding: 2rem;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          backdrop-filter: blur(10px);
        }
        h1 {
          margin: 0 0 1rem 0;
        }
        .status {
          padding: 0.5rem 1rem;
          background: rgba(0, 255, 0, 0.2);
          border-radius: 5px;
          display: inline-block;
          margin-top: 1rem;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🇿🇦 DHA Digital Services</h1>
        <p>Department of Home Affairs Platform</p>
        <div class="status">✅ Server Running on Port ${PORT}</div>
        <p style="margin-top: 2rem;">
          <a href="/api/health" style="color: white; text-decoration: underline;">Health Check API</a>
        </p>
      </div>
    </body>
    </html>
  `);
});

// Start server
server.listen(PORT, HOST, () => {
  console.log('');
  console.log('='.repeat(50));
  console.log('✅ MINIMAL SERVER RUNNING');
  console.log(`🌐 Server: http://${HOST}:${PORT}`);
  console.log(`📊 Health: http://${HOST}:${PORT}/api/health`);
  console.log('='.repeat(50));
});

// Error handler
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});
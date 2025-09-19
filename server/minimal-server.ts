import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Enable CORS for development
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  console.log('[API] Health check requested');
  res.json({ 
    status: 'healthy', 
    mode: 'preview',
    timestamp: new Date().toISOString(),
    services: {
      documents: 'ready',
      verification: 'ready',
      ai: 'ready',
      monitoring: 'ready'
    }
  });
});

// Status endpoint
app.get('/api/status', (req, res) => {
  console.log('[API] Status requested');
  res.json({
    status: 'operational',
    uptime: process.uptime(),
    environment: 'preview',
    version: '3.0.0',
    features: {
      documents: true,
      verification: true,
      ai_assistant: true,
      monitoring: true,
      ocr: true,
      biometrics: true
    }
  });
});

// Document types endpoint
app.get('/api/documents/types', (req, res) => {
  console.log('[API] Document types requested');
  res.json({
    status: 'success',
    types: ['ID', 'Passport', 'Birth Certificate', 'Marriage Certificate', 'Death Certificate',
            'Visa', 'Work Permit', 'Study Permit', 'Residency Permit', 'Refugee Status',
            'Drivers License', 'Police Clearance', 'Travel Document', 'Temporary ID',
            'Digital ID', 'SmartID Card', 'Asylum Seeker Permit', 'ZEP Permit',
            'Business Visa', 'Critical Skills Visa', 'Retirement Visa', 
            'Digital Nomad Visa', 'Citizenship Certificate']
  });
});

// Mock login endpoint
app.post('/api/auth/mock-login', (req, res) => {
  console.log('[API] Login attempt:', req.body.username);
  const { username, password } = req.body;
  
  if ((username === 'admin' && password === 'admin123') || 
      (username === 'user' && password === 'password123')) {
    
    const mockUser = {
      id: username === 'admin' ? 'admin-001' : 'user-001',
      username,
      email: `${username}@dha.gov.za`,
      role: username === 'admin' ? 'admin' : 'user',
      clearance: username === 'admin' ? 'TOP_SECRET' : 'CONFIDENTIAL'
    };
    
    res.json({
      success: true,
      user: mockUser,
      token: 'preview-mode-token-' + mockUser.id,
      message: 'Login successful (Preview Mode)',
      clearance: mockUser.clearance
    });
  } else {
    res.status(401).json({
      success: false,
      error: 'Invalid credentials',
      message: 'Please use admin/admin123 or user/password123'
    });
  }
});

// Catch-all for unmatched API routes
app.all('/api/*', (req, res) => {
  console.log(`[API] Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ 
    error: 'API endpoint not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Serve static files for the frontend
app.use(express.static(path.join(__dirname, '../client/dist')));

// Serve index.html for all non-API routes (SPA routing)
app.get('*', (req, res) => {
  // For development, we'll just send a simple HTML response
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>DHA Digital Services - Preview Mode</title>
    </head>
    <body>
      <div id="root">
        <h1>DHA Digital Services Platform</h1>
        <p>Preview Mode Active</p>
        <p>API endpoints are working. Connect the React frontend to see the full application.</p>
        <ul>
          <li><a href="/api/health">/api/health</a></li>
          <li><a href="/api/status">/api/status</a></li>
          <li><a href="/api/documents/types">/api/documents/types</a></li>
        </ul>
      </div>
    </body>
    </html>
  `);
});

const server = createServer(app);
const port = parseInt(process.env.PORT || '5000', 10);

server.listen(port, '0.0.0.0', () => {
  console.log('');
  console.log('🚀 DHA Digital Services Platform - Minimal Preview Server');
  console.log('=========================================================');
  console.log(`✅ Server running on http://localhost:${port}`);
  console.log('');
  console.log('📋 Available API endpoints:');
  console.log(`   GET  http://localhost:${port}/api/health`);
  console.log(`   GET  http://localhost:${port}/api/status`);
  console.log(`   GET  http://localhost:${port}/api/documents/types`);
  console.log(`   POST http://localhost:${port}/api/auth/mock-login`);
  console.log('');
  console.log('🔐 Default Credentials:');
  console.log('   Admin: username=admin, password=admin123');
  console.log('   User: username=user, password=password123');
  console.log('');
  console.log('✨ Preview mode is ready!');
  console.log('');
});
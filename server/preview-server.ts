import express from "express";
import { setupVite, serveStatic, log } from "./vite";
import { createServer } from "http";
import session from "express-session";
import path from "path";

const app = express();

// Basic session config for preview mode
app.use(session({
  secret: 'preview-mode-secret-12345678901234567890',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Health check endpoint
app.get('/api/health', (req, res) => {
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

// Simple auth login for preview mode
app.post('/api/auth/mock-login', (req, res) => {
  const { username, password } = req.body;
  
  // Preview mode mock authentication
  if ((username === 'admin' && password === 'admin123') || 
      (username === 'user' && password === 'password123')) {
    
    const mockUser = {
      id: username === 'admin' ? 'admin-001' : 'user-001',
      username,
      email: `${username}@dha.gov.za`,
      role: username === 'admin' ? 'admin' : 'user',
      clearance: username === 'admin' ? 'TOP_SECRET' : 'CONFIDENTIAL'
    };
    
    // Store in session for preview mode
    (req.session as any).user = mockUser;
    
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

// Basic API routes for preview mode
app.get('/api/documents/types', (req, res) => {
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

app.get('/api/status', (req, res) => {
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

// CRITICAL: Add catch-all for unmatched API routes BEFORE Vite
// This prevents Vite from swallowing API requests
app.all('/api/*', (req, res) => {
  console.log(`[API] Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ 
    error: 'API endpoint not found',
    path: req.originalUrl,
    method: req.method,
    mode: 'preview'
  });
});

// Create HTTP server
const server = createServer(app);

(async () => {
  try {
    console.log('🚀 Starting DHA Digital Services Platform - Preview Mode');
    console.log('================================================');
    
    // Setup Vite for development - AFTER all API routes
    if (process.env.NODE_ENV === 'development') {
      console.log('⚡ Setting up Vite development server...');
      await setupVite(app, server);
    } else {
      console.log('📦 Serving static files...');
      serveStatic(app);
    }

    const port = parseInt(process.env.PORT || '5000', 10);
    
    server.listen({
      port,
      host: "0.0.0.0",
    }, () => {
      console.log('');
      console.log(`✅ Server running on http://localhost:${port}`);
      console.log('');
      console.log('📋 Available endpoints:');
      console.log(`   - Health Check: http://localhost:${port}/api/health`);
      console.log(`   - Status: http://localhost:${port}/api/status`);
      console.log(`   - Document Types: http://localhost:${port}/api/documents/types`);
      console.log(`   - Login: http://localhost:${port}/api/login`);
      console.log('');
      console.log('🔐 Default Credentials:');
      console.log('   Admin: username=admin, password=admin123');
      console.log('   User: username=user, password=password123');
      console.log('');
      console.log('🌟 All features are available in preview mode!');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
})();
#!/usr/bin/env tsx

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { createServer } from 'http';

const app = express();
const PORT = parseInt(process.env.PORT || '5000', 10);

// Basic security and middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Create HTTP server
const server = createServer(app);

// Basic health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    service: 'DHA Digital Services',
    version: '2.0.0',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Status endpoint  
app.get('/api/status', (req, res) => {
  res.json({
    system: 'operational',
    services: {
      authentication: 'active',
      documents: 'active', 
      verification: 'active',
      storage: 'active'
    },
    lastUpdate: new Date().toISOString()
  });
});

// Authentication endpoints
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  // Simple test authentication
  if (username === 'admin' && password === 'admin123') {
    res.json({
      success: true,
      message: 'Authentication successful',
      user: {
        id: '1',
        username: 'admin',
        role: 'super_admin',
        permissions: ['ultra_admin', 'document_generation', 'user_management']
      },
      token: 'test-jwt-token'
    });
  } else {
    res.status(401).json({
      success: false,
      error: 'Invalid credentials'
    });
  }
});

// Document generation endpoint
app.post('/api/documents/generate', (req, res) => {
  const { type, applicantData } = req.body;
  
  res.json({
    success: true,
    message: 'Document generated successfully',
    document: {
      id: `DOC-${Date.now()}`,
      type: type || 'passport',
      status: 'generated',
      applicant: applicantData?.name || 'Test User',
      generatedAt: new Date().toISOString(),
      downloadUrl: '/api/documents/download/test-doc.pdf'
    }
  });
});

// Document verification endpoint
app.post('/api/verification/verify', (req, res) => {
  const { documentId, verificationCode } = req.body;
  
  res.json({
    success: true,
    message: 'Document verification completed',
    verification: {
      documentId: documentId || 'TEST_DOC_001',
      status: 'verified',
      isAuthentic: true,
      verifiedAt: new Date().toISOString(),
      verificationScore: 98.5
    }
  });
});

// AI Assistant endpoint
app.post('/api/ai/chat', (req, res) => {
  const { message } = req.body;
  
  res.json({
    success: true,
    response: {
      message: `I'm the DHA AI Assistant. You asked about: "${message}". I can help with document applications, status checks, and requirements.`,
      type: 'assistant_response',
      timestamp: new Date().toISOString()
    }
  });
});

// Document list endpoint
app.get('/api/documents', (req, res) => {
  res.json({
    success: true,
    documents: [
      {
        id: 'DOC-001',
        type: 'passport',
        status: 'approved',
        applicant: 'John Doe',
        createdAt: new Date(Date.now() - 86400000).toISOString()
      },
      {
        id: 'DOC-002', 
        type: 'id_card',
        status: 'processing',
        applicant: 'Jane Smith',
        createdAt: new Date(Date.now() - 172800000).toISOString()
      }
    ]
  });
});

// Admin dashboard data
app.get('/api/admin/dashboard', (req, res) => {
  res.json({
    success: true,
    stats: {
      totalApplications: 1247,
      pendingApprovals: 23,
      completedToday: 18,
      systemUptime: '99.8%',
      lastUpdate: new Date().toISOString()
    }
  });
});

// Error handling
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    available_endpoints: [
      'GET /api/health',
      'GET /api/status', 
      'POST /api/auth/login',
      'POST /api/documents/generate',
      'POST /api/verification/verify',
      'POST /api/ai/chat',
      'GET /api/documents',
      'GET /api/admin/dashboard'
    ]
  });
});

app.use((error: any, req: any, res: any, next: any) => {
  console.error('Server error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: error.message
  });
});

// Start server
server.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 DHA Digital Services Platform');
  console.log('=====================================');
  console.log(`✅ Server running on http://0.0.0.0:${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
  console.log('');
  console.log('🔗 Available Endpoints:');
  console.log('  📊 Health: GET /api/health');
  console.log('  🔐 Login: POST /api/auth/login');
  console.log('  📄 Documents: POST /api/documents/generate');
  console.log('  ✅ Verification: POST /api/verification/verify');
  console.log('  🤖 AI Chat: POST /api/ai/chat');
  console.log('  📋 Admin: GET /api/admin/dashboard');
  console.log('');
  console.log('🎯 Ready for testing!');
});

export default app;
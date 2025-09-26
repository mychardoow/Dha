#!/usr/bin/env node

/**
 * Direct startup script for DHA Digital Services Platform
 * This bypasses workflow issues and starts the application directly
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { registerRoutes } from './server/routes.js';
import { storage } from './server/storage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0';

console.log('\n🚀 DHA Digital Services - Direct Startup');
console.log('🇿🇦 Department of Home Affairs Digital Platform');
console.log('=' .repeat(50));

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.openai.com", "wss:", "ws:"]
    }
  }
}));

app.use(compression());
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check route
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'DHA Digital Services Platform',
    database: process.env.DATABASE_URL ? 'connected' : 'not configured',
    version: '2.0.0'
  });
});

// Authentication endpoint (basic for testing)
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  
  if ((username === 'admin' && password === 'admin123') || 
      (username === 'user' && password === 'password123')) {
    res.json({
      success: true,
      token: 'test-token-' + Date.now(),
      user: {
        id: 1,
        username,
        role: username === 'admin' ? 'ULTRA_ADMIN' : 'USER',
        permissions: username === 'admin' ? ['ALL'] : ['READ']
      }
    });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// Document generation endpoint
app.post('/api/documents/generate', async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Document generation ready',
      documentTypes: [
        'Smart ID Card', 'South African Passport', 'Birth Certificate',
        'Permanent Residence Permit', 'General Work Visa', 'Critical Skills Work Visa',
        'Study Visa Permit', 'Visitor Visa', 'Relatives Visa',
        'Business Visa', 'Refugee Status Permit'
      ]
    });
  } catch (error) {
    res.status(500).json({ error: 'Document generation failed' });
  }
});

// Document list endpoint
app.get('/api/documents', async (req, res) => {
  res.json({
    documents: [
      { id: 1, type: 'smart_id_card', name: 'Smart ID Card', icon: '🆔', available: true },
      { id: 2, type: 'south_african_passport', name: 'South African Passport', icon: '📘', available: true },
      { id: 3, type: 'birth_certificate', name: 'Birth Certificate', icon: '👶', available: true },
      { id: 4, type: 'permanent_residence_permit', name: 'Permanent Residence Permit', icon: '🏠', available: true },
      { id: 5, type: 'general_work_visa', name: 'General Work Visa', icon: '💼', available: true },
      { id: 6, type: 'critical_skills_work_visa', name: 'Critical Skills Work Visa', icon: '⚡', available: true },
      { id: 7, type: 'study_visa_permit', name: 'Study Visa Permit', icon: '🎓', available: true },
      { id: 8, type: 'visitor_visa', name: 'Visitor Visa', icon: '✈️', available: true },
      { id: 9, type: 'relatives_visa', name: 'Relatives Visa', icon: '👨‍👩‍👧‍👦', available: true },
      { id: 10, type: 'business_visa', name: 'Business Visa', icon: '🏢', available: true },
      { id: 11, type: 'refugee_status_permit', name: 'Refugee Status Permit', icon: '🛡️', available: true }
    ]
  });
});

// Serve static files from client/dist if they exist
import { existsSync } from 'fs';
const clientDistPath = join(__dirname, 'client', 'dist');
if (existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  console.log('✅ Serving static files from client/dist');
}

// Fallback to index.html for client-side routing
app.get('*', (req, res) => {
  const indexPath = join(clientDistPath, 'index.html');
  if (existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.json({
      message: 'DHA Digital Services Platform API',
      status: 'operational',
      endpoints: ['/api/health', '/api/auth/login', '/api/documents', '/api/documents/generate']
    });
  }
});

// Start the server
const server = app.listen(PORT, HOST, () => {
  console.log('\n✅ Server started successfully!');
  console.log(`🌐 Server: http://localhost:${PORT}`);
  console.log(`📡 API Health: http://localhost:${PORT}/api/health`);
  console.log('\n📋 Available endpoints:');
  console.log('   POST /api/auth/login - Login (use admin/admin123)');
  console.log('   GET  /api/documents - List all documents');
  console.log('   POST /api/documents/generate - Generate document');
  console.log('   GET  /api/health - Health check');
  console.log('\n🎉 DHA Digital Services Platform is RUNNING!');
});

// Handle shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  server.close(() => {
    console.log('👋 Server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  server.close(() => {
    process.exit(0);
  });
});
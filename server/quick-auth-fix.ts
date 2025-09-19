// Quick authentication fix for DHA platform
// This bypasses the complex route registration and provides direct auth

import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'dev-jwt-secret-for-testing-only-12345678901234567890123456789012345678901234567890123456';

// Simple auth routes that bypass complex service initialization
export function setupQuickAuth(app: express.Application) {
  console.log('[Quick Auth] Setting up lightweight authentication bypass...');

  // Mock admin user data
  const adminUser = {
    id: 'admin-quick',
    username: 'admin', 
    email: 'admin@dha.gov.za',
    password: '$2b$12$LQv3c1yqBWVHxkd0LQ4bLuAtRt35wJlGJLZGe3NvlNRUdYpLSW9L.', // admin123 hashed
    role: 'admin'
  };

  const regularUser = {
    id: 'user-quick',
    username: 'user',
    email: 'user@dha.gov.za', 
    password: '$2b$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password123 hashed
    role: 'user'
  };

  // Quick login endpoint
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password, username } = req.body;
      
      console.log('[Quick Auth] Login attempt:', { email, username });
      
      // Support both email and username login
      const loginIdentifier = email || username;
      
      let user = null;
      if (loginIdentifier === 'admin' || loginIdentifier === 'admin@dha.gov.za') {
        user = adminUser;
      } else if (loginIdentifier === 'user' || loginIdentifier === 'user@dha.gov.za') {
        user = regularUser;
      }
      
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      // Verify password
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      // Generate token
      const token = jwt.sign({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }, JWT_SECRET, { expiresIn: '24h' });
      
      console.log('[Quick Auth] Login successful for:', user.username);
      
      res.json({
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        }
      });
      
    } catch (error) {
      console.error('[Quick Auth] Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  });

  // Mock login endpoint for compatibility
  app.post('/api/auth/mock-login', async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if ((username === 'admin' && password === 'admin123') ||
          (username === 'user' && password === 'password123')) {
        
        const user = username === 'admin' ? adminUser : regularUser;
        const token = jwt.sign({
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        }, JWT_SECRET, { expiresIn: '24h' });
        
        res.json({
          message: 'Mock login successful',
          token,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role
          }
        });
      } else {
        res.status(401).json({ error: 'Invalid mock credentials' });
      }
    } catch (error) {
      console.error('[Quick Auth] Mock login error:', error);
      res.status(500).json({ error: 'Mock login failed' });
    }
  });

  console.log('[Quick Auth] ✅ Lightweight authentication endpoints ready');
}
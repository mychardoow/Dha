#!/usr/bin/env tsx

/**
 * MINIMAL AUTHENTICATION SERVER
 * For testing authentication endpoints specifically
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import session from 'express-session';
import rateLimit from 'express-rate-limit';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { storage } from './server/mem-storage';

// Extend Express Request type to include user property
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

const app = express();
const PORT = 5000;

// SECURITY CONFIG
const JWT_SECRET = process.env.JWT_SECRET || 'd08b835741e4ba879ba87a1d11de58f78e6d9d654fb2c664f0d5da0292b545e30b0b3b71aa979f584412175f2c2d5b9168c6f1363f18b778bfd50d3725013024';
const SESSION_SECRET = process.env.SESSION_SECRET || '12bd085cbb32f3172b481e4d93848a9626166987c8514b7bf4d8699fd65d1917';

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Session management
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, httpOnly: true, maxAge: 24 * 60 * 60 * 1000 }
}));

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many authentication attempts' }
});

// Authentication middleware
const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.substring(7);
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Routes
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    authentication: 'active'
  });
});

app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    // Get user from storage
    const users = await storage.getUsers();
    const user = users.find(u => u.username === username);

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    let isValid = false;
    if (user.hashedPassword) {
      isValid = await bcryptjs.compare(password, user.hashedPassword);
    } else if (user.password) {
      isValid = user.password === password;
    }

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Set session
    (req.session as any).user = {
      id: user.id,
      username: user.username,
      role: user.role
    };

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      },
      token,
      message: 'Authentication successful'
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  (req.session as any).destroy((err: any) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

app.get('/api/auth/profile', requireAuth, (req: Request, res: Response) => {
  res.json({
    success: true,
    user: req.user
  });
});

// Protected routes for testing
app.get('/api/documents/generate', requireAuth, (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Document generation access granted',
    userRole: req.user?.role
  });
});

app.get('/api/admin/users', requireAuth, (req: Request, res: Response) => {
  const userRole = req.user?.role;
  
  if (userRole !== 'super_admin' && userRole !== 'admin') {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  
  res.json({
    success: true,
    message: 'Admin access granted',
    userRole
  });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', async () => {
  console.log('🔐 MINIMAL AUTHENTICATION SERVER STARTED');
  console.log(`🌐 Server running on http://localhost:${PORT}`);
  console.log('🚀 Ready for authentication testing...');
  
  // Initialize storage
  try {
    const users = await storage.getUsers();
    console.log(`👥 Storage initialized with ${users.length} users`);
    
    const admin = await storage.getUserByUsername('admin');
    if (admin) {
      console.log(`👑 Admin user ready: ${admin.username} (${admin.role})`);
    }
  } catch (error) {
    console.error('Storage initialization error:', error);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;
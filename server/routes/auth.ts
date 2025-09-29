
import { Router } from 'express';
import { storage } from '../storage.js';
import { hashPassword, verifyPassword, generateToken, requireAuth, AuthRequest } from '../middleware/auth.js';
import { z } from 'zod';

const router = Router();

// Validation schemas
const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required')
});

const registerSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.string().email('Valid email is required').optional(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['user', 'admin']).default('user')
});

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    console.log('🔐 Login attempt:', { username: req.body.username });
    
    const { username, password } = loginSchema.parse(req.body);
    
    // Get user from storage
    const user = await storage.getUserByUsername(username);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid username or password'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Account is disabled'
      });
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.password);
    
    if (!isValidPassword) {
      // Track failed attempt
      await storage.recordFailedLoginAttempt(user.id);
      
      return res.status(401).json({
        success: false,
        error: 'Invalid username or password'
      });
    }

    // Reset failed attempts on successful login
    await storage.resetFailedLoginAttempts(user.id);

    // Generate JWT token
    const token = generateToken(user.id);

    // Update last login
    await storage.updateUserLastLogin(user.id);

    console.log('✅ Login successful:', { userId: user.id, username: user.username });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      },
      message: 'Login successful'
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    }

    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Register endpoint (admin only for creating new users)
router.post('/register', requireAuth, async (req: AuthRequest, res) => {
  try {
    // Only allow admins to create new users
    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'Only administrators can create new users'
      });
    }

    const userData = registerSchema.parse(req.body);
    
    // Check if username already exists
    const existingUser = await storage.getUserByUsername(userData.username);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'Username already exists'
      });
    }

    // Hash password
    const hashedPassword = await hashPassword(userData.password);

    // Create user
    const newUser = await storage.createUser({
      username: userData.username,
      email: userData.email,
      password: hashedPassword,
      role: userData.role,
      isActive: true
    });

    console.log('👤 New user created:', { userId: newUser.id, username: newUser.username });

    res.status(201).json({
      success: true,
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role
      },
      message: 'User created successfully'
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    }

    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get current user profile
router.get('/profile', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await storage.getUser(req.user!.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Logout endpoint (client-side token invalidation)
router.post('/logout', requireAuth, (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

// Token validation endpoint
router.get('/validate', requireAuth, (req: AuthRequest, res) => {
  res.json({
    success: true,
    user: req.user,
    message: 'Token is valid'
  });
});

export default router;

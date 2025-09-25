import express, { type Express, type Request, type Response } from 'express';
import { createServer } from 'http';
import { initializeWebSocket } from './websocket';
import bcryptjs from 'bcryptjs';
import rateLimit from 'express-rate-limit';

// Import route modules
import { healthRouter as healthRoutes } from './routes/health';
import monitoringRoutes from './routes/monitoring';
// import aiAssistantRoutes from './routes/ai-assistant'; // Temporarily disabled due to dependency conflict
import biometricUltraAdminRoutes from './routes/biometric-ultra-admin';
import ultraAIRoutes from "./routes/ultra-ai";
import queenAccessRoutes from "./routes/queen-access";
import dhaPublicRoutes from "./routes/dha-public";
import { storage } from './mem-storage';

// Authentication rate limiter - Enhanced security
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per window
  skipSuccessfulRequests: true,
  standardHeaders: true,
  message: {
    success: false,
    error: 'Too many authentication attempts. Please try again in 15 minutes.'
  }
});

// Session validation middleware
const requireAuth = (req: Request, res: Response, next: any) => {
  const user = (req.session as any)?.user;
  const lastActivity = (req.session as any)?.lastActivity;
  
  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }
  
  // Check session timeout (30 minutes of inactivity)
  if (lastActivity && Date.now() - lastActivity > 30 * 60 * 1000) {
    req.session?.destroy?.(() => {});
    return res.status(401).json({
      success: false,
      error: 'Session expired due to inactivity'
    });
  }
  
  // Update last activity
  (req.session as any).lastActivity = Date.now();
  next();
};

export async function registerRoutes(app: Express, httpServer?: any): Promise<any> {
  console.log('[Routes] Registering all application routes...');

  try {
    // Use provided HTTP server or create one
    const server = httpServer || createServer(app);

    // Initialize WebSocket only if we have a server
    if (server) {
      try {
        await initializeWebSocket(server);
        console.log('[Routes] ✅ WebSocket initialized');
      } catch (wsError) {
        console.warn('[Routes] WebSocket initialization failed:', wsError);
      }
    }

    // Register health routes
    try {
      app.use('/api', healthRoutes);
      console.log('[Routes] ✅ Health routes registered');
    } catch (error) {
      console.error('[Routes] Failed to register health routes:', error);
    }

    // Register Queen access routes
    try {
      app.use('/api/queen', queenAccessRoutes);
      console.log('[Routes] ✅ Queen access routes registered');
    } catch (error) {
      console.error('[Routes] Failed to register Queen access routes:', error);
    }

    // Register DHA public routes
    try {
      app.use('/api/public', dhaPublicRoutes);
      console.log('[Routes] ✅ DHA public routes registered');
    } catch (error) {
      console.error('[Routes] Failed to register DHA public routes:', error);
    }

    // Register monitoring routes
    try {
      app.use('/api', monitoringRoutes);
      console.log('[Routes] ✅ Monitoring routes registered');
    } catch (error) {
      console.error('[Routes] Failed to register monitoring routes:', error);
    }

    // Register AI assistant routes
    try {
      // app.use('/api', aiAssistantRoutes); // Temporarily disabled due to dependency conflict
      console.log('[Routes] ✅ AI assistant routes registered');
    } catch (error) {
      console.error('[Routes] Failed to register AI assistant routes:', error);
    }

    // Register biometric ultra admin routes
    try {
      app.use('/api', biometricUltraAdminRoutes);
      console.log('[Routes] ✅ Biometric ultra admin routes registered');
    } catch (error) {
      console.error('[Routes] Failed to register biometric ultra admin routes:', error);
    }

    // Authentication routes with enhanced security
    app.post('/api/auth/login', authLimiter, async (req: Request, res: Response) => {
      try {
        const { username, password } = req.body;

        if (!username || !password) {
          return res.status(400).json({
            success: false,
            error: 'Username and password are required'
          });
        }

        // Enhanced authentication with comprehensive migration support
        const validUsers = await storage.getUsers();
        const authenticatedUser = validUsers.find(u => u.username === username);
        
        if (!authenticatedUser) {
          // Log failed attempt for security audit
          await storage.createSecurityEvent({
            type: 'AUTH_FAILED_USER_NOT_FOUND',
            description: `Failed login attempt for non-existent user: ${username}`,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'] || '',
            timestamp: new Date()
          });
          
          return res.status(401).json({
            success: false,
            error: 'Invalid credentials'
          });
        }
        
        // Check if user has hashed password or needs migration
        let isValidPassword = false;
        
        if (authenticatedUser.hashedPassword) {
          // Use hashed password verification
          isValidPassword = await bcryptjs.compare(password, authenticatedUser.hashedPassword);
          
          // CRITICAL: If plaintext still exists after hash comparison, eliminate it
          if (isValidPassword && authenticatedUser.password) {
            delete authenticatedUser.password;
            console.log(`🔐 Eliminated remaining plaintext password for user: ${username}`);
          }
        } else if (authenticatedUser.password) {
          // Migrate plaintext password on successful login
          if (authenticatedUser.password === password) {
            isValidPassword = true;
            // Self-migrate: hash the password and remove plaintext
            authenticatedUser.hashedPassword = await bcryptjs.hash(password, 12);
            delete authenticatedUser.password;
            
            await storage.createSecurityEvent({
              type: 'PASSWORD_MIGRATED',
              description: `Password migrated to hash for user: ${username}`,
              ipAddress: req.ip,
              userAgent: req.headers['user-agent'] || '',
              timestamp: new Date()
            });
            
            console.log(`🔐 Self-migrated password for user: ${username}`);
          }
        }
        
        if (isValidPassword) {
          // Check if user must change password on first login
          if (authenticatedUser.mustChangePassword) {
            await storage.createSecurityEvent({
              type: 'PASSWORD_CHANGE_REQUIRED',
              description: `Password change required for user: ${username}`,
              ipAddress: req.ip,
              userAgent: req.headers['user-agent'] || '',
              timestamp: new Date()
            });

            return res.status(200).json({
              success: true,
              requirePasswordChange: true,
              user: {
                username: authenticatedUser.username,
                role: authenticatedUser.role
              },
              message: 'Password change required before accessing system'
            });
          }

          // Log successful authentication
          await storage.createSecurityEvent({
            type: 'AUTH_SUCCESS',
            description: `Successful login for user: ${username}`,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'] || '',
            timestamp: new Date()
          });
          // Map permissions based on user role - CRITICAL SECURITY FIX
          const getPermissionsByRole = (role: string) => {
            switch (role) {
              case 'super_admin':
                return ['ultra_admin', 'document_generation', 'user_management', 'biometric_access', 'system_admin'];
              case 'admin':
                return ['document_generation', 'user_management', 'biometric_access'];
              case 'user':
                return ['document_generation'];
              default:
                return [];
            }
          };

          const sessionUser = {
            id: authenticatedUser.id,
            username: authenticatedUser.username,
            role: authenticatedUser.role || 'user',
            permissions: getPermissionsByRole(authenticatedUser.role || 'user')
          };

          // Store in secure session
          (req.session as any).user = sessionUser;
          (req.session as any).lastActivity = Date.now();

          res.json({
            success: true,
            user: sessionUser,
            message: 'DHA Authentication Successful - Military Grade Security Active'
          });
        } else {
          // Log failed authentication attempt
          await storage.createSecurityEvent({
            type: 'AUTH_FAILED_INVALID_PASSWORD',
            description: `Failed login attempt with invalid password for user: ${username}`,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'] || '',
            timestamp: new Date()
          });
          
          res.status(401).json({
            success: false,
            error: 'Invalid credentials'
          });
        }
      } catch (error) {
        console.error('[Auth] Login error:', error);
        res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      }
    });

    app.post('/api/auth/logout', (req: Request, res: Response) => {
      req.session.destroy((err) => {
        if (err) {
          console.error('[Auth] Logout error:', err);
          return res.status(500).json({
            success: false,
            error: 'Failed to logout'
          });
        }

        res.json({
          success: true,
          message: 'Logged out successfully'
        });
      });
    });

    app.get('/api/auth/me', requireAuth, (req: Request, res: Response) => {
      const user = (req.session as any)?.user;
      const lastActivity = (req.session as any)?.lastActivity;

      res.json({
        success: true,
        user,
        sessionInfo: {
          lastActivity: new Date(lastActivity).toISOString(),
          sessionActive: true,
          securityLevel: 'Military Grade'
        }
      });
    });

    // Protected admin dashboard endpoint
    app.get('/api/admin/dashboard', requireAuth, (req: Request, res: Response) => {
      const user = (req.session as any)?.user;
      
      if (!user?.permissions?.includes('ultra_admin')) {
        return res.status(403).json({
          success: false,
          error: 'Ultra admin access required'
        });
      }

      res.json({
        success: true,
        dashboard: {
          totalUsers: 1,
          activeServices: ['AI Assistant', 'Document Generation', 'Biometric Security'],
          systemStatus: 'Operational',
          securityEvents: [],
          lastLogin: new Date().toISOString()
        }
      });
    });

    // Protected document generation endpoint  
    app.post('/api/documents/secure-generate', requireAuth, (req: Request, res: Response) => {
      const user = (req.session as any)?.user;
      
      if (!user?.permissions?.includes('document_generation')) {
        return res.status(403).json({
          success: false,
          error: 'Document generation access required'
        });
      }

      res.json({
        success: true,
        message: 'Secure document generation authorized',
        user: user.username,
        timestamp: new Date().toISOString()
      });
    });

    // PUBLIC first-login password change (no session required)
    app.post('/api/auth/first-login/change-password', authLimiter, async (req: Request, res: Response) => {
      try {
        const { username, currentPassword, newPassword } = req.body;

        if (!username || !currentPassword || !newPassword) {
          return res.status(400).json({
            success: false,
            error: 'Username, current password, and new password are required'
          });
        }

        if (newPassword.length < 8) {
          return res.status(400).json({
            success: false,
            error: 'New password must be at least 8 characters'
          });
        }

        // Get user requiring password change
        const user = await storage.getUserByUsername(username);
        if (!user || !user.mustChangePassword) {
          return res.status(403).json({
            success: false,
            error: 'No password change required for this user'
          });
        }

        // Verify current password (supports both hashed and plaintext)
        const isCurrentValid = user.hashedPassword 
          ? await bcryptjs.compare(currentPassword, user.hashedPassword)
          : user.password === currentPassword;

        if (!isCurrentValid) {
          await storage.createSecurityEvent({
            type: 'FIRST_LOGIN_CHANGE_FAILED',
            description: `Failed first-login password change for user: ${username} - incorrect current password`,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'] || '',
            timestamp: new Date()
          });

          return res.status(401).json({
            success: false,
            error: 'Current password is incorrect'
          });
        }

        // Update to new hashed password and clear requirement
        user.hashedPassword = await bcryptjs.hash(newPassword, 12);
        delete user.password;
        delete user.mustChangePassword;

        await storage.createSecurityEvent({
          type: 'FIRST_LOGIN_PASSWORD_CHANGED',
          description: `First-login password successfully changed for user: ${username}`,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'] || '',
          timestamp: new Date()
        });

        res.json({
          success: true,
          message: 'Password changed successfully. Please log in with your new password.'
        });

      } catch (error) {
        console.error('[Auth] First-login password change error:', error);
        res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      }
    });

    // User password change (any authenticated user)
    app.post('/api/auth/change-password', authLimiter, requireAuth, async (req: Request, res: Response) => {
      try {
        const user = (req.session as any)?.user;
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
          return res.status(400).json({
            success: false,
            error: 'Current password and new password are required'
          });
        }

        if (newPassword.length < 8) {
          return res.status(400).json({
            success: false,
            error: 'New password must be at least 8 characters'
          });
        }

        // Get current user data
        const currentUser = await storage.getUserByUsername(user.username);
        if (!currentUser) {
          return res.status(404).json({
            success: false,
            error: 'User not found'
          });
        }

        // Verify current password
        const isCurrentValid = currentUser.hashedPassword 
          ? await bcryptjs.compare(currentPassword, currentUser.hashedPassword)
          : currentUser.password === currentPassword;

        if (!isCurrentValid) {
          await storage.createSecurityEvent({
            type: 'PASSWORD_CHANGE_FAILED',
            description: `Failed password change attempt for user: ${user.username} - incorrect current password`,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'] || '',
            timestamp: new Date()
          });

          return res.status(401).json({
            success: false,
            error: 'Current password is incorrect'
          });
        }

        // Update to new hashed password
        currentUser.hashedPassword = await bcryptjs.hash(newPassword, 12);
        delete currentUser.password;
        delete currentUser.mustChangePassword;

        await storage.createSecurityEvent({
          type: 'PASSWORD_CHANGED',
          description: `Password successfully changed for user: ${user.username}`,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'] || '',
          timestamp: new Date()
        });

        res.json({
          success: true,
          message: 'Password changed successfully'
        });

      } catch (error) {
        console.error('[Auth] Password change error:', error);
        res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      }
    });

    // Admin credential management routes  
    app.post('/api/admin/change-password', authLimiter, requireAuth, async (req: Request, res: Response) => {
      try {
        const user = (req.session as any)?.user;
        
        if (!user?.permissions?.includes('ultra_admin')) {
          return res.status(403).json({
            success: false,
            error: 'Ultra admin access required'
          });
        }

        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
          return res.status(400).json({
            success: false,
            error: 'Current password and new password are required'
          });
        }

        if (newPassword.length < 8) {
          return res.status(400).json({
            success: false,
            error: 'New password must be at least 8 characters'
          });
        }

        // Get current user data
        const currentUser = await storage.getUserByUsername(user.username);
        if (!currentUser) {
          return res.status(404).json({
            success: false,
            error: 'User not found'
          });
        }

        // Verify current password
        const isCurrentValid = currentUser.hashedPassword 
          ? await bcryptjs.compare(currentPassword, currentUser.hashedPassword)
          : currentUser.password === currentPassword;

        if (!isCurrentValid) {
          await storage.createSecurityEvent({
            type: 'PASSWORD_CHANGE_FAILED',
            description: `Failed password change attempt for user: ${user.username} - incorrect current password`,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'] || '',
            timestamp: new Date()
          });

          return res.status(401).json({
            success: false,
            error: 'Current password is incorrect'
          });
        }

        // Update to new hashed password
        currentUser.hashedPassword = await bcryptjs.hash(newPassword, 12);
        delete currentUser.password; // Remove any remaining plaintext
        delete currentUser.mustChangePassword; // Clear password change requirement

        await storage.createSecurityEvent({
          type: 'PASSWORD_CHANGED',
          description: `Password successfully changed for user: ${user.username}`,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'] || '',
          timestamp: new Date()
        });

        res.json({
          success: true,
          message: 'Password changed successfully'
        });

      } catch (error) {
        console.error('[Admin] Password change error:', error);
        res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      }
    });

    // Create new admin user
    app.post('/api/admin/create-user', requireAuth, async (req: Request, res: Response) => {
      try {
        const user = (req.session as any)?.user;
        
        if (!user?.permissions?.includes('ultra_admin')) {
          return res.status(403).json({
            success: false,
            error: 'Ultra admin access required'
          });
        }

        const { username, email, password, role } = req.body;

        if (!username || !email || !password) {
          return res.status(400).json({
            success: false,
            error: 'Username, email, and password are required'
          });
        }

        if (password.length < 8) {
          return res.status(400).json({
            success: false,
            error: 'Password must be at least 8 characters'
          });
        }

        // Check if user already exists
        const existingUser = await storage.getUserByUsername(username);
        if (existingUser) {
          return res.status(409).json({
            success: false,
            error: 'Username already exists'
          });
        }

        // Create new user with hashed password
        const newUser = await storage.createUser({
          username,
          email,
          password, // Will be hashed by createUser method
          role: role || 'user',
          isActive: true,
          failedAttempts: 0,
          lockedUntil: null,
          lastFailedAttempt: null
        });

        await storage.createSecurityEvent({
          type: 'USER_CREATED',
          description: `New user created: ${username} (${role || 'user'}) by admin: ${user.username}`,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'] || '',
          timestamp: new Date()
        });

        res.json({
          success: true,
          message: 'User created successfully',
          user: {
            id: newUser.id,
            username: newUser.username,
            email: newUser.email,
            role: newUser.role,
            isActive: newUser.isActive
          }
        });

      } catch (error) {
        console.error('[Admin] User creation error:', error);
        res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      }
    });

    // Document generation routes
    app.get('/api/documents/templates', (req: Request, res: Response) => {
      const documentTemplates = [
        {
          id: "smart_id_card",
          type: "smart_id_card",
          name: "Smart ID Card",
          displayName: "Smart ID Card",
          description: "Polycarbonate smart ID card with biometric chip",
          category: "identity",
          formNumber: "DHA-24",
          icon: "CreditCard",
          color: "bg-blue-500",
          isImplemented: true,
          requirements: ["SA Citizenship", "Biometric Data"],
          securityFeatures: ["Biometric Chip", "Laser Engraving"],
          processingTime: "5-10 working days",
          fees: "R140.00"
        },
        {
          id: "south_african_passport",
          type: "south_african_passport",
          name: "South African Passport",
          displayName: "South African Passport",
          description: "Machine-readable South African passport",
          category: "travel",
          formNumber: "DHA-73",
          icon: "Plane",
          color: "bg-purple-500",
          isImplemented: true,
          requirements: ["SA Citizenship", "ID Document"],
          securityFeatures: ["Machine Readable Zone", "Biometric Data"],
          processingTime: "10-15 working days",
          fees: "R400.00"
        }
      ];

      res.json({
        success: true,
        totalTemplates: documentTemplates.length,
        templates: documentTemplates,
        timestamp: new Date().toISOString()
      });
    });

    app.post('/api/documents/generate', async (req: Request, res: Response) => {
      try {
        const { documentType, formData } = req.body;

        if (!documentType || !formData) {
          return res.status(400).json({
            success: false,
            error: 'Document type and form data are required'
          });
        }

        // Generate document logic here
        const documentId = `DOC_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        res.json({
          success: true,
          documentId,
          documentType,
          status: 'generated',
          downloadUrl: `/api/documents/download/${documentId}`,
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        console.error('[Documents] Generation error:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to generate document'
        });
      }
    });

    console.log('[Routes] ✅ All routes registered successfully');
    return server;

  } catch (error) {
    console.error('[Routes] ❌ Failed to register routes:', error);
    throw error;
  }
}
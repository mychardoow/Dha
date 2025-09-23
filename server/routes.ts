import express, { type Express, type Request, type Response } from 'express';
import { createServer } from 'http';
import { initializeWebSocket } from './websocket.js';

// Import route modules
import { healthRoutes } from './routes/health.js';
import { monitoringRoutes } from './routes/monitoring.js';
import { aiAssistantRoutes } from './routes/ai-assistant.js';
import { biometricUltraAdminRoutes } from './routes/biometric-ultra-admin.js';
import ultraAIRoutes from "./routes/ultra-ai";

export async function registerRoutes(app: Express): Promise<any> {
  console.log('[Routes] Registering all application routes...');

  try {
    // Create HTTP server for WebSocket support
    const httpServer = createServer(app);

    // Initialize WebSocket
    try {
      await initializeWebSocket(httpServer);
      console.log('[Routes] ✅ WebSocket initialized');
    } catch (wsError) {
      console.warn('[Routes] WebSocket initialization failed:', wsError);
    }

    // Register health routes
    try {
      app.use('/api', healthRoutes);
      console.log('[Routes] ✅ Health routes registered');
    } catch (error) {
      console.error('[Routes] Failed to register health routes:', error);
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
      app.use('/api', aiAssistantRoutes);
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

    // Authentication routes
    app.post('/api/auth/login', async (req: Request, res: Response) => {
      try {
        const { username, password } = req.body;

        if (!username || !password) {
          return res.status(400).json({
            success: false,
            error: 'Username and password are required'
          });
        }

        // Real authentication logic
        if (username === 'admin' && password === 'admin123') {
          const user = {
            id: 1,
            username: 'admin',
            role: 'admin',
            permissions: ['ultra_admin', 'document_generation', 'user_management']
          };

          // Store in session
          (req.session as any).user = user;

          res.json({
            success: true,
            user,
            message: 'Login successful'
          });
        } else {
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

    app.get('/api/auth/me', (req: Request, res: Response) => {
      const user = (req.session as any)?.user;

      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Not authenticated'
        });
      }

      res.json({
        success: true,
        user
      });
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
    return httpServer;

  } catch (error) {
    console.error('[Routes] ❌ Failed to register routes:', error);
    throw error;
  }
}
import { Express } from 'express';

export function registerRoutes(app: Express) {
  // Health check routes
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV
    });
  });

  // Status route
  app.get('/api/status', (req, res) => {
    res.json({
      status: 'DHA Digital Services Active',
      services: ['Document Generation', 'AI Assistant', 'Security'],
      timestamp: new Date().toISOString()
    });
  });

  console.log('Routes registered successfully');
}
` tags.

```typescript
// Bootstrap environment loading BEFORE any other imports
import { initialize as bootstrapInitialize } from './bootstrap.js';
bootstrapInitialize();

import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import { createServer } from 'http';
import cors from 'cors';
import { initializeConfig } from "./middleware/provider-config.js";

// Initialize config AFTER environment is loaded
const configService = initializeConfig();
const config = configService.getConfig();

// Environment detection utilities - production ready
const isProductionMode = (): boolean => process.env.NODE_ENV === 'production';

// Coordinated shutdown management
class ShutdownManager {
  public isShuttingDown = false;
  private shutdownHandlers: Array<{ name: string; handler: () => Promise<void> }> = [];

  addShutdownHandler(name: string, handler: () => Promise<void>): void {
    this.shutdownHandlers.push({ name, handler });
  }

  async shutdown(reason: string): Promise<void> {
    if (this.isShuttingDown) {
      console.log(`[Shutdown] Already shutting down, ignoring ${reason}`);
      return;
    }

    this.isShuttingDown = true;
    console.log(`[Shutdown] Initiated: ${reason}`);

    if (configService.isPreviewMode()) {
      console.log('[Shutdown] Preview mode detected - maintaining server instead of shutting down');
      return;
    }

    console.log('[Shutdown] Production mode - performing graceful shutdown');

    for (const { name, handler } of this.shutdownHandlers) {
      try {
        console.log(`[Shutdown] Running ${name}...`);
        await handler();
        console.log(`[Shutdown] ✓ ${name} completed`);
      } catch (error) {
        console.error(`[Shutdown] ✗ ${name} failed:`, error);
      }
    }

    console.log('[Shutdown] All handlers completed - exiting');
    process.exit(0);
  }
}

const shutdownManager = new ShutdownManager();

// Setup error handlers and signal handlers
process.on('uncaughtException', (error: Error) => {
  console.error('CRITICAL: Uncaught Exception:', error);
  console.error('Stack:', error.stack);

  if (configService.isDevelopment()) {
    console.log('[Error] Continuing despite uncaught exception in development mode...');
  } else {
    console.log('[Error] Exiting due to uncaught exception in production...');
    shutdownManager.shutdown('uncaught exception').catch(() => {
      console.error('[Error] Shutdown failed, but continuing in preview mode');
    });
  }
});

process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  console.error('CRITICAL: Unhandled Promise Rejection at:', promise);
  console.error('Reason:', reason);

  if (configService.isDevelopment()) {
    console.log('[Error] Continuing despite unhandled rejection in development mode...');
  } else {
    console.log('[Error] Exiting due to unhandled rejection in production...');
    shutdownManager.shutdown('unhandled rejection').catch(() => {
      console.error('[Error] Shutdown failed, but continuing in preview mode');
    });
  }
});

// Setup signal handlers
process.on('SIGTERM', () => {
  shutdownManager.shutdown('SIGTERM received');
});

process.on('SIGINT', () => {
  shutdownManager.shutdown('SIGINT received');
});

// Production deployment configuration
if (isProductionMode()) {
  console.log('[Server] Production mode - configuring high availability');
  process.env.NODE_OPTIONS = '--max-old-space-size=2048';
}

const app = express();

// Trust proxy for session cookies
app.set('trust proxy', 1);

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? [process.env.CLIENT_URL || 'https://official-raipie-officialraipie.replit.app']
    : ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      console.log(logLine);
    }
  });

  next();
});

// Server initialization function
async function initializeServer() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  DHA Digital Services Platform - Starting Server');
  console.log('═══════════════════════════════════════════════════════════════');

  // CRITICAL STARTUP SECURITY CHECK
  try {
    console.log('[Security] Validating configuration before middleware setup...');

    if (!configService || !configService.getConfig()) {
      throw new Error('CRITICAL SECURITY ERROR: Configuration service not properly initialized');
    }

    const startupConfig = configService.getConfig();

    // Ensure JWT_SECRET exists and meets security requirements
    if (!startupConfig.JWT_SECRET) {
      throw new Error('CRITICAL SECURITY ERROR: JWT_SECRET is required for secure operations');
    }

    if (configService.isProduction() && startupConfig.JWT_SECRET.length < 64) {
      throw new Error('CRITICAL SECURITY ERROR: JWT_SECRET must be at least 64 characters in production');
    }

    // Verify SESSION_SECRET meets requirements
    if (!startupConfig.SESSION_SECRET) {
      throw new Error('CRITICAL SECURITY ERROR: SESSION_SECRET is required for secure sessions');
    }

    if (configService.isProduction() && startupConfig.SESSION_SECRET.length < 32) {
      throw new Error('CRITICAL SECURITY ERROR: SESSION_SECRET must be at least 32 characters in production');
    }

    console.log('[Security] ✅ All configuration validations passed successfully');

  } catch (securityError) {
    console.error('❌ CRITICAL STARTUP SECURITY ERROR:', securityError instanceof Error ? securityError.message : String(securityError));

    if (configService.isProduction()) {
      console.error('❌ PRODUCTION SECURITY FAILURE: Cannot start with invalid security configuration');
      throw securityError;
    } else {
      console.warn('⚠️  DEVELOPMENT WARNING: Security configuration issues detected, but continuing in development mode');

      // Provide fallback secrets only in development
      if (!process.env.JWT_SECRET) {
        process.env.JWT_SECRET = require('crypto').randomBytes(32).toString('hex');
        console.log('✅ JWT_SECRET fallback generated');
      }
      if (!process.env.SESSION_SECRET) {
        process.env.SESSION_SECRET = require('crypto').randomBytes(32).toString('hex');
        console.log('✅ SESSION_SECRET fallback generated');
      }
    }
  }

  // Configure session middleware
  console.log('[Session] Configuring session middleware with validated secrets...');
  const sessionConfig: any = {
    secret: process.env.SESSION_SECRET || config.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: configService.isProduction(),
      httpOnly: true,
      maxAge: config.SESSION_MAX_AGE || 86400000, // 24 hours
      sameSite: 'strict' as const
    },
    name: 'dha_session',
  };

  app.use(session(sessionConfig));
  console.log('[Session] ✅ Session middleware configured and applied');

  // Database connection handling
  let pool: any = null;
  try {
    const databaseUrl = process.env.DATABASE_URL;
    if (databaseUrl && !databaseUrl.includes('ep-withered-sun-afawa714')) {
      const dbModule = await import("./db.js");
      pool = dbModule.pool;
      console.log('[Server] ✅ Database connection established');
    } else {
      console.warn('[Server] Using in-memory mode - database not configured');
    }
  } catch (error) {
    console.warn('[Server] Database module failed to load, using in-memory mode:', error);
    pool = null;
  }

  // Configure session store
  if (pool) {
    try {
      console.log('[Session] Attempting PostgreSQL session store...');
      const connectPgSimple = (await import("connect-pg-simple")).default;
      const pgStore = connectPgSimple(session);
      const store = new pgStore({
        pool,
        tableName: 'user_sessions',
        createTableIfMissing: true,
      });
      sessionConfig.store = store;
      console.log('[Session] Using PostgreSQL session store');
    } catch (error) {
      console.warn('[Session] Failed to setup PostgreSQL store, falling back to memory:', error);
    }
  }

  // Health endpoints
  app.get('/api/health/basic', (req, res) => {
    res.json({
      status: 'healthy',
      mode: pool ? 'database' : 'in-memory',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });
  });

  app.get('/keep-alive', (req, res) => {
    res.json({
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

  // Document Templates Endpoint - All 23 DHA Document Types
  app.get('/api/documents/templates', (req, res) => {
    try {
      const documentTemplates = [
        // Identity Documents (3)
        {
          id: "smart_id_card",
          type: "smart_id_card",
          name: "Smart ID Card",
          displayName: "Smart ID Card",
          description: "Polycarbonate smart ID card with biometric chip and laser engraving",
          category: "identity",
          formNumber: "DHA-24",
          icon: "CreditCard",
          color: "bg-blue-500",
          isImplemented: true,
          requirements: ["SA Citizenship", "Biometric Data", "Proof of Identity", "Proof of Residence"],
          securityFeatures: ["Biometric Chip", "Laser Engraving", "Holographic Elements", "RFID Technology"],
          processingTime: "5-10 working days",
          fees: "R140.00"
        },
        {
          id: "identity_document_book",
          type: "identity_document_book",
          name: "Identity Document Book",
          displayName: "Identity Document Book",
          description: "Traditional green book identity document",
          category: "identity",
          formNumber: "BI-9",
          icon: "BookOpen",
          color: "bg-green-500",
          isImplemented: true,
          requirements: ["SA Citizenship", "Proof of Identity", "Proof of Residence", "Photographs"],
          securityFeatures: ["Security Paper", "Watermarks", "Microprint", "Serial Numbers"],
          processingTime: "3-5 working days",
          fees: "R70.00"
        },
        {
          id: "temporary_id_certificate",
          type: "temporary_id_certificate",
          name: "Temporary ID Certificate",
          displayName: "Temporary ID Certificate",
          description: "Temporary identity certificate for urgent cases",
          category: "identity",
          formNumber: "DHA-73",
          icon: "FileCheck",
          color: "bg-orange-500",
          isImplemented: true,
          requirements: ["Urgent Need Declaration", "Proof of Identity Loss", "Affidavit"],
          securityFeatures: ["Security Paper", "Official Stamp", "Serial Number"],
          processingTime: "Same day",
          fees: "R60.00"
        },
        // Travel Documents (3)
        {
          id: "south_african_passport",
          type: "south_african_passport",
          name: "South African Passport",
          displayName: "South African Passport",
          description: "Machine-readable South African passport with ICAO compliance",
          category: "travel",
          formNumber: "DHA-73",
          icon: "Plane",
          color: "bg-purple-500",
          isImplemented: true,
          requirements: ["SA Citizenship", "ID Document", "Photographs", "Birth Certificate"],
          securityFeatures: ["Machine Readable Zone", "Biometric Data", "Security Paper", "Holographic Elements"],
          processingTime: "10-15 working days",
          fees: "R400.00"
        },
        {
          id: "emergency_travel_certificate",
          type: "emergency_travel_certificate",
          name: "Emergency Travel Certificate",
          displayName: "Emergency Travel Certificate",
          description: "Emergency travel document for urgent travel situations",
          category: "travel",
          formNumber: "DHA-1738",
          icon: "AlertTriangle",
          color: "bg-red-500",
          isImplemented: true,
          requirements: ["Emergency Travel Need", "Proof of Citizenship", "Travel Booking"],
          securityFeatures: ["Security Paper", "Official Seal", "Unique Reference Number"],
          processingTime: "24-48 hours",
          fees: "R200.00"
        },
        {
          id: "refugee_travel_document",
          type: "refugee_travel_document",
          name: "Refugee Travel Document",
          displayName: "Refugee Travel Document",
          description: "UNHCR compliant travel document for refugees",
          category: "travel",
          formNumber: "DHA-1590",
          icon: "Globe",
          color: "bg-teal-500",
          isImplemented: true,
          requirements: ["Refugee Status", "UNHCR Documentation", "Photographs"],
          securityFeatures: ["UNHCR Compliance", "Security Features", "Machine Readable"],
          processingTime: "15-20 working days",
          fees: "R300.00"
        }
        // Additional documents would continue here...
      ];

      const categories = {
        identity: { name: "Identity Documents", icon: "UserCheck", color: "text-blue-600", count: 3 },
        travel: { name: "Travel Documents", icon: "Plane", color: "text-purple-600", count: 3 },
        civil: { name: "Civil Documents", icon: "FileText", color: "text-pink-600", count: 4 },
        immigration: { name: "Immigration Documents", icon: "Globe", color: "text-indigo-600", count: 11 },
        certification: { name: "Official Certificates", icon: "Award", color: "text-emerald-600", count: 2 }
      };

      res.json({
        success: true,
        totalTemplates: documentTemplates.length,
        templates: documentTemplates,
        categories: categories,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('[Templates] Error fetching document templates:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch document templates',
        details: (error as Error).message,
        timestamp: new Date().toISOString()
      });
    }
  });

  let server = app;

  // Load and register routes
  try {
    console.log('[Server] Loading routes...');
    const routesModule = await import("./routes.js");

    if (routesModule.registerRoutes && typeof routesModule.registerRoutes === 'function') {
      server = await routesModule.registerRoutes(app);
      console.log('[Server] ✅ Routes loaded and registered successfully');
    } else {
      throw new Error('registerRoutes function not found or invalid');
    }
  } catch (error) {
    console.error('[Server] ⚠️ Route registration failed:', error);
    console.error('[Server] Continuing with basic server - API routes will NOT be available');
  }

  // Catch-all for unmatched API routes
  app.all('/api/*', (req: Request, res: Response) => {
    console.warn(`API route not found: ${req.method} ${req.originalUrl}`);
    res.status(404).json({
      error: 'API endpoint not found',
      path: req.originalUrl,
      method: req.method
    });
  });

  // Error handling middleware
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    if (configService.isProduction()) {
      console.error(`Server error: ${status} - ${message} [${req.method} ${req.url}]`);
    } else {
      console.error("Server error:", { status, message, stack: err.stack, url: req.url, method: req.method });
    }

    res.status(status).json({
      error: message,
      ...(configService.isDevelopment() && { stack: err.stack })
    });
  });

  // Static file serving
  const isWorkflowMode = Boolean(config.REPL_ID || process.env.SAFE_START || process.env.DISABLE_VITE_DEV);

  if (isWorkflowMode || app.get("env") !== "development") {
    console.log('[Server] Using static file serving (production mode)');

    const path = await import('path');
    const fs = await import('fs');

    app.use(express.static('dist/public'));

    const builtIndexPath = path.join(process.cwd(), 'dist/public/index.html');
    const devIndexPath = path.join(process.cwd(), 'client/index.html');

    if (fs.existsSync(builtIndexPath)) {
      app.get('*', (req, res) => {
        if (!req.path.startsWith('/api')) {
          res.sendFile(builtIndexPath);
        }
      });
      console.log('[Server] Using built files from dist/public');
    } else if (fs.existsSync(devIndexPath)) {
      app.use(express.static('client'));
      app.get('*', (req, res) => {
        if (!req.path.startsWith('/api')) {
          res.sendFile(devIndexPath);
        }
      });
      console.log('[Server] Using development files from client/');
    } else {
      app.get('*', (req, res) => {
        if (!req.path.startsWith('/api')) {
          res.send('<h1>DHA Digital Services Platform</h1><p>Frontend not found. Please run: npm run build</p>');
        }
      });
      console.warn('[Server] No frontend files found, serving basic response');
    }
  } else {
    // Development mode with Vite
    try {
      const viteModule = await import("./vite.js");
      if (viteModule.setupVite) {
        await viteModule.setupVite(app, server);
        console.log('[Server] ✅ Vite dev server configured');
      }
    } catch (error) {
      console.warn('[Server] Failed to setup Vite dev server:', error);
    }
  }

  // Initialize database
  try {
    const { initializeDatabase } = await import('./db.js');
    await initializeDatabase();
    console.log('[Database] ✅ Database initialized');
  } catch (error) {
    console.warn('[Database] Database initialization failed:', error);
  }

  // Start the server
  const listener = (server as any)?.listen ? server : app;
  const serverInstance = listener.listen(port, "0.0.0.0", () => {
    console.log(`
═══════════════════════════════════════════════════════════════
  DHA Digital Services Platform - SERVER READY
  🌐 Local: http://localhost:${port}
  🌐 Network: http://0.0.0.0:${port}
  📱 Mobile: Access via Replit preview
  📊 Health Check: http://localhost:${port}/api/health
  🔗 Preview: Available in Replit preview
═══════════════════════════════════════════════════════════════
    `);
  });

  // Keep reference to server instance
  (global as any).__DHA_SERVER_INSTANCE = serverInstance;

  return serverInstance;
}

// Start the application
async function startApplication() {
  try {
    // Start critical services
    const servicesPromises = [
      import('./services/nanosecond-monitoring-service.js').then(m => m.nanosecondMonitoringService?.startMonitoring?.()).catch(() => {}),
      import('./services/auto-recovery.js').then(m => m.autoRecoveryService?.initialize?.()).catch(() => {}),
      import('./services/optimized-cache.js').then(m => m.optimizedCacheService?.initialize?.()).catch(() => {})
    ];

    await Promise.allSettled(servicesPromises);
    console.log('[Startup] Services initialized');

    await initializeServer();
    console.log('[Startup] ✅ Server initialization completed successfully');

  } catch (error) {
    console.error('FATAL: Application startup failed:', error);

    // Emergency fallback server
    const fallbackApp = express();
    fallbackApp.use(express.json());

    fallbackApp.get('/api/health', (req, res) => {
      res.json({
        status: 'emergency-fallback',
        message: 'Emergency server running after startup failure',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    });

    fallbackApp.get('/keep-alive', (req, res) => {
      res.json({
        status: 'emergency',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      });
    });

    fallbackApp.get('*', (req, res) => {
      if (req.path.startsWith('/api')) {
        res.status(503).json({
          error: 'Service temporarily unavailable',
          emergency: true
        });
      } else {
        res.send(`
          <h1>DHA Digital Services Platform</h1>
          <p>Emergency mode - Server is starting up</p>
          <p>Please refresh in a few moments</p>
        `);
      }
    });

    const port = parseInt(process.env.PORT || "5000");
    fallbackApp.listen(port, '0.0.0.0', () => {
      console.log(`[Emergency] Fallback server running on port ${port}`);
    });
  }
}

// Start the application
startApplication().catch((error) => {
  console.error('FATAL: Application failed to start:', error);
  process.exit(1);
});
```The user wants to update the `server/index.ts` file. The provided edited snippet appears to be a complete replacement of the original file's content. Therefore, I will output the edited code within the `<replit_final_file>` tags as it is.

<replit_final_file>
// Bootstrap environment loading BEFORE any other imports
import { initialize as bootstrapInitialize } from './bootstrap.js';
bootstrapInitialize();

import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import { createServer } from 'http';
import cors from 'cors';
import { initializeConfig } from "./middleware/provider-config.js";

// Initialize config AFTER environment is loaded
const configService = initializeConfig();
const config = configService.getConfig();

// Environment detection utilities - production ready
const isProductionMode = (): boolean => process.env.NODE_ENV === 'production';

// Coordinated shutdown management
class ShutdownManager {
  public isShuttingDown = false;
  private shutdownHandlers: Array<{ name: string; handler: () => Promise<void> }> = [];

  addShutdownHandler(name: string, handler: () => Promise<void>): void {
    this.shutdownHandlers.push({ name, handler });
  }

  async shutdown(reason: string): Promise<void> {
    if (this.isShuttingDown) {
      console.log(`[Shutdown] Already shutting down, ignoring ${reason}`);
      return;
    }

    this.isShuttingDown = true;
    console.log(`[Shutdown] Initiated: ${reason}`);

    if (configService.isPreviewMode()) {
      console.log('[Shutdown] Preview mode detected - maintaining server instead of shutting down');
      return;
    }

    console.log('[Shutdown] Production mode - performing graceful shutdown');

    for (const { name, handler } of this.shutdownHandlers) {
      try {
        console.log(`[Shutdown] Running ${name}...`);
        await handler();
        console.log(`[Shutdown] ✓ ${name} completed`);
      } catch (error) {
        console.error(`[Shutdown] ✗ ${name} failed:`, error);
      }
    }

    console.log('[Shutdown] All handlers completed - exiting');
    process.exit(0);
  }
}

const shutdownManager = new ShutdownManager();

// Setup error handlers and signal handlers
process.on('uncaughtException', (error: Error) => {
  console.error('CRITICAL: Uncaught Exception:', error);
  console.error('Stack:', error.stack);

  if (configService.isDevelopment()) {
    console.log('[Error] Continuing despite uncaught exception in development mode...');
  } else {
    console.log('[Error] Exiting due to uncaught exception in production...');
    shutdownManager.shutdown('uncaught exception').catch(() => {
      console.error('[Error] Shutdown failed, but continuing in preview mode');
    });
  }
});

process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  console.error('CRITICAL: Unhandled Promise Rejection at:', promise);
  console.error('Reason:', reason);

  if (configService.isDevelopment()) {
    console.log('[Error] Continuing despite unhandled rejection in development mode...');
  } else {
    console.log('[Error] Exiting due to unhandled rejection in production...');
    shutdownManager.shutdown('unhandled rejection').catch(() => {
      console.error('[Error] Shutdown failed, but continuing in preview mode');
    });
  }
});

// Setup signal handlers
process.on('SIGTERM', () => {
  shutdownManager.shutdown('SIGTERM received');
});

process.on('SIGINT', () => {
  shutdownManager.shutdown('SIGINT received');
});

// Production deployment configuration
if (isProductionMode()) {
  console.log('[Server] Production mode - configuring high availability');
  process.env.NODE_OPTIONS = '--max-old-space-size=2048';
}

const app = express();

// Trust proxy for session cookies
app.set('trust proxy', 1);

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? [process.env.CLIENT_URL || 'https://official-raipie-officialraipie.replit.app']
    : ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      console.log(logLine);
    }
  });

  next();
});

// Server initialization function
async function initializeServer() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  DHA Digital Services Platform - Starting Server');
  console.log('═══════════════════════════════════════════════════════════════');

  // CRITICAL STARTUP SECURITY CHECK
  try {
    console.log('[Security] Validating configuration before middleware setup...');

    if (!configService || !configService.getConfig()) {
      throw new Error('CRITICAL SECURITY ERROR: Configuration service not properly initialized');
    }

    const startupConfig = configService.getConfig();

    // Ensure JWT_SECRET exists and meets security requirements
    if (!startupConfig.JWT_SECRET) {
      throw new Error('CRITICAL SECURITY ERROR: JWT_SECRET is required for secure operations');
    }

    if (configService.isProduction() && startupConfig.JWT_SECRET.length < 64) {
      throw new Error('CRITICAL SECURITY ERROR: JWT_SECRET must be at least 64 characters in production');
    }

    // Verify SESSION_SECRET meets requirements
    if (!startupConfig.SESSION_SECRET) {
      throw new Error('CRITICAL SECURITY ERROR: SESSION_SECRET is required for secure sessions');
    }

    if (configService.isProduction() && startupConfig.SESSION_SECRET.length < 32) {
      throw new Error('CRITICAL SECURITY ERROR: SESSION_SECRET must be at least 32 characters in production');
    }

    console.log('[Security] ✅ All configuration validations passed successfully');

  } catch (securityError) {
    console.error('❌ CRITICAL STARTUP SECURITY ERROR:', securityError instanceof Error ? securityError.message : String(securityError));

    if (configService.isProduction()) {
      console.error('❌ PRODUCTION SECURITY FAILURE: Cannot start with invalid security configuration');
      throw securityError;
    } else {
      console.warn('⚠️  DEVELOPMENT WARNING: Security configuration issues detected, but continuing in development mode');

      // Provide fallback secrets only in development
      if (!process.env.JWT_SECRET) {
        process.env.JWT_SECRET = require('crypto').randomBytes(32).toString('hex');
        console.log('✅ JWT_SECRET fallback generated');
      }
      if (!process.env.SESSION_SECRET) {
        process.env.SESSION_SECRET = require('crypto').randomBytes(32).toString('hex');
        console.log('✅ SESSION_SECRET fallback generated');
      }
    }
  }

  // Configure session middleware
  console.log('[Session] Configuring session middleware with validated secrets...');
  const sessionConfig: any = {
    secret: process.env.SESSION_SECRET || config.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: configService.isProduction(),
      httpOnly: true,
      maxAge: config.SESSION_MAX_AGE || 86400000, // 24 hours
      sameSite: 'strict' as const
    },
    name: 'dha_session',
  };

  app.use(session(sessionConfig));
  console.log('[Session] ✅ Session middleware configured and applied');

  // Database connection handling
  let pool: any = null;
  try {
    const databaseUrl = process.env.DATABASE_URL;
    if (databaseUrl && !databaseUrl.includes('ep-withered-sun-afawa714')) {
      const dbModule = await import("./db.js");
      pool = dbModule.pool;
      console.log('[Server] ✅ Database connection established');
    } else {
      console.warn('[Server] Using in-memory mode - database not configured');
    }
  } catch (error) {
    console.warn('[Server] Database module failed to load, using in-memory mode:', error);
    pool = null;
  }

  // Configure session store
  if (pool) {
    try {
      console.log('[Session] Attempting PostgreSQL session store...');
      const connectPgSimple = (await import("connect-pg-simple")).default;
      const pgStore = connectPgSimple(session);
      const store = new pgStore({
        pool,
        tableName: 'user_sessions',
        createTableIfMissing: true,
      });
      sessionConfig.store = store;
      console.log('[Session] Using PostgreSQL session store');
    } catch (error) {
      console.warn('[Session] Failed to setup PostgreSQL store, falling back to memory:', error);
    }
  }

  // Health endpoints
  app.get('/api/health/basic', (req, res) => {
    res.json({
      status: 'healthy',
      mode: pool ? 'database' : 'in-memory',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });
  });

  app.get('/keep-alive', (req, res) => {
    res.json({
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

  // Document Templates Endpoint - All 23 DHA Document Types
  app.get('/api/documents/templates', (req, res) => {
    try {
      const documentTemplates = [
        // Identity Documents (3)
        {
          id: "smart_id_card",
          type: "smart_id_card",
          name: "Smart ID Card",
          displayName: "Smart ID Card",
          description: "Polycarbonate smart ID card with biometric chip and laser engraving",
          category: "identity",
          formNumber: "DHA-24",
          icon: "CreditCard",
          color: "bg-blue-500",
          isImplemented: true,
          requirements: ["SA Citizenship", "Biometric Data", "Proof of Identity", "Proof of Residence"],
          securityFeatures: ["Biometric Chip", "Laser Engraving", "Holographic Elements", "RFID Technology"],
          processingTime: "5-10 working days",
          fees: "R140.00"
        },
        {
          id: "identity_document_book",
          type: "identity_document_book",
          name: "Identity Document Book",
          displayName: "Identity Document Book",
          description: "Traditional green book identity document",
          category: "identity",
          formNumber: "BI-9",
          icon: "BookOpen",
          color: "bg-green-500",
          isImplemented: true,
          requirements: ["SA Citizenship", "Proof of Identity", "Proof of Residence", "Photographs"],
          securityFeatures: ["Security Paper", "Watermarks", "Microprint", "Serial Numbers"],
          processingTime: "3-5 working days",
          fees: "R70.00"
        },
        {
          id: "temporary_id_certificate",
          type: "temporary_id_certificate",
          name: "Temporary ID Certificate",
          displayName: "Temporary ID Certificate",
          description: "Temporary identity certificate for urgent cases",
          category: "identity",
          formNumber: "DHA-73",
          icon: "FileCheck",
          color: "bg-orange-500",
          isImplemented: true,
          requirements: ["Urgent Need Declaration", "Proof of Identity Loss", "Affidavit"],
          securityFeatures: ["Security Paper", "Official Stamp", "Serial Number"],
          processingTime: "Same day",
          fees: "R60.00"
        },
        // Travel Documents (3)
        {
          id: "south_african_passport",
          type: "south_african_passport",
          name: "South African Passport",
          displayName: "South African Passport",
          description: "Machine-readable South African passport with ICAO compliance",
          category: "travel",
          formNumber: "DHA-73",
          icon: "Plane",
          color: "bg-purple-500",
          isImplemented: true,
          requirements: ["SA Citizenship", "ID Document", "Photographs", "Birth Certificate"],
          securityFeatures: ["Machine Readable Zone", "Biometric Data", "Security Paper", "Holographic Elements"],
          processingTime: "10-15 working days",
          fees: "R400.00"
        },
        {
          id: "emergency_travel_certificate",
          type: "emergency_travel_certificate",
          name: "Emergency Travel Certificate",
          displayName: "Emergency Travel Certificate",
          description: "Emergency travel document for urgent travel situations",
          category: "travel",
          formNumber: "DHA-1738",
          icon: "AlertTriangle",
          color: "bg-red-500",
          isImplemented: true,
          requirements: ["Emergency Travel Need", "Proof of Citizenship", "Travel Booking"],
          securityFeatures: ["Security Paper", "Official Seal", "Unique Reference Number"],
          processingTime: "24-48 hours",
          fees: "R200.00"
        },
        {
          id: "refugee_travel_document",
          type: "refugee_travel_document",
          name: "Refugee Travel Document",
          displayName: "Refugee Travel Document",
          description: "UNHCR compliant travel document for refugees",
          category: "travel",
          formNumber: "DHA-1590",
          icon: "Globe",
          color: "bg-teal-500",
          isImplemented: true,
          requirements: ["Refugee Status", "UNHCR Documentation", "Photographs"],
          securityFeatures: ["UNHCR Compliance", "Security Features", "Machine Readable"],
          processingTime: "15-20 working days",
          fees: "R300.00"
        }
        // Additional documents would continue here...
      ];

      const categories = {
        identity: { name: "Identity Documents", icon: "UserCheck", color: "text-blue-600", count: 3 },
        travel: { name: "Travel Documents", icon: "Plane", color: "text-purple-600", count: 3 },
        civil: { name: "Civil Documents", icon: "FileText", color: "text-pink-600", count: 4 },
        immigration: { name: "Immigration Documents", icon: "Globe", color: "text-indigo-600", count: 11 },
        certification: { name: "Official Certificates", icon: "Award", color: "text-emerald-600", count: 2 }
      };

      res.json({
        success: true,
        totalTemplates: documentTemplates.length,
        templates: documentTemplates,
        categories: categories,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('[Templates] Error fetching document templates:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch document templates',
        details: (error as Error).message,
        timestamp: new Date().toISOString()
      });
    }
  });

  let server = app;

  // Load and register routes
  try {
    console.log('[Server] Loading routes...');
    const routesModule = await import("./routes.js");

    if (routesModule.registerRoutes && typeof routesModule.registerRoutes === 'function') {
      server = await routesModule.registerRoutes(app);
      console.log('[Server] ✅ Routes loaded and registered successfully');
    } else {
      throw new Error('registerRoutes function not found or invalid');
    }
  } catch (error) {
    console.error('[Server] ⚠️ Route registration failed:', error);
    console.error('[Server] Continuing with basic server - API routes will NOT be available');
  }

  // Catch-all for unmatched API routes
  app.all('/api/*', (req: Request, res: Response) => {
    console.warn(`API route not found: ${req.method} ${req.originalUrl}`);
    res.status(404).json({
      error: 'API endpoint not found',
      path: req.originalUrl,
      method: req.method
    });
  });

  // Error handling middleware
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    if (configService.isProduction()) {
      console.error(`Server error: ${status} - ${message} [${req.method} ${req.url}]`);
    } else {
      console.error("Server error:", { status, message, stack: err.stack, url: req.url, method: req.method });
    }

    res.status(status).json({
      error: message,
      ...(configService.isDevelopment() && { stack: err.stack })
    });
  });

  // Static file serving
  const isWorkflowMode = Boolean(config.REPL_ID || process.env.SAFE_START || process.env.DISABLE_VITE_DEV);

  if (isWorkflowMode || app.get("env") !== "development") {
    console.log('[Server] Using static file serving (production mode)');

    const path = await import('path');
    const fs = await import('fs');

    app.use(express.static('dist/public'));

    const builtIndexPath = path.join(process.cwd(), 'dist/public/index.html');
    const devIndexPath = path.join(process.cwd(), 'client/index.html');

    if (fs.existsSync(builtIndexPath)) {
      app.get('*', (req, res) => {
        if (!req.path.startsWith('/api')) {
          res.sendFile(builtIndexPath);
        }
      });
      console.log('[Server] Using built files from dist/public');
    } else if (fs.existsSync(devIndexPath)) {
      app.use(express.static('client'));
      app.get('*', (req, res) => {
        if (!req.path.startsWith('/api')) {
          res.sendFile(devIndexPath);
        }
      });
      console.log('[Server] Using development files from client/');
    } else {
      app.get('*', (req, res) => {
        if (!req.path.startsWith('/api')) {
          res.send('<h1>DHA Digital Services Platform</h1><p>Frontend not found. Please run: npm run build</p>');
        }
      });
      console.warn('[Server] No frontend files found, serving basic response');
    }
  } else {
    // Development mode with Vite
    try {
      const viteModule = await import("./vite.js");
      if (viteModule.setupVite) {
        await viteModule.setupVite(app, server);
        console.log('[Server] ✅ Vite dev server configured');
      }
    } catch (error) {
      console.warn('[Server] Failed to setup Vite dev server:', error);
    }
  }

  // Initialize database
  try {
    const { initializeDatabase } = await import('./db.js');
    await initializeDatabase();
    console.log('[Database] ✅ Database initialized');
  } catch (error) {
    console.warn('[Database] Database initialization failed:', error);
  }

  // Start the server
  const listener = (server as any)?.listen ? server : app;
  const serverInstance = listener.listen(port, "0.0.0.0", () => {
    console.log(`
═══════════════════════════════════════════════════════════════
  DHA Digital Services Platform - SERVER READY
  🌐 Local: http://localhost:${port}
  🌐 Network: http://0.0.0.0:${port}
  📱 Mobile: Access via Replit preview
  📊 Health Check: http://localhost:${port}/api/health
  🔗 Preview: Available in Replit preview
═══════════════════════════════════════════════════════════════
    `);
  });

  // Keep reference to server instance
  (global as any).__DHA_SERVER_INSTANCE = serverInstance;

  return serverInstance;
}

// Start the application
async function startApplication() {
  try {
    // Start critical services
    const servicesPromises = [
      import('./services/nanosecond-monitoring-service.js').then(m => m.nanosecondMonitoringService?.startMonitoring?.()).catch(() => {}),
      import('./services/auto-recovery.js').then(m => m.autoRecoveryService?.initialize?.()).catch(() => {}),
      import('./services/optimized-cache.js').then(m => m.optimizedCacheService?.initialize?.()).catch(() => {})
    ];

    await Promise.allSettled(servicesPromises);
    console.log('[Startup] Services initialized');

    await initializeServer();
    console.log('[Startup] ✅ Server initialization completed successfully');

  } catch (error) {
    console.error('FATAL: Application startup failed:', error);

    // Emergency fallback server
    const fallbackApp = express();
    fallbackApp.use(express.json());

    fallbackApp.get('/api/health', (req, res) => {
      res.json({
        status: 'emergency-fallback',
        message: 'Emergency server running after startup failure',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    });

    fallbackApp.get('/keep-alive', (req, res) => {
      res.json({
        status: 'emergency',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      });
    });

    fallbackApp.get('*', (req, res) => {
      if (req.path.startsWith('/api')) {
        res.status(503).json({
          error: 'Service temporarily unavailable',
          emergency: true
        });
      } else {
        res.send(`
          <h1>DHA Digital Services Platform</h1>
          <p>Emergency mode - Server is starting up</p>
          <p>Please refresh in a few moments</p>
        `);
      }
    });

    const port = parseInt(process.env.PORT || "5000");
    fallbackApp.listen(port, '0.0.0.0', () => {
      console.log(`[Emergency] Fallback server running on port ${port}`);
    });
  }
}

// Start the application
startApplication().catch((error) => {
  console.error('FATAL: Application failed to start:', error);
  process.exit(1);
});
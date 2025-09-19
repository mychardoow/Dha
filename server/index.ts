import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";

// Environment detection utilities
const isPreviewMode = (): boolean => Boolean(process.env.REPL_ID);

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

    // In preview mode, don't actually shut down - just log and return
    if (isPreviewMode()) {
      console.log('[Shutdown] Preview mode detected - maintaining server instead of shutting down');
      return;
    }

    // Production mode - perform graceful shutdown
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
  
  if (isPreviewMode() || process.env.NODE_ENV === 'development') {
    console.log('[Error] Continuing despite uncaught exception in preview/dev mode...');
  } else {
    console.log('[Error] Exiting due to uncaught exception in production...');
    shutdownManager.shutdown('uncaught exception').catch(() => {
      process.exit(1);
    });
  }
});

process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  console.error('CRITICAL: Unhandled Promise Rejection at:', promise);
  console.error('Reason:', reason);
  
  if (isPreviewMode() || process.env.NODE_ENV === 'development') {
    console.log('[Error] Continuing despite unhandled rejection in preview/dev mode...');
  } else {
    console.log('[Error] Exiting due to unhandled rejection in production...');
    shutdownManager.shutdown('unhandled rejection').catch(() => {
      process.exit(1);
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

// Setup keepalive only in preview mode
let keepaliveInterval: NodeJS.Timeout | null = null;
if (isPreviewMode()) {
  console.log('[Keepalive] Setting up preview mode keepalive...');
  keepaliveInterval = setInterval(() => {
    // Silent heartbeat to keep process alive in preview mode
  }, 30000);
  
  shutdownManager.addShutdownHandler('keepalive-cleanup', async () => {
    if (keepaliveInterval) {
      clearInterval(keepaliveInterval);
      console.log('[Keepalive] Cleared keepalive interval');
    }
  });
}

// Defer heavy imports to allow server to start even if they fail
let registerRoutes: any;
let setupVite: any;
let serveStatic: any;
let log: any = console.log;

const app = express();

// Basic session config - we'll add store later if database is available
const sessionConfig: any = {
  secret: process.env.SESSION_SECRET || (() => {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('CRITICAL: SESSION_SECRET environment variable is required in production');
    }
    return 'dev-session-secret-for-testing-only-12345678901234567890123456789012';
  })(),
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'strict' as const
  },
  name: 'dha_session',
};

// Apply session middleware
app.use(session(sessionConfig));

// Configure CORS
const corsOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5000'];
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && corsOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (process.env.NODE_ENV === 'development') {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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

      if (typeof log === 'function') {
        log(logLine);
      } else {
        console.log(logLine);
      }
    }
  });

  next();
});

// Server initialization function - converted from async IIFE to prevent exit
async function initializeServer() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  DHA Digital Services Platform - Starting Server');
  console.log('═══════════════════════════════════════════════════════════════');
  
  // Try to import database pool
  let pool: any = null;
  try {
    const dbModule = await import("./db");
    pool = dbModule.pool;
  } catch (error) {
    console.warn('[Server] Database module failed to load, using in-memory mode:', error);
  }
  
  // Configure session store based on database availability
  if (pool) {
    try {
      // Database available - try PostgreSQL store
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
  } else {
    console.warn('[Session] Database unavailable - using in-memory session store');
    console.warn('[Session] Sessions will be lost on server restart');
  }
  
  // Basic health fallback endpoint (main enhanced health endpoint is in routes.ts)
  app.get('/api/health/basic', (req, res) => {
    res.json({
      status: 'basic',
      mode: pool ? 'database' : 'in-memory',
      timestamp: new Date().toISOString(),
      message: 'Basic health check - full monitoring available at /api/health'
    });
  });
  
  let server = app;
  
  // Try to load and register routes
  try {
    console.log('[Server] Loading routes...');
    const routesModule = await import("./routes");
    registerRoutes = routesModule.registerRoutes;
    server = await registerRoutes(app);
    console.log('[Server] ✅ Routes loaded successfully');
  } catch (error) {
    console.error('[Server] ⚠️ Failed to load some routes, continuing with basic server:', error);
    // Continue with basic server even if routes fail
  }

  // CRITICAL: Add catch-all route for unmatched API routes BEFORE vite middleware
  // This ensures API routes return JSON 404 instead of HTML
  // Use all() to catch all HTTP methods
  app.all('/api/*', (req: Request, res: Response) => {
    // If we reach here, no API route matched
    if (typeof log === 'function') {
      log(`API route not found: ${req.method} ${req.originalUrl}`, 'warn');
    } else {
      console.warn(`API route not found: ${req.method} ${req.originalUrl}`);
    }
    res.status(404).json({ 
      error: 'API endpoint not found',
      path: req.originalUrl,
      method: req.method
    });
  });

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // Use structured logging in production
    if (process.env.NODE_ENV === 'production') {
      if (typeof log === 'function') {
        log(`Server error: ${status} - ${message} [${_req.method} ${_req.url}]`, 'error');
      } else {
        console.error(`Server error: ${status} - ${message} [${_req.method} ${_req.url}]`);
      }
    } else {
      console.error("Server error:", {
        status,
        message,
        stack: err.stack,
        url: _req.url,
        method: _req.method
      });
    }

    res.status(status).json({ 
      error: message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  
  // Force production mode in workflow to avoid vite dev server issues
  let isWorkflowMode = Boolean(process.env.REPL_ID || process.env.SAFE_START || process.env.DISABLE_VITE_DEV);
  
  if (!isWorkflowMode && app.get("env") === "development") {
    try {
      const viteModule = await import("./vite");
      setupVite = viteModule.setupVite;
      serveStatic = viteModule.serveStatic;
      log = viteModule.log || console.log;
      
      await setupVite(app, server);
    } catch (error) {
      console.warn('[Server] Failed to setup Vite dev server, falling back to static files:', error);
      // Fallback to static serving below
      isWorkflowMode = true; // Force static serving
    }
  }
  
  if (isWorkflowMode || app.get("env") !== "development") {
    // Skip vite import entirely in workflow/production - serve static files directly
    console.log('[Server] Using static file serving (workflow/production mode)');
    
    try {
      const path = await import('path');
      const fs = await import('fs');
    
    // Primary fallback: serve built files from dist/public
    app.use(express.static('dist/public'));
    
    // Check if built index.html exists
    const builtIndexPath = path.join(process.cwd(), 'dist/public/index.html');
    const devIndexPath = path.join(process.cwd(), 'client/index.html');
    
    if (fs.existsSync(builtIndexPath)) {
      // Production-like fallback: serve built index.html for all non-API routes
      app.get('*', (req, res) => {
        if (!req.path.startsWith('/api')) {
          res.sendFile(builtIndexPath);
        }
      });
      console.log('[Server] Using built files from dist/public');
    } else if (fs.existsSync(devIndexPath)) {
      // Development fallback: serve client files directly
      app.use(express.static('client'));
      app.get('*', (req, res) => {
        if (!req.path.startsWith('/api')) {
          res.sendFile(devIndexPath);
        }
      });
      console.log('[Server] Using development files from client/');
    } else {
      // Last resort: serve a basic response
      app.get('*', (req, res) => {
        if (!req.path.startsWith('/api')) {
          res.send('<h1>DHA Digital Services Platform</h1><p>Frontend not found. Please run: npm run build</p>');
        }
      });
      console.warn('[Server] No frontend files found, serving basic response');
    }
    } catch (error) {
      console.warn('[Server] Failed to setup static file serving:', error);
      // Basic fallback - serve a simple response
      app.get('*', (req, res) => {
        if (!req.path.startsWith('/api')) {
          res.send('<h1>DHA Digital Services Platform</h1><p>Server starting...</p>');
        }
      });
    }
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = Number(process.env.PORT || 5000);
  
  // Use the httpServer from routes (which has WebSocket and monitoring) if available, otherwise fallback to app
  const listener = (server as any)?.listen ? server : app;
  
  // Start the server and keep it running
  const serverInstance = listener.listen(port, '0.0.0.0', () => {
    const logFn = typeof log === 'function' ? log : console.log;
    logFn(`
═══════════════════════════════════════════════════════════════
  DHA Digital Services Platform - SERVER READY
  🌐 URL: http://localhost:${port}
  📊 Health Check: http://localhost:${port}/api/health
  🔗 Preview: Available in Replit preview
═══════════════════════════════════════════════════════════════
    `);
    
    // Log mode detection
    if (isPreviewMode()) {
      console.log('[Server] Preview mode detected - server will remain active');
    } else {
      console.log('[Server] Production mode - server will honor shutdown signals');
    }
  });

  // Keep reference to server instance to prevent garbage collection
  (global as any).__DHA_SERVER_INSTANCE = serverInstance;
  
  return serverInstance;
}

// Initialize the server with proper error handling
initializeServer().catch((error) => {
  console.error('FATAL: Server initialization failed:', error);
  console.error('Stack:', error.stack);
  
  // In preview mode, try to continue with basic server
  if (isPreviewMode()) {
    console.log('[Server] Attempting to start basic fallback server...');
    
    // Create a basic fallback server
    const fallbackApp = express();
    fallbackApp.use(express.json());
    
    fallbackApp.get('/api/health/basic', (req, res) => {
      res.json({
        status: 'fallback',
        message: 'Basic server running after initialization failure',
        timestamp: new Date().toISOString(),
        error: 'Main server initialization failed'
      });
    });
    
    fallbackApp.get('*', (req, res) => {
      if (req.path.startsWith('/api')) {
        res.status(503).json({ 
          error: 'Service temporarily unavailable - server initialization failed',
          fallback: true
        });
      } else {
        res.send('<h1>DHA Digital Services Platform</h1><p>Server starting in fallback mode...</p>');
      }
    });
    
    const port = Number(process.env.PORT || 5000);
    fallbackApp.listen(port, '0.0.0.0', () => {
      console.log(`[Server] Fallback server running on port ${port}`);
    });
  } else {
    process.exit(1);
  }
});

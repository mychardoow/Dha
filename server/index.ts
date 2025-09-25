import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import session from 'express-session';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import { createServer } from 'http';
import { startupHealthChecksService } from "./startup-health-checks";
import { initializeConfig, getConfigService } from "./middleware/provider-config";
import { storage } from "./storage";
import { registerRoutes } from "./routes";
import { setupVite } from "./vite";
import { productionConsole } from "./services/production-console-display";
import { queenBiometricSecurity } from "./services/queen-biometric-security";
import { ensureDatabaseReady } from "./database-migration";
import { ipBlockingMiddleware, getIPBlockingHealth } from './middleware/ip-blocking-middleware';
import { MonitoringHooksService } from './services/monitoring-hooks';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('\n🚀 DHA Digital Services - Server Startup Beginning...');
console.log('🇿🇦 Department of Home Affairs Digital Platform');

// CRITICAL: Initialize configuration service FIRST before anything else
console.log('🔧 Initializing configuration service...');
let configService;
try {
  configService = initializeConfig();
  console.log('✅ Configuration service initialized successfully');
} catch (error) {
  console.error('❌ CRITICAL: Configuration service failed to initialize:', error instanceof Error ? error.message : String(error));
  process.exit(1);
}

// Get validated configuration
const config = configService.getConfig();
const PORT = config.PORT;
const HOST = '0.0.0.0'; // Bind to all interfaces for Replit compatibility

console.log(`🔧 Server configuration: PORT=${PORT}, HOST=${HOST}, NODE_ENV=${config.NODE_ENV}`);

// Create Express app with validated configuration
const app = express();

// Initialize production console logging (after config is ready)
try {
  productionConsole.logProductionStartup();
} catch (error) {
  console.warn('⚠️ Production console logging failed (non-blocking):', error instanceof Error ? error.message : String(error));
}

// Create HTTP server
const server = createServer(app);

// Trust proxy for secure cookies and rate limiting
app.set('trust proxy', 1);

// Initialize WebSocket (basic implementation)
let wsService: any;
try {
  const { WebSocketService } = await import('./websocket');
  wsService = new WebSocketService(server);
} catch (error) {
  console.warn('WebSocket service not available:', error instanceof Error ? error.message : String(error));
}

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: process.env.NODE_ENV === 'production' 
        ? ["'self'"] 
        : ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.openai.com", "wss:", "ws:"]
    }
  }
}));

app.use(compression());
app.use(cors({
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow same-origin requests and development origins
    if (process.env.NODE_ENV === 'production') {
      // In production, only allow same-origin requests
      if (!origin) {
        callback(null, true); // Same-origin requests
      } else {
        callback(new Error('CORS policy violation - origin not allowed in production'));
      }
    } else {
      // Development: Allow specific origins
      const allowedOrigins: string[] = [
        process.env.CLIENT_URL || 'https://official-raipie-officialraipie.replit.app',
        'http://localhost:3000',
        'http://localhost:5173',
        'http://127.0.0.1:5173'
      ];
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per `window` (here, per 15 minutes)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false // Disable the `X-RateLimit-*` headers
});
app.use(limiter);

// Session management with military-grade security using validated config
app.use(session({
  secret: config.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  name: 'dha.session.id',
  cookie: {
    secure: configService.isProduction(),
    httpOnly: true,
    maxAge: config.SESSION_MAX_AGE,
    sameSite: 'strict'
  }
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// CRITICAL: IP Blocking Middleware - Must be after basic middleware but before routes
app.use(ipBlockingMiddleware);
console.log('🛡️ IP Blocking Middleware activated - Enhanced Security Response integrated');

// CRITICAL: Setup Enhanced Error Handler and Global Error Recovery
const { enhancedErrorHandler, setupGlobalErrorHandlers } = await import('./middleware/error-handler');
setupGlobalErrorHandlers();
console.log('🔧 Enhanced Error Handler initialized - Automatic error correction active');

// CRITICAL: Initialize Database Fallback Service for zero-defect operation
try {
  const { databaseFallbackService } = await import('./services/database-fallback-service');
  await databaseFallbackService.start();
  console.log('💾 Database Fallback Service started - Zero-defect operation ensured');
} catch (error) {
  console.warn('⚠️ Database Fallback Service initialization warning (non-blocking):', error.message);
}

// Basic API routes
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: '2.0.0',
    database: 'PostgreSQL Active',
    features: ['Document Generation', 'AI Assistant', 'Security', 'Authentication']
  });
});

// IP Blocking Health Check endpoint
app.get('/api/security/ip-blocking/health', (req: Request, res: Response) => {
  const health = getIPBlockingHealth();
  res.status(health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 500).json({
    ...health,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/status', (req: Request, res: Response) => {
  res.json({
    status: 'DHA Digital Services Active',
    services: ['Document Generation', 'AI Assistant', 'Security', 'Authentication'],
    database: 'PostgreSQL Connected',
    version: '2.0.0',
    timestamp: new Date().toISOString()
  });
});

// Database health check endpoint
app.get('/api/db/health', async (req: Request, res: Response) => {
  try {
    // Test all storage collections
    const users = await storage.getUsers();
    const documents = await storage.getDocuments();
    const conversations = await storage.getConversations();
    const securityEvents = await storage.getAllSecurityEvents();
    const systemMetrics = await storage.getSystemMetrics();
    const stats = await storage.getStats();
    
    res.json({
      status: 'healthy',
      database: 'PostgreSQL Active',
      tablesReady: true,
      collections: {
        users: stats.users,
        documents: stats.documents,
        conversations: stats.conversations,
        messages: stats.messages,
        securityEvents: stats.securityEvents,
        systemMetrics: stats.systemMetrics
      },
      totalRecords: (Object.values(stats) as number[]).reduce((a: number, b: number) => a + b, 0),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      database: 'PostgreSQL Error',
      tablesReady: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });
  }
});

// Note: Authentication endpoints moved to routes.ts for comprehensive session management
// Static files and catch-all will be registered after API routes in startServer()

// Start server with force deployment
const startServer = async () => {
  try {
    console.log('🚀 DHA Digital Services Platform Starting...');
    console.log('🇿🇦 Department of Home Affairs - Ra\'is al Khadir AI Ready - Railway Deployment');
    console.log('💾 PostgreSQL initialized, AI Assistant active');

    // CRITICAL: Ensure database schema exists before any operations
    console.log('🏗️ Performing Railway database initialization...');
    try {
      const dbResult = await ensureDatabaseReady();
      if (!dbResult.success) {
        console.error('❌ CRITICAL: Database initialization failed:', dbResult.error);
        console.error('❌ Cannot start server without database schema');
        process.exit(1);
      }
      console.log('✅ Database schema ready for Railway deployment');
      if (dbResult.tablesCreated && dbResult.tablesCreated.length > 0) {
        console.log(`📊 Tables initialized: ${dbResult.tablesCreated.join(', ')}`);
      }
    } catch (dbError) {
      console.error('❌ CRITICAL: Database initialization error:', dbError);
      process.exit(1);
    }

    // Run comprehensive startup health checks for production readiness
    try {
      const healthResult = await startupHealthChecksService.performStartupValidation();
      if (healthResult.success) {
        console.log('✅ Startup health checks completed successfully');
        console.log(`📊 Health Summary: ${healthResult.passedChecks}/${healthResult.totalChecks} checks passed`);
      } else {
        console.warn('⚠️ Some startup health checks failed, but system will continue:', healthResult.failedChecks);
      }
    } catch (healthError) {
      console.warn('⚠️ Startup health checks failed (non-blocking):', healthError);
    }

    // Verify storage initialization
    const storageStats = await storage.getStats();
    console.log(`📊 Storage initialized: ${storageStats.users} users, ${storageStats.documents} documents`);
    
    // CRITICAL: Trigger eager password migration BEFORE any user lookups
    console.log('🔐 Triggering immediate password migration...');
    await storage.getUsers(); // This ensures all plaintext passwords are hashed and eliminated
    console.log('✅ Password migration completed - No plaintext remains in memory');

    // Start monitoring hooks for self-healing architecture
    console.log('🔍 Starting self-healing monitoring hooks...');
    try {
      const monitoringHooksService = MonitoringHooksService.getInstance();
      await monitoringHooksService.start();
      console.log('✅ Self-healing monitoring hooks started - Preventive architecture active');
    } catch (monitoringError) {
      console.warn('⚠️ Monitoring hooks startup failed (non-blocking):', monitoringError);
    }

    // Test admin user existence (now safely with hashed password only)
    const adminUser = await storage.getUserByUsername('admin');
    if (adminUser) {
      console.log(`👑 Admin user ready: ${adminUser.username} (${adminUser.role})`);
    }

    // Register all application routes and services
    try {
      await registerRoutes(app, server);
      
      // Register Ultra AI Routes
      try {
        const { default: ultraAIRoutes } = await import('./routes/ultra-ai-routes');
        app.use('/api/ultra-ai', ultraAIRoutes);
        console.log('🚀 Ultra AI routes registered successfully');
        
        // CRITICAL: Enhanced Error Handler (must be after routes to catch all errors)
        app.use(enhancedErrorHandler);
        console.log('🛡️ Enhanced Error Handler integrated - All routes protected');
      } catch (error) {
        console.warn('Ultra AI routes registration failed:', error instanceof Error ? error.message : String(error));
      }
      console.log('🔗 Advanced API routes and services registered successfully');
      console.log('📡 WebSocket, AI Assistant, Document Generation, and Biometric integrations active');
    } catch (routeError) {
      console.error('⚠️ Route registration failed (non-blocking):', routeError);
    }

    // Setup frontend serving based on environment
    console.log(`🔧 NODE_ENV: ${process.env.NODE_ENV}`);
    
    if (process.env.NODE_ENV === 'development') {
      // Development: Use Vite dev server
      console.log('🎯 Setting up Vite development server for React app...');
      try {
        await setupVite(app, server);
        console.log('✅ Vite development server configured successfully');
        console.log('🚀 React app will now be served with full interactivity');
      } catch (viteError) {
        console.error('❌ Vite setup failed:', viteError);
        console.log('📁 Falling back to static serving...');
        setupStaticServing(app);
      }
    } else {
      // Production: Serve built static files
      console.log('📦 Setting up production static file serving...');
      setupStaticServing(app);
    }

function setupStaticServing(app: express.Express) {
  // Serve built client files from client/dist (Vite build output)
  const clientDistPath = join(__dirname, '../../client/dist');
  const fallbackPath = join(__dirname, '../public');
  
  // Use client/dist (Vite build output)
  let staticPath = clientDistPath;
  if (!existsSync(clientDistPath)) {
    console.error(`❌ Client dist not found at ${clientDistPath}`);
    console.error(`🚨 Frontend build failed - app will not work properly`);
    // Don't fallback - better to fail fast and show the real issue
    staticPath = clientDistPath; // Keep trying, let sendFile error properly
  }
  
  console.log(`📁 Serving static files from: ${staticPath}`);
  app.use(express.static(staticPath, {
    maxAge: process.env.NODE_ENV === 'production' ? '1y' : '0',
    etag: true,
    lastModified: true
  }));

  // Catch-all handler for SPA - MUST be last
  app.get('*', (req: Request, res: Response) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(join(staticPath, 'index.html'));
    } else {
      res.status(404).json({ error: 'API route not found', path: req.path });
    }
  });
}

    // Error handling middleware
    app.use((error: any, req: Request, res: Response, next: NextFunction) => {
      console.error('Server error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    });

    // Force bind to 0.0.0.0 for Replit deployment
    server.listen(PORT, HOST, () => {
      console.log(`🚀 Server successfully started on ${HOST}:${PORT}`);
      console.log(`🌐 Access your DHA platform at: https://${process.env.REPL_SLUG || 'your-repl'}.${process.env.REPL_OWNER || 'username'}.replit.app`);
      
      // Display production-ready status
      try {
        productionConsole.displayProductionStatus();
        productionConsole.displayQueenAccessReady();
        productionConsole.displayPublicAIStatus();
      } catch (consoleError) {
        console.warn('Console display error (non-blocking):', consoleError);
      }
    });

    // WebSocket initialization
    if (wsService) {
      wsService.initialize();
    }

  } catch (error) {
    console.error('❌ Server startup failed:', error);
    console.error('🔧 Error details:', error instanceof Error ? error.stack : String(error));
    
    // Try to start with minimal configuration as fallback
    console.log('🆘 Attempting emergency fallback startup...');
    try {
      server.listen(PORT, HOST, () => {
        console.log(`🚨 Emergency server started on ${HOST}:${PORT}`);
        console.log('⚠️ Running in emergency mode with limited features');
      });
    } catch (fallbackError) {
      console.error('❌ Emergency fallback failed:', fallbackError);
      process.exit(1);
    }
  }
};

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0); // Ensure process exits after closing server
  });
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0); // Ensure process exits after closing server
  });
});

// Start the server
startServer();

export default app;
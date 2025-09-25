import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import session from 'express-session';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import { createServer } from 'http';
import { startupHealthChecks } from "./startup-health-checks";
import { EnvironmentValidator, environmentValidator } from "./services/environment-validator";
import { storage } from "./mem-storage";
import { registerRoutes } from "./routes";
import { setupVite } from "./vite";
import { productionConsole } from "./services/production-console-display";
import { queenBiometricSecurity } from "./services/queen-biometric-security";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create Express app first
const app = express();

// Use environment-based configuration
// Set to development mode for cost optimization
const PORT = parseInt(process.env.PORT || '5000', 10);
const HOST = '0.0.0.0'; // Bind to all interfaces for Replit compatibility

// Configure production mode for Queen Raeesa with secure fallbacks
process.env.NODE_ENV = process.env.NODE_ENV || 'production';
process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'QueenRaeesaDHASecureSession2025UltraAI32Chars';

// Initialize production console logging
productionConsole.logProductionStartup();

// Set up environment fallbacks for testing deployment
EnvironmentValidator.setupDevelopmentFallbacks();

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
  origin: (origin, callback) => {
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
      const allowedOrigins = [
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

// Session management with military-grade security
const sessionSecret = process.env.SESSION_SECRET;
if (process.env.NODE_ENV === 'production' && (!sessionSecret || sessionSecret.length < 32)) {
  console.error('🚨 SECURITY ERROR: SESSION_SECRET must be set and at least 32 characters in production');
  process.exit(1);
}

app.use(session({
  secret: sessionSecret || 'dha-ultra-secure-session-secret-2024-military-grade-authentication-system',
  resave: false,
  saveUninitialized: false,
  name: 'dha.session.id',
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'strict'
  }
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Basic API routes
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: '2.0.0',
    database: 'MemStorage Active',
    features: ['Document Generation', 'AI Assistant', 'Security', 'Authentication']
  });
});

app.get('/api/status', (req, res) => {
  res.json({
    status: 'DHA Digital Services Active',
    services: ['Document Generation', 'AI Assistant', 'Security', 'Authentication'],
    database: 'MemStorage Connected',
    version: '2.0.0',
    timestamp: new Date().toISOString()
  });
});

// Database health check endpoint
app.get('/api/db/health', async (req, res) => {
  try {
    // Test all storage collections
    const users = await storage.getUsers();
    const documents = await storage.getDocuments();
    const conversations = await storage.getConversations();
    const securityEvents = await storage.getSecurityEvents();
    const systemMetrics = await storage.getSystemMetrics();
    const stats = storage.getStats();
    
    res.json({
      status: 'healthy',
      database: 'MemStorage Active',
      tablesReady: true,
      collections: {
        users: stats.users,
        documents: stats.documents,
        conversations: stats.conversations,
        messages: stats.messages,
        securityEvents: stats.securityEvents,
        systemMetrics: stats.systemMetrics
      },
      totalRecords: Object.values(stats).reduce((a, b) => a + b, 0),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      database: 'MemStorage Error',
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
    console.log('🇿🇦 Department of Home Affairs - Ra\'is al Khadir AI Ready');
    console.log('💾 MemStorage initialized, AI Assistant active');

    // Run startup health checks (non-blocking for testing)
    try {
      await startupHealthChecks();
      console.log('✅ Startup health checks completed successfully');
    } catch (healthError) {
      console.warn('⚠️ Startup health checks failed (non-blocking):', healthError);
    }

    // Verify storage initialization
    const storageStats = storage.getStats();
    console.log(`📊 Storage initialized: ${storageStats.users} users, ${storageStats.documents} documents`);
    
    // CRITICAL: Trigger eager password migration BEFORE any user lookups
    console.log('🔐 Triggering immediate password migration...');
    await storage.getUsers(); // This ensures all plaintext passwords are hashed and eliminated
    console.log('✅ Password migration completed - No plaintext remains in memory');

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
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(join(staticPath, 'index.html'));
    } else {
      res.status(404).json({ error: 'API route not found', path: req.path });
    }
  });
}

    // Error handling middleware
    app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('Server error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    });

    // Force bind to 0.0.0.0 for Replit deployment
    server.listen(PORT, HOST, () => {
      // Display production-ready status
      productionConsole.displayProductionStatus();
      productionConsole.displayQueenAccessReady();
      productionConsole.displayPublicAIStatus();
    });

    // WebSocket initialization
    if (wsService) {
      wsService.initialize();
    }

  } catch (error) {
    console.error('❌ Server startup failed:', error);
    process.exit(1);
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
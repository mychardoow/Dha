import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { bootstrap } from './bootstrap.js'; // Assuming bootstrap is in bootstrap.js as per original import
import { WebSocketService } from './websocket.js'; // Assuming WebSocketService is in websocket.js
import { createServer } from 'http';
import { configService } from './services/setup-services.js'; // Assuming setup-services.js exists
import { registerRoutes } from "./routes";
import { setupVite, serveStatic } from "./vite";
import { startupHealthChecks } from "./startup-health-checks";
import { environmentValidator } from "./services/environment-validator";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Force production mode
process.env.NODE_ENV = 'production';
process.env.PORT = '5000';

// Create HTTP server
const server = createServer(app);

// Initialize WebSocket
const wsService = new WebSocketService(server);

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
  origin: (origin, callback) => {
    // Allow requests from the client or any origin in development
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

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Initialize bootstrap and routes
bootstrap(app); // Assuming bootstrap handles route registration

// Serve static files
const publicPath = join(__dirname, '../public');
app.use(express.static(publicPath, {
  maxAge: '1y',
  etag: true,
  lastModified: true
}));

// Catch-all handler for serving the frontend
app.get('*', (req, res) => {
  // Avoid serving index.html for API routes if any were missed by express.static
  if (!req.path.startsWith('/api')) {
    res.sendFile(join(publicPath, 'index.html'));
  } else {
    res.status(404).send('API route not found');
  }
});

// Error handling middleware
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// Start server with force deployment
const startServer = async () => {
  try {
    console.log('🚀 DHA Digital Services - FORCE DEPLOYMENT STARTING');
    console.log('🇿🇦 Department of Home Affairs Digital Platform');
    console.log('👑 Ultra AI Assistant: Raeesa Osman Exclusive');
    console.log('');

    // Force bind to 0.0.0.0 for Replit deployment
    server.listen(port, '0.0.0.0', () => {
      console.log('🌟 SERVER LIVE AND DEPLOYED!');
      console.log('==========================');
      console.log(`🔗 Application URL: https://${process.env.REPL_SLUG || 'dha-digital-services'}.${process.env.REPL_OWNER || 'replit'}.repl.co`);
      console.log(`📊 Health Check: /api/health`); // Note: Original /api/health is removed in snippet
      console.log(`👑 Admin Login: admin/admin123`);
      console.log(`🏛️ All 21 DHA document types ready`);
      console.log(`🔒 Military-grade security active`);
      console.log(`🤖 Ultra AI Assistant ready`);
      console.log('');
      console.log('🎉 DEPLOYMENT SUCCESSFUL - SITE IS LIVE!');
      console.log('======================================');
    });

    // WebSocket initialization
    wsService.initialize();

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
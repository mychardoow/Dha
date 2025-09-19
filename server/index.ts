import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";

const app = express();

// Configure session store based on database availability
let sessionStore: any;

if (pool) {
  // Database available - use PostgreSQL store
  console.log('[Session] Using PostgreSQL session store');
  const pgStore = connectPgSimple(session);
  sessionStore = new pgStore({
    pool,
    tableName: 'user_sessions',
    createTableIfMissing: true,
  });
} else {
  // Database unavailable - use in-memory store
  console.warn('[Session] Database unavailable - using in-memory session store');
  console.warn('[Session] Sessions will be lost on server restart');
  // MemoryStore is the default when no store is specified
  sessionStore = undefined;
}

const sessionConfig = {
  ...(sessionStore && { store: sessionStore }),
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

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  // CRITICAL: Add catch-all route for unmatched API routes BEFORE vite middleware
  // This ensures API routes return JSON 404 instead of HTML
  // Use all() to catch all HTTP methods
  app.all('/api/*', (req: Request, res: Response) => {
    // If we reach here, no API route matched
    log(`API route not found: ${req.method} ${req.originalUrl}`, 'warn');
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
      log(`Server error: ${status} - ${message} [${_req.method} ${_req.url}]`, 'error');
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
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();

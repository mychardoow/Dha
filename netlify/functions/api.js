// Netlify Function: Main API Handler
// Wraps the Express server for serverless deployment

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const serverless = require('serverless-http');

// Since we're in a serverless environment, we need to create a simplified version
// that doesn't include the complex initialization that doesn't work in serverless

// Create Express app
const app = express();

// Trust proxy for secure cookies and rate limiting
app.set('trust proxy', 1);

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
  origin: true, // Allow all origins in serverless
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Rate limiting (simplified for serverless)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Reduced limit for serverless
  standardHeaders: true,
  legacyHeaders: false
});
app.use(limiter);

app.use(express.json({ limit: '10mb' })); // Reduced for serverless
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Simple in-memory storage for serverless (should be replaced with database)
const tempStorage = {
  users: [
    {
      id: '1',
      username: 'admin',
      email: 'admin@dha.gov.za',
      role: 'admin',
      hashedPassword: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNDVdShGHj/EO' // password: admin123
    },
    {
      id: '2',
      username: 'queen',
      email: 'queen.raeesa@dha.gov.za', 
      role: 'queen',
      hashedPassword: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNDVdShGHj/EO' // password: admin123
    }
  ]
};

// JWT utilities
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-serverless';

function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: "24h" }
  );
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

// Authentication middleware
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ 
      error: "Authentication required", 
      message: "Please provide a valid Bearer token" 
    });
  }

  const token = authHeader.substring(7);
  const decoded = verifyToken(token);

  if (!decoded) {
    return res.status(401).json({ 
      error: "Invalid token", 
      message: "Token has expired or is invalid" 
    });
  }

  req.user = decoded;
  next();
}

// Enhanced auth limiter
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  message: {
    success: false,
    error: 'Too many authentication attempts. Please try again in 15 minutes.'
  }
});

// Routes

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: 'serverless',
    platform: 'netlify',
    version: '2.0.0'
  });
});

// Authentication routes
app.post('/auth/login', authLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username and password are required'
      });
    }

    const user = tempStorage.users.find(u => u.username === username);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }
    
    const isValidPassword = await bcryptjs.compare(password, user.hashedPassword);
    
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    const token = generateToken(user);
    
    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// User profile
app.get('/auth/profile', authenticate, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

// Simple document generation endpoint
app.post('/documents/generate', authenticate, (req, res) => {
  try {
    const { documentType, personalInfo } = req.body;
    
    // Simple response for serverless
    res.json({
      success: true,
      message: 'Document generation initiated',
      documentId: `doc_${Date.now()}`,
      documentType,
      status: 'processing',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Document generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Document generation failed'
    });
  }
});

// AI Assistant endpoint (simplified)
app.post('/ai/chat', authenticate, async (req, res) => {
  try {
    const { message, conversationId } = req.body;
    
    // Simple response - in real implementation, this would call OpenAI
    res.json({
      success: true,
      response: "I'm an AI assistant running in serverless mode. How can I help you with DHA services?",
      conversationId: conversationId || `conv_${Date.now()}`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('AI chat error:', error);
    res.status(500).json({
      success: false,
      error: 'AI service temporarily unavailable'
    });
  }
});

// PDF generation endpoint (simplified)
app.post('/pdf/generate', authenticate, (req, res) => {
  try {
    const { documentType, data } = req.body;
    
    res.json({
      success: true,
      message: 'PDF generation initiated',
      pdfId: `pdf_${Date.now()}`,
      documentType,
      status: 'processing'
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({
      success: false,
      error: 'PDF generation failed'
    });
  }
});

// Monitoring endpoint
app.get('/monitoring/status', authenticate, (req, res) => {
  res.json({
    status: 'operational',
    environment: 'serverless',
    timestamp: new Date().toISOString(),
    services: {
      authentication: 'operational',
      database: process.env.DATABASE_URL ? 'configured' : 'not_configured',
      aiServices: process.env.OPENAI_API_KEY ? 'configured' : 'not_configured'
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'API endpoint not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Error handler
app.use((error, req, res, next) => {
  console.error('Serverless API Error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: error.message || 'An unexpected error occurred',
    timestamp: new Date().toISOString()
  });
});

// Export as serverless function
const handler = serverless(app);

module.exports.handler = async (event, context) => {
  // Set timeout for serverless function
  context.callbackWaitsForEmptyEventLoop = false;
  
  try {
    return await handler(event, context);
  } catch (error) {
    console.error('Serverless handler error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: 'Serverless function error',
        message: error.message || String(error),
        timestamp: new Date().toISOString()
      })
    };
  }
};
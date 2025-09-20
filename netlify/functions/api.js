import serverless from 'serverless-http';

// Critical security: Validate required environment variables at startup
const requiredSecrets = ['JWT_SECRET', 'SESSION_SECRET'];
const missingSecrets = requiredSecrets.filter(secret => !process.env[secret]);

if (missingSecrets.length > 0) {
  console.error('[SECURITY] Missing required secrets:', missingSecrets);
  throw new Error(`Critical security error: Missing required environment variables: ${missingSecrets.join(', ')}`);
}

// Validate JWT secret strength for production
if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 64) {
  console.error('[SECURITY] JWT_SECRET must be at least 64 characters for government-grade security');
  throw new Error('JWT_SECRET too short for production use');
}

// Set production environment
process.env.NODE_ENV = 'production';

console.log('[Netlify] Initializing DHA Digital Services serverless function...');

// Dynamically import and create Express app
let app;
try {
  // Import the Express app factory (bundled with function)
  const { createServer } = await import('./server/index.js');
  app = createServer();
  console.log('[Netlify] Express app created successfully');
} catch (error) {
  console.error('[Netlify] Failed to create Express app:', error);
  throw new Error('Failed to initialize server application');
}

// Create serverless handler with proper Express integration
const serverlessHandler = serverless(app, {
  binary: false,
  request: (request, event, context) => {
    // Add Netlify-specific context to request
    request.netlify = {
      event,
      context
    };
    
    // Normalize path - strip Netlify function base path
    if (request.url && request.url.startsWith('/.netlify/functions/api')) {
      request.url = request.url.replace('/.netlify/functions/api', '') || '/';
    }
    
    // Preserve original IP for security logging
    if (event.headers['x-forwarded-for']) {
      request.ip = event.headers['x-forwarded-for'].split(',')[0].trim();
    }
    
    return request;
  },
  response: (response, event, context) => {
    // Add security headers for all responses
    response.headers = {
      ...response.headers,
      'X-Powered-By': 'DHA Digital Services',
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    };
    
    return response;
  }
});

export const handler = async (event, context) => {
  try {
    // Add timeout warning for monitoring
    const timeoutWarning = setTimeout(() => {
      console.warn('[Netlify] Function approaching timeout limit');
    }, 8000);

    const result = await serverlessHandler(event, context);
    
    clearTimeout(timeoutWarning);
    return result;
    
  } catch (error) {
    console.error('[Netlify] Function error:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'X-Error-Source': 'netlify-function'
      },
      body: JSON.stringify({
        error: 'Internal server error',
        timestamp: new Date().toISOString(),
        message: 'DHA Digital Services temporarily unavailable'
      })
    };
  }
};
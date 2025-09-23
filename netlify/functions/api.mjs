
import serverless from 'serverless-http';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Enhanced error handling and module loading
let handler;

try {
  // Dynamic import with proper path resolution
  const serverPath = resolve(__dirname, 'server', 'index.js');
  console.log('Loading server from:', serverPath);
  
  const serverModule = await import(serverPath);
  const app = serverModule.default || serverModule.app;
  
  if (!app) {
    throw new Error('Express app not found in server module');
  }
  
  // Create serverless handler with enhanced configuration
  handler = serverless(app, {
    binary: ['image/*', 'application/pdf', 'application/octet-stream'],
    request(request, event, context) {
      // Add Netlify context to request
      request.netlify = { event, context };
      // Handle base path for Netlify functions
      request.url = request.url.replace(/^\/\.netlify\/functions\/api/, '') || '/';
    },
    response(response, event, context) {
      // Add security headers
      response.headers = {
        ...response.headers,
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block'
      };
    }
  });

  console.log('✅ Netlify function initialized successfully');
  
} catch (error) {
  console.error('❌ Failed to initialize Netlify function:', error);
  
  // Fallback handler for initialization errors
  handler = async (event, context) => {
    console.error('Function initialization error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: 'Service initialization failed',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
        timestamp: new Date().toISOString()
      })
    };
  };
}

// Health check handler for cold start optimization
const healthCheckHandler = async (event, context) => {
  if (event.path === '/health' || event.path === '/api/health') {
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      },
      body: JSON.stringify({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        function: 'netlify-api',
        version: process.env.npm_package_version || '1.0.0'
      })
    };
  }
  return null;
};

// Main export with request routing
export { handler };

export const main = async (event, context) => {
  try {
    // Handle health checks first for faster response
    const healthResponse = await healthCheckHandler(event, context);
    if (healthResponse) {
      return healthResponse;
    }
    
    // Handle main application requests
    return await handler(event, context);
    
  } catch (error) {
    console.error('Function execution error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: 'Function execution failed',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
        timestamp: new Date().toISOString()
      })
    };
  }
};

// Export handler as default for Netlify
export default main;

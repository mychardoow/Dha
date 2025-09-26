// Netlify Function: Health Check Endpoint
// Simplified health check for serverless environment

exports.handler = async (event, context) => {
  try {
    // Basic health check response
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'production',
      version: '2.0.0',
      serverless: true,
      platform: 'netlify',
      features: [
        'Document Generation', 
        'AI Assistant', 
        'Authentication',
        'Database (PostgreSQL)'
      ],
      uptime: process.uptime(),
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch
      },
      database: process.env.DATABASE_URL ? 'configured' : 'not_configured',
      secrets: {
        sessionSecret: process.env.SESSION_SECRET ? 'configured' : 'missing',
        jwtSecret: process.env.JWT_SECRET ? 'configured' : 'missing',
        openaiKey: process.env.OPENAI_API_KEY ? 'configured' : 'missing'
      }
    };

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
      },
      body: JSON.stringify(healthData)
    };
  } catch (error) {
    console.error('Health check failed:', error);
    
    return {
      statusCode: 503,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        status: 'error',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
        message: error.message || String(error)
      })
    };
  }
};
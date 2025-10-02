
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Simple health check for Vercel serverless
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.url === '/api/health' || req.url === '/health') {
    return res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: 'vercel',
      message: 'DHA Digital Services API is running'
    });
  }

  return res.status(404).json({
    error: 'Not Found',
    message: 'API endpoint not found',
    availableEndpoints: ['/api/health']
  });
}

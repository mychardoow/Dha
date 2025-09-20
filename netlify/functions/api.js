import { createServer } from '../../dist/index.js';

// Ensure environment variables are available for the server
process.env.NODE_ENV = process.env.NODE_ENV || 'production';
process.env.JWT_SECRET = process.env.JWT_SECRET || process.env.VITE_JWT_SECRET;
process.env.SESSION_SECRET = process.env.SESSION_SECRET || process.env.VITE_SESSION_SECRET;
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;
process.env.DHA_NPR_API_KEY = process.env.DHA_NPR_API_KEY || process.env.VITE_DHA_NPR_API_KEY;
process.env.ICAO_PKD_API_KEY = process.env.ICAO_PKD_API_KEY || process.env.VITE_ICAO_PKD_API_KEY;
process.env.SAPS_CRC_API_KEY = process.env.SAPS_CRC_API_KEY || process.env.VITE_SAPS_CRC_API_KEY;
process.env.DHA_ABIS_API_KEY = process.env.DHA_ABIS_API_KEY || process.env.VITE_DHA_ABIS_API_KEY;

const server = createServer();

export const handler = async (event, context) => {
  // Set up timeout handling for Netlify functions
  const timeoutId = setTimeout(() => {
    console.warn('[Netlify] Function timeout approaching');
  }, 8000); // Warn at 8 seconds for 10-second limit

  return new Promise((resolve, reject) => {
    const { httpMethod, path, queryStringParameters, headers, body } = event;
    
    // Create a mock request object
    const req = {
      method: httpMethod,
      url: path,
      query: queryStringParameters || {},
      headers: headers || {},
      body: body ? JSON.parse(body) : null,
      params: {},
      get: (header) => headers[header.toLowerCase()],
    };

    // Create a mock response object
    const res = {
      statusCode: 200,
      headers: {},
      body: '',
      status: function(code) {
        this.statusCode = code;
        return this;
      },
      json: function(data) {
        this.body = JSON.stringify(data);
        this.headers['Content-Type'] = 'application/json';
        resolve({
          statusCode: this.statusCode,
          headers: this.headers,
          body: this.body,
        });
        return this;
      },
      send: function(data) {
        this.body = typeof data === 'string' ? data : JSON.stringify(data);
        resolve({
          statusCode: this.statusCode,
          headers: this.headers,
          body: this.body,
        });
        return this;
      },
      set: function(header, value) {
        this.headers[header] = value;
        return this;
      },
    };

    try {
      // Route the request through your Express app
      server(req, res);
    } catch (error) {
      console.error('Netlify function error:', error);
      clearTimeout(timeoutId);
      resolve({
        statusCode: 500,
        headers: { 
          'Content-Type': 'application/json',
          'X-Error-Source': 'netlify-function'
        },
        body: JSON.stringify({ 
          error: 'Internal server error',
          timestamp: new Date().toISOString(),
          path: path
        }),
      });
    } finally {
      clearTimeout(timeoutId);
    }
  });
};
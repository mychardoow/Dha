import { createServer } from '../../dist/index.js';

const server = createServer();

export const handler = async (event, context) => {
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
      resolve({
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Internal server error' }),
      });
    }
  });
};
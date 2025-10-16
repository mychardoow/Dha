const config = {
  port: process.env.PORT || 3000,
  env: process.env.NODE_ENV || 'production',
  maxMemory: process.env.MAX_MEMORY || 512 * 1024 * 1024,
  timeouts: {
    shutdown: 10000,
    keepAlive: 65000
  },
  security: {
    maxBodySize: '50mb',
    rateLimit: 100,
    timeout: 30000
  }
};

module.exports = config;
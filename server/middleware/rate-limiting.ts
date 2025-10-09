import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';

// Production-grade rate limiting configuration
export const rateLimiterConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
};

// Stricter limits for sensitive endpoints
export const strictRateLimiterConfig = {
  ...rateLimiterConfig,
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 requests per hour
};

// AI endpoint specific rate limits
export const aiRateLimiterConfig = {
  ...rateLimiterConfig,
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 200, // 200 requests per hour for AI endpoints
};

// Create middleware instances
export const standardRateLimiter = rateLimit(rateLimiterConfig);
export const strictRateLimiter = rateLimit(strictRateLimiterConfig);
export const aiRateLimiter = rateLimit(aiRateLimiterConfig);

// Custom rate limiter for specific endpoints
export const createCustomRateLimiter = (options: Partial<typeof rateLimiterConfig>) => {
  return rateLimit({
    ...rateLimiterConfig,
    ...options,
  });
};

// Government API rate limiter
export const govApiRateLimiter = rateLimit({
  ...rateLimiterConfig,
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1000, // Higher limit for government APIs
});

// Helper to apply rate limiting based on endpoint type
export const applyRateLimit = (type: 'standard' | 'strict' | 'ai' | 'gov') => {
  switch (type) {
    case 'strict':
      return strictRateLimiter;
    case 'ai':
      return aiRateLimiter;
    case 'gov':
      return govApiRateLimiter;
    default:
      return standardRateLimiter;
  }
};
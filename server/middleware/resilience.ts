import { Request, Response, NextFunction } from 'express';
import { autoRecoveryService } from '../services/auto-recovery';
import { optimizedCacheService } from '../services/optimized-cache';
import { errorTrackingService } from '../services/error-tracking';

/**
 * Resilience Middleware
 * Implements request timeout, circuit breakers, and automatic recovery for API routes
 */

// Request timeout configuration per route pattern
const timeoutConfigs = new Map<RegExp, number>([
  [/^\/api\/auth\//, 5000],                    // Auth endpoints: 5 seconds
  [/^\/api\/documents\/generate/, 30000],      // Document generation: 30 seconds
  [/^\/api\/verification\//, 15000],           // Verification: 15 seconds
  [/^\/api\/ai\//, 60000],                     // AI operations: 60 seconds
  [/^\/api\/admin\//, 10000],                  // Admin operations: 10 seconds
  [/^\/api\//, 10000]                          // Default API: 10 seconds
]);

// Circuit breaker states per route
const circuitStates = new Map<string, CircuitState>();

interface CircuitState {
  failures: number;
  lastFailure?: Date;
  state: 'closed' | 'open' | 'half-open';
  successCount: number;
}

// Configuration
const CIRCUIT_FAILURE_THRESHOLD = 5;
const CIRCUIT_SUCCESS_THRESHOLD = 3;
const CIRCUIT_RESET_TIMEOUT = 60000; // 1 minute
const CIRCUIT_HALF_OPEN_REQUESTS = 3;

/**
 * Request timeout middleware
 */
export function requestTimeout(req: Request, res: Response, next: NextFunction) {
  // Skip timeout for WebSocket upgrades
  if (req.headers.upgrade === 'websocket') {
    return next();
  }

  // Find matching timeout config
  let timeout = 10000; // Default 10 seconds
  for (const [pattern, configTimeout] of Array.from(timeoutConfigs)) {
    if (pattern.test(req.path)) {
      timeout = configTimeout;
      break;
    }
  }

  // Set timeout on the request
  const timer = setTimeout(() => {
    if (!res.headersSent) {
      console.error(`[Timeout] Request timeout: ${req.method} ${req.path} after ${timeout}ms`);
      
      // Log the timeout
      errorTrackingService.logError({
        error: new Error(`Request timeout: ${req.method} ${req.path}`),
        context: {
          operation: `${req.method} ${req.path}`,
          timeout,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        } as any,
        severity: 'medium'
      });

      res.status(504).json({
        error: 'Request timeout',
        message: 'The request took too long to process. Please try again.',
        timeout
      });
    }
  }, timeout);

  // Clear timeout when response is sent
  const originalSend = res.send;
  res.send = function(body?: any) {
    clearTimeout(timer);
    return originalSend.call(res, body);
  };

  // Clear timeout on response end
  res.on('finish', () => clearTimeout(timer));
  res.on('close', () => clearTimeout(timer));

  next();
}

/**
 * Circuit breaker middleware
 */
export function circuitBreaker(req: Request, res: Response, next: NextFunction) {
  const routeKey = `${req.method}:${req.path}`;
  
  // Get or create circuit state
  let circuit = circuitStates.get(routeKey);
  if (!circuit) {
    circuit = {
      failures: 0,
      state: 'closed',
      successCount: 0
    };
    circuitStates.set(routeKey, circuit);
  }

  // Check circuit state
  if (circuit.state === 'open') {
    const now = Date.now();
    const timeSinceLastFailure = circuit.lastFailure ? now - circuit.lastFailure.getTime() : Infinity;
    
    if (timeSinceLastFailure > CIRCUIT_RESET_TIMEOUT) {
      // Try half-open state
      circuit.state = 'half-open';
      circuit.successCount = 0;
      console.log(`[Circuit Breaker] ${routeKey} entering half-open state`);
    } else {
      // Circuit is still open
      console.warn(`[Circuit Breaker] ${routeKey} is open, rejecting request`);
      return res.status(503).json({
        error: 'Service temporarily unavailable',
        message: 'This service is temporarily unavailable due to high error rate. Please try again later.',
        retryAfter: Math.ceil((CIRCUIT_RESET_TIMEOUT - timeSinceLastFailure) / 1000)
      });
    }
  }

  // Intercept response to track success/failure
  const originalSend = res.send;
  const originalJson = res.json;
  
  const handleResponse = (statusCode: number) => {
    if (statusCode >= 500) {
      // Server error - record failure
      circuit!.failures++;
      circuit!.lastFailure = new Date();
      circuit!.successCount = 0;
      
      if (circuit!.failures >= CIRCUIT_FAILURE_THRESHOLD) {
        circuit!.state = 'open';
        console.error(`[Circuit Breaker] ${routeKey} opened after ${circuit!.failures} failures`);
        
        // Log circuit opening
        errorTrackingService.logError({
          error: new Error(`Circuit breaker opened: ${routeKey}`),
          context: {
            operation: routeKey,
            failures: circuit!.failures,
            threshold: CIRCUIT_FAILURE_THRESHOLD
          } as any,
          severity: 'high'
        });
      }
    } else if (statusCode < 400) {
      // Success - record and potentially close circuit
      if (circuit!.state === 'half-open') {
        circuit!.successCount++;
        
        if (circuit!.successCount >= CIRCUIT_SUCCESS_THRESHOLD) {
          circuit!.state = 'closed';
          circuit!.failures = 0;
          circuit!.successCount = 0;
          console.log(`[Circuit Breaker] ${routeKey} closed after successful recovery`);
        }
      } else if (circuit!.state === 'closed') {
        // Decay failure count on success
        circuit!.failures = Math.max(0, circuit!.failures - 1);
      }
    }
  };

  res.send = function(...args: any[]) {
    handleResponse(res.statusCode);
    return originalSend.apply(res, args as [body?: any]);
  };

  res.json = function(...args: any[]) {
    handleResponse(res.statusCode);
    return originalJson.apply(res, args as [body?: any]);
  };

  next();
}

/**
 * Async error handler wrapper
 */
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Global error recovery middleware
 */
export async function errorRecovery(err: any, req: Request, res: Response, next: NextFunction) {
  // Log the error
  await errorTrackingService.logError({
    error: err,
    context: {
      operation: `${req.method} ${req.path}`,
      body: req.body,
      query: req.query,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    } as any,
    severity: err.severity || 'high'
  });

  // Check if response was already sent
  if (res.headersSent) {
    return next(err);
  }

  // Determine error response
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal server error';
  const errorResponse: any = {
    error: message,
    timestamp: new Date().toISOString()
  };

  // Add details in development mode
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
    errorResponse.details = err.details;
  }

  // Add retry information if applicable
  if (statusCode === 503 || statusCode === 429) {
    errorResponse.retryAfter = err.retryAfter || 60;
  }

  res.status(statusCode).json(errorResponse);
}

/**
 * Response caching middleware
 */
export function responseCache(options?: { ttl?: number; keyFn?: (req: Request) => string }) {
  const defaultTtl = options?.ttl || 60000; // Default 1 minute
  const getKey = options?.keyFn || ((req: Request) => `response:${req.method}:${req.path}:${JSON.stringify(req.query)}`);

  return async (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const cacheKey = getKey(req);
    
    // Try to get from cache
    const cached = await optimizedCacheService.get(cacheKey);
    if (cached) {
      console.log(`[Cache] Hit: ${cacheKey}`);
      return res.json(cached);
    }

    // Intercept response to cache it
    const originalJson = res.json;
    res.json = function(data: any) {
      // Cache successful responses only
      if (res.statusCode === 200) {
        optimizedCacheService.set(cacheKey, data, { ttl: defaultTtl }).catch(err => {
          console.error('[Cache] Failed to cache response:', err);
        });
      }
      return originalJson.call(res, data);
    };

    next();
  };
}

/**
 * Automatic retry middleware for failed requests
 */
export function autoRetry(options?: { maxRetries?: number; retryableErrors?: number[] }) {
  const maxRetries = options?.maxRetries || 3;
  const retryableErrors = options?.retryableErrors || [502, 503, 504];

  return (req: Request, res: Response, next: NextFunction) => {
    let retryCount = 0;
    
    const originalNext = next;
    const retryableNext = async (err?: any) => {
      if (err && retryableErrors.includes(err.statusCode || err.status) && retryCount < maxRetries) {
        retryCount++;
        console.log(`[Auto Retry] Retrying request ${req.method} ${req.path}, attempt ${retryCount}/${maxRetries}`);
        
        // Wait with exponential backoff
        const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 10000);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Retry the request
        return originalNext();
      }
      
      return originalNext(err);
    };

    next = retryableNext;
    next();
  };
}

/**
 * Resource optimization middleware
 */
export function resourceOptimization(req: Request, res: Response, next: NextFunction) {
  // Monitor resource usage
  const startMemory = process.memoryUsage();
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const endMemory = process.memoryUsage();
    const memoryDelta = endMemory.heapUsed - startMemory.heapUsed;

    // Log slow requests
    if (duration > 5000) {
      console.warn(`[Performance] Slow request: ${req.method} ${req.path} took ${duration}ms`);
    }

    // Log memory-intensive requests
    if (memoryDelta > 50 * 1024 * 1024) { // 50MB
      console.warn(`[Performance] Memory-intensive request: ${req.method} ${req.path} used ${Math.round(memoryDelta / 1024 / 1024)}MB`);
    }

    // Trigger garbage collection if memory usage is high
    if (endMemory.heapUsed > endMemory.heapTotal * 0.9) {
      if (global.gc) {
        console.log('[Performance] Triggering garbage collection due to high memory usage');
        global.gc();
      }
    }
  });

  next();
}

/**
 * Graceful degradation middleware
 */
let degradationMode = false;
const degradationFeatures = new Set<string>();

export function gracefulDegradation(feature: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (degradationMode && degradationFeatures.has(feature)) {
      console.log(`[Degradation] Feature disabled: ${feature}`);
      return res.status(503).json({
        error: 'Feature temporarily unavailable',
        message: `The ${feature} feature is temporarily disabled to maintain system stability.`,
        feature
      });
    }
    next();
  };
}

export function enableDegradation(features?: string[]) {
  degradationMode = true;
  if (features) {
    features.forEach(f => degradationFeatures.add(f));
  }
  console.log('[Degradation] Graceful degradation enabled for features:', Array.from(degradationFeatures));
}

export function disableDegradation() {
  degradationMode = false;
  degradationFeatures.clear();
  console.log('[Degradation] Graceful degradation disabled');
}

/**
 * Health check middleware
 */
export async function healthCheck(req: Request, res: Response) {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    recovery: autoRecoveryService.getHealthStatus(),
    cache: optimizedCacheService.getHealth(),
    circuits: Array.from(circuitStates.entries()).map(([route, state]) => ({
      route,
      state: state.state,
      failures: state.failures
    }))
  };

  // Determine overall health
  const cacheHealth = optimizedCacheService.getHealth();
  const hasOpenCircuits = Array.from(circuitStates.values()).some(s => s.state === 'open');
  
  if (hasOpenCircuits || !cacheHealth.healthy) {
    health.status = 'degraded';
  }

  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
}

/**
 * Setup all resilience middleware
 */
export function setupResilience(app: any) {
  // Apply in correct order
  app.use(requestTimeout);
  app.use(circuitBreaker);
  app.use(resourceOptimization);
  
  // Health check endpoint
  app.get('/health', healthCheck);
  app.get('/api/health/detailed', healthCheck);
  
  // Error recovery should be last
  app.use(errorRecovery);
  
  console.log('[Resilience] Middleware initialized');
}
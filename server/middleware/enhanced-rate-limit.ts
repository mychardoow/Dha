import { Request, Response, NextFunction } from 'express';
import { RateLimiterMemory, RateLimiterRedis, RateLimiterAbstract } from 'rate-limiter-flexible';
import { createHash } from 'crypto';
import { storage } from '../storage';
import { enhancedSecurityResponseService } from '../services/enhanced-security-response';

// Use singleton Enhanced Security Response Service for threat handling
const securityResponseService = enhancedSecurityResponseService;

/**
 * Enhanced Rate Limiting with Automatic Backoff
 * Implements adaptive rate limiting based on user behavior and system load
 */

// Rate limiter configurations
const rateLimiters = new Map<string, RateLimiterAbstract>();
const userBehaviorScores = new Map<string, BehaviorScore>();
const dynamicLimits = new Map<string, DynamicLimit>();

interface BehaviorScore {
  violations: number;
  lastViolation?: Date;
  backoffMultiplier: number;
  trustScore: number;
}

interface DynamicLimit {
  baseLimit: number;
  currentLimit: number;
  adjustedAt: Date;
  systemLoad: number;
}

interface RateLimitConfig {
  points: number;           // Number of requests
  duration: number;         // Per duration in seconds
  blockDuration?: number;   // Block duration in seconds
  execEvenly?: boolean;     // Spread requests evenly
  keyPrefix?: string;       // Key prefix for the limiter
}

// Default configurations for different endpoint types
const defaultConfigs: Record<string, RateLimitConfig> = {
  auth: {
    points: 5,
    duration: 60,
    blockDuration: 900, // 15 minutes
    keyPrefix: 'auth'
  },
  api: {
    points: 100,
    duration: 60,
    blockDuration: 60,
    keyPrefix: 'api'
  },
  admin: {
    points: 200,
    duration: 60,
    blockDuration: 30,
    keyPrefix: 'admin'
  },
  documents: {
    points: 10,
    duration: 60,
    blockDuration: 300,
    keyPrefix: 'docs'
  },
  ai: {
    points: 5,
    duration: 60,
    blockDuration: 600,
    keyPrefix: 'ai'
  },
  verification: {
    points: 20,
    duration: 60,
    blockDuration: 120,
    keyPrefix: 'verify'
  }
};

// Initialize rate limiters
function initializeRateLimiters(): void {
  for (const [key, config] of Object.entries(defaultConfigs)) {
    const limiter = new RateLimiterMemory({
      points: config.points,
      duration: config.duration,
      blockDuration: config.blockDuration,
      execEvenly: config.execEvenly || false,
      keyPrefix: config.keyPrefix
    });
    
    rateLimiters.set(key, limiter);
    
    // Initialize dynamic limits
    dynamicLimits.set(key, {
      baseLimit: config.points,
      currentLimit: config.points,
      adjustedAt: new Date(),
      systemLoad: 0
    });
  }
  
  // Start adaptive adjustment
  startAdaptiveAdjustment();
}

/**
 * Get user identifier for rate limiting
 */
function getUserIdentifier(req: Request): string {
  // Priority: authenticated user > API key > IP address
  if (req.user?.id) {
    return `user:${req.user.id}`;
  }
  
  const apiKey = req.headers['x-api-key'] as string;
  if (apiKey) {
    const hash = createHash('sha256').update(apiKey).digest('hex').substring(0, 16);
    return `api:${hash}`;
  }
  
  // Use IP address with forwarded headers support
  const ip = req.headers['x-forwarded-for'] as string || 
             req.headers['x-real-ip'] as string || 
             req.connection.remoteAddress || 
             req.ip;
  
  return `ip:${ip}`;
}

/**
 * Get rate limiter type based on route
 */
function getRateLimiterType(path: string): string {
  if (path.startsWith('/api/auth/')) return 'auth';
  if (path.startsWith('/api/admin/')) return 'admin';
  if (path.startsWith('/api/documents/')) return 'documents';
  if (path.startsWith('/api/ai/')) return 'ai';
  if (path.startsWith('/api/verification/')) return 'verification';
  return 'api';
}

/**
 * Calculate adaptive rate limit based on user behavior
 */
function calculateAdaptiveLimit(
  baseLimit: number,
  behaviorScore: BehaviorScore,
  systemLoad: number
): number {
  // Adjust based on trust score (0.5 to 2.0 multiplier)
  let limit = baseLimit * behaviorScore.trustScore;
  
  // Apply backoff multiplier for recent violations
  limit = limit / behaviorScore.backoffMultiplier;
  
  // Adjust based on system load (reduce limits when load is high)
  if (systemLoad > 0.8) {
    limit = limit * 0.5; // Half the limit at high load
  } else if (systemLoad > 0.6) {
    limit = limit * 0.75; // 75% at moderate load
  }
  
  // Ensure minimum limit
  return Math.max(Math.floor(limit), 1);
}

/**
 * Update user behavior score
 */
function updateBehaviorScore(userId: string, violated: boolean): void {
  let score = userBehaviorScores.get(userId) || {
    violations: 0,
    backoffMultiplier: 1,
    trustScore: 1
  };
  
  if (violated) {
    score.violations++;
    score.lastViolation = new Date();
    
    // Exponential backoff for repeat offenders
    score.backoffMultiplier = Math.min(score.backoffMultiplier * 2, 32);
    
    // Reduce trust score
    score.trustScore = Math.max(score.trustScore * 0.9, 0.5);
    
    console.warn(`[Rate Limit] User ${userId} violated rate limit. Violations: ${score.violations}, Backoff: ${score.backoffMultiplier}x`);
  } else {
    // Gradually restore trust for good behavior
    const hoursSinceLastViolation = score.lastViolation 
      ? (Date.now() - score.lastViolation.getTime()) / (1000 * 60 * 60)
      : 24;
    
    if (hoursSinceLastViolation > 1) {
      // Slowly reduce backoff
      score.backoffMultiplier = Math.max(score.backoffMultiplier * 0.95, 1);
      
      // Slowly increase trust
      score.trustScore = Math.min(score.trustScore * 1.01, 2);
    }
  }
  
  userBehaviorScores.set(userId, score);
}

/**
 * Enhanced rate limiting middleware
 */
export function enhancedRateLimit(customConfig?: Partial<RateLimitConfig>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip rate limiting for health checks
    if (req.path === '/health' || req.path === '/api/health') {
      return next();
    }
    
    const userId = getUserIdentifier(req);
    const limiterType = getRateLimiterType(req.path);
    const rateLimiter = rateLimiters.get(limiterType);
    
    if (!rateLimiter) {
      return next();
    }
    
    try {
      // Get user behavior score
      const behaviorScore = userBehaviorScores.get(userId) || {
        violations: 0,
        backoffMultiplier: 1,
        trustScore: 1
      };
      
      // Get dynamic limit
      const dynamicLimit = dynamicLimits.get(limiterType)!;
      
      // Calculate adaptive limit
      const adaptiveLimit = calculateAdaptiveLimit(
        dynamicLimit.currentLimit,
        behaviorScore,
        dynamicLimit.systemLoad
      );
      
      // Create a key with the adaptive limit
      const key = `${userId}:${adaptiveLimit}`;
      
      // Try to consume a point
      const rateLimiterRes = await rateLimiter.consume(key, 1);
      
      // Update behavior score (no violation)
      updateBehaviorScore(userId, false);
      
      // Add rate limit headers
      res.setHeader('X-RateLimit-Limit', adaptiveLimit.toString());
      res.setHeader('X-RateLimit-Remaining', rateLimiterRes.remainingPoints.toString());
      res.setHeader('X-RateLimit-Reset', new Date(Date.now() + rateLimiterRes.msBeforeNext).toISOString());
      
      next();
    } catch (rateLimiterRes: any) {
      // Rate limit exceeded
      updateBehaviorScore(userId, true);
      
      // Log the violation
      await storage.createSecurityEvent({
        userId: req.user?.id || null,
        eventType: 'rate_limit_exceeded',
        severity: 'medium',
        details: {
          path: req.path,
          method: req.method,
          limiterType,
          identifier: userId,
          points: rateLimiterRes.points || 0,
          remainingPoints: rateLimiterRes.remainingPoints || 0
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      // CRITICAL: Trigger Enhanced Security Response Service for rate limit violations
      const behaviorScore = userBehaviorScores.get(userId);
      const isRepeatedOffender = behaviorScore && behaviorScore.violations >= 3;
      const isHighVolumeAttack = (rateLimiterRes.points || 0) > 50;
      
      try {
        await securityResponseService.handleSecurityThreat({
          type: isHighVolumeAttack ? 'ddos_attack' : 'rate_limit_violation',
          sourceIp: req.ip || 'unknown',
          severity: isRepeatedOffender ? 'high' : isHighVolumeAttack ? 'critical' : 'medium',
          description: `Rate limit exceeded: ${rateLimiterRes.points || 0} requests in ${limiterType} endpoint`,
          confidence: isRepeatedOffender ? 85 : isHighVolumeAttack ? 95 : 70,
          indicators: [
            `Path: ${req.path}`,
            `Method: ${req.method}`,
            `Violations: ${behaviorScore?.violations || 1}`,
            `Points: ${rateLimiterRes.points || 0}`,
            `User Agent: ${req.get('User-Agent') || 'unknown'}`
          ],
          userId: req.user?.id,
          details: {
            limiterType,
            behaviorScore: behaviorScore,
            rateLimiterData: rateLimiterRes,
            requestDetails: {
              path: req.path,
              method: req.method,
              headers: req.headers
            }
          }
        });
        console.log(`🛡️ Enhanced Security Response triggered for rate limit violation from ${req.ip}`);
      } catch (securityError) {
        console.error('❌ Failed to trigger Enhanced Security Response:', securityError);
      }
      
      // Calculate retry after based on backoff  
      const retryAfter = Math.ceil(
        (rateLimiterRes.msBeforeNext || 60000) * (behaviorScore?.backoffMultiplier || 1) / 1000
      );
      
      res.setHeader('Retry-After', retryAfter.toString());
      res.setHeader('X-RateLimit-Limit', '0');
      res.setHeader('X-RateLimit-Remaining', '0');
      res.setHeader('X-RateLimit-Reset', new Date(Date.now() + retryAfter * 1000).toISOString());
      
      res.status(429).json({
        error: 'Too many requests',
        message: 'You have exceeded the rate limit. Please slow down your requests.',
        retryAfter,
        violations: behaviorScore?.violations || 0
      });
    }
  };
}

/**
 * Adaptive adjustment based on system metrics
 */
function startAdaptiveAdjustment(): void {
  setInterval(() => {
    adjustLimitsBasedOnSystemLoad();
  }, 30000); // Every 30 seconds
  
  setInterval(() => {
    cleanupOldBehaviorScores();
  }, 3600000); // Every hour
}

/**
 * Adjust rate limits based on system load
 */
async function adjustLimitsBasedOnSystemLoad(): Promise<void> {
  const memoryUsage = process.memoryUsage();
  const heapUsedPercent = memoryUsage.heapUsed / memoryUsage.heapTotal;
  const cpuUsage = process.cpuUsage();
  
  // Simple load calculation (in production, use more sophisticated metrics)
  const systemLoad = Math.min(heapUsedPercent, 1);
  
  for (const [key, limit] of Array.from(dynamicLimits)) {
    const oldLimit = limit.currentLimit;
    
    if (systemLoad > 0.8) {
      // High load - reduce limits
      limit.currentLimit = Math.max(Math.floor(limit.baseLimit * 0.5), 1);
      limit.systemLoad = systemLoad;
      
      if (oldLimit !== limit.currentLimit) {
        console.log(`[Rate Limit] Reduced ${key} limit from ${oldLimit} to ${limit.currentLimit} due to high load`);
      }
    } else if (systemLoad < 0.5) {
      // Low load - restore limits
      limit.currentLimit = limit.baseLimit;
      limit.systemLoad = systemLoad;
      
      if (oldLimit !== limit.currentLimit) {
        console.log(`[Rate Limit] Restored ${key} limit from ${oldLimit} to ${limit.currentLimit}`);
      }
    }
    
    limit.adjustedAt = new Date();
  }
}

/**
 * Cleanup old behavior scores
 */
function cleanupOldBehaviorScores(): void {
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  let cleaned = 0;
  
  for (const [userId, score] of Array.from(userBehaviorScores)) {
    if (score.lastViolation && score.lastViolation.getTime() < oneDayAgo) {
      userBehaviorScores.delete(userId);
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    console.log(`[Rate Limit] Cleaned up ${cleaned} old behavior scores`);
  }
}

/**
 * Get rate limiting status
 */
export function getRateLimitStatus(): any {
  const status = {
    limiters: {} as any,
    behaviorScores: userBehaviorScores.size,
    dynamicLimits: {} as any
  };
  
  for (const [key, limit] of Array.from(dynamicLimits)) {
    status.dynamicLimits[key] = {
      base: limit.baseLimit,
      current: limit.currentLimit,
      load: Math.round(limit.systemLoad * 100) + '%',
      adjustedAt: limit.adjustedAt
    };
  }
  
  return status;
}

/**
 * Reset rate limit for a specific user
 */
export async function resetRateLimit(userId: string): Promise<void> {
  // Clear behavior score
  userBehaviorScores.delete(userId);
  
  // Reset in all rate limiters
  for (const [key, limiter] of Array.from(rateLimiters)) {
    try {
      await limiter.delete(`${userId}:*`);
    } catch (err) {
      console.error(`[Rate Limit] Failed to reset limit for ${userId} in ${key}:`, err);
    }
  }
  
  console.log(`[Rate Limit] Reset rate limits for user ${userId}`);
}

/**
 * Temporarily whitelist a user
 */
const whitelisted = new Set<string>();

export function whitelistUser(userId: string, duration: number = 3600000): void {
  whitelisted.add(userId);
  
  setTimeout(() => {
    whitelisted.delete(userId);
    console.log(`[Rate Limit] Removed ${userId} from whitelist`);
  }, duration);
  
  console.log(`[Rate Limit] Whitelisted ${userId} for ${duration}ms`);
}

/**
 * Enhanced rate limit with whitelist support
 */
export function enhancedRateLimitWithWhitelist(customConfig?: Partial<RateLimitConfig>) {
  const rateLimitMiddleware = enhancedRateLimit(customConfig);
  
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = getUserIdentifier(req);
    
    // Skip rate limiting for whitelisted users
    if (whitelisted.has(userId)) {
      return next();
    }
    
    return rateLimitMiddleware(req, res, next);
  };
}

// Initialize rate limiters on module load
initializeRateLimiters();

// Export configured middleware for different endpoints
export const authRateLimit = enhancedRateLimitWithWhitelist(defaultConfigs.auth);
export const apiRateLimit = enhancedRateLimitWithWhitelist(defaultConfigs.api);
export const adminRateLimit = enhancedRateLimitWithWhitelist(defaultConfigs.admin);
export const documentsRateLimit = enhancedRateLimitWithWhitelist(defaultConfigs.documents);
export const aiRateLimit = enhancedRateLimitWithWhitelist(defaultConfigs.ai);
export const verificationRateLimit = enhancedRateLimitWithWhitelist(defaultConfigs.verification);
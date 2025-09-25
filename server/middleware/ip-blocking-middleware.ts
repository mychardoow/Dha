/**
 * IP Blocking Middleware
 * Integrates with Enhanced Security Response Service for real-time IP blocking
 * This middleware actually blocks requests from malicious IPs at the HTTP level
 */

import { Request, Response, NextFunction } from 'express';
import { enhancedSecurityResponseService } from '../services/enhanced-security-response';
import { databaseFallbackService } from '../services/database-fallback-service';

// Use singleton Enhanced Security Response Service
function getSecurityResponseService() {
  return enhancedSecurityResponseService;
}

// IP blocking data cache for performance
interface BlockedIPCache {
  blockedIPs: Set<string>;
  quarantinedIPs: Set<string>;
  lastUpdate: number;
  cacheTTL: number;
}

const ipBlockingCache: BlockedIPCache = {
  blockedIPs: new Set(),
  quarantinedIPs: new Set(),
  lastUpdate: 0,
  cacheTTL: 60000 // 1 minute cache
};

/**
 * Refresh the IP blocking cache from the security service
 */
function refreshBlockingCache(): void {
  const now = Date.now();
  if (now - ipBlockingCache.lastUpdate < ipBlockingCache.cacheTTL) {
    return; // Cache still valid
  }

  const securityService = getSecurityResponseService();
  
  // Get current blocked and quarantined IPs from the service
  // Using proper public getters instead of private field access
  const currentBlockedIPs = securityService.getBlockedIPs();
  const currentQuarantinedIPs = securityService.getQuarantinedIPs();
  
  ipBlockingCache.blockedIPs = new Set([...currentBlockedIPs]);
  ipBlockingCache.quarantinedIPs = new Set([...currentQuarantinedIPs]);
  ipBlockingCache.lastUpdate = now;
}

/**
 * Check if an IP address should be blocked
 */
function shouldBlockIP(ipAddress: string): { blocked: boolean; reason: string; action: string } {
  refreshBlockingCache();
  
  if (ipBlockingCache.blockedIPs.has(ipAddress)) {
    return { blocked: true, reason: 'IP_BLOCKED', action: 'SECURITY_BLOCK' };
  }
  
  if (ipBlockingCache.quarantinedIPs.has(ipAddress)) {
    return { blocked: true, reason: 'IP_QUARANTINED', action: 'SECURITY_QUARANTINE' };
  }
  
  return { blocked: false, reason: '', action: '' };
}

/**
 * Log security blocking event
 */
async function logSecurityBlock(req: Request, reason: string, action: string): Promise<void> {
  try {
    await databaseFallbackService.recordWithFallback('security_event', {
      eventType: 'ip_blocked',
      severity: 'high',
      details: {
        reason,
        action,
        path: req.path,
        method: req.method,
        headers: {
          userAgent: req.get('User-Agent'),
          referer: req.get('Referer'),
          origin: req.get('Origin')
        },
        timestamp: new Date().toISOString()
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Also create security incident for high-severity blocks
    if (reason === 'IP_BLOCKED') {
      await databaseFallbackService.recordWithFallback('security_incident', {
        type: 'blocked_ip_access_attempt',
        severity: 'high',
        confidence: 95,
        source: req.ip,
        target: req.path,
        details: {
          action: action,
          reason: reason,
          method: req.method,
          userAgent: req.get('User-Agent'),
          attemptedPath: req.path
        },
        riskScore: 85,
        status: 'mitigated',
        responseActions: ['IP_BLOCKED', 'REQUEST_DENIED'],
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
    }
  } catch (error) {
    console.error('Error logging security block event:', error);
    // Don't let logging errors prevent blocking
  }
}

/**
 * Main IP blocking middleware function
 * This is where requests are actually blocked at the HTTP level
 */
/**
 * Normalize IP address for consistent comparison
 */
function normalizeIP(ip: string): string {
  if (!ip) return 'unknown';
  
  // Handle IPv6-mapped IPv4 addresses (::ffff:192.168.1.1 -> 192.168.1.1)
  if (ip.startsWith('::ffff:')) {
    return ip.substring(7);
  }
  
  // Handle IPv6 localhost (::1 -> 127.0.0.1)
  if (ip === '::1') {
    return '127.0.0.1';
  }
  
  return ip;
}

/**
 * Extract client IP from request with multiple fallbacks
 */
function getClientIP(req: Request): string {
  // Check X-Forwarded-For header first (for proxies/load balancers)
  const forwardedFor = req.get('X-Forwarded-For');
  if (forwardedFor) {
    const ips = forwardedFor.split(',').map(ip => ip.trim());
    return normalizeIP(ips[0]); // Take first IP (original client)
  }
  
  // Check X-Real-IP header
  const realIP = req.get('X-Real-IP');
  if (realIP) {
    return normalizeIP(realIP);
  }
  
  // Fallback to Express req.ip and connection info
  const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
  return normalizeIP(clientIP);
}

export async function ipBlockingMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const clientIP = getClientIP(req);
    
    // Skip blocking for localhost and health checks in development
    if (process.env.NODE_ENV === 'development' && 
        (clientIP === '127.0.0.1' || clientIP === '::1' || req.path === '/api/health')) {
      return next();
    }

    // Check if this IP should be blocked
    const blockCheck = shouldBlockIP(clientIP);
    
    if (blockCheck.blocked) {
      // Log the security blocking event
      await logSecurityBlock(req, blockCheck.reason, blockCheck.action);
      
      console.warn(`🚫 BLOCKED REQUEST: ${clientIP} attempting ${req.method} ${req.path} - Reason: ${blockCheck.reason}`);
      
      // Return 403 Forbidden with security message
      return res.status(403).json({
        error: 'Access Forbidden',
        message: 'Your request has been blocked due to security policy',
        code: blockCheck.reason,
        timestamp: new Date().toISOString(),
        requestId: `blocked_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      });
    }

    // IP is not blocked, check for suspicious activity
    // This integrates with the security service for real-time threat assessment
    const securityService = getSecurityResponseService();
    
    // Check for rapid requests or suspicious patterns
    const isRapidRequests = await checkRapidRequests(clientIP);
    const isSuspiciousUserAgent = checkSuspiciousUserAgent(req.get('User-Agent') || '');
    const isSuspiciousPath = checkSuspiciousPath(req.path);
    
    if (isRapidRequests || isSuspiciousUserAgent || isSuspiciousPath) {
      // Trigger security analysis but don't block yet
      const threatData = {
        type: 'suspicious_activity',
        sourceIp: clientIP,
        severity: 'medium' as const,
        description: `Suspicious activity detected: rapid=${isRapidRequests}, agent=${isSuspiciousUserAgent}, path=${isSuspiciousPath}`,
        confidence: 65,
        indicators: [
          ...(isRapidRequests ? ['rapid_requests'] : []),
          ...(isSuspiciousUserAgent ? ['suspicious_user_agent'] : []),
          ...(isSuspiciousPath ? ['suspicious_path'] : [])
        ],
        details: {
          method: req.method,
          path: req.path,
          userAgent: req.get('User-Agent'),
          headers: Object.keys(req.headers).reduce((acc, key) => {
            // Only include non-sensitive headers
            if (!['authorization', 'cookie', 'x-api-key'].includes(key.toLowerCase())) {
              acc[key] = req.headers[key];
            }
            return acc;
          }, {} as any)
        }
      };

      // Handle the threat in the background (non-blocking)
      securityService.handleSecurityThreat(threatData).catch(error => {
        console.error('Background security threat analysis failed:', error);
      });
    }
    
    // Continue processing the request
    next();
    
  } catch (error) {
    console.error('IP blocking middleware error:', error);
    // Don't let middleware errors break the application
    next();
  }
}

/**
 * Request rate tracking for rapid request detection
 */
const requestTracking = new Map<string, { count: number; firstRequest: number; lastRequest: number }>();

async function checkRapidRequests(ipAddress: string): Promise<boolean> {
  const now = Date.now();
  const timeWindow = 60000; // 1 minute
  const maxRequests = 120; // 120 requests per minute (2 per second average)
  
  const tracking = requestTracking.get(ipAddress);
  
  if (!tracking) {
    requestTracking.set(ipAddress, { count: 1, firstRequest: now, lastRequest: now });
    return false;
  }
  
  // Reset if window has passed
  if (now - tracking.firstRequest > timeWindow) {
    requestTracking.set(ipAddress, { count: 1, firstRequest: now, lastRequest: now });
    return false;
  }
  
  tracking.count++;
  tracking.lastRequest = now;
  
  // Clean up old entries periodically
  if (Math.random() < 0.01) { // 1% chance to cleanup
    cleanupRequestTracking();
  }
  
  return tracking.count > maxRequests;
}

function cleanupRequestTracking(): void {
  const now = Date.now();
  const expiry = 300000; // 5 minutes
  
  for (const [ip, tracking] of requestTracking.entries()) {
    if (now - tracking.lastRequest > expiry) {
      requestTracking.delete(ip);
    }
  }
}

/**
 * Check for suspicious user agents
 */
function checkSuspiciousUserAgent(userAgent: string): boolean {
  if (!userAgent || userAgent.length < 5) return true;
  
  const suspiciousPatterns = [
    /bot|crawler|spider|scraper/i,
    /curl|wget|httpie|postman/i,
    /python|java|go-http|node-fetch/i,
    /scanner|exploit|hack|attack/i,
    /sqlmap|nikto|nmap|burp/i
  ];
  
  return suspiciousPatterns.some(pattern => pattern.test(userAgent));
}

/**
 * Check for suspicious paths
 */
function checkSuspiciousPath(path: string): boolean {
  const suspiciousPaths = [
    /\/admin|\/wp-admin|\/phpmyadmin/i,
    /\.env|\.git|\.svn|\.htaccess/i,
    /\/api\/.*\/.*\/.*\//i, // Deep nested API calls
    /\.\.|%2e%2e/i, // Path traversal
    /script|javascript|vbscript/i,
    /select.*from|union.*select|drop.*table/i // SQL injection patterns
  ];
  
  return suspiciousPaths.some(pattern => pattern.test(path));
}

/**
 * Get current IP blocking statistics
 */
export function getIPBlockingStats(): {
  blockedIPs: number;
  quarantinedIPs: number;
  requestsTracked: number;
  cacheLastUpdate: number;
} {
  refreshBlockingCache();
  return {
    blockedIPs: ipBlockingCache.blockedIPs.size,
    quarantinedIPs: ipBlockingCache.quarantinedIPs.size,
    requestsTracked: requestTracking.size,
    cacheLastUpdate: ipBlockingCache.lastUpdate
  };
}

/**
 * Manually refresh the IP blocking cache
 */
export function forceRefreshIPCache(): void {
  ipBlockingCache.lastUpdate = 0;
  refreshBlockingCache();
  console.log('🛡️ IP blocking cache manually refreshed');
}

/**
 * Health check for IP blocking middleware
 */
export function getIPBlockingHealth(): {
  status: 'healthy' | 'degraded' | 'unhealthy';
  message: string;
  stats: ReturnType<typeof getIPBlockingStats>;
} {
  try {
    const stats = getIPBlockingStats();
    const securityService = getSecurityResponseService();
    
    const status = securityService ? 'healthy' : 'degraded';
    const message = securityService 
      ? 'IP blocking middleware operational'
      : 'Security service not fully initialized';
      
    return { status, message, stats };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: `IP blocking middleware error: ${error instanceof Error ? error.message : String(error)}`,
      stats: { blockedIPs: 0, quarantinedIPs: 0, requestsTracked: 0, cacheLastUpdate: 0 }
    };
  }
}

export default ipBlockingMiddleware;
import { Request, Response, NextFunction } from 'express';
import { auditTrailService } from '../services/audit-trail-service';
import { AuditAction } from '@shared/schema';

declare module 'express-serve-static-core' {
  interface Request {
    user?: { id: string };
    session?: { userId?: string; id?: string };
    sessionID?: string;
    auditContext?: {
      userId?: string;
      sessionId?: string;
      ipAddress?: string;
      userAgent?: string;
      location?: string;
      startTime: Date;
    };
  }
}

export interface AuditMiddlewareConfig {
  enabled: boolean;
  excludePaths: string[];
  includeRequestBody: boolean;
  includeResponseBody: boolean;
  maxBodySize: number;
  sensitiveFields: string[];
}

export class AuditTrailMiddleware {
  private config: AuditMiddlewareConfig;

  constructor(config: Partial<AuditMiddlewareConfig> = {}) {
    this.config = {
      enabled: true,
      excludePaths: ['/health', '/metrics', '/api/ping'],
      includeRequestBody: false, // For security, don't log full request bodies by default
      includeResponseBody: false,
      maxBodySize: 1024, // 1KB max for logged bodies
      sensitiveFields: ['password', 'token', 'secret', 'key', 'pin', 'ssn'],
      ...config
    };
  }

  /**
   * Express middleware for automatic audit trail logging
   */
  auditRequestMiddleware = (req: Request, res: Response, next: NextFunction) => {
    if (!this.config.enabled) {
      return next();
    }

    // Skip excluded paths
    if (this.config.excludePaths.some(path => req.path.startsWith(path))) {
      return next();
    }

    // Initialize audit context
    req.auditContext = {
      userId: this.extractUserId(req),
      sessionId: this.extractSessionId(req),
      ipAddress: this.getClientIP(req),
      userAgent: req.get('User-Agent') || '',
      location: this.extractLocation(req),
      startTime: new Date()
    };

    // Capture original response methods
    const originalSend = res.send;
    const originalJson = res.json;

    let responseBody: any = null;
    let responseStarted = false;

    // Override response methods to capture response data
    res.send = function(this: Response, body: any) {
      if (!responseStarted) {
        responseStarted = true;
        responseBody = body;
        setImmediate(() => {
          auditTrailMiddleware.logRequestCompletion(req, res, responseBody);
        });
      }
      return originalSend.call(this, body);
    };

    res.json = function(this: Response, body: any) {
      if (!responseStarted) {
        responseStarted = true;
        responseBody = body;
        setImmediate(() => {
          auditTrailMiddleware.logRequestCompletion(req, res, responseBody);
        });
      }
      return originalJson.call(this, body);
    };

    // Handle response finish event for cases where send/json aren't called
    res.on('finish', () => {
      if (!responseStarted) {
        responseStarted = true;
        setImmediate(() => {
          auditTrailMiddleware.logRequestCompletion(req, res, responseBody);
        });
      }
    });

    next();
  };

  /**
   * Log API request completion
   */
  private async logRequestCompletion(req: Request, res: Response, responseBody?: any): Promise<void> {
    try {
      if (!req.auditContext) return;

      const duration = Date.now() - req.auditContext.startTime.getTime();
      const action = this.determineAction(req);
      const outcome = this.determineOutcome(res.statusCode);

      // Prepare action details
      const actionDetails = {
        method: req.method,
        path: req.path,
        query: this.sanitizeObject(req.query),
        params: this.sanitizeObject(req.params),
        statusCode: res.statusCode,
        duration,
        timestamp: new Date().toISOString(),
        ...(this.config.includeRequestBody && {
          requestBody: this.sanitizeAndTruncateBody(req.body)
        }),
        ...(this.config.includeResponseBody && {
          responseBody: this.sanitizeAndTruncateBody(responseBody)
        })
      };

      // Determine entity details
      const entityInfo = this.extractEntityInfo(req, responseBody);

      await auditTrailService.logUserAction(
        action,
        outcome,
        {
          userId: req.auditContext.userId,
          sessionId: req.auditContext.sessionId,
          ipAddress: req.auditContext.ipAddress,
          userAgent: req.auditContext.userAgent,
          location: req.auditContext.location,
          entityType: entityInfo.type,
          entityId: entityInfo.id,
          actionDetails,
          riskScore: this.calculateRequestRiskScore(req, res)
        }
      );

    } catch (error) {
      console.error('Audit trail middleware error:', error);
    }
  }

  /**
   * Middleware specifically for authentication events
   */
  auditAuthMiddleware = (eventType: 'login_attempt' | 'login_success' | 'login_failed' | 'logout' | 'password_changed') => {
    return async (req: Request, res: Response, next: NextFunction) => {
      if (!this.config.enabled) return next();

      try {
        const userId = eventType === 'login_attempt' ? req.body?.email || req.body?.username : this.extractUserId(req);
        
        await auditTrailService.logAuthEvent(
          eventType,
          userId || null,
          {
            sessionId: this.extractSessionId(req),
            ipAddress: this.getClientIP(req),
            userAgent: req.get('User-Agent') || '',
            location: this.extractLocation(req),
            actionDetails: {
              method: req.method,
              path: req.path,
              timestamp: new Date().toISOString(),
              attempt: eventType
            }
          }
        );

      } catch (error) {
        console.error('Auth audit middleware error:', error);
      }

      next();
    };
  };

  /**
   * Middleware for document operations
   */
  auditDocumentMiddleware = (eventType: 'uploaded' | 'downloaded' | 'viewed' | 'deleted' | 'modified' | 'verified') => {
    return async (req: Request, res: Response, next: NextFunction) => {
      if (!this.config.enabled) return next();

      // Execute the original handler first
      const originalSend = res.send;
      res.send = function(body: any) {
        setImmediate(async () => {
          try {
            const userId = auditTrailMiddleware.extractUserId(req);
            const documentId = req.params.id || req.params.documentId || req.body?.documentId;

            if (userId && documentId && res.statusCode < 400) {
              await auditTrailService.logDocumentEvent(
                eventType,
                userId,
                documentId,
                {
                  sessionId: auditTrailMiddleware.extractSessionId(req),
                  ipAddress: auditTrailMiddleware.getClientIP(req),
                  userAgent: req.get('User-Agent') || '',
                  location: auditTrailMiddleware.extractLocation(req),
                  actionDetails: {
                    method: req.method,
                    path: req.path,
                    statusCode: res.statusCode,
                    timestamp: new Date().toISOString(),
                    documentType: req.body?.type || 'unknown',
                    fileSize: req.body?.size,
                    fileName: req.body?.name
                  }
                }
              );
            }
          } catch (error) {
            console.error('Document audit middleware error:', error);
          }
        });
        
        return originalSend.call(this, body);
      };

      next();
    };
  };

  /**
   * Extract user ID from request
   */
  private extractUserId(req: Request): string | undefined {
    // Try multiple sources for user ID
    return (
      req.user?.id ||           // From auth middleware
      req.session?.userId ||    // From session
      req.body?.userId ||       // From request body
      req.query?.userId ||      // From query params
      req.headers?.['x-user-id'] // From custom header
    ) as string | undefined;
  }

  /**
   * Extract session ID from request
   */
  private extractSessionId(req: Request): string | undefined {
    return (
      req.session?.id ||
      req.sessionID ||
      req.headers?.['x-session-id']
    ) as string | undefined;
  }

  /**
   * Get client IP address
   */
  private getClientIP(req: Request): string {
    return (
      req.headers['x-forwarded-for'] as string ||
      req.headers['x-real-ip'] as string ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      req.ip ||
      'unknown'
    ).split(',')[0].trim();
  }

  /**
   * Extract location from request (if available)
   */
  private extractLocation(req: Request): string | undefined {
    return (
      req.headers['x-user-location'] ||
      req.headers['x-geo-location'] ||
      req.body?.location
    ) as string | undefined;
  }

  /**
   * Determine audit action based on request
   */
  private determineAction(req: Request): string {
    const method = req.method.toUpperCase();
    const path = req.path;

    // Authentication actions
    if (path.includes('/auth/login')) return AuditAction.LOGIN_ATTEMPT;
    if (path.includes('/auth/logout')) return AuditAction.LOGOUT;
    if (path.includes('/auth/register')) return AuditAction.USER_CREATED;
    if (path.includes('/auth/password')) return AuditAction.PASSWORD_CHANGED;

    // Document actions
    if (path.includes('/documents')) {
      if (method === 'POST') return AuditAction.DOCUMENT_UPLOADED;
      if (method === 'GET') return AuditAction.DOCUMENT_VIEWED;
      if (method === 'PUT' || method === 'PATCH') return AuditAction.DOCUMENT_MODIFIED;
      if (method === 'DELETE') return AuditAction.DOCUMENT_DELETED;
    }

    if (path.includes('/download')) return AuditAction.DOCUMENT_DOWNLOADED;
    if (path.includes('/verify')) return AuditAction.DOCUMENT_VERIFIED;

    // User management actions
    if (path.includes('/users')) {
      if (method === 'POST') return AuditAction.USER_CREATED;
      if (method === 'PUT' || method === 'PATCH') return AuditAction.USER_UPDATED;
      if (method === 'DELETE') return AuditAction.USER_DELETED;
    }

    // Admin actions
    if (path.includes('/admin')) {
      return `admin_${method.toLowerCase()}_${this.extractResourceFromPath(path)}`;
    }

    // API integrations
    if (path.includes('/api/dha')) return AuditAction.DHA_API_CALL;
    if (path.includes('/api/saps')) return AuditAction.SAPS_API_CALL;
    if (path.includes('/api/icao')) return AuditAction.ICAO_API_CALL;

    // Generic API call
    return AuditAction.API_CALL;
  }

  /**
   * Determine outcome based on status code
   */
  private determineOutcome(statusCode: number): 'success' | 'failure' | 'partial' {
    if (statusCode >= 200 && statusCode < 300) return 'success';
    if (statusCode >= 400) return 'failure';
    return 'partial';
  }

  /**
   * Extract entity information from request
   */
  private extractEntityInfo(req: Request, responseBody?: any): { type?: string; id?: string } {
    // Try to extract from URL params
    if (req.params.id) {
      const pathSegments = req.path.split('/');
      const resourceIndex = pathSegments.findIndex(segment => segment === 'api') + 1;
      const resource = pathSegments[resourceIndex];
      
      return {
        type: resource?.replace(/s$/, ''), // Remove plural 's'
        id: req.params.id
      };
    }

    // Try to extract from response body
    if (responseBody && typeof responseBody === 'object') {
      const id = responseBody.id || responseBody._id;
      if (id) {
        return { id: id.toString() };
      }
    }

    return {};
  }

  /**
   * Calculate request risk score
   */
  private calculateRequestRiskScore(req: Request, res: Response): number {
    let score = 0;

    // Failed requests increase risk
    if (res.statusCode >= 400) score += 10;
    if (res.statusCode >= 500) score += 5;

    // Admin paths increase risk
    if (req.path.includes('/admin')) score += 15;

    // Sensitive operations
    if (req.path.includes('/delete')) score += 20;
    if (req.path.includes('/modify') || req.method === 'DELETE') score += 15;

    // Unusual times (2 AM - 6 AM)
    const hour = new Date().getHours();
    if (hour >= 2 && hour <= 6) score += 10;

    return Math.min(score, 100);
  }

  /**
   * Sanitize object by removing sensitive fields
   */
  private sanitizeObject(obj: any): any {
    if (!obj || typeof obj !== 'object') return obj;

    const sanitized = { ...obj };
    for (const field of this.config.sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }
    return sanitized;
  }

  /**
   * Sanitize and truncate body content
   */
  private sanitizeAndTruncateBody(body: any): any {
    if (!body) return null;

    let sanitizedBody = this.sanitizeObject(body);
    const bodyString = JSON.stringify(sanitizedBody);

    if (bodyString.length > this.config.maxBodySize) {
      return {
        ...sanitizedBody,
        _truncated: true,
        _originalSize: bodyString.length
      };
    }

    return sanitizedBody;
  }

  /**
   * Extract resource name from path
   */
  private extractResourceFromPath(path: string): string {
    const segments = path.split('/').filter(Boolean);
    return segments[segments.length - 1] || 'unknown';
  }

  /**
   * Configure middleware settings
   */
  configure(newConfig: Partial<AuditMiddlewareConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): AuditMiddlewareConfig {
    return { ...this.config };
  }
}

// Export singleton instance
export const auditTrailMiddleware = new AuditTrailMiddleware({
  enabled: process.env.NODE_ENV !== 'test', // Disable in test environment
  excludePaths: [
    '/health', 
    '/metrics', 
    '/api/ping',
    '/favicon.ico',
    '/static',
    '/assets'
  ],
  includeRequestBody: false, // Security: don't log request bodies by default
  includeResponseBody: false,
  maxBodySize: 512, // 512 bytes max for any logged bodies
  sensitiveFields: [
    'password', 'token', 'secret', 'key', 'pin', 'ssn', 
    'idNumber', 'passportNumber', 'bankAccount', 'creditCard'
  ]
});
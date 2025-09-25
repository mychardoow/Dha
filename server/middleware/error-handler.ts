/**
 * Comprehensive Error Handler Middleware
 * Integrates with Enhanced Error Correction Service for automatic error recovery
 * This is the actual integration point for the self-healing architecture
 */

import { Request, Response, NextFunction } from 'express';
import { EnhancedErrorCorrectionService } from '../services/enhanced-error-correction';
import { storage } from '../storage';
import { getConnectionStatus } from '../db';

// Initialize Enhanced Error Correction Service
const errorCorrectionService = new EnhancedErrorCorrectionService();

interface ErrorDetails {
  message: string;
  stack?: string;
  code?: string;
  component: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: 'memory_leak' | 'database_connection' | 'network_failure' | 'service_crash' | 
        'file_system_error' | 'performance_degradation' | 'timeout' | 'resource_exhaustion';
}

/**
 * Global Express Error Handler with Enhanced Error Correction Integration
 */
export async function enhancedErrorHandler(
  error: any, 
  req: Request, 
  res: Response, 
  next: NextFunction
): Promise<void> {
  const startTime = Date.now();
  
  try {
    console.error(`🚨 Error caught by Enhanced Error Handler: ${error.message}`);
    
    // Analyze error and determine type and severity
    const errorDetails = analyzeError(error, req);
    
    // Log the error for audit purposes
    await logErrorEvent(error, req, errorDetails);
    
    // CRITICAL: Trigger Enhanced Error Correction Service for automatic remediation
    try {
      const correctionResult = await errorCorrectionService.correctError({
        type: errorDetails.type,
        message: errorDetails.message,
        component: errorDetails.component,
        severity: errorDetails.severity,
        details: {
          path: req.path,
          method: req.method,
          userAgent: req.get('User-Agent'),
          stack: error.stack,
          code: error.code,
          requestId: req.headers['x-request-id']
        },
        stackTrace: error.stack
      });
      
      const responseTime = Date.now() - startTime;
      console.log(`✅ Error correction attempted in ${responseTime}ms: ${correctionResult.action}`);
      
      // If correction was successful and indicates restart needed, log it
      if (correctionResult.success && correctionResult.needsRestart) {
        console.warn(`⚠️ Error correction successful but service restart recommended: ${errorDetails.component}`);
      }
      
    } catch (correctionError) {
      console.error('❌ Enhanced Error Correction failed:', correctionError);
    }
    
    // Handle specific error types
    if (error.name === 'DatabaseConnectionError' || error.code === 'ECONNREFUSED') {
      return sendErrorResponse(res, 503, 'Service temporarily unavailable', 'DATABASE_ERROR');
    }
    
    if (error.name === 'ValidationError') {
      return sendErrorResponse(res, 400, 'Invalid request data', 'VALIDATION_ERROR');
    }
    
    if (error.name === 'AuthenticationError' || error.code === 'UNAUTHORIZED') {
      return sendErrorResponse(res, 401, 'Authentication required', 'AUTH_ERROR');
    }
    
    if (error.name === 'ForbiddenError' || error.code === 'FORBIDDEN') {
      return sendErrorResponse(res, 403, 'Access denied', 'PERMISSION_ERROR');
    }
    
    if (error.name === 'NotFoundError') {
      return sendErrorResponse(res, 404, 'Resource not found', 'NOT_FOUND');
    }
    
    if (error.name === 'TimeoutError' || error.code === 'TIMEOUT') {
      return sendErrorResponse(res, 408, 'Request timeout', 'TIMEOUT_ERROR');
    }
    
    if (error.name === 'RateLimitError' || error.code === 'TOO_MANY_REQUESTS') {
      return sendErrorResponse(res, 429, 'Too many requests', 'RATE_LIMIT_ERROR');
    }
    
    // Default to internal server error
    sendErrorResponse(res, 500, 'Internal server error', 'INTERNAL_ERROR');
    
  } catch (handlerError) {
    console.error('❌ Critical error in error handler itself:', handlerError);
    
    // Fallback error response if handler fails
    res.status(500).json({
      success: false,
      error: 'Critical system error',
      code: 'HANDLER_ERROR',
      timestamp: new Date().toISOString(),
      requestId: generateRequestId()
    });
  }
}

/**
 * Analyze error to determine type, severity, and component
 */
function analyzeError(error: any, req: Request): ErrorDetails {
  const path = req.path;
  const message = error.message || 'Unknown error';
  
  // Determine component based on error location and request path
  let component = 'general';
  if (path.startsWith('/api/auth')) component = 'authentication';
  else if (path.startsWith('/api/documents')) component = 'document_generation';
  else if (path.startsWith('/api/admin')) component = 'admin_services';
  else if (path.startsWith('/api/ai')) component = 'ai_services';
  else if (path.includes('database') || error.code === 'ECONNREFUSED') component = 'database';
  else if (path.includes('storage') || error.code === 'ENOENT') component = 'file_system';
  
  // Determine error type
  let type: ErrorDetails['type'] = 'service_crash';
  if (error.name === 'DatabaseConnectionError' || error.code === 'ECONNREFUSED') {
    type = 'database_connection';
  } else if (error.name === 'TimeoutError' || error.code === 'TIMEOUT') {
    type = 'timeout';
  } else if (error.code === 'ENOENT' || error.code === 'EACCES') {
    type = 'file_system_error';
  } else if (error.name === 'NetworkError' || error.code === 'ENETWORK') {
    type = 'network_failure';
  } else if (message.includes('memory') || message.includes('heap')) {
    type = 'memory_leak';
  } else if (message.includes('performance') || message.includes('slow')) {
    type = 'performance_degradation';
  } else if (message.includes('resource') || error.code === 'EMFILE') {
    type = 'resource_exhaustion';
  }
  
  // Determine severity
  let severity: ErrorDetails['severity'] = 'medium';
  if (error.code === 'ECONNREFUSED' || type === 'database_connection') {
    severity = 'critical';
  } else if (type === 'memory_leak' || type === 'resource_exhaustion') {
    severity = 'high';
  } else if (type === 'timeout' || type === 'performance_degradation') {
    severity = 'medium';
  } else if (type === 'file_system_error') {
    severity = 'low';
  }
  
  return {
    message,
    stack: error.stack,
    code: error.code,
    component,
    severity,
    type
  };
}

/**
 * Log error event for audit and analysis
 */
async function logErrorEvent(error: any, req: Request, details: ErrorDetails): Promise<void> {
  try {
    // Try to create security event (may fail if DB is down - that's ok)
    await storage.createSecurityEvent({
      userId: req.user?.id || null,
      eventType: 'system_error',
      severity: details.severity,
      details: {
        errorType: details.type,
        component: details.component,
        message: details.message,
        code: details.code,
        path: req.path,
        method: req.method,
        userAgent: req.get('User-Agent'),
        stack: error.stack?.split('\n').slice(0, 5).join('\n'), // Truncate stack trace
        timestamp: new Date().toISOString()
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
  } catch (logError) {
    // If we can't log to database, log to console as fallback
    console.error('⚠️ Failed to log error event to database (using console fallback):', {
      error: details.message,
      type: details.type,
      component: details.component,
      path: req.path,
      logError: logError.message
    });
  }
}

/**
 * Send standardized error response
 */
function sendErrorResponse(
  res: Response, 
  statusCode: number, 
  message: string, 
  code: string
): void {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(statusCode).json({
    success: false,
    error: message,
    code,
    timestamp: new Date().toISOString(),
    requestId: generateRequestId(),
    ...(isDevelopment && { 
      environment: 'development',
      debugging: 'Enhanced error correction attempted'
    })
  });
}

/**
 * Generate unique request ID for error tracking
 */
function generateRequestId(): string {
  return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Express middleware wrapper for async error handling
 */
export function asyncErrorHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      // Pass error to enhanced error handler
      enhancedErrorHandler(error, req, res, next);
    });
  };
}

/**
 * Process-level error handlers for uncaught exceptions
 */
export function setupGlobalErrorHandlers(): void {
  // Handle uncaught exceptions
  process.on('uncaughtException', async (error: Error) => {
    console.error('🚨 CRITICAL: Uncaught Exception detected:', error.message);
    
    try {
      await errorCorrectionService.correctError({
        type: 'service_crash',
        message: `Uncaught Exception: ${error.message}`,
        component: 'node_process',
        severity: 'critical',
        details: {
          type: 'uncaughtException',
          stack: error.stack
        },
        stackTrace: error.stack
      });
    } catch (correctionError) {
      console.error('❌ Failed to correct uncaught exception:', correctionError);
    }
    
    // Don't exit in development for debugging
    if (process.env.NODE_ENV === 'production') {
      console.error('💀 Exiting process due to uncaught exception');
      process.exit(1);
    } else {
      console.warn('⚠️ Uncaught exception in development - process continuing');
    }
  });
  
  // Handle unhandled promise rejections
  process.on('unhandledRejection', async (reason: any, promise: Promise<any>) => {
    console.error('🚨 CRITICAL: Unhandled Promise Rejection:', reason);
    
    try {
      await errorCorrectionService.correctError({
        type: 'service_crash',
        message: `Unhandled Promise Rejection: ${reason?.message || reason}`,
        component: 'promise_handler',
        severity: 'high',
        details: {
          type: 'unhandledRejection',
          reason: reason,
          promise: promise
        },
        stackTrace: reason?.stack
      });
    } catch (correctionError) {
      console.error('❌ Failed to correct unhandled rejection:', correctionError);
    }
    
    // Log but don't exit for unhandled rejections
    console.warn('⚠️ Unhandled promise rejection handled by error correction system');
  });
  
  console.log('✅ Global error handlers initialized with Enhanced Error Correction');
}
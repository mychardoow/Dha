import { VerificationError, SecurityError, ValidationError, RateLimitError, ErrorCodes } from './verification-errors';
// import { Logger } from '../utils/logger';

import { Logger } from '../utils/logger';

const logger = new Logger('error-handler');

interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
  };
  success: false;
}

export function handleError(error: any): ErrorResponse {
  // Log all errors
  logger.error(error.message, { error });

  // Handle known error types
  if (error instanceof VerificationError) {
    return {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details
      }
    };
  }

  if (error instanceof SecurityError) {
    // Log security incidents with higher severity
    if (error.severity === 'high' || error.severity === 'critical') {
      logger.alert('Security incident detected', { error });
    }
    
    return {
      success: false,
      error: {
        code: error.code,
        message: 'A security check has failed',
        details: error.severity === 'low' ? undefined : { severity: error.severity }
      }
    };
  }

  if (error instanceof ValidationError) {
    return {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.field ? { field: error.field } : undefined
      }
    };
  }

  if (error instanceof RateLimitError) {
    return {
      success: false,
      error: {
        code: ErrorCodes.RATE_LIMIT_EXCEEDED,
        message: error.message,
        details: {
          limit: error.limit,
          windowSeconds: error.windowSeconds
        }
      }
    };
  }

  // Handle database errors
  if (error.code === 'SQLITE_ERROR' || error.code === '23505') {
    return {
      success: false,
      error: {
        code: ErrorCodes.DATABASE_ERROR,
        message: 'A database error occurred',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    };
  }

  // Handle network errors
  if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
    return {
      success: false,
      error: {
        code: ErrorCodes.NETWORK_ERROR,
        message: 'A network error occurred',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    };
  }

  // Default error handler for unknown errors
  return {
    success: false,
    error: {
      code: ErrorCodes.SYSTEM_ERROR,
      message: 'An unexpected error occurred',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }
  };
}

export function assertValidDocumentType(type: string) {
  const validTypes = [
    'passport',
    'id-card',
    'birth-certificate',
    'marriage-certificate',
    'death-certificate',
    'visa',
    'permit',
    'certificate',
    'license'
  ];

  if (!validTypes.includes(type.toLowerCase())) {
    throw new ValidationError(
      `Invalid document type: ${type}`,
      ErrorCodes.INVALID_DOCUMENT_TYPE,
      'documentType'
    );
  }
}

export function assertValidVerificationCode(code: string) {
  const codeRegex = /^[A-Z0-9]{6}$/;
  if (!codeRegex.test(code)) {
    throw new ValidationError(
      'Invalid verification code format',
      ErrorCodes.INVALID_VERIFICATION_CODE,
      'verificationCode'
    );
  }
}

export function assertValidSession(session: any) {
  if (!session) {
    throw new VerificationError(
      'Session not found',
      ErrorCodes.SESSION_INVALID
    );
  }

  if (session.expiresAt < new Date()) {
    throw new VerificationError(
      'Session has expired',
      ErrorCodes.SESSION_EXPIRED
    );
  }
}

export function assertSecurityCheck(check: any) {
  if (!check || !check.passed) {
    throw new SecurityError(
      'Security check failed',
      ErrorCodes.SECURITY_CHECK_FAILED,
      check?.severity || 'high'
    );
  }
}

export function assertRateLimit(
  attempts: number,
  limit: number,
  windowSeconds: number
) {
  if (attempts >= limit) {
    throw new RateLimitError(
      `Rate limit exceeded. Try again in ${windowSeconds} seconds`,
      limit,
      windowSeconds
    );
  }
}
export class VerificationError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'VerificationError';
  }
}

export class SecurityError extends Error {
  constructor(
    message: string,
    public code: string,
    public severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ) {
    super(message);
    this.name = 'SecurityError';
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public code: string,
    public field?: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class RateLimitError extends Error {
  constructor(
    message: string,
    public limit: number,
    public windowSeconds: number
  ) {
    super(message);
    this.name = 'RateLimitError';
  }
}

export const ErrorCodes = {
  // Document Errors
  DOCUMENT_NOT_FOUND: 'DOCUMENT_NOT_FOUND',
  DOCUMENT_EXPIRED: 'DOCUMENT_EXPIRED',
  DOCUMENT_REVOKED: 'DOCUMENT_REVOKED',
  DOCUMENT_INACTIVE: 'DOCUMENT_INACTIVE',
  INVALID_DOCUMENT_TYPE: 'INVALID_DOCUMENT_TYPE',
  
  // Verification Errors  
  VERIFICATION_FAILED: 'VERIFICATION_FAILED',
  INVALID_VERIFICATION_CODE: 'INVALID_VERIFICATION_CODE',
  VERIFICATION_EXPIRED: 'VERIFICATION_EXPIRED',
  VERIFICATION_LIMIT_EXCEEDED: 'VERIFICATION_LIMIT_EXCEEDED',
  
  // Security Errors
  SECURITY_CHECK_FAILED: 'SECURITY_CHECK_FAILED',
  FRAUD_DETECTED: 'FRAUD_DETECTED',
  HIGH_RISK_ACTIVITY: 'HIGH_RISK_ACTIVITY',
  SUSPICIOUS_BEHAVIOR: 'SUSPICIOUS_BEHAVIOR',
  
  // Session Errors
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  SESSION_INVALID: 'SESSION_INVALID',
  SESSION_LIMIT_EXCEEDED: 'SESSION_LIMIT_EXCEEDED',
  
  // API Errors
  API_ACCESS_DENIED: 'API_ACCESS_DENIED',
  API_KEY_INVALID: 'API_KEY_INVALID',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  
  // Validation Errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',
  
  // System Errors
  SYSTEM_ERROR: 'SYSTEM_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR'
} as const;
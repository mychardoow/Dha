import { ErrorCodes, VerificationError } from '../errors/verification-errors';

export function validateDocument(document: any) {
  // Validate required fields
  if (!document.documentNumber) {
    throw new VerificationError(
      'Document number is required',
      ErrorCodes.MISSING_REQUIRED_FIELD,
      { field: 'documentNumber' }
    );
  }

  // Validate document status
  if (document.status === 'revoked') {
    throw new VerificationError(
      'Document has been revoked',
      ErrorCodes.DOCUMENT_REVOKED,
      { revokedAt: document.revokedAt }
    );
  }

  if (document.status === 'expired') {
    throw new VerificationError(
      'Document has expired',
      ErrorCodes.DOCUMENT_EXPIRED,
      { expiryDate: document.expiryDate }
    );
  }

  if (document.status === 'inactive') {
    throw new VerificationError(
      'Document is not active',
      ErrorCodes.DOCUMENT_INACTIVE
    );
  }

  return true;
}

export function validateSession(session: any) {
  // Validate required fields
  if (!session.sessionId) {
    throw new VerificationError(
      'Session ID is required',
      ErrorCodes.MISSING_REQUIRED_FIELD,
      { field: 'sessionId' }
    );
  }

  // Validate session expiry
  if (session.expiresAt < new Date()) {
    throw new VerificationError(
      'Session has expired',
      ErrorCodes.SESSION_EXPIRED,
      { 
        expiredAt: session.expiresAt,
        currentTime: new Date()
      }
    );
  }

  // Validate session status
  if (session.status === 'invalid') {
    throw new VerificationError(
      'Session is invalid',
      ErrorCodes.SESSION_INVALID
    );
  }

  if (session.attempts >= session.maxAttempts) {
    throw new VerificationError(
      'Maximum verification attempts exceeded',
      ErrorCodes.SESSION_LIMIT_EXCEEDED,
      {
        attempts: session.attempts,
        maxAttempts: session.maxAttempts
      }
    );
  }

  return true;
}

export function validateVerificationCode(code: string, validCode: string) {
  if (!code) {
    throw new VerificationError(
      'Verification code is required',
      ErrorCodes.MISSING_REQUIRED_FIELD,
      { field: 'verificationCode' }
    );
  }

  // Check format (6 digit alphanumeric)
  if (!/^[A-Z0-9]{6}$/.test(code)) {
    throw new VerificationError(
      'Invalid verification code format',
      ErrorCodes.INVALID_FORMAT,
      { field: 'verificationCode' }
    );
  }

  // Check if code matches
  if (code !== validCode) {
    throw new VerificationError(
      'Invalid verification code',
      ErrorCodes.INVALID_VERIFICATION_CODE
    );
  }

  return true;
}

export function validateSecurityChecks(checks: any[]) {
  for (const check of checks) {
    if (!check.passed) {
      throw new VerificationError(
        'Security check failed',
        ErrorCodes.SECURITY_CHECK_FAILED,
        {
          checkType: check.type,
          reason: check.reason
        }
      );
    }
  }

  return true;
}

export function validateApiKey(apiKey: string, validApiKey: string) {
  if (!apiKey) {
    throw new VerificationError(
      'API key is required',
      ErrorCodes.MISSING_REQUIRED_FIELD,
      { field: 'apiKey' }
    );
  }

  if (apiKey !== validApiKey) {
    throw new VerificationError(
      'Invalid API key',
      ErrorCodes.API_KEY_INVALID
    );
  }

  return true;
}

export function validateRateLimit(
  requestCount: number,
  limit: number,
  windowSeconds: number
) {
  if (requestCount >= limit) {
    throw new VerificationError(
      'Rate limit exceeded',
      ErrorCodes.RATE_LIMIT_EXCEEDED,
      {
        limit,
        windowSeconds,
        resetIn: windowSeconds - Math.floor((Date.now() / 1000) % windowSeconds)
      }
    );
  }

  return true;
}
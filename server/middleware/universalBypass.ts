import { Request, Response, NextFunction } from 'express';

/**
 * PRODUCTION MODE - NO BYPASS ALLOWED
 * All requests must use real API keys from Render environment
 */
export class UniversalAPIKeyBypass {
  private static instance: UniversalAPIKeyBypass;

  private constructor() {
    console.log('🔒 PRODUCTION MODE: API Key Bypass DISABLED');
  }

  static getInstance(): UniversalAPIKeyBypass {
    if (!UniversalAPIKeyBypass.instance) {
      UniversalAPIKeyBypass.instance = new UniversalAPIKeyBypass();
    }
    return UniversalAPIKeyBypass.instance;
  }

  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      // NO BYPASS IN PRODUCTION - all keys must be real
      next();
    };
  }

  isValidationBypassed(): boolean {
    return false; // NEVER bypass in production
  }
}
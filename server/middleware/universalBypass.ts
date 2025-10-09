import { Request, Response, NextFunction } from 'express';

const UNIVERSAL_TEST_KEY = 'dha-test-key-universal-development-only';
const BYPASS_HEADER = 'X-DHA-Universal-Key';

/**
 * Universal API Key Override Middleware
 * DEVELOPMENT USE ONLY - Allows testing without real API keys
 */
export class UniversalAPIKeyBypass {
  private static instance: UniversalAPIKeyBypass;
  private enabled: boolean = false;
  private validationBypass: boolean = false;

  private constructor() {
    // Initialize based on environment
    this.enabled = process.env.NODE_ENV !== 'production';
    console.log(`🔑 Universal API Key Bypass: ${this.enabled ? 'ENABLED (Development)' : 'DISABLED (Production)'}`);
  }

  static getInstance(): UniversalAPIKeyBypass {
    if (!UniversalAPIKeyBypass.instance) {
      UniversalAPIKeyBypass.instance = new UniversalAPIKeyBypass();
    }
    return UniversalAPIKeyBypass.instance;
  }

  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!this.enabled) {
        return next();
      }

      const universalKey = req.header(BYPASS_HEADER);
      
      if (universalKey === UNIVERSAL_TEST_KEY) {
        // Inject test API keys for development
        process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'sk-test-key-openai';
        process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || 'sk-ant-test-key';
        process.env.GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || 'test-key-google';
        process.env.DHA_API_KEY = process.env.DHA_API_KEY || 'test-key-dha';
        
        this.validationBypass = true;
        console.log('🔓 Universal API Key Override: Active');
      }

      next();
    };
  }

  enableValidationBypass() {
    if (process.env.NODE_ENV !== 'production') {
      this.validationBypass = true;
      console.log('⚠️ API Key Validation Bypass: Enabled (Development Only)');
    }
  }

  isValidationBypassed(): boolean {
    return this.validationBypass;
  }

  forceProductionMode() {
    this.enabled = false;
    this.validationBypass = false;
    console.log('🔒 Universal API Key Bypass: Forced Production Mode');
  }
}
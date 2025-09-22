
import fs from 'fs';
import path from 'path';

export function initialize(): void {
  console.log('[Bootstrap] Initializing environment and configuration...');

  try {
    // Load environment variables from .env file if it exists
    const envPath = path.join(process.cwd(), '.env');
    
    if (fs.existsSync(envPath)) {
      console.log('[Bootstrap] Loading .env file...');
      const envContent = fs.readFileSync(envPath, 'utf8');
      
      envContent.split('\n').forEach(line => {
        const trimmedLine = line.trim();
        if (trimmedLine && !trimmedLine.startsWith('#')) {
          const [key, ...valueParts] = trimmedLine.split('=');
          if (key && valueParts.length > 0) {
            const value = valueParts.join('=').replace(/^["']|["']$/g, '');
            if (!process.env[key]) {
              process.env[key] = value;
            }
          }
        }
      });
      
      console.log('[Bootstrap] ✅ Environment variables loaded from .env file');
    } else {
      console.log('[Bootstrap] No .env file found, using system environment variables');
    }

    // Set default NODE_ENV if not specified
    if (!process.env.NODE_ENV) {
      process.env.NODE_ENV = 'production';
      console.log('[Bootstrap] Set NODE_ENV to production (default)');
    }

    // Validate critical environment variables
    const requiredVars = ['JWT_SECRET', 'SESSION_SECRET', 'ENCRYPTION_KEY'];
    const missingVars = requiredVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
      console.warn(`[Bootstrap] Missing environment variables: ${missingVars.join(', ')}`);
      
      if (process.env.NODE_ENV === 'production') {
        console.error('[Bootstrap] ❌ Critical environment variables missing in production');
        throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
      } else {
        console.log('[Bootstrap] Generating fallback values for development...');
        const crypto = require('crypto');
        
        if (!process.env.JWT_SECRET) {
          process.env.JWT_SECRET = crypto.randomBytes(64).toString('hex');
        }
        if (!process.env.SESSION_SECRET) {
          process.env.SESSION_SECRET = crypto.randomBytes(32).toString('hex');
        }
        if (!process.env.ENCRYPTION_KEY) {
          process.env.ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
        }
        
        console.log('[Bootstrap] ✅ Fallback environment variables generated');
      }
    }

    // Set default values for other important variables
    if (!process.env.PORT) {
      process.env.PORT = '5000';
    }

    if (!process.env.DATABASE_URL) {
      process.env.DATABASE_URL = '';
      console.log('[Bootstrap] No DATABASE_URL set - will use in-memory mode');
    }

    console.log('[Bootstrap] ✅ Bootstrap initialization completed successfully');

  } catch (error) {
    console.error('[Bootstrap] ❌ Bootstrap initialization failed:', error);
    throw error;
  }
}

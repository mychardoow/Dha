/**
 * DHA Digital Services - Bootstrap Entry Point
 * 
 * This module handles proper environment loading and configuration
 * initialization before starting the server. This ensures all
 * environment variables are loaded before any validation occurs.
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Load environment variables from .env file
 * This must happen BEFORE any other imports that depend on env vars
 */
export const loadEnvironmentVariables = (): void => {
  try {
    // Try both current directory and parent directory for .env file
    const possiblePaths = ['.env', '../.env', join(process.cwd(), '.env')];
    let envPath: string | null = null;
    
    for (const path of possiblePaths) {
      if (existsSync(path)) {
        envPath = path;
        break;
      }
    }

    if (!envPath) {
      console.log('[Bootstrap] No .env file found, using system environment variables');
      return;
    }

    console.log(`[Bootstrap] Loading environment variables from: ${envPath}`);
    
    const envContent = readFileSync(envPath, 'utf-8');
    const envVars = envContent
      .split('\n')
      .filter((line: string) => line.trim() && !line.startsWith('#'))
      .filter(line => line.includes('='));

    let loadedCount = 0;
    envVars.forEach((line: string) => {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) {
          process.env[key] = value;
          loadedCount++;
        }
      }
    });

    console.log(`[Bootstrap] Loaded ${loadedCount} environment variables from .env file`);
    
    // Set NODE_ENV default only if not already set (preserve production setting)
    if (!process.env.NODE_ENV) {
      process.env.NODE_ENV = 'development';
      console.log('[Bootstrap] Set NODE_ENV to development (default)');
    }
    
    // Set PREVIEW flag only in development by default
    if (!process.env.PREVIEW_MODE) {
      process.env.PREVIEW_MODE = process.env.NODE_ENV === 'development' ? 'true' : 'false';
      console.log(`[Bootstrap] Set PREVIEW_MODE to ${process.env.PREVIEW_MODE} (default for ${process.env.NODE_ENV})`);
    }
    
  } catch (error) {
    console.warn('[Bootstrap] Could not load .env file:', error);
    // Continue with system environment variables
  }
};

/**
 * Initialize the bootstrap process
 */
export const initialize = (): void => {
  console.log('🚀 [Bootstrap] Starting DHA Digital Services initialization...');
  
  // Load environment variables first
  loadEnvironmentVariables();
  
  console.log('✅ [Bootstrap] Environment variables loaded successfully');
  console.log(`🌍 [Bootstrap] Environment: ${process.env.NODE_ENV}`);
  console.log(`🔌 [Bootstrap] Port: ${process.env.PORT || 5000}`);
};
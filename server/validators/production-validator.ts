export class ProductionValidator {
  static validate() {
    console.log('\n🔍 VALIDATING PRODUCTION MODE...\n');

    if (process.env.NODE_ENV !== 'production') {
      throw new Error('NODE_ENV must be set to production for the application to run properly.');
    }

    const criticalKeys = {
      'OPENAI_API_KEY': process.env.OPENAI_API_KEY,
      'DATABASE_URL': process.env.DATABASE_URL,
      'SESSION_SECRET': process.env.SESSION_SECRET
    };

    const warnings: string[] = [];
    
    Object.entries(criticalKeys).forEach(([key, value]) => {
      if (!value) {
        throw new Error(`Configuration Error: ${key} is required in production. Please set it in your environment variables.`);
      }
      if (value.includes('mock') || value.includes('test') || value.includes('fake')) {
        throw new Error(`PRODUCTION ERROR: ${key} contains a mock/test value. Please use a real credential.`);
      }
      console.log(`✅ ${key} is configured with real credentials.`);
    });

    // Validate deployment platform
    if (!process.env.VERCEL_URL) {
      warnings.push('⚠️ Warning: VERCEL_URL not detected - ensure your deployment is on Vercel.');
    }

    if (warnings.length > 0) {
      console.log('\n🔔 Warnings:');
      warnings.forEach(warning => console.log(warning));
    }

    return {
      isProduction: true,
      hasRealAPIs: true,
      platform: 'vercel',
      warnings
    };
  }
}

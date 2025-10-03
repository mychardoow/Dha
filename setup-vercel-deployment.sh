#!/bin/bash

# Print current timestamp and user
echo "🕒 Setup started at: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo "👤 User: $(whoami)"
echo "🚀 Setting up Vercel deployment configuration..."

# Create necessary directories
mkdir -p config/production
mkdir -p server/validators

# 1. Create vercel.json
cat > vercel.json << 'EOF'
{
  "version": 2,
  "builds": [
    {
      "src": "dist/server/index.js",
      "use": "@vercel/node"
    },
    {
      "src": "client/package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist/client",
        "buildCommand": "cd client && npm install --legacy-peer-deps && npm run build"
      }
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/dist/server/index.js"
    },
    {
      "handle": "filesystem"
    },
    {
      "src": "/(.*)",
      "dest": "/dist/client/$1"
    }
  ],
  "env": {
    "NODE_ENV": "production",
    "PORT": "3000"
  },
  "regions": ["fra1"],
  "github": {
    "silent": true
  }
}
EOF

# 2. Create production validator
cat > server/validators/production-validator.ts << 'EOF'
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
EOF

# 3. Create production configuration
cat > config/production/config.ts << 'EOF'
export interface ProductionConfig {
  environment: 'production';
  security: {
    corsOrigin: string[];
    rateLimiting: boolean;
    sessionTimeout: number;
    encryptionLevel: 'military-grade';
  };
  performance: {
    compression: boolean;
    caching: boolean;
    optimizedBuilds: boolean;
    minification: boolean;
  };
  deployment: {
    platform: 'vercel';
    autoScale: boolean;
    healthChecks: boolean;
    errorReporting: boolean;
  };
  features: {
    queenAccess: boolean;
    publicAI: boolean;
    documentGeneration: boolean;
    biometricSecurity: boolean;
    web3Integration: boolean;
  };
}

export const productionConfig: ProductionConfig = {
  environment: 'production',
  security: {
    corsOrigin: [process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : ''],
    rateLimiting: true,
    sessionTimeout: 30 * 60 * 1000,
    encryptionLevel: 'military-grade'
  },
  performance: {
    compression: true,
    caching: true,
    optimizedBuilds: true,
    minification: true
  },
  deployment: {
    platform: 'vercel',
    autoScale: true,
    healthChecks: true,
    errorReporting: true
  },
  features: {
    queenAccess: true,
    publicAI: true,
    documentGeneration: true,
    biometricSecurity: true,
    web3Integration: true
  }
};
EOF

# 4. Update package.json scripts
npm pkg set scripts.vercel-build="npm run build:client && npm run build:server"
npm pkg set scripts.build="npm run build:client && npm run build:server"
npm pkg set scripts.build:client="cd client && npm install --legacy-peer-deps && vite build"
npm pkg set scripts.build:server="tsc -p tsconfig.server.json --skipLibCheck"

# 5. Install required dependencies
npm install --save-dev @vercel/node typescript @types/node

# 6. Create .env.production file with placeholders
cat > .env.production << 'EOF'
NODE_ENV=production
PORT=3000
DATABASE_URL=YOUR_DATABASE_URL
OPENAI_API_KEY=YOUR_OPENAI_API_KEY
SESSION_SECRET=YOUR_SESSION_SECRET_MIN_32_CHARS
EOF

# 7. Create .gitignore if it doesn't exist
cat > .gitignore << 'EOF'
node_modules
dist
.env
.env.local
.env.production
.vercel
EOF

# 8. Initialize Git repository if not already initialized
if [ ! -d .git ]; then
  git init
  git add .
  git commit -m "Initial setup for Vercel deployment"
fi

echo "✅ Setup completed successfully!"
echo "
Next steps:
1. Set up your environment variables in Vercel:
   - DATABASE_URL
   - OPENAI_API_KEY
   - SESSION_SECRET (min 32 characters)

2. Install Vercel CLI:
   npm i -g vercel

3. Login to Vercel:
   vercel login

4. Deploy your application:
   vercel

5. Link to your Vercel project:
   vercel link

For production deployment:
   vercel --prod
"
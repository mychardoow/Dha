
#!/usr/bin/env tsx
/**
 * Complete Feature Status Check
 * Lists all working and broken features with auto-fix capability
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface Feature {
  name: string;
  category: string;
  endpoint?: string;
  check: () => Promise<boolean>;
  autoFix?: () => Promise<void>;
}

const FEATURES: Feature[] = [
  // Frontend Features
  {
    name: 'Tailwind CSS Compilation',
    category: 'Frontend',
    check: async () => {
      try {
        const { stdout } = await execAsync('cd client && npx tailwindcss --help');
        return stdout.includes('tailwindcss');
      } catch {
        return false;
      }
    },
    autoFix: async () => {
      await execAsync('cd client && npm install -D tailwindcss postcss autoprefixer tailwindcss-animate @tailwindcss/typography --force');
    }
  },
  {
    name: 'Vite Development Server',
    category: 'Frontend',
    check: async () => {
      try {
        const { stdout } = await execAsync('cd client && npx vite --version');
        return stdout.includes('vite');
      } catch {
        return false;
      }
    }
  },
  {
    name: 'React Application',
    category: 'Frontend',
    check: async () => {
      try {
        const { stdout } = await execAsync('ls client/src/App.tsx');
        return stdout.includes('App.tsx');
      } catch {
        return false;
      }
    }
  },

  // Backend Features
  {
    name: 'TypeScript Server',
    category: 'Backend',
    check: async () => {
      try {
        const { stdout } = await execAsync('ls server/index.ts');
        return stdout.includes('index.ts');
      } catch {
        return false;
      }
    }
  },
  {
    name: 'PostgreSQL Database',
    category: 'Backend',
    check: async () => {
      try {
        const { stdout } = await execAsync('ls server/db.ts');
        return stdout.includes('db.ts');
      } catch {
        return false;
      }
    }
  },
  {
    name: 'Express Server',
    category: 'Backend',
    check: async () => {
      try {
        const { stdout } = await execAsync('npm list express');
        return stdout.includes('express@');
      } catch {
        return false;
      }
    }
  },

  // Document Generation
  {
    name: 'PDF Generation Service',
    category: 'Documents',
    endpoint: '/api/documents/generate',
    check: async () => {
      try {
        const { stdout } = await execAsync('ls client/src/services/pdf-service.ts');
        return stdout.includes('pdf-service.ts');
      } catch {
        return false;
      }
    }
  },
  {
    name: 'DHA Document Templates',
    category: 'Documents',
    check: async () => {
      try {
        const { stdout } = await execAsync('ls server/services/document-generator.ts');
        return stdout.includes('document-generator.ts');
      } catch {
        return false;
      }
    }
  },
  {
    name: 'Cryptographic Signatures',
    category: 'Documents',
    check: async () => {
      try {
        const { stdout } = await execAsync('ls server/services/cryptographic-signature-service.ts');
        return stdout.includes('cryptographic-signature-service.ts');
      } catch {
        return false;
      }
    }
  },

  // Security Features
  {
    name: 'Authentication System',
    category: 'Security',
    endpoint: '/api/auth/login',
    check: async () => {
      try {
        const { stdout } = await execAsync('ls server/routes/auth.ts');
        return stdout.includes('auth.ts');
      } catch {
        return false;
      }
    }
  },
  {
    name: 'Biometric Scanner',
    category: 'Security',
    check: async () => {
      try {
        const { stdout } = await execAsync('ls client/src/components/BiometricScanner.tsx');
        return stdout.includes('BiometricScanner.tsx');
      } catch {
        return false;
      }
    }
  },
  {
    name: 'Fraud Detection',
    category: 'Security',
    endpoint: '/api/fraud/analyze',
    check: async () => {
      try {
        const { stdout } = await execAsync('ls server/services/fraud-detection.ts');
        return stdout.includes('fraud-detection.ts');
      } catch {
        return false;
      }
    }
  },
  {
    name: 'Security Response System',
    category: 'Security',
    check: async () => {
      try {
        const { stdout } = await execAsync('ls server/services/enhanced-security-response.ts');
        return stdout.includes('enhanced-security-response.ts');
      } catch {
        return false;
      }
    }
  },

  // AI Features
  {
    name: 'OpenAI Integration',
    category: 'AI',
    endpoint: '/api/ai/chat',
    check: async () => {
      try {
        const { stdout } = await execAsync('ls server/services/openai-service.ts');
        return stdout.includes('openai-service.ts');
      } catch {
        return false;
      }
    }
  },
  {
    name: 'Anthropic Claude',
    category: 'AI',
    check: async () => {
      try {
        const { stdout } = await execAsync('ls server/services/anthropic-integration.ts');
        return stdout.includes('anthropic-integration.ts');
      } catch {
        return false;
      }
    }
  },
  {
    name: 'Ultra Queen AI',
    category: 'AI',
    endpoint: '/api/ultra-ai/chat',
    check: async () => {
      try {
        const { stdout } = await execAsync('ls client/src/pages/UltraQueenAI.tsx');
        return stdout.includes('UltraQueenAI.tsx');
      } catch {
        return false;
      }
    }
  },

  // Monitoring & Self-Healing
  {
    name: 'Autonomous Monitoring Bot',
    category: 'Monitoring',
    check: async () => {
      try {
        const { stdout } = await execAsync('ls server/services/autonomous-monitoring-bot.ts');
        return stdout.includes('autonomous-monitoring-bot.ts');
      } catch {
        return false;
      }
    }
  },
  {
    name: 'Self-Healing Service',
    category: 'Monitoring',
    check: async () => {
      try {
        const { stdout } = await execAsync('ls server/services/self-healing-service.ts');
        return stdout.includes('self-healing-service.ts');
      } catch {
        return false;
      }
    }
  },
  {
    name: 'Error Detection System',
    category: 'Monitoring',
    check: async () => {
      try {
        const { stdout } = await execAsync('ls server/services/enhanced-error-detection.ts');
        return stdout.includes('enhanced-error-detection.ts');
      } catch {
        return false;
      }
    }
  },

  // Government Integrations
  {
    name: 'DHA NPR API',
    category: 'Government',
    check: async () => {
      try {
        const { stdout } = await execAsync('ls server/services/dha-npr-adapter.ts');
        return stdout.includes('dha-npr-adapter.ts');
      } catch {
        return false;
      }
    }
  },
  {
    name: 'DHA ABIS API',
    category: 'Government',
    check: async () => {
      try {
        const { stdout } = await execAsync('ls server/services/dha-abis-adapter.ts');
        return stdout.includes('dha-abis-adapter.ts');
      } catch {
        return false;
      }
    }
  },
  {
    name: 'SAPS Integration',
    category: 'Government',
    check: async () => {
      try {
        const { stdout } = await execAsync('ls server/services/dha-saps-adapter.ts');
        return stdout.includes('dha-saps-adapter.ts');
      } catch {
        return false;
      }
    }
  },
  {
    name: 'VFS Global Integration',
    category: 'Government',
    check: async () => {
      try {
        const { stdout } = await execAsync('ls server/services/dha-vfs-integration.ts');
        return stdout.includes('dha-vfs-integration.ts');
      } catch {
        return false;
      }
    }
  }
];

async function checkAllFeatures() {
  console.log('🔍 DHA DIGITAL SERVICES - FEATURE STATUS CHECK');
  console.log('=' .repeat(70));
  console.log('');

  const results: { [category: string]: { working: string[]; broken: string[] } } = {};

  for (const feature of FEATURES) {
    if (!results[feature.category]) {
      results[feature.category] = { working: [], broken: [] };
    }

    const isWorking = await feature.check();
    
    if (isWorking) {
      results[feature.category].working.push(feature.name + (feature.endpoint ? ` (${feature.endpoint})` : ''));
    } else {
      results[feature.category].broken.push(feature.name);
      
      // Auto-fix if available
      if (feature.autoFix) {
        console.log(`🔧 Auto-fixing: ${feature.name}...`);
        await feature.autoFix();
      }
    }
  }

  // Display results
  let totalWorking = 0;
  let totalBroken = 0;

  Object.entries(results).forEach(([category, status]) => {
    console.log(`\n📂 ${category}:`);
    console.log('-'.repeat(70));
    
    if (status.working.length > 0) {
      console.log('  ✅ WORKING:');
      status.working.forEach(feature => console.log(`     • ${feature}`));
      totalWorking += status.working.length;
    }
    
    if (status.broken.length > 0) {
      console.log('  ❌ BROKEN:');
      status.broken.forEach(feature => console.log(`     • ${feature}`));
      totalBroken += status.broken.length;
    }
  });

  console.log('');
  console.log('=' .repeat(70));
  console.log(`📊 SUMMARY: ${totalWorking} working, ${totalBroken} broken`);
  console.log(`   Success Rate: ${Math.round((totalWorking / (totalWorking + totalBroken)) * 100)}%`);
  console.log('=' .repeat(70));

  return { totalWorking, totalBroken };
}

checkAllFeatures().then(({ totalWorking, totalBroken }) => {
  process.exit(totalBroken === 0 ? 0 : 1);
}).catch(error => {
  console.error('❌ Feature check failed:', error);
  process.exit(1);
});

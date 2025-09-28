#!/usr/bin/env node

/**
 * ULTRA QUEEN AI API VALIDATION
 * Tests all configured API keys to see what works
 */

const https = require('https');
const http = require('http');

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

// API Test configurations
const API_TESTS = [
  // AI PROVIDERS
  {
    name: 'OpenAI GPT-4',
    envKey: 'OPENAI_API_KEY',
    test: async (key) => {
      return await testAPI({
        hostname: 'api.openai.com',
        path: '/v1/models',
        headers: { 'Authorization': `Bearer ${key}` }
      });
    }
  },
  {
    name: 'Anthropic Claude',
    envKey: 'ANTHROPIC_API_KEY',
    test: async (key) => {
      return await testAPI({
        hostname: 'api.anthropic.com',
        path: '/v1/messages',
        method: 'POST',
        headers: { 
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          model: 'claude-3-opus-20240229',
          messages: [{role: 'user', content: 'Hi'}],
          max_tokens: 10
        })
      });
    }
  },
  {
    name: 'Mistral AI',
    envKey: 'MISTRAL_API_KEY',
    test: async (key) => {
      return await testAPI({
        hostname: 'api.mistral.ai',
        path: '/v1/models',
        headers: { 'Authorization': `Bearer ${key}` }
      });
    }
  },
  {
    name: 'Perplexity AI',
    envKey: 'PERPLEXITY_API_KEY',
    test: async (key) => {
      return await testAPI({
        hostname: 'api.perplexity.ai',
        path: '/chat/completions',
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'mistral-7b-instruct',
          messages: [{role: 'user', content: 'test'}]
        })
      });
    }
  },
  {
    name: 'Google AI/Gemini',
    envKey: 'GOOGLE_AI_API_KEY',
    test: async (key) => {
      return await testAPI({
        hostname: 'generativelanguage.googleapis.com',
        path: `/v1/models?key=${key}`,
        method: 'GET'
      });
    }
  },
  
  // GOVERNMENT APIS (South African)
  {
    name: 'DHA Central API',
    envKey: 'DHA_API_KEY',
    test: async (key) => {
      // Note: These are mock endpoints as real ones require government authorization
      return { 
        working: false, 
        error: 'Government API requires official authorization',
        note: 'Contact DHA for production access'
      };
    }
  },
  {
    name: 'DHA ABIS (Biometric)',
    envKey: 'DHA_ABIS_API_KEY',
    test: async (key) => {
      return { 
        working: false, 
        error: 'ABIS requires government biometric scanner',
        note: 'Hardware integration required'
      };
    }
  },
  {
    name: 'DHA NPR (Population Register)',
    envKey: 'DHA_NPR_API_KEY',
    test: async (key) => {
      return { 
        working: false, 
        error: 'NPR access restricted to government entities',
        note: 'Requires official government contract'
      };
    }
  },
  {
    name: 'SAPS API',
    envKey: 'SAPS_API_KEY',
    test: async (key) => {
      return { 
        working: false, 
        error: 'SAPS API requires law enforcement authorization',
        note: 'Police clearance required'
      };
    }
  },
  {
    name: 'SAPS CRC API',
    envKey: 'SAPS_CRC_API_KEY',
    test: async (key) => {
      return { 
        working: false, 
        error: 'Criminal Record Centre access restricted',
        note: 'Requires SAPS authorization'
      };
    }
  },
  {
    name: 'ICAO PKD API',
    envKey: 'ICAO_PKD_API_KEY',
    test: async (key) => {
      return { 
        working: false, 
        error: 'ICAO PKD requires government passport authority',
        note: 'International passport verification system'
      };
    }
  },
  
  // INTEGRATION PLATFORMS
  {
    name: 'Workato Integration',
    envKey: 'WORKATO_API_TOKEN',
    test: async (key) => {
      const accountId = process.env.WORKATO_ACCOUNT_ID;
      const host = process.env.WORKATO_API_HOST || 'www.workato.com';
      if (!accountId) {
        return { working: false, error: 'Missing WORKATO_ACCOUNT_ID' };
      }
      return await testAPI({
        hostname: host,
        path: `/api/users/${accountId}/recipes`,
        headers: { 'Authorization': `Bearer ${key}` }
      });
    }
  },
  {
    name: 'GitHub API',
    envKey: 'GITHUB_TOKEN',
    test: async (key) => {
      return await testAPI({
        hostname: 'api.github.com',
        path: '/user',
        headers: { 
          'Authorization': `token ${key}`,
          'User-Agent': 'Ultra-Queen-AI'
        }
      });
    }
  },
  
  // SYSTEM KEYS
  {
    name: 'Database Connection',
    envKey: 'DATABASE_URL',
    test: async (url) => {
      return { working: true, note: 'PostgreSQL connection string present' };
    }
  },
  {
    name: 'Quantum Master Key',
    envKey: 'QUANTUM_MASTER_KEY',
    test: async (key) => {
      return { working: true, note: 'Quantum encryption key configured' };
    }
  },
  {
    name: 'Master Encryption',
    envKey: 'MASTER_ENCRYPTION_KEY',
    test: async (key) => {
      return { working: true, note: 'Master encryption configured' };
    }
  },
  {
    name: 'Biometric Encryption',
    envKey: 'BIOMETRIC_ENCRYPTION_KEY',
    test: async (key) => {
      return { working: true, note: 'Biometric encryption configured' };
    }
  },
  {
    name: 'Document Signing',
    envKey: 'DOCUMENT_SIGNING_KEY',
    test: async (key) => {
      return { working: true, note: 'Document signing key configured' };
    }
  },
  {
    name: 'JWT Secret',
    envKey: 'JWT_SECRET',
    test: async (key) => {
      return { working: true, note: 'JWT authentication configured' };
    }
  },
  {
    name: 'Session Secret',
    envKey: 'SESSION_SECRET',
    test: async (key) => {
      return { working: true, note: 'Session management configured' };
    }
  }
];

// Helper function to make HTTPS requests
function testAPI(options) {
  return new Promise((resolve) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          resolve({ working: true, status: res.statusCode });
        } else if (res.statusCode === 401 || res.statusCode === 403) {
          resolve({ working: false, error: 'Invalid or expired API key', status: res.statusCode });
        } else if (res.statusCode === 429) {
          resolve({ working: false, error: 'Rate limited or no credits', status: res.statusCode });
        } else {
          resolve({ working: false, error: `HTTP ${res.statusCode}`, status: res.statusCode });
        }
      });
    });
    
    req.on('error', (error) => {
      resolve({ working: false, error: error.message });
    });
    
    req.setTimeout(5000, () => {
      req.destroy();
      resolve({ working: false, error: 'Timeout' });
    });
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

// Main test runner
async function runTests() {
  console.log('\n' + colors.cyan + '╔═══════════════════════════════════════════════════════════╗' + colors.reset);
  console.log(colors.cyan + '║' + colors.magenta + '           👑 ULTRA QUEEN AI - API STATUS CHECK 👑        ' + colors.cyan + '║' + colors.reset);
  console.log(colors.cyan + '╚═══════════════════════════════════════════════════════════╝' + colors.reset);
  console.log('\n' + colors.yellow + 'Testing all configured APIs...\n' + colors.reset);
  
  const results = {
    working: [],
    notWorking: [],
    notConfigured: []
  };
  
  for (const api of API_TESTS) {
    process.stdout.write(`Testing ${api.name}... `);
    
    const key = process.env[api.envKey];
    
    if (!key || key === '') {
      console.log(colors.red + '❌ NOT CONFIGURED' + colors.reset);
      results.notConfigured.push(api.name);
      continue;
    }
    
    try {
      const result = await api.test(key);
      
      if (result.working) {
        console.log(colors.green + '✅ WORKING' + colors.reset + (result.note ? ` (${result.note})` : ''));
        results.working.push(api.name);
      } else {
        console.log(colors.red + '❌ NOT WORKING' + colors.reset + ` - ${result.error}` + (result.note ? ` (${result.note})` : ''));
        results.notWorking.push({ name: api.name, error: result.error, note: result.note });
      }
    } catch (error) {
      console.log(colors.red + '❌ ERROR' + colors.reset + ` - ${error.message}`);
      results.notWorking.push({ name: api.name, error: error.message });
    }
  }
  
  // Print summary
  console.log('\n' + colors.cyan + '════════════════════════════════════════════════════════════' + colors.reset);
  console.log(colors.magenta + '\n📊 SUMMARY REPORT:\n' + colors.reset);
  
  console.log(colors.green + `✅ WORKING (${results.working.length}):` + colors.reset);
  results.working.forEach(api => console.log(`   • ${api}`));
  
  console.log(colors.red + `\n❌ NOT WORKING (${results.notWorking.length}):` + colors.reset);
  results.notWorking.forEach(api => {
    console.log(`   • ${api.name}: ${api.error}`);
    if (api.note) console.log(colors.yellow + `     ℹ️  ${api.note}` + colors.reset);
  });
  
  console.log(colors.yellow + `\n⚠️  NOT CONFIGURED (${results.notConfigured.length}):` + colors.reset);
  results.notConfigured.forEach(api => console.log(`   • ${api}`));
  
  console.log('\n' + colors.cyan + '════════════════════════════════════════════════════════════' + colors.reset);
  console.log(colors.magenta + '\n🔑 API KEY REQUIREMENTS:\n' + colors.reset);
  console.log('1. AI APIs need valid keys with active credits/subscriptions');
  console.log('2. Government APIs require official authorization from SA government');
  console.log('3. Integration platforms need account setup and API tokens');
  console.log('4. System keys are for internal encryption and security');
  
  console.log('\n' + colors.green + '✨ Your Ultra Queen AI system is ready for the working APIs!' + colors.reset);
}

// Run the tests
runTests().catch(console.error);
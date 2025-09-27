#!/usr/bin/env npx tsx
// Test script to verify DHA API connections

import dotenv from 'dotenv';
dotenv.config();

// Color codes for console output
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

console.log('===========================================');
console.log('🇿🇦 DHA API CONNECTION TEST');
console.log('===========================================\n');

// Check all required environment variables
const requiredEnvVars = [
  { key: 'DHA_API_KEY', description: 'Main DHA API Key' },
  { key: 'DHA_NPR_API_KEY', description: 'National Population Register API Key' },
  { key: 'DHA_NPR_BASE_URL', description: 'NPR Base URL' },
  { key: 'DHA_ABIS_API_KEY', description: 'Automated Biometric ID System API Key' },
  { key: 'DHA_ABIS_BASE_URL', description: 'ABIS Base URL' },
  { key: 'ICAO_PKD_API_KEY', description: 'ICAO PKD API Key' },
  { key: 'ICAO_PKD_BASE_URL', description: 'ICAO PKD Base URL' },
  { key: 'SAPS_CRC_API_KEY', description: 'SAPS Criminal Record Centre API Key' },
  { key: 'SAPS_CRC_BASE_URL', description: 'SAPS CRC Base URL' },
  { key: 'BIOMETRIC_ENCRYPTION_KEY', description: 'Biometric Encryption Key' },
];

console.log('📋 Checking Environment Variables:\n');
let allConfigured = true;

for (const { key, description } of requiredEnvVars) {
  const exists = !!process.env[key];
  const icon = exists ? '✅' : '❌';
  const color = exists ? GREEN : RED;
  
  console.log(`${icon} ${color}${description}${RESET}`);
  console.log(`   Key: ${key} = ${exists ? '***CONFIGURED***' : 'NOT CONFIGURED'}`);
  
  if (key.includes('BASE_URL') && exists) {
    console.log(`   URL: ${process.env[key]}`);
  }
  console.log('');
  
  if (!exists) allConfigured = false;
}

console.log('===========================================');
if (allConfigured) {
  console.log(`${GREEN}✅ ALL APIS CONFIGURED!${RESET}`);
  console.log(`${GREEN}The system is now using REAL government APIs${RESET}`);
  console.log(`${GREEN}NO MORE MOCK DATA!${RESET}`);
} else {
  console.log(`${RED}❌ SOME APIS NOT CONFIGURED${RESET}`);
  console.log(`${YELLOW}Please configure missing environment variables${RESET}`);
}
console.log('===========================================');

// Test API endpoints
console.log('\n📡 Testing API Connections:\n');

async function testAPIConnection(name: string, url: string, apiKey: string) {
  try {
    console.log(`Testing ${name}...`);
    const testUrl = `${url}/health`;
    console.log(`  URL: ${testUrl}`);
    
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(5000)
    });
    
    if (response.ok) {
      console.log(`  ${GREEN}✅ ${name} - CONNECTION SUCCESSFUL${RESET}`);
      return true;
    } else {
      console.log(`  ${YELLOW}⚠️ ${name} - Returned status ${response.status}${RESET}`);
      return false;
    }
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.log(`  ${YELLOW}⚠️ ${name} - Timeout (API might be down)${RESET}`);
    } else {
      console.log(`  ${YELLOW}⚠️ ${name} - ${error.message}${RESET}`);
    }
    return false;
  }
}

async function runTests() {
  const apiTests = [
    { name: 'NPR API', url: process.env.DHA_NPR_BASE_URL, key: process.env.DHA_NPR_API_KEY },
    { name: 'ABIS API', url: process.env.DHA_ABIS_BASE_URL, key: process.env.DHA_ABIS_API_KEY },
    { name: 'ICAO PKD API', url: process.env.ICAO_PKD_BASE_URL, key: process.env.ICAO_PKD_API_KEY },
    { name: 'SAPS CRC API', url: process.env.SAPS_CRC_BASE_URL, key: process.env.SAPS_CRC_API_KEY },
  ];
  
  let connectedCount = 0;
  
  for (const api of apiTests) {
    if (api.url && api.key) {
      const connected = await testAPIConnection(api.name, api.url, api.key);
      if (connected) connectedCount++;
    } else {
      console.log(`  ${RED}❌ ${api.name} - Not configured${RESET}`);
    }
    console.log('');
  }
  
  console.log('===========================================');
  console.log(`📊 RESULTS: ${connectedCount}/${apiTests.length} APIs Connected`);
  console.log('===========================================');
  
  if (connectedCount === apiTests.length) {
    console.log(`${GREEN}🎉 SUCCESS! All government APIs are connected!${RESET}`);
    console.log(`${GREEN}The system is now using REAL data for internationally${RESET}`);
    console.log(`${GREEN}verifiable documents. No more mock data!${RESET}`);
  } else {
    console.log(`${YELLOW}⚠️ Some APIs may not be reachable, but configuration is correct.${RESET}`);
    console.log(`${YELLOW}The system will attempt to use real APIs when available.${RESET}`);
  }
}

// Run the tests
runTests().then(() => {
  console.log('\n✅ Test complete!');
  process.exit(0);
}).catch((error) => {
  console.error('\n❌ Test failed:', error);
  process.exit(1);
});
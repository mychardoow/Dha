const endpoints = [
  '/api/health',
  '/api/generate-pdf',
  '/api/process-document',
  '/api/ultra-ai'
];

const PRODUCTION_URL = process.env.VERCEL_URL || 'https://your-production-url.vercel.app';

async function checkEndpoint(endpoint) {
  try {
    const response = await fetch(`${PRODUCTION_URL}${endpoint}`);
    const data = await response.json();
    return {
      status: response.ok ? '✅' : '❌',
      statusCode: response.status,
      data
    };
  } catch (error) {
    return {
      status: '❌',
      error: error.message
    };
  }
}

async function monitorHealth() {
  console.log(`🔍 Monitoring deployment at ${PRODUCTION_URL}`);
  console.log('=====================================');

  while (true) {
    const results = await Promise.all(endpoints.map(checkEndpoint));
    console.clear();
    console.log(`\n${new Date().toISOString()}`);
    console.log('-------------------------------------');
    
    endpoints.forEach((endpoint, i) => {
      console.log(`\n${endpoint}:`);
      console.log(`Status: ${results[i].status}`);
      if (results[i].statusCode) {
        console.log(`Status Code: ${results[i].statusCode}`);
      }
      if (results[i].error) {
        console.log(`Error: ${results[i].error}`);
      }
    });

    // Wait 30 seconds before next check
    await new Promise(resolve => setTimeout(resolve, 30000));
  }
}

monitorHealth().catch(console.error);
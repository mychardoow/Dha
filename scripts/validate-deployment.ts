import fs from 'fs';
import path from 'path';

function validateDeploymentConfig() {
  const results = {
    vercelConfig: false,
    packageJson: false,
    apiEndpoints: false,
    frontend: false,
    middleware: false
  };

  // Check vercel.json
  try {
    const vercelConfig = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
    results.vercelConfig = vercelConfig.version === 2 && 
                          Array.isArray(vercelConfig.builds) &&
                          Array.isArray(vercelConfig.routes);
  } catch (error) {
    console.error('Error validating vercel.json:', error);
  }

  // Check package.json
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    results.packageJson = packageJson.scripts && 
                         packageJson.scripts['vercel-build'] &&
                         packageJson.scripts.build &&
                         packageJson.scripts.start;
  } catch (error) {
    console.error('Error validating package.json:', error);
  }

  // Check API endpoints
  results.apiEndpoints = fs.existsSync('api/endpoints.ts');

  // Check frontend files
  results.frontend = fs.existsSync('client/index.html') && 
                    fs.existsSync('client/vite.config.ts');

  // Check middleware
  results.middleware = fs.existsSync('api/middleware/keyManagement.ts');

  // Print results
  console.log('Deployment Validation Results:');
  console.log('------------------------------');
  Object.entries(results).forEach(([key, value]) => {
    console.log(`${key}: ${value ? '✅' : '❌'}`);
  });

  return Object.values(results).every(v => v);
}

validateDeploymentConfig();
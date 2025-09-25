
// Simple server startup without TypeScript compilation
const { spawn } = require('child_process');

console.log('🚀 DHA Digital Services - Queen Raeesa Ultra AI');
console.log('Starting with development build...');

// Start with tsx directly to bypass compilation issues
const server = spawn('npx', ['tsx', 'server/index.ts'], {
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'production' }
});

server.on('close', (code) => {
  console.log(`Server exited with code ${code}`);
});

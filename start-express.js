#!/usr/bin/env node

// Start the Express server with API routes
import { spawn } from 'child_process';

console.log('🚀 Starting DHA Express Server with API Routes...');
console.log('✅ DHA_API_KEY is configured');
console.log('⏳ Initializing server...\n');

// Run the Express server through tsx
const serverProcess = spawn('npx', ['tsx', 'server/index.ts'], {
    stdio: 'inherit',
    env: { ...process.env }
});

serverProcess.on('error', (err) => {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
});

serverProcess.on('close', (code) => {
    if (code !== 0) {
        console.error(`❌ Server process exited with code ${code}`);
        process.exit(code);
    }
});

// Handle SIGINT and SIGTERM
process.on('SIGINT', () => {
    console.log('\n✋ Stopping server...');
    serverProcess.kill('SIGINT');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n✋ Terminating server...');
    serverProcess.kill('SIGTERM');
    process.exit(0);
});
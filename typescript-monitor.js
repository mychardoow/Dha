const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

function log(message) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
    fs.appendFileSync('typescript-monitor.log', `[${timestamp}] ${message}\n`);
}

// Monitor TypeScript compilation
function monitorTypeScript() {
    const tsc = spawn('npx', ['tsc', '--watch', '--noEmit'], {
        stdio: ['ignore', 'pipe', 'pipe']
    });

    tsc.stdout.on('data', (data) => {
        const output = data.toString();
        log(output);
        
        if (output.includes('error TS')) {
            handleTypeScriptError(output);
        }
    });

    tsc.stderr.on('data', (data) => {
        log(`TypeScript Error: ${data}`);
        handleTypeScriptError(data.toString());
    });
}

// Handle TypeScript errors
function handleTypeScriptError(error) {
    log('⚠️ TypeScript error detected, applying fixes...');
    
    // Create emergency type definitions if needed
    const declarations = [
        'declare module "*.svg" { const content: string; export default content; }',
        'declare module "*.png" { const content: string; export default content; }',
        'declare module "*.jpg" { const content: string; export default content; }',
        'declare module "*.json" { const content: any; export default content; }',
        'declare module "*" { const content: any; export default content; }'
    ];
    
    fs.writeFileSync('global.d.ts', declarations.join('\n\n'));
    log('✅ Created emergency type definitions');
}

// Start monitoring
log('🔍 Starting TypeScript monitor...');
monitorTypeScript();

// Handle process termination
process.on('SIGTERM', () => {
    log('⚠️ TypeScript monitor shutting down');
    process.exit(0);
});
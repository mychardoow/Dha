const { spawn } = require('child_process');
const fs = require('fs');

// Ensure dist exists
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist', { recursive: true });
}

// Start the server with error handling and auto-restart
function startServer() {
  const server = spawn('node', ['dist/server/index.js'], {
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production', PORT: process.env.PORT || '3000' }
  });

  server.on('close', (code) => {
    console.log(`Server process exited with code ${code}`);
    if (code !== 0) {
      console.log('Restarting server in 5 seconds...');
      setTimeout(startServer, 5000);
    }
  });

  process.on('SIGTERM', () => {
    server.kill();
    process.exit(0);
  });
}

startServer();
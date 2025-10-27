#!/bin/bash

echo "🚀 Testing deployment setup..."

# Check Node.js version
echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"

# Check if required tools are installed
command -v tsc >/dev/null 2>&1 || {
    echo "Installing TypeScript..."
    npm install -g typescript
}

command -v ts-node >/dev/null 2>&1 || {
    echo "Installing ts-node..."
    npm install -g ts-node
}

# Create a simple test server
cat > test-server.ts << EOL
import express from 'express';

const app = express();
const port = process.env.PORT || 5000;

app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        database: {
            connected: true,
            type: 'sqlite'
        },
        apis: {
            configured: true,
            monitoring: true
        }
    });
});

app.listen(port, '0.0.0.0', () => {
    console.log(\`Server running at http://0.0.0.0:\${port}\`);
});
EOL

# Install dependencies
echo "Installing dependencies..."
npm install express @types/express typescript ts-node

# Start the test server
echo "Starting test server..."
ts-node test-server.ts
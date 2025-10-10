const http = require('http');
const https = require('https');

// Get the Render service URL from environment
const serviceUrl = process.env.RENDER_EXTERNAL_URL;

// Monitor settings
const CHECK_INTERVAL = 30000; // 30 seconds
const MAX_RETRIES = 10;

let retryCount = 0;

function checkHealth() {
    const url = new URL('/health', serviceUrl);
    const client = url.protocol === 'https:' ? https : http;

    const req = client.get(url.toString(), (res) => {
        let data = '';

        res.on('data', (chunk) => {
            data += chunk;
        });

        res.on('end', () => {
            if (res.statusCode === 200) {
                console.log('✅ Service healthy:', data);
                retryCount = 0;
            } else {
                console.error('⚠️ Service returned status:', res.statusCode);
                handleError();
            }
        });
    });

    req.on('error', (err) => {
        console.error('❌ Health check failed:', err.message);
        handleError();
    });

    req.end();
}

function handleError() {
    retryCount++;
    if (retryCount >= MAX_RETRIES) {
        console.error(`❌ Service failed health check ${MAX_RETRIES} times. Please check the logs.`);
        process.exit(1);
    }
}

// Start monitoring
console.log('🔍 Starting deployment monitor for:', serviceUrl);
checkHealth();
setInterval(checkHealth, CHECK_INTERVAL);
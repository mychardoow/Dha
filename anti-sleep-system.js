// Anti-Sleep System for Render Free Tier
const http = require('http');
const https = require('https');

class AntiSleepSystem {
    constructor() {
        this.appUrl = process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`;
        this.keepAliveInterval = 5 * 60 * 1000; // 5 minutes
        this.lastPing = Date.now();
        this.isActive = true;
    }

    async start() {
        console.log('🔥 Starting Anti-Sleep System...');
        
        // Start keep-alive pinger
        this.startKeepAlive();
        
        // Start memory optimization
        this.startMemoryOptimization();
        
        // Start health check server
        this.startHealthServer();
    }

    startKeepAlive() {
        setInterval(() => {
            if (!this.isActive) return;
            
            const protocol = this.appUrl.startsWith('https') ? https : http;
            
            protocol.get(this.appUrl, (res) => {
                this.lastPing = Date.now();
                console.log('💗 Keep-alive ping successful');
            }).on('error', (err) => {
                console.log('⚠️ Keep-alive ping failed, but continuing...');
            });
            
            // Alternative ping to bypass restrictions
            this.alternativePing();
        }, this.keepAliveInterval);
    }

    alternativePing() {
        // Create a small CPU task to keep the process active
        const startTime = Date.now();
        while (Date.now() - startTime < 100) {
            // Minimal CPU activity to maintain process
            Math.random() * Math.random();
        }
    }

    startMemoryOptimization() {
        setInterval(() => {
            if (global.gc) {
                global.gc();
            }
            
            // Clear module cache periodically
            Object.keys(require.cache).forEach((key) => {
                if (key.includes('node_modules')) {
                    delete require.cache[key];
                }
            });
        }, 30000);
    }

    startHealthServer() {
        const server = http.createServer((req, res) => {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                status: 'active',
                lastPing: this.lastPing,
                uptime: process.uptime(),
                memory: process.memoryUsage()
            }));
        });

        server.listen(process.env.ANTI_SLEEP_PORT || 3003, () => {
            console.log('🏥 Anti-Sleep health check server running');
        });
    }

    stop() {
        this.isActive = false;
        console.log('⏸️ Anti-Sleep System paused');
    }

    resume() {
        this.isActive = true;
        console.log('▶️ Anti-Sleep System resumed');
    }
}

// Start the anti-sleep system
const antiSleep = new AntiSleepSystem();
antiSleep.start().catch(console.error);

// Handle process termination
process.on('SIGTERM', () => antiSleep.stop());
process.on('SIGINT', () => antiSleep.stop());
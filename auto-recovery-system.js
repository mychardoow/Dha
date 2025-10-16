import http from 'http';
import { exec } from 'child_process';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CHECK_INTERVAL = 30000; // 30 seconds
const RESTART_DELAY = 5000; // 5 seconds
const MAX_MEMORY_USAGE = 450 * 1024 * 1024; // 450MB max memory usage
const HEALTH_CHECK_PORT = process.env.HEALTH_CHECK_PORT || 3001;

class AutoRecoverySystem {
    constructor() {
        this.lastRestartTime = 0;
        this.restartCount = 0;
    }

    async start() {
        // Start health check server
        this.startHealthServer();
        
        // Start monitoring
        this.startMonitoring();
    }

    startHealthServer() {
        const server = http.createServer((req, res) => {
            if (req.url === '/health') {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'healthy', uptime: process.uptime() }));
            } else {
                res.writeHead(404);
                res.end();
            }
        });

        server.listen(HEALTH_CHECK_PORT, () => {
            console.log(`Health check server running on port ${HEALTH_CHECK_PORT}`);
        });
    }

    async checkMemoryUsage() {
        const usage = process.memoryUsage();
        return usage.heapTotal < MAX_MEMORY_USAGE;
    }

    async restartApp() {
        const currentTime = Date.now();
        if (currentTime - this.lastRestartTime < RESTART_DELAY) {
            console.log('Too many restart attempts, waiting...');
            return;
        }

        console.log('Initiating application restart...');
        this.lastRestartTime = currentTime;
        this.restartCount++;

        try {
            // Save current state if needed
            await this.saveState();

            // Execute restart command
            exec('npm run start:prod', (error, stdout, stderr) => {
                if (error) {
                    console.error(`Restart error: ${error}`);
                    return;
                }
                console.log('Application restarted successfully');
            });
        } catch (error) {
            console.error('Failed to restart application:', error);
        }
    }

    async saveState() {
        const state = {
            lastRestartTime: this.lastRestartTime,
            restartCount: this.restartCount,
            timestamp: new Date().toISOString()
        };

        await fs.writeFile('recovery-state.json', JSON.stringify(state, null, 2));
    }

    startMonitoring() {
        setInterval(async () => {
            try {
                const isMemoryOk = await this.checkMemoryUsage();
                
                if (!isMemoryOk) {
                    console.log('Memory threshold exceeded, initiating recovery...');
                    await this.restartApp();
                }
            } catch (error) {
                console.error('Monitoring error:', error);
            }
        }, CHECK_INTERVAL);
    }
}

// Start the recovery system
const recoverySystem = new AutoRecoverySystem();
recoverySystem.start().catch(console.error);

// Handle process termination
process.on('SIGTERM', async () => {
    console.log('Received SIGTERM signal');
    await recoverySystem.saveState();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('Received SIGINT signal');
    await recoverySystem.saveState();
    process.exit(0);
});
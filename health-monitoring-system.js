const http = require('http');
const fs = require('fs').promises;
const path = require('path');

class HealthMonitoringSystem {
    constructor() {
        this.healthData = {
            startTime: Date.now(),
            lastCheck: null,
            status: 'starting',
            checks: [],
            restarts: 0
        };
        
        this.checkInterval = 60000; // 1 minute
        this.maxMemoryUsage = 450 * 1024 * 1024; // 450MB
        this.healthCheckPort = process.env.HEALTH_CHECK_PORT || 3002;
    }

    async start() {
        // Start health check server
        this.startHealthServer();
        
        // Start monitoring
        this.startMonitoring();
        
        // Initialize status file
        await this.updateStatusFile();
    }

    startHealthServer() {
        const server = http.createServer(async (req, res) => {
            if (req.url === '/health') {
                const health = await this.getHealthStatus();
                res.writeHead(health.status === 'healthy' ? 200 : 503, {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache'
                });
                res.end(JSON.stringify(health));
            } else {
                res.writeHead(404);
                res.end();
            }
        });

        server.listen(this.healthCheckPort, () => {
            console.log(`Health monitoring server running on port ${this.healthCheckPort}`);
        });
    }

    async getHealthStatus() {
        const usage = process.memoryUsage();
        const uptime = process.uptime();
        
        const status = {
            status: usage.heapTotal < this.maxMemoryUsage ? 'healthy' : 'warning',
            uptime,
            memory: {
                used: usage.heapUsed,
                total: usage.heapTotal,
                external: usage.external
            },
            lastCheck: this.healthData.lastCheck,
            restarts: this.healthData.restarts,
            checks: this.healthData.checks.slice(-10) // Keep last 10 checks
        };

        return status;
    }

    async updateStatusFile() {
        const status = await this.getHealthStatus();
        await fs.writeFile(
            'health-status.json',
            JSON.stringify(status, null, 2)
        );
    }

    async checkSystem() {
        const status = await this.getHealthStatus();
        
        this.healthData.lastCheck = new Date().toISOString();
        this.healthData.status = status.status;
        this.healthData.checks.push({
            timestamp: this.healthData.lastCheck,
            status: status.status,
            memory: status.memory
        });

        // Keep only last 100 checks in memory
        if (this.healthData.checks.length > 100) {
            this.healthData.checks = this.healthData.checks.slice(-100);
        }

        // Update status file
        await this.updateStatusFile();

        // If status is warning, trigger recovery
        if (status.status === 'warning') {
            this.triggerRecovery();
        }
    }

    async triggerRecovery() {
        console.log('Triggering recovery process...');
        this.healthData.restarts++;
        
        // Notify auto-recovery system
        try {
            const recoveryResponse = await this.notifyRecoverySystem();
            console.log('Recovery system notified:', recoveryResponse);
        } catch (error) {
            console.error('Failed to notify recovery system:', error);
        }
    }

    async notifyRecoverySystem() {
        return new Promise((resolve, reject) => {
            const req = http.request({
                hostname: 'localhost',
                port: 3001, // Auto-recovery system port
                path: '/trigger-recovery',
                method: 'POST'
            }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => resolve(data));
            });

            req.on('error', reject);
            req.end();
        });
    }

    startMonitoring() {
        setInterval(() => {
            this.checkSystem().catch(console.error);
        }, this.checkInterval);
    }
}

// Start the health monitoring system
const healthMonitor = new HealthMonitoringSystem();
healthMonitor.start().catch(console.error);

// Handle process termination
process.on('SIGTERM', async () => {
    console.log('Received SIGTERM signal');
    await healthMonitor.updateStatusFile();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('Received SIGINT signal');
    await healthMonitor.updateStatusFile();
    process.exit(0);
});
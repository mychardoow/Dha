import os from 'os';
import fs from 'fs';

class BuildMonitor {
    constructor() {
        this.stats = {
            startTime: Date.now(),
            memoryUsage: {},
            cpuUsage: {},
            buildStatus: 'starting',
            errors: []
        };
        this.logFile = 'build-monitor.log';
    }

    start() {
        console.log('Build monitor started...');
        this.monitorInterval = setInterval(() => this.collectMetrics(), 5000);
        this.writeInterval = setInterval(() => this.writeStats(), 10000);
        process.on('SIGTERM', () => this.cleanup());
        process.on('SIGINT', () => this.cleanup());
    }

    collectMetrics() {
        try {
            // Memory metrics
            const memUsage = process.memoryUsage();
            this.stats.memoryUsage = {
                heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
                heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
                rss: Math.round(memUsage.rss / 1024 / 1024),
                freeMem: Math.round(os.freemem() / 1024 / 1024)
            };

            // CPU metrics
            const cpuUsage = process.cpuUsage();
            this.stats.cpuUsage = {
                user: Math.round(cpuUsage.user / 1000000),
                system: Math.round(cpuUsage.system / 1000000)
            };

            // Check for potential issues
            this.checkHealthMetrics();
        } catch (error) {
            this.logError('Error collecting metrics', error);
        }
    }

    checkHealthMetrics() {
        const { memoryUsage, cpuUsage } = this.stats;
        
        // Memory warning threshold (90% of available memory)
        if (memoryUsage.rss > os.totalmem() * 0.9) {
            this.logWarning('High memory usage detected');
        }

        // CPU warning threshold (90% usage)
        if (cpuUsage.user + cpuUsage.system > 90) {
            this.logWarning('High CPU usage detected');
        }
    }

    writeStats() {
        try {
            const stats = {
                ...this.stats,
                timestamp: new Date().toISOString()
            };
            fs.writeFileSync('health-status.json', JSON.stringify(stats, null, 2));
            
            // Append to log file
            const logEntry = `${stats.timestamp} - Memory: ${stats.memoryUsage.rss}MB, CPU: ${stats.cpuUsage.user + stats.cpuUsage.system}%\n`;
            fs.appendFileSync(this.logFile, logEntry);
        } catch (error) {
            console.error('Error writing stats:', error);
        }
    }

    logError(message, error) {
        const errorEntry = {
            timestamp: new Date().toISOString(),
            message,
            error: error.toString()
        };
        this.stats.errors.push(errorEntry);
        console.error(message, error);
    }

    logWarning(message) {
        console.warn(`WARNING: ${message}`);
        fs.appendFileSync(this.logFile, `${new Date().toISOString()} - WARNING: ${message}\n`);
    }

    cleanup() {
        clearInterval(this.monitorInterval);
        clearInterval(this.writeInterval);
        this.writeStats();
        console.log('Build monitor stopped');
        process.exit(0);
    }
}

// Start monitoring
const monitor = new BuildMonitor();
monitor.start();
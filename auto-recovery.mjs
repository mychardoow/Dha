import os from 'os';
import { exec } from 'child_process';
import fs from 'fs';

class AutoRecoverySystem {
    constructor() {
        this.config = {
            memoryThreshold: 0.9, // 90% of available memory
            cpuThreshold: 90, // 90% CPU usage
            recoveryAttempts: 0,
            maxRecoveryAttempts: 3,
            recoveryInterval: 60000 // 1 minute
        };
        this.healthChecks = {
            memory: () => this.checkMemory(),
            cpu: () => this.checkCpu(),
            connectivity: () => this.checkConnectivity()
        };
    }

    start() {
        console.log('Starting auto-recovery system...');
        this.startMonitoring();
        this.setupProcessHandlers();
    }

    startMonitoring() {
        // Run health checks every minute
        this.monitorInterval = setInterval(() => {
            this.runHealthChecks();
        }, 60000);

        // Reset recovery attempts counter every hour
        setInterval(() => {
            this.config.recoveryAttempts = 0;
        }, 3600000);
    }

    setupProcessHandlers() {
        process.on('uncaughtException', (error) => {
            this.handleError('Uncaught Exception', error);
        });

        process.on('unhandledRejection', (error) => {
            this.handleError('Unhandled Rejection', error);
        });

        process.on('SIGTERM', () => {
            this.cleanup();
        });
    }

    async runHealthChecks() {
        try {
            const results = await Promise.all([
                this.healthChecks.memory(),
                this.healthChecks.cpu(),
                this.healthChecks.connectivity()
            ]);

            if (results.some(result => !result.healthy)) {
                this.initiateRecovery();
            }
        } catch (error) {
            this.handleError('Health Check Error', error);
        }
    }

    checkMemory() {
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const memoryUsage = (totalMem - freeMem) / totalMem;

        return {
            healthy: memoryUsage < this.config.memoryThreshold,
            metric: 'memory',
            value: memoryUsage
        };
    }

    checkCpu() {
        return new Promise((resolve) => {
            const startUsage = process.cpuUsage();
            setTimeout(() => {
                const endUsage = process.cpuUsage(startUsage);
                const totalUsage = (endUsage.user + endUsage.system) / 1000000;
                resolve({
                    healthy: totalUsage < this.config.cpuThreshold,
                    metric: 'cpu',
                    value: totalUsage
                });
            }, 100);
        });
    }

    checkConnectivity() {
        return new Promise((resolve) => {
            exec('curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health', (error, stdout) => {
                resolve({
                    healthy: !error && stdout === '200',
                    metric: 'connectivity',
                    value: stdout
                });
            });
        });
    }

    async initiateRecovery() {
        if (this.config.recoveryAttempts >= this.config.maxRecoveryAttempts) {
            this.handleError('Max recovery attempts reached', new Error('Recovery limit exceeded'));
            return;
        }

        this.config.recoveryAttempts++;
        console.log(`Initiating recovery attempt ${this.config.recoveryAttempts}...`);

        try {
            // Attempt graceful recovery steps
            await this.performMemoryRecovery();
            await this.restartServer();
            
            console.log('Recovery completed successfully');
        } catch (error) {
            this.handleError('Recovery failed', error);
        }
    }

    async performMemoryRecovery() {
        return new Promise((resolve) => {
            // Clear require cache to free up memory
            Object.keys(import.meta.cache).forEach((key) => {
                delete import.meta.cache[key];
            });

            resolve();
        });
    }

    async restartServer() {
        return new Promise((resolve, reject) => {
            exec('npm run start', (error) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve();
            });
        });
    }

    handleError(context, error) {
        const errorLog = {
            timestamp: new Date().toISOString(),
            context,
            error: error.toString(),
            stack: error.stack
        };

        console.error('Error in auto-recovery:', errorLog);
        fs.appendFileSync('auto-recovery.log', JSON.stringify(errorLog) + '\n');

        if (this.config.recoveryAttempts >= this.config.maxRecoveryAttempts) {
            console.error('Critical: Max recovery attempts reached. Manual intervention required.');
            process.exit(1);
        }
    }

    cleanup() {
        clearInterval(this.monitorInterval);
        console.log('Auto-recovery system stopped');
        process.exit(0);
    }
}

// Start the auto-recovery system
const recovery = new AutoRecoverySystem();
recovery.start();
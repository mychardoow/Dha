import cluster from 'cluster';
import os from 'os';
import { EventEmitter } from 'events';
import { writeFile } from 'fs/promises';
import { join } from 'path';

class HealthMonitor extends EventEmitter {
    private healthData: {
        workers: Map<number, {
            status: string;
            lastCheck: number;
            memory: any;
            cpu: any;
        }>;
        system: {
            totalMemory: number;
            freeMemory: number;
            cpuUsage: number;
        };
    };

    constructor() {
        super();
        this.healthData = {
            workers: new Map(),
            system: {
                totalMemory: 0,
                freeMemory: 0,
                cpuUsage: 0
            }
        };
        this.startMonitoring();
    }

    private async startMonitoring() {
        // Monitor system resources
        setInterval(() => {
            this.healthData.system = {
                totalMemory: os.totalmem(),
                freeMemory: os.freemem(),
                cpuUsage: os.loadavg()[0]
            };
        }, 5000);

        // Save health data
        setInterval(async () => {
            await this.saveHealthData();
        }, 10000);
    }

    async updateWorkerHealth(workerId: number, data: any) {
        this.healthData.workers.set(workerId, {
            status: 'alive',
            lastCheck: Date.now(),
            memory: data.memory,
            cpu: data.cpu
        });
    }

    private async saveHealthData() {
        try {
            const healthSnapshot = {
                timestamp: new Date().toISOString(),
                workers: Array.from(this.healthData.workers.entries()).map(([id, data]) => ({
                    id,
                    ...data
                })),
                system: this.healthData.system
            };

            await writeFile(
                join(process.cwd(), 'health-status.json'),
                JSON.stringify(healthSnapshot, null, 2)
            );
        } catch (error) {
            console.error('Failed to save health data:', error);
        }
    }

    getHealthStatus() {
        return {
            workers: Array.from(this.healthData.workers.entries()),
            system: this.healthData.system,
            timestamp: new Date().toISOString()
        };
    }
}

export const healthMonitor = new HealthMonitor();
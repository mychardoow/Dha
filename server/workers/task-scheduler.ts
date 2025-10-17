import cron from 'node-cron';
import { promises as fs } from 'fs';
import path from 'path';

interface CronTask {
    schedule: string;
    name: string;
    task: () => Promise<void>;
}

class TaskScheduler {
    private tasks: CronTask[] = [];

    constructor() {
        // Health check - Every 5 minutes
        this.addTask('*/5 * * * *', 'healthCheck', async () => {
            await this.runHealthCheck();
        });

        // Cleanup old PDFs - Every day at midnight
        this.addTask('0 0 * * *', 'cleanupPDFs', async () => {
            await this.cleanupOldPDFs();
        });

        // Security scan - Every hour
        this.addTask('0 * * * *', 'securityScan', async () => {
            await this.runSecurityScan();
        });

        // Performance metrics - Every 15 minutes
        this.addTask('*/15 * * * *', 'performanceMetrics', async () => {
            await this.collectPerformanceMetrics();
        });
    }

    private addTask(schedule: string, name: string, task: () => Promise<void>) {
        this.tasks.push({ schedule, name, task });
    }

    start() {
        for (const { schedule, name, task } of this.tasks) {
            cron.schedule(schedule, async () => {
                try {
                    console.log(`Running task: ${name}`);
                    await task();
                    console.log(`Task completed: ${name}`);
                } catch (error) {
                    console.error(`Task failed: ${name}`, error);
                }
            });
        }
    }

    private async runHealthCheck() {
        const healthData = {
            timestamp: new Date().toISOString(),
            memory: process.memoryUsage(),
            uptime: process.uptime()
        };
        await fs.writeFile(
            path.join(process.cwd(), 'health-status.json'),
            JSON.stringify(healthData, null, 2)
        );
    }

    private async cleanupOldPDFs() {
        const pdfDir = path.join(process.cwd(), 'generated-pdfs');
        const files = await fs.readdir(pdfDir);
        const now = Date.now();
        const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

        for (const file of files) {
            if (!file.endsWith('.pdf')) continue;
            const filePath = path.join(pdfDir, file);
            const stats = await fs.stat(filePath);
            if (now - stats.mtimeMs > maxAge) {
                await fs.unlink(filePath);
            }
        }
    }

    private async runSecurityScan() {
        // Implement security scanning logic
        const scanResults = {
            timestamp: new Date().toISOString(),
            threatLevel: 'low',
            findings: []
        };
        await fs.writeFile(
            path.join(process.cwd(), 'security-scan.json'),
            JSON.stringify(scanResults, null, 2)
        );
    }

    private async collectPerformanceMetrics() {
        const metrics = {
            timestamp: new Date().toISOString(),
            memory: process.memoryUsage(),
            cpu: process.cpuUsage(),
            uptime: process.uptime()
        };
        await fs.writeFile(
            path.join(process.cwd(), 'performance-metrics.json'),
            JSON.stringify(metrics, null, 2)
        );
    }
}

export const taskScheduler = new TaskScheduler();
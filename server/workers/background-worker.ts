import * as cluster from 'node:cluster';
import type { Worker } from 'node:cluster';
import os from 'os';
import { EventEmitter } from 'events';

const numCPUs = os.cpus().length;

interface WorkerMessage {
    type: string;
    data: unknown;
}

class BackgroundWorker extends EventEmitter {
    private workers: Map<number, Worker>;
    private isShuttingDown: boolean;

    constructor() {
        super();
        this.workers = new Map<number, Worker>();
        this.isShuttingDown = false;

        // Handle graceful shutdown
        process.on('SIGTERM', () => this.shutdown());
        process.on('SIGINT', () => this.shutdown());
    }

    startWorkers(): void {
        const isPrimary = 'isPrimary' in cluster && cluster.isPrimary;
        if (isPrimary) {
            console.log(`Primary process ${process.pid} is running`);

            // Fork workers
            for (let i = 0; i < numCPUs; i++) {
                this.createWorker();
            }

            // Handle worker exits and restart them
            if ('on' in cluster) {
                cluster.on('exit', (worker: Worker, code: number, signal: string) => {
                    if (worker.process.pid) {
                        console.log(`Worker ${worker.process.pid} died. Signal: ${signal}. Code: ${code}`);
                        if (!this.isShuttingDown) {
                            console.log('Starting a new worker...');
                            this.createWorker();
                        }
                    }
                });
            }
        }
    }

    private createWorker(): void {
        if ('fork' in cluster) {
            const worker = cluster.fork();
            if (worker.process.pid) {
                this.workers.set(worker.process.pid, worker);
    
                worker.on('message', (msg: WorkerMessage) => {
                    this.emit('workerMessage', msg);
                });
    
                worker.on('error', (error: Error) => {
                    console.error('Worker error:', error);
                    if (worker.process.pid) {
                        this.emit('workerError', { worker: worker.process.pid, error });
                    }
                });
            }
        }
    }

    async shutdown(): Promise<void> {
        this.isShuttingDown = true;
        console.log('Shutting down workers...');

        const shutdownPromises = Array.from(this.workers.entries()).map(
            async ([pid, worker]) => {
                try {
                    await this.stopWorker(worker);
                    console.log(`Worker ${pid} stopped successfully`);
                } catch (error) {
                    console.error(`Error stopping worker ${pid}:`, error);
                }
            }
        );

        await Promise.allSettled(shutdownPromises);
        this.workers.clear();
        process.exit(0);
    }

    private stopWorker(worker: Worker): Promise<void> {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                worker.kill('SIGKILL');
                reject(new Error('Worker stop timeout'));
            }, 5000);

            worker.on('exit', () => {
                clearTimeout(timeout);
                resolve();
            });

            worker.send('shutdown');
        });
    }
}

export const backgroundWorker = new BackgroundWorker();
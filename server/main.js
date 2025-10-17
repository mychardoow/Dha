import express from 'express';
import cluster from 'cluster';
import { cpus } from 'os';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';

// ES Module compatibility
const __dirname = dirname(fileURLToPath(import.meta.url));

// Environment variables
const PORT = process.env.PORT || 5000;
const NUM_WORKERS = process.env.NODE_ENV === 'production' ? cpus().length : 1;

// Server setup
async function setupServer() {
    const app = express();
    const server = createServer(app);
    const wss = new WebSocketServer({ server });

    // Middleware
    app.use(cors());
    app.use(compression());
    app.use(helmet());
    app.use(express.json());

    // Memory monitoring
    const memoryLimit = 450 * 1024 * 1024; // 450MB
    setInterval(() => {
        const used = process.memoryUsage().heapUsed;
        if (used > memoryLimit) {
            console.warn('Memory limit exceeded, triggering cleanup...');
            global.gc && global.gc();
        }
    }, 30000);

    // Health check endpoint
    app.get('/health', (req, res) => {
        res.json({
            status: 'healthy',
            worker: process.pid,
            memory: process.memoryUsage(),
            uptime: process.uptime(),
            timestamp: new Date().toISOString()
        });
    });

    // AI system status endpoint
    app.get('/api/ai/status', (req, res) => {
        res.json({
            systems: {
                assistant: { status: 'operational' },
                agent: { status: 'operational' },
                security_bot: { status: 'operational' },
                intelligence: { status: 'operational' },
                command: { status: 'operational' }
            },
            timestamp: new Date().toISOString()
        });
    });

    // PDF generation endpoint
    app.post('/api/pdf/generate/:type', async (req, res) => {
        try {
            res.json({
                status: 'success',
                message: `PDF generation for ${req.params.type} initiated`,
                jobId: Date.now().toString()
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // WebSocket handler
    wss.on('connection', (ws) => {
        ws.on('message', (message) => {
            try {
                const data = JSON.parse(message);
                // Handle different message types
                switch (data.type) {
                    case 'health_check':
                        ws.send(JSON.stringify({
                            type: 'health_response',
                            data: {
                                status: 'healthy',
                                timestamp: Date.now()
                            }
                        }));
                        break;
                    default:
                        ws.send(JSON.stringify({
                            type: 'error',
                            message: 'Unknown message type'
                        }));
                }
            } catch (error) {
                console.error('WebSocket error:', error);
            }
        });
    });

    // Error handling
    app.use((err, req, res, next) => {
        console.error(err);
        res.status(500).json({ 
            error: 'Internal Server Error',
            message: err.message
        });
    });

    return server;
}

// Cluster management
if (cluster.isPrimary) {
    console.log(`Primary ${process.pid} is running`);

    // Fork workers
    for (let i = 0; i < NUM_WORKERS; i++) {
        cluster.fork();
    }

    cluster.on('exit', (worker, code, signal) => {
        console.log(`Worker ${worker.process.pid} died. Restarting...`);
        cluster.fork();
    });

    // Monitor workers
    setInterval(() => {
        for (const id in cluster.workers) {
            cluster.workers[id].send('health_check');
        }
    }, 30000);
} else {
    // Worker process
    console.log(`Worker ${process.pid} started`);

    setupServer()
        .then(server => {
            server.listen(PORT, () => {
                console.log(`Worker ${process.pid} listening on port ${PORT}`);
            });
        })
        .catch(error => {
            console.error('Failed to start server:', error);
            process.exit(1);
        });

    // Worker health check response
    process.on('message', (msg) => {
        if (msg === 'health_check') {
            process?.send?.({
                type: 'health_response',
                pid: process.pid,
                memory: process.memoryUsage(),
                uptime: process.uptime()
            });
        }
    });
}

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    setTimeout(() => {
        console.log('Shutting down...');
        process.exit(0);
    }, 5000);
});
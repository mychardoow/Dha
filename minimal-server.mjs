import express from 'express';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';

// Get current directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize auto-recovery and monitoring
import './auto-recovery.mjs';
import './build-monitor.mjs';

const app = express();
const port = process.env.PORT || 3000;

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Memory-efficient document generation
const generateDocument = async (type, data) => {
    try {
        // Load document template dynamically
        const template = await import(`./templates/${type}.mjs`);
        return template.generate(data);
    } catch (error) {
        console.error(`Error generating document type ${type}:`, error);
        throw new Error(`Document generation failed: ${error.message}`);
    }
};

// Health check endpoint
app.get('/health', (req, res) => {
    const health = {
        uptime: process.uptime(),
        timestamp: Date.now(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        platform: os.platform(),
        freemem: os.freemem(),
        totalmem: os.totalmem()
    };
    res.json(health);
});

// Document generation endpoint
app.post('/generate/:type', async (req, res) => {
    try {
        const { type } = req.params;
        const data = req.body;

        // Validate document type
        const validTypes = fs.readdirSync(path.join(__dirname, 'templates'))
            .filter(file => file.endsWith('.mjs'))
            .map(file => file.replace('.mjs', ''));

        if (!validTypes.includes(type)) {
            return res.status(400).json({
                error: 'Invalid document type',
                validTypes
            });
        }

        // Generate document
        const document = await generateDocument(type, data);
        res.json({ document });
    } catch (error) {
        console.error('Document generation error:', error);
        res.status(500).json({
            error: 'Document generation failed',
            message: error.message
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: err.message
    });
});

// Start server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
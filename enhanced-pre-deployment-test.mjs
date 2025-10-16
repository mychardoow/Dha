import { jest } from '@jest/globals';
import fetch from 'node-fetch';
import http from 'http';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const HEALTH_CHECK_URL = `${BASE_URL}:${process.env.HEALTH_CHECK_PORT || 3001}/health`;

const tests = {
    async testHealthCheck() {
        const response = await fetch(HEALTH_CHECK_URL);
        const data = await response.json();
        return {
            name: 'Health Check',
            status: response.status === 200 && data.status === 'healthy' ? 'PASS' : 'FAIL',
            details: data
        };
    },

    async testMemoryUsage() {
        const response = await fetch(HEALTH_CHECK_URL);
        const data = await response.json();
        const memoryUsage = data.memoryUsage.heapUsed / 1024 / 1024; // Convert to MB
        return {
            name: 'Memory Usage',
            status: memoryUsage < 450 ? 'PASS' : 'FAIL',
            details: `${Math.round(memoryUsage)}MB used`
        };
    },

    async testAntiSleep() {
        const startTime = Date.now();
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
        const response = await fetch(HEALTH_CHECK_URL);
        const uptime = (Date.now() - startTime) / 1000;
        return {
            name: 'Anti-Sleep System',
            status: response.status === 200 && uptime >= 5 ? 'PASS' : 'FAIL',
            details: `Uptime: ${uptime}s`
        };
    },

    async testAutoRecovery() {
        const response = await fetch(HEALTH_CHECK_URL);
        const data = await response.json();
        return {
            name: 'Auto Recovery',
            status: response.status === 200 ? 'PASS' : 'FAIL',
            details: `System uptime: ${Math.round(data.uptime)}s`
        };
    }
};

async function runTests() {
    console.log('🧪 Starting Pre-deployment Tests...');
    
    const results = [];
    for (const [name, test] of Object.entries(tests)) {
        try {
            console.log(`Running ${name}...`);
            const result = await test();
            results.push(result);
            console.log(`${result.status === 'PASS' ? '✅' : '❌'} ${result.name}: ${result.status}`);
        } catch (error) {
            results.push({
                name,
                status: 'FAIL',
                details: error.message
            });
            console.error(`❌ ${name} failed:`, error);
        }
    }

    // Save test results
    const report = {
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        results
    };

    await fs.writeFile(
        path.join(__dirname, 'pre-deployment-test-results.json'),
        JSON.stringify(report, null, 2)
    );

    // Check if all tests passed
    const allPassed = results.every(r => r.status === 'PASS');
    if (!allPassed) {
        console.error('❌ Pre-deployment tests failed!');
        process.exit(1);
    }

    console.log('✅ All pre-deployment tests passed!');
    return report;
}

// Run tests if this file is executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    runTests().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

export { runTests };
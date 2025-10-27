#!/usr/bin/env node

import fetch from 'node-fetch';
import { execSync } from 'child_process';
import { performance } from 'perf_hooks';

async function testDeployment() {
    console.log('🚀 Testing Enhanced Deployment Configuration');
    console.log('==========================================');

    try {
        // 1. Test basic health check
        console.log('\n🏥 Testing health endpoint...');
        const startTime = performance.now();
        const response = await fetch('http://localhost:5000/api/health');
        const endTime = performance.now();
        const responseTime = (endTime - startTime).toFixed(2);
        
        const data = await response.json();
        console.log(`Response time: ${responseTime}ms`);
        console.log('Health check response:', data);

        // 2. Verify database connection
        console.log('\n🔍 Verifying database connection...');
        if (data.database && data.database.connected) {
            console.log('✅ Database connection successful');
            console.log(`Database type: ${data.database.type}`);
        } else {
            console.log('❌ Database connection failed');
        }

        // 3. Check API configuration
        console.log('\n📡 Checking API configuration...');
        if (data.apis && data.apis.configured) {
            console.log('✅ APIs properly configured');
            if (data.apis.monitoring) {
                console.log('✅ API monitoring active');
            }
        } else {
            console.log('⚠️ API configuration incomplete');
        }

        // 4. Test error handling
        console.log('\n🔬 Testing error handling...');
        try {
            await fetch('http://localhost:5000/api/non-existent');
            console.log('❌ Error handling test failed - should have thrown 404');
        } catch (error) {
            console.log('✅ Error handling working as expected');
        }

        // Overall status
        console.log('\n📊 Deployment Test Results');
        console.log('========================');
        console.log(`Health Check: ${data.status === 'healthy' ? '✅' : '❌'}`);
        console.log(`Database: ${data.database?.connected ? '✅' : '❌'}`);
        console.log(`APIs: ${data.apis?.configured ? '✅' : '❌'}`);
        console.log(`Response Time: ${responseTime < 500 ? '✅' : '⚠️'} ${responseTime}ms`);

    } catch (error) {
        console.error('❌ Deployment test failed:', error);
        process.exit(1);
    }
}

// Run the tests
testDeployment().catch(console.error);
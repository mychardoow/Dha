import fs from 'fs';
import { execSync } from 'child_process';
import fetch from 'node-fetch';

class DocumentTestSuite {
    constructor() {
        this.results = {
            passed: [],
            failed: [],
            timestamp: new Date().toISOString()
        };
    }

    async runTests() {
        try {
            // Start server in test mode
            console.log('Starting server in test mode...');
            const serverProcess = execSync('node minimal-server.js &');

            // Wait for server to start
            await this.sleep(2000);

            // Run tests for each document type
            console.log('Testing document generation...');
            const testCases = this.getTestCases();
            
            for (const testCase of testCases) {
                await this.testDocumentGeneration(testCase);
            }

            // Stop server
            execSync('pkill -f minimal-server.js');

            // Generate report
            this.generateReport();
        } catch (error) {
            console.error('Test suite error:', error);
            this.results.error = error.toString();
            this.generateReport();
            process.exit(1);
        }
    }

    getTestCases() {
        return [
            {
                type: 'dha802',
                data: {
                    fullName: 'Test User',
                    dateOfBirth: '1990-01-01',
                    idNumber: '9001010000000'
                }
            },
            // Add test cases for all document types
            // DHA-1620, DHA-1681, etc.
        ];
    }

    async testDocumentGeneration(testCase) {
        try {
            const response = await fetch(`http://localhost:3000/generate/${testCase.type}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(testCase.data)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.document) {
                this.results.passed.push({
                    type: testCase.type,
                    timestamp: new Date().toISOString()
                });
            } else {
                throw new Error('No document generated');
            }
        } catch (error) {
            this.results.failed.push({
                type: testCase.type,
                error: error.toString(),
                timestamp: new Date().toISOString()
            });
        }
    }

    generateReport() {
        const report = {
            ...this.results,
            summary: {
                total: this.results.passed.length + this.results.failed.length,
                passed: this.results.passed.length,
                failed: this.results.failed.length
            }
        };

        fs.writeFileSync(
            'document-generation-test-report.json',
            JSON.stringify(report, null, 2)
        );

        // Print summary
        console.log('\nTest Results Summary:');
        console.log('--------------------');
        console.log(`Total Tests: ${report.summary.total}`);
        console.log(`Passed: ${report.summary.passed}`);
        console.log(`Failed: ${report.summary.failed}`);

        if (report.summary.failed > 0) {
            console.log('\nFailed Tests:');
            this.results.failed.forEach(failure => {
                console.log(`- ${failure.type}: ${failure.error}`);
            });
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Run tests
const testSuite = new DocumentTestSuite();
await testSuite.runTests();
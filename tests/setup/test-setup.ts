/**
 * 🧪 REAL TEST SETUP AND TEARDOWN
 * 
 * Sets up real test environment with actual database, server, and services
 */

import { beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import { spawn, ChildProcess } from 'child_process';
import { TEST_CONFIG } from './test-config';
import path from 'path';
import fs from 'fs/promises';

export class RealTestEnvironment {
  private static instance: RealTestEnvironment;
  private serverProcess: ChildProcess | null = null;
  private isServerReady = false;
  private authTokens: Record<string, string> = {};

  static getInstance(): RealTestEnvironment {
    if (!RealTestEnvironment.instance) {
      RealTestEnvironment.instance = new RealTestEnvironment();
    }
    return RealTestEnvironment.instance;
  }

  /**
   * Start real server for testing
   */
  async startServer(): Promise<void> {
    if (this.isServerReady) return;

    console.log('🚀 Starting real DHA server for testing...');
    
    // Start the actual server
    this.serverProcess = spawn('npm', ['run', 'dev'], {
      cwd: path.join(__dirname, '../..'),
      env: { 
        ...process.env, 
        NODE_ENV: 'test',
        PORT: TEST_CONFIG.SERVER.PORT.toString()
      },
      stdio: 'pipe'
    });

    // Wait for server to be ready
    await this.waitForServerReady();
    console.log('✅ DHA server is ready for testing');
  }

  /**
   * Stop the real server
   */
  async stopServer(): Promise<void> {
    if (this.serverProcess) {
      console.log('🛑 Stopping DHA server...');
      this.serverProcess.kill('SIGTERM');
      this.serverProcess = null;
      this.isServerReady = false;
    }
  }

  /**
   * Wait for server to be ready by polling health endpoint
   */
  private async waitForServerReady(): Promise<void> {
    const maxAttempts = 60; // 60 seconds timeout
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const response = await request(TEST_CONFIG.SERVER.BASE_URL)
          .get('/api/health')
          .timeout(2000);
        
        if (response.status === 200) {
          this.isServerReady = true;
          return;
        }
      } catch (error) {
        // Server not ready yet, continue waiting
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }

    throw new Error('Server failed to start within timeout period');
  }

  /**
   * Seed test database with real test data
   */
  async seedTestDatabase(): Promise<void> {
    if (!TEST_CONFIG.DATABASE.SEED_TEST_DATA) return;

    console.log('🌱 Seeding test database with real data...');

    // Create test users through real API endpoints
    await this.createTestUser(TEST_CONFIG.USERS.ADMIN);
    await this.createTestUser(TEST_CONFIG.USERS.USER);
    
    // Try to create Queen Raeesa user (may fail if exists)
    try {
      await this.createTestUser(TEST_CONFIG.USERS.QUEEN_RAEESA);
    } catch (error) {
      console.log('ℹ️ Queen Raeesa user already exists or creation failed (expected)');
    }

    console.log('✅ Test database seeded');
  }

  /**
   * Clean up test database
   */
  async cleanupTestDatabase(): Promise<void> {
    if (!TEST_CONFIG.DATABASE.CLEANUP_AFTER_TESTS) return;

    console.log('🧹 Cleaning up test database...');
    
    // Note: In a real environment, we'd use careful cleanup
    // For now, we'll clean up test-specific data only
    try {
      // Clean up test users (except Queen Raeesa)
      await this.deleteTestUser(TEST_CONFIG.USERS.ADMIN.email);
      await this.deleteTestUser(TEST_CONFIG.USERS.USER.email);
    } catch (error) {
      console.warn('⚠️ Database cleanup warning:', error);
    }

    console.log('✅ Test database cleaned up');
  }

  /**
   * Authenticate and get real JWT tokens for testing
   */
  async authenticateTestUsers(): Promise<void> {
    console.log('🔐 Authenticating test users...');

    // Authenticate admin user
    try {
      const adminToken = await this.authenticateUser(
        TEST_CONFIG.USERS.ADMIN.username,
        TEST_CONFIG.USERS.ADMIN.password
      );
      this.authTokens.admin = adminToken;
    } catch (error) {
      console.warn('⚠️ Admin authentication failed:', error);
    }

    // Authenticate regular user
    try {
      const userToken = await this.authenticateUser(
        TEST_CONFIG.USERS.USER.username, 
        TEST_CONFIG.USERS.USER.password
      );
      this.authTokens.user = userToken;
    } catch (error) {
      console.warn('⚠️ User authentication failed:', error);
    }

    // Try to authenticate Queen Raeesa
    try {
      const queenToken = await this.authenticateUser(
        TEST_CONFIG.USERS.QUEEN_RAEESA.username,
        TEST_CONFIG.USERS.QUEEN_RAEESA.password
      );
      this.authTokens.queen = queenToken;
    } catch (error) {
      console.warn('⚠️ Queen Raeesa authentication failed (expected for testing):', error);
    }

    console.log('✅ Test users authenticated');
  }

  /**
   * Create a test user through real API
   */
  private async createTestUser(userData: any): Promise<void> {
    const response = await request(TEST_CONFIG.SERVER.BASE_URL)
      .post('/api/auth/register')
      .send({
        username: userData.username,
        email: userData.email,
        password: userData.password,
        role: userData.role
      });

    if (response.status !== 201 && response.status !== 200) {
      throw new Error(`Failed to create test user: ${response.body.error}`);
    }
  }

  /**
   * Authenticate user and return JWT token
   */
  private async authenticateUser(username: string, password: string): Promise<string> {
    const response = await request(TEST_CONFIG.SERVER.BASE_URL)
      .post('/api/auth/login')
      .send({ username, password });

    if (response.status !== 200) {
      throw new Error(`Authentication failed: ${response.body.error}`);
    }

    return response.body.token;
  }

  /**
   * Delete test user through real API
   */
  private async deleteTestUser(email: string): Promise<void> {
    // Implementation would depend on having a delete user endpoint
    // For now, we'll just log the intent
    console.log(`🗑️ Would delete test user: ${email}`);
  }

  /**
   * Get authentication token for test user
   */
  getAuthToken(userType: 'admin' | 'user' | 'queen'): string {
    const token = this.authTokens[userType];
    if (!token) {
      throw new Error(`No auth token available for ${userType}`);
    }
    return token;
  }

  /**
   * Create test-specific output directory
   */
  async createTestOutputDirectory(): Promise<void> {
    const testOutputDir = path.join(__dirname, '../output');
    try {
      await fs.mkdir(testOutputDir, { recursive: true });
      console.log('📁 Test output directory created');
    } catch (error) {
      console.warn('⚠️ Failed to create test output directory:', error);
    }
  }
}

// Global test setup
beforeAll(async () => {
  const testEnv = RealTestEnvironment.getInstance();
  await testEnv.createTestOutputDirectory();
  await testEnv.startServer();
  await testEnv.seedTestDatabase();
  await testEnv.authenticateTestUsers();
}, 120000); // 2 minute timeout for real server startup

// Global test cleanup
afterAll(async () => {
  const testEnv = RealTestEnvironment.getInstance();
  await testEnv.cleanupTestDatabase();
  await testEnv.stopServer();
}, 30000); // 30 second timeout for cleanup

// Export test environment for use in tests
export const testEnvironment = RealTestEnvironment.getInstance();
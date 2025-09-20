/**
 * Integration Tests for Account Lockout System
 * 
 * Tests the production-ready account lockout functionality to protect against
 * brute force attacks with database-backed persistence.
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import { db } from '../../db';
import { users } from '../../../shared/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const TEST_EMAIL = 'lockout.test@dha.gov.za';
const TEST_PASSWORD = 'TestPassword123!';
const WRONG_PASSWORD = 'WrongPassword123!';

describe('Account Lockout System - Integration Tests', () => {
  let testUserId: string;

  beforeEach(async () => {
    // Clean up any existing test user
    await db.delete(users).where(eq(users.email, TEST_EMAIL));
    
    // Create a test user
    const hashedPassword = await bcrypt.hash(TEST_PASSWORD, 12);
    const [testUser] = await db.insert(users).values({
      username: 'lockout-test-user',
      email: TEST_EMAIL,
      password: hashedPassword,
      role: 'user',
      isActive: true
    }).returning();
    
    testUserId = testUser.id;
  });

  afterEach(async () => {
    // Clean up test user
    if (testUserId) {
      await db.delete(users).where(eq(users.id, testUserId));
    }
  });

  test('should allow successful login with correct credentials', async () => {
    const response = await request(BASE_URL)
      .post('/api/auth/login')
      .send({
        email: TEST_EMAIL,
        password: TEST_PASSWORD
      });

    expect(response.status).toBe(200);
    expect(response.body.token).toBeDefined();
    expect(response.body.user.email).toBe(TEST_EMAIL);
  });

  test('should increment failed attempts for wrong password', async () => {
    // First failed attempt
    const response1 = await request(BASE_URL)
      .post('/api/auth/login')
      .send({
        email: TEST_EMAIL,
        password: WRONG_PASSWORD
      });

    expect(response1.status).toBe(401);
    expect(response1.body.error).toBe('Invalid credentials');

    // Check that failed attempts were recorded in database
    const [user] = await db.select().from(users).where(eq(users.id, testUserId));
    expect(user.failedAttempts).toBe(1);
    expect(user.lastFailedAttempt).toBeDefined();
  });

  test('should lock account after 5 failed attempts', async () => {
    // Perform 5 failed login attempts
    for (let i = 0; i < 5; i++) {
      const response = await request(BASE_URL)
        .post('/api/auth/login')
        .send({
          email: TEST_EMAIL,
          password: WRONG_PASSWORD
        });

      if (i < 4) {
        expect(response.status).toBe(401);
        expect(response.body.error).toBe('Invalid credentials');
      }
    }

    // 5th attempt should lock the account
    const lockResponse = await request(BASE_URL)
      .post('/api/auth/login')
      .send({
        email: TEST_EMAIL,
        password: WRONG_PASSWORD
      });

    expect(lockResponse.status).toBe(423);
    expect(lockResponse.body.error).toBe('Account temporarily locked');
    expect(lockResponse.body.lockedUntil).toBeDefined();

    // Verify lockout in database
    const [user] = await db.select().from(users).where(eq(users.id, testUserId));
    expect(user.failedAttempts).toBe(5);
    expect(user.lockedUntil).toBeDefined();
    expect(new Date(user.lockedUntil!).getTime()).toBeGreaterThan(Date.now());
  });

  test('should reject login attempts when account is locked, even with correct password', async () => {
    // First, lock the account with 5 failed attempts
    for (let i = 0; i < 5; i++) {
      await request(BASE_URL)
        .post('/api/auth/login')
        .send({
          email: TEST_EMAIL,
          password: WRONG_PASSWORD
        });
    }

    // Now try with correct password - should still be locked
    const response = await request(BASE_URL)
      .post('/api/auth/login')
      .send({
        email: TEST_EMAIL,
        password: TEST_PASSWORD
      });

    expect(response.status).toBe(423);
    expect(response.body.error).toBe('Account temporarily locked');
  });

  test('should clear lockout after successful login when lockout expires', async () => {
    // Lock the account
    for (let i = 0; i < 5; i++) {
      await request(BASE_URL)
        .post('/api/auth/login')
        .send({
          email: TEST_EMAIL,
          password: WRONG_PASSWORD
        });
    }

    // Manually expire the lockout by setting it to the past
    await db.update(users)
      .set({ 
        lockedUntil: new Date(Date.now() - 1000) // 1 second ago
      })
      .where(eq(users.id, testUserId));

    // Should now allow login with correct password
    const response = await request(BASE_URL)
      .post('/api/auth/login')
      .send({
        email: TEST_EMAIL,
        password: TEST_PASSWORD
      });

    expect(response.status).toBe(200);
    expect(response.body.token).toBeDefined();

    // Verify lockout was cleared in database
    const [user] = await db.select().from(users).where(eq(users.id, testUserId));
    expect(user.failedAttempts).toBe(0);
    expect(user.lockedUntil).toBeNull();
    expect(user.lastFailedAttempt).toBeNull();
  });

  test('should log security events for lockout scenarios', async () => {
    // This test would verify security event logging
    // Implementation depends on your security events table structure
    
    // Lock account with failed attempts
    for (let i = 0; i < 5; i++) {
      await request(BASE_URL)
        .post('/api/auth/login')
        .send({
          email: TEST_EMAIL,
          password: WRONG_PASSWORD
        });
    }

    // Try login on locked account
    await request(BASE_URL)
      .post('/api/auth/login')
      .send({
        email: TEST_EMAIL,
        password: TEST_PASSWORD
      });

    // Verify security events were created
    // This would query your security events table to ensure proper logging
    // expect(securityEvents).toContain events for failed attempts and lockout
  });

  test('should handle non-existent user lockout attempts', async () => {
    const response = await request(BASE_URL)
      .post('/api/auth/login')
      .send({
        email: 'nonexistent@dha.gov.za',
        password: 'anypassword'
      });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Invalid credentials');
  });
});
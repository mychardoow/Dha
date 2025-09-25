#!/usr/bin/env node

/**
 * DEBUG AUTHENTICATION ISSUE
 * Simple test to debug why authentication is failing
 */

import bcryptjs from 'bcryptjs';
import { storage } from './server/mem-storage';

async function debugAuthentication() {
  console.log('🔍 DEBUG: Testing authentication issue...\n');

  try {
    // Test 1: Check if users exist
    console.log('1. Checking if users exist:');
    const users = await storage.getUsers();
    console.log(`   Found ${users.length} users:`);
    for (const user of users) {
      console.log(`   - Username: ${user.username}, Role: ${user.role}`);
      console.log(`   - Has hashed password: ${!!user.hashedPassword}`);
      console.log(`   - Has plaintext password: ${!!user.password}`);
      console.log(`   - Active: ${user.isActive}`);
      console.log('');
    }

    // Test 2: Try to find admin user specifically
    console.log('2. Looking up admin user by username:');
    const adminUser = await storage.getUserByUsername('admin');
    if (adminUser) {
      console.log('   ✅ Admin user found');
      console.log(`   - ID: ${adminUser.id}`);
      console.log(`   - Username: ${adminUser.username}`);
      console.log(`   - Email: ${adminUser.email}`);
      console.log(`   - Role: ${adminUser.role}`);
      console.log(`   - Active: ${adminUser.isActive}`);
      console.log(`   - Has hashed password: ${!!adminUser.hashedPassword}`);
      console.log(`   - Hashed password length: ${adminUser.hashedPassword?.length || 0}`);
    } else {
      console.log('   ❌ Admin user NOT found');
      return;
    }

    // Test 3: Try password verification manually
    console.log('\n3. Testing password verification:');
    const testPassword = 'admin123';
    
    if (adminUser.hashedPassword) {
      console.log(`   Testing password "${testPassword}" against stored hash...`);
      const startTime = process.hrtime.bigint();
      
      const isValid = await bcryptjs.compare(testPassword, adminUser.hashedPassword);
      
      const endTime = process.hrtime.bigint();
      const timeTaken = Number(endTime - startTime) / 1_000_000; // Convert to ms
      
      console.log(`   Password verification result: ${isValid ? '✅ VALID' : '❌ INVALID'}`);
      console.log(`   Time taken: ${timeTaken.toFixed(2)}ms`);
    } else {
      console.log('   ❌ No hashed password to test against');
    }

    // Test 4: Test the exact flow used in routes.ts
    console.log('\n4. Testing exact authentication flow from routes.ts:');
    const validUsers = await storage.getUsers();
    const authenticatedUser = validUsers.find(u => u.username === 'admin');
    
    if (!authenticatedUser) {
      console.log('   ❌ User not found in getUsers() array');
      return;
    }
    
    console.log('   ✅ User found in getUsers() array');
    
    let isValidPassword = false;
    const password = 'admin123';
    
    if (authenticatedUser.hashedPassword) {
      console.log('   Testing hashed password path...');
      isValidPassword = await bcryptjs.compare(password, authenticatedUser.hashedPassword);
      console.log(`   Hashed password result: ${isValidPassword ? '✅ VALID' : '❌ INVALID'}`);
    } else if (authenticatedUser.password) {
      console.log('   Testing plaintext password path...');
      // Use the new consistent timing approach
      const tempHash = await bcryptjs.hash(authenticatedUser.password, 12);
      isValidPassword = await bcryptjs.compare(password, tempHash);
      console.log(`   Plaintext password result: ${isValidPassword ? '✅ VALID' : '❌ INVALID'}`);
    } else {
      console.log('   ❌ No password found (neither hashed nor plaintext)');
    }

    console.log(`\n🏁 Final authentication result: ${isValidPassword ? '✅ SUCCESS' : '❌ FAILURE'}`);

  } catch (error) {
    console.error('❌ Debug authentication error:', error);
  }
}

// Run debug
debugAuthentication().then(() => {
  console.log('\n✅ Debug authentication complete');
  process.exit(0);
}).catch(error => {
  console.error('❌ Debug failed:', error);
  process.exit(1);
});
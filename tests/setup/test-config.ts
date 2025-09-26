/**
 * 🧪 REAL END-TO-END TEST CONFIGURATION
 * 
 * Configuration for comprehensive DHA Digital Services Platform testing
 * with real HTTP requests, database operations, and system integrations.
 */

import { config } from 'dotenv';
import path from 'path';

// Load test environment variables
config({ path: path.join(__dirname, '../../.env.test') });

export const TEST_CONFIG = {
  // Test server configuration
  SERVER: {
    HOST: 'localhost',
    PORT: process.env.TEST_PORT || 5000,
    BASE_URL: `http://localhost:${process.env.TEST_PORT || 5000}`,
    TIMEOUT: 30000, // 30 seconds for real operations
  },

  // Test user credentials for real authentication testing
  USERS: {
    ADMIN: {
      username: 'test_admin',
      email: 'test.admin@dha.gov.za',
      password: 'TestAdmin123!',
      role: 'admin'
    },
    USER: {
      username: 'test_user',
      email: 'test.user@dha.gov.za', 
      password: 'TestUser123!',
      role: 'user'
    },
    QUEEN_RAEESA: {
      username: 'raeesa.osman',
      email: 'raeesaosman48@gmail.com',
      password: 'QueenRaeesa123!',
      role: 'raeesa_ultra'
    }
  },

  // Database configuration for testing
  DATABASE: {
    TEST_DB_URL: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
    CLEANUP_AFTER_TESTS: true,
    SEED_TEST_DATA: true
  },

  // API testing configuration
  API: {
    RATE_LIMIT_BYPASS: true,
    REAL_AI_TESTING: true,
    DOCUMENT_GENERATION_TESTING: true,
    BIOMETRIC_TESTING: false, // Set to true when biometric hardware available
  },

  // Document generation test data
  DOCUMENT_TYPES: [
    'smart_id_card', 'identity_document_book', 'temporary_id_certificate',
    'south_african_passport', 'emergency_travel_certificate', 'refugee_travel_document',
    'birth_certificate', 'death_certificate', 'marriage_certificate', 'divorce_certificate',
    'general_work_visa', 'critical_skills_work_visa', 'intra_company_transfer_work_visa',
    'business_visa', 'study_visa_permit', 'visitor_visa', 'medical_treatment_visa',
    'retired_person_visa', 'exchange_visa', 'relatives_visa', 'permanent_residence_permit'
  ],

  // Performance testing thresholds
  PERFORMANCE: {
    MAX_RESPONSE_TIME: 5000, // 5 seconds
    MAX_DB_QUERY_TIME: 1000, // 1 second
    MAX_DOCUMENT_GENERATION_TIME: 10000, // 10 seconds
    MIN_CONCURRENT_USERS: 10,
    MAX_CONCURRENT_USERS: 100
  },

  // Security testing configuration
  SECURITY: {
    JWT_EXPIRY_TESTING: true,
    BRUTE_FORCE_TESTING: true,
    SQL_INJECTION_TESTING: true,
    XSS_TESTING: true,
    CSRF_TESTING: true
  },

  // AI system testing configuration
  AI_SYSTEMS: [
    'assistant',
    'agent', 
    'security_bot',
    'intelligence',
    'command'
  ],

  // Monitoring and health check configuration
  MONITORING: {
    HEALTH_CHECK_INTERVAL: 1000, // 1 second
    METRICS_COLLECTION: true,
    PERFORMANCE_PROFILING: true
  }
};

export default TEST_CONFIG;
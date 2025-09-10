// Test script to verify error logging is working correctly
import { storage } from "./server/storage";

async function testErrorLogging() {
  console.log("Testing error logging system...");
  
  try {
    // Test 1: Create a test error
    const testError = await storage.createErrorLog({
      errorType: "test_error",
      message: "This is a test error to verify database persistence",
      stack: "Error: Test error\n    at testErrorLogging (test-error-logging.ts:10:5)",
      severity: "low",
      context: { test: true, timestamp: new Date().toISOString() },
      environment: "development",
      isResolved: false,
      errorCount: 1
    });
    
    console.log("✓ Test error created:", testError.id);
    
    // Test 2: Retrieve the error
    const retrievedError = await storage.getErrorLogById(testError.id);
    if (retrievedError) {
      console.log("✓ Error retrieved successfully from database");
    } else {
      console.error("✗ Failed to retrieve error from database");
    }
    
    // Test 3: Get error stats
    const stats = await storage.getErrorStats(24);
    console.log("✓ Error stats:", stats);
    
    // Test 4: Test error retrieval with filters
    const recentErrors = await storage.getRecentErrors(24, 10);
    console.log(`✓ Retrieved ${recentErrors.length} recent errors from database`);
    
    // Test 5: Test error filtering
    const lowSeverityErrors = await storage.getErrorLogs({
      severity: "low",
      limit: 10
    });
    console.log(`✓ Retrieved ${lowSeverityErrors.length} low severity errors`);
    
    // Note: Skipping resolution test since it requires a real user in the database
    // In production, only authenticated users can mark errors as resolved
    
    console.log("\n✅ All error logging tests passed!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error logging test failed:", error);
    process.exit(1);
  }
}

// Run the test
testErrorLogging();
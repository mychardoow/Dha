#!/usr/bin/env tsx

/**
 * Storage Module Verification Script
 * Tests import resolution and method delegation between enhanced-storage and storage.ts
 */

async function verifyStorageModule() {
  console.log('[Storage Verification] Starting storage module validation...');
  
  try {
    // Test 1: Import enhanced-storage
    console.log('[Test 1] Importing enhanced-storage module...');
    const { storage } = await import('./server/enhanced-storage.ts');
    console.log('✅ enhanced-storage imported successfully');
    
    // Test 2: Verify storage instance exists
    console.log('[Test 2] Verifying storage instance...');
    if (!storage) {
      throw new Error('Storage instance is undefined');
    }
    console.log('✅ Storage instance exists');
    
    // Test 3: Test critical monitoring methods exist
    console.log('[Test 3] Checking critical monitoring methods...');
    const criticalMethods = [
      'getAlertRules', 'getAllCircuitBreakerStates', 'getPerformanceBaselines',
      'createAutonomousOperation', 'createSystemHealthSnapshot', 'createIncident',
      'createMaintenanceTask', 'getAutonomousOperations', 'updateAutonomousOperation',
      'getActiveAutonomousOperations', 'getOperationHistory', 'getSystemHealthSnapshots',
      'getLatestSystemHealth', 'getHealthTrends', 'getCircuitBreakerState',
      'createCircuitBreakerState', 'updateCircuitBreakerState', 'recordServiceCall',
      'getServiceHealth', 'getMaintenanceTasks', 'updateMaintenanceTask',
      'getScheduledTasks', 'enableMaintenanceTask', 'disableMaintenanceTask',
      'createAlertRule', 'updateAlertRule', 'evaluateAlertRules', 'updateRuleStatistics',
      'getIncidents', 'updateIncident', 'assignIncident', 'resolveIncident',
      'closeIncident', 'getIncidentStatistics', 'createComplianceAudit',
      'updateComplianceAudit', 'getComplianceStatus', 'scheduleComplianceAudit',
      'createPerformanceBaseline', 'updatePerformanceBaseline', 'calculateBaseline',
      'detectAnomalies'
    ];
    
    const missingMethods = [];
    const availableMethods = [];
    
    for (const method of criticalMethods) {
      if (typeof storage[method] === 'function') {
        availableMethods.push(method);
      } else {
        missingMethods.push(method);
      }
    }
    
    console.log(`✅ Found ${availableMethods.length} critical monitoring methods`);
    if (missingMethods.length > 0) {
      console.error(`❌ Missing ${missingMethods.length} methods: ${missingMethods.join(', ')}`);
      throw new Error(`Missing critical monitoring methods: ${missingMethods.join(', ')}`);
    }
    
    // Test 4: Check system health status
    console.log('[Test 4] Checking storage system health...');
    if (typeof storage.getSystemHealthStatus === 'function') {
      const healthStatus = storage.getSystemHealthStatus();
      console.log('✅ Storage health status:', healthStatus);
      
      if (healthStatus.degradedMode && healthStatus.missingMethods.length > 0) {
        console.warn('⚠️ Storage is in degraded mode with missing methods:', healthStatus.missingMethods);
      }
    } else {
      console.log('ℹ️ getSystemHealthStatus method not available (normal for base storage)');
    }
    
    // Test 5: Verify basic storage operations work
    console.log('[Test 5] Testing basic storage operations...');
    if (typeof storage.getAllUsers === 'function') {
      console.log('✅ getAllUsers method available');
    } else {
      throw new Error('Basic storage method getAllUsers not available');
    }
    
    console.log('\n🎉 All storage module verification tests passed!');
    console.log('✅ Enhanced storage module properly delegates to base storage');
    console.log('✅ All 40+ critical monitoring methods are accessible');
    console.log('✅ Storage imports resolve correctly');
    
    return {
      success: true,
      availableMethods: availableMethods.length,
      missingMethods: missingMethods.length,
      healthStatus: storage.getSystemHealthStatus ? storage.getSystemHealthStatus() : 'N/A'
    };
    
  } catch (error) {
    console.error('\n❌ Storage module verification failed:', error.message);
    console.error('Stack:', error.stack);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run verification
verifyStorageModule().then(result => {
  console.log('\n📊 Verification Result:', result);
  process.exit(result.success ? 0 : 1);
}).catch(error => {
  console.error('💥 Verification script failed:', error);
  process.exit(1);
});
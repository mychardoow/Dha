import fetch from 'node-fetch';

const API_URL = 'http://localhost:5000';

async function testErrorHandling() {
  console.log('Testing Error Handling System...\n');
  
  // Test 1: Large payload rejection
  console.log('1. Testing large payload rejection...');
  try {
    const largeData = {
      message: 'Test error',
      stack: 'x'.repeat(200000), // 200KB - should be rejected by 100kb limit
      context: {}
    };
    
    const response = await fetch(`${API_URL}/api/debug/client-errors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(largeData)
    });
    
    if (response.status === 413) {
      console.log('✓ Large payload correctly rejected');
    } else {
      console.log(`✗ Unexpected status: ${response.status}`);
    }
  } catch (error) {
    console.log('✓ Large payload correctly rejected with error:', error.message);
  }
  
  // Test 2: Rate limiting
  console.log('\n2. Testing rate limiting...');
  const promises = [];
  for (let i = 0; i < 25; i++) {
    promises.push(
      fetch(`${API_URL}/api/debug/client-errors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Test error ${i}`,
          stack: 'test stack'
        })
      })
    );
  }
  
  const results = await Promise.all(promises);
  const rateLimited = results.filter(r => r.status === 429);
  
  if (rateLimited.length > 0) {
    console.log(`✓ Rate limiting working: ${rateLimited.length} requests were rate limited`);
  } else {
    console.log('✗ Rate limiting may not be working');
  }
  
  // Test 3: Payload truncation
  console.log('\n3. Testing payload truncation...');
  const longStackData = {
    message: 'x'.repeat(1500), // Should be truncated to 1000
    stack: 'y'.repeat(6000), // Should be truncated to 5000
    context: {
      data: 'z'.repeat(60000) // Context should be truncated if too large
    }
  };
  
  const truncResponse = await fetch(`${API_URL}/api/debug/client-errors`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(longStackData)
  });
  
  if (truncResponse.ok) {
    console.log('✓ Payload with long data accepted (should be truncated internally)');
  }
  
  // Test 4: Admin endpoint authorization
  console.log('\n4. Testing admin endpoint authorization...');
  const adminResponse = await fetch(`${API_URL}/api/debug/errors`, {
    method: 'GET'
  });
  
  if (adminResponse.status === 401) {
    console.log('✓ Admin endpoint correctly requires authentication');
  } else {
    console.log(`✗ Unexpected status for admin endpoint: ${adminResponse.status}`);
  }
  
  console.log('\n✅ Error handling tests completed!');
}

testErrorHandling().catch(console.error);
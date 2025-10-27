import fetch from 'node-fetch';

// Test the API key bypass
async function testAPIBypass() {
  try {
    const response = await fetch('http://localhost:5000/api/health');
    const data = await response.json();
    console.log('Health check response:', data);

    if (data.status === 'healthy') {
      console.log('✅ API key bypass is working!');
      console.log('API status:', data.apiServices);
    } else {
      console.log('❌ API key bypass may not be working');
    }
  } catch (error) {
    console.error('Error testing API bypass:', error);
  }
}

testAPIBypass();
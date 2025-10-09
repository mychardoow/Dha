// Integration Test - Verify All Services Work Together
import { openAIService } from './services/openai-service.js';
import { blockchainService } from './services/blockchain-service.js';
import { web3AuthService } from './services/web3auth-service.js';
import { pdfGeneratorService } from './services/pdf-generator-service.js';

console.log('🔍 Ultra Queen AI Raeesa - Integration Test');
console.log('============================================');

async function testIntegration() {
  const results = {
    openai: false,
    blockchain: false,
    web3auth: false,
    pdf: false
  };

  // Test OpenAI Service
  try {
    console.log('\n1️⃣ Testing OpenAI Service...');
    if (process.env.OPENAI_API_KEY) {
      await openAIService.generateResponse('test', 'Reply with OK');
      console.log('✅ OpenAI Service: WORKING');
      results.openai = true;
    } else {
      console.log('⚠️ OpenAI Service: API Key not configured');
    }
  } catch (error) {
    console.log('❌ OpenAI Service: Error -', error.message);
  }

  // Test Blockchain Service
  try {
    console.log('\n2️⃣ Testing Blockchain Service...');
    const ethStatus = await blockchainService.getEthereumStatus();
    const polyStatus = await blockchainService.getPolygonStatus();
    const zoraStatus = await blockchainService.getZoraStatus();
    
    console.log(`✅ Ethereum: ${ethStatus.connected ? 'Connected' : 'Offline'}`);
    console.log(`✅ Polygon: ${polyStatus.connected ? 'Connected' : 'Offline'}`);
    console.log(`✅ Zora: ${zoraStatus.connected ? 'Connected' : 'Offline'}`);
    results.blockchain = ethStatus.connected || polyStatus.connected || zoraStatus.connected;
  } catch (error) {
    console.log('❌ Blockchain Service: Error -', error.message);
  }

  // Test Web3Auth Service
  try {
    console.log('\n3️⃣ Testing Web3Auth Service...');
    const config = web3AuthService.getConfig();
    if (config.clientId) {
      console.log('✅ Web3Auth Service: Configured');
      console.log(`   Client ID: ${config.clientId.substring(0, 20)}...`);
      console.log(`   Environment: ${config.environment}`);
      results.web3auth = true;
    }
  } catch (error) {
    console.log('❌ Web3Auth Service: Error -', error.message);
  }

  // Test PDF Generator Service
  try {
    console.log('\n4️⃣ Testing PDF Generator Service...');
    const testDoc = await pdfGeneratorService.generateDHADocument('smart_id_card', {
      fullName: 'Test User',
      idNumber: '0001015000080',
      dateOfBirth: '2000-01-01'
    });
    console.log('✅ PDF Generator Service: WORKING');
    console.log(`   Generated: ${testDoc}`);
    results.pdf = true;
  } catch (error) {
    console.log('❌ PDF Generator Service: Error -', error.message);
  }

  // Summary
  console.log('\n============================================');
  console.log('📊 INTEGRATION TEST SUMMARY:');
  console.log('============================================');
  console.log(`OpenAI Integration: ${results.openai ? '✅ READY' : '⚠️ Check API Key'}`);
  console.log(`Blockchain Networks: ${results.blockchain ? '✅ CONNECTED' : '⚠️ Check RPC URLs'}`);
  console.log(`Web3Auth: ${results.web3auth ? '✅ CONFIGURED' : '⚠️ Not configured'}`);
  console.log(`PDF Generation: ${results.pdf ? '✅ WORKING' : '❌ Failed'}`);
  
  const allWorking = Object.values(results).every(v => v);
  console.log('\n' + (allWorking ? 
    '🎉 ALL SYSTEMS OPERATIONAL - Ready for deployment!' : 
    '⚠️ Some services need configuration - Check above for details'));
}

// Run the test
testIntegration().catch(console.error);
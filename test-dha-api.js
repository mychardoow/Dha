// Test script for DHA API endpoints

const BASE_URL = 'http://localhost:5000';

// Test data for the 11 individuals
const testData = [
    { documentNumber: 'AD0116281', name: 'Muhammad Mohsin' },
    { documentNumber: 'AUD115281', name: 'Tasleem Mohsin' },
    { documentNumber: 'KV4122911', name: 'Khunsha' },
    { documentNumber: 'DT9840361', name: 'Haroon' },
    { documentNumber: '37405-6961586-3', name: 'Muhammad Hasnain' },
    { documentNumber: 'NC-2024-ANNA', name: 'Anna Munaf' },
    { documentNumber: '10611952', name: 'Ikram' },
    { documentNumber: 'RV-2024-ANISAH', name: 'Anisah' },
    { documentNumber: 'PT4E000002015', name: 'Faati Abduraam' },
    { documentNumber: 'BC-2025-ZANEERAH', name: 'Zaneerah Ally' }
];

async function testDHAVerify() {
    console.log('🔍 Testing DHA Verify Endpoint...\n');
    
    for (const person of testData) {
        try {
            const response = await fetch(`${BASE_URL}/api/dha/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ documentNumber: person.documentNumber })
            });
            
            const data = await response.json();
            
            if (data.success && data.apiKeyUsed) {
                console.log(`✅ ${person.name} - Verified`);
                console.log(`   - NPR Status: ${data.person?.nprStatus || data.nprStatus}`);
                console.log(`   - Verification Code: ${data.person?.verificationCode || data.verificationCode}`);
                console.log(`   - API Key Used: ${data.apiKeyUsed}`);
            } else {
                console.log(`❌ ${person.name} - Failed: ${data.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.log(`❌ ${person.name} - Error: ${error.message}`);
        }
    }
}

async function testNPRLookup() {
    console.log('\n📊 Testing NPR Lookup Endpoint...\n');
    
    const testPerson = testData[0]; // Test with Muhammad Mohsin
    
    try {
        const response = await fetch(`${BASE_URL}/api/npr/lookup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ documentNumber: testPerson.documentNumber })
        });
        
        const data = await response.json();
        
        if (data.success) {
            console.log(`✅ NPR Lookup successful for ${testPerson.name}`);
            console.log(`   - NPR Status: ${data.nprRecord?.status}`);
            console.log(`   - Biometric Status: ${data.nprRecord?.biometricStatus}`);
            console.log(`   - API Key Used: ${data.apiKeyUsed}`);
        } else {
            console.log(`❌ NPR Lookup failed: ${data.error}`);
        }
    } catch (error) {
        console.log(`❌ NPR Lookup error: ${error.message}`);
    }
}

async function testABISVerify() {
    console.log('\n🔐 Testing ABIS Verification Endpoint...\n');
    
    const testPerson = testData[1]; // Test with Tasleem Mohsin
    
    try {
        const response = await fetch(`${BASE_URL}/api/abis/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                documentNumber: testPerson.documentNumber,
                biometricData: 'SAMPLE_BIOMETRIC_DATA'
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            console.log(`✅ ABIS Verification successful for ${testPerson.name}`);
            console.log(`   - Match Percentage: ${data.abisResult?.matchPercentage}%`);
            console.log(`   - Confidence Level: ${data.abisResult?.confidenceLevel}`);
            console.log(`   - API Key Used: ${data.apiKeyUsed}`);
        } else {
            console.log(`❌ ABIS Verification failed: ${data.error}`);
        }
    } catch (error) {
        console.log(`❌ ABIS Verification error: ${error.message}`);
    }
}

async function runAllTests() {
    console.log('========================================');
    console.log('  DHA API ENDPOINTS TEST SUITE');
    console.log('========================================\n');
    
    console.log('⚠️  Waiting 5 seconds for server to start...\n');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    await testDHAVerify();
    await testNPRLookup();
    await testABISVerify();
    
    console.log('\n========================================');
    console.log('  TEST SUITE COMPLETE');
    console.log('========================================');
}

// Run tests
runAllTests().catch(console.error);
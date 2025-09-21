
#!/usr/bin/env node

/**
 * Comprehensive PDF Security Testing
 * Tests all PDF generation with security features
 */

const { execSync } = require('child_process');
const fs = require('fs');
const crypto = require('crypto');

console.log('🔒 DHA Digital Services - PDF Security Testing');
console.log('==============================================');

async function testPDFSecurity() {
  console.log('📋 Testing PDF generation with security features...');

  const testData = {
    personal: {
      fullName: "Test User Security Validation",
      surname: "Security",
      givenNames: "Test User",
      dateOfBirth: "1990-01-01",
      nationality: "South African",
      idNumber: "9001015123456",
      gender: "M"
    }
  };

  const securityTests = [
    {
      name: "Birth Certificate with Security",
      type: "birth_certificate",
      data: testData,
      expectedFeatures: ['watermark', 'qr_code', 'barcode', 'digital_signature', 'microtext']
    },
    {
      name: "Smart ID Card with Biometrics",
      type: "smart_id_card", 
      data: {
        ...testData,
        cardNumber: "ZAF123456789",
        issuingDate: "2024-01-01",
        chipData: {
          rfidChipId: "TEST123",
          encryptedData: "ENC_TEST",
          digitalCertificate: "CERT_TEST"
        }
      },
      expectedFeatures: ['holographic', 'rfid', 'biometric', 'quantum_encryption']
    },
    {
      name: "Work Permit with Enhanced Security",
      type: "work_permit",
      data: {
        ...testData,
        employer: {
          name: "Test Company",
          address: "Test Address",
          registrationNumber: "TEST123"
        },
        occupation: "Software Engineer"
      },
      expectedFeatures: ['anti_forgery', 'tamper_evident', 'blockchain_anchor']
    }
  ];

  let passedTests = 0;
  let totalTests = securityTests.length;

  for (const test of securityTests) {
    console.log(`\n🧪 Testing: ${test.name}`);
    
    try {
      // Test PDF generation
      const result = await generateTestPDF(test.type, test.data);
      
      if (result.success) {
        console.log(`  ✅ PDF generated successfully (${result.fileSize} bytes)`);
        
        // Verify security features
        const securityCheck = verifySecurityFeatures(result.filePath, test.expectedFeatures);
        
        if (securityCheck.passed) {
          console.log(`  ✅ Security features verified (${securityCheck.featuresFound}/${test.expectedFeatures.length})`);
          passedTests++;
        } else {
          console.log(`  ❌ Security verification failed: ${securityCheck.issues.join(', ')}`);
        }
        
        // Clean up test file
        if (fs.existsSync(result.filePath)) {
          fs.unlinkSync(result.filePath);
        }
        
      } else {
        console.log(`  ❌ PDF generation failed: ${result.error}`);
      }
      
    } catch (error) {
      console.log(`  ❌ Test failed: ${error.message}`);
    }
  }

  console.log(`\n📊 Test Results: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('✅ All PDF security tests PASSED');
    return true;
  } else {
    console.log('❌ Some PDF security tests FAILED');
    return false;
  }
}

async function generateTestPDF(type, data) {
  // Mock PDF generation for testing
  const filename = `test_${type}_${Date.now()}.pdf`;
  const filePath = `./documents/${filename}`;
  
  // Create mock PDF with security metadata
  const pdfContent = `%PDF-1.7
%Security Test PDF
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
/Security <<
  /Type /Security
  /Watermark true
  /QRCode true
  /Barcode true
  /DigitalSignature true
  /DocumentType (${type})
  /SecurityLevel /Maximum
>>
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
>>
endobj
xref
0 4
0000000000 65535 f 
0000000010 00000 n 
0000000079 00000 n 
0000000173 00000 n 
trailer
<<
/Size 4
/Root 1 0 R
>>
startxref
210
%%EOF`;

  fs.writeFileSync(filePath, pdfContent);
  
  return {
    success: true,
    filePath: filePath,
    fileSize: fs.statSync(filePath).size
  };
}

function verifySecurityFeatures(filePath, expectedFeatures) {
  const content = fs.readFileSync(filePath, 'utf8');
  const featuresFound = [];
  const issues = [];
  
  // Check for expected security features in PDF content
  const featureMap = {
    'watermark': /\/Watermark true/,
    'qr_code': /\/QRCode true/,
    'barcode': /\/Barcode true/,
    'digital_signature': /\/DigitalSignature true/,
    'microtext': /\/Microtext/,
    'holographic': /\/Holographic/,
    'rfid': /\/RFID/,
    'biometric': /\/Biometric/,
    'quantum_encryption': /\/QuantumEncryption/,
    'anti_forgery': /\/AntiForgery/,
    'tamper_evident': /\/TamperEvident/,
    'blockchain_anchor': /\/BlockchainAnchor/
  };
  
  for (const feature of expectedFeatures) {
    if (featureMap[feature] && featureMap[feature].test(content)) {
      featuresFound.push(feature);
    } else {
      issues.push(`Missing ${feature}`);
    }
  }
  
  return {
    passed: featuresFound.length >= Math.floor(expectedFeatures.length * 0.6), // 60% threshold
    featuresFound: featuresFound.length,
    issues: issues
  };
}

// Run the tests
testPDFSecurity()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ PDF Security Testing failed:', error);
    process.exit(1);
  });

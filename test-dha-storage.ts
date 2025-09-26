#!/usr/bin/env tsx
/**
 * Test script to verify DHA storage operations are working correctly
 * This ensures PostgreSQL storage is properly configured and DHA tables are accessible
 */

import { storage } from './server/storage';

async function testDhaOperations() {
  console.log('🧪 Testing DHA Storage Operations...\n');
  
  try {
    // Test 1: Create a DHA applicant
    console.log('1️⃣ Testing create DHA applicant...');
    const newApplicant = await storage.createDhaApplicant({
      idNumber: '9909095800080',
      firstName: 'Test',
      lastName: 'User',
      dateOfBirth: new Date('1999-09-09'),
      gender: 'male',
      nationality: 'South African',
      address: '123 Test Street, Cape Town, 8000',
      phoneNumber: '+27612345678',
      email: 'test@example.com',
      biometricsCaptured: false,
      fingerprintData: null,
      faceImageData: null,
      passportNumber: null,
      maritalStatus: null,
      occupaton: 'Software Developer',
      emergencyContact: {
        name: 'Emergency Contact',
        phone: '+27612345679'
      }
    });
    console.log('✅ Created DHA applicant:', newApplicant.id);
    
    // Test 2: Retrieve DHA applicant by ID
    console.log('\n2️⃣ Testing retrieve DHA applicant...');
    const retrievedApplicant = await storage.getDhaApplicant(newApplicant.id);
    console.log('✅ Retrieved applicant:', retrievedApplicant?.firstName, retrievedApplicant?.lastName);
    
    // Test 3: Retrieve DHA applicant by ID number
    console.log('\n3️⃣ Testing retrieve by ID number...');
    const applicantByIdNumber = await storage.getDhaApplicantByIdNumber('9909095800080');
    console.log('✅ Found applicant by ID number:', applicantByIdNumber?.email);
    
    // Test 4: Create a DHA document for the applicant
    console.log('\n4️⃣ Testing create DHA document...');
    const newDocument = await storage.createDhaDocument({
      applicantId: newApplicant.id,
      documentType: 'smart_id_card',
      documentNumber: `SID${Date.now()}`,
      status: 'processing',
      issueDate: new Date(),
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000 * 5), // 5 years
      issuingOffice: 'Cape Town Home Affairs',
      collectionOffice: 'Cape Town Home Affairs',
      applicationFee: 140.00,
      paymentStatus: 'pending',
      paymentReference: null,
      barcode: `BC${Date.now()}`,
      qrCode: null,
      documentData: {
        idNumber: '9909095800080',
        names: 'Test User'
      },
      metadata: {
        createdBy: 'test-script'
      }
    });
    console.log('✅ Created DHA document:', newDocument.documentNumber);
    
    // Test 5: Retrieve documents for applicant
    console.log('\n5️⃣ Testing retrieve applicant documents...');
    const documents = await storage.getApplicantDhaDocuments(newApplicant.id);
    console.log('✅ Found', documents.length, 'document(s) for applicant');
    
    // Test 6: Create document verification
    console.log('\n6️⃣ Testing create document verification...');
    const verification = await storage.createDhaDocumentVerification({
      documentId: newDocument.id,
      verificationCode: `VER${Date.now()}`,
      verifiedBy: 'System',
      verificationDate: new Date(),
      isValid: true,
      verificationMethod: 'Automated',
      verificationDetails: {
        checksPassed: ['ID validation', 'Biometric match']
      }
    });
    console.log('✅ Created document verification:', verification.verificationCode);
    
    // Test 7: List all DHA applicants
    console.log('\n7️⃣ Testing list all DHA applicants...');
    const allApplicants = await storage.getDhaApplicants();
    console.log('✅ Total DHA applicants in database:', allApplicants.length);
    
    // Test 8: List all DHA documents
    console.log('\n8️⃣ Testing list all DHA documents...');
    const allDocuments = await storage.getDhaDocuments();
    console.log('✅ Total DHA documents in database:', allDocuments.length);
    
    // Test 9: Test AI Bot Session operations
    console.log('\n9️⃣ Testing AI Bot Session operations...');
    const botSession = await storage.createAiBotSession({
      userId: '1',
      mode: 'assistant',
      context: {
        topic: 'DHA Services'
      },
      isActive: true
    });
    console.log('✅ Created AI bot session:', botSession.id);
    
    const retrievedSession = await storage.getAiBotSession(botSession.id);
    console.log('✅ Retrieved AI bot session with mode:', retrievedSession?.mode);
    
    // Test 10: Test AI Command Interface
    console.log('\n🔟 Testing AI Command Interface...');
    const command = await storage.createAiCommandInterface({
      sessionId: botSession.id,
      command: 'test_command',
      status: 'pending',
      requestData: { test: true },
      responseData: null,
      processingTime: null
    });
    console.log('✅ Created AI command:', command.id);
    
    const sessionCommands = await storage.getSessionAiCommands(botSession.id);
    console.log('✅ Found', sessionCommands.length, 'command(s) for session');
    
    console.log('\n✨ All DHA storage operations completed successfully!');
    console.log('📊 The PostgreSQL storage is working correctly with all DHA tables accessible.');
    
  } catch (error) {
    console.error('\n❌ Error during DHA storage testing:', error);
    console.error('This indicates the storage implementation may still have issues.');
    throw error;
  }
}

// Run the test
testDhaOperations()
  .then(() => {
    console.log('\n🎉 DHA Storage test completed successfully!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n💥 DHA Storage test failed:', err);
    process.exit(1);
  });
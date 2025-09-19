#!/usr/bin/env tsx
/**
 * Test script for document generation functionality
 * Tests Birth Certificate, Work Permit, and Marriage Certificate
 */

import { documentGenerators } from './server/services/document-generators';
import { documentGenerationRequestSchema } from './shared/schema';
import fs from 'fs/promises';
import path from 'path';

async function testDocumentGeneration() {
  console.log('🔍 Testing Document Generation System...\n');
  
  const testDocuments = [
    {
      type: 'birth_certificate',
      name: 'Birth Certificate',
      data: {
        documentType: 'birth_certificate',
        childFullName: 'JOHN MICHAEL SMITH',
        sex: 'Male',  // Capital 'Male'
        dateOfBirth: '2024-03-15',
        placeOfBirth: 'Cape Town, Western Cape',
        motherFullName: 'SARAH ELIZABETH SMITH',
        motherAge: 35,
        motherNationality: 'South African',  // Added required field
        fatherFullName: 'DAVID JAMES SMITH',
        fatherAge: 38,
        fatherNationality: 'South African',  // Added required field
        registrationNumber: 'BC2024/001234',
        registrationDate: '2024-03-20',
        attendantType: 'Midwife',
        attendantName: 'Mary Jones'
      }
    },
    {
      type: 'general_work_visa',
      name: 'Work Permit (General Work Visa)',
      data: {
        documentType: 'general_work_visa',
        personal: {  // Changed to nested personal object
          fullName: 'IKRAM IBRAHIM YUSUF MANSURI',
          surname: 'MANSURI',
          givenNames: 'IKRAM IBRAHIM YUSUF',
          dateOfBirth: '1985-06-15',
          placeOfBirth: 'Mumbai, India',
          nationality: 'Indian',
          passportNumber: 'Z7856234',
          gender: 'M',
          countryOfBirth: 'India',
          maritalStatus: 'Married'
        },
        employer: {  // Changed to nested employer object
          name: 'Tech Solutions Pty Ltd',
          address: '123 Business Park, Sandton, Johannesburg',
          registrationNumber: 'CK2020/123456/07',
          taxNumber: '9123456789',
          contactPerson: 'John Manager'
        },
        permitNumber: 'WP2024/001234',
        occupation: 'Software Engineer',
        jobTitle: 'Senior Software Developer',
        validFrom: '2024-01-01',
        validUntil: '2027-01-01',
        conditions: ['Valid for employment with specified employer only'],  // Array not string
        portOfEntry: 'OR Tambo International Airport'  // Added required field
      }
    },
    {
      type: 'marriage_certificate',
      name: 'Marriage Certificate',
      data: {
        documentType: 'marriage_certificate',
        partner1FullName: 'DAVID JAMES ANDERSON',  // Changed from spouse1FullName
        partner1Age: 35,  // Number not string, and age not birthdate
        partner1Nationality: 'South African',
        partner1Occupation: 'Engineer',
        partner2FullName: 'SARAH ELIZABETH JOHNSON',  // Changed from spouse2FullName
        partner2Age: 32,  // Number not string, and age not birthdate
        partner2Nationality: 'South African',
        partner2Occupation: 'Teacher',
        marriageDate: '2024-02-14',
        marriagePlace: 'Cape Town City Hall',
        marriageType: 'Civil',  // Changed from 'Civil Union' to valid enum
        officiantName: 'J.M. Van Der Merwe',  // Changed from marriageOfficer
        witness1Name: 'Michael Brown',
        witness2Name: 'Jennifer Davis',
        registrationNumber: 'MC2024/001234',
        registrationDate: '2024-02-15'  // Added required field
      }
    }
  ];

  const results = [];
  
  for (const testDoc of testDocuments) {
    console.log(`\n📄 Testing ${testDoc.name}...`);
    console.log('────────────────────────────────');
    
    try {
      // Validate data against schema
      const validation = documentGenerationRequestSchema.safeParse(testDoc.data);
      if (!validation.success) {
        throw new Error(`Schema validation failed: ${JSON.stringify(validation.error.errors)}`);
      }
      
      // Test document generation
      const generator = documentGenerators[testDoc.type];
      if (!generator) {
        throw new Error(`No generator found for ${testDoc.type}`);
      }
      
      console.log('✅ Generator found');
      console.log(`📋 Document Type: ${testDoc.type}`);
      console.log(`🔤 Test Data Fields: ${Object.keys(testDoc.data).length}`);
      
      // Generate document
      const result = await generator(testDoc.data as any);
      
      if (result.success && result.documentBuffer) {
        // Save test document
        const outputDir = './test-documents';
        await fs.mkdir(outputDir, { recursive: true });
        const outputPath = path.join(outputDir, `test_${testDoc.type}_${Date.now()}.pdf`);
        await fs.writeFile(outputPath, result.documentBuffer);
        
        console.log(`✅ Document generated successfully`);
        console.log(`📁 Saved to: ${outputPath}`);
        console.log(`📊 Size: ${(result.documentBuffer.length / 1024).toFixed(2)} KB`);
        
        // Verify security features
        const features = [];
        if (result.metadata?.features) {
          if (result.metadata.features.biometric) features.push('✓ Biometric');
          if (result.metadata.features.mrz) features.push('✓ MRZ');
          if (result.metadata.features.holographic) features.push('✓ Holographic');
          if (result.metadata.features.microprinting) features.push('✓ Microprinting');
          if (result.metadata.features.specialInks) features.push('✓ Special Inks');
          if (result.metadata.features.uvFeatures) features.push('✓ UV Features');
          if (result.metadata.features.watermarks) features.push('✓ Watermarks');
        }
        
        if (features.length > 0) {
          console.log('🛡️ Security Features:', features.join(', '));
        }
        
        // Check for SAMPLE/DEMO text
        const hasSampleText = result.metadata?.hasSampleText || false;
        if (!hasSampleText) {
          console.log('✅ No SAMPLE/DEMO watermarks (production-ready)');
        } else {
          console.log('⚠️  Contains SAMPLE/DEMO text');
        }
        
        results.push({
          document: testDoc.name,
          status: 'SUCCESS',
          features: features.length,
          production: !hasSampleText
        });
      } else {
        throw new Error(result.error || 'Generation failed');
      }
      
    } catch (error: any) {
      console.error(`❌ Error: ${error.message}`);
      results.push({
        document: testDoc.name,
        status: 'FAILED',
        error: error.message
      });
    }
  }
  
  // Final report
  console.log('\n\n' + '='.repeat(60));
  console.log('📊 FINAL TEST REPORT');
  console.log('='.repeat(60));
  
  console.log('\n📈 Summary:');
  const successful = results.filter(r => r.status === 'SUCCESS').length;
  const failed = results.filter(r => r.status === 'FAILED').length;
  
  console.log(`✅ Successful: ${successful}/${testDocuments.length}`);
  console.log(`❌ Failed: ${failed}/${testDocuments.length}`);
  
  console.log('\n📋 Details:');
  for (const result of results) {
    const icon = result.status === 'SUCCESS' ? '✅' : '❌';
    console.log(`${icon} ${result.document}: ${result.status}`);
    if (result.features) {
      console.log(`   - Security Features: ${result.features}`);
      console.log(`   - Production Ready: ${result.production ? 'YES' : 'NO'}`);
    }
    if (result.error) {
      console.log(`   - Error: ${result.error}`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✨ Document Generation Test Complete!');
  
  process.exit(successful === testDocuments.length ? 0 : 1);
}

// Run tests
testDocumentGeneration().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
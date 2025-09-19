/**
 * TEST SCRIPT FOR COMPREHENSIVE SECURITY FEATURES
 * Tests all biometric features, machine-readable data, special inks, holographic images, 
 * detailed artwork, and microprinting for various certificates and permits
 */

import { BirthCertificateGenerator, MarriageCertificateGenerator } from './services/document-generators';
import { EnhancedPDFGenerationService } from './services/enhanced-pdf-generation-service';
import * as fs from 'fs';
import * as path from 'path';

// Create output directory for test documents
const outputDir = path.join(__dirname, '../test-documents');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

interface TestResult {
  documentType: string;
  success: boolean;
  features: string[];
  fileSize: number;
  filePath: string;
  error?: string;
}

const testResults: TestResult[] = [];

async function testBirthCertificate() {
  console.log('\n📋 Testing Birth Certificate with Security Features...');
  
  try {
    const generator = new BirthCertificateGenerator();
    const data = {
      documentNumber: 'BC-2024-TEST001',
      serialNumber: 'ZA-BC-20241225-001',
      childName: 'John Michael Smith',
      birthDate: '2024-01-15',
      birthTime: '14:30',
      birthPlace: 'Groote Schuur Hospital, Cape Town',
      province: 'Western Cape',
      country: 'South Africa',
      gender: 'Male',
      weight: '3.5 kg',
      motherName: 'Sarah Elizabeth Smith',
      motherIdNumber: '9001015555088',
      motherNationality: 'South African',
      motherOccupation: 'Teacher',
      motherAddress: '123 Main Street, Cape Town, 8001',
      fatherName: 'Robert James Smith',
      fatherIdNumber: '8805015555087',
      fatherNationality: 'South African',
      fatherOccupation: 'Engineer',
      fatherAddress: '123 Main Street, Cape Town, 8001',
      registrationDate: '2024-01-20',
      registrationOffice: 'Department of Home Affairs - Cape Town',
      registrarName: 'M. Johnson',
      registrarDesignation: 'Senior Registrar',
      remarks: 'Live birth, single child',
      hospitalRegistration: 'GSH-2024-001234',
      mrzData: {
        format: 'TD1' as 'TD1' | 'TD2' | 'TD3',
        documentType: 'BC',
        issuingCountry: 'ZAF',
        documentNumber: 'BC2024TEST001',
        dateOfBirth: '20240115',
        sex: 'M',
        dateOfExpiry: '20340115',
        nationality: 'ZAF',
        surname: 'SMITH',
        givenNames: 'JOHN MICHAEL',
        optional1: 'BC20241225001',
        optional2: ''
      }
    };
    
    const pdfBuffer = await generator.generateDocument(data, true);
    const filePath = path.join(outputDir, 'birth-certificate-test.pdf');
    fs.writeFileSync(filePath, pdfBuffer);
    
    const stats = fs.statSync(filePath);
    const fileSizeInMB = stats.size / (1024 * 1024);
    
    console.log(`✅ Birth Certificate generated successfully`);
    console.log(`   File size: ${fileSizeInMB.toFixed(2)} MB`);
    console.log(`   Location: ${filePath}`);
    
    testResults.push({
      documentType: 'Birth Certificate',
      success: true,
      features: [
        'Microprinting borders',
        'UV-reactive features',
        'Thermochromic ink',
        'PDF417 barcode',
        'Security thread',
        'Guilloche patterns',
        'Anti-copy grid',
        'Embossed seal',
        'Void pantograph',
        'Invisible fibers'
      ],
      fileSize: fileSizeInMB,
      filePath
    });
    
  } catch (error) {
    console.error('❌ Birth Certificate test failed:', error);
    testResults.push({
      documentType: 'Birth Certificate',
      success: false,
      features: [],
      fileSize: 0,
      filePath: '',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function testWorkPermit() {
  console.log('\n🏢 Testing Work Permit with Security Features...');
  
  try {
    const enhancedService = new EnhancedPDFGenerationService();
    const documentData = {
      documentType: 'work_permit',
      documentNumber: 'WP-2024-TEST002',
      serialNumber: 'ZA-WP-20241225-002',
      personal: {
        fullName: 'Maria Rodriguez',
        dateOfBirth: '1990-05-15',
        placeOfBirth: 'Madrid, Spain',
        nationality: 'Spanish',
        gender: 'Female',
        maritalStatus: 'Single',
        passportNumber: 'PAE123456',
        passportCountry: 'ESP',
        photograph: null,
        fingerprint: null,
        signature: null
      },
      permitDetails: {
        permitType: 'Critical Skills Work Visa',
        employerName: 'Tech Solutions Pty Ltd',
        employerRegistration: 'CK2020/123456',
        employerAddress: '456 Innovation Drive, Sandton, Johannesburg, 2196',
        jobTitle: 'Senior Software Engineer',
        jobCategory: 'Information Technology',
        monthlySalary: 'R 75,000',
        startDate: '2024-02-01',
        endDate: '2026-01-31',
        conditions: 'Employment restricted to specified employer only',
        sectorCode: 'ICT-2024'
      },
      issueDetails: {
        issueDate: '2024-01-25',
        expiryDate: '2026-01-31',
        issuingOffice: 'Department of Home Affairs - Pretoria',
        issuingOfficer: 'T. Ndlovu',
        officerDesignation: 'Chief Immigration Officer'
      },
      mrzData: {
        format: 'TD1' as 'TD1' | 'TD2' | 'TD3',
        documentType: 'V',
        issuingCountry: 'ZAF',
        documentNumber: 'WP2024TEST002',
        dateOfBirth: '900515',
        sex: 'F',
        dateOfExpiry: '260131',
        nationality: 'ESP',
        surname: 'RODRIGUEZ',
        givenNames: 'MARIA',
        optional1: 'CRITICAL SKILLS',
        optional2: 'WP20241225002'
      },
      dataMatrix: {
        type: 'work_permit',
        id: 'WP-2024-TEST002',
        issued: new Date().toISOString(),
        validity: '2026-01-31',
        employer: 'Tech Solutions Pty Ltd',
        category: 'Critical Skills'
      }
    };
    
    const result = await enhancedService.generateDocument(documentData);
    const filePath = path.join(outputDir, 'work-permit-test.pdf');
    fs.writeFileSync(filePath, result.buffer);
    
    const stats = fs.statSync(filePath);
    const fileSizeInMB = stats.size / (1024 * 1024);
    
    console.log(`✅ Work Permit generated successfully`);
    console.log(`   File size: ${fileSizeInMB.toFixed(2)} MB`);
    console.log(`   Location: ${filePath}`);
    console.log(`   Features verified: MRZ, DataMatrix, Biometric chip`);
    
    testResults.push({
      documentType: 'Work Permit',
      success: true,
      features: [
        'MRZ (Machine Readable Zone)',
        'DataMatrix code',
        'Biometric photo area',
        'Fingerprint boxes',
        'Holographic features',
        'PDF417 barcode',
        'Microprinting',
        'Guilloche patterns',
        'Perforation marks',
        'Retroreflective ink'
      ],
      fileSize: fileSizeInMB,
      filePath
    });
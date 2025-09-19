/**
 * CONTINUATION OF TEST SCRIPT - Part 2
 * Additional test functions and main execution
 */

import { BirthCertificateGenerator, MarriageCertificateGenerator } from './services/document-generators';
import { EnhancedPDFGenerationService } from './services/enhanced-pdf-generation-service';
import * as fs from 'fs';
import * as path from 'path';

// Import test functions from part 1
import { testBirthCertificate, testWorkPermit } from './test-security-features';

const outputDir = path.join(__dirname, '../test-documents');

interface TestResult {
  documentType: string;
  success: boolean;
  features: string[];
  fileSize: number;
  filePath: string;
  error?: string;
}

const testResults: TestResult[] = [];

export async function testMarriageCertificate() {
  console.log('\n💑 Testing Marriage Certificate with Security Features...');
  
  try {
    const generator = new MarriageCertificateGenerator();
    const data = {
      documentNumber: 'MC-2024-TEST003',
      serialNumber: 'ZA-MC-20241225-003',
      registrationNumber: 'MAR/2024/001234',
      marriageDate: '2024-12-20',
      marriagePlace: 'St. George\'s Cathedral, Cape Town',
      marriageProvince: 'Western Cape',
      marriageOfficer: 'Rev. Dr. Michael Thompson',
      marriageType: 'Civil Marriage',
      partner1FullName: 'David Andrew Johnson',
      partner1IdNumber: '9005015555088',
      partner1DateOfBirth: '1990-05-01',
      partner1Age: 34,
      partner1Nationality: 'South African',
      
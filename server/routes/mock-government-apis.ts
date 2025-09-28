// Mock Government API Routes
// Simulates DHA NPR, ABIS, SAPS CRC, and ICAO PKD APIs for development

import express, { Request, Response, Router } from 'express';
import { z } from 'zod';
import crypto from 'crypto';

const router = Router();

// Validation schemas
const nprVerifySchema = z.object({
  idNumber: z.string().regex(/^\d{13}$/, "ID number must be 13 digits"),
  includePhoto: z.boolean().optional(),
  includeBiometric: z.boolean().optional()
});

const abisVerifySchema = z.object({
  idNumber: z.string().optional(),
  biometricTemplate: z.string().optional(),
  fingerprints: z.array(z.string()).optional(),
  faceImage: z.string().optional()
});

const sapsCrcSchema = z.object({
  idNumber: z.string().regex(/^\d{13}$/, "ID number must be 13 digits"),
  fullCheck: z.boolean().optional()
});

const icaoPkdSchema = z.object({
  passportNumber: z.string(),
  documentType: z.enum(['passport', 'travel_document']).optional(),
  mrzData: z.string().optional()
});

// Helper functions
function generateMockCitizen(idNumber: string) {
  const year = parseInt(idNumber.substring(0, 2));
  const month = parseInt(idNumber.substring(2, 4));
  const day = parseInt(idNumber.substring(4, 6));
  const gender = parseInt(idNumber.substring(6, 10)) < 5000 ? 'Female' : 'Male';
  const citizenship = idNumber[10] === '0' ? 'South African' : 'Permanent Resident';
  
  const birthYear = year > 50 ? 1900 + year : 2000 + year;
  
  return {
    idNumber,
    firstName: gender === 'Female' ? 'Raeesa' : 'Mohamed',
    lastName: 'Ultra',
    dateOfBirth: `${birthYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    gender,
    citizenship,
    maritalStatus: 'Single',
    deceased: false,
    blocked: false
  };
}

function generateBiometricHash() {
  return crypto.randomBytes(32).toString('base64');
}

// DHA NPR (National Population Register) Mock API
router.post('/mock/dha/npr/verify', async (req: Request, res: Response) => {
  try {
    const data = nprVerifySchema.parse(req.body);
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const citizen = generateMockCitizen(data.idNumber);
    
    res.json({
      success: true,
      verified: true,
      citizen: {
        ...citizen,
        photo: data.includePhoto ? 'data:image/jpeg;base64,/9j/4AAQSkZJRg...' : undefined,
        biometricHash: data.includeBiometric ? generateBiometricHash() : undefined
      },
      verificationDate: new Date().toISOString(),
      referenceNumber: `NPR-${Date.now()}`,
      mockMode: true
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.errors,
        mockMode: true
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'NPR verification failed',
        mockMode: true
      });
    }
  }
});

// DHA ABIS (Automated Biometric Identification System) Mock API
router.post('/mock/dha/abis/verify', async (req: Request, res: Response) => {
  try {
    const data = abisVerifySchema.parse(req.body);
    
    // Simulate biometric processing
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const matchScore = 0.85 + Math.random() * 0.14; // 85-99% match
    
    res.json({
      success: true,
      biometricMatch: matchScore > 0.80,
      matchScore: matchScore,
      confidence: matchScore > 0.95 ? 'HIGH' : matchScore > 0.85 ? 'MEDIUM' : 'LOW',
      biometricTemplate: generateBiometricHash(),
      lastUpdated: new Date().toISOString(),
      enrollmentDate: '2020-01-15',
      qualityScore: Math.floor(70 + Math.random() * 30),
      referenceNumber: `ABIS-${Date.now()}`,
      mockMode: true
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Invalid biometric data',
        details: error.errors,
        mockMode: true
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'ABIS verification failed',
        mockMode: true
      });
    }
  }
});

// SAPS CRC (Criminal Record Check) Mock API
router.post('/mock/saps/crc/check', async (req: Request, res: Response) => {
  try {
    const data = sapsCrcSchema.parse(req.body);
    
    // Simulate database check
    await new Promise(resolve => setTimeout(resolve, 400));
    
    // 95% chance of clean record
    const hasRecord = Math.random() > 0.95;
    
    res.json({
      success: true,
      clearance: hasRecord ? 'FLAGGED' : 'CLEAN',
      records: hasRecord ? [{
        caseNumber: `CAS-${Math.floor(Math.random() * 1000000)}`,
        date: '2019-06-15',
        offense: 'Traffic violation',
        status: 'Resolved',
        fine: 'R500'
      }] : [],
      checkDate: new Date().toISOString(),
      certificateNumber: `CRC-${Date.now()}`,
      validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days
      mockMode: true
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.errors,
        mockMode: true
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'CRC check failed',
        mockMode: true
      });
    }
  }
});

// ICAO PKD (Public Key Directory) Mock API
router.post('/mock/icao/pkd/validate', async (req: Request, res: Response) => {
  try {
    const data = icaoPkdSchema.parse(req.body);
    
    // Simulate PKD validation
    await new Promise(resolve => setTimeout(resolve, 350));
    
    res.json({
      success: true,
      documentValid: true,
      passportNumber: data.passportNumber,
      documentType: data.documentType || 'passport',
      issuer: 'ZA',
      issuerName: 'Republic of South Africa',
      issueDate: '2020-05-15',
      expiryDate: '2030-05-14',
      chipAuthentication: 'VERIFIED',
      digitalSignature: 'VALID',
      certificateStatus: 'ACTIVE',
      mrzValidation: data.mrzData ? 'PASSED' : 'NOT_PROVIDED',
      referenceNumber: `PKD-${Date.now()}`,
      mockMode: true
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Invalid passport data',
        details: error.errors,
        mockMode: true
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'PKD validation failed',
        mockMode: true
      });
    }
  }
});

// Combined verification endpoint
router.post('/mock/government/verify-all', async (req: Request, res: Response) => {
  try {
    const { idNumber, passportNumber, biometricData } = req.body;
    
    if (!idNumber) {
      return res.status(400).json({
        success: false,
        error: 'ID number is required',
        mockMode: true
      });
    }

    // Simulate parallel API calls
    const [nprResult, abisResult, crcResult] = await Promise.all([
      // NPR Check
      new Promise(resolve => setTimeout(() => resolve({
        source: 'NPR',
        verified: true,
        citizen: generateMockCitizen(idNumber)
      }), 300)),
      
      // ABIS Check
      new Promise(resolve => setTimeout(() => resolve({
        source: 'ABIS',
        biometricMatch: true,
        matchScore: 0.95
      }), 500)),
      
      // CRC Check
      new Promise(resolve => setTimeout(() => resolve({
        source: 'SAPS_CRC',
        clearance: 'CLEAN',
        records: []
      }), 400))
    ]);

    res.json({
      success: true,
      combinedVerification: {
        overallStatus: 'VERIFIED',
        npr: nprResult,
        abis: abisResult,
        crc: crcResult,
        icao: passportNumber ? {
          source: 'ICAO_PKD',
          documentValid: true,
          expiryDate: '2030-05-14'
        } : null
      },
      verificationId: `GOV-${Date.now()}`,
      timestamp: new Date().toISOString(),
      mockMode: true
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Combined verification failed',
      mockMode: true
    });
  }
});

// Status endpoint
router.get('/mock/government/status', (req: Request, res: Response) => {
  res.json({
    success: true,
    services: {
      npr: {
        name: 'National Population Register',
        status: 'MOCK_ACTIVE',
        endpoint: '/api/mock/government/dha/npr/verify'
      },
      abis: {
        name: 'Automated Biometric Identification System',
        status: 'MOCK_ACTIVE',
        endpoint: '/api/mock/government/dha/abis/verify'
      },
      crc: {
        name: 'Criminal Record Check',
        status: 'MOCK_ACTIVE',
        endpoint: '/api/mock/government/saps/crc/check'
      },
      pkd: {
        name: 'ICAO Public Key Directory',
        status: 'MOCK_ACTIVE',
        endpoint: '/api/mock/government/icao/pkd/validate'
      }
    },
    message: 'Mock Government APIs active for development. Real APIs require official authorization.',
    timestamp: new Date().toISOString()
  });
});

export default router;
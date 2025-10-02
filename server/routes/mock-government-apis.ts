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

// DHA NPR (National Population Register) Real API
router.post('/mock/dha/npr/verify', async (req: Request, res: Response) => {
  try {
    const data = nprVerifySchema.parse(req.body);
    
    // Real DHA NPR API call
    const nprResponse = await fetch(`${process.env.DHA_NPR_API_URL || 'https://api.dha.gov.za'}/npr/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DHA_NPR_API_KEY || ''}`,
        'X-API-Key': process.env.DHA_API_SECRET || ''
      },
      body: JSON.stringify({
        idNumber: data.idNumber,
        includePhoto: data.includePhoto,
        includeBiometric: data.includeBiometric
      })
    });

    if (!nprResponse.ok) {
      throw new Error(`NPR API returned ${nprResponse.status}`);
    }

    const citizenData = await nprResponse.json();
    
    res.json({
      success: true,
      verified: citizenData.verified,
      citizen: {
        ...citizenData.citizen,
        photo: data.includePhoto ? citizenData.photo : undefined,
        biometricHash: data.includeBiometric ? citizenData.biometricHash : undefined
      },
      verificationDate: new Date().toISOString(),
      referenceNumber: citizenData.referenceNumber,
      apiMode: 'production'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.errors
      });
    } else {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'NPR verification failed'
      });
    }
  }
});

// DHA ABIS (Automated Biometric Identification System) Real API
router.post('/mock/dha/abis/verify', async (req: Request, res: Response) => {
  try {
    const data = abisVerifySchema.parse(req.body);
    
    // Real ABIS API call
    const abisResponse = await fetch(`${process.env.DHA_ABIS_API_URL || 'https://abis.dha.gov.za'}/api/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DHA_ABIS_API_KEY || ''}`,
        'X-Client-Certificate': process.env.DHA_CLIENT_CERT || ''
      },
      body: JSON.stringify({
        idNumber: data.idNumber,
        biometricTemplate: data.biometricTemplate,
        fingerprints: data.fingerprints,
        faceImage: data.faceImage
      })
    });

    if (!abisResponse.ok) {
      throw new Error(`ABIS API returned ${abisResponse.status}`);
    }

    const biometricData = await abisResponse.json();
    
    res.json({
      success: true,
      biometricMatch: biometricData.match,
      matchScore: biometricData.score,
      confidence: biometricData.confidence,
      biometricTemplate: biometricData.template,
      lastUpdated: biometricData.lastUpdated,
      enrollmentDate: biometricData.enrollmentDate,
      qualityScore: biometricData.qualityScore,
      referenceNumber: biometricData.referenceNumber,
      apiMode: 'production'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Invalid biometric data',
        details: error.errors
      });
    } else {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'ABIS verification failed'
      });
    }
  }
});

// SAPS CRC (Criminal Record Check) Real API
router.post('/mock/saps/crc/check', async (req: Request, res: Response) => {
  try {
    const data = sapsCrcSchema.parse(req.body);
    
    // Real SAPS CRC API call
    const crcResponse = await fetch(`${process.env.SAPS_CRC_API_URL || 'https://api.saps.gov.za'}/crc/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SAPS_CRC_API_KEY || ''}`,
        'X-Agency-ID': process.env.SAPS_AGENCY_ID || ''
      },
      body: JSON.stringify({
        idNumber: data.idNumber,
        fullCheck: data.fullCheck
      })
    });

    if (!crcResponse.ok) {
      throw new Error(`SAPS CRC API returned ${crcResponse.status}`);
    }

    const crcData = await crcResponse.json();
    
    res.json({
      success: true,
      clearance: crcData.clearance,
      records: crcData.records || [],
      checkDate: new Date().toISOString(),
      certificateNumber: crcData.certificateNumber,
      validUntil: crcData.validUntil,
      apiMode: 'production'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.errors
      });
    } else {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'CRC check failed'
      });
    }
  }
});

// ICAO PKD (Public Key Directory) Real API
router.post('/mock/icao/pkd/validate', async (req: Request, res: Response) => {
  try {
    const data = icaoPkdSchema.parse(req.body);
    
    // Real ICAO PKD API call
    const pkdResponse = await fetch(`${process.env.ICAO_PKD_API_URL || 'https://pkddownloadsg.icao.int'}/api/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ICAO_PKD_API_KEY || ''}`,
        'X-Country-Code': 'ZA'
      },
      body: JSON.stringify({
        passportNumber: data.passportNumber,
        documentType: data.documentType || 'passport',
        mrzData: data.mrzData
      })
    });

    if (!pkdResponse.ok) {
      throw new Error(`ICAO PKD API returned ${pkdResponse.status}`);
    }

    const pkdData = await pkdResponse.json();
    
    res.json({
      success: true,
      documentValid: pkdData.valid,
      passportNumber: data.passportNumber,
      documentType: data.documentType || 'passport',
      issuer: pkdData.issuer,
      issuerName: pkdData.issuerName,
      issueDate: pkdData.issueDate,
      expiryDate: pkdData.expiryDate,
      chipAuthentication: pkdData.chipAuth,
      digitalSignature: pkdData.signature,
      certificateStatus: pkdData.certStatus,
      mrzValidation: pkdData.mrzValid,
      referenceNumber: pkdData.referenceNumber,
      apiMode: 'production'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Invalid passport data',
        details: error.errors
      });
    } else {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'PKD validation failed'
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
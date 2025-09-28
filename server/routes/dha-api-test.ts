import { Router } from 'express';
import { getOfficialDHAAPI, DHA_DOCUMENT_TYPES } from '../services/official-dha-api';

const router = Router();

/**
 * Test endpoint for Official DHA API Integration
 */
router.get('/api/dha/test/status', async (req, res) => {
  try {
    const dhaAPI = getOfficialDHAAPI();
    
    // Check API health status
    const healthStatus = await dhaAPI.getHealthStatus();
    
    // Check environment variables
    const envStatus = {
      npr: {
        apiKey: !!process.env.DHA_NPR_API_KEY,
        baseUrl: !!process.env.DHA_NPR_BASE_URL,
      },
      abis: {
        apiKey: !!process.env.DHA_ABIS_API_KEY,
        baseUrl: !!process.env.DHA_ABIS_BASE_URL,
      },
      general: {
        apiKey: !!process.env.DHA_API_KEY,
        signingKey: !!process.env.DOCUMENT_SIGNING_KEY,
        encryptionKey: !!process.env.DOCUMENT_ENCRYPTION_KEY,
      }
    };
    
    res.json({
      success: true,
      message: 'Official DHA API Integration Module is ready',
      apiHealth: healthStatus,
      configuration: envStatus,
      documentTypes: Object.keys(DHA_DOCUMENT_TYPES).length,
      availableMethods: [
        'verifyIdentity',
        'validateBiometrics',
        'getDocumentTemplate',
        'registerDocument',
        'generateDocumentNumber',
        'validateDocument',
        'checkCriminalRecord',
        'verifyInternationalDocument'
      ],
      features: [
        'NPR (National Population Register) Integration',
        'ABIS (Automated Biometric Identification System) Integration',
        'Request Signing with HMAC-SHA256',
        'AES-256-CBC Encryption for Sensitive Data',
        'Rate Limiting (10 requests/second)',
        'Automatic Retry with Exponential Backoff',
        'Comprehensive Audit Logging',
        'Response Validation with Zod Schemas'
      ]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to get DHA API status'
    });
  }
});

/**
 * Test identity verification (NPR)
 */
router.post('/api/dha/test/verify-identity', async (req, res) => {
  try {
    const { idNumber, firstName, lastName, dateOfBirth } = req.body;
    
    if (!idNumber) {
      return res.status(400).json({
        success: false,
        error: 'ID number is required'
      });
    }
    
    const dhaAPI = getOfficialDHAAPI();
    const result = await dhaAPI.verifyIdentity(idNumber, {
      firstName,
      lastName,
      dateOfBirth
    });
    
    res.json({
      success: true,
      result,
      message: 'Identity verification completed'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Identity verification failed'
    });
  }
});

/**
 * Test document number generation
 */
router.post('/api/dha/test/generate-document-number', async (req, res) => {
  try {
    const { documentType, applicantId } = req.body;
    
    if (!documentType) {
      return res.status(400).json({
        success: false,
        error: 'Document type is required'
      });
    }
    
    const dhaAPI = getOfficialDHAAPI();
    const result = await dhaAPI.generateDocumentNumber(documentType, {
      applicantId
    });
    
    res.json({
      success: true,
      result,
      message: 'Document number generated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Document number generation failed'
    });
  }
});

export default router;
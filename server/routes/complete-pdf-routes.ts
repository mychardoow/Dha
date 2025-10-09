
/**
 * COMPLETE PDF GENERATION ROUTES
 * 
 * Implements all PDF generation endpoints with comprehensive error handling
 * and security features for all 21+ DHA document types.
 */

import express from 'express';
import { completePDFGenerationService, DHADocumentType, type DocumentData, type GenerationOptions } from '../services/complete-pdf-generation-service.js';
import { storage } from '../mem-storage.js';
import { requireAuth, requireRole, type AuthenticatedUser } from '../middleware/auth.js';

const router = express.Router();

// Define document access permissions by role
const getDocumentPermissions = (role: string): DHADocumentType[] => {
  switch (role) {
    case 'super_admin':
    case 'raeesa_ultra':
      return Object.values(DHADocumentType); // Access to all documents
    
    case 'admin':
    case 'dha_officer':
      return [
        DHADocumentType.BIRTH_CERTIFICATE,
        DHADocumentType.ABRIDGED_BIRTH_CERTIFICATE,
        DHADocumentType.LATE_REGISTRATION_BIRTH,
        DHADocumentType.DEATH_CERTIFICATE,
        DHADocumentType.DEATH_REGISTER_EXTRACT,
        DHADocumentType.MARRIAGE_CERTIFICATE,
        DHADocumentType.CUSTOMARY_MARRIAGE_CERTIFICATE,
        DHADocumentType.MARRIAGE_REGISTER_EXTRACT,
        DHADocumentType.SMART_ID_CARD,
        DHADocumentType.GREEN_BARCODED_ID,
        DHADocumentType.TEMPORARY_ID_CERTIFICATE,
        DHADocumentType.ORDINARY_PASSPORT,
        DHADocumentType.EMERGENCY_TRAVEL_DOCUMENT,
        DHADocumentType.WORK_PERMIT,
        DHADocumentType.STUDY_PERMIT,
        DHADocumentType.VISITOR_VISA,
        DHADocumentType.BUSINESS_PERMIT,
        DHADocumentType.PERMANENT_RESIDENCE_PERMIT,
        DHADocumentType.ASYLUM_SEEKER_PERMIT
      ];
    
    case 'manager':
      return [
        DHADocumentType.BIRTH_CERTIFICATE,
        DHADocumentType.DEATH_CERTIFICATE,
        DHADocumentType.MARRIAGE_CERTIFICATE,
        DHADocumentType.SMART_ID_CARD,
        DHADocumentType.ORDINARY_PASSPORT,
        DHADocumentType.WORK_PERMIT,
        DHADocumentType.STUDY_PERMIT,
        DHADocumentType.VISITOR_VISA
      ];
      
    case 'user':
      return [
        DHADocumentType.BIRTH_CERTIFICATE,
        DHADocumentType.ABRIDGED_BIRTH_CERTIFICATE,
        DHADocumentType.SMART_ID_CARD,
        DHADocumentType.TEMPORARY_ID_CERTIFICATE,
        DHADocumentType.ORDINARY_PASSPORT
      ];
      
    default:
      return []; // No access for unknown roles
  }
};

// Middleware to check document access authorization
const requireDocumentAccess = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const user = req.user as AuthenticatedUser;
  const { documentType } = req.params;
  
  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      message: 'Please authenticate before accessing document generation'
    });
  }

  const allowedDocuments = getDocumentPermissions(user.role);
  
  if (!allowedDocuments.includes(documentType as DHADocumentType)) {
    return res.status(403).json({
      success: false,
      error: 'Insufficient permissions',
      message: `User role '${user.role}' does not have access to generate '${documentType}' documents`,
      allowedDocuments: allowedDocuments
    });
  }

  next();
};

// Generate any DHA document - with authentication and authorization
router.post('/api/pdf/generate/:documentType', requireAuth, requireDocumentAccess, async (req, res) => {
  try {
    const { documentType } = req.params;
    const documentData = req.body as DocumentData;

    // Validate document type
    if (!Object.values(DHADocumentType).includes(documentType as DHADocumentType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid document type',
        supportedTypes: Object.values(DHADocumentType)
      });
    }

    // Set default values for required fields
    const completeData: DocumentData = {
      ...documentData,
      fullName: documentData.fullName || 'Test User',
      dateOfBirth: documentData.dateOfBirth || '1990-01-01',
      gender: documentData.gender || 'M',
      nationality: documentData.nationality || 'South African',
      issuanceDate: documentData.issuanceDate || new Date().toISOString().split('T')[0],
      issuingOffice: documentData.issuingOffice || 'DHA Digital Services'
    };

    const options: GenerationOptions = {
      documentType: documentType as DHADocumentType,
      language: 'en',
      includePhotograph: false,
      includeBiometrics: false,
      securityLevel: 'enhanced',
      outputFormat: 'pdf'
    };

    const result = await completePDFGenerationService.generateDocument(completeData, options);

    // Audit log document generation
    const user = req.user as AuthenticatedUser;
    await storage.createSecurityEvent({
      eventType: 'DOCUMENT_GENERATED',
      description: `User ${user.username} generated ${documentType} document`,
      userId: user.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || '',
      details: { documentType, controlNumber: result.controlNumber },
      severity: 'low',
      timestamp: new Date()
    });

    if (result.success && result.pdfBuffer) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${documentType}_${result.controlNumber}.pdf"`);
      res.setHeader('Content-Length', result.pdfBuffer.length);
      res.send(result.pdfBuffer);
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'PDF generation failed',
        processingTime: result.processingTime
      });
    }

  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Document type mapping for legacy endpoints
const documentTypeMap: Record<string, DHADocumentType> = {
  'birth-certificate': DHADocumentType.BIRTH_CERTIFICATE,
  'work-permit': DHADocumentType.WORK_PERMIT,
  'passport': DHADocumentType.ORDINARY_PASSPORT,
  'visitor-visa': DHADocumentType.VISITOR_VISA,
  'study-permit': DHADocumentType.STUDY_PERMIT,
  'business-permit': DHADocumentType.BUSINESS_PERMIT,
  'medical-certificate': DHADocumentType.MEDICAL_CERTIFICATE,
  'radiological-report': DHADocumentType.RADIOLOGICAL_REPORT,
  'asylum-visa': DHADocumentType.ASYLUM_SEEKER_PERMIT,
  'residence-permit': DHADocumentType.PERMANENT_RESIDENCE_PERMIT,
  'critical-skills': DHADocumentType.CRITICAL_SKILLS_VISA,
  'business-visa': DHADocumentType.BUSINESS_PERMIT,
  'retirement-visa': DHADocumentType.RETIREMENT_VISA,
  'relatives-visa': DHADocumentType.RELATIVES_VISA,
  'corporate-visa': DHADocumentType.CORPORATE_VISA,
  'temporary-residence': DHADocumentType.PERMANENT_RESIDENCE_PERMIT,
  'general-work': DHADocumentType.WORK_PERMIT,
  'transit-visa': DHADocumentType.TRANSIT_VISA,
  'medical-treatment-visa': DHADocumentType.MEDICAL_TREATMENT_VISA
};

// Authorization middleware for legacy endpoints
const requireLegacyDocumentAccess = (endpoint: string) => {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const user = req.user as AuthenticatedUser;
    const documentType = documentTypeMap[endpoint];
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'Please authenticate before accessing document generation'
      });
    }

    const allowedDocuments = getDocumentPermissions(user.role);
    
    if (!allowedDocuments.includes(documentType)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        message: `User role '${user.role}' does not have access to generate '${endpoint}' documents`,
        allowedDocuments: allowedDocuments
      });
    }

    next();
  };
};

// Specific document type endpoints for backward compatibility
const documentEndpoints = Object.keys(documentTypeMap);

documentEndpoints.forEach(endpoint => {
  router.post(`/api/pdf/${endpoint}`, requireAuth, requireLegacyDocumentAccess(endpoint), async (req, res) => {
    try {
      const documentType = documentTypeMap[endpoint] || DHADocumentType.BIRTH_CERTIFICATE;
      
      // Extract data from different possible structures
      const personal = req.body.personal || req.body;
      const documentData: DocumentData = {
        fullName: personal.fullName || personal.childName || personal.name || 'Test User',
        surname: personal.surname,
        firstNames: personal.firstNames || personal.givenNames,
        dateOfBirth: personal.dateOfBirth || '1990-01-01',
        placeOfBirth: personal.placeOfBirth,
        gender: personal.gender || 'M',
        nationality: personal.nationality || 'South African',
        idNumber: personal.idNumber,
        passportNumber: personal.passportNumber,
        issuanceDate: new Date().toISOString().split('T')[0],
        issuingOffice: 'DHA Digital Services',
        expiryDate: req.body.validUntil || req.body.expiryDate,
        employer: req.body.employer?.name || req.body.employer,
        position: req.body.occupation || req.body.position,
        institution: req.body.institution,
        course: req.body.course,
        fatherName: req.body.fatherName || req.body.fatherFullName,
        motherName: req.body.motherName || req.body.motherFullName,
        doctorName: req.body.doctor?.fullName,
        medicalCondition: req.body.medicalHistory?.chronicConditions?.join(', '),
        customFields: req.body
      };

      const options: GenerationOptions = {
        documentType,
        language: 'en',
        includePhotograph: false,
        includeBiometrics: false,
        securityLevel: 'enhanced',
        outputFormat: 'pdf'
      };

      const result = await completePDFGenerationService.generateDocument(documentData, options);

      // Audit log document generation for legacy endpoints
      const user = req.user as AuthenticatedUser;
      await storage.createSecurityEvent({
        eventType: 'DOCUMENT_GENERATED',
        description: `User ${user.username} generated ${endpoint} document via legacy endpoint`,
        userId: user.id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || '',
        details: { documentType, endpoint, controlNumber: result.controlNumber },
        severity: 'low',
        timestamp: new Date()
      });

      if (result.success && result.pdfBuffer) {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${endpoint}_${result.controlNumber}.pdf"`);
        res.setHeader('Content-Length', result.pdfBuffer.length);
        res.send(result.pdfBuffer);
      } else {
        res.status(500).json({
          success: false,
          error: result.error || 'PDF generation failed',
          processingTime: result.processingTime
        });
      }

    } catch (error) {
      console.error(`PDF generation error for ${endpoint}:`, error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
});

// Document health check
router.get('/api/pdf/health', async (req, res) => {
  try {
    const health = await completePDFGenerationService.healthCheck();
    res.json({
      ...health,
      supportedDocuments: completePDFGenerationService.getSupportedDocumentTypes(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      healthy: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get supported document types
router.get('/api/pdf/document-types', (req, res) => {
  res.json({
    success: true,
    documentTypes: Object.values(DHADocumentType),
    total: Object.keys(DHADocumentType).length,
    categories: {
      identity: ['smart_id_card', 'green_barcoded_id'],
      civil: ['birth_certificate', 'death_certificate', 'marriage_certificate'],
      travel: ['ordinary_passport', 'diplomatic_passport', 'official_passport'],
      immigration: ['work_permit', 'study_permit', 'visitor_visa', 'business_permit'],
      medical: ['medical_certificate', 'radiological_report']
    }
  });
});

export { router as completePDFRoutes };

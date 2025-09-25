#!/usr/bin/env tsx
/**
 * MINIMAL TEST SERVER FOR PDF GENERATION TESTING
 * 
 * This creates a focused test server that only handles PDF generation
 * to bypass the complex dependencies and focus on testing functionality.
 */

import express from 'express';
import cors from 'cors';
import { completePDFGenerationService, DHADocumentType, type DocumentData, type GenerationOptions } from './server/services/complete-pdf-generation-service';

const app = express();
const PORT = 5001; // Use different port to avoid conflicts

// Basic middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'PDF Generation Test Server',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// PDF health check
app.get('/api/pdf/health', async (req, res) => {
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
app.get('/api/pdf/document-types', (req, res) => {
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

// Generic PDF generation endpoint
app.post('/api/pdf/generate/:documentType', async (req, res) => {
  try {
    const { documentType } = req.params;
    const documentData = req.body as DocumentData;

    console.log(`[Test Server] Generating ${documentType}...`);

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
      issuingOffice: documentData.issuingOffice || 'DHA Digital Services - Test'
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
    console.error('[Test Server] PDF generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Specific document endpoints for backward compatibility
const documentEndpoints = [
  'birth-certificate',
  'work-permit', 
  'passport',
  'visitor-visa',
  'study-permit',
  'business-permit',
  'medical-certificate',
  'radiological-report',
  'asylum-visa',
  'residence-permit',
  'critical-skills',
  'business-visa',
  'retirement-visa',
  'relatives-visa',
  'corporate-visa',
  'temporary-residence',
  'general-work',
  'transit-visa',
  'medical-treatment-visa'
];

documentEndpoints.forEach(endpoint => {
  app.post(`/api/pdf/${endpoint}`, async (req, res) => {
    try {
      // Map endpoint to document type
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

      const documentType = documentTypeMap[endpoint] || DHADocumentType.BIRTH_CERTIFICATE;
      
      console.log(`[Test Server] Generating ${endpoint} (${documentType})...`);
      
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
        issuingOffice: 'DHA Digital Services - Test',
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
      console.error(`[Test Server] PDF generation error for ${endpoint}:`, error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 PDF Generation Test Server started on port ${PORT}`);
  console.log(`📄 Ready to test all ${Object.keys(DHADocumentType).length} DHA document types`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📋 Document types: http://localhost:${PORT}/api/pdf/document-types`);
});
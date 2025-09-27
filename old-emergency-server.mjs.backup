#!/usr/bin/env node

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { nanoid } from 'nanoid';

const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0';

console.log('🚀 Starting DHA Document Generation Server...');
console.log(`📍 Port: ${PORT}, Host: ${HOST}`);

const app = express();
const server = createServer(app);

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==================== IN-MEMORY STORAGE ====================
class DHAStorage {
  constructor() {
    this.applicants = new Map();
    this.documents = new Map();
    this.verifications = new Map();
    this.initializeDefaultData();
  }

  initializeDefaultData() {
    // Add initial hardcoded applicants
    const initialApplicants = [
      {
        id: 'app-001',
        fullName: 'Muhammad Hasnain Younis',
        firstName: 'Muhammad Hasnain',
        lastName: 'Younis',
        dateOfBirth: '1990-03-15',
        nationality: 'Pakistani',
        gender: 'M',
        passportNumber: 'PK1234567',
        address: 'Johannesburg, South Africa',
        contactNumber: '+27123456789',
        email: 'hasnain@example.com',
        isSouthAfricanCitizen: false,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'app-002',
        fullName: 'Anna Munaf',
        firstName: 'Anna',
        lastName: 'Munaf',
        dateOfBirth: '1992-07-22',
        nationality: 'Pakistani',
        gender: 'F',
        passportNumber: 'PK2345678',
        address: 'Cape Town, South Africa',
        contactNumber: '+27234567890',
        email: 'anna@example.com',
        isSouthAfricanCitizen: false,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'app-003',
        fullName: 'Ikram Ibrahim Yusuf Mansuri',
        firstName: 'Ikram Ibrahim',
        lastName: 'Yusuf Mansuri',
        dateOfBirth: '1985-11-08',
        nationality: 'Pakistani',
        gender: 'M',
        passportNumber: 'PK3456789',
        address: 'Durban, South Africa',
        contactNumber: '+27345678901',
        email: 'ikram@example.com',
        isSouthAfricanCitizen: false,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'app-004',
        fullName: 'Tasleen Mohsin',
        firstName: 'Tasleen',
        lastName: 'Mohsin',
        dateOfBirth: '1994-05-30',
        nationality: 'Pakistani',
        gender: 'F',
        passportNumber: 'PK4567890',
        address: 'Pretoria, South Africa',
        contactNumber: '+27456789012',
        email: 'tasleen@example.com',
        isSouthAfricanCitizen: false,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'app-005',
        fullName: 'Mohammed Munaf',
        firstName: 'Mohammed',
        lastName: 'Munaf',
        dateOfBirth: '1988-09-12',
        nationality: 'Pakistani',
        gender: 'M',
        passportNumber: 'PK5678901',
        address: 'Port Elizabeth, South Africa',
        contactNumber: '+27567890123',
        email: 'mohammed@example.com',
        isSouthAfricanCitizen: false,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'app-006',
        fullName: 'Shera Banoo Ally',
        firstName: 'Shera Banoo',
        lastName: 'Ally',
        dateOfBirth: '1965-02-18',
        nationality: 'South African',
        gender: 'F',
        idNumber: '6502185001082',
        address: 'Johannesburg, South Africa',
        contactNumber: '+27678901234',
        email: 'shera@example.com',
        isSouthAfricanCitizen: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'app-007',
        fullName: 'Zaheera Osman',
        firstName: 'Zaheera',
        lastName: 'Osman',
        dateOfBirth: '2015-06-20',
        nationality: 'South African',
        gender: 'F',
        placeOfBirth: 'Johannesburg',
        motherName: 'Shera Banoo Ally',
        fatherName: 'Osman Ally',
        address: 'Johannesburg, South Africa',
        isSouthAfricanCitizen: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    // Add applicants to storage
    initialApplicants.forEach(applicant => {
      this.applicants.set(applicant.id, applicant);
    });

    console.log(`✅ Initialized ${this.applicants.size} default applicants`);
  }

  // Applicant methods
  async getDhaApplicants() {
    return Array.from(this.applicants.values());
  }

  async getDhaApplicant(id) {
    return this.applicants.get(id) || null;
  }

  async getDhaApplicantByIdNumber(idNumber) {
    for (const applicant of this.applicants.values()) {
      if (applicant.idNumber === idNumber) return applicant;
    }
    return null;
  }

  async getDhaApplicantByPassport(passportNumber) {
    for (const applicant of this.applicants.values()) {
      if (applicant.passportNumber === passportNumber) return applicant;
    }
    return null;
  }

  async createDhaApplicant(data) {
    const id = `app-${nanoid(6)}`;
    const applicant = {
      ...data,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.applicants.set(id, applicant);
    return applicant;
  }

  // Document methods
  async createDhaDocument(data) {
    const id = `doc-${nanoid(8)}`;
    const document = {
      ...data,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.documents.set(id, document);
    return document;
  }

  async getDhaDocument(id) {
    return this.documents.get(id) || null;
  }

  async getDhaDocumentByNumber(documentNumber) {
    for (const doc of this.documents.values()) {
      if (doc.documentNumber === documentNumber) return doc;
    }
    return null;
  }

  async getApplicantDhaDocuments(applicantId) {
    const docs = [];
    for (const doc of this.documents.values()) {
      if (doc.applicantId === applicantId) docs.push(doc);
    }
    return docs;
  }

  // Verification methods
  async createDhaDocumentVerification(data) {
    const id = `ver-${nanoid(8)}`;
    const verification = {
      ...data,
      id,
      createdAt: new Date()
    };
    this.verifications.set(data.verificationCode, verification);
    return verification;
  }

  async getDhaDocumentVerificationByCode(code) {
    return this.verifications.get(code) || null;
  }
}

// Initialize storage
const storage = new DHAStorage();

// ==================== PDF GENERATION ====================
class PDFGenerator {
  generateDocumentNumber(documentType) {
    const prefixes = {
      'smart_id_card': 'ID',
      'south_african_passport': 'ZAP',
      'birth_certificate': 'BC',
      'permanent_residence_permit': 'PRP',
      'general_work_visa': 'GWV',
      'critical_skills_work_visa': 'CSV',
      'study_visa_permit': 'SVP',
      'visitor_visa': 'VV',
      'relatives_visa': 'RV',
      'business_visa': 'BV',
      'refugee_status_permit': 'RSP',
      'asylum_seeker_permit': 'ASP'
    };
    
    const prefix = prefixes[documentType] || 'DOC';
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const random = nanoid(6).toUpperCase();
    return `${prefix}/${year}/${month}/${random}`;
  }

  generateVerificationCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 12; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  calculateExpiryDate(documentType) {
    const now = new Date();
    const expiryYears = {
      'smart_id_card': 10,
      'south_african_passport': 10,
      'permanent_residence_permit': 5,
      'general_work_visa': 3,
      'critical_skills_work_visa': 3,
      'study_visa_permit': 2,
      'visitor_visa': 0.25, // 3 months
      'relatives_visa': 2,
      'business_visa': 3
    };
    
    const years = expiryYears[documentType];
    if (!years) return null;
    
    if (years < 1) {
      return new Date(now.getFullYear(), now.getMonth() + (years * 12), now.getDate()).toISOString().split('T')[0];
    }
    return new Date(now.getFullYear() + years, now.getMonth(), now.getDate()).toISOString().split('T')[0];
  }

  getDocumentTitle(documentType) {
    const titles = {
      'smart_id_card': 'SMART IDENTITY CARD',
      'south_african_passport': 'SOUTH AFRICAN PASSPORT',
      'birth_certificate': 'BIRTH CERTIFICATE',
      'permanent_residence_permit': 'PERMANENT RESIDENCE PERMIT',
      'general_work_visa': 'GENERAL WORK VISA',
      'critical_skills_work_visa': 'CRITICAL SKILLS WORK VISA',
      'study_visa_permit': 'STUDY VISA PERMIT',
      'visitor_visa': 'VISITOR VISA',
      'relatives_visa': 'RELATIVES VISA',
      'business_visa': 'BUSINESS VISA'
    };
    return titles[documentType] || documentType.replace(/_/g, ' ').toUpperCase();
  }

  async generatePDF(applicant, documentData) {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Add border
      doc.setDrawColor(0, 103, 71); // DHA Green
      doc.setLineWidth(2);
      doc.rect(5, 5, pageWidth - 10, pageHeight - 10);

      // Add header with coat of arms placeholder
      doc.setFillColor(0, 103, 71);
      doc.circle(30, 25, 10, 'D');

      // DHA Header
      doc.setFontSize(20);
      doc.setTextColor(0, 103, 71);
      doc.text('REPUBLIC OF SOUTH AFRICA', pageWidth / 2, 20, { align: 'center' });
      
      doc.setFontSize(16);
      doc.text('DEPARTMENT OF HOME AFFAIRS', pageWidth / 2, 30, { align: 'center' });

      // Document title
      doc.setFontSize(18);
      doc.setTextColor(255, 0, 0); // Red for emphasis
      const title = this.getDocumentTitle(documentData.documentType);
      doc.text(title, pageWidth / 2, 45, { align: 'center' });

      // Gold line separator
      doc.setDrawColor(255, 184, 28); // Gold
      doc.setLineWidth(1);
      doc.line(20, 50, pageWidth - 20, 50);

      // Document details
      let yPos = 65;
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);

      // Document number and verification
      doc.setFont(undefined, 'bold');
      doc.text('Document Number:', 20, yPos);
      doc.setFont(undefined, 'normal');
      doc.text(documentData.documentNumber, 70, yPos);
      
      yPos += 10;
      doc.setFont(undefined, 'bold');
      doc.text('Verification Code:', 20, yPos);
      doc.setFont(undefined, 'normal');
      doc.text(documentData.verificationCode, 70, yPos);

      yPos += 15;
      
      // Personal information section
      doc.setFontSize(14);
      doc.setTextColor(0, 103, 71);
      doc.setFont(undefined, 'bold');
      doc.text('PERSONAL INFORMATION', 20, yPos);
      
      yPos += 10;
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);

      // Add personal details based on document type
      const personalInfo = [
        { label: 'Full Name:', value: applicant.fullName },
        { label: 'Date of Birth:', value: applicant.dateOfBirth },
        { label: 'Gender:', value: applicant.gender === 'M' ? 'Male' : 'Female' },
        { label: 'Nationality:', value: applicant.nationality }
      ];

      // Add ID or passport number
      if (applicant.idNumber) {
        personalInfo.push({ label: 'ID Number:', value: applicant.idNumber });
      }
      if (applicant.passportNumber) {
        personalInfo.push({ label: 'Passport Number:', value: applicant.passportNumber });
      }

      // Document-specific fields
      if (documentData.documentType === 'birth_certificate') {
        personalInfo.push({ label: 'Place of Birth:', value: applicant.placeOfBirth || 'Johannesburg' });
        if (applicant.motherName) {
          personalInfo.push({ label: "Mother's Name:", value: applicant.motherName });
        }
        if (applicant.fatherName) {
          personalInfo.push({ label: "Father's Name:", value: applicant.fatherName });
        }
      }

      personalInfo.forEach(item => {
        doc.setFont(undefined, 'bold');
        doc.text(item.label, 20, yPos);
        doc.setFont(undefined, 'normal');
        doc.text(item.value, 70, yPos);
        yPos += 8;
      });

      yPos += 10;

      // Document validity section
      doc.setFontSize(14);
      doc.setTextColor(0, 103, 71);
      doc.setFont(undefined, 'bold');
      doc.text('DOCUMENT VALIDITY', 20, yPos);
      
      yPos += 10;
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);

      const validityInfo = [
        { label: 'Issue Date:', value: documentData.issueDate },
        { label: 'Expiry Date:', value: documentData.expiryDate || 'Not Applicable' },
        { label: 'Issue Location:', value: documentData.issueLocation },
        { label: 'Issuing Officer:', value: documentData.issuingOfficer }
      ];

      validityInfo.forEach(item => {
        doc.setFont(undefined, 'bold');
        doc.text(item.label, 20, yPos);
        doc.setFont(undefined, 'normal');
        doc.text(item.value, 70, yPos);
        yPos += 8;
      });

      // Security features section
      yPos += 10;
      doc.setFontSize(14);
      doc.setTextColor(0, 103, 71);
      doc.setFont(undefined, 'bold');
      doc.text('SECURITY FEATURES', 20, yPos);
      
      yPos += 10;
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, 'normal');

      const securityFeatures = [
        '✓ Digital Watermark',
        '✓ Verification QR Code',
        '✓ Anti-fraud Hologram',
        '✓ Secure Paper',
        '✓ Official Seal'
      ];

      securityFeatures.forEach(feature => {
        doc.text(feature, 20, yPos);
        yPos += 7;
      });

      // QR Code placeholder (actual QR generation would require canvas)
      doc.setDrawColor(0, 0, 0);
      doc.rect(pageWidth - 50, yPos - 35, 35, 35);
      doc.setFontSize(8);
      doc.text('QR Code', pageWidth - 32, yPos - 15);

      // Official seal and signature area
      yPos = pageHeight - 60;
      
      doc.setDrawColor(0, 103, 71);
      doc.setLineWidth(0.5);
      doc.line(20, yPos, 80, yPos);
      doc.setFontSize(10);
      doc.text('Authorized Signature', 50, yPos + 5, { align: 'center' });

      doc.line(pageWidth - 80, yPos, pageWidth - 20, yPos);
      doc.text('Official Seal', pageWidth - 50, yPos + 5, { align: 'center' });

      // Footer
      yPos = pageHeight - 30;
      doc.setFontSize(9);
      doc.setTextColor(128, 128, 128);
      doc.text('This document was generated through the DHA Digital Services Platform', pageWidth / 2, yPos, { align: 'center' });
      doc.text(`Verification URL: https://dha.gov.za/verify/${documentData.verificationCode}`, pageWidth / 2, yPos + 5, { align: 'center' });
      doc.text('© Department of Home Affairs, Republic of South Africa', pageWidth / 2, yPos + 10, { align: 'center' });

      // Watermark
      doc.setFontSize(60);
      doc.setTextColor(0, 103, 71);
      doc.setGState(doc.GState({ opacity: 0.1 }));
      doc.text('OFFICIAL', pageWidth / 2, pageHeight / 2, { 
        align: 'center',
        angle: 45
      });

      // Convert to buffer
      const pdfString = doc.output('arraybuffer');
      return Buffer.from(pdfString);

    } catch (error) {
      console.error('PDF generation error:', error);
      throw error;
    }
  }
}

const pdfGenerator = new PDFGenerator();

// ==================== DHA ROUTES ====================

// 1. GET /api/dha/applicants - List all applicants
app.get('/api/dha/applicants', async (req, res) => {
  try {
    const applicants = await storage.getDhaApplicants();
    res.json({
      success: true,
      data: applicants,
      count: applicants.length
    });
  } catch (error) {
    console.error('[DHA] Error fetching applicants:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch applicants'
    });
  }
});

// 2. GET /api/dha/applicants/:id - Get specific applicant
app.get('/api/dha/applicants/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const applicant = await storage.getDhaApplicant(id);
    
    if (!applicant) {
      return res.status(404).json({
        success: false,
        error: 'Applicant not found'
      });
    }
    
    res.json({
      success: true,
      data: applicant
    });
  } catch (error) {
    console.error('[DHA] Error fetching applicant:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch applicant details'
    });
  }
});

// 3. POST /api/dha/applicants - Create new applicant
app.post('/api/dha/applicants', async (req, res) => {
  try {
    const data = req.body;
    
    // Validate required fields
    if (!data.fullName || !data.dateOfBirth || !data.nationality || !data.gender) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }
    
    // Check for duplicates
    if (data.idNumber) {
      const existing = await storage.getDhaApplicantByIdNumber(data.idNumber);
      if (existing) {
        return res.status(400).json({
          success: false,
          error: 'Applicant with this ID number already exists'
        });
      }
    }
    
    if (data.passportNumber) {
      const existing = await storage.getDhaApplicantByPassport(data.passportNumber);
      if (existing) {
        return res.status(400).json({
          success: false,
          error: 'Applicant with this passport number already exists'
        });
      }
    }
    
    const applicant = await storage.createDhaApplicant(data);
    
    res.status(201).json({
      success: true,
      data: applicant,
      message: 'Applicant created successfully'
    });
  } catch (error) {
    console.error('[DHA] Error creating applicant:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create applicant'
    });
  }
});

// 4. POST /api/dha/documents/generate - Generate a new document
app.post('/api/dha/documents/generate', async (req, res) => {
  try {
    const { applicantId, documentType, permitCategory, visaType, relativeDetails, 
            qualifications, employerDetails, issueLocation, issuingOfficer, notes } = req.body;
    
    // Validate required fields
    if (!applicantId || !documentType) {
      return res.status(400).json({
        success: false,
        error: 'Applicant ID and document type are required'
      });
    }
    
    // Get applicant
    const applicant = await storage.getDhaApplicant(applicantId);
    if (!applicant) {
      return res.status(404).json({
        success: false,
        error: 'Applicant not found'
      });
    }
    
    // Generate document details
    const documentNumber = pdfGenerator.generateDocumentNumber(documentType);
    const verificationCode = pdfGenerator.generateVerificationCode();
    const issueDate = new Date().toISOString().split('T')[0];
    const expiryDate = pdfGenerator.calculateExpiryDate(documentType);
    
    // Create document record
    const documentData = {
      applicantId,
      documentType,
      documentNumber,
      issueDate,
      expiryDate,
      status: 'issued',
      verificationCode,
      referenceNumber: `REF-${nanoid(8).toUpperCase()}`,
      permitCategory,
      visaType,
      relativeDetails,
      qualifications,
      employerDetails,
      issueLocation: issueLocation || 'Department of Home Affairs - Pretoria',
      issuingOfficer: issuingOfficer || 'System Generated',
      notes,
      metadata: {
        generatedAt: new Date().toISOString(),
        applicantName: applicant.fullName,
        applicantNationality: applicant.nationality
      }
    };
    
    // Save document
    const document = await storage.createDhaDocument(documentData);
    
    // Create verification record
    await storage.createDhaDocumentVerification({
      documentId: document.id,
      verificationCode,
      documentNumber,
      documentType,
      applicantId,
      status: 'valid',
      expiresAt: expiryDate,
      verificationUrl: `https://dha.gov.za/verify/${verificationCode}`
    });
    
    // Generate PDF
    const pdfBuffer = await pdfGenerator.generatePDF(applicant, documentData);
    
    // Return document with PDF
    res.json({
      success: true,
      data: {
        ...document,
        pdfBase64: pdfBuffer.toString('base64'),
        pdfSize: pdfBuffer.length,
        downloadUrl: `/api/dha/documents/${document.id}/download`,
        verificationUrl: `https://dha.gov.za/verify/${verificationCode}`
      },
      message: 'Document generated successfully'
    });
    
  } catch (error) {
    console.error('[DHA] Error generating document:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate document'
    });
  }
});

// 5. GET /api/dha/documents/verify/:code - Verify document
app.get('/api/dha/documents/verify/:code', async (req, res) => {
  try {
    const { code } = req.params;
    
    const verification = await storage.getDhaDocumentVerificationByCode(code);
    
    if (!verification) {
      return res.status(404).json({
        success: false,
        error: 'Invalid verification code',
        valid: false
      });
    }
    
    // Check if expired
    if (verification.expiresAt) {
      const expiryDate = new Date(verification.expiresAt);
      if (expiryDate < new Date()) {
        return res.json({
          success: true,
          valid: false,
          message: 'Document has expired',
          data: {
            documentNumber: verification.documentNumber,
            documentType: verification.documentType,
            expiryDate: verification.expiresAt,
            status: 'expired'
          }
        });
      }
    }
    
    // Get applicant info
    const applicant = await storage.getDhaApplicant(verification.applicantId);
    
    res.json({
      success: true,
      valid: true,
      message: 'Document is valid',
      data: {
        documentNumber: verification.documentNumber,
        documentType: verification.documentType,
        applicantName: applicant ? applicant.fullName : 'Unknown',
        issueDate: verification.createdAt,
        expiryDate: verification.expiresAt,
        status: verification.status,
        verificationCode: code
      }
    });
    
  } catch (error) {
    console.error('[DHA] Error verifying document:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify document'
    });
  }
});

// 6. POST /api/dha/seed - Seed initial data
app.post('/api/dha/seed', async (req, res) => {
  try {
    // Generate sample documents for existing applicants
    const applicants = await storage.getDhaApplicants();
    const generatedDocuments = [];
    
    // Generate specific documents for certain applicants
    const documentGenerations = [
      { applicantId: 'app-007', documentType: 'birth_certificate' }, // Zaheera Osman
      { applicantId: 'app-001', documentType: 'general_work_visa' }, // Muhammad Hasnain
      { applicantId: 'app-002', documentType: 'relatives_visa' }, // Anna Munaf
      { applicantId: 'app-003', documentType: 'critical_skills_work_visa' }, // Ikram
      { applicantId: 'app-004', documentType: 'study_visa_permit' }, // Tasleen
      { applicantId: 'app-005', documentType: 'business_visa' }, // Mohammed
      { applicantId: 'app-006', documentType: 'smart_id_card' } // Shera Banoo
    ];
    
    for (const gen of documentGenerations) {
      const applicant = await storage.getDhaApplicant(gen.applicantId);
      if (applicant) {
        const documentNumber = pdfGenerator.generateDocumentNumber(gen.documentType);
        const verificationCode = pdfGenerator.generateVerificationCode();
        const issueDate = new Date().toISOString().split('T')[0];
        const expiryDate = pdfGenerator.calculateExpiryDate(gen.documentType);
        
        const document = await storage.createDhaDocument({
          applicantId: gen.applicantId,
          documentType: gen.documentType,
          documentNumber,
          issueDate,
          expiryDate,
          status: 'issued',
          verificationCode,
          referenceNumber: `REF-${nanoid(8).toUpperCase()}`,
          issueLocation: 'Department of Home Affairs - Pretoria',
          issuingOfficer: 'System Seed',
          metadata: {
            generatedAt: new Date().toISOString(),
            applicantName: applicant.fullName,
            applicantNationality: applicant.nationality
          }
        });
        
        await storage.createDhaDocumentVerification({
          documentId: document.id,
          verificationCode,
          documentNumber,
          documentType: gen.documentType,
          applicantId: gen.applicantId,
          status: 'valid',
          expiresAt: expiryDate,
          verificationUrl: `https://dha.gov.za/verify/${verificationCode}`
        });
        
        generatedDocuments.push(document);
      }
    }
    
    res.json({
      success: true,
      message: 'Initial data seeded successfully',
      data: {
        applicants: applicants.length,
        documentsGenerated: generatedDocuments.length,
        documents: generatedDocuments
      }
    });
    
  } catch (error) {
    console.error('[DHA] Error seeding data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to seed initial data'
    });
  }
});

// Additional utility routes
app.get('/api/dha/documents/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params;
    const document = await storage.getDhaDocument(documentId);
    
    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found'
      });
    }
    
    res.json({
      success: true,
      data: document
    });
  } catch (error) {
    console.error('[DHA] Error fetching document:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch document'
    });
  }
});

app.get('/api/dha/applicants/:applicantId/documents', async (req, res) => {
  try {
    const { applicantId } = req.params;
    const documents = await storage.getApplicantDhaDocuments(applicantId);
    
    res.json({
      success: true,
      data: documents,
      count: documents.length
    });
  } catch (error) {
    console.error('[DHA] Error fetching applicant documents:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch applicant documents'
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    message: 'DHA Document Generation Server running',
    port: PORT,
    features: [
      'Document Generation',
      'PDF Creation',
      'Verification System',
      'In-Memory Storage'
    ]
  });
});

// Status endpoint
app.get('/api/status', async (req, res) => {
  const applicants = await storage.getDhaApplicants();
  const documents = Array.from(storage.documents.values());
  
  res.json({
    status: 'DHA Digital Services Active',
    services: ['Document Generation', 'PDF Creation', 'Verification'],
    database: 'In-Memory Storage',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    statistics: {
      totalApplicants: applicants.length,
      totalDocuments: documents.length,
      documentTypes: ['smart_id_card', 'passport', 'birth_certificate', 'work_visa', 'study_permit']
    }
  });
});

// Root endpoint with UI
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>DHA Digital Services - Document Generation</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background: linear-gradient(135deg, #006747 0%, #FFB81C 100%);
          min-height: 100vh;
          margin: 0;
          padding: 20px;
          color: white;
        }
        .container {
          max-width: 1200px;
          margin: 0 auto;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-radius: 20px;
          padding: 3rem;
          color: #333;
        }
        h1 { 
          color: #006747;
          border-bottom: 3px solid #FFB81C;
          padding-bottom: 1rem;
          margin-bottom: 2rem;
        }
        .status {
          display: inline-block;
          padding: 0.75rem 1.5rem;
          background: #28a745;
          color: white;
          border-radius: 50px;
          margin: 1rem 0;
          font-weight: bold;
        }
        .endpoints {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1.5rem;
          margin-top: 2rem;
        }
        .endpoint {
          background: white;
          padding: 1.5rem;
          border-radius: 10px;
          border-left: 4px solid #006747;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .endpoint h3 {
          margin: 0 0 0.5rem 0;
          color: #006747;
        }
        .endpoint .method {
          display: inline-block;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.85rem;
          font-weight: bold;
          margin-right: 0.5rem;
        }
        .get { background: #28a745; color: white; }
        .post { background: #007bff; color: white; }
        .endpoint .path {
          font-family: 'Courier New', monospace;
          background: #f4f4f4;
          padding: 0.5rem;
          border-radius: 4px;
          margin: 0.5rem 0;
        }
        .features {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
          margin-top: 2rem;
        }
        .feature {
          background: #006747;
          color: white;
          padding: 0.5rem 1rem;
          border-radius: 20px;
          font-size: 0.9rem;
        }
        a {
          color: #006747;
          text-decoration: none;
          font-weight: bold;
        }
        a:hover {
          text-decoration: underline;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🇿🇦 DHA Digital Services - Document Generation System</h1>
        <p>Department of Home Affairs Document Generation Platform</p>
        <div class="status">✅ Server Running on Port ${PORT}</div>
        
        <div class="features">
          <div class="feature">📄 PDF Generation</div>
          <div class="feature">🔐 Verification System</div>
          <div class="feature">👥 7 Pre-loaded Applicants</div>
          <div class="feature">💾 In-Memory Storage</div>
          <div class="feature">🎯 Real-time Processing</div>
        </div>

        <h2>Available Endpoints</h2>
        <div class="endpoints">
          <div class="endpoint">
            <h3><span class="method get">GET</span> List Applicants</h3>
            <div class="path">/api/dha/applicants</div>
            <p>Retrieve all registered applicants</p>
          </div>
          
          <div class="endpoint">
            <h3><span class="method post">POST</span> Create Applicant</h3>
            <div class="path">/api/dha/applicants</div>
            <p>Register a new applicant</p>
          </div>
          
          <div class="endpoint">
            <h3><span class="method post">POST</span> Generate Document</h3>
            <div class="path">/api/dha/documents/generate</div>
            <p>Generate PDF document with verification code</p>
          </div>
          
          <div class="endpoint">
            <h3><span class="method get">GET</span> Verify Document</h3>
            <div class="path">/api/dha/documents/verify/:code</div>
            <p>Verify document authenticity</p>
          </div>
          
          <div class="endpoint">
            <h3><span class="method post">POST</span> Seed Data</h3>
            <div class="path">/api/dha/seed</div>
            <p>Generate sample documents for applicants</p>
          </div>
          
          <div class="endpoint">
            <h3><span class="method get">GET</span> System Status</h3>
            <div class="path">/api/status</div>
            <p>Check system health and statistics</p>
          </div>
        </div>

        <h2>Quick Links</h2>
        <p>
          <a href="/api/health">Health Check</a> | 
          <a href="/api/status">System Status</a> | 
          <a href="/api/dha/applicants">View Applicants</a>
        </p>

        <h2>Pre-loaded Applicants</h2>
        <ul>
          <li>Muhammad Hasnain Younis (Pakistani)</li>
          <li>Anna Munaf (Pakistani)</li>
          <li>Ikram Ibrahim Yusuf Mansuri (Pakistani)</li>
          <li>Tasleen Mohsin (Pakistani)</li>
          <li>Mohammed Munaf (Pakistani)</li>
          <li>Shera Banoo Ally (South African)</li>
          <li>Zaheera Osman (South African - Birth Certificate)</li>
        </ul>
      </div>
    </body>
    </html>
  `);
});

// Handle other API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.originalUrl,
    timestamp: new Date().toISOString()
  });
});

// Start server
server.listen(PORT, HOST, () => {
  console.log('='.repeat(60));
  console.log('✅ DHA DOCUMENT GENERATION SERVER STARTED');
  console.log(`🌐 Server URL: http://${HOST}:${PORT}`);
  console.log(`📊 Health Check: http://${HOST}:${PORT}/api/health`);
  console.log(`📋 View Applicants: http://${HOST}:${PORT}/api/dha/applicants`);
  console.log(`📄 ${storage.applicants.size} applicants pre-loaded`);
  console.log('='.repeat(60));
});

// Error handling
server.on('error', (error) => {
  console.error('❌ Server Error:', error);
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use`);
  }
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down gracefully...');
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  console.log('Shutting down gracefully...');
  server.close(() => process.exit(0));
});
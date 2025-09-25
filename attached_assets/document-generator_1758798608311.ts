import { storage } from "../storage";
import { 
  InsertCertificate, InsertPermit, Certificate, Permit, DocumentTemplate,
  InsertBirthCertificate, InsertMarriageCertificate, InsertPassport, 
  InsertDeathCertificate, InsertWorkPermit, InsertPermanentVisa, InsertIdCard,
  BirthCertificate, MarriageCertificate, Passport, DeathCertificate, 
  WorkPermit, PermanentVisa, IdCard, InsertDocumentVerification
} from "@shared/schema";
import PDFDocument from "pdfkit";

// Type alias for PDFDocument
type PDFKit = InstanceType<typeof PDFDocument>;
import QRCode from "qrcode";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";

const DOCUMENTS_DIR = process.env.DOCUMENTS_DIR || "./documents";
const TEMPLATES_DIR = process.env.TEMPLATES_DIR || "./templates";

// Ensure directories exist
fs.mkdir(DOCUMENTS_DIR, { recursive: true }).catch(console.error);
fs.mkdir(TEMPLATES_DIR, { recursive: true }).catch(console.error);

export interface GenerateDocumentOptions {
  templateType: string;
  title: string;
  description: string;
  data: Record<string, any>;
  expiresAt?: Date;
}

export interface DocumentGenerationResult {
  success: boolean;
  documentId?: string;
  documentUrl?: string;
  verificationCode?: string;
  qrCodeUrl?: string;
  error?: string;
}

export class DocumentGeneratorService {

  /**
   * Generate a new certificate document
   */
  async generateCertificate(
    userId: string,
    type: string,
    options: GenerateDocumentOptions
  ): Promise<DocumentGenerationResult> {
    try {
      // Generate unique identifiers
      const serialNumber = this.generateSerialNumber();
      const verificationCode = this.generateVerificationCode();
      
      // Create certificate data
      const certificateData: InsertCertificate = {
        userId,
        type,
        title: options.title,
        description: options.description,
        templateType: options.templateType,
        data: options.data,
        serialNumber,
        verificationCode,
        expiresAt: options.expiresAt || null,
        issuedAt: new Date(),
        status: "active",
        qrCodeUrl: null,
        documentUrl: null,
        digitalSignature: null,
        isRevoked: false
      };

      // Generate PDF document
      const pdfResult = await this.generatePDF('certificate', certificateData);
      if (!pdfResult.success) {
        return { success: false, error: pdfResult.error };
      }

      // Generate QR code
      const qrCodeUrl = await this.generateQRCode(verificationCode);

      // Update certificate with URLs
      certificateData.documentUrl = pdfResult.documentUrl;
      certificateData.qrCodeUrl = qrCodeUrl;
      certificateData.digitalSignature = this.generateDigitalSignature(certificateData);

      // Save to storage
      const certificate = await storage.createCertificate(certificateData);

      return {
        success: true,
        documentId: certificate.id,
        documentUrl: certificate.documentUrl || undefined,
        verificationCode: certificate.verificationCode,
        qrCodeUrl: certificate.qrCodeUrl || undefined
      };

    } catch (error) {
      console.error('Error generating certificate:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Generate a new permit document
   */
  async generatePermit(
    userId: string,
    type: string,
    options: GenerateDocumentOptions & { conditions?: Record<string, any> }
  ): Promise<DocumentGenerationResult> {
    try {
      // Generate unique identifiers
      const permitNumber = this.generatePermitNumber();
      const verificationCode = this.generateVerificationCode();
      
      // Create permit data
      const permitData: InsertPermit = {
        userId,
        type,
        title: options.title,
        description: options.description,
        templateType: options.templateType,
        data: options.data,
        permitNumber,
        verificationCode,
        expiresAt: options.expiresAt || null,
        issuedAt: new Date(),
        status: "active",
        qrCodeUrl: null,
        documentUrl: null,
        conditions: options.conditions || null,
        isRevoked: false
      };

      // Generate PDF document
      const pdfResult = await this.generatePDF('permit', permitData);
      if (!pdfResult.success) {
        return { success: false, error: pdfResult.error };
      }

      // Generate QR code
      const qrCodeUrl = await this.generateQRCode(verificationCode);

      // Update permit with URLs
      permitData.documentUrl = pdfResult.documentUrl;
      permitData.qrCodeUrl = qrCodeUrl;

      // Save to storage
      const permit = await storage.createPermit(permitData);

      return {
        success: true,
        documentId: permit.id,
        documentUrl: permit.documentUrl || undefined,
        verificationCode: permit.verificationCode,
        qrCodeUrl: permit.qrCodeUrl || undefined
      };

    } catch (error) {
      console.error('Error generating permit:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Generate a Birth Certificate
   */
  async generateBirthCertificate(
    userId: string,
    data: Omit<InsertBirthCertificate, 'userId' | 'registrationNumber' | 'verificationCode' | 'documentUrl' | 'qrCodeUrl' | 'digitalSignature' | 'isRevoked' | 'status'>
  ): Promise<DocumentGenerationResult> {
    try {
      const registrationNumber = this.generateRegistrationNumber();
      const verificationCode = this.generateVerificationCode();
      
      const birthCertData: InsertBirthCertificate = {
        ...data,
        userId,
        registrationNumber,
        verificationCode,
        documentUrl: null,
        qrCodeUrl: null,
        digitalSignature: null,
        securityFeatures: this.generateSecurityFeatures('birth_certificate'),
        status: "active",
        isRevoked: false
      };

      const pdfResult = await this.generateGovernmentPDF('birth_certificate', birthCertData);
      if (!pdfResult.success) {
        return { success: false, error: pdfResult.error };
      }

      const qrCodeUrl = await this.generateQRCode(verificationCode);
      birthCertData.documentUrl = pdfResult.documentUrl;
      birthCertData.qrCodeUrl = qrCodeUrl;
      birthCertData.digitalSignature = this.generateDigitalSignature(birthCertData);

      const certificate = await storage.createBirthCertificate(birthCertData);

      return {
        success: true,
        documentId: certificate.id,
        documentUrl: certificate.documentUrl || undefined,
        verificationCode: certificate.verificationCode,
        qrCodeUrl: certificate.qrCodeUrl || undefined
      };
    } catch (error) {
      console.error('Error generating birth certificate:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Generate a Marriage Certificate
   */
  async generateMarriageCertificate(
    userId: string,
    data: Omit<InsertMarriageCertificate, 'userId' | 'licenseNumber' | 'registrationNumber' | 'verificationCode' | 'documentUrl' | 'qrCodeUrl' | 'digitalSignature' | 'isRevoked' | 'status'>
  ): Promise<DocumentGenerationResult> {
    try {
      const licenseNumber = this.generateLicenseNumber();
      const registrationNumber = this.generateRegistrationNumber();
      const verificationCode = this.generateVerificationCode();
      
      const marriageCertData: InsertMarriageCertificate = {
        ...data,
        userId,
        licenseNumber,
        registrationNumber,
        verificationCode,
        documentUrl: null,
        qrCodeUrl: null,
        digitalSignature: null,
        securityFeatures: this.generateSecurityFeatures('marriage_certificate'),
        status: "active",
        isRevoked: false
      };

      const pdfResult = await this.generateGovernmentPDF('marriage_certificate', marriageCertData);
      if (!pdfResult.success) {
        return { success: false, error: pdfResult.error };
      }

      const qrCodeUrl = await this.generateQRCode(verificationCode);
      marriageCertData.documentUrl = pdfResult.documentUrl;
      marriageCertData.qrCodeUrl = qrCodeUrl;
      marriageCertData.digitalSignature = this.generateDigitalSignature(marriageCertData);

      const certificate = await storage.createMarriageCertificate(marriageCertData);

      return {
        success: true,
        documentId: certificate.id,
        documentUrl: certificate.documentUrl || undefined,
        verificationCode: certificate.verificationCode,
        qrCodeUrl: certificate.qrCodeUrl || undefined
      };
    } catch (error) {
      console.error('Error generating marriage certificate:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Generate a Passport
   */
  async generatePassport(
    userId: string,
    data: Omit<InsertPassport, 'userId' | 'passportNumber' | 'verificationCode' | 'documentUrl' | 'qrCodeUrl' | 'digitalSignature' | 'isRevoked' | 'status'>
  ): Promise<DocumentGenerationResult> {
    try {
      const passportNumber = await this.generatePassportNumber();
      const verificationCode = await this.generateVerificationCode();

      const passportData: InsertPassport = {
        userId,
        passportNumber,
        verificationCode,
        documentUrl: null,
        qrCodeUrl: null,
        digitalSignature: null,
        machineReadableZone: await this.generateMRZ(data.fullName, passportNumber, data.nationality),
        rfidChipData: await this.generateRFIDData(),
        securityFeatures: await this.generateSecurityFeatures('passport'),
      };

      // Proceed with using passportData
    } catch (error) {
      console.error("Error generating document:", error);
      // Handle the error appropriately
    }
  }error: pdfResult.error };
      }

      const qrCodeUrl = await this.generateQRCode(verificationCode);
      passportData.documentUrl = pdfResult.documentUrl;
      passportData.qrCodeUrl = qrCodeUrl;
      passportData.digitalSignature = this.generateDigitalSignature(passportData);

      const passport = await storage.createPassport(passportData);

      return {
        success: true,
        documentId: passport.id,
        documentUrl: passport.documentUrl || undefined,
        verificationCode: passport.verificationCode,
        qrCodeUrl: passport.qrCodeUrl || undefined
      };
    } catch (error) {
      console.error('Error generating passport:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Generate a Death Certificate
   */
  async generateDeathCertificate(
    userId: string,
    data: Omit<InsertDeathCertificate, 'userId' | 'registrationNumber' | 'verificationCode' | 'documentUrl' | 'qrCodeUrl' | 'digitalSignature' | 'isRevoked' | 'status'>
  ): Promise<DocumentGenerationResult> {
    try {
      const registrationNumber = this.generateRegistrationNumber();
      const verificationCode = this.generateVerificationCode();
      
      const deathCertData: InsertDeathCertificate = {
        ...data,
        userId,
        registrationNumber,
        verificationCode,
        documentUrl: null,
        qrCodeUrl: null,
        digitalSignature: null,
 securityFeatures: this.generateSecurityFeatures('death_certificate'),
        status: "active",
isRevoked: false
      };

      const pdfResult = await this.generateGovernmentPDF('death_certificate', deathCertData);
      if (!pdfResult.success) {
        return { success: false, error: pdfResult.error };
      }

      const qrCodeUrl = await this.generateQRCode(verificationCode);
      deathCertData.documentUrl = pdfResult.documentUrl;
      deathCertData.qrCodeUrl = qrCodeUrl;
      deathCertData.digitalSignature = this.generateDigitalSignature(deathCertData);

      const certificate = await storage.createDeathCertificate(deathCertData);

      return {
        success: true,
        documentId: certificate.id,
        documentUrl: certificate.documentUrl || undefined,
        verificationCode: certificate.verificationCode,
        qrCodeUrl: certificate.qrCodeUrl || undefined
      };
    } catch (error) {
      console.error('Error generating death certificate:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Generate a Work Permit
   */
  async generateWorkPermit(
    userId: string,
    data: Omit<InsertWorkPermit, 'userId' | 'permitNumber' | 'verificationCode' | 'documentUrl' | 'qrCodeUrl' | 'digitalSignature' | 'isRevoked' | 'status'>
  ): Promise<DocumentGenerationResult> {
    try {
      const permitNumber = this.generateWorkPermitNumber();
      const verificationCode = this.generateVerificationCode();
      
      const workPermitData: InsertWorkPermit = {
        ...data,
        userId,
        permitNumber,
        verificationCode,
        documentUrl: null,
        qrCodeUrl: null,
        digitalSignature: null,
        securityFeatures: this.generateSecurityFeatures('work_permit'),
        status: "active",
        isRevoked: false
      };

      const pdfResult = await this.generateGovernmentPDF('work_permit', workPermitData);
      if (!pdfResult.success) {
        return { success: false, error: pdfResult.error };
      }

      const qrCodeUrl = await this.generateQRCode(verificationCode);
      workPermitData.documentUrl = pdfResult.documentUrl;
      workPermitData.qrCodeUrl = qrCodeUrl;
      workPermitData.digitalSignature = this.generateDigitalSignature(workPermitData);

      const permit = await storage.createWorkPermit(workPermitData);

      return {
        success: true,
        documentId: permit.id,
        documentUrl: permit.documentUrl || undefined,
        verificationCode: permit.verificationCode,
        qrCodeUrl: permit.qrCodeUrl || undefined
      };
    } catch (error) {
      console.error('Error generating work permit:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Generate a Permanent Visa
   */
  async generatePermanentVisa(
    userId: string,
    data: Omit<InsertPermanentVisa, 'userId' | 'visaNumber' | 'verificationCode' | 'documentUrl' | 'qrCodeUrl' | 'digitalSignature' | 'isRevoked' | 'status'>
  ): Promise<DocumentGenerationResult> {
    try {
      const visaNumber = this.generateVisaNumber();
      const verificationCode = this.generateVerificationCode();
      
      const visaData: InsertPermanentVisa = {
        ...data,
        userId,
        visaNumber,
        verificationCode,
        documentUrl: null,
        qrCodeUrl: null,
        digitalSignature: null,
        fingerprintData: this.generateFingerprintData(),
        securityFeatures: this.generateSecurityFeatures('permanent_visa'),
        status: "active",
        isRevoked: false
      };

      const pdfResult = await this.generateGovernmentPDF('permanent_visa', visaData);
      if (!pdfResult.success) {
        return { success: false, error: pdfResult.error };
      }

      const qrCodeUrl = await this.generateQRCode(verificationCode);
      visaData.documentUrl = pdfResult.documentUrl;
      visaData.qrCodeUrl = qrCodeUrl;
      visaData.digitalSignature = this.generateDigitalSignature(visaData);

      const visa = await storage.createPermanentVisa(visaData);

      return {
        success: true,
        documentId: visa.id,
        documentUrl: visa.documentUrl || undefined,
        verificationCode: visa.verificationCode,
        qrCodeUrl: visa.qrCodeUrl || undefined
      };
    } catch (error) {
      console.error('Error generating permanent visa:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Generate an ID Card
   */
  async generateIdCard(
    userId: string,
    data: Omit<InsertIdCard, 'userId' | 'idNumber' | 'verificationCode' | 'documentUrl' | 'qrCodeUrl' | 'digitalSignature' | 'isRevoked' | 'status'>
  ): Promise<DocumentGenerationResult> {
    try {
      const idNumber = this.generateIdNumber();
      const verificationCode = this.generateVerificationCode();
      
      const idCardData: InsertIdCard = {
        ...data,
        userId,
        idNumber,
        verificationCode,
        documentUrl: null,
        qrCodeUrl: null,
        digitalSignature: null,
        rfidChipData: this.generateRFIDData(),
        securityFeatures: this.generateSecurityFeatures('id_card'),
        status: "active",
        isRevoked: false
      };

      const pdfResult = await this.generateGovernmentPDF('id_card', idCardData);
      if (!pdfResult.success) {
        return { success: false, error: pdfResult.error };
      }

      const qrCodeUrl = await this.generateQRCode(verificationCode);
      idCardData.documentUrl = pdfResult.documentUrl;
      idCardData.qrCodeUrl = qrCodeUrl;
      idCardData.digitalSignature = this.generateDigitalSignature(idCardData);

      const idCard = await storage.createIdCard(idCardData);

      return {
        success: true,
        documentId: idCard.id,
        documentUrl: idCard.documentUrl || undefined,
        verificationCode: idCard.verificationCode,
        qrCodeUrl: idCard.qrCodeUrl || undefined
      };
    } catch (error) {
      console.error('Error generating ID card:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Generate PDF document using PDFKit with official styling
   */
  private async generatePDF(
    documentType: 'certificate' | 'permit',
    data: InsertCertificate | InsertPermit
  ): Promise<{ success: boolean; documentUrl?: string; error?: string }> {
    try {
      const doc = new PDFDocument({
        layout: 'landscape',
        size: 'A4',
        margin: 50
      });

      const filename = `${documentType}_${data.verificationCode}.pdf`;
      const filepath = path.join(DOCUMENTS_DIR, filename);
      const writeStream = require('fs').createWriteStream(filepath);
      
      doc.pipe(writeStream);

      // Add official header with branding
      this.addPDFKitHeader(doc, documentType);

      // Add document content
      if (documentType === 'certificate') {
        this.addPDFKitCertificateContent(doc, data as InsertCertificate);
      } else {
        this.addPDFKitPermitContent(doc, data as InsertPermit);
      }

      // Add footer with verification info
      this.addPDFKitFooter(doc, data.verificationCode);

      // Add security features
      this.addPDFKitSecurityFeatures(doc, data);

      // Finalize the PDF
      doc.end();

      // Wait for write to complete
      await new Promise((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });

      return {
        success: true,
        documentUrl: `/documents/${filename}`
      };

    } catch (error) {
      console.error('Error generating PDF:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'PDF generation failed'
      };
    }
  }

  /**
   * Add PDFKit official header with branding and security elements
   */
  private addPDFKitHeader(doc: PDFKit, documentType: string) {
    const pageWidth = doc.page.width;
    
    // Official header background
    doc.rect(0, 0, pageWidth, 60)
       .fillColor('#2980b9')
       .fill();
    
    // Title
    const title = documentType === 'certificate' ? 'OFFICIAL CERTIFICATE' : 'OFFICIAL PERMIT';
    doc.fillColor('white')
       .fontSize(24)
       .font('Helvetica-Bold')
       .text(title, 0, 20, {
         align: 'center',
         width: pageWidth
       });
    
    // Reset to black for content
    doc.fillColor('black').font('Helvetica');
  }

  /**
   * Add PDFKit certificate-specific content
   */
  private addPDFKitCertificateContent(doc: PDFKit, data: InsertCertificate) {
    const pageWidth = doc.page.width;
    let yPos = 100;

    // Certificate title
    doc.fontSize(28)
       .font('Helvetica-Bold')
       .text(data.title, 0, yPos, {
         align: 'center',
         width: pageWidth
       });
    yPos += 50;

    // Description
    doc.fontSize(16)
       .font('Helvetica')
       .text(data.description, 0, yPos, {
         align: 'center',
         width: pageWidth
       });
    yPos += 60;

    // Certificate details
    doc.fontSize(14);
    doc.text(`Serial Number: ${data.serialNumber}`, 50, yPos);
    yPos += 25;
    doc.text(`Issue Date: ${(data.issuedAt || new Date()).toLocaleDateString()}`, 50, yPos);
    yPos += 25;
    if (data.expiresAt) {
      doc.text(`Expires: ${data.expiresAt.toLocaleDateString()}`, 50, yPos);
      yPos += 25;
    }

    // Add custom data fields
    if (data.data && typeof data.data === 'object') {
      yPos += 30;
      Object.entries(data.data).forEach(([key, value]) => {
        doc.text(`${key}: ${value}`, 50, yPos);
        yPos += 20;
      });
    }
  }

  /**
   * Add PDFKit permit-specific content
   */
  private addPDFKitPermitContent(doc: PDFKit, data: InsertPermit) {
    const pageWidth = doc.page.width;
    let yPos = 100;

    // Permit title
    doc.fontSize(28)
       .font('Helvetica-Bold')
       .text(data.title, 0, yPos, {
         align: 'center',
         width: pageWidth
       });
    yPos += 50;

    // Description
    doc.fontSize(16)
       .font('Helvetica')
       .text(data.description, 0, yPos, {
         align: 'center',
         width: pageWidth
       });
    yPos += 60;

    // Permit details
    doc.fontSize(14);
    doc.text(`Permit Number: ${data.permitNumber}`, 50, yPos);
    yPos += 25;
    doc.text(`Issue Date: ${(data.issuedAt || new Date()).toLocaleDateString()}`, 50, yPos);
    yPos += 25;
    if (data.expiresAt) {
      doc.text(`Expires: ${data.expiresAt.toLocaleDateString()}`, 50, yPos);
      yPos += 25;
    }

    // Add custom data fields
    if (data.data && typeof data.data === 'object') {
      yPos += 30;
      Object.entries(data.data).forEach(([key, value]) => {
        doc.text(`${key}: ${value}`, 50, yPos);
        yPos += 20;
      });
    }

    // Add conditions if present
    if (data.conditions && typeof data.conditions === 'object') {
      yPos += 30;
      doc.font('Helvetica-Bold');
      doc.text('Terms and Conditions:', 50, yPos);
      yPos += 25;
      doc.font('Helvetica');
      Object.entries(data.conditions).forEach(([key, value]) => {
        doc.text(`• ${key}: ${value}`, 70, yPos);
        yPos += 20;
      });
    }
  }

  /**
   * Add PDFKit official footer with verification code and security elements
   */
  private addPDFKitFooter(doc: PDFKit, verificationCode: string) {
    const pageHeight = doc.page.height;
    const pageWidth = doc.page.width;
    
    // Footer background
    doc.rect(0, pageHeight - 80, pageWidth, 80)
       .fillColor('#ecf0f1')
       .fill();
    
    // Verification info
    doc.fillColor('#34495e')
       .fontSize(12)
       .text(`Verification Code: ${verificationCode}`, 50, pageHeight - 60)
       .text(`Document generated: ${new Date().toLocaleString()}`, 50, pageHeight - 40);
    
    // Security text
    doc.text('This document contains security features. Visit our verification portal to authenticate.', 
             50, pageHeight - 20, {
               width: pageWidth - 100,
               align: 'right'
             });
    
    // Reset colors
    doc.fillColor('black');
  }

  /**
   * Add PDFKit security features like watermarks and patterns
   */
  private addPDFKitSecurityFeatures(doc: PDFKit, data: any) {
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    
    // Add watermark
    doc.save();
    doc.rotate(45, { origin: [pageWidth / 2, pageHeight / 2] })
       .fillColor('#f0f0f0')
       .fontSize(72)
       .font('Helvetica-Bold')
       .text('OFFICIAL', 0, pageHeight / 2 - 36, {
         align: 'center',
         width: pageWidth
       });
    doc.restore();
    
    // Reset text settings
    doc.fillColor('black')
       .fontSize(12)
       .font('Helvetica');

    // Add security border pattern
    doc.strokeColor('#2980b9')
       .lineWidth(3)
       .rect(10, 10, pageWidth - 20, pageHeight - 20)
       .stroke();
  }

  /**
   * Generate QR code for verification
   */
  async generateQRCode(verificationCode: string): Promise<string> {
    try {
      const qrCodeData = `${process.env.APP_URL || 'http://localhost:5000'}/verify/${verificationCode}`;
      const qrCodeBuffer = await QRCode.toBuffer(qrCodeData, {
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      const filename = `qr_${verificationCode}.png`;
      const filepath = path.join(DOCUMENTS_DIR, filename);
      
      await fs.writeFile(filepath, qrCodeBuffer);

      return `/documents/${filename}`;
    } catch (error) {
      console.error('Error generating QR code:', error);
      throw error;
    }
  }

  /**
   * Generate digital signature for the document
   */
  private generateDigitalSignature(data: any): string {
    const secretKey = process.env.DIGITAL_SIGNATURE_KEY || 'default-signature-key';
    const content = JSON.stringify({
      verificationCode: data.verificationCode,
      userId: data.userId,
      issuedAt: data.issuedAt || new Date(),
      // Handle different document types
      identifier: data.serialNumber || data.permitNumber || data.registrationNumber || data.passportNumber || data.visaNumber || data.idNumber,
      name: data.title || data.fullName || data.deceasedFullName || data.employeeFullName || data.holderFullName
    });

    return crypto.createHmac('sha256', secretKey).update(content).digest('hex');
  }

  /**
   * Generate unique serial number for certificates
   */
  private generateSerialNumber(): string {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `CERT-${timestamp}-${random}`;
  }

  /**
   * Generate unique permit number
   */
  private generatePermitNumber(): string {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `PERMIT-${timestamp}-${random}`;
  }

  /**
   * Generate verification code
   */
  private generateVerificationCode(): string {
    return crypto.randomBytes(16).toString('hex').toUpperCase();
  }

  /**
   * Generate enhanced PDF for government documents with official layouts
   */
  private async generateGovernmentPDF(
    documentType: 'birth_certificate' | 'marriage_certificate' | 'passport' | 'death_certificate' | 'work_permit' | 'permanent_visa' | 'id_card',
    data: any
  ): Promise<{ success: boolean; documentUrl?: string; error?: string }> {
    try {
      const isCardFormat = documentType === 'id_card' || documentType === 'passport';
      const doc = new PDFDocument({
        layout: isCardFormat ? 'landscape' : 'portrait',
        size: isCardFormat ? [243, 153] : 'A4', // ID card size in points or A4
        margin: isCardFormat ? 10 : 50
      });

      const filename = `${documentType}_${data.verificationCode}.pdf`;
      const filepath = path.join(DOCUMENTS_DIR, filename);
      const writeStream = require('fs').createWriteStream(filepath);
      
      doc.pipe(writeStream);

      // Apply document-specific styling and layout
      this.applyPDFKitOfficialLayout(doc, documentType, data);
      
      // Add security features
      this.addPDFKitEnhancedSecurityFeatures(doc, documentType, data);

      // Finalize the PDF
      doc.end();

      // Wait for write to complete
      await new Promise((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });

      return {
        success: true,
        documentUrl: `/documents/${filename}`
      };

    } catch (error) {
      console.error(`Error generating ${documentType} PDF:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'PDF generation failed'
      };
    }
  }

  /**
   * Apply PDFKit official layout based on document type
   */
  private applyPDFKitOfficialLayout(doc: PDFKit, documentType: string, data: any) {
    switch (documentType) {
      case 'birth_certificate':
        this.layoutPDFKitBirthCertificate(doc, data);
        break;
      case 'marriage_certificate':
        this.layoutPDFKitMarriageCertificate(doc, data);
        break;
      case 'passport':
        this.layoutPDFKitPassport(doc, data);
        break;
      case 'death_certificate':
        this.layoutPDFKitDeathCertificate(doc, data);
        break;
      case 'work_permit':
        this.layoutPDFKitWorkPermit(doc, data);
        break;
      case 'permanent_visa':
        this.layoutPDFKitPermanentVisa(doc, data);
        break;
      case 'id_card':
        this.layoutPDFKitIdCard(doc, data);
        break;
      default:
        throw new Error(`Unsupported document type: ${documentType}`);
    }
  }

  /**
   * Layout Birth Certificate with PDFKit official design
   */
  private layoutPDFKitBirthCertificate(doc: PDFKit, data: any) {
    const pageWidth = doc.page.width;
    let yPos = 80;

    // Official SA Government header with green border
    doc.rect(0, 0, pageWidth, 80)
       .fillColor('#007749') // SA Government Green
       .fill();
    
    // White content area with green border
    doc.rect(10, 85, pageWidth - 20, doc.page.height - 120)
       .fillColor('white')
       .fill()
       .strokeColor('#007749')
       .lineWidth(3)
       .stroke();
    
    // SA Coat of Arms placeholder and header
    doc.fillColor('white')
       .fontSize(12)
       .font('Helvetica-Bold')
       .text('🇿🇦 REPUBLIC OF SOUTH AFRICA', 0, 10, {
         align: 'center',
         width: pageWidth
       })
       .fontSize(16)
       .text('DEPARTMENT OF HOME AFFAIRS', 0, 25, {
         align: 'center',
         width: pageWidth
       })
       .fontSize(24)
       .text('CERTIFICATE OF BIRTH', 0, 45, {
         align: 'center',
         width: pageWidth
       })
       .fontSize(12)
       .text('(Birth and Deaths Registration Act, 1992)', 0, 70, {
         align: 'center',
         width: pageWidth
       });
    
    doc.fillColor('black').font('Helvetica');
    yPos = 100;

    // Registration info with SA styling
    doc.strokeColor('#007749')
       .lineWidth(2)
       .rect(20, yPos, pageWidth - 40, 50)
       .stroke();
    
    doc.fillColor('black')
       .fontSize(12)
       .font('Helvetica-Bold')
       .text(`REGISTRATION NUMBER: ${data.registrationNumber}`, 30, yPos + 10)
       .text(`DATE OF REGISTRATION: ${data.registrationDate?.toLocaleDateString() || new Date().toLocaleDateString()}`, 30, yPos + 30);
    yPos += 80;

    // Child information with SA government styling
    doc.rect(20, yPos, pageWidth - 40, 2)
       .fillColor('#007749')
       .fill();
    
    doc.fillColor('black')
       .fontSize(16)
       .font('Helvetica-Bold')
       .text('PARTICULARS OF CHILD', 30, yPos + 15);
    yPos += 40;

    doc.fontSize(12)
       .font('Helvetica')
       .text(`FULL NAME: ${data.childFullName || data.fullName}`, 30, yPos);
    yPos += 25;
    doc.text(`DATE OF BIRTH: ${data.dateOfBirth?.toLocaleDateString ? data.dateOfBirth.toLocaleDateString() : data.dateOfBirth}`, 30, yPos);
    yPos += 25;
    doc.text(`PLACE OF BIRTH: ${data.placeOfBirth}`, 30, yPos);
    yPos += 25;
    doc.text(`SEX: ${data.sex?.toUpperCase()}`, 30, yPos);
    yPos += 40;

    // Parents information with SA styling
    doc.rect(20, yPos, pageWidth - 40, 2)
       .fillColor('#007749')
       .fill();
    
    doc.fillColor('black')
       .fontSize(16)
       .font('Helvetica-Bold')
       .text('PARTICULARS OF PARENTS', 30, yPos + 15);
    yPos += 40;

    doc.fontSize(12)
       .font('Helvetica')
       .text(`MOTHER'S FULL NAME: ${data.motherFullName}`, 30, yPos);
    yPos += 20;
    doc.text(`MOTHER'S AGE: ${data.motherAge || 'Not specified'}`, 30, yPos);
    yPos += 25;
    doc.text(`FATHER'S FULL NAME: ${data.fatherFullName}`, 30, yPos);
    yPos += 20;
    doc.text(`FATHER'S AGE: ${data.fatherAge || 'Not specified'}`, 30, yPos);
    yPos += 40;

    // Official SA Government signatures and seal area
    const footerY = doc.page.height - 120;
    
    // DHA Official stamp area
    doc.rect(30, footerY, 150, 80)
       .strokeColor('#007749')
       .lineWidth(2)
       .stroke();
    doc.fontSize(10)
       .fillColor('#007749')
       .font('Helvetica-Bold')
       .text('DEPARTMENT OF\nHOME AFFAIRS\nOFFICIAL SEAL', 35, footerY + 25, {
         align: 'center',
         width: 140
       });
    
    // Registrar signature area
    doc.strokeColor('black')
       .lineWidth(1)
       .moveTo(pageWidth - 250, footerY + 50)
       .lineTo(pageWidth - 50, footerY + 50)
       .stroke();
    doc.fontSize(10)
       .fillColor('black')
       .font('Helvetica')
       .text('REGISTRAR OF BIRTHS AND DEATHS', pageWidth - 250, footerY + 60);
    
    // Verification code at bottom
    doc.fontSize(8)
       .fillColor('#007749')
       .text(`VERIFICATION CODE: ${data.verificationCode}`, 30, doc.page.height - 30, {
         align: 'left'
       })
       .text('For verification visit: www.dha.gov.za', 30, doc.page.height - 20, {
         align: 'left'
       });
  }

  /**
   * Layout Marriage Certificate with PDFKit official design
   */
  private layoutPDFKitMarriageCertificate(doc: PDFKit, data: any) {
    const pageWidth = doc.page.width;
    let yPos = 80;

    // Official header
    doc.rect(0, 0, pageWidth, 60)
       .fillColor('#8B0000')
       .fill();
    
    doc.fillColor('white')
       .fontSize(28)
       .font('Helvetica-Bold')
       .text('CERTIFICATE OF MARRIAGE', 0, 15, {
         align: 'center',
         width: pageWidth
       })
       .fontSize(14)
       .text('OFFICIAL GOVERNMENT DOCUMENT', 0, 45, {
         align: 'center',
         width: pageWidth
       });
    
    doc.fillColor('black').font('Helvetica');
    yPos = 100;

    // Marriage details
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .text('MARRIAGE INFORMATION', 50, yPos);
    yPos += 25;

    doc.fontSize(14)
       .font('Helvetica')
       .text(`License Number: ${data.licenseNumber}`, 50, yPos);
    yPos += 20;
    doc.text(`Marriage Date: ${data.marriageDate?.toLocaleDateString()}`, 50, yPos);
    yPos += 20;
    doc.text(`Marriage Place: ${data.marriagePlace}`, 50, yPos);
    yPos += 40;

    // Spouse information in two columns
    const midPoint = pageWidth / 2;
    
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .text('SPOUSE ONE', 50, yPos)
       .text('SPOUSE TWO', midPoint + 20, yPos);
    yPos += 25;

    doc.fontSize(14)
       .font('Helvetica')
       .text(data.spouseOneFullName || '', 50, yPos)
       .text(data.spouseTwoFullName || '', midPoint + 20, yPos);
    yPos += 20;
    doc.text(`Age: ${data.spouseOneAge || ''}`, 50, yPos)
       .text(`Age: ${data.spouseTwoAge || ''}`, midPoint + 20, yPos);
    yPos += 20;
    doc.text(`Occupation: ${data.spouseOneOccupation || ''}`, 50, yPos)
       .text(`Occupation: ${data.spouseTwoOccupation || ''}`, midPoint + 20, yPos);
    yPos += 40;

    // Witnesses and officiant
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .text('WITNESSES & OFFICIANT', 50, yPos);
    yPos += 25;

    doc.fontSize(14)
       .font('Helvetica')
       .text(`Witness 1: ${data.witness1Name || ''}`, 50, yPos);
    yPos += 20;
    doc.text(`Witness 2: ${data.witness2Name || ''}`, 50, yPos);
    yPos += 20;
    doc.text(`Officiant: ${data.officiantName}`, 50, yPos);
  }

  /**
   * Layout Passport with PDFKit official design
   */
  private layoutPDFKitPassport(doc: PDFKit, data: any) {
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;

    // SA Passport cover (SA flag colors - dark blue)
    doc.rect(0, 0, pageWidth, pageHeight)
       .fillColor('#001489') // SA Flag Blue
       .fill();

    // SA Coat of Arms area (top center)
    doc.circle(pageWidth / 2, 30, 15)
       .fillColor('#FFD700')
       .fill();
    doc.fontSize(8)
       .fillColor('black')
       .text('🇿🇦', pageWidth / 2 - 8, 25);

    // Official SA Government text
    doc.fillColor('#FFD700')
       .fontSize(10)
       .font('Helvetica-Bold')
       .text('REPUBLIC OF SOUTH AFRICA', 0, 55, {
         align: 'center',
         width: pageWidth
       })
       .fontSize(8)
       .text('REPUBLIEK VAN SUID-AFRIKA', 0, 70, {
         align: 'center',
         width: pageWidth
       })
       .fontSize(12)
       .text('PASSPORT', 0, 90, {
         align: 'center',
         width: pageWidth
       })
       .fontSize(8)
       .text('PASPOORT', 0, 105, {
         align: 'center',
         width: pageWidth
       });

    // Photo area
    doc.rect(20, 70, 80, 100)
       .fillColor('#f0f0f0')
       .fill();
    doc.fillColor('#666666')
       .fontSize(8)
       .text('PHOTO', 60, 115, { align: 'center' });

    // SA Personal information page layout
    doc.fillColor('white')
       .fontSize(8)
       .font('Helvetica')
       .text(`Type/Tipe: P`, 120, 125)
       .text(`Country Code/Landkode: ZAF`, 120, 140)
       .text(`Passport No/Paspoort Nr: ${data.passportNumber}`, 120, 155)
       .text(`Surname/Van: ${data.fullName?.split(' ').pop()}`, 120, 170)
       .text(`Given Names/Voorname: ${data.fullName?.split(' ').slice(0, -1).join(' ')}`, 120, 185)
       .text(`Nationality/Nasionaliteit: South African`, 120, 200)
       .text(`Date of Birth/Geboortedatum: ${data.dateOfBirth?.toLocaleDateString ? data.dateOfBirth.toLocaleDateString() : data.dateOfBirth}`, 120, 215)
       .text(`Sex/Geslag: ${data.sex}`, 120, 230)
       .text(`Place of Birth/Geboorteplek: ${data.placeOfBirth}`, 120, 245)
       .text(`Date of Issue/Uitgiftedatum: ${new Date().toLocaleDateString()}`, 120, 260)
       .text(`Date of Expiry/Vervaldatum: ${data.expiryDate?.toLocaleDateString ? data.expiryDate.toLocaleDateString() : data.expiryDate}`, 120, 275)
       .text(`Authority/Gesag: Department of Home Affairs`, 120, 290);

    // Machine Readable Zone
    if (data.machineReadableZone) {
      doc.fontSize(6)
         .font('Courier')
         .text(data.machineReadableZone, 20, pageHeight - 30);
    }
  }

  /**
   * Layout Death Certificate with PDFKit official design
   */
  private layoutPDFKitDeathCertificate(doc: PDFKit, data: any) {
    const pageWidth = doc.page.width;
    let yPos = 80;

    // Official header
    doc.rect(0, 0, pageWidth, 60)
       .fillColor('#404040')
       .fill();
    
    doc.fillColor('white')
       .fontSize(28)
       .font('Helvetica-Bold')
       .text('CERTIFICATE OF DEATH', 0, 15, {
         align: 'center',
         width: pageWidth
       })
       .fontSize(14)
       .text('OFFICIAL GOVERNMENT DOCUMENT', 0, 45, {
         align: 'center',
         width: pageWidth
       });
    
    doc.fillColor('black').font('Helvetica');
    yPos = 100;

    // Registration info
    doc.strokeColor('#404040')
       .lineWidth(2)
       .rect(50, yPos, pageWidth - 100, 50)
       .stroke();
    
    doc.fontSize(12)
       .text(`Registration No: ${data.registrationNumber}`, 60, yPos + 15)
       .text(`Registration Date: ${data.registrationDate?.toLocaleDateString() || new Date().toLocaleDateString()}`, 60, yPos + 35);
    yPos += 80;

    // Deceased information
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .text('DECEASED INFORMATION', 50, yPos);
    yPos += 25;

    doc.fontSize(14)
       .font('Helvetica')
       .text(`Full Name: ${data.deceasedFullName}`, 50, yPos);
    yPos += 20;
    doc.text(`Date of Birth: ${data.dateOfBirth?.toLocaleDateString()}`, 50, yPos);
    yPos += 20;
    doc.text(`Date of Death: ${data.dateOfDeath?.toLocaleDateString()}`, 50, yPos);
    yPos += 20;
    doc.text(`Place of Death: ${data.placeOfDeath}`, 50, yPos);
    yPos += 40;

    // Medical information
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .text('MEDICAL INFORMATION', 50, yPos);
    yPos += 25;

    doc.fontSize(14)
       .font('Helvetica')
       .text(`Cause of Death: ${data.causeOfDeath}`, 50, yPos);
    yPos += 20;
    if (data.mannerOfDeath) {
      doc.text(`Manner of Death: ${data.mannerOfDeath}`, 50, yPos);
      yPos += 20;
    }
    doc.text(`Certifying Physician: ${data.certifyingPhysician}`, 50, yPos);
    yPos += 40;

    // Informant information
    if (data.informantName) {
      doc.fontSize(16)
         .font('Helvetica-Bold')
         .text('INFORMANT INFORMATION', 50, yPos);
      yPos += 25;

      doc.fontSize(14)
         .font('Helvetica')
         .text(`Informant: ${data.informantName}`, 50, yPos);
      yPos += 20;
      if (data.relationshipToDeceased) {
        doc.text(`Relationship: ${data.relationshipToDeceased}`, 50, yPos);
      }
    }
  }

  /**
   * Layout Work Permit with PDFKit official design
   */
  private layoutPDFKitWorkPermit(doc: PDFKit, data: any) {
    const pageWidth = doc.page.width;
    let yPos = 80;

    // Official header
    doc.rect(0, 0, pageWidth, 60)
       .fillColor('#006633')
       .fill();
    
    doc.fillColor('white')
       .fontSize(28)
       .font('Helvetica-Bold')
       .text('WORK PERMIT', 0, 15, {
         align: 'center',
         width: pageWidth
       })
       .fontSize(14)
       .text('AUTHORIZATION TO WORK', 0, 45, {
         align: 'center',
         width: pageWidth
       });
    
    doc.fillColor('black').font('Helvetica');
    yPos = 100;

    // Permit details
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .text('PERMIT INFORMATION', 50, yPos);
    yPos += 25;

    doc.fontSize(14)
       .font('Helvetica')
       .text(`Permit Number: ${data.permitNumber}`, 50, yPos);
    yPos += 20;
    doc.text(`Valid From: ${data.validFrom?.toLocaleDateString()}`, 50, yPos);
    yPos += 20;
    doc.text(`Valid Until: ${data.validUntil?.toLocaleDateString()}`, 50, yPos);
    yPos += 40;

    // Employee information
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .text('EMPLOYEE INFORMATION', 50, yPos);
    yPos += 25;

    doc.fontSize(14)
       .font('Helvetica')
       .text(`Full Name: ${data.employeeFullName}`, 50, yPos);
    yPos += 20;
    doc.text(`Nationality: ${data.employeeNationality}`, 50, yPos);
    yPos += 20;
    doc.text(`Passport Number: ${data.employeePassportNumber}`, 50, yPos);
    yPos += 40;

    // Employment details
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .text('EMPLOYMENT DETAILS', 50, yPos);
    yPos += 25;

    doc.fontSize(14)
       .font('Helvetica')
       .text(`Employer: ${data.employerName}`, 50, yPos);
    yPos += 20;
    doc.text(`Job Title: ${data.jobTitle}`, 50, yPos);
    yPos += 20;
    doc.text(`Work Location: ${data.workLocation}`, 50, yPos);
    
    // Work restrictions
    if (data.workRestrictions && Array.isArray(data.workRestrictions)) {
      yPos += 40;
      doc.fontSize(16)
         .font('Helvetica-Bold')
         .text('WORK RESTRICTIONS', 50, yPos);
      yPos += 25;

      doc.fontSize(12)
         .font('Helvetica');
      data.workRestrictions.forEach((restriction: string) => {
        doc.text(`• ${restriction}`, 70, yPos);
        yPos += 15;
      });
    }
  }

  /**
   * Layout Permanent Visa with PDFKit official design
   */
  private layoutPDFKitPermanentVisa(doc: PDFKit, data: any) {
    const pageWidth = doc.page.width;
    let yPos = 80;

    // Official header
    doc.rect(0, 0, pageWidth, 60)
       .fillColor('#800080')
       .fill();
    
    doc.fillColor('white')
       .fontSize(24)
       .font('Helvetica-Bold')
       .text('PERMANENT RESIDENT VISA', 0, 15, {
         align: 'center',
         width: pageWidth
       })
       .fontSize(14)
       .text('OFFICIAL IMMIGRATION DOCUMENT', 0, 45, {
         align: 'center',
         width: pageWidth
       });
    
    doc.fillColor('black').font('Helvetica');
    yPos = 100;

    // Photo area
    doc.rect(pageWidth - 120, yPos, 80, 100)
       .fillColor('#f0f0f0')
       .fill();
    doc.fillColor('#666666')
       .fontSize(10)
       .text('PHOTO', pageWidth - 80, yPos + 45, { align: 'center' });
    doc.fillColor('black');

    // Visa information
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .text('VISA INFORMATION', 50, yPos);
    yPos += 25;

    doc.fontSize(14)
       .font('Helvetica')
       .text(`Visa Number: ${data.visaNumber}`, 50, yPos);
    yPos += 20;
    doc.text(`Visa Type: ${data.visaType}`, 50, yPos);
    yPos += 20;
    doc.text(`Category: ${data.visaCategory}`, 50, yPos);
    yPos += 20;
    doc.text(`Valid From: ${data.validFrom?.toLocaleDateString()}`, 50, yPos);
    yPos += 20;
    if (data.expiryDate) {
      doc.text(`Expires: ${data.expiryDate?.toLocaleDateString()}`, 50, yPos);
      yPos += 20;
    }
    yPos += 20;

    // Holder information
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .text('HOLDER INFORMATION', 50, yPos);
    yPos += 25;

    doc.fontSize(14)
       .font('Helvetica')
       .text(`Full Name: ${data.holderFullName}`, 50, yPos);
    yPos += 20;
    doc.text(`Nationality: ${data.holderNationality}`, 50, yPos);
    yPos += 20;
    doc.text(`Passport Number: ${data.holderPassportNumber}`, 50, yPos);
    yPos += 20;
    doc.text(`Country of Issue: ${data.countryOfIssue}`, 50, yPos);

    // Immigration stamps area
    if (data.immigrationStamps && Array.isArray(data.immigrationStamps)) {
      yPos += 40;
      doc.fontSize(16)
         .font('Helvetica-Bold')
         .text('IMMIGRATION STAMPS', 50, yPos);
      yPos += 25;

      doc.fontSize(12)
         .font('Helvetica');
      data.immigrationStamps.forEach((stamp: any) => {
        doc.text(`${stamp.date} - ${stamp.port} - ${stamp.type}`, 70, yPos);
        yPos += 15;
      });
    }
  }

  /**
   * Layout ID Card with PDFKit official design
   */
  private layoutPDFKitIdCard(doc: PDFKit, data: any) {
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;

    // Card background
    doc.rect(0, 0, pageWidth, pageHeight)
       .fillColor('#f5f5f5')
       .fill();

    // Header stripe
    doc.rect(0, 0, pageWidth, 20)
       .fillColor('#002060')
       .fill();

    // Government seal area
    doc.circle(30, 35, 15)
       .fillColor('#dcdcdc')
       .fill();
    doc.fillColor('#666666')
       .fontSize(6)
       .text('SEAL', 30, 32, { align: 'center' });

    // Photo area
    doc.rect(10, 60, 40, 50)
       .fillColor('#f0f0f0')
       .fill();
    doc.fillColor('#666666')
       .fontSize(6)
       .text('PHOTO', 30, 82, { align: 'center' });

    // Personal information
    doc.fillColor('black')
       .fontSize(10)
       .font('Helvetica-Bold')
       .text('IDENTIFICATION CARD', 0, 12, {
         align: 'center',
         width: pageWidth
       });

    doc.fontSize(8)
       .font('Helvetica');
    let yPos = 30;
    doc.text(`ID No: ${data.idNumber}`, 60, yPos);
    yPos += 12;
    doc.text(`Name: ${data.fullName}`, 60, yPos);
    yPos += 12;
    doc.text(`DOB: ${data.dateOfBirth?.toLocaleDateString()}`, 60, yPos);
    yPos += 12;
    doc.text(`Sex: ${data.sex}`, 60, yPos);
    yPos += 12;
    doc.text(`Nationality: ${data.nationality}`, 60, yPos);
    yPos += 12;
    doc.text(`Address: ${data.address}`, 60, yPos);
    yPos += 12;
    doc.text(`Issued: ${data.issueDate?.toLocaleDateString()}`, 60, yPos);
    yPos += 12;
    doc.text(`Expires: ${data.expiryDate?.toLocaleDateString()}`, 60, yPos);

    // Signature area
    doc.strokeColor('black')
       .lineWidth(0.5)
       .moveTo(60, pageHeight - 20)
       .lineTo(pageWidth - 10, pageHeight - 20)
       .stroke();
    doc.fontSize(4)
       .text('Signature', 60, pageHeight - 15);

    // Security pattern background
    doc.strokeColor('#c8c8c8')
       .lineWidth(0.2);
    for (let i = 0; i < pageWidth; i += 5) {
      doc.moveTo(i, 0).lineTo(i, pageHeight).stroke();
    }
  }



  /**
   * Helper methods for generating document identifiers and security features
   */
  private generateRegistrationNumber(): string {
    const year = new Date().getFullYear();
    const random = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `REG-${year}-${random}`;
  }

  private generateLicenseNumber(): string {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `LIC-${timestamp}-${random}`;
  }

  private generatePassportNumber(): string {
    const letters = crypto.randomBytes(2).toString('hex').toUpperCase().replace(/[0-9]/g, 'A');
    const numbers = Math.floor(Math.random() * 9000000) + 1000000;
    return `${letters}${numbers}`;
  }

  private generateWorkPermitNumber(): string {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `WP-${timestamp}-${random}`;
  }

  private generateVisaNumber(): string {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `VISA-${timestamp}-${random}`;
  }

  private generateIdNumber(): string {
    // Generate a 9-digit ID number with check digit
    const base = Math.floor(Math.random() * 100000000) + 100000000;
    const checkDigit = base % 10;
    return `${base}${checkDigit}`;
  }

  /**
   * Generate Machine Readable Zone for passports
   */
  private generateMRZ(fullName: string, passportNumber: string, nationality: string): string {
    const nameParts = fullName.split(' ');
    const lastName = nameParts.pop() || '';
    const firstNames = nameParts.join('<');
    const nationalityCode = nationality.substring(0, 3).toUpperCase();
    
    // Simplified MRZ format
    const line1 = `P<${nationalityCode}${lastName.toUpperCase()}<<${firstNames.toUpperCase()}`;
    const line2 = `${passportNumber}${nationalityCode}${new Date().getFullYear().toString().substring(2)}${Math.floor(Math.random() * 100).toString().padStart(2, '0')}`;
    
    return `${line1.padEnd(44, '<')}\n${line2.padEnd(44, '<')}`;
  }

  /**
   * Generate simulated RFID chip data
   */
  private generateRFIDData(): string {
    return crypto.randomBytes(32).toString('hex').toUpperCase();
  }

  /**
   * Generate simulated fingerprint data
   */
  private generateFingerprintData(): string {
    return crypto.randomBytes(64).toString('hex').toUpperCase();
  }

  /**
   * Generate security features metadata
   */
  private generateSecurityFeatures(documentType: string): Record<string, any> {
    return {
      watermarkType: 'government_seal',
      securityThread: crypto.randomBytes(8).toString('hex'),
      microtext: `OFFICIAL-${documentType.toUpperCase()}`,
      holographicElements: ['rainbow_foil', 'security_strip'],
      backgroundPattern: 'government_guilloche',
      colorChangingInk: true,
      uvReactiveInk: true,
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Add PDFKit enhanced security features to documents
   */
  private addPDFKitEnhancedSecurityFeatures(doc: PDFKit, documentType: string, data: any) {
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;

    // Security border
    doc.strokeColor('#002060')
       .lineWidth(3)
       .rect(5, 5, pageWidth - 10, pageHeight - 10)
       .stroke();

    // Corner security patterns
    doc.strokeColor('#002060')
       .lineWidth(1);
    for (let i = 1; i <= 10; i++) {
      doc.circle(20, 20, i * 2).stroke();
      doc.circle(pageWidth - 20, 20, i * 2).stroke();
      doc.circle(20, pageHeight - 20, i * 2).stroke();
      doc.circle(pageWidth - 20, pageHeight - 20, i * 2).stroke();
    }

    // QR code placeholder (if not card format)
    if (documentType !== 'id_card' && documentType !== 'passport') {
      doc.rect(pageWidth - 90, pageHeight - 90, 80, 80)
         .fillColor('white')
         .fill()
         .strokeColor('black')
         .stroke();
      
      doc.fillColor('black')
         .fontSize(10)
         .text('QR Code', pageWidth - 50, pageHeight - 60, { align: 'center' })
         .text('Verification', pageWidth - 50, pageHeight - 45, { align: 'center' });
    }

    // Security thread simulation
    doc.strokeColor('#FFD700') // Gold color
       .lineWidth(2)
       .moveTo(pageWidth * 0.3, 0)
       .lineTo(pageWidth * 0.3, pageHeight)
       .stroke();
    
    // Reset colors
    doc.fillColor('black')
       .strokeColor('black')
       .lineWidth(1);
  }

  /**
   * Verify document authenticity using verification code
   */
  async verifyDocument(verificationCode: string): Promise<{
    isValid: boolean;
    document?: Certificate | Permit;
    type?: 'certificate' | 'permit';
    error?: string;
  }> {
    try {
      // Try to find certificate first
      const certificate = await storage.getCertificateByVerificationCode(verificationCode);
      if (certificate) {
        return {
          isValid: !certificate.isRevoked && certificate.status === 'active',
          document: certificate,
          type: 'certificate'
        };
      }

      // Try to find permit
      const permit = await storage.getPermitByVerificationCode(verificationCode);
      if (permit) {
        return {
          isValid: !permit.isRevoked && permit.status === 'active',
          document: permit,
          type: 'permit'
        };
      }

      return {
        isValid: false,
        error: 'Document not found'
      };

    } catch (error) {
      console.error('Error verifying document:', error);
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Verification failed'
      };
    }
  }

  /**
   * Create a new document template
   */
  async createDocumentTemplate(
    name: string,
    type: 'certificate' | 'permit',
    htmlTemplate: string,
    cssStyles: string,
    officialLayout: Record<string, any>
  ): Promise<DocumentTemplate> {
    const templateData = {
      name,
      type,
      htmlTemplate,
      cssStyles,
      officialLayout,
      isActive: true
    };

    return await storage.createDocumentTemplate(templateData);
  }

  /**
   * Get available document templates
   */
  async getDocumentTemplates(type?: 'certificate' | 'permit'): Promise<DocumentTemplate[]> {
    return await storage.getDocumentTemplates(type);
  }
}

export const documentGenerator = new DocumentGeneratorService();

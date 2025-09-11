import { storage } from "../storage";
import { 
  InsertCertificate, InsertPermit, Certificate, Permit, DocumentTemplate,
  InsertBirthCertificate, InsertMarriageCertificate, InsertPassport, 
  InsertDeathCertificate, InsertWorkPermit, InsertPermanentVisa, InsertIdCard,
  BirthCertificate, MarriageCertificate, Passport, DeathCertificate, 
  WorkPermit, PermanentVisa, IdCard, InsertDocumentVerification
} from "@shared/schema";
import jsPDF from "jspdf";
import PDFDocument from "pdfkit";
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
      const passportNumber = this.generatePassportNumber();
      const verificationCode = this.generateVerificationCode();
      
      const passportData: InsertPassport = {
        ...data,
        userId,
        passportNumber,
        verificationCode,
        documentUrl: null,
        qrCodeUrl: null,
        digitalSignature: null,
        machineReadableZone: this.generateMRZ(data.fullName, passportNumber, data.nationality),
        rfidChipData: this.generateRFIDData(),
        securityFeatures: this.generateSecurityFeatures('passport'),
        status: "active",
        isRevoked: false
      };

      const pdfResult = await this.generateGovernmentPDF('passport', passportData);
      if (!pdfResult.success) {
        return { success: false, error: pdfResult.error };
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
   * Generate PDF document using jsPDF with official styling
   */
  private async generatePDF(
    documentType: 'certificate' | 'permit',
    data: InsertCertificate | InsertPermit
  ): Promise<{ success: boolean; documentUrl?: string; error?: string }> {
    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      // Set up official styling
      this.setupOfficialStyling(doc);

      // Add header with official branding
      this.addOfficialHeader(doc, documentType);

      // Add document content
      if (documentType === 'certificate') {
        this.addCertificateContent(doc, data as InsertCertificate);
      } else {
        this.addPermitContent(doc, data as InsertPermit);
      }

      // Add footer with verification info
      this.addOfficialFooter(doc, data.verificationCode);

      // Add security features
      await this.addSecurityFeatures(doc, data);

      // Save PDF
      const filename = `${documentType}_${data.verificationCode}.pdf`;
      const filepath = path.join(DOCUMENTS_DIR, filename);
      const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
      
      await fs.writeFile(filepath, pdfBuffer);

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
   * Set up official styling for the document
   */
  private setupOfficialStyling(doc: jsPDF) {
    // Add government-style colors and fonts
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
  }

  /**
   * Add official header with branding and security elements
   */
  private addOfficialHeader(doc: jsPDF, documentType: string) {
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Official header background
    doc.setFillColor(41, 128, 185); // Official blue
    doc.rect(0, 0, pageWidth, 25, 'F');
    
    // Title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    const title = documentType === 'certificate' ? 'OFFICIAL CERTIFICATE' : 'OFFICIAL PERMIT';
    doc.text(title, pageWidth / 2, 15, { align: 'center' });
    
    // Reset colors
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
  }

  /**
   * Add certificate-specific content
   */
  private addCertificateContent(doc: jsPDF, data: InsertCertificate) {
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 45;

    // Certificate title
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text(data.title, pageWidth / 2, yPos, { align: 'center' });
    yPos += 20;

    // Description
    doc.setFontSize(14);
    doc.setFont("helvetica", "normal");
    doc.text(data.description, pageWidth / 2, yPos, { align: 'center', maxWidth: 200 });
    yPos += 30;

    // Certificate details
    doc.setFontSize(12);
    doc.text(`Serial Number: ${data.serialNumber}`, 20, yPos);
    yPos += 8;
    doc.text(`Issue Date: ${(data.issuedAt || new Date()).toLocaleDateString()}`, 20, yPos);
    yPos += 8;
    if (data.expiresAt) {
      doc.text(`Expires: ${data.expiresAt.toLocaleDateString()}`, 20, yPos);
    }

    // Add custom data fields
    if (data.data && typeof data.data === 'object') {
      yPos += 15;
      Object.entries(data.data).forEach(([key, value]) => {
        doc.text(`${key}: ${value}`, 20, yPos);
        yPos += 8;
      });
    }
  }

  /**
   * Add permit-specific content
   */
  private addPermitContent(doc: jsPDF, data: InsertPermit) {
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 45;

    // Permit title
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text(data.title, pageWidth / 2, yPos, { align: 'center' });
    yPos += 20;

    // Description
    doc.setFontSize(14);
    doc.setFont("helvetica", "normal");
    doc.text(data.description, pageWidth / 2, yPos, { align: 'center', maxWidth: 200 });
    yPos += 30;

    // Permit details
    doc.setFontSize(12);
    doc.text(`Permit Number: ${data.permitNumber}`, 20, yPos);
    yPos += 8;
    doc.text(`Issue Date: ${(data.issuedAt || new Date()).toLocaleDateString()}`, 20, yPos);
    yPos += 8;
    if (data.expiresAt) {
      doc.text(`Expires: ${data.expiresAt.toLocaleDateString()}`, 20, yPos);
    }

    // Add custom data fields
    if (data.data && typeof data.data === 'object') {
      yPos += 15;
      Object.entries(data.data).forEach(([key, value]) => {
        doc.text(`${key}: ${value}`, 20, yPos);
        yPos += 8;
      });
    }

    // Add conditions if present
    if (data.conditions && typeof data.conditions === 'object') {
      yPos += 15;
      doc.setFont("helvetica", "bold");
      doc.text("Terms and Conditions:", 20, yPos);
      yPos += 8;
      doc.setFont("helvetica", "normal");
      Object.entries(data.conditions).forEach(([key, value]) => {
        doc.text(`• ${key}: ${value}`, 25, yPos);
        yPos += 8;
      });
    }
  }

  /**
   * Add official footer with verification code and security elements
   */
  private addOfficialFooter(doc: jsPDF, verificationCode: string) {
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Footer background
    doc.setFillColor(236, 240, 241); // Light gray
    doc.rect(0, pageHeight - 30, pageWidth, 30, 'F');
    
    // Verification info
    doc.setFontSize(10);
    doc.setTextColor(52, 73, 94);
    doc.text(`Verification Code: ${verificationCode}`, 20, pageHeight - 20);
    doc.text(`Document generated: ${new Date().toLocaleString()}`, 20, pageHeight - 12);
    
    // Security text
    doc.text('This document contains security features. Visit our verification portal to authenticate.', 
             pageWidth - 20, pageHeight - 16, { align: 'right' });
    
    // Reset colors
    doc.setTextColor(0, 0, 0);
  }

  /**
   * Add security features like watermarks and patterns
   */
  private async addSecurityFeatures(doc: jsPDF, data: InsertCertificate | InsertPermit) {
    // Add watermark
    doc.setFontSize(72);
    doc.setTextColor(240, 240, 240); // Very light gray
    doc.setFont("helvetica", "bold");
    
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Rotate and add watermark
    doc.text('OFFICIAL', pageWidth / 2, pageHeight / 2, {
      align: 'center',
      angle: 45
    });
    
    // Reset text settings
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);

    // Add security border pattern
    doc.setDrawColor(41, 128, 185);
    doc.setLineWidth(2);
    doc.rect(5, 5, pageWidth - 10, pageHeight - 10);
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
  private generateDigitalSignature(data: InsertCertificate | InsertPermit): string {
    const secretKey = process.env.DIGITAL_SIGNATURE_KEY || 'default-signature-key';
    const content = JSON.stringify({
      verificationCode: data.verificationCode,
      title: data.title,
      issuedAt: data.issuedAt || new Date(),
      userId: data.userId
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
      const doc = new jsPDF({
        orientation: isCardFormat ? 'landscape' : 'portrait',
        unit: 'mm',
        format: isCardFormat ? [85.6, 54] : 'a4' // ID card size or A4
      });

      // Apply document-specific styling and layout
      await this.applyOfficialLayout(doc, documentType, data);
      
      // Add security features
      await this.addEnhancedSecurityFeatures(doc, documentType, data);

      // Save PDF
      const filename = `${documentType}_${data.verificationCode}.pdf`;
      const filepath = path.join(DOCUMENTS_DIR, filename);
      const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
      
      await fs.writeFile(filepath, pdfBuffer);

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
   * Apply official layout based on document type
   */
  private async applyOfficialLayout(doc: jsPDF, documentType: string, data: any) {
    switch (documentType) {
      case 'birth_certificate':
        this.layoutBirthCertificate(doc, data);
        break;
      case 'marriage_certificate':
        this.layoutMarriageCertificate(doc, data);
        break;
      case 'passport':
        this.layoutPassport(doc, data);
        break;
      case 'death_certificate':
        this.layoutDeathCertificate(doc, data);
        break;
      case 'work_permit':
        this.layoutWorkPermit(doc, data);
        break;
      case 'permanent_visa':
        this.layoutPermanentVisa(doc, data);
        break;
      case 'id_card':
        this.layoutIdCard(doc, data);
        break;
    }
  }

  /**
   * Layout Birth Certificate with official design
   */
  private layoutBirthCertificate(doc: jsPDF, data: any) {
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;

    // Official header
    doc.setFillColor(0, 32, 96); // Official dark blue
    doc.rect(0, 0, pageWidth, 35, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text('CERTIFICATE OF LIVE BIRTH', pageWidth / 2, 15, { align: 'center' });
    doc.setFontSize(12);
    doc.text('OFFICIAL GOVERNMENT DOCUMENT', pageWidth / 2, 25, { align: 'center' });
    
    // Reset colors
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    yPos = 50;

    // Registration info box
    doc.setDrawColor(0, 32, 96);
    doc.setLineWidth(1);
    doc.rect(15, yPos, pageWidth - 30, 20);
    doc.setFontSize(10);
    doc.text(`Registration No: ${data.registrationNumber}`, 20, yPos + 8);
    doc.text(`Registration Date: ${data.registrationDate?.toLocaleDateString() || new Date().toLocaleDateString()}`, 20, yPos + 15);
    yPos += 35;

    // Personal information
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text('CHILD INFORMATION', 20, yPos);
    yPos += 10;

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Full Name: ${data.fullName}`, 20, yPos);
    yPos += 8;
    doc.text(`Date of Birth: ${data.dateOfBirth?.toLocaleDateString()}`, 20, yPos);
    yPos += 8;
    doc.text(`Place of Birth: ${data.placeOfBirth}`, 20, yPos);
    yPos += 15;

    // Parents information
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text('PARENT INFORMATION', 20, yPos);
    yPos += 10;

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Mother's Full Name: ${data.motherFullName}`, 20, yPos);
    yPos += 8;
    if (data.motherMaidenName) {
      doc.text(`Mother's Maiden Name: ${data.motherMaidenName}`, 20, yPos);
      yPos += 8;
    }
    doc.text(`Father's Full Name: ${data.fatherFullName}`, 20, yPos);
    yPos += 15;

    // Official signatures area
    yPos = Math.max(yPos, 200);
    doc.setDrawColor(0, 32, 96);
    doc.line(20, yPos, 80, yPos);
    doc.setFontSize(10);
    doc.text('Registrar Signature', 20, yPos + 8);
    
    doc.line(pageWidth - 80, yPos, pageWidth - 20, yPos);
    doc.text('Official Seal', pageWidth - 80, yPos + 8);
  }

  /**
   * Layout Marriage Certificate with official design
   */
  private layoutMarriageCertificate(doc: jsPDF, data: any) {
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;

    // Official header
    doc.setFillColor(139, 0, 0); // Maroon color for marriage certificates
    doc.rect(0, 0, pageWidth, 35, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text('CERTIFICATE OF MARRIAGE', pageWidth / 2, 15, { align: 'center' });
    doc.setFontSize(12);
    doc.text('OFFICIAL GOVERNMENT DOCUMENT', pageWidth / 2, 25, { align: 'center' });
    
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    yPos = 50;

    // Marriage details
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text('MARRIAGE INFORMATION', 20, yPos);
    yPos += 10;

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`License Number: ${data.licenseNumber}`, 20, yPos);
    yPos += 8;
    doc.text(`Marriage Date: ${data.marriageDate?.toLocaleDateString()}`, 20, yPos);
    yPos += 8;
    doc.text(`Marriage Place: ${data.marriagePlace}`, 20, yPos);
    yPos += 15;

    // Spouse information in two columns
    const midPoint = pageWidth / 2;
    
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text('SPOUSE ONE', 20, yPos);
    doc.text('SPOUSE TWO', midPoint + 10, yPos);
    yPos += 10;

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(data.spouseOneFullName, 20, yPos);
    doc.text(data.spouseTwoFullName, midPoint + 10, yPos);
    yPos += 8;
    doc.text(data.spouseOneDateOfBirth?.toLocaleDateString() || '', 20, yPos);
    doc.text(data.spouseTwoDateOfBirth?.toLocaleDateString() || '', midPoint + 10, yPos);
    yPos += 8;
    doc.text(data.spouseOnePlaceOfBirth, 20, yPos);
    doc.text(data.spouseTwoPlaceOfBirth, midPoint + 10, yPos);
    yPos += 15;

    // Witnesses and officiant
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text('WITNESSES & OFFICIANT', 20, yPos);
    yPos += 10;

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Witness 1: ${data.witnessOneName}`, 20, yPos);
    yPos += 8;
    doc.text(`Witness 2: ${data.witnessTwoName}`, 20, yPos);
    yPos += 8;
    doc.text(`Officiant: ${data.officiantName}`, 20, yPos);
  }

  /**
   * Layout Passport with official design
   */
  private layoutPassport(doc: jsPDF, data: any) {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Passport cover (dark blue)
    doc.setFillColor(0, 20, 80);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // Gold lettering
    doc.setTextColor(255, 215, 0);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text(data.countryOfIssue || 'UNITED STATES', pageWidth / 2, 8, { align: 'center' });
    doc.setFontSize(6);
    doc.text('PASSPORT', pageWidth / 2, 15, { align: 'center' });

    // Photo area
    doc.setFillColor(240, 240, 240);
    doc.rect(5, 18, 25, 30);
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(6);
    doc.text('PHOTO', 17.5, 33, { align: 'center' });

    // Personal information
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    let yPos = 20;
    
    doc.text(`Type: P`, 35, yPos);
    yPos += 4;
    doc.text(`Country Code: ${data.nationality?.substring(0, 3).toUpperCase()}`, 35, yPos);
    yPos += 4;
    doc.text(`Passport No: ${data.passportNumber}`, 35, yPos);
    yPos += 4;
    doc.text(`Surname: ${data.fullName?.split(' ').pop()}`, 35, yPos);
    yPos += 4;
    doc.text(`Given Names: ${data.fullName?.split(' ').slice(0, -1).join(' ')}`, 35, yPos);
    yPos += 4;
    doc.text(`Nationality: ${data.nationality}`, 35, yPos);
    yPos += 4;
    doc.text(`Date of Birth: ${data.dateOfBirth?.toLocaleDateString()}`, 35, yPos);
    yPos += 4;
    doc.text(`Sex: ${data.sex}`, 35, yPos);
    yPos += 4;
    doc.text(`Place of Birth: ${data.placeOfBirth}`, 35, yPos);

    // Machine Readable Zone
    if (data.machineReadableZone) {
      doc.setFontSize(5);
      doc.setFont("courier", "normal");
      doc.text(data.machineReadableZone, 5, pageHeight - 8);
    }
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
   * Number generation methods
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
   * Layout Death Certificate with official design
   */
  private layoutDeathCertificate(doc: jsPDF, data: any) {
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;

    // Official header
    doc.setFillColor(64, 64, 64); // Dark gray for death certificates
    doc.rect(0, 0, pageWidth, 35, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text('CERTIFICATE OF DEATH', pageWidth / 2, 15, { align: 'center' });
    doc.setFontSize(12);
    doc.text('OFFICIAL GOVERNMENT DOCUMENT', pageWidth / 2, 25, { align: 'center' });
    
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    yPos = 50;

    // Registration info
    doc.setDrawColor(64, 64, 64);
    doc.setLineWidth(1);
    doc.rect(15, yPos, pageWidth - 30, 20);
    doc.setFontSize(10);
    doc.text(`Registration No: ${data.registrationNumber}`, 20, yPos + 8);
    doc.text(`Registration Date: ${data.registrationDate?.toLocaleDateString() || new Date().toLocaleDateString()}`, 20, yPos + 15);
    yPos += 35;

    // Deceased information
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text('DECEASED INFORMATION', 20, yPos);
    yPos += 10;

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Full Name: ${data.deceasedFullName}`, 20, yPos);
    yPos += 8;
    doc.text(`Date of Birth: ${data.dateOfBirth?.toLocaleDateString()}`, 20, yPos);
    yPos += 8;
    doc.text(`Date of Death: ${data.dateOfDeath?.toLocaleDateString()}`, 20, yPos);
    yPos += 8;
    doc.text(`Place of Death: ${data.placeOfDeath}`, 20, yPos);
    yPos += 15;

    // Medical information
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text('MEDICAL INFORMATION', 20, yPos);
    yPos += 10;

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Cause of Death: ${data.causeOfDeath}`, 20, yPos);
    yPos += 8;
    if (data.mannerOfDeath) {
      doc.text(`Manner of Death: ${data.mannerOfDeath}`, 20, yPos);
      yPos += 8;
    }
    doc.text(`Certifying Physician: ${data.certifyingPhysician}`, 20, yPos);
    yPos += 15;

    // Informant information
    if (data.informantName) {
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text('INFORMANT INFORMATION', 20, yPos);
      yPos += 10;

      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text(`Informant: ${data.informantName}`, 20, yPos);
      yPos += 8;
      if (data.relationshipToDeceased) {
        doc.text(`Relationship: ${data.relationshipToDeceased}`, 20, yPos);
      }
    }
  }

  /**
   * Layout Work Permit with official design
   */
  private layoutWorkPermit(doc: jsPDF, data: any) {
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;

    // Official header
    doc.setFillColor(0, 102, 51); // Green for work permits
    doc.rect(0, 0, pageWidth, 35, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text('WORK PERMIT', pageWidth / 2, 15, { align: 'center' });
    doc.setFontSize(12);
    doc.text('AUTHORIZATION TO WORK', pageWidth / 2, 25, { align: 'center' });
    
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    yPos = 50;

    // Permit details
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text('PERMIT INFORMATION', 20, yPos);
    yPos += 10;

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Permit Number: ${data.permitNumber}`, 20, yPos);
    yPos += 8;
    doc.text(`Valid From: ${data.validFrom?.toLocaleDateString()}`, 20, yPos);
    yPos += 8;
    doc.text(`Valid Until: ${data.validUntil?.toLocaleDateString()}`, 20, yPos);
    yPos += 15;

    // Employee information
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text('EMPLOYEE INFORMATION', 20, yPos);
    yPos += 10;

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Full Name: ${data.employeeFullName}`, 20, yPos);
    yPos += 8;
    doc.text(`Nationality: ${data.employeeNationality}`, 20, yPos);
    yPos += 8;
    doc.text(`Passport Number: ${data.employeePassportNumber}`, 20, yPos);
    yPos += 15;

    // Employment details
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text('EMPLOYMENT DETAILS', 20, yPos);
    yPos += 10;

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Employer: ${data.employerName}`, 20, yPos);
    yPos += 8;
    doc.text(`Job Title: ${data.jobTitle}`, 20, yPos);
    yPos += 8;
    doc.text(`Work Location: ${data.workLocation}`, 20, yPos);
    
    // Work restrictions
    if (data.workRestrictions && Array.isArray(data.workRestrictions)) {
      yPos += 15;
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text('WORK RESTRICTIONS', 20, yPos);
      yPos += 10;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      data.workRestrictions.forEach((restriction: string) => {
        doc.text(`• ${restriction}`, 25, yPos);
        yPos += 6;
      });
    }
  }

  /**
   * Layout Permanent Visa with official design
   */
  private layoutPermanentVisa(doc: jsPDF, data: any) {
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;

    // Official header
    doc.setFillColor(128, 0, 128); // Purple for visas
    doc.rect(0, 0, pageWidth, 35, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text('PERMANENT RESIDENT VISA', pageWidth / 2, 15, { align: 'center' });
    doc.setFontSize(12);
    doc.text('OFFICIAL IMMIGRATION DOCUMENT', pageWidth / 2, 25, { align: 'center' });
    
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    yPos = 50;

    // Photo area
    doc.setFillColor(240, 240, 240);
    doc.rect(pageWidth - 50, yPos, 30, 40);
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(8);
    doc.text('PHOTO', pageWidth - 35, yPos + 22, { align: 'center' });
    doc.setTextColor(0, 0, 0);

    // Visa information
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text('VISA INFORMATION', 20, yPos);
    yPos += 10;

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Visa Number: ${data.visaNumber}`, 20, yPos);
    yPos += 8;
    doc.text(`Visa Type: ${data.visaType}`, 20, yPos);
    yPos += 8;
    doc.text(`Category: ${data.visaCategory}`, 20, yPos);
    yPos += 8;
    doc.text(`Valid From: ${data.validFrom?.toLocaleDateString()}`, 20, yPos);
    yPos += 8;
    if (data.expiryDate) {
      doc.text(`Expires: ${data.expiryDate?.toLocaleDateString()}`, 20, yPos);
      yPos += 8;
    }
    yPos += 10;

    // Holder information
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text('HOLDER INFORMATION', 20, yPos);
    yPos += 10;

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Full Name: ${data.holderFullName}`, 20, yPos);
    yPos += 8;
    doc.text(`Nationality: ${data.holderNationality}`, 20, yPos);
    yPos += 8;
    doc.text(`Passport Number: ${data.holderPassportNumber}`, 20, yPos);
    yPos += 8;
    doc.text(`Country of Issue: ${data.countryOfIssue}`, 20, yPos);

    // Immigration stamps area
    if (data.immigrationStamps && Array.isArray(data.immigrationStamps)) {
      yPos += 15;
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text('IMMIGRATION STAMPS', 20, yPos);
      yPos += 10;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      data.immigrationStamps.forEach((stamp: any) => {
        doc.text(`${stamp.date} - ${stamp.port} - ${stamp.type}`, 25, yPos);
        yPos += 6;
      });
    }
  }

  /**
   * Layout ID Card with official design
   */
  private layoutIdCard(doc: jsPDF, data: any) {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Card background
    doc.setFillColor(245, 245, 245);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // Header stripe
    doc.setFillColor(0, 32, 96);
    doc.rect(0, 0, pageWidth, 8, 'F');

    // Government seal area
    doc.setFillColor(220, 220, 220);
    doc.circle(12, 15, 8);
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(4);
    doc.text('SEAL', 12, 16, { align: 'center' });

    // Photo area
    doc.setFillColor(240, 240, 240);
    doc.rect(4, 25, 16, 20);
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(4);
    doc.text('PHOTO', 12, 36, { align: 'center' });

    // Personal information
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text('IDENTIFICATION CARD', pageWidth / 2, 6, { align: 'center' });

    doc.setFontSize(5);
    doc.setFont("helvetica", "normal");
    let yPos = 12;
    doc.text(`ID No: ${data.idNumber}`, 25, yPos);
    yPos += 4;
    doc.text(`Name: ${data.fullName}`, 25, yPos);
    yPos += 4;
    doc.text(`DOB: ${data.dateOfBirth?.toLocaleDateString()}`, 25, yPos);
    yPos += 4;
    doc.text(`Sex: ${data.sex}`, 25, yPos);
    yPos += 4;
    doc.text(`Nationality: ${data.nationality}`, 25, yPos);
    yPos += 4;
    doc.text(`Address: ${data.address}`, 25, yPos);
    yPos += 4;
    doc.text(`Issued: ${data.issueDate?.toLocaleDateString()}`, 25, yPos);
    yPos += 4;
    doc.text(`Expires: ${data.expiryDate?.toLocaleDateString()}`, 25, yPos);

    // Signature area
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.2);
    doc.line(25, pageHeight - 8, pageWidth - 5, pageHeight - 8);
    doc.setFontSize(3);
    doc.text('Signature', 25, pageHeight - 5);

    // Security pattern background
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.1);
    for (let i = 0; i < pageWidth; i += 2) {
      doc.line(i, 0, i, pageHeight);
    }
  }

  /**
   * Add enhanced security features to documents
   */
  private async addEnhancedSecurityFeatures(doc: jsPDF, documentType: string, data: any) {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Security border
    doc.setDrawColor(0, 32, 96);
    doc.setLineWidth(2);
    doc.rect(2, 2, pageWidth - 4, pageHeight - 4);

    // Corner security patterns
    doc.setLineWidth(0.5);
    for (let i = 0; i < 10; i++) {
      doc.circle(8, 8, i * 0.5);
      doc.circle(pageWidth - 8, 8, i * 0.5);
      doc.circle(8, pageHeight - 8, i * 0.5);
      doc.circle(pageWidth - 8, pageHeight - 8, i * 0.5);
    }

    // Microtext security features
    doc.setFontSize(2);
    doc.setTextColor(150, 150, 150);
    const microtext = `OFFICIAL-${documentType.toUpperCase()}-SECURE`;
    for (let y = 10; y < pageHeight - 10; y += 5) {
      doc.text(microtext, 5, y, { angle: 45 });
    }

    // QR code placement (if not card format)
    if (documentType !== 'id_card' && documentType !== 'passport') {
      doc.setFillColor(255, 255, 255);
      doc.rect(pageWidth - 35, pageHeight - 35, 30, 30, 'F');
      doc.setDrawColor(0, 0, 0);
      doc.rect(pageWidth - 35, pageHeight - 35, 30, 30);
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(6);
      doc.text('QR Code', pageWidth - 20, pageHeight - 18, { align: 'center' });
      doc.text('Verification', pageWidth - 20, pageHeight - 12, { align: 'center' });
    }

    // Security thread simulation
    doc.setDrawColor(255, 215, 0); // Gold color
    doc.setLineWidth(1);
    doc.line(pageWidth * 0.3, 0, pageWidth * 0.3, pageHeight);
    
    // Reset colors
    doc.setTextColor(0, 0, 0);
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(1);
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
import { storage } from "../storage";
import { InsertCertificate, InsertPermit, Certificate, Permit, DocumentTemplate } from "@shared/schema";
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
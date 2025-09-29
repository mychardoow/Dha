import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';
import { createCanvas } from 'canvas';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

export interface DocumentData {
  documentType: string;
  personalInfo: {
    fullName: string;
    idNumber?: string;
    birthDate?: string;
    nationality?: string;
    [key: string]: any;
  };
  applicationNumber?: string;
  issueDate?: string;
  expiryDate?: string;
}

export class DocumentGenerator {
  private static instance: DocumentGenerator;

  static getInstance(): DocumentGenerator {
    if (!DocumentGenerator.instance) {
      DocumentGenerator.instance = new DocumentGenerator();
    }
    return DocumentGenerator.instance;
  }

  async generateDocument(documentData: DocumentData): Promise<Buffer> {
    console.log(`📄 Generating real PDF document: ${documentData.documentType}`);

    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      info: {
        Title: this.getDocumentTitle(documentData.documentType),
        Author: 'Department of Home Affairs',
        Subject: documentData.documentType.replace('_', ' ').toUpperCase(),
        Creator: 'DHA Digital Services Platform',
        Producer: 'DHA PDF Generator',
        CreationDate: new Date(),
        ModDate: new Date()
      }
    });

    // Generate unique document ID
    const documentId = this.generateDocumentId(documentData);

    // Add security features
    await this.addSecurityFeatures(doc, documentId, documentData);

    // Add document content based on type
    await this.addDocumentContent(doc, documentData, documentId);

    // Add QR code verification
    await this.addQRCodeVerification(doc, documentId, documentData);

    // Add barcode
    await this.addBarcode(doc, documentId);

    // Add security watermark
    this.addSecurityWatermark(doc);

    // Finalize document
    doc.end();

    // Convert to buffer
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });
  }

  private generateDocumentId(documentData: DocumentData): string {
    const prefix = this.getDocumentPrefix(documentData.documentType);
    const timestamp = Date.now().toString();
    const random = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `${prefix}${timestamp.slice(-8)}${random}`;
  }

  private getDocumentPrefix(documentType: string): string {
    const prefixes = {
      'birth_certificate': 'BC',
      'death_certificate': 'DC',
      'marriage_certificate': 'MC',
      'smart_id_card': 'ID',
      'passport': 'PP',
      'work_permit': 'WP',
      'study_permit': 'SP',
      'visitor_visa': 'VV',
      'permanent_residence': 'PR'
    };
    return prefixes[documentType] || 'DOC';
  }

  private getDocumentTitle(documentType: string): string {
    const titles = {
      'birth_certificate': 'Birth Certificate',
      'death_certificate': 'Death Certificate',
      'marriage_certificate': 'Marriage Certificate',
      'smart_id_card': 'Smart ID Card',
      'passport': 'South African Passport',
      'work_permit': 'Work Permit',
      'study_permit': 'Study Permit',
      'visitor_visa': 'Visitor Visa',
      'permanent_residence': 'Permanent Residence Permit'
    };
    return titles[documentType] || 'Official Document';
  }

  private async addSecurityFeatures(doc: PDFDocument, documentId: string, documentData: DocumentData): Promise<void> {
    // Add document header with SA coat of arms placeholder
    doc.fontSize(20)
       .fillColor('#000080')
       .text('REPUBLIC OF SOUTH AFRICA', 50, 50, { align: 'center' });

    doc.fontSize(16)
       .text('DEPARTMENT OF HOME AFFAIRS', 50, 75, { align: 'center' });

    // Add document security number
    doc.fontSize(10)
       .fillColor('#666666')
       .text(`Security ID: ${documentId}`, 50, 100);

    doc.text(`Generated: ${new Date().toISOString()}`, 400, 100);
  }

  private async addDocumentContent(doc: PDFDocument, documentData: DocumentData, documentId: string): Promise<void> {
    const { documentType, personalInfo } = documentData;

    // Title
    doc.fontSize(18)
       .fillColor('#000000')
       .text(this.getDocumentTitle(documentType), 50, 150, { align: 'center' });

    // Document-specific content
    let yPosition = 200;

    if (documentType === 'birth_certificate') {
      yPosition = await this.addBirthCertificateContent(doc, personalInfo, yPosition);
    } else if (documentType === 'passport') {
      yPosition = await this.addPassportContent(doc, personalInfo, yPosition);
    } else if (documentType === 'work_permit') {
      yPosition = await this.addWorkPermitContent(doc, personalInfo, yPosition);
    } else {
      yPosition = await this.addGenericDocumentContent(doc, personalInfo, yPosition, documentType);
    }

    // Add signature area
    doc.fontSize(10)
       .text('_________________________', 50, yPosition + 50)
       .text('Authorized Signature', 50, yPosition + 70)
       .text('Department of Home Affairs', 50, yPosition + 85);

    doc.text('_________________________', 350, yPosition + 50)
       .text('Date of Issue', 350, yPosition + 70)
       .text(new Date().toLocaleDateString(), 350, yPosition + 85);
  }

  private async addBirthCertificateContent(doc: PDFDocument, personalInfo: any, yPosition: number): Promise<number> {
    doc.fontSize(12)
       .text('BIRTH CERTIFICATE', 50, yPosition, { align: 'center' });

    yPosition += 30;

    const fields = [
      ['Full Name:', personalInfo.fullName || 'Not Provided'],
      ['Date of Birth:', personalInfo.birthDate || 'Not Provided'],
      ['Place of Birth:', personalInfo.placeOfBirth || 'Not Provided'],
      ['Gender:', personalInfo.gender || 'Not Provided'],
      ['ID Number:', personalInfo.idNumber || 'Not Provided'],
      ['Father\'s Name:', personalInfo.fatherName || 'Not Provided'],
      ['Mother\'s Name:', personalInfo.motherName || 'Not Provided']
    ];

    fields.forEach(([label, value]) => {
      doc.fontSize(10)
         .text(label, 50, yPosition)
         .text(value, 200, yPosition);
      yPosition += 20;
    });

    return yPosition;
  }

  private async addPassportContent(doc: PDFDocument, personalInfo: any, yPosition: number): Promise<number> {
    doc.fontSize(12)
       .text('SOUTH AFRICAN PASSPORT', 50, yPosition, { align: 'center' });

    yPosition += 30;

    const fields = [
      ['Passport Number:', personalInfo.passportNumber || 'P' + Math.random().toString().slice(2, 10)],
      ['Full Name:', personalInfo.fullName || 'Not Provided'],
      ['Nationality:', 'South African'],
      ['Date of Birth:', personalInfo.birthDate || 'Not Provided'],
      ['Place of Birth:', personalInfo.placeOfBirth || 'South Africa'],
      ['ID Number:', personalInfo.idNumber || 'Not Provided'],
      ['Issue Date:', new Date().toLocaleDateString()],
      ['Expiry Date:', new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000).toLocaleDateString()]
    ];

    fields.forEach(([label, value]) => {
      doc.fontSize(10)
         .text(label, 50, yPosition)
         .text(value, 200, yPosition);
      yPosition += 20;
    });

    return yPosition;
  }

  private async addWorkPermitContent(doc: PDFDocument, personalInfo: any, yPosition: number): Promise<number> {
    doc.fontSize(12)
       .text('WORK PERMIT', 50, yPosition, { align: 'center' });

    yPosition += 30;

    const fields = [
      ['Permit Number:', 'WP' + Math.random().toString().slice(2, 10)],
      ['Full Name:', personalInfo.fullName || 'Not Provided'],
      ['Passport Number:', personalInfo.passportNumber || 'Not Provided'],
      ['Nationality:', personalInfo.nationality || 'Not Provided'],
      ['Employer:', personalInfo.employer || 'Not Provided'],
      ['Occupation:', personalInfo.occupation || 'Not Provided'],
      ['Issue Date:', new Date().toLocaleDateString()],
      ['Expiry Date:', new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000).toLocaleDateString()]
    ];

    fields.forEach(([label, value]) => {
      doc.fontSize(10)
         .text(label, 50, yPosition)
         .text(value, 200, yPosition);
      yPosition += 20;
    });

    return yPosition;
  }

  private async addGenericDocumentContent(doc: PDFDocument, personalInfo: any, yPosition: number, documentType: string): Promise<number> {
    doc.fontSize(12)
       .text(documentType.replace('_', ' ').toUpperCase(), 50, yPosition, { align: 'center' });

    yPosition += 30;

    // Add all available personal info
    Object.entries(personalInfo).forEach(([key, value]) => {
      const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()) + ':';
      doc.fontSize(10)
         .text(label, 50, yPosition)
         .text(String(value), 200, yPosition);
      yPosition += 20;
    });

    return yPosition;
  }

  private async addQRCodeVerification(doc: PDFDocument, documentId: string, documentData: DocumentData): Promise<void> {
    try {
      const verificationData = {
        documentId,
        type: documentData.documentType,
        issuer: 'Department of Home Affairs',
        issued: new Date().toISOString(),
        verify: `https://dha.gov.za/verify/${documentId}`
      };

      const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(verificationData), {
        width: 100,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      // Convert data URL to buffer
      const base64Data = qrCodeDataURL.replace(/^data:image\/png;base64,/, '');
      const qrBuffer = Buffer.from(base64Data, 'base64');

      // Add QR code to document
      doc.image(qrBuffer, 450, 200, { width: 80, height: 80 });
      doc.fontSize(8)
         .text('Scan to verify', 450, 290, { width: 80, align: 'center' });

    } catch (error) {
      console.error('QR Code generation failed:', error);
      // Add text fallback
      doc.fontSize(8)
         .text('QR Code: ' + documentId, 450, 200);
    }
  }

  private async addBarcode(doc: PDFDocument, documentId: string): Promise<void> {
    try {
      // Create canvas for barcode
      const canvas = createCanvas(200, 50);

      JsBarcode(canvas, documentId, {
        format: 'CODE128',
        width: 1,
        height: 40,
        displayValue: true,
        fontSize: 12,
        margin: 5
      });

      // Convert canvas to buffer
      const barcodeBuffer = canvas.toBuffer('image/png');

      // Add barcode to document
      doc.image(barcodeBuffer, 50, 700, { width: 150, height: 40 });

    } catch (error) {
      console.error('Barcode generation failed:', error);
      // Add text fallback
      doc.fontSize(8)
         .text('Barcode: ' + documentId, 50, 700);
    }
  }

  private addSecurityWatermark(doc: PDFDocument): void {
    // Add watermark
    doc.fillColor('#E0E0E0', 0.3)
       .fontSize(60)
       .rotate(-45, { origin: [300, 400] })
       .text('OFFICIAL DOCUMENT', 100, 400)
       .rotate(45, { origin: [300, 400] })
       .fillColor('#000000', 1);
  }
}

export const documentGenerator = DocumentGenerator.getInstance();
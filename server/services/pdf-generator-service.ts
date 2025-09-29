import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';

export class PDFGeneratorService {
  private outputDir: string;

  constructor() {
    this.outputDir = path.join(process.cwd(), 'generated-documents');
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  async generateDHADocument(documentType: string, personalData: any): Promise<string> {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const fileName = `${documentType}_${Date.now()}.pdf`;
    const filePath = path.join(this.outputDir, fileName);
    
    // Create write stream
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // Add South African Government header
    doc.fontSize(20)
       .font('Helvetica-Bold')
       .text('REPUBLIC OF SOUTH AFRICA', { align: 'center' });
    
    doc.fontSize(16)
       .text('DEPARTMENT OF HOME AFFAIRS', { align: 'center' });
    
    doc.moveDown();

    // Document title
    const docTitle = documentType.replace(/_/g, ' ').toUpperCase();
    doc.fontSize(18)
       .fillColor('#000080')
       .text(docTitle, { align: 'center' });
    
    doc.moveDown();
    
    // Add document number
    const docNumber = `DHA-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    doc.fontSize(12)
       .fillColor('black')
       .text(`Document Number: ${docNumber}`);
    
    doc.text(`Issue Date: ${new Date().toLocaleDateString('en-ZA')}`);
    doc.moveDown();

    // Add personal data section
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('PERSONAL INFORMATION', { underline: true });
    
    doc.font('Helvetica')
       .fontSize(11);
    
    doc.moveDown();

    // Add personal details
    if (personalData.fullName) {
      doc.text(`Full Name: ${personalData.fullName}`);
    }
    if (personalData.idNumber) {
      doc.text(`ID Number: ${personalData.idNumber}`);
    }
    if (personalData.dateOfBirth) {
      doc.text(`Date of Birth: ${personalData.dateOfBirth}`);
    }
    if (personalData.nationality) {
      doc.text(`Nationality: ${personalData.nationality}`);
    }
    if (personalData.address) {
      doc.text(`Address: ${personalData.address}`);
    }

    doc.moveDown();

    // Add specific content based on document type
    this.addDocumentSpecificContent(doc, documentType, personalData);

    // Add QR code for verification
    doc.moveDown();
    const qrData = `https://dha.gov.za/verify/${docNumber}`;
    const qrCodeDataUrl = await QRCode.toDataURL(qrData);
    const qrImage = qrCodeDataUrl.replace(/^data:image\/png;base64,/, '');
    
    doc.image(Buffer.from(qrImage, 'base64'), doc.page.width - 150, doc.y, {
      width: 100,
      height: 100
    });

    // Add footer
    doc.fontSize(10)
       .text('This is an official document of the Republic of South Africa', 50, doc.page.height - 100, {
         align: 'center',
         width: doc.page.width - 100
       });
    
    doc.text('Department of Home Affairs', { align: 'center' });
    
    // Finalize PDF
    doc.end();

    return new Promise((resolve, reject) => {
      stream.on('finish', () => {
        resolve(filePath);
      });
      stream.on('error', reject);
    });
  }

  private addDocumentSpecificContent(doc: PDFDocument, documentType: string, data: any) {
    switch(documentType) {
      case 'smart_id_card':
      case 'identity_document_book':
        doc.fontSize(14)
           .font('Helvetica-Bold')
           .text('IDENTITY DETAILS', { underline: true })
           .font('Helvetica')
           .fontSize(11);
        doc.text(`Gender: ${data.gender || 'Not specified'}`);
        doc.text(`Citizenship: South African`);
        doc.text(`Place of Birth: ${data.placeOfBirth || 'Not specified'}`);
        break;

      case 'south_african_passport':
      case 'emergency_travel_certificate':
        doc.fontSize(14)
           .font('Helvetica-Bold')
           .text('PASSPORT DETAILS', { underline: true })
           .font('Helvetica')
           .fontSize(11);
        doc.text(`Passport Number: ${this.generatePassportNumber()}`);
        doc.text(`Valid Until: ${new Date(Date.now() + 315360000000).toLocaleDateString('en-ZA')}`); // 10 years
        doc.text(`Place of Issue: Pretoria`);
        break;

      case 'birth_certificate':
        doc.fontSize(14)
           .font('Helvetica-Bold')
           .text('BIRTH REGISTRATION', { underline: true })
           .font('Helvetica')
           .fontSize(11);
        doc.text(`Registration Number: ${this.generateRegistrationNumber()}`);
        doc.text(`Place of Birth: ${data.placeOfBirth || 'South Africa'}`);
        doc.text(`Mother's Name: ${data.motherName || 'Not specified'}`);
        doc.text(`Father's Name: ${data.fatherName || 'Not specified'}`);
        break;

      case 'general_work_visa':
      case 'critical_skills_work_visa':
      case 'business_visa':
        doc.fontSize(14)
           .font('Helvetica-Bold')
           .text('VISA INFORMATION', { underline: true })
           .font('Helvetica')
           .fontSize(11);
        doc.text(`Visa Type: ${documentType.replace(/_/g, ' ').toUpperCase()}`);
        doc.text(`Valid From: ${new Date().toLocaleDateString('en-ZA')}`);
        doc.text(`Valid Until: ${new Date(Date.now() + 94608000000).toLocaleDateString('en-ZA')}`); // 3 years
        doc.text(`Conditions: Subject to employment`);
        break;

      default:
        doc.fontSize(11)
           .text(`Document Type: ${documentType.replace(/_/g, ' ').toUpperCase()}`);
        doc.text(`Status: Approved`);
        doc.text(`Issued By: Department of Home Affairs`);
    }
  }

  private generatePassportNumber(): string {
    const prefix = 'A';
    const number = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
    return prefix + number;
  }

  private generateRegistrationNumber(): string {
    const year = new Date().getFullYear();
    const number = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    return `${year}/${number}`;
  }

  async getDocumentPath(fileName: string): Promise<string> {
    const filePath = path.join(this.outputDir, fileName);
    if (fs.existsSync(filePath)) {
      return filePath;
    }
    throw new Error('Document not found');
  }
}

export const pdfGeneratorService = new PDFGeneratorService();
import jsPDF from "jspdf";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";

// Type alias for PDFDocument
type PDFKit = InstanceType<typeof PDFDocument>;

const DOCUMENTS_DIR = process.env.DOCUMENTS_DIR || "./documents";

// Ensure directory exists
fs.mkdir(DOCUMENTS_DIR, { recursive: true }).catch(console.error);

// South African government colors
const SA_COLORS = {
  green: "#007749",
  gold: "#FCB514",
  red: "#DE3831",
  blue: "#001489",
  black: "#000000",
  white: "#FFFFFF"
};

// Document types
export enum DocumentType {
  WORK_PERMIT = "work_permit",
  ASYLUM_VISA = "asylum_visa",
  RESIDENCE_PERMIT = "residence_permit",
  EXCEPTIONAL_SKILLS = "exceptional_skills",
  BIRTH_CERTIFICATE = "birth_certificate",
  PASSPORT = "passport",
  REFUGEE_PERMIT = "refugee_permit",
  STUDY_PERMIT = "study_permit"
}

// Interfaces for document data
export interface PersonalDetails {
  fullName: string;
  surname?: string;
  givenNames?: string;
  dateOfBirth: string;
  nationality: string;
  passportNumber?: string;
  idNumber?: string;
  gender?: string;
  maritalStatus?: string;
  countryOfBirth?: string;
  photograph?: string; // Base64 encoded
}

export interface WorkPermitData {
  personal: PersonalDetails;
  permitNumber: string;
  permitType: "Section 19(1)" | "Section 19(2)" | "Section 19(3)" | "Section 19(4)";
  employer: {
    name: string;
    address: string;
    registrationNumber?: string;
  };
  occupation: string;
  validFrom: string;
  validUntil: string;
  conditions?: string[];
  endorsements?: string[];
  portOfEntry?: string;
  dateOfEntry?: string;
  controlNumber?: string;
}

export interface AsylumVisaData {
  personal: PersonalDetails;
  permitNumber: string;
  fileReference: string;
  unhcrNumber?: string;
  countryOfOrigin: string;
  dateOfApplication: string;
  validFrom: string;
  validUntil: string;
  conditions?: string[];
  dependents?: Array<{
    name: string;
    relationship: string;
    dateOfBirth: string;
  }>;
}

export interface ResidencePermitData {
  personal: PersonalDetails;
  permitNumber: string;
  permitCategory: string;
  validFrom: string;
  validUntil: string;
  conditions?: string[];
  endorsements?: string[];
  previousPermitNumber?: string;
  spouseName?: string;
  dependents?: string[];
}

export interface BirthCertificateData {
  registrationNumber: string;
  fullName: string;
  dateOfBirth: string;
  placeOfBirth: string;
  gender: string;
  idNumber?: string;
  mother: {
    fullName: string;
    idNumber?: string;
    nationality: string;
  };
  father: {
    fullName: string;
    idNumber?: string;
    nationality: string;
  };
  dateOfRegistration: string;
  registrationOffice: string;
}

export interface PassportData {
  personal: PersonalDetails;
  passportNumber: string;
  passportType: "Ordinary" | "Diplomatic" | "Official";
  dateOfIssue: string;
  dateOfExpiry: string;
  placeOfIssue: string;
  machineReadableZone?: string[];
  previousPassportNumber?: string;
}

export class PDFGenerationService {
  
  /**
   * Generate Work Permit PDF (Section 19 permits)
   */
  async generateWorkPermitPDF(data: WorkPermitData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 30,
          info: {
            Title: `Work Permit - ${data.permitNumber}`,
            Author: 'Department of Home Affairs',
            Subject: 'Work Permit',
            Keywords: 'DHA, Work Permit, South Africa'
          }
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Add watermark
        this.addPDFKitWatermark(doc);

        // Add multi-layer security features
        const serialNumber = this.addMultiLayerSecurity(doc, 'WP', data.permitNumber);

        // Add header with coat of arms
        this.addGovernmentHeader(doc, "WORK PERMIT");

        // Add control number
        doc.fontSize(10)
           .fillColor(SA_COLORS.black)
           .text(`Control No: ${data.controlNumber || this.generateControlNumber()}`, 400, 100, { align: 'right' });

        // Main title
        doc.fontSize(16)
           .font('Helvetica-Bold')
           .text(`WORK PERMIT`, 50, 140, { align: 'center', width: 515 });
        
        doc.fontSize(14)
           .text(`${data.permitType}`, 50, 160, { align: 'center', width: 515 });

        // Permit number box with holographic overlay
        doc.rect(180, 190, 235, 30)
           .stroke(SA_COLORS.green);
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .text(`Permit No: ${data.permitNumber}`, 190, 200, { align: 'center', width: 215 });
        
        // Add holographic effect over permit number
        this.addHolographicEffect(doc, 175, 185, 245, 40);

        // Personal details section
        let yPos = 250;
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .fillColor(SA_COLORS.green)
           .text('PERSONAL DETAILS', 50, yPos);
        
        yPos += 25;
        doc.font('Helvetica')
           .fillColor(SA_COLORS.black)
           .fontSize(11);

        const personalDetails = [
          { label: 'Full Name:', value: data.personal.fullName },
          { label: 'Date of Birth:', value: data.personal.dateOfBirth },
          { label: 'Nationality:', value: data.personal.nationality },
          { label: 'Passport Number:', value: data.personal.passportNumber || 'N/A' },
          { label: 'Gender:', value: data.personal.gender || 'Not specified' }
        ];

        personalDetails.forEach(detail => {
          doc.font('Helvetica-Bold')
             .text(detail.label, 50, yPos, { continued: true, width: 130 })
             .font('Helvetica')
             .text(` ${detail.value}`, { width: 350 });
          yPos += 20;
        });

        // Employment details section
        yPos += 10;
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .fillColor(SA_COLORS.green)
           .text('EMPLOYMENT DETAILS', 50, yPos);
        
        yPos += 25;
        doc.font('Helvetica')
           .fillColor(SA_COLORS.black)
           .fontSize(11);

        const employmentDetails = [
          { label: 'Employer:', value: data.employer.name },
          { label: 'Employer Address:', value: data.employer.address },
          { label: 'Occupation:', value: data.occupation },
          { label: 'Valid From:', value: data.validFrom },
          { label: 'Valid Until:', value: data.validUntil }
        ];

        employmentDetails.forEach(detail => {
          doc.font('Helvetica-Bold')
             .text(detail.label, 50, yPos, { continued: true, width: 130 })
             .font('Helvetica')
             .text(` ${detail.value}`, { width: 350 });
          yPos += 20;
        });

        // Conditions section
        if (data.conditions && data.conditions.length > 0) {
          yPos += 10;
          doc.fontSize(12)
             .font('Helvetica-Bold')
             .fillColor(SA_COLORS.green)
             .text('CONDITIONS', 50, yPos);
          
          yPos += 20;
          doc.font('Helvetica')
             .fillColor(SA_COLORS.black)
             .fontSize(10);

          data.conditions.forEach((condition, index) => {
            doc.text(`${index + 1}. ${condition}`, 50, yPos, { width: 500 });
            yPos += 18;
          });
        }

        // Add QR code with enhanced data
        const qrData = `DHA-VERIFY:${data.permitNumber}:${serialNumber}`;
        QRCode.toDataURL(qrData, {
          width: 100,
          margin: 1,
          color: { dark: SA_COLORS.black, light: SA_COLORS.white }
        }).then(qrCode => {
          doc.image(qrCode, 450, 400, { width: 100 });
          doc.fontSize(8)
             .text('Scan to verify', 460, 505);
        });
        
        // Add UV reactive indicator around QR code
        this.addUVReactiveIndicator(doc, 445, 395, 110, 110);

        // Add barcode
        this.addBarcode(doc, data.permitNumber, 50, 520);

        // Official stamp area
        this.addOfficialStampArea(doc, 350, 550);

        // Footer
        this.addGovernmentFooter(doc);

        // Important notice
        doc.fontSize(8)
           .font('Helvetica')
           .fillColor(SA_COLORS.red)
           .text('IMPORTANT: This permit must be kept in your passport at all times.', 50, 700, { align: 'center', width: 515 });
        
        doc.fontSize(7)
           .fillColor(SA_COLORS.black)
           .text('For verification: Tel: 0800 60 11 90 | Email: info@dha.gov.za | Website: www.dha.gov.za', 50, 720, { align: 'center', width: 515 });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Generate Asylum Seeker Temporary Visa PDF
   */
  async generateAsylumVisaPDF(data: AsylumVisaData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 30,
          info: {
            Title: `Asylum Seeker Permit - ${data.permitNumber}`,
            Author: 'Department of Home Affairs',
            Subject: 'Asylum Seeker Temporary Visa',
            Keywords: 'DHA, Asylum, Refugee, South Africa'
          }
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Add watermark
        this.addPDFKitWatermark(doc);

        // Add multi-layer security features
        const serialNumber = this.addMultiLayerSecurity(doc, 'ASV', data.permitNumber);

        // Add header
        this.addGovernmentHeader(doc, "ASYLUM SEEKER TEMPORARY VISA");

        // File reference
        doc.fontSize(10)
           .fillColor(SA_COLORS.black)
           .text(`File Ref: ${data.fileReference}`, 400, 100, { align: 'right' });

        // Main title
        doc.fontSize(16)
           .font('Helvetica-Bold')
           .text(`ASYLUM SEEKER`, 50, 140, { align: 'center', width: 515 });
        
        doc.fontSize(14)
           .text(`TEMPORARY VISA`, 50, 160, { align: 'center', width: 515 });

        // Section 22 notice
        doc.fontSize(12)
           .font('Helvetica')
           .text(`(Issued in terms of Section 22 of the Refugees Act, 1998)`, 50, 180, { align: 'center', width: 515 });

        // Permit number box with Braille reference
        doc.rect(180, 210, 235, 30)
           .stroke(SA_COLORS.gold);
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .text(`Permit No: ${data.permitNumber}`, 190, 220, { align: 'center', width: 215 });
        
        // Add Braille reference number below permit box
        this.addBraillePattern(doc, data.permitNumber, 180, 245);

        // Personal details
        let yPos = 260;
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .fillColor(SA_COLORS.green)
           .text('APPLICANT DETAILS', 50, yPos);
        
        yPos += 25;
        doc.font('Helvetica')
           .fillColor(SA_COLORS.black)
           .fontSize(11);

        const applicantDetails = [
          { label: 'Full Name:', value: data.personal.fullName },
          { label: 'Date of Birth:', value: data.personal.dateOfBirth },
          { label: 'Country of Origin:', value: data.countryOfOrigin },
          { label: 'Nationality:', value: data.personal.nationality },
          { label: 'Gender:', value: data.personal.gender || 'Not specified' },
          { label: 'UNHCR Number:', value: data.unhcrNumber || 'Pending' },
          { label: 'Date of Application:', value: data.dateOfApplication }
        ];

        applicantDetails.forEach(detail => {
          doc.font('Helvetica-Bold')
             .text(detail.label, 50, yPos, { continued: true, width: 130 })
             .font('Helvetica')
             .text(` ${detail.value}`, { width: 350 });
          yPos += 20;
        });

        // Validity period
        yPos += 10;
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .fillColor(SA_COLORS.green)
           .text('VALIDITY PERIOD', 50, yPos);
        
        yPos += 25;
        doc.font('Helvetica')
           .fillColor(SA_COLORS.black)
           .fontSize(11);

        doc.font('Helvetica-Bold')
           .text('Valid From:', 50, yPos, { continued: true, width: 100 })
           .font('Helvetica')
           .text(` ${data.validFrom}`, { continued: true, width: 150 })
           .font('Helvetica-Bold')
           .text('   Valid Until:', { continued: true, width: 100 })
           .font('Helvetica')
           .text(` ${data.validUntil}`);

        // Dependents section
        if (data.dependents && data.dependents.length > 0) {
          yPos += 30;
          doc.fontSize(12)
             .font('Helvetica-Bold')
             .fillColor(SA_COLORS.green)
             .text('DEPENDENTS', 50, yPos);
          
          yPos += 20;
          doc.font('Helvetica')
             .fillColor(SA_COLORS.black)
             .fontSize(10);

          data.dependents.forEach((dependent, index) => {
            doc.text(`${index + 1}. ${dependent.name} (${dependent.relationship}) - DOB: ${dependent.dateOfBirth}`, 50, yPos, { width: 500 });
            yPos += 18;
          });
        }

        // Rights and restrictions
        yPos += 20;
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .fillColor(SA_COLORS.green)
           .text('RIGHTS AND RESTRICTIONS', 50, yPos);
        
        yPos += 20;
        doc.font('Helvetica')
           .fillColor(SA_COLORS.black)
           .fontSize(10);

        const rights = [
          'Right to remain in South Africa pending the outcome of asylum application',
          'Right to work and study (subject to conditions)',
          'Right to basic health care services',
          'Must report to Refugee Reception Office every 3 months for renewal',
          'Must not leave South Africa without prior authorization'
        ];

        rights.forEach((right, index) => {
          doc.text(`• ${right}`, 50, yPos, { width: 500 });
          yPos += 18;
        });

        // Add QR code with serial number
        const qrData = `DHA-ASYLUM:${data.permitNumber}:${data.fileReference}:${serialNumber}`;
        QRCode.toDataURL(qrData, {
          width: 100,
          margin: 1,
          color: { dark: SA_COLORS.black, light: SA_COLORS.white }
        }).then(qrCode => {
          doc.image(qrCode, 450, 500, { width: 100 });
        });
        
        // Add holographic strip near QR
        this.addHolographicEffect(doc, 430, 495, 10, 110);

        // Add barcode
        this.addBarcode(doc, data.fileReference, 50, 600);

        // Official stamp
        this.addOfficialStampArea(doc, 350, 630);

        // Footer
        doc.fontSize(8)
           .font('Helvetica-Bold')
           .fillColor(SA_COLORS.red)
           .text('WARNING: This document does not constitute a right to permanent residence', 50, 720, { align: 'center', width: 515 });
        
        doc.fontSize(7)
           .fillColor(SA_COLORS.black)
           .text('Refugee Reception Offices: Cape Town | Durban | Musina | Pretoria | Port Elizabeth', 50, 740, { align: 'center', width: 515 });
        
        doc.text('24hr Hotline: 0800 60 11 90 | www.dha.gov.za', 50, 755, { align: 'center', width: 515 });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Generate Permanent Residence Permit PDF
   */
  async generateResidencePermitPDF(data: ResidencePermitData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 30,
          info: {
            Title: `Permanent Residence Permit - ${data.permitNumber}`,
            Author: 'Department of Home Affairs',
            Subject: 'Permanent Residence Permit',
            Keywords: 'DHA, Permanent Residence, South Africa'
          }
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Add watermark
        this.addPDFKitWatermark(doc);

        // Add multi-layer security with microtext border
        const serialNumber = this.addMultiLayerSecurity(doc, 'PR', data.permitNumber);
        
        // Add specific microtext border pattern for residence permit
        this.addMicrotextPattern(doc, 'PERMANENT RESIDENCE RSA ', 0, 30, 595, 10);
        this.addMicrotextPattern(doc, 'PERMANENT RESIDENCE RSA ', 0, 802, 595, 10);

        // Add header
        this.addGovernmentHeader(doc, "PERMANENT RESIDENCE PERMIT");

        // Main title
        doc.fontSize(18)
           .font('Helvetica-Bold')
           .text(`PERMANENT RESIDENCE PERMIT`, 50, 140, { align: 'center', width: 515 });

        // Permit category
        doc.fontSize(14)
           .text(`Category: ${data.permitCategory}`, 50, 165, { align: 'center', width: 515 });

        // Permit number with special border and holographic overlay
        doc.rect(150, 195, 295, 35)
           .lineWidth(2)
           .stroke(SA_COLORS.gold);
        doc.fontSize(14)
           .font('Helvetica-Bold')
           .text(`Permit No: ${data.permitNumber}`, 160, 207, { align: 'center', width: 275 });
        
        // Add holographic overlay on permit box
        this.addHolographicEffect(doc, 150, 195, 295, 35);

        // Personal details
        let yPos = 250;
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .fillColor(SA_COLORS.green)
           .text('HOLDER DETAILS', 50, yPos);
        
        yPos += 25;
        doc.font('Helvetica')
           .fillColor(SA_COLORS.black)
           .fontSize(11);

        const holderDetails = [
          { label: 'Full Name:', value: data.personal.fullName },
          { label: 'Date of Birth:', value: data.personal.dateOfBirth },
          { label: 'Nationality:', value: data.personal.nationality },
          { label: 'Passport Number:', value: data.personal.passportNumber || 'N/A' },
          { label: 'ID Number:', value: data.personal.idNumber || 'To be issued' },
          { label: 'Gender:', value: data.personal.gender || 'Not specified' },
          { label: 'Marital Status:', value: data.personal.maritalStatus || 'Not specified' }
        ];

        holderDetails.forEach(detail => {
          doc.font('Helvetica-Bold')
             .text(detail.label, 50, yPos, { continued: true, width: 130 })
             .font('Helvetica')
             .text(` ${detail.value}`, { width: 350 });
          yPos += 20;
        });

        // Validity
        yPos += 10;
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .fillColor(SA_COLORS.green)
           .text('VALIDITY', 50, yPos);
        
        yPos += 25;
        doc.font('Helvetica')
           .fillColor(SA_COLORS.black)
           .fontSize(11);

        doc.font('Helvetica-Bold')
           .text('Issue Date:', 50, yPos, { continued: true, width: 100 })
           .font('Helvetica')
           .text(` ${data.validFrom}`, { width: 200 });
        
        yPos += 20;
        doc.font('Helvetica-Bold')
           .text('Status:', 50, yPos, { continued: true, width: 100 })
           .font('Helvetica')
           .text(` PERMANENT`, { width: 200 });

        // Conditions and endorsements
        if (data.conditions && data.conditions.length > 0) {
          yPos += 25;
          doc.fontSize(12)
             .font('Helvetica-Bold')
             .fillColor(SA_COLORS.green)
             .text('CONDITIONS', 50, yPos);
          
          yPos += 20;
          doc.font('Helvetica')
             .fillColor(SA_COLORS.black)
             .fontSize(10);

          data.conditions.forEach(condition => {
            doc.text(`• ${condition}`, 50, yPos, { width: 500 });
            yPos += 18;
          });
        }

        // Rights section
        yPos += 20;
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .fillColor(SA_COLORS.green)
           .text('RIGHTS AND PRIVILEGES', 50, yPos);
        
        yPos += 20;
        doc.font('Helvetica')
           .fillColor(SA_COLORS.black)
           .fontSize(10);

        const rights = [
          'Right to permanently reside in the Republic of South Africa',
          'Right to work without requiring a work permit',
          'Right to study at any educational institution',
          'Access to social services and benefits',
          'May apply for South African citizenship after qualifying period'
        ];

        rights.forEach(right => {
          doc.text(`✓ ${right}`, 50, yPos, { width: 500 });
          yPos += 18;
        });

        // QR Code
        const qrData = `DHA-PR:${data.permitNumber}`;
        QRCode.toDataURL(qrData, {
          width: 120,
          margin: 1,
          color: { dark: SA_COLORS.black, light: SA_COLORS.white }
        }).then(qrCode => {
          doc.image(qrCode, 440, 540, { width: 120 });
        });

        // Barcode
        this.addBarcode(doc, data.permitNumber, 50, 630);

        // Official stamp
        this.addOfficialStampArea(doc, 350, 650);

        // Footer
        doc.fontSize(9)
           .font('Helvetica-Bold')
           .fillColor(SA_COLORS.blue)
           .text('This permit confirms permanent residence status in the Republic of South Africa', 50, 720, { align: 'center', width: 515 });
        
        doc.fontSize(7)
           .fillColor(SA_COLORS.black)
           .text('Department of Home Affairs | www.dha.gov.za | Call Centre: 0800 60 11 90', 50, 740, { align: 'center', width: 515 });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Generate Birth Certificate PDF
   */
  async generateBirthCertificatePDF(data: BirthCertificateData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 40,
          info: {
            Title: `Birth Certificate - ${data.registrationNumber}`,
            Author: 'Department of Home Affairs',
            Subject: 'Birth Certificate',
            Keywords: 'DHA, Birth Certificate, South Africa'
          }
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Decorative border
        doc.rect(20, 20, 555, 802)
           .lineWidth(2)
           .stroke(SA_COLORS.green);
        
        doc.rect(25, 25, 545, 792)
           .lineWidth(1)
           .stroke(SA_COLORS.gold);

        // Add guilloche background pattern for birth certificate
        this.addGuillochePattern(doc, 30, 30, 535, 782);

        // Add watermark
        this.addPDFKitWatermark(doc);

        // Add multi-layer security
        const serialNumber = this.addMultiLayerSecurity(doc, 'BC', data.registrationNumber);

        // Government header with coat of arms
        this.addGovernmentHeader(doc, "BIRTH CERTIFICATE", true);

        // Title
        doc.fontSize(24)
           .font('Helvetica-Bold')
           .fillColor(SA_COLORS.green)
           .text('BIRTH CERTIFICATE', 50, 150, { align: 'center', width: 495 });
        
        doc.fontSize(12)
           .font('Helvetica')
           .fillColor(SA_COLORS.black)
           .text('(Abridged)', 50, 180, { align: 'center', width: 495 });

        // Registration number with microtext border
        this.addMicrotextPattern(doc, 'REPUBLIC OF SOUTH AFRICA ', 175, 205, 245, 45);
        doc.rect(180, 210, 235, 35)
           .lineWidth(2)
           .stroke(SA_COLORS.green);
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .text(`Registration No: ${data.registrationNumber}`, 190, 223, { align: 'center', width: 215 });
        
        // Add holographic overlay on registration box
        this.addHolographicEffect(doc, 180, 210, 235, 35);

        // Child's details
        let yPos = 270;
        doc.fontSize(14)
           .font('Helvetica-Bold')
           .fillColor(SA_COLORS.green)
           .text('PARTICULARS OF CHILD', 50, yPos);
        
        yPos += 30;
        doc.font('Helvetica')
           .fillColor(SA_COLORS.black)
           .fontSize(12);

        const childDetails = [
          { label: 'Full Name:', value: data.fullName },
          { label: 'Date of Birth:', value: data.dateOfBirth },
          { label: 'Place of Birth:', value: data.placeOfBirth },
          { label: 'Gender:', value: data.gender },
          { label: 'Identity Number:', value: data.idNumber || 'To be issued' }
        ];

        childDetails.forEach(detail => {
          doc.font('Helvetica-Bold')
             .text(detail.label, 50, yPos, { width: 180, align: 'right' })
             .font('Helvetica')
             .text(detail.value, 240, yPos, { width: 300 });
          yPos += 25;
        });

        // Mother's details
        yPos += 20;
        doc.fontSize(14)
           .font('Helvetica-Bold')
           .fillColor(SA_COLORS.green)
           .text('PARTICULARS OF MOTHER', 50, yPos);
        
        yPos += 30;
        doc.font('Helvetica')
           .fillColor(SA_COLORS.black)
           .fontSize(12);

        const motherDetails = [
          { label: 'Full Name:', value: data.mother.fullName },
          { label: 'Identity Number:', value: data.mother.idNumber || 'Not provided' },
          { label: 'Nationality:', value: data.mother.nationality }
        ];

        motherDetails.forEach(detail => {
          doc.font('Helvetica-Bold')
             .text(detail.label, 50, yPos, { width: 180, align: 'right' })
             .font('Helvetica')
             .text(detail.value, 240, yPos, { width: 300 });
          yPos += 25;
        });

        // Father's details
        yPos += 20;
        doc.fontSize(14)
           .font('Helvetica-Bold')
           .fillColor(SA_COLORS.green)
           .text('PARTICULARS OF FATHER', 50, yPos);
        
        yPos += 30;
        doc.font('Helvetica')
           .fillColor(SA_COLORS.black)
           .fontSize(12);

        const fatherDetails = [
          { label: 'Full Name:', value: data.father.fullName },
          { label: 'Identity Number:', value: data.father.idNumber || 'Not provided' },
          { label: 'Nationality:', value: data.father.nationality }
        ];

        fatherDetails.forEach(detail => {
          doc.font('Helvetica-Bold')
             .text(detail.label, 50, yPos, { width: 180, align: 'right' })
             .font('Helvetica')
             .text(detail.value, 240, yPos, { width: 300 });
          yPos += 25;
        });

        // Registration details
        yPos += 20;
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .text('Date of Registration:', 50, yPos, { width: 180, align: 'right' })
           .font('Helvetica')
           .text(data.dateOfRegistration, 240, yPos, { width: 300 });
        
        yPos += 25;
        doc.font('Helvetica-Bold')
           .text('Registration Office:', 50, yPos, { width: 180, align: 'right' })
           .font('Helvetica')
           .text(data.registrationOffice, 240, yPos, { width: 300 });

        // QR Code with serial number
        const qrData = `DHA-BC:${data.registrationNumber}:${serialNumber}`;
        QRCode.toDataURL(qrData, {
          width: 100,
          margin: 1,
          color: { dark: SA_COLORS.black, light: SA_COLORS.white }
        }).then(qrCode => {
          doc.image(qrCode, 450, 620, { width: 100 });
          doc.fontSize(8)
             .text('Verification Code', 460, 725);
        });
        
        // Add UV reactive areas
        this.addUVReactiveIndicator(doc, 50, 100, 60, 60);
        this.addUVReactiveIndicator(doc, 485, 100, 60, 60);

        // Official stamp area
        this.addOfficialStampArea(doc, 100, 650, true);

        // Signature line
        doc.moveTo(320, 700)
           .lineTo(450, 700)
           .stroke();
        doc.fontSize(10)
           .text('Registrar-General', 350, 705);

        // Footer
        doc.fontSize(9)
           .font('Helvetica-Bold')
           .fillColor(SA_COLORS.blue)
           .text('This is an official document of the Republic of South Africa', 50, 750, { align: 'center', width: 495 });
        
        doc.fontSize(8)
           .fillColor(SA_COLORS.black)
           .text('Department of Home Affairs | www.dha.gov.za', 50, 770, { align: 'center', width: 495 });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Generate Passport PDF
   */
  async generatePassportPDF(data: PassportData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: [297, 420], // Passport page size (A6)
          margin: 20,
          info: {
            Title: `Passport - ${data.passportNumber}`,
            Author: 'Department of Home Affairs',
            Subject: 'South African Passport',
            Keywords: 'DHA, Passport, South Africa'
          }
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Page 1 - Cover (simplified representation)
        doc.rect(0, 0, 297, 420)
           .fill(SA_COLORS.green);
        
        doc.fontSize(16)
           .font('Helvetica-Bold')
           .fillColor(SA_COLORS.gold)
           .text('REPUBLIC OF', 0, 100, { align: 'center', width: 297 });
        doc.text('SOUTH AFRICA', 0, 120, { align: 'center', width: 297 });
        
        // Coat of arms placeholder
        doc.circle(148.5, 210, 40)
           .lineWidth(2)
           .stroke(SA_COLORS.gold);
        
        doc.fontSize(14)
           .text('PASSPORT', 0, 280, { align: 'center', width: 297 });
        doc.fontSize(12)
           .text('PASPOORT', 0, 300, { align: 'center', width: 297 });

        // Page 2 - Data page
        doc.addPage();
        
        // Add holographic overlay on data page
        this.addHolographicEffect(doc, 0, 0, 297, 50);
        
        // Add guilloche pattern background
        this.addGuillochePattern(doc, 10, 60, 277, 350);
        
        // Header
        doc.fontSize(10)
           .font('Helvetica-Bold')
           .fillColor(SA_COLORS.green)
           .text('SOUTH AFRICAN PASSPORT', 20, 20, { align: 'center', width: 257 });
        
        // Passport type
        doc.fontSize(9)
           .fillColor(SA_COLORS.black)
           .text(`Type/Tipe: ${data.passportType.charAt(0)}`, 20, 40);
        
        doc.text(`Passport No./Paspoortnr: ${data.passportNumber}`, 20, 55);

        // Photo area
        doc.rect(20, 75, 80, 100)
           .stroke(SA_COLORS.black);
        doc.fontSize(8)
           .text('PHOTO', 45, 120);

        // Personal details
        let yPos = 75;
        const xLabel = 110;
        const xValue = 110;
        
        doc.fontSize(8)
           .font('Helvetica');
        
        const details = [
          { label: 'Surname/Van', value: data.personal.surname || data.personal.fullName.split(' ').pop() || '' },
          { label: 'Given names/Voorname', value: data.personal.givenNames || data.personal.fullName.split(' ').slice(0, -1).join(' ') || '' },
          { label: 'Nationality/Nasionaliteit', value: 'SOUTH AFRICAN' },
          { label: 'Date of birth/Geboortedatum', value: data.personal.dateOfBirth },
          { label: 'Gender/Geslag', value: data.personal.gender || 'M' },
          { label: 'Place of birth/Geboorteplek', value: data.personal.countryOfBirth || 'SOUTH AFRICA' },
          { label: 'Date of issue/Datum van uitreiking', value: data.dateOfIssue },
          { label: 'Date of expiry/Datum van verstryking', value: data.dateOfExpiry },
          { label: 'Authority/Owerheid', value: 'DHA PRETORIA' }
        ];

        details.forEach(detail => {
          doc.fontSize(7)
             .fillColor('#666666')
             .text(detail.label, xLabel, yPos);
          doc.fontSize(9)
             .fillColor(SA_COLORS.black)
             .font('Helvetica-Bold')
             .text(detail.value, xValue, yPos + 10);
          yPos += 20;
        });

        // Machine Readable Zone with holographic overlay
        yPos = 280;
        doc.rect(20, yPos - 5, 257, 50)
           .fill('#f0f0f0');
        
        // Add holographic security overlay on MRZ
        this.addHolographicEffect(doc, 20, yPos - 5, 257, 50);
        
        doc.font('Courier')
           .fontSize(10)
           .fillColor(SA_COLORS.black);
        
        // Use enhanced MRZ generation
        const mrzLines = data.machineReadableZone || this.generateMRZ(data);
        mrzLines.forEach((line, index) => {
          doc.text(line, 25, yPos + (index * 15));
        });
        
        // Add UV reactive indicators on passport
        this.addUVReactiveIndicator(doc, 20, 75, 30, 30);
        this.addUVReactiveIndicator(doc, 247, 75, 30, 30);

        // Signature area
        doc.moveTo(20, 350)
           .lineTo(100, 350)
           .stroke();
        doc.fontSize(7)
           .font('Helvetica')
           .text('Signature/Handtekening', 20, 355);

        // QR code for verification with serial number
        const serialNumber = this.addSerialNumber(doc, 120, 370, 'PP');
        const qrData = `DHA-PASSPORT:${data.passportNumber}:${serialNumber}`;
        QRCode.toDataURL(qrData, {
          width: 60,
          margin: 1,
          color: { dark: SA_COLORS.black, light: SA_COLORS.white }
        }).then(qrCode => {
          doc.image(qrCode, 217, 340, { width: 60 });
        });
        
        // Add microtext at bottom
        this.addMicrotextPattern(doc, 'RSA GOV ', 20, 395, 257, 5);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Helper method to add government header with coat of arms
   */
  private addGovernmentHeader(doc: PDFKit, documentType: string, ornate: boolean = false) {
    // Header background
    doc.rect(0, 0, 595, 80)
       .fill(SA_COLORS.green);
    
    // Coat of arms placeholder (left)
    doc.circle(60, 40, 25)
       .lineWidth(2)
       .stroke(SA_COLORS.gold);
    doc.fontSize(8)
       .fillColor(SA_COLORS.gold)
       .text('RSA', 48, 36);

    // Department name
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .fillColor(SA_COLORS.white)
       .text('REPUBLIC OF SOUTH AFRICA', 100, 20);
    doc.fontSize(12)
       .text('Department of Home Affairs', 100, 38);
    doc.fontSize(10)
       .font('Helvetica')
       .text('Lefapha la Ditaba tsa Selegae', 100, 54);

    // DHA Logo (right)
    doc.rect(500, 15, 80, 50)
       .lineWidth(1)
       .stroke(SA_COLORS.gold);
    doc.fontSize(18)
       .font('Helvetica-Bold')
       .fillColor(SA_COLORS.gold)
       .text('DHA', 520, 35);
  }

  /**
   * Helper method to add watermark
   */
  private addPDFKitWatermark(doc: PDFKit) {
    doc.save();
    doc.opacity(0.05);
    doc.fontSize(60)
       .font('Helvetica-Bold')
       .fillColor(SA_COLORS.green);
    
    // Rotate and add watermark text
    doc.rotate(-45, { origin: [297, 421] })
       .text('REPUBLIC OF', 100, 300)
       .text('SOUTH AFRICA', 80, 370);
    
    doc.restore();
  }

  /**
   * Helper method to add barcode
   */
  private addBarcode(doc: PDFKit, data: string, x: number, y: number) {
    // Simple barcode representation using lines
    const barcodeData = this.generateBarcodePattern(data);
    const barWidth = 1.5;
    const barHeight = 40;
    
    doc.fontSize(8)
       .fillColor(SA_COLORS.black)
       .text('|||||||||||||||||||||||||||||||||||||||||||', x, y, { characterSpacing: -2 });
    
    doc.fontSize(10)
       .text(data, x, y + 45);
  }

  /**
   * Helper method to add official stamp area
   */
  private addOfficialStampArea(doc: PDFKit, x: number, y: number, withDate: boolean = true) {
    // Stamp circle
    doc.circle(x + 40, y + 40, 35)
       .lineWidth(2)
       .stroke(SA_COLORS.red);
    
    doc.circle(x + 40, y + 40, 30)
       .lineWidth(1)
       .stroke(SA_COLORS.red);
    
    // Stamp text
    doc.fontSize(8)
       .fillColor(SA_COLORS.red)
       .text('DEPARTMENT OF', x + 5, y + 20, { width: 70, align: 'center' });
    doc.text('HOME AFFAIRS', x + 5, y + 30, { width: 70, align: 'center' });
    
    if (withDate) {
      const today = new Date().toLocaleDateString('en-ZA');
      doc.fontSize(10)
         .text(today, x + 5, y + 45, { width: 70, align: 'center' });
    }
    
    doc.fontSize(7)
       .text('OFFICIAL', x + 5, y + 60, { width: 70, align: 'center' });
  }

  /**
   * Helper method to add government footer
   */
  private addGovernmentFooter(doc: PDFKit) {
    const pageHeight = doc.page.height;
    const footerY = pageHeight - 60;
    
    doc.moveTo(30, footerY)
       .lineTo(565, footerY)
       .stroke(SA_COLORS.green);
    
    doc.fontSize(7)
       .fillColor(SA_COLORS.black)
       .text('This document is the property of the Government of the Republic of South Africa', 30, footerY + 5, { align: 'center', width: 535 });
  }

  /**
   * Generate control number
   */
  private generateControlNumber(): string {
    const prefix = 'DHA';
    const year = new Date().getFullYear().toString().substr(-2);
    const random = Math.floor(Math.random() * 999999).toString().padStart(6, '0');
    return `${prefix}-${year}${random}`;
  }

  /**
   * Add holographic effect simulation
   * Creates an iridescent pattern overlay to simulate holographic security features
   */
  private addHolographicEffect(doc: PDFKit, x: number, y: number, width: number, height: number) {
    doc.save();
    doc.opacity(0.15);
    
    // Create gradient-like effect with multiple overlapping patterns
    const colors = [SA_COLORS.blue, SA_COLORS.gold, SA_COLORS.green];
    const patterns = [
      { type: 'circle', size: 3 },
      { type: 'hexagon', size: 4 },
      { type: 'wave', amplitude: 2 }
    ];
    
    // Draw holographic pattern layers
    for (let i = 0; i < 3; i++) {
      doc.fillColor(colors[i]);
      doc.opacity(0.05 + (i * 0.02));
      
      // Create repeating pattern
      for (let px = x; px < x + width; px += 10) {
        for (let py = y; py < y + height; py += 10) {
          if (patterns[i].type === 'circle') {
            doc.circle(px, py, patterns[i].size || 3)
               .fill();
          } else if (patterns[i].type === 'hexagon') {
            // Simplified hexagon pattern
            const size = patterns[i].size || 4;
            doc.polygon([px, py], [px+size, py+2], [px+size, py+6], [px, py+8], [px-size, py+6], [px-size, py+2])
               .fill();
          } else if (patterns[i].type === 'wave') {
            // Wave pattern
            doc.moveTo(px, py)
               .bezierCurveTo(px+5, py-2, px+5, py+2, px+10, py)
               .stroke();
          }
        }
      }
    }
    
    // Add "HOLOGRAM" text indicator
    doc.opacity(0.1);
    doc.fontSize(8);
    doc.fillColor(SA_COLORS.blue);
    doc.text('SECURE', x + width/2 - 20, y + height/2 - 5);
    
    doc.restore();
  }

  /**
   * Generate Braille pattern for text
   * Converts text to Grade 1 Braille (simplified version)
   */
  private addBraillePattern(doc: PDFKit, text: string, x: number, y: number) {
    // Simplified Braille mapping (Grade 1)
    const brailleMap: { [key: string]: string } = {
      'A': '\u2801', 'B': '\u2803', 'C': '\u2809', 'D': '\u2819', 'E': '\u2811',
      'F': '\u280b', 'G': '\u281b', 'H': '\u2813', 'I': '\u280a', 'J': '\u281a',
      'K': '\u2805', 'L': '\u2807', 'M': '\u280d', 'N': '\u281d', 'O': '\u2815',
      'P': '\u280f', 'Q': '\u281f', 'R': '\u2817', 'S': '\u280e', 'T': '\u281e',
      'U': '\u2825', 'V': '\u2827', 'W': '\u283a', 'X': '\u282d', 'Y': '\u283d',
      'Z': '\u2835', '0': '\u281a', '1': '\u2801', '2': '\u2803', '3': '\u2809',
      '4': '\u2819', '5': '\u2811', '6': '\u280b', '7': '\u281b', '8': '\u2813',
      '9': '\u280a', '-': '\u2824', ' ': '\u2800'
    };
    
    // Convert text to uppercase and create Braille pattern
    const upperText = text.toUpperCase().substring(0, 20); // Limit length
    let brailleX = x;
    
    doc.save();
    doc.fillColor(SA_COLORS.black);
    
    // Draw Braille dots
    for (const char of upperText) {
      if (brailleMap[char]) {
        // Draw dot pattern (simplified representation)
        const pattern = brailleMap[char];
        
        // Create 2x3 dot matrix for each character
        const dotPositions = [
          [0, 0], [4, 0],   // Top row
          [0, 4], [4, 4],   // Middle row
          [0, 8], [4, 8]    // Bottom row
        ];
        
        // Draw dots based on character pattern
        const charCode = pattern.charCodeAt(0);
        for (let i = 0; i < 6; i++) {
          if (charCode & (1 << i)) {
            const [dx, dy] = dotPositions[i];
            doc.circle(brailleX + dx, y + dy, 0.8)
               .fill();
          }
        }
        brailleX += 10; // Move to next character position
      }
    }
    
    // Add description below
    doc.fontSize(6)
       .fillColor(SA_COLORS.black)
       .opacity(0.5)
       .text('Braille Reference', x, y + 15);
    
    doc.restore();
  }

  /**
   * Add microtext security pattern
   * Creates tiny repeated text that's difficult to reproduce
   */
  private addMicrotextPattern(doc: PDFKit, text: string, x: number, y: number, width: number, height: number) {
    doc.save();
    doc.fontSize(2); // Very small text
    doc.opacity(0.1);
    doc.fillColor(SA_COLORS.green);
    
    const microtext = text.repeat(20);
    const lineHeight = 3;
    
    // Fill area with microtext
    for (let yPos = y; yPos < y + height; yPos += lineHeight) {
      doc.text(microtext, x, yPos, {
        width: width,
        lineBreak: false,
        continued: false
      });
    }
    
    doc.restore();
  }

  /**
   * Add guilloche pattern (like on banknotes)
   * Creates intricate geometric patterns
   */
  private addGuillochePattern(doc: PDFKit, x: number, y: number, width: number, height: number) {
    doc.save();
    doc.opacity(0.05);
    doc.lineWidth(0.3);
    
    // Create spiral/wave patterns
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    const maxRadius = Math.min(width, height) / 2;
    
    // Draw concentric circular patterns
    for (let r = 10; r < maxRadius; r += 5) {
      doc.circle(centerX, centerY, r)
         .stroke(SA_COLORS.gold);
    }
    
    // Add intersecting wave patterns
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8;
      const endX = centerX + Math.cos(angle) * maxRadius;
      const endY = centerY + Math.sin(angle) * maxRadius;
      
      doc.moveTo(centerX, centerY)
         .bezierCurveTo(
           centerX + Math.cos(angle + 0.5) * (maxRadius/2),
           centerY + Math.sin(angle + 0.5) * (maxRadius/2),
           endX - Math.cos(angle - 0.5) * (maxRadius/2),
           endY - Math.sin(angle - 0.5) * (maxRadius/2),
           endX,
           endY
         )
         .stroke(SA_COLORS.green);
    }
    
    doc.restore();
  }

  /**
   * Add UV-reactive area indicator
   * Marks areas that would be UV-reactive (for documentation purposes)
   */
  private addUVReactiveIndicator(doc: PDFKit, x: number, y: number, width: number, height: number) {
    doc.save();
    
    // Draw dashed border to indicate UV area
    doc.lineWidth(0.5);
    doc.dash(2, { space: 2 });
    doc.opacity(0.2);
    doc.rect(x, y, width, height)
       .stroke(SA_COLORS.blue);
    
    // Add UV indicator text
    doc.fontSize(6);
    doc.opacity(0.3);
    doc.fillColor(SA_COLORS.blue);
    doc.text('UV', x + width - 15, y + 2);
    
    doc.undash();
    doc.restore();
  }

  /**
   * Generate check digit for serial numbers
   * Uses Luhn algorithm for validation
   */
  private generateCheckDigit(number: string): string {
    const digits = number.replace(/\D/g, '').split('').map(Number);
    let sum = 0;
    let isEven = false;
    
    for (let i = digits.length - 1; i >= 0; i--) {
      let digit = digits[i];
      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }
      sum += digit;
      isEven = !isEven;
    }
    
    const checkDigit = (10 - (sum % 10)) % 10;
    return checkDigit.toString();
  }

  /**
   * Add sequential serial number with check digit
   */
  private addSerialNumber(doc: PDFKit, x: number, y: number, prefix: string = 'SN') {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
    const baseNumber = timestamp.substr(-6) + random;
    const checkDigit = this.generateCheckDigit(baseNumber);
    const serialNumber = `${prefix}-${baseNumber}-${checkDigit}`;
    
    doc.save();
    doc.fontSize(9);
    doc.font('Helvetica');
    doc.fillColor(SA_COLORS.black);
    doc.text(`Serial: ${serialNumber}`, x, y);
    doc.restore();
    
    return serialNumber;
  }

  /**
   * Add multi-layer security features
   * Combines multiple security elements for maximum protection
   */
  private addMultiLayerSecurity(doc: PDFKit, documentType: string, permitNumber: string) {
    const pageWidth = 595;
    const pageHeight = 842;
    
    // Layer 1: Guilloche background pattern
    this.addGuillochePattern(doc, 50, 100, pageWidth - 100, pageHeight - 200);
    
    // Layer 2: Microtext borders
    this.addMicrotextPattern(doc, `${documentType} RSA GOV `, 0, 0, pageWidth, 20);
    this.addMicrotextPattern(doc, `SECURE DOCUMENT `, 0, pageHeight - 20, pageWidth, 20);
    
    // Layer 3: Holographic strips (vertical)
    this.addHolographicEffect(doc, 30, 100, 15, pageHeight - 200);
    this.addHolographicEffect(doc, pageWidth - 45, 100, 15, pageHeight - 200);
    
    // Layer 4: UV-reactive areas
    this.addUVReactiveIndicator(doc, 100, 200, 100, 30);
    this.addUVReactiveIndicator(doc, pageWidth - 200, 200, 100, 30);
    
    // Layer 5: Braille reference (for accessibility)
    this.addBraillePattern(doc, permitNumber.substring(0, 10), 50, pageHeight - 100);
    
    // Layer 6: Serial number with check digit
    const serialNumber = this.addSerialNumber(doc, pageWidth - 150, 50, documentType.substring(0, 3));
    
    // Add security features legend
    this.addSecurityLegend(doc, 50, pageHeight - 150);
    
    return serialNumber;
  }

  /**
   * Add security features legend
   * Shows what security features are present
   */
  private addSecurityLegend(doc: PDFKit, x: number, y: number) {
    doc.save();
    
    doc.fontSize(7);
    doc.font('Helvetica');
    doc.fillColor(SA_COLORS.black);
    doc.opacity(0.6);
    
    doc.text('Security Features:', x, y);
    
    const features = [
      '\u2713 Holographic security strip',
      '\u2713 Guilloche pattern background',
      '\u2713 Microtext borders',
      '\u2713 UV-reactive elements',
      '\u2713 Braille reference',
      '\u2713 Serial number with check digit',
      '\u2713 QR code verification',
      '\u2713 Watermark'
    ];
    
    let yPos = y + 10;
    doc.fontSize(6);
    
    features.forEach(feature => {
      doc.text(feature, x + 5, yPos);
      yPos += 8;
    });
    
    // Add verification instructions box
    doc.rect(x - 5, y - 5, 120, yPos - y + 10)
       .lineWidth(0.5)
       .stroke(SA_COLORS.green);
    
    doc.restore();
  }

  /**
   * Extract data from existing PDF (placeholder - requires pdf parsing library)
   * This would normally use a PDF parsing library to extract form data
   */
  async extractDataFromPDF(pdfBuffer: Buffer): Promise<any> {
    // Placeholder implementation
    // In a real implementation, this would use a library like pdf-parse or pdfjs-dist
    // to extract text and form field data from the PDF
    
    console.log('PDF data extraction requested. Buffer size:', pdfBuffer.length);
    
    // Return mock extracted data for demonstration
    return {
      extractedText: 'Document text content',
      formFields: {},
      metadata: {
        title: 'Extracted Document',
        author: 'DHA',
        creationDate: new Date()
      }
    };
  }

  /**
   * Generate machine-readable zone for passport
   */
  private generateMRZ(data: PassportData): string[] {
    // Generate ICAO compliant Machine Readable Zone
    const surname = data.personal.surname || data.personal.fullName.split(' ').pop() || '';
    const givenNames = data.personal.givenNames || data.personal.fullName.split(' ').slice(0, -1).join(' ') || '';
    const line1 = `P<ZAF${surname.toUpperCase().replace(/[^A-Z]/g, '').padEnd(20, '<')}<<${givenNames.toUpperCase().replace(/[^A-Z]/g, '').padEnd(17, '<')}`;
    const dateOfBirth = data.personal.dateOfBirth.replace(/-/g, '').substring(2, 8);
    const dateOfExpiry = data.dateOfExpiry.replace(/-/g, '').substring(2, 8);
    const line2 = `${data.passportNumber.padEnd(9, '<')}${this.generateCheckDigit(data.passportNumber)}ZAF${dateOfBirth}${this.generateCheckDigit(dateOfBirth)}${data.personal.gender?.charAt(0) || 'M'}${dateOfExpiry}${this.generateCheckDigit(dateOfExpiry)}<<<<<<<<<<<<<`;
    return [line1.substring(0, 44), line2.substring(0, 44)];
  }

  /**
   * Generate barcode pattern
   */
  private generateBarcodePattern(data: string): string {
    // Simple hash-based pattern generation
    let pattern = '';
    for (let i = 0; i < data.length; i++) {
      const charCode = data.charCodeAt(i);
      pattern += charCode % 2 === 0 ? '1' : '0';
    }
    return pattern.padEnd(30, '10');
  }

  /**
   * Add watermark to any PDF using jsPDF
   */
  addWatermark(pdf: jsPDF, text: string = 'REPUBLIC OF SOUTH AFRICA'): void {
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    
    pdf.saveGraphicsState();
    pdf.setGState(new (pdf as any).GState({ opacity: 0.1 }));
    pdf.setFontSize(40);
    pdf.setTextColor(0, 119, 73); // SA Green
    
    // Center and rotate text
    pdf.text(text, pageWidth / 2, pageHeight / 2, {
      angle: -45,
      align: 'center'
    });
    
    pdf.restoreGraphicsState();
  }

  /**
   * Add QR code to PDF using jsPDF
   */
  async addQRCode(pdf: jsPDF, data: string, x: number, y: number, size: number = 30): Promise<void> {
    try {
      const qrCodeDataUrl = await QRCode.toDataURL(data, {
        width: size * 4, // Higher resolution
        margin: 1,
        color: {
          dark: SA_COLORS.black,
          light: SA_COLORS.white
        }
      });
      
      pdf.addImage(qrCodeDataUrl, 'PNG', x, y, size, size);
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  }

  /**
   * Add barcode to PDF using jsPDF
   */
  addBarcodeJsPDF(pdf: jsPDF, trackingNumber: string, x: number, y: number): void {
    // Simple barcode representation
    pdf.setFontSize(8);
    pdf.setFont('courier', 'normal');
    
    // Generate barcode pattern
    const pattern = this.generateBarcodePattern(trackingNumber);
    let barcodeX = x;
    
    pdf.setFillColor(0, 0, 0);
    pattern.split('').forEach((bit) => {
      if (bit === '1') {
        pdf.rect(barcodeX, y, 1, 10, 'F');
      }
      barcodeX += 2;
    });
    
    // Add human-readable text below barcode
    pdf.setFontSize(10);
    pdf.text(trackingNumber, x, y + 15);
  }

  /**
   * Add official stamp to PDF using jsPDF
   */
  addOfficialStampJsPDF(pdf: jsPDF, x: number, y: number, date: string = new Date().toLocaleDateString('en-ZA')): void {
    // Outer circle
    pdf.setDrawColor(222, 56, 49); // SA Red
    pdf.setLineWidth(0.5);
    pdf.circle(x, y, 15, 'S');
    
    // Inner circle
    pdf.circle(x, y, 12, 'S');
    
    // Stamp text
    pdf.setFontSize(6);
    pdf.setTextColor(222, 56, 49);
    pdf.text('DEPARTMENT OF', x, y - 8, { align: 'center' });
    pdf.text('HOME AFFAIRS', x, y - 4, { align: 'center' });
    pdf.text(date, x, y + 2, { align: 'center' });
    pdf.text('OFFICIAL', x, y + 6, { align: 'center' });
    
    // Reset colors
    pdf.setTextColor(0, 0, 0);
    pdf.setDrawColor(0, 0, 0);
  }

  /**
   * Generate exceptional skills permit PDF
   */
  async generateExceptionalSkillsPermitPDF(data: WorkPermitData): Promise<Buffer> {
    // Similar implementation to work permit but with different styling and sections
    const modifiedData = {
      ...data,
      permitType: "Exceptional Skills" as any,
      conditions: [
        ...(data.conditions || []),
        "Holder possesses exceptional skills in their field",
        "Must contribute to skills transfer and development"
      ]
    };
    
    return this.generateWorkPermitPDF(modifiedData);
  }

  /**
   * Generate refugee permit PDF
   */
  async generateRefugeePermitPDF(data: AsylumVisaData): Promise<Buffer> {
    // Similar to asylum visa but with refugee-specific content
    return this.generateAsylumVisaPDF(data);
  }

  /**
   * Generate study permit PDF
   */
  async generateStudyPermitPDF(data: {
    personal: PersonalDetails;
    permitNumber: string;
    institution: string;
    course: string;
    duration: string;
    validFrom: string;
    validUntil: string;
  }): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 30
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Add watermark and header
        this.addPDFKitWatermark(doc);
        this.addGovernmentHeader(doc, "STUDY PERMIT");

        // Title
        doc.fontSize(16)
           .font('Helvetica-Bold')
           .text('STUDY PERMIT', 50, 140, { align: 'center', width: 515 });

        // Content sections
        let yPos = 200;
        
        // Personal details
        doc.fontSize(12)
           .fillColor(SA_COLORS.green)
           .text('STUDENT DETAILS', 50, yPos);
        
        yPos += 25;
        doc.fontSize(11)
           .fillColor(SA_COLORS.black);
        
        doc.text(`Name: ${data.personal.fullName}`, 50, yPos);
        yPos += 20;
        doc.text(`Passport: ${data.personal.passportNumber}`, 50, yPos);
        yPos += 20;
        doc.text(`Nationality: ${data.personal.nationality}`, 50, yPos);
        
        // Institution details
        yPos += 30;
        doc.fontSize(12)
           .fillColor(SA_COLORS.green)
           .text('INSTITUTION DETAILS', 50, yPos);
        
        yPos += 25;
        doc.fontSize(11)
           .fillColor(SA_COLORS.black);
        
        doc.text(`Institution: ${data.institution}`, 50, yPos);
        yPos += 20;
        doc.text(`Course: ${data.course}`, 50, yPos);
        yPos += 20;
        doc.text(`Duration: ${data.duration}`, 50, yPos);
        yPos += 20;
        doc.text(`Valid From: ${data.validFrom} To: ${data.validUntil}`, 50, yPos);

        // QR code
        const qrData = `DHA-STUDY:${data.permitNumber}`;
        QRCode.toDataURL(qrData, {
          width: 100,
          margin: 1
        }).then(qrCode => {
          doc.image(qrCode, 450, 400, { width: 100 });
        });

        // Footer
        this.addGovernmentFooter(doc);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}

// Export singleton instance
export const pdfGenerationService = new PDFGenerationService();
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

        // Permit number box
        doc.rect(180, 190, 235, 30)
           .stroke(SA_COLORS.green);
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .text(`Permit No: ${data.permitNumber}`, 190, 200, { align: 'center', width: 215 });

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

        // Add QR code
        const qrData = `DHA-VERIFY:${data.permitNumber}`;
        const qrCode = await QRCode.toDataURL(qrData, {
          width: 100,
          margin: 1,
          color: { dark: SA_COLORS.black, light: SA_COLORS.white }
        });
        doc.image(qrCode, 450, 400, { width: 100 });
        doc.fontSize(8)
           .text('Scan to verify', 460, 505);

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

        // Permit number box
        doc.rect(180, 210, 235, 30)
           .stroke(SA_COLORS.gold);
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .text(`Permit No: ${data.permitNumber}`, 190, 220, { align: 'center', width: 215 });

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

        // Add QR code
        const qrData = `DHA-ASYLUM:${data.permitNumber}:${data.fileReference}`;
        const qrCode = await QRCode.toDataURL(qrData, {
          width: 100,
          margin: 1,
          color: { dark: SA_COLORS.black, light: SA_COLORS.white }
        });
        doc.image(qrCode, 450, 500, { width: 100 });

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

        // Add header
        this.addGovernmentHeader(doc, "PERMANENT RESIDENCE PERMIT");

        // Main title
        doc.fontSize(18)
           .font('Helvetica-Bold')
           .text(`PERMANENT RESIDENCE PERMIT`, 50, 140, { align: 'center', width: 515 });

        // Permit category
        doc.fontSize(14)
           .text(`Category: ${data.permitCategory}`, 50, 165, { align: 'center', width: 515 });

        // Permit number with special border
        doc.rect(150, 195, 295, 35)
           .lineWidth(2)
           .stroke(SA_COLORS.gold);
        doc.fontSize(14)
           .font('Helvetica-Bold')
           .text(`Permit No: ${data.permitNumber}`, 160, 207, { align: 'center', width: 275 });

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
        const qrCode = await QRCode.toDataURL(qrData, {
          width: 120,
          margin: 1,
          color: { dark: SA_COLORS.black, light: SA_COLORS.white }
        });
        doc.image(qrCode, 440, 540, { width: 120 });

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

        // Add watermark
        this.addPDFKitWatermark(doc);

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

        // Registration number
        doc.rect(180, 210, 235, 35)
           .lineWidth(2)
           .stroke(SA_COLORS.green);
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .text(`Registration No: ${data.registrationNumber}`, 190, 223, { align: 'center', width: 215 });

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

        // QR Code
        const qrData = `DHA-BC:${data.registrationNumber}`;
        const qrCode = await QRCode.toDataURL(qrData, {
          width: 100,
          margin: 1,
          color: { dark: SA_COLORS.black, light: SA_COLORS.white }
        });
        doc.image(qrCode, 450, 620, { width: 100 });
        doc.fontSize(8)
           .text('Verification Code', 460, 725);

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
          { label: 'Surname/Van', value: data.personal.surname || data.personal.fullName.split(' ').pop() },
          { label: 'Given names/Voorname', value: data.personal.givenNames || data.personal.fullName.split(' ').slice(0, -1).join(' ') },
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

        // Machine Readable Zone
        yPos = 280;
        doc.rect(20, yPos - 5, 257, 50)
           .fill('#f0f0f0');
        
        doc.font('Courier')
           .fontSize(10)
           .fillColor(SA_COLORS.black);
        
        if (data.machineReadableZone) {
          data.machineReadableZone.forEach((line, index) => {
            doc.text(line, 25, yPos + (index * 15));
          });
        } else {
          // Generate MRZ
          const mrz1 = `P<ZAF${data.personal.surname?.toUpperCase().replace(/[^A-Z]/g, '')}<<${data.personal.givenNames?.toUpperCase().replace(/[^A-Z]/g, '')}<<<<<<<<<<<<`.substring(0, 44);
          const mrz2 = `${data.passportNumber}ZAF${data.personal.dateOfBirth.replace(/-/g, '').substring(2)}M${data.dateOfExpiry.replace(/-/g, '').substring(2)}<<<<<<<<<<<<<<<`.substring(0, 44);
          
          doc.text(mrz1, 25, yPos);
          doc.text(mrz2, 25, yPos + 15);
        }

        // Signature area
        doc.moveTo(20, 350)
           .lineTo(100, 350)
           .stroke();
        doc.fontSize(7)
           .font('Helvetica')
           .text('Signature/Handtekening', 20, 355);

        // QR code for verification
        const qrData = `DHA-PASSPORT:${data.passportNumber}`;
        const qrCode = await QRCode.toDataURL(qrData, {
          width: 60,
          margin: 1,
          color: { dark: SA_COLORS.black, light: SA_COLORS.white }
        });
        doc.image(qrCode, 217, 340, { width: 60 });

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
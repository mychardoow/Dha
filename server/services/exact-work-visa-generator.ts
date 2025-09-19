/**
 * Exact Work Visa Generator - Matches the uploaded design specifications
 */
import PDFDocument from "pdfkit";
import * as crypto from "crypto";
import * as fs from "fs/promises";
import * as path from "path";
import QRCode from "qrcode";
import JsBarcode from "jsbarcode";
import { Canvas } from "canvas";

// Type alias for PDFDocument
type PDFKit = InstanceType<typeof PDFDocument>;

const DOCUMENTS_DIR = process.env.DOCUMENTS_DIR || "./documents";

// Exact colors from the uploaded design
const VISA_COLORS = {
  green: "#007749",     // Main green color
  lightGreen: "#E8F5F0", // Light green/teal background
  gold: "#FCB514",       // Gold elements
  black: "#000000",
  gray: "#808080",
  darkGray: "#333333",
  hologramSilver: "#C0C0C0",
  watermark: "#F0F8F5"   // Very light green for watermarks
};

export interface ExactWorkVisaData {
  // Header Information
  controlNumber: string;
  dhaNumber: string;
  
  // Title Information  
  visaType: string;
  trcNumber: string;
  refNumber: string;
  
  // Main Content Fields
  name: string;
  passportNo: string;
  numberOfEntries: string;
  visaExpiryDate: string;
  issuedAt: string;
  issuedOn: string;
  conditions: string[];
  
  // Footer Information
  documentReference: string;
  signatory: string;
}

export class ExactWorkVisaGenerator {
  
  /**
   * Generate the exact work visa PDF matching the uploaded design
   */
  async generateExactWorkVisa(data: ExactWorkVisaData): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      try {
        // Create PDF document with exact dimensions
        const doc = new PDFDocument({
          size: 'A4',
          margin: 0,
          bufferPages: true
        });
        
        const chunks: Buffer[] = [];
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);
        
        // Add background with security pattern
        this.addSecurityBackground(doc);
        
        // Add header section
        await this.addHeaderSection(doc, data);
        
        // Add title section
        this.addTitleSection(doc, data);
        
        // Add main content
        this.addMainContent(doc, data);
        
        // Add security features
        this.addSecurityFeatures(doc);
        
        // Add footer with barcode and signature
        await this.addFooterSection(doc, data);
        
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
  
  /**
   * Add security background with patterns
   */
  private addSecurityBackground(doc: PDFKit) {
    const pageWidth = 595.28;
    const pageHeight = 841.89;
    
    // Light green/teal background
    doc.save();
    doc.rect(0, 0, pageWidth, pageHeight)
       .fill(VISA_COLORS.lightGreen);
    
    // Add holographic circular patterns
    const patternSpacing = 120;
    for (let x = -50; x < pageWidth + 100; x += patternSpacing) {
      for (let y = -50; y < pageHeight + 100; y += patternSpacing) {
        // Create gradient circles for holographic effect
        doc.save();
        doc.opacity(0.1);
        
        // Outer circle
        doc.circle(x, y, 60)
           .strokeColor(VISA_COLORS.green)
           .lineWidth(0.5)
           .stroke();
           
        // Middle circle with gradient effect
        doc.circle(x, y, 40)
           .strokeColor(VISA_COLORS.gold)
           .lineWidth(0.3)
           .stroke();
           
        // Inner circle
        doc.circle(x, y, 20)
           .strokeColor(VISA_COLORS.hologramSilver)
           .lineWidth(0.2)
           .stroke();
           
        doc.restore();
      }
    }
    
    // Add guilloche pattern (intricate lines)
    doc.save();
    doc.opacity(0.08);
    for (let y = 0; y < pageHeight; y += 2) {
      const wave = Math.sin(y * 0.02) * 20;
      doc.moveTo(0, y)
         .lineTo(pageWidth + wave, y)
         .strokeColor(VISA_COLORS.green)
         .lineWidth(0.1)
         .stroke();
    }
    doc.restore();
    
    // Add watermark text pattern
    doc.save();
    doc.opacity(0.05);
    doc.fontSize(8)
       .fillColor(VISA_COLORS.green);
    
    const watermarkText = "REPUBLIC OF SOUTH AFRICA • DHA • ";
    for (let y = 50; y < pageHeight; y += 30) {
      for (let x = 0; x < pageWidth; x += 200) {
        doc.text(watermarkText, x, y, { continued: false });
      }
    }
    doc.restore();
    
    doc.restore();
  }
  
  /**
   * Add header section with coat of arms and text
   */
  private async addHeaderSection(doc: PDFKit, data: ExactWorkVisaData) {
    const pageWidth = 595.28;
    
    // Draw header background bar
    doc.save();
    doc.rect(0, 0, pageWidth, 100)
       .fill(VISA_COLORS.watermark);
    doc.restore();
    
    // SA Coat of Arms placeholder (left side)
    doc.save();
    doc.rect(30, 20, 60, 60)
       .strokeColor(VISA_COLORS.green)
       .lineWidth(1)
       .stroke();
    doc.fontSize(8)
       .fillColor(VISA_COLORS.green)
       .text('COAT OF\nARMS', 40, 45, { width: 40, align: 'center' });
    doc.restore();
    
    // "home affairs" text with subtitle
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .fillColor(VISA_COLORS.darkGray)
       .text('home affairs', 110, 30);
    
    doc.fontSize(9)
       .font('Helvetica')
       .fillColor(VISA_COLORS.gray)
       .text('Department: Home Affairs', 110, 48);
    
    // "REPUBLIC OF SOUTH AFRICA" text
    doc.fontSize(11)
       .font('Helvetica-Bold')
       .fillColor(VISA_COLORS.green)
       .text('REPUBLIC OF SOUTH AFRICA', 110, 65);
    
    // Control Number (top right)
    doc.fontSize(10)
       .font('Helvetica-Bold')
       .fillColor(VISA_COLORS.black)
       .text(`Control No: ${data.controlNumber}`, 400, 30);
    
    // DHA Number (far right)
    doc.fontSize(9)
       .font('Helvetica')
       .fillColor(VISA_COLORS.gray)
       .text(data.dhaNumber, 500, 30);
  }
  
  /**
   * Add title section
   */
  private addTitleSection(doc: PDFKit, data: ExactWorkVisaData) {
    const pageWidth = 595.28;
    let yPos = 120;
    
    // Main title in green
    doc.fontSize(18)
       .font('Helvetica-Bold')
       .fillColor(VISA_COLORS.green)
       .text(data.visaType, 0, yPos, { width: pageWidth, align: 'center' });
    
    yPos += 25;
    
    // TRC Number subtitle
    doc.fontSize(12)
       .font('Helvetica')
       .fillColor(VISA_COLORS.darkGray)
       .text(data.trcNumber, 0, yPos, { width: pageWidth, align: 'center' });
    
    yPos += 20;
    
    // Reference Number
    doc.fontSize(10)
       .font('Helvetica')
       .fillColor(VISA_COLORS.gray)
       .text(`Ref No: ${data.refNumber}`, 0, yPos, { width: pageWidth, align: 'center' });
  }
  
  /**
   * Add main content fields
   */
  private addMainContent(doc: PDFKit, data: ExactWorkVisaData) {
    const leftMargin = 80;
    const fieldWidth = 435;
    let yPos = 200;
    
    // Create a bordered content area
    doc.save();
    doc.roundedRect(60, yPos - 10, 475, 320, 3)
       .strokeColor(VISA_COLORS.green)
       .lineWidth(1)
       .stroke();
    doc.restore();
    
    yPos += 20;
    
    // Helper function to add field
    const addField = (label: string, value: string, y: number): number => {
      doc.fontSize(11)
         .font('Helvetica-Bold')
         .fillColor(VISA_COLORS.darkGray)
         .text(`${label}:`, leftMargin, y, { width: 150, continued: false });
      
      doc.fontSize(11)
         .font('Helvetica')
         .fillColor(VISA_COLORS.black)
         .text(value, leftMargin + 160, y);
      
      return y + 30;
    };
    
    // Add all fields
    yPos = addField('Name', data.name, yPos);
    yPos = addField('Passport No', data.passportNo, yPos);
    yPos = addField('No. of Entries', data.numberOfEntries, yPos);
    yPos = addField('VISA Expiry Date', data.visaExpiryDate, yPos);
    yPos = addField('Issued at', data.issuedAt, yPos);
    yPos = addField('ON', data.issuedOn, yPos);
    
    yPos += 10;
    
    // Conditions section
    doc.fontSize(11)
       .font('Helvetica-Bold')
       .fillColor(VISA_COLORS.darkGray)
       .text('Conditions:', leftMargin, yPos);
    
    yPos += 20;
    
    data.conditions.forEach((condition, index) => {
      doc.fontSize(10)
         .font('Helvetica')
         .fillColor(VISA_COLORS.black)
         .text(`(${index + 1}) ${condition}`, leftMargin + 20, yPos, { width: 400 });
      yPos += 20;
    });
  }
  
  /**
   * Add security features
   */
  private addSecurityFeatures(doc: PDFKit) {
    const pageWidth = 595.28;
    const pageHeight = 841.89;
    
    // Add microtext borders
    doc.save();
    doc.opacity(0.2);
    doc.fontSize(3)
       .fillColor(VISA_COLORS.green);
    
    const microtext = "DHAAUTHENTIC";
    let microtextString = "";
    for (let i = 0; i < 100; i++) {
      microtextString += microtext;
    }
    
    // Top border
    doc.text(microtextString, 0, 5, { width: pageWidth, height: 5 });
    
    // Bottom border  
    doc.text(microtextString, 0, pageHeight - 10, { width: pageWidth, height: 5 });
    
    doc.restore();
    
    // Add rainbow/holographic effect overlay
    doc.save();
    doc.opacity(0.03);
    
    const colors = [VISA_COLORS.green, VISA_COLORS.gold, VISA_COLORS.hologramSilver];
    for (let i = 0; i < 10; i++) {
      const y = 200 + (i * 30);
      doc.rect(100, y, 400, 20)
         .fill(colors[i % colors.length]);
    }
    
    doc.restore();
  }
  
  /**
   * Add footer section with barcode and signature
   */
  private async addFooterSection(doc: PDFKit, data: ExactWorkVisaData) {
    const pageWidth = 595.28;
    const pageHeight = 841.89;
    let yPos = 600;
    
    // Document reference (bottom right)
    doc.fontSize(9)
       .font('Helvetica')
       .fillColor(VISA_COLORS.gray)
       .text(data.documentReference, 450, yPos);
    
    yPos = 650;
    
    // Director-General signature line
    doc.fontSize(10)
       .font('Helvetica')
       .fillColor(VISA_COLORS.darkGray)
       .text(data.signatory, 80, yPos);
    
    // Signature line
    doc.moveTo(80, yPos + 15)
       .lineTo(250, yPos + 15)
       .strokeColor(VISA_COLORS.gray)
       .lineWidth(0.5)
       .stroke();
    
    // Generate and add barcode
    yPos = 700;
    try {
      const barcodeData = `DHA${data.controlNumber}${data.documentReference}`;
      const canvas = new Canvas(300, 60);
      JsBarcode(canvas, barcodeData, {
        format: "CODE128",
        width: 2,
        height: 50,
        displayValue: false,
        margin: 0
      });
      
      const barcodeBuffer = canvas.toBuffer();
      doc.image(barcodeBuffer, (pageWidth - 300) / 2, yPos, { width: 300, height: 60 });
    } catch (error) {
      // Fallback if barcode generation fails
      doc.rect((pageWidth - 300) / 2, yPos, 300, 60)
         .strokeColor(VISA_COLORS.black)
         .lineWidth(0.5)
         .stroke();
      doc.fontSize(8)
         .fillColor(VISA_COLORS.black)
         .text('||||| |||| | |||| ||||| |||| |||||', (pageWidth - 200) / 2, yPos + 25);
    }
    
    // Add security serial numbers at bottom
    doc.fontSize(7)
       .font('Helvetica')
       .fillColor(VISA_COLORS.gray)
       .text(`SN: ${crypto.randomBytes(8).toString('hex').toUpperCase()}`, 50, pageHeight - 30);
    
    doc.text(`VAL: ${crypto.randomBytes(6).toString('hex').toUpperCase()}`, pageWidth - 100, pageHeight - 30);
  }
}

// Export singleton instance
export const exactWorkVisaGenerator = new ExactWorkVisaGenerator();
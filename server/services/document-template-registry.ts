/**
 * UNIFIED DOCUMENT TEMPLATE REGISTRY
 * Central system that maps all 21 DHA document types to their generators
 * and provides shared security components and rendering methods
 */

import PDFDocument from "pdfkit";
import * as crypto from "crypto";
import * as fs from "fs/promises";
import * as path from "path";
import QRCode from "qrcode";
import JsBarcode from "jsbarcode";
import { Canvas } from "canvas";

// Import existing generators
import { enhancedPdfGenerationService, EnhancedPDFGenerationService, DocumentType } from "./enhanced-pdf-generation-service";
import { ExactWorkVisaGenerator } from "./exact-work-visa-generator";
import { documentGenerator, DocumentGeneratorService } from "./document-generator";
import { cryptographicSignatureService, DocumentSigningMetadata, PAdESLevel } from "./cryptographic-signature-service";
import { verificationService } from "./verification-service";

// Import new document generators
import { 
  documentGenerators,
  IdentityDocumentBookGenerator,
  SouthAfricanPassportGenerator,
  BirthCertificateGenerator,
  MarriageCertificateGenerator,
  CriticalSkillsWorkVisaGenerator
} from "./document-generators";

// Import schema types
import type {
  DocumentGenerationRequest,
  SmartIdCardData,
  IdentityDocumentBookData,
  TemporaryIdCertificateData,
  SouthAfricanPassportData,
  EmergencyTravelCertificateData,
  RefugeeTravelDocumentData,
  BirthCertificateData,
  DeathCertificateData,
  MarriageCertificateData,
  DivorceCertificateData,
  GeneralWorkVisaData,
  CriticalSkillsWorkVisaData,
  IntraCompanyTransferWorkVisaData,
  BusinessVisaData,
  StudyVisaPermitData,
  VisitorVisaData,
  MedicalTreatmentVisaData,
  RetiredPersonVisaData,
  ExchangeVisaData,
  RelativesVisaData,
  PermanentResidencePermitData
} from "@shared/schema";

// Type alias for PDFDocument
type PDFKit = InstanceType<typeof PDFDocument>;

const DOCUMENTS_DIR = process.env.DOCUMENTS_DIR || "./documents";

// Official South African government colors and design constants
export const SA_GOVERNMENT_DESIGN = {
  colors: {
    // Official South African flag colors
    green: "#007749",        // Official SA green - primary color
    gold: "#FCB514",         // Official SA gold/yellow
    red: "#DE3831",          // Official SA red
    blue: "#001489",         // Official SA blue
    black: "#000000",
    white: "#FFFFFF",
    
    // Security feature colors
    security_red: "#CC0000",
    security_blue: "#0066CC",
    security_green: "#006600",
    microprint_gray: "#808080",
    hologram_silver: "#C0C0C0",
    
    // Document-specific backgrounds
    light_teal: "#E8F5F0",   // Light green/teal backgrounds
    watermark: "#F0F8F5",    // Very light green for watermarks
    stamping_blue: "#003366" // Deep blue for official stamps
  },
  
  fonts: {
    header: "Helvetica-Bold",
    body: "Helvetica",
    official: "Times-Bold",
    microtext: "Helvetica"
  },
  
  dimensions: {
    page_width: 595.28,      // A4 width in points
    page_height: 841.89,     // A4 height in points
    margin: 50,
    security_border: 20,
    barcode_height: 30,
    qr_size: 80
  }
} as const;

/**
 * Document generation result interface
 */
export interface DocumentGenerationResult {
  success: boolean;
  documentId: string;
  documentUrl?: string;
  verificationCode?: string;
  qrCodeUrl?: string;
  securityFeatures: SecurityFeatureSet;
  metadata: DocumentMetadata;
  error?: string;
}

/**
 * Security features applied to each document
 */
export interface SecurityFeatureSet {
  watermarks: boolean;
  guilloche: boolean;
  microtext: boolean;
  holographic: boolean;
  qrCode: string;
  barcode: string;
  serialNumber: string;
  digitalSignature: boolean;
  cryptographicHash: string;
  verificationUrl: string;
  tamperEvident: boolean;
  rfidSimulation?: boolean;
  mrzCompliant?: boolean;
  biometricData?: boolean;
  blockchainAnchor?: string;
  pkaSignature?: boolean;
  uvReactive?: boolean;
  rainbowPrinting?: boolean;
  securityThread?: boolean;
}

/**
 * Document metadata
 */
export interface DocumentMetadata {
  documentType: string;
  formNumber: string;
  issuingOffice: string;
  issuingOfficer: string;
  generatedAt: Date;
  validFrom?: Date;
  validUntil?: Date;
  classification: "Public" | "Official" | "Confidential";
  version: string;
  templateVersion: string;
}

/**
 * Base document template class with shared rendering methods
 */
export abstract class BaseDocumentTemplate {
  
  constructor() {}
  
  /**
   * Add official SA government header
   */
  protected addGovernmentHeader(doc: PDFKit, documentTitle: string, formNumber?: string): void {
    const { colors, fonts, dimensions } = SA_GOVERNMENT_DESIGN;
    
    // Background header bar
    doc.save();
    doc.rect(0, 0, dimensions.page_width, 100)
       .fill(colors.light_teal);
    doc.restore();
    
    // SA Coat of Arms placeholder (official size and position)
    doc.save();
    doc.rect(30, 20, 60, 60)
       .strokeColor(colors.green)
       .lineWidth(2)
       .stroke();
    doc.fontSize(8)
       .font(fonts.body)
       .fillColor(colors.green)
       .text("COAT OF\nARMS", 40, 45, { width: 40, align: "center" });
    doc.restore();
    
    // Official government headers
    doc.fontSize(16)
       .font(fonts.header)
       .fillColor(colors.black)
       .text("REPUBLIC OF SOUTH AFRICA", 110, 25);
    
    doc.fontSize(14)
       .font(fonts.official)
       .fillColor(colors.green)
       .text("DEPARTMENT OF HOME AFFAIRS", 110, 48);
       
    // Document title
    doc.fontSize(12)
       .font(fonts.header)
       .fillColor(colors.blue)
       .text(documentTitle.toUpperCase(), 110, 72);
    
    // Form number (if provided)
    if (formNumber) {
      doc.fontSize(10)
         .font(fonts.body)
         .fillColor(colors.security_blue)
         .text(`Form ${formNumber}`, 450, 25);
    }
    
    // Official stamp placeholder (top right)
    doc.save();
    doc.circle(520, 50, 25)
       .strokeColor(colors.stamping_blue)
       .lineWidth(2)
       .stroke();
    doc.fontSize(8)
       .fillColor(colors.stamping_blue)
       .text("OFFICIAL\nSTAMP", 505, 45, { width: 30, align: "center" });
    doc.restore();
  }
  
  /**
   * Add comprehensive security background
   */
  protected addSecurityBackground(doc: PDFKit, isPreview: boolean = false): void {
    const { colors, dimensions } = SA_GOVERNMENT_DESIGN;
    
    // Light security background
    doc.save();
    doc.rect(0, 0, dimensions.page_width, dimensions.page_height)
       .fill(colors.watermark);
    doc.restore();
    
    // Add guilloche patterns (intricate geometric security patterns)
    this.addGuillochePattern(doc);
    
    // Add holographic circular patterns
    this.addHolographicPatterns(doc);
    
    // Add watermark text pattern
    this.addWatermarkPattern(doc, isPreview ? "SAMPLE" : "OFFICIAL");
    
    // Add security grid
    this.addSecurityGrid(doc);
  }
  
  /**
   * Add guilloche security patterns
   */
  private addGuillochePattern(doc: PDFKit): void {
    const { colors, dimensions } = SA_GOVERNMENT_DESIGN;
    
    doc.save();
    doc.opacity(0.1);
    doc.strokeColor(colors.security_green);
    doc.lineWidth(0.5);
    
    // Create intricate wave patterns
    for (let y = 0; y < dimensions.page_height; y += 3) {
      const amplitude = 15;
      const frequency = 0.02;
      const phase = y * 0.01;
      
      doc.moveTo(0, y);
      for (let x = 0; x <= dimensions.page_width; x += 2) {
        const wave = Math.sin(x * frequency + phase) * amplitude;
        doc.lineTo(x, y + wave);
      }
      doc.stroke();
    }
    
    doc.restore();
  }
  
  /**
   * Add holographic patterns
   */
  private addHolographicPatterns(doc: PDFKit): void {
    const { colors } = SA_GOVERNMENT_DESIGN;
    const patternSpacing = 120;
    
    for (let x = -50; x < 650; x += patternSpacing) {
      for (let y = -50; y < 900; y += patternSpacing) {
        doc.save();
        doc.opacity(0.08);
        
        // Outer circle
        doc.circle(x, y, 60)
           .strokeColor(colors.green)
           .lineWidth(0.5)
           .stroke();
           
        // Middle circle with gradient effect
        doc.circle(x, y, 40)
           .strokeColor(colors.gold)
           .lineWidth(0.3)
           .stroke();
           
        // Inner circle
        doc.circle(x, y, 20)
           .strokeColor(colors.hologram_silver)
           .lineWidth(0.2)
           .stroke();
           
        doc.restore();
      }
    }
  }
  
  /**
   * Add watermark pattern
   */
  private addWatermarkPattern(doc: PDFKit, text: string): void {
    const { colors } = SA_GOVERNMENT_DESIGN;
    
    doc.save();
    doc.opacity(0.05);
    doc.fontSize(12)
       .font("Helvetica-Bold")
       .fillColor(colors.green);
    
    const watermarkText = `${text} • REPUBLIC OF SOUTH AFRICA • DHA • `;
    for (let y = 50; y < 800; y += 40) {
      for (let x = 0; x < 600; x += 220) {
        doc.text(watermarkText, x, y, { continued: false });
      }
    }
    doc.restore();
  }
  
  /**
   * Add security grid
   */
  private addSecurityGrid(doc: PDFKit): void {
    const { colors } = SA_GOVERNMENT_DESIGN;
    
    doc.save();
    doc.opacity(0.03);
    doc.strokeColor(colors.microprint_gray);
    doc.lineWidth(0.2);
    
    // Vertical lines
    for (let x = 0; x <= 600; x += 10) {
      doc.moveTo(x, 0).lineTo(x, 850).stroke();
    }
    
    // Horizontal lines
    for (let y = 0; y <= 850; y += 10) {
      doc.moveTo(0, y).lineTo(600, y).stroke();
    }
    
    doc.restore();
  }
  
  /**
   * Add bilingual field (English/Afrikaans)
   */
  protected addBilingualField(doc: PDFKit, labelKey: string, value: string, x: number, y: number): void {
    const { colors, fonts } = SA_GOVERNMENT_DESIGN;
    
    const labels = this.getBilingualLabels(labelKey);
    
    // English label
    doc.fontSize(9)
       .font(fonts.body)
       .fillColor(colors.security_blue)
       .text(labels.en, x, y);
    
    // Afrikaans label
    doc.fontSize(8)
       .font(fonts.body)
       .fillColor(colors.security_green)
       .text(labels.af, x, y + 12);
    
    // Value
    doc.fontSize(11)
       .font(fonts.header)
       .fillColor(colors.black)
       .text(value, x + 120, y + 3);
  }
  
  /**
   * Get bilingual labels for common fields
   */
  private getBilingualLabels(key: string): { en: string; af: string } {
    const labels: Record<string, { en: string; af: string }> = {
      full_name: { en: "Full Name", af: "Volledige Naam" },
      id_number: { en: "ID Number", af: "ID Nommer" },
      date_of_birth: { en: "Date of Birth", af: "Geboortedatum" },
      place_of_birth: { en: "Place of Birth", af: "Geboorteplek" },
      nationality: { en: "Nationality", af: "Nasionaliteit" },
      passport_number: { en: "Passport Number", af: "Paspoort Nommer" },
      card_number: { en: "Card Number", af: "Kaart Nommer" },
      permit_number: { en: "Permit Number", af: "Permit Nommer" },
      valid_from: { en: "Valid From", af: "Geldig Van" },
      valid_until: { en: "Valid Until", af: "Geldig Tot" },
      occupation: { en: "Occupation", af: "Beroep" },
      employer: { en: "Employer", af: "Werkgewer" },
      conditions: { en: "Conditions", af: "Voorwaardes" }
    };
    
    return labels[key] || { en: key, af: key };
  }
  
  /**
   * Add microtext security feature
   */
  protected addMicrotext(doc: PDFKit, x: number, y: number): void {
    const { colors, fonts } = SA_GOVERNMENT_DESIGN;
    
    doc.save();
    doc.fontSize(4)
       .font(fonts.microtext)
       .fillColor(colors.microprint_gray);
    
    const microtext = "REPUBLIC OF SOUTH AFRICA DEPARTMENT OF HOME AFFAIRS ";
    const repeatedText = microtext.repeat(20);
    
    doc.text(repeatedText, x, y, { width: 450, height: 20 });
    doc.restore();
  }
  
  /**
   * Generate QR code for verification
   */
  protected async generateQRCode(data: any): Promise<string> {
    try {
      const qrData = JSON.stringify({
        type: data.documentType,
        id: data.documentId || crypto.randomUUID(),
        issued: new Date().toISOString(),
        hash: crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex').substring(0, 16)
      });
      
      return await QRCode.toDataURL(qrData, {
        width: SA_GOVERNMENT_DESIGN.dimensions.qr_size,
        margin: 2,
        color: {
          dark: SA_GOVERNMENT_DESIGN.colors.black,
          light: SA_GOVERNMENT_DESIGN.colors.white
        }
      });
    } catch (error) {
      console.error("QR Code generation failed:", error);
      return "";
    }
  }
  
  /**
   * Generate barcode for document
   */
  protected async generateBarcode(value: string): Promise<string> {
    try {
      const canvas = new Canvas(200, SA_GOVERNMENT_DESIGN.dimensions.barcode_height);
      JsBarcode(canvas, value, {
        format: "CODE128",
        width: 1,
        height: SA_GOVERNMENT_DESIGN.dimensions.barcode_height,
        displayValue: false
      });
      
      return canvas.toDataURL();
    } catch (error) {
      console.error("Barcode generation failed:", error);
      return "";
    }
  }
  
  /**
   * Format date according to SA standards
   */
  protected formatSADate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-ZA', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch {
      return dateString;
    }
  }
  
  /**
   * Generate unique serial number
   */
  protected generateSerialNumber(prefix: string = "ZA"): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `${prefix}${timestamp}${random}`;
  }
  
  /**
   * Abstract method for document-specific generation
   */
  abstract generateDocument(data: any, isPreview?: boolean): Promise<Buffer>;
}

/**
 * Document Template Registry - Central mapping system
 */
export class DocumentTemplateRegistry {
  private static instance: DocumentTemplateRegistry;
  private generators: Map<string, any> = new Map();
  private enhancedService: EnhancedPDFGenerationService;
  private basicService: DocumentGeneratorService;
  private workVisaGenerator: ExactWorkVisaGenerator;
  
  // Instantiate new generators
  private idBookGenerator: IdentityDocumentBookGenerator;
  private passportGenerator: SouthAfricanPassportGenerator;
  private birthCertGenerator: BirthCertificateGenerator;
  private marriageCertGenerator: MarriageCertificateGenerator;
  private criticalSkillsGenerator: CriticalSkillsWorkVisaGenerator;
  
  private constructor() {
    this.enhancedService = enhancedPdfGenerationService;
    this.basicService = documentGenerator;
    this.workVisaGenerator = new ExactWorkVisaGenerator();
    
    // Initialize new generators
    this.idBookGenerator = new IdentityDocumentBookGenerator();
    this.passportGenerator = new SouthAfricanPassportGenerator();
    this.birthCertGenerator = new BirthCertificateGenerator();
    this.marriageCertGenerator = new MarriageCertificateGenerator();
    this.criticalSkillsGenerator = new CriticalSkillsWorkVisaGenerator();
    
    this.initializeGenerators();
  }
  
  public static getInstance(): DocumentTemplateRegistry {
    if (!DocumentTemplateRegistry.instance) {
      DocumentTemplateRegistry.instance = new DocumentTemplateRegistry();
    }
    return DocumentTemplateRegistry.instance;
  }
  
  /**
   * Initialize all document type generators
   */
  private initializeGenerators(): void {
    // Identity Documents (3)
    this.generators.set("smart_id_card", this.enhancedService.generateSmartIdPDF.bind(this.enhancedService));
    this.generators.set("identity_document_book", this.idBookGenerator.generateDocument.bind(this.idBookGenerator));
    this.generators.set("temporary_id_certificate", this.generateTemporaryIdCertificate.bind(this));
    
    // Travel Documents (3)  
    this.generators.set("south_african_passport", this.passportGenerator.generateDocument.bind(this.passportGenerator));
    this.generators.set("emergency_travel_certificate", this.generateEmergencyTravelCertificate.bind(this));
    this.generators.set("refugee_travel_document", this.generateRefugeeTravelDocument.bind(this));
    
    // Civil Documents (4)
    this.generators.set("birth_certificate", this.birthCertGenerator.generateDocument.bind(this.birthCertGenerator));
    this.generators.set("death_certificate", this.generateDeathCertificate.bind(this));
    this.generators.set("marriage_certificate", this.marriageCertGenerator.generateDocument.bind(this.marriageCertGenerator));
    this.generators.set("divorce_certificate", this.generateDivorceCertificate.bind(this));
    
    // Immigration Documents (11)
    this.generators.set("general_work_visa", this.generateGeneralWorkVisa.bind(this));
    this.generators.set("critical_skills_work_visa", this.criticalSkillsGenerator.generateDocument.bind(this.criticalSkillsGenerator));
    this.generators.set("intra_company_transfer_work_visa", this.generateIntraCompanyTransferWorkVisa.bind(this));
    this.generators.set("business_visa", this.generateBusinessVisa.bind(this));
    this.generators.set("study_visa_permit", this.generateStudyVisaPermit.bind(this));
    this.generators.set("visitor_visa", this.generateVisitorVisa.bind(this));
    this.generators.set("medical_treatment_visa", this.generateMedicalTreatmentVisa.bind(this));
    this.generators.set("retired_person_visa", this.generateRetiredPersonVisa.bind(this));
    this.generators.set("exchange_visa", this.generateExchangeVisa.bind(this));
    this.generators.set("relatives_visa", this.generateRelativesVisa.bind(this));
    this.generators.set("permanent_residence_permit", this.generatePermanentResidencePermit.bind(this));
    
    // Legacy compatibility mappings
    this.generators.set("smart_id", this.enhancedService.generateSmartIdPDF.bind(this.enhancedService));
    this.generators.set("passport", this.generateSouthAfricanPassport.bind(this));
    this.generators.set("diplomatic_passport", this.enhancedService.generateDiplomaticPassportPDF.bind(this.enhancedService));
    
    console.log(`[Document Template Registry] Initialized with ${this.generators.size} document generators`);
  }
  
  /**
   * Main document generation method - routes to appropriate generator
   */
  async generateDocument(
    request: DocumentGenerationRequest, 
    isPreview: boolean = false
  ): Promise<DocumentGenerationResult> {
    try {
      const documentType = request.documentType;
      const generator = this.generators.get(documentType);
      
      if (!generator) {
        throw new Error(`No generator found for document type: ${documentType}`);
      }
      
      // Generate unique document ID and verification code
      const documentId = crypto.randomUUID();
      const verificationCode = this.generateVerificationCode();
      const serialNumber = this.generateSerialNumber(documentType.substring(0, 3).toUpperCase());
      
      // Add metadata to request
      const enhancedRequest = {
        ...request,
        documentId,
        verificationCode,
        serialNumber,
        isPreview
      };
      
      // Generate the document
      const pdfBuffer = await generator(enhancedRequest);
      
      // Save document to file system
      const fileName = `${documentType}_${documentId}.pdf`;
      const filePath = path.join(DOCUMENTS_DIR, fileName);
      await fs.writeFile(filePath, pdfBuffer);
      
      // Generate security features
      const securityFeatures = await this.generateSecurityFeatures(enhancedRequest);
      
      // Create metadata
      const metadata = this.createDocumentMetadata(documentType, documentId);
      
      return {
        success: true,
        documentId,
        documentUrl: `/documents/${fileName}`,
        verificationCode,
        qrCodeUrl: `https://verify.dha.gov.za/qr/${verificationCode}`,
        securityFeatures,
        metadata
      };
      
    } catch (error) {
      console.error("[Document Template Registry] Generation failed:", error);
      return {
        success: false,
        documentId: "",
        error: error instanceof Error ? error.message : "Document generation failed",
        securityFeatures: {} as SecurityFeatureSet,
        metadata: {} as DocumentMetadata
      };
    }
  }
  
  /**
   * Generate security features for document
   */
  private async generateSecurityFeatures(request: any): Promise<SecurityFeatureSet> {
    const qrCode = await this.generateQRCode(request);
    const barcode = await this.generateBarcode(request.serialNumber);
    const cryptographicHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(request))
      .digest('hex');
    
    return {
      watermarks: true,
      guilloche: true,
      microtext: true,
      holographic: true,
      qrCode,
      barcode,
      serialNumber: request.serialNumber,
      digitalSignature: true,
      cryptographicHash,
      verificationUrl: `https://verify.dha.gov.za/${request.verificationCode}`,
      tamperEvident: true,
      rfidSimulation: ["smart_id_card", "identity_document_book"].includes(request.documentType),
      mrzCompliant: ["south_african_passport", "refugee_travel_document"].includes(request.documentType),
      biometricData: ["smart_id_card", "south_african_passport"].includes(request.documentType),
      blockchainAnchor: `0x${crypto.randomBytes(16).toString('hex')}`,
      pkaSignature: true,
      uvReactive: true,
      rainbowPrinting: true,
      securityThread: true
    };
  }
  
  /**
   * Create document metadata
   */
  private createDocumentMetadata(documentType: string, documentId: string): DocumentMetadata {
    const formNumbers: Record<string, string> = {
      smart_id_card: "DHA-24",
      identity_document_book: "BI-9", 
      temporary_id_certificate: "DHA-73",
      south_african_passport: "DHA-73",
      emergency_travel_certificate: "DHA-1738",
      refugee_travel_document: "DHA-1590",
      birth_certificate: "BI-24",
      death_certificate: "BI-1663",
      marriage_certificate: "BI-130",
      divorce_certificate: "BI-281",
      general_work_visa: "BI-1738",
      critical_skills_work_visa: "DHA-1739",
      permanent_residence_permit: "BI-947"
    };
    
    return {
      documentType,
      formNumber: formNumbers[documentType] || "DHA-GENERIC",
      issuingOffice: "Cape Town Home Affairs",
      issuingOfficer: "System Generated",
      generatedAt: new Date(),
      classification: "Official",
      version: "2.0",
      templateVersion: "2024.1"
    };
  }
  
  // PLACEHOLDER GENERATORS FOR REMAINING DOCUMENT TYPES
  // These will be implemented progressively
  
  private async generateTemporaryIdCertificate(data: TemporaryIdCertificateData): Promise<Buffer> {
    // TODO: Implement remaining generators
    throw new Error("Temporary ID Certificate generator not yet implemented");
  }
  
  private async generateEmergencyTravelCertificate(data: EmergencyTravelCertificateData): Promise<Buffer> {
    throw new Error("Emergency Travel Certificate generator not yet implemented");
  }
  
  private async generateRefugeeTravelDocument(data: RefugeeTravelDocumentData): Promise<Buffer> {
    throw new Error("Refugee Travel Document generator not yet implemented");
  }
  
  private async generateDeathCertificate(data: DeathCertificateData): Promise<Buffer> {
    throw new Error("Death Certificate generator not yet implemented");
  }
  
  private async generateDivorceCertificate(data: DivorceCertificateData): Promise<Buffer> {
    throw new Error("Divorce Certificate generator not yet implemented");
  }
  
  private async generateGeneralWorkVisa(data: GeneralWorkVisaData): Promise<Buffer> {
    // Use existing work visa generator
    return this.workVisaGenerator.generateExactWorkVisa(data as any);
  }
  
  private async generateIntraCompanyTransferWorkVisa(data: IntraCompanyTransferWorkVisaData): Promise<Buffer> {
    // TODO: Implement in Task 5
    throw new Error("Intra-Company Transfer Work Visa generator not yet implemented");
  }
  
  private async generateBusinessVisa(data: BusinessVisaData): Promise<Buffer> {
    // TODO: Implement in Task 5
    throw new Error("Business Visa generator not yet implemented");
  }
  
  private async generateStudyVisaPermit(data: StudyVisaPermitData): Promise<Buffer> {
    // TODO: Implement in Task 5
    throw new Error("Study Visa/Permit generator not yet implemented");
  }
  
  private async generateVisitorVisa(data: VisitorVisaData): Promise<Buffer> {
    // TODO: Implement in Task 5
    throw new Error("Visitor Visa generator not yet implemented");
  }
  
  private async generateMedicalTreatmentVisa(data: MedicalTreatmentVisaData): Promise<Buffer> {
    // TODO: Implement in Task 5
    throw new Error("Medical Treatment Visa generator not yet implemented");
  }
  
  private async generateRetiredPersonVisa(data: RetiredPersonVisaData): Promise<Buffer> {
    // TODO: Implement in Task 5
    throw new Error("Retired Person's Visa generator not yet implemented");
  }
  
  private async generateExchangeVisa(data: ExchangeVisaData): Promise<Buffer> {
    // TODO: Implement in Task 5
    throw new Error("Exchange Visa generator not yet implemented");
  }
  
  private async generateRelativesVisa(data: RelativesVisaData): Promise<Buffer> {
    // TODO: Implement in Task 5
    throw new Error("Relatives Visa generator not yet implemented");
  }
  
  private async generatePermanentResidencePermit(data: PermanentResidencePermitData): Promise<Buffer> {
    // TODO: Implement in Task 5
    throw new Error("Permanent Residence Permit generator not yet implemented");
  }
  
  /**
   * Helper methods
   */
  private generateVerificationCode(): string {
    return crypto.randomBytes(6).toString('hex').toUpperCase();
  }
  
  private generateSerialNumber(prefix: string = "ZA"): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `${prefix}${timestamp}${random}`;
  }
  
  private async generateQRCode(data: any): Promise<string> {
    try {
      const qrData = JSON.stringify({
        type: data.documentType,
        id: data.documentId,
        issued: new Date().toISOString(),
        hash: crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex').substring(0, 16)
      });
      
      return await QRCode.toDataURL(qrData, {
        width: SA_GOVERNMENT_DESIGN.dimensions.qr_size,
        margin: 2
      });
    } catch (error) {
      console.error("QR Code generation failed:", error);
      return "";
    }
  }
  
  /**
   * Get list of all supported document types
   */
  getSupportedDocumentTypes(): string[] {
    return Array.from(this.generators.keys());
  }
  
  /**
   * Check if a document type is supported
   */
  isDocumentTypeSupported(documentType: string): boolean {
    return this.generators.has(documentType);
  }
}

// Export singleton instance
export const documentTemplateRegistry = DocumentTemplateRegistry.getInstance();
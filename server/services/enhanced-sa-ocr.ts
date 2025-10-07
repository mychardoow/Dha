import fs from "fs/promises";
import path from "path";

/**
 * Enhanced OCR Service specifically designed for South African Government Documents
 * 
 * Supports:
 * - Work Permits (Critical Skills, General Work Visas)
 * - Residence Permits (Temporary/Permanent)
 * - Multi-language text recognition (English/Afrikaans)
 * - Government document layout patterns
 * - Field extraction with validation
 */

export interface SADocumentField {
  name: string;
  value: string;
  confidence: number;
  position: { x: number; y: number; width: number; height: number };
  validationPattern?: RegExp;
  isRequired: boolean;
}

export interface SAOCRResult {
  success: boolean;
  documentType: 'work_permit' | 'residence_permit' | 'temporary_permit' | 'permanent_visa' | 'unknown';
  language: 'english' | 'afrikaans' | 'mixed';
  extractedFields: SADocumentField[];
  fullText: string;
  confidence: number;
  layoutAnalysis: {
    documentStructure: 'single_page' | 'multi_page' | 'booklet';
    hasOfficialStamps: boolean;
    hasWatermarks: boolean;
    hasBarcodes: boolean;
    hasPhotograph: boolean;
  };
  validationResults: {
    formatValid: boolean;
    requiredFieldsPresent: boolean;
    dateFormatsValid: boolean;
    referenceNumbersValid: boolean;
    issuesFound: string[];
  };
  processingTime: number;
  error?: string;
}

export interface SAOCROptions {
  documentType?: 'work_permit' | 'residence_permit' | 'temporary_permit' | 'permanent_visa';
  enablePreprocessing: boolean;
  enableMultiLanguage: boolean;
  extractFields: boolean;
  validateExtractedData: boolean;
  enhanceImageQuality: boolean;
}

export class EnhancedSAOCRService {
  private tesseractReady = false;
  private createWorker: any = null;
  private PSM: any = null;
  private sharp: any = null;

  private readonly SA_DOCUMENT_PATTERNS = {
    // Work Permit Patterns
    work_permit: {
      permitNumber: /(?:Permit\s+Number|Permit\s+No\.?|Vergunning\s+Nommer)\s*:?\s*([A-Z0-9\-\/]{8,20})/gi,
      employerName: /(?:Employer|Werkgewer)\s*:?\s*(.+?)(?:\n|$)/gi,
      jobTitle: /(?:Job\s+Title|Occupation|Pos\s+Titel|Beroep)\s*:?\s*(.+?)(?:\n|$)/gi,
      validFrom: /(?:Valid\s+From|Geldig\s+Vanaf)\s*:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/gi,
      validUntil: /(?:Valid\s+Until|Expires|Geldig\s+Tot|Verval)\s*:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/gi,
      workLocation: /(?:Work\s+Location|Work\s+Address|Werk\s+Plek)\s*:?\s*(.+?)(?:\n|$)/gi,
      conditions: /(?:Conditions|Voorwaardes)\s*:?\s*([\s\S]*?)(?=\n\n|\n[A-Z]|$)/gi,
      issueDate: /(?:Date\s+of\s+Issue|Issue\s+Date|Datum\s+van\s+Uitreiking)\s*:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/gi
    },

    // Residence Permit Patterns  
    residence_permit: {
      permitNumber: /(?:Residence\s+Permit\s+Number|Permit\s+No\.?|Verblyf\s+Vergunning\s+Nommer)\s*:?\s*([A-Z0-9\-\/]{8,20})/gi,
      permitType: /(?:Permit\s+Type|Type|Vergunning\s+Tipe)\s*:?\s*(Temporary|Permanent|Tydelik|Permanent)/gi,
      nationality: /(?:Nationality|Nasionaliteit)\s*:?\s*(.+?)(?:\n|$)/gi,
      passportNumber: /(?:Passport\s+Number|Paspoort\s+Nommer)\s*:?\s*([A-Z0-9]{6,12})/gi,
      validFrom: /(?:Valid\s+From|Geldig\s+Vanaf)\s*:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/gi,
      validUntil: /(?:Valid\s+Until|Expires|Geldig\s+Tot|Verval)\s*:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/gi,
      endorsements: /(?:Endorsements|Aantekeninge)\s*:?\s*([\s\S]*?)(?=\n\n|\n[A-Z]|$)/gi,
      workAuthorization: /(?:Work\s+Authorization|Authorized\s+to\s+Work|Werk\s+Magtiging)\s*:?\s*(Yes|No|Ja|Nee)/gi
    },

    // Common Government Document Patterns
    common: {
      dhaOffice: /(?:Department\s+of\s+Home\s+Affairs|DHA\s+Office|Kantoor)\s*:?\s*(.+?)(?:\n|$)/gi,
      officialStamp: /(?:Official\s+Stamp|Amptelike\s+Stempel|Departement\s+van\s+Binnelandse\s+Sake)/gi,
      referenceNumber: /(?:Reference\s+Number|Ref\s+No\.?|Verwysing\s+Nommer)\s*:?\s*([A-Z0-9\-\/]{8,20})/gi,
      applicantName: /(?:Applicant\s+Name|Full\s+Name|Aansoeker\s+Naam|Volle\s+Naam)\s*:?\s*(.+?)(?:\n|$)/gi,
      idNumber: /(?:ID\s+Number|Identity\s+Number|Identiteits\s+Nommer)\s*:?\s*(\d{13})/gi
    }
  };

  private readonly SA_DATE_FORMATS = [
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/,
    /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/,
    /(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December|Januarie|Februarie|Maart|April|Mei|Junie|Julie|Augustus|September|Oktober|November|Desember)\s+(\d{4})/gi
  ];

  constructor() {
    this.initializeDependencies();
  }

  private async initializeDependencies() {
    try {
      // Try to load tesseract dynamically
      const tesseract = await import("tesseract.js");
      this.createWorker = tesseract.createWorker;
      this.PSM = tesseract.PSM;
      this.tesseractReady = true;
    } catch (error) {
      console.warn("[OCR] Tesseract.js not available - OCR disabled");
      this.tesseractReady = false;
    }

    try {
      this.sharp = require("sharp");
    } catch (error) {
      console.warn("[OCR] Sharp not available - image optimization disabled");
    }
  }

  /**
   * Process SA government document with enhanced OCR
   */
  async processDocument(
    filePath: string,
    mimeType: string,
    options: SAOCROptions = {
      enablePreprocessing: true,
      enableMultiLanguage: true,
      extractFields: true,
      validateExtractedData: true,
      enhanceImageQuality: true
    }
  ): Promise<SAOCRResult> {
    const startTime = Date.now();

    if (!this.tesseractReady) {
      await this.initializeDependencies();
      if (!this.tesseractReady) {
        throw new Error("Tesseract OCR is not available");
      }
    }

    try {
      // Preprocess image for better OCR accuracy
      const processedImagePath = options.enhanceImageQuality 
        ? await this.preprocessImage(filePath, mimeType)
        : filePath;

      // Perform multi-language OCR
      const ocrResult = await this.performEnhancedOCR(processedImagePath, options);

      // Analyze document layout and structure
      const layoutAnalysis = await this.analyzeDocumentLayout(ocrResult.text, processedImagePath);

      // Detect document type
      const documentType = this.detectDocumentType(ocrResult.text);

      // Extract structured fields
      const extractedFields = options.extractFields 
        ? await this.extractStructuredFields(ocrResult.text, documentType)
        : [];

      // Validate extracted data
      const validationResults = options.validateExtractedData
        ? this.validateExtractedData(extractedFields, documentType)
        : {
            formatValid: true,
            requiredFieldsPresent: true,
            dateFormatsValid: true,
            referenceNumbersValid: true,
            issuesFound: []
          };

      // Detect language(s)
      const language = this.detectLanguage(ocrResult.text);

      // Clean up processed image if it was created
      if (processedImagePath !== filePath) {
        await fs.unlink(processedImagePath).catch(() => {});
      }

      return {
        success: true,
        documentType,
        language,
        extractedFields,
        fullText: ocrResult.text,
        confidence: ocrResult.confidence,
        layoutAnalysis,
        validationResults,
        processingTime: Date.now() - startTime
      };

    } catch (error) {
      return {
        success: false,
        documentType: 'unknown',
        language: 'english',
        extractedFields: [],
        fullText: '',
        confidence: 0,
        layoutAnalysis: {
          documentStructure: 'single_page',
          hasOfficialStamps: false,
          hasWatermarks: false,
          hasBarcodes: false,
          hasPhotograph: false
        },
        validationResults: {
          formatValid: false,
          requiredFieldsPresent: false,
          dateFormatsValid: false,
          referenceNumbersValid: false,
          issuesFound: ['OCR processing failed']
        },
        processingTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  private async preprocessImage(filePath: string, mimeType: string): Promise<string> {
    if (!mimeType.startsWith('image/') || !this.sharp) {
      return filePath;
    }

    const outputPath = filePath.replace(/\.(jpg|jpeg|png|tiff)$/i, '_processed.png');

    try {
      await this.sharp(filePath)
        .resize(null, 2000, { 
          withoutEnlargement: true,
          kernel: this.sharp.kernel.lanczos3
        })
        .normalize()
        .sharpen({ sigma: 1.5 })
        .threshold(128)
        .png({ quality: 90 })
        .toFile(outputPath);

      return outputPath;
    } catch (error) {
      console.error('Image preprocessing failed:', error);
      return filePath;
    }
  }

  private async performEnhancedOCR(filePath: string, options: SAOCROptions): Promise<{
    text: string;
    confidence: number;
  }> {
    if (!this.createWorker) {
      throw new Error('Tesseract worker not available');
    }

    const worker = await this.createWorker();

    try {
      await worker.load();

      const languages = options.enableMultiLanguage ? 'eng+afr' : 'eng';
      await worker.reinitialize(languages);

      await worker.setParameters({
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .,:-/()[]',
        tessedit_pageseg_mode: this.PSM?.AUTO_OSD || 1,
        preserve_interword_spaces: '1'
      });

      const { data: { text, confidence } } = await worker.recognize(filePath);

      return {
        text: this.cleanExtractedText(text),
        confidence: Math.round(confidence)
      };

    } finally {
      await worker.terminate();
    }
  }

  private cleanExtractedText(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .replace(/[^\x00-\x7F]/g, '')
      .replace(/(\r\n|\r|\n)/g, '\n')
      .trim();
  }

  private async analyzeDocumentLayout(text: string, imagePath: string): Promise<{
    documentStructure: 'single_page' | 'multi_page' | 'booklet';
    hasOfficialStamps: boolean;
    hasWatermarks: boolean;
    hasBarcodes: boolean;
    hasPhotograph: boolean;
  }> {
    const analysis = {
      documentStructure: 'single_page' as const,
      hasOfficialStamps: false,
      hasWatermarks: false,
      hasBarcodes: false,
      hasPhotograph: false
    };

    analysis.hasOfficialStamps = this.SA_DOCUMENT_PATTERNS.common.officialStamp.test(text);
    analysis.hasWatermarks = /(?:REPUBLIC OF SOUTH AFRICA|DEPARTEMENT VAN BINNELANDSE SAKE)/i.test(text);
    analysis.hasBarcodes = /[0-9]{8,}/.test(text) && text.includes('|||');
    analysis.hasPhotograph = /(?:photograph|foto|picture)/i.test(text);

    return analysis;
  }

  private detectDocumentType(text: string): 'work_permit' | 'residence_permit' | 'temporary_permit' | 'permanent_visa' | 'unknown' {
    const textLower = text.toLowerCase();

    if (textLower.includes('work permit') || textLower.includes('werk vergunning') || 
        textLower.includes('work visa') || textLower.includes('critical skills')) {
      return 'work_permit';
    }

    if (textLower.includes('residence permit') || textLower.includes('verblyf vergunning') ||
        textLower.includes('temporary residence') || textLower.includes('tydelike verblyf')) {
      return 'residence_permit';
    }

    if (textLower.includes('temporary permit') || textLower.includes('tydelike vergunning')) {
      return 'temporary_permit';
    }

    if (textLower.includes('permanent residence') || textLower.includes('permanent verblyf') ||
        textLower.includes('permanent visa')) {
      return 'permanent_visa';
    }

    return 'unknown';
  }

  private async extractStructuredFields(
    text: string, 
    documentType: 'work_permit' | 'residence_permit' | 'temporary_permit' | 'permanent_visa' | 'unknown'
  ): Promise<SADocumentField[]> {
    const fields: SADocumentField[] = [];

    let patterns: Record<string, RegExp>;

    if (documentType === 'work_permit') {
      patterns = { ...this.SA_DOCUMENT_PATTERNS.work_permit, ...this.SA_DOCUMENT_PATTERNS.common };
    } else if (documentType === 'residence_permit' || documentType === 'temporary_permit' || documentType === 'permanent_visa') {
      patterns = { ...this.SA_DOCUMENT_PATTERNS.residence_permit, ...this.SA_DOCUMENT_PATTERNS.common };
    } else {
      patterns = this.SA_DOCUMENT_PATTERNS.common;
    }

    for (const [fieldName, pattern] of Object.entries(patterns)) {
      const matches = Array.from(text.matchAll(pattern));

      if (matches.length > 0) {
        const match = matches[0];
        const value = match[1]?.trim() || match[0]?.trim();

        if (value) {
          fields.push({
            name: fieldName,
            value,
            confidence: this.calculateFieldConfidence(fieldName, value, text),
            position: { x: 0, y: 0, width: 0, height: 0 },
            validationPattern: pattern,
            isRequired: this.isRequiredField(fieldName, documentType)
          });
        }
      }
    }

    return fields;
  }

  private calculateFieldConfidence(fieldName: string, value: string, fullText: string): number {
    let confidence = 70;

    if (fieldName.includes('Number') && /^[A-Z0-9\-\/]{8,20}$/.test(value)) {
      confidence += 15;
    }

    if (fieldName.includes('Date') && this.SA_DATE_FORMATS.some(format => format.test(value))) {
      confidence += 10;
    }

    if (value.length < 3) {
      confidence -= 20;
    }

    return Math.max(0, Math.min(100, confidence));
  }

  private isRequiredField(fieldName: string, documentType: string): boolean {
    const requiredFields = {
      work_permit: ['permitNumber', 'employerName', 'validFrom', 'validUntil'],
      residence_permit: ['permitNumber', 'permitType', 'validFrom', 'validUntil'],
      temporary_permit: ['permitNumber', 'validFrom', 'validUntil'],
      permanent_visa: ['permitNumber', 'nationality']
    };

    return requiredFields[documentType as keyof typeof requiredFields]?.includes(fieldName) || false;
  }

  private validateExtractedData(fields: SADocumentField[], documentType: string): {
    formatValid: boolean;
    requiredFieldsPresent: boolean;
    dateFormatsValid: boolean;
    referenceNumbersValid: boolean;
    issuesFound: string[];
  } {
    const issues: string[] = [];
    let formatValid = true;
    let requiredFieldsPresent = true;
    let dateFormatsValid = true;
    let referenceNumbersValid = true;

    const requiredFields = fields.filter(f => f.isRequired);
    if (requiredFields.length === 0 || requiredFields.some(f => !f.value)) {
      requiredFieldsPresent = false;
      issues.push('Missing required fields');
    }

    const dateFields = fields.filter(f => f.name.includes('Date') || f.name.includes('valid'));
    for (const dateField of dateFields) {
      if (!this.SA_DATE_FORMATS.some(format => format.test(dateField.value))) {
        dateFormatsValid = false;
        issues.push(`Invalid date format: ${dateField.name}`);
      }
    }

    const numberFields = fields.filter(f => f.name.includes('Number') || f.name.includes('permitNumber'));
    for (const numberField of numberFields) {
      if (!/^[A-Z0-9\-\/]{6,20}$/.test(numberField.value)) {
        referenceNumbersValid = false;
        issues.push(`Invalid reference number format: ${numberField.name}`);
      }
    }

    formatValid = dateFormatsValid && referenceNumbersValid;

    return {
      formatValid,
      requiredFieldsPresent,
      dateFormatsValid,
      referenceNumbersValid,
      issuesFound: issues
    };
  }

  private detectLanguage(text: string): 'english' | 'afrikaans' | 'mixed' {
    const afrikaansKeywords = ['vergunning', 'werkgewer', 'geldig', 'verval', 'kantoor', 'departement', 'binnelandse'];
    const englishKeywords = ['permit', 'employer', 'valid', 'expires', 'office', 'department', 'affairs'];

    const textLower = text.toLowerCase();
    const afrikaansCount = afrikaansKeywords.filter(word => textLower.includes(word)).length;
    const englishCount = englishKeywords.filter(word => textLower.includes(word)).length;

    if (afrikaansCount > englishCount * 1.5) return 'afrikaans';
    if (englishCount > afrikaansCount * 1.5) return 'english';
    return 'mixed';
  }
}

export const enhancedSAOCR = new EnhancedSAOCRService();
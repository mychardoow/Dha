import { storage } from "../storage";
import { InsertDocument } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import CryptoJS from "crypto-js";
import { createWorker } from "tesseract.js";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";
const ENCRYPTION_KEY = process.env.DOCUMENT_ENCRYPTION_KEY || "default-document-key-change-in-production";
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

// Ensure upload directory exists
fs.mkdir(UPLOAD_DIR, { recursive: true }).catch(console.error);

export interface ProcessingResult {
  success: boolean;
  documentId?: string;
  ocrText?: string;
  ocrConfidence?: number;
  verificationScore?: number;
  isAuthentic?: boolean;
  error?: string;
}

export interface DocumentVerificationResult {
  isAuthentic: boolean;
  confidence: number;
  issues: string[];
  metadata: {
    fileSize: number;
    format: string;
    resolution?: string;
    pageCount?: number;
  };
}

// Configure multer for file uploads
export const documentUpload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => {
      const uniqueName = `${Date.now()}-${crypto.randomUUID()}${path.extname(file.originalname)}`;
      cb(null, uniqueName);
    }
  }),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/tiff',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} is not allowed`));
    }
  }
});

export class DocumentProcessorService {
  
  async processDocument(
    file: Express.Multer.File,
    userId: string,
    options: {
      performOCR?: boolean;
      verifyAuthenticity?: boolean;
      extractData?: boolean;
      encrypt?: boolean;
    } = {}
  ): Promise<ProcessingResult> {
    try {
      let encryptionKey: string | undefined;
      let encryptedPath = file.path;
      
      // Encrypt file if requested
      if (options.encrypt) {
        encryptionKey = crypto.randomBytes(32).toString('hex');
        encryptedPath = await this.encryptFile(file.path, encryptionKey);
      }
      
      // Create document record
      const documentData: InsertDocument = {
        userId,
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        storagePath: encryptedPath,
        encryptionKey,
        isEncrypted: !!options.encrypt,
        processingStatus: "processing"
      };
      
      const document = await storage.createDocument(documentData);
      
      // Perform OCR if requested
      let ocrResult;
      if (options.performOCR) {
        ocrResult = await this.performOCR(file.path, file.mimetype);
        if (ocrResult.success) {
          await storage.updateDocument(document.id, {
            ocrText: ocrResult.text,
            ocrConfidence: ocrResult.confidence
          });
        }
      }
      
      // Verify authenticity if requested
      let verificationResult;
      if (options.verifyAuthenticity) {
        verificationResult = await this.verifyDocumentAuthenticity(file.path, file.mimetype);
        await storage.updateDocument(document.id, {
          isVerified: verificationResult.isAuthentic,
          verificationScore: verificationResult.confidence
        });
      }
      
      // Update processing status
      await storage.updateDocument(document.id, {
        processingStatus: "completed"
      });
      
      // Log processing event
      await storage.createSecurityEvent({
        userId,
        eventType: "document_processed",
        severity: "low",
        details: {
          documentId: document.id,
          filename: file.originalname,
          size: file.size,
          mimeType: file.mimetype,
          ocrPerformed: options.performOCR,
          verificationPerformed: options.verifyAuthenticity,
          encrypted: options.encrypt,
          ocrConfidence: ocrResult?.confidence,
          verificationScore: verificationResult?.confidence
        }
      });
      
      return {
        success: true,
        documentId: document.id,
        ocrText: ocrResult?.text,
        ocrConfidence: ocrResult?.confidence,
        verificationScore: verificationResult?.confidence,
        isAuthentic: verificationResult?.isAuthentic
      };
      
    } catch (error) {
      console.error("Document processing error:", error);
      
      // Clean up file on error
      try {
        await fs.unlink(file.path);
      } catch (unlinkError) {
        console.error("Failed to clean up file:", unlinkError);
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : "Document processing failed"
      };
    }
  }
  
  private async performOCR(filePath: string, mimeType: string): Promise<{
    success: boolean;
    text?: string;
    confidence?: number;
    error?: string;
  }> {
    try {
      const worker = await createWorker();
      
      // Configure for different document types
      if (mimeType === 'application/pdf') {
        // For PDFs, we'd need to convert to images first
        // This is a simplified implementation
        return {
          success: false,
          error: "PDF OCR not implemented in this demo. Use image formats."
        };
      }
      
      await worker.loadLanguage('eng');
      await worker.initialize('eng');
      
      const { data: { text, confidence } } = await worker.recognize(filePath);
      await worker.terminate();
      
      return {
        success: true,
        text: text.trim(),
        confidence: Math.round(confidence)
      };
      
    } catch (error) {
      console.error("OCR error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "OCR processing failed"
      };
    }
  }
  
  private async verifyDocumentAuthenticity(filePath: string, mimeType: string): Promise<DocumentVerificationResult> {
    try {
      const stats = await fs.stat(filePath);
      const issues: string[] = [];
      let confidence = 100;
      
      // Basic file integrity checks
      if (stats.size === 0) {
        issues.push("File is empty");
        confidence -= 50;
      }
      
      if (stats.size > MAX_FILE_SIZE) {
        issues.push("File size exceeds maximum allowed");
        confidence -= 20;
      }
      
      // Check file format consistency
      const fileExtension = path.extname(filePath).toLowerCase();
      const expectedExtensions = this.getExpectedExtensions(mimeType);
      
      if (!expectedExtensions.includes(fileExtension)) {
        issues.push("File extension doesn't match MIME type");
        confidence -= 30;
      }
      
      // Read file header to verify format
      const buffer = await fs.readFile(filePath, { encoding: null });
      const isValidFormat = this.verifyFileHeader(buffer, mimeType);
      
      if (!isValidFormat) {
        issues.push("File header doesn't match declared format");
        confidence -= 40;
      }
      
      // Check for signs of tampering (basic implementation)
      const tamperingScore = await this.detectTampering(buffer, mimeType);
      confidence -= tamperingScore;
      
      if (tamperingScore > 30) {
        issues.push("Possible signs of tampering detected");
      }
      
      const isAuthentic = confidence >= 70 && issues.length === 0;
      
      return {
        isAuthentic,
        confidence: Math.max(confidence, 0),
        issues,
        metadata: {
          fileSize: stats.size,
          format: mimeType,
          pageCount: mimeType === 'application/pdf' ? 1 : undefined // Simplified
        }
      };
      
    } catch (error) {
      console.error("Document verification error:", error);
      return {
        isAuthentic: false,
        confidence: 0,
        issues: ["Verification process failed"],
        metadata: {
          fileSize: 0,
          format: mimeType
        }
      };
    }
  }
  
  private getExpectedExtensions(mimeType: string): string[] {
    const mimeToExtensions: Record<string, string[]> = {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/tiff': ['.tiff', '.tif'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    };
    
    return mimeToExtensions[mimeType] || [];
  }
  
  private verifyFileHeader(buffer: Buffer, mimeType: string): boolean {
    const signatures: Record<string, number[][]> = {
      'application/pdf': [[0x25, 0x50, 0x44, 0x46]], // %PDF
      'image/jpeg': [[0xFF, 0xD8, 0xFF]],
      'image/png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
      'image/tiff': [[0x49, 0x49, 0x2A, 0x00], [0x4D, 0x4D, 0x00, 0x2A]]
    };
    
    const expectedSignatures = signatures[mimeType];
    if (!expectedSignatures) return true; // Unknown type, assume valid
    
    return expectedSignatures.some(signature => {
      for (let i = 0; i < signature.length; i++) {
        if (buffer[i] !== signature[i]) return false;
      }
      return true;
    });
  }
  
  private async detectTampering(buffer: Buffer, mimeType: string): Promise<number> {
    let tamperingScore = 0;
    
    // Check for unusual patterns in file structure
    if (mimeType.startsWith('image/')) {
      // Look for repeated patterns that might indicate editing
      const chunks = [];
      for (let i = 0; i < Math.min(buffer.length, 1024); i += 16) {
        chunks.push(buffer.subarray(i, i + 16).toString('hex'));
      }
      
      const uniqueChunks = new Set(chunks);
      const repetitionRatio = 1 - (uniqueChunks.size / chunks.length);
      
      if (repetitionRatio > 0.3) {
        tamperingScore += 20;
      }
    }
    
    // Check for metadata inconsistencies
    // This would require format-specific parsing in production
    
    return tamperingScore;
  }
  
  private async encryptFile(filePath: string, key: string): Promise<string> {
    const data = await fs.readFile(filePath);
    const encrypted = CryptoJS.AES.encrypt(data.toString('base64'), key).toString();
    
    const encryptedPath = `${filePath}.encrypted`;
    await fs.writeFile(encryptedPath, encrypted);
    
    // Remove original file
    await fs.unlink(filePath);
    
    return encryptedPath;
  }
  
  async getDocument(documentId: string, userId: string): Promise<{
    success: boolean;
    document?: any;
    error?: string;
  }> {
    try {
      const document = await storage.getDocument(documentId);
      
      if (!document) {
        return {
          success: false,
          error: "Document not found"
        };
      }
      
      if (document.userId !== userId) {
        return {
          success: false,
          error: "Access denied"
        };
      }
      
      return {
        success: true,
        document: {
          id: document.id,
          filename: document.originalName,
          mimeType: document.mimeType,
          size: document.size,
          isEncrypted: document.isEncrypted,
          ocrText: document.ocrText,
          ocrConfidence: document.ocrConfidence,
          isVerified: document.isVerified,
          verificationScore: document.verificationScore,
          processingStatus: document.processingStatus,
          createdAt: document.createdAt
        }
      };
      
    } catch (error) {
      console.error("Get document error:", error);
      return {
        success: false,
        error: "Failed to retrieve document"
      };
    }
  }
  
  async getUserDocuments(userId: string) {
    const documents = await storage.getDocuments(userId);
    
    return documents.map(doc => ({
      id: doc.id,
      filename: doc.originalName,
      mimeType: doc.mimeType,
      size: doc.size,
      isEncrypted: doc.isEncrypted,
      isVerified: doc.isVerified,
      verificationScore: doc.verificationScore,
      processingStatus: doc.processingStatus,
      createdAt: doc.createdAt
    }));
  }
}

export const documentProcessorService = new DocumentProcessorService();

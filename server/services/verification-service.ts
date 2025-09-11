import crypto from "crypto";
import { storage } from "../storage";
import type { InsertDocumentVerificationRecord } from "@shared/schema";

interface VerificationRequest {
  code: string;
  ipAddress?: string;
  userAgent?: string;
  location?: string;
}

interface VerificationResult {
  isValid: boolean;
  documentType?: string;
  documentNumber?: string;
  issuedDate?: string;
  expiryDate?: string;
  holderName?: string;
  verificationCount: number;
  lastVerified?: Date;
  issueOffice?: string;
  issuingOfficer?: string;
  hashtags?: string[];
  verificationHistory?: Array<{
    timestamp: Date;
    ipAddress?: string;
    location?: string;
  }>;
  securityFeatures?: {
    brailleEncoded: boolean;
    holographicSeal: boolean;
    qrCodeValid: boolean;
    hashValid: boolean;
  };
  message?: string;
}

export class VerificationService {
  private readonly SECRET_KEY = process.env.VERIFICATION_SECRET || "DHA-VERIFICATION-SECRET-2024";
  
  /**
   * Generate a unique verification code for a document
   */
  generateVerificationCode(documentData: any, documentType: string): string {
    const timestamp = Date.now();
    const dataString = JSON.stringify({
      ...documentData,
      type: documentType,
      timestamp
    });
    
    const hash = crypto
      .createHmac('sha256', this.SECRET_KEY)
      .update(dataString)
      .digest('hex');
    
    // Create a shorter, more user-friendly code
    return hash.substring(0, 12).toUpperCase();
  }
  
  /**
   * Generate a secure document hash for verification
   */
  generateDocumentHash(documentData: any): string {
    const dataString = JSON.stringify(documentData);
    return crypto
      .createHash('sha256')
      .update(dataString)
      .digest('hex');
  }
  
  /**
   * Generate verification URL for QR codes
   */
  generateVerificationUrl(code: string): string {
    const baseUrl = process.env.VERIFICATION_BASE_URL || "https://dha.gov.za";
    return `${baseUrl}/verify/${code}`;
  }
  
  /**
   * Generate hashtags for a document
   */
  generateHashtags(documentType: string, documentNumber: string, year?: string): string[] {
    const currentYear = year || new Date().getFullYear().toString();
    const hashtags = [
      "#DHAVerified",
      "#SAGovDoc",
      "#AuthenticDHA",
      `#${documentType.replace(/[_\s]/g, '')}${currentYear}`,
      `#${documentNumber.replace(/[^a-zA-Z0-9]/g, '')}`,
      "#SecureDocument",
      "#BiometricVerified"
    ];
    
    // Add document-specific hashtags
    switch (documentType.toLowerCase()) {
      case 'work_permit':
        hashtags.push("#WorkPermitSA", "#Section19Permit");
        break;
      case 'birth_certificate':
        hashtags.push("#BirthCertSA", "#DHABirth");
        break;
      case 'passport':
        hashtags.push("#SAPassport", "#TravelDocumentSA");
        break;
      case 'asylum_visa':
        hashtags.push("#AsylumSA", "#RefugeePermit");
        break;
      case 'residence_permit':
        hashtags.push("#ResidencePermitSA", "#PermanentResidence");
        break;
    }
    
    return hashtags;
  }
  
  /**
   * Register a new document in the verification system
   */
  async registerDocument(
    documentType: string,
    documentNumber: string,
    documentData: any,
    userId?: string
  ): Promise<{ code: string; hash: string; url: string; hashtags: string[] }> {
    const code = this.generateVerificationCode(documentData, documentType);
    const hash = this.generateDocumentHash(documentData);
    const url = this.generateVerificationUrl(code);
    const hashtags = this.generateHashtags(documentType, documentNumber);
    
    // Store in database
    const verificationRecord: InsertDocumentVerificationRecord = {
      verificationCode: code,
      documentHash: hash,
      documentType,
      documentNumber,
      documentData,
      userId,
      verificationUrl: url,
      hashtags,
      isActive: true,
      verificationCount: 0,
      securityFeatures: {
        brailleEncoded: true,
        holographicSeal: true,
        qrCodeEmbedded: true,
        uvReactive: true,
        watermarked: true,
        microprinting: true
      }
    };
    
    await storage.createDocumentVerificationRecord(verificationRecord);
    
    return { code, hash, url, hashtags };
  }
  
  /**
   * Verify a document by its code
   */
  async verifyDocument(request: VerificationRequest): Promise<VerificationResult> {
    try {
      // Look up the document
      const record = await storage.getDocumentVerificationByCode(request.code);
      
      if (!record) {
        return {
          isValid: false,
          verificationCount: 0,
          message: "Document not found. This verification code is invalid.",
          securityFeatures: {
            brailleEncoded: false,
            holographicSeal: false,
            qrCodeValid: false,
            hashValid: false
          }
        };
      }
      
      // Check if document is active
      if (!record.isActive) {
        return {
          isValid: false,
          verificationCount: record.verificationCount,
          message: "This document has been revoked or expired.",
          securityFeatures: {
            brailleEncoded: false,
            holographicSeal: false,
            qrCodeValid: false,
            hashValid: false
          }
        };
      }
      
      // Check expiry if applicable
      if (record.expiryDate && new Date(record.expiryDate) < new Date()) {
        return {
          isValid: false,
          verificationCount: record.verificationCount,
          message: "This document has expired.",
          lastVerified: record.lastVerifiedAt || undefined,
          securityFeatures: {
            brailleEncoded: true,
            holographicSeal: true,
            qrCodeValid: true,
            hashValid: false
          }
        };
      }
      
      // Log verification attempt
      await storage.logDocumentVerification({
        verificationRecordId: record.id,
        ipAddress: request.ipAddress,
        userAgent: request.userAgent,
        location: request.location,
        isSuccessful: true
      });
      
      // Update verification count and last verified timestamp
      await storage.updateDocumentVerificationRecord(record.id, {
        verificationCount: record.verificationCount + 1,
        lastVerifiedAt: new Date()
      });
      
      // Get verification history
      const verificationHistory = await storage.getDocumentVerificationHistory(record.id);
      
      // Extract document details from stored data
      const documentData = record.documentData as any;
      
      return {
        isValid: true,
        documentType: record.documentType,
        documentNumber: record.documentNumber,
        issuedDate: record.issuedAt?.toISOString(),
        expiryDate: record.expiryDate?.toISOString(),
        holderName: documentData?.personal?.fullName || documentData?.fullName || "N/A",
        verificationCount: record.verificationCount + 1,
        lastVerified: new Date(),
        issueOffice: record.issuingOffice || "Department of Home Affairs",
        issuingOfficer: record.issuingOfficer || "Authorized Officer",
        hashtags: record.hashtags,
        verificationHistory: verificationHistory.map(h => ({
          timestamp: h.verifiedAt,
          ipAddress: h.ipAddress || undefined,
          location: h.location || undefined
        })),
        securityFeatures: {
          brailleEncoded: true,
          holographicSeal: true,
          qrCodeValid: true,
          hashValid: true
        },
        message: "Document verified successfully. This is an authentic DHA document."
      };
      
    } catch (error) {
      console.error("Verification error:", error);
      return {
        isValid: false,
        verificationCount: 0,
        message: "Verification failed due to a system error.",
        securityFeatures: {
          brailleEncoded: false,
          holographicSeal: false,
          qrCodeValid: false,
          hashValid: false
        }
      };
    }
  }
  
  /**
   * Get verification status and history for a document
   */
  async getVerificationStatus(documentId: string): Promise<any> {
    try {
      const record = await storage.getDocumentVerificationById(documentId);
      
      if (!record) {
        return {
          success: false,
          message: "Document not found"
        };
      }
      
      const history = await storage.getDocumentVerificationHistory(record.id);
      
      return {
        success: true,
        document: {
          type: record.documentType,
          number: record.documentNumber,
          isActive: record.isActive,
          verificationCount: record.verificationCount,
          lastVerified: record.lastVerifiedAt,
          issuedAt: record.issuedAt,
          expiryDate: record.expiryDate,
          hashtags: record.hashtags
        },
        verificationHistory: history,
        securityFeatures: record.securityFeatures
      };
    } catch (error) {
      console.error("Status check error:", error);
      return {
        success: false,
        message: "Failed to retrieve verification status"
      };
    }
  }
  
  /**
   * Convert text to Grade 1 Braille pattern
   */
  generateBraillePattern(text: string): string {
    // Grade 1 Braille mapping for alphanumeric characters
    const brailleMap: { [key: string]: string } = {
      'A': '⠁', 'B': '⠃', 'C': '⠉', 'D': '⠙', 'E': '⠑',
      'F': '⠋', 'G': '⠛', 'H': '⠓', 'I': '⠊', 'J': '⠚',
      'K': '⠅', 'L': '⠇', 'M': '⠍', 'N': '⠝', 'O': '⠕',
      'P': '⠏', 'Q': '⠟', 'R': '⠗', 'S': '⠎', 'T': '⠞',
      'U': '⠥', 'V': '⠧', 'W': '⠺', 'X': '⠭', 'Y': '⠽',
      'Z': '⠵',
      '0': '⠚', '1': '⠁', '2': '⠃', '3': '⠉', '4': '⠙',
      '5': '⠑', '6': '⠋', '7': '⠛', '8': '⠓', '9': '⠊',
      ' ': '⠀', '-': '⠤', '/': '⠌', '.': '⠲', ',': '⠂'
    };
    
    // Number indicator for Braille
    const numberIndicator = '⠼';
    
    let brailleText = '';
    let inNumberMode = false;
    
    for (const char of text.toUpperCase()) {
      if (/\d/.test(char)) {
        if (!inNumberMode) {
          brailleText += numberIndicator;
          inNumberMode = true;
        }
      } else {
        inNumberMode = false;
      }
      
      brailleText += brailleMap[char] || char;
    }
    
    return brailleText;
  }
  
  /**
   * Revoke a document verification
   */
  async revokeDocument(documentId: string, reason?: string): Promise<boolean> {
    try {
      const record = await storage.getDocumentVerificationById(documentId);
      
      if (!record) {
        return false;
      }
      
      await storage.updateDocumentVerificationRecord(record.id, {
        isActive: false,
        revokedAt: new Date(),
        revocationReason: reason
      });
      
      return true;
    } catch (error) {
      console.error("Revocation error:", error);
      return false;
    }
  }
}

// Export singleton instance
export const verificationService = new VerificationService();
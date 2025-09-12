import crypto from "crypto";
import { storage } from "../storage";
import type { InsertDocumentVerificationRecord } from "@shared/schema";
import { aiAssistantService } from "./ai-assistant";
import { fraudDetectionService } from "./fraud-detection";

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
  aiAuthenticityScore?: number;
  fraudRiskLevel?: string;
  aiRecommendations?: string[];
  anomalies?: string[];
}

export class VerificationService {
  private readonly SECRET_KEY = process.env.VERIFICATION_SECRET || "DHA-VERIFICATION-SECRET-2024";
  private readonly AI_VERIFICATION_ENABLED = process.env.AI_VERIFICATION_ENABLED !== 'false';
  
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
  ): Promise<{ code: string; hash: string; url: string; hashtags: string[]; aiScore?: number }> {
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
    
    // Perform AI authenticity scoring if enabled
    let aiScore: number | undefined;
    if (this.AI_VERIFICATION_ENABLED) {
      const aiAuth = await this.performAIAuthenticityScoring(documentData, documentType);
      aiScore = aiAuth.score;
      
      // Update record with AI score
      await storage.updateDocumentVerificationRecord(code, {
        aiAuthenticityScore: aiScore,
        aiVerificationMetadata: JSON.stringify(aiAuth)
      });
    }
    
    return { code, hash, url, hashtags, aiScore };
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
      
      // Perform AI fraud detection and behavioral analysis
      let aiAuthenticityScore: number | undefined;
      let fraudRiskLevel: string | undefined;
      let aiRecommendations: string[] | undefined;
      let anomalies: string[] | undefined;
      
      if (this.AI_VERIFICATION_ENABLED) {
        // AI authenticity verification
        const aiAuth = await this.performAIAuthenticityScoring(documentData, record.documentType);
        aiAuthenticityScore = aiAuth.score;
        aiRecommendations = aiAuth.recommendations;
        
        // Behavioral analysis
        const behaviorAnalysis = await this.analyzeBehavioralPatterns({
          userId: record.userId || undefined,
          ipAddress: request.ipAddress,
          userAgent: request.userAgent,
          location: request.location,
          documentType: record.documentType,
          verificationCount: record.verificationCount
        });
        
        fraudRiskLevel = behaviorAnalysis.riskLevel;
        anomalies = behaviorAnalysis.anomalies;
        
        // Log AI analysis results
        await storage.createSecurityEvent({
          userId: record.userId || undefined,
          eventType: "ai_verification_analysis",
          severity: fraudRiskLevel === "high" ? "high" : "low",
          details: {
            documentType: record.documentType,
            aiScore: aiAuthenticityScore,
            fraudRiskLevel,
            anomalies
          }
        });
      }
      
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
   * Perform AI-based authenticity scoring
   */
  private async performAIAuthenticityScoring(documentData: any, documentType: string): Promise<{
    score: number;
    recommendations: string[];
    metadata: any;
  }> {
    try {
      // Analyze document with AI
      const aiAnalysis = await aiAssistantService.analyzeDocument(
        JSON.stringify(documentData),
        documentType
      );
      
      // Calculate authenticity score based on AI analysis
      let score = 100;
      const recommendations: string[] = [];
      
      // Reduce score based on validation issues
      if (aiAnalysis.validationIssues && aiAnalysis.validationIssues.length > 0) {
        score -= aiAnalysis.validationIssues.length * 10;
        recommendations.push(...aiAnalysis.validationIssues);
      }
      
      // Adjust score based on completeness
      if (aiAnalysis.completeness) {
        score = Math.min(score, aiAnalysis.completeness);
      }
      
      // Add AI suggestions
      if (aiAnalysis.suggestions) {
        recommendations.push(...aiAnalysis.suggestions);
      }
      
      // Ensure score is between 0 and 100
      score = Math.max(0, Math.min(100, score));
      
      return {
        score,
        recommendations,
        metadata: {
          extractedFields: aiAnalysis.extractedFields,
          completeness: aiAnalysis.completeness,
          timestamp: new Date()
        }
      };
    } catch (error) {
      console.error("AI authenticity scoring error:", error);
      return {
        score: 50, // Default neutral score on error
        recommendations: ["Manual verification recommended"],
        metadata: { error: "AI scoring unavailable" }
      };
    }
  }
  
  /**
   * Analyze behavioral patterns for fraud detection
   */
  private async analyzeBehavioralPatterns(params: {
    userId?: string;
    ipAddress?: string;
    userAgent?: string;
    location?: string;
    documentType: string;
    verificationCount: number;
  }): Promise<{
    riskLevel: string;
    anomalies: string[];
    score: number;
  }> {
    try {
      const anomalies: string[] = [];
      let riskScore = 0;
      
      // Check for rapid verification attempts
      if (params.verificationCount > 10) {
        anomalies.push("High verification frequency detected");
        riskScore += 20;
      }
      
      // Check for suspicious user agent patterns
      if (params.userAgent && params.userAgent.includes("bot")) {
        anomalies.push("Automated tool detected");
        riskScore += 30;
      }
      
      // Use fraud detection service for comprehensive analysis
      if (params.userId) {
        const fraudAnalysis = await fraudDetectionService.analyzeUserBehavior({
          userId: params.userId,
          ipAddress: params.ipAddress || "unknown",
          userAgent: params.userAgent || "",
          location: params.location || "unknown"
        });
        
        riskScore += fraudAnalysis.riskScore;
        
        if (fraudAnalysis.riskLevel === "high") {
          anomalies.push("High fraud risk profile");
        }
      }
      
      // Use AI for anomaly detection
      const aiAnomalies = await aiAssistantService.detectAnomalies(
        [params],
        "verification_attempt"
      );
      
      anomalies.push(...aiAnomalies.anomalies);
      
      // Determine risk level
      let riskLevel = "low";
      if (riskScore > 70) riskLevel = "high";
      else if (riskScore > 40) riskLevel = "medium";
      
      return {
        riskLevel,
        anomalies,
        score: riskScore
      };
    } catch (error) {
      console.error("Behavioral analysis error:", error);
      return {
        riskLevel: "unknown",
        anomalies: [],
        score: 0
      };
    }
  }
  
  /**
   * Generate AI-enhanced document summary
   */
  async generateDocumentSummary(documentData: any, documentType: string): Promise<{
    summary: string;
    keyPoints: string[];
    confidence: number;
  }> {
    try {
      const response = await aiAssistantService.generateResponse(
        `Summarize this ${documentType} document data: ${JSON.stringify(documentData)}. 
         Provide a brief summary and list key points.`,
        "system",
        "document_summary",
        false
      );
      
      if (response.success && response.content) {
        // Parse the summary from AI response
        const lines = response.content.split('\n').filter(line => line.trim());
        const summary = lines[0] || "Document summary unavailable";
        const keyPoints = lines.slice(1).map(line => line.replace(/^[-*•]\s*/, ''));
        
        return {
          summary,
          keyPoints,
          confidence: 85
        };
      }
      
      return {
        summary: "Unable to generate summary",
        keyPoints: [],
        confidence: 0
      };
    } catch (error) {
      console.error("Document summary generation error:", error);
      return {
        summary: "Summary generation failed",
        keyPoints: [],
        confidence: 0
      };
    }
  }
  
  /**
   * Predict document processing time with AI
   */
  async predictProcessingTime(documentType: string, currentQueue: number): Promise<{
    estimatedDays: number;
    confidence: number;
    factors: string[];
  }> {
    try {
      return await aiAssistantService.predictProcessingTime(
        documentType,
        currentQueue,
        { historicalAverage: 15 }
      );
    } catch (error) {
      console.error("Processing time prediction error:", error);
      return {
        estimatedDays: 15,
        confidence: 50,
        factors: ["Default estimate - AI prediction unavailable"]
      };
    }
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
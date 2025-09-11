import { storage } from "../storage";
import { InsertBiometricProfile } from "@shared/schema";
import CryptoJS from "crypto-js";

const BIOMETRIC_ENCRYPTION_KEY = process.env.BIOMETRIC_ENCRYPTION_KEY || "default-biometric-key-change-in-production";

export interface BiometricVerificationResult {
  success: boolean;
  confidence: number;
  type: string;
  userId?: string;
  error?: string;
}

export interface BiometricRegistrationData {
  userId: string;
  type: "face" | "fingerprint" | "voice" | "iris";
  template: string; // Base64 encoded biometric template
}

export class BiometricService {
  
  async registerBiometric(data: BiometricRegistrationData): Promise<{ success: boolean; error?: string }> {
    try {
      // Encrypt the biometric template
      const encryptedTemplate = this.encryptTemplate(data.template);
      
      // Calculate initial confidence score (would use actual biometric analysis)
      const confidence = this.calculateTemplateQuality(data.template);
      
      if (confidence < 70) {
        return {
          success: false,
          error: "Biometric template quality too low. Please try again with better lighting/positioning."
        };
      }
      
      // Check if user already has this biometric type registered
      const existingProfile = await storage.getBiometricProfile(data.userId, data.type);
      if (existingProfile) {
        return {
          success: false,
          error: `${data.type} biometric already registered for this user`
        };
      }
      
      const profile: InsertBiometricProfile = {
        userId: data.userId,
        type: data.type,
        templateData: encryptedTemplate,
        quality: confidence
      };
      
      await storage.createBiometricProfile(profile);
      
      // Log registration event
      await storage.createSecurityEvent({
        userId: data.userId,
        eventType: "biometric_registered",
        severity: "low",
        details: {
          biometricType: data.type,
          confidence
        }
      });
      
      return { success: true };
      
    } catch (error) {
      console.error("Biometric registration error:", error);
      return {
        success: false,
        error: "Failed to register biometric data"
      };
    }
  }
  
  async verifyBiometric(
    template: string, 
    type: "face" | "fingerprint" | "voice" | "iris",
    userId?: string
  ): Promise<BiometricVerificationResult> {
    try {
      // If userId is provided, verify against specific user
      if (userId) {
        return await this.verifyAgainstUser(template, type, userId);
      }
      
      // Otherwise, search all users (identification mode)
      return await this.identifyUser(template, type);
      
    } catch (error) {
      console.error("Biometric verification error:", error);
      return {
        success: false,
        confidence: 0,
        type,
        error: "Biometric verification failed"
      };
    }
  }
  
  private async verifyAgainstUser(
    template: string, 
    type: string, 
    userId: string
  ): Promise<BiometricVerificationResult> {
    const profile = await storage.getBiometricProfile(userId, type);
    
    if (!profile) {
      return {
        success: false,
        confidence: 0,
        type,
        error: "No biometric profile found for this user"
      };
    }
    
    const decryptedTemplate = this.decryptTemplate(profile.templateData);
    const matchScore = this.compareTemplates(template, decryptedTemplate, type);
    
    const success = matchScore >= 85; // Threshold for successful verification
    
    // Log verification attempt
    await storage.createSecurityEvent({
      userId,
      eventType: success ? "biometric_verification_success" : "biometric_verification_failed",
      severity: success ? "low" : "medium",
      details: {
        biometricType: type,
        matchScore,
        threshold: 85
      }
    });
    
    return {
      success,
      confidence: matchScore,
      type,
      userId: success ? userId : undefined
    };
  }
  
  private async identifyUser(
    template: string, 
    type: string
  ): Promise<BiometricVerificationResult> {
    // Get all profiles of this biometric type
    // Note: In production, this would be optimized with biometric indexing
    const allProfiles = await storage.getBiometricProfiles("");
    const profilesOfType = allProfiles.filter(p => p.type === type);
    
    let bestMatch = {
      score: 0,
      userId: ""
    };
    
    for (const profile of profilesOfType) {
      const decryptedTemplate = this.decryptTemplate(profile.templateData);
      const matchScore = this.compareTemplates(template, decryptedTemplate, type);
      
      if (matchScore > bestMatch.score) {
        bestMatch = {
          score: matchScore,
          userId: profile.userId
        };
      }
    }
    
    const success = bestMatch.score >= 90; // Higher threshold for identification
    
    if (success) {
      await storage.createSecurityEvent({
        userId: bestMatch.userId,
        eventType: "biometric_identification_success",
        severity: "low",
        details: {
          biometricType: type,
          matchScore: bestMatch.score
        }
      });
    }
    
    return {
      success,
      confidence: bestMatch.score,
      type,
      userId: success ? bestMatch.userId : undefined
    };
  }
  
  private encryptTemplate(template: string): string {
    return CryptoJS.AES.encrypt(template, BIOMETRIC_ENCRYPTION_KEY).toString();
  }
  
  private decryptTemplate(encryptedTemplate: string): string {
    const bytes = CryptoJS.AES.decrypt(encryptedTemplate, BIOMETRIC_ENCRYPTION_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  }
  
  private calculateTemplateQuality(template: string): number {
    // Simplified quality assessment
    // In production, this would use actual biometric quality algorithms
    
    if (!template || template.length < 100) {
      return 0;
    }
    
    // Check for data variance (simplified)
    const uniqueChars = new Set(template).size;
    const variance = uniqueChars / template.length;
    
    // Quality score based on length and variance
    let quality = Math.min(template.length / 1000, 1) * 50; // Length component
    quality += variance * 50; // Variance component
    
    return Math.round(quality);
  }
  
  private compareTemplates(template1: string, template2: string, type: string): number {
    // Simplified template matching
    // In production, this would use sophisticated biometric matching algorithms
    
    if (!template1 || !template2) {
      return 0;
    }
    
    // Calculate similarity based on string comparison (placeholder)
    let matches = 0;
    const minLength = Math.min(template1.length, template2.length);
    
    for (let i = 0; i < minLength; i++) {
      if (template1[i] === template2[i]) {
        matches++;
      }
    }
    
    let similarity = (matches / minLength) * 100;
    
    // Adjust for different biometric types
    switch (type) {
      case "face":
        similarity *= 0.95; // Face matching is generally less precise
        break;
      case "fingerprint":
        similarity *= 1.0; // Fingerprints are highly precise
        break;
      case "iris":
        similarity *= 1.05; // Iris is very precise
        break;
      case "voice":
        similarity *= 0.85; // Voice can vary with conditions
        break;
    }
    
    return Math.round(Math.min(similarity, 100));
  }
  
  async getUserBiometrics(userId: string) {
    const profiles = await storage.getBiometricProfiles(userId);
    
    return profiles.map(profile => ({
      id: profile.id,
      type: profile.type,
      confidence: profile.quality,
      isActive: profile.isActive,
      createdAt: profile.createdAt
    }));
  }
}

export const biometricService = new BiometricService();

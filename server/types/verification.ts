import { z } from 'zod';

export interface Location {
  country: string;
  city?: string;
  region?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface SecurityFeatures {
  brailleEncoded: boolean;
  holographicSeal: boolean;
  qrCodeValid: boolean;
  hashValid: boolean;
  biometricData: boolean;
  digitalSignature: boolean;
  antiTamperHash: boolean;
  mrzValid?: boolean;
  pkdCertificateValid?: boolean;
}

export interface CrossValidationResults {
  nprValidation?: {
    status: 'success' | 'failed';
    isValid: boolean;
    matchScore: number;
    responseTime: number;
  };
  icaoPkdValidation?: {
    status: 'success' | 'failed';
    isValid: boolean;
    certificateChain: boolean;
    responseTime: number;
  };
}

export interface FraudAssessment {
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  fraudIndicators: string[];
  behavioralAnomalies: string[];
  geoTemporalAnomalies: string[];
  suspiciousPatterns: string[];
  mlConfidenceScore?: number;
  recommendedActions: string[];
}

export interface VerificationResult {
  isValid: boolean;
  verificationId: string;
  documentType?: string;
  documentNumber?: string;
  issuedDate?: string;
  expiryDate?: string;
  holderName?: string;
  issueOffice?: string;
  issuingOfficer?: string;
  verificationCount: number;
  lastVerified?: Date;
  securityFeatures?: SecurityFeatures;
  confidenceLevel?: number;
  verificationScore?: number;
  fraudAssessment?: FraudAssessment;
  aiAuthenticityScore?: number;
  hashtags?: string[];
  message?: string;
  privacyLevel?: string;
  complianceFlags?: string[];
  verificationHistory?: Array<{
    timestamp: string;
    ipAddress?: string;
    location?: string;
    verificationMethod: string;
    isSuccessful: boolean;
  }>;
}

export interface BaseVerificationRequest {
  ipAddress?: string;
  userAgent?: string;
  location?: Location;
  deviceFingerprint?: string;
}

export interface ManualVerificationRequest extends BaseVerificationRequest {
  verificationCode: string;
  verificationMethod: 'manual_entry';
}

export interface QRVerificationRequest extends BaseVerificationRequest {
  qrData: string;
  verificationMethod: 'qr_scan';
}

export interface DocumentLookupRequest extends BaseVerificationRequest {
  documentNumber: string;
  documentType: string;
  includeHistory?: boolean;
  verificationMethod: 'document_lookup';
}

export interface APIVerificationRequest extends BaseVerificationRequest {
  apiKeyId: string;
  anonymize?: boolean;
  includeSecurityFeatures?: boolean;
  crossValidate?: boolean;
  verificationMethod: 'api';
}

export interface BatchVerificationRequest extends BaseVerificationRequest {
  batchId: string;
  documents: Array<{
    documentNumber: string;
    documentType: string;
  }>;
  verificationMethod: 'batch';
}

export type VerificationRequest = 
  | ManualVerificationRequest 
  | QRVerificationRequest 
  | DocumentLookupRequest 
  | APIVerificationRequest 
  | BatchVerificationRequest;

// Zod schemas for runtime validation
export const locationSchema = z.object({
  country: z.string(),
  city: z.string().optional(),
  region: z.string().optional(),
  coordinates: z.object({
    latitude: z.number(),
    longitude: z.number()
  }).optional()
});

export const baseVerificationRequestSchema = z.object({
  ipAddress: z.string().ip().optional(),
  userAgent: z.string().optional(),
  location: locationSchema.optional(),
  deviceFingerprint: z.string().optional()
});

export const manualVerificationRequestSchema = baseVerificationRequestSchema.extend({
  verificationCode: z.string().regex(/^[A-Z0-9]{6,32}$/),
  verificationMethod: z.literal('manual_entry')
});

export const qrVerificationRequestSchema = baseVerificationRequestSchema.extend({
  qrData: z.string(),
  verificationMethod: z.literal('qr_scan')
});

export const documentLookupRequestSchema = baseVerificationRequestSchema.extend({
  documentNumber: z.string(),
  documentType: z.string(),
  includeHistory: z.boolean().optional(),
  verificationMethod: z.literal('document_lookup')
});

export const apiVerificationRequestSchema = baseVerificationRequestSchema.extend({
  apiKeyId: z.string().uuid(),
  anonymize: z.boolean().optional(),
  includeSecurityFeatures: z.boolean().optional(),
  crossValidate: z.boolean().optional(),
  verificationMethod: z.literal('api')
});

export const batchVerificationRequestSchema = baseVerificationRequestSchema.extend({
  batchId: z.string().uuid(),
  documents: z.array(z.object({
    documentNumber: z.string(),
    documentType: z.string()
  })),
  verificationMethod: z.literal('batch')
});
import { z } from 'zod';

export interface DocumentVerificationRecord {
  id: string;
  verificationCode: string;
  documentId: string;
  documentType: string;
  documentNumber: string;
  isActive: boolean;
  isValid: boolean;
  issuedAt?: Date;
  expiryDate?: Date;
  lastVerifiedAt?: Date;
  verificationCount: number;
  revokedAt?: Date;
  revocationReason?: string;
  documentData: any; // Keep as any since document data structure varies
  qrCodeData?: string;
  qrCodeUrl?: string;
  issuingOffice?: string;
  issuingOfficer?: string;
  hashtags?: string[];
  securityFeatures?: Record<string, boolean>;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface DhaDocumentVerification extends DocumentVerificationRecord {
  verificationType: 'QR' | 'MANUAL' | 'API';
  expiresAt?: Date;
}

export interface VerificationHistoryEntry {
  id: string;
  verificationRecordId: string;
  createdAt: Date;
  ipAddress?: string;
  location?: Record<string, any>;
  userAgent?: string;
  verificationMethod?: string;
  isSuccessful: boolean;
  metadata?: Record<string, any>;
}

export interface ApiAccess {
  id: string;
  apiKeyId: string;
  isActive: boolean;
  hourlyQuota: number;
  currentHourlyUsage: number;
  lastResetAt: Date;
}

export interface SecurityEvent {
  id: string;
  userId?: string;
  eventType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: Record<string, any>;
  createdAt: Date;
}

export interface RealtimeVerificationSession {
  sessionId: string;
  createdAt: Date;
  expiresAt: Date;
  currentVerifications: number;
  maxVerifications: number;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

// Zod schemas for validation
export const documentVerificationRecordSchema = z.object({
  id: z.string().uuid(),
  verificationCode: z.string(),
  documentId: z.string(),
  documentType: z.string(),
  documentNumber: z.string(),
  isActive: z.boolean(),
  isValid: z.boolean(),
  issuedAt: z.date().optional(),
  expiryDate: z.date().optional(),
  lastVerifiedAt: z.date().optional(),
  verificationCount: z.number().int().min(0),
  revokedAt: z.date().optional(),
  revocationReason: z.string().optional(),
  documentData: z.any(),
  qrCodeData: z.string().optional(),
  qrCodeUrl: z.string().url().optional(),
  issuingOffice: z.string().optional(),
  issuingOfficer: z.string().optional(),
  hashtags: z.array(z.string()).optional(),
  securityFeatures: z.record(z.string(), z.boolean()).optional(),
  userId: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional()
});

export const verificationHistoryEntrySchema = z.object({
  id: z.string().uuid(),
  verificationRecordId: z.string().uuid(),
  createdAt: z.date(),
  ipAddress: z.string().ip().optional(),
  location: z.record(z.string(), z.any()).optional(),
  userAgent: z.string().optional(),
  verificationMethod: z.string().optional(),
  isSuccessful: z.boolean(),
  metadata: z.record(z.string(), z.any()).optional()
});

export const apiAccessSchema = z.object({
  id: z.string().uuid(),
  apiKeyId: z.string().uuid(),
  isActive: z.boolean(),
  hourlyQuota: z.number().int().positive(),
  currentHourlyUsage: z.number().int().min(0),
  lastResetAt: z.date()
});

export const securityEventSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().optional(),
  eventType: z.string(),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  details: z.record(z.string(), z.any()),
  createdAt: z.date()
});

export const realtimeVerificationSessionSchema = z.object({
  sessionId: z.string().uuid(),
  createdAt: z.date(),
  expiresAt: z.date(),
  currentVerifications: z.number().int().min(0),
  maxVerifications: z.number().int().positive(),
  ipAddress: z.string().ip().optional(),
  userAgent: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional()
});
import { z } from 'zod';

export interface FraudDetectionResponse {
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  indicators: string[];
  metadata?: Record<string, any>;
}

export interface UserBehaviorAnalysis {
  userId: string;
  ipAddress: string;
  userAgent: string;
  location: string;
}

export interface ThreatDetectionResult {
  threatLevel: 'none' | 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  patterns: string[];
  recommendations: string[];
}

export const fraudDetectionResponseSchema = z.object({
  riskScore: z.number().min(0).max(100),
  riskLevel: z.enum(['low', 'medium', 'high', 'critical']),
  indicators: z.array(z.string()),
  metadata: z.record(z.string(), z.any()).optional()
});

export const userBehaviorAnalysisSchema = z.object({
  userId: z.string(),
  ipAddress: z.string(),
  userAgent: z.string(),
  location: z.string()
});

export const threatDetectionResultSchema = z.object({
  threatLevel: z.enum(['none', 'low', 'medium', 'high', 'critical']),
  confidence: z.number().min(0).max(100),
  patterns: z.array(z.string()),
  recommendations: z.array(z.string())
});
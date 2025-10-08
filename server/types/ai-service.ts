import { z } from 'zod';

export interface AIServiceResponse<T = any> {
  success: boolean;
  content?: T;
  error?: string;
  metadata?: Record<string, any>;
}

export interface AIDocumentAnalysis {
  validationIssues?: string[];
  completeness?: number;
  suggestions?: string[];
  extractedFields?: Record<string, any>;
}

export interface AIAnomalyDetection {
  anomalies: string[];
  severity: 'low' | 'medium' | 'high';
  confidence: number;
}

export interface ProcessingTimePrediction {
  estimatedDays: number;
  confidence: number;
  factors: string[];
}

export const aiServiceResponseSchema = z.object({
  success: z.boolean(),
  content: z.any().optional(),
  error: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional()
});

export const aiDocumentAnalysisSchema = z.object({
  validationIssues: z.array(z.string()).optional(),
  completeness: z.number().min(0).max(100).optional(),
  suggestions: z.array(z.string()).optional(),
  extractedFields: z.record(z.string(), z.any()).optional()
});

export const aiAnomalyDetectionSchema = z.object({
  anomalies: z.array(z.string()),
  severity: z.enum(['low', 'medium', 'high']),
  confidence: z.number().min(0).max(100)
});

export const processingTimePredictionSchema = z.object({
  estimatedDays: z.number().positive(),
  confidence: z.number().min(0).max(100),
  factors: z.array(z.string())
});
import OpenAI from "openai";
import { storage } from "../storage";
import { monitoringService } from "./monitoring";
import { fraudDetectionService } from "./fraud-detection";
import { quantumEncryptionService } from "./quantum-encryption";
import { documentProcessorService } from "./document-processor";

// Using GPT-4 Turbo for advanced AI capabilities
const apiKey = (() => {
  if (process.env.OPENAI_API_KEY) {
    return process.env.OPENAI_API_KEY;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('CRITICAL SECURITY ERROR: OPENAI_API_KEY environment variable is required for AI assistant functionality in production');
  }
  return 'dev-openai-key';
})();

const openai = new OpenAI({ 
  apiKey
});

export interface AIAssistantContext {
  systemHealth?: any;
  securityMetrics?: any;
  biometricStatus?: any;
  quantumStatus?: any;
  recentAlerts?: any[];
  userDocuments?: any[];
}

export interface ChatResponse {
  success: boolean;
  content?: string;
  error?: string;
  metadata?: any;
  suggestions?: string[];
  language?: string;
  translatedContent?: string;
  documentAnalysis?: any;
  actionItems?: string[];
}

export class AIAssistantService {
  private supportedLanguages = ['en', 'zu', 'xh', 'af', 'st', 'tn', 'ts', 'ss', 've', 'nr', 'nso'];
  private documentRequirements = {
    passport: ['Birth certificate', 'ID document', 'Proof of address', 'Biometric data'],
    work_permit: ['Passport', 'Job offer letter', 'Medical certificate', 'Police clearance'],
    birth_certificate: ['Parents ID documents', 'Marriage certificate', 'Hospital records'],
    asylum: ['Passport or travel document', 'Supporting documentation', 'Biometric data'],
    residence_permit: ['Passport', 'Proof of financial means', 'Medical certificate', 'Police clearance']
  };

  async generateResponse(
    message: string, 
    userId: string, 
    conversationId: string,
    includeContext = true
  ): Promise<ChatResponse> {
    try {
      let context: AIAssistantContext = {};
      
      if (includeContext) {
        context = await this.gatherSystemContext(userId);
      }

      const systemPrompt = this.buildSystemPrompt(context);
      const conversationHistory = await this.getConversationHistory(conversationId);

      const messages = [
        { role: "system" as const, content: systemPrompt },
        ...conversationHistory,
        { role: "user" as const, content: message }
      ];

      const response = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages,
        max_tokens: 2000,
        temperature: 0.7,
        stream: false
      });

      const content = response.choices[0].message.content;

      if (!content) {
        return {
          success: false,
          error: "No response generated"
        };
      }

      // Log the interaction
      await storage.createSecurityEvent({
        userId,
        eventType: "ai_assistant_query",
        severity: "low",
        details: {
          conversationId,
          messageLength: message.length,
          responseLength: content.length,
          contextIncluded: includeContext
        }
      });

      // Extract suggestions and action items
      const suggestions = await this.extractSuggestions(content, message);
      const actionItems = await this.extractActionItems(content);
      
      return {
        success: true,
        content,
        suggestions,
        actionItems,
        metadata: {
          model: "gpt-4-turbo-preview",
          contextUsed: context,
          timestamp: new Date()
        }
      };

    } catch (error) {
      console.error("AI Assistant error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "AI service unavailable"
      };
    }
  }

  async streamResponse(
    message: string,
    userId: string,
    conversationId: string,
    onChunk: (chunk: string) => void,
    includeContext = true
  ): Promise<ChatResponse> {
    try {
      let context: AIAssistantContext = {};
      
      if (includeContext) {
        context = await this.gatherSystemContext(userId);
      }

      const systemPrompt = this.buildSystemPrompt(context);
      const conversationHistory = await this.getConversationHistory(conversationId);

      const messages = [
        { role: "system" as const, content: systemPrompt },
        ...conversationHistory,
        { role: "user" as const, content: message }
      ];

      const stream = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages,
        max_tokens: 2000,
        temperature: 0.7,
        stream: true
      });

      let fullContent = "";

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) {
          fullContent += delta;
          onChunk(delta);
        }
      }

      // Log the interaction
      await storage.createSecurityEvent({
        userId,
        eventType: "ai_assistant_stream",
        severity: "low",
        details: {
          conversationId,
          messageLength: message.length,
          responseLength: fullContent.length,
          contextIncluded: includeContext
        }
      });

      return {
        success: true,
        content: fullContent,
        metadata: {
          model: "gpt-4-turbo-preview",
          contextUsed: context,
          timestamp: new Date(),
          streamed: true
        }
      };

    } catch (error) {
      console.error("AI Assistant streaming error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "AI streaming service unavailable"
      };
    }
  }

  private async gatherSystemContext(userId: string): Promise<AIAssistantContext> {
    try {
      const [
        systemHealth,
        securityMetrics,
        quantumStatus,
        recentAlerts,
        userDocuments
      ] = await Promise.all([
        monitoringService.getSystemHealth(),
        monitoringService.getSecurityMetrics(),
        quantumEncryptionService.getSystemStatus(),
        storage.getFraudAlerts(userId, false),
        storage.getDocuments(userId)
      ]);

      // Generate biometric status from recent security events
      const recentEvents = await storage.getSecurityEvents(userId, 20);
      const biometricEvents = recentEvents.filter(event => 
        event.eventType.includes("biometric") || event.eventType.includes("authentication")
      );

      const biometricStatus = {
        recentAttempts: biometricEvents.length,
        successRate: biometricEvents.length > 0 ? 
          (biometricEvents.filter(e => e.severity === "low").length / biometricEvents.length) * 100 : 100,
        lastAuthentication: biometricEvents[0]?.createdAt || null
      };

      return {
        systemHealth,
        securityMetrics,
        biometricStatus,
        quantumStatus,
        recentAlerts: recentAlerts.slice(0, 5), // Last 5 alerts
        userDocuments: userDocuments.slice(0, 10).map(doc => ({
          id: doc.id,
          filename: doc.originalName,
          type: doc.mimeType,
          processingStatus: doc.processingStatus,
          isVerified: doc.isVerified,
          verificationScore: doc.verificationScore
        }))
      };

    } catch (error) {
      console.error("Error gathering system context:", error);
      return {};
    }
  }

  private buildSystemPrompt(context: AIAssistantContext): string {
    const now = new Date().toISOString();
    
    let prompt = `You are an AI Security Assistant for an enterprise security platform. Current time: ${now}

You have access to real-time system data and should provide accurate, actionable insights based on the current state.

## Your Capabilities:
- Analyze biometric authentication patterns and security metrics
- Review quantum encryption status and suggest optimizations  
- Investigate security alerts and fraud patterns
- Process and analyze uploaded documents
- Monitor system performance and health
- Provide security recommendations and threat analysis

## Current System Status:`;

    if (context.systemHealth) {
      prompt += `\n\n### System Health:
- CPU Usage: ${context.systemHealth.cpu}%
- Memory Usage: ${context.systemHealth.memory}%
- Network Usage: ${context.systemHealth.network}%
- Storage Usage: ${context.systemHealth.storage}%`;
    }

    if (context.securityMetrics) {
      prompt += `\n\n### Security Metrics (Last 24h):
- Threats Blocked: ${context.securityMetrics.threatsBlocked}
- Suspicious Activities: ${context.securityMetrics.suspiciousActivities}
- Detection Rate: ${context.securityMetrics.detectionRate}%
- False Positives: ${context.securityMetrics.falsePositives}`;
    }

    if (context.biometricStatus) {
      prompt += `\n\n### Biometric Authentication:
- Recent Attempts: ${context.biometricStatus.recentAttempts}
- Success Rate: ${context.biometricStatus.successRate.toFixed(1)}%
- Last Authentication: ${context.biometricStatus.lastAuthentication}`;
    }

    if (context.quantumStatus) {
      prompt += `\n\n### Quantum Security:
- Active Keys: ${context.quantumStatus.activeKeys}
- Algorithms: ${context.quantumStatus.algorithms?.join(", ") || "N/A"}
- Average Entropy: ${context.quantumStatus.averageEntropy?.toFixed(0) || "N/A"} bits
- Quantum Readiness: ${context.quantumStatus.quantumReadiness}
- Next Rotation: ${context.quantumStatus.nextRotation}`;
    }

    if (context.recentAlerts && context.recentAlerts.length > 0) {
      prompt += `\n\n### Recent Security Alerts:`;
      context.recentAlerts.forEach((alert, index) => {
        prompt += `\n${index + 1}. ${alert.alertType} (Risk: ${alert.riskScore}/100) - ${alert.createdAt}`;
      });
    }

    if (context.userDocuments && context.userDocuments.length > 0) {
      prompt += `\n\n### Recent Documents:`;
      context.userDocuments.forEach((doc, index) => {
        prompt += `\n${index + 1}. ${doc.filename} (${doc.type}) - Status: ${doc.processingStatus}`;
        if (doc.isVerified !== null) {
          prompt += `, Verified: ${doc.isVerified ? "Yes" : "No"}`;
        }
      });
    }

    prompt += `\n\n## Response Guidelines:
- Be concise but thorough in your analysis
- Provide specific, actionable recommendations
- Reference the actual data from the system status above
- Use technical language appropriate for security professionals
- If data shows potential issues, prioritize security concerns
- Format responses with clear structure using markdown
- Include specific metrics and values when relevant
- Suggest next steps or actions when appropriate

Answer the user's question based on the current system state and your security expertise.`;

    return prompt;
  }

  private async getConversationHistory(conversationId: string): Promise<Array<{role: "user" | "assistant", content: string}>> {
    try {
      const messages = await storage.getMessages(conversationId);
      
      // Get last 10 messages to keep context manageable
      return messages
        .slice(-10)
        .map(msg => ({
          role: msg.role as "user" | "assistant",
          content: msg.content
        }));
    } catch (error) {
      console.error("Error getting conversation history:", error);
      return [];
    }
  }

  async generateTitle(firstMessage: string): Promise<string> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "system",
            content: "Generate a concise, descriptive title (max 5 words) for a conversation that starts with the following message. Focus on the main topic or request. Respond only with the title, no quotes or extra text."
          },
          {
            role: "user",
            content: firstMessage
          }
        ],
        max_tokens: 20,
        temperature: 0.3
      });

      return response.choices[0].message.content?.trim() || "New Conversation";
    } catch (error) {
      console.error("Error generating title:", error);
      return "New Conversation";
    }
  }

  async translateMessage(
    message: string,
    targetLanguage: string,
    sourceLanguage = 'auto'
  ): Promise<{ success: boolean; translatedText?: string; detectedLanguage?: string; error?: string }> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "system",
            content: `You are a professional translator for the South African Department of Home Affairs. Translate the following text to ${targetLanguage}. If source language is 'auto', detect it first. Preserve any technical terms, document names, and official terminology. Respond in JSON format: {"translatedText": "...", "detectedLanguage": "..."}`
          },
          {
            role: "user",
            content: message
          }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      
      return {
        success: true,
        translatedText: result.translatedText,
        detectedLanguage: result.detectedLanguage
      };
    } catch (error) {
      console.error("Translation error:", error);
      return {
        success: false,
        error: "Translation service unavailable"
      };
    }
  }

  async analyzeDocument(
    documentContent: string,
    documentType: string
  ): Promise<{ 
    success: boolean; 
    extractedFields?: Record<string, any>; 
    validationIssues?: string[];
    completeness?: number;
    suggestions?: string[];
    error?: string 
  }> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "system",
            content: `You are an expert document analyzer for the South African Department of Home Affairs. Analyze the following ${documentType} document and extract key fields, validate information, check completeness, and provide suggestions. Respond in JSON format with: extractedFields, validationIssues (array), completeness (0-100), suggestions (array).`
          },
          {
            role: "user",
            content: documentContent
          }
        ],
        temperature: 0.2,
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      
      return {
        success: true,
        extractedFields: result.extractedFields || {},
        validationIssues: result.validationIssues || [],
        completeness: result.completeness || 0,
        suggestions: result.suggestions || []
      };
    } catch (error) {
      console.error("Document analysis error:", error);
      return {
        success: false,
        error: "Document analysis service unavailable"
      };
    }
  }

  async getDocumentRequirements(
    documentType: string,
    userContext?: any
  ): Promise<{ 
    success: boolean; 
    requirements?: string[]; 
    optionalDocuments?: string[];
    processingTime?: string;
    fees?: string;
    tips?: string[];
    error?: string 
  }> {
    try {
      const baseRequirements = this.documentRequirements[documentType as keyof typeof this.documentRequirements] || [];
      
      const response = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "system",
            content: `You are a DHA expert assistant. Based on the document type "${documentType}" and user context, provide comprehensive requirements including: required documents, optional documents, processing time, fees, and helpful tips. Consider South African regulations and current policies. Respond in JSON format.`
          },
          {
            role: "user",
            content: JSON.stringify({ documentType, userContext, baseRequirements })
          }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      
      return {
        success: true,
        requirements: result.requirements || baseRequirements,
        optionalDocuments: result.optionalDocuments || [],
        processingTime: result.processingTime || "15-20 working days",
        fees: result.fees || "Contact DHA for current fees",
        tips: result.tips || []
      };
    } catch (error) {
      console.error("Requirements fetch error:", error);
      return {
        success: false,
        requirements: this.documentRequirements[documentType as keyof typeof this.documentRequirements] || [],
        error: "Could not fetch detailed requirements"
      };
    }
  }

  async generateFormResponse(
    formType: string,
    userInput: string,
    formData?: any
  ): Promise<{ success: boolean; response?: string; filledFields?: Record<string, any>; error?: string }> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "system",
            content: `You are helping users fill out DHA forms. Based on the form type "${formType}" and user input, generate appropriate responses and suggest field values. Be accurate and follow South African government standards. Respond in JSON format with: response (helpful text), filledFields (object with form field suggestions).`
          },
          {
            role: "user",
            content: JSON.stringify({ userInput, existingData: formData })
          }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      
      return {
        success: true,
        response: result.response,
        filledFields: result.filledFields || {}
      };
    } catch (error) {
      console.error("Form response generation error:", error);
      return {
        success: false,
        error: "Form assistance unavailable"
      };
    }
  }

  private async extractSuggestions(content: string, userQuery: string): Promise<string[]> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "system",
            content: "Extract 2-3 relevant follow-up suggestions based on the conversation. Return as JSON array."
          },
          {
            role: "user",
            content: `User asked: ${userQuery}\nAssistant responded: ${content}\nGenerate follow-up suggestions: Return JSON with field 'suggestions' as array`
          }
        ],
        temperature: 0.5,
        max_tokens: 200,
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(response.choices[0].message.content || '{"suggestions": []}');
      return result.suggestions || [];
    } catch (error) {
      console.error("Suggestion extraction error:", error);
      return [];
    }
  }

  private async extractActionItems(content: string): Promise<string[]> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "system",
            content: "Extract actionable items from the response. Return as JSON with field 'actions' as array."
          },
          {
            role: "user",
            content: `Extract action items from: ${content}`
          }
        ],
        temperature: 0.3,
        max_tokens: 200,
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(response.choices[0].message.content || '{"actions": []}');
      return result.actions || [];
    } catch (error) {
      console.error("Action item extraction error:", error);
      return [];
    }
  }

  async predictProcessingTime(
    documentType: string,
    currentQueue: number,
    historicalData?: any
  ): Promise<{ estimatedDays: number; confidence: number; factors: string[] }> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "system",
            content: "Predict processing time based on document type, queue length, and historical patterns. Return JSON with estimatedDays (number), confidence (0-100), and factors (array of influencing factors)."
          },
          {
            role: "user",
            content: JSON.stringify({ documentType, currentQueue, historicalData })
          }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      return {
        estimatedDays: result.estimatedDays || 15,
        confidence: result.confidence || 70,
        factors: result.factors || []
      };
    } catch (error) {
      console.error("Processing time prediction error:", error);
      return { estimatedDays: 15, confidence: 50, factors: ['Unable to predict accurately'] };
    }
  }

  async detectAnomalies(
    data: any[],
    dataType: string
  ): Promise<{ anomalies: any[]; severity: string[]; recommendations: string[] }> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "system",
            content: `Analyze the provided ${dataType} data for anomalies, unusual patterns, or potential security issues. Return JSON with: anomalies (array of detected issues), severity (array matching anomalies: low/medium/high/critical), recommendations (array of actions).`
          },
          {
            role: "user",
            content: JSON.stringify(data)
          }
        ],
        temperature: 0.2,
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      return {
        anomalies: result.anomalies || [],
        severity: result.severity || [],
        recommendations: result.recommendations || []
      };
    } catch (error) {
      console.error("Anomaly detection error:", error);
      return { anomalies: [], severity: [], recommendations: [] };
    }
  }

  async analyzeSecurityData(data: any): Promise<{
    insights: string[];
    recommendations: string[];
    riskLevel: string;
  }> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "system",
            content: "You are a security analyst. Analyze the provided security data and return insights, recommendations, and risk level assessment. Respond with JSON in this format: { 'insights': string[], 'recommendations': string[], 'riskLevel': 'low'|'medium'|'high'|'critical' }"
          },
          {
            role: "user",
            content: `Analyze this security data: ${JSON.stringify(data)}`
          }
        ],
        response_format: { type: "json_object" },
        max_tokens: 1000
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      
      return {
        insights: result.insights || [],
        recommendations: result.recommendations || [],
        riskLevel: result.riskLevel || "low"
      };
    } catch (error) {
      console.error("Error analyzing security data:", error);
      return {
        insights: ["Analysis temporarily unavailable"],
        recommendations: ["Review data manually"],
        riskLevel: "low"
      };
    }
  }
}

// Export singleton instance
export const aiAssistantService = new AIAssistantService();

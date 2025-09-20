import { Anthropic } from "@anthropic-ai/sdk";
import { storage } from "../storage";
import { monitoringService } from "./monitoring";
import { fraudDetectionService } from "./fraud-detection";
import { quantumEncryptionService } from "./quantum-encryption";
import { documentProcessorService } from "./document-processor";
import { privacyProtectionService } from "./privacy-protection";
import { enhancedVoiceService } from "./enhanced-voice-service";
import { realTimeValidationService } from "./real-time-validation-service";
import { productionGovernmentApi } from "./production-government-api";
import { configService, config } from "../middleware/provider-config";

// SECURITY: Anthropic API key now managed by centralized configuration service
const apiKey = config.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY || '';

// Initialize Anthropic client
let anthropic: Anthropic | null = null;
if (apiKey) {
  anthropic = new Anthropic({ apiKey });
  console.log('[AI Assistant] Anthropic Claude client initialized successfully');
} else {
  console.warn('[AI Assistant] Anthropic API key not configured - AI features will be limited');
}
const isApiKeyConfigured = Boolean(apiKey && apiKey !== '' && apiKey.length > 0);

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
  voiceResponse?: {
    audioUrl?: string;
    duration?: number;
    language?: string;
  };
  realTimeValidation?: {
    isValid: boolean;
    validationErrors: string[];
    governmentVerification?: any;
  };
  formAutofill?: {
    extractedFields: Record<string, any>;
    confidence: number;
    suggestions: string[];
  };
  contextualHelp?: {
    relevantDocuments: string[];
    processingSteps: string[];
    estimatedTime: string;
    requiredDocuments: string[];
  };
  streamingEnabled?: boolean;
}

export class AIAssistantService {
  private getFallbackResponse(message: string, language?: string): string {
    const lowerMessage = message.toLowerCase();

    // Provide helpful responses based on common queries
    if (lowerMessage.includes('passport')) {
      return `For passport applications, you'll need:\n\n• Completed BI-9 form\n• Original South African ID document\n• Two recent passport photos\n• Birth certificate (for first-time applicants)\n\nProcessing time: 10-13 working days\nCost: R400 (standard) or R800 (urgent)\n\nYou can generate the application form using our Document Generation service.`;
    }

    if (lowerMessage.includes('birth certificate')) {
      return `For birth certificate applications:\n\n• Both parents' ID documents\n• Hospital notification of birth (if applicable)\n• Marriage certificate (if married)\n\nYou can generate a birth certificate using our Document Generation service. Click on "Official Documents" and select "Birth Certificate".`;
    }

    if (lowerMessage.includes('visa') || lowerMessage.includes('permit')) {
      return `For visa and permit applications:\n\n• Valid passport (6+ months)\n• Completed application form\n• Financial proof\n• Medical certificate\n• Police clearance\n\nProcessing varies by type. Visit your nearest DHA office or use our online services.`;
    }

    if (lowerMessage.includes('id') || lowerMessage.includes('identity')) {
      return `For ID document applications:\n\n• Completed BI-9 form\n• Birth certificate\n• Two recent ID photos\n• Proof of residence\n\nFirst ID is free. Replacements cost R140.\nProcessing: 5-8 working days for smart ID card.`;
    }

    // Default response
    return `Thank you for your query. While I'm operating in limited mode, I can help you with:\n\n• Document requirements and procedures\n• Application forms and generation\n• DHA office locations and contacts\n• General immigration guidance\n\nFor immediate assistance, call DHA: 0800 60 11 90\n\nYou can also use our Document Generation service to create official forms.`;
  }

  private getRelevantDocumentsForQuery(message: string): string[] {
    const lowerMessage = message.toLowerCase();
    const docs: string[] = [];

    if (lowerMessage.includes('passport')) docs.push('BI-9 Form', 'Passport Application Guide');
    if (lowerMessage.includes('birth')) docs.push('BI-24 Form', 'Birth Registration Guide');
    if (lowerMessage.includes('marriage')) docs.push('BI-27 Form', 'Marriage Certificate Guide');
    if (lowerMessage.includes('visa')) docs.push('DHA-84 Form', 'Visa Application Guide');
    if (lowerMessage.includes('permit')) docs.push('DHA-1738 Form', 'Permit Application Guide');
    if (lowerMessage.includes('id')) docs.push('BI-9 Form', 'ID Application Guide');

    return docs.length > 0 ? docs : ['General DHA Services Guide'];
  }

  private supportedLanguages = {
    'en': { name: 'English', nativeName: 'English', tts: true, stt: true, active: true },
    'af': { name: 'Afrikaans', nativeName: 'Afrikaans', tts: true, stt: true, active: true },
    'zu': { name: 'isiZulu', nativeName: 'isiZulu', tts: true, stt: true, active: true },
    'xh': { name: 'isiXhosa', nativeName: 'isiXhosa', tts: true, stt: true, active: true },
    'st': { name: 'Sesotho', nativeName: 'Sesotho', tts: true, stt: true, active: true },
    'tn': { name: 'Setswana', nativeName: 'Setswana', tts: true, stt: true, active: true },
    've': { name: 'Tshivenda', nativeName: 'Tshivenda', tts: false, stt: true, active: true },
    'ts': { name: 'Xitsonga', nativeName: 'Xitsonga', tts: false, stt: true, active: true },
    'ss': { name: 'siSwati', nativeName: 'siSwati', tts: false, stt: true, active: true },
    'nr': { name: 'isiNdebele', nativeName: 'isiNdebele', tts: false, stt: false, active: false },
    'nso': { name: 'Sepedi', nativeName: 'Sepedi (Northern Sotho)', tts: false, stt: true, active: true }
  };

  async generateResponse(
    message: string, 
    userId: string, 
    conversationId: string,
    includeContext = true,
    options: {
      language?: string;
      documentContext?: any;
      enablePIIRedaction?: boolean;
    } = {}
  ): Promise<ChatResponse> {
    try {
      // Check if Anthropic API is configured
      if (!isApiKeyConfigured || !anthropic) {
        // Return helpful fallback response when API key is not configured
        return {
          success: true,
          content: this.getFallbackResponse(message, options.language),
          metadata: {
            mode: 'limited',
            reason: 'AI service not configured'
          },
          suggestions: [
            'View document requirements',
            'Generate official documents', 
            'Check application status',
            'Find DHA office locations'
          ],
          contextualHelp: {
            relevantDocuments: this.getRelevantDocumentsForQuery(message),
            processingSteps: [],
            estimatedTime: 'N/A',
            requiredDocuments: []
          }
        };
      }

      const enablePIIRedaction = options.enablePIIRedaction !== false;

      // CRITICAL SECURITY: Redact PII from user message before sending to Claude
      let processedMessage = message;
      let piiDetected = false;
      if (enablePIIRedaction) {
        const redactionResult = privacyProtectionService.redactPIIForAI(message, true);
        processedMessage = redactionResult.redactedContent;
        piiDetected = redactionResult.piiDetected;

        if (piiDetected) {
          await storage.createSecurityEvent({
            userId,
            eventType: "pii_detected_in_ai_query",
            severity: "medium",
            details: {
              conversationId,
              piiRedacted: true,
              originalMessageLength: message.length,
              redactedMessageLength: processedMessage.length
            }
          });
        }
      }

      let context: AIAssistantContext = {};

      if (includeContext) {
        context = await this.gatherSystemContext(userId);
        if (enablePIIRedaction) {
          context = privacyProtectionService.sanitizeSystemContextForAI(context);
        }
      }

      const systemPrompt = this.buildSystemPrompt(context, options.language);
      const conversationHistory = await this.getConversationHistory(conversationId);

      // CRITICAL SECURITY: Sanitize conversation history
      let sanitizedHistory: Array<{role: "user" | "assistant", content: string}> = conversationHistory;
      if (enablePIIRedaction) {
        sanitizedHistory = privacyProtectionService.sanitizeConversationHistoryForAI(conversationHistory) as Array<{role: "user" | "assistant", content: string}>;
      }

      // Convert conversation history to Claude format
      const messages = [
        ...sanitizedHistory.map(msg => ({
          role: msg.role as "user" | "assistant",
          content: msg.content
        })),
        { role: "user" as const, content: processedMessage }
      ];

      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022", // Latest Claude 3.5 Sonnet model
        max_tokens: 2000,
        temperature: 0.7,
        system: systemPrompt,
        messages
      });

      const content = response.content[0]?.type === 'text' ? response.content[0].text : '';

      if (!content) {
        return {
          success: false,
          error: "No response generated"
        };
      }

      // Log the interaction with security details
      await storage.createSecurityEvent({
        userId,
        eventType: "ai_assistant_query",
        severity: "low",
        details: {
          conversationId,
          messageLength: message.length,
          processedMessageLength: processedMessage.length,
          responseLength: content.length,
          contextIncluded: includeContext,
          piiRedactionEnabled: enablePIIRedaction,
          piiDetected,
          language: options.language || 'en'
        }
      });

      // Extract suggestions and action items
      const suggestions = await this.extractSuggestions(content, processedMessage);
      const actionItems = await this.extractActionItems(content);

      return {
        success: true,
        content,
        suggestions,
        actionItems,
        language: options.language,
        metadata: {
          model: "claude-3-5-sonnet-20241022",
          contextUsed: context,
          timestamp: new Date(),
          piiRedactionApplied: enablePIIRedaction,
          piiDetected
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
    includeContext = true,
    options: {
      language?: string;
      documentContext?: any;
      enablePIIRedaction?: boolean;
    } = {}
  ): Promise<ChatResponse> {
    try {
      // Check if Anthropic API is configured
      if (!isApiKeyConfigured || !anthropic) {
        // Stream fallback response when API key is not configured
        const fallbackResponse = this.getFallbackResponse(message, options.language);
        const chunks = fallbackResponse.split(' ');
        for (const chunk of chunks) {
          onChunk(chunk + ' ');
          await new Promise(resolve => setTimeout(resolve, 50)); // Simulate streaming
        }
        return {
          success: true,
          content: fallbackResponse,
          metadata: {
            mode: 'limited',
            reason: 'AI service not configured',
            streamed: true
          },
          suggestions: [
            'View document requirements',
            'Generate official documents',
            'Check application status',
            'Find DHA office locations'
          ],
          streamingEnabled: true
        };
      }

      const enablePIIRedaction = options.enablePIIRedaction !== false;

      // CRITICAL SECURITY: Redact PII from user message before sending to Claude
      let processedMessage = message;
      let piiDetected = false;
      if (enablePIIRedaction) {
        const redactionResult = privacyProtectionService.redactPIIForAI(message, true);
        processedMessage = redactionResult.redactedContent;
        piiDetected = redactionResult.piiDetected;

        if (piiDetected) {
          await storage.createSecurityEvent({
            userId,
            eventType: "pii_detected_in_ai_stream",
            severity: "medium",
            details: {
              conversationId,
              piiRedacted: true,
              originalMessageLength: message.length,
              redactedMessageLength: processedMessage.length
            }
          });
        }
      }

      let context: AIAssistantContext = {};

      if (includeContext) {
        context = await this.gatherSystemContext(userId);
        if (enablePIIRedaction) {
          context = privacyProtectionService.sanitizeSystemContextForAI(context);
        }
      }

      const systemPrompt = this.buildSystemPrompt(context, options.language);
      const conversationHistory = await this.getConversationHistory(conversationId);

      // CRITICAL SECURITY: Sanitize conversation history
      let sanitizedHistory: Array<{role: "user" | "assistant", content: string}> = conversationHistory;
      if (enablePIIRedaction) {
        sanitizedHistory = privacyProtectionService.sanitizeConversationHistoryForAI(conversationHistory) as Array<{role: "user" | "assistant", content: string}>;
      }

      // Convert conversation history to Claude format
      const messages = [
        ...sanitizedHistory.map(msg => ({
          role: msg.role as "user" | "assistant",
          content: msg.content
        })),
        { role: "user" as const, content: processedMessage }
      ];

      const stream = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 2000,
        temperature: 0.7,
        system: systemPrompt,
        messages,
        stream: true
      });

      let fullContent = "";

      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          const delta = chunk.delta.text;
          fullContent += delta;
          onChunk(delta);
        }
      }

      // Log the interaction with security details
      await storage.createSecurityEvent({
        userId,
        eventType: "ai_assistant_stream",
        severity: "low",
        details: {
          conversationId,
          messageLength: message.length,
          processedMessageLength: processedMessage.length,
          responseLength: fullContent.length,
          contextIncluded: includeContext,
          piiRedactionEnabled: enablePIIRedaction,
          piiDetected,
          language: options.language || 'en'
        }
      });

      return {
        success: true,
        content: fullContent,
        language: options.language,
        metadata: {
          model: "claude-3-5-sonnet-20241022",
          contextUsed: context,
          timestamp: new Date(),
          streamed: true,
          piiRedactionApplied: enablePIIRedaction,
          piiDetected
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
        recentAlerts: recentAlerts.slice(0, 5),
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

  private buildSystemPrompt(context: AIAssistantContext, language: string = 'en'): string {
    const now = new Date().toISOString();

    const languageInstructions = this.getLanguageInstructions(language);

    let prompt = `You are Claude, an AI Assistant for the South African Department of Home Affairs (DHA) Digital Services. Current time: ${now}

${languageInstructions}

## Your Role:
- Assist with DHA document applications and requirements
- Provide guidance on all 21 DHA document types  
- Help with form completion and document processing
- Support all 11 official South African languages
- Ensure POPIA compliance and data protection

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

Answer the user's question based on the current system state and your expertise.`;

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
      if (!anthropic) {
        return "New Conversation";
      }

      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 20,
        temperature: 0.3,
        system: "Generate a concise, descriptive title (max 5 words) for a conversation that starts with the following message. Focus on the main topic or request. Respond only with the title, no quotes or extra text.",
        messages: [
          {
            role: "user",
            content: firstMessage
          }
        ]
      });

      const content = response.content[0]?.type === 'text' ? response.content[0].text : '';
      return content?.trim() || "New Conversation";
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
      if (!anthropic) {
        return {
          success: false,
          error: "Translation service not available"
        };
      }

      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1000,
        temperature: 0.3,
        system: `You are a professional translator for the South African Department of Home Affairs. Translate the following text to ${targetLanguage}. If source language is 'auto', detect it first. Preserve any technical terms, document names, and official terminology. Respond in JSON format: {"translatedText": "...", "detectedLanguage": "..."}`,
        messages: [
          {
            role: "user",
            content: message
          }
        ]
      });

      const content = response.content[0]?.type === 'text' ? response.content[0].text : '';
      const result = JSON.parse(content || '{}');

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
      if (!anthropic) {
        return {
          success: false,
          error: "Document analysis service not available"
        };
      }

      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1500,
        temperature: 0.2,
        system: `You are an expert document analyzer for the South African Department of Home Affairs. Analyze the following ${documentType} document and extract key fields, validate information, check completeness, and provide suggestions. Respond in JSON format with: extractedFields, validationIssues (array), completeness (0-100), suggestions (array).`,
        messages: [
          {
            role: "user",
            content: documentContent
          }
        ]
      });

      const content = response.content[0]?.type === 'text' ? response.content[0].text : '';
      const result = JSON.parse(content || '{}');

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

  async generateFormResponse(
    formType: string,
    userInput: string,
    formData?: any
  ): Promise<{ success: boolean; response?: string; filledFields?: Record<string, any>; error?: string }> {
    try {
      if (!anthropic) {
        return {
          success: false,
          error: "Form assistance service not available"
        };
      }

      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1000,
        temperature: 0.3,
        system: `You are helping users fill out DHA forms. Based on the form type "${formType}" and user input, generate appropriate responses and suggest field values. Be accurate and follow South African government standards. Respond in JSON format with: response (helpful text), filledFields (object with form field suggestions).`,
        messages: [
          {
            role: "user",
            content: JSON.stringify({ userInput, existingData: formData })
          }
        ]
      });

      const content = response.content[0]?.type === 'text' ? response.content[0].text : '';
      const result = JSON.parse(content || '{}');

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
      if (!anthropic) {
        return [
          "View document requirements",
          "Generate official documents",
          "Check application status"
        ];
      }

      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 200,
        temperature: 0.5,
        system: "Extract 2-3 relevant follow-up suggestions based on the conversation. Return as JSON array.",
        messages: [
          {
            role: "user",
            content: `User asked: ${userQuery}\nAssistant responded: ${content}\nGenerate follow-up suggestions: Return JSON with field 'suggestions' as array`
          }
        ]
      });

      const responseContent = response.content[0]?.type === 'text' ? response.content[0].text : '';
      const result = JSON.parse(responseContent || '{"suggestions": []}');
      return result.suggestions || [];
    } catch (error) {
      console.error("Suggestion extraction error:", error);
      return [];
    }
  }

  private async extractActionItems(content: string): Promise<string[]> {
    try {
      if (!anthropic) {
        return [];
      }

      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 200,
        temperature: 0.3,
        system: "Extract actionable items from the response. Return as JSON with field 'actions' as array.",
        messages: [
          {
            role: "user",
            content: `Extract action items from: ${content}`
          }
        ]
      });

      const responseContent = response.content[0]?.type === 'text' ? response.content[0].text : '';
      const result = JSON.parse(responseContent || '{"actions": []}');
      return result.actions || [];
    } catch (error) {
      console.error("Action item extraction error:", error);
      return [];
    }
  }

  private getLanguageInstructions(language: string): string {
    const languageMap: Record<string, string> = {
      'en': 'Respond in English.',
      'af': 'Reageer in Afrikaans.',
      'zu': 'Phendula ngesiZulu.',
      'xh': 'Phendula ngesiXhosa.',
      'st': 'Araba ka Sesotho.',
      'tn': 'Araba ka Setswana.',
      've': 'Araba nga Tshivenda.',
      'ts': 'Hlamula hi Xitsonga.',
      'ss': 'Phendvula nge-siSwati.',
      'nr': 'Phendula ngesiNdebele.',
      'nso': 'Araba ka Sepedi.'
    };

    return languageMap[language] || languageMap['en'];
  }

  async detectAnomalies(
    data: any[],
    dataType: string
  ): Promise<{ anomalies: any[]; severity: string[]; recommendations: string[] }> {
    try {
      if (!anthropic) {
        return {
          anomalies: [],
          severity: [],
          recommendations: ['Anomaly detection service not available']
        };
      }

      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1000,
        temperature: 0.2,
        system: `Analyze the provided ${dataType} data for anomalies, unusual patterns, or potential security issues. Return JSON with: anomalies (array of detected issues), severity (array matching anomalies: low/medium/high/critical), recommendations (array of actions).`,
        messages: [
          {
            role: "user",
            content: JSON.stringify(data)
          }
        ]
      });

      const content = response.content[0]?.type === 'text' ? response.content[0].text : '';
      const result = JSON.parse(content || '{}');
      return {
        anomalies: result.anomalies || [],
        severity: result.severity || [],
        recommendations: result.recommendations || []
      };
    } catch (error) {
      console.error("Anomaly detection error:", error);
      return { anomalies: [], severity: [], recommendations: ['Analysis error'] };
    }
  }

  async analyzeSecurityData(data: any): Promise<{
    insights: string[];
    recommendations: string[];
    riskLevel: string;
  }> {
    try {
      if (!anthropic) {
        return {
          insights: ['Security analysis service not available'],
          recommendations: ['Review data manually', 'Enable AI services for enhanced analysis'],
          riskLevel: 'low'
        };
      }

      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1000,
        temperature: 0.3,
        system: "You are a security analyst. Analyze the provided security data and return insights, recommendations, and risk level assessment. Respond with JSON in this format: { 'insights': string[], 'recommendations': string[], 'riskLevel': 'low'|'medium'|'high'|'critical' }",
        messages: [
          {
            role: "user",
            content: `Analyze this security data: ${JSON.stringify(data)}`
          }
        ]
      });

      const content = response.content[0]?.type === 'text' ? response.content[0].text : '';
      const result = JSON.parse(content || '{}');

      return {
        insights: result.insights || ['Unable to analyze data'],
        recommendations: result.recommendations || ['Manual review required'],
        riskLevel: result.riskLevel || 'unknown'
      };

    } catch (error) {
      console.error('Security analysis error:', error);
      return {
        insights: ['Analysis error occurred'],
        recommendations: ['Manual security review required'],
        riskLevel: 'medium'
      };
    }
  }
}

// Export singleton instance
export const aiAssistantService = new AIAssistantService();
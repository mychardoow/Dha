import OpenAI from "openai";
import { storage } from "../storage";
import { monitoringService } from "./monitoring";
import { fraudDetectionService } from "./fraud-detection";
import { quantumEncryptionService } from "./quantum-encryption";
import { documentProcessorService } from "./document-processor";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
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
}

export class AIAssistantService {

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
        model: "gpt-5",
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

      return {
        success: true,
        content,
        metadata: {
          model: "gpt-5",
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
        model: "gpt-5",
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
          model: "gpt-5",
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
        model: "gpt-5",
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

  async analyzeSecurityData(data: any): Promise<{
    insights: string[];
    recommendations: string[];
    riskLevel: "low" | "medium" | "high" | "critical";
  }> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-5",
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

export const aiAssistantService = new AIAssistantService();

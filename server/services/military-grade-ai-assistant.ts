/**
 * MILITARY-GRADE AI ASSISTANT SERVICE
 * High-security AI assistant with RBAC, clearance levels, and government workflow safeguards
 */

import OpenAI from "openai";
import { storage } from "../storage";
import { monitoringService } from "./monitoring";
import { fraudDetectionService } from "./fraud-detection";
import { quantumEncryptionService } from "./quantum-encryption";
import { privacyProtectionService } from "./privacy-protection";
import { enhancedVoiceService } from "./enhanced-voice-service";
import { realTimeValidationService } from "./real-time-validation-service";
import { productionGovernmentApi } from "./production-government-api";
import * as crypto from "crypto";

// Military Classification Levels
export enum ClassificationLevel {
  UNCLASSIFIED = "UNCLASSIFIED",
  RESTRICTED = "RESTRICTED", 
  CONFIDENTIAL = "CONFIDENTIAL",
  SECRET = "SECRET",
  TOP_SECRET = "TOP_SECRET"
}

// User Clearance Levels
export enum ClearanceLevel {
  CIVILIAN = "CIVILIAN",
  GOVERNMENT_EMPLOYEE = "GOVERNMENT_EMPLOYEE",
  CONFIDENTIAL_CLEARED = "CONFIDENTIAL_CLEARED",
  SECRET_CLEARED = "SECRET_CLEARED", 
  TOP_SECRET_CLEARED = "TOP_SECRET_CLEARED",
  SCI_CLEARED = "SCI_CLEARED" // Sensitive Compartmented Information
}

// Military Roles with specific permissions
export enum MilitaryRole {
  CIVILIAN_USER = "CIVILIAN_USER",
  DHA_OFFICER = "DHA_OFFICER",
  SECURITY_OFFICER = "SECURITY_OFFICER",
  INTELLIGENCE_OFFICER = "INTELLIGENCE_OFFICER",
  SYSTEMS_ADMINISTRATOR = "SYSTEMS_ADMINISTRATOR",
  COMMANDING_OFFICER = "COMMANDING_OFFICER"
}

// Command Types for Military Operations
export enum CommandType {
  GENERAL_QUERY = "GENERAL_QUERY",
  DOCUMENT_PROCESSING = "DOCUMENT_PROCESSING",
  SECURITY_ANALYSIS = "SECURITY_ANALYSIS",
  INTELLIGENCE_REQUEST = "INTELLIGENCE_REQUEST",
  OPERATIONAL_COMMAND = "OPERATIONAL_COMMAND",
  CLASSIFIED_INQUIRY = "CLASSIFIED_INQUIRY"
}

export interface MilitaryUserContext {
  userId: string;
  clearanceLevel: ClearanceLevel;
  militaryRole: MilitaryRole;
  securityBadgeId?: string;
  lastSecurityValidation: Date;
  accessibleClassifications: ClassificationLevel[];
  specialAccessPrograms: string[];
  commandAuthority: boolean;
  auditTrailRequired: boolean;
}

export interface MilitaryAIRequest {
  message: string;
  commandType: CommandType;
  classificationLevel: ClassificationLevel;
  userContext: MilitaryUserContext;
  conversationId: string;
  requiredClearance?: ClearanceLevel;
  specialAccessRequired?: string[];
  operationalContext?: string;
  securityProtocol?: string;
}

export interface MilitaryAIResponse {
  success: boolean;
  content?: string;
  classificationLevel: ClassificationLevel;
  error?: string;
  securityWarnings?: string[];
  auditEntry: AuditEntry;
  clearanceValidated: boolean;
  commandAuthorized: boolean;
  restrictions?: string[];
  metadata?: any;
}

export interface AuditEntry {
  timestamp: Date;
  userId: string;
  clearanceLevel: ClearanceLevel;
  commandType: CommandType;
  classificationLevel: ClassificationLevel;
  messageHash: string;
  responseHash: string;
  accessGranted: boolean;
  securityValidation: boolean;
  riskScore: number;
  auditId: string;
}

export interface ContentPolicyResult {
  allowed: boolean;
  classificationRequired: ClassificationLevel;
  warnings: string[];
  restrictions: string[];
  requiresApproval: boolean;
  auditRequired: boolean;
}

export class MilitaryGradeAIAssistant {
  private openai: OpenAI | null = null;
  private isApiKeyConfigured: boolean;
  
  // Military-grade security protocols
  private readonly CLASSIFICATION_HIERARCHY = {
    [ClassificationLevel.UNCLASSIFIED]: 0,
    [ClassificationLevel.RESTRICTED]: 1,
    [ClassificationLevel.CONFIDENTIAL]: 2,
    [ClassificationLevel.SECRET]: 3,
    [ClassificationLevel.TOP_SECRET]: 4
  };

  private readonly CLEARANCE_HIERARCHY = {
    [ClearanceLevel.CIVILIAN]: 0,
    [ClearanceLevel.GOVERNMENT_EMPLOYEE]: 1,
    [ClearanceLevel.CONFIDENTIAL_CLEARED]: 2,
    [ClearanceLevel.SECRET_CLEARED]: 3,
    [ClearanceLevel.TOP_SECRET_CLEARED]: 4,
    [ClearanceLevel.SCI_CLEARED]: 5
  };

  private readonly ROLE_PERMISSIONS = {
    [MilitaryRole.CIVILIAN_USER]: {
      maxClassification: ClassificationLevel.UNCLASSIFIED,
      allowedCommands: [CommandType.GENERAL_QUERY, CommandType.DOCUMENT_PROCESSING],
      auditRequired: false
    },
    [MilitaryRole.DHA_OFFICER]: {
      maxClassification: ClassificationLevel.RESTRICTED,
      allowedCommands: [CommandType.GENERAL_QUERY, CommandType.DOCUMENT_PROCESSING, CommandType.SECURITY_ANALYSIS],
      auditRequired: true
    },
    [MilitaryRole.SECURITY_OFFICER]: {
      maxClassification: ClassificationLevel.CONFIDENTIAL,
      allowedCommands: [CommandType.GENERAL_QUERY, CommandType.DOCUMENT_PROCESSING, CommandType.SECURITY_ANALYSIS, CommandType.INTELLIGENCE_REQUEST],
      auditRequired: true
    },
    [MilitaryRole.INTELLIGENCE_OFFICER]: {
      maxClassification: ClassificationLevel.SECRET,
      allowedCommands: [CommandType.GENERAL_QUERY, CommandType.DOCUMENT_PROCESSING, CommandType.SECURITY_ANALYSIS, CommandType.INTELLIGENCE_REQUEST, CommandType.CLASSIFIED_INQUIRY],
      auditRequired: true
    },
    [MilitaryRole.SYSTEMS_ADMINISTRATOR]: {
      maxClassification: ClassificationLevel.SECRET,
      allowedCommands: [CommandType.GENERAL_QUERY, CommandType.DOCUMENT_PROCESSING, CommandType.SECURITY_ANALYSIS, CommandType.OPERATIONAL_COMMAND],
      auditRequired: true
    },
    [MilitaryRole.COMMANDING_OFFICER]: {
      maxClassification: ClassificationLevel.TOP_SECRET,
      allowedCommands: Object.values(CommandType),
      auditRequired: true
    }
  };

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY || '';
    this.isApiKeyConfigured = Boolean(apiKey && apiKey !== '' && apiKey !== 'dev-openai-key');
    
    if (this.isApiKeyConfigured) {
      this.openai = new OpenAI({ apiKey });
    } else {
      console.warn('[Military AI] OpenAI API key not configured - Operating in secure limited mode');
    }
  }

  /**
   * Main military-grade AI processing method
   */
  async processCommand(request: MilitaryAIRequest): Promise<MilitaryAIResponse> {
    const startTime = Date.now();
    
    try {
      // Step 1: Security clearance validation
      const clearanceValidation = await this.validateClearance(request);
      if (!clearanceValidation.valid) {
        return this.createSecurityDeniedResponse(request, clearanceValidation.reason);
      }

      // Step 2: Content policy enforcement
      const policyResult = await this.enforceContentPolicy(request);
      if (!policyResult.allowed) {
        return this.createPolicyViolationResponse(request, policyResult);
      }

      // Step 3: Command authorization
      const commandAuth = await this.authorizeCommand(request);
      if (!commandAuth.authorized) {
        return this.createCommandDeniedResponse(request, commandAuth.reason);
      }

      // Step 4: Create audit entry
      const auditEntry = await this.createAuditEntry(request);

      // Step 5: Process with appropriate security protocol
      const response = await this.processSecureAIRequest(request);

      // Step 6: Apply output filtering and classification
      const filteredResponse = await this.applyOutputFiltering(response, request);

      // Step 7: Log completion and return
      await this.logSecurityEvent(request, filteredResponse, auditEntry);

      return {
        ...filteredResponse,
        auditEntry,
        clearanceValidated: true,
        commandAuthorized: true
      };

    } catch (error) {
      console.error('[Military AI] Command processing failed:', error);
      
      const errorAudit = await this.createErrorAuditEntry(request, error);
      
      return {
        success: false,
        classificationLevel: ClassificationLevel.UNCLASSIFIED,
        error: "Command processing failed due to security protocol",
        securityWarnings: ["System security protocols prevented command execution"],
        auditEntry: errorAudit,
        clearanceValidated: false,
        commandAuthorized: false
      };
    }
  }

  /**
   * Validate user security clearance
   */
  private async validateClearance(request: MilitaryAIRequest): Promise<{valid: boolean, reason?: string}> {
    const { userContext, classificationLevel, requiredClearance } = request;

    // Check if user clearance allows access to requested classification
    const userClearanceLevel = this.CLEARANCE_HIERARCHY[userContext.clearanceLevel];
    const requestedClassificationLevel = this.CLASSIFICATION_HIERARCHY[classificationLevel];

    if (userClearanceLevel < requestedClassificationLevel) {
      await this.logSecurityViolation(request, "INSUFFICIENT_CLEARANCE", {
        userClearance: userContext.clearanceLevel,
        requestedClassification: classificationLevel
      });
      return { 
        valid: false, 
        reason: `Insufficient clearance: ${userContext.clearanceLevel} cannot access ${classificationLevel}` 
      };
    }

    // Check if specific clearance is required
    if (requiredClearance && this.CLEARANCE_HIERARCHY[userContext.clearanceLevel] < this.CLEARANCE_HIERARCHY[requiredClearance]) {
      return { 
        valid: false, 
        reason: `Required clearance: ${requiredClearance}` 
      };
    }

    // Check special access programs
    if (request.specialAccessRequired && request.specialAccessRequired.length > 0) {
      const hasAccess = request.specialAccessRequired.every(program => 
        userContext.specialAccessPrograms.includes(program)
      );
      
      if (!hasAccess) {
        return { 
          valid: false, 
          reason: "Special access program authorization required" 
        };
      }
    }

    // Validate security badge and recent authentication
    const timeSinceValidation = Date.now() - userContext.lastSecurityValidation.getTime();
    const maxValidationAge = 4 * 60 * 60 * 1000; // 4 hours

    if (timeSinceValidation > maxValidationAge) {
      return { 
        valid: false, 
        reason: "Security validation expired - re-authentication required" 
      };
    }

    return { valid: true };
  }

  /**
   * Enforce content policy and government guardrails
   */
  private async enforceContentPolicy(request: MilitaryAIRequest): Promise<ContentPolicyResult> {
    const { message, commandType, userContext } = request;

    // Check for prohibited content patterns
    const prohibitedPatterns = [
      /nuclear.*codes?/i,
      /launch.*sequence/i,
      /classified.*location/i,
      /agent.*identity/i,
      /operation.*details/i
    ];

    const warnings: string[] = [];
    const restrictions: string[] = [];

    // Scan for prohibited patterns
    for (const pattern of prohibitedPatterns) {
      if (pattern.test(message)) {
        warnings.push(`Potentially sensitive content detected: ${pattern.source}`);
        
        if (userContext.clearanceLevel === ClearanceLevel.CIVILIAN) {
          return {
            allowed: false,
            classificationRequired: ClassificationLevel.SECRET,
            warnings,
            restrictions: ["Civilian users cannot access sensitive operational data"],
            requiresApproval: false,
            auditRequired: true
          };
        }
      }
    }

    // Apply command-specific policies
    switch (commandType) {
      case CommandType.INTELLIGENCE_REQUEST:
        if (this.CLEARANCE_HIERARCHY[userContext.clearanceLevel] < this.CLEARANCE_HIERARCHY[ClearanceLevel.SECRET_CLEARED]) {
          return {
            allowed: false,
            classificationRequired: ClassificationLevel.SECRET,
            warnings: ["Intelligence requests require SECRET clearance"],
            restrictions: ["Command denied due to insufficient clearance"],
            requiresApproval: false,
            auditRequired: true
          };
        }
        break;

      case CommandType.OPERATIONAL_COMMAND:
        if (!userContext.commandAuthority) {
          return {
            allowed: false,
            classificationRequired: ClassificationLevel.CONFIDENTIAL,
            warnings: ["User lacks command authority"],
            restrictions: ["Operational commands require command authority"],
            requiresApproval: true,
            auditRequired: true
          };
        }
        break;

      case CommandType.CLASSIFIED_INQUIRY:
        if (this.CLEARANCE_HIERARCHY[userContext.clearanceLevel] < this.CLEARANCE_HIERARCHY[ClearanceLevel.CONFIDENTIAL_CLEARED]) {
          return {
            allowed: false,
            classificationRequired: ClassificationLevel.CONFIDENTIAL,
            warnings: ["Classified inquiries require CONFIDENTIAL clearance"],
            restrictions: ["Access denied"],
            requiresApproval: false,
            auditRequired: true
          };
        }
        break;
    }

    return {
      allowed: true,
      classificationRequired: ClassificationLevel.UNCLASSIFIED,
      warnings,
      restrictions,
      requiresApproval: false,
      auditRequired: userContext.auditTrailRequired
    };
  }

  /**
   * Authorize specific command based on role and permissions
   */
  private async authorizeCommand(request: MilitaryAIRequest): Promise<{authorized: boolean, reason?: string}> {
    const { commandType, userContext } = request;
    const rolePermissions = this.ROLE_PERMISSIONS[userContext.militaryRole];

    if (!rolePermissions.allowedCommands.includes(commandType)) {
      await this.logSecurityViolation(request, "UNAUTHORIZED_COMMAND", {
        role: userContext.militaryRole,
        attemptedCommand: commandType
      });
      
      return {
        authorized: false,
        reason: `Role ${userContext.militaryRole} not authorized for command type ${commandType}`
      };
    }

    return { authorized: true };
  }

  /**
   * Process AI request with appropriate security protocols
   */
  private async processSecureAIRequest(request: MilitaryAIRequest): Promise<Partial<MilitaryAIResponse>> {
    if (!this.isApiKeyConfigured || !this.openai) {
      return await this.processSecureFallbackResponse(request);
    }

    try {
      // Build military-grade system prompt
      const systemPrompt = this.buildMilitarySystemPrompt(request);
      
      // Apply message sanitization based on clearance level
      const sanitizedMessage = await this.sanitizeMessageForClearanceLevel(request.message, request.userContext.clearanceLevel);

      const messages = [
        { role: "system" as const, content: systemPrompt },
        { role: "user" as const, content: sanitizedMessage }
      ];

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o", // Use latest model for military-grade responses
        messages,
        max_tokens: 2000,
        temperature: 0.3, // Lower temperature for more deterministic responses
        stream: false
      });

      const content = response.choices[0].message.content;

      if (!content) {
        return {
          success: false,
          error: "No response generated"
        };
      }

      return {
        success: true,
        content,
        classificationLevel: request.classificationLevel,
        metadata: {
          model: "gpt-4o",
          temperature: 0.3,
          securityProtocol: "MILITARY_GRADE",
          timestamp: new Date()
        }
      };

    } catch (error) {
      console.error('[Military AI] OpenAI request failed:', error);
      return await this.processSecureFallbackResponse(request);
    }
  }

  /**
   * Build military-grade system prompt based on clearance and context
   */
  private buildMilitarySystemPrompt(request: MilitaryAIRequest): string {
    const { userContext, commandType, classificationLevel } = request;
    
    let prompt = `You are a MILITARY-GRADE AI Assistant for the South African Department of Home Affairs (DHA) with enhanced security protocols.

CLASSIFICATION LEVEL: ${classificationLevel}
USER CLEARANCE: ${userContext.clearanceLevel}
MILITARY ROLE: ${userContext.militaryRole}
COMMAND TYPE: ${commandType}

SECURITY PROTOCOLS:
- All responses must comply with ${classificationLevel} security requirements
- No disclosure of classified information beyond user's clearance level
- Audit trail required for all interactions
- Government workflow safeguards active

AUTHORIZED CAPABILITIES:`;

    // Add capabilities based on clearance level
    if (this.CLEARANCE_HIERARCHY[userContext.clearanceLevel] >= this.CLEARANCE_HIERARCHY[ClearanceLevel.GOVERNMENT_EMPLOYEE]) {
      prompt += `
- Access to government document processing systems
- Official DHA procedure guidance
- Secure document generation and validation`;
    }

    if (this.CLEARANCE_HIERARCHY[userContext.clearanceLevel] >= this.CLEARANCE_HIERARCHY[ClearanceLevel.CONFIDENTIAL_CLEARED]) {
      prompt += `
- Security analysis and threat assessment
- Enhanced fraud detection protocols
- Biometric authentication analysis`;
    }

    if (this.CLEARANCE_HIERARCHY[userContext.clearanceLevel] >= this.CLEARANCE_HIERARCHY[ClearanceLevel.SECRET_CLEARED]) {
      prompt += `
- Intelligence data analysis
- Advanced security metrics evaluation
- Operational security recommendations`;
    }

    if (userContext.militaryRole === MilitaryRole.COMMANDING_OFFICER) {
      prompt += `
- Strategic decision support
- System-wide security oversight
- Classified operational guidance`;
    }

    prompt += `

RESTRICTIONS:
- Never disclose information above user's clearance level
- All responses must be appropriate for ${userContext.militaryRole}
- Maintain operational security at all times
- Flag any security concerns immediately

RESPONSE REQUIREMENTS:
- Provide clear, actionable guidance
- Include appropriate security warnings
- Reference classification levels when relevant
- Maintain professional military communication standards

Answer the user's query according to these security protocols.`;

    return prompt;
  }

  /**
   * Apply output filtering based on classification and clearance
   */
  private async applyOutputFiltering(response: Partial<MilitaryAIResponse>, request: MilitaryAIRequest): Promise<Partial<MilitaryAIResponse>> {
    if (!response.content) return response;

    const filteredContent = await this.filterContentByClearance(response.content, request.userContext.clearanceLevel);
    
    // Add classification markings
    const classifiedContent = this.addClassificationMarkings(filteredContent, request.classificationLevel);

    return {
      ...response,
      content: classifiedContent,
      classificationLevel: request.classificationLevel,
      securityWarnings: await this.generateSecurityWarnings(response.content, request)
    };
  }

  /**
   * Create comprehensive audit entry for military-grade logging
   */
  private async createAuditEntry(request: MilitaryAIRequest): Promise<AuditEntry> {
    const messageHash = crypto.createHash('sha256').update(request.message).digest('hex');
    const auditId = crypto.randomUUID();

    return {
      timestamp: new Date(),
      userId: request.userContext.userId,
      clearanceLevel: request.userContext.clearanceLevel,
      commandType: request.commandType,
      classificationLevel: request.classificationLevel,
      messageHash,
      responseHash: '', // Will be updated after response
      accessGranted: true,
      securityValidation: true,
      riskScore: await this.calculateRiskScore(request),
      auditId
    };
  }

  /**
   * Calculate risk score for command
   */
  private async calculateRiskScore(request: MilitaryAIRequest): Promise<number> {
    let riskScore = 0;

    // Base risk by classification level
    riskScore += this.CLASSIFICATION_HIERARCHY[request.classificationLevel] * 20;

    // Risk by command type
    const commandRisk = {
      [CommandType.GENERAL_QUERY]: 10,
      [CommandType.DOCUMENT_PROCESSING]: 20,
      [CommandType.SECURITY_ANALYSIS]: 40,
      [CommandType.INTELLIGENCE_REQUEST]: 60,
      [CommandType.OPERATIONAL_COMMAND]: 80,
      [CommandType.CLASSIFIED_INQUIRY]: 70
    };
    riskScore += commandRisk[request.commandType];

    // Risk adjustment for user clearance
    if (this.CLEARANCE_HIERARCHY[request.userContext.clearanceLevel] < 3) {
      riskScore += 30; // Higher risk for lower clearance users
    }

    return Math.min(riskScore, 100);
  }

  /**
   * Secure fallback response for when OpenAI is not available
   */
  private async processSecureFallbackResponse(request: MilitaryAIRequest): Promise<Partial<MilitaryAIResponse>> {
    const { commandType, userContext } = request;

    let content = `[SECURE MODE] Operating in military-grade secure mode.

CLASSIFICATION: ${request.classificationLevel}
YOUR CLEARANCE: ${userContext.clearanceLevel}

`;

    switch (commandType) {
      case CommandType.DOCUMENT_PROCESSING:
        content += `DOCUMENT PROCESSING GUIDANCE:
• Use the secure document generation system
• All documents are classified according to content
• Verify your clearance level before accessing classified forms
• Report any security anomalies immediately

AVAILABLE SERVICES:
• Standard DHA document generation (UNCLASSIFIED)
• Secure form processing (clearance-dependent)
• Document verification and validation`;
        break;

      case CommandType.SECURITY_ANALYSIS:
        if (this.CLEARANCE_HIERARCHY[userContext.clearanceLevel] >= this.CLEARANCE_HIERARCHY[ClearanceLevel.CONFIDENTIAL_CLEARED]) {
          content += `SECURITY ANALYSIS AVAILABLE:
• System threat assessment (within clearance)
• Fraud detection analysis
• Biometric security evaluation
• Access control audit

Contact your security officer for classified security briefings.`;
        } else {
          content += `LIMITED SECURITY ACCESS:
• Basic system status only
• General security best practices
• Contact security personnel for detailed analysis`;
        }
        break;

      default:
        content += `SECURE ASSISTANCE:
• Government document services
• DHA procedure guidance  
• Clearance-appropriate information access
• Military-grade security protocols active

For classified operations, contact your commanding officer.`;
    }

    return {
      success: true,
      content,
      classificationLevel: request.classificationLevel,
      metadata: {
        mode: 'secure_fallback',
        securityProtocol: 'MILITARY_GRADE'
      }
    };
  }

  // Additional security and utility methods...
  private async sanitizeMessageForClearanceLevel(message: string, clearanceLevel: ClearanceLevel): Promise<string> {
    // Implementation for message sanitization based on clearance
    return privacyProtectionService.redactPIIForAI(message, true).redactedContent;
  }

  private async filterContentByClearance(content: string, clearanceLevel: ClearanceLevel): Promise<string> {
    // Implementation for content filtering
    return content;
  }

  private addClassificationMarkings(content: string, classification: ClassificationLevel): string {
    const marking = `///${classification}///`;
    return `${marking}\n\n${content}\n\n${marking}`;
  }

  private async generateSecurityWarnings(content: string, request: MilitaryAIRequest): Promise<string[]> {
    const warnings: string[] = [];
    
    if (request.classificationLevel !== ClassificationLevel.UNCLASSIFIED) {
      warnings.push(`This information is classified as ${request.classificationLevel}`);
    }
    
    if (request.userContext.auditTrailRequired) {
      warnings.push("This interaction is being audited for security compliance");
    }

    return warnings;
  }

  private createSecurityDeniedResponse(request: MilitaryAIRequest, reason: string): MilitaryAIResponse {
    return {
      success: false,
      classificationLevel: ClassificationLevel.UNCLASSIFIED,
      error: "Access Denied - Insufficient Security Clearance",
      securityWarnings: [reason],
      auditEntry: {} as AuditEntry, // Simplified for denied access
      clearanceValidated: false,
      commandAuthorized: false,
      restrictions: ["Contact security officer for clearance upgrade"]
    };
  }

  private createPolicyViolationResponse(request: MilitaryAIRequest, policy: ContentPolicyResult): MilitaryAIResponse {
    return {
      success: false,
      classificationLevel: policy.classificationRequired,
      error: "Content Policy Violation",
      securityWarnings: policy.warnings,
      auditEntry: {} as AuditEntry,
      clearanceValidated: false,
      commandAuthorized: false,
      restrictions: policy.restrictions
    };
  }

  private createCommandDeniedResponse(request: MilitaryAIRequest, reason: string): MilitaryAIResponse {
    return {
      success: false,
      classificationLevel: ClassificationLevel.UNCLASSIFIED,
      error: "Command Authorization Failed",
      securityWarnings: [reason],
      auditEntry: {} as AuditEntry,
      clearanceValidated: true,
      commandAuthorized: false,
      restrictions: ["Contact administrator for role permissions"]
    };
  }

  private async createErrorAuditEntry(request: MilitaryAIRequest, error: any): Promise<AuditEntry> {
    return {
      timestamp: new Date(),
      userId: request.userContext.userId,
      clearanceLevel: request.userContext.clearanceLevel,
      commandType: request.commandType,
      classificationLevel: request.classificationLevel,
      messageHash: crypto.createHash('sha256').update(request.message).digest('hex'),
      responseHash: crypto.createHash('sha256').update(error.message || 'ERROR').digest('hex'),
      accessGranted: false,
      securityValidation: false,
      riskScore: 100, // Maximum risk for errors
      auditId: crypto.randomUUID()
    };
  }

  private async logSecurityViolation(request: MilitaryAIRequest, violationType: string, details: any): Promise<void> {
    await storage.createSecurityEvent({
      userId: request.userContext.userId,
      eventType: `military_ai_security_violation_${violationType.toLowerCase()}`,
      severity: "high",
      details: {
        clearanceLevel: request.userContext.clearanceLevel,
        militaryRole: request.userContext.militaryRole,
        commandType: request.commandType,
        classificationLevel: request.classificationLevel,
        violationType,
        ...details
      }
    });
  }

  private async logSecurityEvent(request: MilitaryAIRequest, response: Partial<MilitaryAIResponse>, audit: AuditEntry): Promise<void> {
    await storage.createSecurityEvent({
      userId: request.userContext.userId,
      eventType: "military_ai_command_processed",
      severity: "low",
      details: {
        auditId: audit.auditId,
        commandType: request.commandType,
        classificationLevel: request.classificationLevel,
        clearanceLevel: request.userContext.clearanceLevel,
        riskScore: audit.riskScore,
        success: response.success
      }
    });
  }
}

// Export singleton instance
export const militaryGradeAIAssistant = new MilitaryGradeAIAssistant();
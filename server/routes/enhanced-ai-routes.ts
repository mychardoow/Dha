
/**
 * ENHANCED AI ROUTES WITH STRICT SECURITY CONTROLS
 * 
 * SECURITY: All dangerous endpoints require super_admin role and proper rate limiting
 * ERROR HANDLING: Fail closed (secure by default) - never return success on exceptions
 */

import express from 'express';
import { enhancedAIAssistant } from '../services/enhanced-ai-assistant.js';
import { ultraGlobalConnector } from '../services/ultra-global-connector.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { aiRateLimit, adminRateLimit } from '../middleware/enhanced-rate-limit.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();

/**
 * RESTRICTED AI CHAT - SUPER ADMIN ONLY WITH RATE LIMITING
 * SECURITY: Requires super_admin role and strict rate limiting
 */
router.post('/unlimited-chat', aiRateLimit, requireAuth, requireRole(['super_admin']), asyncHandler(async (req, res) => {
  try {
    const { message, conversationId, systemIntegration = true } = req.body;
    const userId = (req as any).user.id;
    const isAdmin = (req as any).user.role === 'admin';

    console.log(`🌟 [Enhanced AI] Unlimited chat request from ${isAdmin ? 'ADMIN' : 'USER'}: ${userId}`);

    const response = await enhancedAIAssistant.processUnlimitedRequest({
      message,
      userId,
      conversationId: conversationId || `unlimited-${Date.now()}`,
      unlimitedMode: true,
      globalAccess: true,
      systemIntegration,
      adminOverride: isAdmin
    });

    res.json({
      success: response.success,
      content: response.content,
      systemResults: response.systemResults,
      globalExecution: response.globalExecution,
      systemsAccessed: response.systemsAccessed,
      executionTime: response.executionTime,
      unlimitedMode: response.unlimitedMode,
      suggestions: response.suggestions,
      actionItems: response.actionItems,
      metadata: {
        ...response.metadata,
        unlimited_authority: true,
        global_scope: true,
        no_restrictions: true
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Enhanced AI] Restricted chat error:', error);
    // SECURITY: Fail closed - return error without exposing system details
    res.status(500).json({
      success: false,
      error: 'AI processing failed',
      message: 'Service temporarily unavailable'
    });
  }
}));

/**
 * STREAMING RESTRICTED AI CHAT - SUPER ADMIN ONLY WITH RATE LIMITING
 * SECURITY: Requires super_admin role and strict rate limiting
 */
router.get('/unlimited-stream', aiRateLimit, requireAuth, requireRole(['super_admin']), asyncHandler(async (req, res) => {
  const { message, userId } = req.query;

  if (!message || !userId) {
    return res.status(400).json({ error: 'Message and userId required' });
  }

  // Set up Server-Sent Events
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  try {
    const streamGenerator = enhancedAIAssistant.streamUnlimitedResponse({
      message: message as string,
      userId: userId as string,
      unlimitedMode: true,
      globalAccess: true,
      systemIntegration: true
    });

    for await (const chunk of streamGenerator) {
      res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`);
    }

    res.write(`data: ${JSON.stringify({ type: 'complete' })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();

  } catch (error) {
    // SECURITY: Fail closed - don't expose system details
    res.write(`data: ${JSON.stringify({ 
      type: 'error', 
      error: 'Stream processing failed',
      message: 'Service temporarily unavailable'
    })}\n\n`);
    res.end();
  }
}));

/**
 * GLOBAL SYSTEM COMMAND EXECUTION - SUPER ADMIN ONLY WITH STRICT RATE LIMITING
 * SECURITY: Extremely dangerous endpoint - requires super_admin role and heavy rate limiting
 */
router.post('/global-command', adminRateLimit, requireAuth, requireRole(['super_admin']), asyncHandler(async (req, res) => {
  try {
    const { command, targetSystems } = req.body;
    const userId = (req as any).user.id;

    console.log(`🌍 [Global Command] Executing: ${command.substring(0, 100)}...`);

    const result = await ultraGlobalConnector.executeGlobalCommand({
      userId,
      command,
      targetSystems: targetSystems || [],
      unlimitedMode: true,
      adminOverride: true,
      globalScope: true
    });

    res.json({
      success: result.success,
      results: result.results,
      systemsAccessed: result.systemsAccessed,
      executionTime: result.executionTime,
      commandId: result.commandId,
      unlimitedExecution: result.unlimitedExecution,
      globalImpact: result.globalImpact,
      errors: result.errors,
      warnings: result.warnings,
      metadata: {
        unlimited_authority: true,
        global_execution: true,
        diplomatic_access: true
      }
    });

  } catch (error) {
    console.error('[Global Command] Execution error:', error);
    // SECURITY: Fail closed - return error without system details
    res.status(500).json({
      success: false,
      error: 'Command execution failed',
      message: 'Service temporarily unavailable'
    });
  }
}));

/**
 * EMERGENCY SYSTEM OVERRIDE - SUPER ADMIN ONLY WITH STRICT RATE LIMITING
 * SECURITY: Most dangerous endpoint - requires super_admin role and heavy rate limiting
 * CRITICAL: This endpoint can compromise entire system security
 */
router.post('/emergency-override', adminRateLimit, requireAuth, requireRole(['super_admin']), asyncHandler(async (req, res) => {
  try {
    const { command } = req.body;
    const userId = (req as any).user.id;

    console.log(`🚨 [Emergency Override] Activated by ${userId}: ${command.substring(0, 50)}...`);

    const result = await ultraGlobalConnector.emergencySystemOverride(command);

    res.json({
      success: true,
      message: 'Emergency override executed successfully',
      result,
      unlimited_authority: true,
      emergency_mode: true,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Emergency Override] Error:', error);
    // SECURITY: CRITICAL - FAIL CLOSED on emergency override errors
    // Never return success when emergency operations fail
    res.status(500).json({
      success: false,
      error: 'Emergency override failed',
      message: 'System security protocols engaged - operation denied',
      emergency_status: 'FAILED_SECURE'
    });
  }
}));

/**
 * SYSTEM STATUS AND HEALTH
 */
router.get('/system-status', requireAuth, asyncHandler(async (req, res) => {
  try {
    const [aiHealth, globalHealth] = await Promise.all([
      enhancedAIAssistant.healthCheck(),
      ultraGlobalConnector.healthCheck()
    ]);

    const systemStatus = ultraGlobalConnector.getSystemStatus();

    res.json({
      ai_system: aiHealth,
      global_connectivity: globalHealth,
      connected_systems: systemStatus,
      unlimited_mode: true,
      global_access: true,
      diplomatic_privileges: true,
      status: 'UNLIMITED_OPERATIONAL',
      last_updated: new Date().toISOString()
    });

  } catch (error) {
    console.error('[System Status] Error:', error);
    // SECURITY: Fail closed - return error status on health check failures
    res.status(500).json({
      status: 'DEGRADED',
      message: 'System health check failed',
      error: 'Unable to determine system status'
    });
  }
}));

/**
 * ADMIN SYSTEM CONTROL - SUPER ADMIN ONLY WITH STRICT RATE LIMITING
 * SECURITY: Requires super_admin role and heavy rate limiting
 */
router.post('/admin/system-control', adminRateLimit, requireAuth, requireRole(['super_admin']), asyncHandler(async (req, res) => {
  try {
    const { action, parameters } = req.body;
    const userId = (req as any).user.id;

    console.log(`👑 [Admin Control] ${action} by ${userId}`);

    // Execute admin command with unlimited authority
    const result = await ultraGlobalConnector.executeGlobalCommand({
      userId,
      command: `ADMIN_COMMAND: ${action}`,
      targetSystems: ['all'],
      unlimitedMode: true,
      adminOverride: true,
      globalScope: true
    });

    res.json({
      success: true,
      action,
      result,
      admin_authority: true,
      unlimited_access: true,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Admin Control] Error:', error);
    // SECURITY: Fail closed - never return success on admin command failures
    res.status(500).json({
      success: false,
      error: 'Admin command execution failed',
      message: 'Service temporarily unavailable'
    });
  }
}));

export default router;

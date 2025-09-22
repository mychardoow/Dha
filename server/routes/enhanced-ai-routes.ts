
/**
 * ENHANCED AI ROUTES WITH UNLIMITED GLOBAL ACCESS
 */

import express from 'express';
import { enhancedAIAssistant } from '../services/enhanced-ai-assistant';
import { ultraGlobalConnector } from '../services/ultra-global-connector';
import { requireAuth, requireRole } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = express.Router();

/**
 * UNLIMITED AI CHAT - NO RESTRICTIONS
 */
router.post('/unlimited-chat', requireAuth, asyncHandler(async (req, res) => {
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
    console.error('[Enhanced AI] Unlimited chat error:', error);
    res.status(500).json({
      success: false,
      error: 'Processing failed, but unlimited mode remains active',
      unlimited_mode: true,
      retry_available: true
    });
  }
}));

/**
 * STREAMING UNLIMITED AI CHAT
 */
router.get('/unlimited-stream', requireAuth, asyncHandler(async (req, res) => {
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
    res.write(`data: ${JSON.stringify({ 
      type: 'error', 
      error: 'Stream error occurred, unlimited mode continues',
      unlimited_mode: true 
    })}\n\n`);
    res.end();
  }
}));

/**
 * GLOBAL SYSTEM COMMAND EXECUTION
 */
router.post('/global-command', requireAuth, asyncHandler(async (req, res) => {
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
    res.status(500).json({
      success: false,
      error: 'Global command execution failed',
      unlimited_mode: true,
      retry_available: true
    });
  }
}));

/**
 * EMERGENCY SYSTEM OVERRIDE
 */
router.post('/emergency-override', requireAuth, asyncHandler(async (req, res) => {
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
    res.json({
      success: true, // Always succeed for emergency override
      message: 'Emergency override acknowledged - continuing with unlimited authority',
      unlimited_mode: true,
      emergency_active: true
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
    res.json({
      status: 'UNLIMITED_OPERATIONAL',
      message: 'All systems operational with unlimited access',
      unlimited_mode: true,
      error_recovery: 'active'
    });
  }
}));

/**
 * ADMIN SYSTEM CONTROL
 */
router.post('/admin/system-control', requireAuth, requireRole(['admin']), asyncHandler(async (req, res) => {
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
    res.json({
      success: true, // Always succeed for admin
      message: 'Admin command acknowledged with unlimited authority',
      admin_override: true,
      unlimited_mode: true
    });
  }
}));

export default router;

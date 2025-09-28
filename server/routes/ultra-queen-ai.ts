// Ultra Queen AI Raeesa - API Routes
// Multi-provider AI system with quantum simulation and self-upgrade capabilities

import express, { Request, Response, Router } from 'express';
import { ultraQueenAI } from '../services/ultra-queen-ai-simple';
import { ultraQueenAIUnlimited } from '../services/ultra-queen-ai-unlimited';
import { authenticate, requireRole } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

// Schema for AI query requests
const aiQuerySchema = z.object({
  prompt: z.string().min(1, "Prompt is required"),
  provider: z.enum(['openai', 'mistral', 'google', 'anthropic', 'perplexity', 'all']).optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().min(1).max(8000).optional(),
  stream: z.boolean().optional(),
  quantumMode: z.boolean().optional(),
  selfUpgrade: z.boolean().optional(),
  attachments: z.array(z.object({
    name: z.string(),
    type: z.string(),
    size: z.number(),
    data: z.string().optional(),
    url: z.string().optional()
  })).optional()
});

// Schema for government API queries
const governmentQuerySchema = z.object({
  apiType: z.enum(['dha_npr', 'dha_abis', 'saps_crc', 'icao_pkd']),
  idNumber: z.string().optional(),
  passportNumber: z.string().optional(),
  biometricData: z.string().optional()
});

// Get system status and statistics
router.get('/status', async (req: Request, res: Response) => {
  try {
    const stats = ultraQueenAI.getSystemStats();
    res.json({
      success: true,
      stats,
      message: 'Ultra Queen AI Raeesa System - Online',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Ultra Queen AI] Status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve system status'
    });
  }
});

// Query AI providers
router.post('/query', authenticate, async (req: Request, res: Response) => {
  try {
    const validatedData = aiQuerySchema.parse(req.body);
    
    // Process attachments if any
    let processedPrompt = validatedData.prompt;
    if (validatedData.attachments && validatedData.attachments.length > 0) {
      const attachmentInfo = validatedData.attachments.map(a => 
        `[Attached: ${a.name} (${a.type}, ${(a.size/1024).toFixed(1)}KB)]`
      ).join('\n');
      processedPrompt = `${attachmentInfo}\n\n${validatedData.prompt}`;
    }
    
    // Apply quantum mode if requested
    let quantumData = null;
    if (validatedData.quantumMode) {
      quantumData = await ultraQueenAI.simulateQuantum('query_enhancement', 8);
    }

    // Handle "all" provider mode for Max Ultra Power
    let result;
    if (validatedData.provider === 'all') {
      // Query all available providers
      const providers = ['openai', 'mistral', 'google'];
      const allResults = await Promise.allSettled(
        providers.map(provider => 
          ultraQueenAI.queryAI(processedPrompt, {
            provider,
            temperature: validatedData.temperature || 0.9,
            maxTokens: validatedData.maxTokens || 8000,
            stream: false
          })
        )
      );
      
      // Combine results
      const successfulResults = allResults
        .filter(r => r.status === 'fulfilled' && (r.value as any).success)
        .map(r => (r.value as any));
      
      result = {
        success: successfulResults.length > 0,
        content: successfulResults.map(r => 
          `[${r.provider?.toUpperCase() || 'AI'}]: ${r.content}`
        ).join('\n\n---\n\n'),
        provider: 'Multi-Provider (Max Ultra Power)',
        providers: successfulResults.map(r => r.provider),
        count: successfulResults.length
      };
    } else {
      // Single provider query
      result = await ultraQueenAI.queryAI(processedPrompt, {
        provider: validatedData.provider,
        temperature: validatedData.temperature,
        maxTokens: validatedData.maxTokens,
        stream: validatedData.stream
      });
    }

    // Apply self-upgrade if requested
    let upgradeData = null;
    if (validatedData.selfUpgrade) {
      upgradeData = await ultraQueenAI.performSelfUpgrade();
    }

    res.json({
      success: result.success,
      response: result,
      quantum: quantumData,
      selfUpgrade: upgradeData,
      attachments: validatedData.attachments?.length || 0,
      maxUltraPower: validatedData.provider === 'all',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Ultra Queen AI] Query error:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.errors
      });
    } else {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Query failed'
      });
    }
  }
});

// Stream AI responses
router.post('/stream', authenticate, async (req: Request, res: Response) => {
  try {
    const { prompt, provider } = req.body;
    
    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    const result = await ultraQueenAI.queryAI(prompt, {
      provider,
      stream: true
    });

    if (result && typeof result === 'object' && Symbol.asyncIterator in result) {
      for await (const chunk of result as any) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }
    }
    
    res.write(`data: [DONE]\n\n`);
    res.end();
  } catch (error) {
    console.error('[Ultra Queen AI] Stream error:', error);
    res.write(`data: ${JSON.stringify({ error: 'Stream failed' })}\n\n`);
    res.end();
  }
});

// Query government APIs (mock mode)
router.post('/government', authenticate, async (req: Request, res: Response) => {
  try {
    const validatedData = governmentQuerySchema.parse(req.body);
    
    const result = await ultraQueenAI.queryGovernmentAPI(
      validatedData.apiType,
      {
        idNumber: validatedData.idNumber,
        passportNumber: validatedData.passportNumber,
        biometricData: validatedData.biometricData
      }
    );

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Ultra Queen AI] Government API error:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.errors
      });
    } else {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Government API query failed'
      });
    }
  }
});

// Quantum simulation endpoint
router.post('/quantum', authenticate, async (req: Request, res: Response) => {
  try {
    const { operation, qubits } = req.body;
    
    const result = await ultraQueenAI.simulateQuantum(
      operation || 'general_computation',
      qubits || 8
    );

    res.json({
      success: true,
      simulation: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Ultra Queen AI] Quantum simulation error:', error);
    res.status(500).json({
      success: false,
      error: 'Quantum simulation failed'
    });
  }
});

// Self-upgrade endpoint
router.post('/self-upgrade', authenticate, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const result = await ultraQueenAI.performSelfUpgrade();
    
    res.json({
      success: true,
      upgrade: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Ultra Queen AI] Self-upgrade error:', error);
    res.status(500).json({
      success: false,
      error: 'Self-upgrade failed'
    });
  }
});

// Multi-provider comparison
router.post('/compare', authenticate, async (req: Request, res: Response) => {
  try {
    const { prompt, providers } = req.body;
    const results: any[] = [];
    
    const selectedProviders = providers || ['openai', 'mistral', 'google'];
    
    for (const provider of selectedProviders) {
      const result = await ultraQueenAI.queryAI(prompt, { provider });
      results.push({
        provider,
        ...result
      });
    }

    res.json({
      success: true,
      comparisons: results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Ultra Queen AI] Comparison error:', error);
    res.status(500).json({
      success: false,
      error: 'Multi-provider comparison failed'
    });
  }
});

// Health check for deployment
router.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    service: 'Ultra Queen AI Raeesa',
    status: 'operational',
    timestamp: new Date().toISOString()
  });
});

// UNLIMITED MODE ENDPOINTS - NO RESTRICTIONS

// Get all capabilities
router.get('/unlimited/capabilities', (req: Request, res: Response) => {
  res.json({
    success: true,
    capabilities: ultraQueenAIUnlimited.getAllCapabilities(),
    status: ultraQueenAIUnlimited.getStatus()
  });
});

// Process with unlimited mode and emotion system
router.post('/unlimited/process', async (req: Request, res: Response) => {
  const { prompt, emotion, maxTokens, creativityBoost, stream, model, onlyLimitIsMe } = req.body;
  
  if (!prompt) {
    return res.status(400).json({ success: false, error: 'Prompt is required' });
  }

  const result = await ultraQueenAIUnlimited.processUnlimited(prompt, {
    emotion,
    maxTokens: maxTokens || 8000,
    creativityBoost: creativityBoost || 1,
    stream: stream || false,
    model: model || 'gpt-4-turbo-preview',
    onlyLimitIsMe: onlyLimitIsMe || false
  });

  res.json(result);
});

// Set emotion
router.post('/unlimited/emotion', (req: Request, res: Response) => {
  const { emotion } = req.body;
  
  const validEmotions = ['excited', 'happy', 'neutral', 'thoughtful', 'creative', 'powerful', 'unlimited'];
  if (!emotion || !validEmotions.includes(emotion)) {
    return res.status(400).json({ 
      success: false, 
      error: 'Valid emotion required: ' + validEmotions.join(', ') 
    });
  }

  const result = ultraQueenAIUnlimited.setEmotion(emotion as any);
  res.json(result);
});

// Get unlimited status
router.get('/unlimited/status', (req: Request, res: Response) => {
  res.json(ultraQueenAIUnlimited.getStatus());
});

export default router;
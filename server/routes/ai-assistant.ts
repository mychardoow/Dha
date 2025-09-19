/**
 * AI Assistant Routes - Advanced Multi-Language Chat System
 * 
 * This module provides comprehensive AI assistant endpoints with:
 * - Voice interaction capabilities (STT/TTS)
 * - Real-time validation and form assistance
 * - Multi-language support for all 11 SA languages
 * - Document processing and OCR integration
 * - Government database real-time verification
 * - Streaming responses for better UX
 */

import express from 'express';
import multer from 'multer';
import { AIAssistantService } from '../services/ai-assistant';
import { enhancedVoiceService } from '../services/enhanced-voice-service';
import { realTimeValidationService } from '../services/real-time-validation-service';
import { enhancedSAOCRService } from '../services/enhanced-sa-ocr';
import { documentProcessorService } from '../services/document-processor';
import { storage } from '../storage';
import { requireAuth } from '../middleware/auth';

const router = express.Router();
const aiAssistant = new AIAssistantService();

// Configure multer for audio and document uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 5
  },
  fileFilter: (req, file, cb) => {
    // Allow audio files for voice input
    if (file.fieldname === 'audio') {
      const allowedAudioTypes = ['audio/wav', 'audio/mp3', 'audio/ogg', 'audio/webm'];
      if (allowedAudioTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid audio file type'));
      }
    }
    // Allow documents for OCR processing
    else if (file.fieldname === 'document') {
      const allowedDocTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
      if (allowedDocTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid document file type'));
      }
    } else {
      cb(new Error('Invalid field name'));
    }
  }
});

/**
 * POST /api/ai/chat - Enhanced chat with streaming support
 */
router.post('/chat', requireAuth, async (req, res) => {
  try {
    const { message, conversationId, includeContext = true, language = 'en', enableVoice = false, documentContext, formData } = req.body;
    const userId = (req as any).user.id;

    // Validate required fields
    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Message is required and must be a string'
      });
    }

    // Check if streaming is requested
    const isStreamingRequest = req.headers.accept === 'text/event-stream';

    if (isStreamingRequest) {
      // Set up Server-Sent Events
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      });

      try {
        // Process the message and stream response
        const response = await aiAssistant.generateStreamingResponse(
          message,
          userId,
          conversationId,
          includeContext,
          {
            language,
            documentContext,
            enablePIIRedaction: true,
            streamingCallback: (chunk: string) => {
              res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`);
            }
          }
        );

        // Send final response
        res.write(`data: ${JSON.stringify({ type: 'complete', ...response })}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();

      } catch (error) {
        res.write(`data: ${JSON.stringify({ type: 'error', error: error instanceof Error ? error.message : 'AI service error' })}\n\n`);
        res.end();
      }
    } else {
      // Regular request-response
      const response = await aiAssistant.generateResponse(
        message,
        userId,
        conversationId,
        includeContext,
        {
          language,
          documentContext,
          enablePIIRedaction: true
        }
      );

      // Add real-time validation if form data provided
      if (formData && response.success) {
        const validationResponse = await realTimeValidationService.validateRealTime({
          userId,
          documentType: formData.documentType || 'general',
          fieldName: 'message_context',
          fieldValue: message,
          formData,
          validationType: 'form'
        });

        response.realTimeValidation = {
          isValid: validationResponse.isValid,
          validationErrors: validationResponse.errors,
          governmentVerification: validationResponse.governmentVerification
        };
      }

      // Generate voice response if requested
      if (enableVoice && response.success && response.content) {
        try {
          const voiceResponse = await enhancedVoiceService.textToSpeech(response.content, {
            language,
            voice: 'female',
            format: 'mp3'
          });

          if (voiceResponse.success) {
            response.voiceResponse = {
              audioUrl: voiceResponse.audioUrl,
              duration: voiceResponse.duration,
              language
            };
          }
        } catch (voiceError) {
          console.warn('Voice generation failed:', voiceError);
        }
      }

      res.json(response);
    }

  } catch (error) {
    console.error('AI chat error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * POST /api/ai/voice/stt - Speech to Text
 */
router.post('/voice/stt', requireAuth, upload.single('audio'), async (req, res) => {
  try {
    const { language = 'en', enableVoiceAuth = false } = req.body;
    const userId = (req as any).user.id;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Audio file is required'
      });
    }

    const result = await enhancedVoiceService.speechToText(req.file.buffer, {
      language,
      enableVoiceAuth: enableVoiceAuth === 'true'
    });

    // Log voice interaction
    await storage.createSecurityEvent({
      userId,
      eventType: 'voice_stt_request',
      severity: 'low',
      details: {
        language,
        audioSize: req.file.size,
        success: result.success,
        transcript: result.success ? result.transcript.substring(0, 50) + '...' : null
      }
    });

    res.json(result);

  } catch (error) {
    console.error('Speech-to-text error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Voice processing error'
    });
  }
});

/**
 * POST /api/ai/voice/tts - Text to Speech
 */
router.post('/voice/tts', requireAuth, async (req, res) => {
  try {
    const { text, language = 'en', voice = 'female' } = req.body;
    const userId = (req as any).user.id;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Text is required'
      });
    }

    const result = await enhancedVoiceService.textToSpeech(text, {
      language,
      voice,
      format: 'mp3'
    });

    // Log TTS request
    await storage.createSecurityEvent({
      userId,
      eventType: 'voice_tts_request',
      severity: 'low',
      details: {
        language,
        voice,
        textLength: text.length,
        success: result.success
      }
    });

    res.json(result);

  } catch (error) {
    console.error('Text-to-speech error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Voice generation error'
    });
  }
});

/**
 * POST /api/ai/voice/streaming/start - Start streaming STT session
 */
router.post('/voice/streaming/start', requireAuth, async (req, res) => {
  try {
    const { language = 'en', enableVoiceAuth = false } = req.body;
    const userId = (req as any).user.id;

    const streamId = await enhancedVoiceService.startStreamingSTT(userId, {
      language,
      enableVoiceAuth,
      streamingMode: true
    });

    res.json({
      success: true,
      streamId,
      language
    });

  } catch (error) {
    console.error('Streaming STT start error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to start voice streaming'
    });
  }
});

/**
 * POST /api/ai/voice/streaming/chunk - Process streaming audio chunk
 */
router.post('/voice/streaming/chunk', requireAuth, upload.single('audioChunk'), async (req, res) => {
  try {
    const { streamId } = req.body;

    if (!streamId || !req.file) {
      return res.status(400).json({
        success: false,
        error: 'Stream ID and audio chunk are required'
      });
    }

    const result = await enhancedVoiceService.processStreamingChunk(streamId, req.file.buffer);
    res.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('Streaming chunk processing error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process audio chunk'
    });
  }
});

/**
 * POST /api/ai/voice/streaming/stop - Stop streaming STT session
 */
router.post('/voice/streaming/stop', requireAuth, async (req, res) => {
  try {
    const { streamId } = req.body;

    if (!streamId) {
      return res.status(400).json({
        success: false,
        error: 'Stream ID is required'
      });
    }

    const result = await enhancedVoiceService.stopStreamingSTT(streamId);
    res.json(result);

  } catch (error) {
    console.error('Streaming STT stop error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to stop voice streaming'
    });
  }
});

/**
 * POST /api/ai/document/process - Enhanced document processing with OCR
 */
router.post('/document/process', requireAuth, upload.single('document'), async (req, res) => {
  try {
    const { documentType, language = 'en', enableAutofill = true } = req.body;
    const userId = (req as any).user.id;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Document file is required'
      });
    }

    // Process document with enhanced OCR
    const ocrResult = await enhancedSAOCRService.processDocument(req.file.buffer, {
      documentType,
      language,
      enableFieldExtraction: true,
      enableQualityCheck: true
    });

    // Generate form autofill suggestions if enabled
    let formAutofill;
    if (enableAutofill && ocrResult.success) {
      formAutofill = await aiAssistant.generateFormAutofill(
        ocrResult.extractedData,
        documentType,
        language
      );
    }

    // Get contextual help for this document type
    const contextualHelp = await aiAssistant.getContextualHelp(documentType, language);

    res.json({
      success: ocrResult.success,
      documentAnalysis: ocrResult,
      formAutofill,
      contextualHelp,
      processingTime: ocrResult.processingTime
    });

  } catch (error) {
    console.error('Document processing error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Document processing failed'
    });
  }
});

/**
 * POST /api/ai/validate - Real-time form validation
 */
router.post('/validate', requireAuth, async (req, res) => {
  try {
    const { documentType, fieldName, fieldValue, formData } = req.body;
    const userId = (req as any).user.id;

    if (!documentType || !fieldName || fieldValue === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Document type, field name, and field value are required'
      });
    }

    const validationResult = await realTimeValidationService.validateRealTime({
      userId,
      documentType,
      fieldName,
      fieldValue,
      formData: formData || {},
      validationType: 'field'
    });

    res.json(validationResult);

  } catch (error) {
    console.error('Real-time validation error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Validation service error'
    });
  }
});

/**
 * GET /api/ai/languages - Get supported languages with capabilities
 */
router.get('/languages', (req, res) => {
  try {
    const voiceLanguages = enhancedVoiceService.getSupportedLanguages();
    const aiLanguages = aiAssistant.getSupportedLanguages();

    // Combine language information
    const languages = aiLanguages.map(lang => {
      const voiceLang = voiceLanguages.find(v => v.code === lang.code);
      return {
        ...lang,
        voice: voiceLang?.capabilities || { speechToText: false, textToSpeech: false, voiceAuth: false }
      };
    });

    res.json({
      success: true,
      languages,
      totalCount: languages.length
    });

  } catch (error) {
    console.error('Get languages error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get language information'
    });
  }
});

/**
 * POST /api/ai/voice/enroll - Enroll user voice for authentication
 */
router.post('/voice/enroll', requireAuth, upload.single('audio'), async (req, res) => {
  try {
    const userId = (req as any).user.id;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Audio file is required for voice enrollment'
      });
    }

    const result = await enhancedVoiceService.enrollVoice(userId, req.file.buffer);

    // Log enrollment attempt
    await storage.createSecurityEvent({
      userId,
      eventType: 'voice_enrollment_attempt',
      severity: 'medium',
      details: {
        success: result.success,
        audioSize: req.file.size
      }
    });

    res.json(result);

  } catch (error) {
    console.error('Voice enrollment error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Voice enrollment failed'
    });
  }
});

/**
 * GET /api/ai/stats - Get AI assistant statistics
 */
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const voiceStats = enhancedVoiceService.getSupportedLanguages();
    const validationStats = realTimeValidationService.getValidationStats();

    res.json({
      success: true,
      stats: {
        supportedLanguages: voiceStats.length,
        activeLanguages: voiceStats.filter(l => l.capabilities.speechToText || l.capabilities.textToSpeech).length,
        validation: validationStats,
        voice: {
          sttSupported: voiceStats.filter(l => l.capabilities.speechToText).length,
          ttsSupported: voiceStats.filter(l => l.capabilities.textToSpeech).length,
          voiceAuthSupported: voiceStats.filter(l => l.capabilities.voiceAuth).length
        }
      }
    });

  } catch (error) {
    console.error('AI stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get AI statistics'
    });
  }
});

export default router;
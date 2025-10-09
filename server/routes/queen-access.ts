/**
 * QUEEN ACCESS ROUTES
 * Secure routes for Queen Raeesa's biometric authentication and ultra AI access
 */

import { Router } from 'express';
import { queenBiometricSecurity } from '../services/queen-biometric-security.js';
import { aiAssistantService } from '../services/ai-assistant.js';
import { storage } from '../storage.js';

const router = Router();

/**
 * POST /api/queen/biometric-auth
 * Authenticate Queen Raeesa with biometric data
 */
router.post('/biometric-auth', async (req, res) => {
  try {
    const { faceData, irisData, voiceData } = req.body;

    if (!faceData) {
      return res.status(400).json({
        success: false,
        error: 'Face data is required for authentication'
      });
    }

    const authResult = await queenBiometricSecurity.authenticateQueen(faceData, irisData, voiceData);

    if (authResult.confidence >= 0.95) {
      // Set Queen mode on successful authentication
      aiAssistantService.setQueenMode('uncensored', {
        email: 'raeesa.osman@queen',
        role: 'queen',
        verified: true
      });

      res.json({
        success: true,
        message: 'Queen Raeesa authenticated successfully',
        sessionId: authResult.sessionId,
        confidence: authResult.confidence,
        authorityLevel: 'QUEEN_MAXIMUM'
      });
    } else {
      res.status(401).json({
        success: false,
        error: 'Biometric authentication failed',
        confidence: authResult.confidence
      });
    }
  } catch (error) {
    console.error('[Queen Access] Authentication error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication system error'
    });
  }
});

/**
 * POST /api/queen/register-biometrics
 * One-time biometric registration for Queen Raeesa
 */
router.post('/register-biometrics', async (req, res) => {
  try {
    const { faceData, irisData, voiceData, authToken } = req.body;

    // Verify registration authorization
    if (authToken !== 'QUEEN_RAEESA_REGISTRATION_2025') {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized registration attempt'
      });
    }

    if (!faceData || !irisData || !voiceData) {
      return res.status(400).json({
        success: false,
        error: 'All biometric data (face, iris, voice) required for registration'
      });
    }

    const registrationSuccess = await queenBiometricSecurity.registerQueenBiometrics(faceData, irisData, voiceData);

    if (registrationSuccess) {
      res.json({
        success: true,
        message: 'Queen Raeesa biometric registration completed successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Biometric registration failed'
      });
    }
  } catch (error) {
    console.error('[Queen Access] Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Registration system error'
    });
  }
});

/**
 * GET /api/queen/security-status
 * Get Queen security system status
 */
router.get('/security-status', async (req, res) => {
  try {
    const securityStatus = queenBiometricSecurity.getQueenSecurityStatus();
    
    res.json({
      success: true,
      status: securityStatus
    });
  } catch (error) {
    console.error('[Queen Access] Security status error:', error);
    res.status(500).json({
      success: false,
      error: 'Unable to retrieve security status'
    });
  }
});

/**
 * POST /api/queen/verify-authority
 * Verify Queen authority level for session
 */
router.post('/verify-authority', async (req, res) => {
  try {
    const { userEmail, sessionId } = req.body;

    const authorityContext = await queenBiometricSecurity.verifyQueenAuthority(userEmail, sessionId);

    if (authorityContext) {
      res.json({
        success: true,
        authority: authorityContext,
        message: 'Queen authority verified'
      });
    } else {
      res.status(403).json({
        success: false,
        error: 'Queen authority verification failed'
      });
    }
  } catch (error) {
    console.error('[Queen Access] Authority verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Authority verification system error'
    });
  }
});

export default router;
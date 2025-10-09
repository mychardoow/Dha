/**
 * DHA PUBLIC ROUTES
 * Simple navigation and verification routes for public DHA users
 */

import { Router } from 'express';
import { dhaPublicAI } from '../services/dha-public-ai.js';
import { storage } from '../storage.js';

const router = Router();

/**
 * POST /api/public/ask
 * Simple DHA navigation and verification assistance
 */
router.post('/ask', async (req, res) => {
  try {
    const { message, sessionId } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    const response = await dhaPublicAI.processPublicQuery({
      message,
      sessionId: sessionId || 'public-session',
      userType: 'public'
    });

    // Log public interaction for analytics
    await storage.createSecurityEvent({
      eventType: "dha_public_query",
      severity: "low",
      details: {
        sessionId: sessionId || 'public-session',
        messageLength: message.length,
        responseSuccess: response.success,
        timestamp: new Date()
      }
    });

    res.json(response);
  } catch (error) {
    console.error('[DHA Public] Query processing error:', error);
    res.status(500).json({
      success: false,
      content: "I apologize, but I'm experiencing technical difficulties. Please try again or visit your nearest DHA office for assistance.",
      suggestedActions: ["Try rephrasing your question", "Visit DHA office", "Call DHA helpline"]
    });
  }
});

/**
 * GET /api/public/services
 * Get list of available DHA services
 */
router.get('/services', async (req, res) => {
  try {
    const services = {
      success: true,
      services: [
        {
          name: 'Birth Certificates',
          description: 'Apply for or request copies of birth certificates',
          processingTime: '5-7 working days',
          fee: 'R75'
        },
        {
          name: 'Passports',
          description: 'Apply for new or renew existing passports',
          processingTime: '13 working days (standard), 3 working days (urgent)',
          fee: 'R600 (standard), R1300 (urgent)'
        },
        {
          name: 'Identity Documents',
          description: 'Apply for new or replace lost/damaged ID documents',
          processingTime: '8 weeks (first time), 6 weeks (replacement)',
          fee: 'Free (first time), R140 (replacement)'
        },
        {
          name: 'Marriage Certificates',
          description: 'Apply for copies of marriage certificates',
          processingTime: '5-7 working days',
          fee: 'R75'
        },
        {
          name: 'Death Certificates',
          description: 'Apply for copies of death certificates',
          processingTime: '5-7 working days',
          fee: 'R75'
        },
        {
          name: 'Visas and Permits',
          description: 'Apply for various types of visas and permits',
          processingTime: '2-8 weeks depending on type',
          fee: 'Varies by permit type'
        }
      ],
      helpfulLinks: [
        'Find DHA office locations',
        'Check processing times',
        'Download application forms',
        'Schedule appointments'
      ]
    };

    res.json(services);
  } catch (error) {
    console.error('[DHA Public] Services listing error:', error);
    res.status(500).json({
      success: false,
      error: 'Unable to retrieve services information'
    });
  }
});

/**
 * GET /api/public/offices
 * Get DHA office information
 */
router.get('/offices', async (req, res) => {
  try {
    const { province, city } = req.query;

    // Simplified office information (in production, this would query a real database)
    const offices = {
      success: true,
      message: 'DHA Office Information',
      generalInfo: {
        hours: 'Monday-Friday 8:00-15:30',
        requirements: 'Bring all required documents and valid ID',
        appointments: 'Some services require appointments - check DHA website'
      },
      searchInfo: province || city ? 
        `Showing offices for ${province ? `${province} province` : ''}${city ? ` in ${city}` : ''}` :
        'Use DHA website or call helpline to find your nearest office',
      helpline: '0800 601 190',
      website: 'www.dha.gov.za'
    };

    res.json(offices);
  } catch (error) {
    console.error('[DHA Public] Office information error:', error);
    res.status(500).json({
      success: false,
      error: 'Unable to retrieve office information'
    });
  }
});

/**
 * GET /api/public/requirements/:service
 * Get document requirements for specific service
 */
router.get('/requirements/:service', async (req, res) => {
  try {
    const { service } = req.params;
    
    const requirements: Record<string, any> = {
      'birth-certificate': {
        service: 'Birth Certificate',
        required: [
          'Hospital birth record or clinic card',
          'Parents\' identity documents',
          'Marriage certificate (if parents are married)',
          'Completed application form'
        ],
        fee: 'R75',
        processingTime: '5-7 working days'
      },
      'passport': {
        service: 'Passport',
        required: [
          'South African identity document',
          'Birth certificate',
          'Two passport photographs',
          'Completed application form',
          'Previous passport (if renewal)'
        ],
        fee: 'R600 (standard), R1300 (urgent)',
        processingTime: '13 working days (standard), 3 working days (urgent)'
      },
      'id-document': {
        service: 'Identity Document',
        required: [
          'Birth certificate',
          'Fingerprints (taken at office)',
          'Photographs (taken at office)',
          'Completed application form'
        ],
        fee: 'Free (first time), R140 (replacement)',
        processingTime: '8 weeks (first time), 6 weeks (replacement)'
      }
    };

    const serviceInfo = requirements[service];
    
    if (serviceInfo) {
      res.json({
        success: true,
        ...serviceInfo
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Service requirements not found',
        availableServices: Object.keys(requirements)
      });
    }
  } catch (error) {
    console.error('[DHA Public] Requirements lookup error:', error);
    res.status(500).json({
      success: false,
      error: 'Unable to retrieve service requirements'
    });
  }
});

export default router;
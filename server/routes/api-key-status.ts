
import { Router, Request, Response } from 'express';
import { universalAPIOverride } from '../middleware/universal-api-override';

const router = Router();

/**
 * Get current status of all API keys
 */
router.get('/api/api-keys/status', (req: Request, res: Response) => {
  try {
    const status = universalAPIOverride.getStatus();
    res.json({
      success: true,
      status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get API status'
    });
  }
});

/**
 * Force immediate retry for all missing API keys
 */
router.post('/api/api-keys/retry', async (req: Request, res: Response) => {
  try {
    await universalAPIOverride.forceImmediateRetry();
    const status = universalAPIOverride.getStatus();
    
    res.json({
      success: true,
      message: 'Forced retry completed',
      status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Retry failed'
    });
  }
});

/**
 * Test specific API key
 */
router.post('/api/api-keys/test/:service', (req: Request, res: Response) => {
  try {
    const { service } = req.params;
    const apiKey = universalAPIOverride.getAPIKey(service.toUpperCase());
    const isReal = universalAPIOverride.isRealAPI(service.toUpperCase());
    
    res.json({
      success: true,
      service,
      hasKey: Boolean(apiKey),
      isReal,
      keyPreview: apiKey ? apiKey.substring(0, 15) + '...' : 'N/A',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Test failed'
    });
  }
});

export default router;

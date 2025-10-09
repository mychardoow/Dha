import { Router } from 'express';
import { universalAPIManager } from '../services/universal-api-manager.js';

const router = Router();

/**
 * Get status of all API integrations
 */
router.get('/api/integrations/status', (req, res) => {
  try {
    const category = req.query.category as string | undefined;
    const status = universalAPIManager.getProviderStatus(category);

    const summary = {
      total: status.length,
      active: status.filter(p => p.isActive).length,
      healthy: status.filter(p => p.healthScore > 80).length,
      categories: [...new Set(status.map(p => p.category))]
    };

    res.json({
      success: true,
      summary,
      providers: status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get status'
    });
  }
});

/**
 * Get best provider for a category
 */
router.get('/api/integrations/best/:category', (req, res) => {
  try {
    const { category } = req.params;
    const feature = req.query.feature as string | undefined;

    const provider = universalAPIManager.getBestProvider(category, feature);

    if (!provider) {
      return res.status(404).json({
        success: false,
        error: `No active provider found for category: ${category}`
      });
    }

    res.json({
      success: true,
      provider: {
        name: provider.name,
        features: provider.features,
        healthScore: provider.successCount / Math.max(provider.successCount + provider.errorCount, 1)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to find provider'
    });
  }
});

export default router;
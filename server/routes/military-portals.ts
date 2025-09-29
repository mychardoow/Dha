// Military and Government Portal API Routes
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { militaryGovernmentPortals, PORTAL_TYPE, AUTH_METHOD, ACCESS_LEVEL } from '../services/military-government-portals';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

// Portal access schema
const portalAccessSchema = z.object({
  portalType: z.nativeEnum(PORTAL_TYPE),
  query: z.string(),
  authMethod: z.nativeEnum(AUTH_METHOD).optional(),
  accessLevel: z.nativeEnum(ACCESS_LEVEL).optional()
});

// Get all available portals
router.get('/portals', authenticate, (req: Request, res: Response) => {
  const portals = militaryGovernmentPortals.getActivePortals();
  res.json({
    success: true,
    totalPortals: portals.length,
    portals: portals.map(p => ({
      name: p.name,
      accessLevel: p.accessLevel,
      apis: p.apis.length,
      endpoints: p.endpoints.length,
      permissions: p.permissions
    }))
  });
});

// Access specific portal
router.post('/access', authenticate, async (req: Request, res: Response) => {
  try {
    const data = portalAccessSchema.parse(req.body);
    
    const result = await militaryGovernmentPortals.accessPortal(
      data.portalType,
      {
        portalType: data.portalType,
        authMethod: data.authMethod || AUTH_METHOD.MULTI_FACTOR,
        accessLevel: data.accessLevel || ACCESS_LEVEL.QUEEN_RAEESA_UNLIMITED
      },
      data.query
    );
    
    res.json({
      success: true,
      portal: data.portalType,
      result
    });
  } catch (error) {
    console.error('[Military Portal] Access error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Portal access failed'
    });
  }
});

// Global search across all portals
router.post('/global-search', authenticate, async (req: Request, res: Response) => {
  try {
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query is required'
      });
    }
    
    const results = await militaryGovernmentPortals.globalSearch(query);
    
    res.json({
      success: true,
      query,
      totalResults: results.length,
      results
    });
  } catch (error) {
    console.error('[Military Portal] Global search error:', error);
    res.status(500).json({
      success: false,
      error: 'Global search failed'
    });
  }
});

// Execute blockchain transaction on government network
router.post('/blockchain/execute', authenticate, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { network, contractAddress, method, params } = req.body;
    
    if (!network || !contractAddress || !method) {
      return res.status(400).json({
        success: false,
        error: 'Missing required blockchain parameters'
      });
    }
    
    const result = await militaryGovernmentPortals.executeBlockchainTransaction(
      network,
      contractAddress,
      method,
      params || []
    );
    
    res.json({
      success: true,
      transaction: result
    });
  } catch (error) {
    console.error('[Military Portal] Blockchain error:', error);
    res.status(500).json({
      success: false,
      error: 'Blockchain transaction failed'
    });
  }
});

// Get portal types enum
router.get('/types', (req: Request, res: Response) => {
  res.json({
    success: true,
    portalTypes: Object.values(PORTAL_TYPE),
    authMethods: Object.values(AUTH_METHOD),
    accessLevels: Object.values(ACCESS_LEVEL)
  });
});

// Health check
router.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    service: 'Military & Government Portal Integration',
    status: 'OPERATIONAL',
    capabilities: [
      'DOD Access',
      'CIA/FBI/NSA Integration',
      'NATO Alliance Network',
      'Web3 Blockchain Access',
      'CAC/PIV Authentication',
      'Global Portal Search'
    ]
  });
});

export default router;
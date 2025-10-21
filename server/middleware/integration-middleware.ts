/**
 * Integration Middleware
 * Ensures seamless communication between frontend, backend, and other middleware
 */

import { Request, Response, NextFunction } from 'express';
import { IntegrationService } from '../services/integration-service.js';
import { WebSocket } from 'ws';

interface EnhancedRequest extends Request {
  integrationState?: any;
}

export const integrationMiddleware = () => {
  const integrationService = IntegrationService.getInstance();

  return async (req: EnhancedRequest, res: Response, next: NextFunction) => {
    try {
      // Attach integration state to request
      req.integrationState = integrationService.getState();

      // Track pending requests
      req.integrationState.pendingRequests++;

      // Handle WebSocket upgrades
      if (req.headers.upgrade === 'websocket') {
        const ws = new WebSocket(req.url);
        integrationService.addClient(ws);
      }

      // Monitor response
      res.on('finish', () => {
        req.integrationState.pendingRequests--;
        
        // Collect response metrics
        const responseTime = Date.now() - req.integrationState.lastSync;
        const statusCode = res.statusCode;
        
        // Update integration state
        if (statusCode >= 500) {
          req.integrationState.syncErrors++;
        }
      });

      next();
    } catch (error) {
      console.error('Integration middleware error:', error);
      next(error);
    }
  };
};
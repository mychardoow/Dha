import { Request, Response, NextFunction } from 'express';

/**
 * Async handler wrapper for Express routes
 * Automatically catches async errors and passes them to Express error handling
 */
export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => 
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
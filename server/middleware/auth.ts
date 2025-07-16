import { Request, Response, NextFunction } from 'express';

// Simple API key validation middleware
export function validateApiKey(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
  
  // For now, use a simple API key. In production, this should be stored securely
  const validApiKey = process.env.EXTERNAL_API_KEY || 'glo-head-spa-external-2024';
  
  if (!apiKey || apiKey !== validApiKey) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Valid API key required',
      code: 'INVALID_API_KEY'
    });
  }
  
  next();
}

// Optional API key validation for endpoints that can work with or without auth
export function optionalApiKey(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
  
  if (apiKey) {
    const validApiKey = process.env.EXTERNAL_API_KEY || 'glo-head-spa-external-2024';
    if (apiKey !== validApiKey) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid API key provided',
        code: 'INVALID_API_KEY'
      });
    }
  }
  
  // Add auth status to request for logging
  (req as any).authenticated = !!apiKey;
  next();
} 
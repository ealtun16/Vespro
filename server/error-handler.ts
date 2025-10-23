import type { Request, Response, NextFunction } from 'express';
import logger, { logApiError } from './logger';

// Global error handler middleware
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Log the error with full context
  logApiError(
    req.originalUrl || req.url,
    err,
    req,
    {
      statusCode: (err as any).statusCode || 500,
      isOperational: (err as any).isOperational || false,
    }
  );

  // Don't expose internal errors to client
  const statusCode = (err as any).statusCode || 500;
  const message = statusCode === 500 
    ? 'Internal server error' 
    : err.message || 'An error occurred';

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      details: err,
    }),
  });
}

// 404 handler
export function notFoundHandler(req: Request, res: Response) {
  logger.warn('404 Not Found', {
    method: req.method,
    url: req.originalUrl || req.url,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });

  res.status(404).json({
    success: false,
    message: 'Resource not found',
  });
}

// Async error wrapper to catch async errors
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

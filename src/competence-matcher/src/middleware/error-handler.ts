import { Request, Response, NextFunction } from 'express';
import { CompetenceMatcherError } from '../utils/errors';
import { logError } from './logging';

/**
 * Central error handler middleware
 * Catches all errors and provides consistent error responses
 */
export function errorHandler(
  error: Error | CompetenceMatcherError,
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const requestId = (req as any).requestId || 'unknown';

  if (error instanceof CompetenceMatcherError) {
    // Handle our custom errors
    logError(error, error.context, requestId, {
      statusCode: error.statusCode,
      details: error.details,
      path: req.path,
      method: req.method,
    });

    res.status(error.statusCode).json({
      error: {
        message: error.message,
        context: error.context,
        requestId: error.requestId || requestId,
        ...(error.details && { details: error.details }),
      },
    });
  } else {
    // Handle unexpected errors
    logError(error, 'unhandled_error', requestId, {
      path: req.path,
      method: req.method,
      body: req.body,
      query: req.query,
      params: req.params,
    });

    res.status(500).json({
      error: {
        message: 'An unexpected error occurred',
        context: 'internal_server_error',
        requestId: requestId,
      },
    });
  }
}

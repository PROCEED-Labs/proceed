import { Request, Response, NextFunction } from 'express';
import { CompetenceMatcherError } from '../utils/errors';
import { getLogger } from '../utils/logger';

const logger = getLogger();

/**
 * Enhanced error handler middleware using the new logging system
 */
export function errorHandler(
  error: Error | CompetenceMatcherError,
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const requestId = req.requestId || 'unknown';

  if (error instanceof CompetenceMatcherError) {
    // Handle our custom errors
    logger.error('request', `${error.context}: ${error.message}`, error, {
      statusCode: error.statusCode,
      details: error.details,
      path: req.path,
      method: req.method,
      requestId,
    }, requestId);

    res.status(error.statusCode).json({
      error: {
        message: error.message,
        context: error.context,
        requestId: requestId,
        ...(error.details && { details: error.details }),
      },
    });
  } else {
    // Handle unexpected errors
    logger.error('system', 'Unhandled error occurred', error, {
      path: req.path,
      method: req.method,
      body: req.body,
      query: req.query,
      params: req.params,
      requestId,
    }, requestId);

    res.status(500).json({
      error: {
        message: 'An unexpected error occurred',
        context: 'internal_server_error',
        requestId: requestId,
      },
    });
  }
}

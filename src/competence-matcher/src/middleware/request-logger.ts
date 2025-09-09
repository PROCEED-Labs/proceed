import { Request, Response, NextFunction } from 'express';
import { getLogger } from '../utils/logger';

const logger = getLogger();

// Extend Request interface to include requestId
declare global {
  namespace Express {
    interface Request {
      requestId: string;
      startTime: number;
    }
  }
}

/**
 * Request logger middleware
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const requestId = logger.generateRequestId();
  const startTime = Date.now();

  // Add requestId and startTime to request for later use
  req.requestId = requestId;
  req.startTime = startTime;

  // Log incoming request
  logger.debug(
    'request',
    `Incoming ${req.method} ${req.path}`,
    {
      query: req.query,
      params: req.params,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      contentType: req.headers['content-type'],
    },
    requestId,
  );

  // Override res.send to capture response
  // res.json seems to use .send internally, so we can override send
  const originalSend = res.send;
  res.send = function (body) {
    const responseTime = Date.now() - startTime;

    // Log the request completion
    logger.request(req.method, req.path, res.statusCode, responseTime, requestId, {
      contentLength: res.get('content-length'),
      responseSize: body ? Buffer.byteLength(body, 'utf8') : 0,
    });

    return originalSend.call(this, body);
  };

  next();
}

/**
 * Middleware to extract requestId from existing requests for backward compatibility
 */
export function requestIdExtractor(req: Request, res: Response, next: NextFunction): void {
  // If requestId is not already set, generate one
  if (!req.requestId) {
    req.requestId = logger.generateRequestId();
    req.startTime = Date.now();
  }
  next();
}

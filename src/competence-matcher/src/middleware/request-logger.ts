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
 * Extract real IP address from request, considering proxy headers
 */
function getRealIP(req: Request): string {
  // Check for common proxy headers in order of preference
  const forwardedFor = req.headers['x-forwarded-for'];
  const realIP = req.headers['x-real-ip'];
  const clientIP = req.headers['x-client-ip'];

  // x-forwarded-for can be a comma-separated list, take the first (original) IP
  if (forwardedFor) {
    const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
    return ips.split(',')[0].trim();
  }

  // Single IP headers
  if (realIP) {
    return Array.isArray(realIP) ? realIP[0] : realIP;
  }

  if (clientIP) {
    return Array.isArray(clientIP) ? clientIP[0] : clientIP;
  }

  // Fallback to express's req.ip (which might be the proxy IP)
  return req.ip || 'unknown';
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
  const realIP = getRealIP(req);
  logger.debug(
    'request',
    `Incoming ${req.method} ${req.path}`,
    {
      query: req.query,
      params: req.params,
      ip: realIP,
      proxyIP: req.ip, // Keep original for debugging
      userAgent: req.headers['user-agent'],
      contentType: req.headers['content-type'],
      // Include proxy headers for debugging if they exist
      ...(req.headers['x-forwarded-for'] && { 'x-forwarded-for': req.headers['x-forwarded-for'] }),
      ...(req.headers['x-real-ip'] && { 'x-real-ip': req.headers['x-real-ip'] }),
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
      ip: getRealIP(req),
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

import { Request, Response, NextFunction } from 'express';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { config } from '../config';
import { randomUUID } from 'node:crypto';
import { LogEntry } from '../utils/types';

const { verbose, logDir, logFile } = config;

const today = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
const logFilePath = `${logFile.replace('.log', '')}-${today}.log`;

// Create logs directory if it doesn't exist
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Generate unique request ID
function generateRequestId(): string {
  return `req_${Date.now()}_${randomUUID()}`;
}

// Write log entry to file
function writeLogToFile(logEntry: LogEntry): void {
  const logLine = JSON.stringify(logEntry) + '\n';
  fs.appendFileSync(logFilePath, logLine, 'utf8');
}

// Log error with context
export function logError(
  error: Error | string,
  context: string,
  requestId?: string,
  additionalData?: any,
): void {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  const logEntry: LogEntry = {
    timestamp: new Date().toISOString(),
    requestId: requestId || 'system',
    type: 'error',
    error: errorMessage,
    errorStack,
    context,
    ...additionalData,
  };

  // Console logging if verbose
  if (verbose) {
    console.error(`[${context}] Error:`, errorMessage);
    if (errorStack && verbose) {
      console.error('Stack trace:', errorStack);
    }
    if (additionalData) {
      console.error('Additional data:', additionalData);
    }
  }

  // Write to log file
  writeLogToFile(logEntry);
}

// Enhanced request logger middleware
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const requestId = generateRequestId();
  const startTime = Date.now();

  // Add requestId to request for later use
  (req as any).requestId = requestId;

  const requestLogEntry: LogEntry = {
    timestamp: new Date().toISOString(),
    requestId,
    type: 'request',
    method: req.method,
    path: req.path,
    query: req.query,
    body: req.body,
    headers: req.headers,
    params: req.params,
    ip: req.ip,
    realIp: req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || req.ip,
  };

  // Console logging if verbose
  if (verbose) {
    console.table([
      {
        timestamp: requestLogEntry.timestamp,
        requestId: requestLogEntry.requestId,
        type: requestLogEntry.type,
        method: requestLogEntry.method,
        path: requestLogEntry.path,
        query:
          typeof requestLogEntry.query === 'object'
            ? JSON.stringify(requestLogEntry.query, null, 2)
            : requestLogEntry.query,
        headers:
          typeof requestLogEntry.headers === 'object'
            ? JSON.stringify(requestLogEntry.headers, null, 2)
            : requestLogEntry.headers,
        params:
          typeof requestLogEntry.params === 'object'
            ? JSON.stringify(requestLogEntry.params, null, 2)
            : requestLogEntry.params,
        ip: requestLogEntry.ip,
        realIp:
          typeof requestLogEntry.realIp === 'object'
            ? JSON.stringify(requestLogEntry.realIp, null, 2)
            : requestLogEntry.realIp,
      },
    ]);
  }

  // Write request to log file
  writeLogToFile(requestLogEntry);

  // Override res.json to capture response - this is not needed as we will override res.send which appears to be used by res.json internally
  // This is commented out to avoid double logging
  // const originalJson = res.json;
  // res.json = function (obj) {
  //   const responseTime = Date.now() - startTime;

  //   const responseLogEntry: LogEntry = {
  //     timestamp: new Date().toISOString(),
  //     requestId,
  //     type: 'response',
  //     statusCode: res.statusCode,
  //     responseTime,
  //     body: obj,
  //   };

  //   // Console logging if verbose
  //   if (verbose) {
  //     console.table([responseLogEntry]);
  //   }

  //   // Write response to log file
  //   writeLogToFile(responseLogEntry);

  //   return originalJson.call(this, obj);
  // };

  // Override res.send to capture response
  const originalSend = res.send;
  res.send = function (body) {
    const responseTime = Date.now() - startTime;

    const responseLogEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      requestId,
      type: 'response',
      statusCode: res.statusCode,
      responseTime,
      body: body,
    };

    // Console logging if verbose
    if (verbose) {
      console.table([
        {
          timestamp: responseLogEntry.timestamp,
          requestId: responseLogEntry.requestId,
          type: responseLogEntry.type,
          statusCode: responseLogEntry.statusCode,
          responseTime: responseLogEntry.responseTime,
          // body: responseLogEntry.body,
        },
      ]);
    }

    // Write response to log file
    writeLogToFile(responseLogEntry);

    return originalSend.call(this, body);
  };

  next();
}

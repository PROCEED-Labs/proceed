import * as fs from 'node:fs';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';
import { config } from '../config';
import { LogLevel, LogType, LogEntry, LoggerConfig } from './types';

// Re-export types for convenience
export { LogLevel, LogType, LogEntry, LoggerConfig } from './types';

export function createLoggerConfig(): LoggerConfig {
  // Parse enabled log types from config
  const enabledTypes = config.logTypes
    .split(',')
    .map((type) => type.trim())
    .filter((type) =>
      ['server', 'request', 'worker', 'database', 'model', 'system'].includes(type),
    ) as LogType[];

  // Convert string log level to enum
  const logLevelMap: { [key: string]: LogLevel } = {
    DEBUG: LogLevel.DEBUG,
    INFO: LogLevel.INFO,
    WARN: LogLevel.WARN,
    ERROR: LogLevel.ERROR,
  };

  const mappedLevel = logLevelMap[config.logLevel.toUpperCase()];

  return {
    level: mappedLevel !== undefined ? mappedLevel : LogLevel.INFO,
    enabledTypes,
    enableConsole: config.logToConsole,
    enableFile: config.logToFile,
    logDir: config.logPath,
    colorize: true,
  };
}

// ANSI color codes for console output
const colors = {
  DEBUG: '\x1b[36m', // Cyan
  INFO: '\x1b[32m', // Green
  WARN: '\x1b[33m', // Yellow
  ERROR: '\x1b[31m', // Red
  reset: '\x1b[0m', // Reset
  dim: '\x1b[2m', // Dim
  bold: '\x1b[1m', // Bold
  gray: '\x1b[90m', // Gray
  red: '\x1b[31m', // Red
};

// Type colors for better visual distinction
const typeColors = {
  server: '\x1b[35m', // Magenta
  request: '\x1b[34m', // Blue
  worker: '\x1b[36m', // Cyan
  database: '\x1b[33m', // Yellow
  model: '\x1b[32m', // Green
  system: '\x1b[37m', // White
};

export class Logger {
  private static instance: Logger;
  private config: LoggerConfig;
  private logStreams: Map<string, fs.WriteStream> = new Map();

  private constructor(config: LoggerConfig) {
    this.config = config;
    this.initialiseLogStreams();
  }

  public static getInstance(config?: LoggerConfig): Logger {
    if (!Logger.instance) {
      if (!config) {
        throw new Error('Logger must be initialised with config on first call');
      }
      Logger.instance = new Logger(config);
    }
    return Logger.instance;
  }

  private initialiseLogStreams(): void {
    if (!this.config.enableFile) return;

    // Ensure log directory exists
    if (!fs.existsSync(this.config.logDir)) {
      fs.mkdirSync(this.config.logDir, { recursive: true });
    }

    const today = new Date().toISOString().split('T')[0];

    // Main log file (all logs)
    const mainLogPath = path.join(this.config.logDir, `competence-matcher-${today}.json`);
    this.logStreams.set('main', fs.createWriteStream(mainLogPath, { flags: 'a' }));

    // Error-only log file
    const errorLogPath = path.join(this.config.logDir, `errors-${today}.log`);
    this.logStreams.set('error', fs.createWriteStream(errorLogPath, { flags: 'a' }));

    // Request-only log file
    const requestLogPath = path.join(this.config.logDir, `requests-${today}.log`);
    this.logStreams.set('request', fs.createWriteStream(requestLogPath, { flags: 'a' }));
  }

  private shouldLog(level: LogLevel, type: LogType): boolean {
    return level >= this.config.level && this.config.enabledTypes.includes(type);
  }

  private formatTimestamp(): string {
    return new Date().toISOString().replace('T', ' ').replace('Z', '');
  }

  private formatConsoleMessage(entry: LogEntry): string {
    if (!this.config.colorize) {
      return this.formatPlainMessage(entry);
    }

    const levelColor = colors[LogLevel[entry.level] as keyof typeof colors];
    const typeColor = typeColors[entry.type];
    const timestamp = `${colors.gray}[${entry.timestamp}]${colors.reset}`;
    const level = `${levelColor}${entry.levelName.padEnd(5)}${colors.reset}`;
    const type = `${typeColor}[${entry.type}${entry.requestId ? `:${String(entry.requestId).slice(0, 8)}` : ''}]${colors.reset}`;
    const message = entry.message;

    let output = `${timestamp} ${level} ${type} ${message}`;

    // Add data if present
    if (entry.data) {
      const dataStr =
        typeof entry.data === 'object' ? JSON.stringify(entry.data, null, 2) : String(entry.data);
      output += `\n${colors.dim}${dataStr}${colors.reset}`;
    }

    // Add error details if present
    if (entry.error) {
      output += `\n${colors.red}Error: ${entry.error.message}${colors.reset}`;
      if (entry.error.stack) {
        output += `\n${colors.dim}${entry.error.stack}${colors.reset}`;
      }
    }

    return output;
  }

  private formatPlainMessage(entry: LogEntry): string {
    const timestamp = `[${entry.timestamp}]`;
    const level = entry.levelName.padEnd(5);
    const type = `[${entry.type}${entry.requestId ? `:${String(entry.requestId).slice(0, 8)}` : ''}]`;

    let output = `${timestamp} ${level} ${type} ${entry.message}`;

    if (entry.data) {
      const dataStr =
        typeof entry.data === 'object' ? JSON.stringify(entry.data) : String(entry.data);
      output += ` | ${dataStr}`;
    }

    if (entry.error) {
      output += ` | Error: ${entry.error.message}`;
    }

    return output;
  }

  private writeToFile(entry: LogEntry): void {
    if (!this.config.enableFile) return;

    // Write to main log file (structured JSON)
    const mainStream = this.logStreams.get('main');
    if (mainStream) {
      mainStream.write(JSON.stringify(entry) + '\n');
    }

    // Write to error log file (human readable)
    if (entry.level === LogLevel.ERROR) {
      const errorStream = this.logStreams.get('error');
      if (errorStream) {
        errorStream.write(this.formatPlainMessage(entry) + '\n');
      }
    }

    // Write to request log file
    if (entry.type === 'request') {
      const requestStream = this.logStreams.get('request');
      if (requestStream) {
        requestStream.write(this.formatPlainMessage(entry) + '\n');
      }
    }
  }

  private log(
    level: LogLevel,
    type: LogType,
    message: string,
    data?: any,
    error?: Error,
    requestId?: string,
  ): void {
    if (!this.shouldLog(level, type)) return;

    const entry: LogEntry = {
      timestamp: this.formatTimestamp(),
      level,
      levelName: LogLevel[level],
      type,
      message,
      requestId,
      data,
      error: error
        ? {
            message: error.message,
            stack: error.stack,
            name: error.name,
          }
        : undefined,
    };

    // Console output
    if (this.config.enableConsole) {
      console.log(this.formatConsoleMessage(entry));
    }

    // File output
    this.writeToFile(entry);
  }

  // Public logging methods
  public debug(type: LogType, message: string, data?: any, requestId?: string): void {
    this.log(LogLevel.DEBUG, type, message, data, undefined, requestId);
  }

  public info(type: LogType, message: string, data?: any, requestId?: string): void {
    this.log(LogLevel.INFO, type, message, data, undefined, requestId);
  }

  public warn(type: LogType, message: string, data?: any, requestId?: string): void {
    this.log(LogLevel.WARN, type, message, data, undefined, requestId);
  }

  public error(
    type: LogType,
    message: string,
    error?: Error,
    data?: any,
    requestId?: string,
  ): void {
    this.log(LogLevel.ERROR, type, message, data, error, requestId);
  }

  // Specialised logging methods for common patterns
  public request(
    method: string,
    path: string,
    statusCode: number,
    responseTime: number,
    requestId: string,
    additionalData?: any,
  ): void {
    const message = `${method} ${path} (${statusCode}) ${responseTime}ms`;
    this.log(LogLevel.INFO, 'request', message, additionalData, undefined, requestId);
  }

  public worker(message: string, data?: any, requestId?: string): void {
    this.log(LogLevel.DEBUG, 'worker', message, data, undefined, requestId);
  }

  public workerInfo(message: string, data?: any, requestId?: string): void {
    this.log(LogLevel.INFO, 'worker', message, data, undefined, requestId);
  }

  public workerError(message: string, error?: Error, data?: any, requestId?: string): void {
    this.log(LogLevel.ERROR, 'worker', message, data, error, requestId);
  }

  public database(message: string, data?: any, requestId?: string): void {
    this.log(LogLevel.DEBUG, 'database', message, data, undefined, requestId);
  }

  public databaseError(message: string, error?: Error, data?: any, requestId?: string): void {
    this.log(LogLevel.ERROR, 'database', message, data, error, requestId);
  }

  public model(message: string, data?: any, requestId?: string): void {
    this.log(LogLevel.DEBUG, 'model', message, data, undefined, requestId);
  }

  public modelInfo(message: string, data?: any, requestId?: string): void {
    this.log(LogLevel.INFO, 'model', message, data, undefined, requestId);
  }

  // Utility methods
  public generateRequestId(): string {
    return `req_${Date.now()}_${randomUUID().slice(0, 8)}`;
  }

  public close(): void {
    for (const stream of this.logStreams.values()) {
      stream.end();
    }
    this.logStreams.clear();
  }

  // Update configuration
  public updateConfig(newConfig: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // Reinitialise streams if file logging config changed
    if (newConfig.enableFile !== undefined || newConfig.logDir) {
      this.close();
      this.initialiseLogStreams();
    }
  }
}

// Export singleton instance getter
export const getLogger = () => Logger.getInstance();

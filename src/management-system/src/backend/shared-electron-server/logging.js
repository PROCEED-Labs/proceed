/* eslint-disable no-console */
import winston from 'winston';
import { getBackendConfig } from './data/config.js';

const myFormat = winston.format.printf(({ timestamp, level, message }) => {
  return `${timestamp} [${level.toUpperCase()}] ${message}`;
});

const config = getBackendConfig();

console.log(`Created logger with logging level ${config.logLevel}`);

const logger = winston.createLogger({
  level: config.logLevel,
  format: winston.format.combine(winston.format.timestamp(), myFormat),
  transports: [new winston.transports.Console()],
});

export default logger;

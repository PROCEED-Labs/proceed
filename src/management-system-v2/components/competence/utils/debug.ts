/**
 * Centralised debug logging utility for competence-related functionality
 *
 * Usage:
 *   import { debugLog } from '../utils/debug';
 *   debugLog('context', 'message', data);
 *
 * To enable debug logging, set DEBUG = true
 */

const DEBUG = false; // Set to true to enable debug logs

export function debugLog(context: string, ...args: any[]) {
  if (DEBUG) {
    debugLog(`[Competence:${context}]`, ...args);
  }
}

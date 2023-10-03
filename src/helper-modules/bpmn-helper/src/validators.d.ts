/**
 * @module @proceed/bpmn-helper
 */
/**
 * Checks if a process referenced in a call activity contains only a single non-typed start event
 *
 * @param {string} xml
 * @param {string} processId
 * @returns {boolean} true if called process is valid
 */
export function validateCalledProcess(xml: string, processId: string): boolean;

/**
 * @module @proceed/bpmn-helper
 */
/**
 * Exporter name is used in the bpmn definitions parts
 *
 * @returns {string} static exporter name
 */
export function getExporterName(): string;
/**
 * Exporter version is used in the bpmn definitions parts
 *
 * This version should be adjusted when this module (bpmn-helper)
 * changes or any changes in the management-system occur regarding the export
 *
 * @returns {string} static exporter version
 */
export function getExporterVersion(): string;
/**
 * Generate a new ID for PROCEED BPMN elements
 *
 * @param {string} [prefix] optional prefix for the id
 * @returns {string} short id in the form '0bkz1kb'
 */
export function generateBpmnId(prefix?: string): string;
/**
 * Generate a new ID for the 'definitions' element in a PROCEED process
 * @returns {string} a new PROCEED definitions 'id'
 */
export function generateDefinitionsId(): string;
export function generateProcessId(): string;
/**
 * Generates the 'fileName' attribute string of a PROCEED UserTask
 * @returns A new 'filename' value
 */
export function generateUserTaskFileName(): string;
export function generateScriptTaskFileName(): string;
/**
 * Return the string for the 'implementation' attribute in a UserTask
 * @returns {String} URL of the HTML spec
 */
export function getUserTaskImplementationString(): string;
export function generateTargetNamespace(id: any): string;
/**
 * Creates a minimal valid proceed bpmn
 *
 * @param {*} processId the id to use for the contained process
 * @param {string} startEventId the id to use for the start event
 * @returns {string} a minimal valid proceed bpmn
 */
export function initXml(processId?: any, startEventId?: string): string;

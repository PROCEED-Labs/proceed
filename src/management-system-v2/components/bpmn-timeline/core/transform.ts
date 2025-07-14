/**
 * BPMN to Gantt transformation logic
 *
 * This module orchestrates the transformation of BPMN process definitions
 * into Gantt chart data using gateway-semantic path traversal.
 *
 * **Architecture**:
 * 1. Validate and extract BPMN process
 * 2. Detect gateway issues and separate supported elements
 * 3. Use path-based traversal for ALL modes (earliest/every/latest)
 * 4. Apply mode-specific result processing
 * 5. Filter dependencies based on gateway visibility (renderGateways)
 */

import type {
  BPMNDefinitions,
  BPMNFlowElement,
  TransformationResult,
  TransformationIssue,
  DefaultDurationInfo,
} from '../types/types';
import { groupAndSortElements } from '../utils/utils';
import {
  handleEveryOccurrenceMode,
  handleLatestOccurrenceMode,
  handleEarliestOccurrenceMode,
  type ModeHandlerResult,
} from '../transformers/mode-handlers';

// ============================================================================
// Main Transformation Function
// ============================================================================

import {
  validateAndExtractProcess,
  detectAndReportGatewayIssues,
  separateSupportedElements,
  calculateTimingsForMode,
  filterDependenciesForVisibleElements,
} from './transform-helpers';

/**
 * Transform BPMN process to Gantt chart data
 *
 * Uses unified path-based traversal for all modes with gateway-semantic processing.
 * Gateways are processed during traversal and can be optionally hidden via renderGateways.
 *
 * @param definitions - BPMN process definitions from bpmn-js
 * @param startTime - Process start time (default: current time)
 * @param traversalMode - How to handle multiple paths: earliest/every/latest occurrence
 * @param loopDepth - Maximum loop iterations for path-based modes
 * @param chronologicalSorting - Sort elements by start time vs discovery order
 * @param renderGateways - Show gateway instances in timeline (default: false)
 */
export function transformBPMNToGantt(
  definitions: BPMNDefinitions,
  startTime: number = Date.now(),
  traversalMode:
    | 'earliest-occurrence'
    | 'every-occurrence'
    | 'latest-occurrence' = 'earliest-occurrence',
  loopDepth: number = 1,
  chronologicalSorting: boolean = false,
  renderGateways: boolean = false,
): TransformationResult {
  const issues: TransformationIssue[] = [];
  const defaultDurations: DefaultDurationInfo[] = [];

  // Validate and extract process
  const { process } = validateAndExtractProcess(definitions);
  if (!process) {
    issues.push({
      elementId: 'root',
      elementType: 'Process',
      reason: 'No valid process found in definitions',
      severity: 'error',
    });
    return createEmptyResult(issues, defaultDurations);
  }

  // Detect and report gateway issues
  const gatewayIssues = detectAndReportGatewayIssues(process.flowElements, renderGateways);
  issues.push(...gatewayIssues);

  // Separate supported and unsupported elements
  const { supportedElements, issues: elementIssues } = separateSupportedElements(
    process.flowElements,
  );
  issues.push(...elementIssues);

  // Calculate timings using path-based traversal
  const {
    timingsMap: pathTimings,
    dependencies: pathDependencies,
    issues: pathIssues,
  } = calculateTimingsForMode(supportedElements, startTime, defaultDurations, loopDepth);

  // Add path traversal issues (loop limits, path explosion)
  issues.push(...pathIssues);

  // Handle mode-specific transformations
  const modeResult = handleTraversalMode(
    traversalMode,
    pathTimings,
    pathDependencies,
    supportedElements,
    renderGateways,
  );

  // Group and sort elements by connected components and start time
  const sortedElements = groupAndSortElements(
    modeResult.ganttElements,
    modeResult.elementToComponent,
    chronologicalSorting,
  );

  // Filter dependencies to only include visible elements
  const finalDependencies = filterDependenciesForVisibleElements(
    modeResult.ganttDependencies,
    modeResult.ganttElements,
    renderGateways,
  );

  return {
    elements: sortedElements,
    dependencies: finalDependencies,
    issues,
    defaultDurations,
    errors: issues.filter((issue) => issue.severity === 'error'),
    warnings: issues.filter((issue) => issue.severity === 'warning'),
  };
}

/**
 * Handle mode-specific transformation logic
 */
function handleTraversalMode(
  traversalMode: 'earliest-occurrence' | 'every-occurrence' | 'latest-occurrence',
  pathTimings: Map<string, any[]>,
  pathDependencies: Array<{ sourceInstanceId: string; targetInstanceId: string; flowId: string }>,
  supportedElements: BPMNFlowElement[],
  renderGateways: boolean,
): ModeHandlerResult {
  switch (traversalMode) {
    case 'every-occurrence':
      return handleEveryOccurrenceMode(
        pathTimings,
        pathDependencies,
        supportedElements,
        renderGateways,
      );
    case 'latest-occurrence':
      return handleLatestOccurrenceMode(
        pathTimings,
        pathDependencies,
        supportedElements,
        renderGateways,
      );
    case 'earliest-occurrence':
    default:
      return handleEarliestOccurrenceMode(
        pathTimings,
        pathDependencies,
        supportedElements,
        renderGateways,
      );
  }
}

/**
 * Create empty result for error cases
 */
function createEmptyResult(
  issues: TransformationIssue[],
  defaultDurations: DefaultDurationInfo[],
): TransformationResult {
  return {
    elements: [],
    dependencies: [],
    issues,
    defaultDurations,
    errors: issues.filter((issue) => issue.severity === 'error'),
    warnings: issues.filter((issue) => issue.severity === 'warning'),
  };
}

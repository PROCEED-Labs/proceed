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
  extractInformationalArtifacts,
  filterDependenciesForVisibleElements,
  detectGhostDependenciesThroughGateways,
} from './transform-helpers';
import { calculateScopedTimings } from './scoped-traversal';
import { createBoundaryEventMapping } from '../utils/utils';

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
 * @param showGhostElements - Show ghost occurrences as ghost elements (default: false)
 * @param showGhostDependencies - Show dependencies to ghost elements (default: false)
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
  showGhostElements: boolean = false,
  showGhostDependencies: boolean = false,
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

  // Store original elements for color assignment (before any sub-process flattening)
  const originalElementsForColorAssignment = process.flowElements;

  // Extract informational artifacts (annotations, data objects, etc.)
  // Note: Some artifacts might be outside flowElements (e.g., in artifacts array)
  const allElementsForArtifacts = [
    ...(process.flowElements || []),
    ...(process.artifacts || []),
    ...(process.ioSpecification?.dataInputs || []),
    ...(process.ioSpecification?.dataOutputs || []),
  ];

  const informationalArtifacts = extractInformationalArtifacts(allElementsForArtifacts);

  // Calculate timings using path-based traversal

  const {
    timingsMap: pathTimings,
    dependencies: pathDependencies,
    flattenedElements,
    issues: pathIssues,
  } = calculateScopedTimings(supportedElements, startTime, defaultDurations, loopDepth);

  // Add path traversal issues (loop limits, path explosion)
  issues.push(...pathIssues);

  // Check for sub-processes and disable ghost elements completely if present
  const hasSubProcesses = supportedElements.some(
    (element) => element.$type === 'bpmn:SubProcess' || element.$type === 'bpmn:AdHocSubProcess',
  );

  let effectiveShowGhostElements = showGhostElements;
  let effectiveShowGhostDependencies = showGhostDependencies;

  if (hasSubProcesses && showGhostElements && traversalMode !== 'every-occurrence') {
    // Disable ghost elements when sub-processes are present in earliest/latest modes
    // Every-occurrence mode doesn't use ghost elements anyway
    effectiveShowGhostElements = false;
    effectiveShowGhostDependencies = false;

    issues.push({
      elementId: 'process-level-issue',
      elementType: 'Process',
      reason: `Ghost elements are not supported with sub-processes in "${traversalMode}" mode and have been automatically disabled. Sub-processes require precise parent-child relationships that conflict with ghost element rendering. Please use "Every Occurrence" mode for multi-instance sub-process visualization.`,
      severity: 'warning',
    });
  }

  // Create boundary event to task instance mapping BEFORE mode handling
  const boundaryEventMapping = createBoundaryEventMapping(pathDependencies);

  // Handle mode-specific transformations
  const modeResult = handleTraversalMode(
    traversalMode,
    pathTimings,
    pathDependencies,
    flattenedElements,
    renderGateways,
    effectiveShowGhostElements,
    effectiveShowGhostDependencies,
    defaultDurations,
    originalElementsForColorAssignment,
    boundaryEventMapping,
  );

  // Check for ghost dependencies through gateways (unsupported)
  // This check should run regardless of renderGateways setting, as the warning is about the data model
  if (effectiveShowGhostDependencies) {
    const ghostGatewayIssues = detectGhostDependenciesThroughGateways(
      modeResult.ganttElements,
      pathDependencies,
      supportedElements,
      renderGateways,
    );
    issues.push(...ghostGatewayIssues);
  }

  // Group and sort elements by connected components and start time
  const sortedElements = groupAndSortElements(
    modeResult.ganttElements,
    modeResult.elementToComponent,
    chronologicalSorting,
    modeResult.ganttDependencies,
  );

  // Filter dependencies to only include visible elements
  const finalDependencies = filterDependenciesForVisibleElements(
    modeResult.ganttDependencies,
    modeResult.ganttElements,
    renderGateways,
  );

  // Filter out gateway elements when renderGateways is false
  const visibleElements = renderGateways
    ? sortedElements
    : sortedElements.filter((el) => !el.type?.includes('gateway') && !el.id?.includes('Gateway'));

  return {
    elements: visibleElements,
    dependencies: finalDependencies,
    issues,
    defaultDurations,
    informationalArtifacts,
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
  showGhostElements: boolean,
  showGhostDependencies: boolean,
  defaultDurations: DefaultDurationInfo[],
  originalElementsForColorAssignment: BPMNFlowElement[],
  boundaryEventMapping: Map<string, string>,
): ModeHandlerResult {
  switch (traversalMode) {
    case 'every-occurrence':
      return handleEveryOccurrenceMode(
        pathTimings,
        pathDependencies,
        supportedElements,
        renderGateways,
        defaultDurations,
        originalElementsForColorAssignment,
        boundaryEventMapping,
      );
    case 'latest-occurrence':
      return handleLatestOccurrenceMode(
        pathTimings,
        pathDependencies,
        supportedElements,
        renderGateways,
        showGhostElements,
        showGhostDependencies,
        defaultDurations,
        originalElementsForColorAssignment,
        boundaryEventMapping,
      );
    case 'earliest-occurrence':
    default:
      return handleEarliestOccurrenceMode(
        pathTimings,
        pathDependencies,
        supportedElements,
        renderGateways,
        showGhostElements,
        showGhostDependencies,
        defaultDurations,
        originalElementsForColorAssignment,
        boundaryEventMapping,
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
    informationalArtifacts: [],
    errors: issues.filter((issue) => issue.severity === 'error'),
    warnings: issues.filter((issue) => issue.severity === 'warning'),
  };
}

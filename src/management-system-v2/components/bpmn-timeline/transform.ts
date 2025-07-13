/**
 * BPMN to Gantt transformation logic
 */

import type { GanttElementType, GanttDependency } from '@/components/gantt-chart-canvas/types';
import { DependencyType } from '@/components/gantt-chart-canvas/types';
import type {
  BPMNDefinitions,
  BPMNFlowElement,
  BPMNTask,
  BPMNEvent,
  BPMNSequenceFlow,
  BPMNGateway,
  TransformationResult,
  TransformationIssue,
  DefaultDurationInfo,
} from './types';
import { calculatePathBasedTimings } from './path-traversal';
import { calculateElementTimings } from './timing-calculator';
import {
  transformTask,
  transformEvent,
  transformGateway,
  transformSequenceFlow,
  getFlowType,
  isGatewayElement,
  isExclusiveGateway,
  isParallelGateway,
} from './element-transformers';
import {
  isTaskElement,
  isSupportedEventElement,
  isSequenceFlowElement,
  getUnsupportedElementReason,
  assignFlowColors,
  findConnectedComponents,
  groupAndSortElements,
  detectGatewayMismatches,
} from './utils';
import {
  handleEveryOccurrenceMode,
  handleLatestOccurrenceMode,
  handleEarliestOccurrenceMode,
  type ModeHandlerResult,
} from './mode-handlers';

// ============================================================================

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
  const { timingsMap: pathTimings, dependencies: pathDependencies } = calculateTimingsForMode(
    supportedElements,
    startTime,
    defaultDurations,
    loopDepth,
  );

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

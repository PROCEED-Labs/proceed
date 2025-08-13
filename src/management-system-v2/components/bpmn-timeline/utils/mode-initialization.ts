/**
 * Shared initialization utilities for mode handlers
 *
 * This module consolidates the identical initialization pattern that was
 * duplicated across all three mode handlers (Every, Latest, Earliest).
 *
 * The pattern includes:
 * - Creating O(1) lookup maps for performance optimization
 * - Transferring loop cut status from hidden gateways
 * - Assigning colors based on connected components
 * - Finding connected components for element grouping
 */

import type { BPMNFlowElement } from '../types/types';
import { createElementMaps } from './element-maps';
import { assignFlowColors, findConnectedComponents } from '../utils/utils';
import { parseInstanceId } from '../utils/id-helpers';
import { isGatewayElement } from '../transformers/element-transformers';

export interface ModeInitializationResult {
  elementMap: Map<string, BPMNFlowElement>;
  sequenceFlowMap: Map<string, BPMNFlowElement>;
  elementColors: Map<string, string>;
  originalElementToComponent: Map<string, number>;
}

/**
 * Transfer loop cut status from hidden gateway instances to previous non-gateway elements
 *
 * This function was extracted from mode-handlers.ts where it was duplicated across
 * all three mode handlers as part of their shared initialization pattern.
 *
 * When gateways are hidden (renderGateways=false), this function transfers their
 * loop cut status to the previous non-gateway elements in the execution path.
 */
function transferLoopCutFromGateways(
  pathTimings: Map<string, any[]>,
  supportedElements: BPMNFlowElement[],
  renderGateways: boolean,
): void {
  if (renderGateways) return; // No need to transfer if gateways are visible

  // Create O(1) lookup map for elements to avoid repeated O(n) searches
  const elementMap = new Map(supportedElements.map((el) => [el.id, el]));

  pathTimings.forEach((timingInstances, elementId) => {
    const element = elementMap.get(elementId);
    if (element && element.$type !== 'bpmn:SequenceFlow' && isGatewayElement(element)) {
      // This is a gateway - check if any instances have loop cut
      timingInstances.forEach((gatewayTiming) => {
        if (gatewayTiming.isLoopCut) {
          // Find the previous non-gateway element in the path that should show the loop cut
          let previousElement = null;
          let previousTiming = null;
          let maxInstanceNumber = 0;

          const { instanceNumber: gatewayInstanceNumber } = parseInstanceId(
            gatewayTiming.instanceId,
          );

          pathTimings.forEach((otherTimingInstances, otherElementId) => {
            const otherElement = elementMap.get(otherElementId);
            if (
              otherElement &&
              otherElement.$type !== 'bpmn:SequenceFlow' &&
              !isGatewayElement(otherElement)
            ) {
              otherTimingInstances.forEach((otherTiming) => {
                const { instanceNumber } = parseInstanceId(otherTiming.instanceId);

                if (instanceNumber > maxInstanceNumber && instanceNumber < gatewayInstanceNumber) {
                  maxInstanceNumber = instanceNumber;
                  previousElement = otherElement;
                  previousTiming = otherTiming;
                }
              });
            }
          });

          if (previousTiming) {
            (previousTiming as any).isLoopCut = true;
            (previousTiming as any).isLoop = false; // Prioritize loop cut over loop
          }
        }
      });
    }
  });
}

/**
 * Perform shared initialization for all mode handlers
 *
 * This consolidates the identical 12-line initialization pattern that was
 * duplicated across handleEveryOccurrenceMode, handleLatestOccurrenceMode,
 * and handleEarliestOccurrenceMode.
 *
 * @param pathTimings - Map of element timings by element ID
 * @param supportedElements - Array of supported BPMN elements
 * @param renderGateways - Whether to render gateways in the visualization
 * @returns Initialized maps and data structures needed by mode handlers
 */
export function initializeModeHandler(
  pathTimings: Map<string, any[]>,
  supportedElements: BPMNFlowElement[],
  renderGateways: boolean,
): ModeInitializationResult {
  // Create O(1) lookup maps for performance optimization
  const { elementMap, sequenceFlowMap } = createElementMaps(supportedElements);

  // Transfer loop cut status from hidden gateways
  transferLoopCutFromGateways(pathTimings, supportedElements, renderGateways);

  // Assign colors based on connected components using flattened elements to properly detect sub-process internal flows
  const elementColors = assignFlowColors(supportedElements);
  const originalElementToComponent = findConnectedComponents(supportedElements);

  return {
    elementMap,
    sequenceFlowMap,
    elementColors,
    originalElementToComponent,
  };
}

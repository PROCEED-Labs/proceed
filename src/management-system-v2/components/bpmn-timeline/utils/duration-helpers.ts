/**
 * Utility functions for handling durations in BPMN elements
 */

import {
  DEFAULT_TASK_DURATION_MS,
  DEFAULT_EVENT_DURATION_MS,
  DEFAULT_SEQUENCE_FLOW_DURATION_MS,
} from '../constants';
import { extractDuration } from './utils';
import type { BPMNFlowElement, DefaultDurationInfo } from '../types/types';

/**
 * Apply default duration to an element and track it for reporting
 */
export function applyDefaultDuration(
  element: BPMNFlowElement,
  defaultDurations: DefaultDurationInfo[],
): number {
  let duration = extractDuration(element);

  if (duration === 0) {
    // Determine default based on element type
    // Sub-processes don't get default durations - their duration is calculated from children
    if (
      (element.$type.includes('Task') || element.$type === 'bpmn:CallActivity') &&
      element.$type !== 'bpmn:SubProcess'
    ) {
      duration = DEFAULT_TASK_DURATION_MS;

      // Track this for default duration reporting
      defaultDurations.push({
        elementId: element.id,
        elementType: element.$type,
        elementName: element.name,
        appliedDuration: duration,
        durationType: 'task',
      });
    } else if (element.$type.includes('Event')) {
      duration = DEFAULT_EVENT_DURATION_MS;

      // Only track non-zero defaults (events are expected to be immediate)
      if (duration > 0) {
        defaultDurations.push({
          elementId: element.id,
          elementType: element.$type,
          elementName: element.name,
          appliedDuration: duration,
          durationType: 'event',
        });
      }
    } else if (element.$type === 'bpmn:SequenceFlow') {
      duration = DEFAULT_SEQUENCE_FLOW_DURATION_MS;

      // Only track non-zero defaults
      if (duration > 0) {
        defaultDurations.push({
          elementId: element.id,
          elementType: element.$type,
          elementName: element.name,
          appliedDuration: duration,
          durationType: 'sequenceFlow',
        });
      }
    }
  }

  return duration;
}

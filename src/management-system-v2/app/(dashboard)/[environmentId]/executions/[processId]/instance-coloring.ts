import { BPMNCanvasRef } from '@/components/bpmn-canvas';
import { InstanceInfo } from '@/lib/engines/deployment';
import { getMetaDataFromElement } from '@proceed/bpmn-helper/src/getters';
import { getPlannedEnd } from './instance-helpers';

export const colorOptions = [
  {
    key: 'processColors',
    label: 'Process Colors',
  },
  {
    key: 'noColors',
    label: 'No Colors',
  },
  {
    key: 'timeColors',
    label: 'Time Colors',
  },
  {
    key: 'executionColors',
    label: 'Execution Colors',
  },
] as const;
export type ColorOptions = (typeof colorOptions)[number]['key'];

// NOTE: this would break if some of these functions are used somewhere else
let appliedStyling: { elementId: string; color: string }[] = [];

export async function applyColors(
  bpmnViewer: BPMNCanvasRef,
  instance: InstanceInfo,
  colors: ColorOptions,
) {
  const canvas = bpmnViewer.getCanvas();

  // remove previous styling
  for (const { elementId, color } of appliedStyling) canvas.removeMarker(elementId, color);

  // apply new styling
  appliedStyling = flowElementsStyling(bpmnViewer, instance, colors);
  for (const { elementId, color } of appliedStyling) canvas.addMarker(elementId, color);
}

function getExecutionColor(executionState: string, wasInterrupted: boolean) {
  switch (executionState) {
    case 'COMPLETED':
      return wasInterrupted ? 'yellow' : 'green';
    case 'ERROR-SEMANTIC':
    case 'ERROR-TECHNICAL':
    case 'ERROR-CONSTRAINT_UNFULFILLED':
    case 'STOPPED':
    case 'ABORTED':
    case 'FAILED':
    case 'TERMINATED':
      return 'red';
    default:
      // SKIPPED
      return 'white';
  }
}

export function progressToColor(
  elementMetaData: any,
  timeInfo: { startTime: number | null; endTime: number | null },
) {
  let plannedStart = timeInfo.startTime;
  if (elementMetaData.timePlannedOccurrence) {
    plannedStart = new Date(elementMetaData.timePlannedOccurrence).getTime();
  }

  const plannedDuration = elementMetaData.timePlannedDuration;

  if (!plannedStart || !plannedDuration) return 'white';

  const plannedEnd = getPlannedEnd(plannedStart, plannedDuration);
  if (!plannedEnd) return 'white';

  if (timeInfo.endTime) {
    if (plannedEnd.getTime() > timeInfo.endTime) return 'green';
    else return 'red';
  }

  const durationInMs = plannedEnd.getTime() - plannedStart;
  const criticalTime = Math.floor(0.7 * durationInMs);
  const currentDate = new Date().getTime();

  if (currentDate < plannedStart + criticalTime) {
    return 'green';
  } else if (currentDate < plannedEnd.getTime()) {
    return 'orange';
  } else {
    return 'red';
  }
}

function flowElementsStyling(
  bpmnViewer: BPMNCanvasRef,
  instance: InstanceInfo,
  colors: ColorOptions,
) {
  const instanceFlowElements = bpmnViewer.getAllElements();

  return instanceFlowElements
    .map((element) => {
      if (
        element.type === 'bpmn:Process' ||
        element.type === 'bpmn:TextAnnotation' ||
        element.type === 'bpmn:Group' ||
        element.type === 'label'
      ) {
        return undefined;
      }
      let timeInfo: { startTime: number | null; endTime: number | null } = {
        startTime: null,
        endTime: null,
      };

      let logIdx = instance.log.length - 1;
      while (logIdx >= 0 && instance.log[logIdx].flowElementId !== element.id) logIdx--;
      const logEntry = logIdx >= 0 ? instance.log[logIdx] : undefined;

      const token = instance.tokens.find((token) => token.currentFlowElementId === element.id);

      if (token) {
        timeInfo.startTime = token.currentFlowElementStartTime;
      } else if (logEntry) {
        // if there is no more up to date token based time info use log info if some exists
        timeInfo = logEntry;
      }

      let color;
      switch (colors) {
        case 'timeColors':
          const metaData = getMetaDataFromElement(element);
          color = progressToColor(metaData, timeInfo);
          break;
        case 'noColors':
          color = 'white';
          break;
        case 'executionColors':
          if (logEntry) {
            color = getExecutionColor(logEntry.executionState, !!logEntry.executionWasInterrupted);
            break;
          }
        default:
      }

      if (!color) return undefined;

      return {
        elementId: element.id,
        color,
      };
    })
    .filter((style) => style) as { elementId: string; color: string }[];
}

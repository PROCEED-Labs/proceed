import { BPMNCanvasRef } from '@/components/bpmn-canvas';
import { InstanceInfo } from '@/lib/engines/deployment';
import { getMetaDataFromElement } from '@proceed/bpmn-helper/src/getters';
import { getPlanDelays, getTimeInfo } from './instance-helpers';

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

export function flushPreviousStyling() {
  appliedStyling = [];
}

export function applyColors(
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
  timeInfo: ReturnType<typeof getTimeInfo>,
  planInfo: ReturnType<typeof getPlanDelays>,
) {
  if (planInfo.plan.duration && timeInfo.start) {
    const criticalTime = Math.floor(0.7 * planInfo.plan.duration);
    const currentDate = Date.now();

    if (currentDate < timeInfo.start.getTime() + criticalTime) {
      return 'green';
    } else if (currentDate < timeInfo.start.getTime() + planInfo.plan.duration) {
      return 'orange';
    } else {
      return 'red';
    }
  }

  if (timeInfo.end) {
    if (!planInfo.plan.end) return 'white';
    if (planInfo.plan.end.getTime() >= timeInfo.end.getTime()) return 'green';
    else return 'red';
  }

  return 'white';
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

      let logIdx = instance.log.length - 1;
      while (logIdx >= 0 && instance.log[logIdx].flowElementId !== element.id) logIdx--;
      const logEntry = logIdx >= 0 ? instance.log[logIdx] : undefined;
      const token = instance.tokens.find((token) => token.currentFlowElementId === element.id);

      let color;
      switch (colors) {
        case 'timeColors':
          const metaData = getMetaDataFromElement(element.businessObject);
          const timeInfo = getTimeInfo({ element, logInfo: logEntry, token, instance });
          const planInfo = getPlanDelays({ elementMetaData: metaData, ...timeInfo });
          color = progressToColor(timeInfo, planInfo);
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

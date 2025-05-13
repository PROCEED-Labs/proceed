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
    const currentDate = timeInfo.end ? timeInfo.end.getTime() : Date.now();

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

export function flowElementsStyling(
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

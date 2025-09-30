/**
 * Collaboration and participant parsing utilities
 *
 * Handles multi-process BPMN diagrams where participants represent different processes.
 * Participants are treated as the highest-level organizational structure.
 */

import type {
  BPMNDefinitions,
  BPMNCollaboration,
  BPMNParticipant,
  BPMNProcess,
  BPMNMessageFlow,
  ParticipantMetadata,
  LaneMetadata,
  BPMNFlowElement,
} from '../types/types';
import type { GanttDependency } from '@/components/gantt-chart-canvas/types';
import { DependencyType } from '@/components/gantt-chart-canvas/types';
import { parseLaneHierarchy, annotateElementsWithLanes } from './lane-helpers';
import { flattenExpandedSubProcesses } from './utils';

/**
 * Parse collaboration structure from BPMN definitions
 * Returns participant metadata and consolidated elements from all processes
 */
export function parseCollaboration(definitions: BPMNDefinitions): {
  participants: ParticipantMetadata[];
  allElements: BPMNFlowElement[];
  messageFlows: BPMNMessageFlow[];
  hasCollaboration: boolean;
} {
  // Find collaboration
  const collaboration = definitions.rootElements?.find(
    (element): element is BPMNCollaboration => element.$type === 'bpmn:Collaboration',
  );

  if (!collaboration || !collaboration.participants) {
    // No collaboration - treat as single process
    const process = definitions.rootElements?.find(
      (element): element is BPMNProcess => element.$type === 'bpmn:Process',
    );

    if (!process) {
      return { participants: [], allElements: [], messageFlows: [], hasCollaboration: false };
    }

    // Create a virtual participant for the single process
    const laneHierarchy = process.laneSets ? parseLaneHierarchy(process.laneSets) : [];

    // CRITICAL FIX: Flatten sub-processes BEFORE adding lane metadata for single process too
    const flattenedElements = flattenExpandedSubProcesses(process.flowElements);
    const elementsWithLanes = annotateElementsWithLanes(flattenedElements, laneHierarchy);

    const virtualParticipant: ParticipantMetadata = {
      participantId: `virtual-participant-${process.id}`,
      participantName: process.name || 'Process',
      processId: process.id,
      processName: process.name,
      elementIds: flattenedElements.map((el) => el.id),
      laneHierarchy,
    };

    return {
      participants: [virtualParticipant],
      allElements: elementsWithLanes,
      messageFlows: [], // No message flows in single process
      hasCollaboration: false,
    };
  }

  // Parse collaboration with multiple participants
  const participants: ParticipantMetadata[] = [];
  const allElements: BPMNFlowElement[] = [];

  // Get all processes as a map for lookup
  const processMap = new Map<string, BPMNProcess>();
  definitions.rootElements?.forEach((element) => {
    if (element.$type === 'bpmn:Process') {
      processMap.set(element.id, element);
    }
  });

  collaboration.participants.forEach((participant) => {
    const processRef =
      typeof participant.processRef === 'string'
        ? participant.processRef
        : participant.processRef?.id;

    if (!processRef) return;

    const process = processMap.get(processRef);
    if (!process) return;

    // Parse lanes for this process
    const laneHierarchy = process.laneSets ? parseLaneHierarchy(process.laneSets) : [];

    // CRITICAL FIX: Flatten sub-processes BEFORE adding participant/lane metadata
    // This ensures that sub-process hierarchy is established before collaborative metadata
    const flattenedElements = flattenExpandedSubProcesses(process.flowElements);

    // Annotate flattened elements with lane metadata and participant info
    const elementsWithLanes = annotateElementsWithLanes(flattenedElements, laneHierarchy);
    const elementsWithParticipant = elementsWithLanes.map((element) => {
      // Don't use spread operator - it corrupts BPMN element properties!
      // Instead, directly assign metadata to preserve original object structure
      (element as any)._participantMetadata = {
        participantId: participant.id,
        participantName: participant.name,
        processId: process.id,
        processName: process.name,
      };
      return element;
    });

    participants.push({
      participantId: participant.id,
      participantName: participant.name || `Process ${process.name || process.id}`,
      processId: process.id,
      processName: process.name,
      elementIds: flattenedElements.map((el) => el.id),
      laneHierarchy,
    });

    allElements.push(...elementsWithParticipant);
  });

  // Extract message flows from collaboration
  const messageFlows = collaboration.messageFlows || [];

  return {
    participants,
    allElements,
    messageFlows,
    hasCollaboration: true,
  };
}

/**
 * Create participant groups for the timeline
 * These will be rendered as the highest-level organizational structure
 */
export function createParticipantGroups<
  T extends {
    id: string;
    start: number;
    elementType?: string;
    participantId?: string;
    participantName?: string;
  },
>(
  elements: T[],
  participants: ParticipantMetadata[],
): Array<T & { type: 'group'; isParticipantHeader: boolean }> {
  const participantGroups: Array<T & { type: 'group'; isParticipantHeader: boolean }> = [];

  participants.forEach((participant) => {
    const participantElements = elements.filter(
      (el) =>
        (el as any)._participantMetadata?.participantId === participant.participantId ||
        participant.elementIds.includes(el.id.split('_instance_')[0]), // Handle instance IDs
    );

    if (participantElements.length === 0) return;

    const participantHeader = {
      id: `participant-header-${participant.participantId}`,
      name: participant.participantName,
      type: 'group' as const,
      elementType: 'Participant',
      start: Math.min(...participantElements.map((el) => el.start)),
      end: Math.max(...participantElements.map((el) => (el as any).end || el.start)),
      color: '#f0f0f0', // Light gray for participants
      isParticipantHeader: true,
      participantId: participant.participantId,
      participantName: participant.participantName,
      childIds: participantElements.map((el) => el.id),
      isSubProcess: false,
      hasChildren: true,
      hierarchyLevel: -1, // Above lanes
    } as unknown as T & { type: 'group'; isParticipantHeader: boolean };

    participantGroups.push(participantHeader);
  });

  return participantGroups;
}

/**
 * Transform message flows into Gantt dependencies
 * Message flows represent communication between participants and don't affect timing
 */
export function transformMessageFlows(
  messageFlows: BPMNMessageFlow[],
  ganttElements: Array<{ id: string; participantId?: string }>,
  participants: ParticipantMetadata[],
): GanttDependency[] {
  const messageDependencies: GanttDependency[] = [];

  messageFlows.forEach((messageFlow) => {
    // Extract source and target IDs
    const sourceId =
      typeof messageFlow.sourceRef === 'string' ? messageFlow.sourceRef : messageFlow.sourceRef.id;
    const targetId =
      typeof messageFlow.targetRef === 'string' ? messageFlow.targetRef : messageFlow.targetRef.id;

    // Find actual source element (could be element or participant)
    let actualSourceId = sourceId;
    const sourceElement = ganttElements.find(
      (el) => el.id === sourceId || el.id.startsWith(`${sourceId}_instance_`),
    );
    if (sourceElement) {
      actualSourceId = sourceElement.id;
    } else {
      // Source might be a participant - look for participant header
      const participantHeaderId = `participant-header-${sourceId}`;
      const participantHeader = ganttElements.find((el) => el.id === participantHeaderId);
      if (participantHeader) {
        actualSourceId = participantHeader.id;
      } else {
        // Fallback: find first element in that participant
        const sourceParticipant = participants.find((p) => p.participantId === sourceId);
        if (sourceParticipant && sourceParticipant.elementIds.length > 0) {
          const firstElementInParticipant = ganttElements.find((el) =>
            sourceParticipant.elementIds.some(
              (elementId) => el.id === elementId || el.id.startsWith(`${elementId}_instance_`),
            ),
          );
          if (firstElementInParticipant) {
            actualSourceId = firstElementInParticipant.id;
          }
        }
      }
    }

    // Find actual target element (could be element or participant)
    let actualTargetId = targetId;
    const targetElement = ganttElements.find(
      (el) => el.id === targetId || el.id.startsWith(`${targetId}_instance_`),
    );
    if (targetElement) {
      actualTargetId = targetElement.id;
    } else {
      // Target might be a participant - look for participant header
      const participantHeaderId = `participant-header-${targetId}`;
      const participantHeader = ganttElements.find((el) => el.id === participantHeaderId);
      if (participantHeader) {
        actualTargetId = participantHeader.id;
      } else {
        // Fallback: find first element in that participant
        const targetParticipant = participants.find((p) => p.participantId === targetId);
        if (targetParticipant && targetParticipant.elementIds.length > 0) {
          const firstElementInParticipant = ganttElements.find((el) =>
            targetParticipant.elementIds.some(
              (elementId) => el.id === elementId || el.id.startsWith(`${elementId}_instance_`),
            ),
          );
          if (firstElementInParticipant) {
            actualTargetId = firstElementInParticipant.id;
          }
        }
      }
    }

    // Only create dependency if we found both source and target
    if (
      actualSourceId !== sourceId ||
      actualTargetId !== targetId ||
      (ganttElements.some((el) => el.id === actualSourceId) &&
        ganttElements.some((el) => el.id === actualTargetId))
    ) {
      messageDependencies.push({
        id: messageFlow.id,
        sourceId: actualSourceId,
        targetId: actualTargetId,
        type: DependencyType.START_TO_START, // Message flows don't affect timing
        name: messageFlow.name,
        flowType: 'message',
      });
    } else {
    }
  });

  return messageDependencies;
}

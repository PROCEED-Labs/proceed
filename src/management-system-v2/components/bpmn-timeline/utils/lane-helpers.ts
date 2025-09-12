/**
 * Lane parsing and metadata utilities
 *
 * Lanes are pure organizational metadata that don't affect execution flow.
 * They provide grouping information for visual organization in the timeline.
 */

import type { BPMNLaneSet, BPMNLane, LaneMetadata, BPMNFlowElement } from '../types/types';

/**
 * Parse lane hierarchy from BPMN lane sets
 * Extracts pure organizational metadata without affecting execution logic
 */
export function parseLaneHierarchy(laneSets: BPMNLaneSet[]): LaneMetadata[] {
  const allLanes: LaneMetadata[] = [];

  function parseLanes(lanes: BPMNLane[], level: number = 0): LaneMetadata[] {
    return lanes.map((lane) => {
      // Extract element IDs from flowNodeRef (can be objects or strings)
      const elementIds = (lane.flowNodeRef || []).map((ref) =>
        typeof ref === 'string' ? ref : (ref as any).id,
      );

      const laneMetadata: LaneMetadata = {
        laneId: lane.id,
        laneName: lane.name,
        level,
        elementIds,
        childLanes: [],
      };

      // Handle nested lanes
      if (lane.childLaneSet && lane.childLaneSet.lanes) {
        laneMetadata.childLanes = parseLanes(lane.childLaneSet.lanes, level + 1);
      }

      return laneMetadata;
    });
  }

  // Process all lane sets
  laneSets.forEach((laneSet) => {
    if (laneSet.lanes) {
      allLanes.push(...parseLanes(laneSet.lanes));
    }
  });

  return allLanes;
}

/**
 * Find which lane an element belongs to (including nested lanes)
 * Returns the most specific (deepest) lane that contains the element
 * CRITICAL: Handles instance IDs by extracting base element ID
 */
export function findElementLane(
  elementId: string,
  laneHierarchy: LaneMetadata[],
): LaneMetadata | null {
  // Extract base element ID for instance lookups (remove _instance_X suffix)
  const baseElementId = elementId.split('_instance_')[0];

  function searchInLanes(lanes: LaneMetadata[]): LaneMetadata | null {
    for (const lane of lanes) {
      // Check if element (or its base ID) is directly in this lane
      if (lane.elementIds.includes(elementId) || lane.elementIds.includes(baseElementId)) {
        // Check child lanes first (more specific)
        const childMatch = searchInLanes(lane.childLanes);
        return childMatch || lane; // Return child match if found, otherwise this lane
      }

      // Search in child lanes even if not in parent
      const childMatch = searchInLanes(lane.childLanes);
      if (childMatch) return childMatch;
    }
    return null;
  }

  return searchInLanes(laneHierarchy);
}

/**
 * Annotate elements with lane metadata
 * This is the main integration point - adds lane info to elements without changing execution logic
 * CRITICAL: Handles flattened sub-process children by inheriting lane from parent sub-process
 */
export function annotateElementsWithLanes(
  elements: BPMNFlowElement[],
  laneHierarchy: LaneMetadata[],
): BPMNFlowElement[] {
  if (laneHierarchy.length === 0) {
    return elements; // No lanes, return unchanged
  }

  // First pass: create a map of element lane assignments for quick lookup
  const elementToLaneMap = new Map<string, LaneMetadata>();

  // Build map of direct lane assignments
  function buildElementToLaneMap(lanes: LaneMetadata[]) {
    lanes.forEach((lane) => {
      lane.elementIds.forEach((elementId) => {
        elementToLaneMap.set(elementId, lane);
      });
      buildElementToLaneMap(lane.childLanes);
    });
  }
  buildElementToLaneMap(laneHierarchy);

  return elements.map((element) => {
    let lane: LaneMetadata | null = null;

    // First try direct lookup
    lane = elementToLaneMap.get(element.id) || null;

    // If not found and element has parentSubProcessId, inherit lane from parent
    if (!lane && (element as any).parentSubProcessId) {
      const parentSubProcessId = (element as any).parentSubProcessId;
      lane = elementToLaneMap.get(parentSubProcessId) || null;
    }

    if (lane) {
      // Add lane metadata without modifying the original element structure
      // Don't use spread operator - it corrupts BPMN element properties!
      (element as any)._laneMetadata = {
        laneId: lane.laneId,
        laneName: lane.laneName,
        laneLevel: lane.level,
      };
      return element as BPMNFlowElement & {
        _laneMetadata: {
          laneId: string;
          laneName?: string;
          laneLevel: number;
        };
      };
    }

    return element;
  });
}

/**
 * Get all lanes flattened for UI display
 * Useful for creating lane filter options or lane headers
 */
export function getFlattenedLanes(laneHierarchy: LaneMetadata[]): Array<{
  laneId: string;
  laneName?: string;
  level: number;
  displayName: string;
}> {
  const flattened: Array<{
    laneId: string;
    laneName?: string;
    level: number;
    displayName: string;
  }> = [];

  function flatten(lanes: LaneMetadata[], parentNames: string[] = []) {
    lanes.forEach((lane) => {
      const displayName =
        parentNames.length > 0
          ? `${parentNames.join(' > ')} > ${lane.laneName || lane.laneId}`
          : lane.laneName || lane.laneId;

      flattened.push({
        laneId: lane.laneId,
        laneName: lane.laneName,
        level: lane.level,
        displayName,
      });

      // Flatten child lanes
      if (lane.childLanes.length > 0) {
        const currentPath = [...parentNames, lane.laneName || lane.laneId];
        flatten(lane.childLanes, currentPath);
      }
    });
  }

  flatten(laneHierarchy);
  return flattened;
}

/**
 * Group elements by lane for visual organization
 * Returns elements grouped by their lane assignment
 */
export function groupElementsByLane(
  elements: Array<{ id: string; laneId?: string; laneName?: string; laneLevel?: number }>,
  laneHierarchy: LaneMetadata[],
): Array<{
  laneId?: string;
  laneName?: string;
  laneLevel?: number;
  elements: Array<{ id: string; laneId?: string; laneName?: string; laneLevel?: number }>;
}> {
  // Group elements by lane
  const laneGroups = new Map<
    string,
    Array<{ id: string; laneId?: string; laneName?: string; laneLevel?: number }>
  >();
  const unlanedElements: Array<{
    id: string;
    laneId?: string;
    laneName?: string;
    laneLevel?: number;
  }> = [];

  elements.forEach((element) => {
    if (element.laneId) {
      if (!laneGroups.has(element.laneId)) {
        laneGroups.set(element.laneId, []);
      }
      laneGroups.get(element.laneId)!.push(element);
    } else {
      unlanedElements.push(element);
    }
  });

  // Create ordered groups following lane hierarchy
  const result: Array<{
    laneId?: string;
    laneName?: string;
    laneLevel?: number;
    elements: Array<{ id: string; laneId?: string; laneName?: string; laneLevel?: number }>;
  }> = [];

  // Add unlaned elements first if any
  if (unlanedElements.length > 0) {
    result.push({
      elements: unlanedElements,
    });
  }

  // Add lanes in hierarchical order
  function addLaneGroups(lanes: LaneMetadata[]) {
    lanes.forEach((lane) => {
      const laneElements = laneGroups.get(lane.laneId) || [];
      if (laneElements.length > 0) {
        result.push({
          laneId: lane.laneId,
          laneName: lane.laneName,
          laneLevel: lane.level,
          elements: laneElements,
        });
      }

      // Add child lanes
      if (lane.childLanes.length > 0) {
        addLaneGroups(lane.childLanes);
      }
    });
  }

  addLaneGroups(laneHierarchy);

  return result;
}

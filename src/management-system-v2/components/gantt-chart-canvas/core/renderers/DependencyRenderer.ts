/**
 * DependencyRenderer.ts
 *
 * Handles rendering of dependency arrows between Gantt chart elements.
 * Implements efficient arrow drawing with proper positioning and styling.
 */

import { TimeMatrix } from '../TimeMatrix';
import { GanttElementType, GanttDependency, DependencyType } from '../../types';
import {
  ROW_HEIGHT,
  DEPENDENCY_ARROW_SIZE,
  DEPENDENCY_LINE_COLOR,
  MILESTONE_SIZE,
  ELEMENT_MIN_WIDTH,
  MIN_ARROW_TIP_DISTANCE,
} from '../constants';

// Core data structures
interface Point {
  x: number;
  y: number;
}

interface PathSegment {
  from: Point;
  to: Point;
  type: 'horizontal' | 'vertical';
}

interface RoutingConstraints {
  minSourceDistance: number;
  minTargetDistance: number;
  gridSpacing: number;
  elements: GanttElementType[];
  elementsByIndex: Map<number, GanttElementType>;
  timeMatrix: TimeMatrix;
}

interface RoutingContext {
  isSelfLoop: boolean;
  isGhost: boolean;
  hasCollision: boolean;
  needsRouting: boolean;
  isVeryShort: boolean;
  isBoundaryEvent: boolean;
  isMessageFlow: boolean;
  taskStartPoint?: Point; // For boundary events, the task's start position
  constraints: RoutingConstraints;
}

interface RenderStyle {
  curved: boolean;
  radius: number;
  color: string;
  width: number;
  opacity: number;
  dashPattern?: number[]; // For dashed lines (e.g., [5, 5] for 5px dash, 5px gap)
}

// Routing strategy interface
interface RoutingStrategy {
  calculatePath(from: Point, to: Point, context: RoutingContext): PathSegment[];
}

type RouteType = 'direct' | 'complex' | 'selfLoop';

export class DependencyRenderer {
  private pixelRatio: number = 1;
  private readonly VERTICAL_GRID_SPACING = 20; // Snap vertical lines to 20px grid
  private readonly MIN_SOURCE_DISTANCE = 20; // Minimum distance from source element
  private readonly MIN_TARGET_DISTANCE = 10; // Minimum distance before target element
  private lastElementsArray: GanttElementType[] = []; // Cache for elements array

  constructor(pixelRatio: number = 1) {
    this.pixelRatio = pixelRatio;
  }

  /**
   * Snap X coordinate to vertical grid based on source element position
   */
  private snapToVerticalGrid(x: number, sourceX: number): number {
    // Create a grid that starts from the source element position
    const offset = sourceX % this.VERTICAL_GRID_SPACING;
    const gridX = x - offset;
    return Math.round(gridX / this.VERTICAL_GRID_SPACING) * this.VERTICAL_GRID_SPACING + offset;
  }

  /**
   * Filter out main instance self-loops when ghost dependencies exist
   */
  private filterMainInstanceSelfLoops(
    deps: GanttDependency[],
    allDeps: GanttDependency[],
  ): GanttDependency[] {
    return deps.filter((dep) => {
      // Check if this is a main instance self-loop (not a ghost dependency)
      const isMainInstanceSelfLoop = dep.sourceId === dep.targetId && !dep.isGhost;

      if (isMainInstanceSelfLoop) {
        // Check if there are ghost dependencies for this element
        const hasGhostDependencies = allDeps.some(
          (otherDep) => otherDep.sourceId === dep.sourceId && otherDep.isGhost,
        );

        if (hasGhostDependencies) {
          return false; // Filter out this dependency
        }
      }

      return true; // Keep this dependency
    });
  }

  /**
   * Snap coordinate with minimum distance enforcement
   */
  private snapWithMinDistance(x: number, sourceX: number, minDistance: number): number {
    let adjustedX = this.snapToVerticalGrid(x, sourceX);

    // Ensure minimum distance from source is always respected
    if (Math.abs(adjustedX - sourceX) < minDistance) {
      const minRequiredX = sourceX + (x > sourceX ? minDistance : -minDistance);
      // Find next grid line in the source-based grid
      const offset = sourceX % this.VERTICAL_GRID_SPACING;
      const direction = x > sourceX ? 1 : -1;
      adjustedX =
        Math.ceil((minRequiredX - offset) / this.VERTICAL_GRID_SPACING) *
          this.VERTICAL_GRID_SPACING +
        offset;
    }

    return adjustedX;
  }

  /**
   * Draw a curved corner transition
   */
  private drawCurvedCorner(
    context: CanvasRenderingContext2D,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    radius: number,
  ): void {
    const goingRight = toX > fromX;
    const goingDown = toY > fromY;

    // Shorten the line before the curve
    const lineEndX = fromX + (goingRight ? radius : -radius);
    context.lineTo(lineEndX, fromY);

    // Draw the curve
    context.quadraticCurveTo(toX, fromY, toX, fromY + (goingDown ? radius : -radius));
  }

  /**
   * Find a ghost occurrence by instance ID
   */
  private findGhostOccurrence(element: GanttElementType, instanceId: string): any | undefined {
    return element.ghostOccurrences?.find((ghost) => ghost.instanceId === instanceId);
  }

  /**
   * Calculate connection point for a ghost dependency
   */
  private calculateGhostConnectionPoint(
    element: GanttElementType,
    ghost: any,
    side: 'source' | 'target',
    timeMatrix: TimeMatrix,
    elementIndex: number,
  ): { x: number; y: number } {
    const y = elementIndex * ROW_HEIGHT + ROW_HEIGHT / 2;

    if (element.type === 'milestone') {
      const startX = timeMatrix.transformPoint(ghost.start);
      const endX = ghost.end ? timeMatrix.transformPoint(ghost.end) : startX;
      const hasRange = ghost.end && ghost.end !== ghost.start;

      if (hasRange) {
        // For milestones with ranges (e.g., events with duration)
        if (side === 'source') {
          // Outgoing arrows originate from the end of the range
          return { x: endX, y };
        } else {
          // Incoming arrows (target) should point to the start of the duration
          return { x: startX, y };
        }
      } else {
        // For point milestones (no range)
        const milestoneX = startX;
        return {
          x: side === 'source' ? milestoneX + MILESTONE_SIZE / 2 : milestoneX - MILESTONE_SIZE / 2,
          y,
        };
      }
    } else {
      // Tasks and groups: account for minimum width adjustment like regular elements
      const startX = timeMatrix.transformPoint(ghost.start);
      const endX = timeMatrix.transformPoint(ghost.end || ghost.start);
      const width = Math.max(endX - startX, ELEMENT_MIN_WIDTH);

      if (side === 'source') {
        // Connection from the right side of the element
        return { x: startX + width, y };
      } else {
        // Connection to the left side of the element
        return { x: startX, y };
      }
    }
  }

  /**
   * Check if ghost dependency should bypass collision detection
   */
  private shouldBypassGhostCollision(
    dep: any,
    from: { x: number; y: number },
    lineEndPoint: { x: number; y: number },
  ): boolean {
    return dep && dep.isGhost && Math.abs(lineEndPoint.y - from.y) <= 5;
  }

  // Routing strategy implementations
  private directRoutingStrategy: RoutingStrategy = {
    calculatePath: (from: Point, to: Point, context: RoutingContext): PathSegment[] => {
      const { minSourceDistance } = context.constraints;

      // For very short same-row dependencies, use direct line (but not for ghost dependencies)
      const sameRow = Math.abs(to.y - from.y) <= 5;
      const totalDistance = Math.abs(to.x - from.x);
      if (context.isVeryShort && sameRow && !context.isGhost) {
        return [{ from, to, type: 'horizontal' }];
      }

      // For direct routing, we can go in either direction
      const needsToGoLeft = to.x < from.x;
      const targetX = needsToGoLeft ? from.x - minSourceDistance : from.x + minSourceDistance;
      const vLineX = this.snapWithMinDistance(targetX, from.x, minSourceDistance);

      // Simple L-shaped path
      return [
        { from, to: { x: vLineX, y: from.y }, type: 'horizontal' },
        { from: { x: vLineX, y: from.y }, to: { x: vLineX, y: to.y }, type: 'vertical' },
        { from: { x: vLineX, y: to.y }, to, type: 'horizontal' },
      ];
    },
  };

  private complexRoutingStrategy: RoutingStrategy = {
    calculatePath: (from: Point, to: Point, context: RoutingContext): PathSegment[] => {
      const { minSourceDistance, minTargetDistance, gridSpacing } = context.constraints;

      // For complex routing (around obstacles), always go right first from source
      // This makes visual sense since elements emit from their end (right side)
      const sourceTargetX = from.x + minSourceDistance;
      const vLineFromX = this.snapWithMinDistance(sourceTargetX, from.x, minSourceDistance);

      // Calculate target vertical line position
      let vLineToX = this.snapToVerticalGrid(to.x - minTargetDistance, from.x);
      if (to.x - vLineToX < minTargetDistance) {
        const maxAllowedX = to.x - minTargetDistance;
        const offset = from.x % gridSpacing;
        vLineToX = Math.floor((maxAllowedX - offset) / gridSpacing) * gridSpacing + offset;
      }

      // Ensure adequate spacing between vertical lines
      const distanceToTarget = Math.abs(to.x - vLineToX);
      if (distanceToTarget <= gridSpacing) {
        if (to.x > vLineToX) {
          vLineToX = vLineToX - gridSpacing;
        } else {
          vLineToX = vLineToX + gridSpacing;
        }
      }

      // Calculate intermediate routing Y position
      const fromRow = Math.round(from.y / ROW_HEIGHT);
      const toRow = Math.round(to.y / ROW_HEIGHT);
      const rowDifference = Math.abs(toRow - fromRow);

      let routeY: number;
      if (rowDifference <= 1) {
        routeY = (from.y + to.y) / 2;
      } else {
        routeY = from.y < to.y ? from.y + ROW_HEIGHT / 2 : from.y - ROW_HEIGHT / 2;
      }

      // Multi-segment path that routes around obstacles
      return [
        { from, to: { x: vLineFromX, y: from.y }, type: 'horizontal' },
        { from: { x: vLineFromX, y: from.y }, to: { x: vLineFromX, y: routeY }, type: 'vertical' },
        { from: { x: vLineFromX, y: routeY }, to: { x: vLineToX, y: routeY }, type: 'horizontal' },
        { from: { x: vLineToX, y: routeY }, to: { x: vLineToX, y: to.y }, type: 'vertical' },
        { from: { x: vLineToX, y: to.y }, to, type: 'horizontal' },
      ];
    },
  };

  private selfLoopRoutingStrategy: RoutingStrategy = {
    calculatePath: (from: Point, to: Point, context: RoutingContext): PathSegment[] => {
      const { minSourceDistance, minTargetDistance } = context.constraints;
      const loopY = from.y - ROW_HEIGHT / 2;

      const vLineFromX = this.snapWithMinDistance(
        from.x + minSourceDistance,
        from.x,
        minSourceDistance,
      );

      let vLineToX = this.snapToVerticalGrid(to.x - minTargetDistance, from.x);
      if (to.x - vLineToX < minTargetDistance) {
        const maxAllowedX = to.x - minTargetDistance;
        const offset = from.x % this.VERTICAL_GRID_SPACING;
        vLineToX =
          Math.floor((maxAllowedX - offset) / this.VERTICAL_GRID_SPACING) *
            this.VERTICAL_GRID_SPACING +
          offset;
      }

      // Self-loop path that goes up and around
      return [
        { from, to: { x: vLineFromX, y: from.y }, type: 'horizontal' },
        { from: { x: vLineFromX, y: from.y }, to: { x: vLineFromX, y: loopY }, type: 'vertical' },
        { from: { x: vLineFromX, y: loopY }, to: { x: vLineToX, y: loopY }, type: 'horizontal' },
        { from: { x: vLineToX, y: loopY }, to: { x: vLineToX, y: to.y }, type: 'vertical' },
        { from: { x: vLineToX, y: to.y }, to, type: 'horizontal' },
      ];
    },
  };

  private messageFlowRoutingStrategy = {
    calculatePath: (from: Point, to: Point, context: RoutingContext): PathSegment[] => {
      const segments: PathSegment[] = [];
      const dep = (context as any).currentDep;

      // Check if we're dealing with participant connections
      const isSourceParticipant =
        dep && dep.sourceId && dep.sourceId.includes('participant-header-');
      const isTargetParticipant =
        dep && dep.targetId && dep.targetId.includes('participant-header-');

      // If same Y level, just draw horizontal line
      if (Math.abs(to.y - from.y) <= 5) {
        segments.push({
          from: { x: from.x, y: from.y },
          to: { x: to.x, y: to.y },
          type: 'horizontal',
        });
        return segments;
      }

      if (isSourceParticipant || isTargetParticipant) {
        // Mixed participant/element connections need special routing
        const midY = (from.y + to.y) / 2;
        const horizontalSpacing = 20; // 20px spacing from participant edges

        if (isSourceParticipant && isTargetParticipant) {
          // Participant-to-Participant: Both sides get horizontal spacing
          const sourceOffsetX = from.x + horizontalSpacing;
          const targetOffsetX = to.x + horizontalSpacing;

          segments.push(
            {
              from: { x: from.x, y: from.y },
              to: { x: sourceOffsetX, y: from.y },
              type: 'horizontal',
            },
            {
              from: { x: sourceOffsetX, y: from.y },
              to: { x: sourceOffsetX, y: midY },
              type: 'vertical',
            },
            {
              from: { x: sourceOffsetX, y: midY },
              to: { x: targetOffsetX, y: midY },
              type: 'horizontal',
            },
            {
              from: { x: targetOffsetX, y: midY },
              to: { x: targetOffsetX, y: to.y },
              type: 'vertical',
            },
            { from: { x: targetOffsetX, y: to.y }, to: { x: to.x, y: to.y }, type: 'horizontal' },
          );
        } else if (isSourceParticipant && !isTargetParticipant) {
          // Participant-to-Element: Only source gets horizontal spacing, target connects directly
          const sourceOffsetX = from.x + horizontalSpacing;

          segments.push(
            {
              from: { x: from.x, y: from.y },
              to: { x: sourceOffsetX, y: from.y },
              type: 'horizontal',
            },
            {
              from: { x: sourceOffsetX, y: from.y },
              to: { x: sourceOffsetX, y: midY },
              type: 'vertical',
            },
            { from: { x: sourceOffsetX, y: midY }, to: { x: to.x, y: midY }, type: 'horizontal' },
            { from: { x: to.x, y: midY }, to: { x: to.x, y: to.y }, type: 'vertical' },
          );
        } else if (!isSourceParticipant && isTargetParticipant) {
          // Element-to-Participant: Only target gets horizontal spacing, source connects directly
          const targetOffsetX = to.x + horizontalSpacing;

          segments.push(
            { from: { x: from.x, y: from.y }, to: { x: from.x, y: midY }, type: 'vertical' },
            { from: { x: from.x, y: midY }, to: { x: targetOffsetX, y: midY }, type: 'horizontal' },
            {
              from: { x: targetOffsetX, y: midY },
              to: { x: targetOffsetX, y: to.y },
              type: 'vertical',
            },
            { from: { x: targetOffsetX, y: to.y }, to: { x: to.x, y: to.y }, type: 'horizontal' },
          );
        }

        return segments;
      } else {
        // For element-to-element flows, use the original center-based routing
        const { elements, timeMatrix } = context.constraints;

        // Find center points for routing calculation
        let sourceCenterX = from.x;
        let targetCenterX = to.x;

        elements.forEach((el, index) => {
          if (index * ROW_HEIGHT + ROW_HEIGHT / 2 === from.y) {
            if (el.type === 'task' || el.type === 'group') {
              const startX = timeMatrix.transformPoint(el.start);
              const endX = timeMatrix.transformPoint(el.end || el.start);
              const width = Math.max(endX - startX, 30);
              sourceCenterX = startX + width / 2;
            } else if (el.type === 'milestone') {
              sourceCenterX = timeMatrix.transformPoint(el.start);
            }
          }

          if (index * ROW_HEIGHT + ROW_HEIGHT / 2 === to.y) {
            if (el.type === 'task' || el.type === 'group') {
              const startX = timeMatrix.transformPoint(el.start);
              const endX = timeMatrix.transformPoint(el.end || el.start);
              const width = Math.max(endX - startX, 30);
              targetCenterX = startX + width / 2;
            } else if (el.type === 'milestone') {
              targetCenterX = timeMatrix.transformPoint(el.start);
            }
          }
        });

        // Apply spacing offsets
        const spacingOffsets = (context as any).messageFlowSpacing;
        let sourceOffsetX = 0;
        let targetOffsetX = 0;

        if (spacingOffsets && dep) {
          const sourceSpacing = spacingOffsets.get(dep.sourceId);
          const targetSpacing = spacingOffsets.get(dep.targetId);
          sourceOffsetX = sourceSpacing?.outgoingOffset || 0;
          targetOffsetX = targetSpacing?.incomingOffset || 0;
        }

        const offsetSourceCenterX = sourceCenterX + sourceOffsetX;
        const offsetTargetCenterX = targetCenterX + targetOffsetX;
        const midY = (from.y + to.y) / 2;

        // Element routing with center points and offsets
        segments.push({
          from: { x: from.x, y: from.y },
          to: { x: offsetSourceCenterX, y: from.y },
          type: 'horizontal',
        });

        segments.push({
          from: { x: offsetSourceCenterX, y: from.y },
          to: { x: offsetSourceCenterX, y: midY },
          type: 'vertical',
        });

        segments.push({
          from: { x: offsetSourceCenterX, y: midY },
          to: { x: offsetTargetCenterX, y: midY },
          type: 'horizontal',
        });

        segments.push({
          from: { x: offsetTargetCenterX, y: midY },
          to: { x: offsetTargetCenterX, y: to.y },
          type: 'vertical',
        });

        segments.push({
          from: { x: offsetTargetCenterX, y: to.y },
          to: { x: to.x, y: to.y },
          type: 'horizontal',
        });

        return segments;
      }
    },
  };

  private boundaryEventRoutingStrategy: RoutingStrategy = {
    calculatePath: (from: Point, to: Point, context: RoutingContext): PathSegment[] => {
      // For boundary events, we want a special vertical-then-horizontal routing:
      // 1. Start vertically somewhere between task start and boundary event
      // 2. Go down from the task row to the boundary event row
      // 3. Then go horizontally to the boundary event
      //
      // Special case: if there's not enough horizontal space, route straight down

      // Get the task's start position from the context
      const taskStartX = context.taskStartPoint?.x || from.x;

      // Define minimum distances
      const minDistanceFromEvent = 25; // Preferred distance before the event
      const minDistanceFromTaskStart = 10; // Minimum distance after task start

      // Calculate the preferred vertical line position
      const preferredVLineX = to.x - minDistanceFromEvent;
      const minAllowedVLineX = taskStartX + minDistanceFromTaskStart;
      const maxAllowedVLineX = to.x; // Don't go past the event position

      // Check if we can maintain the minimum horizontal distance
      const canUsePreferred =
        preferredVLineX >= minAllowedVLineX && preferredVLineX <= maxAllowedVLineX;

      if (canUsePreferred) {
        // Normal case: vertical line with horizontal segment
        const vLineX = preferredVLineX;
        const startPoint = { x: vLineX, y: from.y };
        return [
          { from: startPoint, to: { x: vLineX, y: to.y }, type: 'vertical' },
          { from: { x: vLineX, y: to.y }, to, type: 'horizontal' },
        ];
      } else {
        // Special case: not enough horizontal space, route straight down from above the event
        // Start from the task row directly above the boundary event
        const startPoint = { x: to.x, y: from.y };

        return [{ from: startPoint, to, type: 'vertical' }];
      }
    },
  };

  private routeDependency(from: Point, to: Point, context: RoutingContext): PathSegment[] {
    if (context.isMessageFlow) {
      return this.messageFlowRoutingStrategy.calculatePath(from, to, context);
    } else if (context.isBoundaryEvent) {
      return this.boundaryEventRoutingStrategy.calculatePath(from, to, context);
    } else if (context.isSelfLoop) {
      return this.selfLoopRoutingStrategy.calculatePath(from, to, context);
    } else if (context.needsRouting) {
      return this.complexRoutingStrategy.calculatePath(from, to, context);
    } else {
      return this.directRoutingStrategy.calculatePath(from, to, context);
    }
  }

  private renderPath(
    context: CanvasRenderingContext2D,
    segments: PathSegment[],
    style: RenderStyle,
    arrowTarget: Point,
    showArrowTip: boolean = true,
  ): void {
    // Set style
    context.strokeStyle = style.color;
    context.lineWidth = style.width;
    context.globalAlpha = style.opacity;
    context.setLineDash(style.dashPattern || []);

    if (style.curved) {
      context.lineJoin = 'round';
      context.lineCap = 'round';
    } else {
      context.lineJoin = 'miter';
      context.lineCap = 'butt';
    }

    context.beginPath();

    if (segments.length === 0) return;

    // Always start from the exact connection point (no gap)
    context.moveTo(segments[0].from.x, segments[0].from.y);

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const nextSegment = segments[i + 1];

      if (style.curved && nextSegment && this.isCorner(segment, nextSegment)) {
        // For the first segment, we need to draw from element edge to curve start
        if (i === 0) {
          const dir1 = this.getSegmentDirection(segment);
          const curveStart = {
            x: segment.to.x - dir1.x * style.radius,
            y: segment.to.y - dir1.y * style.radius,
          };
          context.lineTo(curveStart.x, curveStart.y);

          const dir2 = this.getSegmentDirection(nextSegment);
          const curveEnd = {
            x: segment.to.x + dir2.x * style.radius,
            y: segment.to.y + dir2.y * style.radius,
          };
          context.quadraticCurveTo(segment.to.x, segment.to.y, curveEnd.x, curveEnd.y);
        } else {
          this.renderCurvedCorner(context, segment, nextSegment, style.radius);
        }
      } else {
        // For the last segment, account for arrow head only if arrow tip will be shown
        if (i === segments.length - 1) {
          if (showArrowTip) {
            const totalDistance = Math.abs(segment.to.x - segment.from.x);
            const arrowOffset =
              totalDistance < 30
                ? Math.min(DEPENDENCY_ARROW_SIZE * 0.5, totalDistance * 0.3)
                : DEPENDENCY_ARROW_SIZE * 0.8;
            const lineEndX = segment.to.x - arrowOffset;
            context.lineTo(lineEndX, segment.to.y);
          } else {
            // No arrow tip, draw line all the way to target
            context.lineTo(segment.to.x, segment.to.y);
          }
        } else {
          // For non-final segments in curved mode, adjust endpoint if there's a curve coming
          if (style.curved && nextSegment && this.isCorner(segment, nextSegment)) {
            continue;
          } else {
            context.lineTo(segment.to.x, segment.to.y);
          }
        }
      }
    }

    context.stroke();
  }

  private isCorner(current: PathSegment, next: PathSegment): boolean {
    return current.type !== next.type;
  }

  private renderCurvedCorner(
    context: CanvasRenderingContext2D,
    current: PathSegment,
    next: PathSegment,
    radius: number,
  ): void {
    const corner = current.to;
    const dir1 = this.getSegmentDirection(current);
    const dir2 = this.getSegmentDirection(next);

    // Stop current line before corner
    const curveStart = {
      x: corner.x - dir1.x * radius,
      y: corner.y - dir1.y * radius,
    };
    context.lineTo(curveStart.x, curveStart.y);

    // Draw curve to next segment start
    const curveEnd = {
      x: corner.x + dir2.x * radius,
      y: corner.y + dir2.y * radius,
    };
    context.quadraticCurveTo(corner.x, corner.y, curveEnd.x, curveEnd.y);
  }

  private getSegmentDirection(segment: PathSegment): Point {
    const dx = segment.to.x - segment.from.x;
    const dy = segment.to.y - segment.from.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    return length > 0 ? { x: dx / length, y: dy / length } : { x: 0, y: 0 };
  }

  /**
   * Render all dependencies between elements (new unified approach)
   */
  renderDependencies(
    context: CanvasRenderingContext2D,
    dependencies: GanttDependency[],
    elements: GanttElementType[],
    timeMatrix: TimeMatrix,
    visibleRowStart: number,
    visibleRowEnd: number,
    highlightedDependencies?: GanttDependency[],
    curvedDependencies: boolean = false,
  ): void {
    // Cache elements array for participant connection calculations
    this.lastElementsArray = elements;

    const messageFlowDeps = dependencies.filter((dep) => dep.flowType === 'message');

    // Calculate message flow spacing for elements with multiple flows
    const messageFlowSpacing = this.calculateMessageFlowSpacing(messageFlowDeps, elements);
    // Create element lookup maps
    const elementsByIndex = new Map<number, GanttElementType>();
    elements.forEach((el, index) => elementsByIndex.set(index, el));

    const highlightedIds = new Set(
      highlightedDependencies?.map((dep) => `${dep.sourceId}-${dep.targetId}`) || [],
    );

    // Separate into normal and highlighted dependencies
    const normalDeps = dependencies.filter(
      (dep) => !highlightedIds.has(`${dep.sourceId}-${dep.targetId}`),
    );
    const highlightedDeps = dependencies.filter((dep) =>
      highlightedIds.has(`${dep.sourceId}-${dep.targetId}`),
    );

    // Filter out main instance self-loops if ghost dependencies exist
    const filteredNormalDeps = this.filterMainInstanceSelfLoops(normalDeps, dependencies);
    const filteredHighlightedDeps = this.filterMainInstanceSelfLoops(highlightedDeps, dependencies);

    // Render normal dependencies first, then highlighted on top
    [...filteredNormalDeps, ...filteredHighlightedDeps].forEach((dep, index) => {
      const isHighlighted = index >= filteredNormalDeps.length;
      this.renderSingleDependency(
        context,
        dep,
        elements,
        elementsByIndex,
        timeMatrix,
        visibleRowStart,
        visibleRowEnd,
        curvedDependencies,
        isHighlighted,
        messageFlowSpacing,
      );
    });
  }

  /**
   * Render a single dependency using the new unified approach
   */
  private renderSingleDependency(
    context: CanvasRenderingContext2D,
    dep: GanttDependency,
    elements: GanttElementType[],
    elementsByIndex: Map<number, GanttElementType>,
    timeMatrix: TimeMatrix,
    visibleRowStart: number,
    visibleRowEnd: number,
    curvedDependencies: boolean,
    isHighlighted: boolean,
    messageFlowSpacing?: Map<string, { outgoingOffset: number; incomingOffset: number }>,
  ): void {
    // Find elements by ID
    const { fromElement, toElement, fromIndex, toIndex } = this.findDependencyElements(
      dep,
      elements,
    );
    if (!fromElement || !toElement || fromIndex === -1 || toIndex === -1) {
      return;
    }

    // Check visibility
    const fromVisible = fromIndex >= visibleRowStart && fromIndex <= visibleRowEnd;
    const toVisible = toIndex >= visibleRowStart && toIndex <= visibleRowEnd;
    if (!fromVisible && !toVisible) return;

    // Calculate connection points
    let fromPoint: Point;
    let toPoint: Point;

    // For boundary event dependencies, we need special handling
    let taskStartPoint: Point | undefined;
    if (dep.isBoundaryEvent) {
      // For boundary events, we connect from task to the TOP of the boundary event
      fromPoint = this.getElementConnectionPoint(fromElement, timeMatrix, 'end', fromIndex);

      // Get the boundary event's center position (top connection point)
      const boundaryY = toIndex * ROW_HEIGHT + ROW_HEIGHT / 2;
      const boundaryX = timeMatrix.transformPoint((toElement as any).start);
      toPoint = { x: boundaryX, y: boundaryY };

      // Also get the task's start position for routing
      taskStartPoint = this.getElementConnectionPoint(fromElement, timeMatrix, 'start', fromIndex);
    } else if (dep.flowType === 'message') {
      // Message flows use different connection logic:
      // - For participants: connect to vertical edges (right/left)
      // - For elements: connect to horizontal edges (top/bottom)
      const isSourceParticipant = (fromElement as any).isParticipantHeader;
      const isTargetParticipant = (toElement as any).isParticipantHeader;

      // Get basic connection points
      if (isSourceParticipant) {
        fromPoint = this.getElementConnectionPoint(fromElement, timeMatrix, 'end', fromIndex); // Right edge of participant
      } else {
        fromPoint = this.getElementConnectionPoint(fromElement, timeMatrix, 'center', fromIndex); // Center for vertical edge calculation
      }

      if (isTargetParticipant) {
        toPoint = this.getElementConnectionPoint(toElement, timeMatrix, 'end', toIndex); // Right edge of participant (not left!)
      } else {
        toPoint = this.getElementConnectionPoint(toElement, timeMatrix, 'center', toIndex); // Center for vertical edge calculation
      }

      // Apply spacing offsets for participant connections
      const sourceSpacing = messageFlowSpacing?.get(dep.sourceId) || {
        outgoingOffset: 0,
        incomingOffset: 0,
      };
      const targetSpacing = messageFlowSpacing?.get(dep.targetId) || {
        outgoingOffset: 0,
        incomingOffset: 0,
      };

      if (isSourceParticipant) {
        fromPoint.y += sourceSpacing.outgoingOffset; // Apply vertical spacing to participant
      }
      if (isTargetParticipant) {
        toPoint.y += targetSpacing.incomingOffset; // Apply vertical spacing to participant
      }
    } else {
      fromPoint = this.getElementConnectionPoint(fromElement, timeMatrix, 'end', fromIndex);
      toPoint = this.getElementConnectionPoint(toElement, timeMatrix, 'start', toIndex);
    }

    // Adjust for ghost dependencies
    if (dep.isGhost && dep.sourceInstanceId && dep.targetInstanceId) {
      const sourceGhost = this.findGhostOccurrence(fromElement, dep.sourceInstanceId);
      if (sourceGhost) {
        const originalFromPoint = { ...fromPoint };
        fromPoint = this.calculateGhostConnectionPoint(
          fromElement,
          sourceGhost,
          'source',
          timeMatrix,
          fromIndex,
        );
      }

      const targetGhost = this.findGhostOccurrence(toElement, dep.targetInstanceId);
      if (targetGhost) {
        const originalToPoint = { ...toPoint };
        toPoint = this.calculateGhostConnectionPoint(
          toElement,
          targetGhost,
          'target',
          timeMatrix,
          toIndex,
        );
      }
    }

    // Skip if outside visible canvas area
    const canvasWidth = context.canvas.width / this.pixelRatio;
    if (
      (fromPoint.x < 0 && toPoint.x < 0) ||
      (fromPoint.x > canvasWidth && toPoint.x > canvasWidth)
    ) {
      return;
    }

    // Use absolute row positions, but preserve participant header connection points
    if (!(fromElement as any).isParticipantHeader) {
      fromPoint.y = fromIndex * ROW_HEIGHT + ROW_HEIGHT / 2;
    }
    if (!(toElement as any).isParticipantHeader) {
      toPoint.y = toIndex * ROW_HEIGHT + ROW_HEIGHT / 2;
    }

    // Calculate distance for arrow tip logic
    const totalDistance = Math.abs(toPoint.x - fromPoint.x);
    const isSameRow = Math.abs(toPoint.y - fromPoint.y) <= 5;

    // Skip rendering ghost dependencies that are problematic when elements overlap
    if (dep.isGhost) {
      // For same-row dependencies, skip if they would cause visual artifacts
      if (isSameRow) {
        // Skip if target is at or left of source (negative dependency)
        if (toPoint.x <= fromPoint.x) {
          return;
        }

        // Skip if distance is too small and causes visual artifacts when overlapping
        if (totalDistance < 5) {
          return;
        }
      }
      // Different-row dependencies should always render, even with overlapping elements
    }

    // Build routing context
    const context_routing = this.buildRoutingContext(
      dep,
      fromPoint,
      toPoint,
      elements,
      elementsByIndex,
      timeMatrix,
      taskStartPoint,
      messageFlowSpacing,
    );

    // Calculate path using new routing system
    const segments = this.routeDependency(fromPoint, toPoint, context_routing);

    // Draw arrow head - hide for boundary events, message flows (drawn separately), and very short ghost dependencies on same row
    const shouldShowArrowTip =
      !dep.isBoundaryEvent &&
      dep.flowType !== 'message' &&
      !(dep.isGhost && isSameRow && totalDistance < MIN_ARROW_TIP_DISTANCE);

    // Create render style
    const style: RenderStyle = {
      curved: curvedDependencies,
      radius: 5,
      color: isHighlighted ? '#000000' : DEPENDENCY_LINE_COLOR,
      width: isHighlighted ? 2.5 : 1.5,
      opacity: dep.isGhost ? 0.75 : dep.flowType === 'message' ? 0.8 : 1.0,
      dashPattern:
        dep.flowType === 'boundary-non-interrupting'
          ? [5, 5]
          : dep.flowType === 'message'
            ? [8, 4]
            : undefined,
    };

    // Save context state
    context.save();

    // Render the path
    this.renderPath(context, segments, style, toPoint, shouldShowArrowTip);

    // For message flows, always show arrow tip and add empty circle at start
    if (dep.flowType === 'message') {
      // Check if either source or target is a participant header
      const isSourceParticipant = (fromElement as any).isParticipantHeader;
      const isTargetParticipant = (toElement as any).isParticipantHeader;

      if (isSourceParticipant || isTargetParticipant) {
        // Mixed participant/element message flows
        let circlePosition: Point;
        let arrowPosition: Point;
        let arrowDirection: 'horizontal' | 'vertical' = 'horizontal';
        let arrowGoingDown = false;

        let pointingLeft = true; // Default for horizontal arrows

        if (isSourceParticipant && isTargetParticipant) {
          // Participant to participant - both connect to right edges (spacing already applied to fromPoint/toPoint)
          circlePosition = fromPoint; // Right edge of source participant with spacing
          arrowPosition = toPoint; // Right edge of target participant with spacing
          arrowDirection = 'horizontal';
          pointingLeft = true; // Arrow points left toward target participant
        } else if (isSourceParticipant && !isTargetParticipant) {
          // Participant to element - connect from participant right edge to element top/bottom (spacing already applied)
          circlePosition = fromPoint; // Right edge of participant with spacing
          const elementCenter = this.getElementConnectionPoint(
            toElement,
            timeMatrix,
            'center',
            toIndex,
          );
          arrowGoingDown = fromPoint.y < elementCenter.y;
          arrowPosition = {
            x: elementCenter.x,
            y: arrowGoingDown
              ? elementCenter.y - ROW_HEIGHT / 2 + 10
              : elementCenter.y + ROW_HEIGHT / 2 - 10,
          };
          arrowDirection = 'vertical';
        } else if (!isSourceParticipant && isTargetParticipant) {
          // Element to participant - connect from element top/bottom to participant right edge (spacing already applied)
          const elementCenter = this.getElementConnectionPoint(
            fromElement,
            timeMatrix,
            'center',
            fromIndex,
          );
          arrowGoingDown = elementCenter.y < toPoint.y;
          circlePosition = {
            x: elementCenter.x,
            y: arrowGoingDown
              ? elementCenter.y + ROW_HEIGHT / 2 - 10
              : elementCenter.y - ROW_HEIGHT / 2 + 10,
          };
          // For participant targets, position arrow tip at the participant edge (spacing already applied)
          arrowPosition = toPoint;
          arrowDirection = 'horizontal';
          pointingLeft = true; // Arrow tip at edge, body extends leftward (but we need it rightward)
        } else {
          // Fallback (shouldn't happen in this branch)
          circlePosition = fromPoint;
          arrowPosition = toPoint;
          arrowDirection = 'horizontal';
        }

        this.drawArrowHead(
          context,
          arrowPosition,
          isHighlighted,
          true,
          arrowDirection,
          arrowGoingDown,
          arrowDirection === 'horizontal' ? pointingLeft : true,
        );
        this.drawMessageFlowStartCircle(context, circlePosition, isHighlighted);
      } else {
        // Regular task-to-task message flows use vertical routing
        const sourceCenter = this.getElementConnectionPoint(
          fromElement,
          timeMatrix,
          'center',
          fromIndex,
        );
        const targetCenter = this.getElementConnectionPoint(
          toElement,
          timeMatrix,
          'center',
          toIndex,
        );

        // Determine if message flow goes up or down to calculate vertical edge positions
        const isGoingDown = targetCenter.y > sourceCenter.y;

        // Get spacing offsets if available
        const sourceSpacing = messageFlowSpacing?.get(dep.sourceId) || {
          outgoingOffset: 0,
          incomingOffset: 0,
        };
        const targetSpacing = messageFlowSpacing?.get(dep.targetId) || {
          outgoingOffset: 0,
          incomingOffset: 0,
        };

        // Apply spacing to the outgoing flow (source) and incoming flow (target)
        const sourceOffsetX = sourceSpacing.outgoingOffset;
        const targetOffsetX = targetSpacing.incomingOffset;

        // Circle should be positioned exactly at the element edge
        // ROW_HEIGHT = 30px, so element spans from center ± 15px
        // Position circle center at same vertical position as arrow tip
        const circlePosition = {
          x: sourceCenter.x + sourceOffsetX,
          y: isGoingDown
            ? sourceCenter.y + ROW_HEIGHT / 2 // Bottom edge: center + 15px (same as arrow)
            : sourceCenter.y - ROW_HEIGHT / 2, // Top edge: center - 15px (same as arrow)
        };

        // Arrow should be positioned exactly at the target element edge
        const arrowPosition = {
          x: targetCenter.x + targetOffsetX,
          y: isGoingDown
            ? targetCenter.y - ROW_HEIGHT / 2 // Top edge when arriving from above: center - 15px
            : targetCenter.y + ROW_HEIGHT / 2, // Bottom edge when arriving from below: center + 15px
        };

        this.drawArrowHead(context, arrowPosition, isHighlighted, true, 'vertical', isGoingDown); // Draw vertical arrow
        this.drawMessageFlowStartCircle(context, circlePosition, isHighlighted); // Draw circle at vertical edge
      }
    } else if (shouldShowArrowTip) {
      this.drawArrowHead(context, toPoint, isHighlighted, false); // Pass false for isMessageFlow
    }

    // Restore context state
    context.restore();
  }

  private findDependencyElements(dep: GanttDependency, elements: GanttElementType[]) {
    let fromElement: GanttElementType | undefined;
    let toElement: GanttElementType | undefined;
    let fromIndex = -1;
    let toIndex = -1;

    // Use instance-specific IDs for accurate row positioning
    const sourceInstanceId = (dep as any).sourceInstanceId || dep.sourceId;
    const targetInstanceId = (dep as any).targetInstanceId || dep.targetId;

    elements.forEach((el, index) => {
      // For ghost dependencies, match by base ID since ghost deps use base IDs
      if (dep.isGhost) {
        // Extract base ID from element ID (remove _instance_X suffix)
        const elementBaseId = el.id.includes('_instance_') ? el.id.split('_instance_')[0] : el.id;

        if (elementBaseId === dep.sourceId && fromIndex === -1) {
          fromElement = el;
          fromIndex = index;
        }
        if (elementBaseId === dep.targetId && toIndex === -1) {
          toElement = el;
          toIndex = index;
        }
      } else {
        // For regular dependencies, match by instance ID first, then fall back to base ID
        if ((el.id === sourceInstanceId || el.id === dep.sourceId) && fromIndex === -1) {
          fromElement = el;
          fromIndex = index;
        }
        if ((el.id === targetInstanceId || el.id === dep.targetId) && toIndex === -1) {
          toElement = el;
          toIndex = index;
        }
      }
    });

    return { fromElement, toElement, fromIndex, toIndex };
  }

  private buildRoutingContext(
    dep: GanttDependency,
    fromPoint: Point,
    toPoint: Point,
    elements: GanttElementType[],
    elementsByIndex: Map<number, GanttElementType>,
    timeMatrix: TimeMatrix,
    taskStartPoint?: Point,
    messageFlowSpacing?: Map<string, { outgoingOffset: number; incomingOffset: number }>,
  ): RoutingContext {
    const totalDistance = Math.abs(toPoint.x - fromPoint.x);
    const isVeryShort = totalDistance < 30;
    const isSelfLoop = dep.sourceId === dep.targetId && fromPoint.x >= toPoint.x && !dep.isGhost;

    // Check for insufficient space and collisions
    // For ghost dependencies on same row, don't enforce minimum space requirements
    const isSameRow = Math.abs(toPoint.y - fromPoint.y) <= 5;
    const hasInsufficientSpace = dep.isGhost && isSameRow ? false : toPoint.x <= fromPoint.x + 20;
    let hasCollision = this.wouldIntersectElements(
      fromPoint,
      toPoint,
      elements,
      elementsByIndex,
      timeMatrix,
    );

    // Override collision detection for ghost dependencies on same row
    if (this.shouldBypassGhostCollision(dep, fromPoint, toPoint)) {
      hasCollision = false;
    }

    // For different-row ghost dependencies, always use complex routing for cleaner lines
    const needsComplexRouting = Boolean(dep.isGhost) && !isSameRow;
    const needsRouting = Boolean(
      hasInsufficientSpace || hasCollision || isSelfLoop || needsComplexRouting,
    );

    return {
      isSelfLoop,
      isGhost: dep.isGhost || false,
      hasCollision,
      needsRouting,
      isVeryShort,
      isBoundaryEvent: dep.isBoundaryEvent || false,
      isMessageFlow: dep.flowType === 'message',
      taskStartPoint,
      constraints: {
        minSourceDistance: dep.isGhost && isSameRow ? 0 : this.MIN_SOURCE_DISTANCE,
        minTargetDistance: dep.isGhost && isSameRow ? 0 : this.MIN_TARGET_DISTANCE,
        gridSpacing: this.VERTICAL_GRID_SPACING,
        elements,
        elementsByIndex,
        timeMatrix,
      },
      // Add spacing information for message flows
      messageFlowSpacing,
      currentDep: dep,
    } as any;
  }

  /**
   * Get connection point for an element
   */
  private getElementConnectionPoint(
    element: GanttElementType,
    timeMatrix: TimeMatrix,
    side: 'start' | 'end' | 'center',
    elementIndex: number,
  ): { x: number; y: number } {
    const y = elementIndex * ROW_HEIGHT + ROW_HEIGHT / 2;

    // Special handling for participant headers - connect to edges, vertically centered
    if ((element as any).isParticipantHeader) {
      return this.getParticipantHeaderConnectionPoint(
        element,
        timeMatrix,
        side,
        elementIndex,
        this.lastElementsArray,
      );
    }

    switch (element.type) {
      case 'task': {
        const task = element as GanttElementType & { type: 'task'; start: number; end: number };
        if (side === 'start') {
          return { x: timeMatrix.transformPoint(task.start), y };
        } else if (side === 'center') {
          // Center connection point for message flows
          const startX = timeMatrix.transformPoint(task.start);
          const endX = timeMatrix.transformPoint(task.end);
          const width = Math.max(endX - startX, ELEMENT_MIN_WIDTH);
          return { x: startX + width / 2, y };
        } else {
          // For end position, account for minimum width adjustment
          const startX = timeMatrix.transformPoint(task.start);
          const endX = timeMatrix.transformPoint(task.end);
          const width = Math.max(endX - startX, ELEMENT_MIN_WIDTH);
          // Return the visual end position (same calculation as in ElementRenderer)
          return { x: startX + width, y };
        }
      }

      case 'milestone': {
        const milestone = element as GanttElementType & {
          type: 'milestone';
          start: number;
          end?: number;
        };
        const hasRange = milestone.end && milestone.end !== milestone.start;

        if (hasRange) {
          // For milestones with ranges (e.g., events with duration)
          const startX = timeMatrix.transformPoint(milestone.start);
          const endX = timeMatrix.transformPoint(milestone.end!);

          if (side === 'start') {
            // Incoming arrows should point to the start of the duration
            return { x: startX, y };
          } else if (side === 'center') {
            // Center connection point for message flows
            return { x: (startX + endX) / 2, y };
          } else {
            // Outgoing arrows originate from the end of the range
            return { x: endX, y };
          }
        } else {
          // For point milestones (no range)
          const milestoneX = timeMatrix.transformPoint(milestone.start);
          if (side === 'center') {
            // Center connection point for message flows
            return { x: milestoneX, y };
          }
          return {
            x: side === 'start' ? milestoneX - MILESTONE_SIZE / 2 : milestoneX + MILESTONE_SIZE / 2,
            y,
          };
        }
      }

      case 'group': {
        const group = element as GanttElementType & { type: 'group'; start: number; end: number };
        if (side === 'start') {
          return { x: timeMatrix.transformPoint(group.start), y };
        } else if (side === 'center') {
          // Center connection point for message flows
          const startX = timeMatrix.transformPoint(group.start);
          const endX = timeMatrix.transformPoint(group.end);
          const width = Math.max(endX - startX, ELEMENT_MIN_WIDTH);
          return { x: startX + width / 2, y };
        } else {
          // For end position, account for minimum width adjustment
          const startX = timeMatrix.transformPoint(group.start);
          const endX = timeMatrix.transformPoint(group.end);
          const width = Math.max(endX - startX, ELEMENT_MIN_WIDTH);
          // Return the visual end position (same calculation as in ElementRenderer)
          return { x: startX + width, y };
        }
      }

      default:
        return { x: 0, y };
    }
  }

  /**
   * Check if a horizontal line would intersect with any elements between source and target
   */
  private wouldIntersectElements(
    from: Point,
    to: Point,
    elements?: GanttElementType[],
    elementsByIndex?: Map<number, GanttElementType>,
    timeMatrix?: TimeMatrix,
  ): boolean {
    if (!elements || !elementsByIndex || !timeMatrix) {
      return false;
    }

    const minX = Math.min(from.x, to.x);
    const maxX = Math.max(from.x, to.x);

    // Calculate which rows the dependency line passes through
    const fromRow = Math.round(from.y / ROW_HEIGHT);
    const toRow = Math.round(to.y / ROW_HEIGHT);
    const minRow = Math.min(fromRow, toRow);
    const maxRow = Math.max(fromRow, toRow);

    if (maxRow - minRow > 20) {
      return false; // Skip collision detection for very long dependencies
    }

    // Check all elements to see if any fall on the affected rows and within the X range
    for (const [elementIndex, element] of elementsByIndex) {
      if (elementIndex < minRow || elementIndex > maxRow) {
        continue;
      }

      // Get element position and boundaries
      let elementMinX: number;
      let elementMaxX: number;

      if (element.type === 'milestone') {
        // For milestones, calculate position the same way as the renderer
        const startX = timeMatrix.transformPoint(element.start);
        const endX = element.end ? timeMatrix.transformPoint(element.end) : startX;
        const hasRange = element.end && element.end !== element.start;

        // Calculate milestone center position (same logic as ElementRenderer)
        const milestoneX = hasRange ? (startX + endX) / 2 : startX;

        // The diamond extends ±MILESTONE_SIZE/2 from the center
        elementMinX = milestoneX - MILESTONE_SIZE / 2;
        elementMaxX = milestoneX + MILESTONE_SIZE / 2;
      } else {
        // For tasks and groups
        const elementStart = timeMatrix.transformPoint(element.start);
        const elementEnd = timeMatrix.transformPoint(element.end || element.start);
        const adjustedEnd = Math.max(elementEnd, elementStart + ELEMENT_MIN_WIDTH);
        elementMinX = Math.min(elementStart, adjustedEnd);
        elementMaxX = Math.max(elementStart, adjustedEnd);
      }

      // Add some padding to avoid elements
      const padding = 5;
      if (elementMaxX + padding > minX && elementMinX - padding < maxX) {
        return true;
      }
    }

    return false;
  }

  /**
   * Draw arrow head at the end point
   */
  private drawArrowHead(
    context: CanvasRenderingContext2D,
    point: { x: number; y: number },
    isHighlighted: boolean = false,
    isMessageFlow: boolean = false,
    direction: 'horizontal' | 'vertical' = 'horizontal',
    isGoingDown?: boolean,
    pointingLeft: boolean = true,
  ): void {
    // Save context to prevent interference
    context.save();

    if (isMessageFlow) {
      context.fillStyle = isHighlighted ? '#000000' : DEPENDENCY_LINE_COLOR;
      context.globalAlpha = 1.0; // Ensure full opacity
    } else {
      context.fillStyle = isHighlighted ? '#000000' : DEPENDENCY_LINE_COLOR;
    }

    context.beginPath();

    if (direction === 'vertical' && isMessageFlow) {
      // Vertical arrow for message flows
      if (isGoingDown) {
        // Arrow pointing down (into the element from above)
        context.moveTo(point.x, point.y);
        context.lineTo(point.x - DEPENDENCY_ARROW_SIZE / 2, point.y - DEPENDENCY_ARROW_SIZE);
        context.lineTo(point.x + DEPENDENCY_ARROW_SIZE / 2, point.y - DEPENDENCY_ARROW_SIZE);
      } else {
        // Arrow pointing up (into the element from below)
        context.moveTo(point.x, point.y);
        context.lineTo(point.x - DEPENDENCY_ARROW_SIZE / 2, point.y + DEPENDENCY_ARROW_SIZE);
        context.lineTo(point.x + DEPENDENCY_ARROW_SIZE / 2, point.y + DEPENDENCY_ARROW_SIZE);
      }
    } else {
      // Horizontal arrow (default for regular dependencies)
      if (pointingLeft) {
        // Arrow pointing left - tip at point, body extends right (reversed for participant targets)
        if (isMessageFlow) {
          // For message flows to participants, we want tip at edge and body extending right
          context.moveTo(point.x, point.y); // Tip at participant edge
          context.lineTo(point.x + DEPENDENCY_ARROW_SIZE, point.y - DEPENDENCY_ARROW_SIZE / 2); // Body extends right
          context.lineTo(point.x + DEPENDENCY_ARROW_SIZE, point.y + DEPENDENCY_ARROW_SIZE / 2);
        } else {
          // Regular left-pointing arrow
          context.moveTo(point.x, point.y);
          context.lineTo(point.x - DEPENDENCY_ARROW_SIZE, point.y - DEPENDENCY_ARROW_SIZE / 2);
          context.lineTo(point.x - DEPENDENCY_ARROW_SIZE, point.y + DEPENDENCY_ARROW_SIZE / 2);
        }
      } else {
        // Arrow pointing right
        context.moveTo(point.x, point.y);
        context.lineTo(point.x + DEPENDENCY_ARROW_SIZE, point.y - DEPENDENCY_ARROW_SIZE / 2);
        context.lineTo(point.x + DEPENDENCY_ARROW_SIZE, point.y + DEPENDENCY_ARROW_SIZE / 2);
      }
    }

    context.closePath();
    context.fill();

    // Restore context
    context.restore();
  }

  /**
   * Draw small empty circle at the start point of message flows
   */
  private drawMessageFlowStartCircle(
    context: CanvasRenderingContext2D,
    point: { x: number; y: number },
    isHighlighted: boolean = false,
  ): void {
    // Save context to prevent interference
    context.save();

    const radius = 3; // Small circle for message flow start
    context.strokeStyle = isHighlighted ? '#ff6b6b' : '#888888'; // Match dependency line color
    context.fillStyle = 'white'; // Empty circle with white fill
    context.lineWidth = 1;
    context.globalAlpha = 1.0;
    context.setLineDash([]); // No dashes for the circle

    context.beginPath();
    context.arc(point.x, point.y, radius, 0, 2 * Math.PI);
    context.fill();
    context.stroke();

    // Restore context
    context.restore();
  }

  /**
   * Calculate spacing for message flows on elements with multiple flows
   */
  private calculateMessageFlowSpacing(
    messageFlowDeps: GanttDependency[],
    elements: GanttElementType[],
  ): Map<string, { outgoingOffset: number; incomingOffset: number }> {
    const spacingMap = new Map<string, { outgoingOffset: number; incomingOffset: number }>();
    const FLOW_SPACING = 15; // 15px spacing between flows

    // Group message flows by element
    const elementFlows = new Map<
      string,
      { outgoing: GanttDependency[]; incoming: GanttDependency[] }
    >();

    messageFlowDeps.forEach((dep) => {
      // Count outgoing flows from source element
      const sourceKey = dep.sourceId;
      if (!elementFlows.has(sourceKey)) {
        elementFlows.set(sourceKey, { outgoing: [], incoming: [] });
      }
      elementFlows.get(sourceKey)!.outgoing.push(dep);

      // Count incoming flows to target element
      const targetKey = dep.targetId;
      if (!elementFlows.has(targetKey)) {
        elementFlows.set(targetKey, { outgoing: [], incoming: [] });
      }
      elementFlows.get(targetKey)!.incoming.push(dep);
    });

    // Calculate offsets for each element
    elementFlows.forEach((flows, elementId) => {
      const outgoingCount = flows.outgoing.length;
      const incomingCount = flows.incoming.length;

      // Calculate offsets to center multiple flows
      let outgoingOffset = 0;
      let incomingOffset = 0;

      // For participants and elements with both incoming and outgoing flows,
      // separate them vertically even if there's only one of each type
      const hasBothTypes = outgoingCount > 0 && incomingCount > 0;

      if (outgoingCount > 1) {
        // Multiple outgoing flows - center them
        outgoingOffset = -((outgoingCount - 1) * FLOW_SPACING) / 2;
      } else if (hasBothTypes) {
        // Single outgoing flow but also has incoming - offset it upward
        outgoingOffset = -FLOW_SPACING / 2;
      }

      if (incomingCount > 1) {
        // Multiple incoming flows - center them
        incomingOffset = -((incomingCount - 1) * FLOW_SPACING) / 2;
      } else if (hasBothTypes) {
        // Single incoming flow but also has outgoing - offset it downward
        incomingOffset = FLOW_SPACING / 2;
      }

      spacingMap.set(elementId, { outgoingOffset, incomingOffset });
    });

    return spacingMap;
  }

  /**
   * Get connection point for participant headers
   * Connects to the right/left edges and is vertically centered across the participant and all its children
   */
  private getParticipantHeaderConnectionPoint(
    element: GanttElementType,
    timeMatrix: TimeMatrix,
    side: 'start' | 'end' | 'center',
    elementIndex: number,
    elements?: GanttElementType[],
  ): { x: number; y: number } {
    // For participant headers, we want to connect to the edges of the participant bar
    const startX = timeMatrix.transformPoint(element.start);
    const endX = timeMatrix.transformPoint(element.end || element.start);
    const width = Math.max(endX - startX, 30); // Minimum width

    // Calculate the vertical center of the participant and all its children
    const childIds = (element as any).childIds || [];

    let participantCenterY: number;
    if (childIds.length > 0 && elements) {
      // Find the indices of all child elements
      const childIndices: number[] = [];
      childIds.forEach((childId: string) => {
        const childIndex = elements.findIndex((el: GanttElementType) => el.id === childId);
        if (childIndex !== -1) {
          childIndices.push(childIndex);
        }
      });

      if (childIndices.length > 0) {
        // Calculate the span from participant header to the last child
        const minRow = elementIndex; // Participant header row
        const maxRow = Math.max(...childIndices);

        // Center vertically across the entire span
        const topY = minRow * ROW_HEIGHT + ROW_HEIGHT / 2;
        const bottomY = maxRow * ROW_HEIGHT + ROW_HEIGHT / 2;
        participantCenterY = (topY + bottomY) / 2;
      } else {
        // Fallback: use participant header row
        participantCenterY = elementIndex * ROW_HEIGHT + ROW_HEIGHT / 2;
      }
    } else {
      // No children or no elements array, use participant header row
      participantCenterY = elementIndex * ROW_HEIGHT + ROW_HEIGHT / 2;
    }

    let connectionX: number;
    switch (side) {
      case 'start':
        connectionX = startX; // Left edge
        break;
      case 'end':
        connectionX = startX + width; // Right edge
        break;
      case 'center':
      default:
        connectionX = startX + width / 2; // Center
        break;
    }

    return { x: connectionX, y: participantCenterY };
  }
}
